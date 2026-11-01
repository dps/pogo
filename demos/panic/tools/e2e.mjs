// Real Chrome, real clock. Touch on a phone viewport, keyboard on desktop, a sandboxed iframe, and a CPU-throttled run.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const { chromium } = createRequire(resolve(root, "../../package.json"))("playwright-core");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
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
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); };
const gaps = `(()=>{let last=performance.now(),max=0,n=0,sum=0;function f(t){const g=t-last;last=t;if(g<1000){max=Math.max(max,g);sum+=g;n++;}requestAnimationFrame(f)};requestAnimationFrame(f);window.__g=()=>({max:Math.round(max),avg:Math.round(sum/n*10)/10,n});})()`;
{
    const t0 = Date.now(), ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); const boot = Date.now() - t0; await sleep(500);
    const t1 = Date.now(); await page.touchscreen.tap(195, 780 - 280);
    await page.waitForFunction(() => __pogo.panic.dir?.state === "play", null, { timeout: 8000 });
    ok(true, `phone: boot ${boot} ms, PLAY tap to first microgame in ${Date.now() - t1} ms`);
    await page.evaluate(gaps); await page.evaluate(() => { __pogo.panic.auto = true; });
    await sleep(32000);
    const s = await page.evaluate(() => ({ n: __pogo.panic.dir?.n, score: __pogo.panic.dir?.score, st: __pogo.state().scene, g: window.__g(), stats: __pogo.renderer.stats }));
    ok(s.n >= 5 && !errs.length, `phone: live bot ${s.n} games in 32 s, score ${s.score}, frames avg ${s.g.avg} ms max ${s.g.max} ms (software GL), draws ${s.stats.drawCalls}. errors: ${errs.join("; ") || "none"}`);
    await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }), page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    await page.keyboard.press("Space"); await page.waitForFunction(() => __pogo.panic.dir?.state === "play", null, { timeout: 8000 });
    const id = await page.evaluate(() => __pogo.panic.dir.m.def.id);
    await page.keyboard.down("ArrowLeft"); await sleep(250); await page.keyboard.up("ArrowLeft");
    const k = await page.evaluate(() => __pogo.panic.dir.m?.keyboard);
    await page.keyboard.press("Escape"); await sleep(150);
    const p = await page.evaluate(() => __pogo.panic.dir.paused); await page.keyboard.press("Escape");
    ok(k && p && !errs.length, `desktop: Space starts, arrows take the glove in ${id}, Esc pauses. errors: ${errs.join("; ") || "none"}`);
    await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 720 } }), page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html"); await sleep(1800);
    const f = page.frames().find((x) => x !== page.mainFrame());
    await page.mouse.click(200, 720 - 340); await sleep(1500);
    const st = await f.evaluate(() => globalThis.__pogo?.state().scene);
    const dire = await f.evaluate(() => globalThis.__pogo?.panic.dir?.state);
    ok(st === "run" && !errs.filter((e) => !/storage|sandbox|404/i.test(e)).length, `sandboxed iframe: runs (${st}/${dire}) with storage blocked. errors: ${errs.join("; ") || "none"}`);
    await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 }), page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current);
    const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const ms = await page.evaluate(async () => { const { GAMES, ensureArt } = await import("/engine.js"); let worst = 0, who = ""; for (const g of GAMES) { const t = performance.now(); ensureArt(__pogo, g); const e = performance.now() - t; if (e > worst) { worst = e; who = g.id; } } return { worst: Math.round(worst), who }; });
    ok(ms.worst < 300, `4x CPU throttle: worst lazy paint under the wipe ${ms.worst} ms (${ms.who})`);
    await ctx.close();
}
await browser.close(); server.close();
