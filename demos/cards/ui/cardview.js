// A card as a physical thing: transform, tilt, parallax layers, foil sheen, shadow and dissolve.
import { CARDS, cardCost, cardText } from "../data/cards.js";
import { CARD_H, CARD_W, cardArt, tokenArt } from "../art/index.js";
import { COLORS, FONT, G, drawRich, richLayout } from "./core.js";

export const ASPECT = CARD_H / CARD_W;
export function shear(d, sx, sy) {
    const m = d.m, a = m[0], b = m[1], c = m[2], e = m[3];
    m[0] = a + c * sy; m[1] = b + e * sy; m[2] = c + a * sx; m[3] = e + b * sx;
}
const RAR = { starter: "#9a8fa8", common: "#b8b0c0", uncommon: "#58c0ff", rare: "#ffcf40", curse: "#7c7a52" };
/** Draw a card. o: x y w rot tx ty (tilt -1..1) foil(0..1) cost(shown cost) dim glow lift alpha. */
export function drawCard(d, card, o) {
    const def = CARDS[card.id], w = o.w, k = w / CARD_W, up = card.up, tx = o.tx ?? 0, ty = o.ty ?? 0, lift = o.lift ?? 0, a = o.alpha ?? 1;
    // Shadow falls further away the higher the card is held.
    d.sprite("cardshadow", { x: o.x + 3 + lift * 12 * k, y: o.y + 6 + lift * 22 * k, width: w * (1.22 + lift * 0.08), height: w * ASPECT * (1.18 + lift * 0.08), color: "#07040f", opacity: 0.55 * a });
    d.push();
    d.translate(o.x, o.y); d.rotate(o.rot ?? 0);
    d.scale(1 - Math.abs(tx) * 0.1, 1 - Math.abs(ty) * 0.07);
    shear(d, tx * ty * -0.08, tx * 0.12 * (ty >= 0 ? 1 : -1) * 0.5);
    d.scale(k);
    const glow = o.glow ?? 0;
    if (glow > 0) d.additive(() => d.sprite("glow", { width: CARD_W * 1.5, height: CARD_H * 1.34, color: o.glowColor ?? COLORS.gold, opacity: glow }));
    const artName = cardArt(def.id), px = -tx * 5, py = -ty * 5;
    d.sprite(artName, { x: 90 - CARD_W / 2 + px, y: 80 - CARD_H / 2 + py, width: 164, height: 123, opacity: a });
    d.sprite(`frame_${def.el}`, { width: CARD_W, height: CARD_H, opacity: a });
    const cx = -CARD_W / 2, cy = -CARD_H / 2;
    if (a > 0.3) {
        const cost = o.cost ?? cardCost(def, up), name = def.name + (up ? "+" : ""), ns = nameSize(name);
        d.text(name, { x: cx + 104, y: cy + 21, size: ns, bold: true, font: FONT, color: "#120822", opacity: 0.6 });
        d.text(name, { x: cx + 104, y: cy + 20, size: ns, bold: true, font: FONT, color: up ? "#d9ffb0" : "#fff8e4" });
        d.sprite("costgem", { x: cx + 22 + tx * 2.5, y: cy + 23 + ty * 2.5, width: 50, height: 50 });
        d.text(cost, { x: cx + 22 + tx * 2.5, y: cy + 24.5 + ty * 2.5, size: 30, bold: true, font: FONT, color: "#120822", opacity: 0.55 });
        d.text(cost, { x: cx + 22 + tx * 2.5, y: cy + 23 + ty * 2.5, size: 30, bold: true, font: FONT, color: o.costColor ?? "#ffffff" });
        d.rect(12, 12, { x: cx + 90, y: cy + 136, rot: 0, color: RAR[def.rar] ?? "#fff", radius: 6, outline: 0 });
        const text = cardText(def, up), L = fit(text);
        drawRich(d, L, cx + 90, cy + 190, {});
    }
    const foil = o.foil ?? (def.rar === "rare" ? 0.14 : 0);
    if (foil > 0.01) {
        const f = Math.max(0, Math.min(15, Math.round((tx * 0.42 + ty * 0.22 + 0.5) * 15)));
        d.additive(() => d.sprite("foil", { frame: f, width: CARD_W - 2, height: CARD_H - 2, opacity: foil }));
    }
    if (o.dim) d.rect(CARD_W - 4, CARD_H - 4, { color: "#120822", opacity: o.dim, radius: 14 });
    d.pop();
}
const nsCache = new Map();
function nameSize(name) {
    let v = nsCache.get(name);
    if (v) return v;
    const w = G.game.renderer.measureText(name, { size: 19, font: FONT, bold: true, align: "left", maxWidth: 0, lineHeight: 1.2 }).width;
    v = w <= 126 ? 19 : Math.max(11, Math.floor(19 * 126 / w * 2) / 2);
    nsCache.set(name, v);
    return v;
}
function fit(text) {
    let L = richLayout(text, 20, 150, "d");
    if (L.lines.length > 4) L = richLayout(text, 17, 152, "d");
    if (L.lines.length > 5) L = richLayout(text, 15, 154, "d");
    return L;
}
/** Break a spent card into glowing cells. t 0..1. Uses the renderer's quad so each cell keeps its piece of the picture. */
export function drawDissolve(d, game, card, o, t) {
    const def = CARDS[card.id], cols = 8, rows = 11, k = o.w / CARD_W, r = game.renderer;
    const frame = game.assets.sprite(`frame_${def.el}`), art = game.assets.sprite(cardArt(def.id));
    const tf = r.texture(frame), ta = r.texture(art), cw = CARD_W / cols, ch = CARD_H / rows;
    d.push(); d.translate(o.x, o.y); d.rotate(o.rot ?? 0); d.scale(k);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const seed = (Math.sin(x * 12.9 + y * 78.2) * 43758.5) % 1, delay = Math.abs(seed) * 0.55 + (y / rows) * 0.2, q = Math.max(0, Math.min(1, (t - delay) / 0.3));
        if (q >= 1) continue;
        const x0 = -CARD_W / 2 + x * cw, y0 = -CARD_H / 2 + y * ch, dy = -q * q * 46, dx = seed * q * 18, s = (1 - q), g = q > 0 ? 1 + q * 1.5 : 1;
        const mx = x0 + cw / 2 + dx, my = y0 + ch / 2 + dy, hw = cw / 2 * s, hh = ch / 2 * s, u0 = x / cols, u1 = (x + 1) / cols, v0 = y / rows, v1 = (y + 1) / rows, a = 1 - q * 0.4;
        // Art layer inside the window, then the frame cell over it.
        const ax = (x0 + cw / 2 + CARD_W / 2 - 8) / 164, ay = (y0 + ch / 2 + CARD_H / 2 - 18.5) / 123;
        if (ax > 0.02 && ax < 0.98 && ay > 0.02 && ay < 0.98) r.quad(d.m, mx - hw, my - hh, mx + hw, my + hh, ax - cw / 328, ay - ch / 246, ax + cw / 328, ay + ch / 246, g, g, g, a, ta, 0, 0, 0, 0, 0);
        r.quad(d.m, mx - hw, my - hh, mx + hw, my + hh, u0, v0, u1, v1, g, g * (1 - q * 0.3), g * (1 - q * 0.6), a, tf, 0, 0, 0, 0, 0);
    }
    d.pop();
}
export const token = (id) => tokenArt(id);
