// The furniture of the train: every carriage is built from these painted parts, in logical units (1200 by 440).
import { hash, mixc, rgb } from "./paint.js";

export const WORLD = { W: 1200, H: 440, wallTop: 58, wallBot: 340 };
const dk = (c, k = 0.6) => mixc(c, "#0a0812", 1 - k), lt = (c, k = 0.3) => mixc(c, "#fff0d0", k);
export { dk, lt };
export const WOOD = "#7a4a26", BRASS = "#d9ae5a", OX = "#8a2f33", TEAL = "#2f6264", CREAM = "#e9dcc0", PAPER = "#efe4c9", INK = "#2a2230";

/** Ceiling, wall, wainscot, floor and runner. */
export function shell(p, o) {
    const { W, wallTop: T, wallBot: B, H } = WORLD, wall = o.wall ?? TEAL, trim = o.trim ?? WOOD, floor = o.floor ?? "#3a2a24", ceil = o.ceil ?? "#d9c9a3";
    p.rect(-8, -8, W + 16, T + 12, { c: dk(ceil, 0.62), c2: ceil, m: 0.1, s: 0.08, wob: 0 });
    for (let x = 20; x < W; x += 74) { p.line([[x + (x - 600) * 0.1, 0], [x, T]], 3, { c: dk(ceil, 0.8), a: 0.5 }); p.line([[x + 3 + (x - 600) * 0.1, 0], [x + 3, T]], 1.4, { c: lt(ceil, 0.5), a: 0.5 }); }
    p.rect(-8, T - 6, W + 16, 12, { c: lt(trim, 0.12), c2: dk(trim, 0.7), wob: 0.2 });
    p.rect(0, T + 6, W, B - T - 6, { c: lt(wall, 0.06), c2: dk(wall, 0.72), m: 0.14, s: 0.12, sd: "v" });
    if (o.paper) o.paper(p);
    const py = o.dado ?? 262;
    p.rect(0, py, W, B - py, { c: trim, c2: dk(trim, 0.55), m: 0.1, s: 0.22, sd: "h" });
    for (let x = 6; x < W; x += 92) {
        p.rect(x + 7, py + 12, 78, B - py - 22, { c: dk(trim, 0.68), c2: dk(trim, 0.5), m: 0.1, s: 0.3, sd: "v" });
        p.rect(x + 9, py + 14, 74, B - py - 26, { c: lt(trim, 0.08), c2: dk(trim, 0.72), m: 0.12, s: 0.34, sd: "v" });
    }
    p.rect(0, py - 5, W, 9, { c: lt(trim, 0.3), c2: dk(trim, 0.6), wob: 0.2 });
    p.rect(0, B - 8, W, 12, { c: dk(trim, 0.6), c2: dk(trim, 0.34), wob: 0.2 });
    // Floor in perspective.
    p.rect(-8, B, W + 16, H - B + 8, { c: lt(floor, 0.1), c2: lt(floor, 0.34), m: 0.14, s: 0.2, sd: "h" });
    for (let i = -22; i < 22; i++) { const x = 600 + i * 60; p.line([[x, B], [600 + i * 104, H + 6]], 1.2, { c: dk(floor, 0.4), a: 0.55 }); }
    if (o.runner !== false) {
        const r = o.runner ?? OX;
        p.poly([[-20, B + 22], [W + 20, B + 22], [W + 20, H - 26], [-20, H - 26]], { c: lt(r, 0.1), c2: lt(r, 0.34), m: 0.16, s: 0.1 });
        p.rect(-20, B + 26, W + 40, 2.2, { c: lt(r, 0.5), a: 0.7 }); p.rect(-20, H - 33, W + 40, 2.6, { c: lt(r, 0.5), a: 0.7 });
        for (let x = 8; x < W; x += 58) p.poly([[x, B + 50], [x + 12, B + 36], [x + 24, B + 50], [x + 12, B + 64]], { c: lt(r, 0.38), a: 0.45 });
    }
}
/** Cuts a window out of the wall, then frames it. Exterior shows through the hole. */
export function win(p, x, y, w, h, o = {}) {
    const f = o.frame ?? WOOD, br = o.brass ?? BRASS, r = o.r ?? 12;
    p.rr(x - 15, y - 15, w + 30, h + 30, r + 10, { c: lt(f, 0.14), c2: dk(f, 0.6), m: 0.12, s: 0.2 });
    p.rr(x - 6, y - 6, w + 12, h + 12, r + 3, { c: dk(f, 0.42), wob: 0.2 });
    p.rr(x, y, w, h, r, { blend: "erase", wob: 0, m: 0, s: 0 });
    p.rect(x - 20, y + h + 12, w + 40, 7, { c: lt(f, 0.3), c2: dk(f, 0.6), wob: 0.2 });
    if (o.bar !== false) p.rect(x + 2, y + h * 0.3, w - 4, 3.5, { c: br, c2: dk(br, 0.5), wob: 0.1 });
    if (o.latch !== false) { p.rr(x + w / 2 - 12, y + h - 8, 24, 10, 3, { c: br, c2: dk(br, 0.5) }); }
}
/** Curtains tied back at both sides of a window. */
export function curtains(p, x, y, w, h, c, o = {}) {
    const drop = h + 34, cw = o.width ?? 34;
    p.rect(x - 28, y - 22, w + 56, 6, { c: BRASS, c2: dk(BRASS, 0.5), wob: 0.1 });
    for (const [sx, dir] of [[x - 24, 1], [x + w + 24, -1]]) {
        const pts = [[sx, y - 18], [sx + dir * cw * 1.2, y - 18], [sx + dir * cw, y + drop * 0.32], [sx + dir * cw * 0.4, y + drop * 0.52], [sx + dir * cw * 0.72, y + drop], [sx, y + drop]];
        p.poly(pts, { c: lt(c, 0.12), c2: dk(c, 0.56), m: 0.14, s: 0.3, sd: "v", dir: "v" });
        for (let i = 1; i < 4; i++) p.line([[sx + dir * cw * i / 3.4, y - 16], [sx + dir * cw * 0.4 * i / 2.6, y + drop * 0.5], [sx + dir * cw * 0.6 * i / 3.2, y + drop - 2]], 2.6, { c: dk(c, 0.42), a: 0.7 });
        p.ell(sx + dir * cw * 0.42, y + drop * 0.52, cw * 0.52, 5, { c: BRASS, c2: dk(BRASS, 0.5) });
    }
}
/** A seat seen in side profile. dir 1 faces right. */
export function seat(p, x, dir, c, o = {}) {
    const B = WORLD.wallBot + 18, top = o.top ?? 150, d = dir, w = 62;
    p.ell(x + d * 30, B + 8, 74, 10, { c: "#000000", a: 0.4, wob: 0.4 });
    p.poly([[x - d * 8, B], [x - d * 14, top + 14], [x - d * 6, top], [x + d * 14, top - 2], [x + d * 24, top + 14], [x + d * 22, B - 62], [x + d * w + 34 * d, B - 66], [x + d * (w + 42), B - 46], [x + d * (w + 34), B], ], { c: lt(c, 0.16), c2: dk(c, 0.5), m: 0.16, s: 0.08, wob: 0.8 });
    p.poly([[x + d * 16, B - 70], [x + d * (w + 40), B - 72], [x + d * (w + 44), B - 54], [x + d * 16, B - 50]], { c: lt(c, 0.26), c2: dk(c, 0.66), m: 0.14, wob: 0.8 });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const bx = x + d * (i % 2 ? 0 : 8) + d * j * 8 - d * 3, by = top + 26 + i * 26; p.ell(bx, by, 2.8, 2.8, { c: dk(c, 0.46) }); p.line([[bx - 6, by - 7], [bx, by], [bx + 6, by + 8]], 1.6, { c: dk(c, 0.56), a: 0.5 }); }
    p.rect(x + d * (w + 22) - 5, B - 46, 10, 48, { c: dk(WOOD, 0.8), c2: dk(WOOD, 0.45) });
    p.rect(x - d * 12 - 5, B - 30, 12, 32, { c: dk(WOOD, 0.8), c2: dk(WOOD, 0.45) });
    p.rr(x + d * 16 - (d > 0 ? 0 : 60), B - 88, 60, 10, 4, { c: lt(WOOD, 0.2), c2: dk(WOOD, 0.6) });
    p.poly([[x + d * 5 - 19, top - 3], [x + d * 5 + 19, top - 3], [x + d * 5 + 17, top + 22], [x + d * 5, top + 28], [x + d * 5 - 17, top + 22]], { c: CREAM, c2: "#b9a98a", a: 0.92 });
}
/** Brass sconce with a parchment shade. */
export function sconce(p, x, y, o = {}) {
    p.line([[x, y + 30], [x, y + 18]], 3.4, { c: BRASS, c2: dk(BRASS, 0.5) });
    p.ell(x, y + 34, 9, 5, { c: BRASS, c2: dk(BRASS, 0.45) });
    p.poly([[x - 9, y - 12], [x + 9, y - 12], [x + 18, y + 16], [x - 18, y + 16]], { c: o.c ?? "#ffd690", c2: o.c2 ?? "#f49a42", wob: 0.5, m: 0.1 });
}
/** Emissive pass: flares that ignore the light field. */
export function sconceGlow(p, x, y, o = {}) {
    p.poly([[x - 9, y - 12], [x + 9, y - 12], [x + 18, y + 16], [x - 18, y + 16]], { c: "#fff0c2", c2: "#ffc068", wob: 0.5, m: 0.08, s: 0.12, sd: "v" });
    p.rect(x - 18, y + 14, 36, 3, { c: "#fff6da", wob: 0.2 });
}
/** A pendant lamp hung from the ceiling. */
export function pendant(p, x, y) {
    p.line([[x, 30], [x, y - 14]], 2, { c: dk(BRASS, 0.5) });
    p.poly([[x - 7, y - 14], [x + 7, y - 14], [x + 22, y + 6], [x - 22, y + 6]], { c: "#fff0c2", c2: "#ffb860", wob: 0.5 });
}
/** Brass luggage rack with netting. */
export function rack(p, x, y, w) {
    for (const bx of [x + 10, x + w - 10, x + w / 2]) { p.line([[bx, y - 26], [bx, y], [bx - 8, y + 6]], 3, { c: BRASS, c2: dk(BRASS, 0.5) }); }
    p.ell(x + 10, y - 26, 5, 5, { c: BRASS }); p.ell(x + w - 10, y - 26, 5, 5, { c: BRASS });
    p.rect(x, y, w, 4, { c: lt(BRASS, 0.3), c2: dk(BRASS, 0.5) });
    p.rect(x, y + 9, w, 4, { c: BRASS, c2: dk(BRASS, 0.45) });
    for (let i = 0; i < w; i += 11) p.line([[x + i, y + 4], [x + i + 5, y + 9]], 0.9, { c: CREAM, a: 0.5 });
}
/** The end door. */
export function door(p, x, o = {}) {
    const w = o.w ?? 92, top = o.top ?? 86, B = WORLD.wallBot + 6, c = o.c ?? "#5a3620";
    p.rr(x - 13, top - 13, w + 26, B - top + 13, 8, { c: lt(c, 0.22), c2: dk(c, 0.6), m: 0.12 });
    p.rr(x, top, w, B - top, 5, { c: lt(c, 0.1), c2: dk(c, 0.62), m: 0.12, s: 0.3, sd: "v" });
    p.rect(x + 12, 222, w - 24, 96, { c: dk(c, 0.6), c2: dk(c, 0.42), s: 0.3, sd: "v" });
    p.rect(x + 14, 224, w - 28, 92, { c: lt(c, 0.1), c2: dk(c, 0.64), s: 0.4, sd: "v" });
    p.rr(x + 16, top + 12, w - 32, 102, 8, { c: dk(c, 0.34) });
    if (o.hole !== false) p.rr(x + 21, top + 17, w - 42, 92, 6, { blend: "erase", wob: 0 });
    p.ell(x + (o.hinge === "r" ? 14 : w - 14), 214, 8, 8, { c: BRASS, c2: dk(BRASS, 0.4) });
    p.rr(x + (o.hinge === "r" ? 8 : w - 20), 222, 12, 24, 3, { c: BRASS, c2: dk(BRASS, 0.4) });
}
/** A suitcase with straps. */
export function suitcase(p, x, y, w, h, c, o = {}) {
    p.rr(x, y, w, h, 5, { c: lt(c, 0.16), c2: dk(c, 0.54), m: 0.14, s: 0.18 });
    p.rect(x, y + h * 0.42, w, 2, { c: dk(c, 0.4), a: 0.7 });
    for (const q of [0.22, 0.78]) { p.rect(x + w * q - 5, y, 10, h, { c: dk("#a97a48", 0.8), c2: dk("#a97a48", 0.55), wob: 0.2 }); p.rr(x + w * q - 6, y + h * 0.42 - 3, 12, 8, 2, { c: BRASS, c2: dk(BRASS, 0.5) }); }
    if (o.handle !== false) p.line([[x + w * 0.4, y], [x + w * 0.42, y - 7], [x + w * 0.58, y - 7], [x + w * 0.6, y]], 3, { c: dk("#a97a48", 0.6) });
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.ell(x + a * w + (a ? -5 : 5), y + b * h + (b ? -5 : 5), 5, 5, { c: BRASS, c2: dk(BRASS, 0.5) });
}
/** A wall clock with hands at a given time, in a wooden case. */
export function clock(p, x, y, r, hh = 7, mm = 40, o = {}) {
    p.ell(x, y, r + 7, r + 7, { c: lt(WOOD, 0.1), c2: dk(WOOD, 0.5) });
    p.ell(x, y, r + 2, r + 2, { c: BRASS, c2: dk(BRASS, 0.5) });
    p.ell(x, y, r, r, { c: o.face ?? "#f4e9cf", c2: "#cdbb92", m: 0.06 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; p.line([[x + Math.sin(a) * r * 0.82, y - Math.cos(a) * r * 0.82], [x + Math.sin(a) * r * 0.94, y - Math.cos(a) * r * 0.94]], i % 3 ? 1 : 2, { c: INK }); }
    const ma = mm / 60 * Math.PI * 2, ha = ((hh % 12) + mm / 60) / 12 * Math.PI * 2;
    p.line([[x, y], [x + Math.sin(ha) * r * 0.5, y - Math.cos(ha) * r * 0.5]], [2.8, 1.2], { c: INK });
    p.line([[x, y], [x + Math.sin(ma) * r * 0.76, y - Math.cos(ma) * r * 0.76]], [2, 0.8], { c: INK });
    p.ell(x, y, 2.4, 2.4, { c: INK });
}
/** The wren: small, round, tail cocked straight up. s about 1 is 34 units long. */
export function wren(p, x, y, s = 1, o = {}) {
    const f = o.flip ? -1 : 1, X = (a) => x + a * f * s, Y = (b) => y + b * s, c = o.c ?? "#8a5a30", c2 = o.c2 ?? "#4e3019";
    p.line([[X(-1), Y(13)], [X(-2), Y(20)]], 1.2 * s, { c: "#3c2616" }); p.line([[X(4), Y(13)], [X(4), Y(20)]], 1.2 * s, { c: "#3c2616" });
    p.line([[X(-11), Y(2)], [X(-16), Y(-11)], [X(-17), Y(-20)]], [6 * s, 3 * s], { c: c2 });
    p.ell(X(0), Y(3), 14 * s, 11 * s, { c, c2, wob: 0.2 });
    p.ell(X(10), Y(-5), 8 * s, 7 * s, { c, c2, wob: 0.2 });
    p.ell(X(0), Y(7), 10 * s, 6 * s, { c: "#c79a64", a: 0.75, wob: 0.2 });
    p.poly([[X(17), Y(-7)], [X(24), Y(-5)], [X(17), Y(-3)]], { c: "#2c1d12", wob: 0 });
    p.line([[X(4), Y(-9)], [X(16), Y(-9)]], 1.4 * s, { c: "#e6d2a4", a: 0.8 });
    p.ell(X(12), Y(-6), 1.5 * s, 1.5 * s, { c: "#0d0806", wob: 0 });
    for (let i = 0; i < 4; i++) p.line([[X(-10 + i * 4), Y(-2)], [X(-8 + i * 4), Y(4)]], 0.9 * s, { c: c2, a: 0.7 });
}
/** A hanging coat. */
export function coat(p, x, y, c = "#34405a") {
    p.ell(x, y, 5, 5, { c: BRASS, c2: dk(BRASS, 0.5) });
    p.poly([[x - 14, y + 6], [x + 14, y + 6], [x + 34, y + 30], [x + 42, y + 134], [x + 18, y + 142], [x, y + 148], [x - 22, y + 142], [x - 42, y + 134], [x - 34, y + 30]], { c: lt(c, 0.16), c2: dk(c, 0.56), s: 0.3, sd: "v", m: 0.14, wob: 1 });
    p.poly([[x - 12, y + 6], [x, y + 46], [x + 12, y + 6], [x + 18, y + 18], [x, y + 66], [x - 18, y + 18]], { c: dk(c, 0.7), c2: dk(c, 0.5) });
    p.line([[x, y + 60], [x, y + 146]], 1.6, { c: dk(c, 0.4) });
    for (let i = 0; i < 3; i++) p.ell(x + 5, y + 76 + i * 22, 2.6, 2.6, { c: BRASS });
    p.rr(x + 11, y + 96, 22, 16, 2, { c: dk(c, 0.62), c2: dk(c, 0.42) });
}
/** A small framed picture; `fill(p, x, y, w, h)` paints inside it. */
export function framed(p, x, y, w, h, fill, o = {}) {
    p.rect(x - 2, y + 2, w + 8, h + 8, { c: "#000000", a: 0.3 });
    p.rr(x - 4, y - 4, w + 8, h + 8, 2, { c: o.frame ?? BRASS, c2: dk(o.frame ?? BRASS, 0.45) });
    p.rect(x, y, w, h, { c: o.bg ?? PAPER, c2: dk(o.bg ?? PAPER, 0.8), wob: 0.2 });
    if (fill) fill(p, x, y, w, h);
}
/** A paper label, pinned. */
export function label(p, x, y, w, h, rot = 0.03) {
    const c = Math.cos(rot), s = Math.sin(rot), pt = (a, b) => [x + a * c - b * s, y + a * s + b * c];
    p.poly([pt(1, 2), pt(w + 2, 2), pt(w + 2, h + 2), pt(1, h + 2)], { c: "#000000", a: 0.3, wob: 0.2 });
    p.poly([pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)], { c: "#f5edd8", c2: "#dccfae", wob: 0.3 });
    p.ell(pt(w / 2, 3)[0], pt(w / 2, 3)[1], 1.8, 1.8, { c: OX });
}
export { hash, rgb };
/** A bench against the wall, facing you, buttoned, with arms. */
export function bench(p, x, w, c, o = {}) {
    const top = o.top ?? 252, B = WORLD.wallBot + 16;
    p.ell(x + w / 2, B + 6, w / 2 + 26, 10, { c: "#000000", a: 0.42, wob: 0.4 });
    p.rr(x + 6, top, w - 12, 62, 12, { c: lt(c, 0.2), c2: dk(c, 0.62), m: 0.14, s: 0.06 });
    const n = Math.round((w - 40) / 46);
    for (let i = 0; i <= n; i++) for (let j = 0; j < 2; j++) { const bx = x + 20 + (i + (j % 2) * 0.5) * (w - 40) / n, by = top + 18 + j * 22; if (bx > x + w - 16) continue; p.line([[bx - 13, by - 8], [bx, by], [bx + 13, by - 8]], 1.5, { c: dk(c, 0.5), a: 0.55 }); p.line([[bx - 13, by + 8], [bx, by], [bx + 13, by + 8]], 1.5, { c: lt(c, 0.3), a: 0.25 }); p.ell(bx, by, 2.8, 2.8, { c: dk(c, 0.42) }); }
    p.rr(x + 2, top + 54, w - 4, 30, 9, { c: lt(c, 0.34), c2: dk(c, 0.74), m: 0.12 });
    p.rr(x + 8, top + 80, w - 16, B - top - 88, 3, { c: dk(c, 0.6), c2: dk(c, 0.34), s: 0.3, sd: "v" });
    for (const ax of [x - 8, x + w - 14]) { p.rr(ax, top + 26, 22, 72, 9, { c: lt(WOOD, 0.14), c2: dk(WOOD, 0.5), s: 0.24, sd: "v" }); p.ell(ax + 11, top + 30, 10, 5, { c: lt(WOOD, 0.3), c2: WOOD }); }
    for (const fx of [x + 10, x + w - 20]) p.rect(fx, B - 10, 10, 12, { c: dk(WOOD, 0.5) });
}
/** A thin shelf with brackets. */
export function shelf(p, x, y, w, c = WOOD) { p.rect(x + 2, y + 8, w, 4, { c: "#000000", a: 0.3 }); p.rect(x, y, w, 7, { c: lt(c, 0.22), c2: dk(c, 0.56) }); for (const q of [x + 12, x + w - 16]) p.poly([[q, y + 7], [q + 5, y + 7], [q + 5, y + 22]], { c: dk(c, 0.5) }); }
/** Rough pencil line, for the unfinished end of the train. */
export function pencil(p, pts, c = "#6a6456", n = 2) { for (let i = 0; i < n; i++) p.line(pts.map(([x, y], k) => [x + (hash(k, i) - 0.5) * 2.2, y + (hash(i, k) - 0.5) * 2.2]), 0.9, { c, a: 0.55 + i * 0.1, wob: 0.6, m: 0 }); }
