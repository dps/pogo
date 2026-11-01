// Search proof: mates and tactics, node rate, and that time-sliced search gives the same answer as a flat-out run.
import { Search, START_FEN } from "../engine.js";
const TESTS = [
  ["mate in 1", "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", "a1a8", 4],
  ["mate in 2 (Morphy)", "kbK5/pp6/1P6/8/8/8/8/R7 w - - 0 1", "a1a6", 6],
  ["mate in 3", "r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1", "f6a6", 8],
  ["WAC.001 Qg6", "2rr3k/pp3pp1/1nnqbN1p/3pN3/2pP4/2P3Q1/PPB4P/R4RK1 w - - 0 1", "g3g6", 8],
  ["WAC.004 Kaufman Qxh7", "r1b2rk1/2q1b1pp/p2ppn2/1p6/3QP3/1BN1B3/PPP3PP/R4RK1 w - - 0 1", "c3d5", 9],
];
const s = new Search(19);
let pass = 0;
for (const [name, fen, want, depth] of TESTS) {
  s.start(fen, [], { maxDepth: depth, maxMs: 4000 }); s.run();
  const r = s.result, ok = !want || r.move === want;
  pass += ok ? 1 : 0;
  console.log(`${ok?"ok  ":"FAIL"} ${name}: ${r.move} score ${r.score} depth ${r.depth} nodes ${r.nodes} ${r.ms}ms (${Math.round(r.nodes/Math.max(1,r.ms))}k/s)`);
}
for (const ms of [200, 1000, 3000]) { s.start(START_FEN, ["e2e4","e7e5","g1f3","b8c6"], { maxMs: ms }); s.run(); console.log(`budget ${ms}: depth ${s.result.depth}, ${s.result.move}, took ${s.result.ms}ms, ${Math.round(s.result.nodes/s.result.ms)}k/s`); }
// Time slicing is the same machine: same nodes, same result, sliced at 4ms.
s.start("r1b2rk1/2q1b1pp/p2ppn2/1p6/3QP3/1BN1B3/PPP3PP/R4RK1 w - - 0 1", [], { maxDepth: 8 }); s.run(); const flat = s.result;
s.start("r1b2rk1/2q1b1pp/p2ppn2/1p6/3QP3/1BN1B3/PPP3PP/R4RK1 w - - 0 1", [], { maxDepth: 8 });
let slices = 0, worst = 0; for (;;) { slices++; const t=performance.now(); const d=s.run(t+4); worst=Math.max(worst,performance.now()-t); if (d) break; }
console.log(`sliced: ${slices} slices, worst slice ${worst.toFixed(1)}ms, same move ${flat.move===s.result.move}, same nodes ${flat.nodes===s.result.nodes}`);
