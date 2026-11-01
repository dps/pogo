// A player, written down: reads the sim, returns inputs. It drives the title screen and the balance bots.
// skill 0..1 sets how quickly and how well it sees danger, so the bots can stand in for a clumsy or a sharp player.
import { D, W } from "./data.js";

const cache = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, auto: true, dash: false };

export class Autopilot {
    constructor(sim, skill = 0.6, seed = 7) {
        this.sim = sim; this.skill = skill;
        this.state = seed >>> 0 || 1;
        this.hold = 0; this.mx = 0; this.mz = 0; this.wander = 0; this.charging = 0; this.dashWait = 0;
    }
    rnd() {
        this.state = (this.state * 1664525 + 1013904223) >>> 0;
        return this.state / 4294967296;
    }

    input(dt) {
        const sim = this.sim, p = sim.p, inp = cache;
        inp.aim = false; inp.fire = false; inp.auto = true; inp.dash = false;

        this.hold -= dt;
        if (this.hold <= 0) {
            // Reaction lag: a clumsy player re-thinks less often.
            this.hold = 0.1 + (1 - this.skill) * 0.3;
            const [mx, mz] = this.think();
            this.mx = mx; this.mz = mz;
        }
        inp.mx = this.mx; inp.mz = this.mz;

        // Dash: hold to pull in dust when hungry; pop out when crowded.
        this.dashWait -= dt;
        const close = this.crowd(3), hungry = p.hp < p.maxHp * 0.7 || p.bag < 25;
        const dustNear = this.dustNear(6);
        if (this.charging > 0) {
            this.charging -= dt;
            inp.dash = this.charging > 0;
            if (!inp.dash) this.dashWait = 1 + (1 - this.skill) * 3;
        } else if (this.dashWait <= 0 && p.dashCd <= 0) {
            if ((hungry && dustNear >= 3 && close < 3) || close >= 5 * (1.5 - this.skill)) {
                this.charging = 0.15 + (close >= 4 ? 0.1 : 0.5);
                inp.dash = true;
            }
        }
        if (sim.phase === "transit") { inp.mx = 0; inp.mz = 0; }
        return inp;
    }

    crowd(r) {
        const sim = this.sim, p = sim.p;
        let n = 0;
        sim.near(p.x, p.z, r, (e) => { if (e.born <= 0 && Math.hypot(e.x - p.x, e.z - p.z) < r + e.r) n++; });
        return n;
    }
    dustNear(r) {
        const sim = this.sim, p = sim.p;
        let n = 0;
        for (const m of sim.motes) if (Math.abs(m.x - p.x) < r && Math.abs(m.z - p.z) < r) n++;
        return n;
    }

    think() {
        const sim = this.sim, p = sim.p, sk = this.skill;
        if (sim.phase === "exit" && sim.exits?.length) {
            const e = sim.exits[this.door ?? (this.door = Math.floor(this.rnd() * sim.exits.length)) % sim.exits.length];
            return this.seek(e.x, e.z + 0.5);
        }
        this.door = undefined;
        let fx = 0, fz = 0;
        const add = (x, z, w) => { fx += x * w; fz += z * w; };
        const away = (x, z, r, w) => {
            const dx = p.x - x, dz = p.z - z, l = Math.hypot(dx, dz) || 0.01;
            if (l < r) add(dx / l, dz / l, w * (1 - l / r) * 2);
        };
        // Monsters push; the saw only covers the front, so the bot kites but does not run forever.
        for (const e of sim.foes) {
            if (e.dead || e.born > 0) continue;
            const r = e.k === "trike" ? 7 : e.k === "golem" ? 5.5 : e.k === "puff" ? 4.5 : 3.6;
            away(e.x, e.z, r, e.k === "trike" ? 3.5 : e.k === "golem" ? 1.6 : e.k === "puff" ? 1.4 : 0.55);
            if (e.k === "trike" && (e.state === "bell" || e.state === "charge") && this.rnd() < sk + 0.2) {
                const c = Math.cos(e.lockYaw), s = Math.sin(e.lockYaw), dx = p.x - e.x, dz = p.z - e.z, side = dx * -s + dz * c;
                add(-s * Math.sign(side || 1), c * Math.sign(side || 1), 5);
            }
        }
        // Dangers on the floor: marks and telegraphed hazards, seen only some of the time by clumsy bots.
        const sees = 0.35 + 0.65 * sk;
        for (const l of sim.lobs) if (this.rnd() < sees) away(l.x1, l.z1, l.r + 1.4, 4);
        for (const w of sim.rings) {
            const d = Math.hypot(p.x - w.x, p.z - w.z);
            if (w.r < d && d - w.r < 2.4 && p.dashCd <= 0 && this.rnd() < sk) { this.charging = 0.1; }
        }
        const c = sim.cat;
        if (c.state === "crouch" && this.rnd() < sees) away(c.tx, c.tz, 5, 7);
        else if (c.state === "stalk") away(c.x, c.z, 5, 2);
        for (const h of sim.hazards) {
            if (this.rnd() > sees) continue;
            if (h.kind === "cord" && (h.warn || h.active)) { const mx = (h.a[0] + h.b[0]) / 2, mz = (h.a[1] + h.b[1]) / 2; away(mx, mz, 4.5, 2); }
            if (h.kind === "jet" && (h.warn || h.active) && p.x > h.x0 - 1 && p.x < h.x1 + 1 && p.z > h.z0 - 1 && p.z < h.z1 + 1) add(0, (p.z > (h.z0 + h.z1) / 2 ? 1 : -1), 4);
            if (h.kind === "vortex" && (h.warn || h.active)) away(h.x, h.z, h.r + 1, 4);
            if (h.kind === "soap") away(h.x, h.z, 2.5, 2);
            if (h.kind === "train") for (const k of h.points) away(k.x, k.z, 3.2, 3);
            if (h.kind === "slick") away(h.x, h.z, h.r + 0.5, 0.5);
            if (h.kind === "bricks") for (const b of h.items) if (b.live) away(b.x, b.z, 1.4, 0.8);
        }
        // Pull towards the good stuff.
        let bestK = null, bd = 1e9;
        for (const k of sim.pickups) { const d = Math.hypot(k.x - p.x, k.z - p.z); if (d < bd) { bd = d; bestK = k; } }
        if (bestK) {
            const dx = bestK.x - p.x, dz = bestK.z - p.z, l = bd || 1;
            add(dx / l, dz / l, 1.2);
        }
        // Dust, then the middle of the room.
        let mx = 0, mz = 0, n = 0;
        for (const m of sim.motes) if (Math.abs(m.x - p.x) < 7 && Math.abs(m.z - p.z) < 7) { mx += m.x; mz += m.z; n++; }
        if (n) { const dx = mx / n - p.x, dz = mz / n - p.z, l = Math.hypot(dx, dz) || 1; add(dx / l, dz / l, 0.45); }
        add(-p.x / W, -p.z / D, 0.8);
        // And towards the fight when things are calm, because the saw is the fun part.
        if (p.target && !p.target.dead && p.hp > p.maxHp * 0.4) {
            const t = p.target, dx = t.x - p.x, dz = t.z - p.z, l = Math.hypot(dx, dz) || 1;
            if (l > 2.2) add(dx / l, dz / l, 0.9);
        }
        // Clumsiness: drift.
        this.wander += (this.rnd() - 0.5) * 2;
        const noise = (1 - sk) * 0.8;
        add(Math.cos(this.wander), Math.sin(this.wander), noise);
        // Furniture feelers: slide round what's ahead.
        const l = Math.hypot(fx, fz) || 1;
        fx /= l; fz /= l;
        const ahead = sim.furnAt(p.x + fx * 1.5, p.z + fz * 1.5, 0.4);
        if (ahead) {
            const sx = p.x - ahead.x, sz = p.z - ahead.z;
            if (Math.abs(sx) / (ahead.w / 2) > Math.abs(sz) / (ahead.d / 2)) { fx = Math.sign(sx) * 0.3 + fx * 0.3; fz = Math.sign(fz || sz) * 1; }
            else { fz = Math.sign(sz) * 0.3 + fz * 0.3; fx = Math.sign(fx || sx) * 1; }
            const m = Math.hypot(fx, fz) || 1; fx /= m; fz /= m;
        }
        return [fx, fz];
    }

    seek(x, z) {
        const sim = this.sim, p = sim.p;
        const d = sim.navTowards(p.x, p.z, x, z);
        return d;
    }
}
