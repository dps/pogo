// Physics stress test: drop a heavy mixed pile, measure settling, drift, overlap and cost.
import { Pile, WORLD, RADII } from "./game.js";
function run(name, make, n) {
    const p = new Pile({ ...WORLD, H: WORLD.H + 400 }, 3, { noMerge: true });
    let r = 12345; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const t = make(i, rnd); p.add("c", t, RADII[t] + rnd() * (300 - 2 * RADII[t]), -40 - i * 34, RADII[t]); }
    let settled = -1, t0 = performance.now(), steps = 0, pk = 0;
    const dt = 1 / 60;
    for (let s = 0; s < 1800; s++) { const a = performance.now(); p.step(dt); pk = Math.max(pk, performance.now() - a); steps++; p.events.length = 0; if (settled < 0 && p.bodies.every((b) => b.sleep)) { settled = s; } }
    const ms = (performance.now() - t0) / steps;
    const snap = new Map(p.bodies.map((b) => [b.id, [b.x, b.y]]));
    for (let s = 0; s < 600; s++) { p.step(dt); p.events.length = 0; }
    let drift = 0, over = 0, top = 1e9, jitterSum = 0;
    p.bodies.forEach((b) => { const q = snap.get(b.id); drift = Math.max(drift, Math.hypot(b.x - q[0], b.y - q[1])); top = Math.min(top, b.y - b.r); });
    for (let i = 0; i < p.bodies.length; i++) for (let j = i + 1; j < p.bodies.length; j++) { const a = p.bodies[i], b = p.bodies[j]; over = Math.max(over, a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y)); }
    // wake everyone and re-settle: is a live, awake pile quiet?
    p.wakeAll();
    const s2 = p.bodies.map((b) => [b.x, b.y]); let t1 = performance.now(), maxv = 0;
    for (let s = 0; s < 120; s++) { p.step(dt); p.events.length = 0; for (const b of p.bodies) maxv = Math.max(maxv, Math.hypot(b.vx, b.vy)); }
    const ms2 = (performance.now() - t1) / 120;
    console.log(`${name.padEnd(22)} n=${n} settled@${settled} ms/step ${ms.toFixed(3)} peak ${pk.toFixed(2)} | post-settle drift ${drift.toFixed(3)} overlap ${over.toFixed(2)} top ${top.toFixed(0)} | rewake maxv ${maxv.toFixed(1)} ms/step ${ms2.toFixed(3)}`);
}
run("small only", (i, r) => Math.floor(r() * 3), 90);
run("mixed", (i, r) => Math.floor(r() * 8), 60);
run("heavy on tiny", (i, r) => (i < 30 ? 0 : 9 + Math.floor(r() * 3)), 40);
run("tiny under giants x70", (i, r) => (i < 60 ? Math.floor(r() * 2) : 11), 70);
process.exit(0);
