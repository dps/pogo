// Toy-plastic interface parts. One component does every button: a chunky key with a lip that sinks when pressed.
import { color } from "./pogo.js";

export const FONT = "'Arial Rounded MT Bold', ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif";
export const INK = "#2a2233";
export const PAPER = "#fff7e8";
export const PAL = { blue: "#2f9be0", green: "#46b85a", red: "#e2553f", gold: "#f4b63a", plum: "#8b5fc7", grey: "#6f7488", cream: "#f3e4c6" };

/** A button that can change its label, icon and colour after it's made. */
export const toy = (label, o = {}) => ({
    id: "button",
    buttonLabel: label,
    cap: label, icon: o.icon ?? null, tint: o.color ?? PAL.blue, disabled: false, glow: 0, small: o.small ?? null,
    setup(e) {
        e.size.set(o.width ?? 96, o.height ?? 46, 0);
        e.tappable = { pad: 0 };
        e._isButton = true;
        e.on("tap", () => { if (e.disabled) return; e.scene.game.haptics._auto?.("light"); o.onTap?.(); });
    },
    update(dt, e) {
        const goal = e._pressed && !e.disabled ? 0.95 : 1;
        e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24); e.scale.y = e.scale.x;
        e.t = (e.t ?? 0) + dt;
        if (o.action && !e.hidden && !e.disabled && e._bornStep !== e.scene.game.stepCount && e.scene.game.input._quiet(o.action)) e.emit("tap");
    },
    draw(d, e) {
        const w = e.size.x, h = e.size.y, r = o.radius ?? 13, f = color(e.disabled ? "#8f8a94" : e.tint), press = e._pressed && !e.disabled ? 2 : 0;
        if (e.glow && !e.disabled) { const k = 0.5 + Math.sin(e.t * 6) * 0.5; d.rect(w + 8 + k * 5, h + 8 + k * 5, { color: "#fff1b0", radius: r + 5, opacity: 0.35 + k * 0.4 }); }
        d.rect(w + 3, h + 3, { y: 3, color: INK, radius: r + 1 });
        d.rect(w, h, { y: 3, color: f.lerp("#000000", 0.34), radius: r });
        d.rect(w, h, { y: press, color: f, radius: r });
        d.rect(w - 8, h * 0.42, { y: press - h * 0.22, color: f.lerp("#ffffff", 0.22), radius: r - 4, opacity: 0.8 });
        const lab = e.cap, sz = o.textSize ?? 15, ink = e.disabled ? "#d6d2d8" : o.textColor ?? "#ffffff";
        if (e.icon && lab) {
            const icon = o.iconSize ?? 15;
            d.sprite(e.icon, { x: -w / 2 + icon / 2 + 5, y: press, width: icon, height: icon, opacity: e.disabled ? 0.6 : 1 });
            d.text(lab, { x: icon * 0.5 + 1, y: press + 1, size: sz, bold: true, font: FONT, color: "#00000044" });
            d.text(lab, { x: icon * 0.5 + 1, y: press, size: sz, bold: true, font: FONT, color: ink });
        } else if (e.icon) {
            const icon = o.iconSize ?? Math.min(w, h) * 0.55;
            d.sprite(e.icon, { y: press, width: icon, height: icon, opacity: e.disabled ? 0.6 : 1 });
        } else {
            d.text(lab, { y: press + 1, size: sz, bold: true, font: FONT, color: "#00000044" });
            d.text(lab, { y: press, size: sz, bold: true, font: FONT, color: ink });
        }
        if (e.small) d.text(e.small, { y: press + h * 0.3, size: 10, bold: true, font: FONT, color: "#ffffffcc" });
    },
});

/** A card: ink edge, paper face. */
export function card(d, x, y, w, h, { fill = PAPER, r = 14, lip = 3, opacity = 1, edge = INK } = {}) {
    d.rect(w + 4, h + 4, { x, y: y + lip, color: edge, radius: r + 2, opacity });
    d.rect(w, h, { x, y, color: fill, radius: r, opacity });
}
export const label = (d, s, x, y, size, col = INK, bold = true, extra = {}) => d.text(s, { x, y, size, bold, font: FONT, color: col, ...extra });
export function outlined(d, s, x, y, size, col = "#fff", edge = INK, w = 2, extra = {}) {
    for (const [a, b] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, w], [w, -w], [-w, w], [0, w + 1], [w, w + 1], [-w, w + 1]]) d.text(s, { x: x + a, y: y + b, size, bold: true, font: FONT, color: edge, ...extra });
    d.text(s, { x, y, size, bold: true, font: FONT, color: col, ...extra });
}
/** Text starting at x: d.text always centres, so measure first. */
export function left(game, d, s, x, y, size, col = INK, bold = true) {
    const w = game.renderer.measureText(s, { size, font: FONT, bold, align: "left", maxWidth: 0, lineHeight: 1.2 }).width;
    d.text(s, { x: x + w / 2, y, size, bold, font: FONT, color: col });
    return w;
}
export function wrap(s, chars) {
    const out = []; let line = "";
    for (const w of s.split(" ")) { if ((line + " " + w).trim().length > chars) { out.push(line); line = w; } else line = (line + " " + w).trim(); }
    if (line) out.push(line);
    return out;
}
