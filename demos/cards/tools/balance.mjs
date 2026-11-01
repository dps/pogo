// Card audit: win-rate lift of each card and trinket across many bot runs, per witch baseline removed.
// node tools/balance.mjs [runs per witch] [asc] [skill]
import { playRun } from "./bot.mjs"; import { CARDS } from "../data/cards.js"; import { TRINKETS } from "../data/trinkets.js";
const N = +(process.argv[2] ?? 200), asc = +(process.argv[3] ?? 0), skill = +(process.argv[4] ?? 0.8);
const stat = {}, tr = {}, log = { cards: {} }; const base = {};
let big = 0, n1000 = 0, maxF = 0, runs = 0, turns = 0;
for (const w of ["posy", "thistle", "vesper"]) {
    let wins = 0; const rows = [];
    for (let i = 0; i < N; i++) { const r = playRun(i * 104729 + 3, w, asc, skill, log); rows.push(r); wins += r.run.won ? 1 : 0; turns += r.turns; }
    const wr = wins / N; base[w] = wr; runs += N;
    console.log(w, (wr * 100).toFixed(0) + "%");
    for (const r of rows) {
        const lift = (r.run.won ? 1 : 0) - wr;
        const ids = new Set(r.run.deck.map((k) => k.id));
        for (const id of ids) { const s = stat[id] ??= { n: 0, lift: 0, fires: 0, dmg: 0 }; s.n++; s.lift += lift; }
        for (const id in r.run.stats.cards) { const s = stat[id] ??= { n: 0, lift: 0, fires: 0, dmg: 0 }; s.fires += r.run.stats.cards[id].fires; s.dmg += r.run.stats.cards[id].dmg; }
        for (const id of r.run.trinkets) { const s = tr[id] ??= { n: 0, lift: 0 }; s.n++; s.lift += lift; }
        if (r.run.stats.best.dmg >= 300) big++; if (r.run.stats.best.dmg >= 1000) n1000++; maxF = Math.max(maxF, r.run.stats.maxFires);
    }
}
const rows = Object.entries(stat).filter(([id]) => ["common", "uncommon", "rare"].includes(CARDS[id]?.rar)).map(([id, s]) => ({ id, rar: CARDS[id].rar[0], n: s.n, lift: s.lift / Math.max(1, s.n), perRun: s.fires / Math.max(1, s.n), dpf: s.dmg / Math.max(1, s.fires), off: log.cards[id]?.offered ?? 0, tk: log.cards[id]?.taken ?? 0 }));
const fmt = (r) => `${r.id}[${r.rar}] ${(r.lift * 100).toFixed(0)}%/n${r.n}/f${r.perRun.toFixed(1)}/d${r.dpf.toFixed(0)}`;
const min = N * 0.1; const ok = rows.filter((r) => r.n >= min);
ok.sort((a, b) => b.lift - a.lift);
console.log("\nTOP lift:\n ", ok.slice(0, 14).map(fmt).join("\n  "));
console.log("\nBOTTOM lift:\n ", ok.slice(-14).map(fmt).join("\n  "));
console.log("\nrarely fired (<1.5 per owned run):\n ", ok.filter((r) => r.perRun < 1.5).map(fmt).join("\n  "));
console.log("\nnot seen enough:", Object.values(CARDS).filter((c) => ["common", "uncommon", "rare"].includes(c.rar) && !ok.some((r) => r.id === c.id)).map((c) => c.id).join(" "));
const t = Object.entries(tr).map(([id, s]) => [id, s.lift / s.n, s.n]).sort((a, b) => b[1] - a[1]);
console.log("\ntrinkets top:", t.slice(0, 8).map(([i, l, n]) => `${i} ${(l * 100).toFixed(0)}%`).join(", "), "\ntrinkets bottom:", t.slice(-8).map(([i, l, n]) => `${i} ${(l * 100).toFixed(0)}%`).join(", "));
console.log(`\nruns ${runs}: best brew >=300 in ${(big / runs * 100).toFixed(0)}%, >=1000 in ${(n1000 / runs * 100).toFixed(0)}%, max chain ${maxF}, avg turns ${(turns / runs).toFixed(0)}`);
