// A quick table of how each level plays. node tools/survey.mjs [games] [firstLevel] [lastLevel]
import { LEVELS, validate } from "../levels.js";
import { playLevel } from "./bots.mjs";
const games = +(process.argv[2] ?? 30), from = +(process.argv[3] ?? 1) - 1, to = +(process.argv[4] ?? LEVELS.length);
console.log("problems:", validate());
const start = Date.now();
for (const l of LEVELS.slice(from, to)) {
    const row = {};
    for (const style of ["random", "casual", "sharp"]) {
        const n = style === "sharp" ? Math.ceil(games / 3) : games;
        let wins = 0, left = 0, shuf = 0;
        for (let g = 0; g < n; g++) {
            const b = playLevel(l, 1000 + g * 31, style);
            if (b.won) { wins++; left += b.bonusMoves; }
            shuf += b.counts.reshuffles + b.counts.rescues;
            if (b.deadlocked) throw new Error(`deadlock on ${l.n + 1}`);
        }
        row[style] = `${String(Math.round(wins / n * 100)).padStart(3)}% L${(left / Math.max(1, wins)).toFixed(0).padStart(2)} s${(shuf / n).toFixed(1)}`;
    }
    console.log(String(l.n + 1).padStart(2), l.name.padEnd(18), String(l.moves).padStart(2), Object.values(row).join("  |  "));
}
console.log((Date.now() - start) / 1000, "s");
