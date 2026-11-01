// Fits each level's move budget to a target win rate for the `casual` bot, then sets star scores and first-play seeds,
// and writes par.js. node tools/tune.mjs [games=80]
import { writeFileSync } from "node:fs";
import { LEVELS, setMoves } from "../levels.js";
import { Match } from "../engine.js";
import { playLevel } from "./bots.mjs";

const games = +(process.argv[2] ?? 80);
export function target(n) {
    const w = Math.floor(n / 12), l = n % 12, k = l / 11;
    const [a, b] = [[0.99, 0.93], [0.93, 0.8], [0.9, 0.74], [0.86, 0.68], [0.82, 0.62], [0.78, 0.55]][w];
    let t = a + (b - a) * k;
    if (l % 4 === 3) t += 0.05;     // a breather every few boards
    if (n < 6) t = 0.995;
    return Math.min(0.995, t);
}
const rate = (def, moves, n) => {
    setMoves(def, moves);
    let w = 0;
    for (let g = 0; g < n; g++) if (playLevel(def, 500 + g * 37, "casual").won) w++;
    return w / n;
};
const out = [];
for (const def of LEVELS) {
    def.feedNeed = 50 + def.world * 6;
    const want = target(def.n);
    let lo = 14, hi = 44;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (rate(def, mid, games >> 1) >= want) hi = mid; else lo = mid + 1; }
    let moves = lo;
    while (moves < 44 && rate(def, moves, games) < want) moves++;
    const r = rate(def, moves, games);
    const scores = [];
    for (let g = 0; g < 40; g++) { const b = playLevel(def, 9000 + g * 41, "casual"); if (b.won) scores.push(b.score); }
    for (let g = 0; g < 14; g++) { const b = playLevel(def, 12000 + g * 53, "sharp"); if (b.won) scores.push(b.score * 1.02); }
    scores.sort((a, b) => a - b);
    const at = (p) => Math.round(scores[Math.floor((scores.length - 1) * p)] / 100) * 100;
    // One star is the win itself. Two: a decent clear. Three: top fifth of runs.
    const stars = [at(0.1), at(0.5), at(0.82)];
    if (stars[1] <= stars[0]) stars[1] = stars[0] + 300;
    if (stars[2] <= stars[1]) stars[2] = stars[1] + 600;
    // First-play seed: a win for the casual bot, with a good opening cascade available on the first boards.
    let seed = def.n * 7 + 3, best = -1;
    for (let s = 1; s < (def.n < 12 ? 160 : 24); s++) {
        const b0 = new Match(def, s), legal = b0.legal();
        let top = 0;
        for (const [x, y] of legal) { const t = b0.clone(); t.play(x, y); top = Math.max(top, t.counts.maxChain * 3 + t.counts.specials * 4 + t.counts.candies * 0.1); }
        const won = playLevel(def, s, "casual").won ? 5 : 0;
        if (top + won + Math.min(4, legal.length * 0.3) > best) { best = top + won + Math.min(4, legal.length * 0.3); seed = s; }
    }
    out.push({ moves, feedNeed: def.feedNeed, stars, seed });
    console.log(String(def.n + 1).padStart(2), def.name.padEnd(20), `want ${want.toFixed(2)} got ${r.toFixed(2)} moves ${String(moves).padStart(2)} stars ${stars} seed ${seed}`);
}
writeFileSync(new URL("../par.js", import.meta.url), `// Baked by tools/tune.mjs from bot play. Do not edit by hand.\nexport const PAR = ${JSON.stringify(out)};\n`);
