// Every model in town, built from painted blocks. Parts go into streams so they can be merged and treated apart:
// solid (lit paintwork), glow (windows, unlit, warmed at dusk), leaf (tinted by the season), snow (winter only).
import { STEP } from "./data.js";

const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};
const cache = new Map();
export const rgb = (c) => {
    if (typeof c !== "string") return c;
    let v = cache.get(c);
    if (!v) cache.set(c, v = hex(c));
    return v;
};

export const PAL = {
    cream: "#fff0d4", plaster: "#f6e3c0", rose: "#f2a596", sky: "#9fd6e2", mint: "#b7e0bd", butter: "#f8d77f",
    terra: "#e0694a", brick: "#c2543e", teal: "#2f9c95", navy: "#33557a", mustard: "#f0b43c", plum: "#8f5a84",
    wood: "#b77c44", dark: "#7a4e2c", tar: "#4b3a33", stone: "#cfc7b6", stone2: "#a9a294", iron: "#59626e",
    white: "#fff9ee", red: "#dd4b39", straw: "#e9c46a", leaf: "#ffffff", window: "#3e5168",
};

/** A mesh under construction, with a simple transform. Faces are flat-shaded and wound away from a given centre. */
export class MB {
    constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.x = 0; this.y = 0; this.z = 0; this.a = 0; this.s = 1; this.cs = 1; this.sn = 0; this.jit = 0.02; this.seed = 7; }
    get count() { return this.p.length / 3; }

    at(x = 0, y = 0, z = 0, a = 0, s = 1, fn) {
        const old = [this.x, this.y, this.z, this.a, this.s, this.cs, this.sn];
        const wx = this.x + (x * this.cs + z * this.sn) * this.s, wz = this.z + (-x * this.sn + z * this.cs) * this.s;
        this.x = wx; this.z = wz; this.y += y * this.s; this.a += a; this.s *= s;
        this.cs = Math.cos(this.a); this.sn = Math.sin(this.a);
        fn(this);
        [this.x, this.y, this.z, this.a, this.s, this.cs, this.sn] = old;
        return this;
    }

    /** Local point to world. */
    pt(x, y, z) {
        const s = this.s;
        return [this.x + (x * this.cs + z * this.sn) * s, this.y + y * s, this.z + (-x * this.sn + z * this.cs) * s];
    }

    tint(c) {
        this.seed = (this.seed * 16807) % 2147483647;
        const j = 1 + ((this.seed % 1000) / 1000 - 0.5) * this.jit * 2;
        return [c[0] * j, c[1] * j, c[2] * j];
    }

    /** A flat convex polygon of world points, turned to face away from `from`. */
    poly(pts, color, from) {
        const a = pts[0], b = pts[1], c = pts[2];
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        let flip = false;
        if (from && (a[0] - from[0]) * nx + (a[1] - from[1]) * ny + (a[2] - from[2]) * nz < 0) { flip = true; nx = -nx; ny = -ny; nz = -nz; }
        const base = this.count, col = this.tint(rgb(color));
        for (const q of pts) { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); }
        for (let k = 1; k < pts.length - 1; k++) {
            if (flip) this.i.push(base, base + k + 1, base + k); else this.i.push(base, base + k, base + k + 1);
        }
    }

    /** Any convex solid: local verts, faces as index lists, one colour or a colour per face. */
    solid(verts, faces, color) {
        const w = verts.map((v) => this.pt(v[0], v[1], v[2]));
        const c = [0, 0, 0];
        for (const v of w) { c[0] += v[0] / w.length; c[1] += v[1] / w.length; c[2] += v[2] / w.length; }
        faces.forEach((f, i) => this.poly(f.map((j) => w[j]), Array.isArray(color) && typeof color[0] === "string" ? color[i % color.length] : color, c));
    }

    /** A box standing on y. `top` shrinks the top face for tapered, hand-made blocks. */
    box(x, y, z, w, h, d, color, top = 1) {
        const a = w / 2, b = d / 2, ta = a * top, tb = b * top;
        this.solid([[x - a, y, z - b], [x + a, y, z - b], [x + a, y, z + b], [x - a, y, z + b], [x - ta, y + h, z - tb], [x + ta, y + h, z - tb], [x + ta, y + h, z + tb], [x - ta, y + h, z + tb]],
            [[4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [0, 3, 2, 1]], color);
    }

    /** A gabled roof along z, overhanging. */
    gable(x, y, z, w, h, d, color, end) {
        const a = w / 2, b = d / 2;
        const verts = [[x - a, y, z - b], [x + a, y, z - b], [x + a, y, z + b], [x - a, y, z + b], [x, y + h, z - b], [x, y + h, z + b]];
        this.solid(verts, [[0, 3, 5, 4], [1, 2, 5, 4], [0, 1, 4], [3, 2, 5], [0, 1, 2, 3]], [color, color, end ?? color, end ?? color, color]);
    }

    /** A turned shape: [radius, y] points bottom to top. Smooth round, hard between rings. */
    turn(x, z, profile, color, seg = 10) {
        for (let i = 0; i < profile.length - 1; i++) {
            const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
            const cfn = typeof color === "function" ? color(i) : color, col = this.tint(rgb(cfn));
            const dy = r0 - r1, dr = y1 - y0, l = Math.hypot(dy, dr) || 1;
            const base = this.count;
            for (let j = 0; j <= seg; j++) {
                const t = j / seg * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t);
                for (const [r, y] of [[r0, y0], [r1, y1]]) {
                    const q = this.pt(x + cs * r, y, z + sn * r);
                    this.p.push(q[0], q[1], q[2]);
                    const nx = cs * dr / l, nz = sn * dr / l;
                    this.n.push(nx * this.cs + nz * this.sn, dy / l, -nx * this.sn + nz * this.cs);
                    this.c.push(col[0], col[1], col[2]);
                }
            }
            for (let j = 0; j < seg; j++) {
                const a = base + j * 2;
                this.i.push(a, a + 1, a + 3, a, a + 3, a + 2);
            }
        }
    }

    cyl(x, y, z, r, h, color, seg = 8, r2 = r) {
        this.turn(x, z, [[0, y], [r, y], [r2, y + h], [0, y + h]], color, seg);
    }

    ball(x, y, z, r, color, seg = 8) {
        const prof = [];
        for (let i = 0; i <= 4; i++) { const t = -Math.PI / 2 + i / 4 * Math.PI; prof.push([Math.cos(t) * r, y + Math.sin(t) * r]); }
        this.turn(x, z, prof, color, seg);
    }

    append(o, yaw = 0, ox = 0, oy = 0, oz = 0, s = 1) {
        const cs = Math.cos(yaw), sn = Math.sin(yaw), base = this.count, P = o.p, N = o.n;
        for (let i = 0; i < P.length; i += 3) {
            const x = P[i] * s, z = P[i + 2] * s;
            this.p.push(ox + x * cs + z * sn, oy + P[i + 1] * s, oz - x * sn + z * cs);
            const nx = N[i], nz = N[i + 2];
            this.n.push(nx * cs + nz * sn, N[i + 1], -nx * sn + nz * cs);
        }
        for (const c of o.c) this.c.push(c);
        for (const i of o.i) this.i.push(base + i);
    }

    /** Shade the feet of a model, a cheap stand-in for ambient occlusion. */
    grounded(depth = 0.16, dark = 0.72) {
        for (let i = 0; i < this.p.length; i += 3) {
            const k = Math.min(1, Math.max(0, this.p[i + 1] / depth)), m = dark + (1 - dark) * k;
            for (let a = 0; a < 3; a++) this.c[i + a] *= m;
        }
        return this;
    }

    data() {
        if (!this.i.length) { this.poly([[0, -50, 0], [0.001, -50, 0], [0, -50, 0.001]], "#000000"); }
        return { positions: this.p, normals: this.n, colors: this.c, indices: this.i, uvs: new Array(this.count * 2).fill(0) };
    }
}

const model = () => ({ solid: new MB(), glow: new MB(), leaf: new MB(), snow: new MB(), smoke: [], spin: [], lamp: [] });

/** A pitched house: walls, roof, windows, door, chimney. */
function house(m, o) {
    const { w, d, h, wall, roof, x = 0, z = 0, door = true, pitch = 0.24, chimney = 1 } = o, s = m.solid;
    s.box(x, 0, z, w, h, d, wall);
    s.box(x, 0, z, w + 0.03, 0.05, d + 0.03, PAL.stone2);
    const end = o.gable ?? wall;
    s.gable(x, h, z, w + 0.1, pitch, d + 0.1, roof, end);
    // Ridge cap reads as a painted toy.
    s.box(x, h + pitch - 0.012, z, 0.035, 0.03, d + 0.13, PAL.white);
    m.snow.gable(x, h + 0.008, z, w + 0.13, pitch + 0.018, d + 0.13, PAL.white);
    const win = (px, py, pz, ax, wn = 0.085, hn = 0.1) => {
        const g = m.glow, n = ax === "x";
        s.box(px, py - 0.013, pz, n ? 0.014 : wn + 0.03, hn + 0.026, n ? wn + 0.03 : 0.014, PAL.white);
        g.box(px, py, pz, n ? 0.022 : wn, hn, n ? wn : 0.022, PAL.window);
    };
    const front = z + d / 2;
    if (door) {
        s.box(x, 0.02, front, 0.11, 0.17, 0.02, o.doorCol ?? PAL.teal);
        win(x - w * 0.29, 0.11, front, "z");
        win(x + w * 0.29, 0.11, front, "z");
    } else win(x, 0.12, front, "z");
    win(x, h * 0.4, z - d / 2, "z");
    win(x + w / 2, h * 0.5, z, "x");
    win(x - w / 2, h * 0.5, z, "x");
    if (chimney) {
        const cx = x + w * 0.22, cz = z - d * 0.2, top = h + pitch + 0.07;
        s.box(cx, h, cz, 0.09, top - h, 0.09, PAL.brick);
        s.box(cx, top, cz, 0.115, 0.024, 0.115, PAL.stone2);
        m.smoke.push([cx, top + 0.03, cz]);
    }
}

const barrel = (s, x, y, z, r = 0.05) => { s.turn(x, z, [[0, y], [r * 0.85, y], [r, y + r], [r * 0.85, y + r * 2], [0, y + r * 2]], PAL.wood, 8); };
const crate = (s, x, y, z, w = 0.1, c = PAL.wood) => s.box(x, y, z, w, w, w, c);
function tree(m, x, y, z, size = 1, kind = 0) {
    m.solid.cyl(x, y, z, 0.022 * size, 0.1 * size, PAL.dark, 6);
    const l = m.leaf;
    if (kind === 0) {
        l.turn(x, z, [[0.13 * size, y + 0.08 * size], [0.015, y + 0.27 * size]], "#5ba75e", 7);
        l.turn(x, z, [[0.1 * size, y + 0.2 * size], [0.01, y + 0.38 * size]], "#6dbb68", 7);
        m.snow.turn(x, z, [[0.06 * size, y + 0.3 * size], [0.008, y + 0.395 * size]], PAL.white, 7);
    } else {
        l.ball(x, y + 0.2 * size, z, 0.13 * size, "#79c26a", 8);
        l.ball(x + 0.07 * size, y + 0.15 * size, z + 0.04 * size, 0.08 * size, "#63ad5e", 7);
        m.snow.ball(x, y + 0.26 * size, z, 0.09 * size, PAL.white, 7);
    }
}

function lamp(m, x, y, z) {
    m.solid.cyl(x, y, z, 0.012, 0.24, PAL.iron, 5);
    m.glow.ball(x, y + 0.26, z, 0.027, "#ffe9a8", 6);
    m.solid.turn(x, z, [[0.035, y + 0.285], [0, y + 0.32]], PAL.iron, 6);
    m.lamp.push([x, y + 0.26, z]);
}

const COTTAGE = [
    { wall: PAL.cream, roof: PAL.terra, door: PAL.teal },
    { wall: PAL.sky, roof: PAL.navy, door: PAL.mustard },
    { wall: PAL.rose, roof: PAL.brick, door: PAL.navy },
    { wall: PAL.butter, roof: PAL.teal, door: PAL.terra },
    { wall: PAL.mint, roof: PAL.plum, door: PAL.white },
    { wall: PAL.plaster, roof: PAL.navy, door: PAL.red },
];

const BUILD = {
    hall(m) {
        const s = m.solid;
        s.box(0, 0, 0.06, 0.92, 0.04, 0.82, PAL.stone);
        house(m, { w: 0.78, d: 0.52, h: 0.34, wall: PAL.cream, roof: PAL.teal, z: 0.1, doorCol: PAL.terra, pitch: 0.28 });
        // Clock tower.
        s.box(-0, 0, -0.24, 0.3, 0.72, 0.3, PAL.plaster);
        s.box(0, 0.72, -0.24, 0.35, 0.03, 0.35, PAL.white);
        s.cyl(0, 0.54, -0.09, 0.075, 0.012, PAL.white, 12);
        m.solid.at(0, 0, 0, 0, 1, () => { s.box(0, 0.53, -0.085, 0.09, 0.09, 0.01, PAL.white); s.box(0, 0.57, -0.078, 0.012, 0.042, 0.008, PAL.navy); s.box(0.012, 0.572, -0.078, 0.034, 0.01, 0.008, PAL.navy); });
        s.turn(0, -0.24, [[0.22, 0.75], [0.0, 1.08]], PAL.terra, 4);
        m.snow.turn(0, -0.24, [[0.1, 0.92], [0.0, 1.09]], PAL.white, 4);
        s.cyl(0, 1.06, -0.24, 0.008, 0.2, PAL.iron, 5);
        m.flag = [0, 1.24, -0.24];
        lamp(m, 0.38, 0, 0.42);
        lamp(m, -0.38, 0, 0.42);
    },
    cottage(m, v) {
        const p = COTTAGE[v % COTTAGE.length], s = m.solid;
        const big = v % 3 === 2;
        house(m, { w: big ? 0.62 : 0.56, d: 0.5, h: big ? 0.44 : 0.3, wall: p.wall, roof: p.roof, doorCol: p.door, pitch: 0.25 });
        if (v % 2 === 1) { house(m, { x: -0.3, z: -0.13, w: 0.28, d: 0.26, h: 0.2, wall: p.wall, roof: p.roof, door: false, chimney: 0, pitch: 0.14 }); }
        if (v % 3 === 0) { s.box(0.33, 0, 0.22, 0.015, 0.09, 0.3, PAL.white); s.box(0.19, 0, 0.36, 0.3, 0.09, 0.015, PAL.white); m.leaf.ball(0.24, 0.05, 0.27, 0.05, "#79c26a", 6); }
        else { m.leaf.ball(0.34, 0.05, 0.3, 0.06, "#79c26a", 6); barrel(s, 0.38, 0, 0.14); }
        m.solid.grounded();
    },
    lane(m, v) {
        lamp(m, v % 2 ? 0.46 : -0.46, 0, v % 3 ? 0.3 : -0.3);
        const s = m.solid;
        if (v % 3 === 0) { s.box(0.4, 0.07, -0.22, 0.26, 0.022, 0.09, PAL.wood); s.box(0.31, 0, -0.22, 0.03, 0.07, 0.08, PAL.dark); s.box(0.49, 0, -0.22, 0.03, 0.07, 0.08, PAL.dark); }
    },
    /** Stands over the tile edge and reaches out over the water along -z. */
    dock(m) {
        const s = m.solid;
        for (let i = 0; i < 9; i++) s.box(0, 0.26, 0.42 - i * 0.2, 0.46, 0.022, 0.17, i % 2 ? PAL.wood : "#c58a50");
        for (const z of [0.35, -0.05, -0.45, -0.85]) for (const x of [-0.2, 0.2]) s.cyl(x, -0.75, z, 0.024, 1.08, PAL.dark, 6);
        s.box(0.0, 0.28, -1.1, 0.46, 0.05, 0.05, PAL.dark);
        // Net shed.
        s.at(-0.03, 0.28, 0.34, 0, 1, () => {
            s.box(0, 0, 0, 0.36, 0.2, 0.3, PAL.sky);
            s.gable(0, 0.2, 0, 0.42, 0.13, 0.35, PAL.navy, PAL.sky);
            s.box(0, 0.02, -0.155, 0.1, 0.13, 0.01, PAL.navy);
        });
        m.snow.at(-0.03, 0.28, 0.34, 0, 1, () => m.snow.gable(0, 0.206, 0, 0.44, 0.135, 0.37, PAL.white));
        crate(s, 0.17, 0.28, 0.0, 0.09, "#d8a25a");
        crate(s, 0.15, 0.37, 0.0, 0.06, PAL.teal);
        barrel(s, -0.16, 0.28, -0.2, 0.045);
        lamp(m, 0.19, 0.28, -0.7);
    },
    market(m) {
        const s = m.solid;
        s.turn(0, 0, [[0.54, 0], [0.54, 0.03], [0, 0.03]], PAL.stone, 6);
        const stall = (x, z, a, c1, c2) => s.at(x, 0.03, z, a, 1, () => {
            s.box(0, 0, 0, 0.42, 0.12, 0.2, PAL.wood);
            for (const [px, pz] of [[-0.2, 0.12], [0.2, 0.12], [-0.2, -0.12], [0.2, -0.12]]) s.cyl(px, 0, pz, 0.012, 0.32, PAL.dark, 5);
            for (let i = 0; i < 5; i++) {
                const c = i % 2 ? c1 : c2, x0 = -0.25 + i * 0.1;
                s.poly([s.pt(x0, 0.32, 0.17), s.pt(x0 + 0.1, 0.32, 0.17), s.pt(x0 + 0.1, 0.42, -0.03), s.pt(x0, 0.42, -0.03)], c, s.pt(0, 0, 0));
                s.poly([s.pt(x0, 0.42, -0.03), s.pt(x0 + 0.1, 0.42, -0.03), s.pt(x0 + 0.1, 0.34, -0.16), s.pt(x0, 0.34, -0.16)], c, s.pt(0, 0, 0));
                s.box(x0 + 0.05, 0.285, 0.17, 0.1, 0.035, 0.01, c);
            }
            for (let i = 0; i < 4; i++) { s.ball(-0.15 + i * 0.1, 0.14, 0.03, 0.035, i % 2 ? "#e0574f" : "#f0b43c", 6); }
            m.snow.at(0, 0, 0, 0, 1, () => m.snow.box(0, 0.425, -0.03, 0.46, 0.012, 0.2, PAL.white));
        });
        m.snow.at(0.0, 0, 0, 0, 1, () => {});
        const sn = m.snow, stallSnow = (x, z, a) => sn.at(x, 0.03, z, a, 1, () => sn.box(0, 0.425, -0.03, 0.46, 0.012, 0.2, PAL.white));
        stall(-0.02, -0.22, 0, PAL.terra, PAL.cream); stallSnow(-0.02, -0.22, 0);
        stall(0.22, 0.2, 2.2, PAL.teal, PAL.cream); stallSnow(0.22, 0.2, 2.2);
        stall(-0.27, 0.2, -2.2, PAL.mustard, PAL.cream); stallSnow(-0.27, 0.2, -2.2);
        s.cyl(0, 0.03, 0.08, 0.008, 0.62, PAL.dark, 5);
        s.solid([[0, 0.65, 0.08], [0.17, 0.59, 0.08], [0, 0.53, 0.08]], [[0, 1, 2]], PAL.red);
        s.solid([[0, 0.65, 0.08], [0.17, 0.59, 0.08], [0, 0.53, 0.08], [0, 0.53, 0.0805], [0.17, 0.59, 0.0805], [0, 0.65, 0.0805]], [[3, 4, 5]], PAL.red);
    },
    wood(m) {
        const s = m.solid;
        s.at(-0.05, 0, -0.08, 0, 1, () => {
            for (let i = 0; i < 6; i++) s.box(0, i * 0.058, 0, 0.56, 0.058, 0.44, i % 2 ? PAL.wood : "#a86f3a");
            s.gable(0, 0.34, 0, 0.66, 0.2, 0.52, PAL.dark, PAL.wood);
            s.box(0, 0, 0.225, 0.11, 0.19, 0.012, PAL.dark);
            s.box(0.18, 0.15, 0.225, 0.08, 0.08, 0.012, PAL.white);
            m.glow.box(0.18, 0.155, 0.23, 0.06, 0.06, 0.014, PAL.window);
            s.box(0.14, 0.34, -0.1, 0.07, 0.24, 0.07, PAL.stone2);
        });
        m.smoke.push([0.09, 0.61, -0.18]);
        m.snow.at(-0.05, 0, -0.08, 0, 1, () => m.snow.gable(0, 0.346, 0, 0.69, 0.204, 0.55, PAL.white));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3 - (i ? 1 : 0); j++) {
            s.at(0.34 + j * 0, 0.04 + i * 0.05, 0.25 - j * 0.05 + i * 0.015, 0, 1, () => s.turn(0, 0, [[0, -0.18], [0.03, -0.18], [0.03, 0.0], [0, 0.0]], PAL.wood, 6));
        }
        s.cyl(-0.34, 0, 0.3, 0.07, 0.08, PAL.wood, 8);
        s.box(-0.34, 0.08, 0.3, 0.02, 0.09, 0.02, PAL.iron);
        tree(m, 0.3, 0, -0.34, 0.8, 0);
    },
    farm(m) {
        const s = m.solid;
        s.box(0, 0, 0, 1.05, 0.03, 0.98, "#8a6238", 0.98);
        for (let i = 0; i < 6; i++) {
            const z = -0.4 + i * 0.16;
            m.leaf.box(-0.13, 0.03, z, 0.72, 0.1, 0.09, i % 2 ? "#f2cd62" : "#eabf52", 0.7);
        }
        s.at(0.33, 0.03, -0.14, 0, 1, () => {
            s.box(0, 0, 0, 0.3, 0.26, 0.38, PAL.brick);
            s.gable(0, 0.26, 0, 0.36, 0.18, 0.43, PAL.navy, PAL.brick);
            s.box(0, 0, 0.195, 0.14, 0.17, 0.01, PAL.white);
            s.box(0, 0.01, 0.2, 0.11, 0.15, 0.008, PAL.brick);
        });
        m.snow.at(0.33, 0.03, -0.14, 0, 1, () => m.snow.gable(0, 0.266, 0, 0.385, 0.184, 0.45, PAL.white));
        s.cyl(0.36, 0.03, 0.26, 0.08, 0.28, PAL.stone, 8);
        s.turn(0.36, 0.26, [[0.09, 0.31], [0.01, 0.41]], PAL.terra, 8);
    },
    mill(m) {
        const s = m.solid;
        s.turn(0, 0, [[0.4, 0], [0.4, 0.05], [0.31, 0.06], [0.27, 0.34], [0.22, 0.68], [0.2, 0.72], [0, 0.72]], (i) => (i === 3 ? PAL.cream : i === 2 ? PAL.plaster : PAL.stone), 12);
        s.turn(0, 0, [[0.235, 0.7], [0.235, 0.76], [0.1, 0.92], [0, 0.95]], PAL.terra, 12);
        m.snow.turn(0, 0, [[0.13, 0.885], [0, 0.965]], PAL.white, 10);
        s.box(0, 0.02, 0.3, 0.12, 0.19, 0.02, PAL.teal);
        m.glow.box(0.0, 0.42, 0.245, 0.08, 0.1, 0.022, PAL.window);
        m.glow.box(0.0, 0.26, -0.285, 0.08, 0.1, 0.022, PAL.window);
        s.box(0, 0.78, 0.21, 0.04, 0.04, 0.16, PAL.dark);
        m.spin.push([0, 0.8, 0.31]);
    },
    yard(m) {
        const s = m.solid;
        // Slipway running down to the water along -z.
        for (let i = 0; i < 8; i++) s.box(0.14, 0.22 - i * 0.06, 0.2 - i * 0.2, 0.5, 0.03, 0.19, i % 2 ? PAL.wood : PAL.dark);
        for (const z of [0, -0.45, -0.85]) for (const x of [-0.08, 0.36]) s.cyl(x, -0.8, z, 0.022, 0.8 + (0.2 + z * 0.2), PAL.dark, 6);
        // A ribbed hull on the stocks.
        s.at(0.14, 0.26, -0.02, 0, 1, () => {
            s.box(0, 0, 0, 0.06, 0.04, 0.72, PAL.dark);
            for (let i = 0; i < 6; i++) {
                const z = -0.3 + i * 0.12, w = 0.32 - Math.abs(i - 2.5) * 0.06;
                s.box(-w / 2, 0.03, z, 0.018, 0.17, 0.022, PAL.wood);
                s.box(w / 2, 0.03, z, 0.018, 0.17, 0.022, PAL.wood);
            }
            s.box(-0.13, 0.13, 0, 0.012, 0.04, 0.66, "#c58a50");
            s.box(0.13, 0.13, 0, 0.012, 0.04, 0.66, "#c58a50");
        });
        s.at(-0.36, 0.26, 0.2, 0, 1, () => {
            s.box(0, 0, 0, 0.32, 0.26, 0.42, PAL.mustard);
            s.gable(0, 0.26, 0, 0.38, 0.14, 0.46, PAL.tar, PAL.mustard);
            s.box(0, 0, -0.215, 0.14, 0.17, 0.01, PAL.tar);
        });
        m.snow.at(-0.36, 0.26, 0.2, 0, 1, () => m.snow.gable(0, 0.266, 0, 0.4, 0.144, 0.48, PAL.white));
        s.box(0.46, 0.26, 0.2, 0.03, 0.56, 0.03, PAL.dark);
        s.box(0.33, 0.8, 0.2, 0.36, 0.03, 0.03, PAL.dark);
    },
    pub(m) {
        const s = m.solid;
        house(m, { w: 0.62, d: 0.5, h: 0.44, wall: PAL.plaster, roof: PAL.tar, doorCol: PAL.red, pitch: 0.24, z: -0.06 });
        for (const x of [-0.31, 0.31]) s.box(x, 0, 0.19, 0.03, 0.44, 0.03, PAL.dark);
        s.box(0, 0.22, 0.195, 0.64, 0.026, 0.012, PAL.dark);
        // Hanging sign, a fish on a tankard.
        s.box(0.38, 0, 0.26, 0.02, 0.36, 0.02, PAL.dark);
        s.box(0.3, 0.35, 0.26, 0.17, 0.018, 0.018, PAL.dark);
        s.box(0.27, 0.22, 0.26, 0.13, 0.12, 0.012, PAL.teal);
        s.box(0.27, 0.26, 0.268, 0.07, 0.03, 0.006, PAL.mustard);
        s.at(-0.33, 0, 0.32, 0, 1, () => { s.box(0, 0.09, 0, 0.3, 0.016, 0.1, PAL.wood); s.box(-0.11, 0, 0, 0.02, 0.09, 0.08, PAL.dark); s.box(0.11, 0, 0, 0.02, 0.09, 0.08, PAL.dark); });
        barrel(s, 0.1, 0, 0.32, 0.055);
        barrel(s, 0.2, 0, 0.36, 0.05);
        lamp(m, 0.46, 0, 0.0);
    },
    smoke(m) {
        const s = m.solid;
        for (let i = 0; i < 8; i++) s.box(0, i * 0.075, 0, 0.5, 0.075, 0.46, i % 2 ? PAL.tar : "#57453c", 0.98);
        s.gable(0, 0.6, 0, 0.58, 0.2, 0.54, "#3a3a44", PAL.tar);
        s.box(0, 0.74, 0, 0.13, 0.13, 0.2, PAL.stone2);
        s.box(0, 0.87, 0, 0.17, 0.03, 0.24, "#3a3a44");
        s.box(0, 0, 0.235, 0.14, 0.24, 0.01, PAL.mustard);
        m.snow.gable(0, 0.606, 0, 0.6, 0.2, 0.56, PAL.white);
        m.glow.box(0.17, 0.24, 0.235, 0.07, 0.1, 0.012, PAL.window);
        m.smoke.push([0, 0.92, 0.02], [0, 0.92, -0.04]);
        for (let i = 0; i < 3; i++) s.box(0.34, 0.14 + i * 0.1, 0.1, 0.01, 0.06, 0.26, i % 2 ? PAL.sky : "#d3e6ea");
        s.box(0.34, 0, 0.0, 0.02, 0.4, 0.02, PAL.dark);
        s.box(0.34, 0, 0.2, 0.02, 0.4, 0.02, PAL.dark);
        crate(s, -0.34, 0, 0.26, 0.12);
    },
    light(m) {
        const s = m.solid;
        s.turn(0, 0, [[0.42, 0], [0.42, 0.05], [0.3, 0.07], [0.25, 0.3], [0.21, 0.52], [0.18, 0.74], [0.16, 0.96], [0.15, 1.1], [0, 1.1]],
            (i) => (i <= 1 ? PAL.stone : i % 2 ? PAL.red : PAL.white), 12);
        s.turn(0, 0, [[0.13, 1.1], [0.22, 1.12], [0.22, 1.14], [0, 1.14]], PAL.iron, 12);
        m.glow.cyl(0, 1.14, 0, 0.1, 0.17, "#ffe9a8", 10);
        s.turn(0, 0, [[0.14, 1.31], [0.0, 1.46]], PAL.red, 10);
        m.snow.turn(0, 0, [[0.09, 1.36], [0.0, 1.47]], PAL.white, 10);
        s.box(0, 0.02, 0.3, 0.12, 0.2, 0.02, PAL.navy);
        m.beam = [0, 1.22, 0];
    },
    wall(m, v) {
        const s = m.solid, H = STEP * 1.5;
        // Stone courses around a hex block with a walkway on top, drawn lower than it holds so it doesn't hide the town.
        const ring = (r, y, h, c) => {
            const pts = [];
            for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
            const verts = [...pts.map((p) => [p[0], y, p[1]]), ...pts.map((p) => [p[0], y + h, p[1]])];
            const faces = [[6, 7, 8, 9, 10, 11]];
            for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; faces.push([i, j, j + 6, i + 6]); }
            s.solid(verts, faces, c);
        };
        const n = 3;
        for (let i = 0; i < n; i++) ring(0.97 - i * 0.03, H * i / n, H / n, (i + v) % 2 ? "#e2dac9" : "#cfc6b4");
        ring(0.76, H, 0.02, "#b7ad9a");
        m.snow.turn(0, 0, [[0.8, H + 0.015], [0.78, H + 0.03], [0, H + 0.03]], PAL.white, 6);
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3;
            s.box(Math.cos(a) * 0.82, H, Math.sin(a) * 0.82, 0.15, 0.09, 0.15, "#e9e2d2");
        }
    },
    garden(m, v) {
        const s = m.solid, l = m.leaf;
        for (let i = 0; i < 6; i++) {
            const a = Math.PI / 6 + i * Math.PI / 3 + (i % 2 ? 0 : 0);
            if (i === v % 6) continue;
            l.ball(Math.cos(a) * 0.54, 0.07, Math.sin(a) * 0.54, 0.12, "#6db567", 6);
        }
        const colors = ["#f06a7c", "#f8d24a", "#ffffff", "#c58be0", "#ff9d4f"];
        for (let i = 0; i < 26; i++) {
            const a = i * 2.4, r = 0.13 + (i % 7) * 0.05, x = Math.cos(a) * r, z = Math.sin(a) * r;
            s.cyl(x, 0, z, 0.006, 0.05, "#4f8f4d", 4);
            s.box(x, 0.05, z, 0.04, 0.03, 0.04, colors[i % 5]);
        }
        if (v % 2) { s.turn(0, 0, [[0.14, 0], [0.14, 0.05], [0.04, 0.07], [0.03, 0.15], [0.08, 0.17], [0.08, 0.19], [0, 0.19]], PAL.stone, 10); s.cyl(0, 0.05, 0, 0.1, 0.012, "#7fd4e6", 10); }
        else tree(m, 0, 0, 0, 1.1, 1);
    },
    ruin(m, v) {
        const s = m.solid;
        for (let i = 0; i < 7; i++) {
            const a = i * 2.1 + v, r = 0.08 + i * 0.05;
            s.at(Math.cos(a) * r, 0.01, Math.sin(a) * r, a, 1, () => s.box(0, 0, 0, 0.32 - i * 0.02, 0.03, 0.05, i % 2 ? PAL.dark : PAL.wood));
        }
        s.box(-0.2, 0, -0.14, 0.22, 0.2, 0.05, PAL.stone2, 0.8);
        s.box(-0.3, 0, -0.04, 0.05, 0.13, 0.2, PAL.stone2, 0.8);
        s.at(0.12, 0.1, 0.1, 0.5, 1, () => s.gable(0, 0, 0, 0.3, 0.1, 0.24, PAL.terra, PAL.dark));
    },
};

/** Variants per building type. */
export const VARIANTS = { cottage: 6, lane: 3, wall: 2, garden: 4, ruin: 3 };

const models = new Map();
/** A model's streams, built once. The stored model is shared, so don't change it. */
export function getModel(type, variant = 0) {
    const n = VARIANTS[type] ?? 1, key = `${type}:${variant % n}`;
    let m = models.get(key);
    if (!m) {
        m = model();
        BUILD[type](m, variant % n);
        models.set(key, m);
    }
    return m;
}

/** Register the small models that move: pegs, boats, sails, puffs. */
export function registerMovers(assets) {
    const reg = (name, b) => assets.mesh(name, b.data());
    // A peg doll: tinted body, separate head. Both are drawn as instances.
    const body = new MB();
    body.jit = 0;
    body.turn(0, 0, [[0, 0], [0.04, 0], [0.042, 0.03], [0.03, 0.1], [0.024, 0.115], [0, 0.115]], "#ffffff", 7);
    reg("peg", body);
    const head = new MB();
    head.jit = 0;
    head.ball(0, 0.145, 0, 0.033, "#ffffff", 7);
    reg("pegHead", head);
    const box = new MB();
    box.box(0, 0.1, 0, 0.07, 0.06, 0.07, PAL.wood);
    box.box(0, 0.16, 0, 0.05, 0.015, 0.05, "#8fd0e0");
    reg("pegCrate", box);
    // Rowing boat, pointing along +z.
    const hull = (b, L, W, H, c, trim) => {
        const prof = [[-L, 0.75], [-L * 0.6, 1], [L * 0.3, 1], [L, 0.0]];
        for (let i = 0; i < prof.length - 1; i++) {
            const [z0, w0] = prof[i], [z1, w1] = prof[i + 1], a = W * w0, d = W * w1;
            const low = 0.55;
            b.solid([[-a, H, z0], [a, H, z0], [d, H, z1], [-d, H, z1], [-a * low, 0, z0 * 0.9], [a * low, 0, z0 * 0.9], [d * low, 0, z1 * 0.9], [-d * low, 0, z1 * 0.9]],
                [[0, 1, 2, 3], [0, 3, 7, 4], [1, 2, 6, 5], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7]], c);
        }
        for (let i = 0; i < prof.length - 1; i++) {
            const [z0, w0] = prof[i], [z1, w1] = prof[i + 1], a = W * w0 * 0.82, d = W * w1 * 0.82;
            b.poly([[-a, H + 0.002, z0 * 0.9], [a, H + 0.002, z0 * 0.9], [d, H + 0.002, z1 * 0.9], [-d, H + 0.002, z1 * 0.9]], trim, [0, 0, 0]);
        }
    };
    const row = new MB();
    hull(row, 0.3, 0.11, 0.09, PAL.white, PAL.wood);
    row.box(0, 0.09, 0.02, 0.2, 0.012, 0.05, PAL.dark);
    row.at(0, 0.1, -0.04, 0, 1, () => { row.turn(0, 0, [[0, 0], [0.03, 0], [0.03, 0.06], [0, 0.06]], PAL.red, 6); row.ball(0, 0.085, 0, 0.026, "#f3c9a0", 6); });
    reg("rowboat", row);
    const trawl = new MB();
    hull(trawl, 0.5, 0.17, 0.15, PAL.teal, PAL.wood);
    trawl.box(0, 0.15, -0.16, 0.2, 0.15, 0.22, PAL.white);
    trawl.box(0, 0.3, -0.16, 0.24, 0.02, 0.26, PAL.terra);
    trawl.cyl(0, 0.15, 0.14, 0.012, 0.42, PAL.dark, 5);
    trawl.box(0, 0.42, 0.14, 0.16, 0.01, 0.01, PAL.dark);
    trawl.box(0.0, 0.18, -0.275, 0.1, 0.07, 0.006, "#8fd0e0");
    reg("trawler", trawl);
    const ship = new MB();
    hull(ship, 0.85, 0.24, 0.2, PAL.navy, PAL.wood);
    for (const z of [-0.3, 0.32]) {
        ship.cyl(0, 0.2, z, 0.016, 0.9, PAL.dark, 5);
        ship.box(0, 0.42, z, 0.5, 0.26, 0.012, PAL.cream, 0.84);
        ship.box(0, 0.72, z, 0.36, 0.2, 0.012, PAL.white, 0.8);
    }
    reg("schooner", ship);
    // A mill's four sails, in the xy plane.
    const sail = new MB();
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        sail.at(0, 0, 0, 0, 1, () => {
            const c = Math.cos(a), sn = Math.sin(a), p = (r, t, z) => [c * r - sn * t, sn * r + c * t, z];
            sail.solid([p(0, -0.012, 0), p(0, 0.012, 0), p(0.55, 0.012, 0), p(0.55, -0.012, 0), p(0, -0.012, 0.018), p(0, 0.012, 0.018), p(0.55, 0.012, 0.018), p(0.55, -0.012, 0.018)],
                [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]], PAL.dark);
            sail.solid([p(0.12, 0.012, 0.004), p(0.12, 0.13, 0.004), p(0.53, 0.13, 0.004), p(0.53, 0.012, 0.004), p(0.12, 0.012, 0.012), p(0.12, 0.13, 0.012), p(0.53, 0.13, 0.012), p(0.53, 0.012, 0.012)],
                [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]], PAL.white);
        });
    }
    reg("sails", sail);
    const puff = new MB();
    puff.jit = 0;
    puff.ball(0, 0, 0, 0.5, "#ffffff", 7);
    reg("puff", puff);
    const crest = new MB();
    crest.jit = 0;
    for (let i = 0; i < 5; i++) {
        const t0 = -0.9 + i * 0.36, t1 = t0 + 0.36, r = 0.5, w = 0.05 - Math.abs(i - 2) * 0.012;
        crest.poly([[Math.sin(t0) * (r - w), 0, Math.cos(t0) * (r - w) - r], [Math.sin(t1) * (r - w), 0, Math.cos(t1) * (r - w) - r], [Math.sin(t1) * (r + w), 0, Math.cos(t1) * (r + w) - r], [Math.sin(t0) * (r + w), 0, Math.cos(t0) * (r + w) - r]], "#ffffff", [0, -1, 0]);
    }
    reg("crest", crest);
    const drop = new MB();
    drop.jit = 0;
    drop.box(0, 0, 0, 0.012, 0.3, 0.012, "#ffffff");
    reg("rain", drop);
    const flake = new MB();
    flake.jit = 0;
    flake.ball(0, 0, 0, 0.03, "#ffffff", 4);
    reg("flake", flake);
    // Gull, two poses. Each wing is two facets of a shallow V.
    for (const [name, lift] of [["gullUp", 0.1], ["gullDown", -0.06]]) {
        const g = new MB();
        g.jit = 0;
        g.ball(0, 0, 0, 0.034, "#ffffff", 5);
        for (const sx of [-1, 1]) {
            g.poly([[sx * 0.02, 0, 0.03], [sx * 0.2, lift, 0.02], [sx * 0.2, lift, -0.03], [sx * 0.02, 0, -0.03]], "#f4f7f8", [0, -1, 0]);
            g.poly([[sx * 0.02, 0, 0.03], [sx * 0.2, lift, 0.02], [sx * 0.2, lift, -0.03], [sx * 0.02, 0, -0.03]], "#d8e0e4", [0, 1, 0]);
        }
        reg(name, g);
    }
    const cloud = new MB();
    cloud.jit = 0;
    for (const [x, y, z, r] of [[0, 0, 0, 0.62], [0.6, -0.08, 0.1, 0.46], [-0.6, -0.1, -0.05, 0.5], [0.15, 0.2, -0.3, 0.42], [-0.2, -0.02, 0.36, 0.4]]) cloud.ball(x, y, z, r, "#ffffff", 9);
    reg("cloud", cloud);
    const beam = new MB();
    beam.jit = 0;
    beam.poly([[0, 0, 0], [-0.9, 0.25, 7], [0.9, 0.25, 7]], "#fff3bd", [0, -9, 3]);
    beam.poly([[0, 0, 0], [-0.9, -0.3, 7], [0.9, -0.3, 7]], "#fff3bd", [0, 9, 3]);
    beam.poly([[0, 0, 0], [-0.9, 0.25, 7], [-0.9, -0.3, 7]], "#fff3bd", [3, 0, 3]);
    beam.poly([[0, 0, 0], [0.9, 0.25, 7], [0.9, -0.3, 7]], "#fff3bd", [-3, 0, 3]);
    reg("beam", beam);
    const pennant = new MB();
    pennant.jit = 0;
    pennant.poly([[0, 0.05, 0], [0.26, 0, 0], [0, -0.05, 0]], PAL.terra, [0, 0, -1]);
    pennant.poly([[0, 0.05, 0], [0.26, 0, 0], [0, -0.05, 0]], PAL.terra, [0, 0, 1]);
    reg("pennant", pennant);
}
