// All the art, painted in code at low resolution into one atlas, so a frame is a single draw call.
// One palette for everything: warm plum shadows, amber light, a little teal to make it sing.
import { FONT_ROWS } from "./font.js";

export const C = {
    ink: "#170d14", ink2: "#24141f", plum: "#38202e", wine: "#54293a", brown: "#6b4136", tan: "#92623f", sand: "#bd8c58", straw: "#e3bd7c", cream: "#f8e6b8", bone: "#fff6dc",
    ember: "#e2562a", red: "#b52f30", blood: "#7a1c32", amber: "#f59a2e", gold: "#ffce4a", moss: "#3f6b4a", leaf: "#6da856", lime: "#bcdc72",
    deep: "#173848", teal: "#22757c", aqua: "#49bcae", mint: "#b3f0d2", night: "#231f4a", indigo: "#433a86", violet: "#7f64c2", lilac: "#c8a8ea", rose: "#ea7a9a", pink: "#f8b8b4",
    stone: "#574f62", ash: "#837d8c", pale: "#bcb6b8",
};

const rgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const CACHE = new Map();
const parse = (c) => { let v = CACHE.get(c); if (!v) CACHE.set(c, v = rgb(c)); return v; };

/** A tiny canvas with hard pixels and no anti-aliasing. */
export class Cv {
    constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h * 4); }
    px(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this; const o = (y * this.w + x) * 4, v = parse(c); this.d[o] = v[0]; this.d[o + 1] = v[1]; this.d[o + 2] = v[2]; this.d[o + 3] = 255; return this; }
    erase(x, y) { const o = (y * this.w + x) * 4; this.d[o + 3] = 0; return this; }
    on(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0; }
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); return this; }
    oval(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const a = (x - cx) / (rx + 0.3), b = (y - cy) / (ry + 0.3); if (a * a + b * b <= 1) this.px(x, y, c); } return this; }
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const k = n ? i / n : 0; this.px(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k), c); } return this; }
    /** Text pixel maps: each char looks up a color, '.' stays clear. */
    rows(x, y, rows, map) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== "." && r[i] !== " ") this.px(x + i, y + j, map[r[i]] ?? "#ff00ff"); }); return this; }
    /** Ordered dither of one color over a rectangle, for ramps that still read as pixel art. */
    dither(x, y, w, h, c, level) { const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (B[((y + j) & 3) * 4 + ((x + i) & 3)] / 16 < level) this.px(x + i, y + j, c); return this; }
    outline(c = C.ink) {
        const hit = [];
        for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.on(x, y) && (this.on(x - 1, y) || this.on(x + 1, y) || this.on(x, y - 1) || this.on(x, y + 1))) hit.push(x, y);
        for (let i = 0; i < hit.length; i += 2) this.px(hit[i], hit[i + 1], c);
        return this;
    }
    /** Copies the left half onto the right. */
    mirror() { const w = this.w; for (let y = 0; y < this.h; y++) for (let x = 0; x < w >> 1; x++) { const a = (y * w + x) * 4, b = (y * w + w - 1 - x) * 4; for (let k = 0; k < 4; k++) this.d[b + k] = this.d[a + k]; } return this; }
    blit(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const o = (j * src.w + i) * 4; if (!src.d[o + 3]) continue; const q = ((y + j) * this.w + x + i) * 4; if (x + i < 0 || y + j < 0 || x + i >= this.w || y + j >= this.h) continue; this.d[q] = src.d[o]; this.d[q + 1] = src.d[o + 1]; this.d[q + 2] = src.d[o + 2]; this.d[q + 3] = 255; } return this; }
}

// ---------- the atlas ----------
const SIZE = 1024;
export const atlas = new Cv(SIZE, SIZE);
export const SPR = {};
let cx = 1, cy = 1, shelf = 0;
/** Paints `frames` copies through fn, side by side in the atlas. */
export function make(name, w, h, frames, fn) {
    const total = frames * (w + 1);
    if (cx + total > SIZE) { cx = 1; cy += shelf + 1; shelf = 0; }
    if (cy + h >= SIZE) throw new Error("atlas full at " + name);
    SPR[name] = { x: cx, y: cy, w, h, frames };
    for (let f = 0; f < frames; f++) { const c = new Cv(w, h); fn(c, f); atlas.blit(c, cx + f * (w + 1), cy); }
    cx += total; shelf = Math.max(shelf, h);
}
const hash2 = (x, y, s = 0) => { let h = Math.imul(x * 73 + y * 151 + s * 19 + 7, 2654435761); h ^= h >>> 15; return (Math.imul(h, 1540483477) >>> 0) / 4294967296; };

// ---------- rooms ----------
export const THEMES = {
    cata: { floor: ["#2c1a26", "#463039", "#55393f", C.tan], cap: [C.wine, C.brown, C.tan], face: [C.ink2, C.plum, C.wine], grout: C.ink2, deco: "bone", ambient: [34, 16, 30], base: 0.42, sky: "#120a10", torch: [255, 150, 60] },
    bath: { floor: [C.deep, "#1d6b75", C.aqua, C.mint], cap: [C.ash, C.pale, C.bone], face: [C.deep, C.teal, C.aqua], grout: C.ink2, deco: "tile", ambient: [10, 26, 48], base: 0.46, sky: "#0b141c", torch: [120, 240, 220] },
    fire: { floor: [C.ink2, "#34202a", "#452630", C.blood], cap: ["#5a2a30", "#7a3a3a", "#b4604a"], face: [C.ink, C.ink2, C.plum], grout: C.ink, deco: "ember", ambient: [46, 12, 18], base: 0.46, sky: "#160808", torch: [255, 110, 40] },
    hex: { floor: [C.night, C.indigo, C.wine, C.gold], cap: [C.indigo, C.violet, C.lilac], face: [C.night, C.indigo, C.violet], grout: C.ink, deco: "carpet", ambient: [22, 16, 54], base: 0.44, sky: "#0d0a1e", torch: [255, 190, 110] },
    home: { floor: [C.ink2, C.plum, C.moss, C.leaf], cap: [C.stone, C.ash, C.pale], face: [C.ink2, C.plum, C.stone], grout: C.ink, deco: "moss", ambient: [14, 26, 30], base: 0.42, sky: "#0a0d10", torch: [150, 255, 150] },
};
for (const th of Object.values(THEMES)) th.sky = `#${th.ambient.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const T = 24;

function paintFloor(c, th, key, v) {
    const [a, b, e, f] = th.floor, g = th.grout;
    if (key === "bath") { // little mosaic tiles
        c.rect(0, 0, T, T, b);
        for (let y = 0; y < T; y += 6) for (let x = 0; x < T; x += 6) { const r = hash2(x, y, v); c.rect(x, y, 5, 5, r < 0.12 ? "#2a8a8c" : r < 0.3 ? "#1b6470" : b); }
        c.rect(0, 0, T, 1, a); c.rect(0, 0, 1, T, a);
        return;
    }
    if (key === "hex") { // the hotel carpet: red diamonds on purple
        c.rect(0, 0, T, T, b);
        for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const d = Math.abs(x - 12) + Math.abs(y - 12); if (d === 10 || d === 3) c.px(x, y, e); else if (d < 2) c.px(x, y, f); else if ((x + y) % 7 === 0 && d > 11) c.px(x, y, a); }
        return;
    }
    // Flagstones
    c.rect(0, 0, T, T, a);
    const split = 8 + (v * 5) % 9;
    const stone = (x, y, w, h) => {
        c.rect(x, y, w - 1, h - 1, b);
        c.rect(x, y, w - 1, 1, e);
        for (let k = 0; k < 5; k++) { const px = x + 1 + hash2(k, v, x + y) * (w - 3), py = y + 2 + hash2(v, k, y) * (h - 4); c.px(px, py, hash2(k, k, v) > 0.5 ? a : e); }
    };
    if (v % 2) { stone(0, 0, T, 24); c.rect(0, split, T, 1, a); }
    else { stone(0, 0, split + 2, T); stone(split + 2, 0, T - split - 2, T); }
    if (th.deco === "bone" && v === 2) { c.line(6, 17, 11, 15, C.cream); c.px(5, 16, C.cream); c.px(5, 18, C.cream); c.px(12, 14, C.cream); c.px(12, 16, C.cream); }
    if (th.deco === "bone" && v === 3) { c.rect(14, 5, 5, 3, C.straw); c.rect(15, 8, 3, 1, C.straw); c.px(15, 6, C.ink2); c.px(17, 6, C.ink2); }
    if (th.deco === "ember") { const n = 3 + v; for (let k = 0; k < n; k++) { const x = hash2(k, v, 4) * 22, y = hash2(v, k, 8) * 22; c.line(x, y, x + 3, y + hash2(k, 1, v) * 3, k % 2 ? C.ember : C.blood); } }
    if (th.deco === "moss" && v % 2) { for (let k = 0; k < 16; k++) c.px(hash2(k, v, 2) * 12 + 4, hash2(v, k, 3) * 10 + 12, k % 3 ? C.moss : C.leaf); }
    if (v === 1) c.line(12, 4, 16, 9, g).line(16, 9, 14, 13, g);
}

function makeRoom(key) {
    const th = THEMES[key], [ca, cb, cc] = th.cap, [fa, fb, fc] = th.face;
    make(`floor_${key}`, T, T, 4, (c, v) => paintFloor(c, th, key, v));
    // A block of wall: lit cap on top, shaded face below. 30 tall, so it leans a little into the row above.
    make(`wall_${key}`, T, 30, 2, (c, v) => {
        c.rect(0, 0, T, 16, cb);
        c.rect(0, 0, T, 1, cc); c.rect(0, 15, T, 1, ca); c.rect(0, 0, 1, 16, cc); c.rect(T - 1, 0, 1, 16, ca);
        if (key === "cata" || key === "home" || key === "fire") for (let k = 0; k < 7; k++) c.rect(2 + hash2(k, v, 3) * 18, 2 + hash2(v, k, 5) * 11, 2 + (k & 1) * 2, 1, k % 3 ? ca : cc);
        if (key === "bath") { c.rect(2, 2, 20, 12, cc); c.rect(3, 3, 18, 10, cb); for (let y = 5; y < 12; y += 3) c.rect(3, y, 18, 1, ca); }
        if (key === "hex") { c.rect(3, 3, 18, 10, ca); c.rect(5, 5, 14, 6, cb); c.px(12, 8, C.gold); }
        c.rect(0, 16, T, 14, fb);
        for (let y = 16; y < 30; y += 5) { c.rect(0, y, T, 1, fa); for (let x = (y % 2 ? 0 : 6) + (v ? 3 : 0); x < T; x += 12) c.rect(x, y, 1, 5, fa); }
        c.rect(0, 16, T, 1, fc); c.rect(0, 28, T, 2, fa);
        c.dither(0, 22, T, 8, fa, 0.5);
    });
    // Back wall, tall enough to hang things on.
    make(`back_${key}`, T, 36, 2, (c, v) => {
        c.rect(0, 0, T, 36, fb);
        if (key === "bath") { for (let y = 0; y < 36; y += 6) for (let x = 0; x < T; x += 6) { c.rect(x, y, 5, 5, hash2(x, y, v) < 0.5 ? C.aqua : C.teal); } c.rect(0, 12, T, 2, C.bone); }
        else if (key === "hex") { for (let x = 0; x < T; x += 6) c.rect(x, 0, 3, 36, C.wine); for (let y = 3; y < 26; y += 10) { c.px(1 + (y % 4), y, C.gold); c.px(13, y + 4, C.gold); } c.rect(0, 26, T, 2, C.gold); c.rect(0, 28, T, 8, C.ink2); c.rect(0, 28, T, 1, C.plum); }
        else for (let y = 0; y < 36; y += 6) { c.rect(0, y, T, 1, fa); for (let x = (y % 12 ? 0 : 6) + v * 3; x < T; x += 12) { c.rect(x, y, 1, 6, fa); if (hash2(x, y, v) > 0.6) c.rect(x + 2, y + 2, 7, 1, fc); } }
        c.dither(0, 30, T, 6, C.ink, 0.45);
    });
    make(`pit_${key}`, T, T, 2, (c, v) => {
        const deep = key === "bath" ? C.deep : key === "hex" ? C.night : C.ink;
        c.rect(0, 0, T, T, deep);
        if (key === "bath") { c.dither(0, 6, T, 18, C.ink, 0.5); for (let k = 0; k < 4; k++) { const x = 3 + hash2(k, 2, 7) * 14, y = 8 + k * 4; c.rect(x + (v ? 2 : 0), y, 5, 1, C.teal); } }
        else c.dither(0, 8, T, 16, C.ink, 0.9);
        if (v === 0 || key === "bath") { c.rect(0, 0, T, 6, key === "bath" ? C.teal : th.face[1]); c.rect(0, 5, T, 1, C.ink); for (let x = 2; x < T; x += 7) c.rect(x, 1, 1, 4, th.face[0]); c.rect(0, 0, T, 1, th.grout); }
    });
    make(`rubble_${key}`, T, T, 1, (c) => { paintFloor(c, th, key, 0); c.dither(0, 0, T, T, th.floor[0], 0.35); for (let k = 0; k < 12; k++) { const x = hash2(k, 3) * 20 + 1, y = hash2(3, k) * 20 + 1; c.rect(x, y, 3, 2, k % 2 ? C.tan : C.brown); c.px(x, y, C.sand); } });
    make(`ice_${key}`, T, T, 1, (c) => {
        c.rect(0, 0, T, T, key === "bath" ? C.aqua : C.mint);
        c.dither(0, 0, T, T, C.mint, 0.3);
        c.line(3, 15, 11, 6, C.bone); c.line(6, 19, 18, 7, C.bone); c.line(14, 21, 20, 15, C.mint);
        c.rect(0, 0, T, 1, C.bone); c.rect(0, 23, T, 1, C.teal); c.rect(23, 0, 1, T, C.teal);
    });
}
for (const k of Object.keys(THEMES)) makeRoom(k);

make("lava", T, T, 4, (c, f) => {
    c.rect(0, 0, T, T, C.ember);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const w = Math.sin((x + f * 6) * 0.52) + Math.sin((y - f * 6) * 0.52 + x * 0.26);
        if (w > 1) c.px(x, y, C.gold); else if (w > 0.2) c.px(x, y, C.amber); else if (w < -1) c.px(x, y, C.red);
    }
    c.rect(0, 0, T, 2, C.blood); c.dither(0, 2, T, 3, C.ink2, 0.4);
});
make("spike", T, T, 3, (c, f) => { // 0 down, 1 warning, 2 up
    c.rect(2, 2, 20, 20, C.ink2); c.rect(2, 2, 20, 1, C.ink); c.rect(2, 21, 20, 1, C.stone); c.rect(21, 2, 1, 20, C.stone);
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
        const px = 5 + x * 6, py = 8 + y * 6;
        c.rect(px, py, 3, 2, C.ink);
        if (f === 1) { c.px(px + 1, py - 1, C.ember); c.px(px + 1, py, C.gold); }
        if (f === 2) { c.rect(px, py - 2, 3, 3, C.pale); c.rect(px + 1, py - 5, 1, 3, C.bone); c.rect(px + 2, py - 3, 1, 4, C.ash); c.px(px, py + 1, C.ash); }
    }
});
make("plate", T, T, 2, (c, f) => {
    c.rect(3, 3, 18, 18, C.ink); c.rect(4 + f, 4 + f, 16 - f * 2, 16 - f * 2, f ? C.tan : C.sand); c.rect(4 + f, 4 + f, 16 - f * 2, 1, f ? C.sand : C.gold);
    c.rect(4, 19, 16, 1, C.brown); c.rect(9, 9, 6, 6, f ? C.brown : C.tan); c.px(11, 11, C.gold); c.px(12, 12, C.gold);
});
make("door", T, 30, 2, (c, f) => { // an iron portcullis, shut then open
    if (f === 0) {
        c.rect(0, 0, T, 30, C.ink2);
        for (let x = 1; x < T; x += 5) { c.rect(x, 0, 3, 30, C.stone); c.rect(x, 0, 1, 30, C.ash); }
        for (const y of [8, 18]) { c.rect(0, y, T, 3, C.stone); c.rect(0, y, T, 1, C.pale); }
        c.rect(0, 27, T, 3, C.ink);
    } else { c.rect(0, 0, 2, 12, C.stone); c.rect(22, 0, 2, 12, C.stone); c.rect(0, 0, T, 4, C.ash); for (let x = 1; x < T; x += 5) { c.rect(x, 4, 3, 2, C.stone); c.px(x + 1, 6, C.ash); } }
});
make("portal", T, T, 4, (c, f) => {
    c.oval(11.5, 11.5, 10, 10, C.gold).oval(11.5, 11.5, 9, 9, C.ink);
    c.oval(11.5, 11.5, 8, 8, C.night);
    for (let k = 0; k < 40; k++) { const a = k * 0.42 + f * 0.8, r = k * 0.2; c.px(11.5 + Math.cos(a) * r, 11.5 + Math.sin(a) * r, k % 3 ? C.violet : C.lilac); }
});
make("exit", T + 12, 40, 3, (c, f) => { // 0 locked, 1 open. Frame 2 is the mat under it.
    const W = T + 12;
    if (f === 2) { return; }
    c.rect(2, 4, W - 4, 36, C.ink);
    c.rect(4, 6, W - 8, 34, f ? C.gold : C.brown);
    if (f === 0) {
        c.rect(5, 7, W - 10, 33, C.brown);
        c.rect(5, 7, 12, 33, C.tan); c.rect(19, 7, 12, 33, C.tan); c.rect(17, 7, 2, 33, C.ink2);
        for (const y of [14, 28]) { c.rect(5, y, W - 10, 2, C.stone); c.rect(5, y, W - 10, 1, C.pale); }
        c.rect(14, 19, 8, 8, C.gold); c.rect(14, 19, 8, 1, C.bone); c.rect(16, 15, 4, 4, C.ink); c.rect(17, 16, 2, 3, C.gold); c.rect(17, 21, 2, 3, C.ink);
    } else {
        c.dither(5, 7, W - 10, 33, C.bone, 0.55);
        c.rect(8, 12, 20, 2, C.tan); c.rect(8, 22, 20, 2, C.tan); // shelves of tat
        c.rect(10, 9, 3, 3, C.rose); c.rect(15, 8, 3, 4, C.aqua); c.rect(21, 9, 4, 3, C.ember); c.rect(11, 19, 4, 3, C.violet); c.rect(19, 18, 3, 4, C.leaf);
    }
    c.rect(0, 0, W, 5, C.ink); c.rect(1, 1, W - 2, 3, C.amber); c.rect(1, 1, W - 2, 1, C.gold);
});
make("mat", T, T, 1, (c) => { c.rect(3, 2, 18, 20, C.red); c.rect(4, 3, 16, 18, C.ember); c.dither(4, 3, 16, 18, C.red, 0.5); c.rect(3, 2, 18, 1, C.gold); c.rect(3, 21, 18, 1, C.gold); });
make("torch", 12, 20, 4, (c, f) => {
    c.rect(4, 10, 4, 3, C.tan); c.rect(5, 13, 2, 7, C.brown); c.rect(3, 9, 6, 2, C.stone);
    const j = [0, 1, 0, -1][f];
    c.oval(6 + j / 2, 6, 3, 5, C.ember); c.oval(6 + j, 7, 2, 3.5, C.amber); c.oval(6, 8, 1, 2, C.gold); c.px(6 + j, 1, C.amber);
});
make("banner", 14, 24, 3, (c, f) => {
    const col = [C.red, C.teal, C.violet][f];
    c.rect(0, 0, 14, 2, C.gold); c.rect(1, 2, 12, 18, col); c.px(1, 20, col); for (let x = 1; x < 13; x++) c.rect(x, 20, 1, 1 + Math.abs(x - 7) % 4, col);
    c.oval(6.5, 9, 3, 3, C.bone); c.rect(5, 11, 4, 3, C.bone); c.px(5, 9, C.ink); c.px(8, 9, C.ink); c.rect(1, 2, 1, 18, C.ink2);
});
make("sign", 34, 14, 1, (c) => { c.rect(0, 0, 34, 14, C.ink); c.rect(1, 1, 32, 12, C.tan); c.rect(1, 1, 32, 1, C.sand); c.rect(2, 2, 2, 2, C.ink2); });

// ---------- props ----------
const tag = (c, x, y, col) => { c.rect(x, y, 4, 3, C.cream); c.px(x + 1, y + 1, col); c.px(x + 2, y + 1, col); };
make("crate", T, 28, 1, (c) => { // a suitcase, because of course
    c.rect(1, 8, 22, 18, C.tan); c.rect(1, 8, 22, 2, C.sand); c.rect(1, 24, 22, 2, C.brown); c.rect(1, 8, 2, 18, C.sand); c.rect(21, 8, 2, 18, C.brown);
    c.rect(7, 4, 10, 2, C.ink2); c.rect(7, 4, 2, 5, C.ink2); c.rect(15, 4, 2, 5, C.ink2);
    for (const x of [5, 16]) { c.rect(x, 8, 3, 18, C.brown); c.rect(x + 1, 13, 1, 2, C.gold); }
    c.rect(10, 15, 5, 3, C.rose); c.rect(11, 16, 3, 1, C.bone); tag(c, 17, 19, C.teal);
    c.outline();
});
make("keg", T, 28, 2, (c, f) => {
    c.oval(11.5, 16, 10, 10, C.tan); c.rect(2, 8, 20, 16, C.tan); c.rect(4, 6, 16, 20, C.tan);
    for (let x = 3; x < 22; x += 4) c.rect(x, 6, 1, 20, C.brown);
    c.rect(2, 10, 20, 2, C.ash); c.rect(2, 20, 20, 2, C.ash); c.rect(2, 10, 20, 1, C.pale);
    c.rect(8, 13, 8, 6, C.cream); c.rect(10, 14, 4, 4, C.red); c.px(11, 15, C.gold); c.px(12, 16, C.gold);
    c.rect(11, 2, 2, 5, C.ink2); if (f) { c.rect(10, 0, 3, 3, C.gold); c.px(13, 1, C.amber); }
    c.outline();
});
make("coin", 13, 13, 4, (c, f) => {
    const rx = [5, 4, 2, 4][f];
    c.oval(6, 6, rx, 5, C.gold); if (rx > 2) c.oval(6, 6, rx - 2, 3, C.amber); c.rect(6, 3, 1, 7, C.bone); if (rx > 2) c.oval(5, 4, 1, 1, C.bone);
    c.outline(C.ink2);
});
make("ticket", 20, 14, 2, (c, f) => {
    c.rect(1, 2, 18, 10, f ? C.bone : C.cream); c.rect(1, 2, 18, 1, C.bone); c.rect(1, 10, 18, 2, C.straw);
    for (const y of [4, 6, 8]) c.px(13, y, C.tan);
    c.rect(4, 5, 7, 1, C.red); c.rect(4, 7, 5, 1, C.tan); c.rect(15, 5, 2, 4, C.rose);
    c.erase(1, 6); c.erase(1, 7); c.erase(18, 6); c.erase(18, 7);
    c.outline(C.ink2);
});
make("tea", 17, 15, 1, (c) => {
    c.rect(2, 4, 11, 8, C.bone); c.rect(2, 4, 11, 2, C.amber); c.rect(3, 5, 9, 1, C.tan); c.rect(4, 12, 7, 2, C.pale);
    c.rect(13, 6, 3, 1, C.bone); c.rect(13, 9, 3, 1, C.bone); c.rect(15, 6, 1, 4, C.bone); c.rect(5, 7, 3, 3, C.rose);
    c.px(5, 1, C.pale); c.px(6, 2, C.pale); c.px(9, 0, C.pale); c.px(8, 2, C.pale);
    c.outline(C.ink2);
});
make("pillar", T, 36, 3, (c, f) => { // marble bath pillar, cracked and ready to go
    c.rect(1, 30, 22, 6, C.pale); c.rect(1, 30, 22, 1, C.bone); c.rect(1, 2, 22, 5, C.pale); c.rect(1, 2, 22, 1, C.bone);
    c.rect(4, 7, 16, 23, C.pale); c.rect(4, 7, 3, 23, C.bone); c.rect(16, 7, 4, 23, C.ash);
    for (let x = 8; x < 16; x += 3) c.rect(x, 7, 1, 23, C.ash);
    c.line(14, 8, 9, 15, C.ink2).line(9, 15, 15, 21, C.ink2).line(15, 21, 11, 29, C.ink2); c.line(9, 15, 5, 17, C.ink2);
    c.outline();
});
make("snooze", T, 22, 2, (c, f) => {
    c.rect(1, 14, 22, 7, C.stone); c.rect(1, 14, 22, 1, C.ash);
    c.rect(4, 6 + f * 4, 16, 9 - f * 4, C.gold); c.rect(4, 6 + f * 4, 16, 2, C.bone); c.rect(4, 13, 16, 2, C.amber);
    c.outline();
});
make("mark", T, T, 2, (c, f) => {
    const col = f ? C.gold : C.ember;
    for (const [x, y, a, b] of [[2, 2, 1, 1], [21, 2, -1, 1], [2, 21, 1, -1], [21, 21, -1, -1]]) { c.rect(Math.min(x, x + 5 * a), y, 6, 1, col); c.rect(x, Math.min(y, y + 5 * b), 1, 6, col); }
    c.oval(11.5, 11.5, 3, 3, col); c.oval(11.5, 11.5, 2, 2, C.ink);
});
make("shadow", 22, 7, 1, (c) => c.oval(10.5, 3, 10, 3, C.ink));
make("pix", 3, 3, 1, (c) => c.rect(0, 0, 3, 3, "#ffffff"));
make("tint", 3, 3, 1, (c) => c.rect(0, 0, 3, 3, "#ffffff"));
make("corner", T, T, 1, (c) => { for (const [x, y, a, b] of [[1, 1, 1, 1], [22, 1, -1, 1], [1, 22, 1, -1], [22, 22, -1, -1]]) { c.rect(Math.min(x, x + 3 * a), y, 4, 1, "#ffffff"); c.rect(x, Math.min(y, y + 3 * b), 1, 4, "#ffffff"); } });

// ---------- keepers ----------
const eye = (c, x, y, col = C.ink) => c.px(x, y, col);
function legs(c, f, skin, sock, shoe, cx = 12) {
    const y = 18;
    c.rect(cx - 3, y, 2, 4, skin); c.rect(cx + 1, y, 2, 4, skin);
    c.rect(cx - 3, y + 2, 2, 2, sock); c.rect(cx + 1, y + 2, 2, 2, sock);
    c.rect(cx - 4, y + 4, 3, 1, shoe); c.rect(cx + 1, y + 4, 3, 1, shoe);
}
function shirt(c, a, b, flower, y0 = 10, cx = 12) {
    c.rect(cx - 4, y0, 8, 7, a); c.rect(cx - 5, y0 + 1, 1, 4, a); c.rect(cx + 4, y0 + 1, 1, 4, a);
    c.rect(cx - 4, y0 + 6, 8, 1, b); c.rect(cx + 2, y0 + 1, 2, 5, b);
    if (flower) { c.px(cx - 3, y0 + 2, flower); c.px(cx, y0 + 4, flower); c.px(cx + 2, y0 + 1, flower); c.px(cx - 2, y0 + 5, flower); }
}
const KEEPERS = {
    mort(c, f) {
        const b = f ? 1 : 0;
        legs(c, f, C.pale, C.bone, C.brown);
        c.rect(8, 16, 8, 3, C.tan);
        shirt(c, C.teal, C.deep, C.gold, 10);
        c.rect(7, 12, 2, 6, C.teal); c.rect(7, 16, 2, 2, C.pale); // arm
        c.rect(15, 12, 2, 5, C.teal); c.rect(15, 16, 2, 2, C.pale);
        c.line(9, 10, 13, 15, C.ink2); c.rect(11, 14, 4, 3, C.ink2); c.px(13, 15, C.aqua); // camera
        c.oval(12, 7 + b, 4, 3.5, C.pale); c.rect(9, 8 + b, 7, 2, C.ash);
        c.rect(14, 7 + b, 3, 2, C.pale); c.px(16, 8 + b, C.ash); // long nose
        eye(c, 11, 7 + b); eye(c, 14, 7 + b); c.px(11, 8 + b, C.stone); c.px(14, 8 + b, C.stone); c.rect(11, 10 + b, 3, 1, C.ink2);
        c.rect(5, 4 + b, 15, 2, C.straw); c.rect(8, 1 + b, 9, 3, C.straw); c.rect(8, 3 + b, 9, 1, C.red); c.rect(5, 5 + b, 15, 1, C.sand); c.rect(9, 1 + b, 7, 1, C.cream);
    },
    dolores(c, f) {
        const b = f ? 1 : 0;
        c.line(19, 2, 19, 16, C.tan); c.rect(17, 16, 5, 5, C.ash); c.rect(17, 16, 5, 1, C.pale); c.rect(18, 1, 3, 1, C.brown); // shovel
        legs(c, f, C.tan, C.moss, C.ink2, 11);
        c.rect(6, 10, 10, 8, C.moss); c.rect(6, 15, 10, 3, C.ember); c.px(8, 16, C.gold); c.px(12, 16, C.gold); c.rect(6, 10, 10, 1, C.leaf);
        c.rect(5, 11, 2, 6, C.moss); c.rect(15, 11, 3, 2, C.moss); c.rect(17, 12, 2, 2, C.tan);
        c.oval(11, 6 + b, 4.5, 4, C.sand); c.rect(7, 2 + b, 9, 3, C.rose); c.rect(6, 4 + b, 11, 1, C.rose); c.px(16, 2 + b, C.rose); c.px(17, 1 + b, C.rose);
        c.rect(7, 6 + b, 4, 2, C.ink); c.rect(12, 6 + b, 4, 2, C.ink); c.rect(7, 6 + b, 9, 1, C.ink); c.px(8, 6 + b, C.aqua); c.px(13, 6 + b, C.aqua);
        c.rect(9, 9 + b, 4, 1, C.blood);
    },
    rattle(c, f) {
        const b = f ? 1 : 0;
        const bone = C.bone;
        c.rect(9, 17, 2, 6, bone); c.rect(13, 17, 2, 6, bone); c.rect(8, 22, 3, 1, C.aqua); c.rect(13, 22, 3, 1, C.aqua);
        c.oval(12, 15, 7, 2.5, C.rose); c.rect(6, 14, 12, 2, C.pink); c.oval(12, 15, 4, 1, C.ink2); c.px(6, 15, C.bone); c.px(18, 15, C.bone); // rubber ring
        c.rect(11, 9, 2, 6, bone); for (const y of [10, 12]) c.rect(9, y, 6, 1, bone);
        c.rect(6, 10, 2, 7, bone); c.rect(16, 10, 2, 7, bone); c.rect(6, 9, 13, 1, bone);
        c.oval(12, 6 + b, 4.5, 3.5, bone); c.rect(10, 9 + b, 5, 1, bone); c.rect(10, 5 + b, 2, 2, C.ink); c.rect(13, 5 + b, 2, 2, C.ink); c.px(12, 8 + b, C.ink); for (let x = 10; x < 15; x += 2) c.px(x, 9 + b, C.ink);
        c.rect(7, 3 + b, 11, 1, C.aqua); c.rect(8, 1 + b, 9, 2, C.aqua); c.rect(8, 1 + b, 9, 1, C.mint); c.rect(5, 4 + b, 3, 1, C.aqua);
    },
    gladys(c, f) {
        const b = f ? 1 : 0;
        for (let y = 7; y < 21; y++) { const w = 4 + Math.min(y - 7, 6) * 0.5; c.rect(12 - w, y, w * 2, 1, C.lilac); }
        for (let x = 6; x < 18; x += 3) { c.rect(x + (f ? 1 : 0), 21, 2, 2, C.lilac); }
        c.dither(7, 12, 11, 9, C.violet, 0.4);
        c.oval(12, 6 + b, 4.5, 4, C.mint); c.oval(9, 3 + b, 2, 2, C.rose); c.oval(13, 2 + b, 2, 2, C.pink); c.oval(16, 4 + b, 2, 2, C.rose); // curlers
        c.rect(8, 6 + b, 3, 3, C.bone); c.rect(13, 6 + b, 3, 3, C.bone); c.rect(11, 7 + b, 2, 1, C.gold); c.px(9, 7 + b, C.ink); c.px(14, 7 + b, C.ink); c.rect(8, 6 + b, 3, 1, C.gold); c.rect(13, 6 + b, 3, 1, C.gold);
        c.rect(10, 10 + b, 4, 1, C.wine);
        c.rect(15, 13, 5, 5, C.red); c.rect(16, 11, 3, 2, C.gold); c.px(17, 12, C.ink); c.rect(15, 13, 5, 1, C.ember); c.px(17, 15, C.gold);
    },
};
for (const k of Object.keys(KEEPERS)) make(`k_${k}`, T, T, 2, (c, f) => { KEEPERS[k](c, f); c.outline(); });
make("lantern", 9, 11, 2, (c, f) => { c.rect(3, 0, 3, 1, C.ash); c.rect(2, 1, 5, 1, C.stone); c.rect(1, 2, 7, 7, C.ink2); c.rect(2, 3, 5, 5, f ? C.gold : C.amber); c.rect(3, 4, 3, 3, C.bone); c.rect(2, 9, 5, 1, C.stone); c.outline(); });

// ---------- monsters ----------
const MONS = {
    ghoul(c, f) { // tour guide of the damned
        const b = f ? 1 : 0;
        c.rect(19, 2, 1, 15, C.tan); c.rect(14, 2, 5, 4, C.ember); c.rect(14, 2, 5, 1, C.amber); c.px(13, 3, C.ember); c.px(13, 4, C.ember); // flag
        c.rect(8, 18, 3, 5, C.moss); c.rect(13, 18, 3, 5, C.moss); c.rect(7, 22, 4, 1, C.ink2); c.rect(13, 22, 4, 1, C.ink2);
        c.rect(6, 11, 12, 8, C.gold); c.rect(6, 11, 12, 1, C.bone); c.rect(6, 17, 12, 2, C.amber); c.rect(11, 11, 2, 8, C.ember); // hi-vis tabard
        c.rect(4, 12, 3, 6, C.leaf); c.rect(4, 17, 3, 2, C.lime); c.rect(17, 12, 3, 5, C.leaf); c.rect(17, 14, 3, 2, C.lime);
        c.oval(11.5, 7 + b, 6, 5, C.leaf); c.rect(7, 10 + b, 10, 2, C.lime); c.oval(11.5, 6 + b, 5, 3, C.lime);
        c.rect(7, 5 + b, 4, 4, C.bone); c.rect(13, 5 + b, 4, 4, C.bone); c.rect(9, 6 + b, 2, 2, C.ink); c.rect(13, 7 + b, 2, 2, C.ink);
        c.rect(8, 10 + b, 8, 2, C.blood); c.px(9, 10 + b, C.bone); c.px(12, 11 + b, C.bone); c.px(14, 10 + b, C.bone);
        c.rect(6, 2 + b, 11, 2, C.red); c.rect(7, 1 + b, 9, 1, C.red); c.rect(14, 3 + b, 6, 1, C.blood);
    },
    spitter(c, f) { // gargoyle. frames: down, side, up
        c.rect(5, 19, 14, 4, C.ash); c.rect(5, 19, 14, 1, C.pale); c.rect(7, 16, 10, 3, C.stone);
        c.oval(12, 10, 7, 7, C.ash); c.rect(3, 6, 3, 8, C.stone); c.rect(18, 6, 3, 8, C.stone); c.px(4, 5, C.stone); c.px(19, 5, C.stone);
        c.rect(7, 2, 2, 3, C.pale); c.rect(15, 2, 2, 3, C.pale); c.oval(11, 8, 5, 3, C.pale);
        if (f === 0) { c.rect(7, 7, 3, 3, C.ember); c.rect(14, 7, 3, 3, C.ember); c.px(8, 8, C.gold); c.px(15, 8, C.gold); c.oval(12, 13, 4, 3, C.ink); c.rect(10, 11, 1, 2, C.bone); c.rect(13, 11, 1, 2, C.bone); c.rect(10, 15, 4, 1, C.lime); }
        if (f === 1) { c.rect(12, 7, 3, 3, C.ember); c.px(14, 8, C.gold); c.rect(14, 11, 7, 5, C.ash); c.oval(19, 13, 2, 2, C.ink); c.rect(14, 11, 7, 1, C.pale); c.px(20, 15, C.lime); }
        if (f === 2) { c.rect(7, 2, 10, 6, C.pale); c.oval(12, 4, 3, 2, C.ink); c.px(12, 3, C.lime); c.rect(5, 9, 14, 2, C.stone); }
    },
    crab(c, f) { // shower cap, attitude
        const o = f ? 1 : -1;
        for (const x of [4, 7, 15, 18]) { c.line(x, 15, x - (x < 12 ? 2 : -2), 21, C.blood); }
        c.oval(12, 14, 9, 6, C.ember); c.oval(12, 12, 8, 4, C.amber); c.rect(5, 17, 14, 2, C.red);
        c.oval(2.5, 11 + o, 2.5, 3, C.ember); c.oval(21.5, 11 + o, 2.5, 3, C.ember); c.rect(1, 7 + o, 1, 3, C.ember); c.rect(3, 7 + o, 1, 3, C.ember); c.rect(20, 7 + o, 1, 3, C.ember); c.rect(22, 7 + o, 1, 3, C.ember);
        c.rect(9, 6, 1, 4, C.red); c.rect(14, 6, 1, 4, C.red); c.rect(7, 3, 4, 4, C.bone); c.rect(13, 3, 4, 4, C.bone); c.rect(9, 4, 2, 2, C.ink); c.rect(13, 4, 2, 2, C.ink);
        c.rect(9, 15, 6, 1, C.ink); c.px(8, 14, C.ink); c.px(15, 14, C.ink);
    },
    mirror(c, f) { // a vanity mirror with a very bad reflection
        const b = f ? 1 : 0;
        c.rect(8, 20, 2, 3, C.tan); c.rect(14, 20, 2, 3, C.tan); c.rect(7, 22, 3, 1, C.gold); c.rect(14, 22, 3, 1, C.gold);
        c.oval(12, 11 + b, 8, 10, C.gold); c.oval(12, 11 + b, 7, 9, C.amber); c.oval(12, 11 + b, 6, 8, C.indigo); c.oval(11, 9 + b, 4, 5, C.violet);
        c.line(7, 8 + b, 11, 3 + b, C.lilac); c.line(8, 10 + b, 10, 8 + b, C.lilac);
        c.rect(9, 9 + b, 2, 3, C.bone); c.rect(13, 9 + b, 2, 3, C.bone); c.px(10, 10 + b, C.ink); c.px(13, 10 + b, C.ink);
        c.rect(9, 15 + b, 6, 1, C.bone); c.px(10, 15 + b, C.ink); c.px(12, 15 + b, C.ink); c.px(14, 15 + b, C.ink); c.px(8, 14 + b, C.bone); c.px(15, 14 + b, C.bone);
    },
    bull(c, f) { // a poolside minotaur in a whistle
        const b = f ? 1 : 0;
        c.rect(6, 20, 4, 3, C.ink2); c.rect(14, 20, 4, 3, C.ink2);
        c.rect(3, 12, 18, 9, C.wine); c.rect(4, 12, 16, 3, C.brown); c.rect(3, 12, 3, 7, C.brown); c.rect(18, 12, 3, 7, C.brown); c.rect(8, 18, 8, 3, C.aqua); c.rect(8, 18, 8, 1, C.mint);
        c.oval(12, 8 + b, 7, 5, C.brown); c.rect(8, 10 + b, 8, 4, C.tan); c.rect(8, 13 + b, 8, 1, C.sand);
        c.rect(9, 11 + b, 2, 2, C.ink); c.rect(13, 11 + b, 2, 2, C.ink); c.oval(12, 14 + b, 2, 1, C.gold); c.px(12, 14 + b, C.ink);
        c.rect(7, 6 + b, 3, 3, C.bone); c.rect(14, 6 + b, 3, 3, C.bone); c.px(9, 7 + b, C.ink); c.px(14, 7 + b, C.ink); c.rect(7, 5 + b, 4, 1, C.ink); c.rect(13, 5 + b, 4, 1, C.ink);
        c.rect(1, 5 + b, 6, 2, C.cream); c.rect(1, 2 + b, 2, 4, C.cream); c.rect(17, 5 + b, 6, 2, C.cream); c.rect(21, 2 + b, 2, 4, C.cream); c.px(1, 1 + b, C.bone); c.px(22, 1 + b, C.bone);
    },
    imp(c, f) { // frame 2 and 3 are lit
        const b = f % 2, lit = f >= 2;
        c.rect(8, 20, 3, 3, C.ember); c.rect(13, 20, 3, 3, C.ember);
        c.oval(12, 14, 8, 8, C.ink2); c.oval(10, 11, 4, 3, C.stone); c.px(8, 10, C.ash);
        c.rect(5, 5 + b, 2, 4, C.red); c.rect(17, 5 + b, 2, 4, C.red);
        c.rect(8, 12, 3, 3, lit ? C.gold : C.bone); c.rect(13, 12, 3, 3, lit ? C.gold : C.bone); c.px(9, 13, C.ink); c.px(14, 13, C.ink); c.line(7, 11, 10, 12, C.ember); c.line(16, 11, 13, 12, C.ember);
        c.rect(9, 17, 6, 1, C.bone); c.px(10, 18, C.bone); c.px(13, 18, C.bone);
        c.line(12, 6, 14, 2, C.tan); c.line(14, 2, 17, 2, C.tan);
        if (lit) { c.oval(18, 2, 2, 2, b ? C.gold : C.amber); c.px(18, 2, C.bone); c.px(21, 1, C.gold); c.px(16, 0, C.ember); }
    },
    horse(c, f) { // a haunted hobby horse on a spring
        const b = f ? 1 : 0;
        c.rect(11, 15, 2, 7, C.ash); for (let y = 16; y < 22; y += 2) c.rect(10, y, 4, 1, C.pale); c.rect(8, 22, 8, 1, C.stone);
        c.rect(8, 8 + b, 7, 8, C.violet); c.rect(7, 13 + b, 9, 3, C.indigo); c.rect(14, 5 + b, 3, 6, C.violet);
        c.rect(6, 2 + b, 10, 7, C.lilac); c.rect(2, 5 + b, 6, 5, C.lilac); c.rect(2, 8 + b, 6, 2, C.pale); c.px(3, 7 + b, C.ink);
        c.rect(8, 4 + b, 3, 3, C.ember); c.px(9, 5 + b, C.bone); c.rect(14, 0 + b, 2, 3, C.lilac); c.rect(11, 0 + b, 2, 3, C.lilac);
        for (let y = 1; y < 13; y += 2) c.rect(16, y + b, 3, 2, y % 4 === 1 ? C.rose : C.wine);
        c.rect(3, 10 + b, 5, 1, C.ink);
    },
    phantom(c, f) { // room service, deceased
        const b = f ? 1 : 0;
        for (let y = 7; y < 20; y++) { const w = Math.min(7.5, 4 + (y - 7) * 0.7); c.rect(Math.round(12 - w), y + b, Math.round(w * 2), 1, C.mint); }
        c.oval(12, 7 + b, 6, 6, C.bone); for (let x = 5; x < 19; x += 4) c.rect(x + b * 2, 19 + b, 3, 3 - b, C.mint);
        c.rect(8, 6 + b, 3, 4, C.ink); c.rect(13, 6 + b, 3, 4, C.ink); c.px(9, 6 + b, C.teal); c.px(14, 6 + b, C.teal); c.oval(12, 12 + b, 2, 1.5, C.ink);
        c.rect(7, 1 + b, 10, 2, C.red); c.rect(8, 0 + b, 8, 1, C.ember); c.rect(11, 0 + b, 2, 1, C.gold);
        c.rect(2, 14 + b, 8, 1, C.ash); c.rect(3, 12 + b, 6, 2, C.pale); c.px(5, 11 + b, C.bone);
    },
};
const MON_FRAMES = { ghoul: 2, spitter: 3, crab: 2, mirror: 2, bull: 2, imp: 4, horse: 2, phantom: 2 };
for (const k of Object.keys(MONS)) make(`m_${k}`, T, T, MON_FRAMES[k], (c, f) => { MONS[k](c, f); c.outline(); });

// ---------- bosses ----------
const B = 44;
const BOSSES = {
    curator(c, f) {
        const b = f ? 1 : 0, w = C.cream, s = C.straw;
        c.rect(14, 34, 6, 9, w); c.rect(24, 34, 6, 9, w); c.rect(13, 42, 8, 2, C.tan); c.rect(23, 42, 8, 2, C.tan);
        c.rect(11, 16, 22, 20, w); for (let y = 17; y < 36; y += 3) c.line(11, y + (y % 2), 33, y + 1 - (y % 2), s);
        c.rect(5, 18, 7, 16, w); c.rect(32, 18, 7, 12, w); for (let y = 19; y < 34; y += 3) { c.rect(5, y, 7, 1, s); c.rect(32, y, 7, 1, s); }
        c.rect(34, 24, 9, 12, C.tan); c.rect(35, 25, 7, 10, C.bone); for (let y = 27; y < 34; y += 2) c.rect(36, y, 5, 1, C.ash); c.rect(37, 23, 3, 2, C.gold); // clipboard
        c.oval(22, 9 + b, 10, 9, w); for (let y = 2; y < 18; y += 3) c.line(12, y + b, 32, y + 2 + b, s);
        c.rect(14, 8 + b, 16, 5, C.ink2); c.rect(16, 9 + b, 3, 3, C.ember); c.oval(26, 10 + b, 4, 4, C.gold); c.oval(26, 10 + b, 3, 3, C.mint); c.rect(25, 9 + b, 2, 2, C.ink); c.line(29, 13 + b, 31, 22, C.gold);
        c.rect(18, 17, 8, 4, C.red); c.rect(21, 18, 2, 2, C.gold); c.px(17, 17, C.red); c.px(26, 20, C.red);
    },
    lather(c, f) {
        const b = f ? 1 : 0;
        c.oval(22, 30, 16, 13, C.bone); c.oval(22, 28, 13, 10, C.pink); c.rect(10, 32, 24, 4, C.rose); c.rect(10, 32, 24, 1, C.pink);
        c.oval(22, 14 + b, 9, 9, C.pink); c.oval(22, 6 + b, 11, 6, C.rose); c.oval(26, 2 + b, 6, 3, C.pink); c.rect(13, 8 + b, 18, 1, C.wine);
        c.rect(16, 12 + b, 4, 4, C.bone); c.rect(24, 12 + b, 4, 4, C.bone); c.rect(18, 13 + b, 2, 2, C.ink); c.rect(24, 13 + b, 2, 2, C.ink); c.rect(15, 11 + b, 6, 1, C.wine); c.rect(23, 11 + b, 6, 1, C.wine);
        c.rect(19, 19 + b, 6, 2, C.blood); c.rect(20, 19 + b, 4, 1, C.bone);
        c.line(38, 6, 34, 30, C.tan); c.line(39, 6, 35, 30, C.sand); c.oval(39, 5, 3, 5, C.tan); for (let y = 1; y < 10; y += 2) c.px(42, y, C.cream);
        for (const [x, y, r] of [[5, 33, 4], [40, 36, 3], [8, 42, 2], [36, 42, 2], [3, 24, 2]]) { c.oval(x, y + (f ? 1 : 0), r, r, C.mint); c.oval(x, y + (f ? 1 : 0), r - 1, r - 1, C.aqua); c.px(x - 1, y - 1 + (f ? 1 : 0), C.bone); }
    },
    chef(c, f) {
        const b = f ? 1 : 0;
        c.oval(22, 33, 15, 11, C.bone); c.rect(8, 34, 28, 10, C.bone); c.rect(16, 24, 2, 20, C.pale); c.rect(25, 26, 3, 3, C.red); c.rect(25, 33, 3, 3, C.red); c.rect(8, 38, 28, 2, C.ash);
        c.oval(22, 18 + b, 11, 9, C.ember); c.oval(21, 15 + b, 8, 5, C.amber);
        c.oval(22, 6 + b, 12, 6, C.bone); c.oval(14, 7 + b, 5, 4, C.bone); c.oval(30, 7 + b, 5, 4, C.bone); c.rect(13, 9 + b, 18, 5, C.bone); c.rect(13, 12 + b, 18, 1, C.pale); c.line(20, 2 + b, 20, 8 + b, C.pale); c.line(26, 3 + b, 26, 8 + b, C.pale);
        c.rect(15, 15 + b, 5, 4, C.bone); c.rect(25, 15 + b, 5, 4, C.bone); c.rect(17, 16 + b, 2, 2, C.ink); c.rect(26, 16 + b, 2, 2, C.ink); c.line(14, 14 + b, 20, 16 + b, C.ink); c.line(31, 14 + b, 25, 16 + b, C.ink);
        const m = f ? 3 : 2; for (let i = 0; i < 6; i++) { c.line(21 - i, 21 + b, 15 - i, 19 + b - (i % 2) * m, i % 2 ? C.gold : C.amber); c.line(23 + i, 21 + b, 29 + i, 19 + b - (i % 2) * m, i % 2 ? C.gold : C.amber); }
        c.rect(19, 23 + b, 7, 2, C.blood);
        c.rect(38, 10, 3, 24, C.tan); c.oval(39, 7, 5, 4, C.ash); c.oval(39, 7, 4, 3, C.ember); c.rect(5, 26, 6, 9, C.bone); c.rect(5, 33, 6, 3, C.ember);
    },
    landlord(c, f) {
        const b = f ? 1 : 0;
        c.rect(15, 18, 14, 25, C.ink2); c.rect(13, 42, 18, 2, C.ink); c.rect(21, 22, 2, 18, C.wine); c.rect(19, 18, 6, 5, C.bone); c.rect(21, 19, 2, 8, C.red);
        c.rect(11, 20, 5, 15, C.ink2); c.rect(28, 20, 5, 14, C.ink2); c.rect(11, 34, 5, 3, C.mint); c.rect(28, 33, 5, 3, C.mint);
        c.oval(22, 12 + b, 7, 8, C.mint); c.rect(16, 15 + b, 12, 3, C.aqua);
        c.rect(17, 10 + b, 4, 4, C.ink); c.rect(23, 10 + b, 4, 4, C.ink); c.px(19, 11 + b, C.gold); c.px(25, 11 + b, C.gold);
        c.rect(17, 17 + b, 10, 2, C.ink); for (let x = 17; x < 27; x += 2) c.px(x, 17 + b, C.bone); c.px(16, 16 + b, C.ink); c.px(27, 16 + b, C.ink);
        c.rect(14, 1 + b, 16, 7, C.ink); c.rect(14, 6 + b, 16, 2, C.blood); c.rect(11, 8 + b, 22, 2, C.ink);
        c.oval(37, 33, 5, 5, C.gold); c.oval(37, 33, 3, 3, C.ink2); c.erase(37, 33);
        for (let i = 0; i < 4; i++) { const x = 33 + i * 3, y = 37 + (i & 1) * 2 + (f && i & 1 ? 1 : 0); c.rect(x, y, 2, 5, C.gold); c.px(x + 1, y + 5, C.amber); }
    },
    monday(c, f) {
        const b = f ? 1 : 0;
        c.rect(10, 39, 3, 5, C.ink2); c.rect(31, 39, 3, 5, C.ink2); c.rect(7, 42, 6, 2, C.stone); c.rect(31, 42, 6, 2, C.stone);
        c.oval(9, 8 + b * 2, 7, 6, C.gold); c.oval(35, 8 + (1 - b) * 2, 7, 6, C.gold); c.oval(8, 7 + b * 2, 4, 3, C.bone); c.oval(34, 7 + (1 - b) * 2, 4, 3, C.bone);
        c.rect(20, 1, 4, 5, C.ash); c.rect(14, 4, 16, 2, C.pale);
        c.oval(22, 24, 19, 18, C.red); c.oval(22, 24, 16, 15, C.bone); c.oval(21, 22, 14, 12, C.cream);
        for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.rect(22 + Math.cos(a) * 14, 24 + Math.sin(a) * 13, 2, 2, C.ink2); }
        c.rect(12, 16, 7, 7, C.bone); c.rect(25, 16, 7, 7, C.bone); c.rect(15, 18, 3, 3, C.ink); c.rect(26, 18, 3, 3, C.ink); c.line(10, 13, 20, 17, C.ink); c.line(34, 13, 24, 17, C.ink); c.line(10, 14, 20, 18, C.ink); c.line(34, 14, 24, 18, C.ink);
        c.oval(22, 32, 8, 3 + b, C.ink); for (let x = 16; x < 29; x += 3) { c.rect(x, 29, 2, 2, C.bone); c.rect(x, 34 + b, 2, 1, C.bone); }
        if (f) { c.px(1, 2, C.gold); c.px(3, 0, C.gold); c.px(43, 2, C.gold); c.px(41, 0, C.gold); }
    },
};
for (const k of Object.keys(BOSSES)) make(`b_${k}`, B, B, 2, (c, f) => { BOSSES[k](c, f); c.outline(); });

// ---------- rule glyphs: one little badge per monster, so a rule is read at a glance ----------
const GLYPHS = {
    ghoul: ["..#..", "..#..", "#####", "..#..", "..#.."],
    spitter: ["..#..", ".###.", "#.#.#", "..#..", "..#.."],
    crab: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    mirror: [".#.#.", "##.##", ".#.#.", ".#.#.", ".#.#."],
    bull: ["..#..", "..##.", "#####", "..##.", "..#.."],
    imp: ["#.#.#", ".###.", "#####", ".###.", "#.#.#"],
    horse: ["##...", ".#...", ".#...", ".####", "....."],
    phantom: ["#.#.#", "#.#.#", "..#..", "#.#.#", "#.#.#"],
    boss: [".###.", "#####", "#.#.#", "#####", ".#.#."],
};
export const GLYPH_COLOR = { ghoul: C.lime, spitter: C.ember, crab: C.gold, mirror: C.lilac, bull: C.rose, imp: C.amber, horse: C.violet, phantom: C.mint, boss: C.red };
for (const k of Object.keys(GLYPHS)) make(`g_${k}`, 11, 11, 1, (c) => {
    c.rect(1, 0, 9, 11, C.ink); c.rect(0, 1, 11, 9, C.ink); c.rect(1, 1, 9, 9, C.ink2);
    c.rows(3, 3, GLYPHS[k], { "#": C.bone });
});
make("arrow", 9, 9, 1, (c) => c.rows(0, 0, ["....#....", "...###...", "..#####..", ".#######.", "#########", "...###...", "...###...", "...###...", "...###..."], { "#": C.bone }));
make("arrowLine", 7, 7, 1, (c) => c.rows(0, 0, ["...#...", "..###..", ".#####.", "#######", "..###..", "..###..", "..###.."], { "#": C.bone }));
make("skull", 11, 11, 1, (c) => { c.oval(5, 4, 5, 4, C.bone); c.rect(3, 8, 5, 2, C.bone); c.rect(2, 3, 2, 3, C.ink); c.rect(7, 3, 2, 3, C.ink); c.px(5, 6, C.ink); c.px(4, 9, C.ink); c.px(6, 9, C.ink); c.outline(); });
make("stars", 16, 8, 3, (c, f) => { for (let i = 0; i < 3; i++) { const a = (i / 3 + f / 9) * 6.283; const x = 7.5 + Math.cos(a) * 7, y = 3.5 + Math.sin(a) * 3; c.rect(x, y - 1, 1, 3, C.gold); c.rect(x - 1, y, 3, 1, C.gold); c.px(x, y, C.bone); } });

// ---------- HUD ----------
make("heart", 15, 14, 3, (c, f) => { // full, empty, shield
    const r = ["..###...###..", ".#####.#####.", "#############", "#############", "#############", ".###########.", "..#########..", "...#######...", "....#####....", ".....###.....", "......#......"];
    const a = [C.red, C.ink2, C.aqua][f], b = [C.ember, C.plum, C.mint][f];
    c.rows(1, 1, r, { "#": a });
    if (f !== 1) { c.rect(3, 3, 3, 2, b); c.rect(3, 3, 1, 3, b); c.px(4, 3, C.bone); }
    c.outline();
});
make("icon_coin", 13, 13, 1, (c) => { c.oval(6, 6, 5, 5, C.gold); c.oval(6, 6, 3, 3, C.amber); c.rect(6, 3, 1, 7, C.bone); c.outline(C.ink); });
make("icon_undo", 15, 15, 1, (c) => c.rows(1, 2, ["....#........", "...##........", "..##########.", ".###########.", "..##......##.", "...##......##", "....#......##", "..........##.", "....#######..", "....######..."], { "#": C.bone }));
make("icon_wait", 15, 15, 1, (c) => c.rows(1, 1, [".....###.....", "...#######...", "..##.....##..", ".##...#...##.", ".#....#....#.", "##....#....##", "##....####.##", "##........ ##", ".#.........#.", ".##.......##.", "..##.....##..", "...#######...", ".....###....."], { "#": C.bone }));
make("icon_gear", 15, 15, 1, (c) => { c.oval(7, 7, 5, 5, C.bone); c.oval(7, 7, 2, 2, C.ink2); for (const [x, y] of [[6, 0], [6, 12], [0, 6], [12, 6]]) c.rect(x, y, 3, 3, C.bone); });
make("icon_lock", 11, 13, 1, (c) => { c.rect(1, 6, 9, 7, C.gold); c.rect(3, 1, 5, 2, C.ash); c.rect(2, 2, 2, 4, C.ash); c.rect(7, 2, 2, 4, C.ash); c.rect(5, 8, 1, 3, C.ink); });
make("icon_clock", 13, 13, 1, (c) => { c.oval(6, 6, 6, 6, C.bone); c.oval(6, 6, 5, 5, C.cream); c.rect(6, 2, 1, 5, C.ink); c.rect(6, 6, 3, 1, C.red); c.outline(C.ink); });

// ---------- souvenirs ----------
const ICONS = {
    sunhat(c) { c.rect(1, 9, 14, 2, C.straw); c.rect(4, 4, 8, 5, C.straw); c.rect(4, 7, 8, 2, C.red); c.rect(5, 4, 6, 1, C.cream); },
    sunscreen(c) { c.rect(5, 4, 6, 10, C.bone); c.rect(6, 1, 4, 3, C.amber); c.rect(5, 7, 6, 4, C.aqua); c.px(7, 8, C.gold); c.px(8, 9, C.gold); },
    sandals(c) { c.oval(5, 8, 3, 6, C.tan); c.oval(11, 8, 3, 6, C.tan); c.line(3, 5, 7, 5, C.red); c.line(9, 5, 13, 5, C.red); c.rect(5, 2, 1, 3, C.red); c.rect(11, 2, 1, 3, C.red); },
    snowglobe(c) { c.rect(3, 12, 10, 3, C.tan); c.oval(8, 7, 6, 6, C.aqua); c.oval(8, 7, 5, 5, C.deep); c.rect(6, 7, 4, 4, C.ember); c.px(7, 5, C.gold); c.px(5, 4, C.bone); c.px(10, 5, C.bone); c.px(4, 8, C.bone); c.px(11, 9, C.bone); },
    spoon(c) { c.oval(11, 4, 3, 4, C.pale); c.oval(11, 4, 2, 3, C.bone); c.line(9, 8, 3, 14, C.ash); c.px(5, 12, C.red); },
    insurance(c) { c.rect(3, 1, 10, 14, C.bone); c.rect(4, 3, 8, 1, C.ink2); c.rect(4, 5, 7, 1, C.ash); c.rect(4, 7, 8, 1, C.ash); c.oval(10, 11, 2, 2, C.red); c.px(10, 11, C.gold); },
    phrasebook(c) { c.rect(2, 2, 12, 12, C.teal); c.rect(2, 2, 2, 12, C.deep); c.rect(6, 5, 6, 1, C.gold); c.rect(6, 8, 4, 1, C.gold); c.rect(3, 14, 11, 1, C.bone); },
    bumbag(c) { c.rect(0, 6, 16, 2, C.ink2); c.oval(8, 9, 6, 4, C.rose); c.rect(4, 8, 8, 1, C.gold); c.oval(8, 11, 3, 1, C.wine); },
    thermos(c) { c.rect(5, 3, 7, 11, C.teal); c.rect(5, 1, 7, 2, C.ash); c.rect(5, 6, 7, 1, C.mint); c.rect(12, 6, 2, 5, C.ash); c.rect(6, 9, 2, 4, C.aqua); },
    detector(c) { c.line(3, 2, 10, 11, C.ash); c.oval(11, 12, 4, 2, C.aqua); c.rect(1, 1, 4, 3, C.ink2); c.px(2, 2, C.lime); },
    cushion(c) { c.oval(7, 8, 6, 5, C.rose); c.oval(6, 7, 3, 2, C.pink); c.rect(12, 7, 3, 2, C.wine); },
    dominoes(c) { c.rect(2, 2, 6, 12, C.bone); c.rect(9, 2, 6, 12, C.bone); c.rect(2, 7, 6, 1, C.ash); c.rect(9, 7, 6, 1, C.ash); c.px(4, 4, C.ink); c.px(5, 11, C.ink); c.px(11, 4, C.ink); c.px(13, 4, C.ink); c.px(12, 11, C.ink); },
    guidebook(c) { c.rect(2, 1, 12, 14, C.gold); c.rect(2, 1, 2, 14, C.amber); c.oval(9, 7, 3, 3, C.ink2); c.oval(9, 7, 2, 2, C.mint); c.line(11, 9, 13, 12, C.ink2); },
    p_blast(c) { for (let i = 0; i < 8; i++) { const a = i * 0.785; c.line(8, 8, 8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, i % 2 ? C.ember : C.gold); } c.oval(8, 8, 3, 3, C.bone); },
    p_frost(c) { c.oval(8, 8, 7, 7, C.aqua); c.line(8, 2, 8, 14, C.bone); c.line(2, 8, 14, 8, C.bone); c.line(4, 4, 12, 12, C.bone); c.line(12, 4, 4, 12, C.bone); },
    p_crate(c) { c.rect(2, 5, 12, 9, C.tan); c.rect(2, 5, 12, 1, C.sand); c.rect(5, 2, 6, 3, C.ink2); c.rect(6, 3, 4, 2, C.tan); c.rect(4, 5, 2, 9, C.brown); c.rect(10, 5, 2, 9, C.brown); },
    p_swap(c) { c.line(2, 5, 12, 5, C.gold); c.line(12, 5, 9, 2, C.gold); c.line(12, 5, 9, 8, C.gold); c.line(14, 11, 4, 11, C.mint); c.line(4, 11, 7, 8, C.mint); c.line(4, 11, 7, 14, C.mint); },
    p_leap(c) { for (let x = 1; x < 15; x++) { const k = (x - 8) / 7; c.px(x, 13 - (1 - k * k) * 11, C.bone); } c.rect(12, 11, 3, 3, C.gold); c.rect(1, 13, 3, 2, C.ember); },
    p_pit(c) { c.oval(8, 10, 7, 4, C.ink); c.oval(8, 9, 6, 3, C.ink2); c.rect(2, 2, 12, 1, C.tan); c.line(8, 2, 8, 7, C.bone); c.line(6, 5, 8, 7, C.bone); c.line(10, 5, 8, 7, C.bone); },
    shush(c) { c.oval(8, 8, 6, 6, C.pale); c.rect(5, 10, 6, 1, C.ink2); c.rect(7, 3, 2, 10, C.pink); c.px(5, 6, C.ink); c.px(10, 6, C.ink); },
    dig(c) { c.line(3, 2, 10, 10, C.tan); c.rect(9, 9, 5, 5, C.ash); c.rect(9, 9, 5, 1, C.pale); c.rect(1, 1, 4, 2, C.brown); },
    hop(c) { c.rect(7, 2, 2, 9, C.bone); c.oval(7, 2, 2, 2, C.bone); c.oval(9, 2, 2, 2, C.bone); c.rect(5, 11, 6, 2, C.aqua); for (const x of [2, 13]) c.rect(x, 12, 1, 3, C.mint); },
    swap(c) { c.oval(8, 8, 6, 6, C.lilac); c.rect(4, 6, 3, 3, C.bone); c.rect(9, 6, 3, 3, C.bone); c.px(5, 7, C.ink); c.px(10, 7, C.ink); c.rect(6, 11, 4, 1, C.wine); },
};
for (const k of Object.keys(ICONS)) make(`i_${k}`, 16, 16, 1, (c) => { ICONS[k](c); c.outline(); });

// ---------- panels ----------
make("panel", 15, 15, 2, (c, f) => { // nine-slice: parchment, dark
    const a = f ? C.ink2 : C.cream, b = f ? C.plum : C.bone, e = f ? C.ink : C.straw;
    c.rect(1, 0, 13, 15, C.ink); c.rect(0, 1, 15, 13, C.ink);
    c.rect(1, 1, 13, 13, a); c.rect(1, 1, 13, 1, b); c.rect(1, 1, 1, 13, b); c.rect(1, 13, 13, 1, e); c.rect(13, 1, 1, 13, e);
});
make("btn", 15, 17, 4, (c, f) => { // nine-slice: amber, teal, dark, cream
    const [a, b, e] = [[C.amber, C.gold, C.ember], [C.teal, C.aqua, C.deep], [C.wine, C.brown, C.plum], [C.straw, C.cream, C.sand]][f];
    c.rect(1, 0, 13, 17, C.ink); c.rect(0, 1, 15, 15, C.ink);
    c.rect(1, 1, 13, 13, a); c.rect(1, 1, 13, 2, b); c.rect(1, 12, 13, 2, e); c.rect(1, 14, 13, 2, C.ink2);
});
make("polaroid", 15, 15, 1, (c) => { c.rect(0, 0, 15, 15, C.bone); c.rect(0, 14, 15, 1, C.straw); c.rect(14, 0, 1, 15, C.straw); });
make("stamp", 18, 22, 1, (c) => { c.rect(0, 0, 18, 22, C.bone); for (let x = 1; x < 18; x += 3) { c.erase(x, 0); c.erase(x, 21); } for (let y = 1; y < 22; y += 3) { c.erase(0, y); c.erase(17, y); } c.rect(3, 3, 12, 16, C.teal); });
make("tape", 24, 9, 1, (c) => { c.rect(0, 0, 24, 9, C.straw); c.dither(0, 0, 24, 9, C.cream, 0.5); for (let y = 0; y < 9; y += 2) { c.erase(0, y); c.erase(23, y); } });

// The title painting: dawn over the graveyard, one keeper leaving with a suitcase.
make("vista", 240, 190, 1, (c) => {
    const W = 240, H = 190, hz = 138;
    const bands = [[0, "#120c22"], [26, C.night], [52, "#3a2348"], [78, C.wine], [100, C.blood], [116, C.ember], [128, C.amber], [136, C.gold]];
    bands.forEach(([y, col], i) => { const ny = bands[i + 1]?.[0] ?? hz; c.rect(0, y, W, ny - y, col); if (bands[i + 1]) c.dither(0, ny - 8, W, 8, bands[i + 1][1], 0.5); });
    for (let i = 0; i < 46; i++) c.px(hash2(i, 3) * W, hash2(4, i) * 60, i % 5 ? C.lilac : C.bone);
    c.oval(164, 128, 34, 34, C.gold); c.oval(164, 128, 26, 26, C.bone); c.dither(130, 94, 68, 34, C.gold, 0.2);
    for (const [x, y, w] of [[20, 58, 36], [60, 76, 24], [178, 46, 44], [120, 34, 28]]) { c.rect(x, y, w, 3, C.wine); c.rect(x + 6, y - 2, w - 14, 2, C.blood); }
    // Hills, far then near.
    for (let x = 0; x < W; x++) { const a = hz - 8 + Math.sin(x * 0.03 + 1) * 6 + Math.sin(x * 0.11) * 2, b = hz + 6 + Math.sin(x * 0.02 + 3) * 5; c.rect(x, a, 1, H - a, "#2e1626"); c.rect(x, b, 1, H - b, C.ink2); }
    // The dead tree and its crow.
    c.rect(212, 96, 5, 54, C.ink); c.line(214, 112, 232, 92, C.ink); c.line(214, 104, 198, 84, C.ink); c.line(224, 102, 230, 112, C.ink); c.line(206, 94, 203, 106, C.ink); c.line(232, 92, 238, 88, C.ink); c.rect(226, 88, 4, 4, C.ink); c.px(230, 89, C.amber);
    // Tombstones
    for (const [x, y, h2] of [[150, 146, 12], [176, 150, 15], [120, 151, 10], [196, 154, 13]]) { c.oval(x + 4, y, 4.5, 4.5, C.stone); c.rect(x, y, 9, h2, C.stone); c.rect(x, y - 3, 3, h2 + 3, C.ash); c.rect(x - 1, y + h2, 11, 2, C.ink); c.rect(x + 3, y + 3, 4, 1, C.ink2); c.rect(x + 2, y + 6, 5, 1, C.ink2); }
    // The crypt
    c.rect(4, 84, 92, 76, C.stone); c.rect(4, 84, 92, 3, C.ash); for (let y = 90; y < 160; y += 8) { c.rect(4, y, 92, 1, C.ink2); for (let x = 8 + (y % 16 ? 0 : 8); x < 96; x += 16) c.rect(x, y, 1, 8, C.ink2); }
    for (let i = 0; i < 18; i++) c.rect(50 - 56 + i * 3, 83 - i, 112 - i * 6, 1, i < 2 ? C.pale : C.ash);
    c.rect(-2, 83, 104, 4, C.pale); c.rect(0, 87, 100, 2, C.ink2);
    for (const x of [8, 76]) { c.rect(x, 89, 14, 71, C.pale); c.rect(x + 10, 89, 4, 71, C.ash); c.rect(x - 2, 89, 18, 3, C.bone); c.rect(x - 2, 156, 18, 4, C.bone); }
    c.rect(28, 100, 44, 60, C.ink); c.rect(31, 103, 38, 57, C.brown); c.rect(31, 103, 18, 57, C.tan); c.rect(50, 103, 19, 57, C.tan); c.rect(49, 103, 2, 57, C.ink); for (const y of [114, 144]) c.rect(31, y, 38, 3, C.ash); c.oval(46, 130, 1, 2, C.gold); c.oval(54, 130, 1, 2, C.gold);
    c.oval(50, 72, 8, 7, C.bone); c.rect(46, 77, 8, 4, C.bone); c.rect(46, 71, 3, 3, C.ink); c.rect(52, 71, 3, 3, C.ink); c.px(50, 75, C.ink);
    // BACK MONDAY sign, hung crooked
    c.line(38, 104, 50, 98, C.ink2); c.line(62, 104, 50, 98, C.ink2);
    c.rect(32, 104, 36, 16, C.ink); c.rect(33, 105, 34, 14, C.cream); c.rect(33, 117, 34, 2, C.straw);
    // Path
    for (let y = 160; y < H; y++) { const k = (y - 160) / 30, l = 30 - k * 30, r = 80 + k * 140; c.rect(l, y, r - l, 1, y % 5 === 0 ? C.tan : C.brown); }
    c.dither(0, 160, W, 30, C.ink2, 0.3);
    // Grass tufts
    for (let i = 0; i < 40; i++) { const x = hash2(i, 9) * W, y = 158 + hash2(9, i) * 30; c.line(x, y, x + 1, y - 3, C.moss); c.line(x + 2, y, x + 2, y - 2, i % 3 ? C.moss : C.leaf); }
});

// The shopkeeper: a skeleton in a cardigan who has seen every tourist there is.
make("shopkeep", 64, 52, 2, (c, f) => {
    const b = f ? 1 : 0;
    c.oval(32, 15 + b, 11, 10, C.bone); c.rect(25, 22 + b, 14, 6, C.bone); c.rect(26, 12 + b, 5, 6, C.ink); c.rect(34, 12 + b, 5, 6, C.ink); c.px(28, 14 + b, C.gold); c.px(36, 14 + b, C.gold); c.rect(31, 19 + b, 2, 3, C.ink);
    for (let x = 27; x < 38; x += 2) c.rect(x, 25 + b, 1, 3, C.ink);
    c.rect(24, 11 + b, 8, 1, C.tan); c.rect(33, 11 + b, 7, 1, C.tan); c.rect(21, 7 + b, 22, 1, C.ink2);
    c.rect(18, 29, 28, 12, C.moss); c.rect(30, 29, 4, 12, C.leaf); c.rect(18, 29, 28, 1, C.leaf); for (const y of [32, 35, 38]) c.px(32, y, C.gold);
    c.rect(13, 31, 5, 11, C.moss); c.rect(46, 31, 5, 11, C.moss);
    c.rect(0, 40, 64, 12, C.tan); c.rect(0, 40, 64, 2, C.sand); c.rect(0, 50, 64, 2, C.brown); for (let x = 8; x < 64; x += 16) c.rect(x, 42, 1, 8, C.brown);
    c.rect(50, 34, 10, 6, C.gold); c.oval(55, 34, 5, 3, C.gold); c.rect(54, 29, 2, 2, C.amber); c.rect(53, 40, 4, 1, C.ink);
    c.rect(4, 36, 8, 4, C.bone); c.rect(5, 35, 6, 1, C.rose);
    c.outline();
});

// Bitmap font, in white so it can be tinted.
export const GLY = {};
{
    const rowsH = FONT_ROWS.h;
    const chars = Object.keys(FONT_ROWS.chars);
    make("font", 7, rowsH, chars.length, (c, f) => {
        const rows = FONT_ROWS.chars[chars[f]];
        c.rows(0, 0, rows, { "#": "#ffffff" });
        let adv = 0; rows.forEach((r) => { const k = r.lastIndexOf("#") + 1; adv = Math.max(adv, k); });
        GLY[chars[f]] = { f, w: chars[f] === " " ? 3 : adv };
    });
}

// A soft round glow, the only smooth thing in the game.
export function glowPixels(p) {
    const w = p.width;
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5) / w * 2 - 1, dy = (y + 0.5) / w * 2 - 1, k = Math.max(0, 1 - Math.hypot(dx, dy));
        const o = (y * w + x) * 4; p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = 255 * k * k;
    }
}

// ---------- drawing helpers ----------
export function spr(d, name, x, y, o = {}) {
    const s = SPR[name];
    if (!s) throw new Error("no sprite " + name);
    const f = (o.frame ?? 0) % s.frames, sc = o.scale ?? 1;
    d.sprite("atlas", { x, y, crop: [s.x + f * (s.w + 1), s.y, s.w, s.h], width: s.w * (o.sx ?? sc), height: s.h * (o.sy ?? sc), flipX: o.flip, color: o.color, opacity: o.opacity, rot: o.rot });
}
export function textWidth(str, scale = 1) {
    let w = 0;
    for (const ch of String(str)) { const g = GLY[ch] ?? GLY["?"]; w += (g.w + 1) * scale; }
    return w - scale;
}
const FS = SPR.font;
/** Bitmap text. align: 0 left, 0.5 centre, 1 right. y is the vertical centre of the line. */
export function ptext(d, str, x, y, o = {}) {
    const sc = o.scale ?? 2, col = o.color ?? C.bone, al = o.align ?? 0.5;
    str = String(str);
    if (o.shadow !== false) ptext(d, str, x, y + sc, { ...o, color: o.shadow === undefined ? C.ink : o.shadow, shadow: false, outline: false });
    if (o.outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ptext(d, str, x + dx * sc, y + dy * sc, { ...o, color: o.outline === true ? C.ink : o.outline, shadow: false, outline: false });
    let px = x - textWidth(str, sc) * al;
    for (const ch of str) {
        const g = GLY[ch] ?? GLY["?"];
        d.sprite("atlas", { x: px + 3.5 * sc, y, crop: [FS.x + g.f * 8, FS.y, 7, FS.h], width: 7 * sc, height: FS.h * sc, color: col, opacity: o.opacity });
        px += (g.w + 1) * sc;
    }
}
/** Word wrap for a bitmap font. */
export function wrap(str, maxW, scale = 2) {
    const out = []; let line = "";
    for (const word of String(str).split(" ")) {
        const t = line ? line + " " + word : word;
        if (textWidth(t, scale) > maxW && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
    return out;
}
export function nine(d, name, frame, x, y, w, h, sc = 2, o = {}) {
    const s = SPR[name], f = frame * (s.w + 1), cut = 5, mid = s.w - cut * 2, midH = s.h - cut * 2;
    const quad = (sx, sy, sw, sh, dx, dy, dw, dh) => d.sprite("atlas", { x: dx + dw / 2, y: dy + dh / 2, crop: [s.x + f + sx, s.y + sy, sw, sh], width: dw, height: dh, opacity: o.opacity });
    const c = cut * sc, l = x - w / 2, t = y - h / 2, inW = w - c * 2, inH = h - c * 2;
    quad(0, 0, cut, cut, l, t, c, c); quad(cut, 0, mid, cut, l + c, t, inW, c); quad(s.w - cut, 0, cut, cut, l + w - c, t, c, c);
    quad(0, cut, cut, midH, l, t + c, c, inH); quad(cut, cut, mid, midH, l + c, t + c, inW, inH); quad(s.w - cut, cut, cut, midH, l + w - c, t + c, c, inH);
    quad(0, s.h - cut, cut, cut, l, t + h - c, c, c); quad(cut, s.h - cut, mid, cut, l + c, t + h - c, inW, c); quad(s.w - cut, s.h - cut, cut, cut, l + w - c, t + h - c, c, c);
}
