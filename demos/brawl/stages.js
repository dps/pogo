// Six floors of one school. Each stage paints one sheet on entry: a repeating wall, a repeating floor and some set dressing. The wall
// and floor scroll in true perspective with the actors. All of it is deliberately paler than the cast, so fighters pop.
import { Sheet, Brush, add, blend, blends, box, cut, disc, hex, meet, mix, oval, polygon, round, seg } from "./paint.js";
import { C } from "./art.js";

export const WALL_W = 512, WALL_H = 372, FLOOR_T = 256, BG_U = 2;
const SH_W = 2048, SH_H = 1024;
const soft = "#6a5a78";

// Direct rectangle: walls are mostly flat colour and must paint fast.
function rect(p, x, y, w, h, col) { const [r, g, b] = hex(col), S = p.stride, d = p.data; for (let j = y; j < y + h; j++) { let o = (j * S + (p.x0 ?? 0) + x) * 4; for (let i = 0; i < w; i++, o += 4) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; } } }
function vgrad(p, x, y, w, h, a, c) { const A = hex(a), B = hex(c), S = p.stride, d = p.data; for (let j = 0; j < h; j++) { const k = j / (h - 1), r = A[0] + (B[0] - A[0]) * k, g = A[1] + (B[1] - A[1]) * k, b = A[2] + (B[2] - A[2]) * k; let o = ((y + j) * S + (p.x0 ?? 0) + x) * 4; for (let i = 0; i < w; i++, o += 4) { d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; } } }
/** Halftone shade over a wall: a comic print feel, cheap to write. */
function halftone(p, x, y, w, h, col, fromBottom = true, size = 12, amt = 0.34) {
    const c = hex(col), S = p.stride, d = p.data;
    for (let j = 0; j < h; j++) {
        const k = fromBottom ? j / h : 1 - j / h, r = (0.1 + k * amt) * size;
        for (let i = 0; i < w; i++) {
            const u = (i + j) % size - size / 2, v = (i - j + 100000) % size - size / 2;
            if (u * u + v * v < r * r * 1.6) { const o = ((y + j) * S + (p.x0 ?? 0) + x + i) * 4; d[o] = d[o] * 0.86 + c[0] * 0.14; d[o + 1] = d[o + 1] * 0.86 + c[1] * 0.14; d[o + 2] = d[o + 2] * 0.86 + c[2] * 0.14; }
        }
    }
}
const line = soft;
const T = (b, f, col, o = {}) => b.toon(f, col, { ink: 1.5, inkColor: line, shade: 5, band: 4, ...o });

const THEMES = {
    cafeteria: {
        sky: "#ffeec8", tint: "#fff0d0",
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, H, "#ffeec8", "#ffd9a0");
            rect(p, 0, 410, W, 334, "#7fd8c8");            // Tiled wainscot.
            for (let y = 410; y < 744; y += 44) rect(p, 0, y, W, 2, "#5dbcb0");
            for (let y = 0; y < 8; y++) for (let x = (y % 2) * 30; x < W; x += 60) rect(p, x, 410 + y * 44, 2, 44, "#5dbcb0");
            rect(p, 0, 396, W, 16, "#ff9c6b"); rect(p, 0, 396, W, 3, "#d8704a");
            halftone(p, 0, 0, W, 410, "#ffb070", false);
            // Serving hatch with a sneeze guard, and a menu board nobody trusts.
            b.region(0, 0, W, H, 0, 0);
            T(b, box(250, 300, 300, 240, 8), "#fff4dc", { shade: 10 });
            T(b, box(250, 288, 262, 180, 4), "#b08860", { shade: 0, light: false });
            b.flat(box(250, 240, 262, 90), "#8a6848", 0.5);
            for (const x of [160, 228, 296, 340]) { T(b, oval(x, 356, 34, 13), "#d8e0ec", { shade: 4 }); T(b, oval(x, 352, 26, 8), ["#ffad33", "#8fd13f", "#c8604a", "#ffe08a"][(x / 7 | 0) % 4], { shade: 2 }); }
            T(b, box(250, 394, 322, 26, 4), "#a8b4cc", { shade: 5 });
            T(b, box(250, 120, 180, 64, 6), "#3a5a4e", { shade: 0, light: false });
            for (let i = 0; i < 3; i++) b.flat(box(240 + (i % 2) * 14, 102 + i * 18, 130 - i * 22, 5, 2), "#e8f4e0", 0.8);
            T(b, disc(720, 120, 44), "#fff4dc", { shade: 7 }); b.flat(seg(720, 120, 720, 90, 2.4), soft); b.flat(seg(720, 120, 744, 130, 2.4), soft);
            // Window with a sunny lawn.
            T(b, box(720, 290, 240, 170, 6), "#fff4dc", { shade: 6 }); T(b, box(720, 290, 214, 146, 2), "#a8e4f4", { shade: 0, light: false });
            b.flat(box(720, 348, 214, 30), "#8fd878"); b.flat(box(720, 290, 8, 146), "#fff4dc"); b.flat(box(720, 290, 214, 8), "#fff4dc");
        },
        floor(p, ox, oy) { const N = 4, s = FLOOR_T * BG_U / N; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) rect({ ...p, x0: 0, stride: p.stride, data: p.data }, ox + i * s, oy + j * s, s, s, (i + j) % 2 ? "#ffd7a8" : "#f47a5e"); },
    },
    lockers: {
        sky: "#fff0dc", tint: "#e0f0ff",
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, H, "#fff0dc", "#f0dfca");
            rect(p, 0, 660, W, 84, "#b8a890");
            const cols = ["#58a8c8", "#68b8d0"];
            for (let i = 0; i < 12; i++) {
                const x = 4 + i * 85, c = cols[i % 2];
                rect(p, x, 200, 80, 460, c); rect(p, x, 200, 2, 460, soft); rect(p, x + 78, 200, 2, 460, "#3e7f9c");
                rect(p, x + 2, 416, 76, 2, soft); for (let s = 0; s < 3; s++) { rect(p, x + 22, 226 + s * 14, 36, 5, "#3e7f9c"); rect(p, x + 22, 444 + s * 14, 36, 5, "#3e7f9c"); }
                rect(p, x + 64, 330, 7, 22, "#d8e4ec"); rect(p, x + 64, 540, 7, 22, "#d8e4ec");
            }
            rect(p, 0, 190, W, 12, "#4e8ea8");
            halftone(p, 0, 202, W, 458, "#2c6a8a", true);
            b.region(0, 0, W, H, 0, 0);
            T(b, box(300, 86, 400, 86, 8), C.mustard, { shade: 8 }); T(b, box(300, 86, 380, 66, 3), "#fff4dc", { shade: 0, light: false });
            for (const x of [160, 240, 330, 430]) T(b, polygon([[x - 16, 110], [x + 16, 110], [x + 8, 76], [x - 8, 76]]), C.tomato, { shade: 3 });
            T(b, box(800, 90, 150, 110, 8), C.pink, { shade: 6 }); b.flat(disc(800, 84, 30), "#fff4dc"); 
        },
        floor(p, ox, oy) { const s = FLOOR_T * BG_U; rect(p, ox, oy, s, s, "#d8d0dc"); for (let i = 0; i < 2600; i++) { const a = (i * 7919) % s, c = (i * 104729) % s; rect(p, ox + Math.min(a, s - 5), oy + Math.min(c, s - 5), 3 + i % 3, 2 + i % 3, ["#b8aec0", "#efe8ee", "#a0c0d0", "#e8b0a0"][i % 4]); } rect(p, ox, oy + s / 2, s, 8, "#58a8c8"); },
    },
    gym: {
        sky: "#ffd59a", tint: "#ffeac8",
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, H, "#ffd59a", "#f0b878");
            for (let y = 0; y < 16; y++) { rect(p, 0, y * 40 + 22, W, 2, "#d89a60"); for (let x = (y % 2) * 40; x < W; x += 80) rect(p, x, y * 40 + 22, 2, 40, "#d89a60"); }
            rect(p, 0, 560, W, 184, "#3f6fd0"); for (let x = 0; x < W; x += 170) rect(p, x, 560, 3, 184, "#2c4fa8"); rect(p, 0, 556, W, 6, "#22122e");
            halftone(p, 0, 0, W, 560, "#c06030", false);
            b.region(0, 0, W, H, 0, 0);
            // Bleachers.
            for (let i = 0; i < 5; i++) T(b, box(210, 330 + i * 46, 340 + i * 56, 34, 4), i % 2 ? "#ffcf6a" : "#f4b14e", { shade: 4 });
            for (let i = 0; i < 15; i++) { const col = [C.tomato, C.teal, C.blue, C.pink][i % 4]; const x = 70 + (i * 37) % 300, y = 300 + (i % 4) * 46; T(b, oval(x, y, 10, 13), col, { shade: 2, ink: 1.2 }); T(b, disc(x, y - 17, 9), "#ffc9a0", { shade: 2, ink: 1.2 }); }
            // Hoop and the scoreboard.
            T(b, box(780, 170, 170, 120, 6), "#fffdf4", { shade: 6 }); b.stroke(box(780, 190, 70, 50, 2), 2.4, C.tomato);
            b.stroke(oval(780, 240, 36, 9), 4, C.orange);
            for (let i = -3; i <= 3; i++) b.flat(seg(780 + i * 11, 244, 780 + i * 6, 288, 0.9), "#ffffff");
            T(b, box(500, 90, 170, 90, 6), "#2c2433", { shade: 0, light: false }); b.flat(box(450, 90, 50, 44, 3), C.tomato); b.flat(box(550, 90, 50, 44, 3), C.mustard);
        },
        floor(p, ox, oy) { const s = FLOOR_T * BG_U; rect(p, ox, oy, s, s, "#e8b070"); for (let j = 0; j < 12; j++) { const h = s / 12; rect(p, ox, oy + (j * h | 0), s, 2, "#c08040"); for (let i = 0; i < 4; i++) rect(p, ox + ((i * 137 + j * 71) % s), oy + (j * h | 0), 2, h | 0, "#c88a4e"); if (j % 3 === 0) rect(p, ox, oy + (j * h | 0) + 3, s, (h | 0) - 3, "#efbc80"); } rect(p, ox, oy + s - 80, s, 8, "#f4f1f6"); rect(p, ox + s - 120, oy, 8, s, "#f4f1f6"); },
    },
    lab: {
        sky: "#cfeee4", tint: "#d8fff0",
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, H, "#cfeee4", "#a0dcd0");
            rect(p, 0, 540, W, 204, "#6a8c96"); rect(p, 0, 530, W, 12, "#d8e4ec");
            halftone(p, 0, 0, W, 530, "#2a8a7a", true);
            for (let i = 0; i < 6; i++) rect(p, i * 170 + 20, 556, 140, 180, "#5a7a84");
            b.region(0, 0, W, H, 0, 0);
            // Chalkboard, shelves of glassware, and a chart of very real elements.
            T(b, box(250, 200, 360, 190, 6), "#c88a4e", { shade: 5 }); T(b, box(250, 200, 336, 166, 3), "#2f6858", { shade: 0, light: false });
            b.stroke(oval(200, 190, 60, 26), 2, "#e8fff0", 0.8); b.stroke(oval(200, 190, 26, 60), 2, "#e8fff0", 0.8); b.flat(disc(200, 190, 8), "#e8fff0");
            for (let i = 0; i < 4; i++) b.flat(box(340, 136 + i * 34, 90 - i * 10, 5, 2), "#e8fff0", 0.75);
            for (const y of [190, 340, 480]) { T(b, box(720, y, 330, 14, 3), "#c88a4e", { shade: 3 }); for (let i = 0; i < 6; i++) { const x = 580 + i * 56, c = [C.pink, C.lime, C.mustard, C.blue, C.orange, C.teal][(i + y) % 6]; T(b, polygon([[x - 6, y - 58], [x + 6, y - 58], [x + 6, y - 40], [x + 20, y - 7], [x - 20, y - 7], [x - 6, y - 40]]), "#e8fffa", { shade: 2 }); T(b, polygon([[x - 13, y - 24], [x + 13, y - 24], [x + 20, y - 7], [x - 20, y - 7]]), c, { shade: 3, ink: 0.6 }); } }
            for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) b.flat(box(90 + i * 38, 398 + j * 34, 32, 28, 3), [C.pink, C.mustard, C.teal, C.lime, C.blue][(i * 3 + j) % 5], 0.55);
        },
        floor(p, ox, oy) { const N = 4, s = FLOOR_T * BG_U / N; for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { rect(p, ox + i * s, oy + j * s, s, s, "#8ab8b0"); rect(p, ox + i * s + 3, oy + j * s + 3, s - 6, s - 6, (i * 3 + j * 5) % 7 === 0 ? "#b0dcc8" : "#a0ccc0"); } },
    },
    library: {
        sky: "#5e3a3e", tint: "#ffe8d8",
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, H, "#7a4f6a", "#4f3454");
            b.region(0, 0, W, H, 0, 0);
            // A wall of books, with an arched window of night sky.
            for (let c = 0; c < 4; c++) {
                const x0 = c * 256; rect(p, x0, 30, 248, 714, "#a86a48"); rect(p, x0 + 8, 30, 232, 714, "#5e3a3e");
                for (let s = 0; s < 6; s++) {
                    const y = 40 + s * 118; rect(p, x0, y + 108, 248, 12, "#c88a5e");
                    let x = x0 + 10, i = c * 13 + s * 7;
                    while (x < x0 + 232) { const w = 12 + (i * 7) % 16, h = 70 + (i * 13) % 34; const co = ["#c86a68", "#5a9a98", "#e8b45c", "#8a70c8", "#6a8ad0", "#a0b860", "#e8d8c0"][i % 7]; rect(p, x, y + 108 - h, Math.min(w, x0 + 238 - x), h, co); rect(p, x, y + 108 - h, 2, h, soft); if (i % 3 === 0 && h > 10) rect(p, x + 3, y + 108 - h + 14, Math.max(1, w - 6), 6, "#fff4dc"); x += w + 1; i++; }
                }
            }
            halftone(p, 0, 0, W, H, "#2a1438", false, 12, 0.3);
            T(b, blends(1, box(610, 300, 200, 300, 2), disc(610, 150, 100)), "#d8a870", { shade: 6 });
            T(b, blends(1, box(610, 300, 168, 270, 2), disc(610, 150, 84)), "#2c3a7a", { shade: 0, light: false });
            b.flat(disc(650, 130, 36), "#fff0b8"); b.flat(disc(636, 120, 32), "#2c3a7a");
            for (const [x, y] of [[560, 120], [590, 220], [660, 300], [570, 360], [640, 400]]) b.flat(disc(x, y, 3), "#fff0b8");
            b.flat(box(610, 300, 6, 300), "#d8a870"); b.flat(box(610, 260, 170, 6), "#d8a870");
            // A warm lamp pool.
            T(b, polygon([[230, 520], [310, 520], [340, 580], [200, 580]]), "#3cae6a", { shade: 3 }); T(b, box(270, 640, 12, 120, 3), "#c8a050", { shade: 2 });
        },
        floor(p, ox, oy) { const s = FLOOR_T * BG_U, N = 4, q = s / N; rect(p, ox, oy, s, s, "#a84e60"); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = ox + i * q, y = oy + j * q; rect(p, x + 8, y + 8, q - 16, q - 16, "#b85e6e"); rect(p, x + q / 2 - 12, y + q / 2 - 12, 24, 24, "#e8b45c"); rect(p, x + q / 2 - 6, y + q / 2 - 6, 12, 12, "#a84e60"); } },
    },
    roof: {
        sky: "#5a3a9e", tint: "#ffd8b8", open: true,
        wall(p, b, W, H) {
            vgrad(p, 0, 0, W, 620, "#5a3a9e", "#ff8a5a");
            rect(p, 0, 620, W, 124, "#b86a58");
            b.region(0, 0, W, H, 0, 0);
            b.flat(disc(300, 440, 96), "#ffd868"); b.flat(disc(300, 440, 120), "#ffd868", 0.3);
            for (const [x, y, w] of [[140, 150, 150], [640, 90, 200], [820, 240, 130], [400, 220, 110]]) b.flat(blends(10, oval(x, y, w, 18), oval(x - w * 0.3, y - 12, w * 0.4, 20), oval(x + w * 0.2, y - 14, w * 0.5, 22)), "#ff9ab8", 0.7);
            // City.
            let x = 0, i = 0;
            while (x < W) { const w = 54 + (i * 37) % 70, h = 100 + (i * 83) % 200; rect(p, x, 620 - h, w, h, i % 2 ? "#6a3a7e" : "#7e4a84"); for (let wy = 620 - h + 12; wy < 610; wy += 26) for (let wx = x + 10; wx < x + w - 12; wx += 20) if ((wx * 7 + wy * 3 + i) % 5 < 3) rect(p, wx, wy, 8, 12, "#ffd868"); x += w + 2; i++; }
            // Parapet, and the school's water tower.
            rect(p, 0, 640, W, 104, "#c88a6a"); for (let k = 0; k < W; k += 100) rect(p, k, 640, 3, 104, "#a06a50"); rect(p, 0, 634, W, 10, "#e8c0a0");
            T(b, box(780, 470, 170, 180, 12), "#a06a50", { shade: 7 }); T(b, polygon([[680, 390], [880, 390], [780, 330]]), "#7e4a58", { shade: 4 });
            for (const k of [710, 780, 850]) T(b, box(k, 610, 12, 90, 2), "#7e4a58", { shade: 2 });
        },
        floor(p, ox, oy) { const s = FLOOR_T * BG_U; rect(p, ox, oy, s, s, "#a8a0b0"); for (let i = 0; i < 3400; i++) { const a = (i * 7919) % (s - 4), c = (i * 104729) % (s - 4); rect(p, ox + a, oy + c, 2 + i % 3, 2 + i % 2, ["#8e869a", "#c0b8c8", "#b09aa8", "#7e7690"][i % 4]); } rect(p, ox, oy + s / 3, s, 5, "#7e7690"); rect(p, ox + s / 2, oy, 5, s, "#7e7690"); },
    },
};

export function paintStage(assets, id) {
    const name = "bg_" + id, th = THEMES[id];
    assets.paint(name, SH_W, SH_H, (p) => {
        const px = { ...p, stride: p.stride ?? p.width, data: p.data, x0: 0 }, b = new Brush(p, 1);
        th.wall(px, b, 1024, 744);
        th.floor(px, 1028, 0);
    }, { smooth: true, mipmaps: false });
    return { sheet: name, wall: [0, 0, 1024, 744], floor: [1028, 0, FLOOR_T * BG_U, FLOOR_T * BG_U], sky: th.sky, tint: th.tint, open: !!th.open };
}
