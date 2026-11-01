import { run } from "./sim.mjs";
import { ACTS } from "../data.js";
const a = +process.argv[2];
const gs = process.argv[3].split(",").map(Number), ms = process.argv[4].split(",").map(Number);
const best = ["bulk","hands","fast","clerk","intern"].slice(0,a), worst = ["lucky","regulars","patience","lunch","tongue"].slice(0,a);
for (const g of gs) for (const m of ms) {
    ACTS[a].m = g; ACTS[a].pay = m;
    const out = [["casual",best],["casual",worst],["active",best],["relaxed",worst]].map(([n,b]) => { const R = run(n, { only: a, hourLimit: 4, bylaws: b }); return `${n}=${R.hours*60|0}m gap${R.maxGapMin.toFixed(1)}`; });
    console.log(`m=${g} pay=${m}  ${out.join("  ")}`);
}
