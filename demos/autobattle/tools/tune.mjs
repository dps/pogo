// Grid-searches the opponent ladder for newcomer and sharp targets.
import { newRun, TUNE } from "../run.js";
import { playRun, newcomer, sharpTurn } from "../ai.js";
import { hashStr } from "../sim.js";
const N = 160, seeds = (t) => Array.from({ length: N }, (_, i) => hashStr(i + 1, t));
const go = () => { const a = seeds("a").map((s) => playRun({ make: () => newRun({ seed: s }), turn: newcomer(s) })), b = seeds("b").map((s) => playRun({ make: () => newRun({ seed: s }), turn: (r) => sharpTurn(r, {}) })); const f = (x) => [x.filter((r) => r.over === "won").length / N, x.reduce((n, r) => n + r.wins, 0) / N]; return [...f(a), ...f(b)]; };
for (const base of [-0.1, 0, 0.1]) for (const round of [0, 0.015, 0.03]) for (const wins of [0.04, 0.055]) { Object.assign(TUNE, { base, round, wins }); console.log(base, round, wins, go().map((v) => v.toFixed(2)).join(" ")); }
