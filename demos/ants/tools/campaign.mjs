// Plays every mission with a deliberately plain bot: it reacts slowly and never dodges hazards, so a win here is a soft floor for a human.
import { Commander } from "../ai.js"; import { MISSION_MAPS } from "../maps.js"; import { makeSim } from "./simcheck.mjs";
import { TICK_HZ } from "../data.js";
const seeds = (process.argv[2] ?? "1,2,3").split(",").map(Number), only = process.argv[3] ? process.argv[3].split(",").map(Number) : null;
let bad = 0;
for (let m = 0; m < MISSION_MAPS.length; m++) {
    if (only && !only.includes(m + 1)) continue;
    const res = [];
    for (const seed of seeds) {
        const map = MISSION_MAPS[m](), sim = makeSim(map, seed); sim.brains.push(new Commander(sim, { every: Number(process.env.EVERY ?? 2) }));
        const limit = 20 * 60 * TICK_HZ; let i = 0; for (; i < limit && !sim.outcome; i++) sim.tick();
        const me = sim.me, foe = sim.colList.filter((c) => c.team);
        res.push({ o: sim.outcome ?? "timeout", why: sim.reason, sec: Math.round(sim.seconds), stars: sim.outcome === "win" ? sim.stars() : 0, peak: me.peak, foePeak: foe.map((c) => c.peak).join("/"), dbg: `cnt ${me.counts} stock ${me.stock.map(Math.floor)} ch ${Object.values(me.chambers).join("")}`, obj: sim.objectives().map((o) => o.label + ":" + o.have + "/" + o.need).join(" ") });
    }
    const wins = res.filter((r) => r.o === "win").length; if (wins === 0) bad++;
    console.log(`M${m + 1}: ${wins}/${res.length} wins, par ${MISSION_MAPS[m]().goal.par}s ` + res.map((r) => `${r.o}${r.why ? "(" + r.why + ")" : ""} ${r.sec}s ${r.stars}* me${r.peak} foe${r.foePeak} ${r.o === "win" ? "" : r.obj + " " + r.dbg}`).join(" | "));
}
console.log(bad ? `${bad} MISSIONS UNWON` : "every mission won at least once");
