// Everything between fights: the tower map, spoils, shop, campfire, events and the end of a run.
// Phone first: each screen asks one question. Cards appear small with a short label, and the full text is a tap away.
import { CARDS, cardText } from "../data/cards.js";
import { TRINKETS } from "../data/trinkets.js";
import { ACT_NAMES, ENEMIES } from "../data/enemies.js";
import { ELEMENTS, WITCHES } from "../data/rules.js";
import * as S from "../sim.js";
import { bankRun, nextUnlock, recipeName } from "../meta.js";
import { motifArt, trinketArt, warm } from "../art/index.js";
import { ASPECT, drawCard } from "./cardview.js";
import { BAR_H, COLORS, FONT, Fx, G, clamp, clearRun, drawRich, fit, fmt, hudEntity, hurryKeys, label, lerp, measure, minText, richLayout, rnd, route, saveMeta, saveRun, song, spellBtn, ui } from "./core.js";
import { deckView, installOverlays, settings, tip, trinketTip, zoom } from "./overlay.js";

const NODE = { fight: ["A fight", "Win a new card."], elite: ["An elite", "Dangerous, but it drops a trinket."], rest: ["A campfire", "Heal, or improve a card."], shop: ["A shop", "Spend your gold."], event: ["Something odd", "Could go either way."], treasure: ["Treasure", "A free trinket."] };
const safe = () => G.game.view.safe;
function background(s, act, dim = 0.5) {
    s.onDraw((d) => {
        const W = s.view.width, H = s.view.height, k = Math.max(W / 300, H / 420) * 1.03;
        d.sprite(`bg_${act}`, { x: W / 2, y: H / 2, width: 300 * k, height: 420 * k });
        d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: dim });
    });
}
function topBar(s, run) {
    hudEntity(s, () => run);
    const deck = s.add([ui(), spellBtn("Deck", { width: 60, height: 44, size: 13, color: "#4a2a7a", onTap: () => deckView("Your deck", run.deck), radius: 12 })]);
    const gear = s.add([ui(), spellBtn("≡", { width: 44, height: 44, size: 19, color: "#4a2a7a", onTap: settings, radius: 12 })]);
    const place = () => { const W = s.view.width, sr = safe().right, top = safe().top; deck.pos.set(W - 80 - sr, top + 23); gear.pos.set(W - 26 - sr, top + 23); };
    place();
    s.onUpdate(() => {
        place();
        for (const k of hurryKeys()) { if (k === "Escape") settings(); if (k === "KeyD") deckView("Your deck", run.deck); }
    });
}
const heading = (d, s, title, sub, y) => {
    const W = s.view.width - 24;
    label(d, title, s.view.width / 2, y, W, 32, { size: 23, bold: true, color: COLORS.gold });
    if (sub) label(d, sub, s.view.width / 2, y + 26, W, 20, { size: 14, color: COLORS.dim });
};
/** Rows of offers: a small card beside its full text. Tap to take, hold to read. Works in both orientations. */
function offers(s, items, onTap, areaTop, areaBottom) {
    const st = { press: null };
    const layout = () => {
        const W = s.view.width, H = s.view.height, land = W > H, top = areaTop(), bottom = areaBottom(), n = items.length, sl = safe().left, sr = safe().right;
        if (land) { const cw = (W - sl - sr - 16) / Math.max(1, n), rh = Math.min(bottom - top, 140); items.forEach((it, i) => { it.bx = sl + 8 + cw * (i + 0.5); it.by = top + rh / 2; it.bw = cw - 8; it.bh = rh; }); }
        else { const rh = Math.min((bottom - top) / Math.max(1, n), 128), start = top + (bottom - top - rh * n) / 2; items.forEach((it, i) => { it.bx = W / 2; it.by = start + rh * (i + 0.5); it.bw = W - 20; it.bh = rh - 8; }); }
    };
    s.onUpdate((dt) => {
        layout();
        if (G.overlay) { st.press = null; return; }
        const p = s.input.pointer, hit = (it) => Math.abs(p.x - it.bx) < it.bw / 2 && Math.abs(p.y - it.by) < it.bh / 2;
        for (const it of items) { const hot = hit(it) && (p.down || !s.input.touchMode); if (hot && !it.hot) G.snd.notch(items.indexOf(it)); it.hot = hot; }
        if (p.pressed) { const it = items.find(hit); st.press = it ? { it, t: 0, x: p.x, y: p.y } : null; }
        if (st.press) {
            st.press.t += dt;
            if (p.down && st.press.t > 0.42 && Math.hypot(p.x - st.press.x, p.y - st.press.y) < 12) { const c = st.press.it.card; st.press = null; if (c) zoom(c); return; }
            if (p.released) { const q = st.press; st.press = null; if (Math.hypot(p.x - q.x, p.y - q.y) < 14) onTap(q.it); }
        }
    });
    layout();
    return (d) => {
        for (const it of items) {
            d.rect(it.bw, it.bh, { x: it.bx, y: it.by, color: it.hot ? "#3a2a5e" : "#21143a", radius: 12 });
            d.rect(it.bw, it.bh, { x: it.bx, y: it.by, color: "#e7b75e", radius: 12, outline: 1.2, opacity: 0.7 });
            const h = it.bh - 10, cw = Math.min(h / ASPECT, 84), x0 = it.bx - it.bw / 2 + 6, tw = it.bw - cw - 22, tx = x0 + cw + 8 + tw / 2;
            if (it.card) {
                const def = CARDS[it.card.id], name = def.name + (it.card.up ? "+" : "");
                drawCard(d, it.card, { x: x0 + cw / 2, y: it.by, w: cw, compact: true, foil: it.hot ? 0.3 : 0 });
                label(d, name, tx, it.by - h / 2 + 12, tw, 22, { size: 16, bold: true, color: it.card.up ? "#d9ffb0" : "#fff6dc" });
                const text = cardText(def, it.card.up), room = h - 28;
                let L = null;
                for (let z = 15; z >= minText(); z -= 0.5) { L = richLayout(text, z, tw, "l"); if (L.lines.length * L.lh <= room) break; }
                drawRich(d, L, tx, it.by + 12, { dark: false });
            }
        }
    };
}

export function screens(game) {
    // ---- Map ----
    game.scene("map", (s, args) => {
        if (args?.demo && !G.run) G.demoRun({ ...args, map: true });
        const run = G.run;
        if (!run) { game.go("title"); return; }
        const fx = new Fx(), ROWS = S.ROWS, sp = 70, opts = S.reachable(run), act = run.act, V = { scroll: 0, target: 0, press: null, t: 0 };
        song("map");
        warm(run.deck.map((k) => k.id));
        const start = run.pos ? run.pos.r : -1, H0 = () => s.view.height, firstMap = run.tutorial && !G.meta.seen.map;
        if (firstMap) { G.meta.seen.map = 1; saveMeta(); }
        const pos = (n) => {
            const W = s.view.width, H = H0(), colW = Math.min((W - 92) / 4, W > H ? 130 : 78), j = ((n.c * 7 + n.r * 13) % 5 - 2) * 3;
            return { x: W / 2 + (n.c - 2) * colW + j, y: H - 76 - n.r * sp + V.scroll + ((n.c * 3 + n.r) % 3 - 1) * 5 };
        };
        const bossPos = () => ({ x: s.view.width / 2, y: H0() - 76 - ROWS * sp + V.scroll - 22 });
        const maxS = () => Math.max(0, (ROWS + 1) * sp + 200 - H0() + safe().top);
        V.scroll = V.target = clamp((start + 0.5) * sp - 40, 0, maxS());
        s.onUpdate((dt) => {
            V.t += dt; fx.update(dt);
            V.scroll += (V.target - V.scroll) * Math.min(1, dt * 10);
            if (G.overlay) return;
            const p = s.input.pointer;
            if (s.input.wheel) V.target = clamp(V.target + s.input.wheel * 0.4, 0, maxS());
            if (p.pressed) V.press = { y: p.y, x: p.x, s: V.target, m: 0 };
            if (p.down && V.press) { V.target = clamp(V.press.s + (p.y - V.press.y), 0, maxS()); V.press.m = Math.max(V.press.m, Math.abs(p.y - V.press.y)); V.scroll = V.target; }
            if (p.released && V.press) {
                const m = V.press.m; V.press = null;
                if (m < 14 && p.y > safe().top + BAR_H + 30) {
                    const hit = opts.find((n) => { const q = n.boss ? bossPos() : pos(n); return Math.hypot(p.x - q.x, p.y - q.y) < (n.boss ? 46 : 32); });
                    if (hit) go(hit);
                    else { const any = run.map.nodes.find((n) => { const q = pos(n); return Math.hypot(p.x - q.x, p.y - q.y) < 26; }); if (any) tip(NODE[any.type][0], NODE[any.type][1]); }
                }
            }
        });
        let leaving = false;
        function go(n) {
            if (leaving) return;
            leaving = true;
            G.snd.step();
            const q = n.boss ? bossPos() : pos(n);
            fx.burst(q.x, q.y, ["#ffe066", "#fff"], 18);
            game.haptic("medium");
            s.wait(0.18, () => { S.chooseNode(run, n); route(); });
        }
        game.data.mapNodes = { opts, pos, go };
        s.onDraw((d) => {
            const W = s.view.width, H = H0(), k = Math.max(W / 300, (H + 200) / 420) * 1.03;
            d.sprite(`bg_${act}`, { x: W / 2, y: H / 2 + (V.scroll / (maxS() || 1)) * 80 - 40, width: 300 * k, height: 420 * k });
            d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: 0.55 });
            const wallW = 40, tile = 100;
            for (let y = (V.scroll % tile) - tile; y < H + tile; y += tile) for (const x of [wallW / 2 - 8, W - wallW / 2 + 8]) d.sprite("wall", { x, y: y + tile / 2, width: wallW, height: tile, opacity: 0.85 });
            const nodes = run.map.nodes, at = {};
            for (const n of nodes) at[`${n.r},${n.c}`] = n;
            for (const n of nodes) {
                const a = pos(n), targets = n.r === ROWS - 1 ? [bossPos()] : n.next.map((c) => pos(at[`${n.r + 1},${c}`]));
                for (const b of targets) for (let i = 1; i < 7; i++) { const t = i / 7; d.circle(2, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), color: "#e7d8b8", opacity: 0.42 }); }
            }
            for (const n of nodes) {
                const q = pos(n), live = opts.some((o) => o.r === n.r && o.c === n.c), done = run.pos && (n.r < run.pos.r || (n.r === run.pos.r && n.c === run.pos.c)), sz = live ? 50 + Math.sin(V.t * 5 + n.c) * 4 : 42;
                if (q.y < -40 || q.y > H + 40) continue;
                if (live) d.additive(() => d.sprite("glow", { x: q.x, y: q.y, width: 104, height: 104, color: "#ffe066", opacity: 0.55 }));
                d.sprite(`node_${n.type}`, { x: q.x, y: q.y, width: sz, height: sz, opacity: done ? 0.42 : 1 });
                if (run.pos && n.r === run.pos.r && n.c === run.pos.c) d.sprite(`witch_${run.witch}`, { x: q.x, y: q.y - 18, width: 44, height: 56 });
            }
            const b = bossPos(), live = opts.some((o) => o.boss);
            if (live) d.additive(() => d.sprite("glow", { x: b.x, y: b.y, width: 190, height: 190, color: "#ff5a2a", opacity: 0.5 + Math.sin(V.t * 4) * 0.2 }));
            d.sprite(`foe_${run.map.boss}`, { x: b.x, y: b.y, width: 104, height: 104 });
            fx.draw(d);
        });
        topBar(s, run);
        s.onDrawUI((d) => {
            const W = s.view.width, H = H0(), top = safe().top, y = top + BAR_H + 16;
            d.rect(W + 4, 30, { x: W / 2, y, color: "#120822" });
            label(d, `${ACT_NAMES[act]}${run.asc ? `, Rank ${run.asc}` : ""}`, W / 2, y, W - 20, 26, { size: 16, bold: true, color: COLORS.gold });
            if (firstMap || !run.pos) {
                const yy = H - safe().bottom - 22;
                d.rect(W + 4, 40, { x: W / 2, y: yy, color: "#120822" });
                label(d, "Tap a glowing door to climb", W / 2, yy, W - 24, 34, { size: 15, bold: true, color: "#ffe066" });
            }
        });
        installOverlays(s);
    });

    // ---- Spoils ----
    game.scene("reward", (s) => {
        const run = G.run, r = run?.reward;
        if (!r) { game.go("map"); return; }
        const fx = new Fx(), items = [], first = !!run.prologue;
        song("calm");
        background(s, run.act, 0.72);
        topBar(s, run);
        const sync = () => { items.length = 0; if (r.cards) r.cards.forEach((c, i) => items.push({ card: { ...c }, i })); };
        sync();
        const again = s.add([ui(), spellBtn("Skip", { width: 170, height: 48, action: "confirm", onTap: () => { S.leaveReward(run); route(); } })]);
        const headTop = () => safe().top + BAR_H + 22;
        const drawOffers = offers(s, items, (it) => {
            G.snd.pick(); game.haptic("medium");
            fx.burst(it.bx, it.by, [ELEMENTS[CARDS[it.card.id].el].color, "#ffe066"], 24, { sp: 200 });
            S.takeRewardCard(run, it.i); saveRun(); sync();
        }, () => headTop() + 44, () => s.view.height - safe().bottom - 62);
        if (r.gold) { S.takeRewardGold(run); saveRun(); s.wait(0.25, () => G.snd.coin()); }
        s.wait(0.4, () => { if (r.trinket) { const id = r.trinket; S.takeRewardTrinket(run); saveRun(); G.snd.unlock(); trinketTip(id); } });
        s.onUpdate((dt) => { fx.update(dt); again.pos.set(s.view.width / 2, s.view.height - 32 - safe().bottom); again.txt = r.cards ? "Skip" : "Onward"; });
        s.onDrawUI((d) => {
            heading(d, s, r.cards ? "Pick a new card" : "Added to your deck", r.cards ? (first ? "It joins your deck. Hold a card to read it." : "Tap to take one") : null, headTop());
            drawOffers(d);
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Treasure ----
    game.scene("treasure", (s) => {
        const run = G.run, r = run?.reward;
        if (!r) { game.go("map"); return; }
        const V = { open: 0 }, fx = new Fx();
        background(s, run.act, 0.7); song("calm"); topBar(s, run);
        const b = s.add([ui(), spellBtn("Open it", { width: 170, action: "confirm", onTap: () => {
            if (!V.open) {
                V.open = 0.01; G.snd.unlock(); game.haptic("success"); V.got = r.trinket; V.gold = r.gold;
                S.takeRewardGold(run); S.takeRewardTrinket(run); run.reward = null; run.screen = "map"; saveRun();
                fx.burst(s.view.width / 2, s.view.height * 0.4, ["#ffe066", "#fff", "#b45cff"], 50, { sp: 300 }); b.txt = "Onward"; return;
            }
            route();
        } })]);
        s.onUpdate((dt) => { fx.update(dt); if (V.open) V.open = Math.min(1, V.open + dt * 3); b.pos.set(s.view.width / 2, s.view.height - 40 - safe().bottom); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = safe().top + BAR_H, area = H - top - safe().bottom - 76, art = Math.min(area * 0.5, 128), cy = top + 44 + art / 2;
            heading(d, s, V.got ? TRINKETS[V.got]?.name ?? "Empty" : "A locked box", null, top + 24);
            d.additive(() => d.sprite("glow", { x: W / 2, y: cy, width: 300, height: 260, color: "#ffe066", opacity: 0.2 + V.open * 0.4 }));
            if (V.got) d.sprite(trinketArt(V.got), { x: W / 2, y: cy, width: art * V.open, height: art * V.open });
            else d.sprite(motifArt("key"), { x: W / 2, y: cy, width: art * 4 / 3, height: art });
            if (V.got) { label(d, TRINKETS[V.got].text, W / 2, cy + art / 2 + 34, W - 40, 60, { size: 15, color: COLORS.cream }); label(d, `+${V.gold} gold`, W / 2, cy + art / 2 + 76, W - 40, 22, { size: 15, bold: true, color: COLORS.gold }); }
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Boss trinket ----
    game.scene("bossTrinket", (s) => {
        const run = G.run;
        if (!run?.bossPick) { game.go("map"); return; }
        background(s, run.act, 0.72); song("victory");
        const list = run.bossPick, take = (i) => { G.snd.unlock(); S.pickBossTrinket(run, i); route(); };
        const skip = s.add([ui(), spellBtn("Take nothing", { width: 170, height: 44, size: 15, color: "#3a2a5a", onTap: () => take(null) })]);
        const boxes = [];
        s.onUpdate(() => {
            skip.pos.set(s.view.width / 2, s.view.height - 28 - safe().bottom);
            if (G.overlay) return;
            const p = s.input.pointer;
            if (p.pressed) { const b = boxes.find((q) => Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.y - q.y) < q.h / 2); if (b) take(b.i); }
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = safe().top + 26, land = W > H, a0 = top + 54, a1 = H - safe().bottom - 56, n = list.length;
            heading(d, s, "The Boss's Hoard", "Take one. Power has a price.", top);
            boxes.length = 0;
            list.forEach((id, i) => {
                const t = TRINKETS[id], bw = land ? (W - 40) / n - 6 : W - 20, bh = land ? a1 - a0 : (a1 - a0) / n - 8, x = land ? 20 + (bw + 6) * (i + 0.5) : W / 2, y = land ? (a0 + a1) / 2 : a0 + (bh + 8) * (i + 0.5);
                d.rect(bw, bh, { x, y, color: "#21143a", radius: 12 }); d.rect(bw, bh, { x, y, color: "#e7b75e", radius: 12, outline: 1.2, opacity: 0.7 });
                const ic = Math.min(64, land ? bh * 0.4 : bh - 12);
                if (land) { d.sprite(trinketArt(id), { x, y: y - bh / 2 + ic / 2 + 6, width: ic, height: ic }); label(d, t.name, x, y - bh / 2 + ic + 20, bw - 12, 24, { size: 16, bold: true, color: "#fff6dc" }); label(d, t.text, x, y + (ic + 34) / 2, bw - 12, bh - ic - 44, { size: 14 }); }
                else { d.sprite(trinketArt(id), { x: x - bw / 2 + ic / 2 + 8, y, width: ic, height: ic }); const tw = bw - ic - 26, tx = x - bw / 2 + ic + 16 + tw / 2; label(d, t.name, tx, y - bh / 2 + 16, tw, 24, { size: 16, bold: true, color: "#fff6dc" }); label(d, t.text, tx, y + 13, tw, bh - 38, { size: 14 }); }
                boxes.push({ x, y, w: bw, h: bh, i });
            });
        });
        installOverlays(s);
    });

    // ---- Shop: a shelf of small cards, tap one to look and buy ----
    game.scene("shop", (s) => {
        const run = G.run, sh = run?.shop;
        if (!sh) { game.go("map"); return; }
        song("shop"); background(s, run.act, 0.72); topBar(s, run);
        const fx = new Fx(), boxes = [];
        const leave = s.add([ui(), spellBtn("Leave", { width: 130, height: 44, size: 16, action: "confirm", color: "#4a2a7a", onTap: () => { S.leaveShop(run); route(); } })]);
        const buyCard = (i, b) => { if (S.buyCard(run, i)) { G.snd.coin(); game.haptic("medium"); fx.burst(b.x, b.y, ["#ffe066"], 18); saveRun(); } };
        s.onUpdate((dt) => {
            fx.update(dt);
            leave.pos.set(s.view.width / 2, s.view.height - 28 - safe().bottom);
            if (G.overlay) return;
            const p = s.input.pointer;
            if (!p.pressed) return;
            const b = boxes.find((q) => Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.y - q.y) < q.h / 2);
            if (!b) return;
            if (b.kind === "card") { const c = sh.cards[b.i]; if (!c.sold) zoom({ id: c.id, up: c.up }, { action: run.gold >= c.price ? { label: `Buy for ${c.price}`, fn: () => buyCard(b.i, b) } : undefined }); }
            if (b.kind === "tr") {
                const t = sh.trinkets[b.i]; if (t.sold) return;
                const can = run.gold >= t.price;
                tip(TRINKETS[t.id].name, TRINKETS[t.id].text, { sprite: trinketArt(t.id), sub: `${t.price} gold`, extra: can ? undefined : "You can't afford it yet", action: can ? { label: `Buy for ${t.price}`, fn: () => { S.buyTrinket(run, b.i); G.snd.coin(); saveRun(); game.haptic("success"); fx.burst(b.x, b.y, ["#ffe066"], 18); } } : undefined });
            }
            if (b.kind === "burn") {
                if (sh.removed) return;
                if (run.gold < sh.removePrice) { G.snd.deny(); return; }
                deckView("Burn a card", run.deck, { sub: `${sh.removePrice} gold. Tap a card.`, pickLabel: "Burn it", onPick: (k) => { S.buyRemove(run, k.u); G.snd.coin(); saveRun(); } });
            }
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, land = W > H, top = safe().top + BAR_H + 4, bottom = H - safe().bottom - 54, sl = safe().left, sr = safe().right, uw = W - sl - sr;
            label(d, "Mister Ledger's", W / 2, top + 14, W - 30, 26, { size: 19, bold: true, color: COLORS.gold });
            const y0 = top + 32, cols = land ? 5 : 3, cw = Math.min((uw * (land ? 0.66 : 1) - 8) / cols - 6, (land ? bottom - y0 - 24 : (bottom - y0 - 70) / 2 - 24) / ASPECT, 104), ch = cw * ASPECT, rowH = ch + 24;
            boxes.length = 0;
            const price = (x, y, v, ok) => { const t = `${v}`; d.sprite("glyph_gilt", { x: x - 16, y, width: 15, height: 15 }); d.text(t, { x: x + 6, y, size: 14, bold: true, font: FONT, color: ok ? COLORS.gold : "#ff8a7a" }); };
            sh.cards.forEach((c, i) => {
                const col = land ? i : i % 3, row = land ? 0 : Math.floor(i / 3), x = (land ? sl + 6 : W / 2 - (cols - 1) / 2 * (cw + 6)) + (land ? cw / 2 : 0) + col * (cw + 6), y = y0 + ch / 2 + row * rowH;
                boxes.push({ kind: "card", i, x, y: y + 10, w: cw + 4, h: rowH });
                if (c.sold) { label(d, "Sold", x, y, cw, 24, { size: 14, color: COLORS.dim }); return; }
                drawCard(d, c, { x, y, w: cw, compact: true, foil: 0 });
                price(x, y + ch / 2 + 11, c.price, run.gold >= c.price);
            });
            // Last cell in portrait, right column in landscape: burn a card.
            const bx = land ? W - sr - uw * 0.16 : W / 2 + (cols - 1) / 2 * (cw + 6) * 0 + (cw + 6) / 2, by = land ? y0 + ch * 0.82 + 30 : y0 + ch / 2 + rowH, bw = land ? Math.min(uw * 0.28, 150) : cw * 2 + 6 - (cw + 6) + cw + 6, bh = land ? 54 : ch;
            if (!sh.removed) {
                const bxx = land ? bx : W / 2 + (cw + 6) / 2;
                d.rect(bw, bh, { x: bxx, y: by, color: "#3a1a2a", radius: 12 }); d.rect(bw, bh, { x: bxx, y: by, color: "#ff9a6a", radius: 12, outline: 1.5 });
                label(d, "Burn a card", bxx, by - 12, bw - 12, 22, { size: 14, bold: true, color: "#ffd0b0" });
                label(d, `${sh.removePrice} gold`, bxx, by + 12, bw - 12, 20, { size: 14, bold: true, color: run.gold >= sh.removePrice ? COLORS.gold : "#ff8a7a" });
                boxes.push({ kind: "burn", x: bxx, y: by, w: bw, h: bh });
            }
            const ty = land ? y0 + 30 : Math.min(y0 + 2 * rowH + 28, bottom - 30), n = sh.trinkets.length, tx0 = land ? W - sr - uw * 0.16 : W / 2, tsp = land ? Math.min(58, uw * 0.1) : 76;
            sh.trinkets.forEach((t, i) => {
                if (t.sold) return;
                const x = tx0 + (i - (n - 1) / 2) * tsp;
                d.circle(24, { x, y: ty, color: "#2a1b42" }); d.circle(24, { x, y: ty, color: "#e7b75e", outline: 1.5 });
                d.sprite(trinketArt(t.id), { x, y: ty, width: 42, height: 42 });
                d.text(`${t.price}`, { x, y: ty + 33, size: 13, bold: true, font: FONT, color: run.gold >= t.price ? COLORS.gold : "#ff8a7a" });
                boxes.push({ kind: "tr", i, x, y: ty + 6, w: 56, h: 66 });
            });
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Campfire ----
    game.scene("rest", (s) => {
        const run = G.run;
        if (!run) { game.go("title"); return; }
        song("calm"); background(s, run.act, 0.6); topBar(s, run);
        const fx = new Fx(), heal = S.restHeal(run), can = S.canRest(run), ups = S.upgradable(run);
        const a = s.add([ui(), spellBtn(`Rest: heal ${heal}`, { width: 230, height: 50, color: "#c0601e", action: "confirm", onTap: () => { S.rest(run); G.snd.heal(); game.haptic("success"); route(); } })]);
        const b = s.add([ui(), spellBtn("Improve a card", { width: 230, height: 50, color: "#7a3ad0", onTap: () => {
            if (!ups.length) { tip("Nothing left", "Every card you own is already as good as it gets."); return; }
            deckView("Improve one card", ups.map((k) => ({ ...k, up: 1, real: k.u })), { sub: "Shown after improving", pickLabel: "Improve it", onPick: (k) => { S.refine(run, k.real); G.snd.unlock(); route(); } });
        } })]);
        const c = s.add([ui(), spellBtn("Move on", { width: 130, height: 44, size: 14, color: "#3a2a5a", onTap: () => { run.screen = "map"; route(); } })]);
        a.disabled = !can;
        s.onUpdate((dt) => {
            fx.update(dt); const W = s.view.width, H = s.view.height, bot = H - safe().bottom;
            if (H > W) { c.pos.set(W / 2, bot - 28); b.pos.set(W / 2, bot - 84); a.pos.set(W / 2, bot - 142); }
            else { a.pos.set(W / 2 - 122, bot - 84); b.pos.set(W / 2 + 122, bot - 84); c.pos.set(W / 2, bot - 28); }
            if (rnd() < dt * 34) fx.spark(W / 2 + (rnd() - 0.5) * 60, H * 0.42, rnd() < 0.5 ? "#ff7a2f" : "#ffd25a", { a: -1.57 + (rnd() - 0.5) * 0.4, sp: 60 + rnd() * 60, g: -30, s: 6, life: 0.8 });
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = safe().top + BAR_H, cy = top + (H - top - 170) * 0.55 + 16, fl = 1 + Math.sin(s.time * 11) * 0.05 + Math.sin(s.time * 17) * 0.04;
            heading(d, s, "A campfire on the stairs", null, top + 24);
            d.additive(() => d.sprite("glow", { x: W / 2, y: cy, width: 320, height: 300, color: "#ff9a4a", opacity: 0.4 }));
            d.sprite("logs", { x: W / 2, y: cy + 36, width: 150, height: 75 });
            d.sprite(`witch_${run.witch}`, { x: W / 2 - 104, y: cy, width: 92, height: 117 });
            d.sprite("heatgem", { x: W / 2, y: cy + 8 - 34 * fl, width: 110 * (2 - fl), height: 114 * fl });
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Event: one picture, one small story, a choice ----
    game.scene("event", (s) => {
        const run = G.run, ev = S.eventDef(run);
        if (!ev) { game.go("map"); return; }
        song("map"); background(s, run.act, 0.76); topBar(s, run);
        const btns = [];
        const build = () => {
            btns.forEach((b) => b.destroy()); btns.length = 0;
            if (run.event?.result == null) ev.choices.forEach((c, i) => {
                const b = s.add([ui(), spellBtn(c.label, { width: 300, height: 58, size: 15, noteSize: 13, note: c.note, color: "#5a2f9a", onTap: () => { if (c.can && !c.can(run)) { G.snd.deny(); return; } S.chooseEvent(run, i); saveRun(); G.snd.page(); game.haptic("light"); build(); } })]);
                b.disabled = c.can ? !c.can(run) : false; btns.push(b);
            });
            else btns.push(s.add([ui(), spellBtn("Carry on", { width: 180, height: 50, action: "confirm", onTap: () => { S.leaveEvent(run); route(); } })]));
            place();
        };
        const place = () => {
            const W = s.view.width, H = s.view.height, land = W > H, n = btns.length, rh = 66, top = safe().top + BAR_H, bot = H - safe().bottom;
            const bx = land ? W * 0.7 : W / 2, y0 = land ? (top + bot) / 2 - (n - 1) * rh / 2 : bot - n * rh + rh / 2 - 4;
            btns.forEach((b, i) => { if (run.event?.result == null) b.size.x = land ? Math.min(W * 0.54, 330) - 16 : Math.min(W - 24, 340); b.pos.set(bx, y0 + i * rh); });
        };
        build();
        s.onUpdate(place);
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, land = W > H, top = safe().top + BAR_H + 6, bot = H - safe().bottom, n = btns.length;
            const bottom = land ? bot - 6 : bot - n * 66 - 10, tx = land ? safe().left + (W - safe().left) * 0.24 : W / 2, tw = land ? W * 0.42 : W - 32, room = bottom - top, art = Math.min(room * 0.34, land ? 96 : 120);
            d.sprite(motifArt(ev.art), { x: tx, y: top + art / 2, width: art * 4 / 3, height: art });
            label(d, ev.title, tx, top + art + 16, tw, 28, { size: 20, bold: true, color: COLORS.gold });
            const by = top + art + 32, bh = bottom - by;
            label(d, run.event?.result ?? ev.text, tx, by + bh / 2, tw, bh, { size: 15, color: COLORS.cream });
        });
        installOverlays(s);
    });

    // ---- Queued picks from events ----
    game.scene("pick", (s) => {
        const run = G.run, p = run?.queue?.[0];
        if (!p) { if (run) { run.screen = "map"; game.go("map"); } else game.go("title"); return; }
        background(s, run.act, 0.72); song("calm"); topBar(s, run);
        const done = () => { saveRun(); route(); };
        if (p.kind === "cards") {
            const items = p.cards.map((c, i) => ({ card: { ...c }, i }));
            const drawOffers = offers(s, items, (it) => { S.resolvePick(run, it.i); G.snd.pick(); done(); }, () => safe().top + BAR_H + 44, () => s.view.height - safe().bottom - 62);
            const skip = s.add([ui(), spellBtn("Skip", { width: 130, height: 44, onTap: () => { S.resolvePick(run, null); done(); } })]);
            s.onUpdate(() => skip.pos.set(s.view.width / 2, s.view.height - 30 - safe().bottom));
            s.onDrawUI((d) => { heading(d, s, "Take one", null, safe().top + BAR_H + 22); drawOffers(d); });
            installOverlays(s);
            return;
        }
        const list = p.kind === "remove" ? run.deck : S.upgradable(run).map((k) => ({ ...k, up: 1, real: k.u }));
        installOverlays(s);
        s.wait(0.05, () => deckView(p.kind === "remove" ? "Remove a card" : "Improve a card", list, { pickLabel: p.kind === "remove" ? "Remove it" : "Improve it", onClose: () => { S.resolvePick(run, null); done(); }, onPick: (k) => { S.resolvePick(run, k.real ?? k.u); G.snd.pick(); done(); } }));
    });

    // ---- End of run ----
    game.scene("end", (s) => {
        const run = G.run;
        if (!run) { game.go("title"); return; }
        song(run.won ? "victory" : "calm");
        const result = run.banked ?? (run.banked = bankRun(G.meta, run));
        saveMeta(); clearRun();
        const fx = new Fx(), meta = G.meta, won = run.won, st = run.stats, wid = run.witch;
        background(s, run.act, 0.74);
        const again = s.add([ui(), spellBtn("Climb again", { width: 200, height: 52, size: 19, color: "#c0401e", action: "confirm", onTap: () => game.go("witch", {}, { fade: 0.2 }) })]);
        s.wait(0.3, () => { if (won) { G.snd.win(); for (let i = 0; i < 4; i++) s.wait(i * 0.35, () => fx.burst(s.view.width * (0.2 + i * 0.2), s.view.height * 0.3, ["#ffe066", "#ff5ca8", "#7ef0ff", "#b45cff"], 40, { sp: 280, g: 200 })); } });
        if (result.unlocked.length) s.wait(1.1, () => { G.snd.unlock(); tip("New unlock", result.unlocked.map((u) => u.text).join(" ")); });
        s.onUpdate((dt) => { fx.update(dt); again.pos.set(s.view.width / 2, s.view.height - 40 - safe().bottom); hurryKeys(); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = safe().top + 8, land = W > H, cx = land ? W * 0.62 : W / 2, tw = land ? W * 0.62 : W - 32, art = land ? Math.min(H * 0.62, 210) : Math.min(H * 0.2, 150);
            d.sprite(`witch_${wid}`, { x: land ? W * 0.17 : W / 2, y: land ? H * 0.46 : top + art / 2, width: art * 0.786, height: art });
            let y = land ? top + 20 : top + art + 20;
            label(d, won ? "The Tower Is Yours" : "Boiled Over", cx, y, tw, 34, { size: 27, bold: true, color: won ? COLORS.gold : "#ff9a8a" }); y += 28;
            label(d, won ? "Ysolde lies in a heap of her own soup." : `You reached floor ${st.floors} of ${S.ACTS * (S.ROWS + 1)}.`, cx, y, tw, 20, { size: 14, color: COLORS.dim }); y += 26;
            for (const [k, v] of result.parts) { d.text(k, { x: cx - 40, y, size: 14, font: FONT, color: COLORS.cream }); d.text(`+${v}`, { x: cx + 96, y, size: 14, bold: true, font: FONT, color: COLORS.gold }); y += 19; }
            y += 6;
            label(d, `${meta.stars} stars${result.gained ? ` (+${result.gained})` : ""}`, cx, y, tw, 22, { size: 16, bold: true, color: "#ffe066" }); y += 20;
            const nx = nextUnlock(meta);
            if (nx) { const bw = Math.min(tw, 230), f = clamp(meta.stars / nx.stars, 0, 1); d.rect(bw, 10, { x: cx, y, color: "#07040f", radius: 5 }); d.rect(Math.max(10, bw * f), 8, { x: cx - bw * (1 - f) / 2, y, color: "#ffe066", radius: 4 }); y += 18; label(d, `${nx.stars - meta.stars} more for new cards`, cx, y, tw, 18, { size: 13, color: COLORS.dim }); y += 20; }
            if (st.best.dmg > 0 && y < H - safe().bottom - 90) label(d, `Best brew: ${recipeName(st.best.recipe)}, ${fmt(st.best.dmg)}`, cx, y, tw, 20, { size: 13, color: "#ffd9a0" });
            fx.draw(d);
        });
        installOverlays(s);
    });
}
