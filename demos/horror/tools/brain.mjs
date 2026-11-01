// A patient night worker. Reads the Sim and returns one step of intent. Both the fast harness and the end-to-end run use this.
// `skill` slows the turning, adds reaction delay and wobble, so "a nervous thumb on a phone" can be measured as well as "a bot".
import { CELL, H, W } from "../data.js";
import { DOORS, LOCKERS, field, floorY, idx, isSolid, spot } from "../sim.js";

const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
export const SKILLS = {
    bot: { turn: 9, react: 0.1, wobble: 0.01 },
    steady: { turn: 5.5, react: 0.3, wobble: 0.03 },
    nervous: { turn: 3.8, react: 0.55, wobble: 0.06 },
    // First time in the building, on a phone: slow, stops to get bearings, sees a doll late.
    lost: { turn: 3.0, react: 0.8, wobble: 0.08, walk: 0.62, stop: [4, 1.3], see: 7 },
};

export function brain(sim, skill = SKILLS.bot, opts = {}) {
    const me = { yaw: sim.p.yaw, pitch: sim.p.pitch, watch: null, watchT: 0, lastLightT: -9, wobbleT: 0, wy: 0, stuck: 0, lx: 0, lz: 0, tt: 0, offUntil: 0, hideUntil: 0, useCd: 0 };
    return (dt) => {
        const p = sim.p, st = sim.current;
        const out = { mx: 0, my: 0, yaw: me.yaw, pitch: me.pitch, light: false, use: false, useDown: false };
        me.tt += dt;
        me.useCd -= dt;
        if (opts.mode === "idle") { out.light = st?.kind === "light" && !p.light; return out; }
        if (opts.mode === "yield") return yieldStep(sim, me, out, dt);
        const target = st?.kind === "sweep" ? null : goal(sim, st);
        // In the sweep the only move is a locker.
        if (st?.kind === "sweep") {
            if (p.hide >= 0) return out;
            const l = nearestLocker(sim);
            const g = [l.x + l.face[0] * 1.6, l.z + l.face[1] * 1.6];
            const lookAt = [l.x, l.z];
            steer(sim, me, out, g, dt, skill);
            aimAt(me, p, lookAt[0], 1.3 + p.y, lookAt[1], dt, skill, out);
            const pr = sim.prompt;
            if ((pr?.type === "hide" || (pr?.type === "door" && !pr.d.open)) && me.useCd <= 0) { out.use = true; me.useCd = 0.5; }
            return out;
        }
        if (p.hide >= 0) { if (me.useCd <= 0) { out.use = true; me.useCd = 1; } return out; }
        // Who is the worst threat I can see or hear? Reaction lag: only dolls that have been a problem for `react` seconds count.
        const threats = sim.dolls.filter((d) => d.awake && Math.hypot(d.x - p.x, d.z - p.z) < (skill.see ?? 9) && Math.abs(d.y - p.y) < 1.5);
        const score = (d) => dist(d, p) + (d.lit ? 2.5 : 0);
        const plains = threats.filter((d) => d.kind === "plain").sort((a, b) => score(a) - score(b));
        const blinds = threats.filter((d) => d.kind === "blind").sort((a, b) => dist(a, p) - dist(b, p));
        const plain = plains[0], blindNear = blinds[0];
        if (plain && plain !== me.watch) { me.watch = plain; me.watchT = me.tt; }
        const aware = plain && me.tt - me.watchT > skill.react;
        const s = st?.at ? spot(st.at) : null;
        const scanning = st?.kind === "scan" && sim.sees(p.x, p.z, s.x + (s.face?.[0] ?? 0) * 0.1, s.z + (s.face?.[1] ?? 0) * 0.1) && Math.hypot(s.x - p.x, s.z - p.z) < 11;
        const wantOff = blindNear && dist(blindNear, p) < 3.8 && (!plain || dist(plain, p) > dist(blindNear, p) + 1.5) && !(scanning && dist(blindNear, p) > 2.4);
        // Light discipline.
        const wantLight = st?.kind === "light" || !wantOff;
        if (wantLight !== p.light && me.tt - me.lastLightT > 0.35) { out.light = true; me.lastLightT = me.tt; }
        // A scan needs the beam on the card, so point at it once it's in sight and worry later.
        const crowded = plain && dist(plain, p) < 3.2;
        if (scanning && !crowded) aimAt(me, p, s.x, floorY(s.x, s.z) + s.y, s.z, dt, skill, out);
        else if (aware && sim.sees(p.x, p.z, plain.x, plain.z)) aimAt(me, p, plain.x, plain.y + 0.7, plain.z, dt, skill, out);
        else {
            // No one to watch: look where you walk, with a glance towards a footstep behind you.
            const look = lookAhead(sim, target);
            aimAt(me, p, look[0], p.y + 1.45, look[1], dt, skill, out);
        }
        // Shut a door behind me? The bot only opens what blocks it.
        const near = target && Math.hypot(target[0] - p.x, target[1] - p.z);
        const atGoal = near < 0.5;
        if (!atGoal) steer(sim, me, out, target, dt, skill);
        if (skill.stop) {
            const cycle = skill.stop[0] + skill.stop[1];
            if (me.tt % cycle > skill.stop[0] && !(plain && dist(plain, p) < 3)) { out.mx = 0; out.my = 0; }
            out.mx *= skill.walk; out.my *= skill.walk;
        }
        else if (s && st.kind !== "scan") aimAt(me, p, s.x, p.y + 1.1, s.z, dt, skill, out);
        const pr = sim.prompt;
        if (pr?.type === "door" && !pr.d.open && me.useCd <= 0 && blocks(sim, pr.d)) { out.use = true; me.useCd = 0.6; }
        if (pr?.type === "task") {
            if (st.kind === "hold") { out.useDown = true; } else if (me.useCd <= 0) { out.use = true; me.useCd = 0.4; }
        }
        return out;
    };
}

const dist = (d, p) => Math.hypot(d.x - p.x, d.z - p.z);

function blocks(sim, d) {
    return true;
}

function goal(sim, st) {
    if (!st) return null;
    if (st.kind === "light") return [sim.p.x, sim.p.z];
    const s = spot(st.at);
    // A spot on open floor beside the target.
    let best = null, bv = 1e9, f = null;
    const p = sim.p;
    for (let a = 0; a < 12; a++) {
        const r = st.kind === "scan" ? 3.2 : 1.5, x = s.x + Math.cos(a * 0.5236) * r, z = s.z + Math.sin(a * 0.5236) * r, cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
        if (isSolid(cx, cz) || cz < 0 || cz >= H) continue;
        if (st.kind === "scan" && !sim.sees(x, z, s.x + (s.face?.[0] ?? 0) * 0.1, s.z + (s.face?.[1] ?? 0) * 0.1)) continue;
        f = field(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
        const v = f[idx(cx, cz)];
        if (v >= 0 && v < bv) { bv = v; best = [x, z]; }
    }
    return best ?? [s.x, s.z];
}

// Dijkstra over the grid, with awake dolls as hills to walk around. Replanned a few times a second.
const plans = new WeakMap();
function nextCell(sim, target) {
    const p = sim.p, cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL), tx = Math.floor(target[0] / CELL), tz = Math.floor(target[1] / CELL);
    if (cx === tx && cz === tz) return target;
    let pl = plans.get(sim);
    if (!pl || sim.t - pl.t > 0.25 || pl.key !== idx(tx, tz)) {
        const cost = new Float32Array(W * H).fill(1e9), from = idx(tx, tz), open = [from], hill = new Float32Array(W * H);
        for (const d of sim.dolls) {
            if (!d.awake) continue;
            const dx0 = Math.floor(d.x / CELL), dz0 = Math.floor(d.z / CELL);
            for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
                const x = dx0 + a, z = dz0 + b;
                if (x >= 0 && z >= 0 && x < W && z < H) hill[idx(x, z)] += (d.frozen ? 5 : 9) / (1 + a * a + b * b);
            }
        }
        cost[from] = 0;
        while (open.length) {
            let bi = 0;
            for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
            const c = open[bi];
            open[bi] = open[open.length - 1];
            open.pop();
            const x = c % W, z = (c - x) / W;
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + a, nz = z + b;
                if (nx < 0 || nz < 0 || nx >= W || nz >= H || isSolid(nx, nz)) continue;
                const n = idx(nx, nz), v = cost[c] + 1 + hill[n];
                if (v < cost[n]) { cost[n] = v; open.push(n); }
            }
        }
        pl = { t: sim.t, key: from, cost };
        plans.set(sim, pl);
    }
    let best = pl.cost[idx(cx, cz)], at = target;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = pl.cost[idx(cx + a, cz + b)];
        if (n < best && !isSolid(cx + a, cz + b)) { best = n; at = [(cx + a + 0.5) * CELL, (cz + b + 0.5) * CELL]; }
    }
    return at;
}

function lookAhead(sim, target) {
    if (!target) return [sim.p.x, sim.p.z - 1];
    const n = nextCell(sim, target);
    return n;
}

function steer(sim, me, out, target, dt, skill) {
    const p = sim.p, n = nextCell(sim, target);
    const dx = n[0] - p.x, dz = n[1] - p.z, l = Math.hypot(dx, dz) || 1;
    const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw), rx = -fz, rz = fx;
    let mx = (dx * rx + dz * rz) / l, my = -(dx * fx + dz * fz) / l;
    // The stick is held like a thumb holds it, slightly off.
    me.lx = p.x; me.lz = p.z;
    out.mx = mx; out.my = my;
    // A shut door ahead needs facing.
    const cx = Math.floor(n[0] / CELL), cz = Math.floor(n[1] / CELL), door = sim.doorAt(cx, cz);
    if (door && !door.open) aimAt(me, p, n[0], p.y + 1.3, n[1], dt, skill, out);
}

function aimAt(me, p, x, y, z, dt, skill, out) {
    me.wobbleT -= dt;
    if (me.wobbleT <= 0) { me.wobbleT = 0.4; me.wy = (Math.random() - 0.5) * skill.wobble * 2; }
    const dx = x - p.x, dz = z - p.z, dy = y - (p.y + 1.55), yaw = Math.atan2(-dx, -dz) + me.wy, pitch = Math.atan2(dy, Math.hypot(dx, dz));
    const dYaw = wrap(yaw - me.yaw), max = skill.turn * dt;
    me.yaw += Math.max(-max, Math.min(max, dYaw));
    me.pitch += Math.max(-max, Math.min(max, pitch - me.pitch));
    out.yaw = me.yaw; out.pitch = me.pitch;
}

function nearestLocker(sim) {
    const p = sim.p, f = field(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
    let best = LOCKERS[0], v = 1e9;
    for (const l of LOCKERS) {
        const n = f[idx(l.cx + l.face[0], l.cz + l.face[1])];
        if (n >= 0 && n < v) { v = n; best = l; }
    }
    return best;
}

function yieldStep(sim, me, out, dt) {
    // Turn the torch off and stand still until they come.
    if (sim.p.light && me.lastLightT < 0) { out.light = true; me.lastLightT = 1; }
    if (me.lastLightT === -9) { out.light = sim.p.light; me.lastLightT = 1; }
    return out;
}
