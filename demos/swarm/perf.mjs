// Peak-swarm cost in Node, with Pogo's null renderer: simulation step and the JS side of a frame.
import "./game.js";
const game = globalThis.__pogo, D = globalThis.__deep;
game.resize("phone");
game.restart("play");
D.warp(245, { harpoon: 6, razor: 6, eel: 6, torpedo: 5, mine: 5, sonar: 4 }, { whet: 3, gear: 3, flipper: 2, bubble: 2 });
game.step(600);
D.R.god = true;
const st = [], rn = [];
let alive = 0;
for (let i = 0; i < 3000; i++) {
    let t = performance.now(); game.step(1); st.push(performance.now() - t);
    t = performance.now(); game.render(1); rn.push(performance.now() - t);
    alive += D.R.alive;
}
const sum = (l) => l.reduce((a, b) => a + b, 0), q = (l, p) => [...l].sort((a, b) => a - b)[Math.floor(l.length * p)];
console.log(`avg alive ${Math.round(alive / 3000)}, shots ${D.R.shots.length}; step mean ${(sum(st) / 3000).toFixed(3)} ms, p99 ${q(st, 0.99).toFixed(3)}; frame JS mean ${(sum(rn) / 3000).toFixed(3)} ms, p99 ${q(rn, 0.99).toFixed(3)}`);
process.exit(0);
