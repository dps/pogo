// The proving pilot. It flies through the real input path (the virtual stick) with no knowledge the player lacks:
// it reads the world, climbs in chimney smoke when it is low, and threads its way to a point in the air.
import { ground, ribbons, thermals, touch } from "../world.js";
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const clamp = (v, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export class Pilot {
    constructor(game) { this.game = game; this.lift = null; this.dir = 1; this.stuck = 0; }
    free(x, y, z, r) { return y - Math.max(ground(x, z), 0.4) > r + 2 && !touch(x, y, z, r + 1.5); }
    /** How far along this heading the air is clear. */
    probe(f, yaw, pitch = 0) {
        const dx = -Math.sin(yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = -Math.cos(yaw) * Math.cos(pitch);
        for (let d = 6; d <= 54; d += 6) if (!this.free(f.x + dx * d, f.y + dy * d, f.z + dz * d, 2)) return d;
        return 60;
    }
    lineClear(f, T) {
        const d = Math.hypot(T[0] - f.x, T[1] - f.y, T[2] - f.z), n = Math.ceil(d / 3);
        if (d > 80) return false;
        for (let i = 1; i < n; i++) { const k = i / n; if (!this.free(f.x + (T[0] - f.x) * k, f.y + (T[1] - f.y) * k, f.z + (T[2] - f.z) * k, 0.2)) return false; }
        return true;
    }
    /** One control tick towards [x, y, z]. needClimb: refuse to go on until this height is banked. */
    steer(f, T, opts = {}) {
        const dx = T[0] - f.x, dz = T[2] - f.z, dist = Math.hypot(dx, dz), glide = 8, y = f.y;
        let want = T, sx = 0, sy = 0, mode = "go";
        const need = T[1] + Math.max(0, dist - 40) / glide + (opts.margin ?? 2);
        if (this.lift?.rib !== undefined) {
            const R = this.lift.rib; let bi = 0, bd = 1e9;
            for (let i = 0; i < R.pts.length; i += 2) { const q = R.pts[i], e = Math.hypot(q[0] - f.x, q[1] - f.y, q[2] - f.z); if (e < bd) { bd = e; bi = i; } }
            if (bi >= R.pts.length - 6 || (f.y > need + 6 && bi > 8)) { this.lift = null; this.rest = 90; }
            else {
                const q = R.pts[Math.min(R.pts.length - 1, bi + (bd < R.width ? 6 : 1))];
                if (bd < R.width) { this.game.input.setStick(0, 0); return "ribbon"; }
                return this.fly(f, q, q, "ribbon");
            }
        }
        if (this.lift && (y >= Math.min(this.lift.top - 4, need + 12) || (dist < 30 && y > T[1] - 8))) this.lift = null;
        if (this.rest > 0) this.rest--;
        if (!this.lift && !(this.rest > 0) && !(opts.noLift && y > T[1] - 4) && y < need - 1 && (dist > 34 || y < T[1] - 8)) { this.lift = this.findLift(f, T, need); this.bestY = -1; this.liftT = 0; }
        return this.fly(f, T, null, null, need);
    }
    fly(f, T, ribbonPoint, forced) {
        const dx = T[0] - f.x, dz = T[2] - f.z, dist = Math.hypot(dx, dz), y = f.y, vt = f.cfg.vt;
        let sx = 0, sy = 0, mode = forced ?? "go";
        let goalYaw = Math.atan2(-dx, -dz);
        if (this.lift && !forced) {
            mode = "lift";
            const L = this.lift, ld = Math.hypot(L.x - f.x, L.z - f.z);
            const toward = Math.atan2(-(L.x - f.x), -(L.z - f.z));
            goalYaw = toward + this.dir * 1.45 * Math.max(0, Math.min(1, 1 - (ld - 12) / 16));
            this.liftT = (this.liftT ?? 0) + 1 / 60;
            if (y > (this.bestY ?? -1) + 1) { this.bestY = y; this.liftT = 0; }
            if (this.liftT > 9) { this.give = (this.give ?? 0) + 1; this.lift = null; this.liftT = 0; this.bestY = -1; this.rest = 200; }
        }
        // Pick the clearest heading close to where we want to go.
        const pitchNow = f.gamma;
        let bestYaw = goalYaw, bestScore = -1e9;
        const line = (!this.lift || forced) && this.lineClear(f, T);
        if (!line) for (const off of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8, 1.2, -1.2, 1.7, -1.7, 2.3, -2.3]) {
            const yaw = goalYaw + off, room = this.probe(f, yaw, pitchNow), s = Math.min(room, Math.max(24, f.speed * 2)) * 2.2 - Math.abs(off) * 8 - Math.abs(wrap(yaw - f.yaw)) * 5;
            if (s > bestScore) { bestScore = s; bestYaw = yaw; }
        }
        const err = wrap(bestYaw - f.yaw);
        sx = clamp(-err * 1.8);
        // Height: hold the glide; nose down if far too high near the goal, pull if something is close below or ahead.
        const fh = this.probe(f, f.yaw, pitchNow), above = y - T[1], close = Math.hypot(dist, above);
        const slope = Math.atan2(T[1] - y, Math.max(6, dist));
        if (mode === "go") {
            const gerr = slope - f.gamma;
            sy = dist < 90 ? clamp(gerr * 2.2, -0.9, 0.45) : above > 30 ? -0.25 : 0;
        } else sy = 0;
        const clearance = f.clearance;
        if (clearance < 6) sy = Math.max(sy, 0.5);
        if (!line && fh < 18 && f.speed > vt * 0.7) sy = Math.max(sy, 0.55);
        if (f.speed < vt * 0.68) sy = Math.min(sy, -0.2);
        this.game.input.setStick(sx, -sy);
        return mode;
    }
    /** Precise flying down a known line, with no thought for anything else: threading a gap. */
    thread(f, T) {
        const dx = T[0] - f.x, dz = T[2] - f.z, dist = Math.hypot(dx, dz), err = wrap(Math.atan2(-dx, -dz) - f.yaw), gerr = Math.atan2(T[1] - f.y, Math.max(4, dist)) - f.gamma;
        this.game.input.setStick(clamp(-err * 3.2), -clamp(gerr * 5, -0.8, 0.8));
        return "thread";
    }
    findLift(f, T, need) {
        let best = null, score = 1e9;
        const direct = Math.hypot(T[0] - f.x, T[2] - f.z);
        for (const R of ribbons) {
            const a = R.pts[0], e = R.pts[R.pts.length - 1], d = Math.hypot(a[0] - f.x, a[2] - f.z), left = Math.hypot(e[0] - T[0], e[2] - T[2]);
            if (left > direct - 40 || f.y - d / 7 - a[1] < -14 || e[1] - left / 8 < T[1] - 4) continue;
            const s = d + left * 0.5;
            if (s < score) { score = s; best = { rib: R, x: a[0], z: a[2], top: 999 }; }
        }
        if (best) return best;
        for (const t of thermals) {
            const d = Math.hypot(t.x - f.x, t.z - f.z), arrive = f.y - d / 7 - ground(t.x, t.z);
            if (arrive < 3) continue;
            const s = d * 0.55 + Math.hypot(t.x - T[0], t.z - T[2]) + (t.top < T[1] + 6 ? 120 : 0);
            if (s < score) { score = s; best = t; }
        }
        if (!best) { // Nothing in reach: head for the nearest anyway.
            for (const t of thermals) { const d = Math.hypot(t.x - f.x, t.z - f.z); if (d < score) { score = d; best = t; } }
        }
        this.dir = Math.random?.() ? 1 : 1;
        return best;
    }
}
