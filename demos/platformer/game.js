// PUDDLE PIP. Pip, a kid in a yellow raincoat, chases Baron Gloam to get the sun back.
// Pogo gives us the loop, input, cameras, audio and rendering. Movement and collision are our own tile
// physics (physics.js), because a platformer needs head-bump callbacks, corner correction and thousands
// of tiles that cost nothing when idle.
import { clamp, createGame, layer, pos, tap, ui } from "./pogo.js";
import { BRICK, CLOUD, COIN, CRUMBLE, DT, EMPTY, F, GROUND, HARD, HIDDEN, LAVA, ONEWAY, PIPE, SECRET, SUN, THORN, THORN_DOWN, TILE, USED, groundAhead, moveBox, newHero, platAt, stepHero, tileAt } from "./physics.js";
import { FONT_ADV, FONT_CHARS, FONT_H, FONT_W, FR, HERO_ANIM, PAL, THEMES, defineArt } from "./art.js";
import { LEVELS, MAP_NODES, TITLE_ROOM, WORLDS } from "./levels.js";
import { SFX, SONGS } from "./sound.js";

const ALL_ACTIONS = {
    left: ["ArrowLeft", "KeyA", "pad:left"], right: ["ArrowRight", "KeyD", "pad:right"], up: ["ArrowUp", "KeyW", "pad:up"], down: ["ArrowDown", "KeyS", "pad:down"],
    jump: ["Space", "KeyZ", "KeyK", "pad:a"], fire: ["KeyX", "KeyJ", "ShiftLeft", "ShiftRight", "pad:x", "pad:b"], confirm: ["Enter", "pad:start"], pause: ["Escape", "KeyP", "pad:select"],
};
const TOUCH_BUTTONS = [{ action: "jump", label: "JUMP" }, { action: "fire", label: "RUN" }];

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#0d0a22", letterbox: "#0d0a22", pixelArt: true, maxDpr: 3, seed: 7,
    touch: { stick: true, buttons: TOUCH_BUTTONS },
    actions: ALL_ACTIONS,
});
defineArt(game);

// Stick and buttons are for play only. There's no per-scene option, so flip the live config.
function showTouch(on) { game.touch.o.stick = on; game.touch.buttons = on ? TOUCH_BUTTONS : []; }

// --- Save and run state --------------------------------------------------------------------------
const START_LIVES = 5;
function data() {
    const d = game.data;
    if (d.lives === undefined) {
        const p = game.load("progress", null) ?? {};
        Object.assign(d, { lives: START_LIVES, score: 0, coins: 0, form: 0, level: p.level ?? 0, unlocked: p.unlocked ?? 0, cleared: p.cleared ?? [], medals: p.medals ?? [], best: p.best ?? 0, hi: p.hi ?? 0, sound: p.sound ?? true });
        game.audio.muted = !d.sound;
    }
    return d;
}
function saveProgress() {
    const d = data();
    d.hi = Math.max(d.hi, d.score);
    game.save("progress", { level: d.level, unlocked: d.unlocked, cleared: d.cleared, medals: d.medals, hi: d.hi, sound: d.sound });
}
let currentSong = null;
function song(name, restart = false) {
    if (currentSong === name && !restart) return;
    currentSong = name;
    if (name) game.music(SONGS[name]); else game.stopMusic();
}
const sfx = (n) => game.sfx(SFX[n]);

// --- Screen metrics: pick a zoom that lands on whole device pixels. ----------------------------------
const M = { zoom: 1.5, u: 1.5, areaH: 360, deck: 0, viewW: 480, viewH: 240, portrait: false };
function measure() {
    const v = game.view, dpr = Math.min(v.screen.dpr, 3), dev = v.scale * dpr, portrait = v.height > v.width;
    const deck = portrait && game.input.touchMode && game.touch.o.stick ? Math.round(Math.max(196, v.height * 0.29) + v.safe.bottom) : 0;
    const areaH = v.height - deck;
    const k = Math.max(1, portrait ? Math.round(v.width * dev / 288) : Math.round(areaH * dev / 240));
    M.zoom = k / dev; M.u = k / dev; M.deck = deck; M.areaH = areaH; M.portrait = portrait;
    M.viewW = v.width / M.zoom; M.viewH = areaH / M.zoom;
}

// The default controls use the system font and white rings. Redraw them in the game's own pixel style.
game.touch.draw = function (d) {
    if (!game.input.touchMode || !this.o.stick) return;
    d.reset();
    const v = game.view, a = M.deck ? 1 : 0.46, sc = 1 / v.scale;
    const c = this.stickId !== null ? this.origin : this.stickHome(), k = this.stickId !== null ? this.knob : c;
    d.sprite("padbase", { x: c.x, y: c.y, width: 112 * sc, height: 112 * sc, opacity: a });
    d.sprite("padknob", { x: k.x, y: k.y, width: 58 * sc, height: 58 * sc, opacity: a });
    for (const b of this.layout()) {
        const on = [...this.held.values()].includes(b.action), f = (b.action === "jump" ? 0 : 2) + (on ? 1 : 0), run = b.action === "fire";
        d.sprite("padbtn", { x: b.x, y: b.y, width: b.r * 2.3, height: b.r * 2.3, frame: f, opacity: a });
        say(d, run ? (game.data.form === 2 ? "ZAP" : "RUN") : "JUMP", b.x, b.y + (on ? 2 : 0) * sc, { c: "#2a1a3e", a });
    }
};

// --- Bitmap text -----------------------------------------------------------------------------------
const FONT_INDEX = new Map([...FONT_CHARS].map((c, i) => [c, i]));
function say(d, str, x, y, o = {}) {
    const s = String(str), u = (o.s ?? 1) * M.u, adv = FONT_ADV * u, w = s.length * adv;
    let cx = (o.align === "left" ? x : o.align === "right" ? x - w : x - w / 2) + adv / 2;
    const col = o.c ?? "#ffffff", cw = FONT_W * u, ch = FONT_H * u;
    for (const c of s) {
        const f = FONT_INDEX.get(c) ?? FONT_INDEX.get(c.toUpperCase());
        if (f !== undefined && c !== " ") d.sprite("font", { frame: f, x: cx, y, width: cw, height: ch, color: col, opacity: o.a });
        cx += adv;
    }
}
const textW = (s, k = 1) => String(s).length * FONT_ADV * k * M.u;
const pad = (n, w) => String(Math.max(0, Math.floor(n))).padStart(w, "0");

// --- Rendering shared by all scenes ---------------------------------------------------------------
function tiled(d, name, w, h, left, viewW, y, f, drift = 0) {
    const off = (((left * f + drift) % w) + w) % w;
    for (let x = left - off; x < left + viewW; x += w) d.sprite(name, { x: x + w / 2, y: y + h / 2 });
}
function tiled2(d, name, s, left, top, viewW, viewH, f) {
    const ox = (((left * f) % s) + s) % s, oy = (((top * f) % s) + s) % s;
    for (let y = top - oy; y < top + viewH; y += s) for (let x = left - ox; x < left + viewW; x += s) d.sprite(name, { x: x + s / 2, y: y + s / 2 });
}
function drawBackdrop(d, theme, left, top, viewW, viewH, bottom, roomBottom, t) {
    const th = THEMES[theme], base = bottom + (roomBottom - bottom) * 0.35;
    if (th.bg === "cave" || th.bg === "vault") {
        const n = th.bg;
        tiled2(d, `bg_${n}0`, 96, left, top, viewW, viewH, 0.25);
        tiled(d, `bg_${n}1`, 256, 100, left, viewW, base - 100, 0.45);
        tiled(d, `bg_${n}2`, 256, 64, left, viewW, top - 2, 0.45);
        return;
    }
    if (th.bg === "hall") { tiled2(d, "bg_hall0", 128, left, top, viewW, viewH, 0.4); return; }
    const skyH = Math.max(256, viewH);
    if (viewH > 256 || top < bottom - 256) d.rect(viewW + 4, viewH + 4, { x: left + viewW / 2, y: top + viewH / 2, color: th.sky[0] });
    for (let x = left - (left % 32 + 32) % 32; x < left + viewW; x += 32) d.sprite(`sky_${theme}`, { x: x + 16, y: bottom - skyH / 2 - 8 + 8, width: 32, height: skyH });
    const clouds = th.bg === "keep" ? "storm" : th.bg === "dusk" ? "dusk" : "day";
    if (th.bg === "meadow") d.sprite("sunball", { x: left + viewW * 0.78, y: Math.max(top + 34, base - 196) });
    if (th.bg === "dusk") d.sprite("sunball", { x: left + viewW * 0.3, y: base - 74, width: 110, height: 110 });
    if (th.bg === "keep") d.sprite("moon", { x: left + viewW * 0.72, y: Math.max(top + 44, base - 186) });
    const cloud = (n, w, h, f, y, gap, drift, ph = 0) => {
        const span = viewW + gap + w, off = ((left * f + drift + ph) % span + span) % span;
        d.sprite(`cloud${n}_${clouds}`, { x: left + span - off - w, y });
    };
    const b = base;
    cloud(2, 88, 36, 0.06, b - 202, 120, t * 3, 60); cloud(1, 56, 28, 0.08, b - 176, 90, t * 4, 300); cloud(3, 36, 18, 0.05, b - 216, 60, t * 2, 170);
    tiled(d, `bg_${th.bg}0`, 320, th.bg === "keep" ? 150 : 120, left, viewW, b - (th.bg === "keep" ? 150 : 128), 0.1);
    cloud(1, 56, 28, 0.13, b - 130, 200, t * 6, 90); cloud(3, 36, 18, 0.16, b - 118, 170, t * 7, 20);
    if (th.bg === "keep") { tiled(d, "bg_keep1", 256, 110, left, viewW, b - 104, 0.3); return; }
    tiled(d, `bg_${th.bg}1`, 256, 96, left, viewW, b - 96, 0.2);
    tiled(d, `bg_${th.bg}2`, 256, 92, left, viewW, b - 90, 0.36);
}

/** Works out which terrain frame each ground tile uses. Run once per room definition. */
function autotile(R) {
    if (R.auto) return;
    R.auto = new Uint8Array(R.w * R.h);
    R.corners = [];
    const g = (c, r) => (c < 0 || c >= R.w || r >= R.h ? true : r < 0 ? R.T[c] === GROUND : R.T[r * R.w + c] === GROUND);
    for (let r = 0; r < R.h; r++) for (let c = 0; c < R.w; c++) {
        if (R.T[r * R.w + c] !== GROUND) continue;
        const u = g(c, r - 1), rt = g(c + 1, r), dn = g(c, r + 1), lf = g(c - 1, r);
        R.auto[r * R.w + c] = (u ? 1 : 0) | (rt ? 2 : 0) | (dn ? 4 : 0) | (lf ? 8 : 0);
        if (u && lf && !g(c - 1, r - 1)) R.corners.push(c, r, 0);
        if (u && rt && !g(c + 1, r - 1)) R.corners.push(c, r, 1);
        if (dn && rt && !g(c + 1, r + 1)) R.corners.push(c, r, 2);
        if (dn && lf && !g(c - 1, r + 1)) R.corners.push(c, r, 3);
    }
}
const SUN_CYCLE = [0, 0, 0, 0, 0, 0, 1, 2, 3, 0, 0, 0];
function drawTiles(d, R, left, top, viewW, viewH, t, bumps, crumbling) {
    const name = `tiles_${R.theme}`, c0 = Math.max(0, Math.floor(left / TILE)), c1 = Math.min(R.w - 1, Math.floor((left + viewW) / TILE));
    const r0 = Math.max(0, Math.floor(top / TILE)), r1 = Math.min(R.h - 1, Math.floor((top + viewH) / TILE));
    const T = R.T, w = R.w, sunF = FR.SUN + SUN_CYCLE[Math.floor(t * 8) % SUN_CYCLE.length], coinF = FR.COIN + Math.floor(t * 8) % 4;
    const lavaF = FR.LAVA + Math.floor(t * 6) % 4, thornF = Math.floor(t * 3) % 2, waterF = FR.WATER + Math.floor(t * 8) % 4;
    const wet = R.theme === "drain" || R.theme === "meadow" || R.theme === "dusk";
    // Ceilings run on up into any extra headroom a tall screen shows.
    if (top < 0) for (let c = c0; c <= c1; c++) if (T[c] === GROUND) for (let y = -TILE; y >= top - TILE; y -= TILE) d.sprite(name, { x: c * TILE + 8, y: y + 8, frame: 15 });
    // Rooms narrower than the screen: the walls just carry on to its edges.
    if (left < 0 || left + viewW > R.w * TILE) for (let y = Math.floor(top / TILE) * TILE; y < top + viewH; y += TILE) {
        for (let x = -TILE; x > left - TILE; x -= TILE) d.sprite(name, { x: x + 8, y: y + 8, frame: 15 });
        for (let x = R.w * TILE; x < left + viewW; x += TILE) d.sprite(name, { x: x + 8, y: y + 8, frame: 15 });
    }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * w + c, k = T[i];
        if (k === EMPTY) { if (wet && r === R.h - 1) d.sprite(name, { x: c * TILE + 8, y: r * TILE + 8, frame: waterF }); continue; }
        let f;
        switch (k) {
            case GROUND: f = R.auto[i]; break;
            case BRICK: case SECRET: f = FR.BRICK; break;
            case SUN: f = sunF; break;
            case USED: f = FR.USED; break;
            case HARD: f = FR.HARD; break;
            case ONEWAY: f = FR.OW + (T[i - 1] !== ONEWAY ? 0 : T[i + 1] !== ONEWAY ? 2 : 1); break;
            case PIPE: f = FR.PIPE + (R.pipeV.get(i) ?? 2); break;
            case CRUMBLE: f = FR.CRUMBLE + (crumbling?.has(i) ? 1 : 0); break;
            case THORN: f = FR.THORN + ((c + thornF) & 1); break;
            case THORN_DOWN: f = FR.THORN_DOWN + ((c + thornF) & 1); break;
            case LAVA: f = r > 0 && T[i - w] === LAVA ? FR.LAVA_FILL : lavaF; break;
            case COIN: f = coinF; break;
            case CLOUD: f = FR.CLOUD + (T[i - 1] !== CLOUD ? 0 : T[i + 1] !== CLOUD ? 2 : 1); break;
            default: continue;
        }
        const dy = bumps ? bumps.get(i) ?? 0 : 0;
        d.sprite(name, { x: c * TILE + 8, y: r * TILE + 8 + dy, frame: f });
    }
    const cs = R.corners;
    if (cs) for (let i = 0; i < cs.length; i += 3) { const c = cs[i]; if (c < c0 || c > c1) continue; d.sprite(name, { x: c * TILE + 8, y: cs[i + 1] * TILE + 8, frame: FR.CORNER + cs[i + 2] }); }
}
function drawDecor(d, R, left, viewW, t) {
    for (const o of R.decor) {
        const a = game.assets.sprite(o.s), w = a.frameW, h = a.frameH;
        if (o.x + w < left || o.x - w > left + viewW) continue;
        const lit = o.s === "torch" || o.s === "lamp", frame = o.anim ? Math.floor(t * 2 + o.x * 0.1) % o.anim : lit ? Math.floor(t * 9 + o.x) % 3 : 0;
        d.sprite(o.s, { x: o.x, y: o.y - h / 2, frame });
        if (lit) d.sprite("glow", { x: o.x, y: o.y - h + 8, width: 72, height: 72 });
    }
}
/** The world's interpolated view rectangle, for anything drawn in world space. */
function viewRect(s) {
    const c = s.cam, a = game._alpha ?? 1, p = c.prev ?? c.pos, q = c.center ?? c.pos;
    const cx = p.x + (q.x - p.x) * a, cy = p.y + (q.y - p.y) * a, v = game.view;
    return { left: cx - M.viewW / 2, top: cy - v.height / 2 / M.zoom, w: M.viewW, h: v.height / M.zoom };
}

// --- Actors ------------------------------------------------------------------------------------------
const STOMPABLE = { sog: 1, sog2: 1, sog3: 1, snail: 1, snail2: 1, brolly: 1, bolt: 1 };
const ZAPPABLE = { sog: 1, sog2: 1, sog3: 1, snail: 1, snail2: 1, brolly: 1, eel: 1, bolt: 1, ember: 1 };
const SIZES = { sog: [13, 13], sog2: [13, 13], sog3: [13, 13], snail: [14, 13], snail2: [14, 13], brolly: [14, 12], eel: [12, 30], drip: [8, 20], rod: [8, 8], ember: [12, 12], cannon: [14, 14], bolt: [13, 12] };

// --- Play scene ------------------------------------------------------------------------------------
game.scene("play", (s, args) => {
    const d0 = data(), lv = LEVELS[args.level ?? d0.level];
    d0.level = lv.index;
    showTouch(true);
    measure();
    s.background = "#0d0a22";

    const rooms = {};
    function room(id) {
        if (rooms[id]) return rooms[id];
        const def = lv.rooms[id];
        autotile(def);
        const R = { ...def, T: def.T.slice(), contents: new Map(def.contents), plats: def.plats.map((p) => ({ ...p })), gates: def.gates.map((g) => ({ ...g })), spawns: [...def.spawns].sort((a, b) => a.c - b.c),
            pads: def.springs.map((p) => ({ x: (p.c + 0.5) * TILE, y: (p.r - 1) * TILE + 4, fx: 0 })), actors: [], next: 0, bumps: new Map(), crumbling: new Map(), checks: def.checks.map((c) => ({ ...c, on: false })) };
        for (const sp of R.spawns) if (sp.kind === "cannon") R.T[sp.r * R.w + sp.c] = HARD;   // you can stand on a cannon
        return (rooms[id] = R);
    }

    const W = {
        lv, R: null, t: 0, tick: 0, time: lv.time, freeze: 0, fx: [], shots: [], combo: 0, comboT: 0, camX: 0, camBottom: 0, look: 0, shakeT: 0, lock: null, intro: 2.1, wipe: 0, wipeDir: 0, wipeCb: null,
        card: null, over: null, boss: null, gemTaken: false, hurried: false, rainbowT: 0, pausedOn: false, pauseSel: 0, secrets: 0, deaths: 0, stomps: 0,
    };
    globalThis.__pp = W;
    W.H = null;

    const H = Object.assign(newHero(0, 0, d0.form > 0), { form: d0.form, state: "play", st: 0, inv: 0, star: 0, runT: 0, sq: 0, idleT: 0, grow: 0, growFrom: 0, shootT: 0, pipeTo: null, stepT: 0, blinkT: 0, kiteY: 0 });
    W.H = H;

    // --- Layers ---
    const add = (l, o, ...tags) => s.add([pos(0, 0), layer(l), ...tags, o]);
    add(-100, { draw(d) { const v = viewRect(s), R = W.R; drawBackdrop(d, R.theme, v.left, v.top, v.w, v.h, W.camBottom, R.h * TILE, W.t); drawDecor(d, R, v.left, v.w, W.t); } }, "backdrop");
    add(0, { draw(d) { const v = viewRect(s), R = W.R; drawTiles(d, R, v.left, v.top, v.w, v.h, W.t, R.bumps, R.crumbling); } }, "tiles");
    add(5, { draw(d) { drawProps(d); } }, "props");
    add(40, { draw(d) { drawFx(d); } }, "fx");
    add(45, { draw(d) { drawWeather(d); } }, "weather");
    const camRig = s.add([pos(0, 0), { name: "cam" }]);

    const heroE = s.add([pos(0, 0), layer(30), "hero", { name: "hero", draw(d) { drawHero(d); } }]);
    const sizeHero = () => heroE.size.set(H.w, H.h, 0);

    // --- Room entry ---
    function enter(id, at) {
        if (W.R) for (const a of W.R.actors) if (a.e) a.e.hidden = true;
        const R = W.R = room(id);
        for (const a of R.actors) if (a.e) a.e.hidden = false;
        H.x = at.x; H.y = at.y; H.vx = H.vy = 0; H.on = -1;
        W.camX = at.x; W.look = 0; W.lock = null;
        W.camBottom = Math.min(R.h * TILE, Math.max(M.viewH, H.y + M.viewH * 0.3));
        if (R.h * TILE <= M.viewH) W.camBottom = R.h * TILE;
        syncPlats();
        snapCamera();
        heroE.teleport(H.x, H.y);
        spawnNear();
    }
    W.enter = enter;
    function syncPlats() { const R = W.R; for (const p of R.plats) { if (p.kind === "fall") { p.qx = p.x; p.qy = p.y; p.dx = 0; continue; } const ox = p.qx ?? p.x0; platAt(p, W.t); p.dx = p.qx - ox; } }

    // --- Spawning ---
    function spawnNear() {
        const R = W.R, right = W.camX + M.viewW / 2 + 56, leftEdge = W.camX - M.viewW / 2 - 40;
        while (R.next < R.spawns.length && (R.spawns[R.next].c + 1) * TILE < right) {
            const sp = R.spawns[R.next++];
            if ((sp.c + 2) * TILE < leftEdge && !sp.o.always) continue;
            spawn(sp);
        }
    }
    /** The lowest open cell in a column: rooms have ceilings, so scan up from the floor. */
    function floorRow(c) { const R = W.R; let r = R.h - 1; while (r > 0 && tileAt(R, c, r) === EMPTY) r--; while (r > 0 && tileAt(R, c, r) !== EMPTY) r--; return r + 1; }
    function spawn(sp) {
        const R = W.R, [w, h] = SIZES[sp.kind], o = sp.o;
        const a = { kind: sp.kind, w, h, x: (sp.c + 0.5) * TILE, y: 0, vx: 0, vy: 0, t: 0, st: 0, dead: false, mode: "walk", ...o };
        const r = sp.r ?? floorRow(sp.c) - 1;
        a.y = (r + 1) * TILE - h / 2;
        switch (sp.kind) {
            case "sog": case "sog2": case "sog3": a.vx = o.dir === 1 ? 32 : -32; a.speed = 32; break;
            case "snail": case "snail2": a.vx = -24; a.speed = 24; a.edge = true; break;
            case "brolly": a.x0 = a.x; a.y0 = (r + 0.5) * TILE; a.y = a.y0; a.ax = (o.ax ?? 0) * TILE; a.ay = (o.ay ?? 0) * TILE; a.period ??= 3; a.ph = o.phase ?? 0; break;
            case "eel": a.x = (sp.c + 1) * TILE; a.top = sp.r * TILE; a.y = a.top + 16; a.mode = "hide"; a.st = 1.0; break;
            case "drip": a.y = r * TILE + h / 2; a.y0 = a.y; a.mode = "hang"; break;
            case "rod": a.y = (sp.r + 0.5) * TILE; a.ang = 0; break;
            case "ember": a.y0 = (r + 1.5) * TILE; a.y = a.y0 + 40; a.st = o.delay ?? 0; a.mode = "wait"; break;
            case "cannon": a.y = (sp.r + 0.5) * TILE; a.st = 1.2 + (sp.c % 3) * 0.4; break;
        }
        addActor(a);
    }
    const ACTOR_LAYER = { eel: -1, cannon: 12, drip: -1 };
    function addActor(a) {
        a.e = s.add([pos(a.x, a.y), layer(ACTOR_LAYER[a.kind] ?? 20), a.kind, "enemy", { draw(d) { drawActor(d, a); } }]);
        a.e.size.set(a.w, a.h, 0);
        W.R.actors.push(a);
        return a;
    }
    function removeActor(a) { a.dead = true; a.e?.destroy(); a.e = null; }

    // --- Effects ---
    const fx = (o) => { W.fx.push({ t: 0, life: 0.5, vx: 0, vy: 0, g: 0, ...o }); if (W.fx.length > 300) W.fx.shift(); };
    const R_ = () => game.fxRng.next();
    const pixels = (x, y, n, cols, sp = 90, g = 500, life = 0.5, size = 2) => { for (let i = 0; i < n; i++) { const a = R_() * Math.PI * 2, v = sp * (0.4 + R_() * 0.8); fx({ kind: "pix", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, life: life * (0.6 + R_() * 0.6), c: cols[i % cols.length], size }); } };
    const puffDust = (x, y, n = 3, dir = 0) => { for (let i = 0; i < n; i++) fx({ kind: "dust", x: x + (R_() - 0.5) * 8, y: y - 2, vx: dir * 20 + (R_() - 0.5) * 30, vy: -12 - R_() * 16, life: 0.28 + R_() * 0.12 }); };
    const popup = (x, y, str, c) => fx({ kind: "text", x, y, vy: -46, life: 0.9, str, c: c ?? "#ffffff" });
    const addScore = (n, x, y) => { const d = data(); d.score += n; if (x !== undefined) popup(x, y, n >= 1000 ? `${n}` : `${n}`); };
    const oneUp = (x, y) => { data().lives++; sfx("oneup"); popup(x, y, "1UP", PAL.green); };
    function addCoin(x, y) {
        const d = data(); d.coins++; d.score += 100; sfx("coin");
        if (d.coins >= 100) { d.coins -= 100; oneUp(H.x, H.y - 16); }
    }
    const shake = (a, t) => s.shake(a, t);

    // --- Blocks ---
    function bump(c, r) {
        const R = W.R, i = r * R.w + c, k = R.T[i];
        if (k === SUN || k === HIDDEN) {
            R.T[i] = USED; bumpAnim(i);
            const it = R.contents.get(i); R.contents.delete(i);
            if (k === HIDDEN && it !== "coin") sfx("secret");
            release(it, c, r); kickFromBelow(c, r);
        } else if (k === BRICK) {
            const it = R.contents.get(i);
            if (it === "multi") {
                const left = (R.multi ??= new Map()).get(i) ?? 8;
                R.multi.set(i, left - 1);
                release("coin", c, r); bumpAnim(i);
                if (left <= 1) { R.T[i] = USED; R.contents.delete(i); }
                kickFromBelow(c, r);
            } else if (H.big) {
                R.T[i] = EMPTY; sfx("brick"); data().score += 50; shake(2, 0.1);
                for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 0.4], [1, 0.4]]) fx({ kind: "shard", x: c * TILE + 8 + dx * 4, y: r * TILE + 8 + dy * 4, vx: dx * (46 + R_() * 40), vy: -190 + dy * 100, g: 900, life: 0.8, spin: R_() });
                kickFromBelow(c, r);
            } else { bumpAnim(i); sfx("bump"); kickFromBelow(c, r); }
        } else sfx("bump");
        if (R.T[(r - 1) * R.w + c] === COIN) { R.T[(r - 1) * R.w + c] = EMPTY; addCoin(); coinPop(c, r - 1); }
    }
    function bumpAnim(i) { W.R.bumps.set(i, -0.0001); (W.bumpList ??= []).push({ i, t: 0, R: W.R }); }
    function coinPop(c, r) { fx({ kind: "coin", x: c * TILE + 8, y: r * TILE, vy: -220, g: 760, life: 0.55 }); }
    function release(it, c, r) {
        if (it === "coin") { addCoin(); coinPop(c, r); popup(c * TILE + 8, r * TILE - 18, "100"); return; }
        const kind = it === "power" ? (H.form === 0 ? "sunberry" : "zapple") : it;
        sfx("sprout");
        const a = { kind, w: 14, h: 14, x: c * TILE + 8, y: r * TILE + 8, vx: 0, vy: 0, t: 0, st: 0.5, mode: "rise", dead: false, item: true, y0: r * TILE - 7 };
        a.e = s.add([pos(a.x, a.y), layer(-1), kind, "item", { draw(d) { drawActor(d, a); } }]);
        a.e.size.set(14, 14, 0);
        W.R.actors.push(a);
    }
    W.spawnItem = (kind, x, y) => { const a = { kind, w: 14, h: 14, x, y, vx: 0, vy: 0, t: 0, st: 0, mode: "go", dead: false, item: true }; a.e = s.add([pos(x, y), layer(15), kind, "item", { draw(d) { drawActor(d, a); } }]); W.R.actors.push(a); };
    function kickFromBelow(c, r) {
        for (const a of W.R.actors) {
            if (a.dead || a.item && a.mode === "rise") continue;
            if (Math.abs(a.x - (c + 0.5) * TILE) < 14 && Math.abs(a.y + a.h / 2 - r * TILE) < 3) {
                if (a.item) { a.vy = -180; a.vx = a.x < (c + 0.5) * TILE ? -Math.abs(a.vx) : Math.abs(a.vx); }
                else if (STOMPABLE[a.kind]) { flipAway(a, a.x < (c + 0.5) * TILE ? -1 : 1); scoreCombo(a.x, a.y); }
            }
        }
    }
    const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
    function scoreCombo(x, y) {
        W.combo++; W.comboT = 1.5;
        if (W.combo > COMBO.length) oneUp(x, y - 8); else addScore(COMBO[W.combo - 1], x, y - 8);
    }
    function flipAway(a, dir = 1) {
        // Knocked off the world: flips and falls, no more collisions.
        a.mode = "flip"; a.vy = -240; a.vx = dir * 60; a.flip = true; a.st = 1.2;
        a.e && (a.e.layer = 35);
        sfx("kick");
        pixels(a.x, a.y, 6, [PAL.white, PAL.gold], 80, 300, 0.3);
    }

    // --- Hero fates ---
    function setForm(f) {
        const was = H.big;
        H.form = f; data().form = f; H.big = f > 0;
        const oldH = H.h;
        H.h = H.big ? 25 : 14;
        if (H.big !== was) H.y += (oldH - H.h) / 2;
        if (H.big && !was) {
            // Growing under a low ceiling: push the feet down rather than embed the head.
            const r = Math.floor((H.y - H.h / 2) / TILE), c = Math.floor(H.x / TILE);
            if (tileAt(W.R, c, r) === GROUND || tileAt(W.R, c, r) === BRICK) H.y += (r + 1) * TILE - (H.y - H.h / 2);
        }
        sizeHero();
    }
    function hurt() {
        if (H.state !== "play" || H.inv > 0 || H.star > 0) return;
        if (H.form > 0) {
            setForm(H.form - 1); H.inv = 1.8; W.freeze = 22; H.grow = 0.4; H.growFrom = 1; sfx("shrink"); shake(3, 0.2); game.vibrate(20);
        } else die();
    }
    function die() {
        if (H.state === "dead") return;
        H.state = "dead"; H.st = 0; H.vy = -310; H.vx = 0; heroE.layer = 60;
        const d = data();
        if (H.form) setForm(0);
        d.form = 0; W.deaths++;
        song(null); sfx("death"); shake(4, 0.25); game.vibrate(40);
    }
    function pickup(a) {
        removeActor(a);
        if (a.kind === "sunberry") { addScore(1000, a.x, a.y); if (H.form === 0) { setForm(1); H.grow = 0.55; H.growFrom = 0; W.freeze = 30; } sfx("grow"); }
        else if (a.kind === "zapple") { addScore(1000, a.x, a.y); setForm(2); H.grow = 0.55; H.growFrom = 1; W.freeze = 30; sfx("grow"); }
        else if (a.kind === "boot") oneUp(a.x, a.y);
        else if (a.kind === "rainbow") { H.star = 9; W.rainbowT = 9; song("rainbow"); sfx("grow"); }
        else if (a.kind === "sunorb") finale();
        pixels(a.x, a.y, 10, [PAL.gold4, PAL.white, PAL.gold], 90, 200, 0.45);
    }
    function zap() {
        if (W.shots.length >= 2 || H.shootT > 0) return;
        H.shootT = 0.18;
        const dir = H.face;
        const a = { kind: "zapshot", w: 8, h: 8, x: H.x + dir * 8, y: H.y - (H.big ? 4 : 0), vx: dir * 250, vy: 90, t: 0 };
        a.e = s.add([pos(a.x, a.y), layer(32), "shot", { draw(d) { d.sprite("zapshot", { frame: Math.floor(a.t * 16) % 2 }); } }]);
        W.shots.push(a);
        sfx("zap");
    }
    function killShot(a, boom = true) { a.dead = true; a.e?.destroy(); if (boom) pixels(a.x, a.y, 6, ["#8ff4ff", PAL.white], 70, 100, 0.25); }

    // --- Main step ---
    s.onUpdate(() => tick());

    function tick() {
        measure();
        const R = W.R;
        if (W.wipe > 0) stepWipe();
        if (W.card) stepCard();
        if (W.over) stepOver();
        if (W.freeze > 0) { W.freeze--; if (H.grow > 0) H.grow -= DT; stepFx(); return; }
        W.t += DT; W.tick++;
        if (W.intro > 0) W.intro -= DT;
        if (W.comboT > 0 && (W.comboT -= DT) <= 0) W.combo = 0;
        if (H.grow > 0) H.grow -= DT;
        if (H.state === "play" && !W.card) {
            W.time -= DT / 0.4;
            if (W.time <= 60 && !W.hurried) { W.hurried = true; sfx("hurry"); }
            if (W.time <= 0) { W.time = 0; H.form = 0; if (H.big) setForm(0); die(); }
        }
        syncPlats();
        stepPlats(); stepHeroState(); spawnNear(); stepActors(); stepShots(); if (W.boss) stepBoss(); stepTiles(); stepFx(); stepCamera();
        heroE.pos.set(H.x, H.y, 0);
        if (W.tick % 30 === 0) publish();
    }
    function publish() {
        const d = data();
        d.hero = { x: Math.round(H.x), y: Math.round(H.y), state: H.state, form: H.form, room: W.R.id };
        d.time = Math.ceil(W.time);
        d.progress = W.R.goal ? +(H.x / (W.R.goal.c * TILE)).toFixed(2) : d.progress;
    }

    function readInput() {
        const I = s.input, mx = I.move.x, touch = I.touchMode;
        return { dir: Math.abs(mx) > 0.3 ? Math.sign(mx) : 0, run: I.down("fire") || (touch && Math.abs(mx) > 0.82), jump: I.down("jump"), jumpPressed: I.pressed("jump"), down: I.down("down"), firePressed: I.pressed("fire") };
    }
    const hooks = {
        jump() { sfx(H.big ? "jumpBig" : "jump"); H.sq = 1; puffDust(H.x, H.y + H.h / 2, 2); },
        bump(c, r) { bump(c, r); },
        spring(sp) { sp.fx = 0.3; sfx("spring"); H.sq = 1; },
    };

    function stepHeroState() {
        if (H.inv > 0) H.inv -= DT;
        if (H.star > 0) { H.star -= DT; if (H.star <= 0) song(THEMES[W.R.theme].music); }
        if (H.shootT > 0) H.shootT -= DT;
        if (H.sq > 0) H.sq = Math.max(0, H.sq - DT * 7); else if (H.sq < 0) H.sq = Math.min(0, H.sq + DT * 7);
        H.st += DT;
        switch (H.state) {
            case "play": stepPlay(); break;
            case "dead":
                H.vy += 900 * DT; H.y += H.vy * DT;
                if (H.st > 1.5 && !W.left) respawn();
                break;
            case "pipeIn":
                H.y += 34 * DT;
                if (H.st > 0.62) { H.state = "wait"; startWipe(() => { const P = room(H.pipeTo.room); const q = P.pipes.find((x) => x.id === H.pipeTo.pipe); enter(H.pipeTo.room, { x: (q.c + 1) * TILE, y: q.top * TILE + H.h / 2 + 2 }); song(W.R.music ?? THEMES[W.R.theme].music); H.state = "pipeOut"; H.st = 0; heroE.layer = -1; H.exitTop = q.top; sfx("pipe"); }); }
                break;
            case "pipeOut":
                H.y -= 34 * DT;
                if (H.y + H.h / 2 <= H.exitTop * TILE) { H.y = H.exitTop * TILE - H.h / 2; H.state = "play"; heroE.layer = 30; H.grounded = true; }
                break;
            case "goal": stepGoal(); break;
        }
    }

    function stepPlay() {
        const R = W.R, inp = readInput();
        const wasGround = H.grounded, vy0 = H.vy;
        H.prevVy = H.vy;
        stepHero(H, inp, R, W.t, hooks);
        if (inp.firePressed && H.form === 2) zap();
        // Landing and running juice.
        if (H.grounded && !wasGround) {
            if (vy0 > 150) { H.sq = -Math.min(1, vy0 / 300); puffDust(H.x, H.y + H.h / 2, vy0 > 260 ? 5 : 3); }
            W.stompChain = 0; W.combo = W.comboT > 0 ? W.combo : 0;
        }
        if (H.grounded && H.skid && W.tick % 4 === 0) { puffDust(H.x + H.face * 4, H.y + H.h / 2, 1, H.face); if (W.tick % 8 === 0) sfx("skid"); }
        if (H.grounded && Math.abs(H.vx) > 110 && W.tick % 12 === 0) puffDust(H.x - H.face * 6, H.y + H.h / 2, 1, -H.face);
        H.runT += Math.abs(H.vx) * DT;
        if (H.grounded && Math.abs(H.vx) > 10) { H.idleT = 0; } else H.idleT += DT;
        H.up = s.input.down("up");

        // Pits.
        if (H.y > R.h * TILE + 40) { if (H.form) setForm(0); die(); return; }

        // Pipes down.
        if (inp.down && H.grounded) for (const p of R.pipes) {
            if (p.to && Math.abs(H.x - (p.c + 1) * TILE) < 9 && Math.abs(H.y + H.h / 2 - p.top * TILE) < 2) {
                H.state = "pipeIn"; H.st = 0; H.vx = 0; H.x = (p.c + 1) * TILE; H.pipeTo = { room: p.to, pipe: p.toPipe }; heroE.layer = -1; sfx("pipe");
                if (p.to !== "main") { W.secrets++; const d = data(); if (!d.medals.includes(lv.index)) { d.medals.push(lv.index); saveProgress(); popup(H.x, H.y - 24, "SECRET!", PAL.teal); } }
                return;
            }
        }
        // Tiles the hero overlaps: coins, thorns, lava.
        const hw = H.w / 2, hh = H.h / 2;
        const c0 = Math.floor((H.x - hw) / TILE), c1 = Math.floor((H.x + hw) / TILE), r0 = Math.floor((H.y - hh) / TILE), r1 = Math.floor((H.y + hh - 0.5) / TILE);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
            const k = tileAt(R, c, r);
            if (k === COIN) { R.T[r * R.w + c] = EMPTY; addCoin(); fx({ kind: "spark", x: c * TILE + 8, y: r * TILE + 8, life: 0.3 }); }
            else if (k === THORN && H.y + hh > r * TILE + 7) hurt();
            else if (k === THORN_DOWN && H.y - hh < r * TILE + 9) hurt();
            else if (k === LAVA && H.y + hh > r * TILE + 6) { if (H.state === "play" && H.star <= 0) { if (H.form) setForm(0); fxLava(); die(); } else if (H.star > 0) { H.vy = -340; H.launched = true; } }
        }
        // Standing on a crumble block starts it going.
        if (H.grounded) {
            const r = Math.floor((H.y + hh + 1) / TILE);
            for (let c = c0; c <= c1; c++) if (tileAt(R, c, r) === CRUMBLE) { const i = r * R.w + c; if (!R.crumbling.has(i)) { R.crumbling.set(i, 0.38); sfx("crumble"); } }
        }
        // Checkpoints.
        for (const ck of R.checks) if (!ck.on && H.x > (ck.c + 0.5) * TILE) {
            ck.on = true; ck.t = 0; sfx("checkpoint"); addScore(500, H.x, H.y - 20);
            W.checkAt = { room: R.id, x: (ck.c + 0.5) * TILE, y: ck.r * TILE };
            pixels((ck.c + 0.5) * TILE, ck.r * TILE - 34, 12, [PAL.red, PAL.white, PAL.gold], 100, 300, 0.5);
            if (H.form === 0) { /* a small mercy */ }
        }
        // Goal.
        const G = R.goal;
        if (G && H.x + hw >= (G.c + 0.5) * TILE - 1) grabKite(G);
        if (H.x < hw) H.x = hw;
        if (W.lock) { if (H.x < W.lock[0] + hw) { H.x = W.lock[0] + hw; H.vx = Math.max(0, H.vx); } if (H.x > W.lock[1] - hw) { H.x = W.lock[1] - hw; H.vx = Math.min(0, H.vx); } }
        // Boss trigger.
        if (R.boss && !W.boss && H.x > (R.boss.c - 10) * TILE) startBoss();
    }
    const fxLava = () => pixels(H.x, H.y + 6, 16, ["#ffd24a", "#ff8a2a", "#e0382e"], 150, 600, 0.6);

    // --- Goal: grab the kite string and get lifted out of the level. ---
    function grabKite(G) {
        const top = (G.r - 11) * TILE, h = clamp((G.r * TILE - (H.y + H.h / 2)) / (9 * TILE), 0, 1);
        const pts = h > 0.92 ? 5000 : h > 0.7 ? 2000 : h > 0.45 ? 800 : h > 0.2 ? 400 : 100;
        H.state = "goal"; H.st = 0; H.vx = 0; H.vy = 0; H.x = (G.c + 0.5) * TILE; H.kiteY = H.y;
        addScore(pts, H.x + 18, H.y);
        if (pts === 5000) { popup(H.x + 18, H.y - 12, "TOP!", PAL.gold); }
        song(null); sfx("grab"); W.lockCam = true;
        W.goalPts = pts;
        shake(2, 0.2);
    }
    function stepGoal() {
        const lift = H.st < 0.5 ? 0 : Math.min(180, (H.st - 0.5) * 220);
        H.y -= lift * DT;
        H.vy = 0;
        if (W.finale) return;
        if (W.tick % 6 === 0 && H.st > 0.5) pixels(H.x, H.y + 10, 1, [PAL.white, PAL.gold4], 30, 60, 0.5);
        if (!W.card && H.st > 1.5) {
            sfx("clear");
            W.card = { t: 0, time: Math.ceil(W.time), bonus: 0, phase: 0, coins: data().coins, fw: 0 };
            const d = data();
            if (!d.cleared.includes(lv.index)) d.cleared.push(lv.index);
            d.unlocked = Math.max(d.unlocked, Math.min(LEVELS.length - 1, lv.index + 1));
            saveProgress();
        }
    }
    function stepCard() {
        const c = W.card, d = data();
        c.t += DT;
        if (c.t > 0.6 && c.phase === 0) {
            const take = Math.min(c.time, 4);
            c.time -= take; c.bonus += take * 10; d.score += take * 10;
            if (W.tick % 3 === 0) sfx("tally");
            if (c.time <= 0) { c.phase = 1; sfx("tallyEnd"); c.done = c.t; }
        }
        if (c.t - c.fw > 0.45 && c.t < 3.2) {
            c.fw = c.t;
            const v = viewRect(s), x = v.left + v.w * (0.15 + R_() * 0.7), y = W.camBottom - M.viewH * (0.45 + R_() * 0.4), col = [[PAL.gold, PAL.white], [PAL.red, PAL.pink], [PAL.teal, PAL.white], [PAL.purple, PAL.pink]][Math.floor(R_() * 4)];
            pixels(x, y, 26, col, 150, 120, 0.8, 2); sfx("firework");
        }
        if (c.phase === 1 && (c.t - c.done > 2.2 || (c.t - c.done > 0.4 && (s.input.pressed("jump") || s.input.pressed("confirm") || s.input.pointer.tapped)))) {
            c.phase = 2; saveProgress();
            game.go("map", { justCleared: lv.index }, { fade: 0.5 });
        }
    }
    function respawn() {
        W.left = true;
        const d = data();
        d.lives--;
        if (d.lives <= 0) { W.over = { t: 0 }; sfx("gameover"); saveProgress(); return; }
        game.go("play", { level: lv.index, check: W.checkAt ?? args.check, retry: true }, { fade: 0.4 });
    }
    function stepOver() {
        const o = W.over; o.t += DT;
        if (o.t > 1.2 && (s.input.pressed("jump") || s.input.pressed("confirm") || s.input.pointer.tapped) || o.t > 6) {
            if (o.gone) return;
            o.gone = true;
            const d = data();
            d.lives = START_LIVES; d.score = 0; d.coins = 0; d.form = 0;
            game.go("map", {}, { fade: 0.5 });
        }
    }

    // --- Pipe wipe ---
    function startWipe(cb) { W.wipe = 1; W.wipeDir = 1; W.wipeT = 0; W.wipeCb = cb; }
    function stepWipe() {
        W.wipeT += DT * 3.4;
        if (W.wipeDir === 1 && W.wipeT >= 1) { W.wipeCb?.(); W.wipeCb = null; W.wipeDir = -1; W.wipeT = 0; }
        else if (W.wipeDir === -1 && W.wipeT >= 1) W.wipe = 0;
    }

    // --- Tiles over time ---
    function stepTiles() {
        const R = W.R;
        if (W.bumpList) for (let i = W.bumpList.length - 1; i >= 0; i--) {
            const b = W.bumpList[i]; b.t += DT;
            const k = b.t / 0.16;
            if (k >= 1) { b.R.bumps.delete(b.i); W.bumpList.splice(i, 1); } else b.R.bumps.set(b.i, -Math.sin(k * Math.PI) * 6);
        }
        for (const [i, left] of R.crumbling) {
            if (left <= DT) {
                R.crumbling.delete(i); R.T[i] = EMPTY;
                const c = i % R.w, r = Math.floor(i / R.w);
                for (const dx of [-3, 3]) fx({ kind: "shard", x: c * TILE + 8 + dx, y: r * TILE + 8, vx: dx * 8, vy: -40, g: 900, life: 0.7, spin: R_() });
                (R.regrow ??= []).push({ i, t: 4.5 });
            } else R.crumbling.set(i, left - DT);
        }
        if (R.regrow) for (let i = R.regrow.length - 1; i >= 0; i--) {
            const g = R.regrow[i]; g.t -= DT;
            if (g.t <= 0) {
                const c = g.i % R.w, r = Math.floor(g.i / R.w);
                if (Math.abs((c + 0.5) * TILE - H.x) > 24 || Math.abs((r + 0.5) * TILE - H.y) > 32) { R.T[g.i] = CRUMBLE; R.regrow.splice(i, 1); }
            }
        }
        for (const p of R.pads) if (p.fx > 0) p.fx -= DT;
        for (const ck of R.checks) if (ck.on) ck.t += DT;
    }
    function stepPlats() {
        const R = W.R;
        for (let i = 0; i < R.plats.length; i++) {
            const p = R.plats[i];
            if (p.kind !== "fall") continue;
            if (p.gone) { p.st -= DT; if (p.st <= 0) { p.gone = false; p.x = p.x0; p.y = p.y0; p.vy = 0; p.falling = 0; p.shake = 0; } continue; }
            if (H.on === i && !p.falling) { p.falling = 0.35; p.shake = 1; sfx("crumble"); }
            if (p.falling) {
                p.falling -= DT;
                if (p.falling <= 0) { p.falling = -1; p.vy = Math.min(260, (p.vy ?? 0) + 800 * DT); p.y += p.vy * DT; p.shake = 0; if (p.y > R.h * TILE + 30) { p.gone = true; p.st = 2.5; if (H.on === i) H.on = -1; } }
            }
        }
    }

    // --- Actors ---
    const hitAABB = (a, ox = 0.8) => Math.abs(a.x - H.x) < (a.w * ox + H.w) / 2 && Math.abs(a.y - H.y) < (a.h * ox + H.h) / 2;
    function stepActors() {
        const R = W.R;
        const far = W.camX - M.viewW * 1.2;
        for (const a of R.actors) {
            if (a.dead) continue;
            a.t += DT;
            if (a.item) { stepItem(a); } else {
                if (a.x < far && a.kind !== "cannon") { removeActor(a); continue; }
                if (a.y > R.h * TILE + 60) { removeActor(a); continue; }
                stepEnemy(a);
                if (!a.dead && a.mode !== "flip" && H.state === "play") contact(a);
            }
            if (a.e) a.e.pos.set(a.x, a.y, 0);
        }
        if (R.actors.length > 60 || W.tick % 120 === 0) R.actors = R.actors.filter((a) => !a.dead);
    }
    function stepItem(a) {
        const R = W.R;
        if (a.mode === "rise") {
            a.y = Math.max(a.y0, a.y - 44 * DT);
            if (a.y <= a.y0) { a.mode = "go"; a.e.layer = 15; if (a.kind === "sunberry") a.vx = 54; if (a.kind === "boot") a.vx = 64; if (a.kind === "rainbow") { a.vx = 70; a.vy = -220; } }
            return;
        }
        if (a.kind === "sunorb") { a.y = Math.min(a.y0, a.y + 26 * DT); }
        else if (a.kind !== "zapple") {
            moveBox(a, R);
            if (a.hitX) a.vx = -a.vx;
            if (a.kind === "rainbow" && a.grounded) a.vy = -240;
            if (a.y > R.h * TILE + 40) return removeActor(a);
        } else moveBox(a, R);
        if (H.state === "play" && Math.abs(a.x - H.x) < (a.w + H.w) / 2 && Math.abs(a.y - H.y) < (a.h + H.h) / 2) pickup(a);
    }
    function stepEnemy(a) {
        const R = W.R;
        switch (a.kind) {
            case "sog": case "sog2": case "sog3":
                if (a.mode === "flat") { a.st -= DT; if (a.st <= 0) removeActor(a); return; }
                if (a.mode === "flip") return flipStep(a);
                moveBox(a, R);
                if (a.hitX) { a.vx = -a.vx; }
                break;
            case "snail": case "snail2":
                if (a.mode === "flip") return flipStep(a);
                if (a.mode === "walk") {
                    if (a.grounded !== false && !groundAhead(a, R)) a.vx = -a.vx;
                    moveBox(a, R);
                    if (a.hitX) a.vx = -a.vx;
                } else if (a.mode === "shell") {
                    moveBox(a, R);
                    a.st -= DT;
                    if (a.grace > 0) a.grace -= DT;
                    if (a.st <= 0) { a.mode = "walk"; a.vx = a.x < H.x ? 24 : -24; }
                } else if (a.mode === "slide") {
                    moveBox(a, R);
                    if (a.grace > 0) a.grace -= DT;
                    if (a.hitX) {
                        a.vx = -a.vx; sfx("bump"); shake(1.5, 0.08);
                        const k = tileAt(R, a.hitC, a.hitR);
                        if (k === BRICK || k === SUN) bumpFromShell(a.hitC, a.hitR);
                    }
                    for (const b of R.actors) {
                        if (b === a || b.dead || b.item || b.mode === "flip") continue;
                        if (!ZAPPABLE[b.kind] || b.kind === "eel") continue;
                        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
                            if (b.mode === "slide") { flipAway(a, -Math.sign(a.vx)); }
                            flipAway(b, Math.sign(a.vx)); scoreCombo(b.x, b.y);
                        }
                    }
                }
                break;
            case "brolly":
                if (a.mode === "flip") return flipStep(a);
                { const k = Math.sin((a.t / a.period + a.ph) * Math.PI * 2);
                    a.x = a.x0 + a.ax * k; a.y = a.y0 + a.ay * k; }
                break;
            case "eel": stepEel(a); break;
            case "drip":
                if (a.mode === "hang") { if (Math.abs(H.x - a.x) < 34 && H.y > a.y) { a.mode = "shake"; a.st = 0.42; sfx("crumble"); } }
                else if (a.mode === "shake") { a.st -= DT; if (a.st <= 0) { a.mode = "fall"; a.vy = 40; } }
                else {
                    a.vy = Math.min(340, a.vy + 900 * DT); a.y += a.vy * DT;
                    const c = Math.floor(a.x / TILE), r = Math.floor((a.y + a.h / 2) / TILE), k = tileAt(R, c, r);
                    if (k === GROUND || k === HARD || k === BRICK || k === PIPE) { pixels(a.x, a.y + 10, 8, ["#e4f4ff", "#a8c8f0"], 90, 500, 0.4); sfx("crumble"); removeActor(a); }
                }
                break;
            case "rod": a.ang += (a.speed ?? 1.5) * DT; break;
            case "ember": {
                if (a.mode === "wait") { a.st -= DT; if (a.st <= 0) { a.mode = "fly"; a.y = a.y0; a.vy = -330; sfx("crumble"); pixels(a.x, a.y - 6, 6, ["#ffd24a", "#ff8a2a"], 80, 300, 0.4); } }
                else { a.vy += 620 * DT; a.y += a.vy * DT; if (a.y > a.y0 && a.vy > 0) { a.mode = "wait"; a.st = 1.5; a.y = a.y0 + 40; } }
                break;
            }
            case "cannon": {
                if (Math.abs(H.x - a.x) > M.viewW * 0.75) break;
                a.st -= DT;
                if (a.st <= 0) {
                    a.st = 3.1;
                    if (Math.abs(H.x - a.x) < 34) break;
                    const dir = H.x < a.x ? -1 : 1;
                    const b = { kind: "bolt", w: 13, h: 12, x: a.x + dir * 12, y: a.y - 1, vx: dir * 88, vy: 0, t: 0, st: 0, mode: "walk", dead: false, fly: true };
                    addActor(b); sfx("kick"); shake(1, 0.06); pixels(b.x, b.y, 5, ["#fff8ea", "#a8a4c0"], 50, 0, 0.3);
                }
                break;
            }
            case "bolt":
                if (a.mode === "flip") return flipStep(a);
                a.x += a.vx * DT;
                if (Math.abs(a.x - W.camX) > M.viewW) removeActor(a);
                break;
        }
    }
    function bumpFromShell(c, r) {
        const R = W.R, i = r * R.w + c;
        if (R.T[i] === BRICK && !R.contents.get(i)) { R.T[i] = EMPTY; sfx("brick"); for (const dx of [-1, 1]) fx({ kind: "shard", x: c * TILE + 8, y: r * TILE + 8, vx: dx * 60, vy: -160, g: 900, life: 0.7, spin: R_() }); }
        else bump(c, r);
    }
    function flipStep(a) { a.vy += 900 * DT; a.x += a.vx * DT; a.y += a.vy * DT; a.st -= DT; if (a.st <= 0) removeActor(a); }
    function stepEel(a) {
        const rise = 30;
        a.st -= DT;
        if (a.mode === "hide") {
            if (a.st <= 0 && Math.abs(H.x - a.x) > 26) { a.mode = "up"; a.st = rise / 60; }
        } else if (a.mode === "up") {
            a.y -= 60 * DT; if (a.st <= 0) { a.mode = "show"; a.st = 1.1; }
        } else if (a.mode === "show") {
            if (a.st <= 0) { a.mode = "down"; a.st = rise / 60; }
        } else { a.y += 60 * DT; if (a.st <= 0) { a.mode = "hide"; a.st = 1.6; a.y = a.top + 16; } }
    }
    function contact(a) {
        const k = a.kind;
        if (k === "rod") {
            const n = a.n ?? 4;
            for (let i = 1; i <= n; i++) { const px = a.x + Math.cos(a.ang) * i * 9, py = a.y + Math.sin(a.ang) * i * 9; if (Math.abs(px - H.x) < 3 + H.w / 2 && Math.abs(py - H.y) < 3 + H.h / 2) { hurt(); break; } }
            return;
        }
        if (k === "cannon") return;
        if (k === "eel") {
            if (a.mode === "hide") return;
            const topY = a.y - a.h / 2 + 2, botY = a.top;
            if (Math.abs(a.x - H.x) < (a.w + H.w) / 2 - 1 && H.y + H.h / 2 > topY && H.y - H.h / 2 < botY) { if (H.star > 0) { flipAway(a); scoreCombo(a.x, a.y); } else hurt(); }
            return;
        }
        if (k === "ember" && a.mode === "wait") return;
        if (a.mode === "flat") return;
        if (!hitAABB(a)) return;
        if (H.star > 0 && k !== "drip") { flipAway(a, Math.sign(H.vx) || 1); scoreCombo(a.x, a.y); return; }
        const stompable = STOMPABLE[k];
        // Above the enemy's middle and moving down counts: late stomps should always feel fair.
        if (stompable && (H.vy > 0 || H.prevVy > 0) && H.y + H.h / 2 < a.y + 7) return stomp(a);
        if (a.mode === "shell") {
            if (a.grace > 0) return;
            const dir = H.x < a.x ? 1 : -1;
            a.mode = "slide"; a.vx = dir * 236; a.grace = 0.22; sfx("kick"); addScore(100, a.x, a.y - 8); return;
        }
        if (a.mode === "slide" && a.grace > 0) return;
        hurt();
    }
    function stomp(a) {
        H.y = a.y - a.h / 2 - H.h / 2 - 1;
        H.vy = s.input.down("jump") ? -F.STOMP_HELD : -F.STOMP_BOUNCE;
        H.launched = true; H.cut = false; H.grounded = false; H.on = -1; H.sq = 1; H.coyote = 0;
        scoreCombo(a.x, a.y);
        sfx("stomp"); game.vibrate(10); W.freeze = 2;
        for (let i = 0; i < 4; i++) fx({ kind: "spark", x: a.x + (i - 1.5) * 6, y: a.y - 4, vy: -30, vx: (i - 1.5) * 26, life: 0.28 });
        W.stomps++;
        const k = a.kind;
        if (k === "sog" || k === "sog2" || k === "sog3") { a.mode = "flat"; a.st = 0.5; a.vx = 0; a.t = 0; }
        else if (k === "snail" || k === "snail2") {
            if (a.mode === "slide") { a.mode = "shell"; a.vx = 0; a.st = 7; a.grace = 0.2; }
            else if (a.mode === "shell") { a.mode = "slide"; a.vx = (H.x < a.x ? 1 : -1) * 236; a.grace = 0.2; sfx("kick"); }
            else { a.mode = "shell"; a.vx = 0; a.st = 7; a.grace = 0.2; }
        } else flipAway(a, Math.sign(H.vx) || 1);
    }

    // --- Shots ---
    function stepShots() {
        const R = W.R;
        for (const a of W.shots) {
            a.t += DT;
            moveBox(a, R, DT, 900, 260);
            if (a.grounded) a.vy = -170;
            if (a.hitX || Math.abs(a.x - W.camX) > M.viewW * 0.7 || a.y > R.h * TILE + 10) { sfx("zapHit"); killShot(a); continue; }
            for (const b of R.actors) {
                if (b.dead || b.item || !ZAPPABLE[b.kind] || b.mode === "flip" || (b.kind === "eel" && b.mode === "hide") || (b.kind === "ember" && b.mode === "wait")) continue;
                if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) { killShot(a); flipAway(b, Math.sign(a.vx)); scoreCombo(b.x, b.y); sfx("zapHit"); break; }
            }
            if (W.boss && !a.dead && W.boss.state !== "dead" && Math.abs(a.x - W.boss.x) < 34 && Math.abs(a.y - W.boss.y) < 26) { killShot(a); if (W.boss.state === "dizzy") { W.boss.chip = (W.boss.chip ?? 0) + 1; sfx("zapHit"); if (W.boss.chip >= 4) { W.boss.chip = 0; hitBoss(); } } }
            if (!a.dead) a.e.pos.set(a.x, a.y, 0);
        }
        W.shots = W.shots.filter((a) => !a.dead);
    }

    // --- Baron Gloam ---
    const ARENA_FLOOR = 13 * TILE;
    function startBoss() {
        const R = W.R, b = R.boss;
        for (const g of R.gates) for (let r = g.r0; r <= g.r1; r++) R.T[r * R.w + g.c] = HARD;
        W.lock = [b.x0, b.x1];
        sfx("gate"); shake(5, 0.4); song("boss", true);
        W.boss = { x: (b.x0 + b.x1) / 2, y: 2 * TILE - 40, vx: 0, hp: 3, state: "enter", st: 0, phase: 0, face: 0, strikes: [], hurtT: 0, x0: b.x0 + 36, x1: b.x1 - 36, attacks: 0 };
        data().boss = 3;
        W.bossE = s.add([pos(W.boss.x, W.boss.y), layer(18), "boss", { name: "baron", draw(d) { drawBoss(d); } }]);
        W.bossE.size.set(64, 52, 0);
    }
    function setBoss(state, t = 0) { W.boss.state = state; W.boss.st = t; }
    function strike(x, delay) { W.boss.strikes.push({ x, t: -delay, hit: false }); sfx("warn"); }
    function stepBoss() {
        const b = W.boss, top = 5.5 * TILE;
        b.st += DT;
        if (b.hurtT > 0) b.hurtT -= DT;
        for (const st of b.strikes) {
            st.t += DT;
            if (st.t >= 0 && !st.hit) { st.hit = true; sfx("thunder"); shake(3, 0.16); s.flash("#ffffff", 0.1); pixels(st.x, ARENA_FLOOR, 12, [PAL.gold4, PAL.white], 140, 500, 0.4); }
            if (st.t >= 0 && st.t < 0.22 && H.state === "play" && Math.abs(H.x - st.x) < 14 + H.w / 2) hurt();
        }
        b.strikes = b.strikes.filter((x) => x.t < 0.3);
        switch (b.state) {
            case "enter":
                b.y += (top - b.y) * DT * 2.2;
                if (b.st > 1.6) setBoss("hover");
                break;
            case "hover": {
                const speed = b.hp === 1 ? 2.3 : b.hp === 2 ? 1.8 : 1.4;
                b.phase += DT * speed;
                b.x = (b.x0 + b.x1) / 2 + Math.sin(b.phase) * (b.x1 - b.x0) / 2;
                b.y = top + Math.sin(b.phase * 2.3) * 8;
                if (b.st > (b.hp === 1 ? 1.1 : 1.5)) {
                    b.attacks++;
                    if (b.attacks % 3 === 0) { setBoss("aim"); }
                    else {
                        const n = 4 - b.hp;
                        strike(H.x, 0.8);
                        for (let i = 1; i < n; i++) { strike(clamp(H.x + i * (i % 2 ? 56 : -56), b.x0 - 20, b.x1 + 20), 0.8 + i * 0.12); }
                        setBoss("hover");
                    }
                }
                break;
            }
            case "aim":
                b.x += clamp(H.x - b.x, -130, 130) * DT * 2;
                if (b.st > 0.7) { setBoss("dive"); b.vy = 60; }
                break;
            case "dive":
                b.vy = Math.min(420, b.vy + 1100 * DT); b.y += b.vy * DT;
                if (b.y >= ARENA_FLOOR - 26) {
                    b.y = ARENA_FLOOR - 26; sfx("bossHit"); shake(7, 0.35); game.vibrate(30);
                    for (let i = 0; i < 10; i++) puffDust(b.x + (i - 5) * 7, ARENA_FLOOR, 1, i < 5 ? -1 : 1);
                    setBoss("dizzy");
                }
                break;
            case "dizzy":
                if (b.st > (b.hp === 1 ? 2.4 : 3.0)) { setBoss("rise"); }
                break;
            case "hit":
                if (b.st > 0.5) setBoss("rise");
                break;
            case "rise":
                b.y += (top - b.y) * DT * 3;
                if (Math.abs(b.y - top) < 3) { b.phase = Math.asin(clamp((b.x - (b.x0 + b.x1) / 2) / ((b.x1 - b.x0) / 2), -1, 1)); setBoss("hover"); }
                break;
            case "dead":
                b.y += 22 * DT;
                if (W.tick % 7 === 0) { pixels(b.x + (R_() - 0.5) * 60, b.y + (R_() - 0.5) * 40, 14, [PAL.white, PAL.gold, PAL.purple], 130, 100, 0.5); sfx("firework"); }
                if (b.st > 2.6 && !b.gone) {
                    b.gone = true; W.bossE.destroy(); s.flash("#fff6c0", 0.8); shake(6, 0.5);
                    pixels(b.x, b.y, 50, [PAL.white, PAL.purple, PAL.gold4], 220, 80, 1);
                    song("title", true);
                    const a = { kind: "sunorb", w: 26, h: 26, x: (W.R.boss.x0 + W.R.boss.x1) / 2, y: 3 * TILE, vx: 0, vy: 0, t: 0, st: 0, mode: "go", dead: false, item: true, y0: 11.7 * TILE };
                    a.e = s.add([pos(a.x, a.y), layer(25), "sunorb", { draw(d) { drawActor(d, a); } }]);
                    W.R.actors.push(a);
                    W.sunUp = 0.01;
                }
                break;
        }
        if (W.bossE?.alive) W.bossE.pos.set(b.x, b.y, 0);
        // Contact.
        if (H.state !== "play" || b.state === "dead" || b.state === "enter") return;
        const dx = Math.abs(H.x - b.x), dy = H.y - b.y;
        if (dx < 30 + H.w / 2 && Math.abs(dy) < 22 + H.h / 2) {
            if (b.state === "dizzy") {
                if (H.vy > 0 && dy < -10) {
                    H.vy = -F.STOMP_HELD; H.launched = true; H.cut = false; H.y = b.y - 22 - H.h / 2 - 1; H.grounded = false; H.inv = Math.max(H.inv, 1.1); hitBoss();
                }
            } else if (b.state === "dive") hurt();
            else if (b.state === "hover" || b.state === "aim") hurt();
        }
    }
    function hitBoss() {
        const b = W.boss;
        b.hp--; b.hurtT = 0.5; data().boss = b.hp;
        sfx("bossHit"); shake(5, 0.3); W.freeze = 8; game.vibrate(30);
        addScore(5000, b.x, b.y - 30);
        pixels(b.x, b.y - 10, 22, [PAL.white, PAL.gold, PAL.pink], 170, 400, 0.6);
        if (b.hp <= 0) {
            setBoss("dead"); b.strikes = [];
            song(null); sfx("bossDie");
            for (const a of W.R.actors) if (!a.item && !a.dead && a.mode !== "flip") flipAway(a);
        } else {
            setBoss("hit");
            // Reinforcements fall from the storm once he's angry.
            if (b.hp === 1) for (const x of [b.x0 + 8, b.x1 - 8]) spawnSog(x);
        }
    }
    function spawnSog(x) {
        const a = { kind: "sog3", w: 13, h: 13, x, y: 5 * TILE, vx: x < W.boss.x ? 32 : -32, vy: 0, t: 0, st: 0, mode: "walk", dead: false, speed: 32 };
        addActor(a);
    }
    function finale() {
        H.state = "goal"; H.st = 0; H.vx = H.vy = 0;
        const d = data();
        addScore(10000, H.x, H.y - 20);
        sfx("clear");
        if (!d.cleared.includes(lv.index)) d.cleared.push(lv.index);
        d.finished = true;
        saveProgress();
        W.finale = true;
        s.wait(2.4, () => game.go("ending", {}, { fade: 1 }));
        H.kiteY = 0;
    }

    // --- Camera ---
    function snapCamera() {
        const R = W.R, roomW = R.w * TILE;
        W.camX = roomW <= M.viewW ? roomW / 2 : clamp(H.x + 30, M.viewW / 2, roomW - M.viewW / 2);
        applyCamera(true);
    }
    function stepCamera() {
        const R = W.R, roomW = R.w * TILE;
        if (!W.lockCam) {
            const lookT = H.state === "play" ? H.face * Math.min(1, Math.abs(H.vx) / F.WALK) * Math.min(56, M.viewW * 0.14) : W.look;
            W.look += (lookT - W.look) * 0.03;
            let goal = H.x + W.look;
            let lo = M.viewW / 2, hi = roomW - M.viewW / 2;
            if (W.lock) { const c = (W.lock[0] + W.lock[1]) / 2, half = (W.lock[1] - W.lock[0]) / 2; if (half * 2 <= M.viewW) lo = hi = c; else { lo = W.lock[0] + M.viewW / 2; hi = W.lock[1] - M.viewW / 2; } }
            if (hi < lo) lo = hi = roomW / 2;
            W.camX += (clamp(goal, lo, hi) - W.camX) * (H.state === "play" ? 0.14 : 0.08);
            W.camX = clamp(W.camX, lo, hi);
            // Vertical: rooms that fit never scroll. Tall rooms track the ground you stand on.
            const roomH = R.h * TILE;
            if (roomH <= M.viewH + 2) W.camBottom = roomH;
            else {
                const feet = H.y + H.h / 2, band = M.viewH * 0.22;
                if (H.grounded || feet > W.camBottom - band * 0.6 || feet < W.camBottom - M.viewH + band) W.camGoal = feet + M.viewH * 0.3;
                W.camGoal = clamp(W.camGoal ?? roomH, Math.min(M.viewH, roomH), roomH);
                W.camBottom += (W.camGoal - W.camBottom) * 0.09;
            }
        }
        applyCamera(false);
    }
    function applyCamera(snap) {
        const v = game.view;
        s.cam.zoom = M.zoom;
        const cy = W.camBottom - M.viewH + v.height / 2 / M.zoom;
        camRig.pos.set(W.camX, cy, 0);
        if (snap) { s.cam.follow(camRig, { speed: 0 }); }
    }
    s.on("resize", () => { measure(); snapCamera(); layoutButtons(); });

    // --- Drawing ---
    function drawHero(d) {
        const inv = H.inv > 0 && Math.floor(W.t * 22) % 2 === 0;
        if (inv && H.state === "play") return;
        const big = H.grow > 0 ? (Math.floor(H.grow * 16) % 2 === 0 ? H.big : !!H.growFrom === H.big ? H.big : !H.big) : H.big;
        const name = `${H.form === 2 ? "pipz" : "pip"}_${big ? "b" : "s"}`, sh = big ? 24 : 16;
        let f = HERO_ANIM.idle;
        const A = HERO_ANIM;
        if (H.state === "dead") f = A.front;
        else if (H.state === "goal") f = A.grab;
        else if (H.state === "pipeIn" || H.state === "pipeOut") f = A.idle;
        else if (H.crouch) f = big ? A.crouch : A.idle;
        else if (!H.grounded) f = H.vy < 40 ? A.jump : A.fall;
        else if (H.skid) f = A.skid;
        else if (Math.abs(H.vx) > 8) f = A.run[Math.floor(H.runT / (Math.abs(H.vx) > 130 ? 8 : 7)) % 4];
        else if (H.idleT > 0.2 && Math.floor(W.t * 0.8 % 4 * 8) === 0) f = A.blink;
        else if (H.up) f = A.idle;
        const sx = 1 + H.sq * -0.14, sy = 1 + H.sq * 0.16;
        const w = 16 * (H.sq < 0 ? 1 - H.sq * 0.14 : sx), h = sh * (H.sq < 0 ? 1 + H.sq * 0.18 : sy);
        const col = H.star > 0 ? ["#ffffff", "#ffb0c0", "#ffe38a", "#a8ffc8", "#a8e8ff", "#d8b8ff"][Math.floor(W.t * 20) % 6] : undefined;
        d.sprite(name, { x: 0, y: H.h / 2 - h / 2 + 0.5, width: w, height: h, frame: f, flipX: H.face < 0 && H.state !== "dead", color: col });
    }
    function drawActor(d, a) {
        const t = a.t, k = a.kind;
        switch (k) {
            case "sog": case "sog2": case "sog3":
                if (a.mode === "flat") { d.sprite(k, { y: a.h / 2 - 8, frame: 2, opacity: a.st < 0.15 ? a.st / 0.15 : 1 }); break; }
                d.sprite(k, { y: a.h / 2 - 8, frame: a.flip ? 0 : Math.floor(t * 7) % 2, flipX: a.vx > 0, height: a.flip ? -16 : 16, width: 16 });
                break;
            case "snail": case "snail2":
                if (a.mode === "walk") d.sprite(k, { y: a.h / 2 - 8, frame: Math.floor(t * 5) % 2, flipX: a.vx < 0 });
                else { const wake = a.mode === "shell" && a.st < 1.4 && Math.floor(t * 12) % 2 === 0; d.sprite(`${k}_shell`, { y: a.h / 2 - 8 + (wake ? -1 : 0), frame: a.mode === "slide" ? Math.floor(t * 18) % 4 : 0, height: a.flip ? -16 : 16, width: 16 }); }
                break;
            case "brolly": d.sprite("brolly", { frame: Math.floor(t * 6) % 2, height: a.flip ? -16 : 16, width: 16 }); break;
            case "eel": {
                if (a.mode === "hide") break;
                d.sprite("eel", { y: a.h / 2 - 15, frame: Math.floor(t * 4) % 2, flipX: H.x < a.x });
                break;
            }
            case "drip": d.sprite("drip", { x: a.mode === "shake" ? Math.sin(t * 60) : 0 }); break;
            case "rod": {
                const n = a.n ?? 4;
                d.sprite("gargoyle", { width: 16, height: 16 });
                for (let i = 1; i <= n; i++) d.sprite("sparkball", { x: Math.cos(a.ang) * i * 9, y: Math.sin(a.ang) * i * 9, frame: Math.floor(t * 10 + i) % 2 });
                break;
            }
            case "ember": if (a.mode !== "wait") d.sprite("ember", { frame: Math.floor(t * 8) % 2, height: a.vy > 0 ? -16 : 16, width: 16 }); break;
            case "cannon": d.sprite("cannon", { y: 0 }); break;
            case "bolt": d.sprite("bolt", { frame: Math.floor(t * 8) % 2, flipX: a.vx > 0, height: a.flip ? -14 : 14, width: 16 }); break;
            case "sunberry": case "boot": d.sprite(k, { flipX: a.vx < 0, y: -1 }); break;
            case "zapple": d.sprite("zapple", { frame: Math.floor(t * 8) % 2, y: -1 }); break;
            case "rainbow": d.sprite("rainbow", { frame: Math.floor(t * 12) % 6, y: -1 }); break;
            case "sunorb": d.sprite("glow", { width: 120, height: 120 }); d.sprite("sunorb", { frame: Math.floor(t * 4) % 2, y: Math.sin(t * 3) * 2 }); break;
        }
    }
    function drawBoss(d) {
        const b = W.boss;
        let f = Math.floor(W.t * 3) % 2;
        if (b.state === "aim" || b.state === "dive") f = 2;
        if (b.state === "dizzy") f = 4;
        if (b.state === "hit" || b.hurtT > 0 || b.state === "dead") f = 3;
        if (b.hurtT > 0 && Math.floor(W.t * 30) % 2) return;
        const x = b.state === "aim" ? Math.sin(W.t * 70) * 1.5 : b.state === "dead" ? Math.sin(W.t * 90) * 3 : 0;
        d.sprite("boss", { frame: f, x, y: -2 });
        if (b.state === "dizzy") for (let i = 0; i < 3; i++) { const a = W.t * 5 + i * 2.1; d.sprite("spark", { frame: 1, x: Math.cos(a) * 26, y: -34 + Math.sin(a) * 6 }); }
    }
    function drawProps(d) {
        const R = W.R, t = W.t;
        for (const h of R.hints ?? []) {
            if (Math.abs(H.x - h.c * TILE) > 72 || H.state !== "play") continue;
            const u = M.u, str = game.input.touchMode ? h.touch : h.keys;
            M.u = 1;
            const w = str.length * FONT_ADV + 8, x = h.c * TILE + 8, y = h.r * TILE - 2 + Math.sin(t * 3);
            d.rect(w, 13, { x, y, color: "#0d0a22", opacity: 0.8 });
            say(d, str, x, y, { c: PAL.gold4 });
            M.u = u;
        }
        const sheet = `plat_${R.theme}`;
        for (const p of R.plats) {
            if (p.gone) continue;
            platAt(p, t - DT * (1 - (game._alpha ?? 1)));
            const n = Math.round(p.w / TILE), shake = p.shake ? Math.sin(t * 60) * 0.8 : 0;
            for (let i = 0; i < n; i++) d.sprite(sheet, { x: p.qx - p.w / 2 + i * TILE + 8 + shake, y: p.qy + (p.falling > 0 ? 1 : 0), frame: i === 0 ? 0 : i === n - 1 ? 2 : 1, color: p.kind === "fall" ? "#ffc0a0" : undefined });
        }
        for (const p of R.pads) d.sprite("spring", { x: p.x, y: p.y + 4, frame: p.fx > 0.2 ? 1 : p.fx > 0 ? 2 : 0 });
        for (const c of R.checks) { const x = (c.c + 0.5) * TILE, y = c.r * TILE - 20; d.sprite("checkpoint", { x, y, frame: c.on ? 1 + Math.floor(t * 6) % 2 : 0 }); }
        if (R.goal) {
            const G = R.goal, x = (G.c + 0.5) * TILE, base = G.r * TILE, sway = Math.sin(t * 1.3) * 5;
            const kite = H.state === "goal" && !W.finale ? H.y - 22 * TILE * 0 - 150 : base - 12.2 * TILE;
            const tx = x + sway + 3, ty = kite + 15;
            // The string, drawn as stepped pixels so it stays in style.
            const segs = Math.ceil((base - ty) / 4), hx = x;
            for (let i = 0; i <= segs; i++) {
                const k = i / segs, sag = Math.sin(k * Math.PI) * 3 * Math.sin(t * 1.7 + 1);
                d.rect(1.4, 4.2, { x: Math.round(hx + (tx - hx) * (1 - k) + sag), y: ty + (base - 8 - ty) * k, color: k % 0.2 < 0.1 ? "#fff8ea" : "#ffe9b8" });
            }
            d.sprite("kite", { x: tx, y: kite, frame: Math.floor(t * 4) % 2, width: 48, height: 60 });
            for (let i = 1; i < 7; i++) d.sprite("bow", { x: tx + Math.sin(t * 3 + i) * 4, y: kite + 26 + i * 7, frame: i % 3 });
            d.sprite("peg", { x, y: base - 16 });
        }
    }
    function stepFx() {
        for (const p of W.fx) { p.t += DT; p.vy += p.g * DT; p.x += p.vx * DT; p.y += p.vy * DT; }
        if (W.fx.some((p) => p.t >= p.life)) W.fx = W.fx.filter((p) => p.t < p.life);
    }
    function drawFx(d) {
        const v = viewRect(s);
        for (const p of W.fx) {
            const k = p.t / p.life;
            switch (p.kind) {
                case "pix": { const z = Math.ceil(p.size * (1 - k * 0.6)); d.sprite("px", { x: Math.round(p.x), y: Math.round(p.y), width: z, height: z, color: p.c, opacity: k > 0.7 ? (1 - k) / 0.3 : 1 }); break; }
                case "dust": d.sprite("dust", { x: p.x, y: p.y, frame: Math.min(2, Math.floor(k * 3)), color: THEMES[W.R.theme].style === "grass" ? "#fff8ea" : "#c9c3de", opacity: 0.85 }); break;
                case "spark": d.sprite("spark", { x: p.x, y: p.y, frame: Math.min(3, Math.floor(k * 4)) }); break;
                case "shard": d.sprite("shard", { x: p.x, y: p.y, frame: Math.floor(p.t * 12 + p.spin * 4) % 2, color: THEMES[W.R.theme].brick[0] }); break;
                case "coin": d.sprite(`tiles_${W.R.theme}`, { x: p.x, y: p.y, frame: FR.COIN + Math.floor(p.t * 16) % 4 }); break;
                case "text": {
                    const u = M.u; M.u = 1;
                    say(d, p.str, p.x, p.y, { c: p.c, a: k > 0.7 ? (1 - k) / 0.3 : 1 });
                    M.u = u;
                    break;
                }
            }
        }
        const b = W.boss;
        if (b) for (const st of b.strikes) {
            if (st.t < 0) {
                d.sprite("bolt_warn", { x: st.x, y: ARENA_FLOOR - 10, frame: Math.floor(W.t * 10) % 2 });
                d.rect(2, 8 * TILE, { x: st.x, y: ARENA_FLOOR - 4 * TILE, color: "#ffe36a", opacity: 0.22 });
            } else {
                const y0 = 2 * TILE, h = ARENA_FLOOR - y0;
                for (let y = y0; y < ARENA_FLOOR; y += 32) d.sprite("lightning", { x: st.x, y: y + 16, frame: Math.floor(W.t * 30 + y) % 2 });
                d.rect(30, h, { x: st.x, y: y0 + h / 2, color: "#ffffff", opacity: 0.25 * (1 - st.t / 0.22) });
            }
        }
    }
    function drawWeather(d) {
        const th = THEMES[W.R.theme], v = viewRect(s);
        if (!th.rain || W.sunUp) return;
        const n = th.rain === 2 ? 70 : 42, sp = th.rain === 2 ? 300 : 210, sw = v.w + 80, sh = v.h + 40;
        for (let i = 0; i < n; i++) {
            const hx = (i * 73.13) % 1, a = (i * 127.1) % sw, b = (i * 311.7) % sh;
            const y = ((b + W.t * sp) % sh + sh) % sh + v.top - 20;
            const x = (((a - W.t * sp * 0.34 - v.left * 0.0) % sw) + sw) % sw + v.left - 20 + (hx * 0);
            d.sprite("rain", { x, y, color: th.rain === 2 ? "#b9c8ff" : "#ffe0c8", opacity: th.rain === 2 ? 0.5 : 0.36 });
        }
    }

    // --- HUD ---
    const pauseBtn = s.add([pos(0, 0), ui(), layer(100), tap(() => togglePause()), { name: "pause", size: [44, 44] }]);
    const menuBtns = ["RESUME", "SOUND", "QUIT TO MAP"].map((label, i) => {
        const e = s.add([pos(0, 0), ui(), layer(101), tap(() => choose(i)), { name: `menu${i}` }]);
        e.hidden = true;
        return e;
    });
    function layoutButtons() {
        const v = game.view, b = 44 / v.scale * 1.05;
        pauseBtn.size.set(b, b, 0);
        pauseBtn.pos.set(v.width - v.safe.right - b / 2 - 2, v.safe.top + b / 2 + 2, 0);
        menuBtns.forEach((e, i) => { e.size.set(Math.min(v.width - 40, 220), 44 / v.scale * 1.05, 0); e.pos.set(v.width / 2, M.areaH / 2 - 10 + i * (50 / v.scale * 1.05), 0); });
    }
    layoutButtons();
    function togglePause() {
        if (W.card || W.over || H.state === "dead") return;
        s.paused = !s.paused; W.pausedOn = s.paused; W.pauseSel = 0;
        for (const e of menuBtns) e.hidden = !s.paused;
        sfx("pause");
    }
    function choose(i) {
        if (!s.paused) return;
        const d = data();
        if (i === 0) togglePause();
        else if (i === 1) { d.sound = !d.sound; game.audio.muted = !d.sound; saveProgress(); sfx("select"); }
        else { s.paused = false; for (const e of menuBtns) e.hidden = true; game.go("map", {}, { fade: 0.4 }); }
    }
    s.add([ui(), { name: "pauseCtl", update() {
        const I = s.input;
        if (I.pressed("pause")) togglePause();
        if (!s.paused) return;
        if (I.pressed("down")) { W.pauseSel = (W.pauseSel + 1) % 3; sfx("select"); }
        if (I.pressed("up")) { W.pauseSel = (W.pauseSel + 2) % 3; sfx("select"); }
        if (I.pressed("confirm") || I.pressed("jump")) choose(W.pauseSel);
    } }]);

    function panel(d, x, y, w, h, o = {}) {
        const u = M.u;
        d.rect(w + u * 2, h + u * 2, { x, y, color: PAL.ink });
        d.rect(w, h, { x, y, color: o.c ?? "#3a2460" });
        d.rect(w, u, { x, y: y - h / 2 + u / 2, color: o.hi ?? "#6a4a9e" });
    }
    s.onDrawUI((d) => {
        const v = game.view, u = M.u, top = v.safe.top + 4 * u, L = v.safe.left + 5 * u, Rr = v.width - v.safe.right - 5 * u, dd = data();
        // Portrait: the console deck under the screen.
        if (M.deck) {
            const y0 = M.areaH, n = 32 * u;
            for (let y = y0; y < v.height; y += n) for (let x = 0; x < v.width; x += n) d.sprite("deck", { x: x + n / 2, y: y + n / 2, width: n, height: n });
            d.rect(v.width, u * 2, { x: v.width / 2, y: y0 + u, color: "#ffd23f" });
            d.rect(v.width, u, { x: v.width / 2, y: y0 + u * 2.5, color: PAL.ink });
            say(d, "PUDDLE PIP", v.width / 2, y0 + 12 * u, { c: "#6a4a9e" });
        }
        // Top bar.
        d.rect(v.width, top + 11 * u, { x: v.width / 2, y: (top + 11 * u) / 2 - 1, color: "#0d0a2255" });
        d.sprite("hudpip", { x: L + 8 * u, y: top + 4 * u, width: 16 * u, height: 12 * u });
        say(d, `x${dd.lives}`, L + 16 * u, top + 4 * u, { align: "left" });
        d.sprite("hudcoin", { x: L + 44 * u, y: top + 4 * u, width: 8 * u, height: 8 * u });
        say(d, `x${pad(dd.coins, 2)}`, L + 49 * u, top + 4 * u, { align: "left", c: PAL.gold4 });
        say(d, pad(dd.score, 7), v.width / 2 + (M.portrait ? 18 * u : 0), top + 4 * u);
        const tc = W.time < 60 ? (Math.floor(W.t * 4) % 2 ? "#ff8a7a" : "#ffffff") : "#ffffff", rx = Rr - 18 * u;
        d.sprite("hudclock", { x: rx - 27 * u, y: top + 4 * u, width: 8 * u, height: 8 * u });
        say(d, pad(Math.ceil(W.time), 3), rx, top + 4 * u, { align: "right", c: tc });
        d.sprite("hudpause", { x: pauseBtn.pos.x, y: top + 4 * u, width: 12 * u, height: 12 * u });
        const b = W.boss;
        if (b && b.state !== "dead" && b.hp > 0) {
            const y = top + 16 * u; say(d, "BARON GLOAM", v.width / 2, y, { c: "#ff9db0" });
            for (let i = 0; i < 3; i++) d.sprite("sparkball", { x: v.width / 2 + (i - 1) * 14 * u, y: y + 10 * u, width: 10 * u, height: 10 * u, opacity: i < b.hp ? 1 : 0.2 });
        }
        // Intro card.
        if (W.intro > 0 && !args.retry && !W.card) {
            const a = Math.min(1, W.intro / 0.4), y = top + 32 * u;
            say(d, `WORLD ${lv.id}`, v.width / 2, y - 8 * u, { c: PAL.gold, a });
            say(d, lv.name, v.width / 2, y + (M.portrait ? 5 : 8) * u, { a, s: M.portrait ? 1 : 2 });
        }
        // End-of-level card.
        if (W.card) {
            const c = W.card, k = Math.min(1, c.t / 0.25), y = M.areaH * 0.42 - (1 - k) * 30 * u, w = Math.min(190 * u, v.width - 20), h = 100 * u;
            panel(d, v.width / 2, y, w, h);
            say(d, "STAGE CLEAR!", v.width / 2, y - h / 2 + 12 * u, { c: PAL.gold, s: 1 });
            const lx = v.width / 2 - w / 2 + 12 * u, rxx = v.width / 2 + w / 2 - 12 * u;
            say(d, "KITE", lx, y - 14 * u, { align: "left" }); say(d, W.goalPts ?? 0, rxx, y - 14 * u, { align: "right" });
            say(d, "TIME BONUS", lx, y - 2 * u, { align: "left" }); say(d, c.bonus, rxx, y - 2 * u, { align: "right", c: PAL.gold4 });
            say(d, "SECRETS", lx, y + 10 * u, { align: "left" }); say(d, dd.medals.includes(lv.index) ? "FOUND" : "---", rxx, y + 10 * u, { align: "right", c: dd.medals.includes(lv.index) ? PAL.teal : "#a8a4c0" });
            say(d, "SCORE", lx, y + 24 * u, { align: "left", c: PAL.gold }); say(d, dd.score, rxx, y + 24 * u, { align: "right", c: PAL.gold });
            if (c.phase === 1 && Math.floor(c.t * 3) % 2 === 0) say(d, "TAP", v.width / 2, y + h / 2 - 8 * u, { c: "#a8a4c0" });
        }
        if (W.over) {
            const y = M.areaH * 0.4, a = Math.min(1, W.over.t / 0.4);
            d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#0d0a22", opacity: 0.7 * a });
            say(d, "GAME OVER", v.width / 2, y, { s: 2, c: "#ff8a7a" });
            say(d, `SCORE ${dd.score}`, v.width / 2, y + 24 * u);
            if (W.over.t > 1.2) say(d, "TAP TO TRY AGAIN", v.width / 2, y + 40 * u, { c: PAL.gold4 });
        }
        if (s.paused) {
            d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#0d0a22", opacity: 0.55 });
            const w = Math.min(240, v.width - 24);
            panel(d, v.width / 2, M.areaH / 2 + 10, w, 200 / (v.scale > 1 ? 1 : 1));
            say(d, "PAUSED", v.width / 2, M.areaH / 2 - 62, { c: PAL.gold });
            menuBtns.forEach((e, i) => {
                const lab = i === 1 ? `SOUND ${dd.sound ? "ON" : "OFF"}` : ["RESUME", "", "QUIT TO MAP"][i];
                d.rect(e.size.x, e.size.y - 6, { x: e.pos.x, y: e.pos.y, color: i === W.pauseSel ? "#6a4a9e" : "#2a1a48", radius: 3 });
                say(d, lab, e.pos.x, e.pos.y, { c: i === W.pauseSel ? PAL.gold4 : "#ffffff" });
            });
        }
        // Mosaic wipe for pipes.
        if (W.wipe) {
            const n = 24 * u, k = W.wipeDir === 1 ? W.wipeT : 1 - W.wipeT;
            for (let y = 0; y < v.height; y += n) for (let x = 0; x < v.width; x += n) {
                const q = clamp(k * 2.2 - ((x / n + y / n) % 4) * 0.12 - Math.abs(x - v.width / 2) / v.width * 0.8, 0, 1);
                if (q > 0) d.rect(n * q + 0.6, n * q + 0.6, { x: x + n / 2, y: y + n / 2, color: "#0d0a22" });
            }
        }
    });

    // --- Go ---
    const startRoom = args.check?.room ?? "main", def = lv.rooms[startRoom];
    const sx = args.check?.x ?? (def.start.c + 0.5) * TILE, sy = (args.check?.y ?? def.start.r * TILE) - H.h / 2;
    W.R = null;
    enter(startRoom, { x: sx, y: sy });
    if (args.check) { W.checkAt = args.check; for (const c of W.R.checks) if ((c.c + 0.5) * TILE <= sx + 1) { c.on = true; c.t = 1; } }
    H.grounded = true;
    sizeHero();
    W.time = lv.time;
    applyCamera(true);
    song(THEMES[W.R.theme].music);
    publish();
});

// --- Title ------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    data(); showTouch(false); measure();
    s.background = "#3d93e6";
    const R = TITLE_ROOM(); autotile(R);
    const rig = s.add([pos(0, 0), { name: "cam" }]);
    let t = 0, x = 80, jump = 0, vy = 0, y = 0, go = false;
    const placeCam = () => { rig.pos.set(x + M.viewW * 0.2, R.h * TILE - M.viewH + game.view.height / 2 / M.zoom, 0); s.cam.zoom = M.zoom; };
    placeCam(); s.cam.follow(rig, { speed: 0 });
    s.add([pos(0, 0), layer(-100), { draw(d) { const v = viewRect(s); drawBackdrop(d, "meadow", v.left, v.top, v.w, v.h, R.h * TILE, R.h * TILE, t); drawDecor(d, R, v.left, v.w, t); } }]);
    s.add([pos(0, 0), layer(0), { draw(d) { const v = viewRect(s); drawTiles(d, R, v.left, v.top, v.w, v.h, t); } }]);
    s.add([pos(0, 0), layer(10), { draw(d) {
        const gy = GROUND_Y, f = y < 0 ? (vy < 0 ? HERO_ANIM.jump : HERO_ANIM.fall) : HERO_ANIM.run[Math.floor(t * 12) % 4];
        d.sprite("pip_s", { x, y: gy - 8 + y, frame: f });
        d.sprite("sog", { x: x - 40, y: gy - 7, frame: Math.floor(t * 8) % 2 });
        d.sprite("sog", { x: x - 60, y: gy - 7, frame: Math.floor(t * 8 + 1) % 2 });
    } }]);
    const GROUND_Y = 13 * TILE;
    song("title");
    const tapAll = s.add([pos(0, 0), ui(), tap(() => start()), { name: "start" }]);
    const fit = () => { tapAll.pos.set(game.view.width / 2, game.view.height / 2, 0); tapAll.size.set(game.view.width, game.view.height, 0); measure(); placeCam(); };
    fit(); s.on("resize", fit);
    function start() { if (go) return; go = true; sfx("confirm"); game.go("map", {}, { fade: 0.4 }); }
    s.onUpdate((dt) => {
        t += dt; x += 90 * dt;
        if (x > 3000) x = 80;
        jump -= dt;
        if (jump <= 0 && y === 0) { jump = 1.4 + Math.sin(t) * 0.5; vy = -240; }
        if (vy || y) { vy += 900 * dt; y += vy * dt; if (y >= 0) { y = 0; vy = 0; } }
        placeCam();
        if (s.input.pressed("confirm") || s.input.pressed("jump") || s.input.pointer.tapped) start();
    });
    s.onDrawUI((d) => {
        const v = game.view, u = M.u, a = game.assets.sprite("logo");
        const k = Math.max(1, Math.floor(Math.min(v.width * 0.92 / (a.frameW * u), (v.height * 0.5) / (a.frameH * u)) * 2) / 2);
        const lw = a.frameW * u * k, lh = a.frameH * u * k, cy = M.portrait ? v.height * 0.27 : v.height * 0.3;
        d.sprite("logo", { x: v.width / 2, y: cy + Math.sin(t * 1.6) * 2 * u, width: lw, height: lh });
        const by = M.portrait ? v.height * 0.5 : cy + lh / 2 + 18 * u;
        if (Math.floor(t * 2) % 2 === 0) say(d, game.input.touchMode ? "TAP TO START" : "PRESS ENTER", v.width / 2, by, { c: "#ffffff", s: k > 1.5 ? 2 : 1 });
        const dd = data();
        if (dd.hi) say(d, `HIGH SCORE ${dd.hi}`, v.width / 2, by + 20 * u, { c: PAL.gold4 });
    });
});

// --- Map ----------------------------------------------------------------------------------------------
game.scene("map", (s, args) => {
    const d0 = data(); showTouch(false);
    const zoomMap = () => {
        // The map fills the screen height; on tall phones it pans instead of floating in sea.
        measure();
        const v = game.view, dev = v.scale * Math.min(v.screen.dpr, 3), avail = v.height - 46 * M.u - v.safe.bottom - v.safe.top - 28 * M.u;
        M.zoom = Math.max(M.zoom, Math.floor(avail * dev / 300 + 0.5) / dev);
    };
    zoomMap();
    s.background = "#3580d4";
    song("map");
    d0.level = clamp(d0.level, 0, d0.unlocked);
    let sel = d0.level, t = 0, leaving = false, unlockT = args.justCleared !== undefined ? 1.2 : 0;
    if (args.justCleared !== undefined && args.justCleared + 1 <= d0.unlocked) { sel = Math.min(LEVELS.length - 1, args.justCleared); d0.level = sel; }
    let px = MAP_NODES[sel][0], py = MAP_NODES[sel][1];
    if (d0.finished) { d0.finished = false; }
    const rig = s.add([pos(0, 0), { name: "cam" }]);
    const MW = 660, MH = 300;
    function placeCam(snap) {
        const v = game.view, footer = (46 * M.u + v.safe.bottom) / M.zoom, header = (28 * M.u + v.safe.top) / M.zoom, vw = v.width / M.zoom, vh = v.height / M.zoom - footer - header;
        const cx = vw >= MW ? MW / 2 : clamp(px, vw / 2, MW - vw / 2), cyv = vh >= MH ? MH / 2 : clamp(py, vh / 2, MH - vh / 2);
        const goalX = cx, goalY = cyv + (footer - header) / 2;
        s.cam.zoom = M.zoom;
        if (snap) { rig.pos.set(goalX, goalY, 0); s.cam.follow(rig, { speed: 0 }); }
        else { rig.pos.x += (goalX - rig.pos.x) * 0.1; rig.pos.y += (goalY - rig.pos.y) * 0.1; }
    }
    placeCam(true);
    s.on("resize", () => { zoomMap(); placeCam(true); layoutPlay(); });
    s.add([pos(0, 0), layer(0), { draw(d) {
        d.sprite("mapbg", { x: MW / 2, y: MH / 2 });
        // Path.
        const P = MAP_NODES;
        for (let i = 0; i < P.length - 1; i++) {
            const open = i < d0.unlocked, [ax, ay] = P[i], [bx, by] = P[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / 7);
            for (let k = 1; k < n; k++) {
                const q = k / n, x = ax + (bx - ax) * q, y = ay + (by - ay) * q + Math.sin(q * Math.PI) * 10 * (i % 2 ? 1 : -1);
                const lit = open && !(unlockT > 0 && i === args.justCleared && q > 1 - unlockT / 1.2);
                d.rect(4, 4, { x: Math.round(x), y: Math.round(y), color: PAL.ink });
                d.rect(2, 2, { x: Math.round(x), y: Math.round(y), color: lit ? "#fff8ea" : "#8e87ac" });
            }
        }
        P.forEach(([x, y], i) => {
            const done = d0.cleared.includes(i), f = i > d0.unlocked ? 0 : done ? 2 : 1;
            if (i === 8) d.sprite("mapcastle", { x, y: y - 8, frame: Math.floor(t * 4) % 2 }); else d.sprite("mapnode", { x, y, frame: f });
            if (d0.medals.includes(i)) d.sprite("medal", { x: x + 9, y: y - 9, width: 8, height: 8, frame: Math.floor(t * 6) % 4 });
        });
        const bob = Math.abs(Math.sin(t * 5)) * 2, moving = Math.hypot(px - P[sel][0], py - P[sel][1]) > 1;
        d.sprite("pip_s", { x: px, y: py - 10 - bob, frame: moving ? HERO_ANIM.run[Math.floor(t * 10) % 4] : HERO_ANIM.idle, flipX: px > P[sel][0] + 1 });
    } }]);
    const playBtn = s.add([pos(0, 0), ui(), layer(10), tap(() => enterLevel()), { name: "playLevel" }]);
    function layoutPlay() { const v = game.view; playBtn.size.set(Math.min(240, v.width * 0.7), 46 / v.scale * 1.05, 0); playBtn.pos.set(v.width / 2, v.height - v.safe.bottom - 22 * M.u, 0); }
    layoutPlay();
    function enterLevel() { if (leaving) return; leaving = true; sfx("confirm"); d0.level = sel; game.go("play", { level: sel }, { fade: 0.4 }); }
    s.onUpdate((dt) => {
        t += dt; if (unlockT > 0) unlockT -= dt;
        const I = s.input;
        px += (MAP_NODES[sel][0] - px) * Math.min(1, dt * 8); py += (MAP_NODES[sel][1] - py) * Math.min(1, dt * 8);
        if (I.pressed("right") && sel < d0.unlocked) { sel++; sfx("select"); }
        if (I.pressed("left") && sel > 0) { sel--; sfx("select"); }
        if (I.pressed("confirm") || I.pressed("jump")) enterLevel();
        const p = I.pointer;
        if (p.tapped) {
            const q = s.cam.toWorld([p.x, p.y]);
            MAP_NODES.forEach(([x, y], i) => { if (i <= d0.unlocked && Math.hypot(x - q.x, y - q.y) < 16) { if (i === sel) enterLevel(); else { sel = i; sfx("select"); } } });
        }
        placeCam(false);
    });
    s.onDrawUI((d) => {
        const v = game.view, u = M.u, lv = LEVELS[sel], w = WORLDS[Math.floor(sel / 3)];
        d.rect(v.width, 28 * u + v.safe.top, { x: v.width / 2, y: (28 * u + v.safe.top) / 2, color: "#0d0a22", opacity: 0.8 });
        const lx = v.safe.left + 6 * u, rx = v.width - v.safe.right - 6 * u, y1 = v.safe.top + 7 * u, y2 = y1 + 11 * u;
        say(d, w.name, lx, y1, { align: "left", c: PAL.gold });
        say(d, `x${d0.lives}`, rx, y1, { align: "right" });
        say(d, pad(d0.score, 7), lx, y2, { align: "left" });
        say(d, `${d0.cleared.length}/9 CLEAR  ${d0.medals.length} SECRET`, rx, y2, { align: "right", c: "#a8a4c0" });
        const y = playBtn.pos.y, bw = playBtn.size.x, bh = playBtn.size.y;
        d.rect(v.width, 46 * u + v.safe.bottom, { x: v.width / 2, y: v.height - (46 * u + v.safe.bottom) / 2, color: "#0d0a22", opacity: 0.72 });
        say(d, `${lv.id}  ${lv.name}`, v.width / 2, y - 16 * u, { c: "#ffffff" });
        const by = y + 4 * u, bb = bh * 0.72;
        d.rect(bw + 2 * u, bb + 2 * u, { x: v.width / 2, y: by + u, color: PAL.ink });
        d.rect(bw, bb, { x: v.width / 2, y: by + u, color: PAL.gold3 });
        d.rect(bw, bb - 2 * u, { x: v.width / 2, y: by, color: PAL.gold });
        d.rect(bw, u, { x: v.width / 2, y: by - bb / 2 + 1.5 * u, color: PAL.gold4 });
        say(d, "PLAY", v.width / 2, by, { c: PAL.ink });
    });
});

// --- Ending -------------------------------------------------------------------------------------------
game.scene("ending", (s) => {
    const d0 = data(); showTouch(false); measure();
    s.background = "#3d93e6";
    song("ending");
    let t = 0, gone = false;
    const R = TITLE_ROOM(); autotile(R);
    const rig = s.add([pos(0, 0), { name: "cam" }]);
    rig.pos.set(400, R.h * TILE - M.viewH + game.view.height / 2 / M.zoom, 0); s.cam.zoom = M.zoom; s.cam.follow(rig, { speed: 0 });
    s.add([pos(0, 0), layer(-100), { draw(d) { const v = viewRect(s); drawBackdrop(d, "meadow", v.left, v.top, v.w, v.h, R.h * TILE, R.h * TILE, t); drawDecor(d, R, v.left, v.w, t); drawTiles(d, R, v.left, v.top, v.w, v.h, t);
        d.sprite("sunorb", { x: 400, y: 80 + Math.max(0, 60 - t * 16), frame: Math.floor(t * 3) % 2, width: 80, height: 80 });
        const hop = Math.abs(Math.sin(t * 4)) * 22;
        d.sprite("pip_b", { x: 400, y: 13 * TILE - 12 - hop, frame: hop > 4 ? HERO_ANIM.jump : HERO_ANIM.idle });
    } }]);
    s.every(0.7, () => { sfx("firework"); });
    s.onUpdate((dt) => {
        t += dt;
        if (t > 3 && !gone && (s.input.pressed("jump") || s.input.pressed("confirm") || s.input.pointer.tapped)) { gone = true; d0.lives = START_LIVES; game.go("title", {}, { fade: 0.6 }); }
    });
    s.onDrawUI((d) => {
        const v = game.view, u = M.u, y = M.portrait ? v.height * 0.5 : v.height * 0.3;
        say(d, "THE SUN IS BACK!", v.width / 2, y, { s: 2, c: PAL.gold4 });
        say(d, "PIP FLEW THE KITE HOME", v.width / 2, y + 22 * u);
        say(d, `FINAL SCORE ${d0.score}`, v.width / 2, y + 36 * u, { c: PAL.gold });
        say(d, `SECRETS FOUND ${d0.medals.length}/8`, v.width / 2, y + 48 * u, { c: PAL.teal });
        if (t > 3 && Math.floor(t * 2) % 2) say(d, "TAP TO PLAY AGAIN", v.width / 2, y + 64 * u);
    });
});

// --- Art review (debug only): game.go("sheet", { page: 0 }). ---------------------------------------
game.scene("sheet", (s, args) => {
    showTouch(false); measure();
    s.background = "#5a7a9a";
    const P = [
        [["pip_s", 13], ["pipz_s", 13], ["pip_b", 13], ["pipz_b", 13]],
        [["sog", 3], ["sog2", 3], ["sog3", 3], ["snail", 2], ["snail_shell", 4], ["brolly", 2], ["eel", 2], ["boss", 5], ["sunberry", 1], ["zapple", 2], ["boot", 1], ["rainbow", 6], ["medal", 4], ["kite", 2], ["checkpoint", 3], ["spring", 3]],
        [["tiles_meadow", 57]], [["tiles_dusk", 57]], [["tiles_drain", 57]], [["tiles_keep", 57]], [["tiles_hall", 57]], [["tiles_vault", 57]],
    ][args.page ?? 0];
    s.onDrawUI((d) => {
        const v = game.view, z = args.z ?? 3;
        let x = 8, y = 8, rowH = 0;
        for (const [n, c] of P) {
            const a = game.assets.sprite(n), w = a.frameW * z, h = a.frameH * z;
            for (let f = 0; f < c; f++) {
                if (x + w > v.width - 4) { x = 8; y += rowH + 4; rowH = 0; }
                d.sprite(n, { x: x + w / 2, y: y + h / 2, width: w, height: h, frame: f });
                x += w + 2; rowH = Math.max(rowH, h);
            }
            x = args.flow ? x : 8; if (!args.flow) { y += rowH + 4; rowH = 0; }
        }
    });
});

game.start("title");
