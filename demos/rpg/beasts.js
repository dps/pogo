// Every Deskmate, drawn in ink on a 200 x 200 canvas, facing left. Painted on demand, so startup stays fast.
import { Ink, INK, mix } from "./ink.js";

const C = Ink.curve;
const Y = "#ffd84d", R = "#e5484d", T = "#2fa6a0", B = "#3b6fd4", M = "#e8c98a", G = "#5fb35a", P = "#8b6cf0", K = "#ff8fb1", W = "#fffdf5", S = "#aeb7c6", D = "#5b6478", BR = "#8a5a3a", O = "#f59a3c";
export const ART = {};
const legs = (k, x1, x2, y, foot = y + 26, color) => {
    k.hose([x1, y], [x1 - 3, (y + foot) / 2], [x1 - 2, foot], 5); k.hose([x2, y], [x2 + 3, (y + foot) / 2], [x2 + 1, foot], 5);
    k.shoe(x1 - 2, foot + 3, -1, color); k.shoe(x2 + 1, foot + 3, -1, color);
};

ART.stickle = (k) => {
    legs(k, 86, 118, 140, 164);
    k.hose([58, 100], [38, 112], [34, 88], 5); k.glove(33, 82, -1.6);
    k.hose([146, 104], [168, 112], [172, 134], 5); k.glove(173, 140, 1.4);
    k.poly([[50, 50], [152, 44], [150, 122], [132, 148], [54, 146]], { fill: Y, fill2: "#ffc533", round: 4, lit: true });
    k.poly([[132, 148], [150, 122], [128, 124]], { fill: "#e9b52c", round: 2, shade: 0 });
    k._lidColor = "#ffd84d";
    k.eyes(84, 118, 88, 11, "big"); k.smile(100, 110, 10, 4);
    k.line([[62, 58], [140, 54]], 2.4, { color: "#d9a925" });
};
ART.pingling = (k) => {
    legs(k, 82, 122, 138, 164);
    k.hose([48, 104], [28, 92], [30, 72], 5); k.glove(30, 66, -1.5);
    k.hose([154, 104], [178, 112], [176, 92], 5); k.glove(176, 86, -1.5);
    k.box(101, 100, 112, 80, 8, { fill: W, fill2: "#dfe7f5", lit: true });
    k.poly([[47, 66], [155, 66], [101, 112]], { fill: "#eef2fb", shade: 0, round: 2 });
    k.circ(150, 58, 15, { fill: R, shade: 4, lit: true });
    k.box(150, 58, 5, 15, 2, { fill: W, ink: false, shade: 0 });
    k.eyes(84, 118, 122, 10, "big"); k.smile(101, 133, 5, 2);
};
ART.snaglet = (k) => {
    legs(k, 84, 118, 146, 168);
    k.line(C([150, 118], [188, 130], [176, 164]), 16, { color: INK }); k.line(C([150, 118], [188, 130], [176, 164]), 10, { color: R });
    k.ell(100, 102, 56, 54, { fill: R, fill2: "#c8323a", lit: true });
    k.circ(100, 102, 25, { fill: "#f7d8c8", shade: 5 }); k.circ(100, 102, 18, { fill: "#fff3e4", shade: 0 });
    k.eyes(85, 115, 100, 8.5, "angry"); k.frown(100, 116, 7, 3);
};
ART.chompler = (k) => {
    legs(k, 76, 134, 150, 172, BR);
    k.box(108, 142, 136, 22, 8, { fill: D, lit: true });
    k.poly([[34, 72], [160, 54], [176, 96], [176, 128], [52, 126]], { fill: R, fill2: "#b63238", round: 6, lit: true });
    k.box(50, 124, 42, 12, 2, { fill: S, shade: 2 });
    for (let i = 0; i < 4; i++) k.poly([[30 + i * 13, 122], [42 + i * 13, 122], [36 + i * 13, 108]], { fill: W, shade: 0, w: 2 });
    k.circ(156, 92, 8, { fill: S, shade: 2 });
    k.eyes(86, 122, 84, 11, "angry");
};
ART.bufferfly = (k) => {
    for (const s of [-1, 1]) {
        k.ell(100 + s * 52, 76, 44, 52, { fill: "#7ad4e6", fill2: B, rot: s * 0.4, lit: true });
        k.ell(100 + s * 42, 146, 28, 26, { fill: B, rot: -s * 0.5 });
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, cx = 100 + s * 52, cy = 76; k.circ(cx + Math.cos(a) * 20, cy + Math.sin(a) * 20, 2 + i * 0.6, { fill: W, shade: 0, w: 1.6 }); }
    }
    k.ell(100, 112, 13, 48, { fill: D, lit: true });
    k.line(C([96, 66], [86, 40], [66, 34]), 3); k.line(C([104, 66], [114, 40], [134, 34]), 3);
    k.circ(66, 33, 5, { fill: Y, shade: 0 }); k.circ(134, 33, 5, { fill: Y, shade: 0 });
    k._lidColor = D; k.eyes(92, 110, 84, 7, "tired");
};
ART.vendetta = (k) => {
    legs(k, 72, 130, 174, 188);
    k.box(100, 96, 120, 164, 8, { fill: "#3f5fb0", fill2: "#2d3f85", lit: true });
    k.box(86, 80, 76, 104, 3, { fill: "#cfe8f2", shade: 0 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) k.box(64 + c * 22, 44 + r * 34, 17, 24, 2, { fill: [R, Y, G, K, O, T][(r * 3 + c) % 6], shade: 2, w: 2 });
    k.box(148, 62, 16, 40, 3, { fill: S, shade: 2 });
    k.box(86, 154, 76, 18, 3, { fill: INK, shade: 0 });
    k._lidColor = "#3f5fb0";
    k.eyes(70, 106, 66, 11, "angry"); k.frown(88, 98, 12, 4);
};

// Helpers for the rest of the cast
const arm = (k, a, c, b, dir, w = 5) => { k.hose(a, c, b, w); k.glove(b[0], b[1], dir); };
const teeth = (k, x0, x1, y, n, h, up = false) => { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) k.poly([[x0 + i * w, y], [x0 + (i + 1) * w, y], [x0 + (i + 0.5) * w, y + (up ? -h : h)]], { fill: W, shade: 0, w: 2 }); };
const steam = (k, x, y) => { k.line(C([x, y], [x - 9, y - 12], [x + 2, y - 22]), 3.5, { color: "#b9c0cc" }); };
const textLines = (k, x, y, w, n, gap = 9, color = "#8a90a0") => { for (let i = 0; i < n; i++) k.line([[x, y + i * gap], [x + w * (i === n - 1 ? 0.6 : 1), y + i * gap]], 2.6, { color }); };
const sticky = (k, x, y, c, rot = 0) => k.box(x, y, 26, 26, 1, { fill: c, shade: 3, rot, w: 2.2 });

ART.foldling = (k) => {
    legs(k, 78, 128, 158, 174);
    arm(k, [42, 104], [20, 112], [26, 134], 1.4); arm(k, [158, 104], [182, 92], [176, 70], -1.5);
    k.box(90, 50, 80, 50, 2, { fill: W, rot: -0.12, shade: 3 }); textLines(k, 62, 42, 54, 3);
    k.box(116, 52, 70, 50, 2, { fill: "#ffe17a", rot: 0.14, shade: 3 });
    k.poly([[34, 70], [38, 48], [86, 48], [94, 66], [166, 66], [166, 160], [34, 160]], { fill: M, fill2: "#d8ae68", round: 3, lit: true });
    k.line([[34, 88], [166, 88]], 2.2, { color: "#b98f4f" });
    k._lidColor = M; k.eyes(82, 122, 112, 12, "big"); k.smile(102, 134, 13, 5);
    k.box(60, 58, 34, 11, 1, { fill: W, shade: 0, w: 2 }); k.caps("MISC", 60, 58, 1.7);
};
ART.archivore = (k) => {
    k.hose([70, 170], [66, 180], [64, 186], 8); k.hose([136, 170], [138, 180], [140, 186], 8); k.shoe(62, 190, -1, BR, 1.3); k.shoe(138, 190, -1, BR, 1.3);
    k.poly([[150, 80], [192, 110], [186, 124], [150, 120]], { fill: "#3f7a4a", round: 3 });
    k.box(106, 96, 136, 156, 6, { fill: "#4a8f58", fill2: "#2f6a3f", lit: true });
    k.box(166, 96, 18, 156, 3, { fill: "#2f6a3f", shade: 0 });
    k.box(166, 60, 13, 52, 1, { fill: W, shade: 0, w: 2 }); textLines(k, 162, 44, 8, 5, 8);
    k.circ(166, 136, 8, { fill: "#d8d9dc", shade: 0, w: 2.4 });
    k.box(82, 118, 112, 70, 5, { fill: "#7c2b3a", shade: 0 });
    for (let i = 0; i < 4; i++) { k.ell(44 + i * 26, 86, 9, 16, { ink: S, w: 4.2 }); k.ell(44 + i * 26, 150, 9, 15, { ink: S, w: 4.2 }); }
    k.box(84, 118, 86, 42, 2, { fill: W, shade: 3, rot: -0.1 }); textLines(k, 52, 106, 66, 3);
    k._lidColor = "#4a8f58"; k.eyes(76, 124, 54, 14, "angry");
};
ART.inboxer = (k) => {
    legs(k, 78, 128, 152, 176);
    k.hose([40, 118], [18, 102], [28, 74], 6); k.hose([162, 118], [186, 100], [172, 78], 6);
    k.box(100, 68, 96, 22, 1, { fill: W, rot: -0.06, shade: 3 }); k.box(104, 52, 90, 22, 1, { fill: "#ffe17a", rot: 0.08, shade: 3 }); k.box(98, 38, 92, 22, 1, { fill: W, rot: -0.1, shade: 3 });
    k.poly([[28, 80], [172, 80], [162, 162], [38, 162]], { fill: B, fill2: "#2c54a8", round: 4, lit: true });
    k._lidColor = B; k.eyes(80, 122, 112, 12, "angry"); k.grin(100, 132, 15, 11);
    k.ell(28, 62, 19, 21, { fill: R, fill2: "#b63238", lit: true, shade: 5 }); k.ell(172, 66, 19, 21, { fill: R, fill2: "#b63238", lit: true, shade: 5 });
    k.circ(162, 88, 13, { fill: R, shade: 0 }); k.box(162, 88, 3.5, 12, 1, { fill: W, ink: false, shade: 0 }); 
};
ART.replyallosaur = (k) => {
    k.poly([[120, 118], [196, 140], [196, 150], [122, 152]], { fill: "#dfe7f5", round: 4 });
    k.hose([96, 150], [94, 170], [88, 180], 10); k.hose([130, 150], [134, 170], [130, 180], 10); k.shoe(84, 184, -1, B, 1.4); k.shoe(128, 184, -1, B, 1.4);
    k.poly([[62, 96], [90, 62], [132, 74], [150, 118], [134, 160], [86, 162], [68, 134]], { fill: W, fill2: "#cfdaf0", round: 8, lit: true });
    for (let i = 0; i < 5; i++) { const x = 84 + i * 13, y = 92 + i * 10; k.line([[x - 11, y - 6], [x, y + 6], [x + 11, y - 6]], 2.2); k.box(x, y, 24, 17, 1, { ink: "#8a90a0", w: 1.5 }); }
    for (let i = 0; i < 5; i++) k.poly([[96 + i * 12, 64 + i * 7], [108 + i * 12, 70 + i * 8], [116 + i * 12, 54 + i * 9]], { fill: R, shade: 2, w: 2.2 });
    k.poly([[14, 70], [46, 40], [96, 42], [106, 74], [84, 94], [24, 86]], { fill: W, fill2: "#dfe7f5", round: 7, lit: true });
    k.poly([[20, 84], [74, 86], [84, 114], [34, 112]], { fill: W, round: 5, shade: 3 });
    k.box(50, 90, 54, 8, 2, { fill: "#7c2b3a", ink: false, shade: 0, rot: 0.05 });
    teeth(k, 20, 74, 84, 6, 10); teeth(k, 34, 80, 112, 5, 9, true);
    k.circ(70, 44, 12, { fill: R, shade: 3, lit: true }); k.caps("99", 70, 44, 2.2, W);
    k.eyes(56, 56, 62, 11, "angry");
    arm(k, [84, 120], [66, 122], [58, 134], 2.4, 5);
};
ART.redtapir = (k) => {
    for (const x of [62, 88, 128, 154]) { k.box(x, 152, 18, 40, 5, { fill: "#a82b33" }); k.shoe(x - 2, 172, -1, BR, 0.9); }
    k.ell(112, 108, 72, 54, { fill: R, fill2: "#c8323a", lit: true });
    for (let i = 0; i < 4; i++) k.line(C([70 + i * 26, 58], [92 + i * 26, 110], [66 + i * 26, 160]), 7, { color: "#f6c7c0" });
    k.ell(186, 98, 8, 14, { fill: R, rot: 0.4 }); 
    k.circ(56, 88, 34, { fill: R, fill2: "#c8323a", lit: true });
    k.line(C([34, 92], [8, 96], [12, 124]), 20, { color: INK }); k.line(C([34, 92], [8, 96], [12, 124]), 14, { color: R });
    k.ell(72, 52, 11, 19, { fill: R, shade: 3, rot: 0.3 }); k.ell(72, 54, 5, 11, { fill: K, ink: false, shade: 0, rot: 0.3 });
    k._lidColor = R; k.eyes(44, 70, 82, 9, "tired"); k.line(C([34, 116], [46, 122], [60, 116]), 3);
};
ART.bureaucroc = (k) => {
    k.poly([[130, 110], [198, 128], [198, 142], [134, 160]], { fill: "#4f9a58", round: 4 });
    for (let i = 0; i < 4; i++) k.poly([[136 + i * 14, 113 + i * 4], [150 + i * 14, 116 + i * 4], [146 + i * 14, 102 + i * 4]], { fill: G, shade: 0, w: 2.2 });
    k.box(82, 174, 22, 22, 6, { fill: "#3f7f4a" }); k.box(128, 174, 22, 22, 6, { fill: "#3f7f4a" }); k.shoe(80, 186, -1, BR, 1.2); k.shoe(126, 186, -1, BR, 1.2);
    k.ell(108, 128, 54, 46, { fill: "#4f9a58", fill2: "#3a7d48", lit: true });
    k.ell(104, 138, 34, 30, { fill: "#d7e4a8", shade: 4, w: 2.4 });
    for (let i = 0; i < 5; i++) k.line(C([62, 110 + i * 14], [110, 124 + i * 14], [156, 112 + i * 14]), 6, { color: R });
    k.poly([[4, 66], [86, 40], [124, 54], [130, 84], [4, 84]], { fill: "#5fae66", fill2: "#4f9a58", round: 7, lit: true });
    k.poly([[8, 102], [98, 92], [126, 100], [120, 116], [12, 118]], { fill: "#4f9a58", round: 6, shade: 3 });
    k.box(70, 92, 112, 12, 2, { fill: "#7c2b3a", ink: false, shade: 0 });
    teeth(k, 8, 120, 86, 9, 10); teeth(k, 14, 118, 102, 8, 9, true);
    k.circ(92, 38, 15, { fill: "#5fae66", shade: 3 }); k._lidColor = "#5fae66"; k.eyes(92, 92, 38, 10, "angry");
    k.poly([[96, 150], [112, 150], [108, 172], [100, 172]], { fill: B, shade: 0, w: 2.4 });
};
ART.staplet = (k) => {
    legs(k, 84, 128, 148, 166, BR);
    k.box(108, 142, 96, 16, 6, { fill: D, lit: true });
    k.poly([[56, 92], [146, 74], [162, 104], [160, 128], [70, 130]], { fill: R, fill2: "#c23a40", round: 6, lit: true });
    k.box(72, 128, 30, 9, 2, { fill: S, shade: 2 }); k.poly([[62, 126], [76, 126], [69, 114]], { fill: W, shade: 0, w: 2 });
    k._lidColor = R; k.eyes(100, 132, 100, 13, "big"); k.circ(150, 112, 5, { fill: S, shade: 0, w: 2 });
    arm(k, [74, 108], [50, 96], [38, 76], -1.8);
};
ART.namastapler = (k) => {
    k.ell(100, 168, 76, 16, { fill: "#8b6cf0", shade: 4, lit: true });
    k.ell(100, 44, 54, 12, { ink: Y, w: 4.5 });
    k.hose([60, 142], [36, 164], [78, 162], 6); k.hose([140, 142], [164, 164], [122, 162], 6); k.shoe(84, 160, 1, G); k.shoe(116, 160, -1, G);
    k.box(100, 134, 104, 26, 8, { fill: D, lit: true });
    k.poly([[46, 76], [150, 66], [160, 92], [158, 124], [56, 124]], { fill: G, fill2: "#3f9550", round: 7, lit: true });
    k.box(60, 120, 34, 9, 2, { fill: S, shade: 2 });
    k._lidColor = G; k.eyes(84, 122, 92, 11, "shut"); k.smile(103, 106, 9, 3);
    k.hose([52, 100], [34, 124], [84, 142], 5); k.hose([150, 100], [168, 124], [116, 142], 5); k.glove(92, 140, 0, 8); k.glove(108, 140, 3.14, 8);
};
ART.punchline = (k) => {
    legs(k, 72, 130, 158, 178, BR);
    k.box(104, 146, 136, 26, 7, { fill: "#39414f", lit: true });
    for (const x of [62, 104, 146]) k.circ(x, 146, 8, { fill: "#101420", shade: 0, w: 2 });
    k.box(52, 110, 20, 54, 3, { fill: D, shade: 3 }); k.box(156, 110, 20, 54, 3, { fill: D, shade: 3 });
    k.poly([[30, 66], [170, 54], [178, 92], [34, 104]], { fill: T, fill2: "#208783", round: 8, lit: true });
    k._lidColor = T; k.eyes(82, 124, 76, 11, "smug"); k.line(C([84, 92], [104, 102], [126, 88]), 3.4);
    arm(k, [32, 88], [12, 104], [22, 124], 1.4); arm(k, [172, 84], [194, 92], [186, 62], -1.5);
};
ART.swivelord = (k) => {
    k.box(102, 164, 14, 28, 3, { fill: S, shade: 3 });
    for (const [x, y] of [[50, 186], [76, 190], [128, 190], [154, 186]]) { k.line([[102, 176], [x, y - 5]], 7, { color: INK }); k.line([[102, 176], [x, y - 5]], 3.4, { color: S }); k.circ(x, y, 7, { fill: "#39414f", shade: 0, w: 2.2 }); }
    k.box(102, 140, 112, 28, 10, { fill: "#6d4329", lit: true });
    k.box(102, 84, 104, 118, 24, { fill: "#8a5a3a", fill2: "#6d4329", lit: true });
    for (const x of [72, 102, 132]) for (const y of [44, 124]) k.circ(x, y, 4, { fill: "#5c3a22", shade: 0, w: 1.8 });
    k.box(40, 118, 16, 8, 3, { fill: "#39414f", shade: 0 }); k.box(164, 118, 16, 8, 3, { fill: "#39414f", shade: 0 });
    k.box(40, 104, 16, 30, 6, { fill: D }); k.box(164, 104, 16, 30, 6, { fill: D });
    k._lidColor = "#8a5a3a"; k.eyes(82, 122, 76, 12, "smug"); k.smile(102, 96, 12, 3);
    k.poly([[80, 18], [90, 32], [102, 16], [114, 32], [124, 18], [124, 38], [80, 38]], { fill: Y, round: 1, shade: 3, lit: true });
};
ART.shredward = (k) => {
    legs(k, 72, 132, 174, 180);
    k.poly([[46, 90], [158, 90], [150, 176], [54, 176]], { fill: "#e9f2f4", fill2: "#c6d6db", round: 4, shade: 4 });
    for (let i = 0; i < 12; i++) { const x = 62 + i * 7, l = 42 + (i * 37 % 34); k.line([[x, 90], [x + Math.sin(i) * 3, 90 + l]], 4.2, { color: i % 3 ? W : "#ffe17a" }); }
    k.box(102, 60, 138, 62, 7, { fill: "#5b6478", fill2: "#454e60", lit: true });
    k.box(102, 86, 100, 10, 2, { fill: INK, shade: 0 });
    for (let i = 0; i < 8; i++) k.box(60 + i * 12, 96, 6, 12 + (i % 3) * 5, 1, { fill: W, shade: 0, w: 2 });
    k.box(162, 42, 12, 8, 2, { fill: G, shade: 0, w: 2 });
    k._lidColor = "#5b6478"; k.eyes(82, 122, 58, 12, "tired", { look: [-0.2, 0.3] });
};
const mug = (k, x, y, w, h, col, col2) => {
    k.line(C([x + w / 2 - 2, y - h * 0.26], [x + w / 2 + 34, y], [x + w / 2 - 2, y + h * 0.28]), 15, { color: INK }); k.line(C([x + w / 2 - 2, y - h * 0.26], [x + w / 2 + 34, y], [x + w / 2 - 2, y + h * 0.28]), 8, { color: col });
    k.box(x, y, w, h, 12, { fill: col, fill2: col2, lit: true });
    k.ell(x, y - h / 2 + 8, w / 2 - 2, 11, { fill: "#6b4226", w: 2.8, shade: 0 });
};
ART.mugling = (k) => {
    legs(k, 78, 112, 150, 170);
    arm(k, [50, 110], [30, 116], [28, 138], 1.5);
    mug(k, 95, 104, 92, 96, W, "#e6e0d0");
    steam(k, 86, 58); steam(k, 108, 56);
    k.eyes(78, 112, 100, 10, "big"); k.smile(95, 118, 9, 3); k.caps("OK BOSS", 95, 136, 1.9, B);
};
ART.mugshot = (k) => {
    legs(k, 72, 118, 164, 178);
    mug(k, 95, 104, 110, 118, W, "#d6d0c0");
    for (let i = 0; i < 4; i++) k.box(95, 76 + i * 25, 104, 11, 0, { fill: "#2d3142", ink: false, shade: 0 });
    k.ell(95, 53, 53, 11, { fill: "#4a2c18", w: 2.8, shade: 0 });
    steam(k, 86, 44); steam(k, 112, 44);
    k._lidColor = W; k.eyes(74, 116, 88, 11, "tired"); k.frown(95, 108, 9, 3);
    k.box(95, 146, 80, 30, 2, { fill: W, shade: 3 }); k.caps("A2214", 95, 146, 3);
    k.hose([40, 120], [24, 146], [56, 146], 5); k.glove(56, 148, 0); k.hose([150, 130], [158, 150], [134, 150], 5); k.glove(134, 150, 3.14);
};
ART.baristotle = (k) => {
    legs(k, 66, 136, 172, 182, BR);
    k.box(100, 96, 136, 152, 10, { fill: "#c9ced6", fill2: "#969eae", lit: true });
    k.box(100, 30, 136, 22, 6, { fill: "#39414f", shade: 0 }); 
    for (const a of [-1, 1]) for (let i = 0; i < 5; i++) k.ell(100 + a * (20 + i * 12), 26 + i * 3.4, 11, 6, { fill: G, rot: a * (0.5 + i * 0.14), shade: 2 });
    k._lidColor = "#c9ced6"; k.eyes(78, 122, 62, 13, "tired");
    for (let i = 0; i < 7; i++) k.circ(58 + i * 14, 112 + Math.sin(i * 2) * 5 + Math.abs(i - 3) * -5 + 8, 14, { fill: W, shade: 3, w: 2.6 });
    k.circ(100, 142, 17, { fill: W, shade: 3, w: 2.6 }); k.circ(86, 124, 13, { fill: W, shade: 0, ink: false }); k.circ(116, 124, 13, { fill: W, shade: 0, ink: false });
    k.line(C([36, 72], [14, 74], [18, 112]), 9, { color: INK }); k.line(C([36, 72], [14, 74], [18, 112]), 4.4, { color: S }); steam(k, 16, 128);
    arm(k, [166, 110], [188, 124], [180, 146], 1.4);
    k.box(100, 90, 40, 8, 2, { fill: INK, ink: false, shade: 0 });
};
ART.lukewarm = (k) => {
    k.ell(100, 170, 80, 13, { fill: "#d8d9dc", shade: 3 });
    legs(k, 78, 116, 150, 158);
    mug(k, 95, 102, 106, 100, "#d9d2c0", "#bdb5a2");
    k.ell(95, 61, 49, 11, { fill: "#c9b08c", w: 2.8, shade: 0 });
    k.line(C([56, 60], [90, 54], [134, 62]), 2.2, { color: "#e9dcc2" });
    k._lidColor = "#d9d2c0"; k.eyes(76, 114, 100, 12, "tired", { look: [0, 0.3] }); k.frown(95, 122, 8, 2.4);
    k.poly([[118, 112], [124, 124], [112, 124]], { fill: "#9fd3ec", shade: 0, w: 1.8 }); k.circ(118, 125, 6, { fill: "#9fd3ec", shade: 0, w: 1.8 });
};
ART.spadpole = (k) => {
    k.line(C([120, 118], [160, 92], [186, 128]), 22, { color: INK, w2: 8 }); k.line(C([120, 118], [160, 92], [186, 128]), 15, { color: "#dfe7f5", w2: 3 });
    k.ell(88, 114, 62, 52, { fill: W, fill2: "#dfe7f5", lit: true });
    k.line([[34, 88], [88, 122], [142, 88]], 3);
    k.eyes(70, 106, 106, 15, "big"); k.smile(88, 138, 8, 3);
};
ART.spamphibian = (k) => {
    for (const s of [-1, 1]) { k.ell(100 + s * 58, 160, 34, 17, { fill: G, shade: 3 }); k.ell(100 + s * 80, 180, 20, 9, { fill: "#4f9a58", shade: 0 }); }
    k.ell(100, 118, 72, 60, { fill: G, fill2: "#3f9550", lit: true });
    k.box(100, 136, 86, 54, 5, { fill: W, shade: 3 }); k.line([[58, 112], [100, 142], [142, 112]], 2.6);
    k.caps("WINNER", 100, 150, 2.4, R);
    for (const x of [62, 138]) { k.circ(x, 62, 26, { fill: G, shade: 3 }); k.eyes(x, x, 60, 17, "wide"); }
    k.grin(100, 84, 26, 9);
    k.poly([[76, 36], [84, 16], [100, 30], [116, 16], [124, 36]], { fill: Y, round: 1, shade: 2 });
};
ART.bcclops = (k) => {
    k.sdf((x, y) => { const b = Math.hypot((x - 100) / 66, (y - 84) / 66) - 1, b2 = Math.max(Math.abs(x - 100) - 66, y - 150, 84 - y) / 66, wave = y - (146 + Math.sin(x * 0.14) * 12); return Math.max(Math.min(b, b2), wave / 66) * 66; }, 30, 14, 170, 170, { fill: "#e4dcff", fill2: "#b9a6f5", lit: true });
    k.circ(100, 84, 44, { fill: W, shade: 0 }); k.circ(90, 88, 25, { fill: P, shade: 0, w: 2.6 }); k.circ(86, 90, 13, { fill: INK, ink: false, shade: 0 }); k.circ(80, 82, 6, { fill: W, ink: false, shade: 0 });
    k.line([[44, 30], [100, 14], [156, 30]], 4, { color: "#8b6cf0" }); k.caps("BCC", 100, 136, 3, "#6a4ad0");
    k.hose([40, 104], [20, 120], [26, 100], 5); k.glove(26, 96, -1.6); k.hose([160, 104], [182, 110], [176, 130], 5); k.glove(176, 136, 1.5);
};
const form = (k, x, y, w, h, fill, fill2, rot = 0, eyes = "big", lid) => {
    k.box(x, y, w, h, 2, { fill, fill2, rot, lit: true });
    k.box(x, y - h / 2 + 12, w - 22, 8, 1, { fill: mix(fill, INK, 0.5), ink: false, shade: 0, rot });
    k._lidColor = lid ?? fill; k.eyes(x - w * 0.2, x + w * 0.18, y - 4, w * 0.13, eyes);
    for (let i = 0; i < 2; i++) k.box(x - w * 0.34, y + 26 + i * 14, 8, 8, 1, { fill: W, shade: 0, w: 1.8 });
    textLines(k, x - w * 0.2, y + 26, w * 0.5, 2, 14);
};
ART.formlet = (k) => {
    legs(k, 82, 118, 158, 172);
    arm(k, [56, 108], [40, 98], [34, 118], 1.5); arm(k, [144, 108], [162, 98], [168, 118], 1.5);
    form(k, 100, 98, 92, 122, W, "#e9e4d4", 0, "tired");
    k.smile(100, 110, 6, 2);
};
ART.duplicate = (k) => {
    legs(k, 88, 124, 164, 178);
    form(k, 130, 88, 90, 126, "#ffe17a", "#f2cc55", 0.08, "tired");
    form(k, 72, 96, 90, 126, W, "#e9e4d4", -0.06, "big");
    k.smile(72, 106, 6, 2); k.frown(130, 98, 6, 2);
};
ART.triplicate = (k) => {
    legs(k, 76, 130, 166, 180, BR);
    k.line(C([60, 150], [34, 110], [44, 76]), 26, { color: INK }); k.line(C([60, 150], [34, 110], [44, 76]), 19, { color: "#ffc7d9" });
    k.line(C([140, 150], [170, 110], [158, 76]), 26, { color: INK }); k.line(C([140, 150], [170, 110], [158, 76]), 19, { color: "#ffe17a" });
    k.box(100, 142, 110, 56, 8, { fill: W, fill2: "#e9e4d4", lit: true });
    form(k, 42, 58, 64, 84, "#ffc7d9", "#ff9fbd", -0.12, "angry");
    form(k, 158, 58, 64, 84, "#ffe17a", "#f2cc55", 0.12, "tired");
    k.line(C([100, 130], [100, 110], [100, 96]), 28, { color: INK }); k.line(C([100, 130], [100, 110], [100, 96]), 21, { color: W });
    form(k, 100, 52, 74, 92, W, "#e9e4d4", 0, "smug");
    k.caps("COPY 1", 100, 150, 2.4, R);
};
ART.stamplet = (k) => {
    legs(k, 80, 120, 164, 176);
    k.box(100, 148, 104, 30, 4, { fill: R, fill2: "#b63238", lit: true });
    k.box(100, 118, 76, 34, 5, { fill: "#c79a63", shade: 4 });
    k.box(100, 92, 26, 24, 6, { fill: "#a97c49", shade: 3 });
    k.circ(100, 58, 40, { fill: "#c79a63", fill2: "#a97c49", lit: true });
    k._lidColor = "#c79a63"; k.eyes(84, 116, 56, 10, "big"); k.smile(100, 72, 8, 3);
    k.caps("OK", 100, 148, 4, W);
    arm(k, [62, 118], [38, 110], [36, 88], -1.6);
};
ART.stampede = (k) => {
    const one = (x, y, s, c, word) => {
        k.hose([x - 12 * s, y + 42 * s], [x - 14 * s, y + 54 * s], [x - 16 * s, y + 60 * s], 5 * s); k.hose([x + 12 * s, y + 42 * s], [x + 18 * s, y + 52 * s], [x + 24 * s, y + 58 * s], 5 * s);
        k.box(x, y + 28 * s, 74 * s, 24 * s, 4, { fill: c, fill2: mix(c, INK, 0.2) });
        k.box(x, y + 6 * s, 50 * s, 26 * s, 4, { fill: "#c79a63" }); k.circ(x, y - 22 * s, 28 * s, { fill: "#c79a63", fill2: "#a97c49", lit: true });
        k.caps(word, x, y + 28 * s, 1.9 * s, W);
        k.eyes(x - 12 * s, x + 12 * s, y - 24 * s, 8 * s, "angry");
    };
    for (let i = 0; i < 4; i++) k.circ(170 + i * 8 - 12, 170 - i * 14, 13 - i, { fill: "#d8d2c0", shade: 0, w: 2.2 });
    one(150, 74, 0.72, R, "DENIED"); one(52, 80, 0.72, "#3b6fd4", "NO"); one(100, 94, 1, R, "DENIED");
};
ART.ndaconda = (k) => {
    const body = (a, b) => { k.line(a, b + 8, { color: INK }); k.line(a, b, { fill: W, ink: false, shade: 0, color: W }); };
    const coil = [...C([166, 160], [190, 110], [120, 118]), ...C([120, 118], [40, 124], [60, 162]), ...C([60, 162], [90, 188], [150, 174])];
    k.line(coil, 36, { color: INK }); k.line(coil, 28, { color: "#f0ead8" });
    for (let i = 3; i < coil.length - 1; i += 4) k.box(coil[i][0], coil[i][1], 24, 9, 1, { fill: INK, ink: false, shade: 0, rot: i * 0.6 });
    const neck = C([166, 160], [188, 100], [116, 88]);
    k.line(neck, 34, { color: INK }); k.line(neck, 26, { color: "#f0ead8" });
    k.ell(82, 64, 50, 36, { fill: "#f0ead8", fill2: "#d8cfb8", lit: true });
    k.box(82, 56, 86, 22, 2, { fill: INK, shade: 0, ink: false, rot: -0.06 });
    k.caps("REDACTED", 82, 56, 1.7, W, { rot: -0.06 });
    k.line(C([34, 80], [10, 88], [12, 104]), 4, { color: R }); k.line([[12, 104], [2, 112]], 3, { color: R }); k.line([[12, 104], [16, 118]], 3, { color: R });
    k.line(C([40, 80], [70, 90], [110, 78]), 3);
};
ART.snarlcord = (k) => {
    const cols = ["#39414f", T, "#d9d4c5", R, "#3f5fb0"];
    legs(k, 78, 124, 160, 178);
    k.circ(100, 100, 66, { fill: "#39414f", shade: 5 });
    for (let i = 0; i < 12; i++) { const a = i * 1.9, b = a + 2.4, r = 58; const p0 = [100 + Math.cos(a) * r, 100 + Math.sin(a) * r], p1 = [100 + Math.cos(b) * r, 100 + Math.sin(b) * r], c = [100 + Math.cos(a + 1.2) * 18, 100 + Math.sin(a + 1.2) * 18]; k.line(C(p0, c, p1), 10, { color: INK }); k.line(C(p0, c, p1), 5.4, { color: cols[i % 5] }); }
    const plug = (x, y, r) => { k.line(C([100 + Math.cos(r) * 50, 100 + Math.sin(r) * 50], [x, y], [x + Math.cos(r) * 8, y + Math.sin(r) * 8]), 7, { color: INK }); k.box(x + Math.cos(r) * 16, y + Math.sin(r) * 16, 22, 15, 2, { fill: S, rot: r, shade: 2 }); k.box(x + Math.cos(r) * 29, y + Math.sin(r) * 29 - 3, 9, 3, 0, { fill: Y, ink: false, shade: 0, rot: r }); k.box(x + Math.cos(r) * 29, y + Math.sin(r) * 29 + 3, 9, 3, 0, { fill: Y, ink: false, shade: 0, rot: r }); };
    plug(36, 40, -2.4); plug(164, 36, -0.8); plug(168, 136, 0.5);
    k.eyes(82, 118, 96, 13, "angry"); k.grin(100, 116, 14, 9);
};
ART.loadipillar = (k) => {
    const n = 6;
    for (let i = n - 1; i >= 0; i--) { const x = 42 + i * 25, y = 124 + Math.sin(i * 1.2) * 8; k.line([[x - 6, y + 22], [x - 8, y + 38]], 4); k.line([[x + 6, y + 22], [x + 8, y + 38]], 4); k.circ(x, y, 25, { fill: i < 3 ? "#5fe08a" : "#d8d9dc", fill2: i < 3 ? "#3fae68" : "#b4b7be", lit: i === 0, shade: 5 }); }
    k.line(C([30, 104], [18, 78], [8, 76]), 3.6); k.line(C([50, 102], [52, 76], [62, 70]), 3.6); k.circ(8, 74, 5, { fill: Y, shade: 0, w: 2 }); k.circ(62, 68, 5, { fill: Y, shade: 0, w: 2 });
    k.eyes(30, 54, 120, 9, "tired", { lid: "#5fe08a" }); k.frown(42, 136, 5, 2);
    k.caps("37%", 144, 78, 3.5, T);
};
const grid = (k, x, y, w, h, nx, ny, col = "#7bb896") => { for (let i = 1; i < nx; i++) k.line([[x + i * w / nx, y], [x + i * w / nx, y + h]], 1.6, { color: col }); for (let i = 1; i < ny; i++) k.line([[x, y + i * h / ny], [x + w, y + i * h / ny]], 1.6, { color: col }); };
ART.cellmate = (k) => {
    legs(k, 80, 120, 154, 168);
    k.circ(164, 176, 14, { fill: "#39414f", shade: 3, lit: true }); k.line(C([120, 170], [140, 186], [152, 176]), 3.4, { color: S });
    k.box(100, 92, 124, 126, 3, { fill: "#eaf6ea", fill2: "#d2e8d2", lit: true });
    k.box(100, 40, 120, 18, 1, { fill: "#3f9550", ink: false, shade: 0 }); k.caps("SHEET1", 100, 40, 2.1, W);
    grid(k, 40, 49, 120, 106, 4, 5);
    k.box(100, 90, 62, 44, 1, { fill: "#fffbe0", ink: G, w: 3.4, shade: 0 });
    k.eyes(86, 114, 88, 10, "tired", { lid: "#fffbe0" }); k.frown(100, 106, 7, 2);
    arm(k, [38, 100], [18, 110], [20, 128], 1.4);
};
ART.pivotaur = (k) => {
    legs(k, 72, 130, 164, 180, BR);
    k.poly([[46, 80], [156, 80], [146, 170], [58, 170]], { fill: "#eaf6ea", fill2: "#c9e4c9", round: 6, lit: true }); grid(k, 56, 86, 92, 80, 5, 4);
    k.box(100, 120, 60, 10, 0, { fill: Y, ink: false, shade: 0 }); k.box(100, 134, 80, 9, 0, { fill: "#ffc08a", ink: false, shade: 0 });
    k.hose([50, 96], [14, 92], [24, 132], 12); k.hose([150, 96], [188, 92], [176, 132], 12); k.glove(24, 138, 1.5, 11); k.glove(176, 138, 1.5, 11);
    k.poly([[60, 34], [24, 24], [14, 2], [40, 16], [68, 22]], { fill: W, shade: 3, round: 2 }); k.poly([[140, 34], [176, 24], [186, 2], [160, 16], [132, 22]], { fill: W, shade: 3, round: 2 });
    k.ell(100, 50, 50, 42, { fill: "#8a5a3a", fill2: "#6d4329", lit: true });
    k.ell(100, 74, 30, 19, { fill: "#d6a06a", shade: 0 }); k.circ(90, 72, 3.4, { fill: INK, ink: false, shade: 0 }); k.circ(110, 72, 3.4, { fill: INK, ink: false, shade: 0 });
    k.ell(100, 92, 11, 8, { ink: Y, w: 3.4 });
    k._lidColor = "#8a5a3a"; k.eyes(78, 122, 42, 10, "angry");
};
ART.invitling = (k) => {
    legs(k, 80, 122, 154, 170);
    k.box(100, 100, 118, 112, 8, { fill: W, fill2: "#e6e0d0", lit: true });
    k.box(100, 60, 118, 32, 8, { fill: R, shade: 0 }); k.box(100, 72, 116, 10, 0, { fill: R, ink: false, shade: 0 }); k.caps("MON", 100, 62, 3, W);
    for (const x of [66, 134]) k.box(x, 42, 11, 28, 4, { fill: S, shade: 2 });
    k.eyes(82, 118, 106, 11, "big"); k.smile(100, 130, 10, 3);
    arm(k, [42, 110], [20, 104], [28, 78], -1.5);
    k.box(160, 128, 60, 24, 5, { fill: G, shade: 3 }); k.caps("YES?", 160, 128, 2.2, W);
};
ART.recurrence = (k) => {
    k.line(Array.from({ length: 34 }, (_, i) => { const a = -0.7 + i / 33 * 5.2; return [100 + Math.cos(a) * 84, 104 + Math.sin(a) * 84]; }), 24, { color: INK });
    k.line(Array.from({ length: 34 }, (_, i) => { const a = -0.7 + i / 33 * 5.2; return [100 + Math.cos(a) * 84, 104 + Math.sin(a) * 84]; }), 15, { color: P });
    const a = -0.7 + 5.2, ex = 100 + Math.cos(a) * 84, ey = 104 + Math.sin(a) * 84;
    k.poly([[ex - 22, ey - 12], [ex + 24, ey - 16], [ex + 8, ey + 24]], { fill: P, round: 2, shade: 0 });
    k.box(100, 104, 110, 104, 7, { fill: W, fill2: "#e6e0d0", lit: true });
    k.box(100, 66, 110, 28, 7, { fill: "#6a4ad0", shade: 0 }); k.caps("TUESDAY", 100, 66, 2.3, W);
    k.eyes(80, 120, 106, 12, "smug", { lid: "#f0ead8" }); k.line(C([76, 130], [100, 146], [124, 126]), 3.6);
    for (const x of [74, 126]) k.box(x, 48, 10, 22, 4, { fill: S, shade: 2 });
};
ART.scribblet = (k) => {
    k.line(C([26, 170], [60, 136], [78, 172]), 7, { color: B }); k.line(C([78, 172], [100, 140], [122, 176]), 7, { color: B });
    legs(k, 88, 116, 152, 170);
    k.poly([[90, 22], [112, 22], [112, 46], [90, 46]], { fill: B, round: 2, shade: 3 });
    k.box(101, 96, 54, 112, 8, { fill: W, fill2: "#e6e0d0", lit: true }); k.box(101, 46, 54, 16, 3, { fill: B, shade: 2 }); k.box(101, 146, 54, 14, 3, { fill: B, shade: 2 });
    k.eyes(90, 112, 88, 8.5, "big"); k.smile(101, 106, 6, 2);
    arm(k, [74, 104], [52, 112], [48, 138], 1.5); arm(k, [128, 100], [150, 92], [154, 70], -1.5);
};
ART.brainstorm = (k) => {
    for (const [x, y, c, r] of [[36, 150, Y, -0.2], [168, 146, K, 0.2], [100, 176, "#9fd3ec", 0.1]]) sticky(k, x, y, c, r);
    k.poly([[84, 118], [58, 164], [86, 160], [72, 194], [122, 142], [94, 146], [112, 118]], { fill: Y, shade: 0 });
    const cloud = [[56, 92, 36], [92, 66, 44], [134, 72, 40], [158, 104, 30], [116, 110, 40], [74, 112, 32]];
    k.sdf((x, y) => Math.min(...cloud.map(([a, b, r]) => Math.hypot(x - a, y - b) - r)), 14, 14, 192, 150, { fill: "#8f9ab8", fill2: "#5f6a8a", lit: true });
    k._lidColor = "#8f9ab8"; k.eyes(82, 122, 86, 13, "wide"); k.line(C([84, 112], [100, 104], [120, 114]), 3.4);
    arm(k, [24, 104], [4, 92], [12, 66], -1.5);
    k.line([[12, 56], [20, 40]], 7, { color: R });
};
ART.starfone = (k) => {
    k.sdf((x, y) => { let d = 1e9; for (let i = 0; i < 3; i++) { const a = -1.57 + i * 2.094, ex = Math.cos(a) * 80, ey = Math.sin(a) * 80, wx = x - 100, wy = y - 106, t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey))); d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t) - (42 - t * 24)); } return d; }, 8, 2, 192, 196, { fill: "#6b7588", fill2: "#454e60", lit: true });
    k.circ(100, 106, 44, { fill: "#39414f", shade: 0 });
    for (let r = 1; r < 3; r++) for (let i = 0; i < 8 * r; i++) { const a = i / (8 * r) * 6.283; k.circ(100 + Math.cos(a) * r * 13, 118 + Math.sin(a) * r * 8, 2, { fill: "#6b7588", ink: false, shade: 0 }); }
    k.eyes(80, 120, 92, 13, "wide", { look: [0.2, 0] });
    k.circ(100, 30, 7, { fill: "#5fe08a", shade: 0, w: 2.4 });
    k.circ(36, 150, 6, { fill: R, shade: 0, w: 2 }); k.circ(164, 150, 6, { fill: Y, shade: 0, w: 2 });
};
ART.bullit = (k) => {
    legs(k, 84, 118, 146, 166);
    k.circ(102, 92, 58, { fill: "#39414f", fill2: "#1f2430", lit: true });
    k.eyes(82, 122, 86, 12, "big"); k.smile(102, 110, 11, 4);
    for (const [x, y, r] of [[34, 42, 12], [168, 30, 10], [176, 86, 8]]) { k.line([[x, y], [x + (102 - x) * 0.45, y + (92 - y) * 0.45]], 2.4, { color: "#8a90a0" }); k.circ(x, y, r, { fill: "#39414f", shade: 0 }); }
    arm(k, [46, 104], [24, 110], [22, 130], 1.4);
};
ART.deckromancer = (k) => {
    k.poly([[60, 60], [140, 60], [172, 188], [28, 188]], { fill: "#5b3fb0", fill2: "#3a2680", round: 5, lit: true });
    k.poly([[100, 6], [150, 72], [50, 72]], { fill: "#6a4ad0", fill2: "#4a309c", round: 8 });
    k.ell(100, 68, 42, 32, { fill: "#141a33", shade: 0 });
    k.circ(84, 68, 8, { fill: "#7fe6d8", shade: 0, ink: false }); k.circ(116, 68, 8, { fill: "#7fe6d8", shade: 0, ink: false }); k.circ(84, 68, 3, { fill: W, ink: false, shade: 0 }); k.circ(116, 68, 3, { fill: W, ink: false, shade: 0 });
    k.box(100, 144, 92, 64, 3, { fill: W, shade: 3 });
    k.sdf((x, y) => Math.hypot(x - 80, y - 144) - 21, 58, 122, 102, 166, { fill: R, shade: 0, w: 2.2 });
    k.sdf((x, y) => Math.max(Math.hypot(x - 80, y - 144) - 21, 144 - y, x - 80 > 0 ? -1 : 1) , 80, 144, 102, 166, { fill: Y, shade: 0, w: 2.2 });
    textLines(k, 110, 130, 28, 4, 9); k.caps("Q3", 100, 124, 2, B);
    k.line([[178, 40], [178, 186]], 6, { color: INK }); k.line([[178, 40], [178, 186]], 3, { color: "#c9a24a" }); k.circ(178, 34, 8, { fill: R, shade: 0 }); k.glove(174, 112, 3.14);
    k.hose([140, 110], [156, 120], [170, 112], 5); arm(k, [52, 112], [30, 118], [26, 92], -1.5);
};
ART.synergosling = (k) => {
    legs(k, 88, 118, 146, 168, O);
    k.ell(104, 110, 50, 46, { fill: Y, fill2: "#f0b429", lit: true });
    k.circ(84, 62, 34, { fill: Y, fill2: "#ffcf3a", lit: true });
    k.poly([[52, 60], [24, 70], [52, 78]], { fill: O, round: 2, shade: 2 });
    k.eyes(74, 98, 54, 9, "big");
    k.ell(142, 110, 18, 26, { fill: "#ffcf3a", rot: 0.4, shade: 4 });
    k.line(C([66, 92], [90, 124], [112, 92]), 3.4, { color: R }); k.box(90, 128, 22, 18, 2, { fill: W, shade: 0, w: 2.2 });
};
ART.synergoose = (k) => {
    k.hose([96, 160], [94, 174], [92, 182], 6); k.hose([128, 160], [130, 174], [128, 182], 6); k.shoe(88, 186, -1, O, 1.2); k.shoe(124, 186, -1, O, 1.2);
    k.ell(118, 122, 64, 46, { fill: "#2d3142", fill2: "#1e2233", lit: true });
    k.poly([[168, 96], [198, 76], [190, 116]], { fill: W, round: 3, shade: 2 });
    const neck = C([78, 110], [50, 88], [66, 42]);
    k.line(neck, 34, { color: INK }); k.line(neck, 26, { color: W });
    k.ell(64, 36, 28, 25, { fill: W, shade: 3 });
    k.poly([[40, 28], [4, 44], [42, 50]], { fill: O, round: 3, shade: 2 }); k.line([[8, 44], [42, 42]], 2.4);
    k._lidColor = W; k.eyes(62, 62, 28, 10, "angry");
    k.poly([[76, 104], [100, 96], [108, 118], [88, 134]], { fill: W, round: 2, shade: 0 });
    k.poly([[86, 102], [96, 102], [98, 130], [90, 138], [84, 128]], { fill: R, shade: 0, w: 2.2 });
};
ART.donutdisturb = (k) => {
    legs(k, 72, 128, 158, 176);
    k.circ(100, 92, 70, { fill: "#d6a06a", shade: 7 });
    k.sdf((x, y) => Math.hypot(x - 100, y - 86) - 64 - Math.sin(Math.atan2(y - 86, x - 100) * 7) * 5, 26, 14, 174, 162, { fill: K, fill2: "#ff6f9a", lit: true });
    k.circ(100, 88, 21, { fill: "#2fa6a0", shade: 0 });
    const cols = [Y, W, B, G, O];
    for (let i = 0; i < 22; i++) { const a = i * 2.4, r = 36 + (i * 13 % 22); k.box(100 + Math.cos(a) * r, 86 + Math.sin(a) * r * 0.9, 12, 4, 2, { fill: cols[i % 5], ink: false, shade: 0, rot: a * 2 }); }
    k._lidColor = K; k.eyes(62, 138, 74, 12, "angry");
    k.line(C([76, 124], [100, 114], [124, 124]), 3.4);
};
ART.cultling = (k) => {
    legs(k, 80, 120, 158, 172);
    k.poly([[42, 66], [158, 66], [146, 158], [54, 158]], { fill: W, fill2: "#e6e0d0", round: 4, lit: true });
    k.box(100, 112, 106, 32, 0, { fill: K, ink: false, shade: 0 });
    k.ell(100, 64, 62, 16, { fill: "#f6efdc", w: 3 });
    for (const [x, y, r] of [[74, 62, 7], [120, 66, 9], [102, 58, 5]]) k.circ(x, y, r, { fill: "#7fbf7a", shade: 2, w: 2 });
    k.line(C([120, 58], [126, 36], [140, 30]), 3, { color: "#3f9550" }); k.ell(146, 28, 11, 6, { fill: G, rot: -0.3, shade: 0, w: 2.2 });
    k.eyes(82, 118, 102, 11, "big", { look: [0, 0] }); k.smile(100, 120, 11, 4); k.caps("BEST BEFORE", 100, 146, 1.4);
};
ART.culturion = (k) => {
    k.poly([[46, 110], [154, 110], [150, 186], [50, 186]], { fill: W, fill2: "#e6e0d0", round: 4, lit: true });
    k.box(100, 150, 100, 22, 0, { fill: K, ink: false, shade: 0 }); k.caps("LIVE ACTIVE", 100, 150, 1.9);
    k.sdf((x, y) => { const blobs = [[100, 86, 66], [46, 112, 26], [154, 112, 28], [66, 144, 15], [136, 150, 13]]; return Math.min(...blobs.map(([a, b, r]) => Math.hypot(x - a, y - b) - r)); }, 16, 16, 184, 170, { fill: "#f6efdc", fill2: "#ded3b6", lit: true });
    for (const [x, y, r] of [[60, 62, 13], [146, 74, 10], [100, 30, 9], [40, 110, 7]]) k.circ(x, y, r, { fill: "#7fbf7a", shade: 3, w: 2.2 });
    for (const [x, y, r] of [[80, 84, 13], [122, 80, 15], [102, 116, 9], [156, 108, 7], [50, 100, 6]]) k.eyes(x, x, y, r, "wide", { look: [0, 0] });
    k.line(C([170, 30], [160, 90], [168, 150]), 6, { color: INK }); k.line(C([170, 30], [160, 90], [168, 150]), 3, { color: S }); k.ell(170, 22, 10, 15, { fill: S, shade: 3, lit: true });
};
ART.cakeholder = (k) => {
    legs(k, 70, 134, 152, 176);
    k.box(100, 118, 148, 70, 6, { fill: "#fff0d6", fill2: "#f3d9ae", lit: true });
    k.box(100, 92, 148, 22, 8, { fill: K, shade: 0 });
    for (let i = 0; i < 7; i++) k.circ(38 + i * 21, 102 + (i % 2) * 6, 7.5, { fill: K, ink: false, shade: 0 });
    k.box(100, 54, 8, 34, 2, { fill: "#9fd3ec", shade: 0 }); k.poly([[100, 18], [90, 32], [100, 40], [110, 32]], { fill: O, shade: 0, w: 2.4 });
    k.box(70, 66, 8, 22, 2, { fill: Y, shade: 0 }); k.box(130, 66, 8, 22, 2, { fill: G, shade: 0 });
    k.eyes(76, 124, 122, 11, "smug", { lid: "#fff0d6" }); k.smile(100, 134, 8, 3);
    k.box(172, 130, 34, 44, 2, { fill: M, shade: 3 }); textLines(k, 162, 118, 20, 4, 8); arm(k, [26, 118], [8, 126], [14, 146], 1.5);
};
const pot = (k, x, y, w, h, c = "#d98a57") => { k.poly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w * 0.38, y + h / 2], [x - w * 0.38, y + h / 2]], { fill: c, fill2: "#b1623a", round: 3, lit: true }); k.box(x, y - h / 2 + 2, w + 10, 16, 3, { fill: mix(c, "#ffffff", 0.14), shade: 2 }); };
ART.pottling = (k) => {
    legs(k, 82, 118, 162, 174);
    k.line(C([100, 86], [96, 56], [100, 40]), 5, { color: "#2c6d28" });
    k.ell(70, 48, 30, 15, { fill: G, rot: 0.5, shade: 4, lit: true }); k.ell(130, 44, 30, 15, { fill: "#4f9a58", rot: -0.5, shade: 4, lit: true });
    pot(k, 100, 122, 106, 84);
    k.eyes(82, 118, 124, 11, "big"); k.smile(100, 142, 8, 3);
};
ART.ficuspocus = (k) => {
    legs(k, 78, 124, 170, 180);
    k.line(C([100, 130], [92, 96], [100, 74]), 11, { color: INK }); k.line(C([100, 130], [92, 96], [100, 74]), 6, { color: BR });
    for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 16 + (i % 5) * 11; k.ell(100 + Math.cos(a) * r * 1.28, 62 + Math.sin(a) * r * 0.86, 15, 8, { fill: i % 2 ? G : "#3f9550", rot: a, shade: 2, w: 2.4 }); }
    k.poly([[100, -2], [138, 40], [62, 40]], { fill: P, fill2: "#5b3fb0", round: 3 }); k.ell(100, 42, 52, 9, { fill: "#6a4ad0", shade: 0 });
    k.poly([[96, 14], [100, 22], [108, 23], [102, 28], [104, 36], [96, 31], [89, 36], [91, 28], [85, 23], [93, 22]], { fill: Y, ink: false, shade: 0 });
    pot(k, 100, 148, 96, 58);
    k.eyes(84, 116, 148, 9.5, "smug", { lid: "#d98a57" });
    k.hose([54, 140], [24, 128], [30, 104], 5); k.glove(30, 100, -1.5); k.line([[30, 100], [12, 62]], 5); k.poly([[12, 40], [17, 54], [31, 58], [18, 63], [12, 78], [7, 63], [-6, 58], [7, 54]], { fill: Y, shade: 0, w: 2.2 });
};
ART.ergonomicorn = (k) => {
    for (const x of [64, 90, 130, 156]) { k.box(x, 156, 16, 56, 5, { fill: "#cfe0f0" }); k.box(x, 180, 18, 12, 3, { fill: "#39414f", shade: 0 }); }
    k.poly([[166, 96], [196, 110], [186, 144], [172, 118]], { fill: P, round: 4, shade: 3 });
    k.ell(112, 118, 66, 40, { fill: W, fill2: "#cfe0f0", lit: true });
    for (let i = 0; i < 5; i++) k.line(C([76 + i * 16, 84], [84 + i * 16, 118], [76 + i * 16, 152]), 2.4, { color: "#9fb4cc" });
    const n = C([74, 104], [48, 80], [60, 52]);
    k.line(n, 40, { color: INK }); k.line(n, 33, { color: W });
    k.poly([[62, 26], [24, 44], [18, 66], [50, 74], [84, 54]], { fill: W, fill2: "#e4eef8", round: 8, lit: true });
    for (let i = 0; i < 5; i++) k.ell(84 + i * 7, 32 + i * 14, 14, 9, { fill: [P, B, T, K, Y][i], rot: 0.8, shade: 2, w: 2.4 });
    k.poly([[50, 28], [44, -2], [66, 22]], { fill: Y, shade: 3 }); k.line([[46, 16], [60, 18]], 2);
    k._lidColor = W; k.eyes(54, 54, 48, 9, "smug"); k.circ(26, 62, 2.6, { fill: INK, ink: false, shade: 0 });
};
ART.binjamin = (k) => {
    legs(k, 78, 124, 164, 178);
    for (const [x, y, r] of [[62, 56, 26], [106, 44, 30], [146, 58, 24]]) k.circ(x, y, r, { fill: W, shade: 3 });
    k.line([[52, 50], [70, 62], [60, 70]], 2, { color: S }); k.line([[96, 34], [116, 48], [100, 58]], 2, { color: S }); k.box(84, 46, 30, 22, 2, { fill: "#ffe17a", rot: 0.4, shade: 2 });
    k.poly([[34, 72], [166, 72], [148, 172], [52, 172]], { fill: "#5b6478", fill2: "#39414f", round: 5, lit: true });
    for (let i = 0; i < 5; i++) k.line([[62 + i * 19, 96], [68 + i * 16, 162]], 3, { color: "#454e60" });
    k._lidColor = "#5b6478"; k.eyes(82, 122, 110, 12, "tired"); k.smile(102, 132, 10, 3);
};
ART.receiptile = (k) => {
    const body = [...C([30, 74], [130, 60], [150, 100]), ...C([150, 100], [158, 136], [70, 128]), ...C([70, 128], [26, 136], [60, 170]), ...C([60, 170], [120, 190], [180, 160])];
    k.line(body, 42, { color: INK, w2: 12 }); k.line(body, 34, { color: W, w2: 6 });
    for (let i = 2; i < body.length - 6; i += 3) { const [x, y] = body[i], [a, b] = body[i + 1]; const r = Math.atan2(b - y, a - x); k.line([[x - Math.sin(r) * 12, y + Math.cos(r) * 12], [x + Math.sin(r) * 12, y - Math.cos(r) * 12]], 2.4, { color: "#8a90a0" }); }
    k.ell(44, 72, 38, 30, { fill: W, fill2: "#e6e0d0", lit: true });
    k.eyes(36, 58, 62, 10, "smug", { lid: W }); k.line(C([14, 86], [40, 92], [64, 84]), 3); k.caps("$14.20", 44, 79, 1.5, R);
    k.line(C([14, 92], [2, 96], [0, 104]), 3, { color: R });
    for (const [x, y] of [[100, 44], [150, 76], [120, 150], [40, 116]]) k.hose([x, y + 16], [x - 6, y + 34], [x - 12, y + 40], 5);
};
ART.jamothy = (k) => {
    legs(k, 56, 146, 170, 182, BR);
    k.box(100, 44, 140, 32, 5, { fill: "#fbf6e8", shade: 3 }); textLines(k, 50, 36, 100, 3, 8);
    k.box(100, 112, 172, 116, 8, { fill: "#e0e1e4", fill2: "#b4b7be", lit: true });
    k.box(100, 64, 172, 22, 6, { fill: "#c8cad0", shade: 2 });
    k.box(62, 94, 74, 34, 4, { fill: "#143d3a", shade: 0 }); k.caps("TRAY 2", 62, 86, 2, "#7fe6d8"); k.caps("EMPTY", 62, 102, 2, "#7fe6d8");
    k._lidColor = "#e0e1e4"; k.eyes(126, 164, 96, 13, "angry");
    k.box(100, 140, 142, 12, 2, { fill: INK, shade: 0 });
    k.poly([[54, 142], [150, 142], [158, 178], [46, 178]], { fill: W, shade: 3, round: 2 }); k.box(100, 158, 44, 8, 2, { fill: "#ffc7d9", ink: false, shade: 0 });
    k.line(C([60, 146], [70, 160], [62, 174]), 2.6, { color: "#c6ccd6" });
};
ART.oldfaithful = (k) => {
    legs(k, 72, 136, 158, 176, "#2c2430");
    k.ell(150, 52, 24, 12, { ink: "#a06a44", w: 4.5 });
    k.box(108, 144, 148, 22, 8, { fill: "#c9a24a", fill2: "#8f6f2c", lit: true });
    k.poly([[26, 74], [168, 48], [186, 94], [186, 126], [46, 128]], { fill: "#7f8a9c", fill2: "#59627a", round: 7, lit: true });
    for (const [x, y] of [[50, 96], [76, 90], [168, 72], [172, 112]]) k.circ(x, y, 4, { fill: "#c9a24a", shade: 0, w: 2 });
    k.box(44, 124, 40, 10, 2, { fill: S, shade: 2 });
    k._lidColor = "#7f8a9c"; k.eyes(92, 132, 84, 12, "tired", { look: [-0.2, 0.05] }); k.smile(112, 104, 9, 3);
    k.caps("1961", 134, 142, 2.6, INK);
};
ART.thetemp = (k) => {
    k.sdf((x, y) => { const b = Math.hypot((x - 100) / 56, (y - 72) / 58) - 1, c = Math.max(Math.abs(x - 100) - 56 - (y - 72) * 0.08, 72 - y), wave = y - (176 + Math.sin(x * 0.2) * 10); return Math.max(Math.min(b * 56, c), wave); }, 30, 12, 170, 190, { fill: "#dde8ff", fill2: "#a9bbe8", lit: true });
    k.eyes(80, 120, 72, 12, "tired", { lid: "#dde8ff", look: [0, 0.2] }); k.line([[90, 100], [110, 100]], 3);
    k.line(C([66, 116], [88, 142], [100, 152]), 4, { color: R }); k.line(C([134, 116], [112, 142], [100, 152]), 4, { color: R });
    k.box(100, 164, 46, 32, 3, { fill: W, shade: 2 }); k.caps("TEMP", 100, 158, 2.3, R); k.line([[84, 172], [116, 172]], 2.4);
    k.caps("2003", 164, 28, 2.4, "#6b7588");
};
ART.outofoffice = (k) => {
    k.circ(150, 44, 34, { fill: Y, fill2: O, shade: 0 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; k.line([[150 + Math.cos(a) * 42, 44 + Math.sin(a) * 42], [150 + Math.cos(a) * 54, 44 + Math.sin(a) * 54]], 5, { color: O }); }
    k.line([[60, 110], [150, 186]], 8, { color: "#8a5a3a" }); k.line([[150, 110], [62, 186]], 8, { color: "#8a5a3a" });
    k.poly([[56, 92], [150, 120], [160, 158], [70, 136]], { fill: "#ff8f8f", round: 3, shade: 3 }); for (let i = 0; i < 3; i++) k.line([[78 + i * 24, 98 + i * 8], [90 + i * 24, 142 + i * 8]], 7, { color: W });
    k.box(90, 88, 106, 76, 7, { fill: W, fill2: "#dfe7f5", lit: true, rot: 0.06 });
    k.line([[38, 56], [92, 96], [146, 62]], 3);
    k.box(66, 78, 34, 22, 8, { fill: INK, shade: 0 }); k.box(112, 80, 34, 22, 8, { fill: INK, shade: 0 }); k.line([[82, 78], [96, 80]], 4); k.line([[58, 72], [66, 76]], 3, { color: "#6b7588" }); k.line([[104, 74], [112, 78]], 3, { color: "#6b7588" });
    k.smile(90, 104, 16, 5);
    arm(k, [136, 92], [168, 100], [174, 124], 1.4, 5); k.box(178, 136, 16, 26, 3, { fill: K, rot: 0.1, shade: 2 });
};
