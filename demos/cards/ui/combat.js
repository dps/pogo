// The cauldron table. Reads sim state, turns the event list from sim.brew() into a show.
import { CARDS, cardCost } from "../data/cards.js";
import { ELEMENTS, KEYWORDS, REACTIONS, WITCHES } from "../data/rules.js";
import { ENEMIES } from "../data/enemies.js";
import * as S from "../sim.js";
import { recipeName } from "../meta.js";
import { cardArt, tokenArt, trinketArt, warm } from "../art/index.js";
import { ASPECT, drawCard, drawDissolve } from "./cardview.js";
import { rnd, COLORS, FONT, Fx, G, clamp, drawHud, drawTrinkets, hudEntity, fmt, hurryKeys, lerp, route, saveMeta, saveRun, spellBtn, song, ui } from "./core.js";
import { close, deckView, installOverlays, settings, tip, trinketTip, zoom } from "./overlay.js";

const hex = (c) => ELEMENTS[c]?.color ?? c;
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const TIERS = [[6, "Bubbling!", "#ffd27a"], [12, "Rolling Boil!", "#ff9a4a"], [24, "Cauldron Critical!", "#ff5ca8"], [60, "Unholy Recipe!", "#b45cff"], [140, "The Pot Is Screaming", "#7ef0ff"]];
const ST_ICON = { burn: ["ember", "Burn"], chill: ["rime", "Chill"], hex: ["hex", "Hex"], doom: ["doom", "Doom"] };
const PST = { weak: ["Weak", "Your ingredients are 25% weaker."], frail: ["Frail", "You gain 25% less Ward."], lid: ["Lidded", "One less space in the pot next turn."], drain: ["Drained", "One less Heat next turn."], scald: ["Scald", "You lose this much HP at the end of your turn."] };

export function combatScene(game) {
    game.scene("combat", (s, args) => {
        if (args?.demo && !G.run?.combat) G.demoRun(args);
        const run = G.run;
        if (!run?.combat) { game.go("title"); return; }
        const fx = new Fx(), c = run.combat, kind = c.kind;
        const V = {
            en: [], hand: [], cards: new Map(), tokens: [], tokVis: new Map(), flights: [], dissolves: [], later: [], q: [], qT: 0, busy: false, fires: 0, totalShown: 0, potShown: 1, nextShown: 1, tier: -1, tierT: 0, banner: null,
            hover: -1, press: null, drag: null, liq: toRgb("#37b89c"), liqT: toRgb("#37b89c"), agit: 0.3, bubbles: [], pv: null, primed: [], chipBoxes: [], enBoxes: [], stBoxes: [], trBoxes: [], heatPulse: 0, hurt: 0, witchKick: 0, stir: 0, fast: 1, shakeHold: 0, recipe: null, php: run.hp, pward: c.p.ward, heat: c.heat, flare: c.flare ?? 0, pst: { ...c.p.st }, pile: { draw: c.draw.length, disc: c.disc.length }, ended: false, hueT: 0, tut: 0, tutT: 0, intro: 0.8, ring: 0,
        };
        for (const e of c.enemies) V.en.push(enVis(e));
        warm([...c.draw, ...c.hand].map((k) => k.id));
        for (const k of c.hand) addHand(k, -1);
        V.pv = S.preview(run); V.primed = S.primed(c, run.witch);
        if (run.tutorial && !G.meta.tutorial) { V.tut = 1; }
        song(kind === "boss" ? "boss" : "combat");
        const lead = c.enemies.find((e) => e.boss || e.elite);
        if (lead && c.turn === 1 && !args?.resume) { const d = ENEMIES[lead.id]; V.introText = [lead.name, d.rule ?? d.blurb]; V.intro = lead.boss ? 3.2 : 2; if (lead.boss) s.wait(0.2, () => G.snd.toll()); } else V.intro = 0;

        function enVis(e) { return { id: e.id, hp: e.hp, maxHp: e.maxHp, ward: e.ward, st: { ...e.st }, move: e.move, str: e.str, x: 0, y: 0, size: 120, shake: 0, flash: 0, lunge: 0, dead: e.hp <= 0 ? 1 : 0, dying: 0, ph: rnd() * 6, in: 0, name: e.name, boss: e.boss, elite: e.elite }; }
        function addHand(k, i) {
            const L = layout();
            V.hand.push(k);
            V.cards.set(k.u, { x: L.pileX, y: L.handY + 20, rot: -0.5, tx: 0, ty: 0, lift: 0, s: 0.6, delay: i >= 0 ? i * 0.07 : V.hand.length * 0.05, vr: 0 });
        }
        // ---- Layout: one function for every screen shape ----
        function layout() {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, bot = game.view.safe.bottom, land = W > H * 1.05, sl = game.view.safe.left, sr = game.view.safe.right;
            const L = { W, H, top, bot, land, sl, sr };
            if (land) {
                L.cw = clamp(H * 0.27, 90, 116); L.ch = L.cw * ASPECT;
                L.handX = W * 0.5; L.handY = H - bot - L.ch * 0.44; L.handTop = H - bot - L.ch * 0.92;
                L.S = clamp((L.handTop + 30 - 44 - top) / 240, 0.5, 0.8); L.potX = W * 0.31; L.rimY = 56 + top + 60 * L.S;
                L.foeX = W * 0.74; L.foeW = W * 0.46; L.foeY = 44 + top + (L.handTop - 44 - top) * 0.46; L.foeMax = clamp(L.handTop - 92 - top, 80, 150);
                L.witchS = 0.46; L.witchX = Math.max(44 + sl, L.potX - 196 * L.S); L.witchY = L.rimY + 40 * L.S;
                L.pileX = 26 + sl; L.discX = W - 26 - sr; L.pileY = H - bot - 56; L.heatX = L.potX + 192 * L.S; L.heatY = L.rimY + 4; L.brewX = W * 0.5 + 40; L.brewY = L.handTop - 36; L.pvY = L.rimY - 50 * L.S;
            } else {
                L.cw = clamp(W * 0.265, 88, 124); L.ch = L.cw * ASPECT;
                L.handX = W / 2; L.handY = H - bot - L.ch * 0.46; L.handTop = H - bot - L.ch * 0.96;
                L.S = Math.min((W - 60) / 330, (H * 0.27) / 220, 0.92); L.potX = W / 2 + 22; L.rimY = L.handTop - 118 * L.S - 34;
                L.foeX = W / 2; L.foeW = W - 12; L.foeY = (72 + top + L.rimY - 58 * L.S) / 2 + 2; L.foeMax = clamp(L.rimY - 58 * L.S - 104 - top, 96, 176);
                L.witchS = clamp(L.S * 0.5, 0.36, 0.5); L.witchX = 8 + 90 * L.witchS; L.witchY = L.rimY + 12;
                L.pileX = 22; L.discX = W - 22; L.pileY = L.handTop - 14; L.heatX = 72; L.heatY = L.handTop - 26; L.brewX = W - 96; L.brewY = L.handTop - 22; L.pvY = L.rimY - 66 * L.S - 8;
            }
            L.potW = 122 * L.S; L.potH = 33 * L.S;
            const alive = V.en.filter((e) => e.dead < 1), n = Math.max(1, alive.length), sz = Math.min(L.foeMax, L.foeW / n * 0.96, alive.some((e) => e.boss) ? 190 : 150);
            alive.forEach((e, i) => { e.tx = L.foeX + (i - (n - 1) / 2) * Math.min(L.foeW / n, sz * 1.04); e.ty = L.foeY; e.size = e.boss ? sz * 1.1 : sz; });
            return L;
        }
        function tokenPos(L, i, n) {
            const cap = Math.max(n, S.potSize(run, run.combat ?? c)), sp = Math.min(L.potW * 1.82 / Math.max(1, cap - 1), 58 * L.S), x = L.potX + (i - (cap - 1) / 2) * sp;
            return { x, sp, size: Math.min(46 * L.S, sp * 0.92) };
        }
        // ---- Sim wrappers ----
        const cc = () => run.combat;
        function refresh() {
            const cur = cc();
            if (!cur) return;
            V.pv = S.preview(run); V.primed = S.primed(cur, run.witch); V.heat = cur.heat;
            mixLiquid();
            saveRun();
        }
        function mixLiquid() {
            const cur = cc(); if (!cur) return;
            const b = cur.brew;
            if (!b.length) { V.liqT = toRgb("#37b89c"); return; }
            const m = [0, 0, 0];
            for (const t of b) { const q = toRgb(hex(t.el)); m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }
            V.liqT = m.map((v) => v / b.length);
        }
        function placeCard(idx, pos, from) {
            const cur = cc(), card = V.hand[idx], sIdx = cur.hand.findIndex((k) => k.u === card.u);
            if (sIdx < 0 || !S.canPlace(run, cur.hand[sIdx])) { G.snd.deny(); shakeCard(card); hintWhy(card); return false; }
            const before = V.primed.length, d = CARDS[card.id], vis = V.cards.get(card.u), L = layout();
            const ev = S.place(run, sIdx, pos);
            V.hand.splice(idx, 1); V.hover = -1;
            const n = cur.brew.length, i = cur.brew.findIndex((t) => t.u === card.u);
            const to = i >= 0 ? tokenPos(L, i, n) : { x: L.potX, size: 40 * L.S };
            V.flights.push({ card, x: from?.x ?? vis.x, y: from?.y ?? vis.y, x0: from?.x ?? vis.x, y0: from?.y ?? vis.y, x1: to.x, y1: L.rimY, rot: vis.rot, w: L.cw * (vis.s ?? 1), t: 0, dur: 0.24, u: card.u, el: d.el, inst: !!d.instant, vr: (from?.vx ?? 0) * 0.002 });
            V.cards.delete(card.u);
            if (i >= 0) V.tokVis.set(card.u, { appear: -0.24, x: to.x, y: L.rimY, pop: 0 });
            G.snd.fling();
            if (d.instant) { V.q.push(...ev); V.busy = V.q.length > 0; V.afterQ = () => { syncHand(); refresh(); }; }
            refresh();
            if (V.primed.length > before) V.primedSound = 0.2;
            if (V.tut) tutStep();
            return true;
        }
        function hintWhy(card) {
            const cur = cc();
            if (S.costOf(cur, card, run) > cur.heat) banner("Not enough Heat", "#ffb04a", 0.7);
            else banner("The pot is full", "#ffb04a", 0.7);
        }
        function syncHand() {
            const cur = cc(); if (!cur) return;
            for (const k of cur.hand) if (!V.cards.has(k.u)) { const L = layout(); V.hand.push(k); V.cards.set(k.u, { x: L.pileX, y: L.handY, rot: -0.4, tx: 0, ty: 0, lift: 0, s: 0.6, delay: 0 }); }
            V.hand = V.hand.filter((k) => cur.hand.some((q) => q.u === k.u));
            V.hand.sort((a, b) => cur.hand.findIndex((q) => q.u === a.u) - cur.hand.findIndex((q) => q.u === b.u));
        }
        function takeBack(i) {
            const cur = cc(), t = cur.brew[i], L = layout();
            if (!t) return;
            if (t.stock) { tip("Old Stock", "This one stays and stews. It comes back stronger each turn."); return; }
            if (t.stuck) { if (cur.heat < 1) { G.snd.deny(); banner("Skimming costs 1 Heat", "#ffb04a", 0.8); return; } }
            const pos = tokenPos(L, i, cur.brew.length);
            if (!S.unplace(run, i)) return;
            G.snd.unplop();
            V.tokVis.delete(t.u);
            fx.puff(pos.x, L.rimY, hex(t.el), 3);
            if (!t.stuck) {
                V.hand.push(cur.hand[cur.hand.length - 1]);
                V.cards.set(t.u, { x: pos.x, y: L.rimY, rot: 0, tx: 0, ty: 0, lift: 0, s: 0.4, delay: 0 });
            }
            refresh();
        }
        function shakeCard(card) { const v = V.cards.get(card.u); if (v) v.wob = 1; }
        function banner(text, color, life = 1.1, size = 24) { V.banner = { text, color, t: 0, life, size }; }
        // ---- Brew ----
        function doBrew() {
            const cur = cc();
            if (V.busy || !cur || cur.over) return;
            if (!cur.brew.length) { banner("Fling an ingredient in first", "#ffd27a", 0.9); G.snd.deny(); return; }
            brewNow();
        }
        function endTurnEmpty() { if (!V.busy && cc() && !cc().over) brewNow(); }
        function brewNow() {
            const cur = cc();
            V.tokens = cur.brew.map((t) => ({ ...t }));
            V.tokLock = true;
            V.busy = true; V.fires = 0; V.totalShown = 0; V.potShown = 1; V.nextShown = 1; V.tier = -1; V.fast = 1; V.handBefore = V.hand.slice();
            V.potShown = 1 + (cur.seedPot ?? 0);
            V.q = S.brew(run);
            V.afterQ = finishResolve;
            V.qT = 0.1;
            saveRun();
            if (V.tut) { V.tut = 0; G.meta.tutorial = true; saveMeta(); }
        }
        function finishResolve() {
            V.busy = false; V.tokLock = false; V.hover = -1;
            for (const e of V.en) if (e.dead > 0 && e.dead < 1) e.dead = 1;
            const cur = cc();
            if (run.screen !== "combat") return;
            V.en = cur.enemies.map((e, i) => {
                const o = V.en[i];
                if (o && o.id === e.id) { o.hp = e.hp; o.ward = e.ward; o.st = { ...e.st }; o.move = e.move; o.str = e.str; return o; }
                return enVis(e);
            });
            V.php = run.hp; V.pward = cur.p.ward; V.heat = cur.heat; V.pst = { ...cur.p.st };
            syncHand();
            refresh();
        }
        function spawnBlob(from, toX, toY, color, delay, fn) {
            V.later.push({ t: delay, fn });
            fx.spark(from.x, from.y, color, { a: Math.atan2(toY - from.y, toX - from.x), sp: Math.hypot(toX - from.x, toY - from.y) / delay, g: 0, drag: 1, life: delay, s: 11 });
        }
        function tempo() { return Math.max(0.034, 0.3 * Math.pow(0.935, V.fires)) / V.fast; }
        function tokenAt(i) { const L = layout(); return { x: tokenPos(L, i, V.tokens.length).x, y: L.rimY }; }
        function setTier() {
            let t = -1;
            TIERS.forEach((q, i) => { if (V.fires >= q[0]) t = i; });
            if (t > V.tier) {
                V.tier = t;
                const q = TIERS[t];
                banner(q[1], q[2], 1.2, 26 + t * 3);
                G.snd.tier(t);
                s.flash(q[2], 0.16); s.shake(3 + t * 2, 0.3);
                if (t >= 2) song("frenzy");
                const L = layout();
                fx.burst(L.potX, L.rimY, [q[2], "#fff"], 18 + t * 8, { sp: 160 + t * 60, g: 120 });
            }
        }
        function ev(e) {
            const L = layout(), cur = run.combat;
            switch (e.t) {
                case "brewStart": V.stir = 1; G.snd.whoosh(); V.agit = 1; V.witchKick = -0.6; return 0.24;
                case "rx": {
                    const a = tokenAt(e.i), l = e.l >= 0 ? tokenAt(e.l) : a, x = (a.x + l.x) / 2;
                    const fresh = !G.meta.reactions[e.key];
                    if (fresh) { G.meta.reactions[e.key] = 1; saveMeta(); banner(`New reaction: ${e.name}!`, e.color, 1.3, 24); G.snd.unlock(); }
                    // At speed, names would pile into mush, so only some of them speak up.
                    if (tempo() > 0.13 || fresh || V.fires % 4 === 0) fx.num(x + (rnd() - 0.5) * 24, L.rimY - 40 * L.S - rnd() * 34, `${e.name}!`, e.color, { size: 19 + Math.min(7, V.fires * 0.2), life: tempo() > 0.13 ? 0.7 : 0.42, vy: -70, pop: 1.8 });
                    V.liqT = toRgb(e.color); V.agit = Math.min(3, V.agit + 0.6); V.rxPulse = 1;
                    fx.ring(x, L.rimY, e.color, 80 * L.S);
                    if (e.key === "ember>brine" || e.key.includes("rime") || e.key === "moss>brine") fx.puff(x, L.rimY - 8, "#e6f6ff", 5);
                    else fx.puff(x, L.rimY - 6, e.color, 3);
                    fx.burst(x, L.rimY, e.color, 8, { sp: 120, g: 200, s: 5 });
                    G.snd.reaction(V.fires);
                    return tempo() * 1.05;
                }
                case "fire": {
                    V.fires = e.n; const a = tokenAt(e.i), v = V.tokens[e.i], tv = v && V.tokVis.get(v.u);
                    if (tv) tv.pop = 1;
                    V.potShown = e.pot; V.nextShown = e.mult;
                    G.snd.fire(e.n, e.el);
                    fx.burst(a.x, a.y, hex(e.el), 3 + Math.min(6, e.n >> 2), { sp: 90, g: 160, s: 4 });
                    fx.spark(a.x, a.y - 8, hex(e.el), { sp: 0, g: 0, life: 0.2, s: 26 });
                    setTier();
                    return tempo();
                }
                case "hit": {
                    const en = V.en[e.e], from = V.tokens.length ? tokenAt(Math.max(0, Math.min(V.tokens.length - 1, 0))) : { x: L.potX, y: L.rimY };
                    if (!en) return 0;
                    const src = { x: L.potX + (rnd() - 0.5) * 60, y: L.rimY - 8 };
                    V.totalShown += e.v;
                    spawnBlob(src, en.x, en.y, hex(e.el ?? "ember"), 0.1, () => {
                        en.hp = e.hp; en.ward = e.ward; en.shake = Math.min(1, en.shake + 0.6); en.flash = 1;
                        const sz = clamp(18 + Math.log10(Math.max(1, e.v)) * 8, 18, 46);
                        fx.num(en.x + (rnd() - 0.5) * en.size * 0.5, en.y - en.size * 0.15, e.blocked === e.v ? "Blocked" : fmt(e.v), e.big ? "#ffe066" : "#fff6dc", { size: sz });
                        fx.burst(en.x, en.y, [hex(e.el ?? "ember"), "#fff"], e.big ? 12 : 5, { sp: e.big ? 240 : 150, s: 5 });
                        G.snd.hit(e.big);
                        if (e.big) { s.shake(Math.min(10, 3 + e.v / 60), 0.14); s.freeze(Math.min(0.08, 0.03 + e.v / 4000)); }
                    });
                    return 0.004;
                }
                case "miss": V.totalShown += e.v; return 0;
                case "die": {
                    const en = V.en[e.e]; if (!en) return 0;
                    V.later.push({ t: 0.12, fn: () => {
                        en.hp = 0; en.dying = 1; G.snd.die();
                        fx.burst(en.x, en.y, ["#fff", "#ffd27a", "#b45cff"], 26, { sp: 240, g: 80 });
                        fx.puff(en.x, en.y, "#3a2a4a", 8);
                        if (e.doom) { fx.num(en.x, en.y - 30, "DOOMED", "#ff6b9a", { size: 28, life: 1.1 }); }
                        s.shake(5, 0.2); s.freeze(0.06);
                    } });
                    return 0.02;
                }
                case "ward": V.pward = e.ward; V.wardPulse = 1; G.snd.ward(); if (tempo() > 0.1) fx.num(L.witchX + 44, L.witchY - 30, `+${fmt(e.v)}`, COLORS.ward, { size: 18 }); fx.burst(L.witchX, L.witchY, "#8fd6ff", 5, { sp: 80, s: 5 }); return 0.01;
                case "heal": if (e.v > 0) { V.php = e.hp; G.snd.heal(); fx.num(L.witchX + 44, L.witchY - 12, `+${e.v}`, COLORS.green, { size: 18 }); } return 0.01;
                case "lose": V.php = e.hp; V.hurt = 0.5; fx.num(L.witchX + 44, L.witchY - 12, `-${e.v}`, COLORS.red, { size: 18 }); return 0.02;
                case "gold": G.snd.coin(); if (tempo() > 0.1) fx.num(L.potX + (rnd() - 0.5) * 80, L.rimY - 30, `${e.v > 0 ? "+" : ""}${e.v} gold`, COLORS.gold, { size: 15 }); return 0.01;
                case "status": {
                    const en = V.en[e.e]; if (!en) return 0;
                    en.st[e.k] = e.v; en.stPulse = 1;
                    return 0;
                }
                case "strip": { const en = V.en[e.e]; if (en) en.ward = 0; return 0; }
                case "pot": if (e.v > V.potShown) { V.potShown = e.v; V.potPulse = 1; G.snd.potency(V.potShown); } return 0.012;
                case "next": V.nextShown = e.v; V.nextPulse = 1; return 0.01;
                case "reflux": V.ring = 1; G.snd.reflux(); { if (tempo() > 0.12) fx.num(L.potX, L.rimY - 8, `Reflux ${e.n}`, "#7ef0c8", { size: 18, pop: 1.4 }); const c2 = "#7ef0c8"; fx.ring(L.potX, L.rimY, c2, 150 * L.S, 0.5); } V.agit = Math.min(3, V.agit + 0.5); return tempo() * 0.8;
                case "ring": fx.num(L.potX, L.rimY + 8, "The Ring turns", "#d7b8ff", { size: 18 }); fx.ring(L.potX, L.rimY, "#b45cff", 160 * L.S, 0.5); V.ring = 1; return tempo();
                case "flare": G.snd.tier(1); s.flash("#ff9a4a", 0.14); banner("Flare! +1 Potency", "#ffb04a", 0.8); fx.burst(L.potX, L.rimY + 30, ["#ffd25a", "#ff7a2f"], 26, { sp: 240 }); return tempo();
                case "flareTick": V.flare = e.v; return 0;
                case "fizzle": return 0;
                case "boilover": G.snd.boilover(); s.flash("#ffffff", 0.5); s.shake(16, 0.9); banner("BOIL OVER!", "#7ef0ff", 2.2, 44); V.agit = 4; for (let i = 0; i < 40; i++) fx.spark(L.potX + (rnd() - 0.5) * 200, L.rimY, ["#7ef0ff", "#ff5ca8", "#ffe066"][i % 3], { a: -1.57 + (rnd() - 0.5), sp: 300 + rnd() * 300, g: 420, s: 8 }); return 0.8;
                case "trinket": V.trFlash = e.id; V.trFlashT = 0.5; return 0;
                case "note": fx.num(L.potX, L.rimY - 56 * L.S, e.text, "#ffe9b8", { size: 14 }); return 0.05;
                case "heat": V.heat = e.v; V.heatPulse = 1; return 0.04;
                case "brewEnd": {
                    for (const t of V.tokens) { const tv = V.tokVis.get(t.u), a = tv ? { x: tv.x, y: tv.y } : { x: L.potX, y: L.rimY }; if (!t.stock || t.stuck) fx.burst(a.x, a.y, hex(t.el), 6, { sp: 80, s: 4 }); }
                    const st = V.tokens.at(-1), keep = run.witch === "thistle" ? [...V.tokens].reverse().find((t) => t.el !== "gunk") : null;
                    V.tokens.forEach((t) => { if (!keep || t.u !== keep.u) V.tokVis.delete(t.u); });
                    V.tokens = [];
                    V.tokLock = false;
                    const big = e.fires >= 6 || e.total >= 60;
                    if (e.total > 0) G.snd.pour(e.total);
                    if (V.tier >= 2) song(kind === "boss" ? "boss" : "combat");
                    if (big) {
                        const name = recipeName(e.recipe), best = e.total > (G.meta.best?.dmg ?? 0);
                        if (best) { G.meta.best = { dmg: e.total, fires: e.fires, pot: e.pot, recipe: e.recipe, name }; saveMeta(); }
                        V.recipe = { name, total: e.total, fires: e.fires, pot: e.pot, t: 0, life: 1.5 + Math.min(1, V.tier * 0.2), best: best && e.total >= 40 };
                        s.shake(Math.min(14, 4 + V.tier * 2), 0.35);
                        return 1.3 / Math.max(1, V.fast * 0.7);
                    }
                    return 0.24;
                }
                case "discard": {
                    const keepU = new Set((cc()?.hand ?? []).map((k) => k.u));
                    for (const k of V.hand) if (!keepU.has(k.u)) { const v = V.cards.get(k.u); if (v) V.dissolves.push({ card: k, x: v.x, y: v.y, w: L.cw, rot: v.rot, t: 0, life: 0.4, vy: 0, vx: 90 }); V.cards.delete(k.u); }
                    V.hand = V.hand.filter((k) => keepU.has(k.u));
                    return 0.12;
                }
                case "scald": V.php = e.hp; V.hurt = 0.5; fx.num(L.witchX + 44, L.witchY - 12, `-${e.v}`, "#ff9a4a", { size: 20 }); G.snd.ouch(false); return 0.25;
                case "burnTick": {
                    const en = V.en[e.e]; if (!en) return 0;
                    en.hp = e.hp; en.shake = 0.5;
                    fx.num(en.x, en.y - 10, fmt(e.v), "#ff9a4a", { size: 22 });
                    for (let i = 0; i < 8; i++) fx.spark(en.x + (rnd() - 0.5) * en.size * 0.6, en.y + en.size * 0.3, "#ff7a2f", { a: -1.57, sp: 120, g: -120, s: 8 });
                    G.snd.hit(false);
                    return 0.26;
                }
                case "stunned": { const en = V.en[e.e]; if (en) fx.num(en.x, en.y - en.size * 0.5, "Stunned", "#bfeaff", { size: 18 }); return 0.3; }
                case "stumble": { const en = V.en[e.e]; if (en) { fx.num(en.x, en.y - en.size * 0.5, "Stumbles!", "#ffe066", { size: 22 }); G.snd.toll(); s.shake(6, 0.3); } return 0.5; }
                case "freeze": s.flash("#bfeaff", 0.2); return 0.1;
                case "second": banner("Second Boil!", "#ffe066", 1.1, 30); G.snd.tier(2); return 0.5;
                case "act": {
                    const en = V.en[e.e]; if (!en) return 0;
                    en.lunge = 1; en.actName = e.name; en.actT = 0.8;
                    return 0.24;
                }
                case "ehit": {
                    const en = V.en[e.e], pct = e.v - e.blocked;
                    V.pward = e.ward; V.php = e.hp;
                    if (en) en.lunge = Math.max(en.lunge, 0.7);
                    if (pct > 0) { V.hurt = Math.min(1, 0.4 + pct / 25); s.shake(clamp(2 + pct / 3, 2, 12), 0.22); s.flash("#b0123a", 0.1); fx.num(L.witchX + 50, L.witchY - 20, `-${pct}`, COLORS.red, { size: clamp(20 + pct / 2, 20, 40) }); G.snd.ouch(pct >= 15); fx.burst(L.witchX, L.witchY, ["#ff5a5a", "#fff"], 10, { sp: 170 }); }
                    if (e.blocked > 0) { fx.num(L.witchX + 50, L.witchY + 8, `Blocked ${e.blocked}`, COLORS.ward, { size: 14 }); G.snd.ward(); fx.burst(L.witchX, L.witchY, "#8fd6ff", 6, { sp: 120 }); }
                    return 0.24;
                }
                case "eheal": { const en = V.en[e.e]; if (en) { en.hp = e.hp; fx.num(en.x, en.y - 20, "Heals", COLORS.green, { size: 16 }); } return 0.1; }
                case "eward": { const en = V.en[e.e]; if (en) { en.ward = e.ward; fx.num(en.x, en.y - 20, `+${e.ward}`, COLORS.ward, { size: 16 }); } G.snd.ward(); return 0.1; }
                case "ebuff": { const en = V.en[e.e]; if (en) { en.str = e.str; fx.num(en.x, en.y - 40, "Stronger", "#ff9a4a", { size: 16 }); } G.snd.status(); return 0.12; }
                case "pstatus": V.pst[e.k] = e.v; fx.num(L.witchX + 44, L.witchY - 44, PST[e.k]?.[0] ?? e.k, "#ffb0c0", { size: 15 }); G.snd.status(); return 0.15;
                case "addGunk": { const en = V.en[e.e]; if (en) fx.num(en.x, en.y, `Gunk ×${e.n} in your deck`, "#b5b283", { size: 14 }); fx.burst(L.pileX, L.pileY, "#b5b283", 6, { sp: 80 }); return 0.22; }
                case "potGunk": { const en = V.en[e.e]; if (en) fx.num(L.potX, L.rimY - 30, `Gunk in the pot!`, "#b5b283", { size: 16 }); fx.puff(L.potX, L.rimY, "#7c7a52", 6); G.snd.plop("gunk"); return 0.24; }
                case "summon": { const n = cc()?.enemies[e.e]; if (n) { V.en[e.e] = enVis(n); V.en[e.e].in = 1; } return 0.3; }
                case "revive": V.php = e.hp; s.flash("#ff8ab0", 0.4); banner("Bottled Familiar!", "#ff8ab0", 1.3, 28); G.snd.unlock(); return 0.8;
                case "intent": { const en = V.en[e.e]; if (en) en.move = e.move; return 0; }
                case "shuffle": G.snd.page(); return 0.05;
                case "draw": {
                    const cur2 = cc();
                    if (!cur2) return 0;
                    e.cards.forEach((u, i) => { const k = cur2.hand.find((q) => q.u === u); if (k && !V.cards.has(u)) addHand(k, i); });
                    return 0.08;
                }
                case "turn": V.heat = e.heat; V.pward = e.ward; V.heatPulse = 1; V.pst = { ...(cc()?.p.st ?? {}) }; V.turnFlash = 1; return 0.05;
                case "instant": G.snd.reaction(3); return 0.2;
                case "win": V.ended = true; V.endT = 0.9; G.snd.win(); banner(kind === "boss" ? "Boss slain!" : "Victory", "#ffe066", 1.2, 32); return 0.8;
                case "defeat": V.ended = true; V.endT = 1.3; G.snd.lose(); s.flash("#000", 0.6); return 1;
            }
            return 0;
        }
        // ---- Tutorial ----
        function tutStep() {
            const b = cc()?.brew ?? [];
            V.tut = b.length === 0 ? 1 : b.length === 1 ? 2 : b.length === 2 ? 3 : 4;
            V.tutT = 0;
        }
        const TUT = { 1: "Fling Ember Spark into the pot", 2: "Now Brine Drop on top: Ember then Brine makes Steam", 3: "Steam doubles what's next. One more Ember!", 4: "Tap BREW and watch it go" };
        const tutIndex = () => { const want = { 1: "spark", 2: "droplet", 3: "spark" }[V.tut]; return V.hand.findIndex((k) => k.id === want); };
        // ---- Input ----
        const handBase = (L, i, n) => {
            const span = Math.min(L.land ? L.W * 0.62 : L.W - 28 - L.cw * 0.5, (n - 1) * L.cw * 0.74), x0 = L.handX - span / 2, sp = n > 1 ? span / (n - 1) : 0, c = (n - 1) / 2, off = (i - c);
            const rot = off * Math.min(0.1, 0.42 / Math.max(1, n)), y = L.handY + off * off * 2.2;
            return { x: x0 + i * sp, y, rot, sp };
        };
        function hitHand(L, x, y) {
            if (y < L.handTop - 6) return -1;
            const n = V.hand.length; let best = -1, bd = 1e9;
            for (let i = 0; i < n; i++) { const b = handBase(L, i, n), dd = Math.abs(x - b.x); if (dd < bd) { bd = dd; best = i; } }
            return bd < L.cw * 0.7 ? best : -1;
        }
        function hitToken(L, x, y) {
            const cur = cc(); if (!cur) return -1;
            if (Math.abs(y - L.rimY) > 34 * L.S + 8) return -1;
            for (let i = 0; i < cur.brew.length; i++) { const p = tokenPos(L, i, cur.brew.length); if (Math.abs(x - p.x) < p.sp * 0.5 + 2) return i; }
            return -1;
        }
        function insertAt(L, x) {
            const cur = cc(), n = cur.brew.length;
            for (let i = 0; i < n; i++) if (x < tokenPos(L, i, Math.max(n, 1)).x) return i;
            return n;
        }
        function input(dt, L) {
            const p = s.input.pointer, touch = s.input.touchMode;
            if (G.overlay) { V.press = null; V.drag = null; return; }
            for (const k of hurryKeys()) {
                const m = /^Digit([1-9])$/.exec(k);
                if (m && !V.busy) { const i = +m[1] - 1; if (V.hand[i]) placeCard(i); }
                if (k === "Escape") settings();
                if (k === "KeyD") deckView("Your deck", run.deck);
                if (k === "KeyZ" && V.hover >= 0) zoom(V.hand[V.hover]);
                if (k === "Backspace" && !V.busy) { const n = cc()?.brew.length ?? 0; if (n) takeBack(n - 1); }
                if ((k === "ArrowLeft" || k === "ArrowRight") && V.hand.length) { V.hover = clamp((V.hover < 0 ? 0 : V.hover) + (k === "ArrowLeft" ? -1 : 1), 0, V.hand.length - 1); G.snd.notch(V.hover); }
                if (k === "ArrowUp" && V.hover >= 0 && !V.busy) placeCard(V.hover);
            }
            if (V.busy) {
                if (p.pressed) V.fast = Math.min(4, V.fast * 2);
                V.press = null; if (V.drag) { V.drag = null; }
                return;
            }
            // Mouse hover without a press: the hand parts like a real one.
            if (!touch && !p.down && !V.drag) {
                const h = hitHand(L, p.x, p.y);
                if (h !== V.hover && (h >= 0 || V.mouseMoved)) { if (h >= 0) G.snd.notch(h); V.hover = h; }
                V.mouseMoved = p.dx !== 0 || p.dy !== 0;
            }
            if (p.pressed) {
                const h = hitHand(L, p.x, p.y), tk = hitToken(L, p.x, p.y);
                const chip = V.chipBoxes.find((b) => Math.abs(p.x - b.x) < b.w / 2 + 2 && Math.abs(p.y - b.y) < 12);
                const st = V.stBoxes.find((b) => Math.abs(p.x - b.x) < 13 && Math.abs(p.y - b.y) < 13);
                const tr = V.trBoxes.find((b) => Math.hypot(p.x - b.x, p.y - b.y) < 16);
                const pile = Math.abs(p.y - L.pileY) < 26 ? (Math.abs(p.x - L.pileX) < 24 ? "draw" : Math.abs(p.x - L.discX) < 24 ? "disc" : null) : null;
                if (pile) { const cur = cc(); deckView(pile === "draw" ? "Draw pile (shuffled)" : "Discard pile", (pile === "draw" ? [...cur.draw].sort((a, b) => a.id.localeCompare(b.id)) : cur.disc)); return; }
                if (st) { tip(st.title, st.text); return; }
                if (tr) { trinketTip(tr.id); return; }
                if (chip) { const r = REACTIONS[chip.key]; tip(r.name, r.text, { sub: `${ELEMENTS[chip.key.split(">")[0]].name} then ${ELEMENTS[chip.key.split(">")[1]].name}` }); return; }
                if (h >= 0) { V.press = { kind: "hand", x: p.x, y: p.y, t: 0, moved: 0, idx: h }; if (h !== V.hover) { V.hover = h; G.snd.notch(h); } G.snd.lift(); }
                else if (tk >= 0) V.press = { kind: "tok", x: p.x, y: p.y, t: 0, moved: 0, idx: tk };
                else {
                    const en = V.enBoxes.find((b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2);
                    if (en) { V.press = { kind: "foe", x: p.x, y: p.y, t: 0, moved: 0, idx: en.i }; }
                }
            }
            if (V.press) {
                const q = V.press; q.t += dt;
                q.moved = Math.max(q.moved, Math.hypot(p.x - q.x, p.y - q.y));
                if (q.kind === "hand" && p.down) {
                    if (!V.drag) {
                        const h = hitHand(L, p.x, Math.max(p.y, L.handTop + 4));
                        if (h >= 0 && h !== V.hover && p.y > L.handTop - 10) { V.hover = h; q.idx = h; q.t = 0; G.snd.notch(h); }
                        if (q.y - p.y > 26 && V.hover >= 0) {
                            const k = V.hand[V.hover], vis = V.cards.get(k.u);
                            V.drag = { idx: V.hover, u: k.u, x: vis.x, y: vis.y, vx: 0, vy: 0, rot: vis.rot, gx: p.x - vis.x, gy: p.y - vis.y };
                            G.snd.lift();
                        } else if (q.t > 0.36 && q.moved < 12) {
                            const k = V.hand[V.hover];
                            V.press = null;
                            if (k) zoom(k);
                            return;
                        }
                    }
                }
                if (q.kind === "tok" && p.down && q.t > 0.36 && q.moved < 10) { const t = cc().brew[q.idx]; V.press = null; if (t) zoom(t); return; }
                if (q.kind === "foe" && p.down && q.t > 0.36 && q.moved < 10) { V.press = null; foeInfo(q.idx); return; }
            }
            if (V.drag) {
                const dr = V.drag, tx = p.x - dr.gx * 0.3, ty = p.y - dr.gy * 0.3;
                // Spring with mass: the card lags and swings behind the finger.
                const ax = (tx - dr.x) * 260 - dr.vx * 22, ay = (ty - dr.y) * 260 - dr.vy * 22;
                dr.vx += ax * dt; dr.vy += ay * dt; dr.x += dr.vx * dt; dr.y += dr.vy * dt;
                dr.rot += (clamp(dr.vx * 0.0012, -0.6, 0.6) - dr.rot) * Math.min(1, dt * 12);
                dr.over = dr.y < L.handTop - 4 && Math.abs(dr.x - L.potX) < L.potW * 1.5;
                dr.ins = insertAt(L, dr.x);
            }
            if (p.released) {
                const q = V.press;
                if (V.drag) {
                    const dr = V.drag;
                    V.drag = null; V.press = null;
                    const idx = V.hand.findIndex((k) => k.u === dr.u);
                    const flung = dr.vy < -420 || dr.y < L.handTop - 30;
                    if (flung && idx >= 0) { const pos = dr.over ? dr.ins : undefined; const v = V.cards.get(dr.u); if (v) { v.x = dr.x; v.y = dr.y; v.rot = dr.rot; v.s = 1.25; } placeCard(idx, pos, { x: dr.x, y: dr.y, vx: dr.vx }); }
                    else G.snd.snapBack();
                    if (idx >= 0) { const v = V.cards.get(dr.u); if (v) { v.x = dr.x; v.y = dr.y; v.rot = dr.rot; } }
                } else if (q) {
                    V.press = null;
                    if (q.moved < 14) {
                        if (q.kind === "hand" && V.hover >= 0) placeCard(V.hover);
                        if (q.kind === "tok") takeBack(q.idx);
                        if (q.kind === "foe") { const cur = cc(); if (cur.target !== q.idx) { cur.target = q.idx; G.snd.notch(q.idx); refresh(); const en = V.en[q.idx]; en.flash = 0.4; } else foeInfo(q.idx); }
                    }
                    if (touch) V.hover = -1;
                } else if (touch) V.hover = -1;
            }
        }
        function foeInfo(i) {
            const e = V.en[i], cur = cc(), real = cur.enemies[i]; if (!e || !real) return;
            const d = ENEMIES[e.id], m = S.moveOf(real);
            const lines = [];
            if (m) lines.push(`Next: ${m.n}. ${describeMove(m, S.intentDamage(run, cur, real))}`);
            if (d.rule) lines.push(d.rule);
            if (real.str) lines.push(`Stronger by ${real.str}.`);
            tip(`${e.name}${d.title ? `, ${d.title}` : ""}`, `${d.blurb} ${lines.join(" ")}`, { sprite: `foe_${e.id}` });
        }
        function describeMove(m, dmg) {
            const p = [];
            if (m.dmg) p.push(m.hits > 1 ? `Hits for ${dmg}, ${m.hits} times.` : `Hits for ${dmg}.`);
            if (m.ward) p.push(`Gains ${m.ward} Ward.`);
            if (m.heal) p.push(`Heals ${m.heal}.`);
            if (m.buff?.str) p.push(`Grows ${m.buff.str} stronger.`);
            if (m.status) for (const k in m.status) p.push(`${PST[k]?.[0] ?? k} ${m.status[k]}: ${PST[k]?.[1] ?? ""}`);
            if (m.add?.gunk) p.push(`Adds ${m.add.gunk} Gunk to your discard.`);
            if (m.pot) p.push(`Tosses ${m.pot} Gunk into your pot.`);
            if (m.summon) p.push("Calls for help.");
            if (m.forbid) { const f = cc().forbid; if (f) p.push(`${ELEMENTS[f].name} is forbidden this turn.`); }
            return p.join(" ");
        }
        // ---- Buttons ----
        hudEntity(s, () => ({ ...run, hp: V.php }));
        const brewBtn = s.add([ui(), spellBtn("BREW", { width: 104, height: 50, size: 20, color: "#c0401e", action: "confirm", onTap: doBrew, quiet: true, radius: 25 }), { name: "brew" }]);
        const endBtn = s.add([ui(), spellBtn("End Turn", { width: 104, height: 46, size: 15, color: "#4a2a7a", onTap: endTurnEmpty, radius: 20 }), { name: "end" }]);
        const deckBtn = s.add([ui(), spellBtn("Deck", { width: 60, height: 44, size: 13, color: "#4a2a7a", onTap: () => deckView("Your deck", run.deck), radius: 12 })]);
        const gearBtn = s.add([ui(), spellBtn("≡", { width: 44, height: 44, size: 19, color: "#4a2a7a", onTap: settings, radius: 12 })]);
        const placeButtons = (L) => {
            brewBtn.pos.set(L.brewX, L.brewY); endBtn.pos.set(L.brewX, L.brewY);
            deckBtn.pos.set(L.W - 80 - L.sr, L.top + 23); gearBtn.pos.set(L.W - 26 - L.sr, L.top + 23);
        };
        placeButtons(layout()); brewBtn.hidden = true;
        // ---- Update ----
        s.onUpdate((dt) => {
            const L = layout();
            V.intro = Math.max(0, V.intro - dt);
            if (V.intro > 0 && V.introText && s.input.pointer.pressed) V.intro = Math.min(V.intro, 0.25);
            input(dt, L);
            const cur = cc();
            // Buttons follow the layout.
            placeButtons(L);
            const hasBrew = (cur?.brew.length ?? 0) > 0;
            brewBtn.hidden = V.busy || !hasBrew; brewBtn.pulse = hasBrew;
            endBtn.hidden = V.busy || hasBrew;
            // Resolve queue.
            if (V.busy) {
                V.qT -= dt;
                let guard = 0;
                while (V.qT <= 0 && V.q.length && guard++ < 20) V.qT += ev(V.q.shift());
                if (!V.q.length && V.qT <= 0 && !V.later.length) { const f = V.afterQ; V.afterQ = null; V.busy = false; f?.(); }
            }
            for (let i = V.later.length - 1; i >= 0; i--) { const l = V.later[i]; l.t -= dt; if (l.t <= 0) { V.later.splice(i, 1); l.fn(); } }
            if (V.ended && !V.busy) { V.endT -= dt; if (V.endT <= 0) { V.ended = false; if (run.screen === "end") { game.go("end", {}, { fade: 0.4 }); } else route(); } }
            // Flights into the pot.
            for (let i = V.flights.length - 1; i >= 0; i--) {
                const f = V.flights[i]; f.t += dt;
                const q = Math.min(1, f.t / f.dur);
                f.x = lerp(f.x0, f.x1, q); f.y = lerp(f.y0, f.y1, q * q) - Math.sin(q * Math.PI) * 46; f.rot += (f.vr + 3) * dt * (f.u % 2 ? 1 : -1);
                f.w2 = f.w * (1 - q * 0.55);
                if (q >= 1) {
                    V.flights.splice(i, 1);
                    G.snd.plop(f.el);
                    V.agit = Math.min(2.4, V.agit + 0.9);
                    fx.ring(f.x1, L.rimY, hex(f.el), 72 * L.S); fx.burst(f.x1, L.rimY, [hex(f.el), "#ffffff"], 14, { a: undefined, sp: 150, g: 460, s: 5 });
                    V.dissolves.push({ card: f.card, x: f.x1, y: L.rimY - 16, w: f.w * 0.5, rot: f.rot, t: 0, life: 0.55, vy: 0, vx: 0 });
                    const tv = V.tokVis.get(f.u); if (tv) { tv.appear = 0; tv.pop = 1; }
                }
            }
            for (let i = V.dissolves.length - 1; i >= 0; i--) { const q = V.dissolves[i]; q.t += dt; q.x += q.vx * dt; if (rnd() < 0.6) fx.spark(q.x + (rnd() - 0.5) * q.w, q.y + (rnd() - 0.5) * q.w, hex(CARDS[q.card.id].el), { sp: 40, g: -80, s: 4, life: 0.5 }); if (q.t > q.life) V.dissolves.splice(i, 1); }
            if (V.primedSound) { V.primedSound -= dt; if (V.primedSound <= 0) { V.primedSound = 0; G.snd.primed(); const r = V.primed.at(-1); if (r) { fx.ring(L.potX, L.rimY, r.color, 90 * L.S); V.liqT = toRgb(r.color); } } }
            // Hand physics.
            const n = V.hand.length;
            V.hand.forEach((k, i) => {
                const v = V.cards.get(k.u); if (!v) return;
                if (v.delay > 0) { v.delay -= dt; return; }
                const b = handBase(L, i, n), hov = V.hover === i && !V.busy && (!V.drag || V.drag.u !== k.u);
                let tx = b.x, ty = b.y, tr = b.rot, ts = 1;
                if (V.hover >= 0 && !hov) tx += (i < V.hover ? -1 : 1) * Math.min(L.cw * 0.34, 34 / (1 + Math.abs(i - V.hover) * 0.5));
                if (hov) { tx = clamp(b.x, L.cw * 0.74, L.W - L.cw * 0.74); ty = L.land ? L.H - L.bot - L.ch * 0.8 : L.H - L.bot - L.ch * 0.92; tr = 0; ts = L.land ? 1.7 : 1.5; }
                if (V.drag?.u === k.u) { v.x = V.drag.x; v.y = V.drag.y; v.rot = V.drag.rot; ts = 1.25; v.lift = 1; }
                else {
                    const K = 1 - Math.pow(0.0012, dt);
                    v.x += (tx - v.x) * K; v.y += (ty - v.y) * K; v.rot += (tr - v.rot) * K;
                }
                v.s += (ts - v.s) * (1 - Math.pow(0.0005, dt));
                v.lift += ((hov ? 1 : 0) - v.lift) * Math.min(1, dt * 14);
                // Tilt towards the finger.
                const p = s.input.pointer, near = hov || V.drag?.u === k.u, wantX = near ? clamp((p.x - v.x) / (L.cw * v.s * 0.5), -1, 1) : 0, wantY = near ? clamp((p.y - v.y) / (L.ch * v.s * 0.5), -1, 1) : 0;
                const dragTilt = V.drag?.u === k.u ? clamp(V.drag.vx * 0.0016, -1, 1) : 0;
                v.tx += ((near ? wantX * 0.9 : 0) + dragTilt - v.tx) * Math.min(1, dt * 16); v.ty += (wantY * 0.9 - v.ty) * Math.min(1, dt * 16);
                if (v.wob) { v.wob = Math.max(0, v.wob - dt * 3); v.x += Math.sin(v.wob * 30) * 3; }
            });
            // Liquid.
            for (let i = 0; i < 3; i++) V.liq[i] += (V.liqT[i] - V.liq[i]) * Math.min(1, dt * 4);
            V.agit += ((V.busy ? 0.9 : hasBrew ? 0.5 : 0.28) - V.agit) * Math.min(1, dt * 1.6);
            const rate = 6 + V.agit * 34 * (V.tier >= 1 ? 1 + V.tier * 0.5 : 1);
            V.bubT = (V.bubT ?? 0) + dt * rate;
            while (V.bubT > 1 && V.bubbles.length < 120) {
                V.bubT -= 1;
                const a = rnd() * 6.28, r = Math.sqrt(rnd());
                V.bubbles.push({ x: Math.cos(a) * r * 0.92, y: Math.sin(a) * r * 0.86, r: (2 + rnd() * 5.5 * (1 + V.agit * 0.25)) * L.S, t: 0, life: 0.34 + rnd() * 0.5 });
            }
            for (let i = V.bubbles.length - 1; i >= 0; i--) { const b = V.bubbles[i]; b.t += dt; if (b.t > b.life) { V.bubbles[i] = V.bubbles[V.bubbles.length - 1]; V.bubbles.pop(); } }
            if (V.agit > 0.8 && rnd() < dt * 8 * V.agit) { const h = toHex(V.liq); fx.spark(L.potX + (rnd() - 0.5) * L.potW * 1.6, L.rimY - 4, h, { a: -1.57 + (rnd() - 0.5) * 0.7, sp: 60 + V.agit * 60, g: 200, s: 3 + rnd() * 4 }); }
            V.hueT += dt;
            // A big enough chain overflows: drops spill down the sides of the pot.
            if (V.tier >= 1 && rnd() < dt * (10 + V.tier * 16)) { const side = rnd() < 0.5 ? -1 : 1, h = toHex(V.liq); fx.spark(L.potX + side * (L.potW + 6 * L.S), L.rimY + 6, h, { a: 1.57 + side * -0.5, sp: 40 + rnd() * 50, g: 520, s: 3 + rnd() * 4, life: 0.8, drag: 1 }); }
            // Enemy vis.
            for (const e of V.en) {
                if (e.tx !== undefined && e.x === 0) { e.x = e.tx; e.y = e.ty; }
                e.x += ((e.tx ?? e.x) - e.x) * Math.min(1, dt * 6); e.y += ((e.ty ?? e.y) - e.y) * Math.min(1, dt * 6);
                e.shake = Math.max(0, e.shake - dt * 4); e.flash = Math.max(0, e.flash - dt * 7); e.lunge = Math.max(0, e.lunge - dt * 4); e.in = Math.max(0, e.in - dt * 3); e.stPulse = Math.max(0, (e.stPulse ?? 0) - dt * 4); e.actT = Math.max(0, (e.actT ?? 0) - dt);
                if (e.dying) e.dead = Math.min(1, e.dead + dt * 2.2);
            }
            V.hurt = Math.max(0, V.hurt - dt * 2); V.heatPulse = Math.max(0, V.heatPulse - dt * 3); V.stir = Math.max(0, V.stir - dt); V.ring = Math.max(0, V.ring - dt * 2);
            for (const k of ["potPulse", "nextPulse", "wardPulse", "rxPulse", "turnFlash"]) V[k] = Math.max(0, (V[k] ?? 0) - dt * 4);
            for (const t of V.tokVis.values()) { if (t.appear < 1) t.appear += dt * 6; t.pop = Math.max(0, t.pop - dt * 6); }
            V.trFlashT = Math.max(0, (V.trFlashT ?? 0) - dt);
            if (V.banner) { V.banner.t += dt; if (V.banner.t > V.banner.life) V.banner = null; }
            if (V.recipe) { V.recipe.t += dt; if (V.recipe.t > V.recipe.life) V.recipe = null; }
            V.tutT += dt;
            fx.update(dt);
        });
        // ---- Draw: battlefield ----
        s.onDraw((d) => {
            const L = layout(), W = L.W, H = L.H, cur = cc() ?? null;
            const bgk = Math.max(W / 300, H / 420) * 1.04;
            d.sprite(`bg_${run.act}`, { x: W / 2, y: H / 2, width: 300 * bgk, height: 420 * bgk });
            // Glow from the pot lights the room.
            const lc = toHex(V.liq);
            d.additive(() => { d.sprite("glow", { x: L.potX, y: L.rimY, width: 420 * L.S, height: 300 * L.S, color: lc, opacity: 0.26 + V.agit * 0.08 + (V.tier >= 0 ? 0.1 + V.tier * 0.06 : 0) }); });
            if (V.tier >= 2) { const hue = V.hueT * 3; d.additive(() => d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: `#${[Math.sin(hue), Math.sin(hue + 2), Math.sin(hue + 4)].map((q) => Math.round(30 + 30 * q + 30 * (V.tier - 2)).toString(16).padStart(2, "0")).join("")}`, opacity: 0.22 })); }
            if (V.tier >= 1) {
                const a = Math.min(0.6, 0.16 + V.tier * 0.1), col = TIERS[V.tier][2], sz = (420 + V.tier * 60) * L.S * (1 + Math.sin(s.time * 9) * 0.03);
                d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#07040f", opacity: Math.min(0.5, 0.14 + V.tier * 0.08) });
                d.additive(() => { d.sprite("rays", { x: L.potX, y: L.rimY, width: sz * 1.5, height: sz * 1.5, rot: s.time * 0.7, color: col, opacity: a }); d.sprite("rays", { x: L.potX, y: L.rimY, width: sz, height: sz, rot: -s.time * 1.1, color: "#ffffff", opacity: a * 0.5 }); });
            }
            drawEnemies(d, L);
            // Witch.
            const bob = Math.sin(s.time * 2) * 1.5, kick = V.hurt * 10 * (Math.sin(s.time * 50));
            d.sprite("glow", { x: L.witchX, y: L.witchY + 62 * L.witchS * 1.6, width: 110, height: 30, color: "#07040f", opacity: 0.6 });
            d.push(); d.translate(L.witchX + kick, L.witchY + bob); d.rotate(Math.sin(V.stir * 10) * 0.06);
            d.sprite(`witch_${run.witch}`, { width: 220 * L.witchS * (1 + V.hurt * 0.04), height: 280 * L.witchS * (1 - V.hurt * 0.04) });
            d.pop();
            if (V.pward > 0) { d.push(); d.translate(L.witchX, L.witchY - 66 * L.witchS * 1.6); const q = 1 + (V.wardPulse ?? 0) * 0.3; d.scale(q); d.sprite("wardicon", { width: 34, height: 34 }); d.text(fmt(V.pward), { y: -2, size: 15, bold: true, font: FONT, color: "#07203f" }); d.pop(); }
            // Pot.
            d.sprite("pot_back", { x: L.potX, y: L.rimY, width: 300 * L.S, height: 110 * L.S });
            const lq = (h, k) => toHex(V.liq.map((v) => v + (h - v) * k));
            d.push(); d.translate(L.potX, L.rimY + 2 * L.S); d.scale(1, L.potH / L.potW);
            d.circle(L.potW, { color: lq(0, 0.36) });
            d.circle(L.potW * 0.92, { color: lc });
            d.circle(L.potW * 0.6, { color: lq(255, 0.2), opacity: 0.5 });
            d.pop();
            for (const b of V.bubbles) {
                const f = b.t / b.life, x = L.potX + b.x * L.potW, y = L.rimY + 2 * L.S + b.y * L.potH, r = b.r * (0.5 + f * 0.8);
                d.sprite("bub", { x, y, width: r * 2, height: r * 2 * 0.9, color: lq(255, 0.6), opacity: f > 0.85 ? (1 - f) * 6 : 1 });
            }
            drawTokens(d, L, cur);
            // Fire and front of the pot.
            const fy = L.rimY + 188 * L.S;
            d.additive(() => { for (let i = 0; i < 7; i++) { const x = L.potX + (i - 3) * 34 * L.S, h = (28 + 13 * Math.sin(s.time * 9 + i * 2.4) + V.agit * 10) * L.S; d.sprite("glow", { x, y: fy - h * 0.5, width: 42 * L.S, height: h * 1.7, color: i % 2 ? "#ff7a2f" : "#ffb347", opacity: 0.8 }); } });
            d.sprite("logs", { x: L.potX, y: fy + 4 * L.S, width: 300 * L.S, height: 84 * L.S });
            const wob = Math.sin(V.stir * 20) * V.stir * 4 + (V.tier >= 1 ? Math.sin(s.time * 40) * (V.tier * 0.8) : 0);
            d.sprite("pot_front", { x: L.potX + wob, y: L.rimY + 87 * L.S, width: 320 * L.S, height: 210 * L.S });
            // Reaction chips sit over the rim so a primed link can be read and tapped.
            drawChips(d, L, cur);
            if (V.busy && V.fires > 0) drawScore(d, L);
            fx.draw(d);
        });
        /** The scoreboard is the belly of the pot itself: it grows as the chain does. */
        function drawScore(d, L) {
            const t = Math.max(0, V.tier), col = TIERS[t][2], y = L.rimY + 84 * L.S, jit = V.tier >= 1 ? (V.tier * 0.6) : 0, x = L.potX + Math.sin(s.time * 70) * jit, k = (1 + (V.potPulse ?? 0) * 0.16) * (1 + Math.min(0.5, V.fires * 0.008));
            d.additive(() => d.sprite("glow", { x, y, width: 240 * L.S * k, height: 150 * L.S * k, color: col, opacity: 0.4 }));
            d.push(); d.translate(x, y); d.scale(k);
            const big = fmt(V.totalShown), sz = (big.length > 7 ? 26 : 32) * Math.max(0.8, L.S);
            d.text(big, { y: -2, x: 1.5, size: sz, bold: true, font: FONT, color: "#120822", opacity: 0.8 });
            d.text(big, { y: -3.5, size: sz, bold: true, font: FONT, color: "#fff6dc" });
            d.text(`Chain ${V.fires}`, { y: -31 * Math.max(0.8, L.S), x: 1, size: 15, bold: true, font: FONT, color: "#120822" });
            d.text(`Chain ${V.fires}`, { y: -32 * Math.max(0.8, L.S), size: 15, bold: true, font: FONT, color: col });
            d.text(`Potency ×${V.potShown}${V.nextShown > 1 ? `   next ×${V.nextShown}` : ""}`, { y: 24 * Math.max(0.8, L.S), size: 13, bold: true, font: FONT, color: "#ffe066" });
            d.pop();
        }
        function drawEnemies(d, L) {
            V.enBoxes = []; V.stBoxes = [];
            const cur = cc();
            V.en.forEach((e, i) => {
                if (e.dead >= 1) return;
                const sz = e.size, a = 1 - e.dead, bob = Math.sin(s.time * 1.8 + e.ph) * 2.5, sk = e.shake * 6 * Math.sin(s.time * 60);
                const lx = (L.land ? -1 : 0) * e.lunge * 26, ly = (L.land ? 0 : 1) * e.lunge * 26 - (e.lunge > 0 ? 6 : 0), x = e.x + sk + lx, y = e.y + bob + ly + e.dead * 16;
                d.sprite("glow", { x: e.x, y: e.y + sz * 0.48, width: sz * 0.9, height: sz * 0.22, color: "#07040f", opacity: 0.7 * a });
                const target = cur?.target === i && e.hp > 0;
                if (target) d.additive(() => d.sprite("ringfx", { x: e.x, y: e.y + sz * 0.48, width: sz * 0.92, height: sz * 0.26, color: "#ffcf6b", opacity: 0.8 + Math.sin(s.time * 5) * 0.2 }));
                const sq = 1 + e.shake * 0.08 - e.dead * 0.4, inS = 1 - e.in;
                d.sprite(`foe_${e.id}`, { x, y, width: sz * sq * (1 + e.dead * 0.5) * inS, height: sz * (2 - sq) * (1 - e.dead * 0.7) * inS, opacity: a });
                if (e.flash > 0) d.additive(() => d.sprite(`foe_${e.id}`, { x, y, width: sz * sq, height: sz * (2 - sq), opacity: e.flash * 0.9 * a }));
                V.enBoxes.push({ x: e.x, y: e.y, w: sz, h: sz, i });
                if (e.hp <= 0) return;
                // HP.
                const bw = Math.min(sz * 0.86, 120), by = e.y + sz * 0.5 + 7, f = clamp(e.hp / e.maxHp, 0, 1);
                d.rect(bw + 3, 13, { x: e.x, y: by, color: "#07040f", radius: 6, opacity: 0.9 });
                d.rect(Math.max(6, (bw - 1) * f), 10, { x: e.x - (bw - 1) * (1 - f) / 2, y: by, color: f < 0.3 ? "#ff5a3a" : "#e8455c", radius: 5 });
                const doom = e.st.doom ?? 0; if (doom > 0) { const df = clamp(doom / e.maxHp, 0, f); d.rect((bw - 1) * df, 10, { x: e.x - (bw - 1) / 2 + (bw - 1) * df / 2, y: by, color: "#ff6b9a", radius: 3, opacity: 0.85 }); }
                d.text(`${fmt(e.hp)}`, { x: e.x, y: by, size: 11, bold: true, font: FONT, color: "#fff" });
                if (e.ward > 0) { d.sprite("wardicon", { x: e.x - bw / 2 - 2, y: by, width: 22, height: 22 }); d.text(fmt(e.ward), { x: e.x - bw / 2 - 2, y: by - 1, size: 10, bold: true, font: FONT, color: "#07203f" }); }
                // Statuses.
                let sx = e.x - 26 * (Object.values(e.st).filter((v) => v > 0).length - 1) / 2;
                for (const k of ["burn", "chill", "hex", "doom"]) {
                    const v = e.st[k]; if (!(v > 0)) continue;
                    const sy = by + 18, q = 1 + (e.stPulse ?? 0) * 0.25;
                    d.circle(11 * q, { x: sx, y: sy, color: "#120822", opacity: 0.85 });
                    d.circle(11 * q, { x: sx, y: sy, color: KEYWORDS[{ burn: "Burn", chill: "Chill", hex: "Hex", doom: "Doom" }[k]].color, outline: 1.5 });
                    d.text(fmt(v), { x: sx, y: sy, size: 11, bold: true, font: FONT, color: "#fff" });
                    const nm = { burn: "Burn", chill: "Chill", hex: "Hex", doom: "Doom" }[k];
                    V.stBoxes.push({ x: sx, y: sy, title: nm, text: KEYWORDS[nm].text });
                    sx += 26;
                }
                // Intent.
                const real = cur?.enemies[i], m = e.move ? ENEMIES[e.id].moves[e.move] : null;
                if (m && e.hp > 0 && !V.busy) drawIntent(d, e, m, real, sz);
                if (e.actT > 0 && e.actName) { d.text(e.actName, { x: e.x, y: e.y - sz * 0.56, size: 13, bold: true, font: FONT, color: "#ffe9b8", opacity: Math.min(1, e.actT * 3) }); }
            });
        }
        function drawIntent(d, e, m, real, sz) {
            const cur = cc(), x = e.x, y = e.y - sz * 0.5 - 8 + Math.sin(s.time * 3 + e.ph) * 2;
            const dmg = real && cur ? S.intentDamage(run, cur, real) : (m.dmg ?? 0);
            const parts = [];
            if (m.dmg) parts.push([m.hits > 1 ? `${dmg}×${m.hits}` : `${dmg}`, "#ff6b5a", "atk"]);
            if (m.ward) parts.push([`${m.ward}`, "#8fd6ff", "def"]);
            if (m.buff) parts.push(["+", "#ffb04a", "buf"]);
            if (m.status || m.add || m.pot) parts.push(["!", "#d08bff", "cur"]);
            if (m.summon) parts.push(["+1", "#ffb0c0", "sum"]);
            if (m.forbid && cur?.forbid) parts.push(["", hex(cur.forbid), "forbid"]);
            const w = 8 + parts.reduce((n, p) => n + 18 + p[0].length * 8, 0);
            if (e.id === "hollow" && real) { const left = 4 - (real.turn % 5); if (left > 0) d.text(`Toll in ${left}`, { x: x + 62, y, size: 12, bold: true, font: FONT, color: "#ff9a6a" }); }
            if (V.en.filter((q) => q.hp > 0).length < 3) d.text(m.n, { x, y: y - 20, size: 11, bold: true, font: FONT, color: "#ffe9b8", opacity: 0.92 });
            d.rect(w, 24, { x, y, color: "#120822", radius: 12, opacity: 0.9 });
            d.rect(w, 24, { x, y, color: m.dmg ? "#ff6b5a" : "#b8a8d0", radius: 12, outline: 1.2, opacity: 0.8 });
            let cx = x - w / 2 + 4;
            for (const [t, col, ic] of parts) {
                const pw = 18 + t.length * 8;
                const name = ic === "atk" ? "glyph_ember" : ic === "def" ? "wardicon" : ic === "cur" ? "glyph_hex" : ic === "forbid" ? `glyph_${cur.forbid}` : ic === "sum" ? "glyph_gunk" : "heatgem";
                d.sprite(name, { x: cx + 9, y, width: 16, height: 16 });
                if (t) d.text(t, { x: cx + 18 + t.length * 4, y, size: 13, bold: true, font: FONT, color: col });
                cx += pw;
            }
        }
        function drawTokens(d, L, cur) {
            const list = V.tokens.length ? V.tokens : cur?.brew ?? [], n = list.length, cap = S.potSize(run, cur ?? c);
            // Empty spaces, as faint rings on the surface.
            const shown = Math.max(n, cap);
            for (let i = n; i < cap; i++) {
                const p = tokenPos(L, i, shown);
                d.circle(p.size * 0.42, { x: p.x, y: L.rimY + 3, color: "#ffffff", opacity: 0.12 });
            }
            if (V.drag?.over) {
                const q = tokenPos(L, clamp(V.drag.ins, 0, shown - 1), shown);
                d.additive(() => d.sprite("ringfx", { x: q.x - q.sp / 2, y: L.rimY, width: 16, height: 54 * L.S, color: "#ffe066", opacity: 0.9 }));
            }
            list.forEach((t, i) => {
                const p = tokenPos(L, i, shown);
                let v = V.tokVis.get(t.u);
                if (!v) { v = { appear: 1, x: p.x, y: L.rimY, pop: 0 }; V.tokVis.set(t.u, v); }
                v.x += (p.x - v.x) * 0.3; v.y = L.rimY;
                if (v.appear <= 0) return;
                const bob = Math.sin(s.time * 2.2 + i * 1.7) * 2.5 * L.S, q = Math.min(1, v.appear), k = (q < 1 ? q * (1.2 - 0.2 * q) : 1) * (1 + v.pop * 0.4), sz = p.size * k;
                d.sprite("glow", { x: v.x, y: v.y + 7, width: sz * 1.2, height: sz * 0.5, color: "#07040f", opacity: 0.45 });
                d.sprite(tokenArt(t.id), { x: v.x, y: v.y + bob - v.pop * 10, width: sz, height: sz });
                if (t.stew) { d.text(`×${S.stewOf(run, t)}`, { x: v.x, y: v.y + bob + sz * 0.56, size: 11, bold: true, font: FONT, color: "#d9ffb0" }); }
                if (t.stuck) { d.text("1", { x: v.x + sz * 0.4, y: v.y - sz * 0.4, size: 11, bold: true, font: FONT, color: "#ffb04a" }); }
                if (v.pop > 0) d.additive(() => d.sprite("glow", { x: v.x, y: v.y, width: sz * 2, height: sz * 2, color: hex(t.el), opacity: v.pop }));
            });
        }
        function drawChips(d, L, cur) {
            V.chipBoxes = [];
            if (!cur || V.busy) return;
            const b = cur.brew, shown = Math.max(b.length, S.potSize(run, cur));
            V.primed.forEach((r, idx) => {
                if (r.ring) {
                    const y = L.rimY + 46 * L.S;
                    d.text(`Ring: ${r.name}`, { x: L.potX, y, size: 12, bold: true, font: FONT, color: r.color });
                    V.chipBoxes.push({ x: L.potX, y, w: 90, key: r.key });
                    return;
                }
                const a = tokenPos(L, r.i - 1, shown), e = tokenPos(L, r.i, shown), x = (a.x + e.x) / 2, y = L.rimY - 30 * L.S - (idx % 2) * 14 + Math.sin(s.time * 3 + idx) * 1.2;
                d.additive(() => d.line([a.x, L.rimY], [e.x, L.rimY], { width: 5, color: r.color, opacity: 0.8 }));
                const w = 10 + r.name.length * 6.2;
                d.rect(w, 16, { x, y, color: "#120822", radius: 8, opacity: 0.86 });
                d.text(r.name, { x, y, size: 11, bold: true, font: FONT, color: r.color });
                V.chipBoxes.push({ x, y, w, key: r.key });
            });
        }
        // ---- Draw: hand and HUD ----
        s.onDrawUI((d) => {
            const L = layout(), W = L.W, H = L.H, cur = cc();
            V.trBoxes = drawTrinkets(d, s, run, L.top + 56);
            if (V.trFlashT > 0) { const b = V.trBoxes.find((q) => q.id === V.trFlash); if (b) d.additive(() => d.sprite("glow", { x: b.x, y: b.y, width: 56, height: 56, color: "#ffe066", opacity: V.trFlashT * 2 })); }
            const py = V.pst; let px = W - 18;
            for (const k of Object.keys(PST)) { if (!(py[k] > 0)) continue; d.circle(12, { x: px, y: L.top + 56, color: "#3a1030" }); d.text(`${PST[k][0][0]}${py[k]}`, { x: px, y: L.top + 56, size: 10, bold: true, font: FONT, color: "#ffb0c0" }); V.stBoxes.push({ x: px, y: L.top + 56, title: PST[k][0], text: PST[k][1] }); px -= 27; }
            // Heat.
            const hk = 1 + V.heatPulse * 0.3;
            d.push(); d.translate(L.heatX, L.heatY); d.scale(hk);
            d.sprite("heatgem", { y: -3, width: 58, height: 58 });
            d.text(`${V.heat}`, { y: 3, size: 22, bold: true, font: FONT, color: "#120822", opacity: 0.6, x: 1 });
            d.text(`${V.heat}`, { y: 2, size: 22, bold: true, font: FONT, color: "#fff" });
            d.pop();
            d.text("Heat", { x: L.heatX, y: L.heatY + 24, size: 11, bold: true, font: FONT, color: "#ffb04a" });
            if (run.witch === "posy") { const need = S.has(run, "sparewick") ? 2 : 3; for (let i = 0; i < need; i++) d.circle(4, { x: L.heatX - (need - 1) * 6 + i * 12, y: L.heatY + 37, color: i < V.flare ? "#ff7a2f" : "#3a2438" }); }
            // Piles.
            const pc = cur ? cur.draw.length : 0, dc = cur ? cur.disc.length : 0;
            for (const [x, n, lab] of [[L.pileX, pc, "Draw"], [L.discX, dc, "Used"]]) {
                d.rect(26, 34, { x, y: L.pileY, color: "#3a2458", radius: 5 }); d.rect(26, 34, { x, y: L.pileY, color: "#e7b75e", radius: 5, outline: 1.3 });
                d.text(`${n}`, { x, y: L.pileY - 1, size: 14, bold: true, font: FONT, color: "#fff6dc" });
                d.text(lab, { x, y: L.pileY + 25, size: 10, font: FONT, color: COLORS.dim });
            }
            // Preview.
            drawPreview(d, L, cur);
            // Hand.
            const order = V.hand.map((k, i) => i).sort((a, b) => (a === V.hover ? 1 : b === V.hover ? -1 : a - b));
            for (const i of order) {
                const k = V.hand[i], v = V.cards.get(k.u);
                if (!v || (v.delay > 0)) continue;
                const hov = V.hover === i, drag = V.drag?.u === k.u, can = cur && !V.busy ? S.canPlace(run, k) : true;
                const cost = cur ? S.costOf(cur, k, run) : cardCost(CARDS[k.id], k.up);
                drawCard(d, k, { x: v.x, y: v.y, w: L.cw * v.s, rot: v.rot, tx: v.tx, ty: v.ty, lift: drag ? 1 : v.lift, foil: hov || drag ? 0.62 : CARDS[k.id].rar === "rare" ? 0.16 : 0, cost, costColor: cost < cardCost(CARDS[k.id], k.up) ? "#c8ffb0" : !can ? "#ff9a8a" : "#fff", dim: can ? 0 : 0.42, glow: V.tut && i === tutIndex() ? 0.55 + Math.sin(s.time * 6) * 0.25 : hov ? 0.18 : 0 });
            }
            for (const f of V.flights) drawCard(d, f.card, { x: f.x, y: f.y, w: f.w2 ?? f.w, rot: f.rot, lift: 1, foil: 0.4 });
            for (const q of V.dissolves) drawDissolve(d, game, q.card, q, q.t / q.life);
            fx.drawNums(d);
            if (V.banner) {
                const b = V.banner, q = b.t / b.life, sc = 1 + Math.max(0, 0.5 - b.t * 6), a = q > 0.8 ? (1 - q) * 5 : 1, y = L.land ? H * 0.2 + 12 : L.foeY - 10;
                d.push(); d.translate(W / 2, y); d.scale(sc);
                d.text(b.text, { size: b.size, bold: true, font: FONT, x: 2, y: 2, color: "#120822", opacity: a });
                d.text(b.text, { size: b.size, bold: true, font: FONT, color: b.color, opacity: a });
                d.pop();
            }
            if (V.recipe) {
                const r = V.recipe, q = r.t / r.life, a = q > 0.8 ? (1 - q) * 5 : Math.min(1, r.t * 8), cy = H * 0.34, sc = 0.9 + Math.min(0.1, r.t) + (r.t < 0.15 ? (0.15 - r.t) * 5 : 0), sz = clamp(24 + Math.log10(Math.max(1, r.total)) * 7, 28, 54);
                d.rect(Math.min(W - 16, 340), 112, { x: W / 2, y: cy, color: "#120822", radius: 14, opacity: 0.82 * a });
                d.rect(Math.min(W - 16, 340), 112, { x: W / 2, y: cy, color: "#e7b75e", radius: 14, outline: 1.5, opacity: a });
                d.push(); d.translate(W / 2, cy); d.scale(sc);
                d.text(r.best ? "New best brew!" : "Recipe", { y: -38, size: 13, bold: true, font: FONT, color: r.best ? "#ffe066" : COLORS.dim, opacity: a });
                d.text(r.name, { y: -16, size: 18, bold: true, font: FONT, color: "#fff6dc", opacity: a });
                d.text(fmt(r.total), { y: 16, size: sz, bold: true, font: FONT, color: "#ffe066", opacity: a });
                d.text(`${r.fires} fired   ×${r.pot} Potency`, { y: 42, size: 12, font: FONT, color: COLORS.dim, opacity: a });
                d.pop();
            }
            if (V.tut && !V.busy) drawTut(d, L);
            if (V.intro > 0 && V.introText) {
                const a = Math.min(1, V.intro * 2.2), y = L.land ? H * 0.5 : L.foeY + 20;
                d.rect(W + 4, 92, { x: W / 2, y, color: "#120822", opacity: 0.88 * a });
                d.text(V.introText[0], { x: W / 2, y: y - 26, size: 24, bold: true, font: FONT, color: COLORS.gold, opacity: a });
                d.text(V.introText[1], { x: W / 2, y: y + 12, size: 13, font: FONT, color: COLORS.cream, opacity: a, maxWidth: W - 30, align: "center" });
            }
            if (cur?.forbid && !V.busy) {
                const y = L.pvY - 24, x = L.land ? L.potX : L.W / 2;
                d.rect(150, 20, { x, y, color: "#3a1020", radius: 10, opacity: 0.9 });
                d.text(`${ELEMENTS[cur.forbid].name} is forbidden`, { x, y, size: 12, bold: true, font: FONT, color: ELEMENTS[cur.forbid].color });
            }
            if (cur && run.hp < run.maxHp * 0.3 && !V.busy) d.additive(() => d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#ff2a3a", opacity: 0.05 + Math.sin(s.time * 4) * 0.03 }));
        });
        function drawPreview(d, L, cur) {
            if (!cur || V.busy) return;
            const pv = V.pv, y = L.pvY, cx = L.land ? L.potX : L.W / 2, inc = S.incoming(run), left = Math.max(0, inc - (V.pward + (pv?.ward ?? 0)));
            const has2 = cur.brew.length > 0;
            const parts = [];
            if (has2 && pv) {
                if (pv.total) parts.push(["glyph_ember", fmt(pv.total), "#ffd27a"]);
                if (pv.ward) parts.push(["wardicon", fmt(pv.ward), COLORS.ward]);
                if (pv.pot > 1) parts.push([null, `×${pv.pot}`, "#ffe066"]);
            }
            let w = 0; for (const p of parts) w += (p[0] ? 20 : 0) + p[1].length * 9 + 10;
            let x = cx - w / 2;
            if (parts.length) {
                d.rect(w + 16, 26, { x: cx, y, color: "#120822", radius: 13, opacity: 0.8 });
                for (const [ic, t, col] of parts) {
                    if (ic) { d.sprite(ic, { x: x + 8, y, width: 18, height: 18 }); x += 20; }
                    const tw = t.length * 9;
                    d.text(t, { x: x + tw / 2, y, size: 15, bold: true, font: FONT, color: col }); x += tw + 10;
                }
            }
            if (inc > 0) {
                const yy = L.land ? L.witchY + 90 * L.witchS : L.witchY - 96 * L.witchS * 1.3, xx = L.witchX + (L.land ? 0 : 6);
                d.rect(56, 20, { x: xx, y: yy, color: "#3a1020", radius: 10, opacity: 0.86 });
                d.text(left > 0 ? `-${left}` : "Safe", { x: xx, y: yy, size: 13, bold: true, font: FONT, color: left > 0 ? "#ff9a8a" : COLORS.green });
            }
        }
        function drawTut(d, L) {
            const text = TUT[V.tut]; if (!text) return;
            const y = L.land ? 66 + L.top : L.foeY - 80;
            d.rect(Math.min(L.W - 20, 330), 38, { x: L.W / 2, y, color: "#120822", radius: 12, opacity: 0.9 });
            d.rect(Math.min(L.W - 20, 330), 38, { x: L.W / 2, y, color: "#ffe066", radius: 12, outline: 1.5, opacity: 0.9 });
            d.text(text, { x: L.W / 2, y, size: 14, bold: true, font: FONT, color: "#fff6dc", maxWidth: L.W - 40, align: "center" });
            // Ghost finger shows the fling.
            const i = tutIndex();
            if (V.tut < 4 && i >= 0) {
                const b = V.cards.get(V.hand[i].u); if (!b) return;
                const q = (V.tutT * 0.7) % 1, x = lerp(b.x, L.potX, q * q), y2 = lerp(b.y, L.rimY, q * q * (3 - 2 * q));
                d.circle(13, { x, y: y2, color: "#fff6dc", opacity: (1 - q) * 0.75 });
                d.circle(18, { x, y: y2, color: "#ffe066", outline: 2, opacity: (1 - q) * 0.75 });
            }
        }
        installOverlays(s);
        // Bot and tool hooks. Everything a test needs goes through the same functions a finger does.
        game.data.combat = { place: (i, p) => placeCard(i, p), brew: () => doBrew(), V };
    });
}
