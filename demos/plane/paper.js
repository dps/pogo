// A paper-model mesh builder. Everything is flat panels with a grain texture crop, a little colour wander from
// sheet to sheet, and a soft gradient so a panel reads as card that bows slightly in the light.
export const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const CUT = hex("#fff6e6");     // the pale core of card where it has been cut

export class Rand {
    constructor(seed = 1) { this.s = seed >>> 0 || 1; }
    next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; }
    range(a, b) { return a + (b - a) * this.next(); }
    pick(list) { return list[Math.floor(this.next() * list.length) % list.length]; }
}

export class Paper {
    constructor(seed = 7, grain = 26) {
        this.pos = []; this.nor = []; this.uv = []; this.col = []; this.idx = [];
        this.m = null; this.r = new Rand(seed); this.grain = grain;
    }
    get verts() { return this.pos.length / 3; }
    at(x = 0, y = 0, z = 0, yaw = 0, sx = 1, sy = sx, sz = sx) {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        this.m = [c * sx, 0, -s * sx, 0, sy, 0, s * sz, 0, c * sz, x, y, z];
        return this;
    }
    /** Local axes right, up, back and an origin. */
    basis(r, u, b, o) { this.m = [...r, ...u, ...b, ...o]; return this; }
    reset() { this.m = null; return this; }
    tx(p) {
        const m = this.m;
        return m ? [m[0] * p[0] + m[3] * p[1] + m[6] * p[2] + m[9], m[1] * p[0] + m[4] * p[1] + m[7] * p[2] + m[10], m[2] * p[0] + m[5] * p[1] + m[8] * p[2] + m[11]] : p;
    }
    wander(c, a = 0.03) { const k = 1 + this.r.range(-a, a); return [c[0] * k, c[1] * k, c[2] * k]; }

    /** A flat fan of points, counter-clockwise from the front. cols: one colour or one per point. */
    fan(pts, cols) {
        const P = pts.map((p) => this.tx(p)), n = P.length;
        let nx = 0, ny = 0, nz = 0;
        for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        // Texture axes in the panel's own plane, with a random crop of the sheet.
        let ux = P[1][0] - P[0][0], uy = P[1][1] - P[0][1], uz = P[1][2] - P[0][2]; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
        const vx = ny * uz - nz * uy, vy = nz * ux - nx * uz, vz = nx * uy - ny * ux;
        const S = this.grain, U = [], V = []; let minU = 1e9, minV = 1e9, maxU = -1e9, maxV = -1e9;
        for (const p of P) { const dx = p[0] - P[0][0], dy = p[1] - P[0][1], dz = p[2] - P[0][2], u = (dx * ux + dy * uy + dz * uz) / S, v = (dx * vx + dy * vy + dz * vz) / S; U.push(u); V.push(v); minU = Math.min(minU, u); minV = Math.min(minV, v); maxU = Math.max(maxU, u); maxV = Math.max(maxV, v); }
        const sU = Math.max(1, maxU - minU), sV = Math.max(1, maxV - minV), oU = this.r.next() * Math.max(0, 1 - (maxU - minU)) - minU, oV = this.r.next() * Math.max(0, 1 - (maxV - minV)) - minV;
        const base = this.pos.length / 3, uvFn = this.uvFn;
        for (let i = 0; i < n; i++) {
            const c = Array.isArray(cols[0]) ? cols[i] : cols;
            this.pos.push(P[i][0], P[i][1], P[i][2]); this.nor.push(nx, ny, nz); this.col.push(c[0], c[1], c[2]);
            if (uvFn) { const q = uvFn(P[i]); this.uv.push(q[0], q[1]); } else this.uv.push((U[i] + oU) / sU, (V[i] + oV) / sV);
        }
        for (let i = 1; i < n - 1; i++) this.idx.push(base, base + i, base + i + 1);
        return this;
    }
    quad(a, b, c, d, ca, cb = ca, cc = cb, cd = cc) { return this.fan([a, b, c, d], [ca, cb, cc, cd]); }
    tri(a, b, c, col) { return this.fan([a, b, c], col); }
    /** Card seen from both sides. */
    both(pts, col, back = col) { this.fan(pts, col); return this.fan([...pts].reverse(), Array.isArray(col[0]) ? [...col].reverse() : back); }

    /** Walled box from y up, with a darker foot so it sits on the ground. */
    box(cx, y, cz, w, h, d, col, o = {}) {
        const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2, y1 = y + h, t = o.taper ?? 1;
        const X0 = cx - w / 2 * t, X1 = cx + w / 2 * t, Z0 = cz - d / 2 * t, Z1 = cz + d / 2 * t, foot = o.foot ?? 0.82, wn = o.wander ?? 0.02;
        const wall = (a, b, c, e) => { const k = this.wander(col, wn); this.quad(a, b, c, e, mul(k, foot), mul(k, foot), k, k); };
        wall([x0, y, z1], [x1, y, z1], [X1, y1, Z1], [X0, y1, Z1]);
        wall([x1, y, z1], [x1, y, z0], [X1, y1, Z0], [X1, y1, Z1]);
        wall([x1, y, z0], [x0, y, z0], [X0, y1, Z0], [X1, y1, Z0]);
        wall([x0, y, z0], [x0, y, z1], [X0, y1, Z1], [X0, y1, Z0]);
        if (!o.noTop) this.quad([X0, y1, Z1], [X1, y1, Z1], [X1, y1, Z0], [X0, y1, Z0], o.top ?? col);
        if (o.bottom) this.quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], mul(col, 0.7));
        return this;
    }
    /** Pleated cone or drum: facets alternate light and dark like folded card. */
    pleat(cx, y, cz, r, h, seg, col, o = {}) {
        const r2 = o.r2 ?? 0, alt = mul(col, o.alt ?? 0.84), rot = o.rot ?? 0, foot = o.foot ?? 0.9, y1 = y + h;
        for (let i = 0; i < seg; i++) {
            const a0 = rot + i / seg * 6.2832, a1 = rot + (i + 1) / seg * 6.2832, c = i % 2 ? alt : col;
            const b0 = [cx + r * Math.cos(a0), y, cz + r * Math.sin(a0)], b1 = [cx + r * Math.cos(a1), y, cz + r * Math.sin(a1)];
            if (r2 > 1e-3) {
                this.quad(b1, b0, [cx + r2 * Math.cos(a0), y1, cz + r2 * Math.sin(a0)], [cx + r2 * Math.cos(a1), y1, cz + r2 * Math.sin(a1)], mul(c, foot), mul(c, foot), c, c);
                if (o.cap) this.tri([cx, y1, cz], [cx + r2 * Math.cos(a1), y1, cz + r2 * Math.sin(a1)], [cx + r2 * Math.cos(a0), y1, cz + r2 * Math.sin(a0)], o.cap);
            } else this.fan([b1, b0, [cx, y1, cz]], [mul(c, foot), mul(c, foot), c]);
            if (o.under) this.tri([cx, y, cz], b0, b1, mul(col, 0.55));
        }
        return this;
    }
    /** A thin flat card with a pale cut edge. Outline is 2D points [a, b], CCW, placed by map(a, b) to 3D, extruded along n by t. */
    card(pts, map, n, t, col, edge = CUT) {
        const front = pts.map(([a, b]) => { const p = map(a, b); return [p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t]; }), back = pts.map(([a, b]) => map(a, b));
        this.fan(front, col); this.fan([...back].reverse(), mul(col, 0.9));
        for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; this.quad(back[i], back[j], front[j], front[i], edge); }
        return this;
    }
    /** Upload to the asset store. */
    commit(assets, name) {
        assets.mesh(name, { positions: this.pos, normals: this.nor, uvs: this.uv, colors: this.col, indices: this.idx });
        return name;
    }
}
