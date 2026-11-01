// GNOME MAN'S LAND. A very fast first-person shooter about a very cross grandmother.
import { billboard, body, button, Color, collider, color, createGame, dim, mesh, pos, rect, solid, tap, ui, Vec } from "./pogo.js";
import { paintAll } from "./art.js";
import { LEVELS } from "./levels.js";
import { LOW, TILE, compile, ringMesh, skyMesh } from "./world.js";
import { SFX, SONGS } from "./audio.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#0b0a12",
    seed: 7,
    maxDpr: 2,
    touch: {
        stick: true, look: true,
        buttons: [{ action: "fire", label: "FIRE" }, { action: "jump", label: "JUMP" }, { action: "dash", label: "DASH" }, { action: "swap", label: "SWAP" }],
    },
    actions: {
        dash: ["ShiftLeft", "ShiftRight", "pad:b"], swap: ["KeyQ", "KeyE", "pad:y"],
        w1: ["Digit1"], w2: ["Digit2"], w3: ["Digit3"], w4: ["Digit4"], w5: ["Digit5"],
        sensUp: ["BracketRight"], sensDown: ["BracketLeft"], mute: ["KeyM"],
    },
});
const sfx = (name) => game.sfx(SFX[name]);
const URL_FLAGS = typeof location === "undefined" ? "" : location.search;
/** `pogo shot` and bots step the game by hand, with no real mouse to capture. */
const SCRIPTED = game.headless || URL_FLAGS.includes("paused");

paintAll(game);
skyMesh(game);
ringMesh(game);

// --- Tuning ----------------------------------------------------------------------------------------
const P_W = 0.72, P_H = 1.7, EYE = 0.68, SPEED = 9.8, GRAV = -26, JUMP = 9.2;
const DASH_V = 27, DASH_T = 0.16, DASH_CD = 0.9;
const ACC_GROUND = 17, ACC_AIR = 6;
const PITCH_MAX = 1.3, SIGHT = 34, WAKE_R = 16, CULL_R = 46;
const FONT = "Impact, 'Arial Black', 'Helvetica Neue', system-ui, sans-serif";

const WEAPONS = [
    { id: "pea", name: "Pea Shooter", icon: 10, ammo: null, cd: 0.25, dmg: 18, pellets: 1, spread: 0.004, kick: 0.016, vm: 18, shake: 0, sprite: "vm0", flash: 0, flashAt: [-145, -105], flashS: 0.3, sound: "pea", color: "#b6ff7a", tracer: 0.5 },
    { id: "buss", name: "Thornbuss", icon: 11, ammo: "thorns", cd: 0.68, dmg: 12, pellets: 10, spread: 0.062, kick: 0.075, vm: 54, shake: 0.09, sprite: "vm1", flash: 1, flashAt: [-45, -88], flashS: 0.62, sound: "buss", color: "#d8ff8a", tracer: 0.4, knock: 10 },
    { id: "hose", name: "Hornet Hose", icon: 12, ammo: "hornets", cd: 0.08, dmg: 8, pellets: 1, spread: 0.026, kick: 0.009, vm: 10, shake: 0.018, sprite: "vm2", flash: 1, flashAt: [-133, -113], flashS: 0.36, sound: "hose", color: "#ffd24a", tracer: 1, knock: 1.4 },
    { id: "mortar", name: "Pumpkin Mortar", icon: 13, ammo: "pumpkins", cd: 0.8, proj: true, kick: 0.08, vm: 40, shake: 0.08, sprite: "vm3", flash: 2, flashAt: [-132, -103], flashS: 0.66, sound: "mortar", color: "#ffa42c" },
    { id: "zap", name: "Bug Zapper", icon: 14, ammo: "bulbs", cd: 0.52, dmg: 75, pellets: 1, spread: 0, pierce: true, kick: 0.04, vm: 22, shake: 0.05, sprite: "vm4", flash: 3, flashAt: [-73, -60], aimDrop: 0.16, flashS: 0.6, sound: "zap", color: "#7df0ff", tracer: 1, knock: 5 },
];
const AMMO_MAX = { thorns: 40, hornets: 240, pumpkins: 16, bulbs: 24 };

const ENEMIES = {
    n: { id: "nib", name: "Nibbler", sheet: "e_nib", size: 1.55, w: 0.95, h: 1.5, hp: 34, speed: 7.2, drop: 0.2, hat: 1, chips: [5, 7, 4] },
    s: { id: "sling", name: "Slingnome", sheet: "e_sling", size: 1.6, w: 0.95, h: 1.55, hp: 46, speed: 4.6, drop: 0.3, hat: 2, chips: [5, 4, 6] },
    f: { id: "fly", name: "Whirligig", sheet: "e_fly", size: 1.6, w: 1.1, h: 1.2, hp: 30, speed: 7, drop: 0.2, hat: 2, flying: true, chips: [5, 4, 8] },
    k: { id: "shield", name: "Bathsworth", sheet: "e_shield", size: 1.8, w: 1.15, h: 1.75, hp: 100, speed: 3.9, drop: 0.5, hat: 3, chips: [5, 6, 8] },
    o: { id: "bomb", name: "Fizzbang", sheet: "e_bomb", size: 1.6, w: 0.9, h: 1.5, hp: 22, speed: 8.4, drop: 0, hat: 3, chips: [5, 6, 0] },
    M: { id: "mow", name: "Mowgul", sheet: "e_mow", size: 3, w: 2.2, h: 2.7, hp: 420, speed: 3.2, drop: 1, hat: 3, chips: [5, 8, 6], mass: 8 },
    K: { id: "boss", name: "King Grumbold", sheet: "e_boss", size: 6.6, w: 3.3, h: 6, hp: 4600, speed: 3.4, drop: 0, hat: 0, chips: [5, 6, 8], mass: 40 },
};

const PICKUPS = {
    "+": { frame: 0, size: 0.8, what: "hp", n: 25, label: "A nice cup of tea", snd: "tea" },
    "-": { frame: 1, size: 0.55, what: "hp", n: 10, label: "Biscuit", snd: "pickup", over: true },
    a: { frame: 2, size: 0.85, what: "armor", n: 50, label: "Cardigan of Protection", snd: "armour" },
    t: { frame: 3, size: 0.7, what: "thorns", n: 10, label: "Thorns", snd: "pickup" },
    h: { frame: 4, size: 0.7, what: "hornets", n: 60, label: "Jar of hornets", snd: "pickup" },
    p: { frame: 5, size: 0.7, what: "pumpkins", n: 3, label: "Pumpkins", snd: "pickup" },
    z: { frame: 6, size: 0.65, what: "bulbs", n: 6, label: "Bug bulbs", snd: "pickup" },
    r: { frame: 7, size: 0.8, what: "key", key: "r", label: "RED KEY", snd: "key" },
    b: { frame: 8, size: 0.8, what: "key", key: "b", label: "BLUE KEY", snd: "key" },
    y: { frame: 9, size: 0.8, what: "key", key: "y", label: "GOLD KEY", snd: "key" },
    2: { frame: 11, size: 1, what: "weapon", weapon: 1, n: 10, label: "THORNBUSS! Big thorny noises", snd: "weapon" },
    3: { frame: 12, size: 1, what: "weapon", weapon: 2, n: 100, label: "HORNET HOSE! Hold to sting", snd: "weapon" },
    4: { frame: 13, size: 1, what: "weapon", weapon: 3, n: 5, label: "PUMPKIN MORTAR! Mind your eyebrows", snd: "weapon" },
    5: { frame: 14, size: 1, what: "weapon", weapon: 4, n: 10, label: "BUG ZAPPER! Pierces everything", snd: "weapon" },
};
const KEY_NAME = { r: "RED", b: "BLUE", y: "GOLD" };
const KEY_COL = { r: "#ff4a5e", b: "#4a9dff", y: "#ffd24a" };

// --- Run state ----------------------------------------------------------------------------------------
function freshRun() {
    return {
        level: 0, hp: 100, armor: 0, cur: 0, owned: [true, false, false, false, false],
        ammo: { thorns: 0, hornets: 0, pumpkins: 0, bulbs: 0 },
        log: [], time: 0, kills: 0, enemies: 0, shots: 0, hits: 0, secrets: 0, secretsTotal: 0, deaths: 0,
    };
}
const settings = { sens: 1, touchSens: 1, autofire: true, music: true, ...game.load("gml_settings", {}) };
const saveSettings = () => game.save("gml_settings", settings);
function publish(w) {
    const r = game.data.run, p = w?.player;
    Object.assign(game.data, {
        level: r.level + 1, levelName: LEVELS[r.level].name, hp: Math.ceil(r.hp), armor: Math.ceil(r.armor), weapon: WEAPONS[r.cur].name,
        ammo: { ...r.ammo }, keys: w ? [...w.keys] : [], kills: w ? w.kills : 0, enemiesTotal: w ? w.total : 0, secrets: w ? w.secrets : 0, secretsTotal: w ? w.secretsTotal : 0,
        shots: w ? w.shots : 0, hits: w ? w.hits : 0, mode: w ? w.mode : "menu", time: w ? +w.time.toFixed(1) : 0, player: p ? [+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)] : null,
    });
}

// --- Door textures --------------------------------------------------------------------------------
function paintDoors() {
    const A = game.assets;
    const door = (name, base, dark, trim, emblem) => A.paint(name, 128, 128, (p) => {
        p.gradient(0, 0, 128, 128, base, dark);
        for (let i = 0; i < 5; i++) { p.rect(0, i * 26, 128, 2, "#00000044"); p.rect(i * 26 + 10, 0, 2, 128, "#00000022"); }
        p.rect(0, 0, 128, 10, trim).rect(0, 118, 128, 10, trim).rect(0, 0, 10, 128, trim).rect(118, 0, 10, 128, trim);
        for (const [x, y] of [[5, 5], [123, 5], [5, 123], [123, 123], [64, 5], [64, 123], [5, 64], [123, 64]]) p.circle(x, y, 3, "#ffffffaa");
        if (emblem) {
            p.circle(64, 64, 30, "#1b1226"); p.circle(64, 64, 26, emblem); p.circle(64, 52, 10, "#1b1226"); p.rect(60, 54, 8, 30, "#1b1226"); p.rect(66, 72, 10, 5, "#1b1226"); p.rect(66, 80, 8, 5, "#1b1226");
        }
    }, { smooth: true });
    door("door_D", "#8b5a2b", "#5e3a1a", "#3f3f4c");
    door("door_R", "#7c1f2c", "#4a1018", "#ff4a5e", "#ff4a5e");
    door("door_B", "#1f3f7c", "#10244a", "#4a9dff", "#4a9dff");
    door("door_Y", "#7c6a1f", "#4a3e10", "#ffd24a", "#ffd24a");
    A.paint("door_G", 128, 128, (p) => {
        p.gradient(0, 0, 128, 128, "#3a3f4c", "#22252e");
        for (let i = 0; i < 6; i++) p.rect(8 + i * 21, 0, 10, 128, "#7a828e");
        for (let y = 0; y < 128; y += 42) for (let x = 0; x < 128; x += 16) p.poly([[x, y], [x + 8, y], [x + 16, y + 12], [x + 8, y + 12]], (x / 16) % 2 ? "#ffd24a" : "#1b1226");
    }, { smooth: true });
    A.paint("door_C", 128, 128, (p) => {
        p.gradient(0, 0, 128, 128, "#4a4a58", "#2a2a36");
        for (let i = 0; i < 7; i++) p.rect(0, 8 + i * 18, 128, 8, "#5e5e6e");
        p.circle(64, 64, 18, "#1b1226"); p.circle(58, 60, 4, "#ff4a5e"); p.circle(70, 60, 4, "#ff4a5e");
    }, { smooth: true });
}
paintDoors();

// --- Vectors, cheap ones ----------------------------------------------------------------------------
const fx = game.fxRng;
/** A UI element placed by a function of the view, from its first frame and on every resize. */
const placed = (fn) => ({ add(e) { fn(e, e.scene.view); }, update(dt, e) { fn(e, e.scene.view); } });
const hypot2 = (x, z) => Math.sqrt(x * x + z * z);
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

// ====================================================================================================
//  The play scene
// ====================================================================================================
game.scene("play", (s, args) => {
    const run = game.data.run ?? (game.data.run = freshRun());
    if (args?.level !== undefined) run.level = args.level;
    const L = compile(game, run.level), th = L.theme, T = TILE;
    const hurtCam = { roll: 0 };

    // World state, also the bot's and debug tools' window into the game. -----------------------------
    const w = game.sim = {
        s, L, mode: "play", time: 0, kills: 0, total: 0, shots: 0, hits: 0, secrets: 0, secretsTotal: 0, keys: new Set(),
        enemies: [], shotsE: [], shotsP: [], pickups: [], doors: [], fxs: [], debris: [], rings: [], secretTiles: [], switches: [], barrels: [],
        yaw: 0, pitch: 0, kick: 0, kickV: 0, vmKick: 0, vmFrameT: 0, bob: 0, bobA: 0, dip: 0, dipV: 0, swap: 0, cd: 0, spin: 0, dashT: 0, dashCD: 0, dashDir: [0, 0],
        coyote: 0, buffer: 0, air: 0, hazT: 0, marker: 0, markerK: 0, kill: 0, flash: 0, muzzle: 0, hurtT: 0, hurtDir: [], heal: 0,
        invuln: 0, stop: 0, stepT: 0, alertT: 0, swayX: 0, swayY: 0, combo: 0, comboT: 0, toast: "", toastT: 0, big: "", bigT: 0, title: 3.4, flow: new Int16Array(L.Cn * L.R), flowKey: -1, flowDirty: true, boss: null, bossAwake: false,
        objective: null, objT: 0, objPath: null, peak: { enemies: 0, entities: 0 }, exitOpen: !!findChar("E"), retryT: 0, playerLight: [1, 1, 1], stickT: 0, autoT: 0, target: null,
    };
    function findChar(k) { for (let r = 0; r < L.R; r++) for (let c = 0; c < L.Cn; c++) if (L.ch(c, r) === k) return [c, r]; return null; }
    const tileOf = (x) => Math.floor(x / T);
    const centre = (c) => (c + 0.5) * T;
    const idx = (c, r) => r * L.Cn + c;

    // Scene look ---------------------------------------------------------------------------------------
    s.background = th.bg;
    s.gravity3.set(0, GRAV, 0);
    s.light.dir.set(0, -1, 0);
    s.light.color = new Color(0, 0, 0);
    s.light.shadows = false;
    s.light.sky = new Color(1, 1, 1);
    s.light.ground = new Color(1, 1, 1);
    s.light.fog = { color: color(th.fog.color), near: th.fog.near, far: th.fog.far };
    s.cam3.fov = 74;
    s.cam3.near = 0.06;
    s.cam3.far = 300;

    s.add([mesh(`lvl${run.level}`, { texture: `atlas${L.def.theme}`, shadow: false }), pos(0, 0, 0), "levelMesh"]);
    const hazMesh = L.def.map.some((r) => r.includes("~"))
        ? s.add([mesh(`lvl${run.level}_haz`, { texture: `${th.hazard}_0`, shadow: false }), pos(0, 0, 0), "hazMesh"]) : null;
    const sky = th.sky ? s.add([mesh("skydome", { texture: th.sky, unlit: true, shadow: false }), pos(0, 0, 0), "sky"]) : null;

    // Collision ------------------------------------------------------------------------------------------
    s.add([dim(3), pos(L.Cn * T / 2, -1, L.R * T / 2), collider({ size: [L.Cn * T + 4, 2, L.R * T + 4] }), solid(), "floor", "wall"]);
    if (th.ceil) s.add([dim(3), pos(L.Cn * T / 2, th.H + 1, L.R * T / 2), collider({ size: [L.Cn * T + 4, 2, L.R * T + 4] }), solid(), "wall"]);
    const rectAt = new Map(L.rects.map((b) => [`${b.c},${b.r}`, b]));
    const mapRows = Array.from({ length: L.R }, () => Array(L.Cn).fill("."));
    for (const b of L.rects) mapRows[b.r][b.c] = b.k === 1 ? "W" : "w";
    const box = (c, r) => {
        const b = rectAt.get(`${c},${r}`), h = b.k === 1 ? 40 : LOW;
        return [dim(3), pos((b.w - 1) * T / 2, h / 2, (b.h - 1) * T / 2), collider({ size: [b.w * T, h, b.h * T] }), solid(), b.k === 1 ? "wall" : "crate"];
    };
    s.tilemap(mapRows.map((r) => r.join("")), { size: T, plane: "xz", legend: { W: box, w: box } });

    // Things in the map ----------------------------------------------------------------------------------
    const legend = {};
    for (const k of Object.keys(ENEMIES)) legend[k] = (c, r) => enemyComps(k, c, r);
    for (const k of Object.keys(PICKUPS)) legend[k] = (c, r) => pickupComps(k, c, r);
    for (const k of "DRBYSGC") legend[k] = (c, r) => doorComps(k, c, r);
    legend.W = (c, r) => switchComps(c, r);
    legend.P = (c, r) => propComps(c, r);
    legend.L = (c, r) => lampComps(c, r);
    legend.Q = (c, r) => barrelComps(c, r);
    legend.E = (c, r) => exitComps(c, r);
    const objRows = L.rows.map((row) => [...row].map((k) => (legend[k] ? k : ".")).join(""));
    // The floor plan keeps "W" for wall boxes above, so the switch character is only legal in this pass.
    s.tilemap(objRows, { size: T, plane: "xz", legend });

    // Non-entity markers
    const start = findChar("@");
    w.triggers = [];
    for (let r = 0; r < L.R; r++) for (let c = 0; c < L.Cn; c++) {
        const k = L.ch(c, r);
        if (k === "?") { w.secretTiles.push({ c, r, found: false }); w.secretsTotal++; }
        if (k === "T") w.triggers.push({ c, r, done: false });
    }
    w.total = w.enemies.length;

    // Player ---------------------------------------------------------------------------------------------
    const player = s.add([dim(3), pos(centre(start[0]), P_H / 2, centre(start[1])), collider({ size: [P_W, P_H, P_W] }), body({ mass: 6 }), "player", { name: "granny" }]);
    w.player = player;
    w.checkpoint = { x: player.pos.x, z: player.pos.z };
    w.yaw = args?.yaw ?? initialYaw();
    function initialYaw() { // Face the longest open line from the spawn.
        let best = 0, bd = 0;
        for (const [a, dx, dz] of [[0, 0, -1], [Math.PI, 0, 1], [Math.PI / 2, -1, 0], [-Math.PI / 2, 1, 0]]) {
            let d = 0;
            while (d < 30 && L.heightAt(player.pos.x + dx * d, player.pos.z + dz * d) < 1) d += 0.5;
            if (d > bd) { bd = d; best = a; }
        }
        return best;
    }
    s.cam3.follow(player, { offset: [0, EYE, 0], look: [0, EYE, -1], speed: 0 });
    game.mouseLook = true;
    showTouch();

    const snapshot = JSON.stringify({ hp: run.hp, armor: run.armor, cur: run.cur, owned: run.owned, ammo: run.ammo });
    if (settings.music) game.music(SONGS[L.def.music]); else game.stopMusic();

    // Components for the map legend ----------------------------------------------------------------------
    function enemyComps(k, c, r) {
        const d = ENEMIES[k], y = d.flying ? 2.3 : d.h / 2;
        return [dim(3), pos(0, y, 0), collider({ size: [d.w, d.h, d.w], ignore: ["enemy", "player"] }), body({ gravity: 0, mass: d.mass ?? 1 }), "enemy", {
            name: d.id, def: d, kind: k, hp: d.hp, maxHp: d.hp, awake: false, state: "idle", t: 0, cd: 1 + s.rng.range(0, 1.5), think: s.rng.range(0, 0.25), see: false, dist: 99,
            kx: 0, kz: 0, stun: 0, flashT: 0, side: s.rng.chance(0.5) ? 1 : -1, face: [0, 1], animT: s.rng.range(0, 2), homeY: y, lastX: 0, lastZ: 0, stuck: 0, shieldUp: k === "k", phase: 1, squash: 0,
            add(e) {
                e.vis = e.child([billboard(d.sheet, { size: d.size, unlit: false }), pos(0, d.size / 2 - d.h / 2, 0)]);
                e.warn = e.child([billboard("items", { size: 0.42, frame: 20, unlit: true }), pos(0, d.size - d.h / 2 + 0.34, 0)]);
                e.warn.hidden = true;
                e.blob = e.child([mesh("plane", { size: [d.w * 1.6, 1, d.w * 1.6], texture: "blob", color: [1, 1, 1, 0.85], shadow: false }), pos(0, -y + 0.04, 0)]);
                w.enemies.push(e);
            },
        }];
    }
    function pickupComps(k, c, r) {
        const p = PICKUPS[k];
        return [dim(3), billboard("items", { size: p.size, frame: p.frame, unlit: true }), pos(0, 0.7, 0), "pickup", {
            item: p, code: k, phase: (c * 3 + r * 7) % 6,
            add(e) { w.pickups.push(e); },
        }];
    }
    function doorComps(k, c, r) {
        const ns = "#%DRBYSGC".includes(L.ch(c - 1, r)) && "#%DRBYSGC".includes(L.ch(c + 1, r));
        const H = th.H, thick = 0.6;
        const size = k === "S" ? [T, H, T] : ns ? [T, H, thick] : [thick, H, T];
        const comps = k === "S" ? mesh(`lvl${run.level}_sec`, { size, texture: `atlas${L.def.theme}`, shadow: false }) : mesh("box", { size, texture: `door_${k}`, shadow: false });
        return [comps, pos(0, H / 2, 0), collider({ size }), solid(), "wall", "door", {
            kind: k, c, r, openT: 0, open: 0, want: 0, y0: H / 2, H, locked: k === "R" || k === "B" || k === "Y" || k === "G", key: { R: "r", B: "b", Y: "y" }[k],
            sealed: k === "C" || k === "S", name: `door${k}`,
            add(e) { w.doors.push(e); },
        }];
    }
    function switchComps(c, r) {
        return [dim(3), billboard("items", { size: 1.5, frame: 16, unlit: true }), pos(0, 0.8, 0), collider({ size: [1, 1.6, 1] }), solid(), "switch", {
            c, r, flipped: false, name: "switch",
            add(e) { w.switches.push(e); },
        }];
    }
    function propComps(c, r) {
        const i = th.props[(c * 7 + r * 3) % th.props.length];
        const look = i === 2 ? billboard("statue", { size: 1.9, unlit: false }) : billboard("props", { size: 2, frame: i, unlit: false });
        return [dim(3), look, pos(0, 1, 0), collider({ size: [0.9, 2, 0.9] }), solid(), "prop", { add(e) { tint(e); } }];
    }
    function lampComps(c, r) {
        return [dim(3), billboard("props", { size: 2.6, frame: th.lampFrame === 3 ? 3 : th.lampFrame === 4 ? 10 : th.lampFrame === 8 ? 10 : 0, unlit: true }), pos(0, 1.3, 0), "lamp"];
    }
    function barrelComps(c, r) {
        return [dim(3), billboard("props", { size: 1.5, frame: 11, unlit: false }), pos(0, 0.75, 0), collider({ size: [0.9, 1.5, 0.9] }), solid(), "barrel", {
            hp: 20, add(e) { w.barrels.push(e); tint(e); },
        }];
    }
    function exitComps(c, r) {
        return [dim(3), billboard("items", { size: 3, frame: 15, unlit: true }), pos(0, 1.5, 0), "exit", { add(e) { w.exit = e; } }];
    }
    function tint(e) {
        const c = tileOf(e.pos.x), r = tileOf(e.pos.z), i = idx(c, r) * 3;
        const k = (v) => Math.min(1.5, 0.3 + v);
        e.color = new Color(k(L.tl[i]), k(L.tl[i + 1]), k(L.tl[i + 2]));
    }

    // Messages -------------------------------------------------------------------------------------------
    const toast = (m, t = 2.4) => { w.toast = m; w.toastT = t; };
    const big = (m, t = 1.2) => { w.big = m; w.bigT = t; };

    // Navigation: one breadth-first flow field for every enemy -------------------------------------------
    const closedAt = new Map();
    function passable(c, r, forPlayer) {
        const k = L.ch(c, r);
        if (k === "#" || k === "%") return false;
        if (!forPlayer && (k === "=" || k === "~" || k === "P" || k === "Q")) return false;
        const d = closedAt.get(idx(c, r));
        return !(d && (d.locked || d.sealed));
    }
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const queue = new Int32Array(L.Cn * L.R);
    function rebuildFlow() {
        closedAt.clear();
        for (const d of w.doors) if (d.locked || d.sealed) closedAt.set(idx(d.c, d.r), d);
        const f = w.flow.fill(-1), pc = tileOf(player.pos.x), pr = tileOf(player.pos.z);
        const st = idx(pc, pr);
        if (st < 0 || st >= f.length) return;
        let head = 0, tail = 0;
        f[st] = 0; queue[tail++] = st;
        while (head < tail) {
            const cur = queue[head++], c = cur % L.Cn, r = (cur - c) / L.Cn, v = f[cur];
            for (const [dc, dr] of DIRS) {
                const nc = c + dc, nr = r + dr;
                if (nc < 0 || nr < 0 || nc >= L.Cn || nr >= L.R) continue;
                const ni = idx(nc, nr);
                if (f[ni] < 0 && passable(nc, nr, false)) { f[ni] = v + 1; queue[tail++] = ni; }
            }
        }
    }
    /** Unit vector along the flow field from an entity, or null if there is no route. */
    const stepTo = [0, 0];
    function flowDir(e) {
        const c = tileOf(e.pos.x), r = tileOf(e.pos.z), f = w.flow, cur = f[idx(c, r)];
        let best = cur >= 0 ? cur : 32000, bx = -1, by = -1;
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nc = c + dc, nr = r + dr, v = f[idx(nc, nr)];
            if (nc < 0 || nr < 0 || nc >= L.Cn || nr >= L.R || v < 0) continue;
            if (dc && dr && (f[idx(c + dc, r)] < 0 || f[idx(c, r + dr)] < 0)) continue;
            if (v < best) { best = v; bx = nc; by = nr; }
        }
        if (bx < 0) return null;
        const dx = centre(bx) - e.pos.x, dz = centre(by) - e.pos.z, l = hypot2(dx, dz) || 1;
        stepTo[0] = dx / l; stepTo[1] = dz / l;
        return stepTo;
    }

    /** Player-side BFS for the objective marker: door states and keys count. */
    function route(tc, tr) {
        const n = L.Cn * L.R, prev = new Int32Array(n).fill(-2), sc = tileOf(player.pos.x), sr = tileOf(player.pos.z);
        let head = 0, tail = 0;
        prev[idx(sc, sr)] = -1; queue[tail++] = idx(sc, sr);
        const goal = idx(tc, tr);
        while (head < tail) {
            const cur = queue[head++];
            if (cur === goal) break;
            const c = cur % L.Cn, r = (cur - c) / L.Cn;
            for (const [dc, dr] of DIRS) {
                const nc = c + dc, nr = r + dr, ni = idx(nc, nr);
                if (nc < 0 || nr < 0 || nc >= L.Cn || nr >= L.R || prev[ni] !== -2) continue;
                if (ni !== goal && !passableP(nc, nr)) continue;
                prev[ni] = cur; queue[tail++] = ni;
            }
        }
        if (prev[goal] === -2) return null;
        const path = [];
        for (let i = goal; i >= 0 && prev[i] !== -2; i = prev[i]) path.push([i % L.Cn, (i - i % L.Cn) / L.Cn]);
        return path.reverse();
    }
    function passableP(c, r) {
        const k = L.ch(c, r);
        if (k === "#" || k === "%" || k === "=" || k === "~" || k === "P") return false;
        if (k === "Q" && w.barrels.some((q) => tileOf(q.pos.x) === c && tileOf(q.pos.z) === r)) return false;
        const d = w.doors.find((o) => o.c === c && o.r === r);
        if (!d) return true;
        if (d.sealed && d.open < 0.9) return false;
        if (d.key && !w.keys.has(d.key)) return false;
        return !(d.kind === "G" && d.locked);
    }
    function updateObjective() {
        const cands = [];
        if (w.exit && w.exitOpen) cands.push({ c: tileOf(w.exit.pos.x), r: tileOf(w.exit.pos.z), label: "EXIT" });
        for (const p of w.pickups) if (p.item.what === "key" && p.alive) cands.push({ c: tileOf(p.pos.x), r: tileOf(p.pos.z), label: `${KEY_NAME[p.item.key]} KEY` });
        for (const e of w.switches) if (!e.flipped) cands.push({ c: tileOf(e.pos.x), r: tileOf(e.pos.z), label: "SWITCH" });
        if (w.boss?.alive && w.bossAwake) { w.objective = { c: tileOf(w.boss.pos.x), r: tileOf(w.boss.pos.z), label: "THE KING" }; w.objPath = null; return; }
        if (w.boss?.alive) cands.push({ c: tileOf(w.boss.pos.x), r: tileOf(w.boss.pos.z), label: "THE KING" });
        let best = null, bestPath = null;
        for (const o of cands) {
            const path = route(o.c, o.r);
            if (path && (!best || o.label === "EXIT" || (best.label !== "EXIT" && path.length < bestPath.length))) { best = o; bestPath = path; }
        }
        w.objective = best; w.objPath = bestPath;
    }

    // Damage -----------------------------------------------------------------------------------------------
    const dmgScale = 1 + run.level * 0.07;
    function hurtPlayer(n0, from) {
        if (w.mode !== "play" || w.dashT > 0 || w.invuln > 0) return;
        const n = n0 * dmgScale;
        const taken = run.armor > 0 ? Math.max(0, n * 0.34) : n, soak = run.armor > 0 ? Math.min(run.armor, n * 0.66) : 0;
        run.armor -= soak;
        run.hp -= taken + (n * 0.66 - soak > 0 && soak > 0 ? n * 0.66 - soak : 0);
        w.hurtT = 0.5;
        hurtCam.roll = fx.range(-0.05, 0.05);
        if (from) w.hurtDir.push({ a: Math.atan2(from.x - player.pos.x, from.z - player.pos.z), t: 0.9 });
        if (w.hurtDir.length > 4) w.hurtDir.shift();
        sfx("hurt");
        game.vibrate(24);
        w.kickV -= 0.25;
        publish(w);
        if (run.hp <= 0) die();
    }
    function die() {
        run.hp = 0;
        w.mode = "dead";
        w.retryT = 0.8;
        run.deaths++;
        run.deathsHere = (run.deathsHere ?? 0) + 1;
        sfx("die");
        game.stopMusic();
        publish(w);
    }
    function wake(e) { if (!e.awake) { e.awake = true; e.state = "move"; e.t = 0; } }
    function shout(x, z, r) {
        for (const e of w.enemies) if (!e.awake && hypot2(e.pos.x - x, e.pos.z - z) < r) { const f = w.flow[idx(tileOf(e.pos.x), tileOf(e.pos.z))]; if (f >= 0) wake(e); }
    }
    function shieldBlocks(e, dirx, dirz) {
        if (!e.shieldUp || e.state === "exposed" || e.state === "tell") return false;
        // The shot travels along (dirx, dirz); the shield faces e.face. Blocked if they oppose.
        return e.face[0] * dirx + e.face[1] * dirz < -0.2;
    }
    function hitEnemy(e, dmg, p, dx, dz, o = {}) {
        if (!e.alive) return "dead";
        wake(e);
        if (!o.blast && !o.pierce && shieldBlocks(e, dx, dz)) {
            s.burst({ at: p ?? e.pos, count: 6, color: ["#ffffff", "#7df0ff", "#c8d2dc"], speed: [3, 9], life: [0.1, 0.3], size: [0.05, 0.12], dim: 3 });
            w.marker = 0.14; w.markerK = 2;
            sfx("ping");
            e.kx += dx * 1.6; e.kz += dz * 1.6;
            e.flashT = Math.max(e.flashT, 0.03);
            return "block";
        }
        const mult = e.state === "stunned" ? 1.6 : 1;
        e.hp -= dmg * mult;
        e.flashT = 0.09;
        e.squash = 1;
        const k = (o.knock ?? 3) * (e.def.mass ? 2 / e.def.mass : 1);
        e.kx += dx * k; e.kz += dz * k;
        if (e.stun <= 0 && dmg >= 10 && !e.def.mass) e.stun = Math.min(0.2, 0.05 + dmg * 0.006);
        if (p) s.burst({ at: p, count: o.quiet ? 2 : 4, color: [fxChip(e), "#fff6d8"], speed: [2, 7], life: [0.12, 0.34], size: [0.05, 0.14], gravity: 0.5, dim: 3 });
        if (!o.quiet) { w.marker = 0.16; w.markerK = e.state === "stunned" ? 3 : 1; sfx(e.state === "stunned" ? "crit" : "hit"); }
        if (e.hp <= 0) killEnemy(e, dx, dz, o);
        return "hit";
    }
    const fxChip = (e) => (e.kind === "n" ? "#34a853" : e.kind === "s" ? "#7a3fc8" : e.kind === "f" ? "#22a7b8" : e.kind === "o" ? "#e8842a" : e.kind === "M" ? "#d13a2a" : e.kind === "K" ? "#f4c542" : "#8c8ca0");

    function spawnDebris(x, y, z, frame, vx, vy, vz, size = 0.5, life = 5) {
        if (w.debris.length > 36) { w.debris[0].destroy(); w.debris.shift(); }
        const e = s.add([dim(3), billboard("debris", { size, frame, unlit: false }), pos(x, y, z), { vel3: [vx, vy, vz], life, size0: size }]);
        w.debris.push(e);
        return e;
    }
    function shatter(e, n, dx, dz) {
        const d = e.def, x = e.pos.x, y = e.pos.y, z = e.pos.z, top = y + d.size * 0.4;
        spawnDebris(x, top, z, d.hat, dx * 4 + fx.range(-2, 2), 10 + fx.range(0, 3), dz * 4 + fx.range(-2, 2), 0.9, 7); // The hat always flies off.
        for (let i = 0; i < n; i++) {
            const f = d.chips[i % d.chips.length];
            spawnDebris(x + fx.range(-0.3, 0.3), y + fx.range(-0.4, 0.5), z + fx.range(-0.3, 0.3), f, dx * 5 + fx.range(-5, 5), fx.range(3, 10), dz * 5 + fx.range(-5, 5), fx.range(0.22, 0.44));
        }
        const at = new Vec(x, y + 0.2, z);
        s.burst({ at, count: 26, color: ["#ff4a5e", "#ffd24a", "#34d399", "#60a5fa", "#f472b6", "#ffffff"], speed: [3, 10], life: [0.5, 1.2], size: [0.07, 0.17], gravity: 0.28, dim: 3 });
        s.burst({ at, count: 12, color: ["#f8f3e8", fxChip(e), "#c4bbaa"], speed: [4, 12], life: [0.2, 0.6], size: [0.1, 0.24], gravity: 1, dim: 3 });
    }
    function killEnemy(e, dx, dz, o = {}) {
        if (!e.alive) return;
        w.enemies.splice(w.enemies.indexOf(e), 1);
        w.kills++; run.kills++;
        w.kill = 0.3;
        w.stop = Math.max(w.stop, e.def.mass ? 0.08 : 0.034); // A sliver of hit-stop sells the pop.
        shatter(e, e.def.mass ? 12 : 6, dx, dz);
        sfx(e.def.mass ? "popBig" : "pop");
        game.vibrate(14);
        w.comboT = 1.6; w.combo++;
        if (w.combo >= 2) big(["", "", "DOUBLE SMASH!", "TRIPLE SMASH!", "QUAD SMASH!", "GNOMEGEDDON!"][Math.min(w.combo, 5)] || "GNOMEGEDDON!", 1);
        if (e.summoned || (e.def.drop && s.rng.next() < e.def.drop)) dropLoot(e.pos.x, e.pos.z); // The King's guests always pay their way
        if (e.kind === "o") s.wait(0.02, () => explode(e.pos.x, 1, e.pos.z, 5.4, 70, "gnome"));
        if (e.kind === "M") { dropAt(e.pos.x, e.pos.z, "+"); dropAt(e.pos.x + 1, e.pos.z, "a"); }
        e.destroy();
        publish(w);
        if (e.kind === "K") bossDead(e);
    }
    function dropAt(x, z, code) {
        const e = s.add(pickupComps(code, 0, 0));
        e.teleport(x, 0.7, z);
        e.vy = 5;
    }
    function dropLoot(x, z) {
        const needs = [];
        if (run.hp < 60) needs.push("-", "-");
        if (run.owned[1] && run.ammo.thorns < 12) needs.push("t");
        if (run.owned[2] && run.ammo.hornets < 80) needs.push("h");
        if (run.owned[3] && run.ammo.pumpkins < 3) needs.push("p");
        if (run.owned[4] && run.ammo.bulbs < 4) needs.push("z");
        if (!needs.length) needs.push("-");
        dropAt(x, z, s.rng.pick(needs));
    }

    function boomFx(x, y, z, size) {
        const e = s.add([dim(3), billboard("boom", { size, unlit: true }), pos(x, y, z), { t: 0 }]);
        w.fxs.push({ e, kind: "boom", t: 0, dur: 0.34 });
    }
    function explode(x, y, z, R, dmg, source) {
        boomFx(x, y, z, R * 1.5);
        boomFx(x + fx.range(-0.6, 0.6), y + 0.6, z + fx.range(-0.6, 0.6), R * 0.9);
        s.burst({ at: new Vec(x, y, z), count: 22, color: ["#ffd24a", "#ff9a3c", "#ffffff", "#c9371c"], speed: [4, 15], life: [0.3, 0.8], size: [0.1, 0.28], gravity: 0.7, dim: 3 });
        sfx("boom");
        w.flash = Math.min(1.6, w.flash + 1.1);
        const pd = Math.hypot(player.pos.x - x, player.pos.y - y, player.pos.z - z);
        s.shake(Math.max(0.05, 0.3 * (1 - pd / 22)), 0.32);
        const victims = [...w.enemies];
        for (const e of victims) {
            const dx = e.pos.x - x, dz = e.pos.z - z, d = Math.hypot(dx, e.pos.y - y, dz);
            if (d > R || !seesPoint(x, y + 0.2, z, e.pos.x, e.pos.y, e.pos.z)) continue;
            const f = 1 - d / (R * 1.4), l = hypot2(dx, dz) || 1;
            hitEnemy(e, dmg * f * (source === "gnome" ? 0.75 : 1), null, dx / l, dz / l, { blast: true, knock: 14 * f, quiet: source !== "player" });
        }
        if (pd < R && seesPoint(x, y + 0.2, z, player.pos.x, player.pos.y, player.pos.z)) {
            const f = 1 - pd / (R * 1.2), l = pd || 1;
            player.vel.x += (player.pos.x - x) / l * 13 * f; player.vel.z += (player.pos.z - z) / l * 13 * f; player.vel.y += 9 * f + (source === "player" ? 5 : 0);
            hurtPlayer((source === "player" ? 0.34 : 1) * dmg * 0.5 * f, { x, z });
        }
        for (const b of [...w.barrels]) if (Math.hypot(b.pos.x - x, b.pos.z - z) < R) s.wait(0.09, () => blowBarrel(b));
    }
    function blowBarrel(b) {
        if (!b.alive) return;
        const i = w.barrels.indexOf(b);
        if (i >= 0) w.barrels.splice(i, 1);
        const { x, z } = b.pos;
        b.destroy();
        explode(x, 1, z, 6.4, 130, "player");
    }

    // Weapons -------------------------------------------------------------------------------------------
    const lookDir = (yaw, pitch) => { const cp = Math.cos(pitch); return new Vec(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp); };
    function seesPoint(ax, ay, az, bx, by, bz) {
        const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
        if (d < 0.01) return true;
        return !s.raycast([ax, ay, az], [dx, dy, dz], { tag: "wall", max: d, dim: 3 });
    }
    const eyeY = () => player.pos.y + EYE;
    /** The enemy nearest the crosshair within `cone` radians and with a clear line, plus its bearing. */
    function aimTarget(cone, reach = 40) {
        const px = player.pos.x, py = eyeY(), pz = player.pos.z, f = lookDir(w.yaw, w.pitch);
        let best = null, bestA = cone;
        for (const e of w.enemies) {
            if (e.hidden) continue;
            const ey = e.pos.y, dx = e.pos.x - px, dy = ey - py, dz = e.pos.z - pz, d = Math.hypot(dx, dy, dz);
            if (d > reach || d < 0.1) continue;
            const a = Math.acos(Math.min(1, (dx * f.x + dy * f.y + dz * f.z) / d));
            const widen = Math.atan(e.def.w * 0.5 / d); // Big or near things are easier to hit.
            if (a - widen < bestA && seesPoint(px, py, pz, e.pos.x, ey, e.pos.z)) { bestA = a - widen; best = e; }
        }
        return best;
    }
    function tracer(ax, ay, az, bx, by, bz, col, width) {
        const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
        if (d < 1) return;
        const e = s.add([dim(3), mesh("box", { size: [width, width, d], color: col, unlit: true, shadow: false }), pos((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)]);
        e.lookAt([bx, by, bz]);
        w.fxs.push({ e, kind: "tracer", t: 0, dur: 0.06 });
    }
    function fire() {
        const wp = WEAPONS[run.cur];
        if (wp.ammo) {
            if (run.ammo[wp.ammo] <= 0) {
                sfx("empty");
                w.cd = 0.3;
                const next = bestWeapon();
                if (next !== run.cur) setWeapon(next);
                return;
            }
            run.ammo[wp.ammo]--;
        }
        w.cd = wp.cd;
        w.shots++; run.shots++;
        w.kickV += wp.kick * 6;
        w.vmKick = wp.vm;
        w.vmFrameT = Math.min(0.1, wp.cd * 0.6);
        w.muzzle = 0.055;
        w.flash = Math.min(1.2, w.flash + (wp.proj ? 0.3 : run.cur === 1 ? 0.6 : 0.16));
        if (wp.shake) s.shake(wp.shake, 0.12);
        game.vibrate(wp.proj || run.cur === 1 ? 16 : 6);
        sfx(wp.sound);
        shout(player.pos.x, player.pos.z, 13);

        const touch = s.input.touchMode;
        const assist = aimTarget(touch ? 0.1 : 0.02);
        let yaw = w.yaw, pitch = w.pitch;
        if (assist) {
            const dx = assist.pos.x - player.pos.x, dz = assist.pos.z - player.pos.z, dy = assist.pos.y - eyeY(), h = hypot2(dx, dz);
            yaw = Math.atan2(-dx, -dz);
            pitch = Math.atan2(dy, h);
        }
        const from = new Vec(player.pos.x, eyeY(), player.pos.z);
        if (wp.proj) {
            const d = lookDir(yaw, pitch + 0.13);
            const vis = s.add([dim(3), billboard("shots", { size: 0.8, frame: 2, unlit: true }), pos(from.x + d.x * 0.8, from.y - 0.2 + d.y, from.z + d.z * 0.8)]);
            w.shotsP.push({ e: vis, vx: d.x * 27, vy: d.y * 27, vz: d.z * 27, g: -16, life: 2.2, bounces: 1, r: 0.35 });
            return;
        }
        // The fired-from point on screen, for tracers: slightly below the eye and to the right.
        const f0 = lookDir(w.yaw, w.pitch), rx = Math.cos(w.yaw), rz = -Math.sin(w.yaw);
        const mx = from.x + f0.x * 0.7 + rx * 0.16, my = from.y + f0.y * 0.7 - 0.2, mz = from.z + f0.z * 0.7 + rz * 0.16;
        const rng = s.rng;
        let hitAny = false;
        const seen = new Map();
        for (let i = 0; i < wp.pellets; i++) {
            const sx = wp.pellets > 1 ? rng.range(-wp.spread, wp.spread) : rng.range(-wp.spread, wp.spread);
            const sy = rng.range(-wp.spread, wp.spread) * 0.7;
            const d = lookDir(yaw + sx, pitch + sy);
            if (wp.pierce) {
                let dist = 60, ignore = [player];
                for (let n = 0; n < 8; n++) {
                    const h = s.raycast(from, d, { max: 60, dim: 3, ignore });
                    if (!h) break;
                    if (h.entity.is("enemy")) { ignore.push(h.entity); if (hitEnemy(h.entity, wp.dmg, h.point, d.x, d.z, { knock: wp.knock, pierce: true }) !== "block") hitAny = true; continue; }
                    if (h.entity.is("barrel")) { blowBarrel(h.entity); }
                    if (h.entity.is("switch")) flipSwitch(h.entity);
                    dist = h.dist; impact(h.point, h.normal, wp); break;
                }
                bolt(mx, my, mz, from.x + d.x * dist, from.y + d.y * dist, from.z + d.z * dist);
                continue;
            }
            const h = s.raycast(from, d, { max: 70, dim: 3, ignore: player });
            const end = h ? h.point : from.add(d.mul(60));
            if (fx.next() < wp.tracer) tracer(mx, my, mz, end.x, end.y, end.z, wp.color, run.cur === 2 ? 0.035 : 0.025);
            if (!h) continue;
            const ent = h.entity;
            if (ent.is("enemy")) {
                const r = seen.get(ent) ?? { dmg: 0, p: h.point, dx: d.x, dz: d.z };
                r.dmg += wp.dmg; seen.set(ent, r);
            } else if (ent.is("barrel")) { blowBarrel(ent); hitAny = true; } else if (ent.is("switch")) flipSwitch(ent);
            else {
                impact(h.point, h.normal, wp);
                if (ent.is("door") && ent.kind === "S") openDoor(ent);
            }
        }
        for (const [e, r] of seen) {
            const res = hitEnemy(e, r.dmg, r.p, r.dx, r.dz, { knock: wp.knock ?? 3 });
            if (res === "hit") hitAny = true;
        }
        if (hitAny) { w.hits++; run.hits++; }
    }
    function bolt(ax, ay, az, bx, by, bz) {
        const n = 6;
        let px = ax, py = ay, pz = az;
        for (let i = 1; i <= n; i++) {
            const t = i / n, j = i === n ? 0 : 0.28, x = ax + (bx - ax) * t + fx.range(-j, j), y = ay + (by - ay) * t + fx.range(-j, j), z = az + (bz - az) * t + fx.range(-j, j);
            tracer(px, py, pz, x, y, z, "#bff6ff", 0.05);
            px = x; py = y; pz = z;
        }
    }
    function impact(p, n, wp) {
        s.burst({ at: p.add(n.mul(0.05)), count: 4, color: [wp.color, "#fff6d8", th.fog.color], speed: [1.5, 6], life: [0.1, 0.3], size: [0.04, 0.1], gravity: 0.6, dim: 3 });
    }
    function bestWeapon() {
        for (const i of [2, 1, 3, 4, 0]) { const a = WEAPONS[i].ammo; if (run.owned[i] && (!a || run.ammo[a] > 0)) return i; }
        return 0;
    }
    function setWeapon(i) {
        if (i === run.cur || !run.owned[i]) return;
        run.cur = i; w.swap = 1; sfx("swap"); w.cd = Math.max(w.cd, 0.12);
        publish(w);
    }
    function cycleWeapon(dir) {
        for (let n = 1; n <= 5; n++) {
            const i = (run.cur + dir * n + 50) % 5, a = WEAPONS[i].ammo;
            if (run.owned[i] && (!a || run.ammo[a] > 0)) { setWeapon(i); return; }
        }
    }

    // Doors, switches, triggers -----------------------------------------------------------------------
    function openDoor(d) {
        if (d.kind === "S" && d.sealed) { d.sealed = false; d.want = 1; d.openT = 9999; w.flowDirty = true; sfx("door"); return; }
        if (d.want === 0) sfx("door");
        d.want = 1;
    }
    function flipSwitch(e) {
        if (e.flipped) return;
        e.flipped = true; e.frame = 17;
        w.checkpoint = { x: player.pos.x, z: player.pos.z };
        sfx("click"); sfx("door");
        for (const d of w.doors) if (d.kind === "G") { d.locked = false; openDoor(d); d.openT = 9999; }
        w.flowDirty = true;
        toast("Something heavy rumbles open, far away.");
        s.shake(0.06, 0.3);
    }
    function ambush(c, r) {
        for (const d of w.doors) if (d.kind === "C" && d.sealed && hypot2(d.c - c, d.r - r) < 14) {
            d.sealed = false; d.locked = false; d.want = 1; d.openT = 9999; sfx("door");
            for (const e of w.enemies) if (hypot2(tileOf(e.pos.x) - d.c, tileOf(e.pos.z) - d.r) < 6) wake(e);
        }
        w.flowDirty = true;
    }
    function updateDoors(dt) {
        const px = player.pos.x, pz = player.pos.z;
        for (const d of w.doors) {
            const dist = hypot2(d.pos.x - px, d.pos.z - pz);
            if (d.kind === "S" && d.sealed) {
                if (dist < 2.3) openDoor(d);
                else if (dist < 12 && fx.next() < 0.03) s.burst({ at: new Vec(d.pos.x + fx.range(-1.3, 1.3), fx.range(0.3, 2.4), d.pos.z + fx.range(-1.3, 1.3)), count: 1, color: "#ffe066", speed: [0.4, 1], life: [0.5, 0.9], size: [0.05, 0.09], dim: 3 });
            } else if (d.locked && d.key && dist < 3.2) {
                if (w.keys.has(d.key)) { d.locked = false; toast(`${KEY_NAME[d.key]} door unlocked`); w.flowDirty = true; openDoor(d); } else if (w.lockT <= 0 || w.lockT === undefined) { sfx("locked"); toast(`Needs the ${KEY_NAME[d.key]} KEY`); w.lockT = 1.4; }
            } else if (!d.locked && !d.sealed && d.kind !== "S" && d.kind !== "G" && d.kind !== "C") {
                let near = dist < 4.2;
                if (!near) for (const e of w.enemies) if (e.awake && !e.hidden && hypot2(d.pos.x - e.pos.x, d.pos.z - e.pos.z) < 3.4) { near = true; break; }
                if (near) { openDoor(d); d.openT = 2; }
            }
            if (d.want && d.openT < 9000) { d.openT -= dt; if (d.openT <= 0 && !(dist < 3)) d.want = 0; }
            if (d.open !== d.want) {
                d.open = d.want > d.open ? Math.min(1, d.open + dt * 3.6) : Math.max(0, d.open - dt * 2.6);
                d.pos.y = d.y0 - d.open * (d.H + 0.2);
                d.hidden = d.open >= 1; // Fully open: out of physics, raycasts and the draw list.
            }
        }
        if (w.lockT > 0) w.lockT -= dt;
        for (const e of w.switches) if (!e.flipped && hypot2(e.pos.x - px, e.pos.z - pz) < 2.3) flipSwitch(e);
    }
    function updateTriggers() {
        const c = tileOf(player.pos.x), r = tileOf(player.pos.z);
        for (const t of w.triggers) if (!t.done && hypot2(t.c - c, t.r - r) < 2) { t.done = true; ambush(t.c, t.r); }
        for (const t of w.secretTiles) if (!t.found && hypot2(t.c - c, t.r - r) < 1.6) {
            t.found = true; w.secrets++; run.secrets++; sfx("secret"); big("SECRET FOUND!", 1.6);
            s.burst({ at: new Vec(player.pos.x, 1.6, player.pos.z), count: 30, color: ["#ffe066", "#ffffff"], speed: [2, 7], life: [0.5, 1], size: [0.06, 0.14], gravity: 0.2, dim: 3 });
            publish(w);
        }
        if (L.def.theme === 5 && !w.bossAwake && w.boss && r <= 21) {
            w.bossAwake = true; w.title = 0;
            w.checkpoint = { x: player.pos.x, z: player.pos.z };
            for (const d of w.doors) { d.locked = true; d.want = 0; d.openT = 0; }
            w.flowDirty = true;
            wake(w.boss);
            big("KING GRUMBOLD THE GLAZED", 2.6);
            sfx("bossRoar");
            s.shake(0.2, 0.7);
        }
    }

    // Pickups ------------------------------------------------------------------------------------------
    function take(e) {
        const p = e.item;
        if (p.what === "hp") {
            if (run.hp >= (p.over ? 150 : 100)) return false;
            run.hp = Math.min(p.over ? 150 : 100, run.hp + p.n);
        } else if (p.what === "armor") {
            if (run.armor >= 100) return false;
            run.armor = Math.min(100, run.armor + p.n);
        } else if (p.what === "key") {
            w.keys.add(p.key); ambush(tileOf(e.pos.x), tileOf(e.pos.z)); w.objT = 0;
            w.checkpoint = { x: player.pos.x, z: player.pos.z };
        } else if (p.what === "weapon") {
            const fresh = !run.owned[p.weapon], wp = WEAPONS[p.weapon];
            run.owned[p.weapon] = true;
            run.ammo[wp.ammo] = Math.min(AMMO_MAX[wp.ammo], run.ammo[wp.ammo] + p.n);
            if (fresh) { run.cur = p.weapon; w.swap = 1; }
        } else {
            if (run.ammo[p.what] >= AMMO_MAX[p.what]) return false;
            run.ammo[p.what] = Math.min(AMMO_MAX[p.what], run.ammo[p.what] + p.n);
        }
        sfx(p.snd);
        toast(p.label, 1.8);
        w.heal = 0.3;
        game.vibrate(8);
        publish(w);
        return true;
    }
    function updatePickups(dt) {
        const px = player.pos.x, py = player.pos.y, pz = player.pos.z, t = s.time;
        for (let i = w.pickups.length - 1; i >= 0; i--) {
            const e = w.pickups[i];
            if (e.vy !== undefined) { e.pos.y += e.vy * dt; e.vy -= 18 * dt; if (e.pos.y < 0.7) { e.pos.y = 0.7; e.vy = undefined; } } else e.pos.y = 0.72 + Math.sin(t * 3 + e.phase) * 0.1;
            const dx = px - e.pos.x, dz = pz - e.pos.z;
            if (dx > 4 || dx < -4 || dz > 4 || dz < -4) continue;
            const d = hypot2(dx, dz);
            if (d < 1.15 && Math.abs(py - e.pos.y) < 2.6 && take(e)) { w.pickups.splice(i, 1); e.destroy(); } else if (d < 2.6 && !e.item.over && e.item.what !== "key" && e.item.what !== "weapon") { e.pos.x += dx / d * dt * 2; e.pos.z += dz / d * dt * 2; }
        }
    }

    // Player -------------------------------------------------------------------------------------------
    function updatePlayer(dt) {
        const inp = s.input, look = inp.look, touch = inp.touchMode;
        const sens = (touch ? 0.0052 * settings.touchSens : 0.0028 * settings.sens);
        let lx = look.x, ly = look.y;
        if (touch) { // A gentle curve: fine aim for small drags, fast turns for big swipes.
            const m = Math.hypot(lx, ly);
            const k = 0.72 + Math.min(1, m / 14) * 0.7;
            lx *= k; ly *= k;
            w.stickT = m > 0.5 ? 0.25 : Math.max(0, w.stickT - dt);
        }
        w.yaw -= lx * sens;
        w.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, w.pitch - ly * sens));

        // Aim assist: thumbs are not mice. Pull gently towards the nearest target, and level the view to it.
        w.target = touch ? aimTarget(0.3, 32) : aimTarget(0.012, 40);
        if (touch && w.target && settings.autofire !== "off") {
            const e = w.target, dx = e.pos.x - player.pos.x, dz = e.pos.z - player.pos.z;
            const want = Math.atan2(-dx, -dz), d = angDiff(want, w.yaw), pitchWant = Math.atan2(e.pos.y - eyeY(), hypot2(dx, dz));
            const rate = (w.stickT > 0 ? 2.2 : 1.1) * dt;
            w.yaw += d * Math.min(1, rate);
            w.pitch += (pitchWant - w.pitch) * Math.min(1, 7 * dt);
        }

        // Movement
        const mv = inp.move, fx0 = -Math.sin(w.yaw), fz0 = -Math.cos(w.yaw), rx = Math.cos(w.yaw), rz = -Math.sin(w.yaw);
        const wishX = rx * mv.x - fx0 * mv.y, wishZ = rz * mv.x - fz0 * mv.y;
        const grounded = player.grounded;
        if (grounded) w.coyote = 0.1; else w.coyote -= dt;
        if (inp.pressed("jump")) w.buffer = 0.13; else w.buffer -= dt;
        if (w.buffer > 0 && w.coyote > 0) { player.vel.y = JUMP; w.buffer = 0; w.coyote = 0; sfx("jump"); }
        w.dashCD -= dt;
        if (inp.pressed("dash") && w.dashCD <= 0) {
            const l = hypot2(wishX, wishZ);
            w.dashDir = l > 0.1 ? [wishX / l, wishZ / l] : [fx0, fz0];
            w.dashT = DASH_T; w.dashCD = DASH_CD;
            sfx("dash");
            game.vibrate(10);
        }
        if (w.dashT > 0) {
            w.dashT -= dt;
            player.vel.x = w.dashDir[0] * DASH_V; player.vel.z = w.dashDir[1] * DASH_V;
            if (player.vel.y < 0) player.vel.y = 0;
        } else {
            const k = 1 - Math.exp(-(grounded ? ACC_GROUND : ACC_AIR) * dt);
            player.vel.x += (wishX * SPEED - player.vel.x) * k;
            player.vel.z += (wishZ * SPEED - player.vel.z) * k;
        }

        // Landing dip and head bob
        const fall = w.air;
        if (grounded && fall < -6) { w.dipV -= Math.min(5, -fall * 0.34); if (fall < -9) sfx("land"); }
        w.air = grounded ? 0 : player.vel.y;
        w.dipV += (-w.dip * 160 - w.dipV * 18) * dt; w.dip += w.dipV * dt;
        const sp = hypot2(player.vel.x, player.vel.z);
        w.bob += sp * dt * 1.12;
        if (grounded && sp > 4 && Math.floor(w.bob / Math.PI) !== w.stepT) { w.stepT = Math.floor(w.bob / Math.PI); sfx("step"); }
        w.bobA += ((grounded ? Math.min(1, sp / SPEED) : 0) - w.bobA) * Math.min(1, 12 * dt);

        // Hazard floor
        const tc = tileOf(player.pos.x), tr = tileOf(player.pos.z);
        if (L.ch(tc, tr) === "~" && player.pos.y < P_H / 2 + 0.3) {
            w.hazT -= dt;
            if (w.hazT <= 0) { w.hazT = 0.4; hurtPlayer(th.hazDmg * 0.45, null); toast(`Ouch! ${th.hazName}!`, 1.2); }
        }
        const li = idx(Math.max(0, Math.min(L.Cn - 1, tc)), Math.max(0, Math.min(L.R - 1, tr))) * 3;
        for (let i = 0; i < 3; i++) w.playerLight[i] += (Math.min(1.35, 0.32 + L.tl[li + i]) - w.playerLight[i]) * Math.min(1, 7 * dt);

        // Fire control: the mouse only counts while captured, so the capturing click doesn't shoot.
        const pointerDown = s.input.pointer.down, mouse = !touch && pointerDown && (SCRIPTED || game.pointerLocked);
        let wantFire = inp.down("fire") || mouse;
        const wp = WEAPONS[run.cur];
        if (touch && settings.autofire !== false && !wantFire) {
            const t = aimTarget(0.075, 36);
            if (t) {
                const close = wp.proj && t.dist < 6;
                if (!close) wantFire = true;
            }
        }
        w.autoT = wantFire ? 0.1 : Math.max(0, w.autoT - dt);
        w.cd -= dt;
        if (run.cur === 2) w.spin += ((wantFire ? 1 : 0) - w.spin) * Math.min(1, 10 * dt);
        if (wantFire && w.cd <= 0 && w.swap < 0.4) fire();

        // Weapon selection
        for (let i = 0; i < 5; i++) if (inp.pressed(`w${i + 1}`)) setWeapon(i);
        if (inp.pressed("swap")) cycleWeapon(1);
        if (inp.wheel) cycleWeapon(inp.wheel > 0 ? 1 : -1);
        w.swap = Math.max(0, w.swap - dt * 4.5);

        // Camera
        w.kick += w.kickV * dt; w.kickV += (-w.kick * 130 - w.kickV * 15) * dt;
        const view = w.pitch + Math.max(-0.2, Math.min(0.2, w.kick));
        const cp = Math.cos(view), bobY = Math.sin(w.bob * 2) * 0.055 * w.bobA, bobX = Math.cos(w.bob) * 0.04 * w.bobA;
        const cam = s.cam3;
        cam.offset.set(rx * bobX, EYE + bobY + w.dip, rz * bobX);
        cam.lookOffset.set(rx * bobX - Math.sin(w.yaw) * cp, EYE + bobY + w.dip + Math.sin(view), rz * bobX - Math.cos(w.yaw) * cp);
        const strafe = (player.vel.x * rx + player.vel.z * rz) / SPEED;
        hurtCam.roll *= Math.exp(-7 * dt);
        const roll = -strafe * 0.016 + hurtCam.roll;
        cam.up.set(rx * roll, 1, rz * roll);
        cam.fov += ((w.dashT > 0 ? 84 : 74) - cam.fov) * Math.min(1, 14 * dt);
    }

    // Enemies ------------------------------------------------------------------------------------------
    function chase(e, speed) {
        let vx = 0, vz = 0;
        const dir = e.see && e.dist < 7 ? null : flowDir(e);
        if (dir) { vx = dir[0] * speed; vz = dir[1] * speed; } else if (e.see) { vx = e.tox * speed; vz = e.toz * speed; }
        return [vx, vz];
    }
    function setMove(e, vx, vz) { e.vel.x = vx + e.kx; e.vel.z = vz + e.kz; }
    function enemyShot(e, x, y, z, speed, frame, size, dmg, aimY = 0, spread = 0) {
        const tx = player.pos.x, ty = eyeY() - 0.2 + aimY, tz = player.pos.z;
        const dx = tx - x, dy = ty - y, dz = tz - z, l = Math.hypot(dx, dy, dz) || 1;
        const a = spread, c = Math.cos(a), sn = Math.sin(a), hx = (dx * c - dz * sn) / l, hz = (dx * sn + dz * c) / l;
        const vis = s.add([dim(3), billboard("shots", { size, frame, unlit: true }), pos(x, y, z)]);
        w.shotsE.push({ e: vis, vx: hx * speed, vy: dy / l * speed, vz: hz * speed, g: 0, life: 3.5, dmg, r: 0.45 });
    }
    const AI = {
        nib(e, dt) {
            e.t -= dt;
            if (e.state === "move") {
                e.side = Math.sin(s.time * 3 + e.id) > 0 ? 1 : -1;
                const [vx, vz] = chase(e, e.def.speed);
                const zig = e.dist < 18 ? 2.6 : 0;
                setMove(e, vx - vz / e.def.speed * zig * e.side, vz + vx / e.def.speed * zig * e.side);
                if (e.dist < 2.3) { e.state = "tell"; e.t = 0.3; sfx("tellNib"); }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                if (e.t <= 0) { e.state = "act"; e.t = 0.16; e.lx = e.tox; e.lz = e.toz; if (e.dist < 2.6) hurtPlayer(7, e.pos); }
            } else if (e.state === "act") {
                setMove(e, e.lx * 8, e.lz * 8);
                if (e.t <= 0) { e.state = "rest"; e.t = 0.85; }
            } else { setMove(e, -e.tox * 3, -e.toz * 3); if (e.t <= 0) e.state = "move"; }
        },
        sling(e, dt) {
            e.t -= dt; e.cd -= dt;
            if (e.state === "move") {
                let [vx, vz] = chase(e, e.def.speed);
                if (e.see && e.dist < 11) { vx = -e.tox * e.def.speed; vz = -e.toz * e.def.speed; }
                if (e.see && e.dist < 24) { vx = vx * 0.3 + (-e.toz * e.side) * e.def.speed; vz = vz * 0.3 + (e.tox * e.side) * e.def.speed; }
                if (s.rng.next() < dt * 0.5) e.side *= -1;
                setMove(e, vx, vz);
                if (e.see && e.cd <= 0 && e.dist < 30) { e.state = "tell"; e.t = 0.55; sfx("tellSling"); }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                if (e.t <= 0) {
                    enemyShot(e, e.pos.x, e.pos.y + 0.3, e.pos.z, 15, 0, 0.55, 8);
                    sfx("sling"); e.state = "act"; e.t = 0.25; e.cd = 1.4 + s.rng.range(0, 1.4);
                }
            } else { setMove(e, 0, 0); if (e.t <= 0) e.state = "move"; }
        },
        fly(e, dt) {
            e.t -= dt; e.cd -= dt;
            const hover = 2.3 + Math.sin(s.time * 2.4 + e.id) * 0.25;
            if (e.state === "move") {
                e.pos.y += (hover - e.pos.y) * Math.min(1, 3 * dt);
                let [vx, vz] = chase(e, e.def.speed);
                if (e.see && e.dist < 13) { vx = -e.toz * e.side * e.def.speed; vz = e.tox * e.side * e.def.speed; }
                setMove(e, vx, vz);
                if (e.see && e.cd <= 0 && e.dist < 18) { e.state = "tell"; e.t = 0.6; sfx("tellFly"); }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                e.pos.y += dt * 1.4;
                if (e.t <= 0) {
                    const dx = player.pos.x - e.pos.x, dy = eyeY() - 0.3 - e.pos.y, dz = player.pos.z - e.pos.z, l = Math.hypot(dx, dy, dz) || 1;
                    e.dvx = dx / l * 19; e.dvy = dy / l * 19; e.dvz = dz / l * 19;
                    e.state = "dive"; e.t = 0.75; sfx("dive"); e.hit = false;
                }
            } else if (e.state === "dive") {
                setMove(e, e.dvx, e.dvz);
                e.pos.y += e.dvy * dt;
                if (e.pos.y < 0.8) { e.pos.y = 0.8; e.dvy = 0; }
                if (!e.hit && Math.hypot(player.pos.x - e.pos.x, player.pos.y - e.pos.y, player.pos.z - e.pos.z) < 1.6) { e.hit = true; hurtPlayer(11, e.pos); e.t = Math.min(e.t, 0.1); }
                if (e.t <= 0) { e.state = "rest"; e.t = 0.7; e.cd = 2 + s.rng.range(0, 2); }
            } else { setMove(e, e.tox * 2, e.toz * 2); e.pos.y += (hover - e.pos.y) * Math.min(1, 3 * dt); if (e.t <= 0) e.state = "move"; }
        },
        shield(e, dt) {
            e.t -= dt; e.cd -= dt;
            if (e.see) {
                const cur = Math.atan2(e.face[0], e.face[1]), want = Math.atan2(e.tox, e.toz), d = angDiff(want, cur), rate = 2.1 * dt;
                const a = cur + Math.max(-rate, Math.min(rate, d));
                e.face = [Math.sin(a), Math.cos(a)];
            }
            if (e.state === "move") {
                const [vx, vz] = chase(e, e.def.speed);
                setMove(e, vx, vz);
                if (e.see && e.dist < 7.5 && e.cd <= 0) { e.state = "tell"; e.t = 0.7; sfx("tellShield"); }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                if (e.t <= 0) { e.state = "act"; e.t = 0.42; e.lx = e.tox; e.lz = e.toz; e.hit = false; sfx("bash"); }
            } else if (e.state === "act") {
                setMove(e, e.lx * 15, e.lz * 15);
                if (!e.hit && e.dist < 2) { e.hit = true; hurtPlayer(16, e.pos); player.vel.x += e.lx * 12; player.vel.z += e.lz * 12; }
                if (e.t <= 0) { e.state = "exposed"; e.t = 1; e.cd = 2 + s.rng.range(0, 1); }
            } else { setMove(e, 0, 0); if (e.t <= 0) e.state = "move"; }
        },
        bomb(e, dt) {
            e.t -= dt;
            if (e.state === "move") {
                const [vx, vz] = chase(e, e.def.speed);
                setMove(e, vx, vz);
                if (e.dist < 3.4) { e.state = "tell"; e.t = 0.72; sfx("fuse"); }
            } else {
                const [vx, vz] = chase(e, e.def.speed * 0.55);
                setMove(e, vx, vz);
                if (e.t <= 0) killEnemy(e, 0, 0);
            }
        },
        mow(e, dt) {
            e.t -= dt; e.cd -= dt;
            if (e.state === "move") {
                const [vx, vz] = chase(e, e.def.speed);
                setMove(e, vx, vz);
                if (e.see && e.cd <= 0 && e.dist < 24) { e.state = "tell"; e.t = 1; sfx("rev"); }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                if (e.t > 0.25) { e.lx = e.tox; e.lz = e.toz; }
                if (e.t <= 0) { e.state = "act"; e.t = 1.5; e.hit = false; sfx("charge"); }
            } else if (e.state === "act") {
                setMove(e, e.lx * 19, e.lz * 19);
                if (!e.hit && e.dist < 2.6) { e.hit = true; hurtPlayer(22, e.pos); player.vel.x += e.lx * 16; player.vel.z += e.lz * 16; player.vel.y += 5; }
                const moved = hypot2(e.pos.x - e.lastX, e.pos.z - e.lastZ);
                if (e.t < 1.35 && moved < 19 * dt * 0.4) { e.state = "stunned"; e.t = 1.9; sfx("wallbonk"); s.shake(0.15, 0.3); s.burst({ at: new Vec(e.pos.x, 1, e.pos.z), count: 14, color: ["#ffd24a", "#c8d2dc"], speed: [3, 10], life: [0.2, 0.6], size: [0.1, 0.2], gravity: 1, dim: 3 }); }
                if (e.t <= 0) { e.state = "stunned"; e.t = 0.8; }
            } else { setMove(e, 0, 0); if (e.t <= 0) { e.state = "move"; e.cd = 1.6; } }
        },
        boss(e, dt) {
            e.t -= dt; e.cd -= dt;
            const hard = e.hp < e.maxHp * 0.5;
            if (hard && e.phase === 1) {
                e.phase = 2; e.state = "rest"; e.t = 1.4; sfx("bossRoar"); s.shake(0.2, 0.8); big("HIS CROWN! NOW HE'S REALLY CROSS", 2.2);
                spawnDebris(e.pos.x, 6, e.pos.z, 0, 0, 12, 0, 1.4, 12);
                s.burst({ at: new Vec(e.pos.x, 5, e.pos.z), count: 40, color: ["#f4c542", "#fff"], speed: [4, 14], life: [0.4, 1], size: [0.1, 0.24], gravity: 0.6, dim: 3 });
            }
            const mode = hard ? 1.35 : 1;
            if (e.state === "move") {
                const [vx, vz] = chase(e, e.def.speed * mode);
                setMove(e, vx, vz);
                if (e.cd <= 0) {
                    const live = w.enemies.length - 1, roll = s.rng.next();
                    const next = live < (hard ? 5 : 3) && roll < 0.3 ? "summon" : roll < 0.68 ? "volley" : "slam";
                    e.next = next; e.state = "tell"; e.t = next === "slam" ? 0.85 : 0.65; sfx("bossTell");
                }
            } else if (e.state === "tell") {
                setMove(e, 0, 0);
                if (e.t <= 0) {
                    if (e.next === "volley") {
                        e.shotsLeft = hard ? 3 : 2; e.state = "volley"; e.t = 0;
                    } else if (e.next === "slam") {
                        sfx("bossSlam"); s.shake(0.3, 0.5); e.state = "act"; e.t = 0.6; e.cd = 1.2;
                        const ring = s.add([dim(3), mesh("ring", { unlit: true, shadow: false }), pos(e.pos.x, 0.5, e.pos.z)]);
                        w.rings.push({ e: ring, r: 1, x: e.pos.x, z: e.pos.z, hit: false, speed: hard ? 19 : 15 });
                    } else {
                        const n = hard ? 4 : 3;
                        for (let i = 0; i < n; i++) {
                            const a = i / n * Math.PI * 2 + e.t, cx = e.pos.x + Math.cos(a) * 5, cz = e.pos.z + Math.sin(a) * 5;
                            if (L.heightAt(cx, cz) > 0) continue;
                            const k = i % 3 === 2 ? "o" : i % 3 === 1 ? "f" : "n";
                            const m = s.add(enemyComps(k, 0, 0));
                            m.teleport(cx, m.homeY, cz);
                            m.summoned = true;
                            w.total++; run.enemies++;
                            wake(m);
                            s.burst({ at: new Vec(cx, 1, cz), count: 16, color: ["#ffffff", "#f4c542"], speed: [2, 8], life: [0.2, 0.5], size: [0.08, 0.16], dim: 3 });
                        }
                        e.state = "act"; e.t = 0.6; e.cd = 2.4;
                    }
                }
            } else if (e.state === "volley") {
                setMove(e, 0, 0);
                if (e.t <= 0) {
                    const n = hard ? 7 : 5, y = e.pos.y + 0.9;
                    for (let i = 0; i < n; i++) enemyShot(e, e.pos.x, y, e.pos.z, hard ? 21 : 17, 6, 1, 13, 0, (i - (n - 1) / 2) * 0.16);
                    sfx("bossShot");
                    e.t = 0.5;
                    if (--e.shotsLeft <= 0) { e.state = "act"; e.t = 0.5; e.cd = 1.3; }
                }
            } else { setMove(e, 0, 0); if (e.t <= 0) e.state = "move"; }
        },
    };
    const FRAMES = {
        nib: (e) => (e.state === "tell" ? 3 : e.state === "act" ? 4 : walkFrame(e)),
        sling: (e) => (e.state === "tell" ? 3 : e.state === "act" ? 4 : walkFrame(e)),
        fly: (e) => (e.state === "tell" || e.state === "dive" ? 3 + (Math.floor(e.animT * 20) % 2) : Math.floor(e.animT * 20) % 2 ? 1 : 2),
        shield: (e) => {
            if (e.state === "tell" || e.state === "exposed") return 3;
            if (e.state === "act") return 4;
            const v = e.face[0] * e.tox + e.face[1] * e.toz;
            return v < -0.25 ? 6 : walkFrame(e);
        },
        bomb: (e) => (e.state === "tell" ? 3 + (Math.floor(e.animT * 16) % 2) : walkFrame(e)),
        mow: (e) => (e.state === "tell" || e.state === "act" ? 3 + (Math.floor(e.animT * 16) % 2) : e.state === "stunned" ? 5 : walkFrame(e)),
        boss: (e) => {
            const p2 = e.phase === 2;
            if (e.state === "tell") return e.next === "summon" ? 4 : p2 ? 7 : 2;
            if (e.state === "act" || e.state === "volley") return 3;
            return p2 ? 6 : Math.floor(e.animT * 2.4) % 2;
        },
    };
    const walkFrame = (e) => (hypot2(e.vel.x, e.vel.z) < 0.4 ? 0 : 1 + (Math.floor(e.animT * 9) % 2));

    /** Pogo pushes overlapping bodies apart without looking at walls, and a body that ends a step inside a
     * merged wall box is then snapped to the box's far edge. So bodies ignore each other here, and crowding is soft. */
    function separate(dt) {
        const list = w.enemies;
        for (let i = 0; i < list.length; i++) {
            const a = list[i];
            if (a.hidden || !a.awake) continue;
            for (let j = i + 1; j < list.length; j++) {
                const b = list[j];
                if (b.hidden || !b.awake) continue;
                const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, want = (a.def.w + b.def.w) * 0.62;
                if (dx > want || dx < -want || dz > want || dz < -want) continue;
                const d = hypot2(dx, dz) || 0.01;
                if (d >= want) continue;
                const push = (want - d) / d * 7 * dt * 60 * 0.05;
                a.kx -= dx * push; a.kz -= dz * push; b.kx += dx * push; b.kz += dz * push;
            }
            const dx = player.pos.x - a.pos.x, dz = player.pos.z - a.pos.z, want = a.def.w * 0.5 + 0.55, d = hypot2(dx, dz) || 0.01;
            if (d < want && !a.def.flying) { a.kx -= dx / d * 2.4; a.kz -= dz / d * 2.4; }
        }
    }
    const inSolid = (x, z, r) => L.heightAt(x + r, z + r) > 90 || L.heightAt(x - r, z + r) > 90 || L.heightAt(x + r, z - r) > 90 || L.heightAt(x - r, z - r) > 90;
    const safe = { x: player.pos.x, y: player.pos.y, z: player.pos.z };
    function keepInWorld() {
        if (inSolid(player.pos.x, player.pos.z, 0.3)) { player.teleport(safe.x, safe.y, safe.z); player.vel.set(0, 0, 0); } else { safe.x = player.pos.x; safe.y = player.pos.y; safe.z = player.pos.z; }
        for (const e of w.enemies) {
            if (e.hidden) continue;
            if (inSolid(e.pos.x, e.pos.z, 0.2)) { if (e.safeX !== undefined) { e.teleport(e.safeX, e.pos.y, e.safeZ); e.kx = e.kz = 0; } } else { e.safeX = e.pos.x; e.safeZ = e.pos.z; }
        }
    }

    function updateEnemies(dt) {
        const px = player.pos.x, pz = player.pos.z, ey = eyeY();
        let active = 0;
        separate(dt);
        for (let i = w.enemies.length - 1; i >= 0; i--) {
            const e = w.enemies[i];
            const dx = px - e.pos.x, dz = pz - e.pos.z, dist = hypot2(dx, dz);
            e.dist = dist;
            const far = dist > CULL_R;
            if (far && !e.awake) { e.hidden = true; continue; }
            e.hidden = false;
            active++;
            e.tox = dx / (dist || 1); e.toz = dz / (dist || 1);
            e.think -= dt;
            if (e.think <= 0) {
                e.think = 0.14 + s.rng.next() * 0.1;
                e.see = dist < SIGHT && seesPoint(e.pos.x, e.pos.y + 0.3, e.pos.z, px, ey, pz);
                if (e.see && !e.awake) {
                    wake(e); shout(e.pos.x, e.pos.z, WAKE_R * 0.6);
                    if (w.time > w.alertT) { w.alertT = w.time + 0.7; sfx("alert"); }
                }
            }
            e.animT += dt;
            if (e.awake) {
                if (e.stun > 0) { e.stun -= dt; setMove(e, 0, 0); } else AI[e.def.id](e, dt);
                if (!e.alive) continue;
                e.kx *= Math.exp(-7 * dt); e.kz *= Math.exp(-7 * dt);
                e.lastX = e.pos.x; e.lastZ = e.pos.z;
            }
            // Face, flash, flinch, waddle
            const v = e.vis;
            v.frame = e.stun > 0 ? 5 : FRAMES[e.def.id](e);
            e.flashT -= dt;
            e.squash *= Math.exp(-14 * dt);
            const li = idx(tileOf(e.pos.x), tileOf(e.pos.z)) * 3;
            const b = e.flashT > 0 ? 3.5 : 1, hot = (e.state === "tell" || e.state === "dive") ? 0.25 : 0;
            v.color.r = (Math.min(1.5, 0.4 + (L.tl[li] || 0)) + hot) * b;
            v.color.g = Math.min(1.5, 0.4 + (L.tl[li + 1] || 0)) * b;
            v.color.b = Math.min(1.5, 0.4 + (L.tl[li + 2] || 0)) * b;
            const sq = e.squash * 0.22, walk = Math.abs(Math.sin(e.animT * 9)) * (e.def.mass || e.def.flying ? 0 : 0.09) * Math.min(1, hypot2(e.vel.x, e.vel.z) / 3);
            v.scale.set(1 + sq, 1 - sq, 1);
            v.pos.y = e.def.size / 2 - e.def.h / 2 + walk;
            e.warn.hidden = !(e.state === "tell" || (e.state === "dive" && e.t > 0.5)) || e.kind === "K";
            e.blob.hidden = dist > 20;
            e.blob.pos.y = -e.pos.y + 0.05;
        }
        w.peak.enemies = Math.max(w.peak.enemies, active);
    }

    // Projectiles and effects ---------------------------------------------------------------------------
    function solidAt(x, y, z) {
        if (y < 0 || L.heightAt(x, z) > y) return true;
        if (th.ceil && y > th.H) return true;
        const c = tileOf(x), r = tileOf(z);
        for (const d of w.doors) if (d.c === c && d.r === r && d.open < 0.7) return true;
        return false;
    }
    function updateShots(dt) {
        const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
        for (let i = w.shotsE.length - 1; i >= 0; i--) {
            const b = w.shotsE[i], e = b.e;
            e.pos.x += b.vx * dt; e.pos.y += b.vy * dt; e.pos.z += b.vz * dt;
            b.life -= dt;
            e.frame = 1 - e.frame === 0 ? 1 : e.frame === 6 ? 6 : e.frame;
            const d2 = (e.pos.x - px) ** 2 + (e.pos.y - py) ** 2 + (e.pos.z - pz) ** 2;
            const hitP = d2 < 1.1 && w.dashT <= 0;
            if (hitP || b.life <= 0 || solidAt(e.pos.x, e.pos.y, e.pos.z)) {
                if (hitP) hurtPlayer(b.dmg, e.pos);
                s.burst({ at: e.pos, count: 6, color: ["#ffb347", "#c9703f", "#ffe08a"], speed: [2, 6], life: [0.1, 0.3], size: [0.06, 0.13], gravity: 0.6, dim: 3 });
                e.destroy(); w.shotsE.splice(i, 1);
            }
        }
        for (let i = w.shotsP.length - 1; i >= 0; i--) {
            const b = w.shotsP[i], e = b.e;
            const ox = e.pos.x, oz = e.pos.z, oy = e.pos.y;
            b.vy += b.g * dt;
            e.pos.x += b.vx * dt; e.pos.y += b.vy * dt; e.pos.z += b.vz * dt;
            b.life -= dt;
            e.frame = 2 + Math.floor(b.life * 12) % 4;
            let hit = false;
            for (const m of w.enemies) {
                const dy = e.pos.y - m.pos.y, hh = m.def.h / 2 + 0.3, hw = m.def.w / 2 + 0.5;
                if (Math.abs(e.pos.x - m.pos.x) < hw && Math.abs(e.pos.z - m.pos.z) < hw && Math.abs(dy) < hh) { hit = true; break; }
            }
            if (!hit && solidAt(e.pos.x, e.pos.y, e.pos.z)) {
                if (b.bounces-- > 0) {
                    if (solidAt(ox, e.pos.y, oz)) { b.vy = -b.vy * 0.5; e.pos.y = Math.max(oy, 0.1); } else if (solidAt(e.pos.x, e.pos.y, oz)) { b.vx = -b.vx * 0.5; e.pos.x = ox; } else { b.vz = -b.vz * 0.5; e.pos.z = oz; }
                    b.vx *= 0.8; b.vz *= 0.8;
                    sfx("land");
                } else hit = true;
            }
            if (hit || b.life <= 0) {
                const { x, y, z } = e.pos;
                e.destroy(); w.shotsP.splice(i, 1);
                explode(x, Math.max(0.5, y), z, 6, 125, "player");
            }
        }
        for (let i = w.rings.length - 1; i >= 0; i--) {
            const q = w.rings[i];
            q.r += q.speed * dt;
            q.e.scale.set(q.r / 2, 1, q.r / 2);
            const d = hypot2(player.pos.x - q.x, player.pos.z - q.z);
            if (!q.hit && Math.abs(d - q.r) < 1.1 && player.pos.y < P_H / 2 + 0.75) { q.hit = true; hurtPlayer(20, { x: q.x, z: q.z }); player.vel.y += 7; }
            if (q.r > 30) { q.e.destroy(); w.rings.splice(i, 1); }
        }
        for (let i = w.fxs.length - 1; i >= 0; i--) {
            const f = w.fxs[i];
            f.t += dt;
            if (f.kind === "boom") f.e.frame = Math.min(5, Math.floor(f.t / f.dur * 6));
            if (f.t >= f.dur) { f.e.destroy(); w.fxs.splice(i, 1); }
        }
        for (let i = w.debris.length - 1; i >= 0; i--) {
            const e = w.debris[i], v = e.vel3;
            if (v) {
                v[1] -= 24 * dt;
                e.pos.x += v[0] * dt; e.pos.y += v[1] * dt; e.pos.z += v[2] * dt;
                const fl = e.size0 * 0.4;
                if (e.pos.y < fl) { e.pos.y = fl; v[1] *= -0.38; v[0] *= 0.6; v[2] *= 0.6; if (Math.abs(v[1]) < 1) e.vel3 = null; }
                if (L.heightAt(e.pos.x, e.pos.z) > e.pos.y) { e.pos.x -= v[0] * dt; e.pos.z -= v[2] * dt; v[0] *= -0.4; v[2] *= -0.4; }
            }
            e.life -= dt;
            if (e.life <= 0) { e.destroy(); w.debris.splice(i, 1); }
        }
    }

    // Boss death and exits ------------------------------------------------------------------------------
    function bossDead(k) {
        const x = k.pos.x, z = k.pos.z;
        w.mode = "bossdead";
        game.stopMusic();
        sfx("bossRoar");
        big("LONG LIVE THE BEGONIAS!", 4);
        for (const e of [...w.enemies]) killEnemy(e, 0, 0);
        for (let i = 0; i < 9; i++) s.wait(i * 0.3, () => {
            explode(x + fx.range(-3, 3), fx.range(1, 5), z + fx.range(-3, 3), 3, 0, "gnome");
            s.burst({ at: new Vec(x, 4, z), count: 40, color: ["#ff4a5e", "#ffd24a", "#34d399", "#60a5fa", "#f472b6", "#ffffff"], speed: [4, 16], life: [0.8, 1.6], size: [0.1, 0.22], gravity: 0.3, dim: 3 });
        });
        s.wait(3.2, () => { w.mode = "play"; finishLevel(); });
    }
    function finishLevel() {
        if (w.mode === "done") return;
        w.mode = "done";
        sfx("exit");
        run.deathsHere = 0;
        run.log.push({ name: L.def.name, time: w.time, kills: w.kills, total: w.total, secrets: w.secrets, secretsTotal: w.secretsTotal, shots: w.shots, hits: w.hits });
        run.time += w.time;
        run.enemies += w.enemiesAtStart;
        run.secretsTotal += w.secretsTotal;
        publish(w);
        game.save("gml_progress", Math.max(game.load("gml_progress", 0), Math.min(LEVELS.length - 1, run.level + 1)));
        const last = run.level >= LEVELS.length - 1;
        s.wait(0.5, () => game.go(last ? "win" : "card", {}, { fade: 0.3 }));
    }
    w.enemiesAtStart = w.total;
    for (const e of w.enemies) if (e.kind === "K") {
        w.boss = e;
    }

    // The step -------------------------------------------------------------------------------------------
    s.onUpdate((dt) => {
        if (w.mode === "dead") {
            w.retryT -= dt;
            // Topple over, tastefully.
            s.cam3.offset.y += (-0.5 - s.cam3.offset.y) * Math.min(1, 3 * dt);
            s.cam3.lookOffset.y += (s.cam3.offset.y + 0.5 - s.cam3.lookOffset.y) * Math.min(1, 3 * dt);
            s.cam3.up.set(0.5, 1, 0);
            player.vel.x *= 0.9; player.vel.z *= 0.9;
            updateEnemies(dt); updateShots(dt);
            if (w.retryT <= 0 && (s.input.pressed("fire") || s.input.pressed("confirm") || s.input.pointer.tapped || s.input.pressed("jump"))) respawn();
            return;
        }
        if (w.mode === "done") return;
        w.time += dt;
        if (w.flowDirty || (Math.floor(s.time * 60) % 8 === 0 && (tileOf(player.pos.x) + tileOf(player.pos.z) * 1024) !== w.flowKey)) {
            w.flowKey = tileOf(player.pos.x) + tileOf(player.pos.z) * 1024;
            w.flowDirty = false;
            rebuildFlow();
        }
        if (w.mode === "play") { updatePlayer(dt); updateDoors(dt); updateTriggers(); updatePickups(dt); }
        w.stop -= dt;
        if (w.stop <= 0) { updateEnemies(dt); updateShots(dt); }
        keepInWorld();

        // Effects bookkeeping
        w.invuln -= dt; w.title -= dt; w.marker -= dt; w.kill -= dt; w.muzzle -= dt; w.hurtT -= dt; w.heal -= dt; w.vmFrameT -= dt;
        w.toastT -= dt; w.bigT -= dt; w.comboT -= dt;
        if (w.comboT <= 0) w.combo = 0;
        w.vmKick *= Math.exp(-13 * dt);
        for (let i = w.hurtDir.length - 1; i >= 0; i--) { w.hurtDir[i].t -= dt; if (w.hurtDir[i].t <= 0) w.hurtDir.splice(i, 1); }
        w.flash *= Math.exp(-13 * dt);
        const a = 1 + w.flash * 0.7;
        s.light.sky.r = s.light.sky.g = s.light.sky.b = a; s.light.ground.r = s.light.ground.g = s.light.ground.b = a;
        if (sky) { sky.pos.x = player.pos.x; sky.pos.z = player.pos.z; }
        if (hazMesh) { hazMesh.texture = `${th.hazard}_${Math.floor(s.time * 5) % 3}`; hazMesh.pos.y = Math.sin(s.time * 1.6) * 0.012; }
        if (w.exit) { w.exit.scale.set(1 + Math.sin(s.time * 3) * 0.04, 1 + Math.sin(s.time * 3) * 0.04, 1); if (w.mode === "play" && w.exitOpen && hypot2(player.pos.x - w.exit.pos.x, player.pos.z - w.exit.pos.z) < 1.8) finishLevel(); }

        w.objT -= dt;
        if (w.objT <= 0 && w.mode === "play") { w.objT = 0.6; updateObjective(); }
        if (Math.floor(s.time * 60) % 30 === 0) publish(w);
        w.peak.entities = Math.max(w.peak.entities, s.entities.length);
    });
    /** Getting gnomed costs rank, not progress: Granny gets back up at the last key or switch, world intact. */
    function respawn() {
        run.hp = 100;
        run.armor = Math.max(run.armor, Math.min(75, run.deathsHere * 25));
        w.mode = "play"; w.invuln = 2.6; w.hurtDir.length = 0; w.hurtT = 0; w.air = 0;
        player.teleport(w.checkpoint.x, P_H / 2, w.checkpoint.z);
        player.vel.set(0, 0, 0);
        for (const b of w.shotsE) b.e.destroy();
        w.shotsE.length = 0;
        for (const q of w.rings) q.e.destroy();
        w.rings.length = 0;
        if (w.boss?.alive) { w.boss.hp = Math.min(w.boss.maxHp, w.boss.hp + w.boss.maxHp * 0.06); w.boss.t = 1; w.boss.state = "rest"; }
        for (const e of w.enemies) if (e.def.id !== "boss" && hypot2(e.pos.x - player.pos.x, e.pos.z - player.pos.z) < 7) { const l = e.dist || 1; e.kx -= e.tox * 20 / l; e.kz -= e.toz * 20 / l; }
        w.flash = 1.2; w.flowDirty = true;
        s.burst({ at: new Vec(player.pos.x, 1.2, player.pos.z), count: 30, color: ["#ffffff", "#ffd24a", "#a84ad0"], speed: [3, 9], life: [0.3, 0.8], size: [0.08, 0.18], dim: 3 });
        sfx("tea");
        toast(["Back up. Time for round two.", "Nothing a cup of tea can't fix.", "Granny does not stay down.", "Right. Where were we?"][run.deaths % 4]);
        if (settings.music) game.music(SONGS[L.def.music]);
        publish(w);
    }
    function retry() {
        Object.assign(run, JSON.parse(snapshot));
        run.hp = Math.max(run.hp, 100);
        run.armor = Math.max(run.armor, Math.min(50, run.deathsHere * 25));
        run.kills -= w.kills; run.shots -= w.shots; run.hits -= w.hits; run.secrets -= w.secrets;

        game.go("play", {}, { fade: 0.2 });
    }
    w.retry = retry;
    w.give = () => { run.owned = [true, true, true, true, true]; run.ammo = { thorns: 40, hornets: 240, pumpkins: 16, bulbs: 24 }; };
    w.pick = setWeapon;
    w.route = route;
    w.finish = finishLevel; // for tooling

    // HUD and viewmodel ------------------------------------------------------------------------------------
    // The viewmodel is a 2D entity so that it can tilt in towards the crosshair. It draws under the HUD, picks up
    // the 2D side of s.shake, and may bleed off the screen edges, which the audit only allows for non-UI entities.
    s.add([pos(0, 0), {
        name: "viewmodel", layer: -5,
        update(dt, e) {
            const v = s.view;
            // The art looks along each barrel towards the upper left, so put the muzzle on the line that runs through the
            // crosshair, and scale until the arms reach the bottom of the screen. Sprite units are 320 by 240.
            const wp = WEAPONS[run.cur], [fx, fy] = wp.flashAt, gap = Math.min(v.width, v.height) * 0.09;
            const tall = v.height > v.width ? 0.14 : 0; // a lower muzzle keeps the gun on a narrow screen
            const tx = v.width / 2 + gap, ty = v.height / 2 + gap + v.height * ((wp.aimDrop ?? 0) + tall);
            const k = (v.height - ty) / (120 - fy), h = 240 * k, wide = 320 * k;
            const bobX = Math.cos(w.bob) * 10 * w.bobA, bobY = Math.abs(Math.sin(w.bob)) * 8 * w.bobA;
            const fall = Math.max(-1, Math.min(1, player.vel.y / 14)) * 7;
            w.swayX += (-s.input.look.x * 0.5 - w.swayX) * Math.min(1, 10 * dt);
            w.swayY += (-s.input.look.y * 0.3 - w.swayY) * Math.min(1, 10 * dt);
            // Recoil drives the gun back along its barrel, towards the hands, and tips the muzzle up.
            const back = w.vmKick * k * 0.7;
            e.pos.x = tx - fx * k + back + bobX + w.swayX;
            e.pos.y = ty - fy * k + back + bobY + fall + w.swayY + w.swap * h * 0.8;
            e.angle = w.vmKick * 0.0012;
            e.vmH = h; e.vmW = wide;
            e.hidden = w.mode === "dead";
        },
        draw(d, e) {
            const wp = WEAPONS[run.cur], h = e.vmH ?? 200, wide = e.vmW ?? 260, k = h / 240;
            const c = new Color(w.playerLight[0], w.playerLight[1], w.playerLight[2]);
            if (w.muzzle > 0) {
                const size = wp.flashS * h * (1 + fx.range(-0.15, 0.15));
                d.sprite("mflash", { x: wp.flashAt[0] * k, y: wp.flashAt[1] * k, width: size, height: size, frame: wp.flash });
            }
            const spinF = run.cur === 2 ? (Math.floor(s.time * 40) % 2 && w.spin > 0.2 ? 1 : 0) : (w.vmFrameT > 0 ? 1 : 0);
            d.sprite(wp.sprite, { width: wide, height: h, frame: spinF, color: c });
        },
    }]);
    function label(d, str, x, y, size, col = "#fff", o = {}) {
        d.text(str, { x: x + 1.4, y: y + 1.6, size, color: "#1b1226", bold: true, font: FONT, ...o });
        d.text(str, { x, y, size, color: col, bold: true, font: FONT, ...o });
    }
    function drawCrosshair(d, cx, cy) {
        const c = w.target ? "#ff5a6a" : "#ffffff";
        const g = 4 + Math.min(10, w.kick * 90) + (w.marker > 0 ? 2 : 0), L0 = 6;
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            d.line([cx + ax * (g + 0.5), cy + ay * (g + 0.5)], [cx + ax * (g + L0 + 0.5), cy + ay * (g + L0 + 0.5)], { width: 3.2, color: "#00000088" });
            d.line([cx + ax * g, cy + ay * g], [cx + ax * (g + L0), cy + ay * (g + L0)], { width: 1.6, color: c });
        }
        d.circle(1.3, { x: cx, y: cy, color: c });
        if (w.marker > 0 || w.kill > 0) {
            const k = w.kill > 0, col = k ? "#ff4a5e" : w.markerK === 2 ? "#9fb0c8" : w.markerK === 3 ? "#ffd24a" : "#ffffff";
            const r0 = k ? 9 : 7, r1 = k ? 18 : 13, width = k ? 3 : 2;
            for (const [ax, ay] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) d.line([cx + ax * r0, cy + ay * r0], [cx + ax * r1, cy + ay * r1], { width, color: col });
        }
    }
    function drawBar(d, x, y, wd, h, f, col, back = "#00000088") {
        d.rect(wd + 3, h + 3, { x: x + wd / 2, y, color: "#1b1226", radius: 2 });
        d.rect(wd, h, { x: x + wd / 2, y, color: back, radius: 1 });
        if (f > 0) d.rect(wd * Math.min(1, f), h, { x: x + wd * Math.min(1, f) / 2, y, color: col, radius: 1 });
    }
    function drawHud(d) {
        const v = s.view, sa = v.safe, W = v.width, H = v.height, touch = s.input.touchMode, cx = W / 2, cy = H / 2;
        d.sprite("vignette", { x: cx, y: cy, width: W + 2, height: H + 2 });
        if (w.menuOpen) return;
        if (w.hurtT > 0 || run.hp < 30) {
            const a = Math.min(1, Math.max(0, w.hurtT) * 1.6 + (run.hp < 30 ? 0.35 + Math.sin(s.time * 6) * 0.12 : 0));
            d.sprite("redv", { x: cx, y: cy, width: W + 2, height: H + 2, opacity: a });
        }
        if (w.dashT > 0) for (let i = 0; i < 14; i++) { // Speed lines
            const a = i * 2.4 + s.time * 31, r0 = Math.min(W, H) * (0.42 + (i % 3) * 0.08), r1 = r0 + 60;
            d.line([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], { width: 2, color: "#ffffff88" });
        }
        if (w.mode !== "dead" && !w.lockWait) drawCrosshair(d, cx, cy);
        for (const h of w.hurtDir) { // Damage wedges point at whoever hit you.
            const rel = h.a - w.yaw + Math.PI, r = Math.min(W, H) * 0.3, x = cx + Math.sin(rel) * -r, y = cy + Math.cos(rel) * -r;
            const px = -Math.cos(rel), py = Math.sin(rel), s0 = 20;
            d.poly([[x - px * s0, y - py * s0], [x + px * s0, y + py * s0], [x - Math.sin(rel) * -16, y - Math.cos(rel) * -16]], { color: "#ff3a4e", opacity: Math.min(1, h.t * 1.6) });
        }

        // Vitals: bottom-left on desktop, top-left on touch where the thumbs live
        const pad = 10, left = sa.left + pad, top = touch ? sa.top + 8 : H - sa.bottom - 46;
        d.sprite("hudicon", { x: left + 10, y: top + 11, width: 22, height: 22, frame: 0 });
        drawBar(d, left + 24, top + 11, 84, 11, run.hp / 100, run.hp < 30 ? "#ff3a4e" : "#ff6a7a");
        label(d, Math.ceil(run.hp), left + 124, top + 11, 17);
        d.sprite("hudicon", { x: left + 10, y: top + 34, width: 20, height: 20, frame: 1 });
        drawBar(d, left + 24, top + 34, 84, 9, run.armor / 100, "#c07ae8");
        label(d, Math.ceil(run.armor), left + 124, top + 34, 14, "#e3c2f4");
        let kx = left + 152;
        for (const k of "rby") if (w.keys.has(k)) { d.sprite("items", { x: kx, y: top + 18, width: 26, height: 26, frame: PICKUPS[k].frame }); kx += 22; }

        // Ammo: bottom-right on desktop, top-right on touch (below the pause button)
        const wp = WEAPONS[run.cur], right = W - sa.right - pad, ay = touch ? sa.top + 52 : H - sa.bottom - 34, amt = wp.ammo ? run.ammo[wp.ammo] : "∞";
        label(d, amt, right - 26, ay, 24, wp.ammo && run.ammo[wp.ammo] < AMMO_MAX[wp.ammo] * 0.15 ? "#ff6a7a" : "#ffe9a8");
        label(d, wp.name.toUpperCase(), right - 58 - wp.name.length * 3.1 - String(amt).length * 5, ay + 1, 12, "#d8d3e8");
        if (!touch) {
            WEAPONS.forEach((q, i) => {
                const x = right - 118 + i * 25, y = ay + 22, on = run.cur === i, has = run.owned[i];
                d.rect(23, 18, { x, y, color: on ? "#ffd24acc" : "#00000066", radius: 3 });
                if (has) d.sprite("items", { x, y, width: 20, height: 20, frame: q.icon, opacity: on ? 1 : 0.65 });
                label(d, i + 1, x - 8, y - 6, 8, on ? "#1b1226" : "#ffffffaa");
            });
        }

        // Objective marker
        if (w.objective && w.mode === "play" && w.title <= 0) {
            const tx = centre(w.objective.c), tz = centre(w.objective.r);
            const path = w.objPath, wp2 = path && path.length > 3 ? path[Math.min(path.length - 1, 3)] : null;
            const gx = wp2 ? centre(wp2[0]) : tx, gz = wp2 ? centre(wp2[1]) : tz;
            const a = Math.atan2(gx - player.pos.x, gz - player.pos.z) + w.yaw + Math.PI;
            const ox = cx, oy = sa.top + (touch ? 22 : 22), dist = path ? Math.round((path.length - 1) * T) : Math.round(hypot2(tx - player.pos.x, tz - player.pos.z));
            const rot2 = (x, y) => [ox + x * Math.cos(a) + y * Math.sin(a), oy - (x * -Math.sin(a) + y * Math.cos(a))];
            const onKey = w.objective.label.includes("KEY");
            const col = onKey ? (w.objective.label[0] === "R" ? KEY_COL.r : w.objective.label[0] === "B" ? KEY_COL.b : KEY_COL.y) : w.objective.label === "EXIT" ? "#8affa0" : "#ffe9a8";
            d.circle(13, { x: ox, y: oy, color: "#1b1226aa" });
            d.poly([rot2(0, 10), rot2(7, -7), rot2(0, -3)], { color: col });
            d.poly([rot2(0, 10), rot2(-7, -7), rot2(0, -3)], { color: col });
            label(d, `${w.objective.label}  ${dist}m`, ox, oy + 22, 11, col);
        }

        // Boss bar
        if (w.boss?.alive && w.bossAwake) {
            const bw = Math.min(W * 0.6, 300), by = sa.top + (touch ? 56 : 54);
            label(d, "KING GRUMBOLD THE GLAZED", cx, by - 12, 12, "#ffd24a");
            drawBar(d, cx - bw / 2, by, bw, 9, w.boss.hp / w.boss.maxHp, w.boss.phase === 2 ? "#ff3a4e" : "#f4c542");
        }

        // Kills, secrets
        if (!touch) {
            d.sprite("hudicon", { x: W - sa.right - 62, y: sa.top + 16, width: 16, height: 16, frame: 2 });
            label(d, `${w.kills}/${w.total}`, W - sa.right - 32, sa.top + 16, 13);
        } else {
            label(d, `${w.kills}/${w.total}`, W - sa.right - 72, sa.top + 18, 12, "#d8d3e8");
        }

        // Messages
        if (w.bigT > 0) {
            const k = Math.min(1, (w.bigT) * 3), pop = 1 + Math.max(0, w.bigT - 0.9) * 0.3;
            label(d, w.big, cx, H * 0.27, Math.min(26, W / 15) * pop, "#ffd24a", { opacity: k });
        }
        if (w.toastT > 0) label(d, w.toast, cx, H * 0.34, 14, "#fff");
        if (w.title > 0 && !w.lockWait) {
            const a = Math.min(1, w.title);
            const ty = H * 0.25 + sa.top * 0.5;
            d.rect(W, 74, { x: cx, y: ty, color: "#000000", opacity: 0.5 * a });
            label(d, `LEVEL ${run.level + 1}`, cx, ty - 24, 12, "#d8d3e8");
            label(d, L.def.name.toUpperCase(), cx, ty - 4, Math.min(28, W / 13), "#ffe36a");
            label(d, L.def.hint, cx, ty + 22, Math.min(13, W / 30), "#fff");
        }
        if (w.invuln > 0) { const a = Math.floor(s.time * 10) % 2 ? 0.14 : 0.05; d.rect(W, H, { x: cx, y: cy, color: "#ffe9a8", opacity: a }); }
        if (w.mode === "dead") {
            d.rect(W, H, { x: cx, y: cy, color: "#3a0612", opacity: Math.min(0.7, (0.8 - w.retryT) * 1.2) });
            label(d, "YOU'VE BEEN GNOMED", cx, cy - 34, Math.min(34, W / 11), "#ff6a7a");
            label(d, `${w.kills} of ${w.total} smashed`, cx, cy + 2, 15, "#fff");
            if (w.retryT <= 0 && Math.floor(s.time * 2) % 2 === 0) label(d, touch ? "TAP TO GET BACK UP" : "CLICK OR PRESS SPACE TO GET BACK UP", cx, cy + 32, 15, "#ffd24a");
        }
        if (s.paused && w.lockWait) {
            d.rect(W, H, { x: cx, y: cy, color: "#0b0a12", opacity: 0.66 });
            d.sprite("logo", { x: cx, y: cy - 78, width: 240, height: 109 });
            if (Math.floor(Date.now() / 500) % 2 === 0) label(d, "CLICK TO PLAY", cx, cy + 8, 26, "#ffd24a");
            label(d, "WASD move  ·  mouse aim  ·  click fire  ·  SPACE jump  ·  SHIFT dash", cx, cy + 40, 12, "#fff");
            label(d, "1-5 or wheel: weapon  ·  [ ] look speed  ·  M music", cx, cy + 58, 12, "#d8d3e8");
            label(d, `Look speed ${Math.round(settings.sens * 100)}%`, cx, cy + 78, 12, "#b8b0d0");
        }
    }
    s.onDrawUI(drawHud);

    // Touch weapon bar: tap an icon to switch. Hidden on desktop, where the HUD strip is enough. ---------
    WEAPONS.forEach((q, i) => {
        s.add([rect(50, 50, { color: "#00000000" }), ui(), pos(180, 300), tap(() => setWeapon(i)), placed((e, v) => {
            const land = v.width > v.height;
            e.hidden = !s.input.touchMode || !run.owned[i] || w.menuOpen;
            e.pos.x = v.width / 2 + (i - 2) * 51;
            e.pos.y = land ? v.height - v.safe.bottom - 27 : v.height - v.safe.bottom - 236;
        }), {
            name: `slot${i}`,
            draw(d) {
                d.rect(44, 36, { color: run.cur === i ? "#ffd24add" : "#0b0a1288", radius: 8 });
                d.sprite("items", { width: 32, height: 32, frame: q.icon });
            },
        }]);
    });
    // Pause: a real button on touch, Esc/P on desktop ---------------------------------------------------
    let menu = [];
    function closeMenu() {
        for (const e of menu) e.destroy();
        menu = []; s.paused = false; w.menuOpen = false;
        showTouch();
        if (settings.music && w.mode === "play") game.music(SONGS[L.def.music]); else game.stopMusic();
    }
    function menuButton(lab, fn, x, y, gold) {
        return s.add([rect(214, 46, { color: "#00000000" }), ui(), pos(x, y), tap(fn), {
            name: "menuBtn", layer: 51,
            draw(d) {
                d.rect(214, 46, { color: gold ? "#ffc22e" : "#3a3158", radius: 10 });
                d.text(typeof lab === "string" ? lab : lab(), { size: 16, bold: true, color: gold ? "#1b1226" : "#ffffff", font: FONT });
            },
        }]);
    }
    function openMenu() {
        if (menu.length) return;
        s.paused = true; w.menuOpen = true;
        hideTouch();
        game.stopMusic();
        const v = s.view, cx = v.width / 2, land = v.width > v.height, list = [
            ["RESUME", () => closeMenu()],
            ["RESTART LEVEL", () => { closeMenu(); retry(); }],
            [() => `AUTO-FIRE: ${settings.autofire ? "ON" : "OFF"}`, () => { settings.autofire = !settings.autofire; saveSettings(); }],
            [() => `LOOK SPEED: ${Math.round(settings.touchSens * 100)}%`, () => { settings.touchSens = settings.touchSens >= 1.75 ? 0.5 : settings.touchSens + 0.25; saveSettings(); }],
            [() => `MUSIC: ${settings.music ? "ON" : "OFF"}`, () => { settings.music = !settings.music; saveSettings(); }],
            ["QUIT TO TITLE", () => { closeMenu(); game.go("title", {}, { fade: 0.2 }); }],
        ];
        menu.push(s.add([rect(v.width, v.height, { color: "#0b0a12cc" }), pos(cx, v.height / 2), { name: "menuShade", layer: 50 }])); // Full-bleed, so not a UI entity
        list.forEach(([lab, fn], i) => {
            const col = land ? (i % 2 ? 1 : -1) : 0, row = land ? Math.floor(i / 2) : i;
            menu.push(menuButton(lab, fn, cx + col * 112, (land ? 104 : 150) + row * (land ? 58 : 56), i === 0));
        });
    }
    s.add([ui(), rect(50, 50, { color: "#00000000" }), pos(300, 40), tap(() => openMenu()), placed((e, v) => {
        e.pos.x = v.width - v.safe.right - 27; e.pos.y = v.safe.top + 27; e.hidden = !s.input.touchMode || !!w.menuOpen;
    }), {
        name: "pauseBtn",
        draw(d) {
            d.circle(16, { color: "#0b0a1288" });
            d.rect(5, 16, { x: -5, color: "#ffffff" }); d.rect(5, 16, { x: 5, color: "#ffffff" });
        },
    }]);
    // A watcher entity: UI entities still update while the scene is paused, so this can unpause.
    s.add([ui(), {
        name: "watcher",
        update() {
            const inp = s.input;
            if (inp.pressed("sensUp")) { settings.sens = Math.min(3, settings.sens + 0.1); saveSettings(); toast(`Look speed ${Math.round(settings.sens * 100)}%`, 1); }
            if (inp.pressed("sensDown")) { settings.sens = Math.max(0.2, settings.sens - 0.1); saveSettings(); toast(`Look speed ${Math.round(settings.sens * 100)}%`, 1); }
            if (inp.pressed("mute")) { settings.music = !settings.music; saveSettings(); if (settings.music) game.music(SONGS[L.def.music]); else game.stopMusic(); toast(settings.music ? "Music on" : "Music off", 1); }
            if (SCRIPTED && !w.forceLock) return;
            if (!inp.touchMode && !game.pointerLocked && w.mode !== "done") {
                if (!w.lockWait) { w.lockWait = true; s.paused = true; }
            } else if (w.lockWait) { w.lockWait = false; s.paused = false; }
            if (inp.touchMode && inp.pressed("pause")) openMenu();
        },
    }]);
    game.on?.("hide", () => { if (game.current === s && !s.paused && s.input.touchMode) openMenu(); });
    publish(w);
    if (run.level === 0 && !run.deaths) {
        s.wait(3.6, () => toast(s.input.touchMode ? "Left thumb moves. Right thumb looks." : "WASD moves. Mouse aims. Click fires.", 3.2));
        s.wait(7, () => toast(s.input.touchMode ? "Put a gnome in your sights: Granny fires by herself." : "SPACE jumps. SHIFT dashes through danger.", 3.2));
    }
});

// ====================================================================================================
//  Menus
// ====================================================================================================
const TOUCH_BUTTONS = game.touch.buttons;
/** The framework draws touch controls in every scene, so menus switch them off by hand. */
function hideTouch() { game.touch.o.stick = false; game.touch.buttons = []; game.touch.o.look = false; }
function showTouch() { game.touch.o.stick = true; game.touch.buttons = TOUCH_BUTTONS; game.touch.o.look = true; }

/** A slow fly-through of the first level behind the menus. */
function menuBackdrop(s, level, spin = 0.12) {
    const L = compile(game, level), th = L.theme;
    s.background = th.bg;
    s.light.color = new Color(0, 0, 0); s.light.sky = new Color(1, 1, 1); s.light.ground = new Color(1, 1, 1); s.light.shadows = false; s.light.dir.set(0, -1, 0);
    s.light.fog = { color: color(th.fog.color), near: th.fog.near, far: th.fog.far };
    s.add([mesh(`lvl${level}`, { texture: `atlas${L.def.theme}`, shadow: false }), pos(0, 0, 0)]);
    if (L.def.map.some((r) => r.includes("~"))) s.add([mesh(`lvl${level}_haz`, { texture: `${th.hazard}_0`, shadow: false }), pos(0, 0, 0)]);
    const sky = th.sky ? s.add([mesh("skydome", { texture: th.sky, unlit: true, shadow: false }), pos(0, 0, 0)]) : null;
    let t = 0;
    const cx = L.Cn * TILE * 0.45, cz = L.R * TILE * 0.28;
    s.cam3.fov = 66;
    s.onUpdate((dt) => {
        t += dt;
        const a = t * spin;
        s.cam3.pos.set(cx + Math.cos(a) * 6, 2.1, cz + Math.sin(a) * 6);
        s.cam3.target.set(cx + Math.cos(a + 1.2) * 12, 1.9, cz + Math.sin(a + 1.2) * 12);
        if (sky) { sky.pos.x = cx; sky.pos.z = cz; }
    });
}
const label2 = (d, str, x, y, size, col = "#fff") => { d.text(str, { x: x + 1.4, y: y + 1.8, size, color: "#1b1226", bold: true, font: FONT }); d.text(str, { x, y, size, color: col, bold: true, font: FONT }); };
const CTA = { width: 190, height: 52, color: "#ffc22e", textColor: "#1b1226", textSize: 20 };

game.scene("title", (s) => {
    hideTouch();
    game.mouseLook = false;
    game.stopMusic();
    menuBackdrop(s, 0);
    const saved = game.load("gml_progress", 0);
    s.onDrawUI((d) => {
        const v = s.view, cx = v.width / 2, land = v.width > v.height;
        d.sprite("vignette", { x: cx, y: v.height / 2, width: v.width + 2, height: v.height + 2 });
        const lw = Math.min(v.width * 0.92, land ? 400 : 340), lh = lw * 232 / 512;
        d.sprite("logo", { x: cx, y: v.safe.top + (land ? 16 : 70) + lh / 2 + Math.sin(s.time * 2) * 2, width: lw, height: lh });
        const gy = v.height - v.safe.bottom - (land ? 58 : 150);
        if (land) {
            d.sprite("granny", { x: v.safe.left + 86, y: v.height - 86, width: 144, height: 168 });
            d.sprite("e_nib", { x: v.width - v.safe.right - 90, y: v.height - 66, width: 104, height: 130, frame: 3 });
            d.sprite("e_bomb", { x: v.width - v.safe.right - 180, y: v.height - 54, width: 86, height: 108, frame: 1 });
        } else {
            d.sprite("granny", { x: cx - 88, y: gy + 44, width: 130, height: 152 });
            d.sprite("e_nib", { x: cx + 88, y: gy + 44, width: 110, height: 138, frame: 3 });
        }
        label2(d, "Granny Thistle vs. the Garden Gnome Uprising", cx, v.safe.top + (land ? 22 : 76) + lh, Math.min(14, v.width / 26), "#ffe9c8");
    });
    s.add([button("PLAY", { ...CTA, action: "confirm", onTap: () => start(0) }), ui(), pos(180, 300), placed((e, v) => e.pos.set(v.width / 2, v.height * (v.width > v.height ? 0.66 : 0.56)))]);
    if (saved > 0) s.add([button(`CONTINUE: LEVEL ${saved + 1}`, { ...CTA, width: 230, height: 52, textSize: 15, color: "#3a3158", textColor: "#fff", onTap: () => start(saved) }), ui(), pos(180, 300), placed((e, v) => e.pos.set(v.width / 2, v.height * (v.width > v.height ? 0.84 : 0.65)))]);
    function start(level) {
        game.data.run = freshRun();
        game.data.run.level = level;
        if (level >= 1) { // Continuing: hand out the kit you'd have by now.
            const r = game.data.run;
            r.owned = [true, level >= 1, level >= 2, level >= 3, false];
            r.ammo = { thorns: level >= 1 ? 24 : 0, hornets: level >= 2 ? 150 : 0, pumpkins: level >= 3 ? 6 : 0, bulbs: 0 };
            r.cur = level >= 2 ? 2 : 1;
            r.armor = 25;
        }
        game.go("play", { level }, { fade: 0.25 });
    }
    game.startAt = start;
    game.data.mode = "title";
});

game.scene("card", (s) => {
    hideTouch(); // The mouse stays captured: any click continues, so a desktop run doesn't stop to re-capture.
    const run = game.data.run, rec = run.log[run.log.length - 1];
    menuBackdrop(s, LEVELS[run.level].theme === 5 ? 0 : run.level, 0.08);
    const next = run.level + 1, nextDef = LEVELS[next];
    s.onDraw((d) => { const v = s.view; d.rect(v.width + 2, v.height + 2, { x: v.width / 2, y: v.height / 2, color: "#0b0a12", opacity: 0.72 }); }); // Under the buttons
    s.onDrawUI((d) => {
        const v = s.view, cx = v.width / 2, y0 = v.height * 0.16 + v.safe.top;
        label2(d, `${rec.name.toUpperCase()}: CLEARED`, cx, y0, Math.min(26, v.width / 15), "#ffe36a");
        const acc = rec.shots ? Math.round(rec.hits / rec.shots * 100) : 0;
        const rows = [["TIME", fmt(rec.time)], ["GNOMES SMASHED", `${rec.kills} / ${rec.total}`], ["ACCURACY", `${acc}%`], ["SECRETS", `${rec.secrets} / ${rec.secretsTotal}`]];
        rows.forEach(([a, b], i) => {
            const y = y0 + 40 + i * 24, x = Math.min(120, v.width * 0.3);
            label2(d, a, cx - x * 0.6, y, 14, "#c8c0e0"); label2(d, b, cx + x, y, 16, "#fff");
        });
        label2(d, `NEXT: ${nextDef.name.toUpperCase()}`, cx, y0 + 152, 15, "#8affa0");
        label2(d, nextDef.tag, cx, y0 + 172, Math.min(13, v.width / 30), "#d8d3e8");
    });
    const onwards = () => game.go("play", { level: next }, { fade: 0.25 });
    let held = 0;
    s.onUpdate((dt) => { held += dt; if (held > 0.5 && !s.input.touchMode && s.input.pointer.pressed) onwards(); });
    s.add([button("ONWARDS", { ...CTA, action: "confirm", onTap: onwards }), ui(), pos(180, 300), placed((e, v) => e.pos.set(v.width / 2, Math.min(v.height - v.safe.bottom - 34, v.height * 0.16 + v.safe.top + 216)))]);
});
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

game.scene("win", (s) => {
    hideTouch();
    game.mouseLook = false;
    game.stopMusic();
    sfx("win");
    const run = game.data.run;
    const acc = run.shots ? Math.round(run.hits / run.shots * 100) : 0;
    const kills = run.log.reduce((n, l) => n + l.kills, 0), total = run.log.reduce((n, l) => n + l.total, 0), secrets = run.log.reduce((n, l) => n + l.secrets, 0), stotal = run.log.reduce((n, l) => n + l.secretsTotal, 0);
    const time = run.log.reduce((n, l) => n + l.time, 0);
    const rank = acc > 55 && run.deaths === 0 ? "HEAD GARDENER" : kills >= total * 0.9 ? "CHAIRWOMAN OF THE ALLOTMENT" : run.deaths < 3 ? "ROSETTE WINNER" : "PERSISTENT PERENNIAL";
    Object.assign(game.data, { scene: "win", won: true, totalTime: +time.toFixed(1), accuracy: acc, totalKills: kills, totalEnemies: total, totalSecrets: secrets, rank });
    menuBackdrop(s, 0, 0.1);
    const burst = () => s.burst({ at: new Vec(s.cam3.target.x, 4, s.cam3.target.z), count: 28, color: ["#ff4a5e", "#ffd24a", "#34d399", "#60a5fa", "#f472b6", "#ffffff"], speed: [3, 9], life: [1, 2], size: [0.08, 0.2], gravity: 0.2, dim: 3 });
    s.every(0.6, burst);
    s.onDraw((d) => { const v = s.view; d.rect(v.width + 2, v.height + 2, { x: v.width / 2, y: v.height / 2, color: "#0b0a12", opacity: 0.52 }); });
    s.onDrawUI((d) => {
        const v = s.view, cx = v.width / 2, land = v.width > v.height, y0 = v.safe.top + (land ? 30 : 70);
        label2(d, "THE GARDEN IS SAVED", cx, y0, Math.min(34, v.width / 13), "#ffe36a");
        label2(d, `Rank: ${rank}`, cx, y0 + 30, Math.min(16, v.width / 26), "#ffb3e0");
        const rows = [["TIME", fmt(time)], ["GNOMES SMASHED", `${kills} / ${total}`], ["ACCURACY", `${acc}%`], ["SECRETS", `${secrets} / ${stotal}`], ["TEA BREAKS (DEATHS)", `${run.deaths}`]];
        const sx = land ? cx + 70 : cx, gap = land ? 80 : 90;
        rows.forEach(([a, b], i) => {
            const y = y0 + 64 + i * 26;
            label2(d, a, sx - gap * 0.5, y, 14, "#c8c0e0"); label2(d, b, sx + gap * 1.15, y, 17, "#fff");
        });
        if (land) d.sprite("granny", { x: v.safe.left + 104, y: v.height - 90, width: 154, height: 180 });
        else d.sprite("granny", { x: cx, y: y0 + 280, width: 146, height: 170 });
    });
    s.add([button("PLAY AGAIN", { ...CTA, action: "confirm", onTap: () => game.go("title", {}, { fade: 0.25 }) }), ui(), pos(180, 300), placed((e, v) => { const land = v.width > v.height; e.pos.set(land ? v.width / 2 + 90 : v.width / 2, v.height - v.safe.bottom - (land ? 34 : 66)); })]);
});

game.data.run = freshRun();
game.start("title");
