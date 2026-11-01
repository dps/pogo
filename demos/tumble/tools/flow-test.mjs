// Menus, keyboard, pause, settings, save and the sandbox, driven through real input in headless.
import "../game.js";
const game = globalThis.__pogo;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const run = (n) => game.step(n);
const named = (t) => game.current.entities.find((e) => e.buttonLabel === t);
const tap = (e) => { const p = e.pos; game.input.tap(p.x, p.y); run(3); };
game.step(30);
ok(game.state().scene === "title", "title first");
tap(named("Sandbox")); run(30);
ok(game.state().scene === "title", "sandbox is locked at first");
tap(named("PLAY")); run(40);
ok(game.state().scene === "play" && game.tumble.level.index === 0, "PLAY starts castle 1");
const T = game.tumble;
run(100);
ok(T.ready(), "ready after the intro");
game.input.press("up", 20); game.input.press("right", 10); run(24);
ok(T.stage.aiming, "keyboard aims");
game.input.press("fire", 1); run(4);
ok(T.sim.fired === 1, "keyboard fires");
for (let i = 0; i < 60 && T.sim.state === "flight"; i++) run(10);
// Pause
tap(named("II")); run(4);
ok(game.current.paused, "pause opens");
tap(named("Resume")); run(4);
ok(!game.current.paused, "resume closes");
// Win by hand and check the save and the panel.
T.sim.defenders.slice().forEach((d) => T.sim.hurtDefender(d, 9));
for (let i = 0; i < 80 && !T.panel(); i++) run(10);
ok(T.panel(), "end panel appears");
run(120);
ok(game.data.lastStars >= 1, `stars awarded: ${game.data.lastStars}`);
tap(named("Next Castle")); run(50);
ok(game.tumble.level.index === 1, "Next Castle moves on");
// Map
game.go("map", { world: 0 }); run(30);
ok(game.state().scene === "map", "map opens");
game.input.press("right", 2); run(6);
// Sandbox unlocked by the first boss
game.go("play", { level: 4 }); run(120);
{
    const G = game.tumble; G.sim.defenders.slice().forEach((d) => G.sim.hurtDefender(d, 99));
    for (let i = 0; i < 80 && !G.panel(); i++) run(10);
}
game.go("title"); run(30);
tap(named("Sandbox")); run(40);
ok(game.tumble?.sim.mode === "sandbox", "beating the first boss unlocks the sandbox");
const B = game.tumble, n0 = B.sim.parts.length;
game.input.tap(200, 300); run(6);
ok(B.sim.parts.length === n0 + 1, "sandbox tap drops a block");
const fire = game.current.entities.find((e) => e.name === "ammo-rock"); tap(fire);
game.input.pointerEvent("down", 7, 240, 300); run(3); game.input.pointerEvent("move", 7, 150, 330); run(4); game.input.pointerEvent("up", 7, 150, 330); run(4);
ok(B.sim.fired === 1, "sandbox fires");
ok(game.audit().filter((a) => a.level === "error").length === 0, "audit clean");
