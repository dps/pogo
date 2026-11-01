// Cosmic Yard Sale's marker lettering: every glyph is a stroke, painted fat, like a sign written with a chisel marker. Text batches in one call, and changes every frame for free.
import { Ink } from "./ink.js";
const S = (p) => ({ s: 1, p }), L = (p) => ({ s: 0, p });
const O = S("5,0 1.2,3.6 1,10 5,14 8.8,10.4 9,3.8 5,0");
const G = {
    A: [L("1,14 5,0 9,14"), L("2.4,9.6 7.6,9.6")], B: [L("1.2,0 1.2,14"), S("1.2,0 6,0.3 8.4,3.5 6,6.7 1.2,6.8"), S("1.2,6.8 6.6,7 9.2,10.5 6.4,13.9 1.2,14")],
    C: [S("9,2.4 6,0 2.5,1.6 1,7 2.5,12.4 6,14 9,11.8")], D: [L("1.2,0 1.2,14"), S("1.2,0 5.5,0.4 9,4 9,10 5.5,13.6 1.2,14")],
    E: [L("8.6,0 1.2,0 1.2,14 8.6,14"), L("1.2,6.8 7,6.8")], F: [L("8.8,0 1.2,0 1.2,14"), L("1.2,6.8 7.2,6.8")],
    G: [S("9,2.4 6,0 2.5,1.6 1,7 2.5,12.4 6,14 9,12"), L("9,12.4 9,8 5.6,8")], H: [L("1.2,0 1.2,14"), L("8.8,0 8.8,14"), L("1.2,7 8.8,7")],
    I: { w: 4, g: [L("2,0 2,14")] }, J: [S("8,0 8,9.6 6.4,13.2 3.4,14 1,11.4")], K: [L("1.2,0 1.2,14"), L("8.8,0 1.2,8.2"), L("3.8,5.8 9.2,14")], L: [L("1.2,0 1.2,14 8.4,14")],
    M: { w: 12, g: [L("1,14 1.6,0 6,9.8 10.4,0 11,14")] }, N: [L("1.2,14 1.2,0 8.8,14 8.8,0")], O: [O], P: [L("1.2,14 1.2,0"), S("1.2,0 6,0.2 8.8,3.6 6,7.4 1.2,7.6")],
    Q: [O, L("5.8,9.6 9.8,14.6")], R: [L("1.2,14 1.2,0"), S("1.2,0 6,0.2 8.6,3.5 6,7.1 1.2,7.3"), L("5,7.3 9.2,14")],
    S: [S("8.8,2.2 6,0 2.2,1 1.6,4.5 5,6.8 8.6,9.2 8.2,12.8 4.5,14 1.2,11.8")], T: [L("0.6,0 9.4,0"), L("5,0 5,14")], U: [S("1.2,0 1.2,9.6 2.8,13.2 5,14 7.2,13.2 8.8,9.6 8.8,0")],
    V: [L("1,0 5,14 9,0")], W: { w: 12, g: [L("0.6,0 3.2,14 6,3.4 8.8,14 11.4,0")] }, X: [L("1.2,0 8.8,14"), L("8.8,0 1.2,14")], Y: [L("1,0 5,7 9,0"), L("5,7 5,14")], Z: [L("1.2,0 8.8,0 1.2,14 8.8,14")],
    0: [S("5,0 1.6,3.6 1.4,10 5,14 8.4,10.4 8.6,3.8 5,0")], 1: { w: 7, g: [L("1,3 4,0 4,14")] }, 2: [S("1.2,3.2 4,0 8,1.6 8,5.4 1.2,13.8"), L("1.2,14 8.8,14")],
    3: [S("1.6,1.6 5,0 8.2,3 5,6.6"), S("5,6.6 8.8,10 5.4,14 1.2,12")], 4: [L("6.8,14 6.8,0 1,9.6 9.2,9.6")], 5: [L("8.2,0 2.2,0 1.6,6"), S("1.6,6 5,5 8.8,9 5.4,14 1.2,12")],
    6: [S("7.8,0.8 4,2 1.4,8 2.2,12.6 5,14 8.4,11 7,7.2 3.6,7.2 1.4,9.4")], 7: [L("1.2,0 8.8,0 3.6,14")], 8: [S("5,6.6 1.8,3.2 5,0 8.2,3.2 5,6.6 8.8,10.2 5,14 1.2,10.2 5,6.6")],
    9: [S("8.4,5 5,7.4 1.6,4.4 4.6,0 8.4,3 8,8 4.2,14")],
    $: { w: 10, g: [S("8.6,3 6,1.2 2.4,2 1.8,5 5,7 8.4,9.2 8,12 4.6,12.9 1.4,11"), L("5,-1 5,15")] },
    ".": { w: 3.6, g: [L("1.8,13.6 1.8,13.7")] }, ",": { w: 3.6, g: [L("2,13.4 1,15.6")] }, "!": { w: 4, g: [L("2,0 2,9.6"), L("2,13.6 2,13.7")] }, "?": [S("1.4,3 4.6,0 8.4,3 5,7 5,10"), L("5,13.6 5,13.7")],
    "'": { w: 3, g: [L("1.5,0 1.5,3.6")] }, '"': { w: 5.6, g: [L("1.4,0 1.4,3.6"), L("4.2,0 4.2,3.6")] }, "-": { w: 7, g: [L("1,7.4 6,7.4")] }, "+": { w: 9, g: [L("1,7.4 8,7.4"), L("4.5,4 4.5,11")] }, "/": { w: 7, g: [L("6,-0.4 1,14.4")] },
    ":": { w: 3.6, g: [L("1.8,4 1.8,4.1"), L("1.8,12.4 1.8,12.5")] }, "%": { w: 11, g: [L("9.4,0 1.6,14"), L("2.8,2 2.8,3"), L("8.2,11 8.2,12")] }, "(": { w: 5, g: [S("4,-0.6 1.4,7 4,14.6")] }, ")": { w: 5, g: [S("1,-0.6 3.6,7 1,14.6")] },
    "¢": { w: 8, g: [S("7,6 4,4.6 1.4,8.4 3.6,12.8 7,11.6"), L("4.2,2.8 4.2,14.4")] },
    "&": [S("9,14 2.6,5.4 3,1 5.6,0.4 6.8,3.4 1.6,9 2.2,13 6,13.6 9,8.6")], "*": { w: 7, g: [L("3.5,2 3.5,8"), L("1,3.4 6,6.6"), L("6,3.4 1,6.6")] }, "#": { w: 11, g: [L("4,1 3,13"), L("8,1 7,13"), L("1,5 10,5"), L("1,9.6 10,9.6")] }, "=": { w: 8, g: [L("1,5.4 7,5.4"), L("1,9.6 7,9.6")] }, "×": { w: 7.6, g: [L("1,6 6.6,13.4"), L("6.6,6 1,13.4")] },
};
const CELL = 64, COLS = 12;
export const CHARS = Object.keys(G);
const ROWS = Math.ceil(CHARS.length / COLS);
const META = {};

export function paintFont(assets) {
    assets.paint("font", CELL * COLS, CELL * ROWS * 2, (p) => {
        const I = new Ink(p.data, p.width, p.height), k = 3.2, stroke = 2.6;
        CHARS.forEach((ch, n) => {
            const e = G[ch], g = e.g ?? e, w = e.w ?? 10;
            for (let pass = 0; pass < 2; pass++) {
                const cx = (n % COLS) * CELL, cy = (Math.floor(n / COLS) + pass * ROWS) * CELL;
                I.at(cx + (CELL - w * k) / 2, cy + (CELL - 14 * k) / 2, k);
                for (const st of g) {
                    const flat = st.p.split(" ").flatMap((c) => c.split(",").map(Number));
                    I.line(flat, pass ? stroke + 3.4 : stroke, "#ffffff", !!st.s);
                }
            }
        });
    }, { smooth: true });
    assets.grid("font", COLS, ROWS * 2);
    CHARS.forEach((ch, n) => { const e = G[ch]; META[ch] = { frame: n, w: e.w ?? 10 }; });
}

const lookup = (c) => META[c] ?? META[c.toUpperCase()];
/** Width in view units for a text at this size (cap height). */
export function textWidth(s, size) {
    const k = size / 14; let w = 0;
    for (const c of String(s)) { if (c === " ") { w += 6; continue; } const m = lookup(c); w += (m ? m.w : 6) + 1.6; }
    return Math.max(0, w - 1.6) * k;
}
const hex = (c) => { const h = c.slice(1); return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]; };
const HEX = new Map();
const col = (c) => { let v = HEX.get(c); if (!v) HEX.set(c, (v = hex(c))); return v; };

/** Draws marker text. Options: color, outline (color or null), align -1 0 1, rot, opacity, maxW (shrinks to fit). */
export function T(d, s, x, y, size, o = {}) {
    s = String(s);
    let w = textWidth(s, size);
    if (o.maxW && w > o.maxW) { size *= o.maxW / w; w = o.maxW; }
    const k = size / 14, cell = (CELL / 3.2) * k, put = d.quads("font"), rot = o.rot ?? 0, cs = Math.cos(rot), sn = Math.sin(rot);
    const start = -(w * ((o.align ?? 0) + 1)) / 2, a = o.opacity ?? 1;
    const go = (color, pass) => {
        const [r, g, b] = col(color);
        let px = start;
        for (const c of s) {
            if (c === " ") { px += 6 * k; continue; }
            const m = lookup(c);
            if (m) {
                const cx = px + (m.w * k) / 2;
                put(x + cx * cs, y + cx * sn, cell, cell, rot, m.frame + pass * COLS * ROWS, r, g, b, a);
                px += (m.w + 1.6) * k;
            } else px += 6 * k;
        }
    };
    if (o.outline) go(o.outline, 1);
    go(o.color ?? "#1d1640", 0);
}
