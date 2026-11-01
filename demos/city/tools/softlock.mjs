// Tries to wreck the economy, then proves the town can still finish. Three attacks on every scenario and many seeds:
//   chaos:  random building on random tiles until broke, plus random demolition
//   hoard:  never build anything for 60 days
//   gutted: demolish everything that can be demolished, at the worst moment, broke
// Then a recovering player clears junk from the tiles it needs and plays on. Any town that can't finish fails the run.
import { BUILDINGS, SCENARIOS, TRAY_ORDER } from "../data.js";
import { Sim } from "../sim.js";
import { playThrough } from "../policy.js";

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) | 0; return ((seed >>> 8) & 0xffff) / 65536; };
const LIMIT = 400;

function chaos(sim, r, days) {
    for (let t = 0; t < days * 24; t++) {
        sim.tick();
        sim.events.length = 0;
        if (t % 2) continue;
        for (let n = 0; n < 6; n++) {
            const type = TRAY_ORDER[r() * TRAY_ORDER.length | 0], c = sim.cells[r() * sim.cells.length | 0];
            if (r() < 0.06 && c.b) sim.demolish(c);
            else sim.place(type, c);
        }
    }
}

function gut(sim) {
    for (const c of sim.cells) if (c.b && c.b.type !== "hall") sim.demolish(c);
    sim.coins = 0;
    sim.wood = 0;
    sim.fish = 0;
    sim.grain = 0;
}

/**
 * The proof of no soft-lock: from any state a player can always clear the board (demolition is always allowed),
 * wait for the daily income, and start again from a position as good as a fresh game.
 */
function clearAndWait(sim) {
    for (const c of sim.cells) if (c.b && c.b.type !== "hall" && !(c.ch === "d" && c.b.type === "dock")) sim.demolish(c);
    const { coins, wood } = sim.scn.start;
    let waited = 0;
    while (sim.coins < coins || sim.wood < wood) { sim.tick(); sim.events.length = 0; waited++; if (waited > 24 * 200) throw new Error("income floor failed"); }
    sim.plan = null;
    return waited / 24;
}

let worst = 0, runs = 0, fails = 0;
for (const scn of SCENARIOS) {
    let slow = 0, minC = 1e9;
    for (const attack of ["chaos", "hoard", "gutted"]) for (let seed = 1; seed <= (attack === "chaos" ? 30 : 4); seed++) {
        for (const relaxed of [false, true]) {
            const sim = new Sim(scn, { relaxed }), r = rng(seed * 7919);
            if (attack === "chaos") chaos(sim, r, 6 + seed % 24);
            if (attack === "hoard") for (let t = 0; t < 60 * 24; t++) { sim.tick(); sim.events.length = 0; }
            if (attack === "gutted") { chaos(sim, r, 10); gut(sim); }
            minC = Math.min(minC, sim.coins);
            const start = sim.day;
            playThrough(sim, 60);                 // First just carry on: most towns recover without any help.
            if (!sim.finishedDay) { clearAndWait(sim); playThrough(sim, LIMIT); }
            runs++;
            if (!sim.finishedDay) {
                fails++;
                console.log(`FAIL ${scn.id} ${attack} seed ${seed} relaxed ${relaxed}: ${sim.goalDone} ${scn.goals.map((g) => `${sim.goalValue(g)}/${sim.goalTarget(g)}`).join(" ")} c${sim.coins} w${sim.wood}`);
            } else slow = Math.max(slow, sim.finishedDay - start);
        }
    }
    worst = Math.max(worst, slow);
    console.log(`${scn.id.padEnd(8)} slowest recovery ${slow} days, poorest moment ${minC} coins`);
}
// The floor: an idle town with nothing at all still gains coins and wood every day.
{
    const sim = new Sim(SCENARIOS[0]);
    gut(sim);
    for (let t = 0; t < 24 * 5; t++) { sim.tick(); sim.events.length = 0; }
    const ok = sim.coins >= 8 && sim.wood >= 4;
    console.log(`gutted town after 5 days: ${sim.coins} coins ${sim.wood} wood ${ok ? "ok" : "FAIL"}`);
    if (!ok) fails++;
    const cheapest = Math.min(...TRAY_ORDER.map((t) => BUILDINGS[t].cost[0]));
    console.log(`cheapest building ${cheapest} coins, drift ${2}/day`);
}
console.log(`${runs} runs, ${fails} failures, slowest recovery ${worst} days`);
process.exit(fails ? 1 : 0);
