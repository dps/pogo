// Proves every chunk, and its mirror, can be cleared at top speed from every lane with inputs a tenth of a second apart,
// then does the same for every ordered pair of chunks. Chunks are joined with the generator's tail, so induction covers
// any endless sequence. Then a planner plays long real generated runs at top speed through Run.step itself.
import { ALL_CHUNKS, Generator } from "../chunks.js";
import { BIOMES, LANE, MIN_BEAT, ROUTE, TOP, VMAX, beatAt, speedAt } from "../data.js";
import { Run, newPlayer } from "../sim.js";
import { solve } from "./solve.mjs";

// Lay out chunks with the generator's own emit, at the spacing it uses at top level.
function layout(chunks, far = 400000) {
    const obs = [], fake = { addObstacle: (d, lane, kind, len) => { const o = { d, lane, kind, len, v: kind === "v" ? 0.75 : 0 }; obs.push(o); return o; }, addEgg() {}, addPickup() {}, hints: [] };
    const g = new Generator(1, far);
    const starts = [];
    for (const c of chunks) { starts.push(g.at); g.emit(fake, c); }
    return { obs, start: starts[0], end: g.at };
}
const every = Number(process.argv[2] ?? 6);
// Negative controls: the search has to be able to fail, or its passes mean nothing.
for (const rows of [["BBB"], ["jjj", "sss", "BBB"], ["BB.", "..B", "BB."]]) {
    const { obs, start, end } = layout([{ id: "control", tier: 1, rows }]);
    const r = rows[0] === "BB." ? { ok: false } : solve(newPlayer(1), start - 12, end, TOP, obs, every, true);
    if (r.ok) { console.log("CONTROL PASSED, THE PROOF IS BROKEN", rows.join(" ")); process.exit(1); }
}
console.log("negative controls: impossible chunks are rejected");
let fails = 0, proofs = 0, hardest = 0;
const t0 = Date.now();
for (const speed of [VMAX, TOP]) {
    const skates = speed === TOP;
    for (const c of ALL_CHUNKS) for (let lane = 0; lane < 3; lane++) {
        const { obs, start, end } = layout([c]);
        const gap = beatAt(start) * speedAt(start);
        const r = solve(newPlayer(lane), start - gap * 0.5, end, speed, obs, every, skates);
        proofs++; hardest = Math.max(hardest, r.visited);
        if (!r.ok) { fails++; console.log("BLOCKED", c.id, c.rows.join(" "), "lane", lane, "speed", speed.toFixed(1)); }
    }
}
console.log(`single chunks: ${ALL_CHUNKS.length} chunks x 3 lanes x 2 speeds = ${proofs} proofs, ${fails} failed, widest search ${hardest}, ${Date.now() - t0} ms`);
let pairs = 0, pairFails = 0;
const t1 = Date.now();
for (const a of ALL_CHUNKS) for (const b of ALL_CHUNKS) {
    const { obs, start, end } = layout([a, b]);
    const gap = beatAt(start) * speedAt(start);
    for (let lane = 0; lane < 3; lane++) {
        const r = solve(newPlayer(lane), start - gap * 0.5, end, TOP, obs, every, true);
        pairs++;
        if (!r.ok) { pairFails++; if (pairFails < 20) console.log("PAIR BLOCKED", a.id, b.id, "lane", lane); }
    }
}
console.log(`pairs: ${ALL_CHUNKS.length}^2 x 3 lanes = ${pairs} proofs at ${TOP.toFixed(1)} u/s, ${pairFails} failed, ${Date.now() - t1} ms`);
// Long real runs at a forced top speed: generator output, Run.step, the planner, no contact allowed.
let metres = 0, touched = 0;
const t2 = Date.now();
for (let seed = 1; seed <= Number(process.argv[3] ?? 12); seed++) {
    const run = new Run({ seed: seed * 31, start: 50000, heat: 0 });
    run.forceSpeed = VMAX; run.t = 9;
    let left = 0, n = 0;
    while (run.state === "run" && n++ < 60 * 170) {
        run.lapStart = run.d - 500; run.gen.lapStart = run.gen.at - 500;
        if (run.disguise) { run.disguise = null; run.p.fly = 0; }
        run.pickups.length = 0;
        let cmd = 0;
        if (left-- <= 0) {
            left = 5;
            const list = run.obstacles.filter((o) => !o.dead && run.obD(o) + o.len + 1 > run.d && run.obD(o) < run.d + 90);
            if (list.length) { const r = solve(run.p, run.d, run.d + 80, run.speed, list, 6, false); if (r.ok) cmd = r.cmds[0]; else console.log("  planner stuck at", Math.floor(run.d), "seed", seed); }
        }
        run.step(1 / 60, cmd); run.events.length = 0;
    }
    metres += run.d - 50000; touched += run.stats.stumbles + (run.state !== "run" ? 1 : 0);
    if (run.state !== "run") console.log("  stopped", run.reason, "seed", seed, "at", Math.floor(run.d));
}
console.log(`generated road at ${VMAX} u/s: ${Math.floor(metres)} m driven, ${touched} contacts, ${Date.now() - t2} ms`);
process.exit(fails + pairFails + touched ? 1 : 0);
