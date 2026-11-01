// Is it fair? Plays every night many times at three skills, and an idle player, directly against the rules.
import { NIGHTS } from "../data.js";
import { Sim } from "../sim.js";
import { SKILLS, brain } from "./brain.mjs";

const DT = 1 / 60, RUNS = Number(process.argv[2] ?? 40), LIMIT = 60 * 60 * 6;
export function run(night, seed, skill, opts = {}) {
    const sim = new Sim({ night, seed }), think = brain(sim, skill, opts);
    let n = 0, audible = -1, lowest = 100, heard = 0, warn = null;
    while (sim.status === "play" && n++ < LIMIT) {
        sim.tick(DT, think(DT));
        lowest = Math.min(lowest, sim.p.battery);
        if (sim.danger > 0.45 && warn === null) warn = sim.t;
        if (sim.danger < 0.2) warn = null;
        if (sim.ev.length > 500) sim.ev.length = 0;
    }
    return { status: n >= LIMIT ? "stall" : sim.status, t: sim.t, lowest, warned: warn === null ? 0 : sim.t - warn, step: sim.step, stats: sim.stats };
}
if (process.argv[1].endsWith("fair.mjs")) {
    console.log("night             skill     win%  stall  avg time  low batt  warning before catch  stuck on");
    for (let n = 0; n < NIGHTS.length; n++) {
        for (const [name, skill] of Object.entries(SKILLS)) {
            const rs = [];
            for (let s = 1; s <= RUNS; s++) rs.push(run(n, s, skill));
            const wins = rs.filter((r) => r.status === "done"), lost = rs.filter((r) => r.status === "caught"), stall = rs.filter((r) => r.status === "stall").length;
            const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
            const steps = {};
            for (const r of lost) steps[r.step] = (steps[r.step] ?? 0) + 1;
            console.log(`${n + 1} ${NIGHTS[n].title.padEnd(15)} ${name.padEnd(8)} ${String(Math.round((wins.length / RUNS) * 100)).padStart(4)}  ${String(stall).padStart(5)}  ${avg(wins.map((r) => r.t)).toFixed(0).padStart(7)}s  ${avg(rs.map((r) => r.lowest)).toFixed(0).padStart(7)}  ${avg(lost.map((r) => r.warned)).toFixed(1).padStart(10)}s  ${JSON.stringify(steps)}`);
        }
        const idle = [];
        for (let s = 1; s <= 10; s++) idle.push(run(n, s, SKILLS.bot, { mode: "idle" }));
        console.log(`${n + 1} ${"".padEnd(15)} idle: ${idle.filter((r) => r.status === "caught").length}/10 caught, avg ${(idle.reduce((a, r) => a + r.t, 0) / 10).toFixed(0)}s`);
    }
}
