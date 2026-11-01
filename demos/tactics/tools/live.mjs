// Real time in Chrome, no ?paused: plays the first turn with real pointer events, by mouse and by touch, then inside a sandboxed iframe with storage blocked.
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const require = createRequire(new URL("../../../package.json", import.meta.url));
const { chromium } = require("playwright-core");
const root = new URL("..", import.meta.url).pathname;
const port = 43000 + (process.pid % 1500);
const mime = { ".js": "text/javascript", ".html": "text/html" };
const server = createServer((q, r) => {
    const path = q.url.split("?")[0];
    if (path === "/sandbox.html") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<!doctype html><iframe id=f style="position:fixed;inset:0;width:100%;height:100%;border:0" sandbox="allow-scripts" src="/index.html"></iframe>`); return; }
    const f = join(root, path === "/" ? "index.html" : path);
    if (!existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { "content-type": mime[extname(f)] ?? "application/octet-stream", "access-control-allow-origin": "*" }); r.end(readFileSync(f));
}).listen(port, "127.0.0.1");
const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function run(name, o = {}) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: !!o.touch, isMobile: !!o.touch });
    const page = await ctx.newPage(), problems = [];
    page.on("pageerror", (e) => problems.push(`pageerror ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) problems.push(`console ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${port}${o.sandbox ? "/sandbox.html" : "/index.html"}`);
    if (o.sandbox) {
        await page.waitForTimeout(14000);
        const f = page.frames().find((x) => x !== page.mainFrame());
        const res = await f.evaluate(async () => {
            const g = globalThis.__pogo, M = globalThis.__sg.MISSIONS;
            g.go("title"); await new Promise((r) => setTimeout(r, 800));
            g.go("battle", { mission: M[0], squad: [{ k: "sarge", up: {} }, { k: "doris", up: {} }] });
            await new Promise((r) => setTimeout(r, 1500));
            const Q = globalThis.__squad; Q.G.brief = false;
            await new Promise((r) => setTimeout(r, 500));
            Q.G.endArmed = 1; Q.pressEnd();
            await new Promise((r) => setTimeout(r, 5000));
            g.go("map"); await new Promise((r) => setTimeout(r, 600));
            g.go("roost"); await new Promise((r) => setTimeout(r, 400));
            return { round: Q.st.round, errs: g.errors?.length ?? 0, scene: g.state().scene, storage: (() => { try { localStorage.getItem("x"); return "ok"; } catch { return "blocked"; } })() };
        }).catch((e) => ({ failed: e.message }));
        console.log(name, JSON.stringify(res), problems.length ? problems.slice(0, 4) : "no errors");
        await ctx.close(); return;
    }
    await page.waitForFunction(() => globalThis.__pogo?.state?.().scene === "title", null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const toScreen = (p) => page.evaluate((p) => { const v = globalThis.__pogo.view; return { x: p.x * v.scale + v.x, y: p.y * v.scale + v.y }; }, p);
    const press = async (p) => { const q = await toScreen(p); if (o.touch) await page.touchscreen.tap(q.x, q.y); else { await page.mouse.move(q.x, q.y); await page.waitForTimeout(60); await page.mouse.down(); await page.waitForTimeout(40); await page.mouse.up(); } await page.waitForTimeout(160); };
    const ent = (n) => page.evaluate((n) => { const g = globalThis.__pogo, s = g.scene ?? g._scene ?? g.current, e = globalThis.__squad?.btn?.[n]; return e ? { x: e.pos.x, y: e.pos.y } : null; }, n);
    const tile = (x, y, h = 0.2) => page.evaluate(([x, y, h]) => { const Q = globalThis.__squad, p = Q.v.project(x - 3.5, h, y - 3.5); return { x: p.x, y: p.y }; }, [x, y, h]);
    const view = await page.evaluate(() => ({ w: globalThis.__pogo.view.width, h: globalThis.__pogo.view.height }));
    await press({ x: view.w / 2, y: view.h - 116 - (await page.evaluate(() => globalThis.__pogo.view.safe?.bottom ?? 0)) });
    await page.waitForFunction(() => globalThis.__pogo.state().scene === "battle", null, { timeout: 8000 });
    await page.waitForTimeout(700);
    await press({ x: view.w / 2, y: view.h * 0.3 });      // dismiss the briefing
    await page.waitForTimeout(600);
    const facts = async () => page.evaluate(() => { const Q = globalThis.__squad, u = Q.st.units; return { phase: Q.G.phase, sel: Q.G.sel, mode: Q.G.mode, armed: Q.G.armed, round: Q.st.round, units: u.filter((q) => q.hp > 0).map((q) => [q.k, q.x, q.y, q.hp, q.moved ? 1 : 0, q.acted ? 1 : 0].join(" ")) }; });
    const sarge = await page.evaluate(() => { const u = globalThis.__squad.st.units[0]; return [u.x, u.y]; });
    await press(await tile(sarge[0], sarge[1], 0.5));
    const s1 = await facts();
    await page.waitForTimeout(800);       // the overlay can lag the tap on a loaded machine
    const dest = await page.evaluate(() => { const Q = globalThis.__squad, u = Q.st.units[0], c = Q.st.units.find((q) => q.side === 1 && q.hp > 0); let best = null, bd = 99; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (Q.v.overlay.marks.has(y * 8 + x)) { const d = Math.abs(x - c.x) + Math.abs(y - c.y); if (d < bd) { bd = d; best = [x, y]; } } } return best; });
    await press(await tile(dest[0], dest[1]));
    await page.waitForTimeout(900);
    const s2 = await facts();
    const crow = await page.evaluate(() => { const Q = globalThis.__squad, u = Q.st.units[0]; return Q.st.units.filter((q) => q.side === 1 && q.hp > 0).map((c) => [c.x, c.y, Math.abs(c.x - u.x) + Math.abs(c.y - u.y)]).sort((a, b) => a[2] - b[2])[0]; });
    if (crow[2] === 1) { await press(await tile(crow[0], crow[1], 0.5)); if (o.touch) await press(await tile(crow[0], crow[1], 0.5)); await page.waitForTimeout(1000); }
    const s3 = await facts();
    const e = await ent("end");
    await press(e); await page.waitForTimeout(300); await press(e);
    await page.waitForTimeout(5000);
    const s4 = await facts();
    const steps = await page.evaluate(async () => { const g = globalThis.__pogo, a = g.stepCount, t = performance.now(); await new Promise((r) => setTimeout(r, 1000)); return { perSec: Math.round((g.stepCount - a) * 1000 / (performance.now() - t)) }; });
    console.log(name, "sel", s1.sel, s1.mode, "| moved", s2.units[0], s2.mode, "| act", s3.units.join(";"), "| after end round", s4.round, s4.phase, JSON.stringify(steps), problems.length ? problems.slice(0, 4) : "no errors");
    await ctx.close();
}
await run("mouse");
await run("touch", { touch: true });
await run("sandbox", { sandbox: true });
await browser.close(); server.close();
