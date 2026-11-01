// A small pixel painter: no anti-aliasing, hue-shifted ramps and ordered dither, which is where the "painted pixel" look comes from.
// Everything lands in one atlas so the whole world batches into a few draw calls.

export const hex = (h) => {
    const n = parseInt(h.slice(1), 16);
    return h.length > 7 ? [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};
export const ramp = (...cols) => cols.map(hex);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

/** Deterministic value noise, for ground texture and paint strokes. */
export function noiser(seed) {
    const h = (x, y) => { let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const sm = (t) => t * t * (3 - 2 * t);
    const v = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), a = sm(x - xi), b = sm(y - yi); const t = h(xi, yi) * (1 - a) + h(xi + 1, yi) * a, u = h(xi, yi + 1) * (1 - a) + h(xi + 1, yi + 1) * a; return t * (1 - b) + u * b; };
    v.fbm = (x, y) => v(x, y) * 0.55 + v(x * 2.1 + 9, y * 2.1 + 4) * 0.3 + v(x * 4.3 + 3, y * 4.3 + 7) * 0.15;
    v.rand = h;
    return v;
}

export class Px {
    constructor(w, h, data, stride, ox = 0, oy = 0) {
        this.w = w; this.h = h; this.d = data ?? new Uint8Array(w * h * 4); this.stride = stride ?? w; this.ox = ox; this.oy = oy;
    }
    i(x, y) { return ((y + this.oy) * this.stride + x + this.ox) * 4; }
    /** Set a pixel. Alpha blends over what's there, so paint can be glazed. */
    set(x, y, c) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
        const o = this.i(x, y), d = this.d, a = c[3] ?? 255;
        if (a >= 255) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; return this; }
        const f = a / 255, ba = d[o + 3] / 255, out = f + ba * (1 - f);
        if (out <= 0) return this;
        d[o] = (c[0] * f + d[o] * ba * (1 - f)) / out; d[o + 1] = (c[1] * f + d[o + 1] * ba * (1 - f)) / out; d[o + 2] = (c[2] * f + d[o + 2] * ba * (1 - f)) / out; d[o + 3] = out * 255;
        return this;
    }
    has(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[this.i(x, y) + 3] > 30; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
    /** A value from 0 to 1 picked off a ramp, dithered between neighbouring colours. */
    tone(x, y, t, r, strength = 1) {
        const n = r.length - 1, v = Math.max(0, Math.min(1, t || 0)) * n, lo = Math.floor(v), f = v - lo;
        return this.set(x, y, r[Math.min(n, lo + (f * strength + (1 - strength) * 0.5 > bayer(x, y) ? 1 : 0))]);
    }
    /** Round form lit from the upper left. */
    blob(cx, cy, rx, ry, r, o = {}) {
        const lx = o.lx ?? -0.55, ly = o.ly ?? -0.65, gain = o.gain ?? 1, base = o.base ?? 0.5, top = o.top ?? 0;
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, q = dx * dx + dy * dy;
            if (q > 1) continue;
            const nz = Math.sqrt(1 - q), lit = dx * lx + dy * ly + nz * 0.55;
            this.tone(x, y, base + (lit - 0.45) * 0.72 * gain + top * (-dy), r);
        }
        return this;
    }
    line(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
        for (let i = 0; i < 2000; i++) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e = 2 * err; if (e >= dy) { err += dy; x0 += sx; } if (e <= dx) { err += dx; y0 += sy; } }
        return this;
    }
    /** A leaf or blade: a lens along a direction, light on one side and dark on the other. */
    leaf(x, y, ang, len, wide, r, o = {}) {
        const cx = Math.cos(ang), sx = Math.sin(ang), bend = o.bend ?? 0, pts = Math.ceil(len * 2.2);
        for (let k = 0; k <= pts; k++) {
            const t = k / pts, w = wide * Math.sin(Math.PI * Math.pow(t, o.pow ?? 0.8)), a = ang + bend * t;
            const px = x + cx * t * len + Math.cos(a + 1.57) * bend * t * t * len * 0.4, py = y + sx * t * len + Math.sin(a + 1.57) * bend * t * t * len * 0.4;
            for (let q = -w; q <= w; q += 0.5) {
                const qx = px + Math.cos(a + 1.57) * q, qy = py + Math.sin(a + 1.57) * q;
                const side = (q / (w || 1)) * (Math.cos(a + 1.57) * -0.5 + Math.sin(a + 1.57) * -0.8);
                this.tone(Math.round(qx), Math.round(qy), 0.48 + side * 0.34 + t * 0.14, r);
            }
        }
        return this;
    }
    /** One-pixel outline around what's painted. */
    outline(c) {
        const hit = [];
        for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.has(x, y) && (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1))) hit.push(x, y);
        for (let i = 0; i < hit.length; i += 2) this.set(hit[i], hit[i + 1], c);
        return this;
    }
    /** Copy another pixmap on top. */
    stamp(src, x = 0, y = 0, o = {}) {
        for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
            const k = src.i(i, j), a = src.d[k + 3];
            if (a) this.set(o.flip ? x + src.w - 1 - i : x + i, y + j, [src.d[k], src.d[k + 1], src.d[k + 2], a * (o.alpha ?? 1)]);
        }
        return this;
    }
    /** Keep the shape but flatten it to one colour: used to make shadows and glow masks. */
    tint(c) {
        for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const o = this.i(x, y); if (this.d[o + 3]) { this.d[o] = c[0]; this.d[o + 1] = c[1]; this.d[o + 2] = c[2]; } }
        return this;
    }
}

/** Packs many little pixmaps into one texture. Shelf packing is plenty: everything is known at startup. */
export class Atlas {
    constructor(size) { this.size = size; this.data = new Uint8Array(size * size * 4); this.x = 1; this.y = 1; this.rowH = 0; this.map = new Map(); }
    add(name, w, h, fn) {
        if (this.x + w + 1 > this.size) { this.x = 1; this.y += this.rowH + 1; this.rowH = 0; }
        if (this.y + h + 1 > this.size) throw new Error(`atlas full at ${name}`);
        const px = new Px(w, h, this.data, this.size, this.x, this.y);
        fn(px);
        this.map.set(name, [this.x, this.y, w, h]);
        this.x += w + 1; this.rowH = Math.max(this.rowH, h);
        return px;
    }
    has(name) { return this.map.has(name); }
}
