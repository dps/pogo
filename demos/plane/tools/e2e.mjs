// Real Chrome, real clock, real touch and keys. Then a sandboxed iframe with storage, audio and gamepads blocked.
import { host, launch } from "./lib.mjs";
const { server, url } = await host(`<iframe sandbox="allow-scripts" style="width:400px;height:700px" src="/index.html"></iframe>`);
const browser = await launch(); const rep = []; const ok = (c, m) => { rep.push(`${c ? "ok  " : "FAIL"} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const watch = (p, e) => { p.on("pageerror", (x) => e.push(x.message)); p.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) e.push(m.text()); }); };
{
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(), errs = []; watch(p, errs);
    await p.goto(url); await p.waitForFunction(() => globalThis.__pogo?.current); await sleep(500);
    const cdp = await ctx.newCDPSession(p), touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts.map(([id, x, y]) => ({ id, x, y })) });
    const t0 = Date.now(); await touch("touchStart", [[1, 195, 420]]); await sleep(40); await touch("touchEnd", []);
    await p.waitForFunction(() => __pogo.sim.phase === "fly", null, { timeout: 15000 });
    ok(Date.now() - t0 < 5000, `phone: tap to flying in ${Date.now() - t0} ms`);
    await touch("touchStart", [[1, 195, 600]]); for (let i = 1; i <= 8; i++) { await touch("touchMove", [[1, 195 + i * 8, 600]]); await sleep(16); } await sleep(500);
    const a = await p.evaluate(() => ({ sx: __pogo.sim.sx, roll: __pogo.sim.f.roll })); ok(a.sx > 0.5 && a.roll > 0.3, `phone: drag banks right (stick ${a.sx.toFixed(2)}, roll ${a.roll.toFixed(2)})`);
    for (let i = 1; i <= 8; i++) { await touch("touchMove", [[1, 259, 600 - i * 8]]); await sleep(16); } await sleep(300);
    const b = await p.evaluate(() => __pogo.sim.sy); ok(b > 0.3, `phone: drag up lifts the nose (${b.toFixed(2)})`); await touch("touchEnd", []);
    const fps = await p.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(), f = () => { n++; performance.now() - t < 2000 ? requestAnimationFrame(f) : r(n / 2); }; requestAnimationFrame(f); }));
    const perf = await p.evaluate(() => { const g = __pogo, K = []; for (let i = 0; i < 200; i++) { const t = performance.now(); g.step(1); K.push(performance.now() - t); } K.sort((a, b) => a - b); return { med: K[100], p99: K[197], stats: g.renderer.stats, ents: g.current.entities.length }; });
    ok(perf.med < 3, `phone: step median ${perf.med.toFixed(2)} ms, p99 ${perf.p99.toFixed(2)} ms, ${perf.stats.drawCalls} draws, ${perf.stats.instances} instances, ${perf.ents} entities, software GL ${fps} fps`);
    ok(errs.length === 0, `phone: no console errors ${errs.slice(0, 3)}`); await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 640, height: 400 } }); const p = await ctx.newPage(), errs = []; watch(p, errs);
    await p.goto(url); await p.waitForFunction(() => globalThis.__pogo?.current); await sleep(400);
    await p.keyboard.press("Enter"); await p.waitForFunction(() => __pogo.sim.phase === "fly", null, { timeout: 12000 }).catch(() => {}); const ph = await p.evaluate(() => __pogo.sim.phase); ok(ph === "fly", `desktop: Enter starts flight (${ph})`);
    await p.keyboard.down("ArrowLeft"); await p.waitForFunction(() => __pogo.sim.f.roll < -0.3, null, { timeout: 12000 }).catch(() => {}); const r = await p.evaluate(() => __pogo.sim.f.roll); await p.keyboard.up("ArrowLeft"); ok(r < -0.3, `desktop: left arrow banks left (${r.toFixed(2)})`);
    await p.mouse.move(320, 250); await p.mouse.down(); await p.mouse.move(420, 250, { steps: 6 }); await p.waitForFunction(() => __pogo.sim.sx > 0.4, null, { timeout: 12000 }).catch(() => {}); const m = await p.evaluate(() => __pogo.sim.sx); await p.mouse.up(); ok(m > 0.4, `desktop: mouse drag steers (${m.toFixed(2)})`);
    ok(errs.length === 0, `desktop: no console errors ${errs.slice(0, 3)}`); await ctx.close();
}
{
    const ctx = await browser.newContext({ viewport: { width: 500, height: 800 } }); const p = await ctx.newPage(), errs = []; watch(p, errs);
    await p.goto(url + "frame.html"); await sleep(2500);
    const f = p.frames().find((x) => x !== p.mainFrame()); await f.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 8000 });
    await p.mouse.click(200, 350); await sleep(800);
    const ph = await f.evaluate(() => __pogo.sim.phase); ok(ph === "fly", `sandbox: plays with storage, audio and gamepads blocked (${ph})`);
    ok(errs.filter((e) => !/localStorage|sandbox|Autoplay|AudioContext/.test(e)).length === 0, `sandbox: no errors ${errs.slice(0, 2)}`); await ctx.close();
}
await browser.close(); server.close(); console.log(rep.join("\n")); process.exit(rep.some((l) => l.startsWith("FAIL")) ? 1 : 0);
