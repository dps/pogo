// Turns everything into sprites. Card art and tokens paint lazily, one at a time, so startup stays quick
// and a phone never pays for a hundred pictures it may not show.
import { Painter, blob, cut, fbm, mix, rgb, union } from "./kit.js";
import M from "./motifs.js";
import { CREATURES, WITCH_ART } from "./creatures.js";
import { CARDS } from "../data/cards.js";
import { ELEMENTS } from "../data/rules.js";
import { TRINKETS } from "../data/trinkets.js";

export const CARD_W = 180, CARD_H = 252;
export const ART_W = 176, ART_H = 132;

const BACKDROPS = {
    hearth: ["#4a1420", "#d8481e", "#ffb347"], sea: ["#0e2a5a", "#1f7fb8", "#7fe0ea"], forest: ["#143a2a", "#2f7f3a", "#c6e86a"], frost: ["#3a5a9a", "#8fc4ea", "#f2fcff"],
    night: ["#14082a", "#4c1c93", "#c88bff"], vault: ["#3a2010", "#a4661a", "#ffe08a"], swamp: ["#1a2a1a", "#55703a", "#b5c26a"], stars: ["#0a0824", "#2a1f7a", "#8fb8ff"],
};
function backdrop(k, name, seed) {
    const [a, b, c] = BACKDROPS[name].map(rgb), sx = seed * 7.3, W = k.w, H = k.h;
    k.wash((u, v, x, y) => {
        const dx = u - 0.5, dy = v - 0.62, r = Math.sqrt(dx * dx * 1.3 + dy * dy * 1.6);
        const n = fbm(x * 0.022 + sx, y * 0.03 + sx * 0.5, 3), st = fbm(x * 0.06 + y * 0.02 + sx, y * 0.08, 2);
        const t = Math.max(0, Math.min(1, 1.05 - r * 2 + (n - 0.5) * 0.9));
        const e = t * t;
        const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        const w = Math.max(0, e - 0.55) * 1.1;
        const g = 0.92 + st * 0.16;
        return [(q[0] + (c[0] - q[0]) * w) * g, (q[1] + (c[1] - q[1]) * w) * g, (q[2] + (c[2] - q[2]) * w) * g];
    });
    if (name === "stars" || name === "night") k.dots(26, seed + 3, 0, 0, W, H * 0.8, 0.6, 1.5, "#fff6d8");
    if (name === "sea") for (let i = 0; i < 5; i++) k.dots(3, seed + i, 0, 50 + i * 16, W, 18, 2, 4, "#b5f0ff", 0.25);
    if (name === "hearth") k.dots(18, seed + 1, 0, 0, W, H, 0.7, 2, "#ffd27a", 0.8);
    if (name === "frost") k.dots(20, seed + 2, 0, 0, W, H, 0.8, 2, "#ffffff", 0.75);
    if (name === "vault") k.dots(14, seed + 4, 0, 0, W, H, 0.7, 2, "#fff0b0", 0.7);
    if (name === "forest") k.dots(12, seed + 6, 0, 0, W, H, 1, 2.4, "#e0f7a0", 0.55);
    if (name === "swamp") k.dots(10, seed + 7, 0, H * 0.4, W, H * 0.6, 1.5, 4, "#c8d890", 0.35);
}
const hashStr = (s) => { let h = 5; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h; };
const TINT = { ember: "#ff7a2f", brine: "#2fb6e8", moss: "#6fce46", rime: "#a9dcf5", hex: "#b45cff", gilt: "#f7c33c" };
function paintCardArt(p, card) {
    const k = new Painter(p), h = hashStr(card.id), W = k.w, H = k.h;
    const [bg, m1, m2] = card.art;
    backdrop(k, bg, h % 97);
    k.glow(W / 2, H * 0.56, H * 0.62, TINT[card.el] ?? "#b5b283", 0.32);
    const tilt = ((h >> 3) % 21 - 10) * 0.018;
    if (m2) { k.save().at(W * (h % 2 ? 0.72 : 0.28), H * 0.36, 0.62, -tilt * 3); M[m2]?.(k, {}); k.restore(); }
    k.fill(k.ell(W / 2, H * 0.85, 46, 7), { c: "#120822", flat: true, inkW: 0, alpha: 0.4, grain: 0 });
    k.save().at(W * (m2 ? (h % 2 ? 0.42 : 0.58) : 0.5), H * 0.52, m2 ? 0.92 : 1.08, tilt); M[m1]?.(k, {}); k.restore();
    k.vignette(0.42);
}
function frame(game, el) {
    const e = ELEMENTS[el];
    game.assets.paint(`frame_${el}`, CARD_W, CARD_H, (p) => {
        const k = new Painter(p);
        const body = k.box(90, 126, 176, 248, 16);
        const win = k.box(90, 80, 152, 106, 8);
        k.fill(cut(body, win), { c: mix(e.dark, "#1b1030", 0.25), c2: mix(e.dark, "#1b1030", 0.55), hi: e.color, lo: "#120822", bevel: 9, inkW: 2.2 });
        k.fill(cut(k.box(90, 80, 160, 114, 11), win), { c: "#e7b75e", hi: "#fff6c0", lo: "#7a4a1a", bevel: 3, inkW: 1 });
        k.fill(k.box(90, 188, 158, 106 - 6, 8), { c: "#f5ead2", c2: "#e4d2ae", hi: "#fffaf0", lo: "#b8a07c", bevel: 8, inkW: 1.5, grain: 0.03 });
        k.fill(k.box(90, 20, 150, 28, 8), { c: e.color, c2: e.dark, hi: e.light, lo: "#120822", bevel: 7, inkW: 1.6 });
        for (const [x, y] of [[10, 240], [170, 240]]) k.fill(k.circle(x, y, 2.4), { c: "#e7b75e", gloss: 1, inkW: 0.8 });
    }, { smooth: true });
}
function foil(game) {
    const W = 90, H = 126, F = 16;
    game.assets.paint("foil", W, H, (p, f) => {
        const d = p.data, stride = W * F, off = f * W, hw = W / 2 - 1, hh = H / 2 - 1, R = 8;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const qx = Math.abs(x - W / 2 + 0.5) - hw + R, qy = Math.abs(y - H / 2 + 0.5) - hh + R, sd = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - R;
            if (sd > 0) continue;
            const u = x / W, v = y / H, t = (u + v * 0.6) / 1.6, c = -0.25 + f / (F - 1) * 1.5, band = Math.exp(-Math.pow((t - c) * 6.5, 2)), band2 = Math.exp(-Math.pow((t - c + 0.28) * 14, 2)) * 0.5;
            const hue = (t * 2.2 + f * 0.05) * Math.PI * 2, r = 0.5 + 0.5 * Math.cos(hue), g = 0.5 + 0.5 * Math.cos(hue - 2.1), b = 0.5 + 0.5 * Math.cos(hue + 2.1), a = Math.min(1, (band + band2));
            const i = (y * stride + x + off) * 4;
            d[i] = (r * 0.65 + 0.35) * 255; d[i + 1] = (g * 0.65 + 0.35) * 255; d[i + 2] = (b * 0.65 + 0.35) * 255; d[i + 3] = a * 255;
        }
    }, { smooth: true, frames: F });
}
export function soft(game, name, size, fn) {
    game.assets.paint(name, size, size, (p) => {
        const d = p.data, c = size / 2;
        for (let y = 0, i = 0; y < size; y++) for (let x = 0; x < size; x++, i += 4) {
            const r = Math.min(1, Math.hypot(x + 0.5 - c, y + 0.5 - c) / c), a = fn(r, (x + 0.5 - c) / c, (y + 0.5 - c) / c);
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = Math.max(0, Math.min(1, a)) * 255;
        }
    }, { smooth: true });
}
function tower(k, act) {
    const pal = [
        { a: "#120d1c", b: "#26402f", c: "#6fae6a", stone: "#2a3a30" },
        { a: "#1a0f2c", b: "#4a2758", c: "#e8a65e", stone: "#3a2a4a" },
        { a: "#0c1230", b: "#22406f", c: "#9fc8ef", stone: "#2a3454" },
        { a: "#120826", b: "#5a2a80", c: "#ffb0a0", stone: "#3a2a5a" },
    ][act], A = rgb(pal.a), B = rgb(pal.b), W = k.w, H = k.h;
    k.wash((u, v, x, y) => {
        const dx = u - 0.5, dy = v - 0.5, t = Math.max(0, 1 - Math.sqrt(dx * dx * 1.6 + dy * dy) * 1.5) * (0.65 + fbm(x * 0.012, y * 0.012, 3) * 0.7);
        return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    });
    const st = pal.stone;
    if (act === 3) {
        k.dots(70, 3, 0, 0, W, H * 0.7, 0.5, 1.6, "#ffe8d0", 0.9);
        k.save().at(W * 0.7, H * 0.2, 0.9); M.moon(k, { a: "#ffd9b0" }); k.restore();
        k.glow(W * 0.7, H * 0.2, 90, "#ffb0a0", 0.25);
        for (const [x, y, r] of [[40, 110, 42], [90, 124, 34], [230, 96, 46], [272, 118, 34]]) k.fill(k.circle(x, y, r), { c: "#4a2f70", hi: "#a070c0", inkW: 0, alpha: 0.55 });
        k.fill(k.polygon([[0, 420], [0, 300], [40, 300], [40, 280], [70, 280], [70, 300], [110, 300], [110, 280], [140, 280], [140, 300], [190, 300], [190, 280], [220, 280], [220, 300], [260, 300], [260, 280], [300, 280], [300, 420]]), { c: st, c2: "#160c2a", inkW: 2, hi: mix(st, "#ffb0a0", 0.4) });
        return;
    }
    for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
        const x = i * 40 + (row % 2 ? 20 : 0), y = row * 28 + 12;
        k.fill(k.box(x, y, 38, 26, 4), { c: st, inkW: 0, alpha: 0.5, hi: mix(st, pal.c, 0.25), bevel: 6 });
    }
    const arch = (x, y, w, h, fill) => k.fill(blob(1, k.box(x, y + h * 0.2, w, h * 0.8, 2), k.ell(x, y - h * 0.1, w / 2, w * 0.56)), fill);
    if (act === 0) {
        arch(150, 150, 150, 200, { c: "#070510", flat: true, inkW: 5, ink: mix(st, "#7fbf7a", 0.25) });
        for (const [x, y, s] of [[34, 330, 1.05], [264, 340, 0.95]]) {
            k.save().at(x, y, s);
            k.fill(k.ell(0, 0, 40, 54), { c: "#6a4a2e", hi: "#b8905a", lo: "#1f1420" });
            for (const q of [-26, 26]) k.fill(k.box(0, q, 76, 7, 2), { c: "#3b3a4a", flat: true });
            k.restore();
        }
        for (const [x, y] of [[84, 256], [216, 248]]) { k.save().at(x, y, 0.5); M.candle(k); k.restore(); k.glow(x, y - 8, 60, "#e8a65e", 0.22); }
        k.glow(150, 200, 100, "#6fae6a", 0.14);
    } else if (act === 1) {
        for (const x of [40, 260]) {
            k.fill(k.box(x, 210, 90, 400, 3), { c: "#2a1a30", hi: "#6a4a50", inkW: 2 });
            for (let i = 0; i < 6; i++) {
                k.fill(k.box(x, 40 + i * 70, 90, 7, 1), { c: "#5a3a2a", hi: "#a07050", inkW: 1 });
                for (let j = 0; j < 9; j++) { const c = ["#7a3a4a", "#3a5a7a", "#6a5a2a", "#4a3a7a", "#3a6a4a"][(i * 3 + j) % 5]; k.fill(k.box(x - 38 + j * 9.5, 12 + i * 70, 8, 44 + ((i + j) % 3) * 4, 1), { c, inkW: 0.8, bevel: 3 }); }
            }
        }
        arch(150, 120, 90, 140, { c: "#e8a65e", c2: "#6a3a5a", flat: true, inkW: 4 });
        k.glow(150, 120, 120, "#e8a65e", 0.25);
    } else {
        k.save().at(150, 110, 2.2); M.bell(k); k.restore();
        k.fill(k.box(150, 30, 300, 26, 3), { c: "#2a2030", hi: "#6a5a60", inkW: 2 });
        k.fill(k.polygon([[0, 60], [90, 30], [90, 44], [0, 80]]), { c: "#2a2030", hi: "#6a5a60" });
        k.fill(k.polygon([[300, 60], [210, 30], [210, 44], [300, 80]]), { c: "#2a2030", hi: "#6a5a60" });
        for (const x of [36, 264]) { arch(x, 210, 54, 120, { c: "#9fc8ef", c2: "#2a4a80", flat: true, inkW: 4 }); k.dots(7, x, x - 22, 170, 44, 90, 0.5, 1.2, "#fff"); }
        k.glow(150, 120, 120, "#9fc8ef", 0.14);
    }
    k.fill(k.box(150, 396, 340, 70, 0), { c: st, c2: "#0c0814", inkW: 2, hi: mix(st, pal.c, 0.2) });
    k.vignette(0.55);
}
function cauldron(game) {
    game.assets.paint("pot_back", 300, 110, (p) => {
        const k = new Painter(p);
        k.fill(k.ell(150, 55, 138, 44), { c: "#2a2638", hi: "#6a6888", lo: "#0c0a14", bevel: 12, inkW: 2.5 });
        k.fill(k.ell(150, 57, 124, 36), { c: "#0e0a18", flat: true, inkW: 0 });
    }, { smooth: true });
    game.assets.paint("pot_front", 320, 210, (p) => {
        const k = new Painter(p);
        for (const x of [62, 258]) { k.fill(k.polygon([[x - 20, 150], [x + 20, 150], [x + 8 * (x < 160 ? -1 : 1) + 8, 205], [x - 8 + 8 * (x < 160 ? -1 : 1), 205]]), { c: "#2a2638", hi: "#6a6888", lo: "#0c0a14" }); }
        const belly = cut(k.ell(160, 80, 148, 118), k.ell(160, 18, 134, 42), k.box(160, -36, 320, 74, 0));
        k.fill(belly, { c: "#35324a", c2: "#14121f", hi: "#8f90b8", lo: "#07060e", bevel: 90, gloss: 0.35, inkW: 2.6, grain: 0.09 });
        // Rim lip: front half only.
        k.fill(cut(k.ell(160, 18, 148, 48), k.ell(160, 15, 134, 40), k.box(160, -28, 320, 80, 0)), { c: "#4a475f", hi: "#b0b2d8", lo: "#0c0a14", bevel: 10, gloss: 0.8, inkW: 2.4 });
        for (let i = 0; i < 9; i++) { const a = -0.5 + i * 0.125, x = 160 + Math.sin(a * 2.3) * 130, y = 56 + Math.cos(a * 2.3) * 12; k.fill(k.circle(x, y, 4.5), { c: "#6a6888", hi: "#d0d2f0", gloss: 1, inkW: 1.2 }); }
        k.save().at(160, 118, 0.62); M.skull(k, { a: "#c7b090" }); k.restore();
    }, { smooth: true });
    game.assets.paint("logs", 320, 90, (p) => {
        const k = new Painter(p);
        k.fill(k.cap(42, 58, 278, 74, 12, 12), { c: "#5a3a2a", hi: "#a07050", lo: "#1f1420" });
        k.fill(k.cap(50, 76, 270, 54, 12, 12), { c: "#4a2e24", hi: "#90603f", lo: "#1f1420" });
        k.fill(k.ell(278, 74, 7, 12), { c: "#d8a878" });
        k.fill(k.ell(50, 76, 7, 12), { c: "#d8a878" });
    }, { smooth: true });
}
const GLYPH = { ember: "flame", brine: "drop", moss: "leaf", rime: "snow", hex: "eye", gilt: "coin", gunk: "bubble" };
function bead(k, el, motif) {
    const e = ELEMENTS[el];
    k.fill(k.circle(48, 48, 44), { c: e.color, c2: e.dark, hi: e.light, lo: "#120822", bevel: 12, gloss: 0.9, inkW: 2.2 });
    k.fill(k.circle(48, 48, 33), { c: mix(e.dark, "#120822", 0.45), hi: e.dark, inkW: 1.4, bevel: 14 });
    k.save().at(48, 48, 0.6); M[motif]?.(k, {}); k.restore();
}
export const TOKEN_SIZE = 96;

const state = { game: null, queue: [], done: new Set() };
export function cardArt(id) {
    const n = `art_${id}`;
    if (!state.done.has(n)) {
        state.done.add(n);
        const c = CARDS[id];
        state.game.assets.paint(n, ART_W, ART_H, (p) => paintCardArt(p, c), { smooth: true });
    }
    return n;
}
export function tokenArt(id) {
    const n = `tok_${id}`;
    if (!state.done.has(n)) {
        state.done.add(n);
        const c = CARDS[id];
        state.game.assets.paint(n, TOKEN_SIZE, TOKEN_SIZE, (p) => { const k = new Painter(p); bead(k, c.el, c.art[1]); }, { smooth: true });
    }
    return n;
}
export function trinketArt(id) {
    const n = `tr_${id}`;
    if (!state.done.has(n)) {
        state.done.add(n);
        const t = TRINKETS[id];
        state.game.assets.paint(n, 96, 96, (p) => {
            const k = new Painter(p), [m, c] = t.art;
            k.glow(48, 48, 46, c, 0.36);
            k.save().at(48, 48, 0.78); M[m]?.(k, { a: c }); k.restore();
        }, { smooth: true });
    }
    return n;
}
export function motifArt(name) {
    const n = `mo_${name}`;
    if (!state.done.has(n)) {
        state.done.add(n);
        state.game.assets.paint(n, 160, 120, (p) => {
            const k = new Painter(p);
            backdrop(k, { cat: "night", kettle: "hearth", book: "vault", mushroom: "swamp", mirror: "night", rat: "swamp", drop: "sea", star: "stars", hat: "night", flask: "forest", spoon: "hearth", key: "vault", skull: "night", pouch: "vault", feather: "stars", moon: "stars", dice: "night", eye: "night", scales: "vault" }[name] ?? "night", hashStr(name) % 50);
            k.save().at(80, 66, 1.05); M[name]?.(k, {}); k.restore();
            k.vignette(0.5);
        }, { smooth: true });
    }
    return n;
}
/** Paint one queued picture per call, so menus warm the cache without a hitch. */
export function warm(ids) { for (const id of ids) if (!state.done.has(`art_${id}`)) state.queue.push(id); }
export function warmStep() {
    const id = state.queue.shift();
    if (id) { cardArt(id); tokenArt(id); }
}
export function mapIcons(game) {
    const make = (name, motif, c, s = 0.62) => game.assets.paint(`node_${name}`, 96, 96, (p) => {
        const k = new Painter(p);
        k.fill(k.circle(48, 48, 44), { c: "#2a1f42", c2: "#160c26", hi: "#7f6fb0", lo: "#07040f", bevel: 12, inkW: 2.4, ink: "#0c0618" });
        k.fill(cut(k.circle(48, 48, 41), k.circle(48, 48, 37)), { c, hi: "#fff6c0", flat: true, inkW: 0 });
        k.save().at(48, 48, s); M[motif]?.(k, { a: c }); k.restore();
    }, { smooth: true });
    make("fight", "skull", "#e8e0d0"); make("elite", "crown", "#ff5ca8"); make("rest", "flame", "#ffb347"); make("shop", "coin", "#f7c33c"); make("event", "eye", "#b45cff"); make("treasure", "key", "#f7c33c"); make("boss", "bell", "#ff5a2a", 0.7);
}
export function paintAll(game) {
    state.game = game;
    for (const el of Object.keys(ELEMENTS)) frame(game, el);
    foil(game); cauldron(game); mapIcons(game);
    for (const [n, fn] of Object.entries(CREATURES)) game.assets.paint(`foe_${n}`, 200, 200, (p) => fn(new Painter(p)), { smooth: true });
    for (const [n, fn] of Object.entries(WITCH_ART)) game.assets.paint(`witch_${n}`, 220, 280, (p) => fn(new Painter(p)), { smooth: true });
    for (let a = 0; a < 4; a++) game.assets.paint(`bg_${a}`, 300, 420, (p) => tower(new Painter(p), a), { smooth: true });
    for (const [el, m] of Object.entries(GLYPH)) game.assets.paint(`glyph_${el}`, 96, 96, (p) => { const k = new Painter(p); k.save().at(48, 48, 0.78); M[m]?.(k, {}); k.restore(); }, { smooth: true });
    game.assets.paint("wall", 80, 200, (p) => {
        const k = new Painter(p);
        k.wash((u, v, x, y) => { const n = fbm(x * 0.05, y * 0.05, 3); return [26 + n * 22, 18 + n * 16, 40 + n * 22]; });
        for (let r = 0; r < 7; r++) for (let c = -1; c < 3; c++) k.fill(k.box(c * 36 + (r % 2 ? 18 : 0) + 8, r * 28 + 14, 33, 25, 4), { c: "#3a2a4e", hi: "#6a5a80", lo: "#1a1028", bevel: 6, inkW: 0.8, grain: 0.1 });
        k.fill(k.box(40, 100, 15, 62, 7), { c: "#ffb347", c2: "#7a3a7a", flat: true, inkW: 3 });
        k.glow(40, 100, 42, "#ff9a4a", 0.32);
    }, { smooth: true });
    game.assets.paint("heatgem", 64, 64, (p) => { const k = new Painter(p); k.save().at(32, 32, 0.62); M.flame(k); k.restore(); }, { smooth: true });
    game.assets.paint("wardicon", 64, 64, (p) => { const k = new Painter(p); k.fill(k.polygon([[10, 10], [54, 10], [54, 34], [32, 58], [10, 34]]), { c: "#5ab8f0", hi: "#e0f6ff", gloss: 1, bevel: 8, lo: "#1a3a8f" }); }, { smooth: true });
    game.assets.paint("costgem", 64, 64, (p) => { const k = new Painter(p); k.fill(k.circle(32, 32, 28), { c: "#ffb347", c2: "#c8401e", hi: "#fff0b0", lo: "#5a0f2a", gloss: 1, bevel: 10, inkW: 2 }); }, { smooth: true });
    soft(game, "rays", 192, (r, x, y) => { const a = Math.atan2(y, x), q = Math.pow(Math.max(0, Math.sin(a * 7) * 0.5 + Math.sin(a * 11 + 1) * 0.5), 2); return q * (1 - r) * (1 - r) * Math.min(1, r * 6); });
    soft(game, "glow", 64, (r) => (1 - r) * (1 - r));
    soft(game, "puff", 64, (r, x, y) => (1 - r) * 1.1 * (0.75 + 0.25 * Math.sin(x * 7 + y * 5)));
    soft(game, "ringfx", 64, (r) => Math.max(0, 1 - Math.abs(r - 0.82) * 9));
    soft(game, "bub", 32, (r) => (r < 0.82 ? 0.22 + r * r * 0.5 : Math.max(0, (1 - r) * 5.5)));
    soft(game, "cardshadow", 64, (r, x, y) => Math.max(0, 1 - Math.pow(Math.max(Math.abs(x), Math.abs(y)), 3)) * 0.8);
}
