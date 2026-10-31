// DEEP TROUBLE: a one-thumb bullet heaven on the sea floor.
// The swarm lives in flat typed arrays and draws from one texture, because a few hundred
// Pogo entities with colliders would be too heavy for a phone. Pogo owns scenes, input,
// the camera, HUD text, buttons and audio.
import { button, createGame, pin, pos, text, ui } from "./pogo.js";
import { defineArt, FX, ICONS, MOBS, PROPS } from "./art.js";
import { SONGS } from "./music.js";

const params = typeof location === "undefined" ? new URLSearchParams() : new URLSearchParams(location.search);
const fixedSeed = typeof document === "undefined" || params.has("paused") || params.has("seed");

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#0c2a4d",
    touch: { stick: true },
    seed: fixedSeed ? Number(params.get("seed") ?? 20261031) : (Date.now() & 0xffffff) + 1,
    maxDpr: 2,
    actions: { confirm: ["Enter", "Space", "pad:a", "pad:start"], card1: ["Digit1"], card2: ["Digit2"], card3: ["Digit3"] },
});

// Painting takes a moment on a phone: let the loading line reach the screen first.
if (typeof document !== "undefined") await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
defineArt(game);

const FONT = "'Arial Rounded MT Bold', 'SF Pro Rounded', ui-rounded, 'Nunito', 'Trebuchet MS', system-ui, sans-serif";

// --- One-thumb stick ----------------------------------------------------------------------
// Pogo's stick only starts in the left half of the screen, below 35% of its height, and its
// x and y are clamped separately, so a long diagonal drag has length 1.41 and a long drag at
// any angle bends toward 45 degrees. Portrait one-thumb play needs a stick that starts under
// either thumb, is truly circular, and drags its origin along. See FRAMEWORK FEEDBACK.
{
    const tc = game.touch, RADIUS = 52;
    tc.pointerDown = (id, x, y) => {
        const s = game.current;
        if (!game.input.touchMode || game.currentName !== "play" || s.paused) return false;
        if (tc.stickId !== null || s._hitTappable(x, y)) return false;
        tc.stickId = id;
        tc.origin = { x, y };
        tc.knob = { x, y };
        return true;
    };
    tc.pointerMove = (id, x, y) => {
        if (id !== tc.stickId) return;
        const max = RADIUS / game.view.scale;
        let dx = x - tc.origin.x, dy = y - tc.origin.y;
        const len = Math.hypot(dx, dy);
        if (len > max) {
            tc.origin = { x: x - dx / len * max, y: y - dy / len * max };
            dx = dx / len * max; dy = dy / len * max;
        }
        tc.knob = { x, y };
        const dead = Math.hypot(dx, dy) / max < 0.12;
        game.input.setStick(dead ? 0 : dx / max, dead ? 0 : dy / max);
    };
    game.on("scene", (name) => { tc.o.stick = name === "play"; });
    const drawControls = tc.draw.bind(tc);
    tc.draw = (d) => { if (!game.current?.paused) drawControls(d); }; // No stick over the cards.
}

// --- Save ----------------------------------------------------------------------------------

const SAVE = "deep-trouble-v1";
const loadBest = () => ({ time: 0, wins: 0, fastest: 0, kills: 0, runs: 0, ...game.load(SAVE, {}) });
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

// --- Tuning --------------------------------------------------------------------------------

const RUN = { bossAt: 270 };

const ZONES = [
    { at: 0, name: "SUNLIT SHALLOWS", tint: [0.52, 0.88, 0.88], dark: 0.28, rays: 1, caustic: 0.2, song: 0 },
    { at: 70, name: "TWILIGHT DROP", tint: [0.30, 0.58, 0.84], dark: 0.5, rays: 0.5, caustic: 0.1, song: 1 },
    { at: 140, name: "MIDNIGHT REEF", tint: [0.22, 0.32, 0.70], dark: 0.72, rays: 0.12, caustic: 0.04, song: 2 },
    { at: 205, name: "THE ABYSS", tint: [0.24, 0.17, 0.48], dark: 0.86, rays: 0, caustic: 0, song: 2 },
    { at: RUN.bossAt, name: "THE TRENCH", tint: [0.36, 0.14, 0.36], dark: 0.86, rays: 0, caustic: 0, song: 3 },
];

const TYPES = [
    { key: "grump", hp: 8, speed: 46, dmg: 6, r: 11, size: 33, xp: 1, colors: ["#d8fb6e", "#3fc46f"], kb: 1 },
    { key: "crab", hp: 20, speed: 52, dmg: 8, r: 13, size: 36, xp: 2, colors: ["#ff8a5c", "#d92f45"], kb: 0.8 },
    { key: "jelly", hp: 34, speed: 30, dmg: 9, r: 14, size: 38, xp: 3, colors: ["#ffb6ea", "#c65cf0"], kb: 1.1 },
    { key: "inkling", hp: 13, speed: 76, dmg: 7, r: 11, size: 32, xp: 2, colors: ["#b98aff", "#5a2fa8"], kb: 1.2 },
    { key: "puffer", hp: 30, speed: 38, dmg: 10, r: 14, size: 38, xp: 4, colors: ["#ffc65a", "#ff7a2e"], kb: 0.9 },
    { key: "eel", hp: 40, speed: 38, dmg: 13, r: 13, size: 42, xp: 5, colors: ["#a980ff", "#58e0ff"], kb: 0.7 },
    { key: "bonefish", hp: 85, speed: 44, dmg: 15, r: 15, size: 42, xp: 7, colors: ["#fff9e8", "#c9bfa6"], kb: 0.45 },
    { key: "angler", hp: 500, speed: 50, dmg: 14, r: 30, size: 84, xp: 40, colors: ["#4d8fbf", "#ffe98a"], kb: 0.08, elite: true },
    { key: "kraken", hp: 36000, speed: 34, dmg: 14, r: 66, size: 190, xp: 0, colors: ["#e8527c", "#ffd84d"], kb: 0, boss: true },
];
const T_NAMES = TYPES.map((t) => t.key);
const [GRUMP, CRAB, JELLY, INKLING, PUFFER, EEL, BONE, ANGLER, KRAKEN] = TYPES.keys();
for (const t of TYPES) t.base = MOBS.at[t.key] ?? 0;

// How many fish the sea tries to keep alive, and how fast it replaces them.
const CROWD = [[0, 10], [30, 34], [60, 85], [100, 150], [150, 240], [200, 330], [240, 400], [268, 440], [271, 20], [285, 40], [300, 130], [400, 240]];
const RATE = [[0, 4], [60, 16], [120, 48], [180, 100], [240, 170], [270, 60], [400, 80]];
const MIX = [
    // time, then weights for grump crab jelly inkling puffer eel bonefish
    [0, [10, 0, 0, 0, 0, 0, 0]],
    [35, [10, 3, 0, 0, 0, 0, 0]],
    [70, [8, 5, 3, 1, 0, 0, 0]],
    [105, [6, 5, 4, 3, 1, 0, 0]],
    [140, [5, 5, 4, 4, 3, 1, 0]],
    [175, [5, 4, 3, 5, 3, 2, 1]],
    [205, [4, 3, 3, 6, 3, 3, 3]],
    [245, [3, 3, 2, 6, 3, 4, 5]],
];
const hpScale = (t) => 1 + t / 60 * 0.55 + (t / 60) ** 2 * 0.36;
const dmgScale = (t) => 1 + t / 300 * 0.55;

const EVENTS = [
    { at: 24, kind: "shoal", n: 26 },
    { at: 55, kind: "elite", n: 1 },
    { at: 85, kind: "ring", type: GRUMP, n: 36 },
    { at: 115, kind: "shoal", n: 44 },
    { at: 125, kind: "elite", n: 1 },
    { at: 160, kind: "ring", type: CRAB, n: 48 },
    { at: 170, kind: "elite", n: 2 },
    { at: 195, kind: "shoal", n: 70, type: INKLING },
    { at: 215, kind: "elite", n: 2 },
    { at: 235, kind: "ring", type: BONE, n: 44 },
    { at: 255, kind: "elite", n: 3 },
    { at: RUN.bossAt, kind: "boss" },
];

const WEAPONS = {
    harpoon: { name: "Harpoon Gun", icon: "harpoon", lv: ["Fires at the nearest fish and punches through.", "+1 pierce, more damage.", "Fires 2 harpoons.", "+1 pierce, more damage.", "Fires 3 harpoons."],
        evo: { need: "whet", name: "Trident Storm", icon: "trident", desc: "A fan of 5 tridents that never stop." } },
    razor: { name: "Razorfin Escort", icon: "razor", lv: ["2 sharp little friends circle you.", "A 3rd razorfin.", "Harder bites, wider circle.", "A 4th razorfin.", "A 5th razorfin and faster bites."],
        evo: { need: "flipper", name: "Shark Halo", icon: "shark", desc: "Two rings of sharks, spinning opposite ways." } },
    eel: { name: "Shock Eel", icon: "eel", lv: ["Zaps a fish and arcs to 3 more. Shocked fish take +25%.", "Arcs to 4.", "Arcs to 5, more damage.", "Arcs to 6, faster.", "Arcs to 8."],
        evo: { need: "gear", name: "Storm Eel", icon: "storm", desc: "Three bolts at once. Shocked kills arc again." } },
    sonar: { name: "Sonar Bloom", icon: "sonar", lv: ["An aura that hurts, shoves and slows nearby fish.", "Wider.", "Stronger.", "Wider.", "Wider and stronger."],
        evo: { need: "hull", name: "Whale Song", icon: "song", desc: "A vast aura that booms the swarm away." } },
    torpedo: { name: "Homing Torpedo", icon: "torpedo", lv: ["Hunts a fish and blows up.", "Bigger blast.", "2 torpedoes.", "Bigger blast, faster.", "3 torpedoes."],
        evo: { need: "clam", name: "Piranha Salvo", icon: "piranha", desc: "Every blast releases 3 hungry mini-torpedoes." } },
    mine: { name: "Depth Charge", icon: "mine", lv: ["Lobs a mine. Short fuse, huge blast.", "More damage.", "Bigger blast.", "Faster drops.", "2 mines at a time."],
        evo: { need: "magnet", name: "Gravity Mine", icon: "gravmine", desc: "Mines drag fish in, then blast twice." } },
    whirl: { name: "Whirlpool", icon: "whirl", lv: ["Spins up in the thickest crowd and drags it in.", "Stronger.", "Wider.", "Lasts longer.", "Much stronger."],
        evo: { need: "bubble", name: "Maelstrom", icon: "maelstrom", desc: "Two colossal whirlpools at once." } },
    riptide: { name: "Riptide", icon: "riptide", lv: ["A wave rolls out ahead of you, shoving fish back.", "Stronger.", "Wider.", "More often.", "Rolls both ways."],
        evo: { need: "bubble", name: "Tsunami", icon: "tsunami", desc: "A full ring of surf that clears the screen." } },
};
const MAX_LV = 5, MAX_WEAPONS = 5, MAX_PASSIVES = 4;

const PASSIVES = {
    whet: { name: "Whetstone", icon: "whet", max: 4, desc: "+18% damage." },
    flipper: { name: "Turbo Flippers", icon: "flipper", max: 4, desc: "+10% swim speed." },
    hull: { name: "Brass Hull", icon: "hull", max: 4, desc: "+25 max air, -1 damage taken." },
    gear: { name: "Clockwork Gear", icon: "gear", max: 4, desc: "Weapons recharge 9% faster." },
    magnet: { name: "Pearl Magnet", icon: "magnet", max: 4, desc: "Pearls fly in from +50% further." },
    clam: { name: "Lucky Clam", icon: "clam", max: 4, desc: "+7% crits, +10% pearl value." },
    bubble: { name: "Big Bubbles", icon: "pearl", max: 4, desc: "+12% area on every weapon." },
};

/** Weapon numbers by level. e is true once evolved. */
const STAT = {
    harpoon: (l, e) => e ? { cd: 0.62, n: 5, dmg: 34, pierce: 99, speed: 470 } : { cd: [0.62, 0.6, 0.6, 0.56, 0.54][l - 1], n: [1, 1, 2, 2, 3][l - 1], dmg: [13, 17, 19, 24, 28][l - 1], pierce: [2, 3, 3, 4, 5][l - 1], speed: 430 },
    razor: (l, e) => e ? { n: 6, dmg: 26, r: 70, spin: 3.8, hit: 0.2, shark: true } : { n: [2, 3, 3, 4, 5][l - 1], dmg: [9, 10, 14, 15, 18][l - 1], r: [56, 58, 66, 68, 70][l - 1], spin: 3.2, hit: l === 5 ? 0.26 : 0.34 },
    eel: (l, e) => e ? { cd: 0.72, roots: 3, jumps: 8, dmg: 34 } : { cd: [1.5, 1.4, 1.25, 1.05, 0.95][l - 1], roots: 1, jumps: [3, 4, 5, 6, 8][l - 1], dmg: [15, 18, 23, 25, 29][l - 1] },
    sonar: (l, e) => e ? { r: 128, dmg: 17, tick: 0.4, boom: 3.2 } : { r: [58, 68, 68, 80, 92][l - 1], dmg: [5, 5, 8, 8, 11][l - 1], tick: 0.45, boom: 0 },
    torpedo: (l, e) => e ? { cd: 1.2, n: 3, dmg: 62, r: 62, turn: 7, piranha: true } : { cd: [2.1, 2.0, 1.9, 1.6, 1.5][l - 1], n: [1, 1, 2, 2, 3][l - 1], dmg: [30, 36, 40, 50, 56][l - 1], r: [40, 48, 48, 56, 56][l - 1], turn: 5 },
    mine: (l, e) => e ? { cd: 1.5, n: 2, dmg: 120, r: 105, grav: true } : { cd: [2.8, 2.7, 2.5, 2.0, 2.0][l - 1], n: l === 5 ? 2 : 1, dmg: [55, 72, 82, 96, 110][l - 1], r: [68, 72, 86, 90, 98][l - 1] },
    whirl: (l, e) => e ? { cd: 4.0, n: 2, dur: 4.2, dps: 62, r: 118 } : { cd: [6, 5.6, 5.2, 4.8, 4.4][l - 1], n: 1, dur: [2.4, 2.6, 2.8, 3.6, 3.8][l - 1], dps: [14, 20, 22, 26, 40][l - 1], r: [64, 66, 78, 80, 84][l - 1] },
    riptide: (l, e) => e ? { cd: 3.6, dmg: 58, ring: true, w: 1 } : { cd: [4.4, 4.2, 4, 3.3, 3.2][l - 1], dmg: [15, 21, 25, 30, 36][l - 1], w: [1, 1, 1.35, 1.35, 1.5][l - 1], both: l === 5 },
};

// --- Sim storage -------------------------------------------------------------------------

const MAXE = 640;
const ex = new Float32Array(MAXE), ey = new Float32Array(MAXE), epx = new Float32Array(MAXE), epy = new Float32Array(MAXE);
const evx = new Float32Array(MAXE), evy = new Float32Array(MAXE), esx = new Float32Array(MAXE), esy = new Float32Array(MAXE);
const ehp = new Float32Array(MAXE), emax = new Float32Array(MAXE), er = new Float32Array(MAXE), edmg = new Float32Array(MAXE);
const espeed = new Float32Array(MAXE), eanim = new Float32Array(MAXE), eflash = new Float32Array(MAXE), eslow = new Float32Array(MAXE);
const eshock = new Float32Array(MAXE), eorbit = new Float32Array(MAXE), etimer = new Float32Array(MAXE), eborn = new Float32Array(MAXE);
const edx = new Float32Array(MAXE), edy = new Float32Array(MAXE), ewave = new Int32Array(MAXE), euid = new Int32Array(MAXE);
const etype = new Uint8Array(MAXE), estate = new Uint8Array(MAXE), ealive = new Uint8Array(MAXE), eflip = new Uint8Array(MAXE);
const next = new Int16Array(MAXE);
const CELL = 36;
let head = new Int16Array(1), gw = 1, gh = 1, gx0 = 0, gy0 = 0;

const hits = new Int16Array(MAXE); // Scratch buffer for query().
const order = new Int16Array(MAXE + 2); // Draw order, kept nearly sorted between frames.

const MAXP = 420; // Pearls.
const px = new Float32Array(MAXP), py = new Float32Array(MAXP), pv = new Float32Array(MAXP), pvx = new Float32Array(MAXP), pvy = new Float32Array(MAXP);
const pon = new Uint8Array(MAXP), pmag = new Uint8Array(MAXP), pkind = new Uint8Array(MAXP);

const MAXF = 460; // Particles.
const fx = new Float32Array(MAXF), fy = new Float32Array(MAXF), fvx = new Float32Array(MAXF), fvy = new Float32Array(MAXF), flife = new Float32Array(MAXF), fmax = new Float32Array(MAXF);
const fsize = new Float32Array(MAXF), frot = new Float32Array(MAXF), fspin = new Float32Array(MAXF), fdrag = new Float32Array(MAXF), fgrav = new Float32Array(MAXF);
const fframe = new Uint8Array(MAXF), fcol = new Array(MAXF).fill("#ffffff");

let R = null; // The current run.

// --- Sound ----------------------------------------------------------------------------------

const TONES = {
    harpoon: { wave: "triangle", freq: 900, to: 220, decay: 0.09, volume: 0.14 },
    hit: { wave: "noise", freq: 2400, to: 500, decay: 0.05, volume: 0.1 },
    pop: { wave: "sine", freq: 640, to: 170, decay: 0.08, volume: 0.17 },
    bite: { wave: "square", freq: 240, to: 120, decay: 0.04, volume: 0.05 },
    zap: [{ wave: "sawtooth", freq: 1900, to: 300, decay: 0.09, volume: 0.09 }, { wave: "square", freq: 1200, to: 2600, decay: 0.05, volume: 0.05, at: 0.03 }],
    boom: [{ wave: "noise", freq: 1000, to: 60, decay: 0.32, volume: 0.42 }, { wave: "sine", freq: 130, to: 36, decay: 0.28, volume: 0.42 }],
    launch: { wave: "sawtooth", freq: 170, to: 620, decay: 0.15, volume: 0.1 },
    wave: { wave: "noise", freq: 500, to: 2200, decay: 0.34, volume: 0.2 },
    sonar: { wave: "sine", freq: 1300, to: 860, decay: 0.16, volume: 0.05 },
    hurt: [{ wave: "square", freq: 200, to: 80, decay: 0.16, volume: 0.28 }, { wave: "noise", freq: 700, to: 160, decay: 0.14, volume: 0.24 }],
    elite: [{ wave: "sawtooth", freq: 96, to: 62, decay: 0.7, volume: 0.3 }, { wave: "square", freq: 142, to: 90, decay: 0.6, volume: 0.1 }],
    level: [{ wave: "triangle", freq: 523, decay: 0.1, volume: 0.3 }, { wave: "triangle", freq: 659, decay: 0.1, volume: 0.3, at: 0.08 }, { wave: "triangle", freq: 784, decay: 0.1, volume: 0.3, at: 0.16 }, { wave: "square", freq: 1047, decay: 0.3, volume: 0.14, at: 0.24 }],
    pick: [{ wave: "square", freq: 660, to: 990, decay: 0.09, volume: 0.14 }, { wave: "triangle", freq: 1320, decay: 0.16, volume: 0.2, at: 0.06 }],
    evolve: [{ wave: "square", freq: 392, decay: 0.12, volume: 0.16 }, { wave: "square", freq: 523, decay: 0.12, volume: 0.16, at: 0.1 }, { wave: "square", freq: 784, decay: 0.12, volume: 0.16, at: 0.2 }, { wave: "square", freq: 1047, decay: 0.5, volume: 0.18, at: 0.3 }, { wave: "noise", freq: 3000, to: 900, decay: 0.5, volume: 0.16, at: 0.3 }],
    heart: [{ wave: "sine", freq: 520, to: 780, decay: 0.16, volume: 0.25 }, { wave: "sine", freq: 780, to: 1040, decay: 0.2, volume: 0.25, at: 0.1 }],
    vacuum: { wave: "sawtooth", freq: 200, to: 1600, decay: 0.5, volume: 0.16 },
    roar: [{ wave: "sawtooth", freq: 82, to: 40, decay: 1.5, volume: 0.42 }, { wave: "noise", freq: 400, to: 60, decay: 1.4, volume: 0.42 }, { wave: "square", freq: 110, to: 52, decay: 1.2, volume: 0.12 }],
    bossDie: [{ wave: "noise", freq: 1500, to: 40, decay: 2, volume: 0.6 }, { wave: "sine", freq: 120, to: 20, decay: 2, volume: 0.6 }],
};
const PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
const sndGap = new Map();

/** Sounds are throttled by kind, so a blender makes a hum and not a wall of noise. */
function snd(kind, gap = 0.05) {
    const now = game.stepCount / 60, last = sndGap.get(kind) ?? -9;
    if (now >= last && now - last < gap) return;
    sndGap.set(kind, now);
    game.sfx(TONES[kind]);
}

function pearlBlip() {
    const now = game.stepCount / 60;
    if (now - R.blipAt < 0.05) return;
    R.streak = now - R.blipAt < 0.5 ? Math.min(R.streak + 1, PENTA.length - 1) : 0;
    R.blipAt = now;
    game.sfx({ wave: "triangle", freq: PENTA[R.streak], decay: 0.07, volume: 0.13 });
}

// --- Effects ---------------------------------------------------------------------------------

const F = FX.at;

function particle(x, y, frame, col, o) {
    const i = R.fNext; R.fNext = (i + 1) % MAXF;
    fx[i] = x; fy[i] = y; fvx[i] = o.vx ?? 0; fvy[i] = o.vy ?? 0;
    flife[i] = fmax[i] = o.life ?? 0.4; fsize[i] = o.size ?? 8; frot[i] = o.rot ?? 0; fspin[i] = o.spin ?? 0;
    fdrag[i] = o.drag ?? 2; fgrav[i] = o.grav ?? 0; fframe[i] = frame; fcol[i] = col;
}

const scratch = {};
function spray(x, y, n, frame, cols, sp0, sp1, life, size, grav = 0) {
    const r = game.fxRng;
    for (let k = 0; k < n; k++) {
        const a = r.next() * 6.283, v = sp0 + r.next() * (sp1 - sp0);
        scratch.vx = Math.cos(a) * v; scratch.vy = Math.sin(a) * v;
        scratch.life = life * (0.6 + r.next() * 0.7); scratch.size = size * (0.6 + r.next() * 0.8);
        scratch.rot = a; scratch.spin = (r.next() - 0.5) * 12; scratch.drag = 3.5; scratch.grav = grav;
        particle(x, y, frame, cols[k % cols.length], scratch);
    }
}

function bubbles(x, y, n, size = 7, up = 40) {
    const r = game.fxRng;
    for (let k = 0; k < n; k++) {
        particle(x + (r.next() - 0.5) * 12, y + (r.next() - 0.5) * 12, F.bubble, "#ffffff", { vx: (r.next() - 0.5) * 30, vy: -up * (0.5 + r.next()), life: 0.5 + r.next() * 0.5, size: size * (0.5 + r.next()), drag: 1 });
    }
}

function ringFx(x, y, r0, r1, life, col, width = 4) {
    if (R.rings.length > 40) R.rings.shift();
    R.rings.push({ x, y, r0, r1, t: 0, life, col, width });
}

function arc(x0, y0, x1, y1, col) {
    if (R.arcs.length > 60) R.arcs.shift();
    const r = game.fxRng, pts = [x0, y0], n = 4, nx = -(y1 - y0), ny = x1 - x0;
    for (let k = 1; k < n; k++) {
        const u = k / n, j = (r.next() - 0.5) * 0.34;
        pts.push(x0 + (x1 - x0) * u + nx * j, y0 + (y1 - y0) * u + ny * j);
    }
    pts.push(x1, y1);
    R.arcs.push({ pts, t: 0, col });
}

function number(x, y, v, crit, isHurt = false) {
    if (R.nums.length >= 56) R.nums.shift();
    R.nums.push({ x: x + (game.fxRng.next() - 0.5) * 12, y: y - 8, s: String(Math.max(1, Math.round(v))), t: 0, crit, hurt: isHurt });
}

function banner(textStr, sub, col = "#ffffff") {
    const s = R.scene, v = s.view;
    const y = Math.max(v.height * 0.2, v.safe.top + 110);
    const a = s.add([text(textStr, { size: 25, bold: true, color: col, font: FONT, align: "center", maxWidth: v.width - 32 }), pos(v.width / 2, y), ui(), { opacity: 0 }]);
    a.scale = 0.6;
    a.layer = 12;
    s.tween(a, { opacity: 1, scale: 1 }, 0.25, { ease: "outBack" });
    s.tween(a, { opacity: 0 }, 0.4, { delay: 2, onDone: () => a.destroy() });
    if (sub) {
        const b = s.add([text(sub, { size: 14, bold: true, color: "#ffffff", font: FONT, align: "center", maxWidth: v.width - 32 }), pos(v.width / 2, y + 26), ui(), { opacity: 0 }]);
        b.layer = 12;
        s.tween(b, { opacity: 0.92 }, 0.25, { delay: 0.1 });
        s.tween(b, { opacity: 0 }, 0.4, { delay: 2, onDone: () => b.destroy() });
    }
}

function shake(a, t) {
    if (a >= R.shakeNow || R.scene.shakeLeft <= 0) { R.shakeNow = a; R.scene.shake(a, t); }
}

// --- Grid -------------------------------------------------------------------------------------

function buildGrid() {
    head.fill(-1);
    for (let i = 0; i < R.top; i++) {
        if (!ealive[i]) continue;
        let cx = Math.floor((ex[i] - gx0) / CELL), cy = Math.floor((ey[i] - gy0) / CELL);
        cx = cx < 0 ? 0 : cx >= gw ? gw - 1 : cx; cy = cy < 0 ? 0 : cy >= gh ? gh - 1 : cy;
        const c = cy * gw + cx;
        next[i] = head[c]; head[c] = i;
    }
}

/** Fish touching a circle go in `hits`; returns how many. Nothing may query while looping over hits. */
function query(x, y, r) {
    const reach = r + 32;
    let c0 = Math.floor((x - reach - gx0) / CELL), c1 = Math.floor((x + reach - gx0) / CELL);
    let r0 = Math.floor((y - reach - gy0) / CELL), r1 = Math.floor((y + reach - gy0) / CELL);
    c0 = c0 < 0 ? 0 : c0; r0 = r0 < 0 ? 0 : r0; c1 = c1 >= gw ? gw - 1 : c1; r1 = r1 >= gh ? gh - 1 : r1;
    let n = 0;
    for (let cy = r0; cy <= r1; cy++) for (let cx = c0; cx <= c1; cx++) {
        for (let i = head[cy * gw + cx]; i !== -1; i = next[i]) {
            if (!ealive[i] || i === R.boss) continue;
            const dx = ex[i] - x, dy = ey[i] - y, t = r + er[i];
            if (dx * dx + dy * dy < t * t) hits[n++] = i;
        }
    }
    if (R.boss >= 0 && ealive[R.boss]) {
        const i = R.boss, dx = ex[i] - x, dy = ey[i] - y, t = r + er[i];
        if (dx * dx + dy * dy < t * t) hits[n++] = i;
    }
    return n;
}

function nearest(x, y, maxR) {
    for (let r = 90; ; r = Math.min(r * 2, maxR)) {
        const n = query(x, y, r);
        let best = -1, bd = Infinity;
        for (let k = 0; k < n; k++) {
            const i = hits[k], dx = ex[i] - x, dy = ey[i] - y, d = dx * dx + dy * dy;
            if (d < bd) { bd = d; best = i; }
        }
        if (best >= 0 || r >= maxR) return best;
    }
}

function densest() {
    let best = -1, bn = 0;
    const hx = R.hero.pos.x, hy = R.hero.pos.y, v = R.scene.view;
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
        const wx = gx0 + (cx + 0.5) * CELL, wy = gy0 + (cy + 0.5) * CELL;
        if (Math.abs(wx - hx) > v.width * 0.5 || Math.abs(wy - hy) > v.height * 0.46) continue;
        let n = 0;
        for (let i = head[cy * gw + cx]; i !== -1; i = next[i]) n++;
        if (n > bn) { bn = n; best = cy * gw + cx; }
    }
    if (best < 0) return null;
    return [gx0 + (best % gw + 0.5) * CELL, gy0 + (Math.floor(best / gw) + 0.5) * CELL];
}

// --- Spawning ----------------------------------------------------------------------------------

function newEnemy() {
    if (R.free.length) return R.free.pop();
    if (R.top < MAXE) return R.top++;
    return -1;
}

function spawn(type, x, y, hpMul = 1) {
    const i = newEnemy();
    if (i < 0) return -1;
    const T = TYPES[type], h = T.hp * hpScale(R.t) * hpMul;
    ex[i] = epx[i] = x; ey[i] = epy[i] = y;
    evx[i] = evy[i] = esx[i] = esy[i] = 0;
    ehp[i] = emax[i] = h; er[i] = T.r; edmg[i] = T.dmg * dmgScale(R.t);
    espeed[i] = T.speed * (0.9 + R.rng.next() * 0.2) * (1 + R.t / 420);
    eanim[i] = R.rng.next() * 3; eflash[i] = 0; eslow[i] = 0; eshock[i] = 0; eorbit[i] = 0;
    etimer[i] = R.rng.next() * 2; eborn[i] = 0; edx[i] = edy[i] = 0; ewave[i] = 0;
    etype[i] = type; estate[i] = 0; ealive[i] = 1; euid[i] = ++R.uid;
    eflip[i] = x > R.hero.pos.x ? 1 : 0;
    R.alive++;
    return i;
}

function edgePoint(pad = 46) {
    // A point just off the visible rectangle, on any side.
    const v = R.scene.view, rng = R.rng, cam = R.scene.cam.pos, hw = v.width / 2 + pad, hh = v.height / 2 + pad;
    const per = hw + hh, u = rng.next() * per * 2;
    if (u < per) {
        const x = cam.x - hw + rng.next() * hw * 2, y = cam.y + (u < per / 2 ? -hh : hh);
        return [x, y];
    }
    return [cam.x + (u < per * 1.5 ? -hw : hw), cam.y - hh + rng.next() * hh * 2];
}

function curve(keys, t) {
    for (let k = 1; k < keys.length; k++) {
        if (t < keys[k][0]) {
            const a = keys[k - 1], b = keys[k];
            return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
        }
    }
    return keys[keys.length - 1][1];
}

function pickType() {
    let w = MIX[0][1];
    for (const m of MIX) if (R.t >= m[0]) w = m[1];
    let sum = 0;
    for (const n of w) sum += n;
    let u = R.rng.next() * sum;
    for (let k = 0; k < w.length; k++) { u -= w[k]; if (u < 0) return k; }
    return 0;
}

function director(dt) {
    const want = curve(CROWD, R.t), rate = curve(RATE, R.t);
    R.spawnAcc += rate * dt;
    while (R.spawnAcc >= 1) {
        R.spawnAcc -= 1;
        if (R.alive >= want) continue;
        const [x, y] = edgePoint();
        spawn(pickType(), x, y);
    }
    while (R.eventAt < EVENTS.length && R.t >= EVENTS[R.eventAt].at) runEvent(EVENTS[R.eventAt++]);
    // A zone is a colour, a banner and a song.
    const z = ZONES.findLastIndex((q) => R.t >= q.at);
    if (z !== R.zone) {
        const was = ZONES[R.zone]?.song;
        R.zone = z;
        if (z > 0) banner(ZONES[z].name, `${Math.round(R.t / RUN.bossAt * 3000)} m down`, "#bff4ff");
        if (ZONES[z].song !== was) game.music(SONGS[ZONES[z].song]);
    }
}

function runEvent(ev) {
    const hx = R.hero.pos.x, hy = R.hero.pos.y, rng = R.rng, v = R.scene.view;
    if (ev.kind === "elite") {
        for (let k = 0; k < ev.n; k++) {
            const [x, y] = edgePoint(70);
            spawn(ANGLER, x, y, 1 + R.upgrades * 0.03);
        }
        snd("elite", 0.2);
        banner(ev.n > 1 ? `${ev.n} LANTERNJAWS` : "LANTERNJAW", "Kill it for a treasure clam", "#ffe98a");
    } else if (ev.kind === "ring") {
        const rad = Math.max(v.width, v.height) * 0.56;
        for (let k = 0; k < ev.n; k++) {
            const a = k / ev.n * Math.PI * 2, i = spawn(ev.type, hx + Math.cos(a) * rad, hy + Math.sin(a) * rad * 0.95, 0.9);
            if (i >= 0) estate[i] = 2;
        }
        snd("elite", 0.2);
        banner("SURROUNDED", "Punch a hole and get out", "#ff9a8a");
    } else if (ev.kind === "shoal") {
        const a = rng.next() * 6.283, ca = Math.cos(a), sa = Math.sin(a), far = Math.max(v.width, v.height) * 0.7;
        const type = ev.type ?? GRUMP;
        for (let k = 0; k < ev.n; k++) {
            const lane = (k % 8 - 3.5) * 24, row = Math.floor(k / 8) * 34;
            const x = hx - ca * (far + row) - sa * lane, y = hy - sa * (far + row) + ca * lane;
            const i = spawn(type, x, y, 0.7);
            if (i >= 0) { estate[i] = 3; edx[i] = ca; edy[i] = sa; etimer[i] = 7; espeed[i] = 150; eflip[i] = ca < 0 ? 1 : 0; }
        }
        banner("SHOAL!", null, "#d8fb6e");
    } else if (ev.kind === "boss") {
        const y = hy - v.height * 0.52 - 60;
        const i = spawn(KRAKEN, hx, y);
        ehp[i] = emax[i] = TYPES[KRAKEN].hp * (1 + R.upgrades * 0.02);
        R.boss = i; R.bossT = 0;
        // The sea goes quiet: every fish flees from her, and she gets the stage for a moment.
        for (let k = 0; k < R.top; k++) if (ealive[k] && k !== i && etype[k] < ANGLER) estate[k] = 5;
        estate[i] = 0; etimer[i] = 3.2;
        snd("roar", 0.5);
        shake(9, 1.4);
        R.scene.flash("#3a0a30", 0.7);
        banner("OLD MOTHER UNDERTOW", "She wants you back", "#ff9ab8");
    }
}

// --- Damage -----------------------------------------------------------------------------------

function damage(i, amt, kx, ky, src, quiet = false) {
    if (!ealive[i] || R.dying) return;
    let crit = false;
    if (eshock[i] > 0) amt *= 1.25;
    if (R.rng.next() < R.crit) { amt *= 2; crit = true; }
    amt *= R.might;
    ehp[i] -= amt;
    const T = TYPES[etype[i]], k = T.kb;
    // Big things blink instead of staying solid white under constant fire.
    if (etype[i] < ANGLER) eflash[i] = 0.09;
    else if (eflash[i] < -0.2) eflash[i] = 0.05;
    evx[i] += kx * k; evy[i] += ky * k;
    R.dmg[src] = (R.dmg[src] ?? 0) + amt;
    // In a blender, numbers become noise: hand them out from a budget.
    if ((!quiet || crit) && (etype[i] >= ANGLER || R.numGap <= 0)) {
        number(ex[i], ey[i] - er[i], amt, crit);
        R.numGap = R.alive > 200 ? 0.06 : R.alive > 80 ? 0.025 : 0;
    }
    snd("hit", 0.07);
    if (ehp[i] <= 0) kill(i, src);
}

const MILESTONES = [250, 1000, 2500, 5000, 10000, 15000, 1e9];
const MILESTONE_SUB = ["Warming up", "Feeding frenzy", "You are the food chain now", "Marine biologists are concerned", "An ecological disaster", "There can't be many left"];

function dropPearl(x, y, v) {
    let i = pon.indexOf(0);
    if (i < 0) {
        // Too many pearls on the floor: fold this one into a random pearl so nothing is lost.
        i = R.rng.int(0, MAXP - 1);
        pv[i] += v;
        pkind[i] = pv[i] >= 12 ? 2 : pv[i] >= 4 ? 1 : pkind[i];
        return;
    }
    px[i] = x; py[i] = y; pv[i] = v; pon[i] = 1; pmag[i] = 0;
    pvx[i] = (R.rng.next() - 0.5) * 60; pvy[i] = (R.rng.next() - 0.5) * 60;
    pkind[i] = v >= 12 ? 2 : v >= 4 ? 1 : 0;
}

function kill(i, src) {
    const x = ex[i], y = ey[i], t = etype[i], T = TYPES[t];
    ealive[i] = 0; R.alive--; R.free.push(i);
    R.kills++;
    R.pops.push({ x, y, t: 0, type: t, flip: eflip[i] });
    if (R.pops.length > 40) R.pops.shift();
    spray(x, y, R.alive > 200 ? 3 : 5, F.shard0, T.colors, 40, 170, 0.34, 8);
    if (game.fxRng.next() < 0.5) bubbles(x, y, 1, 6);
    snd("pop", 0.06);
    if (R.kills % 25 === 0) game.vibrate(6);
    if (R.kills >= MILESTONES[R.nextMilestone]) {
        banner(`${MILESTONES[R.nextMilestone].toLocaleString("en-US")} FISH!`, MILESTONE_SUB[R.nextMilestone], "#ffffff");
        R.nextMilestone++;
        snd("heart", 0.3);
    }

    if (t === KRAKEN) return bossDead(x, y);
    if (T.elite) {
        spray(x, y, 26, F.shard1, ["#ffe98a", "#4d8fbf", "#ffffff"], 90, 300, 0.6, 12);
        ringFx(x, y, 20, 130, 0.45, "#ffe98a", 8);
        shake(5, 0.25);
        snd("boom", 0.1);
        R.slowT = 0.14; // A blink of slow motion sells the kill.
        R.drops.push({ kind: "clam", x, y, t: 0 });
        return;
    }
    dropPearl(x, y, Math.max(1, Math.round(T.xp * R.xpMul * Math.min(1.7, 1 + R.t / 90))));
    const luck = R.rng.next();
    if (luck < 0.0035) R.drops.push({ kind: "heart", x, y, t: 0 });
    else if (luck < 0.0048) R.drops.push({ kind: "vacuum", x, y, t: 0 });
    if (R.storm && eshock[i] > 0 && src === "eel") R.stormQ.push(x, y);
}

function bossDead(x, y) {
    R.won = true; R.boss = -1;
    R.scene.flash("#ffffff", 1.2);
    shake(12, 1.6);
    snd("bossDie", 1);
    spray(x, y, 90, F.shard1, ["#e8527c", "#ffd84d", "#ffffff", "#ff86c8"], 100, 460, 1.2, 16);
    ringFx(x, y, 40, 460, 1, "#ffd84d", 12);
    ringFx(x, y, 20, 300, 0.8, "#ffffff", 8);
    // Everything else bursts too: a boss kill should feel like the sea exhaling.
    for (let i = 0; i < R.top; i++) {
        if (!ealive[i]) continue;
        spray(ex[i], ey[i], 3, F.shard0, TYPES[etype[i]].colors, 40, 200, 0.5, 9);
        dropPearl(ex[i], ey[i], 8);
        ealive[i] = 0; R.alive--; R.free.push(i); R.kills++;
    }
    R.endT = 2.6;
    banner("SHE'S GONE!", "Back to the surface", "#ffe98a");
}

function spines(x, y, n) {
    for (let k = 0; k < n; k++) {
        const a = k / n * 6.283 + 0.2;
        shot({ kind: "spine", x, y, vx: Math.cos(a) * 118, vy: Math.sin(a) * 118, life: 2.2, r: 5, hurt: 8 * dmgScale(R.t), size: 18, rot: a });
    }
}

// --- Shots ---------------------------------------------------------------------------------------

const shotPool = [];
function shot(o) {
    if (R.shots.length > 260) return null;
    const p = shotPool.pop() ?? { seen: new Int32Array(10) };
    p.kind = o.kind; p.x = p.px = o.x; p.y = p.py = o.y; p.vx = o.vx; p.vy = o.vy; p.life = o.life; p.r = o.r;
    p.dmg = o.dmg ?? 0; p.hurt = o.hurt ?? 0; p.pierce = o.pierce ?? 0; p.size = o.size ?? 16; p.rot = o.rot ?? 0;
    p.src = o.src ?? ""; p.turn = o.turn ?? 0; p.blast = o.blast ?? 0; p.target = -1; p.tid = 0; p.age = 0;
    p.piranha = !!o.piranha; p.nSeen = 0; p.seen.fill(0); p.trail = 0;
    R.shots.push(p);
    return p;
}

function explode(x, y, r, dmg, src) {
    const n = query(x, y, r);
    for (let k = 0; k < n; k++) {
        const i = hits[k], dx = ex[i] - x, dy = ey[i] - y, d = Math.hypot(dx, dy) || 1;
        damage(i, dmg, dx / d * 260, dy / d * 260, src);
    }
    ringFx(x, y, r * 0.2, r * 1.05, 0.28, "#ffffff", 7);
    ringFx(x, y, r * 0.1, r * 0.8, 0.36, "#ffc65a", 12);
    R.flashes.push({ x, y, r: r * 1.15, t: 0 });
    spray(x, y, 10, F.dot, ["#fff6c8", "#ffc65a", "#ff6b5e"], 60, 240, 0.42, 9);
    bubbles(x, y, 4, 8);
    snd("boom", 0.12);
    shake(2.6, 0.14);
}

function stepShots(dt) {
    const hx = R.hero.pos.x, hy = R.hero.pos.y;
    for (let s = R.shots.length - 1; s >= 0; s--) {
        const p = R.shots[s];
        p.px = p.x; p.py = p.y; p.age += dt; p.life -= dt;
        if (p.turn) {
            // Homing: re-acquire when the mark dies, then steer.
            if (p.target < 0 || !ealive[p.target] || euid[p.target] !== p.tid) {
                p.target = nearest(p.x, p.y, 320);
                p.tid = p.target >= 0 ? euid[p.target] : 0;
            }
            if (p.target >= 0) {
                const want = Math.atan2(ey[p.target] - p.y, ex[p.target] - p.x);
                let da = want - p.rot;
                da = Math.atan2(Math.sin(da), Math.cos(da));
                p.rot += Math.max(-p.turn * dt, Math.min(p.turn * dt, da));
            }
            const sp = Math.min(380, 200 + p.age * 420);
            p.vx = Math.cos(p.rot) * sp; p.vy = Math.sin(p.rot) * sp;
            p.trail -= dt;
            if (p.trail <= 0) { p.trail = 0.04; particle(p.x - p.vx * 0.05, p.y - p.vy * 0.05, F.bubble, "#ffffff", { size: 7, life: 0.34, vy: -18 }); }
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        let dead = p.life <= 0;
        if (p.hurt) {
            const dx = p.x - hx, dy = p.y - hy;
            if (dx * dx + dy * dy < (p.r + 10) ** 2) { hurt(p.hurt); dead = true; }
        } else {
            const n = query(p.x, p.y, p.r);
            for (let k = 0; k < n && !dead; k++) {
                const i = hits[k];
                if (!ealive[i]) continue;
                let seen = false;
                for (let q = 0; q < p.nSeen; q++) if (p.seen[q] === euid[i]) seen = true;
                if (seen) continue;
                if (p.nSeen < 10) p.seen[p.nSeen++] = euid[i];
                if (p.blast) {
                    explode(p.x, p.y, p.blast * R.area, p.dmg, p.src);
                    if (p.piranha) for (let m = 0; m < 3; m++) {
                        const kid = shot({ kind: "minitorp", x: p.x, y: p.y, vx: 0, vy: 0, rot: R.rng.next() * 6.283, life: 1.6, r: 7, blast: 30, turn: 9, src: p.src, size: 17 });
                        if (kid) kid.dmg = p.dmg * 0.42;
                    }
                    dead = true;
                    break;
                }
                const v = Math.hypot(p.vx, p.vy) || 1;
                damage(i, p.dmg, p.vx / v * 120, p.vy / v * 120, p.src);
                if (--p.pierce < 0) dead = true;
            }
        }
        if (dead) { R.shots.splice(s, 1); shotPool.push(p); }
    }
}

// --- Weapons -----------------------------------------------------------------------------------------

function fireWeapon(key, w, dt) {
    const S = w.s, hx = R.hero.pos.x, hy = R.hero.pos.y;
    if (key === "razor") {
        w.a += S.spin * dt;
        const rings = S.shark ? 2 : 1;
        for (let ring = 0; ring < rings; ring++) {
            const rad = (S.r + ring * 46) * R.area, dir = ring ? -0.8 : 1, n = S.n;
            for (let k = 0; k < n; k++) {
                const a = w.a * dir + k / n * 6.283 + ring * 0.4, bx = hx + Math.cos(a) * rad, by = hy + Math.sin(a) * rad, m = query(bx, by, 12);
                for (let q = 0; q < m; q++) {
                    const i = hits[q];
                    if (eorbit[i] > 0 || !ealive[i]) continue;
                    eorbit[i] = S.hit;
                    const dx = ex[i] - hx, dy = ey[i] - hy, d = Math.hypot(dx, dy) || 1;
                    damage(i, S.dmg, dx / d * 170, dy / d * 170, "razor");
                    snd("bite", 0.06);
                }
            }
        }
        return;
    }
    if (key === "sonar") {
        w.t -= dt;
        w.pulse = (w.pulse + dt * 1.4) % 1;
        if (w.t <= 0) {
            w.t = S.tick;
            const rad = S.r * R.area, n = query(hx, hy, rad);
            for (let k = 0; k < n; k++) {
                const i = hits[k], dx = ex[i] - hx, dy = ey[i] - hy, d = Math.hypot(dx, dy) || 1;
                eslow[i] = 0.6;
                damage(i, S.dmg, dx / d * 70, dy / d * 70, "sonar", true);
            }
            if (n) snd("sonar", 0.6);
        }
        if (S.boom) {
            w.b = (w.b ?? S.boom) - dt;
            if (w.b <= 0) {
                w.b = S.boom * R.cool;
                const rad = S.r * R.area * 1.3, n = query(hx, hy, rad);
                for (let k = 0; k < n; k++) {
                    const i = hits[k], dx = ex[i] - hx, dy = ey[i] - hy, d = Math.hypot(dx, dy) || 1;
                    damage(i, S.dmg * 2, dx / d * 520, dy / d * 520, "sonar", true);
                }
                ringFx(hx, hy, 30, rad, 0.5, "#7dffcf", 10);
                snd("wave", 0.3);
            }
        }
        return;
    }
    w.t -= dt;
    if (w.t > 0) return;
    w.t = (S.cd ?? 1) * R.cool;
    if (key === "harpoon") {
        const t = nearest(hx, hy, 300);
        if (t < 0) { w.t = 0.1; return; }
        const base = Math.atan2(ey[t] - hy, ex[t] - hx), n = S.n, sp = n > 3 ? 0.17 : 0.14;
        for (let k = 0; k < n; k++) {
            const a = base + (k - (n - 1) / 2) * sp;
            shot({ kind: w.evolved ? "trident" : "harpoon", x: hx, y: hy - 4, vx: Math.cos(a) * S.speed, vy: Math.sin(a) * S.speed, rot: a, life: 0.85, r: 8, dmg: S.dmg, pierce: S.pierce, src: key, size: w.evolved ? 40 : 36 });
        }
        snd("harpoon", 0.1);
    } else if (key === "eel") {
        let any = false;
        const seen = R.chain;
        for (let root = 0; root < S.roots; root++) {
            let cx = hx, cy = hy - 6;
            seen.clear();
            for (let j = 0; j <= S.jumps; j++) {
                // The first hop finds a target; each later hop jumps to the closest fresh fish.
                const n = query(cx, cy, j === 0 ? 240 : 96);
                let best = -1, bd = Infinity;
                for (let k = 0; k < n; k++) {
                    const i = hits[k];
                    if (seen.has(i) || !ealive[i] || (root && j === 0 && eshock[i] > 1.9)) continue;
                    const dx = ex[i] - cx, dy = ey[i] - cy, d = dx * dx + dy * dy;
                    if (d < bd) { bd = d; best = i; }
                }
                if (best < 0) break;
                arc(cx, cy, ex[best], ey[best], w.evolved ? "#c8a8ff" : "#ffe066");
                seen.add(best);
                cx = ex[best]; cy = ey[best];
                eshock[best] = 2;
                damage(best, S.dmg, 0, 0, key);
                any = true;
                spray(cx, cy, 2, F.spark, ["#ffffff", "#ffe066"], 40, 120, 0.2, 9);
            }
        }
        if (any) snd("zap", 0.1); else w.t = 0.1;
    } else if (key === "torpedo") {
        for (let k = 0; k < S.n; k++) {
            shot({ kind: "torpedo", x: hx, y: hy, vx: 0, vy: 0, rot: R.rng.next() * 6.283, life: 2.6, r: 8, dmg: S.dmg, blast: S.r, turn: S.turn, src: key, piranha: S.piranha, size: 26 });
        }
        snd("launch", 0.12);
    } else if (key === "mine") {
        for (let k = 0; k < S.n; k++) {
            const a = R.rng.next() * 6.283, d = 40 + R.rng.next() * 120;
            R.mines.push({ x: hx, y: hy, cx: hx, cy: hy, tx: hx + Math.cos(a) * d, ty: hy + Math.sin(a) * d * 0.85, t: 0, fuse: 0.9, S, blasts: S.grav ? 2 : 1 });
        }
    } else if (key === "whirl") {
        for (let k = 0; k < S.n; k++) {
            const at = densest() ?? [hx + (R.rng.next() - 0.5) * 200, hy + (R.rng.next() - 0.5) * 200];
            const jitter = k ? 150 : 0;
            R.whirls.push({ x: at[0] + (R.rng.next() - 0.5) * jitter, y: at[1] + (R.rng.next() - 0.5) * jitter, t: 0, dur: S.dur, r: S.r * R.area, dps: S.dps, tick: 0 });
        }
        snd("wave", 0.4);
    } else if (key === "riptide") {
        const m = R.lastDir, id = ++R.waveId;
        if (S.ring) R.waves.push({ ring: true, x: hx, y: hy, t: 0, id, dmg: S.dmg, r: 20 });
        else {
            R.waves.push({ x: hx, y: hy, dx: m[0], dy: m[1], t: 0, id, dmg: S.dmg, w: S.w * R.area });
            if (S.both) R.waves.push({ x: hx, y: hy, dx: -m[0], dy: -m[1], t: 0, id: ++R.waveId, dmg: S.dmg, w: S.w * R.area });
        }
        snd("wave", 0.3);
    }
}

function stepWorldWeapons(dt) {
    // Mines: arc through the water, tick, burst.
    for (let k = R.mines.length - 1; k >= 0; k--) {
        const m = R.mines[k];
        m.t += dt;
        const u = Math.min(1, m.t / 0.3);
        m.cx = m.x + (m.tx - m.x) * u; m.cy = m.y + (m.ty - m.y) * u;
        if (m.S.grav && m.t > 0.3) {
            const r = m.S.r * R.area * 1.5, n = query(m.cx, m.cy, r);
            for (let q = 0; q < n; q++) {
                const i = hits[q];
                if (etype[i] >= ANGLER) continue;
                const dx = m.cx - ex[i], dy = m.cy - ey[i], d = Math.hypot(dx, dy) || 1;
                ex[i] += dx / d * 130 * dt; ey[i] += dy / d * 130 * dt;
            }
        }
        if (m.t >= m.fuse + 0.3) {
            explode(m.cx, m.cy, m.S.r * R.area, m.S.dmg, "mine");
            if (--m.blasts > 0) m.t = m.fuse + 0.02;
            else R.mines.splice(k, 1);
        }
    }
    // Whirlpools: pull in, spin, chew.
    for (let k = R.whirls.length - 1; k >= 0; k--) {
        const w = R.whirls[k];
        w.t += dt; w.tick -= dt;
        const grow = Math.min(1, w.t / 0.3) * Math.min(1, (w.dur - w.t) / 0.3), r = w.r * grow, n = query(w.x, w.y, r * 1.3);
        const chew = w.tick <= 0;
        if (chew) w.tick = 0.25;
        for (let q = 0; q < n; q++) {
            const i = hits[q];
            if (!ealive[i]) continue;
            const dx = w.x - ex[i], dy = w.y - ey[i], d = Math.hypot(dx, dy) || 1, heavy = etype[i] >= ANGLER ? 0.12 : 1;
            ex[i] += (dx / d * 95 + dy / d * 70) * dt * heavy;
            ey[i] += (dy / d * 95 - dx / d * 70) * dt * heavy;
            if (chew) damage(i, w.dps * 0.25, 0, 0, "whirl", true);
        }
        if (w.t >= w.dur) R.whirls.splice(k, 1);
    }
    // Riptides: a band of surf rolls outward.
    for (let k = R.waves.length - 1; k >= 0; k--) {
        const w = R.waves[k];
        w.t += dt;
        if (w.ring) {
            w.r += 340 * dt;
            const hx = R.hero.pos.x, hy = R.hero.pos.y, n = query(hx, hy, w.r + 16);
            for (let q = 0; q < n; q++) {
                const i = hits[q];
                if (ewave[i] === w.id) continue;
                const dx = ex[i] - hx, dy = ey[i] - hy, d = Math.hypot(dx, dy) || 1;
                if (d < w.r - 30) continue;
                ewave[i] = w.id;
                damage(i, w.dmg, dx / d * 480, dy / d * 480, "riptide", true);
            }
            w.x = hx; w.y = hy;
            if (w.t > 1) R.waves.splice(k, 1);
        } else {
            const dist = 30 + w.t * 330, cx = w.x + w.dx * dist, cy = w.y + w.dy * dist, wide = 96 * w.w;
            w.cx = cx; w.cy = cy;
            const n = query(cx, cy, wide);
            for (let q = 0; q < n; q++) {
                const i = hits[q];
                if (ewave[i] === w.id) continue;
                const dx = ex[i] - cx, dy = ey[i] - cy, along = dx * w.dx + dy * w.dy;
                if (Math.abs(along) > 34) continue;
                ewave[i] = w.id;
                damage(i, w.dmg, w.dx * 460, w.dy * 460, "riptide", true);
            }
            if (w.t > 0.85) R.waves.splice(k, 1);
        }
    }
    // Storm Eel: shocked kills arc once more. Queued so it can't disturb a query in progress.
    for (let k = 0; k + 1 < R.stormQ.length && k < 8; k += 2) {
        const x = R.stormQ[k], y = R.stormQ[k + 1], j = nearest(x, y, 110);
        if (j >= 0) { arc(x, y, ex[j], ey[j], "#c8a8ff"); damage(j, 30, 0, 0, "eel", true); }
    }
    R.stormQ.length = 0;
}

// --- Hero ---------------------------------------------------------------------------------------------

function hurt(d, by = "shot") {
    if (R.iframes > 0 || R.dying || R.won || R.god) return;
    R.hurtBy[by] = (R.hurtBy[by] ?? 0) + 1;
    const dealt = Math.max(1, d - R.armor);
    R.hp -= dealt;
    R.iframes = 0.5;
    R.hurtFx = 1;
    R.heroFlash = 0.12;
    snd("hurt", 0.1);
    shake(4, 0.18);
    game.vibrate(20);
    number(R.hero.pos.x, R.hero.pos.y - 26, dealt, false, true);
    spray(R.hero.pos.x, R.hero.pos.y, 6, F.shard0, ["#ff6b5e", "#ffffff"], 60, 200, 0.3, 8);
    if (R.hp <= 0) {
        R.hp = 0;
        R.dying = true;
        R.endT = 1.7;
        game.stopMusic();
        game.sfx("lose");
        R.scene.flash("#ff4d5e", 0.5);
        bubbles(R.hero.pos.x, R.hero.pos.y, 18, 12, 90);
    }
}

function stepHero(dt) {
    const h = R.hero, m = R.dying ? { x: 0, y: 0 } : R.scene.input.move;
    const len = Math.hypot(m.x, m.y);
    const k = len > 1 ? 1 / len : 1;
    const goalX = m.x * k * R.speed, goalY = m.y * k * R.speed;
    // Water has weight: quick to respond, soft to stop.
    const ease = 1 - Math.exp(-14 * dt);
    R.vx += (goalX - R.vx) * ease; R.vy += (goalY - R.vy) * ease;
    h.pos.x += R.vx * dt; h.pos.y += R.vy * dt;
    if (len > 0.1) { R.lastDir = [m.x / len, m.y / len]; if (Math.abs(m.x) > 0.1) R.flip = m.x < 0; }
    R.swim += dt * (2.5 + Math.hypot(R.vx, R.vy) * 0.1);
    R.iframes -= dt; R.heroFlash -= dt; R.hurtFx = Math.max(0, R.hurtFx - dt * 2.4);
    if (!R.dying && R.hp < R.maxHp) R.hp = Math.min(R.maxHp, R.hp + R.regen * dt);
    if (Math.hypot(R.vx, R.vy) > 40) {
        R.trail -= dt;
        if (R.trail <= 0) { R.trail = 0.16; bubbles(h.pos.x - R.vx * 0.09, h.pos.y + 4, 1, 5, 26); }
    }
}

// --- The swarm ---------------------------------------------------------------------------------------

function stepEnemies(dt) {
    const hx = R.hero.pos.x, hy = R.hero.pos.y, v = R.scene.view;
    const farX = v.width * 0.5 + 240, farY = v.height * 0.5 + 240;
    gx0 = R.scene.cam.pos.x - gw * CELL / 2; gy0 = R.scene.cam.pos.y - gh * CELL / 2;
    buildGrid();
    if (R.step % 2 === 0) separate();
    const fr = Math.exp(-6 * dt);
    for (let i = 0; i < R.top; i++) {
        if (!ealive[i]) continue;
        const type = etype[i];
        epx[i] = ex[i]; epy[i] = ey[i];
        eborn[i] += dt;
        eflash[i] -= dt; eslow[i] -= dt; eshock[i] -= dt; eorbit[i] -= dt;
        eanim[i] += dt * 7;
        const dx = hx - ex[i], dy = hy - ey[i], d = Math.sqrt(dx * dx + dy * dy) || 1;
        let sp = espeed[i] * (eslow[i] > 0 ? 0.55 : 1), mx = dx / d, my = dy / d, st = estate[i];
        if (type === KRAKEN) { bossStep(i, dt, dx, dy, d); continue; }

        if (st === 5) {
            mx = -mx; my = -my; sp *= 2.2;
            if (eborn[i] > 0.1 && (Math.abs(dx) > v.width * 0.5 + 60 || Math.abs(dy) > v.height * 0.5 + 60)) { ealive[i] = 0; R.alive--; R.free.push(i); continue; }
        } else if (st === 3) {
            // A shoal crosses in a straight line, then rejoins the swarm.
            mx = edx[i]; my = edy[i];
            etimer[i] -= dt;
            if (etimer[i] <= 0) { estate[i] = 0; espeed[i] = TYPES[type].speed * (1 + R.t / 420); }
        } else if (type === CRAB) {
            // Scuttles in bursts.
            const u = (eanim[i] * 0.2) % 1;
            sp *= u < 0.55 ? 1.5 : 0.2;
        } else if (type === JELLY) {
            sp *= 0.55 + Math.max(0, Math.sin(eanim[i] * 0.7)) * 1.4;
        } else if (type === INKLING) {
            // Weaves.
            const w = Math.sin(eanim[i] * 0.5) * 0.7, ox = mx;
            mx = mx - my * w; my = my + ox * w;
        } else if (type === PUFFER) {
            if (st === 0 && d < 84) { estate[i] = st = 1; etimer[i] = 0.9; }
            if (st === 1) {
                sp = 0;
                etimer[i] -= dt;
                if (etimer[i] <= 0) {
                    spines(ex[i], ey[i], 10);
                    spray(ex[i], ey[i], 6, F.shard0, TYPES[PUFFER].colors, 60, 200, 0.3, 8);
                    snd("pop", 0.06);
                    ealive[i] = 0; R.alive--; R.free.push(i);
                    continue;
                }
            }
        } else if (type === EEL) {
            etimer[i] -= dt;
            if (st === 0 && etimer[i] <= 0 && d < 240) { estate[i] = st = 1; etimer[i] = 0.55; edx[i] = mx; edy[i] = my; }
            if (st === 1) {
                sp = 0;
                if (etimer[i] <= 0) { estate[i] = st = 4; etimer[i] = 0.7; }
            } else if (st === 4) {
                mx = edx[i]; my = edy[i]; sp = 270;
                if (etimer[i] <= 0) { estate[i] = 0; etimer[i] = 1.6 + R.rng.next() * 1.6; }
            }
        }
        if (st === 2 && (eborn[i] > 12 || d < 100)) estate[i] = 0;

        ex[i] += (mx * sp + evx[i] + esx[i]) * dt;
        ey[i] += (my * sp + evy[i] + esy[i]) * dt;
        evx[i] *= fr; evy[i] *= fr;
        if (Math.abs(mx) > 0.15 && eflash[i] <= 0) eflip[i] = mx < 0 ? 1 : 0;

        if (d < er[i] + 10) {
            hurt(edmg[i], T_NAMES[type]);
            // A big fish that lands a bite rebounds, so it can't pin you and chew.
            if (type === ANGLER) { evx[i] = -dx / d * 300; evy[i] = -dy / d * 300; }
        }

        if (st !== 3 && st !== 5 && (Math.abs(dx) > farX || Math.abs(dy) > farY)) {
            // Left behind: swim back in from the front, so the crowd never thins by running away.
            const [nx, ny] = edgePoint();
            ex[i] = epx[i] = nx; ey[i] = epy[i] = ny;
        }
    }
}

function separate() {
    const push = 150;
    esx.fill(0, 0, R.top); esy.fill(0, 0, R.top);
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
        const c = cy * gw + cx;
        for (let a = head[c]; a !== -1; a = next[a]) {
            for (let b = next[a]; b !== -1; b = next[b]) pair(a, b, push);
            if (cx + 1 < gw) for (let b = head[c + 1]; b !== -1; b = next[b]) pair(a, b, push);
            if (cy + 1 < gh) {
                for (let b = head[c + gw]; b !== -1; b = next[b]) pair(a, b, push);
                if (cx + 1 < gw) for (let b = head[c + gw + 1]; b !== -1; b = next[b]) pair(a, b, push);
                if (cx > 0) for (let b = head[c + gw - 1]; b !== -1; b = next[b]) pair(a, b, push);
            }
        }
    }
}

function pair(a, b, push) {
    const dx = ex[a] - ex[b], dy = ey[a] - ey[b], t = (er[a] + er[b]) * 0.92, d2 = dx * dx + dy * dy;
    if (d2 >= t * t || d2 < 0.001) return;
    const d = Math.sqrt(d2), f = (1 - d / t) * push / d;
    esx[a] += dx * f; esy[a] += dy * f; esx[b] -= dx * f; esy[b] -= dy * f;
}

// Boss states: 0 enter, 1 hover and shoot, 2 wind-up, 3 lunge, 4 summon.
function bossStep(i, dt, dx, dy, d) {
    R.bossT += dt;
    const rage = 1 + (1 - ehp[i] / emax[i]) * 0.9 + Math.max(0, R.bossT - 45) * 0.03;
    etimer[i] -= dt;
    const st = estate[i];
    if (st === 0) {
        ey[i] += 66 * dt;
        ex[i] += dx * dt * 0.5;
        if (etimer[i] <= 0) { estate[i] = 1; etimer[i] = 3; R.bossShot = 0; }
    } else if (st === 1) {
        // Drift above the hero, spiralling ink.
        ex[i] += dx * dt * 0.8; ey[i] += (dy - 138) * dt * 0.8;
        R.bossShot -= dt;
        if (R.bossShot <= 0) {
            R.bossShot = 0.26 / rage;
            const arms = 3 + Math.floor(rage);
            for (let k = 0; k < arms; k++) {
                const a = R.bossT * 1.1 + k / arms * 6.283;
                shot({ kind: "ink", x: ex[i], y: ey[i] + 30, vx: Math.cos(a) * 92, vy: Math.sin(a) * 92, life: 3.6, r: 7, hurt: 11, size: 19 });
            }
        }
        if (etimer[i] <= 0) {
            if (R.rng.next() < 0.55) { estate[i] = 2; etimer[i] = 0.9; edx[i] = dx / d; edy[i] = dy / d; shake(3, 0.8); snd("elite", 0.5); }
            else { estate[i] = 4; etimer[i] = 1.2; }
        }
    } else if (st === 2) {
        ex[i] -= edx[i] * 26 * dt; ey[i] -= edy[i] * 26 * dt;
        if (etimer[i] <= 0) { estate[i] = 3; etimer[i] = 0.85; snd("roar", 0.5); }
    } else if (st === 3) {
        ex[i] += edx[i] * 380 * dt; ey[i] += edy[i] * 380 * dt;
        if (etimer[i] <= 0) { estate[i] = 1; etimer[i] = 2.6; }
    } else if (st === 4) {
        if (etimer[i] <= 0) {
            for (let k = 0; k < 12; k++) {
                const a = k / 12 * 6.283, n = spawn(k % 2 ? INKLING : GRUMP, ex[i] + Math.cos(a) * 90, ey[i] + Math.sin(a) * 90, 0.6);
                if (n >= 0) { evx[n] = Math.cos(a) * 300; evy[n] = Math.sin(a) * 300; }
            }
            ringFx(ex[i], ey[i], 40, 180, 0.5, "#ff86c8", 8);
            snd("wave", 0.3);
            estate[i] = 1; etimer[i] = 3;
        }
    }
    if (d < er[i] + 8) hurt(edmg[i], "kraken");
    // She sheds air bubbles as she weakens: a reason to stay close and a breather in the fight.
    const stage = Math.floor((1 - ehp[i] / emax[i]) * 4);
    if (stage > R.bossStage) {
        R.bossStage = stage;
        R.drops.push({ kind: "heart", x: ex[i], y: ey[i] + 60, t: 0 });
        ringFx(ex[i], ey[i], 60, 220, 0.5, "#ff86c8", 8);
    }
}

// --- Pickups ------------------------------------------------------------------------------------------

function stepPearls(dt) {
    const hx = R.hero.pos.x, hy = R.hero.pos.y, rad = R.magnet, rad2 = rad * rad, sweep = R.vacuum > 0;
    if (sweep) R.vacuum -= dt;
    const fr = Math.exp(-5 * dt);
    let live = 0;
    for (let i = 0; i < MAXP; i++) {
        if (!pon[i]) continue;
        live++;
        const dx = hx - px[i], dy = hy - py[i], d2 = dx * dx + dy * dy;
        if (sweep || d2 < rad2 || R.won) pmag[i] = 1;
        if (pmag[i]) {
            const d = Math.sqrt(d2) || 1, a = 1500 * dt;
            pvx[i] += dx / d * a; pvy[i] += dy / d * a;
            const s = Math.hypot(pvx[i], pvy[i]), cap = 520;
            if (s > cap) { pvx[i] *= cap / s; pvy[i] *= cap / s; }
            if (d2 < 340) {
                pon[i] = 0;
                gainXp(pv[i]);
                pearlBlip();
                continue;
            }
        } else { pvx[i] *= fr; pvy[i] *= fr; }
        px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
    }
    R.pearls = live;
    for (let k = R.drops.length - 1; k >= 0; k--) {
        const q = R.drops[k];
        q.t += dt;
        const dx = hx - q.x, dy = hy - q.y, d = Math.hypot(dx, dy);
        if (d < 62 && d > 0.1) { q.x += dx / d * 240 * dt; q.y += dy / d * 240 * dt; }
        if (d < 22) { collect(q); R.drops.splice(k, 1); }
    }
}

function collect(q) {
    const h = R.hero.pos;
    if (q.kind === "heart") {
        R.hp = Math.min(R.maxHp, R.hp + 40);
        snd("heart", 0.1);
        spray(h.x, h.y, 12, F.bubble, ["#ffb6c8"], 40, 140, 0.5, 8);
    } else if (q.kind === "vacuum") {
        R.vacuum = 1.5;
        snd("vacuum", 0.2);
        ringFx(h.x, h.y, 10, 320, 0.5, "#ffe98a", 6);
    } else if (q.kind === "clam") {
        R.hp = Math.min(R.maxHp, R.hp + 30);
        R.levels += 1;
        R.bonus = true;
        snd("evolve", 0.2);
        ringFx(h.x, h.y, 10, 180, 0.5, "#ffe98a", 8);
    }
}

function gainXp(v) {
    if (R.noLevel) return;
    // Quiet rubber band: a run that has fallen behind the curve levels faster, so a slow start
    // is a tense run and not a dead one.
    R.xp += R.lv < R.t / 8 ? v * 1.6 : v;
    while (R.xp >= R.need) {
        R.xp -= R.need;
        R.lv++;
        R.need = xpNeed(R.lv);
        R.levels++;
    }
}
const xpNeed = (l) => Math.floor(4 + l * 2 + l * l * 0.6 + Math.max(0, l - 18) ** 2 * 6);

// --- Level up ------------------------------------------------------------------------------------------

function offers() {
    const out = [], rng = R.rng;
    // Evolutions always lead: they are the payoff for a build.
    for (const [k, w] of Object.entries(R.weapons)) {
        const W = WEAPONS[k];
        if (w.lv >= MAX_LV && !w.evolved && R.passives[W.evo.need]) out.push({ kind: "evo", key: k, name: W.evo.name, icon: W.evo.icon, desc: W.evo.desc, tag: "EVOLUTION" });
    }
    const pool = [], count = Object.keys(R.weapons).length;
    for (const [k, W] of Object.entries(WEAPONS)) {
        const w = R.weapons[k];
        if (w) {
            if (w.lv < MAX_LV) pool.push({ kind: "up", key: k, name: W.name, icon: W.icon, desc: W.lv[w.lv], lv: w.lv + 1, max: MAX_LV, weight: 4 });
        } else if (count < MAX_WEAPONS) {
            pool.push({ kind: "new", key: k, name: W.name, icon: W.icon, desc: W.lv[0], lv: 1, max: MAX_LV, weight: count < 4 ? 6 : 2.5, tag: "NEW" });
        }
    }
    for (const [k, P] of Object.entries(PASSIVES)) {
        const l = R.passives[k] ?? 0;
        if (l >= P.max || (!l && Object.keys(R.passives).length >= MAX_PASSIVES)) continue;
        const partner = Object.keys(R.weapons).find((wk) => WEAPONS[wk].evo.need === k && !R.weapons[wk].evolved);
        pool.push({ kind: "pas", key: k, name: P.name, icon: P.icon, desc: !l && partner ? `${P.desc} Evolves ${WEAPONS[partner].name}.` : P.desc, lv: l + 1, max: P.max, weight: partner && !l ? 5 : 2, tag: l ? null : "NEW" });
    }
    while (out.length < 3 && pool.length) {
        let sum = 0;
        for (const p of pool) sum += p.weight;
        let u = rng.next() * sum, at = 0;
        for (; at < pool.length - 1; at++) { u -= pool[at].weight; if (u < 0) break; }
        out.push(pool.splice(at, 1)[0]);
    }
    if (out.length < 3) out.push({ kind: "snack", key: "snack", name: "Air Bubble", icon: "heart", desc: "Refill 40 air." });
    if (out.length < 3) out.push({ kind: "gold", key: "gold", name: "Pearl Hoard", icon: "pearl", desc: "+15% damage for this dive." });
    if (out.length < 3) out.push({ kind: "tank", key: "tank", name: "Spare Tank", icon: "hull", desc: "+15 max air and a full refill." });
    return out.slice(0, 3);
}

function recompute() {
    const p = (k) => R.passives[k] ?? 0;
    R.might = (1 + p("whet") * 0.18) * R.mightBonus;
    R.speed = 118 * (1 + p("flipper") * 0.1);
    R.maxHp = 100 + p("hull") * 25 + R.tanks * 15;
    R.armor = p("hull");
    R.cool = 1 - p("gear") * 0.09;
    R.magnet = 58 * (1 + p("magnet") * 0.5);
    R.crit = 0.06 + p("clam") * 0.07;
    R.xpMul = 1 + p("clam") * 0.1;
    R.area = 1 + p("bubble") * 0.12;
    R.regen = 0.6 + p("hull") * 0.25;
    R.storm = !!R.weapons.eel?.evolved;
    for (const [k, w] of Object.entries(R.weapons)) w.s = STAT[k](w.lv, w.evolved);
}

function apply(card) {
    R.upgrades++;
    if (card.kind === "new") R.weapons[card.key] = { lv: 1, t: 0.2, a: 0, pulse: 0, evolved: false, s: null };
    else if (card.kind === "up") R.weapons[card.key].lv++;
    else if (card.kind === "evo") { R.weapons[card.key].evolved = true; R.evolved.push(card.name); }
    else if (card.kind === "pas") { R.passives[card.key] = (R.passives[card.key] ?? 0) + 1; if (card.key === "hull") R.hp += 25; }
    else if (card.kind === "snack") R.hp = Math.min(R.maxHp, R.hp + 40);
    else if (card.kind === "gold") R.mightBonus *= 1.15;
    else if (card.kind === "tank") R.tanks++;
    recompute();
    if (card.kind === "tank") R.hp = R.maxHp;
    snd(card.kind === "evo" ? "evolve" : "pick", 0.1);
    if (card.kind === "evo") {
        const h = R.hero.pos;
        R.scene.flash("#ffe98a", 0.35);
        ringFx(h.x, h.y, 20, 240, 0.6, "#ffe98a", 10);
        banner(card.name.toUpperCase(), "EVOLVED", "#ffe98a");
    }
}

function openCards() {
    const s = R.scene, v = s.view, list = offers(), land = v.width > v.height;
    R.levels--;
    R.cards = [];
    R.cardSel = 1;
    R.cardT = 0;
    s.paused = true;
    const hint = !s.input.touchMode;
    const items = [];
    const dim = s.add([ui(), pos(v.width / 2, v.height / 2), { draw(d) { d.reset(); d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#071233", opacity: Math.min(0.72, R.cardT * 6) }); } }]);
    dim.layer = 50;
    items.push(dim);
    const gap = 10, w = land ? Math.min(190, (v.width - 48) / 3) : Math.min(336, v.width - 28), h = land ? 216 : 104;
    const total = land ? w * 3 + gap * 2 : h * 3 + gap * 2;
    const cx0 = land ? (v.width - total) / 2 + w / 2 : v.width / 2;
    const cy0 = land ? v.height / 2 + 26 : (v.height - total) / 2 + h / 2 + 22;
    const titleY = land ? cy0 - h / 2 - 28 : cy0 - h / 2 - 36;
    const title = s.add([text(R.bonus ? "TREASURE!" : "LEVEL UP!", { size: 28, bold: true, color: "#ffe98a", font: FONT }), pos(v.width / 2, titleY), ui(), { name: "cardTitle" }]);
    title.layer = 51;
    R.bonus = false;
    items.push(title);
    if (hint) {
        const k = s.add([text("Arrows and Enter, or keys 1 2 3", { size: 13, color: "#bff4ff", font: FONT }), pos(v.width / 2, land ? cy0 + h / 2 + 16 : cy0 + total - h / 2 + 18), ui(), { name: "cardHint" }]);
        k.layer = 51;
        items.push(k);
    }
    const choose = (i) => {
        if (R.cardT < 0.28 || !s.paused || !R.cards.length) return;
        apply(list[i]);
        R.hp = Math.min(R.maxHp, R.hp + 6); // Every level is a gulp of air.
        for (const e of items) e.destroy();
        R.cards = [];
        if (R.levels > 0) R.reopen = true;
        else s.paused = false;
    };
    list.forEach((c, i) => {
        const x = land ? cx0 + i * (w + gap) : cx0, y = land ? cy0 : cy0 + i * (h + gap);
        const gold = c.kind === "evo";
        const nameW = game.renderer.measureText(c.name, { size: 17, bold: true, font: FONT, align: "left", maxWidth: w - 104, lineHeight: 1.25 }).width;
        const descW = game.renderer.measureText(c.desc, { size: 13.5, bold: false, font: FONT, align: "left", maxWidth: w - 104, lineHeight: 1.22 }).width;
        const edge = gold ? "#ffd84d" : c.kind === "new" ? "#58e0ff" : c.kind === "pas" ? "#7dffcf" : "#eafcff";
        const e = s.add([button("", { action: "card" + (i + 1), width: w, height: h, color: gold ? "#5a3a12" : "#14305e", radius: 16, onTap: () => choose(i) }), pos(x, y), ui(), {
            name: "card" + (i + 1), card: c, born: i * 0.05,
            draw(d) {
                const sel = hint && R.cardSel === i;
                d.rect(w, h, { color: sel ? "#ffffff" : edge, radius: 16, outline: sel ? 4 : 2.5 });
                const iconX = land ? 0 : -w / 2 + 48, iconY = land ? -h / 2 + 52 : -2, size = land ? 72 : 66;
                d.sprite("icons", { frame: ICONS.at[c.icon], x: iconX, y: iconY, width: size, height: size });
                if (land) {
                    d.text(c.name, { x: 0, y: -4, size: 15, bold: true, color: gold ? "#ffe98a" : "#ffffff", font: FONT, align: "center", maxWidth: w - 16 });
                    d.text(c.desc, { x: 0, y: 44, size: 12.5, color: "#cfeaff", font: FONT, align: "center", maxWidth: w - 20 });
                } else {
                    const tx = -w / 2 + 92;
                    d.text(c.name, { x: tx + nameW / 2, y: -h / 2 + 24, size: 17, bold: true, color: gold ? "#ffe98a" : "#ffffff", font: FONT, align: "left", maxWidth: w - 104 });
                    d.text(c.desc, { x: tx + descW / 2, y: 8, size: 13.5, color: "#cfeaff", font: FONT, align: "left", maxWidth: w - 104, lineHeight: 1.22 });
                }
                if (c.max) {
                    const pipX = land ? -(c.max - 1) * 6 : -w / 2 + 96, pipY = land ? h / 2 - 14 : h / 2 - 11;
                    for (let k = 0; k < c.max; k++) d.circle(4, { x: pipX + k * 12, y: pipY, color: k < c.lv ? edge : "#ffffff30" });
                }
                if (c.tag) {
                    const tw = gold ? 84 : 42;
                    d.rect(tw, 18, { x: w / 2 - tw / 2 - 8, y: -h / 2 + 15, color: edge, radius: 9 });
                    d.text(c.tag, { x: w / 2 - tw / 2 - 8, y: -h / 2 + 15, size: 11, bold: true, color: "#0e1a3d", font: FONT });
                }
            },
            update(dt, me) {
                const u = Math.max(0, Math.min(1, (R.cardT - me.born) / 0.18));
                me.opacity = u;
                me.scale = me._pressed ? 0.96 : 0.86 + 0.14 * (1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2);
            },
        }]);
        e.layer = 52 + i;
        R.cards.push(e);
        items.push(e);
    });
    R.choose = choose;
    snd("level", 0.1);
    game.vibrate(15);
}

// --- Drawing -------------------------------------------------------------------------------------------

const so = { frame: 0, x: 0, y: 0, width: 0, height: 0, flipX: false, color: undefined, opacity: 1 };

function put(d, sheet, frame, x, y, w, h = w, flip = false, col = undefined, op = 1) {
    so.frame = frame; so.x = x; so.y = y; so.width = w; so.height = h; so.flipX = flip; so.color = col; so.opacity = op;
    d.sprite(sheet, so);
}

// Draw has no rotation, so write its private transform directly. See FRAMEWORK FEEDBACK.
function spin(d, sheet, frame, x, y, rot, w, h = w, col = undefined, op = 1) {
    const m = d.m, c = Math.cos(rot), s = Math.sin(rot);
    m[0] = c; m[1] = s; m[2] = -s; m[3] = c; m[4] = x; m[5] = y;
    put(d, sheet, frame, 0, 0, w, h, false, col, op);
    m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 1; m[4] = 0; m[5] = 0;
}

const hash = (a, b) => {
    let h = Math.imul(a, 374761393) + Math.imul(b, 668265263) | 0;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return (h ^ h >>> 16) >>> 0;
};

const lerpZone = (t) => {
    let i = 0;
    while (i + 1 < ZONES.length && t >= ZONES[i + 1].at) i++;
    const a = ZONES[i], b = ZONES[i + 1] ?? a, u = b === a ? 0 : Math.max(0, Math.min(1, (t - (b.at - 14)) / 14)), L = (x, y) => x + (y - x) * u;
    return { tint: [L(a.tint[0], b.tint[0]), L(a.tint[1], b.tint[1]), L(a.tint[2], b.tint[2])], dark: L(a.dark, b.dark), rays: L(a.rays, b.rays), caustic: L(a.caustic, b.caustic) };
};

const propLook = [["kelp0", 1.25], ["coral0", 1], ["kelp0", 1.25], ["rock", 1.1], ["shells", 0.7], ["coral1", 1], ["anemone0", 0.9], ["ribs", 1.5], ["chest", 0.9]];

function drawGround(d, cx, cy, v, z, time) {
    const T = 128, x0 = Math.floor((cx - v.width / 2 - 8) / T), y0 = Math.floor((cy - v.height / 2 - 8) / T);
    const nx = Math.ceil(v.width / T) + 2, ny = Math.ceil(v.height / T) + 2, tint = z.tint;
    for (let n = 0; n < 3; n++) {
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const a = x0 + i, b = y0 + j;
            if (hash(a, b) % 3 !== n) continue;
            put(d, "sand" + n, 0, (a + 0.5) * T, (b + 0.5) * T, T + 0.5, T + 0.5, false, tint);
        }
    }
    if (z.caustic > 0.01) {
        const C = 200, ox = time * 7, oy = time * 4.2, xa = Math.floor((cx - v.width / 2 - ox) / C), ya = Math.floor((cy - v.height / 2 - oy) / C);
        for (let j = 0; j <= Math.ceil(v.height / C) + 1; j++) for (let i = 0; i <= Math.ceil(v.width / C) + 1; i++) {
            put(d, "caustic", 0, (xa + i + 0.5) * C + ox, (ya + j + 0.5) * C + oy, C + 0.5, C + 0.5, false, "#d8fff4", z.caustic);
        }
    }
    // Props sit on a sparse grid, placed by hash, tinted down so they stay behind the action.
    const S = 170, px0 = Math.floor((cx - v.width / 2 - 90) / S), py0 = Math.floor((cy - v.height / 2 - 90) / S);
    const prop = [tint[0] * 1.2, tint[1] * 1.2, tint[2] * 1.2];
    for (let pass = 0; pass < 2; pass++) for (let j = 0; j <= Math.ceil(v.height / S) + 2; j++) for (let i = 0; i <= Math.ceil(v.width / S) + 2; i++) {
        const a = px0 + i, b = py0 + j, h = hash(a * 7 + 3, b * 13 + 1);
        if (h % 100 > 44) continue;
        const [name, sc] = propLook[(h >>> 8) % propLook.length];
        let f = PROPS.at[name];
        if (name === "kelp0" || name === "anemone0") f += Math.floor(time * 1.6 + (h % 7)) % 2;
        const x = (a + 0.2 + ((h >>> 12) % 60) / 100) * S, y = (b + 0.2 + ((h >>> 20) % 60) / 100) * S, size = 72 * sc;
        if (pass === 0) put(d, "fx", F.shadow, x, y + size * 0.42, size * 0.8, size * 0.22, false, undefined, 0.3);
        else put(d, "props", f, x, y, size, size, (h >>> 3) % 2 === 0, prop);
    }
}

function drawDark(d, x, y, v, alpha) {
    if (alpha < 0.02) return;
    const size = Math.max(v.width, v.height) * 2.3;
    put(d, "dark", 0, x, y, size, size, false, "#040a24", alpha);
}

function drawRays(d, cx, cy, v, time, a) {
    if (a < 0.02) return;
    for (let i = 0; i < 4; i++) {
        const u = (i + 0.5) / 4, sway = Math.sin(time * 0.3 + i * 2) * 26;
        spin(d, "ray", 0, cx - v.width / 2 + u * v.width + sway, cy - v.height * 0.24, 0.32, 58 + i * 16, v.height * 1.1, undefined, a * (0.22 + 0.12 * Math.sin(time * 0.7 + i * 1.7)));
    }
}

function drawSwarm(d, alpha) {
    const cam = R.scene.cam.pos, v = R.scene.view, mx = v.width / 2 + 70, my = v.height / 2 + 70;
    const h = R.hero, hxx = h._prevPos.x + (h.pos.x - h._prevPos.x) * alpha, hyy = h._prevPos.y + (h.pos.y - h._prevPos.y) * alpha;
    // Rebuild, then insertion sort by y: the list barely changes between frames.
    let n = 0;
    for (let k = 0; k < R.orderN; k++) {
        const i = order[k];
        if (i === MAXE || (ealive[i] && R.inOrder[i] === euid[i])) order[n++] = i;
    }
    for (let i = 0; i < R.top; i++) {
        if (ealive[i] && R.inOrder[i] !== euid[i]) { R.inOrder[i] = euid[i]; order[n++] = i; }
    }
    R.orderN = n;
    const yOf = (i) => i === MAXE ? hyy + 4 : ey[i] + er[i] * 0.4;
    for (let a = 1; a < n; a++) {
        const it = order[a], y = yOf(it);
        let b = a - 1;
        while (b >= 0 && yOf(order[b]) > y) { order[b + 1] = order[b]; b--; }
        order[b + 1] = it;
    }
    // Contact shadows first, so they all sit under every fish, in one batch.
    let drawn = 0;
    for (let k = 0; k < n; k++) {
        const i = order[k];
        if (i === MAXE) { put(d, "fx", F.shadow, hxx, hyy + 21, 38, 14, false, undefined, 0.6); continue; }
        const x = epx[i] + (ex[i] - epx[i]) * alpha, y = epy[i] + (ey[i] - epy[i]) * alpha;
        if (Math.abs(x - cam.x) > mx + er[i] * 2 || Math.abs(y - cam.y) > my + er[i] * 2) continue;
        const T = TYPES[etype[i]];
        put(d, "fx", F.shadow, x, y + T.size * 0.42, T.size * 0.92, T.size * 0.32, false, undefined, 0.5);
    }
    for (let k = 0; k < n; k++) {
        const i = order[k];
        if (i === MAXE) continue;
        const x = epx[i] + (ex[i] - epx[i]) * alpha, y = epy[i] + (ey[i] - epy[i]) * alpha, type = etype[i];
        if (Math.abs(x - cam.x) > mx + er[i] * 2 || Math.abs(y - cam.y) > my + er[i] * 2) continue;
        drawn++;
        const T = TYPES[type], flash = eflash[i] > 0;
        let size = T.size * Math.min(1, 0.4 + eborn[i] * 5);
        if (flash) size *= 1.1;
        const cyc = [0, 1, 2, 1][Math.floor(eanim[i]) & 3];
        if (type === KRAKEN) {
            const f = Math.floor(eanim[i] * 0.6) & 3, wobble = Math.sin(eanim[i] * 0.3) * 6;
            if (estate[i] === 2) d.circle(70, { x, y, color: "#ff4d5e", opacity: 0.2 + 0.2 * Math.sin(eanim[i] * 3) });
            put(d, "kraken", flash ? f + 4 : f, x, y + wobble, T.size * 1.08, T.size * 1.08);
        } else if (type === ANGLER) {
            put(d, "fx", F.glow, x + (eflip[i] ? -34 : 34), y - 26, 80, 80, false, "#ffe98a", 0.5);
            put(d, "angler", flash ? cyc + 3 : cyc, x, y, size, size, !!eflip[i]);
        } else {
            let f = T.base + cyc;
            if (type === PUFFER) {
                f = estate[i] === 1 ? T.base + 2 : T.base + (cyc & 1);
                if (estate[i] === 1) size *= 1 + (0.9 - etimer[i]) * 0.5;
            }
            if (type === EEL && estate[i] === 1) {
                // Telegraph: a red streak where it will strike.
                const u = 1 - etimer[i] / 0.55;
                d.line([x, y], [x + edx[i] * 130 * u, y + edy[i] * 130 * u], { width: 2.5, color: "#ff8aa0", opacity: 0.4 });
            }
            put(d, "mobs", flash ? f + 3 : f, x, y, size, size, !!eflip[i], eshock[i] > 0 && !flash ? "#fff6a8" : undefined);
        }
    }
    R.drawn = drawn;
}

function drawHero(d, x, y) {
    if (R.dying && R.endT < 1) return;
    if (R.iframes > 0 && Math.floor(R.iframes * 18) % 2 === 1) return;
    const f = Math.floor(R.swim) & 3, bob = Math.sin(R.swim * 1.6) * 1.2;
    put(d, "hero", R.heroFlash > 0 ? f + 4 : f, x, y + bob - 2, 48, 48, R.flip);
}

function drawWorld(d) {
    const s = R.scene, v = s.view, alpha = s.paused ? 1 : game._alpha ?? 1, cam = s.cam.pos, time = R.visT;
    const z = lerpZone(R.t), h = R.hero;
    const hx = h._prevPos.x + (h.pos.x - h._prevPos.x) * alpha, hy = h._prevPos.y + (h.pos.y - h._prevPos.y) * alpha;
    drawGround(d, cam.x, cam.y, v, z, time);
    drawDark(d, hx, hy, v, z.dark);
    put(d, "fx", F.glow, hx, hy + 4, 200, 200, false, "#ffe9b0", 0.16 + z.dark * 0.14);

    // Sonar sits on the floor, under everything.
    const son = R.weapons.sonar;
    if (son) {
        const r = son.s.r * R.area, col = son.evolved ? "#ffe98a" : "#7dffcf";
        d.circle(r, { x: hx, y: hy, color: col, opacity: 0.09 });
        d.circle(r, { x: hx, y: hy, color: col, outline: 2.5, opacity: 0.55 });
        for (let k = 0; k < 2; k++) {
            const u = (son.pulse + k / 2) % 1;
            d.circle(Math.max(1, r * u), { x: hx, y: hy, color: col, outline: 2, opacity: 0.32 * (1 - u) });
        }
    }
    for (const w of R.whirls) {
        const g = Math.max(0, Math.min(1, w.t / 0.3) * Math.min(1, (w.dur - w.t) / 0.3)), r = Math.max(1, w.r * g);
        d.circle(r, { x: w.x, y: w.y, color: "#0a2a66", opacity: 0.42 });
        spin(d, "fx", F.swirl, w.x, w.y, -w.t * 6, r * 2.1, r * 2.1, "#bff4ff", 0.85);
        spin(d, "fx", F.swirl, w.x, w.y, -w.t * 9 + 1, r * 1.3, r * 1.3, "#ffffff", 0.7);
    }
    // Pearls and pickups.
    const cx0 = cam.x - v.width / 2 - 20, cx1 = cam.x + v.width / 2 + 20, cy0 = cam.y - v.height / 2 - 20, cy1 = cam.y + v.height / 2 + 20;
    for (let i = 0; i < MAXP; i++) {
        if (!pon[i] || px[i] < cx0 || px[i] > cx1 || py[i] < cy0 || py[i] > cy1) continue;
        const k = pkind[i];
        put(d, "fx", F.pearl0 + k, px[i], py[i], 15 + k * 4);
    }
    for (const q of R.drops) {
        const b = Math.sin(time * 4 + q.x) * 2, fr = q.kind === "heart" ? F.heart : q.kind === "vacuum" ? F.vacuum : F.clam0;
        put(d, "fx", F.glow, q.x, q.y, 70, 70, false, "#ffe98a", 0.5 + 0.2 * Math.sin(time * 5));
        put(d, "fx", fr, q.x, q.y + b, q.kind === "clam" ? 40 : 30);
    }
    for (const m of R.mines) {
        const blink = m.t > 0.3 && Math.floor(m.t * 9) % 2 === 0;
        const u = Math.min(1, m.t / 0.3), hop = Math.sin(u * Math.PI) * 26;
        if (m.t > 0.3) d.circle(m.S.r * R.area, { x: m.cx, y: m.cy, color: "#ff6b5e", outline: 2, opacity: 0.32 });
        put(d, "fx", F.shadow, m.cx, m.cy + 10, 26, 10, false, undefined, 0.5);
        put(d, "fx", blink ? F.mine1 : F.mine0, m.cx, m.cy - hop, 26);
    }
    drawSwarm(d, alpha);

    // Orbiters go over the swarm, so the blender is always readable.
    const raz = R.weapons.razor;
    if (raz) {
        const S = raz.s, rings = S.shark ? 2 : 1;
        for (let ring = 0; ring < rings; ring++) {
            const rad = (S.r + ring * 46) * R.area, dir = ring ? -0.8 : 1;
            for (let k = 0; k < S.n; k++) {
                const a = raz.a * dir + k / S.n * 6.283 + ring * 0.4, x = hx + Math.cos(a) * rad, y = hy + Math.sin(a) * rad;
                spin(d, "fx", S.shark ? F.shark : F.razor, x, y, a + (dir > 0 ? 1.57 : -1.57), S.shark ? 40 : 30);
            }
        }
    }
    for (const p of R.shots) {
        const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha;
        if (p.kind === "ink") put(d, "fx", F.inkblob, x, y, p.size * 1.4);
        else if (p.kind === "spine") spin(d, "fx", F.spine, x, y, p.rot, p.size + 6);
        else spin(d, "fx", F[p.kind] ?? F.harpoon, x, y, Math.atan2(p.vy, p.vx), p.size);
    }
    for (const w of R.waves) {
        if (w.ring) {
            const op = Math.max(0, 1 - w.t);
            d.circle(w.r, { x: hx, y: hy, color: "#eafcff", outline: 12, opacity: op * 0.85 });
            d.circle(Math.max(1, w.r - 8), { x: hx, y: hy, color: "#58e0ff", outline: 16, opacity: op * 0.5 });
        } else {
            const op = Math.min(1, (0.85 - w.t) * 4), size = 192 * w.w;
            spin(d, "fx", F.wave, w.cx ?? w.x, w.cy ?? w.y, Math.atan2(w.dy, w.dx), size * 0.75, size, "#eafcff", op);
        }
    }
    for (const q of R.flashes) {
        const u = q.t / 0.16;
        d.circle(q.r * (0.7 + u * 0.3), { x: q.x, y: q.y, color: "#fff6c8", opacity: (1 - u) * (1 - u) * 0.42 });
    }
    for (const q of R.rings) {
        const u = q.t / q.life, ease = 1 - (1 - u) * (1 - u);
        d.circle(q.r0 + (q.r1 - q.r0) * ease, { x: q.x, y: q.y, color: q.col, outline: Math.max(1, q.width * (1 - u)), opacity: 1 - u });
    }
    for (const a of R.arcs) {
        const op = Math.max(0, 1 - a.t / 0.17), p = a.pts;
        for (let k = 0; k + 3 < p.length; k += 2) {
            d.line([p[k], p[k + 1]], [p[k + 2], p[k + 3]], { width: 6, color: a.col, opacity: op * 0.55 });
            d.line([p[k], p[k + 1]], [p[k + 2], p[k + 3]], { width: 2.4, color: "#ffffff", opacity: op });
        }
    }
    for (const q of R.pops) {
        if (q.type >= ANGLER) continue;
        const u = q.t / 0.1, T = TYPES[q.type], size = T.size * (1 + u * 0.3);
        put(d, "mobs", T.base + 3, q.x, q.y, size, size, !!q.flip, undefined, (1 - u) * 0.75);
    }
    for (let i = 0; i < MAXF; i++) {
        if (flife[i] <= 0) continue;
        const k = flife[i] / fmax[i], size = fsize[i] * (fframe[i] === F.bubble ? 1 : 0.4 + k * 0.6);
        if (fspin[i]) spin(d, "fx", fframe[i], fx[i], fy[i], frot[i], size, size, fcol[i], Math.min(1, k * 2.2));
        else put(d, "fx", fframe[i], fx[i], fy[i], size, size, false, fcol[i], Math.min(1, k * 2.2));
    }
    drawHero(d, hx, hy);
    drawNumbers(d);
    // Hero air bar.
    const bw = 34, by = hy + 28, pct = R.hp / R.maxHp;
    d.rect(bw + 4, 7, { x: hx, y: by, color: "#0e1a3d", radius: 3.5 });
    d.rect(Math.max(0.1, bw * pct), 3.5, { x: hx - bw / 2 + bw * pct / 2, y: by, color: pct > 0.35 ? "#7dffcf" : "#ff5e6c", radius: 1.7 });
    drawRays(d, cam.x, cam.y, v, time, z.rays);
    // Marine snow drifts over everything and sells the water.
    for (let i = 0; i < 26; i++) {
        const h2 = hash(i, 77), W = v.width + 40, H = v.height + 40;
        const x = ((h2 % 997) / 997 * W + time * (6 + i % 5) - cam.x * 0.25) % W, y = (((h2 >>> 10) % 991) / 991 * H + time * 13 - cam.y * 0.25) % H;
        put(d, "fx", F.dot, cam.x - v.width / 2 - 20 + (x + W) % W, cam.y - v.height / 2 - 20 + (y + H) % H, 2 + (i % 3), 2 + (i % 3), false, "#dff8ff", 0.34);
    }
}

function drawNumbers(d) {
    for (const n of R.nums) {
        const u = n.t / 0.62, pop = n.t < 0.08 ? 1.4 - n.t * 5 : 1;
        const size = (n.crit ? 19 : 13.5) * pop, col = n.hurt ? "#ff6b6b" : n.crit ? "#ffd84d" : "#ffffff";
        const str = n.s, adv = size * 0.74;
        const y = n.y - (1 - (1 - u) * (1 - u)) * 26, op = Math.min(1, (1 - u) * 3);
        let x = n.x - (str.length - 1) * adv / 2;
        for (let k = 0; k < str.length; k++) {
            put(d, "fx", F.d0 + str.charCodeAt(k) - 48, x, y, size, size, false, col, op);
            x += adv;
        }
    }
}

function drawHud(d) {
    const s = R.scene, v = s.view, top = v.safe.top + 6, w = v.width - v.safe.left - v.safe.right - 24, x0 = v.safe.left + 12;
    d.reset();
    if (R.hurtFx > 0) put(d, "dark", 0, v.width / 2, v.height / 2, Math.max(v.width, v.height) * 1.7, Math.max(v.width, v.height) * 1.7, false, "#ff2040", R.hurtFx);
    const low = R.hp / R.maxHp;
    if (low < 0.3 && !R.dying) put(d, "dark", 0, v.width / 2, v.height / 2, Math.max(v.width, v.height) * 1.9, Math.max(v.width, v.height) * 1.9, false, "#ff2040", (0.3 - low) * 1.6 * (0.7 + 0.3 * Math.sin(R.visT * 6)));
    put(d, "fx", F.shadow, v.width / 2, top - 6, v.width * 1.5, 150, false, undefined, 0.55);
    // XP bar.
    d.rect(w, 15, { x: x0 + w / 2, y: top + 8, color: "#0e1a3dcc", radius: 7.5 });
    const pct = R.xp / R.need;
    if (pct > 0.01) {
        const b = Math.max(12, (w - 5) * pct);
        d.rect(b, 10, { x: x0 + 2.5 + b / 2, y: top + 8, color: "#58e0ff", radius: 5 });
        d.rect(Math.max(6, b - 8), 2.5, { x: x0 + 2.5 + b / 2, y: top + 6, color: "#ffffff", radius: 1.2, opacity: 0.55 });
    }
    d.text(`Lv ${R.lv}`, { x: x0 + 22, y: top + 8.5, size: 11, bold: true, color: "#ffffff", font: FONT });
    // Weapons and passives.
    let x = x0 + 10;
    const y = top + 31;
    for (const [k, w2] of Object.entries(R.weapons)) {
        const W = WEAPONS[k];
        put(d, "icons", ICONS.at[w2.evolved ? W.evo.icon : W.icon], x, y, 24);
        x += 25;
    }
    x += 3;
    for (const k of Object.keys(R.passives)) { put(d, "icons", ICONS.at[PASSIVES[k].icon], x, y + 0.5, 18); x += 19; }
    // Boss bar.
    if (R.boss >= 0 && ealive[R.boss]) {
        const b = R.boss, bw = Math.min(300, v.width - 40), by = top + 62, p = Math.max(0, ehp[b] / emax[b]);
        d.rect(bw + 6, 17, { x: v.width / 2, y: by, color: "#0e1a3d", radius: 8 });
        d.rect(Math.max(1, bw * p), 11, { x: v.width / 2 - bw / 2 + bw * p / 2, y: by, color: "#ff4d7a", radius: 5 });
        d.text("OLD MOTHER UNDERTOW", { x: v.width / 2, y: by + 18, size: 12, bold: true, color: "#ffd0dc", font: FONT });
    }
}

// --- Scenes -----------------------------------------------------------------------------------------------

function newRun(s) {
    const hero = s.add([pos(0, 0), { name: "hero" }]);
    const v = s.view;
    gw = Math.ceil((v.width + 560) / CELL);
    gh = Math.ceil((v.height + 560) / CELL);
    head = new Int16Array(gw * gh);
    ealive.fill(0); pon.fill(0); flife.fill(0);
    R = {
        scene: s, hero, rng: game.rng, t: 0, visT: 0, step: 0, top: 0, free: [], alive: 0, uid: 0, kills: 0, peak: 0, drawn: 0,
        hp: 100, maxHp: 100, lv: 1, xp: 0, need: xpNeed(1), levels: 0, reopen: false, bonus: false, upgrades: 0, god: false, noLevel: false,
        vx: 0, vy: 0, flip: false, swim: 0, iframes: 0, heroFlash: 0, hurtFx: 0, trail: 0, lastDir: [1, 0], dying: false, won: false, endT: 0,
        might: 1, mightBonus: 1, speed: 120, armor: 0, cool: 1, magnet: 58, crit: 0.06, xpMul: 1, area: 1, regen: 0.6, storm: false, stormQ: [],
        weapons: { harpoon: { lv: 1, t: 0.4, a: 0, pulse: 0, evolved: false, s: null } }, passives: {}, evolved: [], dmg: {}, hurtBy: {},
        spawnAcc: 0, eventAt: 0, zone: -1, boss: -1, bossT: 0, bossShot: 0, bossStage: 0, tanks: 0, numGap: 0, slowT: 0, nextMilestone: 0, waveId: 0, shakeNow: 0, vacuum: 0, fNext: 0, streak: 0, blipAt: -9,
        shots: [], mines: [], whirls: [], waves: [], rings: [], arcs: [], nums: [], pops: [], drops: [], flashes: [], cards: [], cardT: 0, cardSel: 1, choose: null,
        pearls: 0, orderN: 1, inOrder: new Int32Array(MAXE), chain: new Set(),
    };
    order[0] = MAXE; // The hero's slot in the sort.
    recompute();
}

/** For the bot and for screenshots: read-only views of the sim, plus a warp to any moment of a run. */
globalThis.__deep = {
    get R() { return R; }, boss: () => (R.boss >= 0 ? ehp[R.boss] / emax[R.boss] : 0), ex, ey, ealive, er, etype, estate, px, py, pon, TYPES, WEAPONS, PASSIVES, RUN, STAT,
    warp(t, weapons = { harpoon: 5, razor: 5, eel: 4, torpedo: 4, sonar: 3 }, passives = { whet: 3, gear: 2 }) {
        if (typeof location !== "undefined" && !location.search.includes("paused")) return; // tooling only, never in real play
        R.t = t; R.god = true; R.noLevel = true; R.lv = Math.round(t / 11) + 1; R.kills = Math.round(t * t / 60);
        R.eventAt = EVENTS.findIndex((e) => e.at > t);
        if (R.eventAt < 0) R.eventAt = EVENTS.length;
        for (const [k, l] of Object.entries(weapons)) R.weapons[k] = { lv: Math.min(l, 5), evolved: l > 5, t: 0, a: 0, pulse: 0, s: null };
        Object.assign(R.passives, passives);
        recompute();
        const want = curve(CROWD, t), v = R.scene.view;
        for (let k = 0; k < want; k++) {
            const a = R.rng.next() * 6.283, d = 70 + R.rng.next() * Math.max(v.width, v.height) * 0.6;
            spawn(pickType(), Math.cos(a) * d, Math.sin(a) * d);
        }
    },
};

function publish() {
    const d = game.data;
    d.time = Math.round(R.t * 10) / 10;
    d.depth = Math.round(R.t / RUN.bossAt * 3000);
    d.zone = ZONES[Math.max(0, R.zone)].name;
    d.hp = Math.ceil(R.hp);
    d.maxHp = R.maxHp;
    d.level = R.lv;
    d.kills = R.kills;
    d.enemies = R.alive;
    d.peakEnemies = R.peak;
    d.pearls = R.pearls;
    d.weapons = Object.fromEntries(Object.entries(R.weapons).map(([k, w]) => [k, w.evolved ? "EVOLVED" : w.lv]));
    d.passives = { ...R.passives };
    d.bossHp = R.boss >= 0 ? Math.ceil(ehp[R.boss]) : null;
    d.cardsOpen = R.cards.map((c) => c.card.name);
    d.won = R.won;
}

function finish() {
    const best = loadBest(), t = R.t, fresh = t > best.time;
    best.time = Math.max(best.time, t);
    best.kills = Math.max(best.kills, R.kills);
    best.runs++;
    if (R.won) { best.wins++; if (!best.fastest || t < best.fastest) best.fastest = t; }
    game.save(SAVE, best);
    publish();
    const weapons = Object.entries(R.weapons).map(([k, w]) => ({ key: k, icon: w.evolved ? WEAPONS[k].evo.icon : WEAPONS[k].icon, name: w.evolved ? WEAPONS[k].evo.name : WEAPONS[k].name, dmg: R.dmg[k] ?? 0 })).sort((a, b) => b.dmg - a.dmg);
    game.go("over", { won: R.won, time: t, level: R.lv, kills: R.kills, weapons, fresh, best, depth: Math.min(3000, Math.round(t / RUN.bossAt * 3000)) }, { fade: 0.5 });
}

function stepFx(dt) {
    for (let i = 0; i < MAXF; i++) {
        if (flife[i] <= 0) continue;
        flife[i] -= dt;
        const k = Math.exp(-fdrag[i] * dt);
        fvx[i] *= k; fvy[i] *= k; fvy[i] += fgrav[i] * dt;
        fx[i] += fvx[i] * dt; fy[i] += fvy[i] * dt; frot[i] += fspin[i] * dt;
    }
    let w = 0;
    const list = R.rings;
    for (let k = 0; k < list.length; k++) { const q = list[k]; q.t += dt; if (q.t < q.life) list[w++] = q; }
    list.length = w;
    for (const [arr, max] of [[R.arcs, 0.17], [R.pops, 0.1], [R.flashes, 0.16], [R.nums, 0.62]]) {
        w = 0;
        for (let k = 0; k < arr.length; k++) { const q = arr[k]; q.t += dt; if (q.t < max) arr[w++] = q; }
        arr.length = w;
    }
}

game.scene("play", (s) => {
    newRun(s);
    const v = s.view, portrait = v.height > v.width;
    s.background = "#0c2a4d";
    s.cam.follow(R.hero, { speed: 12, offset: [0, portrait ? v.height * 0.07 : 0] });

    s.add([{ name: "world", draw: (d) => drawWorld(d) }]);
    const hud = s.add([ui(), pos(v.width / 2, s.view.height / 2), { name: "hud", draw: (d) => drawHud(d) }]);
    hud.layer = 10;

    const timer = s.add([text("0:00", { size: 19, bold: true, color: "#ffffff", font: FONT }), pin("top-right", [58, 24]), { name: "timer" }]);
    const killText = s.add([text("0", { size: 14, bold: true, color: "#cfeaff", font: FONT, align: "right" }), pin("top-right", [58, 46]), { name: "killText" }]);
    const pauseBtn = s.add([button("II", { action: "pause", width: 46, height: 46, color: "#14305ecc", textSize: 14, radius: 23, onTap: () => togglePause() }), pin("top-right", [8, 22]), { name: "pauseButton" }]);
    timer.layer = killText.layer = pauseBtn.layer = 11;
    let overlay = null;

    function togglePause() {
        if (R.cards.length || R.dying || R.won) return;
        if (s.paused) {
            s.paused = false;
            for (const e of overlay) e.destroy();
            overlay = null;
            return;
        }
        s.paused = true;
        const dim = s.add([ui(), pos(v.width / 2, v.height / 2), { draw(d) { d.reset(); d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#071233", opacity: 0.74 }); } }]);
        dim.layer = 40;
        const t = s.add([text("PAUSED", { size: 30, bold: true, color: "#ffe98a", font: FONT }), pos(v.width / 2, v.height / 2 - 92), ui()]);
        const list = s.add([text(`Level ${R.lv}   ${R.kills} fish   ${clock(R.t)}`, { size: 15, bold: true, color: "#cfeaff", font: FONT }), pos(v.width / 2, v.height / 2 - 56), ui()]);
        const go = s.add([button("Keep diving", { action: "confirm", width: 220, height: 56, color: "#2b9fc4", textSize: 19, radius: 28, onTap: () => togglePause() }), pos(v.width / 2, v.height / 2 + 4), ui()]);
        const quit = s.add([button("Give up", { width: 160, height: 50, color: "#5a2f5e", textSize: 16, radius: 25, onTap: () => { s.paused = false; game.stopMusic(); game.go("title", {}, { fade: 0.3 }); } }), pos(v.width / 2, v.height / 2 + 70), ui()]);
        for (const e of [t, list, go, quit]) e.layer = 41;
        overlay = [dim, t, list, go, quit];
    }

    // Runs while paused too, because it is a ui entity.
    s.add([ui(), pos(v.width / 2, v.height / 2), { name: "cardKeys", update(dt) {
        timer.hidden = killText.hidden = pauseBtn.hidden = s.paused;
        if (R.cards.length) {
            R.cardT += dt;
            const inp = s.input, land = v.width > v.height;
            if (inp.pressed(land ? "left" : "up")) R.cardSel = (R.cardSel + 2) % 3;
            if (inp.pressed(land ? "right" : "down")) R.cardSel = (R.cardSel + 1) % 3;
            if (inp.pressed("confirm")) R.choose(R.cardSel);
        } else if (R.reopen) {
            R.reopen = false;
            openCards();
        }
    } }]);

    s.onUpdate((dt) => {
        R.step++;
        R.visT += dt;
        R.numGap -= dt;
        if (R.levels > 0 && !R.dying && !R.won && !R.cards.length) { openCards(); return; }
        if (R.endT > 0) {
            R.endT -= dt;
            if (R.endT <= 0) { finish(); return; }
        }
        const going = !R.dying && !R.won;
        R.slowT -= dt;
        const sdt = R.dying ? dt * 0.4 : R.slowT > 0 ? dt * 0.25 : dt;
        if (going) { R.t += dt; director(sdt); }
        stepHero(sdt);
        stepEnemies(sdt);
        if (going) {
            for (const k in R.weapons) fireWeapon(k, R.weapons[k], sdt);
            stepWorldWeapons(sdt);
        }
        stepShots(sdt);
        stepPearls(sdt);
        stepFx(sdt);
        if (R.alive > R.peak) R.peak = R.alive;
        if (R.step % 12 === 0) {
            timer.text = clock(R.t);
            killText.text = `${R.kills}`;
        }
        if (R.step % 30 === 0) publish();
        if (s.shakeLeft <= 0) R.shakeNow = 0;
    });
    publish();
});

/** A chunkier button: Pogo's button with no label, plus a gloss and our font on top. */
function bigButton(s, label, o, comps) {
    const w = o.width, h = o.height, size = o.textSize ?? 20;
    return s.add([button("", { ...o, textSize: size }), ...comps, { draw(d) {
        d.rect(w - 14, h * 0.32, { y: -h * 0.27, color: "#ffffff", radius: h * 0.16, opacity: 0.22 });
        d.text(label, { y: 2.5, size, bold: true, color: "#0e1a3d", font: FONT, opacity: 0.45 });
        d.text(label, { size, bold: true, color: "#ffffff", font: FONT });
        d.rect(w, h, { color: "#0e1a3d", radius: o.radius ?? 14, outline: 3 });
    } }]);
}

// --- Title -----------------------------------------------------------------------------------------------

function backdrop(s, tint, dark, fishAlpha = 1) {
    const fish = [], v = s.view, rng = game.fxRng;
    const kinds = ["grump", "grump", "jelly", "crab", "inkling", "grump", "bonefish", "eel", "puffer"];
    for (let i = 0; i < 18; i++) {
        const base = MOBS.at[kinds[i % kinds.length]], depth = 0.5 + rng.next() * 0.7;
        fish.push({ base, x: rng.next() * v.width, y: 60 + rng.next() * (v.height - 80), v: (16 + rng.next() * 32) * (i % 2 ? 1 : -1), s: 34 * depth, t: rng.next() * 3, op: (0.55 + depth * 0.3) * fishAlpha });
    }
    fish.sort((a, b) => a.s - b.s);
    let time = 0;
    s.add([{ name: "backdrop",
        update(dt) {
            time += dt;
            for (const f of fish) {
                f.x += f.v * dt; f.t += dt * 6;
                if (f.x < -50) f.x = v.width + 50;
                if (f.x > v.width + 50) f.x = -50;
            }
        },
        draw(d) {
            const z = { tint, dark, caustic: 0.16 }, cx = v.width / 2, cy = v.height / 2;
            drawGround(d, cx, cy, v, z, time);
            drawDark(d, cx, cy * 0.92, v, dark);
            for (const f of fish) put(d, "mobs", f.base + [0, 1, 2, 1][Math.floor(f.t) & 3], f.x, f.y + Math.sin(f.t * 0.5) * 6, f.s, f.s, f.v < 0, undefined, f.op);
            drawRays(d, cx, cy, v, time, 0.8);
        } }]);
    return { get time() { return time; } };
}

game.scene("title", (s) => {
    const v = s.view, land = v.width > v.height, best = loadBest();
    const bg = backdrop(s, [0.42, 0.78, 0.86], 0.42);
    const logoW = Math.min(v.width - 16, land ? 400 : 344), logoH = logoW * 300 / 720;
    const logoY = land ? v.safe.top + logoH / 2 + 6 : Math.max(v.height * 0.22, v.safe.top + logoH / 2 + 8);
    s.add([ui(), pos(v.width / 2, v.height / 2), { name: "logo", draw(d) {
        d.reset();
        const t = bg.time;
        put(d, "logo", 0, v.width / 2, logoY + Math.sin(t * 1.3) * 4, logoW, logoH);
        const hy = land ? logoY + logoH / 2 + 38 : v.height * 0.5, hs = land ? 72 : 92;
        put(d, "fx", F.glow, v.width / 2, hy, hs * 2.1, hs * 2.1, false, "#fff3b0", 0.32);
        put(d, "hero", Math.floor(t * 5) & 3, v.width / 2, hy + Math.sin(t * 2) * 6, hs, hs);
    } }]);
    const playY = land ? v.height - v.safe.bottom - 76 : v.height * 0.72;
    bigButton(s, "DIVE", { action: "confirm", width: 200, height: 66, color: "#ff6b5e", textSize: 30, radius: 33, onTap: () => { game.sfx(TONES.pick); game.go("play", {}, { fade: 0.35 }); } }, [pos(v.width / 2, playY), ui(), { name: "playButton" }]);
    const lines = best.runs
        ? `Deepest dive ${clock(best.time)}   ${best.wins ? `Wins ${best.wins}, fastest ${clock(best.fastest)}` : "She still waits"}`
        : (s.input.touchMode ? "Drag anywhere to swim. The rest is automatic." : "Arrows or WASD to swim. The rest is automatic.");
    const hint = s.add([text(lines, { size: 14, bold: true, color: "#eafcff", font: FONT, align: "center", maxWidth: v.width - 56 }), pos(v.width / 2, playY + 62), ui(), { name: "hint" }]);
    const pill = s.add([ui(), pos(v.width / 2, playY + 62), { name: "hintPill", draw(d) { d.rect(hint.size.x + 28, hint.size.y + 14, { color: "#0e1a3d", radius: 14, opacity: 0.72 }); } }]);
    pill.layer = -1;
});

// --- Run summary ------------------------------------------------------------------------------------------

game.scene("over", (s, a) => {
    const v = s.view, land = v.width > v.height;
    backdrop(s, a.won ? [0.42, 0.78, 0.86] : [0.24, 0.17, 0.48], a.won ? 0.34 : 0.8, 0.4);
    if (a.won) { game.music(SONGS[0]); game.sfx("win"); } else game.stopMusic();
    const w = Math.min(336, v.width - 28);
    const total = a.weapons.reduce((n, q) => n + q.dmg, 0) || 1;
    const top = land ? v.safe.top + 8 : Math.max(v.safe.top + 18, v.height * 0.1);
    const col = a.won ? "#ffe98a" : "#ff9a8a";
    s.add([text(a.won ? "YOU SURFACED!" : "OUT OF AIR", { size: 32, bold: true, color: col, font: FONT }), pos(v.width / 2, top + 22), ui(), { name: "headline" }]);
    s.add([text(a.won ? "Old Mother Undertow sleeps" : `Lost at ${a.depth} m`, { size: 15, bold: true, color: "#eafcff", font: FONT }), pos(v.width / 2, top + 52), ui(), { name: "sub" }]);
    for (const q of a.weapons) q.w = game.renderer.measureText(q.name, { size: 13, bold: true, font: FONT, align: "left", maxWidth: 170, lineHeight: 1.25 }).width;
    const px0 = v.width / 2, panelY = top + 74, rowH = land ? 24 : 30, n = Math.min(a.weapons.length, land ? 3 : 5);
    const panelH = (land ? 76 : 92) + rowH * n;
    s.add([ui(), pos(v.width / 2, v.height / 2), { name: "panel", draw(d) {
        d.reset();
        d.rect(w, panelH, { x: px0, y: panelY + panelH / 2, color: "#0e1a3dd9", radius: 18 });
        d.rect(w, panelH, { x: px0, y: panelY + panelH / 2, color: col, radius: 18, outline: 2, opacity: 0.6 });
        [[clock(a.time), "time"], [`${a.level}`, "level"], [`${a.kills}`, "fish"]].forEach(([big, label], i) => {
            const x = px0 + (i - 1) * (w / 3);
            d.text(big, { x, y: panelY + 26, size: 25, bold: true, color: "#ffffff", font: FONT });
            d.text(label, { x, y: panelY + 49, size: 12.5, color: "#a8d8f0", font: FONT });
        });
        a.weapons.slice(0, n).forEach((q, i) => {
            const y = panelY + (land ? 62 : 76) + i * rowH + rowH / 2, bw = w - 104, x0 = px0 - w / 2 + 44;
            put(d, "icons", ICONS.at[q.icon], px0 - w / 2 + 25, y + 1, rowH - 3);
            const frac = Math.max(0.02, q.dmg / (a.weapons[0].dmg || 1));
            d.rect(bw, 6, { x: x0 + bw / 2, y: y + 9, color: "#ffffff18", radius: 3 });
            d.rect(Math.max(6, bw * frac), 6, { x: x0 + Math.max(6, bw * frac) / 2, y: y + 9, color: "#58e0ff", radius: 3 });
            d.text(q.name, { x: x0 + q.w / 2, y: y - 4, size: 13, bold: true, color: "#ffffff", font: FONT, align: "left", maxWidth: 170 });
            d.text(`${Math.round(q.dmg / total * 100)}%`, { x: px0 + w / 2 - 28, y: y + 1, size: 14, bold: true, color: "#cfeaff", font: FONT });
        });
    } }]);
    const y = panelY + panelH + 18;
    const best = s.add([text(a.fresh ? "New deepest dive!" : `Deepest dive ${clock(a.best.time)}${a.best.wins ? `, ${a.best.wins} wins` : ""}`, { size: 14, bold: true, color: a.fresh ? "#ffe98a" : "#cfeaff", font: FONT }), pos(v.width / 2, y), ui(), { name: "bestLine" }]);
    s.add([ui(), pos(v.width / 2, y), { name: "bestPill", draw(d) { d.rect(best.size.x + 26, 26, { color: "#0e1a3d", radius: 13, opacity: 0.72 }); } }]).layer = -1;
    const btnY = land ? v.height - v.safe.bottom - 34 : Math.max(y + 56, v.height * 0.8);
    if (!land && btnY - y > 110) {
        const hy = (y + btnY) / 2 - 8;
        let t = 0;
        s.add([ui(), pos(v.width / 2, hy), { name: "diver", update(dt) { t += dt; }, draw(d) {
            put(d, "fx", F.glow, 0, 0, 150, 150, false, "#fff3b0", 0.2);
            put(d, "hero", Math.floor(t * 4) & 3, 0, Math.sin(t * 1.6) * 5, 72, 72, false, undefined, a.won ? 1 : 0.92);
        } }]);
    }
    bigButton(s, "DIVE AGAIN", { action: "confirm", width: land ? 200 : 236, height: 62, color: "#ff6b5e", textSize: 24, radius: 31, onTap: () => { game.sfx(TONES.pick); game.go("play", {}, { fade: 0.3 }); } }, [pos(land ? v.width / 2 - 70 : v.width / 2, btnY), ui(), { name: "retry" }]);
    s.add([button("Title", { width: 110, height: 50, color: "#14305e", textSize: 16, radius: 25, onTap: () => game.go("title", {}, { fade: 0.3 }) }), pos(land ? v.width / 2 + 110 : v.width / 2, land ? btnY : btnY + 62), ui(), { name: "toTitle" }]);
    game.data.result = { won: a.won, time: a.time, level: a.level, kills: a.kills };
});

game.start(params.get("scene") ?? "title");
if (typeof document !== "undefined") document.getElementById("load")?.remove();
