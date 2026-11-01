// A tiny signed-distance painter, tuned for plush: soft bevels, one moonlit key light from the top left, a warm bounce
// on the far side, almost no gloss, and a fat night-blue outline.
export const hex = (s) => {
    const h = s.length === 4 ? [...s.slice(1)].map((ch) => ch + ch).join("") : s.slice(1, 7), v = parseInt(h, 16);
    return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
};
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const INK = hex("#1a1538");
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Primitives. All return functions (x, y) => signed distance in pixels.
export const circle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
export const ellipse = (cx, cy, rx, ry) => {
    const k = Math.min(rx, ry);
    return (x, y) => { const u = (x - cx) / rx, v = (y - cy) / ry, l = Math.hypot(u, v); return (l - 1) * k * (l > 1 ? Math.max(rx, ry) / k * 0.5 + 0.5 : 1); };
};
export const rbox = (cx, cy, hw, hh, r = 0, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return (x, y) => {
        const px = x - cx, py = y - cy, u = Math.abs(px * c + py * s) - hw + r, v = Math.abs(-px * s + py * c) - hh + r;
        return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - r;
    };
};
export const capsule = (ax, ay, bx, by, r) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    return (x, y) => { const t = clamp(((x - ax) * dx + (y - ay) * dy) / l); return Math.hypot(x - ax - dx * t, y - ay - dy * t) - r; };
};
/** Rounded stroke along a polyline: bubble letters, arms, tails, smiles. */
export const stroke = (pts, r) => {
    return (x, y) => {
        let best = 1e9;
        for (let n = 0; n + 1 < pts.length; n++) {
            const [ax, ay] = pts[n], [bx, by] = pts[n + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
            const t = clamp(((x - ax) * dx + (y - ay) * dy) / l), ex = x - ax - dx * t, ey = y - ay - dy * t, q = ex * ex + ey * ey;
            if (q < best) best = q;
        }
        return Math.sqrt(best) - r;
    };
};
export const arc = (cx, cy, rx, ry, a0, a1, n = 14) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return out; };
/** Convex or concave polygon with rounded corners. */
export const polygon = (pts, round = 0) => (x, y) => {
    let d = 1e18, sign = 1;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[j], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
        const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey)), qx = wx - ex * t, qy = wy - ey * t;
        d = Math.min(d, qx * qx + qy * qy);
        const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sign = -sign;
    }
    return sign * Math.sqrt(d) - round;
};
export const star = (cx, cy, r, inner, points = 5, rot = -Math.PI / 2) => {
    const pts = [];
    for (let i = 0; i < points * 2; i++) { const a = rot + i * Math.PI / points, q = i % 2 ? r * inner : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    return pts;
};
// Combinators.
export const union = (...fs) => (x, y) => { let d = 1e9; for (const f of fs) { const v = f(x, y); if (v < d) d = v; } return d; };
export const smooth = (k, ...fs) => (x, y) => {
    let d = fs[0](x, y);
    for (let n = 1; n < fs.length; n++) { const b = fs[n](x, y), h = clamp(0.5 + 0.5 * (b - d) / k); d = b + (d - b) * h - k * h * (1 - h); }
    return d;
};
export const subtract = (a, ...bs) => (x, y) => { let d = a(x, y); for (const b of bs) { const v = -b(x, y); if (v > d) d = v; } return d; };
export const intersect = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));
export const shift = (f, dx, dy) => (x, y) => f(x - dx, y - dy);
export const rotated = (f, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => { const px = x - cx, py = y - cy; return f(cx + px * c + py * s, cy - px * s + py * c); }; };

const LX = -0.46, LY = -0.68, LZ = 0.57;
const HL = Math.hypot(LX, LY, LZ + 1), HX = LX / HL, HY = LY / HL, HZ = (LZ + 1) / HL;

/** Paints shapes over an RGBA8 buffer. Colours are straight alpha, as Pogo expects. */
export class Painter {
    constructor(data, stride, height) { this.data = data; this.w = stride; this.h = height; this.field = new Float32Array(0); this.ox = 0; this.oy = 0; }
    /** Move the origin, usually to the corner of one atlas cell, and clip to its box. */
    cell(x, y, w, h) { this.ox = x; this.oy = y; this.cw = w; this.ch = h; return this; }

    /**
     * Lit shape. o.color is [r,g,b] or (x, y, depth) => [r,g,b]. o.bevel sets how round it looks (default 12).
     * o.gloss 0-1, o.glow how much light passes through (jelly), o.ink outline colour or null, o.inkW outline width,
     * o.alpha body opacity, o.flat skips lighting.
     */
    shape(sdf, o = {}) {
        const inkW = o.ink === null ? 0 : (o.inkW ?? 3), pad = Math.ceil(inkW + 3);
        const cw = this.cw ?? this.w, ch = this.ch ?? this.h;
        const b = o.box ?? this.bounds(sdf, cw, ch, inkW);
        if (!b) return this;
        const x0 = Math.max(0, Math.floor(b[0] - pad)), y0 = Math.max(0, Math.floor(b[1] - pad)), x1 = Math.min(cw - 1, Math.ceil(b[2] + pad)), y1 = Math.min(ch - 1, Math.ceil(b[3] + pad));
        const fw = x1 - x0 + 3, fh = y1 - y0 + 3;
        if (fw <= 2 || fh <= 2) return this;
        if (this.field.length < fw * fh) this.field = new Float32Array(fw * fh);
        const F = this.field;
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) F[x + y * fw] = sdf(x0 + x - 1 + 0.5, y0 + y - 1 + 0.5);
        const bevel = o.bevel ?? 12, gloss = o.gloss ?? 0.6, glow = o.glow ?? 0.3, alpha = o.alpha ?? 1, ink = o.ink === undefined ? INK : o.ink;
        const fn = typeof o.color === "function" ? o.color : null, base = fn ? null : (o.color ?? [1, 1, 1]);
        const inkA = o.inkAlpha ?? 1, D = this.data, stride = this.w;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const k = x - x0 + 1 + (y - y0 + 1) * fw, d = F[k];
            if (d > inkW + 1) continue;
            const cover = clamp(0.5 - d);
            let r = 0, g = 0, bl = 0, a = 0;
            if (cover > 0) {
                const depth = clamp(-d / bevel), c = fn ? fn(x + 0.5, y + 0.5, depth) : base;
                if (o.flat) { r = c[0]; g = c[1]; bl = c[2]; }
                else {
                    const gx = F[k + 1] - F[k - 1], gy = F[k + fw] - F[k - fw], len = Math.hypot(gx, gy) || 1;
                    const e = 1 - depth, slope = e / Math.sqrt(Math.max(1 - e * e, 0.04));
                    let nx = gx / len * slope, ny = gy / len * slope, nz = 1;
                    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
                    const diff = Math.max(0, nx * LX + ny * LY + nz * LZ);
                    const through = Math.max(0, -nx * LX - ny * LY + 0.15 * nz);
                    const hdot = Math.max(0, nx * HX + ny * HY + nz * HZ);
                    const sharp = hdot ** 70, soft = hdot ** 9;
                    const shade = 0.6 + 0.56 * diff;
                    const lift = 1 + glow * through * 1.15;
                    r = c[0] * shade * lift + glow * through * 0.22 * c[0];
                    g = c[1] * shade * lift + glow * through * 0.22 * c[1];
                    bl = c[2] * shade * lift + glow * through * 0.22 * c[2];
                    const sp = sharp * gloss * 1.2 + soft * gloss * 0.2;
                    r += sp; g += sp; bl += sp;
                }
                a = cover * alpha;
            }
            if (inkW > 0 && ink) {
                const ia = clamp(0.5 - (d - inkW)) * inkA, keep = a;
                const t = ia * (1 - keep), out = keep + t;
                if (out > 0) { r = (r * keep + ink[0] * t) / out; g = (g * keep + ink[1] * t) / out; bl = (bl * keep + ink[2] * t) / out; a = out; }
            }
            if (a <= 0.002) continue;
            this.over(((x + this.ox) + (y + this.oy) * stride) * 4, r, g, bl, a, D);
        }
        return this;
    }

    over(p, r, g, b, a, D = this.data) {
        const ba = D[p + 3] / 255, keep = ba * (1 - a), out = a + keep;
        D[p] = clamp((r * a + D[p] / 255 * keep) / out) * 255 + 0.5;
        D[p + 1] = clamp((g * a + D[p + 1] / 255 * keep) / out) * 255 + 0.5;
        D[p + 2] = clamp((b * a + D[p + 2] / 255 * keep) / out) * 255 + 0.5;
        D[p + 3] = out * 255 + 0.5;
    }

    /** Coarse scan for where a shape lives, so shapes only cost what they cover. */
    bounds(sdf, cw, ch, inkW) {
        const step = 6;
        let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let y = 0; y <= ch; y += step) for (let x = 0; x <= cw; x += step) {
            if (sdf(x, y) < step * 1.5 + inkW) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        return x1 < 0 ? null : [x0 - step, y0 - step, x1 + step, y1 + step];
    }

    /** Unlit soft shape: wet highlights, contact shadows, glows. Edge softness is in pixels. */
    soft(sdf, color, alpha = 1, edge = 2) {
        const cw = this.cw ?? this.w, ch = this.ch ?? this.h, b = this.bounds(sdf, cw, ch, edge);
        if (!b) return this;
        const x0 = Math.max(0, b[0] - edge | 0), y0 = Math.max(0, b[1] - edge | 0), x1 = Math.min(cw - 1, b[2] + edge | 0), y1 = Math.min(ch - 1, b[3] + edge | 0);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const d = sdf(x + 0.5, y + 0.5), a = (1 - sstep(-edge, edge * 0.5, d)) * alpha;
            if (a <= 0.003) continue;
            this.over(((x + this.ox) + (y + this.oy) * this.w) * 4, color[0], color[1], color[2], a);
        }
        return this;
    }

    /** Remove paint: bite marks. The edge gets a fresh inked rim, and `crumb` fills the fresh wound. */
    bite(sdf, o = {}) {
        const cw = this.cw ?? this.w, ch = this.ch ?? this.h, b = this.bounds(sdf, cw, ch, 6);
        if (!b) return this;
        const ink = o.ink ?? INK, inkW = o.inkW ?? 3, D = this.data;
        for (let y = Math.max(0, b[1] - 6); y <= Math.min(ch - 1, b[3] + 6); y++) for (let x = Math.max(0, b[0] - 6); x <= Math.min(cw - 1, b[2] + 6); x++) {
            const d = sdf(x + 0.5, y + 0.5), p = ((x + this.ox) + (y + this.oy) * this.w) * 4, at = D[p + 3] / 255;
            if (at <= 0) continue;
            if (d < 0.5) {
                const keep = clamp(d + 0.5);
                D[p + 3] = at * keep * 255;
                if (keep > 0) { D[p] = ink[0] * 255; D[p + 1] = ink[1] * 255; D[p + 2] = ink[2] * 255; }
            } else if (d < inkW + 0.5) {
                const t = clamp(inkW + 0.5 - d);
                D[p] += (ink[0] * 255 - D[p]) * t; D[p + 1] += (ink[1] * 255 - D[p + 1]) * t; D[p + 2] += (ink[2] * 255 - D[p + 2]) * t;
            } else if (o.crumb && d < inkW + 7) {
                const t = clamp(inkW + 7 - d) * 0.8;
                D[p] += (o.crumb[0] * 255 - D[p]) * t; D[p + 1] += (o.crumb[1] * 255 - D[p + 1]) * t; D[p + 2] += (o.crumb[2] * 255 - D[p + 2]) * t;
            }
        }
        return this;
    }
}

/** Scalloped tooth marks centred at (x, y). */
export const teeth = (x, y, r, a = 0, n = 5) => {
    const list = [circle(x, y, r)];
    for (let i = 0; i < n; i++) { const t = a + i * Math.PI * 2 / n; list.push(circle(x + Math.cos(t) * r, y + Math.sin(t) * r, r * 0.42)); }
    return union(...list);
};
