// Ball feel in numbers, plus determinism and the replay clip round trip.
import { Match, ballStep } from "../sim.js";
import { makeBot } from "./humanbot.mjs";
import { Recorder, encodeClip, decodeClip, FRAME } from "../replay.js";
const env = { roll: 1, bounce: 0.62, windX: 0, windZ: 0 };
const fly = (sy, t = 1) => { const b = { x: 0, y: 1, z: 0, vx: 30, vy: 5, vz: 0, sx: 0, sy, sz: 0 }; for (let i = 0; i < t * 60; i++) ballStep(b, 1 / 60, env); return b; };
console.log("curve: straight z", fly(0).z.toFixed(2), " spin +30 z", fly(30).z.toFixed(2), " spin -30 z", fly(-30).z.toFixed(2));
const b = { x: 0, y: 6, z: 0, vx: 4, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0 }, tops = []; let up = false, top = 0;
for (let i = 0; i < 400; i++) { ballStep(b, 1 / 60, env); b.bounced = 0; if (b.vy > 0) up = true; if (up && b.vy <= 0) { tops.push(b.y.toFixed(2)); up = false; } }
console.log("bounce peaks from 6:", tops.slice(0, 5).join(" "));
const roll = (e) => { const r = { x: 0, y: 0.5, z: 0, vx: 18, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0 }; let t = 0; while (r.vx > 0.1 && t < 10) { ballStep(r, 1 / 60, e); t += 1 / 60; } return `${r.x.toFixed(1)} units in ${t.toFixed(1)} s`; };
console.log("18 u/s ground pass:", roll(env), "| in mud:", roll({ ...env, roll: 2, bounce: 0.3 }));
const hash = (seed) => { const m = new Match({ seed, teams: [{ skill: 0.5 }, { skill: 0.6 }], humans: [{ team: 0 }], fast: true }), bot = makeBot(2, 4); for (let i = 0; i < 4000; i++) { bot(m, m.humans[0]); m.step(); m.events.length = 0; } return m.goats.reduce((s, g) => s + g.x * 3 + g.z, m.ball.x).toFixed(6) + `/${m.score}`; };
console.log("determinism", hash(7), hash(7), hash(7) === hash(7) ? "same" : "DIFFERENT", "other seed", hash(8));
const m = new Match({ seed: 2, fast: true }), r = new Recorder(m); for (let i = 0; i < 600; i++) { m.step(); m.events.length = 0; r.capture(); }
const t = r.tail(6), c = encodeClip(t), d = decodeClip(c), last = (t.length / FRAME - 1) * FRAME, dl = d.length - FRAME;
console.log(`clip: ${t.length / FRAME} frames, ${c.length} bytes base64, last goat x ${t[last].toFixed(2)} -> ${d[dl].toFixed(2)}`);
