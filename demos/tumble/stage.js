// The stage: paints a Sim, turns its events into particles, sound and rumble, and runs the camera.
import { DT } from "./physics.js";
import { AMMO, SHAPES, SLING } from "./sim.js";
import { PAD, PX, THEMES, paintBoss, paintWorld } from "./art.js";
import { Sound } from "./audio.js";

export const WU = 32;      // world units per metre: the solver is in metres, the renderer in these
const FRAME_BASE = { wood: 0, stone: 3, glass: 6, roof: 0 };
const STRIP = { c: "b11", h: "b21", w: "b31", l: "b405", p: "b205", b: "b105" };
const CELL = { c: [1, 1], h: [2, 1], w: [3, 1], l: [4, 0.5], p: [2, 0.5], b: [1, 0.5] };
const FX = { puff: 0, spark: 3, ring: 4, chip: 5, splinter: 6, shard: 7, seed: 9, star: 10, flame: 11, dot: 12, bead: 13, pancake: 14, flag: 15 };
const AMMO_FRAME = { rock: 0, split: 1, bomb: 2, iron: 3, ball: 4 };
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
export const FONT = '"Arial Rounded MT Bold", ui-rounded, "Trebuchet MS", system-ui, sans-serif';

/** Text at a cached size, scaled for animation: every distinct font size is a fresh texture otherwise. */
export function popText(d, str, x, y, size, scale, color, o = {}) {
    const st = { size, bold: true, font: FONT, color, opacity: o.opacity ?? 1 };
    d.push(); d.translate(x, y); d.scale(scale, scale);
    if (o.shadow !== false) d.text(str, { ...st, y: 2.5, x: 1, color: o.ink ?? "#26181c" });
    d.text(str, st);
    d.pop();
}
/** A number built from cached digits, so a rolling counter costs no new textures. */
export function digits(d, n, x, y, size, scale, color) {
    const s = Math.round(n).toLocaleString("en-US"), adv = size * 0.62, comma = size * 0.32;
    let w = 0;
    for (const ch of s) w += ch === "," ? comma : adv;
    d.push(); d.translate(x, y); d.scale(scale, scale);
    let px = -w / 2;
    const st = { size, bold: true, font: FONT, color, x: 0, y: 0 };
    for (const ch of s) { const a = ch === "," ? comma : adv; st.x = px + a / 2; d.text(ch, st); px += a; }
    d.pop();
}

let fxSeed = 77;
const fr = () => { fxSeed = fxSeed + 0x6D2B79F5 | 0; let t = Math.imul(fxSeed ^ fxSeed >>> 15, 1 | fxSeed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rand = (a, b) => a + (b - a) * fr();

export class Stage {
    constructor(game, s, sim, o = {}) {
        this.game = game; this.s = s; this.sim = sim;
        this.themeName = o.theme ?? "meadow"; this.T = THEMES[this.themeName];
        paintWorld(game.assets, this.themeName);
        s.background = this.T.sky;
        this.boss = sim.boss ? paintBoss(game.assets, sim.level.world) : null;
        this.sound = new Sound(game); this.quiet = !!o.quiet;
        this.accum = 0; this.parts = []; this.floats = []; this.decals = [];
        this.buckets = { b11: [], b21: [], b31: [], b405: [], b205: [], b105: [], roof2: [], roof3: [], frag: [] };
        this.spr = { x: 0, y: 0, width: 1, height: 1, frame: 0, color: "#ffffff", opacity: 1, flipX: false };
        this.t = 0; this.aimX = 0; this.aimY = 0; this.aiming = false; this.tension = 0; this.preview = []; this.ghost = []; this.recoil = 0; this.recoilV = 0;
        this.ammo = "rock";
        this.cam = { x: 0, y: 0, z: 0.5, mode: "wide", hold: 0, focusX: 20, focusY: -3 };
        this.heat = 0; this.slowT = 0; this.slowUsed = false; this.freezeCool = 0; this.rumbleT = 0; this.wobbleT = 0;
        this.intensity = 0; this.peakIntensity = 0; this.boom = 0; this.lightning = 0; this.pip = 0; this.pipT = 0; this.flashT = 0; this.ambient = 0;
        this.mood = 0; this.hud = o.hud ?? null; this.groanLevel = 0;
        const list = [...sim.world.bodies];
        let x0 = 1e9, x1 = -1e9, top = -2;
        for (const b of list) { if (b.isStatic && b === sim.ground) continue; x0 = Math.min(x0, b.minX); x1 = Math.max(x1, b.maxX); top = Math.min(top, b.minY); }
        this.castle = { x0, x1, top };
        for (const k of sim.statics) { this.castle.x0 = Math.min(this.castle.x0, k.x - k.w / 2); this.castle.x1 = Math.max(this.castle.x1, k.x + k.w / 2); }
        this.clouds = []; for (let i = 0; i < 7; i++) this.clouds.push({ x: rand(-60, 90), y: rand(-26, -11), s: rand(0.8, 1.7), v: rand(0.08, 0.25), f: rand(0.3, 0.6) });
    }

    // --- Effects --------------------------------------------------------------------------------
    p(frame, x, y, o) {
        if (this.parts.length > 460) this.parts.shift();
        const life = o.life ?? 0.6;
        this.parts.push({ f: frame, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, drag: o.drag ?? 0, life, max: life, s0: o.s0 ?? 1, s1: o.s1 ?? (o.s0 ?? 1), rot: o.rot ?? fr() * 6.28, vr: o.vr ?? 0, col: o.col ?? "#ffffff", add: !!o.add, a: o.a ?? 1, sx: o.sx ?? 1, ground: o.ground ?? true });
    }
    dust(x, y, n, spread, col = this.T.dust, power = 1) {
        for (let i = 0; i < n; i++) {
            const a = fr() * 6.28, sp = rand(0.4, 1.8) * power;
            this.p(FX.puff + (i % 3), x + Math.cos(a) * spread * fr(), y + Math.sin(a) * spread * fr(), { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.5, drag: 1.6, life: rand(0.6, 1.5), s0: rand(0.7, 1.3), s1: rand(1.8, 3.4), col, a: rand(0.4, 0.75), vr: rand(-1, 1) });
        }
    }
    debris(frame, x, y, n, speed, cols, o = {}) {
        for (let i = 0; i < n; i++) {
            const a = fr() * 6.28, sp = rand(0.3, 1) * speed;
            this.p(frame + (o.vary ? i % 2 : 0), x + rand(-o.spread ?? 0, o.spread ?? 0), y + rand(-o.spread ?? 0, o.spread ?? 0), { vx: (o.vx ?? 0) * 0.5 + Math.cos(a) * sp, vy: (o.vy ?? 0) * 0.5 + Math.sin(a) * sp - rand(0, speed * 0.5), g: 14, life: rand(0.5, 1.2), s0: rand(o.s0 ?? 0.2, o.s1 ?? 0.45), s1: 0.1, col: cols[i % cols.length], vr: rand(-16, 16), add: o.add });
        }
    }
    float(text, x, y, o = {}) {
        if (this.floats.length > 16) this.floats.shift();
        this.floats.push({ text, x, y, t: 0, life: o.life ?? 0.9, size: o.size ?? 15, color: o.color ?? "#fff7dc", vy: o.vy ?? -1.6 });
    }
    shake(a, t) { const h = this.game.haptics, auto = h.auto; h.auto = false; this.s.shake(a, t); h.auto = auto; }
    freeze(sec) { if (this.freezeCool <= 0) { this.s.freeze(sec); this.freezeCool = 0.35; } }
    slowmo(sec = 1.5) {
        if (this.slowUsed) return;
        this.slowUsed = true; this.slowT = sec; this.slowDur = sec;
        if (!this.quiet) this.sound.slowmo();
        this.game.haptic([26, 40, 18]);
    }

    consume() {
        const ev = this.sim.events, q = this.quiet;
        const sound = this.sound, game = this.game, T = this.T;
        for (let i = 0; i < ev.length; i++) {
            const e = ev[i];
            switch (e.type) {
                case "thud":
                    if (!q) sound.thud(e.mat, e.J);
                    if (e.ammo === "ball" && !q) sound.boing();
                    if (e.J > 6 && fr() < 0.55) this.dust(e.x, e.y, 2, 0.3);
                    if (e.J > 10 && e.mat === "stone") this.debris(FX.chip, e.x, e.y, 3, 5, ["#d8d0c8", "#9e948e"]);
                    if (e.J > 5 && e.mat === "wood") this.debris(FX.splinter, e.x, e.y, 2, 5, ["#e0aa62", "#b57a3c"]);
                    if (e.J > 1.5 && e.mat === "glass") this.debris(FX.spark, e.x, e.y, 2, 3, ["#d6f6ff"], { add: true, s0: 0.1, s1: 0.2 });
                    break;
                case "heavy":
                    this.freeze(clamp(0.03 + e.J / 500, 0.03, 0.09));
                    this.shake(clamp(e.J * 0.18, 2, 12), 0.25);
                    this.p(FX.ring, e.x, e.y, { life: 0.28, s0: 0.3, s1: clamp(e.J * 0.09, 1, 4), a: 0.65, ground: false });
                    if (!q) game.haptic(e.J > 30 ? "heavy" : "medium");
                    break;
                case "crack":
                    this.dust(e.x, e.y, 2, 0.4);
                    this.debris(FX.chip, e.x, e.y, 4, 3.5, e.mat === "wood" ? ["#c98f4f"] : e.mat === "glass" ? ["#c9f0ff"] : ["#cbc3bc"]);
                    if (!q) sound.thud(e.mat, 12);
                    if (!q) game.haptic("tick");
                    break;
                case "break": this.onBreak(e); break;
                case "crumble":
                    this.debris(FX.chip, e.x, e.y, 3, 3, e.mat === "glass" ? ["#c9f0ff"] : e.mat === "stone" ? ["#cbc3bc", "#8d8480"] : ["#c98f4f"]);
                    this.dust(e.x, e.y, 1, 0.2);
                    break;
                case "explode": this.onExplode(e); break;
                case "fuse": if (!q) sound.fuse(); this.debris(FX.spark, e.x, e.y - 0.5, 5, 4, ["#ffd86b", "#ff8f3c"], { add: true, s0: 0.15, s1: 0.3 }); break;
                case "squash": this.onSquash(e); break;
                case "ouch":
                    if (!q) sound.squeak();
                    if (e.boss) { this.shake(6, 0.2); if (!q) game.haptic("medium"); this.float("OUCH!", e.x, e.y - 1.8, { size: 20, color: "#ffd6c4" }); this.debris(FX.star, e.x, e.y - 1, 6, 5, ["#ffe27a"]); }
                    break;
                case "bump": if (!q) sound.squeak(); this.debris(FX.star, e.x, e.y - 0.5, 2, 2.5, ["#ffe27a"], { s0: 0.2, s1: 0.3 }); break;
                case "groan": this.onGroan(e); break;
                case "score":
                    this.heat += e.why === "topple" ? 0.35 : e.why === "SQUASH" ? 2 : 1;
                    if (!q) sound.score();
                    if (e.why !== "topple") this.float(`+${e.pts}`, e.x, e.y, { size: e.pts >= 1000 ? 17 : 13, color: e.pts >= 1000 ? "#ffe27a" : "#fff7dc" });
                    this.hud?.bump?.();
                    break;
                case "mult": if (!q) sound.combo(e.mult); this.hud?.combo?.(e.mult); break;
                case "cleared": this.heat += 6; if (this.sim.energy > 25) this.slowmo(1.3); this.pip = 2; this.pipT = 4; break;
                case "fire": this.onFire(e); break;
                case "split": sound.power("split"); this.dust(e.x, e.y, 3, 0.2); this.debris(FX.spark, e.x, e.y, 8, 7, ["#ffd86b"], { add: true, s0: 0.15, s1: 0.3 }); break;
                case "slam": sound.power("slam"); this.p(FX.ring, e.x, e.y, { life: 0.3, s0: 0.3, s1: 2.4, a: 0.7 }); break;
                case "boost": sound.power("boost"); this.p(FX.ring, e.x, e.y, { life: 0.3, s0: 0.3, s1: 2, a: 0.7, col: "#ffc2cc" }); break;
                case "treasure":
                    if (!q) sound.unlock();
                    this.debris(FX.star, e.x, e.y, 16, 9, ["#ffd24a", "#fff0a8"], { s0: 0.25, s1: 0.5 });
                    this.float("TREASURE!", e.x, e.y - 1, { size: 18, color: "#ffd24a" });
                    break;
                case "bossDrop": if (!q) sound.bell(); this.hud?.banner?.("REINFORCEMENTS!", T.accent); break;
                case "shotGone": this.dust(e.x, e.y, 3, 0.3); break;
                case "won": case "lost": this.hud?.end?.(e.type, e); break;
            }
        }
        ev.length = 0;
    }

    onBreak(e) {
        const { mat, x, y, hw, hh, vx, vy } = e, q = this.quiet, size = hw + hh;
        if (!q) this.sound.breakIt(mat);
        if (mat === "glass") {
            this.debris(FX.shard, x, y, 12 + size * 8, 7, ["#d4f4ff", "#9fe2ff", "#ffffff"], { vary: true, spread: hw, vx, vy, s0: 0.22, s1: 0.5 });
            this.debris(FX.spark, x, y, 8, 5, ["#ffffff"], { add: true, s0: 0.12, s1: 0.28, spread: hw });
            if (!q) this.game.haptic("tick");
        } else if (mat === "stone") {
            this.debris(FX.chip, x, y, 7 + size * 5, 6.5, ["#d9d1ca", "#a59b95", "#7d7472"], { spread: hw, vx, vy, s0: 0.2, s1: 0.5 });
            this.dust(x, y, 3 + size * 2, hw, this.T.dust, 1.6);
            if (!q) this.game.haptic("medium");
        } else if (mat === "wood" || mat === "roof") {
            this.debris(FX.splinter, x, y, 7 + size * 5, 8, mat === "roof" ? ["#e0604c", "#a53a3a"] : ["#eab673", "#c98b49", "#8f5c31"], { spread: hw, vx, vy, s0: 0.3, s1: 0.65 });
            this.dust(x, y, 2 + size, hw * 0.7);
            if (!q) this.game.haptic("light");
        }
    }

    onExplode(e) {
        const { x, y, R, tnt } = e, q = this.quiet;
        if (!q) { this.sound.boom(tnt ? 1 : 0.8); this.game.haptic("heavy"); }
        this.heat += 3;
        this.freeze(0.07);
        this.shake(tnt ? 15 : 11, 0.45);
        this.s.flash("#fff0c0", 0.14);
        this.boom = 1; this.boomX = x; this.boomY = y;
        this.p(FX.ring, x, y, { life: 0.42, s0: 0.5, s1: R * 1.25, a: 0.9, ground: false });
        this.p(FX.spark, x, y, { life: 0.3, s0: R * 1.3, s1: R * 0.4, add: true, col: "#ffd27a", a: 0.9, ground: false });
        for (let i = 0; i < 22; i++) {
            const a = fr() * 6.28, sp = rand(0.15, 1) * R * 2.4;
            this.p(FX.flame, x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 4.5, life: rand(0.25, 0.6), s0: rand(0.9, 1.7), s1: 0.3, col: i % 3 ? "#ff9a3c" : "#ffe08a", add: true });
        }
        for (let i = 0; i < 12; i++) {
            const a = fr() * 6.28, sp = rand(0.3, 1) * R;
            this.p(FX.puff + (i % 3), x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, drag: 2.4, life: rand(0.9, 1.9), s0: 1, s1: rand(2.4, 4.4), col: i % 2 ? "#4d4048" : "#6d5f60", a: 0.8, vr: rand(-1, 1) });
        }
        this.debris(FX.spark, x, y, 18, 14, ["#ffd86b", "#ff8f3c", "#ffffff"], { add: true, s0: 0.12, s1: 0.3 });
    }

    onSquash(e) {
        const { x, y, r, kind } = e, q = this.quiet;
        if (!q) this.sound.squash(kind === "boss");
        this.freeze(kind === "boss" ? 0.14 : 0.06);
        this.shake(kind === "boss" ? 16 : 6, 0.3);
        this.debris(FX.seed, x, y, kind === "boss" ? 40 : 14, kind === "boss" ? 11 : 7, ["#ffd98c", "#ffc266", "#ff8f3c"], { s0: 0.24, s1: 0.42 });
        this.debris(FX.star, x, y, 5, 5, ["#ffe27a"], { s0: 0.25, s1: 0.45 });
        this.p(FX.ring, x, y, { life: 0.3, s0: 0.3, s1: 2.4, a: 0.8, col: "#ffb45e", ground: false });
        this.decals.push({ x, y: Math.min(y + r * 0.7, -0.15), r, t: 0 });
        if (this.decals.length > 14) this.decals.shift();
        this.float(kind === "boss" ? "BOSS SQUASHED!" : ["SPLAT!", "SQUISH!", "POMP-ED!", "BONK!"][Math.floor(fr() * 4)], x, y - 1.2, { size: kind === "boss" ? 24 : 16, color: "#ffb45e", life: 1.1 });
        if (kind === "boss") { this.heat += 9; this.s.flash("#ffffff", 0.2); }
        if (e.left === 0) this.slowmo(1.6);
    }

    onGroan(e) {
        if (!this.quiet) { this.sound.groan(e.load); this.game.haptic([14, 40, 22, 30, 12]); }
        this.groanLevel = 1;
        this.shake(2.5, 0.5);
        for (let i = 0; i < 5; i++) this.p(FX.puff + (i % 3), e.x + rand(-0.8, 0.8), e.y + rand(0, 0.6), { vy: rand(1, 3), drag: 0.6, life: rand(0.7, 1.3), s0: 0.25, s1: 0.8, col: this.T.dust, a: 0.6 });
        this.debris(FX.chip, e.x, e.y + 0.4, 3, 1.5, ["#cbc3bc"], { s0: 0.12, s1: 0.2 });
        if (fr() < 0.5) this.float("creeeak...", e.x, e.y - 0.8, { size: 12, color: "#ffe9c4", vy: -0.5, life: 1.2 });
    }

    onFire(e) {
        this.recoilV = -30;
        this.ghost = this.preview.slice();
        this.pip = 0;
        if (!this.quiet) { this.sound.release(this.tension); this.game.haptic(this.tension > 0.8 ? "medium" : "light"); }
        this.dust(SLING.x - 1, -0.3, 4, 1);
        this.slowUsed = false; this.heat = 0;
        this.cam.mode = "flight"; this.cam.hold = 0;
    }

    // --- Stepping -------------------------------------------------------------------------------
    /** World step: keeps the solver on its fixed tick whatever the time scale. */
    step(dt) {
        this.accum += dt;
        let n = 0;
        while (this.accum >= DT - 1e-9 && n < 3) { this.accum -= DT; n++; this.tick(); }
        if (this.accum > DT) this.accum = DT;
        const list = this.parts;
        let w = 0;
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            p.life -= dt;
            if (p.life <= 0) continue;
            const k = p.drag ? Math.max(0, 1 - p.drag * dt) : 1;
            p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
            if (p.g && p.y > -0.05 && p.ground) { p.y = -0.05; p.vy *= -0.3; p.vx *= 0.5; p.vr *= 0.4; }
            list[w++] = p;
        }
        list.length = w;
    }

    tick() {
        const sim = this.sim;
        if (!this.quiet) this.sound.tick();
        sim.step();
        this.consume();
        for (const q of sim.shots) {            // trails
            const b = q.b, sp = b.vx * b.vx + b.vy * b.vy;
            if (sp < 16) continue;
            if (q.ammo === "bomb") this.p(FX.spark, b.x, b.y - 0.5, { life: 0.3, s0: 0.3, s1: 0.1, add: true, col: "#ffc14a" });
            if (sim.tick % 2 === 0) this.p(FX.puff + sim.tick % 3, b.x, b.y, { life: 0.5, s0: 0.5, s1: 0.15, col: q.ammo === "ball" ? "#ffd0d6" : this.T.light, a: 0.5, vx: b.vx * 0.05, vy: b.vy * 0.05 });
        }
    }

    /** Real-time direction: runs through hit-stop and slow motion alike. */
    direct(dt) {
        const sim = this.sim, s = this.s;
        this.t += dt;
        this.freezeCool -= dt;
        this.heat = Math.max(0, this.heat - dt * 2.4);
        this.groanLevel = Math.max(0, this.groanLevel - dt * 1.2);
        if (this.heat > 8.5) this.slowmo();
        // Slow motion curve.
        if (this.slowT > 0) {
            this.slowT -= dt;
            const k = 1 - this.slowT / this.slowDur;
            s.timeScale = k < 0.08 ? lerp(1, 0.2, k / 0.08) : k > 0.68 ? lerp(0.2, 1, (k - 0.68) / 0.32) : 0.2;
            if (this.slowT <= 0) s.timeScale = 1;
        }
        // Rumble: intensity is the physics energy moving right now.
        const flow = Math.sqrt(sim.flowSmooth), ke = Math.sqrt(sim.energy);
        const I = clamp(flow / 34 + ke / 60 - 0.07);
        this.intensity += (I - this.intensity) * (I > this.intensity ? 0.5 : 0.1);
        if (this.intensity > this.peakIntensity) this.peakIntensity = this.intensity;
        this.rumbleT -= dt;
        if (this.rumbleT <= 0 && this.intensity > 0.035 && !this.quiet) {
            const k = this.intensity, on = Math.round(5 + k * 65), gap = Math.round(lerp(150, 34, Math.min(1, k * 1.6)));
            this.game.haptic(k > 0.55 ? [on, 12, on] : [on]);
            this.rumbleT = gap / 1000;
            if (k > 0.1) this.sound.rumble(k);
            if (k > 0.25) { const h = this.game.haptics, a = h.auto; h.auto = false; s.shake(1.5 + k * 7, 0.18); h.auto = a; }
        }
        // A tower teetering between hits: slow turning mass and little contact noise.
        this.wobbleT -= dt;
        if (sim.state === "flight" && this.wobbleT <= 0 && flow < 6 && sim.energy > 1 && sim.energy < 60) {
            let turning = 0;
            for (const p of sim.parts) if (p.kind === "block" && p.b.awake && Math.abs(p.b.w) > 0.08 && Math.abs(p.b.w) < 1.6) turning += p.b.mass;
            if (turning > 2.5) { this.groanLevel = 1; if (!this.quiet) { this.sound.groan(1); this.game.haptic([12, 50, 16]); } this.wobbleT = 1.1; }
        }
        // Ambient weather.
        this.ambient -= dt;
        if (this.ambient <= 0) {
            this.ambient = 0.09;
            const v = this.game.view, c = s.cam, z = c.zoom * WU, x = c.pos.x / WU + rand(-0.6, 0.6) * v.width / z, y = c.pos.y / WU - v.height / 2 / z;
            const th = this.themeName;
            if (th === "frost") this.p(FX.dot, x, y, { vx: rand(-0.6, -0.1), vy: rand(1, 1.8), life: 7, s0: rand(0.05, 0.12), a: 0.9, ground: false, g: 0 });
            else if (th === "ember") this.p(FX.spark, x, -rand(0, 0.5), { vx: rand(-0.4, 0.4), vy: -rand(0.8, 1.8), life: 4, s0: 0.14, s1: 0.03, col: "#ffae4d", add: true, ground: false });
            else if (th === "storm" && fr() < 0.7) this.p(FX.dot, x + 1, y, { vx: -2.5, vy: 13, life: 1.6, s0: 0.03, sx: 8, rot: 1.76, col: "#b9c0ff", a: 0.55, ground: false });
            else if (th === "gilded" && fr() < 0.4) this.p(FX.spark, x, y + rand(1, 14), { vx: rand(-0.3, 0.3), vy: 0.1, life: 2.4, s0: 0.12, s1: 0.02, col: "#ffe9a0", add: true, ground: false });
            else if (th === "meadow" && fr() < 0.12) this.p(FX.dot, x, -rand(1, 7), { vx: rand(-0.5, 0.5), vy: rand(-0.3, 0.3), life: 5, s0: 0.06, col: "#fff4b0", a: 0.8, add: true, ground: false });
        }
        if (this.themeName === "storm") {
            this.lightning -= dt;
            if (this.lightning <= 0) { this.lightning = rand(5, 11); s.flash("#d8dcff", 0.16); if (!this.quiet) this.sound.rumble(0.3); }
        }
        const list = this.floats;
        for (let i = list.length - 1; i >= 0; i--) { const f = list[i]; f.t += dt; f.y += f.vy * dt; if (f.t > f.life) list.splice(i, 1); }
        for (const q of this.decals) q.t += dt;
        this.boom = Math.max(0, this.boom - dt * 6);
        if (this.pipT > 0) { this.pipT -= dt; if (this.pipT <= 0) this.pip = 0; }
        // The sling arm springs back.
        this.recoilV += (-this.recoil * 300 - this.recoilV * 16) * dt; this.recoil += this.recoilV * dt;
        this.camera(dt);
    }

    framing(x0, x1, top, bottom = 0) {
        const v = this.game.view, safe = v.safe, portrait = v.height > v.width;
        const tm = (portrait ? 64 : 40) + safe.top, bm = this.bottomMargin ?? (portrait ? 118 + (v.height - 640) * 0.16 : 68) + safe.bottom;
        const needW = (x1 - x0) * WU, needH = Math.max(1, bottom - top) * WU;
        const z = clamp(Math.min(v.width / needW, (v.height - tm - bm) / needH), 0.12, 1.5);
        return { z, x: (x0 + x1) / 2 * WU, y: bottom * WU - (v.height / 2 - bm) / z };
    }
    wide() {
        const c = this.castle, v = this.game.view, tall = v.height > v.width;
        return this.framing(this.aiming ? (tall ? -4.6 : -6) : (tall ? -3.2 : -5), c.x1 + 1.4, Math.min(c.top - 1.2, -7));
    }

    camera(dt) {
        const c = this.cam, sim = this.sim, cam = this.s.cam;
        let g, rate = 3.2;
        const shot = sim.shots[0]?.b;
        c.hold = Math.max(0, c.hold - dt);
        if (c.mode === "flight" && (sim.state === "aim" || sim.state === "drop")) c.mode = "wide";
        if (c.mode === "flight" && sim.state === "ending" && !shot) c.mode = "action";
        if (c.mode === "peek") { const k = this.castle; g = this.framing(k.x0 - 1.5, k.x1 + 1.5, k.top - 1.4); rate = 5; }
        else if (c.mode === "flight") {
            // Moving things decide the shot: follow the boulder, then whatever it set off.
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
            for (const p of sim.parts) {
                if (p.kind !== "block" && p.kind !== "shot") continue;
                const b = p.b;
                if (!b.awake || b.vx * b.vx + b.vy * b.vy < 1.5) continue;
                n++; x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y);
            }
            const castleNear = shot ? shot.x > this.castle.x0 - 9 : true;
            if (shot && !castleNear) {
                g = this.framing(shot.x - 8, shot.x + 12, Math.min(shot.y - 4, -11)); rate = 4;
                c.focusX = shot.x; c.focusY = shot.y;
            } else if (n) {
                if (shot && x0 > shot.x) x0 = shot.x;
                const cx = (x0 + x1) / 2, hw = Math.max((x1 - x0) / 2 + 3, 8.5);
                const lo = Math.max(this.castle.x0 - 4, cx - hw), hi = Math.min(this.castle.x1 + 5, Math.max(cx + hw, lo + 17));
                g = this.framing(lo, hi, Math.min(y0 - 3, this.castle.top - 1.2));
                c.focusX = cx; c.focusY = (y0 + y1) / 2; c.last = g; c.hold = 0.7; rate = 2.6;
                if (this.slowT > 0) g = { ...g, z: g.z * 1.1 };
            } else g = c.hold > 0 && c.last ? c.last : this.framing(this.castle.x0 - 4, this.castle.x1 + 3, this.castle.top - 2);
        } else if (c.mode === "action") {
            g = c.last ?? this.wide(); rate = 2;
        } else { g = this.wide(); rate = 2.2; }
        if (c.mode === "intro") g = this.wide();
        const k = 1 - Math.exp(-rate * dt);
        c.z = Math.exp(lerp(Math.log(c.z), Math.log(g.z), k)); c.x = lerp(c.x, g.x, k); c.y = lerp(c.y, g.y, k);
        cam.zoom = c.z;
        cam.pos = [c.x, c.y];
    }
    cut(g) { const c = this.cam; c.z = g.z; c.x = g.x; c.y = g.y; this.s.cam.zoom = g.z; this.s.cam.cut([g.x, g.y]); }

    // --- Painting -------------------------------------------------------------------------------
    at(d, x, y, c = 1, s = 0) { const m = d.m; m[0] = c; m[1] = s; m[2] = -s; m[3] = c; m[4] = x; m[5] = y; }

    draw(d) {
        const sim = this.sim, game = this.game, T = this.T, spr = this.spr, v = game.view;
        const frozen = this.s.frozen > 0;
        const alpha = frozen ? 1 : clamp(this.accum / DT + game.alpha * (this.s.timeScale ?? 1));
        const cam = this.s.cam, cx = cam.pos.x, z = cam.zoom, halfW = v.width / 2 / z, tag = this.themeName;
        d.reset();
        // Sky furniture.
        this.drawSun(d);
        this.layer(d, `far_${tag}`, 0.16, 1.9, 256);
        spr.color = "#ffffff"; spr.opacity = 1; spr.frame = 0; spr.flipX = false;
        for (const q of this.clouds) {
            q.x += q.v * 0.016;
            if (q.x > 110) q.x = -70;
            const px = q.x * WU * 1.6 + cx * (1 - q.f), py = q.y * WU + cam.pos.y * 0.5;
            this.at(d, px, py);
            spr.width = 256 * q.s; spr.height = 128 * q.s; spr.opacity = 0.85;
            d.sprite(`cloud_${tag}`, spr);
        }
        spr.opacity = 1;
        this.layer(d, `near_${tag}`, 0.42, 1.5, 200);
        d.reset();

        // Plateaus.
        for (const k of sim.statics) {
            const left = k.x - k.w / 2, top = k.y - k.h / 2;
            for (let i = 0; i < Math.ceil(k.w / 4); i++) {
                const w = Math.min(4, k.w - i * 4);
                this.at(d, (left + i * 4 + w / 2) * WU, (top + k.h / 2) * WU);
                spr.width = w * WU; spr.height = k.h * WU;
                d.sprite(`rock_${tag}`, spr);
                this.at(d, (left + i * 4 + w / 2) * WU, (top + 0.42) * WU);
                spr.height = 1.1 * WU;
                d.sprite(`ground_${tag}`, spr);
            }
        }
        // Decals behind everything live.
        for (const q of this.decals) {
            this.at(d, q.x * WU, q.y * WU);
            spr.width = q.r * 3.4 * WU; spr.height = q.r * 3.4 * WU; spr.frame = FX.pancake; spr.color = "#ffffff"; spr.opacity = clamp(5 - q.t * 0.4);
            d.sprite("fx", spr);
        }
        spr.opacity = 1;
        this.at(d, (this.castle.x0 + this.castle.x1) / 2 * WU, -2);
        spr.frame = 3; spr.color = "#1a1014"; spr.opacity = 0.34; spr.width = (this.castle.x1 - this.castle.x0 + 7) * WU; spr.height = 2 * WU;
        d.sprite("fx", spr);
        this.at(d, 0, -2); spr.width = 6 * WU; spr.height = 1.2 * WU; d.sprite("fx", spr);
        spr.opacity = 1; spr.color = "#ffffff";
        this.drawCatapult(d, alpha, false);

        // Sort blocks into strips: blocks never overlap, so order within the castle doesn't matter.
        const B = this.buckets;
        for (const k in B) B[k].length = 0;
        const list = sim.parts;
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.kind === "block") B[p.mat === "roof" ? (p.shape === "R" ? "roof3" : "roof2") : STRIP[p.shape] ?? "b11"].push(p);
            else if (p.kind === "frag") B.frag.push(p);
        }
        const woodTint = T.wood, stoneTint = T.stone;
        for (const name of ["b11", "b21", "b31", "b405", "b205", "b105"]) {
            const arr = B[name];
            for (let i = 0; i < arr.length; i++) {
                const p = arr[i], b = p.b, [mw, mh] = CELL[p.shape];
                let x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha), c = lerp(b.pc, b.c, alpha), s = lerp(b.ps, b.s, alpha);
                const n = Math.hypot(c, s) || 1; c /= n; s /= n;
                if (p.creep) { x += Math.sin(this.t * 61) * 0.015; }
                this.at(d, x * WU, y * WU, c, s);
                spr.width = (mw * PX + PAD * 2) / PX * WU; spr.height = (mh * PX + PAD * 2) / PX * WU;
                spr.frame = p.mat === "tnt" ? (p.lit && Math.floor(this.t * 20) % 2 ? 10 : 9) : p.mat === "gold" ? 11 : FRAME_BASE[p.mat] + p.stage;
                spr.color = p.mat === "stone" ? stoneTint : p.mat === "wood" ? woodTint : "#ffffff";
                d.sprite(name, spr);
            }
        }
        for (const name of ["roof2", "roof3"]) {
            const arr = B[name], big = name === "roof3", tall = big ? 2.8 : 2.2, wide = (big ? 3 : 2) + 24 / PX, ch = tall + PAD * 2 / PX;
            for (let i = 0; i < arr.length; i++) {
                const p = arr[i], b = p.b, h = b.hh;
                const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha); let c = lerp(b.pc, b.c, alpha), s = lerp(b.ps, b.s, alpha);
                const n = Math.hypot(c, s) || 1; c /= n; s /= n;
                const lift = h - ch / 2 + (8 + PAD) / PX;        // lip rests on the box's underside
                this.at(d, x * WU, y * WU, c, s);
                d.translate(0, lift * WU);
                spr.width = wide * WU; spr.height = ch * WU; spr.frame = p.stage; spr.color = "#ffffff";
                d.sprite(name, spr);
                // Pennant
                const tip = -ch / 2 * WU + 5;
                d.line([0, tip + 3], [0, tip - 25], { width: 2.4, color: "#3a2a2c" });
                const fl = Math.sin(this.t * 6 + b.id) * 0.1;
                d.translate(13, tip - 17); d.rotate(fl);
                spr.width = 28; spr.height = 26; spr.frame = FX.flag; spr.color = T.accent;
                d.sprite("fx", spr);
            }
        }
        const fr0 = B.frag;
        for (let i = 0; i < fr0.length; i++) {
            const p = fr0[i], b = p.b;
            const x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha); let c = lerp(b.pc, b.c, alpha), s = lerp(b.ps, b.s, alpha);
            const n = Math.hypot(c, s) || 1; c /= n; s /= n;
            this.at(d, x * WU, y * WU, c, s);
            spr.width = b.hw * 2.5 * WU; spr.height = b.hh * 2.5 * WU;
            const base = p.mat === "stone" ? 3 : p.mat === "glass" ? 6 : 0;
            spr.frame = base + p.fragKind; spr.color = p.mat === "stone" ? stoneTint : p.mat === "roof" ? "#e88a78" : "#ffffff"; spr.opacity = clamp(p.life / 0.5);
            d.sprite("frag", spr);
        }
        spr.opacity = 1; spr.color = "#ffffff";
        this.drawFolk(d, alpha);
        // Shots
        for (const q of sim.shots) {
            const b = q.b, x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha);
            let c = lerp(b.pc, b.c, alpha), s = lerp(b.ps, b.s, alpha);
            const n = Math.hypot(c, s) || 1; c /= n; s /= n;
            this.at(d, x * WU, y * WU, c, s);
            const r = b.r * 96 / 76 * 2 * WU;
            spr.width = r; spr.height = r; spr.frame = q.spent && q.ammo === "split" ? 0 : AMMO_FRAME[q.ammo];
            d.sprite("ammo", spr);
        }
        this.drawCatapult(d, alpha, true);
        // Ground, drawn after the castle so grass overlaps its feet.
        const gw = 256 * 1.4, x0 = Math.floor((cx - halfW) / gw) - 1, n = Math.ceil(halfW * 2 / gw) + 3;
        spr.width = gw + 0.5; spr.height = 128 * 1.4; spr.frame = 0; spr.color = "#ffffff";
        for (let i = 0; i < n; i++) { this.at(d, (x0 + i) * gw + gw / 2, spr.height / 2 - 12); d.sprite(`ground_${tag}`, spr); }
        d.reset();
        d.rect(halfW * 4, 900, { x: cx, y: 128 * 1.4 - 13 + 450, color: T.dirt[1] });
        this.drawAim(d);
        this.drawParticles(d);
        d.reset();
    }

    drawSun(d) {
        const sun = this.T.sun, v = this.game.view, cam = this.s.cam, z = cam.zoom, spr = this.spr, col = `#${sun[0].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
        const sx = cam.pos.x + (sun[1] - 0.5) * v.width / z, sy = cam.pos.y + (sun[2] - 0.5) * v.height / z, r = 30 / z;
        spr.frame = 3; spr.color = col;
        d.additive(() => {
            this.at(d, sx, sy); spr.width = spr.height = r * 7; spr.opacity = 0.5; d.sprite("fx", spr);
            spr.width = spr.height = r * 3.6; spr.opacity = 0.7; d.sprite("fx", spr);
        });
        d.reset();
        this.at(d, sx, sy); d.scale(1 / z, 1 / z); d.circle(r * z, { color: col }); d.reset();
        spr.color = "#ffffff";
    }

    layer(d, name, f, scale, h) {
        const cam = this.s.cam, cx = cam.pos.x, z = cam.zoom, spr = this.spr, v = this.game.view;
        const tall = v.height / v.width, k = scale * (tall > 1 ? 1 + (tall - 1) * 0.55 : 1) / Math.min(1, z / 0.42), W = 1024 * k, H = h * k, shift = cx * (1 - f);
        const left = cx - v.width / 2 / z, count = Math.ceil(v.width / z / W) + 2, base = Math.floor((left - shift) / W);
        spr.width = W + 1; spr.height = H; spr.frame = 0; spr.color = "#ffffff"; spr.opacity = 1;
        for (let i = 0; i < count; i++) { this.at(d, shift + (base + i) * W + W / 2, -H / 2 + 4); d.sprite(name, spr); }
    }

    drawCatapult(d, alpha, front) {
        if (this.hideCatapult) return;
        const sim = this.sim, spr = this.spr, W = 4.2 * WU, Hh = W * 260 / 300;
        const tipL = [-0.59, -3.2], tipR = [0.59, -3.2];
        const held = (sim.state === "aim" || this.aiming) && (sim.shotsLeft() > 0 || sim.mode === "sandbox");
        const k = this.aiming ? this.tension : 0;
        const pullX = SLING.x + (this.aiming ? this.aimX * 2 : 0) + this.recoil * 0.05, pullY = SLING.y + (this.aiming ? this.aimY * 2 : 0);
        const band = (t) => { d.reset(); for (const [q, w, col] of [[t, 6.5 - k * 2.5, "#26181c"], [t, 3.8 - k * 1.8, k > 0.7 ? "#e8583a" : "#a34a38"]]) d.line([q[0] * WU, q[1] * WU], [pullX * WU, pullY * WU], { width: w, color: col }); };
        if (!front) {
            band(tipR);
            this.at(d, 0, -Hh / 2 + 1);
            spr.width = W; spr.height = Hh; spr.frame = 0; spr.color = "#ffffff"; spr.opacity = 1;
            d.sprite("catapult", spr);
            // Pip the engineer
            const hop = this.pip === 2 ? Math.abs(Math.sin(this.t * 9)) * 7 : 0;
            this.at(d, -2.9 * WU, -0.82 * WU - hop);
            spr.width = 1.45 * WU; spr.height = 1.66 * WU; spr.frame = this.aiming ? 1 : this.pip;
            d.sprite("pip", spr);
            return;
        }
        if (held) {
            const r = AMMO[this.ammo].r;
            this.at(d, pullX * WU, pullY * WU);
            spr.width = spr.height = r * 96 / 76 * 2 * WU; spr.frame = AMMO_FRAME[this.ammo];
            d.sprite("ammo", spr);
        }
        band(tipL);
    }

    drawAim(d) {
        const list = this.preview, spr = this.spr;
        if (!this.aiming && this.ghost.length) {
            for (let i = 0; i < this.ghost.length; i += 4) {
                this.at(d, this.ghost[i] * WU, this.ghost[i + 1] * WU);
                spr.width = spr.height = 7; spr.frame = FX.dot; spr.color = "#ffffff"; spr.opacity = 0.28;
                if (this.sim.state === "aim") d.sprite("fx", spr);
            }
            spr.opacity = 1;
        }
        if (!this.aiming) return;
        const n = list.length / 2, phase = (this.t * 2.2) % 1, zoom = this.s.cam.zoom;
        for (let i = 0; i < n; i++) {
            const ii = i * 2, fade = 1 - (i / n) * 0.35, pulse = ((i + phase) % 1);
            this.at(d, list[ii] * WU, list[ii + 1] * WU);
            const size = (i % 2 ? 11 : 15) / zoom * 0.62 * (0.9 + 0.15 * Math.sin(pulse * 6.28));
            spr.width = spr.height = size; spr.frame = FX.bead; spr.color = this.tension > 0.92 ? "#ffd86b" : "#ffffff"; spr.opacity = fade;
            d.sprite("fx", spr);
        }
        spr.opacity = 1;
        // A landing marker that promises the crash.
        if (n > 1) {
            const lx = list[list.length - 2], ly = list[list.length - 1], sz = (34 + Math.sin(this.t * 9) * 5) / zoom * 0.7;
            this.at(d, lx * WU, ly * WU);
            spr.width = spr.height = sz; spr.frame = FX.ring; spr.color = "#ffd86b";
            d.sprite("fx", spr);
        }
    }

    drawFolk(d, alpha) {
        const sim = this.sim, spr = this.spr, shot = sim.shots[0]?.b;
        const danger = !!shot || sim.energy > 8;
        spr.color = "#ffffff"; spr.opacity = 1;
        for (const p of sim.defenders) {
            const b = p.b, x = lerp(b.px, b.x, alpha), y = lerp(b.py, b.y, alpha);
            let c = lerp(b.pc, b.c, alpha), s = lerp(b.ps, b.s, alpha);
            const n = Math.hypot(c, s) || 1; c /= n; s /= n;
            const boss = p.type === "boss";
            const breathe = Math.sin(this.t * 3 + p.tone * 2) * 0.03, sq = p.flash > 0 ? 0.16 : 0;
            const fx = shot ? shot.x : this.cam.focusX, fy = shot ? shot.y : -4, dist = Math.hypot(fx - x, fy - y);
            const scared = danger && dist < 13 || p.grief > 0.3;
            const blink = !scared && (this.t + p.tone * 1.3) % 3.3 < 0.12;
            const mood = p.flash > 0 ? 3 : scared ? 2 : blink ? 1 : 0;
            const shiver = scared ? Math.sin(this.t * 44 + p.tone) * 0.016 * WU : 0;
            this.at(d, x * WU + shiver, y * WU, c, s);
            const size = b.r * 2 * WU * (boss ? 230 / 168 : 128 / 94);
            spr.width = size * (1 + sq - breathe); spr.height = size * (1 - sq + breathe);
            spr.frame = boss ? mood : (p.type === "knight" ? 4 : 0) + mood;
            if (boss) d.translate(0, -size * 30 / 230);
            d.sprite(boss ? this.boss : "folk", spr);
            if (mood === 0 || mood === 2) {            // Pupils watch whatever frightens them.
                const R = b.r * WU, ex = R * 0.36, ey = -R * (boss ? 0.13 : 0.12) , big = mood === 2 ? 0.75 : 1;
                let lx = fx - x, ly = fy - y;
                const L = Math.hypot(lx, ly) || 1; lx /= L; ly /= L;
                const ax = c * lx + s * ly, ay = -s * lx + c * ly;
                spr.frame = FX.dot; spr.color = "#26181c";
                spr.width = spr.height = R * 0.3 * big;
                const px = ax * R * 0.09, py = ay * R * 0.11;
                const lm = d.m;
                const wx = x * WU + shiver, wy = y * WU;
                for (const sg of [-1, 1]) {
                    lm[4] = wx + c * (sg * ex + px) - s * (ey + py); lm[5] = wy + s * (sg * ex + px) + c * (ey + py);
                    d.sprite("fx", spr);
                }
                spr.color = "#ffffff";
            }
        }
    }

    drawParticles(d) {
        const list = this.parts, spr = this.spr;
        const one = (p) => {
            const k = p.life / p.max, size = lerp(p.s1, p.s0, k) * WU, c = Math.cos(p.rot), s = Math.sin(p.rot);
            this.at(d, p.x * WU, p.y * WU, c, s);
            spr.width = size * p.sx * (p.f === FX.ring ? 2 : 1.4); spr.height = size * (p.f === FX.ring ? 2 : 1.4);
            spr.frame = p.f; spr.color = p.col; spr.opacity = p.a * clamp(k * 2.2);
            d.sprite("fx", spr);
        };
        for (let i = 0; i < list.length; i++) if (!list[i].add) one(list[i]);
        d.additive(() => { for (let i = 0; i < list.length; i++) if (list[i].add) one(list[i]); });
        spr.opacity = 1; spr.color = "#ffffff";
    }

    /** Floating words, in screen space. */
    drawFloats(d) {
        const cam = this.s.cam;
        for (const f of this.floats) {
            const p = cam.toView([f.x * WU, f.y * WU]), k = f.t / f.life, pop = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.6 : 1.2 - Math.min(0.2, (f.t - 0.12) * 1.2);
            popText(d, f.text, p.x, p.y, f.size, pop, f.color, { opacity: clamp((1 - k) * 2.4) });
        }
    }
}
