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

  pogo list [search]              Find a game to fork: pogo list racing
  pogo new <dir> [--from <game>]  Create a game, or fork one from demos/: pogo new games/mine --from kart
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
      --audit           Print layout problems using real font metrics, including text from draw hooks
  pogo art <images...> --out <file>   Turn generated images into game-ready art (needs Chrome and playwright-core)
      --out <file>      .png, .webp, or .js for a module that embeds the image, which works in sandboxed embeds
      --key <color>     Background to remove: auto (default), none, or a color like #ff00ff
      --size <WxH>      Fit each image into this box
      --anchor <where>  Where it sits in the box: center (default), bottom-right, bottom, left, ...
      --sheet <cols>    Pack several images into a sprite sheet with this many columns
      --quality <0-1>   For webp and js output. Default 0.9
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
                const key = `${issue.code}|${(issue.entity ?? issue.message).replace(/[\d,.]+/g, "#")}|${game.currentName}`;
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
    const audit = flag("audit", false), deviceName = flag("device", "phone"), steps = Number(flag("steps", 120)), code = flag("eval", ""), out = resolve(flag("out", "shot.png")), dprFlag = flag("dpr", null), print = flag("print", null);
    const { DEVICES } = await import(pathToFileURL(join(root, "dist/pogo.js")).href);
    const d = DEVICES[deviceName];
    if (!d) { console.error(`Unknown device. Known: ${Object.keys(DEVICES).join(", ")}`); process.exit(1); }
    let chromium;
    try { ({ chromium } = await import("playwright-core")); } catch { console.error("pogo shot needs playwright-core: npm i -D playwright-core"); process.exit(1); }
    // Port 0 lets the system pick, so parallel shots never collide.
    const server = serveDir(resolve(rest[0] ?? "."), 0);
    await new Promise((r) => server.once("listening", r));
    const port = server.address().port;
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
            game._recordText = true;
            game.render();
            return JSON.stringify({ value: expr ? new Function("game", `return (${expr})`)(game) : undefined, issues: game.audit() });
        }, [code, steps, print]);
        const result = JSON.parse(printed);
        if (print) console.log(JSON.stringify(result.value));
        if (audit) for (const i of result.issues) console.log(`${i.severity} ${i.code}: ${i.message}`);
    } catch (err) { failed = err.message; }
    await page.screenshot({ path: out });
    await browser.close();
    server.close();
    for (const p of problems) console.error(`page error: ${p}`);
    if (failed) console.error(failed);
    console.log(`Wrote ${out}`);
    process.exit(failed || problems.length ? 1 : 0);
}

/** Runs in Chrome. Removes a flat background by un-mixing it from edge pixels, so nothing keeps a colored fringe. */
function artInPage({ images, key, size, anchor, cols, type, quality }) {
    const load = (src) => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(new Error("An input isn't a readable image.")); i.src = src; });
    const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    const parse = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const border = (d, w, h) => {
        const s = [[], [], []], at = (x, y) => { const o = (y * w + x) * 4; for (let k = 0; k < 3; k++) s[k].push(d[o + k]); };
        for (let x = 0; x < w; x += 4) { at(x, 0); at(x, h - 1); }
        for (let y = 0; y < h; y += 4) { at(0, y); at(w - 1, y); }
        const mid = s.map((v) => v.sort((a, b) => a - b)[v.length >> 1]);
        const spread = Math.max(...s.map((v) => v[Math.floor(v.length * 0.7)] - v[Math.floor(v.length * 0.3)])); // the subject may touch an edge
        return { mid, spread };
    };
    const cut = (img) => {
        const c = canvas(img.naturalWidth, img.naturalHeight), x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
        let warn = "";
        if (key !== "none") {
            const auto = border(d, c.width, c.height), bg = key === "auto" ? auto.mid : parse(key);
            if (key === "auto" && auto.spread > 40) warn = "the background isn't flat, so the cut-out may be rough";
            // Generators shade "flat" backgrounds, so match by hue as well as distance, then keep only what connects to the edge.
            const hsv = (r, g, b) => {
                const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
                const h = !dl ? 0 : mx === r ? ((g - b) / dl + 6) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
                return [h * 60, mx ? dl / mx : 0];
            };
            const smooth = (v, lo, hi) => { const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
            const [bgHue, bgSat] = hsv(...bg), w = c.width, h = c.height, like = new Float32Array(w * h), exact = new Float32Array(w * h);
            const lack = bg.indexOf(Math.min(...bg));
            for (let i = 0, o = 0; i < like.length; i++, o += 4) {
                const near = 1 - smooth(Math.hypot(d[o] - bg[0], d[o + 1] - bg[1], d[o + 2] - bg[2]), 58, 120);
                const [hue, sat] = hsv(d[o], d[o + 1], d[o + 2]), turn = Math.abs(((hue - bgHue + 540) % 360) - 180);
                const tinted = bgSat > 0.4 ? (1 - smooth(turn, 14, 30)) * smooth(sat, 0.22, 0.4) : 0;
                like[i] = Math.max(near, tinted);
                exact[i] = near;
            }
            const out = new Uint8Array(w * h), stack = [];
            const push = (i) => { if (!out[i] && like[i] > 0.02) { out[i] = 1; stack.push(i); } };
            for (let i = 0; i < w; i++) { push(i); push((h - 1) * w + i); }
            for (let i = 0; i < h; i++) { push(i * w); push(i * w + w - 1); }
            while (stack.length) { const i = stack.pop(), px = i % w; if (px > 0) push(i - 1); if (px < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < w * (h - 1)) push(i + w); }
            for (let i = 0, o = 0; i < like.length; i++, o += 4) {
                // Pockets inside the shape, like gaps in lace, go only on a true color match: dark subjects often share the hue.
                const gone = out[i] ? like[i] : exact[i] > 0.5 ? exact[i] : 0;
                if (!gone) continue;
                // Pull the background's tint towards the channel it lacks. Subtracting it outright inverts colors on near matches.
                const a = 1 - gone, low = d[o + lack];
                for (let k = 0; k < 3; k++) if (k !== lack && d[o + k] > low) d[o + k] -= gone * (d[o + k] - low);
                d[o + 3] = d[o + 3] * a;
            }
            // Drop specks that aren't attached to the subject.
            const seen = new Int32Array(w * h), sizes = [0];
            for (let i = 0; i < seen.length; i++) {
                if (seen[i] || d[i * 4 + 3] < 128) continue;
                const id = sizes.length, todo = [i];
                let n = 0;
                seen[i] = id;
                while (todo.length) {
                    const j = todo.pop(), px = j % w;
                    n++;
                    for (const q of [px > 0 ? j - 1 : -1, px < w - 1 ? j + 1 : -1, j >= w ? j - w : -1, j < w * (h - 1) ? j + w : -1]) if (q >= 0 && !seen[q] && d[q * 4 + 3] >= 128) { seen[q] = id; todo.push(q); }
                }
                sizes.push(n);
            }
            const biggest = Math.max(...sizes);
            for (let i = 0; i < seen.length; i++) if (seen[i] && sizes[seen[i]] < biggest * 0.01) d[i * 4 + 3] = 0;
            x.putImageData(im, 0, 0);
        }
        let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
        for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 12) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
        if (x1 < 0) throw new Error("Nothing was left after removing the background. Try --key none.");
        return { c, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, warn };
    };
    return Promise.all(images.map(load)).then((all) => {
        const parts = all.map(cut), boxW = size?.[0] ?? Math.max(...parts.map((p) => p.w)), boxH = size?.[1] ?? Math.max(...parts.map((p) => p.h));
        const n = cols || 1, rows = Math.ceil(parts.length / n), out = canvas(boxW * n, boxH * rows), o = out.getContext("2d");
        o.imageSmoothingQuality = "high";
        parts.forEach((p, i) => {
            const k = Math.min(boxW / p.w, boxH / p.h), w = p.w * k, h = p.h * k;
            const fx = /left/.test(anchor) ? 0 : /right/.test(anchor) ? 1 : 0.5, fy = /top/.test(anchor) ? 0 : /bottom/.test(anchor) ? 1 : 0.5;
            o.drawImage(p.c, p.x0, p.y0, p.w, p.h, (i % n) * boxW + (boxW - w) * fx, Math.floor(i / n) * boxH + (boxH - h) * fy, w, h);
        });
        return { url: out.toDataURL(type, quality), width: out.width, height: out.height, warnings: parts.map((p) => p.warn).filter(Boolean) };
    });
}

async function art() {
    const out = flag("out", ""), key = flag("key", "auto"), sizeText = flag("size", ""), anchor = flag("anchor", "center"), cols = Number(flag("sheet", 0)), quality = Number(flag("quality", 0.9));
    if (!rest.length || !out) { console.error("Usage: pogo art <images...> --out <file.png|file.webp|file.js>"); process.exit(1); }
    const mime = (b) => (b[0] === 0xff ? "image/jpeg" : b[0] === 0x89 ? "image/png" : b[8] === 0x57 ? "image/webp" : "image/png");
    const images = rest.map((f) => { const b = readFileSync(resolve(f)); return `data:${mime(b)};base64,${b.toString("base64")}`; });
    const type = extname(out) === ".png" ? "image/png" : "image/webp";
    let chromium;
    try { ({ chromium } = await import("playwright-core")); } catch { console.error("pogo art needs playwright-core: npm i -D playwright-core"); process.exit(1); }
    const browser = await chromium.launch({ headless: true, channel: process.env.CHROME_PATH ? undefined : "chrome", executablePath: process.env.CHROME_PATH });
    try {
        const page = await browser.newPage();
        const r = await page.evaluate(artInPage, { images, key, size: sizeText ? sizeText.split("x").map(Number) : null, anchor, cols, type, quality });
        const bytes = Buffer.from(r.url.split(",")[1], "base64");
        if (extname(out) === ".js") writeFileSync(resolve(out), `// Made by pogo art. Pass this to assets.image, so the art travels inside the code.\nexport default ${JSON.stringify(r.url)};\n`);
        else writeFileSync(resolve(out), bytes);
        for (const w of r.warnings) console.error(`warning: ${w}`);
        console.log(`Wrote ${out}: ${r.width}x${r.height}, ${Math.round(statSync(resolve(out)).size / 1024)} KB`);
    } finally { await browser.close(); }
}

function catalog() { return JSON.parse(readFileSync(join(root, "demos/catalog.json"), "utf8")).filter((g) => existsSync(join(root, "demos", g.folder, "game.js"))); }

function list(words) {
    const hit = (g) => words.every((w) => `${g.folder} ${g.title} ${g.mapsTo} ${g.view} ${g.tags.join(" ")}`.toLowerCase().includes(w.toLowerCase()));
    const games = catalog().filter(hit);
    if (!games.length) { console.log(`Nothing matches. Run pogo list for all ${catalog().length} games.`); return; }
    const wide = Math.max(...games.map((g) => g.folder.length));
    for (const g of games) console.log(`${g.folder.padEnd(wide)}  ${g.view}  ${g.title}: ${g.mapsTo}`);
    console.log(`\nFork one with: pogo new games/mygame --from ${games[0].folder}\nHow to change each one: AGENTS.md`);
}

function create(dir) {
    const from = flag("from", "");
    if (!dir) { console.error("Usage: pogo new <dir> [--from <game>]"); process.exit(1); }
    const target = resolve(dir);
    if (existsSync(target)) { console.error(`${target} already exists.`); process.exit(1); }
    if (from && !catalog().some((g) => g.folder === from)) { console.error(`No game called "${from}". Run pogo list to see them.`); process.exit(1); }
    const source = from ? join(root, "demos", from) : join(root, "template");
    cpSync(source, target, { recursive: true, filter: (p) => !p.startsWith(join(source, "shots")) });
    for (const f of ["pogo.js", "pogo.d.ts"]) writeFileSync(join(target, f), readFileSync(join(root, "dist", f)));
    writeFileSync(join(target, "AGENTS.md"), readFileSync(join(root, "docs/API.md")));
    console.log(`Created ${target}${from ? ` from ${from}` : ""}\n\n  pogo check ${dir}/game.js\n  pogo serve ${dir}\n`);
    if (from) console.log(`Next: the "After forking" checklist and the notes for ${from} in AGENTS.md at the repo root.\nChange the save keys first, or this game will overwrite the original's saves.\n`);
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
else if (cmd === "new") { const dir = rest.find((a, i) => !a.startsWith("--") && rest[i - 1] !== "--from"); create(dir); }
else if (cmd === "list") list(rest);
else if (cmd === "art") await art();
else if (cmd === "serve") serve();
else if (cmd === "shot") await shot();
else console.log(USAGE);
