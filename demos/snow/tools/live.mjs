// Real time in Chrome: real touch swipes on a phone viewport, keys on desktop, and a sandboxed iframe with storage, workers and audio blocked.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = new URL("..", import.meta.url).pathname, port = 43000 + (process.pid % 1500);
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function open(url, o) {
    const ctx = await browser.newContext({ viewport: o.vp, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const page = await ctx.newPage(), problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}${url}`);
    return { ctx, page, problems };
}
// Phone: swipes through the first level.
{
    const { ctx, page, problems } = await open("/", { vp: { width: 390, height: 844 }, touch: true });
    await page.waitForTimeout(1800);
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const swipe = async (x0, y0, x1, y1) => { await touch("touchStart", x0, y0); for (let i = 1; i <= 6; i++) { await touch("touchMove", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6); await page.waitForTimeout(16); } await touch("touchEnd"); await page.waitForTimeout(260); };
    await touch("touchStart", 195, 420); await touch("touchEnd");
    await page.waitForTimeout(1200);
    const scene = await page.evaluate(() => globalThis.__pogo.currentName);
    const steps = [];
    for (let i = 0; i < 4; i++) { await swipe(120, 420, 200, 420); steps.push(await page.evaluate(() => [globalThis.__pogo.data.pushes, globalThis.__pogo.play?.st.p])); }
    await page.waitForTimeout(800);
    const won = await page.evaluate(() => globalThis.__pogo.data.won);
    await page.waitForTimeout(2600);
    const after = await page.evaluate(() => ({ scene: globalThis.__pogo.currentName, solved: Object.keys(globalThis.__pogo.app.save.solved), stats: globalThis.__pogo.renderer.stats }));
    console.log("phone", scene, JSON.stringify(steps), "won", won, JSON.stringify(after), problems.length ? problems.slice(0, 4) : "no errors");
    await ctx.close();
}
// Desktop: keys, undo, restart, and how long a frame's work takes.
{
    const { ctx, page, problems } = await open("/", { vp: { width: 1280, height: 800 } });
    await page.waitForTimeout(1800);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);
    await page.evaluate(() => { const g = globalThis.__pogo; g.go("play", { id: "a3" }); });
    await page.waitForTimeout(700);
    const seq = ["ArrowUp", "ArrowLeft", "ArrowLeft", "ArrowUp", "ArrowRight"];
    for (const k of seq) { await page.keyboard.press(k, { delay: 40 }); await page.waitForTimeout(170); }
    const a = await page.evaluate(() => ({ p: globalThis.__pogo.play.st.p, push: globalThis.__pogo.data.pushes }));
    await page.keyboard.press("KeyZ", { delay: 40 }); await page.waitForTimeout(120);
    const b = await page.evaluate(() => ({ push: globalThis.__pogo.data.pushes }));
    await page.keyboard.press("KeyH", { delay: 40 }); await page.waitForTimeout(600);
    const c = await page.evaluate(() => !!globalThis.__pogo.play.hint);
    const cost = await page.evaluate(() => {
        const g = globalThis.__pogo, v = g.play.view, t = v.terrain; let a = performance.now();
        for (let i = 0; i < 20; i++) { t.touch(2, 2); t.flush(); }
        return { flushMs: (performance.now() - a) / 20, tex: [t.W, t.H], verts: t.nx * t.nz };
    });
    console.log("desktop", JSON.stringify(a), JSON.stringify(b), "hint", c, JSON.stringify(cost), problems.length ? problems.slice(0, 4) : "no errors");
    await ctx.close();
}
// Sandboxed iframe: opaque origin, no storage, no workers.
{
    const { ctx, page, problems } = await open("/sandbox.html", { vp: { width: 390, height: 844 } });
    await page.waitForTimeout(5000);
    const f = page.frames().find((x) => x !== page.mainFrame());
    const r = await f.evaluate(async () => {
        const g = globalThis.__pogo; if (!g) return "no game";
        g.go("play", { id: "a2" });
        await new Promise((r) => setTimeout(r, 1200));
        const P = g.play; P.tryMove(1); P.requestHint();
        await new Promise((r) => setTimeout(r, 800));
        return { scene: g.currentName, hint: !!P.hint, errs: g.errors?.length ?? 0, storage: (() => { try { localStorage.getItem("x"); return "ok"; } catch { return "blocked"; } })() };
    }).catch((e) => `evaluate failed ${e.message}`);
    console.log("sandbox", JSON.stringify(r), problems.length ? problems.slice(0, 4) : "no errors");
    await ctx.close();
}
await browser.close(); server.close();
