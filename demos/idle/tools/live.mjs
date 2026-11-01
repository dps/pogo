// Real Chrome, real clock: a phone with real touches, a sandboxed iframe with everything blocked, a 4x CPU throttle, and coming back after a long absence.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(new URL("../../../package.json", import.meta.url));
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
const fps = (page, ms) => page.evaluate((ms) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round((n * 1000) / (t - t0)), worst: Math.round(worst) }); }; requestAnimationFrame(f); }), ms);

{   // Phone: first touch to first sale.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.yard); await sleep(300);
    const load = Date.now() - t0;
    ok(load < 4000, `loaded and ready to tap in ${load}ms (software GL)`);
    const paint = await page.evaluate(() => performance.now());
    for (let i = 0; i < 24; i++) { await page.touchscreen.tap(190 + (i % 5) * 8, 300); await sleep(70); }
    await sleep(200);
    const a = await page.evaluate(() => { const G = __pogo.yard; return { cash: G.S.cash, taps: G.S.stats.taps, title: G.A.title, h: __pogo.state().haptics?.length ?? 0, hits: G.hits.map((h) => h.id).slice(0, 20) }; });
    ok(a.taps >= 20, `real touches sold things: ${a.taps} taps, $${a.cash}`);
    ok(a.title === 0, "title cleared by the first touch");
    console.log("     haptics seen", a.h);
    const crew = await page.evaluate(() => { const h = __pogo.yard.hits.find((x) => x.id === "crew0"), s = __pogo.view.scale; return { x: (h.x + h.w / 2) * s + __pogo.view.x, y: (h.y + h.h / 2) * s + __pogo.view.y }; });
    await page.touchscreen.tap(crew.x, crew.y); await sleep(150);
    ok((await page.evaluate(() => __pogo.yard.S.crew[0])) === 1, "a real touch on a card hires the nephew");
    // Offline: a saved game from four hours ago pays out on return.
    await page.evaluate(() => { const G = __pogo.yard; G.jump(1, 2); G.persist(); const k = "pogo:cosmic-yard-sale", v = JSON.parse(localStorage.getItem(k)); v.savedAt = Date.now() - 4 * 3600 * 1000; const was = v.cash; localStorage.setItem(k, JSON.stringify(v)); window.__was = was; G.persist = () => {}; window.__noSave = true; });
    await page.evaluate(() => { const k = "pogo:cosmic-yard-sale", raw = localStorage.getItem(k); sessionStorage.setItem("k", raw); });
    await page.addInitScript(() => { const raw = sessionStorage.getItem("k"); if (raw && !sessionStorage.getItem("done")) { localStorage.setItem("pogo:cosmic-yard-sale", raw); sessionStorage.setItem("done", "1"); } });
    await page.reload(); await page.waitForFunction(() => globalThis.__pogo?.yard); await sleep(400);
    const m = await page.evaluate(() => { const G = __pogo.yard; return { modal: G.modal, pay: G.awayInfo?.pay, secs: G.awayInfo?.secs, cash: G.S.cash }; });
    ok(m.modal === "away" && m.pay > 0, `offline return pays: ${JSON.stringify(m)}`);
    await page.screenshot({ path: join(root, "tools/tmp/away.png") });
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
}
{   // Locked-down iframe: no storage, nothing else either.
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(`${URL0}frame.html`); await sleep(1800);
    const box = await page.locator("#f").boundingBox();
    for (let i = 0; i < 10; i++) { await page.mouse.click(box.x + 200, box.y + 260); await sleep(40); }
    await sleep(400);
    ok(errs.length === 0, `sandboxed iframe: no errors ${errs.slice(0, 3).join(" | ")}`);
    const shot = await page.screenshot({ path: join(root, "tools/tmp/frame.png") }); ok(shot.length > 20000, "sandboxed iframe rendered");
    await ctx.close();
}
{   // Desktop with mouse and keys, under a 4x CPU throttle, in the heaviest scene.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.yard); await sleep(300);
    for (let i = 0; i < 24; i++) { await page.keyboard.press("Space"); await sleep(90); }
    ok((await page.evaluate(() => __pogo.yard.S.stats.taps)) >= 10, "Space sells on desktop");
    await page.keyboard.press("Digit1"); await sleep(100);
    const dk = await page.evaluate(() => ({ crew: __pogo.yard.S.crew[0], cash: __pogo.yard.S.cash, taps: __pogo.yard.S.stats.taps, modal: __pogo.yard.modal })); ok(dk.crew === 1, `1 hires on desktop ${JSON.stringify(dk)}`);
    await page.evaluate(() => { __pogo.yard.jump(4, 2, { crew: [60, 40, 30, 20, 8] }); });
    const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const f = await fps(page, 2500); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    console.log(`     4x throttle, software GL: ${f.fps}fps, worst frame ${f.worst}ms`);
    const stats = await page.evaluate(() => { const s = performance.now(); for (let i = 0; i < 60; i++) __pogo.step(1); return { stepMs: (performance.now() - s) / 60, draw: __pogo.renderer.stats }; });
    console.log("     step ms", stats.stepMs.toFixed(3), JSON.stringify(stats.draw));
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
