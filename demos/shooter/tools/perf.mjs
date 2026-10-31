// Measures ms per step in the heaviest level with everything awake and the player firing constantly.
import "../game.js";
const game = globalThis.__pogo;
game.input.touchMode = false;
game.restart("title"); game.step(2);
const lvl = Number(process.argv[2] ?? 4);
game.startAt(lvl); game.step(40);
const w = game.sim;
game.data.run.owned = [true, true, true, true, true];
game.data.run.ammo = { thorns: 40, hornets: 240, pumpkins: 16, bulbs: 24 };
game.input.press("w3", 1);
for (const e of w.enemies) { e.awake = true; e.state = "move"; }
const times = [];
let peakE = 0;
for (let i = 0; i < 1200; i++) {
    w.mode = "play"; game.data.run.hp = 100;
    game.input.press("fire", 2);
    game.input.addLook(6, 0);
    if (i % 60 === 0) game.input.press(["w2", "w3", "w4"][(i / 60) % 3], 1);
    const t0 = performance.now(); game.step(1); times.push(performance.now() - t0);
    game.render(); peakE = Math.max(peakE, game.current.entities.length);
}
times.sort((a, b) => a - b);
const p = (q) => times[Math.floor(times.length * q)].toFixed(2);
console.log(`level ${lvl + 1}: entities peak ${peakE}, enemies left ${w.enemies.length}; ms/step median ${p(0.5)} p95 ${p(0.95)} p99 ${p(0.99)} max ${times[times.length - 1].toFixed(2)}`);
