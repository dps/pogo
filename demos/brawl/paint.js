// A signed-distance comic-book painter. Shapes are functions (x, y) => distance, negative inside. Every fill gets a heavy ink line,
// a hard cel shadow to the lower right that breaks into halftone dots, and a rim of light. Writes straight into Pixmap bytes.
export const INK = [34, 18, 46];
export const hex = (s) => { if (Array.isArray(s)) return s; if (s.length === 4) s = `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`; const n = parseInt(s.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export const box = (cx, cy, w, h, r = 0) => (x, y) => { const qx = Math.abs(x - cx) - w / 2 + r, qy = Math.abs(y - cy) - h / 2 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
export const oval = (cx, cy, rx, ry) => { const k = Math.min(rx, ry); return (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * k; };
export const disc = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
export const seg = (ax, ay, bx, by, r, r2 = r) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; return (x, y) => { const t = clamp(((x - ax) * dx + (y - ay) * dy) / l); return Math.hypot(x - ax - dx * t, y - ay - dy * t) - (r + (r2 - r) * t); }; };
export const add = (...f) => (x, y) => { let d = 1e9; for (const g of f) { const v = g(x, y); if (v < d) d = v; } return d; };
export const blend = (k, a, b) => (x, y) => { const p = a(x, y), q = b(x, y), h = clamp(0.5 + 0.5 * (q - p) / k); return q + (p - q) * h - k * h * (1 - h); };
export const blends = (k, ...f) => f.reduce((a, b) => blend(k, a, b));
export const cut = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
export const meet = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));
export const round = (f, r) => (x, y) => f(x, y) - r;
export const shift = (f, dx, dy) => (x, y) => f(x - dx, y - dy);
export const rot = (f, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => { const X = x - cx, Y = y - cy; return f(cx + X * c + Y * s, cy - X * s + Y * c); }; };
/** Convex or concave polygon, exact distance. */
export const polygon = (pts) => (x, y) => {
    let d = 1e12, sgn = 1; const n = pts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[j], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay, t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey)), qx = wx - ex * t, qy = wy - ey * t;
        d = Math.min(d, qx * qx + qy * qy);
        const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sgn = -sgn;
    }
    return sgn * Math.sqrt(d);
};

/** Auto bounds: walks outward from a guess by sampling, so painters needn't write boxes. Falls back to the region. */
export class Brush {
    constructor(p, U = 2.4) { this.p = p; this.d = p.data; this.U = U; this.S = p.stride ?? p.width; this.x0 = p.x0 ?? 0; this.ox = 0; this.oy = 0; this.rx = 0; this.ry = 0; this.rw = p.width; this.rh = p.height; }
    region(x, y, w, h, ox, oy) { this.rx = x; this.ry = y; this.rw = w; this.rh = h; this.ox = x + ox; this.oy = y + oy; }
    fill(f, shader) {
        const U = this.U, S = this.S, data = this.d, x0p = this.x0, out = [0, 0, 0, 1];
        const py1 = this.ry + this.rh, px1 = this.rx + this.rw;
        // Coarse skip: test a 6 px grid, then only shade cells near or inside the shape.
        const step = 6, reach = (step * 1.5 + 2) / U;
        for (let cy = this.ry; cy < py1; cy += step) for (let cx = this.rx; cx < px1; cx += step) {
            const d0 = f((cx + step / 2 - this.ox) / U, (cy + step / 2 - this.oy) / U);
            if (d0 > reach) continue;
            const ey = Math.min(cy + step, py1), ex = Math.min(cx + step, px1);
            for (let py = cy; py < ey; py++) for (let px = cx; px < ex; px++) {
                const x = (px + 0.5 - this.ox) / U, y = (py + 0.5 - this.oy) / U, dist = f(x, y), cover = clamp(0.5 - dist * U);
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
        }
        return this;
    }
    /** The house style. col is a base colour; o: { ink, shade, dark, light, hi, dots, sx, sy, grad } */
    toon(f, col, o = {}) {
        const base = hex(col), dark = hex(o.dark ?? mix(base, [70, 20, 90], 0.42)), lightC = o.light === false ? null : hex(o.light ?? mix(base, [255, 255, 255], 0.5));
        const ink = o.ink ?? 2, inkC = hex(o.inkColor ?? INK), sw = o.shade ?? 7, sx = (o.sx ?? 0.55) * sw, sy = (o.sy ?? 0.83) * sw, band = o.band ?? 5, dot = o.dots ?? 3.4, hi = o.hi ?? 2.4;
        return this.fill(f, (x, y, d, c) => {
            if (d > -ink) { c[0] = inkC[0]; c[1] = inkC[1]; c[2] = inkC[2]; return; }
            const q = f(x + sx, y + sy); let k = 0;
            if (q > 0) k = 1;
            else if (q > -band) {
                // Halftone: dots on a 45 degree grid, growing as the surface turns from the light.
                const u = (x + y) / dot, v = (x - y) / dot, cu = u - Math.round(u), cv = v - Math.round(v), r = (q + band) / band * 0.62;
                if (cu * cu + cv * cv < r * r) k = 1;
            }
            let R = base[0], G = base[1], B = base[2];
            if (k) { R = dark[0]; G = dark[1]; B = dark[2]; }
            else if (lightC && hi > 0 && f(x - sx * 0.34, y - sy * 0.34) > -ink * 0.2) { R = lightC[0]; G = lightC[1]; B = lightC[2]; }
            c[0] = R; c[1] = G; c[2] = B;
        });
    }
    flat(f, col, alpha = 1) { const c0 = hex(col); return this.fill(f, (x, y, d, c) => { c[0] = c0[0]; c[1] = c0[1]; c[2] = c0[2]; c[3] = alpha; }); }
    /** Ink only: a drawn line. */
    stroke(f, w = 1.4, col = INK, alpha = 1) { const c0 = hex(col); return this.fill((x, y) => Math.abs(f(x, y)) - w / 2, (x, y, d, c) => { c[0] = c0[0]; c[1] = c0[1]; c[2] = c0[2]; c[3] = alpha; }); }
    /** Flat shape with an ink line and no shading, for small details. */
    decal(f, col, ink = 1.4) { const c0 = hex(col), i = INK; return this.fill(f, (x, y, d, c) => { const v = d > -ink ? i : c0; c[0] = v[0]; c[1] = v[1]; c[2] = v[2]; }); }
    /** Halftone wash, for background shading. */
    dots(f, col, size = 5, amt = 0.5, grad = null) { const c0 = hex(col); return this.fill(f, (x, y, d, c) => { const u = (x + y) / size, v = (x - y) / size, cu = u - Math.round(u), cv = v - Math.round(v), r = amt * (grad ? grad(x, y) : 1); c[0] = c0[0]; c[1] = c0[1]; c[2] = c0[2]; c[3] = cu * cu + cv * cv < r * r ? 1 : 0; }); }
}

/** Shelf packer over one big painted sheet. */
export class Sheet {
    constructor(p, size, U, tall = size) { this.b = new Brush(p, U); this.U = U; this.size = size; this.tall = tall; this.x = 2; this.y = 2; this.row = 0; this.parts = {}; }
    /** Paint a part w x h world units with its origin at (ox, oy) inside that box. */
    part(name, w, h, ox, oy, paint) {
        const U = this.U, pw = Math.ceil(w * U), ph = Math.ceil(h * U);
        if (this.x + pw > this.size - 2) { this.x = 2; this.y += this.row + 4; this.row = 0; }
        if (this.y + ph > this.tall - 2) throw new Error(`Sheet full at ${name}`);
        this.b.region(this.x, this.y, pw, ph, ox * U, oy * U);
        paint(this.b);
        this.parts[name] = { crop: [this.x, this.y, pw, ph], w, h, ox, oy, cx: w / 2 - ox, cy: h / 2 - oy };
        this.x += pw + 4; this.row = Math.max(this.row, ph);
        return this;
    }
}
