// Proves each hole can be finished at or under par, with the real physics, including the moving parts.
// Beam search over shots (heading, power, putt or chip, when to hit). Usage: node tools/solve.mjs [from] [to] [--secret] [--json out.json]
import { writeFileSync } from "node:fs";
import { Course } from "../course.js";
import { HOLES } from "../holes.js";
import { Sim, HZ } from "../sim.js";
import { shot } from "./lib.mjs";

const args = process.argv.slice(2), flags = args.filter((a) => a.startsWith("--")), nums = args.filter((a) => !a.startsWith("--")).map(Number);
const from = nums[0] ?? 0, to = nums[1] ?? HOLES.length, wantSecret = flags.includes("--secret");
const jsonOut = args[args.indexOf("--json") + 1];
const seedRng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const timed = (c) => c.decks.some((d) => d.move || d.spin || d.swing) || c.sweepers.length || c.geysers.length || c.plants.length;

function play(sim, st, s) { const r = shot(sim, st, s); if (r.mode === "lost") { r.lost = r.reason; } return r; }

function cands(c, st, rng, n, F) {
    const list = [], cup = c.cup_, toCup = Math.atan2(cup.x - st.x, -(cup.z - st.z)), a = c.ahead(st.x, st.z, 6), toRoute = Math.atan2(a[0] - st.x, -(a[1] - st.z));
    const tm = timed(c), waits = tm ? [0, 0.5, 1, 1.5, 2, 2.5, 3] : [0];
    for (let i = 0; i < n; i++) {
        const r = rng();
        let h;
        if (r < 0.34) h = toCup + (rng() - 0.5) * 0.5;
        else if (r < 0.62) h = toRoute + (rng() - 0.5) * 0.9;
        else h = rng() * Math.PI * 2;
        const p = Math.pow(rng(), 0.7), chip = rng() < 0.3;
        list.push({ h, p: Math.max(0.1, p), chip, wait: waits[Math.floor(rng() * waits.length)] });
    }
    return list;
}

function solve(i, needSecret) {
    const def = HOLES[i], c = new Course(def, def.island), sim = new Sim(c), rng = seedRng(1234 + i * 7);
    const start = { x: c.tee_.x, y: c.tee_.y, z: c.tee_.z, t: 0, nx: 0, ny: 1, nz: 0, secret: false };
    const F = needSecret ? c.Fall : c.Fall;
    const dist = (s) => c.fieldAt(s.x, s.z, F);
    let beam = [{ s: start, plan: [], lost: 0 }], best = null, tried = 0;
    const budget = [420, 340, 340, 300, 260];
    for (let depth = 0; depth < def.par && !best; depth++) {
        const next = [];
        for (const node of beam) {
            const n = Math.round(budget[depth] / Math.max(1, Math.sqrt(beam.length)));
            for (const cand of cands(c, node.s, rng, n, F)) {
                tried++;
                const r = play(sim, node.s, cand);
                const plan = [...node.plan, cand];
                if (r.mode === "holed") { if (!needSecret || r.secret) { if (!best) best = { plan, states: [...(node.states ?? []), r] }; } continue; }
                if (r.mode === "lost" && r.lost) continue;
                if (sim.mode !== "rest") continue;
                next.push({ s: r, plan, states: [...(node.states ?? []), r], d: dist(r) * (needSecret && !r.secret ? 1.3 : 1) });
            }
            if (best) break;
            // Polish: from this node, aim finely at the cup.
            if (!needSecret || node.s.secret) {
                const cup = c.cup_, D = Math.hypot(cup.x - node.s.x, cup.z - node.s.z);
                const toCup = Math.atan2(cup.x - node.s.x, -(cup.z - node.s.z));
                if (D < 34) for (let a = -0.14; a <= 0.14 && !best; a += 0.012) for (const wait of timed(c) ? [0, 1, 2] : [0]) for (const pw of [0.3, 0.42, 0.52, 0.62, 0.72, 0.85, 1]) {
                    tried++;
                    const one = { h: toCup + a, p: pw, chip: false, wait }, r = play(sim, node.s, one);
                    if (r.mode === "holed") { best = { plan: [...node.plan, one], states: [...(node.states ?? []), r] }; break; }
                }
            }
            if (best) break;
        }
        if (best) break;
        next.sort((a, b) => a.d - b.d);
        // Keep variety: no two beam states in the same 2-unit cell.
        const seen = new Set(), keep = [];
        for (const e of next) { const key = `${Math.round(e.s.x / 2)},${Math.round(e.s.z / 2)},${e.s.secret ? 1 : 0}`; if (seen.has(key)) continue; seen.add(key); keep.push(e); if (keep.length >= 9) break; }
        beam = keep;
        if (!beam.length) break;
    }
    return { i, name: def.name, par: def.par, best, tried, beamBest: beam[0]?.d };
}

const out = {}, traces = {};
let fails = 0;
for (let i = from; i < to; i++) {
    const t0 = performance.now(), r = solve(i, wantSecret);
    const ok = r.best && r.best.plan.length <= r.par;
    if (!ok) fails++;
    console.log(`${String(i + 1).padStart(2)} ${r.name.padEnd(24)} par ${r.par}  ${ok ? "solved in " + r.best.plan.length : "FAILED closest " + (r.beamBest?.toFixed(1) ?? "-")}${r.best ? "  " + r.best.plan.map((s) => `${s.chip ? "C" : "P"}${s.p.toFixed(2)}${s.wait ? "@" + s.wait : ""}`).join(" ") : ""}  (${r.tried} shots, ${((performance.now() - t0) / 1000).toFixed(1)}s)`);
    out[i] = r.best?.plan ?? null;
}
if (jsonOut && jsonOut !== process.argv[1]) writeFileSync(jsonOut, JSON.stringify(out));
console.log(fails ? `${fails} hole(s) not proven` : "ALL HOLES PROVEN AT OR UNDER PAR");
