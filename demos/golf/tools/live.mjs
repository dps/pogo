// Real Chrome, real clock: phone touch and desktop mouse through a shot, a sandboxed iframe with storage and audio blocked, and a 4x CPU throttle on the heaviest hole.
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
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/404/.test(m.text())) errs.push(m.text()); }); };
const viewPt = (page, x, y) => page.evaluate(([x, y]) => { const v = globalThis.__pogo.view; return { x: x * v.scale + v.x, y: y * v.scale + v.y }; }, [x, y]);
// Phone
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(800);
    const t0 = Date.now();
    await page.evaluate(() => { const g = globalThis.__pogo; g.current.entities.find((x) => x.buttonLabel === "PLAY").emit("tap"); });
    await page.waitForFunction(() => globalThis.__golf?.state === "intro", null, { timeout: 15000 });
    await sleep(400);
    const v0 = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await page.touchscreen.tap(v0.w / 2, v0.h / 2);
    await page.waitForFunction(() => globalThis.__golf?.state === "aim", null, { timeout: 15000 });
    ok(Date.now() - t0 < 5000, `phone: PLAY to first aim in ${Date.now() - t0}ms`);
    await sleep(500);
    await page.evaluate(() => { globalThis.__golf.fire(0.02, 0.9, false); });
    await page.waitForFunction(() => globalThis.__golf.strokes >= 1 && globalThis.__golf.state === "aim" || globalThis.__golf.state === "holed", null, { timeout: 20000 });
    const fps = await page.evaluate(async () => { const g = globalThis.__pogo, s0 = g.stepCount, t = performance.now(); await new Promise((r) => setTimeout(r, 1500)); return (g.stepCount - s0) / ((performance.now() - t) / 1000); });
    ok(errs.length === 0, `phone: no console errors (${errs.slice(0, 2)})`);
    lines.push(`info phone steps/s under software GL: ${fps.toFixed(0)}`);
    await ctx.close();
}
// Desktop mouse, real drag.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(600);
    await page.evaluate(() => { const g = globalThis.__pogo; g.go("play", { hole: 18 }); });
    await page.waitForFunction(() => globalThis.__golf?.def.name === "Hot Foot" && globalThis.__pogo.currentName === "play");
    await page.evaluate(() => globalThis.__golf.endIntro());
    await sleep(1000);
    const b = await page.evaluate(() => { const r = globalThis.__golf, g = globalThis.__pogo, p = r.s.cam3.project([r.sim.x, r.sim.y, r.sim.z]), v = g.view; return { x: p.x, y: p.y, sc: v.scale, ox: v.x ?? 0, oy: v.y ?? 0 }; });
    const P = await viewPt(page, b.x, b.y);
    await page.mouse.move(P.x, P.y); await page.mouse.down();
    for (let i = 1; i <= 14; i++) { await page.mouse.move(P.x + i * 2, P.y + i * 14); await sleep(16); }
    await sleep(120); await page.mouse.up();
    await page.waitForFunction(() => globalThis.__golf.strokes === 1, null, { timeout: 4000 }).catch(() => {});
    const st = await page.evaluate(() => ({ strokes: globalThis.__golf.strokes, shot: globalThis.__golf.lastShot, hapt: globalThis.__pogo.state().haptics }));
    ok(st.strokes === 1, `desktop: mouse pull fired a shot, power ${st.shot?.power?.toFixed(2)}`);
    ok(errs.length === 0, `desktop: no console errors (${errs.slice(0, 2)})`);
    await ctx.close();
}
// Sandboxed iframe: no storage, gamepad, vibration; module scripts come cross-origin.
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html"); await sleep(7000);
    const f = page.frames().find((x) => x !== page.mainFrame());
    const r = await f.evaluate(async () => {
        const g = globalThis.__pogo; if (!g) return { fail: "no game" };
        g.go("play", { hole: 3 }); await new Promise((r) => setTimeout(r, 2500));
        const R = globalThis.__golf; R.endIntro(); await new Promise((r) => setTimeout(r, 700));
        R.fire(0, 0.5, false); await new Promise((r) => setTimeout(r, 1500));
        return { scene: g.currentName, strokes: R.strokes, errors: g.errors?.length ?? 0, storage: (() => { try { localStorage.getItem("x"); return "ok"; } catch { return "blocked"; } })() };
    }).catch((e) => ({ fail: e.message }));
    ok(r.scene === "play" && r.strokes === 1, `sandbox: played a shot, storage ${r.storage}, ${JSON.stringify(r)}`);
    ok(errs.length === 0, `sandbox: no console errors (${errs.slice(0, 2)})`);
    await ctx.close();
}
// Slow phone: CPU throttled 4x, heaviest hole, sim and update cost only (software GL can't speak for a GPU).
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const cdp = await ctx.newCDPSession(page);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(500);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const m = await page.evaluate(async () => {
        const g = globalThis.__pogo, t0 = performance.now();
        g.go("play", { hole: 26 }); const scene = await new Promise((r) => setTimeout(r, 1500));
        const R = globalThis.__golf, tb = performance.now();
        const c = new (R.c.constructor)(R.def, R.def.island); const build = performance.now() - tb;
        R.endIntro();
        const orig = g.render; g.render = () => {}; // measure the logic alone
        let worst = 0, sum = 0, n = 0;
        for (let i = 0; i < 300; i++) { const a = performance.now(); g.step(1); const d = performance.now() - a; worst = Math.max(worst, d); sum += d; n++; }
        g.render = orig;
        return { build, avg: sum / n, worst };
    });
    lines.push(`info 4x CPU throttle on hole 27: course bake ${m.build.toFixed(0)}ms, logic step avg ${m.avg.toFixed(2)}ms worst ${m.worst.toFixed(2)}ms`);
    ok(m.avg < 8, "throttled logic step under 8ms");
    await ctx.close();
}
await browser.close(); server.close();
console.log(lines.join("\n"));
process.exit(process.exitCode ?? 0);
