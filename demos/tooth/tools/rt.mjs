// Real-time run in Chrome: normal page, then inside a locked-down sandboxed iframe. Reports console errors and frame times.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "../../package.json"));
const { chromium } = require("playwright-core");
const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer((q, r) => {
    const u = q.url.split("?")[0];
    if (u === "/sandbox.html") { r.setHeader("content-type", "text/html"); return r.end('<!doctype html><iframe sandbox="allow-scripts" src="/index.html" style="width:100vw;height:100vh;border:0"></iframe>'); }
    const p = join(root, u === "/" ? "index.html" : u);
    if (!existsSync(p) || !statSync(p).isFile()) { r.statusCode = 404; return r.end(); }
    r.setHeader("content-type", types[extname(p)] ?? "application/octet-stream"); r.setHeader("Access-Control-Allow-Origin", "*"); r.end(readFileSync(p));
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [name, path, vp] of [["page", "/", { width: 1280, height: 720 }], ["sandbox", "/sandbox.html", { width: 844, height: 390 }]]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text() + " " + (m.location()?.url ?? "")); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}${path}`);
    await page.waitForTimeout(2500);
    await page.mouse.click(vp.width / 2, vp.height * 0.7);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    await page.keyboard.down("ArrowRight");
    for (let i = 0; i < 8; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(400); }
    await page.keyboard.up("ArrowRight");
    await page.keyboard.press("KeyM"); await page.waitForTimeout(300); await page.keyboard.press("KeyM"); await page.waitForTimeout(300);
    let info = null;
    if (name === "page") info = await page.evaluate(() => new Promise((res) => { let n = 0, t0 = performance.now(), last = t0, worst = 0; const f = (t) => { worst = Math.max(worst, t - last); last = t; if (++n < 60) requestAnimationFrame(f); else { const g = globalThis.__pogo; res({ fps: 60000 / (t - t0), worst, scene: g?.currentName, mode: g?.data.mode, room: g?.data.room, stats: g?.renderer.stats }); } }; requestAnimationFrame(f); }));
    if (name === "sandbox") info = await page.frames()[1].evaluate(() => { const g = globalThis.__pogo; g.step(30); return { scene: g.currentName, mode: g.data.mode, room: g.data.room }; });
    console.log(name, JSON.stringify(info), "errors:", errors.length, errors.slice(0, 5));
    await page.close();
}
await browser.close(); server.close();
