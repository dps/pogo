// Finds the crew pay curve for one act that gives a casual player the target length. usage: fit.mjs act minutes m
import { run } from "./sim.mjs";
import { ACTS } from "../data.js";
const a = +process.argv[2], target = +process.argv[3], m = +process.argv[4];
const mid = ["clerk", "tongue", "start", "intern", "regulars"].slice(0, a);
ACTS[a].m = m; let lo = -7, hi = 0, best = null;
for (let i = 0; i < 9; i++) {
    const mid2 = (lo + hi) / 2; ACTS[a].pay = 10 ** mid2;
    const R = run("casual", { only: a, hourLimit: 3, bylaws: mid }), min = R.hours * 60;
    if (R.done || R.S.act !== a) { if (min < target) hi = mid2; else lo = mid2; best = { pay: ACTS[a].pay, min, gap: R.maxGapMin }; } else lo = mid2;
    if (R.S.act !== a && Math.abs(min - target) < 2) break;
}
const others = ["active", "relaxed"].map((n) => { const R = run(n, { only: a, hourLimit: 3, bylaws: mid }); return `${n}=${(R.hours * 60).toFixed(0)}m gap${R.maxGapMin.toFixed(1)}`; });
console.log(`act ${a} m=${m} pay=${best?.pay.toExponential(2)} casual=${best?.min.toFixed(0)}m gap${best?.gap.toFixed(1)} ${others.join(" ")}`);
