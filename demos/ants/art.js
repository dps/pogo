// Every sprite in the game, painted in code onto two atlases. Light always comes from the top left.
import { CASTES, PROPS, TEAMS } from "./data.js";
import { Atlas, NOISE, bevel, castShadow, glow, gloss, grain, inside, mix, oval, rot2, stroke } from "./paint.js";

export const CELL = 64;

// --- Ants: head points right, frames 0 to 3 are a tripod gait, frame 4 is a corpse ------------------------------
const BODY = [
    { gaster: [12, 9.5], thorax: [6.5, 5], head: [7.5, 7], jaw: 5, legs: 15, wide: 1 },
    { gaster: [13, 11], thorax: [7.5, 6], head: [11.5, 11], jaw: 10, legs: 16, wide: 1.1 },
    { gaster: [16, 13], thorax: [6, 5], head: [7, 6.5], jaw: 4, legs: 14, wide: 1 },
    { gaster: [15, 13], thorax: [9, 8], head: [8, 7.5], jaw: 6, legs: 16, wide: 1.25 },
    { gaster: [12, 7], thorax: [7, 5], head: [7, 6.5], jaw: 4, legs: 13, wide: 0.9 },
];
function paintAnt(p, team, caste, frame) {
    const T = TEAMS[team], b = BODY[caste], cx = 34, cy = 32, dead = frame === 4;
    const body = dead ? mix(T.lo, "#6b6258", 0.35) : T.c, hi = dead ? mix(T.c, "#8d8478", 0.4) : T.hi, lo = T.lo, ink = T.ink;
    const gx = cx - b.gaster[0] - b.thorax[0] * 0.9, hx = cx + b.thorax[0] + b.head[0] * 0.75;
    const swing = dead ? 0 : [0.42, 0.14, -0.42, -0.14][frame];
    for (let side = -1; side <= 1; side += 2) for (let leg = 0; leg < 3; leg++) {
        const phase = (leg % 2 === 0 ? 1 : -1) * side;
        const base = [0.75, 1.5, 2.3][leg], a = side * (base + swing * phase), L = b.legs * b.wide;
        const ax = cx + 4 - leg * 4, ay = cy + side * 2;
        const kx = ax + Math.cos(a) * L * 0.55, ky = ay + Math.sin(a) * L * 0.55;
        const a2 = a + side * (leg === 2 ? 0.2 : leg === 0 ? -0.45 : 0.1) * (dead ? 6 : 1);
        const fx = kx + Math.cos(a2) * L * (dead ? 0.35 : 0.72), fy = ky + Math.sin(a2) * L * (dead ? 0.35 : 0.72);
        p.line(ax, ay, kx, ky, ink, 2.4); p.line(kx, ky, fx, fy, ink, 1.7);
    }
    if (caste === 4 && !dead) {
        const flap = [1, 0.62, 0.3, 0.62][frame], wing = [0.9, 0.95, 1, 0.55];
        for (let side = -1; side <= 1; side += 2) { oval(p, cx - 17, cy + side * (5 + 11 * flap), 21, 6.5 * flap + 2, side * (0.32 + 0.3 * flap), wing, [0.72, 0.84, 0.95, 0.45]); oval(p, cx - 12, cy + side * (4 + 6 * flap), 14, 4 * flap + 1.5, side * (0.2 + 0.5 * flap), [0.95, 1, 1, 0.6]); }
    }
    // Antennae, elbowed.
    if (!dead) for (let side = -1; side <= 1; side += 2) { const ax = hx + b.head[0] * 0.5, ay = cy + side * b.head[1] * 0.55, mx = ax + 5, my = ay + side * 5; p.line(ax, ay, mx, my, ink, 1.6); p.line(mx, my, mx + 7, my - side * 2, ink, 1.4); }
    oval(p, gx, cy, b.gaster[0], b.gaster[1], 0, hi, lo);
    if (caste === 2) { oval(p, gx - 1, cy, b.gaster[0] * 0.72, b.gaster[1] * 0.72, 0, "#c9e265", "#5f8a1c"); }
    if (!dead) for (let i = -1; i <= 1; i++) p.line(gx + i * 5, cy - b.gaster[1] * 0.8, gx + i * 5, cy + b.gaster[1] * 0.8, [0, 0, 0, 0.22], 1.2);
    oval(p, cx, cy, b.thorax[0], b.thorax[1], 0, body, lo);
    if (caste === 3) { oval(p, cx - 2, cy, b.thorax[0] * 0.8, b.thorax[1] * 0.85, 0, "#efe0b8", "#a98b58"); p.line(cx - 8, cy - 3, cx + 5, cy - 3, "#7c5f35", 1); p.line(cx - 8, cy + 3, cx + 5, cy + 3, "#7c5f35", 1); }
    oval(p, hx, cy, b.head[0], b.head[1], 0, hi, body);
    if (caste === 1) for (let side = -1; side <= 1; side += 2) stroke(p, [[hx + 7, cy + side * 7], [hx + 14, cy + side * 7], [hx + 18, cy + side * 2]], ink, 3.4);
    else for (let side = -1; side <= 1; side += 2) p.line(hx + b.head[0] * 0.7, cy + side * 3, hx + b.head[0] + b.jaw * 0.6, cy + side * 1, ink, 2.2);
    if (!dead) for (let side = -1; side <= 1; side += 2) { p.circle(hx + b.head[0] * 0.3, cy + side * b.head[1] * 0.6, 2.1, "#0b0a10"); p.circle(hx + b.head[0] * 0.2, cy + side * b.head[1] * 0.6 - 0.7, 0.7, "#fff"); }
    gloss(p, gx - b.gaster[0] * 0.25, cy - b.gaster[1] * 0.45, b.gaster[0] * 0.45, 2, 0, 0.55);
    gloss(p, hx - 1, cy - b.head[1] * 0.42, b.head[0] * 0.45, 1.5, 0, 0.5);
    p.outline(ink);
}
function paintAnts(A) {
    for (let t = 0; t < TEAMS.length; t++) for (let c = 0; c < 5; c++) for (let f = 0; f < 5; f++) A.add(`ant${t}_${c}_${f}`, CELL, CELL, (p) => paintAnt(p, t, c, f));
}

// --- Food -------------------------------------------------------------------------------------------------------
function crumb(p, x, y, r, seed) {
    const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, q = r * (0.72 + ((seed * (i + 3) * 7919) % 37) / 37 * 0.42); pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q * 0.86]); }
    p.poly(pts, "#c98a3c"); oval(p, x - r * 0.1, y - r * 0.1, r * 0.66, r * 0.56, seed, "#f6d58f", "#dfa759");
}
function pores(p, n, x0, y0, w, h, c, seed = 7, s = 1) { let k = seed; for (let i = 0; i < n; i++) { k = (k * 1103515245 + 12345) & 0x7fffffff; const u = (k % 1000) / 1000; k = (k * 1103515245 + 12345) & 0x7fffffff; const v = (k % 1000) / 1000; oval(p, x0 + u * w, y0 + v * h, (1 + (i % 3)) * s, (0.8 + (i % 2)) * s, i, c); } }

const FOOD_ART = {
    crumbs(p, S) { const c = S / 2; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i * S * 0.042; crumb(p, c + Math.cos(a) * r, c + Math.sin(a) * r, S * (0.13 - i * 0.004), i + 2); } bevel(p, 3); grain(p, 0.22, 4); },
    bread(p, S) {
        const c = S / 2, r = S * 0.4; const pts = rot2([[-1, -0.9], [-0.55, -1.05], [0, -0.92], [0.55, -1.05], [1, -0.9], [0.96, 0.9], [0.8, 1], [-0.8, 1], [-0.96, 0.9]], c, c, 0.2, r);
        p.poly(pts, "#a8652a"); p.poly(rot2([[-0.85, -0.75], [-0.5, -0.9], [0, -0.78], [0.5, -0.9], [0.85, -0.75], [0.82, 0.78], [-0.82, 0.78]], c, c, 0.2, r), "#f4dfae");
        pores(p, 34, c - r * 0.7, c - r * 0.7, r * 1.4, r * 1.4, "#d9b878", 3, 1.3); bevel(p, 5); grain(p, 0.2, 3);
    },
    sandwich(p, S) {
        const c = S / 2, r = S * 0.46; const tri = [[-1, 0.72], [1, 0.72], [0.08, -0.95]], T = (k, dy = 0) => rot2(tri, c, c + dy, 0.1, r * k);
        p.poly(T(1, 8), "#b5743a"); for (let i = 0; i < 16; i++) { const k = i / 16, x = c - r + k * 2 * r, y = c + r * 0.72 + 2 + (i % 2) * 4; oval(p, x, y, r * 0.09, r * 0.05, i, "#8bcb45", "#4d9a2a"); }
        p.poly(T(0.98, 4), "#e79a9a"); p.poly(T(0.95, 2), "#ffd24d"); p.poly(T(0.92, 0), "#a8652a"); p.poly(T(0.82, -1), "#f6e3b6");
        pores(p, 46, c - r * 0.7, c - r * 0.55, r * 1.4, r * 1.2, "#dcbc80", 11, 1.5);
        oval(p, c + 3, c + 2, 9, 9, 0, "#f6f0dc", "#b9ab86"); oval(p, c + 3, c, 6.5, 6.5, 0, "#d6403a", "#7a1a20"); gloss(p, c + 1, c - 2, 2.4, 1.6);
        bevel(p, 6, 0.5, 0.5); grain(p, 0.14, 3);
    },
    cake(p, S) {
        const c = S / 2, r = S * 0.45; oval(p, c, c + 8, r, r * 0.93, 0, "#8a4b2b", "#5b2d19");
        const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, q = r * (0.93 + (i % 5 === 0 ? 0.08 : i % 3 === 0 ? -0.03 : 0.02)); pts.push([c + Math.cos(a) * q, c + Math.sin(a) * q * 0.93]); } p.poly(pts, "#ffc2d6");
        oval(p, c, c, r * 0.8, r * 0.75, 0, "#ffe3ec", "#ffb0cb");
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, x = c + Math.cos(a) * r * 0.64, y = c + Math.sin(a) * r * 0.6; oval(p, x, y, 13, 13, 0, "#fff", "#f1c3d2"); oval(p, x, y - 4, 9, 9, 0, "#e53945", "#8b1a2a"); gloss(p, x - 3, y - 7, 2.6, 1.8); }
        for (let i = 0; i < 40; i++) { const a = i * 2.4, q = (i / 40) * r * 0.5; const x = c + Math.cos(a) * q, y = c + Math.sin(a) * q; p.line(x, y, x + Math.cos(i * 1.3) * 7, y + Math.sin(i * 1.3) * 7, ["#6ee7f7", "#ffe066", "#b08cff", "#7ef29d"][i % 4], 3); }
        bevel(p, 7, 0.4, 0.5);
    },
    jam(p, S) {
        const c = S / 2; const r = S * 0.3; for (let i = 0; i < 9; i++) { const a = i * 0.7, q = r * (0.5 + (i % 3) * 0.28); oval(p, c + Math.cos(a) * q, c + Math.sin(a) * q, r * 0.55, r * 0.5, i, "#d4264e", "#7c0d2c"); } oval(p, c, c, r, r * 0.9, 0, "#e23a5e", "#8d1234");
        bevel(p, 5, 0.6, 0.45); gloss(p, c - r * 0.4, c - r * 0.45, r * 0.42, r * 0.17, -0.6, 0.85); gloss(p, c + r * 0.5, c + r * 0.3, r * 0.1, r * 0.08, 0, 0.6);
        pores(p, 7, c - r * 0.5, c - r * 0.2, r, r * 0.8, "#ffd2a0", 5, 1.4);
    },
    melon(p, S) {
        const c = S / 2, R = S * 0.46, cy = S * 0.24; const arc = (r, a0 = 0.12, a1 = 3.02) => { const o = [[c, cy - R * 0.12]]; for (let i = 0; i <= 26; i++) { const a = a0 + (a1 - a0) * i / 26; o.push([c + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
        p.poly(arc(R * 1.0), "#2f7a3a"); p.poly(arc(R * 0.93), "#83c35a"); p.poly(arc(R * 0.87), "#e8f2c2"); p.poly(arc(R * 0.82), "#ef4b5c");
        for (let i = 0; i < 11; i++) { const a = 0.3 + i * 0.235, q = R * (0.36 + (i % 3) * 0.14); oval(p, c + Math.cos(a) * q, cy + Math.sin(a) * q, 5, 3, a, "#2a1518"); }
        bevel(p, 6, 0.45, 0.45); grain(p, 0.1, 3);
    },
    lolly(p, S) {
        const c = S / 2, r = S * 0.27; for (const s of [-1, 1]) p.poly([[c + s * r * 0.9, c], [c + s * r * 1.85, c - r * 0.65], [c + s * r * 1.65, c], [c + s * r * 1.85, c + r * 0.65]], "#ffe9a8");
        oval(p, c, c, r, r, 0, "#ff5c8d", "#c21d57"); inside(p, () => { for (let i = 0; i < 6; i++) { const a = i / 6 * 3.14; p.line(c - Math.cos(a) * r, c - Math.sin(a) * r, c + Math.cos(a) * r, c + Math.sin(a) * r, "#fff3c8", 5); } });
        bevel(p, 4, 0.6, 0.4); gloss(p, c - r * 0.35, c - r * 0.45, r * 0.32, r * 0.13);
    },
    ham(p, S) {
        const c = S / 2, r = S * 0.43; oval(p, c, c, r, r * 0.8, 0.3, "#fff0e0", "#e6bfa8"); oval(p, c, c, r * 0.9, r * 0.7, 0.3, "#f08a93", "#c94f62");
        for (let i = 0; i < 6; i++) { const y = c - r * 0.45 + i * r * 0.18; stroke(p, [[c - r * 0.5, y], [c - r * 0.1, y + 6 - i], [c + r * 0.3, y - 3], [c + r * 0.55, y + 2]], "#ffc4c2", 2.2); }
        bevel(p, 5, 0.45, 0.45); grain(p, 0.15, 3);
    },
    sausage(p, S) {
        const c = S / 2, r = S * 0.34; const pts = []; for (let i = 0; i <= 16; i++) { const a = 3.5 + i / 16 * 2.4; pts.push([c + Math.cos(a) * r * 1.05, c + 28 + Math.sin(a) * r * 1.05]); }
        stroke(p, pts, "#6b2d17", S * 0.27); stroke(p, pts, "#a8522a", S * 0.22);
        for (let i = 2; i < 15; i += 3) { const q = pts[i]; p.line(q[0] - 7, q[1] - 11, q[0] + 7, q[1] + 11, "#4a1c0c", 3.4); }
        bevel(p, 7, 0.55, 0.45); stroke(p, pts.slice(2, 14).map(([x, y]) => [x - 2, y - 11]), [1, 1, 1, 0.35], 3);
    },
    beetle(p, S) {
        const c = S / 2; for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) stroke(p, [[c + i * 12, c + s * 8], [c + i * 15 + 3, c + s * 22], [c + i * 10, c + s * 18]], "#1c1420", 2.6);
        oval(p, c, c, S * 0.33, S * 0.24, 0, "#3f4a6b", "#141a30"); p.line(c - S * 0.28, c, c + S * 0.28, c, "#0c0f1e", 2); oval(p, c + S * 0.3, c, 7, 7, 0, "#2b3149", "#101426"); bevel(p, 3); gloss(p, c - 6, c - 8, 9, 2.4, 0, 0.5);
    },
    gherkin(p, S) {
        const c = S / 2; oval(p, c, c, S * 0.43, S * 0.2, 0.5, "#8db33a", "#3e6b1c");
        inside(p, () => { for (let i = 0; i < 54; i++) { const a = i * 2.4, q = (i % 12) * S * 0.035; const x = c + Math.cos(0.5) * q * Math.cos(a) * 1.2 - 0, y = c + Math.sin(0.5) * q * Math.cos(a) + Math.sin(a) * S * 0.14; oval(p, x, y, 3.4, 3.4, 0, "#b6d868", "#59852a"); } });
        bevel(p, 6, 0.5, 0.45); gloss(p, c - 16, c - 16, 20, 3.5, 0.5, 0.5);
    },
    lemon(p, S) {
        const c = S / 2, r = S * 0.4; oval(p, c, c, r, r, 0, "#ffd93b", "#e7a913"); oval(p, c, c, r * 0.88, r * 0.88, 0, "#fff6c8");
        for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, b = a + 0.66, k = r * 0.8; p.poly([[c + Math.cos(a + 0.1) * 6, c + Math.sin(a + 0.1) * 6], [c + Math.cos(a + 0.05) * k, c + Math.sin(a + 0.05) * k], [c + Math.cos((a + b) / 2) * k * 1.03, c + Math.sin((a + b) / 2) * k * 1.03], [c + Math.cos(b) * k, c + Math.sin(b) * k]], "#ffe25a"); }
        bevel(p, 4, 0.4, 0.4);
    },
    scraps(p, S) { const c = S / 2; for (let i = 0; i < 7; i++) oval(p, c + Math.cos(i * 2.4) * i * 3, c + Math.sin(i * 2.4) * i * 3, 7 - i * 0.4, 5, i, "#8c3b34", "#4d1a18"); bevel(p, 2); },
};
const FOOD_SIZE = { crumbs: 120, bread: 170, sandwich: 300, cake: 340, jam: 130, melon: 230, lolly: 150, ham: 170, sausage: 200, beetle: 90, gherkin: 170, lemon: 130, scraps: 60 };

// --- Scenery ----------------------------------------------------------------------------------------------------
const PROP_ART = {
    can(p, W, H) {
        const y0 = 30, y1 = H - 30, x0 = 30, x1 = W - 30, mid = (y0 + y1) / 2; p.rect(x0 + 8, y0, x1 - x0 - 16, y1 - y0, "#e85a4f"); oval(p, x1 - 8, mid, 16, (y1 - y0) / 2, 0, "#d7dbe2", "#8d94a3"); oval(p, x1 - 7, mid, 11, (y1 - y0) / 2 - 8, 0, "#6d7586", "#aab1be"); oval(p, x0 + 8, mid, 10, (y1 - y0) / 2, 0, "#c9ced8", "#858c9b");
        inside(p, () => { p.rect(x0 + 40, y0, 34, y1 - y0, "#fff0d0"); p.rect(x0 + 84, y0, 14, y1 - y0, "#fff0d0"); for (let i = 0; i < 26; i++) oval(p, x0 + 120 + (i * 37 % 90), y0 + 8 + (i * 61 % (y1 - y0 - 16)), 3, 3, 0, [1, 1, 1, 0.5]); });
        const d = p.data; for (let y = y0; y < y1; y++) { const k = (y - y0) / (y1 - y0), l = Math.pow(1 - Math.abs(k - 0.3) * 1.4, 2); for (let x = x0; x < x1 - 8; x++) { const o = (x + y * W) * 4; if (!d[o + 3]) continue; const m = 0.5 + l * 0.75; d[o] = Math.min(255, d[o] * m); d[o + 1] = Math.min(255, d[o + 1] * m); d[o + 2] = Math.min(255, d[o + 2] * m); } }
        castShadow(p, 12, 18, 7, 0.45);
    },
    plate(p, W) {
        const c = W / 2, r = W * 0.45; oval(p, c, c, r, r, 0, "#ffffff", "#d7dbe6"); oval(p, c, c, r * 0.72, r * 0.72, 0, "#cdd3e0", "#fbfcff"); oval(p, c, c, r * 0.66, r * 0.66, 0, "#f1f3f9", "#e3e7f1");
        for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; oval(p, c + Math.cos(a) * r * 0.86, c + Math.sin(a) * r * 0.86, 7, 7, 0, "#6fb6d9", "#3b84ad"); }
        gloss(p, c - r * 0.5, c - r * 0.55, r * 0.26, r * 0.07, -0.75, 0.75); stroke(p, [[c - 30, c + 20], [c, c + 30], [c + 40, c + 8]], "#c9524a", 6); castShadow(p, 12, 16, 8, 0.4);
    },
    jar(p, W) {
        const c = W / 2, r = W * 0.42; oval(p, c, c, r, r, 0, "#b9d6a0", "#5c8a4e"); oval(p, c, c, r * 0.8, r * 0.8, 0, "#e8ebef", "#9aa3b1");
        for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283; p.line(c + Math.cos(a) * r * 0.8, c + Math.sin(a) * r * 0.8, c + Math.cos(a) * r * 0.74, c + Math.sin(a) * r * 0.74, "#868e9c", 2); }
        oval(p, c, c, r * 0.52, r * 0.52, 0, "#ffd24d", "#e0961f"); gloss(p, c - r * 0.45, c - r * 0.45, r * 0.25, r * 0.08, -0.75, 0.8); castShadow(p, 14, 18, 8, 0.42);
    },
    apple(p, W) {
        const c = W / 2; oval(p, c, c, W * 0.2, W * 0.4, 0.2, "#fff4cf", "#dbb878"); oval(p, c - 4, c - W * 0.34, W * 0.26, W * 0.13, 0.2, "#d6333c", "#821824"); oval(p, c + 8, c + W * 0.34, W * 0.26, W * 0.13, 0.2, "#c92c36", "#7b1520");
        for (const k of [-1, 1]) oval(p, c + k * 6, c + k * 6, 3.5, 6.5, 0.2, "#3f2412"); p.line(c - 14, c - W * 0.42, c - 22, c - W * 0.5, "#4b2c14", 4); bevel(p, 5, 0.5, 0.4); castShadow(p, 9, 12, 5, 0.42);
    },
    pot(p, W) {
        const c = W / 2, r = W * 0.42; oval(p, c, c, r, r, 0, "#e88a58", "#a24a26"); oval(p, c, c, r * 0.8, r * 0.8, 0, "#6b3a20", "#c06a3c"); oval(p, c + 2, c + 2, r * 0.74, r * 0.74, 0, "#3f2a1c", "#2c1c12"); grain(p, 0.28, 4);
        for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + 0.3, l = r * 0.42 + (i % 3) * 8; oval(p, c + Math.cos(a) * l * 0.55, c + Math.sin(a) * l * 0.55, l * 0.55, 8.5, a, "#6fb04a", "#2d6b30"); } castShadow(p, 16, 20, 9, 0.42);
    },
    stone(p, W, H) {
        const c = W / 2, m = H / 2, pts = []; for (let i = 0; i < 13; i++) { const a = i / 13 * 6.283, q = 0.8 + ((i * 7919) % 17) / 17 * 0.2; pts.push([c + Math.cos(a) * W * 0.4 * q, m + Math.sin(a) * H * 0.38 * q]); } p.poly(pts, "#a39f97"); bevel(p, 7, 0.6, 0.55); grain(p, 0.32, 3); castShadow(p, 10, 13, 5, 0.45);
    },
    shades(p, W, H) {
        const c = W / 2, m = H / 2; for (const k of [-1, 1]) { oval(p, c + k * 46, m, 42, 32, 0, "#2a2a38", "#0c0c14"); gloss(p, c + k * 46 - 14, m - 14, 16, 4.5, -0.5, 0.55); } p.line(c - 10, m - 10, c + 10, m - 10, "#2a2a38", 7); bevel(p, 2, 0.4, 0.3); castShadow(p, 8, 14, 5, 0.42);
    },
    fork(p, W, H) {
        const c = H / 2, x0 = 18; stroke(p, [[x0, c], [W * 0.6, c]], "#c7ced8", 16); oval(p, W * 0.68, c, 34, 22, 0, "#dde2ea", "#9ea7b5"); for (const k of [-2, -1, 1, 2]) p.line(W * 0.7, c + k * 7, W - 16, c + k * 7, "#cfd5de", 6); bevel(p, 2, 0.75, 0.45); castShadow(p, 7, 11, 4, 0.42);
    },
    trowel(p, W, H) {
        const c = H / 2; p.line(16, c, W * 0.34, c, "#7c4a26", 22); p.line(W * 0.32, c, W * 0.46, c, "#a9afb9", 9); p.poly([[W * 0.44, c - 34], [W * 0.78, c - 26], [W - 14, c], [W * 0.78, c + 26], [W * 0.44, c + 34]], "#b9c0cb"); bevel(p, 3, 0.65, 0.45); grain(p, 0.1, 3); castShadow(p, 8, 13, 4, 0.42);
    },
    mushroom(p, W) { const c = W / 2, r = W * 0.42; oval(p, c, c, r, r, 0, "#e3564e", "#8e2224"); for (let i = 0; i < 9; i++) { const a = i * 2.4, q = i * 4.5; oval(p, c + Math.cos(a) * q, c + Math.sin(a) * q, 6.5 - i * 0.2, 5.5, a, "#fff4df", "#e0d3b8"); } bevel(p, 5, 0.55, 0.45); castShadow(p, 10, 13, 5, 0.42); },
    log(p, W, H) {
        const m = H / 2; p.line(38, m, W - 42, m, "#6b4526", H * 0.62); inside(p, () => { for (let i = 0; i < 22; i++) { const y = m - H * 0.3 + i * H * 0.03; p.line(30, y, W - 36, y + ((i * 13) % 7) - 3, i % 3 ? "#54351c" : "#8a6238", 2); } });
        oval(p, W - 42, m, 14, H * 0.31, 0, "#d9b784", "#a57f4d"); for (const r of [0.2, 0.12, 0.06]) { oval(p, W - 42, m, 14 * r * 3, H * r, 0, [0.5, 0.33, 0.17, 0.5]); oval(p, W - 42, m, 14 * r * 2.4, H * r * 0.75, 0, "#d9b784"); } bevel(p, 6, 0.3, 0.45); castShadow(p, 10, 14, 6, 0.42);
    },
    flipflop(p, W, H) {
        const m = H / 2; const pts = []; for (let i = 0; i < 28; i++) { const a = i / 28 * 6.283, l = Math.cos(a) > 0 ? 1 : 0.9; pts.push([W / 2 + Math.cos(a) * W * 0.44, m + Math.sin(a) * H * 0.36 * (0.76 + 0.24 * Math.cos(a) * l)]); } p.poly(pts, "#2fb7b0"); bevel(p, 4, 0.5, 0.45); grain(p, 0.1, 3);
        oval(p, W * 0.46, m, W * 0.3, H * 0.24, 0, [0, 0, 0, 0.12]); stroke(p, [[W * 0.74, m], [W * 0.54, m - H * 0.26], [W * 0.5, m - H * 0.3]], "#ff7a59", 9); stroke(p, [[W * 0.74, m], [W * 0.54, m + H * 0.26], [W * 0.5, m + H * 0.3]], "#ff7a59", 9); castShadow(p, 8, 12, 5, 0.4);
    },
    napkin(p, W) { const c = W / 2, r = W * 0.42; p.poly(rot2([[-1, -1], [1, -0.93], [0.96, 1], [-0.94, 0.95]], c, c, 0.2, r), "#fbf2db"); inside(p, () => { for (let i = -3; i <= 3; i++) { const k = i * 25; p.line(c + k - r, c - r, c + k + r * 0.2, c + r, "#ff7a59aa", 3); p.line(c + k + r, c - r, c + k - r * 0.2, c + r, "#ff7a59aa", 3); } }); bevel(p, 6, 0.4, 0.2); castShadow(p, 4, 6, 3, 0.3); },
    leaf(p, W) { const c = W / 2; oval(p, c, c, W * 0.44, W * 0.2, 0.5, "#a4b83e", "#55781f"); stroke(p, [[c - W * 0.38, c - W * 0.2], [c + W * 0.38, c + W * 0.2]], "#3e5a16", 2.5); for (let i = -3; i <= 3; i++) { const x = c + i * W * 0.08, y = c + i * W * 0.04; p.line(x, y, x + 6, y - W * 0.13, "#3e5a16", 1.5); p.line(x, y, x - 6, y + W * 0.13, "#3e5a16", 1.5); } castShadow(p, 3, 5, 2, 0.3); },
    daisy(p, W) { const c = W / 2; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; oval(p, c + Math.cos(a) * W * 0.26, c + Math.sin(a) * W * 0.26, W * 0.2, W * 0.08, a, "#ffffff", "#dce2f0"); } oval(p, c, c, W * 0.14, W * 0.14, 0, "#ffd84d", "#e49a1a"); castShadow(p, 3, 5, 2, 0.32); },
    clover(p, W) { const c = W / 2; for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283 + 0.4, x = c + Math.cos(a) * W * 0.2, y = c + Math.sin(a) * W * 0.2; oval(p, x, y, W * 0.2, W * 0.2, 0, "#74c452", "#2f7f35"); oval(p, x, y, W * 0.1, W * 0.1, 0, [1, 1, 1, 0.18]); } castShadow(p, 3, 4, 2, 0.3); },
    twig(p, W, H) { const m = H / 2; stroke(p, [[10, m + 6], [W * 0.4, m - 4], [W * 0.7, m + 2], [W - 8, m - 10]], "#5f4227", 8); stroke(p, [[W * 0.5, m - 2], [W * 0.62, m - 16]], "#5f4227", 5); bevel(p, 2, 0.4, 0.3); castShadow(p, 3, 5, 2, 0.32); },
};
const PROP_SIZE = { can: [320, 150], plate: [290], jar: [190], apple: [150], pot: [210], stone: [160, 130], stone2: [120, 96], shades: [270, 120], fork: [280, 100], trowel: [300, 110], mushroom: [130], log: [320, 130], flipflop: [290, 170], napkin: [230], leaf: [130], daisy: [90], clover: [76], twig: [180, 60] };
PROP_ART.stone2 = PROP_ART.stone;

// --- Creatures ----------------------------------------------------------------------------------------------------
function paintSpider(p, frame) {
    const S = p.width, c = S / 2, ink = "#170f18";
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 4; i++) {
        const phase = ((i + frame) % 2 ? 1 : -1) * side * (frame % 2 ? 0.14 : -0.14), a = side * (0.65 + i * 0.62 + phase), L = 54;
        const kx = c + 12 + Math.cos(a) * L, ky = c + Math.sin(a) * L, a2 = a + side * (i < 2 ? -0.5 : 0.5), fx = kx + Math.cos(a2) * L * 0.95, fy = ky + Math.sin(a2) * L * 0.95;
        p.line(c + 12, c + side * 6, kx, ky, ink, 7.5); p.line(kx, ky, fx, fy, ink, 4.6); oval(p, kx, ky, 4.4, 4.4, 0, "#4a3138");
    }
    oval(p, c - 26, c, 40, 32, 0, "#47333d", "#150c14"); for (let i = 0; i < 5; i++) oval(p, c - 54 + i * 13, c, 5.5, 13 - i, 0, "#ffa23a", "#b14f18"); oval(p, c + 20, c, 25, 22, 0, "#3b2a33", "#150c14");
    for (let i = 0; i < 90; i++) { const a = i * 2.4, q = 8 + (i % 20) * 2.2; const x = c - 26 + Math.cos(a) * q, y = c + Math.sin(a) * q * 0.8; p.line(x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5, "#6a5560", 1.2); }
    for (const [x, y, r] of [[38, -9, 6], [38, 9, 6], [32, -17, 3.6], [32, 17, 3.6], [42, -3, 3], [42, 3, 3]]) { oval(p, c + x, c + y, r, r, 0, "#ff4d4d", "#8f0d17"); oval(p, c + x - 1, c + y - 1.5, r * 0.3, r * 0.3, 0, "#fff"); }
    for (const k of [-1, 1]) stroke(p, [[c + 40, c + k * 8], [c + 52, c + k * 10], [c + 58, c + k * 3]], "#26161f", 4.6);
    bevel(p, 3, 0.3, 0.3);
}
function paintLadybird(p, frame) {
    const S = p.width, c = S / 2, ink = "#16101a";
    for (let side = -1; side <= 1; side += 2) for (let i = -1; i <= 1; i++) { const off = ((i + frame) % 2 ? 4 : -4); p.line(c + i * 16, c + side * 18, c + i * 22 + off, c + side * 36, ink, 3.6); }
    oval(p, c + 25, c, 14, 16, 0, "#1b1820", "#0a080d"); for (const k of [-1, 1]) { oval(p, c + 29, c + k * 10, 5, 4, 0, "#fff8e8"); stroke(p, [[c + 36, c + k * 5], [c + 46, c + k * 12]], ink, 2.4); }
    oval(p, c - 3, c, 31, 28, 0, "#ff4a3f", "#a81520"); p.line(c - 33, c, c + 25, c, ink, 2.6);
    for (const [x, y, r] of [[8, -13, 6.5], [8, 13, 6.5], [-13, -15, 6.5], [-13, 15, 6.5], [-3, -7, 4], [-3, 7, 4], [-22, -5, 3.6], [-22, 5, 3.6]]) oval(p, c + x, c + y, r, r, 0, "#1b1820");
    bevel(p, 4, 0.55, 0.4); gloss(p, c - 10, c - 14, 14, 3.5, -0.2, 0.6); p.outline(ink);
}
/** Gary's hand, palm down, reaching in from below. */
function paintHand(p, open) {
    const W = p.width, H = p.height, c = W / 2, skin = "#f2bb94", deep = "#c98862";
    const wrist = H - 8; p.poly([[c - 72, wrist], [c + 72, wrist], [c + 86, H * 0.56], [c - 86, H * 0.56]], "#3a6fb5"); inside(p, () => { for (let i = 0; i < 9; i++) p.line(c - 90 + i * 24, H * 0.5, c - 90 + i * 24, H, "#2d5a97", 5); });
    oval(p, c, H * 0.47, 96, 84, 0, skin, deep);
    const fingers = open ? [[-70, -96, -0.42], [-30, -128, -0.14], [14, -134, 0.06], [56, -116, 0.24]] : [[-44, -80, -0.26], [-16, -92, -0.09], [12, -92, 0.08], [38, -80, 0.24]];
    for (const [fx, fy, a] of fingers) {
        const x0 = c + fx * 0.72, y0 = H * 0.4, x1 = c + fx, y1 = H * 0.42 + fy; p.line(x0, y0, x1, y1, deep, 42); p.line(x0 - 1, y0, x1 - 1, y1 - 1, skin, 37);
        oval(p, x1, y1 - 8, 12, 16, a, "#ffe6d6", "#e8b8a0"); gloss(p, x1 - 3, y1 - 14, 4, 2, a, 0.6); for (const k of [0.45, 0.72]) { const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; p.line(x - 12, y, x + 12, y + 1, "#c98862aa", 2); }
    }
    const tx = open ? c + 128 : c + 66, ty = open ? H * 0.42 : H * 0.28; p.line(c + 62, H * 0.6, tx, ty, deep, 48); p.line(c + 61, H * 0.6, tx - 1, ty, skin, 43); oval(p, tx + 2, ty - 8, 13, 17, 0.5, "#ffe6d6", "#e8b8a0");
    for (let i = 0; i < 40; i++) { const x = c - 60 + (i * 53 % 120), y = H * 0.48 + (i * 37 % 60); p.line(x, y, x + 3, y + 7, "#8a5a3c88", 1.3); }
    bevel(p, 9, 0.35, 0.5); grain(p, 0.08, 2);
}
/** A colossal trainer from above: the sole comes down on you, so what you see is the top of the shoe rising and falling. */
function paintShoe(p, left) {
    const W = p.width, H = p.height, m = H / 2; const out = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283, cs = Math.cos(a), toe = cs > 0 ? 1 : 0.84; out.push([W / 2 + cs * W * 0.46, m + Math.sin(a) * H * 0.42 * toe * (left ? 1 : 1)]); }
    p.poly(out, "#f3f0e8"); inside(p, () => { p.rect(0, 0, W, H, "#ece8dc"); });
    oval(p, W * 0.5, m, W * 0.43, H * 0.35, 0, "#e84a4a", "#a01f33"); oval(p, W * 0.8, m, W * 0.13, H * 0.3, 0, "#fff", "#d9d4c8"); oval(p, W * 0.34, m, W * 0.18, H * 0.2, 0, "#3a2a2c", "#1a1214"); oval(p, W * 0.34, m, W * 0.14, H * 0.15, 0, "#584144", "#2a1c1e");
    for (let i = 0; i < 5; i++) { const x = W * (0.5 + i * 0.05); p.line(x, m - H * 0.16, x + 4, m + H * 0.16, "#fff8e8", 7); }
    bevel(p, 8, 0.45, 0.5); grain(p, 0.08, 3);
}

// --- Nest mounds --------------------------------------------------------------------------------------------------
function paintNest(p, team, dead) {
    const S = p.width, c = S / 2, T = TEAMS[team];
    const pts = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, q = 0.86 + ((i * 7919) % 23) / 23 * 0.14; pts.push([c + Math.cos(a) * S * 0.43 * q, c + Math.sin(a) * S * 0.41 * q]); } p.poly(pts, dead ? "#6a5a4c" : "#94683c"); bevel(p, 22, 0.42, 0.55); grain(p, 0.34, 2);
    for (let i = 0; i < 150; i++) { const a = i * 2.4, q = S * 0.08 + (i % 41) * S * 0.0082; const x = c + Math.cos(a) * q, y = c + Math.sin(a) * q; oval(p, x, y, 2.5 + i % 3, 2 + i % 2, a, i % 3 ? "#b98a55" : "#6e4a28"); }
    bevel(p, 2, 0.25, 0.25);
    if (!dead) {
        oval(p, c + 2, c + 3, S * 0.14, S * 0.125, 0, "#2c170c"); oval(p, c, c, S * 0.13, S * 0.115, 0, "#120806", "#3a2012"); glow(p, c, c, S * 0.13, T.c + "55", 1.5);
        // Team banner on a stick, the colony's only vanity.
        const fx = c + S * 0.2, fy = c - S * 0.2; p.line(fx, fy + S * 0.14, fx, fy - S * 0.13, "#3e2613", 5); p.poly([[fx + 2, fy - S * 0.13], [fx + S * 0.15, fy - S * 0.09], [fx + S * 0.05, fy - S * 0.055], [fx + S * 0.15, fy - S * 0.015], [fx + 2, fy - S * 0.02]], T.c); p.line(fx + 2, fy - S * 0.13, fx + S * 0.15, fy - S * 0.09, T.hi, 2.4);
    } else { for (let i = 0; i < 6; i++) { const a = i * 1.1; p.line(c + Math.cos(a) * 16, c + Math.sin(a) * 16, c + Math.cos(a) * 48, c + Math.sin(a) * 48, "#3a2c20", 4); } oval(p, c, c, S * 0.1, S * 0.09, 0, "#24180f"); }
    castShadow(p, 9, 12, 6, 0.4);
}

// --- Little effects -----------------------------------------------------------------------------------------------
function paintFx(A) {
    const white = "#ffffff";
    A.add("shadow", 48, 48, (p) => glow(p, 24, 24, 24, [0, 0, 0, 1], 1.5));
    A.add("dot", 32, 32, (p) => glow(p, 16, 16, 16, white, 2));
    A.add("disc", 32, 32, (p) => oval(p, 16, 16, 14, 14, 0, white));
    A.add("ring", 96, 96, (p) => { oval(p, 48, 48, 46, 46, 0, white); const d = p.data; for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { const r = Math.hypot(x + 0.5 - 48, y + 0.5 - 48); d[(x + y * 96) * 4 + 3] *= Math.max(0, Math.min(1, r - 40)); } });
    A.add("spark", 32, 32, (p) => { p.poly([[16, 1], [19, 13], [31, 16], [19, 19], [16, 31], [13, 19], [1, 16], [13, 13]], white); });
    A.add("puff", 64, 64, (p) => { for (let i = 0; i < 7; i++) { const a = i * 1.9; glow(p, 32 + Math.cos(a) * 12, 32 + Math.sin(a) * 12, 18, [1, 1, 1, 0.7], 1.2); } });
    A.add("chip", 16, 16, (p) => p.poly([[3, 3], [13, 5], [12, 13], [4, 12]], white));
    for (let k = 0; k < 2; k++) A.add(`splat${k}`, 96, 96, (p) => { for (let i = 0; i < 16; i++) { const a = i * (2.4 + k), q = 6 + (i * 7 % 34); oval(p, 48 + Math.cos(a) * q, 48 + Math.sin(a) * q, 12 - (i % 9), 7 - (i % 5), a, white); } oval(p, 48, 48, 18, 16, k, white); });
    A.add("print", 256, 120, (p) => { const m = 60; const out = []; for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; out.push([128 + Math.cos(a) * 118, m + Math.sin(a) * 50]); } p.poly(out, [1, 1, 1, 0.55]); inside(p, () => { for (let x = 8; x < 250; x += 16) p.line(x, 0, x, 120, [0, 0, 0, 0.0], 6); }); const d = p.data; for (let y = 0; y < 120; y++) for (let x = 0; x < 256; x++) { if ((x + y) % 18 < 7) d[(x + y * 256) * 4 + 3] *= 0.4; } });
    // Trail marks.
    A.add("chev", 32, 32, (p) => { stroke(p, [[8, 5], [23, 16], [8, 27]], white, 6); });
    A.add("beat", 32, 32, (p) => glow(p, 16, 16, 16, white, 1.1));
    A.add("bit0", 16, 16, (p) => { oval(p, 8, 8, 5.5, 4.6, 0.4, "#f6d58f", "#b77b34"); p.outline("#5a3514"); });
    A.add("bit1", 16, 16, (p) => { oval(p, 8, 8, 5, 5, 0, "#ff8fb4", "#c4265f"); oval(p, 6, 6, 1.6, 1.2, 0, white); p.outline("#5e0f2c"); });
    A.add("bit2", 16, 16, (p) => { oval(p, 8, 8, 5.5, 4.4, 0.5, "#ec7a7a", "#9c2c30"); p.outline("#4b1012"); });
    A.add("bit3", 16, 16, (p) => { oval(p, 8, 8, 5.5, 4, 0.8, "#b6d868", "#5f8a1c"); p.outline("#2d4a0e"); });
    A.add("spit", 32, 32, (p) => { glow(p, 16, 16, 16, "#d6f25a", 1.3); oval(p, 16, 16, 7, 7, 0, "#f0ff9a", "#8cc21e"); });
    A.add("web", 512, 512, (p) => {
        const c = 256; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + 0.1; p.line(c, c, c + Math.cos(a) * 250, c + Math.sin(a) * 250, [1, 1, 1, 0.42], 2.2); }
        for (let r = 34; r < 250; r += 30) for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + 0.1, b = a + 6.283 / 12; const ax = c + Math.cos(a) * r, ay = c + Math.sin(a) * r, bx = c + Math.cos(b) * r, by = c + Math.sin(b) * r, mx = (ax + bx) / 2 * 0.97 + c * 0.03, my = (ay + by) / 2 * 0.97 + c * 0.03; stroke(p, [[ax, ay], [mx, my], [bx, by]], [1, 1, 1, 0.34], 1.7); }
    });
    // Trail head badges.
    const badge = (name, col, dark, art) => A.add(name, 96, 96, (p) => { oval(p, 48, 48, 42, 42, 0, col, dark); oval(p, 48, 48, 34, 34, 0, [1, 1, 1, 0.16]); art(p); bevel(p, 3, 0.4, 0.3); p.outline("#1b1420"); p.outline("#1b1420"); });
    badge("headGather", "#ffd166", "#d98a1e", (p) => { crumb(p, 48, 50, 19, 3); });
    badge("headAttack", "#ff5a5a", "#a8182c", (p) => { for (const k of [-1, 1]) { stroke(p, [[48 + k * 26, 70], [48 + k * 24, 46], [48 + k * 4, 26]], "#2a0c12", 9); stroke(p, [[48 + k * 26, 70], [48 + k * 24, 46], [48 + k * 4, 26]], "#ffe9d6", 4.5); } });
    badge("headGuard", "#6cc7ff", "#1f6fc0", (p) => { p.poly([[48, 22], [72, 30], [70, 54], [48, 76], [26, 54], [24, 30]], "#10304e"); p.poly([[48, 29], [65, 35], [63, 52], [48, 68], [33, 52], [31, 35]], "#e4f5ff"); });
}

export function paintWorld(assets) {
    const A = new Atlas("world", 2048, 2048);
    paintAnts(A); paintFx(A);
    for (const [k, S] of Object.entries(FOOD_SIZE)) A.add(`food_${k}`, S, S, (p) => { FOOD_ART[k](p, S); if (S > 80) castShadow(p, Math.round(S * 0.05), Math.round(S * 0.065), Math.round(S * 0.03), 0.42); else p.outline("#3a1c08"); });
    for (const [k, [w, h]] of Object.entries(PROP_SIZE)) A.add(`prop_${k}`, w, h ?? w, (p) => PROP_ART[k](p, w, h ?? w), { worldW: PROPS[k].w });
    for (let f = 0; f < 4; f++) A.add(`spider${f}`, 240, 240, (p) => { paintSpider(p, f); castShadow(p, 8, 10, 4, 0.4); });
    for (let f = 0; f < 2; f++) A.add(`ladybird${f}`, 110, 110, (p) => { paintLadybird(p, f); castShadow(p, 5, 7, 3, 0.4); });
    A.add("handOpen", 400, 420, (p) => paintHand(p, true)); A.add("handGrab", 400, 420, (p) => paintHand(p, false));
    A.add("shoe", 420, 190, (p) => paintShoe(p, true));
    for (let t = 0; t < TEAMS.length; t++) A.add(`nest${t}`, 230, 230, (p) => paintNest(p, t, false));
    A.add("nestDead", 230, 230, (p) => paintNest(p, 0, true));
    A.bake(assets);
    return A.map;
}

// --- Faces, the queen, the nest in section: all UI, all on their own sheet --------------------------------------------
function paintFace(p, o) {
    const S = p.width, c = S / 2, T = o.t, ink = T.ink, cy = S * 0.56;
    glow(p, c, S * 0.5, S * 0.5, T.c + "44", 1.2);
    // Antennae, then a big round head, front on.
    for (const k of [-1, 1]) { stroke(p, [[c + k * 34, cy - 60], [c + k * 62, cy - 92], [c + k * 40, cy - 112]], ink, 7); oval(p, c + k * 40, cy - 112, 7, 7, 0, T.hi, T.c); }
    oval(p, c, S * 1.02, S * 0.34, S * 0.26, 0, T.c, T.lo);
    if (o.mandible !== false) for (const k of [-1, 1]) stroke(p, [[c + k * 28, cy + 44], [c + k * 34, cy + 66], [c + k * 8, cy + 70]], ink, 9 * (o.jaw ?? 1));
    oval(p, c, cy, S * 0.36, S * 0.33, 0, T.hi, T.lo);
    oval(p, c, cy + 6, S * 0.3, S * 0.27, 0, T.c, mix(T.c, T.lo, 0.6));
    bevel(p, 5, 0.4, 0.4);
    const ey = cy - 8 + (o.eyeY ?? 0), ew = o.eye ?? 21;
    for (const k of [-1, 1]) {
        oval(p, c + k * 28, ey, ew, ew * (o.squint ?? 1.05), 0, "#fff", "#dfe3ee"); const lk = o.look ?? 3;
        oval(p, c + k * 28 + lk, ey + 3, ew * 0.56, ew * 0.6 * (o.squint ?? 1), 0, "#1c1420"); oval(p, c + k * 28 + lk - 4, ey - 3, 3.6, 3.6, 0, "#fff");
        if (o.brow) p.line(c + k * 8, ey - 18 + (o.brow > 0 ? 8 : -6), c + k * 50, ey - 24 + (o.brow > 0 ? -6 : 8), ink, 7);
    }
    if (o.smile) stroke(p, [[c - 18, cy + 34], [c, cy + 42], [c + 18, cy + 34]], ink, 4.5); else p.line(c - 14, cy + 38, c + 14, cy + 38, ink, 4.5);
    o.extra?.(p, c, cy, S);
    p.outline(ink); p.outline(ink);
}
const crown = (col, gem) => (p, c, cy) => { const y = cy - 58; p.poly([[c - 44, y + 24], [c - 50, y - 16], [c - 24, y + 4], [c, y - 26], [c + 24, y + 4], [c + 50, y - 16], [c + 44, y + 24]], col); for (const x of [-30, 0, 30]) oval(p, c + x, y + 14, 6, 6, 0, gem, "#7a1a20"); p.line(c - 44, y + 22, c + 44, y + 22, "#fff3b0", 4); };
const FACES = {
    faceQueen: { t: TEAMS[0], smile: true, extra: crown("#ffcf4d", "#e03f54") },
    facePinch: { t: TEAMS[0], brow: 1, jaw: 1.5, eye: 18, extra: (p, c, cy) => { p.poly([[c - 54, cy - 46], [c + 54, cy - 46], [c + 42, cy - 76], [c - 42, cy - 76]], "#4c6b3a"); p.line(c - 60, cy - 44, c + 60, cy - 44, "#2f4524", 8); } },
    faceNibbs: { t: { ...TEAMS[0], c: "#dca060", hi: "#ffdca8", lo: "#8a5a2c" }, smile: true, eye: 16, extra: (p, c, cy) => { for (const k of [-1, 1]) { const d = p.data; oval(p, c + k * 28, cy - 8, 25, 25, 0, [0.7, 0.9, 1, 0.26]); stroke(p, Array.from({ length: 25 }, (_, i) => [c + k * 28 + Math.cos(i / 24 * 6.283) * 25, cy - 8 + Math.sin(i / 24 * 6.283) * 25]), "#2a1a10", 4); } p.line(c - 4, cy - 8, c + 4, cy - 8, "#2a1a10", 4); } },
    faceCinder: { t: TEAMS[1], brow: 1, smile: true, extra: (p, c, cy) => { p.line(c + 8, cy - 48, c + 56, cy + 8, "#c23b3b", 9); oval(p, c - 28, cy - 8, 25, 25, 0, "#d9c25c", "#8a7420"); oval(p, c - 26, cy - 5, 11, 11, 0, "#1c1420"); } },
    facePip: { t: TEAMS[2], smile: true, squint: 0.7, brow: -1, extra: (p, c, cy) => { oval(p, c, cy - 56, 56, 12, 0, "#7c3aa8", "#4a1c6c"); oval(p, c, cy - 68, 30, 20, 0, "#9450c8", "#5e2a8a"); stroke(p, [[c + 20, cy - 80], [c + 42, cy - 110], [c + 60, cy - 100]], "#ffd24d", 6); } },
    faceChalk: { t: TEAMS[3], squint: 0.45, eye: 18, extra: (p, c, cy) => { for (let i = 0; i < 7; i++) { const x = c - 30 + i * 10; stroke(p, [[x, cy + 36], [x - 3 + i, cy + 62 + (i % 2) * 8]], "#fffdf0", 6); } } },
    faceEmpress: { t: TEAMS[4], brow: 1, squint: 0.8, smile: true, extra: crown("#c9d4e6", "#a6e22e") },
};

function paintQueen(p) {
    const W = p.width, H = p.height, cy = H / 2, T = TEAMS[0], ink = T.ink;
    for (const k of [-1, 1]) for (let i = 0; i < 3; i++) { const x = W * 0.68 - i * 34; stroke(p, [[x, cy + k * 18], [x + 10 - i * 16, cy + k * 52], [x + 26 - i * 34, cy + k * 74]], ink, 6); }
    oval(p, W * 0.32, cy, W * 0.29, H * 0.31, 0, T.hi, T.lo); for (let i = 1; i < 6; i++) { const x = W * 0.08 + i * W * 0.085; p.line(x, cy - H * 0.27 + Math.abs(i - 3) * 8, x + 3, cy + H * 0.27 - Math.abs(i - 3) * 8, [0, 0, 0, 0.18], 3); }
    oval(p, W * 0.67, cy, W * 0.11, H * 0.17, 0, T.c, T.lo); oval(p, W * 0.82, cy, W * 0.095, H * 0.17, 0, T.hi, T.c); bevel(p, 7, 0.45, 0.45);
    for (const k of [-1, 1]) { oval(p, W * 0.86, cy + k * 18, 9, 9, 0, "#fff"); oval(p, W * 0.87, cy + k * 18, 5, 5, 0, "#1c1420"); stroke(p, [[W * 0.89, cy + k * 24], [W * 0.94, cy + k * 42], [W * 0.98, cy + k * 34]], ink, 4); }
    for (const [x, y] of [[0.79, -22], [0.79, 0], [0.79, 22]]) oval(p, W * x, cy + y, 7, 7, 0, "#ffcf4d", "#d48a1a");
    gloss(p, W * 0.28, cy - H * 0.16, W * 0.13, H * 0.05, 0, 0.5); p.outline(ink); p.outline(ink);
}
function paintChamberArt(p, id) {
    const W = p.width, H = p.height, c = W / 2, cy = H / 2;
    const egg = (x, y) => { oval(p, x, y, 8, 11, 0.3, "#fff8e2", "#d9c9a4"); };
    if (id === "nursery") for (let i = 0; i < 11; i++) egg(c - 42 + (i % 4) * 26 + (i > 3 ? 7 : 0) + (i > 7 ? 2 : 0), cy + 14 - (i / 4 | 0) * 16);
    if (id === "pantry") { for (let i = 0; i < 12; i++) oval(p, c - 36 + (i % 5) * 18 + (i > 4 ? 8 : 0), cy + 18 - (i / 5 | 0) * 15, 10, 8, i, ["#f6d58f", "#ff8fb4", "#ec7a7a", "#b6d868"][i % 4], "#a06a2c"); }
    if (id === "gym") { p.line(c - 40, cy, c + 40, cy, "#cfd5de", 8); for (const k of [-1, 1]) { oval(p, c + k * 44, cy, 15, 24, 0, "#f6d58f", "#a8652a"); oval(p, c + k * 31, cy, 10, 18, 0, "#e3bb70", "#8a5428"); } }
    if (id === "vat") { oval(p, c, cy + 6, 38, 34, 0, "#8a5a33", "#4c2c15"); oval(p, c, cy - 10, 30, 11, 0, "#c6ee58", "#6c9c1c"); for (const k of [-1, 1]) p.line(c - 38, cy + k * 12 + 8, c + 38, cy + k * 12 + 8, "#3a2412", 4); for (let i = 0; i < 4; i++) oval(p, c - 16 + i * 11, cy - 11 - (i % 2) * 2, 3.6, 3.6, 0, "#effd9f"); }
    if (id === "hall") { for (const [x, y] of [[-30, 14], [8, 14], [-12, -12]]) { p.rect(c + x - 16, cy + y - 12, 36, 25, "#c29a5e"); p.line(c + x - 16, cy + y, c + x + 20, cy + y, "#7c5f35", 2.6); p.line(c + x + 2, cy + y - 12, c + x + 2, cy + y + 13, "#7c5f35", 2.6); } }
    if (id === "loft") for (const k of [-1, 1]) { oval(p, c + k * 28, cy - 2, 32, 14, k * 0.5, [0.85, 0.95, 1, 0.92], [0.55, 0.75, 0.95, 0.75]); stroke(p, [[c + k * 4, cy + 6], [c + k * 54, cy - 18]], "#7ea8c9", 2.4); }
    bevel(p, 3, 0.35, 0.3);
}

export function paintUI(assets) {
    const A = new Atlas("uisheet", 1536, 1280);
    for (const [k, o] of Object.entries(FACES)) A.add(k, 200, 200, (p) => paintFace(p, o));
    A.add("queen", 420, 240, paintQueen);
    for (const id of ["nursery", "pantry", "gym", "vat", "hall", "loft"]) A.add(`ch_${id}`, 150, 110, (p) => paintChamberArt(p, id));
    A.add("soil", 700, 520, (p) => {
        const d = p.data, W = p.width, H = p.height;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const n = noiseAt(x * 2, y * 2), f = noiseAt(x * 7, y * 7), v = 0.7 + n * 0.5 + (f - 0.5) * 0.25, o = (x + y * W) * 4; d[o] = 92 * v; d[o + 1] = 58 * v; d[o + 2] = 36 * v; d[o + 3] = 255; }
        for (let i = 0; i < 70; i++) { const x = (i * 197) % W, y = (i * 311) % H, r = 4 + i % 7; oval(p, x, y, r * 1.5, r, i, "#8b6a4c", "#4a3020"); }
    });
    A.add("vignette", 128, 128, (p) => { const d = p.data; for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const q = Math.hypot(x - 63.5, y - 63.5) / 90, a = Math.max(0, Math.min(1, (q - 0.62) / 0.5)); const o = (x + y * 128) * 4; d[o] = 10; d[o + 1] = 14; d[o + 2] = 10; d[o + 3] = a * a * 200; } });
    A.add("blades", 330, 620, (p) => {
        for (let i = 0; i < 26; i++) { const x = 8 + i * 12.5, top = 40 + ((i * 97) % 300), curve = ((i * 37) % 120) - 60; const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14; pts.push([x + curve * t * t, 620 - (620 - top) * t]); } const w = 26 + (i % 5) * 7; const col = i % 3 === 0 ? "#2f6b2a" : i % 3 === 1 ? "#1f4f24" : "#49872f"; for (let k = 1; k <= 14; k++) p.line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], col, w * (1.05 - k / 15)); }
        bevel(p, 6, 0.3, 0.45);
    });
    A.add("hero", 460, 460, paintHero);
    const icon = (n, fn) => A.add(n, 64, 64, (p) => { fn(p); });
    icon("iconCrumb", (p) => { crumb(p, 32, 33, 25, 3); bevel(p, 3); p.outline("#3a1c08"); });
    icon("iconSugar", (p) => { oval(p, 32, 34, 22, 22, 0, "#ff8fb4", "#c4265f"); p.poly([[10, 34], [2, 18], [2, 50]], "#ffc9dc"); p.poly([[54, 34], [62, 18], [62, 50]], "#ffc9dc"); gloss(p, 25, 25, 7, 3.4); bevel(p, 2); p.outline("#5e0f2c"); });
    icon("iconMeat", (p) => { oval(p, 32, 32, 25, 20, 0.4, "#ffefe0", "#e6bfa8"); oval(p, 32, 32, 21, 16, 0.4, "#ee6f76", "#b63c4b"); stroke(p, [[18, 26], [30, 36], [46, 34]], "#ffc4c2", 2.6); bevel(p, 2); p.outline("#4b1012"); });
    icon("iconPickle", (p) => { oval(p, 32, 32, 26, 13, 0.7, "#b6d868", "#4f7f1c"); for (let i = 0; i < 6; i++) oval(p, 18 + i * 6, 18 + i * 6.4 + (i % 2) * 4, 2.2, 2.2, 0, "#e4f7a2"); bevel(p, 2); p.outline("#2d4a0e"); });
    icon("iconLock", (p) => { stroke(p, [[20, 30], [20, 16], [32, 8], [44, 16], [44, 30]], "#d9dee8", 6); p.rect(13, 28, 38, 28, "#ffcf4d"); oval(p, 32, 40, 5, 5, 0, "#6e4210"); p.line(32, 40, 32, 50, "#6e4210", 4); p.outline("#2c1c10"); });
    A.bake(assets);
    return A.map;
}
function noiseAt(x, y) { return NOISE[(x & 255) + (y & 255) * 256]; }
/** The cover star: a soldier ant on the march, three-quarter view, enormous. */
function paintHero(p) {
    const W = p.width, H = p.height, T = TEAMS[0], ink = T.ink;
    for (const [ax, ay, kx, ky, fx, fy] of [[250, 290, 340, 330, 390, 440], [210, 300, 220, 390, 170, 450], [170, 290, 90, 360, 40, 440], [280, 270, 400, 250, 450, 330], [230, 270, 330, 330, 300, 430]]) { p.line(ax, ay, kx, ky, ink, 21); p.line(kx, ky, fx, fy, ink, 13); p.line(ax, ay, kx, ky, T.lo, 12); p.line(kx, ky, fx, fy, T.lo, 6); }
    oval(p, 110, 300, 100, 80, 0.25, T.hi, T.lo); for (let i = 0; i < 5; i++) stroke(p, [[50 + i * 32, 240 + i * 4], [40 + i * 34, 300 + i * 2], [58 + i * 30, 362 - i * 4]], [0.2, 0.08, 0, 0.3], 5);
    oval(p, 225, 265, 60, 46, -0.3, T.c, T.lo); oval(p, 320, 170, 92, 86, 0.1, T.hi, T.c); bevel(p, 10, 0.45, 0.5);
    stroke(p, [[300, 92], [270, 40], [210, 26]], ink, 11); stroke(p, [[360, 94], [390, 40], [440, 44]], ink, 11);
    for (const [x, y, s] of [[286, 150, 1], [360, 156, 1]]) { oval(p, x, y, 27 * s, 29 * s, 0, "#fff", "#d9dfea"); oval(p, x + 5, y + 5, 15, 17, 0, "#1a1218"); oval(p, x, y - 2, 5, 5, 0, "#fff"); } p.line(254, 110, 310, 134, ink, 11); p.line(392, 116, 340, 138, ink, 11);
    for (const k of [-1, 1]) { const c = 324; stroke(p, [[c + k * 44, 228], [c + k * 62, 272], [c + k * 18, 298]], ink, 26); stroke(p, [[c + k * 44, 228], [c + k * 62, 272], [c + k * 18, 298]], "#ffe9c4", 14); }
    gloss(p, 290, 110, 34, 9, -0.25, 0.5); gloss(p, 90, 256, 40, 10, -0.15, 0.5); p.outline(ink); p.outline(ink); p.outline(ink);
}
