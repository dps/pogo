// Touch controls and everything printed over the match: scoreboard, context buttons, banners, broadcast strap.
import { clamp } from "./sim.js";

export const FONT = '"Rockwell","Roboto Slab","Arvo","Georgia",serif';
export const INK = "#2a2118", CREAM = "#fff3d2", GOLD = "#ffcf3f", RED = "#d9483b", GRASS = "#3f8a45", SKY = "#5fb0e4", WOOD = "#7a5230", WOOD2 = "#5b3c22";

/** Chunky outlined text, like a painted sign. */
export function sign(d, str, x, y, size, col = CREAM, ink = INK, o = 0.1, op = 1) {
    const w = Math.max(1.2, size * o);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; d.text(str, { x: x + Math.cos(a) * w, y: y + Math.sin(a) * w + size * 0.04, size, bold: true, font: FONT, color: ink, opacity: op }); }
    d.text(str, { x, y, size, bold: true, font: FONT, color: col, opacity: op });
}

/** A rounded plank with a lit top edge and a hard shadow. */
export function plank(d, x, y, w, h, col = WOOD, o = {}) {
    const r = o.radius ?? 9, op = o.opacity ?? 1;
    d.rect(w, h, { x, y: y + 3, color: "#00000055", radius: r, opacity: op });
    d.rect(w, h, { x, y, color: o.edge ?? INK, radius: r, opacity: op });
    d.rect(w - 4, h - 4, { x, y, color: col, radius: r - 1.5, opacity: op });
    d.rect(w - 10, Math.max(1.5, h * 0.09), { x, y: y - h / 2 + h * 0.13, color: "#ffffff30", radius: 2, opacity: op });
}

export class Controls {
    constructor(game, s) {
        this.game = game; this.s = s; this.map = new Map(); this.stick = null; this.sx = 0; this.sy = 0; this.a = false; this.b = false; this.mouseHold = 0; this.tapA = 0; this.usedMouse = false; this.mx = 0; this.mz = 0;
    }
    layout() {
        const v = this.s.view, sf = v.safe, tall = v.height > v.width;
        const R = tall ? 50 : 46, r = tall ? 41 : 38, m = 12;
        const bx = v.width - sf.right - m - R, by = v.height - sf.bottom - m - R - (tall ? 14 : 2);
        return { b: { x: bx, y: by, r: R }, a: tall ? { x: bx - R - r + 4, y: by - r * 0.86, r } : { x: bx - R - r - 2, y: by - 12, r }, home: { x: sf.left + 74, y: v.height - sf.bottom - 80 } };
    }
    /** Fills in {sx, sy, a, b} for this step, in screen terms. */
    read() {
        const s = this.s, i = s.input, game = this.game;
        if (i.touchMode) {
            const L = this.layout(), v = s.view, seen = new Set();
            let a = false, b = false, sx = 0, sy = 0;
            for (const t of i.touches) {
                seen.add(t.id);
                let c = this.map.get(t.id);
                if (!c) {
                    const hit = (q) => Math.hypot(t.x - q.x, t.y - q.y) < q.r * 1.32;
                    let role = "none";
                    if (hit(L.b)) role = "b"; else if (hit(L.a)) role = "a";
                    else if (t.x < v.width * 0.55 && t.y > v.height * 0.22 && !this.stick) { role = "stick"; this.stick = t.id; }
                    else if (t.x >= v.width * 0.55 && t.y > v.height * 0.4) role = hitNear(t, L);
                    c = { role, ox: t.x, oy: t.y };
                    this.map.set(t.id, c);
                    if (role === "a" || role === "b") game.haptic("tick");
                }
                if (c.role === "a") a = true;
                if (c.role === "b") b = true;
                if (c.role === "stick") {
                    let dx = t.x - c.ox, dy = t.y - c.oy; const max = 46, l = Math.hypot(dx, dy);
                    if (l > max) { c.ox += dx * (1 - max / l) * 0.6; c.oy += dy * (1 - max / l) * 0.6; dx = t.x - c.ox; dy = t.y - c.oy; }
                    const k = Math.min(1, Math.hypot(dx, dy) / max), n = Math.hypot(dx, dy) || 1;
                    if (k > 0.14) { sx = dx / n * Math.min(1, k * 1.5); sy = dy / n * Math.min(1, k * 1.5); }
                    this.kx = t.x; this.ky = t.y; this.ox = c.ox; this.oy = c.oy;
                }
            }
            for (const id of [...this.map.keys()]) if (!seen.has(id)) { if (id === this.stick) this.stick = null; this.map.delete(id); }
            this.sx = sx; this.sy = sy; this.a = a; this.b = b;
            return;
        }
        // Keyboard and pad.
        const m = i.move;
        this.sx = m.x; this.sy = m.y;
        this.a = i.down("pass") || i.pressed("pass"); this.b = i.down("shoot") || i.pressed("shoot");
        // Mouse: aim with the pointer on the pitch; click passes, hold shoots.
        const p = i.pointer;
        if (Math.abs(p.dx) + Math.abs(p.dy) > 0.5 || p.down) this.usedMouse = true;
        if (Math.abs(this.sx) + Math.abs(this.sy) > 0.1 || this.a || this.b) this.usedMouse = false;
        this.mouse = this.usedMouse;
        if (this.usedMouse) {
            if (p.down) { this.mouseHold += 1 / 60; if (this.mouseHold > 0.16) this.b = true; }
            else { if (this.mouseHold > 0 && this.mouseHold <= 0.16) this.tapA = 3; this.mouseHold = 0; }
            if (this.tapA > 0) { this.tapA--; this.a = this.tapA > 0; }
            this.pointer = { x: p.x, y: p.y };
        }
    }

    draw(d, ctx, charge) {
        const s = this.s, i = s.input;
        if (!i.touchMode) return;
        const L = this.layout(), held = (r) => [...this.map.values()].some((c) => c.role === r);
        // Stick.
        const on = this.stick !== null, ox = on ? this.ox ?? L.home.x : L.home.x, oy = on ? this.oy ?? L.home.y : L.home.y, kx = on ? this.kx ?? ox : ox, ky = on ? this.ky ?? oy : oy;
        d.circle(50, { x: ox, y: oy, color: "#00000030" }); d.circle(50, { x: ox, y: oy, color: "#fff3d2", outline: 2.5, opacity: on ? 0.75 : 0.42 });
        const nx = kx - ox, ny = ky - oy, n = Math.hypot(nx, ny), q = n > 46 ? 46 / n : 1;
        d.circle(23, { x: ox + nx * q, y: oy + ny * q + 2, color: "#00000055" }); d.circle(23, { x: ox + nx * q, y: oy + ny * q, color: "#fff3d2", opacity: on ? 0.95 : 0.6 });
        this.button(d, L.a, ctx?.a ?? "PASS", "#3f8fd0", held("a"), ctx?.holdA ?? 0, ctx);
        this.button(d, L.b, ctx?.b ?? "SHOOT", ctx?.b === "BUTT" ? "#e0612f" : "#e8a020", held("b"), charge, ctx);
    }

    button(d, c, label, col, down, fill, ctx) {
        const r = c.r * (down ? 0.93 : 1), y = c.y + (down ? 2 : 0), full = fill >= 1;
        d.circle(r, { x: c.x, y: c.y + 4, color: "#00000066" });
        d.circle(r, { x: c.x, y, color: INK });
        d.circle(r - 3, { x: c.x, y, color: col, opacity: down ? 1 : 0.9 });
        d.circle((r - 3) * 0.86, { x: c.x, y: y - 3, color: "#ffffff22" });
        if (fill > 0) {
            // Charge ring, drawn as segments.
            const N = 28, n = Math.floor(fill * N);
            for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / N * Math.PI * 2; d.circle(3.4, { x: c.x + Math.cos(a) * (r - 1), y: y + Math.sin(a) * (r - 1), color: full ? "#fff" : GOLD }); }
        }
        if (ctx?.hot) d.circle(r + 4 + Math.sin(this.game.stepCount * 0.3) * 2, { x: c.x, y, color: GOLD, outline: 3 });
        sign(d, label, c.x, y, label.length > 5 ? 15 : 18, CREAM, INK, 0.1);
    }
}

function hitNear(t, L) {
    const da = Math.hypot(t.x - L.a.x, t.y - L.a.y), db = Math.hypot(t.x - L.b.x, t.y - L.b.y);
    if (Math.min(da, db) > 95) return "none";
    return da < db ? "a" : "b";
}

export function clockStr(t) {
    const c = Math.ceil(t), m = Math.floor(c / 60), s = c % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/** Scoreboard: two painted kit tabs either side of the score. */
export function scoreboard(d, v, st) {
    const tall = v.height > v.width, w = tall ? 236 : 262, h = 42, x = v.width / 2, y = v.safe.top + h / 2 + 6, pop = st.pop ?? [1, 1];
    plank(d, x, y, w, h, WOOD, { radius: 10 });
    const tab = 62, cl = w / 2 - tab / 2 - 8;
    for (const [i, sx] of [[0, -1], [1, 1]]) {
        const K = st.kits[i], cx = x + sx * cl;
        d.rect(tab, h - 12, { x: cx, y, color: K.c1, radius: 6 });
        d.rect(tab, 5, { x: cx, y: y + (h - 12) / 2 - 3, color: K.c2, radius: 2 });
        sign(d, K.tag, cx, y - 1, 16, "#fff", INK, 0.1);
    }
    const sx = 26;
    plank(d, x, y, 76, 32, "#2a2118", { radius: 6, edge: "#2a2118" });
    d.text(String(st.score[0]), { x: x - sx, y: y + 1, size: 25 * pop[0], bold: true, font: FONT, color: pop[0] > 1.02 ? GOLD : CREAM });
    d.text(String(st.score[1]), { x: x + sx, y: y + 1, size: 25 * pop[1], bold: true, font: FONT, color: pop[1] > 1.02 ? GOLD : CREAM });
    d.text("-", { x, y: y + 1, size: 18, bold: true, font: FONT, color: "#8a7a60" });
    const low = !st.golden && st.clock <= 15;
    const cy = y + h / 2 + 11;
    plank(d, x, cy, st.golden ? 112 : 58, 22, low && Math.floor(st.clock * 2) % 2 ? RED : "#2a2118", { radius: 6, edge: "#2a2118" });
    d.text(st.golden ? "GOLDEN GOAL" : clockStr(st.clock), { x, y: cy + 1, size: st.golden ? 12 : 14, bold: true, font: FONT, color: st.golden ? GOLD : CREAM });
}

/** Little pitch map: where everyone is. */
export function radar(d, v, sim, kits, humans) {
    const tall = v.height > v.width, W = tall ? 46 : 104, H = tall ? 76 : 62, x = v.width - v.safe.right - W / 2 - 7, y = v.safe.top + H / 2 + 8;
    d.rect(W + 6, H + 6, { x, y, color: "#2a2118cc", radius: 7 });
    d.rect(W, H, { x, y, color: "#4c9a4c", radius: 4 });
    if (tall) d.rect(W, 1.5, { x, y, color: "#fff3d2", opacity: 0.6 }); else d.rect(1.5, H, { x, y, color: "#fff3d2", opacity: 0.6 });
    const P = (px, pz) => (tall ? [x + pz / 14.5 * W / 2, y - px / 24 * H / 2] : [x + px / 24 * W / 2, y + pz / 14.5 * H / 2]);
    for (const g of sim.goats) { const [a, b] = P(g.x, g.z); d.circle(humans.includes(g) ? 4 : 2.8, { x: a, y: b, color: humans.includes(g) ? "#ffe14a" : kits[g.team].c1 }); if (!humans.includes(g)) d.circle(2.8, { x: a, y: b, color: "#2a2118", outline: 1 }); }
    const [a, b] = P(sim.ball.x, sim.ball.z);
    d.circle(2.6, { x: a, y: b, color: "#fff" });
}

export function wrap(s, n) {
    const out = []; let l = "";
    for (const w of s.split(" ")) { if ((l + " " + w).trim().length > n) { out.push(l); l = w; } else l = (l + " " + w).trim(); }
    if (l) out.push(l);
    return out;
}

/** The one-line broadcast caption. */
export function strap(d, v, line, a, base) {
    const tall = v.height > v.width, y = base, w = Math.min(v.width - 24, tall ? 340 : 440), op = clamp(a, 0, 1);
    plank(d, v.width / 2, y, w, 30, "#fff3d2", { radius: 5, opacity: op });
    d.rect(7, 22, { x: v.width / 2 - w / 2 + 9, y, color: RED, radius: 2, opacity: op });
    d.text(line, { x: v.width / 2 + 4, y: y + 1, size: line.length > 42 ? 12 : 13.5, bold: true, font: FONT, color: INK, opacity: op, maxWidth: w - 24 });
}
