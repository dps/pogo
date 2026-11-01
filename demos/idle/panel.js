// HUD, the shop panel and every modal. Immediate-mode: drawing a button also registers where it can be tapped.
import * as E from "./econ.js";
import { ACTS, BYLAWS, CONCEPTS, WEEK } from "./data.js";
import { C, ITEM_FRAMES } from "./art.js";
import { T, textWidth } from "./font.js";
import { crewFrame, FONT, metrics } from "./stage.js";

const money = E.money, fmt = E.fmt;
export const paper = (G) => (E.sold(G.S, "beige") ? "#ffffff" : C.cream);
export const paper2 = (G) => (E.sold(G.S, "beige") ? "#f1f4fa" : "#f3dfb6");
export const sticker = (G) => (E.sold(G.S, "orange") ? "#9a9aa6" : C.orange);

export function note(d, G, str, x, y, size, maxW, color = C.ink, o = {}) {
    const m = G.game.renderer.measureText(str, { size, font: FONT, bold: !!o.bold, align: "left", maxWidth: maxW, lineHeight: 1.22 });
    const dx = o.center ? 0 : m.width / 2;
    d.text(str, { x: x + dx, y: y + (o.middle ? 0 : m.height / 2), size, font: FONT, bold: !!o.bold, align: o.center ? "center" : "left", maxWidth: maxW, lineHeight: 1.22, color, opacity: o.opacity ?? 1 });
    return m.height;
}
function hit(G, id, x, y, w, h, fn, layer = 0) { G.hits.push({ id, x, y, w, h, fn, layer }); }
const pressedScale = (G, id) => (G.armed === id ? 0.96 : 1);

/** A chunky sticker button, centred on x, y. */
export function btn(d, G, id, label, x, y, w, h, fn, o = {}) {
    const k = pressedScale(G, id) * (o.pulse ? 1 + Math.sin(G.time * 6) * 0.025 : 1), col = o.color ?? sticker(G);
    d.push(); d.translate(x, y); d.scale(k, k); d.rotate(o.rot ?? 0);
    d.rect(w, h, { x: 1.5, y: 3, color: C.ink, radius: 9 });
    d.rect(w, h, { color: C.ink, radius: 9 }); d.rect(w - 5, h - 5, { color: col, radius: 7 });
    d.rect(w - 12, 4, { y: -h / 2 + 7, color: "#ffffff", radius: 2, opacity: 0.3 });
    const sub = o.sub;
    T(d, label, 0, sub ? -h * 0.14 : 0, o.size ?? 15, { color: o.text ?? C.paper, maxW: w - 16 });
    if (sub) T(d, sub, 0, h * 0.22, 10, { color: o.text ?? C.paper, maxW: w - 16, opacity: 0.92 });
    d.pop();
    if (fn) hit(G, id, x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6, fn, o.layer ?? 1);
}

// --- HUD ----------------------------------------------------------------------------------------
export function drawHUD(d, G) {
    const { S, A } = G, P = G.pane, s = G.game.view.safe, top = s.top + 8, cx = P.x + P.w / 2, right = P.x + P.w - 8;
    if (A.title > 0.01) return drawTitle(d, G, top);
    // Cash.
    d.rect(Math.min(P.w - 96, 300) + 16, 58, { x: cx, y: top + 28, color: C.ink, radius: 14, opacity: 0.88 });
    const size = 28 * (1 + A.cashPulse * 0.14), gold = S.frenzy > 0 ? "#fff09a" : C.gold;
    T(d, money(A.cashShown), cx, top + 20, size, { color: gold, maxW: Math.min(P.w - 96, 300) });
    const r = E.rate(S);
    if (r > 0) T(d, `${money(r)} / SEC`, cx, top + 44, 11, { color: C.paper, maxW: Math.min(P.w - 110, 290) });
    // Gear.
    const gx = right - 17, gy = top + 17;
    d.circle(18, { x: gx, y: gy, color: C.ink, opacity: 0.8 }); d.sprite("fx", { frame: 2, x: gx, y: gy, width: 24, height: 24, color: C.paper }); d.circle(4.5, { x: gx, y: gy, color: C.ink });
    hit(G, "gear", gx - 22, gy - 22, 44, 44, () => G.open("settings"));
    // Where we are, and how far to the next venue.
    const y = top + 66, bw = Math.min(P.w - 28, 330), bx = cx - bw / 2;
    if (S.ready && E.act(S).move) {
        btn(d, G, "move", `MOVE TO ${E.act(S).move}`, cx, y + 8, Math.min(P.w - 24, 300), 40, () => G.open("move"), { pulse: true, color: C.coral, sub: "MOVING DAY: NEW VENUE, NEW RULES", size: 13 });
    } else {
        const A0 = E.act(S), pr = E.progress(S);
        d.rect(bw + 6, 16, { x: cx, y, color: C.ink, radius: 8, opacity: 0.86 });
        if (pr > 0.004) d.rect(Math.max(10, bw * pr), 10, { x: bx + (Math.max(10, bw * pr)) / 2, y, color: A0.move ? C.teal : C.coral, radius: 5 });
        T(d, A0.stops[S.stop].scale, cx, y, 9.5, { color: C.paper, maxW: bw - 12 });
        if (A.nextNote > 0) T(d, A0.move ? `NEXT: ${A0.move}` : "LAST STOP", cx, y + 15, 8.5, { color: C.paper, outline: C.ink, opacity: Math.min(1, A.nextNote) });
    }
    // Hype.
    if (E.hypeOn(S) && !S.ended) {
        const hx = P.x + 18, hh = Math.min(150, P.h * 0.32), hy = P.h * 0.2 + hh / 2 + 8;
        d.rect(16, hh + 6, { x: hx, y: hy, color: C.ink, radius: 8, opacity: 0.9 });
        const v = S.frenzy > 0 ? S.frenzy / (E.TUNE.frenzySecs * (E.has(S, "patience") ? 2 : 1)) : S.hype;
        if (v > 0.02) d.rect(10, hh * v, { x: hx, y: hy + hh / 2 - (hh * v) / 2, color: S.frenzy > 0 ? "#fff09a" : S.hype >= 1 ? C.gold : C.coral, radius: 5 });
        T(d, "HYPE", hx, hy - hh / 2 - 12, 8, { color: C.paper, outline: C.ink });
        if (S.hype >= 1 && S.frenzy <= 0) {
            const M = metrics(G), bx2 = P.x + 62, by = hy + 28, k = (G.armed === "frenzy" ? 0.92 : 1) * (1 + Math.sin(G.time * 8) * 0.05);
            d.push(); d.translate(bx2, by); d.scale(k, k); d.rotate(Math.sin(G.time * 3) * 0.06);
            d.sprite("burst", { width: 112, height: 112, color: C.ink }); d.sprite("burst", { width: 102, height: 102, color: sticker(G) });
            T(d, "EVERYTHING", 0, -14, 9.5, { color: C.paper, maxW: 74 }); T(d, "MUST", 0, 0, 10, { color: C.paper }); T(d, "GO!", 0, 16, 16, { color: "#fff09a" });
            d.pop();
            hit(G, "frenzy", bx2 - 54, by - 54, 108, 108, () => G.goFrenzy(), 1);
        }
    }
    // Rival.
    if (S.act === 2) drawGary(d, G, top);
    // Week.
    if (E.weekOn(S) && !S.ended) {
        const days = E.weekDays(S), today = E.today(S), cw = Math.min(30, (P.w - 44) / 7), wy = top + 92, x0 = cx - (cw * days.length) / 2 + cw / 2;
        days.forEach((day, i) => { const on = day === today; d.rect(cw - 3, 20, { x: x0 + i * cw, y: wy, color: on ? C.gold : C.ink, radius: 5, opacity: on ? 1 : 0.8 }); T(d, day.name.slice(0, 2), x0 + i * cw, wy, 8.5, { color: on ? C.ink : C.paper }); });
        if (today) note(d, G, today.note, cx, wy + 18, 11, P.w - 60, C.paper, { center: true, middle: true });
    }
    // Stray sticker.
    if (A.stray) {
        const st = A.stray, k = 1 + Math.sin(G.time * 5) * 0.08;
        d.push(); d.translate(st.x, st.y); d.rotate(Math.sin(G.time * 2) * 0.4); d.scale(k, k);
        d.additive(() => d.sprite("glow", { width: 90, height: 90, color: C.gold, opacity: 0.6 }));
        d.sprite("burst", { width: 58, height: 58, color: C.ink }); d.sprite("burst", { width: 52, height: 52, color: C.gold }); T(d, "50%", 0, -5, 11, { color: C.ink }); T(d, "OFF", 0, 7, 9, { color: C.ink }); d.pop();
        hit(G, "stray", st.x - 34, st.y - 34, 68, 68, () => G.claimStray(), 1);
    }
    // Haggle.
    if (S.cust && !S.cust.final && A.cust && !A.cust.leaving && A.cust.arrived) drawHaggle(d, G);
    drawBubble(d, G);
    drawBanners(d, G);
}
function drawTitle(d, G, top) {
    const { A } = G, P = G.pane, cx = P.x + P.w / 2, a = A.title, M = metrics(G), w = Math.min(P.w - 26, 350), h = Math.min(w * 0.42, M.yTop - M.itemS - top - 30), y = top + 12 + h / 2 - (1 - a) * 240, sway = Math.sin(G.time * 0.9) * 0.012;
    d.push(); d.translate(cx, y); d.rotate(-0.02 + sway);
    d.line([-w * 0.32, -h / 2 + 2], [-w * 0.3, -h / 2 - 90], { width: 2.5, color: C.ink }); d.line([w * 0.32, -h / 2 + 2], [w * 0.3, -h / 2 - 90], { width: 2.5, color: C.ink });
    d.rect(w, h, { x: 3, y: 5, color: C.ink, radius: 7 }); d.rect(w, h, { color: "#e4b679", radius: 7 }); d.rect(w - 12, h - 12, { color: "#f0c992", radius: 3 });
    T(d, "COSMIC", -w * 0.1, -h * 0.25, h * 0.27, { color: C.violet, maxW: w * 0.6 }); T(d, "YARD SALE", 0, h * 0.14, h * 0.3, { color: C.coral, maxW: w - 34 });
    T(d, "EVERYTHING MUST GO", 0, h * 0.39, h * 0.085, { color: C.ink, maxW: w - 60 });
    d.sprite("burst", { x: w * 0.36, y: -h * 0.26, width: h * 0.52, height: h * 0.52, color: C.ink }); d.sprite("burst", { x: w * 0.36, y: -h * 0.26, width: h * 0.46, height: h * 0.46, color: C.gold, rot: G.time * 0.2 });
    T(d, "50¢", w * 0.36, -h * 0.26, h * 0.13, { color: C.ink, rot: 0.2 });
    d.pop();
    const b = Math.abs(Math.sin(G.time * 4)) * 8, ty = P.h > P.w ? M.yFeet + 74 : M.yFeet + 46;
    T(d, "TAP THE TABLE", cx, ty - b * 0.4, 24, { color: C.paper, outline: C.ink, maxW: P.w - 50, opacity: a });
    d.poly([[cx - 12, ty - 22 - b], [cx + 12, ty - 22 - b], [cx, ty - 36 - b]], { color: C.paper, opacity: a });
}
function drawGary(d, G, top) {
    const { S, A } = G, P = G.pane, cx = P.x + P.w / 2, y = top + 96, g = S.gary;
    if (g.war) {
        const w = g.war, bw = Math.min(P.w - 44, 300), bx = cx - bw / 2;
        T(d, "BIDDING WAR!", cx, y - 4, 16, { color: C.gold, outline: C.ink });
        d.rect(bw + 6, 22, { x: cx, y: y + 18, color: C.ink, radius: 10 }); d.rect(bw, 16, { x: cx, y: y + 18, color: C.orange, radius: 8 });
        d.rect(Math.max(10, bw * Math.min(1, w.bar)), 16, { x: bx + (Math.max(10, bw * Math.min(1, w.bar))) / 2, y: y + 18, color: C.teal, radius: 8 });
        T(d, `TAP TAP TAP!  ${Math.ceil(w.t)}`, cx, y + 42, 13, { color: C.paper, outline: C.ink });
    } else if (E.garyActive(S)) {
        const bw = 5, pipY = y;
        T(d, "GARY'S TENTS", cx, pipY - 6, 8.5, { color: C.paper, outline: C.ink });
        for (let i = 0; i < 5; i++) { const on = i >= g.wins; d.rect(18, 10, { x: cx + (i - 2) * 21, y: pipY + 7, color: on ? C.orange : C.ink, radius: 3, opacity: on ? 1 : 0.5 }); }
        if (E.garyReady(S)) {
            btn(d, G, "war", "BID WAR", cx - 62, y + 34, 112, 34, () => G.goWar(), { color: C.coral, size: 13, pulse: true });
            const c = E.garyPayoff(S);
            btn(d, G, "pay", "BUY HIM OFF", cx + 62, y + 34, 112, 34, S.cash >= c ? () => { if (E.payGary(S)) G.snd.deal(); } : null, { color: S.cash >= c ? C.teal : C.steelD, size: 11, sub: money(c) });
        }
    }
}
function drawHaggle(d, G) {
    const { S } = G, P = G.pane, c = S.cust, cx = P.x + P.w / 2, y = P.h - 30 - (P.h > P.w ? 0 : G.game.view.safe.bottom), w = Math.min((P.w - 26) / 2, 170);
    const offer = c.kid ? money(c.offer) : money(c.offer * E.haggleMult(S));
    if (c.kid) { btn(d, G, "deal", "DEAL", cx, y, w * 1.3, 46, () => G.deal(), { color: C.teal, sub: offer, size: 16, pulse: true }); return; }
    btn(d, G, "deal", "DEAL", cx - w / 2 - 3, y, w, 46, () => G.deal(), { color: C.teal, sub: offer, size: 16 });
    const ch = Math.round(E.counterChance(S) * 100);
    btn(d, G, "counter", "COUNTER", cx + w / 2 + 3, y, w, 46, () => G.counter(), { color: C.coral, sub: `${ch}% THEY STAY`, size: 14 });
}
function drawBubble(d, G) {
    const b = G.A.bubble; if (!b) return;
    const P = G.pane, M = metrics(G), maxW = Math.min(P.w - 56, 300), size = 13.5;
    const m = G.game.renderer.measureText(b.text, { size, font: FONT, bold: true, align: "center", maxWidth: maxW - 22, lineHeight: 1.22 });
    const h = m.height + (b.name ? 30 : 18), w = Math.max(m.width + 26, b.name ? Math.min(maxW, textWidth(b.name, 9) + 26) : 0), a = Math.min(1, b.t * 6, b.life * 4), k = 0.9 + 0.1 * Math.min(1, b.age * 8);
    const by = G.game.view.safe.top + (E.weekOn(G.S) ? 160 : G.S.act === 2 ? 170 : 114) + h / 2, cx = Math.max(P.x + w / 2 + 8, Math.min(P.x + P.w - w / 2 - 8, b.x ?? (P.x + P.w * 0.6)));
    d.push(); d.translate(cx, by); d.scale(k, k);
    d.poly([[w * 0.1, h / 2 - 4], [w * 0.28, h / 2 - 4], [w * 0.3, h / 2 + 12]], { color: C.ink, opacity: a });
    d.rect(w + 4, h + 4, { color: C.ink, radius: 12, opacity: a }); d.rect(w, h, { color: b.color ?? "#fffaf0", radius: 10, opacity: a });
    d.poly([[w * 0.11, h / 2 - 3], [w * 0.26, h / 2 - 3], [w * 0.29, h / 2 + 7]], { color: b.color ?? "#fffaf0", opacity: a });
    if (b.name) T(d, b.name, 0, -h / 2 + 11, 9, { color: C.coral, maxW: w - 16, opacity: a });
    d.text(b.text, { y: b.name ? 7 : 0, size, font: FONT, bold: true, align: "center", maxWidth: maxW - 22, lineHeight: 1.22, color: C.ink, opacity: a });
    d.pop();
}
function drawBanners(d, G) {
    const P = G.pane, cx = P.x + P.w / 2;
    for (const b of G.A.banners) {
        const a = Math.min(1, b.age * 6, b.life * 3), s = b.age < 0.3 ? 1.5 - (b.age / 0.3) * 0.5 + Math.sin((b.age / 0.3) * Math.PI) * 0.1 : 1;
        d.push(); d.translate(cx, P.h * b.y); d.scale(s, s); d.rotate(b.rot ?? -0.03);
        const w = Math.min(P.w - 24, Math.max(textWidth(b.big, b.size ?? 22) + 34, 190)), h = b.small ? 58 : 42;
        d.rect(w + 5, h + 5, { x: 2, y: 3, color: C.ink, radius: 6, opacity: a }); d.rect(w, h, { color: b.color ?? C.gold, radius: 4, opacity: a });
        if (b.small) T(d, b.small, 0, -15, 10, { color: C.ink, opacity: a, maxW: w - 20 });
        T(d, b.big, 0, b.small ? 8 : 0, b.size ?? 22, { color: C.ink, opacity: a, maxW: w - 20 });
        d.pop();
    }
}

// --- Shop panel ----------------------------------------------------------------------------------
const CARD_H = 66;
export function tabs(G) { const S = G.S; const t = ["crew", "upgrades"]; if (S.act === 5) t.push("ideas"); return t; }
export function buyCount(G, i) {
    const S = G.S, m = G.buyMode;
    if (m === 0) return 1;
    if (m === 1) return 10;
    if (m === 2) { const nx = E.nextMilestone(S.crew[i]); return nx ? nx - S.crew[i] : 25; }
    return Math.max(1, E.maxBuy(S, i));
}
const MODES = ["×1", "×10", "NEXT", "MAX"];
export function drawPanel(d, G) {
    const { S, A } = G, R = G.panel;
    d.rect(R.w, R.h + 40, { x: R.x + R.w / 2, y: R.y + R.h / 2 + 20, color: C.ink });
    d.rect(R.w, 5, { x: R.x + R.w / 2, y: R.y + 2.5, color: sticker(G) });
    if (A.fin) { const end = A.fin.stage === "driveway" || A.fin.stage === "done"; if (A.fin.stage === "reveal") return; T(d, end ? "SATURDAY MORNING" : "THE TABLE IS EMPTY", R.x + R.w / 2, R.y + R.h / 2 - 12, 18, { color: C.paper, maxW: R.w - 40 }); note(d, G, end ? "Fifty cents. Not bad, for a card table." : "You sold everything. There is nothing left, anywhere. Well. Almost nothing.", R.x + R.w / 2, R.y + R.h / 2 + 26, 13, R.w - 60, C.paper, { center: true, middle: true }); return; }
    if (A.title > 0) {
        const a = A.title, cx = R.x + R.w / 2, y = R.y + R.h * 0.3, row = ["cables", "house", "ocean", "saturn", "galaxy"], cell = Math.min(62, (R.w - 30) / 6);
        note(d, G, "You have a card table, a box of cables and a driveway. By the end, you will be selling Tuesday.", cx, y, 15, Math.min(R.w - 50, 340), C.paper, { center: true, middle: true, opacity: a, bold: true });
        const yy = R.y + R.h * 0.66, put = d.quads("items");
        row.forEach((n, i) => put(cx + (i - 2.5) * cell * 1.04, yy + Math.sin(G.time * 1.6 + i) * 3, cell * 1.1, cell * 1.1, Math.sin(G.time + i) * 0.06, ITEM_FRAMES[n], 1, 1, 1, a));
        d.push(); d.translate(cx + 2.5 * cell * 1.04, yy); d.rotate(-0.08); d.rect(cell * 1.5, cell * 0.56, { color: "#ffffff", radius: 4, opacity: a }); T(d, "TUES", 0, 0, cell * 0.26, { color: C.ink, opacity: a }); d.pop();
        if (a > 0.99) return;
    }
    d.push(); d.translate(0, A.title * 40);
    const list = tabs(G), tw = Math.min(104, (R.w - 86) / list.length), ty = R.y + 24;
    list.forEach((id, i) => {
        const x = R.x + 8 + tw * (i + 0.5), on = G.tab === id, n = id === "upgrades" ? E.upgrades(S).filter((u) => E.upVisible(S, u) && S.cash >= u.cost).length : id === "ideas" ? (E.nextConcept(S) && S.earnedAct >= E.nextConcept(S).at ? 1 : 0) : 0;
        d.rect(tw - 6, 30, { x, y: ty, color: on ? paper(G) : "#352a72", radius: 7 });
        T(d, id === "ideas" ? "IDEAS" : id === "crew" ? "CREW" : "UPGRADES", x, ty, 11, { color: on ? C.ink : C.paper, maxW: tw - 16 });
        if (n) { d.circle(9, { x: x + tw / 2 - 9, y: ty - 12, color: C.coral }); T(d, n, x + tw / 2 - 9, ty - 12, 9, { color: C.paper }); }
        hit(G, `tab${id}`, x - tw / 2, ty - 18, tw, 38, () => { G.tab = id; G.scroll = id === "ideas" ? Math.max(0, CONCEPTS.indexOf(E.nextConcept(S)) * CARD_H) : 0; G.snd.ui(); }, 2);
    });
    if (G.tab === "crew") {
        const bw = 62, x = R.x + R.w - 8 - bw / 2;
        d.rect(bw, 30, { x, y: ty, color: "#352a72", radius: 7 }); T(d, MODES[G.buyMode], x, ty, 12, { color: C.gold });
        hit(G, "mode", x - bw / 2, ty - 18, bw, 38, () => { G.buyMode = (G.buyMode + 1) % 4; G.snd.ui(); }, 2);
    }
    const top = R.y + 44, h = R.h - 44 - G.game.view.safe.bottom, cards = G.tab === "crew" ? crewCards(G) : G.tab === "upgrades" ? upCards(G) : ideaCards(G);
    G.maxScroll = Math.max(0, cards.length * CARD_H + 6 - h);
    G.scroll = Math.max(0, Math.min(G.maxScroll, G.scroll));
    G.listRect = { x: R.x, y: top, w: R.w, h };
    d.clip(R.x, top, R.w, h, () => {
        cards.forEach((c, i) => {
            const y = top + 4 + i * CARD_H - G.scroll + CARD_H / 2;
            if (y < top - CARD_H || y > top + h + CARD_H) return;
            c(d, R.x + 6, y - CARD_H / 2 + 2, R.w - 12, CARD_H - 5, top, h);
        });
    });
    if (G.maxScroll > 0) { const barH = Math.max(24, (h * h) / (h + G.maxScroll)), by = top + (G.scroll / G.maxScroll) * (h - barH); d.rect(3, barH, { x: R.x + R.w - 3, y: by + barH / 2, color: C.paper, radius: 2, opacity: 0.4 }); }
    d.pop();
}
function cardBase(d, G, id, x, y, w, h, on, fn, top, viewH) {
    const k = G.armed === id ? 0.98 : 1, fx = Math.min(1, G.A.cardFx[id] ?? 0);
    d.push(); d.translate(x + w / 2, y + h / 2); d.scale(k + fx * 0.03, k + fx * 0.03);
    d.rect(w, h, { y: 2, color: "#000000", radius: 8, opacity: 0.35 }); d.rect(w, h, { color: on ? paper(G) : paper2(G), radius: 8 });
    if (fx > 0) d.rect(w, h, { color: C.gold, radius: 8, opacity: fx * 0.8 });
    d.circle(4.5, { x: -w / 2 + 9, y: 0, color: C.ink });
    d.pop();
    if (fn) { const yy = Math.max(top, y), hh = Math.min(top + viewH, y + h) - yy; if (hh > 0) hit(G, id, x, yy, w, hh, fn, 0); }
}
function priceTag(d, G, label, x, y, w, on) {
    d.rect(w, 28, { x, y, color: C.ink, radius: 6 }); d.rect(w - 4, 24, { x, y, color: on ? sticker(G) : C.steelD, radius: 5 });
    T(d, label, x, y, 11.5, { color: C.paper, maxW: w - 12 });
}
function crewCards(G) {
    const { S, A } = G, out = [], cfg = E.act(S);
    for (let i = 0; i < 5; i++) {
        if (!E.crewVisible(S, i)) { out.push((d, x, y, w, h) => { d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#352a72", radius: 8 }); T(d, "???", x + w / 2, y + h / 2 - 7, 14, { color: C.steel }); T(d, `${money(E.crewCost(S, i))}`, x + w / 2, y + h / 2 + 12, 9, { color: C.steel }); }); break; }
        out.push((d, x, y, w, h, top, vh) => {
            const c = cfg.crew[i], n = buyCount(G, i), cost = E.crewCost(S, i, n), on = S.cash >= cost, id = `crew${i}`, feed = E.holeOn(S) && S.crew[i] >= 5 && S.crew[i] > S.fed[i];
            if (on && !S.crew[i]) G.A.cardFx[id] = Math.max(G.A.cardFx[id] ?? 0, 0.28 + Math.sin(G.time * 7) * 0.22);
            cardBase(d, G, id, x, y, w, h, on, () => G.buy(i), top, vh);
            d.sprite("crew", { frame: crewFrame(S.act, i), x: x + 38, y: y + h / 2, width: 50, height: 50 });
            if (S.crew[i]) { d.circle(11, { x: x + 56, y: y + 13, color: C.ink }); T(d, S.crew[i] > 999 ? "1K+" : S.crew[i], x + 56, y + 13, S.crew[i] > 99 ? 7.5 : 10, { color: C.gold }); }
            const tw = Math.min(118, w * 0.34), textW = w - 76 - tw - 10;
            T(d, c.name, x + 68, y + 15, 11.5, { align: -1, color: C.ink, maxW: textW + (feed ? 0 : 0) });
            if (feed) btn(d, G, `feed${i}`, "FEED HOLE", x + 68 + 44, y + h - 15, 88, 22, () => G.feed(i), { color: C.plum, size: 9.5, layer: 1 });
            else note(d, G, c.note, x + 68, y + 25, 10.5, textW, "#51477e");
            priceTag(d, G, money(cost), x + w - tw / 2 - 8, y + h / 2 - 6, tw, on);
            if (n > 1) T(d, `BUY ${n}`, x + w - tw / 2 - 8, y + h - 10, 8.5, { color: "#51477e" });
            // Next milestone.
            const nx = E.nextMilestone(S.crew[i]);
            if (nx && S.crew[i]) { const prev = E.MILESTONES.filter((m) => m <= S.crew[i]).pop() ?? 0, pr = (S.crew[i] - prev) / (nx - prev), bw = w - 90 - tw; d.rect(bw, 3, { x: x + 68 + bw / 2, y: y + h - 3.5, color: "#00000022", radius: 1.5 }); d.rect(Math.max(3, bw * pr), 3, { x: x + 68 + (bw * pr) / 2, y: y + h - 3.5, color: C.teal, radius: 1.5 }); }
        });
    }
    return out;
}
function upCards(G) {
    const { S } = G, list = E.upgrades(S).filter((u) => E.upVisible(S, u)).sort((a, b) => a.cost - b.cost);
    if (!list.length) return [(d, x, y, w, h) => note(d, G, "Nothing to upgrade yet. Keep your crew growing, and new upgrades will turn up here.", x + w / 2, y + h / 2, 12, w - 40, C.paper, { center: true, middle: true })];
    return list.map((u) => (d, x, y, w, h, top, vh) => {
        const on = S.cash >= u.cost, id = `up${u.id}`, tw = Math.min(118, w * 0.34), textW = w - 76 - tw - 10;
        cardBase(d, G, id, x, y, w, h, on, () => G.buyUp(u), top, vh);
        if (u.kind === "crew") d.sprite("crew", { frame: crewFrame(S.act, u.crew), x: x + 38, y: y + h / 2, width: 46, height: 46 });
        else { d.sprite("burst", { x: x + 38, y: y + h / 2, width: 46, height: 46, color: C.coral }); T(d, "TAP", x + 38, y + h / 2, 11, { color: C.paper }); }
        T(d, u.name, x + 68, y + 15, 11, { align: -1, color: C.ink, maxW: textW });
        const eff = u.kind === "crew" ? `${E.act(S).crew[u.crew].name} ×${u.mult}` : `Taps ×${u.mult}, plus ${(u.pct * 100).toFixed(1)}% of income`;
        note(d, G, `${eff}. ${u.note}`, x + 68, y + 25, 10, textW, "#51477e");
        priceTag(d, G, money(u.cost), x + w - tw / 2 - 8, y + h / 2, tw, on);
    });
}
function ideaCards(G) {
    const { S } = G, next = E.nextConcept(S);
    return CONCEPTS.map((c) => (d, x, y, w, h, top, vh) => {
        const done = !!S.concepts[c.id], live = c === next, ready = live && S.earnedAct >= c.at, id = `idea${c.id}`;
        cardBase(d, G, id, x, y, w, h, done || live, ready ? () => G.list() : null, top, vh);
        if (!done && !live) { d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#352a72", radius: 8 }); T(d, "NOT YET THINKABLE", x + w / 2, y + h / 2, 11, { color: C.steel }); return; }
        T(d, done ? c.name.replace("7", "_") : c.name, x + 20, y + 15, 12, { align: -1, color: C.ink, maxW: w - 124 });
        note(d, G, c.effect, x + 20, y + 25, 10.5, w - 130, "#51477e");
        if (done) { T(d, "SOLD", x + w - 56, y + h / 2, 18, { color: C.coral, rot: -0.2 }); return; }
        if (ready) priceTag(d, G, "LIST IT", x + w - 56, y + h / 2, 92, true);
        else { priceTag(d, G, money(c.at), x + w - 56, y + h / 2 - 6, 96, false); T(d, "EARNED, TO LIST", x + w - 56, y + h - 10, 7.5, { color: "#51477e" }); }
    });
}

// --- Modals -----------------------------------------------------------------------------------------
function sheet(d, G, w, h) {
    const v = G.game.view, a = Math.min(1, G.modalAge * 7), k = 0.92 + 0.08 * Math.min(1, G.modalAge * 7);
    d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#0d0a2a", opacity: 0.72 * a });
    hit(G, "backdrop", 0, 0, v.width, v.height, () => {}, 5);
    const x = v.width / 2, y = v.height / 2;
    d.push(); d.translate(x, y); d.scale(k, k); d.rect(w + 8, h + 8, { x: 2, y: 4, color: C.ink, radius: 12 }); d.rect(w, h, { color: paper(G), radius: 9 }); d.pop();
    return { x: x - w / 2, y: y - h / 2, cx: x, cy: y };
}
const hms = (s) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${Math.floor(s) % 60}s` : `${Math.floor(s)}s`; };
export function drawModal(d, G) {
    const v = G.game.view, m = G.modal, { S } = G; if (!m) return;
    const W = Math.min(v.width - 24, 372), H = Math.min(v.height - 24, 560);
    const L = (id, ...a) => btn(d, G, id, ...a.slice(0, 6), { layer: 6, ...(a[6] ?? {}) });
    if (m === "away") {
        const r = G.awayInfo, B = sheet(d, G, W, 250);
        T(d, "WHILE YOU WERE OUT", B.cx, B.y + 34, 18, { color: C.coral, maxW: W - 40 });
        note(d, G, `Gone for ${hms(r.secs)}. The crew kept the table open and only broke two lamps.`, B.cx, B.y + 76, 13, W - 50, C.ink, { center: true, middle: true });
        T(d, `+${money(r.pay)}`, B.cx, B.y + 130, 26, { color: C.teal, maxW: W - 40 });
        note(d, G, `${E.has(S, "lunch") ? "Full pay" : "They work at half speed without you"}, up to ${E.has(S, "lunch") ? 24 : 8} hours.`, B.cx, B.y + 160, 11, W - 50, "#51477e", { center: true, middle: true });
        L("awayok", "BACK TO THE TABLE", B.cx, B.y + 204, W - 70, 46, () => G.close(), { color: C.teal, size: 15 });
    }
    if (m === "rule") {
        const A0 = E.act(S), B = sheet(d, G, W, 280);
        T(d, "NEW RULE", B.cx, B.y + 30, 13, { color: C.steelD }); T(d, A0.ruleName, B.cx, B.y + 62, 24, { color: C.coral, maxW: W - 40 });
        note(d, G, A0.ruleText, B.cx, B.y + 136, 14, W - 56, C.ink, { center: true, middle: true });
        L("ruleok", "OPEN THE SALE", B.cx, B.y + 232, W - 70, 46, () => G.close(), { color: C.teal, size: 16 });
    }
    if (m === "move") {
        const A0 = E.act(S), H2 = Math.min(v.height - 20, 470), B = sheet(d, G, W, H2), offer = E.bylawOffer(S), nx = ACTS[S.act + 1];
        T(d, "MOVING DAY", B.cx, B.y + 32, 24, { color: C.coral, maxW: W - 40 });
        note(d, G, `You've outgrown ${A0.place}. Everything resets, and everything gets bigger. ${nx.name} plays by a new rule: ${nx.ruleName}.`, B.cx, B.y + 82, 12.5, W - 44, C.ink, { center: true, middle: true });
        T(d, "PICK A BYLAW TO KEEP FOREVER", B.cx, B.y + 128, 11, { color: "#51477e", maxW: W - 40 });
        const ch = Math.min(84, (H2 - 214) / 3);
        offer.forEach((id, i) => {
            const b = BYLAWS.find((x) => x.id === id), y = B.y + 148 + i * (ch + 6), key = `by${id}`, k = G.armed === key ? 0.97 : 1;
            d.push(); d.translate(B.cx, y + ch / 2); d.scale(k, k); d.rect(W - 28, ch, { color: C.ink, radius: 9 }); d.rect(W - 34, ch - 6, { color: i === 0 ? "#ffe3a1" : i === 1 ? "#c9f2e6" : "#ffd6d0", radius: 7 });
            T(d, b.name, 0, -ch / 2 + 20, 13, { color: C.ink, maxW: W - 60 }); d.text(b.note, { y: 9, size: 12.5, font: FONT, bold: true, align: "center", maxWidth: W - 56, color: "#3b3166", lineHeight: 1.2 }); d.pop();
            hit(G, key, B.cx - (W - 28) / 2, y, W - 28, ch, () => G.moveWith(id), 6);
        });
        L("movecancel", "NOT YET", B.cx, B.y + H2 - 30, 130, 36, () => G.close(), { color: C.steelD, size: 12 });
    }
    if (m === "concept") {
        const c = G.conceptShown, B = sheet(d, G, W, 300), age = G.modalAge;
        T(d, "SOLD", B.cx, B.y + 54, 44 * (1 + Math.max(0, 0.3 - age) * 3), { color: sticker(G), rot: -0.08 });
        T(d, c.name, B.cx, B.y + 106, 18, { color: C.ink, maxW: W - 40 });
        note(d, G, c.sold, B.cx, B.y + 170, 14, W - 56, C.ink, { center: true, middle: true });
        L("conceptok", c.id === "money" ? "WHO WAS THAT?" : "KEEP SELLING", B.cx, B.y + 256, W - 90, 44, () => G.close(), { color: C.teal, size: 15 });
    }
    if (m === "settings") {
        const B = sheet(d, G, W, Math.min(v.height - 24, 500)), rows = [["SOUND", !G.opts.mute, () => G.setOpt("mute", !G.opts.mute)], ["HAPTICS", !G.opts.noHaptic, () => G.setOpt("noHaptic", !G.opts.noHaptic)], ["PLAIN NUMBERS 1.2e45", !!G.opts.science, () => G.setOpt("science", !G.opts.science)]];
        T(d, "THE BACK ROOM", B.cx, B.y + 30, 20, { color: C.coral });
        rows.forEach(([label, on, fn], i) => {
            const y = B.y + 70 + i * 46; T(d, label, B.x + 24, y, 12, { align: -1, color: C.ink, maxW: W - 110 });
            L(`opt${i}`, on ? "ON" : "OFF", B.x + W - 54, y, 66, 34, fn, { color: on ? C.teal : C.steelD, size: 12 });
        });
        let y = B.y + 210;
        T(d, "YOUR BYLAWS", B.cx, y, 11, { color: "#51477e" }); y += 12;
        if (!S.bylaws.length) { note(d, G, "None yet. You pick one each Moving Day.", B.cx, y + 10, 11.5, W - 40, "#51477e", { center: true, middle: true }); y += 24; }
        for (const id of S.bylaws) { const b = BYLAWS.find((x) => x.id === id); y += note(d, G, `${b.name}: ${b.note}`, B.x + 22, y + 2, 11, W - 44, C.ink) + 3; }
        const by = B.y + Math.min(v.height - 24, 500) - 76;
        T(d, `SALE #${S.sale}  ·  ${hms(S.time)} AT THE TABLE  ·  ${S.stats.taps} TAPS`.replace(/·/g, "-"), B.cx, by - 26, 9, { color: "#51477e", maxW: W - 40 });
        L("wipe", G.wipeArmed ? "REALLY? IT ALL GOES" : "START OVER", B.x + 86, by + 18, 136, 40, () => G.wipe(), { color: G.wipeArmed ? C.red : C.steelD, size: 11 });
        L("setok", "CLOSE", B.x + W - 86, by + 18, 136, 40, () => G.close(), { color: C.teal, size: 14 });
    }
    if (m === "receipt") drawReceipt(d, G);
}
function drawReceipt(d, G) {
    const v = G.game.view, { S } = G, w = Math.min(v.width - 40, 320), lines = G.receiptLines, lh = 21, total = lines.length * lh + 240;
    d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#0d0a2a", opacity: 0.55 * Math.min(1, G.modalAge) });
    hit(G, "backdrop", 0, 0, v.width, v.height, () => {}, 5);
    const maxScroll = Math.max(0, total - v.height + 40);
    const auto = Math.min(maxScroll, Math.max(0, G.modalAge - 1.2) * 34);
    const off = G.receiptScroll = Math.max(G.receiptScroll ?? 0, auto);
    const printed = Math.min(1, G.modalAge * 0.6 + 0.1), x = v.width / 2, y0 = 20 - off + (1 - printed) * -total * 0.2;
    d.rect(w, total, { x, y: y0 + total / 2, color: "#ffffff" });
    for (let i = 0; i * 12 < w; i++) d.poly([[x - w / 2 + i * 12, y0 + total], [x - w / 2 + i * 12 + 12, y0 + total], [x - w / 2 + i * 12 + 6, y0 + total + 7]], { color: "#ffffff" });
    const left = x - w / 2 + 16, right = x + w / 2 - 16; let y = y0 + 32;
    T(d, "COSMIC YARD SALE", x, y, 17, { color: C.ink, maxW: w - 30 }); y += 22; T(d, "1 CARD TABLE, THE DRIVEWAY", x, y, 8.5, { color: C.steelD, maxW: w - 30 }); y += 16; T(d, "- - - - - - - - - - - - - - -", x, y, 8, { color: C.steelD }); y += 22;
    for (const [a, b] of lines) { if (y > -20 && y < v.height + 20) { T(d, a, left, y, 9.5, { align: -1, color: C.ink, maxW: w - 118 }); if (b) T(d, b, right, y, 9.5, { align: 1, color: C.ink, maxW: 84 }); } y += lh; }
    y += 8; T(d, "- - - - - - - - - - - - - - -", x, y, 8, { color: C.steelD }); y += 24;
    T(d, "TOTAL", left, y, 16, { align: -1, color: C.ink }); T(d, "$0.50", right, y, 16, { align: 1, color: C.ink }); y += 26;
    T(d, "ALL SALES FINAL", x, y, 9.5, { color: C.steelD }); y += 16; T(d, "THANK YOU, COME AGAIN", x, y, 10, { color: C.ink }); y += 40;
    const by = y + 8;
    btn(d, G, "reopen", "REOPEN THE SALE", x, by, w - 40, 46, () => G.reopen(), { color: C.teal, size: 14, layer: 6, sub: `SALE #${S.sale + 1}: EVERYTHING SELLS ${S.sale + 1}× FASTER` });
}
