// Notes, particles, icons and the goblins' band gear.
import { blob, ell, Ink, mixc, rgba, shift } from "./ink.js";

export const LANE = ["#ff5a4f", "#4fa8ff", "#c77dff", "#2fe0c8"];
const INK = "#1b1423";
export const P = { m0: 0, m1: 1, m2: 2, m3: 3, roll: 4, swipe: 5, ring: 6, star: 7, spark: 8, note: 9, tooth: 10, drop: 11, lock: 12, gear: 13, pause: 14, confetti: 15, burst: 16, hand: 17, bonk: 18, sound: 19, nosound: 20, buzz: 21, nobuzz: 22, back: 23 };
const FRAMES = 24, S = 128;

function mallet(g, c) {
    const lite = mixc(c, "#ffffff", 0.5), dark = mixc(c, "#000000", 0.4), m = g.toon(ell(64, 64, 50, 50), { fill: c, top: lite, dark, iw: 7, sx: 0.08, sy: 0.1 });
    // Felt mallet, seen head on: stitched band and a shine.
    g.stroke([[18, 76], [44, 88], [84, 88], [110, 76]], 7, dark, 7, m);
    for (let i = 0; i < 6; i++) { const x = 28 + i * 14.4; g.stroke([[x, 79 + Math.sin(i / 5 * 3.14) * 9], [x + 2, 91 + Math.sin(i / 5 * 3.14) * 9]], 3, lite, 3, m); }
    g.fill(ell(47, 42, 16, 11, -0.5), "#ffffffd0", m);
    g.fill(ell(78, 34, 5, 4), "#ffffff90", m);
}

const FN = [
    (g) => mallet(g, LANE[0]), (g) => mallet(g, LANE[1]), (g) => mallet(g, LANE[2]), (g) => mallet(g, LANE[3]),
    (g) => { // Roll: a spiked drum
        for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; g.toon([[64 + Math.cos(a - 0.2) * 40, 64 + Math.sin(a - 0.2) * 40], [64 + Math.cos(a) * 60, 64 + Math.sin(a) * 60], [64 + Math.cos(a + 0.2) * 40, 64 + Math.sin(a + 0.2) * 40]], { fill: "#ffc93c", iw: 4 }); }
        const m = g.toon(ell(64, 64, 42, 42), { fill: "#ff8a2a", top: "#ffe27a", dark: "#c0401a", iw: 6 });
        g.stroke([[38, 64], [50, 50], [60, 76], [72, 50], [90, 66]], 8, INK, 8, m);
    },
    (g) => { // Swipe: a flicking arrow
        const c = "#7dffb0", arrow = [[64, 8], [114, 62], [84, 62], [84, 116], [44, 116], [44, 62], [14, 62]];
        g.toon(arrow, { fill: c, top: "#e6fff0", dark: "#21a36a", iw: 7, sx: 0.07, sy: 0.02 });
        g.fill([[56, 26], [40, 48], [60, 48]], "#ffffffb0");
    },
    (g) => { g.stroke(ell(64, 64, 52, 52, 0, 60).concat([[116, 64]]), 8, "#ffffff"); },
    (g) => { const st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * 6.283, r = i % 2 ? 24 : 56; st.push([64 + Math.cos(a) * r, 66 + Math.sin(a) * r]); } g.toon(st, { fill: "#ffd94a", top: "#fff6b0", dark: "#f09a20", iw: 7 }); },
    (g) => { g.glow(64, 64, 62, "#ffffff", 2.4); g.fill([[64, 6], [70, 58], [122, 64], [70, 70], [64, 122], [58, 70], [6, 64], [58, 58]], "#ffffff"); },
    (g) => { g.toon(ell(46, 96, 24, 18, -0.3), { fill: "#fff7d6", dark: "#d8b48a", iw: 6 }); g.stroke([[66, 90], [68, 20]], 13, INK); g.stroke([[68, 20], [100, 34], [100, 54]], 16, INK); g.stroke([[66, 90], [68, 20]], 5, "#fff7d6"); g.stroke([[68, 20], [100, 34], [100, 50]], 7, "#fff7d6"); },
    (g) => { g.toon([[34, 30], [94, 30], [64, 110]], { fill: "#fffce0", dark: "#d8d090", iw: 7 }); },
    (g) => { g.toon(blob([[64, 10], [90, 66], [64, 112], [38, 66]], 8), { fill: "#8fdcff", top: "#e0f8ff", dark: "#3a9bd8", iw: 6 }); },
    (g) => { g.stroke([[40, 60], [40, 36], [64, 18], [88, 36], [88, 60]], 15, INK); g.stroke([[40, 60], [40, 36], [64, 18], [88, 36], [88, 60]], 7, "#aab4c8"); const b = [[24, 58], [104, 58], [104, 114], [24, 114]]; g.toon(b, { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 6, sy: 0.02 }); g.fill(ell(64, 82, 9, 9), INK); g.stroke([[64, 84], [64, 100]], 7, INK); },
    (g) => { for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; g.stroke([[64 + Math.cos(a) * 28, 64 + Math.sin(a) * 28], [64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50]], 24, INK); g.stroke([[64 + Math.cos(a) * 28, 64 + Math.sin(a) * 28], [64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48]], 13, "#fff7d6"); } g.toon(ell(64, 64, 36, 36), { fill: "#fff7d6", iw: 6 }); g.fill(ell(64, 64, 14, 14), INK); },
    (g) => { for (const x of [44, 84]) { g.stroke([[x, 28], [x, 100]], 30, INK); g.stroke([[x, 30], [x, 98]], 16, "#fff7d6"); } },
    (g) => { g.fill([[10, 10], [118, 10], [118, 118], [10, 118]], "#ffffff"); },
    (g) => { const st = []; for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283, r = i % 2 ? 40 : 62; st.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); } g.toon(st, { fill: "#ffffff", ink: null, iw: 0 }); },
    (g) => { // A big pointing goblin hand
        const skin = "#8fd13f", top = "#d3f27a", dark = "#4d8f2c";
        g.toon(blob([[64, 10], [80, 24], [80, 60], [106, 66], [112, 96], [92, 122], [50, 122], [28, 94], [22, 70], [40, 64], [48, 64], [48, 24]], 8), { fill: skin, top, dark, iw: 7 });
        g.fill(ell(64, 22, 10, 7), "#fffce0");
    },
    (g) => { const st = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 34 : 62; st.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.9]); } g.toon(st, { fill: "#ffffff", top: "#ffffff", dark: "#d8d8e8", iw: 7 }); },
    (g) => speaker(g, true), (g) => speaker(g, false),
    (g) => wave(g, true), (g) => wave(g, false),
    (g) => { g.stroke([[84, 24], [42, 64], [84, 104]], 30, INK); g.stroke([[84, 24], [42, 64], [84, 104]], 16, "#fff7d6"); },
];
function speaker(g, on) {
    const shape = [[16, 48], [40, 48], [72, 20], [72, 108], [40, 80], [16, 80]];
    g.toon(shape, { fill: "#fff7d6", dark: "#d8b48a", iw: 7 });
    if (on) { g.stroke([[86, 46], [96, 64], [86, 82]], 15, INK); g.stroke([[86, 46], [96, 64], [86, 82]], 7, "#fff7d6"); g.stroke([[100, 30], [118, 64], [100, 98]], 15, INK); g.stroke([[100, 30], [118, 64], [100, 98]], 7, "#fff7d6"); }
    else { g.stroke([[84, 44], [118, 84]], 16, INK); g.stroke([[118, 44], [84, 84]], 16, INK); g.stroke([[84, 44], [118, 84]], 8, "#ff5a4f"); g.stroke([[118, 44], [84, 84]], 8, "#ff5a4f"); }
}
function wave(g, on) {
    g.toon([[40, 24], [88, 24], [88, 104], [40, 104]], { fill: "#fff7d6", dark: "#d8b48a", iw: 7 });
    if (on) for (const s of [-1, 1]) { const x = 64 + s * 44; const pts = [[x, 34], [x + s * 10, 48], [x - s * 6, 64], [x + s * 10, 80], [x, 94]]; g.stroke(pts, 13, INK); g.stroke(pts, 6, "#fff7d6"); }
    else { g.stroke([[20, 20], [108, 108]], 16, INK); g.stroke([[20, 20], [108, 108]], 8, "#ff5a4f"); }
}

// Instruments for the marchers in the back row. Frame order matches the band from Bogsy on.
const GEAR = [
    (g) => { // Tuba
        g.toon(ell(64, 76, 40, 34), { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 6 });
        g.toon(blob([[40, 60], [36, 20], [82, 8], [110, 16], [106, 40], [80, 44], [66, 60]], 6), { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 6 });
        g.toon(ell(96, 28, 24, 18, 0.2), { fill: "#a4641c", top: "#4a2c10", iw: 6 });
    },
    (g) => { // Trumpet
        g.stroke([[12, 56], [80, 56]], 18, INK); g.stroke([[12, 56], [80, 56]], 9, "#ffc93c");
        g.toon([[78, 52], [116, 26], [116, 86], [78, 60]], { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 5, sy: 0 });
        g.toon(blob([[30, 56], [30, 84], [70, 84], [70, 56]], 6), { fill: "#ffc93c", dark: "#c07a1c", iw: 5 });
    },
    (g) => { // Accordion
        g.toon([[8, 30], [34, 30], [34, 104], [8, 104]], { fill: "#d0304a", dark: "#8d1c3a", iw: 5, sy: 0 });
        g.toon([[94, 30], [120, 30], [120, 104], [94, 104]], { fill: "#d0304a", dark: "#8d1c3a", iw: 5, sy: 0 });
        for (let i = 0; i < 6; i++) { const x = 36 + i * 10; g.toon([[x, 34], [x + 9, 34], [x + 9, 100], [x, 100]], { fill: i % 2 ? "#fff7d6" : "#d8b48a", iw: 3, sy: 0 }); }
    },
    (g) => { // Cowbell on a stick
        g.stroke([[64, 124], [64, 88]], 12, INK); g.stroke([[64, 124], [64, 88]], 6, "#a4641c");
        g.toon([[40, 12], [88, 12], [106, 90], [22, 90]], { fill: "#aab4c8", top: "#ffffff", dark: "#5a6280", iw: 6, sx: 0.1, sy: 0 });
    },
    (g) => { // Cymbals
        for (const y of [38, 86]) { g.toon(ell(64, y, 54, 16), { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 6 }); g.fill(ell(64, y - 2, 10, 4), "#c07a1c"); }
    },
    (g) => { // Gong
        g.stroke([[10, 124], [10, 6], [118, 6], [118, 124]], 15, INK); g.stroke([[10, 124], [10, 6], [118, 6], [118, 124]], 7, "#a4641c");
        const m = g.toon(ell(64, 70, 44, 44), { fill: "#ffc93c", top: "#fff4b0", dark: "#c07a1c", iw: 6 });
        for (const r of [14, 28]) g.stroke(ell(64, 70, r, r, 0, 30).concat([[64 + r, 70]]), 4, "#c07a1c", 4, m);
    },
];

export function paintProps(game) {
    game.assets.paint("props", S, S, (p, f) => { const g = new Ink(p, f, FRAMES); FN[f]?.(g); }, { frames: FRAMES, smooth: true, mipmaps: true });
    game.assets.paint("gear", S, S, (p, f) => { const g = new Ink(p, f, GEAR.length); GEAR[f](g); }, { frames: GEAR.length, smooth: true, mipmaps: true });
    // A big bass drum for the title screen.
    game.assets.paint("bassdrum", 300, 300, (p) => {
        const g = new Ink(p);
        g.fill(ell(150, 150, 146, 146), INK);
        g.fill(ell(150, 150, 138, 138), "#d9344a");
        g.toon(ell(150, 150, 122, 122), { fill: "#fff0cf", top: "#ffffff", dark: "#d8b48a", iw: 6, sx: 0.05, sy: 0.07 });
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.toon(ell(150 + Math.cos(a) * 131, 150 + Math.sin(a) * 131, 8, 8, 0, 16), { fill: "#ffc93c", dark: "#c07a1c", iw: 3 }); }
    }, { smooth: true });
}
