// Real Chrome on the real clock: touch buy, a live battle, determinism across engines, a sandboxed iframe, and a CPU throttle.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "../../package.json"));
const { chromium } = require("playwright-core");
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
const { battle } = await import("../sim.js"), { GHOSTS } = await import("../ghosts.js");
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    const t0 = Date.now(); await page.goto(URL0); await page.waitForFunction(() => globalThis.__pogo?.current); console.log("title after", Date.now() - t0, "ms");
    await page.waitForFunction(() => globalThis.__pogo.pb.sheetFull?.(), null, { timeout: 30000 }).catch(() => {}); console.log("all forms after", Date.now() - t0, "ms");
    const scale = await page.evaluate(() => __pogo.view.scale);
    await page.touchscreen.tap(195, 780 * 0.79);
    await page.waitForFunction(() => __pogo.state().scene === "shop" && __pogo.shop, null, { timeout: 5000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.state().scene) === "shop", "phone: PLAY reaches the shop");
    await sleep(500);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    const pts = await page.evaluate(() => { const s = __pogo.shop, c = s.cardXY(0), g = s.cellXY("board", 1), v = __pogo.view; return { c, g, k: v.scale, x: v.x, y: v.y }; });
    const px = (p) => [p.x * pts.k + pts.x, p.y * pts.k + pts.y];
    const [cx, cy] = px(pts.c), [gx, gy] = px(pts.g);
    await touch("touchStart", cx, cy); await sleep(60);
    for (let i = 1; i <= 10; i++) { await touch("touchMove", cx + ((gx - cx) * i) / 10, cy + ((gy - cy) * i) / 10); await sleep(25); }
    const lift = await page.evaluate(() => !!__pogo.shop.drag?.moved);
    await touch("touchEnd"); await sleep(500);
    const st = await page.evaluate(() => ({ board: __pogo.pb.run.board.filter(Boolean).length, gold: __pogo.pb.run.gold, h: __pogo.state().haptics }));
    ok(lift && st.board === 1, `phone: drag with a finger buys a pet (board ${st.board}, gold ${st.gold}, haptics ${JSON.stringify(st.h).slice(0, 70)})`);
    await page.evaluate(() => __pogo.shop.startFight());
    await page.waitForFunction(() => __pogo.state().scene === "battle" && __pogo.battle?.done, null, { timeout: 30000 }).catch(() => {});
    ok(await page.evaluate(() => __pogo.battle?.done), "phone: live battle finishes on the real clock");
    await sleep(1500);
    await page.evaluate(() => __pogo.battle.next());
    await sleep(600);
    const round = await page.evaluate(() => __pogo.pb.run.round);
    ok(round === 2, `phone: next round starts (${round})`);
    // Same battle, two engines.
    const sample = GHOSTS[9].slice(0, 12), there = await page.evaluate(async (list) => { const { battle } = await import("/sim.js"); return list.map((t, i) => battle(t, list[(i + 1) % list.length], 12345 + i).hash); }, sample);
    const here = sample.map((t, i) => battle(t, sample[(i + 1) % sample.length], 12345 + i).hash);
    ok(JSON.stringify(here) === JSON.stringify(there), "battle hashes match across Node and Chrome");
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 750 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "?seed=4"); await page.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    await page.evaluate(() => { __pogo.pb.meta.tutorial = true; __pogo.startRun({ seed: 3 }); }); await sleep(600);
    const pts = await page.evaluate(() => { const s = __pogo.shop, c = s.cardXY(1), g = s.cellXY("board", 2), v = __pogo.view; return { c, g, k: v.scale, x: v.x, y: v.y }; });
    const px = (p) => [p.x * pts.k + pts.x, p.y * pts.k + pts.y];
    await page.mouse.move(...px(pts.c)); await page.mouse.down(); await page.mouse.move(...px(pts.g), { steps: 8 }); await sleep(120); await page.mouse.up(); await sleep(400);
    ok(await page.evaluate(() => __pogo.pb.run.board[2] != null), "desktop: mouse drag places a pet exactly where dropped");
    await page.keyboard.press("KeyR"); await sleep(200);
    ok(await page.evaluate(() => __pogo.pb.run.rolls === 1), "desktop: R rerolls");
    await page.keyboard.press("Space"); await sleep(600);
    ok(await page.evaluate(() => __pogo.state().scene === "battle"), "desktop: Space starts the fight");
    // Throttled frame cost at the busiest moment: a full late-game battle.
    const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const fps = await page.evaluate(async () => { const g = __pogo, r = g.pb.run, foe = (await import("/ghosts.js")).GHOSTS[12].at(-1); const me = { pets: (await import("/ghosts.js")).GHOSTS[12].at(-2).pets, gold: 0 }; g.go("battle", { entry: { round: 12, me, foe, seed: 5, hash: 0 }, replay: true, back: "title" }); await new Promise((q) => setTimeout(q, 500)); let n = 0, worst = 0, last = performance.now(); const t0 = last; await new Promise((res) => { const f = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; n++; if (t - t0 > 3000) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); }); return { fps: n / 3, worst, stats: g.renderer?.stats }; });
    console.log("4x throttle under software GL", fps);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 800 } });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html"); await sleep(3000);
    const box = await page.locator("#f").boundingBox(); await page.mouse.click(box.x + 200, box.y + 553); await sleep(1200);
    const fr = page.frames().find((f) => f !== page.mainFrame()), scene = await fr.evaluate(() => __pogo.state().scene);
    ok(scene === "shop", `sandboxed iframe: storage and audio blocked, PLAY still reaches the shop (${scene})`);
    ok(errs.filter((e) => !/favicon|Failed to load resource|storage/i.test(e)).length === 0, `sandboxed iframe: no crash ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
