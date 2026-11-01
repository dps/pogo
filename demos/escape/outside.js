// What passes the windows. Each carriage has a sky and three tiling strips: far, mid and near.
import { Canvas, hash, mixc, rgb } from "./paint.js";
const TW = 1024, TH = 300;
const ridgeY = (x, base, amp, seed) => { const t = x / TW * Math.PI * 2; return base - amp * (0.55 * Math.sin(t * 2 + seed) + 0.3 * Math.sin(t * 5 + seed * 2.1) + 0.15 * Math.sin(t * 11 + seed * 3.3)); };
function ridge(p, base, amp, c, c2, seed, o = {}) {
    const pts = [[-20, TH + 10]];
    for (let x = -20; x <= TW + 20; x += 12) pts.push([x, ridgeY(x, base, amp, seed) + (o.rough ?? 1.2) * (hash(((x % TW) + TW) % TW, seed) - 0.5)]);
    pts.push([TW + 20, TH + 10]);
    p.poly(pts, { c, c2, m: o.m ?? 0.18, s: o.s ?? 0.14, sd: "h", wob: 0 });
}
/** Stamps something at x and again one tile along, so strips wrap. */
const wrap = (x, w, fn) => { fn(x); if (x < w) fn(x + TW); if (x > TW - w) fn(x - TW); };
function tree(p, x, y, h, c, c2) {
    p.line([[x, y], [x + 1, y - h * 0.5]], [h * 0.06, h * 0.03], { c: c2 });
    for (let i = 0; i < 5; i++) { const a = hash(x, i) * 6.28, r = h * (0.17 + hash(i, x) * 0.1); p.ell(x + Math.cos(a) * h * 0.14, y - h * 0.62 + Math.sin(a) * h * 0.2, r * 1.2, r, { c, c2, wob: 1.2, m: 0.2 }); }
}
function pine(p, x, y, h, c, c2) { for (let i = 0; i < 4; i++) { const w = h * (0.28 - i * 0.05), yy = y - h * 0.15 - i * h * 0.22; p.poly([[x - w, yy], [x, yy - h * 0.4], [x + w, yy]], { c, c2, wob: 0.8 }); } }
function pole(p, x, y, h, c) {
    p.line([[x, y], [x, y - h]], 4, { c });
    for (const k of [0, 16]) p.line([[x - 18, y - h + 8 + k], [x + 18, y - h + 8 + k]], 2.4, { c });
}
function wires(p, y, c) { for (const k of [0, 16]) { const pts = []; for (let x = -10; x <= TW + 10; x += 16) { const u = ((x % 256) + 256) % 256 / 256; pts.push([x, y + k + Math.sin(u * Math.PI) * 14]); } p.line(pts, 1, { c, a: 0.65 }); } }
function stars(p, n, top, bot, seed, c = "#f8f0dc") {
    for (let i = 0; i < n; i++) { const x = hash(i, seed) * TW, y = top + hash(seed, i) * hash(i + 3, seed) * (bot - top), r = 0.5 + hash(i, seed + 2) ** 3 * 1.5; p.ell(x, y, r, r, { c, a: 0.5 + hash(i, 5) * 0.5, wob: 0 }); }
}
function cloudBand(p, y, c, a, seed, n = 9) { for (let i = 0; i < n; i++) { const x = hash(i, seed) * TW, w = 80 + hash(seed, i) * 170; wrap(x, w, (xx) => { p.ell(xx, y + hash(i, 7) * 40, w, 10 + hash(i, 9) * 14, { c, a, m: 0.3, s: 0.3, sd: "h", wob: 2.2 }); }); } }
function moon(p, x, y, r, c = "#fff4d8") { p.pool(x, y, r * 5, r * 5, c, 0.3); p.ell(x, y, r, r, { c, c2: "#e2d0a6", m: 0.2, wob: 0.15 }); for (let i = 0; i < 5; i++) p.ell(x + (hash(i, 1) - 0.5) * r * 1.3, y + (hash(1, i) - 0.5) * r * 1.3, r * 0.14, r * 0.12, { c: "#cdbb92", a: 0.5 }); }
function sky(c1, c2, c3) { const p = new Canvas(TW, TH, 1); p.rect(0, 0, TW, TH * 0.6, { c: c1, c2, m: 0.1, s: 0.2, sd: "h", wob: 0 }); p.rect(0, TH * 0.6, TW, TH * 0.4, { c: c2, c2: c3, m: 0.1, s: 0.2, sd: "h", wob: 0 }); return p; }
const strip = () => new Canvas(TW, TH, 1);
const done = (...cs) => { for (const c of cs) c.brush(4.4, { fine: false, jitter: 0.1, flow: 0 }); return cs; };

export const OUTSIDE = {
    moor() {
        const s = sky("#1e2a58", "#7a5a84", "#f0a56a"); stars(s, 90, 0, 120, 2); moon(s, 690, 70, 26); cloudBand(s, 130, "#3c3a68", 0.5, 3); cloudBand(s, 180, "#d4886e", 0.35, 4, 6);
        const f = strip(); ridge(f, 190, 34, "#3f4478", "#2c2f58", 1);
        const m = strip(); ridge(m, 226, 22, "#2a2e52", "#1a1c3a", 2); for (let i = 0; i < 16; i++) { const x = hash(i, 8) * TW; wrap(x, 30, (xx) => tree(m, xx, ridgeY(xx, 226, 22, 2) + 3, 26 + hash(i, 2) * 26, "#1e2140", "#14152c")); } for (let i = 0; i < 3; i++) { const x = 180 + i * 300; const y = ridgeY(x, 226, 22, 2); m.rect(x, y - 13, 14, 12, { c: "#111228" }); m.ell(x + 7, y - 7, 3, 3, { c: "#ffcb70", wob: 0 }); m.pool(x + 7, y - 7, 16, 16, "#ffb050", 0.4); }
        const n = strip(); ridge(n, 270, 8, "#14152c", "#0a0a1c", 3); wires(n, 96, "#0e0e20"); for (let i = 0; i < 4; i++) pole(n, 60 + i * 256, 280, 190, "#0d0d1e");
        return [s, ...done(f, m, n)];
    },
    fields() {
        const s = sky("#4a7fa8", "#f4cf96", "#ffe6b0"); cloudBand(s, 60, "#fff3dc", 0.6, 5, 7); moon(s, 300, 190, 30, "#fff2c0"); 
        const f = strip(); ridge(f, 186, 26, "#92a06a", "#6f8c5c", 4);
        const m = strip(); ridge(m, 216, 16, "#d1a94c", "#b4883a", 5, { s: 0.4 }); for (let i = 0; i < 12; i++) { const x = hash(i, 11) * TW; wrap(x, 34, (xx) => tree(m, xx, ridgeY(xx, 216, 16, 5) + 3, 34 + hash(i, 4) * 34, "#567a3e", "#3a4a26")); } for (let i = 0; i < 3; i++) { const x = 120 + i * 340, y = ridgeY(x, 216, 16, 5); m.rect(x, y - 16, 28, 16, { c: "#b4563e", c2: "#7c3a2c" }); m.poly([[x - 4, y - 16], [x + 14, y - 30], [x + 32, y - 16]], { c: "#6a3a2c" }); }
        const n = strip(); ridge(n, 268, 7, "#c0932e", "#7f6420", 6, { s: 0.5 }); for (let i = 0; i < 34; i++) { const x = hash(i, 19) * TW; n.line([[x, 300], [x + 2, 240 + hash(i, 3) * 26]], 2, { c: "#e8c66a", a: 0.7 }); } wires(n, 96, "#4b3a2c"); for (let i = 0; i < 4; i++) pole(n, 60 + i * 256, 280, 190, "#3e2e24");
        return [s, ...done(f, m, n)];
    },
    town() {
        const s = sky("#2a2c3e", "#5c5560", "#c17e4a"); cloudBand(s, 40, "#22232f", 0.8, 6, 12); cloudBand(s, 110, "#3a3844", 0.6, 7, 10);
        const f = strip(); for (let i = 0; i < 32; i++) { const x = i * 32 + hash(i, 1) * 8, h = 44 + hash(i, 5) * 80; f.rect(x, 256 - h, 30, h + 50, { c: "#4a4656", c2: "#2e2c3c" }); } for (let i = 0; i < 4; i++) { const x = 90 + i * 250; f.poly([[x, 256], [x + 6, 80], [x + 20, 80], [x + 26, 256]], { c: "#3a3744", c2: "#2a2836" }); f.ell(x + 14, 66, 16, 10, { c: "#6b6470", a: 0.5, wob: 2 }); f.ell(x + 30, 48, 24, 13, { c: "#6b6470", a: 0.35, wob: 2 }); }
        const m = strip(); for (let i = 0; i < 22; i++) { const x = i * 48 + hash(i, 2) * 10, h = 40 + hash(i, 6) * 56; m.rect(x, 262 - h, 46, h + 40, { c: "#2a2836", c2: "#191826" }); m.poly([[x - 2, 262 - h], [x + 23, 240 - h], [x + 48, 262 - h]], { c: "#201e2c" }); for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) if (hash(i * 7 + j, k) > 0.55) { const wx = x + 8 + j * 12, wy = 272 - h + k * 18; m.rect(wx, wy, 7, 10, { c: "#ffc871", wob: 0 }); m.pool(wx + 3, wy + 5, 13, 13, "#ff9f40", 0.3); } }
        const n = strip(); ridge(n, 276, 3, "#14131e", "#0a0a12", 7); for (let i = 0; i < 4; i++) { const x = 80 + i * 256; n.line([[x, 300], [x, 130]], 4, { c: "#0e0d18" }); n.line([[x, 132], [x + 26, 128]], 3, { c: "#0e0d18" }); n.ell(x + 28, 134, 5, 5, { c: "#ffd690", wob: 0 }); n.pool(x + 28, 136, 54, 54, "#ffb860", 0.5); }
        return [s, ...done(f, m, n)];
    },
    river() {
        const s = sky("#8fa8c8", "#f4c6ae", "#fde8cc"); cloudBand(s, 70, "#fff1e4", 0.5, 8, 8); s.pool(200, 214, 220, 90, "#fff0c4", 0.5);
        const f = strip(); ridge(f, 170, 18, "#a9b4c0", "#a0aabb", 8);
        const m = strip(); ridge(m, 196, 12, "#7e96a0", "#74909a", 9); for (let i = 0; i < 14; i++) { const x = hash(i, 13) * TW; wrap(x, 34, (xx) => tree(m, xx, ridgeY(xx, 196, 12, 9) + 3, 24 + hash(i, 6) * 24, "#6f8c8c", "#51707a")); }
        m.rect(0, 208, TW, 92, { c: "#d6c8c0", c2: "#8fa4b2", s: 0.5, sd: "h", wob: 0 }); for (let i = 0; i < 28; i++) m.rect(hash(i, 4) * TW, 214 + hash(4, i) * 70, 30 + hash(i, 8) * 60, 1.6, { c: "#fff4e0", a: 0.5, wob: 0 });
        const n = strip(); wires(n, 96, "#4c5664"); for (let i = 0; i < 4; i++) pole(n, 60 + i * 256, 290, 200, "#46505e"); for (let i = 0; i < 26; i++) { const x = hash(i, 23) * TW; n.line([[x, 300], [x + 4, 248 + hash(i, 3) * 30]], 2.4, { c: "#52664e", a: 0.9 }); }
        return [s, ...done(f, m, n)];
    },
    orchard() {
        const s = sky("#141a44", "#3a2c62", "#8a4a6c"); stars(s, 130, 0, 160, 9); moon(s, 420, 60, 18, "#ffeec4");
        const f = strip(); ridge(f, 170, 22, "#2a2858", "#201e48", 10);
        const m = strip(); ridge(m, 208, 12, "#1f2548", "#14193a", 11); for (let i = 0; i < 20; i++) { const x = i * 52 + hash(i, 3) * 20; wrap(x, 34, (xx) => tree(m, xx, ridgeY(xx, 208, 12, 11) + 5, 56 + hash(i, 2) * 24, "#1c3048", "#101a30")); }
        for (let i = 0; i < 26; i++) { const x = hash(i, 2) * TW, y = 150 + hash(2, i) * 60, c = i % 3 ? "#ffcb72" : "#ff9c6a"; m.line([[x, y - 8], [x, y - 2]], 0.8, { c: "#0d1020" }); m.ell(x, y, 3.2, 4, { c, wob: 0 }); m.pool(x, y, 20, 20, c, 0.5); }
        const n = strip(); ridge(n, 270, 6, "#0e1228", "#080a18", 12); for (let i = 0; i < 40; i++) n.ell(hash(i, 3) * TW, 120 + hash(3, i) * 150, 1.3, 1.3, { c: "#e8ff9a", a: 0.8, wob: 0 });
        return [s, ...done(f, m, n)];
    },
    rain() {
        const s = sky("#161b2c", "#232a3e", "#37384c"); cloudBand(s, 50, "#0f1322", 0.8, 12, 14);
        const f = strip(); ridge(f, 200, 16, "#22283c", "#1a2032", 13);
        const m = strip(); for (let i = 0; i < 18; i++) { const x = i * 58 + hash(i, 2) * 14, h = 30 + hash(i, 6) * 40; m.rect(x, 262 - h, 52, h + 40, { c: "#141826", c2: "#0d1020" }); for (let j = 0; j < 3; j++) if (hash(i * 3, j) > 0.5) { m.rect(x + 8 + j * 14, 270 - h, 7, 10, { c: "#ffd27a", wob: 0 }); m.pool(x + 11 + j * 14, 275 - h, 15, 15, "#ffa94a", 0.3); } }
        const n = strip(); ridge(n, 280, 3, "#0b0d18", "#06070e", 14); wires(n, 96, "#0a0c16"); for (let i = 0; i < 4; i++) pole(n, 60 + i * 256, 290, 200, "#090b14");
        return [s, ...done(f, m, n)];
    },
    stars() {
        const s = sky("#070b28", "#101a4a", "#2c3a78"); stars(s, 320, 0, 250, 14, "#fdf6e4"); for (let i = 0; i < 90; i++) { const u = i / 90; s.ell(u * TW, 50 + u * 170 + (hash(i, 3) - 0.5) * 50, 34, 16, { c: "#5a6ab4", a: 0.05, wob: 2 }); } moon(s, 120, 56, 14);
        const f = strip(); ridge(f, 212, 20, "#141c4a", "#0e1538", 15);
        const m = strip(); ridge(m, 236, 16, "#0c1232", "#080c24", 16); for (let i = 0; i < 26; i++) { const x = hash(i, 17) * TW; wrap(x, 20, (xx) => pine(m, xx, ridgeY(xx, 236, 16, 16) + 4, 26 + hash(i, 5) * 30, "#0a1028", "#060a1c")); } 
        const n = strip(); ridge(n, 280, 4, "#060a1c", "#04060f", 17);
        return [s, ...done(f, m, n)];
    },
    sea() {
        const s = sky("#3a5a94", "#f19c6a", "#ffd79a"); cloudBand(s, 50, "#ffc8a0", 0.55, 15, 9); cloudBand(s, 110, "#e8836a", 0.4, 16, 8); s.pool(760, 196, 260, 80, "#fff0b0", 0.7); s.ell(760, 192, 36, 36, { c: "#fff4cc", c2: "#ffc070", wob: 0.2 });
        const f = strip(); ridge(f, 188, 7, "#7a5c8a", "#6c5684", 18); f.rect(0, 196, TW, 104, { c: "#d9926c", c2: "#47567e", s: 0.7, sd: "h", wob: 0 }); for (let i = 0; i < 60; i++) f.rect(hash(i, 4) * TW, 200 + hash(4, i) * 90, 20 + hash(i, 8) * 70, 1.5, { c: "#ffe4b0", a: 0.45, wob: 0 });
        const m = strip();
        const n = strip(); ridge(n, 280, 4, "#2b2c4a", "#16182e", 19); for (let i = 0; i < 4; i++) pole(n, 60 + i * 256, 290, 190, "#1c1d34"); wires(n, 106, "#1a1b32");
        return [s, ...done(f, m, n)];
    },
    junction() {
        const s = sky("#0c1026", "#1b2140", "#3c3560"); stars(s, 70, 0, 110, 19); cloudBand(s, 70, "#14182e", 0.7, 20, 8);
        const f = strip(); for (let i = 0; i < 34; i++) { const x = i * 30 + hash(i, 9) * 8, h = 18 + hash(i, 4) * 30; f.rect(x, 228 - h, 28, h + 60, { c: "#1c2038", c2: "#14182c" }); if (hash(i, 2) > 0.6) f.rect(x + 8, 234 - h, 5, 6, { c: "#ffcc7a", wob: 0 }); }
        const m = strip(); m.rect(0, 232, TW, 68, { c: "#15172a", c2: "#0d0e1c", wob: 0 }); for (let k = 0; k < 4; k++) m.line([[-10, 246 + k * 13], [TW + 10, 246 + k * 13]], 1.4, { c: "#7f8aa8", a: 0.5 });
        for (let i = 0; i < 4; i++) { const x = 110 + i * 256, g = i % 2; m.line([[x, 262], [x, 130]], 4, { c: "#0a0b16" }); m.rect(x - 14, 136, 30, 7, { c: g ? "#b0342e" : "#e9e2c9" }); m.ell(x + 2, 152, 5, 5, { c: g ? "#7aff9a" : "#ff6a5a", wob: 0 }); m.pool(x + 2, 152, 32, 32, g ? "#50ff8a" : "#ff5a4a", 0.6); }
        const n = strip(); ridge(n, 286, 2, "#0a0a14", "#06060c", 20);
        return [s, ...done(f, m, n)];
    },
    snow() {
        const s = sky("#8ea2c4", "#c6d4e6", "#e8eef4"); cloudBand(s, 60, "#e8eef6", 0.6, 22, 12);
        const f = strip(); ridge(f, 190, 18, "#b4c4da", "#c8d6e6", 21); for (let i = 0; i < 20; i++) { const x = hash(i, 5) * TW; wrap(x, 20, (xx) => pine(f, xx, ridgeY(xx, 190, 18, 21) + 6, 34 + hash(i, 2) * 26, "#7f94b0", "#9fb4cc")); }
        const m = strip(); ridge(m, 232, 14, "#dfe8f2", "#c4d2e4", 22); for (let i = 0; i < 12; i++) { const x = hash(i, 15) * TW; wrap(x, 30, (xx) => { pine(m, xx, ridgeY(xx, 232, 14, 22) + 6, 66 + hash(i, 4) * 40, "#4a5c7c", "#364660"); pine(m, xx, ridgeY(xx, 232, 14, 22) - 8, 56 + hash(i, 4) * 34, "#eef4fa", "#c8d6e8"); }); }
        const n = strip(); ridge(n, 280, 12, "#f2f6fb", "#d4e0ee", 23); wires(n, 96, "#6a7a94"); pole(n, 300, 292, 200, "#4a5a74");
        return [s, ...done(f, m, n)];
    },
    fog() {
        const s = sky("#e6e2d6", "#ece8dc", "#f1eee4"); cloudBand(s, 100, "#fbf8f0", 0.5, 26, 10);
        const f = strip(); ridge(f, 200, 22, "#d6d1c4", "#e3dfd2", 25, { m: 0.05 });
        const m = strip(); for (let i = 0; i < 9; i++) { const x = 40 + i * 116 + hash(i, 2) * 40; for (let k = 0; k < 3; k++) m.line([[x + k * 3, 300], [x + k * 2, 210 - hash(i, k) * 40], [x + 10 + k * 4, 170 - hash(k, i) * 30]], 1, { c: "#8a8578", a: 0.5 }); for (let k = 0; k < 9; k++) m.line([[x, 200 - k * 6], [x + 24 - k * 2, 176 - k * 7]], 0.8, { c: "#8a8578", a: 0.4 }); }
        const n = strip();
        return [s, ...done(f), m, n];
    },
    blank() {
        const s = sky("#f4efe2", "#f6f2e6", "#f8f4ea");
        const f = strip(), m = strip(), n = strip();
        for (let k = 0; k < 3; k++) { const pts = []; for (let x = -10; x <= TW + 10; x += 22) pts.push([x, ridgeY(x, 214 + k * 20, 18 - k * 4, 31 + k) + (hash(x, k) - 0.5) * 2]); (k ? m : f).line(pts, 1, { c: "#9a9384", a: 0.55 }); }
        return [s, f, m, n];
    },
};
export const SPEED = { far: 14, mid: 46, near: 240 };
export { TW, TH };
