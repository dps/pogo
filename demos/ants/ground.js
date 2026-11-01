// Paints a map's ground into one big texture: lawn, gingham blanket, patio, soil and spills, all lit from the top left.
import { NOISE, noise, snoise } from "./paint.js";

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177 | 0; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };

export function groundScale(map) { return Math.min(1.25, 2300 / Math.max(map.w, map.h), Math.sqrt(3.4e6 / (map.w * map.h))); }

export function bakeGround(assets, name, map) {
    const k = groundScale(map), W = Math.ceil(map.w * k), H = Math.ceil(map.h * k), W4 = W * 4;
    assets.paint(name, W, H, (p) => {
        const d = p.data, mask = new Uint8Array(W * H);   // 0 lawn, 1 blanket, 2 patio, 3 soil, 4 liquid
        const px = (o, r, g, b) => { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; };
        // Lawn or base first.
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const wx = x / k, wy = y / k, n = snoise(wx * 0.35, wy * 0.35), m = snoise(wx * 1.3, wy * 1.3), f = NOISE[((wx * 5) & 255) + ((wy * 5) & 255) * 256];
            const t = clamp01((n - 0.32) * 2.4) * 0.7 + m * 0.3, v = 0.82 + f * 0.36;
            px((x + y * W) * 4, (54 + t * 62) * v, (112 + t * 66) * v, (46 + t * 26) * v);
        }
        const inBox = (cx, cy, hw, hh, rot, fn) => {
            const c = Math.cos(rot), s = Math.sin(rot), m = Math.hypot(hw, hh) + 40;
            const x0 = Math.max(0, (cx - m) * k | 0), x1 = Math.min(W - 1, (cx + m) * k | 0), y0 = Math.max(0, (cy - m) * k | 0), y1 = Math.min(H - 1, (cy + m) * k | 0);
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x / k - cx, dy = y / k - cy; fn((dx * c + dy * s), (-dx * s + dy * c), (x + y * W) * 4, x, y); }
        };
        for (const sh of map.shapes) {
            if (sh.t === "soil") {
                inBox(sh.x, sh.y, sh.rx, sh.ry, sh.rot ?? 0, (u, v, o, x, y) => {
                    const e = Math.hypot(u / sh.rx, v / sh.ry) + (noise(x * 0.5 | 0, y * 0.5 | 0) - 0.5) * 0.4, a = 1 - smooth(0.78, 1.02, e); if (a <= 0) return;
                    const n = snoise(x * 0.5, y * 0.5), f = noise(x * 7, y * 5), v0 = 0.72 + n * 0.5 + (f - 0.5) * 0.3;
                    d[o] += (138 * v0 - d[o]) * a; d[o + 1] += (98 * v0 - d[o + 1]) * a; d[o + 2] += (62 * v0 - d[o + 2]) * a; if (a > 0.4) mask[x + y * W] = 3;
                });
            } else if (sh.t === "blanket") {
                const hw = sh.w / 2, hh = sh.h / 2, sq = 56;
                inBox(sh.x, sh.y, hw + 34, hh + 34, sh.rot ?? 0, (u, v, o, x, y) => {
                    const ax = Math.abs(u), ay = Math.abs(v), out = Math.max(ax - hw, ay - hh);
                    if (out > 0) { const s = (1 - smooth(0, 30, out + (u + v > 0 ? -8 : 10))) * 0.5; d[o] *= 1 - s; d[o + 1] *= 1 - s; d[o + 2] *= 1 - s * 0.8; return; }
                    mask[x + y * W] = 1;
                    // Folds: the cloth rucks over the lumpy ground, lit from the top left.
                    const nx = (u + 400) * 0.16, ny = (v + 400) * 0.16, a = snoise(nx, ny), b = snoise(nx + 3, ny + 3), fold = 1 + (a - b) * 2.2 + (a - 0.5) * 0.2;
                    const c1 = ((u + 4000) / sq | 0) & 1, c2 = ((v + 4000) / sq | 0) & 1, both = c1 + c2;
                    const weave = 0.965 + 0.07 * ((Math.floor(u * 1.2) & 1) ^ (Math.floor(v * 1.2) & 1));
                    const R = both === 2 ? 62 : both === 1 ? 142 : 236, G = both === 2 ? 122 : both === 1 ? 180 : 226, B = both === 2 ? 150 : both === 1 ? 184 : 204;
                    const edge = -out < 10 ? 0.78 + 0.22 * ((Math.floor((u + v) * 0.6) & 3) > 0 ? 1 : 0) : 1, m = fold * weave * edge;
                    d[o] = Math.min(255, R * m); d[o + 1] = Math.min(255, G * m); d[o + 2] = Math.min(255, B * m);
                });
            } else if (sh.t === "patio") {
                const hw = sh.w / 2, hh = sh.h / 2, sw = 170, sh2 = 120;
                inBox(sh.x, sh.y, hw + 20, hh + 20, sh.rot ?? 0, (u, v, o, x, y) => {
                    const out = Math.max(Math.abs(u) - hw, Math.abs(v) - hh);
                    if (out > 0) { const s = (1 - smooth(0, 20, out)) * 0.35; d[o] *= 1 - s; d[o + 1] *= 1 - s; d[o + 2] *= 1 - s; return; }
                    const row = Math.floor((v + 4000) / sh2), uu = u + 4000 + (row & 1) * sw * 0.5, col = Math.floor(uu / sw), lx = uu - col * sw, ly = v + 4000 - row * sh2;
                    const edge = Math.min(lx, sw - lx, ly, sh2 - ly), tint = hash(col, row), n = snoise(x * 0.6, y * 0.6), f = noise(x * 9, y * 8);
                    mask[x + y * W] = 2;
                    if (edge < 4 + n * 2) { const moss = noise(x, y) > 0.48; d[o] = moss ? 66 : 58; d[o + 1] = moss ? 92 : 50; d[o + 2] = moss ? 48 : 44; return; }
                    const v0 = (0.86 + tint * 0.2) * (0.86 + n * 0.3 + (f - 0.5) * 0.24), bev = smooth(0, 7, edge - 4), lit = bev < 1 ? (lx + ly < sw * 0.5 + sh2 * 0.5 ? 1 + (1 - bev) * 0.2 : 1 - (1 - bev) * 0.2) : 1;
                    d[o] = 196 * v0 * lit; d[o + 1] = 180 * v0 * lit; d[o + 2] = (150 + tint * 18) * v0 * lit;
                });
            }
        }
        // Grass blades and speckle stamped on top give the lawn its scale.
        const lineAt = (x, y, dx, dy, n, r, g, b, a) => { for (let i = 0; i < n; i++) { const X = x + dx * i | 0, Y = y + dy * i | 0; if (X < 0 || Y < 0 || X >= W || Y >= H) return; const o = (X + Y * W) * 4; d[o] += (r - d[o]) * a; d[o + 1] += (g - d[o + 1]) * a; d[o + 2] += (b - d[o + 2]) * a; } };
        const blades = (W * H / 34) | 0; let s = 77;
        const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
        for (let i = 0; i < blades; i++) {
            const x = rnd() * W | 0, y = rnd() * H | 0, m = mask[x + y * W]; if (m) { if (m === 3 && rnd() < 0.06) { const c = 90 + rnd() * 70; const r = 1 + rnd() * 3 * k; for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r) { const X = x + a | 0, Y = y + b | 0; if (X >= 0 && Y >= 0 && X < W && Y < H) { const o = (X + Y * W) * 4, l = a + b < 0 ? 1.2 : 0.8; d[o] = c * l; d[o + 1] = c * 0.86 * l; d[o + 2] = c * 0.66 * l; } } } continue; }
            const a = 2.2 + (noise(x >> 2, y >> 2) - 0.5) * 3 + rnd() * 0.8, len = (5 + rnd() * 9) * k, t = rnd(), bright = noise(x, y) > 0.5;
            lineAt(x, y, Math.cos(a), Math.sin(a), len, bright ? 118 + t * 60 : 30 + t * 30, bright ? 170 + t * 50 : 74 + t * 40, bright ? 62 + t * 30 : 34, 0.5);
        }
        // Liquids go last, over anything.
        for (const sh of map.shapes) {
            if (sh.t !== "soda" && sh.t !== "water") continue;
            const soda = sh.t === "soda", c0 = soda ? [122, 58, 22] : [64, 142, 190], c1 = soda ? [214, 128, 44] : [146, 214, 240];
            inBox(sh.x, sh.y, sh.rx, sh.ry, sh.rot ?? 0, (u, v, o, x, y) => {
                const wob = (noise(x * 0.6 | 0, y * 0.6 | 0) - 0.5) * 0.3, e = Math.hypot(u / sh.rx, v / sh.ry) + wob;
                if (e > 1.06) return; if (e > 0.98) { const a = (1.06 - e) / 0.08 * 0.45; d[o] *= 1 - a; d[o + 1] *= 1 - a; d[o + 2] *= 1 - a; return; }
                mask[x + y * W] = 4;
                const depth = smooth(0.98, 0.72, e), n = noise(x + 40, y * 1.5 + 8), rim = 1 - smooth(0.9, 0.98, e), r = c1[0] + (c0[0] - c1[0]) * depth, g = c1[1] + (c0[1] - c1[1]) * depth, b = c1[2] + (c0[2] - c1[2]) * depth;
                const spec = smooth(0.6, 0.78, noise(x * 0.5 + 90, y * 0.5)) * 0.12 + smooth(0.91, 0.975, e) * ((u + v * 1.4) < 0 ? 0.62 : 0.05);
                d[o] = Math.min(255, r * (0.9 + n * 0.2) * (0.55 + rim * 0.45) + 255 * spec); d[o + 1] = Math.min(255, g * (0.9 + n * 0.2) * (0.55 + rim * 0.45) + 245 * spec); d[o + 2] = Math.min(255, b * (0.9 + n * 0.2) * (0.55 + rim * 0.45) + 220 * spec);
            });
            if (soda) for (let i = 0; i < (sh.rx * sh.ry / 900 | 0); i++) {
                const a = rnd() * 6.283, q = Math.sqrt(rnd()) * 0.86, X = (sh.x + Math.cos(a) * q * sh.rx) * k, Y = (sh.y + Math.sin(a) * q * sh.ry) * k, r = (1.5 + rnd() * 4) * k;
                for (let t = 0; t < 22; t++) { const b = t / 22 * 6.283, x = X + Math.cos(b) * r | 0, y = Y + Math.sin(b) * r | 0; if (x > 0 && y > 0 && x < W && y < H) { const o = (x + y * W) * 4; d[o] += (255 - d[o]) * 0.5; d[o + 1] += (226 - d[o + 1]) * 0.5; d[o + 2] += (170 - d[o + 2]) * 0.5; } }
            }
        }
        // Dappled shade from the great oak nobody has ever seen the top of.
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const wx = x / k, wy = y / k, n = snoise(wx * 0.22 + 31, wy * 0.22 + 91), l = 0.8 + smooth(0.38, 0.56, n) * 0.34, o = (x + y * W) * 4;
            d[o] = Math.min(255, d[o] * l); d[o + 1] = Math.min(255, d[o + 1] * l); d[o + 2] = Math.min(255, d[o + 2] * (l * 0.9 + 0.1));
        }
    }, { smooth: true, mipmaps: true });
    return { width: map.w, height: map.h };
}
