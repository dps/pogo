// Prints each island's flooding: `node tools/mapcheck.mjs`. # dry above the level, ~ flooded, W the cheapest wall ring.
import { SCENARIOS } from "../data.js";
import { Sim } from "../sim.js";
import { wallCut, makePlan } from "../policy.js";
import { RADIUS } from "../hex.js";
for (const scn of SCENARIOS) {
    const sim = new Sim(scn);
    const plan = makePlan(sim);
    const hall = sim.cells[sim.buildings[0].cell], dock = sim.buildings.find((b) => b.type === "dock");
    const dq = sim.cells[dock.cell];
    console.log(`\n${scn.id} land ${sim.cells.filter((c) => c.h >= 0).length} sand ${sim.cells.filter((c) => c.h === 0).length} top ${plan.level} heart ${plan.heart?.size ?? "-"} walls ${plan.cut.size} hall-dock ${(Math.abs(hall.q - dq.q) + Math.abs(hall.q + hall.r - dq.q - dq.r) + Math.abs(hall.r - dq.r)) / 2}`);
    const fm = sim.floodMap(plan.level);
    for (let r = -RADIUS; r <= RADIUS; r++) {
        let line = " ".repeat(Math.abs(r) + 2);
        for (const c of sim.cells.filter((x) => x.r === r)) {
            const ch = plan.cut.has(c.i) ? "W" : c.h < 0 ? "." : plan.heart?.has(c.i) ? "o" : fm[c.i] ? "~" : "#";
            line += ch + " ";
        }
        console.log(line);
    }
}
