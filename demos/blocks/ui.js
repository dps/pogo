// Shared pieces of interface: fat buttons, icons, the painted night backdrop, panels.
import { button, pin, rect, tap } from "./pogo.js";

export const FONT = "ui-rounded, 'Arial Rounded MT Bold', 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif";
export const CREAM = "#fff1c9", INK = "#1a1538", PLUM = "#2a2560", MOON = "#ffe9b0", DIM = "#a7a2d6", HOT = "#ff6d5e", MINT = "#7be0b0", GOLD = "#ffc64f";

/** Text with a chunky ink shadow, so it reads over anything. */
export function inkText(d, s, x, y, size, color = CREAM, o = {}) {
    const w = Math.max(1.4, size * 0.09);
    if (o.plain) { d.text(s, { x, y, size, bold: o.bold ?? true, font: FONT, color, opacity: o.opacity, align: o.align }); return; }
    for (const [ax, ay] of [[-w, 0], [w, 0], [0, -w], [0, w * 1.5], [w, w], [-w, w]]) d.text(s, { x: x + ax, y: y + ay, size, bold: true, font: FONT, color: o.ink ?? INK, opacity: o.opacity, align: o.align });
    d.text(s, { x, y, size, bold: true, font: FONT, color, opacity: o.opacity, align: o.align });
}

/** A chunky pillow of a button with a real press. */
export function pillow(label, o = {}) {
    const base = button(label, { width: 180, height: 54, ...o }), fill = o.color ?? "#ff9d4d", deep = o.deep ?? "#c04f22", ink = o.textColor ?? INK, size = o.textSize ?? 21;
    return {
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = Math.min(h / 2, o.radius ?? 18), press = e._pressed ? 3 : 0;
            d.rect(w + 6, h + 9, { y: 2.5, color: INK, radius: r + 3 });
            d.rect(w, h + 3, { y: 1.5, color: deep, radius: r });
            d.rect(w, h - 3, { y: press - 2, color: fill, radius: r });
            d.rect(w - 16, Math.max(3, h * 0.16), { y: press - h * 0.28, color: "#ffffff", opacity: 0.35, radius: h * 0.08 });
            if (o.icon) o.icon(d, -w / 2 + h * 0.56, press - 1, h * 0.34, ink);
            d.text(e.label2 ?? label, { x: o.icon ? h * 0.24 : 0, y: press - (o.sub ? 8 : 2), size, bold: true, font: FONT, color: ink });
            if (o.sub) d.text(o.sub, { y: press + h * 0.2, size: 11.5, bold: true, font: FONT, color: ink, opacity: 0.72 });
        },
    };
}

// Icons are little vector drawings at x, y sized s.
export const icons = {
    sound(d, x, y, s, c, on = true) {
        d.poly([[x - s * 0.9, y - s * 0.3], [x - s * 0.4, y - s * 0.3], [x + s * 0.1, y - s * 0.8], [x + s * 0.1, y + s * 0.8], [x - s * 0.4, y + s * 0.3], [x - s * 0.9, y + s * 0.3]], { color: c });
        if (on) { d.line([x + s * 0.4, y - s * 0.4], [x + s * 0.4, y + s * 0.4], { width: s * 0.2, color: c }); d.line([x + s * 0.8, y - s * 0.65], [x + s * 0.8, y + s * 0.65], { width: s * 0.2, color: c }); }
        else { d.line([x + s * 0.35, y - s * 0.4], [x + s * 0.95, y + s * 0.4], { width: s * 0.22, color: c }); d.line([x + s * 0.95, y - s * 0.4], [x + s * 0.35, y + s * 0.4], { width: s * 0.22, color: c }); }
    },
    buzz(d, x, y, s, c, on = true) {
        d.rect(s * 0.9, s * 1.7, { x, y, color: c, radius: s * 0.2 });
        d.rect(s * 0.6, s * 1.2, { x, y: y - s * 0.06, color: INK, radius: s * 0.08 });
        if (on) for (const k of [-1, 1]) { d.line([x + k * s * 0.8, y - s * 0.5], [x + k * s * 1.05, y - s * 0.2], { width: s * 0.18, color: c }); d.line([x + k * s * 1.05, y - s * 0.2], [x + k * s * 0.8, y + s * 0.1], { width: s * 0.18, color: c }); d.line([x + k * s * 0.8, y + s * 0.1], [x + k * s * 1.05, y + s * 0.4], { width: s * 0.18, color: c }); }
        else d.line([x - s, y + s * 0.9], [x + s, y - s * 0.9], { width: s * 0.22, color: c });
    },
    pause(d, x, y, s, c) { d.rect(s * 0.42, s * 1.5, { x: x - s * 0.36, y, color: c, radius: s * 0.1 }); d.rect(s * 0.42, s * 1.5, { x: x + s * 0.36, y, color: c, radius: s * 0.1 }); },
    left(d, x, y, s, c) { d.poly([[x + s * 0.55, y - s * 0.75], [x + s * 0.55, y + s * 0.75], [x - s * 0.7, y]], { color: c }); },
    right(d, x, y, s, c) { d.poly([[x - s * 0.55, y - s * 0.75], [x - s * 0.55, y + s * 0.75], [x + s * 0.7, y]], { color: c }); },
    down(d, x, y, s, c) { d.poly([[x - s * 0.75, y - s * 0.55], [x + s * 0.75, y - s * 0.55], [x, y + s * 0.7]], { color: c }); },
    drop(d, x, y, s, c) { d.poly([[x - s * 0.7, y - s * 0.75], [x + s * 0.7, y - s * 0.75], [x, y + s * 0.35]], { color: c }); d.rect(s * 1.5, s * 0.26, { x, y: y + s * 0.72, color: c, radius: s * 0.1 }); },
    cw(d, x, y, s, c) {
        const pts = []; for (let i = 0; i <= 9; i++) { const a = -2.4 + i * 3.5 / 9; pts.push([x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7]); }
        for (let i = 0; i < 9; i++) d.line(pts[i], pts[i + 1], { width: s * 0.3, color: c });
        const e = pts[9]; d.poly([[e[0] - s * 0.48, e[1] - s * 0.12], [e[0] + s * 0.4, e[1] - s * 0.3], [e[0] - s * 0.1, e[1] + s * 0.55]], { color: c });
    },
    ccw(d, x, y, s, c) {
        const pts = []; for (let i = 0; i <= 9; i++) { const a = Math.PI + 2.4 - i * 3.5 / 9; pts.push([x + Math.cos(a) * s * 0.7, y + Math.sin(a) * s * 0.7]); }
        for (let i = 0; i < 9; i++) d.line(pts[i], pts[i + 1], { width: s * 0.3, color: c });
        const e = pts[9]; d.poly([[e[0] + s * 0.48, e[1] - s * 0.12], [e[0] - s * 0.4, e[1] - s * 0.3], [e[0] + s * 0.1, e[1] + s * 0.55]], { color: c });
    },
    hold(d, x, y, s, c) { d.rect(s * 1.5, s * 1.3, { x, y, color: c, radius: s * 0.25 }); d.rect(s * 1.05, s * 0.85, { x, y, color: INK, radius: s * 0.15 }); d.text("H", { x, y: y + s * 0.02, size: s * 0.8, bold: true, font: FONT, color: c }); },
};

/** A round icon toggle. */
export function roundIcon(s, anchor, off, draw, get, flip, size = 50) {
    return s.add([pin(anchor, off), rect(size, size, { color: "#00000000" }), tap(flip), {
        name: "toggle",
        draw(d) {
            const on = get ? get() : true;
            d.circle(size / 2 - 5, { color: INK, opacity: 0.85 });
            d.circle(size / 2 - 8, { color: on ? PLUM : "#3a3550" });
            draw(d, 0, 0, size * 0.2, on ? CREAM : DIM, on);
        },
    }]);
}

/** Stars, moon, hills. Called from the entity that draws the backdrop. */
export class Night {
    constructor(seed = 3) {
        this.stars = [];
        let a = seed * 9301 + 49297;
        const r = () => { a = (a * 9301 + 49297) % 233280; return a / 233280; };
        for (let i = 0; i < 60; i++) this.stars.push([r(), r() * 0.75, 0.6 + r() * 1.4, r() * 6]);
    }

    draw(d, v, t, o = {}) {
        const w = v.width, h = v.height, fx = d.quads("fx");
        for (const [x, y, s, p] of this.stars) { const k = (0.5 + 0.5 * Math.sin(t * 1.3 + p)) * (o.stars ?? 0.8); fx(x * w, y * h, s * 8, s * 8, 0, 10, 1, 0.95, 0.8, k * 0.8); }
        const mx = w * (o.moonX ?? 0.8), my = h * (o.moonY ?? 0.13), mr = Math.min(w, h) * (o.moonR ?? 0.13);
        d.sprite("glow", { x: mx, y: my, width: mr * 5, height: mr * 5, color: o.moonGlow ?? "#ffe9b0", opacity: 0.25 });
        d.sprite("moon", { x: mx, y: my, width: mr * 2.2, height: mr * 2.2 });
        const hy = h - (o.hillH ?? h * 0.34);
        d.sprite("hills", { x: w * 0.5, y: hy + (o.hillH ?? h * 0.34) * 0.5, width: w * 1.5, height: o.hillH ?? h * 0.34, color: o.far ?? "#28235f", opacity: 1 });
        d.sprite("hills", { x: w * 0.3, y: hy + (o.hillH ?? h * 0.34) * 0.72, width: w * 1.9, height: (o.hillH ?? h * 0.34) * 0.8, flipX: true, color: o.near ?? "#1a1745", opacity: 1 });
    }
}
