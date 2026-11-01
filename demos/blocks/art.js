// All the art, painted at startup. Animals are drawn as furry tiles that join to their neighbours, so a piece is one
// continuous chubby creature and a line clear really does cut it in half, plus faces drawn on top with moods.
import { CELLS } from "./engine.js";
import { INK, Painter, arc, capsule, circle, ellipse, hex, mix3, polygon, rbox, rotated, smooth, star, stroke, subtract, union } from "./paint.js";

// One tile: a cell of CELL pixels inside a frame with a gutter, so joins never show a seam.
export const CELL = 72, GUT = 8, FRAME = CELL + GUT * 2;
export const TILE_SCALE = FRAME / CELL;
export const FACE = 128, FACE_SCALE = FACE / CELL;
export const MOODS = { grump: 0, wince: 1, sleep: 2, shock: 3, smug: 4 };
export const PORTRAIT = 180;
const M = FRAME / 2, H = 34, R = 15;

// [body, shadow side, light side, marking]
export const COATS = [
    { base: "#c9602f", deep: "#7f2f1c", light: "#f0a262", mark: "#8a3a1e", pop: "#f0924f" },  // Noodle
    { base: "#ff8fa8", deep: "#c94b77", light: "#ffc9d2", mark: "#e96a8e", pop: "#ffa7bd" },  // Truffle
    { base: "#f5ad2e", deep: "#c26a13", light: "#ffdc7a", mark: "#d67a14", pop: "#ffc64f" },  // Marmalade
    { base: "#4fa9e8", deep: "#2262b8", light: "#a8dcff", mark: "#2a78c4", pop: "#74c0f4" },  // Blub
    { base: "#62c84e", deep: "#1f7f3f", light: "#c0f08a", mark: "#2f9a48", pop: "#8be06a" },  // Moss
    { base: "#fbf1d8", deep: "#c2a886", light: "#ffffff", mark: "#e6d6b4", pop: "#fff6e0" },  // Honk
    { base: "#a56ee0", deep: "#5f33a8", light: "#d7b4ff", mark: "#8450c9", pop: "#be93f0" },  // Mud
    { base: "#c9c7e4", deep: "#7c79ad", light: "#f4f2ff", mark: "#a8a6d0", pop: "#dedcf5" },  // sheep
    { base: "#fff0cf", deep: "#d9b078", light: "#ffffff", mark: "#c98f5a", pop: "#ffe9b8" },  // egg
];
const hexes = (a) => a.map(hex);
const C = COATS.map((c) => ({ base: hex(c.base), deep: hex(c.deep), light: hex(c.light), mark: hex(c.mark) }));

const mod = (v, m) => ((v % m) + m) % m;

/** The coat pattern, which tiles every 72 pixels so it runs straight across joins. */
function coat(kind, ox, oy) {
    const c = C[kind];
    return (x, y, depth) => {
        const u = x - ox, v = y - oy;
        let col = mix3(c.deep, c.base, Math.min(1, depth * 2.6 + 0.08));
        col = mix3(col, c.light, Math.max(0, depth - 0.75) * 0.5);
        if (depth > 0.1) {
            const px = mod(u, 72), py = mod(v, 72);
            if (kind === 2) {   // tabby stripes
                const s = Math.sin((u + v * 0.55) * Math.PI / 18);
                if (s > 0.62) col = mix3(col, c.mark, Math.min(1, (s - 0.62) * 6) * 0.8);
            } else if (kind === 0) {    // a dark saddle down the sausage
                const s = Math.sin(u * Math.PI / 36 + 0.6) + Math.sin(v * Math.PI / 36);
                if (s > 1.3) col = mix3(col, c.mark, Math.min(1, (s - 1.3) * 4) * 0.65);
            } else if (kind === 1) {    // pig patches
                const a = Math.hypot(px - 22, py - 50) - 12, b = Math.hypot(px - 56, py - 18) - 9;
                if (a < 0 || b < 0) col = mix3(col, c.mark, 0.5);
            } else if (kind === 3) {    // seal speckle
                for (const [sx, sy, r] of [[14, 20, 4], [38, 12, 3], [58, 30, 4.5], [24, 48, 3.5], [50, 58, 4], [8, 62, 2.5]]) if (Math.hypot(px - sx, py - sy) < r) col = mix3(col, c.mark, 0.75);
            } else if (kind === 4) {    // frog blotches
                const a = Math.hypot(px - 18, py - 18) - 11, b = Math.hypot(px - 54, py - 46) - 13, e = Math.hypot(px - 10, py - 60) - 6;
                if (a < 0 || b < 0 || e < 0) col = mix3(col, c.mark, 0.6);
            } else if (kind === 5) {    // goose scallops
                const row = Math.floor(v / 18), sx = mod(u + (row % 2) * 12, 24) - 12, sy = mod(v, 18);
                if (Math.abs(Math.hypot(sx, sy) - 11) < 1.1) col = mix3(col, c.mark, 0.8);
            } else if (kind === 6) {    // hippo freckles
                for (const [sx, sy, r] of [[20, 30, 3], [30, 22, 2.4], [52, 54, 3], [60, 44, 2.2], [12, 58, 2.6]]) if (Math.hypot(px - sx, py - sy) < r) col = mix3(col, c.mark, 0.8);
            } else if (kind === 7) {    // wool curls
                const a = Math.abs(Math.hypot(px - 24, py - 24) - 12), b = Math.abs(Math.hypot(px - 52, py - 52) - 10);
                if (a < 1.8 || b < 1.8) col = mix3(col, c.light, 0.5);
            }
        }
        return col;
    };
}

/** The body of one tile: arms reach out to joined neighbours and overrun the gutter. */
function bodyShape(mask, cx, cy, full) {
    const parts = [rbox(cx, cy, H, H, R)], long = 40;
    const r = mask & 1, d = mask & 2, l = mask & 4, u = mask & 8;
    if (r) parts.push(rbox(cx + long / 2 + 10, cy, long / 2 + 10, H, 0));
    if (l) parts.push(rbox(cx - long / 2 - 10, cy, long / 2 + 10, H, 0));
    if (d) parts.push(rbox(cx, cy + long / 2 + 10, H, long / 2 + 10, 0));
    if (u) parts.push(rbox(cx, cy - long / 2 - 10, H, long / 2 + 10, 0));
    const corner = (sx, sy) => {
        const f = 7, px = cx + sx * H, py = cy + sy * H;
        if (full) parts.push(rbox(cx + sx * 22, cy + sy * 22, 24, 24, 0));
        else parts.push(subtract(rbox(px + sx * f / 2, py + sy * f / 2, f / 2 + 1, f / 2 + 1, 0), circle(px + sx * f, py + sy * f, f)));
    };
    if (r && d) corner(1, 1);
    if (l && d) corner(-1, 1);
    if (r && u) corner(1, -1);
    if (l && u) corner(-1, -1);
    return union(...parts);
}

function sheepShape(mask, cx, cy) {
    const parts = [rbox(cx, cy, H - 3, H - 3, 18)];
    if (mask & 1) parts.push(rbox(cx + 30, cy, 30, H - 3, 0));
    if (mask & 4) parts.push(rbox(cx - 30, cy, 30, H - 3, 0));
    // A cloud edge of woolly bumps, spaced to meet up across joined tiles.
    for (let i = -2; i <= 2; i++) {
        parts.push(circle(cx + i * 18, cy - H + 7, 11), circle(cx + i * 18, cy + H - 7, 11));
    }
    if (!(mask & 1)) for (let i = -1; i <= 1; i++) parts.push(circle(cx + H - 6, cy + i * 18, 10));
    if (!(mask & 4)) for (let i = -1; i <= 1; i++) parts.push(circle(cx - H + 6, cy + i * 18, 10));
    const clip = (x, y) => Math.max(union(...parts)(x, y), (mask & 1) ? -1e3 : x - cx - H - 2, (mask & 4) ? -1e3 : cx - H - 2 - x);
    return clip;
}

// Only the joins each animal can really have: every rotation, and with rows cut out of it.
const USED = [...CELLS.map((rots) => {
    const set = new Set();
    for (const cs of rots) for (const [x, y] of cs) {
        const has = (a, b) => cs.some((c) => c[0] === a && c[1] === b);
        const m = (has(x + 1, y) ? 1 : 0) | (has(x, y + 1) ? 2 : 0) | (has(x - 1, y) ? 4 : 0) | (has(x, y - 1) ? 8 : 0);
        set.add(m); set.add(m & ~2); set.add(m & ~8); set.add(m & ~10);
    }
    return set;
}), new Set([0, 1, 4, 5]), new Set([0])];

const FEET = [["#5d2415", "#8a3a1e"], ["#c94b77", "#ffb6c8"], ["#c26a13", "#ffe2a0"], ["#2262b8", "#74c0f4"], ["#1f7f3f", "#a8e878"], ["#d65a0a", "#ff9320"], ["#5f33a8", "#be93f0"]].map(hexes);

export function paintTiles(assets) {
    const W = FRAME * 16, Hh = FRAME * 9;
    assets.paint("tiles", W, Hh, (px) => {
        const p = new Painter(px.data, W, Hh);
        for (let kind = 0; kind < 9; kind++) for (let mask = 0; mask < 16; mask++) {
            if (!USED[kind].has(mask)) continue;
            const ox = mask * FRAME, oy = kind * FRAME;
            p.cell(ox, oy, FRAME, FRAME);
            if (kind === 8) {   // the egg
                p.shape(smooth(8, ellipse(M, M + 6, 27, 28), ellipse(M, M - 10, 19, 22)), { color: coatEgg(M), bevel: 16, gloss: 0.5, glow: 0.3, inkW: 3 });
                continue;
            }
            const sdf = kind === 7 ? sheepShape(mask, M, M) : bodyShape(mask, M, M, kind === 1);
            p.shape(sdf, { color: coat(kind, 8 - 0, 8 - 0), bevel: 15, gloss: 0.12, glow: 0.35, inkW: 3 });
            // Stubby feet at the ends of a body, so even a headless half of an animal stands on something.
            if (kind < 7 && !(mask & 2) && !(mask & 4 && mask & 1)) {
                const foot = FEET[kind];
                for (const dx of mask & 1 ? [-18] : mask & 4 ? [18] : [-16, 16]) p.shape(rotated(ellipse(M + dx, M + H - 5, 11, 6.5), M + dx, M + H - 5, 0), { color: (x, y, d) => mix3(foot[0], foot[1], Math.min(1, d * 3)), bevel: 4, gloss: 0.1, inkW: 2.4 });
            }
        }
    }, { smooth: true });
    assets.grid("tiles", 16, 9);
}
const coatEgg = (m) => (x, y, d) => {
    const c = C[8], u = mod(x, FRAME) , v = mod(y, FRAME);
    let col = mix3(c.deep, c.base, Math.min(1, d * 2.4 + 0.1));
    for (const [sx, sy, r] of [[34, 34, 3], [52, 44, 2.6], [40, 58, 3.2], [58, 62, 2]]) if (Math.hypot(u - sx, v - sy) < r) col = mix3(col, c.mark, 0.8);
    return col;
};

// --- Faces ----------------------------------------------------------------------------------------------------------
const INKS = INK;
const WHITE = [1, 1, 1], CREAM = hex("#fff4dc");

/** A pair of eyes in a mood. s scales everything from the 72 pixel tile. */
function eyes(p, cx, cy, gap, r, mood, lid, o = {}) {
    const look = o.look ?? 0, ink = o.ink ?? INKS;
    for (const side of [-1, 1]) {
        const x = cx + side * gap, y = cy;
        if (mood === 2) {        // asleep: a soft downward curve
            p.shape(stroke(arc(x, y - r * 0.2, r * 0.95, r * 0.75, 0.15 * Math.PI, 0.85 * Math.PI, 8), r * 0.2), { flat: true, color: ink, ink: null });
        } else if (mood === 1) { // squashed: pinched tight
            p.shape(stroke([[x - side * r, y - r * 0.8], [x + side * r * 0.75, y], [x - side * r, y + r * 0.8]], r * 0.24), { flat: true, color: ink, ink: null });
        } else {
            const big = mood === 3 ? 1.22 : mood === 4 ? 1 : 1;
            p.shape(circle(x, y, r * big), { flat: true, color: WHITE, ink, inkW: Math.max(1.6, r * 0.2) });
            const pr = mood === 3 ? r * 0.3 : r * 0.56;
            p.shape(circle(x + look * r * 0.3, y + r * 0.12, pr), { flat: true, color: ink, ink: null });
            p.shape(circle(x + look * r * 0.3 - pr * 0.3, y + r * 0.12 - pr * 0.35, pr * 0.32), { flat: true, color: WHITE, ink: null });
            if (mood === 0 || mood === 4) {
                // The heavy lid and the brow are the whole personality.
                const inner = side * -1, tilt = mood === 4 ? 0.1 : 0.42;
                const brow = (dx) => [x + dx * r * 1.25, y - r * 0.32 - (dx * inner) * r * -tilt - r * 0.1];
                p.shape(polygon([brow(-1), brow(1), [x + r * 1.3, y - r * 1.5], [x - r * 1.3, y - r * 1.5]], 0), { flat: true, color: lid, ink: null, box: null });
                p.shape(stroke([brow(-1), brow(1)], r * 0.22), { flat: true, color: ink, ink: null });
            }
        }
    }
}

function frown(p, x, y, w, mood, tongue) {
    if (mood === 1) {      // complaining
        p.shape(ellipse(x, y + 1, w * 0.72, w * 0.58), { flat: true, color: hex("#5c1730"), ink: INKS, inkW: 2 });
        p.shape(ellipse(x, y + w * 0.34, w * 0.42, w * 0.22), { flat: true, color: tongue ?? hex("#ff6f7c"), ink: null });
    } else if (mood === 2) { // peaceful
        p.shape(stroke(arc(x, y - 2, w * 0.4, w * 0.3, 0.2 * Math.PI, 0.8 * Math.PI, 6), 1.8), { flat: true, color: INKS, ink: null });
    } else if (mood === 3) { // shocked
        p.shape(ellipse(x, y + 2, w * 0.3, w * 0.38), { flat: true, color: hex("#5c1730"), ink: INKS, inkW: 2 });
    } else if (mood === 4) { // smug
        p.shape(stroke(arc(x + 2, y - 4, w * 0.6, w * 0.34, 0.1 * Math.PI, 0.8 * Math.PI, 7), 2), { flat: true, color: INKS, ink: null });
    } else {               // grumpy
        p.shape(stroke(arc(x, y + w * 0.34, w * 0.5, w * 0.34, -0.85 * Math.PI, -0.15 * Math.PI, 7), 2.2), { flat: true, color: INKS, ink: null });
    }
}

const whiskers = (p, x, y, w, sp) => {
    for (const side of [-1, 1]) for (const k of [-1, 0, 1]) {
        p.shape(stroke([[x + side * sp, y + k * 3], [x + side * (sp + w), y + k * 6]], 0.9), { flat: true, color: INKS, ink: null });
    }
};

const FACES = {
    // Floppy-eared sausage dog. Muzzle first, then ears hanging over the sides.
    noodle(p, c, mood) {
        const col = C[0];
        for (const s of [-1, 1]) {
            const ear = rotated(ellipse(c + s * 34, c - 10, 12, 25), c + s * 34, c - 10, s * 0.28);
            p.shape(ear, { color: (x, y, d) => mix3(hex("#5d2415"), hex("#8a3a1e"), d * 2), bevel: 8, gloss: 0.05, inkW: 3 });
        }
        p.shape(ellipse(c, c + 15, 21, 15), { color: (x, y, d) => mix3(col.base, hex("#f6c58c"), Math.min(1, d * 3)), bevel: 10, gloss: 0.05, inkW: 2.5 });
        p.shape(rotated(ellipse(c, c + 7, 8, 6), c, c + 7, 0), { color: hex("#1a1538"), bevel: 4, gloss: 0.9, ink: null });
        frown(p, c, c + 21, 16, mood);
        eyes(p, c, c - 10, 15, 9, mood, col.base);
    },
    // Fat pig: triangle ears and a big flat snout.
    truffle(p, c, mood) {
        const col = C[1];
        for (const s of [-1, 1]) p.shape(polygon([[c + s * 16, c - 30], [c + s * 40, c - 46], [c + s * 36, c - 20]], 4), { color: (x, y, d) => mix3(col.deep, col.base, Math.min(1, d * 3)), bevel: 6, gloss: 0.05, inkW: 3 });
        eyes(p, c, c - 13, 17, 8.5, mood, col.base);
        p.shape(ellipse(c, c + 12, 19, 14), { color: (x, y, d) => mix3(hex("#e65f88"), hex("#ffb0c2"), Math.min(1, d * 2.4)), bevel: 8, gloss: 0.15, inkW: 2.5 });
        p.shape(ellipse(c - 7, c + 12, 3.4, 5), { flat: true, color: hex("#7c1f47"), ink: null });
        p.shape(ellipse(c + 7, c + 12, 3.4, 5), { flat: true, color: hex("#7c1f47"), ink: null });
        if (mood === 1) frown(p, c, c + 30, 12, 1); else if (mood === 3) frown(p, c, c + 30, 10, 3);
    },
    // Marmalade the cat: sharp ears, tabby forehead, whiskers.
    marmalade(p, c, mood) {
        const col = C[2];
        for (const s of [-1, 1]) {
            p.shape(polygon([[c + s * 12, c - 30], [c + s * 37, c - 54], [c + s * 37, c - 16]], 3), { color: (x, y, d) => mix3(col.deep, col.base, Math.min(1, d * 3)), bevel: 7, gloss: 0.05, inkW: 3 });
            p.shape(polygon([[c + s * 22, c - 32], [c + s * 33, c - 44], [c + s * 33, c - 26]], 2), { flat: true, color: hex("#ff9d9d"), ink: null });
        }
        for (const dx of [-7, 0, 7]) p.shape(capsule(c + dx, c - 31, c + dx * 0.8, c - 22, 2.2), { flat: true, color: col.mark, ink: null });
        eyes(p, c, c - 6, 16, 9.5, mood, col.base);
        p.shape(polygon([[c - 4, c + 9], [c + 4, c + 9], [c, c + 14]], 1), { flat: true, color: hex("#d8456e"), ink: INKS, inkW: 1.4 });
        if (mood === 1 || mood === 3) frown(p, c, c + 22, 13, mood);
        else frown(p, c, c + 20, 12, mood);
        whiskers(p, c, c + 14, 14, 15);
    },
    // Blub the seal: no ears, huge eyes, whisker puffs.
    blub(p, c, mood) {
        const col = C[3];
        eyes(p, c, c - 12, 16, 10.5, mood, col.base);
        for (const s of [-1, 1]) p.shape(ellipse(c + s * 9.5, c + 12, 11, 9), { color: (x, y, d) => mix3(hex("#b8e2fa"), WHITE, Math.min(1, d * 3)), bevel: 6, gloss: 0.05, inkW: 2.2 });
        p.shape(ellipse(c, c + 5, 6.5, 4.8), { color: INKS, bevel: 3, gloss: 0.9, ink: null });
        if (mood === 1 || mood === 3) frown(p, c, c + 26, 11, mood); else if (mood === 0) p.shape(stroke([[c - 6, c + 25], [c + 6, c + 25]], 1.8), { flat: true, color: INKS, ink: null });
        whiskers(p, c, c + 12, 14, 19);
    },
    // Moss the frog: eyes on top of the head and a mouth as wide as his grudge.
    moss(p, c, mood) {
        const col = C[4];
        for (const s of [-1, 1]) p.shape(circle(c + s * 19, c - 28, 16), { color: (x, y, d) => mix3(col.deep, col.base, Math.min(1, d * 3)), bevel: 8, gloss: 0.1, inkW: 3 });
        eyes(p, c, c - 29, 19, 10.5, mood, col.base);
        if (mood === 1) frown(p, c, c + 8, 26, 1, hex("#f06a9d"));
        else if (mood === 3) frown(p, c, c + 8, 16, 3);
        else p.shape(stroke(arc(c, c + 18, 30, 12, -0.92 * Math.PI, -0.08 * Math.PI, 12), 2.4), { flat: true, color: INKS, ink: null });
    },
    // Honk the goose: orange beak, mean little eyes.
    honk(p, c, mood) {
        const col = C[5], beak = hex("#ff9320");
        p.shape(smooth(4, circle(c - 3, c - 33, 6), circle(c + 5, c - 31, 5)), { color: col.base, bevel: 4, gloss: 0.05, inkW: 2.6 });
        eyes(p, c, c - 13, 15, 8.5, mood, col.base);
        if (mood === 1 || mood === 3) {
            p.shape(polygon([[c - 16, c + 2], [c + 16, c + 2], [c + 12, c + 15], [c - 12, c + 15]], 3), { color: (x, y, d) => mix3(hex("#d65a0a"), beak, Math.min(1, d * 3)), bevel: 6, gloss: 0.2, inkW: 2.6 });
            frown(p, c, c + 22, 14, 1, hex("#ff8f5c"));
        } else {
            p.shape(polygon([[c - 16, c + 2], [c + 16, c + 2], [c + 9, c + 19], [c - 9, c + 19]], 4), { color: (x, y, d) => mix3(hex("#d65a0a"), beak, Math.min(1, d * 3)), bevel: 7, gloss: 0.25, inkW: 2.6 });
            p.shape(stroke([[c - 13, c + 9], [c + 13, c + 9]], 1.4), { flat: true, color: hex("#8a3706"), ink: null });
        }
    },
    // Mud the hippo: tiny ears, enormous muzzle.
    mud(p, c, mood) {
        const col = C[6];
        for (const s of [-1, 1]) p.shape(ellipse(c + s * 26, c - 31, 8, 10), { color: (x, y, d) => mix3(col.deep, col.base, Math.min(1, d * 3)), bevel: 5, gloss: 0.05, inkW: 2.8 });
        eyes(p, c, c - 17, 15, 8.2, mood, col.base);
        p.shape(smooth(5, ellipse(c - 13, c + 10, 20, 17), ellipse(c + 13, c + 10, 20, 17)), { color: (x, y, d) => mix3(col.base, hex("#dec0ff"), Math.min(1, d * 2.5)), bevel: 10, gloss: 0.08, inkW: 2.8 });
        p.shape(ellipse(c - 10, c + 6, 3, 3.6), { flat: true, color: hex("#3e1c74"), ink: null });
        p.shape(ellipse(c + 10, c + 6, 3, 3.6), { flat: true, color: hex("#3e1c74"), ink: null });
        if (mood === 1 || mood === 3) frown(p, c, c + 21, 12, mood);
        else p.shape(stroke(arc(c, c + 26, 18, 8, -0.85 * Math.PI, -0.15 * Math.PI, 8), 2), { flat: true, color: INKS, ink: null });
    },
    // A sheep, dark faced in a wool cap. Sheep sleep through everything.
    sheep(p, c, mood) {
        const col = C[7], face = hex("#3b3560"), lit = hex("#5a5288");
        for (const s of [-1, 1]) p.shape(rotated(ellipse(c + s * 22, c + 0, 10, 5.5), c + s * 22, c, s * 0.5), { color: (x, y, d) => mix3(face, lit, Math.min(1, d * 3)), bevel: 4, gloss: 0.05, inkW: 2.2 });
        p.shape(ellipse(c, c + 7, 16, 19), { color: (x, y, d) => mix3(face, lit, Math.min(1, d * 2)), bevel: 8, gloss: 0.1, inkW: 2.5 });
        p.shape(union(circle(c - 11, c - 13, 8), circle(c, c - 17, 9), circle(c + 11, c - 13, 8)), { color: col.base, bevel: 6, gloss: 0.05, inkW: 2.5 });
        eyes(p, c, c + 3, 7.5, 4.6, mood === 3 ? 3 : 2, face, { ink: mood === 3 ? INKS : hex("#e8e4ff") });
        p.shape(stroke(arc(c, c + 15, 4, 3, 0.2 * Math.PI, 0.8 * Math.PI, 5), 1.4), { flat: true, color: hex("#e8e4ff"), ink: null });
    },
};
const FACE_KEYS = ["noodle", "truffle", "marmalade", "blub", "moss", "honk", "mud", "sheep"];

export function paintFaces(assets) {
    const W = FACE * 5, Hh = FACE * 8;
    assets.paint("faces", W, Hh, (px) => {
        const p = new Painter(px.data, W, Hh);
        FACE_KEYS.forEach((k, row) => {
            for (let mood = 0; mood < 5; mood++) {
                p.cell(mood * FACE, row * FACE, FACE, FACE);
                FACES[k](p, FACE / 2, mood);
            }
        });
    }, { smooth: true });
    assets.grid("faces", 5, 8);
}

// --- Rivals --------------------------------------------------------------------------------------------------------
const P = PORTRAIT / 2;
const lit = (deep, base, k = 2.4) => (x, y, d) => mix3(deep, base, Math.min(1, d * k));
const beakShape = (cx, cy, w, h) => polygon([[cx - w, cy - h * 0.25], [cx + w, cy - h * 0.25], [cx, cy + h]], 5);

// Expressions: 0 smug, 1 hurt, 2 knocked out, 3 fast asleep.
const headEyes = (p, x, y, gap, r, expr, lid, o) => eyes(p, x, y, gap, r, expr === 0 ? 4 : expr === 1 ? 1 : 2, lid, o);
const KO = (p, x, y, gap, r) => { for (const s of [-1, 1]) { const q = x + s * gap; p.shape(union(capsule(q - r, y - r, q + r, y + r, r * 0.22), capsule(q + r, y - r, q - r, y + r, r * 0.22)), { flat: true, color: INK, ink: null }); } };
const portraitEyes = (p, x, y, gap, r, expr, lid, o) => { if (expr === 2) KO(p, x, y, gap, r * 0.9); else headEyes(p, x, y, gap, r, expr, lid, o); };

const RIVAL_ART = {
    pip(p, e) {
        const y = hex("#ffd84f"), d = hex("#e39a18");
        p.shape(union(circle(P - 6, 38, 11), circle(P + 8, 34, 12)), { color: lit(d, y), bevel: 8, inkW: 4 });
        p.shape(circle(P, 100, 62), { color: lit(d, y), bevel: 26, gloss: 0.15, glow: 0.4, inkW: 5 });
        portraitEyes(p, P, 88, 25, 15, e === 0 ? 3 - 3 : e, y);
        p.shape(smooth(5, ellipse(P, 118, 28, 11), ellipse(P, 128, 21, 9)), { color: lit(hex("#d9600d"), hex("#ff9a2e")), bevel: 7, gloss: 0.3, inkW: 4 });
    },
    mabel(p, e) {
        const y = hex("#e8784a"), d = hex("#a33f26"), cr = hex("#e8324a");
        p.shape(union(circle(P - 22, 34, 14), circle(P, 26, 17), circle(P + 22, 34, 14)), { color: lit(hex("#a01024"), cr), bevel: 10, inkW: 4 });
        p.shape(smooth(10, circle(P, 98, 58), ellipse(P, 135, 46, 30)), { color: lit(d, y), bevel: 26, gloss: 0.1, glow: 0.3, inkW: 5 });
        for (const s of [-1, 1]) p.shape(ellipse(P + s * 35, 110, 12, 8), { flat: true, color: hex("#f7a58b"), ink: null });
        portraitEyes(p, P, 86, 24, 15, e, y);
        p.shape(beakShape(P, 112, 20, 26), { color: lit(hex("#d6890e"), hex("#ffc53a")), bevel: 8, gloss: 0.3, inkW: 4 });
        p.shape(smooth(4, ellipse(P - 4, 146, 10, 12), ellipse(P + 7, 142, 7, 9)), { color: lit(hex("#a01024"), cr), bevel: 6, inkW: 3.5 });
        // Pearls. She has standards.
        for (let i = -3; i <= 3; i++) p.shape(circle(P + i * 11, 165 - Math.abs(i) * 2.2, 5), { color: lit(hex("#cfc5d8"), WHITE), bevel: 3, gloss: 0.9, inkW: 1.8 });
    },
    bristle(p, e) {
        const y = hex("#d6a878"), d = hex("#94643f"), q = hex("#5b3d33"), qd = hex("#2f1f26");
        const spikes = [];
        for (let i = 0; i <= 12; i++) {
            const a = -Math.PI * (0.02 + i * 0.96 / 12), r0 = 56, r1 = 84 + (i % 2) * 8;
            const cx = P + Math.cos(a) * r0, cy = 104 + Math.sin(a) * r0, tx = P + Math.cos(a) * r1, ty = 104 + Math.sin(a) * r1, nx = -Math.sin(a) * 15, ny = Math.cos(a) * 15;
            spikes.push(polygon([[cx + nx, cy + ny], [tx, ty], [cx - nx, cy - ny]], 0.5));
        }
        p.shape(union(...spikes, ellipse(P, 96, 72, 62)), { color: lit(qd, q, 3), bevel: 12, inkW: 4.5 });
        p.shape(smooth(8, ellipse(P, 112, 50, 44), ellipse(P, 138, 24, 18)), { color: lit(d, y), bevel: 22, gloss: 0.1, inkW: 4 });
        portraitEyes(p, P, 104, 23, 14, e, y);
        p.shape(circle(P, 139, 9), { color: INK, bevel: 6, gloss: 0.9, ink: null });
    },
    rascal(p, e) {
        const g = hex("#8f8fa8"), d = hex("#555574"), mask = hex("#2b2946"), w = hex("#ece9f7");
        for (const s of [-1, 1]) p.shape(ellipse(P + s * 52, 42, 22, 26), { color: lit(d, g), bevel: 12, inkW: 4.5 });
        p.shape(smooth(10, ellipse(P, 96, 74, 62), ellipse(P, 134, 44, 30)), { color: lit(d, g), bevel: 24, gloss: 0.1, inkW: 5 });
        p.shape(smooth(8, ellipse(P - 34, 88, 34, 20), ellipse(P + 34, 88, 34, 20), ellipse(P, 92, 16, 8)), { color: lit(mask, hex("#3f3c62")), bevel: 10, ink: null });
        p.shape(ellipse(P, 60, 8, 22), { flat: true, color: mask, ink: null });
        for (const s of [-1, 1]) p.shape(ellipse(P + s * 34, 66, 24, 8), { flat: true, color: w, ink: null });
        p.shape(ellipse(P, 132, 40, 26), { color: lit(hex("#bdb9d4"), w), bevel: 12, inkW: 3.5 });
        portraitEyes(p, P, 90, 33, 14, e, mask, { ink: INK });
        p.shape(ellipse(P, 118, 11, 8), { color: INK, bevel: 5, gloss: 0.9, ink: null });
        if (e === 0) p.shape(stroke(arc(P + 3, 128, 26, 16, 0.1 * Math.PI, 0.8 * Math.PI, 8), 3), { flat: true, color: INK, ink: null });
        else p.shape(stroke(arc(P, 142, 20, 8, -0.9 * Math.PI, -0.1 * Math.PI, 8), 3), { flat: true, color: INK, ink: null });
    },
    olga(p, e) {
        const k = hex("#2d2a4e"), d = hex("#161432"), w = hex("#f2eefc");
        for (const s of [-1, 1]) p.shape(circle(P + s * 50, 46, 19), { color: lit(d, k), bevel: 10, inkW: 4.5 });
        p.shape(smooth(10, ellipse(P, 98, 70, 60), ellipse(P, 134, 40, 26)), { color: lit(d, k), bevel: 24, gloss: 0.15, inkW: 5 });
        p.shape(polygon([[P - 11, 30], [P + 11, 30], [P + 5, 118], [P - 5, 118]], 4), { flat: true, color: w, ink: null });
        p.shape(ellipse(P, 136, 36, 21), { color: lit(hex("#b9b3cc"), w), bevel: 10, inkW: 3 });
        // Lashes, darling.
        portraitEyes(p, P, 92, 30, 15, e, k, { ink: hex("#0e0c22") });
        if (e !== 2) for (const s of [-1, 1]) for (const i of [0, 1, 2]) p.shape(capsule(P + s * (42 + i * 3), 80 + i * 4, P + s * (54 + i * 3), 74 + i * 5, 1.8), { flat: true, color: w, ink: null });
        p.shape(ellipse(P, 124, 9, 7), { color: hex("#ff6f9e"), bevel: 4, gloss: 0.8, ink: null });
        p.shape(stroke(arc(P, 136, 14, 8, 0.15 * Math.PI, 0.85 * Math.PI, 7), 2.6), { flat: true, color: INK, ink: null });
        p.shape(smooth(6, ellipse(P + 58, 142, 4, 4), circle(P - 60, 26, 3)), { flat: true, color: hex("#9ad85e"), ink: null, inkW: 0 });
    },
    bruno(p, e) {
        const b = hex("#7a3a2a"), d = hex("#431a18"), m = hex("#e8a58a"), h = hex("#f5ecd0");
        for (const s of [-1, 1]) {
            p.shape(stroke([[P + s * 46, 58], [P + s * 74, 44], [P + s * 80, 16]], 9), { color: lit(hex("#b49a6c"), h), bevel: 7, inkW: 4 });
            p.shape(ellipse(P + s * 74, 72, 18, 10), { color: lit(d, b), bevel: 7, inkW: 4 });
        }
        p.shape(smooth(10, rbox(P, 82, 58, 48, 34), ellipse(P, 138, 44, 32)), { color: lit(d, b), bevel: 26, gloss: 0.1, inkW: 5 });
        p.shape(smooth(4, circle(P - 14, 38, 11), circle(P, 34, 13), circle(P + 14, 38, 11)), { color: lit(d, hex("#553020")), bevel: 8, ink: null });
        portraitEyes(p, P, 88, 30, 15, e === 0 ? 0 : e, b);
        p.shape(ellipse(P, 138, 40, 26), { color: lit(hex("#c07c64"), m), bevel: 14, gloss: 0.1, inkW: 4 });
        for (const s of [-1, 1]) p.shape(ellipse(P + s * 16, 134, 6, 8), { flat: true, color: hex("#54231d"), ink: null });
        p.shape(subtract(circle(P, 158, 15), circle(P, 158, 9.5), rbox(P, 142, 20, 7, 0)), { color: lit(hex("#b08838"), hex("#ffd659")), bevel: 4, gloss: 0.9, inkW: 2.4 });
    },
    hoot(p, e) {
        const b = hex("#6d5ca8"), d = hex("#352a70"), w = hex("#f3e4c0");
        for (const s of [-1, 1]) p.shape(polygon([[P + s * 34, 40], [P + s * 72, 12], [P + s * 66, 62]], 5), { color: lit(d, b), bevel: 8, inkW: 4.5 });
        p.shape(ellipse(P, 98, 76, 70), { color: lit(d, b), bevel: 28, gloss: 0.1, inkW: 5 });
        for (const s of [-1, 1]) p.shape(circle(P + s * 32, 84, 31), { color: lit(hex("#c7ae7f"), w), bevel: 12, inkW: 3.5 });
        portraitEyes(p, P, 84, 32, 19, e === 0 ? 3 - 3 : e, w);
        if (e !== 2) for (const s of [-1, 1]) p.shape(subtract(circle(P + s * 32, 84, 26), circle(P + s * 32, 84, 22)), { flat: true, color: hex("#d7a93a"), ink: INK, inkW: 1.6 });
        p.shape(capsule(P - 8, 84, P + 8, 84, 2.8), { flat: true, color: hex("#d7a93a"), ink: null });
        p.shape(beakShape(P, 112, 11, 22), { color: lit(hex("#b4701a"), hex("#ffbc3e")), bevel: 6, gloss: 0.4, inkW: 3.5 });
        for (let i = -2; i <= 2; i++) p.shape(stroke(arc(P + i * 20, 146 - Math.abs(i) * 4, 8, 6, 0.1 * Math.PI, 0.9 * Math.PI, 5), 2), { flat: true, color: d, ink: null });
    },
    reveille(p, e) {
        const w = hex("#fbf0da"), d = hex("#c9a374"), r = hex("#ff3b3b"), rd = hex("#a50e2a");
        // Tail plumes behind.
        for (const [a, c] of [[-0.5, "#1fb88e"], [-0.1, "#2a7fe8"], [0.3, "#ffb52e"]]) p.shape(rotated(ellipse(P + 54, 50, 14, 44), P + 40, 96, a), { color: lit(mix3(hex(c), INK, 0.5), hex(c)), bevel: 8, inkW: 4 });
        p.shape(union(circle(P - 32, 32, 18), circle(P - 8, 22, 22), circle(P + 18, 26, 20), circle(P + 38, 42, 13)), { color: lit(rd, r), bevel: 12, gloss: 0.2, inkW: 4.5 });
        p.shape(smooth(10, ellipse(P, 98, 58, 60), ellipse(P, 148, 44, 26)), { color: lit(d, w), bevel: 26, gloss: 0.1, inkW: 5 });
        portraitEyes(p, P, 86, 26, 16, e === 0 ? 0 : e, w);
        p.shape(smooth(4, ellipse(P - 6, 142, 12, 16), ellipse(P + 10, 136, 9, 13)), { color: lit(rd, r), bevel: 8, inkW: 3.5 });
        p.shape(beakShape(P, 110, 24, 24), { color: lit(hex("#d6890e"), hex("#ffc53a")), bevel: 8, gloss: 0.35, inkW: 4 });
    },
};
export const RIVAL_FRAMES = 4;
export const RIVAL_KEYS = ["pip", "mabel", "bristle", "rascal", "olga", "bruno", "hoot", "reveille"];

/** Portraits are costly, so in a browser they arrive a few at a time once the title is already up. */
export function paintRivals(assets, later) {
    const W = PORTRAIT * RIVAL_FRAMES, Hh = PORTRAIT * 8;
    let data = null;
    assets.paint("rivals", W, Hh, (px) => { data = px.data; }, { smooth: true });
    assets.grid("rivals", RIVAL_FRAMES, 8);
    const p = new Painter(data, W, Hh), jobs = [];
    RIVAL_KEYS.forEach((k, row) => { for (let e = 0; e < RIVAL_FRAMES; e++) jobs.push(() => { p.cell(e * PORTRAIT, row * PORTRAIT, PORTRAIT, PORTRAIT); RIVAL_ART[k](p, e); }); });
    if (!later) { for (const j of jobs) j(); return; }
    const next = () => {
        jobs.shift()();
        if (jobs.length) setTimeout(next, 4); else assets.refresh("rivals");
    };
    setTimeout(next, 30);
}

// --- Logo and bits --------------------------------------------------------------------------------------------------
const LW = 120, LH = 150;
const GLYPHS = {
    S: [[[92, 42], [78, 26], [52, 22], [32, 34], [32, 56], [52, 70], [74, 80], [90, 96], [84, 120], [58, 130], [34, 124], [22, 108]]],
    T: [[[20, 30], [100, 30]], [[60, 30], [60, 128]]],
    A: [[[22, 128], [60, 26], [98, 128]], [[38, 94], [82, 94]]],
    C: [[[94, 46], [76, 28], [50, 28], [30, 48], [26, 78], [32, 108], [52, 126], [76, 126], [94, 110]]],
    K: [[[32, 26], [32, 128]], [[92, 28], [36, 80], [96, 128]]],
};
const LOGO = "STACKATTACK";
const COLS = ["#ff8fa8", "#f5ad2e", "#62c84e", "#4fa9e8", "#a56ee0", "#ff6d5e", "#f5ad2e", "#62c84e", "#4fa9e8", "#ff8fa8", "#a56ee0"];

export function paintLogo(assets) {
    assets.paint("logo", LW * 11, LH, (px) => {
        const p = new Painter(px.data, LW * 11, LH);
        [...LOGO].forEach((ch, n) => {
            p.cell(n * LW, 0, LW, LH);
            const col = hex(COLS[n]), deep = mix3(col, hex("#2a1a5e"), 0.55), light = mix3(col, WHITE, 0.5);
            const f = union(...GLYPHS[ch].map((s) => stroke(s, 19)));
            p.shape(f, { color: (x, y, d) => mix3(mix3(deep, col, Math.min(1, d * 2)), light, Math.max(0, (70 - y) / 110)), bevel: 14, gloss: 0.3, glow: 0.4, inkW: 7 });
        });
    }, { smooth: true });
    assets.grid("logo", 11, 1);
}

export const logoAspect = LW / LH;
/** Two rows of grumpy letters, breathing slowly. Width is the row width. */
export function drawLogo(d, x, y, width, t) {
    const lw = width / 5.6, lh = lw / logoAspect;
    const row = (from, to, ry, pad) => {
        const n = to - from;
        for (let i = from; i < to; i++) {
            const wob = Math.sin(t * 2.1 + i * 0.8), k = i - from, px = x + (k - (n - 1) / 2) * lw * pad, py = ry + wob * lh * 0.02;
            d.push(); d.translate(px, py + lh / 2); d.rotate((i % 2 ? 1 : -1) * 0.035 + wob * 0.02); d.scale(1 + wob * 0.02, 1 - wob * 0.02);
            d.sprite("logo", { frame: i, x: 0, y: -lh / 2, width: lw, height: lh });
            d.pop();
        }
    };
    row(0, 5, y - lh * 0.86, 0.98);
    row(5, 11, y - lh * 0.1, 0.86);
    return lh * 1.8;
}

export const BED_W = 372, BED_H = 692, BED_INNER_W = 320, BED_INNER_H = 640;
export const FX = { z: 0, star: 1, puff: 2, feather: 3, crack: 4, quill: 5, stink: 6, moon: 7, sun: 8, eggy: 9, spark: 10, note: 11 };
export function paintFx(assets) {
    const S = 64, n = 12;
    assets.paint("fx", S * n, S, (px) => {
        const p = new Painter(px.data, S * n, S), at = (i) => p.cell(i * S, 0, S, S), c = S / 2, cream = hex("#fff1c9");
        at(0); p.shape(stroke([[18, 18], [46, 18], [18, 46], [46, 46]], 5), { flat: true, color: cream, ink: INK, inkW: 3 });
        at(1); p.shape(polygon(star(c, c + 2, 26, 0.5), 3), { color: lit(hex("#f09a18"), hex("#ffe063")), bevel: 7, gloss: 0.4, inkW: 3 });
        at(2); p.soft(union(circle(c - 10, c + 4, 14), circle(c + 10, c + 2, 15), circle(c, c - 10, 13)), hex("#ffffff"), 1, 5);
        at(3); p.shape(rotated(smooth(3, ellipse(c, c, 9, 22), capsule(c, c, c, c + 28, 1.5)), c, c, 0.5), { flat: true, color: hex("#fbf1d8"), ink: INK, inkW: 2 });
        at(4); p.shape(stroke([[10, 14], [24, 28], [14, 40], [30, 54]], 3), { flat: true, color: hex("#ffcf7a"), ink: null });
        at(5); p.shape(polygon([[c, 4], [c + 7, 58], [c - 7, 58]], 1), { color: lit(hex("#3b2730"), hex("#8a6650")), bevel: 4, inkW: 2.4 });
        at(6); p.soft(union(circle(c - 9, c + 4, 15), circle(c + 11, c + 1, 13), circle(c + 1, c - 12, 12)), hex("#a6e05c"), 0.9, 6);
        at(7); p.shape(circle(c, c, 26), { color: lit(hex("#e0c98a"), hex("#fff4c9")), bevel: 14, gloss: 0.05, glow: 0.3, ink: null });
        at(8); p.soft(circle(c, c, 16), hex("#ffffff"), 1, 14);
        at(9); p.shape(smooth(4, ellipse(c, c + 5, 18, 19), ellipse(c, c - 7, 12, 14)), { color: lit(hex("#d9b078"), hex("#fff0cf")), bevel: 10, inkW: 3 });
        at(10); p.soft(polygon(star(c, c, 28, 0.18, 4, 0), 0), WHITE, 1, 2);
        at(11); p.shape(union(circle(22, 46, 8), capsule(29, 46, 29, 14, 2), capsule(29, 14, 44, 20, 2)), { flat: true, color: cream, ink: INK, inkW: 2.4 });
    }, { smooth: true });
    assets.grid("fx", n, 1);
    // Rolling hills, tinted per scene.
    // Rolling hills, tinted per scene: alpha only, so one sprite serves every sky.
    assets.paint("hills", 512, 200, (px) => {
        const D = px.data;
        for (let y = 0; y < 200; y++) for (let x = 0; x < 512; x++) {
            const top = 70 + Math.sin(x * Math.PI * 2 / 512 * 2 + 0.6) * 34 + Math.sin(x * Math.PI * 2 / 512 * 5) * 12, i = (x + y * 512) * 4;
            const a = Math.max(0, Math.min(1, y - top + 0.5));
            D[i] = D[i + 1] = D[i + 2] = 255; D[i + 3] = a * 255;
        }
    }, { smooth: true });
    // The bed: a wooden frame around a stitched quilt. Every board in the game is one of these.
    assets.paint("bed", BED_W, BED_H, (px) => {
        const p = new Painter(px.data, BED_W, BED_H), wood = hex("#8a5536"), dark = hex("#4a2a2a"), q = hex("#2b2768"), q2 = hex("#231f58");
        p.cell(0, 0, BED_W, BED_H);
        const cx = BED_W / 2, cy = BED_H / 2;
        p.shape(rbox(cx, cy, BED_W / 2 - 6, BED_H / 2 - 6, 26), { color: (x, y, d) => mix3(dark, wood, Math.min(1, d * 3.4) * (0.82 + 0.18 * Math.sin(y * 0.09 + Math.sin(x * 0.05) * 2))), bevel: 12, gloss: 0.16, glow: 0.4, inkW: 5 });
        p.shape(rbox(cx, cy, BED_INNER_W / 2 + 2, BED_INNER_H / 2 + 2, 8), {
            flat: true, ink: dark, inkW: 2,
            color: (x, y) => {
                const u = (x - cx + BED_INNER_W / 2) / (BED_INNER_W / 5), v = (y - cy + BED_INNER_H / 2) / (BED_INNER_W / 5);
                const a = Math.abs(mod(u + v, 1) - 0.5), b = Math.abs(mod(u - v, 1) - 0.5);
                const shade = Math.min(a, b) * 2;
                let col = mix3(q2, q, shade);
                if (Math.min(a, b) < 0.022 && mod(Math.floor((x + y) / 7), 2) === 0) col = mix3(col, hex("#6a63c0"), 0.28);
                // A dot at every cell corner, so columns can be read at a glance.
                const gx = x - cx + BED_INNER_W / 2, gy = y - cy + BED_INNER_H / 2;
                if (Math.hypot(mod(gx + 16, 32) - 16, mod(gy + 16, 32) - 16) < 2.2) col = mix3(col, hex("#8d86e0"), 0.6);
                return col;
            },
        });
    }, { smooth: true });
    assets.paint("moon", 256, 256, (px) => {
        const p = new Painter(px.data, 256, 256);
        p.cell(0, 0, 256, 256);
        p.shape(circle(128, 128, 118), { color: (x, y, d) => mix3(hex("#e8cf8e"), hex("#fff6d4"), Math.min(1, d * 1.6)), bevel: 60, gloss: 0, glow: 0.2, ink: null });
        for (const [x, y, r] of [[92, 88, 24], [168, 74, 13], [150, 150, 30], [84, 170, 15], [122, 56, 8], [196, 124, 11]]) p.soft(circle(x, y, r), hex("#d9bd7a"), 0.42, 4);
    }, { smooth: true });
    assets.paint("glow", 128, 128, (px) => {
        const p = new Painter(px.data, 128, 128);
        p.cell(0, 0, 128, 128);
        p.soft(circle(64, 64, 34), WHITE, 1, 30);
    }, { smooth: true });
}

export function paintAll(assets, later = false) {
    paintTiles(assets); paintFaces(assets); paintLogo(assets); paintFx(assets); paintRivals(assets, later);
}
