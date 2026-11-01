// Real Chrome, real clock, real touch. Hosts the folder on an ephemeral port. Also opens the game in a sandboxed iframe.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = fileURLToPath(new URL("..", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    try {
        if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe sandbox="allow-scripts" style="width:400px;height:700px" src="/index.html"></iframe>`); return; }
        const body = await readFile(root + (path === "/" ? "index.html" : path.slice(1)));
        res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const rep = [], ok = (c, m) => { rep.push(c); console.log(`${c ? "ok  " : "FAIL"} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errs.push(m.text()); }); };
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    console.log(`     loaded in ${Date.now() - t0} ms, world build ${await page.evaluate(() => performance.now() | 0)} ms since navigation`);
    await sleep(300);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    await page.evaluate(() => { __pogo.noSave = true; __pogo.profile.tutorial = true; });
    await touch("touchStart", [[1, 195, 420]]); await sleep(30); await touch("touchEnd", []);
    await page.waitForFunction(() => __pogo.play.phase === "run", null, { timeout: 4000 });
    ok(true, "phone: a touch on the title starts the run");
    await page.evaluate(() => { __pogo.play.run.inv = 999; });
    await sleep(600);
    const lane0 = await page.evaluate(() => __pogo.play.run.p.lane);
    await touch("touchStart", [[1, 195, 500]]); await sleep(16); await touch("touchMove", [[1, 165, 500]]); await sleep(50);
    const mid = await page.evaluate(() => __pogo.play.run.p.lane);
    await touch("touchEnd", []);
    ok(mid === lane0 - 1, `phone: real swipe changed lane mid-stroke (${lane0} to ${mid})`);
    await sleep(1500);
    const st = await page.evaluate(() => JSON.stringify(__pogo.renderer.stats));
    console.log("     renderer stats in a run:", st);
    await page.evaluate(() => __pogo.play.run.catchMe("crash", null));
    await page.waitForFunction(() => __pogo.play.phase === "over", null, { timeout: 3000 });
    const t1 = Date.now();
    await touch("touchStart", [[1, 195, 420]]); await sleep(24); await touch("touchEnd", []);
    await page.waitForFunction(() => __pogo.play.phase === "run", null, { timeout: 2000 });
    ok(Date.now() - t1 < 1000, `phone: one tap restarts in ${Date.now() - t1} ms in real time`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await page.evaluate(() => { __pogo.play.run.inv = 999; });
    // CPU cost of a step plus building a frame, at 4x CPU throttle to stand in for a mid-range phone.
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const cost = await page.evaluate(() => { const a = []; for (let i = 0; i < 240; i++) { const t = performance.now(); __pogo.step(1); __pogo.render(); a.push(performance.now() - t); } a.sort((x, y) => x - y); return { median: a[120], p95: a[228], max: a[239] }; });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    console.log("     step+render at 4x throttle (software GL included), ms:", JSON.stringify(cost));
    await ctx.close();
}
{
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(200);
    await page.evaluate(() => { __pogo.noSave = true; __pogo.profile.tutorial = true; });
    await page.keyboard.press("Space");
    await page.waitForFunction(() => __pogo.play.phase === "run", null, { timeout: 3000 });
    await page.evaluate(() => { __pogo.play.run.inv = 999; });
    await sleep(300);
    await page.keyboard.press("ArrowLeft"); await sleep(60);
    ok(await page.evaluate(() => __pogo.play.run.p.lane === 0), "desktop: arrow key changes lane");
    await page.keyboard.press("Escape"); await sleep(60);
    ok(await page.evaluate(() => __pogo.current.paused), "desktop: Escape pauses");
    await page.keyboard.press("Escape"); await sleep(120);
    ok(await page.evaluate(() => !__pogo.current.paused), "desktop: Escape resumes");
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 3).join(" | ")}`);
    await page.close();
}
{
    const page = await browser.newPage({ viewport: { width: 500, height: 800 } }), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html");
    await sleep(2500);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    await page.mouse.click(200, 350); await sleep(1500);
    const phase = await frame.evaluate(() => __pogo.play.phase);
    ok(phase === "run" && errs.length === 0, `sandboxed iframe: runs with storage, audio blocked (phase ${phase}) ${errs.slice(0, 2).join(" | ")}`);
    await page.close();
}
await browser.close(); server.close();
process.exit(rep.every(Boolean) ? 0 : 1);
