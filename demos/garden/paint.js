// A small gouache painter. Pixmap draws clean vectors; this draws wobbly, shaded, ink-lined shapes, which is what makes
// the garden look hand-painted. Everything is float RGBA with straight alpha, kept per sprite and copied into a sheet.

// ---- Noise: one fractal tile, sampled by lookup, so shapes can wobble cheaply ------------------------------------
const NS = 256, NOISE = new Float32Array(NS * NS);
{
    let s = 918273;
    const rnd = () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 4294967296; };
    for (let oct = 0, cell = 64, amp = 0.5; oct < 5; oct++, cell = cell >> 1, amp *= 0.55) {
        const n = NS / cell, g = new Float32Array(n * n).map(rnd);
        for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
            const fx = x / cell, fy = y / cell, x0 = fx | 0, y0 = fy | 0, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
            let tx = fx - x0, ty = fy - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
            const a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1];
            NOISE[y * NS + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
        }
    }
}
export const noise = (x, y) => NOISE[((y & 255) << 8) | (x & 255)];     // 0..1ish, mean ~0.5

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const cache = new Map();
export function rgb(c) {
    if (Array.isArray(c)) return c;
    let v = cache.get(c);
    if (!v) {
        const h = c.replace("#", ""), n = parseInt(h.length <= 4 ? [...h].map((x) => x + x).join("") : h, 16);
        const long = h.length === 8 || h.length === 4;
        const ch = long ? [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
        v = ch.map((x) => x / 255);
        cache.set(c, v);
    }
    return v;
}
export const mix = (a, b, t) => { const p = rgb(a), q = rgb(b); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t, p[3] + (q[3] - p[3]) * t]; };
const LO = rgb("#3f3560"), HI = rgb("#fff4cf");
export const INK = "#38261c";

let pool = [];
const borrow = (n) => { for (let i = 0; i < pool.length; i++) if (pool[i].length === n) { const b = pool[i]; pool.splice(i, 1); b.fill(0); return b; } return new Float32Array(n); };
const release = (b) => { if (pool.length < 8) pool.push(b); };

export class Brush {
    constructor(w, h, seed = 1) {
        this.w = w; this.h = h; this.seed = seed;
        this.px = new Float32Array(w * h * 4);
        this.mask = new Float32Array(w * h);
        this.ox = (seed * 37) & 255; this.oy = (seed * 91) & 255;
        this.inkColor = INK;
    }

    over(o, r, g, b, a) {
        const p = this.px;
        if (a <= 0) return;
        const da = p[o + 3], out = a + da * (1 - a);
        if (out <= 0) return;
        const k = a / out;
        p[o] += (r - p[o]) * k; p[o + 1] += (g - p[o + 1]) * k; p[o + 2] += (b - p[o + 2]) * k; p[o + 3] = out;
    }

    /** A wobbly shaded ellipse: the basic gouache dab. */
    blob(cx, cy, rx, ry, c, o = {}) {
        const col = rgb(c), lo = rgb(o.lo ?? mix(col, LO, 0.42)), hi = rgb(o.hi ?? mix(col, HI, 0.46)), rot = o.rot ?? 0, cs = Math.cos(rot), sn = Math.sin(rot);
        const sq = !!o.sq, wob = o.wob ?? 0.1, tex = o.tex ?? 0.22, light = o.light ?? 1, edge = o.edge ?? 0.14, alpha = (o.alpha ?? 1) * col[3], f = o.freq ?? 3, m = Math.max(rx, ry) * 1.25 + 2, mn = Math.min(rx, ry);
        const X0 = Math.max(0, (cx - m) | 0), X1 = Math.min(this.w - 1, (cx + m + 1) | 0), Y0 = Math.max(0, (cy - m) | 0), Y1 = Math.min(this.h - 1, (cy + m + 1) | 0);
        const ox = this.ox + (cx | 0) * 3, oy = this.oy + (cy | 0) * 5;
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
            const n = NOISE[(((y * f + oy) & 255) << 8) | ((x * f + ox) & 255)] - 0.5;
            const uu = u * u, vv = v * v, d = (sq ? Math.sqrt(Math.sqrt(uu * uu + vv * vv)) : Math.sqrt(uu + vv)) + n * wob;
            const cover = clamp01((1 - d) * mn + 0.5);
            if (cover <= 0) continue;
            let l = -(dx / rx * 0.55 + dy / ry * 0.8) * light;
            const n2 = NOISE[(((y * 2 + ox) & 255) << 8) | ((x * 5 + oy) & 255)] - 0.5;
            l += n2 * tex * 2;
            const t = l;
            let r, g, b;
            if (t < 0) { const k = Math.min(1, -t * 1.15); r = col[0] + (lo[0] - col[0]) * k; g = col[1] + (lo[1] - col[1]) * k; b = col[2] + (lo[2] - col[2]) * k; }
            else { const k = Math.min(1, t * 1.15); r = col[0] + (hi[0] - col[0]) * k; g = col[1] + (hi[1] - col[1]) * k; b = col[2] + (hi[2] - col[2]) * k; }
            const e = 1 - edge * smooth(0.72, 1, d);
            this.over((y * this.w + x) * 4, r * e, g * e, b * e, cover * alpha);
        }
        return this;
    }

    circle(cx, cy, r, c, o) { return this.blob(cx, cy, r, r, c, o); }

    _stamp(x, y, r) {
        const m = this.mask, w = this.w, h = this.h, X0 = Math.max(0, (x - r - 1) | 0), X1 = Math.min(w - 1, (x + r + 1) | 0), Y0 = Math.max(0, (y - r - 1) | 0), Y1 = Math.min(h - 1, (y + r + 1) | 0);
        for (let j = Y0; j <= Y1; j++) for (let i = X0; i <= X1; i++) {
            const d = Math.hypot(i + 0.5 - x, j + 0.5 - y), c = clamp01(r - d + 0.5);
            const o = j * w + i; if (c > m[o]) m[o] = c;
        }
    }

    _flush(c, o = {}, bounds) {
        const col = rgb(c), lo = rgb(o.lo ?? mix(col, LO, 0.3)), tex = o.tex ?? 0.35, alpha = (o.alpha ?? 1) * col[3], m = this.mask, w = this.w;
        const [x0, y0, x1, y1] = bounds;
        for (let y = Math.max(0, y0 | 0); y <= Math.min(this.h - 1, y1 | 0); y++) for (let x = Math.max(0, x0 | 0); x <= Math.min(w - 1, x1 | 0); x++) {
            const a = m[y * w + x];
            if (a <= 0) continue;
            m[y * w + x] = 0;
            const n = clamp01(0.5 + (NOISE[(((y * 3 + this.oy) & 255) << 8) | ((x * 3 + this.ox) & 255)] - 0.5) * 2.4) * tex;
            this.over((y * w + x) * 4, col[0] + (lo[0] - col[0]) * n, col[1] + (lo[1] - col[1]) * n, col[2] + (lo[2] - col[2]) * n, a * alpha);
        }
        return this;
    }

    /** A brush stroke through points (smoothed). width is a number or [start, end], or [start, mid, end]. */
    stroke(pts, width, c, o = {}) {
        const n = pts.length, ws = Array.isArray(width) ? width : [width, width];
        const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
        let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9, total = 0;
        const out = [];
        for (let i = 0; i < n - 1; i++) {
            const a = P(i - 1), b = P(i), d = P(i + 1), e = P(i + 2), len = Math.hypot(d[0] - b[0], d[1] - b[1]), steps = Math.max(2, (len * 1.2) | 0);
            for (let s = 0; s < steps; s++) {
                const t = s / steps, t2 = t * t, t3 = t2 * t;
                const x = o.straight ? b[0] + (d[0] - b[0]) * t : 0.5 * (2 * b[0] + (d[0] - a[0]) * t + (2 * a[0] - 5 * b[0] + 4 * d[0] - e[0]) * t2 + (3 * b[0] - a[0] - 3 * d[0] + e[0]) * t3);
                const y = o.straight ? b[1] + (d[1] - b[1]) * t : 0.5 * (2 * b[1] + (d[1] - a[1]) * t + (2 * a[1] - 5 * b[1] + 4 * d[1] - e[1]) * t2 + (3 * b[1] - a[1] - 3 * d[1] + e[1]) * t3);
                out.push(x, y);
            }
            total += len;
        }
        out.push(pts[n - 1][0], pts[n - 1][1]);
        const count = out.length / 2;
        for (let i = 0; i < count; i++) {
            const t = i / Math.max(1, count - 1), seg = t * (ws.length - 1), k = Math.min(ws.length - 2, seg | 0), w = ws[k] + (ws[k + 1] - ws[k]) * (seg - k);
            const x = out[i * 2], y = out[i * 2 + 1], r = Math.max(0.3, w / 2 * (1 + (noise((x * 4) | 0, (y * 4) | 0) - 0.5) * (o.wob ?? 0.5)));
            this._stamp(x, y, r);
            bx0 = Math.min(bx0, x - r - 2); by0 = Math.min(by0, y - r - 2); bx1 = Math.max(bx1, x + r + 2); by1 = Math.max(by1, y + r + 2);
        }
        return this._flush(c, o, [bx0, by0, bx1, by1]);
    }

    line(x0, y0, x1, y1, width, c, o = {}) { return this.stroke([[x0, y0], [x1, y1]], width, c, { straight: true, ...o }); }

    /** A filled shape with a gently anti-aliased edge. */
    poly(pts, c, o = {}) {
        const m = this.mask, w = this.w, ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
        const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
        const SS = 4;
        for (let y = y0; y <= y1; y++) for (let s = 0; s < SS; s++) {
            const yy = y + (s + 0.5) / SS, hits = [];
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i], q = pts[(i + 1) % pts.length];
                if ((p[1] <= yy && q[1] > yy) || (q[1] <= yy && p[1] > yy)) hits.push(p[0] + (yy - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
            }
            hits.sort((a, b) => a - b);
            for (let i = 0; i + 1 < hits.length; i += 2) {
                const a = hits[i], b = hits[i + 1];
                for (let x = Math.max(0, Math.floor(a)); x <= Math.min(w - 1, Math.floor(b)); x++) {
                    const cov = Math.min(b, x + 1) - Math.max(a, x);
                    if (cov > 0) m[y * w + x] = Math.min(1, m[y * w + x] + cov / SS);
                }
            }
        }
        return this._flush(c, o, [Math.min(...xs) - 1, y0, Math.max(...xs) + 1, y1]);
    }

    /** Draw an outline around everything painted so far, thick and thin like a dip pen. */
    ink(width = 2.4, c) {
        const col = rgb(c ?? this.inkColor), w = this.w, h = this.h, p = this.px, m = this.mask;
        const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && p[(y * w + x) * 4 + 3] > 0.5;
        const R = Math.ceil(width) + 1;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!solid(x, y) || (solid(x - 1, y) && solid(x + 1, y) && solid(x, y - 1) && solid(x, y + 1))) continue;
            const r = width * (0.75 + 0.6 * noise((x * 2 + this.ox) | 0, (y * 2 + this.oy) | 0));
            for (let j = Math.max(0, y - R); j <= Math.min(h - 1, y + R); j++) for (let i = Math.max(0, x - R); i <= Math.min(w - 1, x + R); i++) {
                const c2 = clamp01(r - Math.hypot(i - x, j - y) + 0.5), o = j * w + i;
                if (c2 > m[o]) m[o] = c2;
            }
        }
        for (let i = 0, n = w * h; i < n; i++) {
            const a = m[i]; if (a <= 0) continue;
            m[i] = 0;
            const o = i * 4, da = p[o + 3], under = a * col[3] * (1 - da), out = da + under;
            if (out <= 0) continue;
            const k = under / out;
            p[o] += (col[0] - p[o]) * k; p[o + 1] += (col[1] - p[o + 1]) * k; p[o + 2] += (col[2] - p[o + 2]) * k; p[o + 3] = out;
        }
        return this;
    }

    /** Paint inside fn on a fresh layer, ink it, then lay it on top. Gives overlapping shapes their own outlines. */
    part(fn, width = 2.2, c) {
        const under = this.px;
        this.px = borrow(under.length);
        fn(this);
        if (width > 0) this.ink(width, c);
        const top = this.px;
        this.px = under;
        for (let o = 0; o < top.length; o += 4) if (top[o + 3] > 0) this.over(o, top[o], top[o + 1], top[o + 2], top[o + 3]);
        release(top);
        return this;
    }

    /** Fine paper grain over everything painted. */
    grain(amount = 0.05) {
        const p = this.px, w = this.w;
        for (let y = 0; y < this.h; y++) for (let x = 0; x < w; x++) {
            const o = (y * w + x) * 4; if (p[o + 3] <= 0) continue;
            const n = (NOISE[(((y * 7 + 13) & 255) << 8) | ((x * 7 + this.ox) & 255)] - 0.5) * amount * 2;
            p[o] += n; p[o + 1] += n; p[o + 2] += n;
        }
        return this;
    }

    /** Copy into a byte sheet. */
    blit(data, stride, x, y) {
        const p = this.px, w = this.w, h = this.h;
        for (let j = 0; j < h; j++) {
            let d = ((y + j) * stride + x) * 4, s = j * w * 4;
            for (let i = 0; i < w; i++, d += 4, s += 4) {
                const a = p[s + 3];
                if (a <= 0) continue;
                data[d] = clamp01(p[s]) * 255; data[d + 1] = clamp01(p[s + 1]) * 255; data[d + 2] = clamp01(p[s + 2]) * 255; data[d + 3] = clamp01(a) * 255;
            }
        }
    }
}
