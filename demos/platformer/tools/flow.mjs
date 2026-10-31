// Plays the game's menus and controls the way a phone does: real tap and drag events, no shortcuts.
import { DT, F, TILE } from "../physics.js";
import { SONGS } from "../sound.js";
import { noteFreq } from "../pogo.js";
import "../game.js";
const game = globalThis.__pogo;
let fails = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails++; };

for (const [n, s] of Object.entries(SONGS)) {
    let lens = new Set();
    for (const t of s.tracks) { const notes = t.notes.trim().split(/\s+/); notes.forEach((x) => x === "-" || noteFreq(x)); lens.add(notes.length); }
    const max = Math.max(...lens);
    ok([...lens].every((l) => max % l === 0), `song ${n}: tracks line up (${[...lens].join("/")} steps)`);
}

for (const dev of ["phone", "phone-landscape"]) {
    game.resize(dev); game.input.touchMode = true; game.restart("title"); game.step(5);
    const v = () => game.view;
    game.input.tap(v().width / 2, v().height / 2); game.step(50);
    ok(game.currentName === "map", `${dev}: tap on title opens the map`);
    const b = game.current.first("playLevel");
    game.input.tap(b.pos.x, b.pos.y); game.step(50);
    ok(game.currentName === "play", `${dev}: PLAY button starts the level`);
    const W = globalThis.__pp, H = W.H;
    // A clear lane, so this measures the controls rather than a fight with a sog.
    W.R.next = W.R.spawns.length; W.R.actors.forEach((a) => { a.dead = true; a.e?.destroy(); }); W.R.pipes.length = 0;
    for (let r = 9; r < 13; r++) for (let c = 0; c < 62; c++) W.R.T[r * W.R.w + c] = 0;
    // Drag the stick: partway walks, all the way runs.
    const hx = game.touch.stickHome();
    game.input.pointerEvent("down", 1, hx.x, hx.y); game.step(1);
    game.input.pointerEvent("move", 1, hx.x + 30 / v().scale, hx.y); game.step(50);
    ok(Math.abs(H.vx - F.WALK) < 2, `${dev}: half stick walks at ${H.vx.toFixed(0)}`);
    game.input.pointerEvent("move", 1, hx.x + 52 / v().scale, hx.y); game.step(60);
    ok(H.vx > F.RUN - 2, `${dev}: full stick runs at ${H.vx.toFixed(0)}`);
    // Screen position must not jitter at a steady run.
    const scr = [];
    for (let i = 0; i < 40; i++) { game.step(1); scr.push(game.current.cam.toView([H.x, H.y]).x); }
    const steps = scr.slice(1).map((x, i) => Math.abs(x - scr[i]));
    ok(Math.max(...steps) < 0.6, `${dev}: hero's on-screen step at full run is ${Math.max(...steps).toFixed(3)} view units`);
    game.input.pointerEvent("up", 1, hx.x, hx.y); game.step(1);
    const j = game.touch.layout().find((x) => x.action === "jump");
    game.input.pointerEvent("down", 2, j.x, j.y); game.step(4);
    ok(H.vy < 0 && !H.grounded, `${dev}: JUMP button jumps`);
    game.input.pointerEvent("up", 2, j.x, j.y); game.step(60);
    const p = game.current.first("pause");
    game.input.tap(p.pos.x, p.pos.y); game.step(2);
    ok(game.current.paused, `${dev}: pause button pauses`);
    const q = game.current.first("menu2");
    game.input.tap(q.pos.x, q.pos.y); game.step(40);
    ok(game.currentName === "map", `${dev}: quit from pause reaches the map`);
    ok(game.touch.buttons.length === 0, `${dev}: no touch controls on the map`);
}
// Death, lives, game over, and save data.
game.resize("phone-landscape"); game.restart("title"); game.step(2);
const d = game.data;
d.lives = 2; game.go("play", { level: 0 }); game.step(2);
for (let n = 0; n < 2; n++) { const W = globalThis.__pp; W.H.y = 900; game.step(130); }
ok(globalThis.__pp.over, "falling twice on 2 lives shows game over");
game.step(90); game.input.tap(100, 100); game.step(60);
ok(game.currentName === "map" && game.data.lives === 5, "game over tap returns to the map with fresh lives");
// A checkpoint survives death.
game.go("play", { level: 0 }); game.step(3);
{ const W = globalThis.__pp; W.H.x = 88 * TILE; game.step(3); ok(W.checkAt?.x > 0, "checkpoint registers");
  W.H.x = 95 * TILE; W.H.y = 900; game.step(140); const N = globalThis.__pp; ok(N !== W && Math.abs(N.H.x - W.checkAt.x) < 60, "death respawns at the checkpoint"); }
// Power cycle through real pickups and real hits.
game.go("play", { level: 0 }); game.step(3);
{ const W = globalThis.__pp, H = W.H;
  W.R.next = W.R.spawns.length;
  ok(H.h === 14, "starts small");
  const give = (kind) => { const a = W.R.actors; a.length = 0; W.spawnItem(kind, H.x, H.y); game.step(45); };
  give("sunberry"); ok(H.h === 25 && H.form === 1, "sunberry makes Pip big");
  give("zapple"); ok(H.form === 2, "zapple gives zap");
  game.input.press("fire", 1); game.step(2); ok(W.shots.length === 1, "fire throws a zap");
  const spike = () => { H.inv = 0; const i = Math.floor(H.y / TILE) * W.R.w + Math.floor(H.x / TILE); W.R.T[i] = 9; game.step(2); W.R.T[i] = 0; game.step(30); };
  spike(); ok(H.form === 1 && H.state === "play", "a hit takes zap away");
  spike(); ok(H.form === 0 && H.h === 14 && H.state === "play", "a hit shrinks, doesn't kill");
  spike(); ok(H.state === "dead", "a hit while small kills");
}
console.log(fails ? `\n${fails} FAILED` : "\nall flow checks passed");
process.exit(fails ? 1 : 0);
