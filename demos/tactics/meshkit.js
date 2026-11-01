// A small modelling kit: everything is merged into one vertex-coloured mesh, so a whole diorama is one draw call.
import { color } from "./pogo.js";

const rgb = (c) => { if (Array.isArray(c)) return c; const k = color(c); return [k.r, k.g, k.b]; };
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]; };
export const tint = (c, k) => { const x = rgb(c); return [x[0] * k, x[1] * k, x[2] * k]; };

export class Mesher {
    constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.stack = []; this.m = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; }
    /** Translate, yaw, tilt and scale everything added inside fn. */
    at(tx, ty, tz, fn, { ry = 0, rx = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
        const old = this.m;
        const cy = Math.cos(ry), sa = Math.sin(ry), cx = Math.cos(rx), sb = Math.sin(rx), cz = Math.cos(rz), sc = Math.sin(rz);
        // R = Ry * Rx * Rz
        const r = [
            cy * cz + sa * sb * sc, -cy * sc + sa * sb * cz, sa * cx,
            cx * sc, cx * cz, -sb,
            -sa * cz + cy * sb * sc, sa * sc + cy * sb * cz, cy * cx,
        ];
        const l = [r[0] * sx, r[1] * sy, r[2] * sz, r[3] * sx, r[4] * sy, r[5] * sz, r[6] * sx, r[7] * sy, r[8] * sz, tx, ty, tz];
        const o = old, n = new Array(12);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) n[i * 3 + j] = o[i * 3] * l[j] + o[i * 3 + 1] * l[3 + j] + o[i * 3 + 2] * l[6 + j];
        for (let i = 0; i < 3; i++) n[9 + i] = o[i * 3] * l[9] + o[i * 3 + 1] * l[10] + o[i * 3 + 2] * l[11] + o[9 + i];
        this.m = n;
        fn(this);
        this.m = old;
        return this;
    }
    v(x, y, z, nx, ny, nz, c) {
        const m = this.m;
        this.p.push(m[0] * x + m[1] * y + m[2] * z + m[9], m[3] * x + m[4] * y + m[5] * z + m[10], m[6] * x + m[7] * y + m[8] * z + m[11]);
        const ax = m[0] * nx + m[1] * ny + m[2] * nz, ay = m[3] * nx + m[4] * ny + m[5] * nz, az = m[6] * nx + m[7] * ny + m[8] * nz, l = Math.hypot(ax, ay, az) || 1;
        this.n.push(ax / l, ay / l, az / l);
        this.c.push(c[0], c[1], c[2]);
        return this.p.length / 3 - 1;
    }
    tri(a, b, c) { this.i.push(a, b, c); }
    quad(a, b, c, d, n, col0, col2) {
        const v = (q, cc) => this.v(q[0], q[1], q[2], n[0], n[1], n[2], cc);
        const col = rgb(col0), c2 = col2 ? rgb(col2) : col;
        const i0 = v(a, c2), i1 = v(b, c2), i2 = v(c, col), i3 = v(d, col);
        this.i.push(i0, i1, i2, i0, i2, i3);
    }
    /** Axis box centred on x,z with its base at y. `top` tints the upper face. Optional bevel gives toy edges. */
    box(x, y, z, w, h, d, col, { top, bevel = 0, base } = {}) {
        const c = rgb(col), t = top ? rgb(top) : c, b = base ? rgb(base) : tint(c, 0.8);
        const hx = w / 2, hz = d / 2, x0 = x - hx, x1 = x + hx, z0 = z - hz, z1 = z + hz, y0 = y, y1 = y + h, e = Math.min(bevel, hx, hz, h / 2);
        const yt = y1 - e, ix0 = x0 + e, ix1 = x1 - e, iz0 = z0 + e, iz1 = z1 - e;
        this.quad([ix0, y1, iz1], [ix1, y1, iz1], [ix1, y1, iz0], [ix0, y1, iz0], [0, 1, 0], t);
        this.quad([x0, y0, z1], [x1, y0, z1], [x1, yt, z1], [x0, yt, z1], [0, 0, 1], c, b);
        this.quad([x1, y0, z0], [x0, y0, z0], [x0, yt, z0], [x1, yt, z0], [0, 0, -1], c, b);
        this.quad([x1, y0, z1], [x1, y0, z0], [x1, yt, z0], [x1, yt, z1], [1, 0, 0], c, b);
        this.quad([x0, y0, z0], [x0, y0, z1], [x0, yt, z1], [x0, yt, z0], [-1, 0, 0], c, b);
        if (e > 0) {
            const k = Math.SQRT1_2, m = tint(mix(c, t, 0.6), 1.04);
            this.quad([x0, yt, z1], [x1, yt, z1], [ix1, y1, iz1], [ix0, y1, iz1], [0, k, k], m);
            this.quad([x1, yt, z0], [x0, yt, z0], [ix0, y1, iz0], [ix1, y1, iz0], [0, k, -k], m);
            this.quad([x1, yt, z1], [x1, yt, z0], [ix1, y1, iz0], [ix1, y1, iz1], [k, k, 0], m);
            this.quad([x0, yt, z0], [x0, yt, z1], [ix0, y1, iz1], [ix0, y1, iz0], [-k, k, 0], m);
        }
        return this;
    }
    /** Ellipsoid. `col` may be a function (nx, ny, nz) => color for painted bodies. */
    ball(x, y, z, rx, ry, rz, col, seg = 12, rings = 8) {
        const f = typeof col === "function" ? col : null, c0 = f ? null : rgb(col), start = this.p.length / 3;
        for (let j = 0; j <= rings; j++) {
            const v = j / rings, th = v * Math.PI, sy = Math.cos(th), r = Math.sin(th);
            for (let i = 0; i <= seg; i++) {
                const a = (i / seg) * Math.PI * 2, nx = Math.cos(a) * r, nz = Math.sin(a) * r, ny = sy;
                this.v(x + nx * rx, y + ny * ry, z + nz * rz, nx / rx, ny / ry, nz / rz, f ? rgb(f(nx, ny, nz)) : c0);
            }
        }
        for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
            const a = start + j * (seg + 1) + i, b = a + seg + 1;
            this.i.push(a, a + 1, b, a + 1, b + 1, b);
        }
        return this;
    }
    /** Tapered tube between two points. r1 = 0 makes a cone. */
    tube(a, b, r0, r1, col, seg = 10, caps = true) {
        const c = rgb(col), d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d) || 1, dn = d.map((q) => q / l);
        let ux = [1, 0, 0]; if (Math.abs(dn[0]) > 0.9) ux = [0, 0, 1];
        const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]], nrm = (p) => { const k = Math.hypot(...p) || 1; return p.map((q) => q / k); };
        const e1 = nrm(cross(dn, ux)), e2 = cross(dn, e1), start = this.p.length / 3, slope = (r0 - r1) / l;
        for (let i = 0; i <= seg; i++) {
            const t = (i / seg) * Math.PI * 2, ca = Math.cos(t), sa = Math.sin(t), rd = [e1[0] * ca + e2[0] * sa, e1[1] * ca + e2[1] * sa, e1[2] * ca + e2[2] * sa];
            const n = nrm([rd[0] + dn[0] * slope, rd[1] + dn[1] * slope, rd[2] + dn[2] * slope]);
            this.v(a[0] + rd[0] * r0, a[1] + rd[1] * r0, a[2] + rd[2] * r0, n[0], n[1], n[2], c);
            this.v(b[0] + rd[0] * r1, b[1] + rd[1] * r1, b[2] + rd[2] * r1, n[0], n[1], n[2], c);
        }
        for (let i = 0; i < seg; i++) { const k = start + i * 2; this.i.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
        if (caps) {
            for (const [p, r, sgn] of [[a, r0, -1], [b, r1, 1]]) {
                if (r <= 0) continue;
                const hub = this.v(p[0], p[1], p[2], dn[0] * sgn, dn[1] * sgn, dn[2] * sgn, c), rim = this.p.length / 3;
                for (let i = 0; i <= seg; i++) { const t = (i / seg) * Math.PI * 2, ca = Math.cos(t), sa = Math.sin(t); this.v(p[0] + (e1[0] * ca + e2[0] * sa) * r, p[1] + (e1[1] * ca + e2[1] * sa) * r, p[2] + (e1[2] * ca + e2[2] * sa) * r, dn[0] * sgn, dn[1] * sgn, dn[2] * sgn, c); }
                for (let i = 0; i < seg; i++) { if (sgn > 0) this.i.push(hub, rim + i, rim + i + 1); else this.i.push(hub, rim + i + 1, rim + i); }
            }
        }
        return this;
    }
    cyl(x, y, z, r, h, col, seg = 12) { return this.tube([x, y, z], [x, y + h, z], r, r, col, seg); }
    /** Inverted shell: the cartoon outline. Everything so far gets a dark edge. */
    hull(w = 0.018, col = "#1b1a26") {
        const c = rgb(col), n = this.p.length / 3, base = n, tris = this.i.length;
        for (let i = 0; i < n; i++) {
            this.p.push(this.p[i * 3] + this.n[i * 3] * w, this.p[i * 3 + 1] + this.n[i * 3 + 1] * w, this.p[i * 3 + 2] + this.n[i * 3 + 2] * w);
            this.n.push(-this.n[i * 3], -this.n[i * 3 + 1], -this.n[i * 3 + 2]);
            this.c.push(c[0], c[1], c[2]);
        }
        for (let i = 0; i < tris; i += 3) this.i.push(this.i[i] + base, this.i[i + 2] + base, this.i[i + 1] + base);
        return this;
    }
    data() { return { positions: this.p, normals: this.n, colors: this.c, indices: this.i }; }
    bake(game, name) { game.assets.free?.(name); game.assets.mesh(name, this.data()); return name; }
}
