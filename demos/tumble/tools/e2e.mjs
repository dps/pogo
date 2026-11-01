// Real Chrome, real clock: phone touch and desktop mouse, a sandboxed iframe, and a 4x CPU throttle on the
// heaviest castle. Hosts itself on an ephemeral port.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "../../package.json"));
const { chromium } = require("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe id=f sandbox="allow-scripts" src="/index.html" style="width:400px;height:700px;border:0"></iframe>`); return; }
    try { const body = await readFile(join(root, path === "/" ? "index.html" : path)); res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body); }
    catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = []; const ok = (c, m) => { lines.push(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); };

// Phone, real touch through to a shot.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(700);
    const t0 = Date.now();
    await page.touchscreen.tap(195, 780 - 150);
    await page.waitForFunction(() => globalThis.__pogo.tumble?.ready?.(), null, { timeout: 9000 }).catch(() => {});
    const name = await page.evaluate(() => __pogo.state().scene);
    ok(name === "play", `phone: PLAY reaches gameplay in ${Date.now() - t0} ms (scene ${name})`);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await page.waitForFunction(() => __pogo.tumble.ready(), null, { timeout: 5000 }).catch(() => {});
    await touch("touchStart", 300, 350); await sleep(60);
    for (let i = 1; i <= 8; i++) { await touch("touchMove", 300 - i * 12, 350 + i * 3); await sleep(30); }
    const aim = await page.evaluate(() => ({ a: __pogo.tumble.stage.aiming, t: __pogo.tumble.stage.tension, h: __pogo.state().haptics }));
    ok(aim.a && aim.t > 0.5, `phone: drag aims, tension ${aim.t.toFixed(2)}, ticks ${JSON.stringify(aim.h).slice(0, 70)}`);
    await touch("touchEnd"); await sleep(300);
    const fired = await page.evaluate(() => __pogo.tumble.sim.fired);
    ok(fired === 1, `phone: release fires (${fired})`);
    await sleep(3500);
    const { run } = await import("./sim-determinism.mjs");
    const here = run(), there = await page.evaluate(async () => (await import("/tools/sim-determinism.mjs")).run());
    ok(here === there, `solver is deterministic across Node and Chrome: ${here} ${there}`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Desktop mouse and throttled perf.
{
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 750 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "?x"); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(500);
    await page.evaluate(() => { __pogo.go("play", { level: 24 }); });
    await page.waitForFunction(() => __pogo.tumble?.level?.index === 24 && __pogo.tumble.sim.tick >= 0); await sleep(300);
    await page.mouse.click(600, 300); await sleep(300);
    await page.mouse.move(600, 300); await page.mouse.down(); await page.mouse.move(470, 340, { steps: 6 }); await sleep(100); await page.mouse.up();
    await sleep(400);
    ok((await page.evaluate(() => __pogo.tumble.sim.fired)) === 1, "desktop: mouse drag fires");
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    // Measure the JS cost per frame of step+solver with everything awake. Rendering in software GL is not meaningful here.
    const perf = await page.evaluate(async () => {
        const g = __pogo, T = g.tumble, sim = T.sim; const orig = sim.step.bind(sim); const t = [];
        sim.step = () => { const a = performance.now(); orig(); t.push(performance.now() - a); };
        for (let i = 0; i < 3; i++) { sim.state = "aim"; sim.rack.iron = 3; sim.fire("iron", 26, -5 - i * 4); sim.fire("bomb", 26, -2 - i * 4); await new Promise((r) => setTimeout(r, 1500)); }
        t.sort((a, b) => a - b);
        return { n: t.length, med: t[t.length >> 1], p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1], bodies: sim.world.bodies.length, stats: g.renderer.stats };
    });
    ok(perf.p95 < 8, `4x-throttled sim: median ${perf.med?.toFixed(2)} p95 ${perf.p95?.toFixed(2)} max ${perf.max?.toFixed(2)} ms over ${perf.n} ticks; ${perf.bodies} bodies; draw ${JSON.stringify(perf.stats)}`);
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Sandboxed iframe: no storage, no audio gesture, no gamepad.
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "getGamepads", { value: () => { throw new Error("blocked"); } }); } catch {} });
    await page.goto(URL0 + "frame.html"); await sleep(1800);
    const frame = page.frames()[1];
    const box = await page.locator("#f").boundingBox();
    await page.mouse.click(box.x + 200, box.y + 700 - 150); await sleep(1500);
    const scene = await frame.evaluate(() => globalThis.__pogo?.state().scene).catch((e) => `err ${e.message}`);
    ok(scene === "play", `sandboxed iframe: starts and plays (scene ${scene})`);
    ok(errs.filter((e) => !/favicon|404/.test(e)).length === 0, `sandboxed iframe: no errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
console.log(lines.join("\n"));
