// Painted textures: wood, the inlaid board, the room, soft lights, portraits and UI icons. All written straight to RGBA bytes.
import { BOARD } from "./meshes.js";

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// Tiling value noise, one table for everything.
const N = 256, table = new Float32Array(N * N);
{
    let s = 12345;
    const r = () => { s = Math.imul(s ^ s >>> 13, 0x5bd1e995) + 0x3c6ef372 | 0; return ((s ^ s >>> 15) >>> 0) / 4294967296; };
    for (let i = 0; i < table.length; i++) table[i] = r();
}
function noise(x, y) {
    const fx = Math.floor(x), fy = Math.floor(y), tx = x - fx, ty = y - fy;
    const x0 = fx & 255, x1 = (fx + 1) & 255, y0 = fy & 255, y1 = (fy + 1) & 255;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = table[x0 + y0 * N], b = table[x1 + y0 * N], c = table[x0 + y1 * N], d = table[x1 + y1 * N];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1 + 9, y * 2.1 + 3) * 0.3 + noise(x * 4.3 + 5, y * 4.3 + 7) * 0.15;

/** Grain runs along v. Returns 0 (dark late wood) to 1 (pale early wood). */
function grain(u, v, scale = 1) {
    const warp = fbm(u * 0.7 * scale, v * 0.1 * scale) * 2.6;
    const rings = Math.sin((u * scale + warp) * 7.5) * 0.5 + 0.5;
    const fine = noise(u * 46 * scale, v * 2.2 * scale);
    const pores = noise(u * 130 * scale, v * 7 * scale);
    return clamp01(rings * rings * 0.52 + fine * 0.42 + (pores > 0.8 ? -0.14 : 0.03));
}

const px = (d, i, c, a = 255) => { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = a; };

// Simple stroked figures for the frame's coordinates, on a 4x6 grid.
const GLYPHS = {
    a: [[[0, 6], [2, 0], [4, 6]], [[0.8, 4], [3.2, 4]]],
    b: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[3, 3], [3.6, 2], [3.6, 1], [3, 0], [0, 0]]],
    c: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
    d: [[[0, 0], [0, 6], [2.6, 6], [4, 4.6], [4, 1.4], [2.6, 0], [0, 0]]],
    e: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
    f: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
    g: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.4], [2.4, 3.4]]],
    h: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
    1: [[[0.8, 1.4], [2, 0], [2, 6]], [[0.6, 6], [3.4, 6]]],
    2: [[[0, 1.2], [1, 0], [3, 0], [4, 1.2], [4, 2.2], [0, 6], [4, 6]]],
    3: [[[0, 0.8], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1.6, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5.2]]],
    4: [[[3, 6], [3, 0], [0, 4.2], [4, 4.2]]],
    5: [[[4, 0], [0.6, 0], [0.3, 2.6], [3, 2.6], [4, 3.6], [4, 5], [3, 6], [1, 6], [0, 5.2]]],
    6: [[[3.8, 0.6], [3, 0], [1, 0], [0, 1.2], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3.8], [3, 2.9], [1, 2.9], [0, 3.8]]],
    7: [[[0, 0], [4, 0], [1.4, 6]]],
    8: [[[1, 3], [0.2, 2], [0.2, 1], [1, 0], [3, 0], [3.8, 1], [3.8, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
};

function paintBoard(p, S) {
    const d = p.data, span = BOARD.outer * 2, unit = S / span;
    const light0 = [152, 104, 58], light1 = [240, 203, 145], dark0 = [38, 19, 11], dark1 = [118, 70, 40];
    const frame0 = [34, 13, 9], frame1 = [116, 54, 32];
    const brass = [214, 168, 86];
    const H = BOARD.half;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const wx = (x + 0.5) / unit - BOARD.outer, wz = (y + 0.5) / unit - BOARD.outer, ax = Math.abs(wx), az = Math.abs(wz), i = (x + y * S) * 4;
        if (ax < H && az < H) {
            const f = Math.floor(wx + H), r = Math.floor(wz + H), isLight = (f + r) % 2 === 0, id = f * 8 + r;
            const tx = wx + H - f, tz = wz + H - r;
            const along = (f + r) % 4 < 2;
            const u = (along ? tx : tz) + id * 3.7, v = (along ? tz : tx) + id * 1.9;
            const g = grain(u * (isLight ? 0.9 : 0.8), v * 0.8, 1);
            const tint = 0.93 + noise(id * 7.3, 2.1) * 0.15;
            const c = isLight ? mix3(light0, light1, 0.32 + g * 0.68) : mix3(dark0, dark1, g);
            // A hairline where the veneers meet.
            const edge = Math.min(tx, 1 - tx, tz, 1 - tz), seam = 0.55 + 0.45 * smooth(0.002, 0.012, edge);
            px(d, i, [c[0] * tint * seam, c[1] * tint * seam, c[2] * tint * seam]);
        } else {
            // Rosewood frame, mitred at the corners.
            const across = ax > az, u = across ? wx : wz, v = across ? wz : wx;
            const g = grain(u * 1.1 + (across ? 11 : 3), v * 0.42, 1);
            let c = mix3(frame0, frame1, g * g * 0.9 + 0.05);
            const m = Math.abs(ax - az);
            if (m < 0.014 && Math.max(ax, az) > H) c = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
            const edge = Math.max(ax, az);
            // Brass stringing on both sides of the frame, with a dark line beside it.
            const line = (at, w) => 1 - smooth(w, w + 0.008, Math.abs(edge - at));
            c = mix3(c, [12, 6, 4], line(H + 0.012, 0.012));
            c = mix3(c, brass, line(H + 0.048, 0.016));
            c = mix3(c, brass, line(BOARD.outer - 0.18, 0.01));
            // A small lozenge in each corner.
            const lz = Math.abs(ax - (BOARD.outer - 0.31)) + Math.abs(az - (BOARD.outer - 0.31));
            if (ax > H && az > H) {
                c = mix3(c, brass, 1 - smooth(0.085, 0.095, lz));
                c = mix3(c, [62, 26, 16], 1 - smooth(0.04, 0.05, lz));
            }
            px(d, i, c);
        }
    }
    // Coordinates, as brass inlay, drawn along both near edges.
    const glyph = (ch, wx, wz, flip) => {
        const size = 0.043 * unit, cx = (wx + BOARD.outer) * unit, cy = (wz + BOARD.outer) * unit, f = flip ? -1 : 1;
        for (const stroke of GLYPHS[ch]) for (let i = 0; i < stroke.length - 1; i++) {
            const [ax, ay] = stroke[i], [bx, by] = stroke[i + 1];
            p.line(cx + (ax - 2) * size * f, cy + (ay - 3) * size * f, cx + (bx - 2) * size * f, cy + (by - 3) * size * f, "#d6a856", 0.022 * unit);
        }
    };
    const rim = H + 0.27;
    for (let i = 0; i < 8; i++) {
        glyph("abcdefgh"[i], i - 3.5, rim, false);
        glyph("abcdefgh"[i], i - 3.5, -rim, true);
        glyph(String(i + 1), -rim, 3.5 - i, false);
        glyph(String(i + 1), rim, 3.5 - i, true);
    }
}

function paintTable(p, S) {
    const d = p.data, dark = [20, 11, 7], light = [104, 62, 36];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const plank = Math.floor(x / S * 7), tx = x / S * 7 - plank, id = plank * 13.7;
        const g = grain(tx * 1.6 + id, y / S * 5 + id, 1.3);
        const gap = smooth(0, 0.012, Math.min(tx, 1 - tx));
        const tint = 0.84 + noise(id, 4) * 0.32, c = mix3(dark, light, g * 0.86);
        px(d, (x + y * S) * 4, [c[0] * tint * gap, c[1] * tint * gap, c[2] * tint * gap]);
    }
}

function paintRoom(p, W, H) {
    const d = p.data;
    const glow = (u, v, cu, cv, ru, rv) => { let du = Math.abs(u - cu); if (du > 0.5) du = 1 - du; const q = (du * du) / (ru * ru) + (v - cv) * (v - cv) / (rv * rv); return Math.exp(-q); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, i = (x + y * W) * 4;
        // Panelled wall, warm near the fire.
        let n = fbm(u * 60, v * 12) * 0.5 + 0.5;
        const panel = Math.abs(((u * 18) % 1) - 0.5) < 0.47 ? 1 : 0.72;
        let c = [20 * n * panel + 7, 12 * n * panel + 4, 8 * n * panel + 3];
        // Bookshelves.
        const shelfU = (u * 5 + 0.2) % 1;
        if (shelfU > 0.08 && shelfU < 0.92 && v > 0.22 && v < 0.9) {
            const row = Math.floor(v * 13), rv = v * 13 - row;
            const bookId = Math.floor(u * 180 + row * 7.3), tone = noise(bookId * 3.1, row * 5.7);
            const tall = 0.2 + noise(bookId * 7.7, row) * 0.34;
            if (rv > tall && rv < 0.97) {
                const hue = noise(bookId * 1.7, row * 2.2);
                const b = hue < 0.33 ? [70, 28, 22] : hue < 0.66 ? [36, 42, 34] : [68, 48, 26];
                const s = 0.3 + tone * 0.66;
                c = [b[0] * s, b[1] * s, b[2] * s];
            } else c = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5];
        }
        // Fire behind and to the left of the board, a lamp further round, a cold window opposite.
        const fire = glow(u, v, 0.66, 0.78, 0.09, 0.2), lamp = glow(u, v, 0.86, 0.5, 0.05, 0.13), room = glow(u, v, 0.75, 0.6, 0.3, 0.5), moon = glow(u, v, 0.23, 0.46, 0.055, 0.14);
        const flick = 0.75 + 0.25 * fbm(u * 90, v * 30);
        c = [c[0] * (0.5 + room * 1.5) + fire * 215 * flick + lamp * 160 + moon * 26, c[1] * (0.5 + room * 1.3) + fire * 92 * flick + lamp * 92 + moon * 38, c[2] * (0.5 + room) + fire * 22 * flick + lamp * 40 + moon * 62];
        px(d, i, [Math.min(255, c[0]), Math.min(255, c[1]), Math.min(255, c[2])]);
    }
    // Out-of-focus lights.
    let s = 77;
    const r = () => { s = Math.imul(s, 1664525) + 1013904223 | 0; return (s >>> 8) / 16777216; };
    for (let n = 0; n < 46; n++) {
        const cx = (0.5 + r() * 0.5) * W, cy = (0.4 + r() * 0.5) * H, rad = 5 + r() * 15, warm = r(), a = 0.05 + r() * 0.13;
        const col = warm < 0.7 ? [255, 176, 92] : [255, 214, 150];
        for (let y = Math.floor(cy - rad); y <= cy + rad; y++) for (let x = Math.floor(cx - rad * 0.5); x <= cx + rad * 0.5; x++) {
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const q = Math.hypot((x - cx) * 2, y - cy) / rad;
            if (q > 1) continue;
            const t = a * (1 - smooth(0.82, 1, q)) * (0.7 + 0.5 * q), i = (x + y * W) * 4;
            for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] + col[k] * t);
        }
    }
}

function paintReflection(p, S) {
    const d = p.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const u = x / S, v = y / S;
        const lamp = Math.exp(-(((u - 0.33) ** 2 + (v - 0.3) ** 2) / 0.012));
        const wide = Math.exp(-(((u - 0.4) ** 2 + (v - 0.34) ** 2) / 0.09));
        const beams = 0.72 + 0.28 * smooth(0.3, 0.42, Math.abs(((u * 7) % 1) - 0.5) * 2);
        const fire = Math.exp(-(((u - 0.58) ** 2 + (v - 0.12) ** 2) / 0.03));
        const r = 16 + wide * 130 * beams + lamp * 150 + fire * 120, g = 10 + wide * 84 * beams + lamp * 112 + fire * 54, b = 7 + wide * 44 * beams + lamp * 66 + fire * 14;
        px(d, (x + y * S) * 4, [Math.min(255, r), Math.min(255, g), Math.min(255, b)]);
    }
}

/** White, with alpha shaped by fn(r) for r from 0 at the centre to 1 at the edge. */
function radial(p, S, fn) {
    const d = p.data, c = (S - 1) / 2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const r = Math.hypot(x - c, y - c) / c;
        px(d, (x + y * S) * 4, [255, 255, 255], Math.round(255 * clamp01(r >= 1 ? 0 : fn(r))));
    }
}

/** Light on black, fully opaque. Drawn in 3D with a tiny alpha and a huge color, which makes it add light. See glowColor in world.js. */
function light(p, S, fn) {
    const d = p.data, c = (S - 1) / 2;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const v = Math.round(255 * clamp01(fn(Math.hypot(x - c, y - c) / c, x - c, y - c)));
        px(d, (x + y * S) * 4, [v, v, v], 255);
    }
}

export function buildTextures(game) {
    const a = game.assets, smoothTex = { smooth: true };
    a.paint("boardTex", 1536, 1536, (p) => paintBoard(p, 1536), smoothTex);
    a.paint("tableTex", 768, 768, (p) => paintTable(p, 768), smoothTex);
    a.paint("roomTex", 1536, 512, (p) => paintRoom(p, 1536, 512), smoothTex);
    a.paint("reflectTex", 256, 256, (p) => paintReflection(p, 256), smoothTex);
    a.paint("feltTex", 512, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 512; x++) {
            const n = fbm(x * 0.35, y * 0.35) * 0.5 + noise(x * 1.4, y * 1.4) * 0.5, e = Math.min(x, 511 - x, (y + 0.5) * 3, (127.5 - y) * 3) / 26;
            const v = (0.62 + n * 0.5) * (0.42 + 0.58 * smooth(0, 1, e));
            px(d, (x + y * 512) * 4, [52 * v, 16 * v, 18 * v]);
        }
    }, smoothTex);
    a.paint("glow", 128, 128, (p) => light(p, 128, (r) => (r >= 1 ? 0 : Math.pow(1 - r, 1.8))), smoothTex);
    a.paint("ringGlow", 128, 128, (p) => light(p, 128, (r) => (r >= 1 ? 0 : Math.exp(-((r - 0.74) ** 2) / 0.016) * 0.95 + (1 - r) * 0.2)), smoothTex);
    a.paint("dotGlow", 128, 128, (p) => light(p, 128, (r) => (r >= 1 ? 0 : (1 - smooth(0.17, 0.25, r)) * 0.8 + Math.pow(1 - r, 1.25) * 0.42)), smoothTex);
    a.paint("squareGlow", 128, 128, (p) => light(p, 128, (r, x, y) => { const e = Math.max(Math.abs(x), Math.abs(y)) / 63.5; return (0.05 + 0.95 * Math.pow(smooth(0.5, 0.97, e), 2.2)) * (1 - smooth(0.985, 1, e)); }), smoothTex);
    a.paint("contact", 96, 96, (p) => radial(p, 96, (r) => Math.pow(1 - smooth(0.44, 1, r), 1.5) * 0.92), smoothTex);
    a.paint("mote", 32, 32, (p) => radial(p, 32, (r) => Math.pow(1 - r, 2)), smoothTex);
    a.paint("flame", 64, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 64; x++) {
            const v = y / 127, w = 0.34 * Math.sin(Math.PI * Math.pow(1 - v, 0.6)) + 0.02, q = Math.abs(x / 63 - 0.5) / w;
            const al = clamp01(1.2 - q) * smooth(0, 0.14, v);
            px(d, (x + y * 64) * 4, [255, lerp(240, 130, v * 0.4 + q * 0.5), lerp(190, 30, q)], Math.round(255 * clamp01(al * 1.4)));
        }
    }, smoothTex);
    a.paint("vignetteRed", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5);
            px(d, (x + y * 128) * 4, [255, 44, 16], Math.round(255 * smooth(0.72, 1.36, r)));
        }
    }, smoothTex);
    a.paint("vignette", 256, 256, (p) => {
        const d = p.data;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const r = Math.hypot((x - 127.5) / 127.5, (y - 127.5) / 127.5);
            px(d, (x + y * 256) * 4, [10, 5, 3], Math.round(255 * smooth(0.62, 1.4, r) * 0.9));
        }
    }, smoothTex);
}
