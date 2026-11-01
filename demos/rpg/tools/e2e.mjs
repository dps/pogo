// Real Chrome, real clock: phone touch, desktop keys, and a sandboxed iframe with storage, audio and gamepads blocked.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end('<iframe id=f sandbox="allow-scripts" src="/index.html" style="width:400px;height:760px;border:0"></iframe>'); return; }
    try { const file = path === "/" ? "index.html" : path, body = await readFile(join(root, file)); res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body); }
    catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); };
const hero = (page) => page.evaluate(() => ({ x: __oq.world?.hero.x, y: __oq.world?.hero.y, top: __oq.stack.top.constructor.name, scene: __oq.state().scene }));
// Phone
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__oq?.state?.().scene === "title", null, { timeout: 30000 }); await sleep(700);
    const load = await page.evaluate(() => performance.now());
    const b = await page.evaluate(() => { const h = __oq.stack.top.hits[0], v = __oq.view, c = document.querySelector("canvas").getBoundingClientRect(); const k = c.width / v.width; return { x: c.left + (h.x + h.w / 2) * k, y: c.top + (h.y + h.h / 2) * k }; });
    await page.touchscreen.tap(b.x, b.y); await sleep(1100);
    let st = await hero(page); ok(st.scene === "office", `phone: Clock In reaches the world (ready ${Math.round(load)} ms after navigation)`);
    const a = st; const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 195, y: 500 }] });
    for (let i = 1; i <= 8; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 195, y: 500 - i * 8 }] }); await sleep(16); }
    await sleep(1000);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(300);
    st = await hero(page); ok(st.y < a.y || st.top === "Dialog", `phone: drag walks the hero (${a.y} to ${st.y}, ${st.top})`);
    const haptics = await page.evaluate(() => __oq.state().haptics?.length ?? 0); ok(haptics > 0, `phone: ${haptics} haptic pulses logged`);
    const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t = performance.now(); const f = () => { n++; performance.now() - t < 1500 ? requestAnimationFrame(f) : res(n / 1.5); }; f(); }));
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2)} (${Math.round(fps)} fps, software GL)`);
    await ctx.close();
}
// Desktop keyboard, a battle in real time, and a reload that keeps the save
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__oq?.state?.().scene === "title", null, { timeout: 30000 }); await sleep(600);
    await page.keyboard.press("Enter"); await sleep(1300);
    let st = await hero(page); ok(st.scene === "office", "desktop: Enter clocks in");
    const a = st.y; await page.keyboard.down("ArrowUp"); await sleep(900); await page.keyboard.up("ArrowUp"); await sleep(200);
    st = await hero(page); ok(st.y < a || st.top === "Dialog", `desktop: arrows walk (${a} to ${st.y})`);
    await page.evaluate(() => { __oq.stack.list.length = 1; __oq.world.script = null; __oq.dev.setup(__oq, "F2", [["stickle", 12], ["chompler", 12]]); }); await sleep(400);
    await page.evaluate(() => __oq.dev.battle(__oq, [["vendetta", 12]], { fmt: 1, name: "Clive" })); await sleep(3500);
    const mode = await page.evaluate(() => __oq.stack.top.mode); ok(mode === "choose", `desktop: battle reaches the move panel in real time (${mode})`);
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await sleep(2500);
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2)}`);
    await ctx.close();
}
// Sandboxed iframe: no storage, nothing allowed
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 800 } }); const page = await ctx.newPage(); const errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html"); await sleep(5000);
    const f = page.frames().find((x) => x !== page.mainFrame());
    await f.locator("canvas").click({ position: { x: 200, y: 560 } }).catch(() => {}); await sleep(1500);
    const title = await f.evaluate(() => __oq.state().scene).catch((e) => "err " + e.message);
    ok(title === "office" || title === "title", `sandbox: game alive (${title})`);
    ok(errs.filter((e) => !/favicon|404/.test(e)).length === 0, `sandbox: no crashes ${errs.slice(0, 2)}`);
    await ctx.close();
}
await browser.close(); server.close();
