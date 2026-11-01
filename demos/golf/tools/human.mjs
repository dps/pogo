// A skilled but shaky player: picks a good shot like a person who has seen the hole, then fluffs it a bit.
// Reports average strokes, aces and hazards per hole. Usage: node tools/human.mjs [from] [to] [runs] [aimDeg] [powerPct]
import { Course } from "../course.js";
import { HOLES } from "../holes.js";
import { Sim, HZ } from "../sim.js";
import { MAX_OVER } from "../data.js";
import { shot } from "./lib.mjs";
const [from = 0, to = HOLES.length, runs = 10, aimDeg = 2, pw = 7] = process.argv.slice(2).map(Number);
const seedRng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r() * 0.9999)) * Math.cos(6.2832 * r());
const play = shot;
const tot = { strokes: 0, par: 0, aces: 0, under: 0, at: 0, over: 0 };
for (let i = from; i < to; i++) {
    const def = HOLES[i], c = new Course(def, def.island), sim = new Sim(c), rng = seedRng(99 + i);
    const F = c.F;  // the visible route only: a first-time player doesn't know the secret
    let sum = 0, aces = 0, lost = 0, stuck = 0, worst = 0;
    const tm = c.decks.some((d) => d.move || d.spin || d.swing) || c.sweepers.length || c.geysers.length || c.plants.length;
    for (let r = 0; r < runs; r++) {
        let st = { x: c.tee_.x, y: c.tee_.y, z: c.tee_.z, t: 2 + rng() * 4, nx: 0, ny: 1, nz: 0, secret: false }, strokes = 0;
        for (; strokes < def.par + MAX_OVER;) {
            let best = null, bs = 1e9;
            const cup = c.cup_, toCup = Math.atan2(cup.x - st.x, -(cup.z - st.z)), a = c.ahead(st.x, st.z, 5), toR = Math.atan2(a[0] - st.x, -(a[1] - st.z));
            for (let k = 0; k < 90; k++) {
                const h = (k % 2 ? toCup : toR) + (rng() - 0.5) * 0.8, p = 0.15 + rng() * 0.85, chip = rng() < 0.2, wait = tm ? [0, 0.7, 1.4, 2.1][k % 4] : 0;
                const cand = { h, p, chip, wait }, e = play(sim, st, cand);
                let v = e.mode === "holed" ? -5 : e.mode === "lost" ? 200 : c.fieldAt(e.x, e.z, F);
                if (v < bs) { bs = v; best = cand; }
            }
            best = { ...best, h: best.h + gauss(rng) * aimDeg * Math.PI / 180, p: Math.min(1, best.p * (1 + gauss(rng) * pw / 100)) };
            const e = play(sim, st, best);
            strokes++;
            if (e.mode === "holed") break;
            if (e.mode === "lost") { if (e.reason !== "timeout") { strokes++; lost++; } if (e.reason === "timeout") stuck++; st.t = e.t; continue; }
            if (e.mode !== "rest") { stuck++; continue; }
            st = e;
        }
        sum += strokes; if (strokes === 1) aces++; worst = Math.max(worst, strokes);
        tot.strokes += strokes; tot.par += def.par; if (strokes === 1) tot.aces++; if (strokes < def.par) tot.under++; else if (strokes === def.par) tot.at++; else tot.over++;
    }
    console.log(`${String(i + 1).padStart(2)} ${def.name.padEnd(24)} par ${def.par}  avg ${(sum / runs).toFixed(2)}  (${((sum / runs) - def.par >= 0 ? "+" : "") + ((sum / runs) - def.par).toFixed(2)})  worst ${worst}  aces ${aces}/${runs}  hazards ${lost}  timeouts ${stuck}`);
}
console.log(`total ${tot.strokes} vs par ${tot.par}  under ${tot.under} at ${tot.at} over ${tot.over}  aces ${tot.aces}`);
