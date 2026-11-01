// How much does one good shot bring down? Prints per-level: blocks moved or broken, kills, ms.
import { Sim } from "../sim.js";
import { LEVELS } from "../levels.js";
const ids = process.argv.slice(2).map(Number); const list = ids.length ? ids.map((i) => LEVELS[i]) : LEVELS;
for (const l of list) {
    const res = [];
    for (const [vx, vy] of [[25, -8], [24, -10], [26, -5], [22, -13]]) {
        const s = new Sim(l, { seed: 5 }), n = s.parts.filter((p) => p.kind === "block").length, d = s.defenders.length;
        const a = Object.keys(s.rack)[0];
        s.fire("rock", vx, vy);
        let t0 = performance.now(), peak = 0, ticks = 0, bodies = 0;
        for (let i = 0; i < 700 && s.state === "flight"; i++) { const t = performance.now(); s.step(); peak = Math.max(peak, performance.now() - t); s.events.length = 0; ticks++; bodies = Math.max(bodies, s.world.bodies.length); }
        const moved = s.toppled + s.broken;
        res.push(`${Math.round(100 * moved / n)}%/${d - s.defenders.length}k/${s.score}/${(ticks / 60).toFixed(1)}s`);
        if (peak > 6) res.push(`peak ${peak.toFixed(1)}`);
    }
    console.log(String(l.index).padStart(2), l.name.padEnd(24), res.join("  "));
}
