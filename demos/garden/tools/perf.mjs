// How much main-thread time does a big swarm cost? Headless, so this is JS only (no GPU).
const t0 = performance.now();
await import("../game.js");
console.log(`painted and booted in ${(performance.now() - t0).toFixed(0)}ms`);
const game = globalThis.__pogo;
game.resize("phone");
game.data.quiet = true;
game.go("play", { level: 16 }); game.step(3);
const s = game.data.sim; s.pennies = 99999; s.bites = 1e6; s.maxBites = 1e6;
for (const [k, c, r] of [["gnome", 3, 7], ["gnome", 5, 7], ["hive", 4, 6], ["compost", 4, 7], ["chilli", 3, 6], ["chilli", 5, 6], ["chime", 2, 7], ["hive", 6, 6]]) s.plant(k, c, r);
const spawn = () => { while (s.enemies.length < 500) { const i = s.enemies.length; s.spawn(i % 2 ? "ant" : "aphid", 1 + (i % 7), 11); } };
spawn();
game.data.play.speed(3);
let sum = 0, worst = 0, rsum = 0, n = 240;
for (let i = 0; i < n; i++) {
    spawn();
    const a = performance.now(); game.step(1); const b = performance.now(); game.render(); const c = performance.now();
    sum += b - a; worst = Math.max(worst, b - a); rsum += c - b;
}
console.log(`500 pests at 3x: step ${(sum / n).toFixed(2)}ms avg, ${worst.toFixed(2)}ms worst; draw JS ${(rsum / n).toFixed(2)}ms avg; pests ${s.enemies.length}, particles capped`);
