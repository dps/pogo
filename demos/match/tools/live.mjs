// Real Chrome, real clock, no ?paused: desktop mouse, phone-sized page, a sandboxed iframe with storage and audio
// blocked, and a 4x CPU throttle through a big cascade. Hosts itself on an ephemeral port.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "../../package.json"));
const { chromium } = require("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
    const path = new URL(req.url, "http://x").pathname;
    if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<iframe id=f sandbox="allow-scripts" src="/index.html" style="width:400px;height:700px;border:0"></iframe>`); return; }
    try { const body = await readFile(join(root, path === "/" ? "index.html" : path)); res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body); }
    catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) bad++; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errs.push(m.text()); }); };

async function mouseSwipe(page, q) {
    const r = await q.evaluate(() => { const S = globalThis.__pogo.sugar, l = S.m.legal()[0], v = S.view, g = globalThis.__pogo.view; const c = (i) => [g.x + v.cx(i) * g.scale, g.y + v.cy(i) * g.scale]; return { a: c(l[0]), b: c(l[1]) }; });
    await page.mouse.move(r.a[0], r.a[1]); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(r.a[0] + (r.b[0] - r.a[0]) * i / 8, r.a[1] + (r.b[1] - r.a[1]) * i / 8); await sleep(16); }
    await page.mouse.up();
}
const wait = (q) => q.waitForFunction(() => globalThis.__pogo.sugar?.view.idle, null, { timeout: 15000 });

// Desktop with a mouse: click Play, then swipe by mouse for a whole level.
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const t0 = Date.now();
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    console.log(`     boot to title ${Date.now() - t0} ms under software GL`);
    await sleep(500);
    const b = await page.evaluate(() => { const g = globalThis.__pogo, e = g.current.entities.find((x) => x.buttonLabel === "Play"), v = g.view; return [v.x + e.pos.x * v.scale, v.y + e.pos.y * v.scale]; });
    await page.mouse.click(b[0], b[1]);
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play" && globalThis.__pogo.sugar);
    await sleep(600);
    ok(true, "mouse click starts level 1");
    for (let i = 0; i < 16; i++) {
        if (await page.evaluate(() => globalThis.__pogo.sugar.m.won)) break;
        await wait(page); await mouseSwipe(page, page); await sleep(150); await wait(page);
    }
    ok(await page.evaluate(() => globalThis.__pogo.sugar.m.won || globalThis.__pogo.sugar.phase !== "play"), "level 1 won by mouse, in real time");
    await page.waitForFunction(() => globalThis.__pogo.sugar.phase === "news", null, { timeout: 30000 });
    ok(true, "reached the news page in real time");
    ok(!errs.length, `no console errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// Sandboxed iframe: storage, gamepads and audio may be blocked. The game must still run.
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(`${URL0}frame.html`);
    await sleep(5000);
    const f = page.frames().find((x) => x !== page.mainFrame());
    await f.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 30000 });
    const r = await f.evaluate(async () => {
        const g = globalThis.__pogo, storage = (() => { try { localStorage.getItem("x"); return "open"; } catch { return "blocked"; } })();
        const pad = (() => { try { navigator.getGamepads(); return "open"; } catch { return "blocked"; } })();
        g.go("play", { level: 2 }); await new Promise((r) => setTimeout(r, 900));
        const S = g.sugar, l = S.m.legal()[0]; S.view.attempt(l[0], l[1]);
        await new Promise((r) => setTimeout(r, 2500));
        g.save("sugarcrash1", { a: 1 });
        return { storage, pad, used: S.m.movesUsed, errors: g.errors?.length ?? 0, idle: S.view.idle };
    });
    ok(r.used === 1 && r.idle, `sandbox runs: ${JSON.stringify(r)}`);
    ok(!errs.filter((e) => !/sandbox|allow-same-origin|SecurityError/i.test(e)).length, `no sandbox errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
// Mid-range phone stand-in: 4x CPU throttle through the heaviest combo, timing logic plus draw submission.
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const r = await page.evaluate(async () => {
        const g = globalThis.__pogo;
        g.go("play", { level: 67 }); await new Promise((r) => setTimeout(r, 1200));
        const S = g.sugar, m = S.m, v = S.view;
        for (const i of [35, 36]) { m.pk[i] = 5; m.pc[i] = -1; const p = v.pieces.get(m.pid[i]); if (p) { p.k = 5; p.c = -1; } }
        const samples = [], orig = g.step.bind(g);
        const t0 = performance.now();
        v.attempt(35, 36);
        while (performance.now() - t0 < 2500) {
            const a = performance.now(); g.render(); samples.push(performance.now() - a);
            await new Promise((r) => requestAnimationFrame(r));
        }
        samples.sort((a, b) => a - b);
        void orig;
        return { frames: samples.length, medianRender: samples[samples.length >> 1], p95: samples[Math.floor(samples.length * 0.95)], stats: g.renderer.stats };
    });
    console.log(`     4x throttle, star+star: ${r.frames} frames in 2.5 s, CPU submit median ${r.medianRender.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms, ${JSON.stringify(r.stats)}`);
    ok(r.p95 < 16, "submit time fits a 60 Hz frame at 4x throttle");
    ok(!errs.length, `no errors ${errs.slice(0, 3)}`);
    await ctx.close();
}
await browser.close(); server.close();
console.log(bad ? `${bad} FAILURES` : "PASS");
process.exit(bad ? 1 : 0);
