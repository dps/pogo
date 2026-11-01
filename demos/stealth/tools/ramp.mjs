// Is the difficulty fair and rising? For each heist: a naive cat that slinks the shortest way to the fish and back, ignoring
// everyone, from 12 different starts. Early heists should forgive that. Late ones should not.
import { HEISTS } from "../levels.js";
import { density, plan, replay, timeline } from "./solve.mjs";
console.log("heist                     unseen  unspotted  caught  watched");
for (const def of HEISTS) {
    const P = plan(def, 0, { blind: true, loot: false, time: 100 });
    let clean = 0, escaped = 0, caught = 0;
    for (let k = 0; k < 12; k++) {
        const s = replay(def, P, { delay: k * 2.1 });
        if (s.stats.seenTime === 0 && s.stats.curious === 0) clean++;
        if (s.stats.chases === 0 && s.stats.alarms === 0 && s.status === "won") escaped++;
        if (s.status === "caught") caught++;
    }
    const d = density(timeline(def, 0, 90));
    console.log(`${String(HEISTS.indexOf(def) + 1).padStart(2)} ${def.title.padEnd(23)} ${String(clean).padStart(4)}/12  ${String(escaped).padStart(5)}/12   ${String(caught).padStart(3)}/12  ${(d * 100).toFixed(0).padStart(4)}%`);
}
process.exit(0);
