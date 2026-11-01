// Thousands of bullets in plain typed arrays, stepped in one loop and drawn in one batch from one atlas.
// Slots are stable, so stained-glass panes can hold on to the bullets at their corners.
import { ACOLS, AROWS, BEAD, DASH, GLOW, MOTE, ORB, PEARL, PEARLB, PETAL, RING, SEED, SHARD, STAR, HUES, MOTHB } from "./art.js";

export const MAX = 6000, MAX_PANES = 1600, MAX_MOTES = 6000, MAX_FX = 1400;
export const FIELD_W = 360;
const DT = 1 / 60;
const TAU = Math.PI * 2;

// Hit radius is smaller than what you see: the glow never kills. Visible quad size in px at size 1.
export const HIT = new Float32Array(16), VIS = new Float32Array(16);
for (const [k, h, v] of [[PEARLB, 3.4, 24], [BEAD, 2.8, 22], [PETAL, 3, 30], [SHARD, 2.8, 30], [SEED, 3, 26], [STAR, 3, 28], [ORB, 9.5, 42], [DASH, 2.4, 30], [MOTHB, 3.2, 30]]) { HIT[k] = h; VIS[k] = v; }
const TURNS = new Uint8Array(16); for (const k of [PETAL, SHARD, SEED, DASH, MOTHB]) TURNS[k] = 1;

export const F_MARCH = 1, F_BOUNCE = 2, F_ENTER = 4, F_GRAZED = 8, F_REAIM = 16, F_SPIN = 32, F_GRAV = 64, F_DRIP = 128;

export class Bullets {
    constructor() {
        const f = () => new Float32Array(MAX);
        this.x = f(); this.y = f(); this.vx = f(); this.vy = f(); this.spd = f(); this.ang = f(); this.acc = f(); this.minS = f(); this.maxS = f(); this.w = f();
        this.age = f(); this.wait = f(); this.size = f(); this.wob = f(); this.wobF = f(); this.turn = f(); this.spd2 = f(); this.life = f(); this.fall = f();
        this.kind = new Uint8Array(MAX); this.hue = new Uint8Array(MAX); this.flags = new Uint8Array(MAX); this.live = new Uint8Array(MAX); this.gen = new Uint16Array(MAX);
        this.free = new Int32Array(MAX); this.nfree = 0; this.hi = 0; this.count = 0; this.peak = 0;
        // Panes: three corners, each a slot and its generation, plus a color.
        this.pa = new Int32Array(MAX_PANES); this.pb = new Int32Array(MAX_PANES); this.pc = new Int32Array(MAX_PANES); this.pg = new Uint32Array(MAX_PANES * 3); this.ph = new Uint8Array(MAX_PANES); this.pz = new Float32Array(MAX_PANES); this.np = 0;
        this.w0 = 360; this.h0 = 640; this.march = 1; this.gravity = null;
        const c = HUES.map((h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; });
        this.rgb = c; this.m = new Float32Array([1, 0, 0, 1, 0, 0]); this.tri = new Array(6).fill(0);
    }
    clear() { this.live.fill(0); this.hi = 0; this.nfree = 0; this.count = 0; this.np = 0; }

    /** Returns a slot, or -1 when full. Patterns are authored well under MAX. */
    add(x, y, spd, ang, o) {
        let i;
        if (this.nfree > 0) i = this.free[--this.nfree]; else if (this.hi < MAX) i = this.hi++; else return -1;
        this.x[i] = x; this.y[i] = y; this.spd[i] = spd; this.ang[i] = ang;
        const c = Math.cos(ang), s = Math.sin(ang); this.vx[i] = c * spd; this.vy[i] = s * spd;
        this.acc[i] = o.acc ?? 0; this.minS[i] = o.minS ?? 0; this.maxS[i] = o.maxS ?? 900; this.w[i] = o.w ?? 0; this.age[i] = 0; this.wait[i] = o.wait ?? 0;
        this.size[i] = o.size ?? 1; this.wob[i] = o.wob ?? 0; this.wobF[i] = o.wobF ?? 0; this.turn[i] = o.turn ?? 0; this.spd2[i] = o.spd2 ?? spd; this.life[i] = o.life ?? 18; this.fall[i] = o.fall ?? 0;
        this.kind[i] = o.kind ?? PEARLB; this.hue[i] = o.hue ?? 3; this.flags[i] = o.flags ?? 0; this.live[i] = 1; this.gen[i] = (this.gen[i] + 1) & 65535;
        this.count++; if (this.count > this.peak) this.peak = this.count;
        return i;
    }
    kill(i) { if (!this.live[i]) return; this.live[i] = 0; this.count--; this.free[this.nfree++] = i; }

    /** A triangle of colored glass held between three live bullets. It never hurts; it is just the light between them. */
    pane(a, b, c, hue, shade = 1) {
        if (this.np >= MAX_PANES || a < 0 || b < 0 || c < 0) return;
        const n = this.np++; this.pa[n] = a; this.pb[n] = b; this.pc[n] = c; this.pg[n * 3] = this.gen[a]; this.pg[n * 3 + 1] = this.gen[b]; this.pg[n * 3 + 2] = this.gen[c]; this.ph[n] = hue; this.pz[n] = shade;
    }

    /**
     * One step. p is the moth: { x, y, hitR, grazeR, solid }. Returns nothing; fills hit, grazes and danger.
     * dt is the song-locked step, so bullets stay on the beat even if frames are dropped.
     */
    step(dt, p, onGraze) {
        const { x, y, vx, vy, spd, ang, acc, minS, maxS, w, age, wait, wob, wobF, turn, spd2, life, fall, kind, flags, live, hi } = this;
        const W = this.w0, H = this.h0, mg = 56, mx = this.march, g = this.gravity;
        const px = p.x, py = p.y, hitR = p.hitR, grazeR = p.grazeR, sx = p.lastX, sy = p.lastY, moved = (px - sx) ** 2 + (py - sy) ** 2 > 1;
        let danger = 0, hit = false, top = 0;
        for (let i = 0; i < hi; i++) {
            if (!live[i]) continue;
            top = i + 1;
            const a = (age[i] += dt);
            const fl = flags[i];
            if (a > life[i]) { this.kill(i); continue; }
            if (wait[i] > 0) {
                wait[i] -= dt;
                if (wait[i] <= 0) {
                    spd[i] = spd2[i];
                    let t = ang[i] + turn[i];
                    if (fl & F_REAIM) t = Math.atan2(py - y[i], px - x[i]) + turn[i];
                    ang[i] = t; vx[i] = Math.cos(t) * spd[i]; vy[i] = Math.sin(t) * spd[i];
                }
            } else {
                let cur = false;
                if (fall[i] !== 0) {
                    // Seeds and dew: real falling, with a sway. Heading is only read for drawing.
                    let v = vy[i] + fall[i] * dt; if (v > maxS[i]) v = maxS[i]; vy[i] = v;
                    if (wob[i] !== 0) vx[i] += wob[i] * Math.cos(a * wobF[i]) * dt;
                    vx[i] *= 0.992; spd[i] = Math.hypot(vx[i], v);
                } else {
                if (acc[i] !== 0) { let s = spd[i] + acc[i] * dt; if (s > maxS[i]) s = maxS[i]; else if (s <= minS[i]) { s = minS[i]; if (fl & F_DRIP) { fall[i] = turn[i]; acc[i] = 0; maxS[i] = spd2[i]; } } spd[i] = s; cur = true; }
                if (w[i] !== 0) { ang[i] += w[i] * dt; cur = true; }
                if (wob[i] !== 0) { ang[i] += wob[i] * Math.cos(a * wobF[i]) * dt; cur = true; }
                if (fl & F_GRAV && g) {
                    // Everything leans towards the flame: turn the heading, a little, towards the well.
                    const d = Math.atan2(g.y - y[i], g.x - x[i]); let e = d - ang[i]; e = Math.atan2(Math.sin(e), Math.cos(e)); ang[i] += e * g.k * dt; cur = true;
                }
                if (cur) { const c = Math.cos(ang[i]), s = Math.sin(ang[i]); vx[i] = c * spd[i]; vy[i] = s * spd[i]; }
                }
                const k = fl & F_MARCH ? mx * dt : dt;
                x[i] += vx[i] * k; y[i] += vy[i] * k;
                if (fl & F_BOUNCE) {
                    let b = false;
                    if (x[i] < 0 && vx[i] < 0) { ang[i] = Math.PI - ang[i]; b = true; } else if (x[i] > W && vx[i] > 0) { ang[i] = Math.PI - ang[i]; b = true; } else if (y[i] < 0 && vy[i] < 0) { ang[i] = -ang[i]; b = true; }
                    if (b) { flags[i] &= ~F_BOUNCE; vx[i] = Math.cos(ang[i]) * spd[i]; vy[i] = Math.sin(ang[i]) * spd[i]; }
                }
            }
            const bx = x[i], by = y[i];
            if (bx < -mg || bx > W + mg || by < -mg || by > H + mg) {
                if (!(fl & F_ENTER)) { this.kill(i); continue; }
            } else if (fl & F_ENTER) flags[i] &= ~F_ENTER;
            const dx = bx - px, dy = by - py, ax = dx < 0 ? -dx : dx, ay = dy < 0 ? -dy : dy, reach = grazeR + 10;
            if (ax < 44 && ay < 44) {
                const q = dx * dx + dy * dy;
                if (q < 44 * 44 && vx[i] * dx + vy[i] * dy < 0) danger += 1;
                if (ax < reach && ay < reach && a > 0.12) {
                    const hr = HIT[kind[i]] * this.size[i], t = hitR + hr;
                    let d2 = q;
                    if (moved) { const ex = px - sx, ey = py - sy, l = ex * ex + ey * ey, u = Math.max(0, Math.min(1, ((bx - sx) * ex + (by - sy) * ey) / l)), cx = sx + ex * u - bx, cy = sy + ey * u - by; d2 = Math.min(q, cx * cx + cy * cy); }
                    if (d2 < t * t) hit = true;
                    else if (!(flags[i] & F_GRAZED) && q < (grazeR + hr) ** 2) { flags[i] |= F_GRAZED; onGraze(i); }
                }
            }
        }
        this.hi = top; if (this.nfree > 0 && top < hi) { let n = 0; for (let k = 0; k < this.nfree; k++) if (this.free[k] < top) this.free[n++] = this.free[k]; this.nfree = n; }
        this.hit = hit; this.danger = danger;
        // Drop panes whose corners have gone.
        const { pa, pb, pc, pg, ph, pz, gen } = this; let n = 0;
        for (let i = 0; i < this.np; i++) {
            const a = pa[i], b = pb[i], c = pc[i];
            if (live[a] && live[b] && live[c] && gen[a] === pg[i * 3] && gen[b] === pg[i * 3 + 1] && gen[c] === pg[i * 3 + 2]) {
                if (n !== i) { pa[n] = a; pb[n] = b; pc[n] = c; pg[n * 3] = pg[i * 3]; pg[n * 3 + 1] = pg[i * 3 + 1]; pg[n * 3 + 2] = pg[i * 3 + 2]; ph[n] = ph[i]; pz[n] = pz[i]; }
                n++;
            }
        }
        this.np = n;
    }

    /** Stained glass under the bullets. Call inside d.additive. */
    drawPanes(r, ox, level, beat, alpha) {
        const { x, y, vx, vy, pa, pb, pc, ph, pz, rgb, tri, m, wait, flags } = this, k = alpha * DT;
        m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 1; m[4] = ox; m[5] = 0;
        for (let i = 0; i < this.np; i++) {
            const a = pa[i], b = pb[i], c = pc[i], col = rgb[ph[i]];
            tri[0] = x[a] + vx[a] * k * (wait[a] > 0 ? 0 : 1); tri[1] = y[a] + vy[a] * k * (wait[a] > 0 ? 0 : 1);
            tri[2] = x[b] + vx[b] * k * (wait[b] > 0 ? 0 : 1); tri[3] = y[b] + vy[b] * k * (wait[b] > 0 ? 0 : 1);
            tri[4] = x[c] + vx[c] * k * (wait[c] > 0 ? 0 : 1); tri[5] = y[c] + vy[c] * k * (wait[c] > 0 ? 0 : 1);
            // Glass stretched too far has shattered: long thin slivers would only confuse the eye.
            const ax = tri[0] - tri[2], ay = tri[1] - tri[3], bx = tri[2] - tri[4], by = tri[3] - tri[5], cx = tri[0] - tri[4], cy = tri[1] - tri[5];
            const e = Math.max(ax * ax + ay * ay, bx * bx + by * by, cx * cx + cy * cy);
            if (e > 28000) continue;
            const v = level * pz[i] * (1 + beat * 0.45) * (e < 9000 ? 1 : 1 - (e - 9000) / 19000);
            r.tris(m, tri, col[0], col[1], col[2], v);
        }
    }

    /** All bullets, one quad each. Call inside d.additive. pulse lifts them on the beat. */
    draw(r, tex, ox, alpha, pulse) {
        const { x, y, vx, vy, spd, ang, age, size, kind, hue, live, wait, flags, m } = this, us = 1 / ACOLS, vs = 1 / AROWS, k = alpha * DT, I = this.I ?? (this.I = new Float32Array([1, 0, 0, 1, 0, 0]));
        I[4] = ox; I[5] = 0;
        const beat = 1 + pulse * 0.14;
        for (let i = 0, n = this.hi; i < n; i++) {
            if (!live[i]) continue;
            const a = age[i], kd = kind[i], grow = a < 0.14 ? 0.4 + 0.6 * a / 0.14 * (2 - a / 0.14) : 1, big = a < 0.14 ? 1 + (0.14 - a) * 7 : 1, s = VIS[kd] * size[i] * grow * beat * big * 0.5;
            const held = wait[i] > 0, px = x[i] + (held ? 0 : vx[i] * k), py = y[i] + (held ? 0 : vy[i] * k);
            const u0 = kd * us, v0 = hue[i] * vs, al = a < 0.14 ? 0.5 + a * 3.5 : 1;
            if (TURNS[kd]) {
                let c, sn;
                const q = spd[i];
                if (q > 1 && !held) { c = vx[i] / q; sn = vy[i] / q; } else { c = Math.cos(ang[i]); sn = Math.sin(ang[i]); }
                m[0] = c; m[1] = sn; m[2] = -sn; m[3] = c; m[4] = ox + px; m[5] = py;
                r.quad(m, -s, -s, s, s, u0, v0, u0 + us, v0 + vs, 1, 1, 1, al, tex, 0, 0, 0, 0, 0);
            } else r.quad(I, px - s, py - s, px + s, py + s, u0, v0, u0 + us, v0 + vs, 1, 1, 1, al, tex, 0, 0, 0, 0, 0);
        }
    }
}

/** Light motes: what bullets become. They drift, then rush to the moth. */
export class Motes {
    constructor() {
        const f = () => new Float32Array(MAX_MOTES);
        this.x = f(); this.y = f(); this.vx = f(); this.vy = f(); this.age = f(); this.sp = f(); this.hue = new Uint8Array(MAX_MOTES); this.n = 0;
    }
    clear() { this.n = 0; }
    add(x, y, vx, vy, hue, delay = 0) {
        if (this.n >= MAX_MOTES) return;
        const i = this.n++; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.age[i] = -delay; this.sp[i] = 0; this.hue[i] = hue;
    }
    /** Returns how many reached the moth this step. */
    step(dt, tx, ty, onGot) {
        const { x, y, vx, vy, age, sp, hue } = this; let got = 0;
        for (let i = 0; i < this.n; i++) {
            const a = (age[i] += dt);
            if (a < 0.42) { const d = Math.pow(0.04, dt); vx[i] *= d; vy[i] *= d; }
            else {
                const dx = tx - x[i], dy = ty - y[i], q = Math.hypot(dx, dy) + 1e-3; sp[i] = Math.min(sp[i] + 1500 * dt, 1100);
                const want = sp[i], l = Math.min(1, dt * 11);
                // A curl on the way in makes the rush swirl.
                vx[i] += ((dx / q - dy / q * 0.42) * want - vx[i]) * l; vy[i] += ((dy / q + dx / q * 0.42) * want - vy[i]) * l;
                if (q < 13 + sp[i] * dt) {
                    onGot(hue[i]); got++;
                    const e = --this.n; x[i] = x[e]; y[i] = y[e]; vx[i] = vx[e]; vy[i] = vy[e]; age[i] = age[e]; sp[i] = sp[e]; hue[i] = hue[e]; i--;
                    continue;
                }
            }
            x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        }
        return got;
    }
    draw(r, tex, ox, alpha) {
        const { x, y, vx, vy, age, hue } = this, us = 1 / ACOLS, vs = 1 / AROWS, k = alpha * DT, m = this.m ?? (this.m = new Float32Array([1, 0, 0, 1, 0, 0])); m[4] = ox;
        for (let i = 0; i < this.n; i++) {
            const a = age[i]; if (a < 0) continue;
            const tw = 0.8 + 0.3 * Math.sin(a * 23 + i), s = 11 * tw, px = x[i] + vx[i] * k, py = y[i] + vy[i] * k, u0 = MOTE * us, v0 = hue[i] * vs;
            r.quad(m, px - s, py - s, px + s, py + s, u0, v0, u0 + us, v0 + vs, 1, 1, 1, 0.92, tex, 0, 0, 0, 0, 0);
        }
    }
}

/** Sparks, rings and blooms. Purely cosmetic, and uses only game.fxRng so gameplay replays stay exact. */
export class Fx {
    constructor(rng) {
        const f = () => new Float32Array(MAX_FX);
        this.x = f(); this.y = f(); this.vx = f(); this.vy = f(); this.t = f(); this.life = f(); this.s0 = f(); this.s1 = f(); this.drag = f(); this.a = f();
        this.kind = new Uint8Array(MAX_FX); this.hue = new Uint8Array(MAX_FX); this.n = 0; this.rng = rng;
        this.m = new Float32Array([1, 0, 0, 1, 0, 0]);
    }
    clear() { this.n = 0; }
    add(x, y, o) {
        if (this.n >= MAX_FX) return;
        const i = this.n++;
        this.x[i] = x; this.y[i] = y; this.vx[i] = o.vx ?? 0; this.vy[i] = o.vy ?? 0; this.t[i] = -(o.delay ?? 0); this.life[i] = o.life ?? 0.5; this.s0[i] = o.s0 ?? 10; this.s1[i] = o.s1 ?? 0; this.drag[i] = o.drag ?? 1; this.a[i] = o.a ?? 1; this.kind[i] = o.kind ?? GLOW; this.hue[i] = o.hue ?? 8;
    }
    burst(x, y, n, hue, sp = 120, life = 0.5, size = 14) {
        const r = this.rng;
        for (let i = 0; i < n; i++) { const t = r.range(0, TAU), v = sp * (0.3 + 0.7 * r.range(0, 1)); this.add(x, y, { vx: Math.cos(t) * v, vy: Math.sin(t) * v, life: life * (0.5 + 0.7 * r.range(0, 1)), s0: size * (0.5 + 0.7 * r.range(0, 1)), s1: 0, drag: 0.05, kind: i % 3 === 0 ? STAR : GLOW, hue }); }
    }
    ring(x, y, hue, s0, s1, life = 0.5, a = 1, delay = 0) { this.add(x, y, { kind: RING, hue, s0, s1, life, a, delay }); }
    step(dt) {
        const { x, y, vx, vy, t, life, s0, s1, drag, a, kind, hue } = this;
        for (let i = 0; i < this.n; i++) {
            t[i] += dt;
            if (t[i] >= life[i]) { const e = --this.n; x[i] = x[e]; y[i] = y[e]; vx[i] = vx[e]; vy[i] = vy[e]; t[i] = t[e]; life[i] = life[e]; s0[i] = s0[e]; s1[i] = s1[e]; drag[i] = drag[e]; a[i] = a[e]; kind[i] = kind[e]; hue[i] = hue[e]; i--; continue; }
            if (t[i] < 0) continue;
            if (drag[i] !== 1) { const d = Math.pow(drag[i], dt); vx[i] *= d; vy[i] *= d; }
            x[i] += vx[i] * dt; y[i] += vy[i] * dt;
        }
    }
    draw(r, tex, ox) {
        const { x, y, t, life, s0, s1, a, kind, hue, m } = this, us = 1 / ACOLS, vs = 1 / AROWS; m[4] = ox;
        for (let i = 0; i < this.n; i++) {
            if (t[i] < 0) continue;
            const q = t[i] / life[i], e = q * (2 - q), s = (s0[i] + (s1[i] - s0[i]) * e) * 0.5 + 0.01, u0 = kind[i] * us, v0 = hue[i] * vs, al = a[i] * (1 - q) * (1 - q * 0.3);
            r.quad(m, x[i] - s, y[i] - s, x[i] + s, y[i] + s, u0, v0, u0 + us, v0 + vs, 1, 1, 1, al, tex, 0, 0, 0, 0, 0);
        }
    }
}
export { PEARL };
