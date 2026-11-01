// Plays every scenario to the end and prints how it went. `node tools/bot.mjs [-v]`
import { SCENARIOS } from "../data.js";
import { Sim } from "../sim.js";
import { playThrough } from "../policy.js";

const verbose = process.argv.includes("-v");
let bad = 0;
for (const relaxed of [false, true]) {
    console.log(relaxed ? "\n-- relaxed" : "-- standard");
    for (const scn of SCENARIOS) {
        const sim = new Sim(scn, { relaxed });
        playThrough(sim, 240, verbose ? (s) => s.day % 4 === 0 && console.log(`  d${s.day} ${s.season[0]} c${s.coins} w${s.wood} f${s.fish} g${s.grain} folk${s.folk} sp${s.spare} cheer${s.cheer} n${s.buildings.length}`) : null);
        if (verbose) console.log("  plan", sim.plan?.level, sim.plan?.heart?.size, sim.plan?.cut.size);
        const counts = {};
        for (const b of sim.buildings) counts[b.type] = (counts[b.type] ?? 0) + 1;
        const ok = sim.finishedDay > 0;
        if (!ok) bad++;
        console.log(`${scn.id.padEnd(8)} ${ok ? `done day ${sim.finishedDay} (par ${scn.par})` : "UNFINISHED"} stars ${sim.grade()} wrecked ${sim.stats.wrecked} flooded ${sim.stats.flooded} goals ${sim.goalDone.map((g) => +g).join("")} ${scn.goals.map((g) => `${sim.goalValue(g)}/${sim.goalTarget(g)}`).join(" ")} coins ${sim.coins} wood ${sim.wood} ${JSON.stringify(counts).replace(/"/g, "")}`);
    }
}
process.exit(bad ? 1 : 0);
