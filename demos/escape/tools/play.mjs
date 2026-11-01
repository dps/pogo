// Plays the whole game from a fresh save through the real screen: pans, taps, drags items, and solves every widget with real gestures.
import "../game.js";
import { Rules, CARRIAGES, PUZZLES } from "../rules.js";
const game = globalThis.__pogo, dev = process.argv[2] ?? "phone", I = game.input;
game.resize(dev);
let ticks = 0; const heavy = {}; const realHaptic = game.haptic.bind(game); game.haptic = (k, ...r) => { if (k === "tick") ticks++; const n = typeof k === "string" ? k : "pattern"; heavy[n] = (heavy[n] ?? 0) + 1; return realHaptic(k, ...r); };
const realSfx = game.sfx.bind(game); game.sfx = (s, o) => { if (o?.haptic) heavy[o.haptic] = (heavy[o.haptic] ?? 0) + 1; return realSfx(s, o); };
const step = (n = 1) => game.step(n), last = game.last, st = () => last.stage;
game.restart("title"); step(10);
last.prof = { state: null, night: 1, wrens: [], muted: false, noHaptics: false, highlight: false, finished: 0 };
const tap = (x, y) => { I.pointerEvent("down", 5, x, y); step(1); I.pointerEvent("up", 5, x, y); step(2); };
const drag = (x0, y0, x1, y1, n = 8) => { I.pointerEvent("down", 5, x0, y0); step(1); for (let i = 1; i <= n; i++) { I.pointerEvent("move", 5, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n); step(1); } step(1); I.pointerEvent("move", 5, x1, y1); step(1); I.pointerEvent("up", 5, x1, y1); step(2); };
const v = game.view; tap(v.width / 2, v.height >= v.width ? v.height - v.safe.bottom - 150 : v.height - 74);
step(60);
if (!st()) throw new Error("did not start: " + game.currentName);
const settle = () => { let g = 0; while ((st().fadeTo === 1 || st().fade > 0.05) && g++ < 400) step(1); };
function plan(from) {
    const prev = new Map([[from.key(), null]]), q = [from];
    while (q.length) { const r = q.shift(); if (r.won) { const out = []; for (let k = r.key(); prev.get(k); k = prev.get(k)[0]) out.unshift(prev.get(k)[1]); return out; } for (const a of r.actions()) { const nk = a.next.key(); if (!prev.has(nk)) { prev.set(nk, [r.key(), a.path[0]]); q.push(a.next); } } }
    throw new Error("no route");
}
function reveal(id) {
    const L = st().L;
    for (let g = 0; g < 50; g++) { const p = st().hotScreen(id); const inset = 40; if (p.x > inset && p.x < L.sw - inset) return p; const dx = clamp(L.sw / 2 - p.x, -160, 160); drag(L.sw / 2, L.sh * 0.3, L.sw / 2 + dx, L.sh * 0.3, 6); step(30); }
    throw new Error("cannot reveal " + id);
}
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
function solveOpenPuzzle() {
    let g = 0; const s = st(), id = s.pid, kind = PUZZLES[id].kind;
    while (st().mode === "puzzle" && g++ < 6000) {
        const w = s.w; if (!w) break;
        if (s.solvedNow) { step(3); continue; }
        const m = w.bot();
        if (!m) { step(3); continue; }
        const X = (x) => s.bx + x * s.bs, Y = (y) => s.by + y * s.bs;
        if (m.wait) step(m.wait);
        else if (m.tap) tap(X(m.tap[0]), Y(m.tap[1]));
        else if (m.drag) drag(X(m.drag[0]), Y(m.drag[1]), X(m.drag[2]), Y(m.drag[3]), m.n ?? 8);
        else if (m.hold) { I.pointerEvent("down", 5, X(m.hold[0]), Y(m.hold[1])); step(m.hold[2]); I.pointerEvent("up", 5, X(m.hold[0]), Y(m.hold[1])); step(4); }
    }
    if (st().mode === "puzzle") throw new Error(`stuck in ${id} (${kind}) ${JSON.stringify(s.w?.state?.())}`);
    solvedList.push(id);
}
const MODE = process.env.MODE ?? "drag"; const solvedList = []; let actions = 0;
const log = (m) => { if (process.env.V) console.log(m); };
const closeDoc = () => { let g = 0; while (["doc", "hint", "menu"].includes(st().mode) && g++ < 10) { tap(20, 20); step(4); } };
const handle = () => { closeDoc(); if (st().mode === "puzzle") solveOpenPuzzle(); closeDoc(); settle(); };
let guard = 0;
while (!st().r.won && game.currentName === "play" && guard++ < 800) {
    settle(); step(10);
    const route = plan(st().r.clone()); const a = route[0], [t, x, y] = a.split(":"); actions++; log(`${st().car.id} ${a}`);
    const s = st();
    if (t === "tap") { const p = reveal(x); tap(p.x, p.y); step(2); handle(); }
    else if (t === "use") { const p = reveal(y), sl = s.slotRects().find((q) => q.it === x); if (!sl) throw new Error("no slot " + x); if (MODE === "tap") { tap(sl.x + sl.w / 2, sl.y + sl.h / 2); step(2); tap(p.x, p.y); } else drag(sl.x + sl.w / 2, sl.y + sl.h / 2, p.x, p.y, 10); step(2); handle(); }
    else if (t === "combine") { const A = s.slotRects().find((q) => q.it === x), B = s.slotRects().find((q) => q.it === y); if (MODE === "tap") { tap(A.x + A.w / 2, A.y + A.h / 2); step(2); tap(B.x + B.w / 2, B.y + B.h / 2); } else drag(A.x + A.w / 2, A.y + A.h / 2, B.x + B.w / 2, B.y + B.h / 2, 10); step(2); handle(); }
    if (process.env.RELOAD && actions % 3 === 0) { last.prof = JSON.parse(JSON.stringify(last.prof)); game.go("play"); step(30); }
    if (st().r.key() === undefined) break;
}
const before = game.state().haptics ?? [];
step(120); let g2 = 0;
if (game.currentName === "ending") while (game.ends?.phase !== 3 && g2++ < 200) { tap(v.width / 2, 40); step(100); }
console.log(`[${dev}] won=${st().r.won} ending=${game.ends?.phase === 3} pages=${game.ends?.page + 1} actions=${actions} puzzles=${solvedList.length}`);
step(100);
console.log("after:", game.currentName, "night", last.prof.night, "ticks", ticks, JSON.stringify(heavy));
process.exit(st().r.won && game.ends?.phase === 3 && last.prof.night === 2 ? 0 : 1);
