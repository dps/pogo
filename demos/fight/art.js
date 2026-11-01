// Every fighter is a rubber-hose appliance: one painted sheet of enamel and chrome parts, with noodle limbs, white gloves
// and a face drawn live by the puppet. Sheets are painted once in code; there are no image files anywhere in the game.
import { Brush, INK, add, blend, box, cut, disc, hex, mix, oval, seg, taper } from "./paint.js";

const SHEET = 512;
export const U = 2.4;   // Sheet pixels per world unit.

/** Shelf packer: hands each part its rectangle on the sheet and records the pivot. */
class Sheet {
    constructor(p) { this.b = new Brush(p, U); this.x = 2; this.y = 2; this.row = 0; this.parts = {}; }
    part(name, w, h, ox, oy, paint) {
        const pw = Math.ceil(w * U), ph = Math.ceil(h * U);
        if (this.x + pw > SHEET - 2) { this.x = 2; this.y += this.row + 4; this.row = 0; }
        this.b.region(this.x, this.y, pw, ph, ox * U, oy * U);
        paint(this.b);
        this.parts[name] = { crop: [this.x, this.y, pw, ph], w, h, ox, oy };
        this.x += pw + 4; this.row = Math.max(this.row, ph);
    }
}

const STEEL = "#c9d6e0";

function bolt(b, x, y, r = 1.6) { b.chrome(disc(x, y, r), [x - r, y - r, x + r, y + r], { ink: 0.6 }); }
function dial(b, x, y, r, col = "#2c2233", tick = "#fff1d6", a = -0.8) {
    b.chrome(disc(x, y, r + 1.4), [x - r - 2, y - r - 2, x + r + 2, y + r + 2], { ink: 0.8, bevel: 3 });
    b.enamel(disc(x, y, r), [x - r, y - r, x + r, y + r], col, { ink: 0.7, bevel: 2.5 });
    b.flat(seg(x, y, x + Math.cos(a) * r * 0.82, y + Math.sin(a) * r * 0.82, 0.8), [x - r, y - r, x + r, y + r], tick);
}
function stripe(b, f, bounds, col, alpha = 1) { b.flat(f, bounds, col, alpha); }

const PAINTERS = {
    crumbs(sh, c) {
        sh.part("body", 100, 88, 50, 46, (b) => {
            const s = blend(5, box(0, 2, 86, 72, 17), box(0, 32, 92, 14, 6));
            const bb = [-48, -42, 48, 44];
            b.enamel(s, bb, ["#f4583c", "#c5301f"], { ink: 1.5, bevel: 9 });
            // Chrome skirt and belly band.
            b.chrome(box(0, 30, 90, 13, 6), [-46, 22, 46, 38], { ink: 1.2 });
            b.flat(box(0, -31, 56, 3, 1.5), [-30, -34, 30, -28], "#7c1b14", 0.55);
            b.flat(box(0, -24, 56, 2, 1), [-30, -26, 30, -22], "#ff9a6c", 0.5);
            b.flat(box(-36, 20, 3, 8, 1), bb, "#fff1d6", 0.8); b.flat(box(-30, 20, 3, 8, 1), bb, "#fff1d6", 0.8); b.flat(box(-24, 20, 3, 8, 1), bb, "#fff1d6", 0.8);
            dial(b, 31, 16, 5, "#2c2233", "#ffc23c");
            for (const x of [-38, 38]) bolt(b, x, 30);
        });
        sh.part("toast", 60, 50, 30, 42, (b) => {
            const s = blend(3, box(0, -14, 44, 36, 8), add(disc(-14, -30, 8), disc(14, -30, 8)));
            b.enamel(s, [-26, -40, 26, 6], ["#b7743a", "#8a5126"], { ink: 1.3, bevel: 3, spec: 0 });
            b.enamel(blend(3, box(0, -13, 36, 30, 6), add(disc(-11, -27, 6), disc(11, -27, 6))), [-22, -36, 22, 4], ["#f6d58a", "#ecba62"], { ink: 0, bevel: 5, spec: 0, band: 0.4 });
            for (const [x, y] of [[-8, -22], [6, -14], [-3, -8], [10, -25], [-12, -11]]) b.flat(disc(x, y, 1.1), [-22, -36, 22, 4], "#a86b32", 0.7);
        });
        sh.part("lever", 26, 40, 10, 32, (b) => {
            b.chrome(box(0, -10, 6, 40, 3), [-4, -32, 4, 10], { ink: 1 });
            b.enamel(box(2, -26, 18, 10, 4), [-8, -32, 12, -20], "#2c2233", { ink: 1, bevel: 3 });
        });
    },
    frappe(sh, c) {
        sh.part("body", 88, 112, 44, 56, (b) => {
            // Glass jar, with a smoothie sloshing inside it.
            const jar = taper(0, -50, 22, 66, 46, 8);
            b.flat(taper(0, -28, 20, 58, 44, 7), [-32, -32, 32, 22], "#f05f9b", 0.92);
            b.flat(taper(0, -28, -18, 57, 54, 3), [-32, -32, 32, -16], "#ff9fc4", 0.9);
            for (const [x, y, r] of [[-18, -4, 3], [12, 8, 2], [18, -14, 2.4], [-9, 12, 1.6], [4, -22, 1.8]]) b.flat(disc(x, y, r), [-32, -32, 32, 22], "#ffd6e6", 0.8);
            b.glass(jar, [-36, -52, 36, 24], "#d8f5fb", { alpha: 0.26 });
            b.chrome(box(30, -20, 6, 32, 3), [26, -38, 34, -2], { ink: 1 });
            b.flat(seg(36, -30, 40, -14, 2.6), [32, -34, 44, -10], "#2c2233", 0.0);
            // Base.
            const base = taper(0, 14, 54, 52, 78, 9);
            b.enamel(base, [-40, 12, 40, 54], ["#30d0e0", "#118da0"], { ink: 1.5, bevel: 7 });
            b.chrome(box(0, 17, 56, 7, 3), [-29, 12, 29, 22], { ink: 1 });
            dial(b, 0, 36, 8, "#f4f1e4", "#f05f9b", -1.2);
            for (const x of [-22, 22]) b.enamel(disc(x, 37, 3.2), [x - 4, 33, x + 4, 41], x < 0 ? "#ffc23c" : "#f05f9b", { ink: 0.8, bevel: 2 });
        });
        sh.part("lid", 76, 26, 38, 22, (b) => {
            b.enamel(add(box(0, -6, 68, 13, 6), box(0, -16, 20, 11, 4)), [-36, -22, 36, 2], ["#2fc6d6", "#128a9c"], { ink: 1.4, bevel: 5 });
        });
        sh.part("blade", 52, 14, 26, 7, (b) => {
            b.chrome(add(seg(-22, 3, 0, 0, 2), seg(0, 0, 22, -3, 2)), [-25, -6, 25, 6], { ink: 0.9, bevel: 2 });
            b.chrome(disc(0, 0, 4), [-5, -5, 5, 5], { ink: 0.8 });
        });
    },
    ristretto(sh, c) {
        sh.part("body", 96, 100, 48, 50, (b) => {
            const bb = [-46, -46, 46, 48];
            const shell = add(box(0, -18, 84, 54, 11), box(0, 41, 88, 12, 5));
            const notch = box(0, 24, 60, 34, 7);
            b.enamel(box(0, 8, 78, 80, 10), bb, ["#4a2e2a", "#2c1a1c"], { ink: 1.4, bevel: 4 });
            b.enamel(cut(shell, notch), bb, ["#bb7a48", "#8d5430"], { ink: 1.5, bevel: 8, spec: 0.9 });
            b.chrome(box(0, -44, 80, 6, 3), [-41, -48, 41, -40], { ink: 1 });
            b.chrome(box(0, 40, 86, 7, 3), [-44, 36, 44, 45], { ink: 1 });
            for (let i = -3; i <= 3; i++) b.flat(box(i * 11, 39.5, 6, 2, 1), [-40, 37, 40, 42], "#2c1a1c");
            // Group head and portafilter spout.
            b.chrome(box(0, 8, 28, 10, 3), [-15, 2, 15, 14], { ink: 1.1 });
            b.chrome(taper(0, 12, 22, 22, 10, 2), [-12, 11, 12, 23], { ink: 1 });
            b.enamel(box(-22, 13, 22, 6, 3), [-34, 9, -11, 17], "#2c2233", { ink: 1, bevel: 2 });
            // Tiny cup.
            b.enamel(taper(0, 26, 36, 17, 12, 3), [-10, 25, 10, 37], "#fff1d6", { ink: 1, bevel: 3, spec: 0.3 });
            b.flat(oval(0, 27, 7, 1.8), [-9, 24, 9, 30], "#3b2214");
            bolt(b, -36, 8); bolt(b, 36, 8);
            // Pressure gauge.
            b.chrome(disc(29, -32, 9), [18, -43, 40, -21], { ink: 1, bevel: 3 });
            b.enamel(disc(29, -32, 6.4), [21, -40, 37, -24], "#fff1d6", { ink: 0.8, bevel: 2, spec: 0.2 });
            b.flat(seg(29, -32, 33, -36, 0.7), [24, -38, 34, -30], "#c5301f");
        });
        sh.part("cups", 58, 28, 29, 26, (b) => {
            for (const [x, y] of [[-14, -6], [12, -6], [0, -16]]) { b.enamel(taper(x, y - 7, y + 6, 21, 14, 3), [x - 11, y - 8, x + 11, y + 7], "#fff1d6", { ink: 1, bevel: 4, spec: 0.3 }); }
            b.enamel(box(0, -1, 54, 5, 2), [-27, -4, 27, 2], "#ffe08a", { ink: 1, bevel: 2 });
        });
        sh.part("wand", 22, 44, 11, 4, (b) => {
            b.chrome(add(seg(0, 0, 3, 18, 2.2), seg(3, 18, -1, 36, 1.7)), [-6, -2, 8, 38], { ink: 0.9, bevel: 2 });
            b.enamel(disc(0, 0, 4.2), [-5, -5, 5, 5], "#2c2233", { ink: 0.9, bevel: 2 });
        });
    },
    whistle(sh, c) {
        sh.part("body", 118, 96, 52, 56, (b) => {
            const bb = [-48, -40, 68, 40];
            const belly = oval(0, 2, 45, 38);
            const spout = add(taper(47, -13, 19, 10, 28, 4));
            const spoutTilt = (x, y) => { const dx = x - 30, dy = y - 8, a = -0.78, ca = Math.cos(a), sa = Math.sin(a); return taper(0, -38, 16, 16, 36, 5)(dx * ca - dy * sa, dx * sa + dy * ca); };
            b.enamel(blend(5, belly, spoutTilt), bb, ["#9a86ec", "#5b49b8"], { ink: 1.6, bevel: 11, spec: 1 });
            b.flat(oval(0, 26, 40, 8), bb, "#ffcfe1", 0.0);
            b.chrome(oval(0, 36, 36, 5), [-37, 30, 37, 42], { ink: 1.1 });
            // Pearl collar.
            for (let i = -5; i <= 5; i++) { const x = i * 7.4, y = 27 - i * i * 0.26; b.enamel(disc(x, y, 3), [x - 3.2, y - 3.2, x + 3.2, y + 3.2], "#ffeaf2", { ink: 0.8, bevel: 3, spec: 1 }); }
            b.chrome(box(61, -32, 15, 8, 3), [52, -37, 70, -27], { ink: 1.1 });
        });
        sh.part("lid", 66, 56, 33, 44, (b) => {
            // Handle arch and lid together.
            b.enamel(cut(oval(0, -8, 30, 34), add(oval(0, -8, 23, 27), box(0, 16, 80, 34))), [-32, -44, 32, -6], ["#2c2233", "#191220"], { ink: 1.2, bevel: 3, spec: 1 });
            b.enamel(oval(0, -2, 22, 7), [-24, -9, 24, 6], ["#b6a6f6", "#7d6bd6"], { ink: 1.3, bevel: 3 });
            b.enamel(disc(0, -10, 4.6), [-5, -15, 5, -5], "#ffcfe1", { ink: 1, bevel: 3 });
        });
    },
    ding(sh, c) {
        sh.part("body", 120, 84, 60, 44, (b) => {
            const bb = [-58, -40, 58, 42];
            b.enamel(box(0, 0, 112, 76, 11), bb, ["#4cc07e", "#2a8150"], { ink: 1.6, bevel: 8 });
            // Cavity behind the door.
            b.enamel(box(-14, 0, 72, 58, 6), [-50, -30, 22, 30], ["#fff4c2", "#e7be6c"], { ink: 1.3, bevel: 3, spec: 0 });
            b.enamel(oval(-14, 22, 28, 5), [-44, 16, 16, 28], "#dfe9ee", { ink: 0.9, bevel: 2 });
            // Keypad.
            b.enamel(box(38, 0, 26, 60, 4), [24, -31, 52, 31], ["#2c2233", "#1b1420"], { ink: 1.1, bevel: 3 });
            b.flat(box(38, -21, 20, 10, 2), [27, -27, 49, -15], "#132c1f");
            b.flat(box(33, -21, 2, 6, 0.8), bb, "#73ffb0"); b.flat(box(38, -21, 2, 6, 0.8), bb, "#73ffb0"); b.flat(box(43, -21, 2, 6, 0.8), bb, "#73ffb0");
            for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) { const x = 31 + k * 7, y = -9 + r * 7; b.enamel(box(x, y, 5, 5, 1.2), [x - 3, y - 3, x + 3, y + 3], r === 2 && k === 2 ? "#ffd14a" : "#7fe0a8", { ink: 0.5, bevel: 1.4, spec: 0 }); }
            b.enamel(box(38, 22, 20, 7, 2), [27, 17, 49, 27], "#e8472e", { ink: 0.7, bevel: 2 });
            for (const x of [-50, 50]) bolt(b, x, 34, 1.5);
            b.chrome(box(0, 39, 92, 5, 2), [-46, 35, 46, 43], { ink: 1 });
        });
        sh.part("door", 78, 66, 4, 33, (b) => {
            const bb = [-2, -32, 76, 32];
            b.enamel(box(36, 0, 74, 62, 7), bb, ["#37a56b", "#247245"], { ink: 1.4, bevel: 5 });
            b.enamel(box(35, 0, 58, 46, 5), [5, -24, 65, 24], ["#ffe9a0", "#f4c95a"], { ink: 1.2, bevel: 3, spec: 0 });
            for (let i = 0; i < 9; i++) b.flat(seg(7 + i * 8, -22, 7 + i * 8, 22, 0.35), [6, -24, 66, 24], "#a58a3c", 0.32);
            for (let i = 0; i < 6; i++) b.flat(seg(7, -20 + i * 8, 64, -20 + i * 8, 0.35), [6, -24, 66, 24], "#a58a3c", 0.32);
            b.chrome(box(69, 0, 4.4, 42, 2), [65, -23, 73, 23], { ink: 0.9 });
        });
        sh.part("monocle", 34, 34, 17, 17, (b) => {
            b.chrome(cut(disc(0, 0, 14), disc(0, 0, 11)), [-15, -15, 15, 15], { ink: 0.8, bevel: 2 });
        });
    },
    chill(sh, c) {
        sh.part("body", 96, 118, 48, 60, (b) => {
            const bb = [-46, -58, 46, 56];
            b.enamel(box(0, 0, 88, 110, 22), bb, ["#2c4a63", "#1a2e42"], { ink: 1.6, bevel: 4 });
            b.enamel(box(0, 10, 70, 80, 6), [-36, -30, 36, 50], ["#eefaff", "#b7e3f2"], { ink: 1, bevel: 3, spec: 0 });
            for (const y of [-6, 16, 36]) b.chrome(box(0, y, 68, 2.4, 1), [-35, y - 3, 35, y + 3], { ink: 0.5, bevel: 1 });
            b.enamel(box(-16, 8, 14, 12, 3), [-23, 2, -9, 14], "#e8472e", { ink: 0.8, bevel: 2 });
            b.enamel(oval(14, 8, 8, 6), [6, 2, 22, 14], "#ffc23c", { ink: 0.8, bevel: 2 });
            b.enamel(oval(-8, 28, 12, 7), [-20, 21, 4, 35], "#7fe0a8", { ink: 0.8, bevel: 2 });
        });
        sh.part("door", 90, 118, 44, 59, (b) => {
            const bb = [-44, -58, 44, 56];
            const shell = box(0, 0, 86, 108, 22);
            b.enamel(shell, bb, ["#8fd2ee", "#4f9bc4"], { ink: 1.6, bevel: 12, spec: 1, fn: (x, y, c) => (y > -21 && y < -18.4 ? mix(c, hex(INK), 0.8) : c) });
            b.chrome(box(32, 2, 7, 34, 3.4), [27, -17, 37, 21], { ink: 1.1 });
            b.chrome(box(32, -35, 7, 18, 3.4), [27, -46, 37, -24], { ink: 1.1 });
            b.chrome(box(0, 50, 60, 5, 2), [-31, 46, 31, 54], { ink: 0.9 });
            // Fridge magnets, and frost in the corners.
            b.enamel(disc(-26, 34, 5), [-31, 29, -21, 39], "#e8472e", { ink: 0.8, bevel: 3 });
            b.enamel(box(-12, 37, 10, 8, 2), [-17, 33, -7, 41], "#ffc23c", { ink: 0.8, bevel: 2 });
            b.enamel(box(8, 35, 12, 9, 1), [2, 30, 14, 40], "#fff1d6", { ink: 0.8, bevel: 1, spec: 0 });
            b.flat(seg(4.5, 34, 11, 34, 0.5), [2, 30, 14, 40], "#2c2233");
            b.glow(-30, -44, 22, 16, "#ffffff", 0.75);
        });
        sh.part("crown", 62, 26, 31, 22, (b) => {
            for (const [x, h, w] of [[-20, 12, 12], [-6, 18, 13], [8, 15, 12], [21, 10, 11]]) b.enamel(taper(x, -h, 2, 2, w, 1.4), [x - w / 2, -h - 1, x + w / 2, 3], ["#ffffff", "#a8e0f4"], { ink: 1, bevel: 3 });
        });
    },
    knead(sh, c) {
        sh.part("body", 108, 118, 58, 62, (b) => {
            const bb = [-58, -60, 52, 56];
            // C-frame column and base.
            b.enamel(blend(6, box(-30, -8, 26, 86, 11), box(-4, 45, 88, 16, 7)), bb, ["#f5904c", "#c95a20"], { ink: 1.6, bevel: 8 });
            b.chrome(box(-4, 52, 90, 5, 2), [-50, 48, 42, 56], { ink: 1 });
            // Bowl.
            b.chrome(taper(10, 2, 38, 60, 40, 11), [-22, 0, 42, 40], { ink: 1.4, bevel: 7, sky: "#fff8ee" });
            b.enamel(box(10, 2, 62, 5, 2.4), [-22, -1, 42, 5], "#dfe9ee", { ink: 1.1, bevel: 2 });
            b.enamel(oval(10, 1, 26, 3), [-16, -3, 36, 5], "#f3dfae", { ink: 0, bevel: 2 });
            dial(b, -30, 22, 6, "#fff0cc", "#c5301f", -0.6);
        });
        sh.part("head", 96, 60, 30, 34, (b) => {
            const bb = [-30, -32, 66, 26];
            b.enamel(blend(9, box(16, -4, 88, 42, 19), disc(-10, -4, 19)), bb, ["#f8a05c", "#d4662a"], { ink: 1.6, bevel: 11, spec: 1 });
            b.chrome(box(14, -18, 74, 4, 2), [-24, -21, 52, -15], { ink: 0.7, bevel: 2 });
            b.chrome(box(14, 11, 80, 7, 3), [-26, 7, 56, 15], { ink: 1 });
            b.chrome(box(50, 18, 12, 8, 2.5), [43, 13, 57, 23], { ink: 0.9 });
        });
        sh.part("beater", 30, 46, 15, 4, (b) => {
            b.chrome(box(0, 2, 4, 14, 1), [-3, -4, 3, 10], { ink: 0.7, bevel: 1.5 });
            const f = cut(oval(0, 22, 11, 16), add(oval(-4, 22, 3, 12), oval(4, 22, 3, 12)));
            b.chrome(f, [-12, 5, 12, 39], { ink: 0.9, bevel: 2 });
        });
        sh.part("bow", 44, 26, 22, 13, (b) => {
            b.enamel(add(oval(-11, 0, 11, 8), oval(11, 0, 11, 8)), [-22, -9, 22, 9], ["#ffe08a", "#f4b52e"], { ink: 1.2, bevel: 3 });
            b.enamel(disc(0, 0, 3.6), [-4, -4, 4, 4], "#e8472e", { ink: 0.9, bevel: 2 });
        });
    },
    clamp(sh, c) {
        sh.part("body", 118, 56, 58, 26, (b) => {
            const bb = [-56, -24, 58, 28];
            b.enamel(box(0, 2, 106, 40, 13), bb, ["#7a3e22", "#55260f"], { ink: 1.6, bevel: 6 });
            b.enamel(box(0, -11, 96, 16, 5), [-48, -19, 48, -3], "#3a2118", { ink: 1, bevel: 2, spec: 0 });
            for (let i = -4; i <= 4; i++) b.flat(box(i * 10.2, -12, 7.6, 11, 1.4), [-48, -19, 48, -5], "#583124");
            b.flat(box(4, -13, 80, 8, 3), [-48, -19, 48, -5], "#f0bf5e", 0.65);
            b.chrome(box(0, 22, 92, 6, 2), [-46, 18, 46, 26], { ink: 1 });
            dial(b, 30, 12, 5, "#fff1d6", "#c5301f");
            b.enamel(box(-50, -1, 12, 16, 4), [-58, -10, -44, 8], "#2c2233", { ink: 1, bevel: 2 });
        });
        sh.part("top", 124, 62, 12, 50, (b) => {
            const bb = [-10, -48, 112, 10];
            b.enamel(blend(6, box(52, -20, 106, 46, 16), box(48, -3, 112, 13, 5)), bb, ["#ebbd60", "#b77f2c"], { ink: 1.6, bevel: 10, spec: 1 });
            b.chrome(box(50, 2, 106, 6, 2), [-4, -2, 104, 6], { ink: 1 });
            b.enamel(box(52, -38, 28, 7, 3), [38, -42, 66, -34], "#2c2233", { ink: 1, bevel: 2 });
        });
        sh.part("teeth", 104, 22, 4, 12, (b) => {
            b.enamel(box(48, 0, 98, 15, 4), [-3, -8, 100, 8], "#3a2118", { ink: 1, bevel: 2, spec: 0 });
            for (let i = 0; i < 9; i++) b.enamel(box(6 + i * 10.6, 1, 8, 12, 1.5), [0, -6, 100, 8], "#f6d58a", { ink: 0.7, bevel: 2, spec: 0 });
        });
    },
};

/** Paint a fighter's sheet and return its parts table. */
export function paintFighter(assets, f) {
    let parts = null;
    assets.paint(`f_${f.id}`, SHEET, SHEET, (p) => {
        const sh = new Sheet(p);
        PAINTERS[f.id](sh, f.color);
        parts = sh.parts;
    }, { smooth: true });
    return parts;
}

/** Gloves, shoes, plugs and all the flying things. Pivot at each part's centre. */
export function paintShared(assets) {
    let parts = null;
    assets.paint("shared", SHEET, SHEET, (p) => {
        const sh = new Sheet(p);
        sh.part("fist", 34, 34, 17, 17, (b) => {
            const bb = [-16, -16, 16, 16];
            b.enamel(blend(3, disc(-1, 1, 12.5), add(oval(9, -5, 6.4, 5), oval(10, 2, 6.4, 5), oval(8, 8, 5.6, 4.6))), bb, "#fbf6ea", { ink: 1.5, bevel: 6, spec: 0.4, shadow: "#c9c4d6" });
            b.flat(seg(4, -2, 12, -2, 0.7), bb, INK, 0.6); b.flat(seg(4, 5, 12, 5, 0.7), bb, INK, 0.6);
            b.enamel(oval(-3, -8, 7, 3.8), bb, "#fbf6ea", { ink: 1.1, bevel: 3, spec: 0, shadow: "#c9c4d6" });
            b.flat(box(-11, 1, 2, 11, 1), bb, INK, 0.5);
        });
        sh.part("open", 40, 34, 18, 17, (b) => {
            const bb = [-18, -17, 22, 17];
            const fingers = add(seg(4, -6, 18, -11, 3.1), seg(5, -1, 20, -3, 3.2), seg(5, 4, 19, 5, 3), seg(2, 7, 12, 13, 2.7));
            b.enamel(blend(2, oval(-3, 0, 11, 12), fingers), bb, "#fbf6ea", { ink: 1.5, bevel: 5, spec: 0.3, shadow: "#c9c4d6" });
            b.flat(box(-13, 0, 2, 11, 1), bb, INK, 0.5);
        });
        sh.part("shoe", 44, 26, 18, 18, (b) => {
            const bb = [-18, -18, 26, 7];
            const s = blend(4, oval(9, -3, 16, 9.6), box(-8, -5, 18, 16, 6));
            b.enamel(s, bb, ["#ffffff", "#cfc9d4"], { ink: 1.5, bevel: 6, spec: 1 });
            b.flat(box(4, 5, 42, 3.6, 1.8), bb, "#2c2233");
        });
        sh.part("plug", 22, 18, 7, 9, (b) => {
            b.chrome(add(box(10, -4, 9, 2.6, 0.7), box(10, 4, 9, 2.6, 0.7)), [4, -7, 16, 7], { ink: 0.6, bevel: 1 });
            b.enamel(box(0, 0, 13, 15, 4), [-7, -8, 7, 8], "#2c2233", { ink: 0.9, bevel: 3 });
        });
        // Projectiles.
        sh.part("toast", 38, 36, 19, 18, (b) => {
            const s = blend(3, box(0, 2, 28, 24, 5), add(disc(-9, -10, 6), disc(9, -10, 6)));
            b.enamel(s, [-17, -17, 17, 15], ["#b7743a", "#8a5126"], { ink: 1.3, bevel: 3, spec: 0 });
            b.enamel(blend(2, box(0, 2, 22, 18, 3), add(disc(-7, -8, 4), disc(7, -8, 4))), [-13, -13, 13, 12], ["#ffcf78", "#ff8a3c"], { ink: 0, bevel: 4, spec: 0, band: 0.5 });
        });
        sh.part("bean", 28, 20, 14, 10, (b) => {
            const bb = [-13, -9, 13, 9];
            b.enamel(oval(0, 0, 12, 7.6), bb, ["#7a4a28", "#4a2a15"], { ink: 1.2, bevel: 6, spec: 1 });
            b.flat((x, y) => Math.abs(y - Math.sin(x * 0.35) * 2.4) - 0.8, bb, "#2c170b", 1);
        });
        sh.part("puff", 54, 46, 27, 23, (b) => {
            const s = add(disc(-11, 5, 12), disc(10, 6, 13), disc(0, -7, 14), disc(14, -5, 8), disc(-15, -4, 7));
            b.enamel(s, [-25, -21, 25, 20], "#fdfdff", { ink: 0, bevel: 8, spec: 0, shadow: "#bcd2e6" });
        });
        sh.part("plate", 44, 22, 22, 11, (b) => {
            b.enamel(oval(0, 0, 20, 8), [-20, -8, 20, 8], ["#fffdf5", "#dfe7ec"], { ink: 1.2, bevel: 3, spec: 0.5 });
            b.flat(cut(oval(0, 0, 15, 5.6), oval(0, 0, 13.6, 4.6)), [-16, -6, 16, 6], "#e8472e", 0.8);
        });
        sh.part("mine", 44, 40, 22, 26, (b) => {
            const bb = [-20, -24, 20, 14];
            b.enamel(add(disc(-9, -12, 6), disc(1, -17, 6.6), disc(10, -12, 6), disc(-3, -9, 6), disc(6, -8, 5)), bb, "#fff6d8", { ink: 1, bevel: 5, spec: 0, shadow: "#f0c257" });
            b.enamel(taper(0, -8, 12, 28, 21, 2.6), bb, "#fff1d6", { ink: 1.3, bevel: 3, spec: 0, fn: (x, y, c) => (Math.abs(((x + 40) % 8) - 4) < 2 ? mix(c, [232, 71, 46], 0.9) : c) });
        });
        sh.part("ice", 38, 38, 19, 19, (b) => {
            b.enamel(box(0, 0, 30, 30, 5), [-16, -16, 16, 16], ["#f4fdff", "#8fd8f2"], { ink: 1.2, bevel: 7, spec: 1 });
            b.flat(seg(-6, -8, 2, 0, 1), [-14, -14, 14, 14], "#ffffff", 0.75);
        });
        sh.part("dough", 42, 38, 21, 19, (b) => {
            b.enamel(blend(4, oval(0, 2, 18, 15), disc(-8, -8, 7)), [-19, -16, 19, 18], ["#ffeec4", "#e6bb76"], { ink: 1.3, bevel: 9, spec: 0.3 });
        });
        sh.part("kernel", 20, 18, 10, 9, (b) => {
            b.enamel(add(disc(-3, -2, 4.4), disc(3, -3, 4), disc(0, 3, 4.4)), [-8, -7, 8, 8], "#fffbe6", { ink: 0.9, bevel: 3, spec: 0, shadow: "#f0c257" });
        });
        sh.part("star", 76, 76, 38, 38, (b) => {
            // Comic impact burst, drawn white so the hit colour can tint it.
            const f = (x, y) => { const a = Math.atan2(y, x), r = Math.hypot(x, y), k = 24 + 12 * Math.sin(a * 8) + 2.5 * Math.sin(a * 13 + 1); return r - k; };
            b.flat(f, [-38, -38, 38, 38], "#ffffff", 1);
        });
        parts = sh.parts;
    }, { smooth: true });
    return parts;
}
