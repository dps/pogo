// A merged-mesh builder: flat-shaded low-poly primitives written into one vertex list, so a whole model is one draw call.
// Adds an inked outline (an inverted hull), crumpling for damaged furniture, and furry jitter.

export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

export class MB {
    constructor() {
        this.pos = []; this.nor = []; this.col = []; this.idx = [];
        this.m = null;
    }
    get verts() { return this.pos.length / 3; }
    get tris() { return this.idx.length / 3; }

    /** Set the transform for what follows: origin, yaw, scale. */
    at(x = 0, y = 0, z = 0, yaw = 0, sx = 1, sy = sx, sz = sx) {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        this.m = [c * sx, 0, -s * sx, 0, sy, 0, s * sz, 0, c * sz, x, y, z];
        return this;
    }
    /** Set the transform from a full basis: right, up and back axes, then origin. */
    basis(r, u, b, o) { this.m = [r[0], r[1], r[2], u[0], u[1], u[2], b[0], b[1], b[2], o[0], o[1], o[2]]; return this; }
    reset() { this.m = null; return this; }
    tx(p) {
        const m = this.m;
        if (!m) return p;
        return [m[0] * p[0] + m[3] * p[1] + m[6] * p[2] + m[9], m[1] * p[0] + m[4] * p[1] + m[7] * p[2] + m[10], m[2] * p[0] + m[5] * p[1] + m[8] * p[2] + m[11]];
    }

    /** Counter-clockwise from the front. One colour, or one per corner. */
    quad(a, b, c, d, ca, cb = ca, cc = cb, cd = cc) {
        a = this.tx(a); b = this.tx(b); c = this.tx(c); d = this.tx(d);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const base = this.pos.length / 3;
        this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        this.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
        this.col.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2], cd[0], cd[1], cd[2]);
        this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
        return this;
    }
    tri(a, b, c, col, col2 = col, col3 = col2) {
        a = this.tx(a); b = this.tx(b); c = this.tx(c);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const base = this.pos.length / 3;
        this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        this.nor.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
        this.col.push(col[0], col[1], col[2], col2[0], col2[1], col2[2], col3[0], col3[1], col3[2]);
        this.idx.push(base, base + 1, base + 2);
        return this;
    }

    /** Box sitting on y. o: { top, shade (bottom darkening), taper (top scale), bottom (draw underside), noBack } */
    box(cx, y, cz, w, h, d, col, o = {}) {
        const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y0 = y, y1 = y + h;
        const t = o.taper ?? 1, tx = (o.taperX ?? t), tz = (o.taperZ ?? t);
        const X0 = cx - w / 2 * tx, X1 = cx + w / 2 * tx, Z0 = cz - d / 2 * tz, Z1 = cz + d / 2 * tz;
        const lo = o.shade === undefined ? mul(col, 0.8) : mul(col, o.shade), hi = col, top = o.top ?? col;
        this.quad([x1, y0, z1], [x1, y0, z0], [X1, y1, Z0], [X1, y1, Z1], lo, lo, hi, hi);
        this.quad([x0, y0, z0], [x0, y0, z1], [X0, y1, Z1], [X0, y1, Z0], lo, lo, hi, hi);
        this.quad([x0, y0, z1], [x1, y0, z1], [X1, y1, Z1], [X0, y1, Z1], lo, lo, hi, hi);
        if (!o.noBack) this.quad([x1, y0, z0], [x0, y0, z0], [X0, y1, Z0], [X1, y1, Z0], lo, lo, hi, hi);
        if (!o.noTop) this.quad([X0, y1, Z1], [X1, y1, Z1], [X1, y1, Z0], [X0, y1, Z0], top, top, top, top);
        if (o.bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], lo, lo, lo, lo);
        return this;
    }

    /** Just the face and lid of a box: all that shows of something on a shelf. Front is at z. */
    front(cx, y, z, w, h, col) {
        const x0 = cx - w / 2, x1 = cx + w / 2, y1 = y + h, lo = mul(col, 0.74), d = 0.3;
        this.quad([x0, y, z], [x1, y, z], [x1, y1, z], [x0, y1, z], lo, lo, col, col);
        this.quad([x0, y1, z], [x1, y1, z], [x1, y1, z - d], [x0, y1, z - d], mul(col, 1.1));
        return this;
    }

    /** Upright n-gon prism or cone. o: { r2 (top radius), top, shade, cap } */
    cyl(cx, y, cz, r, h, seg, col, o = {}) {
        const r2 = o.r2 ?? r, lo = o.shade === undefined ? mul(col, 0.8) : mul(col, o.shade), top = o.top ?? col;
        const y1 = y + h, rot = o.rot ?? 0;
        for (let i = 0; i < seg; i++) {
            const a0 = rot + i / seg * Math.PI * 2, a1 = rot + (i + 1) / seg * Math.PI * 2;
            const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
            if (r2 > 1e-3) this.quad([cx + r * c1, y, cz + r * s1], [cx + r * c0, y, cz + r * s0], [cx + r2 * c0, y1, cz + r2 * s0], [cx + r2 * c1, y1, cz + r2 * s1], lo, lo, col, col);
            else this.tri([cx + r * c1, y, cz + r * s1], [cx + r * c0, y, cz + r * s0], [cx, y1, cz], lo, lo, col);
            if (r2 > 1e-3 && o.cap !== false) this.tri([cx, y1, cz], [cx + r2 * c1, y1, cz + r2 * s1], [cx + r2 * c0, y1, cz + r2 * s0], top);
            if (o.bottom) this.tri([cx, y, cz], [cx + r * c0, y, cz + r * s0], [cx + r * c1, y, cz + r * s1], lo);
        }
        return this;
    }

    /** Horizontal prism along x, e.g. wheels, rolling pins, loaves. */
    cylX(cx, cy, cz, r, len, seg, col, o = {}) {
        const x0 = cx - len / 2, x1 = cx + len / 2, cap = o.cap ?? col, rot = o.rot ?? 0, r2 = o.r2 ?? r;
        for (let i = 0; i < seg; i++) {
            const a0 = rot + i / seg * Math.PI * 2, a1 = rot + (i + 1) / seg * Math.PI * 2;
            const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
            this.quad([x0, cy + r * s0, cz + r * c0], [x1, cy + r2 * s0, cz + r2 * c0], [x1, cy + r2 * s1, cz + r2 * c1], [x0, cy + r * s1, cz + r * c1], mul(col, o.shadeBy ? 0.75 + 0.25 * (s0 + 1) / 2 : 1), mul(col, o.shadeBy ? 0.75 + 0.25 * (s0 + 1) / 2 : 1), col, col);
            this.tri([x1, cy, cz], [x1, cy + r2 * s0, cz + r2 * c0], [x1, cy + r2 * s1, cz + r2 * c1], cap);
            this.tri([x0, cy, cz], [x0, cy + r * s1, cz + r * c1], [x0, cy + r * s0, cz + r * c0], cap);
        }
        return this;
    }

    /** Horizontal prism along z. */
    cylZ(cx, cy, cz, r, len, seg, col, o = {}) {
        const z0 = cz - len / 2, z1 = cz + len / 2, cap = o.cap ?? col, r2 = o.r2 ?? r;
        for (let i = 0; i < seg; i++) {
            const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
            const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
            this.quad([cx + r * c0, cy + r * s0, z0], [cx + r * c1, cy + r * s1, z0], [cx + r2 * c1, cy + r2 * s1, z1], [cx + r2 * c0, cy + r2 * s0, z1], col, col, col, col);
            this.tri([cx, cy, z1], [cx + r2 * c0, cy + r2 * s0, z1], [cx + r2 * c1, cy + r2 * s1, z1], cap);
            this.tri([cx, cy, z0], [cx + r * c1, cy + r * s1, z0], [cx + r * c0, cy + r * s0, z0], cap);
        }
        return this;
    }

    /** Flat-shaded ball. sy squashes it. o.col2 paints alternating bands; o.bands stripes meridians. */
    ball(cx, cy, cz, r, seg, rings, col, o = {}) {
        const sy = o.sy ?? 1, sz = o.sz ?? 1, sx = o.sx ?? 1;
        const P = (i, j) => {
            const t = i / rings * Math.PI, p = j / seg * Math.PI * 2;
            return [cx + r * sx * Math.sin(t) * Math.cos(p), cy + r * sy * Math.cos(t), cz + r * sz * Math.sin(t) * Math.sin(p)];
        };
        for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
            let c = col;
            if (o.col2 && (o.bands ? j % o.bands === 0 : i % 2)) c = o.col2;
            const lit = o.shade === false ? 1 : 0.72 + 0.28 * (1 - i / rings);
            c = mul(c, lit);
            const a = P(i, j), b = P(i, j + 1), d = P(i + 1, j), e = P(i + 1, j + 1);
            if (i === 0) this.tri(a, e, d, c);
            else if (i === rings - 1) this.tri(a, b, d, c);
            else this.quad(a, b, e, d, c, c, c, c);
        }
        return this;
    }

    /** Add every vertex's offset from a position-keyed hash, so faces stay joined. Makes things lumpy or furry. */
    jitter(amount, seed = 1) {
        const p = this.pos, cache = new Map();
        for (let i = 0; i < p.length; i += 3) {
            const key = `${p[i].toFixed(3)},${p[i + 1].toFixed(3)},${p[i + 2].toFixed(3)}`;
            let o = cache.get(key);
            if (!o) {
                const r = (k) => { const s = Math.sin(p[i] * 91.7 + p[i + 1] * 47.3 + p[i + 2] * 13.9 + seed * k + k * 3.1) * 43758.5453; return (s - Math.floor(s) - 0.5) * 2; };
                o = [r(1) * amount, r(2) * amount, r(3) * amount];
                cache.set(key, o);
            }
            p[i] += o[0]; p[i + 1] += o[1]; p[i + 2] += o[2];
        }
        return this.renormal();
    }

    /** Recompute flat normals from the triangles. */
    renormal() {
        const P = this.pos, N = this.nor, I = this.idx;
        for (let t = 0; t < I.length; t += 3) {
            const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
            const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
            let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
            const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
            for (const o of [a, b, c]) { N[o] = nx; N[o + 1] = ny; N[o + 2] = nz; }
        }
        return this;
    }

    /** Ink outline: a slightly grown copy, turned inside out, in one dark colour. Call last. */
    hull(grow = 0.05, ink = [0.09, 0.07, 0.12]) {
        const P = this.pos, n = P.length / 3, I = this.idx.slice(), N = this.nor;
        // Grow along the average normal at each shared position, so corners don't split.
        const avg = new Map();
        const keyOf = (i) => `${P[i * 3].toFixed(3)},${P[i * 3 + 1].toFixed(3)},${P[i * 3 + 2].toFixed(3)}`;
        for (let i = 0; i < n; i++) {
            const k = keyOf(i);
            const a = avg.get(k) ?? [0, 0, 0];
            a[0] += N[i * 3]; a[1] += N[i * 3 + 1]; a[2] += N[i * 3 + 2];
            avg.set(k, a);
        }
        const out = [];
        for (let i = 0; i < n; i++) {
            const a = avg.get(keyOf(i)), l = Math.hypot(a[0], a[1], a[2]) || 1;
            out.push(P[i * 3] + a[0] / l * grow, P[i * 3 + 1] + a[1] / l * grow, P[i * 3 + 2] + a[2] / l * grow);
        }
        const base = n;
        for (let i = 0; i < n; i++) {
            P.push(out[i * 3], out[i * 3 + 1], out[i * 3 + 2]);
            N.push(-N[i * 3], -N[i * 3 + 1], -N[i * 3 + 2]);
            this.col.push(ink[0], ink[1], ink[2]);
        }
        for (let t = 0; t < I.length; t += 3) this.idx.push(base + I[t], base + I[t + 2], base + I[t + 1]);
        return this;
    }

    /**
     * A wrecked copy. Triangle pairs go missing, the shape slumps below `height`, and what's left is scorched and bent.
     * lose: fraction of faces removed. bend: how far vertices wander. height: everything is squashed under this.
     */
    crumple(seed, lose, bend, height, dark = 0.72) {
        const out = new MB(), P = this.pos, C = this.col, I = this.idx;
        let s = seed * 9301 + 49297;
        const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        const keep = new Map();
        const offs = new Map();
        const moved = (i) => {
            const k = `${P[i * 3].toFixed(2)},${P[i * 3 + 1].toFixed(2)},${P[i * 3 + 2].toFixed(2)}`;
            let o = offs.get(k);
            if (!o) {
                const y = P[i * 3 + 1], lim = height;
                const ny = y > lim ? lim * (0.6 + 0.4 * rnd()) + (y - lim) * 0.05 : y;
                o = [P[i * 3] + (rnd() - 0.5) * bend, Math.max(0.02, ny + (rnd() - 0.5) * bend * 0.6), P[i * 3 + 2] + (rnd() - 0.5) * bend];
                offs.set(k, o);
            }
            return o;
        };
        for (let t = 0; t + 5 < I.length + 3; t += 6) {
            if (rnd() < lose) continue;
            const shade = dark * (0.75 + rnd() * 0.45);
            for (let q = t; q < Math.min(t + 6, I.length); q++) {
                const i = I[q];
                let v = keep.get(`${i}`);
                if (v === undefined) {
                    v = out.pos.length / 3;
                    keep.set(`${i}`, v);
                    const m = moved(i);
                    out.pos.push(m[0], m[1], m[2]);
                    out.nor.push(0, 1, 0);
                    out.col.push(C[i * 3] * shade, C[i * 3 + 1] * shade, C[i * 3 + 2] * shade);
                }
                out.idx.push(v);
            }
        }
        // Flat normals want unshared vertices.
        const flat = new MB();
        for (let t = 0; t + 2 < out.idx.length; t += 3) {
            const b = flat.pos.length / 3;
            for (let k = 0; k < 3; k++) {
                const i = out.idx[t + k];
                flat.pos.push(out.pos[i * 3], out.pos[i * 3 + 1], out.pos[i * 3 + 2]);
                flat.nor.push(0, 1, 0);
                flat.col.push(out.col[i * 3], out.col[i * 3 + 1], out.col[i * 3 + 2]);
            }
            flat.idx.push(b, b + 1, b + 2);
        }
        return flat.renormal();
    }

    /** Register with the assets store under a name. */
    register(assets, name) {
        assets.mesh(name, { positions: this.pos, normals: this.nor, colors: this.col, indices: this.idx });
        return name;
    }
}
