// Every object in the village, in code. Light comes low from the left, so anything tall throws a long blue shadow.
import { Geo, mix, rgb } from "./geo.js";

export const PAL = {
    snow: "#f8faff", snowShade: "#cfdcf4", bark: "#6d4a3a", barkDark: "#4b3230", pine: "#2f6a63", pineDeep: "#1f4b52", pineLight: "#4b9180",
    stone: "#8d8aa0", stoneDark: "#62607a", wood: "#94643f", woodDark: "#66432f", brick: "#a8544a", brickDark: "#7a3a3c", roofA: "#7a4a4e", roofB: "#4e6a88", plaster: "#ead9bf",
    moleA: "#55415f", moleB: "#3d2f48", moleBelly: "#7b6383", nose: "#f19aa2", scarfA: "#e2483d", scarfB: "#f6d27a", paw: "#f3b7b0", coal: "#27242f", carrot: "#f08a32", glow: [1.9, 1.35, 0.62], lantern: [2.1, 1.6, 0.8],
    ember: [2.4, 0.9, 0.25],
};

const snowCap = (base) => (t) => (t > 0.62 ? PAL.snow : mix(base, PAL.snow, Math.max(0, (t - 0.42) * 3)));

export function addPine(g, x, y, z, h = 1.5, o = {}) {
    const r = h * 0.36, laden = o.laden ?? true;
    g.lathe(x, y, z, [[0.09, 0], [0.07, h * 0.24]], PAL.bark, { seg: 7 });
    const levels = 3;
    for (let i = 0; i < levels; i++) {
        const k = 1 - i * 0.26, y0 = y + h * (0.16 + i * 0.25), hh = h * 0.42 * (1 - i * 0.1), rr = r * k;
        const col = (t) => (laden ? (t > 0.55 ? PAL.snow : mix(i % 2 ? PAL.pine : PAL.pineDeep, PAL.pineLight, t * 0.7)) : mix(PAL.pineDeep, PAL.pineLight, t * 0.9));
        g.lathe(x, y0, z, [[rr * 0.72, 0], [rr, hh * 0.05], [rr * 0.72, hh * 0.3], [rr * 0.42, hh * 0.6], [rr * 0.14, hh * 0.9], [0.005, hh]], col, { seg: 11, wobble: 0.1 });
    }
}

export function addBush(g, x, y, z, s = 1) {
    const col = (cv) => (cv > 0.62 ? PAL.snow : mix(PAL.pineDeep, PAL.pineLight, (cv + 1) * 0.55));
    g.blob(x - 0.15 * s, y + 0.2 * s, z, 0.25 * s, 0.24 * s, 0.25 * s, col);
    g.blob(x + 0.16 * s, y + 0.17 * s, z + 0.08 * s, 0.22 * s, 0.2 * s, 0.22 * s, col);
    g.blob(x + 0.02 * s, y + 0.3 * s, z - 0.1 * s, 0.24 * s, 0.24 * s, 0.22 * s, col);
}

export function addRock(g, x, y, z, s = 1) {
    const col = (cv) => (cv > 0.72 ? PAL.snow : mix(PAL.stoneDark, PAL.stone, (cv + 1) * 0.6));
    g.blob(x, y + 0.14 * s, z, 0.38 * s, 0.3 * s, 0.32 * s, col, { lump: 0.12, seg: 10, rings: 6 });
    g.blob(x + 0.25 * s, y + 0.08 * s, z + 0.16 * s, 0.17 * s, 0.14 * s, 0.15 * s, col, { lump: 0.1, seg: 8, rings: 5 });
}

export function addStump(g, x, y, z, s = 1) {
    g.lathe(x, y, z, [[0.3 * s, 0], [0.25 * s, 0.05 * s], [0.24 * s, 0.32 * s], [0.0, 0.33 * s]], (t) => (t > 0.8 ? "#e4c79c" : mix(PAL.barkDark, PAL.bark, t)), { seg: 10, wobble: 0.04 });
    g.blob(x, y + 0.36 * s, z, 0.22 * s, 0.07 * s, 0.22 * s, PAL.snow, { seg: 10, rings: 5 });
}

export function addWallStone(g, x, y, z, seed = 0) {
    for (let k = 0; k < 3; k++) {
        const w = 0.52 + ((seed * 7 + k * 3) % 5) * 0.03;
        g.box(x - 0.22 + k * 0.22 - 0.0, y + k * 0.0, z + (k - 1) * 0.28, w, 0.3, 0.26, mix(PAL.stone, PAL.stoneDark, ((seed + k) % 3) * 0.3));
        g.box(x + 0.22 - k * 0.22, y + 0.3, z + (k - 1) * 0.28, w, 0.25, 0.26, mix(PAL.stoneDark, PAL.stone, ((seed + k * 2) % 3) * 0.35));
    }
    for (const [a, b, r] of [[-0.2, -0.16, 0.26], [0.22, -0.12, 0.24], [-0.14, 0.2, 0.25], [0.2, 0.2, 0.22]]) g.blob(x + a, y + 0.56, z + b, r, 0.1, r, PAL.snow, { seg: 8, rings: 4 });
}

export function addHut(g, x, y, z, o = {}) {
    const w = o.w ?? 0.8, d = o.d ?? 0.74, h = o.h ?? 0.58, wall = o.wall ?? PAL.plaster, roof = o.roof ?? PAL.roofA;
    g.box(x, y, z, w, h, d, wall);
    g.box(x, y, z + d / 2 + 0.002, w + 0.03, 0.1, 0.01, PAL.stoneDark);
    // Pitched roof with its ridge along x, thick with snow on the south face.
    const ov = 0.08, Y0 = y + h, Y1 = y + h + 0.5, X0 = x - w / 2 - ov, X1 = x + w / 2 + ov, Z0 = z - d / 2 - ov, Z1 = z + d / 2 + ov;
    const snow = PAL.snow, eave = mix(roof, PAL.snow, 0.15);
    g.quad([X0, Y0, Z1, eave], [X1, Y0, Z1, eave], [X1, Y1, z, snow], [X0, Y1, z, snow], snow);
    g.quad([X1, Y0, Z0, eave], [X0, Y0, Z0, eave], [X0, Y1, z, snow], [X1, Y1, z, snow], snow);
    g.quad([X0 + ov, Y0, Z1 - ov], [X0 + ov, Y1, z], [X0 + ov, Y0, Z0 + ov], [X0 + ov, Y0, Z0 + ov], wall, [-1, 0, 0]);
    g.quad([X1 - ov, Y0, Z0 + ov], [X1 - ov, Y1, z], [X1 - ov, Y0, Z1 - ov], [X1 - ov, Y0, Z1 - ov], wall, [1, 0, 0]);
    g.box(x, y, z, 0.01, 0.01, 0.01, roof);
    // Snow lip hanging over the eave.
    g.blob(x, Y0 + 0.02, Z1 - 0.01, (X1 - X0) / 2, 0.05, 0.07, PAL.snow, { seg: 12, rings: 4 });
    // Door and window.
    g.box(x - w * 0.22, y, z + d / 2 + 0.004, 0.2, 0.36, 0.015, PAL.woodDark);
    g.box(x + w * 0.2, y + 0.2, z + d / 2 + 0.006, 0.22, 0.2, 0.012, o.lit === false ? "#39405e" : PAL.glow);
    g.box(x + w * 0.2, y + 0.29, z + d / 2 + 0.012, 0.23, 0.018, 0.01, PAL.woodDark);
    g.box(x + w * 0.2, y + 0.2, z + d / 2 + 0.012, 0.018, 0.2, 0.01, PAL.woodDark);
    g.box(x + w * 0.28, y + h + 0.1, z - d * 0.15, 0.14, 0.42, 0.14, PAL.brick);
    g.box(x + w * 0.28, y + h + 0.5, z - d * 0.15, 0.18, 0.05, 0.18, PAL.snow);
}

export function addLamp(g, x, y, z, s = 1) {
    g.lathe(x, y, z, [[0.09 * s, 0], [0.05 * s, 0.08 * s], [0.03 * s, 0.14 * s], [0.03 * s, 0.84 * s]], PAL.coal, { seg: 7 });
    g.box(x, y + 0.84 * s, z, 0.14 * s, 0.16 * s, 0.14 * s, PAL.lantern, { bottom: PAL.lantern });
    g.lathe(x, y + 1.0 * s, z, [[0.13 * s, 0], [0.012, 0.09 * s]], PAL.coal, { seg: 4 });
    g.blob(x, y + 1.07 * s, z, 0.1 * s, 0.05 * s, 0.1 * s, PAL.snow, { seg: 8, rings: 4 });
}

export function addHay(g, x, y, z) {
    g.lathe(x, y, z, [[0.27, 0], [0.33, 0.07], [0.33, 0.3], [0.27, 0.37], [0, 0.38]], (t) => mix("#a98440", "#d9b264", t), { seg: 12 });
    g.blob(x, y + 0.4, z, 0.26, 0.08, 0.26, PAL.snow, { seg: 10, rings: 4 });
}

export function addBarrel(g, x, y, z) {
    g.lathe(x, y, z, [[0.22, 0], [0.27, 0.2], [0.22, 0.42], [0, 0.43]], (t) => mix(PAL.woodDark, PAL.wood, t), { seg: 12 });
    g.lathe(x, y + 0.11, z, [[0.262, 0], [0.262, 0.03]], PAL.coal, { seg: 12 });
    g.lathe(x, y + 0.3, z, [[0.262, 0], [0.262, 0.03]], PAL.coal, { seg: 12 });
    g.blob(x, y + 0.45, z, 0.2, 0.06, 0.2, PAL.snow, { seg: 10, rings: 4 });
}

export function addWell(g, x, y, z) {
    g.lathe(x, y, z, [[0.36, 0], [0.36, 0.34], [0.28, 0.36], [0.27, 0.28], [0, 0.28]], (t) => mix(PAL.stoneDark, PAL.stone, t), { seg: 12 });
    g.box(x - 0.31, y + 0.3, z, 0.05, 0.55, 0.05, PAL.woodDark);
    g.box(x + 0.31, y + 0.3, z, 0.05, 0.55, 0.05, PAL.woodDark);
    g.quad([x - 0.42, y + 0.8, z + 0.3, PAL.snow], [x + 0.42, y + 0.8, z + 0.3, PAL.snow], [x + 0.42, y + 1.0, z, PAL.snow], [x - 0.42, y + 1.0, z, PAL.snow], PAL.snow);
    g.quad([x + 0.42, y + 0.8, z - 0.3, PAL.snow], [x - 0.42, y + 0.8, z - 0.3, PAL.snow], [x - 0.42, y + 1.0, z, PAL.snow], [x + 0.42, y + 1.0, z, PAL.snow], PAL.snow);
}

export function addFencePiece(g, a, b, y = 0) {
    // One span along the rim of a plot: two posts and two rails with a line of snow.
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    for (const p of [a, [mx, mz]]) {
        g.box(p[0], y - 0.02, p[1], 0.075, 0.33, 0.075, PAL.wood);
        g.blob(p[0], y + 0.325, p[1], 0.06, 0.04, 0.06, PAL.snow, { seg: 6, rings: 3 });
    }
    g.rod([a[0], y + 0.22, a[1]], [b[0], y + 0.22, b[1]], 0.018, PAL.woodDark, 4);
    g.rod([a[0], y + 0.12, a[1]], [b[0], y + 0.12, b[1]], 0.018, PAL.woodDark, 4);
}

/** A snowball, unit radius, with soft lumps and a tiny bit of blue in its underside. */
export function ballGeo() {
    const g = new Geo();
    const col = (cv, a) => { const speck = Math.sin(a * 13 + cv * 19) * Math.sin(a * 7 - cv * 11) * 0.06; return mix(PAL.snowShade, PAL.snow, Math.min(1, 0.85 + speck * 3 + (cv + 1) * 0.1)); };
    g.blob(0, 0, 0, 1, 1, 1, col, { rings: 14, seg: 20, lump: 0.028 });
    return g;
}

/** Face and trimmings for a finished snowman, relative to its big ball resting on y = 0. */
export function snowmanTrim(style, R) {
    const g = new Geo(), [rl, rm, rs] = R, ym = rl * 1.72 + rm * 0.92, ys = rl * 1.72 + rm * 1.72 + rs * 0.92, fz = rs * 0.95;
    // Eyes and smile, in coal.
    g.blob(-rs * 0.36, ys + rs * 0.26, fz * 0.92, 0.024, 0.028, 0.016, PAL.coal, { seg: 7, rings: 4 });
    g.blob(rs * 0.36, ys + rs * 0.26, fz * 0.92, 0.024, 0.028, 0.016, PAL.coal, { seg: 7, rings: 4 });
    for (let i = -2; i <= 2; i++) { const a = i * 0.28; g.blob(Math.sin(a) * rs * 0.6, ys - rs * 0.38 + Math.abs(i) * 0.016, Math.cos(a) * rs * 0.82, 0.012, 0.012, 0.01, PAL.coal, { seg: 5, rings: 3 }); }
    // Carrot nose.
    { const b = new Geo(); g.rod([0, ys + rs * 0.02, fz * 0.9], [0.012, ys, fz * 0.9 + 0.1], 0.018, PAL.carrot, 6); g.rod([0, ys + rs * 0.02, fz * 0.9], [0.006, ys + 0.01, fz * 0.9 + 0.05], 0.03, PAL.carrot, 6); }
    // Buttons down the middle ball.
    for (let i = 0; i < 2; i++) g.blob(0, ym + rm * (0.3 - i * 0.55), rm * (0.93 - i * 0.03), 0.02, 0.02, 0.012, PAL.coal, { seg: 6, rings: 3 });
    // Twig arms.
    for (const s of [-1, 1]) {
        const a = [s * rm * 0.85, ym + 0.02, 0], b = [s * (rm + 0.27), ym + 0.2, 0.03];
        g.rod(a, b, 0.012, PAL.bark, 4);
        g.rod([a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7, 0.02], [b[0] + s * 0.02, b[1] - 0.09, 0.05], 0.009, PAL.bark, 4);
    }
    const scarf = [["#e2483d", "#f6d27a"], ["#3f7f9e", "#f4efe2"], ["#c98a2c", "#7a3a3c"], ["#6e5a9c", "#f2c6d0"]][style % 4];
    g.lathe(0, ys - rs * 0.98, 0, [[rs * 0.8, 0], [rs * 1.02, 0.03], [rs * 1.0, 0.08], [rs * 0.74, 0.1]], (t) => (t < 0.5 ? scarf[0] : scarf[1]), { seg: 16 });
    g.box(rs * 0.5, ys - rs * 1.75, rs * 1.06, 0.08, 0.2, 0.03, scarf[0], { yaw: -0.4 });
    const hatY = ys + rs * 0.72;
    if (style % 4 === 0) {        // top hat
        g.lathe(0, hatY, 0, [[rs * 0.86, 0], [rs * 0.86, 0.022], [rs * 0.54, 0.03], [rs * 0.58, 0.26], [0, 0.27]], PAL.coal, { seg: 14 });
        g.lathe(0, hatY + 0.03, 0, [[rs * 0.56, 0], [rs * 0.56, 0.04]], scarf[0], { seg: 14 });
    } else if (style % 4 === 1) { // bobble hat
        g.lathe(0, hatY - 0.04, 0, [[rs * 0.76, 0], [rs * 0.78, 0.06], [rs * 0.5, 0.17], [0, 0.22]], (t) => (t < 0.3 ? scarf[1] : scarf[0]), { seg: 14 });
        g.blob(0, hatY + 0.2, 0, 0.055, 0.055, 0.055, scarf[1], { seg: 8, rings: 5 });
    } else if (style % 4 === 2) { // bucket
        g.lathe(0, hatY - 0.02, 0, [[rs * 0.62, 0], [rs * 0.5, 0.18], [0, 0.185]], "#8fa0b8", { seg: 12 });
    } else {                      // flat cap of pine
        g.blob(0, hatY + 0.02, 0, rs * 0.74, 0.06, rs * 0.74, PAL.pine, { seg: 10, rings: 4 });
        g.blob(0.05, hatY + 0.08, 0.02, 0.03, 0.03, 0.03, PAL.scarfA, { seg: 6, rings: 3 });
        g.blob(-0.03, hatY + 0.08, 0.05, 0.03, 0.03, 0.03, PAL.scarfA, { seg: 6, rings: 3 });
    }
    return g;
}

/** Mott the mole faces +z. Body and head are one mesh. His paws and scarf tail move on their own. */
export function moleGeo() {
    const g = new Geo();
    const coat = (cv) => mix(PAL.moleB, PAL.moleA, Math.min(1, (cv + 1) * 0.75));
    g.blob(0, 0.2, 0, 0.21, 0.21, 0.2, coat, { rings: 10, seg: 14 });
    g.blob(0, 0.14, 0.11, 0.13, 0.12, 0.1, PAL.moleBelly, { rings: 8, seg: 10 });
    g.blob(0, 0.42, 0.02, 0.17, 0.155, 0.165, coat, { rings: 10, seg: 14 });
    g.blob(0, 0.385, 0.165, 0.075, 0.06, 0.09, PAL.moleBelly, { rings: 7, seg: 10 });
    g.blob(0, 0.405, 0.255, 0.04, 0.034, 0.03, PAL.nose, { rings: 6, seg: 9 });
    g.blob(-0.075, 0.47, 0.14, 0.02, 0.026, 0.012, PAL.coal, { rings: 5, seg: 7 });
    g.blob(0.075, 0.47, 0.14, 0.02, 0.026, 0.012, PAL.coal, { rings: 5, seg: 7 });
    g.blob(-0.07, 0.478, 0.149, 0.007, 0.007, 0.004, "#ffffff", { rings: 3, seg: 5 });
    g.blob(0.08, 0.478, 0.149, 0.007, 0.007, 0.004, "#ffffff", { rings: 3, seg: 5 });
    g.blob(-0.15, 0.52, -0.02, 0.05, 0.045, 0.03, PAL.moleB, { rings: 5, seg: 7 });
    g.blob(0.15, 0.52, -0.02, 0.05, 0.045, 0.03, PAL.moleB, { rings: 5, seg: 7 });
    // Scarf collar, striped.
    g.lathe(0, 0.29, 0.005, [[0.135, 0], [0.175, 0.025], [0.17, 0.065], [0.125, 0.085]], (t, y, a) => (Math.sin(a * 6) > 0 ? PAL.scarfA : PAL.scarfB), { seg: 24 });
    // Feet.
    g.blob(-0.1, 0.03, 0.09, 0.07, 0.035, 0.1, PAL.paw, { rings: 5, seg: 8 });
    g.blob(0.1, 0.03, 0.09, 0.07, 0.035, 0.1, PAL.paw, { rings: 5, seg: 8 });
    return g;
}

export function pawGeo() {
    const g = new Geo();
    g.blob(0, 0, 0, 0.062, 0.052, 0.075, PAL.paw, { rings: 6, seg: 8 });
    for (const a of [-1, 0, 1]) g.blob(a * 0.032, -0.005, 0.07, 0.016, 0.014, 0.022, "#e9e1dc", { rings: 3, seg: 5 });
    return g;
}

export function scarfTailGeo() {
    const g = new Geo();
    for (let i = 0; i < 4; i++) g.box(0, -0.12 - i * 0.055, 0, 0.09, 0.06, 0.022, i % 2 ? PAL.scarfB : PAL.scarfA);
    return g;
}
