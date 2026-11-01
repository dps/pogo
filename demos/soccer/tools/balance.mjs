// Bot simulations: AI vs AI at matched and mismatched difficulty, scoreline shape, closeness.
// node tools/balance.mjs [matches]
import { Match } from "../sim.js";
const N = Number(process.argv[2] ?? 200);

function run(sa, sb, n, mode = {}, styleA, styleB) {
    let w = 0, d = 0, l = 0, g = 0, close = 0, big = 0, shots = 0, pass = 0, sot = 0, butts = 0, poss = 0, gA = 0;
    const hist = {};
    const t0 = Date.now();
    let steps = 0;
    for (let i = 0; i < n; i++) {
        const m = new Match({ seed: i * 7 + 13, teams: [{ skill: sa, style: styleA }, { skill: sb, style: styleB }], mode, fast: true });
        for (let k = 0; k < 60 * 400 && !m.done; k++) { m.step(); m.events.length = 0; steps++; }
        const [a, b] = m.score;
        g += a + b; gA += a;
        if (a > b) w++; else if (a < b) l++; else d++;
        if (Math.abs(a - b) <= 1) close++;
        if (Math.abs(a - b) >= 4) big++;
        const key = `${Math.max(a, b)}-${Math.min(a, b)}`; hist[key] = (hist[key] ?? 0) + 1;
        shots += m.stats[0].shots + m.stats[1].shots; pass += m.stats[0].passes + m.stats[1].passes; sot += m.stats[0].onTarget + m.stats[1].onTarget; butts += m.stats[0].butts + m.stats[1].butts;
        poss += m.stats[0].poss / (m.stats[0].poss + m.stats[1].poss + 1e-6);
    }
    const top = Object.entries(hist).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${(v / n * 100) | 0}%`).join(" ");
    return { line: `A ${sa} v B ${sb}  W${(w / n * 100).toFixed(0)} D${(d / n * 100).toFixed(0)} L${(l / n * 100).toFixed(0)}  goals ${(g / n).toFixed(2)} (A ${(gA / n).toFixed(2)})  within1 ${(close / n * 100).toFixed(0)}%  4+ ${(big / n * 100).toFixed(0)}%  shots ${(shots / n).toFixed(1)} sot ${(sot / n).toFixed(1)} pass ${(pass / n).toFixed(0)} butts ${(butts / n).toFixed(1)} possA ${(poss / n * 100).toFixed(0)}%  | ${top}  [${((Date.now() - t0) / steps * 1000).toFixed(1)}us/step]`, w: w / n, close: close / n, g: g / n };
}

const out = {};
console.log("matched");
for (const s of [0, 0.25, 0.5, 0.75, 1]) { const r = run(s, s, N); console.log(r.line); out[s] = r; }
console.log("mismatched");
for (const [a, b] of [[0.25, 0], [0.5, 0.25], [0.75, 0.5], [1, 0.75], [1, 0]]) console.log(run(a, b, N).line);
console.log("modes (skill .5)");
for (const [n, m] of [["mud", { mud: true }], ["wind", { wind: true }], ["farmer", { farmer: true }], ["sheep", { sheep: true }]]) console.log(n.padEnd(7), run(0.5, 0.5, Math.ceil(N / 2), m).line);
console.log("styles");
for (const [a, b] of [["press", "pass"], ["direct", "pass"], ["press", "direct"]]) console.log(a, b, run(0.5, 0.5, Math.ceil(N / 2), {}, a, b).line);
