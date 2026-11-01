// Real Chrome, real clock, real multi-touch. Also a sandboxed iframe with storage and audio blocked.
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

// Phone with two thumbs.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(500);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    const view = await page.evaluate(() => ({ s: __pogo.view.scale, x: __pogo.view.x, y: __pogo.view.y, w: __pogo.view.width, h: __pogo.view.height }));
    const px = (x, y) => [x * view.s + view.x, y * view.s + view.y];
    const btn = await page.evaluate(() => { const e = __pogo.current.entities.find((b) => b.buttonLabel === "PLAY"); return [e.pos.x, e.pos.y]; });
    const t0 = Date.now();
    await touch("touchStart", [[1, ...px(...btn)]]); await sleep(50); await touch("touchEnd", []);
    await page.waitForFunction(() => __pogo.currentName === "play", null, { timeout: 8000 });
    ok(Date.now() - t0 < 5000, `phone: PLAY to driving in ${Date.now() - t0} ms`);
    await sleep(700);
    const q = (f) => page.evaluate(f);
    const before = await q(() => [__pogo.twin.sim.p.x, __pogo.twin.sim.p.z]);
    const L = px(80, view.h - 110), R = px(view.w - 80, view.h - 110);
    await touch("touchStart", [[1, ...L]]); await sleep(30);
    for (let i = 1; i <= 5; i++) { await touch("touchMove", [[1, L[0] + i * 11, L[1] - i * 4]]); await sleep(16); }
    await touch("touchStart", [[1, L[0] + 55, L[1] - 20], [2, ...R]]); await sleep(30);
    for (let i = 1; i <= 5; i++) { await touch("touchMove", [[1, L[0] + 55, L[1] - 20], [2, R[0] - i * 10, R[1] - i * 10]]); await sleep(16); }
    await sleep(500);
    const st = await q(() => { const T = __pogo.twin, p = T.sim.p; return { x: p.x, z: p.z, firing: p.firing, aim: [p.aimX, p.aimZ], left: !!T.controls.left, right: !!T.controls.right }; });
    ok(st.left && st.right, "phone: two thumbs tracked at once");
    ok(Math.hypot(st.x - before[0], st.z - before[1]) > 1, `phone: left stick drives (moved ${Math.hypot(st.x - before[0], st.z - before[1]).toFixed(1)})`);
    ok(st.firing && st.aim[0] < -0.3 && st.aim[1] < -0.3, `phone: right stick aims up-left and auto-fires (${st.aim.map((v) => v.toFixed(2))})`);
    await touch("touchEnd", []);
    // Dash button: hold, let go.
    const d = await q(() => { const c = __pogo.twin.controls.dashSpot(); return [c.x, c.y]; });
    await touch("touchStart", [[3, ...px(...d)]]); await sleep(500);
    const ch = await q(() => __pogo.twin.sim.p.charge);
    ok(ch > 0.3, `phone: holding DASH charges (${ch.toFixed(2)})`);
    await touch("touchEnd", []); await sleep(120);
    const ds = await q(() => __pogo.state().haptics?.length ?? 0);
    ok(ds > 0, `phone: haptics fired (${ds} recent)`);
    // Frame cost, with a storm on screen. Software GL, so read the JS time, not the frame rate.
    const load = await page.evaluate(async () => {
        const g = __pogo, T = g.twin, sim = T.sim;
        for (let i = 0; i < 170; i++) sim.spawnFoe("bunny", (i % 30 - 15) * 0.6, (i % 7 - 3) * 2.4 - 3);
        sim.p.hp = 1e6;
        g.step(30);
        const t0 = performance.now(); g.step(40); const stepMs = (performance.now() - t0) / 40;
        const r0 = performance.now(); for (let i = 0; i < 20; i++) g.render(); const renderMs = (performance.now() - r0) / 20;
        return { foes: sim.foes.length, stepMs, renderMs, stats: g.renderer.stats };
    });
    ok(load.foes >= 100, `phone: ${load.foes} monsters on screen, step ${load.stepMs.toFixed(2)} ms, CPU+swiftshader render ${load.renderMs.toFixed(1)} ms, ${load.stats.drawCalls} draws, ${load.stats.instances} instances`);
    ok(!errs.length, `phone: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
}

// Desktop: keyboard, mouse, dash on space.
{
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(500);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => __pogo.currentName === "play", null, { timeout: 8000 });
    await sleep(1800);
    await page.mouse.move(200, 150); await sleep(60); await page.mouse.move(230, 170); await sleep(200);
    await page.keyboard.down("KeyD"); await page.mouse.down(); await sleep(500);
    const st = await page.evaluate(() => { const p = __pogo.twin.sim.p; return { vx: p.vx, firing: p.firing, aim: [p.aimX, p.aimZ] }; });
    await page.mouse.up(); await page.keyboard.up("KeyD");
    ok(st.vx > 1, `desktop: D drives (vx ${st.vx.toFixed(1)})`);
    ok(st.firing && st.aim[0] < 0 && st.aim[1] < 0, `desktop: mouse aims and clicks fire (${st.aim.map((v) => v.toFixed(2))})`);
    await page.keyboard.down("Space"); await sleep(400);
    const c = await page.evaluate(() => __pogo.twin.sim.p.charging);
    await page.keyboard.up("Space");
    ok(c, "desktop: space charges the dash");
    await page.keyboard.press("Escape"); await sleep(120);
    ok(await page.evaluate(() => __pogo.current.paused), "desktop: Esc pauses");
    await page.keyboard.press("Escape"); await sleep(120);
    ok(!errs.length, `desktop: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await page.close();
}

// Sandboxed iframe: no storage, no same-origin.
{
    const page = await browser.newPage({ viewport: { width: 420, height: 720 } }), errs = []; watch(page, errs);
    await page.goto(`${URL0}frame.html`);
    await sleep(2500);
    const frame = page.frames()[1];
    const scene = await frame.evaluate(() => globalThis.__pogo?.currentName).catch(() => null);
    ok(scene === "title", `sandbox: boots to ${scene}`);
    await frame.evaluate(() => { __pogo.go("play", { mode: "daily", seed: 3, key: "2026-01-01", bot: 0.7 }); __pogo.step(600); });
    const s2 = await frame.evaluate(() => [__pogo.currentName, __pogo.twin.sim.run.kills]);
    ok(s2[0] === "play", `sandbox: plays with storage blocked (${s2[1]} kills)`);
    await frame.evaluate(() => { const T = __pogo.twin; T.sim.p.hp = 0.1; T.sim.p.inv = 0; T.sim.hurt(99, 0, 0, "test"); __pogo.step(200); });
    ok(await frame.evaluate(() => !!__pogo.data.result), "sandbox: a run ends and records without storage");
    ok(!errs.length, `sandbox: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await page.close();
}
await browser.close(); server.close();
console.log(rep.join("\n"));
process.exit(rep.some((l) => l.startsWith("FAIL")) ? 1 : 0);
