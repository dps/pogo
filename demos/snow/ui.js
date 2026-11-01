// Icons and little painted things for the HUD. The game has almost no words, so these carry the meaning.
import { button, color, rect, sprite, text, ui } from "./pogo.js";

const INK = "#4a4f7c", CREAM = "#fbf7ee";
function stroke(p, pts, w, col) { for (let i = 0; i + 1 < pts.length; i++) p.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w); for (const q of pts) p.circle(q[0], q[1], w / 2, col); }
const arc = (cx, cy, r, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * (i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

export function paintUI(a) {
    const icon = (name, fn) => a.paint(name, 96, 96, fn, { smooth: true });
    icon("ic_undo", (p) => { stroke(p, [...arc(50, 54, 22, -1.9, 2.4)], 9, INK); p.poly([[44, 12], [46, 46], [18, 28]], INK); });
    icon("ic_restart", (p) => { stroke(p, arc(48, 50, 24, -0.9, 4.3), 9, INK); p.poly([[58, 8], [78, 34], [48, 38]], INK); });
    icon("ic_map", (p) => { p.poly([[18, 26], [38, 18], [58, 26], [78, 18], [78, 70], [58, 78], [38, 70], [18, 78]], INK); p.poly([[24, 31], [36, 26], [36, 64], [24, 69]], CREAM); p.poly([[60, 32], [72, 27], [72, 64], [60, 70]], CREAM); });
    icon("ic_lantern", (p) => {
        p.rect(38, 14, 20, 8, INK); stroke(p, arc(48, 16, 9, 3.14, 6.28, 8), 4, INK);
        p.poly([[30, 26], [66, 26], [62, 70], [34, 70]], "#f4b44e", "#ffdb86");
        p.rect(30, 22, 36, 6, INK); p.rect(30, 68, 36, 7, INK);
        p.rect(36, 28, 4, 40, INK); p.rect(56, 28, 4, 40, INK);
        p.ellipse(48, 56, 7, 11, "#fff4c8");
    });
    icon("ic_gear", (p) => {
        for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, c = Math.cos(a), s = Math.sin(a); p.line(48 + c * 16, 48 + s * 16, 48 + c * 34, 48 + s * 34, INK, 12); }
        p.circle(48, 48, 25, INK); p.circle(48, 48, 11, CREAM);
    });
    icon("ic_sound", (p) => { p.poly([[18, 38], [34, 38], [52, 22], [52, 74], [34, 58], [18, 58]], INK); stroke(p, arc(52, 48, 18, -0.8, 0.8, 8), 6, INK); stroke(p, arc(52, 48, 31, -0.8, 0.8, 10), 6, INK); });
    icon("ic_note", (p) => { p.ellipse(32, 70, 13, 10, INK); p.ellipse(68, 62, 13, 10, INK); p.rect(40, 20, 6, 50, INK); p.rect(76, 14, 6, 48, INK); p.poly([[40, 20], [82, 12], [82, 28], [40, 36]], INK); });
    icon("ic_buzz", (p) => { p.rect(34, 14, 28, 68, INK); p.rect(40, 22, 16, 44, CREAM); stroke(p, [[20, 34], [14, 42], [22, 50], [14, 58]], 5, INK); stroke(p, [[76, 34], [82, 42], [74, 50], [82, 58]], 5, INK); });
    icon("ic_x", (p) => { p.line(26, 26, 70, 70, INK, 11); p.line(70, 26, 26, 70, INK, 11); });
    icon("ic_play", (p) => { p.poly([[32, 20], [76, 48], [32, 76]], INK); });
    a.paint("goal", 64, 96, (p, f) => {
        const on = f === 1, body = on ? "#ffffff" : "#b9bfdd", edge = on ? "#8d9bd0" : "#9aa1c6";
        p.circle(32, 68, 22, edge).circle(32, 68, 19, body);
        p.circle(32, 38, 16, edge).circle(32, 38, 13, body);
        p.circle(32, 16, 12, edge).circle(32, 16, 9, body);
        if (on) { p.circle(28, 14, 2, "#27242f").circle(36, 14, 2, "#27242f"); p.poly([[32, 16], [44, 19], [32, 21]], "#f08a32"); p.rect(16, 26, 32, 5, "#e2483d"); }
    }, { frames: 2, smooth: true });
    a.paint("star", 64, 64, (p) => {
        const pts = [];
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 29, t = -Math.PI / 2 + (i * Math.PI) / 5; pts.push([32 + Math.cos(t) * r, 33 + Math.sin(t) * r]); }
        p.poly(pts, "#ffd468", "#f6a93b");
    }, { smooth: true });
    a.paint("mitten", 96, 96, (p) => {
        p.ellipse(46, 54, 26, 30, "#e2483d", "#b92f2e"); p.ellipse(72, 44, 10, 16, "#e2483d", "#b92f2e");
        p.rect(24, 74, 44, 16, "#f6d27a"); for (let x = 28; x < 66; x += 8) p.rect(x, 74, 3, 16, "#e2b95e");
    }, { smooth: true });
    a.paint("flake", 16, 16, (p) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5) / 7.5, o = (x + y * 16) * 4; p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = 255 * Math.max(0, 1 - d * d); } }, { smooth: true });
    a.paint("dot", 32, 32, (p) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const d = Math.hypot(x - 15.5, y - 15.5) / 15.5, o = (x + y * 32) * 4; p.data[o] = 255; p.data[o + 1] = 226; p.data[o + 2] = 150; p.data[o + 3] = 255 * Math.min(1, Math.max(0, (1 - d) * 3)); } }, { smooth: true });
}

/** A round paper button with an icon. `place(view)` returns its centre each step, so it follows any layout. */
export function iconButton(s, icon, place, o = {}) {
    const size = o.size ?? 52;
    const e = s.add([button("", { width: size, height: size, radius: size / 2, color: o.color ?? CREAM, action: o.action, onTap: o.onTap }), ui(), { name: o.name ?? icon, layerIcon: true, update(dt, self) { const q = place(s.view); self.pos.set(q[0], q[1], 0); self.hidden = !!o.hide?.(); } }]);
    e.layer = 40;
    { const q = place(s.view); e.pos.set(q[0], q[1], 0); e.hidden = !!o.hide?.(); }
    const g = s.add([sprite(icon, { width: size * 0.66, height: size * 0.66 }), ui(), { name: "icon", update(dt, self) { self.pos.set(e.pos.x, e.pos.y, 0); self.scale = e.scale.x * (o.pulse?.() ?? 1); self.hidden = e.hidden; self.opacity = o.dim?.() ? 0.35 : 1; } }]);
    g.layer = 41;
    g.pos.set(e.pos.x, e.pos.y, 0); g.hidden = e.hidden;
    e.icon = g;
    return e;
}

/** White words on a soft ink pill, readable over snow or sky. Set e.text; `e.pill` follows its width. */
export function pillText(s, str, anchorPin, o = {}) {
    const t = s.add([text(str, { size: o.size ?? 17, bold: true, color: "#ffffff" }), anchorPin, { name: o.name ?? "pillText" }]);
    t.layer = 31;
    const p = s.add([rect(10, 10, { color: color([0.2, 0.22, 0.42, 0.62]), radius: 14 }), ui(), { name: "pill", add(e) { e.pos.set(t.pos.x, t.pos.y, 0); e.size.set(t.size.x + 24, t.size.y + 10, 0); }, update(dt, e) { e.pos.set(t.pos.x, t.pos.y, 0); e.size.set(t.size.x + 24, t.size.y + 10, 0); e.opacity = t.opacity; } }]);
    p.layer = 30;
    return t;
}

/** Settings panel: three toggles and a close button, shared by every screen. */
export function settingsPanel(s, opts) {
    const items = [];
    let open = false;
    const veil = s.add([rect(236, 96, { color: color([0.2, 0.22, 0.42, 0.72]), radius: 28 }), ui(), { name: "veil", update(dt, e) { const v = s.view; e.pos.set((v.width + v.safe.left - v.safe.right) / 2, (v.height + v.safe.top - v.safe.bottom) / 2, 0); e.hidden = !open; } }]);
    veil.layer = 38; veil.hidden = true;
    const list = [["ic_sound", "sfx"], ["ic_note", "music"], ["ic_buzz", "haptics"]];
    list.forEach(([icon, key], i) => {
        const place = (v) => { const gap = 66, x = (v.width + v.safe.left - v.safe.right) / 2 + (i - 1) * gap; return [x, (v.height + v.safe.top - v.safe.bottom) / 2]; };
        const b = iconButton(s, icon, place, { size: 56, hide: () => !open, dim: () => !opts.get(key), onTap: () => opts.toggle(key) });
        items.push(b);
    });
    return {
        toggle() { open = !open; opts.onChange?.(open); },
        get open() { return open; },
        close() { open = false; },
    };
}
