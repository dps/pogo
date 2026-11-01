// Shared UI pieces: chunky buttons, settings, the page's fonts.
import { button, rect, tap } from "./pogo.js";
export const FONT = '"Arial Rounded MT Bold",ui-rounded,system-ui,sans-serif';
export const DISPLAY = '"Arial Black","Arial Rounded MT Bold",Impact,system-ui,sans-serif';
export const INK = "#241a2c", CREAM = "#fff1d6", RED = "#e8472e", GOLD = "#ffc23c", TEAL = "#2fa7a0";

export function chunky(label, o = {}) {
    const base = button(typeof label === "function" ? " " : label, o), fill = o.color ?? RED, ink = o.textColor ?? CREAM, size = o.textSize ?? 18;
    return { ...base, draw(d, e) {
        const w = e.size.x, h = e.size.y, r = o.radius ?? 14, press = e._pressed ? 3 : 0, t = typeof label === "function" ? label() : (e.label2 ?? label);
        d.rect(w + 6, h + 8, { y: 3, color: INK, radius: r + 3 });
        d.rect(w, h, { y: press, color: fill, radius: r });
        d.rect(w - 10, h * 0.38, { y: press - h * 0.22, color: "#ffffff", opacity: 0.2, radius: r - 5 });
        d.text(t, { y: press + 1.5, size, bold: true, font: DISPLAY, color: "#00000044" });
        d.text(t, { y: press, size, bold: true, font: DISPLAY, color: ink });
    } };
}

export function drawSoundIcon(d, on) {
    d.poly([[-10, -4], [-5, -4], [2, -10], [2, 10], [-5, 4], [-10, 4]], { color: CREAM });
    if (on) { d.line([6, -5], [9, -8], { width: 2.4, color: CREAM }); d.line([7, 0], [12, 0], { width: 2.4, color: CREAM }); d.line([6, 5], [9, 8], { width: 2.4, color: CREAM }); }
    else { d.line([6, -5], [13, 5], { width: 2.6, color: "#ffb0a0" }); d.line([13, -5], [6, 5], { width: 2.6, color: "#ffb0a0" }); }
}
export function drawHapticIcon(d, on, bg) {
    d.rect(13, 23, { color: CREAM, radius: 3 }); d.rect(8, 15, { y: -1, color: bg, radius: 1 });
    for (const sg of [-1, 1]) { const c = on ? CREAM : "#a39aa6"; d.line([sg * 10, -6], [sg * 13, -2], { width: 2.2, color: c }); d.line([sg * 13, -2], [sg * 10, 2], { width: 2.2, color: c }); d.line([sg * 10, 2], [sg * 13, 6], { width: 2.2, color: c }); }
    if (!on) d.line([-15, -13], [15, 13], { width: 2.6, color: "#ffb0a0" });
}
/** Icon toggle built from a tappable rect. */
export function iconToggle(s, comps, get, flip, icon) {
    return s.add([...comps, rect(50, 50, { color: "#00000000" }), tap(flip), { draw(d) {
        const on = get(), bg = on ? TEAL : "#6e6370";
        d.rect(44, 44, { color: INK, radius: 12 }); d.rect(38, 38, { color: bg, radius: 10 }); icon(d, on, bg);
    } }]);
}
