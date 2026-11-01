// Thumbs and numbers: the on-screen pad, read from raw pointers so two thumbs and roll-overs all work, and the heads-up display.
import { BTN, GRADES, METER_BAR, STYLE_MAX } from "./data.js";
import { C } from "./art.js";
import { FONT, comic } from "./view.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TINT = { A: C.tomato, H: C.mustard, J: C.teal, G: C.blue, S: C.pink, T: C.cream };

export class Pad {
    constructor(game, cast, st) { this.g = game; this.st = st; this.ptr = new Map(); this.c = []; this.held = 0; this.latched = 0; this.stick = { id: null, x: 0, y: 0, ox: 0, oy: 0, kx: 0, ky: 0, home: [0, 0], r: 60 }; this.pulse = null; this.meter = 0; this.tagReady = true; this.show = true; this.t = 0; this.other = "pip"; this.layout(); }
    layout() {
        const v = this.g.view, L = v.safe.left, R = v.width - v.safe.right, B = v.height - v.safe.bottom, portrait = v.height > v.width;
        const k = portrait ? clamp(v.width / 390, 0.82, 1.15) : clamp(v.height / 400, 0.72, 1);
        const ax = R - 62 * k, ay = B - 60 * k, A = (bit, key, label, x, y, r) => ({ bit, key, label, x, y, r: r * k, down: 0, glow: 0 });
        this.c = [
            A(BTN.A, "A", "ATTACK", ax, ay, 48),
            A(BTN.J, "J", "JUMP", ax - 94 * k, ay + 14 * k, 34),
            A(BTN.H, "H", "HEAVY", ax - 72 * k, ay - 72 * k, 34),
            A(BTN.S, "S", "SOUP", ax + 6 * k, ay - 94 * k, 34),
            A(BTN.G, "G", "DODGE", ax - 154 * k, ay - 36 * k, 30),
            A(BTN.T, "T", "TAG", ax - 142 * k, ay - 106 * k, 25),
        ];
        const r = 58 * k, s = this.stick;
        s.r = r; s.home = [L + r + 22, B - r - (portrait ? 34 : 18) * k]; if (s.id == null) { s.ox = s.home[0]; s.oy = s.home[1]; }
        this.zoneX = portrait ? ax - 188 * k : v.width * 0.42;
        this.zoneY = portrait ? v.height - 240 : v.height * 0.34;
    }
    active() { return this.show || this.mouseFirst?.(); }
    hit(x, y) { let best = null, bd = 1e9; for (const c of this.c) { const q = Math.hypot(x - c.x, y - c.y) / c.r; if (q < 1.24 && q < bd) { bd = q; best = c; } } return best; }
    down(id, x, y) {
        if (!this.active()) return false;
        const b = this.hit(x, y);
        if (b) { this.ptr.set(id, b); this.press(b); return true; }
        const s = this.stick;
        if (s.id == null && x < this.zoneX && y > this.zoneY) {
            s.id = id; this.ptr.set(id, s);
            s.ox = clamp(x, this.g.view.safe.left + s.r * 0.7, this.zoneX - s.r * 0.5); s.oy = clamp(y, this.zoneY + s.r * 0.6, this.g.view.height - s.r * 0.7);
            this.moveStick(x, y); return true;
        }
        return false;
    }
    move(id, x, y) {
        const c = this.ptr.get(id); if (!c) return;
        if (c === this.stick) { this.moveStick(x, y); return; }
        const n = this.hit(x, y);       // A thumb can roll from button to button.
        if (n && n !== c) { this.release(c); this.ptr.set(id, n); this.press(n); }
    }
    up(id) {
        const c = this.ptr.get(id); if (!c) return; this.ptr.delete(id);
        if (c === this.stick) { const s = this.stick; s.id = null; s.kx = s.ky = 0; s.ox = s.home[0]; s.oy = s.home[1]; this.held &= ~(BTN.L | BTN.R | BTN.U | BTN.D); }
        else this.release(c);
    }
    press(b) { b.down++; b.glow = 1; this.held |= b.bit; this.latched |= b.bit; this.g.haptic(b.key === "A" ? 5 : 6); this.onPress?.(b.key); }
    release(b) { b.down = Math.max(0, b.down - 1); if (!b.down) this.held &= ~b.bit; }
    moveStick(x, y) {
        const s = this.stick; let dx = x - s.ox, dy = y - s.oy; const len = Math.hypot(dx, dy), max = s.r;
        if (len > max) { s.ox += dx - (dx / len) * max; s.oy += dy - (dy / len) * max; dx = x - s.ox; dy = y - s.oy; }   // The base follows the thumb.
        s.kx = dx; s.ky = dy;
        const t = s.r * 0.24; let m = 0;
        if (dx > t) m |= BTN.R; else if (dx < -t) m |= BTN.L;
        if (dy > t * 1.15) m |= BTN.D; else if (dy < -t * 1.15) m |= BTN.U;
        const was = this.held & (BTN.L | BTN.R | BTN.U | BTN.D);
        this.latched |= m & ~was;
        this.held = (this.held & ~(BTN.L | BTN.R | BTN.U | BTN.D)) | m;
    }
    reset() { this.ptr.clear(); this.held = 0; this.latched = 0; for (const c of this.c) c.down = 0; const s = this.stick; s.id = null; s.kx = s.ky = 0; s.ox = s.home[0]; s.oy = s.home[1]; }
    read() { const m = this.held | this.latched; this.latched = 0; return m; }
    draw(d, deck) {
        if (!this.show) return;
        this.t++;
        const v = this.g.view, st = this.st, a = deck ? 1 : 0.46, s = this.stick;
        if (deck) drawDeck(d, v, deck);
        // Stick.
        st.dot(d, s.ox, s.oy, s.r + 4, C.ink, 0.8 * a); st.dot(d, s.ox, s.oy, s.r, "#4a3a5a", 0.85 * a);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) d.poly([[s.ox + dx * s.r * 0.88, s.oy + dy * s.r * 0.88], [s.ox + dx * s.r * 0.68 + dy * 7, s.oy + dy * s.r * 0.68 + dx * 7], [s.ox + dx * s.r * 0.68 - dy * 7, s.oy + dy * s.r * 0.68 - dx * 7]], { color: C.cream, opacity: 0.55 * a });
        const nx = s.ox + clamp(s.kx, -s.r, s.r) * 0.62, ny = s.oy + clamp(s.ky, -s.r, s.r) * 0.62, kr = s.r * 0.5;
        st.dot(d, nx, ny + 2, kr + 3, C.ink, a); st.dot(d, nx, ny, kr, s.id != null ? C.mustard : C.tomato, a); st.dot(d, nx - kr * 0.26, ny - kr * 0.3, kr * 0.45, "#ffffff", 0.34 * a);
        for (const c of this.c) this.button(d, c, a);
    }
    button(d, c, a) {
        const st = this.st, on = c.down > 0, S = c.key === "S", T = c.key === "T", bars = Math.floor(this.meter / METER_BAR), ready = S ? bars > 0 : T ? this.tagReady : true;
        c.glow *= 0.84;
        const r = c.r * (on ? 0.93 : 1) * (1 + c.glow * 0.08), press = on ? 2 : 0, col = ready ? TINT[c.key] : "#6d6078", pulse = this.pulse === c.key ? (Math.sin(this.t * 0.2) * 0.5 + 0.5) : 0;
        if (pulse) st.dot(d, c.x, c.y, r + 8 + pulse * 8, C.mustard, 0.5 * (1 - pulse * 0.4));
        st.dot(d, c.x, c.y + 3, r + 3.4, C.ink, a); st.dot(d, c.x, c.y + press, r, col, a);
        st.dot(d, c.x - r * 0.24, c.y - r * 0.34 + press, r * 0.42, "#ffffff", 0.22 * a);
        if (S) {
            // Three bowls of soup: a ring that fills as the meter does.
            const f = this.meter / (METER_BAR * 3), n = 24;
            for (let i = 0; i < n; i++) { const t = i / n, ang = -1.57 + t * 6.283, on2 = t < f, seg = i % 8 === 7; if (seg) continue; st.dot(d, c.x + Math.cos(ang) * (r - 3), c.y + press + Math.sin(ang) * (r - 3), 2.6, on2 ? C.cream : C.ink, a); }
            if (bars) d.additive(() => st.dot(d, c.x, c.y, r * (1.1 + Math.sin(this.t * 0.2) * 0.06), C.pink, 0.26));
        }
        const ink = c.key === "H" || c.key === "T" || c.key === "A" && false ? C.ink : "#fff8ea";
        if (T) { const n = this.other === "pip" ? "pip_head" : "dot_head"; st.part(d, n, c.x, c.y + (this.other === "pip" ? 5 : 8) + press, { sx: (this.other === "pip" ? 0.5 : 0.36) * r / 25 }); if (!ready) st.dot(d, c.x, c.y, r, C.ink, 0.5); return; }
        if (c.key === "A") { st.part(d, "ladle", c.x + 13, c.y + 24 + press, { sx: 0.44, rot: 0.5 }); d.text("ATTACK", { x: c.x, y: c.y + r * 0.58 + press, size: 10, bold: true, font: FONT, color: ink }); }
        else d.text(S && bars ? `SOUP ${bars}` : c.label, { x: c.x, y: c.y + press, size: Math.min(11.5, c.r * 0.34), bold: true, font: FONT, color: c.key === "S" && !ready ? "#c8bcd0" : ink });
    }
}
function drawDeck(d, v, deck) {
    const y = v.height - deck, h = deck + 6;
    d.rect(v.width + 8, h, { x: v.width / 2, y: y + h / 2 - 2, color: C.ink });
    d.rect(v.width + 4, h, { x: v.width / 2, y: y + h / 2 + 3, color: "#a8b4cc" });
    d.rect(v.width + 4, 4, { x: v.width / 2, y: y + 5, color: "#dfe8f4" });
    d.rect(v.width - 14 - v.safe.left - v.safe.right, deck - 18 - v.safe.bottom * 0.4, { x: v.width / 2, y: y + 10 + (deck - 18) / 2 - v.safe.bottom * 0.2, color: "#7884a4", radius: 26 });
    d.rect(v.width - 20 - v.safe.left - v.safe.right, deck - 24 - v.safe.bottom * 0.4, { x: v.width / 2, y: y + 12 + (deck - 18) / 2 - v.safe.bottom * 0.2, color: "#8f9cbc", radius: 22 });
}

export function drawHud(d, H, sim, st, t) {
    const v = H.g.view, L = v.safe.left + 8, T = v.safe.top + 8, R = v.width - v.safe.right - 8, w = Math.min(190, v.width * 0.46), hero = sim.hero, other = sim.other(hero);
    // Portrait medal, health in a slanted comic strip, three meter bowls.
    const px = L + 26, py = T + 26;
    const bar = (x, y, W, Ht, f, col, red) => {
        d.rect(W + 5, Ht + 5, { x: x + W / 2, y: y + Ht / 2, color: C.ink, radius: 5 });
        d.rect(W, Ht, { x: x + W / 2, y: y + Ht / 2, color: "#4a3a5a", radius: 3 });
        if (red > f) d.rect(W * red, Ht, { x: x + W * red / 2, y: y + Ht / 2, color: "#fff4dc", radius: 3 });
        if (f > 0) { d.rect(W * f, Ht, { x: x + W * f / 2, y: y + Ht / 2, color: col, radius: 3 }); d.rect(W * f, Ht * 0.3, { x: x + W * f / 2, y: y + Ht * 0.28, color: "#ffffff", opacity: 0.35, radius: 2 }); }
    };
    H.hp += (hero.hp / hero.maxHp - H.hp) * 0.5; H.lag += (H.hp - H.lag) * (H.lag > H.hp ? 0.05 : 1);
    const hc = H.hp < 0.3 ? (t % 16 < 8 ? C.tomato : "#ff9a6a") : hero.key === "dot" ? C.teal : C.blue;
    bar(px + 22, T + 6, w, 15, H.hp, hc, H.lag);
    // Meter.
    const m = sim.meter / METER_BAR, seg = (w * 0.66 - 8) / 3;
    for (let i = 0; i < 3; i++) { const x = px + 24 + i * (seg + 4), f = clamp(m - i, 0, 1); d.rect(seg + 3, 11, { x: x + seg / 2, y: T + 31, color: C.ink, radius: 4 }); if (f > 0) d.rect(seg * f, 7, { x: x + seg * f / 2, y: T + 31, color: f >= 1 ? (t % 20 < 10 ? C.mustard : C.orange) : "#c8a050", radius: 3 }); }
    st.dot(d, px, py, 27, C.ink); st.dot(d, px, py, 23.5, hero.key === "dot" ? C.mustard : C.orange);
    if (hero.key === "dot") { st.part(d, "dot_head", px, py + 11, { sx: 0.46 }); st.part(d, "de_norm", px + 1, py + 9, { sx: 0.46 }); st.part(d, "m_lip", px + 2, py + 19, { sx: 0.34 }); }
    else { st.part(d, "pip_head", px, py + 5, { sx: 0.6 }); st.part(d, "e_wide", px + 1, py + 3, { sx: 0.52 }); st.part(d, "m_grin", px + 1, py + 15, { sx: 0.4 }); }
    // Partner, on the bench.
    const ox = px + 2, oy = T + 66, of = other.hp / other.maxHp;
    bar(ox + 18, oy - 5, Math.min(70, w * 0.4), 8, of, other.key === "dot" ? C.teal : C.blue, 0);
    st.dot(d, ox, oy, 15, C.ink); st.dot(d, ox, oy, 12.5, other.hp > 0 ? (other.key === "dot" ? C.mustard : C.orange) : "#6d6078");
    if (other.key === "dot") { st.part(d, "dot_head", ox, oy + 6, { sx: 0.24 }); st.part(d, "de_norm", ox + 1, oy + 5, { sx: 0.24 }); } else { st.part(d, "pip_head", ox, oy + 3, { sx: 0.32 }); st.part(d, "e_wide", ox, oy + 2, { sx: 0.28 }); }
    // Score.
    H.score += (sim.score - H.score) * 0.25;
    const sx = R - 46;
    comic(d, String(Math.round(H.score)).padStart(6, "0"), sx - 42, T + 18, 15, 1, 0, ["#fff4dc", C.tomato]);
    if (H.mode === "score") comic(d, fmtTime(sim.tick), sx - 42, T + 40, 11, 1, 0, ["#ffc52e", C.ink]);
    // Combo and grade.
    if (sim.combo >= 2 || H.comboShow > 0) {
        if (sim.combo >= 2) { H.comboShow = 60; H.comboN = sim.combo; } else H.comboShow--;
        const a = clamp(H.comboShow / 16, 0, 1), hitPop = 1 + H.comboPop * 0.5, x = R - 50, y = T + (H.mode === "score" ? 86 : 74);
        comic(d, String(H.comboN), x - 4, y, 30, hitPop, -0.08, [H.comboN >= 25 ? C.mustard : "#fff4dc", C.tomato], a);
        comic(d, "HITS", x + 2, y + 25, 11, 1, -0.08, ["#ffc52e", C.ink], a);
    }
    H.comboPop *= 0.8;
    const g = sim.grade;
    if (g > 0) {
        H.gradePop *= 0.86;
        const G = GRADES[g], x = R - 112, y = T + 76, nextAt = GRADES[g + 1]?.at ?? STYLE_MAX, f = clamp((sim.style - G.at) / (nextAt - G.at), 0, 1), cols = [C.cream, "#9ad8f0", "#a0e8a0", C.mustard, C.orange, C.tomato, C.pink];
        comic(d, G.g, x, y, 26 + g * 2, 1 + H.gradePop, -0.12, [cols[g], C.ink]);
        d.rect(52, 7, { x, y: y + 24, color: C.ink, radius: 3 }); d.rect(48 * f, 3.6, { x: x - 24 * (1 - f), y: y + 24, color: cols[g], radius: 2 });
        comic(d, G.word, x, y + 37, 9, 1, 0, [cols[g], C.ink]);
    }
    // Boss bar along the bottom of the action.
    const b = sim.boss;
    if (b && b.st !== "bossdie" || (b && H.bossFade > 0)) {
        const land = !H.deck, W = land ? Math.min(v.width * 0.34, 300) : Math.min(v.width - 40, 440), x0 = v.width / 2 - W / 2 + (land ? 16 : 0), y = land ? T + 32 : v.height - H.deck - 22, f = b.hp / b.maxHp;
        H.bossLag += (f - H.bossLag) * 0.06; H.bossHp = f;
        const shown = b.intro > 0 ? 1 - b.intro / 120 : 1;
        bar(x0, y, W * shown, 12, f * 1, b.dizzy > 0 ? C.mustard : C.tomato, H.bossLag);
        const n = b.def.phases.length; for (let i = 1; i < n; i++) d.rect(3, 15, { x: x0 + W * (1 - i / n) * shown, y: y + 6, color: C.ink });
        comic(d, b.def.name, x0 + W / 2, y - 12, 12, 1, 0, ["#fff4dc", C.tomato]);
    }
}
export const fmtTime = (ticks) => { const s = Math.floor(ticks / 60); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
