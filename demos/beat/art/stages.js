// Seven hand-placed venues, painted on first use so startup stays quick.
// Every painting has its horizon at y 420 of 840, so the game can line the road up with it.
import { blob, ell, Ink, mixc, rgba, vgrad } from "./ink.js";

export const W = 840, H = 840, HORIZON = 420;

export const STAGE = {
    bog: { road: ["#6b4a33", "#3a2a24"], edge: "#2c2018", line: "#d3f27a", sky: "#3a2a5e", accent: "#b6f05a" },
    beach: { road: ["#e8c98a", "#b8905a"], edge: "#8a6238", line: "#fff4c0", sky: "#3b2a7e", accent: "#ff8a4c" },
    tavern: { road: ["#6a6072", "#403a4c"], edge: "#2a2634", line: "#ffc36a", sky: "#1a1740", accent: "#ffb347" },
    yard: { road: ["#51607a", "#2f3a54"], edge: "#1e2438", line: "#9fe8ff", sky: "#151a3e", accent: "#9fe8ff" },
    cave: { road: ["#4a3a72", "#2a2050"], edge: "#1a1234", line: "#ff7ae0", sky: "#160c2c", accent: "#5ff0e0" },
    pass: { road: ["#d6dcf0", "#8a94b8"], edge: "#5a648c", line: "#ff8ab0", sky: "#ff9eae", accent: "#ffd0dc" },
    fest: { road: ["#8a3060", "#4a1a48"], edge: "#2a1030", line: "#ffe27a", sky: "#2a0e5a", accent: "#ffc93c" },
};

// Deterministic scatter, independent of the game's rng.
const rnd = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 16807 + 11) % 2147483647; return (s % 100000) / 100000; }; };

/** A jagged or rolling skyline polygon down to the bottom of the painting. */
function ridge(g, y, amp, seed, color, o = {}) {
    const r = rnd(seed), pts = [[-10, H]], step = o.step ?? 70;
    for (let x = -20; x <= W + step; x += step) pts.push([x, y - r() * amp - (o.spike && r() > 0.5 ? amp * 0.7 : 0)]);
    pts.push([W + 10, H]);
    const out = o.spike ? pts : [[-10, H], ...smooth(pts.slice(1, -1)), [W + 10, H]];
    g.fill(out, o.grad ? vgrad(y - amp, y + (o.gh ?? 200), o.grad, color) : color);
}
function smooth(pts) {
    const out = [];
    for (let i = 0; i + 1 < pts.length; i++) for (let k = 0; k < 8; k++) {
        const t = k / 8, u = (1 - Math.cos(t * Math.PI)) / 2;
        out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]);
    }
    return out;
}
const stars = (g, n, seed, top = 360) => { const r = rnd(seed); for (let i = 0; i < n; i++) { const x = r() * W, y = r() * top, s = 1 + r() * 2.2; g.fill(ell(x, y, s, s, 0, 10), [255, 250, 220, 0.3 + r() * 0.6]); } };
const moon = (g, x, y, r, c, glow) => { g.glow(x, y, r * 3, glow, 2); g.fill(ell(x, y, r, r), c); for (const [a, b, q] of [[-0.3, -0.2, 0.2], [0.3, 0.1, 0.14], [-0.1, 0.4, 0.11]]) g.fill(ell(x + a * r, y + b * r, r * q, r * q), [0, 0, 0, 0.09]); };

function deadTree(g, x, y, h, c, seed) {
    const r = rnd(seed), branch = (px, py, a, l, w, depth) => {
        const nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
        g.stroke([[px, py], [(px + nx) / 2 + (r() - 0.5) * l * 0.3, (py + ny) / 2], [nx, ny]], w, c, w * 0.6);
        if (depth > 0) { branch(nx, ny, a - 0.5 - r() * 0.4, l * 0.7, w * 0.6, depth - 1); branch(nx, ny, a + 0.4 + r() * 0.4, l * 0.65, w * 0.6, depth - 1); }
    };
    branch(x, y, -Math.PI / 2 + (r() - 0.5) * 0.3, h * 0.45, h * 0.11, 3);
}
const shroom = (g, x, y, s, cap, stem = "#e8e0c0") => {
    g.toon([[x - s * 0.18, y], [x + s * 0.18, y], [x + s * 0.12, y - s * 0.7], [x - s * 0.12, y - s * 0.7]], { fill: stem, dark: "#a89a70", iw: 3, sy: 0 });
    g.toon(blob([[x - s * 0.7, y - s * 0.62], [x, y - s * 1.2], [x + s * 0.7, y - s * 0.62], [x, y - s * 0.52]], 8), { fill: cap, top: mixc(cap, "#ffffff", 0.3), dark: mixc(cap, "#000000", 0.35), iw: 3 });
    g.fill(ell(x - s * 0.2, y - s * 0.86, s * 0.1, s * 0.08), "#ffffffc0"); g.fill(ell(x + s * 0.24, y - s * 0.76, s * 0.08, s * 0.06), "#ffffffc0");
};

const PAINT = {
    bog(g) {
        g.wash("#2c1f5c", "#ff9a4c", 0, HORIZON + 10);
        stars(g, 60, 3, 180);
        moon(g, 610, 150, 84, "#ffe9a8", "#ffd27a40");
        ridge(g, 350, 60, 2, "#4b3a78", { grad: "#7a4f8e" });
        ridge(g, 390, 46, 5, "#2f4a4e", { grad: "#54406e", step: 90 });
        for (const [x, h, c] of [[110, 300, "#1e2a30"], [750, 340, "#1e2a30"], [300, 190, "#2a3a40"], [560, 170, "#2a3a40"]]) deadTree(g, x, HORIZON + 8, h, c, x);
        g.wash("#5c7a34", "#2f4420", HORIZON, H);
        const r = rnd(9);
        for (let i = 0; i < 26; i++) g.fill(ell(r() * W, HORIZON + 20 + r() * 400, 40 + r() * 70, 6 + r() * 10), [20, 50, 30, 0.35]);
        for (const [x, y] of [[80, 520], [770, 500], [150, 660], [700, 690]]) { g.fill(ell(x, y, 70, 18), "#2a5c5c"); g.fill(ell(x - 10, y - 3, 50, 10), "#ff9a4c50"); }
        for (const [x, y, s, c] of [[60, 470, 54, "#e0483e"], [130, 500, 34, "#ffb347"], [790, 480, 60, "#e0483e"], [720, 450, 30, "#b67be8"], [40, 610, 70, "#b67be8"], [810, 620, 72, "#ffb347"]]) shroom(g, x, y, s, c);
    },
    beach(g) {
        g.wash("#3b2a8e", "#ff7a6a", 0, 300);
        g.wash("#ff7a6a", "#ffc36a", 300, HORIZON - 40);
        g.glow(420, 330, 300, "#ffe27a70", 1.6);
        g.fill(ell(420, 320, 120, 120), vgrad(200, 440, "#fff2a0", "#ff6a4a"));
        for (let i = 0; i < 6; i++) g.fill([[280, 310 + i * 22], [560, 310 + i * 22], [560, 316 + i * 26], [280, 316 + i * 26]], "#ff7a6a");
        const r = rnd(4);
        for (let i = 0; i < 5; i++) { const x = r() * W, y = 60 + r() * 170; g.fill(blob([[x - 90, y], [x - 30, y - 22], [x + 40, y - 18], [x + 100, y], [x, y + 12]], 8), "#ffb0a060"); }
        g.wash("#2c9ec8", "#1a5c9c", HORIZON - 40, HORIZON + 40);
        for (let i = 0; i < 40; i++) { const x = r() * W, y = HORIZON - 36 + r() * 70; g.fill(ell(x, y, 26 + r() * 40, 1.6), "#ffd8a080"); }
        g.wash("#f6dfa0", "#d8a860", HORIZON + 30, H);
        ridge(g, HORIZON + 40, 16, 8, "#f6dfa0", { step: 110 });
        for (let i = 0; i < 80; i++) g.fill(ell(r() * W, HORIZON + 50 + r() * 370, 2 + r() * 3, 1.5), "#b8905a60");
        const palm = (x, y, s, f) => {
            g.stroke([[x, y], [x + s * 0.12 * f, y - s * 0.5], [x + s * 0.32 * f, y - s]], s * 0.075, "#6a3f2c", s * 0.04);
            const tx = x + s * 0.32 * f, ty = y - s;
            for (const a of [-2.8, -2.2, -1.5, -0.9, -0.3, 0.3]) {
                const ex = tx + Math.cos(a) * s * 0.55, ey = ty + Math.sin(a) * s * 0.34 + s * 0.18;
                g.fill(blob([[tx, ty], [(tx + ex) / 2, (ty + ey) / 2 - s * 0.1], [ex, ey], [(tx + ex) / 2, (ty + ey) / 2 + s * 0.02]], 6), "#1f7a5a");
            }
        };
        palm(90, 560, 420, 1); palm(770, 580, 460, -1); palm(190, 470, 210, 1);
    },
    tavern(g) {
        g.wash("#141238", "#5a2f78", 0, HORIZON);
        stars(g, 110, 7, 300);
        moon(g, 180, 110, 50, "#fff0c0", "#ffe9a830");
        const house = (x, w, h, c, lean) => {
            const y = HORIZON + 12, roof = y - h;
            g.toon([[x, y], [x + w, y], [x + w + lean, roof], [x + lean, roof]], { fill: c, top: mixc(c, "#ffb36a", 0.2), dark: mixc(c, "#000000", 0.35), iw: 4, sy: 0 });
            g.toon([[x - 20 + lean, roof + 6], [x + w / 2 + lean * 1.4, roof - w * 0.6], [x + w + 20 + lean, roof + 6]], { fill: "#5c2f3a", dark: "#2f1a2a", iw: 4, sy: 0 });
            for (let i = 0; i < Math.floor(h / 70); i++) for (let k = 0; k < Math.floor(w / 56); k++) {
                const wx = x + 18 + k * 56 + lean * (i + 1) / 4, wy = y - 60 - i * 70;
                g.fill([[wx, wy], [wx + 30, wy], [wx + 30, wy + 38], [wx, wy + 38]], (i + k) % 3 ? "#ffc65a" : "#332a48");
                g.stroke([[wx + 15, wy], [wx + 15, wy + 38]], 3, "#332a48");
            }
        };
        house(-20, 190, 280, "#5a4a62", 18); house(180, 150, 200, "#4a3c6a", -14); house(490, 160, 220, "#54406a", 12); house(660, 200, 300, "#5c4a5a", -20);
        // The inn sign, and strung lanterns over the road.
        g.stroke([[0, 170], [210, 240], [420, 260], [630, 240], [840, 170]], 4, "#1a1228");
        for (const [x, y] of [[100, 208], [210, 240], [320, 256], [420, 262], [520, 256], [630, 240], [740, 206]]) { g.glow(x, y + 16, 54, "#ffb34770", 1.5); g.toon(ell(x, y + 16, 12, 15), { fill: "#ffb347", top: "#ffe9a8", iw: 3 }); }
        g.wash("#5a5266", "#2c2838", HORIZON, H);
        const r = rnd(3);
        for (let y = HORIZON + 14, row = 0; y < H; row++) { const h = 12 + row * 3.4; for (let x = -40 + (row % 2) * 30; x < W; x += 40 + row * 7) g.fill(ell(x, y, 18 + row * 3, h * 0.42), [40 + r() * 30, 36 + r() * 26, 56 + r() * 30, 0.55]); y += h; }
        for (const [x, y, s] of [[60, 560, 1], [790, 580, 1.1]]) { g.toon(blob([[x - 40 * s, y - 70 * s], [x + 40 * s, y - 70 * s], [x + 48 * s, y - 30 * s], [x + 40 * s, y + 6 * s], [x - 40 * s, y + 6 * s], [x - 48 * s, y - 30 * s]], 6), { fill: "#8a5a34", top: "#b88a4c", dark: "#4a2c20", iw: 4 }); g.stroke([[x - 47 * s, y - 46 * s], [x + 47 * s, y - 46 * s]], 7, "#4a3a3a"); g.stroke([[x - 47 * s, y - 14 * s], [x + 47 * s, y - 14 * s]], 7, "#4a3a3a"); }
    },
    yard(g) {
        g.wash("#0f1438", "#3c5a9c", 0, HORIZON);
        stars(g, 150, 11, 320);
        moon(g, 420, 170, 120, "#e8f2ff", "#9fd0ff40");
        ridge(g, 380, 70, 3, "#253060", { grad: "#3a4a84" });
        deadTree(g, 110, HORIZON + 6, 340, "#101630", 21); deadTree(g, 730, HORIZON + 6, 370, "#101630", 33);
        // Iron fence along the horizon.
        for (let x = 0; x < W; x += 34) { g.stroke([[x, HORIZON + 8], [x, HORIZON - 56]], 5, "#121830"); g.fill([[x - 6, HORIZON - 54], [x, HORIZON - 72], [x + 6, HORIZON - 54]], "#121830"); }
        g.stroke([[0, HORIZON - 40], [W, HORIZON - 40]], 5, "#121830");
        g.wash("#3f5a7c", "#1a2640", HORIZON, H);
        const tomb = (x, y, s, kind) => {
            const c = "#7a88a8", p = kind ? [[x - 26 * s, y], [x - 26 * s, y - 62 * s], [x, y - 86 * s], [x + 26 * s, y - 62 * s], [x + 26 * s, y]] : blob([[x - 32 * s, y], [x - 34 * s, y - 60 * s], [x, y - 92 * s], [x + 34 * s, y - 60 * s], [x + 32 * s, y]], 8);
            g.toon(p, { fill: c, top: "#b0bcd4", dark: "#46506e", iw: 4, sx: 0.1, sy: 0.02 });
            g.stroke([[x - 14 * s, y - 56 * s], [x + 14 * s, y - 56 * s]], 5 * s, "#46506e");
            g.stroke([[x - 14 * s, y - 40 * s], [x + 10 * s, y - 40 * s]], 5 * s, "#46506e");
            g.fill(ell(x, y, 46 * s, 10 * s), "#0f182c70");
        };
        for (const [x, y, s, k] of [[210, 450, 0.6, 0], [640, 450, 0.6, 1], [130, 490, 0.85, 1], [720, 490, 0.9, 0], [60, 570, 1.25, 0], [790, 590, 1.3, 1]]) tomb(x, y, s, k);
        const r = rnd(2);
        for (let i = 0; i < 14; i++) g.fill(ell(r() * W, HORIZON + 10 + r() * 160, 90 + r() * 120, 12 + r() * 12), "#b0d4ff1c");
    },
    cave(g) {
        g.wash("#120826", "#3a1a6a", 0, HORIZON);
        g.glow(420, 380, 380, "#5ff0e040", 1.6);
        ridge(g, 400, 110, 4, "#26124e", { spike: true, step: 60 });
        ridge(g, 416, 60, 6, "#1c0e3e", { spike: true, step: 44 });
        const r = rnd(8);
        for (let i = 0; i < 26; i++) { const x = r() * W, w = 22 + r() * 44, h = 90 + r() * 240; g.toon([[x - w, -10], [x + w, -10], [x + 3, h]], { fill: "#2c1858", top: "#160a30", dark: "#180c38", ink: "#0e0620", iw: 3, sx: 0.12, sy: 0 }); }
        g.wash("#3a2a68", "#160e30", HORIZON, H);
        const crystal = (x, y, s, c) => {
            g.glow(x, y - s * 0.6, s * 1.8, [...rgba(c).slice(0, 3), 0.3], 1.6);
            for (const [dx, h, w, t] of [[-0.42, 0.7, 0.24, -0.2], [0.4, 0.8, 0.22, 0.2], [0, 1.3, 0.3, 0]]) {
                const bx = x + dx * s, tx = bx + t * s, ty = y - h * s * 1.1;
                g.toon([[bx - w * s, y], [tx - w * s * 0.6, ty + s * 0.2], [tx, ty], [tx + w * s * 0.6, ty + s * 0.2], [bx + w * s, y]], { fill: c, top: "#ffffff", dark: mixc(c, "#201040", 0.55), iw: 4, sx: 0.18, sy: 0 });
            }
        };
        for (const [x, y, s, c] of [[70, 530, 86, "#5ff0e0"], [780, 510, 90, "#ff7ae0"], [160, 470, 44, "#ff7ae0"], [690, 455, 40, "#5ff0e0"], [40, 690, 120, "#b67be8"], [820, 700, 128, "#5ff0e0"]]) crystal(x, y, s, c);
        for (let i = 0; i < 16; i++) g.fill(ell(r() * W, 460 + r() * 360, 30 + r() * 50, 4), "#5ff0e024");
    },
    pass(g) {
        g.wash("#6a5ac8", "#ffb6a8", 0, HORIZON);
        const mountain = (x, y, w, h, c, snow) => {
            g.fill([[x - w, y], [x, y - h], [x + w, y]], c);
            g.fill([[x - w * 0.34, y - h * 0.66], [x, y - h], [x + w * 0.34, y - h * 0.66], [x + w * 0.16, y - h * 0.58], [x + w * 0.02, y - h * 0.68], [x - w * 0.12, y - h * 0.56]], snow);
            g.fill([[x, y - h], [x + w, y], [x + w * 0.3, y]], "#00002018");
        };
        g.glow(600, 170, 220, "#fff0c080", 1.6);
        g.fill(ell(600, 170, 62, 62), "#fff6d0");
        mountain(180, 420, 330, 330, "#7a6ac0", "#ffffff"); mountain(700, 420, 350, 360, "#6a5cb4", "#ffffff"); mountain(430, 420, 300, 250, "#8a78cc", "#ffffff");
        const r = rnd(5);
        for (let i = 0; i < 5; i++) { const x = r() * W, y = 90 + r() * 160; g.fill(blob([[x - 110, y], [x - 40, y - 26], [x + 50, y - 22], [x + 120, y], [x, y + 12]], 8), "#ffffff60"); }
        g.wash("#eef0ff", "#a8b0d8", HORIZON, H);
        ridge(g, HORIZON + 14, 26, 9, "#eef0ff", { step: 120 });
        const pine = (x, y, s) => { g.fill(ell(x, y, s * 0.5, s * 0.1), "#5a648c50"); for (let i = 0; i < 4; i++) { const yy = y - s * 0.2 - i * s * 0.34, w = s * (0.55 - i * 0.11); g.toon([[x - w, yy], [x, yy - s * 0.56], [x + w, yy]], { fill: "#2f6a68", top: "#1f4a58", dark: "#173a4a", iw: 3, sy: 0 }); g.fill([[x - w * 0.5, yy - s * 0.26], [x, yy - s * 0.56], [x + w * 0.5, yy - s * 0.26]], "#ffffff"); } };
        for (const [x, y, s] of [[230, 450, 50], [620, 450, 56], [130, 470, 76], [720, 470, 84], [60, 540, 120], [790, 550, 128]]) pine(x, y, s);
    },
    fest(g) {
        g.wash("#1e0a54", "#d03a8a", 0, HORIZON);
        stars(g, 90, 19, 240);
        const firework = (x, y, r, c) => { for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283, q = r * (0.6 + (i % 3) * 0.2); g.stroke([[x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2], [x + Math.cos(a) * q, y + Math.sin(a) * q]], 5, c, 1); g.fill(ell(x + Math.cos(a) * q, y + Math.sin(a) * q, 4, 4, 0, 8), "#fff4c0"); } g.glow(x, y, r * 1.3, [...rgba(c).slice(0, 3), 0.25], 1.5); };
        firework(150, 110, 90, "#ffc93c"); firework(700, 90, 110, "#5ff0e0"); firework(450, 190, 70, "#ff7ae0"); firework(280, 240, 50, "#7dffb0");
        const tent = (x, y, w, h, a, b) => {
            const n = 6;
            for (let i = 0; i < n; i++) {
                const x0 = x - w + i * 2 * w / n, x1 = x0 + 2 * w / n;
                g.fill([[x, y - h], [x0 + 0, y - h * 0.3], [x0, y], [x1, y], [x1, y - h * 0.3]], i % 2 ? a : b);
            }
            g.stroke([[x, y - h], [x, y - h - 60]], 7, "#2a1040");
            g.fill([[x, y - h - 60], [x + 56, y - h - 42], [x, y - h - 26]], "#ffc93c");
        };
        tent(150, HORIZON + 10, 190, 230, "#e0344a", "#fff0d0"); tent(700, HORIZON + 10, 190, 250, "#3257d6", "#ffe27a"); tent(430, HORIZON + 10, 130, 150, "#2fb86a", "#fff0d0");
        for (const [pts] of [[[[0, 120], [200, 200], [420, 150], [640, 200], [840, 110]]]]) {
            g.stroke(pts, 4, "#1a0a30");
            for (let i = 0; i < 4; i++) for (let k = 1; k < 9; k++) {
                const t = k / 9, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
                g.fill([[x - 13, y], [x + 13, y], [x, y + 28]], ["#ffc93c", "#ff5a7a", "#5ff0e0", "#7dffb0"][k % 4]);
            }
        }
        g.wash("#6a2a6a", "#2c1040", HORIZON, H);
    },
};

const painted = new Set();
export const isPainted = (id) => painted.has(id);
/** Paint a venue the first time it's needed. */
export function ensureStage(game, id) {
    if (painted.has(id)) return `stage_${id}`;
    painted.add(id);
    // Painted whole, kept as sky and ground, so a tall phone can stretch the ground without losing the skyline.
    const data = new Uint8Array(W * H * 4);
    PAINT[id](new Ink({ width: W, height: H, data }));
    game.assets.paint(`stage_${id}`, W, HORIZON, (p) => p.data.set(data.subarray(0, W * HORIZON * 4)), { smooth: true });
    game.assets.paint(`ground_${id}`, W, HORIZON, (p) => p.data.set(data.subarray(W * HORIZON * 4)), { smooth: true });
    return `stage_${id}`;
}
