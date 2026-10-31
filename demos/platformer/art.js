// Every pixel in Puddle Pip is painted here, at startup, with no image files.
// Characters are stamped from text parts so all frames share one head and one palette; tiles and
// backgrounds are procedural but use hard edges and Bayer dithering, never anti-aliasing.

import { color } from "./pogo.js";

// --- Low-level pixel helpers ---------------------------------------------------------------------
const MEMO = new Map();
/** Pixmap.set parses a string colour with a regex on every pixel; this keeps startup fast. */
const cset = (p, x, y, c) => { let k = MEMO.get(c); if (!k) MEMO.set(c, k = color(c)); p.set(x, y, k); };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x, y, level) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < level;
const hash = (x, y) => { let h = Math.imul(x * 374761 + y * 668265, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1597334677); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const put = cset;
const fill = (p, x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cset(p, x + i, y + j, c); };
const clear = (p, x, y) => { if (x < 0 || y < 0 || x >= p.width || y >= p.height) return; const o = p.index(x, y); p.data[o] = p.data[o + 1] = p.data[o + 2] = p.data[o + 3] = 0; };
const alphaAt = (p, x, y) => (x < 0 || y < 0 || x >= p.width || y >= p.height ? 0 : p.data[p.index(x, y) + 3]);

function disc(p, cx, cy, rx, ry, c) {
    ry ??= rx;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) cset(p, x, y, c);
    }
}
/** 1px hard outline around painted pixels, per frame (Pixmap.outline copies the whole atlas every call). */
function ink(p, c = PAL.ink) {
    const hit = [];
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        if (alphaAt(p, x, y) > 40) continue;
        if (alphaAt(p, x - 1, y) > 40 || alphaAt(p, x + 1, y) > 40 || alphaAt(p, x, y - 1) > 40 || alphaAt(p, x, y + 1) > 40) hit.push(x, y);
    }
    for (let i = 0; i < hit.length; i += 2) cset(p, hit[i], hit[i + 1], c);
}
/** Stamp a text block. pal maps characters to hex colours; "." skips. */
function stamp(p, art, ox, oy, pal, flip = false) {
    const lines = art.trim().split("\n").map((l) => l.trim());
    const w = Math.max(...lines.map((l) => l.length));
    lines.forEach((line, y) => { for (let x = 0; x < line.length; x++) {
        const ch = line[x]; if (ch === "." || ch === " ") continue;
        const col = pal[ch]; if (!col) throw new Error(`stamp: no colour for "${ch}"`);
        cset(p, flip ? ox + w - 1 - x : ox + x, oy + y, col);
    } });
}
/** Union of discs shaded by height: the base of every bush, cloud and tree crown. */
function puff(p, blobs, cols, shadeY) {
    const h = p.height, w = p.width, mask = new Uint8Array(w * h);
    for (const [cx, cy, r, ry] of blobs) { const q = ry ?? r;
        for (let y = Math.max(0, Math.floor(cy - q)); y < Math.min(h, cy + q + 1); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, cx + r + 1); x++) {
            const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / q;
            if (dx * dx + dy * dy <= 1) mask[y * w + x] = 1;
        } }
    const n = cols.length;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        const up = (y > 0 && mask[(y - 1) * w + x]) ? 0 : 1;
        // Distance to the lit top-left edge picks the band, dithered between bands.
        let d = 0; while (d < 12 && y - d >= 0 && x - (d >> 1) >= 0 && mask[(y - d) * w + x - (d >> 1)]) d++;
        const t = (shadeY ? (y - shadeY[0]) / (shadeY[1] - shadeY[0]) : 0) * 0.65 + Math.min(1, d / 10) * 0.45;
        const v = Math.max(0, Math.min(n - 1.001, t * (n - 1)));
        const i = Math.floor(v), c = dither(x, y, v - i) ? cols[i + 1] : cols[i];
        cset(p, x, y, up && d < 2 ? cols[0] : c);
    }
}

// --- Palette -------------------------------------------------------------------------------------
export const PAL = {
    ink: "#2a1a3e", ink2: "#44285e", white: "#fff8ea", cream: "#ffe9b8", shadow: "#00000055",
    gold: "#ffcf3f", gold2: "#ffa928", gold3: "#d86a1e", gold4: "#fff29a", sun: "#fff08a",
    red: "#ec4a3f", red2: "#a92a48", pink: "#ff8fa8", teal: "#3ed6c4", teal2: "#1c8f9a", blue: "#4c9cf0", blue2: "#2b5fc2",
    green: "#6dd24c", green2: "#2d9a52", purple: "#9a5ae0", purple2: "#5d339e", wood: "#b9743c", wood2: "#7f4628", wood3: "#dca566",
    grey: "#a8a4c0", grey2: "#6e6a8c", rust: "#d4743a", rust2: "#8e4232", rust3: "#f6ad62",
};

export const THEMES = {
    meadow: { style: "grass", music: "meadow", sky: ["#3d93e6", "#7cc6f2", "#c3eef2", "#fdf5cf"], bg: "meadow",
        g: ["#e8f77a", "#a5e34f", "#62c944", "#2f9c4c"], d: ["#c58446", "#a7643a", "#e0a765", "#6b3a30", "#8a4f33"],
        brick: ["#e0894a", "#b65c35", "#ffc58a", "#6b3a30"], plank: ["#dca566", "#b9743c", "#7f4628"], plat: ["#f0d58a", "#c58446", "#6b3a30"],
        hard: ["#c7c2d8", "#8e89a8", "#efeaf8", "#4c4668"], rain: 0 },
    dusk: { style: "grass", music: "dusk", sky: ["#2b2566", "#7a3a8c", "#e8655e", "#ffc36a"], bg: "dusk",
        g: ["#ffd58a", "#f19a5e", "#c25a68", "#7d3468"], d: ["#7c4476", "#5d3366", "#a7638c", "#2f1c4a", "#4a2a5c"],
        brick: ["#b85a70", "#853c62", "#f09a8c", "#2f1c4a"], plank: ["#d48a6a", "#9a5560", "#5d3366"], plat: ["#f7c98a", "#b85a70", "#2f1c4a"],
        hard: ["#a79cc4", "#6f6496", "#d9cfee", "#2f1c4a"], rain: 1 },
    drain: { style: "rock", music: "drain", sky: ["#0d1030", "#141a44", "#1b2556", "#22306a"], bg: "cave",
        r: ["#47578f", "#34406f", "#6f85bd", "#1b2147", "#28315c"], moss: ["#7df2c4", "#35c49f", "#1f7f83"],
        brick: ["#5a6fb0", "#3d4b86", "#93aee0", "#1b2147"], plank: ["#9fb4d8", "#5f749f", "#2c3562"], plat: ["#a9f0e0", "#3aa6a8", "#123a5c"],
        hard: ["#8a97c0", "#5a6690", "#c2cdec", "#1b2147"], rain: 0 },
    keep: { style: "castle", music: "keep", sky: ["#0f0b2a", "#201845", "#3f2a66", "#6a4078"], bg: "keep",
        c: ["#6f6890", "#544e74", "#9a93b8", "#2a2445", "#3d3759"], cap: ["#c2bcd8", "#8e87ac"],
        brick: ["#8a5a7a", "#643f62", "#c08aa0", "#2a2445"], plank: ["#9a93b8", "#6f6890", "#2a2445"], plat: ["#ffd98a", "#8e87ac", "#2a2445"],
        hard: ["#9a93b8", "#6f6890", "#c9c3de", "#2a2445"], rain: 2 },
    hall: { style: "castle", music: "keep", sky: ["#190f2e", "#21133a", "#2b1942", "#35204c"], bg: "hall",
        c: ["#7a4a66", "#5a3454", "#a86e84", "#26142f", "#40243f"], cap: ["#e0a58a", "#a86e84"],
        brick: ["#a55a5a", "#783f50", "#e09a84", "#26142f"], plank: ["#c28a70", "#8a5a5a", "#26142f"], plat: ["#ffd98a", "#a86e84", "#26142f"],
        hard: ["#a88a9a", "#785a72", "#dcc3ce", "#26142f"], rain: 0 },
    vault: { style: "rock", music: "bonus", sky: ["#2a1240", "#3a1650", "#4e1f5c", "#6a2c62"], bg: "vault",
        r: ["#a8703c", "#7f4f32", "#efbc66", "#3a1c34", "#5e3830"], moss: ["#ffe98a", "#ffbe3d", "#c8721e"],
        brick: ["#e0a040", "#b06c2c", "#ffe08a", "#3a1c34"], plank: ["#f0c060", "#b0702c", "#5e3830"], plat: ["#ffe98a", "#c8721e", "#3a1c34"],
        hard: ["#d8b070", "#a0783c", "#ffe8b0", "#3a1c34"], rain: 0 },
};

// Tile atlas frame numbers. 0-15 are terrain by neighbour mask (1 up, 2 right, 4 down, 8 left).
export const FR = { CORNER: 16, BRICK: 20, SUN: 21, USED: 25, HARD: 26, OW: 27, PIPE: 30, CRUMBLE: 34, THORN: 36, THORN_DOWN: 38,
    LAVA: 40, LAVA_FILL: 44, CLOUD: 45, COIN: 48, WATER: 52, SECRET: 56, COUNT: 57 };

// --- Terrain -------------------------------------------------------------------------------------
function terrain(p, mask, th) {
    const U = mask & 1, R = mask & 2, D = mask & 4, L = mask & 8;
    if (th.style === "grass") {
        const [g0, g1, g2, g3] = th.g, [d0, d1, d2, d3, d4] = th.d;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            // Soft diagonal banding, dithered, so tiles join into one mass of earth.
            const w = Math.sin((x + y * 0.7) / 16 * Math.PI * 2) + Math.sin((y - x * 0.5) / 16 * Math.PI * 4) * 0.5;
            put(p, x, y, dither(x, y, 0.5 + w * 0.36) ? d0 : d1);
        }
        for (const [x, y, w] of [[2, 8, 3], [10, 5, 2], [7, 12, 3], [12, 11, 2], [3, 3, 2]]) {
            fill(p, x, y, w, 2, d4); fill(p, x + 1, y - 1, w - 1, 1, d4); fill(p, x, y, w - 1, 1, d2); put(p, x, y - 1, d2);
        }
        if (!U) {
            const lip = (x) => 4 + ((x * 7 >> 2) % 3 === 0 ? 2 : (x * 3 >> 1) % 4 === 0 ? 1 : 0);
            for (let x = 0; x < 16; x++) { const l = lip(x);
                for (let y = 0; y <= l; y++) put(p, x, y, y === 0 ? g0 : y === l ? g3 : y < 3 ? g1 : g2);
                put(p, x, l + 1, d3);
            }
        }
        if (!L) for (let y = U ? 0 : 1; y < 16; y++) { put(p, 0, y, d3); put(p, 1, y, y > 7 || U ? d2 : g2); if (U || y > 7) put(p, 1, y, d2); }
        if (!R) for (let y = U ? 0 : 1; y < 16; y++) { put(p, 15, y, d3); put(p, 14, y, U || y > 7 ? d4 : g3); }
        if (!D) for (let x = 0; x < 16; x++) { put(p, x, 15, d3); put(p, x, 14, d4); }
        if (!U && !L) { clear(p, 0, 0); clear(p, 1, 0); clear(p, 0, 1); put(p, 1, 1, g0); }
        if (!U && !R) { clear(p, 15, 0); clear(p, 14, 0); clear(p, 15, 1); put(p, 14, 1, g2); }
        if (!D && !L) { clear(p, 0, 15); put(p, 1, 15, d3); put(p, 0, 14, d3); }
        if (!D && !R) { clear(p, 15, 15); put(p, 14, 15, d3); put(p, 15, 14, d3); }
    } else if (th.style === "rock") {
        const [r0, r1, r2, r3, r4] = th.r, [m0, m1, m2] = th.moss;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const w = Math.sin((y + x * 0.25) / 16 * Math.PI * 4) * 0.7 + Math.sin((x - y) / 16 * Math.PI * 2) * 0.4;
            put(p, x, y, dither(x, y, 0.5 + w * 0.42) ? r0 : r1);
        }
        for (const [x, y, w] of [[2, 4, 4], [10, 11, 4]]) { fill(p, x, y, w, 1, r4); fill(p, x + 1, y + 1, w - 2, 1, r2); }
        if (!U) for (let x = 0; x < 16; x++) {
            const l = 1 + ((x * 5 >> 1) % 3 === 0 ? 2 : (x >> 1) % 2 ? 1 : 0);
            put(p, x, 0, m0); put(p, x, 1, m1); put(p, x, 2, x % 5 ? m1 : m2);
            if (l > 1) put(p, x, 3, m2);
            if (l > 2) { put(p, x, 4, m2); }
            put(p, x, l + 2, r3);
        }
        if (!L) for (let y = U ? 0 : 1; y < 16; y++) { put(p, 0, y, r3); put(p, 1, y, r2); }
        if (!R) for (let y = U ? 0 : 1; y < 16; y++) { put(p, 15, y, r3); put(p, 14, y, r4); }
        if (!D) for (let x = 0; x < 16; x++) { put(p, x, 15, r3); put(p, x, 14, r4); }
        if (!U && !L) { clear(p, 0, 0); clear(p, 0, 1); clear(p, 1, 0); }
        if (!U && !R) { clear(p, 15, 0); clear(p, 15, 1); clear(p, 14, 0); }
        if (!D && !L) { clear(p, 0, 15); put(p, 1, 15, r3); put(p, 0, 14, r3); }
        if (!D && !R) { clear(p, 15, 15); put(p, 14, 15, r3); put(p, 15, 14, r3); }
    } else {
        const [c0, c1, c2, c3, c4] = th.c, [k0, k1] = th.cap;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
            const row = y >> 3 & 1, bx = (x + (row ? 8 : 0)) & 15, by = y & 7;
            let c = c0;
            const seam = by === 7, join = bx === 15;
            if (seam || join) c = c4;
            else if (by === 0 || bx === 0) c = c2;
            else if (by === 6 || bx === 14) c = c1;
            else if (hash(x, y) < 0.08) c = c1;
            put(p, x, y, c);
        }
        if (!U) { for (let x = 0; x < 16; x++) { put(p, x, 0, k0); put(p, x, 1, k0); put(p, x, 2, k1); put(p, x, 3, c3); } }
        if (!L) for (let y = 0; y < 16; y++) { put(p, 0, y, c3); }
        if (!R) for (let y = 0; y < 16; y++) { put(p, 15, y, c3); }
        if (!D) for (let x = 0; x < 16; x++) { put(p, x, 15, c3); put(p, x, 14, c1); }
    }
}
function innerCorner(p, which, th) {
    // which: 0 up-left, 1 up-right, 2 down-right, 3 down-left neighbour is missing.
    const flipX = which === 1 || which === 2, flipY = which >= 2;
    const at = (x, y) => [flipX ? 15 - x : x, flipY ? 15 - y : y];
    const cols = th.style === "grass" ? (flipY ? [th.d[3], th.d[4], th.d[1]] : [th.g[0], th.g[2], th.g[3]]) : th.style === "rock" ? (flipY ? [th.r[3], th.r[4], th.r[1]] : [th.moss[0], th.moss[1], th.moss[2]]) : [th.c[3], th.c[1], th.c[4]];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        const d = x + y;
        if (d > 3) continue;
        const [a, b] = at(x, y);
        put(p, a, b, cols[d === 0 ? 0 : d === 1 ? 1 : d === 2 ? 1 : 2]);
    }
}

function block(p, [a, b, c, o]) {
    fill(p, 0, 0, 16, 16, a);
    fill(p, 0, 0, 16, 1, c); fill(p, 0, 0, 1, 16, c);
    fill(p, 15, 0, 1, 16, b); fill(p, 0, 15, 16, 1, b);
}
function paintBrick(p, [a, b, c, o]) {
    fill(p, 0, 0, 16, 16, o);
    const brick = (x, y, w, h) => { fill(p, x, y, w, h, a); fill(p, x, y, w, 1, c); fill(p, x, y + h - 1, w, 1, b); fill(p, x + w - 1, y, 1, h, b); };
    brick(0, 0, 7, 7); brick(8, 0, 8, 7); brick(0, 8, 3, 7); brick(4, 8, 8, 7); brick(13, 8, 3, 7);
    fill(p, 0, 15, 16, 1, o);
}
function sunGlyph(p, f, a, b) {
    // A little embossed sun that turns, instead of any kind of punctuation mark.
    const rays = [[[7, 2], [8, 2], [7, 13], [8, 13], [2, 7], [2, 8], [13, 7], [13, 8]], [[4, 4], [11, 4], [4, 11], [11, 11], [3, 3], [12, 3], [3, 12], [12, 12]]][f % 2];
    disc(p, 8, 8, 4, 4, a);
    for (const [x, y] of rays) put(p, x, y, a);
    fill(p, 6, 7, 1, 2, b); fill(p, 9, 7, 1, 2, b);
    put(p, 7, 10, b); put(p, 8, 10, b);
    put(p, 6, 9, b); put(p, 9, 9, b);
}
function paintSun(p, f) {
    const P = PAL;
    fill(p, 0, 0, 16, 16, P.gold);
    fill(p, 0, 0, 16, 1, P.gold4); fill(p, 0, 0, 1, 16, P.gold4); fill(p, 15, 0, 1, 16, P.gold3); fill(p, 0, 15, 16, 1, P.gold3);
    fill(p, 1, 14, 14, 1, P.gold2); fill(p, 14, 1, 1, 14, P.gold2);
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) { put(p, x, y, P.ink); put(p, x + 1, y + 1, P.gold4); }
    sunGlyph(p, f >> 1, f === 2 ? P.white : P.gold4, P.gold3);
    // A sheen that crosses the block.
    const sweep = [-1, 5, 11, -1][f];
    if (sweep >= 0) for (let i = 0; i < 16; i++) { const x = sweep + (15 - i) / 3; put(p, x, i, "#ffffffaa"); put(p, x + 1, i, "#ffffff55"); }
}
function pipePiece(p, cap, right) {
    const a = PAL.rust, b = PAL.rust2, c = PAL.rust3, o = PAL.ink;
    const left = !right;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        // Shade across the full 28 or 32 px width of the pipe.
        const X = right ? x + 16 : x, inset = cap ? 0 : 2;
        if (X < inset || X >= 32 - inset) continue;
        let col = a;
        if (X === inset || X === 31 - inset) col = o;
        else if (X < inset + 3) col = c;
        else if (X < inset + 5 && dither(X, y, 0.5)) col = c;
        else if (X > 31 - inset - 4) col = b;
        else if (X > 31 - inset - 7 && dither(X, y, 0.5)) col = b;
        put(p, x, y, col);
    }
    if (cap) {
        fill(p, 0, 0, 16, 1, o); fill(p, 0, 15, 16, 1, o);
        for (let x = 0; x < 16; x++) { const X = right ? x + 16 : x; if (X > 0 && X < 31) { put(p, x, 1, PAL.cream); put(p, x, 14, b); } }
        put(p, right ? 9 : 6, 7, o); put(p, right ? 10 : 5, 8, PAL.rust3); put(p, right ? 9 : 6, 8, PAL.cream);
    } else if (left) {
        put(p, 7, 4, b); put(p, 7, 12, b); put(p, 6, 4, c); put(p, 6, 12, c);
    }
}
function crumble(p, th, f) {
    const [a, b, o] = th.plank, c = a;
    fill(p, 0, 0, 16, 16, f ? b : a);
    fill(p, 0, 0, 16, 2, f ? a : c);
    fill(p, 0, 14, 16, 2, o);
    for (const [x0, y0, x1, y1] of [[3, 2, 6, 7], [6, 7, 4, 13], [6, 7, 10, 9], [12, 2, 10, 9], [10, 9, 12, 13]]) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let i = 0; i <= n; i++) put(p, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, o);
    }
}
function thorn(p, f, th, down) {
    const c = th.style === "grass" ? ["#ff7f7f", "#d03a58", "#7a2050", "#3f8a4a"] : th.style === "rock" ? ["#f4f7ff", "#a8bce8", "#54669c", "#2c3562"] : ["#ffd0a0", "#c8626a", "#5e2a50", "#2a2445"];
    const px = (x, y, col) => put(p, x, down ? 15 - y : y, col);
    const spike = (cx, top, w) => { for (let y = top; y < 16; y++) { const hw = Math.floor((y - top) / 3 * w / 2 + 0.5); for (let x = cx - hw; x <= cx + hw; x++) {
        px(x, y, x === cx - hw ? c[2] : x < cx ? c[1] : x === cx ? c[0] : c[1]);
        if (x === cx + hw) px(x, y, c[2]);
    } } };
    const sway = f ? 1 : 0;
    spike(3, 5 + sway, 3); spike(8, 3, 3); spike(13, 5 - sway + 1, 3);
    for (let x = 0; x < 16; x++) { px(x, 15, c[3]); px(x, 14, x & 1 ? c[3] : c[2]); }
}
function lava(p, f, full) {
    const a = "#ffd24a", b = "#ff8a2a", c = "#e0382e", d = "#8a1e3a";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        if (full) { const v = (Math.sin((x + y * 2) * 0.8) + Math.sin(x * 1.57)) * 0.25 + 0.5; put(p, x, y, v > 0.72 ? c : dither(x, y, v) ? d : c); continue; }
        const w = 3 + Math.round(Math.sin((x / 16 + f / 4) * Math.PI * 2) * 2);
        if (y < w) continue;
        const k = y - w;
        put(p, x, y, k === 0 ? a : k === 1 ? a : k < 4 ? b : k < 7 ? (dither(x, y, 0.5) ? b : c) : k < 11 ? c : dither(x, y, 0.4) ? d : c);
    }
}
function cloudTile(p, i) {
    const w = ["#ffffff", "#e4f2ff", "#b6d4f0", "#7fa6d2"];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const edge = i === 0 ? x : i === 2 ? 15 - x : 99, top = edge < 6 ? [8, 5, 3, 2, 1, 1][edge] : Math.round(Math.sin(x * 0.8) + 0.3);
        const bot = 10 - (edge < 6 ? [4, 2, 1, 0, 0, 0][edge] : (x % 5 === 0 ? 1 : 0));
        if (y < top || y > bot) continue;
        put(p, x, y, y === top ? w[0] : y < top + 3 ? w[1] : y === bot ? w[3] : w[2]);
    }
}
function coin(p, f) {
    const P = PAL, w = [5, 4, 2, 4][f];
    for (let y = 1; y < 15; y++) for (let x = 8 - w; x < 8 + w; x++) {
        const dx = (x + 0.5 - 8) / w, dy = (y + 0.5 - 8) / 6.5;
        if (dx * dx + dy * dy > 1) continue;
        put(p, x, y, dx * dx + dy * dy > 0.62 ? (dx + dy < 0 ? P.gold4 : P.gold3) : (dx + dy < -0.1 ? P.gold : P.gold2));
    }
    if (w > 2) { fill(p, 7, 5, 2, 6, P.gold4); fill(p, 9, 5, 1, 6, P.gold3); } else fill(p, 7, 3, 1, 10, P.gold4);
}
function water(p, f) {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const k = (y + f * 4 + (x % 3 === 0 ? 2 : x % 5 === 0 ? 5 : 0)) % 8;
        put(p, x, y, y < 2 ? (x + f * 2) % 8 < 5 ? "#e8fbff" : "#9fe0f6" : k < 1 ? "#bff0ff" : k < 3 ? "#5fb8e8" : "#3580d0");
    }
}

function paintTiles(game, name, th) {
    const n = FR.COUNT;
    game.assets.paint(name, 16, 16, (p, f) => {
        if (f < 16) terrain(p, f, th);
        else if (f < 20) innerCorner(p, f - 16, th);
        else if (f === FR.BRICK) paintBrick(p, th.brick);
        else if (f < FR.USED) paintSun(p, f - FR.SUN);
        else if (f === FR.USED) {
            block(p, [PAL.gold3, "#8a3e26", PAL.gold2, PAL.ink]);
            for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) put(p, x, y, "#8a3e26");
            sunGlyph(p, 0, PAL.gold2, "#8a3e26");
        } else if (f === FR.HARD) {
            const [a, b, c, o] = th.hard;
            block(p, [a, b, c, o]);
            for (let i = 1; i < 15; i++) { put(p, i, i, c); put(p, 15 - i, i, b); }
            fill(p, 4, 4, 8, 8, a); fill(p, 4, 4, 8, 1, b); fill(p, 4, 4, 1, 8, b); fill(p, 4, 11, 8, 1, c); fill(p, 11, 4, 1, 8, c);
        } else if (f < FR.OW + 3) {
            const [a, b, o] = th.plank, i = f - FR.OW;
            fill(p, 0, 0, 16, 2, a); fill(p, 0, 2, 16, 3, b); fill(p, 0, 5, 16, 1, o);
            for (let x = 3; x < 16; x += 6) { put(p, x, 0, b); put(p, x, 3, o); }
            if (i === 0) { fill(p, 0, 0, 1, 6, o); fill(p, 2, 6, 2, 3, b); }
            if (i === 2) { fill(p, 15, 0, 1, 6, o); fill(p, 12, 6, 2, 3, b); }
        } else if (f < FR.PIPE + 4) {
            const i = f - FR.PIPE; pipePiece(p, i < 2, i % 2 === 1);
        } else if (f < FR.THORN) crumble(p, th, f - FR.CRUMBLE);
        else if (f < FR.THORN_DOWN) thorn(p, f - FR.THORN, th, false);
        else if (f < FR.LAVA) thorn(p, f - FR.THORN_DOWN, th, true);
        else if (f < FR.LAVA_FILL) lava(p, f - FR.LAVA, false);
        else if (f === FR.LAVA_FILL) lava(p, 0, true);
        else if (f < FR.COIN) cloudTile(p, f - FR.CLOUD);
        else if (f < FR.WATER) coin(p, f - FR.COIN);
        else if (f < FR.SECRET) water(p, f - FR.WATER);
        else paintBrick(p, th.brick);
    }, { frames: n });
}

// --- Backdrops ------------------------------------------------------------------------------------
function skyStrip(game, name, stops) {
    game.assets.paint(name, 32, 256, (p) => {
        for (let y = 0; y < 256; y++) {
            const t = y / 255 * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(t)), k = t - i;
            const steps = 4, q = k * steps, j = Math.floor(q), f = q - j;
            for (let x = 0; x < 32; x++) {
                const v = (j + (dither(x, y, f) ? 1 : 0)) / steps;
                cset(p, x, y, v >= 1 ? stops[i + 1] : mix(stops[i], stops[i + 1], v));
            }
        }
    });
}
function mix(a, b, t) {
    const h = (s, i) => parseInt(s.slice(i, i + 2), 16), c = (i) => Math.round(h(a, i) + (h(b, i) - h(a, i)) * t).toString(16).padStart(2, "0");
    return `#${c(1)}${c(3)}${c(5)}`;
}
/** Repeating ridge line with bands below its crest. */
function ridge(game, name, w, h, o) {
    game.assets.paint(name, w, h, (p) => {
        for (let x = 0; x < w; x++) {
            let top = o.base;
            for (const [a, fq, ph] of o.waves) top += a * Math.sin(x / w * Math.PI * 2 * fq + ph);
            if (o.teeth) top += ((x * o.teeth / w) % 1 < 0.5 ? (x * o.teeth / w % 1) : (1 - x * o.teeth / w % 1)) * o.toothH;
            top = Math.round(top);
            for (let y = top; y < h; y++) {
                const d = y - top, b = o.bands;
                let c = b[b.length - 1];
                for (let i = 0; i < b.length - 1; i++) {
                    const lim = o.widths[i], prev = i ? o.widths[i - 1] : 0;
                    if (d < lim) { const k = (d - prev) / (lim - prev); c = dither(x, y, k * k) ? b[i + 1] : b[i]; break; }
                }
                put(p, x, y, c);
            }
            if (o.edge) put(p, x, top, o.edge);
        }
        o.extra?.(p);
    });
}
function cloudSprite(game, name, w, h, blobs, cols) {
    game.assets.paint(name, w, h, (p) => { puff(p, blobs, cols, [0, h]); });
}
function paintBackdrops(game) {
    const A = game.assets;
    for (const [k, th] of Object.entries(THEMES)) skyStrip(game, `sky_${k}`, th.sky);

    // Meadow: pale mountains, rolling hills, a tree line.
    ridge(game, "bg_meadow0", 320, 120, { base: 58, waves: [[20, 2, 0.4], [10, 5, 1.7], [4, 11, 0.2]], bands: ["#d5ecf6", "#b9dff0", "#a3d1ea"], widths: [8, 40], edge: "#eef8fb" });
    ridge(game, "bg_meadow1", 256, 96, { base: 44, waves: [[12, 2, 2.1], [6, 3, 0.3]], bands: ["#a9e6b4", "#83d7a4", "#6ac69c"], widths: [5, 34], edge: "#d0f5c4",
        extra(p) { for (let i = 0; i < 26; i++) { const x = hash(i, 3) * 256 | 0, y = 40 + hash(i, 9) * 40 | 0; if (alphaAt(p, x, y - 8)) { disc(p, x, y, 4, 5, "#5ab98e"); disc(p, x - 1, y - 2, 2, 2, "#7fd6a0"); } } } });
    ridge(game, "bg_meadow2", 256, 92, { base: 46, waves: [[8, 1, 0.8], [5, 3, 2.2], [2, 7, 1]], bands: ["#7fd465", "#57bd5a", "#3fa55c"], widths: [4, 22], edge: "#c4f07a",
        extra(p) {
            for (let i = 0; i < 16; i++) { const x = (i * 34 + 9 + hash(i, 1) * 15) % 256 | 0; let y = 0; while (y < 91 && !alphaAt(p, x, y)) y++;
                fill(p, x - 1, y - 6, 2, 8, "#7f5a3c");
                disc(p, x, y - 11, 8, 8, "#2f9c62"); disc(p, x - 2, y - 13, 6, 6, "#46b86a"); disc(p, x - 3, y - 15, 3, 3, "#7fdc7c");
            }
        } });
    // Dusk: same shapes, plum and ember.
    ridge(game, "bg_dusk0", 320, 120, { base: 58, waves: [[20, 2, 1.4], [10, 5, 0.7], [4, 11, 2.2]], bands: ["#f0917a", "#c9607f", "#a04a84"], widths: [8, 40], edge: "#ffc98e" });
    ridge(game, "bg_dusk1", 256, 96, { base: 44, waves: [[12, 2, 0.1], [6, 3, 1.3]], bands: ["#9a4a88", "#74387e", "#5a2e74"], widths: [5, 34], edge: "#d87a8a",
        extra(p) { for (let i = 0; i < 26; i++) { const x = hash(i, 13) * 256 | 0, y = 40 + hash(i, 19) * 40 | 0; if (alphaAt(p, x, y - 8)) { disc(p, x, y, 4, 5, "#4c2a6a"); } } } });
    ridge(game, "bg_dusk2", 256, 92, { base: 46, waves: [[8, 1, 1.8], [5, 3, 0.2], [2, 7, 2]], bands: ["#5e2f72", "#472666", "#371f5a"], widths: [4, 22], edge: "#a3507e",
        extra(p) {
            for (let i = 0; i < 12; i++) { const x = (i * 44 + 9 + hash(i, 1) * 15) % 256 | 0; let y = 0; while (y < 91 && !alphaAt(p, x, y)) y++;
                fill(p, x - 1, y - 6, 2, 8, "#2f1c4a");
                disc(p, x, y - 11, 8, 8, "#3a2262"); disc(p, x - 2, y - 13, 5, 5, "#54307a");
            }
            // Warm little windows.
            for (const x of [46, 150, 208]) { let y = 0; while (y < 91 && !alphaAt(p, x, y)) y++; fill(p, x - 7, y - 8, 14, 11, "#2f1c4a"); for (let i = 0; i < 8; i++) fill(p, x - 7 + i, y - 8 - i, 14 - i * 2, 1, "#46245e"); fill(p, x - 3, y - 4, 3, 3, "#ffd27a"); }
        } });

    const day = ["#ffffff", "#f3fbff", "#d4ecfa", "#a9d4ef"], dusky = ["#ffd9a8", "#f8a58a", "#c9688e", "#8a4a8e"], storm = ["#7f7ca8", "#5a5888", "#3e3a6a", "#2a2650"];
    const c1 = [[14, 16, 10], [28, 12, 13], [44, 16, 10], [36, 18, 8]], c2 = [[18, 22, 12], [36, 16, 16], [56, 14, 14], [74, 20, 12], [50, 24, 12]], c3 = [[10, 9, 7], [20, 7, 8], [29, 10, 6]];
    for (const [t, cols] of [["day", day], ["dusk", dusky], ["storm", storm]]) {
        cloudSprite(game, `cloud1_${t}`, 56, 28, c1, cols); cloudSprite(game, `cloud2_${t}`, 88, 36, c2, cols); cloudSprite(game, `cloud3_${t}`, 36, 18, c3, cols);
    }
    A.paint("sunball", 64, 64, (p) => {
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const d = Math.hypot(x - 31.5, y - 31.5);
            if (d < 15) put(p, x, y, d < 12 ? "#fff6b0" : "#ffe36a");
            else if (d < 21 && dither(x, y, 0.5)) put(p, x, y, "#fff2a855");
            else if (d < 30 && dither(x, y, (30 - d) / 22)) put(p, x, y, "#fff2a833");
        }
    });
    A.paint("moon", 48, 48, (p) => { disc(p, 24, 24, 15, 15, "#f4eccb"); disc(p, 20, 21, 4, 4, "#d8cfae"); disc(p, 29, 29, 3, 3, "#d8cfae"); disc(p, 28, 16, 2, 2, "#d8cfae"); });

    // Cave: a rock wall tile and hanging/standing silhouettes with glowing crystals.
    A.paint("bg_cave0", 96, 96, (p) => {
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const a = Math.sin(x / 96 * Math.PI * 6 + Math.sin(y / 96 * Math.PI * 4) * 1.6) + Math.sin(y / 96 * Math.PI * 8 + x / 96 * Math.PI * 2) * 0.8;
            put(p, x, y, a > 1.1 ? "#1b2352" : dither(x, y, 0.5 + a * 0.3) ? "#171e4a" : "#141a42");
        }
    });
    ridge(game, "bg_cave1", 256, 100, { base: 26, waves: [[10, 2, 0.5], [6, 5, 1.1]], teeth: 11, toothH: 44, bands: ["#2a3570", "#222b60", "#1b2352"], widths: [3, 30], edge: "#3e4f92",
        extra(p) {
            for (let i = 0; i < 7; i++) { const x = hash(i, 5) * 246 + 5 | 0; let y = 0; while (y < 99 && !alphaAt(p, x, y)) y++; crystalAt(p, x, y + 4, 3 + (i % 3), ["#c8fff0", "#55e8c8", "#1f9ca8"]); }
        } });
    A.paint("bg_cave2", 256, 64, (p) => {
        for (let x = 0; x < 256; x++) {
            let d = 8 + Math.sin(x / 256 * Math.PI * 4 + 1) * 5 + ((x * 11 / 256) % 1 < 0.5 ? (x * 11 / 256 % 1) : 1 - (x * 11 / 256 % 1)) * 48 * (0.5 + 0.5 * Math.sin(x / 256 * Math.PI * 6));
            d = Math.round(d);
            for (let y = 0; y < d; y++) put(p, x, y, y === d - 1 ? "#34428a" : dither(x, y, y / d) ? "#1e2758" : "#28336f");
        }
    });
    // Vault: warm wall and heaps of gold for bonus rooms.
    A.paint("bg_vault0", 96, 96, (p) => {
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const row = (y >> 4) & 1, bx = (x + (row ? 12 : 0)) % 24, by = y % 16;
            let c = bx === 0 || by === 0 ? "#3a1a44" : by === 1 || bx === 1 ? "#6a2e60" : dither(x, y, 0.3) ? "#50234f" : "#47204c";
            put(p, x, y, c);
        }
    });
    ridge(game, "bg_vault1", 256, 100, { base: 76, waves: [[8, 3, 0.5], [5, 5, 1.1]], bands: ["#ffe98a", "#ffbe3d", "#c8721e"], widths: [3, 18], edge: "#fff6c0" });
    A.paint("bg_vault2", 256, 64, (p) => { for (let x = 0; x < 256; x++) { const d = 4 + (Math.sin(x / 256 * Math.PI * 12) + 1) * 3 | 0; for (let y = 0; y < d; y++) put(p, x, y, "#2e1438"); } });

    // Keep exterior: distant spires and a near battlement.
    A.paint("bg_keep0", 320, 150, (p) => {
        const tower = (x, w, top, c, c2) => { fill(p, x, top, w, 150 - top, c); fill(p, x, top, 2, 150 - top, c2);
            { const n = (w >> 1) + 3; for (let i = 0; i <= n; i++) fill(p, x + (w >> 1) - i, top - (n - i) * 2, i * 2, 2, c); fill(p, x + (w >> 1) - 1, top - n * 2 - 6, 1, 6, c2); fill(p, x - 3, top, w + 6, 2, c2); }
            for (let i = 0; i < 3; i++) if (hash(x, i) > 0.3) fill(p, x + (w >> 1) - 1, top + 8 + i * 16, 2, 4, "#ffcf6a"); };
        for (const [x, w, t] of [[20, 14, 64], [62, 18, 40], [110, 12, 80], [150, 22, 26], [206, 14, 60], [246, 18, 44], [292, 12, 70]]) tower(x, w, t, "#2a2152", "#3c3070");
        for (let x = 0; x < 320; x++) for (let y = 110 + Math.round(Math.sin(x * 0.04) * 6); y < 150; y++) put(p, x, y, "#2a2152");
    });
    A.paint("bg_keep1", 256, 110, (p) => {
        fill(p, 0, 24, 256, 86, "#1c1640");
        for (let x = 0; x < 256; x += 16) fill(p, x, 16, 9, 8, "#1c1640");
        for (let x = 8; x < 256; x += 32) { fill(p, x + 2, 42, 10, 20, "#120e2e"); for (let i = 0; i < 5; i++) fill(p, x + 2 + i, 42 - i, 10 - i * 2, 1, "#120e2e"); fill(p, x + 5, 48, 4, 8, hash(x, 2) > 0.5 ? "#ffcf6a" : "#3a2a60"); }
        for (let y = 24; y < 110; y += 8) for (let x = (y >> 3) % 2 ? 0 : 8; x < 256; x += 16) { fill(p, x, y, 15, 1, "#241c4c"); }
        fill(p, 0, 24, 256, 1, "#3e3270");
        for (let x = 0; x < 256; x += 16) fill(p, x, 16, 9, 1, "#3e3270");
    });
    A.paint("bg_keep2", 256, 10, () => {});

    // Hall: masonry with arched windows and pillars.
    A.paint("bg_hall0", 128, 128, (p) => {
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const row = (y >> 3) & 1, bx = (x + (row ? 8 : 0)) & 15, by = y & 7;
            put(p, x, y, by === 7 || bx === 15 ? "#21112c" : by === 0 ? "#3f2346" : dither(x, y, 0.2) ? "#2f1a3b" : "#2a1737");
        }
        // Window with a storm behind it.
        const W = (x, y) => { for (let j = 0; j < 46; j++) for (let i = 0; i < 26; i++) { const dx = i - 12.5, dy = j - 13; if (j < 13 && dx * dx + dy * dy > 169) continue; const edge = i < 2 || i > 23 || (j < 15 && dx * dx + dy * dy > 121) || j > 43; put(p, x + i, y + j, edge ? "#5a3a60" : dither(x + i, y + j, j / 60) ? "#3a2a70" : "#574a9a"); } fill(p, x + 12, y + 2, 2, 42, "#5a3a60"); fill(p, x + 2, y + 22, 22, 2, "#5a3a60"); };
        W(14, 26);
        fill(p, 72, 0, 22, 128, "#3f2346"); fill(p, 72, 0, 3, 128, "#6a3f62"); fill(p, 90, 0, 4, 128, "#21112c");
        for (let y = 0; y < 128; y += 32) { fill(p, 69, y, 28, 5, "#5a3a60"); fill(p, 69, y + 4, 28, 1, "#21112c"); }
    });
    A.paint("bg_hall1", 256, 10, () => {}); A.paint("bg_hall2", 256, 10, () => {});
}
function crystalAt(p, x, y, r, [a, b, c]) {
    for (const [dx, h, w] of [[0, r * 4, r], [-r - 1, r * 2.4, r * 0.7], [r + 1, r * 3, r * 0.7]]) {
        const X = x + dx | 0;
        for (let j = 0; j < h; j++) { const hw = Math.min(w, (j + 1) * 0.7); for (let i = -hw; i <= hw; i++) put(p, X + i, y - h + j, i < -hw / 3 ? a : i < hw / 2 ? b : c); }
    }
}

// --- Decor -----------------------------------------------------------------------------------------
function paintDecor(game) {
    const A = game.assets, P = PAL;
    const G = ["#c4f07a", "#7fdc5a", "#46b85a", "#2d9a52", "#1f7a50"], GD = ["#f0a88a", "#c25a68", "#8a3a70", "#5d2a66", "#3f2058"];
    for (const [s, g] of [["", G], ["_d", GD]]) {
        A.paint(`bush1${s}`, 32, 20, (p) => { puff(p, [[8, 13, 7], [16, 9, 9], [24, 13, 7]], g, [2, 20]); ink(p, g[4]); });
        A.paint(`bush2${s}`, 56, 24, (p) => { puff(p, [[9, 16, 8], [20, 11, 10], [34, 9, 11], [47, 15, 8]], g, [0, 24]); ink(p, g[4]); });
        A.paint(`tree${s}`, 48, 72, (p) => {
            fill(p, 19, 38, 10, 34, s ? "#3f2058" : "#7f4e30"); fill(p, 19, 38, 3, 34, s ? "#5d2a66" : "#a7703f"); fill(p, 26, 38, 3, 34, s ? "#2f1c4a" : "#5e3626");
            for (let i = 0; i < 6; i++) fill(p, 22 + i % 2, 42 + i * 5, 2, 2, s ? "#2f1c4a" : "#5e3626");
            puff(p, [[24, 22, 19], [11, 30, 10], [37, 30, 10], [24, 12, 12]], g, [2, 44]); ink(p, g[4]);
        });
        A.paint(`tuft${s}`, 16, 8, (p, f) => { const b = f ? 1 : 0; for (const [x, h] of [[2, 4], [5, 7], [8, 5], [11, 6], [13, 3]]) for (let y = 0; y < h; y++) put(p, x + (y > 3 ? b : 0), 7 - y, y > h - 2 ? g[1] : g[2]); }, { frames: 2 });
    }
    A.paint("flower", 8, 12, (p, f) => {
        const s = f ? 1 : 0, c = [P.pink, P.white, "#ffd93f", "#8fb8ff"];
        fill(p, 3, 6, 1, 6, "#2d9a52"); put(p, 4 + 0, 9, "#46b85a"); put(p, 2, 8, "#46b85a");
        for (const [x, y] of [[3 + s, 2], [3 + s, 5], [1 + s, 3], [1 + s, 4], [5 + s, 3], [5 + s, 4], [2 + s, 2], [4 + s, 2], [2 + s, 5], [4 + s, 5]]) put(p, x, y, P.pink);
        fill(p, 3 + s, 3, 2, 2, P.gold);
    }, { frames: 2 });
    A.paint("fence", 32, 16, (p) => {
        for (const x of [2, 18]) { fill(p, x, 2, 6, 14, P.wood3); fill(p, x + 4, 2, 2, 14, P.wood); fill(p, x + 1, 1, 4, 1, P.wood3); }
        fill(p, 0, 5, 32, 3, P.wood3); fill(p, 0, 7, 32, 1, P.wood); fill(p, 0, 10, 32, 3, P.wood3); fill(p, 0, 12, 32, 1, P.wood);
        ink(p, P.wood2);
    });
    A.paint("sign", 16, 16, (p) => {
        fill(p, 7, 8, 2, 8, P.wood2);
        fill(p, 1, 2, 14, 8, P.wood3); fill(p, 1, 8, 14, 2, P.wood); fill(p, 5, 5, 6, 2, P.wood2); fill(p, 9, 3, 2, 6, P.wood2); fill(p, 11, 4, 1, 4, P.wood2);
        ink(p, P.ink);
    });
    A.paint("rock", 24, 12, (p) => { puff(p, [[7, 9, 6], [15, 7, 8, 7], [20, 10, 4]], ["#e0dcea", "#b7b2cc", "#8c87a8", "#66607f"], [0, 12]); ink(p, "#4c4668"); });
    A.paint("crystal", 24, 28, (p, f) => { crystalAt(p, 12, 28, f ? 5 : 4, ["#e4fff6", "#55e8c8", "#1f9ca8"]); ink(p, "#123a5c"); }, { frames: 2 });
    A.paint("crystal2", 24, 28, (p, f) => { crystalAt(p, 12, 28, f ? 5 : 4, ["#ffe4f6", "#e87ad8", "#8a3aa8"]); ink(p, "#2c1a5c"); }, { frames: 2 });
    A.paint("shroom", 16, 16, (p, f) => {
        fill(p, 6, 8, 4, 8, "#bcd8e8"); fill(p, 6, 8, 1, 8, "#ffffff");
        disc(p, 8, 7, 7, 5 + (f ? 0 : -0.6), f ? "#6ff0d8" : "#45d2c6"); fill(p, 1, 8, 14, 3, "#00000000");
        for (let x = 1; x < 15; x++) put(p, x, 8, "#1f7f83");
        put(p, 5, 5, "#e4fff6"); put(p, 9, 4, "#e4fff6"); put(p, 11, 6, "#e4fff6");
        ink(p, "#123a5c");
    }, { frames: 2 });
    A.paint("stalag", 16, 32, (p) => { for (let y = 0; y < 32; y++) { const w = 7 - y / 5; for (let x = -w; x < w; x++) put(p, 8 + x, y, x < -w / 2 ? "#6f85bd" : x < w / 3 ? "#47578f" : "#2c3562"); } });
    A.paint("rail", 16, 8, (p) => { fill(p, 0, 2, 16, 2, "#6e6a8c"); fill(p, 0, 2, 16, 1, "#a8a4c0"); for (const x of [2, 10]) fill(p, x, 1, 3, 7, "#5f4438"); });
    A.paint("torch", 16, 24, (p, f) => {
        fill(p, 6, 12, 4, 8, "#3a2a40"); fill(p, 5, 11, 6, 2, "#7a6a80"); fill(p, 6, 20, 4, 2, "#7a6a80");
        const k = [0, 1, 2][f], c = [[8, 6, 4, 6], [7, 5, 4, 7], [9, 6, 3, 6]][k];
        disc(p, c[0], c[1] + 1, c[2], c[3] - 1, "#ff8a2a"); disc(p, c[0], c[1] + 3, 3, 3, "#ffd24a"); disc(p, c[0], c[1] + 4, 1.6, 2, "#fff6c0");
    }, { frames: 3 });
    A.paint("glow", 64, 64, (p) => { for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const d = Math.hypot(x - 31.5, y - 31.5) / 32; if (d < 1 && dither(x, y, (1 - d) * (1 - d) * 0.75)) put(p, x, y, "#ffc06a22"); } });
    A.paint("lamp", 16, 48, (p, f) => {
        fill(p, 7, 14, 3, 34, "#3a3454"); fill(p, 7, 14, 1, 34, "#6e6a8c"); fill(p, 4, 44, 9, 4, "#3a3454"); fill(p, 5, 12, 7, 2, "#7a6a80");
        const c = [[8, 6, 3.5, 5], [8, 5, 3, 6], [9, 6, 3, 5]][f];
        disc(p, c[0], c[1] + 1, c[2], c[3], "#ff8a2a"); disc(p, c[0], c[1] + 3, 2.4, 3, "#ffd24a"); disc(p, c[0], c[1] + 4, 1.2, 1.6, "#fff6c0");
    }, { frames: 3 });
    A.paint("banner", 16, 40, (p) => {
        fill(p, 0, 0, 16, 2, "#c8a050"); fill(p, 2, 2, 12, 32, "#a92a48"); fill(p, 2, 2, 2, 32, "#d84a5a"); fill(p, 12, 2, 2, 32, "#731f40");
        for (let i = 0; i < 6; i++) { fill(p, 2 + i, 34 + i, 6 - i, 1, "#a92a48"); fill(p, 8, 34 + i, 6 - i, 1, "#a92a48"); }
        disc(p, 8, 16, 4, 4, "#ffcf3f"); disc(p, 8, 16, 2, 2, "#2a1a3e");
    });
    A.paint("chain", 8, 16, (p) => { for (let y = 0; y < 16; y += 8) { fill(p, 2, y, 4, 6, "#6e6a8c"); fill(p, 3, y + 1, 2, 4, "#2a2445"); put(p, 2, y, "#a8a4c0"); fill(p, 3, y + 5, 2, 4, "#a8a4c0"); } });
    A.paint("gargoyle", 24, 24, (p) => {
        fill(p, 4, 18, 16, 6, "#544e74"); disc(p, 12, 12, 8, 8, "#6f6890");
        for (const s of [-1, 1]) { fill(p, 12 + s * 5 - 1, 2, 3, 6, "#9a93b8"); }
        fill(p, 7, 9, 3, 2, "#ff5a4a"); fill(p, 14, 9, 3, 2, "#ff5a4a"); fill(p, 8, 14, 8, 2, "#2a2445");
        ink(p, "#2a2445");
    });
    A.paint("skullpile", 16, 8, (p) => { for (const x of [3, 8, 13]) disc(p, x, 5, 3, 3, "#c9c3de"); ink(p, "#2a2445"); });

    // Bits of world furniture.
    A.paint("checkpoint", 16, 40, (p, f) => {
        // A windsock on a post: slack until you pass it, then it fills with colour.
        fill(p, 7, 2, 2, 38, f ? P.wood3 : "#8a8a9a"); fill(p, 7, 2, 1, 38, f ? P.cream : "#b8b8c8");
        disc(p, 8, 2, 2, 2, f ? P.gold : "#c8c8d8");
        if (f === 0) { fill(p, 3, 5, 4, 14, "#9a98ac"); fill(p, 3, 5, 1, 14, "#c0bed0"); for (let y = 8; y < 18; y += 4) fill(p, 3, y, 4, 2, "#6e6a8c"); }
        else {
            const w = f === 2 ? 1 : 0;
            for (let i = 0; i < 7; i++) { const x = 9 + i, top = 4 + (i + f) % 2 * w + 1, h = 8 - i / 2 | 0; fill(p, x, top, 1, h, i % 2 ? P.white : P.red); put(p, x, top, i % 2 ? P.cream : P.pink); }
        }
        ink(p, P.ink);
    }, { frames: 3 });
    A.paint("spring", 16, 16, (p, f) => {
        const top = [4, 9, 1][f];
        fill(p, 1, top, 14, 3, P.red); fill(p, 1, top, 14, 1, P.pink); fill(p, 1, top + 2, 14, 1, P.red2);
        fill(p, 2, 13, 12, 3, "#6e6a8c"); fill(p, 2, 13, 12, 1, "#a8a4c0");
        for (let y = top + 3; y < 13; y += 2) fill(p, 4 + (y >> 1 & 1) * 2, y, 6, 1, "#c9c3de");
        ink(p, P.ink);
    }, { frames: 3 });
    A.paint("gate", 16, 16, (p) => {
        fill(p, 0, 0, 16, 16, "#3a3454");
        for (const x of [1, 6, 11]) { fill(p, x, 0, 3, 16, "#8e87ac"); fill(p, x, 0, 1, 16, "#c2bcd8"); }
        fill(p, 0, 7, 16, 2, "#8e87ac");
    });
    // Goal: a kite on a very long string, and the peg it's tied to.
    A.paint("kite", 32, 40, (p, f) => {
        const s = f ? 1 : 0;
        const q = [[16, 2 + s], [29 - s, 14], [16, 32], [3 + s, 14]];
        p.poly(q, P.red); p.poly([[16, 2 + s], [29 - s, 14], [16, 14]], P.gold); p.poly([[16, 14], [29 - s, 14], [16, 32]], P.red2); p.poly([[3 + s, 14], [16, 2 + s], [16, 14]], P.white); p.poly([[3 + s, 14], [16, 14], [16, 32]], P.teal);
        for (let i = 0; i < 26; i++) put(p, 16, 4 + i, P.ink); for (let x = 5; x < 28; x++) put(p, x, 14, P.ink);
        disc(p, 16, 14, 3.5, 3.5, P.gold4); fill(p, 14, 13, 1, 1, P.ink); fill(p, 18, 13, 1, 1, P.ink); put(p, 15, 16, P.ink); put(p, 16, 16, P.ink); put(p, 17, 16, P.ink);
        ink(p, P.ink);
    }, { frames: 2 });
    A.paint("peg", 16, 32, (p) => {
        fill(p, 5, 6, 6, 26, P.wood); fill(p, 5, 6, 2, 26, P.wood3); fill(p, 9, 6, 2, 26, P.wood2); disc(p, 8, 5, 5, 4, P.gold); disc(p, 7, 4, 2, 2, P.gold4);
        for (let y = 12; y < 32; y += 7) fill(p, 5, y, 6, 1, P.wood2);
        ink(p, P.ink);
    });
    A.paint("bow", 8, 8, (p, f) => { const c = [P.red, P.gold, P.teal][f]; p.poly([[0, 0], [4, 3], [0, 6]], c); p.poly([[8, 0], [4, 3], [8, 6]], c); put(p, 4, 3, P.ink); }, { frames: 3 });
    // The sun itself, recovered at the end.
    A.paint("sunorb", 40, 40, (p, f) => {
        const r = [[20, 2], [38, 20], [20, 38], [2, 20], [7, 7], [33, 7], [33, 33], [7, 33]];
        r.forEach(([x, y], i) => { if ((i + f) % 2 === 0) { const n = 7; for (let k = 0; k < n; k++) { const t = k / n; put(p, x + (20 - x) * t, y + (20 - y) * t, P.gold4); put(p, x + (20 - x) * t + 1, y + (20 - y) * t, P.gold2); } } });
        disc(p, 20, 20, 12, 12, P.gold); disc(p, 18, 18, 9, 9, P.gold4); disc(p, 16, 15, 3, 3, P.white);
        fill(p, 15, 18, 2, 3, P.ink); fill(p, 23, 18, 2, 3, P.ink); fill(p, 16, 25, 8, 1, P.ink); put(p, 15, 24, P.ink); put(p, 24, 24, P.ink);
        ink(p, P.ink);
    }, { frames: 2 });
    // Moving platforms: three pieces, per theme.
    for (const [k, th] of Object.entries(THEMES)) {
        const [a, b, o] = th.plat;
        A.paint(`plat_${k}`, 16, 10, (p, f) => {
            fill(p, 0, 0, 16, 2, a); fill(p, 0, 2, 16, 6, b); fill(p, 0, 8, 16, 2, o);
            for (const x of [4, 11]) { put(p, x, 4, o); put(p, x, 5, a); }
            if (f === 0) { fill(p, 0, 0, 1, 10, o); }
            if (f === 2) { fill(p, 15, 0, 1, 10, o); }
        }, { frames: 3 });
    }
    // Rain streak, for overlays.
    A.paint("rain", 8, 8, (p) => { for (let i = 0; i < 6; i++) put(p, 6 - i * 0.7, i + 1, i < 2 ? "#ffffff" : "#ffffff"); });
    A.paint("px", 1, 1, (p) => put(p, 0, 0, "#ffffff"));
    A.paint("dust", 8, 8, (p, f) => { const r = [2, 3, 2][f]; disc(p, 4, 4, r, r, f === 2 ? "#ffffffaa" : "#ffffff"); if (f) { clear(p, 4, 4); } }, { frames: 3 });
    A.paint("spark", 8, 8, (p, f) => { const n = [1, 3, 2, 1][f]; fill(p, 4 - n, 3, n * 2, 2, "#ffffff"); fill(p, 3, 4 - n, 2, n * 2, "#ffffff"); put(p, 3, 3, P.gold4); }, { frames: 4 });
    A.paint("shard", 8, 8, (p, f) => { fill(p, 1, 2, 5, 4, P.white); fill(p, 1, 5, 5, 1, "#a0a0b0"); if (f) clear(p, 1, 2); ink(p, P.ink); }, { frames: 2 });
}

// --- Characters ----------------------------------------------------------------------------------
const PIP = { K: PAL.ink, Y: "#ffd23f", L: "#fff08a", O: "#ee9428", S: "#ffd9b0", B: "#eda67c", E: PAL.ink, W: "#ffffff", R: "#ec4a3f", D: "#a92a48", H: "#c06030", C: "#fff8ea" };
const PIP_ZAP = { ...PIP, Y: "#5fe8e0", L: "#e2fff4", O: "#2a9fc0", R: "#7a5ae8", D: "#44309c", H: "#ffcf3f", C: "#ffe36a" };

const HEAD = `
.....KKKKKK.....
...KKLLLYYYKK...
..KLLYYYYYYYYK..
.KLYYYYYYYYYYOK.
.KYYYYYKKKKKKKKK
KYYYYKHHSSSSSSK.
KYYYOKHSSSEWSEK.
KOYOOKSSSSEWSEK.
.KOOOKSSSSSSSBK.
..KKKKKBBBBBKK..`;
const HEAD_BLINK = HEAD.replace("KYYYOKHSSSEWSEK.", "KYYYOKHSSSSSSSK.").replace("KOYOOKSSSSEWSEK.", "KOYOOKSSSEESEEK.");
const HEAD_FRONT = `
.....KKKKKK.....
...KKLLLYYYKK...
..KLLYYYYYYYYK..
.KLYYYYYYYYYYOK.
.KYYKKKKKKKKYOK.
.KYKSSSSSSSSKOK.
.KYKSEKSSEKSKOK.
.KYKSSSSSSSSKOK.
..KKSSSKKSSSKK..
...KKBBBBBBKK...`;

// Small bodies: 6 rows, starting at row 10 of 16.
const SB = {
    idle: `
...KYYYYYYK.....
..KYLYYYYOOK....
..KYLYYYYOSK....
..KKYYOOOKK.....
...KRRKKRRK.....
...KRRRKRRRK....`,
    run1: `
...KYYYYYYKK....
..KLYYYYYOSSK...
.KOKYYYYOOKK....
.KSKOOOOOOK.....
..KRRRKK.KRRK...
..KKKK....KKKK..`,
    run2: `
...KYYYYYYK.....
..KLYYYYYOOK....
..KOYYYYOSK.....
...KYOOOOKK.....
...KKRRKRRK.....
....KRRRRRKK....`,
    run3: `
...KYYYYYYK.....
..KLYYYYYOKK....
..KSKYYYYSSK....
...KKOOOOKK.....
...KRRKRRRK.....
...KKKKKRRRK....`,
    run4: `
...KYYYYYYKK....
.KKLYYYYYOSSK...
KSSKYYYYOOKK....
.KKKOOOOOOK.....
..KRRRK..KRRK...
..KKKK...KKKKK..`,
    skid: `
...KKYYYYYK.....
..KSSOYYYYLK....
...KKOOYYYLK....
....KOOOOYKK....
...KRRKKRRK.....
..KRRRKKRRRK....`,
    jump: `
..KSSKYYYYK.KK..
...KKLYYYOKKSSK.
....KYYYYOOKK...
...KYOOOOOK.....
..KRRK.KRRK.....
..KKK..KKKKK....`,
    fall: `
.KSKKYYYYYKKSK..
..KKLYYYYYOKK...
...KYYYYYOK.....
...KYOOOOOK.....
...KRRK.KRRK....
...KKK...KKK....`,
    grab: `
.......KSSK.....
...KYYYYYSK.....
..KYLYYYYOK.....
..KYYOOOOK......
...KRRKRRK......
...KKKKKKK......`,
};
// Big bodies: 14 rows (head is the same; the coat gets long and proud).
const BB = {
    idle: `
...KYYYYYYK.....
..KYLCYYYOOK....
.KYLYYYYYYOK....
.KYLYCYYYYOK....
.KYLYYYYYOSK....
.KSKYYCYYOKK....
..KKYYYYYOK.....
..KYYYCYYOOK....
..KYYYYYYOOK....
..KKOOOOOOKK....
...KRRKKRRK.....
...KRRKKRRK.....
...KRRRKRRRK....
...KKKKKKKKK....`,
    run1: `
...KYYYYYYKK....
..KLCYYYYOSSK...
.KLYYYYYYOKK....
.KLYCYYYYOK.....
KOOYYYYYYOK.....
KSSKYCYYOOK.....
.KKYYYYYYOK.....
..KYYCYYYYOK....
..KYYYYYYOOKK...
.KKOOOOOKKRRK...
.KRRKK..KKRRK...
KRRK.....KRRK...
KRRRK....KRRRK..
KKKKK....KKKKK..`,
    run2: `
...KYYYYYYK.....
..KLCYYYYOOK....
.KLYYYYYYOOK....
.KLYCYYYOSK.....
.KOYYYYYOKK.....
.KOKYCYYOOK.....
..KKYYYYYOK.....
..KYYCYYYOK.....
..KYYYYYYOK.....
..KKOOOOOKK.....
...KKRRKRRK.....
....KRRKRRK.....
....KRRRRRRK....
....KKKKKKKK....`,
    run3: `
...KYYYYYYK.....
..KLCYYYYOKK....
.KLYYYYYYOSK....
.KLYCYYYYOSK....
.KLYYYYYOOKK....
.KSKYCYYOK......
..KKYYYYYOK.....
..KYYCYYYOK.....
..KYYYYYYOK.....
..KKOOOOOKK.....
...KRRRKRRK.....
...KRRKKRRK.....
...KRRRKRRRK....
...KKKKKKKKK....`,
    run4: `
...KYYYYYYKK....
.KKLCYYYYOSSK...
KSSLYYYYYOKK....
KSSKCYYYYOK.....
.KKLYYYYYOK.....
..KYYCYYOOK.....
..KYYYYYYOK.....
..KYYCYYYYOK....
..KYYYYYYOOK....
.KKKOOOOKKRRK...
.KRRK..KKKRRK...
.KRRK....KRRK...
.KRRRK...KRRRK..
.KKKKK...KKKKK..`,
    skid: `
...KKYYYYYK.....
..KSSOYYCYLK....
...KKOYYYYLK....
....KOYCYYYLK...
....KOYYYYYLK...
....KOOCYYYLK...
....KOYYYYYK....
...KOYCYYYYK....
...KOYYYYYYK....
...KKOOOOOKK....
...KRRK.KRRK....
..KRRK..KRRK....
.KRRRK.KRRRK....
.KKKKK.KKKKK....`,
    jump: `
..KSSKYYYYK.KK..
...KKLCYYOKKSSK.
....KYYYYYOKK...
....KYCYYYOK....
...KLYYYYYOK....
...KLYCYYYOK....
...KYYYYYYOK....
...KYYCYYYOK....
..KYYYYYYYOOK...
..KKOOOOOOOKK...
..KRRK..KRRK....
..KRRK...KRRK...
..KRRRK..KRRRK..
..KKKKK..KKKKK..`,
    fall: `
.KSKKYYYYYKKSK..
..KKLCYYYYOKK...
...KLYYYYYOK....
...KLYCYYYOK....
...KYYYYYYOK....
...KYYCYYYOK....
...KYYYYYYOK....
..KYYYCYYYOOK...
..KYYYYYYYYOK...
..KKOOOOOOOKK...
...KRRK.KRRK....
...KRRK.KRRK....
...KRRRKKRRRK...
...KKKKKKKKKK...`,
    crouch: `
................
................
................
................
................
................
................
...KYYYYYYK.....
..KYLCYYYOOK....
.KYLYYYYYYOK....
.KSKYCYYYOOK....
.KKYYYYYYOSK....
..KRRRKKRRRK....
..KKKKKKKKKK....`,
    grab: `
.......KSSK.....
...KYYYYYSK.....
..KYLYYYYOK.....
..KLYCYYYOK.....
..KLYYYYYOK.....
..KYYCYYYOK.....
..KYYYYYYOK.....
..KYYCYYYOK.....
..KYYYYYYOK.....
..KKOOOOOKK.....
...KRRKRRK......
...KRRKRRK......
...KRRRRRRK.....
...KKKKKKKK.....`,
};
export const HERO_ANIM = { idle: 0, blink: 1, run: [2, 3, 4, 5], skid: 6, jump: 7, fall: 8, grab: 9, look: 10, crouch: 11, front: 12 };

function paintHero(game) {
    const A = game.assets;
    const small = [["idle", 0, HEAD], ["idle", 0, HEAD_BLINK], ["run1", 1, HEAD], ["run2", 0, HEAD], ["run3", 1, HEAD], ["run4", 0, HEAD], ["skid", 0, HEAD], ["jump", 0, HEAD], ["fall", 0, HEAD], ["grab", 0, HEAD], ["idle", 0, HEAD], ["idle", 1, HEAD], ["fall", 0, HEAD_FRONT]];
    const big = [["idle", 0, HEAD], ["idle", 0, HEAD_BLINK], ["run1", 1, HEAD], ["run2", 0, HEAD], ["run3", 1, HEAD], ["run4", 0, HEAD], ["skid", 0, HEAD], ["jump", 0, HEAD], ["fall", 0, HEAD], ["grab", 0, HEAD], ["idle", 0, HEAD], ["crouch", 0, HEAD], ["fall", 0, HEAD_FRONT]];
    for (const [name, pal] of [["pip", PIP], ["pipz", PIP_ZAP]]) {
        A.paint(`${name}_s`, 16, 16, (p, f) => { const [b, dy, head] = small[f]; stamp(p, SB[b], 0, 10, pal); stamp(p, head, 0, dy, pal); }, { frames: small.length });
        A.paint(`${name}_b`, 16, 24, (p, f) => {
            const [b, dy, head] = big[f];
            stamp(p, BB[b], 0, 10, pal);
            stamp(p, head, 0, b === "crouch" ? 7 : dy, pal);
        }, { frames: big.length });
    }
}

const SOG = { K: "#2a1a3e", P: "#a56be8", L: "#d3a4ff", D: "#6a3bb8", W: "#ffffff", E: "#2a1a3e", F: "#ffb03f", G: "#e0701e", T: "#fff8ea" };
const SOG_CAVE = { ...SOG, P: "#5fc8a8", L: "#a8f2d0", D: "#2b8a84" };
const SOG_KEEP = { ...SOG, P: "#e0605a", L: "#ffa58e", D: "#a02f54" };
const sogBody = (legs) => `
.....KKKKKK.....
...KKLLPPPPKK...
..KLLPPPPPPPPK..
.KLPPPPPPPPPPPK.
.KPPKKPPPPKKPPK.
.KPKWWKPPKWWKPK.
KPPKWEKPPKEWKPPK
KPPPKKPPPPKKPPPK
KDPPPPKKKKPPPPDK
KDDPPKTKKTKPPDDK
.KDDDDDDDDDDDDK.
..KKKDDDDDDKKK..
${legs}`;
const SHELL_PAL = { K: "#2a1a3e", A: "#ff8f6a", B: "#e8503f", C: "#ffd0a0", D: "#a92a48", M: "#9ae8c0", N: "#3fae94", W: "#ffffff", E: "#2a1a3e", X: "#3f8ae0", Y: "#8fd0ff", Z: "#1f4fa0" };
const SHELL_CAVE = { ...SHELL_PAL, A: "#8fd0ff", B: "#3f8ae0", C: "#d0f0ff", D: "#1f4fa0" };
const SNAIL = (a, b) => `
.....KKKKKKK....
...KKAAAAAAAKK..
..KACCAAAAABBBK.
.KACAKKKKKBBBBK.
.KAAKBBBBAKBBBK.
.KAKBBKKBBAKBBK.
.KAKBKAABKAKBDK.
.KAKBKACBKAKDDK.
.KABKBKKBAKBDDK.
KKAABKBBAKBDDDK.
KMKKBBKKKBDDDKKM
${a}
${b}`;
const SHELL = (spin) => [`
................
................
................
.....KKKKKKK....
...KKAAAAAAAKK..
..KACCAAAAABBBK.
.KACAKKKKKBBBBK.
.KAAKBBBBAKBBBK.
.KAKBBKKBBAKBBK.
.KAKBKAABKAKBDK.
.KAKBKACBKAKDDK.
.KABKBKKBAKBDDK.
.KAABKBBAKBDDDK.
..KABBKKKBDDDK..
...KKBBBDDDKK...
.....KKKKKK.....`, `
................
................
................
.....KKKKKKK....
...KKBBBBDDDKK..
..KBBKKKKKBDDDK.
.KBKKAAAAKKDDDK.
.KBKACCAABKBDDK.
.KAKAKKKABKBDDK.
.KAKAKBKABKBDDK.
.KAKABBBAKBDDDK.
.KAKAAAAKBDDDDK.
.KAAKKKKBDDDDDK.
..KABBBBBDDDDK..
...KKBBBDDDKK...
.....KKKKKK.....`, `
................
................
................
.....KKKKKKK....
...KKDDDBBBBKK..
..KDDDBKKKKKBBK.
.KDDDBKAAAAKKBK.
.KDDBKBAACCAKBK.
.KDDBKBAKKKAKAK.
.KDDBKBAKBKAKAK.
.KDDDBKABBBAKAK.
.KDDDDBKAAAAKAK.
.KDDDDDBKKKKAAK.
..KDDDDBBBBBAK..
...KKDDDBBBKK...
.....KKKKKK.....`, `
................
................
................
.....KKKKKKK....
...KKBBBAAAAKK..
..KBBBKKKKKCCAK.
.KBBBKBBBBKACAK.
.KBDKBBKKBBKAAK.
.KBDKBKAABKBKAK.
.KDDKBKACBKBKAK.
.KDDBKBKKBKBKAK.
.KDDDBKBBKBBAAK.
.KDDDDKKKBBAAAK.
..KDDDDBBBBAAK..
...KKDDDBBBKK...
.....KKKKKK.....`][spin];

const BROLLY = { K: "#2a1a3e", P: "#e8527a", L: "#ff9db0", D: "#9e2a68", W: "#fff8ea", E: "#2a1a3e", H: "#ffd23f", I: "#c9c3de", J: "#7a7498", Y: "#ffe36a" };
const BROLLY_UP = `
.......KK.......
.....KKLLKK.....
...KKLLPPPPKK...
..KLLPPPPPPPPK..
.KLPPPPPPPPPPPK.
.KPPKWWKKWWKPPK.
KPPPKWEKKEWKPPPK
KPPPPKKPPKKPPPPK
KDDKDDDKKDDDKDDK
.KK.KK.KK.KK.KK.
.......KK.......
.......KI.......
.......KI.......
.......KIKK.....
.......KJJK.....
........KK......`;
const BROLLY_DOWN = `
.......KK.......
.....KKLLKK.....
...KKLLPPPPKK...
..KLLPPPPPPPPK..
.KLPPPPPPPPPPPK.
KPPPKWWKKWWKPPPK
KPPPKWEKKEWKPPPK
KDPPPKKPPKKPPPDK
KDDDDDDKKDDDDDDK
KDK.KDDKKDDK.KDK
.K...KK.KK.K..K.
.......KI.......
.......KI.......
.......KIKK.....
.......KJJK.....
........KK......`;
const EEL = { K: "#2a1a3e", G: "#7ad84c", L: "#c8f27a", D: "#2d9a52", W: "#ffffff", E: "#2a1a3e", R: "#ec4a3f", T: "#fff8ea", Y: "#ffd23f" };
const EEL_OPEN = `
.....KKKKKKKK...
...KKGGLLLLGGK..
..KGGGLLGGGGGGK.
.KGGKWWKGGKWWKG.
.KGGKEWKGGKEWKK.
KGGGGKKGGGGKKGGK
KGTKTKTKTKTKTKGK
KDK.K.K.K.K.K.DK
KDKRRRRRRRRRRKDK
KDKRRDRRRRDRRKDK
KDK.T.T.T.T.T.DK
KGKTKTKTKTKTKTGK
.KDDDDDDDDDDDDK.
..KKGGGGGGGGKK..
....KDGGGGDK....
....KGGYYGGK....`;
const EEL_SHUT = `
................
.....KKKKKKKK...
...KKGGLLLLGGK..
..KGGGLLGGGGGGK.
.KGGKWWKGGKWWKG.
.KGGKEWKGGKEWKK.
KGGGGKKGGGGKKGGK
KGGGGGGGGGGGGGGK
KTKTKTKTKTKTKTKK
KKTKTKTKTKTKTKTK
KDDDDDDDDDDDDDDK
.KDDDDDDDDDDDDK.
..KKGGGGGGGGKK..
....KDGGGGDK....
....KGGYYGGK....
....KDGGGGDK....`;

function paintEnemies(game) {
    const A = game.assets;
    const feet = ["..KFFK....KFFK..\n...KKK....KKK...\n", "..KFK......KFK..\n..KKK......KKK..\n".replace(/\n$/, "\n")];
    const FEET = [`...KFFK...KFFK..
...KKKK...KKKK..`, `..KFFK...KFFK...
..KKKK...KKKK...`];
    for (const [name, pal] of [["sog", SOG], ["sog2", SOG_CAVE], ["sog3", SOG_KEEP]]) {
        A.paint(name, 16, 16, (p, f) => {
            if (f < 2) { stamp(p, sogBody(FEET[f]), 0, 1, pal); return; }
            // Flattened.
            stamp(p, `
...KKKKKKKKKK...
.KKLLPPPPPPPPKK.
KLPPKWKPPKWKPPPK
KPPPKKKPPKKKPPPK
KDDDDPPPPPPDDDDK
.KKKKKKKKKKKKKK.`, 0, 10, pal);
        }, { frames: 3 });
    }
    for (const [name, pal] of [["snail", SHELL_PAL], ["snail2", SHELL_CAVE]]) {
        A.paint(name, 16, 16, (p, f) => {
            // Snail body under the shell, antennae out front.
            const a = f % 2 ? "KMMMNMMMMNMMMMKM" : "KMMNMMMMNMMMMMKM", b = f % 2 ? ".KKKKKKKKKKKKKK." : ".KKKKKKKKKKKKKK.";
            stamp(p, SNAIL(a, b), 0, 3, pal);
            const q = f % 2 ? 1 : 0;
            stamp(p, `
...K..K..
..KEKKEK.
...KMMK..
...KMMK..
...KMMMK.`, 8, q, pal);
        }, { frames: 2 });
        A.paint(`${name}_shell`, 16, 16, (p, f) => stamp(p, SHELL(f), 0, 0, pal), { frames: 4 });
    }
    A.paint("brolly", 16, 16, (p, f) => stamp(p, f ? BROLLY_DOWN : BROLLY_UP, 0, 0, BROLLY), { frames: 2 });
    A.paint("eel", 16, 32, (p, f) => {
        stamp(p, f ? EEL_SHUT : EEL_OPEN, 0, 0, EEL);
        for (let y = 16; y < 32; y++) { const w = 3 + (y & 1), s = Math.round(Math.sin(y / 2 + f) * 1); fill(p, 8 - w + s, y, w * 2, 1, y % 4 ? EEL.G : EEL.Y); put(p, 8 - w + s - 1, y, EEL.K); put(p, 8 + w + s, y, EEL.K); put(p, 8 - w + s, y, EEL.L); put(p, 8 + w + s - 1, y, EEL.D); }
    }, { frames: 2 });
    // Falling drip-spike, rotating spark, lava ember, cannon + its ball.
    A.paint("drip", 16, 24, (p, f) => {
        for (let y = 0; y < 24; y++) { const w = Math.max(1, (24 - y) / 3.6); for (let x = -w; x < w; x++) put(p, 8 + x, y, x < -w / 3 ? "#e4f4ff" : x < w / 2 ? "#a8c8f0" : "#5a78b0"); }
        ink(p, "#1b2147");
    });
    A.paint("sparkball", 12, 12, (p, f) => {
        disc(p, 6, 6, 4 + (f ? 1 : 0), 4 + (f ? 1 : 0), "#ff8a2a"); disc(p, 6, 6, 3, 3, "#ffd24a"); disc(p, 5, 5, 1.6, 1.6, "#fff6c0");
    }, { frames: 2 });
    A.paint("ember", 16, 16, (p, f) => {
        disc(p, 8, 9, 6, 6, "#ff8a2a"); disc(p, 8, 10, 4, 4, "#ffd24a"); disc(p, 7, 9, 2, 2, "#fff6c0");
        for (const [x, y] of f ? [[4, 3], [8, 1], [12, 4]] : [[6, 2], [10, 3], [8, 0]]) { put(p, x, y, "#ff8a2a"); put(p, x, y + 1, "#ff8a2a"); }
        fill(p, 5, 8, 2, 2, PAL.ink); fill(p, 10, 8, 2, 2, PAL.ink);
        ink(p, "#8a1e3a");
    }, { frames: 2 });
    A.paint("cannon", 16, 16, (p) => {
        fill(p, 2, 1, 12, 11, "#4c4668"); fill(p, 2, 1, 3, 11, "#8e89a8"); fill(p, 11, 1, 3, 11, "#2a2445"); fill(p, 1, 3, 14, 2, "#c7c2d8"); fill(p, 1, 9, 14, 2, "#6e6a8c");
        disc(p, 8, 7, 3, 3, "#14102a"); fill(p, 3, 12, 10, 4, "#544e74"); fill(p, 3, 12, 10, 1, "#8e89a8");
        ink(p, PAL.ink);
    });
    A.paint("bolt", 16, 14, (p, f) => {
        // A cross little iron cannonball with a tail of steam.
        disc(p, 9, 7, 6, 6, "#4c4668"); disc(p, 8, 6, 4, 4, "#6e6a8c"); disc(p, 7, 5, 2, 2, "#a8a4c0");
        fill(p, 4, 5, 3, 2, PAL.white); put(p, 5, 6, PAL.ink); fill(p, 1, 3 + (f ? 1 : 0), 3, 1, "#c9c3de"); fill(p, 0, 8 - (f ? 1 : 0), 3, 1, "#c9c3de");
        ink(p, PAL.ink);
    }, { frames: 2 });
    // Zap shot.
    A.paint("zapshot", 10, 10, (p, f) => {
        disc(p, 5, 5, 4, 4, f % 2 ? PAL.gold4 : "#8ff4ff"); disc(p, 5, 5, 2, 2, "#ffffff");
        ink(p, "#1c6fa8");
    }, { frames: 2 });
    // Boss: Baron Gloam, a thundercloud in a tin crown.
    A.paint("boss", 72, 60, (p, f) => {
        // f: 0,1 idle  2 charge  3 hurt  4 dizzy
        const c = f === 3 ? ["#ffffff", "#ffc8d0", "#ff8aa0", "#c84a70"] : f === 2 ? ["#b6a8e8", "#7f70c8", "#5a4aa0", "#3a2a70"] : ["#8d84c0", "#655a9c", "#463a7c", "#2e2558"];
        const b = f === 1 ? 1 : 0;
        puff(p, [[16, 30 + b, 14], [30, 22, 18], [46, 23, 17], [59, 32 + b, 12], [24, 38, 14], [44, 40, 15], [36, 32, 20]], c, [8, 54]);
        ink(p, PAL.ink);
        // Crown.
        const cx = 36, top = 2 + b;
        p.poly([[cx - 13, top + 13], [cx - 13, top + 2], [cx - 7, top + 7], [cx, top], [cx + 7, top + 7], [cx + 13, top + 2], [cx + 13, top + 13]], PAL.gold);
        fill(p, cx - 13, top + 10, 26, 3, PAL.gold2); fill(p, cx - 13, top + 13, 26, 1, PAL.ink);
        put(p, cx, top + 3, PAL.red); put(p, cx - 7, top + 8, PAL.teal); put(p, cx + 7, top + 8, PAL.teal);
        // Face.
        if (f === 4) {
            for (const s of [-1, 1]) { const x = cx + s * 12; fill(p, x - 4, 28, 9, 2, PAL.ink); fill(p, x - 1, 25, 2, 8, PAL.ink); }
            disc(p, cx, 40, 3, 4, PAL.ink);
        } else {
            for (const s of [-1, 1]) {
                const x = cx + s * 12;
                disc(p, x, 28, 6, 7, PAL.white);
                if (f === 3) { fill(p, x - 3, 27, 7, 2, PAL.ink); } else { disc(p, x - s * -1 - 0, 29, 3, 3, f === 2 ? PAL.red : PAL.ink); put(p, x + 1, 27, PAL.white); }
                for (let i = 0; i < 9; i++) { fill(p, x - 6 + i - (s < 0 ? 0 : 0), 21 + (s < 0 ? i >> 1 : 4 - (i >> 1)), 3, 2, PAL.ink); }
            }
            // Grim moustache-frown with teeth.
            fill(p, cx - 11, 41, 22, 7, PAL.ink); fill(p, cx - 9, 42, 18, 2, PAL.white); for (let i = 0; i < 5; i++) fill(p, cx - 8 + i * 4, 42, 1, 2, PAL.ink);
            fill(p, cx - 13, 39, 5, 2, PAL.ink); fill(p, cx + 9, 39, 5, 2, PAL.ink);
        }
    }, { frames: 5 });
    A.paint("bolt_warn", 16, 16, (p, f) => { p.poly([[8, 1], [15, 14], [1, 14]], f ? PAL.gold : PAL.red); fill(p, 7, 5, 2, 5, PAL.ink); fill(p, 7, 11, 2, 2, PAL.ink); }, { frames: 2 });
    A.paint("lightning", 24, 32, (p, f) => {
        const pts = f ? [[12, 0], [6, 12], [14, 12], [8, 32]] : [[10, 0], [16, 12], [8, 12], [14, 32]];
        for (let i = 0; i < 3; i++) { const [a, b] = [pts[i], pts[i + 1]], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; fill(p, x - 2, y, 5, 1, "#ffe36a"); fill(p, x - 1, y, 3, 1, "#ffffff"); } }
    }, { frames: 2 });
}

function paintItems(game) {
    const A = game.assets, P = PAL;
    A.paint("sunberry", 16, 16, (p, f) => {
        // A plump glowing berry with a leaf and a smile.
        disc(p, 8, 10, 6, 6, P.gold2); disc(p, 7, 9, 5, 5, P.gold); disc(p, 6, 8, 2, 2, P.gold4);
        fill(p, 8, 2, 1, 3, P.wood2); p.poly([[9, 3], [14, 1], [13, 5]], P.green); put(p, 11, 3, P.green2);
        fill(p, 5, 9, 1, 2, P.ink); fill(p, 10, 9, 1, 2, P.ink); fill(p, 7, 12, 2, 1, P.ink);
        ink(p, P.ink);
    });
    A.paint("zapple", 16, 16, (p, f) => {
        // An apple that crackles.
        disc(p, 8, 10, 6, 6, f ? "#3ed6e4" : "#26b8d8"); disc(p, 6, 8, 3, 3, f ? "#e2fff4" : "#a8f6ff");
        for (const [x, y] of [[9, 6], [8, 7], [7, 8], [9, 8], [8, 9], [7, 10], [8, 10]]) put(p, x, y, P.gold4);
        fill(p, 8, 2, 1, 3, P.wood2); p.poly([[9, 3], [14, 2], [12, 5]], P.green);
        ink(p, P.ink);
    }, { frames: 2 });
    A.paint("boot", 16, 16, (p) => {
        fill(p, 3, 2, 8, 8, P.red); fill(p, 3, 2, 2, 8, P.pink); fill(p, 3, 9, 12, 4, P.red); fill(p, 3, 13, 12, 2, P.red2); fill(p, 11, 10, 2, 1, P.pink); fill(p, 3, 2, 8, 2, "#fff8ea");
        ink(p, P.ink);
    });
    A.paint("rainbow", 16, 16, (p, f) => {
        const c = [P.red, P.gold, P.green, P.teal, P.blue, P.purple];
        for (let y = 2; y < 15; y++) { const w = Math.min(6, (y - 1) * 0.7 + 1 | 0), col = c[(y + f) % 6]; if (y > 12) { fill(p, 8 - (15 - y) * 2, y, (15 - y) * 4, 1, col); continue; } fill(p, 8 - w, y, w * 2, 1, col); }
        put(p, 6, 8, P.white); put(p, 5, 9, P.white);
        ink(p, P.ink);
    }, { frames: 6 });
    A.paint("medal", 16, 16, (p, f) => {
        const w = [6, 4, 2, 4][f];
        disc(p, 8, 8, w, 7, P.teal); disc(p, 8, 8, Math.max(1, w - 2), 5, "#b6fff0");
        if (w > 3) { p.poly([[8, 5], [10, 8], [8, 11], [6, 8]], P.gold); }
        ink(p, P.ink);
    }, { frames: 4 });
}

// --- Bitmap font: 5x7 glyphs, thickened one pixel for that chunky arcade weight, baked with an outline. ---
const GLYPHS = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 17, 17, 17, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    ".": [0, 0, 0, 0, 0, 12, 12], ",": [0, 0, 0, 0, 12, 4, 8], "!": [4, 4, 4, 4, 4, 0, 4], "?": [14, 17, 1, 2, 4, 0, 4], ":": [0, 12, 12, 0, 12, 12, 0], "-": [0, 0, 0, 31, 0, 0, 0],
    "+": [0, 4, 4, 31, 4, 4, 0], "/": [1, 1, 2, 4, 8, 16, 16], "'": [4, 4, 8, 0, 0, 0, 0], x: [0, 0, 17, 10, 4, 10, 17], ">": [8, 4, 2, 1, 2, 4, 8], "<": [2, 4, 8, 16, 8, 4, 2], "*": [0, 21, 14, 31, 14, 21, 0], "=": [0, 0, 31, 0, 31, 0, 0],
};
export const FONT_CHARS = Object.keys(GLYPHS).join("") + " ";
export const FONT_W = 8, FONT_H = 10, FONT_ADV = 7;
function paintFont(game) {
    const chars = [...FONT_CHARS];
    game.assets.paint("font", FONT_W, FONT_H, (p, f) => {
        const g = GLYPHS[chars[f]];
        if (!g) return;
        // Bold by thickening right, but never into a gap: M, W and 0 stay readable.
        const on = new Set();
        for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y] >> (4 - x) & 1) {
            on.add(`${x},${y}`);
            const r1 = x < 4 && (g[y] >> (3 - x) & 1), r2 = x < 3 && (g[y] >> (2 - x) & 1);
            if (!r1 && !r2) on.add(`${x + 1},${y}`);
        }
        const dark = PAL.ink;
        for (const k of on) { const [x, y] = k.split(",").map(Number); for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]) put(p, x + 1 + dx, y + 1 + dy, dark); }
        for (const k of on) { const [x, y] = k.split(",").map(Number); put(p, x + 1, y + 1, "#ffffff"); }
    }, { frames: chars.length });
}

// --- Logo ------------------------------------------------------------------------------------------
function paintLogo(game) {
    const big = (p, text, x0, y0, s, c1, c2, c3) => {
        // Chunky letters from the font, doubled and then rounded.
        let x = x0;
        for (const ch of text) {
            const g = GLYPHS[ch];
            for (let y = 0; y < 7; y++) for (let i = 0; i < 5; i++) if (g[y] >> (4 - i) & 1) {
                for (let a = 0; a < s + 1; a++) for (let b = 0; b < s; b++) {
                    const py = y0 + y * s + b, t = (y * s + b) / (7 * s);
                    put(p, x + i * s + a, py, t < 0.28 ? "#fff6b0" : t < 0.55 ? c1 : dither(x + a, py, (t - 0.55) * 2.2) ? c3 : c2);
                }
            }
            x += 5 * s + s + 1;
        }
    };
    game.assets.paint("logo", 220, 92, (p) => {
        big(p, "PUDDLE", 3, 3, 5, PAL.gold, PAL.gold2, PAL.gold3);
        big(p, "PIP", 58, 46, 6, "#7fe8f0", "#3ec0e8", "#2878d0");
        ink(p, PAL.ink); ink(p, PAL.ink);
        // Drop shadow.
        const copy = p.data.slice();
        for (let y = p.height - 4; y >= 0; y--) for (let x = 0; x < p.width - 1; x++) {
            const o = p.index(x, y); if (!copy[o + 3]) continue;
            const q = p.index(x, y + 3); if (!copy[q + 3] && y + 3 < p.height) { p.data[q] = 0x5d; p.data[q + 1] = 0x33; p.data[q + 2] = 0x9e; p.data[q + 3] = 255; }
        }
        // A raindrop above the I of PIP.
        const dx = 113;
        p.poly([[dx, 34], [dx + 5, 44], [dx - 5, 44]], "#8fd8ff"); disc(p, dx, 44, 5, 4.5, "#8fd8ff"); disc(p, dx - 2, 44, 1.6, 2, "#ffffff");
    });
}

// --- Overworld map ---------------------------------------------------------------------------------
function paintMap(game) {
    const W = 660, H = 300;
    game.assets.paint("mapbg", W, H, (p) => {
        // Sea, three islands of colour, then details.
        const land = (x, y) => {
            const yy = y / H, n = Math.sin(x * 0.03 + 1) * 10 + Math.sin(x * 0.011) * 14 + Math.sin(x * 0.07 + y * 0.03) * 5;
            return y > 34 + n * 0.7 && y < H - 40 + n && x > 22 + Math.sin(y * 0.05) * 8 && x < W - 22 + Math.sin(y * 0.04) * 8;
        };
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            if (land(x, y)) {
                const edge = !land(x, y - 6) || !land(x, y + 6) || !land(x - 6, y) || !land(x + 6, y);
                const t = x / W + Math.sin(y * 0.05) * 0.015;
                let c;
                if (t < 0.36) c = hash(x >> 2, y >> 2) < 0.14 ? "#58c858" : hash(x >> 1, y >> 1) < 0.1 ? "#9ce66a" : "#74d65e";
                else if (t < 0.40) c = dither(x, y, (t - 0.36) / 0.04) ? "#5a6a9c" : "#74d65e";
                else if (t < 0.68) c = hash(x >> 2, y >> 2) < 0.2 ? "#4c5a8e" : "#5a6a9c";
                else if (t < 0.72) c = dither(x, y, (t - 0.68) / 0.04) ? "#3a2c5c" : "#5a6a9c";
                else c = hash(x >> 2, y >> 2) < 0.2 ? "#2e2350" : "#3a2c5c";
                put(p, x, y, edge ? (t < 0.37 ? "#f4e0a0" : t < 0.7 ? "#8a9ac8" : "#5a4a80") : c);
            } else {
                const w = Math.sin((x + y * 2) * 0.12) + Math.sin(y * 0.3 + x * 0.02);
                put(p, x, y, w > 1.25 ? "#a8e4f8" : dither(x, y, 0.5 + w * 0.2) ? "#3f8fe0" : "#3580d4");
            }
        }
        const tree = (x, y) => { fill(p, x - 1, y, 2, 4, PAL.wood2); disc(p, x, y - 3, 5, 5, "#2d9a52"); disc(p, x - 1, y - 4, 3, 3, "#62c944"); put(p, x - 2, y - 6, "#c4f07a"); };
        const hill = (x, y, r) => { disc(p, x, y, r, r * 0.7, "#58c858"); disc(p, x - 2, y - 2, r * 0.6, r * 0.4, "#9ce66a"); };
        const peak = (x, y, h, c1, c2, c3) => { for (let j = 0; j < h; j++) { const w = j * 0.8; for (let i = -w; i <= w; i++) put(p, x + i, y - h + j, j < h * 0.25 ? c3 : i < 0 ? c1 : c2); } };
        for (let i = 0; i < 46; i++) { const x = 40 + hash(i, 1) * 190, y = 60 + hash(i, 2) * 170; if (i % 7 === 0) hill(x, y, 11); else tree(x | 0, y | 0); }
        for (let i = 0; i < 26; i++) { const x = 270 + hash(i, 3) * 170, y = 70 + hash(i, 4) * 150; peak(x | 0, y | 0, 14 + hash(i, 5) * 22 | 0, "#8a9ac8", "#3e4a7a", "#e6f0ff"); }
        for (let i = 0; i < 28; i++) { const x = 470 + hash(i, 6) * 170, y = 60 + hash(i, 7) * 170; peak(x | 0, y | 0, 8 + hash(i, 8) * 16 | 0, "#5a4a80", "#1f1838", "#8a78b8"); }
        // Stormkeep on the far end.
        const cx = 588, cy = 128;
        fill(p, cx - 34, cy - 30, 68, 44, "#1f1838");
        for (const [x, w, h] of [[-38, 14, 54], [-8, 16, 74], [24, 14, 60]]) { fill(p, cx + x, cy + 14 - h, w, h, "#2e2350"); fill(p, cx + x, cy + 14 - h, 3, h, "#5a4a80"); for (let i = 0; i < w; i += 4) fill(p, cx + x + i, cy + 10 - h, 2, 4, "#2e2350"); fill(p, cx + x + (w >> 1) - 1, cy + 22 - h, 2, 4, "#ffcf6a"); }
        fill(p, cx - 6, cy - 2, 12, 16, "#14102a");
        for (let i = 0; i < 16; i++) { const x = 500 + hash(i, 9) * 150 | 0, y = 18 + hash(i, 10) * 24 | 0; disc(p, x, y, 16, 7, "#2a2448"); disc(p, x - 3, y - 2, 10, 4, "#3e3670"); }
        // Drainworks cave mouth.
        const gx = 345, gy = 164;
        disc(p, gx, gy, 18, 15, "#2a3160"); disc(p, gx, gy + 2, 12, 11, "#0d1030");
        // Sparkling sea.
        for (let i = 0; i < 40; i++) { const x = hash(i, 11) * W, y = hash(i, 12) < 0.5 ? 6 + hash(i, 13) * 18 : H - 24 + hash(i, 13) * 18; fill(p, x, y, 5, 1, "#a8e4f8"); }
    });
    game.assets.paint("mapnode", 16, 16, (p, f) => {
        // f: 0 locked, 1 open, 2 cleared
        const c = [["#6e6a8c", "#a8a4c0"], [PAL.red, PAL.pink], [PAL.gold2, PAL.gold4]][f];
        disc(p, 8, 8, 6.5, 6.5, c[0]); disc(p, 7, 6, 4, 3.5, c[1]);
        if (f === 0) fill(p, 7, 5, 2, 6, PAL.ink);
        if (f === 2) { fill(p, 4, 8, 2, 2, PAL.ink); fill(p, 6, 10, 2, 2, PAL.ink); fill(p, 8, 8, 2, 2, PAL.ink); fill(p, 10, 6, 2, 2, PAL.ink); }
        ink(p, PAL.ink);
    }, { frames: 3 });
    game.assets.paint("mapcastle", 24, 24, (p, f) => {
        fill(p, 3, 8, 18, 16, "#6f6890"); fill(p, 3, 8, 3, 16, "#9a93b8");
        for (const x of [3, 9, 15]) fill(p, x, 4, 4, 5, "#6f6890");
        fill(p, 9, 14, 6, 10, PAL.ink); disc(p, 12, 14, 3, 3, PAL.ink);
        fill(p, 11, 0, 1, 5, PAL.ink); fill(p, 12, 0, 5, 3, f ? PAL.gold : PAL.red);
        ink(p, PAL.ink);
    }, { frames: 2 });
}

/** Panel texture for the portrait control deck. */
function paintDeck(game) {
    game.assets.paint("deck", 32, 32, (p) => {
        for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
            const c = dither(x, y, 0.25 + 0.2 * Math.sin((x + y) / 32 * Math.PI * 2)) ? "#332153" : "#2a1a48";
            put(p, x, y, c);
        }
        put(p, 4, 4, "#55397e"); put(p, 20, 20, "#55397e");
    });
    game.assets.paint("padbtn", 48, 48, (p, f) => {
        // f 0 jump (gold), 1 jump pressed, 2 run (teal), 3 run pressed
        const [a, b, c] = f < 2 ? [PAL.gold, PAL.gold3, PAL.gold4] : ["#3ed6c4", "#1c8f9a", "#b6fff0"], dn = f % 2;
        disc(p, 24, 26, 22, 21, PAL.ink); disc(p, 24, 27, 21, 19, b);
        if (!dn) { disc(p, 24, 24, 20, 19, a); disc(p, 20, 18, 11, 8, c); disc(p, 24, 24, 15, 14, a); }
        else disc(p, 24, 27, 20, 18, a);
    }, { frames: 4 });
    game.assets.paint("padbase", 64, 64, (p) => {
        disc(p, 32, 32, 31, 31, PAL.ink); disc(p, 32, 32, 29, 29, "#3a2a5c"); disc(p, 32, 32, 26, 26, "#2a1a48");
        for (const [x, y, w, h] of [[28, 8, 8, 3], [30, 5, 4, 3], [28, 53, 8, 3], [30, 56, 4, 3], [8, 28, 3, 8], [5, 30, 3, 4], [53, 28, 3, 8], [56, 30, 3, 4]]) fill(p, x, y, w, h, "#8e87ac");
    });
    game.assets.paint("padknob", 32, 32, (p) => { disc(p, 16, 17, 15, 14, PAL.ink); disc(p, 16, 17, 14, 13, "#8e87ac"); disc(p, 16, 15, 13, 12, "#c2bcd8"); disc(p, 13, 11, 6, 4, "#efeaf8"); });
    game.assets.paint("hudcoin", 8, 8, (p) => { disc(p, 4, 4, 3.5, 3.5, PAL.gold); fill(p, 3, 2, 2, 4, PAL.gold4); fill(p, 5, 2, 1, 4, PAL.gold3); ink(p, PAL.ink); });
    game.assets.paint("hudpip", 16, 12, (p) => { stamp(p, HEAD, 0, 1, PIP); });
    game.assets.paint("hudclock", 8, 8, (p) => { disc(p, 4, 4, 3.5, 3.5, PAL.white); fill(p, 4, 2, 1, 3, PAL.ink); fill(p, 4, 4, 2, 1, PAL.ink); ink(p, PAL.ink); });
    game.assets.paint("hudpause", 12, 12, (p) => { fill(p, 3, 2, 2, 8, PAL.white); fill(p, 7, 2, 2, 8, PAL.white); ink(p, PAL.ink); });
    game.assets.paint("heartpip", 8, 8, (p) => { fill(p, 2, 2, 4, 4, PAL.red); });
}

export function defineArt(game) {
    for (const [k, th] of Object.entries(THEMES)) paintTiles(game, `tiles_${k}`, th);
    paintBackdrops(game);
    paintDecor(game);
    paintHero(game);
    paintEnemies(game);
    paintItems(game);
    paintFont(game);
    paintLogo(game);
    paintMap(game);
    paintDeck(game);
}
