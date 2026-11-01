// Real Chrome, real clock: phone multi-touch through to hits and haptics, desktop keyboard, two players on one tablet,
// a sandboxed iframe with storage and gamepads blocked, and CPU-throttled frame cost. Hosts itself on an ephemeral port.
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
const FIGHT = (o) => `game.go('play',${JSON.stringify({ mode: "versus", a: "crumbs", b: "chill", stage: 0, players: 1, level: 0, ...o })})`;

// Phone, first launch: one tap to the coached fight, then real thumbs.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    const boot = Date.now() - t0;
    await sleep(500);
    const btn = await page.evaluate(() => { const g = __pogo, e = g.current.entities.find((x) => x.tappable && x.size.x > 200), p = e.worldPos(); return [p.x * g.view.scale + g.view.x, p.y * g.view.scale + g.view.y]; });
    const t1 = Date.now();
    await page.touchscreen.tap(btn[0], btn[1]);
    await page.waitForFunction(() => __pogo.currentName === "play", null, { timeout: 6000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.currentName === "play" && __pogo.currentArgs.mode === "coach"), `phone: boot ${boot} ms, FIGHT reaches the coached fight in ${Date.now() - t1} ms`);
    const cdp = await ctx.newCDPSession(page);
    const pos = await page.evaluate(() => { const g = __pogo, c = g.match.pad.controls, s = g.view.scale; const f = (n) => { const x = c.find((b) => b.label === n || b.kind === n); return [x.x * s + g.view.x, x.y * s + g.view.y, x.r * s]; }; return { stick: f("stick"), light: f("LIGHT"), block: f("BLOCK") }; });
    const pts = (...a) => a.map(([x, y], id) => ({ x, y, id }));
    const x0 = await page.evaluate(() => __pogo.match.fight.p[0].x);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts([pos.stick[0], pos.stick[1]]) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts([pos.stick[0] + pos.stick[2] * 0.8, pos.stick[1]]) });
    await sleep(900);
    const x1 = await page.evaluate(() => __pogo.match.fight.p[0].x);
    ok(x1 > x0 + 60, `phone: thumb on the stick walks the fighter ${Math.round(x1 - x0)} units`);
    // Second thumb, stick still held: multi-touch.
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts([pos.stick[0] + pos.stick[2] * 0.8, pos.stick[1]], [pos.light[0], pos.light[1]]) });
    await sleep(60);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    for (let i = 0; i < 6; i++) { await page.touchscreen.tap(pos.light[0], pos.light[1]); await sleep(110); }
    await sleep(200);
    const st = await page.evaluate(() => { const g = __pogo, f = g.match.fight; return { hits: f.stats[0].hits, h: g.haptics.log }; });
    ok(st.hits >= 2 && st.h.includes("medium"), `phone: second thumb lands ${st.hits} hits with stick held, haptics ${JSON.stringify(st.h.slice(-4))}`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Desktop keyboard, real time.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.evaluate(`var game=__pogo; ${FIGHT({})}`);
    await page.waitForFunction(() => __pogo.match?.fight?.phase === "fight", null, { timeout: 6000 });
    await page.keyboard.down("KeyD"); await sleep(900); await page.keyboard.up("KeyD");
    for (let i = 0; i < 5; i++) { await page.keyboard.press("KeyJ"); await sleep(120); }
    await page.keyboard.press("KeyK"); await sleep(500);
    const hits = await page.evaluate(() => __pogo.match.fight.stats[0].hits);
    ok(hits >= 1, `desktop: keyboard lands ${hits} hits`);
    await page.evaluate(() => { __pogo.match.fight.p[0].meter = 100; }); await page.keyboard.press("KeyO"); await sleep(300);
    const flash = await page.evaluate(() => __pogo.match.fight.stats[0].supers);
    ok(flash === 1, "desktop: O fires the super");
    await sleep(3200);
    await page.keyboard.press("Escape"); await sleep(250);
    ok(await page.evaluate(() => __pogo.match.paused), "desktop: Esc pauses");
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Mouse only: no keyboard touched, the pad appears, the stick latches, buttons click. A fight key puts the pad away.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.mouse.click(20, 300); await sleep(100);
    await page.evaluate(`var game=__pogo; ${FIGHT({})}`);
    await page.waitForFunction(() => __pogo.match?.fight?.phase === "fight", null, { timeout: 6000 });
    const at = (kindOr) => page.evaluate((k) => { const g = __pogo, s = g.view.scale, x = g.match.pad.controls.find((b) => b.label === k || b.kind === k); return [x.x * s + g.view.x, x.y * s + g.view.y, x.r * s]; }, kindOr);
    ok(await page.evaluate(() => __pogo.match.pad.active()), "mouse: pad shows after mouse-only menus");
    const st = await at("stick"), li = await at("LIGHT"), x0 = await page.evaluate(() => __pogo.match.fight.p[0].x);
    await page.mouse.move(st[0], st[1]); await page.mouse.down(); await page.mouse.move(st[0] + st[2] * 0.8, st[1], { steps: 3 }); await sleep(60); await page.mouse.up();
    await sleep(800);
    const x1 = await page.evaluate(() => __pogo.match.fight.p[0].x);
    ok(x1 > x0 + 60, `mouse: stick latches and walks ${Math.round(x1 - x0)} units after release`);
    for (let i = 0; i < 6; i++) { await page.mouse.click(li[0], li[1]); await sleep(100); }
    await sleep(200);
    const hits = await page.evaluate(() => __pogo.match.fight.stats[0].hits);
    ok(hits >= 1, `mouse: clicks land ${hits} hits while walking`);
    await page.mouse.click(st[0], st[1]); await sleep(150);
    ok(await page.evaluate(() => (__pogo.match.pad.held[0] & 3) === 0), "mouse: clicking the stick's middle lets go");
    await page.keyboard.press("KeyJ"); await sleep(120);
    ok(await page.evaluate(() => !__pogo.match.pad.active()), "mouse: a fight key hides the pad");
    ok(errs.length === 0, `mouse: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Two players, one tablet: both sides' thumbs at once.
{
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.evaluate(`var game=__pogo; game.input.touchMode=true; ${FIGHT({ players: 2 })}`);
    await page.waitForFunction(() => __pogo.match?.fight?.phase === "fight", null, { timeout: 6000 });
    const c = await page.evaluate(() => { const g = __pogo, s = g.view.scale, cs = g.match.pad.controls; const f = (p, kind) => { const x = cs.find((b) => b.p === p && kind(b)); return [x.x * s + g.view.x, x.y * s + g.view.y, x.r * s]; }; return { s0: f(0, (b) => b.kind === "stick"), s1: f(1, (b) => b.kind === "stick") }; });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: c.s0[0], y: c.s0[1], id: 0 }, { x: c.s1[0], y: c.s1[1], id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: c.s0[0] + c.s0[2] * 0.8, y: c.s0[1], id: 0 }, { x: c.s1[0] - c.s1[2] * 0.8, y: c.s1[1], id: 1 }] });
    await sleep(500);
    const d = await page.evaluate(() => { const f = __pogo.match.fight; return [f.p[0].x, f.p[1].x]; });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    ok(d[0] > -90 && d[1] < 90, `tablet: both sticks work at once (${d.map(Math.round)})`);
    ok(errs.length === 0, `tablet: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Sandboxed iframe with blocked APIs.
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 760 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.addInitScript(() => { try { Object.defineProperty(navigator, "getGamepads", { value: () => { throw new Error("blocked"); } }); } catch {} try { delete globalThis.Worker; } catch {} });
    await page.goto(URL0 + "frame.html"); await sleep(3500);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const scene = await frame.evaluate(() => globalThis.__pogo?.currentName);
    await frame.evaluate(() => { const g = globalThis.__pogo; g.go("play", { mode: "versus", a: "knead", b: "ding", stage: 2, players: 1, level: 1 }); }); await sleep(2500);
    const ph = await frame.evaluate(() => globalThis.__pogo.match.fight.phase);
    ok(scene === "title" && ph === "fight", `sandboxed iframe: title loads, fight runs (${scene}, ${ph})`);
    ok(errs.length === 0, `sandbox: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// Frame cost with a 4x throttle, hard AI on both sides, measured in JS.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "?x"); await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.evaluate(`var game=__pogo; ${FIGHT({ a: "whistle", b: "ding", stage: 3, level: 3 })}`);
    await page.waitForFunction(() => __pogo.match?.fight?.phase === "fight", null, { timeout: 6000 });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const perf = await page.evaluate(async () => {
        const g = __pogo, m = g.match, u = m.update.bind(m), t = [];
        const a = g.current; const orig = a._step.bind(a); a._step = (dt) => { const s = performance.now(); orig(dt); t.push(performance.now() - s); };
        await new Promise((r) => setTimeout(r, 4000));
        t.sort((x, y) => x - y);
        return { n: t.length, med: t[t.length >> 1], p95: t[Math.floor(t.length * 0.95)], stats: g.renderer.stats };
    });
    ok(perf.p95 < 8, `4x-throttled step: median ${perf.med.toFixed(2)}, p95 ${perf.p95.toFixed(2)} ms over ${perf.n} steps; draw ${JSON.stringify(perf.stats)}`);
    ok(errs.length === 0, `throttle: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
