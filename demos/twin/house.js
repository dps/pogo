// The house itself: pathfinding round the furniture, and each room's hazards.
import { D, W } from "./data.js";

const CELL = 0.75, NX = Math.ceil(W * 2 / CELL), NZ = Math.ceil(D * 2 / CELL), TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const P_R = 0.62;

// Neighbour offsets with a unit direction for each.
const OFFS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => { const l = Math.hypot(x, z); return [x, z, x / l, z / l, l]; });

const methods = {
    initNav() {
        this.blocked = new Uint8Array(NX * NZ);
        this.dist = new Float32Array(NX * NZ);
        this.dirX = new Float32Array(NX * NZ);
        this.dirZ = new Float32Array(NX * NZ);
        this.queue = new Int32Array(NX * NZ * 4);
        this._dir = [0, 0];
        this.navNear = (x, z) => this.blockedNear[this.cell(x, z)] === 1;
        this.blockedNear = new Uint8Array(NX * NZ);
        this.navCell = -1;
    },
    cell(x, z) {
        const cx = clamp(Math.floor((x + W) / CELL), 0, NX - 1), cz = clamp(Math.floor((z + D) / CELL), 0, NZ - 1);
        return cz * NX + cx;
    },
    updateNav(dt = 0) {
        if (!this.blocked) this.initNav();
        if (this.navDirty) {
            this.navDirty = false;
            this.navCell = -1;
            for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) {
                const x = -W + (cx + 0.5) * CELL, z = -D + (cz + 0.5) * CELL;
                this.blocked[cz * NX + cx] = this.furnAt(x, z, 0.42) ? 1 : 0;
                this.blockedNear[cz * NX + cx] = this.furnAt(x, z, 2.2) ? 1 : 0;
            }
        }
        this.navTime -= dt;
        const c = this.cell(this.p.x, this.p.z);
        if (c !== this.navCell && this.navTime <= 0) {
            this.navCell = c;
            this.navTime = 0.15;
            this.buildField(this.p.x, this.p.z, this.dist, this.dirX, this.dirZ);
        }
    },
    /** Breadth-first-ish field: each cell points down the distance slope towards the target. */
    buildField(tx, tz, dist, dirX, dirZ) {
        const q = this.queue, blocked = this.blocked;
        dist.fill(1e9);
        let head = 0, tail = 0, start = this.cell(tx, tz);
        dist[start] = 0;
        q[tail++] = start;
        while (head < tail) {
            const c = q[head++], d = dist[c], cx = c % NX, cz = (c / NX) | 0;
            for (let i = 0; i < 8; i++) {
                const o = OFFS[i], nx = cx + o[0], nz = cz + o[1];
                if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
                const n = nz * NX + nx;
                if (blocked[n]) continue;
                if (i >= 4 && (blocked[cz * NX + nx] || blocked[nz * NX + cx])) continue;
                const nd = d + o[4];
                if (nd < dist[n] - 1e-4 && tail < q.length) { dist[n] = nd; q[tail++] = n; }
            }
        }
        for (let cz = 0; cz < NZ; cz++) for (let cx = 0; cx < NX; cx++) {
            const c = cz * NX + cx;
            let best = dist[c], bx = 0, bz = 0;
            for (let i = 0; i < 8; i++) {
                const o = OFFS[i], nx = cx + o[0], nz = cz + o[1];
                if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
                const n = nz * NX + nx;
                if (blocked[n]) continue;
                if (i >= 4 && (blocked[cz * NX + nx] || blocked[nz * NX + cx])) continue;
                if (dist[n] < best) { best = dist[n]; bx = o[2]; bz = o[3]; }
            }
            dirX[c] = bx; dirZ[c] = bz;
        }
    },
    /** Nearest walkable point that connects to the robot, for monsters shoved into a corner pocket. */
    reachableNear(x, z) {
        const cx0 = Math.floor((x + W) / CELL), cz0 = Math.floor((z + D) / CELL);
        for (let r = 1; r < 16; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
            const nx = cx0 + dx, nz = cz0 + dz;
            if (nx < 0 || nz < 0 || nx >= NX || nz >= NZ) continue;
            if (this.dist[nz * NX + nx] < 1e9) return [-W + (nx + 0.5) * CELL, -D + (nz + 0.5) * CELL];
        }
        return null;
    },
    unreachable(x, z) { return this.dist[this.cell(x, z)] >= 1e9; },

    /** One-off route for bots: direction from a point towards a target, round the furniture. */
    navTowards(x, z, tx, tz) {
        if (!this.seekDist) { this.seekDist = new Float32Array(NX * NZ); this.seekX = new Float32Array(NX * NZ); this.seekZ = new Float32Array(NX * NZ); }
        this.buildField(tx, tz, this.seekDist, this.seekX, this.seekZ);
        const c = this.cell(x, z), dx = this.seekX[c], dz = this.seekZ[c];
        if (dx || dz) return [dx, dz];
        const l = Math.hypot(tx - x, tz - z) || 1;
        return [(tx - x) / l, (tz - z) / l];
    },
    /** Direction a monster at this point should walk. */
    navDir(x, z) {
        const c = this.cell(x, z), out = this._dir;
        let dx = this.dirX[c], dz = this.dirZ[c];
        if (dx === 0 && dz === 0) {
            const p = this.p, ax = p.x - x, az = p.z - z, l = Math.hypot(ax, az) || 1;
            dx = ax / l; dz = az / l;
        }
        out[0] = dx; out[1] = dz;
        return out;
    },

    // --- Hazards ------------------------------------------------------------------------------
    setupHazards(room) {
        this.hazards = room.hazards.map((h) => ({ ...h, t: h.offset ?? 0, active: false, warn: false }));
        const extra = [];
        for (const h of this.hazards) {
            if (h.kind === "bricks") {
                h.items = [];
                for (let i = 0; i < h.n; i++) {
                    const a = this.rnd() * TAU, r = this.range(2, 1);
                    let x = this.range(-W + 1.5, W - 1.5), z = this.range(-D + 1.5, D - 1.5);
                    [x, z] = this.freeSpot(x, z);
                    h.items.push({ x, z, yaw: a, c: i % 4, r, live: true });
                }
            }
            if (h.kind === "train") { h.pos = 0; h.points = []; for (let i = 0; i < h.cars; i++) h.points.push({ x: 0, z: 0, yaw: 0 }); }
        }
        this.hazards.push(...extra);
    },

    updateHazards(dt) {
        const p = this.p;
        for (const h of this.hazards) {
            switch (h.kind) {
                case "cord": this.hazCord(h, dt); break;
                case "jet": this.hazJet(h, dt); break;
                case "slick": if (Math.hypot(p.x - h.x, p.z - h.z) < h.r) p.slick = 0.2; break;
                case "vortex": this.hazVortex(h, dt); break;
                case "soap": this.hazSoap(h, dt); break;
                case "wind": this.hazWind(h, dt); break;
                case "train": this.hazTrain(h, dt); break;
                case "bricks":
                    for (const b of h.items) {
                        if (!b.live) continue;
                        if (p.suck > 2 && Math.hypot(p.x - b.x, p.z - b.z) < 1.4) { b.live = false; this.ev("brickgone", { x: b.x, z: b.z }); continue; }
                        if (Math.hypot(p.x - b.x, p.z - b.z) < 0.85) {
                            b.live = false;
                            this.ev("brick", { x: b.x, z: b.z });
                            this.hurt(3, b.x, b.z, "A Toy Brick", 4);
                            p.spin += 7;
                        }
                    }
                    break;
            }
        }
    },

    pulse(h, dt, on, warn) {
        h.t = (h.t + dt) % h.period;
        const active = h.t < on, w = !active && h.t > h.period - warn;
        const started = active && !h.active;
        h.active = active; h.warn = w;
        h.phaseK = active ? h.t / on : w ? (h.t - (h.period - warn)) / warn : 0;
        return started;
    },

    hazCord(h, dt) {
        if (this.pulse(h, dt, 0.45, 1.1)) this.ev("zap", { a: h.a, b: h.b });
        if (!h.active) return;
        const [ax, az] = h.a, [bx, bz] = h.b, dx = bx - ax, dz = bz - az, ll = dx * dx + dz * dz;
        const dist = (x, z) => {
            const t = clamp(((x - ax) * dx + (z - az) * dz) / ll, 0, 1);
            return Math.hypot(x - ax - dx * t, z - az - dz * t);
        };
        const p = this.p;
        if (dist(p.x, p.z) < 0.85) this.hurt(9, p.x, p.z, "A Live Cord");
        for (const e of this.foes) if (!e.dead && e.born <= 0 && dist(e.x, e.z) < 0.7 + e.r * 0.5) this.hitFoe(e, 60 * dt, "zap", 0, 0, true);
    },

    hazJet(h, dt) {
        if (this.pulse(h, dt, h.on, 1.1)) this.ev("jet", { h, tint: h.tint });
        if (!h.active) return;
        const inside = (x, z, r) => x > h.x0 - r && x < h.x1 + r && z > h.z0 - r && z < h.z1 + r;
        const p = this.p;
        if (inside(p.x, p.z, P_R * 0.4)) this.hurt(h.dmg, p.x, p.z, h.tint === "fire" ? "The Cooker" : "Hot Steam", 4);
        for (const e of this.foes) if (!e.dead && e.born <= 0 && inside(e.x, e.z, 0)) { this.hitFoe(e, 70 * dt, "jet", 0, 0, true); if (h.tint === "fire") e.burn = Math.max(e.burn, 1); }
    },

    hazVortex(h, dt) {
        if (this.pulse(h, dt, h.on, 1.6)) this.ev("gurgle", { x: h.x, z: h.z });
        if (!h.active) return;
        const p = this.p, dx = h.x - p.x, dz = h.z - p.z, l = Math.hypot(dx, dz) || 1;
        if (l < h.r && p.dashT <= 0) {
            const f = 24 * (1 - l / (h.r + 1));
            p.vx += (dx / l * f + dz / l * f * 0.7) * dt; p.vz += (dz / l * f - dx / l * f * 0.7) * dt;
            if (l < 1.3) this.hurt(8, h.x, h.z, "The Drain", 12);
        }
        for (const e of this.foes) {
            if (e.dead || e.born > 0 || e.r > 1) continue;
            const ex = h.x - e.x, ez = h.z - e.z, el = Math.hypot(ex, ez) || 1;
            if (el > h.r) continue;
            const f = 30 * (1 - el / (h.r + 1));
            e.kx += (ex / el * f + ez / el * f * 0.8) * dt; e.kz += (ez / el * f - ex / el * f * 0.8) * dt;
            if (el < 0.9) this.hitFoe(e, 120 * dt, "drain", 0, 0, true);
        }
        for (const m of this.motes) {
            const ex = h.x - m.x, ez = h.z - m.z, el = Math.hypot(ex, ez) || 1;
            if (el < h.r) { m.vx += ez / el * 20 * dt + ex / el * 10 * dt; m.vz += -ex / el * 20 * dt + ez / el * 10 * dt; }
        }
    },

    hazSoap(h, dt) {
        h.spin = (h.spin ?? 0) + dt * 3;
        h.x += h.vx * dt; h.z += h.vz * dt;
        if (Math.abs(h.x) > W - 0.7) { h.x = clamp(h.x, -W + 0.7, W - 0.7); h.vx *= -1; }
        if (Math.abs(h.z) > D - 0.7) { h.z = clamp(h.z, -D + 0.7, D - 0.7); h.vz *= -1; }
        const f = this.furnAt(h.x, h.z, 0.5);
        if (f) {
            const ax = f.w / 2 + 0.5 - Math.abs(h.x - f.x), az = f.d / 2 + 0.5 - Math.abs(h.z - f.z);
            if (ax < az) { h.x = f.x + Math.sign(h.x - f.x) * (f.w / 2 + 0.51); h.vx *= -1; }
            else { h.z = f.z + Math.sign(h.z - f.z) * (f.d / 2 + 0.51); h.vz *= -1; }
        }
        const p = this.p;
        if (Math.hypot(p.x - h.x, p.z - h.z) < 1.15 && p.inv <= 0) {
            if (this.hurt(5, h.x, h.z, "A Bar of Soap", 13)) {
                const dx = h.x - p.x, dz = h.z - p.z, l = Math.hypot(dx, dz) || 1, s = Math.hypot(h.vx, h.vz);
                h.vx = dx / l * s; h.vz = dz / l * s;
                this.ev("soap", { x: h.x, z: h.z });
            }
        }
        this.near(h.x, h.z, 0.9, (e) => {
            if (e.born > 0 || Math.hypot(e.x - h.x, e.z - h.z) > e.r + 0.6) return;
            this.hitFoe(e, 90 * dt, "soap", h.vx * 0.3, h.vz * 0.3, true);
        });
    },

    hazWind(h, dt) {
        if (this.pulse(h, dt, h.on, 0.9)) this.ev("wind", { h });
        if (!h.active) return;
        const inside = (x, z) => x > h.x0 && x < h.x1 && z > h.z0 && z < h.z1;
        const p = this.p;
        if (inside(p.x, p.z)) { p.vx += h.dx * 36 * dt; p.vz += h.dz * 36 * dt; }
        for (const e of this.foes) if (!e.dead && e.born <= 0 && e.r < 1 && inside(e.x, e.z)) { e.kx += h.dx * 40 * dt; e.kz += h.dz * 40 * dt; }
        for (const m of this.motes) if (inside(m.x, m.z)) { m.vx += h.dx * 40 * dt; m.vz += h.dz * 40 * dt; }
    },

    hazTrain(h, dt) {
        h.pos = (h.pos + h.speed * dt) % TAU;
        const p = this.p;
        h.points.forEach((c, i) => {
            const a = h.pos - i * 0.32, x = h.cx + Math.cos(a) * h.rx, z = h.cz + Math.sin(a) * h.rz;
            c.px = c.x; c.pz = c.z;
            c.x = x; c.z = z;
            c.yaw = Math.atan2(Math.cos(a) * h.rz, -Math.sin(a) * h.rx);
            if (Math.hypot(p.x - x, p.z - z) < 1.3) this.hurt(14, x, z, "The Toy Train", 14);
            this.near(x, z, 1.2, (e) => { if (e.born <= 0 && Math.hypot(e.x - x, e.z - z) < e.r + 0.9) this.hitFoe(e, 300 * dt, "train", Math.cos(c.yaw) * 6, Math.sin(c.yaw) * 6, true); });
            const f = this.furnAt(x, z, 0.6);
            if (f) this.hitFurn(f, 200 * dt, "train");
        });
    },
};

export function installHouse(Sim) { Object.assign(Sim.prototype, methods); }
