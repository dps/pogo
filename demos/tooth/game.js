// Hollow Tooth: a tiny dentist explores a sleeping giant's mouth to cure a toothache.
import { button, createGame, dim, layer, pin, ui } from "./pogo.js";
import { A, ACID, BEAMDOOR, BOUNCE, castBeam, findHook, CRACK, CRUMBLE, DT, EMPTY, F, FLAP, FOAM, GATE, HARD, isSolid, newHero, ONEWAY, RAIL, ROCK, SEAL, SLICK, SPIKE, SPIKEC, stepHero, TILE, tileAt, UPDRAFT } from "./physics.js";
import { AREAS, buildWorld } from "./world.js";
import { DECO_BY_AREA, NPC_INDEX, PAL, paintArt, palOf } from "./art.js";
import { drawBoss, drawFoes, drawShots, spawnFoe, startBoss, updateBoss, updateFoes, updateShots } from "./actors.js";
import { BOSS_INFO, NPC, PATIENTS, TOOLS } from "./story.js";
import { SFX, SONGS } from "./audio.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#050205",
    touch: { stick: true, buttons: [] },
    actions: { jump: ["Space", "KeyZ", "pad:a"], fire: ["KeyX", "KeyJ", "pad:x"], dash: ["ShiftLeft", "KeyC", "KeyK", "pad:b"], tool: ["KeyV", "KeyL", "pad:y"], map: ["KeyM", "Tab", "pad:select"], pause: ["Escape", "KeyP", "pad:start"], confirm: ["Enter", "pad:a"] },
    seed: 7, maxDpr: 2,
});

const W = buildWorld();
if (W.errors.length) throw new Error("Map errors: " + W.errors.join("; "));
const { FR, PROP } = paintArt(game);
const SAVE = "hollow-tooth-1";
const SECRET_KINDS = ["crown", "baby", "bit"];
const TOTALS = { crowns: 0, babies: 0, bits: 0 };
for (const r of W.rooms) for (const e of r.ents) { if (e.kind === "crown") TOTALS.crowns++; if (e.kind === "baby") TOTALS.babies++; if (e.kind === "bit") TOTALS.bits++; }
const SINKS = W.rooms.flatMap((r) => r.ents.filter((e) => e.kind === "sink").map((e) => ({ ...e, roomName: r.name, area: r.area })));
const FAIRY_STEP = 5;

// Sliding a thumb from one touch button to another should press the new one. Pogo's controls don't do this yet.
{
    const tm = game.touch, move = tm.pointerMove.bind(tm);
    tm.pointerMove = (id, x, y) => {
        move(id, x, y);
        const cur = tm.held.get(id);
        if (!cur) return;
        for (const b of tm.layout()) if (b.action !== cur && Math.hypot(x - b.x, y - b.y) <= b.r * 0.95) {
            tm.held.set(id, b.action);
            if (![...tm.held.values()].includes(cur)) game.input.codeUp(`touch:${cur}`);
            game.input.codeDown(`touch:${b.action}`);
            game.haptics._auto?.("tick");
            break;
        }
    };
}

// ------------------------------------------------------------------------------------------------ Tile visuals.
const rocky = new Uint8Array(32); for (const t of [ROCK, SLICK, CRACK, HARD]) rocky[t] = 1;
const VIS = { M: new Uint8Array(W.cols * W.rows), D: new Uint8Array(W.cols * W.rows) };
function retile(c0, r0, c1, r1) {
    const T = W.T, cols = W.cols, rows = W.rows;
    c0 = Math.max(0, c0); r0 = Math.max(0, r0); c1 = Math.min(cols - 1, c1); r1 = Math.min(rows - 1, r1);
    const open = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows && !rocky[T[r * cols + c]];
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const i = r * cols + c;
        if (!rocky[T[i]]) { VIS.M[i] = VIS.D[i] = 0; continue; }
        const m = (open(c, r - 1) ? 1 : 0) | (open(c + 1, r) ? 2 : 0) | (open(c, r + 1) ? 4 : 0) | (open(c - 1, r) ? 8 : 0);
        VIS.M[i] = m;
        let dist = 3;
        if (m) dist = 0;
        else { outer: for (let q = 1; q <= 2; q++) for (let a = -q; a <= q; a++) for (let b = -q; b <= q; b++) if (open(c + a, r + b)) { dist = q; break outer; } }
        VIS.D[i] = dist;
    }
}
const areaGrid = new Array(W.cols).fill(null);
const areaKey = (c, r) => { const q = W.cellRoom.get(`${Math.floor(c / 30)},${Math.floor(r / 18)}`); return q ? AREAS[q.area].key : null; };

// Each room gets its decorations once, seeded by position.
const hash = (a, b) => { let h = Math.imul(a * 73856093 ^ b * 19349663, 2654435761) >>> 0; h ^= h >>> 15; return (Math.imul(h, 2246822519) >>> 0) / 4294967296; };
function roomDeco(room) {
    if (room.deco) return room.deco;
    const out = [], T = W.base, cols = W.cols, key = AREAS[room.area].key, set = DECO_BY_AREA[key], P = PAL[key];
    for (let r = room.r0 + 1; r < room.r0 + room.nrows - 1; r++) for (let c = room.c0 + 1; c < room.c0 + room.cols - 1; c++) {
        const t = T[r * cols + c], up = T[(r - 1) * cols + c], dn = T[(r + 1) * cols + c];
        if (t !== EMPTY) continue;
        if (dn === ROCK && hash(c, r) < 0.3) {
            const f = set[Math.floor(hash(r, c) * set.length)];
            if (f !== 3 && f !== 7) out.push({ x: (c + 0.5) * TILE, y: (r + 1) * TILE - 12 + 2, f, s: 18 + hash(c * 3, r) * 18, flip: hash(c, r * 3) > 0.5, glow: f === 0 || f === 6 || f === 4, up: false, c: hash(c + 1, r) > 0.5 ? P.deco : P.rim2, ph: hash(c, r + 9) * 6 });
        } else if (up === ROCK && hash(c, r + 5) < 0.18) {
            const f = hash(c + 3, r) > 0.5 ? 3 : 7;
            out.push({ x: (c + 0.5) * TILE, y: r * TILE + 10, f, s: 16 + hash(c * 5, r) * 16, flip: false, glow: false, up: true, c: P.rim2, ph: 0 });
        }
    }
    return room.deco = out;
}
const fxRand = () => game.fxRng.next();

// ------------------------------------------------------------------------------------------------ Save data.
function freshSave() {
    return { abil: 0, flags: {}, taken: {}, broken: [], opened: [], visited: {}, talked: {}, cured: {}, sinks: [], sink: null, hp: 5, maxHp: 5, bits: 0, babies: 0, paid: 0, time: 0, deaths: 0, hard: false, won: false, x: 0, y: 0 };
}
const persist = (sv) => game.save(SAVE, sv);

function resetWorld(sv) {
    W.T.set(W.base);
    for (const [c, r] of sv.broken) floodClear(c, r);
    for (const room of W.rooms) if (room.opts.gate && sv.flags[room.opts.gate]) openGate(room);
    for (const id of sv.opened) { const room = W.byId[id]; for (let r = room.r0; r < room.r0 + room.nrows; r++) for (let c = room.c0; c < room.c0 + room.cols; c++) if (W.T[r * W.cols + c] === BEAMDOOR) floodClear(c, r); }
    retile(0, 0, W.cols - 1, W.rows - 1);
}
function floodList(c, r) {
    const t = tileAt(W, c, r), seen = new Set([r * W.cols + c]), st = [[c, r]], out = [];
    while (st.length) {
        const [a, b] = st.pop(); out.push([a, b]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (b + dy) * W.cols + a + dx; if (W.T[k] === t && !seen.has(k)) { seen.add(k); st.push([a + dx, b + dy]); } }
    }
    return out;
}
function floodClear(c, r) { const t = tileAt(W, c, r); if (t === EMPTY || t === ROCK) return; for (const [a, b] of floodList(c, r)) W.T[b * W.cols + a] = EMPTY; }
function openGate(room) { for (let r = room.r0; r < room.r0 + room.nrows; r++) for (let c = room.c0; c < room.c0 + room.cols; c++) if (W.T[r * W.cols + c] === GATE) W.T[r * W.cols + c] = EMPTY; }

// ------------------------------------------------------------------------------------------------ Shared helpers.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const has = (sv, name) => (sv.abil & A[name]) !== 0;

function sfx(name, haptic) { const q = SFX[name]; if (q) game.sfx(q, haptic ? { haptic } : undefined); }
function setSong(name) { if (game.data.song === name) return; game.data.song = name; try { game.music(SONGS[name]); } catch { /* blocked audio */ } }

function settingsButtons(s, list, y0) {
    const mk = (label, fn) => list.push(s.add([button(label(), { width: 200, height: 44, color: "#2a1a3a", textColor: "#fff", textSize: 15, onTap: function () { fn(); this.text = label(); } }), pin("center", [0, y0]), { label }]));
    return mk;
}

// ------------------------------------------------------------------------------------------------ Title.
game.scene("title", (s) => {
    game.touch.enabled = false;
    setSong("title");
    const saved = game.load(SAVE, null);
    let t = 0;
    const P = PAL.gum;
    s.onUpdate(() => { t++; });
    s.onDraw((d) => {
        const v = s.view, cx = v.width / 2, H = v.height, Wd = v.width, tall = H > Wd;
        d.sprite("glow", { x: cx, y: H * 0.5, width: Wd * 2.2, height: H * 1.5, color: "#7a1a3c", opacity: 0.9 });
        const breath = Math.sin(t / 70) * 5;
        // The giant's sleeping mouth: gums and teeth above and below, slightly parted.
        const size = tall ? 48 : 40, teeth = Math.ceil(Wd / size) + 1, topY = H * (tall ? 0.2 : 0.14) - breath, botY = H * (tall ? 0.8 : 0.88) + breath;
        for (let i = 0; i < teeth; i++) {
            const x = cx + (i - teeth / 2 + 0.5) * size, sick = i === Math.floor(teeth / 2);
            d.sprite("props", { x, y: topY + size * 0.36, width: size + 6, height: size * 1.5, frame: PROP.heart, rot: Math.PI, color: sick ? "#3a1822" : "#fff6e8" });
            d.sprite("props", { x, y: botY - size * 0.36, width: size + 6, height: size * 1.5, frame: PROP.heart, color: "#f4e8d4", rot: 0 });
            if (sick) d.additive(() => d.sprite("glow", { x, y: topY + size / 2, width: 150, height: 110, color: "#ff5c3c", opacity: 0.5 + Math.sin(t / 14) * 0.25 }));
        }
        d.rect(Wd + 40, topY + 20, { x: cx, y: topY / 2 - 8, color: "#b8234f" });
        d.rect(Wd + 40, H - botY + 20, { x: cx, y: (H + botY) / 2 + 8, color: "#96193f" });
        d.additive(() => {
            d.sprite("glow", { x: cx, y: topY - 4, width: Wd * 1.6, height: 60, color: "#ff5c8a", opacity: 0.5 });
            d.sprite("glow", { x: cx, y: botY + 4, width: Wd * 1.6, height: 60, color: "#ff5c8a", opacity: 0.4 });
        });
        const big = Math.min(tall ? 62 : 64, Wd / 6.2), ty = H * (tall ? 0.42 : 0.4);
        d.text("HOLLOW", { x: cx + 2, y: ty - big * 0.52 + 3, size: big, bold: true, color: "#2a0614" });
        d.text("TOOTH", { x: cx + 2, y: ty + big * 0.52 + 3, size: big, bold: true, color: "#2a0614" });
        d.text("HOLLOW", { x: cx, y: ty - big * 0.52, size: big, bold: true, color: "#fff6e8" });
        d.text("TOOTH", { x: cx, y: ty + big * 0.52, size: big, bold: true, color: "#ffd27a" });
        const hx = tall ? cx : cx - 170, hy = tall ? H * 0.585 : H * 0.72;
        d.additive(() => d.sprite("glow", { x: hx, y: hy - 8, width: 150, height: 150, color: "#ffe9c0", opacity: 0.35 }));
        d.sprite("hero", { x: hx, y: hy + Math.sin(t / 24) * 2, width: 60, height: 60, frame: Math.floor(t / 26) % 2 });
        for (let i = 0; i < 3; i++) { const k = ((t + i * 60) % 180) / 180; d.text("z", { x: cx + Wd * 0.3 + k * 30 + i * 6, y: topY + 80 - k * 50, size: 12 + k * 14, bold: true, color: "#ffffff", opacity: Math.sin(k * Math.PI) * 0.6 }); }
    });
    if (!game.input.touchMode) s.onDraw((d) => d.text("Arrows move   Z jump   X drill   C dash   V tool   M map", { x: s.view.width / 2, y: s.view.height - 14, size: 11, color: "#ffffffcc" }));
    const start = (sv) => { sfx("menu", "light"); game.data.sv = sv; game.go("play", {}, { fade: 0.25 }); };
    const portrait = s.view.height > s.view.width;
    const y0 = portrait ? 156 : 70;
    if (saved) {
        s.add([button(saved.won ? "Keep exploring" : "Continue", { action: "confirm", width: 200, height: 52, color: "#ff5c8a", textColor: "#2a0614", textSize: 20, onTap: () => start(saved) }), pin("center", [0, y0])]);
        s.add([button(saved.won ? "New game, hard bite" : "New game", { width: 200, height: 50, color: "#3a1a2c", textColor: "#fff", textSize: 15, onTap: () => start({ ...freshSave(), hard: !!saved.won }) }), pin("center", portrait ? [0, y0 + 58] : [212, y0])]);
    } else s.add([button("Open wide", { action: "confirm", width: 210, height: 56, color: "#ff5c8a", textColor: "#2a0614", textSize: 22, onTap: () => start(freshSave()) }), pin("center", [0, y0])]);
});

// ------------------------------------------------------------------------------------------------ Play.
game.scene("play", (s, args = {}) => {
    const sv = game.data.sv ?? (game.data.sv = freshSave());
    if (args.room) {   // Debug and shot entry: game.go('play', { room, abil }).
        const r = W.byId[args.room];
        sv.abil = args.abil ?? sv.abil; sv.sink = null; sv.x = r.x + 96; sv.y = r.y + r.h - 72;
        if (args.flags) Object.assign(sv.flags, args.flags);
        if (args.at) { sv.x = r.x + args.at[0] * 48; sv.y = r.y + args.at[1] * 48; }
        if (args.hp) { sv.hp = sv.maxHp = args.hp; }
    }
    resetWorld(sv);
    const start = W.rooms.flatMap((r) => r.ents).find((e) => e.kind === "start");
    let spawn = args.room ? { x: sv.x, y: sv.y } : sv.sink ? { x: sv.sink.x, y: sv.sink.y - 8 } : { x: start.x, y: start.y - 8 };
    const H = newHero(spawn.x, spawn.y);
    sv.hp = args.hp ?? sv.maxHp;
    let px = H.x, py = H.y;
    const G = { s, game, W, H, sv, room: W.roomAt(H.x, H.y), foes: [], shots: [], cols: [], boss: null, killed: new Set(), check: null, PROP, sfx: (n, h) => sfx(n, h) };
    game.data.G = G; game.dbg = G;
    game.data.mode = "play";
    let mode = "play", iframes = 0, tick = 0, attackT = 0, attackAim = 0, drillCd = 0, drillAlt = 0, squashX = 1, squashY = 1, lastSafe = { x: H.x, y: H.y }, warpT = 0, near = null, hintT = 0, hint = "", cardAlpha = 0, nameT = 0, nameText = "", bossIntro = 0, deathT = 0, beat = 0, lockedDoors = null, acidRise = 0, acidTop = 0, acidT = 0, recoil = 0, crumbling = [], touchSig = "", floats = [], beamSeg = [], beamCharge = 0, runDust = 0, bossDeadT = 0, wasGrounded = false;
    const latch = { jump: false, fire: false, dash: false, tool: false };
    let dialog = null, card = null, menu = [];
    const motes = [];
    G.setMode = (m) => { mode = m; game.data.mode = m; };
    G.warpTo = (x, y) => { H.x = px = x; H.y = py = y; H.vx = H.vy = 0; H.rope = -1; H.rail = false; lastSafe = { x, y }; G.room = W.roomAt(x, y); enterRoom(G.room, true); snapCam(); };

    const zoomFor = () => { const v = s.view; if (v.height > v.width) return G.boss ? clamp(v.width / (G.room.w + 8), 0.6, 1) : 1; return clamp(v.height / 300, 1, 1.4); };
    const pal = () => palOf(G.room.id);
    s.cam.zoom = zoomFor();

    const say = (str, n = 180) => { hint = str; hintT = n; };
    const floatText = (x, y, str, color = "#fff") => floats.push({ x, y, str, color, t: 0 });
    G.buzz = (h) => game.haptic(h);
    G.dust = (x, y) => s.burst({ at: [x, y], count: 5, color: [pal().rim2, "#ffffff55"], speed: [20, 70], life: [0.2, 0.45], size: [2, 5], gravity: -30, angle: -Math.PI / 2, spread: 1.4 });
    G.spark = (x, y, c) => s.burst({ at: [x, y], count: 6, color: [c ?? "#fff", "#ffffff"], speed: [40, 130], life: [0.1, 0.3], size: [1, 3] });
    G.splat = (x, y, c) => s.burst({ at: [x, y], count: 10, color: [c, "#ffffff88"], speed: [30, 120], life: [0.2, 0.5], size: [2, 5], gravity: 400, angle: -Math.PI / 2, spread: 1.1 });
    G.pop = (f) => s.burst({ at: [f.x, f.y], count: 14, color: [f.color, pal().glow], speed: [40, 170], life: [0.2, 0.5], size: [2, 6], gravity: 200 });

    // -------------------------------------------- Rooms.
    function enterRoom(room, quiet) {
        const prevArea = G.lastArea;
        G.room = room; G.foes = []; G.shots = []; G.cols = []; beamCharge = 0;
        if (!sv.visited[room.id]) { sv.visited[room.id] = 1; }
        for (const e of room.ents) if (e.kind === "foe" && !G.killed.has(e.key) && Math.hypot(e.x - H.x, e.y - H.y) > 54) spawnFoe(G, e);
        if (!quiet) G.check = { ...lastSafe };   // Dying costs one room, never a long walk.
        const bossName = room.opts.boss, bi = bossName && BOSS_INFO[bossName];
        if (bi && sv.flags[bi.flag] && bi.grant && !has(sv, bi.grant) && !G.drop) G.drop = { x: room.x + room.w / 2, y: room.y + room.h - 64, grant: bi.grant, t: 0 };
        if (room.area !== prevArea) {
            G.lastArea = room.area;
            nameText = AREAS[room.area].name; nameT = 200;
            if (!G.boss) setSong(AREAS[room.area].key);
        }
    }
    function bossCheck() {
        const room = G.room, name = room.opts.boss;
        if (!name || G.boss) return;
        const info = BOSS_INFO[name];
        if (sv.flags[info.flag]) return;
        if (H.x < room.x + 44 || H.x > room.x + room.w - 44 || H.y < room.y + 44 || H.rope >= 0) return;
        if (H.y > room.y + room.h - 40) return;
        const e = room.ents.find((q) => q.kind === "boss");
        lockRoom(room);
        G.boss = startBoss(G, name, e);
        if (e && Math.abs(G.boss.x - H.x) < 110) G.boss.x = clamp(H.x < (room.x + room.w / 2) ? room.x + room.w - 110 : room.x + 110, G.boss.left + G.boss.w / 2, G.boss.right - G.boss.w / 2);
        bossIntro = 120;
        game.data.song = null; setSong(name === "ache" ? "ache" : "boss");
        sfx("roar", "heavy"); s.shake(4, 0.5);
    }
    function lockRoom(room) {
        lockedDoors = [];
        for (const dr of room.doors) {
            const c0 = room.c0 + dr.x * 3, r0 = room.r0 + dr.y * 3;
            for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { const k = (r0 + j) * W.cols + c0 + i; lockedDoors.push([k, W.T[k]]); W.T[k] = GATE; }
        }
        sfx("gate", "heavy");
        retile(room.c0 - 2, room.r0 - 2, room.c0 + room.cols + 2, room.r0 + room.nrows + 2);
    }
    function unlockRoom() {
        if (!lockedDoors) return;
        for (const [k, t] of lockedDoors) W.T[k] = t;
        lockedDoors = null;
        if (G.room.opts.gate && sv.flags[G.room.opts.gate]) openGate(G.room);
        retile(G.room.c0 - 2, G.room.r0 - 2, G.room.c0 + G.room.cols + 2, G.room.r0 + G.room.nrows + 2);
    }

    // -------------------------------------------- Camera.
    const camGoal = { x: H.x, y: H.y };
    function camTarget() {
        const v = s.view, z = s.cam.zoom, vw = v.width / z, vh = v.height / z, portrait = v.height > v.width, deck = portrait ? vh * 0.3 : 0, R = G.room;
        const look = H.face * 26 + H.vx * 0.12;
        let tx = H.x + look, ty = H.y - 12 + deck / 2 + clamp(H.vy * 0.1, -10, 30);
        tx = R.w <= vw ? R.x + R.w / 2 : clamp(tx, R.x + vw / 2, R.x + R.w - vw / 2);
        const playH = vh - deck;
        ty = R.h <= playH ? R.y + R.h / 2 + deck / 2 : clamp(ty, R.y + vh / 2 - (portrait ? 30 : 0), R.y + R.h - vh / 2 + deck);
        camGoal.x = tx; camGoal.y = ty;
    }
    function snapCam() { camTarget(); s.cam.pos = [camGoal.x, camGoal.y]; }

    // -------------------------------------------- Damage, death.
    G.hurt = (n, fromX) => {
        if (iframes > 0 || mode !== "play" || warpT > 0) return;
        sv.hp -= n * (sv.assist ? 0.5 : 1); iframes = sv.assist ? 140 : 100; H.rail = false; H.rope = -1; H.dashT = 0;
        const dir = Math.sign(H.x - fromX) || -H.face;
        H.vx = dir * F.KNOCK_X; H.vy = -F.KNOCK_Y; H.launched = true; H.stun = 16; H.grounded = false;
        s.freeze(0.09); s.shake(5, 0.25); s.flash("#ff2a4d55", 0.18);
        sfx("hurt"); game.haptic([30, 30, 50]);
        s.burst({ at: [H.x, H.y], count: 12, color: ["#ffffff", "#ff5c8a"], speed: [50, 170], life: [0.2, 0.5], size: [2, 4], gravity: 300 });
        if (sv.hp <= 0) die();
    };
    function die() {
        sv.hp = 0; sv.deaths++; G.setMode("dead"); deathT = 80; sfx("die"); game.haptic("error"); s.flash("#ffffff", 0.3);
        s.burst({ at: [H.x, H.y], count: 36, color: ["#ffffff", pal().glow], speed: [60, 240], life: [0.4, 0.9], size: [2, 6], gravity: 200 });
    }
    function respawn(toSink) {
        unlockRoom(); G.boss = null; G.setMode("play");
        sv.hp = sv.maxHp; iframes = 90; game.data.song = null; G.lastArea = null;
        if (!toSink && G.check) G.warpTo(G.check.x, G.check.y); else if (sv.sink) G.warpTo(sv.sink.x, sv.sink.y - 8); else G.warpTo(start.x, start.y - 8);
        persist(sv);
    }

    G.hitBoss = (dmg, dir, big) => {
        const b = G.boss;
        if (!b || bossDeadT) return;
        b.hp -= dmg; b.flash = big ? 10 : 6; b.sx = 1.1; b.sy = 0.9;
        s.freeze(big ? 0.1 : 0.05); s.shake(big ? 5 : 2.5, 0.15); sfx("bossHit"); game.haptic(big ? [40, 20, 60] : [22, 12, 22]);
        s.burst({ at: [b.x - dir * b.w * 0.3, b.y], count: big ? 22 : 10, color: [b.color, "#ffffff"], speed: [60, 220], life: [0.2, 0.5], size: [2, 5], gravity: 240 });
        if (b.hp <= 0) bossDown(b);
    };
    function bossDown(b) {
        bossDeadT = 170; G.setMode("cut"); G.shots = []; G.cols = []; s.timeScale = 0.5;
        sfx("boom"); game.haptic([60, 40, 90, 40, 140]); s.shake(9, 1.1);
    }
    function finishBoss(b) {
        const info = BOSS_INFO[b.name];
        sv.flags[info.flag] = 1; s.timeScale = 1; G.boss = null; G.setMode("play"); bossDeadT = 0;
        sv.maxHp++; sv.hp = sv.maxHp;
        unlockRoom();
        game.data.song = null; setSong(AREAS[G.room.area].key);
        sfx("win"); persist(sv);
        if (b.name === "ache") { s.wait(0.6, () => { sv.won = true; persist(sv); game.go("ending", {}, { fade: 1 }); }); return; }
        if (info.grant) G.drop = { x: clamp(b.x, G.room.x + 90, G.room.x + G.room.w - 90), y: G.room.y + G.room.h - 48 - 16, grant: info.grant, t: 0 };
        else say("The way opens.", 200);
    }
    G.acidUp = (px2, n) => { acidTop = px2; acidT = n; };
    G.reflectFx = (b) => { sfx("clank", "medium"); s.burst({ at: [b.x, b.y], count: 10, color: ["#7df9ff", "#fff"], speed: [40, 160], life: [0.2, 0.4], size: [2, 4] }); };

    // -------------------------------------------- Physics callbacks: where the game feel lives.
    const fx = {
        jump() { sfx("jump"); squashX = 0.75; squashY = 1.3; G.dust(H.x, H.y + 8); },
        airJump() { sfx("airJump", "light"); squashX = 0.8; squashY = 1.25; s.burst({ at: [H.x, H.y + 8], count: 12, color: ["#ffffff", "#bfe8ff"], speed: [30, 100], life: [0.2, 0.4], size: [3, 7], angle: Math.PI / 2, spread: 1 }); },
        wallJump(side) { sfx("wallJump", "tick"); squashX = 0.8; squashY = 1.2; G.dust(H.x + side * 6, H.y); },
        land(vy) { const k = clamp(vy / F.MAX_FALL, 0, 1); squashX = 1 + 0.35 * k; squashY = 1 - 0.3 * k; if (k > 0.45) { sfx("land", k > 0.8 ? "light" : "tick"); G.dust(H.x, H.y + 8); if (k > 0.85) s.shake(1.5, 0.08); } },
        dash() { sfx("dash", "medium"); squashX = 1.4; squashY = 0.7; s.shake(1.5, 0.08); s.burst({ at: [H.x, H.y], count: 12, color: ["#7fe8d0", "#ffffff"], speed: [20, 100], life: [0.2, 0.4], size: [3, 7], gravity: -40 }); },
        dashBonk() { sfx("clank", "light"); G.spark(H.x + H.face * 7, H.y, "#7fe8d0"); },
        floss(k) { sfx("floss"); game.haptic([28, 14, 10]); s.burst({ at: [k.x, k.y], count: 8, color: ["#7ff5d8", "#ffffff"], speed: [40, 120], life: [0.15, 0.3], size: [2, 3] }); s.shake(1.2, 0.06); },
        flossMiss() { if (!has(sv, "MIRROR")) sfx("flossMiss"); },
        flossJump() { sfx("flossJump", "light"); squashX = 0.8; squashY = 1.25; },
        rail() { sfx("rail", "medium"); G.spark(H.x, H.y - 10, "#d8e4f0"); },
        splash() { sfx("splash", "light"); G.splat(H.x, H.y, pal().acid); },
        swim() { sfx("swim"); },
        bounce(c, r) { sfx("bounce", "medium"); squashX = 0.7; squashY = 1.4; for (const e of G.room.ents) if (e.kind === "pad" && Math.abs(e.x - H.x) < 30) e.squash = 1; },
        crumble(c, r) { if (!crumbling.some((q) => q.list.some(([a, b]) => a === c && b === r))) { crumbling.push({ list: floodList(c, r), t: 34, st: 0 }); sfx("crack", "tick"); } },
        hazard() { },
        bonk() { },
    };

    // -------------------------------------------- Attack.
    function drillHit() {
        const aim = attackAim, dmg = 1 + sv.bits, hx = aim === 0 ? H.x + H.face * 17 : H.x, hy = aim === 0 ? H.y : H.y + aim * 18;
        const bw = aim === 0 ? 30 : 22, bh = aim === 0 ? 20 : 26;
        let hit = false, pogo = false;
        for (const f of G.foes) {
            if (f.hidden) continue;
            if (Math.abs(f.x - hx) < (f.w + bw) / 2 && Math.abs(f.y - hy) < (f.h + bh) / 2) {
                hit = true; pogo = aim > 0;
                const front = f.kind === "k" && Math.sign(H.x - f.x) === Math.sign(f.vx || f.face) && aim === 0;
                if (front) { sfx("clank", "light"); G.spark(f.x + Math.sign(H.x - f.x) * 10, f.y, "#ffffff"); recoil = -H.face * 90; f.flash = 2; f.vx = -f.vx; f.face = -f.face; f.stun = 70; f.sx = 1.3; continue; }
                f.hp -= dmg; f.flash = 7; f.sx = 1.3; f.sy = 0.75; f.knock = 9; f.kx = H.face * (aim === 0 ? 240 : 0);
                sfx("foeHit"); game.haptic(16); s.freeze(0.04);
                s.burst({ at: [f.x, f.y], count: 6, color: [f.color, "#ffffff"], speed: [40, 140], life: [0.15, 0.3], size: [2, 4] });
                if (f.hp <= 0) {
                    f.dead = true; G.killed.add(f.key); G.pop(f); sfx("foeDie"); s.shake(1.5, 0.08); game.haptic("medium");
                    if (s.rng.chance(0.4)) G.mints = (G.mints ?? []).concat([{ x: f.x, y: f.y - 8, vy: -120, t: 0 }]);
                }
            }
        }
        const b = G.boss;
        if (b && !b.ghost && Math.abs(b.x - hx) < (b.w + bw) / 2 && Math.abs(b.y - hy) < (b.h + bh) / 2) { hit = true; pogo = aim > 0; G.hitBoss(dmg, H.face); }
        // Tiles at the bit's tip.
        const tipX = aim === 0 ? H.x + H.face * 26 : H.x, tipY = aim === 0 ? H.y : H.y + aim * 28;
        const c = Math.floor(tipX / TILE), r = Math.floor(tipY / TILE), t = tileAt(W, c, r);
        if (t === SPIKE && aim > 0) pogo = true;
        if (t === CRACK) {
            hit = true; G.crack = G.crack ?? {};
            const list = floodList(c, r), id = list.map((q) => q[1] * W.cols + q[0]).reduce((a, b) => Math.min(a, b)), n = (G.crack[id] = (G.crack[id] ?? 0) + 1);
            G.spark(tipX, tipY, pal().rim); s.shake(1.5, 0.1); sfx("crack"); game.haptic([10, 10, 10, 10, 10]); s.freeze(0.03);
            if (n >= 3) {
                for (const [a, q] of list) { W.T[q * W.cols + a] = EMPTY; if (hash(a, q) < 0.5) s.burst({ at: [(a + 0.5) * TILE, (q + 0.5) * TILE], count: 3, color: [pal().rim, pal().rock], speed: [40, 170], life: [0.3, 0.7], size: [3, 7], gravity: 500 }); }
                sv.broken.push(list[0]); persist(sv);
                sfx("break", "heavy"); s.shake(4, 0.25); retile(c - 12, r - 12, c + 12, r + 12);
            }
        } else if (t === HARD) {
            if (has(sv, "BURR")) { const list = floodList(c, r); for (const [a, q] of list) W.T[q * W.cols + a] = EMPTY; sv.broken.push(list[0]); persist(sv); sfx("break", "heavy"); s.shake(5, 0.3); retile(c - 12, r - 12, c + 12, r + 12); }
            else { sfx("clank", "light"); G.spark(tipX, tipY, "#ffd27a"); say("Tartar. This needs a Diamond Burr."); recoil = -H.face * 70; }
        } else if (t === FOAM) { sfx("clank"); say(has(sv, "DASH") ? "Dash through foam." : "The drill just skids on this foam."); }
        else if (isSolid(t) && !hit) { G.spark(tipX, tipY, pal().rim2); sfx("clank"); game.haptic(8); recoil = -H.face * 40; }
        if (pogo) { H.vy = -F.POGO; H.cut = false; H.launched = true; H.dashOk = true; H.airJumps = 0; game.haptic("light"); s.burst({ at: [H.x, H.y + 12], count: 6, color: ["#ffe066", "#ffffff"], speed: [40, 120], life: [0.1, 0.25], size: [2, 3] }); }
        else if (hit && aim === 0) recoil = -H.face * 110;
    }

    // -------------------------------------------- Items.
    function collect(e) {
        sv.taken[e.key] = 1;
        if (e.kind === "baby") { sv.babies++; sfx("pick", "light"); floatText(e.x, e.y - 20, `Baby tooth ${sv.babies}/${TOTALS.babies}`, "#ffffff"); }
        if (e.kind === "crown") { sv.maxHp++; sv.hp = sv.maxHp; sfx("crown", "success"); showCard("heart", "Gold Crown", "One more tooth of health."); }
        if (e.kind === "bit") { sv.bits++; sfx("crown", "success"); showCard("bit", "Sharper Drill Bit", "Your drill hits harder."); }
        s.burst({ at: [e.x, e.y - 10], count: 18, color: ["#ffd27a", "#ffffff"], speed: [40, 160], life: [0.3, 0.7], size: [2, 4], gravity: -40 });
        persist(sv);
    }
    function grant(name) {
        sv.abil |= A[name]; const q = TOOLS[name];
        sfx("tool", "success"); game.haptic([40, 40, 40, 40, 120]);
        showCard(q.icon, q.name, q.how);
        s.flash("#ffffff", 0.4); persist(sv); syncTouch(true);
    }
    function showCard(icon, title, body) { card = { icon, title, body, t: 0 }; G.setMode("card"); game.touch.enabled = false; }

    // -------------------------------------------- Touch controls, with labels that follow what you own.
    function syncTouch(force) {
        const b = [{ action: "jump", label: "JUMP" }];
        if (has(sv, "DRILL") || near) b.push({ action: "fire", label: near ? (near.kind === "sink" ? "RINSE" : "TALK") : "DRILL" });
        if (has(sv, "DASH")) b.push({ action: "dash", label: "DASH" });
        if (has(sv, "FLOSS") || has(sv, "MIRROR")) b.push({ action: "tool", label: "TOOL" });
        const sig = b.map((q) => q.label).join();
        if (sig === touchSig && !force) return;
        touchSig = sig;
        game.touch.set({ stick: true, buttons: b });
        game.touch.enabled = true;
    }

    // -------------------------------------------- Menus.
    const menuEnts = [];
    const clearMenu = () => { for (const e of menuEnts) e.destroy(); menuEnts.length = 0; };
    const closeMenu = () => { clearMenu(); G.setMode("play"); game.touch.enabled = true; latch.jump = latch.fire = false; };
    function menuBtn(label, y, fn, o = {}) { const e = s.add([button(label, { width: o.w ?? 220, height: 50, color: o.color ?? "#2a1a3a", textColor: "#fff", textSize: 15, action: o.action, onTap: () => { sfx("menu"); fn(e); } }), o.bottom ? pin("bottom", [0, 8]) : pin("center", [o.x ?? 0, y])]); e.layer = 100; menuEnts.push(e); return e; }
    function openPause() {
        G.setMode("pause"); game.touch.enabled = false; clearMenu();
        const wide = s.view.width > s.view.height, at = (i) => wide ? { x: (i % 2 ? 1 : -1) * 118, y: -84 + Math.floor(i / 2) * 56 } : { x: 0, y: -140 + i * 56 };
        const add = (i, label, fn, o = {}) => menuBtn(label, at(i).y, fn, { ...o, x: at(i).x });
        const sound = () => `Sound: ${game.audio.muted ? "off" : "on"}`, hap = () => `Haptics: ${game.haptics.enabled ? "on" : "off"}`;
        add(0, "Resume", closeMenu, { color: "#ff5c8a" });
        add(1, "Map", () => { clearMenu(); openMap(); });
        add(2, sound(), () => { game.audio.muted = !game.audio.muted; clearMenu(); openPause(); });
        add(3, hap(), () => { game.haptics.enabled = !game.haptics.enabled; clearMenu(); openPause(); game.haptic("medium"); });
        add(4, "Back to last sink", () => { clearMenu(); G.setMode("play"); game.touch.enabled = true; respawn(true); });
        add(5, "Save and quit", () => { persist(sv); game.go("title", {}, { fade: 0.3 }); });
        add(6, `Assist: ${sv.assist ? "on" : "off"}`, () => { sv.assist = !sv.assist; sv.maxHp += sv.assist ? 4 : -4; sv.hp = Math.max(0.5, Math.min(sv.maxHp, sv.hp + (sv.assist ? 4 : 0))); persist(sv); clearMenu(); openPause(); });
    }
    function openMap() { G.setMode("map"); game.touch.enabled = false; clearMenu(); sfx("map", "tick"); menuBtn("Close", 0, () => { closeMenu(); }, { w: 120, color: "#ff5c8a", bottom: true }); }
    function openSink(e) {
        sv.hp = sv.maxHp; iframes = 0; sv.sink = { x: e.x, y: e.y, room: e.room }; if (!sv.sinks.includes(e.key)) sv.sinks.push(e.key);
        persist(sv); sfx("sink", "success"); s.burst({ at: [e.x, e.y - 20], count: 26, color: ["#7fe8ff", "#ffffff"], speed: [30, 120], life: [0.4, 0.9], size: [2, 5], gravity: 120, angle: -Math.PI / 2, spread: 1 });
        const others = SINKS.filter((q) => sv.sinks.includes(q.key) && q.key !== e.key);
        floatText(e.x, e.y - 36, "Rinsed and saved", "#a8f0ff");
        if (!others.length) return;
        G.setMode("sink"); game.touch.enabled = false; clearMenu();
        const portrait = s.view.height > s.view.width, cols = portrait ? 1 : 2, gap = 56, wide = portrait ? 240 : 230, top = -Math.min(s.view.height / 2 - 40, 26 + Math.ceil(others.length / cols) * gap / 2);
        menuBtn("Stay here", top, closeMenu, { color: "#ff5c8a" });
        others.forEach((q, i) => {
            const x = cols === 1 ? 0 : (i % 2 ? 1 : -1) * 120, y = top + gap + 2 + Math.floor(i / cols) * gap;
            menuBtn(`${AREAS[q.area].name}: ${q.roomName}`.slice(0, 34), y, () => { clearMenu(); G.setMode("play"); game.touch.enabled = true; sv.sink = { x: q.x, y: q.y, room: q.room }; s.flash("#a8f0ff", 0.4); sfx("sink", "medium"); G.warpTo(q.x, q.y - 8); }, { x, w: wide });
        });
    }
    function talk(e) {
        const q = NPC[e.npc], again = sv.talked[e.npc];
        let lines = q.lines.slice();
        if (e.npc === "fairy") {
            const due = Math.floor(sv.babies / FAIRY_STEP) - sv.paid;
            if (due > 0) { lines = [`${FAIRY_STEP} baby teeth! Lovely. Don't ask what I do with them.`, "Here's your crown."]; dialog = { q, lines, i: 0, n: 0, pay: due }; G.setMode("talk"); game.touch.enabled = false; return; }
            if (again) lines = [`You have ${sv.babies} baby teeth. I pay every ${FAIRY_STEP}.`];
        } else if (again) lines = [q.cure];
        dialog = { q, lines, i: 0, n: 0, npc: e.npc };
        G.setMode("talk"); game.touch.enabled = false;
    }
    function advanceDialog() {
        const D = dialog;
        if (D.n < D.lines[D.i].length) { D.n = D.lines[D.i].length; return; }
        D.i++; D.n = 0; sfx("menu");
        if (D.i >= D.lines.length) {
            dialog = null; G.setMode("play"); game.touch.enabled = true;
            if (D.npc) { sv.talked[D.npc] = 1; if (D.npc !== "fairy" && !sv.cured[D.npc]) { sv.cured[D.npc] = 1; floatText(H.x, H.y - 30, `Patient seen ${Object.keys(sv.cured).length}/${PATIENTS.length}`, "#7ff5d8"); sfx("pick", "tick"); } }
            if (D.pay) { sv.paid += D.pay; sv.maxHp += D.pay; sv.hp = sv.maxHp; sfx("crown", "success"); showCard("heart", "Gold Crown", "One more tooth of health."); }
            persist(sv);
        }
    }

    // -------------------------------------------- Input is latched from a UI entity, so a press during hit-stop isn't lost.
    function pollInput() {
        const I = s.input;
        if (I.pressed("jump")) latch.jump = true;
        if (has(sv, "DRILL") || near) { if (I.pressed("fire")) latch.fire = true; }
        if (has(sv, "DASH") && I.pressed("dash")) latch.dash = true;
        if ((has(sv, "FLOSS") || has(sv, "MIRROR")) && I.pressed("tool")) latch.tool = true;
    }
    s.add([ui(), { update() { if (s.frozen > 0) pollInput(); } }]);
    s.add([button("II", { width: 50, height: 50, color: "#00000066", textColor: "#fff", textSize: 15, action: "pause", onTap: () => { if (mode === "play") openPause(); else if (mode === "pause") closeMenu(); } }), pin("top-right", [8, 8]), { name: "pauseBtn" }]);
    s.add([button("MAP", { width: 56, height: 50, color: "#00000066", textColor: "#fff", textSize: 13, action: "map", onTap: () => { if (mode === "play") openMap(); else if (mode === "map") closeMenu(); } }), pin("top-right", [64, 8]), { name: "mapBtn" }]);

    // -------------------------------------------- The step.
    s.onUpdate(() => {
        tick++;
        pollInput();
        s.cam.zoom += (zoomFor() - s.cam.zoom) * 0.1;
        if (mode !== "play") {
            const go = latch.jump || latch.fire || s.input.pointer.tapped;
            if (mode === "talk" && go) advanceDialog();
            if (mode === "talk" && dialog) { dialog.t = (dialog.t ?? 0) + 1; if (dialog.t % 2 === 0 && dialog.n < dialog.lines[dialog.i].length) { dialog.n++; if (dialog.n % 4 === 1) sfx("talk"); } }
            if (mode === "card") { card.t++; if (card.t > 30 && go) { card = null; G.setMode("play"); game.touch.enabled = true; syncTouch(true); } }
            if (mode === "dead" && --deathT <= 0) respawn();
            if (mode === "cut" && G.boss) {
                const b = G.boss;
                if (--bossDeadT % 14 === 0) { s.burst({ at: [b.x + (bossDeadT * 37 % b.w) - b.w / 2, b.y + (bossDeadT * 53 % b.h) - b.h / 2], count: 20, color: [b.color, "#ffffff"], speed: [60, 260], life: [0.3, 0.8], size: [3, 7], gravity: 120 }); sfx("boom"); game.haptic("medium"); }
                b.flash = bossDeadT % 8 < 4 ? 3 : 0; b.y += 0.2;
                if (bossDeadT <= 0) { s.flash("#ffffff", 0.6); finishBoss(b); }
            }
            for (const k in latch) latch[k] = false;
            camTarget(); { const p = s.cam.pos; s.cam.pos = [p.x + (camGoal.x - p.x) * 0.1, p.y + (camGoal.y - p.y) * 0.1]; }
            return;
        }
        sv.time += DT;

        // Interaction beats attacking when something's near.
        near = null;
        if (H.grounded) for (const e of G.room.ents) if ((e.kind === "npc" || e.kind === "sink") && Math.abs(e.x - H.x) < 30 && Math.abs(e.y - 8 - H.y) < 26) near = e;
        syncTouch();
        const I = s.input;
        const stickX = I.move.x, right = I.down("right") || stickX > 0.3, left = I.down("left") || stickX < -0.3;
        const inp = { dir: (right ? 1 : 0) - (left ? 1 : 0), up: I.down("up"), down: I.down("down"), jump: I.down("jump"), jumpP: latch.jump, dashP: latch.dash, toolP: latch.tool, tool: (has(sv, "FLOSS") || has(sv, "MIRROR")) && I.down("tool") };
        const firePressed = latch.fire;
        for (const k in latch) latch[k] = false;
        if (near && firePressed) { if (near.kind === "npc") talk(near); else openSink(near); return; }

        // Attack: press to drill, hold to keep drilling.
        if (drillCd > 0) drillCd--;
        if (attackT > 0) attackT--;
        if ((firePressed || (has(sv, "DRILL") && I.down("fire"))) && drillCd <= 0 && has(sv, "DRILL") && H.rope < 0 && !H.rail) {
            attackT = 13; drillCd = firePressed ? 13 : 17; attackAim = inp.up ? -1 : inp.down && !H.grounded ? 1 : 0; drillAlt = 1 - drillAlt;
            sfx("drill"); game.haptic("tick"); drillHit();
        }
        if (recoil) { H.vx += recoil * (H.grounded ? 0.7 : 0.4); recoil = 0; }

        px = H.x; py = H.y;
        const wasRope = H.rope >= 0;
        if (warpT > 0) {
            if (--warpT === 12) { H.x = lastSafe.x; H.y = lastSafe.y; H.vx = H.vy = 0; H.hazard = 0; snapCam(); px = H.x; py = H.y; }
        } else {
            stepHero(H, inp, W, sv.abil, fx);
        }
        if (H.hazard && warpT <= 0) {
            const kind = H.hazard; H.hazard = 0; H.rope = -1; H.rail = false; H.dashT = 0;
            sv.hp -= (sv.hard ? 1 : 0.5) * (sv.assist ? 0.5 : 1); iframes = Math.max(iframes, 60);
            sfx("hurt"); game.haptic([30, 30, 50]); s.shake(5, 0.2); s.flash(kind === 2 ? pal().acid + "88" : "#ff2a4d66", 0.25); G.splat(H.x, H.y, kind === 2 ? pal().acid : "#ffffff");
            if (kind === 2) sfx("splash");
            if (sv.hp <= 0) die(); else warpT = 26;
        }
        if (H.grounded && !H.hazard && warpT <= 0 && tileAt(W, Math.floor(H.x / TILE), Math.floor((H.y + 9) / TILE)) !== CRUMBLE && Math.abs(H.vx) < 200) {
            // Remember safe ground, away from ledges.
            const c = Math.floor(H.x / TILE), r = Math.floor((H.y + 9) / TILE);
            if (isSolid(tileAt(W, c - 1, r)) && isSolid(tileAt(W, c + 1, r))) lastSafe = { x: H.x, y: H.y };
        }
        if (H.grounded && Math.abs(H.vx) > 90 && ++runDust % 11 === 0) { G.dust(H.x - H.face * 4, H.y + 8); }
        wasGrounded = H.grounded;
        if (H.wall && tick % 5 === 0) { G.dust(H.x + H.wall * 6, H.y + 4); if (tick % 15 === 0) game.haptic("tick"); }
        if (iframes > 0) iframes--;

        // Room change: keep momentum, slide the camera.
        if (H.x < G.room.x || H.x >= G.room.x + G.room.w || H.y < G.room.y || H.y >= G.room.y + G.room.h) {
            const next = W.roomAt(H.x, H.y);
            if (next && next !== G.room) enterRoom(next);
        }
        bossCheck();
        updateFoes(G); updateBoss(G); updateShots(G);

        // Crumbling sugar.
        for (const q of crumbling) {
            q.t--;
            if (q.t === 0 && q.st === 0) { q.st = 1; q.t = 220; for (const [a, b] of q.list) W.T[b * W.cols + a] = EMPTY; sfx("crack"); const m = q.list[1] ?? q.list[0]; s.burst({ at: [(m[0] + 0.5) * TILE, (m[1] + 0.5) * TILE], count: 12, color: [pal().rim, "#fff"], speed: [20, 90], life: [0.3, 0.7], size: [2, 5], gravity: 500 }); }
            else if (q.t === 0 && q.st === 1) { for (const [a, b] of q.list) W.T[b * W.cols + a] = CRUMBLE; q.st = 2; }
        }
        crumbling = crumbling.filter((q) => q.st < 2);

        // Pickups.
        for (const e of G.room.ents) if (SECRET_KINDS.includes(e.kind) && !sv.taken[e.key] && Math.abs(e.x - H.x) < 16 && Math.abs(e.y - 10 - H.y) < 20) collect(e);
        for (const e of G.room.ents) if (e.kind === "pedestal" && e.pick && !sv.taken[e.key] && Math.abs(e.x - H.x) < 18 && Math.abs(e.y - 12 - H.y) < 26) { sv.taken[e.key] = 1; grant(e.pick); }
        if (G.drop) { G.drop.t++; if (G.drop.t > 50) { G.drop.x += (H.x - G.drop.x) * 0.07; G.drop.y += (H.y - G.drop.y) * 0.07; } if (Math.abs(G.drop.x - H.x) < 18 && Math.abs(G.drop.y - H.y) < 26 && G.drop.t > 30) { const g = G.drop.grant; G.drop = null; grant(g); } }
        if (G.mints) { for (const m of G.mints) { m.t++; m.vy += 6; m.y += m.vy / 60; if (m.vy > 0 && isSolid(tileAt(W, Math.floor(m.x / TILE), Math.floor((m.y + 6) / TILE)))) { m.vy = 0; } if (Math.hypot(m.x - H.x, m.y - H.y) < 16 && sv.hp < sv.maxHp) { sv.hp = Math.min(sv.maxHp, sv.hp + 1); m.t = 1e6; sfx("pick", "light"); floatText(H.x, H.y - 18, "+1", "#7ff5d8"); } if (m.t > 420) m.t = 1e6; } G.mints = G.mints.filter((m) => m.t < 1e6); }

        updateBeams();

        // Heartbeat at low health: you feel it before you see it.
        if (sv.hp <= 1 || sv.hp / sv.maxHp <= 0.25) { if (++beat % 62 === 1) { sfx("heartbeat"); game.haptic([24, 110, 34]); } } else beat = 0;
        if (G.drilling) G.drilling = false;

        // Camera.
        camTarget();
        const k = H.vy > 280 ? 0.2 : 0.12;
        { const p = s.cam.pos; s.cam.pos = [p.x + (camGoal.x - p.x) * k, p.y + (camGoal.y - p.y) * k]; }

        // Reflux tide in that one arena.
        if (acidT > 0) { acidT--; acidRise += ((acidT > 40 ? acidTop : 0) - acidRise) * 0.05; if (G.room.opts.boss === "reflux" && H.y + 8 > G.room.y + G.room.h - 48 - acidRise && !has(sv, "COAT")) G.hurt(1, H.x); } else acidRise *= 0.9;

        squashX += (1 - squashX) * 0.2; squashY += (1 - squashY) * 0.2;
        hintT = Math.max(0, hintT - 1); nameT = Math.max(0, nameT - 1); bossIntro = Math.max(0, bossIntro - 1);
        for (const f of floats) f.t++; floats = floats.filter((f) => f.t < 90);
        updateMotes();
        if (tick % 600 === 0) persist(sv);
        game.data.room = G.room.id;
    });

    function updateBeams() {
        beamSeg.length = 0;
        const room = G.room, R = room.ents.filter((e) => e.kind === "receptor");
        for (const e of room.ents) {
            if (e.kind !== "emitter") continue;
            if (sv.opened.includes(room.id)) continue;
            const start = { x: e.dx ? e.x + e.dx * 14 : e.x, y: e.dx ? e.y + 12 + 2 : e.y + 12 };
            const end = castBeam(W, start.x, start.y, e.dx, e.dy);
            const hitH = e.dx ? Math.abs(H.y - start.y) < 12 && (H.x - start.x) * e.dx > 0 && (end.x - H.x) * e.dx > 0 : Math.abs(H.x - start.x) < 9 && H.y > start.y && H.y < end.y;
            if (!hitH) { beamSeg.push([start, end]); continue; }
            if (H.mirror || has(sv, "MIRROR")) {
                const mid = { x: e.dx ? H.x : start.x, y: e.dx ? start.y : H.y };
                beamSeg.push([start, mid]);
                const up = e.dx ? (I2().down("down") ? 1 : -1) : 0, side = e.dy ? H.face : 0;
                const e2 = castBeam(W, mid.x, mid.y, side, up);
                beamSeg.push([mid, e2]);
                if (tick % 6 === 0) { sfx("beam"); game.haptic("tick"); }
                for (const q of R) {
                    const ok = up ? Math.abs(q.x - mid.x) < 14 && (q.y - mid.y) * up > 0 && (e2.y - q.y) * up > -16 : Math.abs(q.y - mid.y) < 14 && (q.x - mid.x) * side > 0;
                    if (ok) {
                        beamCharge++;
                        if (beamCharge > 36) {
                            sv.opened.push(room.id); sfx("open", "success"); s.shake(4, 0.4); persist(sv);
                            for (let r = room.r0; r < room.r0 + room.nrows; r++) for (let c = room.c0; c < room.c0 + room.cols; c++) if (W.T[r * W.cols + c] === BEAMDOOR) { for (const [a, b] of floodList(c, r)) W.T[b * W.cols + a] = EMPTY; }
                            sv.broken = sv.broken.filter(Boolean); retile(room.c0 - 6, room.r0 - 6, room.c0 + room.cols + 6, room.r0 + room.nrows + 6);
                            say("The light door opens.");
                        }
                    }
                }
            } else {
                beamSeg.push([start, end]);
                G.hurt(1, H.x - e.dx * 10);
                if (e.dx) H.vy = -160;
            }
        }
    }
    const I2 = () => s.input;

    function updateMotes() {
        const v = s.view, z = s.cam.zoom, x0 = s.cam.pos.x - v.width / 2 / z, y0 = s.cam.pos.y - v.height / 2 / z;
        while (motes.length < 36) motes.push({ x: x0 + fxRand() * v.width / z, y: y0 + fxRand() * v.height / z, vx: (fxRand() - 0.5) * 8, vy: -4 - fxRand() * 8, r: 3 + fxRand() * 8, ph: fxRand() * 6 });
        for (const m of motes) {
            m.x += m.vx / 60; m.y += m.vy / 60;
            if (m.x < x0 - 20) m.x += v.width / z + 40; if (m.x > x0 + v.width / z + 20) m.x -= v.width / z + 40;
            if (m.y < y0 - 20) m.y += v.height / z + 40; if (m.y > y0 + v.height / z + 20) m.y -= v.height / z + 40;
        }
    }

    // -------------------------------------------- Drawing: parallax, tiles, objects, then light.
    const viewRect = () => { const v = s.view, z = s.cam.zoom; return { w: v.width / z, h: v.height / z, x: s.cam.pos.x - v.width / 2 / z, y: s.cam.pos.y - v.height / 2 / z }; };
    s.add([dim(2), layer(-10), { draw(d) {
        const P = pal(), r = viewRect();
        d.rect(r.w + 8, r.h + 8, { x: r.x + r.w / 2, y: r.y + r.h / 2, color: P.sky[1] });
        d.sprite("glow", { x: r.x + r.w * 0.5, y: r.y + r.h * 0.42, width: r.w * 1.6, height: r.h * 1.5, color: P.sky[0], opacity: 1 });
        // Far arches, then near fangs, at different speeds.
        const layer = (name, f, scale, color, op, y) => {
            const w = 512 * scale, h = 256 * scale, ox = ((r.x * f) % w + w) % w;
            for (let x = r.x - ox; x < r.x + r.w + w; x += w) d.sprite(name, { x: x + w / 2, y, width: w + 1, height: h, color, opacity: op });
            if (y - h / 2 > r.y) d.rect(r.w + 8, y - h / 2 - r.y + 2, { x: r.x + r.w / 2, y: (r.y + y - h / 2) / 2, color, opacity: op });
            if (y + h / 2 < r.y + r.h) d.rect(r.w + 8, r.y + r.h - y - h / 2 + 2, { x: r.x + r.w / 2, y: (r.y + r.h + y + h / 2) / 2, color, opacity: op });
        };
        layer("far", 0.8, 1.6, P.far, 0.7, r.y + r.h / 2 - ((r.y * 0.2) % 60 + 60) % 60 + 30);
        layer("near", 0.6, 1.5, P.near, 0.95, r.y + r.h / 2 - ((r.y * 0.1) % 40 + 40) % 40 + 20);
    } }]);

    s.add([dim(2), layer(0), { draw(d) { drawWorld(d); } }]);
    s.add([dim(2), layer(5), { draw(d) { drawEnts(d); drawFoes(G, d); drawBoss(G, d); drawHero(d); drawShots(G, d); } }]);

    const rimLights = [];
    function drawWorld(d) {
        const P = pal(), r = viewRect(), T = W.T, cols = W.cols, M = VIS.M, D = VIS.D;
        const c0 = Math.max(0, Math.floor(r.x / TILE) - 1), c1 = Math.min(cols - 1, Math.ceil((r.x + r.w) / TILE) + 1), r0 = Math.max(0, Math.floor(r.y / TILE) - 1), r1 = Math.min(W.rows - 1, Math.ceil((r.y + r.h) / TILE) + 1);
        // Behind-the-rock decorations.
        const deco = roomDeco(G.room);
        for (const q of deco) { if (q.up || q.x < r.x - 40 || q.x > r.x + r.w + 40 || q.y < r.y - 40 || q.y > r.y + r.h + 40) continue; d.sprite("deco", { x: q.x, y: q.y - q.s / 2 + 12, width: q.s, height: q.s, frame: q.f, flipX: q.flip, color: q.c }); }
        for (const q of deco) { if (!q.up || q.x < r.x - 40 || q.x > r.x + r.w + 40 || q.y < r.y - 40 || q.y > r.y + r.h + 40) continue; d.sprite("deco", { x: q.x, y: q.y + q.s / 2 - 12, width: q.s, height: q.s * (1 + Math.sin(tick / 50 + q.x) * 0.06), frame: q.f, color: q.c }); }
        rimLights.length = 0;
        const specials = [], fallback = `tiles_${AREAS[G.room.area].key}`;
        let sheet = fallback, lastCell = -1;
        for (let rr = r0; rr <= r1; rr++) {
            let c = c0;
            const y = (rr + 0.5) * TILE;
            while (c <= c1) {
                const i = rr * cols + c, t = T[i];
                const cell = Math.floor(c / 30) * 1000 + Math.floor(rr / 18);
                if (cell !== lastCell) { lastCell = cell; const k = areaKey(c, rr); sheet = k ? `tiles_${k}` : fallback; }
                if (!rocky[t]) { if (t) specials.push(c, rr, t); c++; continue; }
                const dist = D[i];
                if (dist === 0) {
                    if ((M[i] & 1) && c % 3 === 0) rimLights.push(c, rr);
                    d.sprite(sheet, { x: (c + 0.5) * TILE, y, width: 18, height: 18, frame: M[i] + (((c * 7 + rr * 13) & 1) << 4) });
                    c++;
                } else {
                    let e = c + 1; const lim = (Math.floor(c / 30) + 1) * 30;
                    while (e <= c1 && e < lim && rocky[T[rr * cols + e]] && D[rr * cols + e] >= 1) e++;
                    d.sprite(sheet, { x: (c + e) / 2 * TILE, y, width: (e - c) * TILE + 2, height: 18, frame: 0 });
                    c = e;
                }
            }
        }
        // Neighbouring rooms fall away into the dark.
        { const R = G.room, x0 = r.x - 4, x1 = r.x + r.w + 4, y0 = r.y - 4, y1 = r.y + r.h + 4, c = P.deep, o = 0.86;
            if (R.y > y0) d.rect(x1 - x0, R.y - y0, { x: (x0 + x1) / 2, y: (y0 + R.y) / 2, color: c, opacity: o });
            if (R.y + R.h < y1) d.rect(x1 - x0, y1 - R.y - R.h, { x: (x0 + x1) / 2, y: (y1 + R.y + R.h) / 2, color: c, opacity: o });
            if (R.x > x0) d.rect(R.x - x0, R.h, { x: (x0 + R.x) / 2, y: R.y + R.h / 2, color: c, opacity: o });
            if (R.x + R.w < x1) d.rect(x1 - R.x - R.w, R.h, { x: (x1 + R.x + R.w) / 2, y: R.y + R.h / 2, color: c, opacity: o });
        }
        // Special tiles.
        const wave = tick / 12;
        for (let i = 0; i < specials.length; i += 3) {
            const c = specials[i], rr = specials[i + 1], t = specials[i + 2], x = (c + 0.5) * TILE, y = (rr + 0.5) * TILE;
            if (t === CRACK || t === HARD) continue;
            switch (t) {
                case ONEWAY: d.sprite("props", { x, y: y - 3, width: 19, height: 13, frame: PROP.ledge, color: P.rim2 }); break;
                case SEAL: d.sprite("props", { x, y: y - 3, width: 19, height: 13, frame: PROP.ledge, color: P.rim }); break;
                case FLAP: if (c % 3 === 1 && rr % 3 === 1) { d.sprite("props", { x, y, width: 46, height: 46, frame: PROP.foam, color: "#ffc2d1", opacity: 0.55 }); d.text("<", { x: x - Math.sin(tick / 16) * 3, y, size: 20, bold: true, color: "#ffffff", opacity: 0.7 }); } break;
                case SPIKE: d.sprite("props", { x, y: y - 2, width: 18, height: 22, frame: PROP.spike, color: P.rim }); break;
                case SPIKEC: d.sprite("props", { x, y: y + 2, width: 18, height: 22, frame: PROP.spikeC, color: P.rim }); break;
                case CRUMBLE: { const sh = crumbling.some((q) => q.st === 0 && q.list.some(([a, b]) => a === c && b === rr)) ? Math.sin(tick) * 1.2 : 0; d.sprite("props", { x: x + sh, y: y - 2, width: 19, height: 16, frame: PROP.crumble, color: P.rim }); break; }
                case FOAM: d.sprite("props", { x: x + Math.sin(tick / 20 + rr) * 0.7, y, width: 20, height: 20, frame: PROP.foam, opacity: 0.92 }); break;
                case GATE: d.sprite("props", { x, y, width: 18, height: 18, frame: PROP.gate, color: P.rim }); break;
                case BEAMDOOR: d.sprite("props", { x, y, width: 18, height: 18, frame: PROP.beamdoor }); break;
                case RAIL: d.sprite("props", { x, y: y - 3, width: 17, height: 16, frame: PROP.rail, color: "#d8e4f0" }); break;
                default: break;
            }
        }
        // Cracked and tartar blocks, one drawing per 3x3.
        for (let i = 0; i < specials.length; i++) { }
        for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
            const t = T[rr * cols + c];
            if ((t === CRACK || t === HARD) && c % 3 === 0 && rr % 3 === 0) {
                if (t === HARD) d.sprite("props", { x: (c + 1.5) * TILE, y: (rr + 1.5) * TILE, width: 50, height: 50, frame: PROP.hard });
                else d.sprite("props", { x: (c + 1.5) * TILE, y: (rr + 1.5) * TILE, width: 44, height: 44, frame: PROP.crack, opacity: 0.6 + Math.sin(tick / 22) * 0.25, color: P.rim });
            }
        }
        // Acid: bodies first, then a moving, glowing surface.
        for (let rr = r0; rr <= r1; rr++) {
            let c = c0;
            while (c <= c1) {
                if (T[rr * cols + c] !== ACID || (rr > 0 && T[(rr - 1) * cols + c] === ACID)) { c++; continue; }
                let e = c; while (e <= c1 && T[rr * cols + e] === ACID && T[(rr - 1) * cols + e] !== ACID) e++;
                let deepN = 1; while (T[(rr + deepN) * cols + c] === ACID) deepN++;
                d.rect((e - c) * TILE, deepN * TILE, { x: (c + e) / 2 * TILE, y: (rr + deepN / 2) * TILE, color: P.acid, opacity: 0.42 });
                c = e;
            }
        }
        d.additive(() => {
            for (let i = 0; i < rimLights.length; i += 2) {
                const c = rimLights[i], rr = rimLights[i + 1];
                d.sprite("glow", { x: (c + 0.5) * TILE, y: rr * TILE + 3, width: 64, height: 26, color: P.glow, opacity: 0.1 + Math.sin(tick / 45 + c * 0.35 + rr) * 0.05 });
            }
            for (let i = 0; i < specials.length; i += 3) {
                const t = specials[i + 2], c = specials[i], rr = specials[i + 1];
                if (t === ACID && T[(rr - 1) * cols + c] !== ACID) {
                    const x = (c + 0.5) * TILE, y = rr * TILE + 2 + Math.sin(wave + c * 0.7) * 1.4;
                    d.rect(TILE + 1, 2.5, { x, y, color: P.acid, opacity: 0.9 });
                    if (c % 2 === 0) d.sprite("glow", { x, y: y + 2, width: 56, height: 34, color: P.acid, opacity: 0.16 });
                }
                if (t === UPDRAFT && (c + rr * 3) % 7 === 0) {
                    const x = (c + 0.5) * TILE, y = (rr + 0.5) * TILE - ((tick * 2 + c * 31 + rr * 17) % 40) + 20;
                    d.rect(1.6, 12, { x, y, color: "#ffffff", opacity: 0.22 });
                }
            }
        });
    }

    function drawEnts(d) {
        const P = pal(), room = G.room;
        for (const e of room.ents) {
            const bob = Math.sin(tick / 20 + e.x) * 2;
            switch (e.kind) {
                case "sink": d.sprite("props", { x: e.x, y: e.y - 18, width: 40, height: 40, frame: sv.sinks.includes(e.key) ? PROP.sinkOn : PROP.sink }); break;
                case "npc": d.sprite("npc", { x: e.x, y: e.y - 12, width: 32, height: 32, frame: NPC_INDEX[e.npc] * 2 + (Math.floor(tick / 30) & 1), flipX: H.x < e.x }); if (!sv.talked[e.npc]) d.text("!", { x: e.x, y: e.y - 36 + bob, size: 14, bold: true, color: "#ffe066" }); break;
                case "pedestal": d.sprite("props", { x: e.x, y: e.y - 14, width: 30, height: 30, frame: PROP.pedestal }); if (!sv.taken[e.key]) d.sprite("props", { x: e.x, y: e.y - 36 + bob, width: 30, height: 30, frame: PROP[TOOLS[e.pick]?.icon ?? "toolDrill"] }); break;
                case "crown": if (!sv.taken[e.key]) d.sprite("props", { x: e.x, y: e.y - 14 + bob, width: 26, height: 26, frame: PROP.crown }); break;
                case "baby": if (!sv.taken[e.key]) d.sprite("props", { x: e.x, y: e.y - 10 + bob, width: 18, height: 18, frame: PROP.baby }); break;
                case "bit": if (!sv.taken[e.key]) d.sprite("props", { x: e.x, y: e.y - 14 + bob, width: 24, height: 24, frame: PROP.bit }); break;
                case "pad": { e.squash = (e.squash ?? 0) * 0.86; d.sprite("props", { x: e.x, y: e.y - 8, width: 48, height: 26 * (1 - (e.squash ?? 0) * 0.5), frame: PROP.pad }); break; }
                case "emitter": d.sprite("props", { x: e.x + (e.dx ? 0 : 0), y: e.dx ? e.y + 12 : e.y, width: 30, height: 30, frame: PROP.emitter, flipX: e.dx < 0, rot: e.dy ? Math.PI / 2 : 0 }); break;
                case "receptor": d.sprite("props", { x: e.x, y: e.y, width: 32 + Math.sin(tick / 8) * (beamCharge ? 3 : 0), height: 32, frame: PROP.receptor }); break;
                default: break;
            }
        }
        if (G.drop) { const bob = Math.sin(tick / 16) * 3; d.additive(() => d.sprite("glow", { x: G.drop.x, y: G.drop.y, width: 110, height: 110, color: "#ffd27a", opacity: 0.6 })); d.sprite("props", { x: G.drop.x, y: G.drop.y - 4 + bob, width: 34, height: 34, frame: PROP[TOOLS[G.drop.grant].icon] }); }
        if (G.mints) for (const m of G.mints) d.sprite("props", { x: m.x, y: m.y, width: 12, height: 12, frame: PROP.mint });
        for (const [a, b] of beamSeg) {
            d.additive(() => {
                const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
                d.rect(dx ? len : 7, dx ? 7 : len, { x: mx, y: my, color: "#ffe066", opacity: 0.35 + Math.sin(tick / 2) * 0.08 });
                d.rect(dx ? len : 2.4, dx ? 2.4 : len, { x: mx, y: my, color: "#ffffff", opacity: 0.95 });
            });
        }
        if (near) d.text(near.kind === "sink" ? "RINSE" : "TALK", { x: near.x, y: near.y - (near.kind === "sink" ? 50 : 42), size: 9, bold: true, color: "#ffffff" });
    }

    function heroFrame() {
        if (mode === "dead") return FR.hurt;
        if (H.stun > 0) return FR.hurt;
        if (attackT > 6) return attackAim < 0 ? FR.drillUp : attackAim > 0 ? FR.drillDown : FR.drill;
        if (H.mirror) return FR.mirror;
        if (H.rope >= 0) return FR.swing;
        if (H.rail) return FR.hang;
        if (H.dashT > 0) return FR.dash;
        if (H.gliding) return FR.chute;
        if (H.wall) return FR.wall;
        if (!H.grounded) return H.vy < 40 ? FR.jump : FR.fall;
        if (Math.abs(H.vx) > 16) return FR.run0 + (Math.floor(tick / 5) % 4);
        return FR.idle0 + (Math.floor(tick / 30) & 1);
    }

    function drawHero(d) {
        const a = game.alpha ?? 1, x = lerp(px, H.x, a), y = lerp(py, H.y, a) + H.stepY;
        if (H.rope >= 0) {
            const k = W.hooks[H.rope], segs = 8, dx = k.x - x, dy = k.y - y;
            for (let i = 0; i < segs; i++) { const t0 = i / segs, t1 = (i + 1) / segs, w = Math.sin(tick * 0.6 + i) * 0.5; d.line([x + dx * t0 + w, y - 4 + (dy + 4) * t0], [x + dx * t1 - w, y - 4 + (dy + 4) * t1], { width: 1.6, color: "#d8fff6" }); }
        }
        if (G.room) for (const k of W.hooksNear(H.x, H.y)) {
            const q = W.hooks[k];
            if (q.room !== G.room.id && Math.abs(q.x - H.x) > 300) continue;
            d.sprite("props", { x: q.x, y: q.y, width: 26, height: 26, frame: PROP.hook, color: palOf(q.room).rim });
        }
        if (has(sv, "FLOSS") && H.rope < 0) {
            const i = findHook(H, W, H.face);
            if (i >= 0) { const q = W.hooks[i], pulse = 15 + Math.sin(tick / 6) * 2; d.circle(pulse, { x: q.x, y: q.y, color: "#7ff5d8", outline: 1.5, opacity: 0.8 }); }
        }
        if (mode === "dead" || warpT > 12) return;
        if (iframes > 0 && Math.floor(iframes / 4) % 2 === 0 && mode === "play") return;
        const size = 30, sy = y - 3 - (squashY - 1) * size * 0.3;
        if (H.dashT > 0) for (let i = 1; i <= 3; i++) d.sprite("hero", { x: x - H.dashDir * i * 12, y: sy, width: size, height: size, frame: FR.dash, flipX: H.face < 0, color: "#7fe8d0", opacity: 0.35 / i });
        if (H.gliding) d.sprite("props", { x, y: y - 26, width: 34, height: 26, frame: PROP.toolChute });
        d.sprite("hero", { x, y: sy, width: size * squashX, height: size * squashY, frame: heroFrame(), flipX: H.face < 0 });
        if (attackT > 4) {
            const aim = attackAim, tx = aim === 0 ? x + H.face * 20 : x, ty = aim === 0 ? y : y + aim * 20;
            d.additive(() => {
                d.sprite("glow", { x: tx, y: ty, width: 34, height: 34, color: "#ffe066", opacity: 0.7 });
                for (let i = 0; i < 3; i++) { const ang = tick * 1.7 + i * 2.1; d.line([tx, ty], [tx + Math.cos(ang) * 11, ty + Math.sin(ang) * 11], { width: 1.5, color: "#ffffff" }); }
            });
        }
    }

    // Light pass, in world space, over everything.
    s.onDraw((d) => {
        const P = pal(), r = viewRect(), a = game.alpha ?? 1, x = lerp(px, H.x, a), y = lerp(py, H.y, a);
        const deco = roomDeco(G.room);
        d.additive(() => {
            for (const q of deco) if (q.glow && q.x > r.x - 40 && q.x < r.x + r.w + 40 && q.y > r.y - 40 && q.y < r.y + r.h + 40) {
                d.sprite("glow", { x: q.x, y: q.y - q.s * 0.4, width: q.s * 3, height: q.s * 3, color: q.c, opacity: 0.2 + Math.sin(tick / 40 + q.ph) * 0.07 });
            }
            for (const e of G.room.ents) {
                if (e.kind === "sink") d.sprite("glow", { x: e.x, y: e.y - 24, width: 120, height: 120, color: "#7fe8ff", opacity: sv.sinks.includes(e.key) ? 0.4 : 0.14 });
                if ((e.kind === "crown" || e.kind === "bit") && !sv.taken[e.key]) d.sprite("glow", { x: e.x, y: e.y - 14, width: 80, height: 80, color: "#ffd27a", opacity: 0.45 + Math.sin(tick / 16) * 0.15 });
                if (e.kind === "baby" && !sv.taken[e.key]) d.sprite("glow", { x: e.x, y: e.y - 10, width: 44, height: 44, color: "#ffffff", opacity: 0.3 });
                if (e.kind === "receptor") d.sprite("glow", { x: e.x, y: e.y, width: 70, height: 70, color: "#b98cff", opacity: 0.4 + beamCharge * 0.012 });
            }
            for (const m of motes) d.sprite("glow", { x: m.x, y: m.y, width: m.r * 2.4, height: m.r * 2.4, color: P.glow, opacity: 0.1 + Math.sin(tick / 30 + m.ph) * 0.08 });
        });
        // Mood: darkness everywhere except a soft pool around the head mirror.
        const R = Math.max(r.w, r.h) * 2.3;
        d.sprite("dark", { x, y: y - 6, width: R, height: R, color: "#000000", opacity: P.amb + (G.boss ? -0.12 : 0) });
        d.additive(() => {
            d.sprite("glow", { x: x + H.face * 3, y: y - 14, width: 150, height: 150, color: "#ffe9c0", opacity: 0.17 });
            d.sprite("glow", { x: x + H.face * 3, y: y - 14, width: 26, height: 26, color: "#ffffff", opacity: 0.55 });
            if (G.boss) d.sprite("glow", { x: G.boss.x, y: G.boss.y, width: G.boss.size * 2.4, height: G.boss.size * 2.4, color: G.boss.color, opacity: 0.2 });
        });
        // Near silhouettes: big soft shapes that slide past the lens.
        if (!G.boss) { const w = 512 * 2.6, ox = ((r.x * 1.35) % w + w) % w, yy = r.y + r.h * 0.5 + ((r.y * 0.3) % 30), c = P.deep;
            for (let q = r.x - ox; q < r.x + r.w + w; q += w) d.sprite("near", { x: q + w / 2, y: yy, width: w + 1, height: r.h * 2.1, color: c, opacity: 0.8 }); }
        for (const f of floats) d.text(f.str, { x: f.x, y: f.y - f.t * 0.35, size: 9, bold: true, color: f.color, opacity: Math.min(1, (90 - f.t) / 30) });
    });

    // -------------------------------------------- HUD and overlays.
    s.onDrawUI((d) => {
        const v = s.view, sf = v.safe, cx = v.width / 2;
        const lx = sf.left + 14, ly = sf.top + 18;
        const lowPulse = sv.hp <= 1 ? 1 + Math.sin(tick / 6) * 0.14 : 1;
        for (let i = 0; i < sv.maxHp; i++) d.sprite("props", { x: lx + (i % 10) * 20, y: ly + Math.floor(i / 10) * 20, width: 20 * (i < sv.hp ? lowPulse : 1), height: 20 * (i < sv.hp ? lowPulse : 1), frame: i + 0.99 < sv.hp ? PROP.heart : PROP.heartOff });
        { const i = Math.floor(sv.hp + 0.01), f = sv.hp - i; if (f > 0.1 && i < sv.maxHp) d.sprite("props", { x: lx + (i % 10) * 20, y: ly + Math.floor(i / 10) * 20, width: 20, height: 20, frame: PROP.heart, opacity: f < 0.6 ? 0.55 : 0.8, color: "#ffc2d1" }); }
        if (sv.babies) { d.sprite("props", { x: lx + 2, y: ly + 22 + (sv.maxHp > 10 ? 20 : 0), width: 13, height: 13, frame: PROP.baby }); d.text(`${sv.babies}`, { x: lx + 18, y: ly + 22 + (sv.maxHp > 10 ? 20 : 0), size: 11, bold: true, color: "#fff" }); }
        if (nameT > 0 && mode === "play" && !G.boss) {
            const k = Math.min(1, Math.min(nameT, 200 - nameT) / 30);
            d.text(nameText, { x: cx + 1, y: v.height * 0.2 + 1, size: 24, bold: true, color: "#000000", opacity: k * 0.7 });
            d.text(nameText, { x: cx, y: v.height * 0.2, size: 24, bold: true, color: "#ffffff", opacity: k });
        }
        if (hintT > 0) { const k = Math.min(1, hintT / 20); d.rect(Math.min(v.width - 20, hint.length * 7.4 + 24), 26, { x: cx, y: v.height * 0.12 + 18, color: "#000000", opacity: 0.6 * k, radius: 8 }); d.text(hint, { x: cx, y: v.height * 0.12 + 18, size: 12, color: "#fff", opacity: k }); }
        if (G.boss) {
            const b = G.boss, bw = Math.min(v.width - 40, 340), by = v.height - sf.bottom - (v.height > v.width ? v.height * 0.32 : 20), f = Math.max(0, b.hp / b.max), info = BOSS_INFO[b.name];
            d.rect(bw + 6, 12, { x: cx, y: by, color: "#000000", opacity: 0.7, radius: 6 });
            d.rect(bw * f, 7, { x: cx - bw * (1 - f) / 2, y: by, color: b.color, radius: 3.5 });
            d.text(info.name, { x: cx, y: by - 13, size: 11, bold: true, color: "#fff" });
            if (bossIntro > 0) {
                const k = Math.min(1, Math.min(bossIntro, 120 - bossIntro) / 18);
                d.text(info.name, { x: cx, y: v.height * 0.2, size: 26, bold: true, color: "#ffffff", opacity: k }); d.text(info.sub, { x: cx, y: v.height * 0.2 + 26, size: 13, color: b.color, opacity: k });
            }
        }
        if (mode === "talk" && dialog) {
            const portrait = v.height > v.width, bw = Math.min(v.width - 24, 480), by = portrait ? v.height * 0.62 : v.height - sf.bottom - 66;
            d.rect(bw, 100, { x: cx, y: by, color: "#120a1a", opacity: 0.92, radius: 12 });
            d.rect(bw, 100, { x: cx, y: by, color: "#ffffff", opacity: 0.25, radius: 12, outline: 1.5 });
            d.text(dialog.q.name, { x: cx, y: by - 34, size: 13, bold: true, color: "#ffe066" });
            d.text(dialog.lines[dialog.i].slice(0, dialog.n), { x: cx, y: by + 6, size: 14, color: "#fff", maxWidth: bw - 28 });
            if (tick % 40 < 26) d.text("▼", { x: cx + bw / 2 - 18, y: by + 36, size: 11, color: "#ffffff" });
        }
        if (mode === "card" && card) {
            const k = clamp(card.t / 14, 0, 1), o = 1 + (1 - k) * 0.4, cy = v.height * 0.42;
            d.rect(v.width, v.height, { x: cx, y: v.height / 2, color: "#000000", opacity: 0.6 * k });
            d.additive(() => d.sprite("glow", { x: cx, y: cy - 34, width: 240, height: 240, color: "#ffd27a", opacity: 0.6 * k }));
            d.sprite("props", { x: cx, y: cy - 34, width: 92 * o, height: 92 * o, frame: PROP[card.icon], opacity: k, rot: 0 });
            d.text(card.title, { x: cx, y: cy + 32, size: 22, bold: true, color: "#ffe066", opacity: k });
            d.text(card.body, { x: cx, y: cy + 64, size: 14, color: "#ffffff", maxWidth: Math.min(v.width - 40, 420), opacity: k });
            if (card.t > 30) d.text("Tap to continue", { x: cx, y: cy + 106, size: 12, color: "#ffffff", opacity: 0.5 + Math.sin(tick / 12) * 0.3 });
        }
    });
    // Menus and the map sit in a UI layer of their own, under their buttons.
    s.add([ui(), layer(50), { draw(d) {
        const v = s.view, sf = v.safe, cx = v.width / 2;
        if (mode === "pause" || mode === "sink") {
            d.rect(v.width, v.height, { x: cx, y: v.height / 2, color: "#0a0410", opacity: 0.82 });
            if (mode === "pause") d.text(`${Object.keys(sv.visited).length}/${W.rooms.length} rooms  ·  ${Math.floor(sv.time / 60)} min  ·  ${Object.keys(sv.cured).length}/${PATIENTS.length} patients`, { x: cx, y: v.height / 2 - (v.width > v.height ? 128 : 186), size: 12, color: "#ffffff" });
            if (mode === "sink") d.text("Where does the drain go?", { x: cx, y: Math.max(sf.top + 24, v.height / 2 - 204), size: 15, bold: true, color: "#a8f0ff" });
        }
        if (mode === "map") drawMap(d);
    } }]);

    function drawMap(d) {
        const v = s.view, cx = v.width / 2;
        d.rect(v.width + 4, v.height + 4, { x: cx, y: v.height / 2, color: "#0a0410" });
        const cw = 46, ch = 34, top = v.safe.top + 54, availH = v.height - top - 84 - v.safe.bottom, m = Math.min((v.width - 20) / cw, availH / ch), ox = cx - cw * m / 2, oy = top + (availH - ch * m) / 2;
        const area = AREAS[G.room.area].name;
        d.text(area, { x: cx, y: oy - 22, size: 14, bold: true, color: PAL[AREAS[G.room.area].key].rim });
        for (const r of W.rooms) {
            if (!sv.visited[r.id]) continue;
            const P = palOf(r.id), x = ox + (r.gx + r.cw / 2) * m, y = oy + (r.gy + r.ch / 2) * m;
            d.rect(r.cw * m - 1, r.ch * m - 1, { x, y, color: r === G.room ? (tick % 40 < 20 ? "#ffffff" : P.rim) : P.rock, radius: 1.5 });
            d.rect(r.cw * m - 1, r.ch * m - 1, { x, y, color: P.rim2, outline: 0.8, radius: 1.5, opacity: 0.9 });
            for (const dr of r.doors) if (dr.y % 6 === 3 && (dr.side === "W" || dr.side === "E")) d.rect(2.4, 2.4, { x: ox + (r.gx + (dr.side === "E" ? r.cw : 0)) * m, y: oy + (r.gy + (dr.y + 1) / 6) * m, color: sv.visited[dr.to] ? P.rim : "#ffe066" });
            else if (dr.x % 10 === 4 && (dr.side === "N" || dr.side === "S")) d.rect(2.4, 2.4, { x: ox + (r.gx + (dr.x + 1) / 10) * m, y: oy + (r.gy + (dr.side === "S" ? r.ch : 0)) * m, color: sv.visited[dr.to] ? P.rim : "#ffe066" });
            if (r.opts.boss && !sv.flags[BOSS_INFO[r.opts.boss].flag]) d.circle(2.4, { x, y, color: "#ff2a4d" });
            if (r.ents.some((e) => e.kind === "sink")) d.circle(2, { x, y, color: "#7fe8ff" });
        }
        d.text(`Yellow dots lead somewhere new. Blue is a sink. Red is trouble.`, { x: cx, y: v.height - v.safe.bottom - 72, size: 10, color: "#ffffffaa" });
    }

    G.openMap = openMap; G.openPause = openPause;
    enterRoom(G.room, true);
    if (sv.sink) sv.sinks = [...new Set(sv.sinks)];
    syncTouch(true);
    snapCam();
    if (!Object.keys(sv.talked).length && !sv.abil && !args.room) say("Move and jump. Something hurts further in.", 300);
});

// ------------------------------------------------------------------------------------------------ Ending.
game.scene("ending", (s) => {
    const sv = game.data.sv ?? freshSave();
    game.touch.enabled = false;
    game.data.song = null; setSong("ending");
    let t = 0;
    const cured = Object.keys(sv.cured).length, all = cured >= PATIENTS.length, teeth = sv.babies, rooms = Object.keys(sv.visited).length;
    const secrets = Object.keys(sv.taken).length, total = TOTALS.crowns + TOTALS.babies + TOTALS.bits + 1;
    const pct = Math.round((rooms / W.rooms.length * 0.5 + Math.min(1, secrets / total) * 0.3 + cured / PATIENTS.length * 0.2) * 100);
    const best = game.load(SAVE + "-best", null);
    if (!best || sv.time < best) game.save(SAVE + "-best", sv.time);
    const lines = ["The Ache cracks, and goes quiet.", "Far above you, a very large person stops frowning.", all ? "Every patient seen. The Tooth Fairy sends a thank-you note. It's mostly invoice." : "A few patients are still waiting. They've been very brave.", "The giant rolls over, sighs, and smiles in its sleep."];
    s.onUpdate(() => { t++; });
    s.onDraw((d) => {
        const v = s.view, cx = v.width / 2, H = v.height, k = Math.min(1, t / 160), my = H * 0.08;
        d.sprite("glow", { x: cx, y: H * 0.34, width: v.width * 2.4, height: H * 1.4, color: "#ffb36a", opacity: 0.5 * k + 0.1 });
        // A big sleeping smile.
        const r = Math.min(v.width * 0.42, H * 0.46, 220), n = 22;
        for (let i = 0; i < n; i++) { const a = Math.PI * (0.12 + 0.76 * i / (n - 1)), x = cx + Math.cos(a) * r * 1.1, y = my + Math.sin(a) * r * 0.55 * k; d.circle(10, { x, y, color: "#c92c5b" }); if (i % 2 === 0) d.sprite("props", { x, y: y - 14, width: 24, height: 26, frame: PROP.heart, color: "#fff6e8", opacity: k, flipX: i % 4 === 0 }); }
        d.sprite("hero", { x: cx, y: my + r * 0.16 + Math.sin(t / 24) * 2, width: 40, height: 40, frame: 0 });
        d.text("Z z z", { x: cx + r * 0.8, y: my + 22 - (t % 120) / 12, size: 18, bold: true, color: "#ffffff", opacity: 0.6 });
        lines.forEach((l, i) => { const q = clamp((t - 40 - i * 110) / 40, 0, 1); d.text(l, { x: cx, y: H * 0.42 + i * Math.min(H * 0.088, 46), size: 14, color: "#fff6e8", opacity: q, maxWidth: Math.min(v.width - 32, 520) }); });
        const q = clamp((t - 520) / 40, 0, 1);
        d.text(`${pct}% complete   ${Math.floor(sv.time / 3600)}h ${Math.floor(sv.time / 60) % 60}m   ${sv.deaths} deaths   ${cured}/${PATIENTS.length} patients   ${teeth}/${TOTALS.babies} teeth`, { x: cx, y: H * 0.42 + 4 * Math.min(H * 0.088, 46) + 6, size: 11, bold: true, color: "#ffd27a", opacity: q, maxWidth: v.width - 24 });
    });
    s.wait(6, () => s.add([button(all && !sv.hard ? "Hard bite unlocked" : "Back to the mouth", { action: "confirm", width: 190, height: 50, color: "#ff5c8a", textColor: "#2a0614", textSize: 15, onTap: () => game.go("title", {}, { fade: 0.4 }) }), pin("bottom-right", [14, 10])]));
});

game.start("title");
