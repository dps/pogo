// The full report: can every level be beaten, at what rate, and is the difficulty ramp free of walls?
// Also walks the campaign like a player who retries, to count total attempts. node tools/ramp.mjs [games]
import { LEVELS, validate } from "../levels.js";
import { playLevel } from "./bots.mjs";
import { NEWS } from "../news.js";

const games = +(process.argv[2] ?? 200);
const problems = validate();
let fails = 0;
const say = (m) => { fails++; console.log("FAIL", m); };
problems.forEach(say);
if (LEVELS.length < 60) say("under sixty levels");
if (NEWS.length !== LEVELS.length) say(`headlines ${NEWS.length} != levels ${LEVELS.length}`);
const rows = [];
for (const def of LEVELS) {
    let wins = 0, moves = 0, left = 0, sharp = 0, random = 0;
    for (let g = 0; g < games; g++) {
        const b = playLevel(def, 70000 + g * 59 + def.n, "casual");
        if (b.won) { wins++; left += b.bonusMoves; }
        moves += b.movesUsed;
    }
    const sg = Math.ceil(games / 8);
    for (let g = 0; g < sg; g++) if (playLevel(def, 90000 + g * 61, "sharp").won) sharp++;
    for (let g = 0; g < games >> 1; g++) if (playLevel(def, 110000 + g * 61, "random").won) random++;
    rows.push({ n: def.n + 1, name: def.name, moves: def.moves, casual: wins / games, sharp: sharp / sg, random: random / (games >> 1), left: left / Math.max(1, wins), used: moves / games });
}
console.log(" #  level                 moves  casual  sharp  random  left over");
for (const r of rows) console.log(String(r.n).padStart(2), " ", r.name.padEnd(20), String(r.moves).padStart(4), `  ${(r.casual * 100).toFixed(0).padStart(4)}%  ${(r.sharp * 100).toFixed(0).padStart(4)}%  ${(r.random * 100).toFixed(0).padStart(4)}%  ${r.left.toFixed(1).padStart(5)}`);
// Beatable: the strong bot must win nearly always, and the casual bot at a reasonable rate everywhere.
for (const r of rows) {
    if (r.sharp < 0.9) say(`${r.n} ${r.name}: sharp bot only ${(r.sharp * 100).toFixed(0)}%`);
    if (r.casual < 0.45) say(`${r.n} ${r.name}: casual bot only ${(r.casual * 100).toFixed(0)}%`);
    if (r.n <= 12 && r.casual < 0.88) say(`${r.n} ${r.name}: an early level is too hard`);
}
// No walls: no single step may drop the casual win rate by more than 30 points, and a rolling average must fall gently.
for (let i = 1; i < rows.length; i++) if (rows[i - 1].casual - rows[i].casual > 0.3) say(`wall between ${i} and ${i + 1}`);
const avg = (a, b) => rows.slice(a, b).reduce((s, r) => s + r.casual, 0) / (b - a);
const worlds = []; for (let w = 0; w < 6; w++) worlds.push(avg(w * 12, w * 12 + 12));
console.log("world averages:", worlds.map((v) => (v * 100).toFixed(0) + "%").join("  "));
for (let w = 1; w < 6; w++) if (worlds[w] > worlds[w - 1] + 0.05) say(`world ${w + 1} is easier than world ${w}`);
const attempts = rows.reduce((s, r) => s + 1 / Math.max(r.casual, 0.05), 0);
const worst = rows.reduce((a, r) => (a.casual < r.casual ? a : r));
console.log(`casual player: about ${attempts.toFixed(0)} attempts for ${rows.length} levels. Hardest: ${worst.n} ${worst.name} at ${(worst.casual * 100).toFixed(0)}%, ${(1 / worst.casual).toFixed(1)} tries.`);
console.log(`typical level length: ${(rows.reduce((s, r) => s + r.used, 0) / rows.length).toFixed(1)} moves`);
console.log(fails ? `${fails} FAILURES` : "PASS: all levels beatable, no walls");
process.exit(fails ? 1 : 0);
