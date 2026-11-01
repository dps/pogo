// Rules proof: perft on the six standard positions, then one scripted test per draw rule and special move.
import { ChessGame, Position, perft, mFlag, sqFrom, START_FEN } from "../engine.js";

const CASES = [
    ["startpos", START_FEN, [20, 400, 8902, 197281, 4865609]],
    ["kiwipete", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", [48, 2039, 97862, 4085603]],
    ["position3", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", [14, 191, 2812, 43238, 674624]],
    ["position4", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", [6, 264, 9467, 422333]],
    ["position5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", [44, 1486, 62379, 2103487]],
    ["position6", "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", [46, 2079, 89890, 3894594]],
];
let fails = 0;
for (const [name, fen, want] of CASES) {
    const p = new Position(fen), before = p.fen(), t0 = performance.now();
    const got = want.map((_, i) => perft(p, i + 1));
    const ok = got.every((n, i) => n === want[i]) && p.fen() === before;
    if (!ok) fails++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(10)} ${got.join(" ")}  (${Math.round(performance.now() - t0)} ms)`);
    if (!ok) console.log(`     wanted ${want.join(" ")}`);
}

const check = (name, cond) => { if (!cond) fails++; console.log(`${cond ? "ok  " : "FAIL"} ${name}`); };
const playAll = (fen, moves) => new ChessGame(fen, moves.split(" ").filter(Boolean));

// Results
let g = playAll(START_FEN, "f2f3 e7e5 g2g4 d8h4");
check("fool's mate is checkmate, black wins", g.status().reason === "checkmate" && g.status().result === "black");
g = playAll("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", "");
check("stalemate detected", g.status().reason === "stalemate" && g.status().result === "draw");
g = playAll(START_FEN, "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1 f6g8");
check("threefold on the third occurrence", g.status().reason === "threefold repetition");
g = playAll(START_FEN, "g1f3 g8f6 f3g1 f6g8 g1f3 g8f6 f3g1");
check("not threefold one ply early", !g.status().over);
// En passant right on the first occurrence makes it a different position (FIDE 9.2).
g = playAll("4k3/8/8/8/3p4/8/4P3/4K2R w K - 0 1", "e2e4 e8d8 h1g1 d8e8 g1h1 e8d8 h1g1 d8e8 g1h1");
check("first position had e.p. available, so it isn't a repetition yet", !g.status().over && g.repetitions() === 2);
// An en passant square that can't legally be used doesn't count.
g = new ChessGame("4k3/8/8/8/3p4/8/4P3/3RK3 w - - 0 1", ["e2e4"]);
check("legal e.p. keeps its square in the key", g.repKey().endsWith(" e3"));
g = new ChessGame("3k4/8/8/8/3p4/8/4P3/3RK3 w - - 0 1", ["e2e4"]);
check("pinned capturer: e.p. square dropped from the key", g.repKey().endsWith(" -"));
g = playAll("8/8/8/4k3/8/8/4K2R/8 w - - 99 80", "h2h3");
check("fifty-move rule at 100 halfmoves", g.status().reason === "fifty-move rule");
g = playAll("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 99 80", "a1a8");
check("checkmate beats the fifty-move rule", g.status().reason === "checkmate");
for (const [fen, name, dead] of [
    ["8/8/8/4k3/8/8/4K3/8 w - - 0 1", "K v K", true],
    ["8/8/8/4k3/8/8/4KB2/8 w - - 0 1", "KB v K", true],
    ["8/8/8/4k3/8/8/4KN2/8 w - - 0 1", "KN v K", true],
    ["8/8/3b4/4k3/8/8/4KB2/8 w - - 0 1", "KB v KB, same shade", true],
    ["8/8/2b5/4k3/8/8/4KB2/8 w - - 0 1", "KB v KB, opposite shades", false],
    ["8/8/8/4k3/8/8/3NKN2/8 w - - 0 1", "KNN v K can still mate with help", false],
    ["8/8/8/4k3/8/8/4KP2/8 w - - 0 1", "KP v K", false],
]) check(`insufficient: ${name}`, new ChessGame(fen).pos.dead() === dead);

// Special moves
g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["e1g1"]);
check("castling moves the rook", g.pos.fen().startsWith("r3k2r/8/8/8/8/8/8/R4RK1 b kq"));
g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1", ["e8c8"]);
check("queenside castling, black", g.pos.fen().startsWith("2kr3r/8/8/8/8/8/8/R3K2R w KQ"));
g = new ChessGame("r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1");
check("no castling through attack", !g.legal().some((m) => g.pos.uci(m) === "e1g1"));
g = new ChessGame("r3k2r/8/8/8/1b6/8/8/R3K2R w KQkq - 0 1");
check("queenside: b1 attacked is fine, and check isn't", g.status().check === true);
g = new ChessGame("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1", ["h1h2", "e8e7", "h2h1", "e7e8"]);
check("a rook that left loses the right", !g.legal().some((m) => g.pos.uci(m) === "e1g1") && g.legal().some((m) => g.pos.uci(m) === "e1c1"));
g = new ChessGame("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", ["a1a8"]);
check("capturing a rook removes that right", g.pos.fen().split(" ")[2] === "Kk");
g = new ChessGame(START_FEN, "e2e4 a7a6 e4e5 d7d5".split(" "));
const ep = g.legal().find((m) => g.pos.uci(m) === "e5d6");
check("en passant is offered and flagged", !!ep && mFlag(ep) === 2);
const rec = g.play(ep);
check("en passant removes the right pawn", rec.capturedSq === sqFrom("d5") && g.pos.b[sqFrom("d5")] === 0 && rec.san === "exd6");
g.undo();
check("undo restores it", g.pos.b[sqFrom("d5")] !== 0 && g.pos.b[sqFrom("e5")] !== 0);
g = new ChessGame("8/P6k/8/8/8/8/8/K7 w - - 0 1");
check("four promotion choices", g.legal().filter((m) => g.pos.uci(m).startsWith("a7a8")).length === 4);
g = new ChessGame("r6k/1P6/8/8/8/8/8/K7 w - - 0 1", ["b7a8n"]);
check("capture promotion with underpromotion SAN", g.history[0].san === "bxa8=N");
g = new ChessGame("7k/8/8/8/8/5N2/8/KN1N4 w - - 0 1");
const s = g.legal().find((m) => g.pos.uci(m) === "f3e1");
check("SAN disambiguation", !!s && g.pos.san(s).startsWith("N"));
g = new ChessGame(START_FEN, "e2e4 e7e5 g1f3".split(" "));
const again = new ChessGame(g.startFen, g.ucis());
check("save and restore by replay", again.pos.fen() === g.pos.fen() && again.pos.lo === g.pos.lo);

console.log(fails ? `\n${fails} FAILED` : "\nALL PASS");
process.exit(fails ? 1 : 0);
