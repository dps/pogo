// Tiny voxel toolkit: paint into a 3D grid, then mesh it with baked ambient occlusion and a chosen pivot.
// pogo's assets.voxels() centres every model and has flat vertex colours; animated limbs need hip pivots,
// and the diorama look depends on AO, so we mesh ourselves and hand the arrays to assets.mesh().

export const hash = (x, y, z = 0) => {
    let h = Math.imul(x * 73856093 ^ y * 19349663 ^ z * 83492791, 2654435761) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 1540483477) >>> 0; h = (h ^ (h >>> 15)) >>> 0;
    return h / 4294967296;
};

export class Vox {
    constructor(w, h, d) {
        this.w = w; this.h = h; this.d = d;
        this.c = new Int32Array(w * h * d).fill(-1);
    }
    get(x, y, z) {
        if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) return -1;
        return this.c[x + this.w * (y + this.h * z)];
    }
    set(x, y, z, c) {
        x = Math.round(x); y = Math.round(y); z = Math.round(z);
        if (x < 0 || y < 0 || z < 0 || x >= this.w || y >= this.h || z >= this.d) return this;
        this.c[x + this.w * (y + this.h * z)] = c;
        return this;
    }
    /** Inclusive box. c is a colour or (x,y,z) => colour. */
    box(x0, y0, z0, x1, y1, z1, c) {
        for (let z = z0; z <= z1; z++) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, z, typeof c === "function" ? c(x, y, z) : c);
        return this;
    }
    /** Filled ellipsoid. */
    ball(cx, cy, cz, rx, ry = rx, rz = rx, c = 0xffffff) {
        for (let z = Math.floor(cz - rz); z <= cz + rz; z++) for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const dx = (x - cx) / rx, dy = (y - cy) / ry, dz = (z - cz) / rz;
            if (dx * dx + dy * dy + dz * dz <= 1) this.set(x, y, z, typeof c === "function" ? c(x, y, z) : c);
        }
        return this;
    }
    /** Copy x < w/2 onto the other side. */
    mirrorX() {
        for (let z = 0; z < this.d; z++) for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w >> 1; x++) this.set(this.w - 1 - x, y, z, this.get(x, y, z));
        return this;
    }
    /** Recolour existing voxels. fn(x,y,z,c) returns the new colour. */
    tint(fn) {
        for (let z = 0; z < this.d; z++) for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
            const c = this.get(x, y, z);
            if (c >= 0) this.c[x + this.w * (y + this.h * z)] = fn(x, y, z, c);
        }
        return this;
    }
}

const FACES = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const AO = [1, 0.83, 0.68, 0.5];
const axis = (a) => a.findIndex((x) => x !== 0);

export const newMesh = () => ({ p: [], n: [], c: [], i: [] });

/**
 * Greedy mesher with baked ambient occlusion. Coplanar faces of one colour and uniform AO merge into one quad.
 * pivot is in voxel-corner coordinates (default: bottom centre, so models stand on y=0).
 * cull lists normals never seen by the fixed camera, e.g. "-y-z" for scenery that isn't rotated.
 */
export function meshVox(v, o = {}) {
    const unit = o.unit ?? 0.1, piv = o.pivot ?? [v.w / 2, 0, v.d / 2], jit = o.jitter ?? 0.03, aoK = o.ao ?? 1, cull = o.cull ?? "-y";
    const m = newMesh(), size = [v.w, v.h, v.d], solid = (p) => (v.get(p[0], p[1], p[2]) >= 0 ? 1 : 0);
    FACES.forEach((f, fi) => {
        const { n, u, v: w } = f, nA = axis(n), uA = axis(u), vA = axis(w), sign = n[nA];
        if (cull.includes(`${sign < 0 ? "-" : "+"}${"xyz"[nA]}`)) return;
        const du = size[uA], dv = size[vA], dn = size[nA], mask = new Float64Array(du * dv), occ = new Uint8Array(du * dv * 4), p = [0, 0, 0], q = [0, 0, 0];
        for (let c = 0; c < dn; c++) {
            mask.fill(-1);
            for (let b = 0; b < dv; b++) for (let a = 0; a < du; a++) {
                p[nA] = c; p[uA] = a; p[vA] = b;
                const col = v.get(p[0], p[1], p[2]);
                if (col < 0) continue;
                q[0] = p[0] + n[0]; q[1] = p[1] + n[1]; q[2] = p[2] + n[2];
                if (solid(q)) continue;
                let uniform = true, first = -1;
                for (let k = 0; k < 4; k++) {
                    const [su, sv] = CORNERS[k];
                    const s1 = solid([q[0] + u[0] * su, q[1] + u[1] * su, q[2] + u[2] * su]), s2 = solid([q[0] + w[0] * sv, q[1] + w[1] * sv, q[2] + w[2] * sv]);
                    const cn = solid([q[0] + u[0] * su + w[0] * sv, q[1] + u[1] * su + w[1] * sv, q[2] + u[2] * su + w[2] * sv]);
                    const ao = s1 && s2 ? 3 : s1 + s2 + cn;
                    occ[(a + b * du) * 4 + k] = ao;
                    if (first < 0) first = ao; else if (ao !== first) uniform = false;
                }
                if (o.flatAO) { // a whole face takes one shade: far fewer quads, for meshes drawn dozens of times
                    const off = (a + b * du) * 4, mean = Math.round((occ[off] + occ[off + 1] + occ[off + 2] + occ[off + 3]) / 4);
                    occ[off] = occ[off + 1] = occ[off + 2] = occ[off + 3] = mean; uniform = true; first = mean;
                }
                // Cells with shaded corners stay single quads; flat ones get a key that lets them merge.
                mask[a + b * du] = uniform ? col * 4 + first : -2 - col * 4 - (a + b * du) * 1e-3;
            }
            for (let b = 0; b < dv; b++) for (let a = 0; a < du; a++) {
                const key = mask[a + b * du];
                if (key === -1) continue;
                let wd = 1, ht = 1;
                if (key >= 0) {
                    while (a + wd < du && mask[a + wd + b * du] === key) wd++;
                    outer: while (b + ht < dv) { for (let i = 0; i < wd; i++) if (mask[a + i + (b + ht) * du] !== key) break outer; ht++; }
                }
                const k = jit ? 1 + (hash(a, b, c + fi * 97) - 0.5) * 2 * jit : 1;
                p[nA] = c; p[uA] = a; p[vA] = b;
                const col = v.get(p[0], p[1], p[2]), r = ((col >> 16) & 255) / 255 * k, g = ((col >> 8) & 255) / 255 * k, bl = (col & 255) / 255 * k;
                const base = m.p.length / 3, aos = [];
                for (let i = 0; i < 4; i++) {
                    const [su, sv] = CORNERS[i], at = [0, 0, 0];
                    at[nA] = c + (sign > 0 ? 1 : 0);
                    at[uA] = u[uA] * su > 0 ? a + wd : a;
                    at[vA] = w[vA] * sv > 0 ? b + ht : b;
                    m.p.push((at[0] - piv[0]) * unit, (at[1] - piv[1]) * unit, (at[2] - piv[2]) * unit);
                    m.n.push(n[0], n[1], n[2]);
                    const ao = occ[(a + b * du) * 4 + i];
                    aos.push(ao);
                    const l = 1 - (1 - AO[ao]) * aoK;
                    m.c.push(r * l, g * l, bl * l);
                }
                if (aos[0] + aos[2] > aos[1] + aos[3]) m.i.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
                else m.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
                for (let j = 0; j < ht; j++) for (let i = 0; i < wd; i++) mask[a + i + (b + j) * du] = -1;
            }
        }
    });
    return m;
}

/** Append mesh `src` to `out`, turned by `quarter` 90° steps about y, then uniformly scaled and moved. */
export function stamp(out, src, x = 0, y = 0, z = 0, quarter = 0, s = 1, tint = null) {
    const base = out.p.length / 3, q = ((quarter % 4) + 4) % 4;
    const c = [1, 0, -1, 0][q], sn = [0, 1, 0, -1][q];
    for (let i = 0; i < src.p.length; i += 3) {
        const px = src.p[i], py = src.p[i + 1], pz = src.p[i + 2];
        out.p.push((c * px + sn * pz) * s + x, py * s + y, (-sn * px + c * pz) * s + z);
        const nx = src.n[i], ny = src.n[i + 1], nz = src.n[i + 2];
        out.n.push(c * nx + sn * nz, ny, -sn * nx + c * nz);
        if (tint) out.c.push(src.c[i] * tint[0], src.c[i + 1] * tint[1], src.c[i + 2] * tint[2]);
        else out.c.push(src.c[i], src.c[i + 1], src.c[i + 2]);
    }
    for (const i of src.i) out.i.push(i + base);
    return out;
}

/** One quad with per-corner colours. Corners are given counter-clockwise when seen from the front. */
export function quad(m, a, b, c, d, n, ca, cb = ca, cc = ca, cd = ca) {
    const base = m.p.length / 3;
    m.p.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) m.n.push(n[0], n[1], n[2]);
    m.c.push(...ca, ...cb, ...cc, ...cd);
    m.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

export const toGeometry = (m) => ({ positions: m.p, normals: m.n, colors: m.c, indices: m.i });
export const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
