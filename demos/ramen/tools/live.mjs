// Real time in Chrome: touch gestures on a real page, a sandboxed iframe with storage, audio and vibration blocked, and frame time.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = new URL("..", import.meta.url).pathname, port = 43000 + (process.pid % 1500);
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const problems = [];
async function page(o) {
    const ctx = await browser.newContext({ viewport: o.vp ?? { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => problems.push(`${o.name}: pageerror ${e.message}`));
    p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`${o.name}: console ${m.text()}`); });
    return { ctx, p };
}
// 1. A real shift in real time, with the mouse, using stage layout for targets.
{
    const { ctx, p } = await page({ name: "chrome" });
    await p.goto(`http://127.0.0.1:${port}/index.html`);
    await p.waitForFunction(() => globalThis.__ramen, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const v = () => p.evaluate(() => { const g = globalThis.__pogo; return { s: g.view.scale, x: g.view.x ?? 0, y: g.view.y ?? 0 }; });
    const B = await v(), S = (q) => ({ x: q.x * B.s + B.x, y: q.y * B.s + B.y });
    const btn = await p.evaluate(() => { const e = globalThis.__pogo.current.entities.find((x) => x.buttonLabel === "Start Cooking"); const w = e.worldPos(); return { x: w.x, y: w.y }; });
    const b0 = S(btn); await p.mouse.click(b0.x, b0.y);
    await p.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 10000 });
    await p.waitForTimeout(2600);
    const L = () => p.evaluate(() => { const st = globalThis.__ramen.stage; return { pot: st.L.pots[0], broth: st.L.broths[0], bowl: st.L.bowls[0], bin: st.L.bins[0], lvl: st.k.bowls[0].level, phase: st.k.potPhase(st.k.pots[0]), comp: st.k.complete(st.k.bowls[0]), miss: st.k.missing(st.k.bowls[0]), pst: st.k.pots[0].state, pt: st.k.pots[0].t, c: !!st.k.bowls[0].c, stock: st.k.bins[0].stock }; });
    const drag = async (a, b, ms = 200) => { const A = S(a), Z = S(b); await p.mouse.move(A.x, A.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(A.x + (Z.x - A.x) * i / 8, A.y + (Z.y - A.y) * i / 8); await p.waitForTimeout(ms / 8); } };
    for (let t = 0; t < 40 && !(await L()).c; t++) await p.waitForTimeout(200);
    let l = await L();
    const pp = S(l.pot); await p.mouse.click(pp.x, pp.y);
    await p.waitForTimeout(100); console.log("instant click:", JSON.stringify((await L()).pst), JSON.stringify(pp), JSON.stringify(B), JSON.stringify(l.pot));
    if ((await L()).pst === "empty") { await p.mouse.move(pp.x, pp.y); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); await p.waitForTimeout(100); console.log("70ms tap:", (await L()).pst); }
    await drag(l.broth, { x: l.bowl.x, y: l.bowl.y + 44 }, 240);
    for (let t = 0; t < 120 && (await L()).lvl < 0.88; t++) await p.waitForTimeout(16);
    await p.mouse.up();
    const poured = (await L()).lvl;
    await drag(l.bin, { x: l.bowl.x, y: l.bowl.y + 34 }, 200); await p.mouse.up();
    for (let t = 0; t < 60 && (await L()).phase !== "perfect"; t++) await p.waitForTimeout(80);
    await drag(l.pot, { x: l.bowl.x, y: l.bowl.y + 20 }, 160); await p.mouse.up();
    await p.waitForTimeout(350);
    const ok = await L();
    await drag({ x: l.bowl.x, y: l.bowl.y + 30 }, { x: l.bowl.x, y: l.bowl.y - 30 }, 80); await p.mouse.up();
    await p.waitForTimeout(1200);
    const res = await p.evaluate(() => { const k = globalThis.__ramen.stage.k; return { served: k.served, perfects: k.perfects, cash: k.cash, errs: globalThis.__pogo.errors?.length ?? 0 }; });
    console.log("chrome mouse: poured", poured.toFixed(2), "complete", ok.comp, ok.miss, ok.pst, ok.pt, JSON.stringify(res));
    if (res.served < 1) problems.push("chrome: nothing served");
    // Frame cost, with a busy hall.
    const perf = await p.evaluate(async () => {
        const g = globalThis.__pogo, R = globalThis.__ramen; g.go("play", { shift: 30 });
        await new Promise((r) => setTimeout(r, 13000));
        const k = R.stage.k; k.bowls.forEach((b) => { if (b.c) { b.level = 1; b.brothKind = "tonkotsu"; b.noodle = { kind: "thin", q: 2 }; } });
        const t0 = performance.now(); let n = 0; for (let i = 0; i < 300; i++) { g.step(1); n++; } const stepMs = (performance.now() - t0) / n;
        const t1 = performance.now(); for (let i = 0; i < 30; i++) g.render(); const drawMs = (performance.now() - t1) / 30;
        return { stepMs: +stepMs.toFixed(3), drawMs: +drawMs.toFixed(2), stats: g.renderer.stats, seated: k.customers.length };
    });
    console.log("busy hall:", JSON.stringify(perf), "(software GL draw time)");
    await ctx.close();
}
// 2. Blocked everything: sandboxed iframe, opaque origin.
{
    const { ctx, p } = await page({ name: "sandbox", touch: true });
    await p.goto(`http://127.0.0.1:${port}/sandbox.html`);
    await p.waitForTimeout(6000);
    const f = p.frames().find((x) => x !== p.mainFrame());
    const r = await f.evaluate(async () => {
        const g = globalThis.__pogo, R = globalThis.__ramen; if (!g) return { none: true };
        const e = g.current.entities.find((x) => x.buttonLabel === "Start Cooking"); e.emit("tap");
        await new Promise((r) => setTimeout(r, 2500));
        R.save.cash = 5; R.persist();
        return { scene: g.currentName, steps: g.stepCount, storage: (() => { try { localStorage.getItem("x"); return "open"; } catch { return "blocked"; } })() };
    }).catch((e) => ({ failed: e.message }));
    console.log("sandbox:", JSON.stringify(r));
    if (r.none || r.failed || r.scene !== "play") problems.push(`sandbox: ${JSON.stringify(r)}`);
    await ctx.close();
}
// 3. Real touch on a phone-sized page.
{
    const { ctx, p } = await page({ name: "touch", touch: true });
    await p.goto(`http://127.0.0.1:${port}/index.html`);
    await p.waitForFunction(() => globalThis.__ramen, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    const pos = await p.evaluate(() => { const g = globalThis.__pogo, e = g.current.entities.find((x) => x.buttonLabel === "Start Cooking"), w = e.worldPos(); return { x: w.x * g.view.scale, y: w.y * g.view.scale }; });
    await p.touchscreen.tap(pos.x, pos.y);
    await p.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 10000 });
    console.log("touch: tap on the title opened the first shift");
    await ctx.close();
}
await browser.close(); server.close();
console.log(problems.length ? problems.slice(0, 8).join("\n") : "no console errors");
process.exit(problems.length ? 1 : 0);
