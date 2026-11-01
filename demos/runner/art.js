// Painted 2D art: chunky numerals, disguise badges, the farmer's face, and the sky's glow. All of it shares thick dark
// outlines and the same warm palette as the world.
const INK = "#2c2030";

// Numerals as strokes on a 0-10 by 0-14 grid, so the HUD can batch digits instead of building a text texture per frame.
const STROKES = {
    0: [[[2, 2], [8, 2], [8, 12], [2, 12], [2, 2]]], 1: [[[3, 4], [5.5, 2], [5.5, 12]], [[3, 12], [8, 12]]],
    2: [[[2, 4], [3.5, 2], [7, 2], [8, 4], [8, 6], [2, 12], [8, 12]]], 3: [[[2, 2], [8, 2], [5, 6.5], [8, 8], [8, 11], [6.5, 12], [3, 12], [2, 11]]],
    4: [[[7, 12], [7, 2], [2, 9], [8.5, 9]]], 5: [[[8, 2], [3, 2], [2.5, 6.5], [7, 6.5], [8, 8], [8, 11], [7, 12], [3, 12], [2, 11]]],
    6: [[[7.5, 2], [4, 2], [2, 5], [2, 11], [3, 12], [7, 12], [8, 11], [8, 8], [7, 7], [2.5, 7]]], 7: [[[2, 2], [8, 2], [4, 12]]],
    8: [[[3, 7], [2, 5.5], [2, 3], [3, 2], [7, 2], [8, 3], [8, 5.5], [7, 7], [3, 7], [2, 8.5], [2, 11], [3, 12], [7, 12], [8, 11], [8, 8.5], [7, 7]]],
    9: [[[7.5, 7], [3, 7], [2, 6], [2, 3], [3, 2], [7, 2], [8, 3], [8, 9], [6, 12], [2.5, 12]]],
    10: [[[4, 11], [3.5, 13]]],             // comma
    11: [[[2.5, 6], [7.5, 12]], [[7.5, 6], [2.5, 12]]],   // times
};

// The logo's letters, as strokes on the same grid as the numerals. Painted, so it never depends on a device font.
const LETTERS = {
    O: [[[2, 3], [3.5, 1.5], [6.5, 1.5], [8.2, 3], [8.2, 11], [6.5, 12.5], [3.5, 12.5], [2, 11], [2, 3]]],
    S: [[[8, 3.2], [6.8, 1.6], [3.2, 1.6], [2, 3], [2, 5], [3.2, 6.6], [6.8, 7.2], [8, 9], [8, 11], [6.8, 12.4], [3.2, 12.4], [2, 10.8]]],
    T: [[[1.5, 2], [8.5, 2]], [[5, 2], [5, 12.5]]], R: [[[2.4, 12.5], [2.4, 2], [6.8, 2], [8, 3.2], [8, 6], [6.8, 7.2], [2.4, 7.2]], [[5.4, 7.2], [8.2, 12.5]]],
    I: [[[5, 2], [5, 12.5]]], C: [[[8.2, 3.4], [6.8, 1.8], [3.6, 1.8], [2, 3.4], [2, 10.6], [3.6, 12.2], [6.8, 12.2], [8.2, 10.6]]],
    H: [[[2.2, 1.8], [2.2, 12.5]], [[7.8, 1.8], [7.8, 12.5]], [[2.2, 7], [7.8, 7]]],
    G: [[[8.2, 3.4], [6.8, 1.8], [3.6, 1.8], [2, 3.4], [2, 10.6], [3.6, 12.2], [6.8, 12.2], [8.2, 10.6], [8.2, 7.4], [5.4, 7.4]]],
    E: [[[8, 2], [2.4, 2], [2.4, 12.2], [8, 12.2]], [[2.4, 7], [7, 7]]], A: [[[1.8, 12.5], [5, 1.8], [8.2, 12.5]], [[3.2, 8.6], [6.8, 8.6]]],
    W: [[[1, 2], [3, 12.5], [5, 5], [7, 12.5], [9, 2]]], Y: [[[1.8, 2], [5, 7.4], [8.2, 2]], [[5, 7.4], [5, 12.5]]],
};
const WIDTH = { I: 6, W: 12.6, T: 9.8, A: 10.6, Y: 10.2 };
function logoWord(p, word, cx, cy, s, top, bottom, face) {
    const W = (ch) => (WIDTH[ch] ?? 10.4) * s;
    let total = 0; for (const ch of word) total += W(ch);
    const x0 = cx - total / 2, y0 = cy - 7 * s, ink = s * 3.7, body = s * 2.35;
    const each = (fn) => {
        let x = x0;
        for (let n = 0; n < word.length; n++) {
            const ch = word[n], off = x + (W(ch) - 10 * s) / 2, tilt = (n % 2 ? 1 : -1) * s * 0.28;
            for (const path of LETTERS[ch]) for (let i = 0; i + 1 < path.length; i++) fn(off + path[i][0] * s, y0 + path[i][1] * s + tilt, off + path[i + 1][0] * s, y0 + path[i + 1][1] * s + tilt);
            x += W(ch);
        }
    };
    each((a, b, c, d) => p.line(a, b + s * 0.75, c, d + s * 0.75, "#1d1420", ink));   // Drop shadow, the same ink.
    each((a, b, c, d) => p.line(a, b, c, d, INK, ink));
    each((a, b, c, d) => p.line(a, b, c, d, bottom, body));
    each((a, b, c, d) => p.line(a, b - s * 0.2, c, d - s * 0.2, top, body * 0.62));
    if (face) {
        // Keith's O gets a face, because of course it does.
        const fx = x0 + W("O") / 2, fy = cy;
        for (const dx of [-1.4, 1.4]) { p.circle(fx + dx * s, fy - 1.3 * s, 1.5 * s, INK); p.circle(fx + dx * s, fy - 1.3 * s, 1.1 * s, "#fff"); p.circle(fx + dx * s * 1.1, fy - 1 * s, 0.5 * s, INK); }
        for (const q of [-1, 1]) { p.line(fx, fy + 1.6 * s, fx + q * 1.5 * s, fy + 1.3 * s, "#6a3d1c", s * 0.9); p.line(fx + q * 1.5 * s, fy + 1.3 * s, fx + q * 2.1 * s, fy + 0.6 * s, "#6a3d1c", s * 0.6); }
    }
}

function star(p, cx, cy, r, c) {
    const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    for (let i = 0; i < 10; i++) p.poly([[cx, cy], pts[i], pts[(i + 1) % 10]], c);
}
function egg(p, cx, cy, s) {
    p.ellipse(cx, cy + 3 * s, 16 * s, 19 * s, "#ffe48a", "#f09a18");
    p.ellipse(cx, cy - 9 * s, 11 * s, 11 * s, "#ffe48a");
    p.ellipse(cx - 5 * s, cy - 7 * s, 4 * s, 6 * s, "#fffbe6");
}

const BADGES = {
    moustache(p) {
        for (const s of [-1, 1]) {
            p.ellipse(48 + s * 18, 50, 22, 11, "#83502a", "#5a3218");
            p.circle(48 + s * 37, 40, 8, "#6a3d1c");
        }
        p.ellipse(48, 42, 10, 6, "#a4693a");
    },
    skates(p) {
        p.poly([[26, 22], [52, 22], [54, 46], [74, 54], [74, 66], [24, 66]], "#ff5d73");
        p.rect(24, 58, 50, 8, "#ffffff");
        p.line(32, 28, 46, 28, "#fff", 3).line(34, 36, 48, 36, "#fff", 3);
        for (const x of [34, 64]) { p.circle(x, 74, 9, "#ffc933"); p.circle(x, 74, 3, "#ff8a3c"); }
    },
    jetpack(p) {
        p.poly([[26, 70], [38, 86], [50, 70]], "#ffc933"); p.poly([[46, 70], [58, 86], [70, 70]], "#ff8a3c");
        for (const x of [36, 60]) { p.rect(x - 10, 26, 20, 44, "#e8432e"); p.ellipse(x, 26, 10, 14, "#ffb52e"); }
        p.rect(40, 40, 16, 16, "#b8c2cc");
    },
    dress(p) {
        p.poly([[38, 18], [58, 18], [60, 40], [80, 82], [16, 82], [36, 40]], "#fff6f2");
        p.poly([[36, 40], [60, 40], [62, 46], [34, 46]], "#f3b8c8");
        p.circle(48, 58, 6, "#ffd1dc"); p.circle(36, 72, 5, "#ffd1dc"); p.circle(60, 72, 5, "#ffd1dc");
    },
    hivis(p) {
        p.poly([[30, 18], [42, 18], [48, 30], [54, 18], [66, 18], [76, 32], [68, 40], [68, 80], [28, 80], [28, 40], [20, 32]], "#d6f030");
        p.rect(28, 50, 40, 8, "#f0f3f5"); p.rect(28, 66, 40, 8, "#f0f3f5");
        p.rect(36, 50, 7, 30, "#ff8a22"); p.rect(53, 50, 7, 30, "#ff8a22");
    },
};

export function paintArt(game) {
    const a = game.assets;
    a.paint("digits", 40, 56, (p, f) => {
        const s = 4;
        for (const pass of [0, 1]) for (const path of STROKES[f]) for (let i = 0; i + 1 < path.length; i++) {
            const [x0, y0] = path[i], [x1, y1] = path[i + 1];
            p.line(x0 * s, y0 * s, x1 * s, y1 * s, pass ? "#ffffff" : INK, pass ? 8 : 14);
        }
    }, { frames: 12, smooth: true });
    a.paint("sunglow", 256, 256, (p) => {
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const d = Math.hypot(x - 127.5, y - 127.5) / 128, i = (y * 256 + x) * 4;
            const disc = Math.max(0, Math.min(1, (0.2 - d) * 60)), glow = Math.pow(Math.max(0, 1 - d), 2.4) * 0.62, al = disc + (1 - disc) * glow;
            p.data[i] = 255; p.data[i + 1] = 250 - Math.min(1, d * 1.5) * 34; p.data[i + 2] = 226 - Math.min(1, d * 1.5) * 110; p.data[i + 3] = al * 255;
        }
    }, { smooth: true });
    a.paint("logo", 760, 400, (p) => {
        logoWord(p, "OSTRICH", 380, 104, 9.7, "#ffffff", "#ffe2ad", true);
        logoWord(p, "GETAWAY", 380, 286, 9.5, "#ffe26b", "#ff9412", false);
    }, { smooth: true });
    a.paint("bloom", 128, 128, (p) => {
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const d = Math.hypot(x - 63.5, y - 63.5) / 64, i = (y * 128 + x) * 4, k = Math.max(0, 1 - d);
            p.data[i] = 255; p.data[i + 1] = 226; p.data[i + 2] = 170; p.data[i + 3] = k * k * k * 255;
        }
    }, { smooth: true });
    a.paint("egg_icon", 64, 72, (p) => { egg(p, 32, 40, 1.35); p.outline(INK); }, { smooth: true });
    for (const [id, fn] of Object.entries(BADGES)) a.paint(`b_${id}`, 96, 96, (p) => { p.circle(48, 48, 46, "#fff4dc", "#ffd98a"); fn(p); p.outline(INK); }, { smooth: true });
    a.paint("farmer_face", 96, 96, (p) => {
        p.ellipse(48, 30, 44, 12, "#f5d67a", "#d9a93c");
        p.ellipse(48, 22, 24, 16, "#f0cd6c");
        p.rect(24, 24, 48, 7, "#e8432e");
        p.circle(48, 54, 28, "#ff9f7c", "#f26d55");
        p.circle(37, 50, 7, "#fff"); p.circle(59, 50, 7, "#fff"); p.circle(39, 51, 3.2, INK); p.circle(57, 51, 3.2, INK);
        p.line(29, 40, 44, 45, "#5a524c", 5); p.line(67, 40, 52, 45, "#5a524c", 5);
        p.ellipse(35, 70, 14, 7, "#8a8177"); p.ellipse(61, 70, 14, 7, "#8a8177");
        p.circle(48, 62, 7, "#e85a44");
        p.outline(INK);
    }, { smooth: true });
    a.paint("gear", 72, 72, (p) => {
        for (let i = 0; i < 8; i++) { const t = i * Math.PI / 4, c = Math.cos(t), s = Math.sin(t); p.line(36 + c * 18, 36 + s * 18, 36 + c * 29, 36 + s * 29, "#fff4dc", 11); }
        p.circle(36, 36, 21, "#fff4dc", "#ffd98a"); p.circle(36, 36, 9, "#8f6a3a");
        p.outline(INK);
    }, { smooth: true });
    a.paint("pause_icon", 72, 72, (p) => { p.circle(36, 36, 32, "#fff4dc", "#ffd98a"); p.rect(24, 21, 9, 30, "#8f4a2a"); p.rect(39, 21, 9, 30, "#8f4a2a"); p.outline(INK); }, { smooth: true });
    a.paint("star", 64, 64, (p) => { star(p, 32, 34, 28, "#ffc933"); star(p, 30, 30, 15, "#ffe48a"); p.outline(INK); }, { smooth: true });
    a.paint("lock", 64, 64, (p) => { p.line(20, 28, 20, 18, "#b8c2cc", 7); p.line(44, 28, 44, 18, "#b8c2cc", 7); p.line(20, 15, 44, 15, "#b8c2cc", 7); p.rect(13, 28, 38, 28, "#8f6a3a"); p.circle(32, 41, 5, INK); p.outline(INK); }, { smooth: true });
    a.paint("hand", 96, 112, (p) => {
        p.ellipse(52, 72, 26, 30, "#fff4dc", "#ffd9a8");
        p.line(34, 62, 34, 22, "#fff4dc", 18);
        p.line(52, 62, 52, 50, "#ffe9c8", 16); p.line(66, 66, 66, 54, "#ffe9c8", 15);
        p.outline(INK);
    }, { smooth: true });
    a.paint("card", 64, 64, (p) => { p.rect(0, 0, 64, 64, "#fff"); }, { smooth: false });
    // Postcards: one painted view of each world, for the start-point picker.
    const CARDS = {
        farm: { top: "#57b9ec", bot: "#ffeec0", ground: "#92d14c", road: "#dcae66", draw(p) { p.rect(150, 36, 38, 24, "#d8432f"); p.poly([[146, 36], [169, 20], [192, 36]], "#7d4a3a"); } },
        village: { top: "#7cc6ec", bot: "#ffdcae", ground: "#a4d456", road: "#cdbda4", draw(p) { p.rect(28, 38, 34, 24, "#fff1d6"); p.poly([[24, 38], [45, 22], [66, 38]], "#b4553a"); p.rect(150, 22, 16, 40, "#d6cdb9"); p.poly([[146, 22], [158, 4], [170, 22]], "#5f6a7d"); } },
        motorway: { top: "#3f9bd8", bot: "#ffc98a", ground: "#b4cf5e", road: "#54525f", draw(p) { p.rect(30, 32, 150, 7, "#d8dbe0"); p.rect(38, 39, 6, 24, "#b8c2cc"); p.rect(166, 39, 6, 24, "#b8c2cc"); p.rect(84, 16, 52, 16, "#21a34f"); } },
        airport: { top: "#2f9fe0", bot: "#e6f5ff", ground: "#c8ccd4", road: "#bcc1ca", draw(p) { p.ellipse(120, 40, 56, 9, "#ffffff"); p.poly([[160, 40], [176, 18], [182, 18], [176, 40]], "#e8432e"); p.poly([[106, 42], [84, 58], [100, 58], [130, 42]], "#dfe4ea"); } },
        ski: { top: "#2a8fe6", bot: "#d8efff", ground: "#f6fbff", road: "#d5e3f3", draw(p) { p.poly([[10, 62], [64, 8], [120, 62]], "#b8d4f2"); p.poly([[50, 22], [64, 8], [78, 22], [64, 28]], "#fff"); p.poly([[100, 62], [150, 14], [204, 62]], "#a8c8ea"); } },
        launch: { top: "#3a2a86", bot: "#ff9a62", ground: "#eebd84", road: "#d9d2c6", draw(p) { p.rect(96, 18, 22, 44, "#f7f8fa"); p.poly([[96, 18], [107, 0], [118, 18]], "#e8432e"); p.poly([[96, 50], [84, 62], [96, 62]], "#ffc933"); p.poly([[118, 50], [130, 62], [118, 62]], "#ffc933"); } },
    };
    for (const [id, k] of Object.entries(CARDS)) a.paint(`pc_${id}`, 216, 120, (p) => {
        p.gradient(0, 0, 216, 62, k.top, k.bot);
        k.draw(p);
        p.rect(0, 62, 216, 58, k.ground);
        p.poly([[84, 62], [132, 62], [190, 120], [26, 120]], k.road);
    }, { smooth: true });
}
