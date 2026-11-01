// Quick look at hand-drawn boards: node tools/try.mjs  (edit the list)
import { E, parseLevel } from "../rules.js";
import { solve, planToMoves, analyze } from "../solver.js";
const list = JSON.parse(process.argv[2]);
for (const [rows, need = 1, ...needs] of list) {
    const lvl = parseLevel({ id: "t", rows, need }), a = solve(lvl, { max: 2e6 });
    const out = [a.solved ? `pushes ${a.pushes}` : `UNSOLVED (${a.exhausted ? "proved" : "limit"})`, `boards ${a.boards}`];
    if (a.solved) { for (const n of needs) { const k = solve(lvl, { forbid: E[n], max: 2e6 }); out.push(`${n}:${k.solved ? "not needed" : k.exhausted ? "NEEDED" : "?"}`); } const z = analyze(lvl, 4e5); if (z) out.push(`dead ${z.deadShare.toFixed(2)} trap ${z.trap.toFixed(2)}`); out.push(planToMoves(lvl, a.plan).length + " steps"); }
    console.log(JSON.stringify(rows), out.join("  "));
}
