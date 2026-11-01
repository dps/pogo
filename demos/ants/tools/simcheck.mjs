// Smoke and speed test for the bare sim.
import { Sim } from "../sim.js"; import { Brain, Commander } from "../ai.js"; import { MISSION_MAPS, skirmishMap } from "../maps.js";
export function makeSim(map, seed = 1, opts = {}) {
    const sim = new Sim(map, { seed, events: false, ...opts });
    for (const n of map.nests) if (n.team !== 0 && n.strategy) sim.brains.push(new Brain(sim, n.team, n.strategy, n.level ?? 1, n));
    return sim;
}
if (process.argv[1].endsWith("simcheck.mjs")) {
    const sim = makeSim(skirmishMap({ map: "lawn", size: 2, enemies: 3, level: 3, hazards: false, seed: 4 }));
    sim.brains.push(new Commander(sim));
    for (const c of sim.colList) { c.stock = [3000, 3000, 3000, 3000]; c.chambers = { ...c.chambers, pantry: 3, nursery: 2, gym: 2, vat: 2, loft: 2, hall: 1 }; c.maxPop = 800; }
    let worst = 0, sum = 0, n = 0; const t0 = performance.now();
    for (let i = 0; i < 6000; i++) { const a = performance.now(); sim.tick(); const d = performance.now() - a; if (sim.count > 1000) { worst = Math.max(worst, d); sum += d; n++; } if (i % 1000 === 0) console.log(i, "ants", sim.count, sim.colList.map((c) => c.total + (c.alive ? "" : "x")).join(" ")); if (sim.outcome) break; }
    console.log("wall", ((performance.now() - t0) / 1000).toFixed(1), "s; ticks over 1000 ants:", n, "avg ms", (sum / n).toFixed(3), "worst", worst.toFixed(2), "outcome", sim.outcome, "fields", sim.fieldsBuilt);
}
