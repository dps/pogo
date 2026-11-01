// Real time in Chrome: no ?paused. Touch and mouse play, then the same with everything blocked inside a sandboxed iframe.
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
async function play(page, frame, touch) {
    const out = {};
    out.boot = await frame.evaluate(() => { const g = globalThis.__pogo; return g ? { scene: g.currentName, steps: g.stepCount } : null; });
    const cx = 190, cy = 500;
    if (touch) await page.touchscreen.tap(cx, cy); else await page.mouse.click(cx, cy);
    await page.waitForTimeout(1300);
    out.afterTap = await frame.evaluate(() => globalThis.__pogo.currentName);
    if (touch) await page.touchscreen.tap(cx, cy); else await page.mouse.click(cx, cy);    // skip the pan
    await page.waitForTimeout(300);
    const before = await frame.evaluate(() => ({ x: globalThis.__pogo.sim.cat.x, y: globalThis.__pogo.sim.cat.y }));
    await page.mouse.move(cx, cy); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(cx, cy - i * 2); await page.waitForTimeout(30); }
    for (let i = 0; i < 8; i++) { await page.waitForTimeout(200); (out.track ??= []).push(await frame.evaluate(() => { const g = globalThis.__pogo; return [g.stepCount, +g.sim.t.toFixed(2), Math.round(g.sim.cat.y)]; })); }
    await page.mouse.up();
    await page.waitForTimeout(200);
    out.walked = out.track.at(-1)[2] - before.y;
    out.perf = await frame.evaluate(() => {
        const g = globalThis.__pogo, t0 = performance.now(); g.sim.guards.forEach((q) => { q.coneAt = -9; }); for (let i = 0; i < 120; i++) g.step(1); const t1 = performance.now(); for (let i = 0; i < 30; i++) g.render(); const t2 = performance.now();
        return { stepMs: +((t1 - t0) / 120).toFixed(3), drawMs: +((t2 - t1) / 30).toFixed(2), stats: g.renderer.stats, errors: g.errors.length };
    });
    return out;
}
for (const [name, url, o] of [["desktop", "/index.html", {}], ["phone", "/index.html", { touch: true }], ["sandbox", "/sandbox.html", { sandbox: true }]]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const page = await ctx.newPage(), problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}${url}`);
    await page.waitForTimeout(o.sandbox ? 6000 : 2500);
    const frame = o.sandbox ? page.frames().find((f) => f !== page.mainFrame()) : page;
    const res = await play(page, frame, !!o.touch).catch((e) => ({ failed: e.message }));
    console.log(name, JSON.stringify(res), problems.length ? problems.slice(0, 5) : "no console errors");
    await ctx.close();
}
await browser.close(); server.close();
process.exit(0);
