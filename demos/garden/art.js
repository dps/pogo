// Every sprite in the game, painted at load time and packed into two sheets, so a whole swarm is one draw call.
// The small sheet holds 96px frames, the big sheet 192px frames. Light comes from the top left; ink is warm sepia.
import { Brush, mix, rgb } from "./paint.js";

const S = 96, L = 192, SC = 16, LC = 8;      // frame sizes; columns per sheet
export const F = {};                          // name -> { sheet, first, count }
const jobs = [];
const reg = (name, count, fn, big = false) => jobs.push({ name, count, fn, big });

// Palette
const CREAM = "#f6ecd2", BARK = "#7a5236", DBARK = "#553722", STRAW = "#d9b44a", LEAF = "#5f8a4b", DEEP = "#3f6b3c", SAGE = "#8fb06a", RED = "#c8553d", BLUE = "#4d7ea8", STONE = "#a9a296", PINK = "#e29aa0", BUTTER = "#f0cf70", PLUM = "#6e3a78", SOIL = "#6a4a33", BRASS = "#c9a24a", IRON = "#4c4a50";

const shadow = (b, x = 48, y = 84, rx = 30, ry = 8) => b.blob(x, y, rx, ry, "#2a1c1433", { wob: 0.05, tex: 0, edge: 0, light: 0 });
const mound = (b, x = 48, y = 80, rx = 30, ry = 9) => {
    shadow(b, x, y + 3, rx + 3, ry);
    b.part(() => { b.blob(x, y, rx, ry, SOIL, { wob: 0.22, tex: 0.5 }); for (let i = 0; i < 6; i++) b.circle(x - rx + 8 + i * rx / 3, y - 3 + (i % 3) * 3, 2.2, "#4f3626"); }, 1.6);
};
const leaf = (b, x, y, len, wid, rot, c = LEAF) => {
    b.blob(x + Math.cos(rot) * len / 2, y + Math.sin(rot) * len / 2, len / 2, wid / 2, c, { rot, wob: 0.08 });
    b.line(x, y, x + Math.cos(rot) * len * 0.85, y + Math.sin(rot) * len * 0.85, 0.9, "#00000033");
};
const eye = (b, x, y, r, look = 0.3, up = 0) => {
    b.part(() => b.circle(x, y, r, "#fffdf2", { tex: 0, wob: 0.02, edge: 0.05 }), 1.2);
    b.circle(x + look * r * 0.5, y + r * 0.1 + up, r * 0.62, "#241811", { tex: 0, wob: 0, light: 0 });
    b.circle(x + look * r * 0.5 - r * 0.2, y - r * 0.2 + up, r * 0.22, "#ffffff", { tex: 0, wob: 0, light: 0, edge: 0 });
};
const smile = (b, x, y, w, c = "#38261c", open = 0) => {
    b.stroke([[x - w, y - 1], [x, y + w * 0.5 + open], [x + w, y - 1]], 1.6, c);
};

// ---- Defenders. Each is called with tier 1..3 and branch null/a/b. ---------------------------------------------
function gnome(b, t, br) {
    mound(b, 48, 80, 32, 9);
    // catapult frame
    b.part(() => {
        b.line(20, 78, 76, 78, 7, BARK, {});
        b.line(26, 78, 40, 48, 5, BARK); b.line(70, 78, 56, 48, 5, BARK);
        b.line(38, 48, 58, 48, 5, DBARK);
        for (const x of [24, 72]) b.circle(x, 79, 6.5, DBARK);
        for (const x of [24, 72]) b.circle(x, 79, 2.2, BRASS, { tex: 0 });
    }, 2);
    if (br === "b") b.part(() => { // pebble hopper and crank
        b.blob(48, 42, 16, 13, t === 3 ? "#8d8f96" : STONE); b.line(62, 44, 74, 34, 3.5, DBARK); b.circle(76, 33, 4, RED);
        for (let i = 0; i < 5; i++) b.circle(38 + i * 5, 34 - (i % 2) * 3, 3.2, "#c9c2b4");
    }, 2);
    // the gnome
    const gy = br === "a" ? -2 : 0, g = t === 3 && br === "a" ? 1.2 : 1;
    b.part(() => {
        b.blob(48, 62 + gy, 13 * g, 14, BLUE);
        b.blob(48, 69 + gy, 13 * g, 3.2, "#3a2a22", { tex: 0 });
        b.circle(47 + 0, 69 + gy, 2.4, BRASS, { tex: 0 });
        // arms
        b.line(36, 58 + gy, 26, 50 + gy, 5, BLUE); b.circle(25, 49 + gy, 3.8, "#f2c9a0");
        b.line(60, 58 + gy, 70, 50 + gy, 5, BLUE); b.circle(71, 49 + gy, 3.8, "#f2c9a0");
    }, 2);
    b.part(() => {
        b.blob(48, 44 + gy, 12, 10, "#f2c9a0");
        b.blob(48, 53 + gy, 13, 11, "#f4efe4", { wob: 0.25, tex: 0.1 });
        b.circle(48, 45 + gy, 3.4, "#e89a7e", { tex: 0 });
        b.poly([[33, 39 + gy], [64, 39 + gy], [52, 8 + gy], [45, 6 + gy]], RED);
        b.blob(48, 39 + gy, 16, 3.6, "#a83c2b", { tex: 0.1 });
        b.circle(41, 42.5 + gy, 1.8, "#241811", { tex: 0, wob: 0, light: 0 }); b.circle(55, 42.5 + gy, 1.8, "#241811", { tex: 0, wob: 0, light: 0 });
        b.line(37, 39 + gy, 44, 41 + gy, 1.8, "#38261c"); b.line(59, 39 + gy, 52, 41 + gy, 1.8, "#38261c");
    }, 2);
    if (br === "a") b.part(() => {
        if (t === 2) b.blob(48, 2 + 22, 15, 13, STONE);
        else { b.poly([[24, 12], [72, 12], [66, 22], [58, 24], [58, 30], [66, 34], [30, 34], [38, 30], [38, 24], [24, 20]], "#4f5059"); b.line(26, 14, 66, 14, 1.5, "#ffffff55"); }
    }, 2);
    if (t >= 2) star(b, 82, 16, t);
}
function star(b, x, y, t) { // tier marks: one or two gold pips on a little ribbon
    for (let i = 0; i < t - 1; i++) {
        const X = x - i * 15, pts = [];
        for (let k = 0; k < 10; k++) { const a = -1.57 + k * 0.628, r = k % 2 ? 3.6 : 9; pts.push([X + Math.cos(a) * r, y + Math.sin(a) * r]); }
        b.part(() => b.poly(pts, BUTTER, { lo: "#d98a1f", tex: 0.4 }), 1.4);
    }
}
function bramble(b, t, br) {
    shadow(b, 48, 84, 36, 8);
    if (br === "b") {
        b.part(() => { for (const x of [24, 48, 72]) b.line(x, 82, x, t === 3 ? 16 : 26, 4.5, "#a37b4f"); for (const y of [34, 50, 66]) b.line(16, y, 80, y, 3.5, "#b68e60"); if (t === 3) { b.stroke([[20, 26], [48, 8], [76, 26]], 6, "#a37b4f"); } }, 2);
    }
    b.part(() => {
        const c = "#6b3f55";
        b.stroke([[14, 80], [26, 40], [50, 58], [36, 76]], [5, 3.5, 2.5], c);
        b.stroke([[82, 80], [72, 36], [46, 50], [60, 76]], [5, 3.5, 2.5], c);
        b.stroke([[48, 82], [46, 44], [60, 24], [76, 30]], [5, 3.5, 2], c);
        b.stroke([[40, 82], [34, 56], [22, 24], [36, 22]], [4, 3, 2], c);
        for (const [x, y, r] of [[22, 58, 0.7], [66, 60, 2.4], [47, 62, 0], [58, 34, 2.8], [30, 38, -1], [72, 46, 0.4], [38, 70, 3.2], [60, 70, 0.2]]) b.poly([[x, y], [x + Math.cos(r) * 8, y + Math.sin(r) * 8], [x + Math.cos(r + 0.5) * 2, y + Math.sin(r + 0.5) * 2]], "#e8d9c0");
    }, 1.6);
    b.part(() => {
        for (const [x, y, r] of [[16, 62, -0.5], [30, 30, 2.6], [66, 26, -0.6], [78, 56, 0.6], [50, 46, 1.4], [38, 64, 2.8], [62, 66, 0.4]]) leaf(b, x, y, 16, 9, r, x % 4 ? LEAF : DEEP);
    }, 1.4);
    if (br === "a") b.part(() => {
        const pts = t === 3 ? [[28, 36, 9], [64, 30, 10], [46, 58, 11], [74, 58, 8], [20, 64, 8]] : [[46, 46, 11], [68, 60, 8], [26, 56, 8]];
        for (const [x, y, r] of pts) { b.circle(x, y, r, "#d8495f"); b.circle(x, y, r * 0.55, "#b52e4a"); b.circle(x - 1, y - 1, r * 0.2, "#7e1a33", { tex: 0 }); }
    }, 1.5);
    if (t >= 2) star(b, 84, 14, t);
}
function hive(b, t, br) {
    shadow(b, 48, 85, 30, 8);
    if (br === "a") b.part(() => { for (const [x, y] of t === 3 ? [[16, 74], [80, 74], [84, 60]] : [[80, 74]]) { b.blob(x, y, 9, 10, "#e8dcc0"); b.blob(x, y - 9, 9, 3, "#c85c3d", { tex: 0 }); b.blob(x, y + 2, 6, 5, "#eba82e", { tex: 0.1 }); } }, 1.6);
    b.part(() => {
        b.blob(48, 74, 32, 9, BARK);
        const rows = 6;
        for (let i = 0; i < rows; i++) {
            const y = 70 - i * 10.5, r = 31 - i * i * 0.72;
            b.blob(48, y, r, 8, i % 2 ? "#dcb24d" : "#e6c261", { lo: "#a8722c", hi: "#fbe7a3", tex: 0.5 });
        }
    }, 2.2);
    for (let i = 0; i < 5; i++) { const y = 65 - i * 10.5, r = 29 - i * i * 0.8; b.stroke([[48 - r, y], [48, y + 2.5], [48 + r, y]], 1.2, "#9a6a2b88"); }
    b.part(() => { b.blob(48, 68, 9, 8, "#2f2015", { tex: 0, light: 0 }); }, 1.4);
    if (br === "b") b.part(() => { b.poly([[34, 26], [34, 12], [41, 20], [48, 8], [55, 20], [62, 12], [62, 26]], BUTTER, { lo: "#c98a2c" }); for (const x of [38, 48, 58]) b.circle(x, 23, 2.2, x === 48 ? RED : BLUE, { tex: 0 }); }, 1.7);
    if (br === "a" && t === 3) b.part(() => b.blob(48, 14, 10, 6, "#eba82e"), 1.5);
    if (t >= 2) star(b, 84, 14, t);
}
function sprinkler(b, t, br) {
    shadow(b, 48, 84, 28, 7);
    b.blob(48, 80, 30, 8, "#7fb8d6aa", { tex: 0.2, wob: 0.3 });
    if (br === "a") b.part(() => { b.stroke([[10, 80], [20, 66], [34, 78], [44, 72]], 5, t === 3 ? RED : "#5e8a4d"); b.circle(16, 72, t === 3 ? 13 : 10, t === 3 ? "#a83c2b" : "#4d7a43"); b.circle(16, 72, 4, BRASS, { tex: 0 }); }, 1.8);
    b.part(() => {
        b.line(48, 80, 48, 48, 7, BRASS, { tex: 0.2, lo: "#7f5d22" });
        b.blob(48, 80, 12, 5, "#8e6e2a");
    }, 1.8);
    b.part(() => {
        if (br === "b") { b.line(24, 40, 72, 40, 6, "#b08b3b"); b.circle(24, 40, 8, BRASS); b.circle(72, 40, 8, BRASS); if (t === 3) b.circle(48, 26, 9, BRASS); }
        b.blob(48, 42, 15, 11, BRASS, { hi: "#fff1b0", lo: "#7f5d22", tex: 0.15 });
        b.blob(48, 42, 15, 3.5, "#8e6e2a", { tex: 0 });
        b.circle(48, 31, 4.5, "#e6c56b");
    }, 2);
    for (let i = 0; i < 7; i++) { const a = -2.9 + i * 0.45; b.stroke([[48 + Math.cos(a) * 14, 40 + Math.sin(a) * 10], [48 + Math.cos(a) * 34, 26 + Math.sin(a) * 18], [48 + Math.cos(a) * 42, 34 + Math.sin(a) * 18]], [2.6, 0.8], "#9fd3ecd0", { tex: 0.1 }); }
    if (t >= 2) star(b, 84, 14, t);
}
function box(b, t, br) {
    shadow(b, 48, 85, 26, 7);
    if (br === "a") b.part(() => { b.line(10, 16, 10, 80, 3.5, BARK); b.line(86, 16, 86, 80, 3.5, BARK); b.stroke([[10, 16], [48, 28], [86, 16]], 1.5, "#6d5a4a"); for (let i = 0; i < (t === 3 ? 7 : 5); i++) { const x = 16 + i * (t === 3 ? 11 : 16), y = 16 + 12 * (1 - Math.pow((x - 48) / 38, 2)); b.poly([[x - 5, y], [x + 5, y], [x, y + 11]], [RED, BUTTER, BLUE, PINK][i % 4]); } }, 1.4);
    b.part(() => {
        b.line(48, 84, 48, 56, 9, BARK);
        b.blob(48, 84, 12, 4, DBARK);
        b.poly([[22, 38], [74, 38], [76, 64], [20, 64]], "#b98a4e", { lo: "#7f5730" });
        for (const y of [46, 54]) b.line(22, y, 74, y, 1.2, "#6d4a2b77");
        b.poly([[16, 40], [48, 20], [80, 40]], "#8c5a35", { lo: "#5e3a22" });
        b.line(40, 34, 56, 34, 3, "#2a1c14", { tex: 0 });
    }, 2.1);
    b.part(() => { b.blob(48, 52, 15, 8, CREAM, { tex: 0.1 }); }, 1.4);
    b.circle(48, 52, 5.2, "#d9a436", { tex: 0.05, hi: "#fff0a8" });
    b.line(48, 49, 48, 55, 1.4, "#8a6115", { tex: 0 });
    if (br === "b") b.part(() => { for (const [x, y, c] of t === 3 ? [[14, 74, RED], [80, 74, PLUM], [28, 78, BUTTER], [68, 78, RED]] : [[80, 74, RED], [16, 76, PLUM]]) { b.blob(x, y, 7, 8, c); b.blob(x, y - 8, 6, 2.6, CREAM, { tex: 0 }); } }, 1.5);
    if (t >= 2) star(b, 84, 14, t);
}
function flyHead(b, cx, cy, s, open, c1, c2) {
    // Two jaws with teeth, hinged at the back.
    const a = open ? 0.62 : 0.06;
    const jaw = (dir) => {
        const r = dir < 0 ? -a : a;
        b.part(() => {
            const pts = [];
            for (let i = 0; i <= 8; i++) { const t = i / 8, x = t * 36 * s, y = -Math.sin(t * Math.PI) * 13 * s * dir * -1 * -1; pts.push([cx - 18 * s + x * Math.cos(r) - y * Math.sin(r) * (dir), cy + x * Math.sin(r) * dir * -1 * -1 + y * Math.cos(r) * dir + 0]); }
            pts.push([cx - 18 * s, cy]);
            b.poly(pts, c1, { lo: c2, tex: 0.5 });
            for (let i = 1; i < 6; i++) { const t = i / 6, x = t * 36 * s, X = cx - 18 * s + x * Math.cos(r), Y = cy + x * Math.sin(r) * dir; b.poly([[X - 2.4 * s, Y], [X + 2.4 * s, Y], [X, Y + 7 * s * dir * -1]], "#fff8e6"); }
        }, 1.7);
    };
    if (open) { b.blob(cx, cy, 15 * s, 9 * s, "#6a2234", { tex: 0.1, light: 0.3 }); }
    jaw(1); jaw(-1);
}
function flytrap(b, t, br, open) {
    mound(b, 48, 82, 28, 8);
    b.part(() => {
        leaf(b, 46, 78, 34, 14, 3.0, SAGE); leaf(b, 50, 78, 34, 14, 0.14, SAGE); leaf(b, 44, 80, 22, 12, 2.5, LEAF); leaf(b, 52, 80, 22, 12, 0.6, LEAF);
    }, 1.6);
    const c1 = br === "b" ? (t === 3 ? "#9c4a8e" : "#a8c04a") : "#a4c94f", c2 = br === "b" && t === 3 ? "#5e2466" : "#d0433f";
    const heads = br === "a" ? t : 1;
    const big = br === "b" ? (t === 3 ? 1.32 : 1.15) : 1;
    b.part(() => {
        if (heads === 1) b.stroke([[48, 78], [44, 60], [50, 50]], [7, 5], DEEP);
        else { b.stroke([[46, 78], [34, 58], [30, 44]], [6, 4], DEEP); b.stroke([[50, 78], [62, 58], [68, 44]], [6, 4], DEEP); if (heads === 3) b.stroke([[48, 78], [48, 50], [48, 34]], [6, 4], DEEP); }
    }, 1.6);
    if (heads === 1) flyHead(b, 50, 36, 1.05 * big, open, c1, c2);
    else if (heads === 2) { flyHead(b, 28, 38, 0.8, open, c1, c2); flyHead(b, 68, 38, 0.8, open, c1, c2); }
    else { flyHead(b, 24, 46, 0.68, open, c1, c2); flyHead(b, 72, 46, 0.68, open, c1, c2); flyHead(b, 48, 24, 0.8, open, c1, c2); }
    if (heads === 1) { b.part(() => b.circle(58, 20, 4.2, "#fffdf2", { tex: 0 }), 1); b.circle(59, 20.5, 2, "#241811", { tex: 0, wob: 0 }); }
    if (t >= 2) star(b, 84, 14, t);
}
function compost(b, t, br) {
    shadow(b, 48, 86, 36, 8);
    b.part(() => {
        const c = t === 3 && br === "a" ? "#7a3d24" : "#5e4029";
        b.blob(48, 48, 28, 24, c, { wob: 0.25, tex: 0.7, lo: "#2f2015", hi: "#8a6a48" });
        const bits = [[34, 38, "#b9c46a"], [50, 30, "#d9a05b"], [60, 44, "#c8553d"], [42, 50, "#a9c257"], [30, 52, "#e8d9c0"], [62, 56, "#7b9a4e"]];
        for (const [x, y, k] of bits) b.blob(x, y, 5.5, 3.2, k, { rot: x * 0.4 });
    }, 2);
    b.part(() => {
        for (const y of [56, 68, 80]) b.line(14, y, 82, y, 8.5, "#a57a4d", { lo: "#6d4a2b" });
        for (const x of [18, 78]) b.line(x, 50, x, 86, 6, BARK);
    }, 1.8);
    if (br === "a") { for (const [x, h] of [[36, 24], [54, 28]]) b.stroke([[x, 26], [x - 5, 26 - h / 2], [x + 3, 26 - h]], [5, 1.5], "#f2ece0aa", { tex: 0 }); if (t === 3) b.blob(48, 44, 20, 12, "#f0813655", { tex: 0, light: 0 }); }
    if (br === "b") b.part(() => { for (const [x, y, l] of t === 3 ? [[28, 30, 1], [50, 22, -1], [68, 34, 1]] : [[46, 28, 1], [66, 36, -1]]) b.stroke([[x, y + 12], [x + 5 * l, y + 2], [x - 2 * l, y - 6], [x + 6 * l, y - 8]], [4.6, 3.2], "#dd8a8e"); }, 1.4);
    if (t >= 2) star(b, 84, 14, t);
}
function scarecrow(b, t, br, down) {
    if (down) {
        shadow(b, 48, 80, 34, 8);
        b.part(() => { b.stroke([[14, 74], [80, 70]], 5, BARK); b.blob(40, 70, 26, 8, STRAW, { tex: 0.8, wob: 0.4 }); b.blob(72, 66, 12, 9, "#e5a53a"); b.blob(30, 64, 14, 6, "#6f7f4a"); }, 1.8);
        return;
    }
    shadow(b, 48, 86, 22, 7);
    const big = br === "a" && t === 3 ? 1.12 : 1;
    b.part(() => {
        b.line(48, 86, 48, 26, 5.5, BARK);
        b.line(12, 40, 84, 40, 5, BARK);
        // straw hands
        for (const s of [-1, 1]) for (let i = 0; i < 5; i++) b.line(48 + s * 34, 40, 48 + s * (44 + i % 2 * 3), 32 + i * 5, 1.8, STRAW);
    }, 1.8);
    b.part(() => {
        const col = br === "b" ? "#5a4a60" : "#7d8f54";
        b.poly([[30, 34], [66, 34], [72 + (big - 1) * 40, 74], [24 - (big - 1) * 40, 74]], col, { lo: "#3a2a3a" });
        b.line(14, 40, 34, 38, 8, col); b.line(82, 40, 62, 38, 8, col);
        b.poly([[40, 52], [52, 50], [54, 62], [42, 63]], "#c8553d"); // a patch
        for (const s of [[42, 52, 46, 50], [50, 62, 52, 66]]) b.line(s[0], s[1], s[2], s[3], 1, "#fff");
        for (let i = 0; i < 7; i++) b.line(28 + i * 7, 72, 26 + i * 7.6, 82, 2, STRAW);
        if (br === "a") for (const [x, y, a] of [[30, 52, 2.2], [66, 56, 0.7], [58, 42, -0.5], [36, 66, 2.8]]) b.line(x, y, x + Math.cos(a) * 12, y + Math.sin(a) * 12, 2, STRAW);
    }, 2);
    b.part(() => {
        if (br === "b") {
            b.blob(48, 22, 17, 16, t === 3 ? "#e27f26" : "#ece1d1", { lo: t === 3 ? "#97410f" : "#a78fbe" });
            b.poly([[38, 16], [45, 20], [38, 25]], "#2a1508"); b.poly([[58, 16], [51, 20], [58, 25]], "#2a1508");
            b.poly([[36, 28], [42, 31], [46, 28], [50, 31], [54, 28], [60, 30], [55, 35], [41, 35]], "#2a1508");
            if (t === 3) { b.poly([[36, 18], [40, 21], [38, 24]], "#ffd76b"); b.poly([[60, 18], [56, 21], [58, 24]], "#ffd76b"); }
        } else {
            b.blob(48, 22, 16, 15, "#e9cf95");
            b.line(40, 18, 44, 22, 2, "#38261c"); b.line(44, 18, 40, 22, 2, "#38261c"); b.line(52, 18, 56, 22, 2, "#38261c"); b.line(56, 18, 52, 22, 2, "#38261c");
            b.stroke([[38, 28], [44, 32], [50, 29], [58, 28]], 2, "#38261c");
            b.poly([[46, 22], [51, 24], [46, 26]], "#d8742e");
        }
        b.poly([[26, 12], [70, 12], [60, 6], [58, -4], [38, -4], [34, 6]], "#6b5436");
        b.line(36, 8, 60, 8, 3, RED);
    }, 2);
    if (t >= 2) star(b, 84, 14, t);
}
function chime(b, t, br) {
    shadow(b, 48, 85, 22, 7);
    b.part(() => {
        b.line(48, 86, 48, 14, 5.5, "#8a6a48");
        b.line(48, 16, 78, 16, 4, "#8a6a48");
        b.stroke([[78, 16], [84, 20], [80, 24]], 2.6, IRON);
        b.blob(48, 86, 13, 4, DBARK);
    }, 1.8);
    if (br === "b") b.part(() => { for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; b.poly([[40, 26], [40 + Math.cos(a) * 22, 26 + Math.sin(a) * 22], [40 + Math.cos(a + 0.9) * 13, 26 + Math.sin(a + 0.9) * 13]], [RED, BUTTER, BLUE, PINK][i]); } b.circle(40, 26, 3.2, BRASS, { tex: 0 }); }, 1.6);
}
function chimeBells(b, t, br) { // swings from its top centre, drawn separately so the note can ring
    if (br === "a") {
        const k = t === 3 ? 1.35 : 1;
        b.part(() => { b.poly([[48 - 6 * k, 30], [48 + 6 * k, 30], [48 + 8 * k, 44], [48 + 18 * k, 62], [48 - 18 * k, 62], [48 - 8 * k, 44]], BRASS, { lo: "#7f5d22" }); b.blob(48, 62, 18 * k, 4, "#a07f33"); b.circle(48, 28, 4.5, IRON); }, 2);
        b.part(() => b.circle(48, 66, 5, "#7f5d22"), 1.6);
    } else {
        b.part(() => {
            b.blob(48, 24, 16, 4, "#a07f33");
            const cs = [[34, 48], [43, 60], [52, 52], [61, 64]];
            for (const [x, h] of cs) { b.line(x, 24, x, 30, 1.2, IRON); b.line(x, 30, x, 30 + h, 6, "#b9d2d9", { lo: "#6f93a0", tex: 0.2 }); b.line(x - 1.2, 32, x - 1.2, 26 + h, 1.2, "#ffffffaa"); }
        }, 1.6);
        b.part(() => { b.line(48, 24, 48, 72, 1, IRON); b.poly([[42, 72], [54, 72], [48, 86]], PINK); }, 1.2);
    }
}
function chilli(b, t, br) {
    mound(b, 48, 82, 28, 8);
    b.part(() => {
        b.stroke([[48, 82], [46, 56]], [7, 5], DEEP);
        for (const [x, y, rx, ry] of [[48, 40, 30, 24], [28, 54, 19, 15], [68, 54, 19, 15]]) b.blob(x, y, rx, ry, br === "b" ? "#4e7d3f" : LEAF, { wob: 0.32, tex: 0.5, freq: 4 });
    }, 2);
    const col = br === "a" ? (t === 3 ? "#f1e5c8" : "#f18a2b") : br === "b" ? "#e9402a" : "#d8432f";
    const list = t === 1 ? [[34, 44], [58, 36], [50, 60], [70, 52], [26, 60]] : [[30, 40], [50, 28], [66, 38], [38, 58], [58, 56], [74, 58], [22, 58]];
    for (const [x, y] of list) b.part(() => {
        if (br === "a") { b.blob(x, y + 2, 6.5, 7, col); }
        else b.stroke([[x, y - 8], [x + 2.5, y + 2], [x - 2, y + 11]], [6.5, 5, 1], col, { tex: 0.2, lo: "#8a2a1c" });
        b.line(x, y - 9, x + 1, y - 12, 2.2, DEEP);
    }, 1.3);
    if (br === "b" && t === 3) b.stroke([[48, 10], [44, 16], [50, 22]], [2, 5, 1], "#f7b23c");
    if (t >= 2) star(b, 84, 14, t);
}
function lantern(b, t, br) {
    shadow(b, 48, 85, 20, 7);
    b.part(() => { b.line(36, 86, 36, 18, 5, IRON); b.stroke([[36, 20], [38, 6], [58, 6], [62, 20]], 4, IRON); b.blob(36, 86, 11, 4, "#333036"); }, 1.7);
    if (br === "b") {
        b.part(() => { const r = t === 3 ? 21 : 17; b.stroke([[60, 42], [62, 24]], 3, BRASS); b.circle(60, 46, r + 3, BRASS, { tex: 0.1 }); b.circle(60, 46, r, "#d9eef5", { tex: 0, hi: "#ffffff", lo: "#9cc7d8" }); }, 1.9);
        b.stroke([[52, 36], [58, 32]], 2.5, "#ffffffcc");
    } else {
        b.part(() => {
            b.poly([[50, 26], [74, 26], [78, 58], [46, 58]], "#fbe39b", { lo: "#f2b04b", tex: 0.4 });
            b.blob(62, 46, 9, 12, "#fff6cf", { tex: 0, light: 0, edge: 0 });
            b.line(50, 26, 46, 58, 2.6, IRON); b.line(74, 26, 78, 58, 2.6, IRON); b.line(62, 26, 62, 58, 2, IRON);
            b.poly([[44, 27], [80, 27], [66, 15], [58, 15]], IRON);
            b.blob(62, 60, 18, 3.6, IRON);
            b.line(62, 8, 62, 16, 2, IRON);
        }, 1.8);
        if (br === "a") { for (const [x, y] of t === 3 ? [[20, 40], [14, 58], [78, 72], [26, 74], [62, 76]] : [[22, 50], [72, 74], [16, 70]]) b.circle(x, y, 3.2, "#d6f27a", { tex: 0, light: 0 }); }
    }
    if (t >= 2) star(b, 84, 14, t);
}
function saucer(b, t, br) {
    shadow(b, 48, 78, 34, 8);
    if (br === "a") b.part(() => { b.line(68, 70, 80, 30, 6, "#c94a6a"); leaf(b, 80, 30, 18, 12, -1.2, DEEP); if (t === 3) { b.line(26, 70, 16, 34, 6, "#c94a6a"); leaf(b, 16, 34, 18, 12, -2, DEEP); } }, 1.6);
    b.part(() => { b.blob(48, 70, 34, 13, "#f3ecdc", { lo: "#b8b0a8" }); b.blob(48, 69, 28, 9, "#dfe7ee"); b.stroke([[20, 72], [48, 82], [76, 72]], 1.8, "#7ea6b5"); }, 2);
    const wine = br === "a" ? "#c94a6a" : br === "b" ? "#4e4a8a" : PLUM;
    b.blob(48, 68, 25, 7.5, wine, { hi: mix(wine, "#fff", 0.45), tex: 0.2, wob: 0.03 });
    b.blob(40, 66, 8, 2, "#ffffff77", { tex: 0, light: 0, edge: 0 });
    if (br === "b") b.part(() => { b.blob(48, 42, 13, 13, BUTTER); b.blob(54, 39, 11, 12, "#00000000"); }, 1.4);
    if (br === "b") { b.blob(54, 39, 10, 11, "#00000000"); for (const [x, y] of [[66, 34], [28, 40]]) b.circle(x, y, 2.4, BUTTER, { tex: 0 }); }
    if (t === 3 && br === "a") b.part(() => { b.blob(48, 42, 9, 12, "#8a6a48"); b.blob(48, 30, 4, 4, "#a57a4d"); b.line(44, 44, 52, 44, 2, CREAM); }, 1.6);
    if (t >= 2) star(b, 84, 14, t);
}

// Register five looks per defender: 1, a2, a3, b2, b3.
const LOOKS = [[1, null], [2, "a"], [3, "a"], [2, "b"], [3, "b"]];
for (const [name, fn] of Object.entries({ gnome, bramble, hive, sprinkler, box, compost, chilli, lantern, wine: saucer })) reg(name, 5, (b, f) => fn(b, ...LOOKS[f]));
reg("flytrap", 10, (b, f) => flytrap(b, ...LOOKS[f % 5], f < 5));
reg("scarecrow", 6, (b, f) => (f === 5 ? scarecrow(b, 1, null, true) : scarecrow(b, ...LOOKS[f])));
reg("chime", 5, (b, f) => chime(b, ...LOOKS[f]));
reg("chimeBells", 5, (b, f) => chimeBells(b, ...LOOKS[f]));

// ---- Pests. Side view, facing right. Two frames unless noted. ------------------------------------------------------
function slugBody(b, f, c, belly, x0 = 8, x1 = 86, top = 44, stalk = 22) {
    const s = f ? 2 : 0;
    shadow(b, 48, 80, 40, 7);
    b.part(() => {
        const pts = [[x0 - s, 76]];
        for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([x0 + 10 + (x1 - x0 - 26) * t, 76 - Math.sin(t * Math.PI) * (76 - top) - Math.sin(t * 9 + f * 2) * 1.5 + s * 0.8]); }
        pts.push([x1 - 6 + s, 52 + s], [x1 + s, 62 + s], [x1 - 4 + s, 74], [x1 - 20, 78]);
        b.poly(pts, c, { tex: 0.45 });
        b.blob((x0 + x1) / 2 - 8, 60 + s, (x1 - x0) / 2 - 12, 15, c, { hi: mix(c, "#fff4cf", 0.55), wob: 0.05, tex: 0.4, edge: 0.05 });
        b.blob((x0 + x1) / 2, 75, (x1 - x0) / 2 - 4, 4.5, belly, { tex: 0.15 });
        // Keel stripes
        for (let i = 0; i < 4; i++) b.stroke([[x0 + 16 + i * 11, 58 + s], [x0 + 20 + i * 11, 50 + s]], 1.6, "#00000022");
    }, 2.4);
    const hx = x1 - 12 + s, hy = 54 + s;
    b.part(() => {
        b.stroke([[hx - 4, hy], [hx - 7, hy - stalk * 0.6], [hx - 8 + f, hy - stalk]], [3.4, 2.8], c);
        b.stroke([[hx + 4, hy], [hx + 6, hy - stalk * 0.6], [hx + 7 - f, hy - stalk - 1]], [3.4, 2.8], c);
    }, 1.5);
    eye(b, hx - 8 + f, hy - stalk - 1, 5.2); eye(b, hx + 7 - f, hy - stalk - 2, 5.2);
    smile(b, hx + 3, hy + 8, 4);
}
reg("slug", 2, (b, f) => slugBody(b, f, "#c9873f", "#ecd4a0"));
reg("baby", 2, (b, f) => slugBody(b, f, "#e8ab5c", "#f8e6bc", 12, 84, 50, 18));
reg("frost", 2, (b, f) => { slugBody(b, f, "#8fc4dc", "#e6f3f7"); for (const [x, y] of [[24, 56], [38, 50], [52, 52]]) b.poly([[x, y - 10], [x + 4, y], [x - 4, y]], "#e9f7fb", { lo: "#a6d2e3" }); });
reg("broody", 2, (b, f) => {
    slugBody(b, f, "#a0603f", "#e7c79c", 4, 90, 28, 22);
    b.part(() => { for (const [x, y] of [[20, 62], [32, 54], [44, 62], [28, 70], [54, 54], [50, 70]]) b.blob(x, y, 7, 6, "#f4e3b5", { tex: 0.1 }); }, 1.4);
});
reg("snail", 3, (b, f) => {
    const out = f === 2;
    shadow(b, 48, 80, 40, 7);
    b.part(() => {
        b.blob(52, 74, 40, 8, "#dcb985", { tex: 0.4 });
        b.stroke([[78, 72], [84, 58], [84, 50]], [10, 8], "#dcb985");
    }, 2.2);
    b.part(() => { b.stroke([[82, 50], [78, 34 + f], [76, 28]], [3, 2.4], "#dcb985"); b.stroke([[86, 50], [90, 36], [90, 30 - f]], [3, 2.4], "#dcb985"); }, 1.3);
    eye(b, 76, 26 + f, 4.8); eye(b, 90, 28 - f, 4.8);
    if (out) {
        // Shell lifted and steaming clean: this is when it's soft.
        b.part(() => { b.circle(40, 44, 27, "#b98ad1", { lo: "#6d4a88" }); b.stroke([[40, 44], [50, 38], [52, 52], [34, 58], [24, 40], [40, 24]], 3, "#6d4a8888"); }, 2.2);
        for (const [x, y] of [[14, 20], [28, 12], [46, 16]]) b.blob(x, y, 3, 4.2, "#8ccbe8", { tex: 0 });
    } else {
        b.part(() => {
            b.circle(40, 50 - f * 0, 27, "#6f7f9f", { hi: "#c7d3e3", lo: "#39405e", tex: 0.25 });
            b.stroke([[40, 50], [50, 44], [52, 58], [34, 64], [24, 46], [40, 30]], 3.4, "#39405ecc");
            for (let i = 0; i < 9; i++) { const a = i * 0.7; b.circle(40 + Math.cos(a) * 23, 50 + Math.sin(a) * 23, 2.4, "#e0c583", { tex: 0 }); }
        }, 2.6);
    }
});
reg("ant", 2, (b, f) => {
    shadow(b, 48, 76, 34, 6);
    b.part(() => {
        const s = f ? 1 : -1;
        for (const [x, d] of [[34, -1], [48, 0], [60, 1]]) { b.stroke([[x, 58], [x + d * 10 + s * 6, 66], [x + d * 16 + s * 10, 78]], 3.4, "#3f1f1a"); b.stroke([[x, 58], [x + d * 10 - s * 6, 66], [x + d * 16 - s * 10, 78]], 3.4, "#3f1f1a"); }
        b.blob(24, 54, 18, 14, "#7a3226", { hi: "#d87a54" }); b.blob(50, 54, 10, 9, "#7a3226", { hi: "#d87a54" }); b.blob(72, 48, 13, 12, "#7a3226", { hi: "#d87a54" });
        b.stroke([[78, 38], [84, 24], [92, 22]], 2.6, "#3f1f1a"); b.stroke([[72, 37], [72, 22], [80, 18]], 2.6, "#3f1f1a");
    }, 2.4);
    eye(b, 76, 46, 4.6);
});
reg("earwig", 2, (b, f) => {
    shadow(b, 48, 76, 40, 6);
    b.part(() => {
        const s = f ? 2 : -2;
        for (const x of [46, 58, 70]) { b.stroke([[x, 58], [x + s + 2, 72], [x + s * 2 + 6, 78]], 3, "#3a2015"); }
        b.stroke([[12, 52], [2, 40], [14, 30]], [5, 3, 1.5], "#54301d"); b.stroke([[12, 60], [0, 68], [4, 80]], [5, 3, 1.5], "#54301d");
        b.blob(44, 56, 34, 11, "#8a4a26", { hi: "#d8955a" });
        for (let i = 0; i < 4; i++) b.line(20 + i * 12, 46, 20 + i * 12, 66, 1.6, "#3a201555");
        b.blob(80, 53, 11, 10, "#6e3a1f", { hi: "#c07a44" });
        b.stroke([[86, 44], [92, 32]], 2, "#3a2015"); b.stroke([[82, 44], [84, 30]], 2, "#3a2015");
    }, 2.4);
    eye(b, 83, 50, 4.2);
});
reg("aphid", 2, (b, f) => {
    shadow(b, 48, 88, 22, 4);
    b.part(() => {
        b.blob(38, 26 + (f ? 8 : 0), 24, f ? 10 : 15, "#e9f6e6c8", { rot: f ? -0.1 : -0.7, tex: 0.1 });
        b.blob(56, 24 + (f ? 8 : 0), 22, f ? 9 : 14, "#e9f6e6c8", { rot: f ? 0.1 : -1.1, tex: 0.1 });
    }, 1.2);
    b.part(() => { b.blob(46, 56, 28, 21, "#c6e04f", { lo: "#6f9a2a", hi: "#f4ffb0" }); for (const x of [18, 30]) b.stroke([[x, 46], [x - 8, 40]], 3, "#6f9a2a"); }, 2.6);
    eye(b, 62, 50, 7); eye(b, 76, 52, 5.4);
    smile(b, 66, 64, 4);
});
reg("wasp", 2, (b, f) => {
    shadow(b, 48, 88, 26, 4);
    b.part(() => {
        b.blob(34, 26 + (f ? 10 : 0), 26, f ? 9 : 13, "#dff0f4c8", { rot: f ? 0 : -0.5 });
        b.blob(50, 24 + (f ? 10 : 0), 24, f ? 8 : 11, "#dff0f4c8", { rot: f ? 0.1 : -0.9 });
    }, 1.2);
    b.part(() => {
        b.poly([[8, 58], [24, 50], [24, 66]], "#2b1d14");
        b.blob(38, 58, 26, 15, "#f0bf2e", { hi: "#ffe88e", lo: "#b6761a" });
        b.blob(66, 54, 12, 12, "#2f2318");
        for (const x of [24, 38, 50]) b.stroke([[x, 44], [x + 1, 58], [x - 2, 72]], 6.5, "#2b1d14");
    }, 2.3);
    b.part(() => b.blob(80, 52, 11, 10, "#f0bf2e"), 2);
    eye(b, 83, 50, 5); b.line(78, 42, 72, 30, 2, "#2b1d14"); b.line(84, 42, 86, 28, 2, "#2b1d14");
    b.stroke([[76, 58], [82, 62], [88, 58]], 2, "#2b1d14");
    b.line(77, 44, 87, 46, 2.4, "#2b1d14");
});
reg("mole", 3, (b, f) => {
    if (f === 2) { // a rolling hump of earth
        b.part(() => { b.blob(48, 66, 34, 18, SOIL, { wob: 0.3, tex: 0.7 }); for (let i = 0; i < 7; i++) b.circle(18 + i * 10, 56 + (i % 3) * 7, 3.6, "#4f3626"); }, 1.8);
        return;
    }
    shadow(b, 48, 84, 36, 7);
    b.part(() => { b.blob(48, 74, 36, 11, SOIL, { wob: 0.26, tex: 0.7 }); }, 1.8);
    b.part(() => {
        b.blob(48, 48, 26, 28, "#4d4256", { hi: "#9e8fae", lo: "#25202d", tex: 0.35 });
        b.blob(48, 68, 15, 9, "#6d5e78", { tex: 0.2 });
    }, 2.4);
    b.part(() => { b.blob(18, 66 - f * 3, 10, 7, "#e7a8a0"); b.blob(78, 66 + f * 3, 10, 7, "#e7a8a0"); for (const [x, s] of [[12, -1], [18, 0], [24, 1], [72, -1], [78, 0], [84, 1]]) b.line(x, 66, x + s * 2, 73, 2, "#fff4e0"); }, 1.7);
    b.part(() => b.blob(48, 44, 7, 6, "#ee9d93"), 1.6);
    for (const x of [36, 60]) b.stroke([[x - 4, 36], [x, 34], [x + 4, 36]], 2.2, "#16121c");
    for (const s of [-1, 1]) for (const a of [0, 4]) b.line(48 + s * 8, 46 + a, 48 + s * 24, 44 + a * 1.6, 1, "#d7cfdc");
});
reg("beetle", 3, (b, f) => {
    const flash = f === 2;
    shadow(b, 48, 80, 38, 7);
    b.part(() => {
        const s = f === 1 ? 2 : -2;
        for (const x of [26, 44, 60]) { b.stroke([[x, 64], [x + s, 74], [x + s * 2 - 3, 80]], 3.6, "#241c33"); }
        b.blob(40, 52, 32, 25, "#435a9c", { hi: "#9fd0e8", lo: "#2a2556", tex: 0.2 });
        b.line(10, 50, 72, 50, 2.4, "#1c1c3a");
    }, 2.5);
    b.part(() => {
        b.blob(82, 48, 12, 32, flash ? "#fff1a8" : "#c8964a", { hi: "#ffe9a5", lo: "#7a4f22", tex: 0.2 });
        b.circle(82, 48, 4.5, "#8c5f2b", { tex: 0 });
        for (const y of [26, 70]) b.circle(84, y, 2.2, "#ffe9a5", { tex: 0 });
    }, 2.3);
    eye(b, 64, 38, 5.2);
});
reg("cater", 2, (b, f) => {
    shadow(b, 48, 80, 40, 6);
    b.part(() => {
        for (let i = 0; i < 6; i++) {
            const x = 12 + i * 13, y = 62 + Math.sin(i * 1.2 + f * 2.2) * 5;
            b.blob(x, y, 11, 14, i % 2 ? "#7fb04a" : "#a4cc58", { hi: "#e6f59a" });
            b.stroke([[x - 3, y + 12], [x - 2, y + 18]], 3, "#39501f");
        }
        b.blob(84, 50, 12, 12, "#c86a3a", { hi: "#f4b67a" });
    }, 2.2);
    eye(b, 87, 47, 5); b.stroke([[82, 38], [76, 26]], 2.2, "#39501f"); b.stroke([[88, 38], [92, 26]], 2.2, "#39501f");
    for (let i = 0; i < 5; i++) b.circle(14 + i * 13, 54, 2.2, "#ffe06b", { tex: 0 });
});
reg("louse", 3, (b, f) => {
    if (f === 2) { // rolled into a ball
        shadow(b, 48, 80, 26, 6);
        b.part(() => { b.circle(48, 54, 27, "#8f8fa3", { hi: "#d3d3e0", lo: "#4d4d63" }); for (const a of [20, 34, 50, 64]) b.stroke([[a, 32], [a + 8, 54], [a, 78]], 2.2, "#4d4d6399"); }, 2.4);
        return;
    }
    shadow(b, 48, 80, 38, 6);
    b.part(() => {
        const s = f ? 2 : -2;
        for (let i = 0; i < 6; i++) b.line(18 + i * 11, 66, 16 + i * 11 + s, 78, 2.4, "#35354a");
        b.blob(44, 52, 36, 20, "#8f8fa3", { hi: "#d3d3e0", lo: "#4d4d63" });
        for (let i = 0; i < 7; i++) b.stroke([[14 + i * 10, 36 + Math.abs(i - 3) * 2], [17 + i * 10, 52], [14 + i * 10, 68]], 1.8, "#3f3f5588");
    }, 2.3);
    b.part(() => b.blob(80, 56, 9, 9, "#6f6f85"), 1.8);
    eye(b, 82, 54, 4.4);
});
reg("egg", 2, (b, f) => {
    shadow(b, 48, 78, 22, 5);
    b.part(() => b.blob(48, 54 + (f ? 2 : 0), 21, 25 - (f ? 2 : 0), "#f4e3b5", { hi: "#fffbea", lo: "#c7a56a", tex: 0.2 }), 2.2);
    if (f) b.stroke([[32, 48], [40, 54], [46, 46], [54, 54]], 2, "#38261c");
    b.circle(50, 56, 7, "#c9873f88", { tex: 0, light: 0 });
});

// ---- Bosses, on the big sheet ------------------------------------------------------------------------------------
function bigSlug(b, f, c, belly, o = {}) {
    const s = f ? 4 : 0, cx = 92;
    b.blob(cx, 170, 86, 13, "#2a1c1444", { tex: 0, light: 0, edge: 0 });
    b.part(() => {
        const pts = [[8 - s, 160]];
        for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([18 + 134 * t, 160 - Math.sin(t * Math.PI * 0.94 + 0.1) * 112 + s * 0.8 - Math.sin(t * 12 + f) * 2]); }
        pts.push([176 + s, 112 + s], [184 + s, 138 + s], [176 + s, 156], [150, 166]);
        b.poly(pts, c, { tex: 0.35 });
        b.blob(82, 108 + s, 62, 42, c, { hi: mix(c, "#fff4cf", 0.6), wob: 0.05, tex: 0.3, edge: 0.04 });
        b.blob(96, 160, 90, 9, belly, { tex: 0.15 });
        for (let i = 0; i < 6; i++) b.stroke([[30 + i * 20, 116], [38 + i * 20, 72 + Math.abs(i - 2.5) * 7]], 3, "#00000022");
        for (const [x, y, r] of [[52, 90, 7], [86, 74, 5], [40, 124, 6], [100, 120, 4], [72, 130, 5]]) b.blob(x, y, r, r * 0.8, "#00000022", { tex: 0.2, light: 0 });
    }, 4);
    const hx = 158 + s, hy = 104 + s;
    b.part(() => {
        b.stroke([[hx - 12, hy], [hx - 18, hy - 32], [hx - 16 + f, hy - 56]], [8, 6], c);
        b.stroke([[hx + 8, hy], [hx + 12, hy - 30], [hx + 16 - f, hy - 52]], [8, 6], c);
    }, 2.2);
    eye(b, hx - 16 + f, hy - 60, 12.5, 0.3); eye(b, hx + 16 - f, hy - 56, 11.5, 0.3);
    b.stroke([[hx - 28, hy - 74], [hx - 6, hy - 62]], 3.4, "#38261c"); b.stroke([[hx + 28, hy - 72], [hx + 6, hy - 62]], 3.4, "#38261c");
    b.part(() => { b.stroke([[hx - 14, hy + 16], [hx + 2, hy + 26], [hx + 22, hy + 12]], 4, "#38261c"); }, 0);
    b.part(() => { b.poly([[hx - 8, hy + 19], [hx - 2, hy + 19], [hx - 5, hy + 28]], "#fff8e6"); b.poly([[hx + 8, hy + 19], [hx + 14, hy + 17], [hx + 11, hy + 26]], "#fff8e6"); }, 1.2);
    if (o.crown) b.part(() => { b.poly([[62, 56], [60, 26], [76, 42], [88, 18], [100, 40], [116, 26], [114, 56]], BUTTER, { lo: "#b77a24" }); for (const x of [74, 88, 102]) b.circle(x, 50, 4, x === 88 ? RED : BLUE, { tex: 0 }); }, 2.8);
    if (o.icy) { for (const [x, y, h] of [[34, 112, 28], [58, 84, 32], [84, 70, 34], [110, 76, 28], [132, 92, 22]]) b.part(() => b.poly([[x - 8, y], [x + 1, y - h], [x + 9, y]], "#e9f7fb", { lo: "#8fc4dc" }), 2); }
}
reg("bertha", 2, (b, f) => bigSlug(b, f, "#c07b3c", "#ecd4a0", { crown: true }), true);
reg("gloop", 2, (b, f) => bigSlug(b, f, "#7c6fb0", "#dcd8f0", { icy: true, crown: true }), true);
reg("shelly", 3, (b, f) => {
    const sh = f === 2;
    b.blob(96, 170, 84, 12, "#2a1c1444", { tex: 0, light: 0, edge: 0 });
    b.part(() => {
        if (!sh) { b.blob(104, 152, 80, 15, "#dcb985"); b.stroke([[156, 148], [170, 118], [170, 100]], [22, 16], "#dcb985"); b.stroke([[166, 100], [158, 74], [152, 62]], [6, 5], "#dcb985"); b.stroke([[174, 100], [182, 76], [180, 64]], [6, 5], "#dcb985"); }
        else b.blob(96, 158, 66, 12, "#dcb985");
    }, 3);
    if (!sh) { eye(b, 152, 60, 10); eye(b, 180, 62, 10); b.part(() => b.line(146, 50, 186, 54, 7, IRON), 2); }
    b.part(() => {
        b.circle(84, 96, 62, "#6b7fa8", { hi: "#d6e0ee", lo: "#2f3656", tex: 0.2 });
        b.stroke([[84, 96], [106, 84], [108, 114], [70, 124], [48, 88], [84, 56]], 7, "#2f3656cc");
        for (let i = 0; i < 12; i++) { const a = i * 0.524; b.circle(84 + Math.cos(a) * 53, 96 + Math.sin(a) * 53, 4.5, "#e0c583", { tex: 0 }); }
    }, 4);
    b.part(() => { b.poly([[60, 30], [84, 6], [108, 30], [100, 42], [68, 42]], RED); b.stroke([[84, 8], [78, 0], [70, 8]], 5, RED); }, 2.4);
}, true);
reg("digger", 3, (b, f) => {
    if (f === 2) { b.part(() => { b.blob(96, 136, 72, 36, SOIL, { wob: 0.3, tex: 0.7 }); for (let i = 0; i < 12; i++) b.circle(36 + i * 11, 118 + (i % 3) * 12, 6, "#4f3626"); }, 3); return; }
    b.blob(96, 170, 84, 12, "#2a1c1444", { tex: 0, light: 0, edge: 0 });
    b.part(() => b.blob(96, 152, 80, 20, SOIL, { wob: 0.24, tex: 0.7 }), 3);
    b.part(() => { b.blob(96, 92, 62, 72, "#463b4f", { hi: "#a696b5", lo: "#201b28", tex: 0.35 }); b.blob(96, 132, 36, 24, "#6d5e78", { tex: 0.2 }); }, 4);
    b.part(() => { b.blob(28, 134 - f * 5, 24, 16, "#e7a8a0"); b.blob(164, 134 + f * 5, 24, 16, "#e7a8a0"); for (const [x, s] of [[12, -1], [28, 0], [44, 1], [148, -1], [164, 0], [180, 1]]) b.line(x, 134, x + s * 4, 152, 5, "#fff4e0"); }, 2.4);
    b.part(() => b.blob(96, 84, 15, 12, "#ee9d93"), 2.2);
    for (const x of [70, 122]) b.stroke([[x - 8, 68], [x, 63], [x + 8, 68]], 4, "#16121c");
    b.part(() => { b.circle(120, 68, 15, "#ffffff22", { tex: 0, light: 0 }); b.stroke([[120, 83], [130, 110]], 1.5, BRASS); }, 2, BRASS);
    b.part(() => { b.poly([[60, 34], [56, 4], [76, 22], [96, 0], [116, 22], [136, 4], [132, 34]], BUTTER, { lo: "#b77a24" }); for (const x of [78, 96, 114]) b.circle(x, 28, 4.6, x === 96 ? RED : BLUE, { tex: 0 }); }, 2.8);
}, true);
reg("lady", 2, (b, f) => {
    b.blob(96, 182, 56, 7, "#2a1c1433", { tex: 0, light: 0, edge: 0 });
    b.part(() => {
        b.blob(62, 50 + (f ? 18 : 0), 54, f ? 20 : 32, "#e9f6e6c0", { rot: f ? -0.1 : -0.7, tex: 0.1 });
        b.blob(130, 46 + (f ? 18 : 0), 50, f ? 18 : 30, "#e9f6e6c0", { rot: f ? 0.1 : -2.3, tex: 0.1 });
    }, 2);
    b.part(() => {
        b.blob(92, 110, 66, 50, "#b9dc48", { lo: "#5f8a24", hi: "#f6ffb4" });
        for (const [x, y] of [[50, 96], [70, 140], [114, 142], [46, 126]]) b.blob(x, y, 9, 7, "#8fb733", { tex: 0.2 });
    }, 4);
    b.part(() => { b.blob(150, 88, 30, 28, "#cfea60", { hi: "#f6ffb4", lo: "#6f9a2a" }); }, 3);
    eye(b, 142, 80, 12); eye(b, 168, 84, 10);
    b.stroke([[130, 64], [122, 40], [108, 30]], 3, "#5f8a24"); b.stroke([[158, 62], [166, 38], [180, 30]], 3, "#5f8a24");
    b.stroke([[146, 104], [156, 112], [168, 104]], 3, "#38261c");
    b.part(() => { b.poly([[130, 62], [128, 42], [140, 52], [150, 36], [160, 52], [172, 44], [170, 66]], "#f3c0d0", { lo: "#b77a94" }); for (const x of [140, 150, 160]) b.circle(x, 58, 2.8, CREAM, { tex: 0 }); }, 2.4);
    b.stroke([[120, 92], [130, 86], [122, 110]], 3, "#8a5ba0");
}, true);

// ---- The marrow, the thing you are protecting. Frames show how much has been eaten. ---------------------------------
reg("marrow", 5, (b, f) => {
    b.blob(96, 168, 88, 13, "#2a1c1444", { tex: 0, light: 0, edge: 0 });
    b.part(() => {
        b.stroke([[40, 150], [20, 170], [8, 150]], 4, "#5f8a4b");
        leaf(b, 150, 150, 40, 30, 0.5, LEAF); leaf(b, 46, 154, 40, 28, 2.8, DEEP);
    }, 2);
    b.part(() => {
        b.blob(96, 112, 84, 50, "#5c8f4e", { hi: "#c8e38a", lo: "#2e5a3a", tex: 0.25, wob: 0.04, rot: -0.08 });
        for (let i = 0; i < 7; i++) b.stroke([[24 + i * 24, 76 + Math.abs(i - 3) * 7], [20 + i * 25, 112], [26 + i * 24, 152 - Math.abs(i - 3) * 6]], [3, 7, 3], "#e8e6a4aa");
        b.blob(176, 104, 10, 13, "#a9a35a");
    }, 3.4);
    b.stroke([[10, 112], [0, 100]], 8, "#6d5a35");
    // Rosette: first prize
    b.part(() => { for (let i = 0; i < 12; i++) { const a = i * 0.524; b.circle(68 + Math.cos(a) * 16, 104 + Math.sin(a) * 16, 6, "#c8553d"); } b.circle(68, 104, 14, CREAM, { tex: 0.1 }); b.poly([[60, 122], [52, 150], [64, 142], [68, 124]], "#c8553d"); b.poly([[76, 122], [86, 150], [74, 142], [68, 124]], "#c8553d"); }, 2);
    b.circle(68, 104, 7, BUTTER, { tex: 0 });
    // Bites
    const bites = [[150, 74, 24], [172, 136, 22], [106, 66, 24], [122, 160, 22]];
    for (let i = 0; i < f; i++) {
        const [x, y, r] = bites[i];
        for (let k = 0; k < 4; k++) { const a = k * 1.4 + i; const xx = x + Math.cos(a) * r * 0.5, yy = y + Math.sin(a) * r * 0.4; for (let j = 0, n = b.w * b.h * 4; j < 0; j++) { if (n) break; }
            cut(b, xx, yy, r * 0.62); }
        b.blob(x, y, r * 0.5, r * 0.4, "#efe6a8", { tex: 0.3 });
    }
}, true);
function cut(b, x, y, r) {
    const p = b.px, w = b.w;
    for (let j = Math.max(0, (y - r - 1) | 0); j <= Math.min(b.h - 1, y + r + 1); j++) for (let i = Math.max(0, (x - r - 1) | 0); i <= Math.min(w - 1, x + r + 1); i++) {
        const d = Math.hypot(i + 0.5 - x, j + 0.5 - y), c = Math.max(0, Math.min(1, r - d + 0.5));
        if (c > 0) { const o = (j * w + i) * 4; const flesh = rgb("#efe6a8"); p[o] += (flesh[0] - p[o]) * c; p[o + 1] += (flesh[1] - p[o + 1]) * c; p[o + 2] += (flesh[2] - p[o + 2]) * c; }
    }
}

// ---- Gran, in eight moods, on the big sheet --------------------------------------------------------------------------
export const GRAN = { knit: 0, knit2: 1, sip: 2, wave: 3, gasp: 4, cheer: 5, cross: 6, sleep: 7 };
function gran(b, f) {
    const skin = "#f0c8a4", hair = "#ece6e0", lilac = "#9a7fb5", cheer = f === 5, wave = f === 3, up = cheer ? -6 : 0;
    // Cardigan
    b.part(() => {
        b.blob(96, 182 + up, 74, 62, lilac, { lo: "#5d4580", hi: "#cdbbe0", tex: 0.5 });
        b.blob(96, 174 + up, 22, 40, "#f2e4c8", { tex: 0.2 });
        for (const y of [150, 168, 186]) b.circle(116, y + up, 4, BUTTER, { tex: 0 });
    }, 3);
    // Head
    b.part(() => {
        b.blob(96, 40 + up, 26, 22, hair, { lo: "#b1a7ab", wob: 0.2, tex: 0.4, freq: 5 });       // bun
        b.blob(96, 84 + up, 46, 44, skin, { lo: "#c98e72", hi: "#fbe4cc", tex: 0.12, wob: 0.04 });
        b.blob(96, 58 + up, 50, 25, hair, { lo: "#b1a7ab", wob: 0.18, tex: 0.5, freq: 5 });
        b.blob(52, 78 + up, 11, 18, hair, { lo: "#b1a7ab", wob: 0.2, tex: 0.4 }); b.blob(140, 78 + up, 11, 18, hair, { lo: "#b1a7ab", wob: 0.2, tex: 0.4 });
    }, 3);
    b.blob(70, 100 + up, 12, 8, "#ef9d90aa", { tex: 0, light: 0, edge: 0 }); b.blob(122, 100 + up, 12, 8, "#ef9d90aa", { tex: 0, light: 0, edge: 0 });
    // Eyes and specs
    const eyes = (ey, shut) => {
        for (const x of [76, 116]) {
            if (shut) b.stroke([[x - 9, ey], [x, ey + (shut > 0 ? 4 : -5)], [x + 9, ey]], 3, "#38261c");
            else { b.circle(x, ey, 6.5, "#fffdf2", { tex: 0, light: 0 }); b.circle(x + 1, ey + 1, 4, "#3d2a1e", { tex: 0, wob: 0, light: 0 }); b.circle(x, ey - 1, 1.3, "#fff", { tex: 0, wob: 0, light: 0, edge: 0 }); }
            b.stroke([[x - 13, ey - 10], [x, ey - 13], [x + 13, ey - 10], [x + 14, ey + 6], [x, ey + 11], [x - 14, ey + 6], [x - 13, ey - 10]], 2.8, BRASS, { tex: 0.1 });
        }
        b.line(90, ey - 5, 102, ey - 5, 2.8, BRASS);
    };
    const ey = 82 + up;
    if (f === 7) { eyes(ey, 1); b.blob(96, 118 + up, 5, 4, "#a4574c", { tex: 0, light: 0 }); }
    else if (f === 4) {
        eyes(ey - 2, 0);
        b.blob(96, 118, 10, 13, "#7c2f35", { tex: 0, light: 0 });
        for (const x of [64, 128]) b.stroke([[x - 12, 56], [x + 2, 52]], 4, hair);
    } else if (f === 6) {
        eyes(ey, 0);
        b.stroke([[60, 62], [86, 72]], 5, "#b1a7ab"); b.stroke([[132, 62], [106, 72]], 5, "#b1a7ab");
        b.stroke([[84, 118], [96, 113], [108, 118]], 3.2, "#7c3a35");
    } else if (cheer) {
        eyes(ey, -1);
        b.part(() => { b.blob(96, 112 + up, 17, 12, "#7c2f35", { tex: 0, light: 0 }); b.blob(96, 106 + up, 13, 4, "#fffdf2", { tex: 0, light: 0 }); }, 1.6);
    } else {
        eyes(ey, 0);
        b.stroke([[82, 112], [96, 119], [110, 112]], 3.2, "#a4574c");
    }
    b.blob(96, 98 + up, 7, 6, "#e9ad90", { tex: 0.1 });
    // Hands and props
    if (f === 0 || f === 1) {
        const k = f ? 5 : -5;
        b.part(() => {
            b.blob(96, 168, 36, 16, "#e0705a", { tex: 0.7, freq: 6 });
            b.line(64 + k, 136, 112 + k, 176, 3.4, "#d9c9a6"); b.line(128 - k, 136, 80 - k, 176, 3.4, "#d9c9a6");
            b.circle(64 + k, 135, 4, RED, { tex: 0 }); b.circle(128 - k, 135, 4, RED, { tex: 0 });
        }, 2);
        b.part(() => { b.circle(60, 170, 11, skin); b.circle(132, 170, 11, skin); }, 2);
    } else if (f === 2) {
        b.part(() => { b.blob(126, 116, 18, 15, CREAM, { tex: 0.1 }); b.blob(126, 104, 18, 4, "#8a5a33", { tex: 0 }); b.stroke([[144, 108], [156, 116], [142, 124]], 3.4, CREAM); for (const a of [116, 126, 136]) b.circle(a, 120, 2.2, RED, { tex: 0 }); b.circle(116, 134, 11, skin); }, 2);
    } else if (wave) {
        b.part(() => { b.stroke([[150, 166], [166, 124], [172, 92]], [20, 15], lilac); b.circle(174, 80, 14, skin); for (const a of [-0.9, -0.3, 0.3]) b.stroke([[174, 80], [174 + Math.sin(a) * 22, 80 - Math.cos(a) * 22]], 7, skin); }, 2.2);
    } else if (cheer) {
        b.part(() => { b.stroke([[40, 166], [20, 110], [24, 66]], [20, 15], lilac); b.circle(24, 54, 14, skin); b.stroke([[152, 166], [172, 110], [168, 66]], [20, 15], lilac); b.circle(168, 54, 14, skin); }, 2.2);
    } else if (f === 6) {
        b.part(() => { b.stroke([[150, 170], [168, 134], [160, 108]], [20, 15], lilac); b.circle(160, 96, 16, skin); for (const y of [90, 97, 104]) b.line(150, y, 170, y, 2, "#c98e72"); }, 2.2);
    } else if (f === 4) {
        b.part(() => { b.circle(58, 128, 14, skin); b.circle(134, 128, 14, skin); }, 2.2);
    }
}
reg("gran", 8, gran, true);

// ---- Cat, garden life and scenery ------------------------------------------------------------------------------------
reg("cat", 3, (b, f) => {
    // Gerald, a large ginger cat with opinions. f: 0 loaf, 1 eyes open, 2 tail up
    b.part(() => {
        b.stroke(f === 2 ? [[20, 70], [8, 50], [14, 28]] : [[24, 74], [8, 78], [12, 62]], [9, 6], "#d98a3f");
        b.blob(46, 62, 32, 22, "#e0963f", { hi: "#ffd28c", lo: "#a65a24", tex: 0.4 });
        for (const x of [30, 42, 54]) b.stroke([[x, 42], [x + 2, 56]], 3.5, "#b9672a");
    }, 2.3);
    b.part(() => {
        b.poly([[58, 40], [60, 18], [72, 32]], "#e0963f"); b.poly([[76, 32], [90, 18], [90, 42]], "#e0963f");
        b.blob(74, 46, 19, 17, "#e8a24e", { hi: "#ffd28c", lo: "#a65a24" });
    }, 2.2);
    if (f === 0) { b.stroke([[62, 44], [67, 47], [72, 44]], 2, "#38261c"); b.stroke([[78, 44], [83, 47], [88, 44]], 2, "#38261c"); }
    else { for (const x of [66, 83]) { b.circle(x, 45, 4.5, "#d6e27a", { tex: 0, light: 0 }); b.blob(x, 45, 1.6, 4, "#241811", { tex: 0, wob: 0, light: 0 }); } }
    b.poly([[73, 51], [78, 51], [75.5, 54]], "#d97a6c");
    b.stroke([[71, 57], [75.5, 56], [80, 57]], 1.6, "#38261c");
});
const flowers = {
    tulip: (b, c) => { b.stroke([[48, 92], [48, 40]], 4, DEEP); leaf(b, 47, 88, 34, 12, -1.9, LEAF); leaf(b, 49, 90, 30, 11, -1.15, SAGE); b.part(() => { b.blob(48, 30, 15, 19, c); b.blob(36, 26, 8, 15, c, { rot: -0.2 }); b.blob(60, 26, 8, 15, c, { rot: 0.2 }); }, 1.8); },
    daisy: (b, c) => { b.stroke([[48, 92], [46, 40]], 3, DEEP); leaf(b, 47, 80, 22, 9, -2.4, LEAF); b.part(() => { for (let i = 0; i < 11; i++) { const a = i * 0.571; b.blob(46 + Math.cos(a) * 15, 32 + Math.sin(a) * 15, 8, 4, c, { rot: a, wob: 0.05 }); } }, 1.3); b.part(() => b.circle(46, 32, 8, BUTTER, { tex: 0.3 }), 1.2); },
    poppy: (b, c) => { b.stroke([[48, 92], [52, 58], [47, 44]], 3, DEEP); b.part(() => { b.blob(38, 34, 15, 13, c); b.blob(58, 34, 15, 13, c); b.blob(48, 26, 14, 12, c); }, 1.7); b.circle(48, 34, 6, "#2f2015", { tex: 0.1 }); },
    foxglove: (b, c) => { b.stroke([[48, 94], [48, 10]], 3.6, DEEP); leaf(b, 47, 90, 30, 13, -2.5, LEAF); leaf(b, 49, 90, 30, 13, -0.6, LEAF); for (let i = 0; i < 6; i++) { const y = 18 + i * 11, s = i % 2 ? 1 : -1; b.part(() => b.blob(48 + s * (5 + i), y, 8 + i * 0.5, 6 + i * 0.3, c), 1.4); b.circle(48 + s * (9 + i), y + 1, 1.5, "#5e2466", { tex: 0 }); } },
    fern: (b) => { for (const [x, y, r] of [[48, 90, -1.57], [46, 90, -2.2], [50, 90, -0.95], [44, 92, -2.7], [52, 92, -0.45]]) leaf(b, x, y, 58, 15, r, r === -1.57 ? SAGE : LEAF); b.ink(1.2); },
    lavender: (b, c) => { for (const [x, l] of [[32, -6], [48, 0], [64, 6]]) { b.stroke([[48, 94], [x, 50]], 2.6, "#7d9a66"); for (let i = 0; i < 6; i++) b.part(() => b.blob(x + l * 0.1, 44 - i * 6.5, 5.5 - i * 0.4, 4.6, c), 1); } },
    snowdrop: (b) => { b.stroke([[48, 92], [46, 44], [58, 38]], 3, DEEP); b.part(() => { b.blob(60, 50, 7, 11, "#fbfdf8", { lo: "#b9cfc0" }); b.blob(50, 50, 6, 10, "#fbfdf8", { lo: "#b9cfc0", rot: 0.2 }); b.blob(70, 48, 6, 10, "#fbfdf8", { lo: "#b9cfc0", rot: -0.3 }); }, 1.4); },
};
reg("flower", 16, (b, f) => {
    const list = [["tulip", "#d8495f"], ["tulip", "#f0b23c"], ["tulip", "#e58fb0"], ["daisy", "#fbf8ee"], ["daisy", "#f3c6d2"], ["poppy", "#d8432f"], ["poppy", "#f08a3c"], ["foxglove", "#c264a8"], ["foxglove", "#f2c1d6"], ["lavender", "#8a6cc0"], ["fern"], ["snowdrop"], ["daisy", "#e7b53f"], ["poppy", "#7a3d99"], ["tulip", "#a33a7e"], ["lavender", "#5f7fd0"]];
    const [k, c] = list[f]; flowers[k](b, c);
});
reg("butterfly", 6, (b, f) => {
    const c = ["#f0a23c", "#5b9bd6", "#f4e9c8"][f >> 1], open = f & 1;
    const wx = open ? 26 : 12;
    b.part(() => {
        b.blob(48 - wx * 0.8, 38, wx, 22, c, { rot: 0.3 }); b.blob(48 + wx * 0.8, 38, wx, 22, c, { rot: -0.3 });
        b.blob(48 - wx * 0.6, 62, wx * 0.7, 15, c, { rot: -0.3 }); b.blob(48 + wx * 0.6, 62, wx * 0.7, 15, c, { rot: 0.3 });
    }, 2.6);
    for (const s of [-1, 1]) b.circle(48 + s * wx * 0.9, 36, wx * 0.28, "#38261c", { tex: 0, light: 0 });
    b.part(() => { b.blob(48, 50, 4, 20, "#38261c", { tex: 0 }); b.stroke([[46, 32], [40, 18]], 1.6, "#38261c"); b.stroke([[50, 32], [56, 18]], 1.6, "#38261c"); }, 0);
});
reg("bee", 2, (b, f) => {
    b.part(() => { b.blob(40, 26 + f * 8, 16, f ? 7 : 16, "#e9f6f6d0", { rot: -0.4, tex: 0 }); b.blob(58, 26 + f * 8, 16, f ? 7 : 16, "#e9f6f6d0", { rot: 0.4, tex: 0 }); }, 2.4);
    b.part(() => { b.blob(48, 56, 32, 23, "#f2c230", { hi: "#ffe98e", lo: "#c47f14" }); for (const x of [36, 54]) b.stroke([[x, 34], [x + 2, 56], [x - 2, 78]], 9, "#2b1d14"); }, 3.2);
    eye(b, 70, 50, 7);
});
reg("robin", 3, (b, f) => {
    b.part(() => {
        b.stroke([[24, 58], [10, 52]], [8, 4], "#6d5436");
        b.blob(48, 58, 26, 22, "#7a6248", { hi: "#b49a78", tex: 0.3 });
        b.blob(58, 62, 16, 16, "#e0693a", { hi: "#ffb27e", lo: "#a83c1f" });
        b.blob(64, 40, 15, 14, "#7a6248", { hi: "#b49a78" });
        b.blob(68, 44, 9, 9, "#e0693a", { hi: "#ffb27e" });
        b.poly([[78, 38], [90, 41], [78, 44]], "#38261c");
    }, 2.3);
    b.circle(70, 37, 3.4, "#241811", { tex: 0, wob: 0, light: 0 }); b.circle(69, 36, 1, "#fff", { tex: 0, wob: 0, light: 0, edge: 0 });
    b.line(44, 80, 44, 90, 2, "#38261c"); b.line(54, 80, 54, 90, 2, "#38261c");
    if (f === 1) b.part(() => b.blob(38, 44, 20, 8, "#6d5436", { rot: -0.7 }), 1.8);
});
reg("frog", 2, (b, f) => {
    b.part(() => {
        b.blob(48, 66 - f * 4, 28, 18 + f * 4, "#7fae4f", { hi: "#d2ec90" });
        b.blob(48, 78, 18, 6, "#efe8c0");
        b.circle(30, 44 - f * 4, 10, "#7fae4f"); b.circle(66, 44 - f * 4, 10, "#7fae4f");
    }, 2.2);
    eye(b, 30, 44 - f * 4, 6.5, 0); eye(b, 66, 44 - f * 4, 6.5, 0);
    b.stroke([[32, 62], [48, 69], [64, 62]], 2, "#38261c");
});
reg("leaf", 6, (b, f) => {
    const c = ["#d8862e", "#c8553d", "#e0b13c", "#8a5a33", "#e8b6c4", "#fbf3e2"][f];
    if (f < 4) { b.part(() => { b.blob(48, 48, 30, 16, c, { rot: 0.5, wob: 0.14 }); b.line(24, 32, 72, 64, 2, "#00000044"); }, 2.2); } else { b.blob(48, 48, 22, 15, c, { rot: 0.4, wob: 0.1, edge: 0.04, tex: 0.1 }); b.ink(1.6, "#a85a6e88"); }
});

// Decor that stands on blocked cells.
reg("rock", 3, (b, f) => {
    shadow(b, 48, 80, 38, 9);
    b.part(() => {
        b.blob(48, 56, 38, 30 - f * 3, STONE, { wob: 0.22, hi: "#e6e2d6", lo: "#5d5968", freq: 2, tex: 0.5 });
        if (f) b.blob(26, 70, 18, 14, "#8f8b84", { wob: 0.2, hi: "#d3cfc4" });
        b.stroke([[32, 34], [46, 48], [40, 62]], 1.8, "#4f4b5688");
    }, 2.6);
    b.blob(36, 34, 15, 8, "#7f9e5a99", { wob: 0.5, tex: 0.4 });
});
reg("hedge", 2, (b, f) => {
    shadow(b, 48, 88, 46, 7);
    b.part(() => {
        b.blob(48, 56, 46, 34, DEEP, { wob: 0.24, freq: 5, lo: "#203f2c", hi: "#7fa85e", tex: 0.8 });
        for (let i = 0; i < 26; i++) { const a = i * 2.4, r = 6 + (i * 13 % 36); b.blob(48 + Math.cos(a) * r * 1.1, 52 + Math.sin(a) * r * 0.75, 7.5, 5, i % 3 ? LEAF : "#79a35a", { rot: a, wob: 0.16 }); }
    }, 2.4);
    if (f) for (const [x, y] of [[26, 40], [58, 34], [70, 56], [36, 62]]) b.part(() => b.circle(x, y, 3.5, "#d8495f", { tex: 0 }), 1);
});
reg("wall", 3, (b, f) => {
    // Gran's garden wall: dry stone, mossy, older than Gran.
    shadow(b, 48, 90, 48, 6);
    b.part(() => {
        const rows = [[8, 3], [34, 2], [60, 3]];
        for (let j = 0; j < 3; j++) {
            const [y, n] = rows[j], off = (j + f) % 2 ? 0 : 14;
            for (let i = -1; i < n + 1; i++) { const w = 15 + ((i + j + f) & 1) * 4; b.blob(off + 8 + i * 32 + (j * 7 + f * 5) % 6, y + 14, w + 3, 13, ["#b5ad9d", "#a39b8e", "#c2baa8"][(i + j + f + 9) % 3], { wob: 0.1, hi: "#ece6d6", lo: "#5d5968", tex: 0.45, freq: 2 }); }
        }
    }, 2.2);
    for (const [x, y, r] of [[18, 12, 13], [70, 10, 10], [44, 40, 8]]) b.blob(x + f * 6, y, r * 1.4, r * 0.7, "#7f9e5a", { wob: 0.45, tex: 0.5, lo: "#4f7a45", hi: "#b6d27f" });
});
reg("plank", 2, (b, f) => {
    for (let i = 0; i < 3; i++) b.blob(48, 16 + i * 32, 62, 15.5, ["#8a6242", "#7d5638", "#94694a"][(i + f) % 3], { wob: 0.01, tex: 0.9, hi: "#b18a62", lo: "#553722", freq: 2, light: 0.3, edge: 0.05 });
    for (const y of [0, 32, 64]) b.line(-4, y, 100, y, 2, "#3a261a", { tex: 0 });
    b.circle(f ? 14 : 74, 16, 2, "#3a261a", { tex: 0 }); b.circle(f ? 80 : 20, 48, 2, "#3a261a", { tex: 0 });
});
reg("snowcap", 1, (b) => { b.blob(48, 26, 46, 18, "#f7fbfc", { wob: 0.18, lo: "#b5cfdb", hi: "#ffffff", tex: 0.1 }); b.blob(24, 40, 16, 13, "#f7fbfc", { wob: 0.2, lo: "#b5cfdb" }); b.blob(70, 38, 14, 12, "#f7fbfc", { wob: 0.2, lo: "#b5cfdb" }); });
reg("bed", 1, (b) => {
    b.part(() => { b.blob(48, 60, 44, 30, SOIL, { wob: 0.14, tex: 0.8, freq: 3 }); b.stroke([[10, 44], [48, 34], [86, 44]], 3, "#4f3626"); }, 2.2);
});
reg("pot", 2, (b, f) => {
    shadow(b, 48, 84, 28, 7);
    if (f === 0) b.part(() => { for (const [x, y, r] of [[34, 34, 14], [56, 26, 16], [68, 42, 12]]) b.blob(x, y, r, r, "#5f8a4b", { wob: 0.3 }); for (const [x, y, c] of [[30, 28, "#d8495f"], [58, 18, "#f0cf70"], [70, 38, "#e58fb0"], [46, 38, "#fbf8ee"]]) b.circle(x, y, 5, c); }, 1.8);
    b.part(() => { b.poly([[24, 46], [72, 46], [64, 86], [32, 86]], "#c8703f", { lo: "#83432a" }); b.blob(48, 46, 28, 7, "#d98a55"); }, 2.2);
    b.blob(48, 45, 21, 4, "#4f3626", { tex: 0.4 });
    if (f) b.part(() => { b.stroke([[48, 46], [60, 22]], 2.6, DEEP); leaf(b, 50, 42, 26, 10, -2.3, SAGE); }, 1.4);
});
reg("birdbath", 1, (b) => {
    shadow(b, 48, 86, 22, 6);
    b.part(() => { b.poly([[40, 40], [56, 40], [58, 80], [38, 80]], "#bfb9ab"); b.blob(48, 82, 18, 5, "#a9a296"); b.blob(48, 34, 36, 10, "#d6d0c2", { hi: "#f4f0e4" }); }, 2.4);
    b.blob(48, 32, 28, 6, "#8fc7df", { tex: 0.2 });
});
reg("barrow", 1, (b) => {
    shadow(b, 48, 84, 36, 7);
    b.part(() => { b.line(30, 56, 8, 34, 4, BARK); b.line(30, 66, 10, 80, 4, BARK); b.circle(74, 72, 12, DBARK); b.circle(74, 72, 4, STONE); }, 1.8);
    b.part(() => { b.poly([[20, 40], [84, 42], [70, 68], [32, 68]], "#5e8a9c", { lo: "#35586b" }); for (const [x, y, c] of [[38, 36, "#e0963f"], [52, 32, "#c8553d"], [66, 36, "#e0b13c"]]) b.blob(x, y, 9, 8, c); }, 2.2);
});
reg("gate", 2, (b, f) => {
    b.part(() => {
        for (const x of [12, 84]) b.line(x, 90, x, 28, 9, "#8a6a48");
        for (const x of [12, 84]) b.circle(x, 26, 6.5, "#a57a4d");
    }, 2.4);
    if (f) b.part(() => { for (let i = 0; i < 4; i++) b.line(22 + i * 6, 88 - i * 3, 18 + i * 5, 50 - i, 4, "#c9b48a"); b.line(16, 76, 40, 60, 3, "#b69a70"); }, 1.4);
});

const treeShape = (b, f) => {
    const crown = [["#f1c0cb", "#b3687f", "#ffeef0"], ["#5f8a4b", "#2e5a3a", "#b6d27f"], ["#d8862e", "#8a3f1c", "#ffd27c"], null][f];
    b.blob(96, 176, 56, 11, "#2a1c1433", { tex: 0, light: 0, edge: 0 });
    b.part(() => {
        b.stroke([[96, 176], [92, 130], [98, 92]], [28, 18, 12], "#6d4c33", { lo: "#3f2a1c", tex: 0.6 });
        b.stroke([[94, 128], [60, 96], [48, 64]], [11, 4], "#6d4c33"); b.stroke([[96, 118], [132, 88], [146, 58]], [11, 4], "#6d4c33");
        b.stroke([[98, 100], [90, 60], [100, 26]], [9, 3], "#6d4c33");
    }, 2.6);
    if (crown) b.part(() => {
        for (const [x, y, r] of [[96, 58, 54], [52, 78, 38], [140, 76, 40], [68, 40, 34], [128, 40, 32], [96, 96, 36]]) b.blob(x, y, r, r * 0.84, crown[0], { lo: crown[1], hi: crown[2], wob: 0.3, tex: 0.7, freq: 4 });
        if (f === 0) for (let i = 0; i < 34; i++) { const a = i * 2.4, r = 10 + (i * 17 % 62); b.circle(96 + Math.cos(a) * r, 62 + Math.sin(a) * r * 0.66, 3, i % 2 ? "#ffffff" : "#fbd9e0", { tex: 0 }); }
        if (f === 1) for (const [x, y] of [[62, 74], [118, 50], [136, 88], [84, 96], [100, 30]]) b.circle(x, y, 6, RED);
    }, 3);
    else { b.part(() => { for (const [x, y, r] of [[52, 62, 16], [146, 54, 15], [100, 24, 13]]) b.blob(x, y, r * 1.5, r * 0.5, "#f4f8f9", { lo: "#b5cfdb" }); }, 1.6); }
};
reg("tree", 4, treeShape, true);

// Particles and small things
reg("puff", 3, (b, f) => { const c = ["#8a6a48", "#f4efe4", "#cfe6ef"][f]; b.blob(48, 48, 34, 32, c, { wob: 0.32, tex: 0.3, edge: 0.05, freq: 3 }); });
reg("clod", 2, (b, f) => { b.part(() => b.blob(48, 48, 28, 24, f ? "#5a3f2b" : "#79583c", { wob: 0.3 }), 3); });
reg("drop", 1, (b) => { b.poly([[48, 8], [68, 54], [48, 76], [28, 54]], "#a9dcf0", { lo: "#4d9dc4" }); b.blob(48, 56, 20, 22, "#a9dcf0", { hi: "#fff", lo: "#4d9dc4" }); });
reg("flame", 2, (b, f) => { b.blob(48, 58, 26, 28, "#ef6a2c", { hi: "#ffd13c", lo: "#c8361f", wob: 0.2, tex: 0.1 }); b.poly(f ? [[28, 54], [52, 4], [70, 54]] : [[26, 50], [40, 8], [70, 50]], "#ef6a2c", { lo: "#f7a23a", tex: 0.6 }); b.blob(48, 64, 14, 16, "#ffe28a", { tex: 0.1 }); });
reg("spark", 2, (b, f) => { const c = f ? "#fff1a8" : "#ffffff"; for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.78; b.poly([[48 + Math.cos(a - 0.3) * 8, 48 + Math.sin(a - 0.3) * 8], [48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44], [48 + Math.cos(a + 0.3) * 8, 48 + Math.sin(a + 0.3) * 8]], c, { tex: 0 }); } b.circle(48, 48, 12, c, { tex: 0, light: 0, edge: 0, wob: 0 }); });
reg("glow", 1, (b) => { for (let r = 44; r > 2; r -= 3) b.circle(48, 48, r, "#ffffff0d", { tex: 0, wob: 0, light: 0, edge: 0 }); });
reg("coin", 1, (b) => { b.part(() => { b.circle(48, 48, 34, "#d9a436", { hi: "#fff0a8", lo: "#8a6115", tex: 0.1 }); b.circle(48, 48, 25, "#e6b64a", { tex: 0.1, hi: "#ffe48c" }); }, 3.2); b.stroke([[42, 66], [44, 34], [58, 34], [58, 48], [44, 50]], 5, "#8a6115"); });
reg("star", 2, (b, f) => {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -1.57 + i * 0.628, r = i % 2 ? 19 : 42; pts.push([48 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
    b.part(() => { if (f === 0) { b.poly(pts, "#f4c33e", { lo: "#d98a1f", tex: 0.5 }); b.blob(40, 38, 11, 7, "#fff3b888", { tex: 0, light: 0, edge: 0 }); } else b.poly(pts, "#cdbfa2", { lo: "#a8987c", tex: 0.5 }); }, 3);
});
reg("gnomeball", 3, (b, f) => { // a flung gnome, tucked up and spinning; f = size
    const k = 1 + f * 0.2;
    b.part(() => { b.blob(48, 56, 20 * k, 18 * k, BLUE); b.blob(48, 50, 13 * k, 12 * k, "#f2c9a0"); b.blob(48, 60, 14 * k, 9 * k, "#f4efe4", { wob: 0.25 }); b.poly([[32 - 4 * k, 44], [64 + 4 * k, 44], [50, 8], [46, 8]], RED); if (f === 2) b.poly([[26, 22], [70, 22], [62, 34], [34, 34]], "#4f5059"); }, 3);
    b.circle(42, 50, 2.2, "#241811", { tex: 0, wob: 0, light: 0 }); b.circle(54, 50, 2.2, "#241811", { tex: 0, wob: 0, light: 0 });
});
reg("pebble", 1, (b) => { b.part(() => b.blob(48, 48, 30, 25, "#c9c2b4", { wob: 0.2, hi: "#f4f0e4" }), 4); });
reg("seed", 1, (b) => { b.part(() => b.blob(48, 48, 28, 18, "#ef5a2c", { hi: "#ffd13c", rot: 0.4 }), 4); });
reg("slipper", 1, (b) => {
    b.part(() => { b.blob(52, 56, 42, 21, "#b5475c", { hi: "#f09aa8", rot: 0.05, wob: 0.05 }); b.blob(22, 62, 12, 13, "#7e2f42"); b.blob(50, 74, 44, 7, "#efe0c0", { tex: 0.5 }); }, 3.4);
    b.part(() => { for (let i = 0; i < 5; i++) b.blob(48 + i * 7, 36 + (i % 2) * 2, 5, 7, "#fbf3e2", { wob: 0.3 }); }, 0);
});
reg("slime", 1, (b) => { b.blob(48, 48, 42, 32, "#c8d97a88", { wob: 0.4, tex: 0.2, edge: 0.2, freq: 2 }); b.blob(36, 40, 11, 7, "#ffffff55", { tex: 0, light: 0, edge: 0 }); });
reg("puddle", 1, (b) => { b.blob(48, 48, 46, 34, "#7fbfe0a0", { wob: 0.36, tex: 0.2, edge: 0.3, freq: 2, hi: "#d6f0fb" }); b.blob(32, 38, 14, 5, "#ffffff77", { tex: 0, light: 0, edge: 0 }); });
reg("icepatch", 1, (b) => { b.blob(48, 48, 46, 36, "#cfeaf7cc", { wob: 0.3, tex: 0.1, edge: 0.2, hi: "#ffffff", freq: 2 }); for (const [a, c, d, e] of [[20, 40, 46, 58], [52, 24, 62, 60], [40, 70, 70, 60]]) b.line(a, c, d, e, 1.6, "#ffffffcc"); });
reg("leafpile", 1, (b) => { shadow(b, 48, 76, 34, 6); b.part(() => { b.blob(48, 62, 34, 15, "#a86a2c", { wob: 0.3 }); for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 3 + i * 1.8; b.blob(48 + Math.cos(a) * r * 1.5, 58 + Math.sin(a) * r * 0.5, 9, 5, ["#d8862e", "#c8553d", "#e0b13c"][i % 3], { rot: a, wob: 0.14 }); } }, 2); });
reg("molehill", 1, (b) => { b.part(() => { b.blob(48, 62, 28, 16, SOIL, { wob: 0.3, tex: 0.7 }); }, 2); for (let i = 0; i < 5; i++) b.circle(30 + i * 9, 54 + (i % 2) * 6, 3, "#4f3626"); });
reg("zzz", 1, (b) => { b.stroke([[20, 24], [52, 24], [20, 62], [56, 62]], 8, "#fbf3e2", { straight: true }); b.ink(2.4); });
reg("note", 1, (b) => { b.part(() => { b.blob(34, 68, 15, 11, CREAM, { rot: -0.3 }); b.line(46, 66, 46, 18, 5, CREAM); b.stroke([[46, 18], [62, 26], [66, 42]], 6, CREAM); }, 2.6); });
reg("hand", 1, (b) => { // Gran's gardening glove, the teaching pointer
    b.part(() => {
        b.stroke([[48, 92], [46, 62]], 26, "#d97a4a");
        b.blob(48, 58, 22, 22, "#e9c04f", { hi: "#fff0a8" });
        for (const [x, l] of [[32, 12], [43, 2], [54, 8], [64, 18]]) b.stroke([[x, 50], [x, 50 - 26 + l * 0.8]], 11, "#e9c04f");
        b.stroke([[28, 62], [14, 50]], 11, "#e9c04f");
    }, 3);
});

// UI icons
const icon = (fn) => (b) => fn(b);
reg("i_pause", 1, icon((b) => { b.part(() => { b.blob(32, 48, 11, 32, CREAM, { wob: 0.04, tex: 0.1 }); b.blob(64, 48, 11, 32, CREAM, { wob: 0.04, tex: 0.1 }); }, 3); }));
reg("i_play", 1, icon((b) => { b.part(() => b.poly([[24, 12], [80, 48], [24, 84]], CREAM, { tex: 0.1 }), 3); }));
reg("i_fast", 3, (b, f) => { const n = f + 1, w = 62 / n; b.part(() => { for (let i = 0; i < n; i++) { const x = 48 - 31 * 1 + i * w + (n === 1 ? 6 : 0), W = n === 1 ? 46 : w + 8; b.poly([[x, 16], [x + W, 48], [x, 80]], CREAM, { tex: 0.1 }); } }, 3); });
reg("i_gear", 1, icon((b) => { b.part(() => { for (let i = 0; i < 8; i++) { const a = i * 0.785; b.line(48 + Math.cos(a) * 26, 48 + Math.sin(a) * 26, 48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42, 13, CREAM, { tex: 0.1 }); } b.circle(48, 48, 31, CREAM, { tex: 0.1 }); }, 3); b.circle(48, 48, 12, BARK, { tex: 0 }); }));
reg("i_back", 1, icon((b) => { b.part(() => b.stroke([[66, 14], [24, 48], [66, 82]], 15, CREAM, { straight: true, tex: 0.1 }), 3); }));
reg("i_lock", 1, icon((b) => { b.part(() => { b.stroke([[30, 46], [30, 22], [66, 22], [66, 46]], 9, IRON, {}); b.blob(48, 62, 32, 24, BRASS, { wob: 0.04 }); }, 3); b.circle(48, 60, 6, "#38261c", { tex: 0 }); }));
reg("i_sound", 2, (b, f) => { b.part(() => { b.poly([[12, 36], [32, 36], [54, 14], [54, 82], [32, 60], [12, 60]], CREAM, { tex: 0.1 }); if (!f) { b.stroke([[64, 30], [74, 48], [64, 66]], 7, CREAM); b.stroke([[76, 18], [90, 48], [76, 78]], 7, CREAM); } }, 3); if (f) { b.line(62, 32, 88, 64, 7, RED); b.line(88, 32, 62, 64, 7, RED); } });
reg("i_buzz", 2, (b, f) => { b.part(() => { b.blob(48, 48, 20, 38, CREAM, { wob: 0.03, tex: 0.05 }); b.blob(48, 44, 13, 25, "#6f93a0", { wob: 0.02, tex: 0 }); }, 3); if (!f) for (const s of [-1, 1]) b.part(() => { b.stroke([[48 + s * 30, 26], [48 + s * 38, 48], [48 + s * 30, 70]], 5, CREAM); }, 2); else b.line(14, 16, 82, 80, 7, RED); });
reg("i_map", 1, icon((b) => { b.part(() => { b.poly([[12, 22], [36, 12], [60, 24], [84, 14], [84, 74], [60, 84], [36, 72], [12, 82]], CREAM, { tex: 0.2 }); }, 3); for (const [p, q] of [[36, 12], [60, 24]]) b.line(p, q, p, q + 60, 2, "#38261c55"); b.stroke([[20, 66], [38, 44], [58, 58], [74, 28]], 3.5, RED); }));
reg("i_book", 1, icon((b) => { b.part(() => { b.poly([[14, 14], [46, 20], [46, 84], [14, 76]], "#6b8f4a"); b.poly([[82, 14], [50, 20], [50, 84], [82, 76]], "#6b8f4a"); }, 3); leaf(b, 26, 54, 20, 10, -0.9, CREAM); leaf(b, 70, 54, 20, 10, -2.2, CREAM); }));
reg("i_redo", 1, icon((b) => { b.part(() => { b.stroke([[66, 26], [30, 24], [18, 58], [50, 78], [78, 54]], 11, CREAM, {}); b.poly([[52, 8], [84, 28], [54, 46]], CREAM, { tex: 0.1 }); }, 3); }));
reg("i_infinity", 1, icon((b) => { b.part(() => { b.stroke([[48, 48], [28, 28], [8, 48], [28, 68], [48, 48], [68, 28], [88, 48], [68, 68], [48, 48]], 11, CREAM); }, 3); }));
reg("i_bite", 1, icon((b) => { b.part(() => { b.blob(48, 50, 40, 25, "#5c8f4e", { hi: "#c8e38a", lo: "#2e5a3a", rot: -0.15 }); for (let i = 0; i < 4; i++) b.stroke([[20 + i * 18, 30 + Math.abs(i - 1.5) * 3], [20 + i * 18, 70 - Math.abs(i - 1.5) * 3]], [2, 4, 2], "#e8e6a4aa"); }, 3); }));
reg("i_sun", 1, icon((b) => { for (let i = 0; i < 10; i++) { const a = i * 0.628; b.part(() => b.line(48 + Math.cos(a) * 28, 48 + Math.sin(a) * 28, 48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42, 7, "#f7a23a"), 2); } b.part(() => b.circle(48, 48, 25, "#ffd13c", { hi: "#fff5b8", lo: "#ef8a2c" }), 3); }));
reg("i_rain", 1, icon((b) => { b.part(() => { for (const [x, y, r] of [[30, 40, 18], [52, 32, 22], [70, 42, 15]]) b.circle(x, y, r, "#dfe7ee", { lo: "#8fa6bd" }); }, 3); for (const x of [30, 48, 66]) b.part(() => b.stroke([[x + 3, 62], [x - 4, 84]], 5.5, "#6fb4dc"), 2); }));
reg("i_wind", 1, icon((b) => { b.part(() => { b.stroke([[10, 36], [60, 36], [72, 22], [56, 14], [48, 26]], 7, "#dfe7ee"); b.stroke([[14, 54], [74, 54], [86, 68], [70, 80], [60, 68]], 7, "#dfe7ee"); }, 3); }));
reg("i_snow", 1, icon((b) => { b.part(() => { for (let i = 0; i < 3; i++) { const a = i * 1.047; b.line(48 - Math.cos(a) * 40, 48 - Math.sin(a) * 40, 48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40, 7, "#e6f3f7"); } for (let i = 0; i < 6; i++) { const a = i * 1.047, x = 48 + Math.cos(a) * 26, y = 48 + Math.sin(a) * 26; b.line(x, y, x + Math.cos(a + 0.8) * 12, y + Math.sin(a + 0.8) * 12, 5, "#e6f3f7"); b.line(x, y, x + Math.cos(a - 0.8) * 12, y + Math.sin(a - 0.8) * 12, 5, "#e6f3f7"); } }, 2.6); }));
reg("packet", 2, (b, f) => {
    // A paper seed packet with a scalloped top. Frame 1 is the locked, face-down version.
    b.part(() => {
        const c = f ? "#b9a988" : "#f3e7c8";
        b.poly([[5, 12], [91, 12], [91, 92], [5, 92]], c, { lo: "#cdb98c", tex: 0.6 });
        for (let i = 0; i < 7; i++) b.circle(11 + i * 12.4, 12, 7, c, { tex: 0.3 });
        b.line(6, 76, 90, 76, 1.4, "#8a6a4877");
    }, 2.2);
});

// ---- Packing ------------------------------------------------------------------------------------------------------
/** Paint every sprite. In a browser it yields between slices and calls progress(0..1); headless it runs straight through. */
export function paintAll(game, progress, sync = false) {
    const small = jobs.filter((j) => !j.big), big = jobs.filter((j) => j.big);
    const sn = small.reduce((n, j) => n + j.count, 0), bn = big.reduce((n, j) => n + j.count, 0);
    const sr = Math.ceil(sn / SC), br = Math.ceil(bn / LC);
    const sData = new Uint8Array(SC * S * sr * S * 4), bData = new Uint8Array(LC * L * br * L * 4);
    const finish = () => {
        game.assets.paint("sheet", SC * S, sr * S, (p) => p.data.set(sData), { smooth: true, mipmaps: true });
        game.assets.paint("bigsheet", LC * L, br * L, (p) => p.data.set(bData), { smooth: true, mipmaps: true });
        for (const [name, cols, rows, size] of [["sheet", SC, sr, S], ["bigsheet", LC, br, L]]) {
            const a = game.assets.sprite(name);
            a.cols = cols; a.rows = rows; a.frameW = size; a.frameH = size;
        }
    };
    let s = 0, l = 0;
    const list = [];
    for (const j of [...small, ...big]) {
        const first = j.big ? l : s;
        F[j.name] = { sheet: j.big ? "bigsheet" : "sheet", first, count: j.count, size: j.big ? L : S };
        for (let f = 0; f < j.count; f++) list.push({ j, f, at: j.big ? l++ : s++ });
        if (j.big) continue;
    }
    if (sync) { for (let i = 0; i < list.length; i++) one(list[i]); finish(); return null; }
    function one({ j, f, at }) {
        const size = j.big ? L : S, b = new Brush(size, size, 7 + at * 3 + (j.big ? 50 : 0));
        j.fn(b, f);
        b.grain(0.035);
        const cols = j.big ? LC : SC, d = j.big ? bData : sData, stride = cols * size;
        b.blit(d, stride, (at % cols) * size, ((at / cols) | 0) * size);
    }
    return new Promise((resolve) => {
        let i = 0;
        const slice = () => {
            const t0 = performance.now();
            while (i < list.length && performance.now() - t0 < 24) one(list[i++]);
            progress?.(i / list.length);
            if (i < list.length) setTimeout(slice, 0);
            else { finish(); resolve(); }
        };
        slice();
    });
}

/** Draw one painted sprite by name. */
export function spr(d, name, frame, x, y, w, h = w, o) {
    const f = F[name];
    if (o) { o.frame = f.first + frame; o.x = x; o.y = y; o.width = w; o.height = h; d.sprite(f.sheet, o); }
    else d.sprite(f.sheet, { frame: f.first + frame, x, y, width: w, height: h });
}
