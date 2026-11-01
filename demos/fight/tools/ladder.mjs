// Difficulty ramp check. A casual scripted player (with and without auto-combo) against each AI level, plus AI against AI.
import { Fight, BTN } from "../sim.js";
import { Brain, LEVELS } from "../ai.js";
import { ROSTER } from "../fighters.js";
class Rng { constructor(s) { this.s = s >>> 0 || 1; } next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; } pick(a) { return a[Math.floor(this.next() * a.length)]; } }
/** A casual player: reacts slowly, walks in, presses buttons, blocks sometimes, rarely anti-airs. */
export class Casual {
    constructor(rng, skill = 0.5) { this.r = rng; this.mask = 0; this.left = 0; this.skill = skill; }
    think(f, i) {
        if (--this.left > 0) return this.mask;
        const me = f.p[i], foe = f.p[1 - i], dist = Math.abs(me.x - foe.x), fwd = me.face > 0 ? BTN.R : BTN.L, r = this.r, s = this.skill;
        this.left = 6 + Math.floor(r.next() * (16 - s * 10)); this.mask = 0;
        if (me.meter >= 100 && dist < 130 && r.next() < s) { this.mask = BTN.X; this.left = 3; return this.mask; }
        if (foe.mv && foe.phase !== "recovery" && dist < 130 && r.next() < s * 0.6) { this.mask = BTN.G; this.left = 16; return this.mask; }
        if (dist > 92) { this.mask = fwd; return this.mask; }
        const k = r.next();
        this.mask = k < 0.5 ? BTN.A : k < 0.72 ? BTN.B : k < 0.84 ? BTN.S1 << Math.floor(r.next() * 3) : k < 0.92 ? BTN.G : 0;
        this.left = this.mask === BTN.G ? 14 : 4;
        return this.mask;
    }
}
/** Pure button mashing: walk in, hold nothing back, never block. keys picks what gets mashed. */
export class Masher {
    constructor(rng, keys, gap = 5) { this.r = rng; this.keys = keys; this.gap = gap; this.left = 0; this.mask = 0; }
    think(f, i) {
        if (--this.left > 0) return this.mask;
        const me = f.p[i], foe = f.p[1 - i], dist = Math.abs(me.x - foe.x), fwd = me.face > 0 ? BTN.R : BTN.L;
        if (this.mask & ~(BTN.L | BTN.R)) { this.mask = dist > 96 ? fwd : 0; this.left = 2; return this.mask; }
        if (me.meter >= 100 && dist < 130) { this.mask = BTN.X; this.left = 3; return this.mask; }
        if (dist > 96) { this.mask = fwd; this.left = 4; return this.mask; }
        this.mask = this.keys[Math.floor(this.r.next() * this.keys.length)]; this.left = 2 + Math.floor(this.r.next() * this.gap);
        return this.mask;
    }
}
function play(a, b, A, B, seed, auto) {
    const f = new Fight({ a, b, fast: true, p1: { auto } });
    let n = 0;
    while (f.phase !== "over" && n++ < 36000) { f.step(A(f), B(f)); f.ev.length = 0; }
    return f;
}
if (!process.argv[1]?.endsWith("ladder.mjs")) { } else {
const N = Number(process.argv[2] ?? 40);
const LV = (process.argv[3] ?? "0,1,1.5,2,2.5,3").split(",").map(Number);
const players = [
    ["mash L", false, (r) => new Masher(r, [BTN.A])], ["mash L+auto", true, (r) => new Masher(r, [BTN.A])], ["mash LH", false, (r) => new Masher(r, [BTN.A, BTN.A, BTN.B])],
    ["mash all", false, (r) => new Masher(r, [BTN.A, BTN.B, BTN.S1, BTN.S2, BTN.S3])], ["mash all+auto", true, (r) => new Masher(r, [BTN.A, BTN.A, BTN.B, BTN.S1, BTN.S2, BTN.S3])],
    ["casual", false, (r) => new Casual(r, 0.5)], ["casual+auto", true, (r) => new Casual(r, 0.5)], ["novice", false, (r) => new Casual(r, 0.25)],
];
for (const [label, auto, make] of players) {
    const row = [];
    for (const L of LV) {
        let w = 0, t = 0;
        for (let g = 0; g < N; g++) {
            const a = ROSTER[g % 8], b = ROSTER[(g * 3 + 1 + Math.floor(g / 8)) % 8], rng = new Rng(g * 977 + 5), hu = make(rng), ai = new Brain(1, b, L, rng);
            t++; if (play(a, b, (fi) => hu.think(fi, 0), (fi) => ai.think(fi), g, auto).winner === 0) w++;
        }
        row.push(`L${L}:${Math.round(w / t * 100)}%`);
    }
    console.log(label.padEnd(14), row.join("  "));
}
const lines = [];
for (let hi = 1; hi < LEVELS.length; hi++) {
    let w = 0;
    for (let g = 0; g < N; g++) { const a = ROSTER[g % 8], b = ROSTER[(g * 5 + 3) % 8], rng = new Rng(g * 31 + 7), A = new Brain(0, a, hi, rng), B = new Brain(1, b, hi - 1, rng); if (play(a, b, (f) => A.think(f), (f) => B.think(f), g).winner === 0) w++; }
    lines.push(`L${hi} beats L${hi - 1}: ${Math.round(w / N * 100)}%`);
}
console.log(lines.join("   "));
}
