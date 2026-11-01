// A small gouache painter: shapes are signed distance functions, so every form gets soft-cel shading,
// an inky outline and a little brush grain. All art in the game goes through this, which is what
// gives it one hand. Writes straight into a Pixmap's RGBA data.
const cache = new Map();
export function rgb(c) {
    if (Array.isArray(c)) return c;
    let v = cache.get(c);
    if (v) return v;
    const h = c.slice(1), n = h.length === 3 ? h.split("").map((q) => q + q).join("") : h;
    v = [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), n.length > 6 ? parseInt(n.slice(6, 8), 16) / 255 : 1];
    cache.set(c, v);
    return v;
}
export const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return [x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t, 1]; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SHADOW = "#2a1450", LIGHT = "#fff1c8";
export const INK = "#1b1030";

function hash(x, y) { let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 3) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f) * a; f *= 2.03; a *= 0.5; } return s / (1 - Math.pow(0.5, oct)); }

let scratch = new Float32Array(4096);
export class Painter {
    constructor(p) {
        this.p = p; this.w = p.width; this.h = p.height; this.d = p.data; this.stack = []; this.ox = 0; this.oy = 0; this.s = 1; this.r = 0;
        this.cos = 1; this.sin = 0; this.ink = INK; this.inkW = 1.5; this.fx = 1;
    }
    save() { this.stack.push([this.ox, this.oy, this.s, this.r, this.cos, this.sin, this.fx]); return this; }
    restore() { [this.ox, this.oy, this.s, this.r, this.cos, this.sin, this.fx] = this.stack.pop(); return this; }
    at(x, y, s = 1, rot = 0) { const [a, b] = this.t(x, y); this.ox = a; this.oy = b; this.s *= s; this.r += rot; this.cos = Math.cos(this.r); this.sin = Math.sin(this.r); return this; }
    flip() { this.fx = -this.fx; return this; }
    t(x, y) { x *= this.s * this.fx; y *= this.s; return [this.ox + x * this.cos - y * this.sin, this.oy + x * this.sin + y * this.cos]; }
    // ---- Shapes, in local units ----
    circle(x, y, r) { const [a, b] = this.t(x, y), q = r * this.s; return { d: (u, v) => Math.hypot(u - a, v - b) - q, b: [a - q, b - q, a + q, b + q] }; }
    ell(x, y, rx, ry, rot = 0) {
        const [a, b] = this.t(x, y), qx = rx * this.s, qy = ry * this.s, r = this.r + rot * this.fx, c = Math.cos(r), s = Math.sin(r), m = Math.max(qx, qy);
        return { d: (u, v) => { const px = (u - a) * c + (v - b) * s, py = -(u - a) * s + (v - b) * c, k0 = Math.hypot(px / qx, py / qy), k1 = Math.hypot(px / (qx * qx), py / (qy * qy)); return k1 < 1e-6 ? -Math.min(qx, qy) : k0 * (k0 - 1) / k1; }, b: [a - m, b - m, a + m, b + m] };
    }
    cap(x0, y0, x1, y1, r0, r1 = r0) {
        const [ax, ay] = this.t(x0, y0), [bx, by] = this.t(x1, y1), ra = r0 * this.s, rb = r1 * this.s, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6;
        return { d: (u, v) => { const t = clamp(((u - ax) * dx + (v - ay) * dy) / l2, 0, 1); return Math.hypot(u - ax - dx * t, v - ay - dy * t) - (ra + (rb - ra) * t); }, b: [Math.min(ax - ra, bx - rb), Math.min(ay - ra, by - rb), Math.max(ax + ra, bx + rb), Math.max(ay + ra, by + rb)] };
    }
    box(x, y, w, h, rad = 0, rot = 0) {
        const [a, b] = this.t(x, y), hw = w / 2 * this.s, hh = h / 2 * this.s, q = rad * this.s, r = this.r + rot * this.fx, c = Math.cos(r), s = Math.sin(r), m = Math.hypot(hw, hh);
        return { d: (u, v) => { const px = Math.abs((u - a) * c + (v - b) * s) - hw + q, py = Math.abs(-(u - a) * s + (v - b) * c) - hh + q; return Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - q; }, b: [a - m, b - m, a + m, b + m] };
    }
    polygon(pts) {
        const P = pts.map(([x, y]) => this.t(x, y)), xs = P.map((q) => q[0]), ys = P.map((q) => q[1]);
        return {
            d: (u, v) => {
                let d = 1e12, s = 1;
                for (let i = 0, j = P.length - 1; i < P.length; j = i, i++) {
                    const [ax, ay] = P[i], [bx, by] = P[j], ex = bx - ax, ey = by - ay, wx = u - ax, wy = v - ay, t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1), qx = wx - ex * t, qy = wy - ey * t;
                    d = Math.min(d, qx * qx + qy * qy);
                    const c1 = v >= ay, c2 = v < by, c3 = ex * wy > ey * wx;
                    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
                }
                return s * Math.sqrt(d);
            }, b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
        };
    }
    /** A tapered tube along a smooth curve. pts: [[x,y],...]. */
    curve(pts, r0, r1 = r0, n = 14) {
        const out = [], m = pts.length - 1;
        const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
        for (let i = 0; i <= n; i++) {
            const t = i / n * m, k = Math.min(m - 1, Math.floor(t)), f = t - k, a = pts[Math.max(0, k - 1)], b = pts[k], c = pts[k + 1], d = pts[Math.min(m, k + 2)];
            out.push([cr(a[0], b[0], c[0], d[0], f), cr(a[1], b[1], c[1], d[1], f)]);
        }
        const parts = [];
        for (let i = 0; i < n; i++) parts.push(this.cap(out[i][0], out[i][1], out[i + 1][0], out[i + 1][1], r0 + (r1 - r0) * i / n, r0 + (r1 - r0) * (i + 1) / n));
        return union(...parts);
    }
    // ---- Painting ----
    /** Fill a shape with soft-cel shading. o: c, c2 (bottom colour), hi, lo, bevel, ink, inkW, gloss, grain, alpha, flat. */
    fill(sh, o = {}) {
        const W = this.w, H = this.h, data = this.d, pad = 2;
        const x0 = Math.max(0, Math.floor(sh.b[0]) - pad), y0 = Math.max(0, Math.floor(sh.b[1]) - pad), x1 = Math.min(W, Math.ceil(sh.b[2]) + pad), y1 = Math.min(H, Math.ceil(sh.b[3]) + pad);
        const bw = x1 - x0, bh = y1 - y0;
        if (bw <= 0 || bh <= 0) return this;
        const gw = bw + 2, gh = bh + 2, need = gw * gh;
        if (scratch.length < need) scratch = new Float32Array(need * 2);
        const g = scratch, fn = sh.d;
        for (let y = 0, i = 0; y < gh; y++) for (let x = 0; x < gw; x++, i++) g[i] = fn(x0 + x - 0.5, y0 + y - 0.5);
        const c1 = rgb(o.c ?? "#ffffff"), c2 = rgb(o.c2 ?? o.c ?? "#ffffff"), hi = rgb(o.hi ?? mix(c1, LIGHT, 0.62)), lo = rgb(o.lo ?? mix(c1, SHADOW, 0.6)), ink = rgb(o.ink ?? this.ink);
        const iw = (o.inkW ?? this.inkW), bevel = Math.max(1, o.bevel ?? Math.min(sh.b[2] - sh.b[0], sh.b[3] - sh.b[1]) * 0.42), alpha = o.alpha ?? 1, flat = !!o.flat, gr = o.grain ?? 0.05, gloss = o.gloss ?? 0, tb = sh.b[1], th = Math.max(1, sh.b[3] - sh.b[1]);
        const lx = -0.54, ly = -0.84;
        for (let y = 0; y < bh; y++) {
            for (let x = 0; x < bw; x++) {
                const i = (y + 1) * gw + x + 1, d = g[i];
                if (d > 0.7) continue;
                const cov = clamp(0.5 - d, 0, 1) * alpha;
                if (cov <= 0) continue;
                const px = x0 + x, py = y0 + y, f = clamp((py - tb) / th, 0, 1);
                let r = c1[0] + (c2[0] - c1[0]) * f, gg = c1[1] + (c2[1] - c1[1]) * f, b = c1[2] + (c2[2] - c1[2]) * f;
                if (!flat) {
                    const gx = g[i + 1] - g[i - 1], gy = g[i + gw] - g[i - gw], len = Math.hypot(gx, gy) || 1, t = clamp(1 + d / bevel, 0, 1), m = t * Math.sqrt(t);
                    let l = (gx / len * lx + gy / len * ly) * m + (0.5 - f) * 0.5;
                    // Soft cel: pull the shading towards three painted bands.
                    const band = Math.round(l * 3) / 3;
                    l = l * 0.5 + band * 0.5;
                    l += (fbm(px * 0.12, py * 0.3, 2) - 0.5) * 0.35;
                    if (l > 0) { const k = Math.min(1, l * 0.9); r += (hi[0] - r) * k; gg += (hi[1] - gg) * k; b += (hi[2] - b) * k; }
                    else { const k = Math.min(1, -l * 1.0); r += (lo[0] - r) * k; gg += (lo[1] - gg) * k; b += (lo[2] - b) * k; }
                    if (gloss > 0) { const q = (gx / len * lx + gy / len * ly) * m; const sp = Math.pow(clamp((q - 0.45) * 2.4, 0, 1), 2) * gloss; r += (255 - r) * sp; gg += (255 - gg) * sp; b += (255 - b) * sp; }
                }
                if (gr > 0) { const n = 1 + (hash(px, py) - 0.5) * gr * 2; r *= n; gg *= n; b *= n; }
                if (iw > 0) { const k = clamp(d + iw + 0.5, 0, 1); r += (ink[0] - r) * k; gg += (ink[1] - gg) * k; b += (ink[2] - b) * k; }
                this.blend(px, py, r, gg, b, cov);
            }
        }
        return this;
    }
    blend(x, y, r, g, b, a) {
        r = r > 255 ? 255 : r; g = g > 255 ? 255 : g; b = b > 255 ? 255 : b;
        const q = (y * this.w + x) * 4, d = this.d, da = d[q + 3] / 255, oa = a + da * (1 - a);
        if (oa <= 0) return;
        const k = a / oa;
        d[q] = d[q] + (r - d[q]) * k; d[q + 1] = d[q + 1] + (g - d[q + 1]) * k; d[q + 2] = d[q + 2] + (b - d[q + 2]) * k; d[q + 3] = oa * 255;
    }
    /** Add light. Only on painted pixels unless o.free. */
    glow(cx, cy, r, c, a = 0.6) {
        const [ax, ay] = this.t(cx, cy), q = r * this.s, col = rgb(c), x0 = Math.max(0, Math.floor(ax - q)), x1 = Math.min(this.w, Math.ceil(ax + q)), y0 = Math.max(0, Math.floor(ay - q)), y1 = Math.min(this.h, Math.ceil(ay + q)), d = this.d;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const t = 1 - Math.hypot(x - ax, y - ay) / q;
            if (t <= 0) continue;
            const k = t * t * a, i = (y * this.w + x) * 4, da = d[i + 3] / 255;
            if (da <= 0) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = k * 255; continue; }
            d[i] = Math.min(255, d[i] + col[0] * k); d[i + 1] = Math.min(255, d[i + 1] + col[1] * k); d[i + 2] = Math.min(255, d[i + 2] + col[2] * k); d[i + 3] = Math.min(255, d[i + 3] + k * 255 * (1 - da));
        }
        return this;
    }
    /** Paint a full-bleed backdrop from a per-pixel function returning [r,g,b]. */
    wash(fn) {
        const d = this.d, W = this.w, H = this.h;
        for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
            const c = fn(x / W, y / H, x, y);
            d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
        return this;
    }
    vignette(a = 0.5, c = "#120822") {
        const d = this.d, W = this.w, H = this.h, k = rgb(c);
        for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
            const u = x / W - 0.5, v = y / H - 0.5, t = clamp((u * u + v * v) * 2.4 - 0.1, 0, 1) * a;
            d[i] += (k[0] - d[i]) * t; d[i + 1] += (k[1] - d[i + 1]) * t; d[i + 2] += (k[2] - d[i + 2]) * t;
        }
        return this;
    }
    dots(n, seed, x0, y0, w, h, r0, r1, c, a = 1) {
        for (let i = 0; i < n; i++) {
            const x = x0 + hash(i, seed) * w, y = y0 + hash(seed, i + 9) * h, r = r0 + hash(i + 3, seed + 5) * (r1 - r0);
            this.fill(this.circle(x, y, r), { c, flat: true, inkW: 0, alpha: a * (0.5 + hash(i, 7) * 0.5), grain: 0 });
        }
        return this;
    }
}
export const union = (...s) => ({ d: (u, v) => { let m = 1e12; for (let i = 0; i < s.length; i++) { const q = s[i].d(u, v); if (q < m) m = q; } return m; }, b: bounds(s) });
export const blob = (k, ...s) => ({
    d: (u, v) => {
        let m = s[0].d(u, v);
        for (let i = 1; i < s.length; i++) { const b = s[i].d(u, v), h = clamp(0.5 + 0.5 * (b - m) / k, 0, 1); m = b + (m - b) * h - k * h * (1 - h); }
        return m;
    }, b: bounds(s, k),
});
export const cut = (a, ...s) => ({ d: (u, v) => { let m = a.d(u, v); for (let i = 0; i < s.length; i++) m = Math.max(m, -s[i].d(u, v)); return m; }, b: a.b });
export const both = (a, b) => ({ d: (u, v) => Math.max(a.d(u, v), b.d(u, v)), b: a.b });
const bounds = (s, k = 0) => [Math.min(...s.map((q) => q.b[0])) - k, Math.min(...s.map((q) => q.b[1])) - k, Math.max(...s.map((q) => q.b[2])) + k, Math.max(...s.map((q) => q.b[3])) + k];
