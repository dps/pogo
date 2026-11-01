// Geometry. The factory is one merged mesh on one atlas; dolls are built from spheres and turned profiles, with features as real geometry so faces hold up close to the lens.
import { BASEMENT_Y, CELL, FILES, H, MAP, SPOTS, W } from "./data.js";
import { MAT, WHITE, uvOf } from "./art.js";
import { beltAt, floorY, isSolid } from "./sim.js";

export const CEIL = 4.2, BASE_CEIL = BASEMENT_Y + 3.0;

class Mesh {
    constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; }
    get count() { return this.p.length / 3; }
    /** A quad from four corners, counter-clockwise from outside, with per-corner colours. */
    quad(a, b, c, d, mat, cols, uvRange = [0, 0, 1, 1]) {
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        const [u0, v0, u1, v1] = mat === null ? [WHITE[0], WHITE[1], WHITE[0], WHITE[1]] : uvOf(mat), base = this.count;
        const uu = (t) => u0 + (u1 - u0) * t, vv = (t) => v0 + (v1 - v0) * t, [r0, s0, r1, s1] = uvRange;
        const ring = [[a, r0, s1], [b, r1, s1], [c, r1, s0], [d, r0, s0]];
        ring.forEach(([q, ur, vr], i) => {
            this.p.push(q[0], q[1], q[2]);
            this.n.push(nx, ny, nz);
            this.u.push(uu(ur), vv(vr));
            const col = Array.isArray(cols[0]) ? cols[i] : cols;
            this.c.push(col[0], col[1], col[2]);
        });
        this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    /** An axis box. `mat` textures every side; `tint` colours it. */
    box(x0, y0, z0, x1, y1, z1, mat, tint = [1, 1, 1], o = {}) {
        const T = tint, dim = o.bottom ?? 0.7, D = [T[0] * dim, T[1] * dim, T[2] * dim], side = [D, D, T, T];
        const r = o.uv ?? [0, 0, 1, 1];
        this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], mat, side, r);
        this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], mat, side, r);
        this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], mat, side, r);
        this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], mat, side, r);
        this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], mat, T, r);
        if (!o.noBottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], mat, D, r);
    }
    /** Sphere or ellipsoid. colorFn(nx, ny, nz) may paint by direction. */
    ball(cx, cy, cz, rx, ry, rz, segU, segV, color, mat = null) {
        const base = this.count, [u0, v0] = mat === null ? WHITE : uvOf(mat);
        for (let j = 0; j <= segV; j++) {
            const t = (j / segV) * Math.PI, st = Math.sin(t), ct = Math.cos(t);
            for (let i = 0; i <= segU; i++) {
                const a = (i / segU) * Math.PI * 2, nx = st * Math.cos(a), ny = ct, nz = st * Math.sin(a);
                this.p.push(cx + nx * rx, cy + ny * ry, cz + nz * rz);
                const l = Math.hypot(nx / rx, ny / ry, nz / rz) || 1;
                this.n.push(nx / rx / l, ny / ry / l, nz / rz / l);
                this.u.push(u0, v0);
                const col = typeof color === "function" ? color(nx, ny, nz) : color;
                this.c.push(col[0], col[1], col[2]);
            }
        }
        const s = segU + 1;
        for (let j = 0; j < segV; j++) for (let i = 0; i < segU; i++) {
            const a = base + j * s + i, b = a + 1, c = a + s, d = c + 1;
            this.i.push(a, b, d, a, d, c);
        }
    }
    /** Turned around y. profile is [[r, y], ...] bottom to top. colorFn(t, angle) */
    lathe(cx, cz, profile, seg, color, mat = null, sx = 1, sz = 1) {
        const base = this.count, n = profile.length, [u0, v0] = mat === null ? WHITE : uvOf(mat);
        for (let j = 0; j < n; j++) {
            const a = profile[Math.max(0, j - 1)], b = profile[Math.min(n - 1, j + 1)];
            let nr = b[1] - a[1], ny = -(b[0] - a[0]);
            const l = Math.hypot(nr, ny) || 1;
            nr /= l; ny /= l;
            for (let i = 0; i <= seg; i++) {
                const t = (i / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
                this.p.push(cx + c * profile[j][0] * sx, profile[j][1], cz + s * profile[j][0] * sz);
                this.n.push(c * nr, ny, s * nr);
                this.u.push(u0, v0);
                const col = typeof color === "function" ? color(j / (n - 1), t) : color;
                this.c.push(col[0], col[1], col[2]);
            }
        }
        const s = seg + 1;
        for (let j = 0; j < n - 1; j++) for (let i = 0; i < seg; i++) {
            const a = base + j * s + i, b = a + 1, c = a + s, d = c + 1;
            this.i.push(a, c, d, a, d, b);
        }
    }
    /** A round rod between two points, for pipes and limbs. */
    rod(a, b, r, seg, color, r2 = r) {
        const base = this.count, d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...d), w = [d[0] / l, d[1] / l, d[2] / l];
        const up = Math.abs(w[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        let u = [up[1] * w[2] - up[2] * w[1], up[2] * w[0] - up[0] * w[2], up[0] * w[1] - up[1] * w[0]];
        const ul = Math.hypot(...u); u = u.map((q) => q / ul);
        const v = [w[1] * u[2] - w[2] * u[1], w[2] * u[0] - w[0] * u[2], w[0] * u[1] - w[1] * u[0]];
        for (let e = 0; e < 2; e++) for (let i = 0; i <= seg; i++) {
            const t = (i / seg) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t), rr = e ? r2 : r, c0 = e ? b : a;
            const nx = u[0] * c + v[0] * s, ny = u[1] * c + v[1] * s, nz = u[2] * c + v[2] * s;
            this.p.push(c0[0] + nx * rr, c0[1] + ny * rr, c0[2] + nz * rr);
            this.n.push(nx, ny, nz);
            this.u.push(WHITE[0], WHITE[1]);
            this.c.push(color[0], color[1], color[2]);
        }
        const s = seg + 1;
        for (let i = 0; i < seg; i++) { const a0 = base + i, b0 = a0 + 1, c0 = a0 + s, d0 = c0 + 1; this.i.push(a0, d0, c0, a0, b0, d0); }
    }
    /** Appends a copy of another mesh, turned about y and moved. */
    add(m, x, y, z, yaw = 0, sc = 1) {
        const base = this.count, c = Math.cos(yaw), s = Math.sin(yaw);
        for (let i = 0; i < m.p.length; i += 3) {
            const px = m.p[i] * sc, py = m.p[i + 1] * sc, pz = m.p[i + 2] * sc;
            this.p.push(x + px * c + pz * s, y + py, z - px * s + pz * c);
            const nx = m.n[i], nz = m.n[i + 2];
            this.n.push(nx * c + nz * s, m.n[i + 1], -nx * s + nz * c);
            this.c.push(m.c[i], m.c[i + 1], m.c[i + 2]);
        }
        for (const v of m.u) this.u.push(v);
        for (const v of m.i) this.i.push(base + v);
    }
    done(game, name) {
        game.assets.mesh(name, { positions: this.p, normals: this.n, uvs: this.u, colors: this.c, indices: this.i });
        return this.count;
    }
}

// --- Dolls -------------------------------------------------------------------------------------

const PORCELAIN = [0.8, 0.75, 0.7], HAIRS = [[0.46, 0.37, 0.24], [0.08, 0.07, 0.08], [0.27, 0.14, 0.09]], DRESSES = [[0.26, 0.07, 0.09], [0.13, 0.17, 0.25], [0.46, 0.42, 0.34]];

/** A head centred on the neck, facing +z. `blind` ties a red ribbon over the eyes. */
function dollHead(style, blind, detail = 1) {
    const m = new Mesh(), hair = HAIRS[style % 3], su = 20 * detail | 0, sv = 14 * detail | 0, r = 0.17, cy = 0.17;
    m.ball(0, cy, 0, r, r * 1.04, r * 0.98, su, sv, (nx, ny, nz) => {
        // Bisque, with a rouge on each cheek and a cool shadow under the chin.
        const cheek = Math.max(0, 1 - (Math.hypot(Math.abs(nx) - 0.55, ny + 0.28, nz - 0.72) * 3.1) ** 2);
        const c = [PORCELAIN[0], PORCELAIN[1] - cheek * 0.16, PORCELAIN[2] - cheek * 0.15], k = ny < -0.6 ? 0.8 : 1;
        return [c[0] * k, c[1] * k, c[2] * k];
    });
    // Eyes: socket, white, iris, pupil, each a real shape, with a heavy painted lash line.
    for (const side of [-1, 1]) {
        const ex = side * 0.068, ey = cy + 0.015, ez = 0.142;
        if (!blind) {
            m.ball(ex, ey, ez, 0.043, 0.036, 0.022, 12, 8, [0.07, 0.05, 0.05]);
            m.ball(ex, ey, ez + 0.006, 0.037, 0.031, 0.021, 12, 8, [0.95, 0.94, 0.92]);
            m.ball(ex, ey - 0.002, ez + 0.015, 0.023, 0.024, 0.012, 12, 8, [0.42, 0.5, 0.54]);
            m.ball(ex, ey - 0.002, ez + 0.022, 0.0075, 0.008, 0.008, 8, 6, [0.01, 0.01, 0.02]);
            m.ball(ex + 0.007, ey + 0.009, ez + 0.027, 0.0045, 0.0045, 0.003, 6, 4, [1.3, 1.3, 1.3]);
            m.rod([ex - 0.044, ey + 0.022, ez + 0.002], [ex + 0.044, ey + 0.022, ez + 0.002], 0.006, 5, [0.05, 0.03, 0.03]);
        }
        m.rod([ex - side * 0.03, ey + 0.066, ez - 0.004], [ex + side * 0.035, ey + 0.058, ez - 0.012], 0.005, 5, [0.24, 0.15, 0.11]);
    }
    m.ball(0, cy - 0.038, 0.166, 0.013, 0.016, 0.012, 8, 6, [0.97, 0.84, 0.76]);
    m.ball(-0.012, cy - 0.086, 0.149, 0.015, 0.008, 0.01, 8, 6, [0.36, 0.08, 0.1]);
    m.ball(0.012, cy - 0.086, 0.149, 0.015, 0.008, 0.01, 8, 6, [0.36, 0.08, 0.1]);
    m.ball(0, cy - 0.094, 0.148, 0.014, 0.007, 0.01, 8, 6, [0.32, 0.06, 0.08]);
    // A hairline crack from the temple, and one chip of glaze gone, because nobody looks after them.
    const onHead = (ax, ay) => { const z = Math.sqrt(Math.max(0, 1 - ax * ax - ay * ay)); return [ax * r * 1.005, cy + ay * r * 1.04, z * r * 0.985]; };
    const crack = style % 3 === 0 ? [[0.62, 0.42], [0.48, 0.26], [0.53, 0.1], [0.36, -0.08], [0.4, -0.3]] : style % 3 === 1 ? [[-0.6, 0.3], [-0.44, 0.18], [-0.52, -0.02], [-0.34, -0.2]] : [[0.1, 0.62], [0.2, 0.46], [0.08, 0.34], [0.14, 0.2]];
    for (let i = 0; i + 1 < crack.length; i++) m.rod(onHead(...crack[i]), onHead(...crack[i + 1]), 0.0024, 3, [0.08, 0.06, 0.06], 0.0016);
    if (blind) {
        const rib = [0.5, 0.05, 0.06];
        m.lathe(0, 0, [[r * 1.02, cy - 0.022], [r * 1.05, cy - 0.016], [r * 1.05, cy + 0.05], [r * 1.02, cy + 0.056]], 26, rib, null, 1, 1);
        m.rod([-0.03, cy + 0.02, -0.165], [-0.1, cy - 0.1, -0.19], 0.012, 5, rib, 0.022);
        m.rod([0.03, cy + 0.02, -0.165], [0.1, cy - 0.12, -0.19], 0.012, 5, rib, 0.022);
    }
    // Hair: a cap, then a style.
    const hk = (ny) => { const k = 0.7 + Math.max(0, ny) * 0.5; return [hair[0] * k, hair[1] * k, hair[2] * k]; };
    m.ball(0, cy + 0.03, -0.022, r * 1.1, r * 1.04, r * 1.08, su, sv / 2 + 4 | 0, (nx, ny, nz) => hk(ny));
    // A fringe hides the cap edge above the brow.
    for (let i = -4; i <= 4; i++) m.ball(i * 0.034, cy + 0.118 - Math.abs(i) * 0.004, 0.122 - Math.abs(i) * 0.016, 0.03, 0.038, 0.03, 6, 4, (nx, ny) => hk(ny));
    if (style % 3 === 0) {   // ringlets
        for (let i = 0; i < 11; i++) {
            const a = 1.1 + (i / 10) * (Math.PI * 2 - 2.2) + Math.PI / 2, x = Math.cos(a) * 0.178, z = Math.sin(a) * 0.17 * 1 - 0.05;
            for (let k = 0; k < 3; k++) m.ball(x, cy + 0.04 - k * 0.075, z - 0.012, 0.038, 0.044, 0.038, 6, 4, (nx, ny) => hk(ny));
        }
    } else if (style % 3 === 1) {   // a blunt bob
        m.ball(0, cy - 0.02, -0.05, 0.195, 0.17, 0.165, 18, 12, (nx, ny) => hk(ny * 0.5));
        for (const side of [-1, 1]) m.ball(side * 0.165, cy - 0.05, 0.03, 0.04, 0.12, 0.075, 8, 8, (nx, ny) => hk(ny * 0.4));
    } else {                         // two plaits with bows
        for (const side of [-1, 1]) {
            for (let k = 0; k < 6; k++) m.ball(side * (0.178 + k * 0.006), cy - 0.0 - k * 0.058, -0.03, 0.036 - k * 0.002, 0.038, 0.036, 8, 6, (nx, ny) => hk(ny));
            m.ball(side * 0.21, cy - 0.33, -0.03, 0.05, 0.022, 0.03, 8, 6, [0.5, 0.08, 0.1]);
        }
    }
    return m;
}

/** A body 0.86 tall, standing on y=0, with the neck at the top, facing +z. pose 0 arms down, 1 one arm reaching, 2 both reaching. */
function dollBody(dress, pose) {
    const m = new Mesh(), c = DRESSES[dress % 3], skin = PORCELAIN, leg = 0.04;
    const pinafore = dress % 3 === 2 ? [0.3, 0.09, 0.1] : [0.62, 0.58, 0.5];
    for (const s of [-1, 1]) {
        m.rod([s * 0.075, 0.03, 0.0], [s * 0.075, 0.34, 0.0], leg, 8, [0.6, 0.57, 0.52]);
        m.ball(s * 0.075, 0.035, 0.03, 0.058, 0.04, 0.095, 10, 6, [0.09, 0.07, 0.08]);
    }
    // A stiff bell of a dress, gathered at the waist, with a white collar.
    m.lathe(0, 0, [[0.27, 0.27], [0.26, 0.3], [0.22, 0.42], [0.145, 0.56], [0.115, 0.6], [0.135, 0.7], [0.11, 0.8], [0.055, 0.84]], 20, (t, a) => {
        const pleat = 0.86 + Math.sin(a * 10) * 0.14 * (1 - t), front = Math.abs(a - Math.PI / 2) < 0.5 && t < 0.84 && t > 0.1;
        const b = front ? pinafore : c;
        return [b[0] * pleat, b[1] * pleat, b[2] * pleat];
    });
    m.lathe(0, 0, [[0.135, 0.8], [0.15, 0.815], [0.075, 0.845]], 16, [0.66, 0.62, 0.55]);
    const arm = (s, reach) => {
        const shoulder = [s * 0.125, 0.76, 0];
        const hand = reach ? [s * 0.1, 0.8 + reach * 0.07, 0.5] : [s * 0.22, 0.36, 0.03];
        const elbow = [(shoulder[0] + hand[0]) / 2 + s * 0.03, (shoulder[1] + hand[1]) / 2 - 0.02, (shoulder[2] + hand[2]) / 2];
        m.rod(shoulder, elbow, 0.05, 8, c, 0.04);
        m.rod(elbow, hand, 0.04, 8, skin, 0.031);
        m.ball(hand[0], hand[1], hand[2], 0.04, 0.036, 0.048, 8, 6, skin);
    };
    arm(-1, pose === 2 ? 1 : 0);
    arm(1, pose >= 1 ? 1.2 : 0);
    return m;
}

/** A flat oval pressed onto a sphere, cheap as a pair of triangles fans go. */
function dab(m, cx, cy, cz, rx, ry, color) {
    const base = m.count, n = 6;
    m.p.push(cx, cy, cz); m.n.push(0, 0, 1); m.u.push(WHITE[0], WHITE[1]); m.c.push(color[0], color[1], color[2]);
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        m.p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cz - 0.002); m.n.push(0, 0, 1); m.u.push(WHITE[0], WHITE[1]); m.c.push(color[0], color[1], color[2]);
        m.i.push(base, base + 1 + i, base + 1 + ((i + 1) % n));
    }
}

/** Head only, for the ones that turn on the shelf. Centred on the neck at y=0, about 220 triangles. */
function shelfHead(style) {
    const m = new Mesh(), hair = HAIRS[(style + 1) % 3], y = 0.11;
    m.ball(0, y, 0, 0.115, 0.118, 0.11, 9, 7, (nx, ny, nz) => {
        const cheek = Math.max(0, 1 - (Math.hypot(Math.abs(nx) - 0.5, ny + 0.3, nz - 0.75) * 2.8) ** 2);
        return [PORCELAIN[0], PORCELAIN[1] - cheek * 0.16, PORCELAIN[2] - cheek * 0.15];
    });
    m.ball(0, y + 0.025, -0.018, 0.123, 0.112, 0.122, 9, 4, (nx, ny) => { const k = 0.72 + Math.max(0, ny) * 0.4; return [hair[0] * k, hair[1] * k, hair[2] * k]; });
    if (style % 3 === 2) for (const s of [-1, 1]) m.ball(s * 0.112, y - 0.03, -0.02, 0.036, 0.06, 0.036, 5, 3, hair);
    for (const s of [-1, 1]) {
        const ex = s * 0.045, ey = y + 0.005, ez = 0.106;
        dab(m, ex, ey, ez, 0.031, 0.026, [0.9, 0.89, 0.87]);
        dab(m, ex, ey - 0.001, ez + 0.002, 0.018, 0.019, [0.03, 0.04, 0.06]);
        dab(m, ex + 0.007, ey + 0.008, ez + 0.003, 0.005, 0.005, [1.3, 1.3, 1.3]);
    }
    dab(m, 0, y - 0.058, 0.103, 0.013, 0.006, [0.36, 0.08, 0.1]);
    return m;
}

/** A shelf-sitter, facing +z, legs out over the edge. Cheap enough for hundreds of copies, and still a face you'd cross the street to avoid. */
function shelfDoll(style) {
    const m = new Mesh(), c = DRESSES[style % 3], front = style % 3 === 2 ? DRESSES[0] : [0.6, 0.56, 0.5];
    m.lathe(0, 0.0, [[0.13, 0.02], [0.135, 0.05], [0.09, 0.1], [0.06, 0.2]], 6, (t, a) => { const b = Math.abs(a - Math.PI / 2) < 0.6 ? front : c; return b; });
    for (const s of [-1, 1]) {
        m.rod([s * 0.055, 0.05, 0.05], [s * 0.065, 0.045, 0.22], 0.038, 3, [0.6, 0.57, 0.52], 0.032);
        m.ball(s * 0.066, 0.05, 0.235, 0.04, 0.042, 0.05, 4, 3, [0.1, 0.07, 0.08]);
        m.rod([s * 0.065, 0.19, 0.01], [s * 0.1, 0.08, 0.07], 0.02, 3, c);
    }
    m.add(shelfHead(style), 0, 0.2, 0);
    return m;
}

export function buildDollMeshes(game) {
    let total = 0;
    for (let s = 0; s < 3; s++) {
        shelfHead(s).done(game, `shelfhead${s}`);
        total += dollHead(s, false).done(game, `head${s}`);
        total += dollHead(s, true).done(game, `blind${s}`);
        for (let pose = 0; pose < 3; pose++) total += dollBody(s, pose).done(game, `body${s}_${pose}`);
    }
    return total;
}

// --- The factory -----------------------------------------------------------------------------------

const roomOf = (cx, cz) => {
    if (cz >= 21) return cx < 11 ? "records" : cx < 19 ? "boiler" : "bench";
    if (cz >= 16) return "stairs";
    if (cx <= 6 && cz <= 7) return "paint";
    if (cx <= 6) return "lockers";
    if (cx >= 21 && cz <= 4) return "office";
    return "hall";
};
export const roomAt = (x, z) => roomOf(Math.floor(x / CELL), Math.floor(z / CELL));

const FLOOR = { hall: MAT.concrete, paint: MAT.concrete, lockers: MAT.lino, office: MAT.lino, records: MAT.wet, boiler: MAT.wet, bench: MAT.wet, stairs: MAT.concrete };
const WALL = { hall: MAT.brick, paint: MAT.brick, lockers: MAT.brick, office: MAT.wallpaper, records: MAT.stone, boiler: MAT.stone, bench: MAT.stone, stairs: MAT.stone };

function ceilingAt(cx, cz) {
    const c = MAP[cz][cx];
    if (c >= "1" && c <= "4") return 2.6;
    if (cz >= 21) return BASE_CEIL;
    return roomOf(cx, cz) === "hall" ? CEIL : 3.0;
}

const AO = 0.5;
function ao(cx, cz, a, b) { // darker in the corner where a vertex meets solid neighbours
    let n = 0;
    for (const [i, j] of [[a - 1, b - 1], [a, b - 1], [a - 1, b], [a, b]]) if (isSolid(cx + i, cz + j)) n++;
    return 1 - Math.min(n, 2) * (1 - AO) * 0.6;
}

export function buildWorld(game) {
    const m = new Mesh(), dolls = new Mesh(), S = CELL;
    const sitters = [shelfDoll(0), shelfDoll(1), shelfDoll(2)];
    for (let cz = 0; cz < H; cz++) for (let cx = 0; cx < W; cx++) {
        const ch = MAP[cz][cx];
        const x0 = cx * S, x1 = x0 + S, z0 = cz * S, z1 = z0 + S;
        if (ch === "#") continue;
        const room = roomOf(cx, cz), mid = floorAtCell(cx, cz), top = ceilingAt(cx, cz), solidCell = isSolid(cx, cz);
        {
            // Floor, with corners darkened where it meets a wall.
            const a = ao(cx, cz, 0, 0), b = ao(cx, cz, 1, 0), c = ao(cx, cz, 1, 1), d = ao(cx, cz, 0, 1), grime = 0.88 + ((cx * 7 + cz * 13) % 5) * 0.03;
            if (ch >= "1" && ch <= "4") stairTreads(m, cx, cz);
            else m.quad([x0, mid, z1], [x1, mid, z1], [x1, mid, z0], [x0, mid, z0], FLOOR[room], [[d * grime, d * grime, d * grime], [c * grime, c * grime, c * grime], [b * grime, b * grime, b * grime], [a * grime, a * grime, a * grime]]);
            m.quad([x0, top, z0], [x1, top, z0], [x1, top, z1], [x0, top, z1], MAT.ceiling, [1, 1, 1], [0, 0, 0.72, 1]);
        }
        // Walls, floor to ceiling, for every face that meets rock.
        const low = ch >= "1" && ch <= "4" ? BASEMENT_Y : mid;
        const wall = (a, b, nx, nz, ox, oz) => {
            if (solidNeighbourIsOpen(ox, oz)) return;
            const mat = WALL[room], dark = [0.62, 0.62, 0.62], lit = [1, 1, 1], h = top - low, rows = Math.max(1, Math.round(h / 2.1));
            for (let i = 0; i < rows; i++) {
                const y0 = low + (h * i) / rows, y1 = low + (h * (i + 1)) / rows;
                const band = mat === MAT.brick || mat === MAT.wallpaper ? (i === 0 ? [0, 0, 1, 1] : [0, 0, 1, 0.48]) : [0, 0, 1, 1];
                m.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], mat, i === 0 ? [dark, dark, lit, lit] : i === rows - 1 ? [lit, lit, dark, dark] : lit, band);
            }
        };
        if (!solidCell || ch === "W" || ch === "L" || "spmkobe".includes(ch)) {
            if (!(ch === "W")) {
                if (cellChar(cx - 1, cz) === "#") wall([x0, z1], [x0, z0], 1, 0, cx - 1, cz);
                if (cellChar(cx + 1, cz) === "#") wall([x1, z0], [x1, z1], -1, 0, cx + 1, cz);
                if (cellChar(cx, cz - 1) === "#") wall([x0, z0], [x1, z0], 0, 1, cx, cz - 1);
                if (cellChar(cx, cz + 1) === "#") wall([x1, z1], [x0, z1], 0, -1, cx, cz + 1);
            }
        }
        if (ch === "D") {
            const dirX = isSolid(cx - 1, cz);
            if (dirX) m.box(x0, top > 3 ? 2.3 + mid : 2.3 + mid, z0 + 0.6, x1, top, z1 - 0.6, MAT.brick, [0.5, 0.5, 0.5]);
            else m.box(x0 + 0.6, 2.3 + mid, z0, x1 - 0.6, top, z1, MAT.brick, [0.5, 0.5, 0.5]);
        }
        if (ch === "W") {
            const frame = [0.5, 0.5, 0.5];
            m.box(x0, 0, z0 + 0.6, x1, 1.05, z1 - 0.6, MAT.wallpaper, frame);
            m.box(x0, 2.05, z0 + 0.6, x1, 3.0, z1 - 0.6, MAT.wallpaper, frame);
            m.box(x0, 3.0, z0 + 0.6, x1, CEIL, z1 - 0.6, MAT.brick, frame);
            m.box(x0 + S / 2 - 0.05, 1.05, z0 + 0.92, x0 + S / 2 + 0.05, 2.05, z1 - 0.92, MAT.plate, [0.5, 0.5, 0.5]);
        }
        if (ch === "4") m.box(x0, BASE_CEIL, z1 - 0.1, x1, 2.6, z1, MAT.stone, [0.6, 0.6, 0.6]);
        if (ch === "s") (cz >= 13 ? crates : shelf)(m, dolls, sitters, cx, cz);
        if (ch === "p") paintRack(m, cx, cz);
        if (ch === "m") press(m, cx, cz);
        if (ch === "k") consoleAt(m, cx, cz);
        if (ch === "o") desk(m, cx, cz);
        if (ch === "b") boiler(m, cx, cz);
        if (ch === "e") bench(m, cx, cz);
        if (ch === "L") locker(m, cx, cz);
        if (beltAt(cx, cz)) beltCell(m, cx, cz);
    }
    fittings(m);
    pipes(m);
    m.done(game, "factory");
    dolls.done(game, "sitters");
    for (let f = 0; f < 4; f++) {
        const b = new Mesh();
        for (let cz = 0; cz < H; cz++) for (let cx = 0; cx < W; cx++) if (beltAt(cx, cz)) beltRibs(b, cx, cz, f / 4);
        b.done(game, `ribs${f}`);
    }
    const head = new Mesh();
    head.box(-0.8, 0, -0.5, 0.8, 0.5, 0.5, MAT.plate, [0.7, 0.72, 0.74]);
    head.box(-0.62, -0.28, -0.36, 0.62, 0, 0.36, MAT.hazard, [0.9, 0.9, 0.9]);
    head.done(game, "stamp");
    const crate = new Mesh();
    crate.box(-0.32, 0, -0.26, 0.32, 0.36, 0.26, MAT.wood, [0.95, 0.95, 0.9]);
    crate.add(shelfDoll(0), -0.15, 0.3, 0);
    crate.add(shelfDoll(2), 0.15, 0.3, 0);
    crate.done(game, "beltcrate");
    const doorMesh = new Mesh();
    doorMesh.box(0, 0, -0.05, 2.0, 2.3, 0.05, MAT.door, [0.96, 0.96, 0.96], { bottom: 0.8 });
    doorMesh.done(game, "door");
    const batt = new Mesh();
    batt.lathe(0, 0, [[0.0001, 0], [0.05, 0], [0.05, 0.16], [0.05, 0.16]], 12, [0.72, 0.46, 0.13]);
    batt.lathe(0, 0, [[0.05, 0.16], [0.05, 0.2], [0.02, 0.2], [0.02, 0.215], [0.0001, 0.215]], 12, [0.86, 0.84, 0.8]);
    batt.done(game, "battery");
    return m.count;
}

const cellChar = (cx, cz) => (cx < 0 || cz < 0 || cx >= W || cz >= H ? "#" : MAP[cz][cx]);
const solidNeighbourIsOpen = () => false;
function floorAtCell(cx, cz) {
    return floorY((cx + 0.5) * CELL, (cz + 0.5) * CELL) - (beltAt(cx, cz) ? 0.22 : 0);
}

function stairTreads(m, cx, cz) {
    const steps = 5, x0 = cx * CELL, x1 = x0 + CELL, tint = [0.8, 0.8, 0.8];
    for (let i = 0; i < steps; i++) {
        const z0 = cz * CELL + (i / steps) * CELL, z1 = z0 + CELL / steps;
        const y = floorY((cx + 0.5) * CELL, (z0 + z1) / 2), yNext = y - 0.5;
        m.box(x0, yNext, z0, x1, y, z1, MAT.concrete, tint, { bottom: 0.5, noBottom: true, uv: [0, 0, 1, 0.2] });
        m.box(x0, y - 0.002, z0, x1, y + 0.002, z0 + 0.05, MAT.hazard, [0.8, 0.8, 0.8], { noBottom: true });
    }
}

function shelf(m, dolls, sitters, cx, cz) {
    const x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL;
    const steel = [0.5, 0.56, 0.6];
    // Uprights at the cell corners, and a solid back so aisles feel like corridors.
    for (const x of [x0 + 0.06, x1 - 0.06]) for (const z of [z0 + 0.06, z1 - 0.06]) m.box(x - 0.05, 0, z - 0.05, x + 0.05, 3.0, z + 0.05, MAT.plate, steel);
    m.box(x0 + 0.05, 0.1, z0 + 0.96, x1 - 0.05, 3.0, z0 + 1.04, MAT.tin, [0.55, 0.55, 0.55]);
    const tiers = [0.34, 0.92, 1.5, 2.08], counts = [1, 2, 2, 1];
    for (const y of tiers.concat([2.66])) m.box(x0, y - 0.05, z0, x1, y, z1, MAT.wood, [0.9, 0.84, 0.76], { uv: [0, 0.1, 1, 0.34] });
    const open = (a, b) => !isSolid(a, b);
    tiers.forEach((y, tier) => {
        for (let i = 0; i < counts[tier]; i++) {
            const seed = (cx * 13 + cz * 7 + tier * 3 + i * 5) % 11, x = x0 + (counts[tier] === 1 ? 0.72 + (seed % 3) * 0.25 : 0.52 + i * 0.96) + (seed % 3 - 1) * 0.05;
            if (open(cx, cz + 1) && seed !== 4) dolls.add(sitters[seed % 3], x, y, z1 - 0.42, ((seed - 5) * 0.05), 1.18 + (seed % 3) * 0.08);
            if (open(cx, cz - 1) && seed !== 7) dolls.add(sitters[(seed + 1) % 3], x, y, z0 + 0.42, Math.PI + (seed - 5) * 0.05, 1.18 + (seed % 3) * 0.08);
        }
    });
    // Shelf-end panels with a stencilled look.
    if (!isSolid(cx - 1, cz)) m.box(x0 - 0.02, 0, z0 + 0.05, x0 + 0.04, 3.0, z1 - 0.05, MAT.tin, [0.7, 0.7, 0.68]);
    if (!isSolid(cx + 1, cz)) m.box(x1 - 0.04, 0, z0 + 0.05, x1 + 0.02, 3.0, z1 - 0.05, MAT.tin, [0.7, 0.7, 0.68]);
}

function crates(m, dolls, sitters, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL, k = (cx * 5 + cz * 3) % 3;
    m.box(x0 + 0.1, 0, z0 + 0.1, x0 + 1.9, 1.1, z0 + 1.9, MAT.wood, [0.86, 0.8, 0.72]);
    m.box(x0 + 0.3 + k * 0.1, 1.1, z0 + 0.2, x0 + 1.6, 2.0, z0 + 1.7, MAT.wood, [0.72, 0.68, 0.6]);
    if (k !== 1) m.box(x0 + 0.5, 2.0, z0 + 0.5, x0 + 1.4, 2.7, z0 + 1.4, MAT.wood, [0.8, 0.74, 0.66]);
    m.box(x0 + 0.08, 0.42, z0 + 0.08, x0 + 1.92, 0.5, z0 + 1.92, MAT.hazard, [0.7, 0.7, 0.7]);
}

function paintRack(m, cx, cz) {
    // A drying rack of bare heads on rods. Bald, eyeless, waiting to be painted.
    const x = (cx + 0.5) * CELL, z = (cz + 0.5) * CELL, wood = [0.8, 0.75, 0.68];
    m.box(x - 0.8, 0, z - 0.3, x + 0.8, 0.06, z + 0.3, MAT.wood, wood);
    m.box(x - 0.8, 0.82, z - 0.3, x + 0.8, 0.88, z + 0.3, MAT.wood, wood);
    m.box(x - 0.8, 1.42, z - 0.3, x + 0.8, 1.48, z + 0.3, MAT.wood, wood);
    for (const sx of [-0.76, 0.76]) for (const sz of [-0.26, 0.26]) m.box(x + sx - 0.03, 0, z + sz - 0.03, x + sx + 0.03, 1.5, z + sz + 0.03, MAT.plate, [0.5, 0.5, 0.5]);
    for (const y of [0.88, 1.48]) for (let i = -2; i <= 2; i++) {
        const hx = x + i * 0.32, hz = z + (i % 2) * 0.05, yy = y + 0.2;
        m.box(hx - 0.01, y, hz - 0.01, hx + 0.01, yy, hz + 0.01, MAT.plate, [0.4, 0.4, 0.4], { noBottom: true });
        const face = Math.sin(i * 2.1 + cz + cx) * 1.2, fc = Math.cos(face), fs = Math.sin(face);
        m.ball(hx, yy + 0.09, hz, 0.1, 0.115, 0.1, 12, 9, (nx, ny, nz) => {
            const fwd = nz * fc + nx * fs, side = nx * fc - nz * fs;
            const socket = fwd > 0.4 && Math.abs(Math.abs(side) - 0.42) < 0.19 && Math.abs(ny - 0.08) < 0.17;
            return socket ? [0.03, 0.025, 0.025] : [0.56, 0.47, 0.42];
        });
    }
}

function press(m, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL;
    const body = [0.78, 0.8, 0.82];
    m.box(x0 + 0.1, 0, z0 + 0.15, x0 + 1.9, 0.9, z0 + 1.85, MAT.plate, body);
    m.box(x0 + 0.05, 0.9, z0 + 0.1, x0 + 1.95, 1.0, z0 + 1.9, MAT.hazard, body);
    for (const px of [0.2, 1.8]) for (const pz of [0.3, 1.7]) m.box(x0 + px - 0.09, 1, z0 + pz - 0.09, x0 + px + 0.09, 3.3, z0 + pz + 0.09, MAT.plate, body);
    m.box(x0 + 0.05, 3.3, z0 + 0.1, x0 + 1.95, 3.8, z0 + 1.9, MAT.plate, body);
}

function consoleAt(m, cx, cz) {
    const x = (cx + 0.5) * CELL, z = (cz + 0.5) * CELL;
    m.box(x - 0.35, 0, z - 0.28, x + 0.35, 1.05, z + 0.28, MAT.plate, [0.7, 0.74, 0.74]);
    m.box(x - 0.42, 1.05, z - 0.34, x + 0.42, 1.12, z + 0.34, MAT.hazard, [0.9, 0.9, 0.9]);
    m.lathe(x, z + 0.291, [[0.09, 0.8], [0.09, 0.82]], 12, [0.9, 0.86, 0.7]);
}

function desk(m, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL, wood = [0.72, 0.56, 0.42];
    m.box(x0 + 0.1, 0.78, z0, x0 + 1.9, 0.86, z0 + CELL, MAT.wood, wood);
    m.box(x0 + 0.14, 0, z0 + 0.04, x0 + 0.26, 0.78, z0 + 1.96, MAT.wood, wood);
    m.box(x0 + 1.74, 0, z0 + 0.04, x0 + 1.86, 0.78, z0 + 1.96, MAT.wood, wood);
    if (cz === 2) {
        // Reel-to-reel tape machine. There has only ever been this.
        const y = 0.86, x = SPOTS.tape.x * CELL, z = SPOTS.tape.z * CELL;
        m.box(x - 0.34, y, z - 0.24, x + 0.34, y + 0.16, z + 0.24, MAT.plate, [0.56, 0.5, 0.42]);
        m.lathe(x, z - 0.08, [[0.1, y + 0.16], [0.11, y + 0.2], [0.0001, y + 0.2]], 16, [0.14, 0.12, 0.12]);
        m.lathe(x, z + 0.1, [[0.1, y + 0.16], [0.11, y + 0.2], [0.0001, y + 0.2]], 16, [0.14, 0.12, 0.12]);
        // A black telephone.
        m.box(x - 0.2, y, z + 0.8, x + 0.1, y + 0.1, z + 1.0, MAT.plate, [0.12, 0.12, 0.13]);
    } else {
        const x = (SPOTS.clipboard.x) * CELL, z = (SPOTS.clipboard.z + 0.25) * CELL, y = 0.86;
        // Green-shaded desk lamp.
        m.lathe(x + 0.3, z + 1.05, [[0.12, y], [0.12, y + 0.03], [0.02, y + 0.05], [0.02, y + 0.42]], 12, [0.72, 0.6, 0.3]);
        m.lathe(x + 0.3, z + 1.05, [[0.17, y + 0.36], [0.06, y + 0.5], [0.0001, y + 0.5]], 14, [0.1, 0.3, 0.22]);
    }
}

function boiler(m, cx, cz) {
    const c = MAP[cz][cx];
    // Only build once per pair, from the left cell.
    if (MAP[cz][cx - 1] === c) return;
    const wide = MAP[cz][cx + 1] === c, x = (cx + (wide ? 1 : 0.5)) * CELL, z = (cz + 0.5) * CELL, b = BASEMENT_Y;
    m.lathe(x, z, [[0.0001, b + 0.3], [0.7, b + 0.3], [0.85, b + 0.5], [0.85, b + 2.1], [0.7, b + 2.4], [0.2, b + 2.5], [0.2, b + 3]], 20, (t, a) => [0.42 + Math.sin(a * 6) * 0.05, 0.33, 0.28]);
    for (const k of [0.8, 1.6]) m.lathe(x, z, [[0.87, b + k], [0.87, b + k + 0.08]], 20, [0.25, 0.22, 0.2]);
    m.box(x - 0.9, b, z - 0.9, x + 0.9, b + 0.3, z + 0.9, MAT.plate, [0.6, 0.6, 0.6]);
    m.lathe(x, z + 0.86, [[0.14, b + 1.3], [0.14, b + 1.34]], 12, [0.86, 0.82, 0.68]);
}

function bench(m, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL, y = BASEMENT_Y + 0.9;
    m.box(x0 - 0.2, y, z0 + 0.2, x0 + 2.2, y + 0.08, z0 + 1.8, MAT.wood, [0.8, 0.7, 0.58]);
    for (const dx of [-0.1, 2.0]) for (const dz of [0.3, 1.6]) m.box(x0 + dx, BASEMENT_Y, z0 + dz, x0 + dx + 0.12, y, z0 + dz + 0.12, MAT.wood, [0.6, 0.5, 0.4]);
    if (cz === 22) {
        // Tools laid out in a neat row: an eye gauge, thread, little brushes.
        for (let i = 0; i < 6; i++) m.box(x0 + 0.2 + i * 0.28, y + 0.08, z0 + 0.4, x0 + 0.26 + i * 0.28, y + 0.1, z0 + 0.8, MAT.plate, [0.7, 0.7, 0.72]);
        m.ball(x0 + 1.5, y + 0.18, z0 + 1.2, 0.1, 0.1, 0.1, 8, 6, [0.4, 0.1, 0.1]);
    }
}

function locker(m, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL, b = cz >= 21 ? BASEMENT_Y : 0, grey = [0.85, 0.9, 0.9];
    const f = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([a, c]) => !isSolid(cx + a, cz + c)) ?? [0, 1];
    m.box(x0 + 0.1, b, z0 + 0.1, x0 + 1.9, b + 2.3, z0 + 1.9, MAT.plate, grey);
    const h = 2.28, inset = 0.02;
    if (f[1] === 1) m.quad([x0 + 0.1, b, z0 + 1.9 + inset], [x0 + 1.9, b, z0 + 1.9 + inset], [x0 + 1.9, b + h, z0 + 1.9 + inset], [x0 + 0.1, b + h, z0 + 1.9 + inset], MAT.locker, [1, 1, 1]);
    if (f[1] === -1) m.quad([x0 + 1.9, b, z0 + 0.1 - inset], [x0 + 0.1, b, z0 + 0.1 - inset], [x0 + 0.1, b + h, z0 + 0.1 - inset], [x0 + 1.9, b + h, z0 + 0.1 - inset], MAT.locker, [1, 1, 1]);
    if (f[0] === 1) m.quad([x0 + 1.9 + inset, b, z0 + 1.9], [x0 + 1.9 + inset, b, z0 + 0.1], [x0 + 1.9 + inset, b + h, z0 + 0.1], [x0 + 1.9 + inset, b + h, z0 + 1.9], MAT.locker, [1, 1, 1]);
    if (f[0] === -1) m.quad([x0 + 0.1 - inset, b, z0 + 0.1], [x0 + 0.1 - inset, b, z0 + 1.9], [x0 + 0.1 - inset, b + h, z0 + 1.9], [x0 + 0.1 - inset, b + h, z0 + 0.1], MAT.locker, [1, 1, 1]);
}

function beltCell(m, cx, cz) {
    const x0 = cx * CELL, z0 = cz * CELL, d = beltAt(cx, cz), rail = [0.6, 0.62, 0.62], y = 0.22;
    m.box(x0 + 0.02, 0, z0 + 0.02, x0 + 1.98, y - 0.01, z0 + 1.98, MAT.plate, [0.5, 0.5, 0.5]);
    const horizontal = d[0] !== 0;
    if (horizontal) m.quad([x0, y, z0 + 1.8], [x0 + 2, y, z0 + 1.8], [x0 + 2, y, z0 + 0.2], [x0, y, z0 + 0.2], MAT.belt, [1, 1, 1]);
    else m.quad([x0 + 0.2, y, z0 + 2], [x0 + 1.8, y, z0 + 2], [x0 + 1.8, y, z0], [x0 + 0.2, y, z0], MAT.belt, [1, 1, 1], [0, 0, 1, 1]);
    if (horizontal) {
        m.box(x0, 0, z0, x0 + 2, y + 0.06, z0 + 0.2, MAT.hazard, rail);
        m.box(x0, 0, z0 + 1.8, x0 + 2, y + 0.06, z0 + 2, MAT.hazard, rail);
    } else {
        m.box(x0, 0, z0, x0 + 0.2, y + 0.06, z0 + 2, MAT.hazard, rail);
        m.box(x0 + 1.8, 0, z0, x0 + 2, y + 0.06, z0 + 2, MAT.hazard, rail);
    }
}

function beltRibs(m, cx, cz, phase) {
    const x0 = cx * CELL, z0 = cz * CELL, d = beltAt(cx, cz), y = 0.235, n = 4;
    for (let i = 0; i < n; i++) {
        const t = (i + phase) / n, c = [0.34, 0.34, 0.33];
        if (d[0]) {
            const x = x0 + (d[0] > 0 ? t : 1 - t) * CELL;
            m.box(x - 0.03, 0.22, z0 + 0.22, x + 0.03, y, z0 + 1.78, null, c, { noBottom: true });
        } else {
            const z = z0 + (d[1] > 0 ? t : 1 - t) * CELL;
            m.box(x0 + 0.22, 0.22, z - 0.03, x0 + 1.78, y, z + 0.03, null, c, { noBottom: true });
        }
    }
}

function wallCard(m, s, mat, w, h, uv = [0, 0, 1, 1], tint = [1, 1, 1], lift = 0.03) {
    // A flat rectangle on a wall, a `face` normal out from a point.
    const x = s.x * CELL, z = s.z * CELL, y = (s.base ?? 0) + (s.y ?? 1), [fx, fz] = s.face, rx = -fz * w, rz = fx * w, ox = fx * lift, oz = fz * lift;
    const a = [x + ox - rx, y - h, z + oz - rz], b = [x + ox + rx, y - h, z + oz + rz], c = [x + ox + rx, y + h, z + oz + rz], d = [x + ox - rx, y + h, z + oz - rz];
    m.quad(b, a, d, c, mat, tint, uv);
}

function fittings(m) {
    // Tally cards. The atlas cell is one card.
    for (const k of ["tagA", "tagB", "tagC"]) wallCard(m, SPOTS[k], MAT.cards, 0.26, 0.3, [0, 0, 1, 1], [1, 1, 1], 0.07);
    // The time clock.
    const c = SPOTS.clock, cx = c.x * CELL, cz = c.z * CELL;
    m.box(cx - 0.26, c.y - 0.4, cz, cx + 0.26, c.y + 0.32, cz + 0.2, MAT.plate, [0.62, 0.55, 0.42]);
    m.box(cx - 0.17, c.y - 0.04, cz + 0.2, cx + 0.17, c.y + 0.26, cz + 0.215, MAT.plate, [0.86, 0.84, 0.72], { noBottom: true });
    m.box(cx - 0.09, c.y - 0.3, cz + 0.2, cx + 0.09, c.y - 0.14, cz + 0.24, MAT.plate, [0.1, 0.1, 0.1]);
    // Cards in a rack, one for every shift worker, all punched out but yours.
    for (let i = 0; i < 12; i++) m.box(cx + 0.4 + (i % 4) * 0.14, c.y + 0.1 - Math.floor(i / 4) * 0.28, cz, cx + 0.5 + (i % 4) * 0.14, c.y + 0.32 - Math.floor(i / 4) * 0.28, cz + 0.02, MAT.cards, [0.9, 0.9, 0.86], { noBottom: true, uv: [0, 0, 1, 0.5] });
    // Fuse board.
    const f = SPOTS.fuseboard, fx = f.x * CELL, fz = f.z * CELL;
    m.box(fx - 0.14, f.y - 0.5, fz - 0.42, fx, f.y + 0.5, fz + 0.42, MAT.plate, [0.5, 0.56, 0.54]);
    for (let i = 0; i < 4; i++) m.box(fx - 0.18, f.y + 0.26 - i * 0.2, fz - 0.26, fx - 0.14, f.y + 0.36 - i * 0.2, fz + 0.26, MAT.hazard, [0.8, 0.8, 0.8], { noBottom: true });
    // Safety board in the hall and in the office, and a big sign by the bay.
    wallCard(m, { x: 8, z: 7.5, y: 1.9, face: [1, 0] }, MAT.poster, 0.8, 0.8, [0, 0, 1, 1], [0.92, 0.92, 0.92]);
    wallCard(m, { x: 21.0, z: 1.5, y: 1.7, face: [1, 0] }, MAT.poster, 0.6, 0.6, [0, 0, 1, 1], [0.92, 0.92, 0.92]);
    wallCard(m, { x: 15.5, z: 15.97, y: 2.9, face: [0, -1] }, MAT.hazard, 0.9, 0.08);
    wallCard(m, { x: 23.5, z: 15.97, y: 2.9, face: [0, -1] }, MAT.hazard, 0.9, 0.08);
    // The roller shutter, which stays down. Until it doesn't.
    for (let z = 18; z < 24; z += 2) m.quad([53.95, 0, z + 2], [53.95, 0, z], [53.95, CEIL - 0.6, z], [53.95, CEIL - 0.6, z + 2], MAT.tin, [0.8, 0.84, 0.86]);
    m.box(53.6, 0, 17.7, 54, CEIL - 0.3, 18.0, MAT.hazard, [0.8, 0.8, 0.8]);
    m.box(53.6, 0, 24.0, 54, CEIL - 0.3, 24.3, MAT.hazard, [0.8, 0.8, 0.8]);
    // Office furniture: a filing cabinet, a chair with its back to you, a coat rack.
    m.box(51, 0, 8.4, 53.9, 1.3, 9.9, MAT.plate, [0.6, 0.6, 0.55]);
    m.box(47.5, 0.42, 3.0, 48.0, 0.5, 3.6, MAT.wood, [0.5, 0.36, 0.26]);
    m.box(47.5, 0.5, 2.96, 48.0, 1.12, 3.02, MAT.wood, [0.5, 0.36, 0.26]);
    // A row of dead shop lamps down the hall.
    for (let z = 3; z < 30; z += 8) for (let x = 19; x < 52; x += 10) {
        if (z < 11 && x > 40) continue;
        m.rod([x, CEIL, z], [x, CEIL - 0.8, z], 0.012, 4, [0.1, 0.1, 0.1]);
        m.lathe(x, z, [[0.42, CEIL - 1.0], [0.1, CEIL - 0.8], [0.02, CEIL - 0.78]], 12, [0.32, 0.36, 0.34]);
    }
    // Hanging from the chain hoist over the belt: a row of arms and legs on hooks, boxed by the dozen. Mostly boxes.
    for (let x = 25; x < 43; x += 3) {
        m.rod([x, CEIL, 19], [x, 2.7, 19], 0.016, 4, [0.3, 0.3, 0.3]);
        m.box(x - 0.2, 2.2, 18.8, x + 0.2, 2.7, 19.2, MAT.wood, [0.7, 0.62, 0.5]);
    }
}

function pipes(m) {
    const col = [0.34, 0.38, 0.38];
    m.rod([15.5, 3.7, 15], [54, 3.7, 15], 0.12, 8, col);
    m.rod([15.5, 3.4, 15.5], [54, 3.4, 15.5], 0.07, 6, [0.5, 0.26, 0.16]);
    m.rod([16, 3.5, 27], [54, 3.5, 27], 0.1, 8, col);
    const b = BASE_CEIL - 0.25;
    m.rod([24, b, 45], [38, b, 45], 0.14, 8, [0.42, 0.3, 0.24]);
    m.rod([24, b - 0.25, 47], [38, b - 0.25, 47], 0.09, 6, col);
    m.rod([40, b, 47], [50, b, 47], 0.1, 6, col);
    m.rod([12, b, 47], [24, b, 47], 0.1, 6, col);
}

export { Mesh, FILES };
