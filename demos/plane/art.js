// Painted things: the paper grain every mesh is dyed through, and the small printed pieces of the post.
import { PEOPLE, PLANES, STAMPS } from "./data.js";

export function paintPaper(a) {
    a.paint("paper", 512, 512, (p) => {
        const D = p.data, N = 512; let seed = 91; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        const v = new Float32Array(N * N).fill(0.965);
        for (let k = 0; k < 9000; k++) { let x = rnd() * N, y = rnd() * N, an = rnd() * 6.28; const len = 8 + rnd() * 26, amp = (rnd() - 0.5) * 0.05; for (let i = 0; i < len; i++) { an += (rnd() - 0.5) * 0.3; x += Math.cos(an); y += Math.sin(an); v[((y | 0) & 511) * N + ((x | 0) & 511)] += amp; } }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const n = (rnd() - 0.5) * 0.028 + 0.012 * Math.sin(x * 0.03 + y * 0.011) + 0.01 * Math.sin(y * 0.05 - x * 0.02), c = Math.min(1, Math.max(0, v[y * N + x] + n)) * 255, o = (y * N + x) * 4; D[o] = c; D[o + 1] = c; D[o + 2] = c * 0.985; D[o + 3] = 255; }
    }, { smooth: true });
}

/** The letter card: warm notepaper with a torn top edge and faint rules. Stretched to fit the text. */
export function paintCards(a) {
    a.paint("card", 360, 480, (p) => {
        const D = p.data; let seed = 5; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
        for (let y = 0; y < 480; y++) for (let x = 0; x < 360; x++) {
            const o = (y * 360 + x) * 4, torn = 6 + Math.sin(x * 0.09) * 2 + Math.sin(x * 0.31) * 1.5 + Math.sin(x * 0.73);
            const inside = x > 3 && x < 356 && y > torn && y < 476;
            if (!inside) { D[o + 3] = 0; continue; }
            const n = (rnd() - 0.5) * 7, e = Math.min(1, Math.min(x - 3, 356 - x, y - torn, 476 - y) / 5), rule = (y - 52) % 30 < 1.2 && y > 50 ? -13 : 0, fold = Math.abs(y - 240) < 1 ? -9 : 0, edge = (1 - e) * 26;
            D[o] = 250 + n + rule * 0.8 + fold + edge * 0.1; D[o + 1] = 241 + n + rule * 0.5 + fold - edge * 0.2; D[o + 2] = 222 + n + rule * 0.1 + fold - edge * 0.5; D[o + 3] = 255;
        }
    }, { smooth: true });
    a.paint("panel", 64, 64, (p) => { p.rect(0, 0, 64, 64, "#fbf1dc"); }, { smooth: true });
}

const MOTIF = {
    gull(p) { p.poly([[10, 42], [34, 30], [44, 40], [58, 28], [80, 40], [54, 46], [44, 58], [34, 46]], "#fbfbf6"); p.circle(44, 42, 4, "#fbfbf6"); p.poly([[40, 56], [48, 56], [44, 62]], "#efc15f"); },
    bell(p) { p.ellipse(45, 30, 13, 15, "#efc15f"); p.poly([[28, 58], [62, 58], [54, 30], [36, 30]], "#efc15f"); p.circle(45, 62, 5, "#b9772e"); p.rect(26, 56, 38, 3, "#b9772e"); },
    needle(p) { p.poly([[8, 80], [24, 26], [66, 26], [82, 80], [58, 80], [54, 50], [36, 50], [32, 80]], "#8f8a93"); p.poly([[36, 50], [54, 50], [58, 80], [32, 80]], "#7ec1d6"); p.rect(0, 74, 90, 12, "#3f8c8e"); },
    cut(p) { p.poly([[0, 20], [36, 20], [40, 86], [0, 86]], "#8f8a93"); p.poly([[54, 20], [90, 20], [90, 86], [50, 86]], "#a59c9c"); p.poly([[36, 20], [54, 20], [50, 86], [40, 86]], "#7ec1d6"); },
    arch(p) { p.rect(6, 22, 78, 50, "#d7b48f"); p.ellipse(28, 72, 15, 28, "#8fd0c6"); p.ellipse(62, 72, 15, 28, "#8fd0c6"); p.rect(4, 18, 82, 6, "#fbf1dc"); },
    mill(p) { p.poly([[32, 76], [36, 40], [54, 40], [58, 76]], "#f4e8d0"); p.circle(45, 38, 10, "#d9593f"); for (const [a, b] of [[12, 12], [78, 12], [12, 66], [78, 66]]) p.line(45, 38, a, b, "#7f5238", 5); },
    lamp(p) { p.poly([[35, 84], [38, 34], [52, 34], [55, 84]], "#fbf1dc"); p.rect(36, 44, 18, 10, "#d9593f"); p.rect(36, 66, 18, 10, "#d9593f"); p.rect(38, 22, 14, 13, "#ffe08a"); p.poly([[34, 22], [56, 22], [45, 12]], "#d9593f"); p.poly([[52, 24], [90, 12], [90, 36]], "#fff0a8"); },
    cove(p) { p.ellipse(45, 60, 40, 30, "#f1dcae"); p.ellipse(45, 72, 34, 20, "#4fb3b4"); p.poly([[0, 24], [90, 24], [90, 40], [64, 34], [26, 34], [0, 44]], "#6f9f6c"); },
    cat(p) { p.ellipse(45, 58, 18, 20, "#3a3a44"); p.circle(45, 30, 14, "#3a3a44"); p.poly([[33, 24], [36, 8], [44, 20]], "#3a3a44"); p.poly([[46, 20], [54, 8], [57, 24]], "#3a3a44"); p.circle(40, 30, 3, "#efc15f"); p.circle(50, 30, 3, "#efc15f"); p.line(60, 74, 76, 50, "#3a3a44", 5); },
    pear(p) { p.circle(45, 54, 19, "#c9c24f"); p.circle(45, 34, 12, "#c9c24f"); p.line(45, 22, 48, 11, "#7f5238", 4); p.ellipse(58, 14, 10, 5, "#5f9c6e"); },
    clock(p) { p.circle(45, 45, 30, "#fbf1dc"); p.circle(45, 45, 25, "#fffaf0"); p.line(45, 45, 45, 26, "#3a4a5c", 4); p.line(45, 45, 58, 52, "#3a4a5c", 4); p.circle(45, 45, 3, "#d9593f"); },
    band(p) { p.poly([[14, 38], [45, 14], [76, 38]], "#3f8c8e"); for (const x of [20, 37, 53, 70]) p.rect(x - 1.5, 38, 3, 28, "#fbf1dc"); p.rect(12, 66, 66, 7, "#fbf1dc"); },
    boat(p) { p.poly([[14, 56], [76, 56], [64, 74], [26, 74]], "#2f5f73"); p.rect(43, 18, 3, 38, "#7f5238"); p.poly([[47, 20], [74, 52], [47, 52]], "#fff8ea"); p.rect(0, 72, 90, 14, "#3f8c8e"); },
    kite(p) { p.poly([[45, 8], [70, 36], [45, 72], [20, 36]], "#d9593f"); p.poly([[45, 8], [45, 72], [20, 36]], "#efc15f"); p.line(45, 72, 62, 86, "#fbf1dc", 2); },
    alley(p) { p.rect(0, 12, 34, 74, "#e99a7f"); p.rect(56, 12, 34, 74, "#a9cbd3"); p.poly([[34, 86], [56, 86], [50, 40], [40, 40]], "#f5e8cc"); p.line(34, 28, 56, 34, "#3a4a5c", 1); p.poly([[40, 30], [46, 31], [43, 40]], "#fbf1dc"); },
    moor(p) { p.rect(0, 62, 90, 24, "#9db98a"); p.poly([[34, 66], [38, 18], [52, 14], [58, 66]], "#8f8a93"); p.circle(68, 22, 7, "#ffe08a"); },
    tBay(p) { p.circle(45, 45, 28, "#efc15f"); p.rect(36, 70, 18, 10, "#b9772e"); p.line(0, 66, 90, 66, "#3f8c8e", 7); },
    tRoof(p) { p.poly([[10, 76], [10, 44], [30, 26], [50, 44], [50, 76]], "#d9593f"); p.poly([[44, 76], [44, 34], [62, 18], [80, 34], [80, 76]], "#3f7c86"); },
    tLong(p) { p.circle(45, 45, 30, "#4fb3b4"); p.poly([[20, 56], [70, 20], [52, 66], [46, 50]], "#fbf1dc"); },
};
export const ALL_STAMPS = [...STAMPS, { id: "tBay", name: "Round the Bay", hint: "Gold on Round the Bay" }, { id: "tRoof", name: "Over the Rooftops", hint: "Gold on Over the Rooftops" }, { id: "tLong", name: "The Long Way", hint: "Gold on The Long Way Round" }];
const STAMP_BG = ["#a9d3dd", "#7a4b6e", "#cfe6e6", "#3f5f73", "#a9d3dd", "#7ec1d6", "#2f4a6e", "#a9d3dd", "#f2c9a0", "#b9cfa2", "#c8452f", "#f6e7c8", "#a9d3dd", "#a9d3dd", "#f5e8cc", "#cfe6e6", "#c8452f", "#f6e7c8", "#2f5f73"];

export function paintStamps(a) {
    const n = ALL_STAMPS.length;
    a.paint("stamps", 90 * 5, 110 * 4, (p) => {
        const size = [90, 110];
        ALL_STAMPS.forEach((st, i) => {
            const ox = (i % 5) * 90, oy = Math.floor(i / 5) * 110, W = 90, H = 110;
            const v = { // a painter view offset to one cell
                poly: (pts, c) => p.poly(pts.map(([x, y]) => [ox + x, oy + 8 + y]), c), circle: (x, y, r, c) => p.circle(ox + x, oy + 8 + y, r, c), ellipse: (x, y, rx, ry, c) => p.ellipse(ox + x, oy + 8 + y, rx, ry, c),
                rect: (x, y, w, h, c) => p.rect(ox + x, oy + 8 + y, w, h, c), line: (x0, y0, x1, y1, c, w) => p.line(ox + x0, oy + 8 + y0, ox + x1, oy + 8 + y1, c, w),
            };
            p.rect(ox + 1, oy + 1, W - 2, H - 2, "#f7efdc");
            p.rect(ox + 8, oy + 8, W - 16, H - 28, STAMP_BG[i] ?? "#a9d3dd");
            MOTIF[st.id](v);
            p.rect(ox, oy + 8 + 80 + 2, 8, 20, "#f7efdc"); p.rect(ox + W - 8, oy + 8 + 8, 8, 90, "#f7efdc"); p.rect(ox + 0, oy + 8, 8, 90, "#f7efdc"); p.rect(ox + 8, oy + 90, W - 16, 12, "#f7efdc");
            // Perforate: punch teeth around the edge of the cell.
            const punch = (cx, cy) => { for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) if (x >= ox && y >= oy && x < ox + W && y < oy + H && Math.hypot(x - cx, y - cy) < 3.4) p.data[(y * p.width + x) * 4 + 3] = 0; };
            for (let k = 0; k < 9; k++) { punch(ox + 5 + k * 10, oy); punch(ox + 5 + k * 10, oy + H - 1); }
            for (let k = 0; k < 11; k++) { punch(ox, oy + 5 + k * 10); punch(ox + W - 1, oy + 5 + k * 10); }
        });
    }, { smooth: true });
    a.grid("stamps", 5, 4);
}

/** Paper-cut heads for the letter card and the journal. */
export function paintFaces(a) {
    const ids = Object.keys(PEOPLE);
    a.paint("faces", 96 * 6, 96 * 2, (p) => {
        ids.forEach((id, i) => {
            const q = PEOPLE[id], ox = (i % 6) * 96, oy = Math.floor(i / 6) * 96, cx = ox + 48, cy = oy + 52;
            p.circle(cx, oy + 48, 46, "#f3dcb6"); p.ellipse(cx, oy + 96, 34, 22, q.coat);
            if (q.hat === "plaits") { p.ellipse(cx - 28, cy + 12, 8, 20, q.hair); p.ellipse(cx + 28, cy + 12, 8, 20, q.hair); }
            p.circle(cx, cy, 28, q.skin);
            p.ellipse(cx, cy - 18, 29, 15, q.hair);
            p.circle(cx - 11, cy + 2, 3, "#2a2a34"); p.circle(cx + 11, cy + 2, 3, "#2a2a34");
            p.ellipse(cx - 18, cy + 10, 6, 4, "#ef9c8688"); p.ellipse(cx + 18, cy + 10, 6, 4, "#ef9c8688");
            p.line(cx - 6, cy + 13, cx, cy + 15, "#a0473a", 2); p.line(cx, cy + 15, cx + 6, cy + 13, "#a0473a", 2);
            if (q.hat === "bun") p.circle(cx, cy - 34, 12, q.hair);
            if (q.hat === "flat") p.ellipse(cx, cy - 22, 34, 11, "#54657f");
            if (q.hat === "cap") p.ellipse(cx, cy - 24, 32, 14, "#fff8ea");
            if (q.hat === "beard") p.ellipse(cx, cy + 18, 25, 14, q.hair);
            if (q.hat === "scarf") p.ellipse(cx, cy - 20, 31, 14, q.coat);
            if (q.hat === "specs") { p.circle(cx - 11, cy + 2, 8, "#ffffff55"); p.circle(cx + 11, cy + 2, 8, "#ffffff55"); }
        });
    }, { smooth: true });
    a.grid("faces", 6, 2);
}
export const faceFrame = (id) => Object.keys(PEOPLE).indexOf(id);
