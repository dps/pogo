// Real Chrome, real clock: phone touch, pinch, desktop mouse and keys, a sandboxed iframe, a 4x CPU throttle.
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
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); };

// Phone: real touches from the title to a plonk.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(600);
    const t0 = Date.now();
    await page.touchscreen.tap(195, 780 - 34 - 130);
    await page.waitForFunction(() => __pogo.state().scene === "play" && __pogo.city?.hud?.m, null, { timeout: 15000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.state().scene) === "play", `phone: Play reaches the harbour in ${Date.now() - t0} ms`);
    await sleep(500);
    const scale = await page.evaluate(() => __pogo.view.scale);
    const card = await page.evaluate(() => { const h = __pogo.city.hud; const r = h.cardRect(h.cards.indexOf("market")); return { x: r.x, y: r.y }; });
    await page.touchscreen.tap(card.x * scale, card.y * scale); await sleep(300);
    const sel = await page.evaluate(() => ({ s: __pogo.city.hud.sel, t: __pogo.city.hud.tile }));
    ok(sel.s === "market" && sel.t !== null, `phone: tapped card selected ${sel.s}, ghost on tile ${sel.t}`);
    const pl = await page.evaluate(() => { const b = __pogo.city.hud.btn("plonk"); return { x: b.x, y: b.y }; });
    await page.touchscreen.tap(pl.x * scale, pl.y * scale); await sleep(700);
    const built = await page.evaluate(() => ({ n: __pogo.city.sim.count("market"), h: __pogo.state().haptics, s: __pogo.state().sounds?.length }));
    ok(built.n === 1, `phone: Plonk builds, haptics ${JSON.stringify(built.h).slice(0, 60)}`);
    // Pinch, then a drag.
    const cdp = await ctx.newCDPSession(page);
    const before = await page.evaluate(() => __pogo.city.w.cam.tDist);
    const two = (type, gap) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 195 - gap, y: 400, id: 1 }, { x: 195 + gap, y: 400, id: 2 }] });
    await two("touchStart", 40); await sleep(60);
    for (let i = 1; i <= 8; i++) { await two("touchMove", 40 + i * 12); await sleep(30); }
    await two("touchEnd"); await sleep(200);
    const after = await page.evaluate(() => __pogo.city.w.cam.tDist);
    ok(after < before * 0.8, `phone: pinch zooms ${before.toFixed(1)} -> ${after.toFixed(1)}`);
    const yaw0 = await page.evaluate(() => { const h = __pogo.city.hud; h.deselect(); return __pogo.city.w.cam.tYaw; });
    const one = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
    await one("touchStart", 120, 420); await sleep(50);
    for (let i = 1; i <= 8; i++) { await one("touchMove", 120 + i * 15, 420); await sleep(30); }
    await one("touchEnd"); await sleep(200);
    ok(await page.evaluate((y) => __pogo.city.w.cam.tYaw !== y, yaw0), "phone: drag spins");
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
}
// Desktop mouse, keys, and a rich town at speed under throttle.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(500);
    await page.evaluate(() => __pogo.go("play", { index: 5, days: 40 }));
    await page.waitForFunction(() => __pogo.city?.sim?.day >= 40 && __pogo.city.hud.m); await sleep(800);
    await page.keyboard.press("Digit1"); await sleep(250);
    ok(await page.evaluate(() => __pogo.city.hud.sel === "cottage"), "desktop: key 1 picks the first card");
    await page.keyboard.press("Escape"); await sleep(150);
    await page.mouse.move(640, 340); await page.mouse.wheel(0, -300); await sleep(200);
    const stats = await page.evaluate(() => {
        const w = __pogo.city.w, t0 = performance.now();
        for (let i = 0; i < 5; i++) w.rebuildTown();
        const rebuild = (performance.now() - t0) / 5;
        const t1 = performance.now();
        for (let i = 0; i < 60; i++) __pogo.step(1);
        const step = (performance.now() - t1) / 60;
        const g = (n) => __pogo.assets.geometry(n).indices.length / 3;
        return { rebuild, step, tris: g("town") + g("townLeaf") + g("townGlow") + g("ground") + g("grass"), stats: __pogo.renderer.stats, walkers: w.walkers.length };
    });
    console.log("    rich town:", JSON.stringify(stats));
    ok(stats.step < 8, `desktop: logic step ${stats.step.toFixed(2)} ms`);
    ok(stats.rebuild < 30, `desktop: merging the town takes ${stats.rebuild.toFixed(1)} ms`);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const frame = await page.evaluate(async () => {
        const g = __pogo; let n = 0, tot = 0, worst = 0;
        for (let i = 0; i < 120; i++) { const t = performance.now(); g.step(1); g.render(1); const d = performance.now() - t; tot += d; worst = Math.max(worst, d); n++; if (i % 10 === 0) await new Promise((r) => setTimeout(r)); }
        return { avg: tot / n, worst };
    });
    console.log("    4x throttle, software GL, JS + submit per frame:", JSON.stringify(frame));
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
}
// A sandboxed iframe: no storage, no audio gesture, no vibration.
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html"); await sleep(2500);
    const f = page.frames().find((x) => x !== page.mainFrame());
    await page.mouse.click(210, 500); await sleep(1500);
    const scene = await f.evaluate(() => globalThis.__pogo?.state().scene).catch((e) => `err ${e.message}`);
    ok(scene === "title" || scene === "play", `sandbox: alive in scene ${scene}`);
    ok(errs.filter((e) => !/Blocked|sandbox|allow-|404/i.test(e)).length === 0, `sandbox: no errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close();
server.close();
