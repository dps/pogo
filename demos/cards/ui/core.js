// Shared by every scene: run + meta persistence, routing, painted buttons, overlays and a light particle system.
import { layer, pin, ui } from "../pogo.js";
import { CARDS, cardText } from "../data/cards.js";
import { KEYWORDS, WITCHES } from "../data/rules.js";
import { TRINKETS } from "../data/trinkets.js";
import { SAVE_VERSION, totalFloor } from "../sim.js";
import { freshMeta } from "../meta.js";
import { Sound, playSong, resetSong, resumeSong } from "../audio.js";

export const FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif';
export const COLORS = { ink: "#2a1830", cream: "#f5ead2", gold: "#ffcf6b", night: "#160c26", plum: "#2a1b42", red: "#ff5a5a", ward: "#8fd6ff", green: "#9fe66f", dim: "#b8a8d0" };
export const rnd = () => G.game.fxRng.next();
export const G = { game: null, run: null, meta: null, snd: null, keys: [], overlay: null };

export function init(game) {
    G.game = game; G.snd = Sound(game);
    loadMeta();
    if (typeof document !== "undefined") document.addEventListener("keydown", (e) => { if (!e.repeat) G.keys.push(e.code); });
    game.on("hide", () => { saveRun(); });
}
export function loadMeta() {
    const game = G.game, m = game.load("hexcards-meta", null);
    G.meta = m && m.v === 1 ? { ...freshMeta(), ...m } : freshMeta();
    applySettings();
}
export function applySettings() {
    const game = G.game, m = G.meta;
    game.audio.muted = !m.sound;
    game.haptics.enabled = m.haptics;
    game.data.musicOn = m.music && m.sound;
    if (!game.data.musicOn) { game.stopMusic(); resetSong(); } else resumeSong(game);
}
export const saveMeta = () => G.game.save("hexcards-meta", G.meta);
/** Called after every change a player could lose. Everything in a run is plain JSON. */
export function saveRun() {
    const g = G.game;
    if (!G.run) return;
    if (G.run.screen === "end") { g.save("hexcards-run", null); return; }
    g.save("hexcards-run", G.run);
}
export function loadRun() {
    const r = G.game.load("hexcards-run", null);
    return r && r.v === SAVE_VERSION && r.screen !== "end" ? r : null;
}
export function clearRun() { G.run = null; G.game.save("hexcards-run", null); }
export function route(args) { saveRun(); G.overlay = null; G.routing = true; G.game.go(G.run.screen, args, { fade: 0.22 }); }
export const song = (n) => playSong(G.game, n);

// ---- Measured text: every label gets a box, and shrinks or trims to stay inside it ----
const fits = new Map();
const style = (size, bold, maxWidth) => ({ size, font: FONT, bold: !!bold, align: "center", maxWidth, lineHeight: 1.25 });
export const measure = (str, size, bold, maxW = 0) => G.game.renderer.measureText(String(str), style(size, bold, maxW));
/** The smallest size a phone can read: 11 CSS px, in view units. */
export const minText = () => Math.ceil(11 / G.game.view.scale * 10) / 10;
/** Largest size from `size` down to minText at which str fits w x h. Trims with an ellipsis as a last resort. */
export function fit(str, w, h, size = 15, bold = false) {
    str = String(str);
    const min = Math.min(size, minText()), key = `${str}|${w | 0}|${h | 0}|${size}|${bold}|${min}`;
    let f = fits.get(key);
    if (f) return f;
    let s = size, t = str;
    for (; s >= min; s -= 0.5) { const m = measure(t, s, bold, w); if (m.height <= h && m.width <= w) { f = { text: t, size: s }; break; } }
    if (!f) {
        const words = str.split(" ");
        while (words.length > 1) { words.pop(); t = `${words.join(" ")}…`; const m = measure(t, min, bold, w); if (m.height <= h && m.width <= w) break; }
        f = { text: t, size: min };
    }
    fits.set(key, f);
    if (fits.size > 900) fits.delete(fits.keys().next().value);
    return f;
}
/** Draw str centred in the box at (x, y) of size w x h. */
export function label(d, str, x, y, w, h, o = {}) {
    const f = fit(str, w, h, o.size ?? 15, o.bold);
    d.text(f.text, { x, y, size: f.size, bold: o.bold, font: FONT, color: o.color ?? COLORS.cream, opacity: o.opacity, maxWidth: w, align: "center", lineHeight: 1.25 });
    return f;
}

// ---- Buttons ----
/** A brass-trimmed button entity. Goes through Pogo's tap system, so pogo check can press it. */
export function spellBtn(label, o = {}) {
    const size = o.size ?? 17, fill = o.color ?? "#7a3ad0";
    return {
        id: "spellBtn", buttonLabel: label,
        setup(e) {
            const m = e.scene.game.renderer.measureText(label, { size, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.2 });
            e.size.set(o.width ?? Math.max(m.width + 40, 120), o.height ?? 48, 0); e.note = o.note;
            e.tappable = { pad: 0 }; e._isButton = true; e.txt = label; const v = e.scene.view; e.pos.set(v.width / 2, v.height / 2);
            e.on("tap", () => { if (G.overlay || G.routing) return; if (e.disabled) { G.snd.deny(); return; } if (!o.quiet) G.snd.pick(); o.onTap?.(); });
        },
        update(dt, e) {
            const goal = (e._pressed ? 0.94 : 1) * (e.pulse ? 1 + Math.sin(e.scene.time * 5) * 0.03 : 1);
            e.scale.x += (goal - e.scale.x) * Math.min(1, dt * 24); e.scale.y = e.scale.x;
            if (o.action && !e.hidden && e._bornStep !== e.scene.game.stepCount && !G.overlay && e.scene.game.input._quiet(o.action)) e.emit("tap");
        },
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = Math.min(h / 2, o.radius ?? 16), c = e.disabled ? "#4a4258" : (e.color_ ?? fill);
            d.rect(w + 2, h + 2, { y: 3, color: "#07040f", radius: r + 1, opacity: 0.6 });
            d.rect(w + 2, h + 2, { color: e.disabled ? "#6a6278" : "#e7b75e", radius: r + 1 });
            d.rect(w - 2, h - 2, { color: c, radius: r - 1 });
            d.rect(w - 10, h * 0.42, { y: -h * 0.22, color: "#ffffff", opacity: 0.14, radius: r - 3 });
            const tw = w - 16, hasNote = !!e.note, th = hasNote ? h * 0.5 : h - 6, ty = hasNote ? -h * 0.2 : 0, f = fit(e.txt ?? label, tw, th, size, true);
            d.text(f.text, { size: f.size, bold: true, font: FONT, y: ty, color: e.disabled ? "#a8a0b8" : (o.textColor ?? "#fff6dc"), maxWidth: tw, align: "center", lineHeight: 1.25 });
            if (hasNote) { const n = fit(e.note, tw, h * 0.4, o.noteSize ?? 13, false); d.text(n.text, { size: n.size, font: FONT, y: h * 0.25, color: e.disabled ? "#a8a0b8" : "#ffe9c0", maxWidth: tw, align: "center", lineHeight: 1.25 }); }
        },
    };
}

// ---- Rich text: keywords are coloured, and tappable in the zoom view ----
const KW = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);
const layouts = new Map();
export function richLayout(str, size, width, base, bold = false) {
    const key = `${str}|${size}|${width}|${base}`;
    let L = layouts.get(key);
    if (L) return L;
    const r = G.game.renderer, st = { size, font: FONT, bold, align: "left", maxWidth: 0, lineHeight: 1.2 };
    const stB = { ...st, bold: true };
    const words = [];
    let rest = str;
    const re = new RegExp(`\\b(${KW.join("|")})\\b[.,:]?`);
    while (rest.length) {
        const m = re.exec(rest);
        if (!m) { for (const w of rest.split(/(?<=\s)/)) words.push({ t: w }); break; }
        if (m.index > 0) for (const w of rest.slice(0, m.index).split(/(?<=\s)/)) words.push({ t: w });
        words.push({ t: m[0], kw: m[1] });
        rest = rest.slice(m.index + m[0].length);
    }
    // Numbers read bold and ink-dark, because a card is mostly its numbers.
    const lines = [[]]; let x = 0;
    const space = r.measureText("n n", st).width - r.measureText("nn", st).width;
    for (const w of words) {
        const trimmed = w.t.replace(/\s+$/, ""), trail = w.t.length !== trimmed.length;
        if (!trimmed) { if (x > 0) x += space; continue; }
        const isNum = /^[×+]?\d/.test(trimmed), s = w.kw || isNum ? stB : st, wd = r.measureText(trimmed, s).width;
        if (x + wd > width && x > 0) { lines.push([]); x = 0; }
        lines[lines.length - 1].push({ t: trimmed, x, w: wd, kw: w.kw, bold: !!(w.kw || isNum) });
        x += wd + (trail ? space : 0);
    }
    L = { lines: lines.map((l) => { const last = l[l.length - 1], w = last ? last.x + last.w : 0; return { items: l, w }; }), size, lh: size * 1.3 };
    layouts.set(key, L);
    if (layouts.size > 600) layouts.delete(layouts.keys().next().value);
    return L;
}
const KW_DARK = { Block: "#1f6fb8", Burn: "#d8481e", Chill: "#3a8fc8", Hex: "#8a2fd8", Doom: "#c0235a", Power: "#a4661a", Reflux: "#128f70", Instant: "#a4661a", Keep: "#3f8f2a", "Boil Away": "#c0401e", Light: "#a4861a", Steam: "#3a7fa8", Heat: "#d0601e", Gunk: "#6a6a3a", First: "#6a4a2a", Last: "#6a4a2a", Simmer: "#c0601e" };
export function drawRich(d, L, x, y, o = {}) {
    const dark = o.dark ?? true, base = o.color ?? (dark ? COLORS.ink : COLORS.cream), h = L.lines.length * L.lh, a = o.opacity ?? 1;
    L.lines.forEach((ln, i) => {
        const y0 = y - h / 2 + L.lh * (i + 0.5), x0 = x - ln.w / 2;
        for (const it of ln.items) d.text(it.t, { x: x0 + it.x + it.w / 2, y: y0, size: L.size, bold: it.bold, font: FONT, opacity: a, color: it.kw ? (dark ? KW_DARK[it.kw] ?? base : KEYWORDS[it.kw].color) : base });
    });
    return h;
}
export const keywordsIn = (str) => { const out = []; for (const k of KW) if (str.includes(k) && !out.includes(k)) out.push(k); return out.reverse(); };

// ---- Particles ----
export class Fx {
    constructor() { this.p = []; this.nums = []; this.banners = []; }
    spark(x, y, c, o = {}) {
        if (this.p.length > 420) this.p.shift();
        const a = o.a ?? rnd() * 6.28, sp = o.sp ?? 60 + rnd() * 140;
        this.p.push({ k: o.k ?? "glow", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.g ?? 240, life: o.life ?? 0.5 + rnd() * 0.4, t: 0, s: o.s ?? 5 + rnd() * 6, c, add: o.add ?? true, grow: o.grow ?? 0, drag: o.drag ?? 0.98 });
    }
    burst(x, y, c, n = 14, o = {}) { for (let i = 0; i < n; i++) this.spark(x, y, Array.isArray(c) ? c[i % c.length] : c, o); }
    puff(x, y, c, n = 6, o = {}) { for (let i = 0; i < n; i++) this.spark(x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 10, c, { k: "puff", a: -1.57 + (rnd() - 0.5) * 1.2, sp: 20 + rnd() * 50, g: -18, life: 0.7 + rnd() * 0.7, s: 14 + rnd() * 16, add: false, grow: 26, ...o }); }
    ring(x, y, c, s = 40, life = 0.4) { this.p.push({ k: "ringfx", x, y, vx: 0, vy: 0, g: 0, life, t: 0, s: 8, c, add: true, grow: s / life, drag: 1 }); }
    num(x, y, str, c, o = {}) {
        if (this.nums.length > 40) this.nums.shift();
        this.nums.push({ x, y, str: String(str), c, t: 0, life: o.life ?? 0.9, size: o.size ?? 22, vy: o.vy ?? -42, vx: o.vx ?? (rnd() - 0.5) * 30, pop: o.pop ?? 1.6 });
    }
    update(dt) {
        const P = this.p;
        for (let i = P.length - 1; i >= 0; i--) {
            const q = P[i]; q.t += dt;
            if (q.t >= q.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
            q.vy += q.g * dt; q.vx *= q.drag; q.vy *= q.drag; q.x += q.vx * dt; q.y += q.vy * dt; q.s += q.grow * dt;
        }
        for (let i = this.nums.length - 1; i >= 0; i--) { const n = this.nums[i]; n.t += dt; n.y += n.vy * dt; n.x += n.vx * dt; n.vy *= 0.96; if (n.t > n.life) this.nums.splice(i, 1); }
    }
    draw(d) {
        const go = (add) => { for (const q of this.p) if (q.add === add) { const f = 1 - q.t / q.life; d.sprite(q.k, { x: q.x, y: q.y, width: q.s * 2, height: q.s * 2, color: q.c, opacity: (q.k === "ringfx" ? f : Math.min(1, f * 1.6)) * (q.add ? 1 : 0.5) }); } };
        go(false);
        d.additive(() => go(true));
    }
    drawNums(d) {
        for (const n of this.nums) {
            const k = n.t / n.life, s = 1 + (n.pop - 1) * Math.max(0, 1 - n.t * 7), a = k > 0.7 ? (1 - k) / 0.3 : 1;
            d.push(); d.translate(n.x, n.y); d.scale(s);
            d.text(n.str, { size: n.size, bold: true, font: FONT, x: 1.5, y: 1.5, color: "#120822", opacity: a });
            d.text(n.str, { size: n.size, bold: true, font: FONT, x: -1, y: 0, color: "#120822", opacity: a * 0.7 });
            d.text(n.str, { size: n.size, bold: true, font: FONT, color: n.c, opacity: a });
            d.pop();
        }
    }
}

// ---- Top bar: life, block, gold. Everything else lives behind Deck and the menu. ----
export const BAR_H = 44;
export function drawHud(d, s, run, block = 0) {
    const v = s.view, top = G.game.view.safe.top, W = v.width, sl = G.game.view.safe.left, y = top + BAR_H / 2;
    d.rect(W + 4, BAR_H + top, { x: W / 2, y: (BAR_H + top) / 2, color: "#120822", opacity: 0.92 });
    d.rect(W + 4, 1.5, { x: W / 2, y: BAR_H + top, color: "#e7b75e", opacity: 0.6 });
    d.push(); d.translate(sl, 0);
    d.sprite(`witch_${run.witch}`, { x: 24, y: y + 1, width: 32, height: 41 });
    const hpW = 84, f = Math.max(0, run.hp / run.maxHp), mt = Math.max(11, minText());
    d.rect(hpW, 18, { x: 46 + hpW / 2, y, color: "#07040f", radius: 9 });
    if (f > 0) d.rect(Math.max(12, (hpW - 2) * f), 16, { x: 47 + (hpW - 2) * f / 2, y, color: f < 0.34 ? "#ff5a5a" : "#d8364f", radius: 8 });
    d.text(`${run.hp}/${run.maxHp}`, { x: 46 + hpW / 2, y, size: mt + 1, bold: true, color: "#fff", font: FONT });
    let x = 148;
    if (block > 0) { d.sprite("wardicon", { x, y, width: 34, height: 34 }); d.text(fmt(block), { x, y: y - 2, size: mt, bold: true, font: FONT, color: "#07203f" }); }
    x += 26;
    d.sprite("glyph_gilt", { x, y, width: 20, height: 20 });
    d.text(`${run.gold}`, { x: x + 12 + measure(run.gold, 14, true).width / 2, y, size: 14, bold: true, color: COLORS.gold, font: FONT });
    d.pop();
}
/** The HUD lives below the button layer, so buttons stay on top of its bar. */
export const hudEntity = (s, getRun, extra, getBlock) => s.add([ui(), layer(-10), { draw(d) { drawHud(d, s, getRun(), getBlock?.() ?? 0); extra?.(d); } }]);
export const tapBox = (x, y, b) => Math.hypot(x - b.x, y - b.y) <= b.r + 4;
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const fmt = (n) => Math.round(n).toLocaleString("en-US");
export const hurryKeys = () => { const k = G.keys; G.keys = []; return k; };
export { CARDS, cardText, TRINKETS, WITCHES, KEYWORDS, pin, ui };
