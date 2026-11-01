// Solver proof: stacks stand and sleep, walls fall when hit, 200 bodies stay fast, replays match.
import { World, DT } from "../physics.js";
const ok = (name, pass, info = "") => { console.log(`${pass ? "ok  " : "FAIL"} ${name} ${info}`); if (!pass) process.exitCode = 1; };
const ground = (w) => w.box(0, 10, 1000, 20, { static: true, friction: 0.8 });
function run(w, n) { for (let i = 0; i < n; i++) w.step(); }

{ // Tall column
    const w = new World(); ground(w);
    const list = []; for (let i = 0; i < 20; i++) list.push(w.box(0, -0.5 - i, 1, 1, { density: 2 }));
    run(w, 300);
    const top = list[19];
    ok("20-high column stands", Math.abs(top.x) < 0.03 && Math.abs(top.y + 19.5) < 0.2, `x=${top.x.toFixed(4)} y=${top.y.toFixed(3)}`);
    ok("column sleeps", w.awakeCount === 0 && list.every((b) => !b.awake), `awake=${list.filter((b) => b.awake).length}`);
}
{ // Pyramid
    const w = new World(); ground(w);
    const list = []; const R = 14;
    for (let r = 0; r < R; r++) for (let i = 0; i < R - r; i++) list.push(w.box((i - (R - r - 1) / 2) * 1.02, -0.5 - r, 1, 1, { density: 1 }));
    const start = list.map((b) => [b.x, b.y]);
    run(w, 240);
    const drift = Math.max(...list.map((b, i) => Math.hypot(b.x - start[i][0], b.y - start[i][1])));
    ok(`pyramid of ${list.length} holds`, drift < 0.1, `drift=${drift.toFixed(4)}`);
    ok("pyramid sleeps", list.every((b) => !b.awake));
    const ball = w.ball(-20, -7, 0.6, { density: 8, vx: 38, vy: -3 });
    let peak = 0, moved = 0, t = 0;
    for (let i = 0; i < 400; i++) { const t0 = performance.now(); w.step(); const d = performance.now() - t0; if (i > 30) { peak = Math.max(peak, d); t += d; } }
    moved = list.filter((b, i) => Math.hypot(b.x - start[i][0], b.y - start[i][1]) > 0.5).length;
    ok("ball knocks it down", moved > 15, `moved=${moved} peak=${peak.toFixed(2)}ms avg=${(t / 370).toFixed(3)}ms`);
    let finite = list.every((b) => Number.isFinite(b.x + b.y + b.c + b.s));
    ok("all finite", finite);
}
{ // Heavy on light: mass ratio
    const w = new World(); ground(w);
    const low = w.box(0, -0.25, 2, 0.5, { density: 0.5 });
    const hi = w.box(0, -1.5, 2, 2, { density: 20 });
    run(w, 200);
    ok("heavy block on thin plank", low.y > -0.3 && low.y < -0.2 && hi.y > -1.6 && hi.y < -1.4, `low=${low.y.toFixed(3)} hi=${hi.y.toFixed(3)}`);
}
{ // Arch of beams on columns, the castle staple
    const w = new World(); ground(w); const all = [];
    for (let f = 0; f < 6; f++) { all.push(w.box(-1.5, -1 - f * 2.5, 1, 2, { density: 2 })); all.push(w.box(1.5, -1 - f * 2.5, 1, 2, { density: 2 })); all.push(w.box(0, -2.25 - f * 2.5, 4, 0.5, { density: 0.7 })); }
    const start = all.map((b) => b.y); run(w, 480);
    const drift = Math.max(...all.map((b, i) => Math.abs(b.y - start[i])));
    ok("six storeys of pillars and beams", drift < 0.1 && all.every((b) => !b.awake), `drift=${drift.toFixed(4)}`);
}
{ // Fast small ball can't tunnel
    const w = new World(); ground(w);
    const plank = w.box(0, -3, 0.25, 6, { density: 2 });
    const ball = w.ball(-6, -3, 0.25, { density: 8, vx: 60, gravity: 0 });
    let hit = false; run(w, 40);
    ok("no tunnelling at 60 m/s", Math.abs(plank.vx) > 0.1 || plank.x > 0.2 || ball.x < 0, `ball x=${ball.x.toFixed(2)}`);
}
function big() {
    const w = new World(); ground(w);
    for (let x = 0; x < 16; x++) for (let y = 0; y < 14; y++) w.box(x * 1.0 - 8, -0.5 - y, 1, 1, { density: x % 3 ? 2 : 0.6 });
    for (let i = 0; i < 6; i++) w.box(i * 3 - 8, -14.25, 2.5, 0.5, { density: .7 });
    return w;
}
{ // Big and heavy: 230 bodies in full collapse
    const w = big(); run(w, 400);
    ok("230 grid asleep", w.awakeCount === 0, `n=${w.bodies.length} awake=${w.awakeCount}`);
    w.ball(-30, -6, 0.7, { density: 8, vx: 45 }); w.ball(-30, -11, 0.7, { density: 8, vx: 45 });
    w.ball(30, -3, 0.7, { density: 8, vx: -45 });
    let sum = 0, peak = 0, count = 0, cMax = 0; const f = [];
    for (let i = 0; i < 600; i++) { const t0 = performance.now(); w.step(); const d = performance.now() - t0; f.push(d); cMax = Math.max(cMax, w.active.length); if (w.awakeCount > 150) { sum += d; count++; peak = Math.max(peak, d); } }
    f.sort((a, b) => a - b);
    ok("collapse cost", sum / Math.max(1, count) < 3, `avg ${(sum / Math.max(1, count)).toFixed(2)} ms over ${count} ticks with 150+ awake; p99=${f[594].toFixed(2)} peak=${peak.toFixed(2)} contacts=${cMax}`);
}
{ // Determinism
    const go = () => { const w = big(); run(w, 60); w.ball(-30, -6, 0.7, { density: 8, vx: 45 }); run(w, 300); return w.hash(); };
    const a = go(), b = go();
    ok("identical replay", a === b, `${a} ${b}`);
}
