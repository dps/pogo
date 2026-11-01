// Everything that floats above a scene: card zoom with keyword chips, tooltips, deck viewer and the menu.
// One overlay at a time. It covers the scene with a near-opaque sheet, so nothing shows through its text.
import { CARDS, cardText } from "../data/cards.js";
import { KEYWORDS } from "../data/rules.js";
import { TRINKETS } from "../data/trinkets.js";
import { trinketArt } from "../art/index.js";
import { ASPECT, drawCard } from "./cardview.js";
import { COLORS, FONT, G, applySettings, clamp, clearRun, fit, keywordsIn, label, measure, minText, saveMeta } from "./core.js";

export const zoom = (card, extra = {}) => { G.overlay = { kind: "zoom", card, t: 0, tip: null, ...extra }; G.snd.lift(); G.game.haptic("light"); };
export const tip = (title, text, o = {}) => { G.overlay = { kind: "tip", title, text, t: 0, ...o }; G.snd.page(); };
export const deckView = (title, cards, o = {}) => { G.overlay = { kind: "deck", title, cards, t: 0, scroll: 0, ...o }; G.snd.page(); };
export const settings = () => { G.overlay = { kind: "settings", t: 0, sure: false }; G.snd.page(); };
const rarName = (t) => `${t.rar[0].toUpperCase()}${t.rar.slice(1)} trinket`;
export const trinketTip = (id, back) => { const t = TRINKETS[id]; tip(t.name, t.text, { sprite: trinketArt(id), sub: rarName(t), back }); };
export const close = () => { G.overlay = null; G.snd.page(); };

const panel = (d, x, y, w, h) => {
    d.rect(w + 2, h + 2, { x, y, color: "#e7b75e", radius: 15 });
    d.rect(w - 2, h - 2, { x, y, color: "#21143a", radius: 13 });
};
const inBox = (b, x, y) => Math.abs(x - b.x) < b.w / 2 && Math.abs(y - b.y) < b.h / 2;
export function installOverlays(s) {
    const game = G.game;
    let press = null;
    s.onUpdate((dt) => {
        const o = G.overlay;
        if (!o) { press = null; return; }
        o.t += dt;
        const p = s.input.pointer, H = s.view.height;
        if (o.kind === "deck") {
            const maxS = Math.max(0, o.contentH - (H - 76 - game.view.safe.top));
            if (s.input.wheel) o.scroll = clamp(o.scroll + s.input.wheel * 0.5, 0, maxS);
            if (p.pressed) press = { x: p.x, y: p.y, s: o.scroll, moved: 0 };
            if (p.down && press) { o.scroll = clamp(press.s - (p.y - press.y), 0, maxS); press.moved = Math.max(press.moved, Math.abs(p.y - press.y)); }
            if (p.released && press) {
                if (press.moved < 12) {
                    if (o.closeBox && Math.hypot(p.x - o.closeBox.x, p.y - o.closeBox.y) < 30) { const f = o.onClose, back = o.back; G.overlay = back ?? null; G.snd.page(); f?.(); press = null; return; }
                    const hit = o.boxes?.find((b) => inBox(b, p.x, p.y));
                    if (hit) {
                        if (o.onPick) zoom(hit.card, { back: o, action: { label: o.pickLabel ?? "Choose", fn: () => { const f = o.onPick; G.overlay = null; G.snd.pick(); f(hit.card); } } });
                        else if (hit.card) zoom(hit.card, { back: o });
                        else if (hit.trinket) trinketTip(hit.trinket, o);
                    }
                }
                press = null;
            }
            return;
        }
        if (o.t < 0.14 || !p.pressed) return;
        const x = p.x, y = p.y;
        if (o.actionBox && inBox(o.actionBox, x, y)) { const f = o.action.fn; G.overlay = null; f(); return; }
        if (o.kind === "zoom") {
            const chip = o.chips?.find((c) => inBox(c, x, y));
            if (chip) { o.tip = o.tip === chip.k ? null : chip.k; G.snd.page(); return; }
        }
        if (o.kind === "settings") {
            const hit = o.rows?.find((r) => inBox(r, x, y));
            if (hit) hit.fn(); else close();
            return;
        }
        G.overlay = o.back ?? null; G.snd.page();
    });
    s.onDrawUI((d) => {
        const o = G.overlay;
        if (!o) return;
        const W = s.view.width, H = s.view.height;
        d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#0d0719", opacity: 0.975 });
        if (o.kind === "zoom") drawZoom(d, o, W, H);
        else if (o.kind === "tip") drawTip(d, o, W, H);
        else if (o.kind === "deck") drawDeck(d, o, W, H);
        else if (o.kind === "settings") drawSettings(d, o, W, H);
    });
}
function actionButton(d, o, x, y, w) {
    d.rect(w + 2, 48, { x, y, color: "#e7b75e", radius: 15 });
    d.rect(w - 2, 44, { x, y, color: "#c0401e", radius: 13 });
    label(d, o.action.label, x, y, w - 14, 34, { size: 16, bold: true, color: "#fff6dc" });
    o.actionBox = { x, y, w, h: 48 };
}
function drawZoom(d, o, W, H) {
    const G0 = G.game.view.safe, land = W > H, pad = 14, def = CARDS[o.card.id], text = cardText(def, o.card.up), kws = keywordsIn(text);
    const avH = H - G0.top - G0.bottom - pad * 2;
    // Reserve space for what goes under the card first: flavour, chips, meaning, action.
    const fw = land ? W * 0.5 - pad * 2 : W - pad * 2, st = 42, chipsH = kws.length ? (kws.length > 3 ? 2 : 1) * 36 : 0, tipH = kws.length ? 62 : 0, actH = o.action ? 56 : 0;
    const below = land ? 0 : st + chipsH + tipH + actH + 6;
    const ch = Math.min(avH - below, land ? avH : 380), cw = Math.min(ch / ASPECT, land ? W * 0.42 : W * 0.78);
    const x = land ? W * 0.27 : W / 2, y = land ? H / 2 : G0.top + pad + cw * ASPECT / 2;
    drawCard(d, o.card, { x, y, w: cw, sheen: Math.sin(o.t * 1.3) * 0.6, foil: 0.34, lift: 1 });
    const px = land ? W * 0.74 : W / 2;
    let py = land ? G0.top + pad + 20 : y + cw * ASPECT / 2 + 8 + st / 2 - 4;
    if (def.flavor) label(d, def.flavor, px, py, fw, st, { size: 13, color: COLORS.dim });
    py += st / 2 + 20;
    o.chips = [];
    const wid = (k) => 24 + measure(k, 14, true).width, rows = []; let row = [], rowW = 0;
    for (const k of kws) { const w2 = wid(k); if (rowW + w2 + 6 > fw && row.length) { rows.push([row, rowW]); row = []; rowW = 0; } row.push([k, w2]); rowW += w2 + 6; }
    if (row.length) rows.push([row, rowW]);
    for (const [r, rw] of rows) {
        let cx = px - rw / 2 + 3;
        for (const [k, w2] of r) {
            const on = o.tip === k, c = KEYWORDS[k].color;
            d.rect(w2, 30, { x: cx + w2 / 2, y: py, color: on ? c : "#2a1b42", radius: 15 });
            d.rect(w2, 30, { x: cx + w2 / 2, y: py, color: c, radius: 15, outline: 1.5 });
            d.text(k, { x: cx + w2 / 2, y: py, size: 14, bold: true, font: FONT, color: on ? "#120822" : c });
            o.chips.push({ k, x: cx + w2 / 2, y: py, w: w2 + 4, h: 36 });
            cx += w2 + 6;
        }
        py += 36;
    }
    if (kws.length) { label(d, o.tip ? KEYWORDS[o.tip].text : "Tap a word for its meaning", px, py + tipH / 2 - 16, fw, tipH - 8, { size: 14, color: o.tip ? "#fff6dc" : COLORS.dim }); py += tipH - 8; }
    if (o.action) actionButton(d, o, px, land ? H - G0.bottom - 36 : Math.min(py + 26, H - G0.bottom - 30), Math.min(fw, 230));
}
function drawTip(d, o, W, H) {
    const G0 = G.game.view.safe, w = Math.min(W - 32, 330), inner = w - 32, m = measure(o.text, 15, false, inner);
    const parts = [o.sprite ? 72 : 0, 30, o.sub ? 20 : 0, m.height + 10, o.extra ? 22 : 0, o.action ? 60 : 0];
    const bh = Math.min(H - G0.top - G0.bottom - 12, parts.reduce((a, b) => a + b, 24)), cy = (H + G0.top - G0.bottom) / 2, x = W / 2;
    panel(d, x, cy, w, bh);
    let y = cy - bh / 2 + 12;
    if (o.sprite) { d.sprite(o.sprite, { x, y: y + 34, width: 68, height: 68 }); y += 72; }
    label(d, o.title, x, y + 15, inner, 28, { size: 19, bold: true, color: COLORS.gold }); y += 30;
    if (o.sub) { label(d, o.sub, x, y + 9, inner, 18, { size: 13, color: COLORS.dim }); y += 20; }
    const room = cy + bh / 2 - 12 - y - (o.extra ? 22 : 0) - (o.action ? 60 : 0);
    label(d, o.text, x, y + room / 2, inner, room, { size: 15, color: COLORS.cream }); y += room;
    if (o.extra) { label(d, o.extra, x, y + 11, inner, 20, { size: 13, color: COLORS.dim }); y += 22; }
    if (o.action) actionButton(d, o, x, y + 30, Math.min(220, inner));
}
function drawDeck(d, o, W, H) {
    const top = G.game.view.safe.top, sb = G.game.view.safe.bottom, sl = G.game.view.safe.left, sr = G.game.view.safe.right, head = 66 + top, uw = W - sl - sr;
    o.boxes = [];
    const showT = !!o.trinkets, cols = showT ? Math.max(3, Math.floor(uw / 86)) : Math.max(4, Math.floor(uw / 84)), gap = 6, cw = (uw - gap * (cols + 1)) / cols, ch = showT ? cw + 8 : cw * ASPECT, items = showT ? o.trinkets : o.cards;
    o.contentH = Math.ceil(items.length / cols) * (ch + gap) + 12;
    items.forEach((it, i) => {
        const x = sl + gap + cw / 2 + (i % cols) * (cw + gap), y = head + 8 + ch / 2 + Math.floor(i / cols) * (ch + gap) - o.scroll;
        if (y < head - ch / 2 || y > H + ch) return;
        if (showT) { d.circle(cw * 0.46, { x, y, color: "#2a1b42" }); d.sprite(trinketArt(it), { x, y, width: cw * 0.8, height: cw * 0.8 }); o.boxes.push({ x, y, w: cw, h: ch, trinket: it }); return; }
        drawCard(d, it, { x, y, w: cw, compact: true, foil: 0, textless: y + ch / 2 > H - 2 });
        o.boxes.push({ x, y, w: cw, h: ch, card: it });
    });
    d.rect(W + 4, head, { x: W / 2, y: head / 2, color: "#120822", opacity: 1 });
    label(d, o.title, W / 2, top + 22, W - 116, 28, { size: 19, bold: true, color: COLORS.gold });
    if (o.sub) label(d, o.sub, W / 2, top + 48, W - 116, 18, { size: 13, color: COLORS.dim });
    const cx = W - 32 - sr, cy = top + 30;
    d.circle(20, { x: cx, y: cy, color: "#7a3ad0" });
    d.circle(20, { x: cx, y: cy, color: "#e7b75e", outline: 2 });
    d.text("×", { x: cx, y: cy - 1, size: 24, bold: true, font: FONT, color: "#fff6dc" });
    o.closeBox = { x: cx, y: cy };
    if (!items.length) label(d, "Nothing here yet", W / 2, H / 2, W - 40, 30, { size: 15, color: COLORS.dim });
}
function drawSettings(d, o, W, H) {
    const m = G.meta, run = G.run, w = Math.min(W - 40, 300), keys = !G.game.input.touchMode;
    const rows = [
        ["Sound", m.sound, () => { m.sound = !m.sound; applySettings(); saveMeta(); G.snd.pick(); }],
        ["Music", m.music, () => { m.music = !m.music; applySettings(); saveMeta(); }],
        ["Haptics", m.haptics, () => { m.haptics = !m.haptics; applySettings(); saveMeta(); G.game.haptic("medium"); }],
    ];
    if (run) rows.push([`Trinkets (${run.trinkets.length})`, null, () => { G.overlay = { kind: "deck", title: "Your trinkets", cards: [], trinkets: run.trinkets, t: 0, scroll: 0, back: o }; G.snd.page(); }]);
    if (run) rows.push([o.sure ? "Tap again to abandon" : "Abandon this run", null, () => {
        if (!o.sure) { o.sure = true; return; }
        G.overlay = null; clearRun(); G.game.go("title", {}, { fade: 0.25 });
    }, true]);
    if (!run && m.tutorial) rows.push(["Replay the lessons", null, () => { G.overlay = null; m.tutorial = false; saveMeta(); G.startTutorial(); }]);
    const G0 = G.game.view.safe, avail = H - G0.top - G0.bottom - 12, head = 46, foot = keys ? 40 : 8, rh = Math.min(50, (avail - head - foot) / rows.length), bh = head + foot + rh * rows.length, cy = (H + G0.top - G0.bottom) / 2, top = cy - bh / 2;
    panel(d, W / 2, cy, w, bh);
    label(d, "Menu", W / 2, top + 24, w - 30, 28, { size: 20, bold: true, color: COLORS.gold });
    o.rows = [];
    rows.forEach(([name, on, fn, danger], i) => {
        const y = top + head + rh * (i + 0.5), bw = w - 24;
        d.rect(bw, rh - 6, { x: W / 2, y, color: danger ? (o.sure ? "#a8283a" : "#3a2438") : "#2f2150", radius: 10 });
        if (on === null) label(d, name, W / 2, y, bw - 20, rh - 10, { size: 15, bold: true, color: danger ? "#ffb0a0" : "#fff6dc" });
        else {
            d.text(name, { x: W / 2 - bw / 2 + 56, y, size: 15, bold: true, font: FONT, color: "#fff6dc" });
            d.rect(50, 24, { x: W / 2 + bw / 2 - 38, y, color: on ? "#3fae6a" : "#4a4258", radius: 12 });
            d.circle(10, { x: W / 2 + bw / 2 - 38 + (on ? 12 : -12), y, color: "#fff6dc" });
        }
        o.rows.push({ x: W / 2, y, w: bw, h: rh, fn });
    });
    if (keys) label(d, "1-9 add a card. Enter brews. Backspace undoes.", W / 2, top + bh - 21, w - 24, 34, { size: 12, color: COLORS.dim });
}
