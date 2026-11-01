// Real Chrome, real clock: phone touch, desktop mouse, a throttled thousand-ant battle, a sandboxed iframe. Hosts itself on an ephemeral port.
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
const toScreen = (page, wx, wy) => page.evaluate(([x, y]) => { const g = __pogo, s = g.current, p = s.cam.toView([x, y]), c = document.querySelector("canvas").getBoundingClientRect(); return [c.left + p.x / s.view.width * c.width, c.top + p.y / s.view.height * c.height]; }, [wx, wy]);

// Phone: first touch to painted trail.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 30000 }); await sleep(900);
    const t0 = Date.now();
    await page.touchscreen.tap(195, 780 - 200 - 12);
    await page.waitForFunction(() => __pogo.state().scene === "play" && __pogo.ants?.hud, null, { timeout: 9000 }).catch(() => {});
    ok((await page.evaluate(() => __pogo.state().scene)) === "play", `phone: PLAY reaches the war in ${Date.now() - t0} ms`);
    await sleep(900);
    const a = await page.evaluate(() => { const m = __pogo.ants.sim.me, f = __pogo.ants.sim.foods[0]; return [m.x, m.y, f.x, f.y]; });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const [sx, sy] = await toScreen(page, a[0], a[1]), [ex, ey] = await toScreen(page, a[2], a[3]);
    await touch("touchStart", sx, sy); await sleep(50);
    for (let i = 1; i <= 16; i++) { await touch("touchMove", sx + (ex - sx) * i / 16, sy + (ey - sy) * i / 16); await sleep(25); }
    const live = await page.evaluate(() => ({ kind: __pogo.ants.stage.stroke?.kind, snap: __pogo.ants.stage.stroke?.snap, tingles: __pogo.ants.stage.tingles, hap: __pogo.state().haptics }));
    await touch("touchEnd"); await sleep(400);
    const res = await page.evaluate(() => { const A = __pogo.ants; return { trails: A.sim.me.trails().map((t) => t.kind), painted: A.stage.painted }; });
    ok(res.trails[0] === 0 && live.snap, `phone: drag paints a gather trail, snapped ${live.snap}, ${live.tingles} tingles, haptics ${JSON.stringify(live.hap).slice(0, 90)}`);
    await sleep(16000);
    const carried = await page.evaluate(() => __pogo.ants.sim.me.gathered[0]);
    ok(carried > 0, `phone: ${carried} crumbs home after 16 s`);
    const pic = await page.evaluate(() => { const u = __pogo.ants.sim; let on = 0; for (let i = 0; i < u.top; i++) if (u.alive[i] && u.job[i] === 0) on++; return on; });
    ok(pic > 10, `phone: ${pic} ants took the job`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Desktop mouse, the wheel, then the big one under a 4x CPU throttle.
{
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 750 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "?x"); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 30000 }); await sleep(500);
    await page.evaluate(() => __pogo.go("play", { mission: 9 })); await page.waitForFunction(() => __pogo.state().scene === "play" && __pogo.ants?.mission === 9, null, { timeout: 8000 }); await sleep(600);
    const a = await page.evaluate(() => { const A = __pogo.ants, f = A.sim.foods.find((q) => q.k === "bread"); return [A.sim.me.x, A.sim.me.y, f.x, f.y]; });
    const z0 = await page.evaluate(() => __pogo.ants.stage.cam.tz);
    await page.mouse.move(600, 300); await page.mouse.wheel(0, 240); await sleep(300);
    const z1 = await page.evaluate(() => __pogo.ants.stage.cam.tz); ok(z1 < z0, `desktop: wheel zooms ${z0.toFixed(2)} to ${z1.toFixed(2)}`);
    const [sx, sy] = await toScreen(page, a[0], a[1]), [ex, ey] = await toScreen(page, a[2], a[3]);
    await page.mouse.move(sx, sy); await page.mouse.down(); await page.mouse.move(ex, ey, { steps: 14 }); await sleep(60); await page.mouse.up(); await sleep(250);
    ok((await page.evaluate(() => __pogo.ants.sim.me.trails().length)) >= 1, "desktop: mouse drag paints a trail");
    const cdp = await ctx.newCDPSession(page);
    await page.evaluate(() => {
        const A = __pogo.ants, Z = A.sim;
        for (const k of Z.colList) { k.stock = [3000, 900, 900, 900]; k.chambers = { nursery: 2, pantry: 3, gym: 2, vat: 2, hall: 1, loft: 2 }; k.maxPop = 900; }
        const put = (t, n, c, x, y, r) => { for (let i = 0; i < n; i++) { const id = Z.spawn(t, c); if (id >= 0) { const q = Math.random() * 6.28, m = Math.sqrt(Math.random()) * r; Z.x[id] = Z.px[id] = x + Math.cos(q) * m * 1.5; Z.y[id] = Z.py[id] = y + Math.sin(q) * m * 0.8; } } };
        put(0, 480, 1, 640, 1110, 170); put(0, 150, 2, 640, 1190, 130); put(0, 80, 4, 540, 1060, 100); put(1, 500, 1, 640, 880, 170); put(3, 200, 2, 720, 830, 110); put(1, 100, 0, 520, 880, 110);
        Z.paint(0, [640, 1110, 640, 960]); Z.paint(1, [640, 900, 640, 1060]); Z.paint(3, [720, 850, 640, 1040]);
        const c = A.stage.cam; c.tx = c.x = 650; c.ty = c.y = 1000; c.tz = c.z = 0.62;
    });
    await sleep(900);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const perf = await page.evaluate(async () => {
        const A = __pogo.ants, st = A.stage, sim = A.sim, S = [], D = [], T = [], ants = [];
        const os = st.step.bind(st), od = st.draw.bind(st), ot = sim.tick.bind(sim);
        st.step = (dt) => { const a = performance.now(); os(dt); S.push(performance.now() - a); };
        st.draw = (d) => { const a = performance.now(); od(d); D.push(performance.now() - a); ants.push(sim.count); };
        sim.tick = () => { const a = performance.now(); ot(); T.push(performance.now() - a); };
        await new Promise((r) => setTimeout(r, 5000));
        const q = (a, k) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length * k)] ?? 0; };
        return { frames: D.length, ants: Math.max(...ants), antsEnd: ants[ants.length - 1], stepP50: q(S, 0.5), stepP95: q(S, 0.95), drawP50: q(D, 0.5), drawP95: q(D, 0.95), tickP50: q(T, 0.5), tickP95: q(T, 0.95), stats: __pogo.renderer.stats, level: st.level, pulses: st.pulses };
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    ok(perf.ants >= 1000 && perf.tickP95 + perf.drawP95 + perf.stepP95 < 16, `4x-throttled ${perf.ants} ants (${perf.antsEnd} at end): tick p50 ${perf.tickP50.toFixed(2)} p95 ${perf.tickP95.toFixed(2)}, draw p50 ${perf.drawP50.toFixed(2)} p95 ${perf.drawP95.toFixed(2)}, step p95 ${perf.stepP95.toFixed(2)} ms, ${perf.frames} software-GL frames, ${JSON.stringify(perf.stats)}`);
    ok(perf.pulses > 0, `battle rumble: ${perf.pulses} pulses, level ${perf.level.toFixed(2)}`);
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Sandboxed iframe: no storage, no audio gesture, no gamepad.
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "getGamepads", { value: () => { throw new Error("blocked"); } }); } catch {} });
    await page.goto(URL0 + "frame.html"); await sleep(3500);
    const frame = page.frames()[1];
    const box = await page.locator("#f").boundingBox();
    await page.mouse.click(box.x + 200, box.y + 700 - 200 + 8); await sleep(2500);
    const scene = await frame.evaluate(() => globalThis.__pogo?.state().scene).catch((e) => `err ${e.message}`);
    ok(scene === "play", `sandboxed iframe: starts and plays (scene ${scene})`);
    ok(errs.filter((e) => !/favicon|404/.test(e)).length === 0, `sandboxed iframe: no errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
console.log(lines.join("\n"));
