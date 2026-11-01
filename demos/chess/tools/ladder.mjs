// Does each club member really beat the one below? Engine against engine, no graphics. Top levels use node limits so the result doesn't depend on machine load.
import { ChessGame, Search, mTo } from "../engine.js";
import { CLUB, bookMove, chooseFrom } from "../ai.js";
class R { constructor(s) { this.s = s; } next() { this.s = Math.imul(this.s ^ this.s >>> 15, 1 | this.s) + 0x6d2b79f5 | 0; return (this.s >>> 0) / 4294967296; } chance(p) { return this.next() < p; } pick(a) { return a[Math.floor(this.next() * a.length)]; } }
const search = new Search(18);
function moveFor(level, chess, rng) {
    const who = CLUB[level], moves = chess.ucis();
    if (level >= 2) { const b = bookMove(moves, rng); if (b) return b; }
    const think = { ...who.think, seed: Math.floor(rng.next() * 1e6) };
    if (think.maxMs) { think.maxNodes = level === 4 ? 200000 : 600000; delete think.maxMs; }
    search.start(chess.startFen, moves, think); search.run();
    const r = search.result;
    return who.think.spread ? chooseFrom(r, who, rng, (u) => { const m = chess.pos.fromUci(u); return m && !!chess.pos.b[mTo(m)]; }) : r.move;
}
function game(a, b, seed) {
    const chess = new ChessGame(), rng = new R(seed);
    for (let ply = 0; ply < 300; ply++) {
        const st = chess.status();
        if (st.over) return st.result;
        const lv = chess.turn ? b : a, m = chess.pos.fromUci(moveFor(lv, chess, rng));
        chess.play(m);
    }
    return "draw";
}
const pairs = [[1, 0, 16], [2, 1, 12], [3, 2, 10], [4, 3, 6], [5, 4, 4], [2, 0, 6], [3, 1, 6]];
for (const [hi, lo, n] of pairs) {
    let w = 0, d = 0, l = 0;
    for (let i = 0; i < n; i++) {
        const hiWhite = i % 2 === 0, r = hiWhite ? game(hi, lo, 1000 + i) : game(lo, hi, 2000 + i);
        if (r === "draw") d++; else if ((r === "white") === hiWhite) w++; else l++;
    }
    console.log(`${CLUB[hi].name} v ${CLUB[lo].name}: +${w} =${d} -${l}`);
}
