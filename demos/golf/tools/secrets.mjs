// Proves every hidden shortcut is real: a run of shots that passes the shell, then finishes the hole, at or under par where it can.
// usage: node tools/secrets.mjs [from] [to]
import { Course } from "../course.js";
import { HOLES } from "../holes.js";
import { Sim } from "../sim.js";
import { seedRng, isTimed, shot } from "./lib.mjs";
const [from = 0, to = HOLES.length] = process.argv.slice(2).map(Number);
let fails = 0, overPar = 0;
for (let i = from; i < to; i++) {
    const t0 = performance.now(), def = HOLES[i], c = new Course(def, def.island), sim = new Sim(c), rng = seedRng(31337 + i), tm = isTimed(c);
    const cup = c.cup_, sec = c.secrets[0];
    c.cup_ = { x: sec.x, y: sec.y, z: sec.z }; const toShell = c.buildField(true); c.cup_ = cup;
    const start = { x: c.tee_.x, y: c.tee_.y, z: c.tee_.z, t: 0, secret: false };
    const dist = (s) => (s.secret ? c.fieldAt(s.x, s.z, c.Fall) : 40 + c.fieldAt(s.x, s.z, toShell));
    let beam = [{ s: start, n: 0 }], best = null, tried = 0;
    const waits = tm ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5] : [0];
    for (let depth = 1; depth <= def.par + 3 && !best; depth++) {
        const next = [];
        for (const node of beam) {
            const s = node.s, tgt = s.secret ? cup : sec, toT = Math.atan2(tgt.x - s.x, -(tgt.z - s.z)), a = (() => { const f = c.fx, step = 0.5; let bx = s.x, bz = s.z, bv = 1e9; for (let da = -8; da <= 8; da++) for (let db = -8; db <= 8; db++) { const x = s.x + da * step, z = s.z + db * step, v = c.fieldAt(x, z, s.secret ? c.Fall : toShell); if (v < bv) { bv = v; bx = x; bz = z; } } return Math.atan2(bx - s.x, -(bz - s.z)); })();
            for (let j = 0; j < 900 && !best; j++) {
                const k = rng(), h = k < 0.4 ? toT + (rng() - 0.5) * 0.25 : k < 0.8 ? a + (rng() - 0.5) * 0.3 : rng() * 6.283, cand = { h, p: 0.12 + rng() * 0.88, chip: rng() < 0.3, wait: waits[Math.floor(rng() * waits.length)] };
                tried++;
                const r = shot(sim, s, cand);
                if (r.mode === "holed" && r.secret) { best = { n: depth }; break; }
                if (r.mode === "rest") next.push({ s: r, n: depth, d: dist(r) });
            }
            if (best) break;
        }
        next.sort((a, b) => a.d - b.d);
        const seen = new Set(), keep = [];
        for (const e of next) { const key = `${Math.round(e.s.x)},${Math.round(e.s.z)},${e.s.secret ? 1 : 0}`; if (seen.has(key)) continue; seen.add(key); keep.push(e); if (keep.length >= 8) break; }
        beam = keep;
    }
    if (!best) fails++; else if (best.n > def.par) overPar++;
    console.log(`${String(i + 1).padStart(2)} ${def.name.padEnd(24)} par ${def.par}  ${best ? `via the shell in ${best.n}${best.n > def.par ? "  (over par)" : ""}` : "NOT FOUND"}  (${tried} shots, ${((performance.now() - t0) / 1000).toFixed(1)}s)`);
}
console.log(fails ? `${fails} shortcuts not proven` : `ALL ${to - from} SHORTCUTS WORK, ${overPar} over par`);
process.exitCode = fails ? 1 : 0;
