// Input test on the real scene: swipe is one step, drag from the mole follows the finger, tap walks, undo and restart keys work.
import "../game.js";
const game = globalThis.__pogo, I = game.input;
game.resize("phone");
game.restart("title"); game.step(5);
game.go("play", { id: "a3" }); game.step(40);
const P = game.play, v = P.view, at = () => P.st.p;
const settle = () => { for (let i = 0; i < 60 && (P.busy || P.auto); i++) game.step(1); game.step(6); };
const log = [];
const drag = (x0, y0, x1, y1, n = 8) => { I.pointerEvent("down", 1, x0, y0); game.step(1); for (let i = 1; i <= n; i++) { I.pointerEvent("move", 1, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); game.step(1); } I.pointerEvent("up", 1, x1, y1); game.step(1); settle(); };
const p0 = at();
drag(40, 300, 130, 300); log.push(["swipe right 90px, away from mole", at() - p0]);
const m = v.project(at(), 0.25), t = Math.hypot(v.project(1, 0).x - v.project(0, 0).x, 0);
const p1 = at();
drag(m.x, m.y, m.x - t * 2.2, m.y, 14); log.push(["drag from mole 2.2 tiles left", at() - p1]);
const c = v.project(P.lvl.w * 2 + 5, 0), p2 = at(); I.tap(c.x, c.y); settle(); for (let i = 0; i < 40; i++) game.step(1);
log.push(["tap far cell", p2, "->", at(), "wanted", P.lvl.w * 2 + 5]);
const push0 = game.data.pushes;
P.tryMove(0); settle(); for (const d of [0, 1, 2, 3]) if (game.data.pushes === push0) { P.tryMove(d); settle(); }
const pushed = game.data.pushes;
I.press("undo", 1); game.step(3);
log.push(["undo key", pushed, "->", game.data.pushes]);
P.tryMove(1); settle();
I.press("reset", 1); game.step(3);
log.push(["restart key at", at(), "start", P.lvl.player]);
for (const l of log) console.log(...l);
