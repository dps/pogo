// Painter's kit on raw RGBA buffers: soft shapes, bevels and cast shadows, so all art shares one light from the top left.
import { Pixmap, color } from "./pogo.js";

const hex = (c) => { const k = color(c); return [k.r * 255, k.g * 255, k.b * 255, k.a]; };
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); const h = (v) => Math.round(v).toString(16).padStart(2, "0"); return `#${h(A[0] + (B[0] - A[0]) * t)}${h(A[1] + (B[1] - A[1]) * t)}${h(A[2] + (B[2] - A[2]) * t)}`; };

// Tileable value noise shared by everything.
const NS = 256; export const NOISE = new Float32Array(NS * NS);
{
    let s = 12345; const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    for (const [cell, amp] of [[64, 0.5], [32, 0.25], [16, 0.14], [8, 0.07], [4, 0.04]]) {
        const n = NS / cell, g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = r();
        for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
            const fx = (x % cell) / cell, fy = (y % cell) / cell, ix = (x / cell | 0) % n, iy = (y / cell | 0) % n, jx = (ix + 1) % n, jy = (iy + 1) % n;
            const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
            NOISE[x + y * NS] += amp * ((g[ix + iy * n] * (1 - u) + g[jx + iy * n] * u) * (1 - v) + (g[ix + jy * n] * (1 - u) + g[jx + jy * n] * u) * v);
        }
    }
}
export const noise = (x, y) => NOISE[(x & 255) + (y & 255) * NS];
/** Bilinear noise, for slow gradients that would show the grid otherwise. */
export const snoise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy, a = NOISE[(ix & 255) + (iy & 255) * NS], b = NOISE[((ix + 1) & 255) + (iy & 255) * NS], c = NOISE[(ix & 255) + ((iy + 1) & 255) * NS], d = NOISE[((ix + 1) & 255) + ((iy + 1) & 255) * NS]; return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; };

/** A sheet of painted sprites packed into one texture, so a swarm is a single draw call. */
export class Atlas {
    constructor(name, w, h) { this.name = name; this.w = w; this.h = h; this.queue = []; this.map = {}; }
    add(name, w, h, fn, o = {}) { this.queue.push({ name, w, h, fn, o }); }
    /** Paint everything, tallest first so the shelves pack tight, then hand the sheet to Pogo. */
    bake(assets) {
        const data = new Uint8Array(this.w * this.h * 4); let cx = 2, cy = 2, row = 0;
        this.queue.sort((a, b) => b.h - a.h || b.w - a.w);
        for (const { name, w, h, fn, o } of this.queue) {
            const buf = new Uint8Array(w * h * 4), p = new Pixmap(w, h, buf, w, 0);
            fn(p);
            if (cx + w + 3 > this.w) { cx = 2; cy += row + 3; row = 0; }
            if (cy + h + 3 > this.h) throw new Error(`atlas ${this.name} full at ${name}`);
            for (let r = 0; r < h; r++) data.set(buf.subarray(r * w * 4, (r + 1) * w * 4), (cx + (cy + r) * this.w) * 4);
            this.map[name] = { x: cx, y: cy, w, h, u0: cx / this.w, v0: cy / this.h, u1: (cx + w) / this.w, v1: (cy + h) / this.h, ...o };
            cx += w + 3; row = Math.max(row, h);
        }
        this.used = cy + row + 3;
        assets.paint(this.name, this.w, this.h, (p) => { p.data.set(data); }, { smooth: true, mipmaps: true });
    }
}

/** Filled ellipse with rotation, lit along the light direction when given two colours. */
export function oval(p, cx, cy, rx, ry, rot, c, c2) {
    const d = p.data, W = p.width, H = p.height, cs = Math.cos(rot), sn = Math.sin(rot), m = Math.max(rx, ry) + 2;
    const a = hex(c), b = c2 ? hex(c2) : a;
    for (let y = Math.max(0, cy - m | 0); y < Math.min(H, cy + m + 1); y++) for (let x = Math.max(0, cx - m | 0); x < Math.min(W, cx + m + 1); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry, r = Math.hypot(u, v);
        const edge = (1 - r) * Math.min(rx, ry) + 0.5; if (edge <= 0) continue;
        const cov = Math.min(1, edge), t = Math.max(0, Math.min(1, ((dx + dy) / (m * 1.5)) * 0.5 + 0.5));
        put(d, (x + y * W) * 4, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] + (b[3] - a[3]) * t) * cov);
    }
    return p;
}
export function put(d, o, r, g, b, al) {
    const da = d[o + 3] / 255, out = al + da * (1 - al); if (out <= 0) return;
    const k = al / out; d[o] = d[o] * (1 - k) + r * k; d[o + 1] = d[o + 1] * (1 - k) + g * k; d[o + 2] = d[o + 2] * (1 - k) + b * k; d[o + 3] = out * 255;
}
/** Soft radial blob: glows, stains and ambient occlusion. */
export function glow(p, cx, cy, r, c, power = 2, ry) {
    const d = p.data, W = p.width, H = p.height, k = hex(c), R = ry ?? r;
    for (let y = Math.max(0, cy - R | 0); y < Math.min(H, cy + R + 1); y++) for (let x = Math.max(0, cx - r | 0); x < Math.min(W, cx + r + 1); x++) {
        const q = Math.hypot((x + 0.5 - cx) / r, (y + 0.5 - cy) / R); if (q >= 1) continue;
        put(d, (x + y * W) * 4, k[0], k[1], k[2], k[3] * Math.pow(1 - q, power));
    }
    return p;
}
/** Only paint where something's already painted. */
export function inside(p, fn) {
    const d = p.data, n = d.length / 4, a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = d[i * 4 + 3];
    fn(p); for (let i = 0; i < n; i++) if (d[i * 4 + 3] > a[i]) d[i * 4 + 3] = a[i];
    return p;
}
function blurAlpha(d, W, H, r) {
    let a = new Float32Array(W * H), b = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
    for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[Math.max(0, Math.min(W - 1, x)) + y * W]; for (let x = 0; x < W; x++) { b[x + y * W] = s / (2 * r + 1); s += a[Math.min(W - 1, x + r + 1) + y * W] - a[Math.max(0, x - r) + y * W]; } }
        for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[x + Math.max(0, Math.min(H - 1, y)) * W]; for (let y = 0; y < H; y++) { a[x + y * W] = s / (2 * r + 1); s += b[x + Math.min(H - 1, y + r + 1) * W] - b[x + Math.max(0, y - r) * W]; } }
    }
    return a;
}
/** Rounds everything painted so far into a lit, puffy form. The main reason this art doesn't look flat. */
export function bevel(p, r = 4, light = 0.55, dark = 0.5) {
    const d = p.data, W = p.width, H = p.height, a = blurAlpha(d, W, H, r);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const o = (x + y * W) * 4; if (!d[o + 3]) continue;
        const gx = a[x + 1 + y * W] - a[x - 1 + y * W], gy = a[x + (y + 1) * W] - a[x + (y - 1) * W], s = (gx + gy) * r * 1.6;
        if (s > 0) { const k = Math.min(1, s) * light; d[o] += (255 - d[o]) * k; d[o + 1] += (250 - d[o + 1]) * k; d[o + 2] += (225 - d[o + 2]) * k; }
        else { const k = Math.min(1, -s) * dark; d[o] *= 1 - k; d[o + 1] *= 1 - k * 1.05; d[o + 2] *= 1 - k * 0.8; }
    }
    return p;
}
/** A soft shadow cast to the bottom right, under what's painted. Leave margin for it. */
export function castShadow(p, dx = 10, dy = 13, blur = 5, alpha = 0.42, tint = [24, 16, 34]) {
    const d = p.data, W = p.width, H = p.height, a = blurAlpha(d, W, H, blur);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const sx = x - dx, sy = y - dy; if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
        const s = a[sx + sy * W] * alpha; if (s <= 0.003) continue;
        const o = (x + y * W) * 4, da = d[o + 3] / 255, out = da + s * (1 - da), k = da / out;
        d[o] = tint[0] * (1 - k) + d[o] * k; d[o + 1] = tint[1] * (1 - k) + d[o + 1] * k; d[o + 2] = tint[2] * (1 - k) + d[o + 2] * k; d[o + 3] = out * 255;
    }
    return p;
}
/** Multiply in value noise, for bread pores, stone, cloth. */
export function grain(p, amount = 0.2, scale = 3, seed = 0) {
    const d = p.data, W = p.width, H = p.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = (x + y * W) * 4; if (!d[o + 3]) continue; const n = 1 + (noise(x * scale + seed, y * scale + seed * 3) - 0.5) * amount * 2; d[o] = Math.min(255, d[o] * n); d[o + 1] = Math.min(255, d[o + 1] * n); d[o + 2] = Math.min(255, d[o + 2] * n); }
    return p;
}
export const rot2 = (pts, cx, cy, a, sx = 1, sy = sx) => pts.map(([x, y]) => [cx + Math.cos(a) * x * sx - Math.sin(a) * y * sy, cy + Math.sin(a) * x * sx + Math.cos(a) * y * sy]);
/** Thick stroke through points with round joints. */
export function stroke(p, pts, c, w) { for (let i = 1; i < pts.length; i++) p.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c, w); return p; }
export function gloss(p, cx, cy, rx, ry, rot = -0.7, a = 0.8) { return oval(p, cx, cy, rx, ry, rot, [1, 1, 1, a]); }
