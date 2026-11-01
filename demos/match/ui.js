// Logo, buttons, icons and the small HUD drawing shared by every screen.
import { button } from "./pogo.js";
import { INK as INKV, Painter, arc, hex, mix3, stroke, teeth, union } from "./sdf.js";
import { FONT, INK, inkText } from "./boardview.js";
import { SHEET, SLOT, frameFor } from "./art.js";
import { CANDY } from "./engine.js";

const LW = 150, LH = 170;
const P = Math.PI;
const SHAPES = {
    S: [[...arc(75, 58, 42, 33, -0.25, -P * 1.5, 10), ...arc(75, 113, 42, 30, -P / 2, P + 0.25, 10)]],
    U: [[[32, 26], [32, 96], ...arc(75, 100, 43, 44, P, 0, 8), [118, 96], [118, 26]]],
    G: [[...arc(79, 84, 49, 60, -0.75, -P * 2 + 0.05, 14), [84, 90]]],
    A: [[[24, 144], [75, 24], [126, 144]], [[44, 106], [106, 106]]],
    R: [[[36, 144], [36, 26], [76, 26], ...arc(76, 57, 36, 31, -P / 2, P / 2, 8), [36, 88]], [[72, 88], [114, 144]]],
    C: [arc(82, 84, 52, 60, -0.72, -P * 2 + 0.72, 12)],
    H: [[[34, 26], [34, 144]], [[116, 26], [116, 144]], [[34, 86], [116, 86]]],
};
const LETTERS = ["S", "U", "G", "A", "R", "C", "R", "A", "S", "H"];
const COLOURS = ["#ff3f6e", "#ff8f26", "#ffd426", "#3fd84a", "#2c9bff", "#ff3f6e", "#ff8f26", "#ffd426", "#3fd84a", "#b44dff"];
const SMALL = 14;

/** Letters are drawn a little small so the fat outline never touches the edge of their cell. */
const letter = (ch) => {
    const f = union(...SHAPES[ch].map((pts) => stroke(pts, SMALL + 6))), k = 0.86;
    return (x, y) => f(75 + (x - 75) / k, 85 + (y - 85) / k) * k;
};

export function paintLogo(assets) {
    assets.paint("logo", LW * 11, LH, (px, f) => {
        const p = new Painter(px.data, LW * 11, LH);
        LETTERS.forEach((ch, n) => {
            p.cell(n * LW, 0, LW, LH);
            const col = hex(COLOURS[n]), deep = mix3(col, hex("#70104a"), 0.5), light = mix3(col, [1, 1, 1], 0.55);
            const f0 = letter(ch);
            const lit = (x, y, d) => mix3(mix3(deep, col, Math.min(1, d * 1.8)), light, Math.max(0, (y - 90) / 120));
            p.shape(f0, { color: lit, bevel: 16, gloss: 1, glow: 0.8, inkW: 7, ink: INKV });
        });
        // The H after he has been at it.
        p.cell(10 * LW, 0, LW, LH);
        const col = hex(COLOURS[9]), deep = mix3(col, hex("#70104a"), 0.5);
        p.shape(letter("H"), { color: (x, y, d) => mix3(deep, col, Math.min(1, d * 1.8)), bevel: 16, gloss: 1, glow: 0.8, inkW: 7, ink: INKV });
        p.bite(teeth(112, 62, 44, 0.4, 6), { inkW: 6 });
        p.bite(teeth(36, 128, 26, 1.2, 5), { inkW: 6 });
    }, { smooth: true });
    assets.grid("logo", 11, 1);
}

/** Two stacked wobbling words. `h` is the height of one letter row. */
export function drawLogo(d, x, y, h, t, finished) {
    const lw = h * LW / LH * 0.8, rows = [[0, 5], [5, 10]];
    rows.forEach(([a, b], row) => {
        const n = b - a, y0 = y + (row - 0.5) * h * 0.92;
        for (let i = a; i < b; i++) {
            const k = i - a, wob = Math.sin(t * 2.6 + i * 0.9), px = x + (k - (n - 1) / 2) * lw, py = y0 + wob * h * 0.022;
            const eaten = finished && i === 9;
            d.push(); d.translate(px, py + h / 2); d.rotate(wob * 0.03 + (eaten ? 0.16 : 0)); d.scale(1 + wob * 0.022, 1 - wob * 0.022);
            d.sprite("logo", { frame: eaten ? 10 : i, x: 0, y: -h / 2, width: h * LW / LH, height: h });
            d.pop();
        }
    });
}

/** A fat jelly button with a real press. */
export function jelly(label, o = {}) {
    const base = button(label, o), fill = o.color ?? "#ff4f8a", deep = o.deep ?? "#b81e62", ink = o.textColor ?? "#fff", size = o.textSize ?? 20;
    return {
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = o.radius ?? 18, press = e._pressed ? 3 : 0;
            d.rect(w + 7, h + 11, { y: 3, color: INK, radius: r + 4 });
            d.rect(w, h + 4, { y: 2, color: deep, radius: r });
            d.rect(w, h - 2, { y: press - 2, color: fill, radius: r });
            d.rect(w - 14, h * 0.32, { y: press - h * 0.25, color: "#ffffff", opacity: 0.32, radius: h * 0.16 });
            d.text(label, { y: press + 0.5, size, bold: true, font: FONT, color: "#00000040" });
            d.text(label, { y: press - 1.5, size, bold: true, font: FONT, color: ink });
        },
    };
}

export function roundIcon(d, color, on = true) {
    d.circle(23, { color: INK, y: 1.5 }); d.circle(20, { color: on ? color : "#8f8499" });
    d.rect(24, 9, { y: -10, color: "#ffffff", opacity: 0.3, radius: 5 });
}
export const iconPause = (d) => { d.rect(6, 19, { x: -6, color: "#fff", radius: 2 }); d.rect(6, 19, { x: 6, color: "#fff", radius: 2 }); };
export const iconSound = (d, on) => {
    d.poly([[-11, -4], [-5, -4], [2, -10], [2, 10], [-5, 4], [-11, 4]], { color: "#fff" });
    if (on) for (const [a, b] of [[[6, -5], [9, -8]], [[7, 0], [12, 0]], [[6, 5], [9, 8]]]) d.line(a, b, { width: 2.4, color: "#fff" });
    else { d.line([6, -5], [13, 5], { width: 2.6, color: "#ffd0d8" }); d.line([13, -5], [6, 5], { width: 2.6, color: "#ffd0d8" }); }
};
export const iconBuzz = (d, on) => {
    d.rect(13, 23, { color: "#fff", radius: 3 }); d.rect(8, 15, { y: -1, color: on ? "#2fb8a8" : "#8f8499", radius: 1 });
    for (const sg of [-1, 1]) { d.line([sg * 10, -6], [sg * 13, -2], { width: 2.2, color: "#fff" }); d.line([sg * 13, -2], [sg * 10, 2], { width: 2.2, color: "#fff" }); d.line([sg * 10, 2], [sg * 13, 6], { width: 2.2, color: "#fff" }); }
    if (!on) d.line([-15, -13], [15, 13], { width: 2.6, color: "#ffd0d8" });
};
export const iconBack = (d) => { d.line([5, -9], [-5, 0], { width: 4, color: "#fff" }); d.line([-5, 0], [5, 9], { width: 4, color: "#fff" }); };
export const iconHome = (d) => { d.poly([[-13, 1], [0, -12], [13, 1]], { color: "#fff" }); d.rect(17, 13, { y: 6, color: "#fff", radius: 2 }); };
export const iconNext = (d) => { d.line([-5, -9], [5, 0], { width: 4, color: "#fff" }); d.line([5, 0], [-5, 9], { width: 4, color: "#fff" }); };

/** The little picture for a goal. */
export function goalIcon(d, g, x, y, size) {
    const sp = (frame, s = 1) => d.sprite(SHEET, { frame, x, y, width: size * s, height: size * s });
    switch (g.t) {
        case "c": sp(frameFor(CANDY, g.c)); break;
        case "frost": sp(SLOT.frost(1), 0.92); break;
        case "cookie": sp(SLOT.cookie(1), 0.92); break;
        case "fudge": sp(SLOT.fudge(0), 0.9); break;
        case "mallow": sp(SLOT.mallow); break;
        case "cage": sp(SLOT.candy(4), 0.8); sp(SLOT.cage, 0.92); break;
        case "folk": sp(SLOT.folk(0)); break;
    }
}

export function sayBubble(d, x, y, text, side = 0, w = 190) {
    const lines = Math.ceil(text.length / (w / 8)), h = 14 + lines * 16;
    d.rect(w + 5, h + 5, { x, y, color: INK, radius: 14 });
    d.rect(w, h, { x, y, color: "#fffdf6", radius: 12 });
    if (side) { const tx = x + side; d.poly([[tx - 9, y + h / 2 - 1], [tx + 9, y + h / 2 - 1], [tx, y + h / 2 + 12]], { color: INK }); d.poly([[tx - 6, y + h / 2 - 2], [tx + 6, y + h / 2 - 2], [tx, y + h / 2 + 8]], { color: "#fffdf6" }); }
    d.text(text, { x, y, size: 13.5, bold: true, font: FONT, color: INK, maxWidth: w - 18, align: "center", lineHeight: 1.18 });
}

export { inkText };
