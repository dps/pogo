// Proves boards cannot deadlock: every level is played by a random and a casual bot, and after every turn the board
// must be stable (no ready matches), have no unexplained holes, and offer a legal move. Then hostile boards built to
// have no moves at all must recover through the reshuffle ladder. node tools/deadlock.mjs [games]
import { LEVELS, ENDLESS } from "../levels.js";
import { Match, N, W, H, CANDY, MALLOW } from "../engine.js";
import { playLevel } from "./bots.mjs";

const games = +(process.argv[2] ?? 40);
let turns = 0, reshuffles = 0, rescues = 0, bad = 0;
const fail = (msg) => { bad++; if (bad < 20) console.log("FAIL", msg); };

function check(b, label) {
    turns++;
    if (b.won || b.lost || b.moves <= 0) return;
    if (!b.hasMove()) fail(`${label}: no legal move after turn ${b.movesUsed}`);
    if (b.findGroups().length) fail(`${label}: ready match left on board`);
    for (let i = 0; i < N; i++) {
        if (!b.mask[i] || b.pk[i] || b.cookie[i] || b.fudge[i]) continue;
        if (b.fedFromAbove(i)) fail(`${label}: hole at ${i} that should have refilled`);
    }
}

for (const def of LEVELS) for (const style of ["random", "casual"]) for (let g = 0; g < games; g++) {
    const b = playLevel(def, 77 + g * 13, style, { onTurn: (x) => check(x, `${def.n + 1} ${def.name} ${style}#${g}`) });
    reshuffles += b.counts.reshuffles; rescues += b.counts.rescues;
    if (b.deadlocked) fail(`${def.n + 1} deadlocked`);
}
console.log(`levels: ${turns} turns checked, ${reshuffles} reshuffles, ${rescues} rescues`);

// A long endless session must never stall.
{
    const b = new Match(ENDLESS, 3); b.quiet = true;
    for (let n = 0; n < 8000; n++) {
        const l = b.legal();
        if (!l.length) { fail("endless: no move"); break; }
        b.play(...l[b.rnd(l.length)]);
        if (b.chompReady) b.feed -= b.feedNeed;
    }
    console.log(`endless: 8000 moves, ${b.counts.reshuffles} reshuffles`);
}

// Hostile boards: a checker of colours with no possible swap, and worse, boards nearly full of blockers.
function hostile(fillBlock, colours, seed) {
    const rows = [];
    for (let y = 0; y < H; y++) { let r = ""; for (let x = 0; x < W; x++) r += fillBlock(x, y) ?? String((x % 2 * 2 + (y % 2) + (x >> 1) * 0 + (y >> 1) * 2) % colours); rows.push(r); }
    const b = new Match({ rows, colors: colours, moves: 20, goals: [{ t: "score", n: 1e9 }] }, seed);
    b.quiet = false;
    return b;
}
const cases = [
    ["dead checker", () => null],
    ["caged field", (x, y) => ((x + y) % 2 ? "l" : null)],
    ["cookie field", (x, y) => ((x + y) % 3 ? "K" : null)],
    ["almost all cookie", (x, y) => (x === 3 && y === 4 ? null : x === 4 && y === 4 ? null : "K")],
    ["one candy", (x, y) => (x === 3 && y === 4 ? null : "K")],
    ["all cages", () => "l"],
    ["fudge flood", (x, y) => (y < 7 ? "u" : null)],
];
for (const [name, f] of cases) for (const colours of [3, 5, 6]) for (let seed = 1; seed < 6; seed++) {
    const b = hostile(f, colours, seed);
    b.begin();
    b.ensureMoves();
    const ok = b.hasMove();
    if (!ok) fail(`hostile ${name} c${colours} s${seed}: still stuck`);
    if (b.findGroups().length && !b.phases.some((p) => p.t === "chomp")) fail(`hostile ${name}: left a match`);
    if (seed === 1 && colours === 5) console.log(`hostile ${name}: ${ok ? "recovered" : "STUCK"} via ${[...new Set(b.phases.map((p) => p.t))].join(",") || "already fine"}`);
}
console.log(bad ? `${bad} FAILURES` : "PASS: no deadlocks");
process.exit(bad ? 1 : 0);
