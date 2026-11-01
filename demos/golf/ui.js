// Shared HUD pieces: lettering, chunky buttons, and the rebuild-on-resize screen helper.
export const FONT = '"Arial Rounded MT Bold","Avenir Next","Trebuchet MS",system-ui,sans-serif';
export const CREAM = "#fff6e6", INK = "#14304f";
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Sticker lettering: thick ink, light face. */
export function sticker(d, str, x, y, size, col = CREAM, ink = INK, o = {}) {
    const w = Math.max(1.4, size * (o.w ?? 0.085)), n = 10;
    if (o.opacity === 0) return;
    const op = o.opacity ?? 1, rot = o.rot ?? 0;
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; d.text(str, { x: x + Math.cos(a) * w, y: y + Math.sin(a) * w + size * 0.04, size, bold: true, font: FONT, color: ink, opacity: op, rot }); }
    d.text(str, { x, y, size, bold: true, font: FONT, color: col, opacity: op, rot });
}

export function panel(d, x, y, w, h, o = {}) {
    const r = o.radius ?? 18;
    d.rect(w + 6, h + 6, { x, y: y + 2, color: o.ink ?? INK, radius: r + 3, opacity: o.opacity ?? 0.9 });
    d.rect(w, h, { x, y, color: o.color ?? "#fff6e6", radius: r, opacity: o.opacity ?? 1 });
}

/** A fat, shiny, tappable button. opts: x, y, w, h, color, ink, size, onTap, action, icon(d), sub, locked */
export const fatButton = (label, o) => ({
    id: "fat",
    buttonLabel: label,
    setup(e) {
        e.size.set(o.w ?? 180, o.h ?? 56, 0);
        e.tappable = { pad: 0 }; e._isButton = true; e.ui = true;
        e.pop = 0; e.t = 0;
        e.on("tap", () => { e.pop = 1; if (o.onTap) o.onTap(e); });
        if (o.pin) return;
    },
    update(dt, e) {
        e.t += dt; e.pop = Math.max(0, e.pop - dt * 5);
        const goal = (e._pressed ? 0.94 : 1) + e.pop * 0.1 + (o.pulse ? Math.sin(e.t * 4) * 0.02 : 0);
        e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24); e.scale.y = e.scale.x;
        if (o.action && !e.hidden && e._bornStep !== e.scene.game.stepCount && e.scene.game.input._quiet(o.action)) e.emit("tap");
    },
    draw(d, e) {
        const w = e.size.x, h = e.size.y, r = o.radius ?? Math.min(18, h / 2), col = o.color ?? "#ffc53d", off = e._pressed ? 2 : 0, on = typeof o.on === "function" ? o.on() : o.on;
        d.rect(w + 5, h + 8, { y: 3, color: INK, radius: r + 2 });
        d.rect(w, h, { y: 4, color: o.dark ?? "#d17f12", radius: r });
        d.rect(w, h - 2, { y: off - 1, color: o.hot?.() ? "#ffc53d" : on === false ? "#7d8aa0" : col, radius: r });
        d.rect(w - 12, h * 0.34, { y: off - h * 0.24, color: "#ffffff", opacity: 0.28, radius: r * 0.6 });
        const lab = typeof o.label === "function" ? o.label() : label;
        if (o.icon) o.icon(d, off);
        if (lab) d.text(lab, { x: o.tx ?? 0, y: off + (o.sub ? -8 : 0), size: o.size ?? 20, bold: true, font: FONT, color: o.ink ?? INK });
        if (o.sub) d.text(o.sub, { y: off + 12, size: o.subSize ?? 12, bold: true, font: FONT, color: o.ink ?? INK, opacity: 0.75 });
    },
});

export function screen(s, build) {
    let items = [];
    const add = (...c) => { const e = s.add(c); items.push(e); return e; };
    const redo = () => { for (const e of items) e.destroy(); items = []; build(add, s.view); };
    redo();
    s.on("resize", redo);
    return redo;
}
