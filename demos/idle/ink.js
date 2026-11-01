// A small software rasterizer: anti-aliased polygons, smooth blobs, strokes and a die-cut border pass. Works headless, so art never depends on a browser canvas.
const CACHE = new Map();
export function rgba(c) {
    if (Array.isArray(c)) return c;
    let v = CACHE.get(c);
    if (v) return v;
    let h = c.slice(1);
    if (h.length <= 4) h = [...h].map((x) => x + x).join("");
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) : 255];
    CACHE.set(c, v);
    return v;
}
export const mix = (a, b, t) => { const A = rgba(a), B = rgba(b); return [0, 1, 2, 3].map((i) => A[i] + (B[i] - A[i]) * t); };
const SUB = 4;

export class Ink {
    constructor(data, w, h) { this.d = data; this.w = w; this.h = h; this.ox = 0; this.oy = 0; this.k = 1; this.cov = new Float32Array(w + 2); this.seed = 7; }
    /** Moves the origin and scale: draw every cell in its own units. */
    at(x, y, k = 1) { this.ox = x; this.oy = y; this.k = k; return this; }
    X(x) { return this.ox + x * this.k; }
    Y(y) { return this.oy + y * this.k; }
    /** Fills polygons given in pixels. c is a color or (x, y) => [r,g,b,a]. */
    fillPx(rings, c) {
        const w = this.w, h = this.h, cov = this.cov, shader = typeof c === "function" ? c : null, col = shader ? null : rgba(c), D = this.d;
        let y0 = Infinity, y1 = -Infinity;
        const edges = [];
        for (const r of rings) for (let i = 0; i < r.length; i += 2) {
            const j = (i + 2) % r.length, ax = r[i], ay = r[i + 1], bx = r[j], by = r[j + 1];
            if (ay < y0) y0 = ay; if (ay > y1) y1 = ay;
            if (ay !== by) edges.push(ay < by ? [ay, by, ax, (bx - ax) / (by - ay), 1] : [by, ay, bx, (ax - bx) / (ay - by), -1]);
        }
        y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(h - 1, Math.ceil(y1));
        edges.sort((a, b) => a[0] - b[0]);
        const xs = [];
        for (let y = y0; y <= y1; y++) {
            let minX = w, maxX = -1;
            for (let s = 0; s < SUB; s++) {
                const sy = y + (s + 0.5) / SUB;
                xs.length = 0;
                for (const e of edges) { if (e[0] > sy) break; if (e[1] > sy) xs.push([e[2] + (sy - e[0]) * e[3], e[4]]); }
                xs.sort((a, b) => a[0] - b[0]);
                let wind = 0;
                for (let i = 0; i < xs.length - 1; i++) {
                    wind += xs[i][1];
                    if (!wind) continue;
                    const a = Math.max(0, xs[i][0]), b = Math.min(w, xs[i + 1][0]);
                    if (b <= a) continue;
                    const ia = Math.floor(a), ib = Math.floor(b);
                    if (ia < minX) minX = ia; if (ib > maxX) maxX = ib;
                    if (ia === ib) cov[ia] += (b - a) / SUB;
                    else { cov[ia] += (ia + 1 - a) / SUB; for (let x = ia + 1; x < ib; x++) cov[x] += 1 / SUB; cov[ib] += (b - ib) / SUB; }
                }
            }
            for (let x = minX; x <= maxX && x < w; x++) {
                const v = cov[x]; cov[x] = 0;
                if (v <= 0) continue;
                const C = shader ? shader(x, y) : col;
                const a = (C[3] / 255) * Math.min(1, v);
                if (a <= 0) continue;
                const i = (y * w + x) * 4, da = D[i + 3] / 255, oa = a + da * (1 - a);
                D[i] = (C[0] * a + D[i] * da * (1 - a)) / oa;
                D[i + 1] = (C[1] * a + D[i + 1] * da * (1 - a)) / oa;
                D[i + 2] = (C[2] * a + D[i + 2] * da * (1 - a)) / oa;
                D[i + 3] = oa * 255;
            }
            if (maxX + 1 < cov.length) cov[maxX + 1] = 0;
        }
        return this;
    }
    px(flat) { const out = new Array(flat.length); for (let i = 0; i < flat.length; i += 2) { out[i] = this.X(flat[i]); out[i + 1] = this.Y(flat[i + 1]); } return out; }
    poly(flat, c) { return this.fillPx([this.px(flat)], c); }
    ell(x, y, rx, ry, c, rot = 0) {
        const pts = [], n = Math.max(16, Math.ceil(Math.max(rx, ry) * this.k * 1.2)), co = Math.cos(rot), si = Math.sin(rot);
        for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, a = Math.cos(t) * rx, b = Math.sin(t) * ry; pts.push(x + a * co - b * si, y + a * si + b * co); }
        return this.poly(pts, c);
    }
    circ(x, y, r, c) { return this.ell(x, y, r, r, c); }
    /** Closed Catmull-Rom blob through points. */
    smooth(flat, closed = true, steps = 8) {
        const n = flat.length / 2, out = [];
        const P = (i) => { const j = closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)); return [flat[j * 2], flat[j * 2 + 1]]; };
        const last = closed ? n : n - 1;
        for (let i = 0; i < last; i++) {
            const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
            for (let s = 0; s < steps; s++) {
                const t = s / steps, t2 = t * t, t3 = t2 * t;
                out.push(0.5 * (2 * b[0] + (c[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 + (3 * b[0] - a[0] - 3 * c[0] + d[0]) * t3),
                    0.5 * (2 * b[1] + (c[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 + (3 * b[1] - a[1] - 3 * c[1] + d[1]) * t3));
            }
        }
        if (!closed) out.push(flat[flat.length - 2], flat[flat.length - 1]);
        return out;
    }
    blob(flat, c) { return this.poly(this.smooth(flat), c); }
    rr(x, y, w, h, r, c) {
        if (r <= 0) return this.poly([x, y, x + w, y, x + w, y + h, x, y + h], c);
        const pts = [], n = 6, arc = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const t = a0 + (i / n) * Math.PI / 2; pts.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r); } };
        arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
        return this.poly(pts, c);
    }
    star(x, y, n, r1, r2, c, rot = 0) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) { const t = rot + (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; pts.push(x + Math.cos(t) * r, y + Math.sin(t) * r); }
        return this.poly(pts, c);
    }
    /** Round-capped stroke through a polyline, opaque colors look best. */
    line(flat, width, c, smooth = false) {
        const f = smooth ? this.smooth(flat, false, 8) : flat, r = width / 2, rings = [];
        const dot = (x, y) => { const pts = [], n = Math.max(10, Math.ceil(r * this.k * 1.6)); for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push(this.X(x + Math.cos(t) * r), this.Y(y + Math.sin(t) * r)); } rings.push(pts); };
        dot(f[0], f[1]);
        for (let i = 2; i < f.length; i += 2) {
            const ax = f[i - 2], ay = f[i - 1], bx = f[i], by = f[i + 1], dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * r, ny = (dx / l) * r;
            const ring = [ax + nx, ay + ny, bx + nx, by + ny, bx - nx, by - ny, ax - nx, ay - ny].map((v, j) => (j % 2 ? this.Y(v) : this.X(v)));
            // Keep every ring the same winding, or overlapping parts cancel.
            rings.push(ring); dot(bx, by);
        }
        const fixed = rings.map((r2) => { let a = 0; for (let i = 0; i < r2.length; i += 2) { const j = (i + 2) % r2.length; a += r2[i] * r2[j + 1] - r2[j] * r2[i + 1]; } if (a >= 0) return r2; const o = []; for (let i = r2.length - 2; i >= 0; i -= 2) o.push(r2[i], r2[i + 1]); return o; });
        return this.fillPx(fixed, c);
    }
    /** Linear gradient shader between two points in local units. */
    grad(x0, y0, x1, y1, a, b) {
        const A = rgba(a), B = rgba(b), ax = this.X(x0), ay = this.Y(y0), dx = this.X(x1) - ax, dy = this.Y(y1) - ay, l = dx * dx + dy * dy || 1, out = [0, 0, 0, 0];
        return (x, y) => { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)); for (let i = 0; i < 4; i++) out[i] = A[i] + (B[i] - A[i]) * t; return out; };
    }
    /** Paper grain over opaque pixels in a pixel box. */
    grain(x, y, w, h, amt = 7) {
        const D = this.d;
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
            const o = (j * this.w + i) * 4;
            if (!D[o + 3]) continue;
            this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
            const n = ((this.seed >> 16) & 255) / 255 - 0.5;
            const v = n * amt * 2;
            D[o] = Math.max(0, Math.min(255, D[o] + v)); D[o + 1] = Math.max(0, Math.min(255, D[o + 1] + v)); D[o + 2] = Math.max(0, Math.min(255, D[o + 2] + v));
        }
        return this;
    }
    /** Adds a border around whatever is opaque in a pixel box: `ink` wide in dark, then `paper` wide in cream, like a die-cut sticker. */
    dieCut(x, y, w, h, ink, paper, inkColor = "#1d1640", paperColor = "#fff4dc") {
        const D = this.d, W = this.w, dist = new Float32Array(w * h).fill(1e6), R2 = Math.SQRT2;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (D[((y + j) * W + x + i) * 4 + 3] > 127) dist[j * w + i] = 0;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let v = dist[j * w + i]; if (i) v = Math.min(v, dist[j * w + i - 1] + 1); if (j) { v = Math.min(v, dist[(j - 1) * w + i] + 1); if (i) v = Math.min(v, dist[(j - 1) * w + i - 1] + R2); if (i < w - 1) v = Math.min(v, dist[(j - 1) * w + i + 1] + R2); } dist[j * w + i] = v; }
        for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) { let v = dist[j * w + i]; if (i < w - 1) v = Math.min(v, dist[j * w + i + 1] + 1); if (j < h - 1) { v = Math.min(v, dist[(j + 1) * w + i] + 1); if (i < w - 1) v = Math.min(v, dist[(j + 1) * w + i + 1] + R2); if (i) v = Math.min(v, dist[(j + 1) * w + i - 1] + R2); } dist[j * w + i] = v; }
        const I = rgba(inkColor), P = rgba(paperColor);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const v = dist[j * w + i], o = ((y + j) * W + x + i) * 4, a0 = D[o + 3] / 255;
            if (v === 0 && a0 >= 1) continue;
            const total = ink + paper;
            if (v > total + 1) continue;
            const inkCov = Math.max(0, Math.min(1, ink - v + 0.5)), edge = Math.max(0, Math.min(1, total - v + 0.5));
            const r = I[0] * inkCov + P[0] * (1 - inkCov), g = I[1] * inkCov + P[1] * (1 - inkCov), b = I[2] * inkCov + P[2] * (1 - inkCov);
            // Under whatever partial pixels are already there.
            const under = edge * (1 - a0), oa = a0 + under || 1;
            D[o] = (D[o] * a0 + r * under) / oa; D[o + 1] = (D[o + 1] * a0 + g * under) / oa; D[o + 2] = (D[o + 2] * a0 + b * under) / oa; D[o + 3] = Math.max(a0, edge) * 255;
        }
        return this;
    }
}
export const noise2 = (() => {
    const P = new Float32Array(65536);
    let s = 17; for (let i = 0; i < 65536; i++) { s = (s * 1664525 + 1013904223) >>> 0; P[i] = s / 4294967296; }
    const h = (x, y) => P[((x * 251 + y * 1021) >>> 0) & 65535];
    const n = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
    return (x, y, oct = 4) => { let t = 0, a = 0.5, f = 1, tot = 0; for (let i = 0; i < oct; i++) { t += n(x * f + i * 17, y * f - i * 9) * a; tot += a; a *= 0.5; f *= 2; } return t / tot; };
})();
