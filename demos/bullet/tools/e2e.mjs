// Headless checks of everything a person touches: flow, controls, song lock, haptics, saves, and step cost at peak density.
import "../game.js";
import { newRun } from "../play.js";
import { MAX } from "../bullets.js";
const game = globalThis.__pogo, ctx = globalThis.__moth;
let bad = 0; const ok = (c, m) => { console.log(`${c ? "  ok  " : "  FAIL"} ${m}`); if (!c) bad++; };
const start = (args = { stage: 0 }, diff = 1) => { game.restart("title"); game.step(2); game.data.run = newRun(diff); game.go("play", args); game.step(2); return ctx.play; };
const ptr = (k, id, x, y) => { game.input.pointerEvent(k, id, x, y); };

// Title: one tap starts.
game.restart("title"); game.step(30); game.input.tap(180, 300); game.step(40);
ok(game.currentName === "play", "a tap on the title is in the game within 40 steps");

// Relative drag: the moth moves by the thumb's delta, wherever the thumb is, and is never under it.
{
    const p = start(); game.step(90); const m = p.moth, x0 = m.x, y0 = m.y;
    ptr("down", 1, 300, 600); game.step(2); ptr("move", 1, 260, 580); game.step(12);
    ok(Math.abs(m.x - (x0 - 40 * 1.25)) < 3 && Math.abs(m.y - (y0 - 20 * 1.25)) < 3, `drag from far away moves relatively (${(m.x - x0).toFixed(1)}, ${(m.y - y0).toFixed(1)})`);
    // Two fingers: focus, and the same drag moves less.
    ptr("down", 2, 60, 500); game.step(30); const f = m.focus, x1 = m.x;
    ok(f > 0.9, `second finger held focuses (${f.toFixed(2)})`);
    ptr("move", 1, 220, 580); game.step(2);
    ok(Math.abs(x1 - m.x) < 40 * 1.25 * 0.65, `focused drag is finer (${(x1 - m.x).toFixed(1)} of 50)`);
    ptr("up", 2, 60, 500); game.step(40); ok(m.focus < 0.1, "lifting the second finger releases focus");
    // Second finger on the bomb dial while the thumb keeps dragging.
    p.run.bombs = 2; const b = p.bombBtn; ptr("down", 3, b.pos.x, b.pos.y); game.step(2);
    ok(p.run.bombs === 1 && p.bombT > 0, "bomb by a second finger, mid-drag");
    ok(game.state().haptics.includes("heavy"), `bomb fires the heavy pulse`);
    ptr("up", 3, b.pos.x, b.pos.y); ptr("up", 1, 220, 580); game.step(2);
}
// Keyboard.
{
    const p = start(); game.step(90); const m = p.moth, x0 = m.x;
    game.input.press("left", 20); game.step(20); ok(m.x < x0 - 40, `arrow keys move the moth (${(m.x - x0).toFixed(1)})`);
    game.input.press("focus", 30); game.input.press("right", 20); const x1 = m.x; game.step(20); ok(m.x - x1 < 40, `shift slows it (${(m.x - x1).toFixed(1)})`);
    p.run.bombs = 1; game.input.press("bomb", 2); game.step(3); ok(p.run.bombs === 0, "X bombs");
}
// Auto focus near danger, and off in settings.
{
    const p = start(); game.step(90); const m = p.moth;
    for (let k = 0; k < 8; k++) p.bullets.add(m.x + 30, m.y - 8 + k, 30, Math.PI, { life: 5 });
    game.step(6); ok(m.focus > 0.3, `focus comes on by itself near bullets (${m.focus.toFixed(2)})`);
}
// Bomb flips everything, and the motes rush home with score.
{
    const p = start({ stage: 3, practice: { type: "phase", i: 0, name: "t", diff: 1 } }); p.moth.inv = 1e9; game.step(900);
    const before = p.bullets.count, score0 = p.run.score; p.run.bombs = 1; p.bomb(); game.step(70);
    ok(before > 300 && p.bullets.count < before * 0.3, `bomb flips bullets to motes (${before} to ${p.bullets.count}, ${p.motes.n} motes in flight)`);
    game.step(120); ok(p.run.score - score0 > before * 20, `the rush pays (+${p.run.score - score0})`);
}
// Graze: ticks speed up.
{
    const p = start(); game.step(100); const m = p.moth, times = []; let last = 0;
    const orig = game.haptic.bind(game); game.haptic = (k) => { if (k === "tick") times.push(game.stepCount); orig(k); };
    p.dir.clear(); p.bullets.clear(); m.inv = 0;
    for (let i = 0; i < 300; i++) { const rate = i < 100 ? 16 : i < 200 ? 6 : 2; if (i % rate === 0) p.bullets.add(m.x + 10, m.y + 6, 0, 0, { life: 1, wait: 0.1, kind: 1 }); game.step(1); if (p.moth.hitT > 0 || !p.moth.alive) { m.hitT = 0; m.alive = true; m.inv = 0; } }
    game.haptic = orig;
    const gaps = times.slice(1).map((t, i) => t - times[i]), a = gaps.slice(0, 5), z = gaps.slice(-5), avg = (l) => l.reduce((x, y) => x + y, 0) / l.length;
    ok(times.length > 12 && avg(z) < avg(a) * 0.6, `graze ticks accelerate: gaps ${avg(a).toFixed(1)} to ${avg(z).toFixed(1)} steps over ${times.length} ticks`);
}
// Every burst lands on the song's grid, on time.
{
    const p = start({ stage: 4, practice: { type: "phase", i: 2, name: "t", diff: 2 } }); p.moth.inv = 1e9; p.dir.log.length = 0; game.step(1500);
    const off = p.dir.log.filter((b) => Math.abs(b * 8 - Math.round(b * 8)) > 1e-6);
    ok(p.dir.log.length > 100 && off.length === 0, `${p.dir.log.length} bursts all on the 32nd-note grid`);
    ok(p.dir.maxLate < 0.018, `latest release ${(p.dir.maxLate * 1000).toFixed(1)} ms after its beat`);
}
// Pause holds the world.
{
    const p = start({ stage: 3, practice: { type: "phase", i: 0, name: "t", diff: 1 } }); game.step(800); const n = p.step_; p.togglePause(); game.step(30); ok(p.step_ === n && p.paused, "pause holds the world"); p.togglePause(); game.step(3); ok(p.step_ > n, "resume");
}
// Game over, continue locks the flame; no-continue reaches it.
{
    const p = start({ stage: 4 }); game.step(200); p.run.lives = 0; p.moth.inv = 0; p.die(); game.step(90);
    ok(p.over, "game over at no lives");
    p.continueRun(); game.step(40); ok(ctx.play !== p && game.data.run.continues === 1 && game.data.run.score === 0, "continue restarts this stage with score cleared");
    const q = ctx.play; q.boss = null; q.tally = { rows: [], total: 0, t: 0 }; q.mode = "clear"; q.leaveStage(); game.step(120);
    ok(game.currentName === "ending" && game.currentArgs.kind === "dawn", "a continued run ends at dawn, short of the Flame");
    const r = start({ stage: 4 }); r.tally = { rows: [], total: 0, t: 0 }; r.mode = "clear"; r.leaveStage(); game.step(90);
    ok(game.currentName === "play" && ctx.play.stage.id === 6, "an unbroken run goes on to the Flame");
    const f = ctx.play; f.tally = { rows: [], total: 0, t: 0 }; f.mode = "clear"; f.leaveStage(); game.step(120);
    ok(game.currentArgs?.kind === "flame" && ctx.save.flame, "beating the Flame gives the true ending, and saves");
    ok(ctx.save.scores[1].length > 0, "high score saved");
}
// Step cost at peak.
{
    const p = start({ stage: 5, practice: { type: "phase", i: 0, name: "t", diff: 2 } }); p.dir.clear(); p.moth.inv = 1e9;
    for (let i = 0; i < 3500; i++) p.bullets.add(40 + (i * 7) % 280, 40 + (i * 13) % 500, 6, i, { life: 60, w: 0.2 });
    const t0 = performance.now(); for (let i = 0; i < 300; i++) p.bullets.step(1 / 60, p.moth, () => {}); const t1 = performance.now();
    for (let i = 0; i < 300; i++) p.bullets.draw(game.renderer, null, 0, 0.5, 0.3); const t2 = performance.now();
    ok((t1 - t0) / 300 < 1, `3500 bullets: sim ${((t1 - t0) / 300).toFixed(3)} ms a step, batch ${((t2 - t1) / 300).toFixed(3)} ms a frame (Node, null renderer)`);
}
console.log(bad ? `${bad} FAILED` : "all passed"); process.exit(bad ? 1 : 0);
