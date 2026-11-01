// Small paper-and-ink interface kit. The framework's button has a fixed font and look, so the garden has its own.
import { layer, pos, tap, ui } from "./pogo.js";
import { spr } from "./art.js";

export const FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Noto Serif", serif';
export const INK = "#38261c", PAPER = "#f6ecd2";

/** Text centred on x. Wrap with maxWidth. fit shrinks a one-liner to a width. */
export function txt(d, str, x, y, size, color, bold = false, maxWidth = 0, fit = 0, opacity = 1) {
    if (fit) { const est = String(str).length * size * (bold ? 0.56 : 0.5); if (est > fit) size = Math.max(9, size * fit / est); }
    d.text(str, { x, y, size, color, bold, font: FONT, maxWidth, align: "center", lineHeight: 1.18, opacity });
}
const widths = new Map();
export function textL(game, d, str, x, y, size, color, bold = false) {
    const key = `${str}|${size}|${bold}`;
    let w = widths.get(key);
    if (w === undefined) { w = game.renderer.measureText(String(str), { size, font: FONT, bold, align: "left", maxWidth: 0, lineHeight: 1.2 }).width; if (widths.size > 400) widths.clear(); widths.set(key, w); }
    d.text(str, { x: x + w / 2, y, size, color, bold, font: FONT });
}

/** A rounded paper card with an inked edge and a soft drop. */
export function card(d, x, y, w, h, fill, radius = 8, opacity = 1) {
    d.rect(w + 3, h + 3, { x: x + 1, y: y + 2.5, color: "#2a1c14", radius: radius + 1, opacity: 0.25 * opacity });
    d.rect(w + 2.5, h + 2.5, { x, y, color: INK, radius: radius + 1, opacity });
    d.rect(w, h, { x, y, color: fill, radius, opacity });
}

/** A tappable button: paper or coloured card, with a label, an icon, or custom art. */
export function btn(game, s, o) {
    const e = s.add([ui(), pos(-999, -999), layer(o.layer ?? 5), tap(o.onTap), {
        name: o.name,
        update(_dt, self) {
            const vis = !o.visible || !!o.visible();
            self.hidden = !vis;
            if (vis && o.action && s.input.pressed(o.action) && self._bornStep !== game.stepCount) self.emit("tap");
        },
        draw(d, self) {
            const w = self.size.x, h = self.size.y, press = self._pressed;
            if (press) d.scale(0.95, 0.95);
            if (o.ink) { card(d, 0, 0, w, h, o.fill ?? PAPER, o.radius ?? 9); }
            else {
                d.rect(w + 2.5, h + 2.5, { y: 2, color: "#2a1c14", radius: (o.radius ?? 9) + 1, opacity: 0.32 });
                d.rect(w + 2.5, h + 2.5, { color: INK, radius: (o.radius ?? 9) + 1 });
                d.rect(w, h, { color: o.fill ?? "#7f9e5a", radius: o.radius ?? 9 });
                d.rect(w - 6, h * 0.42, { y: -h * 0.22, color: "#ffffff", radius: 6, opacity: 0.1 });
            }
            if (o.icon) spr(d, o.icon, o.frame ?? 0, 0, 0, Math.min(w, h) * 0.62);
            const label = o.labelFn ? o.labelFn() : o.label;
            if (label) txt(d, label, 0, 0, o.size ?? (h >= 46 ? 17 : 14), o.ink ? INK : "#fff6e0", true, 0, w - 12);
            if (o.art) o.art(d, self);
        },
    }]);
    e.size.set(o.w, o.h, 0);
    e.hidden = !!o.visible && !o.visible();
    return e;
}
