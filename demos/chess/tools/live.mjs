// Real time in Chrome: no ?paused. Plays a few real moves by mouse/touch events, in normal mode, with workers blocked, and inside a sandboxed iframe.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = new URL("..", import.meta.url).pathname;
const port = 41000 + (process.pid % 1500);
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function run(name, url, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const page = await ctx.newPage(), problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}${url}`);
    if (o.sandbox) {
        // Opaque origin: the module graph itself is cross-origin, served with CORS. Wait for visible life.
        await page.waitForTimeout(9000);
        const f = page.frames().find((x) => x !== page.mainFrame());
        const s = await f.evaluate(() => { const g = globalThis.__pogo; if (!g) return "no game"; g.go; const C = globalThis.__chess; C.c.startAI(1); return "started"; }).catch((e) => `evaluate failed ${e.message}`);
        await page.waitForTimeout(1500);
        const res = await f.evaluate(async () => {
            const C = globalThis.__chess, g = globalThis.__pogo;
            const m = C.chess.legal()[0]; C.commit(m, null, "arc");
            const s0 = g.stepCount, t0 = performance.now();
            for (let i = 0; i < 1200 && C.chess.history.length < 2; i++) await new Promise((r) => setTimeout(r, 50));
            return { ply: C.chess.history.length, brain: g.data.brain, errs: g.errors.length, steps: g.stepCount - s0, ms: Math.round(performance.now() - t0), phase: g.data.phase, busy: g.data.busy, thinking: g.data.thinking, job: !!C.brain.job, panel: g.data.panel, storage: (() => { try { localStorage.getItem("x"); return "ok"; } catch { return "blocked"; } })() };
        }).catch((e) => ({ failed: e.message }));
        console.log(name, s, JSON.stringify(res), problems.length ? problems.slice(0, 4) : "no errors");
        await ctx.close();
        return;
    }
    await page.waitForFunction(() => globalThis.__chess, null, { timeout: 30000 });
    await page.waitForTimeout(600);
    const box = async (n) => page.evaluate((n) => { const C = globalThis.__chess, W = C.world, sq = n.charCodeAt(0) - 97 + (n.charCodeAt(1) - 49) * 16; W.s.cam3.update(1); const p = W.project((sq & 7) - 3.5, 0.15, 3.5 - (sq >> 4)), v = W.s.view; return { x: p.x * v.scale + v.x, y: p.y * v.scale + v.y, sc: v.scale }; }, n);
    const drag = async (a, b) => {
        const p = await box(a), q = await box(b);
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        for (let i = 1; i <= 12; i++) { await page.mouse.move(p.x + (q.x - p.x) * i / 12, p.y + (q.y - p.y) * i / 12); await page.waitForTimeout(16); }
        await page.waitForTimeout(200);
        await page.mouse.up();
    };
    const log = [];
    const gate = async () => page.waitForFunction(() => { const g = globalThis.__pogo.data; return g.fen && !g.busy && !g.thinking && g.fen.split(" ")[1] === "w"; }, null, { timeout: 90000 });
    await page.evaluate((lv) => { globalThis.__chess.c.startAI(lv); }, o.level ?? 0);
    await page.waitForFunction(() => !globalThis.__pogo.data.busy && globalThis.__pogo.data.phase === "play", null, { timeout: 30000 });
    let t0 = Date.now();
    for (const [a, b] of [["e2", "e4"], ["g1", "f3"], ["b1", "c3"]]) {
        await page.evaluate(() => 0);
        for (let tries = 0; tries < 3; tries++) {
            const before = await page.evaluate(() => globalThis.__pogo.data.ply);
            await drag(a, b);
            await page.waitForTimeout(1500);
            if (await page.evaluate((n) => globalThis.__pogo.data.ply > n, before)) break;
        }
        await gate();
        log.push(await page.evaluate(() => globalThis.__chess.chess.history.at(-2)?.san));
    }
    const stats = await page.evaluate(() => { const g = globalThis.__pogo; return { ply: g.data.ply, brain: g.data.brain, errs: g.errors.length, hap: g.state().haptics.slice(-3), stats: g.renderer.stats }; });
    console.log(name, log.join(" "), JSON.stringify(stats), `${((Date.now() - t0) / 1000).toFixed(1)}s`, problems.length ? problems.slice(0, 4) : "no errors");
    await ctx.close();
}
if (!process.argv[2]) {
await run("worker ", "/index.html", { level: 2 });
await run("sliced ", "/index.html?noworker", { level: 5 });
}
await run("sandbox", "/sandbox.html", { sandbox: true });
await browser.close();
server.close();
process.exit(0);
