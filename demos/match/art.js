// Candy, blockers, tiles and icons, shaded per pixel and packed on one sheet so the whole board is one draw call.
import { BEE, BONBON, CANDY, STAR, STRIPE_H, STRIPE_V } from "./engine.js";
import { INK, Painter, arc, capsule, circle, ellipse, hex, mix3, polygon, rbox, rotated, smooth, star, stroke, union } from "./sdf.js";

export const CELL = 132, COLS = 8, ROWS = 7;
export const SHEET = "candy";
export const PALETTE = [
    { name: "cherry", base: hex("#ff2f5e"), deep: hex("#b00c3e"), light: hex("#ff9db4"), pop: "#ff5c80" },
    { name: "orange", base: hex("#ff8a1f"), deep: hex("#d04e00"), light: hex("#ffd08a"), pop: "#ffa24a" },
    { name: "lemon", base: hex("#ffd21f"), deep: hex("#dd8c00"), light: hex("#fff3a0"), pop: "#ffe14f" },
    { name: "lime", base: hex("#47d93a"), deep: hex("#118a2e"), light: hex("#bcf7a0"), pop: "#7bea5a" },
    { name: "berry", base: hex("#2c9bff"), deep: hex("#0e4fd0"), light: hex("#a8dcff"), pop: "#5fb6ff" },
    { name: "grape", base: hex("#b44dff"), deep: hex("#6a15c8"), light: hex("#e6bcff"), pop: "#c77dff" },
];

const C = CELL / 2;
const cx = C, cy = C;
/** The six candy silhouettes, each a different shape so colour is never the only clue. */
const SHAPES = [
    // heart
    (s = 1) => {
        const r = 52 * s;
        return rotated(union(rbox(cx, cy + 4 * s, r * 0.62, r * 0.62, r * 0.2, 0), circle(cx, cy - r * 0.32, r * 0.62), circle(cx + r * 0.32 * 0, cy, 0)), cx, cy, 0)
            && smooth(5 * s, circle(cx - r * 0.42, cy - r * 0.26, r * 0.56), circle(cx + r * 0.42, cy - r * 0.26, r * 0.56), polygon([[cx - r * 0.88, cy - r * 0.02], [cx + r * 0.88, cy - r * 0.02], [cx, cy + r * 0.86]], 8 * s));
    },
    // star
    (s = 1) => polygon(star(cx, cy + 3 * s, 54 * s, 0.55), 9 * s),
    // lemon drop: a soft diamond
    (s = 1) => rbox(cx, cy, 38 * s, 38 * s, 14 * s, Math.PI / 4),
    // mint: a ring-grooved round
    (s = 1) => circle(cx, cy, 46 * s),
    // raindrop
    (s = 1) => smooth(10 * s, circle(cx, cy + 12 * s, 38 * s), polygon([[cx, cy - 50 * s], [cx - 20 * s, cy], [cx + 20 * s, cy]], 4 * s)),
    // grape clover
    (s = 1) => smooth(7 * s, circle(cx, cy - 22 * s, 27 * s), circle(cx - 25 * s, cy + 15 * s, 27 * s), circle(cx + 25 * s, cy + 15 * s, 27 * s)),
];
const INNER = [null, null, null, circle(cx, cy, 20), null, circle(cx, cy + 4, 11)];

const jelly = (c, stripes) => (x, y, depth) => {
    let col = mix3(c.deep, c.base, Math.min(1, depth * 1.5 + (y / CELL - 0.5) * -0.2 + 0.12));
    col = mix3(col, c.light, Math.max(0, (y / CELL - 0.56)) * 0.62);
    if (stripes) col = stripes(x, y, col);
    return col;
};

function highlights(p, n) {
    const hx = n === 3 ? cx - 16 : cx - 17, hy = n === 2 ? cy - 22 : n === 4 ? cy - 2 : n === 5 ? cy - 30 : n === 0 ? cy - 18 : cy - 20;
    p.soft(rotated(ellipse(hx, hy, 13, 7), hx, hy, -0.6), [1, 1, 1], 0.86, 2);
    p.soft(circle(hx + 16, hy - 10, 3.4), [1, 1, 1], 0.82, 1.5);
}

function candy(p, n, stripes) {
    const c = PALETTE[n], f = SHAPES[n]();
    p.soft(ellipse(cx, cy + 52, 42, 10), INK, 0.2, 6);
    p.shape(f, { color: jelly(c, stripes), bevel: 26, gloss: 0.8, glow: 0.65, inkW: 4, ink: mix3(c.deep, INK, 0.65) });
    if (n === 3) p.shape(circle(cx, cy, 22), { color: mix3(c.base, c.light, 0.3), bevel: -10 < 0 ? 10 : 10, gloss: 0.5, glow: 0.5, ink: null });
    highlights(p, n);
}

function bonbon(p, n) {
    const c = PALETTE[n];
    p.soft(ellipse(cx, cy + 50, 46, 9), INK, 0.2, 6);
    for (const dir of [-1, 1]) {
        const wing = polygon([[cx + dir * 34, cy - 7], [cx + dir * 59, cy - 26], [cx + dir * 54, cy], [cx + dir * 59, cy + 26], [cx + dir * 34, cy + 7]], 4);
        p.shape(wing, { color: (x, y) => mix3(c.light, [1, 1, 1], (Math.sin(y * 0.55) + 1) * 0.25), bevel: 8, gloss: 0.7, glow: 0.4, inkW: 4, ink: mix3(c.deep, INK, 0.65) });
    }
    const body = circle(cx, cy, 42);
    p.shape(body, { color: (x, y, depth) => {
        const a = Math.atan2(y - cy, x - cx) + Math.hypot(x - cx, y - cy) * 0.035;
        const swirl = (Math.sin(a * 3) + 1) / 2;
        return mix3(mix3(c.deep, c.base, Math.min(1, depth * 1.5)), [1, 1, 1], swirl > 0.72 ? 0.8 : 0);
    }, bevel: 26, gloss: 0.9, glow: 0.5, inkW: 4, ink: mix3(c.deep, INK, 0.65) });
    p.soft(rotated(ellipse(cx - 15, cy - 19, 13, 7), cx - 15, cy - 19, -0.6), [1, 1, 1], 0.9, 2).soft(circle(cx + 3, cy - 29, 3.5), [1, 1, 1], 0.85, 1.5);
}

function sugarStar(p) {
    p.soft(circle(cx, cy, 60), hex("#fff2a8"), 0.5, 18);
    const pts = star(cx, cy, 55, 0.6, 6, -Math.PI / 2);
    const rainbow = [hex("#ff5c80"), hex("#ffa24a"), hex("#ffe14f"), hex("#7bea5a"), hex("#5fb6ff"), hex("#c77dff")];
    p.shape(polygon(pts, 8), { color: (x, y, depth) => {
        const a = (Math.atan2(y - cy, x - cx) / (Math.PI * 2) + 1) * 6 + 0.5, i = Math.floor(a) % 6, t = a - Math.floor(a);
        return mix3(mix3(rainbow[i], rainbow[(i + 1) % 6], t), [1, 1, 1], depth * depth * 0.5);
    }, bevel: 22, gloss: 1, glow: 0.7, inkW: 4 });
    p.shape(circle(cx, cy, 15), { color: hex("#fffbe4"), bevel: 12, gloss: 1, glow: 0.2, inkW: 0, ink: null });
    p.soft(rotated(ellipse(cx - 20, cy - 24, 11, 5), cx - 20, cy - 24, -0.7), [1, 1, 1], 0.9, 2);
}

function gummyBee(p, n) {
    const c = PALETTE[n];
    p.soft(ellipse(cx, cy + 50, 38, 8), INK, 0.2, 6);
    for (const dir of [-1, 1]) p.shape(rotated(ellipse(cx + dir * 19, cy - 32, 15, 25), cx + dir * 19, cy - 32, dir * 0.5), { color: hex("#eef9ff"), bevel: 10, gloss: 0.9, glow: 0.3, alpha: 0.82, inkW: 3 });
    p.shape(ellipse(cx, cy + 8, 41, 35), { color: (x, y, depth) => {
        const col = mix3(c.deep, c.base, Math.min(1, depth * 1.6));
        return Math.sin((x - cx + 12) * 0.34) > 0.25 && x > cx - 4 ? mix3(col, INK, 0.75) : col;
    }, bevel: 24, gloss: 0.9, glow: 0.6, inkW: 4, ink: mix3(c.deep, INK, 0.65) });
    p.shape(circle(cx - 18, cy + 2, 10), { color: [1, 1, 1], bevel: 6, gloss: 0.1, ink: null });
    p.shape(circle(cx - 16, cy + 3, 5.5), { color: INK, bevel: 4, gloss: 1, ink: null });
    p.shape(capsule(cx - 26, cy + 20, cx - 12, cy + 20, 2), { color: INK, flat: true, ink: null });
    p.soft(rotated(ellipse(cx - 18, cy - 15, 10, 4.5), cx - 18, cy - 15, -0.3), [1, 1, 1], 0.8, 2);
}

function mallow(p) {
    const pink = hex("#ffe3ee"), shadow = hex("#f4a7c4");
    p.soft(ellipse(cx, cy + 50, 44, 9), INK, 0.2, 6);
    p.shape(smooth(14, rbox(cx, cy + 4, 44, 38, 22), circle(cx - 20, cy - 26, 22), circle(cx + 20, cy - 28, 20)), { color: (x, y, depth) => mix3(shadow, pink, Math.min(1, depth * 1.4 + 0.2)), bevel: 28, gloss: 0.18, glow: 0.3, inkW: 4 });
    p.shape(stroke(arc(cx - 16, cy + 3, 7, 5, Math.PI * 1.1, Math.PI * 1.9, 8), 1.8), { color: INK, flat: true, ink: null });
    p.shape(stroke(arc(cx + 16, cy + 3, 7, 5, Math.PI * 1.1, Math.PI * 1.9, 8), 1.8), { color: INK, flat: true, ink: null });
    p.shape(stroke(arc(cx, cy + 14, 5, 5, 0.2, Math.PI - 0.2, 8), 1.8), { color: INK, flat: true, ink: null });
    p.soft(ellipse(cx - 28, cy + 13, 7, 4), hex("#ff8fb4"), 0.5, 2).soft(ellipse(cx + 28, cy + 13, 7, 4), hex("#ff8fb4"), 0.5, 2);
}

function folk(p, v) {
    const skin = [hex("#ffd2ad"), hex("#c98a5e"), hex("#ffe0bd")][v];
    p.soft(ellipse(cx, cy + 52, 38, 8), INK, 0.2, 6);
    p.shape(circle(cx, cy, 53), { color: (x, y) => mix3(hex("#dff6ff"), hex("#fff"), (y / CELL) * 0.5), bevel: 16, gloss: 1, glow: 0.3, alpha: 0.42, inkW: 4, ink: hex("#2f8fd0") });
    const coat = [hex("#2f6df0"), hex("#ffffff"), hex("#c85bd0")][v];
    p.shape(rbox(cx, cy + 28, 19, 19, 12), { color: coat, bevel: 10, gloss: 0.4, inkW: 3 });
    p.shape(circle(cx, cy - 2, 21), { color: skin, bevel: 14, gloss: 0.3, glow: 0.3, inkW: 3 });
    if (v === 0) { p.shape(rbox(cx, cy - 32, 14, 13, 3), { color: INK, bevel: 6, gloss: 0.8, inkW: 0, ink: null }); p.shape(rbox(cx, cy - 20, 24, 3.5, 3), { color: INK, flat: true, ink: null }); p.shape(rbox(cx, cy - 25, 14, 3, 0), { color: hex("#ff2f5e"), flat: true, ink: null }); }
    if (v === 1) p.shape(smooth(5, circle(cx - 12, cy - 28, 11), circle(cx, cy - 34, 13), circle(cx + 12, cy - 28, 11), rbox(cx, cy - 20, 18, 5, 2)), { color: [1, 1, 1], bevel: 8, gloss: 0.2, inkW: 3 });
    if (v === 2) p.shape(smooth(3, circle(cx, cy - 26, 15), circle(cx, cy - 40, 7)), { color: hex("#dfe3ee"), bevel: 8, gloss: 0.2, inkW: 3 });
    for (const s of [-1, 1]) {
        p.shape(circle(cx + s * 8, cy - 3, 5.5), { color: [1, 1, 1], flat: true, inkW: 1.5 });
        p.shape(circle(cx + s * 8, cy - 2, 2.6), { color: INK, flat: true, ink: null });
    }
    p.shape(ellipse(cx, cy + 9, 4, 5), { color: INK, flat: true, ink: null });
    p.soft(rotated(ellipse(cx - 26, cy - 28, 13, 6), cx - 26, cy - 28, -0.8), [1, 1, 1], 0.85, 2);
}

function cookie(p, stage) {
    const dough = hex("#e4a65a"), dark = hex("#b06a2c");
    const body = union(rbox(cx, cy, 58, 58, 24));
    const col = (x, y, depth) => {
        const n = Math.sin(x * 0.45 + y * 0.2) * Math.sin(y * 0.38 - x * 0.1);
        return mix3(mix3(dark, dough, Math.min(1, depth * 1.6)), hex("#f4c784"), Math.max(0, n) * 0.4);
    };
    p.shape(body, { color: col, bevel: 20, gloss: 0.15, glow: 0.2, inkW: 4 });
    const chips = [[-28, -26, 9], [14, -32, 8], [34, -6, 10], [-34, 12, 8], [-6, 2, 11], [24, 28, 9], [-20, 36, 8]];
    chips.forEach(([x, y, r]) => p.shape(smooth(4, circle(cx + x, cy + y, r), circle(cx + x + 4, cy + y + 3, r * 0.7)), { color: hex("#5a2c1e"), bevel: 7, gloss: 0.9, inkW: 0, ink: null }));
    if (stage >= 2) {
        p.shape(smooth(10, rbox(cx, cy - 12, 52, 34, 18), circle(cx - 34, cy + 22, 13), circle(cx + 8, cy + 30, 15), circle(cx + 38, cy + 18, 11)), { color: stage === 3 ? hex("#ff77a8") : hex("#fff4e6"), bevel: 12, gloss: 0.8, glow: 0.3, inkW: 3 });
        [[-22, -22], [12, -30], [30, -6], [-34, 2], [-6, 2], [18, 14]].forEach(([x, y], n) => p.shape(capsule(cx + x - 4, cy + y + (n % 2 ? 3 : -3), cx + x + 4, cy + y + (n % 2 ? -3 : 3), 2.8), { color: PALETTE[n % 6].base, flat: true, ink: null }));
    }
    if (stage === 3) p.shape(smooth(4, circle(cx - 9, cy - 42, 13), circle(cx + 9, cy - 42, 13)), { color: hex("#ff2f5e"), bevel: 10, gloss: 1, glow: 0.5, inkW: 3 });
    p.soft(rotated(ellipse(cx - 34, cy - 40, 14, 5), cx - 34, cy - 40, -0.7), [1, 1, 1], 0.5, 2);
}

function cage(p) {
    const a = [capsule(cx - 56, cy - 56, cx + 56, cy + 56, 7.5), capsule(cx + 56, cy - 56, cx - 56, cy + 56, 7.5), capsule(cx - 56, cy, cx, cy - 56, 7.5), capsule(cx, cy - 56, cx + 56, cy, 7.5), capsule(cx - 56, cy, cx, cy + 56, 7.5), capsule(cx, cy + 56, cx + 56, cy, 7.5)];
    const dark = hex("#3c2341"), mid = hex("#7a5288");
    for (const f of a) p.shape(f, { color: (x, y, d) => mix3(dark, mid, d * 0.5), bevel: 7, gloss: 1, glow: 0.2, inkW: 2.5, ink: hex("#1e0d24") });
    for (const [x, y] of [[-56, -56], [56, -56], [-56, 56], [56, 56], [0, -56], [0, 56], [-56, 0], [56, 0], [0, 0]]) p.shape(circle(cx + Math.max(-58, Math.min(58, x)), cy + y, 10), { color: hex("#ff77a8"), bevel: 8, gloss: 1, glow: 0.4, inkW: 2.5, ink: hex("#1e0d24") });
}

function fudge(p, v) {
    const base = hex("#7c3f22"), lit = hex("#a8602f"), dark = hex("#4c2212");
    const lumps = v === 0 ? [[-20, -22, 34], [22, -20, 32], [-22, 24, 33], [24, 24, 34], [0, 0, 36]] : [[-26, -8, 34], [20, -26, 30], [24, 16, 36], [-16, 30, 30], [0, 0, 34]];
    p.shape(smooth(16, rbox(cx, cy, 58, 58, 24), ...lumps.map(([x, y, r]) => circle(cx + x, cy + y, r))), {
        color: (x, y, depth) => mix3(dark, mix3(base, lit, Math.sin(x * 0.09 + y * 0.13 + v) * 0.5 + 0.5), Math.min(1, depth * 1.5)),
        bevel: 26, gloss: 1, glow: 0.2, inkW: 4, ink: hex("#2c1208"),
    });
    p.soft(rotated(ellipse(cx - 26, cy - 34, 16, 6), cx - 26, cy - 34, -0.5), [1, 1, 1], 0.6, 2).soft(circle(cx - 4, cy - 44, 3.5), [1, 1, 1], 0.6, 1.5);
}

function tile(p, tone) {
    const a = tone ? hex("#fff0d8") : hex("#ffe4c4");
    p.shape(rbox(cx, cy, 64, 64, 15), { color: a, bevel: 9, gloss: 0.1, glow: 0, ink: null });
}

function frost(p, layers) {
    const icing = layers === 2 ? hex("#ff8fc0") : hex("#ffc0dc");
    const blob = smooth(9, rbox(cx, cy - 2, 61, 58, 18), circle(cx - 30, cy + 50, 12), circle(cx + 4, cy + 52, 10), circle(cx + 34, cy + 49, 13));
    p.shape(blob, { color: (x, y, d) => mix3(mix3(icing, hex("#d94f92"), 0.28), icing, Math.min(1, d * 2)), bevel: 13, gloss: 0.7, glow: 0.4, inkW: 2.5, ink: hex("#c13a80") });
    if (layers === 2) p.shape(smooth(8, rbox(cx, cy - 12, 46, 34, 16), circle(cx - 18, cy + 24, 11), circle(cx + 20, cy + 28, 12)), { color: hex("#ffd9ea"), bevel: 10, gloss: 0.8, glow: 0.3, inkW: 2, ink: hex("#d94f92") });
    [[-34, -30], [20, -38], [36, 10], [-12, 8], [-40, 16], [8, 34]].forEach(([x, y], n) => p.shape(capsule(cx + x - 4, cy + y + (n % 2 ? 2 : -2), cx + x + 4, cy + y + (n % 2 ? -2 : 2), 2.4), { color: PALETTE[n].base, flat: true, ink: null }));
    p.soft(rotated(ellipse(cx - 32, cy - 40, 15, 4), cx - 32, cy - 40, -0.3), [1, 1, 1], 0.6, 2);
}

function droplet(p, n) {
    const c = PALETTE[n];
    p.shape(circle(cx, cy, 40), { color: (x, y, d) => mix3(c.deep, c.base, Math.min(1, d * 1.5)), bevel: 30, gloss: 1, glow: 0.8, ink: null });
    p.soft(ellipse(cx - 14, cy - 16, 12, 8), [1, 1, 1], 0.8, 3);
}

function iconStar(p, on) {
    const pts = star(cx, cy + 2, 56, 0.52);
    p.shape(polygon(pts, 8), { color: on ? (x, y, d) => mix3(hex("#ff9a1f"), hex("#ffe65a"), Math.min(1, d * 1.5)) : hex("#c9a9c8"), bevel: 20, gloss: on ? 1 : 0.2, glow: 0.5, inkW: 5 });
    if (on) p.soft(rotated(ellipse(cx - 12, cy - 16, 11, 5), cx - 12, cy - 16, -0.6), [1, 1, 1], 0.9, 2);
}

function crumb(p) {
    p.shape(smooth(8, circle(cx - 12, cy, 26), circle(cx + 14, cy - 8, 22), circle(cx + 6, cy + 16, 20)), { color: hex("#d99a55"), bevel: 16, gloss: 0.2, inkW: 4 });
}

/** Sheet slots, in reading order. Row 0-5 hold the colours; rows 6-7 hold the rest. */
export const SLOT = {
    candy: (c) => c * COLS, stripeH: (c) => c * COLS + 1, stripeV: (c) => c * COLS + 2, bonbon: (c) => c * COLS + 3, bee: (c) => c * COLS + 4, drop: (c) => c * COLS + 5,
    star: 6, mallow: 7, folk: (v) => [14, 15, 39][v % 3], cookie: (l) => [22, 23, 30][l - 1], fudge: (v) => [31, 46][v % 2],
    cage: 38, tile: (t) => 48 + t, frost: (l) => 49 + l, star0: 52, star1: 53, crumb: 54, spark: 55,
};

/** Which sheet frame a board piece uses. */
export function frameFor(k, c, v = 0) {
    switch (k) {
        case CANDY: return SLOT.candy(c);
        case STRIPE_H: return SLOT.stripeH(c);
        case STRIPE_V: return SLOT.stripeV(c);
        case BONBON: return SLOT.bonbon(c);
        case BEE: return SLOT.bee(c);
        case STAR: return SLOT.star;
        case 7: return SLOT.mallow;
        case 8: return SLOT.folk(v);
    }
    return 0;
}

export function paintSheet(assets) {
    assets.paint(SHEET, CELL * COLS, CELL * ROWS, (px) => {
        const p = new Painter(px.data, CELL * COLS, CELL * ROWS);
        const at = (slot) => p.cell((slot % COLS) * CELL, Math.floor(slot / COLS) * CELL, CELL, CELL);
        for (let c = 0; c < 6; c++) {
            const col = PALETTE[c];
            at(SLOT.candy(c)); candy(p, c);
            const band = (axis) => (x, y, base) => (Math.abs(((axis ? x : y) - cx) % 26) < 7 || (Math.abs((axis ? x : y) - cx) < 7) ? mix3(base, [1, 1, 1], 0.92) : base);
            at(SLOT.stripeH(c)); candy(p, c, band(1));
            at(SLOT.stripeV(c)); candy(p, c, band(0));
            at(SLOT.bonbon(c)); bonbon(p, c);
            at(SLOT.bee(c)); gummyBee(p, c);
            at(SLOT.drop(c)); droplet(p, c);
            void col;
        }
        at(SLOT.star); sugarStar(p);
        at(SLOT.mallow); mallow(p);
        [0, 1, 2].forEach((v) => { at(SLOT.folk(v)); folk(p, v); });
        [1, 2, 3].forEach((l) => { at(SLOT.cookie(l)); cookie(p, l); });
        [0, 1].forEach((v) => { at(SLOT.fudge(v)); fudge(p, v); });
        at(SLOT.cage); cage(p);
        at(SLOT.tile(0)); tile(p, 0);
        at(SLOT.tile(1)); tile(p, 1);
        at(SLOT.frost(1)); frost(p, 1);
        at(SLOT.frost(2)); frost(p, 2);
        at(SLOT.star0); iconStar(p, false);
        at(SLOT.star1); iconStar(p, true);
        at(SLOT.crumb); crumb(p);
        at(SLOT.spark); p.soft(circle(cx, cy, 34), [1, 1, 1], 1, 26).soft(rbox(cx, cy, 60, 3, 3), [1, 1, 1], 0.9, 3).soft(rbox(cx, cy, 3, 60, 3), [1, 1, 1], 0.9, 3);
    }, { smooth: true });
    assets.grid(SHEET, COLS, ROWS);
}
