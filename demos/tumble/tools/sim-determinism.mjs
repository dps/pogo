// Same calls, same castle, same hash, whether it runs here or in Chrome. Prints one number per level.
import { Sim } from "../sim.js";
import { LEVELS } from "../levels.js";
export function run() {
    let h = 0;
    for (const l of LEVELS) {
        const s = new Sim(l, { seed: 9 });
        const a = Object.keys(s.rack)[0];
        s.fire(a, 25, -7);
        for (let i = 0; i < 240; i++) { s.step(); s.events.length = 0; }
        h = (Math.imul(h, 33) + s.hash()) >>> 0;
    }
    return h;
}
if (typeof process !== "undefined" && process.argv?.[1]?.endsWith("sim-determinism.mjs")) { const a = run(), b = run(); console.log(a === b ? "ok  " : "FAIL", a, b); }
