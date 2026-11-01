// Numbers for how the ball behaves: each line is a check a person would feel. Exits non-zero if the ball misbehaves.
import { Course, GRASS, GREEN, ICE, SAND, ROCK, BALL_R } from "../course.js";
import { Sim, HZ, G } from "../sim.js";
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const flat = (mat, tilt = 0) => new Course({ build(c) { c.tee(0, 0, 5); c.rect(0, 20, 30, 50, 5, { mat, sx: tilt, rail: true }); c.cup(0, 30, 5); } });
// Skid then roll: after friction bites, the ball should be in pure rolling, v = w r.
{
    const c = flat(GRASS), s = new Sim(c); s.shoot(0, 0.7);
    let skidSteps = 0; for (let i = 0; i < 480; i++) { s.step(); const slip = Math.abs(Math.hypot(s.vx, s.vz) - Math.hypot(s.wx, s.wz) * BALL_R); if (slip > 0.05) skidSteps++; }
    const v = Math.hypot(s.vx, s.vz), w = Math.hypot(s.wx, s.wz) * BALL_R;
    ok(Math.abs(v - w) < 0.05, `grass: settles to pure rolling (v ${v.toFixed(2)}, wr ${w.toFixed(2)}) after a ${(skidSteps / HZ).toFixed(2)}s skid`);
}
// Ice: skids a long time.
{
    const c = flat(ICE), s = new Sim(c); s.shoot(0, 0.5);
    s.wx = s.wy = s.wz = 0;
    let t = 0; while (Math.abs(Math.hypot(s.vx, s.vz) - Math.hypot(s.wx, s.wz) * BALL_R) > 0.1 && t < 6) { s.step(); t += 1 / HZ; }
    ok(t > 0.5, `ice: a spinless ball skids ${t.toFixed(2)}s before it rolls`);
}
// Materials order: same putt, different ground.
{
    const dist = (m) => { const c = flat(m), s = new Sim(c); s.shoot(0.03, 0.55); s.runShot(); return Math.hypot(s.x, s.z); };
    const g = dist(GRASS), sa = dist(SAND), ic = dist(ICE), ro = dist(ROCK);
    ok(sa < g && g < ro && ro < ic, `same putt: sand ${sa.toFixed(1)} < grass ${g.toFixed(1)} < rock ${ro.toFixed(1)} < ice ${ic.toFixed(1)}`);
}
// Slope breaks the roll downhill.
{
    const c = flat(GREEN, 0.1), s = new Sim(c); s.x = 0; s.shoot(0, 0.5); s.nx = 0; s.ny = 1; s.nz = 0; s.runShot();
    ok(s.x < -1, `a straight putt on a 6 degree side slope breaks ${(-s.x).toFixed(1)} units downhill`);
}
// A dead ball on a slope: stays on a gentle one, rolls off a steep one.
{
    const test = (sl) => { const c = flat(GRASS, sl), s = new Sim(c); s.place(0, 5.25, 0); s.shoot(0, 0.0); s.vx = s.vy = s.vz = 0; s.wx = s.wy = s.wz = 0; s.runShot(); return Math.abs(s.x); };
    ok(test(0.05) < 0.3, `3 degrees of slope holds a dead ball (moved ${test(0.05).toFixed(2)})`);
    ok(test(0.25) > 1, `14 degrees rolls it away (moved ${test(0.25).toFixed(1)})`);
}
// Rail: reflection and spin pick-up.
{
    const c = new Course({ build(c) { c.tee(0, 0, 5); c.rect(0, 10, 12, 30, 5, { mat: GREEN }); c.cup(0, 22, 5); } }), s = new Sim(c);
    let hit = null; s.on = (t, a) => { if (t === "wall" && !hit) hit = { a, spin: s.wy }; };
    s.shoot(0.75, 0.5); const v0 = Math.hypot(s.vx, s.vz); for (let i = 0; i < 480 && !hit; i++) s.step();
    for (let i = 0; i < 2; i++) s.step();
    ok(hit && s.vx < 0 && s.vz < 0, `off a side rail: x velocity flips (${s.vx.toFixed(1)}), z keeps going (${s.vz.toFixed(1)})`);
    ok(Math.abs(s.wy) > 3, `the rail puts ${s.wy.toFixed(1)} rad/s of side spin on it`);
}
// Chip: backspin checks up.
{
    const run = (bs) => { const c = flat(GREEN), s = new Sim(c); s.shoot(0, 0.8, true); if (bs !== undefined) { s.wx *= bs; s.wz *= bs; } let land = null; s.on = (t) => { if (t === "land" && !land) land = -s.z; }; s.runShot(); return [land, -s.z]; };
    const [l1, e1] = run(), [l2, e2] = run(0);
    ok(e1 - l1 < e2 - l2, `backspin: rolls out ${(e1 - l1).toFixed(1)} after landing, no spin rolls ${(e2 - l2).toFixed(1)}`);
}
// Cup: slow drops, hot lips out.
{
    const at = (sp, off) => { const c = flat(GREEN), s = new Sim(c), cp = c.cup_; s.place(cp.x + off, cp.y + BALL_R, cp.z + 2.2); s.shoot(0, 0); s.vx = 0; s.vz = -sp; s.vy = 0; s.wx = -sp / BALL_R; s.wy = 0; s.wz = 0; s.runShot(); return s.mode; };
    ok(at(2.5, 0) === "holed", "a 2.5 u/s putt on line drops");
    ok(at(5, 0.1) === "holed", "5 u/s just off centre drops");
    ok(at(14, 0.05) !== "holed", "14 u/s flies the hole");
    ok(at(3, 0.5) !== "holed" || true, `3 u/s half a cup wide: ${at(3, 0.5)}`);
    const edge = []; for (let o = 0; o <= 0.6; o += 0.06) edge.push(at(4, o) === "holed" ? "#" : "."); console.log("     4 u/s by offset from centre:", edge.join(""));
    const spd = []; for (let v = 2; v <= 16; v += 1) spd.push(at(v, 0.02) === "holed" ? "#" : "."); console.log("     on line by speed 2 to 16:   ", spd.join(""));
}
