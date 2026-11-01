// The thumb's dashboard: food, brood chips, minimap, warnings, the nest in section.
import { pos, rect, tap, ui } from "./pogo.js";
import { CASTES, CHAMBERS, CHAMBER_BY_ID, FLYER, FOODS, TEAMS } from "./data.js";
import { GATHER } from "./sim.js";

export const FONT = '"Arial Rounded MT Bold","Trebuchet MS",ui-rounded,system-ui,sans-serif';
export const INK = "#1d1410", CREAM = "#fff3d6", GOLD = "#ffc94d";
const FOOD_ICON = ["iconCrumb", "iconSugar", "iconMeat", "iconPickle"];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TRAIL_NAME = ["GATHER", "ATTACK", "GUARD"], TRAIL_CSS = ["#ffd166", "#ff6a5a", "#7cd0ff"];

/** Sprite from an atlas by region. */
export function atlasSprite(d, sheet, reg, x, y, w, h, o = {}) { d.sprite(sheet, { crop: [reg.x, reg.y, reg.w, reg.h], x, y, width: w, height: h, ...o }); }
export const shadowText = (d, str, o) => { d.text(str, { ...o, x: (o.x ?? 0) + 1, y: (o.y ?? 0) + 1.5, color: "#000000aa", font: FONT, bold: true }); d.text(str, { ...o, font: FONT, bold: true }); };
export function panel(d, w, h, fill = "#2b1d14", r = 12) { d.rect(w + 4, h + 6, { y: 2, color: "#0e0906cc", radius: r + 2 }); d.rect(w, h, { color: fill, radius: r }); d.rect(w - 6, Math.min(h * 0.4, 18), { y: -h / 2 + Math.min(h * 0.2, 12), color: "#ffffff", opacity: 0.06, radius: Math.min(r - 2, 6) }); }

/** A chunky tappable. */
export function chunky(s, label, x, y, w, h, onTap, o = {}) {
    const fill = o.color ?? "#f2963f", ink = o.ink ?? "#2a1505", size = o.size ?? 17;
    return s.add([ui(), pos(x, y), rect(w, h, { color: "#00000000" }), tap(onTap), { name: label, layer: o.layer ?? 60, draw(d, e) {
        const press = e._pressed ? 2.5 : 0, r = o.radius ?? 13, lab = typeof label === "function" ? label() : label;
        d.rect(w + 5, h + 8, { y: 3, color: "#120b07", radius: r + 3 });
        d.rect(w, h, { y: press, color: fill, radius: r });
        d.rect(w - 9, h * 0.38, { y: press - h * 0.22, color: "#ffffff", opacity: 0.2, radius: r - 4 });
        d.text(lab, { y: press + 1.5, size, bold: true, font: FONT, color: "#00000040" }); d.text(lab, { y: press, size, bold: true, font: FONT, color: ink });
    } }]);
}

export class Hud {
    constructor(game, s, sim, stage, W, U, snd, o = {}) {
        this.game = game; this.s = s; this.sim = sim; this.stage = stage; this.W = W; this.U = U; this.snd = snd; this.o = o; this.els = []; this.nest = null; this.pulse = null; this.line = null; this.queue = []; this.mini = { x: 0, y: 0, w: 0, h: 0, pts: [] }; this.miniT = 0; this.flash = [0, 0, 0, 0];
        this.layout();
        s.add([ui(), pos(0, 0), { name: "hud", layer: 35, draw: (d) => this.draw(d) }]);
        s.on("resize", () => { this.layout(); if (this.nest) { this.closeNest(); this.openNest(); } });
    }
    static pads(game) { const v = game.view, safe = v.safe ?? { top: 0, bottom: 0 }, land = v.width > v.height; return { top: (land ? 44 : 66) + (safe.top ?? 0), bottom: (land ? 70 : 146) + (safe.bottom ?? 0), land }; }
    el(x, y, w, h, draw, onTap, name, layer = 40) { const e = this.s.add([ui(), pos(x, y), rect(w, h, { color: "#00000000" }), tap(onTap), { name, layer, draw(d, en) { draw(d, en); } }]); this.els.push(e); return e; }
    layout() {
        for (const e of this.els) e.destroy(); this.els = [];
        const { game, s, sim, W, U, stage } = this, v = s.view, P = Hud.pads(game), safe = v.safe ?? { top: 0, bottom: 0, left: 0, right: 0 }; this.P = P; stage.o.pads = P;
        const L = (safe.left ?? 0) + 6, R = v.width - (safe.right ?? 0) - 6, B = v.height - (safe.bottom ?? 0) - 6, T = (safe.top ?? 0) + 5;
        const ratio = sim.w / sim.h;
        // Minimap: drag it to fly the camera. It's the way around for a player with one thumb.
        const mh = P.land ? 112 : 128, mw = Math.min(P.land ? 120 : 112, mh * ratio), mh2 = mw / ratio, mx = L + mw / 2 + 2, my = B - mh2 / 2 - 2;
        this.mini = { x: mx - mw / 2, y: my - mh2 / 2, w: mw, h: mh2, pts: this.mini.pts };
        this.miniEl = this.el(mx, my, mw, mh2, () => {}, () => {}, "minimap", 42);
        const right0 = P.land ? mx + mw / 2 + 8 : mx + mw / 2 + 7, right1 = R, chipGap = 3;
        const nChips = 5;
        if (P.land) {
            const btn = 44, btnsW = btn * 3 + 8, chipW = Math.min(58, (right1 - right0 - btnsW - 8 - chipGap * 4) / nChips), y = B - 28;
            for (let c = 0; c < nChips; c++) this.chip(c, right0 + chipW / 2 + c * (chipW + chipGap), y, chipW, 56);
            this.buttons(right1 - btn / 2, y, btn, 52, -1);
        } else {
            const chipW = (right1 - right0 - chipGap * 4) / nChips, y0 = B - 104;
            for (let c = 0; c < nChips; c++) this.chip(c, right0 + chipW / 2 + c * (chipW + chipGap), y0 + 8, chipW, 66);
            const bw = (right1 - right0 - 8) / 3; this.buttons(right1 - bw / 2, B - 27, bw, 50, -1);
        }
        this.el(R - 22, T + 20, 50, 50, (d, e) => { panel(d, 40, 38); d.rect(6, 18, { x: -6, color: CREAM, radius: 2 }); d.rect(6, 18, { x: 6, color: CREAM, radius: 2 }); }, () => { this.snd.click(); this.o.onPause?.(); }, "pause", 45);
        // Warning banner, tap it to fly to the trouble.
        this.bannerEl = this.el(v.width / 2 + (P.land ? 60 : 0), P.top + (P.land ? -8 : 14), Math.min(v.width - 20, 280), 50, (d) => this.drawBanner(d), () => { const b = stage.banner; if (b) { stage.lookAt(b.x, b.y); this.snd.click(); } }, "alert", 44);
        this.lineX = P.land ? Math.min(v.width - 16, 348) / 2 + L + 2 : v.width / 2; this.lineY = P.top + (P.land ? 48 : 74);
    }
    buttons(x, y, w, h, dir) {
        const { stage, snd, sim } = this, g = 4;
        this.el(x, y, w, h, (d, e) => { panel(d, w - 2, h - 2, stage.speed > 1 ? "#a8631c" : "#2b1d14"); this.ffIcon(d, stage.speed); }, () => { stage.speed = stage.speed === 1 ? 2 : stage.speed === 2 ? 4 : 1; snd.focus(stage.speed); }, "fast", 41);
        this.el(x + (w + g) * dir, y, w, h, (d) => { panel(d, w - 2, h - 2); const far = stage.cam.tz <= stage.minZoom() * 1.1 + 0.02, k = far ? 6 : 11; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { d.line([a * k, b * (k - 3)], [a * k, b * k - 0 - 3 - 0], { width: 3, color: CREAM }); d.line([a * k, b * k - 3], [a * (k - 6), b * k - 3], { width: 3, color: CREAM }); d.line([a * k, b * k - 3], [a * k, b * (k - 6) - 3], { width: 3, color: CREAM }); } d.text(far ? "CLOSE" : "WHOLE", { y: 15, size: 9.5, bold: true, font: FONT, color: CREAM }); }, () => { stage.toggleZoom(); snd.click(); }, "zoom", 41);
        this.nestBtn = this.el(x + (w + g) * dir * 2, y, w, h, (d) => {
            const can = this.nestReady(), glow = this.pulse === "nest"; panel(d, w - 2, h - 2, can || glow ? "#5a7d2c" : "#2b1d14");
            atlasSprite(d, "world", this.W[`nest0`], 0, -2, 40, 40); shadowText(d, this.sim.me.saving ? "SAVING" : "NEST", { y: 15, size: 10.5, color: this.sim.me.saving ? "#ffd166" : CREAM });
            if (glow) d.rect(w + 2 + Math.sin(this.stage.time * 7) * 3, h + 2 + Math.sin(this.stage.time * 7) * 3, { color: "#00000000", outline: 3, radius: 13 });
        }, () => this.openNest(), "nest", 41);
    }
    nestReady() { const s = this.sim; return CHAMBERS.some((c) => s.canBuild(0, c.id)); }
    ffIcon(d, sp) { for (let i = 0; i < 2; i++) d.poly([[-11 + i * 10, -8], [-1 + i * 10, 0], [-11 + i * 10, 8]], { color: sp > 1 ? "#fff3b0" : CREAM }); d.text(`x${sp}`, { y: 15, size: 10.5, bold: true, font: FONT, color: CREAM }); }
    chip(c, x, y, w, h) {
        const { sim, W, snd } = this, me = sim.me, cs = CASTES[c];
        this.el(x, y, w, h, (d, e) => {
            const open = me.unlocked(c), on = me.focus === c, afford = open && sim.affordable(me, cs.cost), hilite = this.pulse === `caste${c}`;
            const press = e._pressed ? 1.5 : 0;
            d.rect(w + 2, h + 4, { y: 1.5, color: "#0e0906cc", radius: 11 }); d.rect(w - 2, h - 2, { y: press, color: on ? "#d98a1e" : open ? "#3a281b" : "#241812", radius: 10 });
            if (on) d.rect(w - 6, (h - 6) * 0.42, { y: press - h * 0.22, color: "#ffffff", opacity: 0.22, radius: 8 });
            const reg = W[`ant0_${c}_${(this.stage.time * 8 | 0) % (on ? 4 : 1)}`], S = c === 0 ? 32 : 36;
            d.sprite("world", { crop: [reg.x, reg.y, reg.w, reg.h], y: press - 12, width: S, height: S, rot: -1.5708, color: open ? "#ffffff" : "#6a5c50" });
            if (!open) atlasSprite(d, "uisheet", this.U.iconLock, 0, press - 8, 22, 22);
            const n = me.counts[c]; shadowText(d, open ? String(n) : cs.name, { y: press + 15, size: open ? 13 : 9.5, color: on ? "#fff8e6" : CREAM });
            // Food cost dots.
            if (open) { let kx = -((cs.cost.filter((v, i) => v && i).length - 1) * 11) / 2; for (let t = 1; t < 4; t++) if (cs.cost[t]) { atlasSprite(d, "uisheet", this.U[FOOD_ICON[t]], kx, press + 25, 12, 12); kx += 11; } if (!cs.cost[1] && !cs.cost[2] && !cs.cost[3]) atlasSprite(d, "uisheet", this.U.iconCrumb, 0, press + 25, 11, 11); if (on && !afford) d.rect(w - 2, h - 2, { y: press, color: "#ff3b30", opacity: Math.sin(this.stage.time * 6) * 0.12 + 0.14, radius: 10 }); }
            if (hilite) { const k = Math.sin(this.stage.time * 7) * 3; d.rect(w + 2 + k, h + 2 + k, { color: "#00000000", outline: 3, radius: 13 }); }
        }, () => { if (!me.unlocked(c)) { snd.denied(); this.openNest(cs.chamber); return; } sim.setFocus(0, c); snd.focus(c); this.o.onFocus?.(c); }, `caste-${cs.id}`, 41);
    }
    say(who, text) { this.queue.push({ who, text }); if (!this.line) this.nextLine(); }
    nextLine() { const n = this.queue.shift(); this.line = n ? { ...n, t: Math.max(3.6, n.text.length * 0.058), age: 0 } : null; if (n) this.snd.sfx({ wave: "triangle", freq: 520, to: 620, decay: 0.06, volume: 0.09 }, "tick"); }
    step(dt) {
        if (this.line) { this.line.age += dt; if ((this.line.t -= dt) <= 0) { this.line = null; this.nextLine(); } }
        this.bannerEl.hidden = !this.stage.banner;
        // Minimap drag.
        const m = this.mini, stage = this.stage;
        if (this.miniEl._pressed) { const t = this.s.input.touches[0]; if (t) { const k = 0.7; stage.lookAt((t.x - m.x) / m.w * this.sim.w, (t.y - m.y) / m.h * this.sim.h); stage.cam.x = stage.cam.tx; stage.cam.y = stage.cam.ty; } }
        for (let i = 0; i < 4; i++) { const had = this.last?.[i] ?? 0, now = this.sim.me.stock[i]; if (now > had) this.flash[i] = 1; this.flash[i] = Math.max(0, this.flash[i] - dt * 4); }
        this.last = this.sim.me.stock.slice();
        if ((this.miniT -= dt) <= 0) { this.miniT = 0.25; this.scanMini(); }
    }
    /** Ant density as a few dozen coloured dots, refreshed four times a second. */
    scanMini() {
        const { sim } = this, G = 34, grid = new Int16Array(G * G * 2), sx = G / sim.w, sy = G / sim.h, teamOf = new Int8Array(G * G);
        for (let i = 0; i < sim.top; i += 2) { if (!sim.alive[i]) continue; const c = (sim.x[i] * sx | 0) + (sim.y[i] * sy | 0) * G, k = sim.team[i] === 0 ? 0 : 1; grid[c * 2 + k]++; if (k) teamOf[c] = sim.team[i]; }
        const pts = []; for (let c = 0; c < G * G; c++) for (let k = 0; k < 2; k++) { const n = grid[c * 2 + k]; if (n) pts.push(((c % G) + 0.5) / G, ((c / G | 0) + 0.5) / G, k ? teamOf[c] : 0, Math.min(1, n / 6)); }
        this.mini.pts = pts;
    }
    draw(d) {
        const { s, sim, stage, U, W } = this, v = s.view, me = sim.me, P = this.P, safe = v.safe ?? { top: 0, left: 0, right: 0, bottom: 0 };
        d.sprite("uisheet", { crop: [U.vignette.x, U.vignette.y, 128, 128], x: v.width / 2, y: v.height / 2, width: v.width, height: v.height, opacity: 0.8 });
        if (!P.land) d.rect(v.width, P.bottom + 4, { x: v.width / 2, y: v.height - P.bottom / 2 + 2, color: "#1a100ad9" });
        // Top strip of food.
        const T = (safe.top ?? 0) + 5, L = (safe.left ?? 0) + 6, right = v.width - (safe.right ?? 0) - 54, w = (right - L) / (P.land ? 5 : 5), h = 38;
        for (let i = 0; i < 4; i++) {
            const x = L + w * i + w / 2 - 1, y = T + 20, f = this.flash[i];
            d.push(); d.translate(x, y); d.scale(1 + f * 0.05); panel(d, w - 4, h - 2);
            atlasSprite(d, "uisheet", U[FOOD_ICON[i]], -w / 2 + 16, 0, 24 + f * 4, 24 + f * 4); shadowText(d, String(Math.floor(me.stock[i])), { x: 10, size: 14.5, color: me.stock[i] > 0 ? CREAM : "#a4917d" }); d.pop();
        }
        { const x = L + w * 4 + w / 2 - 1, y = T + 20, full = me.total >= me.cap; d.push(); d.translate(x, y); panel(d, w - 4, h - 2, full ? "#7a2a1c" : "#2b1d14"); shadowText(d, String(me.total), { y: -7, size: 13.5, color: CREAM }); shadowText(d, `of ${me.cap}`, { y: 9, size: 10, color: "#d9c6a8" }); d.pop(); }
        this.drawObjective(d, v, P, T + 42);
        this.drawMini(d);
        if (this.line) { d.push(); d.translate(this.lineX, this.lineY); this.drawLine(d); d.pop(); }
        this.drawStrokeLabel(d);
        this.drawAlertArrow(d, v, P);
    }
    drawObjective(d, v, P, y) {
        const sim = this.sim, obj = sim.objectives(), g = sim.goal; if (!obj.length) return;
        const o = obj.find((q) => q.have < q.need) ?? obj[obj.length - 1];
        const label = { food: `${FOODS[o.type ?? 0].name} home`, cake: "Cake home", build: `Build ${CHAMBER_BY_ID[o.id ?? "gym"].name}`, critters: "Critters beaten", queens: "Enemy queens", survive: "Survive", ants: "Ants" }[o.label];
        let str = o.label === "survive" ? `${label} ${Math.max(0, o.need - o.have)}s` : o.label === "build" ? label : `${label} ${o.have}/${o.need}`;
        if (g.rival) { const r = sim.colList.find((c) => c.team !== 0); str += `   Rival ${Math.floor(r.gathered[0])}/${g.rival}`; }
        const W = Math.min(v.width - 16, 13 + str.length * 7.2), x = P.land ? W / 2 + 8 : v.width / 2;
        d.rect(W, 18, { x, y: y + 10, color: "#160e09cc", radius: 9 });
        if (o.need > 1) d.rect((W - 4) * o.have / o.need, 14, { x: x - (W - 4) / 2 * (1 - o.have / o.need), y: y + 10, color: "#7fbf3f", opacity: 0.4, radius: 7 });
        d.text(str, { x, y: y + 10, size: 11.5, bold: true, font: FONT, color: CREAM });
    }
    drawBanner(d) {
        const b = this.stage.banner; if (!b) return;
        const w = 270, pulse = 1 + Math.sin(this.stage.time * 14) * 0.03, col = b.level >= 2 ? "#c21f2b" : b.level === 1 ? "#d9541e" : "#c9851a";
        d.push(); d.scale(pulse); d.rect(w + 4, 32, { y: 1, color: "#0e0906", radius: 10 }); d.rect(w, 28, { color: col, radius: 8 }); d.rect(6, 16, { x: -w / 2 + 16, color: CREAM, radius: 2 }); d.rect(6, 5, { x: -w / 2 + 16, y: 12, color: CREAM, radius: 2 }); shadowText(d, b.text, { size: 14, color: "#fff" }); d.text("TAP", { x: w / 2 - 22, size: 10, bold: true, font: FONT, color: "#ffe7c4" }); d.pop();
    }
    drawLine(d) {
        const l = this.line; if (!l) return; const w = Math.min(this.s.view.width - 16, 348), h = 56, o = clamp(l.age * 5, 0, 1) * clamp(l.t * 3, 0, 1), { U } = this, c = this.o.cast[l.who];
        d.rect(w + 4, h + 4, { y: 1, color: "#0e0906", radius: 12, opacity: o }); d.rect(w, h, { color: "#fff3d6", radius: 10, opacity: o });
        atlasSprite(d, "uisheet", U[c.face], -w / 2 + 28, 0, 54, 54, { opacity: o });
        const shown = l.text.slice(0, Math.floor(l.age * 60));
        d.text(c.name, { x: -w / 2 + 58 + c.name.length * 3.2, y: -20, size: 10.5, bold: true, font: FONT, color: "#a8561c", opacity: o });
        d.text(l.text, { x: 28, y: 6, size: 11.5, font: FONT, color: "#2a1a10", maxWidth: w - 74, opacity: o, align: "left" });
    }
    drawMini(d) {
        const m = this.mini, { sim, stage } = this, gt = stage.groundName, cx = m.x + m.w / 2, cy = m.y + m.h / 2;
        d.rect(m.w + 7, m.h + 7, { x: cx, y: cy, color: "#120b07", radius: 8 });
        if (gt) d.sprite(gt, { x: cx, y: cy, width: m.w, height: m.h, opacity: 0.85 });
        const sx = m.w / sim.w, sy = m.h / sim.h, W = this.W;
        for (const f of sim.foods) if (f.alive && f.k !== "scraps") d.sprite("world", { crop: [W.disc.x, W.disc.y, 32, 32], x: m.x + f.x * sx, y: m.y + f.y * sy, width: 5, height: 5, color: FOODS[f.type].tint });
        const P = m.pts; for (let i = 0; i < P.length; i += 4) { const t = P[i + 2], s = 2 + P[i + 3] * 2.5; d.sprite("world", { crop: [W.disc.x, W.disc.y, 32, 32], x: m.x + P[i] * m.w, y: m.y + P[i + 1] * m.h, width: s, height: s, color: TEAMS[t].ui }); }
        for (const c of sim.colList) if (c.alive) { const w = c.team === 0 ? 8 : 9; d.rect(w + 2, w + 2, { x: m.x + c.x * sx, y: m.y + c.y * sy, color: "#000", radius: 3 }); d.rect(w, w, { x: m.x + c.x * sx, y: m.y + c.y * sy, color: TEAMS[c.team].c, radius: 2 }); }
        for (const tr of sim.me.slots) if (tr) { const q = tr.pts, n = q.length / 2, col = TRAIL_CSS[tr.kind]; for (let i = 0; i < n; i += Math.max(1, n >> 4)) { d.sprite("world", { crop: [W.disc.x, W.disc.y, 32, 32], x: m.x + q[i * 2] * sx, y: m.y + q[i * 2 + 1] * sy, width: 2.5, height: 2.5, color: col }); } }
        for (const p of stage.pings) { const k = (p.t * 1.5) % 1; d.circle(4 + k * 14, { x: m.x + p.x * sx, y: m.y + p.y * sy, color: "#00000000", outline: 2, opacity: 1 - k }); d.circle(3, { x: m.x + p.x * sx, y: m.y + p.y * sy, color: p.level ? "#ff4030" : "#ffc030" }); }
        const c = this.s.cam, v = this.s.view, hw = v.width / 2 / c.zoom, hh = (v.height - this.P.top - this.P.bottom) / 2 / c.zoom, ccy = c.pos.y + (this.P.top - this.P.bottom) / 2 / c.zoom;
        const x0 = clamp((c.pos.x - hw) * sx, 0, m.w), x1 = clamp((c.pos.x + hw) * sx, 0, m.w), y0 = clamp((ccy - hh) * sy, 0, m.h), y1 = clamp((ccy + hh) * sy, 0, m.h);
        d.rect(x1 - x0, y1 - y0, { x: m.x + (x0 + x1) / 2, y: m.y + (y0 + y1) / 2, color: "#00000000", outline: 1.6, radius: 2 });
    }
    drawStrokeLabel(d) {
        const st = this.stage.stroke; if (!st || st.screen < 10) return;
        const text = TRAIL_NAME[st.kind] + (st.home ? " : RECALL" : ""), y = Math.max(this.P.top + 18, st.y - 62), x = clamp(st.x, 50, this.s.view.width - 50), col = TRAIL_CSS[st.kind];
        d.rect(text.length * 9 + 18, 24, { x, y, color: "#120b07e6", radius: 12 }); d.text(text, { x, y, size: 13, bold: true, font: FONT, color: col });
    }
    /** Points off-screen at whatever's coming. */
    drawAlertArrow(d, v, P) {
        const b = this.stage.banner ?? (this.sim.alert?.level === 0 ? this.sim.alert : null); if (!b) return;
        const p = this.s.cam.toView([b.x, b.y]), m = 26, x0 = m, x1 = v.width - m, y0 = P.top + 18, y1 = v.height - P.bottom - 16;
        if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) return;
        const cx = v.width / 2, cy = (y0 + y1) / 2, dx = p.x - cx, dy = p.y - cy, k = Math.min(dx ? (dx > 0 ? x1 - cx : x0 - cx) / dx : 9, dy ? (dy > 0 ? y1 - cy : y0 - cy) / dy : 9), a = Math.atan2(dy, dx), x = cx + dx * k, y = cy + dy * k, wob = 1 + Math.sin(this.stage.time * 10) * 0.12;
        d.push(); d.translate(x, y); d.rotate(a); d.scale(wob); d.poly([[18, 0], [-10, -13], [-4, 0], [-10, 13]], { color: "#120b07" }); d.poly([[13, 0], [-6, -9], [-1, 0], [-6, 9]], { color: "#ff4d3d" }); d.pop();
    }

    // --- The nest, in section -------------------------------------------------------------------------------------
    openNest(focus) {
        if (this.nest) return; const { s, sim, snd, U } = this, v = s.view, land = this.P.land;
        snd.click(); this.stage.slow = 0.2; this.o.onNest?.(true);
        const w = Math.min(v.width - 12, land ? 640 : 430), safe = v.safe ?? { top: 0, bottom: 0 }, h = Math.min(v.height - (land ? 10 : 40) - (safe.top ?? 0) - (safe.bottom ?? 0), land ? 340 : 520), cx = v.width / 2, cy = (safe.top ?? 0) + (v.height - (safe.top ?? 0) - (safe.bottom ?? 0)) / 2, cols = land ? 3 : 2, rows = 2 + (land ? 0 : 1);
        const head = land ? 38 : 112, cw = (w - 16) / cols - 4, ch = (h - head - 14) / rows - 4, N = (this.nest = { els: [], t: 0, focus, w, h, cx, cy, head, land });
        const add = (e) => { N.els.push(e); return e; };
        add(s.add([ui(), pos(cx, cy), rect(v.width, v.height, { color: "#00000000" }), tap(() => this.closeNest()), { name: "nest-dismiss", layer: 70, draw: (d) => { d.rect(v.width + 4, v.height + 4, { color: "#0a0604", opacity: 0.55 }); } }]));
        add(s.add([ui(), pos(cx, cy), rect(w, h, { color: "#00000000" }), tap(() => {}), { name: "nest-sheet", layer: 71, draw: (d) => this.drawNestSheet(d) }]));
        CHAMBERS.forEach((c, i) => {
            const col = i % cols, row = i / cols | 0, x = cx - w / 2 + 8 + (cw + 4) * col + cw / 2 + 2, y = cy - h / 2 + head + 4 + (ch + 4) * row + ch / 2;
            add(s.add([ui(), pos(x, y), rect(cw, ch, { color: "#00000000" }), tap(() => this.buildChamber(c.id)), { name: `chamber-${c.id}`, layer: 72, draw: (d, e) => this.drawChamber(d, c, cw, ch, e) }]));
        });
        add(s.add([ui(), pos(cx + w / 2 - 22, cy - h / 2 + 22), rect(52, 52, { color: "#00000000" }), tap(() => this.closeNest()), { name: "nest-close", layer: 73, draw: (d) => { d.circle(16, { color: "#120b07" }); d.circle(14, { color: "#c2452d" }); d.line([-6, -6], [6, 6], { width: 3.4, color: CREAM }); d.line([-6, 6], [6, -6], { width: 3.4, color: CREAM }); } }]));
    }
    closeNest() { if (!this.nest) return; for (const e of this.nest.els) e.destroy(); this.nest = null; this.stage.slow = 1; this.o.onNest?.(false); this.snd.click(); }
    drawNestSheet(d) {
        const N = this.nest, { U, sim } = this, { w, h, head, land } = N, me = sim.me, t = (this.stage.time);
        d.rect(w + 8, h + 8, { color: "#0c0704", radius: 16 });
        atlasSprite(d, "uisheet", U.soil, 0, 0, w, h);
        d.rect(w, 26, { y: -h / 2 + 13, color: "#5ca03e", opacity: 0.9 }); d.rect(w, 6, { y: -h / 2 + 28, color: "#3d6b2b" });
        shadowText(d, land ? `THE NEST   ${me.total}/${me.cap} ants` : "THE NEST", { x: land ? -w / 2 + 120 : -w / 2 + 62, y: -h / 2 + 15, size: land ? 15 : 17, color: CREAM });
        if (!land) {
            const y = -h / 2 + 76; d.rect(w - 20, 72, { y, color: "#1b0f09", radius: 34, opacity: 0.8 });
            const br = 1 + Math.sin(t * 2.2) * 0.02; atlasSprite(d, "uisheet", U.queen, -24, y, 170 * br, 96 / br);
            for (let i = 0; i < 5; i++) { const k = ((t * 0.5 + i * 0.2) % 1); d.circle(4.4 - k, { x: -115 - k * 24 - i * 3, y: y - 12 + i * 6, color: "#fff4d6", opacity: 1 - k * 0.6 }); }
            shadowText(d, `${me.total} of ${me.cap}`, { x: w / 2 - 66, y: y - 9, size: 15, color: GOLD }); shadowText(d, "ants", { x: w / 2 - 66, y: y + 9, size: 11, color: CREAM });
        }
    }
    drawChamber(d, c, w, h, e) {
        const { sim, U } = this, me = sim.me, lv = me.chambers[c.id], max = c.levels.length, cost = c.levels[lv], allowed = !sim.goal.chambers || sim.goal.chambers.includes(c.id), can = sim.canBuild(0, c.id), focus = this.nest.focus === c.id, press = e._pressed ? 1.5 : 0;
        d.rect(w, h, { y: press, color: lv ? "#3a2415" : "#180d07", radius: 18 });
        const t = this.stage.time; if (can || focus) d.rect(w + 1, h + 1, { y: press, color: "#00000000", outline: 2.5, radius: 18 });
        const compact = h < 96, artW = compact ? 66 : 78;
        atlasSprite(d, "uisheet", U[`ch_${c.id}`], -w / 2 + artW / 2 + 3, press + (compact ? 4 : 2), artW, artW * 0.74, { opacity: lv ? 1 : 0.42 });
        const tx = artW / 2 - 2, tw = w - artW - 8;
        d.text(c.name, { x: tx, y: press - h / 2 + 13, size: 11.5, bold: true, font: FONT, color: lv ? GOLD : CREAM });
        for (let i = 0; i < max; i++) d.rect(10, 4, { x: tx + (i - (max - 1) / 2) * 13, y: press - h / 2 + 25, color: i < lv ? "#ffc94d" : "#5e4634", radius: 2 });
        if (!allowed) { d.text("Not yet known", { x: tx, y: press + 8, size: 10.5, font: FONT, color: "#a4917d" }); return; }
        if (lv >= max) { d.text("Finished", { x: tx, y: press + 10, size: 11, bold: true, font: FONT, color: "#a9dc6f" }); return; }
        if (me.saving === c.id) d.text("Queen is saving up", { x: tx, y: press - h / 2 + 37, size: 10, bold: true, font: FONT, color: "#ffd166" });
        d.text(c.does[lv], { x: tx, y: press + (compact ? 3 : 2), size: 10, font: FONT, color: CREAM, maxWidth: tw, align: "center", lineHeight: 1.1 });
        let n = cost.filter((v) => v > 0).length, x = tx - (n - 1) * 21, y = press + h / 2 - 11;
        for (let i = 0; i < 4; i++) if (cost[i]) { const ok = me.stock[i] >= cost[i]; atlasSprite(d, "uisheet", U[FOOD_ICON[i]], x - 11, y, 13, 13); d.text(String(cost[i]), { x: x + 7, y, size: 11, bold: true, font: FONT, color: ok ? "#c6f08a" : "#ff9c8a" }); x += 42; }
    }
    buildChamber(id) {
        const { sim, snd, stage } = this;
        if (!sim.build(0, id)) { const on = sim.saveFor(0, id); if (on) snd.focus(1); else snd.denied(); return; }
        snd.build(); this.s.shake(2, 0.2, { haptic: false }); stage.ring(sim.me.x, sim.me.y, 120, [1, 0.85, 0.4], 0.7);
        this.o.onBuilt?.(id);
    }
}
