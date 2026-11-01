// Real-time runs in Chrome: real audio clock and console, then with storage, audio, gamepad and vibration blocked, then inside a sandboxed iframe.
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "../../../node_modules/playwright-core/index.mjs";
const root = resolve(new URL("..", import.meta.url).pathname), port = 48000 + (process.pid % 900);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe id=f sandbox="allow-scripts" src="/index.html" style="width:360px;height:640px;border:0"></iframe>`); return; }
    let f = join(root, normalize(u.pathname)); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*", "cache-control": "no-store" }); res.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0; const check = (ok, m) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${m}`); if (!ok) failed++; };
async function open(block, url = "/index.html") {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: false }), page = await c.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    if (block) await page.addInitScript(block);
    await page.goto(`http://127.0.0.1:${port}${url}`);
    return { c, page, errors };
}
// Song-lock sample: the sim clock against the audio clock, and how long steps take.
const sample = (page, ms) => page.evaluate((ms) => new Promise((done) => {
    const g = __pogo, ctx = __moth, t0 = performance.now(); let frames = 0, worst = 0, maxErr = 0, sum = 0, n = 0, drops = 0, last = t0; const orig = g.stepOnce?.bind(g);
    const tick = (now) => {
        const p = ctx.play; frames++; const fr = now - last; last = now; if (fr > 34) drops++;
        if (p?.cond?.song) { const e = Math.abs(p.cond.t - g.audio.song.time); if (e > maxErr) maxErr = e; }
        if (performance.now() - t0 < ms) requestAnimationFrame(tick);
        else done({ fps: frames / (ms / 1000), maxErr, drops, stats: g.renderer.stats, bullets: p?.bullets.count, peak: p?.bullets.peak, scene: g.currentName, audio: g.audio.ctx?.state ?? "none", free: p?.cond.free, late: p?.dir.maxLate, beat: p?.cond.beat });
    };
    requestAnimationFrame(tick);
}), ms);
const ready = (page) => page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 20000 });
// Bot-free run: a heavy pattern with an invulnerable moth, in real time, for the numbers.
const heavy = (page) => page.evaluate(() => { const g = __pogo, c = __moth; g.go("play", { stage: 5, practice: { type: "phase", i: 2, name: "Echoes", diff: 2 } }, {}); });

console.log("Real audio");
{
    const { page, errors, c } = await open(); await ready(page); await page.waitForTimeout(500);
    console.log("  load ms", await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd)));
    await page.mouse.click(195, 300); await page.waitForTimeout(1200);
    const s0 = await page.evaluate(() => [__pogo.currentName, __pogo.audio.ctx?.state]); check(s0[0] === "play", `tap starts the game (${s0})`);
    await page.mouse.move(195, 700); await page.mouse.down(); await page.mouse.move(150, 650, { steps: 8 }); await page.mouse.up();
    const r = await sample(page, 6000); console.log(" ", JSON.stringify(r));
    check(r.audio === "running" && !r.free, "on the audio clock"); check(r.maxErr < 0.06, `sim clock within ${(r.maxErr * 1000).toFixed(0)} ms of the song`);
    await heavy(page); await page.waitForTimeout(500); await page.evaluate(() => { __moth.play.moth.inv = 1e9; });
    const h = await sample(page, 16000); console.log("  echoes:", JSON.stringify(h));
    check(h.maxErr < 0.12, `under load, within ${(h.maxErr * 1000).toFixed(0)} ms`);
    check(errors.length === 0, `no console errors ${errors.slice(0, 2)}`); await c.close();
}
console.log("Everything blocked");
{
    const block = () => {
        delete window.AudioContext; delete window.webkitAudioContext; Object.defineProperty(navigator, "getGamepads", { value: () => { throw new Error("blocked"); } }); Object.defineProperty(navigator, "vibrate", { value: () => { throw new Error("blocked"); } });
        Object.defineProperty(window, "localStorage", { get() { throw new Error("blocked"); } }); window.Worker = class { constructor() { throw new Error("blocked"); } };
    };
    const { page, errors, c } = await open(block); await ready(page); await page.waitForTimeout(400); await page.mouse.click(195, 300); await page.waitForTimeout(3000);
    const r = await sample(page, 3000); console.log(" ", JSON.stringify(r)); check(r.scene === "play" && r.beat > 4, "plays on the step clock"); check(errors.length === 0, `no errors ${errors.slice(0, 2)}`); await c.close();
}
console.log("Audio context that never runs");
{
    const block = () => { const R = window.AudioContext; AudioContext.prototype.resume = function () { return Promise.resolve(); }; window.AudioContext = class extends R { constructor(...a) { super(...a); this.suspend(); } get state() { return "suspended"; } }; };
    const { page, errors, c } = await open(block); await ready(page); await page.waitForTimeout(400); await page.mouse.click(195, 300); await page.waitForTimeout(3000);
    const r = await sample(page, 3000); console.log(" ", JSON.stringify(r)); check(r.beat > 4, "the song clock stall falls back and the patterns keep coming"); check(errors.length === 0, `no errors ${errors.slice(0, 2)}`); await c.close();
}
console.log("Sandboxed iframe");
{
    const { page, errors, c } = await open(null, "/frame.html"); await page.waitForTimeout(2500); await page.mouse.click(180, 300); await page.waitForTimeout(2500);
    check(errors.length === 0, `no errors ${errors.slice(0, 2)}`); await c.close();
}
await browser.close(); server.close(); console.log(failed ? `${failed} FAILED` : "live: all passed"); process.exit(failed ? 1 : 0);
