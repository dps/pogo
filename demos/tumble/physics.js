// Tumble Keep's rigid-body solver: rotating boxes and circles, persistent manifolds with warm starting,
// soft-step substepping (the approach of modern 2D engines), speculative contacts for fast shots,
// and island sleeping. It uses no sin/cos and no randomness, so it is deterministic across JS engines.
// Units are metres, y is down, rotation is the pair (c, s).

export const DT = 1 / 60, SUBSTEPS = 4;
const H = DT / SUBSTEPS, INV_H = 1 / H;
const SLOP = 0.005, SPECULATIVE = 0.02, AABB_MARGIN = 0.04;
const SLEEP_TIME = 0.5, SLEEP_SPEED = 0.07, MAX_SPEED = 70;
const RESTITUTION_MIN = 1.2, PUSHOUT = 3;
const HERTZ = 45, ZETA = 3;

function soft(hertz, zeta) {
    const omega = 2 * Math.PI * hertz, a1 = 2 * zeta + H * omega, a2 = H * omega * a1, a3 = 1 / (1 + a2);
    return { bias: omega / a1, mass: a2 * a3, impulse: a3 };
}
const SOFT = soft(HERTZ, ZETA), SOFT_STATIC = soft(2 * HERTZ, ZETA);

export class Body {
    constructor(world, id, kind, x, y, hw, hh, o) {
        this.id = id; this.world = world;
        this.circle = kind === 1;
        this.x = x; this.y = y; this.c = o.c ?? 1; this.s = o.s ?? 0;
        this.px = x; this.py = y; this.pc = this.c; this.ps = this.s;   // previous tick, for smooth drawing
        this.hw = hw; this.hh = hh; this.r = kind === 1 ? hw : 0;
        this.vx = o.vx ?? 0; this.vy = o.vy ?? 0; this.w = o.w ?? 0;
        const density = o.density ?? 1, isStatic = !!o.static;
        const mass = kind === 1 ? Math.PI * hw * hw * density : 4 * hw * hh * density;
        const inertia = kind === 1 ? 0.5 * mass * hw * hw : mass * (4 * hw * hw + 4 * hh * hh) / 12;
        this.mass = isStatic ? 0 : mass;
        this.im = isStatic ? 0 : 1 / mass; this.iI = isStatic ? 0 : 1 / inertia;
        this.isStatic = isStatic;
        this.friction = o.friction ?? 0.6; this.bounce = o.bounce ?? 0.05;
        this.gravity = o.gravity ?? 1;
        this.linDamp = o.linDamp ?? 0.01; this.angDamp = o.angDamp ?? 0.05;
        this.awake = !isStatic; this.sleepT = 0; this.noSleep = false; this.island = -1;
        this.touching = 0; this.load = 0; this.alive = true;
        this.sx = 0; this.sy = 0; this.dc = 1; this.ds = 0;             // delta from tick start, per substep
        this.minX = 0; this.minY = 0; this.maxX = 0; this.maxY = 0;
        this.ud = null;                                                  // owner data
        this.uf = 0;
    }
    /** World position of a local point. */
    wx(lx, ly) { return this.x + this.c * lx - this.s * ly; }
    wy(lx, ly) { return this.y + this.s * lx + this.c * ly; }
    bounds() {
        const ac = Math.abs(this.c), as = Math.abs(this.s);
        const ex = this.circle ? this.r : this.hw * ac + this.hh * as, ey = this.circle ? this.r : this.hw * as + this.hh * ac;
        const m = AABB_MARGIN, sp = this.awake ? Math.abs(this.vx) * DT : 0, sq = this.awake ? Math.abs(this.vy) * DT : 0;
        this.minX = this.x - ex - m - sp; this.maxX = this.x + ex + m + sp;
        this.minY = this.y - ey - m - sq; this.maxY = this.y + ey + m + sq;
    }
}

class Point {
    constructor() {
        this.ax = 0; this.ay = 0; this.bx = 0; this.by = 0;     // anchors relative to each centre
        this.sep = 0; this.adj = 0; this.ni = 0; this.ti = 0; this.maxNi = 0; this.sumNi = 0; this.id = -1;
        this.nm = 0; this.tm = 0; this.relV = 0;
    }
}

class Contact {
    constructor(a, b, key) {
        this.a = a; this.b = b; this.key = key;
        this.nx = 0; this.ny = 0; this.count = 0; this.p0 = new Point(); this.p1 = new Point();
        this.fr = Math.sqrt(a.friction * b.friction); this.rest = Math.max(a.bounce, b.bounce);
        this.fresh = true; this.soft = SOFT;
    }
}

const scratch = [new Point(), new Point()];
function setPoint(c, i, wx, wy, sep, id) {
    const q = i === 0 ? c.p0 : c.p1;
    let ni = 0, ti = 0;
    if (c.p0.id === id && c.oldCount > 0) { ni = c.oldN0; ti = c.oldT0; }
    else if (c.p1.id === id && c.oldCount > 1) { ni = c.oldN1; ti = c.oldT1; }
    scratch[i].ax = wx - c.a.x; scratch[i].ay = wy - c.a.y; scratch[i].bx = wx - c.b.x; scratch[i].by = wy - c.b.y;
    scratch[i].sep = sep; scratch[i].ni = ni; scratch[i].ti = ti; scratch[i].id = id;
    return q;
}
function commit(c, n) {
    for (let i = 0; i < n; i++) {
        const q = i === 0 ? c.p0 : c.p1, r = scratch[i];
        q.ax = r.ax; q.ay = r.ay; q.bx = r.bx; q.by = r.by; q.sep = r.sep; q.ni = r.ni; q.ti = r.ti; q.id = r.id;
    }
    c.count = n;
}
function begin(c) {
    c.oldCount = c.count; c.oldN0 = c.p0.ni; c.oldT0 = c.p0.ti; c.oldN1 = c.p1.ni; c.oldT1 = c.p1.ti;
}

function circleCircle(c, margin) {
    const a = c.a, b = c.b, dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy), sep = d - a.r - b.r;
    begin(c);
    if (sep > margin) { c.count = 0; return; }
    const nx = d > 1e-9 ? dx / d : 0, ny = d > 1e-9 ? dy / d : 1;
    c.nx = nx; c.ny = ny;
    setPoint(c, 0, a.x + nx * (a.r + sep / 2), a.y + ny * (a.r + sep / 2), sep, 0);
    commit(c, 1);
}

function boxCircle(c, margin) {
    const a = c.a, b = c.b, dx = b.x - a.x, dy = b.y - a.y;
    const lx = a.c * dx + a.s * dy, ly = -a.s * dx + a.c * dy, hw = a.hw, hh = a.hh;
    const qx = lx < -hw ? -hw : lx > hw ? hw : lx, qy = ly < -hh ? -hh : ly > hh ? hh : ly;
    begin(c);
    let nlx, nly, sep;
    if (qx === lx && qy === ly) {                      // centre inside: push out of the nearest face
        const fx = hw - Math.abs(lx), fy = hh - Math.abs(ly);
        if (fx < fy) { nlx = lx >= 0 ? 1 : -1; nly = 0; sep = -fx - b.r; }
        else { nlx = 0; nly = ly >= 0 ? 1 : -1; sep = -fy - b.r; }
    } else {
        const ex = lx - qx, ey = ly - qy, d = Math.sqrt(ex * ex + ey * ey);
        sep = d - b.r;
        if (sep > margin) { c.count = 0; return; }
        nlx = ex / d; nly = ey / d;
    }
    const nx = a.c * nlx - a.s * nly, ny = a.s * nlx + a.c * nly;
    c.nx = nx; c.ny = ny;
    setPoint(c, 0, b.x - nx * (b.r + sep / 2), b.y - ny * (b.r + sep / 2), sep, 0);
    commit(c, 1);
}

function boxBox(c, margin) {
    const A = c.a, B = c.b;
    const dx = B.x - A.x, dy = B.y - A.y;
    const ax0 = A.c, ax1 = A.s, ay0 = -A.s, ay1 = A.c, bx0 = B.c, bx1 = B.s, by0 = -B.s, by1 = B.c;
    const xx = Math.abs(ax0 * bx0 + ax1 * bx1), xy = Math.abs(ax0 * by0 + ax1 * by1);
    const yx = Math.abs(ay0 * bx0 + ay1 * bx1), yy = Math.abs(ay0 * by0 + ay1 * by1);
    const dax = dx * ax0 + dy * ax1, day = dx * ay0 + dy * ay1, dbx = dx * bx0 + dy * bx1, dby = dx * by0 + dy * by1;
    const s0 = Math.abs(dax) - A.hw - (B.hw * xx + B.hh * xy);
    const s1 = Math.abs(day) - A.hh - (B.hw * yx + B.hh * yy);
    const s2 = Math.abs(dbx) - B.hw - (A.hw * xx + A.hh * yx);
    const s3 = Math.abs(dby) - B.hh - (A.hw * xy + A.hh * yy);
    begin(c);
    if (s0 > margin || s1 > margin || s2 > margin || s3 > margin) { c.count = 0; return; }
    // Best axis, with a small bias so a resting pair never flips between faces.
    let best = 0, sep = s0;
    if (s1 > sep + 0.001) { best = 1; sep = s1; }
    if (s2 > sep + 0.002) { best = 2; sep = s2; }
    if (s3 > sep + 0.002) { best = 3; sep = s3; }
    const flip = best >= 2, R = flip ? B : A, I = flip ? A : B;
    let nx, ny, ext, tx, ty, L;
    if (best === 0) { const sg = dax >= 0 ? 1 : -1; nx = ax0 * sg; ny = ax1 * sg; ext = A.hw; L = A.hh; tx = ay0; ty = ay1; }
    else if (best === 1) { const sg = day >= 0 ? 1 : -1; nx = ay0 * sg; ny = ay1 * sg; ext = A.hh; L = A.hw; tx = ax0; ty = ax1; }
    else if (best === 2) { const sg = dbx >= 0 ? -1 : 1; nx = bx0 * sg; ny = bx1 * sg; ext = B.hw; L = B.hh; tx = by0; ty = by1; }
    else { const sg = dby >= 0 ? -1 : 1; nx = by0 * sg; ny = by1 * sg; ext = B.hh; L = B.hw; tx = bx0; ty = bx1; }
    const px = R.x + nx * ext, py = R.y + ny * ext;
    // Incident edge: the face of I most opposed to the normal.
    const ix0 = I.c, ix1 = I.s, iy0 = -I.s, iy1 = I.c;
    const dotx = nx * ix0 + ny * ix1, doty = nx * iy0 + ny * iy1;
    let cx, cy, ex, ey, face;
    if (Math.abs(dotx) > Math.abs(doty)) {
        const sg = dotx > 0 ? -1 : 1;
        cx = I.x + ix0 * sg * I.hw; cy = I.y + ix1 * sg * I.hw; ex = iy0 * I.hh; ey = iy1 * I.hh; face = sg > 0 ? 0 : 1;
    } else {
        const sg = doty > 0 ? -1 : 1;
        cx = I.x + iy0 * sg * I.hh; cy = I.y + iy1 * sg * I.hh; ex = ix0 * I.hw; ey = ix1 * I.hw; face = sg > 0 ? 2 : 3;
    }
    let v1x = cx - ex, v1y = cy - ey, v2x = cx + ex, v2y = cy + ey;
    let u1 = (v1x - px) * tx + (v1y - py) * ty, u2 = (v2x - px) * tx + (v2y - py) * ty;
    if ((u1 < -L && u2 < -L) || (u1 > L && u2 > L)) { c.count = 0; return; }
    let clip1 = 0, clip2 = 0;
    const clipTo = (lim, sign) => {
        const d1 = sign * (u1 - lim), d2 = sign * (u2 - lim);
        if (d1 > 0 && d2 <= 0) { const k = d1 / (d1 - d2); v1x += (v2x - v1x) * k; v1y += (v2y - v1y) * k; u1 = lim; clip1 = sign > 0 ? 1 : 2; }
        else if (d2 > 0 && d1 <= 0) { const k = d2 / (d2 - d1); v2x += (v1x - v2x) * k; v2y += (v1y - v2y) * k; u2 = lim; clip2 = sign > 0 ? 1 : 2; }
    };
    clipTo(L, 1); clipTo(-L, -1);
    const sp1 = (v1x - px) * nx + (v1y - py) * ny, sp2 = (v2x - px) * nx + (v2y - py) * ny;
    const flipS = flip ? -1 : 1;
    c.nx = nx * flipS; c.ny = ny * flipS;
    const base = (best << 6) | (face << 4);
    let n = 0;
    if (sp1 <= margin) { setPoint(c, n, v1x - nx * sp1 / 2, v1y - ny * sp1 / 2, sp1, base | (clip1 << 1)); n++; }
    if (sp2 <= margin) { setPoint(c, n, v2x - nx * sp2 / 2, v2y - ny * sp2 / 2, sp2, base | (clip2 << 1) | 1); n++; }
    commit(c, n);
}

export class World {
    constructor(o = {}) {
        this.gx = o.gx ?? 0; this.gy = o.gy ?? 14;
        this.bodies = []; this.sorted = []; this.contacts = []; this.pairs = new Map();
        this.nextId = 1; this.nextIsland = 1; this.islands = new Map();
        this.onImpact = null;                       // (contact, point, approachSpeed) after solving
        this.tick = 0; this.awakeCount = 0; this.flow = 0;
    }
    box(x, y, w, h, o = {}) { return this.add(new Body(this, this.nextId++, 0, x, y, w / 2, h / 2, o)); }
    ball(x, y, r, o = {}) { return this.add(new Body(this, this.nextId++, 1, x, y, r, r, o)); }
    add(b) { b.bounds(); this.bodies.push(b); this.sorted.push(b); return b; }

    /** Remove a body, waking whatever was resting on it. */
    remove(b) {
        if (!b.alive) return;
        b.alive = false;
        const list = this.contacts;
        for (let i = list.length - 1; i >= 0; i--) {
            const c = list[i];
            if (c.a !== b && c.b !== b) continue;
            const other = c.a === b ? c.b : c.a;
            if (c.count > 0) this.wake(other);
            this.pairs.delete(c.key);
            this.dropContact(i);
        }
        this.bodies.splice(this.bodies.indexOf(b), 1);
        this.sorted.splice(this.sorted.indexOf(b), 1);
        if (b.island > 0) { const isl = this.islands.get(b.island); if (isl) { const k = isl.indexOf(b); if (k >= 0) isl.splice(k, 1); } }
    }
    /** Keeps order, so the solver order only ever depends on what happened. */
    dropContact(i) { this.contacts.splice(i, 1); }

    wake(b) {
        if (b.isStatic) return;
        b.sleepT = 0;
        if (b.awake) return;
        const isl = this.islands.get(b.island);
        if (isl) {
            for (let i = 0; i < isl.length; i++) { const o = isl[i]; o.awake = true; o.sleepT = 0; o.island = -1; }
            this.islands.delete(b.island);
        } else { b.awake = true; b.island = -1; }
    }
    /** Put a whole structure to sleep immediately: used when a level is built. */
    sleepAll() {
        this.step0();
        for (const b of this.bodies) if (!b.isStatic) b.sleepT = SLEEP_TIME;
        this.findIslands(true);
    }
    step0() { this.broadphase(); this.narrowphase(); }

    broadphase() {
        const list = this.sorted, n = list.length;
        for (let i = 0; i < n; i++) if (list[i].awake || this.tick === 0) list[i].bounds();
        for (let i = 1; i < n; i++) {             // insertion sort: nearly sorted from the last step
            const b = list[i], k = b.minX;
            let j = i - 1;
            while (j >= 0 && list[j].minX > k) { list[j + 1] = list[j]; j--; }
            list[j + 1] = b;
        }
        const pairs = this.pairs, all = this.tick === 0;
        for (let i = 0; i < n; i++) {
            const a = list[i], xe = a.maxX, y0 = a.minY, y1 = a.maxY, aw = a.awake || all;
            for (let j = i + 1; j < n; j++) {
                const b = list[j];
                if (b.minX > xe) break;
                if (!aw && !b.awake) continue;
                if (b.minY > y1 || b.maxY < y0) continue;
                if (a.isStatic && b.isStatic) continue;
                const p = a.id < b.id ? a : b, q = a.id < b.id ? b : a;
                const f = p.circle && !q.circle ? q : p, g = f === p ? q : p;        // box first
                const key = f.id * 1048576 + g.id;
                if (!pairs.has(key)) { const c = new Contact(f, g, key); pairs.set(key, c); this.contacts.push(c); }
            }
        }
    }

    narrowphase() {
        const list = this.contacts;
        for (let i = 0, n = this.bodies.length; i < n; i++) this.bodies[i].touching = 0;
        let w = 0;
        for (let i = 0; i < list.length; i++) {
            const c = list[i], a = c.a, b = c.b;
            if (!a.awake && !b.awake && this.tick > 0) {       // both sleeping or static: keep the manifold as it is
                if (c.count > 0) { a.touching++; b.touching++; }
                list[w++] = c; continue;
            }
            if (a.minX > b.maxX || b.minX > a.maxX || a.minY > b.maxY || b.minY > a.maxY) {
                this.pairs.delete(c.key); continue;
            }
            const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
            const margin = SPECULATIVE + Math.sqrt(dvx * dvx + dvy * dvy) * DT;
            if (a.circle) circleCircle(c, margin);
            else if (b.circle) boxCircle(c, margin);
            else boxBox(c, margin);
            if (c.count > 0) {
                a.touching++; b.touching++;
                if (a.awake && !b.awake) this.wake(b); else if (b.awake && !a.awake) this.wake(a);
            }
            list[w++] = c;
        }
        list.length = w;
    }

    prepare() {
        const out = this.active = this.active ?? [];
        out.length = 0;
        const list = this.contacts;
        for (let i = 0; i < list.length; i++) {
            const c = list[i], a = c.a, b = c.b;
            if (c.count === 0 || (!a.awake && !b.awake)) continue;
            out.push(c);
            c.soft = a.isStatic || b.isStatic ? SOFT_STATIC : SOFT;
            const nx = c.nx, ny = c.ny, tx = -ny, ty = nx;
            const ma = a.im, mb = b.im, ia = a.iI, ib = b.iI;
            for (let k = 0; k < c.count; k++) {
                const p = k === 0 ? c.p0 : c.p1;
                const rn1 = p.ax * ny - p.ay * nx, rn2 = p.bx * ny - p.by * nx;
                p.nm = 1 / (ma + mb + ia * rn1 * rn1 + ib * rn2 * rn2);
                const rt1 = p.ax * ty - p.ay * tx, rt2 = p.bx * ty - p.by * tx;
                p.tm = 1 / (ma + mb + ia * rt1 * rt1 + ib * rt2 * rt2);
                p.adj = p.sep - ((p.bx - p.ax) * nx + (p.by - p.ay) * ny);
                const rvx = b.vx - b.w * p.by - a.vx + a.w * p.ay, rvy = b.vy + b.w * p.bx - a.vy - a.w * p.ax;
                p.relV = rvx * nx + rvy * ny;
                p.maxNi = 0; p.sumNi = 0;
            }
            c.fresh = false;
        }
    }

    warm() {
        const list = this.active;
        for (let i = 0; i < list.length; i++) {
            const c = list[i], a = c.a, b = c.b, nx = c.nx, ny = c.ny, tx = -ny, ty = nx;
            for (let k = 0; k < c.count; k++) {
                const p = k === 0 ? c.p0 : c.p1;
                const px = nx * p.ni + tx * p.ti, py = ny * p.ni + ty * p.ti;
                a.w -= a.iI * (p.ax * py - p.ay * px); a.vx -= a.im * px; a.vy -= a.im * py;
                b.w += b.iI * (p.bx * py - p.by * px); b.vx += b.im * px; b.vy += b.im * py;
            }
        }
    }

    solve(useBias, flip) {
        const list = this.active, n = list.length, d0 = flip ? -1 : 1;
        for (let i = flip ? n - 1 : 0; i >= 0 && i < n; i += d0) {
            const c = list[i], a = c.a, b = c.b, nx = c.nx, ny = c.ny, tx = -ny, ty = nx, sf = c.soft;
            const ma = a.im, mb = b.im, ia = a.iI, ib = b.iI, adc = a.dc, ads = a.ds, bdc = b.dc, bds = b.ds;
            const dpx = (b.x - b.sx) - (a.x - a.sx), dpy = (b.y - b.sy) - (a.y - a.sy);
            let avx = a.vx, avy = a.vy, aw = a.w, bvx = b.vx, bvy = b.vy, bw = b.w;
            for (let k = 0; k < c.count; k++) {
                const p = (k === 0) !== flip ? c.p0 : (c.count > 1 ? c.p1 : c.p0), ax = p.ax, ay = p.ay, bx = p.bx, by = p.by;
                const prax = adc * ax - ads * ay, pray = ads * ax + adc * ay;
                const prbx = bdc * bx - bds * by, prby = bds * bx + bdc * by;
                const s = (dpx + prbx - prax) * nx + (dpy + prby - pray) * ny + p.adj;
                let bias = 0, ms = 1, is = 0;
                if (s > 0) bias = s * INV_H;
                else if (useBias) {
                    const q = sf.bias * (s + SLOP > 0 ? 0 : s + SLOP);
                    bias = q > -PUSHOUT ? q : -PUSHOUT; ms = sf.mass; is = sf.impulse;
                }
                const rvx = bvx - bw * by - avx + aw * ay, rvy = bvy + bw * bx - avy - aw * ax;
                const vn = rvx * nx + rvy * ny;
                let imp = -p.nm * ms * (vn + bias) - is * p.ni;
                const nw = p.ni + imp > 0 ? p.ni + imp : 0;
                imp = nw - p.ni; p.ni = nw;
                if (nw > p.maxNi) p.maxNi = nw;
                const ix = imp * nx, iy = imp * ny;
                aw -= ia * (ax * iy - ay * ix); avx -= ma * ix; avy -= ma * iy;
                bw += ib * (bx * iy - by * ix); bvx += mb * ix; bvy += mb * iy;
            }
            for (let k = 0; k < c.count; k++) {
                const p = (k === 0) !== flip ? c.p0 : (c.count > 1 ? c.p1 : c.p0), ax = p.ax, ay = p.ay, bx = p.bx, by = p.by;
                const rvx = bvx - bw * by - avx + aw * ay, rvy = bvy + bw * bx - avy - aw * ax;
                const vt = rvx * tx + rvy * ty;
                const lim = c.fr * p.ni;
                let nt = p.ti - p.tm * vt;
                nt = nt > lim ? lim : nt < -lim ? -lim : nt;
                const imp = nt - p.ti; p.ti = nt;
                const ix = imp * tx, iy = imp * ty;
                aw -= ia * (ax * iy - ay * ix); avx -= ma * ix; avy -= ma * iy;
                bw += ib * (bx * iy - by * ix); bvx += mb * ix; bvy += mb * iy;
            }
            a.vx = avx; a.vy = avy; a.w = aw; b.vx = bvx; b.vy = bvy; b.w = bw;
        }
    }

    restitution() {
        const list = this.active;
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (c.rest <= 0) continue;
            const a = c.a, b = c.b, nx = c.nx, ny = c.ny;
            for (let k = 0; k < c.count; k++) {
                const p = k === 0 ? c.p0 : c.p1;
                if (p.relV > -RESTITUTION_MIN || p.maxNi === 0) continue;
                const rvx = b.vx - b.w * p.by - a.vx + a.w * p.ay, rvy = b.vy + b.w * p.bx - a.vy - a.w * p.ax;
                const vn = rvx * nx + rvy * ny;
                let imp = -p.nm * (vn + c.rest * p.relV);
                const nw = p.ni + imp > 0 ? p.ni + imp : 0;
                imp = nw - p.ni; p.ni = nw;
                if (nw > p.maxNi) p.maxNi = nw;
                const ix = imp * nx, iy = imp * ny;
                a.w -= a.iI * (p.ax * iy - p.ay * ix); a.vx -= a.im * ix; a.vy -= a.im * iy;
                b.w += b.iI * (p.bx * iy - p.by * ix); b.vx += b.im * ix; b.vy += b.im * iy;
            }
        }
    }

    findIslands(force) {
        const bodies = this.bodies, n = bodies.length;
        let any = force;
        for (let i = 0; i < n && !any; i++) { const b = bodies[i]; if (b.awake && b.sleepT >= SLEEP_TIME) any = true; }
        if (!any) return;
        const parent = this.parent = this.parent && this.parent.length >= n ? this.parent : new Int32Array(n * 2 + 8);
        for (let i = 0; i < n; i++) { parent[i] = i; bodies[i].uf = i; }
        const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        const list = this.contacts;
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            if (c.count === 0 || c.a.isStatic || c.b.isStatic) continue;
            const x = find(c.a.uf), y = find(c.b.uf);
            if (x !== y) { if (x < y) parent[y] = x; else parent[x] = y; }
        }
        const groups = new Map();
        for (let i = 0; i < n; i++) {
            const b = bodies[i];
            if (!b.awake) continue;
            const r = find(i);
            let g = groups.get(r);
            if (!g) groups.set(r, g = { list: [], ok: true });
            g.list.push(b);
            if (b.sleepT < SLEEP_TIME || b.noSleep) g.ok = false;
        }
        for (const g of groups.values()) {
            if (!g.ok) continue;
            const id = this.nextIsland++;
            for (const b of g.list) { b.awake = false; b.island = id; b.vx = 0; b.vy = 0; b.w = 0; b.sleepT = 0; b.bounds(); }
            this.islands.set(id, g.list);
        }
    }

    step() {
        const bodies = this.bodies, n0 = bodies.length;
        for (let i = 0; i < n0; i++) { const b = bodies[i]; b.px = b.x; b.py = b.y; b.pc = b.c; b.ps = b.s; }
        this.broadphase();
        this.narrowphase();
        this.prepare();
        const n = bodies.length, gx = this.gx * H, gy = this.gy * H;
        let awake = 0;
        for (let i = 0; i < n; i++) {
            const b = bodies[i];
            b.sx = b.x; b.sy = b.y; b.dc = 1; b.ds = 0; b.load = 0;
            if (b.awake) awake++;
        }
        this.awakeCount = awake;
        for (let sub = 0; sub < SUBSTEPS; sub++) {
            for (let i = 0; i < n; i++) {
                const b = bodies[i];
                if (!b.awake) continue;
                const ld = 1 / (1 + H * b.linDamp), ad = 1 / (1 + H * b.angDamp);
                b.vx = (b.vx + gx * b.gravity) * ld; b.vy = (b.vy + gy * b.gravity) * ld; b.w *= ad;
            }
            this.warm();
            this.solve(true, sub % 2 === 1);
            for (let i = 0; i < n; i++) {
                const b = bodies[i];
                if (!b.awake) continue;
                b.x += H * b.vx; b.y += H * b.vy;
                const d = H * b.w;
                let c = b.c - d * b.s, s = b.s + d * b.c, m = 1 / Math.sqrt(c * c + s * s);
                b.c = c * m; b.s = s * m;
                c = b.dc - d * b.ds; s = b.ds + d * b.dc; m = 1 / Math.sqrt(c * c + s * s);
                b.dc = c * m; b.ds = s * m;
            }
            this.solve(false, sub % 2 === 0);
        }
        this.restitution();
        // Report impacts and sum the energy that moved through contacts this tick.
        let flow = 0;
        const list = this.active, cb = this.onImpact;
        for (let i = 0; i < list.length; i++) {
            const c = list[i];
            for (let k = 0; k < c.count; k++) {
                const p = k === 0 ? c.p0 : c.p1;
                const J = p.maxNi, v = -p.relV;
                c.a.load += p.ni; c.b.load += p.ni;
                if (v > 0.25) { flow += J * v; if (cb) cb(c, p, v, J); }
            }
        }
        this.flow = flow;
        for (let i = 0; i < n; i++) {
            const b = bodies[i];
            if (!b.awake) continue;
            const sp = b.vx * b.vx + b.vy * b.vy;
            if (sp > MAX_SPEED * MAX_SPEED) { const k = MAX_SPEED / Math.sqrt(sp); b.vx *= k; b.vy *= k; }
            const rad = b.circle ? b.r : b.hw + b.hh, rot = b.w * rad;
            if (sp + rot * rot < SLEEP_SPEED * SLEEP_SPEED && !b.noSleep) b.sleepT += DT; else b.sleepT = 0;
        }
        this.findIslands(false);
        this.tick++;
    }

    /** A hash of the whole state, for determinism checks. */
    hash() {
        let h = 0;
        const mix = (v) => { h = (Math.imul(h, 31) + (Math.round(v * 1e6) | 0)) | 0; };
        for (const b of this.bodies) { mix(b.id); mix(b.x); mix(b.y); mix(b.c); mix(b.s); mix(b.vx); mix(b.vy); mix(b.w); }
        return h >>> 0;
    }
}
