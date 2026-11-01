// Real-time runs in Chrome: real audio clock, then with storage, audio, gamepad, vibration and workers blocked, then in a sandboxed iframe.
// Run: node tools/live.mjs
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { chromium } from "../../../node_modules/playwright-core/index.mjs";

const root = resolve(new URL("..", import.meta.url).pathname), port = 47000 + (process.pid % 900);
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const server = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe id=f sandbox="allow-scripts" src="/index.html?embed" style="width:360px;height:640px;border:0"></iframe>`); return; }
    let f = join(root, normalize(u.pathname));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { "content-type": MIME[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end(readFileSync(f));
}).listen(port, "127.0.0.1");

const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
let failed = 0;
const check = (ok, msg) => { console.log(`  ${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) failed++; };

async function open(block, url = "/index.html") {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text()); });
    if (block) await page.addInitScript(block);
    await page.goto(`http://127.0.0.1:${port}${url}`);
    return { ctx, page, errors };
}
const gameReady = (page) => page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 15000 });
const startSong = (page, id, diff) => page.evaluate(([id, diff]) => {
    const b = globalThis.__beat, g = globalThis.__pogo;
    b.auto = true;
    b.clock.stop(); b.moodReset();
    g.go("play", { id, diff }, { fade: 0.05 });
}, [id, diff]);

async function sample(page, ms) {
    return page.evaluate((ms) => new Promise((done) => {
        const g = globalThis.__pogo, b = globalThis.__beat, c = b.clock, t0 = performance.now(), s0 = c.time; let frames = 0, back = 0, last = -1, worst = 0, prev = t0, steps0 = g.stepCount;
        const tick = (now) => {
            const n = c.now(); if (n < last - 1e-6) back++; last = n; frames++; worst = Math.max(worst, now - prev); prev = now;
            if (performance.now() - t0 < ms) requestAnimationFrame(tick);
            else { const el = (performance.now() - t0) / 1000, r = b.run?.judge; done({ scene: g.currentName, silent: c.silent, rate: (c.time - s0) / el, fps: frames / el, back, worstFrame: worst, judged: r?.judged, counts: r?.counts, score: r?.score, volume: g.audio.volume, steps: g.stepCount - steps0, stats: g.renderer.stats, audio: g.audio.ctx?.state ?? "none", latency: g.audio.latency?.() ?? 0, song: g.audio.song.time, clock: c.time }); }
        };
        requestAnimationFrame(tick);
    }), ms);
}

// 1. Real audio.
{
    console.log("Real audio clock");
    const { page, errors, ctx } = await open();
    await gameReady(page);
    await page.waitForTimeout(800);
    await page.mouse.click(195, 700);
    await page.waitForTimeout(300);
    console.log("  load ms:", await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd)));
    const menu = await sample(page, 1500);
    console.log("  title:", JSON.stringify({ rate: +menu.rate.toFixed(3), fps: +menu.fps.toFixed(0), silent: menu.silent, audio: menu.audio }));
    // Spy on every oscillator start: scheduled sounds, including the fever layer from playAt, must land on the music's step grid.
    await page.evaluate(() => {
        const log = (globalThis.__starts = []), raw = OscillatorNode.prototype.start;
        const sfx = __pogo.audio.play; let inSfx = false;
        __pogo.audio.play = function (...a) { inSfx = true; try { return sfx.apply(this, a); } finally { inSfx = false; } };   // Sound effects start now, by design.
        OscillatorNode.prototype.start = function (when) { log.push(!inSfx && when - this.context.currentTime > 0.04 ? when : -1); return raw.call(this, when); };
    });
    await startSong(page, "disco", "hard");
    await page.waitForTimeout(1000);
    const r = await sample(page, 25000);
    console.log("  play:", JSON.stringify({ ...r, rate: +r.rate.toFixed(3), fps: +r.fps.toFixed(0), stats: undefined }), JSON.stringify(r.stats));
    check(!r.silent, "stayed on the audio clock");
    check(Math.abs(r.rate - 1) < 0.01, `song clock runs at real time (${r.rate.toFixed(4)})`);
    check(r.back === 0, "displayed time never ran backwards");
    check(r.judged > 20 && r.counts.miss === 0, `autoplay judged ${r.judged} notes with no misses`);
    const grid = await page.evaluate(() => {
        const m = __pogo.audio.music, off = __starts.filter((w) => w > m.start).map((w) => { const r = ((w - m.start) % m.stepDur + m.stepDur) % m.stepDur; return Math.min(r, m.stepDur - r); });
        return { n: off.length, worst: Math.max(...off), fever: __beat.run.judge.fevers };
    });
    console.log("  grid:", JSON.stringify(grid));
    check(grid.n > 100 && grid.worst < 0.0015 && grid.fever > 0, `${grid.n} scheduled sounds on the step grid, worst ${(grid.worst * 1000).toFixed(2)} ms, ${grid.fever} fevers`);
    // Pause holds the clock; resume carries on.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const p1 = await page.evaluate(() => __beat.clock.time);
    await page.waitForTimeout(700);
    const p2 = await page.evaluate(() => __beat.clock.time);
    check(Math.abs(p2 - p1) < 0.01, `pause holds the song (${(p2 - p1).toFixed(3)} s drift)`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2300);
    const p3 = await sample(page, 1500);
    check(p3.rate > 0.9 && !p3.silent && p3.scene === "play", `resume carries on (rate ${p3.rate.toFixed(2)})`);
    check(errors.length === 0, `no console errors ${errors.slice(0, 3)}`);
    await ctx.close();
}

const blockers = {
    "audio throws": `window.AudioContext = window.webkitAudioContext = function () { throw new Error("blocked"); };`,
    "audio never runs": `const R = AudioContext.prototype.resume; AudioContext.prototype.resume = function () { return Promise.resolve(); }; Object.defineProperty(AudioContext.prototype, "state", { get() { return "suspended"; } });`,
    "everything blocked": `window.AudioContext = window.webkitAudioContext = undefined; Object.defineProperty(window, "localStorage", { get() { throw new Error("denied"); } }); Object.defineProperty(navigator, "getGamepads", { value() { throw new Error("denied"); } }); Object.defineProperty(navigator, "vibrate", { value: undefined }); window.Worker = undefined;`,
};
for (const [name, script] of Object.entries(blockers)) {
    console.log(`Blocked: ${name}`);
    const { page, errors, ctx } = await open(script);
    await gameReady(page);
    await page.waitForTimeout(600);
    await page.mouse.click(195, 700);
    await page.waitForTimeout(300);
    await startSong(page, "mudfoot", "normal");
    await page.waitForTimeout(1500);
    const r = await sample(page, 7000);
    console.log("  ", JSON.stringify({ silent: r.silent, rate: +r.rate.toFixed(3), judged: r.judged, fps: +r.fps.toFixed(0), scene: r.scene }));
    check(r.silent, "fell back to the step clock");
    check(r.rate > 0.8 && r.rate < 1.05, "time keeps moving");
    check(r.judged > 3 && r.counts.miss === 0, "notes still land and judge");
    check(errors.length === 0, `no errors ${errors.slice(0, 3)}`);
    await ctx.close();
}

// Sandboxed iframe: no storage, opaque origin.
{
    console.log("Sandboxed iframe");
    const { page, errors, ctx } = await open(null, "/frame.html");
    await page.waitForTimeout(4000);
    const frame = page.frames()[1];
    const state = await frame.evaluate(() => ({ scene: globalThis.__pogo?.currentName, silent: globalThis.__beat?.clock.silent }));
    console.log("  ", JSON.stringify(state));
    await page.mouse.click(180, 560);
    await page.waitForTimeout(6000);
    const after = await frame.evaluate(() => ({ scene: globalThis.__pogo?.currentName, t: globalThis.__beat?.clock.time, silent: globalThis.__beat?.clock.silent }));
    console.log("  ", JSON.stringify(after));
    check(state.scene === "title", "boots on the title");
    check(after.scene === "play" && after.t > 3, "PLAY tap starts a song in the frame");
    check(errors.length === 0, `no errors ${errors.slice(0, 3)}`);
    await ctx.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} FAILED` : "\nLIVE PASS");
process.exit(failed ? 1 : 0);
