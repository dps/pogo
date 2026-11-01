// A track is a closed 3D ribbon: control points become an evenly spaced list of samples, and everything else
// (height, banking, walls, surfaces, ramps, the AI's racing line) is looked up from them. Pogo's colliders have
// no slopes, so karts use this instead of bodies. Lookups walk from the kart's last sample, so a figure-of-eight
// where the road crosses over itself just works.

export const DS = 2.5;

const lerp = (a, b, t) => a + (b - a) * t;
const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - 3 * c + d - a) * t * t * t);

function smoothRing(a, passes, r = 1) {
    const n = a.length;
    for (let p = 0; p < passes; p++) {
        const b = a.slice();
        for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let k = -r; k <= r; k++) sum += b[(i + k + n) % n];
            a[i] = sum / (2 * r + 1);
        }
    }
    return a;
}

export class Track {
    constructor(def, mirror = false) {
        this.def = def;
        this.mirror = mirror;
        this.id = def.id + (mirror ? "_m" : "");
        const sc = def.scale ?? 1, flip = mirror ? -1 : 1;
        const cps = def.pts.map((p) => ({ x: p[0] * sc * flip, z: p[1] * sc, y: p[2] ?? 0, w: p[3]?.w ?? def.width ?? 15, bank: (p[3]?.bank ?? 0) * flip, wall: p[3]?.wall ?? def.margin ?? 5 }));
        const m = cps.length, fine = [];
        for (let i = 0; i < m; i++) {
            const a = cps[(i - 1 + m) % m], b = cps[i], c = cps[(i + 1) % m], d = cps[(i + 2) % m];
            for (let t = 0; t < 40; t++) {
                const u = t / 40;
                fine.push({ x: cr(a.x, b.x, c.x, d.x, u), z: cr(a.z, b.z, c.z, d.z, u), y: cr(a.y, b.y, c.y, d.y, u), w: lerp(b.w, c.w, u), bank: lerp(b.bank, c.bank, u), wall: lerp(b.wall, c.wall, u), cp: i + u });
            }
        }
        let total = 0;
        const lens = fine.map((f, i) => { const g = fine[(i + 1) % fine.length]; const l = Math.hypot(g.x - f.x, g.z - f.z); total += l; return l; });
        const N = this.n = Math.round(total / DS), step = total / N;
        this.length = total; this.ds = step;
        const f = (len) => new Float32Array(len);
        this.px = f(N); this.py = f(N); this.pz = f(N);
        this.tx = f(N); this.tz = f(N);          // horizontal unit tangent
        this.rx = f(N); this.rz = f(N);          // horizontal unit right
        this.hw = f(N); this.wall = f(N);        // road half width, distance from centre to the walls
        this.bank = f(N); this.tan = f(N);       // bank angle and its tangent: rise per unit of lateral offset
        this.slope = f(N);                       // rise per unit along the track
        this.curv = f(N);                        // radians per unit, + is a left turn
        this.line = f(N);                        // the racing line's lateral offset
        this.surf = new Uint8Array(N);           // 0 normal, 1 ice, 2 boost pad, 3 void
        this.ramp = new Int16Array(N).fill(-1);
        this.cps = new Float32Array(m);          // sample index of each control point
        let ci = 0, acc = 0;
        const ys = new Array(N), ws = new Array(N), banks = new Array(N), walls = new Array(N);
        let lastCp = -1;
        for (let i = 0; i < N; i++) {
            const want = i * step;
            while (acc + lens[ci] < want && ci < fine.length - 1) { acc += lens[ci]; ci++; }
            const a = fine[ci], b = fine[(ci + 1) % fine.length], u = lens[ci] ? (want - acc) / lens[ci] : 0;
            this.px[i] = lerp(a.x, b.x, u); this.pz[i] = lerp(a.z, b.z, u);
            ys[i] = lerp(a.y, b.y, u); ws[i] = a.w; banks[i] = a.bank; walls[i] = a.wall;
            const cp = Math.floor(a.cp);
            if (cp !== lastCp) { this.cps[cp] = i; lastCp = cp; }
        }
        smoothRing(ys, 4, 2); smoothRing(ws, 3, 3); smoothRing(banks, 3, 3); smoothRing(walls, 3, 2);
        for (let i = 0; i < N; i++) {
            const a = (i - 1 + N) % N, b = (i + 1) % N;
            let tx = this.px[b] - this.px[a], tz = this.pz[b] - this.pz[a];
            const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
            this.tx[i] = tx; this.tz[i] = tz;
            this.rx[i] = -tz; this.rz[i] = tx;   // heading -z gives right +x
            this.py[i] = ys[i];
            this.hw[i] = ws[i] / 2; this.wall[i] = ws[i] / 2 + walls[i];
        }
        for (let i = 0; i < N; i++) {
            const a = (i - 2 + N) % N, b = (i + 2) % N;
            const cross = this.tx[a] * this.tz[b] - this.tz[a] * this.tx[b];   // left turn is negative in this frame
            this.curv[i] = -Math.asin(Math.max(-1, Math.min(1, cross))) / (4 * step);
            this.slope[i] = (ys[b] - ys[a]) / (4 * step);
        }
        const curv = smoothRing(Array.from(this.curv), 3, 3);
        const bankK = (def.bankK ?? 7) * (Math.PI / 180) / 0.02; // degrees of bank per 0.02 rad/unit
        for (let i = 0; i < N; i++) {
            const auto = Math.max(-0.3, Math.min(0.3, curv[i] * bankK));
            const b = (banks[i] * Math.PI / 180) || 0;
            this.bank[i] = auto + b;
            this.tan[i] = Math.tan(this.bank[i]);
        }
        smoothRing(this.bank, 2, 3);
        for (let i = 0; i < N; i++) this.tan[i] = Math.tan(this.bank[i]);
        // Racing line: hug the inside of bends, swing wide before them.
        const sm = smoothRing(Array.from(curv), 2, 5);
        const line = sm.map((c, i) => Math.max(-1, Math.min(1, -c * 62)) * (this.hw[i] - 4.2));
        smoothRing(line, 4, 5);
        for (let i = 0; i < N; i++) this.line[i] = line[i];

        this.ramps = [];
        for (const r of def.ramps ?? []) {
            const start = this.index(r.at), len = Math.round((r.len ?? 11) / step);
            const ramp = { start, len, d: (r.d ?? 0) * flip, w: r.w ?? 8, h: r.h ?? 2.2, full: !r.w };
            const id = this.ramps.length;
            this.ramps.push(ramp);
            for (let k = 0; k < len; k++) this.ramp[(start + k) % N] = id;
        }
        for (const z of def.ice ?? []) this.fill(z, 1);
        this.boosts = [];
        for (const b of def.boosts ?? []) {
            const i = this.index(b.at), L = 6;
            this.boosts.push({ i, d: (b.d ?? 0) * flip, w: b.w ?? 5, len: L });
        }
        this.gaps = [];
        for (const g of def.gaps ?? []) {
            const i = this.index(g.at), len = Math.round(g.len / step);
            this.gaps.push({ i, len });
            for (let k = 0; k < len; k++) this.surf[(i + k) % N] = 3;
        }
        this.startI = 0;
    }

    /** Sample index for a position given in control points, e.g. 3.5 is halfway between cp 3 and cp 4. */
    index(at) {
        const m = this.cps.length, c = ((at % m) + m) % m, a = Math.floor(c), b = (a + 1) % m;
        let end = this.cps[b]; if (end <= this.cps[a]) end += this.n;
        return Math.round(this.cps[a] + (end - this.cps[a]) * (c - a)) % this.n;
    }
    fill(zone, value) {
        const a = this.index(zone[0]); let b = this.index(zone[1]); if (b < a) b += this.n;
        for (let i = a; i < b; i++) this.surf[i % this.n] = value;
    }
    wrap(i) { const n = this.n; return ((i % n) + n) % n; }

    /** Walk k.i so (k.x, k.z) sits between samples i and i+1, then fill k.u, k.d and detect lap crossings. */
    locate(k) {
        const { px, pz, tx, tz, n } = this;
        let i = k.i;
        for (let g = 0; g < 10; g++) {
            const j = i + 1 === n ? 0 : i + 1;
            if ((k.x - px[j]) * tx[j] + (k.z - pz[j]) * tz[j] >= 0) {
                i = j;
                if (i === 0) k.lap++;
            } else if ((k.x - px[i]) * tx[i] + (k.z - pz[i]) * tz[i] < 0) {
                if (i === 0) k.lap--;
                i = i === 0 ? n - 1 : i - 1;
            } else break;
        }
        const j = i + 1 === n ? 0 : i + 1;
        const ax = px[j] - px[i], az = pz[j] - pz[i], len2 = ax * ax + az * az;
        const dx = k.x - px[i], dz = k.z - pz[i];
        let u = (dx * ax + dz * az) / (len2 || 1);
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const rx = this.rx[i] + (this.rx[j] - this.rx[i]) * u, rz = this.rz[i] + (this.rz[j] - this.rz[i]) * u;
        k.i = i; k.u = u;
        k.d = (k.x - (px[i] + ax * u)) * rx + (k.z - (pz[i] + az * u)) * rz;
        return k;
    }

    /** Road surface height for a sample position and lateral offset, ramps included. */
    height(i, u, d) {
        const n = this.n, j = i + 1 === n ? 0 : i + 1;
        const y = this.py[i] + (this.py[j] - this.py[i]) * u, t = this.tan[i] + (this.tan[j] - this.tan[i]) * u;
        return y + t * d + this.rampH(i, u, d);
    }
    rampH(i, u, d) {
        const id = this.ramp[i];
        if (id < 0) return 0;
        const r = this.ramps[id];
        if (!r.full && Math.abs(d - r.d) > r.w / 2) return 0;
        const back = (i - r.start + this.n) % this.n, t = (back + u) / r.len;
        return r.h * (t * t * 0.5 + t * 0.5);
    }
    /** Fill out a world point for a sample and lateral offset. */
    point(i, d, u = 0) {
        i = this.wrap(i);
        const j = i + 1 === this.n ? 0 : i + 1;
        const x = this.px[i] + (this.px[j] - this.px[i]) * u, z = this.pz[i] + (this.pz[j] - this.pz[i]) * u;
        return [x + this.rx[i] * d, this.height(i, u, d), z + this.rz[i] * d];
    }
    /** Yaw that faces along the track at a sample. */
    yaw(i) { return Math.atan2(-this.tx[i], -this.tz[i]); }
    /** Shortest horizontal distance from a point to any road sample outside a window around sample `skip`. */
    clearance(x, z, skip = -1, window = 0) {
        let best = 1e9;
        for (let i = 0; i < this.n; i += 2) {
            if (skip >= 0) { const g = Math.abs(i - skip); if (Math.min(g, this.n - g) < window) continue; }
            const dx = x - this.px[i], dz = z - this.pz[i], e = Math.hypot(dx, dz) - this.wall[i];
            if (e < best) best = e;
        }
        return best;
    }
}
