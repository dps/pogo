// A small signed-distance sticker painter. Shapes are functions (x, y) => distance with a bounding box in `.b`, so a fill only
// touches its own pixels and 200 stickers paint in a blink. Every fill gets an ink line, a cel shadow to the lower right and a gloss.
export const INK = "#3a1d5c";
export const hex = (s) => { if (Array.isArray(s)) return s; if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`; const n = parseInt(s.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, k) => { a = hex(a); b = hex(b); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const S = (d, b) => { d.b = b; return d; };

export const oval = (cx, cy, rx, ry) => { const k = Math.min(rx, ry); return S((x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * k, [cx - rx, cy - ry, cx + rx, cy + ry]); };
export const disc = (cx, cy, r) => S((x, y) => Math.hypot(x - cx, y - cy) - r, [cx - r, cy - r, cx + r, cy + r]);
export const box = (cx, cy, w, h, r = 0) => S((x, y) => { const qx = Math.abs(x - cx) - w / 2 + r, qy = Math.abs(y - cy) - h / 2 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }, [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]);
export const seg = (ax, ay, bx, by, r, r2 = r) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, m = Math.max(r, r2); return S((x, y) => { const t = clamp(((x - ax) * dx + (y - ay) * dy) / l); return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (r + (r2 - r) * t); }, [Math.min(ax, bx) - m, Math.min(ay, by) - m, Math.max(ax, bx) + m, Math.max(ay, by) + m]); };
export const curve = (pts, r, r2 = r) => { const n = pts.length - 1, parts = []; for (let i = 0; i < n; i++) parts.push(seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r + ((r2 - r) * i) / n, r + ((r2 - r) * (i + 1)) / n)); return add(...parts); };
const union = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
export const add = (...f) => S((x, y) => { let d = 1e9; for (const g of f) { const v = g(x, y); if (v < d) d = v; } return d; }, f.map((g) => g.b).reduce(union));
export const smooth = (k, ...f) => f.reduce((a, b) => S((x, y) => { const p = a(x, y), q = b(x, y), h = clamp(0.5 + (0.5 * (q - p)) / k); return q + (p - q) * h - k * h * (1 - h); }, (() => { const u = union(a.b, b.b); return u; })()));
export const cut = (a, b) => S((x, y) => Math.max(a(x, y), -b(x, y)), a.b);
export const meet = (a, b) => S((x, y) => Math.max(a(x, y), b(x, y)), a.b);
export const grow = (f, r) => S((x, y) => f(x, y) - r, [f.b[0] - r, f.b[1] - r, f.b[2] + r, f.b[3] + r]);
export const turn = (f, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), rs = Math.max(Math.hypot(f.b[0] - cx, f.b[1] - cy), Math.hypot(f.b[2] - cx, f.b[3] - cy), Math.hypot(f.b[0] - cx, f.b[3] - cy), Math.hypot(f.b[2] - cx, f.b[1] - cy)); return S((x, y) => { const X = x - cx, Y = y - cy; return f(cx + X * c + Y * s, cy - X * s + Y * c); }, [cx - rs, cy - rs, cx + rs, cy + rs]); };
export const poly = (pts, r = 0) => {
    const n = pts.length, bb = [1e9, 1e9, -1e9, -1e9];
    for (const [x, y] of pts) { bb[0] = Math.min(bb[0], x - r); bb[1] = Math.min(bb[1], y - r); bb[2] = Math.max(bb[2], x + r); bb[3] = Math.max(bb[3], y + r); }
    return S((x, y) => {
        let d = 1e9, s = 1;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[j], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay, t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1)), qx = wx - ex * t, qy = wy - ey * t;
            d = Math.min(d, qx * qx + qy * qy);
            const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
            if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
        }
        return s * Math.sqrt(d) - r;
    }, bb);
};

/** One painted area of a big atlas. Design coordinates are multiplied by `scale`. */
export class Cel {
    constructor(p, x0, y0, w, h, scale = 1) { this.data = p.data; this.stride = p.stride ?? p.width; this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.s = scale; this.ink = INK; }
    /** o: ink width (0 for none), bottom color, shade 0-1 (cel shadow), gloss 0-1, alpha, soft (edge blur) */
    fill(f, color, o = {}) {
        const { data, stride, x0, y0, w, h, s } = this, ink = o.ink ?? 1.8, shade = o.shade ?? 0.28, gloss = o.gloss ?? 0.42, alpha = o.alpha ?? 1, soft = (o.soft ?? 0) + 0.7 / s;
        const c = hex(color), c2 = o.bottom ? hex(o.bottom) : c, dark = mix(mix(c, o.shadeTo ?? "#6a2fa0", 0.42), c, 0.2), lite = mix(c, "#ffffff", 0.62), ic = hex(o.inkColor ?? this.ink);
        const m = ink + 2 / s, b = f.b, px0 = Math.max(0, Math.floor((b[0] - m) * s)), py0 = Math.max(0, Math.floor((b[1] - m) * s)), px1 = Math.min(w, Math.ceil((b[2] + m) * s)), py1 = Math.min(h, Math.ceil((b[3] + m) * s));
        const hh = Math.max(1, b[3] - b[1]), off = o.off ?? Math.min(b[2] - b[0], hh) * 0.11 + 0.9;
        for (let py = py0; py < py1; py++) {
            const y = (py + 0.5) / s;
            let i = ((py + y0) * stride + px0 + x0) * 4;
            for (let px = px0; px < px1; px++, i += 4) {
                const x = (px + 0.5) / s, d = f(x, y);
                if (d > m) continue;
                let a, r, g, bl;
                const inside = clamp(0.5 - d / soft);
                if (ink > 0) {
                    const outer = clamp(0.5 - (d - ink) * s * 0.9);
                    if (inside <= 0) { blend(data, i, ic[0], ic[1], ic[2], outer * alpha); continue; }
                    blend(data, i, ic[0], ic[1], ic[2], outer * alpha);
                }
                if (inside <= 0) continue;
                const t = clamp((y - b[1]) / hh);
                r = c[0] + (c2[0] - c[0]) * t; g = c[1] + (c2[1] - c[1]) * t; bl = c[2] + (c2[2] - c[2]) * t;
                if (shade > 0 && d < 0) {
                    const q = f(x - off, y - off); // Outside this offset copy means we're in the shadow crescent.
                    const k = clamp(0.5 + q * s * 0.8) * shade * 2;
                    if (k > 0) { r += (dark[0] - r) * k; g += (dark[1] - g) * k; bl += (dark[2] - bl) * k; }
                    if (gloss > 0) {
                        const q2 = f(x + off * 0.62, y + off * 0.9), q3 = f(x + off * 1.2, y + off * 1.5), k2 = q2 > 0 && q3 > 0 ? 0 : clamp((q2 + 0) * s * 0.7 + 0.5) * gloss;
                        if (k2 > 0) { r += (lite[0] - r) * k2; g += (lite[1] - g) * k2; bl += (lite[2] - bl) * k2; }
                    }
                }
                a = inside * alpha;
                blend(data, i, r, g, bl, a);
            }
        }
        return this;
    }
    /** A flat shape with no ink, for faces and marks. */
    flat(f, color, alpha = 1) { return this.fill(f, color, { ink: 0, shade: 0, gloss: 0, alpha }); }
    /** Die-cut sticker edge: a border behind everything painted so far. */
    sticker(rad, color, edge = "#3a1d5c") {
        const { data, stride, x0, y0, w, h, s } = this, r = rad * s, n = w * h, dist = new Float32Array(n), c = hex(color), e = hex(edge), D = 1.4142;
        for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) { const a = data[((y + y0) * stride + x + x0) * 4 + 3]; dist[k] = a > 200 ? 0 : a > 8 ? 1 - a / 255 : 1e6; }
        for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) { let v = dist[k]; if (x) v = Math.min(v, dist[k - 1] + 1); if (y) { v = Math.min(v, dist[k - w] + 1); if (x) v = Math.min(v, dist[k - w - 1] + D); if (x < w - 1) v = Math.min(v, dist[k - w + 1] + D); } dist[k] = v; }
        for (let y = h - 1, k = n - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--, k--) { let v = dist[k]; if (x < w - 1) v = Math.min(v, dist[k + 1] + 1); if (y < h - 1) { v = Math.min(v, dist[k + w] + 1); if (x < w - 1) v = Math.min(v, dist[k + w + 1] + D); if (x) v = Math.min(v, dist[k + w - 1] + D); } dist[k] = v; }
        for (let y = 0, k = 0; y < h; y++) for (let x = 0; x < w; x++, k++) {
            const v = dist[k], cov = clamp(r + 1 - v), ecov = clamp(r + 2.2 - v);
            if (ecov <= 0) continue;
            const i = ((y + y0) * stride + x + x0) * 4, da = data[i + 3] / 255;
            if (da >= 1) continue;
            const t = cov, sr = e[0] + (c[0] - e[0]) * t, sg = e[1] + (c[1] - e[1]) * t, sb = e[2] + (c[2] - e[2]) * t, sa = ecov * (1 - da), oa = da + sa;
            data[i] = (data[i] * da + sr * sa) / oa; data[i + 1] = (data[i + 1] * da + sg * sa) / oa; data[i + 2] = (data[i + 2] * da + sb * sa) / oa; data[i + 3] = oa * 255;
        }
        return this;
    }
}
function blend(data, i, r, g, b, a) {
    if (a <= 0) return;
    const da = data[i + 3] / 255;
    if (a >= 1 || da === 0) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = (a >= 1 ? 1 : a) * 255; return; }
    const oa = a + da * (1 - a), k = a / oa;
    data[i] += (r - data[i]) * k; data[i + 1] += (g - data[i + 1]) * k; data[i + 2] += (b - data[i + 2]) * k; data[i + 3] = oa * 255;
}
