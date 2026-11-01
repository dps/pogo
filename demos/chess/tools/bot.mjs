// Plays through the real input path: pointer down, move, up on projected squares. Node, no browser.
import "../game.js";
import { Search, sqFrom, ChessGame } from "../engine.js";
const game = globalThis.__pogo;
const fails = [];
const ok = (name, cond, extra = "") => { console.log(`${cond ? "ok  " : "FAIL"} ${name} ${extra}`); if (!cond) fails.push(name); };
const C = () => globalThis.__chess;
const data = () => game.data;
const steps = (n) => { for (let i = 0; i < n; i++) game.step(1); };
const until = (fn, max = 3000) => { for (let i = 0; i < max; i++) { if (fn()) return true; game.step(1); } return fn(); };
const at = (name) => { const sq = sqFrom(name), w = C().world; const p = w.s.cam3; p.update(1); return w.project(w.pieceAt(sq) ? w.pieceAt(sq).x : (sq & 7) - 3.5, 0.12, 3.5 - (sq >> 4)); };
let id = 1;
const down = (x, y) => { game.input.pointerEvent("down", id, x, y); game.step(1); };
const moveTo = (x, y) => { game.input.pointerEvent("move", id, x, y); game.step(1); };
const up = (x, y) => { game.input.pointerEvent("up", id, x, y); game.step(1); id++; };
function dragMove(a, b) {
    const p = at(a), q = at(b);
    down(p.x, p.y); steps(6);
    const off = game.input.touchMode ? 44 : 0; // on touch the target rides above the thumb
    for (let i = 1; i <= 8; i++) moveTo(p.x + (q.x - p.x) * i / 8, p.y + (q.y + off - p.y) * i / 8);
    for (let i = 0; i < 26; i++) moveTo(q.x, q.y + off);
    up(q.x, q.y + off);
}
const idle = () => until(() => !data().busy && !data().thinking && data().phase !== "over" ? true : data().phase === "over", 4000);
function fresh(args) {
    game.save("lamplight.game", null);
    game.restart("table", args);
    game.input.touchMode = false;
    steps(100);
}
const humanTurn = (w) => (data().fen.split(" ")[1] === "w") === (w === "w");

// Title to first move with one touch.
fresh();
ok("starts on the title", data().phase === "title" && data().panel === "title");
game.save("lamplight.profile", null);
fresh();
{
    const p = at("e2");
    down(p.x, p.y);
    ok("touching a piece on the title starts a game", data().phase === "play");
    steps(12);
    const held = C().G.held?.p;
    ok("the piece rises when pressed", held && held.y > 0.3, `y=${held?.y.toFixed(2)}`);
    ok("legal squares glow", C().world.marks.filter((m) => m.want > 0).length === 2);
    const q = at("e4");
    const before = game.state().haptics.length;
    for (let i = 1; i <= 10; i++) moveTo(p.x + (q.x - p.x) * i / 10, p.y + (q.y - p.y) * i / 10);
    steps(4);
    ok("square ticks while dragging", game.state().haptics.length > before, game.state().haptics.slice(-4).join(","));
    up(q.x, q.y);
    steps(50);
    ok("drag-drop played e4", data().ply >= 1 && data().fen.startsWith("rnbqkbnr/pppppppp/8/8/4P3") || data().ply === 2, data().fen);
    idle();
    ok("the AI replied", data().ply === 2);
}
// Lag: the heavy king trails more than a pawn.
fresh({ mode: "two" }); idle();
{
    const follow = (name) => {
        const a = at(name), w = C().world, piece = w.pieceAt(sqFrom(name));
        down(a.x, a.y); steps(10);
        const y0 = piece.z;
        for (let i = 1; i <= 12; i++) moveTo(a.x, a.y - i * 3);
        const lag = Math.abs(piece.gz - piece.z);
        up(a.x, a.y); steps(40);
        y0;
        return lag;
    };
    const pawn = follow("a2"), knight = follow("g1");
    ok("heavier pieces lag more", knight > pawn, `pawn ${pawn.toFixed(3)} knight ${knight.toFixed(3)}`);
}
// Tap to select, tap to move, and tap to cancel.
fresh({ mode: "two" }); idle();
{
    const p = at("g1"), q = at("f3");
    game.input.tap(p.x, p.y); steps(10);
    ok("tap selects", C().G.sel?.type === "n" && C().G.sel.mode === "hover");
    game.input.tap(q.x, q.y); steps(60);
    ok("tap moves", data().fen.includes("5N2"));
    const top = (n) => { const pc = C().world.pieceAt(sqFrom(n)); return C().world.project(pc.x, pc.feel.h * 0.8, pc.z); };
    const a = top("b8"); game.input.tap(a.x, a.y); steps(10);
    ok("next player's tap selects", C().G.sel?.type === "n");
    const b = top("b8"); game.input.tap(b.x, b.y); steps(70);
    ok("tap again puts it down", !C().G.sel && C().world.pieces.find((x) => x.sq === sqFrom("b8")).y === 0, `${C().G.sel?.type} ${C().world.pieces.find((x) => x.sq === sqFrom("b8")).y}`);
}
// Capture, tray, undo.
const load = (fen, side = "w", mode = "two") => { C().c.setup.autoTurn = false; C().begin({ mode, level: 0, side, fen, animate: false }); C().world.yaw = C().world.yawGoal; steps(50); };
fresh({ mode: "two" }); idle();
load("4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1");
{
    const before = game.state().haptics.length;
    dragMove("e4", "d5");
    const v = C().world.pieces.find((x) => x.type === "p" && x.side === "b" && x.sq < 0 && x.mode !== "rest");
    ok("victim left the board", !!v, v?.mode);
    steps(120);
    ok("victim lies in the tray", C().world.pieces.some((x) => x.side === "b" && x.type === "p" && x.mode === "tray"));
    ok("capture had heavy feedback", game.state().haptics.slice(-10).some((h) => /medium|heavy/.test(h)), game.state().haptics.slice(-10).join(","));
    C().hud.c.undo(); steps(80);
    const back = C().world.pieces.find((x) => x.sq === sqFrom("d5"));
    ok("undo brings it back", back?.side === "b" && back.mode === "rest", back?.mode);
}
// Castling, en passant and promotion through the pointer.
load("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
dragMove("e1", "g1"); steps(70);
ok("castling by drag moves the rook too", C().world.pieceAt(sqFrom("f1"))?.type === "r" && data().fen.includes("R4RK1"));
load("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
dragMove("e5", "d6"); steps(70);
ok("en passant by drag", data().fen.startsWith("4k3/8/3P4/8/8/8/8/4K3") && C().world.pieces.some((x) => x.type === "p" && x.side === "b" && x.sq < 0 && x.mode !== "rest" || x.type === "p" && x.side === "b" && x.mode === "tray"));
load("8/P6k/8/8/8/8/8/K7 w - - 0 1");
dragMove("a7", "a8"); steps(12);
ok("promotion asks", data().phase === "promo" && C().G.promo.picks.length === 4, `${data().phase} ${data().fen} ${C().G.sel?.type} ${C().G.hover}`);
{
    const pick = C().G.promo.picks[1], p = C().world.project(pick.e.pos.x, 0.9, pick.e.pos.z);
    game.input.tap(p.x, p.y); steps(70);
    ok("promotion to the tapped piece (rook)", data().fen.startsWith("R7/"), data().fen);
    ok("the piece became a rook", C().world.pieceAt(sqFrom("a8"))?.type === "r");
}
// Endings, as two players.
const finishes = [
    ["checkmate", "5k2/8/5K2/8/8/8/8/R7 w - - 0 1", "a1a8", "checkmate", "white"],
    ["stalemate", "7k/8/5K2/6Q1/8/8/8/8 w - - 0 1", "g5g6", "stalemate", "draw"],
    ["insufficient", "4k3/8/8/8/8/8/3p4/4K3 w - - 0 1", "e1d2", "insufficient material", "draw"],
    ["fifty", "8/8/8/4k3/8/8/4K2R/8 w - - 99 80", "h2h3", "fifty-move rule", "draw"],
];
for (const [name, fen, mv, reason, winner] of finishes) {
    load(fen);
    dragMove(mv.slice(0, 2), mv.slice(2));
    until(() => data().panel === "over", 1400);
    ok(`${name} ends the game with a panel`, data().result === reason && data().winner === winner && data().panel === "over", `${data().result}`);
}
load("7k/8/8/8/8/8/8/KQ6 w - - 0 1");
for (const m of ["b1c1", "h8g8", "c1b1", "g8h8", "b1c1", "h8g8", "c1b1", "g8h8"]) { dragMove(m.slice(0, 2), m.slice(2)); idle(); steps(50); }
until(() => data().panel === "over", 500);
ok("threefold by real moves", data().result === "threefold repetition", data().result);
// Clock.
fresh({ mode: "two" }); idle();
C().begin({ mode: "two", clock: { w: 1, b: 1 }, clockIdx: 3, moves: ["e2e4"], animate: false }); steps(50);
until(() => data().phase === "over", 200);
ok("flag fall ends the game", data().result === "time" && data().winner === "white", `${data().result} ${data().winner}`);
// Save and resume.
fresh({ mode: "ai", level: 0 }); idle();
dragMove("d2", "d4"); idle();
const saved = data().fen;
game.restart("table", {}); steps(30);
ok("a game in progress is offered", C().c.hasSave() && data().phase === "title");
C().c.quickPlay(); idle(); steps(30);
ok("resume restores the position", data().fen === saved && C().world.pieces.filter((p) => p.sq >= 0).length === 32);

// Resign, take back after mate, playing black, keyboard, hint, settings.
fresh({ mode: "ai", level: 0 }); idle();
C().c.resign(); until(() => data().panel === "over", 300);
ok("resigning ends the game", data().result === "resignation" && data().winner === "black", `${data().result}`);
fresh({ mode: "ai", level: 0 }); idle();
C().begin({ mode: "ai", level: 0, side: "b", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", animate: false });
steps(10); until(() => data().phase === "over" || (data().ply > 0 && !data().busy), 400);
fresh({ mode: "ai", level: 5 }); idle();
C().begin({ mode: "ai", level: 5, side: "b", animate: false }); C().world.yaw = C().world.yawGoal;
ok("seat follows side", C().c.seatSide() === "b");
until(() => data().ply === 1 && !data().busy, 900);
ok("as black, the engine opens", data().ply === 1);
{
    dragMove("e7", "e5"); idle();
    ok("drag works from black's seat", data().ply >= 2, data().fen);
}
fresh({ mode: "ai", level: 0 }); idle();
C().begin({ mode: "ai", level: 0, side: "w", fen: "r5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1", animate: false }); C().world.yaw = C().world.yawGoal;
until(() => data().phase === "over" || data().ply > 0, 600);
fresh({ mode: "two" }); idle();
C().c.setup.autoTurn = false;
C().begin({ mode: "two", fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1", animate: false }); steps(50);
dragMove("a1", "a8"); until(() => data().panel === "over", 1400);
C().hud.c.undo(); steps(100);
ok("undo after mate stands the king up", data().phase === "play" && data().ply === 0 && C().world.pieces.find((p) => p.type === "k" && p.side === "b").mode === "rest" && Math.abs(C().world.pieces.find((p) => p.type === "k" && p.side === "b").tiltX) < 0.05);
fresh({ mode: "ai", level: 0 }); idle();
C().hud.c.hint(); steps(2); until(() => !data().thinking, 600); steps(5);
ok("hint marks a move", C().world.hintA.want > 0 && C().world.hintB.want > 0);
game.input.press("right", 2); steps(4); game.input.press("confirm", 2); steps(8);
ok("keyboard selects", !!C().G.sel, C().G.sel?.type);
game.input.press("up", 2); steps(4); game.input.press("confirm", 2); steps(60);
ok("keyboard moves", data().ply >= 1, data().fen);
for (const k of ["sound", "music", "haptics", "mirror"]) { C().c.toggle(k); C().c.toggle(k); }
{
    const prof = game.load("lamplight.profile", {});
    game.save("lamplight.profile", { ...prof, wins: { pip: 1, odile: 1, vicar: 1, captain: 1, quill: 1 } });
    game.restart("table", {}); steps(20);
    C().c.nextSet(); steps(5);
    ok("sets change when unlocked", C().c.settings.set === "garnet", C().c.settings.set);
    game.render();
    C().c.nextSet(); C().c.nextSet(); steps(5);
    ok("sets cycle", C().c.settings.set === "classic", C().c.settings.set);
    game.save("lamplight.profile", prof);
}

// Whole games through the UI, one against each member, the bot playing a strong engine.
const engine = new Search(18);
const pickMove = () => {
    const chess = C().chess;
    engine.start(chess.startFen, chess.ucis(), { maxNodes: 70000 }); engine.run();
    return engine.result.move;
};
const results = [];
for (let level = 0; level < (process.env.QUICK ? 0 : 6); level++) {
    game.save("lamplight.game", null);
    game.restart("table", { mode: "ai", level }, { seed: 100 + level });
    game.input.touchMode = false;
    C().c.setup.side = "w";
    steps(100);
    idle();
    let guard = 0;
    while (data().phase === "play" && guard++ < 220) {
        if (!humanTurn(C().G.humanSide) || data().busy || data().thinking) { game.step(1); continue; }
        const m = pickMove();
        dragMove(m.slice(0, 2), m.slice(2, 4));
        if (data().phase === "promo") { const pk = C().G.promo.picks[0], p = C().world.project(pk.e.pos.x, 0.9, pk.e.pos.z); game.input.tap(p.x, p.y); steps(2); }
        steps(60);
        idle();
    }
    until(() => data().panel === "over", 900);
    results.push(`${level}:${data().winner ?? "unfinished"}/${data().result} (${data().ply} plies)`);
    ok(`game against ${C().c.opponent().name} reached an ending`, data().panel === "over", results[results.length - 1]);
    if (game.errors.length) ok("no errors", false, String(game.errors[0]));
}
if (!process.env.QUICK) ok("beaten members are saved", Object.keys(game.load("lamplight.profile", {}).wins ?? {}).length > 0, JSON.stringify(game.load("lamplight.profile", {}).wins));
{
    // Next button on a win.
    const r = game.state();
    ok("no runtime errors", r.errors.length === 0, r.errors[0] ?? "");
}
console.log(fails.length ? `\n${fails.length} FAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
