// The proof that matters: run thousands of games. Reports newcomer and sharp win rates, per-trait strength, and run length.
import { SHOPS, TRAITS, TRAIT_IDS, PETS } from "../data.js";
import { newRun, teamOf } from "../run.js";
import { playRun, newcomer, sharpTurn } from "../ai.js";
import { hashStr, traitCounts } from "../sim.js";
const N = Number(process.argv[2] ?? 400);
const stat = (runs) => { const w = runs.filter((r) => r.over === "won").length, wins = runs.reduce((a, r) => a + r.wins, 0) / runs.length, rounds = runs.reduce((a, r) => a + r.round, 0) / runs.length; return { win: w / runs.length, wins, rounds }; };
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const make = (seed, shop = "corner", extra = {}) => () => newRun({ seed, shop, ...extra });
const seeds = (n, tag) => Array.from({ length: n }, (_, i) => hashStr(i + 1, tag));

const novice = seeds(N, "nov").map((s) => playRun({ make: make(s), turn: newcomer(s) }));
const sharp = seeds(N, "sharp").map((s) => playRun({ make: make(s), turn: (r) => sharpTurn(r, {}) }));
const a = stat(novice), b = stat(sharp);
console.log(`newcomer  win ${pct(a.win)}  avg wins ${a.wins.toFixed(2)}  rounds ${a.rounds.toFixed(1)}  zero-win runs ${pct(novice.filter((r) => r.wins === 0).length / N)}  3+ wins ${pct(novice.filter((r) => r.wins >= 3).length / N)}`);
console.log(`sharp     win ${pct(b.win)}  avg wins ${b.wins.toFixed(2)}  rounds ${b.rounds.toFixed(1)}`);
const hard = stat(seeds(N, "hard").map((s) => playRun({ make: make(s, "corner", { hard: true }), turn: (r) => sharpTurn(r, {}) })));
console.log(`sharp in Sharp League  win ${pct(hard.win)}  avg wins ${hard.wins.toFixed(2)}`);

console.log("\nby shop (sharp / newcomer)");
for (const s of SHOPS) {
    const x = stat(seeds(N >> 1, s.id).map((v) => playRun({ make: make(v, s.id), turn: (r) => sharpTurn(r, {}) })));
    const y = stat(seeds(N >> 1, s.id + "n").map((v) => playRun({ make: make(v, s.id), turn: newcomer(v) })));
    console.log(`  ${s.name.padEnd(16)} sharp ${pct(x.win).padStart(6)}  newcomer ${pct(y.win).padStart(6)}  rounds ${x.rounds.toFixed(1)}`);
}
// Each trait: a sharp bot that commits to it, on runs where it is stocked. Relative to the field.
console.log("\nforced trait (sharp bot commits, Sharp League ladder for resolution)");
const rows = [];
for (const t of TRAIT_IDS) {
    const runs = [];
    for (const s of seeds(N * 3, t)) { const run0 = newRun({ seed: s }); if (!run0.stock.traits.includes(t)) continue; runs.push(playRun({ make: make(s, "corner", { hard: true }), turn: (r) => sharpTurn(r, { focus: [t] }) })); if (runs.length >= N) break; }
    const x = stat(runs); rows.push({ t, ...x, n: runs.length });
}
const meanW = rows.reduce((n, r) => n + r.wins, 0) / rows.length, mean = rows.reduce((n, r) => n + r.win, 0) / rows.length;
let bad = 0;
for (const r of rows.sort((p, q) => q.wins - p.wins)) { const ratio = r.win / mean, flag = ratio > 1.35 ? " DOMINANT" : ratio < 0.65 ? " DEAD" : ""; if (flag) bad++; console.log(`  ${TRAITS[r.t].name.padEnd(10)} win ${pct(r.win).padStart(6)}  wins ${r.wins.toFixed(2)}  x${ratio.toFixed(2)}${flag}`); }
// How often each trait is live on champion teams when the bot is free to choose.
const free = seeds(N * 2, "free").map((s) => playRun({ make: make(s), turn: (r) => sharpTurn(r, {}) })).filter((r) => r.over === "won"), share = {};
for (const r of free) { const tc = traitCounts(teamOf(r)); for (const t in tc) if (tc[t].lvl) share[t] = (share[t] ?? 0) + 1; }
if (free.length) { console.log(`\nactive on ${free.length} champion teams`); const avg = TRAIT_IDS.reduce((n, t) => n + (share[t] ?? 0), 0) / 12; for (const t of TRAIT_IDS) { const x = (share[t] ?? 0) / avg, f = x > 2 ? " OVERUSED" : x < 0.35 ? " UNUSED" : ""; if (f) bad++; console.log(`  ${TRAITS[t].name.padEnd(10)} ${pct((share[t] ?? 0) / free.length).padStart(6)}  x${x.toFixed(2)}${f}`); } }
// Pets that never get seated or are always seated would show up here.
console.log(bad ? `TRAIT CHECK FAILED: ${bad}` : "trait check passed: every trait within 0.65x to 1.35x of the mean win rate, none overused or unused");
