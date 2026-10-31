// BAARK! Biscuit the border collie's big round-up. A voxel sheepdog game for phones.
import { clamp, color, createGame, dim, lerp, mesh, pin, pos, rect, sprite, text, ui } from "./pogo.js";
import { buildModels } from "./models.js";
import { paintAssets } from "./paint.js";
import { LEVELS, TITLE_LEVEL } from "./levels.js";
import { World, ringGeometry, ROAM } from "./world.js";
import { Bot } from "./bot.js";
import { SONGS, bell, star as starSfx, tick } from "./audio.js";

const FONT = "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";
const INK = "#2b2a3a", CREAM = "#fff4dc", GREEN = "#58a846", GOLD = "#f6a623", WOOD = "#8a5a30", RED = "#d9534a";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#79c8ee", "#fdf1cc"],
    letterbox: "#79c8ee",
    touch: { stick: true, buttons: [{ action: "bark", label: " " }] },
    actions: { bark: ["Space", "KeyX", "KeyJ", "pad:a"] },
    seed: 1, maxDpr: 2,
});

buildModels(game);
game.assets.mesh("ring", ringGeometry());
paintAssets(game);

// --- Save data ---------------------------------------------------------------------------------------------------
const SAVE = "baark-v1";
let save = game.load(SAVE, { stars: [], best: [], muted: false });
const persist = () => game.save(SAVE, save);
const syncData = (extra = {}) => {
    Object.assign(game.data, {
        game: "BAARK!", stars: LEVELS.map((_, i) => save.stars[i] ?? 0), best: LEVELS.map((_, i) => save.best[i] ?? null),
        totalStars: save.stars.reduce((a, b) => a + (b ?? 0), 0), unlocked: LEVELS.filter((_, i) => isOpen(i)).length,
    }, extra);
};
const isOpen = (i) => i === 0 || (save.stars[i - 1] ?? 0) > 0;
game.audio.muted = !!save.muted;
let currentSong = null;
const playSong = (name) => { if (currentSong !== name) { currentSong = name; game.music(SONGS[name]); } };

// The on-screen stick and BARK button belong to the play scene; pogo draws them in every scene otherwise.
const CTRL = { stick: true, buttons: [...game.touch.buttons] };
const touchOn = (on) => { game.touch.o.stick = on; game.touch.buttons = on ? CTRL.buttons : []; game.touch.reset(); };

// --- UI bits -------------------------------------------------------------------------------------------------------
/** A chunky button: like pogo's button(), but with our font, an optional icon and a press squash. */
function chunky(label, o = {}) {
    const w = o.w ?? 160, h = o.h ?? 52, fill = color(o.color ?? GREEN), ink = o.ink ?? "#ffffff", size = o.size ?? 20;
    return {
        id: "chunky", buttonLabel: label,
        setup(e) { e.size.set(w, h, 0); e.tappable = { pad: 0 }; if (o.onTap) e.on("tap", o.onTap); },
        add(e) { if (e.parent?.ui) e.ui = true; },
        update(dt, e) {
            const goal = e._pressed ? 0.93 : 1;
            e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24); e.scale.y = e.scale.x;
            // Skip the step we were born in: the key press that opened a menu must not also press its button.
            if (e.armed && o.action && !e.hidden && e.scene.game.input._quiet(o.action)) e.emit("tap");
            e.armed = true;
        },
        draw(d, e) {
            if (o.ghost) return;
            d.rect(w + 5, h + 5, { y: 3, color: INK, radius: 16 });
            d.rect(w, h, { y: 4, color: fill.lerp("#000000", 0.32), radius: 14 });
            d.rect(w, h - 2, { y: 0, color: e._pressed ? fill.lerp("#000000", 0.14) : fill, radius: 14 });
            d.rect(w - 16, (h - 8) * 0.42, { y: -h * 0.22, color: "#ffffff22", radius: 10 });
            if (o.icon) d.sprite(o.icon, { x: -w / 2 + 24, width: 28, height: 28, frame: o.frame ?? 0 });
            d.text(label, { size, bold: true, color: ink, font: FONT, x: o.icon ? 12 : 0 });
        },
    };
}
const label = (str, size, col = CREAM, o = {}) => text(str, { size, bold: true, color: col, font: FONT, ...o });

// --- Title ---------------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    touchOn(false);
    syncData({ screen: "title" });
    const world = new World(game, s, TITLE_LEVEL, "title", { attract: true, intro: 0 });
    const bot = new Bot(world, { seed: 3, gentle: true });
    world.titleCam = [10, 7.5, 33];
    world.camD = 33;
    world.focus.x = 10; world.focus.z = 7.5;
    s.onUpdate((dt) => { const c = bot.think(); world.step(dt, c.x * 0.7, c.z * 0.7, false); });
    s.onDrawUI((d) => {
        const v = s.view, t = s.time, tall = v.height >= v.width;
        d.sprite("vignette", { x: v.width / 2, y: v.height / 2, width: v.width * 1.04, height: v.height * 1.04, opacity: 0.4 });
        world.drawPops(d);
        const w = Math.min(v.width - 24, tall ? 350 : 270), h = w / 3, y = v.safe.top + (tall ? 54 : 6) + h / 2 + Math.sin(t * 1.6) * 3;
        d.sprite("logo", { x: v.width / 2, y, width: w, height: h });
        const sy = y + h / 2 + 8;
        d.text("Biscuit's Big Round-Up", { x: v.width / 2 + 1, y: sy + 2, size: tall ? 18 : 14, bold: true, color: "#2b2a3a", font: FONT });
        d.text("Biscuit's Big Round-Up", { x: v.width / 2, y: sy, size: tall ? 18 : 14, bold: true, color: "#ffffff", font: FONT });
    });
    const tall = s.view.height >= s.view.width;
    s.onDrawUI((d) => {});
    s.add([chunky("PLAY", { w: tall ? 190 : 160, h: tall ? 60 : 50, size: tall ? 26 : 22, color: GOLD, action: "confirm", onTap: () => { playSong("menu"); tick(game); game.go("select", {}, { fade: 0.35 }); } }), pin("bottom", [0, tall ? 96 : 26]), { name: "play" }]);
    const hint = s.add([label(s.input.touchMode ? "Tap to herd some sheep" : "Press Enter to herd some sheep", 14, "#ffffff"), pin("bottom", [0, tall ? 68 : 6]), { name: "hint" }]);
    hint.hidden = !tall;
});

// --- Level select ----------------------------------------------------------------------------------------------------
game.scene("select", (s) => {
    touchOn(false);
    syncData({ screen: "select" });
    const world = new World(game, s, TITLE_LEVEL, "title", { attract: true, intro: 0 });
    const bot = new Bot(world, { seed: 5, gentle: true });
    world.titleCam = [10, 7.5, 33]; world.camD = 33; world.focus.x = 10; world.focus.z = 7.5;
    s.onUpdate((dt) => { const c = bot.think(); world.step(dt, c.x * 0.7, c.z * 0.7, false); });
    s.add([chunky("Back", { w: 80, h: 50, size: 16, color: WOOD, action: "pause", onTap: () => game.go("title", {}, { fade: 0.3 }) }), pin("top-left", [10, 8]), { name: "back" }]);
    const total = save.stars.reduce((a, b) => a + (b ?? 0), 0);
    s.add([label(`${total}/${LEVELS.length * 3}`, 17), pin("top-right", [44, 24]), { name: "total" }]);
    s.add([sprite("star", { width: 30 }), pin("top-right", [12, 16])]);
    s.add([label("Pick a field", 18), pin("top", [-4, 24]), { name: "heading" }]);
    const cards = LEVELS.map((lv, i) => {
        const open = isOpen(i), stars = save.stars[i] ?? 0;
        const go = () => { if (!open) return; tick(game); game.go("play", { level: i }, { fade: 0.35 }); };
        const e = s.add([ui(), {
            id: "card", name: `card${i + 1}`,
            setup(c) { c.size.set(150, 84, 0); c.tappable = { pad: 0 }; c.on("tap", go); },
            update(dt, c) { const g = c._pressed ? 0.95 : 1; c.scale.x += (g - c.scale.x) * Math.min(1, dt * 24); c.scale.y = c.scale.x; },
            draw(d, c) {
                const w = c.size.x, h = c.size.y;
                d.rect(w + 4, h + 4, { y: 3, color: INK, radius: 14 });
                d.rect(w, h, { color: open ? "#fff4dc" : "#b9ae9c", radius: 12 });
                d.rect(w - 8, h * 0.5, { y: -h * 0.2, color: open ? "#ffffff66" : "#ffffff22", radius: 9 });
                d.sprite("badges", { frame: lv.icon, x: -w / 2 + 34, y: -5, width: 54, height: 54, opacity: open ? 1 : 0.55 });
                d.text(`${i + 1}`, { x: -w / 2 + 14, y: -h / 2 + 14, size: 15, bold: true, color: INK, font: FONT });
                const tx = 30;
                d.text(lv.name, { x: tx, y: -18, size: 14, bold: true, color: INK, font: FONT, maxWidth: w - 76, lineHeight: 1.05 });
                if (open) for (let k = 0; k < 3; k++) d.sprite(k < stars ? "star" : "star0", { x: tx + (k - 1) * 22, y: 22, width: 24, height: 24 });
                else d.sprite("lock", { x: tx, y: 22, width: 26, height: 26 });
            },
        }]);
        return e;
    });
    const layout = () => {
        const v = s.view, tall = v.height >= v.width, cols = tall ? 2 : 4, top = v.safe.top + 66, bottom = v.height - v.safe.bottom - 10, left = v.safe.left + 8, right = v.width - v.safe.right - 8;
        const rows = Math.ceil(LEVELS.length / cols), gx = 10, gy = tall ? 12 : 10;
        const w = Math.min(190, (right - left - gx * (cols - 1)) / cols), h = Math.min(tall ? 104 : 124, (bottom - top - gy * (rows - 1)) / rows);
        const x0 = (left + right) / 2 - (w * cols + gx * (cols - 1)) / 2 + w / 2, y0 = top + h / 2 + (tall ? 8 : 0);
        cards.forEach((c, i) => { c.size.set(w, h, 0); c.pos.set(x0 + (i % cols) * (w + gx), y0 + Math.floor(i / cols) * (h + gy), 0); c._prevPos.set(c.pos); });
    };
    layout();
    s.on("resize", layout);
    s.onDrawUI((d) => {});
    if (typeof s.view !== "undefined") { /* keyboard: Enter plays the newest open level */
        s.add([{ update() { if (s.input._quiet("confirm")) { let i = LEVELS.length - 1; while (i > 0 && !isOpen(i)) i--; game.go("play", { level: i }, { fade: 0.35 }); } } }]);
    }
});

// --- Play ------------------------------------------------------------------------------------------------------------
game.scene("play", (s, args) => {
    const idx = clamp(args.level ?? 0, 0, LEVELS.length - 1), def = LEVELS[idx];
    touchOn(true);
    const world = new World(game, s, def, idx);
    s.world = world;
    playSong(def.mood === "night" || def.mood === "storm" ? "night" : "jig");
    syncData({ screen: "play", level: idx + 1, levelName: def.name, saved: 0, total: world.total, need: def.need, lost: 0, timeLeft: def.time, result: null });

    const auto = args.auto ? new Bot(world, { seed: args.auto }) : null;
    s.onUpdate((dt) => {
        let mx, mz, barking;
        if (auto) { const c = auto.think(); mx = c.x; mz = c.z; barking = c.bark; }
        else { const m = s.input.move; mx = m.x; mz = m.y; barking = s.input.pressed("bark"); }
        world.step(dt, mx, mz, barking);
        game.data.saved = world.saved; game.data.lost = world.lost; game.data.timeLeft = Math.ceil(world.time);
        if (s.input.pressed("pause") && !world.finished) setPaused(true);
    });
    world.onHurry = () => { if (def.mood === "day" || def.mood === "gold") playSong("hurry"); bell(game); toast("Dusk is coming!", "#ffd27a"); };
    world.onWolf = () => toast("Wolf! BARK at it!", "#cbd5ff");
    world.onDone = (r) => s.wait(r.won ? 1.1 : 0.7, () => showResult(r));

    // HUD
    const hudBack = s.add([rect(112, 40, { color: "#2b2a3ac8", radius: 14 }), pin("top-left", [8, 6]), { layer: 1 }]);
    const hudIcon = s.add([sprite("sheepi", { width: 34 }), pin("top-left", [11, 9]), { name: "sheepIcon", layer: 2 }]);
    const count = s.add([label(`0/${world.total}`, 20, "#ffffff"), pin("top-left", [48, 14]), { name: "count", layer: 2 }]);
    let countBump = 0;
    world.onSaved = () => {
        countBump = 1; count.text = `${world.saved}/${world.total}`;
        streak = world.elapsed - lastIn < 0.9 ? streak + 1 : 1; lastIn = world.elapsed;
        if (streak === 6) toast("Flock-tastic!", "#fff27a"); else if (streak === 12) toast("WOOL-TIDE!", "#fff27a");
        const left = world.total - world.saved - world.lost;
        if (left === 1) toast("One to go!", "#ffffff");
    };
    world.onLost = () => { toast("A sheep was stolen!", "#ffb4a0"); };
    const pauseBtn = s.add([chunky("", { w: 50, h: 50, ghost: true, onTap: () => { if (!world.finished) setPaused(true); } }), pin("top-right", [6, 4]), { name: "pauseBtn" }]);

    let toastT = 0, toastMsg = "", toastCol = "#fff", hudHidden = false, lastIn = -9, streak = 0;
    s.onUpdate((dt) => {
        bannerT -= dt; toastT -= dt;
        for (const r of world.rain) {
            r.y += 1.8 * r.v * dt; r.x -= 0.36 * r.v * dt;
            if (r.y > 1) { r.y -= 1; r.x = (r.x + 0.37) % 1; }
            if (r.x < 0) r.x += 1;
        }
        countBump = Math.max(0, countBump - dt * 4);
        count.scale.set(1 + countBump * 0.35, 1 + countBump * 0.35, 1);
    });
    function toast(msg, col = "#ffffff") { toastMsg = msg; toastCol = col; toastT = Math.max(2.2, msg.length * 0.07); }
    if (def.hint) s.wait(0.5, () => { toastMsg = def.hint; toastCol = "#ffffff"; toastT = 4.2; });
    if (idx === 0) s.wait(5, () => toast(s.input.touchMode ? "Drag anywhere left to run, tap BARK" : "Arrow keys to run, SPACE to bark", "#ffe9b0"));
    let bannerT = 2.2;

    s.onDrawUI((d) => {
        const v = s.view, safe = v.safe, t = s.time;
        d.sprite("vignette", { x: v.width / 2, y: v.height / 2, width: v.width * 1.04, height: v.height * 1.04, opacity: 0.5 });
        // rain sits behind everything else in the 2D layer
        for (const r of world.rain) {
            const x = r.x * v.width, y = r.y * v.height;
            d.line([x, y], [x - 4, y + 16], { width: 1.2, color: "#cfe6ff66" });
        }
        world.drawPops(d);
        if (hudHidden || s.paused) return;
        drawArrows(d);
        // the BARK button art lives under pogo's translucent control
        if (s.input.touchMode && game.touch.buttons.length) {
            const b = game.touch.layout()[0], ready = clamp((world.elapsed - world.lastBark) / 0.5, 0, 1);
            d.circle(b.r + 2, { x: b.x, y: b.y, color: INK });
            d.circle(b.r - 1, { x: b.x, y: b.y, color: ready < 1 ? "#a0522d" : "#e0413c" });
            d.sprite("paw", { x: b.x, y: b.y - 6, width: b.r * 1.15, height: b.r * 1.15 });
            d.text("BARK", { x: b.x, y: b.y + b.r * 0.58, size: 13, bold: true, color: "#ffffff", font: FONT });
        }
        // Dusk dial: a pill the sun crawls along
        const x0 = safe.left + 134, x1 = v.width - safe.right - 72, w = clamp(x1 - x0, 90, 300), cx = (x0 + x1) / 2, cy = safe.top + 26, frac = clamp(world.time / def.time, 0, 1);
        const late = world.time < 16;
        d.rect(w + 6, 18, { x: cx, y: cy, color: INK, radius: 9 });
        const a = color("#2f3560"), b = color(def.mood === "night" || def.mood === "storm" ? "#7a8cc8" : "#ffd47a");
        d.rect(w, 12, { x: cx, y: cy, color: a, radius: 6 });
        const fw = Math.max(12, w * frac);
        d.rect(fw, 12, { x: cx - w / 2 + fw / 2, y: cy, color: late ? (Math.sin(t * 10) > 0 ? "#ff7a5c" : "#ffb45c") : b, radius: 6 });
        const parX = cx - w / 2 + w * clamp(1 - def.par / def.time, 0, 1);
        if (!world.finished && world.elapsed - world.intro < def.par) { d.sprite("star", { x: parX, y: cy + 15, width: 16, height: 16 }); d.rect(2, 12, { x: parX, y: cy, color: "#ffffff" }); }
        const bob = late ? Math.sin(t * 12) * 2 : 0;
        d.sprite(def.mood === "night" ? "moon" : def.mood === "storm" ? "cloudi" : "sun", { x: cx - w / 2 + fw, y: cy + bob, width: 30, height: 30 });
        // Pause glyph over its button
        const px = v.width - safe.right - 30, py = safe.top + 28;
        d.sprite("pause", { x: px, y: py, width: 38, height: 38 });
        // Level banner
        if (bannerT > 0) {
            const k = clamp(Math.min(bannerT, 2.2 - bannerT) / 0.25, 0, 1);
            const y = v.height * 0.22 - (1 - k) * 20;
            d.rect(Math.min(v.width - 40, 300), 66, { x: v.width / 2, y, color: "#2b2a3acc", radius: 16, opacity: k });
            d.text(`${idx + 1}. ${def.name}`, { x: v.width / 2, y: y - 11, size: 22, bold: true, color: CREAM, font: FONT, opacity: k });
            d.text(`Save ${def.need} of ${world.total} before ${def.mood === "night" ? "dawn" : "dusk"}`, { x: v.width / 2, y: y + 15, size: 14, color: "#ffe9b0", font: FONT, opacity: k, bold: true });
        }
        if (toastT > 0) {
            const k = clamp(Math.min(toastT, 0.3) / 0.3, 0, 1), y = safe.top + 74, tw = Math.min(v.width - 24, toastMsg.length * 9 + 34);
            d.rect(tw, 34, { x: v.width / 2, y, color: "#2b2a3ad8", radius: 12, opacity: k });
            d.text(toastMsg, { x: v.width / 2, y, size: 14, bold: true, color: toastCol, font: FONT, opacity: k });
        }
    });

    function drawArrows(d) {
        if (world.finished) return;
        const v = s.view, m = 34, topM = v.safe.top + 62, botM = v.height - v.safe.bottom - (v.height >= v.width ? 170 : 26);
        const mark = (x, z, col, sz) => {
            const q = s.cam3.project([x, 0, z]);
            if (q.x > m && q.x < v.width - m && q.y > topM && q.y < botM) return;
            const cx = v.width / 2, cy = (topM + botM) / 2;
            let dx = q.x - cx, dy = q.y - cy;
            const k = Math.min(Math.abs((v.width / 2 - m) / (dx || 1e-3)), Math.abs(((botM - topM) / 2) / (dy || 1e-3)));
            dx *= k; dy *= k;
            const a = Math.atan2(dy, dx), ax = cx + dx, ay = cy + dy, c = Math.cos(a), sn = Math.sin(a), b = 2 * Math.sin(s.time * 6);
            const p = (l, w) => [ax + c * (l + b) - sn * w, ay + sn * (l + b) + c * w];
            d.poly([p(sz + 4, 0), p(-sz, sz + 3), p(-sz, -sz - 3)], { color: INK });
            d.poly([p(sz, 0), p(-sz + 2, sz), p(-sz + 2, -sz)], { color: col });
        };
        const pen = world.L.pen.mid ?? [world.L.pen.x0, world.L.pen.z0];
        mark(pen[0], pen[1], "#ffd94d", 11);
        let far = -1, fd = 0;
        for (let i = 0; i < world.n; i++) if (world.st[i] === ROAM) { const dd = Math.hypot(world.px[i] - world.dog.x, world.pz[i] - world.dog.z); if (dd > fd) { fd = dd; far = i; } }
        if (far >= 0) mark(world.px[far], world.pz[far], "#ffffff", 9);
    }

    // Pause
    let panel = null;
    function setPaused(on) {
        if (on === s.paused) return;
        s.paused = on;
        if (panel) { panel.forEach((e) => e.destroy()); panel = null; }
        if (!on) return;
        panel = [];
        const add = (c) => { const e = s.add(c); panel.push(e); return e; };
        add([pin("center"), { layer: 5, draw(d) { const v = s.view; d.rect(v.width * 2, v.height * 2, { color: "#2b2a3aa0" }); } }]);
        const tall = s.view.height >= s.view.width, gap = tall ? 62 : 52, h = tall ? 52 : 46, top = tall ? -130 : -118;
        add([label("Good dog?", 28), pin("center", [0, top]), { layer: 6, name: "pausedTitle" }]);
        add([chunky("Keep herding", { w: 210, h, color: GREEN, action: "pause", onTap: () => setPaused(false) }), pin("center", [0, top + 58]), { layer: 6, name: "resume" }]);
        add([chunky("Start again", { w: 210, h, color: GOLD, onTap: () => game.go("play", { level: idx }, { fade: 0.3 }) }), pin("center", [0, top + 58 + gap]), { layer: 6, name: "retry" }]);
        add([chunky("Fields", { w: 210, h, color: WOOD, onTap: () => { playSong("menu"); game.go("select", {}, { fade: 0.3 }); } }), pin("center", [0, top + 58 + gap * 2]), { layer: 6, name: "quit" }]);
        const snd = add([chunky(save.muted ? "Sound: off" : "Sound: on", { w: 210, h, color: "#5a6a8c", onTap: () => { save.muted = !save.muted; game.audio.muted = save.muted; persist(); setPaused(false); setPaused(true); } }), pin("center", [0, top + 58 + gap * 3]), { layer: 6, name: "sound" }]);
    }

    // Results
    function showResult(r) {
        if (r.won) {
            const old = save.stars[idx] ?? 0;
            save.stars[idx] = Math.max(old, r.stars);
            save.best[idx] = Math.min(save.best[idx] ?? 1e9, Math.round(r.took * 10) / 10);
            persist();
        }
        syncData({ result: r, screen: "result" });
        touchOn(false);
        game.stopMusic(); currentSong = null;
        if (r.won) game.music(SONGS.win); else game.sfx("lose");
        hudHidden = true;
        for (const e of [hudBack, hudIcon, count, pauseBtn]) e.hidden = true;
        const v = s.view, tall = v.height >= v.width, W = Math.min(v.width - 24, tall ? 336 : 300), H = tall ? 306 : Math.min(v.height - v.safe.bottom - v.safe.top - 12, 330);
        const place = () => { const q = s.view, t = q.height >= q.width; return t ? [q.width / 2, q.height - q.safe.bottom - H / 2 - 14] : [q.width - q.safe.right - W / 2 - 12, (q.height + q.safe.top - q.safe.bottom) / 2]; };
        const [rx, ry] = place();
        const root = s.add([ui(), pos(rx, ry + 40), {
            layer: 8, name: "panel",
            draw(d) {
                d.rect(W + 6, H + 6, { y: 3, color: INK, radius: 22 });
                d.rect(W, H, { color: "#fff4dc", radius: 20 });
                d.rect(W - 14, 66, { y: -H / 2 + 40, color: r.won ? "#ffe9a8" : "#ffd3c4", radius: 14 });
            },
        }]);
        s.tween(root, { pos: [rx, ry] }, 0.3, { ease: "outBack" });
        s.on("resize", () => { const [x, y] = place(); root.pos.set(x, y, 0); });
        const c = (list) => root.child(list);
        const headline = r.won ? (r.stars === 3 ? "GOOD DOG!" : r.stars === 2 ? "Well herded!" : "Scraped it!") : (world.time <= 0 ? (def.mood === "night" ? "Dawn broke!" : "Dusk fell!") : "Not enough sheep!");
        c([label(headline, 26, INK), pos(0, -H / 2 + 28), { layer: 9, name: "headline" }]);
        c([label(r.won ? `Biscuit brought ${r.saved} of ${r.total} home` : `Only ${r.saved} of ${r.total} home, needed ${def.need}`, 14, "#6b5a4a"), pos(0, -H / 2 + 54), { layer: 9, name: "sub" }]);
        const yStars = -H / 2 + 104;
        const marks = [["need", r.a, `Save ${def.need} sheep`], ["all", r.b, `All ${r.total} home`], ["par", r.c, `Under ${def.par} seconds`]];
        for (let k = 0; k < 3; k++) {
            c([sprite("star0", { width: 56 }), pos((k - 1) * 66, yStars), { layer: 9 }]);
            if (marks[k][1]) {
                const st = c([sprite("star", { width: 62 }), pos((k - 1) * 66, yStars), { layer: 10, name: `star${k}` }]);
                st.scale = 0;
                s.tween(st, { scale: [1, 1, 1] }, 0.4, { ease: "outBack", delay: 0.3 + k * 0.32 });
                s.wait(0.3 + k * 0.32, () => { starSfx(game, k); s.burst({ at: [root.pos.x + (k - 1) * 66, root.pos.y + yStars], dim: 2, count: 12, color: ["#ffd94d", "#ffffff"], speed: [80, 220], life: [0.3, 0.6], size: [5, 9] }); });
            }
        }
        marks.forEach(([, ok, txt], k) => {
            const y = yStars + 46 + k * 22;
            c([sprite(ok ? "tick" : "cross", { width: 18 }), pos(-92, y), { layer: 9 }]);
            const e = c([label(txt, 14, INK, { align: "left" }), pos(0, y), { layer: 9, name: `mark${k}` }]);
            e.pos.x = -76 + e.size.x / 2;
        });
        const by = H / 2 - 40, next = idx + 1 < LEVELS.length;
        const canNext = r.won && next;
        const btn = (name, x, w, col, act, fn) => { const e = c([chunky(name, { w, h: 50, size: 16, color: col, action: act, onTap: fn }), pos(x, by), { layer: 9, name: `btn${name}` }]); return e; };
        const bw = (W - 40) / 3;
        if (canNext) {
            btn("Fields", -bw - 8, bw, WOOD, "pause", () => { playSong("menu"); game.go("select", {}, { fade: 0.3 }); });
            btn("Retry", 0, bw, GOLD, null, () => game.go("play", { level: idx }, { fade: 0.3 }));
            btn("Next", bw + 8, bw, GREEN, "confirm", () => game.go("play", { level: idx + 1 }, { fade: 0.3 }));
        } else {
            btn("Fields", -(bw * 0.75) - 4, bw * 1.5, WOOD, "pause", () => { playSong("menu"); game.go("select", {}, { fade: 0.3 }); });
            btn("Retry", bw * 0.75 + 4, bw * 1.5, r.won ? GOLD : GREEN, "confirm", () => game.go("play", { level: idx }, { fade: 0.3 }));
        }
    }
    s.world = world;
});

game.start("title");
