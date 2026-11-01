// Assist doubles as health and halves damage, and turning it off gives the health back.
import "../game.js";
const game = globalThis.__pogo; game.data.sv = undefined; game.go("play", { room: "g05" }); game.step(5);
const g = game.dbg, sv = g.sv, m0 = sv.maxHp;
g.openPause(); game.step(2);
const tap = () => { const list = game.current.entities.filter((e) => e.layer === 100); const e = list[6]; console.log("button", e.text ?? e.label); game.input.tap(e.pos.x, e.pos.y); game.step(2); };
tap(); const on = sv.assist, m1 = sv.maxHp;
game.dbg.setMode("play"); game.step(1); const hp = sv.hp; g.hurt(1, g.H.x - 5); const lost = hp - sv.hp;
g.openPause(); game.step(2); tap();
console.log(JSON.stringify({ on, max: [m0, m1, sv.maxHp], lost, off: !sv.assist }));
process.exit(0);
