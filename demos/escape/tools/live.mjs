// Real time in Chrome: touch play on a real page, a sandboxed iframe with storage, audio and vibration blocked, and frame times.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = fileURLToPath(new URL("..", import.meta.url)), mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port, browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const problems = [];
async function page(name, o = {}) {
    const ctx = await browser.newContext({ viewport: o.vp ?? { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${name}: pageerror ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`${name}: console ${m.text()}`); });
    return { ctx, p };
}
// 1. A human's first minute, with real touches.
{
    const { ctx, p } = await page("touch", { touch: true });
    const t0 = Date.now();
    await p.goto(`http://127.0.0.1:${port}/index.html`);
    await p.waitForFunction(() => globalThis.__pogo?.currentName === "title", null, { timeout: 30000 });
    console.log("title ready ms", Date.now() - t0);
    const box = await p.evaluate(() => { const g = globalThis.__pogo, v = g.view; return { s: v.scale, y: (v.height - v.safe.bottom - 150), x: v.width / 2 }; });
    await p.waitForTimeout(400);
    await p.touchscreen.tap(box.x * box.s, box.y * box.s);
    await p.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 15000 });
    console.log("board to play ms", Date.now() - t0);
    await p.waitForTimeout(1500);
    const hot = () => p.evaluate(() => { const st = globalThis.__pogo.last.stage, q = st.hotScreen("coat"), v = globalThis.__pogo.view; return { x: q.x * v.scale, y: q.y * v.scale }; });
    let h = await hot(); await p.touchscreen.tap(h.x, h.y); await p.waitForTimeout(500);
    console.log("ticket:", await p.evaluate(() => globalThis.__pogo.last.stage.r.s.inv.join()));
    const fps = await p.evaluate(async () => { const g = globalThis.__pogo; let n = 0, worst = 0, last = performance.now(); const t0 = last; await new Promise((ok) => { const f = (t) => { worst = Math.max(worst, t - last); last = t; if (++n < 120) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }); return { avg: (last - t0) / n, worst, paint: g.paintMs, stats: g.renderer?.stats }; });
    console.log("frames (software GL):", JSON.stringify(fps));
    await ctx.close();
}
// 2. Desktop, mouse, walking to the next carriage through a forced save.
{
    const { ctx, p } = await page("desktop", { vp: { width: 1280, height: 720 } });
    await p.goto(`http://127.0.0.1:${port}/index.html`);
    await p.waitForFunction(() => globalThis.__pogo?.currentName === "title", null, { timeout: 30000 });
    await p.keyboard.press("Enter");
    await p.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 15000 });
    await p.waitForTimeout(1200);
    const ms = await p.evaluate(() => { const g = globalThis.__pogo, s = g.last.stage, out = []; for (let i = 1; i < 12; i++) { const t = performance.now(); s.ensure(i); out.push(Math.round(performance.now() - t)); } s.ensure(s.r.s.at); return out; });
    console.log("carriage paint ms:", ms.join(" "));
    await p.keyboard.press("KeyH"); await p.waitForTimeout(200);
    console.log("hint mode:", await p.evaluate(() => globalThis.__pogo.last.stage.mode));
    await ctx.close();
}
// 3. A sandboxed iframe: no storage, no audio gesture, no vibration.
{
    const { ctx, p } = await page("sandbox", { vp: { width: 800, height: 450 } });
    await p.goto(`http://127.0.0.1:${port}/sandbox.html`);
    await p.waitForTimeout(3000);
    const f = p.frames().find((x) => x !== p.mainFrame());
    await p.mouse.click(400, 340); await p.waitForTimeout(2500);
    console.log("sandbox scene:", await f.evaluate(() => globalThis.__pogo.currentName));
    await ctx.close();
}
await browser.close(); server.close();
console.log(problems.length ? "PROBLEMS\n" + problems.join("\n") : "no console errors");
process.exit(problems.length ? 1 : 0);
