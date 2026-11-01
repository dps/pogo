// Real Chrome, real clock: phone touch sweeps, desktop mouse, a locked-down sandboxed iframe and a 4x CPU throttle. Hosts itself on an ephemeral port.
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
const fps = (page, ms) => page.evaluate((ms) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = (t) => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round((n * 1000) / (t - t0)), worst: Math.round(worst) }); }; requestAnimationFrame(f); }), ms);

{   // Phone: first touch to first harvest, with a real finger.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(600);
    const t0 = Date.now();
    const play = await page.evaluate(() => { const e = __pogo.current.entities.find((x) => x.name === "play"); const p = e.worldPos(), s = __pogo.view.scale; return { x: p.x * s, y: p.y * s }; });
    await page.touchscreen.tap(play.x, play.y);
    await page.waitForFunction(() => __pogo.currentName === "farm", null, { timeout: 5000 }); await sleep(450);
    ok(true, `phone: Begin reaches the field in ${Date.now() - t0} ms`);
    const L = await page.evaluate(() => { const L = __pogo.moonpatch.farmLayout, s = __pogo.view.scale; return { x: L.farmX * s, y: L.farmY * s, t: 48 * s }; });
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const y = L.y + 4.5 * L.t;
    await touch("touchStart", L.x + 3.5 * L.t, y); await sleep(40);
    for (let i = 1; i <= 8; i++) { await touch("touchMove", L.x + (3.5 + i * 0.15) * L.t, y); await sleep(24); }
    const hap = await page.evaluate(() => __pogo.state().haptics);
    await touch("touchEnd"); await sleep(200);
    const st = await page.evaluate(() => ({ h: __pogo.moonpatch.sim.stats.harvested, inv: __pogo.moonpatch.sim.inv, ms: 0 }));
    ok(st.h >= 2, `phone: one drag harvested ${st.h} radishes, ${JSON.stringify(st.inv)}`);
    ok(hap.length >= 2, `phone: sweep gives haptic pulses ${JSON.stringify(hap)}`);
    const a = await fps(page, 1200); console.log(`     phone fps under software GL ${a.fps}, worst frame ${a.worst} ms`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
{   // Desktop mouse, save survives a reload.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    await page.keyboard.press("Enter"); await page.waitForFunction(() => __pogo.currentName === "farm"); await sleep(500);
    const L = await page.evaluate(() => { const L = __pogo.moonpatch.farmLayout, s = __pogo.view.scale, c = __pogo.canvas?.getBoundingClientRect?.() ?? { left: 0, top: 0 }; return { x: L.farmX * s + c.left, y: L.farmY * s + c.top, t: 48 * s }; });
    await page.mouse.move(L.x + 3.5 * L.t, L.y + 4.5 * L.t); await page.mouse.down();
    await page.mouse.move(L.x + 4.5 * L.t, L.y + 4.5 * L.t, { steps: 8 }); await page.mouse.up(); await sleep(300);
    const h = await page.evaluate(() => __pogo.moonpatch.sim.stats.harvested);
    ok(h >= 2, `desktop: mouse drag harvested ${h}`);
    await page.keyboard.press("ArrowLeft"); await page.keyboard.down("Space"); await sleep(80); await page.keyboard.press("ArrowDown"); await sleep(60); await page.keyboard.up("Space"); await sleep(120);
    await page.evaluate(() => __pogo.current && __pogo.moonpatch.simApi && 0);
    await page.reload(); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    const h2 = await page.evaluate(() => { const st = __pogo.moonpatch.loadOrNew(); return st?.stats.harvested ?? -1; });
    ok(h2 >= 2, `desktop: save survives a reload (${h2})`);
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
{   // Sandboxed iframe: no storage, no same-origin.
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(`${URL0}frame.html`); await sleep(2500);
    const box = await page.locator("#f").boundingBox();
    await page.mouse.click(box.x + 200, box.y + 700 - 150); await sleep(900);
    await page.mouse.move(box.x + 180, box.y + 490); await page.mouse.down(); await page.mouse.move(box.x + 280, box.y + 490, { steps: 8 }); await page.mouse.up(); await sleep(500);
    const fatal = errs.filter((e) => !/CORS|Access-Control|Failed to load resource|origin/.test(e));
    ok(fatal.length === 0, `sandbox: runs with storage blocked, errors: ${fatal.slice(0, 2).join(" | ") || "none"}`);
    await ctx.close();
}
{   // Heaviest field at a mid-range phone's speed.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    await page.evaluate(() => { const M = __pogo.moonpatch, st = M.fresh(1); st.zones = 4; st.tut = 5; st.tiles.forEach((t) => { t.t = true; t.c = { id: "starmelon", age: 9, ripe: true }; }); __pogo.go("farm"); });
    await sleep(800);
    const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const step = await page.evaluate(() => { const g = __pogo, t0 = performance.now(); for (let i = 0; i < 60; i++) { g.step(1); g.render(); } return (performance.now() - t0) / 60; });
    console.log(`     full field: ${step.toFixed(2)} ms per step+render on this machine, draw calls ${await page.evaluate(() => __pogo.renderer.stats.drawCalls)}, quads ${await page.evaluate(() => __pogo.renderer.stats.quads)}`);
    ok(step < 16, `full field stays inside a frame`);
    ok(errs.length === 0, "throttle: no console errors");
    await ctx.close();
}
await browser.close(); server.close();
