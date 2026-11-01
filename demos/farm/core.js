// Shared runtime: atlas drawing, the light model, little particles, and the pixel UI kit that every scene is built from.
import { pos, tap as tapC, ui as uiC } from "./pogo.js";
import { SEASONS, MOONS, COLS } from "./data.js";
import * as S from "./sim.js";

export const G = { game: null, atlas: null, font: null, sound: null, sim: null, bg: null, seasonPainted: null };
export const ART = 2; // art pixels to view units

const COLORS = { ink: "#2a1b47", inkSoft: "#5a4a70", paper: "#f6e8c4", paperHi: "#fff8e4", gold: "#f4cf6a", moon: "#a8f0ff", white: "#ffffff", sage: "#b8ecc8", rose: "#ffb0c0", dim: "#c8b8d8" };
export { COLORS };

/** Draw a named atlas sprite, centred on x,y, at 2x by default. */
export function spr(d, name, x, y, o = {}) {
    const r = G.atlas.map.get(name), s = o.s ?? ART;
    d.sprite("atlas", { crop: r, x, y, width: o.w ?? r[2] * s, height: o.h ?? r[3] * s, color: o.color, opacity: o.opacity, flipX: o.flip, rot: o.rot });
}
/** Same, anchored by the bottom centre, for things that stand on the ground. */
export function foot(d, name, x, y, o = {}) { const r = G.atlas.map.get(name), s = o.s ?? ART; spr(d, name, x, y - (r[3] * s) / 2, o); }
export function glow(d, x, y, r, col, opacity = 1) { d.sprite("glow", { x, y, width: r * 2, height: r * 2, color: col, opacity }); }

export const say = (d, s, x, y, o) => G.font.draw(d, s, x, y, o);

/** Sky colour, world tint and how much crops glow, from a day value: 0 night, 1 day. */
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const NIGHT = [0.38, 0.41, 0.74], DUSK = [0.92, 0.62, 0.66], DAY = [1, 0.98, 0.92];
export function ambient(t) { return t < 0.5 ? lerp3(NIGHT, DUSK, t * 2) : lerp3(DUSK, DAY, (t - 0.5) * 2); }

/** A featherweight particle list, because the framework's bursts can't be additive or fly to a target. */
export class Fx {
    constructor(s) { this.s = s; this.parts = []; this.rings = []; this.floats = []; this.flies = []; }
    spark(x, y, o = {}) {
        const n = o.n ?? 8, r = G.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = (o.a ?? 0) + r.range(-(o.spread ?? 3.14), o.spread ?? 3.14), v = r.range(o.v0 ?? 30, o.v1 ?? 110);
            this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 90, t: 0, life: r.range(0.35, o.life ?? 0.8), size: r.range(1, o.size ?? 2.6), col: o.col ?? "#ffe9a8", soil: o.soil });
        }
    }
    ring(x, y, col, r1 = 34, life = 0.5) { this.rings.push({ x, y, col, r1, t: 0, life }); }
    float(x, y, text, col = "#fff", scale = 2) { this.floats.push({ x, y, text, col, t: 0, scale, life: 1.2 }); }
    /** Something arcs from a to b, then calls done. */
    fly(name, x0, y0, x1, y1, o = {}) { this.flies.push({ name, x0, y0, x1, y1, t: -(o.delay ?? 0), dur: o.dur ?? 0.5, lift: o.lift ?? 60, s: o.s ?? 2, done: o.done, glow: o.glow }); }
    update(dt) {
        for (const p of this.parts) { p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; }
        this.parts = this.parts.filter((p) => p.t < p.life);
        for (const p of this.rings) p.t += dt;
        this.rings = this.rings.filter((p) => p.t < p.life);
        for (const p of this.floats) p.t += dt;
        this.floats = this.floats.filter((p) => p.t < p.life);
        for (const f of this.flies) { f.t += dt; if (f.t >= f.dur && !f.over) { f.over = true; f.done?.(); } }
        this.flies = this.flies.filter((f) => !f.over);
    }
    drawSolid(d) {
        for (const p of this.parts) if (p.soil) d.rect(p.size * 2, p.size * 2, { x: p.x, y: p.y, color: p.col, opacity: 1 - p.t / p.life });
    }
    drawGlow(d) {
        for (const r of this.rings) { const k = r.t / r.life; d.rect(0, 0); d.circle(4 + r.r1 * k, { x: r.x, y: r.y, color: r.col, outline: 2, opacity: (1 - k) * 0.7 }); }
        for (const p of this.parts) if (!p.soil) { const f = 1 - p.t / p.life; d.rect(p.size * 2, p.size * 2, { x: Math.round(p.x / 2) * 2, y: Math.round(p.y / 2) * 2, color: p.col, opacity: f }); glow(d, p.x, p.y, 6 * p.size, p.col, f * 0.3); }
    }
    drawTop(d) {
        for (const f of this.flies) {
            if (f.t < 0) continue;
            const k = f.t / f.dur, e = k * k * (3 - 2 * k), x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * 3.14) * f.lift;
            if (f.glow) d.additive(() => glow(d, x, y, 22, f.glow, 0.7));
            spr(d, f.name, x, y, { s: f.s * (1 + Math.sin(k * 3.14) * 0.3), rot: k * 5 * (f.x1 > f.x0 ? 1 : -1) * 0.25 });
        }
        for (const p of this.floats) { const k = p.t / p.life; say(d, p.text, p.x, p.y - 14 - k * 34 * (2 - k), { align: "center", color: p.col, outline: COLORS.ink, opacity: Math.min(1, (1 - k) * 2.5), scale: p.scale }); }
    }
}

// ---- 9-slice panels -------------------------------------------------------------------------------------------------------
export function panel(d, x, y, w, h, kind = "paper", o = {}) {
    const name = `panel:${kind}`, [ax, ay] = G.atlas.map.get(name), c = 4, s = 2, q = c * s, col = o.color, opacity = o.opacity;
    const put = (cx, cy, cw, ch, px, py, pw, ph) => d.sprite("atlas", { crop: [cx, cy, cw, ch], x: px + pw / 2, y: py + ph / 2, width: pw, height: ph, color: col, opacity });
    const mw = 4, mx = ax + c, my = ay + c;
    put(ax, ay, c, c, x, y, q, q); put(mx, ay, mw, c, x + q, y, w - q * 2, q); put(mx + mw, ay, c, c, x + w - q, y, q, q);
    put(ax, my, c, mw, x, y + q, q, h - q * 2); put(mx, my, mw, mw, x + q, y + q, w - q * 2, h - q * 2); put(mx + mw, my, c, mw, x + w - q, y + q, q, h - q * 2);
    put(ax, my + mw, c, c, x, y + h - q, q, q); put(mx, my + mw, mw, c, x + q, y + h - q, w - q * 2, q); put(mx + mw, my + mw, c, c, x + w - q, y + h - q, q, q);
}
export function paintPanels(atlas, hex, Px) {
    const mk = (name, edge, face, hi, lo, inner) => atlas.add(`panel:${name}`, 12, 12, (p) => {
        const E = hex(edge), F = hex(face), H = hex(hi), L = hex(lo);
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
            const cx = Math.min(x, 11 - x), cy = Math.min(y, 11 - y);
            if (cx + cy < 1) continue;
            if (cx === 0 || cy === 0 || cx + cy === 1) p.set(x, y, E);
            else p.set(x, y, y <= 2 && y >= 1 && cy === 1 ? H : y >= 10 && cy === 1 ? L : (cx === 1 && x <= 2) ? H : (cx === 1) ? L : F);
        }
        if (inner) p.set(5, 5, hex(inner));
    });
    mk("paper", "#2a1b47", "#f6e8c4", "#fff8e4", "#d4b890");
    mk("night", "#120c2c", "#2e1d4a", "#5a4480", "#1c1230");
    mk("gold", "#2a1b47", "#f4cf6a", "#fff0a8", "#c08a3a");
    mk("green", "#1e3a3a", "#5a9a68", "#a4d48a", "#2c5a48");
    mk("rose", "#4a1a3a", "#d0646a", "#f4a890", "#8a2c48");
    mk("plain", "#2a1b47", "#e8cfa4", "#f6e8c4", "#b89470");
    mk("dim", "#1c1230", "#47385e", "#5e4e78", "#2e2244");
    mk("glass", "#120c2c", "#1c1230", "#2e1d4a", "#120c2c");
}

// ---- The UI kit -------------------------------------------------------------------------------------------------------------
/** One pixel button. Everything in the game with a label is one of these real tappable entities, so tests and the monkey can reach it. */
export function button(s, o) {
    const e = s.add([uiC(), pos(o.x + o.w / 2, o.y + o.h / 2), tapC(() => {
        if (o.disabled) { G.sound.deny(); return; }
        G.sound.click(); e.kick = 1; o.onTap?.();
    }), {
        name: o.name, layer: o.layer ?? 50, kick: 0,
        update(dt) { this.kick = Math.max(0, this.kick - dt * 5); if (o.update) o.update(this, dt); },
        draw(d) {
            const pressed = this._pressed, w = o.w, h = o.h, sc = 1 + Math.sin(this.kick * 3.14) * 0.06;
            d.push(); d.scale(sc, sc);
            const dy = pressed ? 2 : 0;
            if (o.draw) o.draw(d, -w / 2, -h / 2 + dy, w, h, pressed);
            else {
                if (!o.bare) panel(d, -w / 2, -h / 2 + dy, w, h, o.disabled ? "dim" : o.kind ?? "paper");
                const dark = !["night", "rose", "dim", "green"].includes(o.disabled ? "dim" : o.kind ?? "paper");
                const col = o.color ?? (dark ? COLORS.ink : COLORS.paperHi);
                const scale = o.scale ?? 2;
                if (o.icon && o.label) { const tw = G.font.width(o.label, scale), iw = G.atlas.map.get(o.icon)[2] * (o.iconS ?? 2), left = -(tw + iw + 6) / 2; spr(d, o.icon, left + iw / 2, dy, { s: o.iconS ?? 2 }); say(d, o.label, left + iw + 6, dy - 9 * scale / 2 + 1, { color: col, scale }); }
                else if (o.icon) spr(d, o.icon, 0, dy + (o.sub ? -7 : 0), { s: o.iconS ?? 2, opacity: o.disabled ? 0.5 : 1 });
                else if (o.label) say(d, o.label, 0, dy - 9 * scale / 2 + 1, { align: "center", color: col, scale });
                if (o.sub) say(d, o.sub, 0, h / 2 - 22 + dy, { align: "center", color: col, scale: 2 });
                o.extra?.(d, dy);
            }
            d.pop();
        },
    }]);
    e.size.set(o.w, o.h, 0);
    return e;
}
/** Non-interactive drawn UI. */
export function drawn(s, o) {
    const e = s.add([uiC(), pos(o.x ?? 0, o.y ?? 0), { layer: o.layer ?? 40, update: o.update, draw: o.draw }]);
    return e;
}

/** A UI layer that can be thrown away and rebuilt whenever the state it shows changes. */
export class Group {
    constructor(s) { this.s = s; this.list = []; }
    add(e) { this.list.push(e); return e; }
    button(o) { return this.add(button(this.s, o)); }
    drawn(o) { return this.add(drawn(this.s, o)); }
    clear() { for (const e of this.list) e.destroy(); this.list = []; }
}

export function pad2(n) { return n < 10 ? ` ${n}` : `${n}`; }
export function dateLine(st) { return `${SEASONS[S.season(st)]} ${S.dayOfSeason(st)}`; }
export function moonName(st) { return MOONS[S.moon(st)]; }
export function saveGame() { const st = G.sim; if (st) { st.savedAt = Date.now(); G.game.save("moonpatch1", st); } }
