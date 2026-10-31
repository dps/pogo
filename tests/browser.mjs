// Real-browser verification in Chrome: WebGL output, phone emulation, multi-touch, rotation, safe areas and context loss.
// Uses the system Chrome (or CHROME_PATH). Screenshots go to SHOTS_DIR, default tests/.shots.
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const ROOT = resolve(import.meta.dirname, ".."), SHOTS = process.env.SHOTS_DIR ?? join(ROOT, "tests/.shots"), PORT = 5191;
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
    results.push({ name, ok });
    console.log(`${ok ? "pass" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const server = spawn(process.execPath, ["bin/pogo.js", "serve", ".", "--port", String(PORT)], { cwd: ROOT, stdio: "pipe" });
await new Promise((r) => server.stdout.once("data", r));

const browser = await chromium.launch({
    headless: true, channel: process.env.CHROME_PATH ? undefined : "chrome", executablePath: process.env.CHROME_PATH,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const url = (game, q = "") => `http://localhost:${PORT}/examples/play.html?game=${game}${q}`;

async function open(ctx, game, q) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto(url(game, q));
    await page.waitForFunction(() => globalThis.__pogo?.current);
    return { page, errors };
}
const state = (page) => page.evaluate(() => { const s = __pogo.state(); return { ...s, entities: undefined }; });
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const settle = (page, ms = 400) => page.waitForTimeout(ms);
const centerOf = (page, name) => page.evaluate((n) => { const g = __pogo, e = g.current.first(n), v = g.view; return { x: e.pos.x * v.scale + v.x, y: e.pos.y * v.scale + v.y }; }, name);

// How much of the frame isn't one flat color: a blank canvas scores 0.
const contentScore = (page) => page.evaluate(() => {
    const g = __pogo, url = g.screenshot();
    return new Promise((res) => {
        const img = new Image();
        img.onload = () => {
            const c = document.createElement("canvas");
            c.width = 64; c.height = 64;
            const x = c.getContext("2d");
            x.drawImage(img, 0, 0, 64, 64);
            const d = x.getImageData(0, 0, 64, 64).data, seen = new Set();
            for (let i = 0; i < d.length; i += 4) seen.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
            res(seen.size);
        };
        img.src = url;
    });
});

async function touch(page, cdp, type, points) {
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i })) });
}

try {
    // --- 2D on a phone ---------------------------------------------------------------
    {
        const ctx = await browser.newContext(PHONE);
        const { page, errors } = await open(ctx, "hopper", "&safe=47,0,34,0");
        check("hopper: real WebGL2 renderer", await page.evaluate(() => __pogo.renderer.kind) === "gl");
        check("hopper: touch device detected", await page.evaluate(() => __pogo.input.touchMode));
        await settle(page);
        await shot(page, "hopper-title-phone");
        check("hopper: title renders", (await contentScore(page)) > 3);

        const play = await page.evaluate(() => { const b = __pogo.current.entities.find((e) => e.tappable), v = __pogo.view; return { x: b.pos.x * v.scale + v.x, y: b.pos.y * v.scale + v.y }; });
        await page.touchscreen.tap(play.x, play.y);
        await page.waitForFunction(() => __pogo.currentName === "play");
        await settle(page, 700);
        check("hopper: tapping Play starts the game", true);

        const cdp = await ctx.newCDPSession(page);
        const heroX = () => page.evaluate(() => __pogo.current.first("hero")?.pos.x ?? null);
        const before = await heroX();
        const jump = await page.evaluate(() => { const b = __pogo.touch.layout()[0], v = __pogo.view; return { x: b.x * v.scale, y: b.y * v.scale }; });
        const stick = { x: 80, y: 700, id: 1 };
        await touch(page, cdp, "touchStart", [stick]);
        await touch(page, cdp, "touchMove", [{ ...stick, x: 140 }]);
        await page.waitForFunction((b) => __pogo.current.first("hero").pos.x > b + 12, before, { timeout: 3000 });
        const moved = await heroX();
        const midAir = page.waitForFunction(() => __pogo.current.first("hero")?.vel.y < -100, null, { timeout: 2500 });
        await touch(page, cdp, "touchStart", [{ ...stick, x: 140 }, { ...jump, id: 2 }]);
        const jumped = await midAir.then(() => true, () => false);
        await shot(page, "hopper-play-phone");
        await touch(page, cdp, "touchEnd", []);
        check("hopper: stick moves the hero", moved !== null && moved > before + 10, `${before.toFixed(0)} -> ${moved?.toFixed(0)}`);
        check("hopper: jump works while the stick is held (multi-touch)", jumped);

        const hud = await page.evaluate(() => { const g = __pogo; return { y: g.current.first("coins").pos.y, top: g.view.safe.top, s: g.view.scale }; });
        check("hopper: HUD clears the emulated notch", hud.y * hud.s > 47, `HUD at ${(hud.y * hud.s).toFixed(0)} CSS px`);

        await page.setViewportSize({ width: 844, height: 390 });
        await settle(page);
        await shot(page, "hopper-play-landscape");
        const rotated = await page.evaluate(() => ({ o: __pogo.view.orientation, h: __pogo.view.height, x: __pogo.current.first("pause").pos.x, w: __pogo.view.width }));
        check("hopper: rotation re-flows the layout", rotated.o === "landscape" && rotated.h === 360 && rotated.x > rotated.w - 60, JSON.stringify(rotated));

        const canvas = await page.evaluate(() => { const c = document.querySelector("canvas"); return { w: c.width, css: c.getBoundingClientRect().width }; });
        check("hopper: device pixels capped at 2x on a 3x phone", canvas.w === canvas.css * 2, JSON.stringify(canvas));

        const lost = await page.evaluate(async () => {
            const gl = document.querySelector("canvas").getContext("webgl2"), ext = gl.getExtension("WEBGL_lose_context");
            ext.loseContext();
            await new Promise((r) => setTimeout(r, 200));
            ext.restoreContext();
            await new Promise((r) => setTimeout(r, 500));
            return { lost: __pogo.renderer.lost, contextLost: gl.isContextLost(), errors: gl.getError() };
        });
        const score = await contentScore(page);
        check("hopper: survives GPU context loss", !lost.lost && !lost.contextLost && score > 3, `${JSON.stringify(lost)} score ${score}`);
        await shot(page, "hopper-after-context-loss");
        const glClean = await page.evaluate(() => {
            const gl = document.querySelector("canvas").getContext("webgl2");
            while (gl.getError()); // whatever the lost context left behind
            __pogo.render();
            return gl.getError();
        });
        check("hopper: 2D frames raise no GL errors after restore", glClean === 0, `error ${glClean}`);
        check("hopper: no page errors", errors.length === 0, errors.join(" | "));
        await ctx.close();
    }

    // --- 3D on a phone and desktop -------------------------------------------------------
    {
        const ctx = await browser.newContext(PHONE);
        const { page, errors } = await open(ctx, "laneblast");
        await settle(page, 600);
        await shot(page, "laneblast-title-phone");
        const btn = await page.evaluate(() => { const b = __pogo.current.entities.find((e) => e.tappable), v = __pogo.view; return { x: b.pos.x * v.scale, y: b.pos.y * v.scale }; });
        await page.touchscreen.tap(btn.x, btn.y);
        await page.waitForFunction(() => __pogo.currentName === "run");
        await settle(page, 1500);
        await shot(page, "laneblast-run-phone");
        const stats = await page.evaluate(() => { const g = __pogo; g.render(); return { ...g.renderer.stats, entities: g.current.entities.length }; });
        const gl3d = await page.evaluate(() => {
            const gl = document.querySelector("canvas").getContext("webgl2");
            while (gl.getError());
            __pogo.render();
            return gl.getError();
        });
        check("laneblast: 3D frames raise no GL errors", gl3d === 0, `error ${gl3d}`);
        check("laneblast: instancing collapses draw calls", stats.instances > stats.drawCalls, JSON.stringify(stats));
        check("laneblast: run renders", (await contentScore(page)) > 8);
        const before = await page.evaluate(() => __pogo.current.first("ship").lane);
        const cdp = await ctx.newCDPSession(page);
        await touch(page, cdp, "touchStart", [{ x: 150, y: 500 }]);
        await touch(page, cdp, "touchMove", [{ x: 290, y: 500 }]);
        await touch(page, cdp, "touchEnd", []);
        await page.waitForFunction((b) => { const s = __pogo.current.first("ship"); return !s || s.lane !== b || __pogo.currentName !== "run"; }, before, { timeout: 2000 }).catch(() => {});
        const lane = await page.evaluate(() => __pogo.current.first("ship")?.lane);
        check("laneblast: swipe changes lane", lane === before + 1 || lane === undefined, `${before} -> ${lane}`);
        check("laneblast: no page errors", errors.length === 0, errors.join(" | "));
        await ctx.close();

        const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const d = await open(desk, "laneblast");
        await d.page.keyboard.press("Enter");
        await d.page.waitForFunction(() => __pogo.currentName === "run");
        await settle(d.page, 1500);
        await d.page.keyboard.press("ArrowLeft");
        await shot(d.page, "laneblast-run-desktop");
        const pad = await d.page.evaluate(() => __pogo.input.touchMode);
        check("laneblast: desktop keyboard play, no touch controls", !pad && (await d.page.evaluate(() => __pogo.currentName)) === "run");
        check("laneblast: desktop no page errors", d.errors.length === 0, d.errors.join(" | "));
        await desk.close();
    }

    // --- Headless and browser simulations agree ---------------------------------------------
    {
        // UI positions depend on font metrics, which only a browser has, so compare the world alone.
        const script = () => {
            const g = __pogo;
            g.restart("play");
            const out = [];
            for (let i = 0; i < 400; i++) {
                if (i % 40 === 0) g.input.press("right", 25);
                if (i % 70 === 20) g.input.press("jump", 6);
                g.step(1);
                out.push(g.current.entities.filter((e) => !e.ui).reduce((sum, e) => sum + e.pos.x * 3 + e.pos.y, g.currentName.length));
            }
            return out;
        };
        const ctx = await browser.newContext(PHONE);
        const { page } = await open(ctx, "hopper", "&paused");
        const inBrowser = await page.evaluate(script);
        await import(join(ROOT, "examples/hopper.js"));
        globalThis.__pogo.resize("phone");
        const inNode = (0, eval)(`(${script})`)();
        const same = inBrowser.length === 400 && JSON.stringify(inBrowser) === JSON.stringify(inNode);
        check("simulation: headless Node matches Chrome exactly over 400 steps", same, `checksum ${inBrowser.at(-1)} / ${inNode.at(-1)}`);
        await ctx.close();
    }

    // --- Error visibility ---------------------------------------------------------------------
    {
        const ctx = await browser.newContext(PHONE);
        const { page } = await open(ctx, "hopper");
        await page.evaluate(() => __pogo.current.add([{ draw() { throw new Error("boom in draw"); } }]));
        await page.waitForSelector("pre");
        const msg = await page.textContent("pre");
        check("errors appear on screen in the web view", msg.includes("boom in draw"));
        await ctx.close();
    }
} catch (err) {
    check(`unexpected: ${err.message}`, false);
} finally {
    await browser.close();
    server.kill();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(SHOTS, "results.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots in ${SHOTS}`);
process.exit(failed.length ? 1 : 0);
