// Real Chrome, real clock, real mouse and touch. Hosts the game on an ephemeral port, so nothing needs stopping afterwards.
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
    if (path === "/frame") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<!doctype html><iframe id=f sandbox="allow-scripts" src="/" style="width:390px;height:700px;border:0"></iframe>`); return; }
    try {
        const body = await readFile(join(root, path === "/" ? "index.html" : path));
        res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" });
        res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Desktop: mouse and keyboard --------------------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const t0 = Date.now();
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 30000 });
    console.log(`     load to title ${Date.now() - t0}ms`);
    await sleep(500);
    await page.keyboard.press("Enter");
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 8000 });
    ok(true, "desktop: Enter starts the game");
    await sleep(700);
    const info = await page.evaluate(() => { const L = __pogo.data.play.L, s = __pogo.view.scale; const pk = [(L.tx + L.packW * 0.5) * s, (L.ty + L.barH + L.packH * 0.5) * s], to = [__pogo.data.play.vx(4.5, 7.5) * s, __pogo.data.play.vy(4.5, 7.5) * s]; return { pk, to }; });
    await page.mouse.move(...info.pk); await page.mouse.down(); await sleep(60);
    await page.mouse.move(info.to[0], info.to[1], { steps: 12 }); await sleep(60); await page.mouse.up(); await sleep(200);
    ok(await page.evaluate(() => __pogo.data.sim.towers.length === 1), "desktop: mouse drag plants a gnome");
    await page.keyboard.press("Digit1"); await sleep(50);
    const cell = await page.evaluate(() => { const s = __pogo.view.scale; return [__pogo.data.play.vx(3.5, 5.5) * s, __pogo.data.play.vy(3.5, 5.5) * s]; });
    await page.mouse.move(...cell); await sleep(60); await page.mouse.down(); await sleep(50); await page.mouse.up(); await sleep(200);
    ok(await page.evaluate(() => __pogo.data.sim.towers.length === 2), "desktop: key 1 then click plants too");
    await page.keyboard.press("KeyF"); await sleep(50);
    const t1 = await page.evaluate(() => __pogo.data.sim.time); await sleep(1000); const t2 = await page.evaluate(() => __pogo.data.sim.time);
    ok(t2 - t1 > 1.3, `desktop: fast forward runs quicker (${(t2 - t1).toFixed(2)}s of garden per second, on software GL)`);
    ok(errors.length === 0, `desktop: no console errors ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// ---- Phone: real touch, then a big swarm ---------------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 30000 });
    await sleep(400);
    await page.touchscreen.tap(195, 844 * 0.8);
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 8000 });
    ok(true, "phone: tap starts the game");
    await sleep(600);
    const stress = await page.evaluate(async () => {
        const g = __pogo; g.data.quiet = true;
        g.go("play", { level: 16 });
        await new Promise((r) => setTimeout(r, 400));
        const s = g.data.sim; s.pennies = 9999;
        for (let i = 0; i < 300; i++) s.spawn(i % 2 ? "ant" : "aphid", 1 + (i % 7), 11);
        for (let i = 0; i < 200; i++) s.spawn("ant", 1 + (i % 7), 10.5);
        const stamps = []; let last = performance.now(), work = 0, n = 0;
        const step = g.step.bind(g);
        await new Promise((done) => { const f = (t) => { stamps.push(t - last); last = t; if (stamps.length < 90) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
        const t0 = performance.now(); g.render(); const renderMs = performance.now() - t0;
        const t1 = performance.now(); s.tick(1 / 60); const simMs = performance.now() - t1;
        void step; void work; void n;
        stamps.sort((a, b) => a - b);
        return { pests: s.enemies.length, stats: { ...g.renderer.stats }, medianFrame: stamps[45], renderMs, simMs };
    });
    console.log("     swarm:", JSON.stringify(stress));
    ok(stress.stats.drawCalls < 60, `phone: ${stress.pests} pests in ${stress.stats.drawCalls} draw calls`);
    ok(stress.simMs < 4, `phone: rules tick ${stress.simMs.toFixed(2)}ms with the swarm out`);
    ok(errors.length === 0, `phone: no page errors ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// ---- Sandboxed iframe: no storage, no gamepad, opaque origin -----------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 760 } });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${URL0}frame`);
    await sleep(3500);
    const f = page.frames().find((x) => x !== page.mainFrame());
    const name = await f.evaluate(() => globalThis.__pogo?.currentName);
    ok(name === "title", `sandbox: game boots in a locked-down iframe (${name})`);
    await f.evaluate(() => { __pogo.go("play", { level: 2 }); });
    await sleep(800);
    const fine = await f.evaluate(() => { const s = __pogo.data.sim; s.plant("gnome", 4, 5); s.sendWave(); return s.towers.length; });
    await sleep(800);
    ok(fine === 1, "sandbox: plays with storage blocked");
    await f.evaluate(() => { const s = __pogo.data.sim; s.finish("win"); });
    await sleep(600);
    ok(errors.length === 0, `sandbox: no page errors ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close();
server.close();
