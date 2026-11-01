// A small mesh kit: everything in the village is built from these calls and merged, so a whole diorama is one draw call.
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const rgb = (c) => (typeof c === "string" ? hex(c) : c);
export const mix = (a, b, t) => { a = rgb(a); b = rgb(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

export class Geo {
    constructor() { this.p = []; this.n = []; this.c = []; this.u = []; this.i = []; }
    get count() { return this.p.length / 3; }
    vert(x, y, z, nx, ny, nz, col, u = 0, v = 0) {
        this.p.push(x, y, z); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); this.u.push(u, v);
        return this.count - 1;
    }
    /** A box with its base at y, turned by yaw, shaded a touch darker at the foot. */
    box(x, y, z, sx, sy, sz, col, o = {}) {
        const yaw = o.yaw ?? 0, c = Math.cos(yaw), s = Math.sin(yaw), top = rgb(col), bot = rgb(o.bottom ?? mix(col, "#20203a", 0.22));
        const hx = sx / 2, hz = sz / 2, Y0 = y, Y1 = y + sy;
        const P = (a, b) => [x + a * c + b * s, z - a * s + b * c];
        const face = (pts, n) => {
            const base = this.count, nx = n[0] * c + n[2] * s, nz = -n[0] * s + n[2] * c;
            for (const [a, yy, b] of pts) { const q = P(a, b); this.vert(q[0], yy, q[1], nx, n[1], nz, yy > y + 1e-6 ? top : bot); }
            this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
        };
        face([[-hx, Y1, hz], [hx, Y1, hz], [hx, Y1, -hz], [-hx, Y1, -hz]], [0, 1, 0]);
        face([[-hx, Y0, hz], [hx, Y0, hz], [hx, Y1, hz], [-hx, Y1, hz]], [0, 0, 1]);
        face([[hx, Y0, -hz], [-hx, Y0, -hz], [-hx, Y1, -hz], [hx, Y1, -hz]], [0, 0, -1]);
        face([[hx, Y0, hz], [hx, Y0, -hz], [hx, Y1, -hz], [hx, Y1, hz]], [1, 0, 0]);
        face([[-hx, Y0, -hz], [-hx, Y0, hz], [-hx, Y1, hz], [-hx, Y1, -hz]], [-1, 0, 0]);
        return this;
    }
    /** A turned shape. profile is [radius, y] bottom to top, about (x,y,z). col is a color or fn(t, y, angle). */
    lathe(x, y, z, profile, col, o = {}) {
        const seg = o.seg ?? 14, rings = profile.length, base = this.count, sx = o.sx ?? 1, sz = o.sz ?? 1, f = typeof col === "function" ? col : null, solid = f ? null : rgb(col);
        const dir = (i) => { const p = profile[i], q = profile[i + 1]; if (!q) return null; const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return l ? [dx / l, dy / l] : null; };
        for (let i = 0; i < rings; i++) {
            const a = i > 0 ? dir(i - 1) : null, b = dir(i), t = a && b ? [a[0] + b[0], a[1] + b[1]] : a ?? b ?? [0, 1], l = Math.hypot(t[0], t[1]) || 1, nr = t[1] / l, ny = -t[0] / l;
            for (let j = 0; j <= seg; j++) {
                const ang = (j / seg) * Math.PI * 2, cx = Math.cos(ang), cz = Math.sin(ang), wob = o.wobble ? 1 + o.wobble * Math.sin(ang * 3 + i * 2.1 + x * 7) : 1, r = profile[i][0] * wob;
                this.vert(x + cx * r * sx, y + profile[i][1], z + cz * r * sz, cx * nr, ny, cz * nr, f ? rgb(f(i / (rings - 1), profile[i][1], ang)) : solid);
            }
        }
        for (let i = 0; i < rings - 1; i++) for (let j = 0; j < seg; j++) {
            const p = base + i * (seg + 1) + j, q = p + seg + 1;
            this.i.push(p, q, q + 1, p, q + 1, p + 1);
        }
        return this;
    }
    /** An ellipsoid. Its normals are correct for the squash, which is what makes it read as soft. */
    blob(x, y, z, rx, ry, rz, col, o = {}) {
        const rings = o.rings ?? 8, seg = o.seg ?? 12, base = this.count, f = typeof col === "function" ? col : null, solid = f ? null : rgb(col), lump = o.lump ?? 0;
        for (let i = 0; i <= rings; i++) {
            const v = (i / rings) * Math.PI, sv = Math.sin(v), cv = -Math.cos(v);
            for (let j = 0; j <= seg; j++) {
                const a = (j / seg) * Math.PI * 2, cx = Math.cos(a) * sv, cz = Math.sin(a) * sv;
                const bump = lump && i > 0 && i < rings && j < seg ? 1 + lump * (Math.sin(a * 5 + v * 3 + x) + Math.sin(a * 3 - v * 4 + z * 3)) * 0.5 : 1;
                const nx = cx / rx, ny = cv / ry, nz = cz / rz, l = Math.hypot(nx, ny, nz);
                this.vert(x + cx * rx * bump, y + cv * ry * bump, z + cz * rz * bump, nx / l, ny / l, nz / l, f ? rgb(f(cv, a)) : solid);
            }
        }
        for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
            const p = base + i * (seg + 1) + j, q = p + seg + 1;
            this.i.push(p, q, q + 1, p, q + 1, p + 1);
        }
        return this;
    }
    /** A flat tile facing up, given four corners counter-clockwise from above. */
    quad(a, b, c, d, col, n) {
        const base = this.count, cc = rgb(col);
        let nx, ny, nz;
        if (n) [nx, ny, nz] = n;
        else {
            const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
            nx = uy * vz - uz * vy; ny = uz * vx - ux * vz; nz = ux * vy - uy * vx;
            const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        }
        for (const q of [a, b, c, d]) this.vert(q[0], q[1], q[2], nx, ny, nz, q[3] ? rgb(q[3]) : cc);
        this.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
        return this;
    }
    /** A rod between two points, for twigs, rails and arms. */
    rod(a, b, r, col, sides = 5) {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1, ax = dx / l, ay = dy / l, az = dz / l;
        let ux = -az, uy = 0, uz = ax;
        if (Math.hypot(ux, uz) < 0.01) { ux = 1; uz = 0; }
        const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
        const vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux, base = this.count, cc = rgb(col);
        for (let k = 0; k < 2; k++) for (let j = 0; j <= sides; j++) {
            const t = (j / sides) * Math.PI * 2, nx = Math.cos(t) * ux + Math.sin(t) * vx, ny = Math.cos(t) * uy + Math.sin(t) * vy, nz = Math.cos(t) * uz + Math.sin(t) * vz, e = k ? b : a;
            this.vert(e[0] + nx * r, e[1] + ny * r, e[2] + nz * r, nx, ny, nz, cc);
        }
        for (let j = 0; j < sides; j++) { const p = base + j, q = p + sides + 1; this.i.push(p, q + 1, q, p, p + 1, q + 1); }
        return this;
    }
    /** Upload as a named mesh. */
    build(assets, name) {
        assets.free?.(name);
        assets.mesh(name, { positions: this.p, normals: this.n, colors: this.c, uvs: this.u, indices: this.i });
        return name;
    }
}
