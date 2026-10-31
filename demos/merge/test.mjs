// Smoke test of the real input paths, headless. Run: node test.mjs
import assert from "node:assert";
import "./game.js";
const game = globalThis.__pogo;
const find = (name) => game.current.entities.find((e) => e.name === name);
const tapE = (name) => { const p = find(name).pos; game.input.tap(p.x, p.y); game.step(2); };
game.resize("phone"); game.input.touchMode = true;
game.restart("title"); game.step(30);
tapE("Play"); game.step(40);
assert.equal(game.currentName, "play");
let sim = game.sim;
const v = game.view;
const ax = v.width * 0.25, ay = v.height * 0.4;
game.input.drag(v.width / 2, ay, ax, ay); game.step(3);
assert.equal(sim.bodies.length, 1, "drag then release drops one piece");
const expected = (ax - 0) ; void expected;
assert.ok(sim.bodies[0].x < 150, `dropped on the left, got ${sim.bodies[0].x}`);
game.step(60);
const x0 = sim.aim;
game.input.press("right", 30); game.step(32);
assert.ok(sim.aim > x0 + 60, "right arrow moves the aim");
game.input.press("jump", 2); game.step(3);
assert.equal(sim.bodies.length, 2, "space drops");
game.step(60);
const c = sim.snores;
tapE("Snore");
assert.equal(sim.snores, c - 1, "snore spends a charge");
tapE("Menu"); assert.equal(game.current.paused, true, "menu pauses");
tapE("Resume"); assert.equal(game.current.paused, false, "resume");
game.step(120);
// merging: two the same, side by side
const a = sim.add("c", 1, 100, 300, 16), b = sim.add("c", 1, 128, 300, 16);
void a; void b;
game.step(90);
assert.ok(sim.merges >= 1 && sim.made[2] >= 1, "two the same snuggle");
// overflow ends the game, then Again restarts it
for (let i = 0; i < 40; i++) sim.add("snow", -2, 55 + (i % 3) * 95, 340 - Math.floor(i / 3) * 100, 45);
game.step(60 * 12);
assert.ok(sim.over, "overflow ends the game");
game.step(120);
assert.ok(game.data.gameOver);
const was = game.sim;
tapE("Again"); game.step(40);
assert.notEqual(game.sim, was, "Again starts a fresh game");
// daily: same seed, same pieces
game.go("play", { mode: "daily" }); game.step(40);
const q1 = [...game.sim.queue]; game.go("play", { mode: "daily" }); game.step(40);
assert.deepEqual(game.sim.queue, q1);
for (const d of ["phone-small", "phone-landscape", "tablet", "desktop"]) { game.resize(d); game.restart("title"); game.step(5); assert.deepEqual(game.audit().filter((i) => i.severity === "error"), []); }
// determinism: same seed and aims give the same game
function run() { game.resize("phone"); game.go("play", { seed: 42 }); game.step(3); const s = game.sim; for (let i = 0; i < 40; i++) { s.aim = 30 + (i * 37) % 240; s.wantDrop = true; game.step(70); } return [s.score, s.bodies.length, s.bodies.reduce((p, x) => p + x.x, 0)]; }
assert.deepEqual(run(), run());
console.log("ok", JSON.stringify(game.state().data));
process.exit(0);
