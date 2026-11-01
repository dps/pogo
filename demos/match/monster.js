// MORSEL. A see-through gummy monster built as a puppet of painted parts, so he can squash, stare, chew and sulk.
// He stands on the board's top rim. Candies you match really do end up inside his belly.
import { INK, Painter, arc, capsule, circle, ellipse, hex, mix3, polygon, rbox, rotated, smooth, star, stroke, teeth, union } from "./sdf.js";
import { SHEET, SLOT } from "./art.js";

const SHEETW = 1024, SHEETH = 1170, MON = "morsel";
const R = {
    back: [0, 0, 420, 440], front: [420, 0, 420, 440], eye: [0, 440, 120, 130], pupil: [120, 440, 76, 76], happy: [196, 440, 110, 74], closed: [306, 440, 110, 60],
    starEye: [416, 440, 104, 104], dizzy: [520, 440, 104, 104], tail: [624, 440, 190, 170], arm: [814, 440, 110, 120], foot: [840, 0, 140, 96], lid: [840, 100, 130, 76],
    spikes: [0, 934, 440, 230], heart: [840, 610, 80, 80], sweat: [920, 610, 64, 80], tear: [840, 700, 64, 80], zed: [920, 700, 80, 80],
};
const HORN = (n) => [n * 100, 600, 100, 130];
const MOUTH = (n) => [n * 170, 790, 170, 136];
export const MOUTHS = { smile: 0, o: 1, wide: 2, chew: 3, frown: 4, grin: 5 };

const BASE = hex("#2fe0c8"), DEEP = hex("#0a8aa8"), LIGHT = hex("#b8fff0"), INSIDE = hex("#7ff0dc");

export function paintMorsel(assets) {
    assets.paint(MON, SHEETW, SHEETH, (px) => {
        const p = new Painter(px.data, SHEETW, SHEETH);
        const at = (r) => p.cell(r[0], r[1], r[2], r[3]);
        const body = smooth(46, circle(210, 280, 148), circle(210, 146, 118), ellipse(210, 110, 124, 62));
        const ink = mix3(hex("#0a5a84"), INK, 0.6);
        at(R.back); p.shape(body, { color: (x, y, d) => mix3(DEEP, BASE, Math.min(1, d * 0.9 + 0.1)), bevel: 110, gloss: 0, glow: 0.3, inkW: 7, ink });
        p.shape(ellipse(210, 296, 118, 116), { color: (x, y, d) => mix3(INSIDE, hex("#e4fff6"), (y - 200) / 220), bevel: 60, gloss: 0, glow: 0.2, ink: null, inkW: 0 });
        at(R.front);
        p.shape(body, { color: (x, y, d) => mix3(mix3(DEEP, BASE, Math.min(1, d * 2.2)), LIGHT, Math.max(0, (y - 300) / 300)), bevel: 120, gloss: 1, glow: 0.8, alpha: 0.1, ink: null, inkW: 0 });
        p.shape(subtractLite(body, ellipse(210, 296, 112, 110)), { color: (x, y, d) => mix3(DEEP, BASE, Math.min(1, d * 1.7 + 0.25)), bevel: 110, gloss: 1, glow: 0.8, alpha: 0.96, ink: null, inkW: 0 });
        p.soft(rotated(ellipse(116, 118, 26, 14), 116, 118, -0.8), [1, 1, 1], 0.9, 4).soft(circle(150, 70, 8), [1, 1, 1], 0.85, 2).soft(rotated(ellipse(138, 262, 34, 12), 138, 262, 1.2), [1, 1, 1], 0.5, 6).soft(rotated(ellipse(290, 370, 24, 7), 290, 370, -0.9), hex("#c8fff4"), 0.6, 5);
        at(R.eye); p.shape(ellipse(60, 65, 52, 58), { color: hex("#ffffff"), bevel: 40, gloss: 0.3, glow: 0, inkW: 6, ink: INK });
        at(R.pupil); p.shape(circle(38, 38, 30), { color: (x, y) => mix3(hex("#1b0e2c"), hex("#5a2c8c"), y / 76), bevel: 26, gloss: 0.2, ink: null, inkW: 0 });
        p.soft(circle(27, 26, 11), [1, 1, 1], 1, 1.5).soft(circle(49, 50, 5), [1, 1, 1], 0.9, 1.2);
        at(R.happy); p.shape(stroke(arc(55, 62, 42, 44, Math.PI * 1.08, Math.PI * 1.92, 16), 8), { color: INK, flat: true, ink: null });
        at(R.closed); p.shape(stroke(arc(55, 12, 42, 34, Math.PI * 0.1, Math.PI * 0.9, 14), 7), { color: INK, flat: true, ink: null });
        at(R.lid); p.shape(ellipse(65, 2, 62, 60), { color: BASE, bevel: 30, gloss: 0.3, inkW: 6, ink });
        at(R.starEye); p.shape(polygon(star(52, 54, 48, 0.52), 4), { color: hex("#ffd21f"), bevel: 18, gloss: 1, glow: 0.5, inkW: 4 });
        at(R.dizzy); p.shape(ellipse(52, 52, 46, 48), { color: [1, 1, 1], bevel: 30, gloss: 0.2, inkW: 5 });
        const spiral = []; for (let n = 0; n < 40; n++) { const a = n * 0.42, r = 4 + n * 0.9; spiral.push([52 + Math.cos(a) * r, 52 + Math.sin(a) * r]); }
        p.shape(stroke(spiral, 2.8), { color: INK, flat: true, ink: null });
        at(R.tail); p.shape(smooth(14, capsule(150, 140, 90, 110, 34), capsule(90, 110, 46, 60, 21), circle(34, 38, 16)), { color: (x, y, d) => mix3(DEEP, BASE, Math.min(1, d * 1.6)), bevel: 34, gloss: 0.9, glow: 0.7, inkW: 6, ink });
        at(R.arm); p.shape(smooth(10, capsule(55, 38, 55, 72, 28), circle(38, 92, 13), circle(58, 98, 14), circle(78, 90, 13)), { color: (x, y, d) => mix3(DEEP, BASE, Math.min(1, d * 1.6)), bevel: 30, gloss: 0.9, glow: 0.7, inkW: 6, ink });
        at(R.foot); p.shape(smooth(10, ellipse(70, 54, 58, 34), circle(32, 72, 15), circle(70, 76, 16), circle(108, 72, 15)), { color: (x, y, d) => mix3(DEEP, BASE, Math.min(1, d * 1.6)), bevel: 30, gloss: 0.9, glow: 0.7, inkW: 6, ink });
        [0, 1, 2, 3].forEach((n) => {
            at(HORN(n));
            const h = 44 + n * 22, w = 22 + n * 4;
            p.shape(polygon([[50 - w, 122], [50 + w, 122], [58, 122 - h], [52 - w * 0.2, 122 - h - 2]], 7), { color: (x, y) => mix3(hex("#ffd21f"), hex("#ff8a1f"), (y - 40) / 90), bevel: 16, gloss: 1, glow: 0.5, inkW: 5 });
        });
        at(R.spikes); for (let n = 0; n < 7; n++) {
            const a = Math.PI * (1.08 + n * 0.14), x = 220 + Math.cos(a) * 138, y = 180 + Math.sin(a) * 112, nx = Math.cos(a), ny = Math.sin(a);
            p.shape(polygon([[x - ny * 34, y + nx * 34], [x + ny * 34, y - nx * 34], [x + nx * 52, y + ny * 52]], 7), { color: hex("#ff5c9a"), bevel: 12, gloss: 0.9, glow: 0.4, inkW: 5 });
        }
        at(MOUTH(0)); p.shape(stroke(arc(85, 28, 56, 46, 0.25, Math.PI - 0.25, 16), 7), { color: INK, flat: true, ink: null });
        p.shape(polygon([[52, 70], [68, 74], [58, 92]], 2), { color: [1, 1, 1], flat: true, inkW: 3 });
        const cavity = (shape, tongueY, tw) => {
            p.shape(shape, { color: hex("#6e1740"), bevel: 18, gloss: 0, inkW: 6 });
            p.shape(ellipse(85, tongueY, tw, 20), { color: hex("#ff6f9c"), bevel: 14, gloss: 0.6, ink: null, inkW: 0 });
        };
        at(MOUTH(1)); cavity(ellipse(85, 64, 34, 40), 88, 22);
        at(MOUTH(2)); cavity(smooth(10, ellipse(85, 66, 72, 56), rbox(85, 36, 74, 24, 18)), 100, 44);
        p.shape(polygon([[34, 16], [58, 16], [46, 40]], 2), { color: [1, 1, 1], bevel: 6, gloss: 0.5, inkW: 3 });
        p.shape(polygon([[112, 16], [136, 16], [124, 40]], 2), { color: [1, 1, 1], bevel: 6, gloss: 0.5, inkW: 3 });
        at(MOUTH(3)); p.shape(stroke([[38, 58], [58, 46], [76, 60], [94, 46], [112, 60], [132, 48]], 7), { color: INK, flat: true, ink: null });
        at(MOUTH(4)); p.shape(stroke(arc(85, 84, 40, 30, Math.PI * 1.18, Math.PI * 1.82, 12), 7), { color: INK, flat: true, ink: null });
        at(MOUTH(5)); cavity(smooth(4, ellipse(85, 40, 66, 44), rbox(85, 20, 68, 12, 8)), 66, 34);
        at(R.heart); p.shape(smooth(4, circle(26, 30, 18), circle(54, 30, 18), polygon([[12, 40], [68, 40], [40, 72]], 4)), { color: hex("#ff4f7e"), bevel: 14, gloss: 1, glow: 0.5, inkW: 4 });
        at(R.sweat); p.shape(smooth(5, circle(32, 52, 18), polygon([[32, 10], [20, 42], [44, 42]], 2)), { color: hex("#9ee6ff"), bevel: 12, gloss: 1, glow: 0.5, inkW: 3.5 });
        at(R.tear); p.shape(smooth(5, circle(32, 52, 18), polygon([[32, 10], [20, 42], [44, 42]], 2)), { color: hex("#6cc8ff"), bevel: 12, gloss: 1, glow: 0.5, inkW: 3.5 });
        at(R.zed); p.shape(stroke([[18, 18], [62, 18], [18, 62], [62, 62]], 8), { color: hex("#ffffff"), bevel: 7, gloss: 0.3, inkW: 4 });
    }, { smooth: true });
}
const subtractLite = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));

const spring = (o, key, vel, target, k, c, dt) => { o[vel] += (target - o[key]) * k * dt - o[vel] * c * dt; o[key] += o[vel] * dt; };

export class Morsel {
    constructor(game, s) {
        this.game = game; this.s = s;
        this.x = 0; this.y = 0; this.z = 0; this.size = 80; this.flip = 1; this.lean = 0; this.leanV = 0;
        this.sq = 0; this.sqV = 0; this.horn = 0; this.spikes = false;
        this.eyes = "open"; this.mouth = "smile"; this.moodT = 0; this.moodEyes = null; this.moodMouth = null;
        this.look = { x: 0, y: 0 }; this.lookTarget = null; this.blink = 2; this.blinkT = 0; this.hold = 0; this.chew = 0;
        this.t = game.fxRng.range ? game.fxRng.range(0, 9) : 0; this.belly = []; this.fat = 0; this.fatV = 0; this.fatTarget = 0;
        this.walk = null; this.leap = null; this.sweat = 0; this.shakeHead = 0; this.floaters = []; this.sleeping = false; this.ready = 0;
        this.visible = true;
    }
    /** Where candy goes. */
    mouthPos() { const u = this.size / 400 * (this.scaleBoost ?? 1); return { x: this.x + (this.flip < 0 ? 0 : 0), y: this.y - this.z - 212 * u }; }
    centre() { return { x: this.x, y: this.y - this.z - this.size * 0.5 }; }
    contains(x, y) { const c = this.centre(), r = Math.max(this.size * 0.62, 34); return Math.abs(x - c.x) < r && Math.abs(y - c.y) < r * 1.1; }

    mood(eyes, mouth, t = 0.8) { this.moodEyes = eyes; this.moodMouth = mouth; this.moodT = t; }
    kick(a) { this.sqV += a; }
    tilt(a) { this.leanV += a; }
    no() { this.shakeHead = 0.5; this.mood("open", "frown", 0.6); this.kick(-1.2); }
    open(t) { this.hold = Math.max(this.hold, t); }
    gulp(frame, big) {
        this.chew = Math.max(this.chew, 0.45); this.kick(big ? 3.6 : 1.8); this.fatV += big ? 1.4 : 0.5;
        const rng = this.game.fxRng, a = rng.next() * 6.28, r = Math.sqrt(rng.next()) * 72;
        this.belly.push({ f: frame, x: 210 + Math.cos(a) * r, y: 300 + Math.sin(a) * r * 0.9, rot: rng.next() * 6, p: rng.next() * 6, s: 0, v: 8 });
        if (this.belly.length > 14) this.belly.shift();
    }
    float(icon, o = {}) { if (this.floaters.length < 12) this.floaters.push({ icon, t: 0, life: o.life ?? 1, x: o.x ?? 0, y: o.y ?? 0, vx: o.vx ?? 0, vy: o.vy ?? -46, size: o.size ?? 22 }); }

    /** Waddle along the ground. */
    walkTo(x, time, done) { this.walk = { x0: this.x, x1: x, t: 0, time, done }; this.flip = x < this.x ? -1 : 1; }
    /** Jump in an arc, optionally landing somewhere else, then calling done. */
    leapTo(x, y, time, h, done) { this.leap = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, time, h, done }; this.kick(-3); }

    update(dt) {
        this.t += dt;
        spring(this, "sq", "sqV", 0, 170, 12, dt);
        spring(this, "lean", "leanV", 0, 120, 9, dt);
        spring(this, "fat", "fatV", this.fatTarget, 80, 8, dt);
        if (this.moodT > 0) { this.moodT -= dt; if (this.moodT <= 0) this.moodEyes = this.moodMouth = null; }
        this.hold = Math.max(0, this.hold - dt); this.chew = Math.max(0, this.chew - dt);
        this.blink -= dt;
        if (this.blink < 0) { this.blinkT = 0.13; this.blink = 1.6 + this.game.fxRng.next() * 3.5; }
        this.blinkT = Math.max(0, this.blinkT - dt);
        const lx = this.lookTarget ? Math.max(-1, Math.min(1, (this.lookTarget.x - this.x) / 90)) : Math.sin(this.t * 0.7) * 0.25;
        const ly = this.lookTarget ? Math.max(-1, Math.min(1, (this.lookTarget.y - (this.y - this.size * 0.75)) / 90)) : 0.1;
        this.look.x += (lx - this.look.x) * Math.min(1, dt * 14); this.look.y += (ly - this.look.y) * Math.min(1, dt * 14);
        if (this.shakeHead > 0) { this.shakeHead -= dt; }
        for (const b of this.belly) { b.v += (1 - b.s) * 200 * dt - b.v * 12 * dt; b.s += b.v * dt; }
        const w = this.walk;
        if (w) {
            w.t += dt;
            const k = Math.min(1, w.t / w.time);
            this.x = w.x0 + (w.x1 - w.x0) * k;
            this.z = Math.abs(Math.sin(w.t * 11)) * 6 * (this.size / 80);
            this.lean = Math.sin(w.t * 11) * 0.12;
            if (k >= 1) { this.walk = null; this.z = 0; this.kick(-1); w.done?.(); }
        }
        const l = this.leap;
        if (l) {
            l.t += dt;
            const k = Math.min(1, l.t / l.time);
            this.x = l.x0 + (l.x1 - l.x0) * k; this.y = l.y0 + (l.y1 - l.y0) * k;
            this.z = Math.sin(k * Math.PI) * l.h;
            if (k >= 1) { this.leap = null; this.z = 0; this.sqV -= 5; l.done?.(); }
        }
        for (let n = this.floaters.length - 1; n >= 0; n--) { const f = this.floaters[n]; f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t > f.life) this.floaters.splice(n, 1); }
    }

    shadow(d) {
        if (!this.visible) return;
        const size = this.size * (1 + this.fat * 0.3) * (1 - Math.min(0.5, this.z / 260));
        d.push(); d.translate(this.x, this.y + 1); d.scale(1, 0.2); d.circle(size * 0.48, { color: "#3a1a4e", opacity: 0.26 }); d.pop();
    }

    draw(d) {
        if (!this.visible) return;
        const u = this.size / 400, sp = (r, o = {}) => d.sprite(MON, { crop: r, ...o });
        const breathe = Math.sin(this.t * (this.sleeping ? 1.5 : 3)) * (this.sleeping ? 0.03 : 0.012);
        const sx = 1 - this.sq * 0.5 + this.fat * 0.14 - breathe, sy = 1 + this.sq * 0.5 + breathe;
        const shake = this.shakeHead > 0 ? Math.sin(this.shakeHead * 42) * 0.1 : 0;
        const walk = this.walk ? Math.sin(this.t * 22) * 12 : 0;
        const eyesKey = this.sleeping ? "closed" : this.moodEyes ?? (this.ready > 0 ? "star" : "open");
        const mouthKey = this.moodMouth ?? (this.sleeping ? "smile" : this.chew > 0 ? (Math.sin(this.t * 26) > 0 ? "chew" : "smile") : this.hold > 0 ? "wide" : this.ready > 0 ? "grin" : "smile");
        d.push();
        d.translate(this.x, this.y - this.z); d.rotate(this.lean); d.scale(u * sx * this.flip, u * sy); d.translate(0, -432);
        // Back parts first.
        sp(R.tail, { x: -170, y: 346 + Math.sin(this.t * 2.2) * 8, rot: Math.sin(this.t * 3) * 0.1 });
        if (this.spikes) sp(R.spikes, { x: 0, y: 92 });
        sp(R.foot, { x: -86, y: 400 + walk }); sp(R.foot, { x: 86, y: 400 - walk });
        const hs = 1 + this.horn * 0.05;
        d.push(); d.translate(-96, 62); d.rotate(-0.34 + shake); d.scale(hs); sp(HORN(this.horn), { x: 0, y: -50 }); d.pop();
        d.push(); d.translate(96, 62); d.rotate(0.34 + shake); d.scale(-hs, hs); sp(HORN(this.horn), { x: 0, y: -50 }); d.pop();
        const ax = -150, ay = 216, wave = this.moodMouth === "wide" || this.moodEyes === "happy" ? -1.45 : -0.1 + Math.sin(this.t * 2.6) * 0.08;
        sp(R.back, { x: 0, y: 220 });
        for (const b of this.belly) {
            const bob = Math.sin(this.t * 2 + b.p) * 4;
            d.sprite(SHEET, { frame: b.f, x: (b.x - 210), y: b.y + bob, width: 74 * b.s, height: 74 * b.s, rot: b.rot, opacity: 0.95 });
        }
        sp(R.front, { x: 0, y: 220 });
        // Face.
        d.push(); d.translate(Math.sin(shake) * 60 + this.look.x * 8, this.look.y * 4);
        const blink = this.blinkT > 0 && !this.moodEyes ? 0.08 : 1;
        for (const side of [-1, 1]) {
            const ex = side * 62, ey = 138;
            if (eyesKey === "happy") sp(R.happy, { x: ex, y: ey });
            else if (eyesKey === "closed") sp(R.closed, { x: ex, y: ey + 8 });
            else if (eyesKey === "star") { sp(R.eye, { x: ex, y: ey, width: 120, height: 130 * blink }); if (blink > 0.5) sp(R.starEye, { x: ex, y: ey, rot: Math.sin(this.t * 4) * 0.2, width: 96 + Math.sin(this.t * 8) * 6, height: 96 + Math.sin(this.t * 8) * 6 }); }
            else if (eyesKey === "dizzy") sp(R.dizzy, { x: ex, y: ey, rot: this.t * 8 * side, width: 112, height: 112 });
            else {
                const wide = eyesKey === "wide" ? 1.16 : 1, ps = eyesKey === "sad" ? 1.42 : eyesKey === "wide" ? 0.62 : 1;
                sp(R.eye, { x: ex, y: ey, width: 120 * wide, height: 130 * wide * blink });
                if (blink > 0.5) sp(R.pupil, { x: ex + this.look.x * 20, y: ey + this.look.y * 24 + (eyesKey === "sad" ? 6 : 0), width: 76 * ps, height: 76 * ps });
                if (eyesKey === "sad") d.line([ex + side * 44, ey - 66], [ex - side * 30, ey - 90], { width: 14, color: "#3a1a4e" });
            }
        }
        sp(MOUTH(MOUTHS[mouthKey] ?? 0), { x: 0, y: 234 });
        d.pop();
        for (const side of [-1, 1]) {
            d.push(); d.translate(side * (-ax - 4), ay); d.rotate(-side * (wave + (this.ready > 0 ? Math.sin(this.t * 9) * 0.2 - 0.4 : 0))); sp(R.arm, { x: 0, y: 36 }); d.pop();
        }
        d.pop();
        for (const f of this.floaters) {
            const a = Math.min(1, (f.life - f.t) * 3), r = R[f.icon];
            d.sprite(MON, { crop: r, x: this.x + f.x, y: this.y - this.z - this.size + f.y, width: f.size, height: f.size * r[3] / r[2], opacity: a });
        }
    }
}
