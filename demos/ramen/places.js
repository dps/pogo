// The world behind the customers: one painting per stall, made when you first go there.
import { clamp, dab as dab1, fbm, hex, mix3, noise, rng, shader as shader1, smooth } from "./art.js";

export const BGW = 720, BGH = 300;
const K = 2;     // Texture pixels per view unit, so nothing goes blocky on a 3x phone.
const dab = (p, x, y, r, c, a = 1, e = 1) => dab1(p, x * K, y * K, r * K, c, a, e * K);
const shader = (p, fn) => shader1(p, (x, y) => fn(x / K, y / K));

function sky(p, top, mid, bot, horizon = 1) {
    const T = hex(top), M = hex(mid), B = hex(bot), h = BGH;
    shader(p, (x, y) => {
        const v = y / (h * horizon), n = (fbm(x * 0.006, y * 0.02, 3) - 0.5) * 0.14;
        const c = v < 0.6 ? mix3(T, M, clamp(v / 0.6 + n)) : mix3(M, B, clamp((v - 0.6) / 0.4 + n));
        return [c[0], c[1], c[2], 255];
    });
}

function rect(p, x, y, w, h, c, alpha = 1) {
    const C = hex(c);
    for (let j = Math.max(0, Math.floor(y * K)); j < Math.min(p.height, (y + h) * K); j++) for (let i = Math.max(0, Math.floor(x * K)); i < Math.min(p.width, (x + w) * K); i++) {
        const o = p.index(i, j), n = 1 + (noise(i * 0.09, j * 0.09) - 0.5) * 0.09, a = alpha;
        for (let k = 0; k < 3; k++) p.data[o + k] = Math.min(255, p.data[o + k] * (1 - a) + C[k] * n * a);
        p.data[o + 3] = 255;
    }
}

function tree(p, x, y, s, cols, seed) {
    const R = rng(seed), trunk = [52, 30, 34];
    for (let i = 0; i < 12; i++) dab(p, x + (i - 6) * 0.3, y - i * s * 0.1, s * 0.09, trunk, 1, 2);
    for (let i = 0; i < 420; i++) {
        const a = R() * 6.28, r = Math.sqrt(R()), lx = x + Math.cos(a) * r * s * 1.15, ly = y - s * 1.3 + Math.sin(a) * r * s * 0.8;
        dab(p, lx, ly, s * (0.025 + R() * R() * 0.11), hex(cols[Math.floor(R() * cols.length)]), 0.8, 1.5);
    }
}

function townRow(p, base, S, c, lit, seed, roof) {
    const R = rng(seed), C = c;
    let x = -20;
    while (x < BGW + 20) {
        const w = (80 + R() * 110) * S, h = (70 + R() * 90) * S;
        rect(p, x, base - h, w, h, C);
        if (roof) p.poly([[(x - 10) * K, (base - h + 2) * K], [(x + w * 0.5) * K, (base - h - 24 * S) * K], [(x + w + 10) * K, (base - h + 2) * K]], roof);
        const cols = Math.floor(w / (26 * S)), rows = Math.floor(h / (30 * S));
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (R() < 0.5) {
            const wx = x + 10 * S + i * 26 * S, wy = base - h + 14 * S + j * 30 * S;
            rect(p, wx, wy, 13 * S, 17 * S, lit);
            dab(p, wx + 6, wy + 8, 16 * S, hex(lit), 0.09, 12);
        }
        x += w + 2;
    }
}

function paper(p, x, y, r, c) { dab(p, x, y, r * 3, hex(c), 0.18, r * 2.4); dab(p, x, y, r, hex(c), 1, 2); dab(p, x - r * 0.3, y - r * 0.3, r * 0.4, [255, 244, 210], 0.65, 3); rect(p, x - r * 0.4, y - r - 2, r * 0.8, 3, "#3a2015"); rect(p, x - r * 0.4, y + r - 1, r * 0.8, 3, "#3a2015"); }

function paintCart(p) {
    sky(p, "#232048", "#6a3c6b", "#e88a5a");
    townRow(p, BGH - 6, 1.25, "#2a2141", "#ffcf77", 3, "#201933");
    townRow(p, BGH, 1.0, "#3a2740", "#ffb45e", 9, "#2a1c30");
    for (const [x, s, seed] of [[60, 74, 4], [290, 62, 8], [510, 70, 12], [680, 60, 2]]) tree(p, x, BGH - 12, s, ["#f6a9b8", "#f3bcc8", "#e98ba6", "#ffd3d8"], seed);
    let x = 0;
    while (x < BGW) { const y = 40 + Math.sin(x * 0.012) * 12; paper(p, x, y + 14, 11, "#f8a13a"); x += 72; }
    for (let i = 0; i < BGW; i += 1) { const y = 38 + Math.sin(i * 0.012) * 12; dab(p, i, y, 1, [30, 16, 20], 0.8); }
}

function cloud(p, x, y, s, seed) {
    const R = rng(seed);
    for (let i = 0; i < 46; i++) { const a = R() * 6.28, r = Math.sqrt(R()), cx = x + Math.cos(a) * r * s * 1.5, cy = y - Math.abs(Math.sin(a)) * r * s * 0.8; dab(p, cx, cy + 4, s * (0.14 + R() * 0.2), [214, 216, 226], 0.5, 8); dab(p, cx - 3, cy, s * (0.12 + R() * 0.2), [255, 252, 244], 0.85, 7); }
}

function paintStation(p) {
    sky(p, "#4fa8d6", "#a6dbe0", "#fcefc2");
    cloud(p, 170, 118, 58, 3); cloud(p, 520, 96, 74, 7); cloud(p, 680, 138, 40, 9);
    shader(p, (x, y) => (y > 150 - fbm(x * 0.007, 3, 3) * 70 ? [116, 172, 150, 255] : null));
    shader(p, (x, y) => (y > 196 - fbm(x * 0.012, 9, 3) * 50 ? [86, 150, 106, 255] : null));
    const R = rng(4), tones = ["#f0d6ae", "#e6a988", "#d9c7a6", "#c7d3c0", "#efb97a"];
    for (let x = -10; x < BGW;) {
        const w = 44 + R() * 56, h = 44 + R() * 56, base = BGH - 56, c = tones[Math.floor(R() * tones.length)], roof = R() < 0.5 ? "#5a6f86" : "#a65a42";
        rect(p, x, base - h, w, h, c);
        p.poly([[(x - 6) * K, (base - h + 2) * K], [(x + w * 0.5) * K, (base - h - 14) * K], [(x + w + 6) * K, (base - h + 2) * K]], roof);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (R() < 0.6) rect(p, x + 8 + i * (w / 3.4), base - h + 10 + j * 15, 8, 9, "#5f7f8e");
        x += w + 3 + R() * 6;
    }
    // Wires, then the platform roof and posts: a frame, in shade.
    for (const y0 of [66, 78]) for (let x = 0; x < BGW; x += 1) dab(p, x, y0 + Math.abs(Math.sin(x * 0.0087)) * 18, 0.5, [40, 50, 60], 0.75, 1);
    rect(p, 0, 0, BGW, 36, "#32505e");
    rect(p, 0, 34, BGW, 8, "#e2b13c");
    for (let i = 0; i < 6; i++) { rect(p, 46 + i * 130, 42, 12, BGH, "#3f5866"); rect(p, 46 + i * 130, 42, 4, BGH, "#6a8592"); }
    // Tracks.
    rect(p, 0, BGH - 58, BGW, 58, "#7a7468");
    for (let x = 0; x < BGW; x += 22) rect(p, x, BGH - 50, 11, 36, "#54402f");
    rect(p, 0, BGH - 46, BGW, 4, "#d6cebc");
    rect(p, 0, BGH - 24, BGW, 4, "#d6cebc");
    rect(p, 0, BGH - 12, BGW, 12, "#e4d3aa");
    rect(p, 0, BGH - 12, BGW, 3, "#f0c33e");
}

function paintSeaside(p) {
    sky(p, "#3f5a8e", "#e88d5e", "#ffd28a", 0.72);
    const horizon = 150, sun = [600, horizon - 8];
    dab(p, sun[0], sun[1], 120, [255, 214, 130], 0.34, 110);
    dab(p, sun[0], sun[1], 40, [255, 240, 196], 1, 3);
    shader(p, (x, y) => {
        if (y < horizon) return null;
        const v = (y - horizon) / (BGH - horizon), n = fbm(x * 0.012, y * 0.09, 3), glitter = smooth(170, 0, Math.abs(x - sun[0]) * (1 + v * 0.3)) * smooth(0.5, 0.7, noise(x * 0.04, y * 0.5));
        const c = mix3(mix3([226, 136, 96], [48, 76, 120], clamp(v * 1.5)), [255, 232, 170], glitter * 0.82 + (n - 0.5) * 0.14);
        return [c[0], c[1], c[2], 255];
    });
    // Headland and lighthouse.
    shader(p, (x, y) => (x < 300 && y < horizon + 3 && y > horizon - 34 * Math.sqrt(Math.max(0, 1 - x / 300)) - fbm(x * 0.02, 1, 3) * 16 ? [66, 54, 84, 255] : null));
    rect(p, 92, horizon - 96, 15, 60, "#efe3cb"); rect(p, 92, horizon - 76, 15, 11, "#c44a3a"); rect(p, 89, horizon - 104, 21, 8, "#3a2a3a");
    dab(p, 99, horizon - 100, 22, [255, 232, 160], 0.3, 18);
    // Boats.
    for (const [x, y, s] of [[380, 170, 1], [500, 190, 1.3], [240, 200, 1.5]]) { for (let i = 0; i < 12; i++) rect(p, x - (30 - i * 1.2) * s, y + i * s, (60 - i * 2.4) * s, s + 1, "#2a2438"); rect(p, x - s, y - 34 * s, 2 * s + 1, 34 * s, "#2a2438"); for (let i = 0; i < 26; i++) rect(p, x + 2, y - 33 * s + i * s, (26 - i) * s, s + 1, "#efe3cb", 0.9); }
    // Quay rail at the bottom.
    rect(p, 0, BGH - 26, BGW, 26, "#4a3a44");
    rect(p, 0, BGH - 26, BGW, 4, "#7a6470");
    for (let x = 10; x < BGW; x += 56) rect(p, x, BGH - 60, 9, 40, "#4a3a44");
    rect(p, 0, BGH - 62, BGW, 6, "#5a4852");
}

function paintHall(p) {
    sky(p, "#1a1c3a", "#2d2a55", "#5a3e6e");
    // Soaring timber frame, with tall windows on snow.
    rect(p, 0, 0, BGW, BGH, "#3f2a26", 0.92);
    for (let i = 0; i < 7; i++) {
        const x = 18 + i * 104;
        rect(p, x, 26, 76, 200, "#1f2348");
        shader(p, (X, Y) => {
            if (X < x || X >= x + 76 || Y < 26 || Y >= 226) return null;
            const k = 1 - (Y - 26) / 200;
            return [80 + k * 30, 90 + k * 34, 150 + k * 40, 180];
        });
        for (let j = 0; j < 40; j++) { const R = rng(i * 97 + j); dab(p, x + R() * 76, 26 + R() * 196, 1.2 + R(), [240, 240, 255], 0.8); }
        rect(p, x + 36, 26, 4, 200, "#2b1a18"); for (let j = 1; j < 4; j++) rect(p, x, 26 + j * 50, 76, 4, "#2b1a18");
        rect(p, x - 6, 18, 88, 10, "#6e4426"); rect(p, x - 6, 224, 88, 10, "#6e4426");
        rect(p, x + 84, 0, 16, BGH, "#2b1a18"); rect(p, x + 84, 0, 5, BGH, "#5a3a26");
    }
    rect(p, 0, 234, BGW, BGH - 234, "#54342a");
    for (let i = 0; i < 9; i++) rect(p, i * 92 - 8, 234, 3, BGH - 234, "#3a2319");
    rect(p, 0, 234, BGW, 6, "#7d5136");
    // Long tables, lamps and warm pools of light.
    for (let i = 0; i < 6; i++) { const x = 60 + i * 124; rect(p, x - 44, 250, 88, 9, "#8a5a36"); rect(p, x - 40, 259, 6, 30, "#4a2c1c"); rect(p, x + 34, 259, 6, 30, "#4a2c1c"); }
    for (let i = 0; i < 7; i++) { const x = 40 + i * 110, y = 94 + (i % 2) * 22; rect(p, x, 0, 2, y, "#1e120e"); paper(p, x + 1, y + 12, 15, "#f25a3a"); dab(p, x, y + 14, 90, [255, 150, 80], 0.14, 80); }
}

const PAINT = { cart: paintCart, station: paintStation, seaside: paintSeaside, hall: paintHall };

export function paintPlace(a, id) {
    const name = `bg_${id}`;
    if (paintPlace.done?.[name]) return name;
    (paintPlace.done ??= {})[name] = true;
    a.paint(name, BGW * K, BGH * K, PAINT[id], { smooth: true });
    return name;
}
