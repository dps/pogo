// The rules of Tumble Keep on top of the solver: materials, damage, fragments, TNT, defenders, ammo,
// combos and the turn flow. No rendering here: it runs headless for bots and tests, and the game
// reads `events` each tick to paint, play and rumble. Deterministic for the same calls in the same order.
import { DT, World } from "./physics.js";

export const GRAVITY = 14, SLING = { x: 0, y: -3.2 }, MAX_SPEED = 27, MAX_BODIES = 250;

export const MATS = {
    wood: { density: 0.6, friction: 0.55, bounce: 0.08, hp: 7, jmin: 1.8, value: 100, crush: 22 },
    stone: { density: 1.7, friction: 0.55, bounce: 0.02, hp: 16, jmin: 3.6, value: 200, crush: 60 },
    glass: { density: 1.0, friction: 0.38, bounce: 0.12, hp: 2.5, jmin: 0.9, value: 150, crush: 14 },
    tnt: { density: 0.7, friction: 0.62, bounce: 0.08, hp: 2, jmin: 3.2, value: 300, crush: 1e9 },
    roof: { density: 0.5, friction: 0.6, bounce: 0.05, hp: 6, jmin: 2.2, value: 120, crush: 1e9 },
    gold: { density: 1.8, friction: 0.6, bounce: 0.05, hp: 12, jmin: 3, value: 1000, crush: 1e9 },
};

/** Block sizes the art knows. Standing versions are the same sprite rotated a quarter turn. */
export const SHAPES = {
    c: [1, 1], h: [2, 1], w: [3, 1], l: [4, 0.5], p: [2, 0.5], b: [1, 0.5],
    t: [1, 2], T: [1, 3], v: [0.5, 2], V: [0.5, 4],
    r: [2, 1], R: [3, 1],     // roofs: box colliders under a pointed sprite
};

export const AMMO = {
    rock: { label: "Boulder", r: 0.55, density: 6, bounce: 0.15, friction: 0.7, power: 1, hint: "" },
    split: { label: "Split Shot", r: 0.52, density: 5, bounce: 0.15, friction: 0.7, power: 1, hint: "Tap in flight to split" },
    bomb: { label: "Bomber", r: 0.48, density: 3, bounce: 0.1, friction: 0.6, power: 0.8, hint: "Tap to detonate" },
    iron: { label: "Heavy Iron", r: 0.46, density: 22, bounce: 0.05, friction: 0.5, power: 1.6, hint: "Tap to slam down" },
    ball: { label: "Bouncer", r: 0.56, density: 1.7, bounce: 0.82, friction: 0.9, power: 0.8, hint: "Tap for a boost" },
};

export const DEFENDERS = {
    squire: { r: 0.42, hp: 1, value: 1000, density: 1 },
    knight: { r: 0.46, hp: 1.5, value: 1500, density: 1.2 },
    boss: { r: 0.95, hp: 12, value: 8000, density: 0.9 },
};

export function aimToVelocity(px, py) {      // pull vector in view-independent units, length up to 1
    const len = Math.hypot(px, py), k = len > 1 ? 1 / len : 1;
    return [-px * k * MAX_SPEED, -py * k * MAX_SPEED];
}


class Part {
    constructor(kind) {
        this.kind = kind;       // block frag def shot
        this.mat = "wood"; this.shape = "c"; this.m = null;
        this.hp = 1; this.max = 1; this.value = 0; this.stage = 0;
        this.hitJ = 0; this.hitV = 0; this.hitPow = 1; this.hitX = 0; this.hitY = 0; this.hitStatic = false;
        this.life = 0; this.x0 = 0; this.y0 = 0; this.moved = false; this.lit = 0; this.creep = 0;
        this.type = ""; this.tone = 0; this.grief = 0; this.ammo = ""; this.bounces = 0; this.age = 0; this.spent = false; this.fragKind = 0;
        this.crushT = 0; this.flash = 0; this.pvx = 0; this.pvy = 0; this.hitBy = null;
    }
}

export class Sim {
    constructor(level, o = {}) {
        this.level = level; this.mode = o.mode ?? "campaign";
        const w = this.world = new World({ gy: GRAVITY });
        this.rs = (o.seed ?? 1) * 2654435761 >>> 0;
        this.events = [];
        this.parts = [];                       // every body with game data: blocks, fragments, defenders, shots
        this.defenders = []; this.shots = []; this.tntQueue = []; this.statics = [];
        this.score = 0; this.combo = 0; this.comboT = 0; this.bestCombo = 0; this.mult = 1;
        this.state = "aim"; this.turnT = 0; this.calmT = 0; this.tick = 0;
        this.fired = 0; this.kills = 0; this.broken = 0; this.toppled = 0;
        this.rack = { ...(level.ammo ?? { rock: 3 }) };
        this.energy = 0; this.flowSmooth = 0; this.groanT = 0; this.collapseScore = 0; this.bigHit = 0;
        this.boss = null; this.bossDropAt = 0; this.dropsDone = 0;
        this.total = 0;
        this.ground = w.box(0, 10, 1200, 20, { static: true, friction: 0.85 });
        for (const k of level.statics ?? []) this.statics.push({ ...k, body: w.box(k.x, k.y, k.w, k.h, { static: true, friction: 0.8 }) });
        w.onImpact = (c, p, v, J) => this.impact(c, p, v, J);
        for (const b of level.blocks ?? []) this.spawnBlock(b.mat, b.shape, b.x, b.y);
        for (const d of level.defenders ?? []) this.spawnDefender(d.type, d.x, d.y, d);
        this.total = this.value();
        this.settle();
    }

    rng() {
        const a = this.rs = this.rs + 0x6D2B79F5 | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }

    /** An independent copy, so a bot can try a shot without taking it. */
    fork() {
        const seen = new Map();
        const copy = (v) => {
            if (v === null || typeof v !== "object") return v;
            if (v === this.level) return v;
            const k = seen.get(v);
            if (k) return k;
            if (ArrayBuffer.isView(v)) { const c = v.slice(); seen.set(v, c); return c; }
            if (Array.isArray(v)) { const c = new Array(v.length); seen.set(v, c); for (let i = 0; i < v.length; i++) c[i] = copy(v[i]); return c; }
            if (v instanceof Map) { const c = new Map(); seen.set(v, c); for (const [a, b] of v) c.set(a, copy(b)); return c; }
            const c = Object.create(Object.getPrototypeOf(v));
            seen.set(v, c);
            for (const key of Object.keys(v)) { const q = v[key]; if (typeof q !== "function") c[key] = copy(q); }
            return c;
        };
        const c = copy(this);
        c.world.onImpact = (a, p, v, J) => c.impact(a, p, v, J);
        return c;
    }

    value() {
        let v = 0;
        for (const p of this.parts) v += p.kind === "block" ? p.value : p.kind === "def" ? p.value : 0;
        return v;
    }

    /** Let the castle find its weight before anyone sees it, then sleep it, impulses and all. */
    settle() {
        const w = this.world, keep = w.onImpact;
        w.onImpact = null;
        for (let i = 0; i < 90; i++) w.step();
        w.onImpact = keep;
        for (const p of this.parts) { const b = p.b; b.vx = b.vy = b.w = 0; b.sleepT = 9; p.x0 = b.x; p.y0 = b.y; b.px = b.x; b.py = b.y; b.pc = b.c; b.ps = b.s; }
        w.findIslands(true);
        w.tick = Math.max(1, w.tick);
        this.events.length = 0;
    }

    spawnBlock(mat, shape, x, y, o = {}) {
        const [w, h] = SHAPES[shape], m = MATS[mat], stand = h > w;
        const bw = stand ? h : w, bh = stand ? w : h;       // always the long side along local x
        const c = stand ? 0 : 1, s = stand ? 1 : 0;
        const b = this.world.box(x, y, bw, bh, { density: m.density, friction: m.friction, bounce: m.bounce, c, s, angDamp: 0.05, ...o });
        const p = new Part("block");
        p.mat = mat; p.shape = stand ? shape === "t" ? "h" : shape === "T" ? "w" : shape === "v" ? "p" : "l" : shape;
        p.m = m; p.b = b; b.ud = p; p.hp = p.max = m.hp * (bw * bh > 1.5 ? 1.5 : 1); p.value = Math.round(m.value * (bw * bh > 1.5 ? 1.5 : 1)); p.x0 = x; p.y0 = y;
        this.parts.push(p);
        return p;
    }

    spawnDefender(type, x, y, o = {}) {
        const t = DEFENDERS[type], b = this.world.ball(x, y, t.r, { density: t.density, friction: 0.7, bounce: 0.2, angDamp: 1.2, linDamp: 0.05 });
        const p = new Part("def");
        p.type = type; p.b = b; b.ud = p; p.hp = p.max = o.hp ?? t.hp; p.value = t.value; p.x0 = x; p.y0 = y; p.tone = this.defenders.length;
        this.parts.push(p); this.defenders.push(p);
        if (type === "boss") this.boss = p;
        return p;
    }

    emit(type, a = {}) { a.type = type; this.events.push(a); }

    impact(c, pt, v, J) {
        const a = c.a.ud, b = c.b.ud;
        if (J < 0.3) return;
        const wx = c.a.x + pt.ax, wy = c.a.y + pt.ay;
        const pow = (a && a.kind === "shot" ? AMMO[a.ammo].power : 1) * (b && b.kind === "shot" ? AMMO[b.ammo].power : 1);
        const stat = c.a.isStatic || c.b.isStatic;
        if (a && J > a.hitJ) { a.hitJ = J; a.hitV = v; a.hitPow = pow; a.hitX = wx; a.hitY = wy; a.hitStatic = stat; a.hitBy = b && b.kind === "shot" ? b : null; }
        if (b && J > b.hitJ) { b.hitJ = J; b.hitV = v; b.hitPow = pow; b.hitX = wx; b.hitY = wy; b.hitStatic = stat; b.hitBy = a && a.kind === "shot" ? a : null; }
    }

    addScore(n, x, y, why) {
        this.combo++;
        this.comboT = 1.7;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        const mult = Math.min(12, 1 + Math.floor(this.combo / 6));
        if (mult > this.mult) this.emit("mult", { mult, x, y });
        this.mult = mult;
        const pts = n * mult;
        this.score += pts;
        this.emit("score", { pts, x, y, mult, why });
    }

    /** Apply this tick's hardest hit to every part. */
    resolveHits() {
        let peakJ = 0, px = 0, py = 0;
        const parts = this.parts;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (p.flash > 0) p.flash -= DT;
            if (p.hitJ === 0) continue;
            const J = p.hitJ, b = p.b;
            if (J > peakJ) { peakJ = J; px = p.hitX; py = p.hitY; }
            if (p.kind === "def") {
                const dv = J * b.im;
                const hurt = p.hitStatic ? dv > 7.5 : J > (p.type === "boss" ? 6 : 1.5);
                if (hurt) {
                    const dmg = p.type === "boss" ? Math.min(4, (J - 3) * p.hitPow / 7) : 1 + (J > 6 ? 1 : 0);
                    this.hurtDefender(p, dmg);
                } else if (J > 0.6) { p.grief = 1; this.emit("bump", { x: b.x, y: b.y, J }); }
            } else if (p.kind === "shot") {
                p.bounces++;
                if (J > 1.5) this.emit("thud", { mat: "shot", ammo: p.ammo, J, v: p.hitV, x: p.hitX, y: p.hitY });
                if (p.ammo === "bomb" && !p.spent && p.age > 0.05 && J > 1) this.detonate(p);
            } else {
                const m = p.m, over = (J - m.jmin) * p.hitPow;
                if (J > m.jmin * 0.6) this.emit("thud", { mat: p.mat, J, v: p.hitV, x: p.hitX, y: p.hitY });
                if (over > 0) {
                    p.hp -= over;
                    p.flash = 0.08;
                    if (p.mat === "tnt" || p.mat === "gold") { if (p.hp <= 0) p.hp = 0; }
                    this.updateStage(p, J);
                }
                const by = p.hitBy;
                if (by && by.b.alive && J > 6) {
                    // A shot that lands shakes everything near it, and if it broke through it keeps going.
                    this.shock(p.hitX, p.hitY, 3.2, J * 0.2 * AMMO[by.ammo].power);
                    if (p.hp <= 0) {
                        const keep = (p.mat === "glass" ? 0.92 : p.mat === "wood" ? 0.8 : 0.66) * (by.ammo === "iron" ? 1.15 : 1);
                        by.b.vx += (by.pvx - by.b.vx) * keep; by.b.vy += (by.pvy - by.b.vy) * keep;
                    }
                }
            }
            p.hitJ = 0;
        }
        if (peakJ > 14) { this.bigHit = Math.max(this.bigHit, peakJ); this.emit("heavy", { J: peakJ, x: px, y: py }); }
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            if ((p.kind === "block" || p.kind === "frag") && p.hp <= 0 && p.b.alive) this.shatter(p);
        }
    }

    updateStage(p, J) {
        const k = p.hp / p.max, st = k < 0.34 ? 2 : k < 0.75 ? 1 : 0;
        if (st > p.stage && p.hp > 0) { p.stage = st; this.emit("crack", { mat: p.mat, x: p.b.x, y: p.b.y, stage: st }); }
    }

    hurtDefender(p, dmg) {
        if (!p.b.alive) return;
        p.hp -= dmg;
        p.flash = 0.15;
        p.grief = 1;
        const b = p.b;
        if (p.hp > 0) { this.emit("ouch", { x: b.x, y: b.y, boss: p.type === "boss", hp: p.hp, max: p.max }); if (p.type === "boss") this.addScore(500, b.x, b.y, "hit"); return; }
        this.kills++;
        this.world.remove(b);
        this.parts.splice(this.parts.indexOf(p), 1);
        this.defenders.splice(this.defenders.indexOf(p), 1);
        this.emit("squash", { x: b.x, y: b.y, r: b.r, kind: p.type, c: b.c, s: b.s, left: this.defenders.length });
        this.addScore(p.value, b.x, b.y - 0.8, p.type === "boss" ? "BOSS DOWN" : "SQUASH");
    }

    removePart(p) {
        this.world.remove(p.b);
        const i = this.parts.indexOf(p);
        if (i >= 0) this.parts.splice(i, 1);
    }

    shatter(p) {
        const b = p.b, mat = p.mat, x = b.x, y = b.y, vx = b.vx, vy = b.vy, w = b.w, c = b.c, s = b.s, hw = b.hw, hh = b.hh;
        if (p.kind === "frag") {
            this.removePart(p);
            this.emit("crumble", { mat, x, y, size: hw * 2 });
            return;
        }
        this.removePart(p);
        this.broken++;
        this.addScore(p.value, x, y, mat);
        this.emit("break", { mat, x, y, hw, hh, c, s, vx, vy, stage: p.stage });
        const room = this.world.bodies.length < MAX_BODIES, r = () => this.rng();
        const piece = (lx, ly, pw, ph, kind, life) => {
            if (this.world.bodies.length >= MAX_BODIES) return;
            const px = x + c * lx - s * ly, py = y + s * lx + c * ly, f = MATS[mat];
            const q = this.world.box(px, py, pw, ph, {
                density: f.density, friction: f.friction, bounce: f.bounce, c, s,
                vx: vx - w * ly + lx * 1.2 + (r() - 0.5) * 1.2, vy: vy + w * lx + ly * 1.2 + (r() - 0.5) * 1.2, w: w + (r() - 0.5) * 5,
            });
            const fp = new Part("frag");
            fp.mat = mat; fp.m = { ...f, jmin: f.jmin * 0.7 }; fp.b = q; q.ud = fp; fp.hp = fp.max = 1 + (pw * ph > 0.6 ? f.hp * 0.2 : 0);
            fp.life = life; fp.fragKind = Math.floor(r() * 3); fp.x0 = px; fp.y0 = py;
            this.parts.push(fp);
        };
        if (mat === "tnt") { this.explode(x, y, 5.2, 34, 26, true); return; }
        if (mat === "gold") { this.emit("treasure", { x, y }); return; }
        const L = hw * 2, Hh = hh * 2;
        if (!room) return;
        if (mat === "wood" || mat === "roof") {
            if (L >= 1.5) {
                const n = Math.round(L);
                const seg = L / n;
                for (let i = 0; i < n; i++) piece(-hw + seg * (i + 0.5), (i % 2 ? 0.08 : -0.08) * Hh, seg * 0.94, Hh * 0.62, 0, 4 + r() * 3);
            } else {
                piece(0, -hh * 0.52, L * 0.94, Hh * 0.44, 0, 3.5 + r() * 2.5);
                piece(0, hh * 0.52, L * 0.94, Hh * 0.44, 0, 3.5 + r() * 2.5);
            }
        } else if (mat === "stone") {
            const nx = Math.max(1, Math.round(L / 0.9)), ny = Math.max(1, Math.round(Hh / 0.55));
            const sx = L / nx, sy = Hh / ny;
            for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
                piece(-hw + sx * (i + 0.5), -hh + sy * (j + 0.5), sx * (0.8 + r() * 0.12), sy * (0.8 + r() * 0.12), 0, 7 + r() * 5);
            }
        } else if (mat === "glass") {
            const n = 2 + Math.floor(r() * 2);
            for (let i = 0; i < n; i++) piece((r() - 0.5) * L * 0.7, (r() - 0.5) * Hh * 0.7, 0.26, 0.2, 0, 1.2 + r());
        }
    }

    /** A blast: shoves everything nearby, cracks blocks, lights other TNT. */
    explode(x, y, R, P, D, tnt) {
        this.emit("explode", { x, y, R, tnt });
        const parts = this.parts;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i], b = p.b;
            const ex = b.circle ? b.r : Math.max(b.hw, b.hh) * 0.7;
            let dx = b.x - x, dy = b.y - y - 0.15;
            const d = Math.sqrt(dx * dx + dy * dy), e = Math.max(0, d - ex);
            if (e >= R) continue;
            const f = (1 - e / R), ff = f * f, nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : -1;
            this.world.wake(b);
            const kick = Math.min(24, P * ff * Math.sqrt(b.im));
            b.vx += nx * kick; b.vy += ny * kick - kick * 0.15; b.w += (nx >= 0 ? 1 : -1) * Math.min(8, kick * 0.6);
            if (p.kind === "def") { if (ff * D > 7) this.hurtDefender(p, p.type === "boss" ? 2.5 : 2); else p.grief = 1; }
            else if (p.kind === "block" && p.mat === "tnt") { if (!p.lit && ff * D > 2) { p.lit = 0.08 + 0.1 * (1 - f) + this.rng() * 0.05; this.emit("fuse", { x: b.x, y: b.y }); } }
            else if (p.kind === "block" || p.kind === "frag") {
                const dmg = ff * D * (p.mat === "stone" ? 1.1 : 0.9);
                if (dmg > 0.5) { p.hp -= dmg; if (p.kind === "block") this.updateStage(p, 0); }
            }
        }
    }

    /** A shove with no fire in it: the thump of a heavy hit travelling through the stones. */
    shock(x, y, R, P) {
        const parts = this.parts;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i], b = p.b;
            if (p.kind === "shot") continue;
            const dx = b.x - x, dy = b.y - y, d = Math.sqrt(dx * dx + dy * dy);
            if (d > R) continue;
            const f = 1 - d / R, n = d > 1e-6 ? 1 / d : 0;
            this.world.wake(b);
            const kick = Math.min(9, P * f * Math.sqrt(b.im) * 0.7);
            b.vx += dx * n * kick; b.vy += dy * n * kick * 0.6; b.w += (dy >= 0 ? 1 : -1) * kick * 0.5;
            if (p.kind === "block" && p.mat !== "tnt") { p.hp -= f * P * 0.25; if (p.hp < p.max) this.updateStage(p, 0); }
        }
    }

    fire(ammo, vx, vy) {
        if (this.state !== "aim" && this.mode !== "sandbox") return false;
        if (this.mode !== "sandbox") { if (!this.rack[ammo]) return false; this.rack[ammo]--; }
        const a = AMMO[ammo], b = this.world.ball(SLING.x, SLING.y, a.r, { density: a.density, friction: a.friction, bounce: a.bounce, vx, vy, angDamp: 0.3, linDamp: 0, w: vx * 0.8 });
        const p = new Part("shot");
        p.ammo = ammo; p.b = b; b.ud = p; p.life = 9;
        this.parts.push(p); this.shots.push(p);
        this.fired++;
        this.state = "flight"; this.turnT = 0; this.calmT = 0;
        this.combo = 0; this.mult = 1;
        this.emit("fire", { ammo, vx, vy });
        return true;
    }

    /** The in-flight tap. */
    special() {
        const p = this.shots.find((q) => !q.spent && q.b.alive);
        if (!p) return false;
        const b = p.b;
        if (p.ammo === "split") {
            if (p.bounces) return false;
            p.spent = true;
            const speed = Math.hypot(b.vx, b.vy), a = AMMO.split, x = b.x, y = b.y, c = b.vx / speed, s = b.vy / speed;
            this.removePart(p); this.shots.splice(this.shots.indexOf(p), 1);
            for (const turn of [-0.2, 0, 0.2]) {
                const nc = c - turn * s, ns = s + turn * c;
                const q = this.world.ball(x + nc * 0.3, y + ns * 0.3, 0.3, { density: 6, friction: 0.7, bounce: 0.15, vx: nc * speed * 1.08, vy: ns * speed * 1.08, angDamp: 0.3, linDamp: 0 });
                const sp = new Part("shot");
                sp.ammo = "split"; sp.b = q; q.ud = sp; sp.life = 7; sp.spent = true;
                this.parts.push(sp); this.shots.push(sp);
            }
            this.emit("split", { x, y });
            return true;
        }
        if (p.ammo === "bomb") { this.detonate(p); return true; }
        if (p.ammo === "iron") {
            p.spent = true;
            b.vy = Math.max(b.vy, 0) + 22; b.vx *= 0.55;
            this.emit("slam", { x: b.x, y: b.y });
            return true;
        }
        if (p.ammo === "ball") {
            p.spent = true;
            const sp = Math.hypot(b.vx, b.vy) || 1, k = Math.min(30, sp + 11) / sp;
            b.vx *= k; b.vy *= k;
            this.emit("boost", { x: b.x, y: b.y });
            return true;
        }
        return false;
    }

    detonate(p) {
        const b = p.b, x = b.x, y = b.y;
        p.spent = true;
        this.removePart(p);
        this.shots.splice(this.shots.indexOf(p), 1);
        this.explode(x, y, 4.6, 32, 30, false);
    }

    /** Sandbox: drop something in by hand. */
    place(what, mat, x, y) {
        if (this.world.bodies.length >= MAX_BODIES + 40) return null;
        if (what === "squire" || what === "knight") return this.spawnDefender(what, x, y);
        return this.spawnBlock(mat, what, x, y);
    }

    step() {
        const w = this.world;
        this.tick++;
        // Weeble: defenders right themselves, which reads as comic wobble.
        for (let i = 0; i < this.defenders.length; i++) {
            const d = this.defenders[i], b = d.b;
            if (b.awake && b.touching) { b.w -= b.s * 0.5; b.w *= 0.96; }
            if (d.grief > 0) d.grief -= DT * 0.5;
        }
        // Rolling friction, so shots stop.
        for (let i = 0; i < this.shots.length; i++) {
            const q = this.shots[i], b = q.b;
            q.age += DT;
            if (b.touching) { const k = q.ammo === "ball" ? 0.992 : 0.965; b.w *= k; b.vx *= k + (1 - k) * 0.6; }
        }
        for (let i = 0; i < this.shots.length; i++) { const q = this.shots[i]; q.pvx = q.b.vx; q.pvy = q.b.vy; }
        w.step();
        this.resolveHits();
        this.updateParts();
        this.updateTurn();
        const flow = w.flow;
        let ke = 0;
        const parts = this.parts;
        for (let i = 0; i < parts.length; i++) { const p = parts[i], b = p.b; if (b.awake && p.kind !== "shot") { ke += 0.5 * b.mass * (b.vx * b.vx + b.vy * b.vy) + (b.w * b.w) / (2 * b.iI); } }
        this.energy = ke;
        this.flowSmooth += (flow - this.flowSmooth) * (flow > this.flowSmooth ? 0.5 : 0.12);
        if (this.comboT > 0) { this.comboT -= DT; if (this.comboT <= 0) { this.combo = 0; this.mult = 1; } }
    }

    updateParts() {
        const parts = this.parts, q = this.tntQueue;
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i], b = p.b;
            if (i >= parts.length) continue;
            if (p.kind === "frag") {
                p.life -= DT;
                if (p.life <= 0 || b.y > 30) { this.removePart(p); continue; }
            } else if (p.kind === "block") {
                if (p.lit > 0) {
                    p.lit -= DT;
                    if (p.lit <= 0) { p.lit = -1; p.hp = 0; }
                }
                if (b.awake && !p.moved) {
                    const dx = b.x - p.x0, dy = b.y - p.y0;
                    if (dx * dx + dy * dy > 0.7) { p.moved = true; this.toppled++; this.addScore(Math.round(p.value * 0.25), b.x, b.y, "topple"); }
                }
                if (p.stage > 0 && b.awake && p.mat !== "tnt") this.creep(p);
                if (b.y > 40 || Math.abs(b.x) > 90) { this.removePart(p); continue; }
                if (p.hp <= 0 && b.alive) this.shatter(p);
            } else if (p.kind === "def") {
                if (b.y > 30 || Math.abs(b.x) > 90) { p.hp = 0; this.hurtDefender(p, 1); continue; }
                if (b.awake) {                // being slowly crushed under a pile
                    const kg = b.load * 240 / GRAVITY * 0.5;
                    if (kg > (p.type === "boss" ? 40 : 8)) { p.crushT += DT; p.grief = 1; if (p.crushT > (p.type === "boss" ? 0.25 : 0.35)) { p.crushT = 0; this.hurtDefender(p, 1); } }
                    else p.crushT = 0;
                }
            } else if (p.kind === "shot") {
                p.life -= DT;
                const sp = b.vx * b.vx + b.vy * b.vy;
                if (p.life <= 0 || b.y > 30 || Math.abs(b.x) > 110 || (p.bounces > 0 && p.age > 1 && sp < 0.3)) {
                    if (p.ammo === "bomb" && !p.spent && p.bounces > 0) { this.detonate(p); continue; }
                    this.emit("shotGone", { x: b.x, y: b.y });
                    const k = this.shots.indexOf(p);
                    if (k >= 0) this.shots.splice(k, 1);
                    this.removePart(p);
                    continue;
                }
            }
        }
    }

    /** A cracked block carrying more than it can bear groans, sheds dust, and gives way. */
    creep(p) {
        const b = p.b, kg = b.load * 240 / GRAVITY * 0.5, m = p.m, cap = m.crush * (0.3 + 0.7 * p.hp / p.max);
        if (kg > cap) {
            if (!p.creep) { p.creep = 1; b.noSleep = true; }
            p.hp -= p.max * 0.28 * DT * Math.min(2.5, kg / cap);
            p.creep += DT;
            this.groanT -= DT;
            if (this.groanT <= 0) {
                this.groanT = 0.75 + this.rng() * 0.3;
                this.emit("groan", { x: b.x, y: b.y, mat: p.mat, load: kg / cap });
            }
            b.w += (this.rng() - 0.5) * 0.3;     // the tower trembles
            this.updateStage(p, 0);
        } else if (p.creep) { p.creep = 0; b.noSleep = false; }
    }

    updateTurn() {
        if (this.state === "won" || this.state === "lost") return;
        if (!this.defenders.length && this.mode === "campaign" && this.state !== "ending") { this.state = "ending"; this.turnT = 0; this.calmT = 0; this.emit("cleared", {}); }
        if (this.state === "flight" || this.state === "ending") {
            this.turnT += DT;
            const calm = this.energy < 1.2 && this.shots.length === 0;
            this.calmT = calm ? this.calmT + DT : 0;
            const limit = this.state === "ending" ? 4.5 : 9;
            if (this.calmT > 0.45 || this.turnT > limit) this.endTurn();
        } else if (this.state === "drop") {
            this.turnT += DT;
            if (this.turnT > 2.2 || (this.turnT > 1 && this.energy < 1)) this.state = "aim";
        }
    }

    shotsLeft() { let n = 0; for (const k in this.rack) n += this.rack[k]; return n; }

    endTurn() {
        for (const q of this.shots) { if (q.b.alive) this.removePart(q); }
        this.shots.length = 0;
        if (this.mode === "sandbox") { this.state = "aim"; return; }
        if (this.state === "ending") {
            const left = this.shotsLeft();
            this.bonus = left * 2500;
            this.score += this.bonus;
            this.state = "won";
            this.emit("won", { left, bonus: this.bonus });
            return;
        }
        if (!this.shotsLeft()) { this.state = "lost"; this.emit("lost", {}); return; }
        if (this.boss && this.level.drops?.length) {
            const list = this.level.drops[this.dropsDone++ % this.level.drops.length];
            this.state = "drop"; this.turnT = 0;
            for (const d of list) {
                const p = this.spawnBlock(d.mat, d.shape, d.x, -22 - this.rng() * 3);
                p.b.vy = 10; p.b.w = (this.rng() - 0.5) * 0.6;
            }
            this.emit("bossDrop", { x: this.boss.b.x, y: this.boss.b.y });
            return;
        }
        this.state = "aim";
    }

    /** One ballistic preview, integrated exactly as the solver moves a free shot. Stops at the first block. */
    predict(vx, vy, n = 240, out = []) {
        const h = DT / 4, gy = GRAVITY * h;
        let x = SLING.x, y = SLING.y, m = 0;
        out.length = 0;
        const list = this.world.bodies;
        for (let i = 0; i < n; i++) {
            for (let k = 0; k < 4; k++) { vy += gy; x += vx * h; y += vy * h; }
            if (i % 3 === 0) { out.push(x, y); m++; }
            if (y > -0.3) break;
            let hit = false;
            for (let j = 0; j < list.length && !hit; j++) {
                const b = list[j];
                if (b.isStatic ? false : (b.ud && b.ud.kind === "shot")) continue;
                if (x < b.minX - 0.3 || x > b.maxX + 0.3 || y < b.minY - 0.3 || y > b.maxY + 0.3) continue;
                const dx = x - b.x, dy = y - b.y;
                if (b.circle) hit = dx * dx + dy * dy < (b.r + 0.3) ** 2;
                else { const lx = b.c * dx + b.s * dy, ly = -b.s * dx + b.c * dy; hit = Math.abs(lx) < b.hw + 0.3 && Math.abs(ly) < b.hh + 0.3; }
            }
            if (hit) break;
        }
        return out;
    }

    /** Run until the turn ends, for bots. */
    runTurn(cap = 900) {
        for (let i = 0; i < cap && this.state !== "aim" && this.state !== "won" && this.state !== "lost"; i++) { this.step(); this.events.length = 0; }
    }

    hash() { return (this.world.hash() ^ Math.round(this.score)) >>> 0; }
}
