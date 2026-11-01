// Shared drawing: sticker panels, outlined type, puffy numbers, confetti and immediate-mode buttons. Everything reads from one palette.
import { UI, frameOf } from "./art.js";
import { TRAITS } from "./data.js";
import { play } from "./audio.js";
import { saveMeta } from "./meta.js";

export const G = { game: null, meta: null, run: null, keys: {} };
export const FONT = '"Arial Rounded MT Bold","SF Pro Rounded",ui-rounded,"Nunito","Varela Round",system-ui,sans-serif';
export const INK = "#3a1d5c", PINK = "#ff7eb6", YEL = "#ffd23f", MINT = "#3fd6a8", SKY = "#46b8ff", CREAM = "#fff6e6", RED = "#ff5f6f";
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const back = (t) => { const c = 2.2; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

/** Ink-outlined type: legible on any sticker. */
export function txt(d, s, x, y, o = {}) {
    const size = o.size ?? 14, base = { size, bold: true, font: FONT, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight, opacity: o.opacity ?? 1, rot: o.rot };
    if (o.ink !== false) { const e = o.edge ?? Math.max(1, size * 0.09), c = o.inkColor ?? INK; for (const [a, b] of [[-e, 0], [e, 0], [0, -e], [0, e], [-e * 0.7, -e * 0.7], [e * 0.7, -e * 0.7], [-e * 0.7, e * 0.7], [e * 0.7, e * 0.7]]) d.text(s, { ...base, x: x + a, y: y + b + size * 0.04, color: c }); }
    d.text(s, { ...base, x, y, color: o.color ?? "#ffffff" });
}
/** Plain small print, for rules text on light panels. */
export const small = (d, s, x, y, o = {}) => d.text(s, { size: o.size ?? 11, bold: !!o.bold, font: FONT, color: o.color ?? INK, x, y, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25, opacity: o.opacity ?? 1 });
export function panel(d, x, y, w, h, o = {}) {
    const r = o.radius ?? 14, a = o.opacity ?? 1;
    d.rect(w + 2, h + 7, { x, y: y + 3.5, radius: r + 3, color: "#3a1d5c", opacity: 0.22 * a });
    d.rect(w + 5, h + 5, { x, y, radius: r + 3, color: o.edge ?? "#ffffff", opacity: a });
    d.rect(w + 5, h + 5, { x, y, radius: r + 3, color: INK, outline: 1.6, opacity: a });
    d.rect(w, h, { x, y, radius: r, color: o.color ?? CREAM, opacity: a });
    if (o.gloss !== false) d.rect(w - 10, Math.min(h * 0.4, 16), { x, y: y - h / 2 + Math.min(h * 0.2, 9) + 2, radius: r - 2, color: "#ffffff", opacity: 0.16 * a });
}
export const icon = (d, name, x, y, size, o = {}) => d.sprite("ui", { frame: UI[name], x, y, width: size, height: size, color: o.color, opacity: o.opacity ?? 1, rot: o.rot });
export function pet(d, id, star, x, y, size, o = {}) { d.sprite("pets", { frame: frameOf(id, star), x, y, width: o.w ?? size, height: o.h ?? size, flipX: o.flip, rot: o.rot, color: o.color, opacity: o.opacity ?? 1 }); }
export const pips = (d, n, x, y, size = 10) => { for (let i = 0; i < n; i++) icon(d, "star", x + (i - (n - 1) / 2) * size * 0.8, y, size); };
/** Puffy digits batched from the icon sheet. */
export function number(d, n, x, y, h, o = {}) {
    const s = String(Math.max(0, Math.floor(Math.abs(n)))), w = h * 0.62, total = s.length * w + (o.sign ? w : 0); let cx = x - total / 2 + w / 2;
    const c = o.color;
    if (o.sign) { d.sprite("ui", { frame: UI[o.sign], x: cx, y, width: h, height: h, color: c, opacity: o.opacity ?? 1 }); cx += w; }
    for (const ch of s) { d.sprite("ui", { frame: +ch, x: cx, y, width: h, height: h, color: c, opacity: o.opacity ?? 1 }); cx += w; }
}
export function statBadges(d, atk, hp, x, y, size, o = {}) {
    const gap = size * 0.31, r = Math.max(7.5, size * 0.13), by = y + size * 0.4, f = r * 1.5;
    for (const [dx, col, v] of [[-gap, "#ff9f2e", atk], [gap, "#ff4f6f", hp]]) { d.circle(r + 1.4, { x: x + dx, y: by, color: INK, opacity: o.opacity ?? 1 }); d.circle(r, { x: x + dx, y: by, color: col, opacity: o.opacity ?? 1 }); number(d, v, x + dx, by, String(v).length > 1 ? f * 0.92 : f, { opacity: o.opacity }); }
}
/** A soft flat ellipse under a pet. */
export const shadow = (d, x, y, w, a = 0.2) => d.rect(w, w * 0.26, { x, y, radius: w * 0.13, color: INK, opacity: a });

/** Immediate-mode buttons: draw them each frame and they just work, with squish, sound and a key. */
export function makeButtons(s) {
    const B = { hits: [], next: [], active: null, modal: false, push: new Map() };
    B.begin = () => { B.hits = B.next; B.next = []; };
    B.hitAt = (x, y) => { for (let i = B.hits.length - 1; i >= 0; i--) { const h = B.hits[i]; if (Math.abs(x - h.x) <= h.w / 2 + 3 && Math.abs(y - h.y) <= h.h / 2 + 3) return h; } return null; };
    /** Call from onUpdate. Returns true if the press was taken. */
    B.update = () => {
        const p = s.input.pointer; let took = false;
        if (p.pressed) { const h = B.hitAt(p.x, p.y); B.active = h?.id ?? null; took = !!h; if (h) B.push.set(h.id, 1); }
        if (p.released && B.active != null) { const h = B.hitAt(p.x, p.y); if (h && h.id === B.active && !h.off) { play(G.game, h.sound ?? "tap"); h.fn?.(); took = true; } else if (h && h.off) { play(G.game, "nope"); h.fn0?.(); } B.active = null; }
        for (const [k, v] of B.push) { const n = v - 0.12; if (n <= 0) B.push.delete(k); else B.push.set(k, n); }
        return took;
    };
    B.button = (d, id, x, y, w, h, o = {}) => {
        const pressed = B.active === id ? 1 : B.push.get(id) ?? 0, off = !!o.off, ks = 1 - pressed * 0.08;
        B.next.push({ id, x, y, w, h, fn: o.fn, fn0: o.fn0, off, sound: o.sound });
        d.push(); d.translate(x, y + (o.pulse ?? 0)); d.scale(ks, ks);
        const col = off ? "#c9bedb" : o.color ?? PINK;
        d.rect(w + 3, h + 3, { y: 4, radius: h * 0.34, color: "#3a1d5c" });
        d.rect(w + 3, h + 3, { y: 0, radius: h * 0.34, color: o.edge ?? "#ffffff" });
        d.rect(w + 3, h + 3, { y: 0, radius: h * 0.34, color: INK, outline: 1.4 });
        d.rect(w - 2, h - 2, { radius: h * 0.3, color: col });
        d.rect(w - 10, h * 0.32, { y: -h * 0.2, radius: h * 0.16, color: "#ffffff", opacity: 0.28 });
        const size = o.size ?? Math.min(h * 0.42, 18);
        if (o.icon && !o.label) icon(d, o.icon, 0, 0, h * 0.62, { opacity: off ? 0.6 : 1 });
        else if (o.icon) { const tw = o.tw ?? o.label.length * size * 0.33; icon(d, o.icon, -tw - h * 0.12, 0, h * 0.5); txt(d, o.label, h * 0.14, 0, { size, opacity: off ? 0.7 : 1 }); }
        else txt(d, o.label ?? "", 0, 0, { size, opacity: off ? 0.7 : 1 });
        if (o.sub) txt(d, o.sub, 0, h * 0.27, { size: size * 0.6 });
        d.pop();
    };
    return B;
}

/** Cosmetic bursts. Own list, so they draw above the pets. */
export function makeFx(game) {
    const R = game.fxRng, parts = [], rings = [], pops = [];
    const COLS = ["#ff7eb6", "#ffd23f", "#3fd6a8", "#46b8ff", "#b48cff", "#ff8a3d", "#ffffff"];
    const F = {
        parts, rings, pops,
        confetti(x, y, n = 30, power = 240, cols = COLS, grav = 500) { for (let i = 0; i < n; i++) { const a = R.range(0, 6.283), v = R.range(power * 0.3, power); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.35, g: grav, life: R.range(0.6, 1.2), t: 0, s: R.range(3, 7), rot: R.range(0, 6.28), vr: R.range(-14, 14), c: cols[i % cols.length] }); } },
        stars(x, y, n = 8, power = 200, icon0 = "star") { for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + R.range(-0.3, 0.3), v = R.range(power * 0.5, power); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 120, life: R.range(0.45, 0.8), t: 0, s: R.range(8, 15), rot: R.range(0, 6.28), vr: R.range(-6, 6), icon: icon0, drag: 2.5 }); } },
        dust(x, y, n = 6, col = "#ffffff") { for (let i = 0; i < n; i++) { const a = R.range(Math.PI * 0.95, Math.PI * 2.05), v = R.range(30, 110); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.45, g: 0, life: R.range(0.2, 0.42), t: 0, s: R.range(5, 10), rot: 0, vr: 0, c: col, round: true, drag: 5 }); } },
        ring(x, y, r0, r1, life = 0.32, c = "#ffffff", w = 5) { rings.push({ x, y, r0, r1, life, t: 0, c, w }); },
        pop(str, x, y, o = {}) { pops.push({ str, x, y, t: 0, life: o.life ?? 0.9, vy: o.vy ?? -46, size: o.size ?? 16, color: o.color ?? "#fff", num: o.num, sign: o.sign, delay: o.delay ?? 0 }); },
        update(dt) {
            for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.t += dt; if (p.t > p.life) { parts.splice(i, 1); continue; } p.vy += p.g * dt; if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; } p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
            for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; if (r.t > r.life) rings.splice(i, 1); }
            for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; if (p.delay > 0) { p.delay -= dt; continue; } p.t += dt; p.y += p.vy * dt * (1 - p.t / p.life); if (p.t > p.life) pops.splice(i, 1); }
        },
        draw(d) {
            for (const r of rings) { const k = r.t / r.life, e = 1 - (1 - k) * (1 - k), rad = lerp(r.r0, r.r1, e); d.circle(rad, { x: r.x, y: r.y, color: r.c, outline: r.w * (1 - k) + 0.5, opacity: 1 - k * k }); }
            for (const p of parts) {
                const k = 1 - p.t / p.life, a = Math.min(1, k * 3);
                if (p.icon) { d.sprite("ui", { frame: UI[p.icon], x: p.x, y: p.y, width: p.s, height: p.s, rot: p.rot, opacity: a }); continue; }
                if (p.round) { d.circle(p.s * k, { x: p.x, y: p.y, color: p.c, opacity: a * 0.8 }); continue; }
                d.push(); d.translate(p.x, p.y); d.rotate(p.rot); d.rect(p.s, p.s * 0.6 * Math.abs(Math.cos(p.t * 9 + p.vr)) + 1, { color: p.c, opacity: a }); d.pop();
            }
            for (const p of pops) {
                if (p.delay > 0) continue;
                const k = p.t / p.life, grow = k < 0.16 ? back(k / 0.16) : 1, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
                if (p.num !== undefined) { d.push(); d.translate(p.x, p.y); d.scale(grow, grow); number(d, p.num, 0, 0, p.size, { color: p.color, opacity: a, sign: p.sign }); d.pop(); }
                else { d.push(); d.translate(p.x, p.y); d.scale(grow, grow); txt(d, p.str, 0, 0, { size: p.size, color: p.color, opacity: a }); d.pop(); }
            }
        },
    };
    return F;
}
export function setSound(on) { G.meta.sound = on; G.game.audio.muted = !on; saveMeta(G.game, G.meta); }
export function setHaptics(on) { G.meta.haptics = on; G.game.haptics.enabled = on; saveMeta(G.game, G.meta); }
export function setMusic(on) { G.meta.music = on; saveMeta(G.game, G.meta); if (!on) G.game.stopMusic(); else G.playSong?.(G.song ?? "title"); }
export function traitChip(d, B, id, t, x, y, size, count, lvl, onTap) {
    const need = TRAITS[t].tiers, a = lvl ? 1 : 0.62;
    icon(d, t, x, y, size, { opacity: a });
    if (B && onTap) B.next.push({ id, x, y, w: size + 4, h: size + 8, fn: onTap, sound: "tap" });
    if (lvl) d.circle(size * 0.56, { x, y, color: ["", "#ffffff", "#7bd6ff", "#ffd23f"][lvl], outline: 2 });
    number(d, count, x + size * 0.38, y + size * 0.34, size * 0.5);
    return need;
}
