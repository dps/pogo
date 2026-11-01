// GNOME MAN'S LAND: art is painted in code, except the generated weapons in art/. Nothing here is loaded from a file.
// Themes are painted lazily (one 512px atlas per level) so that startup stays fast on phones.

import vm0 from "./art/vm0.js";
import vm1 from "./art/vm1.js";
import vm2 from "./art/vm2.js";
import vm3 from "./art/vm3.js";
import vm4 from "./art/vm4.js";

export const ATLAS = 512, CELL = 128, CELLS = 4;

// --- Periodic noise -------------------------------------------------------------------------
function makeTable(n, seed) {
    const t = new Float32Array(n * n);
    let s = seed >>> 0 || 1;
    for (let i = 0; i < t.length; i++) { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; t[i] = s / 4294967296; }
    return t;
}
const T = makeTable(64, 91731);
const smooth = (t) => t * t * (3 - 2 * t);
/** Value noise that repeats every `per` units. */
function vnoise(x, y, per) {
    const fx = Math.floor(x), fy = Math.floor(y), tx = smooth(x - fx), ty = smooth(y - fy);
    const w = (a) => ((a % per) + per) % per;
    const at = (a, b) => T[(w(a) * 7 + w(b) * 13 * 64 + per) % (64 * 64)];
    const a = at(fx, fy), b = at(fx + 1, fy), c = at(fx, fy + 1), d = at(fx + 1, fy + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
/** Tileable fbm for u, v in 0..1. */
function fbm(u, v, base = 4, oct = 3) {
    let s = 0, a = 0.5, f = base, tot = 0;
    for (let i = 0; i < oct; i++) { s += a * vnoise(u * f, v * f, f); tot += a; a *= 0.5; f *= 2; }
    return s / tot;
}
/** Tileable worley: returns [nearest distance, second distance, cell random]. */
const WOut = [0, 0, 0];
function worley(u, v, n, jit = 0.9) {
    const x = u * n, y = v * n, cx = Math.floor(x), cy = Math.floor(y);
    let d1 = 9, d2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const a = cx + i, b = cy + j;
        const wa = ((a % n) + n) % n, wb = ((b % n) + n) % n;
        const k = (wa * 11 + wb * 197) % (64 * 64);
        const px = a + 0.5 + (T[k] - 0.5) * jit, py = b + 0.5 + (T[(k + 777) % 4096] - 0.5) * jit;
        const d = Math.hypot(px - x, py - y);
        if (d < d1) { d2 = d1; d1 = d; id = T[(k + 1999) % 4096]; } else if (d < d2) d2 = d;
    }
    WOut[0] = d1; WOut[1] = d2; WOut[2] = id;
    return WOut;
}
const hex = (s) => { const h = s.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const sat = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (a, b, x) => { const t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// --- Tile materials. Each returns (u, v) => [r, g, b]; u and v run 0..1 across one tile --------
const M = {
    hedge(dark, mid, lite) {
        const D = hex(dark), A = hex(mid), B = hex(lite);
        return (u, v) => {
            // Lots of small leaves: bright in the middle of each, sinking into darkness between big clumps.
            const big = fbm(u, v, 4, 3), w = worley(u, v, 19, 1), leaf = 1 - sat(w[0] * 1.7), k = w[2];
            const w2 = worley(u + 0.31, v + 0.17, 13, 1), leaf2 = 1 - sat(w2[0] * 1.6), top = Math.max(leaf * (0.6 + k * 0.4), leaf2 * 0.75);
            const depth = sstep(0.26, 0.5, big + top * 0.34);
            const c = mix(A, B, sat(k * 0.55 + top * 0.5 - 0.1));
            return mix(mul(D, 0.7 + big * 0.5), mul(c, 0.72 + top * 0.42), depth);
        };
    },
    brick(mortar, a, b, nr = 6, nc = 3, grime = "#000000") {
        const Mo = hex(mortar), A = hex(a), B = hex(b), G = hex(grime);
        return (u, v) => {
            const row = Math.floor(v * nr), off = row % 2 ? 0.5 / nc : 0, x = ((u + off) % 1) * nc, col = Math.floor(x);
            const fx = x - col, fy = v * nr - row, edge = Math.min(fx * 3 / (nc > 2 ? 1.2 : 1), (1 - fx) * 3, fy, 1 - fy) * 2.4;
            const n = T[(row * 31 + col * 57 + (row % 2 ? 11 : 3)) % 4096], g = fbm(u, v, 8, 3);
            let c = mix(A, B, n);
            c = mix(c, mul(c, 0.72), g);
            c = mix(c, G, sstep(0.55, 1, fbm(u, v, 3, 2)) * 0.55);
            return mix(mul(Mo, 0.8 + g * 0.4), c, sstep(0.14, 0.3, edge));
        };
    },
    stone(mortar, a, b, n = 5) {
        const Mo = hex(mortar), A = hex(a), B = hex(b);
        return (u, v) => {
            const w = worley(u, v, n, 0.8), e = w[1] - w[0], k = w[2], g = fbm(u, v, 8, 3);
            const c = mix(A, B, k * 0.7 + g * 0.5 - 0.1);
            return mix(Mo, mix(c, mul(c, 1.25), sstep(0.25, 0.8, e) * 0.5), sstep(0.03, 0.12, e));
        };
    },
    planks(a, b, gap, n = 4, vertical = true) {
        const A = hex(a), B = hex(b), G = hex(gap);
        return (u, v) => {
            const s = vertical ? u : v, t = vertical ? v : u, x = s * n, i = Math.floor(x), f = x - i;
            const off = T[(i * 91 + 5) % 4096], grain = vnoise(s * 32 + off * 9, t * 4 + off * 4, 32) * 0.6 + vnoise(s * 64, t * 8, 64) * 0.4;
            const c = mix(A, B, grain * 0.8 + off * 0.3);
            return mix(G, c, sstep(0.015, 0.05, Math.min(f, 1 - f)));
        };
    },
    grass(dark, lite, dirt) {
        const A = hex(dark), B = hex(lite), D = hex(dirt);
        return (u, v) => {
            const big = fbm(u, v, 4, 2), bl = vnoise(u * 48, v * 16, 16) * 0.5 + vnoise(u * 32, v * 32, 32) * 0.5;
            const c = mix(A, B, bl * 0.9 + big * 0.3 - 0.15);
            return mix(c, D, sstep(0.62, 0.75, fbm(u + 0.3, v, 4, 3)) * 0.6);
        };
    },
    rock(a, b, crack) {
        const A = hex(a), B = hex(b), C = hex(crack);
        return (u, v) => {
            const g = fbm(u, v, 4, 4), r = Math.abs(fbm(u + 0.5, v, 4, 3) - 0.5) * 2, w = worley(u, v, 5, 0.95);
            let c = mix(A, B, sstep(0.3, 0.72, g));
            const facet = 0.72 + w[2] * 0.5 - w[0] * 0.5; // Each chunk of rock catches the light differently.
            c = mul(c, facet);
            c = mix(C, c, sstep(0.0, 0.08, w[1] - w[0]));
            return mix(c, mul(c, 1.3), sstep(0.5, 0.9, 1 - r) * 0.35);
        };
    },
    plate(a, b, line, rivet) {
        const A = hex(a), B = hex(b), L = hex(line), R = hex(rivet);
        return (u, v) => {
            const g = fbm(u, v, 6, 3), s = Math.abs(vnoise(u * 2, v * 32, 32) - 0.5);
            let c = mix(A, B, g * 0.7 + s * 0.6);
            const e = Math.min(u, 1 - u, v, 1 - v);
            c = mix(L, c, sstep(0.015, 0.04, e));
            for (const [x, y] of [[0.09, 0.09], [0.91, 0.09], [0.09, 0.91], [0.91, 0.91]]) {
                const d = Math.hypot(u - x, v - y);
                if (d < 0.04) c = mix(R, mul(R, 1.5), sat(1 - Math.hypot(u - x + 0.012, v - y + 0.012) / 0.03));
            }
            return mix(c, mul(c, 0.55), sstep(0.55, 0.8, fbm(u, v, 3, 2)) * 0.5);
        };
    },
    tile(a, b, grout, n = 2, gloss = 0.3) {
        const A = hex(a), B = hex(b), G = hex(grout);
        return (u, v) => {
            const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
            const check = (i + j) % 2 === 0, g = fbm(u, v, 6, 2);
            let c = check ? A : B;
            c = mix(c, mul(c, 0.86), g);
            c = mix(c, mul(c, 1.2), sat(1 - Math.hypot(fx - 0.3, fy - 0.3) * 2.2) * gloss);
            return mix(G, c, sstep(0.015, 0.05, Math.min(fx, 1 - fx, fy, 1 - fy)));
        };
    },
    delft(bg, blue, grout) {
        const BG = hex(bg), B = hex(blue), G = hex(grout);
        return (u, v) => {
            const x = u * 2, y = v * 2, i = Math.floor(x), j = Math.floor(y), fx = x - i - 0.5, fy = y - j - 0.5;
            const g = fbm(u, v, 6, 2); let c = mix(BG, mul(BG, 0.93), g);
            const a = Math.atan2(fy, fx), r = Math.hypot(fx, fy);
            const petal = r - (0.24 + 0.1 * Math.cos(a * 4 + ((i + j) % 2) * 0.8));
            c = mix(c, B, sat(1 - Math.abs(petal) * 24) * 0.95);
            if (r < 0.06) c = B;
            const cr = Math.min(Math.abs(Math.abs(fx) - Math.abs(fy)), 1) ; if (r > 0.38 && cr < 0.03) c = mix(c, B, 0.8);
            return mix(G, c, sstep(0.01, 0.035, Math.min(x - i, 1 - x + i, y - j, 1 - y + j)));
        };
    },
    marble(a, b, vein) {
        const A = hex(a), B = hex(b), V = hex(vein);
        return (u, v) => {
            const g = fbm(u, v, 3, 4), r = Math.abs(Math.sin((u + v + g * 1.4) * Math.PI * 2));
            return mix(mix(A, B, g), V, sstep(0.92, 1, 1 - r) * 0.8);
        };
    },
    carpet(a, b, gold) {
        const A = hex(a), B = hex(b), G = hex(gold);
        return (u, v) => {
            const f = vnoise(u * 64, v * 64, 64), d = Math.abs(((u * 2) % 1) - 0.5) + Math.abs(((v * 2) % 1) - 0.5);
            let c = mix(A, B, f * 0.6);
            if (d > 0.38 && d < 0.44) c = mix(c, G, 0.7);
            if (d < 0.1) c = mix(c, G, 0.5);
            return c;
        };
    },
    glass(frame, top, bottom, glint) {
        const F = hex(frame), A = hex(top), B = hex(bottom), G = hex(glint);
        return (u, v) => {
            const px = (u * 3) % 1, py = (v * 2) % 1, fx = Math.min(px, 1 - px), fy = Math.min(py, 1 - py);
            let c = mix(A, B, sat(v * 1.1));
            c = mix(c, G, sstep(0.82, 0.98, Math.sin((u * 2 + v) * Math.PI * 4) * 0.5 + 0.5) * 0.3 * (1 - v));
            const leaf = fbm(u, v, 5, 3) + v * 0.55; // Overgrown jungle pressing against the panes
            c = mix(c, mix(hex("#124a33"), hex("#2f8f4e"), fbm(u, v, 9, 2)), sstep(0.72, 0.84, leaf) * 0.92);
            const bar = sstep(0.012, 0.03, Math.min(fx / 3, fy / 2));
            return mix(mul(F, 0.86 + vnoise(u * 8, v * 8, 8) * 0.2), c, bar);
        };
    },
    shelf(wood, back, pot, potD) {
        const W = hex(wood), Bk = hex(back), P = hex(pot), D = hex(potD);
        return (u, v) => {
            const y = (v * 2) % 1, row = Math.floor(v * 2);
            if (y > 0.88) return mul(W, 0.8 + vnoise(u * 16, v * 2, 16) * 0.3);
            let c = mul(Bk, 0.8 + fbm(u, v, 6, 2) * 0.4);
            const x = ((u * 3 + row * 0.5) % 1) - 0.5, py = (y - 0.52) / 0.36, w = 0.36 - py * 0.1;
            if (Math.abs(py) < 1 && Math.abs(x) < w) {
                c = mix(P, D, sat((x + w) / (2 * w)));
                if (py < -0.72) c = mul(c, 1.2);
            }
            const lx = x + Math.sin(y * 20) * 0.05;
            if (y < 0.2 && Math.abs(lx) < 0.14) c = mix(hex("#2f8f4e"), hex("#7bd66a"), vnoise(u * 24, v * 24, 24));
            return c;
        };
    },
    glow(frame, center, edge, kind = 0) {
        const F = hex(frame), C = hex(center), E = hex(edge);
        return (u, v) => {
            const d = Math.hypot(u - 0.5, v - 0.5), e = Math.min(u, 1 - u, v, 1 - v);
            if (kind === 1) { // arched window
                const ar = v < 0.42 ? Math.hypot(u - 0.5, v - 0.42) : Math.abs(u - 0.5);
                if (ar > 0.36 || v > 0.92) return mul(F, 0.8 + fbm(u, v, 6, 2) * 0.4);
                const bar = Math.abs(u - 0.5) < 0.012 || Math.abs(v - 0.5) < 0.012;
                return bar ? F : mix(C, E, sat(d * 1.6));
            }
            if (kind === 2) { // furnace mouth
                const f = fbm(u, v * 0.7, 4, 3);
                if (e < 0.1) return mul(F, 0.7 + f * 0.6);
                return mix(C, E, sat(v * 0.4 + f * 0.9 - 0.15));
            }
            if (e < 0.06) return F;
            return mix(C, E, sat(d * 1.5));
        };
    },
    roots(a, b, dark) {
        const A = hex(a), B = hex(b), D = hex(dark);
        return (u, v) => {
            const f = Math.abs(fbm(u, v * 0.4, 6, 3) - 0.5) * 2, g = fbm(u, v, 5, 3);
            const c = mix(A, B, g);
            return mix(c, D, sstep(0.22, 0.05, f) * 0.85);
        };
    },
    spots(base, a, b) { // bioluminescent moss
        const Bs = hex(base), A = hex(a), B = hex(b);
        return (u, v) => {
            const g = fbm(u, v, 5, 3), w = worley(u, v, 6, 1);
            let c = mix(mul(Bs, 0.7), mul(Bs, 1.25), g);
            if (w[0] < 0.2 && w[2] > 0.55) c = mix(c, mix(A, B, w[2]), sstep(0.2, 0.08, w[0]));
            return c;
        };
    },
    gold(a, b, dark) {
        const A = hex(a), B = hex(b), D = hex(dark);
        return (u, v) => {
            const y = Math.abs(v - 0.5) * 2, sc = Math.sin(u * Math.PI * 8) * 0.5 + 0.5;
            let c = mix(A, B, sat(1 - y) * 0.8 + fbm(u, v, 8, 2) * 0.3);
            if (y > 0.82) c = D;
            if (y < 0.5 && Math.abs(v - 0.5 + (sc - 0.5) * 0.3) < 0.05) c = mix(c, D, 0.7);
            return c;
        };
    },
    crate(a, b, band) {
        const pl = M.planks(a, b, "#1a100a", 3, true), Bd = hex(band);
        return (u, v) => {
            const e = Math.min(u, 1 - u, v, 1 - v);
            if (e < 0.085) return mix(Bd, mul(Bd, 1.3), T[Math.floor(u * 8) * 3 + Math.floor(v * 8) * 91] * 0.5);
            if (Math.abs(u - v) < 0.07 || Math.abs(u + v - 1) < 0.07) return mul(Bd, 0.85);
            return pl(u, v);
        };
    },
    ivy(base) { // overlay leaves on another material
        return (u, v) => {
            const c = base(u, v), w = worley(u, v, 26), mask = fbm(u, v, 3, 2) + (1 - v) * 0.45;
            if (mask > 0.72 && w[1] - w[0] > 0.08) return mix(hex("#2f7d3b"), hex("#83c969"), w[2] * 0.8 * (1 - w[0]));
            return mask > 0.66 ? mix(c, hex("#123a1f"), 0.75) : c;
        };
    },
    sill(base, trim, h = 0.14) { // a band along the bottom of a wall
        const Tr = hex(trim);
        return (u, v) => {
            if (v > 1 - h) return mul(Tr, 0.75 + vnoise(u * 16, v * 16, 16) * 0.35);
            if (v > 1 - h - 0.03) return mul(Tr, 1.35);
            return base(u, v);
        };
    },
};

/** Six themes, one per level. `cells` fills an atlas left to right, top to bottom. */
export const THEMES = [
    {
        id: "garden", title: "The Back Garden", H: 3.4, ceil: false, sky: "sky0", fog: { color: "#c26a5a", near: 16, far: 62 }, bg: "#3b2340",
        amb: [0.5, 0.45, 0.62], sun: { dir: [0.75, 0.42, 0.36], color: [1.0, 0.62, 0.34] }, lamp: [1.5, 0.95, 0.42], lampR: 11, lampFrame: 0, props: [1, 2, 5, 6], hazard: "haz0", hazDmg: 12, hazName: "pond sludge",
        cells: () => {
            const hedge = M.hedge("#0f2a1a", "#2f7a3f", "#7fc65a"), brick = M.brick("#74665a", "#a85a40", "#7c3f33", 6, 3);
            return [hedge, M.hedge("#0f2a1a", "#3b8a44", "#a6d65c"), M.sill(brick, "#8e8676"), M.ivy(M.sill(brick, "#8e8676")),
                M.grass("#2f6b2e", "#79b34a", "#6a4f2a"), M.stone("#5a5240", "#b0a286", "#d8cba6", 7), M.planks("#6d4a2e", "#8c6239", "#2c1a10", 4), M.crate("#a3743f", "#7a5128", "#4b4a4e"),
                M.glow("#3e2a1c", "#ffe29a", "#ff9a3c", 1), M.planks("#8f8778", "#b8ae96", "#3d3a33", 5), M.stone("#34402a", "#67805a", "#7c9a63", 8), M.grass("#3c7a32", "#8cc152", "#6a4f2a")];
        },
    },
    {
        id: "greenhouse", title: "The Greenhouse", H: 4.4, ceil: true, fog: { color: "#123f3a", near: 10, far: 42 }, bg: "#0c2a28",
        amb: [0.42, 0.62, 0.56], sun: null, lamp: [1.6, 0.5, 1.5], lampR: 10, lampFrame: 3, props: [5, 3, 6, 4], hazard: "haz1", hazDmg: 14, hazName: "compost slurry",
        cells: () => {
            const glass = M.sill(M.glass("#dfe9df", "#a8efdf", "#2f8f80", "#ffffff"), "#6a5a48", 0.2), shelf = M.shelf("#7a5230", "#23403a", "#c9703f", "#7c3a22");
            return [glass, M.sill(M.ivy(M.glass("#dfe9df", "#b8f7e0", "#39a08a", "#ffffff")), "#6a5a48", 0.2), shelf, M.ivy(shelf),
                M.tile("#3f6f68", "#2f5a55", "#142c2a", 2, 0.5), M.stone("#1d3a33", "#55806f", "#6f9a7f", 8), M.glass("#b9cfc4", "#2f5f73", "#17404f", "#a6e0ff"), M.crate("#a06b3c", "#744a26", "#3b6a60"),
                M.glow("#dfe9df", "#ffb3ff", "#ff4fd8", 1), M.glass("#dfe9df", "#c8fff0", "#59c8b0", "#ffffff"), M.tile("#2e5a53", "#3f6f68", "#142c2a", 4, 0.4), M.roots("#2f5a3a", "#4f8a55", "#10261a")];
        },
    },
    {
        id: "hollows", title: "The Mushroom Hollows", H: 4.6, ceil: true, fog: { color: "#0d0a2e", near: 6, far: 32 }, bg: "#080620",
        amb: [0.36, 0.32, 0.66], sun: null, lamp: [0.3, 1.5, 1.7], lampR: 11, lampFrame: 3, props: [3, 4, 3, 4], hazard: "haz2", hazDmg: 16, hazName: "glowing spore-water",
        cells: () => {
            const rock = M.rock("#3a2f6a", "#6a5aa8", "#120c2c"), rootw = M.roots("#4a3a70", "#7c63a8", "#150e30");
            return [rock, M.spots("#3a2f6a", "#39ffd8", "#ff6fe0"), rootw, M.spots("#46387a", "#a0ff5a", "#39d8ff"),
                M.rock("#29314f", "#4a5a7a", "#0d1026"), M.spots("#2a2f55", "#39ffd8", "#a06bff"), M.rock("#231a48", "#3f3070", "#0b0820"), M.crate("#6a5a8a", "#4a3a68", "#2a2448"),
                M.glow("#231a48", "#c8fff4", "#2fd8c8", 0), M.rock("#51407f", "#8a74c4", "#1c1440"), M.spots("#2a3a4f", "#ff6fe0", "#ffd24a"), M.roots("#2a3a50", "#4a6a7a", "#0d1626")];
        },
    },
    {
        id: "kiln", title: "The Kiln Works", H: 5, ceil: true, fog: { color: "#5a1e0c", near: 9, far: 44 }, bg: "#230a06",
        amb: [0.8, 0.52, 0.4], sun: null, lamp: [2.2, 1.1, 0.35], lampR: 13, lampFrame: 4, props: [7, 2, 7, 10], hazard: "haz3", hazDmg: 20, hazName: "molten glaze",
        cells: () => {
            const b = M.brick("#3a2a26", "#8c3a2a", "#5e2620", 7, 3, "#120806"), pl = M.plate("#5d5a5c", "#7a7372", "#231f20", "#b09a6a");
            return [M.sill(b, "#4d4644"), M.glow("#3a2a26", "#fff0a0", "#ff5a1a", 2), pl, M.plate("#6b5a3e", "#857052", "#231f20", "#d0b070"),
                M.plate("#46403e", "#5c5450", "#1a1616", "#7a6a50"), M.tile("#3e3330", "#2c2422", "#120d0c", 3, 0.2), M.plate("#2c2626", "#3e3634", "#0c0a0a", "#5a4a38"), M.crate("#8a6a3a", "#5e4524", "#6a6462"),
                M.glow("#2c2626", "#ffe08a", "#ff6a1a", 0), M.brick("#2a1f1c", "#6e3226", "#452019", 7, 3, "#0a0505"), M.tile("#5a3a22", "#3e2818", "#120d0c", 2, 0.2), M.plate("#8a2f1e", "#a8432a", "#2a0f0a", "#e0b060")];
        },
    },
    {
        id: "palace", title: "The Porcelain Palace", H: 5.4, ceil: true, fog: { color: "#a9bce8", near: 16, far: 62 }, bg: "#8ea4dc",
        amb: [0.84, 0.86, 1.0], sun: null, lamp: [1.5, 1.2, 0.72], lampR: 12, lampFrame: 8, props: [8, 9, 8, 2], hazard: "haz4", hazDmg: 16, hazName: "liquid gilt",
        cells: () => {
            const d = M.delft("#f4f6fb", "#2a4fb0", "#a7b6d8"), g = M.sill(d, "#c9a13a", 0.17), m = M.marble("#f3f0ea", "#d9d4cc", "#7a88b8");
            return [g, M.sill(M.delft("#eef2fb", "#1f3f9a", "#a7b6d8"), "#c9a13a", 0.17), M.sill(M.tile("#f2f4fa", "#dfe6f6", "#9fb0d6", 2, 0.5), "#2a4fb0", 0.2), M.gold("#e8c35a", "#fff0a8", "#8a6420"),
                M.tile("#f4f1ea", "#26305a", "#8f96b0", 2, 0.6), M.carpet("#a81e3c", "#7c1430", "#e8c35a"), M.tile("#e6ecf8", "#c9d6f0", "#8fa2cf", 1, 0.3), M.crate("#e8ecf6", "#c5cfe6", "#c9a13a"),
                M.glow("#c9a13a", "#ffffff", "#ffe08a", 1), m, M.marble("#26305a", "#3a4678", "#c9a13a"), M.gold("#3a58c0", "#6b8cf0", "#c9a13a")];
        },
    },
    {
        id: "throne", title: "The Throne of Glaze", H: 6, ceil: false, sky: "sky5", fog: { color: "#3a0f3f", near: 18, far: 70 }, bg: "#1a0822",
        amb: [0.5, 0.3, 0.55], sun: { dir: [-0.5, 0.7, 0.4], color: [0.75, 0.4, 0.8] }, lamp: [1.9, 0.75, 0.3], lampR: 13, lampFrame: 8, props: [9, 8, 9, 2], hazard: "haz3", hazDmg: 20, hazName: "molten glaze",
        cells: () => {
            const m = M.marble("#3a1540", "#5a2a60", "#e8c35a"), g = M.gold("#e8c35a", "#fff0a8", "#6e4c14");
            return [M.sill(m, "#c9a13a", 0.15), M.sill(M.brick("#1e0a22", "#6a2240", "#4a1830", 5, 3), "#c9a13a", 0.15), g, M.gold("#a81e3c", "#e03c5c", "#e8c35a"),
                M.marble("#2a1030", "#4a1c50", "#e8c35a"), M.carpet("#a81e3c", "#7c1430", "#e8c35a"), M.rock("#231030", "#3a1a4a", "#100518"), M.crate("#7a3a6a", "#5a2850", "#c9a13a"),
                M.glow("#c9a13a", "#fff4c0", "#ff5a2a", 1), m, M.tile("#3a1540", "#c9a13a", "#100518", 2, 0.5), M.marble("#5a1a30", "#7c2a44", "#e8c35a")];
        },
    },
];

/** Cell indices used by the level baker. */
export const C = { WALL: 0, WALL2: 1, ALT: 2, ALT2: 3, FLOOR: 4, PATH: 5, CEIL: 6, CRATE: 7, GLOW: 8, UPPER: 9, FLOOR2: 10, FLOOR3: 11 };

// Hazard surfaces: mesh() draws a whole texture, not a sheet frame, so each frame is its own sprite.
const HAZ = [["#2a3a1c", "#566e2e", "#a8b84a"], ["#1c3a26", "#2e7a50", "#9affb0"], ["#0a2a4a", "#1a7ab8", "#6affea"], ["#6a1408", "#e0451a", "#ffdc6a"], ["#8a6420", "#e8c35a", "#fff6c0"]];
function paintHazard(game, i) {
    if (game.assets.sprites?.has?.(`haz${i}_0`)) return;
    const [a, b, c] = HAZ[i].map(hex);
    for (let f = 0; f < 3; f++) game.assets.paint(`haz${i}_${f}`, 96, 96, (p) => {
        const d = p.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const u = x / 96, v = y / 96, n = fbm(u, v, 4, 3), w = worley((u + f / 3) % 1, (v + f * 0.33) % 1, 4, 1);
            const e = Math.abs(fbm((u + f / 3) % 1, v, 3, 2) - 0.5) * 2;
            let col = mix(a, b, sstep(0.3, 0.7, n));
            col = mix(col, c, sstep(0.14, 0.02, e) * 0.9);
            col = mix(col, c, sstep(0.16, 0.05, w[0]) * 0.4);
            const o = (y * 96 + x) * 4;
            d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
        }
    }, { smooth: true });
}

const painted = new Set();
/** Paint a theme's atlas, the first time that level is played. */
export function paintTheme(game, i) {
    if (painted.has(i)) return;
    painted.add(i);
    const th = THEMES[i], fns = th.cells();
    paintHazard(game, Number(th.hazard.slice(3)));
    game.assets.paint(`atlas${i}`, ATLAS, ATLAS, (p) => {
        const d = p.data;
        for (let k = 0; k < CELLS * CELLS; k++) {
            const fn = fns[k] ?? fns[0], ax = (k % CELLS) * CELL, ay = Math.floor(k / CELLS) * CELL;
            for (let y = 0; y < CELL; y++) for (let x = 0; x < CELL; x++) {
                const c = fn((x + 0.5) / CELL, (y + 0.5) / CELL), o = ((ay + y) * ATLAS + ax + x) * 4;
                d[o] = c[0] < 0 ? 0 : c[0] > 255 ? 255 : c[0]; d[o + 1] = c[1] < 0 ? 0 : c[1] > 255 ? 255 : c[1]; d[o + 2] = c[2] < 0 ? 0 : c[2] > 255 ? 255 : c[2]; d[o + 3] = 255;
            }
        }
    }, { smooth: true });
}

// --- Sprites --------------------------------------------------------------------------------
const OUT = "#1b1226";
const SHEET = { smooth: true };

/** Everyone in this game is a glazed ceramic garden gnome. The pose comes from `o`. */
function gnome(p, o = {}) {
    const c = {
        hat: "#e0323f", hatD: "#8e1426", coat: "#2f6bd6", coatD: "#173a85", belt: "#3a2415", buckle: "#f4c542",
        beard: "#f8f3e8", beardD: "#c4bbaa", skin: "#f4b48a", skinD: "#c97f5e", pants: "#5a3d28", boot: "#2b1b14", eye: "#1b1226", ...o,
    };
    const X = 64 + (o.dx ?? 0), G = 152, sq = o.squash ?? 0, st = o.step ?? 0, hop = o.hop ?? 0;
    const B = G - 40 + sq + hop;       // belly centre
    const H = B - 34 + sq * 0.4;       // face centre
    // legs and boots
    for (const s of [-1, 1]) {
        const lift = s * st > 0 ? 8 : 0, kick = s * st * 5, lx = X + s * 14 + kick;
        p.line(lx, B + 18, lx, G - 8 - lift, c.pants, 13);
        p.ellipse(lx + s * 3, G - 6 - lift, 13, 7, c.boot);
        p.ellipse(lx + s * 1, G - 9 - lift, 6, 2.5, "#ffffff33");
    }
    // arm behind the body
    if (o.armBack) o.armBack(p, X, B, c);
    // body
    p.ellipse(X, B, 31 - sq * 0.5, 29 - sq, c.coat, c.coatD);
    p.ellipse(X - 13, B - 12, 8, 11, "#ffffff40");
    p.rect(X - 30, B + 6, 60, 7, c.belt);
    p.rect(X - 8, B + 3, 16, 13, c.buckle);
    p.rect(X - 4, B + 7, 8, 5, c.belt);
    // beard
    const bw = o.beardW ?? 23;
    p.ellipse(X, H + 21, bw, 26, c.beard, c.beardD);
    p.ellipse(X - bw * 0.72, H + 11, 9, 13, c.beard);
    p.ellipse(X + bw * 0.72, H + 11, 9, 13, c.beardD);
    // face
    p.ellipse(X, H, 21, 16, c.skin, c.skinD);
    // eyes
    const ey = H - 3;
    if (o.eyes === "x") {
        for (const s of [-1, 1]) {
            p.line(X + s * 9 - 4, ey - 4, X + s * 9 + 4, ey + 4, c.eye, 3);
            p.line(X + s * 9 + 4, ey - 4, X + s * 9 - 4, ey + 4, c.eye, 3);
        }
    } else {
        const glow = o.eyes === "glow", wide = o.eyes === "wide" || glow;
        for (const s of [-1, 1]) {
            p.ellipse(X + s * 9, ey, wide ? 6.5 : 5.5, wide ? 7 : 5, glow ? "#ffec6a" : "#ffffff");
            p.circle(X + s * 8 + (s > 0 ? -1 : 1), ey + 1, wide ? 2.6 : 3, glow ? "#e0202f" : c.eye);
            if (!wide) p.line(X + s * 3, ey - 5, X + s * 16, ey - 10, c.eye, 4);
            else p.line(X + s * 3, ey - 11, X + s * 15, ey - 12, c.eye, 3);
        }
    }
    // nose and mouth
    p.ellipse(X, H + 5, 8.5, 7.5, "#ff8f7a", "#d0594c");
    p.circle(X - 3, H + 2.5, 2.2, "#ffffff99");
    if (o.mouth === "open") p.ellipse(X, H + 18, 8, 7, "#5a1020");
    else if (o.mouth === "grit") { p.rect(X - 8, H + 14, 16, 6, "#ffffff"); p.line(X - 8, H + 17, X + 8, H + 17, "#8a7a70", 1); }
    else p.line(X - 7, H + 17, X + 7, H + 15, "#6a3f3a", 3);
    // hat
    if (!o.noHat) {
        const hb = H - 11, hw = o.hatW ?? 27, hh = o.hatH ?? 60, tip = o.tip ?? 16;
        p.poly([[X - hw, hb + 4], [X + hw, hb + 4], [X + hw * 0.42, hb - hh * 0.6], [X + tip, hb - hh], [X + tip - 3, hb - hh + 3], [X - hw * 0.46, hb - hh * 0.55]], c.hat);
        p.poly([[X + 2, hb + 4], [X + hw, hb + 4], [X + hw * 0.42, hb - hh * 0.6], [X + tip, hb - hh]], c.hatD);
        p.ellipse(X - 9, hb - 18, 5, 15, "#ffffff55");
        p.ellipse(X, hb + 4, hw + 3, 6, c.hatD);
        p.ellipse(X, hb + 2, hw + 2, 5, c.hat);
    }
    if (o.armFront) o.armFront(p, X, B, c);
    p.outline(OUT).shade(0.16, 0.14);
}

const pickaxe = (p, x, y, up) => {
    const a = up ? -1.1 : -0.1, hx = x + Math.cos(a) * 40, hy = y + Math.sin(a) * 40;
    p.line(x - Math.cos(a) * 8, y - Math.sin(a) * 8, hx, hy, "#7a5128", 6);
    const nx = -Math.sin(a), ny = Math.cos(a);
    p.poly([[hx - nx * 22, hy - ny * 22], [hx + Math.cos(a) * 5, hy + Math.sin(a) * 5], [hx + nx * 22, hy + ny * 22], [hx - Math.cos(a) * 5, hy - Math.sin(a) * 5]], "#b9c4d0");
};

function paintEnemies(A) {
    // n: Nibbler, the rusher. Red hat, little pickaxe. Tell: pick up high and glowing eyes.
    const nib = { coat: "#34a853", coatD: "#16632e", hatW: 24, hatH: 54 };
    A.paint("e_nib", 128, 160, (p, f) => {
        const arm = (up) => (q, X, B, c) => {
            const hx = X + 32, hy = B - (up ? 24 : 2);
            q.line(X + 22, B - 8, hx, hy, c.coatD, 11);
            q.circle(hx, hy, 7, c.skin);
            pickaxe(q, hx, hy, up);
        };
        const po = [
            { armFront: arm(false) }, { armFront: arm(false), step: 1, hop: -4 }, { armFront: arm(false), step: -1, hop: -4 },
            { armFront: arm(true), eyes: "glow", mouth: "open", squash: 4 }, { armFront: arm(false), dx: 4, mouth: "open", eyes: "wide", hop: -6 },
            { armFront: arm(false), eyes: "x", mouth: "open", squash: 7, dx: -4 },
        ][f];
        gnome(p, { ...nib, ...po });
    }, { frames: 6, ...SHEET });

    // s: Slingnome, the ranged one. Purple coat, yellow hat, and a slingshot.
    const sl = { coat: "#7a3fc8", coatD: "#43207c", hat: "#f4b82c", hatD: "#a86c10", beard: "#d9d0e8", beardD: "#9a8cb8" };
    A.paint("e_sling", 128, 160, (p, f) => {
        const sling = (pull) => (q, X, B, c) => {
            const hx = X + 8, hy = B - 28;
            q.line(X - 20, B - 6, hx - 6, hy + 10, c.coatD, 10);
            q.line(hx, hy + 22, hx, hy + 4, "#7a5128", 7);
            q.line(hx, hy + 4, hx - 13, hy - 14, "#7a5128", 6);
            q.line(hx, hy + 4, hx + 13, hy - 14, "#7a5128", 6);
            const px = hx, py = hy + (pull ? 22 : 2);
            q.line(hx - 13, hy - 14, px, py, "#3a2415", 2);
            q.line(hx + 13, hy - 14, px, py, "#3a2415", 2);
            q.circle(px, py, pull ? 8 : 6, pull ? "#ffb347" : "#c9703f");
            if (pull) q.circle(px, py, 4, "#fff0a8");
            q.line(X + 24, B - 4, X + 12, py + 4, c.coatD, 10);
            q.circle(hx, hy + 24, 7, c.skin);
        };
        const po = [{}, { step: 1, hop: -3 }, { step: -1, hop: -3 }, { pull: 1, eyes: "glow", squash: 4 }, { eyes: "wide", mouth: "open", hop: -4 }, { eyes: "x", mouth: "open", squash: 7, dx: -5 }][f];
        gnome(p, { ...sl, ...po, armFront: sling(!!po.pull) });
    }, { frames: 6, ...SHEET });

    // f: Whirligig, the flyer. A gnome strapped to a propeller, with a sharp little trowel.
    A.paint("e_fly", 128, 160, (p, f) => {
        const spin = f % 2;
        const prop = (q, X) => {
            q.line(X, 18, X, 34, "#6a6a78", 5);
            if (spin === 0) { q.ellipse(X - 28, 15, 28, 5, "#f4c542"); q.ellipse(X + 28, 15, 28, 5, "#e0323f"); } else { q.ellipse(X - 13, 15, 13, 6, "#f4c542"); q.ellipse(X + 13, 15, 13, 6, "#e0323f"); }
            q.circle(X, 16, 5, "#2b1b14");
        };
        const dive = f === 3 || f === 4, hurt = f === 5;
        gnome(p, {
            coat: "#22a7b8", coatD: "#0e5f70", hat: "#f07a2a", hatD: "#a84a10", hatH: 30, hatW: 22, tip: 3, step: f % 2 ? 1 : -1,
            eyes: hurt ? "x" : dive ? "glow" : undefined, mouth: dive || hurt ? "open" : undefined, hop: -8,
            armFront: (q, X, B, c) => {
                q.line(X + 22, B - 6, X + 34, dive ? B + 18 : B - 22, c.coatD, 10);
                q.line(X - 22, B - 6, X - 34, dive ? B - 22 : B + 6, c.coatD, 10);
                const tx = X + 34, ty = dive ? B + 18 : B - 22;
                q.circle(tx, ty, 6, c.skin);
                q.poly([[tx - 6, ty], [tx + 6, ty], [tx, ty + (dive ? 26 : -26)]], "#c8d2dc");
            },
        });
        prop(p, 64);
    }, { frames: 6, ...SHEET });

    // k: Bathsworth, the shielded one. Holds a stone birdbath as a shield. Frame 6 is from behind.
    const kn = { coat: "#8c8ca0", coatD: "#4a4a60", hat: "#3a3f58", hatD: "#1e2236", beard: "#e8b84a", beardD: "#a87a22", hatH: 48, hatW: 29, beardW: 25 };
    A.paint("e_shield", 128, 160, (p, f) => {
        const shield = (q, X, B, low) => {
            const sy = B - (low ? -12 : 14), sx = X;
            q.ellipse(sx, sy, 34, low ? 18 : 37, "#9aa3ad", "#5a636e");
            q.ellipse(sx, sy, 26, low ? 13 : 29, "#c5ced6", "#7a848f");
            q.ellipse(sx, sy, 18, low ? 8 : 20, "#6fc3e8", "#2a7fb0");
            q.ellipse(sx - 6, sy - (low ? 3 : 7), 6, low ? 2 : 6, "#ffffffaa");
        };
        if (f === 6) { // back view: no shield in the way
            p.ellipse(64, 112, 31, 30, kn.coat, kn.coatD);
            p.rect(36, 118, 56, 8, "#3a2415");
            for (const s of [-1, 1]) { p.line(64 + s * 14, 130, 64 + s * 14, 144, "#5a3d28", 13); p.ellipse(64 + s * 15, 146, 13, 7, "#2b1b14"); }
            p.ellipse(64, 72, 24, 18, kn.beard, kn.beardD);
            p.poly([[36, 66], [92, 66], [76, 30], [66, 8], [60, 12], [50, 34]], kn.hat);
            p.poly([[64, 66], [92, 66], [76, 30], [66, 8]], kn.hatD);
            p.ellipse(64, 66, 30, 6, kn.hat);
            p.circle(64, 112, 16, "#e0323f"); p.circle(64, 112, 10, "#fff"); p.circle(64, 112, 5, "#e0323f"); // a target, because it's rude
            p.outline(OUT).shade(0.16, 0.14);
            return;
        }
        const po = [{}, { step: 1, hop: -3 }, { step: -1, hop: -3 }, { low: 1, eyes: "glow", mouth: "open", squash: 3 }, { dx: 3, mouth: "grit", eyes: "wide", hop: -5 }, { low: 1, eyes: "x", mouth: "open", squash: 6, dx: -4 }][f];
        gnome(p, {
            ...kn, ...po,
            armFront: (q, X, B) => shield(q, X + (po.low ? 0 : 2), B, po.low),
        });
    }, { frames: 7, ...SHEET });

    // o: Fizzbang, the exploder. Strapped to a firework rocket; tell is flashing white-hot.
    A.paint("e_bomb", 128, 160, (p, f) => {
        const hot = f === 3 || f === 4;
        const rocket = (q, X, B) => {
            q.rect(X - 15, B - 74, 30, 96, hot && f === 4 ? "#ffffff" : "#ff4f6d");
            for (let i = 0; i < 4; i++) q.rect(X - 15, B - 66 + i * 22, 30, 8, hot && f === 4 ? "#ffe066" : "#fff2c4");
            q.poly([[X - 17, B - 74], [X + 17, B - 74], [X, B - 100]], "#ffb31a");
            q.line(X + 6, B - 92, X + 20, B - 104, "#3a2415", 3);
            if (f !== 5) { q.circle(X + 21, B - 106, f % 2 ? 7 : 5, "#fff0a0"); q.circle(X + 21, B - 106, 3, "#ff5a1a"); }
        };
        gnome(p, {
            armBack: (q, X, B) => rocket(q, X, B), coat: "#e8842a", coatD: "#94461a", hat: "#3a3f58", hatD: "#1e2236", hatH: 26, hatW: 22, tip: 6, beard: "#e8e0d0",
            step: f === 1 ? 1 : f === 2 ? -1 : 0, hop: f === 1 || f === 2 ? -5 : 0, eyes: f === 5 ? "x" : hot ? "glow" : "wide", mouth: "open", squash: hot ? 3 : 0,
        });
    }, { frames: 6, ...SHEET });

    // M: Mowgul, the heavy. A very large gnome on a very angry lawnmower.
    A.paint("e_mow", 192, 192, (p, f) => {
        const hot = f === 3 || f === 4, jig = f === 1 ? 2 : f === 2 ? -2 : 0, X = 96;
        // Mower chassis
        p.rect(30, 124 + jig, 132, 36, hot ? "#ff6a2a" : "#d13a2a");
        p.gradient(30, 124 + jig, 132, 12, "#ff7a5a", hot ? "#ff6a2a" : "#d13a2a");
        p.rect(30, 150 + jig, 132, 10, "#7c1a14");
        for (let i = 0; i < 5; i++) p.poly([[34 + i * 26, 160 + jig], [58 + i * 26, 160 + jig], [46 + i * 26, 176 + jig]], "#c8d2dc");
        for (const s of [-1, 1]) { p.circle(X + s * 62, 164, 22, "#1e1a22"); p.circle(X + s * 62, 164, 10, "#f4c542"); p.circle(X + s * 62, 164, 4, "#8a6420"); }
        p.rect(40, 112 + jig, 24, 14, "#6a6a78"); p.rect(128, 112 + jig, 24, 14, "#6a6a78");
        if (hot) { p.ellipse(52, 102, 8, 12, "#ffb347"); p.ellipse(140, 102, 8, 12, "#ffb347"); p.ellipse(52, 104, 4, 7, "#fff0a0"); p.ellipse(140, 104, 4, 7, "#fff0a0"); }
        // Driver
        const B = 92 + jig, Y = B - 42;
        p.ellipse(X, B, 46, 40, "#3a7d3a", "#1c4a22");
        p.ellipse(X - 20, B - 16, 10, 14, "#ffffff40");
        p.rect(X - 44, B + 14, 88, 9, "#3a2415"); p.rect(X - 10, B + 10, 20, 17, "#f4c542");
        p.ellipse(X, Y + 28, 34, 34, "#f8f3e8", "#c4bbaa");
        p.ellipse(X, Y, 30, 21, "#f4b48a", "#c97f5e");
        const e5 = f === 5;
        for (const s of [-1, 1]) {
            if (e5) { p.line(X + s * 13 - 5, Y - 7, X + s * 13 + 5, Y + 3, OUT, 3); p.line(X + s * 13 + 5, Y - 7, X + s * 13 - 5, Y + 3, OUT, 3); continue; }
            p.ellipse(X + s * 13, Y - 3, 7, hot ? 8 : 6, hot ? "#ffec6a" : "#fff"); p.circle(X + s * 12, Y - 2, 3.4, hot ? "#e0202f" : OUT); p.line(X + s * 4, Y - 8, X + s * 23, Y - 14, OUT, 5);
        }
        p.ellipse(X, Y + 7, 12, 10, "#ff8f7a", "#d0594c"); p.ellipse(X, Y + 24, 11, 8, hot ? "#5a1020" : "#a0705a");
        p.poly([[X - 38, Y - 13], [X + 38, Y - 13], [X + 14, Y - 66], [X + 24, Y - 86], [X - 18, Y - 58]], "#3a3f58");
        p.poly([[X + 2, Y - 13], [X + 38, Y - 13], [X + 14, Y - 66], [X + 24, Y - 86]], "#1e2236");
        p.ellipse(X, Y - 13, 41, 7, "#1e2236");
        for (const s of [-1, 1]) { p.line(X + s * 44, B - 10, X + s * 28, B + 26, "#1c4a22", 14); p.circle(X + s * 28, B + 26, 9, "#f4b48a"); }
        p.outline(OUT).shade(0.14, 0.12);
    }, { frames: 6, ...SHEET });

    // K: King Grumbold the Glazed. Frames: idle, idle2, raise (tell), slam, summon, hurt.
    A.paint("e_boss", 256, 256, (p, f) => {
        const X = 128, B = 176, Y = B - 58, raise = f === 2 || f === 4, slam = f === 3, phase2 = f >= 6;
        const coat = phase2 ? "#a81e3c" : "#6a2bb0", coatD = phase2 ? "#5a0f22" : "#361060";
        for (const s of [-1, 1]) { p.line(X + s * 34, 216, X + s * 34, 240, "#3a2415", 28); p.ellipse(X + s * 38, 243, 28, 11, "#1b1226"); }
        // cape
        p.poly([[X - 60, 112], [X + 60, 112], [X + 92, 240], [X - 92, 240]], "#c8263c");
        p.poly([[X - 92, 240], [X + 92, 240], [X + 92, 228], [X - 92, 228]], "#f4f0e0");
        p.ellipse(X, B + (slam ? 10 : 0), 72, 62 - (slam ? 8 : 0), coat, coatD);
        p.ellipse(X - 34, B - 26, 15, 22, "#ffffff55");
        p.ellipse(X + 40, B + 6, 8, 16, "#ffffff22");
        p.rect(X - 70, B + 18, 140, 14, "#2b1b14"); p.rect(X - 22, B + 11, 44, 28, "#f4c542"); p.rect(X - 12, B + 19, 24, 12, "#c92a3e");
        p.ellipse(X, Y + 42, 54, 60, "#fbf4e2", "#c7b98f");
        for (const s of [-1, 1]) p.ellipse(X + s * 42, Y + 26, 18, 26, "#fbf4e2");
        p.ellipse(X, Y, 46, 32, "#f4b48a", "#c97f5e");
        const hot = raise || slam || f === 7;
        for (const s of [-1, 1]) {
            if (f === 5) { p.line(X + s * 20 - 8, Y - 12, X + s * 20 + 8, Y + 4, OUT, 5); p.line(X + s * 20 + 8, Y - 12, X + s * 20 - 8, Y + 4, OUT, 5); continue; }
            p.ellipse(X + s * 20, Y - 5, 11, hot ? 12 : 9, hot ? "#ffec6a" : "#fff");
            p.circle(X + s * 18, Y - 3, 5, hot ? "#e0202f" : OUT);
            p.line(X + s * 5, Y - 14, X + s * 36, Y - 24, OUT, 7);
        }
        p.ellipse(X, Y + 11, 18, 14, "#ff8f7a", "#d0594c"); p.circle(X - 6, Y + 6, 4, "#ffffffaa");
        if (hot || f === 5) p.ellipse(X, Y + 36, 18, 13, "#5a1020"); else p.rect(X - 16, Y + 31, 32, 8, "#fff");
        // crown
        const cy = Y - 28;
        if (!phase2) {
            p.poly([[X - 44, cy], [X + 44, cy], [X + 54, cy - 44], [X + 24, cy - 20], [X, cy - 56], [X - 24, cy - 20], [X - 54, cy - 44]], "#f4c542");
            p.rect(X - 44, cy - 10, 88, 12, "#c9962a");
            p.circle(X, cy - 4, 6, "#e0323f"); p.circle(X - 26, cy - 4, 4, "#22d3ee"); p.circle(X + 26, cy - 4, 4, "#22c55e");
        } else {
            p.ellipse(X, cy + 2, 40, 18, "#f4b48a", "#c97f5e");
            p.poly([[X + 8, cy - 8], [X + 30, cy - 8], [X + 18, cy + 8]], "#ffec6a");
            p.line(X - 24, cy - 4, X - 6, cy + 8, "#8e1426", 3);
        }
        // arms and sceptre
        const ay = raise ? B - 118 : slam ? B + 44 : B - 30;
        for (const s of [-1, 1]) { p.line(X + s * 66, B - 28, X + s * 92, ay, coatD, 24); p.circle(X + s * 92, ay, 16, "#f4b48a"); }
        p.line(X + 92, ay + 26, X + 92, ay - 66, "#c9962a", 9);
        p.circle(X + 92, ay - 74, 16, "#ff5a7a", "#a81e3c"); p.circle(X + 87, ay - 80, 5, "#ffffffbb");
        p.outline(OUT).shade(0.14, 0.14);
    }, { frames: 8, ...SHEET });

    // Debris: frames 0-3 hats, 4-7 ceramic shards, 8 gear, 9 buckle, 10 boot.
    A.paint("debris", 48, 48, (p, f) => {
        if (f < 4) {
            const h = ["#e0323f", "#34a853", "#f4b82c", "#3a3f58"][f], d = ["#8e1426", "#16632e", "#a86c10", "#1e2236"][f];
            p.poly([[6, 40], [42, 40], [30, 16], [32, 3], [18, 16]], h); p.poly([[24, 40], [42, 40], [30, 16], [32, 3]], d); p.ellipse(24, 40, 20, 5, d);
        } else if (f < 8) {
            const c = ["#f8f3e8", "#f4b48a", "#2f6bd6", "#34a853"][f - 4], d = ["#b9b0a0", "#c97f5e", "#173a85", "#16632e"][f - 4];
            p.poly([[8, 34], [20, 8], [40, 16], [36, 36], [22, 42]], c); p.poly([[20, 8], [40, 16], [36, 36], [24, 26]], d); p.poly([[12, 30], [20, 14], [24, 26]], "#ffffff66");
        } else if (f === 8) { p.circle(24, 24, 15, "#f4c542"); p.circle(24, 24, 6, "#7a5128"); } else { p.rect(10, 12, 28, 24, "#f4c542"); p.rect(16, 18, 16, 12, "#2b1b14"); }
        p.outline(OUT);
    }, { frames: 10, ...SHEET });

    // Projectiles: 0 clay pellet, 1 glow pellet, 2-5 pumpkin spin, 6 boss shell, 7 spark orb
    A.paint("shots", 64, 64, (p, f) => {
        if (f < 2) { p.circle(32, 32, 20, "#ff9a3c", "#c9471c"); p.circle(32, 32, 12, "#ffe08a"); p.circle(32, 32, f ? 7 : 5, "#ffffff"); } else if (f < 6) {
            const k = f - 2;
            for (let i = -2; i <= 2; i++) p.ellipse(32 + i * 8, 34, 11, 24, i % 2 ? "#f28a1c" : "#ffa42c", "#c75a10");
            p.rect(28, 6, 8, 8, "#3a7d3a");
            for (const s of [-1, 1]) p.poly([[32 + s * 13 - 5, 30 + k], [32 + s * 13 + 5, 30 + k], [32 + s * 13, 20 + k]], "#3a1a08");
            p.poly([[20, 42], [44, 42], [38, 50], [26, 50]], "#3a1a08");
            p.poly([[20, 42], [44, 42], [32, 46]], "#ffb34c");
        } else if (f === 6) { p.circle(32, 32, 26, "#e03c5c", "#7c1430"); p.circle(32, 32, 15, "#ffb0c0"); p.circle(26, 26, 6, "#fff"); } else { p.circle(32, 32, 18, "#7df0ff", "#2a8ad8"); p.circle(32, 32, 9, "#fff"); }
        p.outline(OUT);
    }, { frames: 8, ...SHEET });

    // Explosion frames: chunky comic blast
    A.paint("boom", 128, 128, (p, f) => {
        const k = (f + 1) / 6, R = 16 + 44 * Math.sqrt(k), cols = [["#ffffff", "#fff2a0"], ["#fff2a0", "#ffb31a"], ["#ffc93c", "#ff6a1a"], ["#ff9a3c", "#c9371c"], ["#a84a2a", "#5a2a2a"], ["#6a5a5a", "#3a3036"]][f];
        const pts = [];
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r = R * (i % 2 ? 1 : 0.68 + ((i * 7) % 5) * 0.04); pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); }
        for (let i = 0; i < 18; i++) { const a = pts[i], b = pts[(i + 1) % 18]; p.poly([[64, 64], a, b], cols[1]); }
        if (f < 5) p.circle(64, 64, R * 0.62, cols[0], cols[1]);
        for (let i = 0; i < 6 && f > 0; i++) { const a = i * 1.1 + f, r = R * 0.8; p.circle(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 9 - f, cols[0]); }
    }, { frames: 6, ...SHEET });

    // Blob shadow for the floor
    A.paint("blob", 64, 64, (p) => {
        for (let r = 30; r > 0; r -= 2) p.circle(32, 32, r, `#000000${(10 + (30 - r)).toString(16).padStart(2, "0")}`);
    }, { smooth: true });
}

function paintProps(A) {
    // Props sheet: 0 lantern, 1 topiary, 2 inert gnome, 3 glow mushroom, 4 mushroom cluster, 5 pot plant,
    // 6 watering can, 7 kiln pot, 8 delft vase, 9 gold statue, 10 chain brazier, 11 fertiliser sack (explodes)
    A.paint("props", 96, 128, (p, f) => {
        const X = 48, G = 124;
        if (f === 0) {
            p.line(X, G, X, 44, "#2a2230", 7); p.rect(X - 14, G - 6, 28, 6, "#2a2230");
            p.poly([[X - 16, 44], [X + 16, 44], [X + 11, 16], [X - 11, 16]], "#fff0a8");
            p.ellipse(X, 34, 8, 12, "#ffffff"); p.rect(X - 18, 42, 36, 6, "#2a2230"); p.poly([[X - 16, 18], [X + 16, 18], [X, 2]], "#2a2230");
        } else if (f === 1) {
            p.rect(X - 15, G - 18, 30, 18, "#b5573a"); p.rect(X - 18, G - 22, 36, 6, "#d27a55"); p.line(X, G - 22, X, 80, "#5a3a22", 6);
            p.circle(X, 66, 26, "#3f8a44", "#1d5a2e"); p.circle(X, 26, 18, "#4f9a4a", "#245f30");
            for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i * 37) % 24; p.circle(X + Math.cos(a) * r, 66 + Math.sin(a) * r, 3.5, "#7fc65a"); }
        } else if (f === 3) {
            p.ellipse(X, G - 26, 11, 30, "#e9e4f7", "#a6a0d0"); p.ellipse(X, 48, 42, 30, "#39e6d8", "#1a7fa8"); p.ellipse(X, 62, 40, 14, "#8df5ff");
            for (const [a, b, r] of [[-22, 36, 7], [10, 30, 9], [24, 46, 5], [-6, 46, 4]]) p.circle(X + a, b, r, "#d9fff8");
            p.ellipse(X - 14, 32, 10, 5, "#ffffffbb");
        } else if (f === 4) {
            const m = (x, h, r, c, d) => { p.ellipse(x, G - h / 2, r * 0.35, h / 2, "#e9e4f7", "#a6a0d0"); p.ellipse(x, G - h, r, r * 0.68, c, d); p.circle(x - r * 0.3, G - h - 3, r * 0.2, "#ffffffcc"); };
            m(24, 64, 24, "#ff6fe0", "#a02a9a"); m(68, 46, 20, "#a06bff", "#5a2ac0"); m(46, 26, 15, "#ffd24a", "#d0701a");
        } else if (f === 5) {
            p.poly([[X - 24, G - 40], [X + 24, G - 40], [X + 16, G], [X - 16, G]], "#c9703f"); p.rect(X - 27, G - 46, 54, 9, "#de8a52");
            for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + i * 0.1); p.line(X, G - 46, X + Math.cos(a) * 42, G - 46 + Math.sin(a) * 58, i % 2 ? "#2f8f4e" : "#55b858", 9); }
            p.circle(X - 10, 40, 8, "#ff5ad0"); p.circle(X + 16, 30, 7, "#ffd24a"); p.circle(X + 2, 22, 6, "#ff5ad0");
        } else if (f === 6) {
            p.ellipse(X + 4, G - 34, 26, 30, "#59a7c9", "#2c6c8e"); p.line(X - 18, G - 44, X - 42, G - 62, "#59a7c9", 8); p.rect(X - 48, G - 72, 14, 7, "#2c6c8e");
            p.ellipse(X + 30, G - 40, 12, 18, "#00000000"); p.line(X + 26, G - 62, X + 40, G - 34, "#2c6c8e", 5); p.line(X - 8, G - 66, X + 16, G - 66, "#2c6c8e", 5);
        } else if (f === 7) {
            p.ellipse(X, G - 44, 34, 42, "#8a5a3a", "#4a2c1c"); p.rect(X - 22, G - 92, 44, 12, "#5a3a26"); p.ellipse(X, G - 36, 18, 13, "#ff9a3c", "#c9371c"); p.ellipse(X, G - 36, 10, 7, "#fff0a0");
        } else if (f === 8) {
            p.ellipse(X, G - 40, 28, 38, "#f4f6fb", "#c0cce8"); p.rect(X - 12, G - 96, 24, 26, "#e8ecf8"); p.ellipse(X, G - 98, 18, 6, "#2a4fb0"); p.rect(X - 16, G - 8, 32, 8, "#2a4fb0");
            p.circle(X, G - 40, 14, "#2a4fb0"); p.circle(X, G - 40, 8, "#f4f6fb"); p.line(X - 26, G - 62, X + 26, G - 62, "#2a4fb0", 3); p.line(X - 26, G - 18, X + 26, G - 18, "#2a4fb0", 3);
        } else if (f === 9) {
            p.rect(X - 26, G - 14, 52, 14, "#6b5a3e");
            p.ellipse(X, G - 48, 26, 34, "#f4c542", "#a8741a"); p.ellipse(X, G - 86, 18, 16, "#f4c542", "#a8741a");
            p.poly([[X - 20, G - 94], [X + 20, G - 94], [X + 6, G - 124], [X, G - 124]], "#c9962a"); p.ellipse(X - 8, G - 58, 6, 12, "#fff2a8cc");
        } else if (f === 10) {
            p.line(X - 18, G, X, G - 44, "#2a2230", 6); p.line(X + 18, G, X, G - 44, "#2a2230", 6);
            p.poly([[X - 26, G - 60], [X + 26, G - 60], [X + 16, G - 38], [X - 16, G - 38]], "#3a2c30");
            p.ellipse(X, G - 72, 22, 30, "#ff9a3c", "#ff5a1a"); p.ellipse(X, G - 64, 13, 18, "#ffe08a"); p.ellipse(X, G - 60, 7, 9, "#ffffff");
        } else if (f === 11) {
            p.ellipse(X, G - 38, 36, 42, "#c8a860", "#7a6236"); p.rect(X - 18, G - 92, 36, 10, "#5a4628"); p.ellipse(X, G - 96, 22, 9, "#c8a860");
            p.circle(X, G - 40, 18, "#d0371c"); p.poly([[X - 5, G - 58], [X + 8, G - 44], [X, G - 42], [X + 6, G - 26], [X - 8, G - 40], [X, G - 42]], "#fff0a0"); p.ellipse(X - 16, G - 56, 6, 10, "#ffffff44");
        }
        p.outline(OUT).shade(0.14, 0.14);
    }, { frames: 12, smooth: true });
    // Prop 2 is a stone gnome statue, painted on its own so that it can share `gnome()`.
    A.paint("statue", 128, 160, (p) => gnome(p, { coat: "#9aa3ad", coatD: "#5a636e", hat: "#b9c0c8", hatD: "#6e767e", beard: "#d9dde0", beardD: "#9aa3ad", skin: "#c5ccd2", skinD: "#8a929a", eyes: "wide" }), SHEET);

    // Pickups: 0 tea, 1 biscuit, 2 cardigan, 3 thorns, 4 hornet jar, 5 pumpkin, 6 bulbs, 7 red key, 8 blue key, 9 gold key,
    // 10 pea gun, 11 thornbuss, 12 hornet hose, 13 mortar, 14 zapper, 15 gnome-hole exit, 16 switch off, 17 switch on, 18 jump pad, 19 secret star
    A.paint("items", 96, 96, (p, f) => {
        const X = 48;
        if (f === 0) {
            p.ellipse(X, 80, 34, 8, "#f4f0e0", "#b8ae96"); p.poly([[20, 40], [76, 40], [68, 76], [28, 76]], "#f8f4ea"); p.ellipse(X, 40, 28, 9, "#7a4220", "#a86a30");
            p.ellipse(82, 58, 11, 13, "#00000000"); p.line(76, 46, 88, 50, "#f8f4ea", 5); p.line(88, 50, 86, 66, "#f8f4ea", 5); p.line(86, 66, 72, 68, "#f8f4ea", 5);
            p.rect(30, 52, 36, 7, "#e0506a"); p.line(38, 26, 42, 12, "#ffffff99", 4); p.line(54, 26, 50, 10, "#ffffff99", 4);
        } else if (f === 1) {
            p.circle(X, 50, 26, "#d9a15a", "#a06a2a"); for (const [a, b] of [[-10, -8], [8, -12], [12, 8], [-8, 10], [0, 0]]) p.circle(X + a, 50 + b, 3.5, "#5a3018");
        } else if (f === 2) {
            p.poly([[22, 26], [74, 26], [84, 80], [12, 80]], "#a84ad0"); p.poly([[40, 26], [56, 26], [50, 80], [46, 80]], "#d7a7ec");
            for (let i = 0; i < 4; i++) p.rect(16, 40 + i * 11, 64, 4, "#7a2ca8"); for (let i = 0; i < 4; i++) p.circle(48, 38 + i * 12, 3.5, "#f4c542");
        } else if (f === 3) {
            p.rect(22, 34, 52, 50, "#7a5128"); p.rect(22, 34, 52, 8, "#a3743f"); for (let i = 0; i < 6; i++) p.poly([[26 + i * 8, 34], [32 + i * 8, 34], [29 + i * 8, 12]], "#8ad65a");
        } else if (f === 4) {
            p.rect(26, 26, 44, 56, "#ffd24a"); p.rect(24, 18, 48, 10, "#7a5128"); p.rect(26, 46, 44, 7, "#2b1b14"); p.rect(26, 64, 44, 7, "#2b1b14"); p.ellipse(36, 40, 5, 14, "#ffffff88");
        } else if (f === 5) {
            for (let i = -2; i <= 2; i++) p.ellipse(X + i * 12, 54, 15, 30, i % 2 ? "#f28a1c" : "#ffa42c", "#c75a10"); p.rect(43, 14, 10, 12, "#3a7d3a");
        } else if (f === 6) {
            p.circle(X, 40, 24, "#a6f0ff", "#2a9ad8"); p.rect(38, 62, 20, 16, "#8a8a98"); p.line(40, 42, 48, 30, "#fff", 3); p.line(48, 30, 56, 42, "#fff", 3);
        } else if (f >= 7 && f <= 9) {
            const c = ["#ff4a5e", "#4a9dff", "#ffd24a"][f - 7], d = ["#a81e3c", "#1e4fb0", "#a8741a"][f - 7];
            p.circle(X, 26, 18, c, d); p.circle(X, 26, 8, "#1b1226"); p.rect(43, 40, 10, 44, c); p.rect(53, 64, 14, 7, d); p.rect(53, 76, 10, 7, d); p.ellipse(42, 18, 5, 7, "#ffffffaa");
        } else if (f === 10) {
            p.ellipse(X, 46, 34, 13, "#5fbf4a", "#2a7a2e"); p.line(30, 56, 24, 80, "#7a5128", 11);
        } else if (f === 11) {
            p.line(10, 62, 70, 40, "#7a5128", 13); p.line(52, 46, 90, 32, "#c9962a", 11); p.poly([[84, 18], [94, 48], [80, 46]], "#f4c542");
        } else if (f === 12) {
            p.rect(14, 34, 60, 30, "#ffd24a"); p.rect(26, 34, 10, 30, "#2b1b14"); p.rect(48, 34, 10, 30, "#2b1b14"); for (let i = 0; i < 3; i++) p.rect(74, 36 + i * 10, 18, 6, "#8a8a98");
        } else if (f === 13) {
            p.line(12, 66, 80, 34, "#4a4a58", 24); p.circle(82, 32, 15, "#ffa42c", "#c75a10"); p.circle(26, 62, 8, "#c9962a");
        } else if (f === 14) {
            p.line(20, 84, 48, 46, "#3a3f58", 9); p.ellipse(60, 30, 26, 26, "#7df0ff", "#2a8ad8"); p.ellipse(60, 30, 19, 19, "#123a5a");
            for (let i = -2; i <= 2; i++) p.line(44, 30 + i * 6, 76, 30 + i * 6, "#7df0ff", 2);
        } else if (f === 15) {
            p.ellipse(X, 56, 40, 40, "#3f2415", "#1e1008"); p.ellipse(X, 56, 31, 31, "#a6ff7a", "#2fbf5a"); p.ellipse(X, 56, 20, 20, "#eaffd0"); p.rect(8, 82, 80, 12, "#3a7d3a");
        } else if (f === 16 || f === 17) {
            const on = f === 17;
            p.rect(26, 50, 44, 40, "#4a4a58"); p.rect(30, 54, 36, 32, "#2b2b38"); p.line(X, 74, on ? 72 : 24, 18, "#c8d2dc", 8); p.circle(on ? 72 : 24, 18, 11, on ? "#5aff7a" : "#ff4a5e"); p.circle(X, 74, 8, "#f4c542");
        } else if (f === 18) {
            p.ellipse(X, 72, 40, 14, "#c92a3e", "#7c1430"); p.ellipse(X, 66, 30, 8, "#ff7a8a"); for (let i = -1; i <= 1; i++) p.rect(X + i * 18 - 2, 76, 4, 14, "#c8d2dc");
        } else if (f === 20) { // "!" tell marker, floats above a gnome that is about to do something rude
            p.circle(X, 48, 34, "#ffd24a", "#ff8a1f"); p.rect(X - 7, 22, 14, 34, "#1b1226"); p.circle(X, 70, 8, "#1b1226");
        } else if (f === 19) {
            const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 16 : 36; pts.push([X + Math.cos(a) * r, 48 + Math.sin(a) * r]); }
            for (let i = 0; i < 10; i++) p.poly([[X, 48], pts[i], pts[(i + 1) % 10]], "#ffe066");
        }
        if (f !== 15) p.outline(OUT).shade(0.16, 0.12);
    }, { frames: 21, smooth: true });

}

// --- First person weapons -----------------------------------------------------------------------
function sleeve(p, x0, y0, x1, y1, w) {
    p.line(x0, y0, x1, y1, "#7a3fb0", w);
    const n = 7;
    for (let i = 1; i < n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, dx = (y1 - y0), dy = -(x1 - x0), l = Math.hypot(dx, dy) || 1;
        p.line(x - dx / l * w * 0.46, y - dy / l * w * 0.46, x + dx / l * w * 0.46, y + dy / l * w * 0.46, i % 2 ? "#a765d6" : "#5a2a8a", 3);
    }
}
function paintWeapons(A) {
    [vm0, vm1, vm2, vm3, vm4].forEach((url, i) => A.image(`vm${i}`, url));
    A.paint("mflash", 128, 128, (p, f) => {
        const cols = [["#d8ffa0", "#ffffff"], ["#ffd24a", "#ffffff"], ["#ff9a3c", "#fff0a0"], ["#7df0ff", "#ffffff"]][f];
        const pts = [];
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = i % 2 ? 58 : 22; pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); }
        for (let i = 0; i < 14; i++) p.poly([[64, 64], pts[i], pts[(i + 1) % 14]], cols[0]);
        p.circle(64, 64, 24, cols[1]);
    }, { frames: 4, smooth: true });
}

// --- Skies, logo, HUD bits ----------------------------------------------------------------------
function paintSkies(A) {
    const sky = (name, stops, moon, hills) => A.paint(name, 1024, 256, (p) => {
        const d = p.data, cols = stops.map(hex);
        for (let y = 0; y < 256; y++) for (let x = 0; x < 1024; x++) {
            const t = y / 256 * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)), u = x / 1024, v = y / 256;
            let c = mix(cols[i], cols[i + 1], t - i);
            const cl = fbm(u, v * 2, 7, 4), band = sstep(0.1, 0.45, v) * (1 - sstep(0.5, 0.78, v));
            c = mix(c, mix(hex(moon.cloud), hex(moon.cloud2), v), sstep(0.5, 0.72, cl) * band * 0.75);
            if (v < 0.5 && T[(x * 13 + y * 511) % 4096] > 0.995) c = mix(c, [255, 245, 220], 0.9 * (1 - v * 2));
            const dm = Math.hypot((u - moon.x) * 7, v - moon.y);
            if (dm < moon.r) c = mix(mix(hex(moon.c), [255, 255, 255], sat(1 - dm / moon.r) * 0.5), hex(moon.cloud), sstep(0.5, 0.7, fbm(u * 3 % 1, v, 5, 3)) * 0.22);
            else c = mix(c, hex(moon.c), sat(1 - (dm - moon.r) / 0.2) ** 2 * 0.5);
            const h = 0.8 - hills.a * (fbm(u, 0.2, 9, 3) - 0.3) * 0.55 - hills.b * Math.max(0, Math.sin(u * Math.PI * 22) * 0.4);
            if (v > h) c = mix(hex(hills.c), hex(hills.d), sat((v - h) * 4));
            const o = (y * 1024 + x) * 4;
            d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
        }
    }, { smooth: true });
    sky("sky0", ["#2a1f5a", "#6e3a80", "#d9604f", "#ffb35a", "#ffd98a"], { x: 0.72, y: 0.5, r: 0.1, c: "#ffe9a8", cloud: "#8a4a7a", cloud2: "#ffb36a" }, { a: 0.32, b: 0.1, c: "#3a2a4a", d: "#c26a5a" });
    sky("sky5", ["#0c0420", "#2a0a3e", "#6a1a4a", "#b02a3a", "#3a0f3f"], { x: 0.3, y: 0.3, r: 0.13, c: "#ffd0a0", cloud: "#3a0a3a", cloud2: "#a02a3a" }, { a: 0.5, b: 0.2, c: "#14061e", d: "#3a0f3f" });
}

// A chunky bitmap font, used only for the logo, so that the title looks the same on every device.
const GLYPH = {
    G: "01110 10001 10000 10111 10001 10001 01110", N: "10001 11001 11101 10111 10011 10001 10001", O: "01110 10001 10001 10001 10001 10001 01110",
    M: "10001 11011 11111 10101 10001 10001 10001", E: "11111 10000 10000 11110 10000 10000 11111", A: "01110 10001 10001 11111 10001 10001 10001",
    "'": "00100 00100 01000 00000 00000 00000 00000", S: "01111 10000 10000 01110 00001 00001 11110", L: "10000 10000 10000 10000 10000 10000 11111", D: "11110 10001 10001 10001 10001 10001 11110", " ": "00000 00000 00000 00000 00000 00000 00000",
};
function logoWord(p, word, x0, y0, u, top, bot, rimC) {
    let x = x0, n = 0;
    const cells = [];
    for (const ch of word) {
        const g = GLYPH[ch].split(" "), wob = Math.sin(n++ * 1.7) * u * 0.32;
        g.forEach((row, j) => [...row].forEach((b, i) => { if (b === "1") cells.push([x + i * u, y0 + j * u + wob, j]); }));
        x += ch === "'" ? 3.4 * u : 5.9 * u;
    }
    for (const [a, b] of cells) p.rect(a - 5, b + 4, u + 10, u + 10, "#1b1226");
    for (const [a, b] of cells) p.rect(a - 5, b - 5, u + 10, u + 10, "#1b1226");
    for (const [a, b] of cells) p.rect(a - 1, b + 3, u + 2, u + 3, rimC);
    for (const [a, b, j] of cells) { const f = (t) => { const c0 = hex(top), c1 = hex(bot), m = mix(c0, c1, t); return `#${m.map((q) => Math.round(q).toString(16).padStart(2, "0")).join("")}`; }; p.gradient(a, b, u + 1, u + 1, f(j / 7), f((j + 1) / 7)); }
    for (const [a, b, j] of cells) if (j === 0) p.rect(a, b + 1, u + 1, 3, "#ffffff88");
}
function paintLogo(A) {
    A.paint("logo", 512, 232, (p) => {
        logoWord(p, "GNOME", 30, 14, 16, "#ffe36a", "#ff8a1f", "#a8321c");
        logoWord(p, "MAN'S LAND", 14, 142, 8.4, "#ff6a7a", "#c81e3c", "#5a0f22");
    }, { smooth: true });
    A.paint("vignette", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5), o = (y * 128 + x) * 4;
            d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = 255 * sstep(0.62, 1.4, r);
        }
    }, { smooth: true });
    A.paint("redv", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5), o = (y * 128 + x) * 4;
            d[o] = 200; d[o + 1] = 16; d[o + 2] = 32; d[o + 3] = 255 * sstep(0.5, 1.35, r);
        }
    }, { smooth: true });
    A.paint("granny", 192, 224, (p) => { // Granny Thistle, for the title and victory screens
        const X = 96;
        p.ellipse(X, 196, 64, 46, "#7a3fb0", "#3e1a68");
        for (let i = 0; i < 6; i++) p.line(X - 56 + i * 22, 170, X - 60 + i * 24, 224, "#a765d6", 3);
        p.poly([[X - 14, 150], [X + 14, 150], [X + 8, 224], [X - 8, 224]], "#f4f0e0");
        p.ellipse(X, 104, 46, 52, "#f0c0a0", "#c98a68");
        p.circle(X - 44, 60, 30, "#dfe3ea", "#a8aeb8"); p.circle(X + 44, 60, 30, "#dfe3ea", "#a8aeb8"); p.circle(X, 44, 42, "#eef0f4", "#b8bec8"); p.circle(X, 18, 18, "#dfe3ea", "#a8aeb8");
        p.line(X - 42, 128, X - 34, 150, "#d8a080", 2);
        for (const s of [-1, 1]) {
            p.circle(X + s * 21, 100, 20, "#ffffff55"); p.circle(X + s * 21, 100, 17, "#e8f6ff");
            p.circle(X + s * 18, 101, 7, "#2a2a3a"); p.circle(X + s * 16, 99, 2, "#fff");
            p.line(X + s * 8, 80, X + s * 36, 76, "#8a8e98", 6);
            for (let a = 0; a < 6.28; a += 0.5) p.circle(X + s * 21 + Math.cos(a) * 20, 100 + Math.sin(a) * 20, 1.8, "#c9962a");
        }
        p.line(X - 2, 100, X + 2, 100, "#c9962a", 3);
        p.ellipse(X, 124, 9, 8, "#e8a088", "#c97a68");
        p.line(X - 18, 142, X + 18, 138, "#7a2f3a", 4);
        p.outline(OUT).shade(0.12, 0.12);
    }, { smooth: true });
    // HUD icons: 0 heart-tea, 1 armour, 2 hat-kill, 3 secret
    A.paint("hudicon", 48, 48, (p, f) => {
        if (f === 0) { p.circle(16, 18, 12, "#ff5a6a", "#c81e3c"); p.circle(32, 18, 12, "#ff5a6a", "#c81e3c"); p.poly([[5, 24], [43, 24], [24, 44]], "#d82a44"); p.circle(14, 14, 3.5, "#ffffffbb"); } else if (f === 1) {
            p.poly([[8, 8], [40, 8], [42, 42], [6, 42]], "#a84ad0"); p.poly([[20, 8], [28, 8], [25, 42], [23, 42]], "#e3c2f4"); for (let i = 0; i < 3; i++) p.rect(8, 16 + i * 9, 32, 3, "#7a2ca8");
        } else if (f === 2) { p.poly([[6, 40], [42, 40], [26, 6], [20, 8]], "#e0323f"); p.poly([[24, 40], [42, 40], [26, 6]], "#8e1426"); p.ellipse(24, 40, 20, 5, "#8e1426"); } else {
            const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 9 : 21; pts.push([24 + Math.cos(a) * r, 25 + Math.sin(a) * r]); }
            for (let i = 0; i < 10; i++) p.poly([[24, 25], pts[i], pts[(i + 1) % 10]], "#ffe066");
        }
        p.outline(OUT);
    }, { frames: 4, smooth: true });
}

export function paintAll(game) {
    const A = game.assets;
    paintEnemies(A);
    paintProps(A);
    paintWeapons(A);
    paintSkies(A);
    paintLogo(A);
}
