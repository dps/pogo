// Team AI. Everything here decides; only sim.js acts. Skill changes reaction time, reading of the game and
// execution error. It never touches speed limits, kick power or keeper reach, so hard difficulty plays better, not faster.
import { HL, HW, GW, GH, ST, RUN, clamp, lerp, ballStep } from "./sim.js";

const TAU = Math.PI * 2;
const STYLES = {
    mixed: { shoot: 1, lob: 1, press: 1, pass: 1 },
    press: { shoot: 1, lob: 0.7, press: 1.25, pass: 1 },
    direct: { shoot: 0.82, lob: 1.7, press: 0.95, pass: 0.85 },
    pass: { shoot: 1.2, lob: 0.7, press: 0.92, pass: 1.25 },
};

export function params(skill, style = "mixed") {
    const s = clamp(skill, 0, 1), st = STYLES[style] ?? STYLES.mixed;
    return {
        s, st,
        react: lerp(0.75, 0.1, s),         // off-ball re-think
        decide: lerp(0.95, 0.16, s),       // on-ball re-think
        passErr: lerp(0.26, 0.018, s),
        paceErr: lerp(0.42, 0.05, s),
        shotErr: lerp(0.24, 0.018, s),
        noise: lerp(0.38, 0.025, s),       // misjudgement of every option
        tackleOdds: lerp(0.22, 0.3, s),    // chance per look at lunging
        tackleRange: lerp(3.6, 2.5, s),    // low skill lunges too early
        slideRange: lerp(5.8, 4.2, s),
        mark: lerp(0.12, 1, s),            // how well men are picked up
        run: lerp(0.05, 1, s),             // appetite and timing of off-ball runs
        work: lerp(0.62, 1, s),            // jogging when not near the ball
        chase: lerp(0.8, 1, Math.sqrt(s)), // effort going for the ball; 1 is everyone's top speed
        gkReact: lerp(0.46, 0.09, s),
        gkErr: lerp(2.6, 0.25, s),
        curve: s > 0.45,                   // bends shots round the keeper
        sees: s > 0.3,                     // sees through balls
    };
}

const d2 = (a, b, c, e) => Math.hypot(a - c, b - e);

/** Clearance of a point from a segment. */
function segDist(px, pz, ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1);
    return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

/** Chance of scoring from here, as the AI reckons it. */
export function xg(sim, team, x, z, dir, shooter) {
    const gx = dir * HL, d = Math.hypot(gx - x, z), dxg = Math.abs(gx - x) + 0.5;
    const open = Math.abs(Math.atan2(z + GW, dxg) - Math.atan2(z - GW, dxg));
    let v = clamp(open / 0.9, 0, 1) * (d < 6 ? 1 : d < 24 ? 1 - (d - 6) / 22 : 0.14);
    for (const o of sim.goats) {
        if (o.team === team) continue;
        const sd = segDist(o.x, o.z, x, z, gx, clamp(z, -GW, GW) * 0.4);
        const near = o.role === 0 ? 0.8 : 1.4;
        if (sd < near) v *= o.role === 0 ? 0.72 : 0.58;
    }
    return v;
}

function threat(sim, team, x, z, dir) {
    return 0.6 * xg(sim, team, x, z, dir) + 0.32 * (x * dir + HL) / (2 * HL);
}

function predict(sim, T) {
    const b = sim.ball, p = T.pred ?? (T.pred = new Float32Array(44 * 3)), o = T.q ?? (T.q = {});
    Object.assign(o, { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sx: b.sx, sy: b.sy, sz: b.sz });
    const use = T.p.curve;
    for (let i = 0; i < 44; i++) {
        ballStep(o, 0.05, sim.env, use);
        if (Math.abs(o.z) > HW - 0.4) { o.z = Math.sign(o.z) * (HW - 0.4); o.vz *= -0.72; }
        if (Math.abs(o.x) > HL - 0.4 && Math.abs(o.z) > GW) { o.x = Math.sign(o.x) * (HL - 0.4); o.vx *= -0.72; }
        p[i * 3] = o.x; p[i * 3 + 1] = o.y; p[i * 3 + 2] = o.z;
    }
    o.bounced = 0;
}

function intercept(sim, T, g) {
    const p = T.pred, b = sim.ball;
    const speed = RUN * sim.env.speed * (g.state === ST.RUN || g.state === ST.KICK ? 1 : 0.5);
    for (let i = 0; i < 44; i++) {
        const t = (i + 1) * 0.05, x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2];
        if (y > 2.4) continue;
        if (d2(g.x, g.z, x, z) - 1.1 <= speed * t) return { t, x, z };
    }
    return { t: 2.2 + d2(g.x, g.z, b.x, b.z) / speed, x: p[129], z: p[131] };
}

const SLOT = [null, [-8.5, 0], [0.5, -8], [0.5, 8], [9, 0]];

function slot(sim, T, g, ballA, ballZ, poss) {
    const dir = T.dir, pr = (clamp(ballA, -HL, HL) + HL) / (2 * HL);
    const block = poss ? lerp(-7, 12, pr) : lerp(-14, 3, pr) * (T.p.st.press > 1.1 ? 0.7 : 1) + (T.p.st.press > 1.1 ? 2 : 0);
    const s = SLOT[g.idx], spread = poss ? 1.15 : 0.7;
    let a = block + s[0] * (poss ? 1.15 : 0.72), z = s[1] * spread + ballZ * (poss ? 0.22 : 0.42);
    if (poss) a = Math.max(a, block - 10);
    return [clamp(a, -HL + 3, HL - 2.2) * dir, clamp(z, -HW + 1.5, HW - 1.5)];
}

export function teamThink(sim, T, dt) {
    if (!T.p) { T.p = params(T.skill, T.style); T.tick = T.id * 2; T.assign = new Array(5).fill(null); T.chaser = null; T.runT = 2; T.runner = null; }
    T.tick++;
    const p = T.p, b = sim.ball, ours = sim.side(T.id), theirs = sim.side(1 - T.id);
    if (T.tick % 5 === 0 || !T.pred) {
        predict(sim, T);
        analyse(sim, T, ours, theirs);
    }
    T.runT -= dt;
    for (const g of ours) {
        if (sim.isHuman(g)) continue;
        const free = g.state === ST.RUN || g.state === ST.KICK || g.state === ST.HOLD;
        if (g.role === 0) { keeper(sim, T, g, dt); continue; }
        if (!free) { continue; }
        if (b.owner === g) { carrier(sim, T, g, dt); continue; }
        offBall(sim, T, g, dt, theirs);
    }
}

function analyse(sim, T, ours, theirs) {
    const b = sim.ball, p = T.p;
    let best = null, bt = 1e9, bi = null;
    for (const g of ours) {
        if (g.role === 0) continue;
        const i = intercept(sim, T, g);
        g.it = i;
        let t = i.t;
        if (g === T.chaser) t -= 0.25;                 // stick with the man already going
        if (sim.isHuman(g)) t -= 0.4;
        if (g.state === ST.BOWLED) t += 1.5;
        if (b.passTo === g) t = -1;
        if (t < bt) { bt = t; best = g; bi = i; }
    }
    let theirT = 1e9;
    for (const g of theirs) { if (g.role === 0) continue; const i = intercept(sim, T, g); if (i.t < theirT) theirT = i.t; }
    const owner = b.owner;
    T.poss = owner ? owner.team === T.id : b.passTo ? b.passTo.team === T.id : bt < theirT - 0.15;
    T.chaser = best;
    T.ballA = b.x * T.dir;
    if (!owner || owner.team !== T.id) T.loose = true;
    // Marking: dangerous attackers first, nearest free defender to each.
    if (!T.poss) {
        const free = ours.filter((g) => g.role !== 0 && g !== best && !sim.isHuman(g));
        const men = theirs.filter((o) => o.role !== 0 && o !== owner).sort((x, y) => (y.x * -T.dir) * -1 - (x.x * -T.dir) * -1);
        men.sort((x, y) => x.x * T.dir - y.x * T.dir);
        for (const g of ours) g.markMan = null;
        for (const m of men) {
            let who = null, wd = 1e9;
            for (const g of free) { if (g.markMan) continue; const d = d2(g.x, g.z, m.x, m.z); if (d < wd) { wd = d; who = g; } }
            if (who) who.markMan = m;
        }
    } else {
        for (const g of ours) g.markMan = null;
        // Pick a runner now and then. A run is a burst behind the last defender when the carrier has his head up.
        if (T.runT <= 0 && owner && owner.team === T.id && sim.rand() < 0.3 + 0.6 * p.run) {
            T.runT = lerp(3.2, 1.8, p.s);
            const cands = ours.filter((g) => g.role !== 0 && g !== owner && !sim.isHuman(g) && (g.x * T.dir) > (owner.x * T.dir) - 2);
            if (cands.length) { T.runner = cands[Math.floor(sim.rand() * cands.length)]; T.runner.runT = 1.7; }
        }
    }
}

function arrive(g, tx, tz, speed = 1, soft = 1.6) {
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { g.cmd.mx = 0; g.cmd.mz = 0; return; }
    const k = Math.min(1, d / soft);
    g.cmd.mx = dx / d * k; g.cmd.mz = dz / d * k; g.cmd.speed = speed;
}

function offBall(sim, T, g, dt, theirs) {
    const p = T.p, b = sim.ball, dir = T.dir;
    const owner = b.owner, teamHas = owner && owner.team === T.id;
    g.aiT -= dt;
    if (g.runT > 0) g.runT -= dt;

    // Ball arriving at head or boot height in a good place: strike it first time.
    if (!owner && !g.buffer && g.noTouch <= 0) {
        const d = d2(g.x, g.z, b.x, b.z), a = b.x * dir;
        if (d < 3.2 && b.lastTeam === T.id && a > HL * 0.35 && (b.y > 1.1 || Math.hypot(b.vx, b.vz) > 9) && sim.rand() < 0.25 + p.s * 0.5) { g.buffer = { kind: "shot", t: 0.3 }; g.aiErr = p.shotErr; }
        else if (d < 3 && a < -HL * 0.5 && b.y > 1.1 && sim.rand() < 0.4) { g.buffer = { kind: "shot", t: 0.3 }; g.aiErr = 0.3; }
    }

    if (b.passTo === g || (T.chaser === g && !teamHas)) {
        if (owner && owner.team !== T.id) { presser(sim, T, g, owner); return; }
        const i = g.it ?? { x: b.x, z: b.z };
        arrive(g, i.x, i.z, p.chase, 0.8);
        return;
    }
    if (g.aiT > 0) { arrive(g, g.tx, g.tz, g.tSpeed ?? 1); return; }
    g.aiT = p.react * (0.75 + sim.rand() * 0.5);

    const ballA = b.x * dir;
    if (T.poss) {
        let [sx, sz] = slot(sim, T, g, ballA, b.z, true);
        if (g === T.runner && g.runT > 0) {
            let last = -HL;
            for (const o of theirs) if (o.role !== 0) last = Math.max(last, o.x * dir);
            sx = clamp(last + 3.5, 3, HL - 4) * dir; sz = clamp(g.z * 0.55, -8, 8);
            g.tx = sx; g.tz = sz; g.tSpeed = 1;
            arrive(g, sx, sz, 1);
            return;
        }
        // Check a few spots round the slot and take the one with the best pass on.
        let best = -1e9, bx = sx, bz = sz;
        const cx = owner ? owner.x : b.x, cz = owner ? owner.z : b.z;
        for (let i = 0; i < 6; i++) {
            const x = clamp(i === 5 ? g.tx : sx + (i === 0 ? 0 : Math.cos(i * 1.257) * 4.5), -HL + 2, HL - 2), z = clamp(i === 5 ? g.tz : sz + (i === 0 ? 0 : Math.sin(i * 1.257) * 4.5), -HW + 1.2, HW - 1.2);
            let v = i === 5 ? 0.12 : 0, nearOpp = 12, lane = 8;
            for (const o of theirs) { nearOpp = Math.min(nearOpp, d2(o.x, o.z, x, z)); lane = Math.min(lane, segDist(o.x, o.z, cx, cz, x, z)); }
            v += nearOpp / 12 + clamp(lane, 0, 4) / 4 * 0.9;
            for (const m of sim.side(T.id)) if (m !== g && m.role !== 0) { const dm = d2(m.x, m.z, x, z); if (dm < 6.5) v -= (6.5 - dm) * 0.14; }
            const dc = d2(x, z, cx, cz);
            if (dc < 5) v -= (5 - dc) * 0.15; if (dc > 20) v -= (dc - 20) * 0.08;
            v += threat(sim, T.id, x, z, dir) * 1.2;
            v += sim.rand() * p.noise * 1.5;
            if (v > best) { best = v; bx = x; bz = z; }
        }
        g.tx = bx; g.tz = bz; g.tSpeed = lerp(p.work, 1, 0.5);
    } else {
        const [sx, sz] = slot(sim, T, g, ballA, b.z, false);
        const m = g.markMan;
        let tx = sx, tz = sz;
        if (m) {
            const gl = -dir * HL, dx = gl - m.x, dz = -m.z, l = Math.hypot(dx, dz) || 1;
            // Goal side of the man, leaning into the passing lane.
            const bx = b.x - m.x, bz = b.z - m.z, bl = Math.hypot(bx, bz) || 1;
            const mx = m.x + dx / l * 2 + bx / bl * 1.5, mz = m.z + dz / l * 2 + bz / bl * 1.5;
            tx = lerp(sx, mx, p.mark); tz = lerp(sz, mz, p.mark);
        }
        g.tx = clamp(tx, -HL + 1.5, HL - 1.5); g.tz = clamp(tz, -HW + 1.2, HW - 1.2);
        g.tSpeed = lerp(p.work, 1, 0.3);
    }
    arrive(g, g.tx, g.tz, g.tSpeed);
}

function presser(sim, T, g, c) {
    const p = T.p, dir = T.dir, sc = p.s, b = sim.ball;
    const d = d2(g.x, g.z, c.x, c.z);
    // Come at him goal side; good sides show him the touchline rather than diving straight in.
    const tx = c.x + c.vx * 0.2 - dir * 1.1 * sc, tz = c.z + c.vz * 0.2;
    arrive(g, tx, tz, T.p.chase, 0.3);
    g.dec = (g.dec ?? 0) - sim.dt;
    if (g.dec > 0 || g.cool > 0) return;
    g.dec = lerp(0.3, 0.14, sc);
    if (c.state === ST.HOLD || c.role === 0 || c.immune > 0) return;
    const fx = (c.x - g.x) / (d || 1), fz = (c.z - g.z) / (d || 1);
    const facing = Math.sin(g.ang) * fx + Math.cos(g.ang) * fz;
    if (facing < 0.55) return;
    const odds = p.tackleOdds;
    if (d < p.tackleRange && sim.rand() < odds) {
        g.cmd.mx = fx; g.cmd.mz = fz; sim.startButt(g);
    } else if (d < p.slideRange && d > 2.3 && sim.rand() < odds * 0.5 * (b.y < 1 ? 1 : 0)) {
        const bx = b.x - g.x, bz = b.z - g.z, l = Math.hypot(bx, bz) || 1;
        g.cmd.mx = bx / l; g.cmd.mz = bz / l; sim.startSlide(g);
    }
}

function carrier(sim, T, g, dt) {
    const p = T.p, dir = T.dir, b = sim.ball, gx = dir * HL;
    const opp = sim.nearestOpp(g), pressure = opp ? clamp(1 - (opp.d - 1.8) / 5, 0, 1) : 0;
    if (g.charging) {
        // Winding up. Bail out early if someone arrives.
        arrive(g, gx, g.z * 0.8, 1, 0.5);
        if (g.charge >= g.chargeTo || pressure > 0.82) fireShot(sim, T, g);
        return;
    }
    g.dec = (g.dec ?? 0) - dt;
    if (g.dec > 0 && g.dribX !== undefined) {
        const ax = g.x + g.dribX * 4, az = g.z + g.dribZ * 4;
        arrive(g, ax, az, 1, 0.5);
        return;
    }
    g.dec = p.decide * (0.8 + sim.rand() * 0.4);
    const here = threat(sim, T.id, g.x, g.z, dir), noise = () => (sim.rand() - 0.5) * 2 * p.noise;
    const shotXg = xg(sim, T.id, b.x, b.z, dir);
    let bestV = -1e9, act = null;

    // Shoot?
    const shootBar = lerp(0.3, 0.24, p.s) * p.st.shoot, sv = shotXg * (1.5 - pressure * 0.3) + noise() * 0.5;
    const dist = d2(gx, 0, b.x, b.z);
    if (shotXg > shootBar * (1 - pressure * 0.4) || (dist < 8 && pressure > 0.5)) { bestV = sv + 0.28; act = { kind: "shoot" }; }

    // Every pass on.
    for (const m of sim.side(T.id)) {
        if (m === g || m.role === 0) continue;
        const d = d2(m.x, m.z, g.x, g.z);
        if (d < 3.5 || d > 30) continue;
        const lead = d / 22;
        const lx = clamp(m.x + m.vx * lead, -HL + 1, HL - 1), lz = clamp(m.z + m.vz * lead, -HW + 1, HW - 1);
        let lane = 12, recv = 12;
        for (const o of sim.side(1 - T.id)) { lane = Math.min(lane, segDist(o.x, o.z, b.x, b.z, lx, lz)); recv = Math.min(recv, d2(o.x, o.z, lx, lz)); }
        const safe = clamp(lane / 3, 0, 1) * clamp(recv / 3.5, 0.2, 1);
        const v = threat(sim, T.id, lx, lz, dir) * 1.25 * safe * p.st.pass + (safe > 0.6 ? 0.08 : -0.1) + noise();
        const running = m.runT > 0 && p.sees ? 0.1 : 0;
        if (v + running > bestV) { bestV = v + running; act = { kind: "pass", m, lob: false }; }
        // Lofted: over the top or into the box.
        const lobV = threat(sim, T.id, lx, lz, dir) * 1.2 * clamp(recv / 4, 0.2, 1) * lerp(0.55, 0.85, p.s) * p.st.lob + noise();
        if (d > 11 && lobV > bestV) { bestV = lobV; act = { kind: "pass", m, lob: true }; }
    }

    // Carry it.
    let best = -1e9, ddx = dir, ddz = 0;
    for (let i = -3; i <= 3; i++) {
        const base = Math.atan2(-g.z * 0.3, (gx - g.x) * 0.3 + dir * 0.01) * 0 + Math.atan2(gx - g.x, -g.z), a = base + i * 0.42 + noise() * 0.25;
        const x = Math.sin(a), z = Math.cos(a), px = g.x + x * 5, pz = g.z + z * 5;
        let v = threat(sim, T.id, px, pz, dir) * 1.2;
        for (const o of sim.side(1 - T.id)) { const od = d2(o.x, o.z, px, pz); if (od < 5.5) v -= (5.5 - od) * 0.13; }
        if (Math.abs(pz) > HW - 2) v -= 0.35; if (Math.abs(px) > HL - 2) v -= 0.25;
        if (v > best) { best = v; ddx = x; ddz = z; }
    }
    const dribV = best * (1 - pressure * 0.6) + 0.05 + (g.t > 0.3 ? 0 : 0.2) + noise();
    g.dribX = ddx; g.dribZ = ddz;
    if (dribV > bestV) act = null;
    if (!act) { arrive(g, g.x + ddx * 4, g.z + ddz * 4, 1, 0.5); return; }
    if (act.kind === "pass") {
        sim.kickPassTo(g, act.m, { lob: act.lob, err: p.passErr, paceErr: p.paceErr });
        return;
    }
    // A shot: tap under pressure, wound-up if there's time.
    const room = 1 - pressure, wantPower = dist > 9 && dist < 26 && room > 0.55 && sim.rand() < 0.3 + p.s * 0.2;
    g.chargeTo = wantPower ? 1.02 : clamp(room * 0.8, 0, 0.8) * (0.6 + sim.rand() * 0.4);
    if (g.chargeTo < 0.14) { fireShot(sim, T, g); return; }
    g.charging = true; g.charge = 0;
}

function fireShot(sim, T, g) {
    const p = T.p, dir = T.dir, b = sim.ball, k = sim.side(1 - T.id)[0], gx = dir * HL;
    // Pick the bigger side of the goal the keeper's left.
    const left = k.z + GW, right = GW - k.z;
    let z = right > left ? GW * 0.74 : -GW * 0.74;
    if (sim.rand() > lerp(0.55, 0.92, p.s)) z = -z;
    z += (sim.rand() - 0.5) * lerp(2.2, 0.5, p.s);
    let spin = 0;
    if (p.curve && sim.rand() < 0.5 && Math.abs(b.z - z) > 2) spin = Math.sign(b.z - z) * dir * 18;
    const aim = { x: gx, z };
    sim.kickShot(g, g.charge, aim, p.shotErr, spin);
}

function keeper(sim, T, g, dt) {
    const p = T.p, b = sim.ball, dir = T.dir, own = -dir * HL;
    const carried = b.owner === g;
    if (g.state === ST.HOLD) {
        g.holdT -= dt;
        if (g.holdT <= 0) keeperDistribute(sim, T, g);
        return;
    }
    if (g.state !== ST.RUN && g.state !== ST.KICK) return;
    if (carried) { keeperDistribute(sim, T, g); return; }

    // Read the flight, with a keeper's reaction lag after each touch.
    if (!b.owner && b.since >= p.gkReact && (b.vx * dir < -6)) {
        const pred = T.pred;
        for (let i = 0; i < 44; i++) {
            const x = pred[i * 3], y = pred[i * 3 + 1], z = pred[i * 3 + 2];
            if ((x - own) * dir < 1.5) {
                const tc = (i + 1) * 0.05;
                if (g.errFor !== b.lastK) { g.errFor = b.lastK; g.err = (sim.rand() - 0.5) * 2 * p.gkErr; }
                const zc = z + g.err, yc = y;
                if (Math.abs(zc) < GW + 1 && yc < GH + 0.8) {
                    const need = Math.abs(zc - g.z);
                    const bx = own + dir * 1.2;
                    if (tc < need / 12 + 0.22 && need > 1.05) {
                        // Dive.
                        g.state = ST.DIVE; g.t = 0;
                        const sp = clamp(need / Math.max(tc, 0.14), 6, 13.5), sz = Math.sign(zc - g.z);
                        g.vz = sz * sp; g.vx = (bx - g.x) * 2; g.vy = clamp(yc * 3.4, 2.5, 8.5); g.y = 0.05;
                        g.ang = sz > 0 ? 0 : Math.PI;
                        sim.emit("dive", { g, big: true });
                    } else arrive(g, bx, zc, 1, 0.3);
                    return;
                }
                break;
            }
        }
    }
    const bd = d2(b.x, b.z, own, 0);
    // Come and claim a loose ball nobody else will reach first.
    if (!b.owner && (b.x - own) * dir < 9 && Math.abs(b.z) < 9.5) {
        const mine = d2(g.x, g.z, b.x, b.z);
        let opp = 1e9;
        for (const o of sim.side(1 - T.id)) opp = Math.min(opp, d2(o.x, o.z, b.x, b.z));
        if (mine < opp * 0.85) { arrive(g, b.x, b.z, 1, 0.2); return; }
    }
    const adv = clamp(1.1 + bd * 0.05, 1.1, 3.2);
    const t = clamp(b.z / HW, -1, 1), z = t * GW * 0.86;
    arrive(g, own + dir * adv, z, 0.9, 0.7);
    if (b.owner && b.owner.team !== T.id) g.ang = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
}

export function keeperDistribute(sim, T, g) {
    const p = T.p, dir = T.dir;
    let best = null, bv = -1e9;
    for (const m of sim.side(T.id)) {
        if (m === g) continue;
        let near = 12;
        for (const o of sim.side(1 - T.id)) near = Math.min(near, d2(o.x, o.z, m.x, m.z));
        const v = near + m.x * dir * 0.06 + (sim.rand() - 0.5) * 6 * p.noise * 4;
        if (v > bv) { bv = v; best = m; }
    }
    sim.ball.y = 1;
    const far = d2(best.x, best.z, g.x, g.z) > 18;
    sim.kickPassTo(g, best, { lob: far, err: p.passErr * 0.6 });
    g.state = ST.KICK; g.t = 0;
    g.noTouch = 0.8;
}

/** Human pass assist: best mate in the stick's direction, weighted towards open and near. */
export function pickMate(sim, g, dx, dz) {
    const l = Math.hypot(dx, dz) || 1, nx = dx / l, nz = dz / l;
    let best = null, bv = -1e9;
    for (const m of sim.side(g.team)) {
        if (m === g || m.role === 0) continue;
        const mx = m.x - g.x, mz = m.z - g.z, d = Math.hypot(mx, mz) || 1, c = (mx * nx + mz * nz) / d;
        if (c < 0.1) continue;
        let near = 8;
        for (const o of sim.side(1 - g.team)) near = Math.min(near, d2(o.x, o.z, m.x, m.z));
        const v = c * 2.4 - d * 0.03 + near * 0.06;
        if (v > bv) { bv = v; best = m; }
    }
    return best;
}
