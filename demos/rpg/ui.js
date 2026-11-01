// Immediate-style UI on a screen stack. Every tappable thing goes in screen.hits, so taps, keys and the bot all drive the same rects.
import { INK, PAPER } from "./ink.js";

export const FONT = '"Avenir Next","Segoe UI",Roboto,"Helvetica Neue",system-ui,sans-serif';
export const TYPE = '"American Typewriter","Courier New",Courier,monospace';
export const COL = { ink: INK, paper: PAPER, manila: "#e8c98a", sticky: "#ffd84d", red: "#e5484d", teal: "#2fa6a0", blue: "#3b6fd4", grey: "#8a90a0", green: "#4fae62", white: "#fffdf5", mute: "#6b6f7e" };

const widths = new Map();
export function measure(game, str, o = {}) {
    const key = `${o.size}|${o.bold}|${o.font}|${str}`;
    let w = widths.get(key);
    if (w === undefined) {
        w = game.renderer.measureText(String(str), { size: o.size ?? 14, font: o.font ?? FONT, bold: !!o.bold, align: "center", maxWidth: 0, lineHeight: 1.25 }).width;
        if (widths.size > 4000) widths.clear();
        widths.set(key, w);
    }
    return w;
}
/** Text with real left/right alignment. x is the anchor. */
export function T(d, game, str, x, y, o = {}) {
    const size = o.size ?? 14, font = o.font ?? FONT, bold = o.bold ?? false, color = o.color ?? INK, a = o.align ?? "left";
    if (o.maxWidth) {
        const st = { size, font, bold, align: a === "center" ? "center" : "left", maxWidth: o.maxWidth, lineHeight: o.lineHeight ?? 1.3 };
        const m = game.renderer.measureText(String(str), st);
        d.text(str, { x: a === "center" ? x : x + m.width / 2, y: y + m.height / 2, size, font, bold, color, align: st.align, maxWidth: o.maxWidth, lineHeight: st.lineHeight, opacity: o.opacity });
        return m;
    }
    const w = measure(game, str, { size, font, bold });
    d.text(str, { x: a === "left" ? x + w / 2 : a === "right" ? x - w / 2 : x, y, size, font, bold, color, opacity: o.opacity, rot: o.rot });
    return { width: w };
}
export function wrapHeight(game, str, o) {
    return game.renderer.measureText(String(str), { size: o.size ?? 14, font: o.font ?? FONT, bold: !!o.bold, align: "left", maxWidth: o.maxWidth, lineHeight: o.lineHeight ?? 1.3 }).height;
}
/** A comic panel: a hard offset shadow and a thick ink border. x, y is the top-left corner. */
export function panel(d, x, y, w, h, o = {}) {
    const r = o.radius ?? 8, ox = x + w / 2, oy = y + h / 2, s = o.shadow ?? 4;
    if (s) d.rect(w, h, { x: ox + s * 0.7, y: oy + s, color: o.shadowColor ?? INK, radius: r, opacity: o.opacity });
    d.rect(w, h, { x: ox, y: oy, color: o.border ?? INK, radius: r, opacity: o.opacity });
    const b = o.b ?? 2.5;
    d.rect(w - b * 2, h - b * 2, { x: ox, y: oy, color: o.fill ?? PAPER, radius: Math.max(1, r - b), opacity: o.opacity });
}
export function bar(d, x, y, w, h, t, color, o = {}) {
    d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: INK, radius: h / 2 });
    const iw = Math.max(0, (w - 4) * Math.min(1, t));
    if (iw > 0.5) d.rect(iw, h - 4, { x: x + 2 + iw / 2, y: y + h / 2, color, radius: (h - 4) / 2 });
    if (o.ghost !== undefined && o.ghost > t) { const gw = (w - 4) * Math.min(1, o.ghost); d.rect(gw - iw, h - 4, { x: x + 2 + iw + (gw - iw) / 2, y: y + h / 2, color: "#ffffff", radius: 1, opacity: 0.75 }); }
}
export const hpColor = (t) => (t > 0.5 ? "#4fae62" : t > 0.22 ? "#f0b429" : "#e5484d");

/** A chunky button. Records a hit rect. Returns nothing; the screen's update reads hits. */
export function btn(sc, d, game, x, y, w, h, label, o = {}) {
    const hit = { x, y, w, h, id: o.id ?? label, fn: o.fn, disabled: o.disabled, label };
    if (!o.noHit) sc.addHit(hit);
    const held = sc.heldHit === hit.id && !o.disabled, sel = sc.sel === hit.id && sc.showSel, dy = held ? 3 : 0;
    panel(d, x, y + dy, w, h, { fill: o.disabled ? "#c9c5b9" : o.fill ?? COL.white, radius: o.radius ?? 9, shadow: held ? 1 : 4, border: sel ? COL.red : INK, b: sel ? 3.5 : 2.5 });
    if (o.draw) o.draw(d, x, y + dy);
    else T(d, game, label, x + w / 2, y + h / 2 + dy, { align: "center", size: o.size ?? 15, bold: true, color: o.disabled ? "#77756d" : o.color ?? INK, font: o.font });
}

export class Screen {
    constructor() { this.hits = []; this._next = []; this.heldHit = null; this.sel = null; this.showSel = false; this.opaque = false; }
    addHit(h) { this._next.push(h); }
    enter() {} update() {} draw() {}
    /** Called by the stack for the top screen: resolves taps against what was drawn last. */
    input(I) {
        const p = I.pointer, find = (x, y) => { for (let i = this.hits.length - 1; i >= 0; i--) { const h = this.hits[i]; if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h; } return null; };
        if (p.pressed) { const h = find(p.x, p.y); this.heldHit = h && !h.disabled ? h.id : null; if (h) this.showSel = false; }
        let used = false;
        if (p.tapped) { const h = find(p.x, p.y); if (h && !h.disabled && h.fn) { used = true; this.heldHit = null; h.fn(); } }
        if (!p.down) this.heldHit = null;
        // Keyboard: walks the hit list in screen order.
        const dirs = [I.up && [0, -1], I.down && [0, 1], I.left && [-1, 0], I.right && [1, 0]].find(Boolean);
        const list = this.hits.filter((h) => !h.disabled && !h.noKey);
        if (dirs && list.length) {
            this.showSel = true;
            const cur = list.find((h) => h.id === this.sel);
            if (!cur) this.sel = list[0].id;
            else {
                const cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2; let best = null, bs = 1e9;
                for (const h of list) {
                    if (h === cur) continue;
                    const dx = h.x + h.w / 2 - cx, dy = h.y + h.h / 2 - cy, along = dx * dirs[0] + dy * dirs[1], off = Math.abs(dx * dirs[1]) + Math.abs(dy * dirs[0]);
                    if (along <= 4) continue;
                    const sc = along + off * 2.2; if (sc < bs) { bs = sc; best = h; }
                }
                if (best) this.sel = best.id;
            }
            I.game?.sfx?.({ wave: "square", freq: 660, decay: 0.03, volume: 0.05 }, { haptic: "tick" });
        }
        if (I.confirm && !used) {
            const cur = list.find((h) => h.id === this.sel);
            if (cur && this.showSel) { cur.fn?.(); used = true; } else if (list.length && !this.onConfirm) { this.sel = list[0].id; this.showSel = true; if (list.length === 1) { list[0].fn?.(); used = true; } }
        }
        return used;
    }
    /** Swap in the freshly drawn hit list. */
    flip() { this.hits = this._next; this._next = []; }
}

export class Stack {
    constructor(game) { this.game = game; this.list = []; }
    get top() { return this.list[this.list.length - 1]; }
    push(sc) { sc.stack = this; sc.game = this.game; this.list.push(sc); sc.enter?.(); return sc; }
    pop(sc) { const i = sc ? this.list.indexOf(sc) : this.list.length - 1; if (i >= 0) this.list.splice(i, 1); }
    update(dt, I) {
        for (const sc of this.list) sc.tick?.(dt);
        const t = this.top; if (!t) return;
        I.game = this.game;
        t.input(I); t.update(dt, I);
    }
    draw(d) {
        let from = 0;
        for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i].opaque) { from = i; break; }
        for (let i = 0; i < this.list.length; i++) { const sc = this.list[i]; sc._next = []; if (i >= from) sc.draw(d, this.game.view); }
        for (const sc of this.list) sc.flip();
    }
}

/** A speech box. Text sweeps in line by line; a tap finishes it, a second tap moves on. */
export class Dialog extends Screen {
    constructor(who, text, o = {}) { super(); this.who = who; this.text = text; this.o = o; this.t = 0; this.done = false; this.lastTick = 0; this.opts = o.choices ?? null; }
    get lines() { return this._lines ?? 1; }
    enter() { const g = this.game; this.speed = g.data.S?.settings?.fastText ? 3 : 1; }
    layout(V) {
        const W = Math.min(V.width - 16, 560), H = this._h ?? 110, x = (V.width - W) / 2, safeB = 10;
        return { x, y: V.height - H - safeB - 4, W, H };
    }
    update(dt, I) {
        const before = this.t;
        this.t += dt * 62 * this.speed;
        if (Math.floor(this.t / 4) !== Math.floor(before / 4) && !this.finished) this.game.audioKit?.blip(this.o.voice);
        const skip = I.pointer.tapped || I.confirm;
        if (this.opts && this.finished) return;
        if (skip) { if (!this.finished) this.t = 1e6; else { this.stack.pop(this); this.o.done?.(); } }
    }
    get finished() { return this.t >= (this.text.length + 2); }
    input(I) { if (this.opts && this.finished) return super.input(I); return false; }
    draw(d, V) {
        const g = this.game, size = V.width >= 500 ? 16 : 15, tw = Math.min(V.width - 16, 560) - 32, lh = size * 1.32;
        const h = g.renderer.measureText(this.text, { size, font: FONT, bold: false, align: "left", maxWidth: tw, lineHeight: 1.32 }).height;
        const o = this.opts;
        this._h = Math.max(84, h + 34 + (this.who ? 8 : 0));
        const { x, y, W, H } = this.layout(V);
        const paperCol = this.o.fill ?? COL.paper;
        panel(d, x, y, W, H, { fill: paperCol, radius: 6 });
        if (this.who) {
            const nw = measure(g, this.who, { size: 13, bold: true, font: TYPE }) + 22;
            panel(d, x + 12, y - 14, nw, 26, { fill: this.o.tab ?? COL.sticky, radius: 4, shadow: 2 });
            T(d, g, this.who, x + 12 + nw / 2, y - 1, { align: "center", size: 13, bold: true, font: TYPE });
        }
        const tx = x + 16, ty = y + (this.who ? 20 : 14);
        // Sweep reveal, one line at a time, with no texture churn.
        const lines = Math.max(1, Math.round(h / lh)), perLine = Math.max(1, this.text.length / lines), prog = this.t / perLine;
        for (let i = 0; i < lines; i++) {
            const f = Math.max(0, Math.min(1, prog - i)); if (f <= 0) break;
            d.clip(tx - 2, ty + i * lh - 1, (tw + 6) * f, lh + 2, () => T(d, g, this.text, tx, ty, { size, maxWidth: tw, lineHeight: 1.32 }));
        }
        if (this.finished && !o) { const b = Math.sin(g.time2 * 6) * 2; d.poly([[x + W - 26, y + H - 16 + b], [x + W - 14, y + H - 16 + b], [x + W - 20, y + H - 9 + b]], { color: COL.red }); }
        if (o && this.finished) {
            const bh = 46, gap = 8, bw = Math.min(W - 30, 300), total = o.length * (bh + gap), ox = x + W - bw - 8; let oy = y - total - 18;
            o.forEach((c, i) => { btn(this, d, g, ox, oy + i * (bh + gap), bw, bh, c, { id: "c" + i, size: 14, fn: () => { this.stack.pop(this); this.o.done?.(i); } }); });
        }
    }
}
/** A short floating toast. */
export class Toasts {
    constructor(game) { this.game = game; this.items = []; }
    add(text, o = {}) { this.items.push({ text, t: 0, life: o.life ?? 2.4, ...o }); if (this.items.length > 3) this.items.shift(); }
    update(dt) { for (const t of this.items) t.t += dt; this.items = this.items.filter((t) => t.t < t.life); }
    draw(d, V) {
        this.items.forEach((t, i) => {
            const g = this.game, w = Math.min(V.width - 24, measure(g, t.text, { size: 13, bold: true }) + 26), a = Math.min(1, t.t * 6, (t.life - t.t) * 4), y = 60 + i * 38 - (1 - Math.min(1, t.t * 6)) * 16;
            panel(d, V.width / 2 - w / 2, y, w, 30, { fill: t.fill ?? COL.sticky, radius: 5, shadow: 3, opacity: a });
            T(d, g, t.text, V.width / 2, y + 15, { align: "center", size: 13, bold: true, opacity: a });
        });
    }
}
