// Real-time run in Chrome: first touch, tutorial with real drags, a brew, then a sandboxed-iframe boot.
import { createServer } from "node:http"; import { readFile } from "node:fs/promises"; import { extname, join, resolve } from "node:path"; import { createRequire } from "node:module";
const require = createRequire(new URL("../../../package.json", import.meta.url)); const { chromium } = require("playwright-core");
const root = resolve(new URL("..", import.meta.url).pathname), MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png" };
const srv = createServer(async (q, r) => { try { const p = join(root, decodeURIComponent(q.url.split("?")[0])); const f = p.endsWith("/") ? p + "index.html" : p; const b = await readFile(f); r.writeHead(200, { "content-type": MIME[extname(f)] ?? "text/plain", "access-control-allow-origin": "*" }); r.end(b); } catch { r.writeHead(404); r.end(); } });
await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port;
const b = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const errors = [];
const watch = (pg, tag) => { pg.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`)); pg.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) errors.push(`${tag}: ${m.text()}`); }); };
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
const pg = await ctx.newPage(); watch(pg, "main");
await pg.goto(`http://localhost:${port}/?seed=12`);
await pg.waitForFunction(() => globalThis.__hex?.game?.current, null, { timeout: 15000 });
const t0 = Date.now();
const view = () => pg.evaluate(() => { const g = __hex.game; return { name: g.currentName, k: g.view.scale, x: g.view.x, y: g.view.y }; });
const toPage = async (x, y) => { const v = await view(); return [x * v.k + v.x, y * v.k + v.y]; };
const click = async (x, y) => { const [a, c] = await toPage(x, y); await pg.mouse.click(a, c); };
const btn = (t) => pg.evaluate((t) => { const e = __hex.game.current.entities.find((q) => q.alive && !q.hidden && q.txt === t); return e ? [e.pos.x, e.pos.y] : null; }, t);
await pg.waitForTimeout(500);
const first = await btn("BREW!"); await click(...first);
await pg.waitForFunction(() => __hex.game.currentName === "combat", null, { timeout: 8000 });
console.log("first touch to fight ms", Date.now() - t0);
await pg.waitForTimeout(900);
const handXY = (id) => pg.evaluate((id) => { const V = __hex.game.data.combat.V, i = V.hand.findIndex((k) => k.id === id), c = V.cards.get(V.hand[i].u); return [c.x, c.y]; }, id);
const fling = async (id) => {
    const [x, y] = await handXY(id), [a, c] = await toPage(x, y), [a2, c2] = await toPage(200, 420);
    await pg.mouse.move(a, c); await pg.mouse.down(); await pg.waitForTimeout(80);
    for (let i = 1; i <= 10; i++) { await pg.mouse.move(a + (a2 - a) * i / 10, c + (c2 - c) * i / 10); await pg.waitForTimeout(16); }
    await pg.mouse.up(); await pg.waitForTimeout(600);
};
await fling("spark"); await fling("droplet"); await fling("spark");
console.log("brew tokens", await pg.evaluate(() => __hex.G.run.combat.brew.map((k) => k.id).join(",")), await pg.evaluate(() => JSON.stringify(__hex.game.state().haptics?.slice(-8))));
const br = await btn("BREW"); await click(...br);
await pg.waitForTimeout(1000);
await pg.waitForFunction(() => __hex.game.currentName === "reward", null, { timeout: 25000 }).catch(() => console.log("no reward yet"));
await pg.waitForTimeout(1000);
const hold = await pg.evaluate(() => __hex.game.currentName); console.log("after tutorial:", hold, "saved:", await pg.evaluate(() => { try { return !!JSON.parse(localStorage.getItem("pogo:hexcards-run"))?.seed; } catch { return "err"; } }));
const perf = await pg.evaluate(() => new Promise((ok) => { const g = __hex.game, t = []; for (let i = 0; i < 120; i++) { const a = performance.now(); g.step(1); t.push(performance.now() - a); } t.sort((x, y) => x - y); ok({ median: t[60], p99: t[118] }); }));
console.log("step ms", perf);
// Start a real fight, place a card, save, reload, and carry on from the same pot.
await pg.evaluate(() => { const { G, S, game } = __hex; G.meta.tutorial = true; G.startRun("vesper", 0, 77); });
await pg.waitForFunction(() => __hex.game.currentName === "map"); await pg.waitForTimeout(500);
await pg.evaluate(() => { const { G, S } = __hex, r = G.run; S.chooseNode(r, S.reachable(r)[0]); __hex.game.go("combat"); });
await pg.waitForFunction(() => __hex.game.currentName === "combat"); await pg.waitForTimeout(1100);
// Hold a card to zoom it, then tap a keyword chip.
const [hx, hy] = await pg.evaluate(() => { const V = __hex.game.data.combat.V, c = V.cards.get(V.hand[1].u); return [c.x, c.y]; });
const [ha, hc] = await toPage(hx, hy);
await pg.mouse.move(ha, hc); await pg.mouse.down(); await pg.waitForTimeout(520); await pg.mouse.up(); await pg.waitForTimeout(300);
console.log("zoom overlay:", await pg.evaluate(() => __hex.G.overlay?.kind));
await pg.evaluate(() => { __hex.G.overlay = { kind: "zoom", card: { id: "ouroboros", up: 0 }, t: 1, tip: null }; }); await pg.waitForTimeout(120);
const chip = await pg.evaluate(() => __hex.G.overlay.chips?.[0]);
await click(chip.x, chip.y); await pg.waitForTimeout(200);
console.log("keyword tip:", await pg.evaluate(() => __hex.G.overlay?.tip));
await pg.mouse.click(30, 300); await pg.waitForTimeout(300);
await pg.keyboard.press("Digit1"); await pg.waitForTimeout(500);
const before = await pg.evaluate(() => JSON.stringify(__hex.G.run.combat.brew.map((k) => k.id)));
await pg.evaluate(() => { const r = __hex.G.run; __hex.game.save("hexcards-run", r); });
await pg.reload(); await pg.waitForFunction(() => __hex?.game?.current, null, { timeout: 15000 }); await pg.waitForTimeout(600);
const cont = await btn("Continue"); console.log("continue button:", !!cont);
await click(...cont); await pg.waitForFunction(() => __hex.game.currentName === "combat", null, { timeout: 5000 }); await pg.waitForTimeout(500);
console.log("pot before/after reload:", before, await pg.evaluate(() => JSON.stringify(__hex.G.run.combat.brew.map((k) => k.id))));
const art = await pg.evaluate(async () => { const m = await import("./art/index.js"), { CARDS } = await import("./data/cards.js"); const t0 = performance.now(); let n = 0; for (const id in CARDS) { m.cardArt(id); n++; } return { n, msEach: (performance.now() - t0) / n }; });
console.log("art", art, "stats", await pg.evaluate(() => __hex.game.renderer.stats));
// Sandboxed iframe with no storage access, no gamepad policy, no audio.
const p2 = await ctx.newPage(); watch(p2, "sandbox");
await p2.setContent(`<iframe id=f sandbox="allow-scripts" allow="" style="width:390px;height:700px" src="http://localhost:${port}/index.html?seed=3"></iframe>`);
await p2.waitForTimeout(3000);
console.log("errors:", errors.length ? errors : "none");
await b.close(); srv.close();
