// A tiny merged-mesh builder: flat-shaded low-poly primitives written straight into one vertex list,
// so a whole hillside and everything on it becomes a single draw call.

export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

// 5x5 block font for shop signs. Rows top to bottom.
const FONT = {
    A: "01110 10001 11111 10001 10001", B: "11110 10001 11110 10001 11110", C: "01111 10000 10000 10000 01111",
    D: "11110 10001 10001 10001 11110", E: "11111 10000 11110 10000 11111", F: "11111 10000 11110 10000 10000",
    G: "01111 10000 10011 10001 01111", H: "10001 10001 11111 10001 10001", I: "11111 00100 00100 00100 11111",
    J: "00111 00010 00010 10010 01100", K: "10001 10010 11100 10010 10001", L: "10000 10000 10000 10000 11111",
    M: "10001 11011 10101 10001 10001", N: "10001 11001 10101 10011 10001", O: "01110 10001 10001 10001 01110",
    P: "11110 10001 11110 10000 10000", Q: "01110 10001 10101 10010 01101", R: "11110 10001 11110 10010 10001",
    S: "01111 10000 01110 00001 11110", T: "11111 00100 00100 00100 00100", U: "10001 10001 10001 10001 01110",
    V: "10001 10001 10001 01010 00100", W: "10001 10001 10101 11011 10001", X: "10001 01010 00100 01010 10001",
    Y: "10001 01010 00100 00100 00100", Z: "11111 00010 00100 01000 11111",
    0: "01110 10011 10101 11001 01110", 1: "00100 01100 00100 00100 01110", 2: "11110 00001 01110 10000 11111",
    3: "11110 00001 01110 00001 11110", 4: "10010 10010 11111 00010 00010", 5: "11111 10000 11110 00001 11110",
    6: "01110 10000 11110 10001 01110", 7: "11111 00001 00010 00100 00100", 8: "01110 10001 01110 10001 01110",
    9: "01110 10001 01111 00001 01110", "%": "11001 11010 00100 01011 10011", "-": "00000 00000 11111 00000 00000",
    "!": "00100 00100 00100 00000 00100", "&": "01100 10010 01101 10010 01101", ".": "00000 00000 00000 00000 00100", "'": "00100 00100 00000 00000 00000", "+": "00000 00100 01110 00100 00000", "?": "01110 10001 00110 00000 00100", " ": "00000 00000 00000 00000 00000",
};

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

    /** Lay flat block letters on a plane. Origin is the centre of the text; u is the rightward axis, v upward, n the facing normal offset. */
    text(str, c, u, v, size, col, thick = 0.02) {
        const px = size / 5, gap = px, width = str.length * (size + gap) - gap;
        let ox = -width / 2;
        for (const ch of str.toUpperCase()) {
            const rows = (FONT[ch] ?? FONT[" "]).split(" ");
            for (let r = 0; r < 5; r++) {
                let x = 0;
                while (x < 5) {
                    if (rows[r][x] !== "1") { x++; continue; }
                    let e = x;
                    while (e < 5 && rows[r][e] === "1") e++;
                    const a = ox + x * px, b = ox + e * px, top = size / 2 - r * px, bot = top - px;
                    const P = (s, t) => [c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t, c[2] + u[2] * s + v[2] * t];
                    this.quad(P(a, bot), P(b, bot), P(b, top), P(a, top), col, col, col, col);
                    x = e;
                }
            }
            ox += size + gap;
        }
        return this;
    }

    /** Lathe-free chunky barrel along z: an octagon that tapers at each end. rings: [[z, rx, ry, yOffset], ...], colour per ring from fn(z, ang). */
    barrel(rings, seg, col) {
        for (let i = 0; i < rings.length - 1; i++) {
            const [z0, rx0, ry0, y0 = 0] = rings[i], [z1, rx1, ry1, y1 = 0] = rings[i + 1];
            for (let j = 0; j < seg; j++) {
                const a0 = (j + 0.5) / seg * Math.PI * 2, a1 = (j + 1.5) / seg * Math.PI * 2;
                const P = (z, rx, ry, y, a) => [Math.cos(a) * rx, y + Math.sin(a) * ry, z];
                const c = col((z0 + z1) / 2, (a0 + a1) / 2, i);
                this.quad(P(z0, rx0, ry0, y0, a0), P(z0, rx0, ry0, y0, a1), P(z1, rx1, ry1, y1, a1), P(z1, rx1, ry1, y1, a0), c, c, c, c);
            }
        }
        const cap = (ring, flip) => {
            const [z, rx, ry, y = 0] = ring;
            for (let j = 0; j < seg; j++) {
                const a0 = (j + 0.5) / seg * Math.PI * 2, a1 = (j + 1.5) / seg * Math.PI * 2, c = col(z, a0, flip ? -1 : rings.length);
                const p0 = [Math.cos(a0) * rx, y + Math.sin(a0) * ry, z], p1 = [Math.cos(a1) * rx, y + Math.sin(a1) * ry, z], m = [0, y, z];
                if (flip) this.tri(m, p1, p0, c); else this.tri(m, p0, p1, c);
            }
        };
        cap(rings[0], true); cap(rings[rings.length - 1], false);
        return this;
    }

    /** Register with the assets store under a name. */
    register(assets, name) {
        assets.mesh(name, { positions: this.pos, normals: this.nor, colors: this.col, indices: this.idx });
        return name;
    }
}
