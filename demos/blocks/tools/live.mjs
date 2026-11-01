// Real Chrome, real clock: desktop keyboard, a phone with real touch events, a sandboxed iframe with storage and
// audio blocked, and a 4x CPU throttle. Hosts itself on an ephemeral port.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "../../package.json"));
const { chromium } = require("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
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
let bad = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) bad++; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errs.push(m.text()); }); };
// The machine may be crawling on software GL: wait for the game to have run a few steps, not for the clock.
const settle = async (page) => { const n = await page.evaluate(() => globalThis.__pogo.stepCount); await page.waitForFunction((k) => globalThis.__pogo.stepCount >= k + 4, n, { timeout: 8000 }); };
const center = (page, name) => page.evaluate((n) => { const g = globalThis.__pogo, e = g.current.entities.find((x) => x.label === n || x.name === n || x.buttonLabel === n), v = g.view; return [v.x + e.pos.x * v.scale, v.y + e.pos.y * v.scale]; }, name);

// Desktop.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    console.log(`     boot to title ${Date.now() - t0} ms under software GL`);
    await sleep(400);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play" && globalThis.__pogo.stack?.state.phase === "play");
    ok(true, "Enter starts the first game");
    const f = () => page.evaluate(() => { const m = globalThis.__pogo.stack.match.you; return { x: m.active?.x, r: m.active?.r, p: m.pieces, h: m.holdPiece }; });
    const a = await f();
    await page.keyboard.press("ArrowLeft"); await settle(page);
    await page.keyboard.press("ArrowLeft"); await settle(page);
    const b = await f();
    ok(b.x === a.x - 2, `arrow keys move one cell each (${a.x} to ${b.x})`);
    await page.keyboard.down("ArrowRight"); await sleep(600); await page.keyboard.up("ArrowRight");
    const c = await f();
    ok(c.x >= b.x + 5, `holding repeats after the delay (${b.x} to ${c.x} in 0.6 s)`);
    await page.keyboard.press("ArrowUp"); await sleep(100);
    for (let i = 0; i < 40; i++) {
        await page.keyboard.press(["ArrowLeft", "ArrowRight", "ArrowUp"][i % 3]); await sleep(30);
        await page.keyboard.press("Space"); await sleep(120);
        await page.keyboard.press("KeyC"); await sleep(30);
    }
    const d = await f();
    ok(d.p > 10, `played ${d.p} pieces by keyboard in real time`);
    ok(!errs.length, `no console errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// Phone with real touch events.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(300);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const [px, py] = await center(page, "Play");
    const tapAt = async (x, y, hold = 50) => { await touch("touchStart", x, y); await sleep(hold); await touch("touchEnd", x, y); };
    await tapAt(px, py);
    await page.waitForFunction(() => globalThis.__pogo.stack?.state.phase === "play", null, { timeout: 6000 });
    ok(true, "tap on Play reaches the game");
    const f = () => page.evaluate(() => { const m = globalThis.__pogo.stack.match.you; return { x: m.active?.x, r: m.active?.r, p: m.pieces, step: globalThis.__pogo.stack.coach?.step, h: globalThis.__pogo.state().haptics }; });
    const a = await f();
    await touch("touchStart", 200, 500);
    for (let i = 1; i <= 10; i++) { await touch("touchMove", 200 - i * 8, 500); await sleep(16); }
    await touch("touchEnd", 120, 500);
    await settle(page);
    const b = await f();
    ok(a.x - b.x >= 2, `a real thumb drag moves ${a.x - b.x} cells`);
    await tapAt(300, 500, 70); await settle(page);
    const c = await f();
    ok(c.r !== b.r || c.step >= 2, `a real tap turns (rotation ${b.r} to ${c.r})`);
    await sleep(60);
    await touch("touchStart", 200, 300);
    await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map((i) => touch("touchMove", 200, 300 + i * 24)));
    await touch("touchEnd", 200, 500);
    await settle(page);
    const d = await f();
    ok(d.p >= 1, `a real flick drops: ${d.p} pieces, haptics ${d.h.slice(-5)}`);
    await page.screenshot({ path: resolve(root, "tools/.live-phone.png") }).catch(() => {});
    ok(!errs.length, `no console errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// Sandbox.
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(`${URL0}frame.html`);
    await sleep(2500);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    await frame.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 8000 });
    await page.mouse.click(210, 500); await sleep(300);
    await frame.evaluate(() => globalThis.__pogo.go("play", { mode: "sprint", seed: 3 }));
    await sleep(1800);
    const p = await frame.evaluate(() => { const g = globalThis.__pogo; g.stack.bot({ pps: 4, hands: 1 }); return g.currentName; });
    await sleep(6000);
    const n = await frame.evaluate(() => globalThis.__pogo.stack.match.you.pieces);
    ok(p === "play" && n > 3, `runs in a sandboxed iframe: ${n} pieces`);
    ok(!errs.filter((e) => !/sandbox|Failed to read|localStorage/i.test(e)).length, `no fatal errors ${errs.slice(0, 2)}`);
    await ctx.close();
}
// Slow phone: 4x CPU throttle, in a full duel against the costliest rival.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await page.evaluate(() => { const g = globalThis.__pogo; g.go("play", { mode: "story", rung: 7, seed: 5 }); });
    await sleep(1600);
    await page.evaluate(() => globalThis.__pogo.stack.bot({ pps: 3, hands: 1, noise: 6, look: 1, greed: 0.5 }));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const r = await page.evaluate(() => new Promise((done) => {
        const g = globalThis.__pogo, s0 = g.stepCount, t0 = performance.now(); let worst = 0, last = t0, n = 0;
        const tick = (t) => { worst = Math.max(worst, t - last); last = t; n++; if (t - t0 > 5000) done({ fps: n / (t - t0) * 1000, worst, stepRate: (g.stepCount - s0) / (t - t0) * 1000, draws: g.renderer.stats }); else requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
    }));
    console.log(`     4x throttle on software GL: ${r.fps.toFixed(0)} fps, ${r.stepRate.toFixed(0)} steps/s, worst frame ${r.worst.toFixed(0)} ms, ${JSON.stringify(r.draws)}`);
    const cost = await page.evaluate(() => { const g = globalThis.__pogo, t = performance.now(); game_loop: for (let i = 0; i < 300; i++) { if (g.stack.match.over) break game_loop; g.step(1); } return (performance.now() - t) / 300; });
    console.log(`     step cost at 4x throttle, duel with two thinking players: ${cost.toFixed(2)} ms`);
    ok(cost < 4, "steps are cheap enough for a mid-range phone");
    ok(!errs.length, `no console errors ${errs.slice(0, 2)}`);
    await ctx.close();
}
await browser.close();
server.close();
console.log(bad ? `${bad} FAILED` : "live checks pass");
process.exit(bad ? 1 : 0);
