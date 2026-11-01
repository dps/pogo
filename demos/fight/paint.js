// A small signed-distance painter that writes straight into a Pixmap's bytes. Everything in the game's look comes from
// here: toon-lit enamel, banded chrome, translucent glass. Shapes are functions (x, y) => distance, negative inside.
export const INK = [36, 24, 44];
const hex = (s) => { if (Array.isArray(s)) return s; const n = parseInt(s.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export { hex };
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const L = [-0.46, -0.66, 0.6], Ln = Math.hypot(...L);
const LX = L[0] / Ln, LY = L[1] / Ln, LZ = L[2] / Ln;
const HN = Math.hypot(LX, LY, LZ + 1), HX = LX / HN, HY = LY / HN, HZ = (LZ + 1) / HN;

// Distance functions.
export const box = (cx, cy, w, h, r = 0) => (x, y) => { const qx = Math.abs(x - cx) - w / 2 + r, qy = Math.abs(y - cy) - h / 2 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
export const oval = (cx, cy, rx, ry) => { const k = Math.min(rx, ry); return (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * k; };
export const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
export const seg = (ax, ay, bx, by, r) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; return (x, y) => { const t = clamp(((x - ax) * dx + (y - ay) * dy) / l); return Math.hypot(x - ax - dx * t, y - ay - dy * t) - r; }; };
export const add = (...f) => (x, y) => { let d = 1e9; for (const g of f) { const v = g(x, y); if (v < d) d = v; } return d; };
export const blend = (k, a, b) => (x, y) => { const p = a(x, y), q = b(x, y), h = clamp(0.5 + 0.5 * (q - p) / k); return q + (p - q) * h - k * h * (1 - h); };
export const cut = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
export const taper = (cx, top, bottom, wTop, wBot, r) => (x, y) => {
    // A rounded trapezoid, wider at one end.
    const k = clamp((y - top) / (bottom - top)), hw = (wTop + (wBot - wTop) * k) / 2 - r;
    const qx = Math.abs(x - cx) - hw, qy = Math.abs(y - (top + bottom) / 2) - (bottom - top) / 2 + r;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

/** Paints into a region of a sheet. Local coordinates are world units, scaled by U pixels per unit, y down. */
export class Brush {
    constructor(p, U = 2.4) { this.p = p; this.d = p.data; this.U = U; this.ox = 0; this.oy = 0; this.rx = 0; this.ry = 0; this.rw = p.width; this.rh = p.height; }
    region(x, y, w, h, ox, oy) { this.rx = x; this.ry = y; this.rw = w; this.rh = h; this.ox = x + ox; this.oy = y + oy; }
    /** Core loop: visit pixels covered by distance function f; shader writes rgb into out, and may set out[3] as alpha. */
    fill(f, bounds, shader) {
        const U = this.U, S = this.p.stride, data = this.d, x0p = this.p.x0 ?? 0, out = [0, 0, 0, 1];
        const [bx0, by0, bx1, by1] = bounds;
        const px0 = Math.max(this.rx, Math.floor(this.ox + bx0 * U) - 2), px1 = Math.min(this.rx + this.rw, Math.ceil(this.ox + bx1 * U) + 2);
        const py0 = Math.max(this.ry, Math.floor(this.oy + by0 * U) - 2), py1 = Math.min(this.ry + this.rh, Math.ceil(this.oy + by1 * U) + 2);
        for (let py = py0; py < py1; py++) for (let px = px0; px < px1; px++) {
            const x = (px + 0.5 - this.ox) / U, y = (py + 0.5 - this.oy) / U, dist = f(x, y);
            const cover = clamp(0.5 - dist * U);
            if (cover <= 0) continue;
            out[3] = 1;
            shader(x, y, dist, out);
            const o = (py * S + x0p + px) * 4, a = cover * out[3], da = data[o + 3] / 255, oa = a + da * (1 - a);
            if (oa <= 0) continue;
            data[o] = (out[0] * a + data[o] * da * (1 - a)) / oa;
            data[o + 1] = (out[1] * a + data[o + 1] * da * (1 - a)) / oa;
            data[o + 2] = (out[2] * a + data[o + 2] * da * (1 - a)) / oa;
            data[o + 3] = oa * 255;
        }
        return this;
    }
    bbox(f, guess) { return guess; }
    /** Toon-lit enamel with an ink outline. col: color or [top, bottom]. o: { ink, bevel, spec, bounds, gloss } */
    enamel(f, bounds, col, o = {}) {
        const top = hex(Array.isArray(col) && typeof col[0] === "string" ? col[0] : col), bot = hex(Array.isArray(col) && typeof col[0] === "string" ? col[1] : col);
        const ink = o.ink ?? 1.3, bevel = o.bevel ?? 7, spec = o.spec ?? 0.8, inkC = hex(o.inkColor ?? INK), [, y0, , y1] = bounds, e = 0.3, dark = o.dark ?? 0.64, band = o.band ?? 1;
        const shadowTint = o.shadow ? hex(o.shadow) : null;
        return this.fill(f, bounds, (x, y, d, c) => {
            // Deep inside a shape the surface is flat, so the costly gradient is only needed near edges.
            const t = clamp(1 + d / bevel);
            let nx = 0, ny = 0, nz = 1;
            if (t > 0) { const gx = (f(x + e, y) - f(x - e, y)) / (2 * e), gy = (f(x, y + e) - f(x, y - e)) / (2 * e); nz = Math.sqrt(1 - t * t); nx = gx * t; ny = gy * t; }
            const lam = nx * LX + ny * LY + nz * LZ;
            // Two soft toon bands, painted rather than plastic.
            const tone = smooth(0.12, 0.22, lam) * 0.5 + smooth(0.44, 0.54, lam) * 0.5;
            const k = (y - y0) / (y1 - y0 || 1), base = mix(top, bot, clamp(k));
            let r, g, b;
            if (shadowTint) { const s = mix(shadowTint, base, tone * band + (1 - band)); r = s[0]; g = s[1]; b = s[2]; }
            else { const m = dark + (1 - dark) * (tone * band + (1 - band)); r = base[0] * m; g = base[1] * m * (0.98 + 0.02 * m); b = base[2] * (m * 0.92 + 0.08); }
            const sp = spec * smooth(0.965, 0.985, nx * HX + ny * HY + nz * HZ);
            r += (255 - r) * sp; g += (255 - g) * sp; b += (255 - b) * sp;
            if (o.fn) { const q = o.fn(x, y, [r, g, b]); r = q[0]; g = q[1]; b = q[2]; }
            const edge = smooth(-ink - 0.25, -ink + 0.25, d);
            c[0] = r + (inkC[0] - r) * edge; c[1] = g + (inkC[1] - g) * edge; c[2] = b + (inkC[2] - b) * edge;
        });
    }
    /** Banded chrome: sky at the top, a hard horizon, warm floor beneath. */
    chrome(f, bounds, o = {}) {
        const ink = o.ink ?? 1.3, bevel = o.bevel ?? 5, inkC = hex(o.inkColor ?? INK), e = 0.3, [, y0, , y1] = bounds;
        const sky = hex(o.sky ?? "#f4fbff"), mid = hex(o.mid ?? "#9fb6c8"), hor = hex(o.horizon ?? "#4b5568"), warm = hex(o.warm ?? "#c8a98c");
        return this.fill(f, bounds, (x, y, d, c) => {
            const gx = (f(x + e, y) - f(x - e, y)) / (2 * e), gy = (f(x, y + e) - f(x, y - e)) / (2 * e), t = clamp(1 + d / bevel);
            const v = clamp((y - y0) / (y1 - y0 || 1) + gy * t * 0.5 - gx * t * 0.1 + Math.sin(x * 0.08) * 0.03);
            const col = v < 0.48 ? mix(sky, mid, v / 0.48) : v < 0.54 ? mix(mid, hor, (v - 0.48) / 0.06) : mix(hor, warm, clamp((v - 0.54) / 0.46));
            const glint = smooth(0.8, 0.95, -(gx * 0.45 + gy * 0.8) * t) * 0.7;
            const edge = smooth(-ink - 0.25, -ink + 0.25, d);
            let r = col[0] + (255 - col[0]) * glint, g = col[1] + (255 - col[1]) * glint, b = col[2] + (255 - col[2]) * glint;
            c[0] = r + (inkC[0] - r) * edge; c[1] = g + (inkC[1] - g) * edge; c[2] = b + (inkC[2] - b) * edge;
        });
    }
    /** Flat fill, optional alpha. */
    flat(f, bounds, col, alpha = 1) { const c0 = hex(col); return this.fill(f, bounds, (x, y, d, c) => { c[0] = c0[0]; c[1] = c0[1]; c[2] = c0[2]; c[3] = alpha; }); }
    /** Translucent glass: tinted, with bright edge and a window-streak highlight. */
    glass(f, bounds, col, o = {}) {
        const c0 = hex(col), ink = o.ink ?? 1.2, inkC = hex(INK), alpha = o.alpha ?? 0.45;
        return this.fill(f, bounds, (x, y, d, c) => {
            const edge = smooth(-ink - 0.25, -ink + 0.25, d), rim = smooth(-6, -1, d);
            const streak = smooth(0.0, 0.5, Math.sin((x * 0.6 + y * 0.28) * 0.5)) * smooth(-12, -8, d) * (1 - smooth(-30, -18, d)) * 0.3;
            const a = alpha + rim * 0.3 + streak;
            c[0] = c0[0] + (255 - c0[0]) * (rim * 0.4 + streak); c[1] = c0[1] + (255 - c0[1]) * (rim * 0.4 + streak); c[2] = c0[2] + (255 - c0[2]) * (rim * 0.4 + streak);
            c[3] = clamp(a);
            if (edge > 0) { c[0] += (inkC[0] - c[0]) * edge; c[1] += (inkC[1] - c[1]) * edge; c[2] += (inkC[2] - c[2]) * edge; c[3] += (1 - c[3]) * edge; }
        });
    }
    /** Soft blob of light or shadow. */
    glow(cx, cy, rx, ry, col, alpha = 1) {
        const c0 = hex(col), f = (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry) - 1;
        return this.fill((x, y) => f(x, y) * 200, [cx - rx, cy - ry, cx + rx, cy + ry], (x, y, d, c) => { c[0] = c0[0]; c[1] = c0[1]; c[2] = c0[2]; const k = clamp(-f(x, y)); c[3] = alpha * k * k; });
    }
}
