// Bot-versus-bot: the same plain Commander against every strategy and level. A fair ramp means its win rate falls, and fights lengthen, as levels rise.
import { Commander, LEVELS, STRATEGIES } from "../ai.js"; import { skirmishMap } from "../maps.js"; import { makeSim } from "./simcheck.mjs";
import { TICK_HZ } from "../data.js";
const SEEDS = Number(process.argv[2] ?? 4), strat = [["rusher", 1], ["boomer", 2], ["turtle", 3], ["harrier", 2], ["empress", 4]], maps = ["lawn", "blanket", "patio", "sea"];
const table = {}; const levelTotal = LEVELS.map(() => [0, 0, 0]);
for (const [name, team] of strat) {
    table[name] = [];
    for (let lv = 0; lv < 4; lv++) {
        let wins = 0, secs = 0, n = 0;
        for (let k = 0; k < SEEDS; k++) {
            const map = skirmishMap({ map: maps[k % maps.length], size: 1, enemies: 1, level: lv, hazards: false, seed: 10 + k, strategies: [[name, team]] }), sim = makeSim(map, 3 + k); sim.brains.push(new Commander(sim, { wave: 50 }));
            for (let i = 0; i < 15 * 60 * TICK_HZ && !sim.outcome; i++) sim.tick();
            if (sim.outcome === "win") wins++; secs += sim.seconds; n++;
        }
        table[name].push(`${wins}/${n} ${Math.round(secs / n)}s`); levelTotal[lv][0] += wins; levelTotal[lv][1] += n; levelTotal[lv][2] += secs;
    }
    console.log(name.padEnd(9), table[name].map((x) => x.padEnd(11)).join(" "));
}
console.log("ALL".padEnd(9), levelTotal.map(([w, n, s]) => `${Math.round(w / n * 100)}% ${Math.round(s / n)}s`.padEnd(11)).join(" "), " (columns:", LEVELS.map((l) => l.name).join(" "), ")");
// Head to head: each level should beat the one below.
for (let lv = 1; lv < 4; lv++) {
    let hi = 0, n = 0;
    for (const [name] of strat) for (let k = 0; k < Math.max(2, SEEDS / 2); k++) {
        const map = skirmishMap({ map: maps[k % 4], size: 1, enemies: 1, level: lv, hazards: false, seed: 40 + k, strategies: [[name, 2]] }); map.nests[0].strategy = name; map.nests[0].level = lv - 1; map.nests[0].side = 0;
        const sim = makeSim(map, 9 + k); sim.brains.unshift(new (await import("../ai.js")).Brain(sim, 0, name, lv - 1));
        for (let i = 0; i < 15 * 60 * TICK_HZ && !sim.outcome; i++) sim.tick();
        if (sim.outcome === "lose") hi++; n++;
    }
    console.log(`${LEVELS[lv].name} beats ${LEVELS[lv - 1].name}: ${hi}/${n}`);
}
