// The living farm: flock boids, Biscuit the dog, rams, wolves, the bull, weather, light and camera.
// Characters don't use pogo bodies. Boids need a neighbour grid and only tile-box collisions, so one
// tight loop over typed arrays does everything; entities are just where the meshes get drawn.
import { clamp, color, dim, lerp, mesh, pos, rot } from "./pogo.js";
import { parseLevel, computeFlow, buildScenery } from "./terrain.js";
import { toGeometry } from "./vox.js";
import * as sfx from "./audio.js";

export const ROAM = 0, JUMP = 1, PEN = 2, CARRIED = 3, LOST = 4, AIR = 5;
const SHEEP_R = 0.36, RAM_R = 0.46, DOG_R = 0.3, FEAR = 4.6, BARK_R = 6.4, DOG_MAX = 7.2, CALM_V = 0.7, ALERT_V = 2.7, PANIC_V = 5.6;
const CELL = 2;

const hex = (h) => { const c = color(h); return [c.r, c.g, c.b]; };
const stop = (t, dir, sun, sky, ground, top, bot, k = 1) => ({ t, dir, sun: hex(sun).map((v) => v * k * 0.8), sky: hex(sky).map((v) => v * 0.66), ground: hex(ground).map((v) => v * 0.7), top: hex(top), bot: hex(bot) });
const MOODS = {
    day: [
        stop(0, [-0.6, -1, -0.5], "#fff0d4", "#b4cfe6", "#7a7264", "#79c8ee", "#fdf1cc", 0.82),
        stop(0.45, [-0.35, -1, -0.5], "#fff6e2", "#b8d6ec", "#807868", "#63bdf0", "#e8f6e8", 0.88),
        stop(0.72, [-0.8, -0.72, -0.35], "#ffc27c", "#b39fb0", "#7d6660", "#f59c62", "#fde0ad", 0.95),
        stop(0.9, [-1, -0.42, -0.22], "#ff8a5c", "#8d7db0", "#5a4a68", "#8a5aa8", "#fb9a6c", 0.88),
        stop(1, [-1, -0.3, -0.1], "#ff6e62", "#5e5a9a", "#3c3560", "#3b3475", "#d8688a", 0.62),
    ],
    gold: [
        stop(0, [-0.8, -0.8, -0.4], "#ffd9a0", "#bcb8c8", "#7e6e64", "#f0a86c", "#fdeac0", 0.9),
        stop(0.6, [-0.9, -0.6, -0.3], "#ffae6c", "#a896b4", "#6e5a64", "#e4806a", "#fdc790", 0.95),
        stop(0.88, [-1, -0.4, -0.2], "#ff7c5c", "#7e70ac", "#4c4064", "#6a4a9a", "#f08a7a", 0.85),
        stop(1, [-1, -0.3, -0.1], "#e8606a", "#4e4c90", "#2e2a54", "#2c2a66", "#b85a8a", 0.55),
    ],
    storm: [
        stop(0, [-0.5, -1, -0.3], "#b4c2d8", "#8ca0b8", "#52586a", "#46566e", "#8ea4b4", 0.55),
        stop(1, [-0.6, -0.8, -0.3], "#8c9cc4", "#6a7a9c", "#3a4258", "#2a3350", "#5a6a88", 0.42),
    ],
    night: [
        stop(0, [0.45, -1, -0.5], "#a8c0ff", "#5a70a8", "#28304e", "#10143a", "#2e3a78", 0.62),
        stop(1, [0.75, -0.8, -0.3], "#b8c0f8", "#4e6098", "#222844", "#0a0e2a", "#2a2f66", 0.55),
    ],
};

const built = new Map();
/** Levels mesh once: assets.mesh() has no free, so rebuilding would leak GL buffers on every retry. */
function levelAssets(game, def, key) {
    if (built.has(key)) return built.get(key);
    const L = parseLevel(def), meshes = buildScenery(L);
    game.assets.mesh(`land_${key}`, toGeometry(meshes.land));
    if (meshes.water.i.length) { game.assets.mesh(`water_${key}`, toGeometry(meshes.water)); game.assets.mesh(`glint_${key}`, toGeometry(meshes.glints)); }
    const out = { L, hasWater: meshes.water.i.length > 0, verts: meshes.land.p.length / 3 };
    built.set(key, out);
    return out;
}

export class World {
    constructor(game, s, def, key, o = {}) {
        this.game = game; this.s = s; this.def = def; this.key = key; this.attract = !!o.attract;
        const a = levelAssets(game, def, key);
        this.L = a.L; this.verts = a.verts;
        // Weak fences break, so reparse a fresh copy of the collision boxes for each attempt.
        this.L = parseLevel(def);
        this.L.pen.mid = a.L.pen.mid;
        const L = this.L;
        this.elapsed = 0; this.time = def.time; this.saved = 0; this.lost = 0; this.finished = false; this.stars = 0; this.popCount = 0;
        this.lastBark = -9; this.bleatAt = 0; this.pops = []; this.thump = 0; this.wind = 0; this.flashAt = -9; this.rain = [];
        this.onSaved = null; this.onDone = null; this.hurry = false; this.started = false; this.intro = o.intro ?? 1.2;
        this.bot = null;

        s.add([mesh(`land_${key}`), pos(0, 0, 0)]);
        if (a.hasWater) {
            this.water = s.add([mesh(`water_${key}`, { shadow: false }), pos(0, 0, 0), { opacity: 0.74 }]);
            this.water.opacity = 0.72;
            this.glint = s.add([mesh(`glint_${key}`, { shadow: false, unlit: true }), pos(0, 0, 0)]);
            this.glint.opacity = 0.55;
        }
        this.mill = [];
        for (const b of L.blocks) if (b.ch === "M") {
            const e = s.add([mesh("blades", { shadow: true }), pos(b.c + b.bw / 2, 6.9, b.r + b.bh + 0.2), rot(0, 0, 0)]);
            this.mill.push(e);
        }
        this.smoke = L.blocks.filter((b) => b.ch === "F").map((b) => [b.c + 5.6, 7.2, b.r + 2]);
        this.lamps = L.lanterns.map(([x, z]) => s.add([mesh("glow", { unlit: true, shadow: false }), pos(x, 2.05, z)]));

        this.clouds = [];
        for (let i = 0; i < 9; i++) {
            const h = (i * 37) % 100 / 100, x = -14 + h * (L.w + 30), z = L.h + 8 + ((i * 53) % 100) / 100 * 22, big = 0.6 + h * 0.6;
            const c = s.add([mesh(`cloud_${i % 2}`, { size: [15 * big, 4.5 * big, 9 * big], shadow: false }), pos(x, -13 - h * 6, z)]);
            c.opacity = 0.82;
            c.spd = 0.25 + h * 0.3;
            this.clouds.push(c);
        }

        // Dog
        this.dog = { x: L.dog[0], z: L.dog[1], vx: 0, vz: 0, y: 0, vy: 0, yaw: 0, t: 0, skid: 0, stun: 0, idle: 0, barkT: 0, lean: 0, puff: 0, hit: 0, zoom: 0 };
        this.buildDog();

        // Flock
        const n = def.sheep + L.rams.length, N = n + 4;
        this.n = n; this.total = n;
        const F = (size = N) => new Float32Array(size);
        Object.assign(this, { px: F(), pz: F(), vx: F(), vz: F(), py: F(), vy: F(), yaw: F(), panic: F(), al: F(), ph: F(), gz: F(), wa: F(), jt: F(), j0x: F(), j0z: F(), j1x: F(), j1z: F(), spin: F(), jam: F() });
        this.st = new Uint8Array(N); this.isRam = new Uint8Array(N); this.ents = new Array(n); this.kind = new Array(n); this.fr = new Int8Array(N).fill(-1);
        this.nogo = new Uint8Array(N);
        const rng = game.rng, spawns = rng.shuffle([...L.spawns]);
        for (let i = 0; i < n; i++) {
            const ram = i >= def.sheep, p = ram ? L.rams[i - def.sheep] : spawns[i % spawns.length];
            this.px[i] = p[0] + (ram ? 0 : rng.range(-0.3, 0.3)); this.pz[i] = p[1] + (ram ? 0 : rng.range(-0.3, 0.3));
            this.yaw[i] = rng.range(-3, 3); this.wa[i] = rng.range(-3, 3); this.ph[i] = rng.range(0, 6); this.gz[i] = rng.range(0, 6);
            this.isRam[i] = ram ? 1 : 0;
            const black = !ram && n > 10 && i % 13 === 7;
            const kind = ram ? "ram" : black ? "blk" : "sheep", lamb = !ram && !black && i % 7 === 3;
            this.kind[i] = kind;
            const e = s.add([mesh(`${kind}_stand`), pos(this.px[i], 0, this.pz[i]), rot(0, this.yaw[i], 0)]);
            e.base = lamb ? 0.76 : 1 + ((i * 7) % 5 - 2) * 0.03;
            e.scale = e.base;
            this.ents[i] = e;
        }
        this.head = new Int16Array(Math.ceil(L.w / CELL + 2) * Math.ceil(L.h / CELL + 2));
        this.next = new Int16Array(N);
        this.gridW = Math.ceil(L.w / CELL + 2);
        this.entry = new Uint8Array(L.w * L.h);
        for (const [c, r] of L.entry) this.entry[c + r * L.w] = 1;
        this.buildSlots();

        // Wolves
        this.wolves = [];
        if (def.wolves) L.dens.forEach((d, i) => { if (i < (def.wolves.max ?? 9)) this.addWolf(d, def.wolves.first + i * def.wolves.every * 0.5); });
        // Bull
        this.bull = null;
        if (L.bull) this.addBull();
        // Rickety fence
        this.weak = L.weak.map(([c, r]) => ({ c, r, e: s.add([mesh("weak"), pos(c + 0.5, 0, r + 0.5)]) }));
        // Hens
        this.hens = [];
        if (def.title || (key % 2 === 1)) {
            for (let i = 0; i < 4; i++) {
                let x = 0, z = 0, ok = false;
                for (let t = 0; t < 40 && !ok; t++) { x = rng.range(1, L.w - 1); z = rng.range(1, L.h - 1); ok = L.block[(x | 0) + (z | 0) * L.w] === 0 && L.at(x | 0, z | 0) === "."; }
                if (!ok) continue;
                this.hens.push({ e: s.add([mesh("hen_0"), pos(x, 0, z), rot(0, rng.range(-3, 3), 0)]), x, z, vx: 0, vz: 0, y: 0, vy: 0, t: rng.range(0, 3) });
            }
        }
        // Bark shockwave rings, reused
        this.rings = [0, 1].map(() => { const e = s.add([mesh("ring", { unlit: true, shadow: false, color: "#fff7d6" }), pos(0, 0.1, 0)]); e.hidden = true; e.t = 9; return e; });
        // Lightning, a chain of bright boxes
        this.bolt = [];
        if (def.storm) {
            for (let i = 0; i < 8; i++) { const e = s.add([mesh("box", { unlit: true, shadow: false, color: "#fdfaff" }), pos(0, 0, 0)]); e.hidden = true; this.bolt.push(e); }
            this.nextBolt = def.storm.first; this.boltT = 0;
            for (let i = 0; i < 70; i++) this.rain.push({ x: game.fxRng.range(0, 1), y: game.fxRng.range(0, 1), v: game.fxRng.range(1.1, 1.8) });
        }
        this.fireflies = [];
        if (def.mood === "night") for (let i = 0; i < 16; i++) {
            const e = s.add([mesh("box", { size: 0.09, unlit: true, shadow: false, color: "#fff27a" }), pos(game.fxRng.range(1, L.w - 1), 0.7, game.fxRng.range(1, L.h - 1))]);
            e.t = game.fxRng.range(0, 9); e.ox = e.pos.x; e.oz = e.pos.z;
            this.fireflies.push(e);
        }

        // Camera rig: cam3.follow with speed 0 keeps render interpolation, which cam3.set() would reset.
        this.focus = { x: this.dog.x, z: this.dog.z - 3 };
        this.rig = s.add([dim(3), pos(this.focus.x, 0, this.focus.z)]);
        this.camD = 22;
        s.cam3.fov = 30; s.cam3.fovAxis = "min"; s.cam3.far = 140;
        this.applyCam();
        s.cam3.follow(this.rig, { offset: s.cam3.offset, look: s.cam3.lookOffset, speed: 0 });
        s.light.shadowRange = 20;
        this.applyMood(0);
        s.on("resize", () => this.applyCam());
        this.prog = 0;
    }

    buildDog() {
        const s = this.s, d = this.dog;
        const root = s.add([dim(3), pos(d.x, 0, d.z), rot(0, 0, 0), { scale: 1.18 }]);
        d.root = root;
        d.body = root.child([mesh("dog_body"), pos(0, 0.52, 0)]);
        d.head = root.child([mesh("dog_head0"), pos(0, 0.76, -0.4)]);
        d.earL = d.head.child([mesh("dog_ear"), pos(-0.28, 0.27, 0.06), rot(0, 0, 0.5)]);
        d.earR = d.head.child([mesh("dog_ear"), pos(0.28, 0.27, 0.06), rot(0, 0, -0.5)]);
        d.tail = d.body.child([mesh("dog_tail"), pos(0, 0.16, 0.42)]);
        d.legs = [[-0.17, -0.3, "dog_legf"], [0.17, -0.3, "dog_legf"], [-0.19, 0.31, "dog_legb"], [0.19, 0.31, "dog_legb"]].map(([x, z, m]) => root.child([mesh(m), pos(x, 0.47, z)]));
    }

    buildSlots() {
        const p = this.L.pen.inner, sp = 0.72, out = [];
        const rng = this.game.rng;
        for (let z = p.z0; z <= p.z1 + 0.01; z += sp) for (let x = p.x0; x <= p.x1 + 0.01; x += sp) out.push([x + rng.range(-0.1, 0.1), z + rng.range(-0.1, 0.1)]);
        this.slots = rng.shuffle(out);
        this.slotI = 0;
    }

    slot() {
        const a = this.slots[this.slotI++ % this.slots.length];
        return a;
    }

    addWolf(den, delay) {
        const e = this.s.add([mesh("wolf_0"), pos(den[0], -3, den[1])]);
        const eyes = e.child([mesh("wolf_eyes", { unlit: true, shadow: false }), pos(0, 0.92, -0.86)]);
        eyes.hidden = true;
        this.wolves.push({ e, eyes, x: den[0], z: den[1], y: -3, vx: 0, vz: 0, st: "lurk", t: delay, den, prey: -1, yaw: 0, ph: 0, fr: -1 });
    }

    addBull() {
        const [x, z] = this.L.bull;
        const e = this.s.add([mesh("bull_0"), pos(x, 0, z)]);
        this.bull = { e, x, z, home: [x, z], st: "graze", t: 2, yaw: 0, ph: 0, dx: 0, dz: 0, cool: 3, tx: x, tz: z, fr: 0, shake: 0 };
    }

    // --- Collision against tile boxes ---------------------------------------------------------------------
    /** Push a circle out of the static boxes. Sets this.ox, this.oz and this.hit. */
    resolve(x, z, r) {
        const L = this.L, w = L.w, h = L.h;
        this.hit = false;
        if (x < r) { x = r; this.hit = true; } else if (x > w - r) { x = w - r; this.hit = true; }
        if (z < r) { z = r; this.hit = true; } else if (z > h - r) { z = h - r; this.hit = true; }
        const c0 = Math.max(0, Math.floor(x - r)), c1 = Math.min(w - 1, Math.floor(x + r)), r0 = Math.max(0, Math.floor(z - r)), r1 = Math.min(h - 1, Math.floor(z + r));
        for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
            const b = L.boxes[cc + rr * w];
            if (!b) continue;
            for (let i = 0; i < b.length; i += 4) {
                const nx = x < b[i] ? b[i] : x > b[i + 2] ? b[i + 2] : x, nz = z < b[i + 1] ? b[i + 1] : z > b[i + 3] ? b[i + 3] : z;
                const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
                if (d2 >= r * r) continue;
                this.hit = true;
                if (d2 > 1e-8) { const d = Math.sqrt(d2), k = r / d; x = nx + dx * k; z = nz + dz * k; }
                else { // centre inside: leave by the nearest side
                    const l = x - b[i], rt = b[i + 2] - x, t = z - b[i + 1], bt = b[i + 3] - z, m = Math.min(l, rt, t, bt);
                    if (m === l) x = b[i] - r; else if (m === rt) x = b[i + 2] + r; else if (m === t) z = b[i + 1] - r; else z = b[i + 3] + r;
                }
            }
        }
        this.ox = x; this.oz = z;
    }
    blocked(x, z) {
        const L = this.L;
        if (x < 0 || z < 0 || x >= L.w || z >= L.h) return true;
        return L.block[(x | 0) + (z | 0) * L.w] === 1 && L.boxes[(x | 0) + (z | 0) * L.w]?.length > 0;
    }

    // --- Effects ---------------------------------------------------------------------------------------------
    /** A comic pop-up in the 2D layer: text or a sprite at a world point. */
    pop(x, y, z, text, o = {}) {
        if (this.pops.length > 24) this.pops.shift();
        this.pops.push({ x, y, z, text, sprite: o.sprite, color: o.color ?? "#ffffff", size: o.size ?? 15, t: 0, life: o.life ?? 0.9, rise: o.rise ?? 44, w: o.w ?? 96 });
    }
    wool(x, y, z, n = 4) {
        this.s.burst({ at: [x, y, z], dim: 3, count: n, color: ["#fff9ee", "#efe6d6"], speed: [1, 3], life: [0.3, 0.6], size: [0.1, 0.2], gravity: 0.2 });
    }
    dust(x, z, n = 3) {
        this.s.burst({ at: [x, 0.12, z], dim: 3, count: n, color: ["#e6d3a8", "#d4bb8a", "#f1e6cb"], speed: [0.6, 1.8], life: [0.22, 0.5], size: [0.1, 0.22], gravity: 0.08 });
    }
    bleat(i, force = false) {
        const t = this.elapsed;
        if (!force && t < this.bleatAt) return;
        this.bleatAt = t + 0.16;
        const fx = this.game.fxRng;
        sfx.bleat(this.game, fx.range(0.82, 1.3) * (this.ents[i].base < 0.9 ? 1.35 : 1), !!this.isRam[i]);
    }

    // --- Bark -----------------------------------------------------------------------------------------------
    bark() {
        const d = this.dog, s = this.s, game = this.game, fx = game.fxRng;
        if (this.elapsed - this.lastBark < 0.5 || d.stun > 0) return;
        this.lastBark = this.elapsed;
        d.barkT = 0.28; d.vy = 2.8;
        sfx.bark(game, fx.range(0.95, 1.12));
        s.shake(0.09, 0.14);
        game.vibrate(14);
        for (const r of this.rings) if (r.t >= 0.5) { r.t = 0; r.hidden = false; r.pos.x = d.x; r.pos.z = d.z; break; }
        this.pop(d.x, 1.4, d.z, "", { sprite: "woof", life: 0.5, rise: 34, w: 84 });
        let hit = 0;
        for (let i = 0; i < this.n; i++) {
            if (this.st[i] !== ROAM) continue;
            const dx = this.px[i] - d.x, dz = this.pz[i] - d.z, dd = Math.hypot(dx, dz) || 0.01;
            if (dd > BARK_R) continue;
            const k = 1 - dd / BARK_R, ram = this.isRam[i];
            this.panic[i] = ram ? 0.75 : 0.7 + k * 0.9;
            this.al[i] = 1;
            const imp = ram ? 5 : 3 + k * 5;
            this.vx[i] += dx / dd * imp; this.vz[i] += dz / dd * imp;
            if (this.py[i] < 0.05) this.vy[i] = (ram ? 2.5 : 3.4 + k * 3.2) * (0.8 + hit % 3 * 0.2);
            hit++;
            if (hit % 4 === 1) this.wool(this.px[i], 0.6, this.pz[i], 2);
            if (hit < 6 && !this.attract) this.pop(this.px[i], 1.2, this.pz[i], ram ? "HMPH!" : fx.pick(["BAA!", "MEH!", "EEP!", "AAH!"]), { size: 12, color: ram ? "#ffd27a" : "#ffffff", life: 0.6, rise: 30 });
        }
        if (hit) this.bleat(0, true);
        for (const w of this.wolves) {
            if (w.st === "lurk" || w.st === "flee") continue;
            if (Math.hypot(w.x - d.x, w.z - d.z) < BARK_R + 1) this.scareWolf(w);
        }
        const b = this.bull;
        if (b && b.st === "graze" && Math.hypot(b.x - d.x, b.z - d.z) < BARK_R + 2) { b.st = "warn"; b.t = 0.75; sfx.snort(game); this.pop(b.x, 2.5, b.z, "!", { size: 30, color: "#ff5040", life: 0.7 }); }
        this.emitHen(d.x, d.z);
    }
    emitHen(x, z) {
        for (const h of this.hens) if (Math.hypot(h.x - x, h.z - z) < 5) { h.vy = 4; h.vx = (h.x - x) * 2; h.vz = (h.z - z) * 2; }
    }
    scareWolf(w) {
        if (w.prey >= 0) { this.dropPrey(w); }
        w.st = "flee"; w.t = 6;
        sfx.yelp(this.game);
        this.pop(w.x, 1.5, w.z, "YIPE!", { size: 14, color: "#cbd5ff" });
    }
    dropPrey(w) {
        const i = w.prey;
        w.prey = -1;
        if (i < 0 || this.st[i] !== CARRIED) return;
        this.st[i] = AIR; this.py[i] = 0.6; this.vy[i] = 5; this.vx[i] = (w.x - this.dog.x) * 0.2; this.vz[i] = (w.z - this.dog.z) * 0.2; this.spin[i] = 8; this.panic[i] = 1;
        this.bleat(i, true);
        this.pop(this.px[i], 1.4, this.pz[i], "PHEW!", { size: 13, color: "#d8ffb0" });
    }

    // --- The main step ----------------------------------------------------------------------------------------
    step(dt, mx, mz, barking) {
        this.elapsed += dt;
        const def = this.def;
        const running = !this.finished && !this.attract && this.elapsed > this.intro;
        if (running) {
            this.time -= dt;
            if (this.time <= 0) { this.time = 0; this.finish(); }
        }
        if (!this.hurry && !this.attract && this.time < 16 && !this.finished) { this.hurry = true; this.onHurry?.(); }
        this.prog = this.attract ? def.start : clamp(def.start + (this.elapsed / def.time) * (1 - def.start), 0, 1);
        if ((this.game.stepCount & 3) === 0) this.applyMood(this.prog);
        const canPlay = !this.finished && this.elapsed > 0.4;
        if (this.finished && this.result?.won) { const m = this.victory(dt); mx = m[0]; mz = m[1]; }
        else if (!canPlay) { mx = 0; mz = 0; }
        this.stepDog(dt, mx, mz);
        if (barking && canPlay) this.bark();
        this.stepFlock(dt);
        if (!this.attract || def.title) { this.stepWolves(dt); if (this.bull) this.stepBull(dt); }
        if (def.storm && !this.finished) this.stepStorm(dt);
        this.stepAmbient(dt);
        this.stepCamera(dt);
        if (!this.finished && !this.attract && this.saved + this.lost >= this.total) this.finish();
    }

    finish() {
        if (this.finished) return;
        this.finished = true;
        const def = this.def, took = this.elapsed - this.intro, won = this.saved >= def.need;
        const a = won, b = won && this.saved >= this.total, c = won && took <= def.par;
        this.stars = (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0);
        this.result = { won, a, b, c, took, saved: this.saved, total: this.total, lost: this.lost, stars: this.stars };
        this.onDone?.(this.result);
    }

    /** Zoomies round in front of the pen, then a proud sit. */
    victory(dt) {
        const d = this.dog, L = this.L, mid = L.pen.mid ?? [L.w / 2, L.h / 2], fw = L.pen.r1 < mid[1] ? 1 : -1;
        const cx = mid[0], cz = mid[1] + fw * 2.4;
        this.lap = (this.lap ?? 0) + dt;
        if (Math.hypot(cx - d.x, cz - d.z) > 3.2 && this.lap < 8 && !this.lapOn) return [(cx - d.x) / 4, (cz - d.z) / 4].map((v) => Math.max(-1, Math.min(1, v * 2)));
        if (!this.lapOn) { this.lapOn = this.lap; }
        const t = this.lap - this.lapOn;
        if (t > 3.2) return [0, 0];
        if (t > 3 && !this.wooed) { this.wooed = true; this.bark(); }
        const a = t * 4.2, tx = cx + Math.cos(a) * 1.8, tz = cz + Math.sin(a) * 1.3;
        return [Math.max(-1, Math.min(1, (tx - d.x) * 0.9)), Math.max(-1, Math.min(1, (tz - d.z) * 0.9))];
    }

    stepDog(dt, mx, mz) {
        const d = this.dog, game = this.game;
        const len = Math.hypot(mx, mz);
        if (len > 1) { mx /= len; mz /= len; }
        d.barkT -= dt;
        let wantX = mx * DOG_MAX, wantZ = mz * DOG_MAX;
        const sp = Math.hypot(d.vx, d.vz);
        if (d.stun > 0) { d.stun -= dt; wantX = wantZ = 0; }
        const dot = d.vx * wantX + d.vz * wantZ;
        const reversing = dot < 0 && sp > 3.8;
        const accel = d.stun > 0 ? 8 : reversing ? 26 : len > 0.05 ? 58 : 30;
        const dvx = wantX - d.vx, dvz = wantZ - d.vz, dl = Math.hypot(dvx, dvz) || 1, stepA = Math.min(dl, accel * dt);
        d.vx += dvx / dl * stepA; d.vz += dvz / dl * stepA;
        if (reversing || (len < 0.05 && sp > 5.4)) {
            if (d.skid <= 0) { sfx.skid(game); d.lean = clamp((d.vx * Math.cos(d.yaw) - d.vz * Math.sin(d.yaw)) * 0.06, -0.5, 0.5); }
            d.skid = 0.22;
        }
        d.skid -= dt;
        d.x += d.vx * dt; d.z += d.vz * dt;
        this.resolve(d.x, d.z, DOG_R);
        if (this.hit) { const nx = this.ox - d.x, nz = this.oz - d.z; if (nx) d.vx *= 0.3; if (nz) d.vz *= 0.3; }
        d.x = this.ox; d.z = this.oz;
        // gravity for hops
        if (d.y > 0 || d.vy > 0) { d.vy -= 26 * dt; d.y += d.vy * dt; if (d.y <= 0) { d.y = 0; d.vy = 0; } }
        const s = Math.hypot(d.vx, d.vz), root = d.root;
        if (s > 0.4) {
            const want = Math.atan2(-d.vx, -d.vz);
            let da = want - d.yaw;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            d.yaw += da * Math.min(1, dt * (d.skid > 0 ? 7 : 16));
        }
        root.pos.x = d.x; root.pos.z = d.z;
        root.rot.y = d.yaw;
        d.t += dt * (3 + s * 2.2);
        const gait = Math.sin(d.t), g2 = Math.sin(d.t + 1.1), k = clamp(s / 3, 0, 1), now = this.elapsed;
        const breathe = Math.sin(now * 5) * 0.012;
        root.pos.y = d.y + (s > 1 ? Math.abs(Math.sin(d.t)) * 0.13 * k : 0);
        const sit = d.idle > 2.2 && d.barkT <= 0;
        d.idle = s < 0.3 ? d.idle + dt : 0;
        if (d.stun > 0) { // flat out with the eyes crossed
            root.rot.z = Math.sin(now * 18) * 0.12; d.head.mesh = "dog_head3";
            root.rot.x = 0;
            if (Math.floor(now * 6) !== Math.floor((now - dt) * 6)) this.pop(d.x + Math.cos(now * 9) * 0.5, 1.3, d.z + Math.sin(now * 9) * 0.4, "*", { size: 18, color: "#ffe066", life: 0.4, rise: 12 });
        } else {
            d.head.mesh = d.barkT > 0 ? "dog_head1" : (s > 4 ? "dog_head2" : "dog_head0");
            const skidding = d.skid > 0;
            root.rot.z += ((skidding ? d.lean : 0) - root.rot.z) * Math.min(1, dt * 14);
            const pitch = skidding ? 0.28 : sit ? -0.32 : -gait * 0.11 * k;
            root.rot.x += (pitch - root.rot.x) * Math.min(1, dt * 18);
        }
        d.legs[0].rot.x = d.legs[1].rot.x = sit ? 0.32 : d.skid > 0 ? -0.95 : gait * 1.05 * k;
        d.legs[1].rot.x += sit ? 0 : 0.2 * k;
        d.legs[2].rot.x = d.legs[3].rot.x = sit ? -1.15 : d.skid > 0 ? 0.6 : -g2 * 1.05 * k;
        d.legs[3].rot.x -= sit ? 0 : 0.2 * k;
        d.legs[2].pos.y = d.legs[3].pos.y = sit ? 0.33 : 0.47;
        d.body.rot.x = sit ? 0.34 : 0;
        d.body.pos.y = (sit ? 0.45 : 0.52) + breathe;
        d.head.pos.y = (sit ? 0.86 : 0.76) + breathe * 1.5 + (s > 1 ? Math.sin(d.t + 0.8) * 0.03 : 0);
        d.head.rot.x = d.barkT > 0 ? 0.42 : sit ? 0.12 : 0;
        d.head.rot.z = sit ? Math.sin(now * 0.9) * 0.18 : 0;
        const flap = s > 1 ? Math.sin(d.t * 1.5) * 0.35 : Math.sin(now * 3) * 0.05;
        const earUp = d.barkT > 0 ? -0.5 : 0.1 + clamp(s / DOG_MAX, 0, 1) * 0.5;
        d.earL.rot.z = 0.5 - earUp + flap * 0.4; d.earR.rot.z = -0.5 + earUp - flap * 0.4;
        d.earL.rot.x = d.earR.rot.x = 0.25 + clamp(s / DOG_MAX, 0, 1) * 0.5;
        d.tail.rot.y = Math.sin(now * (s < 1 ? 20 : 13)) * (s < 1 ? 0.75 : 0.42);
        d.tail.rot.x = s > 4 ? -0.35 : 0.1;
        if (s > 5 && (d.puff -= dt) < 0) { d.puff = 0.09; this.dust(d.x, d.z, 1); }
        if (d.skid > 0 && (d.hit -= dt) < 0) { d.hit = 0.04; this.dust(d.x, d.z, 2); }
    }

    stepFlock(dt) {
        const n = this.n, st = this.st, { px, pz, vx, vz, py, vy, panic, al, gz, wa, isRam, head, next, gridW, jam } = this;
        const d = this.dog, L = this.L, rng = this.game.rng, now = this.elapsed;
        head.fill(-1);
        for (let i = 0; i < n; i++) {
            if (st[i] !== ROAM) continue;
            const c = (px[i] / CELL | 0) + (pz[i] / CELL | 0) * gridW;
            next[i] = head[c]; head[c] = i;
        }
        const threats = [];
        for (const w of this.wolves) if (w.st === "hunt" || w.st === "carry") threats.push(w);
        if (this.bull && this.bull.st !== "stun") threats.push(this.bull);
        for (let i = 0; i < n; i++) {
            const s = st[i];
            if (s === JUMP) { this.stepJump(i, dt); continue; }
            if (s === PEN) { this.stepPenned(i, dt); continue; }
            if (s === CARRIED || s === LOST) continue;
            if (s === AIR) { this.stepAir(i, dt); continue; }
            let x = px[i], z = pz[i], ux = vx[i], uz = vz[i], ax = 0, az = 0;
            const ram = isRam[i], r = ram ? RAM_R : SHEEP_R;
            let cx = 0, cz = 0, ax2 = 0, az2 = 0, cnt = 0, topAl = 0;
            const gc = x / CELL | 0, gr = z / CELL | 0;
            for (let rr = gr - 1; rr <= gr + 1; rr++) {
                if (rr < 0) continue;
                for (let cc = gc - 1; cc <= gc + 1; cc++) {
                    if (cc < 0 || cc >= gridW) continue;
                    const id = cc + rr * gridW;
                    if (id >= head.length) continue;
                    for (let j = head[id]; j >= 0; j = next[j]) {
                        if (j === i) continue;
                        const dx = px[j] - x, dz = pz[j] - z, dd = dx * dx + dz * dz;
                        if (dd > 4.4) continue;
                        cx += dx; cz += dz; ax2 += vx[j]; az2 += vz[j]; cnt++;
                        if (al[j] > topAl) topAl = al[j];
                        const minD = r + (isRam[j] ? RAM_R : SHEEP_R);
                        if (dd < minD * minD * 1.8) {
                            const dist = Math.sqrt(dd) || 0.01, k = (1 - dist / (minD * 1.34)) * 42;
                            ax -= dx / dist * k; az -= dz / dist * k;
                            if (dist < minD && !ram) { // hard contact, so a blob stays a blob
                                const push = (minD - dist) * (isRam[j] ? 0.9 : 0.5);
                                x -= dx / dist * push; z -= dz / dist * push;
                            }
                        }
                    }
                }
            }
            // Dog
            const ddx = x - d.x, ddz = z - d.z, dist = Math.sqrt(ddx * ddx + ddz * ddz) || 0.01;
            let a = al[i] - dt * 0.55;
            if (a < topAl * 0.8 - 0.02) a = topAl * 0.8 - 0.02;
            if (!ram) {
                if (dist < FEAR) {
                    const f = 1 - dist / FEAR;
                    ax += ddx / dist * f * 44; az += ddz / dist * f * 44;
                    if (f > a) a = f < 0.3 ? a + 0.04 : Math.max(a, f + 0.3);
                }
                for (const t of threats) {
                    const tx = x - t.x, tz = z - t.z, q = Math.hypot(tx, tz) || 0.01, far = 4;
                    if (q < far) { const f = 1 - q / far; ax += tx / q * f * 50; az += tz / q * f * 50; a = 1; }
                }
            }
            if (dist < 0.8) { // dog ran into it: boing
                const k = 0.8 - dist, spd = Math.hypot(d.vx, d.vz);
                if (ram) {
                    d.x -= ddx / dist * k; d.z -= ddz / dist * k;
                    d.vx *= 0.4; d.vz *= 0.4;
                    if (spd > 3.5 && now - (this.nopeAt ?? -9) > 1.1) { this.nopeAt = now; this.pop(x, 1.5, z, "NOPE.", { size: 15, color: "#ffd27a" }); sfx.boing(this.game); d.vx = -ddx / dist * 7; d.vz = -ddz / dist * 7; d.vy = 3; }
                } else {
                    x += ddx / dist * k; z += ddz / dist * k;
                    if (spd > 4.5 && py[i] < 0.02) { vy[i] = 3.6; ux += d.vx * 0.4; uz += d.vz * 0.4; a = 1; this.bleat(i); if (rng.chance(0.3)) sfx.boing(this.game); }
                }
            }
            al[i] = a < 0 ? 0 : a > 1 ? 1 : a;
            // Cornered by the dog with nowhere to go: bolt past it, wide-eyed.
            if (!ram && dist < 2.4 && dist > 0.4 && ux * ux + uz * uz < 0.5) {
                jam[i] += dt;
                if (jam[i] > 0.6) {
                    jam[i] = 0;
                    const L2 = this.L, side = ((L2.w / 2 - x) * -ddz + (L2.h / 2 - z) * ddx) > 0 ? 1 : -1;
                    ux = -ddz / dist * side * 7 + ddx / dist; uz = ddx / dist * side * 7 + ddz / dist;
                    vy[i] = 4.6; panic[i] = 0.5;
                    this.bleat(i);
                    this.pop(x, 1.2, z, "EEK!", { size: 12, life: 0.6, rise: 26 });
                }
            } else jam[i] = 0;
            let p = panic[i];
            if (p > 0) { p -= dt; panic[i] = p; }
            const calm = al[i] < 0.06 && p <= 0;
            let maxV;
            if (ram) {
                maxV = p > 0 ? 3.6 : 0;
                if (p > 0 && cnt >= 0) { /* straight line: rams don't follow the crowd */ }
            } else {
                if (cnt) {
                    const w = calm ? 0.85 : 1.8, invc = 1 / cnt;
                    ax += cx * invc * w; az += cz * invc * w;
                    if (!calm) { ax += (ax2 * invc - ux) * 2.2; az += (az2 * invc - uz) * 2.2; }
                }
                maxV = p > 0 ? PANIC_V : lerp(CALM_V, ALERT_V, al[i]);
                if (calm) {
                    gz[i] -= dt;
                    if (gz[i] < -3) { gz[i] = rng.range(1.5, 6); wa[i] = rng.range(-3.14, 3.14); }
                    if (gz[i] < 0) { ax -= Math.sin(wa[i]) * 3; az -= Math.cos(wa[i]) * 3; }
                    else { ax -= ux * 6; az -= uz * 6; if (!cnt || cx * cx + cz * cz > cnt * cnt * 3) { ax += cx * 0.06; az += cz * 0.06; } }
                }
            }
            if (!ram) {
                // feel ahead for walls and slide along them
                const sp = Math.hypot(ux, uz);
                if (sp > 0.5) {
                    const nx = ux / sp, nz = uz / sp;
                    if (this.blocked(x + nx * 0.95, z + nz * 0.95)) {
                        const lx = -nz, lz = nx, leftOpen = !this.blocked(x + (nx + lx) * 0.8, z + (nz + lz) * 0.8), rightOpen = !this.blocked(x + (nx - lx) * 0.8, z + (nz - lz) * 0.8);
                        const side = leftOpen && !rightOpen ? 1 : rightOpen && !leftOpen ? -1 : hashSide(i, now);
                        ax += lx * side * 22 - nx * 10; az += lz * side * 22 - nz * 10;
                    }
                }
            }
            if (this.def.storm) ax += Math.sin(now * 0.4) * 0.8;
            ux += ax * dt; uz += az * dt;
            const damp = calm ? 2.5 : ram ? 3 : p > 0 ? 0.6 : 1.3, k = Math.exp(-damp * dt);
            ux *= k; uz *= k;
            const sp2 = ux * ux + uz * uz;
            if (sp2 > maxV * maxV) { const q = maxV / Math.sqrt(sp2); ux = ux * (1 - 0.18) + ux * q * 0.18; uz = uz * (1 - 0.18) + uz * q * 0.18; if (maxV === 0) { ux *= 0.7; uz *= 0.7; } }
            x += ux * dt; z += uz * dt;
            this.resolve(x, z, r);
            if (this.hit) { ux += (this.ox - x) / dt * 0.4; uz += (this.oz - z) / dt * 0.4; }
            x = this.ox; z = this.oz;
            px[i] = x; pz[i] = z; vx[i] = ux; vz[i] = uz;
            // entered the pen zone
            if (this.entry[(x | 0) + (z | 0) * L.w] && !this.attract || this.entry[(x | 0) + (z | 0) * L.w] && this.def.title) { this.startJump(i); continue; }
            this.drawSheep(i, dt, Math.hypot(ux, uz), p);
        }
    }

    drawSheep(i, dt, sp, p) {
        const { px, pz, py, vy, yaw, ph, gz, st, kind, fr } = this, e = this.ents[i];
        if (py[i] > 0 || vy[i] > 0) { vy[i] -= 22 * dt; py[i] += vy[i] * dt; if (py[i] <= 0) { py[i] = 0; if (vy[i] < -4.5) { vy[i] = -vy[i] * 0.28; } else vy[i] = 0; } }
        if (sp > 0.25) {
            const want = Math.atan2(-this.vx[i], -this.vz[i]);
            let da = want - yaw[i];
            while (da > 3.1416) da -= 6.2832;
            while (da < -3.1416) da += 6.2832;
            yaw[i] += da * Math.min(1, dt * (p > 0 ? 12 : 7));
            if (yaw[i] > 3.1416) yaw[i] -= 6.2832; else if (yaw[i] < -3.1416) yaw[i] += 6.2832;
        }
        ph[i] += dt * (4 + sp * 3.2);
        const air = py[i] > 0.2, panicked = p > 0 || this.al[i] > 0.82;
        let f; // 0 stand 1 a 2 b 3 pa 4 pb 5 graze 6 fly
        if (air) f = 6;
        else if (panicked && sp > 0.5) f = Math.sin(ph[i]) > 0 ? 3 : 4;
        else if (sp > 0.28) f = Math.sin(ph[i]) > 0 ? 1 : 2;
        else f = gz[i] > 0.8 && !this.isRam[i] && this.al[i] < 0.05 ? 5 : 0;
        if (f !== fr[i]) { fr[i] = f; e.mesh = FRAMES[kind[i]][f]; }
        const bob = sp > 0.28 ? Math.abs(Math.sin(ph[i])) * (panicked ? 0.24 : 0.09) : 0;
        e.pos.x = px[i]; e.pos.z = pz[i]; e.pos.y = py[i] + bob;
        e.rot.y = yaw[i];
        const b = e.base, s = sp > 0.28 ? Math.sin(ph[i] * 2) * 0.05 : Math.sin(ph[i] * 0.25 + i) * 0.012;
        const land = vy[i] < 0 ? 0.08 : 0;
        e.scale.x = b * (1 - s + land); e.scale.y = b * (1 + s - land * 2 + (air ? 0.08 : 0)); e.scale.z = b * (1 - s + land + (panicked ? 0.04 : 0));
        e.rot.x = 0; e.rot.z = panicked ? Math.sin(ph[i] * 0.7) * 0.1 : 0;
    }

    startJump(i) {
        const { st, px, pz, j0x, j0z, j1x, j1z, jt, spin } = this;
        st[i] = JUMP; jt[i] = 0;
        j0x[i] = px[i]; j0z[i] = pz[i];
        const [x, z] = this.slot();
        j1x[i] = x; j1z[i] = z;
        spin[i] = this.game.fxRng.chance(0.3) ? (this.game.fxRng.chance(0.5) ? 6.283 : -6.283) : 0;
        this.ents[i].mesh = FRAMES[this.kind[i]][6];
        this.fr[i] = 6;
        this.bleat(i);
        sfx.whoosh(this.game);
    }
    stepJump(i, dt) {
        const { jt, j0x, j0z, j1x, j1z, spin, px, pz, yaw } = this, e = this.ents[i];
        const dur = 0.72;
        jt[i] += dt / dur;
        const t = Math.min(1, jt[i]), dist = Math.hypot(j1x[i] - j0x[i], j1z[i] - j0z[i]), hh = 1.6 + dist * 0.28;
        e.pos.x = lerp(j0x[i], j1x[i], t); e.pos.z = lerp(j0z[i], j1z[i], t); e.pos.y = 4 * hh * t * (1 - t);
        px[i] = e.pos.x; pz[i] = e.pos.z;
        e.rot.x = spin[i] * t;
        const want = Math.atan2(-(j1x[i] - j0x[i]), -(j1z[i] - j0z[i]));
        e.rot.y = want; yaw[i] = want;
        const stretch = Math.sin(t * Math.PI) * 0.16;
        e.scale.x = e.base * (1 - stretch * 0.5); e.scale.z = e.base * (1 + stretch); e.scale.y = e.base;
        if (t >= 1) this.landInPen(i);
    }
    landInPen(i) {
        const e = this.ents[i], game = this.game;
        this.st[i] = PEN;
        e.rot.x = 0; e.pos.y = 0;
        this.saved++;
        sfx.pop(game, this.saved - 1);
        game.vibrate(8);
        this.s.burst({ at: [e.pos.x, 0.5, e.pos.z], dim: 3, count: 8, color: ["#ffe066", "#ff9fb2", "#8fe388", "#ffffff"], speed: [2, 4.5], life: [0.3, 0.7], size: [0.09, 0.17], gravity: 0.3 });
        this.pop(e.pos.x, 1.3, e.pos.z, String(this.saved), { size: 15 + Math.min(this.saved, 14), color: "#fff27a", life: 0.8 });
        e.scale.x = e.base * 1.3; e.scale.y = e.base * 0.6; e.scale.z = e.base * 1.3;
        this.s.tween(e, { scale: [e.base, e.base, e.base] }, 0.28, { ease: "outBack" });
        this.fr[i] = 0;
        e.mesh = FRAMES[this.kind[i]][0];
        this.onSaved?.(this.saved, i);
    }
    stepPenned(i, dt) {
        const { py, vy, ph, yaw } = this, e = this.ents[i];
        if (py[i] > 0 || vy[i] > 0) {
            vy[i] -= 20 * dt; py[i] += vy[i] * dt;
            if (py[i] <= 0) { py[i] = 0; vy[i] = 0; }
            e.pos.y = py[i];
        } else if ((ph[i] += dt) > 2.5) {
            ph[i] = this.game.fxRng.range(-2, 2);
            if (this.game.fxRng.chance(0.5)) vy[i] = this.finished ? 5.4 : 3.2; else yaw[i] += this.game.fxRng.range(-1.2, 1.2);
            e.rot.y = yaw[i];
        }
    }
    stepAir(i, dt) {
        const { px, pz, py, vx, vz, vy, spin, st } = this, e = this.ents[i];
        vy[i] -= 22 * dt; py[i] += vy[i] * dt;
        let x = px[i] + vx[i] * dt, z = pz[i] + vz[i] * dt;
        this.resolve(x, z, SHEEP_R);
        x = this.ox; z = this.oz;
        px[i] = x; pz[i] = z;
        e.pos.x = x; e.pos.z = z; e.pos.y = Math.max(0, py[i]);
        e.rot.x += spin[i] * dt;
        if (py[i] <= 0 && vy[i] < 0) {
            py[i] = 0; vy[i] = 0; st[i] = ROAM; e.rot.x = 0; this.al[i] = 1; this.panic[i] = Math.max(this.panic[i], 0.8);
            this.dust(x, z, 3); sfx.boing(this.game);
            this.vx[i] *= 0.3; this.vz[i] *= 0.3;
            if (e.base) { e.scale.x = e.base * 1.25; e.scale.y = e.base * 0.65; e.scale.z = e.base * 1.25; }
        }
    }
    launch(i, dx, dz, up = 8) {
        if (this.st[i] !== ROAM) return;
        this.st[i] = AIR; this.vx[i] = dx; this.vz[i] = dz; this.vy[i] = up; this.py[i] = 0.05; this.spin[i] = 9;
        this.ents[i].mesh = FRAMES[this.kind[i]][6]; this.fr[i] = 6;
        this.bleat(i, true);
        this.wool(this.px[i], 0.6, this.pz[i], 5);
        this.pop(this.px[i], 1.5, this.pz[i], this.game.fxRng.pick(["WHEEE!", "BAAAA!", "OOF!"]), { size: 14, color: "#ffffff", life: 0.8 });
    }

    // --- Wolves -----------------------------------------------------------------------------------------------
    stepWolves(dt) {
        const d = this.dog, def = this.def;
        for (const w of this.wolves) {
            const e = w.e;
            w.ph += dt * 13;
            if (w.st === "lurk") {
                w.t -= dt;
                w.y = -3; e.pos.y = -3;
                if (this.attract || this.finished) continue;
                if (w.t <= 0 && this.activeCount() > 0) {
                    w.st = "hunt"; w.x = w.den[0]; w.z = w.den[1]; w.y = 0; e.teleport(w.x, 0, w.z); e.opacity = 1;
                    w.eyes.hidden = def.mood !== "night" && def.mood !== "gold";
                    sfx.howl(this.game);
                    this.onWolf?.();
                    this.pop(w.x, 2, w.z, "AWOOO!", { size: 16, color: "#cbd5ff", life: 1.2 });
                    this.pickPrey(w);
                }
                continue;
            }
            let tx = w.den[0], tz = w.den[1], sp = 4.9;
            if (w.st === "hunt") {
                if (w.preyT === undefined || (w.preyT -= dt) < 0) { this.pickPrey(w); w.preyT = 0.5; }
                const i = w.prey;
                if (i < 0 || this.st[i] !== ROAM) { w.prey = -1; this.pickPrey(w); if (w.prey < 0) { w.st = "flee"; continue; } }
                else {
                    tx = this.px[i]; tz = this.pz[i];
                    if (Math.hypot(tx - w.x, tz - w.z) < 0.85) { // snatch
                        this.st[i] = CARRIED; this.vx[i] = this.vz[i] = 0;
                        w.st = "carry"; w.prey = i;
                        this.bleat(i, true);
                        this.pop(tx, 1.5, tz, "HELP!", { size: 15, color: "#ff9a9a" });
                        this.ents[i].mesh = FRAMES[this.kind[i]][6]; this.fr[i] = 6;
                    }
                }
            } else if (w.st === "carry") {
                sp = 3.5;
                const i = w.prey, a = Math.sin(this.elapsed * 12) * 0.3;
                this.px[i] = w.x - Math.sin(w.yaw) * 0.95; this.pz[i] = w.z - Math.cos(w.yaw) * 0.95;
                const q = this.ents[i];
                q.pos.x = this.px[i]; q.pos.y = 0.42; q.pos.z = this.pz[i]; q.rot.y = w.yaw + 1.4; q.rot.z = 1.1 + a;
                if (Math.hypot(w.x - w.den[0], w.z - w.den[1]) < 0.7) {
                    this.st[i] = LOST; this.lost++;
                    q.hidden = true;
                    this.pop(w.x, 1.5, w.z, "-1", { size: 20, color: "#ff7070" });
                    w.prey = -1; w.st = "flee"; w.t = 0;
                    this.onLost?.();
                }
            } else if (w.st === "flee") {
                sp = 8.5;
                if (Math.hypot(w.x - w.den[0], w.z - w.den[1]) < 0.8) {
                    w.st = "lurk"; w.t = def.wolves?.every ?? 12; w.prey = -1; w.y = -3;
                    e.pos.y = -3; e.rot.y = 0;
                    continue;
                }
            }
            const dd = Math.hypot(d.x - w.x, d.z - w.z);
            if (dd < 1.1 && (w.st === "hunt" || w.st === "carry")) this.scareWolf(w);
            const dx = tx - w.x, dz = tz - w.z, dl = Math.hypot(dx, dz) || 1;
            w.x += dx / dl * sp * dt; w.z += dz / dl * sp * dt;
            const want = Math.atan2(-dx, -dz);
            let da = want - w.yaw;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            w.yaw += da * Math.min(1, dt * 10);
            const overSolid = this.blocked(w.x, w.z);
            w.y += ((overSolid ? 0.85 : 0) + Math.abs(Math.sin(w.ph)) * 0.14 - w.y) * Math.min(1, dt * 14);
            e.pos.x = w.x; e.pos.y = w.y; e.pos.z = w.z; e.rot.y = w.yaw;
            const f = w.st === "carry" ? 2 : Math.sin(w.ph) > 0 ? 1 : 2;
            if (f !== w.fr) { w.fr = f; e.mesh = `wolf_${f}`; }
        }
    }
    pickPrey(w) {
        let best = -1, bs = -1e9;
        const d = this.dog;
        for (let i = 0; i < this.n; i++) {
            if (this.st[i] !== ROAM || this.isRam[i]) continue;
            const a = Math.hypot(this.px[i] - w.x, this.pz[i] - w.z), b = Math.hypot(this.px[i] - d.x, this.pz[i] - d.z);
            const sc = -a + Math.min(b, 8) * 0.7;
            if (sc > bs) { bs = sc; best = i; }
        }
        w.prey = best;
    }
    activeCount() { let c = 0; for (let i = 0; i < this.n; i++) if (this.st[i] === ROAM) c++; return c; }

    // --- Bull ------------------------------------------------------------------------------------------------
    stepBull(dt) {
        const b = this.bull, d = this.dog, e = b.e, game = this.game;
        const dd = Math.hypot(d.x - b.x, d.z - b.z);
        b.ph += dt * 8;
        b.cool -= dt;
        const face = (tx, tz, rate = 7) => {
            const want = Math.atan2(-(tx - b.x), -(tz - b.z));
            let da = want - b.yaw;
            while (da > Math.PI) da -= Math.PI * 2;
            while (da < -Math.PI) da += Math.PI * 2;
            b.yaw += da * Math.min(1, dt * rate);
        };
        let frame = 0;
        e.rot.z = 0;
        if (b.st === "graze") {
            b.t -= dt;
            if (b.t < 0) { b.t = 2.5 + (b.ph % 2); b.tx = b.home[0] + Math.sin(b.ph) * 3; b.tz = b.home[1] + Math.cos(b.ph * 1.7) * 2; }
            const dx = b.tx - b.x, dz = b.tz - b.z, dl = Math.hypot(dx, dz);
            if (dl > 0.3) {
                b.x += dx / dl * 1.1 * dt; b.z += dz / dl * 1.1 * dt;
                face(b.tx, b.tz, 3);
                frame = Math.sin(b.ph * 0.7) > 0 ? 1 : 2;
                this.resolve(b.x, b.z, 0.95); b.x = this.ox; b.z = this.oz;
            }
            if (dd < (this.weak.some((f) => f.e.alive) ? 5.6 : 3.8) && b.cool <= 0 && d.stun <= 0 && !this.finished) { b.st = "warn"; b.t = 0.95; sfx.snort(game); this.pop(b.x, 2.5, b.z, "!", { size: 30, color: "#ff5040", life: 0.7 }); }
        } else if (b.st === "warn") {
            b.t -= dt;
            face(d.x, d.z, 12);
            frame = 3;
            e.rot.z = Math.sin(this.elapsed * 40) * 0.05;
            e.pos.y = 0;
            if ((game.stepCount & 7) === 0) this.dust(b.x + Math.sin(b.yaw) * -0.9, b.z - Math.cos(b.yaw) * 0.9, 2);
            if (b.t <= 0) {
                const dx = d.x - b.x, dz = d.z - b.z, dl = Math.hypot(dx, dz) || 1;
                b.dx = dx / dl; b.dz = dz / dl; b.st = "charge"; b.t = 2.2;
                sfx.moo(game);
                this.pop(b.x, 2.6, b.z, "MOOOO!", { size: 18, color: "#ffb4a0", life: 0.8 });
            }
        } else if (b.st === "charge") {
            frame = Math.sin(b.ph * 2.5) > 0 ? 1 : 2;
            const sp = 12.5, nx = b.x + b.dx * sp * dt, nz = b.z + b.dz * sp * dt;
            this.resolve(nx, nz, 0.9);
            const wall = this.hit;
            b.x = this.ox; b.z = this.oz;
            b.t -= dt;
            if ((game.stepCount & 1) === 0) this.dust(b.x, b.z, 2);
            for (let i = 0; i < this.n; i++) {
                if (this.st[i] !== ROAM) continue;
                if (Math.hypot(this.px[i] - b.x, this.pz[i] - b.z) < 1.25) {
                    if (this.isRam[i]) continue;
                    this.launch(i, b.dx * 7 + (this.px[i] - b.x) * 5, b.dz * 7 + (this.pz[i] - b.z) * 5, 8 + (i % 3));
                }
            }
            if (dd < 1.15 && d.stun <= 0) {
                d.stun = 1.1; d.vx = b.dx * 12; d.vz = b.dz * 12; d.vy = 8;
                sfx.thud(game); sfx.boing(game); this.s.shake(0.25, 0.3);
                this.pop(d.x, 1.6, d.z, "OOF!", { size: 20, color: "#ffd27a" });
            }
            const broke = this.smashWeak(b.x + b.dx * 0.8, b.z + b.dz * 0.8);
            if (wall || broke || b.t <= 0) {
                b.st = "stun"; b.t = 1.8;
                sfx.thud(game);
                this.s.shake(broke ? 0.45 : 0.25, 0.35);
                this.dust(b.x, b.z, 8);
            }
        } else if (b.st === "stun") {
            b.t -= dt;
            e.rot.z = Math.sin(this.elapsed * 12) * 0.08;
            if ((game.stepCount & 15) === 0) this.pop(b.x + Math.cos(this.elapsed * 7) * 0.8, 2.3, b.z + Math.sin(this.elapsed * 7) * 0.5, "*", { size: 20, color: "#ffe066", life: 0.45, rise: 10 });
            if (b.t <= 0) { b.st = "graze"; b.t = 1; b.cool = this.weak.some((f) => f.e.alive) ? 2 : 5; b.home = [b.x, b.z]; }
        }
        if (dd < 1.05 && b.st !== "charge") { // shoulder: dog can't walk through
            const dx = d.x - b.x, dz = d.z - b.z, l = dd || 1;
            d.x = b.x + dx / l * 1.05; d.z = b.z + dz / l * 1.05;
        }
        e.pos.x = b.x; e.pos.z = b.z; e.rot.y = b.yaw;
        const name = BULLS[frame];
        if (e.mesh !== name) e.mesh = name;
    }
    smashWeak(x, z) {
        let any = false;
        for (const w of this.weak) {
            if (!w.e.alive) continue;
            if (Math.abs(w.c + 0.5 - x) < 1.7 && Math.abs(w.r + 0.5 - z) < 1.3) { any = true; }
        }
        if (!any) return false;
        const L = this.L, game = this.game;
        for (const w of this.weak) {
            if (!w.e.alive) continue;
            this.s.burst({ at: [w.c + 0.5, 0.5, w.r + 0.5], dim: 3, count: 16, color: ["#b8824f", "#8a5a30", "#d9b98c"], speed: [3, 9], life: [0.5, 1], size: [0.14, 0.3], gravity: 0.6 });
            w.e.destroy();
            const i = w.c + w.r * L.w;
            L.boxes[i] = null; L.block[i] = 0;
        }
        computeFlow(L);
        sfx.crash(game);
        game.vibrate(40);
        this.pop(x, 2.4, z, "SMASH!", { size: 24, color: "#ffd27a", life: 1.1 });
        return true;
    }

    // --- Storm ------------------------------------------------------------------------------------------------
    stepStorm(dt) {
        const def = this.def.storm, s = this.s, game = this.game;
        this.boltT -= dt;
        if (this.boltT <= 0) for (const b of this.bolt) b.hidden = true;
        if (this.elapsed >= this.nextBolt) {
            this.nextBolt = this.elapsed + def.every + game.rng.range(-2, 3);
            // Strike near the flock's edge
            const c = this.centroid(), L = this.L;
            const ang = game.rng.range(0, 6.28), rad = game.rng.range(1, 3);
            const x = clamp(c.x + Math.cos(ang) * rad, 1, L.w - 1), z = clamp(c.z + Math.sin(ang) * rad, 1, L.h - 1);
            let px = x, pz = z;
            const seg = 16 / this.bolt.length;
            this.bolt.forEach((b, i) => {
                const y = (i + 0.5) * seg, nx = i === 0 ? x : px + game.fxRng.range(-0.9, 0.9), nz = i === 0 ? z : pz + game.fxRng.range(-0.6, 0.6);
                b.hidden = false; b.pos.x = (nx + px) / 2; b.pos.z = (nz + pz) / 2; b.pos.y = y; b.size.set(0.12 + (i === 0 ? 0.1 : 0), seg * 1.15, 0.12);
                b.rot.z = Math.atan2(nx - px, seg); b.scale.set(Math.max(0.35, 1.3 - i * 0.1), 1, Math.max(0.35, 1.3 - i * 0.1));
                px = nx; pz = nz;
            });
            this.boltT = 0.2;
            s.flash("#eef3ffa0", 0.3);
            s.shake(0.5, 0.45);
            game.vibrate(60);
            sfx.thunder(game, true);
            s.burst({ at: [x, 0.3, z], dim: 3, count: 26, color: ["#fff7c2", "#ffd27a", "#ffffff"], speed: [2, 8], life: [0.2, 0.7], size: [0.08, 0.2], gravity: 0.4 });
            this.pop(x, 2, z, "KRAK-A-BOOM!", { size: 20, color: "#fff7c2", life: 1 });
            for (let i = 0; i < this.n; i++) {
                if (this.st[i] !== ROAM) continue;
                const dx = this.px[i] - x, dz = this.pz[i] - z, dd = Math.hypot(dx, dz) || 0.01;
                if (dd > 8) continue;
                this.panic[i] = this.isRam[i] ? 0.8 : 1.5; this.al[i] = 1;
                const k = 1 - dd / 8;
                this.vx[i] += dx / dd * (3 + k * 5); this.vz[i] += dz / dd * (3 + k * 5);
                this.vy[i] = 3 + k * 4;
            }
            this.bleat(0, true);
            this.onBolt?.();
        }
    }
    centroid() {
        let x = 0, z = 0, c = 0;
        for (let i = 0; i < this.n; i++) if (this.st[i] === ROAM) { x += this.px[i]; z += this.pz[i]; c++; }
        return c ? { x: x / c, z: z / c, n: c } : { x: this.dog.x, z: this.dog.z, n: 0 };
    }

    // --- Ambient life -----------------------------------------------------------------------------------------
    stepAmbient(dt) {
        const now = this.elapsed, game = this.game;
        for (const m of this.mill) m.rot.z += dt * 0.7;
        for (const r of this.rings) {
            if (r.t < 0.5) {
                r.t += dt;
                const k = Math.min(1, r.t / 0.42), ease = 1 - (1 - k) * (1 - k), rad = 0.5 + ease * BARK_R;
                r.pos.y = 0.12; r.pos.x = this.dog.x; r.pos.z = this.dog.z;
                r.scale.set(rad, 1 + ease * 2.5, rad);
                r.opacity = (1 - k) * 0.85;
                if (r.t >= 0.5) r.hidden = true;
            }
        }
        if (this.water) {
            this.water.pos.y = Math.sin(now * 1.2) * 0.012;
            this.glint.pos.x = Math.sin(now * 0.7) * 0.14; this.glint.pos.z = Math.cos(now * 0.5) * 0.08;
            this.glint.opacity = 0.45 + Math.sin(now * 2.1) * 0.2;
        }
        const L = this.L;
        for (const c of this.clouds) { c.pos.x += c.spd * dt; if (c.pos.x > L.w + 22) c.pos.x = -22; }
        if (this.smoke.length && (game.stepCount & 31) === 0) for (const [x, y, z] of this.smoke) this.s.burst({ at: [x, y, z], dim: 3, count: 1, color: ["#f4f1ea", "#dcd8d2"], speed: [0.2, 0.6], life: [1, 1.8], size: [0.2, 0.34], gravity: -0.03 });
        for (const f of this.fireflies) { f.t += dt; f.pos.x = f.ox + Math.sin(f.t * 0.7) * 1.3; f.pos.z = f.oz + Math.cos(f.t * 0.5) * 1.3; f.pos.y = 0.7 + Math.sin(f.t * 1.3) * 0.4; f.opacity = 0.5 + Math.sin(f.t * 3) * 0.5; if (f.opacity < 0.2) f.opacity = 0.2; }
        const d = this.dog;
        for (const h of this.hens) {
            const dx = h.x - d.x, dz = h.z - d.z, dist = Math.hypot(dx, dz) || 0.01;
            h.t += dt * 7;
            if (dist < 2.2) {
                h.vx += dx / dist * 40 * dt; h.vz += dz / dist * 40 * dt;
                if (h.y <= 0 && Math.hypot(h.vx, h.vz) > 2) { h.vy = 3.5; if (game.fxRng.chance(0.2)) sfx.cluck(game); }
            }
            h.vx *= Math.exp(-3 * dt); h.vz *= Math.exp(-3 * dt);
            this.resolve(h.x + h.vx * dt, h.z + h.vz * dt, 0.2);
            h.x = this.ox; h.z = this.oz;
            if (h.y > 0 || h.vy > 0) { h.vy -= 20 * dt; h.y += h.vy * dt; if (h.y < 0) { h.y = 0; h.vy = 0; } }
            const e = h.e;
            e.pos.x = h.x; e.pos.z = h.z; e.pos.y = h.y;
            const sp = Math.hypot(h.vx, h.vz);
            if (sp > 0.3) { e.rot.y = Math.atan2(-h.vx, -h.vz); e.mesh = Math.sin(h.t * 2) > 0 ? "hen_0" : "hen_1"; }
            else e.rot.x = Math.max(0, Math.sin(h.t * 0.5) - 0.8) * 3;
        }
        if (!this.finished && now > (this.nextBaa ?? 2)) {
            this.nextBaa = now + game.fxRng.range(2.5, 6);
            const i = game.fxRng.int(0, this.n - 1);
            if (this.st[i] === ROAM || this.st[i] === PEN) {
                this.bleat(i);
                this.pop(this.px[i], 1.15, this.pz[i], game.fxRng.pick(["baa", "meh", "baa", "mehh", "...baa?"]), { size: 11, color: "#fffbe8", life: 0.8, rise: 22 });
            }
        }
        for (const p of this.pops) p.t += dt;
        if (this.pops.length && this.pops[0].t > this.pops[0].life) this.pops = this.pops.filter((p) => p.t <= p.life);
    }

    drawPops(d) {
        const cam = this.s.cam3;
        for (const p of this.pops) {
            if (p.t > p.life) continue;
            const q = cam.project([p.x, p.y, p.z]), k = p.t / p.life;
            const grow = Math.min(1, p.t / 0.1), s = (0.5 + 0.5 * grow) * (1 + Math.sin(Math.min(1, p.t / 0.16) * Math.PI) * 0.35);
            const y = q.y - p.rise * (1 - (1 - k) * (1 - k)), a = k > 0.7 ? (1 - k) / 0.3 : 1;
            if (p.sprite) d.sprite(p.sprite, { x: q.x, y, width: p.w * s, height: p.w * 0.6 * s, opacity: a });
            else {
                const sz = p.size * s;
                d.text(p.text, { x: q.x + 1, y: y + 1.5, size: sz, bold: true, color: "#20242e", opacity: a * 0.75 });
                d.text(p.text, { x: q.x, y, size: sz, bold: true, color: p.color, opacity: a });
            }
        }
    }

    applyMood(t) {
        const stops = MOODS[this.def.mood] ?? MOODS.day, s = this.s;
        let a = stops[0], b = stops[stops.length - 1];
        for (let i = 0; i + 1 < stops.length; i++) if (t >= stops[i].t && t <= stops[i + 1].t) { a = stops[i]; b = stops[i + 1]; break; }
        const k = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0, L = s.light;
        const v = (p, q) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k), lerp(p[2], q[2], k)];
        const set = (c, q) => { c.r = q[0]; c.g = q[1]; c.b = q[2]; };
        L.dir.set(...v(a.dir, b.dir));
        set(L.color, v(a.sun, b.sun)); set(L.sky, v(a.sky, b.sky)); set(L.ground, v(a.ground, b.ground));
        const top = v(a.top, b.top), bot = v(a.bot, b.bot);
        s.background = [[...top, 1], [...bot, 1]];
        const dist = s.cam3.offset.len();
        L.fog = { color: color([...bot, 1]), near: dist + 6, far: dist + (this.def.mood === "storm" ? 26 : this.def.mood === "night" ? 28 : 46) };
        this.lightK = v(a.top, b.top);
    }

    applyCam() {
        const v = this.s.view, tall = v.height >= v.width, cam = this.s.cam3;
        this.tall = tall;
        const pitch = 0.98, D = this.camD * (tall ? 1 : 1.3);
        cam.offset.set(0, Math.sin(pitch) * D, Math.cos(pitch) * D);
        // On phones held upright the thumbs live at the bottom, so frame the action higher up the screen.
        cam.lookOffset.set(0, 0.4, tall ? 1.8 : 0.5);
    }

    stepCamera(dt) {
        const d = this.dog, f = this.focus, L = this.L;
        let tx = d.x, tz = d.z, wanted = 21;
        if (this.finished && this.result?.won !== undefined) {
            const pen = L.pen;
            const narrow = this.tall;
            tx = (pen.x0 + pen.x1) / 2; tz = (pen.mid?.[1] ?? pen.z1) + (narrow ? 4.5 : 0); wanted = narrow ? 25 : 20;
            if (!narrow) tx += 3.2;
        } else if (this.titleCam) { tx = this.titleCam[0]; tz = this.titleCam[1]; wanted = this.titleCam[2]; }
        else {
            let cx = 0, cz = 0, c = 0, far = 0;
            for (let i = 0; i < this.n; i++) if (this.st[i] === ROAM) { const dd = Math.hypot(this.px[i] - d.x, this.pz[i] - d.z); if (dd < 15) { cx += this.px[i]; cz += this.pz[i]; c++; if (dd > far) far = dd; } }
            if (c) {
                cx /= c; cz /= c;
                tx = lerp(d.x, cx, 0.5); tz = lerp(d.z, cz, 0.5);
                wanted = clamp(19 + far * 0.75, 20, this.tall ? 33 : 28);
            }
        }
                const k = 1 - Math.exp(-dt * 3.2);
        f.x += (tx - f.x) * k; f.z += (tz - f.z) * k;
        const mx = this.tall ? 2 : 4;
        f.x = clamp(f.x, Math.min(mx, L.w / 2), Math.max(L.w - mx, L.w / 2)); f.z = clamp(f.z, 1, L.h);
        this.rig.pos.x = f.x; this.rig.pos.z = f.z;
        this.camD += (wanted - this.camD) * (1 - Math.exp(-dt * 1.4));
        this.applyCam();
    }
}

const hashSide = (i, t) => (((i * 7 + Math.floor(t * 0.7)) & 1) ? 1 : -1);
const FRAMES = {};
for (const k of ["sheep", "blk", "ram"]) FRAMES[k] = ["stand", "a", "b", "pa", "pb", "graze", "fly"].map((f) => `${k}_${f}`);
const BULLS = ["bull_0", "bull_1", "bull_2", "bull_3"];

/** Flat glowing ring for the bark. */
export function ringGeometry() {
    const p = [], n = [], c = [], idx = [], seg = 48, r0 = 0.93, r1 = 1;
    for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
        p.push(cs * r0, 0.02, sn * r0, cs * r1, 0.02, sn * r1, cs * r1, 0.16, sn * r1);
        n.push(0, 1, 0, 0, 1, 0, cs, 0, sn);
        c.push(1, 1, 1, 1, 1, 1, 1, 1, 1);
    }
    for (let i = 0; i < seg; i++) {
        const a = i * 3, b = a + 3;
        idx.push(a, b, a + 1, a + 1, b, b + 1);       // top, anticlockwise from above
        idx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
    return { positions: p, normals: n, colors: c, indices: idx };
}
