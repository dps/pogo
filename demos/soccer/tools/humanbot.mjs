// A stand-in player. It only touches the stick and two buttons, with human reaction delay and sloppy aim.
// `level` 0 = first-timer mashing, 1 = casual, 2 = keen.
import { xg } from "../ai.js";
const segd = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };

/** Level 4: a good player. Reads the same things the AI reads, but still only has a stick and two buttons. */
function expert(seed) {
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const st = { next: 0, mx: 0, mz: 0, hold: 0, holdA: 0 };
    return (sim, h) => {
        const dt = sim.dt, g = h.goat, b = sim.ball, dir = sim.teams[h.team].dir;
        st.next -= dt;
        if (st.hold > 0) { st.hold -= dt; h.b = st.hold > 0; } else h.b = false;
        if (st.holdA > 0) { st.holdA -= dt; h.a = st.holdA > 0; } else h.a = false;
        if (st.next <= 0 && st.hold <= 0) {
            st.next = 0.1;
            const opp = sim.nearestOpp(g), pr = opp ? opp.d : 9, foes = sim.side(1 - h.team);
            let tx = b.x + b.vx * 0.3, tz = b.z + b.vz * 0.3;
            if (b.owner === g) {
                const here = xg(sim, h.team, b.x, b.z, dir), k = foes[0];
                tx = dir * 24; tz = (k.z > 0 ? -1 : 1) * 3;
                let best = null, bv = here * 1.1 + (b.x * dir + 24) / 96;
                for (const m of sim.side(h.team)) {
                    if (m === g || m.role === 0) continue;
                    let lane = 9, open = 9;
                    for (const o of foes) { lane = Math.min(lane, segd(o.x, o.z, g.x, g.z, m.x, m.z)); open = Math.min(open, Math.hypot(o.x - m.x, o.z - m.z)); }
                    const v = (xg(sim, h.team, m.x, m.z, dir) * 1.1 + (m.x * dir + 24) / 96) * (lane > 2 && open > 3 ? 1 : 0.4) + (pr < 3.2 ? 0.1 : 0);
                    if (v > bv) { bv = v; best = m; }
                }
                if (here > 0.2 || (here > 0.12 && pr < 3)) { st.hold = pr > 4 ? 0.82 : pr > 2.8 ? 0.3 : 0.1; h.b = true; tz = tz * 1.4; }
                else if (best) { tx = best.x + best.vx * 0.3; tz = best.z + best.vz * 0.3; st.holdA = 0.05; h.a = true; }
                else if (opp && pr < 4.5) tz = g.z + (opp.goat.z > g.z ? -8 : 8);
            } else if (b.owner) {
                const c = b.owner, d = Math.hypot(c.x - g.x, c.z - g.z);
                tx = c.x + c.vx * 0.25 - dir * 0.8; tz = c.z + c.vz * 0.25;
                if (d < 2.6 && g.cool <= 0 && c.role !== 0) { h.b = true; st.hold = 0.05; }
            }
            const dx = tx - g.x, dz = tz - g.z, l = Math.hypot(dx, dz) || 1;
            st.mx = l > 0.5 ? dx / l : 0; st.mz = l > 0.5 ? dz / l : 0;
        }
        h.mx = st.mx; h.mz = st.mz;
    };
}

export function makeBot(level = 1, seed = 1) {
    if (level === 4) return expert(seed);
    let s = seed * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    const react = [0.34, 0.24, 0.16, 0.13][level], wob = [0.5, 0.3, 0.14, 0.08][level];
    const st = { next: 0, mx: 0, mz: 0, a: false, b: false, hold: 0, holdA: 0, cool: 0 };
    return (sim, h) => {
        const dt = sim.dt, g = h.goat, b = sim.ball, dir = sim.teams[h.team].dir;
        st.next -= dt; st.cool -= dt;
        if (st.hold > 0) { st.hold -= dt; h.b = st.hold > 0; }
        else h.b = false;
        if (st.holdA > 0) { st.holdA -= dt; h.a = st.holdA > 0; } else h.a = false;
        if (st.next <= 0 && st.hold <= 0) {
            st.next = react * (0.7 + rnd() * 0.6);
            let tx = b.x, tz = b.z;
            const opp = sim.nearestOpp(g);
            if (b.owner === g) {
                tx = dir * 24; tz = g.z * 0.3 + (rnd() - 0.5) * 5;
                const d = Math.hypot(tx - g.x, g.z);
                if (opp && opp.d < 4 && Math.abs(opp.goat.z - g.z) < 3) tz += opp.goat.z > g.z ? -9 : 9;
                if (level === 3) {
                    // Ace: looks for the pass, winds up the power shot when there's room, shoots away from the keeper.
                    const k = sim.side(1 - h.team)[0];
                    tz = (k.z > 0 ? -1 : 1) * 3;
                    if (d < 17 && st.cool <= 0 && (!opp || opp.d > 3.2 || d < 9)) { st.hold = opp && opp.d < 4.5 ? 0.25 : 0.82; h.b = true; st.cool = 1; st.mz = 0; h.mz = 0; }
                    else if (opp && opp.d < 3.6) { st.holdA = 0.05; h.a = true; }
                } else
                if (d < [13, 15, 18][level] && st.cool <= 0) { st.hold = (level === 2 && rnd() < 0.4 ? 0.8 : 0.1 + rnd() * 0.5); h.b = true; st.cool = 1; }
                else if (opp && opp.d < 3.4 && rnd() < [0.2, 0.3, 0.45, 0.6][level]) { st.holdA = 0.05; h.a = true; }
                else if (rnd() < [0.04, 0.09, 0.13, 0.08][level]) { st.holdA = 0.05; h.a = true; }
            } else if (b.owner) {
                const d = Math.hypot(b.owner.x - g.x, b.owner.z - g.z);
                tx = b.owner.x + b.owner.vx * 0.2; tz = b.owner.z + b.owner.vz * 0.2;
                if (d < 3 && g.cool <= 0 && rnd() < [0.4, 0.5, 0.7, 0.85][level]) { h.b = true; st.hold = 0.05; }
                else if (d < 4.6 && d > 2.8 && g.cool <= 0 && rnd() < 0.1) { st.holdA = 0.05; h.a = true; }
            } else {
                tx = b.x + b.vx * 0.3; tz = b.z + b.vz * 0.3;
            }
            const dx = tx - g.x, dz = tz - g.z, l = Math.hypot(dx, dz) || 1, a = Math.atan2(dz, dx) + (rnd() - 0.5) * wob;
            st.mx = l > 0.6 ? Math.cos(a) : 0; st.mz = l > 0.6 ? Math.sin(a) : 0;
        }
        h.mx = st.mx; h.mz = st.mz;
    };
}
