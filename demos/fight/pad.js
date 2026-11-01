// On-screen controls. A fixed stick for the left thumb, a 3x3 grid of real buttons for the right, or a compact set for
// two people on one tablet. Reads raw pointers so several thumbs work at once, and a sub-frame tap can't be lost.
import { BTN } from "./sim.js";

const FONT = '"Arial Rounded MT Bold",ui-rounded,system-ui,sans-serif';
const lerp = (a, b, k) => a + (b - a) * k;

/** Where the deck starts in portrait; landscape has none, and the controls float over the floor. */
export function deckHeight(view) {
    if (view.width > view.height) return 0;
    return Math.round(Math.min(view.height * 0.4, 236 + view.safe.bottom));
}

export class Pad {
    constructor(game, o) {
        this.g = game; this.o = o; this.controls = []; this.ptr = new Map(); this.latched = [0, 0]; this.held = [0, 0]; this.meter = [0, 0]; this.names = o.names; this.pulse = 0;
        this.layout();
    }
    layout() {
        const v = this.g.view, L = v.safe.left, R = v.width - v.safe.right, B = v.height - v.safe.bottom, deck = deckHeight(v), c = this.controls = [];
        const portrait = deck > 0, two = this.o.players === 2;
        const span = (x0, x1, p) => {
            const w = x1 - x0, compact = two && (w < 300 || !portrait);
            const area = portrait ? deck - 12 - v.safe.bottom : Math.min(v.height * 0.6, 214);
            if (compact) {
                const r = Math.min(27, (w - 96) / 4.3), sr = Math.min(44, w * 0.25), y = B - sr - 16;
                c.push({ kind: "stick", p, x: x0 + sr + 10, y, r: sr, reach: sr * 1.5 });
                const gx = x1 - r * 3.5, gy = B - r * 3.5 - 8;
                const btn = (bit, label, dx, dy, col, rr = r) => c.push({ kind: "btn", p, bit, label, x: gx + dx * r * 2.2, y: gy + dy * r * 2.2, r: rr, col });
                btn(BTN.A, "L", 0, 1, "#ffc23c"); btn(BTN.B, "H", 1, 0.6, "#e8472e");
                btn(BTN.S1 | 0, "S", 0, 0, "#2fa7a0"); btn(BTN.G, "BLK", 1, -0.4, "#7d6bd6", r * 0.9);
                btn(BTN.X, "SUPER", 0, -1, "#fff1d6", r * 0.95);
                return;
            }
            const rows = 3, sr = portrait ? Math.min(66, (w * 0.42) / 2) : 56;
            const r = portrait ? Math.min(33, (w * 0.56) / 6.6, area / 6.9) : Math.min(29, area / 6.8);
            const gap = r * 2.22, gx = x1 - r - 8 - gap * 2, gy = B - r - 8 - gap * 2;
            const sy = portrait ? B - Math.max(sr + 24, area * 0.46) : B - sr - 14;
            c.push({ kind: "stick", p, x: x0 + sr + 18, y: sy, r: sr, reach: sr * 1.5 });
            const specials = this.names[p];
            const btn = (bit, label, col, cx, cy, o = {}) => c.push({ kind: "btn", p, bit, label, x: gx + cx * gap, y: gy + cy * gap, r: r * (o.k ?? 1), col, sub: o.sub });
            btn(BTN.T, "THROW", "#c9b48f", 0, 0, { k: 0.86 }); btn(BTN.U, "JUMP", "#6fb9dc", 1, 0, { k: 0.86 }); btn(BTN.X, "SUPER", "#fff1d6", 2, 0);
            btn(BTN.S1, "S1", "#2fa7a0", 0, 1, { sub: specials?.[0], k: 0.92 }); btn(BTN.S2, "S2", "#2fa7a0", 1, 1, { sub: specials?.[1], k: 0.92 }); btn(BTN.S3, "S3", "#2fa7a0", 2, 1, { sub: specials?.[2], k: 0.92 });
            btn(BTN.G, "BLOCK", "#7d6bd6", 0, 2); btn(BTN.A, "LIGHT", "#ffc23c", 1, 2); btn(BTN.B, "HEAVY", "#e8472e", 2, 2);
        };
        if (two) { span(L, v.width / 2 - 2, 0); span(v.width / 2 + 2, R, 1); } else span(L, R, 0);
    }
    active() { return this.o.active ? this.o.active() : this.g.input.touchMode; }
    down(id, x, y) {
        if (!this.active()) return false;
        for (const c of this.controls) {
            if (c.kind === "stick" && c.finger == null && Math.hypot(x - c.x, y - c.y) < c.reach) { c.finger = id; c.ox = c.x; c.oy = c.y; this.ptr.set(id, c); this.moveStick(c, x, y); return true; }
        }
        const b = this.nearest(x, y);
        if (b) { this.ptr.set(id, b); this.press(b); return true; }
        return false;
    }
    nearest(x, y) {
        let best = null, bd = 1e9;
        for (const c of this.controls) if (c.kind === "btn" && !(c.bit === BTN.X && this.meter[c.p] < 100 && false)) { const dist = Math.hypot(x - c.x, y - c.y); if (dist < c.r * 1.12 && dist / c.r < bd) { best = c; bd = dist / c.r; } }
        return best;
    }
    press(b) { b.count = (b.count ?? 0) + 1; this.held[b.p] |= b.bit; this.latched[b.p] |= b.bit; b.glow = 1; this.g.haptic(5); }
    release(b) { b.count = Math.max(0, (b.count ?? 1) - 1); if (!b.count) { let m = 0; for (const c of this.controls) if (c.p === b.p && c.count) m |= c.bit; this.held[b.p] = (this.held[b.p] & (BTN.L | BTN.R | BTN.U | BTN.D)) | m; } }
    move(id, x, y) {
        const c = this.ptr.get(id);
        if (!c) return;
        if (c.kind === "stick") { this.moveStick(c, x, y); return; }
        // Roll a thumb across the buttons, as on a real stick.
        const n = this.nearest(x, y);
        if (n && n !== c) { this.release(c); this.ptr.set(id, n); this.press(n); }
    }
    moveStick(c, x, y) {
        let dx = x - c.ox, dy = y - c.oy; const len = Math.hypot(dx, dy), max = c.r * 1.1;
        if (len > max) { c.ox += dx - dx / len * max; c.oy += dy - dy / len * max; dx = x - c.ox; dy = y - c.oy; }
        // The centre drifts after the thumb, so changing direction never needs a long slide. It stays near home.
        c.ox = Math.max(c.x - c.r * 0.5, Math.min(c.x + c.r * 0.5, c.ox)); c.oy = Math.max(c.y - c.r * 0.5, Math.min(c.y + c.r * 0.5, c.oy));
        c.kx = dx; c.ky = dy;
        const th = c.r * 0.26; let m = 0;
        if (dx > th) m |= BTN.R; else if (dx < -th) m |= BTN.L;
        if (dy > th * 1.4) m |= BTN.D; else if (dy < -c.r * 0.62) m |= BTN.U;
        const was = this.held[c.p] & (BTN.L | BTN.R | BTN.U | BTN.D);
        this.latched[c.p] |= m & ~was;
        this.held[c.p] = (this.held[c.p] & ~(BTN.L | BTN.R | BTN.U | BTN.D)) | m;
    }
    up(id) {
        const c = this.ptr.get(id);
        if (!c) return;
        this.ptr.delete(id);
        if (c.kind === "stick") {
            c.finger = null;
            // One mouse can't hold a direction and click a button, so with a mouse the stick stays where you left it.
            // Click its middle to let go. Jump never latches.
            if (this.o.latch?.() && (this.held[c.p] & (BTN.L | BTN.R | BTN.D))) { this.held[c.p] &= ~BTN.U; c.ky = Math.max(0, c.ky ?? 0); return; }
            c.kx = c.ky = 0; this.held[c.p] &= ~(BTN.L | BTN.R | BTN.U | BTN.D);
        }
        else this.release(c);
    }
    reset() { this.ptr.clear(); this.held = [0, 0]; this.latched = [0, 0]; for (const c of this.controls) { c.finger = null; c.count = 0; c.kx = c.ky = 0; } }
    /** Held buttons this frame, plus anything tapped and released since the last read. */
    read(p) { const m = this.held[p] | this.latched[p]; this.latched[p] = 0; return m; }
    draw(d, t, face) {
        if (!this.active()) return;
        const a = this.g.view.width > this.g.view.height ? 0.62 : 1;
        for (const c of this.controls) {
            if (c.kind === "stick") {
                const k = c.finger ? 1 : 0.8, kx = c.kx ?? 0, ky = c.ky ?? 0;
                d.circle(c.r + 5, { x: c.x, y: c.y, color: "#241a2c", opacity: 0.55 * a });
                d.circle(c.r, { x: c.x, y: c.y, color: "#463a52", opacity: 0.85 * a });
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) d.poly([[c.x + dx * c.r * 0.86, c.y + dy * c.r * 0.86], [c.x + dx * c.r * 0.66 + dy * 7, c.y + dy * c.r * 0.66 + dx * 7], [c.x + dx * c.r * 0.66 - dy * 7, c.y + dy * c.r * 0.66 - dx * 7]], { color: "#fff1d6", opacity: 0.6 * a });
                const nx = c.x + Math.max(-c.r, Math.min(c.r, kx)) * 0.6, ny = c.y + Math.max(-c.r, Math.min(c.r, ky)) * 0.6;
                d.circle(c.r * 0.5 + 3, { x: nx, y: ny + 2, color: "#241a2c", opacity: a });
                d.circle(c.r * 0.5, { x: nx, y: ny, color: c.finger ? "#ffc23c" : "#e8472e", opacity: a });
                d.circle(c.r * 0.28, { x: nx - 4, y: ny - 5, color: "#ffffff", opacity: 0.3 * a });
                continue;
            }
            const on = c.count > 0, ready = c.bit === BTN.X && this.meter[c.p] >= 100, dim = c.bit === BTN.X && !ready;
            c.glow = (c.glow ?? 0) * 0.8;
            const r = c.r * (on ? 0.94 : 1), press = on ? 2 : 0, col = ready ? (Math.floor(t / 6) % 2 ? "#ffc23c" : "#ff7a3c") : dim ? "#6b5f70" : c.col;
            d.circle(r + 3, { x: c.x, y: c.y + 2, color: "#241a2c", opacity: 0.9 * a });
            d.circle(r, { x: c.x, y: c.y + press, color: col, opacity: a });
            d.rect(r * 1.3, r * 0.56, { x: c.x, y: c.y - r * 0.42 + press, color: "#ffffff", opacity: 0.2 * a, radius: r * 0.28 });
            if (ready) d.additive(() => d.circle(r * (1.2 + Math.sin(t * 0.3) * 0.08), { x: c.x, y: c.y, color: "#ff9a3c", opacity: 0.3 }));
            const dark = c.col === "#fff1d6" || c.col === "#ffc23c" || c.col === "#c9b48f" || c.col === "#6fb9dc";
            const ink = dark && !dim ? "#241a2c" : "#fff8ea";
            if (c.sub) {
                const parts = c.sub.split(" ");
                if (parts.length === 1) d.text(parts[0], { x: c.x, y: c.y + press, size: fit(parts[0], r), bold: true, font: FONT, color: ink });
                else { d.text(parts[0], { x: c.x, y: c.y - r * 0.24 + press, size: fit(parts[0], r), bold: true, font: FONT, color: ink }); d.text(parts.slice(1).join(" "), { x: c.x, y: c.y + r * 0.24 + press, size: fit(parts.slice(1).join(" "), r), bold: true, font: FONT, color: ink }); }
            } else d.text(c.label, { x: c.x, y: c.y + press, size: fit(c.label, r), bold: true, font: FONT, color: ink });
        }
    }
}
const fit = (s, r) => Math.max(7.5, Math.min(14, (r * 1.62) / (s.length * 0.62)));
