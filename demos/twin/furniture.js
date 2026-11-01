// Household goods. Each is centred on x,z with its base on the floor, width along x, depth along z, front at +z.
import { MB, hex, mix, mul } from "./meshkit.js";
import { FURN } from "./rooms.js";

const C = {
    teal: "#2f8f8b", tealDk: "#20706f", mustard: "#e8ae35", coral: "#e4644a", oak: "#b9814a", oakDk: "#8a5a31", walnut: "#6d4630", cream: "#fff1dc",
    white: "#f7f6f1", steel: "#c8d2da", steelDk: "#8c97a3", ink: "#2b2733", mint: "#9fd9bd", tomato: "#e8583f", pink: "#ef8fa6", aqua: "#6dcbd6", lilac: "#9a86d6", butter: "#ffe08a", sky: "#7ec8f0", leaf: "#3f9f5e", leafDk: "#2a7a4a", terracotta: "#d0683f",
};
const c = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hex(v)]));

function books(m, x0, x1, y, z, h, seed) {
    const cols = [c.coral, c.mustard, c.teal, c.cream, c.lilac, c.sky, c.tomato, c.leaf];
    let x = x0, i = seed;
    while (x < x1 - 0.1) {
        const w = 0.14 + ((i * 7) % 5) * 0.04, hh = h * (0.7 + ((i * 3) % 4) * 0.1);
        if (x + w > x1) break;
        m.box(x + w / 2, y, z, w, hh, 0.5, cols[i % cols.length], { shade: 0.85 });
        x += w + 0.015; i++;
    }
}

const BUILD = {
    sofa(m, k) {
        const w = k.w, d = k.d, f = c.teal, dk = c.tealDk;
        for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) for (const z of [-d / 2 + 0.25, d / 2 - 0.25]) m.box(x, 0, z, 0.2, 0.24, 0.2, c.walnut);
        m.box(0, 0.24, 0, w, 0.44, d, dk, { shade: 0.7 });
        m.box(0, 0.68, -d / 2 + 0.34, w, 1.2, 0.68, f, { taper: 0.94, shade: 0.72 });              // back
        for (const s of [-1, 1]) m.box(s * (w / 2 - 0.34), 0.68, 0.12, 0.68, 0.7, d - 0.3, f, { taperX: 0.85, shade: 0.75 });
        for (const x of [-1.45, 0, 1.45]) {
            m.box(x, 0.68, 0.3, 1.38, 0.4, 1.4, mix(f, c.cream, 0.14), { taper: 0.94, shade: 0.76 });       // seats
            m.box(x, 1.08, -0.42, 1.3, 0.72, 0.36, mix(f, c.cream, 0.08), { taper: 0.9, shade: 0.8 });       // back cushions
        }
        m.box(-1.5, 1.08, 0.1, 0.8, 0.5, 0.26, c.mustard, { taper: 0.8 });
        m.box(1.6, 1.08, 0.15, 0.7, 0.46, 0.24, c.coral, { taper: 0.8 });
    },
    armchair(m, k) {
        const w = k.w, d = k.d, f = c.mustard, dk = mul(c.mustard, 0.78);
        for (const x of [-1, 1]) for (const z of [-1, 1]) m.box(x * (w / 2 - 0.2), 0, z * (d / 2 - 0.2), 0.16, 0.24, 0.16, c.walnut);
        m.box(0, 0.24, 0, w, 0.4, d, dk);
        m.box(0, 0.64, -d / 2 + 0.3, w, 1.14, 0.6, f, { taper: 0.92 });
        for (const s of [-1, 1]) m.box(s * (w / 2 - 0.26), 0.64, 0.1, 0.52, 0.6, d - 0.24, f, { taperX: 0.85 });
        m.box(0, 0.64, 0.24, w - 1.04, 0.36, 1.4, mix(f, c.cream, 0.2), { taper: 0.92 });
    },
    coffee(m, k) {
        for (const x of [-1, 1]) for (const z of [-1, 1]) m.box(x * (k.w / 2 - 0.2), 0, z * (k.d / 2 - 0.2), 0.16, 0.74, 0.16, c.walnut, { taper: 0.75 });
        m.box(0, 0.74, 0, k.w, 0.14, k.d, c.oak, { top: mix(c.oak, c.cream, 0.14) });
        m.box(0, 0.26, 0, k.w - 0.5, 0.06, k.d - 0.4, c.oakDk);
        m.box(-0.8, 0.88, 0.1, 0.8, 0.09, 0.56, c.coral); m.box(-0.74, 0.97, 0.08, 0.68, 0.07, 0.5, c.teal);
        m.cyl(0.8, 0.88, -0.1, 0.18, 0.28, 8, c.white, { r2: 0.2, top: c.walnut });
    },
    tvunit(m, k) {
        m.box(0, 0, 0, k.w, 0.7, k.d, c.walnut, { top: mix(c.walnut, c.cream, 0.12) });
        for (const x of [-1.8, 0, 1.8]) m.box(x, 0.1, k.d / 2 + 0.005, 1.6, 0.5, 0.02, c.oak, { shade: 0.9 });
        m.box(0, 0.7, 0, 0.8, 0.1, 0.5, c.ink);
        m.box(0, 0.8, 0.02, 4.4, 1.6, 0.14, c.ink);
        const glass = mul(hex("#7ad4ff"), 1.25), glass2 = mul(hex("#ffd17a"), 1.25);
        m.quad([-2.1, 0.92, 0.1], [2.1, 0.92, 0.1], [2.1, 2.3, 0.1], [-2.1, 2.3, 0.1], glass2, glass2, glass, glass);
    },
    bookcase(m, k) {
        const w = k.w, h = k.h, dk = c.oakDk;
        m.box(0, 0, -0.25, w, h, 0.6, dk, { top: c.oak });
        for (const s of [-1, 1]) m.box(s * (w / 2 - 0.06), 0, 0.2, 0.12, h, k.d - 0.3, c.oak);
        for (let i = 0; i <= 4; i++) {
            const y = 0.04 + i * (h - 0.1) / 4;
            m.box(0, y, 0.2, w - 0.1, 0.09, k.d - 0.3, c.oak);
            if (i < 4) books(m, -w / 2 + 0.2, w / 2 - 0.2, y + 0.09, 0.14, h / 4 - 0.26, i * 3 + 1);
        }
    },
    lamp(m, k) {
        m.cyl(0, 0, 0, 0.42, 0.12, 10, c.ink);
        m.cyl(0, 0.12, 0, 0.05, 2.3, 6, c.steelDk);
        m.cyl(0, 2.4, 0, 0.62, 0.8, 10, mul(hex("#ffe9b0"), 1.5), { r2: 0.34, top: mul(hex("#fff4cf"), 1.6), shade: 0.95 });
    },
    plant(m) {
        m.cyl(0, 0, 0, 0.46, 0.8, 9, c.terracotta, { r2: 0.62, top: c.walnut });
        for (let i = 0; i < 9; i++) {
            const a = i * 2.4, r = 0.3 + (i % 3) * 0.18, y = 0.8 + (i % 4) * 0.22, tip = [Math.cos(a) * (r + 0.8), y + 1.0 + (i % 3) * 0.26, Math.sin(a) * (r + 0.8)];
            const nx = -Math.sin(a) * 0.3, nz = Math.cos(a) * 0.3, col = i % 2 ? c.leaf : c.leafDk;
            m.tri([nx, y, nz], [-nx, y, -nz], tip, col, col, mix(col, c.butter, 0.3));
            m.tri([-nx, y, -nz], [nx, y, nz], tip, col, col, mix(col, c.butter, 0.2));
        }
    },
    side(m, k) {
        m.cyl(0, 0, 0, 0.5, 0.1, 10, c.walnut); m.cyl(0, 0.1, 0, 0.1, 0.8, 7, c.walnut);
        m.cyl(0, 0.9, 0, 0.78, 0.12, 12, c.oak, { top: mix(c.oak, c.cream, 0.18) });
        m.cyl(0.1, 1.02, 0, 0.14, 0.34, 7, c.coral, { r2: 0.22 });
    },
    counter(m, k) {
        m.box(0, 0.12, 0, k.w, 1.28, k.d, c.mint, { shade: 0.8 });
        for (let i = 0; i < 4; i++) { const x = -k.w / 2 + 0.75 + i * 1.5; m.box(x, 0.24, k.d / 2 + 0.01, 1.34, 1.06, 0.02, mix(c.mint, c.white, 0.25), { shade: 0.9 }); m.box(x, 1.06, k.d / 2 + 0.03, 0.36, 0.05, 0.05, c.steel); }
        m.box(0, 1.4, 0, k.w + 0.1, 0.14, k.d + 0.1, c.white, { top: mix(c.white, c.oak, 0.12) });
        m.cyl(-1.6, 1.54, 0, 0.3, 0.5, 8, c.tomato, { r2: 0.36, top: c.ink });
        m.box(1.5, 1.54, -0.1, 0.8, 0.4, 0.5, c.steel, { taper: 0.9 });
    },
    island(m, k) {
        m.box(0, 0.12, 0, k.w - 0.2, 1.3, k.d - 0.2, c.tomato, { shade: 0.78 });
        for (let i = 0; i < 4; i++) m.box(-2.2 + i * 1.47, 0.22, k.d / 2 - 0.09, 1.3, 1.06, 0.02, mix(c.tomato, c.white, 0.2), { shade: 0.9 });
        m.box(0, 1.42, 0, k.w, 0.18, k.d, mix(c.oak, c.cream, 0.1), { top: mix(c.oak, c.cream, 0.22) });
        m.box(-1.5, 1.6, 0.2, 1.3, 0.1, 0.8, c.oakDk); m.cyl(-1.5, 1.7, 0.2, 0.26, 0.14, 8, c.tomato);
        m.cyl(1.4, 1.6, -0.1, 0.42, 0.24, 9, c.white, { r2: 0.56, top: c.butter });
    },
    stove(m, k) {
        m.box(0, 0, 0, k.w, 1.5, k.d, c.steel, { shade: 0.74 });
        m.box(0, 0.2, k.d / 2 + 0.01, 1.8, 0.8, 0.03, c.ink, { shade: 1 });
        m.box(0, 1.5, 0, k.w + 0.06, 0.12, k.d + 0.06, c.ink);
        for (const x of [-0.56, 0.56]) for (const z of [-0.44, 0.44]) m.cyl(x, 1.62, z, 0.34, 0.03, 10, c.steelDk, { top: mul(hex("#ff7a3a"), 1.2) });
    },
    fridge(m, k) {
        m.box(0, 0, 0, k.w, k.h, k.d, c.white, { shade: 0.78 });
        m.box(0, 1.3, k.d / 2 + 0.01, k.w - 0.1, 0.05, 0.03, c.steelDk, { shade: 1 });
        for (const y of [0.5, 1.7]) m.box(k.w / 2 - 0.25, y, k.d / 2 + 0.05, 0.08, 0.8, 0.08, c.steel);
        m.box(-0.5, 2.2, k.d / 2 + 0.02, 0.5, 0.4, 0.02, c.butter); m.box(0.1, 2.5, k.d / 2 + 0.02, 0.36, 0.5, 0.02, c.sky);
    },
    table(m, k) {
        for (const x of [-1, 1]) for (const z of [-1, 1]) m.box(x * (k.w / 2 - 0.3), 0, z * (k.d / 2 - 0.3), 0.2, 1.24, 0.2, c.oakDk, { taper: 0.8 });
        m.box(0, 1.24, 0, k.w, 0.16, k.d, c.oak, { top: mix(c.oak, c.cream, 0.18) });
        m.cyl(0, 1.4, 0, 0.5, 0.1, 10, c.white, { r2: 0.6 });
        for (let i = 0; i < 4; i++) m.ball(Math.cos(i * 1.6) * 0.26, 1.6, Math.sin(i * 1.6) * 0.26, 0.2, 6, 4, i % 2 ? c.tomato : c.mustard);
    },
    chair(m, k) {
        for (const x of [-1, 1]) for (const z of [-1, 1]) m.box(x * 0.4, 0, z * 0.4, 0.12, 0.76, 0.12, c.oakDk);
        m.box(0, 0.76, 0, k.w, 0.12, k.d, c.tomato, { top: mix(c.tomato, c.cream, 0.2) });
        m.box(0, 0.88, -0.45, k.w, 0.86, 0.12, c.oak);
    },
    tub(m, k) {
        const w = k.w, d = k.d, h = k.h, e = 0.26;
        m.box(0, 0, 0, w, h, d, c.white, { shade: 0.84, noTop: true });
        m.box(0, h, -d / 2 + e / 2, w, 0.1, e, c.white); m.box(0, h, d / 2 - e / 2, w, 0.1, e, c.white);
        m.box(-w / 2 + e / 2, h, 0, e, 0.1, d, c.white); m.box(w / 2 - e / 2, h, 0, e, 0.1, d, c.white);
        const water = mul(hex("#8fe2f0"), 1.05);
        m.box(0, 0.3, 0, w - e * 2, h - 0.24, d - e * 2, water, { shade: 1, top: water });
        for (const [x, z, r] of [[-1, 0.2, 0.26], [-0.7, -0.3, 0.34], [-1.4, -0.2, 0.2], [0.7, 0.3, 0.28]]) m.ball(x, h + 0.08, z, r, 6, 3, c.white, { sy: 0.7 });
        m.cyl(w / 2 - 0.4, h + 0.08, 0, 0.1, 0.4, 7, c.steel);
        m.box(w / 2 - 0.6, h + 0.42, 0, 0.5, 0.08, 0.14, c.steel);
    },
    toilet(m, k) {
        m.box(0, 0.8, -0.72, 1.3, 1, 0.5, c.white, { shade: 0.84 });
        m.box(0, 1.8, -0.72, 1.36, 0.08, 0.56, c.white);
        m.cyl(0, 0, 0.1, 0.46, 0.9, 10, c.white, { r2: 0.66, shade: 0.8, top: mix(c.aqua, c.white, 0.3) });
        m.cyl(0, 0.9, 0.1, 0.7, 0.08, 12, c.pink);
    },
    vanity(m, k) {
        m.box(0, 0.1, 0, k.w, 1.3, k.d, c.aqua, { shade: 0.8 });
        for (const x of [-0.8, 0.8]) m.box(x, 0.2, k.d / 2 + 0.01, 1.4, 1.1, 0.02, mix(c.aqua, c.white, 0.3), { shade: 0.9 });
        m.box(0, 1.4, 0, k.w + 0.1, 0.14, k.d + 0.08, c.white);
        m.cyl(0, 1.54, 0, 0.5, 0.1, 10, c.white, { top: c.aqua });
        m.box(-1.1, 1.54, -0.2, 0.16, 0.4, 0.16, c.pink); m.box(1.1, 1.54, -0.2, 0.18, 0.34, 0.18, c.butter);
    },
    cabinet(m, k) {
        m.box(0, 0, -0.1, k.w, k.h, k.d - 0.2, c.white, { shade: 0.82 });
        for (let i = 0; i < 3; i++) { const y = 0.1 + i * 0.9; m.box(0, y, 0.4, k.w - 0.14, 0.08, 0.2, c.white); for (let j = 0; j < 3; j++) m.box(-0.9 + j * 0.9, y + 0.08, 0.36, 0.78, 0.56, 0.3, [c.pink, c.aqua, c.butter][(i + j) % 3], { taper: 0.92 }); }
    },
    hamper(m, k) {
        m.cyl(0, 0, 0, 0.72, 1.1, 10, hex("#d9b98a"), { r2: 0.86, top: c.cream, shade: 0.8 });
        m.ball(0.2, 1.14, 0.1, 0.42, 6, 4, c.pink, { sy: 0.6 }); m.ball(-0.28, 1.12, -0.1, 0.46, 6, 4, c.sky, { sy: 0.55 }); m.ball(0, 1.16, -0.38, 0.32, 6, 4, c.white, { sy: 0.6 });
    },
    washer(m, k) {
        m.box(0, 0, 0, k.w, k.h, k.d, c.white, { shade: 0.8 });
        m.box(0, 1.9, k.d / 2 + 0.01, k.w - 0.1, 0.32, 0.02, c.steel, { shade: 1 });
        m.cylZ(0, 0.92, k.d / 2 + 0.02, 0.68, 0.06, 14, c.steelDk, { cap: c.ink });
        m.cylZ(0, 0.92, k.d / 2 + 0.06, 0.5, 0.05, 14, c.sky, { cap: mul(hex("#a9e4ff"), 1.1) });
        m.box(0.7, 1.96, k.d / 2 + 0.03, 0.16, 0.16, 0.03, c.tomato, { shade: 1 });
    },
    board(m, k) {
        for (const x of [-1.2, 1.2]) for (const s of [-1, 1]) m.box(x + s * 0.1, 0, 0, 0.08, 1.3, 0.8, c.steelDk, { taper: 0.5 });
        m.box(0, 1.3, 0, k.w, 0.12, k.d, c.sky, { top: mix(c.sky, c.white, 0.35), taperX: 0.96 });
        m.box(1.2, 1.42, 0, 0.8, 0.26, 0.46, c.tomato, { taper: 0.7 });
    },
    shelf(m, k) {
        for (const s of [-1, 1]) m.box(s * (k.w / 2 - 0.06), 0, 0, 0.1, k.h, k.d, c.steelDk);
        for (let i = 0; i < 4; i++) {
            const y = 0.1 + i * 0.86;
            m.box(0, y, 0, k.w, 0.08, k.d, c.steel);
            for (let j = 0; j < 4; j++) if ((i + j) % 3) m.box(-1.3 + j * 0.86, y + 0.08, 0, 0.66, 0.44 + (j % 2) * 0.14, 0.56, [c.butter, c.lilac, c.white, c.tomato][(i * 2 + j) % 4], { taper: 0.9 });
        }
    },
    crib(m, k) {
        const w = k.w, d = k.d;
        m.box(0, 0.5, 0, w - 0.1, 0.34, d - 0.1, c.cream, { top: mix(c.sky, c.white, 0.5) });
        for (const s of [-1, 1]) { m.box(s * (w / 2 - 0.1), 0, s * (d / 2 - 0.1), 0.2, 2.1, 0.2, c.oak); m.box(s * (w / 2 - 0.1), 0, -s * (d / 2 - 0.1), 0.2, 2.1, 0.2, c.oak); }
        for (const z of [-1, 1]) { m.box(0, 1.9, z * (d / 2 - 0.08), w, 0.14, 0.12, c.oak); for (let i = 0; i < 13; i++) m.box(-w / 2 + 0.3 + i * (w - 0.6) / 12, 0.84, z * (d / 2 - 0.08), 0.07, 1.06, 0.07, c.oak, { shade: 1 }); }
        for (const x of [-1, 1]) { m.box(x * (w / 2 - 0.08), 1.9, 0, 0.12, 0.14, d, c.oak); for (let i = 0; i < 6; i++) m.box(x * (w / 2 - 0.08), 0.84, -d / 2 + 0.3 + i * (d - 0.6) / 5, 0.07, 1.06, 0.07, c.oak, { shade: 1 }); }
        m.ball(-1, 1.02, 0, 0.42, 7, 4, c.white, { sx: 1.3, sy: 0.5 });
    },
    toybox(m, k) {
        m.box(0, 0, 0, k.w, 1.1, k.d, c.lilac, { shade: 0.8 });
        m.box(0, 1.1, -k.d / 2 + 0.05, k.w, 0.1, 0.1, mul(c.lilac, 1.2));
        m.ball(-0.6, 1.14, 0.2, 0.4, 6, 4, c.tomato, { col2: c.butter, bands: 2 }); m.box(0.4, 1.1, 0.1, 0.5, 0.5, 0.5, c.sky); m.ball(0.7, 1.2, -0.3, 0.3, 6, 4, c.mustard);
    },
    dollhouse(m, k) {
        const w = k.w, d = k.d;
        m.box(0, 0, 0, w, 1.9, d, c.pink, { shade: 0.84 });
        m.box(0, 1.9, 0, w + 0.2, 1.1, d + 0.2, c.tomato, { taperZ: 0.05, taperX: 1, shade: 0.76 });
        for (const x of [-0.8, 0.8]) for (const y of [0.3, 1.14]) m.box(x, y, d / 2 + 0.01, 0.6, 0.56, 0.03, mul(hex("#ffe9a0"), 1.3), { shade: 1 });
        m.box(0, 0, d / 2 + 0.02, 0.5, 0.8, 0.03, c.teal, { shade: 1 });
    },
    horse(m, k) {
        for (const s of [-1, 1]) { m.box(0, 0, s * 0.5, 2.8, 0.14, 0.14, c.tomato); for (const x of [-0.8, 0.8]) m.box(x, 0.1, s * 0.34, 0.14, 0.76, 0.14, c.oak, { taper: 1 }); }
        m.box(0, 0.86, 0, 1.8, 0.56, 0.5, c.oak, { taper: 0.92 });
        m.box(0.86, 1.2, 0, 0.42, 0.76, 0.36, c.oak);
        m.box(1.08, 1.7, 0, 0.74, 0.34, 0.32, c.oak);
        m.box(0.62, 1.3, 0, 0.14, 0.8, 0.14, c.butter);
        m.box(-0.1, 1.42, 0, 0.8, 0.08, 0.54, c.tomato);
        m.box(-1, 1.1, 0, 0.3, 0.1, 0.1, c.butter); m.box(-1.2, 0.76, 0, 0.14, 0.4, 0.12, c.butter);
    },
    blocks(m, k) {
        const cols = [c.tomato, c.sky, c.butter, c.leaf, c.lilac];
        let y = 0;
        for (let i = 0; i < 6; i++) {
            const s = 0.7 - i * 0.04;
            m.at((i % 2 ? 0.14 : -0.12), y, (i % 3 - 1) * 0.08, i * 0.4).box(0, 0, 0, s, 0.42, s, cols[i % 5], { shade: 0.84 }).reset();
            y += 0.42;
        }
    },
};

/** Build intact, damaged and wrecked meshes for a kind, once. */
export function furnitureMesh(game, kind) {
    const name = `f_${kind}`, A = game.assets;
    if (A.geoms?.has?.(`${name}_0`)) return;
    const k = FURN[kind], m = new MB();
    BUILD[kind](m, k);
    m.register(A, `${name}_0`);
    m.crumple(kind.length * 7 + 3, 0.14, 0.14, k.h * 0.92, 0.85).register(A, `${name}_1`);
    m.crumple(kind.length * 11 + 5, 0.46, 0.34, Math.min(0.62, k.h * 0.5), 0.55).register(A, `${name}_2`);
}
export { c as FURN_COLORS };
