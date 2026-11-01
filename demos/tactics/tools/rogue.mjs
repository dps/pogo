// Bird Brain proof: many seeded runs played by the planner. Every map offered must have a known win; reports how far runs get.
import { RUN_LENGTH, afterBattle, applyReward, genMission, newRun, rewardsFor } from "../rogue.js";
import { newBattle } from "../sim.js";
import { solve } from "../solver.js";
const N = +(process.argv[2] ?? 40);
let wins = 0, unproven = 0, maps = 0, slowest = 0, reached = Array(RUN_LENGTH + 1).fill(0), t0 = Date.now();
for (let seed = 1; seed <= N; seed++) {
    const run = newRun(seed * 7919);
    for (;;) {
        const t = Date.now();
        const { mission, proven } = genMission(run);
        slowest = Math.max(slowest, Date.now() - t);
        maps++; if (!proven) unproven++;
        const squad = run.squad.map((p) => ({ k: p.k, up: { ...p.up }, hp: p.hp ?? undefined }));
        const res = solve(newBattle(mission, squad), { width: 8, keep: 3, roots: 6, tune: { noDamage: true } });
        if (!res.win) break;
        afterBattle(run, res.state);
        if (!run.squad.length) break;
        if (run.depth >= RUN_LENGTH) { wins++; break; }
        const rw = rewardsFor(run);
        applyReward(run, rw.find((o) => o.type === "recruit") ?? rw.find((o) => o.type === "up") ?? rw[0]);
    }
    reached[run.depth]++;
}
console.log(`runs ${N}, finished ${wins}, maps ${maps}, unproven ${unproven}, slowest gen ${slowest}ms, total ${Date.now()-t0}ms`);
console.log("reached depth:", reached.join(" "));
