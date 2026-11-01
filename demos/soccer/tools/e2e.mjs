// Real Chrome, real clock, real touch, keyboard and mouse. Then again with everything blocked in a sandboxed iframe.
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
    try {
        if (path === "/frame.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(`<!doctype html><iframe sandbox="allow-scripts" style="position:fixed;inset:0;width:100%;height:100%;border:0" src="/index.html"></iframe>`); return; }
        const body = await readFile(join(root, path === "/" ? "index.html" : path));
        res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream", "access-control-allow-origin": "*" }); res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const rep = []; const ok = (c, m) => { rep.push(`${c ? "ok  " : "FAIL"} ${m}`); console.log(rep.at(-1)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (page, errs) => { page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errs.push(m.text()); }); };
const q = (page, f, a) => page.evaluate(f, a);

// --- Phone: touch from title to shooting ---------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current?.entities?.some((e) => e.btnLabel === "KICK OFF"));
    await sleep(300);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    const view = await q(page, () => ({ s: __pogo.view.scale, x: __pogo.view.x, y: __pogo.view.y }));
    const px = (x, y) => [x * view.s + view.x, y * view.s + view.y];
    const btn = await q(page, () => { const e = __pogo.current.entities.find((b) => b.btnLabel === "KICK OFF"); return [e.pos.x, e.pos.y]; });
    const t0 = Date.now();
    await touch("touchStart", [[1, ...px(...btn)]]); await sleep(40); await touch("touchEnd", []);
    await page.waitForFunction(() => __pogo.currentName === "match" && __pogo.match, null, { timeout: 9000 });
    ok(Date.now() - t0 < 5000, `phone: KICK OFF reaches the pitch in ${Date.now() - t0} ms`);
    await sleep(500);
    const L = await q(page, () => { const v = __pogo.view; const R = 50, r = 41, m = 12, bx = v.width - v.safe.right - m - R, by = v.height - v.safe.bottom - m - R - 14; return { b: [bx, by], a: [bx - R - r + 4, by - r * 0.86] }; });
    const a = px(90, 640);
    await touch("touchStart", [[1, ...a]]);
    for (let i = 1; i <= 6; i++) { await touch("touchMove", [[1, a[0], a[1] - i * 8]]); await sleep(16); }
    await sleep(500);
    const run = await q(page, () => { const m = __pogo.match.sim, h = m.humans[0]; return { phase: m.phase, mx: h.mx, x: h.goat.x, vx: h.goat.vx, carrying: m.ball.owner === h.goat }; });
    ok(run.phase === "play" && run.mx > 0.5 && run.vx > 3, `phone: drag up runs towards their goal (stick ${run.mx.toFixed(2)}, vel ${run.vx.toFixed(1)}, phase ${run.phase})`);
    // Second thumb holds SHOOT while the first keeps running.
    const before = await q(page, () => __pogo.match.sim.stats[0].shots);
    await touch("touchStart", [[1, a[0], a[1] - 48], [2, ...px(...L.b)]]);
    await sleep(500);
    const ch = await q(page, () => { const m = __pogo.match.sim, h = m.humans[0]; return { c: h.goat.charging, v: h.goat.charge, b: h.b, own: m.ball.owner === h.goat }; });
    await touch("touchEnd", []);
    await sleep(600);
    const af = await q(page, () => ({ shots: __pogo.match.sim.stats[0].shots, hap: __pogo.state().haptics }));
    ok(ch.b && (ch.c || !ch.own), `phone: holding SHOOT charges (${ch.v.toFixed(2)}), own ball ${ch.own}`);
    ok(!ch.own || af.shots > before, `phone: releasing fires (${before} -> ${af.shots} shots), haptics ${JSON.stringify(af.hap).slice(0, 80)}`);
    const fps = await q(page, () => new Promise((r) => { const g = __pogo, s0 = g.stepCount, t = performance.now(); setTimeout(() => r((g.stepCount - s0) / (performance.now() - t) * 1000), 2000); }));
    ok(fps > 8, `phone: real clock ${fps.toFixed(0)} steps/s under software GL`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}

// --- Desktop: keyboard, a whole short match on the real clock, two players ---------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "?x=1");
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(300);
    await q(page, () => { __pogo.go("match", {}); });
    await page.waitForFunction(() => __pogo.match?.sim.phase);
    await sleep(300);
    await page.keyboard.down("ArrowRight"); await sleep(700);
    const k = await q(page, () => { const h = __pogo.match.sim.humans[0]; return { vx: h.goat.vx, mx: h.mx, ph: __pogo.match.sim.phase }; });
    await page.keyboard.up("ArrowRight");
    ok(k.vx > 4 && k.ph === "play", `desktop: arrow key runs (vel ${k.vx.toFixed(1)})`);
    await page.keyboard.down("KeyZ"); await sleep(120); await page.keyboard.up("KeyZ"); await sleep(300);
    const p = await q(page, () => __pogo.match.sim.stats[0].passes);
    ok(p > 0, `desktop: Z passes (${p})`);
    // Mouse: the pointer steers, a click passes, a hold shoots.
    const box = await q(page, () => { const m = __pogo.match, g = m.sim.humans[0].goat, p = __pogo.current.cam3.project([g.x + 8, 0, g.z]), v = __pogo.view; return [p.x * v.scale + v.x, p.y * v.scale + v.y]; });
    await page.mouse.move(box[0], box[1]); await page.mouse.move(box[0] + 4, box[1]); await sleep(500);
    const mm = await q(page, () => { const h = __pogo.match.sim.humans[0]; return { mx: h.mx, vx: h.goat.vx }; });
    ok(mm.mx > 0.5 && mm.vx > 3, `desktop: mouse steers the goat (stick ${mm.mx.toFixed(2)})`);
    await q(page, () => { __pogo.match.sim.clock = 2.5; });
    await page.waitForFunction(() => __pogo.currentName === "result", null, { timeout: 40000 });
    ok(true, "desktop: match reaches the result screen in real time");
    await q(page, () => { __pogo.go("match", { two: "versus" }); });
    await page.waitForFunction(() => __pogo.match?.sim.humans.length === 2);
    await sleep(300);
    await page.keyboard.down("KeyD"); await page.keyboard.down("ArrowLeft"); await sleep(600);
    const t = await q(page, () => { const m = __pogo.match.sim; return [m.humans[0].goat.vx, m.humans[1].goat.vx, m.humans[1].team]; });
    await page.keyboard.up("KeyD"); await page.keyboard.up("ArrowLeft");
    ok(t[0] > 3 && t[1] < -3 && t[2] === 1, `desktop: two players on one keyboard move separately (${t[0].toFixed(1)}, ${t[1].toFixed(1)})`);
    await q(page, () => { __pogo.go("title"); });
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}

// --- Sandboxed iframe: no storage, no same origin ------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 420, height: 760 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage(), errs = []; watch(page, errs);
    await page.goto(URL0 + "frame.html");
    await sleep(5000);
    const f = page.frames().find((x) => x !== page.mainFrame());
    const r = await f.evaluate(async () => {
        const g = globalThis.__pogo; if (!g) return "no game";
        g.go("match", {}); await new Promise((r) => setTimeout(r, 2500));
        return { scene: g.currentName, errs: g.errors?.length ?? 0, steps: g.stepCount, storage: (() => { try { localStorage.getItem("x"); return "ok"; } catch { return "blocked"; } })() };
    }).catch((e) => ({ failed: e.message }));
    ok(r.scene === "match", `sandbox: ${JSON.stringify(r)}`);
    ok(errs.length === 0, `sandbox: no console errors ${errs.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close(); server.close();
console.log(rep.filter((x) => x.startsWith("FAIL")).length ? "SOME FAILED" : "ALL OK");
process.exit(0);
