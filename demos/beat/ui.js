// Shared bits of interface. All of it bops.
import { button, pin } from "./pogo.js";
import { letters, measure } from "./art/font.js";
import { P } from "./art/props.js";

const INK = "#1b1423";

/** A chunky lettered button that dances. Keeps Pogo's button() for taps, keys and haptics. */
export function chunky(game, clock, s, label, o) {
    const w = o.width ?? 200, h = o.height ?? 58, fill = o.color ?? "#8fd13f", size = o.size ?? Math.min(h * 0.56, (w - 24) / Math.max(1, measure(label, 1)));
    const comps = [
        button(label, { width: w, height: h, action: o.action, color: fill, textColor: fill, textSize: 12, onTap: () => { game.haptic("light"); o.onTap?.(); } }),
        {
            draw(d, e) {
                const b = clock.bop(), k = 1 + (o.quiet ? 0.012 : 0.03) * b.pulse;
                d.push(); d.scale(k, k * (1 - 0.01 * b.kick));
                const col = o.disabled?.() ? "#6a6480" : (o.colorFn?.() ?? fill), dn = e._pressed ? 3 : 0;
                d.rect(w + 6, h + 6, { y: 5, color: INK, radius: 18 });
                d.rect(w + 6, h + 6, { color: INK, radius: 18, y: dn });
                d.rect(w, h, { color: col, radius: 15, y: dn });
                d.rect(w - 10, h * 0.42, { color: "#ffffff", opacity: 0.2, radius: 10, y: dn - h * 0.2 });
                if (o.icon !== undefined) d.sprite("props", { frame: o.icon, width: h * 0.62, height: h * 0.62, x: label ? -w / 2 + h * 0.42 : 0, y: dn, flipX: o.flip });
                if (label) letters(d, label, o.icon !== undefined ? h * 0.2 : 0, dn, { size, color: o.textColor ?? "#fff7d6", ink: INK, phase: b.phase });
                if (o.sub) d.text(o.sub(), { y: h / 2 - 10 + dn, size: 11, bold: true, color: "#1b1423" });
                d.pop();
            },
        },
    ];
    if (o.at) comps.push(pin(o.at[0], o.at[1]));
    return s.add(comps);
}

/** Painted background: fits the venue so its horizon lands on y. */
export function drawStage(d, name, v, horizon, o = {}) {
    const zoom = o.zoom ?? 1, k = Math.max(v.width / 840, horizon / 420) * zoom, gw = Math.max(v.width, 840 * Math.min(1, k)) * zoom, gh = v.height - horizon + 2;
    d.sprite(name, { x: v.width / 2, y: horizon - 210 * k, width: 840 * k, height: 420 * k, color: o.color });
    d.sprite(name.replace("stage_", "ground_"), { x: v.width / 2, y: horizon + gh / 2 - 1, width: gw, height: gh, color: o.color });
}

/** A speech bubble with a tail pointing down at (tx, ty). Word-wraps by Pogo's text. */
export function bubble(d, str, x, y, w, o = {}) {
    const size = o.size ?? 15, lines = Math.ceil(str.length * size * 0.52 / (w - 28)) + (o.extra ?? 0), h = lines * size * 1.32 + 24;
    d.rect(w + 6, h + 6, { x, y, color: INK, radius: 18 });
    if (o.tail) d.poly([[o.tail[0] - 12, y + h / 2 - 2], [o.tail[0] + 12, y + h / 2 - 2], [o.tail[1], y + h / 2 + 18]], { color: INK });
    d.rect(w, h, { x, y, color: "#fff7d6", radius: 15 });
    if (o.tail) d.poly([[o.tail[0] - 8, y + h / 2 - 3], [o.tail[0] + 8, y + h / 2 - 3], [o.tail[1], y + h / 2 + 12]], { color: "#fff7d6" });
    d.text(str, { x, y, size, bold: true, color: INK, maxWidth: w - 28, align: "center", lineHeight: 1.3 });
    return h;
}

export const gradeColor = (g) => ({ "S+": "#ffe27a", S: "#ffc93c", A: "#7dffb0", B: "#6ae8ff", C: "#c7a8ff", D: "#ff8a8a" }[g] ?? "#fff7d6");

export function drawStars(d, n, x, y, size, of = 3) {
    for (let i = 0; i < of; i++) d.sprite("props", { frame: P.star, x: x + (i - (of - 1) / 2) * size * 0.95, y, width: size, height: size, color: i < n ? "#ffffff" : "#2a2438", opacity: i < n ? 1 : 0.55 });
}
