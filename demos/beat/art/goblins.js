// The band. Each goblin is a sheet of parts, and shared sheets hold eyes and mouths, so every face can react to everything.
import { blob, ell, flipX, grow, Ink, mixc, hex, rgba, shift } from "./ink.js";

const INK = "#1b1423";

export const GOBLINS = [
    { id: "grub", name: "Grubnik", plays: "Bass Drum", skin: "#8fd13f", top: "#d3f27a", dark: "#4d8f2c", coat: "#d9344a", coatD: "#8d1c3a", trim: "#ffc93c", shape: "round", hat: "shako", nose: "bulb", ear: "long" },
    { id: "snot", name: "Snotlet", plays: "Snare", skin: "#39c6a8", top: "#a8f0d0", dark: "#1a7d78", coat: "#3257d6", coatD: "#1e2f8e", trim: "#ffe27a", shape: "egg", hat: "bucket", nose: "snub", ear: "short" },
    { id: "bogsy", name: "Bogsy", plays: "Tuba", skin: "#e2a03c", top: "#fbdc8a", dark: "#9a5522", coat: "#7d3ccf", coatD: "#4a2090", trim: "#7dffb0", shape: "pear", hat: "tuft", nose: "hook", ear: "droop" },
    { id: "wick", name: "Wick", plays: "Trumpet", skin: "#b67be8", top: "#e6c8ff", dark: "#6a3bab", coat: "#0fa89a", coatD: "#0a6470", trim: "#ffb347", shape: "bean", hat: "candle", nose: "long", ear: "long" },
    { id: "mumble", name: "Mumble", plays: "Accordion", skin: "#ee7a94", top: "#ffc0c8", dark: "#a83a68", coat: "#2d9b4e", coatD: "#16633a", trim: "#fff0a0", shape: "round", hat: "fez", nose: "snub", ear: "droop" },
    { id: "rattle", name: "Rattle", plays: "Cowbell", skin: "#7ba6ea", top: "#c5dcff", dark: "#3b5cae", coat: "#e88a1e", coatD: "#a4501a", trim: "#fff", shape: "egg", hat: "tophat", nose: "long", ear: "short" },
    { id: "fizz", name: "Fizz", plays: "Cymbals", skin: "#ecd23e", top: "#fff4a0", dark: "#a88a1c", coat: "#e0348c", coatD: "#8e1a60", trim: "#7df0ff", shape: "bean", hat: "spikes", nose: "hook", ear: "long" },
    { id: "gronk", name: "Gronk", plays: "Gong", skin: "#5fa35a", top: "#a3d48a", dark: "#2d6a44", coat: "#5c4a3a", coatD: "#37281f", trim: "#ffc93c", shape: "pear", hat: "horns", nose: "bulb", ear: "short" },
];

const PATH = {
    round: () => blob([[128, 42], [190, 58], [226, 118], [206, 188], [128, 222], [50, 188], [30, 118], [66, 58]]),
    egg: () => blob([[128, 26], [178, 52], [204, 118], [190, 186], [128, 226], [66, 186], [52, 118], [78, 52]]),
    pear: () => blob([[128, 48], [170, 60], [206, 118], [236, 174], [186, 224], [128, 230], [70, 224], [20, 174], [50, 118], [86, 60]]),
    bean: () => blob([[128, 38], [196, 50], [228, 104], [206, 150], [204, 196], [128, 224], [52, 196], [50, 150], [28, 104], [60, 50]]),
};

function paintHead(g, s) {
    const pts = PATH[s.shape]();
    const m = g.toon(pts, { fill: s.skin, top: s.top, dark: s.dark, lite: mixc(s.top, "#ffffff", 0.5), iw: 7, sx: 0.06, sy: 0.08, lx: 0.025, ly: 0.03 });
    // Blush, warts and blotches, all clipped to the head.
    g.fill(ell(62, 158, 24, 16), [...rgba(s.dark).slice(0, 3), 0.35], m);
    g.fill(ell(194, 158, 24, 16), [...rgba(s.dark).slice(0, 3), 0.35], m);
    for (const [x, y, r] of [[92, 62, 7], [168, 70, 5], [204, 132, 6], [52, 118, 4], [118, 46, 4]]) {
        g.fill(ell(x, y, r, r * 0.8), [...rgba(s.dark).slice(0, 3), 0.55], m);
    }
    g.toon(ell(182, 196, 9, 8), { fill: s.top, dark: s.dark, iw: 3 });
    g.fill(ell(179, 193, 3, 2), "#ffffffb0");
    g.fill(ell(90, 64, 28, 12, -0.3), "#ffffff30", m);
    // Heavy brow, so faces read at a distance.
    g.stroke([[50, 92], [86, 74], [120, 84]], 11, s.dark, 7, m);
    g.stroke([[206, 92], [170, 74], [136, 84]], 11, s.dark, 7, m);
    // Nose, in front of everything.
    const nose = {
        bulb: () => blob([[128, 112], [146, 132], [150, 152], [128, 162], [106, 152], [110, 132]], 8),
        snub: () => blob([[128, 122], [142, 138], [128, 152], [114, 138]], 8),
        hook: () => blob([[120, 108], [148, 126], [166, 154], [150, 160], [126, 148], [108, 130]], 8),
        long: () => blob([[120, 106], [142, 124], [182, 148], [186, 158], [148, 154], [114, 136]], 8),
    }[s.nose]();
    g.toon(nose, { fill: s.skin, top: s.top, dark: s.dark, iw: 4 });
    g.fill(ell(121, 130, 6, 4, -0.4), "#ffffff70");
}

function paintEar(g, s) {
    // Pivot at the left middle; the ear points right and flops.
    const pts = { long: [[10, 110], [90, 76], [170, 74], [244, 42], [196, 112], [120, 152], [30, 158]], short: [[10, 104], [80, 72], [150, 76], [188, 60], [176, 118], [100, 158], [26, 160]], droop: [[10, 100], [90, 90], [170, 118], [234, 196], [160, 186], [90, 176], [24, 158]] }[s.ear];
    const b = blob(pts, 10), m = g.toon(b, { fill: s.skin, top: s.top, dark: s.dark, iw: 7, sx: 0.03, sy: 0.08 });
    g.fill(shift(b, -8, 2, 0.62), mixc(s.dark, "#c0506a", 0.4), m);
    g.fill(ell(150, 100, 7, 4), [...rgba(s.dark).slice(0, 3), 0.6], m);
    if (s.ear === "long") { g.stroke(ell(60, 156, 15, 15, 0, 28).concat([[75, 156]]), 6, INK); g.stroke(ell(60, 156, 15, 15, 0, 28).concat([[75, 156]]), 3, "#ffd34a"); }
}

function paintHat(g, s) {
    const c = s.coat, d = s.coatD, t = s.trim;
    switch (s.hat) {
        case "shako": {
            g.stroke([[148, 26], [176, 8], [206, 14]], 26, t, 10);
            g.toon(blob([[128, 8], [160, 12], [168, 40], [150, 72], [130, 74], [120, 44]], 8), { fill: "#fff7d6", top: "#ffffff", dark: "#d8b48a", iw: 5, sx: 0.1, sy: 0.1 });
            g.toon([[66, 74], [190, 74], [204, 196], [52, 196]], { fill: c, top: mixc(c, "#ffffff", 0.2), dark: d, iw: 7, sx: 0.08, sy: 0 });
            g.toon(ell(128, 192, 96, 20), { fill: "#2a2438", top: "#4a4060", iw: 7 });
            g.toon(blob([[128, 92], [158, 118], [128, 160], [98, 118]], 6), { fill: t, top: "#fff4b0", dark: mixc(t, "#a04010", 0.5), iw: 4 });
            g.stroke([[62, 176], [194, 176]], 10, t);
            break;
        }
        case "bucket": {
            g.stroke(ell(128, 90, 92, 90, 0, 48).slice(26, 47), 6, INK);
            g.toon([[66, 60], [190, 60], [212, 190], [44, 190]], { fill: "#aab4c8", top: "#e6edf5", dark: "#6a7288", iw: 7, sx: 0.09, sy: 0 });
            g.toon(ell(128, 188, 90, 16), { fill: "#7a8298", top: "#c8d0dc", iw: 6 });
            g.toon(ell(128, 60, 62, 12), { fill: "#8a92a4", top: "#2a2438", iw: 6 });
            for (const [x, y] of [[88, 118], [168, 140], [120, 160]]) { g.fill(ell(x, y, 11, 6, 0.4), "#6a728880"); g.fill(ell(x - 2, y - 2, 8, 3, 0.4), "#ffffff50"); }
            g.stroke([[72, 150], [186, 138]], 7, c);
            break;
        }
        case "tuft": {
            for (const [a, b2, c2] of [[[118, 200], [92, 118], [48, 92]], [[128, 200], [128, 96], [114, 46]], [[140, 200], [168, 112], [204, 76]], [[108, 200], [78, 140], [32, 138]], [[150, 200], [190, 144], [226, 130]]]) {
                g.stroke([a, b2, c2], 26, INK, 10);
                g.stroke([a, b2, c2], 16, s.trim, 4);
            }
            break;
        }
        case "candle": {
            g.toon(ell(128, 196, 68, 18), { fill: "#d0d8e0", top: "#ffffff", dark: "#8a92a4", iw: 6 });
            g.toon([[96, 92], [160, 92], [164, 196], [92, 196]], { fill: "#fff0cc", top: "#ffffff", dark: "#d8b48a", iw: 6, sx: 0.12, sy: 0 });
            g.toon(blob([[96, 92], [112, 100], [120, 134], [130, 104], [160, 94], [160, 88], [96, 86]], 6), { fill: "#ffffff", dark: "#e0d0b0", iw: null, ink: null });
            g.glow(128, 44, 56, "#ffb34780", 1.4);
            g.toon(blob([[128, 12], [150, 52], [128, 84], [106, 52]], 8), { fill: "#ff8a2a", top: "#ffe36a", dark: "#e0401a", iw: 4 });
            g.fill(blob([[128, 42], [138, 62], [128, 78], [118, 62]], 6), "#fff6c0");
            break;
        }
        case "fez": {
            g.stroke([[128, 66], [176, 60], [196, 110]], 7, INK);
            g.stroke([[128, 66], [176, 60], [196, 110]], 3.5, s.trim);
            g.toon(blob([[196, 106], [208, 136], [186, 136]], 6), { fill: s.trim, iw: 4 });
            g.toon([[82, 66], [174, 66], [192, 192], [64, 192]], { fill: "#d0304a", top: "#f06a70", dark: "#8d1c3a", iw: 7, sx: 0.09, sy: 0 });
            g.toon(ell(128, 66, 46, 10), { fill: "#e05060", dark: "#8d1c3a", iw: 6 });
            break;
        }
        case "tophat": {
            g.toon(ell(128, 194, 112, 20), { fill: "#2a2438", top: "#544868", iw: 7 });
            g.toon([[70, 24], [186, 24], [176, 192], [80, 192]], { fill: "#2a2438", top: "#544868", dark: "#171220", iw: 7, sx: 0.08, sy: 0 });
            g.toon(ell(128, 24, 58, 10), { fill: "#3a3248", iw: 6 });
            g.fill([[78, 150], [178, 150], [176, 186], [80, 186]], c);
            g.fill([[78, 150], [178, 150], [178, 158], [78, 158]], "#ffffff50");
            break;
        }
        case "spikes": {
            for (let i = 0; i < 7; i++) {
                const a = -Math.PI / 2 + (i - 3) * 0.42, r = 96 + (i % 2) * 34;
                const tip = [128 + Math.cos(a) * r * 1.1, 204 + Math.sin(a) * r * 1.6], l = [128 + Math.cos(a - 0.42) * 60, 204 + Math.sin(a - 0.42) * 50], rr = [128 + Math.cos(a + 0.42) * 60, 204 + Math.sin(a + 0.42) * 50];
                g.toon([l, tip, rr], { fill: s.trim, top: "#ffffff", dark: mixc(s.trim, "#104060", 0.5), iw: 6, sx: 0.1, sy: 0 });
            }
            break;
        }
        case "horns": {
            for (const flip of [0, 1]) {
                const h = blob([[70, 190], [30, 150], [20, 80], [10, 40], [52, 80], [80, 120], [104, 170]], 8);
                g.toon(flip ? flipX(h, 256) : h, { fill: "#f0e0c0", top: "#ffffff", dark: "#a88a60", iw: 6 });
            }
            g.toon(blob([[128, 92], [190, 112], [216, 192], [128, 204], [40, 192], [66, 112]], 8), { fill: "#8a92a4", top: "#d0d8e0", dark: "#4a5068", iw: 7 });
            g.stroke([[46, 180], [210, 180]], 12, s.trim);
            break;
        }
    }
}

function paintBody(g, s) {
    // Shoulders in band uniform, seen from the front. The head sits on the collar at about y 40.
    const b = blob([[128, 30], [190, 40], [240, 96], [250, 256], [6, 256], [16, 96], [66, 40]], 10);
    const m = g.toon(b, { fill: s.coat, top: mixc(s.coat, "#ffffff", 0.2), dark: s.coatD, iw: 7, sx: 0.06, sy: 0.04 });
    for (const x of [46, 210]) { g.toon(blob([[x - 34, 74], [x, 56], [x + 34, 74], [x + 26, 100], [x - 26, 100]], 6), { fill: s.trim, top: "#ffffff", dark: mixc(s.trim, "#a04010", 0.5), iw: 4 }); for (let i = -2; i <= 2; i++) g.stroke([[x + i * 12, 98], [x + i * 13, 118]], 6, s.trim); }
    g.fill([[116, 44], [140, 44], [150, 256], [106, 256]], mixc(s.coat, "#ffffff", 0.1), m);
    for (let i = 0; i < 4; i++) { const y = 84 + i * 44; g.stroke([[80, y], [176, y]], 9, s.trim); g.toon(ell(128, y, 8, 8), { fill: "#fff4b0", dark: s.trim, iw: 3 }); }
    g.toon(blob([[80, 36], [128, 50], [176, 36], [172, 62], [128, 76], [84, 62]], 8), { fill: "#fff7d6", dark: "#d8b48a", iw: 5 });
}

const EYE_FRAMES = 8, MOUTH_FRAMES = 7;
export const EYE = { open: 0, blink: 1, happy: 2, cross: 3, star: 4, sad: 5, angry: 6, shades: 7 };
export const MOUTH = { smile: 0, grin: 1, oh: 2, wince: 3, frown: 4, tongue: 5, yell: 6 };

function paintEyes(g, f) {
    const each = (fn) => { fn(52, 1); fn(148, -1); };
    const Y = 60;
    switch (f) {
        case 0:
            each((x) => { g.toon(ell(x, Y, 40, 46), { fill: "#fffce0", top: "#ffffff", dark: "#d8d090", iw: 6, sx: 0.08, sy: 0.1 }); });
            break;
        case 1:
            each((x, s) => { g.stroke([[x - 36, Y + 4], [x, Y + 12], [x + 36, Y + 4]], 12, INK); });
            break;
        case 2:
            each((x) => { g.stroke([[x - 38, Y + 16], [x - 20, Y - 12], [x, Y - 22], [x + 20, Y - 12], [x + 38, Y + 16]], 14, INK); });
            break;
        case 3:
            each((x) => { g.stroke([[x - 30, Y - 30], [x + 30, Y + 30]], 15, INK); g.stroke([[x + 30, Y - 30], [x - 30, Y + 30]], 15, INK); });
            break;
        case 4:
            each((x) => {
                const st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 19 : 46; st.push([x + Math.cos(a) * r, Y + Math.sin(a) * r]); }
                g.toon(st, { fill: "#ffd94a", top: "#fff6b0", dark: "#f09a20", iw: 5 });
            });
            break;
        case 5:
            each((x, s) => {
                g.toon(ell(x, Y + 6, 36, 38), { fill: "#fffce0", dark: "#d8d090", iw: 6 });
                g.fill(ell(x, Y + 18, 15, 19), INK);
                g.fill(ell(x - 5, Y + 11, 5, 5), "#fff");
                g.stroke([[x - 40 * s, Y - 18], [x + 34 * s, Y - 40]], 13, INK);
            });
            break;
        case 6:
            each((x, s) => {
                g.toon(ell(x, Y + 8, 36, 34), { fill: "#fff0a0", dark: "#e0b040", iw: 6 });
                g.fill(ell(x + 6 * s, Y + 12, 15, 17), INK);
                g.fill(ell(x + 2 * s, Y + 5, 5, 5), "#fff");
                g.stroke([[x - 44 * s, Y - 34], [x + 40 * s, Y - 4]], 16, INK);
            });
            break;
        case 7: {
            g.stroke([[10, 40], [190, 40]], 16, INK);
            each((x) => {
                const lens = blob([[x - 44, 34], [x + 44, 34], [x + 40, 84], [x, 98], [x - 40, 84]], 8);
                g.toon(lens, { fill: "#1e1a30", top: "#4a3a70", iw: 6 });
                g.stroke([[x - 26, 74], [x + 2, 46]], 11, "#ff5fb8a0");
                g.stroke([[x - 6, 80], [x + 20, 54]], 6, "#6ae8ff90");
            });
            break;
        }
    }
}

function paintMouth(g, f) {
    const C = 100;
    switch (f) {
        case 0: {
            const p = blob([[20, 34], [100, 56], [180, 34], [160, 84], [100, 100], [40, 84]], 8);
            const m = g.toon(p, { fill: "#4a1030", iw: 7 });
            g.fill([[56, 40], [76, 46], [66, 76]], "#fffce0", m);
            g.fill([[132, 46], [152, 40], [142, 76]], "#fffce0", m);
            break;
        }
        case 1: {
            const p = blob([[14, 18], [100, 26], [186, 18], [172, 90], [100, 122], [28, 90]], 8);
            const m = g.toon(p, { fill: "#4a1030", iw: 7 });
            g.fill(ell(100, 118, 58, 34), "#e0506a", m);
            for (let i = 0; i < 6; i++) { const x = 24 + i * 28.5; g.fill([[x, 16], [x + 26, 16], [x + 13, 50]], "#fffce0", m); }
            break;
        }
        case 2: {
            const m = g.toon(ell(C, 70, 42, 50), { fill: "#4a1030", iw: 7 });
            g.fill(ell(C, 110, 32, 26), "#e0506a", m);
            g.fill([[66, 20], [88, 20], [77, 46]], "#fffce0", m);
            g.fill([[112, 20], [134, 20], [123, 46]], "#fffce0", m);
            break;
        }
        case 3: {
            const p = blob([[16, 44], [100, 34], [184, 44], [176, 92], [100, 98], [24, 92]], 8);
            const m = g.toon(p, { fill: "#fffce0", iw: 7 });
            for (let i = 1; i < 7; i++) g.stroke([[16 + i * 24, 34], [16 + i * 24, 100]], 5, INK, 5, m);
            g.stroke([[10, 68], [190, 68]], 5, INK, 5, m);
            break;
        }
        case 4: {
            g.stroke([[24, 84], [58, 62], [100, 52], [142, 62], [176, 84]], 15, INK);
            g.fill([[120, 58], [140, 62], [126, 26]], "#fffce0"); g.stroke([[120, 58], [126, 26], [140, 62]], 5, INK);
            break;
        }
        case 5: {
            const p = blob([[24, 30], [100, 44], [176, 30], [156, 74], [100, 86], [44, 74]], 8);
            g.toon(p, { fill: "#4a1030", iw: 7 });
            g.toon(blob([[66, 60], [134, 60], [142, 116], [100, 136], [58, 116]], 8), { fill: "#f0608a", top: "#ff90b0", dark: "#b02a60", iw: 6 });
            g.stroke([[100, 66], [100, 116]], 5, "#b02a60");
            break;
        }
        case 6: {
            const p = blob([[10, 6], [100, 12], [190, 6], [168, 106], [100, 136], [32, 106]], 8);
            const m = g.toon(p, { fill: "#4a1030", iw: 7 });
            g.fill(ell(100, 126, 60, 36), "#e0506a", m);
            for (let i = 0; i < 7; i++) { const x = 14 + i * 25; g.fill([[x, 4], [x + 23, 4], [x + 11, 40]], "#fffce0", m); }
            break;
        }
    }
}

export function paintGoblins(game) {
    for (const s of GOBLINS) {
        game.assets.paint(`gob_${s.id}`, 256, 256, (p, f) => {
            const g = new Ink(p, f, 4);
            [paintHead, paintEar, paintHat, paintBody][f](g, s);
        }, { frames: 4, smooth: true, mipmaps: true });
    }
    game.assets.paint("eyes", 200, 120, (p, f) => paintEyes(new Ink(p, f, EYE_FRAMES), f), { frames: EYE_FRAMES, smooth: true, mipmaps: true });
    game.assets.paint("mouths", 200, 140, (p, f) => paintMouth(new Ink(p, f, MOUTH_FRAMES), f), { frames: MOUTH_FRAMES, smooth: true, mipmaps: true });
    // Boots and marching legs.
    game.assets.paint("boot", 96, 64, (p) => {
        const g = new Ink(p);
        g.toon(blob([[14, 18], [50, 12], [58, 32], [88, 40], [86, 56], [14, 56]], 8), { fill: "#3a2a3e", top: "#6a5070", dark: "#1f1626", iw: 4 });
        g.stroke([[18, 48], [84, 48]], 7, "#ffc93c");
    }, { smooth: true });
}

/**
 * Draw one goblin at x,y (head centre) with a pose. size is the head's width on screen.
 * pose: squash (-1..1), tilt, ear (flop), eye, mouth, look [x,y], fever, body, sway
 */
export function drawGoblin(d, spec, x, y, size, pose = {}) {
    const k = size / 256, sheet = `gob_${spec.id}`, sq = pose.squash ?? 0, sx = 1 + sq * 0.34, sy = 1 - sq * 0.42;
    d.push();
    d.translate(x, y);
    if (pose.body !== false) {
        d.sprite(sheet, { frame: 3, x: 0, y: size * 0.76, width: size * 1.14 * (1 + sq * 0.1), height: size * 1.14 * (1 - sq * 0.08) });
    }
    d.rotate(pose.tilt ?? 0);
    d.translate(0, size * 0.5 * (1 - sy) * 0.7);
    d.scale(sx, sy);
    const ear = pose.ear ?? 0, ew = size * 0.56 * (pose.earScale ?? 1);
    d.push(); d.translate(size * 0.3, -size * 0.04); d.rotate(0.05 + ear * 0.6); d.sprite(sheet, { frame: 1, x: ew * 0.46, y: 0, width: ew, height: ew }); d.pop();
    d.push(); d.translate(-size * 0.3, -size * 0.04); d.rotate(-0.05 - ear * 0.6); d.sprite(sheet, { frame: 1, x: -ew * 0.46, y: 0, width: ew, height: ew, flipX: true }); d.pop();
    d.sprite(sheet, { frame: 0, x: 0, y: 0, width: size, height: size });
    // Eyes: pupils are drawn live, so they can watch the notes.
    const ey = -size * 0.13 + (pose.eyeY ?? 0), ew2 = size * 0.74, eh = ew2 * 0.6, eye = pose.eye ?? 0;
    d.sprite("eyes", { frame: eye, x: 0, y: ey, width: ew2, height: eh });
    if (eye === 0) {
        const lx = (pose.look?.[0] ?? 0) * size * 0.05, ly = (pose.look?.[1] ?? 0) * size * 0.06, r = size * (pose.pupil ?? 0.066);
        for (const s of [-1, 1]) {
            const px = s * size * 0.19 + lx, py = ey + size * 0.01 + ly;
            d.circle(r, { x: px, y: py, color: INK });
            d.circle(r * 0.34, { x: px - r * 0.32, y: py - r * 0.36, color: "#ffffff" });
        }
    }
    const mw = size * 0.56 * (pose.mouthScale ?? 1);
    d.sprite("mouths", { frame: pose.mouth ?? 0, x: 0, y: size * 0.27, width: mw, height: mw * 0.7 });
    const hs = size * (spec.hat === "tuft" ? 0.62 : spec.hat === "horns" ? 1.06 : 0.76);
    const hatPop = pose.hatPop ?? 0;
    const top = { round: -0.33, egg: -0.4, pear: -0.3, bean: -0.34 }[spec.shape];
    d.sprite(sheet, { frame: 2, x: 0, y: size * (top + 0.07) - hs * 0.26 + hatPop * size * -0.4, width: hs, height: hs, rot: hatPop * 0.4 });
    d.pop();
}
