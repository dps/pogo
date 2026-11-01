// Is every generated floor winnable, and does difficulty ramp? Checks many seeds with three kinds of player:
// the perfect search bot, a planner who looks a few moves ahead, and a hasty one. Run: node tools/ramp.mjs 40
import { ITINERARY, buildFloor, instantiate, startOf } from "../floors.js";
import { H, O, T, gateOpen, hash, legal, makeState, monsters, step } from "../sim.js";
import { solve, verify } from "../solver.js";
const N = Number(process.argv[2] ?? 20);

function value(fl, s) {
    let v = -monsters(s).length * 6 + (s[H.FLAGS] & 1 ? 8 : 0);
    const p = s[H.P], w = fl.w, px = p % w, py = (p / w) | 0, d = (i) => Math.abs(i % w - px) + Math.abs(((i / w) | 0) - py);
    if (gateOpen(fl, s)) v += 20 - d(fl.ter.indexOf(T.EXIT));
    else { const t = fl.goal === "ticket" ? Array.from({ length: fl.n }, (_, i) => i).find((i) => s[fl.OBJ0 + i] === O.TICKET) : undefined; if (t !== undefined) v -= d(t); else { const ms = monsters(s); if (ms.length) v -= Math.min(...ms.map((m) => d(m.p))) * 0.3; } }
    return v;
}
/** Plays with a limited horizon. Returns hearts lost before reaching the door, or Infinity if it gave up. */
function planner(fl, s0, depth, sloppy, seedN) {
    let s = s0, lost = 0, rnd = seedN * 2654435761 >>> 0;
    const seen = new Map();
    for (let turn = 0; turn < 70; turn++) {
        let frontier = [[s, -1]], best = -1e9, pick = -1;
        for (let d = 0; d < depth && frontier.length; d++) {
            const next = [], keys = new Set();
            for (const [st, first] of frontier) for (let a = 0; a < 5; a++) {
                if (!legal(fl, st, a)) continue;
                const n = step(fl, st, a), f = first < 0 ? a : first;
                if (n[H.WON]) { const v = 1000 - d; if (v > best) { best = v; pick = f; } continue; }
                if (n[H.HP] < st[H.HP]) { const v = -50 - d * 0 ; if (d === 0 && v > best) { best = v; pick = f; } continue; }
                const h = hash(n); if (keys.has(h)) continue; keys.add(h);
                const v = value(fl, n) - (seen.get(h) ?? 0) * 2 - d * 0.02; if (v > best) { best = v; pick = f; }
                next.push([n, f]);
            }
            frontier = next.slice(0, 900);
        }
        if (pick < 0) pick = 4;
        rnd = Math.imul(rnd, 1664525) + 1013904223 >>> 0;
        if (sloppy && (rnd >>> 8) % 100 < sloppy) { const opts = [0, 1, 2, 3].filter((a) => legal(fl, s, a)); if (opts.length) pick = opts[(rnd >>> 16) % opts.length]; }
        const before = s[H.HP];
        s = step(fl, s, pick);
        lost += before - s[H.HP];
        if (s[H.WON]) return lost;
        if (s[H.HP] <= 0) return Infinity;
        const h = hash(s); seen.set(h, (seen.get(h) ?? 0) + 1);
    }
    return Infinity;
}
const rows = ITINERARY.map(() => ({ ok: 0, bad: 0, par: 0, mons: 0, deadly: 0, p5: 0, p5hurt: 0, p3: 0, p3hurt: 0, ms: 0, worst: 0, cases: 0 }));
for (let k = 1; k <= N; k++) ITINERARY.forEach((sp, i) => {
    const t0 = performance.now(), job = buildFloor(k * 104729 + 13, i), ms = performance.now() - t0, done = job.done, r = rows[i];
    const fl = instantiate(done), s = makeState(fl, startOf(done.map, 3));
    const again = solve(fl, s, { cap: 500000, maxDepth: 60 });
    if (!again.path || !verify(fl, s, again.path) || again.path.length !== done.par) { r.bad++; return; }
    r.ok++; r.par += done.par; r.mons += done.map.mons.length; r.deadly += again.dead / Math.max(1, again.nodes); r.ms += ms; r.worst = Math.max(r.worst, ms);
    for (let q = 0; q < 2; q++) {
        r.cases++;
        const a = planner(fl, s, 5, 6, k * 7 + q), b = planner(fl, s, 3, 15, k * 13 + q);
        if (a !== Infinity) { r.p5++; r.p5hurt += a; } if (b !== Infinity) { r.p3++; r.p3hurt += b; }
    }
});
console.log("floor  type      ok bad  par mons deadly  plan5 (hurt)  hasty3 (hurt)   gen ms (worst)");
rows.forEach((r, i) => console.log(String(i + 1).padStart(4), (ITINERARY[i].boss ?? ITINERARY[i].hand ?? "gen").padEnd(10), String(r.ok).padStart(3), String(r.bad).padStart(2), (r.par / r.ok).toFixed(1).padStart(5), (r.mons / r.ok).toFixed(1).padStart(4), (r.deadly / r.ok).toFixed(2).padStart(5), `${(100 * r.p5 / r.cases).toFixed(0)}%`.padStart(7), (r.p5hurt / Math.max(1, r.p5)).toFixed(2).padStart(5), `${(100 * r.p3 / r.cases).toFixed(0)}%`.padStart(8), (r.p3hurt / Math.max(1, r.p3)).toFixed(2).padStart(5), (r.ms / r.ok).toFixed(0).padStart(8), r.worst.toFixed(0).padStart(6)));
