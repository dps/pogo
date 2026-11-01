// Real time in Chrome, no ?paused: touch play, mouse play, then the same inside a sandboxed iframe with everything blocked.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = new URL("..", import.meta.url).pathname, port = 44100 + (process.pid % 1400);
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function play(page, frame, touch, w, h) {
    const out = {};
    out.boot = await frame.evaluate(() => { const g = globalThis.__pogo; return g ? { scene: g.currentName, steps: g.stepCount } : null; });
    const bx = w / 2, by = h / 2 + (h > w ? 150 : 152);
    if (touch) await page.touchscreen.tap(bx, by); else await page.mouse.click(bx, by);
    await page.waitForTimeout(3000);
    out.afterTap = await frame.evaluate(() => [globalThis.__pogo.currentName, globalThis.__pogo.stepCount]);
    if (out.afterTap[0] !== "play") { out.fallback = true; await frame.evaluate(() => globalThis.__pogo.input.press("confirm", 1)); }
    await frame.waitForFunction(() => globalThis.__pogo.currentName === "play" && globalThis.__pogo.sim, null, { timeout: 40000 });
    await page.waitForTimeout(2000);
    // Light on, then a walk and a look.
    await frame.evaluate(() => globalThis.__pogo.input.press("light", 1));
    await page.waitForTimeout(400);
    if (!touch) await page.mouse.click(w * 0.6, h * 0.4);
    const before = await frame.evaluate(() => ({ x: globalThis.__pogo.sim.p.x, yaw: globalThis.__pogo.sim.p.yaw, light: globalThis.__pogo.sim.p.light }));
    await page.mouse.move(w * 0.75, h * 0.4); await page.mouse.down();
    for (let i = 1; i <= 16; i++) { await page.mouse.move(w * 0.75 - i * 6, h * 0.4); await page.waitForTimeout(30); }
    await page.mouse.up();
    await page.keyboard.down("KeyW"); await page.waitForTimeout(1200); await page.keyboard.up("KeyW");
    const after = await frame.evaluate(() => ({ x: globalThis.__pogo.sim.p.x, z: globalThis.__pogo.sim.p.z, yaw: globalThis.__pogo.sim.p.yaw, step: globalThis.__pogo.sim.step }));
    out.moved = { dx: +(after.x - before.x).toFixed(2), dyaw: +(after.yaw - before.yaw).toFixed(2), light: before.light, step: after.step };
    out.perf = await frame.evaluate(() => {
        const g = globalThis.__pogo, t0 = performance.now(); for (let i = 0; i < 120; i++) g.step(1); const t1 = performance.now(); for (let i = 0; i < 20; i++) g.render(); const t2 = performance.now();
        return { stepMs: +((t1 - t0) / 120).toFixed(3), drawMs: +((t2 - t1) / 20).toFixed(2), stats: g.renderer.stats, errors: g.errors?.length ?? 0, scene: g.currentName, muted: g.audio.ctx ? g.audio.ctx.state : "no audio ctx" };
    });
    return out;
}
for (const [name, url, o] of [["desktop", "/index.html", { w: 1280, h: 800 }], ["phone", "/index.html", { touch: true, w: 390, h: 844 }], ["sandbox", "/sandbox.html", { sandbox: true, w: 390, h: 844 }]]) {
    const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const page = await ctx.newPage(), problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}${url}`);
    await page.waitForTimeout(o.sandbox ? 7000 : 3500);
    const frame = o.sandbox ? page.frames().find((f) => f !== page.mainFrame()) : page;
    const res = await play(page, frame, !!o.touch, o.w, o.h).catch((e) => ({ failed: e.message }));
    console.log(name, JSON.stringify(res), problems.length ? problems.slice(0, 5) : "no console errors");
    await ctx.close();
}
await browser.close(); server.close();
process.exit(0);
