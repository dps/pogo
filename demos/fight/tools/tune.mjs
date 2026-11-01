// Nudges each fighter's health and damage until every overall win rate sits near 50%, using the hard AI on both sides.
import { table } from "./balance.mjs";
import { FIGHTERS, ROSTER } from "../fighters.js";
const iters = Number(process.argv[2] ?? 12), games = Number(process.argv[3] ?? 10);
const t = Object.fromEntries(FIGHTERS.map((f) => [f.id, [f.hp / f.baseHp, f.tuneDmg]]));
for (let it = 0; it < iters; it++) {
    const { wins, plays } = table(games, 2, it + 1);
    const totals = ROSTER.map((r, i) => wins[i].reduce((a, b) => a + b, 0) / plays[i].reduce((a, b) => a + b, 0));
    FIGHTERS.forEach((f, i) => {
        const e = 0.5 - totals[i], k = 1 + e * 0.32 * (1 - it / (iters * 1.4));
        t[f.id][0] *= k; t[f.id][1] *= 1 + e * 0.16 * (1 - it / (iters * 1.4));
        t[f.id][0] = Math.max(0.7, Math.min(1.5, t[f.id][0])); t[f.id][1] = Math.max(0.75, Math.min(1.3, t[f.id][1]));
        f.hp = Math.round(f.baseHp * t[f.id][0]); f.tuneDmg = t[f.id][1];
    });
    console.log(it, totals.map((x) => Math.round(x * 100)).join(" "));
}
console.log(`export const TUNE = { ${FIGHTERS.map((f) => `${f.id}: [${t[f.id][0].toFixed(3)}, ${t[f.id][1].toFixed(3)}]`).join(", ")} };`);
