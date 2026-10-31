#!/usr/bin/env node
// pogo check | new | serve. `check` is the main loop for agents: it runs a game headless on every device profile.
import { createServer } from "node:http";
import { cpSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);

/** Pull --name [value] out of rest, leaving positional arguments behind. */
function flag(name, fallback) {
    const i = rest.indexOf(`--${name}`);
    if (i < 0) return fallback;
    if (typeof fallback === "boolean") { rest.splice(i, 1); return true; }
    return rest.splice(i, 2)[1];
}

const USAGE = `pogo: a 2D + 3D web game framework for coding agents

  pogo new <dir>                  Create a game (pogo.js, game.js, index.html, AGENTS.md)
  pogo check <game.js> [options]  Play it headless on phone, tablet and desktop profiles
      --steps <n>    Steps per device (default 1800, 30 s of play)
      --seed <n>     Bot seed
      --scene <name> Start here instead of the title, to exercise real gameplay
      --args <json>  Arguments for that scene
      --json         Machine-readable report
  pogo shot <dir> [options]       Real browser screenshot of a game folder (needs Chrome and playwright-core)
      --device <name>   phone-small, phone, phone-landscape, tablet, desktop (default phone)
      --steps <n>       Simulated steps before the shot (default 120)
      --eval "<js>"     Run in the page first, with \`game\` defined, e.g. "game.go('play')"; repeatable with ; 
      --out <file.png>  Default shot.png
      --dpr <n>         Device pixel ratio (default min(device, 2))
      --print "<expr>"  Log the value of an expression, with \`game\` defined, after stepping
  pogo serve [dir] [--port 5173]  Static dev server
`;

async function check() {
    const steps = Number(flag("steps", 1800)), seed = Number(flag("seed", 7)), json = flag("json", false), startScene = flag("scene", null), startArgs = JSON.parse(flag("args", "{}"));
    const target = resolve(rest[0] ?? "game.js");
    const bail = (msg) => {
        if (json) console.log(JSON.stringify({ ok: false, error: msg }, null, 2));
        else console.error(`FAIL\n${msg}`);
        process.exit(1);
    };
    if (!existsSync(target)) bail(`No such file: ${target}`);
    try {
        await import(pathToFileURL(target).href);
    } catch (err) {
        bail(`Game failed while loading:\n${err.stack ?? err}`);
    }
    const game = globalThis.__pogo;
    if (!game) bail("The file never called createGame().");
    if (!game.current) bail('No scene started. Call game.start("sceneName") at the end of the file.');
    const { DEVICES } = await import(pathToFileURL(join(root, "dist/pogo.js")).href);
    const firstScene = startScene ?? game.currentName;
    const report = { ok: true, file: target, devices: {}, issues: [] };
    const seen = new Map();

    for (const [device, screen] of Object.entries(DEVICES)) {
        game.resize(screen);
        game.input.touchMode = device !== "desktop";
        game.restart(firstScene, startScene ? startArgs : undefined);
        const bot = new (game.rng.constructor)(seed);
        const scenes = new Set([firstScene]);
        let peak = 0, spent = 0, error = null, worst = 0;
        const started = process.hrtime.bigint();
        const look = () => {
            game.render();
            for (const issue of game.audit()) {
                const key = `${issue.code}|${issue.entity ?? issue.message}|${game.currentName}`;
                const hit = seen.get(key);
                if (hit) { if (!hit.devices.includes(device)) hit.devices.push(device); continue; }
                const entry = { ...issue, scene: game.currentName, devices: [device] };
                seen.set(key, entry);
                report.issues.push(entry);
            }
        };
        try {
            look();
            for (let i = 0; i < steps; i++) {
                if (i % 12 === 0) play(game, bot, device);
                const name = game.currentName, t0 = performance.now();
                game.step(1);
                worst = Math.max(worst, performance.now() - t0);
                peak = Math.max(peak, game.current.entities.length);
                if (game.currentName !== name) scenes.add(game.currentName);
                if (i % 30 === 0 || game.currentName !== name) look();
            }
        } catch (err) {
            error = err.stack ?? String(err);
            report.ok = false;
        }
        spent = Number(process.hrtime.bigint() - started) / 1e6;
        report.devices[device] = {
            view: `${Math.round(game.view.width)}x${Math.round(game.view.height)}`, scenes: [...scenes], peakEntities: peak,
            msPerStep: +(spent / steps).toFixed(3), worstStepMs: +worst.toFixed(2), error,
        };
    }
    if (report.issues.some((i) => i.severity === "error")) report.ok = false;

    if (json) console.log(JSON.stringify(report, null, 2));
    else {
        for (const [name, d] of Object.entries(report.devices)) {
            console.log(`${d.error ? "CRASH" : "ok   "} ${name.padEnd(16)} view ${d.view.padEnd(10)} scenes: ${d.scenes.join(" > ")}  peak ${d.peakEntities} entities  ${d.msPerStep} ms/step, worst ${d.worstStepMs}`);
            if (d.error) console.log(`\n${d.error}\n`);
        }
        for (const i of report.issues) {
            console.log(`${i.severity === "error" ? "ERROR" : "warn "} ${i.code} [${i.scene}] ${i.message}\n      fix: ${i.fix}\n      on: ${i.devices.join(", ")}`);
        }
        console.log(report.ok ? "\nPASS" : "\nFAIL");
    }
    process.exit(report.ok ? 0 : 1);
}

/** A monkey player: taps buttons, presses whatever the player could press, and swipes. */
function play(game, bot, device) {
    const v = game.view, input = game.input, s = game.current;
    const buttons = s.entities.filter((e) => e.alive && e.tappable && !e.hidden && e.dim === 2);
    if (buttons.length && bot.chance(0.5)) {
        const b = bot.pick(buttons), p = b.worldPos(), q = b.ui ? p : s.cam.toView(p);
        input.tap(q.x, q.y);
        return;
    }
    const names = device === "desktop" ? Object.keys(input.actions) : [...game.touch.provides];
    if (names.length && bot.chance(0.7)) input.press(bot.pick(names), bot.int(4, 30));
    const roll = bot.next();
    if (roll < 0.3) input.tap(bot.range(v.width), bot.range(v.height));
    else if (roll < 0.5) input.drag(v.width / 2, v.height / 2, v.width / 2 + bot.range(-120, 120), v.height / 2 + bot.range(-120, 120));
}

async function shot() {
    const deviceName = flag("device", "phone"), steps = Number(flag("steps", 120)), code = flag("eval", ""), out = resolve(flag("out", "shot.png")), dprFlag = flag("dpr", null), print = flag("print", null);
    const { DEVICES } = await import(pathToFileURL(join(root, "dist/pogo.js")).href);
    const d = DEVICES[deviceName];
    if (!d) { console.error(`Unknown device. Known: ${Object.keys(DEVICES).join(", ")}`); process.exit(1); }
    let chromium;
    try { ({ chromium } = await import("playwright-core")); } catch { console.error("pogo shot needs playwright-core: npm i -D playwright-core"); process.exit(1); }
    const port = 5200 + (process.pid % 700), server = serveDir(resolve(rest[0] ?? "."), port);
    const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_PATH ? undefined : "chrome", executablePath: process.env.CHROME_PATH, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    const touch = deviceName !== "desktop";
    const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: dprFlag ? Number(dprFlag) : Math.min(d.dpr, 2), isMobile: touch, hasTouch: touch });
    const page = await ctx.newPage();
    const problems = [];
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("404")) problems.push(m.text()); });
    const { top, right, bottom, left } = d.safe;
    await page.goto(`http://localhost:${port}/?paused&safe=${top},${right},${bottom},${left}`);
    let failed = null;
    try {
        await page.waitForFunction(() => globalThis.__pogo?.current, null, { timeout: 8000 });
        const printed = await page.evaluate(([src, n, expr]) => {
            const game = globalThis.__pogo;
            if (src) new Function("game", src)(game);
            game.step(n);
            game.render();
            return expr ? JSON.stringify(new Function("game", `return (${expr})`)(game)) : null;
        }, [code, steps, print]);
        if (printed !== null) console.log(printed);
    } catch (err) { failed = err.message; }
    await page.screenshot({ path: out });
    await browser.close();
    server.close();
    for (const p of problems) console.error(`page error: ${p}`);
    if (failed) console.error(failed);
    console.log(`Wrote ${out}`);
    process.exit(failed || problems.length ? 1 : 0);
}

function create(dir) {
    if (!dir) { console.error("Usage: pogo new <dir>"); process.exit(1); }
    const target = resolve(dir);
    if (existsSync(target)) { console.error(`${target} already exists.`); process.exit(1); }
    cpSync(join(root, "template"), target, { recursive: true });
    writeFileSync(join(target, "AGENTS.md"), readFileSync(join(root, "AGENTS.md")));
    console.log(`Created ${target}\n\n  pogo check ${dir}/game.js\n  pogo serve ${dir}\n`);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".css": "text/css", ".svg": "image/svg+xml", ".ts": "text/plain", ".map": "application/json" };

function serve() {
    const port = Number(flag("port", 5173)), base = resolve(rest[0] ?? ".");
    serveDir(base, port).on("listening", () => console.log(`Serving ${base} at http://localhost:${port}`));
}

function serveDir(base, port) {
    return createServer((req, res) => {
        const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
        let file = join(base, path);
        if (!file.startsWith(base)) { res.writeHead(403).end(); return; }
        if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
        if (!existsSync(file)) { res.writeHead(404).end("Not found"); return; }
        res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
        res.end(readFileSync(file));
    }).listen(port, "127.0.0.1");
}

if (cmd === "check") await check();
else if (cmd === "new") create(rest[0]);
else if (cmd === "serve") serve();
else if (cmd === "shot") await shot();
else console.log(USAGE);
