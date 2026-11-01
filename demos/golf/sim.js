// The ball. A solid sphere with real angular velocity: it skids until friction spins it up, rolls, picks up spin from
// rails, checks up on backspin and lips out of the cup. Stepped at 240 Hz. Pure and deterministic: bots and game share it.
import { BALL_R, CUP_R, CELL, MAT, VOID, LAVA, WATER, SAND, SNOW, ICE, ROCK } from "./course.js";

export const G = 18, HZ = 240, DT = 1 / HZ;
export const PUTT_MIN = 1.1, PUTT_MAX = 19.5, CHIP_MIN = 3.5, CHIP_MAX = 15.5, CHIP_PITCH = 0.72;
const R = BALL_R, IOVER = 0.4 * R * R;       // I/m for a solid sphere
const TAU = Math.PI * 2;
const STOP_SPEED = 0.1, REST_TIME = 0.22, MAX_SHOT = 30;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const frac = (x) => x - Math.floor(x);

export const deckPose = (d, t, out = {}) => {
    const w = d.period ? Math.sin(TAU * (t / d.period + d.phase)) : 0;
    let f = 0.5 + 0.5 * w;
    if (d.dwell) f = clamp(0.5 + 0.5 * w * (1 + d.dwell), 0, 1);
    out.x = d.x + (d.move ? d.move[0] * f : 0);
    out.y = d.y + (d.move ? d.move[1] * f : 0);
    out.z = d.z + (d.move ? d.move[2] * f : 0);
    out.yaw = d.yaw + d.spin * t;
    out.tilt = d.tilt + d.swing * w;
    return out;
};
export const geyserOn = (g, t) => frac(t / g.period + g.phase) * g.period < g.on;
export const geyserIn = (g, t) => { const p = frac(t / g.period + g.phase) * g.period; return g.period - p; };
export const plantOpen = (p, t) => frac(t / p.period + p.phase) < p.open;
export const sweepAngle = (w, t) => w.phase + w.spin * t;

export class Sim {
    constructor(course, on = null) {
        this.c = course; this.on = on;
        this.t = 0; this.visual = false; this.quiet = false;
        this.x = 0; this.y = 0; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.wx = 0; this.wy = 0; this.wz = 0;
        this.q = [1, 0, 0, 0];
        this.mode = "rest"; this.reason = ""; this.restT = 0; this.shotT = 0; this.ground = 0; this.mat = 0; this.nx = 0; this.ny = 1; this.nz = 0;
        this.svx = 0; this.svy = 0; this.svz = 0; this.inside = null; this.riding = null; this.lastG = -1; this.airT = 0;
        this.fired = -1; this.secret = false; this.ate = course.plants.map(() => -99); this.spat = course.plants.map(() => -99); this.lip = 0; this.hitBump = -1; this.bumpT = course.posts.map(() => -99);
        this._p = {}; this._q = {};
        this.minY = Infinity;
        const { S, H, nx, nz } = course;
        for (let i = 0; i < S.length; i++) if (S[i] > 0 && H[i] < this.minY) this.minY = H[i];
        const st = this.steep = new Uint8Array(nx * nz);
        for (let k = 2; k < nz - 2; k++) for (let i = 2; i < nx - 2; i++) {
            const j = i + k * nx;
            let lo = H[j], hi = H[j];
            for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const v = H[j + a + b * nx]; if (S[j + a + b * nx] <= -0.7) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
            if (hi - lo > 0.55) st[j] = 1;
        }
        const t = course.tee_;
        this.place(t.x, t.y, t.z);
    }

    emit(type, a, b) { if (this.on && !this.quiet) this.on(type, a, b); }

    place(x, y, z) {
        this.x = x; this.y = y; this.z = z; this.vx = this.vy = this.vz = 0; this.wx = this.wy = this.wz = 0;
        this.mode = "rest"; this.restT = 0; this.inside = null; this.riding = null; this.lastPos = [x, y, z];
        this.safe = [x, y, z];
    }

    /** Copy what a preview needs. */
    copyFrom(o) {
        this.x = o.x; this.y = o.y; this.z = o.z; this.vx = o.vx; this.vy = o.vy; this.vz = o.vz; this.wx = o.wx; this.wy = o.wy; this.wz = o.wz;
        this.t = o.t; this.mode = o.mode; this.restT = o.restT; this.shotT = o.shotT; this.ground = o.ground; this.mat = o.mat; this.nx = o.nx; this.ny = o.ny; this.nz = o.nz; this.inside = o.inside; this.riding = o.riding;
        this.svx = o.svx; this.svy = o.svy; this.svz = o.svz; this.fired = o.fired; this.secret = o.secret; this.safe = o.safe; this.lastG = o.lastG; this.airT = o.airT;
    }

    /** heading 0 is -z (forward), positive turns toward +x. power is 0 to 1. */
    shoot(heading, power, chip = false) {
        const s = Math.sin(heading), c = -Math.cos(heading);
        this.safe = [this.x, this.y, this.z];
        this.shotT = 0; this.restT = 0; this.mode = "roll"; this.fired = -1;
        this.emit("hit", power, chip);
        const riding = this.riding; this.riding = null;
        if (chip) {
            const sp = CHIP_MIN + (CHIP_MAX - CHIP_MIN) * Math.pow(power, 1.15), cp = Math.cos(CHIP_PITCH), sn = Math.sin(CHIP_PITCH);
            this.vx = s * sp * cp; this.vy = sp * sn; this.vz = c * sp * cp;
            const bs = sp * 0.85 / R;     // backspin: the reverse of rolling, so it checks up where it lands
            this.wx = -c * bs; this.wy = 0; this.wz = s * bs; this.y += 0.02;
        } else {
            const sp = PUTT_MIN + (PUTT_MAX - PUTT_MIN) * Math.pow(power, 1.35);
            let dx = s, dy = 0, dz = c;
            // Follow the slope under the ball, so a putt up a bank doesn't dig in.
            const n = this.ny > 0.3 ? this : { nx: 0, ny: 1, nz: 0 }, dn = dx * n.nx + dy * n.ny + dz * n.nz;
            dx -= n.nx * dn; dy -= n.ny * dn; dz -= n.nz * dn;
            const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
            this.vx = dx * sp; this.vy = dy * sp + 0.01; this.vz = dz * sp;
            const k = 0.82 / R;
            this.wx = (n.ny * this.vz - n.nz * this.vy) * k; this.wy = (n.nz * this.vx - n.nx * this.vz) * k; this.wz = (n.nx * this.vy - n.ny * this.vx) * k;
        }
        if (riding) { this.vx += this.svx; this.vy += this.svy; this.vz += this.svz; }
    }

    get speed() { return Math.hypot(this.vx - this.svx, this.vy - this.svy, this.vz - this.svz); }

    sample(x, z) {
        const c = this.c, nx = c.nx, nz = c.nz, u = (x - c.x0) / CELL, w = (z - c.z0) / CELL;
        let i = Math.floor(u + 0.5), k = Math.floor(w + 0.5);
        const f = u - i, g = w - k;
        if (i < 1) i = 1; else if (i > nx - 2) i = nx - 2;
        if (k < 1) k = 1; else if (k > nz - 2) k = nz - 2;
        const a0 = 0.5 * (0.5 - f) * (0.5 - f), a1 = 0.75 - f * f, a2 = 0.5 * (0.5 + f) * (0.5 + f), d0 = f - 0.5, d1 = -2 * f, d2 = f + 0.5;
        const b0 = 0.5 * (0.5 - g) * (0.5 - g), b1 = 0.75 - g * g, b2 = 0.5 * (0.5 + g) * (0.5 + g), e0 = g - 0.5, e1 = -2 * g, e2 = g + 0.5;
        const H = c.H, j = i + k * nx;
        const r0 = a0 * H[j - nx - 1] + a1 * H[j - nx] + a2 * H[j - nx + 1], r1 = a0 * H[j - 1] + a1 * H[j] + a2 * H[j + 1], r2 = a0 * H[j + nx - 1] + a1 * H[j + nx] + a2 * H[j + nx + 1];
        const s0 = d0 * H[j - nx - 1] + d1 * H[j - nx] + d2 * H[j - nx + 1], s1 = d0 * H[j - 1] + d1 * H[j] + d2 * H[j + 1], s2 = d0 * H[j + nx - 1] + d1 * H[j + nx] + d2 * H[j + nx + 1];
        this.h = b0 * r0 + b1 * r1 + b2 * r2;
        this.hx = (b0 * s0 + b1 * s1 + b2 * s2) / CELL;
        this.hz = (e0 * r0 + e1 * r1 + e2 * r2) / CELL;
        return this.h;
    }

    /** Solve a contact. n points from surface to ball. */
    contact(nx, ny, nz, depth, e, mu, ground, mat) {
        this.x += nx * depth; this.y += ny * depth; this.z += nz * depth;
        const rx = this.vx - this.svx, ry = this.vy - this.svy, rz = this.vz - this.svz, vn = rx * nx + ry * ny + rz * nz;
        if (vn >= 0) return 0;
        const impact = -vn, thresh = ground ? 1.6 : 0.6, er = impact > thresh ? e : 0, jn = impact * (1 + er);
        this.vx += nx * jn; this.vy += ny * jn; this.vz += nz * jn;
        // Friction at the contact point: slip = v + w x (-R n) - surface.
        const cx = -R * nx, cy = -R * ny, cz = -R * nz;
        const ux = this.vx - this.svx + this.wy * cz - this.wz * cy, uy = this.vy - this.svy + this.wz * cx - this.wx * cz, uz = this.vz - this.svz + this.wx * cy - this.wy * cx;
        const un = ux * nx + uy * ny + uz * nz, sx = ux - nx * un, sy = uy - ny * un, sz = uz - nz * un, slip = Math.hypot(sx, sy, sz);
        if (slip > 1e-5) {
            const j = Math.min(slip * 2 / 7, mu * jn), tx = sx / slip, ty = sy / slip, tz = sz / slip;
            this.vx -= tx * j; this.vy -= ty * j; this.vz -= tz * j;
            // dw = (r x (-t j)) / I
            const k = -j / IOVER;
            this.wx += (cy * tz - cz * ty) * k; this.wy += (cz * tx - cx * tz) * k; this.wz += (cx * ty - cy * tx) * k;
        }
        return impact;
    }

    groundDrag(mat, dt) {
        const m = MAT[mat] ?? MAT[1], nx = this.nx, ny = this.ny, nz = this.nz;
        let rx = this.vx - this.svx, ry = this.vy - this.svy, rz = this.vz - this.svz;
        const vn = rx * nx + ry * ny + rz * nz;
        rx -= nx * vn; ry -= ny * vn; rz -= nz * vn;
        const sp = Math.hypot(rx, ry, rz);
        // The ball gives up slowly in the first seconds; past that the world leans on it, so every shot ends.
        const late = this.shotT > 12 ? (this.shotT - 12) * 0.7 : 0;
        const dec = (m.roll + m.drag * sp + late) * dt;
        const f = sp > dec ? 1 - dec / sp : 0;
        this.vx -= rx * (1 - f); this.vy -= ry * (1 - f); this.vz -= rz * (1 - f);
        const wn = this.wx * nx + this.wy * ny + this.wz * nz;
        const k = f;
        const px = this.wx - nx * wn, py = this.wy - ny * wn, pz = this.wz - nz * wn;
        const wnew = wn * Math.exp(-dt * (mat === ICE ? 0.5 : 1.6));
        this.wx = px * k + nx * wnew; this.wy = py * k + ny * wnew; this.wz = pz * k + nz * wnew;
        // Side spin bends the roll, a touch. It's what makes a rail shot curl.
        if (sp > 0.4 && Math.abs(wn) > 2) {
            const a = clamp(wn * 0.012, -1, 1) * Math.min(sp, 6) * dt * 1.5;
            this.vx += (ny * rz - nz * ry) / sp * a; this.vy += (nz * rx - nx * rz) / sp * a; this.vz += (nx * ry - ny * rx) / sp * a;
        }
    }

    terrain(dt) {
        const c = this.c;
        const ux = (this.x - c.x0) / CELL, uz = (this.z - c.z0) / CELL, i = Math.round(ux), k = Math.round(uz);
        if (i < 2 || k < 2 || i >= c.nx - 2 || k >= c.nz - 2) return;
        const j = i + k * c.nx;
        if (this.y > this.c.H[j] + 2.6 && !this.steep[j]) return;
        const cd = c.cup_, cdx = this.x - cd.x, cdz = this.z - cd.z, cup = cdx * cdx + cdz * cdz;
        if (cup < 1.2) this.nearCup(cdx, cdz, Math.sqrt(cup));
        if (this.mode !== "roll" && this.mode !== "rest") return;
        if (cup < (CUP_R - 0.02) * (CUP_R - 0.02)) return;
        const inside = c.inFairway(this.x, this.z);
        // Fixed-point search for the true closest point: matters on steep ground.
        let qx = this.x, qz = this.z;
        this.sample(qx, qz);
        let nl = Math.sqrt(1 + this.hx * this.hx + this.hz * this.hz), nx = -this.hx / nl, ny = 1 / nl, nz = -this.hz / nl;
        if (ny < 0.97) for (let it = 0; it < 2; it++) {
            qx = qx * 0.3 + (this.x - nx * R) * 0.7; qz = qz * 0.3 + (this.z - nz * R) * 0.7;
            this.sample(qx, qz);
            nl = Math.sqrt(1 + this.hx * this.hx + this.hz * this.hz); nx = -this.hx / nl; ny = 1 / nl; nz = -this.hz / nl;
        }
        const h = this.h, gap = (this.x - qx) * nx + (this.y - h) * ny + (this.z - qz) * nz - R;
        if (inside) {
            // Lava and water take the ball when it dips into them.
            const m = c.M[j];
            if ((m === LAVA || m === WATER) && this.y - R * 0.6 < c.L[j]) { this.lost(m === LAVA ? "lava" : "water"); return; }
            if (gap < 0.012) {
                if (ny < 0.4) { this.contact(nx, ny, nz, Math.max(0, -gap), 0.4, 0.2, false, m); }
                else {
                    this.svx = 0; this.svy = 0; this.svz = 0;
                    this.landOn(m, nx, ny, nz, Math.max(0, -gap), dt, 0);
                }
            }
        }
        if (this.steep[j]) {
            const px = this.x, pz = this.z;
            for (let a = 0; a < 8; a++) {
                const ca = Math.cos(a * 0.7854), sa = Math.sin(a * 0.7854), ex = px + ca * R, ez = pz + sa * R;
                if (!c.inFairway(ex, ez)) continue;
                const eh = this.sample(ex, ez), el = Math.sqrt(1 + this.hx * this.hx + this.hz * this.hz), enx = -this.hx / el, eny = 1 / el, enz = -this.hz / el;
                if (eny > 0.82) continue;
                if (eh < this.y - R * 0.7) continue;
                const eg = (this.x - ex) * enx + (this.y - eh) * eny + (this.z - ez) * enz - R;
                if (eg < 0 && (enx * ca + enz * sa) < 0) {
                    this.svx = this.svy = this.svz = 0;
                    const hit = this.contact(enx, eny, enz, -eg, 0.42, 0.2, false, 0);
                    if (hit > 1.2) this.emit("wall", hit, 1);
                }
            }
        }
    }

    /** Ground contact bookkeeping shared by terrain and decks. */
    landOn(mat, nx, ny, nz, depth, dt, roughScale) {
        const m = MAT[mat] ?? MAT[1];
        const sp = Math.hypot(this.vx, this.vz);
        if (m.rough > 0 && sp > 0.5) {
            // Bumpy ground shoves the ball sideways, in a pattern fixed to the ground.
            const a = Math.sin(this.x * 13.1 + Math.sin(this.z * 7.3)) * Math.sin(this.z * 11.7 + Math.sin(this.x * 5.1) * 2), b = Math.sin(this.x * 9.7 - this.z * 12.3);
            const k = m.rough * Math.min(sp, 8) * 7 * dt;
            this.vx += a * k; this.vz += b * k;
        }
        const imp = this.contact(nx, ny, nz, depth, m.bounce, m.mu, true, mat);
        if (imp > 2) this.emit("land", imp, mat);
        this.ground = 3; this.mat = mat; this.nx = nx; this.ny = ny; this.nz = nz; this.airT = 0;
        this.groundDrag(mat, dt);
    }

    nearCup(dx, dz, d) {
        const cd = this.c.cup_;
        // Soft edge of the cup: a dying ball curls in.
        if (d > 0.01 && d < 0.74 && this.ground > 0) {
            const sp = Math.hypot(this.vx, this.vz);
            if (sp < 3.6) { const k = 6 * DT * (0.74 - d) / 0.34; this.vx -= dx / d * k; this.vz -= dz / d * k; }
        }
        if (d < CUP_R) {
            const dy = this.y - cd.y;
            if (dy < -R * 0.45) { this.mode = "holed"; this.vy = Math.min(this.vy, -1); this.emit("hole", this.speed); return; }
            if (dy > R + 0.1) return;
            // The rim is a circle in space. A hot ball rides up it and hops out.
            const rx = d > 1e-4 ? dx / d * CUP_R : CUP_R, rz = d > 1e-4 ? dz / d * CUP_R : 0;
            const ax = dx - rx, az = dz - rz, dist = Math.hypot(ax, dy, az);
            if (dist < R && dist > 1e-5) {
                this.svx = this.svy = this.svz = 0;
                const imp = this.contact(ax / dist, dy / dist, az / dist, R - dist, 0.22, 0.25, false, 0);
                if (imp > 2.4) this.emit("lip", imp);
            }
        }
    }

    decks(dt) {
        const c = this.c.decks;
        for (let i = 0; i < c.length; i++) {
            const d = c[i], p = deckPose(d, this.t, this._p);
            const rad = (d.R || Math.hypot(d.hw, d.hd)) + R + 0.2;
            const dx = this.x - p.x, dy = this.y - p.y, dz = this.z - p.z;
            if (dx * dx + dz * dz > rad * rad || Math.abs(dy) > rad + 0.6) continue;
            const cy = Math.cos(p.yaw), sy = Math.sin(p.yaw), ct = Math.cos(p.tilt), st = Math.sin(p.tilt);
            // World to deck: undo yaw, then tilt about local x.
            const a = cy * dx - sy * dz, b0 = sy * dx + cy * dz;
            const ly = ct * dy + st * b0, lz = -st * dy + ct * b0, lx = a;
            let qx, qz, top, slope = 0;
            if (d.R) {
                const r2 = Math.hypot(lx, lz), s = r2 > d.R ? d.R / r2 : 1;
                qx = lx * s; qz = lz * s; top = 0;
            } else {
                qx = clamp(lx, -d.hw, d.hw); qz = clamp(lz, -d.hd, d.hd);
                top = d.curve ? d.curve * (1 - (qz / d.hd) * (qz / d.hd)) : 0;
                slope = d.curve ? -2 * d.curve * qz / (d.hd * d.hd) : 0;
            }
            const over = lx === qx && lz === qz || (d.R && Math.hypot(lx - qx, lz - qz) < 1e-6);
            let nx, ny, nz, depth;
            if (over && ly > top - d.th) {
                const l = Math.sqrt(1 + slope * slope), n1 = 1 / l, n2 = -slope / l;
                const sd = (ly - top) * n1;
                if (sd >= R + 0.012) continue;
                if (sd < -0.3 && ly < top - d.th * 0.5) { /* below the top of a thick slab: come out underneath */ }
                nx = 0; ny = n1; nz = n2; depth = Math.max(0, R - sd);
            } else {
                const py = clamp(ly, top - d.th, top), ex = lx - qx, ey = ly - py, ez = lz - qz, dist = Math.hypot(ex, ey, ez);
                if (dist >= R || dist < 1e-6) continue;
                nx = ex / dist; ny = ey / dist; nz = ez / dist; depth = R - dist;
            }
            // Deck to world normal.
            const wy = ct * ny - st * nz, wz0 = st * ny + ct * nz;
            const Nx = cy * nx + sy * wz0, Ny = wy, Nz = -sy * nx + cy * wz0;
            // Surface velocity from the pose a moment ahead, plus spin.
            const q = deckPose(d, this.t + dt, this._q);
            let vx = (q.x - p.x) / dt, vy = (q.y - p.y) / dt, vz = (q.z - p.z) / dt;
            if (d.spin) { vx += d.spin * dz; vz += -d.spin * dx; }
            if (d.swing) vy += -(q.tilt - p.tilt) / dt * b0;
            this.svx = vx; this.svy = vy; this.svz = vz;
            if (Ny > 0.5) {
                this.landOn(d.mat, Nx, Ny, Nz, depth, dt, 1);
                this.onDeck = i; this.deckG = 3;
            } else {
                const imp = this.contact(Nx, Ny, Nz, depth, 0.5, 0.2, false, 0);
                if (imp > 1.2) this.emit("wall", imp, 0);
            }
        }
        if (this.deckG > 0) this.deckG--; else if (this.ground <= 0) { this.svx = this.svy = this.svz = 0; }
    }

    rails() {
        const c = this.c, gi = Math.floor((this.x - c.span.x0) / c.G), gk = Math.floor((this.z - c.span.z0) / c.G);
        if (gi < 0 || gk < 0 || gi >= c.gx || gk >= c.gz) return;
        const list = c.bucket[gi + gk * c.gx];
        for (let n = 0; n < list.length; n++) {
            const r = list[n];
            if (r.post) { this.post(r); continue; }
            const dx = r.bx - r.ax, dz = r.bz - r.az, l2 = dx * dx + dz * dz || 1e-9;
            const t = clamp(((this.x - r.ax) * dx + (this.z - r.az) * dz) / l2, 0, 1);
            const ex = this.x - (r.ax + dx * t), ez = this.z - (r.az + dz * t), d2 = ex * ex + ez * ez, reach = R + r.th;
            if (d2 > reach * reach) continue;
            const top = r.ya + (r.yb - r.ya) * t, floor = r.floorA + (r.floorB - r.floorA) * t;
            if (this.y < floor - R) continue;
            let nx, ny, nz, depth;
            if (this.y <= top) {
                const d = Math.sqrt(d2);
                if (d < 1e-5) { const l = Math.sqrt(l2); nx = -dz / l; ny = 0; nz = dx / l; depth = reach; }
                else { nx = ex / d; ny = 0; nz = ez / d; depth = reach - d; }
            } else {
                const ey = this.y - top, dist = Math.sqrt(d2 + ey * ey);
                if (dist >= reach || dist < 1e-5) continue;
                nx = ex / dist; ny = ey / dist; nz = ez / dist; depth = reach - dist;
            }
            this.svx = this.svy = this.svz = 0;
            const imp = this.contact(nx, ny, nz, depth, 0.68, 0.22, false, 0);
            if (imp > 0.8) this.emit("wall", imp, 0);
        }
    }

    post(p) {
        const dx = this.x - p.x, dz = this.z - p.z, reach = p.r + R, d2 = dx * dx + dz * dz;
        if (d2 > reach * reach || this.y > p.top + R) return;
        const d = Math.sqrt(d2) || 1e-4;
        let nx = dx / d, ny = 0, nz = dz / d, depth = reach - d;
        if (this.y > p.top) { const ey = this.y - p.top, in2 = Math.max(0, d - p.r), dist = Math.hypot(in2, ey); if (dist >= R) return; nx = dx / d * in2 / (dist || 1); ny = ey / (dist || 1); nz = dz / d * in2 / (dist || 1); depth = R - dist; }
        this.svx = this.svy = this.svz = 0;
        const imp = this.contact(nx, ny, nz, depth, p.e, 0.15, false, 0);
        if (imp > 0.2 && p.kick) {
            this.vx += nx * p.kick; this.vz += nz * p.kick;
            const i = this.c.posts.indexOf(p); if (this.t - this.bumpT[i] > 0.1) { this.bumpT[i] = this.t; this.emit("bumper", i, imp); }
        } else if (imp > 1) this.emit("wall", imp, 2);
    }

    sweepers(dt) {
        for (const w of this.c.sweepers) {
            const dx = this.x - w.x, dz = this.z - w.z, reach = w.len + R + w.th;
            if (dx * dx + dz * dz > reach * reach || Math.abs(this.y - w.y) > 0.8) continue;
            const a0 = sweepAngle(w, this.t);
            for (let k = 0; k < w.arms; k++) {
                const a = a0 + k * TAU / w.arms, ax = Math.cos(a), az = Math.sin(a);
                const t = clamp(dx * ax + dz * az, 0, w.len), ex = dx - ax * t, ez = dz - az * t, d = Math.hypot(ex, ez);
                if (d >= R + w.th || d < 1e-5) continue;
                // Tip speed of the bar at the touch point.
                this.svx = -w.spin * az * t; this.svz = w.spin * ax * t; this.svy = 0;
                const imp = this.contact(ex / d, 0, ez / d, R + w.th - d, 0.75, 0.2, false, 0);
                this.svx = this.svz = 0;
                if (imp > 0.6) this.emit("sweep", imp);
            }
        }
    }

    zones() {
        const c = this.c, x = this.x, y = this.y, z = this.z;
        for (let i = 0; i < c.geysers.length; i++) {
            const g = c.geysers[i], dx = x - g.x, dz = z - g.z;
            if (dx * dx + dz * dz > g.r * g.r || y - g.y > 1.5) continue;
            const cycle = Math.floor(this.t / g.period + g.phase);
            if (!geyserOn(g, this.t) || this.fired === cycle * 64 + i) continue;
            this.fired = cycle * 64 + i;
            this.throwTo(g.to, g.flight, g.up, dx, dz);
            this.shotActive();
            this.emit("geyser", i);
        }
        if (this.mode !== "roll") return;
        for (let i = 0; i < c.plants.length; i++) {
            const p = c.plants[i], dx = x - p.x, dz = z - p.z, r = p.r * p.s, d2 = dx * dx + dz * dz;
            if (d2 > (r + 0.5) * (r + 0.5) || y - p.y > 1.6) continue;
            if (plantOpen(p, this.t) && d2 < r * r && this.t - this.spat[i] > 1) {
                this.inside = { kind: "plant", i, until: this.t + p.hold };
                this.ate[i] = this.t; this.mode = "inside"; this.emit("chomp", i);
                return;
            }
            // Closed, the head is a tough little bumper.
            const reach = 0.46 * p.s + R, d = Math.sqrt(d2) || 1e-4;
            if (d < reach) { this.svx = this.svy = this.svz = 0; const imp = this.contact(dx / d, 0, dz / d, reach - d, 0.7, 0.1, false, 0); if (imp > 0.6) this.emit("plantbonk", i, imp); }
        }
        for (const t of c.tubes) {
            const dx = x - t.x, dz = z - t.z;
            if (dx * dx + dz * dz < t.r * t.r && y - t.y < 1) { this.inside = { kind: "tube", t, until: this.t + t.T }; this.mode = "inside"; this.emit("tube", t); return; }
        }
        for (const b of c.boosts) {
            const dx = x - b.x, dz = z - b.z;
            if (dx * dx + dz * dz < b.r * b.r && y - b.y < 0.7) {
                const ux = Math.sin(b.dir), uz = -Math.cos(b.dir), sp = this.vx * ux + this.vz * uz;
                if (sp < b.speed) { this.vx += ux * (b.speed - sp); this.vz += uz * (b.speed - sp); this.emit("boost", b); }
            }
        }
        for (const s of c.secrets) {
            if (this.secret) break;
            const dx = x - s.x, dy = y - s.y, dz = z - s.z;
            if (dx * dx + dy * dy + dz * dz < s.r * s.r) { this.secret = true; this.emit("secret", s); }
        }
    }

    shotActive() { if (this.mode === "rest") { this.mode = "roll"; this.shotT = 0; this.restT = 0; this.riding = null; } }

    /** A ballistic throw that lands on target. */
    throwTo(to, T, up, ox, oz) {
        if (to) {
            this.vx = (to[0] - this.x) / T; this.vz = (to[2] - this.z) / T; this.vy = (to[1] + R + 0.05 - this.y + 0.5 * G * T * T) / T;
        } else { this.vy = up; this.vx += ox * 1.5; this.vz += oz * 1.5; }
        this.wx = this.wy = this.wz = 0; this.svx = this.svy = this.svz = 0; this.ground = 0;
    }

    lost(reason) {
        this.mode = "lost"; this.reason = reason; this.emit("lost", reason);
    }

    /** Back to where the last shot began. */
    respawn() {
        const [x, y, z] = this.safe;
        this.x = x; this.y = y; this.z = z; this.vx = this.vy = this.vz = 0; this.wx = this.wy = this.wz = 0; this.mode = "rest"; this.restT = 0; this.inside = null; this.riding = null; this.svx = this.svy = this.svz = 0;
    }

    step() {
        const dt = DT;
        this.t += dt;
        if (this.mode === "holed" || this.mode === "lost") return;
        if (this.mode === "inside") {
            const n = this.inside;
            if (this.t >= n.until) {
                if (n.kind === "plant") {
                    const p = this.c.plants[n.i];
                    this.x = p.x; this.z = p.z; this.y = p.y + 0.9 * p.s; this.spat[n.i] = this.t;
                    this.throwTo(p.to, p.flight, 0, 0, 0); this.mode = "roll"; this.shotT = 0; this.inside = null; this.emit("spit", n.i);
                } else {
                    const t = n.t, ux = Math.sin(t.dir), uz = -Math.cos(t.dir);
                    this.x = t.x1; this.z = t.z1; this.y = t.y1 + R + 0.02; this.vx = ux * t.speed; this.vz = uz * t.speed; this.vy = 0; this.mode = "roll"; this.shotT = 0; this.inside = null;
                    this.wx = -uz * 0 + uz * t.speed / R; this.wy = 0; this.wz = -ux * t.speed / R; this.emit("tubeout", t);
                }
            }
            return;
        }
        if (this.mode === "rest" && !this.mustWake()) return;
        const wasGround = this.ground > 0;
        this.vy -= G * dt;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        if (this.ground > 0) this.ground--;
        if (this.mode === "roll") this.shotT += dt;
        this.deckG = this.deckG ?? 0;
        this.decks(dt);
        this.terrain(dt);
        if (this.mode === "holed" || this.mode === "lost") return;
        this.rails();
        this.sweepers(dt);
        this.zones();
        if (this.mode === "inside") return;
        if (this.ground <= 0) this.airT += dt;
        if (this.visual) this.spin(dt);
        // Fallen off the world.
        if (this.y < this.minY - 0.7 && !this.c.inFairway(this.x, this.z)) {
            const b = this.c.baseAt ? this.c.baseAt(this.x, this.z) : 0;
            if (this.y < Math.max(b, this.c.seaLevel) + R) { this.lost(b > this.c.seaLevel ? "oob" : "sea"); return; }
        }
        const rel = this.speed;
        if (this.mode === "rest") {
            if (rel > 0.7) { this.mode = "roll"; this.shotT = 0; this.restT = 0; this.emit("woke"); }
            return;
        }
        if (this.ground > 0 && rel < STOP_SPEED) {
            this.restT += dt;
            if (this.restT > REST_TIME) this.settle();
        } else this.restT = 0;
        if (this.shotT > MAX_SHOT) this.lost("timeout");
    }

    mustWake() {
        const c = this.c;
        for (const g of c.geysers) { const dx = this.x - g.x, dz = this.z - g.z; if (dx * dx + dz * dz < g.r * g.r) return true; }
        for (const d of c.decks) if (d.move || d.spin || d.swing) { const dx = this.x - d.x, dz = this.z - d.z, m = (d.R || Math.hypot(d.hw, d.hd)) + 1.2 + (d.move ? Math.hypot(d.move[0], d.move[2]) : 0); if (dx * dx + dz * dz < m * m) return true; }
        for (const w of c.sweepers) { const dx = this.x - w.x, dz = this.z - w.z, m = w.len + 0.6; if (dx * dx + dz * dz < m * m) return true; }
        return false;
    }

    settle() {
        this.mode = "rest"; this.restT = 0;
        if (this.deckG > 0) this.riding = this.onDeck; else { this.vx = this.vy = this.vz = 0; this.wx = this.wy = this.wz = 0; }
        this.emit("rest");
    }

    spin(dt) {
        // Integrate orientation for drawing.
        const q = this.q, wx = this.wx, wy = this.wy, wz = this.wz, h = dt * 0.5, a = q[0], b = q[1], c = q[2], d = q[3];
        q[0] = a + h * (-b * wx - c * wy - d * wz); q[1] = b + h * (a * wx + c * wz - d * wy); q[2] = c + h * (a * wy - b * wz + d * wx); q[3] = d + h * (a * wz + b * wy - c * wx);
        const l = Math.hypot(q[0], q[1], q[2], q[3]); q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l;
    }

    /** Run one shot to its end. Bots use this. */
    runShot(limit = 40) {
        let n = 0;
        const max = limit * HZ;
        while (this.mode === "roll" || this.mode === "inside") { this.step(); if (++n > max) return false; }
        return true;
    }
}
