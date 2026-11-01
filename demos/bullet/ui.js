// Text, HUD and menu pieces. Numbers are drawn digit by digit, so a score that changes every frame never uploads a new texture.
import { GLOW, GOLD } from "./art.js";

export const FONT = "Georgia, 'Times New Roman', serif";
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const roman = (n) => ["", "I", "II", "III", "IV", "V", "VI"][n] ?? String(n);

export function digits(d, str, x, y, size, color, o = {}) {
    const adv = size * 0.6, w = str.length * adv; let cx = o.align === "right" ? x - w + adv / 2 : o.align === "left" ? x + adv / 2 : x - w / 2 + adv / 2;
    let prev = adv;
    for (const ch of str) { const a = ch === "," || ch === "." ? adv * 0.45 : adv; cx += (a - prev) / 2; d.text(ch, { x: cx, y, size, bold: true, color, font: FONT, opacity: o.opacity ?? 1 }); cx += a; prev = a; }
}
const commas = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export class HudFx {
    constructor() { this.msg = null; this.msgT = 0; this.msgBig = false; this.bossName = ""; this.bossT = 0; this.barV = 0; }
    say(m, t = 2, big = false) { this.msg = m; this.msgT = t; this.msgDur = t; this.msgBig = big; }
    step(dt, p) { if (this.msgT > 0) this.msgT -= dt; if (this.bossT > 0) this.bossT -= dt; const b = p.boss; if (b) { const q = p.mode === "phase" ? clamp(b.hp / b.hpMax) : p.mode === "gap" ? 0 : this.barV; this.barV += (q - this.barV) * clamp(dt * 7); } }
}

function bombDial(d, p, x, y) {
    const r = p.run, ready = r.bombs > 0, pulse = ready ? 0.5 + 0.5 * Math.sin(p.game.stepCount * 0.09) : 0, K = p.bombBtn.size.x / 78;
    d.push(); d.translate(x, y); d.scale(K, K); x = 0; y = 0;
    d.circle(29, { x, y, color: ready ? "#3a2406cc" : "#0a0d24b0" });
    d.additive(() => {
        d.sprite("atlas", { x, y, width: 110, height: 110, crop: [GLOW * 64, GOLD * 64, 64, 64], opacity: (ready ? 0.34 + pulse * 0.34 : 0.08) });
        const n = 24, f = Math.round(r.bombs >= 3 ? n : r.charge * n);
        for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2, on = i < f; d.sprite("atlas", { x: x + Math.cos(a) * 27, y: y + Math.sin(a) * 27, width: 12, height: 12, crop: [GLOW * 64, (on ? GOLD : 4) * 64, 64, 64], opacity: on ? 1 : 0.4 }); }
    });
    d.sprite("wing", { x: x + 7, y, width: 14, height: 19, opacity: ready ? 1 : 0.35 }); d.sprite("wing", { x: x - 7, y, width: 14, height: 19, flipX: true, opacity: ready ? 1 : 0.35 });
    if (r.bombs > 0) d.text(String(r.bombs), { x, y: y + 15, size: 13, bold: true, color: "#fff4d0", font: FONT });
    d.pop();
}

export function drawHud(d, p) {
    const r = p.run, vh = p.vh, ox = p.ox, sa = p.s.view.safe ?? {}, wide = p.wide, top = 8 + (sa.top ?? 0);
    if (p.paused || p.over) return;
    if (p.tally) { p.bannerT = 0; drawTally(d, p); }
    // Score, multiplier and lives.
    const lx = wide ? ox / 2 : 12, align = wide ? "center" : "left";
    if (wide) {
        d.text(p.stage.name, { x: lx, y: 44, size: 22, color: "#ffe9c0", font: FONT, maxWidth: ox - 24 });
        digits(d, commas(r.shown), lx, 100, 34, "#fff4d8");
        digits(d, `x${r.mult.toFixed(1)}`, lx, 150, 30, r.mult > 3 ? "#ffd86a" : "#c8b6ff");
        d.text(`${r.graze} grazed`, { x: lx, y: 190, size: 20, color: "#b8c4ff", font: FONT });
        lives(d, p, lx, 236, 30);
    } else {
        d.rect(92, 44, { x: ox + 50, y: top + 19, color: "#05061a88", radius: 10 });
        digits(d, commas(r.shown), ox + 12, top + 11, 18, "#fff4d8", { align: "left" });
        digits(d, `x${r.mult.toFixed(1)}`, ox + 12, top + 31, 15, r.mult > 3 ? "#ffd86a" : "#c8b6ff", { align: "left" });
        lives(d, p, ox + 28, vh - 34 - (sa.bottom ?? 0), 15, true);
    }
    const bb = p.bombBtn; if (bb) bombDial(d, p, bb.pos.x, bb.pos.y);
    // The boss: a thin bar of light across the top of the field, and one pip per phase left.
    const b = p.boss;
    if (b && p.mode !== "dying") {
        const x0 = ox + 58 + (wide ? -38 : 34), W = (wide ? 320 : 230), y = wide ? 12 : top + 2 + 50, phases = b.def.phases.length;
        d.rect(W + 4, 7, { x: x0 + W / 2, y, color: "#0a0d24c0", radius: 3.5 });
        d.rect(Math.max(0.5, W * p.hud.barV), 3.4, { x: x0 + W * p.hud.barV / 2, y, color: p.stage.accent, radius: 1.7 });
        for (let i = 0; i < phases - p.phaseI - 1; i++) d.circle(2.6, { x: x0 + W - i * 9, y: y + 9, color: "#ffe9c0" });
    }
    if (p.hud.bossT > 0) { const q = p.hud.bossT; d.text(p.hud.bossName, { x: ox + 180, y: 300, size: 34, color: "#fff4d8", font: FONT, opacity: clamp(q) * clamp((3.4 - q) * 2) }); }
    if (p.hud.msgT > 0) { const q = p.hud.msgT, D = p.hud.msgDur; d.text(p.hud.msg, { x: ox + 180, y: p.hud.msgBig ? 262 : 330, size: p.hud.msgBig ? 22 : 16, color: "#ffe9c0", font: FONT, opacity: clamp(q * 2) * clamp((D - q) * 4) * 0.92 }); }
    if (p.bannerT > 0 && p.stage && !p.practice) {
        const q = p.bannerT, a = clamp(q) * clamp((4 - q) * 1.2), y = 250 + (4 - q) * 3;
        d.text(`Night ${roman(p.stage.id)}`, { x: ox + 180, y: y - 26, size: 16, color: p.stage.accent, font: FONT, opacity: a });
        d.text(p.stage.name, { x: ox + 180, y: y + 8, size: 32, color: "#fff4d8", font: FONT, opacity: a });
    }
    if (p.practice && p.bannerT > 0) d.text(p.banner, { x: ox + 180, y: 260, size: 26, color: "#fff4d8", font: FONT, opacity: clamp(p.bannerT) });
    if (p.stage.id === 1 && !p.practice && p.ctx.save.taught !== true) tutorial(d, p);
}

function lives(d, p, x, y, S, left) {
    const n = Math.min(6, p.run.lives), adv = S * 1.3;
    for (let i = 0; i < n; i++) {
        const cx = left ? x - S / 2 + i * adv : x + (i - (n - 1) / 2) * adv;
        d.sprite("wing", { x: cx + S * 0.28, y, width: S * 0.56, height: S * 0.8 }); d.sprite("wing", { x: cx - S * 0.28, y, width: S * 0.56, height: S * 0.8, flipX: true });
    }
}

function tutorial(d, p) {
    const m = p.moth, ox = p.ox, moved = p.moved > 90, t = p.game.stepCount;
    if (!moved && m.enter <= 0) {
        const y = m.y - 86, sw = Math.sin(t * 0.05) * 42;
        d.text(p.keyUsed ? "" : p.game.input.touchMode ? "drag anywhere" : "drag, or use the arrow keys", { x: ox + 180, y, size: 19, color: "#fff4d8", font: FONT });
        d.circle(13, { x: ox + m.x + sw, y: y + 32, color: "#ffffff30" }); d.circle(13, { x: ox + m.x + sw, y: y + 32, color: "#ffffffb0", outline: 1.4 });
    } else if (moved && p.run.graze < 8 && p.bullets.count > 0) {
        d.text("let the light brush you", { x: ox + m.x, y: m.y + 42, size: 16, color: "#ffe9c0", font: FONT, opacity: 0.85 });
        d.text("only the white dot can be hit", { x: ox + m.x, y: m.y + 62, size: 13, color: "#ffe9c0", font: FONT, opacity: 0.7 });
    } else if (p.run.bombs > 0 && p.run.bombsUsed === 0 && p.run.graze >= 8 && p.bullets.count > 90) {
        const b = p.bombBtn;
        d.text("tap to turn the night to light", { x: Math.min(b.pos.x, p.vw - 110), y: b.pos.y - 48, size: 14, color: "#fff4d8", font: FONT });
    }
    if (p.run.bombsUsed > 0 && !p.ctx.save.taught) { p.ctx.save.taught = true; p.ctx.persist(); }
}

function drawTally(d, p) {
    const T = p.tally, ox = p.ox, cx = ox + 180, a = clamp(T.t * 2);
    d.rect(p.vw, p.vh, { x: p.vw / 2, y: p.vh / 2, color: "#05061acc", opacity: a });
    d.text(`Night ${roman(p.stage.id)} passed`, { x: cx, y: 200, size: 28, color: "#fff4d8", font: FONT, opacity: a });
    T.rows.forEach(([name, v], i) => {
        const u = clamp((T.t - 0.3 - i * 0.28) * 3), y = 256 + i * 36;
        d.text(name, { x: cx - 60, y, size: 17, color: "#c8c4f0", font: FONT, opacity: u });
        digits(d, commas(v * u), cx + 138, y, 18, "#ffe9c0", { align: "right", opacity: u });
    });
    const u = clamp((T.t - 1.3) * 3);
    d.text("With the night's multiplier", { x: cx, y: 374, size: 13, color: "#8f8cc0", font: FONT, opacity: u * 0.8 });
    digits(d, commas(T.total * u), cx, 410, 30, "#ffd86a", { opacity: u });
}
