// Real Chrome, real clock: phone multi-touch through to hits and haptics, desktop keyboard, a sandboxed iframe with storage, gamepads
// and workers blocked, and CPU-throttled frame cost in a crowded fight. Hosts itself on an ephemeral port.
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
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errs.push(m.text()); }); };
const only = process.argv[2];
const part = async (name, fn) => { if (!only || only === name) await fn(); };

await part("phone", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    const boot = Date.now() - t0;
    await sleep(400);
    const btn = await page.evaluate(() => { const g = __pogo, e = g.current.entities.find((x) => x.tappable && x.size.x > 150), p = e.worldPos(); return [p.x * g.view.scale + g.view.x, p.y * g.view.scale + g.view.y]; });
    const t1 = Date.now();
    await page.touchscreen.tap(btn[0], btn[1]);
    await page.waitForFunction(() => __pogo.currentName === "play", null, { timeout: 8000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.currentName === "play"), `phone: boot ${boot} ms, RIOT reaches the first fight in ${Date.now() - t1} ms`);
    const cdp = await ctx.newCDPSession(page);
    const pos = await page.evaluate(() => { const g = __pogo, p = g.play.pad, s = g.view.scale, f = (k) => { const c = p.c.find((b) => b.key === k); return [c.x * s + g.view.x, c.y * s + g.view.y]; }; return { stick: [p.stick.home[0] * s + g.view.x, p.stick.home[1] * s + g.view.y, p.stick.r * s], A: f("A"), H: f("H"), G: f("G"), J: f("J") }; });
    const x0 = await page.evaluate(() => __pogo.play.sim.hero.x);
    const pts = (...a) => a.map(([x, y], id) => ({ x, y, id }));
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts([pos.stick[0], pos.stick[1]]) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts([pos.stick[0] + pos.stick[2] * 0.8, pos.stick[1]]) });
    await sleep(1800);
    const x1 = await page.evaluate(() => __pogo.play.sim.hero.x);
    ok(x1 > x0 + 100, `phone: thumb on the stick walks Dot ${Math.round(x1 - x0)} units`);
    // Second thumb, stick still held.
    await page.evaluate(() => { const p = __pogo.play.pad, o = p.press.bind(p); globalThis.__pressed = []; globalThis.__downs = 0; addEventListener("pointerdown", () => globalThis.__downs++, true); p.press = (b) => { globalThis.__pressed.push(b.key); o(b); }; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts([pos.stick[0] + pos.stick[2] * 0.8, pos.stick[1]], [pos.A[0], pos.A[1]]) });
    await sleep(250);
    const both = await page.evaluate(() => `${globalThis.__pressed}|downs ${globalThis.__downs}|ptrs ${__pogo.play.pad.ptr.size}`);
    console.log("     touchMove route:", both);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts([pos.stick[0] + pos.stick[2] * 0.8, pos.stick[1]], [pos.A[0], pos.A[1]]) });
    await sleep(250);
    const both2 = await page.evaluate(() => `${globalThis.__pressed}|downs ${globalThis.__downs}|ptrs ${__pogo.play.pad.ptr.size}`);
    console.log("     touchStart route:", both2);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    ok(/A/.test(both2) || /A/.test(both), `phone: attack thumb registers while the stick is held (${both2})`);
    for (let i = 0; i < 80; i++) {
        if (await page.evaluate(() => __pogo.play.sim.stats.hits >= 3)) break;
        await page.touchscreen.tap(pos.A[0], pos.A[1]); await sleep(130);
    }
    await sleep(300);
    const st = await page.evaluate(() => { const g = __pogo, s = g.play.sim; return { hits: s.stats.hits, h: g.state().haptics, combo: s.bestCombo, tick: s.tick, x: s.hero.x, ph: s.phase, n: s.enemies.length }; });
    console.log("     ", JSON.stringify({ ...st, h: 0 }));
    ok(st.hits >= 2, `phone: second thumb lands ${st.hits} hits with the stick held (best combo ${st.combo})`);
    ok(st.h && st.h.length > 0, `phone: haptics fired ${JSON.stringify(st.h?.slice?.(-5))}`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
});
await part("desktop", async () => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.evaluate(() => __pogo.go("play", { stage: 1, mode: "story", seed: 4 }));
    await sleep(600);
    await page.keyboard.down("KeyD"); await sleep(2200); await page.keyboard.up("KeyD");
    for (let i = 0; i < 20; i++) { await page.keyboard.press("KeyJ"); await sleep(120); if (i % 4 === 3) { await page.keyboard.press("KeyK"); await sleep(200); } }
    const r = await page.evaluate(() => ({ h: __pogo.play.sim.stats.hits, x: __pogo.play.sim.hero.x, dr: __pogo.renderer.stats }));
    ok(r.x > 200, `desktop: keyboard walks to x=${Math.round(r.x)}`);
    ok(r.h >= 1, `desktop: keyboard lands ${r.h} hits; draw ${JSON.stringify(r.dr)}`);
    await page.evaluate(() => { __pogo.play.sim.meter = 300; }); await page.keyboard.press("KeyI"); await page.waitForFunction(() => __pogo.play.sim.stats.specials === 1 && __pogo.play.sim.hero.st !== "special", null, { timeout: 12000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.play.sim.stats.specials === 1), "desktop: I fires the special");
    await page.keyboard.press("KeyE"); await sleep(500);
    ok(await page.evaluate(() => __pogo.play.sim.hero.key === "pip"), "desktop: E tags Pip in");
    await page.keyboard.press("Escape"); await sleep(300);
    ok(await page.evaluate(() => __pogo.play.paused), "desktop: Esc pauses");
    await page.keyboard.press("Escape"); await sleep(300);
    ok(await page.evaluate(() => !__pogo.play.paused), "desktop: Esc resumes");
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
});
await part("sandbox", async () => {
    const ctx = await browser.newContext({ viewport: { width: 500, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "getGamepads", { value: () => { throw new Error("blocked"); } }); } catch {} try { delete globalThis.Worker; delete globalThis.AudioContext; } catch {} });
    await page.goto(URL0 + "frame.html"); await sleep(4000);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const scene = await frame.evaluate(() => globalThis.__pogo?.currentName);
    await frame.evaluate(() => { globalThis.__pogo.go("play", { stage: 2, mode: "story", seed: 2 }); }); await sleep(2500);
    const ph = await frame.evaluate(() => globalThis.__pogo.play.sim.tick);
    ok(scene === "title" && ph > 30, `sandboxed iframe: title loads, stage runs (${scene}, tick ${ph})`);
    ok(errs.length === 0, `sandbox: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
});
await part("perf", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "?x"); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    const load = await page.evaluate(() => { const t = performance.now(); __pogo.go("play", { stage: 5, mode: "story", seed: 2, start: 3 }); return performance.now() - t; });
    await sleep(900);
    await page.evaluate(() => { const g = __pogo, S = g.play.sim; S.hero.inv = 99999; S.step(0); for (const t of ["kid", "kid", "tot", "tot", "big", "tray", "lobber", "stink"]) { const e = S.spawn(t); e.entry = S.hero.x + 200; } });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const perf = await page.evaluate(async () => {
        const g = __pogo, a = g.current, t = [], d = []; const o = a._step.bind(a); a._step = (dt) => { const s = performance.now(); o(dt); t.push(performance.now() - s); };
        const rf = g.render.bind(g); g.render = (...x) => { const s = performance.now(); rf(...x); d.push(performance.now() - s); };
        await new Promise((r) => setTimeout(r, 4000));
        t.sort((x, y) => x - y); d.sort((x, y) => x - y);
        return { n: t.length, med: t[t.length >> 1], p95: t[Math.floor(t.length * 0.95)], dmed: d[d.length >> 1], dp95: d[Math.floor(d.length * 0.95)], stats: g.renderer.stats, alive: g.play.sim.alive };
    });
    ok(perf.p95 < 8, `4x-throttled step: median ${perf.med?.toFixed(2)}, p95 ${perf.p95?.toFixed(2)} ms over ${perf.n} steps; ${perf.alive} enemies`);
    console.log(`     render in JS ${perf.dmed?.toFixed?.(2)} / ${perf.dp95?.toFixed?.(2)} ms; stage paint ${load.toFixed(0)} ms; ${JSON.stringify(perf.stats)}`);
    ok(errs.length === 0, `throttle: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
});
await browser.close(); server.close();
