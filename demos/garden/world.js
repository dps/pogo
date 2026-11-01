// Paints the ground of each garden, and Gran's cottage, into their own textures.
import { COLS, LEVELS, ROWS, SEASONS } from "./data.js";
import { Brush, mix, noise, rgb } from "./paint.js";

export const P = 72;     // texture pixels per cell

function upload(game, name, w, h, b) {
    const assets = game.assets;
    let a = null;
    try { a = assets.sprite(name); } catch { /* first time */ }
    if (a) {
        // Reuse the texture: a new asset per level would leak GPU memory.
        const data = new Uint8Array(w * h * 4);
        b.blit(data, w, 0, 0);
        a.data = data; a.width = w; a.height = h; a.frameW = w; a.frameH = h;
        const t = game.renderer?.textures?.get?.(a);
        if (t) t.loaded = false;
    } else assets.paint(name, w, h, (p) => b.blit(p.data, w, 0, 0), { smooth: true, mipmaps: false });
}

/** Lawn, paths, pond and beds for a map, in one orientation. The margin of one cell is hedge and wall. */
export function paintGarden(game, levelIndex, seasonName, portrait) {
    const key = `${levelIndex}|${seasonName}|${portrait}`;
    if (game._gardenKey === key) return;
    game._gardenKey = key;
    const lv = LEVELS[levelIndex], map = lv.map, season = SEASONS[seasonName], winter = seasonName === "winter", autumn = seasonName === "autumn";
    const tw = (portrait ? COLS + 2 : ROWS + 2) * P, th = (portrait ? ROWS + 2 : COLS + 2) * P;
    const b = new Brush(tw, th, levelIndex * 11 + 5);
    const at = (c, r) => (portrait ? [(c + 1) * P, (r + 1) * P] : [(ROWS - r) * P, (c + 1) * P]);
    const g0 = rgb(season.grass[0]), g1 = rgb(season.grass[1]), g2 = rgb(season.grass[2]);
    const px = b.px;

    // Mown lawn: broad light and shade, soft mowing squares, little dabs of darker grass.
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const o = (y * tw + x) * 4;
        const u = x / P, v = y / P, check = ((u | 0) + (v | 0)) & 1;
        const n1 = noise(x >> 1, y >> 1), n2 = noise((x * 2.3) | 0, (y * 2.3) | 0), n3 = noise((x * 5) | 0, (y * 1.6) | 0);
        let t = Math.max(0, Math.min(1, (n1 - 0.32) * 2.8));
        let r = g0[0] + (g1[0] - g0[0]) * t, g = g0[1] + (g1[1] - g0[1]) * t, bl = g0[2] + (g1[2] - g0[2]) * t;
        const dark = Math.max(0, (n2 - 0.56) * 4);
        r += (g2[0] - r) * Math.min(1, dark); g += (g2[1] - g) * Math.min(1, dark); bl += (g2[2] - bl) * Math.min(1, dark);
        const k = (check ? 1.045 : 0.975) + (n3 - 0.5) * 0.16;
        px[o] = r * k; px[o + 1] = g * k; px[o + 2] = bl * k; px[o + 3] = 1;
    }

    // Tufts, daisies, fallen things. Painted once, cheap, and they stop the lawn looking like a texture.
    let s = levelIndex * 131 + 7;
    const rnd = () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 4294967296; };
    for (let i = 0; i < 520; i++) {
        const x = rnd() * tw, y = rnd() * th, k = rnd();
        if (winter) { if (k < 0.3) b.stroke([[x, y], [x + 2, y - 7]], [2, 0.6], "#7f9a7a88", { tex: 0 }); continue; }
        const c = mix(season.grass[2], season.grass[1], rnd() * 0.4);
        if (k < 0.8) b.stroke([[x, y], [x + (rnd() - 0.5) * 7, y - 8 - rnd() * 6]], [2.6, 0.5], c, { tex: 0 });
        else if (k < 0.92) { const dc = autumn ? ["#d8862e", "#c8553d", "#e0b13c"][i % 3] : seasonName === "summer" ? "#f3d96b" : "#fbf8ee"; b.circle(x, y, 2.4, dc, { tex: 0, wob: 0.2 }); if (!autumn) b.circle(x, y, 0.9, "#e0a72e", { tex: 0, wob: 0, light: 0 }); }
    }

    const cell = (c, r) => (c >= 0 && r >= 0 && c < COLS && r < ROWS ? map[r][c] : " ");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const ch = map[r][c], [x, y] = at(c, r), cx = x + P / 2, cy = y + P / 2;
        if (ch === ",") {
            // Flagstones, which nothing can be planted on.
            b.blob(cx, cy, P * 0.5, P * 0.47, "#6f6658", { wob: 0.05, tex: 0.2, light: 0.2, edge: 0 });
            const q = P / 4.1;
            b.blob(cx - q, cy - q, q * 0.92, q * 0.86, winter ? "#dfe6e8" : "#c9c0ad", { hi: "#efe9da", lo: "#8d8574", wob: 0.08, freq: 2 });
            b.blob(cx + q, cy - q * 0.8, q * 0.88, q * 0.95, winter ? "#d4dde0" : "#b9b09d", { hi: "#e6e0d0", lo: "#8d8574", wob: 0.08, freq: 2 });
            b.blob(cx - q * 0.7, cy + q, q * 1.1, q * 0.86, winter ? "#d4dde0" : "#bdb4a1", { hi: "#e6e0d0", lo: "#8d8574", wob: 0.08, freq: 2 });
            b.blob(cx + q * 1.2, cy + q, q * 0.74, q * 0.8, winter ? "#e6ecee" : "#cfc6b3", { hi: "#efe9da", lo: "#8d8574", wob: 0.08, freq: 2 });
        } else if (ch === "*") {
            b.blob(cx, cy, P * 0.5, P * 0.44, "#3f2a1c", { wob: 0.14, tex: 0.1, light: 0.2, edge: 0 });
            b.blob(cx, cy, P * 0.45, P * 0.39, "#5a3b28", { wob: 0.16, tex: 0.8, hi: "#8a6248", lo: "#2f1f15", freq: 4 });
            for (let i = 0; i < 3; i++) { const fx = cx - 18 + i * 18, fy = cy + (i % 2 ? 6 : -6); b.stroke([[fx, fy + 6], [fx, fy - 4]], 2.4, "#6f9a49", { tex: 0 }); b.blob(fx - 4, fy - 6, 5, 3, "#8fbf5a", { rot: -0.5, tex: 0.1 }); b.blob(fx + 4, fy - 6, 5, 3, "#8fbf5a", { rot: 0.5, tex: 0.1 }); }
        } else if (ch === "S") {
            b.blob(cx, cy, P * 0.56, P * 0.5, "#a68e6c", { wob: 0.2, tex: 0.6, hi: "#d4c29e", lo: "#6d5a42", freq: 4 });
        } else if (ch === "G") {
            b.blob(cx, cy, P * 0.72, P * 0.6, "#d9b44a", { wob: 0.26, tex: 0.9, hi: "#f4e0a0", lo: "#9a7a2c", freq: 6 });
        }
    }

    // Beds: joined, edged with brick, full of dark soil.
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (map[r][c] === "b" || map[r][c] === "p") {
        const [x, y] = at(c, r);
        b.blob(x + P / 2, y + P / 2, P * 0.58, P * 0.56, "#4a3225", { wob: 0.05, tex: 0.1, light: 0.1, edge: 0, sq: true });
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (map[r][c] === "b") {
        const [x, y] = at(c, r);
        b.blob(x + P / 2, y + P / 2, P * 0.53, P * 0.51, winter ? "#e8eff1" : "#65452f", { sq: true, wob: 0.1, tex: winter ? 0.2 : 0.9, hi: winter ? "#ffffff" : "#8e6a4c", lo: winter ? "#b5cfdb" : "#3a261a", freq: 5 });
    } else if (map[r][c] === "p") {
        const [x, y] = at(c, r);
        b.blob(x + P / 2, y + P / 2, P * 0.53, P * 0.51, winter ? "#dbe4e6" : "#b5a78e", { sq: true, wob: 0.1, tex: 0.7, hi: "#e0d6c0", lo: "#7f7362", freq: 4 });
    }

    // Pond: rim first, then water, then lilies.
    const pond = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (map[r][c] === "~") pond.push(at(c, r));
    for (const [x, y] of pond) b.blob(x + P / 2, y + P / 2, P * 0.6, P * 0.6, winter ? "#c2cfd6" : "#a59c8c", { sq: true, wob: 0.06, tex: 0.6, hi: "#e0d9c9", lo: "#6d6658", freq: 3 });
    for (const [x, y] of pond) b.blob(x + P / 2, y + P / 2, P * 0.56, P * 0.56, winter ? "#c7e3ef" : "#5b98ad", { sq: true, wob: 0.04, tex: 0.5, hi: winter ? "#f4fbfd" : "#a8dcdc", lo: winter ? "#8fbfd4" : "#2f6579", edge: 0, light: 0.5 });
    if (!winter) for (const [x, y] of pond) {
        for (let i = 0; i < 2; i++) { const lx = x + 14 + rnd() * (P - 28), ly = y + 14 + rnd() * (P - 28); b.blob(lx, ly, 11, 8, "#6f9f55", { hi: "#b6d27f", tex: 0.2, wob: 0.1 }); if (i === 0) b.circle(lx + 2, ly - 2, 4.6, "#f3c6d2", { hi: "#fff", tex: 0.1 }); }
    } else for (const [x, y] of pond) b.line(x + 10, y + 12, x + P - 16, y + P - 20, 1.5, "#ffffffbb", { tex: 0 });

    // The rim of the garden: thick hedge down the sides, picket and shrubs by the cottage.
    const dab = (x, y, r, c, o) => b.blob(x, y, r, r * 0.8, c, { wob: 0.25, tex: 0.8, freq: 5, ...o });
    const hedge = winter ? ["#7f9a8c", "#b9cdd0", "#e8f0f2"] : autumn ? ["#5f6f3a", "#a57a35", "#d8a64a"] : ["#355f39", "#5f8a4b", "#8fb06a"];
    const rim = (x0, y0, x1, y1) => {
        for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 700; i++) {
            const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), k = rnd();
            dab(x, y, 15 + rnd() * 12, hedge[k < 0.45 ? 0 : k < 0.85 ? 1 : 2], { lo: "#2a4230", hi: hedge[2] });
        }
    };
    const m = P * 0.72;
    if (portrait) { rim(0, 0, m, th); rim(tw - m, 0, tw, th); rim(0, th - m * 0.9, tw, th); }
    else { rim(0, 0, tw, m); rim(0, th - m, tw, th); rim(0, 0, m * 0.9, th); }

    upload(game, "garden", tw, th, b);
}

/** One long ground for the garden path, running spring (bottom) to winter (top). */
export function paintPathGround(game) {
    const W = 360, H = 1560, b = new Brush(W, H, 9), px = b.px;
    const stops = [["#e8f0f2", "#c9d7dd"], ["#c49a55", "#a97f3f"], ["#c8bf62", "#a8a34a"], ["#93be63", "#6f9e4b"]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, f = Math.max(0, Math.min(2.999, (y + (noise(x >> 1, y >> 2) - 0.5) * 150) / H * 4 - 0.5)), i = f | 0, t = Math.min(1, (f - i) * 1.6), n = noise(x * 2, y * 2), m = noise(x * 5 | 0, y) - 0.5;
        const a = rgb(stops[i][0]), c = rgb(stops[Math.min(3, i + 1)][0]), d = rgb(stops[i][1]);
        const k = Math.max(0, Math.min(1, (n - 0.42) * 3));
        for (let ch = 0; ch < 3; ch++) { const v = a[ch] + (c[ch] - a[ch]) * t; px[o + ch] = (v + (d[ch] - v) * k * (1 - t)) * (1 + m * 0.16); }
        px[o + 3] = 1;
    }
    let s = 77; const rnd = () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 4294967296; };
    for (let i = 0; i < 900; i++) { const x = rnd() * W, y = rnd() * H; b.stroke([[x, y], [x + rnd() * 3 - 1.5, y - 3 - rnd() * 4]], [2, 0.5], "#00000022", { tex: 0 }); }
    upload(game, "pathground", W, H, b);
}

/** Gran's cottage front. Window centre is (WINDOW.x, WINDOW.y) in a 720x300 picture. */
export const WINDOW = { x: 112, y: 186, w: 138, h: 140 };
export function paintCottage(game, sync) {
    const W = 720, H = 300, b = new Brush(W, H, 3);
    const px = b.px;
    // Plaster, warm and uneven
    for (let y = 92; y < H; y++) for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4, n = noise(x, y) - 0.5, n2 = noise(x * 3, y * 3) - 0.5, shade = 1 - (y - 92) / 900;
        px[o] = (0.96 + n * 0.1 + n2 * 0.03) * shade; px[o + 1] = (0.9 + n * 0.1 + n2 * 0.03) * shade; px[o + 2] = (0.76 + n * 0.12 + n2 * 0.03) * shade; px[o + 3] = 1;
    }
    // Timber frame
    const beam = "#5e3f2a";
    const timber = (x0, y0, x1, y1, w = 13) => { b.line(x0 + 2, y0 + 3, x1 + 2, y1 + 3, w + 2, "#00000033", { tex: 0 }); b.line(x0, y0, x1, y1, w, beam, { lo: "#3a261a", tex: 0.8 }); };
    timber(0, 120, W, 120); timber(0, 292, W, 292, 15);
    for (const x of [228, 400, 568, 706]) timber(x, 120, x, 292);
    timber(240, 288, 392, 128); timber(392, 288, 240, 128); timber(580, 288, 700, 128);
    // Door, blue and cheerful
    b.blob(484, 216, 60, 106, "#3a261a", { wob: 0.01, tex: 0, light: 0, edge: 0 });
    b.poly([[432, 300], [432, 170], [484, 128], [536, 170], [536, 300]], "#4d7ea8", { lo: "#2d506e", tex: 0.7 });
    for (const x of [458, 510]) b.line(x, 172, x, 300, 2.5, "#2d506e", { tex: 0 });
    b.circle(522, 232, 6, "#e0c24a", { tex: 0.1 });
    b.circle(484, 170, 15, "#f6ecd2", { tex: 0.1, lo: "#8fa6bd" });
    // Window frame and sill, with a dark room behind for Gran
    const { x: wx, y: wy, w: ww, h: wh } = WINDOW;
    b.blob(wx, wy, ww / 2 + 16, wh / 2 + 16, "#4f3423", { wob: 0.02, tex: 0.5, edge: 0, light: 0.4 });
    b.poly([[wx - ww / 2, wy - wh / 2], [wx + ww / 2, wy - wh / 2], [wx + ww / 2, wy + wh / 2], [wx - ww / 2, wy + wh / 2]], "#4a3b3a", { lo: "#2c2228", tex: 0.5 });
    b.blob(wx, wy - 10, 50, 52, "#7a6158", { tex: 0.3, light: 0.3, edge: 0 });
    b.poly([[wx - ww / 2, wy - wh / 2], [wx - ww / 2 + 30, wy - wh / 2], [wx - ww / 2 + 14, wy + 30], [wx - ww / 2, wy + 40]], "#e7a2a8", { lo: "#b4666e", tex: 0.6 });
    b.poly([[wx + ww / 2, wy - wh / 2], [wx + ww / 2 - 30, wy - wh / 2], [wx + ww / 2 - 14, wy + 30], [wx + ww / 2, wy + 40]], "#e7a2a8", { lo: "#b4666e", tex: 0.6 });
    upload(game, "cottage", W, H, finishRoof(b, W));
    return b;
}
function finishRoof(b, W) {
    // Thatch, in long overlapping strokes
    for (let i = 0; i < 1500; i++) {
        const x = (i * 37.31) % W, y = ((i * 91.7) % 124) - 8, l = 26 + (i % 7) * 4, c = ["#c8a356", "#b18c44", "#d9b970", "#9a7836"][i % 4];
        b.stroke([[x, y], [x + 4, y + l]], [5, 2], c, { tex: 0.3, straight: true });
    }
    for (let x = -10; x < W + 20; x += 15) b.stroke([[x, 108 + (x % 3)], [x + 6, 132 + (x % 5) * 1.4]], [10, 3], ["#b18c44", "#9a7836"][(x & 16) ? 0 : 1], { tex: 0.3, straight: true });
    for (let x = 0; x < W; x += 3) b.stroke([[x, 136 + (noise(x, 3) - 0.5) * 8], [x + 1, 142]], 2, "#00000018", { tex: 0, straight: true });
    // Chimney, stout and a bit crooked
    b.poly([[604, 60], [672, 56], [676, 8], [608, 4]], "#a8604a", { lo: "#6d3a2c", tex: 0.8 });
    for (const y of [16, 30, 44]) b.line(606, y, 674, y - 2, 2, "#5e3226", { tex: 0 });
    b.poly([[598, 8], [682, 4], [682, -6], [598, -2]], "#c8c0b0", { lo: "#807868" });
    // Climbing roses over the door
    b.stroke([[410, 296], [400, 240], [418, 190], [404, 140], [440, 112], [500, 108], [556, 124]], [7, 4], "#5a4a2a", { tex: 0.3 });
    for (let i = 0; i < 44; i++) {
        const t = i / 44, k = t * 2.2, x = k < 1 ? 408 + Math.sin(k * 7) * 12 + ((i * 37) % 30 - 15) : 404 + (k - 1) * 130 + ((i * 53) % 14 - 7), y = (k < 1 ? 296 - k * 170 : 122 + Math.sin(k * 5) * 10) + ((i * 29) % 16 - 8);
        b.blob(x, y, 10, 7, i % 3 ? "#5f8a4b" : "#3f6b3c", { wob: 0.3, tex: 0.6, rot: i });
        if (i % 3 === 1) { b.circle(x + 5, y - 2, 7.5, i % 2 ? "#d8495f" : "#f09aa8", { tex: 0.3 }); b.circle(x + 5, y - 2, 2.6, "#7e1a33", { tex: 0 }); }
    }
    return b;
}
