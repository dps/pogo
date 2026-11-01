// Turns everything into sprites. Card art and tokens paint lazily, one at a time, so startup stays quick
// and a phone never pays for a hundred pictures it may not show.
import { Painter, cut, fbm, mix } from "./kit.js";
import { CARDS } from "../data/cards.js";
import { ELEMENTS } from "../data/rules.js";
import { TRINKETS } from "../data/trinkets.js";
import { PAINTED } from "./painted.js";

export const CARD_W = 180, CARD_H = 252;
export const ART_W = 264, ART_H = 198;

const hashStr = (s) => { let h = 5; for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0; return h; };
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
const GLYPH = { ember: "flame", brine: "drop", moss: "leaf", rime: "snow", hex: "eye", gilt: "coin", gunk: "bubble" };
function bead(k, el) {
    const e = ELEMENTS[el];
    k.fill(k.circle(48, 48, 44), { c: e.color, c2: e.dark, hi: e.light, lo: "#120822", bevel: 12, gloss: 0.9, inkW: 2.2 });
    k.fill(k.circle(48, 48, 33), { c: mix(e.dark, "#120822", 0.45), hi: e.dark, inkW: 1.4, bevel: 14 });
}
export const TOKEN_SIZE = 96;

const state = { game: null, queue: [], done: new Set() };
/** Stack painted layers into one sprite. In a browser this uses a 2D canvas; headless runs get a blank of the right name. */
function bake(name, w, h, fn) {
    const g = state.game;
    if (g.headless || typeof document === "undefined") { g.assets.paint(name, 4, 4, () => { }, { smooth: true }); return; }
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d", { willReadFrequently: true });
    fn(c, (sprite, x, y, dw, dh, rot = 0) => {
        const img = g.assets.sprite(sprite).image; if (!img) return;
        c.save(); c.translate(x, y); c.rotate(rot); c.drawImage(img, -dw / 2, -dh / 2, dw, dh); c.restore();
    }, (sprite) => { const a = g.assets.sprite(sprite); c.putImageData(new ImageData(new Uint8ClampedArray(a.data.buffer.slice(0)), a.width, a.height), 0, 0); });
    const d = c.getImageData(0, 0, w, h).data;
    g.assets.paint(name, w, h, (p) => p.data.set(d), { smooth: true });
}
const once = (n, fn) => { if (!state.done.has(n)) { state.done.add(n); fn(); } return n; };
const hashN = (s, n) => hashStr(s) % n;
export function cardArt(id) {
    return once(`art_${id}`, () => {
        const c = CARDS[id], [bg, m1, m2] = c.art, W = ART_W, H = ART_H, h = hashStr(id), tilt = ((h >> 3) % 21 - 10) * 0.02;
        bake(`art_${id}`, W, H, (x, draw) => {
            draw(`cb_${bg}`, W / 2, H / 2, W, H);
            if (m2) draw(`m_${m2}`, W * (h % 2 ? 0.74 : 0.26), H * 0.36, H * 0.6, H * 0.6, -tilt * 3);
            x.fillStyle = "rgba(10,5,20,.34)"; x.beginPath(); x.ellipse(W * (m2 ? (h % 2 ? 0.44 : 0.56) : 0.5), H * 0.86, W * 0.24, H * 0.05, 0, 0, 6.3); x.fill();
            const sz = H * (m2 ? 0.82 : 0.9);
            draw(`m_${m1}`, W * (m2 ? (h % 2 ? 0.44 : 0.56) : 0.5), H * 0.5, sz, sz, tilt);
        });
    });
}
export function tokenArt(id) {
    return once(`tok_${id}`, () => {
        const c = CARDS[id];
        bake(`tok_${id}`, TOKEN_SIZE, TOKEN_SIZE, (x, draw, put) => { put(`bead_${c.el}`); draw(`m_${c.art[1]}`, 48, 48, 62, 62); });
    });
}
export function trinketArt(id) {
    return `m_${TRINKETS[id].art[0]}`;
}
const SCENE = { cat: "night", kettle: "hearth", book: "vault", mushroom: "swamp", mirror: "night", rat: "swamp", drop: "sea", star: "stars", hat: "night", flask: "forest", spoon: "hearth", key: "vault", skull: "night", pouch: "vault", feather: "stars", moon: "stars", dice: "night", eye: "night", scales: "vault" };
export function motifArt(name) {
    return once(`mo_${name}`, () => bake(`mo_${name}`, 320, 240, (x, draw) => { draw(`cb_${SCENE[name] ?? "night"}`, 160, 120, 320, 240); draw(`m_${name}`, 160, 126, 190, 190); }));
}
/** Paint one queued picture per call, so menus warm the cache without a hitch. */
export function warm(ids) { for (const id of ids) if (!state.done.has(`art_${id}`)) state.queue.push(id); }
export function warmStep() {
    const id = state.queue.shift();
    if (id) { cardArt(id); tokenArt(id); }
}
const NODES = { fight: ["skull", "#e8e0d0"], elite: ["crown", "#ff5ca8"], rest: ["flame", "#ffb347"], shop: ["coin", "#f7c33c"], event: ["eye", "#b45cff"], treasure: ["key", "#f7c33c"], boss: ["bell", "#ff5a2a"] };
/** Everything that needs decoded images. Call once assets.ready() has resolved. */
export function bakeAfterLoad(game) {
    for (const [n, [m, c]] of Object.entries(NODES)) {
        game.assets.paint(`disc_${n}`, 96, 96, (p) => {
            const k = new Painter(p);
            k.fill(k.circle(48, 48, 44), { c: "#2a1f42", c2: "#160c26", hi: "#7f6fb0", lo: "#07040f", bevel: 12, inkW: 2.4, ink: "#0c0618" });
            k.fill(cut(k.circle(48, 48, 41), k.circle(48, 48, 37)), { c, hi: "#fff6c0", flat: true, inkW: 0 });
        }, { smooth: true });
        bake(`node_${n}`, 96, 96, (x, draw, put) => { put(`disc_${n}`); draw(`m_${m}`, 48, 48, 66, 66); });
    }
}
export function paintAll(game) {
    state.game = game;
    for (const el of Object.keys(ELEMENTS)) frame(game, el);
    for (const el of Object.keys(ELEMENTS)) game.assets.paint(`bead_${el}`, TOKEN_SIZE, TOKEN_SIZE, (p) => bead(new Painter(p), el));
    foil(game);
    for (const [name, url, w, h] of PAINTED) game.assets.image(name, url, { width: w, height: h });
    const alias = (name, m) => { const a = PAINTED.find((q) => q[0] === `m_${m}`); if (a) game.assets.image(name, a[1], { width: a[2], height: a[3] }); };
    for (const [el, m] of Object.entries(GLYPH)) alias(`glyph_${el}`, m);
    alias("heatgem", "flame");
    game.assets.paint("wall", 80, 200, (p) => {
        const k = new Painter(p);
        k.wash((u, v, x, y) => { const n = fbm(x * 0.05, y * 0.05, 3); return [26 + n * 22, 18 + n * 16, 40 + n * 22]; });
        for (let r = 0; r < 7; r++) for (let c = -1; c < 3; c++) k.fill(k.box(c * 36 + (r % 2 ? 18 : 0) + 8, r * 28 + 14, 33, 25, 4), { c: "#3a2a4e", hi: "#6a5a80", lo: "#1a1028", bevel: 6, inkW: 0.8, grain: 0.1 });
        k.fill(k.box(40, 100, 15, 62, 7), { c: "#ffb347", c2: "#7a3a7a", flat: true, inkW: 3 });
        k.glow(40, 100, 42, "#ff9a4a", 0.32);
    }, { smooth: true });
    game.assets.paint("wardicon", 64, 64, (p) => { const k = new Painter(p); k.fill(k.polygon([[10, 10], [54, 10], [54, 34], [32, 58], [10, 34]]), { c: "#5ab8f0", hi: "#e0f6ff", gloss: 1, bevel: 8, lo: "#1a3a8f" }); }, { smooth: true });
    game.assets.paint("costgem", 64, 64, (p) => { const k = new Painter(p); k.fill(k.circle(32, 32, 28), { c: "#ffb347", c2: "#c8401e", hi: "#fff0b0", lo: "#5a0f2a", gloss: 1, bevel: 10, inkW: 2 }); }, { smooth: true });
    soft(game, "rays", 192, (r, x, y) => { const a = Math.atan2(y, x), q = Math.pow(Math.max(0, Math.sin(a * 7) * 0.5 + Math.sin(a * 11 + 1) * 0.5), 2); return q * (1 - r) * (1 - r) * Math.min(1, r * 6); });
    soft(game, "glow", 64, (r) => (1 - r) * (1 - r));
    soft(game, "puff", 64, (r, x, y) => (1 - r) * 1.1 * (0.75 + 0.25 * Math.sin(x * 7 + y * 5)));
    soft(game, "ringfx", 64, (r) => Math.max(0, 1 - Math.abs(r - 0.82) * 9));
    soft(game, "bub", 32, (r) => (r < 0.82 ? 0.22 + r * r * 0.5 : Math.max(0, (1 - r) * 5.5)));
    soft(game, "cardshadow", 64, (r, x, y) => Math.max(0, 1 - Math.pow(Math.max(Math.abs(x), Math.abs(y)), 3)) * 0.8);
    // Headless runs have no pixels to stack, so these resolve to blanks there.
    if (game.headless) bakeAfterLoad(game);
}
