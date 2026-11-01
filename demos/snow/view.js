// A puzzle as a little 3D diorama. It reads rules.js results and turns each one into rolling, puffing and plopping.
// It never decides anything: undo can throw any animation away and snap to the true board.
import { color, mesh, pos } from "./pogo.js";
import { Geo, mix } from "./geo.js";
import { Terrain } from "./terrain.js";
import { addBush, addFencePiece, addPine, addRock, ballGeo, moleGeo, PAL, pawGeo, scarfTailGeo, snowmanTrim } from "./models.js";
import { BALLS, DITCH, DONE, GATE, GROUND, L, M, PINE, PLATE, PLINTH, S, SNOW, VOID, WALL, WARM, gateOpen } from "./rules.js";

export const RADIUS = { [S]: 0.2, [M]: 0.285, [L]: 0.385 };
const STEP = 0.125;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (t) => t * t * (3 - 2 * t);
const outBack = (t) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const hash = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };
const yawOf = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];

let shared = false;
/** Meshes every level uses, made once. */
export function defineShared(game) {
    if (shared) return;
    shared = true;
    const a = game.assets;
    ballGeo().build(a, "ball");
    moleGeo().build(a, "mole");
    pawGeo().build(a, "paw");
    scarfTailGeo().build(a, "scarfTail");
    for (const [name, laden] of [["pineFull", true], ["pineBare", false]]) { const g = new Geo(); addPine(g, 0, 0, 0, 1.5, { laden }); g.build(a, name); }
    const R = [RADIUS[L], RADIUS[M], RADIUS[S]];
    for (let i = 0; i < 4; i++) snowmanTrim(i, R).build(a, `trim${i}`);
    {
        const g = new Geo();
        g.lathe(0, 0, 0, [[0.42, 0], [0.42, 0.05], [0.36, 0.06], [0.3, 0.05], [0, 0.05]], (t) => mix(PAL.stoneDark, PAL.stone, t), { seg: 18 });
        for (let i = 0; i < 6; i++) { const q = (i / 6) * Math.PI * 2; g.blob(Math.cos(q) * 0.2, 0.05, Math.sin(q) * 0.2, 0.03, 0.012, 0.03, PAL.lantern, { seg: 6, rings: 3 }); }
        g.build(a, "plate");
    }
    {
        const g = new Geo();
        // A square timber bollard, plain from every side: same ring of lights as the plate that lowers it.
        g.box(0, 0, 0, 0.86, 0.66, 0.86, PAL.wood, { bottom: PAL.woodDark });
        for (const y of [0.1, 0.5]) g.box(0, y, 0, 0.9, 0.06, 0.9, PAL.coal);
        for (let i = -1; i <= 1; i++) { g.box(i * 0.28, 0, 0.436, 0.02, 0.66, 0.01, PAL.woodDark); g.box(0.436, 0, i * 0.28, 0.01, 0.66, 0.02, PAL.woodDark); }
        for (let i = 0; i < 6; i++) { const q = (i / 6) * Math.PI * 2; g.blob(Math.cos(q) * 0.2, 0.67, Math.sin(q) * 0.2, 0.03, 0.012, 0.03, PAL.lantern, { seg: 6, rings: 3 }); }
        g.blob(0, 0.67, 0, 0.1, 0.03, 0.1, PAL.snow, { seg: 8, rings: 4 });
        g.build(a, "gate");
    }
    {
        const g = new Geo();
        g.lathe(0, 0, 0, [[0.47, 0], [0.47, 0.08], [0.42, 0.1], [0, 0.1]], (t) => mix(PAL.stoneDark, PAL.stone, t), { seg: 20 });
        for (let i = 0; i < 8; i++) { const q = (i / 8) * Math.PI * 2; g.blob(Math.cos(q) * 0.42, 0.11, Math.sin(q) * 0.42, 0.025, 0.025, 0.025, PAL.lantern, { seg: 6, rings: 3 }); }
        g.build(a, "plinth");
    }
    a.paint("contact", 64, 64, (p) => {
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const d = Math.hypot(x - 31.5, y - 31.5) / 31.5, v = clamp(1 - d, 0, 1), o = (x + y * 64) * 4;
            p.data[o] = 255; p.data[o + 1] = 255; p.data[o + 2] = 255; p.data[o + 3] = 255 * v * v;
        }
    }, { smooth: true });
    a.paint("seaTex", 128, 128, (p) => {
        const noise = (x, y) => Math.sin(x * 0.13 + 1.3 * Math.sin(y * 0.09)) * Math.sin(y * 0.11 + Math.sin(x * 0.07) * 1.7) + 0.5 * Math.sin(x * 0.31 + y * 0.23);
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const n = noise(x, y) * 0.5 + 0.5, v = 215 + clamp(n, 0, 1) * 40, o = (x + y * 128) * 4;
            p.data[o] = v; p.data[o + 1] = v; p.data[o + 2] = v; p.data[o + 3] = 255;
        }
    }, { smooth: true });
}

/** The cut edge of a plot: snow lip, earth, stone, tapering away below. */
export function addCliffs(g, tiles, w, h, ox, oz, o = {}) {
    const land = (x, y) => x >= 0 && y >= 0 && x < w && y < h && tiles[x + y * w] !== VOID;
    const earth = o.earth ?? "#6a4a46", deep = o.deep ?? "#4a3a52", rock = o.rock ?? "#3b3350", n = o.n ?? 3;
    const J = (a, b, k) => (hash(a * 3.1 + k, b * 1.7 + k * 2) - 0.5) * 0.09;
    const span = (ax, az, bx, bz, nx, nz) => {
        for (let i = 0; i < n; i++) {
            const t0 = i / n, t1 = (i + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
            const lv = [0.01, -0.07, -0.42, -0.86, -1.5];
            const inset = [0, 0, 0.03, 0.1, 0.46];
            const cols = [PAL.snow, earth, deep, rock];
            for (let k = 0; k < 4; k++) {
                const a0 = inset[k] + (k ? J(x0, z0, k) : 0), a1 = inset[k] + (k ? J(x1, z1, k) : 0), b0 = inset[k + 1] + J(x0, z0, k + 1), b1 = inset[k + 1] + J(x1, z1, k + 1);
                const ca = k === 0 ? PAL.snow : cols[k], cb = k === 0 ? PAL.snowShade : mix(cols[k], k === 3 ? "#2a2a4a" : cols[k + 1] ?? rock, 0.7);
                g.quad([x0 - nx * b0, lv[k + 1] + J(x0, z0, k + 5), z0 - nz * b0, cb], [x1 - nx * b1, lv[k + 1] + J(x1, z1, k + 5), z1 - nz * b1, cb], [x1 - nx * a1, lv[k] + (k ? J(x1, z1, k + 4) : 0), z1 - nz * a1, ca], [x0 - nx * a0, lv[k] + (k ? J(x0, z0, k + 4) : 0), z0 - nz * a0, ca], ca);
            }
        }
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!land(x, y)) continue;
        const X = x + ox, Z = y + oz;
        if (!land(x, y + 1)) span(X, Z + 1, X + 1, Z + 1, 0, 1);
        if (!land(x + 1, y)) span(X + 1, Z + 1, X + 1, Z, 1, 0);
        if (!land(x, y - 1)) span(X + 1, Z, X, Z, 0, -1);
        if (!land(x - 1, y)) span(X, Z, X, Z + 1, -1, 0);
    }
}

const MOLE = 1.32;
/** Mott. He only knows where he is going and how to look pleased about it. */
export class Mole {
    constructor(s, contact) {
        Object.assign(this, { x: 0, y: 0, yaw: 0, yawGoal: 0, from: [0, 0], to: [0, 0], t: 1, dur: STEP, bob: 0, push: 0, pushGoal: 0, side: 0, worried: 0, cheer: 0, lunge: 0, pushAt: 0, shakeNo: 0 });
        this.body = s.add([mesh("mole"), pos(0, 0, 0), { name: "mole" }]);
        this.pawL = s.add([mesh("paw"), pos(0, 0, 0), { name: "paw" }]);
        this.pawR = s.add([mesh("paw"), pos(0, 0, 0), { name: "paw" }]);
        this.tail = s.add([mesh("scarfTail"), pos(0, 0, 0), { name: "scarf" }]);
        this.blob = contact(0.4);
        this.nat = s.game?.assets?.geometry("mole").natural;
    }
    walk(fx, fy, nx, ny, dur) { this.from = [fx, fy]; this.to = [nx, ny]; this.t = 0; this.dur = dur; this.side ^= 1; }
    face(d) { this.yawGoal = yawOf[d]; }
    place(x, y) { this.x = x; this.y = y; this.t = 1; this.push = 0; this.pushGoal = 0; }
    update(dt, w, onFoot) {
        const time = w.time;
        if (this.t < 1) {
            const prev = this.t;
            this.t = Math.min(1, this.t + dt / this.dur);
            const e = ease(this.t);
            this.x = this.from[0] + (this.to[0] - this.from[0]) * e; this.y = this.from[1] + (this.to[1] - this.from[1]) * e;
            this.bob = Math.sin(this.t * Math.PI);
            if (this.pushGoal) this.pushAt = time;
            if (prev < 0.5 && this.t >= 0.5) onFoot?.();
        } else { this.bob *= Math.exp(-dt * 18); if (time - this.pushAt > 0.2) this.pushGoal = 0; }
        this.push += (this.pushGoal - this.push) * Math.min(1, dt * 22);
        let dy = this.yawGoal - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += dy * Math.min(1, dt * 22);
        this.lunge *= Math.exp(-dt * 9); this.cheer *= Math.exp(-dt * 2.6); this.shakeNo *= Math.exp(-dt * 7);
        const hop = Math.abs(Math.sin(time * 11)) * this.cheer * 0.24, breathe = Math.sin(time * 2.4) * 0.012, wor = this.worried;
        const g = w.groundAt(this.x, this.y), mx = w.wx(this.x), mz = w.wz(this.y), yaw = this.yaw + Math.sin(time * 34) * this.shakeNo * 0.5 + wor * Math.sin(time * 1.6) * 0.3, sn = Math.sin(yaw), cs = Math.cos(yaw), fwd = this.lunge * 0.14 + this.push * 0.06;
        const lift = this.bob * 0.075 + hop, stretch = 1 + this.bob * 0.07 + breathe + hop * 0.3, wide = 1 - this.bob * 0.04 - breathe * 0.6, nat = w.game.assets.geometry("mole").natural;
        this.body.pos.set(mx + sn * fwd, g + (lift - 0.004) * MOLE, mz + cs * fwd);
        this.body.size.set(nat.x * wide * MOLE, nat.y * stretch * MOLE, nat.z * wide * MOLE);
        this.body.rot.y = yaw; this.body.rot.x = 0.12 * this.push; this.body.rot.z = Math.sin(time * 9) * this.bob * 0.08;
        const reach = (0.21 + this.push * 0.13 + this.lunge * 0.14) * MOLE, swing = this.push > 0.2 ? 0 : Math.sin(time * 10) * this.bob * 0.05, py = g + (lift + 0.21 + this.push * 0.03 + this.cheer * 0.26) * MOLE;
        for (const [paw, k] of [[this.pawL, -1], [this.pawR, 1]]) {
            const side = k * (0.19 - this.push * 0.05) * MOLE, f = reach + swing * k;
            paw.pos.set(mx + cs * side + sn * f, py, mz - sn * side + cs * f);
            paw.size.set(0.124 * MOLE, 0.104 * MOLE, 0.19 * MOLE);
            paw.rot.y = yaw;
        }
        const back = -0.17 * MOLE;
        this.tail.pos.set(mx + sn * back + cs * 0.07, g + (lift + 0.34 * stretch) * MOLE, mz + cs * back - sn * 0.07);
        this.tail.rot.y = yaw; this.tail.rot.x = 0.12 + this.bob * 0.45 + Math.sin(time * 1.9) * 0.05;
        this.blob.pos.set(mx, g + 0.012, mz); this.blob.size.set(0.8, 1, 0.8);
    }
}

export class LevelView {
    constructor(game, s, lvl, theme, ctx = {}) {
        this.game = game; this.s = s; this.lvl = lvl; this.theme = theme; this.ctx = ctx;
        defineShared(game);
        const { w, h } = lvl;
        this.ox = -w / 2; this.oz = -h / 2;
        // The plot sits inside a verge one tile wide, which carries the village: snow, trees, cottages. Nothing there is in play.
        const P = (this.pad = 1), W = (this.W = w + P * 2), H = (this.H = h + P * 2), tiles = new Uint8Array(W * H), snow = new Float32Array(W * H);
        const playable = (x, y) => x >= 0 && y >= 0 && x < w && y < h && lvl.tiles[x + y * w] !== VOID;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const lx = x - P, ly = y - P, i = x + y * W;
            if (playable(lx, ly)) { const c = lx + ly * w; tiles[i] = lvl.tiles[c]; snow[i] = lvl.start[c] & SNOW || lvl.tiles[c] === WALL || lvl.tiles[c] === PINE ? 1 : 0; continue; }
            let near = false;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (playable(lx + dx, ly + dy)) near = true;
            tiles[i] = near ? GROUND : VOID; snow[i] = near ? 1 : 0;
        }
        this.mapTiles = tiles;
        const cob = theme.cob;
        this.terrain = new Terrain(game, "lv", { w: W, h: H, tiles, snow: (i) => snow[i], filled: () => false }, { pal: { g1: cob[0], g2: cob[1] } });
        s.add([mesh("lv_mesh", { texture: "lv_tex", color: "#ffffff", shadow: false }), pos(0, 0, 0), { name: "ground" }]);
        this.buildScenery();
        this.buildSea();
        this.buildProps();
        this.balls = [];
        this.buildMole();
        this.time = 0;
        this.effects = [];
        this.pending = [];
    }

    wx(x) { return x + this.ox + 0.5; }
    wz(y) { return y + this.oz + 0.5; }
    cellX(i) { return i % this.lvl.w; }
    cellY(i) { return Math.floor(i / this.lvl.w); }
    /** Ground height at a cell right now. */
    groundAt(fx, fy) { return this.terrain.heightAt(fx + 0.5 + this.pad, fy + 0.5 + this.pad); }
    /** The terrain's index for a cell of the level. */
    tc(i) { return this.cellX(i) + this.pad + (this.cellY(i) + this.pad) * this.W; }

    buildScenery() {
        const { lvl, theme, W, H, pad } = this, g = new Geo(), { w, h, tiles } = lvl, playable = (x, y) => x >= 0 && y >= 0 && x < w && y < h && tiles[x + y * w] !== VOID;
        addCliffs(g, this.mapTiles, W, H, this.ox - pad, this.oz - pad);
        // A low fence round the plot: the ball stops here, and you can see why.
        const inset = 0.05;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!playable(x, y)) continue;
            const X = x + this.ox, Z = y + this.oz;
            if (!playable(x, y - 1)) addFencePiece(g, [X, Z + inset], [X + 1, Z + inset]);
            if (!playable(x, y + 1)) addFencePiece(g, [X + 1, Z + 1 - inset], [X, Z + 1 - inset]);
            if (!playable(x - 1, y)) addFencePiece(g, [X + inset, Z + 1], [X + inset, Z]);
            if (!playable(x + 1, y)) addFencePiece(g, [X + 1 - inset, Z], [X + 1 - inset, Z + 1]);
        }
        const place = (fn, x, y, k) => {
            const X = this.wx(x), Z = this.wz(y);
            fn(g, X, Z, k);
            if (fn.glows && theme.glow) { const e = this.s.add([mesh("plane", { size: [2.6, 1, 2.6], texture: "contact", unlit: true, shadow: false }), pos(X, 0.04, Z + 0.1), { name: "lampGlow" }]); e.color = color([1, 0.78, 0.46, theme.glow]); }
        };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const k = Math.floor(hash(x + 3, y + w) * 97);
            if (tiles[x + y * w] === WALL) place(theme.walls[k % theme.walls.length], x, y, k);
        }
        // The verge: taller things behind the plot, only low things in front where they would hide it.
        for (let y = -pad; y < h + pad; y++) for (let x = -pad; x < w + pad; x++) {
            if (playable(x, y) || !this.mapTiles[x + pad + (y + pad) * W]) continue;
            const r = hash(x * 3 + 1, y * 7 + 2), k = Math.floor(hash(x + 9, y + 5) * 97);
            let front = false;
            for (let d = 1; d <= 3; d++) if (playable(x, y - d)) front = true;
            if (front) { if (r < 0.32) addBush(g, this.wx(x), 0, this.wz(y), 0.8 + r); else if (r < 0.42) addRock(g, this.wx(x), 0, this.wz(y), 0.8); }
            else if (r < 0.72) place(theme.verge[k % theme.verge.length], x, y, k);
        }
        g.build(this.game.assets, "scenery");
        this.s.add([mesh("scenery"), pos(0, 0, 0), { name: "scenery" }]);
    }

    buildSea() {
        // Soft clouds drifting far below the plot, over the sky gradient.
        const s = this.s, tint = color(this.theme.sea);
        this.clouds = [];
        for (let i = 0; i < 7; i++) {
            const size = 9 + hash(i, 2) * 12, x = (hash(i, 5) - 0.5) * 30, z = (hash(i, 9) - 0.5) * 26;
            const e = s.add([mesh("plane", { size: [size * 1.6, 1, size], texture: "contact", unlit: true, shadow: false }), pos(x, -7 - i * 0.3, z), { name: "cloud" }]);
            e.color = color([tint.r, tint.g, tint.b, 0.5]);
            this.clouds.push({ e, x, v: 0.06 + hash(i, 1) * 0.08 });
        }
    }

    buildProps() {
        const { s, lvl } = this;
        this.pines = new Map(); this.plates = new Map(); this.gates = new Map(); this.warm = [];
        lvl.tiles.forEach((t, i) => {
            const X = this.wx(this.cellX(i)), Z = this.wz(this.cellY(i));
            if (t === PINE) this.pines.set(i, { e: s.add([mesh("pineFull"), pos(X, 0, Z), { name: "pine" }]), wob: 0 });
            if (t === PLATE) this.plates.set(i, { e: s.add([mesh("plate"), pos(X, 0.01, Z), { name: "plate" }]), y: 0.01 });
            if (t === GATE) {
                const e = s.add([mesh("gate"), pos(X, 0, Z), { name: "gate" }]);
                this.gates.set(i, { e, y: 0 });
            }
            if (t === PLINTH) s.add([mesh("plinth"), pos(X, 0.0, Z), { name: "plinth" }]);
            if (t === WARM) {
                const glow = s.add([mesh("plane", { size: [1.5, 1, 1.5], texture: "contact", unlit: true, shadow: false }), pos(X, 0.03, Z), { name: "glow" }]);
                this.warm.push({ glow, x: X, z: Z, p: hash(i, 4) * 6 });
            }
        });
    }

    buildMole() { this.mole = new Mole(this.s, (k) => this.contact(k)); }

    contact(size) {
        const e = this.s.add([mesh("plane", { size: [size, 1, size], texture: "contact", unlit: true, shadow: false }), pos(0, 0, 0), { name: "contact" }]);
        e.color = color([0.1, 0.13, 0.3, 0.4]);
        return e;
    }

    newBall(size, cell, level) {
        const s = this.s;
        const b = {
            size, r: RADIUS[size], rShow: RADIUS[size], x: this.cellX(cell), y: this.cellY(cell), h: 0, level, cell, spinX: hash(cell, 3) * 6, spinZ: hash(cell, 7) * 6, sq: 0, sqV: 0, anim: null, pop: 0,
            e: s.add([mesh("ball", { size: 0.5, color: "#ffffff" }), pos(0, 0, 0), { name: "ball" }]),
            blob: this.contact(1),
        };
        this.balls.push(b);
        return b;
    }

    killBall(b) { b.e.destroy(); b.blob.destroy(); this.balls.splice(this.balls.indexOf(b), 1); }

    /** Height of the centre of a ball standing `level` high on a stack at this cell, given the sizes present. */
    stackY(cell, size, mask) {
        const g = this.groundAt(this.cellX(cell), this.cellY(cell));
        let y = g;
        for (const q of [L, M, S]) {
            if (!(mask & q)) continue;
            const r = RADIUS[q];
            if (q === size) return y + r * 0.92;
            y += r * 1.72;
        }
        return y;
    }

    /** Throw away everything that's moving and show this board. */
    sync(st, fast = false) {
        const lvl = this.lvl, old = this.balls.slice();
        for (const b of old) b.anim = null;
        const want = [];
        lvl.live.forEach((i) => {
            const m = st.c[i] & BALLS;
            for (const q of [L, M, S]) if (m & q) want.push({ cell: i, size: q, mask: m });
            if (lvl.tiles[i] !== PINE) this.terrain.setSnow(this.tc(i), st.c[i] & SNOW ? 1 : 0);
            if (lvl.tiles[i] === DITCH) this.terrain.setBase(this.tc(i), st.c[i] & DONE ? 0 : -0.28);
        });
        const free = new Set(old);
        for (const w of want) {
            let best = null, bd = 1e9;
            for (const b of free) {
                if (b.size !== w.size) continue;
                const d = Math.abs(b.x - this.cellX(w.cell)) + Math.abs(b.y - this.cellY(w.cell));
                if (d < bd) { bd = d; best = b; }
            }
            if (best) free.delete(best); else best = this.newBall(w.size, w.cell, 0);
            best.cell = w.cell; best.x = this.cellX(w.cell); best.y = this.cellY(w.cell); best.mask = w.mask; best.rShow = best.r; best.sq = 0; best.sqV = 0;
        }
        for (const b of free) this.killBall(b);
        for (const b of this.balls) b.h = 0;
        this.terrain.flush();
        for (const b of this.balls) b.h = this.stackY(b.cell, b.size, b.mask);
        const m = this.mole;
        m.place(this.cellX(st.p), this.cellY(st.p));
        for (const [i, p] of this.pines) { const used = st.c[i] & DONE; p.e.mesh = used ? "pineBare" : "pineFull"; }
        this.syncGate(st, true);
        this.syncTrim(st);
        this.effects.length = 0;
        this.busyUntil = 0;
    }

    syncGate(st, snap) {
        const open = gateOpen(this.lvl, st.c);
        for (const [i, g] of this.gates) { g.goal = open || (st.c[i] & BALLS) ? -0.7 : 0; if (snap) g.y = g.goal; }
        for (const [i, p] of this.plates) { p.goal = st.c[i] & BALLS ? -0.03 : 0.01; if (snap) p.y = p.goal; }
    }

    syncTrim(st) {
        this.trims ??= new Map();
        for (const [i, t] of this.trims) if ((st.c[i] & BALLS) !== BALLS) { t.e.destroy(); this.trims.delete(i); }
        for (const i of this.lvl.live) if ((st.c[i] & BALLS) === BALLS && !this.trims.has(i)) this.addTrim(i, 1);
    }

    addTrim(i, k) {
        const style = (this.cellX(i) * 3 + this.cellY(i) * 5 + (this.ctx.seed ?? 0)) % 4;
        const e = this.s.add([mesh(`trim${style}`), pos(this.wx(this.cellX(i)), 0, this.wz(this.cellY(i))), { name: "trim" }]);
        const g = this.game.assets.geometry(`trim${style}`).natural;
        e.size.set(g);
        e.rot.y = (hash(i, 11) - 0.5) * 0.7;
        this.trims.set(i, { e, k, cell: i });
    }

    /** Show one rule result. `before` is the board's mask at key cells, `st` the board after. */
    play(info, st, sound) {
        const m = this.mole, lvl = this.lvl, dirOf = (a, b) => { const dx = this.cellX(b) - this.cellX(a), dy = this.cellY(b) - this.cellY(a); return dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0; };
        const d = dirOf(info.from, info.at), speed = this.ctx.speed ?? 1;
        m.face(d);
        m.pushGoal = info.kind === "walk" ? 0 : 1;
        this.syncGateLater = st;
        if (info.kind === "shake") {
            const p = this.pines.get(info.at);
            p.wob = 1;
            m.lunge = 1;
            sound?.shake();
            this.s.burst({ at: [this.wx(this.cellX(info.at)), 1.1, this.wz(this.cellY(info.at))], count: 46, color: ["#ffffff", "#dfe8ff"], speed: [0.4, 2.2], life: [0.4, 1], size: [0.05, 0.11], gravity: 6, dim: 3 });
            p.e.mesh = "pineBare";
            for (const n of info.fell) this.effects.push({ t: 0, dur: 0.45, fn: (k) => this.terrain.setSnow(this.tc(n), ease(k)) });
            this.game.haptic("medium");
            return 0.3;
        }
        const nx = this.cellX(info.at), ny = this.cellY(info.at), fx = this.cellX(info.from), fy = this.cellY(info.from);
        // The mole's own walk, with a pressed print for each foot.
        if (info.kind === "walk" || !info.stacked) {
            m.walk(fx, fy, nx, ny, STEP / speed);
            this.printFoot(fx, fy, nx, ny, d, m.side);
            if (info.kind === "walk") sound?.step(lvl.tiles[info.at], st.c[info.at] & SNOW);
        } else m.lunge = 1;
        if (info.kind === "walk") return STEP / speed;
        return this.playBall(info, st, d, sound) ;
    }

    printFoot(fx, fy, nx, ny, d, side) {
        const t = this.terrain, ang = d === 0 || d === 2 ? 0 : Math.PI / 2, ox = d % 2 ? 0 : side ? 0.12 : -0.12, oy = d % 2 ? (side ? 0.12 : -0.12) : 0;
        for (const k of [0.3, 0.75]) t.stamp(fx + 0.5 + this.pad + (nx - fx) * k + (k > 0.5 ? -ox : ox), fy + 0.5 + this.pad + (ny - fy) * k + (k > 0.5 ? -oy : oy), ang);
    }

    playBall(info, st, d, sound) {
        const b = this.ballAt(info.at, info.ball);
        if (!b) return STEP;
        const dx = [0, 1, 0, -1][d], dy = [-1, 0, 1, 0][d], startX = this.cellX(info.at), startY = this.cellY(info.at);
        const endCell = info.end, ex = this.cellX(endCell), ey = this.cellY(endCell), dist = Math.abs(ex - startX) + Math.abs(ey - startY);
        const slide = info.ev & 256, speed = this.ctx.speed ?? 1;
        const dur = (slide ? 0.1 + dist * 0.075 : STEP * Math.max(1, dist)) / speed;
        const h0 = b.h, stacked = info.fate === "stack", fallFrom = info.stacked;
                const fate = info.fate, newSize = info.size || info.ball;
        b.anim = { t: 0, dur, x0: startX, y0: startY, x1: ex, y1: ey, h0, dx, dy, fate, newSize, stacked, fallFrom, slide, endCell };
        b.cell = endCell;
        b.size = newSize || b.size;
        if (stacked) { b.mask = st.c[endCell] & BALLS; }
        else b.mask = newSize;
        const others = this.balls.filter((o) => o !== b && o.cell === info.at);
        for (const o of others) o.mask = st.c[info.at] & BALLS;
        sound?.push(info, slide);
        this.game.haptic?.(slide ? "tick" : "light");
        if (info.ev & 65536) {
            // The ball takes the snow with it: the cell peels away under it, and leaves a rolled lip either side.
            const tc = this.tc(endCell);
            this.effects.push({ t: 0, dur: dur * 1.1, fn: (k) => this.terrain.setSnow(tc, 1 - ease(k)) });
            this.s.burst({ at: [this.wx(ex) - dx * 0.3, 0.16, this.wz(ey) - dy * 0.3], count: 9, color: ["#ffffff", "#e6eeff"], speed: [0.3, 1.1], life: [0.2, 0.5], size: [0.04, 0.08], gravity: 5, dim: 3 });
        }
        this.effects.push({ t: 0, dur, fn: () => {}, done: () => this.land(b, info, st, sound) });
        return Math.max(dur, STEP / speed);
    }

    ballAt(cell, size) { return this.balls.find((b) => b.cell === cell && b.size === size && !b.anim) ?? this.balls.find((b) => b.cell === cell && b.size === size); }

    land(b, info, st, sound) {
        const end = info.end, X = this.wx(this.cellX(end)), Z = this.wz(this.cellY(end)), a = b.anim, s = this.s;
        b.anim = null;
        this.syncGate(st, false);
        if (info.fate === "melt") {
            s.burst({ at: [X, 0.25, Z], count: 18, color: ["#ffffff", "#ffd9a8"], speed: [0.3, 1.2], life: [0.4, 0.9], size: [0.05, 0.1], gravity: -2.5, dim: 3 });
            this.killBall(b);
            sound?.melt();
            this.game.haptic("light");
            return;
        }
        if (info.fate === "fill") {
            s.burst({ at: [X, 0, Z], count: 30, color: ["#ffffff", "#bfd9f2"], speed: [0.6, 2.4], life: [0.3, 0.7], size: [0.05, 0.11], gravity: 7, dim: 3 });
            this.killBall(b);
            this.effects.push({ t: 0, dur: 0.3, fn: (k) => { this.terrain.setBase(this.tc(end), -0.28 * (1 - ease(k))); this.terrain.setSnow(this.tc(end), ease(k)); } });
            sound?.fill();
            s.shake(0.05, 0.14, { haptic: false });
            this.game.haptic("medium");
            return;
        }
        if (info.fate === "shrink") {
            b.r = RADIUS[b.size]; b.pop = -1;
            s.burst({ at: [X, 0.2, Z], count: 22, color: ["#ffffff", "#ffc48a"], speed: [0.4, 1.4], life: [0.3, 0.8], size: [0.04, 0.09], gravity: -3, dim: 3 });
            sound?.shrink();
            this.game.haptic("light");
            return;
        }
        if (info.fate === "grow") {
            b.r = RADIUS[b.size]; b.pop = 1; b.sq = 0.3;
            sound?.grow(b.size);
            this.game.haptic("tick");
            s.burst({ at: [X, 0.1, Z], count: 12, color: ["#ffffff", "#e6eeff"], speed: [0.3, 1.3], life: [0.2, 0.5], size: [0.04, 0.08], gravity: 5, dim: 3 });
        }
        if (info.fate === "stop") { sound?.thud(); b.sq = 0.2; }
        if (info.fate === "bare" && info.ev & 256) sound?.thud();
        if (info.fate === "stack") {
            const mask = st.c[end] & BALLS;
            for (const o of this.balls) if (o.cell === end) o.mask = mask;
            b.sq = 0.45;
            for (const o of this.balls) if (o.cell === end && o !== b) o.sq = 0.22;
            if (mask === BALLS) this.finish(end, b, sound);
            else { sound?.stack(b.size); this.game.haptic("medium"); s.burst({ at: [X, b.h, Z], count: 10, color: ["#ffffff", "#e6eeff"], speed: [0.3, 1.1], life: [0.2, 0.5], size: [0.04, 0.07], gravity: 5, dim: 3 }); }
        }
    }

    finish(cell, b, sound) {
        const X = this.wx(this.cellX(cell)), Z = this.wz(this.cellY(cell)), s = this.s;
        this.addTrim(cell, 0);
        // The head plop: world holds for a beat, then a soft double thump in the hand.
        s.freeze(0.07);
        s.shake(0.05, 0.18, { haptic: false });
        s.burst({ at: [X, 1.1, Z], count: 34, color: ["#ffffff", "#ffe7b0"], speed: [0.6, 2.6], life: [0.4, 0.9], size: [0.05, 0.1], gravity: 5, dim: 3 });
        this.game.haptic([12, 45, 28]);
        sound?.plop();
        this.mole.cheer = 1;
    }

    /** One frame of everything. */
    update(dt) {
        const t = this.terrain;
        this.time += dt;
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.t += dt;
            const k = Math.min(1, e.t / e.dur);
            e.fn(k);
            if (k >= 1) { this.effects.splice(i, 1); e.done?.(); }
        }
        for (const [, g] of this.gates) { if (g.goal !== undefined) g.y += (g.goal - g.y) * Math.min(1, dt * 14); g.e.pos.y = g.y; }
        for (const [, p] of this.plates) { if (p.goal !== undefined) p.y += (p.goal - p.y) * Math.min(1, dt * 20); p.e.pos.y = p.y; }
        for (const [, p] of this.pines) {
            if (p.wob > 0.002) { p.wob *= Math.exp(-dt * 3.2); p.e.rot.z = Math.sin(this.time * 26) * p.wob * 0.12; p.e.rot.x = Math.cos(this.time * 19) * p.wob * 0.08; }
        }
        if (this.syncGateLater) { const st = this.syncGateLater; this.syncGateLater = null; this.gateState = st; if (!this.anyAnim()) this.syncGate(st, false); }
        for (const w of this.warm) {
            const k = 0.34 + Math.sin(this.time * 2.3 + w.p) * 0.07 + Math.sin(this.time * 5.1 + w.p) * 0.03;
            w.glow.color = color([1, 0.55, 0.2, k]);
            if (hash(Math.floor(this.time * 9), w.p) < 0.14 && Math.floor(this.time * 9) !== w.last) { w.last = Math.floor(this.time * 9); this.s.burst({ at: [w.x + (hash(this.time, 1) - 0.5) * 0.6, 0.08, w.z + (hash(this.time, 2) - 0.5) * 0.6], count: 1, color: ["#ffe0c0", "#ffffff"], speed: [0.1, 0.3], life: [0.5, 1.1], size: [0.04, 0.09], gravity: -1.2, dim: 3 }); }
        }
        // Balls.
        for (const b of this.balls) {
            const a = b.anim;
            if (a) {
                a.t += dt;
                const k = Math.min(1, a.t / a.dur), e = a.slide ? k : ease(k);
                const ox = b.x, oy = b.y;
                b.x = a.x0 + (a.x1 - a.x0) * e; b.y = a.y0 + (a.y1 - a.y0) * e;
                const g = this.groundAt(b.x, b.y);
                const rest = g + b.r * 0.92, goal = a.stacked ? this.stackY(a.endCell, b.size, b.mask) : rest;
                if (a.stacked) b.h = a.h0 + (goal - a.h0) * e + Math.sin(k * Math.PI) * 0.22;
                else if (a.fallFrom) b.h = a.h0 + (rest - a.h0) * (e * e);
                else b.h = rest;
                const roll = (Math.hypot(b.x - ox, b.y - oy) / b.r);
                b.spinX += roll * a.dy; b.spinZ -= roll * a.dx;
            } else {
                const g = this.stackY(b.cell, b.size, b.mask ?? b.size);
                b.h += (g - b.h) * Math.min(1, dt * 18);
            }
            b.rShow += (b.r - b.rShow) * Math.min(1, dt * 16);
            b.sqV += (-b.sq * 240 - b.sqV * 24) * dt; b.sq += b.sqV * dt;
            const q = clamp(b.sq, -0.12, 0.5), sy = 1 - q * 0.5, sx = 1 + q * 0.28;
            const r = b.rShow;
            b.e.pos.set(this.wx(b.x), b.h - (1 - sy) * r * 0.8, this.wz(b.y));
            b.e.size.set(r * 2 * sx, r * 2 * sy, r * 2 * sx);
            b.e.rot.x = b.spinX; b.e.rot.z = b.spinZ;
            const low = (b.mask ?? b.size) === b.size || [L, M, S].find((q) => (b.mask ?? 0) & q) === b.size;
            b.blob.hidden = !low;
            if (low) { b.blob.pos.set(this.wx(b.x), this.groundAt(b.x, b.y) + 0.012, this.wz(b.y)); b.blob.size.set(r * 3, 1, r * 3); }
        }
        for (const [i, tr] of this.trims ?? []) {
            tr.k = Math.min(1, tr.k + dt * 3);
            const base = this.groundAt(this.cellX(i), this.cellY(i)), k = outBack(tr.k);
            tr.e.pos.y = base;
            tr.e.opacity = 1;
            const n = tr.e.size;
            const q = this.game.assets.geometry(tr.e.mesh).natural;
            n.set(q.x * k, q.y * (0.8 + 0.2 * k), q.z * k);
        }
        this.mole.update(dt, this, this.ctx.onFoot);
        for (const c of this.clouds) { c.x += c.v * dt; if (c.x > 24) c.x = -24; c.e.pos.x = c.x; }
        t.flush();
    }

    anyAnim() { return this.balls.some((b) => b.anim); }
    idle() { return this.mole.t >= 1 && !this.anyAnim() && !this.effects.length; }

    /** Frame the whole plot between the HUD strips. */
    frame(top, bottom, left = 8, right = 8, mx = 0.72) {
        const s = this.s, v = s.view, { w, h } = this.lvl, cam = s.cam3;
        cam.fovAxis = "vertical";
        cam.fov = this.ctx.fov ?? 24;
        s.light.shadowRange = Math.max(w, h) * 0.95;
        const pitch = 0.94, yaw = -0.07, tx = 0, tz = 0.15;
        const P = (d, cx, cz) => { const cp = Math.cos(pitch), sp = Math.sin(pitch); return [cx + Math.sin(yaw) * cp * d, sp * d, cz + Math.cos(yaw) * cp * d]; };
        const box = [[-w / 2 - mx, 0, -h / 2 - mx], [w / 2 + mx, 0, -h / 2 - mx], [-w / 2 - mx, 0, h / 2 + mx], [w / 2 + mx, 0, h / 2 + mx], [-w / 2, -1, h / 2 + 1.1], [w / 2, -1, h / 2 + 1.1], [-w / 2, 1.2, -h / 2 - 0.8], [w / 2, 1.2, -h / 2 - 0.8]];
        let cx = tx, cz = tz, best = 40;
        for (let iter = 0; iter < 4; iter++) {
            let lo = 6, hi = 120;
            for (let i = 0; i < 18; i++) {
                const d = (lo + hi) / 2;
                cam.pos.set(...P(d, cx, cz)); cam.target.set(cx, 0, cz); cam.prevPos?.set(cam.pos); cam.prevTarget?.set(cam.target);
                const pts = box.map((p) => cam.project(p));
                const fit = pts.every((p) => p.x >= left && p.x <= v.width - right && p.y >= top && p.y <= v.height - bottom);
                if (fit) hi = d; else lo = d;
            }
            best = hi;
            cam.pos.set(...P(best, cx, cz)); cam.target.set(cx, 0, cz); cam.prevPos?.set(cam.pos); cam.prevTarget?.set(cam.target);
            const pts = box.map((p) => cam.project(p));
            const midY = (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2, want = (top + v.height - bottom) / 2;
            const midX = (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2, wantX = (left + v.width - right) / 2;
            const ppu = Math.abs(cam.project([0.5, 0, 0]).x - cam.project([-0.5, 0, 0]).x);
            cz += (midY - want) / ppu * 0.8;
            cx += (midX - wantX) / ppu * 0.8;
        }
        cam.set(P(best, cx, cz), [cx, 0, cz]);
    }

    /** Screen directions of the four grid moves, for reading a swipe. */
    axes() {
        const c = this.s.cam3, o = c.project([0, 0, 0]);
        return [[0, 0, -1], [1, 0, 0], [0, 0, 1], [-1, 0, 0]].map((p) => { const q = c.project(p), x = q.x - o.x, y = q.y - o.y, l = Math.hypot(x, y) || 1; return [x / l, y / l]; });
    }

    /** Which cell is under a view point, or -1. */
    cellAt(vx, vy) {
        const r = this.s.cam3.ray(vx, vy), o = r.origin, d = r.dir;
        if (Math.abs(d.y) < 1e-4) return -1;
        const k = -o.y / d.y, x = Math.floor(o.x + d.x * k - this.ox), y = Math.floor(o.z + d.z * k - this.oz);
        return x < 0 || y < 0 || x >= this.lvl.w || y >= this.lvl.h ? -1 : x + y * this.lvl.w;
    }
    project(cell, h = 0.2) { return this.s.cam3.project([this.wx(this.cellX(cell)), h, this.wz(this.cellY(cell))]); }

    leave() { this.terrain.free(); this.game.assets.free("scenery"); }
}
