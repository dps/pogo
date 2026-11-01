// The unhappy paths through real scenes: undo, death, take-it-back, abilities, postcards, pause, recap, restart.
import "../game.js";
const game = globalThis.__pogo, ctx = game.crypt;
const { newRun } = await import("../run.js");
const assert = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };
const tap = (name) => { const e = game.current.entities.find((q) => q.alive && q.btn && q.name === name && !q.hidden); if (!e) return false; game.input.tap(e.pos.x, e.pos.y); game.step(2); return true; };
const idle = () => { for (let i = 0; i < 300 && ctx.state.floor.stage.busy; i++) game.step(1); game.step(2); };
const start = (keeper, floor = 0) => { game.restart("title"); game.step(3); newRun(game, { seed: 4242, keeper }); game.data.run.floor = floor; game.go("play"); for (let i = 0; i < 2000 && !(ctx.state.floor?.stage?.s === game.current); i++) game.step(1); game.step(2); return ctx.state.floor; };
let f = start("mort");
const p0 = f.state[0];
game.input.press("up", 1); game.step(2); idle();
assert(f.state[0] !== p0, "move by key");
tap("undo"); idle();
assert(f.state[0] === p0, "undo restores the position");
game.input.press("up", 1); game.step(2); idle();
const p1 = f.state[0]; tap("undo"); idle();
assert(f.state[0] === p1, "only one undo per floor");
// Pause, toggles, resume
tap("settings"); game.step(2); assert(f.mode === "pause", "pause opens");
const before = game.audio.muted; tap("sound"); game.step(2); assert(game.audio.muted !== before, "sound toggle"); tap("sound"); game.step(2);
const hb = game.haptics.enabled; tap("haptic"); game.step(2); assert(game.haptics.enabled !== hb, "haptic toggle"); tap("haptic"); game.step(2);
tap("resume"); game.step(2); assert(f.mode === "play", "resume");
// Death, take it back, die again, recap
f = start("mort"); f.state[1] = 1;
for (let i = 0; i < 8 && f.mode === "play"; i++) { f.act(4); idle(); }
assert(f.mode === "dead", "dies at zero hearts");
assert(game.state, "state");
const took = tap("takeback"); idle(); assert(took && f.mode === "play", "take it back after death");
for (let i = 0; i < 8 && f.mode === "play"; i++) { f.act(4); idle(); }
assert(f.mode === "dead", "dies again");
assert(!tap("takeback"), "no second take-back");
tap("snaps"); for (let i = 0; i < 120 && game.currentName !== "recap"; i++) game.step(1);
assert(game.currentName === "recap", "death goes to snaps");
assert(game.data.run.snaps.length >= 2, "snaps taken: " + game.data.run.snaps.map((s) => s.kind));
for (let i = 0; i < 10 && tap("nextsnap"); i++) game.step(20);
game.step(30); assert(tap("again"), "book again appears");
for (let i = 0; i < 120 && game.currentName !== "play"; i++) game.step(1);
assert(game.currentName === "play" && game.data.run.floor === 0, "book again starts over");
// Abilities
f = start("dolores"); const c0 = f.state[4];
tap("ability"); game.input.press("up", 1); game.step(2); idle();
assert(f.state[4] === c0 - 1, "dig spends a charge through the button");
f = start("rattle"); tap("ability"); game.input.press("up", 1); game.step(2); idle(); assert(f.state[4] === 1, "hop");
f = start("gladys"); tap("ability"); game.input.press("up", 1); game.step(2); idle(); assert(f.state[4] === 1 || f.state[4] === 2, "possess, or refused when nothing is in line");
f = start("mort"); tap("ability"); idle(); assert(f.state[4] === 0, "shush fires without aiming");
// Postcards through the tray
f = start("mort"); game.data.run.cards = ["p_blast", "p_crate"]; tap("card1"); game.input.press("up", 1); game.step(2); idle();
assert(game.data.run.cards.length === 1, "aimed postcard is spent"); tap("card0"); idle(); assert(game.data.run.cards.length === 0, "blast postcard is spent");
// Survives every floor loading on every device
for (const dev of ["phone-small", "phone", "phone-landscape", "tablet", "desktop"]) { game.resize(dev); for (const fl of [3, 7, 11, 15, 16]) { f = start("mort", fl); game.render(); } }
console.log(process.exitCode ? "FLOW FAILED" : "FLOW OK"); process.exit(process.exitCode ?? 0);
