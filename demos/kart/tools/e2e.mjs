// Real Chrome, real clock, real touch and keyboard events. Hosts the folder itself on an ephemeral port.
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
    try {
        if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe sandbox="allow-scripts" style="width:400px;height:700px" src="/index.html"></iframe>`); return; }
        const body = await readFile(join(root, path === "/" ? "index.html" : path));
        res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const rep = []; const ok = (c, m) => rep.push(`${c ? "ok  " : "FAIL"} ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errs.push(m.text()); }); };

// --- Phone, multi-touch ---------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(400);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    const view = await page.evaluate(() => ({ s: __pogo.view.scale, x: __pogo.view.x, y: __pogo.view.y }));
    const px = (x, y) => [x * view.s + view.x, y * view.s + view.y];
    const btn = await page.evaluate(() => { const e = __pogo.current.entities.find((b) => b.buttonLabel === "RACE!"); return [e.pos.x, e.pos.y]; });
    const t0 = Date.now();
    await touch("touchStart", [[1, ...px(...btn)]]); await sleep(40); await touch("touchEnd", []);
    await page.waitForFunction(() => __pogo.currentName === "race", null, { timeout: 8000 });
    ok(true, `phone: RACE! starts a race (${Date.now() - t0} ms to the grid)`);
    await page.waitForFunction(() => __pogo.sim.phase === "race", null, { timeout: 15000 });
    ok(Date.now() - t0 < 5000, `phone: wheels turning ${Date.now() - t0} ms after first touch`);
    await sleep(600);
    const L = await page.evaluate(() => { const c = __pogo.sim.controls.layout(); return { drift: [c.drift.x, c.drift.y], item: [c.item.x, c.item.y] }; });
    const q = (f) => page.evaluate(f);
    // Thumb drags right on the left of the screen.
    const a = px(80, 620);
    await touch("touchStart", [[1, ...a]]);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", [[1, a[0] + i * 12, a[1]]]); await sleep(16); }
    await sleep(200);
    const st = await q(() => [__pogo.sim.player.input.steer, __pogo.sim.player.steer]);
    ok(st[0] > 0.5, `phone: drag steers right (input ${st[0].toFixed(2)})`);
    // Second thumb holds DRIFT while the first keeps steering.
    await touch("touchMove", [[1, a[0] + 72, a[1]], [2, ...px(...L.drift)]]).catch(() => {});
    await touch("touchStart", [[1, a[0] + 72, a[1]], [2, ...px(...L.drift)]]);
    await sleep(250);
    const dr = await q(() => ({ dir: __pogo.sim.player.driftDir, sp: __pogo.sim.player.speed, input: __pogo.sim.player.input.drift, hap: __pogo.state().haptics }));
    ok(dr.dir !== 0, `phone: holding DRIFT starts a drift (dir ${dr.dir}, input ${dr.input}, speed ${dr.sp.toFixed(1)})`);
    await page.waitForFunction(() => __pogo.sim.player.charge >= 1.0 || __pogo.sim.player.driftDir === 0, null, { timeout: 6000 }).catch(() => {});
    const ch = await q(() => __pogo.sim.player.tier);
    await touch("touchEnd", [[1, a[0] + 72, a[1]]]);
    await page.waitForFunction(() => __pogo.sim.stats.boosts > 0, null, { timeout: 4000 }).catch(() => {});
    const b = await q(() => ({ boost: __pogo.sim.player.boost, boosts: __pogo.sim.stats.boosts, tier: __pogo.sim.player.tier }));
    ok(ch > 0 ? b.boosts > 0 : true, `phone: releasing after tier ${ch} gives a mini-turbo (boosts ${b.boosts}, boost ${b.boost.toFixed(2)})`);
    await touch("touchEnd", []);
    // Give the player an item, tap ITEM.
    await q(() => { const k = __pogo.sim.player; k.item = "banana"; k.roll2 = 0; });
    await touch("touchStart", [[3, ...px(...L.item)]]); await sleep(220); await touch("touchEnd", []);
    await sleep(100);
    const it = await q(() => ({ item: __pogo.sim.player.item, on: __pogo.sim.items.length, used: __pogo.sim.stats.itemsUsed, spin: __pogo.sim.player.spin, rescue: __pogo.sim.player.rescue, ctlItem: __pogo.sim.controls.item, t: __pogo.sim.t }));
    ok(it.item === null && it.used > 0, `phone: ITEM uses the banana ${JSON.stringify(it)}`);
    const hp = await q(() => __pogo.state().haptics);
    ok(JSON.stringify(hp).includes("ms"), `phone: haptic texture logged ${JSON.stringify(hp).slice(0, 90)}`);
    const perf = await q(async () => {
        const g = __pogo, K = [];
        for (let i = 0; i < 240; i++) { const t = performance.now(); g.step(1); K.push(performance.now() - t); }
        K.sort((a, b) => a - b);
        return { med: K[120], p99: K[237], stats: g.renderer.stats, ents: g.current.entities.length, verts: g.sim.built.verts };
    });
    ok(perf.med < 3, `phone: sim step median ${perf.med.toFixed(2)} ms, p99 ${perf.p99.toFixed(2)} ms, ${perf.stats.drawCalls} draw calls, ${perf.verts} verts, ${perf.ents} entities`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// --- One-thumb mode ------------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await page.evaluate(() => { __pogo.data.save.settings.control = "one"; __pogo.go("race", { track: "aisle" }); });
    await page.waitForFunction(() => __pogo.sim?.phase === "race", null, { timeout: 15000 });
    await sleep(1500);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    await page.evaluate(() => { const k = __pogo.sim.player; k.item = "banana"; k.roll2 = 0; });
    await touch("touchStart", [[1, 200, 500]]); await sleep(50); await touch("touchEnd", []); await sleep(120);
    ok(await page.evaluate(() => __pogo.sim.player.item === null), "one thumb: a quick tap uses the item");
    await touch("touchStart", [[1, 200, 500]]);
    for (let i = 1; i <= 8; i++) { await touch("touchMove", [[1, 200 - i * 14, 500]]); await sleep(16); }
    await sleep(500);
    ok(await page.evaluate(() => __pogo.sim.player.driftDir !== 0), "one thumb: a hard push drifts by itself");
    await touch("touchEnd", []);
    ok(errs.length === 0, `one thumb: no errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// --- Desktop keyboard ----------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(300);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => __pogo.currentName === "race" && __pogo.sim.phase === "race", null, { timeout: 15000 });
    await sleep(1200);
    await page.keyboard.down("ArrowLeft"); await page.keyboard.down("Space"); await sleep(900);
    const d = await page.evaluate(() => ({ dir: __pogo.sim.player.driftDir, ch: __pogo.sim.player.charge }));
    ok(d.dir === -1, `desktop: arrow + space drifts left (charge ${d.ch.toFixed(2)})`);
    await page.keyboard.up("Space"); await page.keyboard.up("ArrowLeft");
    await page.keyboard.press("Escape"); await sleep(200);
    ok(await page.evaluate(() => __pogo.current.paused), "desktop: Esc pauses");
    await page.keyboard.press("Escape"); await sleep(200);
    ok(await page.evaluate(() => !__pogo.current.paused), "desktop: Esc resumes");
    ok(errs.length === 0, `desktop: no errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// --- Sandboxed iframe: no storage, no audio gesture, nothing -------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 800 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html");
    await sleep(2500);
    const f = page.frames()[1];
    const st = await f.evaluate(() => ({ scene: globalThis.__pogo?.currentName, err: !!document.querySelector("div[style*='7f1d1d']") }));
    await f.evaluate(() => __pogo.go("race", { track: "dock" }));
    await sleep(3000);
    const after = await f.evaluate(() => ({ scene: __pogo.currentName, phase: __pogo.sim.phase, t: __pogo.sim.t, err: !!document.querySelector("div[style*='7f1d1d']") }));
    ok(st.scene === "title" && !st.err && !after.err, `sandbox: runs without storage (${JSON.stringify(after)})`);
    ok(errs.length === 0, `sandbox: no errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
await browser.close(); server.close();
console.log(rep.join("\n"));
process.exit(rep.some((r) => r.startsWith("FAIL")) ? 1 : 0);
