// Every castle must stand on its own: nothing moves, nobody dies, everything sleeps, and it stays that way.
import { Sim } from "../sim.js";
import { LEVELS, WORLDS, showcase } from "../levels.js";
let bad = 0;
for (const l of [...LEVELS, showcase()]) {
    const s = new Sim(l);
    const before = s.parts.map((p) => [p.b.x, p.b.y]);
    let spec = 0, worst = ""; (l.blocks).forEach((q, i) => { const p = s.parts[i], e = Math.hypot(p.b.x - q.x, p.b.y - q.y); if (e > spec) { spec = e; worst = `${q.mat}/${q.shape}@${q.x}`; } });
    const n = s.parts.length, d = s.defenders.length;
    let awakeLater = 0, ev = 0;
    for (let i = 0; i < 300; i++) { s.step(); ev += s.events.filter((e) => e.type !== "x").length; s.events.length = 0; awakeLater = s.world.awakeCount; }
    let drift = 0; s.parts.forEach((p, i) => { drift = Math.max(drift, Math.hypot(p.b.x - before[i][0], p.b.y - before[i][1])); });
    let minX = 1e9, maxX = -1e9, top = 0; for (const p of s.parts) { minX = Math.min(minX, p.b.minX); maxX = Math.max(maxX, p.b.maxX); top = Math.min(top, p.b.minY); }
    const fail = spec > 0.32 || drift > 0.02 || s.defenders.length !== d || s.parts.length !== n || awakeLater || ev;
    if (fail) bad++;
    console.log(`${fail ? "FAIL" : "ok  "} ${String(l.index ?? "-").padStart(2)} ${l.name.padEnd(24)} bodies ${String(n).padStart(3)} defs ${d} x ${minX.toFixed(1)}..${maxX.toFixed(1)} h ${(-top).toFixed(1)} spec ${spec.toFixed(2)} ${spec > 0.32 ? worst : ""} drift ${drift.toFixed(4)} awake ${awakeLater} ev ${ev}`);
}
process.exitCode = bad ? 1 : 0;
