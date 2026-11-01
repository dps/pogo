// Everything that floats above a scene: card zoom with keyword chips, tooltips, deck viewer and settings.
import { CARDS, cardText } from "../data/cards.js";
import { KEYWORDS, REACTIONS } from "../data/rules.js";
import { TRINKETS } from "../data/trinkets.js";
import { ENEMIES } from "../data/enemies.js";
import { trinketArt } from "../art/index.js";
import { ASPECT, drawCard } from "./cardview.js";
import { COLORS, FONT, G, applySettings, clamp, clearRun, keywordsIn, richLayout, drawRich, saveMeta, saveRun } from "./core.js";

export const zoom = (card, extra = {}) => { G.overlay = { kind: "zoom", card, t: 0, tip: null, ...extra }; G.snd.lift(); G.game.haptic("light"); };
export const tip = (title, text, o = {}) => { G.overlay = { kind: "tip", title, text, t: 0, ...o }; G.snd.page(); };
export const deckView = (title, cards, o = {}) => { G.overlay = { kind: "deck", title, cards, t: 0, scroll: 0, ...o }; G.snd.page(); };
export const settings = () => { G.overlay = { kind: "settings", t: 0, sure: false }; G.snd.page(); };
export const trinketTip = (id) => { const t = TRINKETS[id]; tip(t.name, t.text, { sprite: trinketArt(id), sub: `${t.rar[0].toUpperCase()}${t.rar.slice(1)} trinket` }); };
export const close = () => { G.overlay = null; G.snd.page(); };

function panelLines(s, title, text, width) { return richLayout(text, 15, width - 36, "l"); }
function wrapPanel(d, x, y, w, h) {
    d.rect(w + 4, h + 4, { x, y: y + 3, color: "#07040f", radius: 16, opacity: 0.7 });
    d.rect(w + 2, h + 2, { x, y, color: "#e7b75e", radius: 15 });
    d.rect(w - 2, h - 2, { x, y, color: "#21143a", radius: 13 });
}
export function installOverlays(s) {
    const game = G.game;
    let press = null;
    s.onUpdate((dt) => {
        const o = G.overlay;
        if (!o) { press = null; return; }
        o.t += dt;
        const p = s.input.pointer, W = s.view.width, H = s.view.height;
        if (o.kind === "deck") {
            const maxS = Math.max(0, o.contentH - (H - 96));
            if (s.input.wheel) o.scroll = clamp(o.scroll + s.input.wheel * 0.5, 0, maxS);
            if (p.pressed) press = { x: p.x, y: p.y, s: o.scroll, moved: 0, t: 0 };
            if (p.down && press) { o.scroll = clamp(press.s - (p.y - press.y), 0, maxS); press.moved = Math.max(press.moved, Math.abs(p.y - press.y)); }
            if (p.released && press) {
                if (press.moved < 12) {
                    if (o.closeBox && Math.hypot(p.x - o.closeBox.x, p.y - o.closeBox.y) < 30) { const f = o.onClose; close(); f?.(); press = null; return; }
                    const hit = o.boxes?.find((b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2);
                    if (hit) { if (o.onPick) { const f = o.onPick; G.overlay = null; G.snd.pick(); f(hit.card); } else zoom(hit.card, { back: o }); }
                }
                press = null;
            }
            return;
        }
        if (o.t < 0.14) return;
        if (!p.pressed) return;
        const x = p.x, y = p.y;
        if (o.kind === "zoom") {
            const chip = o.chips?.find((c) => Math.abs(x - c.x) < c.w / 2 + 3 && Math.abs(y - c.y) < 18);
            if (chip) { o.tip = chip.k; G.snd.page(); return; }
            G.overlay = o.back ?? null; G.snd.page(); return;
        }
        if (o.kind === "settings") {
            const hit = o.rows?.find((r) => Math.abs(x - r.x) < r.w / 2 && Math.abs(y - r.y) < r.h / 2);
            if (hit) { hit.fn(); return; }
            close(); return;
        }
        if (o.kind === "tip") {
            const a = o.actionBox;
            if (a && Math.abs(x - a.x) < a.w / 2 && Math.abs(y - a.y) < 26) { const f = o.action.fn; G.overlay = null; f(); return; }
            const b = o.back; G.overlay = b ?? null; G.snd.page();
        }
    });
    s.onDrawUI((d) => {
        const o = G.overlay;
        if (!o) return;
        const W = s.view.width, H = s.view.height, a = Math.min(1, o.t / 0.14);
        d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#0a0516", opacity: 0.82 * a });
        if (o.kind === "zoom") drawZoom(d, o, W, H, a);
        else if (o.kind === "tip") drawTip(d, o, W, H, a);
        else if (o.kind === "deck") drawDeck(d, o, W, H, s);
        else if (o.kind === "settings") drawSettings(d, o, W, H, s);
    });
}
function drawZoom(d, o, W, H, a) {
    const land = W > H, cw = land ? Math.min(H * 0.86 / ASPECT, 210) : Math.min(W * 0.74, 270), ch = cw * ASPECT, k = 0.8 + 0.2 * a;
    const x = land ? W * 0.3 : W / 2, y = land ? H / 2 : Math.min(H * 0.4, 40 + ch / 2 + 40);
    const tilt = Math.sin(o.t * 1.3) * 0.5, tilt2 = Math.cos(o.t * 0.9) * 0.3;
    drawCard(d, o.card, { x, y, w: cw * k, tx: tilt, ty: tilt2, foil: 0.6, alpha: 1, lift: 1 });
    const def = CARDS[o.card.id], text = cardText(def, o.card.up), kws = keywordsIn(text);
    let px = land ? W * 0.72 : W / 2, py = land ? H * 0.2 : y + ch / 2 + 22;
    const fw = land ? W * 0.46 : W - 40;
    if (def.flavor) { d.text(def.flavor, { x: px, y: py, size: 14, font: FONT, color: COLORS.dim, maxWidth: fw, align: "center" }); py += 42; }
    o.chips = [];
    const wid = (k2) => 22 + G.game.renderer.measureText(k2, { size: 14, font: FONT, bold: true, align: "left", maxWidth: 0, lineHeight: 1.2 }).width;
    let row = [], rowW = 0; const rows = [];
    for (const k2 of kws) { const w2 = wid(k2); if (rowW + w2 + 6 > fw) { rows.push([row, rowW]); row = []; rowW = 0; } row.push([k2, w2]); rowW += w2 + 6; }
    if (row.length) rows.push([row, rowW]);
    for (const [r, rw] of rows) {
        let cx = px - rw / 2;
        for (const [k2, w2] of r) {
            const on = o.tip === k2;
            d.rect(w2, 28, { x: cx + w2 / 2, y: py, color: on ? KEYWORDS[k2].color : "#2a1b42", radius: 14 });
            d.rect(w2, 28, { x: cx + w2 / 2, y: py, color: KEYWORDS[k2].color, radius: 14, outline: 1.5 });
            d.text(k2, { x: cx + w2 / 2, y: py, size: 14, bold: true, font: FONT, color: on ? "#120822" : KEYWORDS[k2].color });
            o.chips.push({ k: k2, x: cx + w2 / 2, y: py, w: w2 });
            cx += w2 + 6;
        }
        py += 36;
    }
    if (kws.length && !o.tip) d.text("Tap a word for its meaning", { x: px, y: py, size: 12, font: FONT, color: COLORS.dim, opacity: 0.8 });
    if (o.tip) { const t = KEYWORDS[o.tip]; d.text(t.text, { x: px, y: py + 16, size: 15, font: FONT, color: "#fff6dc", maxWidth: fw, align: "center" }); }
}
function drawTip(d, o, W, H, a) {
    const w = Math.min(W - 40, 320), L = richLayout(o.text, 15, w - 36, "l"), bh = L.lines.length * L.lh + (o.sprite ? 112 : 66) + (o.sub ? 16 : 0) + (o.extra ? 20 : 0) + (o.action ? 58 : 0), y = H / 2 + (1 - a) * 12;
    wrapPanel(d, W / 2, y, w, bh);
    let ty = y - bh / 2 + 22;
    if (o.sprite) { d.sprite(o.sprite, { x: W / 2, y: ty + 26, width: 66, height: 66 }); ty += 64; }
    d.text(o.title, { x: W / 2, y: ty, size: 19, bold: true, font: FONT, color: COLORS.gold });
    ty += 20;
    if (o.sub) { d.text(o.sub, { x: W / 2, y: ty, size: 12, font: FONT, color: COLORS.dim }); ty += 16; }
    ty += L.lines.length * L.lh / 2 + 2;
    drawRich(d, L, W / 2, ty, { dark: false });
    if (o.extra) d.text(o.extra, { x: W / 2, y: ty + L.lines.length * L.lh / 2 + 12, size: 12, font: FONT, color: COLORS.dim });
    if (o.action) {
        const by = y + bh / 2 - 34, bw = Math.min(200, w - 40);
        d.rect(bw + 2, 46, { x: W / 2, y: by, color: "#e7b75e", radius: 15 });
        d.rect(bw - 2, 42, { x: W / 2, y: by, color: "#c0401e", radius: 13 });
        d.text(o.action.label, { x: W / 2, y: by, size: 16, bold: true, font: FONT, color: "#fff6dc" });
        o.actionBox = { x: W / 2, y: by, w: bw };
    }
}
function drawDeck(d, o, W, H, s) {
    const top = G.game.view.safe.top, cols = Math.max(3, Math.floor(W / 112)), gap = 8, cw = (W - gap * (cols + 1)) / cols, ch = cw * ASPECT;
    const rows = Math.ceil(o.cards.length / cols);
    o.contentH = rows * (ch + gap) + 84;
    o.boxes = [];
    o.cards.forEach((c, i) => {
        const x = gap + cw / 2 + (i % cols) * (cw + gap), y = 76 + top + ch / 2 + Math.floor(i / cols) * (ch + gap) - o.scroll;
        if (y < -ch || y > H + ch) return;
        drawCard(d, c, { x, y, w: cw, foil: CARDS[c.id].rar === "rare" ? 0.18 : 0 });
        o.boxes.push({ x, y, w: cw, h: ch, card: c });
    });
    d.rect(W + 4, 66 + top, { x: W / 2, y: 33 + top / 2, color: "#120822", opacity: 0.96 });
    d.text(o.title, { x: W / 2, y: top + 32, size: 19, bold: true, font: FONT, color: COLORS.gold });
    if (o.sub) d.text(o.sub, { x: W / 2, y: top + 52, size: 12, font: FONT, color: COLORS.dim });
    const cx = W - 30, cy = top + 30;
    d.circle(18, { x: cx, y: cy, color: "#7a3ad0" });
    d.circle(18, { x: cx, y: cy, color: "#e7b75e", outline: 2 });
    d.text(o.closeLabel ?? "×", { x: cx, y: cy - 1, size: 24, bold: true, font: FONT, color: "#fff6dc" });
    o.closeBox = { x: cx, y: cy };
}
function drawSettings(d, o, W, H, s) {
    const m = G.meta, w = Math.min(W - 48, 300), rows = [
        ["Sound", m.sound, () => { m.sound = !m.sound; applySettings(); saveMeta(); G.snd.pick(); }],
        ["Music", m.music, () => { m.music = !m.music; applySettings(); saveMeta(); }],
        ["Haptics", m.haptics, () => { m.haptics = !m.haptics; applySettings(); saveMeta(); G.game.haptic("medium"); }],
    ];
    const canQuit = !!G.run;
    const keys = !s.input.touchMode, bh = 90 + rows.length * 54 + (canQuit ? 54 : 0) + 8 + (keys ? 44 : 0), top = H / 2 - bh / 2;
    wrapPanel(d, W / 2, H / 2, w, bh);
    d.text("Settings", { x: W / 2, y: top + 28, size: 21, bold: true, font: FONT, color: COLORS.gold });
    d.text(`Run saved automatically`, { x: W / 2, y: top + 50, size: 12, font: FONT, color: COLORS.dim });
    o.rows = [];
    rows.forEach(([label, on, fn], i) => {
        const y = top + 92 + i * 54;
        d.rect(w - 28, 44, { x: W / 2, y, color: "#2f2150", radius: 10 });
        d.text(label, { x: W / 2 - w / 2 + 60, y, size: 16, bold: true, font: FONT, color: "#fff6dc" });
        d.rect(52, 26, { x: W / 2 + w / 2 - 54, y, color: on ? "#3fae6a" : "#4a4258", radius: 13 });
        d.circle(11, { x: W / 2 + w / 2 - 54 + (on ? 13 : -13), y, color: "#fff6dc" });
        o.rows.push({ x: W / 2, y, w: w - 28, h: 48, fn });
    });
    if (keys) d.text("Keys: 1-9 add a card, Enter brews, Backspace undoes, D shows your deck, Z zooms", { x: W / 2, y: top + bh - 28, size: 11, font: FONT, color: COLORS.dim, maxWidth: w - 24, align: "center" });
    if (canQuit) {
        const y = top + 92 + rows.length * 54;
        d.rect(w - 28, 44, { x: W / 2, y, color: o.sure ? "#a8283a" : "#3a2438", radius: 10 });
        d.text(o.sure ? "Tap again to abandon" : "Abandon this run", { x: W / 2, y, size: 15, bold: true, font: FONT, color: "#ffb0a0" });
        o.rows.push({ x: W / 2, y, w: w - 28, h: 48, fn: () => { if (!o.sure) { o.sure = true; return; } G.overlay = null; G.run.screen = "end"; G.run.won = false; G.run.stats.floors = 0; clearRun(); G.game.go("title", {}, { fade: 0.25 }); } });
    }
}
