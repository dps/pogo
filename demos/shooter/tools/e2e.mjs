// End to end, in real Chrome, on the real clock: real mouse, keyboard and multi-touch events. No stepping by hand.
// Hosts the game itself on an ephemeral port, so there is no server to start or stop.
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
        const body = await readFile(join(root, path === "/" ? "index.html" : path));
        res.writeHead(200, { "content-type": TYPES[extname(path) || ".html"] ?? "application/octet-stream" });
        res.end(body);
    } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({ headless: true, channel: "chrome", args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const report = [];
const ok = (c, m) => { report.push(`${c ? "ok  " : "FAIL"} ${m}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Desktop --------------------------------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(600);
    const g = (fn) => page.evaluate(fn);
    await page.mouse.click(500, Math.round(640 * 0.66));
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 8000 });
    ok(true, "desktop: clicking PLAY starts the game");
    await sleep(800);
    const before = await g(() => ({ paused: __pogo.current.paused, wait: __pogo.sim.lockWait, locked: __pogo.pointerLocked }));
    ok(before.paused && before.wait, `desktop: waits on click-to-play (paused=${before.paused})`);
    await page.mouse.click(500, 320);
    await sleep(500);
    const lock = await g(() => ({ locked: __pogo.pointerLocked, paused: __pogo.current.paused, shots: __pogo.sim.shots }));
    ok(lock.locked, `desktop: click captures the mouse (locked=${lock.locked})`);
    ok(!lock.paused, "desktop: game runs once captured");
    ok(lock.shots === 0, `desktop: the capturing click does not fire (shots=${lock.shots})`);
    const y0 = await g(() => __pogo.sim.yaw);
    await page.mouse.move(600, 320, { steps: 4 }); await sleep(200);
    const y1 = await g(() => __pogo.sim.yaw);
    ok(y0 !== y1, `desktop: mouse move turns the view (${y0.toFixed(3)} -> ${y1.toFixed(3)})`);
    const p0 = await g(() => __pogo.sim.player.pos.toArray());
    await page.keyboard.down("KeyW"); await sleep(700); await page.keyboard.up("KeyW");
    const p1 = await g(() => __pogo.sim.player.pos.toArray());
    ok(Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) > 1, `desktop: W walks (moved ${Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(1)})`);
    await page.mouse.down(); await sleep(500); await page.mouse.up();
    const sh = await g(() => __pogo.sim.shots);
    ok(sh > 0, `desktop: mouse button fires (shots=${sh})`);
    const stat = await g(() => __pogo.audio.log.length);
    ok(stat > 0, `desktop: sound log has ${stat} entries`);
    ok(errors.length === 0, `desktop: no page errors ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
// --- Phone --------------------------------------------------------------------------------------------
{
    const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(URL0);
    await page.waitForFunction(() => globalThis.__pogo?.current);
    await sleep(600);
    const g = (fn) => page.evaluate(fn);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await page.touchscreen.tap(422, Math.round(390 * 0.66));
    await page.waitForFunction(() => globalThis.__pogo.currentName === "play", null, { timeout: 8000 });
    ok(true, "phone: tapping PLAY starts the game");
    await sleep(900);
    const st = await g(() => ({ paused: __pogo.current.paused, tm: __pogo.input.touchMode, btn: __pogo.touch.buttons.length, stick: __pogo.touch.o.stick }));
    ok(!st.paused && st.tm, `phone: no click-to-play on touch (touchMode=${st.tm})`);
    ok(st.btn === 4 && st.stick, "phone: touch controls are back on in play");
    // Hold the stick with the left thumb and look with the right, at the same time.
    const p0 = await g(() => __pogo.sim.player.pos.toArray()), y0 = await g(() => __pogo.sim.yaw);
    const L = { x: 150, y: 300, id: 1 }, R = { x: 560, y: 150, id: 2 };
    await touch("touchStart", [L]);
    await touch("touchMove", [{ ...L, y: 240 }]);
    await touch("touchStart", [{ ...L, y: 240 }, R]);
    for (let i = 1; i <= 12; i++) { await touch("touchMove", [{ ...L, y: 240 }, { ...R, x: 560 + i * 8 }]); await sleep(50); }
    await sleep(300);
    const p1 = await g(() => __pogo.sim.player.pos.toArray()), y1 = await g(() => __pogo.sim.yaw);
    await touch("touchEnd", []);
    const moved = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
    ok(moved > 1, `phone: left stick moves while looking (moved ${moved.toFixed(1)})`);
    ok(Math.abs(y1 - y0) > 0.1, `phone: right drag looks while moving (yaw ${y0.toFixed(2)} -> ${y1.toFixed(2)})`);
    const sh0 = await g(() => __pogo.sim.shots);
    const layout = await g(() => __pogo.touch.layout().map((b) => { const v = __pogo.view; return { a: b.action, x: b.x * v.scale + v.x, y: b.y * v.scale + v.y }; }));
    const fire = layout.find((b) => b.a === "fire");
    await touch("touchStart", [{ x: fire.x, y: fire.y, id: 5 }]); await sleep(500); await touch("touchEnd", []);
    const sh1 = await g(() => __pogo.sim.shots);
    ok(sh1 > sh0, `phone: FIRE button fires (${sh0} -> ${sh1})`);
    // Autofire: put a gnome dead ahead and do nothing.
    await g(() => { const w = __pogo.sim, e = w.enemies[0], f = [-Math.sin(w.yaw), -Math.cos(w.yaw)], p = w.player.pos; w.pitch = 0; e.teleport(p.x + f[0] * 6, e.pos.y, p.z + f[1] * 6); e.awake = true; w.keepShots = w.shots; });
    await sleep(700);
    const auto = await g(() => __pogo.sim.shots - __pogo.sim.keepShots);
    ok(auto > 0, `phone: auto-fire with a gnome in the sights (${auto} shots)`);
    // Pause button
    const pb = await g(() => { const e = __pogo.current.first("pauseBtn"), v = __pogo.view; return { x: e.pos.x * v.scale + v.x, y: e.pos.y * v.scale + v.y }; });
    await page.touchscreen.tap(pb.x, pb.y); await sleep(300);
    ok(await g(() => __pogo.current.paused && !!__pogo.sim.menuOpen), "phone: pause button opens the menu");
    ok(errors.length === 0, `phone: no page errors ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
}
await browser.close();
server.close();
console.log(report.join("\n"));
process.exit(report.some((l) => l.startsWith("FAIL")) ? 1 : 0);
