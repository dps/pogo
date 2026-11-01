// Measures how each plane actually flies: settled glide, a held pull to stall, a dive and swoop, turn radius.
import { Flight } from "../flight.js";
import { PLANES } from "../data.js";
const env = { sun: [0, 1], warm: 0 };
const dt = 1 / 60;
for (const c of PLANES) {
    const f = new Flight(c, env); f.place(0, 85, 200, 0); f.spawn = null;
    const run = (sec, sx, sy, cb) => { for (let i = 0; i < sec * 60; i++) { f.y = 85; f.z = 200; f.x = 0; f.step(dt, sx, sy); cb?.(i); } };
    // Hold high over open sea by resetting height; the velocities are what matter.
    run(8, 0, 0); const a = { v: f.V, sink: f.vy, gamma: f.gamma * 57.3 };
    f.stalls = 0; let t0 = -1, minV = 99; run(6, 0, 1, (i) => { minV = Math.min(minV, f.V); if (f.stalled && t0 < 0) t0 = i / 60; });
    const stalled = { at: t0, minV }; run(5, 0, 0);
    let peak = 0; run(3, 0, -1, () => { peak = Math.max(peak, f.V); }); let g = 0, vy = 0; run(2, 0, 0, () => { g = Math.max(g, Math.abs(f.ay)); vy = Math.max(vy, f.vy); });
    run(6, 0, 0); const y0 = f.yaw; let yaw = 0, last = f.yaw; const sp0 = f.V; let sink = 0; run(5, 1, 0, () => { let d = f.yaw - last; if (d > 3.1) d -= 6.283; if (d < -3.1) d += 6.283; yaw += d; last = f.yaw; sink = f.vy; });
    console.log(c.id.padEnd(9), `glide v ${a.v.toFixed(1)} sink ${a.sink.toFixed(2)} L/D ${(a.v / -a.sink).toFixed(1)} | stall at ${stalled.at.toFixed(1)}s minV ${stalled.minV.toFixed(1)} | dive ${peak.toFixed(1)} | swoop climb ${vy.toFixed(1)} | turn ${(Math.abs(yaw) / 5).toFixed(2)} rad/s radius ${(f.V / (Math.abs(yaw) / 5)).toFixed(0)} sink ${sink.toFixed(2)} v ${f.V.toFixed(1)}`);
}
process.exit(0);
