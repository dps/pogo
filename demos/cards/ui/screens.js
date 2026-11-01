// Everything between fights: the tower map, spoils, shop, campfire, events, and the end of a run.
import { CARDS, cardText } from "../data/cards.js";
import { TRINKETS } from "../data/trinkets.js";
import { ACT_NAMES, BOSSES, ENEMIES } from "../data/enemies.js";
import { ELEMENTS, WITCHES } from "../data/rules.js";
import { EVENTS } from "../data/events.js";
import * as S from "../sim.js";
import { UNLOCKS, bankRun, nextUnlock, recipeName, tierOf } from "../meta.js";
import { cardArt, motifArt, trinketArt, warm } from "../art/index.js";
import { ASPECT, drawCard } from "./cardview.js";
import { rnd, COLORS, FONT, Fx, G, TOP, clamp, clearRun, drawHud, drawTrinkets, hudEntity, fmt, hurryKeys, lerp, pin, route, saveMeta, saveRun, song, spellBtn, ui } from "./core.js";
import { deckView, installOverlays, settings, tip, trinketTip, zoom } from "./overlay.js";

const NODE = { fight: "A fight", elite: "An elite: dangerous, but drops a trinket", rest: "A campfire", shop: "A shop", event: "Something odd", treasure: "Treasure", boss: "The boss" };
function background(s, act, dim = 0.5) {
    s.onDraw((d) => {
        const W = s.view.width, H = s.view.height, k = Math.max(W / 300, H / 420) * 1.03;
        d.sprite(`bg_${act}`, { x: W / 2, y: H / 2, width: 300 * k, height: 420 * k });
        d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: dim });
    });
}
function topBar(s, run) {
    const deck = s.add([ui(), spellBtn("Deck", { width: 60, height: 44, size: 13, color: "#4a2a7a", onTap: () => deckView("Your deck", run.deck), radius: 12 })]);
    const gear = s.add([ui(), spellBtn("≡", { width: 44, height: 44, size: 19, color: "#4a2a7a", onTap: settings, radius: 12 })]);
    let boxes = [];
    s.onUpdate(() => {
        const W = s.view.width, top = G.game.view.safe.top;
        const sr = G.game.view.safe.right; deck.pos.set(W - 80 - sr, top + 23); gear.pos.set(W - 26 - sr, top + 23);
        for (const k of hurryKeys()) { if (k === "Escape") settings(); if (k === "KeyD") deckView("Your deck", run.deck); }
        const p = s.input.pointer;
        if (p.pressed && !G.overlay) { const b = boxes.find((q) => Math.hypot(p.x - q.x, p.y - q.y) < 16); if (b) trinketTip(b.id); }
    });
    hudEntity(s, () => run, (d) => { boxes = drawTrinkets(d, s, run, G.game.view.safe.top + 56); });
}
/** Cards you can look at, hold, and tap: shared by spoils and the shop. */
function pickable(s, items, onTap) {
    const st = { press: null };
    s.onUpdate((dt) => {
        if (G.overlay) { st.press = null; return; }
        const p = s.input.pointer, list = items();
        for (const it of list) {
            const over = it.card && Math.abs(p.x - it.x) < it.w / 2 && Math.abs(p.y - it.y) < it.w * ASPECT / 2;
            const hot = over && (p.down || !s.input.touchMode);
            it.tx = lerp(it.tx ?? 0, hot ? clamp((p.x - it.x) / (it.w / 2), -1, 1) * 0.9 : Math.sin(s.time * 1.2 + it.x) * 0.1, Math.min(1, dt * 14));
            it.ty = lerp(it.ty ?? 0, hot ? clamp((p.y - it.y) / (it.w * ASPECT / 2), -1, 1) * 0.9 : 0, Math.min(1, dt * 14));
            it.hot = lerp(it.hot ?? 0, hot ? 1 : 0, Math.min(1, dt * 14));
            if (hot && !it.wasHot) G.snd.notch(list.indexOf(it));
            it.wasHot = hot;
        }
        if (p.pressed) { const it = list.find((q) => q.card && Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.y - q.y) < q.w * ASPECT / 2); st.press = it ? { it, t: 0, x: p.x, y: p.y } : null; }
        if (st.press) {
            st.press.t += dt;
            if (p.down && st.press.t > 0.36 && Math.hypot(p.x - st.press.x, p.y - st.press.y) < 12) { const c = st.press.it.card; st.press = null; zoom(c); return; }
            if (p.released) { const q = st.press; st.press = null; if (Math.hypot(p.x - q.x, p.y - q.y) < 14) onTap(q.it); }
        }
    });
}
function drawPick(d, it, o = {}) {
    drawCard(d, it.card, { x: it.x, y: it.y - it.hot * 6, w: it.w * (1 + it.hot * 0.07), tx: it.tx, ty: it.ty, foil: 0.1 + it.hot * 0.55 + (CARDS[it.card.id].rar === "rare" ? 0.1 : 0), lift: it.hot, ...o });
}

export function screens(game) {
    // ---- Map ----
    game.scene("map", (s, args) => {
        if (args?.demo && !G.run) G.demoRun({ ...args, map: true });
        const run = G.run;
        if (!run) { game.go("title"); return; }
        const fx = new Fx(), ROWS = S.ROWS, sp = 70, opts = S.reachable(run), act = run.act;
        song("map");
        warm(run.deck.map((k) => k.id));
        const start = run.pos ? run.pos.r : -1, V = { scroll: 0, target: 0, press: null, t: 0, showAct: run.pos ? 0 : 2.2, hover: null };
        const H0 = () => s.view.height;
        const pos = (n) => {
            const W = s.view.width, H = H0(), land = W > H, colW = Math.min((W - 92) / 4, land ? 130 : 78), j = ((n.c * 7 + n.r * 13) % 5 - 2) * 3;
            return { x: W / 2 + (n.c - 2) * colW + j, y: H - 90 - n.r * sp + V.scroll + ((n.c * 3 + n.r) % 3 - 1) * 5 };
        };
        const bossPos = () => ({ x: s.view.width / 2, y: H0() - 90 - ROWS * sp + V.scroll - 14 });
        const maxS = () => Math.max(0, (ROWS + 1) * sp + 236 - H0());
        V.scroll = V.target = clamp((start + 0.5) * sp - 40, 0, maxS());
        s.onUpdate((dt) => {
            V.t += dt; V.showAct = Math.max(0, V.showAct - dt);
            fx.update(dt);
            V.scroll += (V.target - V.scroll) * Math.min(1, dt * 10);
            if (G.overlay) return;
            const p = s.input.pointer;
            if (s.input.wheel) V.target = clamp(V.target + s.input.wheel * 0.4, 0, maxS());
            if (p.pressed) V.press = { y: p.y, x: p.x, s: V.target, m: 0 };
            if (p.down && V.press) { V.target = clamp(V.press.s + (p.y - V.press.y), 0, maxS()); V.press.m = Math.max(V.press.m, Math.abs(p.y - V.press.y)); V.scroll = V.target; }
            if (p.released && V.press) {
                const m = V.press.m; V.press = null;
                if (m < 14 && p.y > 50 + game.view.safe.top + 26) {
                    const hit = opts.find((n) => { const q = n.boss ? bossPos() : pos(n); return Math.hypot(p.x - q.x, p.y - q.y) < (n.boss ? 44 : 30); });
                    if (hit) go(hit);
                    else { const any = run.map.nodes.find((n) => { const q = pos(n); return Math.hypot(p.x - q.x, p.y - q.y) < 24; }); if (any) tip(NODE[any.type], "Tap a glowing door to climb. You can look at what's ahead, but you can't come back down."); }
                }
            }
        });
        function go(n) {
            G.snd.step();
            const q = n.boss ? bossPos() : pos(n);
            fx.burst(q.x, q.y, ["#ffe066", "#fff"], 18);
            G.game.haptic("medium");
            s.wait(0.18, () => { S.chooseNode(run, n); route(); });
        }
        s.onDraw((d) => {
            const W = s.view.width, H = H0(), k = Math.max(W / 300, (H + 200) / 420) * 1.03;
            d.sprite(`bg_${act}`, { x: W / 2, y: H / 2 + (V.scroll / maxS() || 0) * 80 - 40, width: 300 * k, height: 420 * k });
            d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: 0.55 });
            const wallW = 40, tile = 100, off = (V.scroll % tile) - tile;
            for (let y = off; y < H + tile; y += tile) for (const x of [wallW / 2 - 8, W - wallW / 2 + 8]) d.sprite("wall", { x, y: y + tile / 2, width: wallW, height: tile, opacity: 0.85 });
            const nodes = run.map.nodes, at = {};
            for (const n of nodes) at[`${n.r},${n.c}`] = n;
            const visited = (n) => run.path?.some((q) => q.r === n.r && q.c === n.c);
            for (const n of nodes) {
                const a = pos(n);
                const targets = n.r === ROWS - 1 ? [bossPos()] : n.next.map((c) => pos(at[`${n.r + 1},${c}`]));
                for (const b of targets) {
                    const steps = 7;
                    for (let i = 1; i < steps; i++) { const t = i / steps; d.circle(2, { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), color: "#e7d8b8", opacity: 0.42 }); }
                }
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
            d.sprite(`foe_${run.map.boss}`, { x: b.x, y: b.y, width: 112, height: 112 });
            d.text(ENEMIES[run.map.boss].name, { x: b.x, y: b.y + 62, size: 14, bold: true, font: FONT, color: "#ffd0a0" });
            fx.draw(d);
        });
        topBar(s, run);
        s.onDrawUI((d) => {
            const W = s.view.width, H = H0(), top = game.view.safe.top;
            d.text(`${ACT_NAMES[act]}  ${run.asc ? `Rank ${run.asc}` : ""}`, { x: W - 66, y: top + 56, size: 13, bold: true, font: FONT, color: COLORS.gold });
            if (W > H && maxS() > 0 && !run.pos) d.text("Drag to look ahead", { x: W / 2, y: H - 14, size: 12, font: FONT, color: COLORS.dim });
            if (V.showAct > 0) {
                const a = Math.min(1, V.showAct * 1.6);
                d.rect(W + 4, 84, { x: W / 2, y: H * 0.42, color: "#120822", opacity: 0.84 * a });
                d.text(`Floor ${act + 1} of 4`, { x: W / 2, y: H * 0.42 - 20, size: 14, font: FONT, color: COLORS.dim, opacity: a });
                d.text(ACT_NAMES[act], { x: W / 2, y: H * 0.42 + 8, size: 32, bold: true, font: FONT, color: COLORS.gold, opacity: a });
            }
        });
        installOverlays(s);
    });

    // ---- Spoils ----
    game.scene("reward", (s) => {
        const run = G.run, r = run?.reward;
        if (!r) { game.go("map"); return; }
        const fx = new Fx(), items = [];
        song("calm");
        background(s, run.act, 0.6); hudEntity(s, () => run);
        const layout = () => {
            const W = s.view.width, H = s.view.height, land = W > H, n = items.length, w = land ? Math.min(H * 0.42 / ASPECT * 1.15, (W - 40) / n - 8, 118) : Math.min((W - 24) / n - 6, 112), y = land ? H * 0.58 : H * 0.5, gap = w + 8;
            items.forEach((it, i) => { it.w = w; it.x = W / 2 + (i - (n - 1) / 2) * gap; it.y = y + (i - (n - 1) / 2) ** 2 * 3; });
        };
        const sync = () => { items.length = 0; if (r.cards) r.cards.forEach((c, i) => items.push({ card: { ...c }, i })); layout(); };
        sync();
        const again = s.add([ui(), spellBtn("Continue", { width: 150, height: 48, action: "confirm", onTap: () => { S.leaveReward(run); route(); } })]);
        pickable(s, () => items, (it) => {
            G.snd.pick(); game.haptic("medium");
            fx.burst(it.x, it.y, [ELEMENTS[CARDS[it.card.id].el].color, "#ffe066"], 24, { sp: 200 });
            S.takeRewardCard(run, it.i); saveRun(); sync();
        });
        // Gold and any trinket collect themselves with a flourish.
        s.wait(0.25, () => { if (r.gold) { fx.num(s.view.width / 2, game.view.safe.top + 142, `+${r.gold} gold`, COLORS.gold, { size: 26, life: 1.3 }); G.snd.coin(); S.takeRewardGold(run); saveRun(); } });
        s.wait(0.5, () => { if (r.trinket) { const id = r.trinket; S.takeRewardTrinket(run); saveRun(); G.snd.unlock(); trinketTip(id); } });
        s.onUpdate((dt) => { layout(); fx.update(dt); const W = s.view.width, H = s.view.height; if (W > H) again.pos.set(W - 96 - game.view.safe.right, H * 0.58); else again.pos.set(W / 2, H - 46 - game.view.safe.bottom); again.txt = r.cards ? "Skip" : "Continue"; hurryKeys(); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top;
            d.text("Spoils of the Fight", { x: W / 2, y: top + 72, size: 24, bold: true, font: FONT, color: COLORS.gold });
            d.text(r.cards ? "Add one ingredient to your deck" : "Taken. The stairs await.", { x: W / 2, y: top + 98, size: 14, font: FONT, color: COLORS.dim });
            if (r.cards) d.text("Hold a card to read it closely", { x: W / 2, y: W > H ? H - 14 - game.view.safe.bottom : H - 86 - game.view.safe.bottom, size: 12, font: FONT, color: COLORS.dim });
            for (const it of items) drawPick(d, it);
            fx.draw(d); fx.drawNums(d);
        });
        installOverlays(s);
    });

    // ---- Treasure ----
    game.scene("treasure", (s) => {
        const run = G.run, r = run?.reward;
        if (!r) { game.go("map"); return; }
        const V = { open: 0, t: 0 }, fx = new Fx();
        background(s, run.act, 0.55); song("calm"); hudEntity(s, () => run);
        const b = s.add([ui(), spellBtn("Open it", { width: 150, action: "confirm", onTap: () => {
            if (!V.open) { V.open = 0.01; G.snd.unlock(); game.haptic("success"); const id = r.trinket, g = r.gold; S.takeRewardGold(run); S.takeRewardTrinket(run); V.got = id; V.gold = g; run.reward = null; run.screen = "map"; saveRun(); fx.burst(s.view.width / 2, s.view.height * 0.46, ["#ffe066", "#fff", "#b45cff"], 50, { sp: 300 }); b.txt = "Onward"; return; }
            route();
        } })]);
        s.onUpdate((dt) => { V.t += dt; fx.update(dt); if (V.open) V.open = Math.min(1, V.open + dt * 3); b.pos.set(s.view.width / 2, s.view.height - 54 - game.view.safe.bottom); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, cy = H * 0.46;
            d.text("A Locked Box", { x: W / 2, y: game.view.safe.top + 76, size: 24, bold: true, font: FONT, color: COLORS.gold });
            d.additive(() => d.sprite("glow", { x: W / 2, y: cy, width: 300, height: 300, color: "#ffe066", opacity: 0.2 + V.open * 0.5 }));
            d.sprite(motifArt("key"), { x: W / 2, y: cy + (V.open ? 60 : 0), width: 170, height: 128, opacity: 1 - V.open * 0.5 });
            if (V.got) {
                const t = TRINKETS[V.got];
                d.sprite(trinketArt(V.got), { x: W / 2, y: cy - 20 * V.open, width: 118 * V.open, height: 118 * V.open });
                d.text(t.name, { x: W / 2, y: cy + 62, size: 20, bold: true, font: FONT, color: "#fff6dc" });
                d.text(t.text, { x: W / 2, y: cy + 92, size: 15, font: FONT, color: COLORS.cream, maxWidth: W - 50, align: "center" });
                d.text(`+${V.gold} gold`, { x: W / 2, y: cy + 128, size: 15, bold: true, font: FONT, color: COLORS.gold });
            }
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Boss trinket ----
    game.scene("bossTrinket", (s) => {
        const run = G.run;
        if (!run?.bossPick) { game.go("map"); return; }
        background(s, run.act, 0.62); song("victory");
        const fx = new Fx(), W0 = () => s.view.width, list = run.bossPick;
        const take = (i) => { G.snd.unlock(); S.pickBossTrinket(run, i); route(); };
        const btns = list.map((id, i) => s.add([ui(), spellBtn(TRINKETS[id].name, { width: 280, height: 44, size: 15, onTap: () => take(i), color: "#7a3ad0" })]));
        const skip = s.add([ui(), spellBtn("Take nothing", { width: 150, height: 40, size: 14, color: "#3a2a5a", onTap: () => take(null) })]);
        s.onUpdate((dt) => {
            fx.update(dt); const H = s.view.height, W = W0(), land = W > H;
            btns.forEach((b, i) => { const x = land ? W / 2 + (i - 1) * Math.min(210, W / 3) : W / 2, y = land ? H * 0.74 : 150 + i * 118 + 34; b.pos.set(x, y); if (land) b.size.x = Math.min(200, W / 3 - 10); });
            skip.pos.set(W / 2, H - 34 - game.view.safe.bottom);
        });
        s.onDrawUI((d) => {
            const W = W0(), H = s.view.height, land = W > H, top = game.view.safe.top;
            d.text("The Boss's Hoard", { x: W / 2, y: top + 34, size: 26, bold: true, font: FONT, color: COLORS.gold });
            d.text("Take one. Power has a price.", { x: W / 2, y: top + 62, size: 14, font: FONT, color: COLORS.dim });
            list.forEach((id, i) => {
                const b = btns[i], t = TRINKETS[id], x = b.pos.x, y = b.pos.y;
                d.sprite(trinketArt(id), { x: land ? x : x - 110, y: land ? y - 78 : y - 54, width: 64, height: 64 });
                d.text(t.text, { x: land ? x : x + 32, y: land ? y - 32 : y - 54, size: 13, font: FONT, color: COLORS.cream, maxWidth: land ? Math.min(200, W / 3 - 14) : 216, align: "center" });
            });
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Shop ----
    const QUIPS = ["No refunds. No haggling. No eye contact.", "Everything's cursed. It's a feature.", "That one bites. That's why it's on sale.", "You break it, it breaks you.", "Mister Ledger sees you, and is not impressed."];
    game.scene("shop", (s) => {
        const run = G.run, sh = run?.shop;
        if (!sh) { game.go("map"); return; }
        song("shop"); background(s, run.act, 0.62); hudEntity(s, () => run);
        const fx = new Fx(), items = sh.cards.map((c, i) => ({ card: { id: c.id, up: c.up }, i, price: c.price, sold: !!c.sold }));
        const boxes = { tr: [], rm: null };
        const quip = QUIPS[(run.seed + run.floor + run.act) % QUIPS.length];
        const leave = s.add([ui(), spellBtn("Leave", { width: 110, height: 42, size: 16, action: "confirm", color: "#4a2a7a", onTap: () => { S.leaveShop(run); route(); } })]);
        const layout = () => {
            const W = s.view.width, H = s.view.height, land = W > H, top = game.view.safe.top + 40;
            if (land) {
                const w = Math.min((W * 0.62 - 10) / 5 - 4, 96), sl = game.view.safe.left; items.forEach((it, i) => { it.w = w; it.x = 8 + sl + w / 2 + i * (w + 4); it.y = top + 56 + w * ASPECT / 2; });
                boxes.tr = sh.trinkets.map((t, i) => ({ ...t, i, x: W * 0.68 + 26 + i * 68, y: top + 86 })); boxes.rm = { x: W * 0.8, y: top + 178, w: 190, h: 50 };
                leave.pos.set(W - 66, H - 30 - game.view.safe.bottom);
            } else {
                const w = Math.min((W - 18) / 3 - 4, 112), gap = w + 5, y1 = top + 66 + w * ASPECT / 2;
                items.forEach((it, i) => { const row = i < 3 ? 0 : 1, n = row ? 2 : 3, k = row ? i - 3 : i; it.w = w; it.x = W / 2 + (k - (n - 1) / 2) * gap - (row ? w * 0.5 + 2 : 0); it.y = y1 + row * (w * ASPECT + 26); });
                const y2 = y1 + 2 * (w * ASPECT + 26) - w * ASPECT / 2 + 12;
                boxes.tr = sh.trinkets.map((t, i) => ({ ...t, i, x: W / 2 + (i - 1) * 76, y: Math.min(y2 + 18, H - 118) }));
                boxes.rm = { x: W / 2 + w + 6, y: y1 + w * ASPECT + 26, w: w, h: w * ASPECT };
                leave.pos.set(W / 2, H - 28 - game.view.safe.bottom);
            }
        };
        layout();
        pickable(s, () => items, (it) => {
            if (it.sold) return;
            if (S.buyCard(run, it.i)) { it.sold = true; G.snd.coin(); game.haptic("medium"); fx.burst(it.x, it.y, ["#ffe066"], 18); saveRun(); } else { G.snd.deny(); }
        });
        s.onUpdate((dt) => {
            layout(); fx.update(dt); hurryKeys();
            if (G.overlay) return;
            const p = s.input.pointer;
            if (p.pressed) {
                const t = boxes.tr.find((b) => Math.hypot(p.x - b.x, p.y - b.y) < 32);
                if (t) {
                    const real = sh.trinkets[t.i];
                    if (real.sold) return;
                    const can = run.gold >= real.price;
                    tip(TRINKETS[t.id].name, TRINKETS[t.id].text, { sprite: trinketArt(t.id), sub: `${real.price} gold`, extra: can ? undefined : "You can't afford it yet", action: can ? { label: `Buy for ${real.price}`, fn: () => { S.buyTrinket(run, t.i); G.snd.coin(); saveRun(); game.haptic("success"); fx.burst(t.x, t.y, ["#ffe066"], 18); } } : undefined });
                    return;
                }
                const r = boxes.rm;
                if (r && !sh.removed && Math.abs(p.x - r.x) < r.w / 2 && Math.abs(p.y - r.y) < r.h / 2) {
                    if (run.gold < sh.removePrice) { G.snd.deny(); return; }
                    deckView("Burn a card from your deck", run.deck, { sub: `${sh.removePrice} gold`, onPick: (k) => { S.buyRemove(run, k.u); G.snd.coin(); saveRun(); } });
                }
            }
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top;
            d.sprite(motifArt("cat"), { x: 44, y: top + 76, width: 76, height: 57 });
            d.text("Mister Ledger's", { x: 180, y: top + 62, size: 20, bold: true, font: FONT, color: COLORS.gold });
            if (W > H) d.text(`"${quip}"`, { x: W * 0.68, y: top + 62, size: 12, font: FONT, color: COLORS.dim, maxWidth: W * 0.5, align: "center" });
            else d.text(`"${quip}"`, { x: 186, y: top + 86, size: 12, font: FONT, color: COLORS.dim, maxWidth: W - 100 });
            for (const it of items) {
                if (it.sold) { d.text("Sold", { x: it.x, y: it.y, size: 16, bold: true, font: FONT, color: COLORS.dim }); continue; }
                drawPick(d, it);
                const can = run.gold >= it.price;
                d.rect(58, 20, { x: it.x, y: it.y + it.w * ASPECT / 2 + 8, color: "#120822", radius: 10 });
                d.text(`${it.price}`, { x: it.x + 6, y: it.y + it.w * ASPECT / 2 + 8, size: 13, bold: true, font: FONT, color: can ? COLORS.gold : "#ff8a7a" });
                d.sprite("glyph_gilt", { x: it.x - 16, y: it.y + it.w * ASPECT / 2 + 8, width: 15, height: 15 });
            }
            for (const b of boxes.tr) {
                const real = sh.trinkets[b.i];
                if (real.sold) continue;
                d.circle(28, { x: b.x, y: b.y, color: "#2a1b42" }); d.circle(28, { x: b.x, y: b.y, color: "#e7b75e", outline: 1.5 });
                d.sprite(trinketArt(b.id), { x: b.x, y: b.y, width: 50, height: 50 });
                d.text(`${real.price}`, { x: b.x, y: b.y + 37, size: 13, bold: true, font: FONT, color: run.gold >= real.price ? COLORS.gold : "#ff8a7a" });
            }
            const r = boxes.rm;
            if (r && !sh.removed) {
                d.rect(r.w, r.h, { x: r.x, y: r.y, color: "#3a1a2a", radius: 12 }); d.rect(r.w, r.h, { x: r.x, y: r.y, color: "#ff9a6a", radius: 12, outline: 1.5 });
                d.text("Burn a card", { x: r.x, y: r.y - 8, size: 14, bold: true, font: FONT, color: "#ffd0b0" });
                d.text(`${sh.removePrice} gold`, { x: r.x, y: r.y + 12, size: 13, bold: true, font: FONT, color: run.gold >= sh.removePrice ? COLORS.gold : "#ff8a7a" });
            }
            fx.draw(d); fx.drawNums(d);
        });
        installOverlays(s);
    });

    // ---- Campfire ----
    game.scene("rest", (s) => {
        const run = G.run;
        if (!run) { game.go("title"); return; }
        song("calm"); background(s, run.act, 0.55); hudEntity(s, () => run);
        const fx = new Fx(), heal = S.restHeal(run), can = S.canRest(run), ups = S.upgradable(run);
        const a = s.add([ui(), spellBtn(`Rest: heal ${heal}`, { width: 220, height: 50, color: "#c0601e", action: "confirm", onTap: () => { if (!can) { tip("Lead Lid", "The lid is on. You can't rest here."); return; } S.rest(run); G.snd.heal(); game.haptic("success"); route(); } })]);
        const b = s.add([ui(), spellBtn("Refine an ingredient", { width: 220, height: 50, color: "#7a3ad0", onTap: () => {
            if (!ups.length) { tip("Nothing left", "Every card you own is already as good as it gets."); return; }
            deckView("Refine one card", ups.map((k) => ({ ...k, up: 1, real: k.u })), { sub: "Shown after refining", onPick: (k) => { S.refine(run, k.real); G.snd.unlock(); route(); } });
        } })]);
        if (!can) a.disabled = true;
        const c = s.add([ui(), spellBtn("Move on", { width: 120, height: 40, size: 14, color: "#3a2a5a", onTap: () => { run.screen = "map"; route(); } })]);
        s.onUpdate((dt) => {
            fx.update(dt); const W = s.view.width, H = s.view.height, by = H > W ? H * 0.68 : H * 0.72;
            if (H > W) { a.pos.set(W / 2, by); b.pos.set(W / 2, by + 62); c.pos.set(W / 2, by + 118); } else { a.pos.set(W / 2 - 118, by); b.pos.set(W / 2 + 118, by); c.pos.set(W / 2, by + 54); }
            if (rnd() < dt * 34) fx.spark(W / 2 + (rnd() - 0.5) * 60, H * 0.44, rnd() < 0.5 ? "#ff7a2f" : "#ffd25a", { a: -1.57 + (rnd() - 0.5) * 0.4, sp: 60 + rnd() * 60, g: -30, s: 6, life: 0.8 });
            hurryKeys();
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, cy = H * 0.42, land = W > H;
            d.text("A Campfire on the Stairs", { x: W / 2, y: top + 72, size: 22, bold: true, font: FONT, color: COLORS.gold });
            d.additive(() => d.sprite("glow", { x: W / 2, y: cy, width: 340, height: 340, color: "#ff9a4a", opacity: 0.4 + Math.sin(s.time * 7) * 0.05 }));
            d.sprite("logs", { x: W / 2, y: cy + 46, width: 150, height: 42 });
            d.sprite(`witch_${run.witch}`, { x: W / 2 - 110, y: cy + (land ? 0 : 6), width: 110, height: 140 });
            const fl = 1 + Math.sin(s.time * 11) * 0.05 + Math.sin(s.time * 17) * 0.04;
            d.sprite("heatgem", { x: W / 2, y: cy + 12 - 40 * fl, width: 126 * (2 - fl), height: 130 * fl });
            fx.draw(d);
        });
        installOverlays(s);
    });

    // ---- Event ----
    game.scene("event", (s) => {
        const run = G.run, ev = S.eventDef(run);
        if (!ev) { game.go("map"); return; }
        song("map"); background(s, run.act, 0.68); hudEntity(s, () => run);
        const btns = [];
        const build = () => {
            btns.forEach((b) => b.destroy()); btns.length = 0;
            if (run.event?.result == null) ev.choices.forEach((c, i) => {
                const b = s.add([ui(), spellBtn(c.label, { width: 300, height: 46, size: 15, color: "#5a2f9a", onTap: () => { if (c.can && !c.can(run)) { G.snd.deny(); return; } S.chooseEvent(run, i); saveRun(); G.snd.page(); game.haptic("light"); build(); } })]);
                b.note = c.note; b.disabled = c.can ? !c.can(run) : false; btns.push(b);
            });
            else {
                const b = s.add([ui(), spellBtn("Carry on", { width: 180, height: 48, action: "confirm", onTap: () => { const evs = S.leaveEvent(run); route(); } })]);
                btns.push(b);
            }
        };
        build();
        const pos = () => {
            const W = s.view.width, H = s.view.height, land = W > H, n = btns.length, bx = land ? W * 0.68 : W / 2, y0 = land ? H / 2 - (n - 1) * 34 : H - game.view.safe.bottom - n * 68 + 8;
            btns.forEach((b, i) => { const w = land ? Math.min(W * 0.56, 320) : Math.min(W - 28, 330); if (n > 1 || run.event?.result == null) b.size.x = w; b.pos.set(bx, y0 + i * 68); });
        };
        s.onUpdate(() => { pos(); hurryKeys(); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, land = W > H, top = game.view.safe.top;
            const tx = land ? W * 0.24 : W / 2, tw = land ? W * 0.42 : W - 36, y = top + 54, artH = land ? 104 : Math.min(148, H * 0.2);
            d.sprite(motifArt(ev.art), { x: tx, y: y + artH / 2, width: artH * 4 / 3, height: artH });
            d.rect(artH * 4 / 3 + 3, artH + 3, { x: tx, y: y + artH / 2, color: "#e7b75e", radius: 3, outline: 1.5 });
            d.text(ev.title, { x: tx, y: y + artH + 24, size: 21, bold: true, font: FONT, color: COLORS.gold });
            const body = run.event?.result ?? ev.text, st = { size: 15, font: FONT, bold: false, align: "center", maxWidth: tw, lineHeight: 1.32 }, bh = game.renderer.measureText(body, st).height;
            d.text(body, { x: tx, y: y + artH + 44 + bh / 2, ...st, color: COLORS.cream });
            for (const b of btns) if (b.note) d.text(b.note, { x: b.pos.x, y: b.pos.y + 31, size: 12, font: FONT, color: b.disabled ? "#8a7a98" : "#ffd9a0" });
        });
        installOverlays(s);
    });

    // ---- Queued picks from events ----
    game.scene("pick", (s) => {
        const run = G.run, p = run?.queue?.[0];
        if (!p) { if (run) { run.screen = "map"; game.go("map"); } else game.go("title"); return; }
        background(s, run.act, 0.68); song("calm"); hudEntity(s, () => run);
        const items = [], done = () => { saveRun(); route(); };
        if (p.kind === "cards") {
            p.cards.forEach((c, i) => items.push({ card: { ...c }, i }));
            pickable(s, () => items, (it) => { S.resolvePick(run, it.i); G.snd.pick(); done(); });
            const skip = s.add([ui(), spellBtn("Skip", { width: 120, height: 42, onTap: () => { S.resolvePick(run, null); done(); } })]);
            s.onUpdate(() => { const W = s.view.width, H = s.view.height, w = Math.min((W - 24) / 3 - 6, 112); items.forEach((it, i) => { it.w = w; it.x = W / 2 + (i - 1) * (w + 8); it.y = H * 0.48; }); skip.pos.set(W / 2, H - 46 - game.view.safe.bottom); });
            s.onDrawUI((d) => { d.text("Take one", { x: s.view.width / 2, y: game.view.safe.top + 76, size: 24, bold: true, font: FONT, color: COLORS.gold }); for (const it of items) drawPick(d, it); });
            installOverlays(s);
            return;
        }
        const list = p.kind === "remove" ? run.deck : S.upgradable(run).map((k) => ({ ...k, up: 1, real: k.u }));
        hudEntity(s, () => run);
        installOverlays(s);
        s.wait(0.05, () => deckView(p.kind === "remove" ? "Remove a card" : "Refine a card", list, { closeLabel: "×", onClose: () => { S.resolvePick(run, null); done(); }, onPick: (k) => { S.resolvePick(run, k.real ?? k.u); G.snd.pick(); done(); } }));
    });

    // ---- End of run ----
    game.scene("end", (s) => {
        const run = G.run;
        if (!run) { game.go("title"); return; }
        song(run.won ? "victory" : "calm");
        const result = run.banked ?? (run.banked = bankRun(G.meta, run));
        saveMeta(); clearRun();
        const fx = new Fx(), meta = G.meta, won = run.won, st = run.stats, wid = run.witch;
        background(s, run.act, 0.66);
        const again = s.add([ui(), spellBtn("Climb again", { width: 200, height: 52, size: 19, color: "#c0401e", action: "confirm", onTap: () => game.go("witch", {}, { fade: 0.2 }) })]);
        s.wait(0.3, () => { if (won) { G.snd.win(); for (let i = 0; i < 4; i++) s.wait(i * 0.35, () => fx.burst(s.view.width * (0.2 + i * 0.2), s.view.height * 0.3, ["#ffe066", "#ff5ca8", "#7ef0ff", "#b45cff"], 40, { sp: 280, g: 200 })); } });
        if (result.unlocked.length) s.wait(1.1, () => { G.snd.unlock(); tip("New Unlock", result.unlocked.map((u) => u.text).join(" ")); });
        s.onUpdate((dt) => { fx.update(dt); const W = s.view.width, H = s.view.height; again.pos.set(W / 2, H - 50 - game.view.safe.bottom); hurryKeys(); });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, land = W > H, cx = land ? W * 0.62 : W / 2;
            d.sprite(`witch_${wid}`, { x: land ? W * 0.2 : W / 2, y: land ? H * 0.5 : top + 106, width: land ? 200 : 132, height: land ? 254 : 168 });
            let y = land ? top + 34 : top + 212;
            d.text(won ? "The Tower Is Yours" : "Boiled Over", { x: cx, y, size: 30, bold: true, font: FONT, color: won ? COLORS.gold : "#ff9a8a" });
            y += 26;
            d.text(won ? "Ysolde lies in a heap of her own soup." : `You reached floor ${st.floors} of ${S.ACTS * (S.ROWS + 1)}.`, { x: cx, y, size: 14, font: FONT, color: COLORS.dim });
            y += 30;
            const lines = result.parts;
            for (const [k, v] of lines) { d.text(k, { x: cx - 60, y, size: 14, font: FONT, color: COLORS.cream }); d.text(`+${v}`, { x: cx + 90, y, size: 14, bold: true, font: FONT, color: COLORS.gold }); y += 20; }
            y += 6;
            d.text(`Stars: ${meta.stars}   ${result.gained ? `(+${result.gained})` : ""}`, { x: cx, y, size: 16, bold: true, font: FONT, color: "#ffe066" });
            y += 22;
            const nx = nextUnlock(meta);
            if (nx) { const bw = Math.min(W - 60, 240), f = clamp(meta.stars / nx.stars, 0, 1); d.rect(bw, 10, { x: cx, y, color: "#07040f", radius: 5 }); d.rect(bw * f, 8, { x: cx - bw * (1 - f) / 2, y, color: "#ffe066", radius: 4 }); y += 18; d.text(`${nx.stars - meta.stars} more for: ${nx.text}`, { x: cx, y: y + 8, size: 12, font: FONT, color: COLORS.dim, maxWidth: W - 40, align: "center" }); y += 34; }
            if (st.best.dmg > 0) { d.text(`Best brew: ${recipeName(st.best.recipe)}, ${fmt(st.best.dmg)} damage`, { x: cx, y, size: 13, font: FONT, color: "#ffd9a0", maxWidth: W - 40, align: "center" }); y += 20; }
            if (won && run.asc < 10) d.text(`Rank ${run.asc + 1} unlocked for ${WITCHES[wid].name}`, { x: cx, y, size: 13, bold: true, font: FONT, color: "#d9ffb0" });
            fx.draw(d);
        });
        installOverlays(s);
    });
}
