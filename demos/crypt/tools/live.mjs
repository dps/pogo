// Real-time Chrome run: plays with real pointer events, watches for console errors, and measures frame cost.
// Also loads the game with storage, audio, gamepad and workers blocked, as a sandboxed embed would.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const require = createRequire(join(here, "../../../package.json"));
const { chromium } = require("playwright-core");
const http = await import("node:http"), fs = await import("node:fs"), path = await import("node:path");
const server = http.createServer((q, r) => { const f = path.join(root, new URL(q.url, "http://x").pathname === "/" ? "index.html" : decodeURIComponent(new URL(q.url, "http://x").pathname)); if (!fs.existsSync(f)) { r.writeHead(404).end(); return; } r.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(f)); }).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const port = server.address().port;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
let bad = 0;
async function session(label, init) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(), errs = [];
    page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/404|favicon/.test(m.text())) errs.push(m.text()); });
    if (init) await page.addInitScript(init);
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
    await page.waitForTimeout(500);
    const btn = await page.evaluate(() => { const g = globalThis.__pogo, e = g.current.entities.find((q) => q.name === "play"), sc = g.view.scale ?? 1; return [e.pos.x * sc, e.pos.y * sc]; });
    await page.touchscreen.tap(btn[0], btn[1]); // Go on holiday
    await page.waitForTimeout(1200);
    const swipe = async (dx, dy) => { await page.mouse.move(195, 350); await page.mouse.down(); await page.mouse.move(195 + dx, 350 + dy, { steps: 3 }); await page.mouse.up(); await page.waitForTimeout(260); };
    const info = () => page.evaluate(() => { const g = globalThis.__pogo, f = g.crypt.state.floor; return { scene: g.currentName, moves: f?.moves(), mode: f?.mode, kills: g.data.run?.stats.kills, floor: g.data.run?.floor }; });
    for (const [dx, dy] of [[0, -50], [0, -50], [0, -50]]) await swipe(dx, dy);
    const a = await info();
    // Walk the search bot's route through the real game loop, in real time.
    const cost = await page.evaluate(async () => {
        const g = globalThis.__pogo, sleep = (ms) => new Promise((r) => { const t0 = performance.now(); const k = () => (performance.now() - t0 > ms ? r() : requestAnimationFrame(k)); k(); });
        const { solve } = await import("./solver.js");
        let floors = 0, frames = [], last = performance.now();
        let run = true; const tick = () => { const n = performance.now(); frames.push(n - last); last = n; if (run) requestAnimationFrame(tick); }; tick();
        const t0 = performance.now();
        while (performance.now() - t0 < 25000 && floors < 4) {
            if (g.currentName === "shop") { g.current.entities.find((e) => e.name === "onward")?.emit("tap"); await sleep(600); continue; }
            const f = g.crypt.state.floor;
            if (g.currentName !== "play" || f?.mode !== "play" || f.stage.s !== g.current) { await sleep(100); continue; }
            const p = solve(f.fl, f.state, { cap: 300000, maxDepth: 60 }).path;
            if (!p) break;
            for (const a of p) { f.act(a); await sleep(170); }
            floors++; await sleep(700);
        }
        run = false; frames.sort((a, b) => a - b);
        return { floors, frames: frames.length, p50: frames[frames.length >> 1], p95: frames[(frames.length * 0.95) | 0], p99: frames[(frames.length * 0.99) | 0], stats: g.renderer.stats };
    });
    const b = await info();
    await page.screenshot({ path: join(root, `shots/_live_${label}.png`) });
    console.log(label, JSON.stringify({ afterSwipes: a, end: b, cost, errs }));
    if (errs.length) bad++;
    await ctx.close();
}
await session("normal");
await session("blocked", `
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("denied", "SecurityError"); } });
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("denied", "SecurityError"); } });
    window.Worker = function () { throw new Error("workers blocked"); };
    window.AudioContext = undefined; window.webkitAudioContext = undefined;
    navigator.getGamepads = () => { throw new DOMException("denied", "SecurityError"); };
    navigator.vibrate = undefined;
`);
await browser.close(); server.close();
console.log(bad ? "LIVE FAILED" : "LIVE OK"); process.exit(bad ? 1 : 0);
