// A hole is written as a list of brushes, then baked into grids the ball can roll on:
//   H  height control points (read through a quadratic B-spline, so slopes are C1 and the ball never feels a facet)
//   S  signed distance to the fairway edge (positive inside); its zero contour is the mesh edge and the rails
//   M  material, L  lava or water level
// Nothing here touches Pogo: the game and the bots share it.

export const CELL = 0.25, BALL_R = 0.2, CUP_R = 0.38, RAIL_TH = 0.11, RAIL_H = 0.46;
export const VOID = 0, GRASS = 1, ROUGH = 2, SAND = 3, ICE = 4, ROCK = 5, WOOD = 6, LAVA = 7, WATER = 8, SNOW = 9, GREEN = 10;

// mu: sliding grip. roll: rolling drag (u/s^2). drag: speed drag (1/s). bounce: restitution. rough: how much the ground nudges and rumbles.
export const MAT = {
    [GRASS]: { name: "grass", mu: 0.85, roll: 2.3, drag: 0.34, bounce: 0.42, rough: 0 },
    [GREEN]: { name: "green", mu: 0.8, roll: 1.75, drag: 0.3, bounce: 0.38, rough: 0 },
    [ROUGH]: { name: "rough", mu: 1, roll: 5.2, drag: 0.7, bounce: 0.3, rough: 0.012 },
    [SAND]: { name: "sand", mu: 1.3, roll: 8.5, drag: 1.5, bounce: 0.06, rough: 0.008 },
    [SNOW]: { name: "snow", mu: 1.2, roll: 7.5, drag: 1.3, bounce: 0.08, rough: 0.006 },
    [ICE]: { name: "ice", mu: 0.05, roll: 0.3, drag: 0.1, bounce: 0.34, rough: 0 },
    [ROCK]: { name: "lava rock", mu: 0.75, roll: 1.9, drag: 0.3, bounce: 0.56, rough: 0.022 },
    [WOOD]: { name: "wood", mu: 0.7, roll: 1.5, drag: 0.26, bounce: 0.5, rough: 0.003 },
    [LAVA]: { name: "lava", mu: 0.2, roll: 0.2, drag: 0.1, bounce: 0, rough: 0 },   // nothing rests on a lava bank
    [WATER]: { name: "water", mu: 0.2, roll: 0.2, drag: 0.1, bounce: 0, rough: 0 },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Catmull-Rom through [x, v, y, w] points, as a dense polyline. */
export function spline(pts, step = 0.35) {
    if (pts.length < 3) {
        const a = pts[0], b = pts[pts.length - 1], n = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1]) / step)), out = [];
        for (let i = 0; i <= n; i++) out.push(a.map((v, k) => v + (b[k] - v) * i / n));
        return out;
    }
    const out = [], P = (i) => pts[clamp(i, 0, pts.length - 1)];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
        const n = Math.max(2, Math.ceil(Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) / step));
        for (let j = 0; j < n; j++) {
            const t = j / n, t2 = t * t, t3 = t2 * t;
            // Width and height stay monotonic between points, so a ramp never dips below its ends.
            const q = p1.map((_, k) => k < 2 ? 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3) : p1[k] + (p2[k] - p1[k]) * (t2 * (3 - 2 * t)));
            out.push(q);
        }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
}

/** The builder a hole's script talks to. All brushes run in order. v is distance forward from the tee; world z is -v. */
export class Course {
    constructor(def, island = 0) {
        this.def = def; this.island = island;
        this.ops = []; this.decks = []; this.posts = []; this.sweepers = []; this.geysers = []; this.plants = []; this.tubes = []; this.boosts = []; this.secrets = []; this.walls = []; this.gaps = []; this.pools = []; this.props = []; this.jumps = [];
        this.teeP = [0, 0, 0]; this.cupP = [0, 10, 0]; this.base = [ROCK];
        this.seaLevel = 0;
        def.build(this);
        this.bake();
    }

    // ---- brushes ----
    tee(x, v, y = 5) { this.teeP = [x, v, y]; return this; }
    cup(x, v, y) { this.cupP = [x, v, y]; return this; }
    /** Fairway ribbon. pts are [x, v, y, width?]. o: w, mat, rail (false leaves the edge open), bank (cross slope), crown */
    path(pts, o = {}) { const w = o.w ?? 5; const p = pts.map((q) => [q[0], q[1], q[2] ?? 5, q[3] ?? w]); this.ops.push({ k: "path", s: spline(p), mat: o.mat ?? GRASS, rail: o.rail ?? true, bank: o.bank ?? 0, crown: o.crown ?? 0, pipe: o.pipe ?? 0, secret: !!o.secret, flat: o.flat ?? false }); return this; }
    /** Round pad. o: mat, rail, sx/sv (tilt), dish */
    pad(x, v, r, y = 5, o = {}) { this.ops.push({ k: "pad", x, z: -v, r, y, mat: o.mat ?? GREEN, rail: o.rail ?? true, sx: o.sx ?? 0, sv: o.sv ?? 0, dish: o.dish ?? 0 }); return this; }
    /** Rectangle centred on x, v. */
    rect(x, v, w, d, y = 5, o = {}) { this.ops.push({ k: "rect", x, z: -v, w, d, y, mat: o.mat ?? GRASS, rail: o.rail ?? true, sx: o.sx ?? 0, sv: o.sv ?? 0 }); return this; }
    /** Add a smooth mound or dip. */
    hill(x, v, r, amp, o = {}) { this.ops.push({ k: "hill", x, z: -v, r, rz: o.rz ?? r, amp }); return this; }
    /** A smooth mound along a line. */
    ridge(pts, r, amp) { this.ops.push({ k: "ridge", s: spline(pts.map((q) => [q[0], q[1], 0, 0])), r, amp }); return this; }
    /** Paint a material over a circle. dip sinks it, like a bunker. */
    paint(x, v, r, mat, o = {}) { this.ops.push({ k: "paint", x, z: -v, r, rz: o.rz ?? r, mat, dip: o.dip ?? 0 }); return this; }
    paintPath(pts, w, mat, o = {}) { this.ops.push({ k: "paintPath", s: spline(pts.map((q) => [q[0], q[1], 0, q[2] ?? w])), mat, dip: o.dip ?? 0 }); return this; }
    /** A lava or water pool in the fairway. y is the surface height. */
    pool(x, v, r, y, o = {}) { this.ops.push({ k: "pool", s: null, x, z: -v, r, rz: o.rz ?? r, y, mat: o.mat ?? LAVA }); return this; }
    /** A lava or water channel. pts are [x, v] or [x, v, w]. */
    river(pts, w, y, o = {}) { this.ops.push({ k: "pool", s: spline(pts.map((q) => [q[0], q[1], 0, q[2] ?? w])), y, mat: o.mat ?? LAVA }); return this; }
    /** Remove fairway: a hole in the world. */
    cut(x, v, r, o = {}) { this.ops.push({ k: "cut", x, z: -v, r, rz: o.rz ?? r, rail: o.rail ?? true }); return this; }
    /** Leave a stretch of edge without a rail. */
    gap(x, v, r) { this.gaps.push({ x, z: -v, r }); return this; }
    /** Free-standing rail along points [x, v] or [x, v, y]. */
    wall(pts, o = {}) { const s = pts.length > 2 && o.curve ? spline(pts.map((q) => [q[0], q[1], q[2] ?? -1, 0]), 0.6) : pts; this.walls.push({ pts: s.map((q) => [q[0], -q[1]]), h: o.h ?? RAIL_H, mat: o.mat ?? 0, th: o.th ?? RAIL_TH }); return this; }

    // ---- things that move or bite ----
    bumper(x, v, o = {}) { this.posts.push({ x, z: -v, r: o.r ?? 0.55, kick: o.kick ?? 7, e: 0.9, h: o.h ?? 0.9, kind: "bumper" }); return this; }
    rock(x, v, r = 0.6, o = {}) { this.posts.push({ x, z: -v, r, kick: 0, e: 0.55, h: o.h ?? 1.2, kind: o.kind ?? "rock" }); return this; }
    /** Moving or fixed slab. o: w, d, th, yaw, tilt, move:[dx,dy,dv], period, phase, spin, rock (tilt swing, radians), curve (top bow), mat, disc (radius) */
    deck(x, v, y, o = {}) {
        this.decks.push({ x, y, z: -v, hw: (o.w ?? 3) / 2, hd: (o.d ?? 3) / 2, th: o.th ?? 0.4, yaw: o.yaw ?? 0, tilt: o.tilt ?? 0, roll: o.roll ?? 0, move: o.move ? [o.move[0], o.move[1], -o.move[2]] : null, period: o.period ?? 4, phase: o.phase ?? 0, spin: o.spin ?? 0, swing: o.swing ?? 0, curve: o.curve ?? 0, mat: o.mat ?? WOOD, R: o.disc ?? 0, style: o.style ?? "plank", dwell: o.dwell ?? 0, secret: !!o.secret });
        return this;
    }
    /** A static or moving plank between two points. */
    plank(x0, v0, y0, x1, v1, y1, w = 1.2, o = {}) {
        const dx = x1 - x0, dz = -(v1 - v0), len = Math.hypot(dx, dz);
        return this.deck((x0 + x1) / 2, (v0 + v1) / 2, (y0 + y1) / 2, { w, d: len, yaw: Math.atan2(dx, dz), tilt: Math.atan2(y0 - y1, len), ...o });
    }
    /** Turntable. */
    disc(x, v, y, R, spin, o = {}) { return this.deck(x, v, y, { ...o, disc: R, spin, style: o.style ?? "turntable" }); }
    /** Rotating bar about a pivot. */
    sweeper(x, v, y, len, spin, o = {}) { this.sweepers.push({ x, z: -v, y, len, spin, phase: o.phase ?? 0, arms: o.arms ?? 2, th: o.th ?? 0.16 }); return this; }
    /** Vent that fires every period for `on` seconds. `to` is [x, v, y], a landing point; without one it throws the ball straight up. */
    geyser(x, v, o = {}) { this.geysers.push({ x, z: -v, r: o.r ?? 0.7, period: o.period ?? 4, on: o.on ?? 1.2, phase: o.phase ?? 0, to: o.to ? [o.to[0], o.to[2], -o.to[1]] : null, up: o.up ?? 12, flight: o.flight ?? 1.5, lava: !!o.lava, secret: !!o.secret }); return this; }
    /** Hungry plant. Open and hungry for part of each period; a ball that arrives then is swallowed and spat at `to` [x, v, y]. */
    plant(x, v, to, o = {}) { this.plants.push({ x, z: -v, to: [to[0], to[2], -to[1]], r: o.r ?? 0.68, period: o.period ?? 3, open: o.open ?? 0.6, phase: o.phase ?? 0, hold: o.hold ?? 1.1, flight: o.flight ?? 1.3, s: o.size ?? 1, ice: !!o.ice }); return this; }
    /** Tunnel: a mouth at x, v that comes out at x1, v1, heading dir (radians, 0 is forward) at speed. */
    tube(x, v, x1, v1, dir, o = {}) { this.tubes.push({ x, z: -v, x1, z1: -v1, dir, r: o.r ?? 0.55, T: o.T ?? 0.7, speed: o.speed ?? 8, secret: !!o.secret }); return this; }
    /** Speed pad pointing along dir. */
    boost(x, v, dir, o = {}) { this.boosts.push({ x, z: -v, dir, r: o.r ?? 0.8, speed: o.speed ?? 12 }); return this; }
    /** The hidden shortcut's marker: a shell that counts when the ball passes it. */
    secret(x, v, y, o = {}) { this.secrets.push({ x, z: -v, y, r: o.r ?? 0.75 }); return this; }
    /** Tells the route finder a jump exists, from a ramp to where it lands. */
    jump(x, v, x1, v1) { this.jumps.push({ x, z: -v, x1, z1: -v1 }); return this; }
    /** Scenery with no collision. */
    prop(kind, x, v, o = {}) { this.props.push({ kind, x, z: -v, ...o }); return this; }

    // ---- baking ----
    bounds() {
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        const add = (x, z, r) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r); };
        for (const o of this.ops) {
            if (o.k === "path") for (const p of o.s) add(p[0], -p[1], p[3] / 2 + 1);
            else if (o.k === "pad") add(o.x, o.z, o.r + 1);
            else if (o.k === "rect") { add(o.x - o.w / 2, o.z - o.d / 2, 1); add(o.x + o.w / 2, o.z + o.d / 2, 1); }
        }
        return [x0 - 1, x1 + 1, z0 - 1, z1 + 1];
    }

    bake() {
        const [x0, x1, z0, z1] = this.bounds();
        const nx = this.nx = Math.ceil((x1 - x0) / CELL) + 1, nz = this.nz = Math.ceil((z1 - z0) / CELL) + 1, N = nx * nz;
        this.x0 = x0; this.z0 = z0;
        const H = this.H = new Float32Array(N).fill(-8), S = this.S = new Float32Array(N).fill(-3), M = this.M = new Uint8Array(N), L = this.L = new Float32Array(N).fill(-99), R = this.R = new Uint8Array(N).fill(1), Sec = this.Sec = new Uint8Array(N);
        const put = (i, sOp, y, mat, rail, sec) => {
            if (sOp > 0) { H[i] = y; M[i] = mat; if (sOp > S[i]) S[i] = sOp; R[i] = rail ? 1 : 0; Sec[i] = sec ? 1 : 0; }
            else if (sOp > S[i]) { S[i] = sOp; R[i] = rail ? 1 : 0; if (M[i] === 0) H[i] = y; }
        };
        const each = (a, b, c, d, fn) => {
            const i0 = clamp(Math.floor((a - x0) / CELL), 0, nx - 1), i1 = clamp(Math.ceil((b - x0) / CELL), 0, nx - 1), k0 = clamp(Math.floor((c - z0) / CELL), 0, nz - 1), k1 = clamp(Math.ceil((d - z0) / CELL), 0, nz - 1);
            for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) fn(i + k * nx, x0 + i * CELL, z0 + k * CELL);
        };
        const best = new Float32Array(N);
        const ribbon = (s, fn, flat = false) => {
            // fn(index, signed distance inside, along-t data). Each cell takes the nearest segment.
            best.fill(1e9);
            const hit = new Int32Array(N).fill(-1), hitT = new Float32Array(N), hitSide = new Float32Array(N), over = new Float32Array(N);
            for (let j = 0; j < s.length - 1; j++) {
                const a = s[j], b = s[j + 1], ax = a[0], az = -a[1], bx = b[0], bz = -b[1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, m = Math.max(a[3], b[3]) / 2 + 0.8;
                each(Math.min(ax, bx) - m, Math.max(ax, bx) + m, Math.min(az, bz) - m, Math.max(az, bz) + m, (i, x, z) => {
                    const raw = ((x - ax) * dx + (z - az) * dz) / l2, t = clamp(raw, 0, 1), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
                    // A flat end stops square instead of rounding off, so it can butt against a bridge.
                    let past = 0;
                    if (flat && ((raw < 0 && j === 0) || (raw > 1 && j === s.length - 2))) past = (raw < 0 ? -raw : raw - 1) * Math.sqrt(l2);
                    if (d < best[i]) { best[i] = d; hit[i] = j; hitT[i] = t; hitSide[i] = (x - ax) * dz - (z - az) * dx > 0 ? 1 : -1; over[i] = past; }
                });
            }
            for (let i = 0; i < N; i++) if (hit[i] >= 0) { const a = s[hit[i]], b = s[hit[i] + 1], t = hitT[i], w = a[3] + (b[3] - a[3]) * t; fn(i, over[i] > 0 ? -over[i] : w / 2 - best[i], a[2] + (b[2] - a[2]) * t, best[i] * hitSide[i], w); }
        };
        for (const o of this.ops) {
            if (o.k === "path") ribbon(o.s, (i, sd, y, side, w) => {
                let h = y + o.bank * side;
                if (o.crown) h += o.crown * (1 - Math.pow(side / (w / 2), 2));
                if (o.pipe) h += o.pipe * Math.pow(Math.abs(side) / (w / 2), 2.5);
                put(i, sd, h, o.mat, o.rail, o.secret);
            }, o.flat);
            else if (o.k === "pad") each(o.x - o.r - 1, o.x + o.r + 1, o.z - o.r - 1, o.z + o.r + 1, (i, x, z) => {
                const d = Math.hypot(x - o.x, z - o.z);
                put(i, o.r - d, o.y + o.sx * (x - o.x) + o.sv * -(z - o.z) + (o.dish ? o.dish * Math.pow(d / o.r, 2) : 0), o.mat, o.rail);
            });
            else if (o.k === "rect") each(o.x - o.w / 2 - 1, o.x + o.w / 2 + 1, o.z - o.d / 2 - 1, o.z + o.d / 2 + 1, (i, x, z) => {
                const sd = Math.min(o.w / 2 - Math.abs(x - o.x), o.d / 2 - Math.abs(z - o.z));
                put(i, sd, o.y + o.sx * (x - o.x) + o.sv * -(z - o.z), o.mat, o.rail);
            });
            else if (o.k === "hill") each(o.x - o.r, o.x + o.r, o.z - o.rz, o.z + o.rz, (i, x, z) => {
                const d = Math.hypot((x - o.x) / o.r, (z - o.z) / o.rz); if (d < 1) H[i] += o.amp * smooth(1 - d);
            });
            else if (o.k === "ridge") ribbon(o.s.map((q) => [q[0], q[1], 0, o.r * 2]), (i, sd) => { if (sd > 0) H[i] += o.amp * smooth(sd / o.r); });
            else if (o.k === "paint") each(o.x - o.r, o.x + o.r, o.z - o.rz, o.z + o.rz, (i, x, z) => {
                const d = Math.hypot((x - o.x) / o.r, (z - o.z) / o.rz);
                if (d < 1) { if (M[i]) M[i] = o.mat; if (o.dip) H[i] -= o.dip * smooth((1 - d) * 3); }
            });
            else if (o.k === "paintPath") ribbon(o.s, (i, sd, y, side, w) => { if (sd > 0) { if (M[i]) M[i] = o.mat; if (o.dip) H[i] -= o.dip * smooth(sd * 2.4 / w * 2); } });
            else if (o.k === "pool") {
                const cells = [];
                const mark = (i, sd) => { if (sd > -0.2 && S[i] > -0.5) { cells.push(i); if (sd > 0) { M[i] = o.mat; L[i] = o.y; H[i] = Math.min(H[i], o.y + 0.32 - smooth(sd / 0.45) * 0.62); } else H[i] = Math.min(H[i], o.y + 0.32 + (-sd) * 0.0 + (H[i] - o.y - 0.32) * smooth(-sd / 0.2)); } };
                if (o.s) ribbon(o.s, (i, sd) => mark(i, sd));
                else each(o.x - o.r - 0.5, o.x + o.r + 0.5, o.z - o.rz - 0.5, o.z + o.rz + 0.5, (i, x, z) => {
                    const a = Math.hypot((x - o.x) / o.r, (z - o.z) / o.rz); mark(i, (1 - a) * Math.min(o.r, o.rz));
                });
                this.pools.push({ y: o.y, mat: o.mat, cells: new Int32Array(cells) });
            } else if (o.k === "cut") each(o.x - o.r - 1, o.x + o.r + 1, o.z - o.rz - 1, o.z + o.rz + 1, (i, x, z) => {
                const a = Math.hypot((x - o.x) / o.r, (z - o.z) / o.rz), sd = (a - 1) * Math.min(o.r, o.rz);
                if (sd < S[i]) { S[i] = sd; if (sd <= 0) M[i] = 0; R[i] = o.rail ? 1 : 0; }
            });
        }
        // Cup: flatten and dish slightly, so a slow ball finds it.
        const [cx, cv, cy] = this.cupP, cz = -cv;
        this.cup_ = { x: cx, y: cy, z: cz };
        each(cx - 1.6, cx + 1.6, cz - 1.6, cz + 1.6, (i, x, z) => {
            const d = Math.hypot(x - cx, z - cz);
            if (M[i]) { const k = smooth((1.5 - d) / 0.8); H[i] = H[i] + (cy - 0.055 * smooth((1.2 - d) / 0.8) * (d > 0.4 ? 1 : 1) - H[i]) * k; }
        });
        const [tx, tv, ty] = this.teeP;
        this.tee_ = { x: tx, y: ty + BALL_R, z: -tv };
        this.span = { x0, x1: x0 + (nx - 1) * CELL, z0, z1: z0 + (nz - 1) * CELL };
        this.buildRails();
        this.buildIndex();
        this.F = this.buildField(false);
        this.Fall = this.buildField(true);
        this.buildBase();
    }

    /** The island under the course: coarse, faceted, only for looks and for where a lost ball lands. */
    buildBase() {
        const step = this.bStep = 1.5, pad = 34, { x0, z0, x1, z1 } = this.span;
        const bx = this.bx = Math.ceil((x1 - x0 + pad * 2) / step) + 1, bz = this.bz = Math.ceil((z1 - z0 + pad * 2) / step) + 1;
        this.b0x = x0 - pad; this.b0z = z0 - pad;
        const B = this.B = new Float32Array(bx * bz), D = new Float32Array(bx * bz).fill(1e9), T = new Float32Array(bx * bz);
        // Distance transform from everything that is fairway, carrying its height along.
        const q = [];
        for (let k = 0; k < bz; k++) for (let i = 0; i < bx; i++) {
            const x = this.b0x + i * step, z = this.b0z + k * step, u = Math.round((x - x0) / CELL), w = Math.round((z - z0) / CELL);
            let top = -1e9;
            if (u >= 0 && w >= 0 && u < this.nx && w < this.nz) {
                const r = 4;
                for (let a = -r; a <= r; a += 2) for (let b = -r; b <= r; b += 2) { const p = clamp(u + a, 0, this.nx - 1) + clamp(w + b, 0, this.nz - 1) * this.nx; if (this.S[p] > 0 && this.H[p] > top) top = this.H[p]; }
            }
            if (top > -1e8) { D[i + k * bx] = 0; T[i + k * bx] = top; q.push(i + k * bx); }
        }
        for (let h = 0; h < q.length; h++) {
            const c = q[h], i = c % bx, k = (c - i) / bx;
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const p = i + a, w = k + b; if (p < 0 || w < 0 || p >= bx || w >= bz) continue;
                const n = p + w * bx;
                if (D[n] > D[c] + 1) { D[n] = D[c] + 1; T[n] = T[c]; q.push(n); }
            }
        }
        const noise = (x, z) => Math.sin(x * 0.37 + Math.sin(z * 0.23) * 2) * Math.cos(z * 0.31 - x * 0.11) + 0.5 * Math.sin(x * 0.83 + z * 0.61) * Math.cos(x * 0.47 - z * 0.91);
        for (let k = 0; k < bz; k++) for (let i = 0; i < bx; i++) {
            const c = i + k * bx, x = this.b0x + i * step, z = this.b0z + k * step, d = D[c] * step;
            const fall = d <= 0 ? 0 : 0.6 + d * 0.32 + d * d * 0.012;
            let y = T[c] - 0.7 - fall + noise(x, z) * Math.min(1, d / 6) * 0.9;
            y = Math.max(y, -2.2 + noise(x * 0.5, z * 0.5) * 0.3);
            B[c] = y;
        }
    }

    baseAt(x, z) {
        const u = (x - this.b0x) / this.bStep, w = (z - this.b0z) / this.bStep, i = clamp(Math.floor(u), 0, this.bx - 2), k = clamp(Math.floor(w), 0, this.bz - 2), f = clamp(u - i, 0, 1), g = clamp(w - k, 0, 1), B = this.B, j = i + k * this.bx;
        return (B[j] * (1 - f) + B[j + 1] * f) * (1 - g) + (B[j + this.bx] * (1 - f) + B[j + this.bx + 1] * f) * g;
    }

    /** The zero contour of S, chained and simplified, is the rail line. A hole never has an unrailed crack by accident. */
    contours() {
        const { nx, nz, S, x0, z0 } = this, eid = (i, k, e) => (i + k * nx) * 2 + e, pts = new Map(), next = new Map(), prev = new Map();
        const Sv = (i, k) => S[i + k * nx];
        const lerpEdge = (ax, az, sa, bx, bz, sb) => { const t = sa / (sa - sb); return [ax + (bx - ax) * t, az + (bz - az) * t]; };
        const P = (i, k, e) => {
            const id = eid(i, k, e);
            if (!pts.has(id)) {
                const X = x0 + i * CELL, Z = z0 + k * CELL;
                pts.set(id, e === 0 ? lerpEdge(X, Z, Sv(i, k), X + CELL, Z, Sv(i + 1, k)) : lerpEdge(X, Z, Sv(i, k), X, Z + CELL, Sv(i, k + 1)));
            }
            return id;
        };
        const link = (a, b) => { next.set(a, b); prev.set(b, a); };
        for (let k = 0; k < nz - 1; k++) for (let i = 0; i < nx - 1; i++) {
            const a = Sv(i, k) > 0, b = Sv(i + 1, k) > 0, c = Sv(i + 1, k + 1) > 0, d = Sv(i, k + 1) > 0, code = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
            if (code === 0 || code === 15) continue;
            const T = () => P(i, k, 0), B = () => P(i, k + 1, 0), Lf = () => P(i, k, 1), Rt = () => P(i + 1, k, 1);
            // Directed so the fairway is on the left walking the contour.
            switch (code) {
                case 1: link(Lf(), T()); break; case 2: link(T(), Rt()); break; case 3: link(Lf(), Rt()); break;
                case 4: link(Rt(), B()); break; case 6: link(T(), B()); break; case 7: link(Lf(), B()); break;
                case 8: link(B(), Lf()); break; case 9: link(B(), T()); break; case 11: link(B(), Rt()); break;
                case 12: link(Rt(), Lf()); break; case 13: link(Rt(), T()); break; case 14: link(T(), Lf()); break;
                case 5: link(Lf(), T()); link(Rt(), B()); break; case 10: link(T(), Rt()); link(B(), Lf()); break;
            }
        }
        const seen = new Set(), loops = [];
        const walk = (start) => {
            const line = []; let id = start;
            while (id !== undefined && !seen.has(id)) { seen.add(id); line.push(pts.get(id)); id = next.get(id); }
            if (id === start && line.length > 2) line.push(line[0]);
            return line;
        };
        for (const id of next.keys()) if (!prev.has(id) && !seen.has(id)) loops.push(walk(id));
        for (const id of next.keys()) if (!seen.has(id)) loops.push(walk(id));
        return loops;
    }

    simplify(line, tol) {
        if (line.length < 3) return line;
        const a0 = line[0], b0 = line[line.length - 1];
        if (a0[0] === b0[0] && a0[1] === b0[1]) {
            // A closed loop has no chord to measure against: split it in two first.
            const m = line.length >> 1;
            return [...this.simplify(line.slice(0, m + 1), tol).slice(0, -1), ...this.simplify(line.slice(m), tol)];
        }
        const keep = new Uint8Array(line.length); keep[0] = keep[line.length - 1] = 1;
        const st = [[0, line.length - 1]];
        while (st.length) {
            const [a, b] = st.pop(); let far = -1, md = tol;
            const ax = line[a][0], az = line[a][1], dx = line[b][0] - ax, dz = line[b][1] - az, l = Math.hypot(dx, dz) || 1e-6;
            for (let i = a + 1; i < b; i++) { const d = Math.abs((line[i][0] - ax) * dz - (line[i][1] - az) * dx) / l; if (d > md) { md = d; far = i; } }
            if (far >= 0) { keep[far] = 1; st.push([a, far], [far, b]); }
        }
        return line.filter((_, i) => keep[i]);
    }

    buildRails() {
        const rails = this.rails = [];
        this.outline = this.contours();
        const railOK = (x, z) => {
            for (const g of this.gaps) if (Math.hypot(x - g.x, z - g.z) < g.r) return false;
            if (this.onDeck(x, z)) return false;
            // Sample the side of the contour: any neighbour that wants no rail wins.
            const i = Math.round((x - this.x0) / CELL), k = Math.round((z - this.z0) / CELL);
            for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) {
                const j = clamp(i + a, 0, this.nx - 1) + clamp(k + b, 0, this.nz - 1) * this.nx;
                if (Math.abs(this.S[j]) < 0.5 && !this.R[j]) return false;
            }
            return true;
        };
        const add = (ax, az, bx, bz, h, th, mat, floor) => {
            const ya = this.groundAt(ax, az, true), yb = this.groundAt(bx, bz, true);
            rails.push({ ax, az, bx, bz, ya: ya + h, yb: yb + h, floorA: ya - 0.5, floorB: yb - 0.5, th, mat, h });
        };
        this.railRuns = [];
        for (const loop of this.outline) {
            let run = [];
            const flush = () => {
                if (run.length > 1) {
                    const s = this.simplify(run, 0.045);
                    this.railRuns.push({ pts: s, h: RAIL_H, th: RAIL_TH, mat: 0 });
                    for (let i = 0; i < s.length - 1; i++) add(s[i][0], s[i][1], s[i + 1][0], s[i + 1][1], RAIL_H, RAIL_TH, 0);
                }
                run = [];
            };
            for (const p of loop) { if (railOK(p[0], p[1])) run.push(p); else flush(); }
            flush();
        }
        for (const w of this.walls) {
            this.railRuns.push({ pts: w.pts, h: w.h, th: w.th, mat: w.mat, free: true });
            for (let i = 0; i < w.pts.length - 1; i++) add(w.pts[i][0], w.pts[i][1], w.pts[i + 1][0], w.pts[i + 1][1], w.h, w.th, w.mat);
        }
    }

    buildIndex() {
        // Coarse buckets, so the ball only ever tests the rails beside it.
        const G = this.G = 1.5, { x1, z1, x0, z0 } = this.span, gx = this.gx = Math.ceil((x1 - x0) / G) + 1, gz = this.gz = Math.ceil((z1 - z0) / G) + 1;
        const b = this.bucket = Array.from({ length: gx * gz }, () => []);
        const reach = BALL_R + 0.5;
        const addBox = (ax, az, bx, bz, item) => {
            const i0 = clamp(Math.floor((Math.min(ax, bx) - reach - x0) / G), 0, gx - 1), i1 = clamp(Math.floor((Math.max(ax, bx) + reach - x0) / G), 0, gx - 1), k0 = clamp(Math.floor((Math.min(az, bz) - reach - z0) / G), 0, gz - 1), k1 = clamp(Math.floor((Math.max(az, bz) + reach - z0) / G), 0, gz - 1);
            for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) b[i + k * gx].push(item);
        };
        for (const r of this.rails) addBox(r.ax, r.az, r.bx, r.bz, r);
        for (const p of this.posts) { p.y = this.groundAt(p.x, p.z, true); p.top = p.y + p.h; p.post = true; addBox(p.x - p.r, p.z - p.r, p.x + p.r, p.z + p.r, p); }
        for (const g of this.geysers) g.y = this.groundAt(g.x, g.z, true);
        for (const p of this.plants) p.y = this.groundAt(p.x, p.z, true);
        for (const t of this.tubes) { t.y = this.groundAt(t.x, t.z, true); t.y1 = this.groundAt(t.x1, t.z1, true); }
        for (const t of this.boosts) t.y = this.groundAt(t.x, t.z, true);
    }

    /** Raw control height, for scenery placement. Ignores fairway edges when `any` is set. */
    groundAt(x, z, any) {
        const i = clamp(Math.round((x - this.x0) / CELL), 0, this.nx - 1), k = clamp(Math.round((z - this.z0) / CELL), 0, this.nz - 1);
        if (!any) return this.H[i + k * this.nx];
        // Nearest filled sample, as rails sit right on the edge.
        const j = i + k * this.nx;
        if (this.S[j] > 0 || this.H[j] > -7) return this.H[j];
        for (let r = 1; r < 6; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
            const q = clamp(i + a, 0, this.nx - 1) + clamp(k + b, 0, this.nz - 1) * this.nx;
            if (this.H[q] > -7) return this.H[q];
        }
        return 0;
    }

    inFairway(x, z) {
        const u = (x - this.x0) / CELL, w = (z - this.z0) / CELL, i = Math.floor(u), k = Math.floor(w);
        if (i < 0 || k < 0 || i >= this.nx - 1 || k >= this.nz - 1) return false;
        const f = u - i, g = w - k, S = this.S, j = i + k * this.nx;
        const v = (S[j] * (1 - f) + S[j + 1] * f) * (1 - g) + (S[j + this.nx] * (1 - f) + S[j + this.nx + 1] * f) * g;
        return v > 0;
    }

    /** Walking distance to the cup on a half-unit grid: guides the camera, the bots and the aim hint. */
    buildField(all) {
        const step = 0.5, { x0, z0, x1, z1 } = this.span, fx = this.fx = Math.ceil((x1 - x0) / step) + 1, fz = this.fz = Math.ceil((z1 - z0) / step) + 1;
        const F = new Float64Array(fx * fz).fill(1e9);
        const ok = (i, k) => {
            const x = x0 + i * step, z = z0 + k * step;
            if (this.inFairway(x, z)) { const j = Math.round((x - x0) / CELL) + Math.round((z - z0) / CELL) * this.nx, m = this.M[j]; if (m !== LAVA && m !== WATER && (all || !this.Sec[j])) return true; }
            return this.onDeck(x, z, all);
        };
        const open = new Uint8Array(fx * fz);
        for (let k = 0; k < fz; k++) for (let i = 0; i < fx; i++) open[i + k * fx] = ok(i, k) ? 1 : 0;
        const blocked = (ax, az, bx, bz) => {
            for (const r of this.rails) {
                const d1x = bx - ax, d1z = bz - az, d2x = r.bx - r.ax, d2z = r.bz - r.az, c = d1x * d2z - d1z * d2x;
                if (Math.abs(c) < 1e-9) continue;
                const t = ((r.ax - ax) * d2z - (r.az - az) * d2x) / c, u = ((r.ax - ax) * d1z - (r.az - az) * d1x) / c;
                if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
            }
            return false;
        };
        // Links through plants, tubes and geysers.
        const links = [];
        const cell = (x, z) => clamp(Math.round((x - x0) / step), 0, fx - 1) + clamp(Math.round((z - z0) / step), 0, fz - 1) * fx;
        for (const p of this.plants) links.push([cell(p.to[0], p.to[2]), cell(p.x, p.z), 4]);
        for (const g of this.geysers) if (g.to && (all || !g.secret)) links.push([cell(g.to[0], g.to[2]), cell(g.x, g.z), 4]);
        for (const t of this.tubes) if (all || !t.secret) links.push([cell(t.x1, t.z1), cell(t.x, t.z), 3]);
        for (const j of this.jumps) links.push([cell(j.x1, j.z1), cell(j.x, j.z), 3]);
        const heap = [[0, cell(this.cup_.x, this.cup_.z)]];
        F[heap[0][1]] = 0;
        const railsNear = new Map();
        const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
        const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { let m = i; const a = 2 * i + 1, b = a + 1; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
        const near = (cx, cz) => { const key = (cx >> 3) + (cz >> 3) * 4096; let l = railsNear.get(key); if (!l) { const X = x0 + (cx >> 3) * 8 * step, Z = z0 + (cz >> 3) * 8 * step; l = this.rails.filter((r) => Math.min(r.ax, r.bx) < X + 5 && Math.max(r.ax, r.bx) > X - 1 && Math.min(r.az, r.bz) < Z + 5 && Math.max(r.az, r.bz) > Z - 1); railsNear.set(key, l); } return l; };
        const rails = this.rails;
        while (heap.length) {
            const [d, c] = pop();
            if (d > F[c]) continue;
            const i = c % fx, k = (c - i) / fx, X = x0 + i * step, Z = z0 + k * step;
            for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                const a = i + da, b = k + db;
                if (a < 0 || b < 0 || a >= fx || b >= fz) continue;
                const n = a + b * fx;
                if (!open[n]) continue;
                const nd = d + Math.hypot(da, db) * step;
                if (nd >= F[n]) continue;
                this.rails = near(i, k);
                const hit = blocked(X, Z, x0 + a * step, z0 + b * step);
                this.rails = rails;
                if (hit) continue;
                F[n] = nd; push([nd, n]);
            }
            for (const l of links) if (l[0] === c) { const nd = d + l[2]; if (nd < F[l[1]]) { F[l[1]] = nd; push([nd, l[1]]); } }
        }
        return F;
    }

    /** Is a fixed or moving slab ever over this point? Rough: uses its rest pose plus its travel. */
    onDeck(x, z, all = true) {
        for (const d of this.decks) {
            if (d.secret && !all) continue;
            const mx = d.move ? Math.abs(d.move[0]) : 0, mz = d.move ? Math.abs(d.move[2]) : 0;
            if (d.R) { if (Math.hypot(x - d.x, z - d.z) < d.R + Math.max(mx, mz)) return true; continue; }
            const c = Math.cos(d.yaw), s = Math.sin(d.yaw), dx = x - d.x, dz = z - d.z, u = c * dx - s * dz, w = s * dx + c * dz;
            if (Math.abs(u) < d.hw + mx && Math.abs(w) < d.hd + mz) return true;
        }
        return false;
    }

    /** Walking distance at a point. */
    fieldAt(x, z, F = this.Fall) {
        const step = 0.5, i = clamp(Math.round((x - this.x0) / step), 0, this.fx - 1), k = clamp(Math.round((z - this.z0) / step), 0, this.fz - 1);
        let best = F[i + k * this.fx];
        if (best < 1e8) return best;
        for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) { const q = clamp(i + a, 0, this.fx - 1) + clamp(k + b, 0, this.fz - 1) * this.fx; if (F[q] < best) best = F[q] + Math.hypot(a, b) * step; }
        return best;
    }

    /** A point `ahead` units along the walking route: where the camera looks and the first aim points. */
    ahead(x, z, dist = 8) {
        const step = 0.5, { fx, fz, F, x0, z0 } = this;
        let i = clamp(Math.round((x - x0) / step), 0, fx - 1), k = clamp(Math.round((z - z0) / step), 0, fz - 1);
        // Off the main route (a secret lane, say), step onto the nearest of it first.
        if (F[i + k * fx] > 1e8) { let bd = 1e9, bi = i, bk = k; for (let a = -14; a <= 14; a++) for (let b = -14; b <= 14; b++) { const p = i + a, q = k + b; if (p < 0 || q < 0 || p >= fx || q >= fz || F[p + q * fx] > 1e8) continue; const d = a * a + b * b; if (d < bd) { bd = d; bi = p; bk = q; } } i = bi; k = bk; }
        for (let w = 0, m = Math.ceil(dist / step); w < m; w++) {
            let b = F[i + k * fx], bi = i, bk = k;
            for (const [a, c] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                const p = i + a, q = k + c;
                if (p < 0 || q < 0 || p >= fx || q >= fz) continue;
                if (F[p + q * fx] < b) { b = F[p + q * fx]; bi = p; bk = q; }
            }
            if (bi === i && bk === k) break;
            i = bi; k = bk;
        }
        return [x0 + i * step, z0 + k * step];
    }
}
