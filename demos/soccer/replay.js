// Goal replays. A ring buffer of the whole match state at 30 Hz, a player that drives the rigs from it,
// and a compact base64 clip so the best goals survive in the save.
import { GH, GW, HL, clamp, lerp } from "./sim.js";

const PER = 8, BALL = 6, CRIT = 4;            // floats per goat, ball, critter
export const FRAME = PER * 10 + BALL + CRIT * 6;
const CAP = 30 * 9;

export class Recorder {
    constructor(sim) { this.sim = sim; this.buf = new Float32Array(FRAME * CAP); this.n = 0; this.tick = 0; }
    capture() {
        if (this.tick++ % 2) return;
        const s = this.sim, o = (this.n % CAP) * FRAME, b = this.buf;
        let i = o;
        for (const g of s.goats) {
            b[i] = g.x; b[i + 1] = g.y; b[i + 2] = g.z; b[i + 3] = g.ang; b[i + 4] = g.state; b[i + 5] = g.t; b[i + 6] = g.charging ? 0.5 + Math.min(g.charge, 1) : Math.hypot(g.vx, g.vz) / 10 * -1; b[i + 7] = g.tumble;
            i += PER;
        }
        const k = s.ball; b[i] = k.x; b[i + 1] = k.y; b[i + 2] = k.z; b[i + 3] = k.rot[0]; b[i + 4] = k.rot[1]; b[i + 5] = k.rot[2]; i += BALL;
        for (let c = 0; c < 6; c++) { const q = s.critters[c]; if (q) { b[i] = q.x; b[i + 1] = q.z; b[i + 2] = q.ang; b[i + 3] = q.fall; } i += CRIT; }
        this.n++;
    }
    /** The last `sec` seconds, oldest first, as one Float32Array. */
    tail(sec) {
        const want = Math.min(this.n, Math.min(CAP, Math.round(sec * 30))), out = new Float32Array(want * FRAME);
        for (let f = 0; f < want; f++) {
            const src = ((this.n - want + f) % CAP) * FRAME;
            out.set(this.buf.subarray(src, src + FRAME), f * FRAME);
        }
        return out;
    }
}

export function encodeClip(fr) {
    // 15 Hz, last 5.5 s, int16 at 1/100ths of a unit.
    const frames = Math.floor(fr.length / FRAME), keep = Math.min(frames, 165), start = frames - keep, n = Math.ceil(keep / 2);
    const out = new Int16Array(n * FRAME);
    for (let f = 0; f < n; f++) for (let i = 0; i < FRAME; i++) out[f * FRAME + i] = clamp(Math.round(fr[(start + f * 2) * FRAME + i] * 100), -32000, 32000);
    const u = new Uint8Array(out.buffer);
    let s = ""; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
}

export function decodeClip(str) {
    const s = atob(str), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    const q = new Int16Array(u.buffer), n = q.length / FRAME, out = new Float32Array(Math.max(0, (n - 1) * 2 + 1) * FRAME);
    for (let f = 0; f < n; f++) {
        for (let i = 0; i < FRAME; i++) {
            out[f * 2 * FRAME + i] = q[f * FRAME + i] / 100;
            if (f < n - 1) { const isDiscrete = i < PER * 10 && (i % PER === 4); out[(f * 2 + 1) * FRAME + i] = isDiscrete ? q[f * FRAME + i] / 100 : (q[f * FRAME + i] + q[(f + 1) * FRAME + i]) / 200; }
        }
    }
    return out;
}

export class Player {
    constructor(fr, view, o = {}) {
        this.fr = fr; this.view = view; this.n = Math.floor(fr.length / FRAME); this.t = 0; this.f = 0; this.side = o.side ?? 1; this.o = o; this.cutDone = false; this.closeAt = Math.max(0, this.n - 2.2 * 30);
        this.view.W.ball.hidden = false;
        view.W.marker.hidden = view.W.chev.hidden = view.W.marker2.hidden = view.W.chev2.hidden = view.W.arrow.hidden = view.W.mate.hidden = view.W.landing.hidden = view.W.ballGlow.hidden = true;
        for (const e of view.W.stars) e.hidden = true;
        view.W.snapCam = true; view.W.cam.zoom = 1.25;
    }
    /** Returns true when finished. */
    step(dt, W) {
        this.t += dt;
        const close = this.f >= this.closeAt;
        this.f += dt * 30 * (close ? 0.42 : 0.9);
        const hold = this.n + 0.5 * 30 / 0.42;
        if (this.f >= hold) return true;
        const f = Math.min(this.f, this.n - 1.001), i0 = Math.floor(f), k = f - i0, A = i0 * FRAME, B = (i0 + 1) * FRAME, r = this.fr;
        const L = (i) => r[A + i] + (r[B + i] - r[A + i]) * k;
        const ang = (i) => { let d = r[B + i] - r[A + i]; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return r[A + i] + d * k; };
        for (let g = 0; g < 10; g++) {
            const o = g * PER, c = r[A + o + 6], charging = c > 0;
            W.syncGoat(g, { x: L(o), y: L(o + 1), z: L(o + 2), ang: ang(o + 3), state: Math.round(r[A + o + 4]), t: L(o + 5), speed: charging ? 0 : -c * 10, charge: charging ? c - 0.5 : 0, charging, tumble: L(o + 7) }, dt);
        }
        const o = PER * 10, bx = L(o), by = L(o + 1), bz = L(o + 2), vx = (r[B + o] - r[A + o]) * 30, vz = (r[B + o + 2] - r[A + o + 2]) * 30;
        W.syncBall({ x: bx, y: by, z: bz, rx: L(o + 3), ry: L(o + 4), rz: L(o + 5), vx, vz }, dt);
        const co = o + BALL;
        this.view.critters.forEach((e, c) => { const q = co + c * CRIT; this.view.syncCritter(e, L(q), L(q + 1), L(q + 2), L(q + 3), true, dt); });
        if (Math.hypot(vx, vz) > 24 && this.f % 1 < 0.5) W.addTrail(bx, by, bz, 0.7, "#fff6e0");
        if (close) {
            if (!this.cutDone) { this.cutDone = true; W.snapCam = true; this.view.s.flash("#ffffff", 0.08); }
            // Low behind the goal, watching it come in.
            const sx = this.side, ex = sx * (HL + 3.3), ez = clamp(bz, -GW, GW) * 0.45 + 1.6 * sx, ey = 2.1;
            W.setCam(W.snapCam, ex, ey, ez, lerp(bx, sx * HL, 0.4), clamp(by, 0.6, GH), bz * 0.8);
            W.snapCam = false;
            this.view.s.cam3.fov = 46;
        } else {
            W.camera({ x: bx, z: bz, vx: vx * 0.4, vz: vz * 0.4 }, dt, { zoom: 1.3 });
        }
        return false;
    }
}

