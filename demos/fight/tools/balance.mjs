// Bot simulation: every matchup, both sides, at a given AI level. Prints the win table and flags anything outside 35-65%.
// node tools/balance.mjs [gamesPerSide=12] [level=2]
import { Fight } from "../sim.js";
import { Brain } from "../ai.js";
import { ROSTER, BY_ID } from "../fighters.js";

class Rng { constructor(s) { this.s = s >>> 0 || 1; } next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; } pick(a) { return a[Math.floor(this.next() * a.length)]; } }

export function match(a, b, la, lb, seed, cap = 60 * 60 * 6) {
    const fight = new Fight({ a, b, fast: true, rounds: 2 });
    const rng = new Rng(seed), A = new Brain(0, a, la, rng), B = new Brain(1, b, lb, rng);
    let n = 0;
    while (fight.phase !== "over" && n++ < cap) { fight.step(A.think(fight), B.think(fight)); fight.ev.length = 0; }
    return { winner: fight.winner, frames: n, fight };
}
export function table(games, level, seed = 1) {
    const n = ROSTER.length, wins = Array.from({ length: n }, () => new Array(n).fill(0)), plays = Array.from({ length: n }, () => new Array(n).fill(0));
    let frames = 0, count = 0, sup = 0, tot = 0, best = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let g = 0; g < games * 2; g++) {
        const swap = g % 2 === 1, a = ROSTER[swap ? j : i], b = ROSTER[swap ? i : j];
        const r = match(a, b, level, level, seed * 7919 + i * 131 + j * 17 + g * 3);
        frames += r.frames; count++;
        sup += r.fight.stats[0].supers + r.fight.stats[1].supers; best = Math.max(best, r.fight.stats[0].best, r.fight.stats[1].best);
        const iWon = (r.winner === 0) !== swap;
        plays[i][j]++; plays[j][i]++;
        if (iWon) wins[i][j]++; else wins[j][i]++;
    }
    return { wins, plays, avg: frames / count / 60, sup: sup / count, best };
}
if (process.argv[1]?.endsWith("balance.mjs")) {
    // A fourth argument of "1,2,3,4" averages several seeds.
    const games = Number(process.argv[2] ?? 12), level = Number(process.argv[3] ?? 2), seeds = String(process.argv[4] ?? "1").split(",").map(Number);
    const t0 = Date.now(), runs = seeds.map((sd) => table(games, level, sd)), { avg, sup, best } = runs[0];
    const add = (key) => runs[0][key].map((row, i) => row.map((_, j) => runs.reduce((s, r) => s + r[key][i][j], 0)));
    const wins = add("wins"), plays = add("plays");
    console.log("         " + ROSTER.map((r) => r.slice(0, 6).padStart(7)).join(""));
    let bad = 0, lo = 1, hi = 0;
    ROSTER.forEach((r, i) => {
        let row = r.padEnd(9), tw = 0, tp = 0;
        ROSTER.forEach((_, j) => {
            if (i === j) { row += "      ."; return; }
            const p = wins[i][j] / plays[i][j]; tw += wins[i][j]; tp += plays[i][j];
            if (p < 0.35 || p > 0.65) { row += (Math.round(p * 100) + "!").padStart(7); bad++; } else row += String(Math.round(p * 100)).padStart(7);
            lo = Math.min(lo, p); hi = Math.max(hi, p);
        });
        console.log(row + "   total " + Math.round(tw / tp * 100) + "%");
    });
    console.log(`games ${ROSTER.length * (ROSTER.length - 1) * games * seeds.length}, level ${level}, range ${Math.round(lo * 100)}-${Math.round(hi * 100)}%, outside 35-65: ${bad / 2} matchups, avg match ${avg.toFixed(0)}s, supers/match ${sup.toFixed(2)}, best combo ${best}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (bad) process.exitCode = 1;
}
