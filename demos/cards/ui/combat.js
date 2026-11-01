// The cauldron table, rebuilt around one rule: every element owns a reserved band, and all words go
// through a single caption line. Reactions, foe moves, lessons and hints take turns there, so text
// never lands on text. Detail waits behind tap-to-inspect.
import { CARDS, cardCost } from "../data/cards.js";
import { ELEMENTS, KEYWORDS, REACTIONS } from "../data/rules.js";
import { ENEMIES } from "../data/enemies.js";
import * as S from "../sim.js";
import { recipeName } from "../meta.js";
import { tokenArt, warm } from "../art/index.js";
import { ASPECT, drawCard, drawDissolve } from "./cardview.js";
import { layer } from "../pogo.js";
import { BAR_H, COLORS, FONT, Fx, G, clamp, fit, fmt, hudEntity, hurryKeys, label, lerp, minText, rnd, route, saveMeta, saveRun, song, spellBtn, ui } from "./core.js";
import { deckView, installOverlays, settings, tip, zoom } from "./overlay.js";

const hex = (c) => ELEMENTS[c]?.color ?? c;
const toRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c) => "#" + c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("");
const TIERS = [[6, "Bubbling!", "#ffd27a"], [12, "Rolling Boil!", "#ff9a4a"], [24, "Cauldron Critical!", "#ff5ca8"], [60, "Unholy Recipe!", "#b45cff"], [140, "The Pot Is Screaming", "#7ef0ff"]];
const ST = { burn: "Burn", chill: "Chill", hex: "Hex", doom: "Doom" };
const PST = { weak: ["Weak", "Your cards are 25% weaker."], frail: ["Frail", "You gain 25% less Block."], lid: ["Lidded", "One less space in the pot."], drain: ["Drained", "One less Heat next turn."], scald: ["Scald", "You lose this much HP at the end of your turn."] };
/** First sightings, said once, ever, in the caption. One idea at a time, and only when it matters. */
const HINTS = {
    pot: "Power multiplies every card after it.", flare: "Flare! Every third Ember adds Power.", burn: "Burn hurts them every turn.", chill: "Chill makes them hit softer.", hex: "Hex makes them take more damage.", doom: "Doom kills when their HP falls to it.", reflux: "Reflux fires earlier cards again.", gunk: "Gunk clogs the pot. Tap it to skim for 1 Heat.", ring: "The Ring: your first card fires again.",
};

export const POT = { w: 372, cy: 124, fireY: 262 };
export function combatScene(game) {
    game.scene("combat", (s, args) => {
        if (args?.demo && !G.run?.combat) G.demoRun(args);
        const run = G.run;
        if (!run?.combat) { game.go("title"); return; }
        const fx = new Fx(), c = run.combat, kind = c.kind, lesson = run.prologue ?? 0;
        const V = {
            en: [], hand: [], cards: new Map(), tokens: [], tokVis: new Map(), flights: [], dissolves: [], later: [], q: [], qT: 0, busy: false, fires: 0, totalShown: 0, potShown: 1, nextShown: 1, tier: -1,
            hover: -1, press: null, drag: null, liq: toRgb("#37b89c"), liqT: toRgb("#37b89c"), agit: 0.3, bubbles: [], pv: null, primed: [], enBoxes: [], stBoxes: [], heatPulse: 0, hurt: 0, stir: 0, fast: 1,
            php: run.hp, pward: c.p.ward, heat: c.heat, flare: c.flare ?? 0, pst: { ...c.p.st }, ended: false, hueT: 0, cap: null, capT: 0, said: null, focus: null, intro: 0, lastTurn: c.turn,
        };
        for (const e of c.enemies) V.en.push(enVis(e));
        warm([...c.draw, ...c.hand].map((k) => k.id));
        for (const k of c.hand) addHand(k, -1);
        V.pv = S.preview(run); V.primed = S.primed(c, run.witch);
        song(kind === "boss" ? "boss" : "combat");
        const lead = c.enemies.find((e) => e.boss || e.elite);
        if (lead && c.turn === 1) { const d = ENEMIES[lead.id]; say(`${lead.name}. ${d.rule ?? d.blurb}`, "#ffcf6b", lead.boss ? 3.4 : 2.2); if (lead.boss) s.wait(0.2, () => G.snd.toll()); }

        function enVis(e) { return { id: e.id, hp: e.hp, maxHp: e.maxHp, ward: e.ward, st: { ...e.st }, move: e.move, str: e.str, x: 0, y: 0, size: 100, shake: 0, flash: 0, lunge: 0, dead: e.hp <= 0 ? 1 : 0, dying: 0, ph: rnd() * 6, in: 0, name: e.name, boss: e.boss, elite: e.elite, hit: 0, hitPop: 0 }; }
        function addHand(k, i) {
            V.hand.push(k);
            V.cards.set(k.u, { x: s.view.width / 2, y: s.view.height + 90, rot: -0.3, tx: 0, ty: 0, lift: 0, s: 1, delay: i >= 0 ? i * 0.07 : V.hand.length * 0.05 });
        }
        // ---- Layout: bands, top to bottom. Nothing is placed by hand outside this function. ----
        function layout() {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, bot = game.view.safe.bottom, sl = game.view.safe.left, sr = game.view.safe.right, land = W > H * 1.05, y0 = top + BAR_H + 2;
            const L = { W, H, top, bot, land, sl, sr, capH: land ? 36 : 44 };
            if (land) {
                const hw = W - sl - sr - 264;
                L.cw = clamp(hw / 5 - 3, 58, 76); L.ch = L.cw * ASPECT;
                L.handY = H - bot - L.ch / 2 - 3; L.handTop = L.handY - L.ch / 2; L.handX = sl + 96 + hw / 2 + 36; L.handW = hw;
                L.capY = y0 + L.capH / 2 + 1; L.capW = W - sl - sr - 16; L.capX = sl + 8 + L.capW / 2;
                const mid = L.capY + L.capH / 2 + 3, midH = L.handTop - mid - 4;
                L.S = clamp(W * 0.46 / 330, 0.5, 0.8); L.potX = sl + W * 0.26; L.rimY = mid + 42 * L.S + 2; L.potBottom = L.handTop - 2;
                L.witchS = clamp(midH / 280, 0.3, 0.46); L.witchX = sl + 42; L.witchY = L.handTop - 140 * L.witchS - 2;
                L.foeX = W * 0.74; L.foeW = W * 0.48 - sr; L.foeTop = mid; L.foeH = midH;
                L.heatX = sl + 48; L.heatY = L.handY; L.brewW = 124; L.brewH = 58; L.brewX = W - sr - 72; L.brewY = L.handY;
            } else {
                L.cw = clamp((W - 12) / 5 - 2, 60, 86); L.ch = L.cw * ASPECT;
                const rowH = 58;
                L.brewY = H - bot - rowH / 2 - 2; L.brewH = 50; L.brewW = W - 104; L.brewX = W - 8 - L.brewW / 2; L.heatX = 44; L.heatY = L.brewY;
                L.handY = L.brewY - rowH / 2 - L.ch / 2 - 2; L.handTop = L.handY - L.ch / 2; L.handX = W / 2; L.handW = W - 12;
                const room = L.handTop - y0 - L.capH;
                L.foeTop = y0 + 2; L.foeH = Math.round(room * 0.5) - 4; L.foeX = W / 2; L.foeW = W - 8;
                L.capY = L.foeTop + L.foeH + L.capH / 2 + 2; L.capW = W - 16; L.capX = W / 2;
                const potTop = L.capY + L.capH / 2 + 2;
                L.S = Math.min((W - 76) / 320, 1); L.potX = W / 2 + 26; L.rimY = potTop + 44 * L.S + 2; L.potBottom = L.handTop - 2;
                L.witchS = clamp((L.handTop - potTop) / 280, 0.3, 0.42); L.witchX = 8 + 66 * L.witchS * 1.4; L.witchY = L.handTop - 140 * L.witchS - 4;
            }
            L.capBottom = L.capY + L.capH / 2; L.potW = 122 * L.S; L.potH = 33 * L.S;
            const lifted = Math.min(164, (L.handTop - L.capBottom - 10) / ASPECT); L.lw = lifted;
            const alive = V.en.filter((e) => e.dead < 1), n = Math.max(1, alive.length), cell = L.foeW / n;
            L.intentH = 24; L.hpH = 16; L.stH = 22;
            const room = L.foeH - L.intentH - L.hpH - L.stH - 8, sz = Math.max(56, Math.min(room, cell * 0.94, alive.some((e) => e.boss) ? 170 : 140));
            L.foeCell = cell; L.foeSize = sz;
            const cy = L.foeTop + L.intentH + 2 + (room + 2) / 2;
            alive.forEach((e, i) => { e.tx = L.foeX + (i - (n - 1) / 2) * cell; e.ty = cy; e.size = sz; if (e.x === 0) { e.x = e.tx; e.y = e.ty; } });
            return L;
        }
        function tokenPos(L, i, n) {
            const cap = Math.max(n, S.potSize(run, run.combat ?? c)), sp = Math.min(L.potW * 1.78 / Math.max(1, cap - 1), 62 * L.S), x = L.potX + (i - (cap - 1) / 2) * sp;
            return { x, sp, size: Math.min(50 * L.S, sp * 0.94) };
        }
        // ---- The one voice in the room ----
        function say(text, color = "#fff6dc", hold = 1.2, tok = null) { V.cap = { text, color, tok }; V.capT = hold; V.capPop = 1; }
        function hint(key) {
            const seen = G.meta.seen;
            if (seen[key] || !HINTS[key]) return 0;
            seen[key] = 1; saveMeta();
            say(HINTS[key], "#ffe9a8", 2.6);
            return 1.3;
        }
        /** What the caption says when nothing is happening. */
        function idleCaption(cur) {
            if (lesson) { const l = lessonCaption(cur); if (l) return l; }
            const r = V.primed.filter((q) => !q.ring).at(-1) ?? V.primed.at(-1);
            if (r) return { text: `${r.name}: ${r.text}`, color: r.color, rx: r.key };
            if (cur.forbid) return { text: `${ELEMENTS[cur.forbid].name} is forbidden this turn.`, color: ELEMENTS[cur.forbid].color };
            const toll = cur.enemies.find((e) => e.id === "hollow" && e.hp > 0);
            if (toll) { const left = 4 - (toll.turn % 5); if (left > 0) return { text: `THE TOLL in ${left}.`, color: "#ff9a6a" }; }
            if (cur.target !== null && cur.enemies.filter((e) => e.hp > 0).length > 1 && !G.meta.seen.aim) return { text: "Tap a foe to aim at it. Hold it to read it.", color: "#fff6dc" };
            if (!cur.brew.length) { const inc = S.incoming(run); return { text: inc > V.pward ? `Incoming ${inc}. Fling cards in the pot.` : "Fling cards in the pot.", color: "#f5ead2" }; }
            return { text: "Add more, or BREW.", color: "#f5ead2" };
        }
        // ---- Lessons: each one a few moves, each move one short line ----
        const want = () => {
            const cur = cc(); if (!cur || V.busy) return null;
            const b = cur.brew.map((t) => t.id);
            if (lesson === 1) return b.length === 0 ? "spark" : b.length === 1 ? "droplet" : b.length === 2 ? "spark" : null;
            if (lesson === 2 && cur.turn === 1) return b.length === 0 ? "droplet" : b.length === 1 ? "spark" : null;
            return null;
        };
        function lessonCaption(cur) {
            const b = cur.brew;
            if (lesson === 1) {
                if (b.length === 0) return { text: "Drag Ember Spark into the pot.", color: "#ffe066", strong: 1 };
                if (b.length === 1) return { text: "Good! Now drag in Brine Drop.", color: "#ffe066", strong: 1 };
                if (b.length === 2) return { text: "Ember, then Brine, makes STEAM: the next card counts double!", color: "#e8f6ff", strong: 1, a: "spark", b: "droplet" };
                return { text: "6, then 12 doubled. Tap BREW!", color: "#ffe066", strong: 1 };
            }
            if (lesson === 2 && cur.turn === 1) {
                if (b.length === 0) return { text: "It hits next. This time, Brine goes first.", color: "#ffe066", strong: 1 };
                if (b.length === 1) return { text: "Now Ember on top. Order changes the reaction.", color: "#ffe066", strong: 1 };
                return { text: "Brine, then Ember, makes QUENCH: +5 Block. BREW when ready.", color: "#7ad1ff", strong: 1, a: "droplet", b: "spark" };
            }
            if (lesson === 2) {
                if (!b.length) return { text: "Your call. Ember then Brine hits. Brine then Ember blocks.", color: "#ffe066", strong: 1 };
                return null;
            }
            if (lesson === 3 && cur.turn === 1 && !V.aimed) return { text: "Two rats! Tap the one you want to hit.", color: "#ffe066", strong: 1 };
            if (lesson === 3 && cur.turn === 1 && !V.held) return { text: "Press and hold any card to read it.", color: "#ffe066", strong: 1 };
            if (lesson === 3 && !cur.brew.length) return { text: "Cards cost Heat. Spend your 3 well.", color: "#ffe066", strong: 1 };
            return null;
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
            const b = cc()?.brew; if (!b) return;
            if (!b.length) { V.liqT = toRgb("#37b89c"); return; }
            const m = [0, 0, 0];
            for (const t of b) { const q = toRgb(hex(t.el)); m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }
            V.liqT = m.map((v) => v / b.length);
        }
        function placeCard(idx, pos, from) {
            const cur = cc(), card = V.hand[idx], sIdx = cur.hand.findIndex((k) => k.u === card.u), w = want();
            if (w && card.id !== w) { G.snd.deny(); shakeCard(card); return false; }
            if (sIdx < 0 || !S.canPlace(run, cur.hand[sIdx])) { G.snd.deny(); shakeCard(card); say(S.costOf(cur, card, run) > cur.heat ? "Not enough Heat for that one." : "The pot is full.", "#ffb04a", 1.2); return false; }
            const before = V.primed.length, d = CARDS[card.id], vis = V.cards.get(card.u), L = layout();
            const ev2 = S.place(run, sIdx, pos);
            V.hand.splice(idx, 1); V.hover = -1;
            const n = cur.brew.length, i = cur.brew.findIndex((t) => t.u === card.u), to = i >= 0 ? tokenPos(L, i, n) : { x: L.potX };
            V.flights.push({ card, x: from?.x ?? vis.x, y: from?.y ?? vis.y, x0: from?.x ?? vis.x, y0: from?.y ?? vis.y, x1: to.x, y1: L.rimY, rot: vis.rot, w: L.cw, t: 0, dur: 0.24, u: card.u, el: d.el, vr: (from?.vx ?? 0) * 0.002 });
            V.cards.delete(card.u);
            if (i >= 0) V.tokVis.set(card.u, { appear: -0.24, x: to.x, y: L.rimY, pop: 0 });
            G.snd.fling();
            if (d.instant) { V.q.push(...ev2); V.busy = V.q.length > 0; V.afterQ = () => { syncHand(); refresh(); }; }
            refresh();
            if (V.primed.length > before) V.primedSound = 0.26;
            return true;
        }
        function syncHand() {
            const cur = cc(); if (!cur) return;
            for (const k of cur.hand) if (!V.cards.has(k.u)) addHand(k, 0);
            V.hand = V.hand.filter((k) => cur.hand.some((q) => q.u === k.u));
            V.hand.sort((a, b) => cur.hand.findIndex((q) => q.u === a.u) - cur.hand.findIndex((q) => q.u === b.u));
        }
        function takeBack(i) {
            const cur = cc(), t = cur.brew[i], L = layout();
            if (!t) return;
            if (t.stock) { say("Old Stock stays, and stews stronger.", "#d9ffb0", 1.6); return; }
            if (t.stuck && cur.heat < 1) { G.snd.deny(); say("Skimming Gunk costs 1 Heat.", "#ffb04a", 1.4); return; }
            const pos = tokenPos(L, i, cur.brew.length);
            if (!S.unplace(run, i)) return;
            G.snd.unplop();
            V.tokVis.delete(t.u);
            fx.puff(pos.x, L.rimY, hex(t.el), 3);
            if (!t.stuck) { V.hand.push(cur.hand[cur.hand.length - 1]); V.cards.set(t.u, { x: pos.x, y: L.rimY, rot: 0, tx: 0, ty: 0, lift: 0, s: 1, delay: 0 }); }
            refresh();
        }
        function shakeCard(card) { const v = V.cards.get(card.u); if (v) v.wob = 1; }
        // ---- Brew ----
        function doBrew() {
            const cur = cc();
            if (V.busy || !cur || cur.over) return;
            if (want()) { G.snd.deny(); return; }
            V.tokens = cur.brew.map((t) => ({ ...t }));
            V.busy = true; V.fires = 0; V.totalShown = 0; V.nextShown = 1; V.tier = -1; V.fast = 1; V.hover = -1;
            for (const e of V.en) e.hit = 0;
            V.potShown = 1 + (cur.seedPot ?? 0);
            V.q = S.brew(run);
            V.afterQ = finishResolve;
            V.qT = 0.1;
            saveRun();
        }
        function finishResolve() {
            V.busy = false; V.hover = -1;
            const cur = cc();
            if (run.screen !== "combat") return;
            V.en = cur.enemies.map((e, i) => {
                const o = V.en[i];
                if (o && o.id === e.id) { o.hp = e.hp; o.ward = e.ward; o.st = { ...e.st }; o.move = e.move; o.str = e.str; o.hit = 0; return o; }
                return enVis(e);
            });
            V.php = run.hp; V.pward = cur.p.ward; V.heat = cur.heat; V.pst = { ...cur.p.st };
            V.cap = null; V.capT = 0;
            syncHand();
            refresh();
        }
        const slow = lesson ? 1.6 : 1;
        const tempo = () => Math.max(0.034, 0.3 * slow * Math.pow(0.935, V.fires)) / V.fast;
        function tokenAt(i) { const L = layout(); return { x: tokenPos(L, i, V.tokens.length).x, y: L.rimY }; }
        function setTier() {
            let t = -1;
            TIERS.forEach((q, i) => { if (V.fires >= q[0]) t = i; });
            if (t <= V.tier) return;
            V.tier = t;
            const q = TIERS[t], L = layout();
            say(q[1], q[2], 1.1);
            G.snd.tier(t);
            s.flash(q[2], 0.16); s.shake(3 + t * 2, 0.3);
            if (t >= 2) song("frenzy");
            fx.burst(L.potX, L.rimY, [q[2], "#fff"], 18 + t * 8, { sp: 160 + t * 60, g: 120 });
        }
        function ev(e) {
            const L = layout();
            switch (e.t) {
                case "brewStart": V.stir = 1; G.snd.whoosh(); V.agit = 1; return 0.24;
                case "rx": {
                    const a = tokenAt(e.i), l = e.l >= 0 ? tokenAt(e.l) : a, x = (a.x + l.x) / 2, fresh = !G.meta.reactions[e.key], r = REACTIONS[e.key];
                    if (fresh) { G.meta.reactions[e.key] = 1; saveMeta(); G.snd.unlock(); }
                    if (tempo() > 0.13 || fresh) say(`${fresh ? "New! " : ""}${e.name}: ${r.text}`, e.color, 0.9); else say(`${e.name}!`, e.color, 0.3);
                    V.liqT = toRgb(e.color); V.agit = Math.min(3, V.agit + 0.6);
                    fx.ring(x, L.rimY, e.color, 80 * L.S);
                    fx.puff(x, L.rimY - 6, e.key === "ember>brine" ? "#e6f6ff" : e.color, e.key === "ember>brine" ? 6 : 3);
                    fx.burst(x, L.rimY, e.color, 8, { sp: 120, g: 200, s: 5 });
                    G.snd.reaction(V.fires);
                    return tempo() * 1.05 + (fresh && tempo() > 0.13 ? 0.5 : 0);
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
                    const en = V.en[e.e];
                    if (!en) return 0;
                    V.totalShown += e.v;
                    const from = { x: L.potX + (rnd() - 0.5) * 60, y: L.rimY - 8 }, dur = 0.1, col = hex(e.el ?? "ember");
                    fx.spark(from.x, from.y, col, { a: Math.atan2(en.y - from.y, en.x - from.x), sp: Math.hypot(en.x - from.x, en.y - from.y) / dur, g: 0, drag: 1, life: dur, s: 11 });
                    V.later.push({ t: dur, fn: () => {
                        en.hp = e.hp; en.ward = e.ward; en.shake = Math.min(1, en.shake + 0.6); en.flash = 1;
                        en.hit += e.v - e.blocked; en.hitPop = 1;
                        fx.burst(en.x, en.y, [col, "#fff"], e.big ? 12 : 5, { sp: e.big ? 240 : 150, s: 5 });
                        G.snd.hit(e.big);
                        if (e.big) { s.shake(Math.min(10, 3 + e.v / 60), 0.14); s.freeze(Math.min(0.08, 0.03 + e.v / 4000)); }
                    } });
                    return 0.004;
                }
                case "miss": V.totalShown += e.v; return 0;
                case "die": {
                    const en = V.en[e.e]; if (!en) return 0;
                    V.later.push({ t: 0.12, fn: () => {
                        en.hp = 0; en.dying = 1; G.snd.die();
                        fx.burst(en.x, en.y, ["#fff", "#ffd27a", "#b45cff"], 26, { sp: 240, g: 80 });
                        fx.puff(en.x, en.y, "#3a2a4a", 8);
                        if (e.doom) say(`${en.name} is Doomed!`, "#ff6b9a", 0.9);
                        s.shake(5, 0.2); s.freeze(0.06);
                    } });
                    return 0.02;
                }
                case "ward": V.pward = e.ward; V.wardPulse = 1; G.snd.ward(); fx.burst(L.witchX, L.witchY, "#8fd6ff", 5, { sp: 80, s: 5 }); return 0.01;
                case "heal": if (e.v > 0) { V.php = e.hp; G.snd.heal(); fx.burst(L.witchX, L.witchY, "#9fe66f", 6, { sp: 80, s: 5 }); } return 0.01;
                case "lose": V.php = e.hp; V.hurt = 0.5; return 0.02;
                case "gold": G.snd.coin(); return 0.01;
                case "status": { const en = V.en[e.e]; if (en) { en.st[e.k] = e.v; en.stPulse = 1; } return tempo() > 0.13 ? hint(e.k) : 0; }
                case "strip": { const en = V.en[e.e]; if (en) en.ward = 0; return 0; }
                case "pot": { let w = 0; if (e.v > V.potShown) { V.potShown = e.v; V.potPulse = 1; G.snd.potency(V.potShown); w = hint("pot"); } return 0.012 + w; }
                case "next": V.nextShown = e.v; return 0.01;
                case "reflux": G.snd.reflux(); fx.ring(L.potX, L.rimY, "#7ef0c8", 150 * L.S, 0.5); V.agit = Math.min(3, V.agit + 0.5); return tempo() * 0.8 + hint("reflux");
                case "ring": fx.ring(L.potX, L.rimY, "#b45cff", 160 * L.S, 0.5); return tempo() + hint("ring");
                case "flare": G.snd.tier(1); s.flash("#ff9a4a", 0.14); if (!hint("flare")) say("Flare! +1 Power", "#ffb04a", 0.7); fx.burst(L.potX, L.rimY + 30, ["#ffd25a", "#ff7a2f"], 26, { sp: 240 }); return tempo();
                case "flareTick": V.flare = e.v; return 0;
                case "boilover": G.snd.boilover(); s.flash("#ffffff", 0.5); s.shake(16, 0.9); say("BOIL OVER!", "#7ef0ff", 2.2); V.agit = 4; for (let i = 0; i < 40; i++) fx.spark(L.potX + (rnd() - 0.5) * 200, L.rimY, ["#7ef0ff", "#ff5ca8", "#ffe066"][i % 3], { a: -1.57 + (rnd() - 0.5), sp: 300 + rnd() * 300, g: 420, s: 8 }); return 0.8;
                case "note": if (tempo() > 0.13) say(e.text, "#ffe9b8", 0.6); return 0.05;
                case "heat": V.heat = e.v; V.heatPulse = 1; return 0.04;
                case "brewEnd": {
                    for (const t of V.tokens) { const tv = V.tokVis.get(t.u), a = tv ?? { x: L.potX, y: L.rimY }; if (!t.stock || t.stuck) fx.burst(a.x, a.y, hex(t.el), 6, { sp: 80, s: 4 }); }
                    const keep = run.witch === "thistle" ? [...V.tokens].reverse().find((t) => t.el !== "gunk") : null;
                    V.tokens.forEach((t) => { if (!keep || t.u !== keep.u) V.tokVis.delete(t.u); });
                    V.tokens = [];
                    if (e.total > 0) G.snd.pour(e.total);
                    if (V.tier >= 2) song(kind === "boss" ? "boss" : "combat");
                    const big = e.fires >= 6 || e.total >= 60;
                    if (big) {
                        const name = recipeName(e.recipe), best = e.total > (G.meta.best?.dmg ?? 0);
                        if (best) { G.meta.best = { dmg: e.total, fires: e.fires, pot: e.pot, recipe: e.recipe, name }; saveMeta(); }
                        say(`${best && e.total >= 40 ? "New best! " : ""}${name}: ${fmt(e.total)}!`, "#ffe066", 1.4);
                        s.shake(Math.min(14, 4 + V.tier * 2), 0.35);
                        return 1.3 / Math.max(1, V.fast * 0.7);
                    }
                    return lesson ? 0.6 : 0.24;
                }
                case "discard": {
                    const keepU = new Set((cc()?.hand ?? []).map((k) => k.u));
                    for (const k of V.hand) if (!keepU.has(k.u)) { const v = V.cards.get(k.u); if (v) V.dissolves.push({ card: k, x: v.x, y: v.y, w: L.cw, rot: v.rot, t: 0, life: 0.4, vx: 0 }); V.cards.delete(k.u); }
                    V.hand = V.hand.filter((k) => keepU.has(k.u));
                    return 0.12;
                }
                case "scald": V.php = e.hp; V.hurt = 0.5; say(`Scalded for ${e.v}.`, "#ff9a4a", 0.8); G.snd.ouch(false); return 0.3;
                case "burnTick": {
                    const en = V.en[e.e]; if (!en) return 0;
                    en.hp = e.hp; en.shake = 0.5; en.hit = e.v; en.hitPop = 1;
                    for (let i = 0; i < 8; i++) fx.spark(en.x + (rnd() - 0.5) * en.size * 0.6, en.y + en.size * 0.3, "#ff7a2f", { a: -1.57, sp: 120, g: -120, s: 8 });
                    say(`${en.name} burns for ${e.v}.`, "#ff9a4a", 0.6);
                    G.snd.hit(false);
                    return 0.4;
                }
                case "stunned": { const en = V.en[e.e]; if (en) say(`${en.name} is frozen.`, "#bfeaff", 0.6); return 0.4; }
                case "stumble": { const en = V.en[e.e]; if (en) { say(`${en.name} stumbles!`, "#ffe066", 0.9); G.snd.toll(); s.shake(6, 0.3); } return 0.6; }
                case "freeze": s.flash("#bfeaff", 0.2); return 0.1;
                case "second": say("Second Boil! Brew again.", "#ffe066", 1.2); G.snd.tier(2); return 0.6;
                case "act": {
                    const en = V.en[e.e]; if (!en) return 0;
                    en.lunge = 1; en.hit = 0;
                    say(`${en.name}: ${e.name}`, "#ffd9c0", 1);
                    return 0.42 * (lesson ? 1.5 : 1);
                }
                case "ehit": {
                    const en = V.en[e.e], pct = e.v - e.blocked;
                    V.pward = e.ward; V.php = e.hp;
                    if (en) en.lunge = Math.max(en.lunge, 0.7);
                    if (pct > 0) { V.hurt = Math.min(1, 0.4 + pct / 25); s.shake(clamp(2 + pct / 3, 2, 12), 0.22); s.flash("#b0123a", 0.1); G.snd.ouch(pct >= 15); fx.burst(L.witchX, L.witchY, ["#ff5a5a", "#fff"], 10, { sp: 170 }); say(e.blocked ? `You took ${pct}. Blocked ${e.blocked}.` : `You took ${pct}.`, "#ff9a8a", 0.8); }
                    else { G.snd.ward(); fx.burst(L.witchX, L.witchY, "#8fd6ff", 8, { sp: 120 }); say(`Blocked all ${e.blocked}!`, COLORS.ward, 0.8); }
                    return 0.34 * (lesson ? 1.6 : 1);
                }
                case "eheal": { const en = V.en[e.e]; if (en) en.hp = e.hp; return 0.1; }
                case "eward": { const en = V.en[e.e]; if (en) en.ward = e.ward; G.snd.ward(); return 0.1; }
                case "ebuff": { const en = V.en[e.e]; if (en) en.str = e.str; G.snd.status(); return 0.12; }
                case "pstatus": V.pst[e.k] = e.v; say(`${PST[e.k]?.[0] ?? e.k}: ${PST[e.k]?.[1] ?? ""}`, "#ffb0c0", 1); G.snd.status(); return 0.3;
                case "addGunk": hint("gunk"); return 0.22;
                case "potGunk": if (!hint("gunk")) say("Gunk in your pot!", "#b5b283", 0.9); fx.puff(L.potX, L.rimY, "#7c7a52", 6); G.snd.plop("gunk"); return 0.3;
                case "summon": { const n = cc()?.enemies[e.e]; if (n) { V.en[e.e] = enVis(n); V.en[e.e].in = 1; } return 0.3; }
                case "revive": V.php = e.hp; s.flash("#ff8ab0", 0.4); say("Bottled Familiar saves you!", "#ff8ab0", 1.3); G.snd.unlock(); return 0.8;
                case "intent": { const en = V.en[e.e]; if (en) en.move = e.move; return 0; }
                case "draw": {
                    const cur2 = cc(); if (!cur2) return 0;
                    e.cards.forEach((u, i) => { const k = cur2.hand.find((q) => q.u === u); if (k && !V.cards.has(u)) addHand(k, i); });
                    return 0.08;
                }
                case "shuffle": G.snd.page(); return 0.05;
                case "turn": V.heat = e.heat; V.pward = e.ward; V.heatPulse = 1; V.pst = { ...(cc()?.p.st ?? {}) }; return 0.05;
                case "instant": G.snd.reaction(3); return 0.2;
                case "win": V.ended = true; V.endT = 0.9; G.snd.win(); say(kind === "boss" ? "Boss slain!" : lesson === 1 ? "You brewed a win!" : "Victory!", "#ffe066", 1.4); if (lesson === 3) { G.meta.tutorial = true; saveMeta(); } return 0.8;
                case "defeat": V.ended = true; V.endT = 1.3; G.snd.lose(); s.flash("#000", 0.6); return 1;
            }
            return 0;
        }
        // ---- Input ----
        const handBase = (L, i, n) => {
            const gap = 2, fit5 = L.cw + gap, sp = n > 1 ? Math.min(fit5, (L.handW - L.cw) / (n - 1)) : 0, off = i - (n - 1) / 2;
            return { x: L.handX + off * sp, y: L.handY + off * off * 0.9, rot: off * 0.022, sp };
        };
        function hitHand(L, x, y) {
            if (y < L.handTop - 6 || y > L.handY + L.ch / 2 + 6) return -1;
            const n = V.hand.length; let best = -1, bd = 1e9;
            for (let i = 0; i < n; i++) { const dd = Math.abs(x - handBase(L, i, n).x); if (dd < bd) { bd = dd; best = i; } }
            return bd < L.cw * 0.62 ? best : -1;
        }
        function hitToken(L, x, y) {
            const cur = cc(); if (!cur || Math.abs(y - L.rimY) > 34 * L.S + 8) return -1;
            for (let i = 0; i < cur.brew.length; i++) { const p = tokenPos(L, i, cur.brew.length); if (Math.abs(x - p.x) < p.sp * 0.5 + 2) return i; }
            return -1;
        }
        function insertAt(L, x) {
            const n = cc().brew.length;
            for (let i = 0; i < n; i++) if (x < tokenPos(L, i, n).x) return i;
            return n;
        }
        function input(dt, L) {
            const p = s.input.pointer, touch = s.input.touchMode;
            if (G.overlay) { V.press = null; V.drag = null; return; }
            for (const k of hurryKeys()) {
                const m = /^Digit([1-9])$/.exec(k);
                if (m && !V.busy) { const i = +m[1] - 1; if (V.hand[i]) placeCard(i); }
                if (k === "Escape") settings();
                if (k === "KeyD") openDeck();
                if (k === "KeyZ" && V.hover >= 0) zoom(V.hand[V.hover]);
                if (k === "Backspace" && !V.busy) { const n = cc()?.brew.length ?? 0; if (n) takeBack(n - 1); }
                if ((k === "ArrowLeft" || k === "ArrowRight") && V.hand.length) { V.hover = clamp((V.hover < 0 ? 0 : V.hover) + (k === "ArrowLeft" ? -1 : 1), 0, V.hand.length - 1); G.snd.notch(V.hover); }
                if (k === "ArrowUp" && V.hover >= 0 && !V.busy) placeCard(V.hover);
            }
            if (V.busy) { if (p.pressed) V.fast = Math.min(4, V.fast * 2); V.press = null; V.drag = null; return; }
            // Mouse hover without a press: the card under the pointer lifts to be read.
            if (!touch && !p.down && !V.drag) {
                const h = hitHand(L, p.x, p.y);
                if (h !== V.hover && (h >= 0 || p.dx !== 0 || p.dy !== 0)) { if (h >= 0) G.snd.notch(h); V.hover = h; }
            }
            if (p.pressed) {
                const h = hitHand(L, p.x, p.y), tk = hitToken(L, p.x, p.y), st = V.stBoxes.find((b) => Math.abs(p.x - b.x) < 13 && Math.abs(p.y - b.y) < 13);
                if (st) { tip(st.title, st.text); return; }
                if (Math.abs(p.y - L.capY) < L.capH / 2 && V.primed.length) { reactionList(); return; }
                if (h >= 0) { V.press = { kind: "hand", x: p.x, y: p.y, t: 0, moved: 0 }; if (h !== V.hover) { V.hover = h; G.snd.notch(h); } G.snd.lift(); }
                else if (tk >= 0) V.press = { kind: "tok", x: p.x, y: p.y, t: 0, moved: 0, idx: tk };
                else { const en = V.enBoxes.find((b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2); if (en) V.press = { kind: "foe", x: p.x, y: p.y, t: 0, moved: 0, idx: en.i }; }
            }
            if (V.press) {
                const q = V.press; q.t += dt;
                q.moved = Math.max(q.moved, Math.hypot(p.x - q.x, p.y - q.y));
                if (q.kind === "hand" && p.down && !V.drag) {
                    const h = hitHand(L, p.x, Math.max(p.y, L.handTop + 4));
                    if (h >= 0 && h !== V.hover && p.y > L.handTop - 10) { V.hover = h; q.t = 0; q.x = p.x; q.moved = 0; G.snd.notch(h); }
                    if (q.y - p.y > 20 && V.hover >= 0) {
                        const k = V.hand[V.hover], vis = V.cards.get(k.u);
                        V.drag = { u: k.u, x: p.x, y: p.y, vx: 0, vy: 0, rot: 0 };
                        vis.x = p.x; vis.y = p.y;
                        G.snd.lift();
                    } else if (q.t > 0.5 && q.moved < 12) {
                        const k = V.hand[V.hover];
                        V.press = null; V.held = true;
                        if (k) zoom(k);
                        return;
                    }
                }
                if (q.kind === "tok" && p.down && q.t > 0.4 && q.moved < 10) { const t = cc().brew[q.idx]; V.press = null; if (t) zoom(t); return; }
                if (q.kind === "foe" && p.down && q.t > 0.4 && q.moved < 10) { V.press = null; foeInfo(q.idx); return; }
            }
            if (V.drag) {
                const dr = V.drag;
                // Spring with mass: the card lags and swings behind the finger.
                const ax = (p.x - dr.x) * 260 - dr.vx * 22, ay = (p.y - dr.y) * 260 - dr.vy * 22;
                dr.vx += ax * dt; dr.vy += ay * dt; dr.x += dr.vx * dt; dr.y += dr.vy * dt;
                dr.rot += (clamp(dr.vx * 0.0012, -0.6, 0.6) - dr.rot) * Math.min(1, dt * 12);
                dr.over = dr.y < L.handTop && Math.abs(dr.x - L.potX) < L.potW * 1.5;
                dr.ins = insertAt(L, dr.x);
            }
            if (p.released) {
                const q = V.press;
                if (V.drag) {
                    const dr = V.drag;
                    V.drag = null; V.press = null;
                    const idx = V.hand.findIndex((k) => k.u === dr.u), v = V.cards.get(dr.u);
                    if (v) { v.x = dr.x; v.y = dr.y; v.rot = dr.rot; }
                    const flung = dr.vy < -420 || dr.y < L.handTop - 12;
                    if (flung && idx >= 0) placeCard(idx, dr.over && !lesson ? dr.ins : undefined, { x: dr.x, y: dr.y, vx: dr.vx }); else G.snd.snapBack();
                } else if (q) {
                    V.press = null;
                    if (q.moved < 14 && q.t < 0.32) {
                        if (q.kind === "hand" && V.hover >= 0) placeCard(V.hover);
                        if (q.kind === "tok" && !(lesson === 1)) takeBack(q.idx);
                        if (q.kind === "foe") {
                            const cur = cc(), en = V.en[q.idx];
                            if (cur.target !== q.idx) { cur.target = q.idx; V.aimed = true; G.meta.seen.aim = 1; G.snd.notch(q.idx); refresh(); en.flash = 0.4; say(`Aiming at ${en.name}.`, "#ffcf6b", 1.1); } else foeInfo(q.idx);
                        }
                    }
                    if (touch) V.hover = -1;
                } else if (touch) V.hover = -1;
            }
        }
        function foeInfo(i) {
            const e = V.en[i], cur = cc(), real = cur.enemies[i]; if (!e || !real) return;
            const d = ENEMIES[e.id], m = S.moveOf(real), lines = [];
            if (m) lines.push(`Next: ${m.n}. ${describeMove(m, S.intentDamage(run, cur, real))}`);
            if (d.rule) lines.push(d.rule);
            tip(e.name, `${lines.join(" ")}`, { sprite: `foe_${e.id}`, sub: d.title ?? d.blurb });
        }
        function describeMove(m, dmg) {
            const p = [];
            if (m.dmg) p.push(m.hits > 1 ? `Hits for ${dmg}, ${m.hits} times.` : `Hits for ${dmg}.`);
            if (m.ward) p.push(`Gains ${m.ward} Block.`);
            if (m.heal) p.push(`Heals ${m.heal}.`);
            if (m.buff?.str) p.push(`Grows ${m.buff.str} stronger.`);
            if (m.status) for (const k in m.status) p.push(`${PST[k]?.[0] ?? k} ${m.status[k]}.`);
            if (m.add?.gunk) p.push(`Adds ${m.add.gunk} Gunk to your discard.`);
            if (m.pot) p.push(`Tosses ${m.pot} Gunk into your pot.`);
            if (m.summon) p.push("Calls for help.");
            return p.join(" ");
        }
        function reactionList() {
            const L = V.primed.map((r) => `${r.name}: ${r.text}`).join(" ");
            tip("In the pot", L, { sub: "Reactions ready to fire" });
        }
        function openDeck() {
            const cur = cc();
            deckView("Your deck", run.deck, { sub: cur ? `${cur.draw.length} to draw, ${cur.disc.length} used` : undefined });
        }
        // ---- Buttons ----
        hudEntity(s, () => ({ ...run, hp: Math.max(0, V.php) }), null, () => V.pward);
        const brewBtn = s.add([ui(), spellBtn("BREW", { width: 200, height: 50, size: 20, noteSize: 13, color: "#c0401e", action: "confirm", onTap: doBrew, quiet: true, radius: 22 }), { name: "brew" }]);
        const deckBtn = s.add([ui(), spellBtn("Deck", { width: 60, height: 44, size: 13, color: "#4a2a7a", onTap: openDeck, radius: 12 })]);
        const gearBtn = s.add([ui(), spellBtn("≡", { width: 44, height: 44, size: 19, color: "#4a2a7a", onTap: settings, radius: 12 })]);
        const placeButtons = (L) => {
            brewBtn.pos.set(L.brewX, L.brewY); brewBtn.size.set(L.brewW, L.brewH);
            deckBtn.pos.set(L.W - 80 - L.sr, L.top + 23); gearBtn.pos.set(L.W - 26 - L.sr, L.top + 23);
        };
        placeButtons(layout());
        // ---- Update ----
        s.onUpdate((dt) => {
            const L = layout();
            input(dt, L);
            const cur = cc();
            placeButtons(L);
            const hasBrew = (cur?.brew.length ?? 0) > 0, locked = !!want() || (lesson === 3 && cur?.turn === 1 && !V.aimed);
            brewBtn.hidden = V.busy || V.ended;
            brewBtn.txt = hasBrew ? "BREW" : "End Turn";
            brewBtn.color_ = hasBrew ? "#c0401e" : "#4a2a7a";
            brewBtn.pulse = hasBrew && !locked; brewBtn.disabled = !!want();
            const pv = V.pv, bits = [];
            if (hasBrew && pv) { if (pv.total) bits.push(`${fmt(pv.total)} damage`); if (pv.ward) bits.push(`${fmt(pv.ward)} Block`); if (pv.heal) bits.push(`${pv.heal} heal`); }
            brewBtn.note = bits.join(", ") || (hasBrew ? "Do it" : null);
            // Resolve queue.
            if (V.busy) {
                V.qT -= dt;
                let guard = 0;
                while (V.qT <= 0 && V.q.length && guard++ < 20) V.qT += ev(V.q.shift());
                if (!V.q.length && V.qT <= 0 && !V.later.length) { const f = V.afterQ; V.afterQ = null; V.busy = false; f?.(); }
            }
            for (let i = V.later.length - 1; i >= 0; i--) { const l = V.later[i]; l.t -= dt; if (l.t <= 0) { V.later.splice(i, 1); l.fn(); } }
            if (V.ended && !V.busy) { V.endT -= dt; if (V.endT <= 0) { V.ended = false; if (run.screen === "end") game.go("end", {}, { fade: 0.4 }); else route(); } }
            for (let i = V.flights.length - 1; i >= 0; i--) {
                const f = V.flights[i]; f.t += dt;
                const q = Math.min(1, f.t / f.dur);
                f.x = lerp(f.x0, f.x1, q); f.y = lerp(f.y0, f.y1, q * q) - Math.sin(q * Math.PI) * 30; f.rot += (f.vr + 3) * dt * (f.u % 2 ? 1 : -1);
                f.w2 = f.w * (1 - q * 0.5);
                if (q >= 1) {
                    V.flights.splice(i, 1);
                    G.snd.plop(f.el);
                    V.agit = Math.min(2.4, V.agit + 0.9);
                    fx.ring(f.x1, L.rimY, hex(f.el), 72 * L.S); fx.burst(f.x1, L.rimY, [hex(f.el), "#ffffff"], 14, { sp: 150, g: 460, s: 5 });
                    V.dissolves.push({ card: f.card, x: f.x1, y: L.rimY - 16, w: f.w * 0.5, rot: f.rot, t: 0, life: 0.55, vx: 0 });
                    const tv = V.tokVis.get(f.u); if (tv) { tv.appear = 0; tv.pop = 1; }
                }
            }
            for (let i = V.dissolves.length - 1; i >= 0; i--) { const q = V.dissolves[i]; q.t += dt; q.x += q.vx * dt; if (rnd() < 0.6) fx.spark(q.x + (rnd() - 0.5) * q.w, q.y + (rnd() - 0.5) * q.w, hex(CARDS[q.card.id].el), { sp: 40, g: -80, s: 4, life: 0.5 }); if (q.t > q.life) V.dissolves.splice(i, 1); }
            if (V.primedSound) { V.primedSound -= dt; if (V.primedSound <= 0) { V.primedSound = 0; G.snd.primed(); const r = V.primed.at(-1); if (r) { fx.ring(L.potX, L.rimY, r.color, 90 * L.S); V.liqT = toRgb(r.color); V.capPop = 1; } } }
            // Hand physics.
            const n = V.hand.length;
            V.hand.forEach((k, i) => {
                const v = V.cards.get(k.u); if (!v) return;
                if (v.delay > 0) { v.delay -= dt; return; }
                const b = handBase(L, i, n), dragged = V.drag?.u === k.u, hov = V.hover === i && !V.busy && !dragged;
                let tx = b.x, ty = b.y, tr = b.rot, ts = 1;
                if (hov) { ts = L.lw / L.cw; tx = clamp(b.x, L.lw * 0.54 + L.sl, L.W - L.lw * 0.54 - L.sr); ty = L.handTop - L.lw * ASPECT / 2 - 2 + L.ch * 0.06; tr = 0; }
                if (dragged) { v.x = V.drag.x; v.y = V.drag.y; v.rot = V.drag.rot; ts = 1.2; }
                else { const K = 1 - Math.pow(0.0012, dt); v.x += (tx - v.x) * K; v.y += (ty - v.y) * K; v.rot += (tr - v.rot) * K; }
                v.s += (ts - v.s) * (1 - Math.pow(0.0005, dt));
                v.lift += ((hov || dragged ? 1 : 0) - v.lift) * Math.min(1, dt * 14);
                const p = s.input.pointer, near = hov || dragged, wx = near ? clamp((p.x - v.x) / (L.cw * v.s * 0.5), -1, 1) : 0, wy = near ? clamp((p.y - v.y) / (L.ch * v.s * 0.5), -1, 1) : 0, dragTilt = dragged ? clamp(V.drag.vx * 0.0016, -1, 1) : 0;
                v.tx += (wx * 0.5 + dragTilt - v.tx) * Math.min(1, dt * 16); v.ty += (wy * 0.5 - v.ty) * Math.min(1, dt * 16);
                if (v.wob) { v.wob = Math.max(0, v.wob - dt * 3); v.x += Math.sin(v.wob * 30) * 3; }
            });
            // Liquid.
            for (let i = 0; i < 3; i++) V.liq[i] += (V.liqT[i] - V.liq[i]) * Math.min(1, dt * 4);
            V.agit += ((V.busy ? 0.9 : hasBrew ? 0.5 : 0.28) - V.agit) * Math.min(1, dt * 1.6);
            V.bubT = (V.bubT ?? 0) + dt * (6 + V.agit * 34 * (V.tier >= 1 ? 1 + V.tier * 0.5 : 1));
            while (V.bubT > 1 && V.bubbles.length < 120) {
                V.bubT -= 1;
                const a = rnd() * 6.28, r = Math.sqrt(rnd());
                V.bubbles.push({ x: Math.cos(a) * r * 0.92, y: Math.sin(a) * r * 0.86, r: (2 + rnd() * 5.5 * (1 + V.agit * 0.25)) * L.S, t: 0, life: 0.34 + rnd() * 0.5 });
            }
            if (V.bubT > 1) V.bubT = 1;
            for (let i = V.bubbles.length - 1; i >= 0; i--) { const b = V.bubbles[i]; b.t += dt; if (b.t > b.life) { V.bubbles[i] = V.bubbles[V.bubbles.length - 1]; V.bubbles.pop(); } }
            V.hueT += dt;
            if (V.tier >= 1 && rnd() < dt * (10 + V.tier * 16)) { const side = rnd() < 0.5 ? -1 : 1; fx.spark(L.potX + side * (L.potW + 6 * L.S), L.rimY + 6, toHex(V.liq), { a: 1.57 + side * -0.5, sp: 40 + rnd() * 50, g: 520, s: 3 + rnd() * 4, life: 0.8, drag: 1 }); }
            for (const e of V.en) {
                if (e.tx !== undefined && e.x === 0) { e.x = e.tx; e.y = e.ty; }
                e.x += ((e.tx ?? e.x) - e.x) * Math.min(1, dt * 6); e.y += ((e.ty ?? e.y) - e.y) * Math.min(1, dt * 6);
                e.shake = Math.max(0, e.shake - dt * 4); e.flash = Math.max(0, e.flash - dt * 7); e.lunge = Math.max(0, e.lunge - dt * 4); e.in = Math.max(0, e.in - dt * 3); e.stPulse = Math.max(0, (e.stPulse ?? 0) - dt * 4); e.hitPop = Math.max(0, e.hitPop - dt * 6);
                if (e.dying) e.dead = Math.min(1, e.dead + dt * 2.2);
            }
            V.hurt = Math.max(0, V.hurt - dt * 2); V.heatPulse = Math.max(0, V.heatPulse - dt * 3); V.stir = Math.max(0, V.stir - dt);
            for (const k of ["potPulse", "wardPulse", "capPop"]) V[k] = Math.max(0, (V[k] ?? 0) - dt * 4);
            for (const t of V.tokVis.values()) { if (t.appear < 1) t.appear += dt * 6; t.pop = Math.max(0, t.pop - dt * 6); }
            if (V.capT > 0) { V.capT -= dt; if (V.capT <= 0 && !V.busy) V.cap = null; }
            V.t = (V.t ?? 0) + dt;
            fx.update(dt);
        });
        // ---- Draw: battlefield (no text but the foes' own numbers) ----
        s.onDraw((d) => {
            const L = layout(), W = L.W, H = L.H, bgk = Math.max(W / 300, H / 420) * 1.04, lc = toHex(V.liq);
            d.sprite(`bg_${run.act}`, { x: W / 2, y: H / 2, width: 300 * bgk, height: 420 * bgk });
            d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#0d0719", opacity: 0.38 });
            d.additive(() => d.sprite("glow", { x: L.potX, y: L.rimY, width: 420 * L.S, height: 300 * L.S, color: lc, opacity: 0.26 + V.agit * 0.08 + (V.tier >= 0 ? 0.1 + V.tier * 0.06 : 0) }));
            if (V.tier >= 1) {
                const a = Math.min(0.6, 0.16 + V.tier * 0.1), col = TIERS[V.tier][2], sz = (420 + V.tier * 60) * L.S * (1 + Math.sin(s.time * 9) * 0.03);
                d.additive(() => { d.sprite("rays", { x: L.potX, y: L.rimY, width: sz * 1.5, height: sz * 1.5, rot: s.time * 0.7, color: col, opacity: a }); d.sprite("rays", { x: L.potX, y: L.rimY, width: sz, height: sz, rot: -s.time * 1.1, color: "#ffffff", opacity: a * 0.5 }); });
            }
            drawEnemies(d, L);
            // Pot.
            const wob = Math.sin(V.stir * 20) * V.stir * 4 + (V.tier >= 1 ? Math.sin(s.time * 40) * (V.tier * 0.8) : 0);
            d.additive(() => { for (let i = 0; i < 7; i++) { const x = L.potX + (i - 3) * 30 * L.S, h = (26 + 13 * Math.sin(s.time * 9 + i * 2.4) + V.agit * 10) * L.S; d.sprite("glow", { x, y: L.rimY + POT.fireY * L.S - h * 0.5, width: 42 * L.S, height: h * 1.7, color: i % 2 ? "#ff7a2f" : "#ffb347", opacity: 0.7 }); } });
            d.sprite("pot", { x: L.potX + wob, y: L.rimY + POT.cy * L.S, width: POT.w * L.S, height: POT.w * L.S });
            const lq = (h, k) => toHex(V.liq.map((v) => v + (h - v) * k));
            d.push(); d.translate(L.potX + wob, L.rimY + 2 * L.S); d.scale(1, L.potH / L.potW);
            d.circle(L.potW * 0.96, { color: lq(0, 0.36) }); d.circle(L.potW * 0.9, { color: lc }); d.circle(L.potW * 0.6, { color: lq(255, 0.2), opacity: 0.5 });
            d.pop();
            for (const b of V.bubbles) { const f = b.t / b.life, r = b.r * (0.5 + f * 0.8); d.sprite("bub", { x: L.potX + wob + b.x * L.potW, y: L.rimY + 2 * L.S + b.y * L.potH, width: r * 2, height: r * 1.8, color: lq(255, 0.6), opacity: f > 0.85 ? (1 - f) * 6 : 1 }); }
            drawTokens(d, L, cc());
            // Witch stands beside the pot.
            const kick = V.hurt * 10 * Math.sin(s.time * 50);
            d.push(); d.translate(L.witchX + kick, L.witchY + Math.sin(s.time * 2) * 1.5); d.rotate(Math.sin(V.stir * 10) * 0.06);
            d.sprite(`witch_${run.witch}`, { width: 220 * L.witchS, height: 280 * L.witchS });
            d.pop();
            fx.draw(d);
        });
        function drawEnemies(d, L) {
            V.enBoxes = []; V.stBoxes = [];
            const cur = cc(), mt = Math.max(minText(), 12);
            V.en.forEach((e, i) => {
                if (e.dead >= 1) return;
                const sz = e.size, a = 1 - e.dead, bob = Math.sin(s.time * 1.8 + e.ph) * 2, sk = e.shake * 6 * Math.sin(s.time * 60);
                const lx = (L.land ? -1 : 0) * e.lunge * 22, ly = (L.land ? 0 : 1) * e.lunge * 18, x = e.x + sk + lx, y = e.y + bob + ly + e.dead * 16;
                const cellW = L.foeCell - 6, by = e.y + sz / 2 + L.hpH / 2 + 2, target = cur?.target === i && e.hp > 0 && V.en.filter((q) => q.hp > 0).length > 1;
                d.sprite("glow", { x: e.x, y: e.y + sz * 0.46, width: sz * 0.9, height: sz * 0.2, color: "#07040f", opacity: 0.7 * a });
                if (target) d.additive(() => d.sprite("ringfx", { x: e.x, y: e.y + sz * 0.45, width: sz * 0.96, height: sz * 0.28, color: "#ffcf6b", opacity: 0.85 }));
                const sq = 1 + e.shake * 0.08 - e.dead * 0.4, inS = 1 - e.in;
                d.sprite(`foe_${e.id}`, { x, y, width: sz * sq * (1 + e.dead * 0.5) * inS, height: sz * (2 - sq) * (1 - e.dead * 0.7) * inS, opacity: a });
                if (e.flash > 0) d.additive(() => d.sprite(`foe_${e.id}`, { x, y, width: sz * sq, height: sz * (2 - sq), opacity: e.flash * 0.9 * a }));
                V.enBoxes.push({ x: e.x, y: L.foeTop + L.foeH / 2, w: L.foeCell, h: L.foeH, i });
                if (e.hp <= 0) return;
                // HP, with the ghost of what this brew would leave.
                const bw = Math.min(cellW, 130), f = clamp(e.hp / e.maxHp, 0, 1), after = !V.busy && V.pv?.hp?.[i] !== undefined ? clamp(V.pv.hp[i] / e.maxHp, 0, f) : f;
                d.rect(bw + 2, L.hpH, { x: e.x, y: by, color: "#07040f", radius: 7 });
                d.rect(Math.max(8, (bw - 2) * f), L.hpH - 3, { x: e.x - (bw - 2) * (1 - f) / 2, y: by, color: "#6a2436", radius: 6 });
                if (after > 0.01) d.rect(Math.max(8, (bw - 2) * after), L.hpH - 3, { x: e.x - (bw - 2) * (1 - after) / 2, y: by, color: f < 0.3 ? "#ff5a3a" : "#d8364f", radius: 6 });
                d.text(e.ward > 0 ? `${fmt(e.hp)}+${fmt(e.ward)}` : fmt(e.hp), { x: e.x, y: by, size: mt, bold: true, font: FONT, color: "#fff" });
                // Statuses, in their own row.
                const list = Object.keys(ST).filter((k) => e.st[k] > 0), sy = by + L.hpH / 2 + L.stH / 2;
                let sx = e.x - 25 * (list.length - 1) / 2;
                for (const k of list) {
                    const c2 = KEYWORDS[ST[k]].color, r = 11 * (1 + (e.stPulse ?? 0) * 0.15), v = e.st[k];
                    d.circle(r, { x: sx, y: sy, color: "#120822" }); d.circle(r, { x: sx, y: sy, color: c2, outline: 1.5 });
                    const t = fit(v > 99 ? "99+" : v, 20, 18, mt, true);
                    d.text(t.text, { x: sx, y: sy, size: t.size, bold: true, font: FONT, color: "#fff" });
                    V.stBoxes.push({ x: sx, y: sy, title: ST[k], text: KEYWORDS[ST[k]].text });
                    sx += 25;
                }
                // The slot above a foe belongs to one thing at a time: its intent, or the damage it is taking.
                const iy = L.foeTop + L.intentH / 2 + 1;
                if (V.busy && e.hit > 0) { const t = fit(fmt(e.hit), cellW, L.intentH + 2, 22, true), k = 1 + e.hitPop * 0.14; d.push(); d.translate(e.x, iy); d.scale(k); d.text(t.text, { size: t.size, bold: true, font: FONT, color: "#ffe066" }); d.pop(); }
                else if (!V.busy) { const real = cur?.enemies[i], m = e.move ? ENEMIES[e.id].moves[e.move] : null; if (m) drawIntent(d, e, m, real, iy, cellW, mt); }
            });
        }
        function drawIntent(d, e, m, real, y, maxW, mt) {
            const cur = cc(), dmg = real && cur ? S.intentDamage(run, cur, real) : (m.dmg ?? 0), x = e.x;
            // One pill: the biggest thing it is about to do.
            const [ic, t, col] = m.dmg ? ["glyph_ember", m.hits > 1 ? `${dmg}×${m.hits}` : `${dmg}`, "#ff8a7a"] : m.ward ? ["wardicon", `${m.ward}`, "#8fd6ff"] : m.buff ? ["heatgem", "Up", "#ffb04a"] : m.summon ? ["glyph_gunk", "Help", "#ffb0c0"] : ["glyph_hex", "Curse", "#d08bff"];
            const tw = Math.ceil(game.renderer.measureText(t, { size: 14, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width), w = Math.min(maxW, tw + 34);
            d.rect(w, 24, { x, y, color: "#120822", radius: 12 });
            d.rect(w, 24, { x, y, color: col, radius: 12, outline: 1.3 });
            d.sprite(ic, { x: x - w / 2 + 13, y, width: 18, height: 18 });
            d.text(t, { x: x + 9, y, size: 14, bold: true, font: FONT, color: col });
        }
        function drawTokens(d, L, cur) {
            const list = V.tokens.length ? V.tokens : cur?.brew ?? [], n = list.length, cap = S.potSize(run, cur ?? c), shown = Math.max(n, cap), y0 = L.rimY + 2;
            for (let i = n; i < cap; i++) { const p = tokenPos(L, i, shown); d.circle(p.size * 0.42, { x: p.x, y: y0, color: "#ffffff", opacity: 0.14 }); }
            if (V.drag?.over && !lesson) { const q = tokenPos(L, clamp(V.drag.ins, 0, shown - 1), shown); d.additive(() => d.sprite("ringfx", { x: q.x - q.sp / 2, y: y0, width: 16, height: 54 * L.S, color: "#ffe066", opacity: 0.9 })); }
            // A live reaction is a glowing bridge between two tokens. Its words are in the caption.
            if (!V.busy) for (const r of V.primed) { if (r.ring) continue; const a = tokenPos(L, r.i - 1, shown), e = tokenPos(L, r.i, shown); d.additive(() => d.line([a.x, y0], [e.x, y0], { width: 7 + Math.sin(s.time * 6) * 2, color: r.color, opacity: 0.9 })); }
            list.forEach((t, i) => {
                const p = tokenPos(L, i, shown);
                let v = V.tokVis.get(t.u);
                if (!v) { v = { appear: 1, x: p.x, y: y0, pop: 0 }; V.tokVis.set(t.u, v); }
                v.x += (p.x - v.x) * 0.3; v.y = y0;
                if (v.appear <= 0) return;
                const bob = Math.sin(s.time * 2.2 + i * 1.7) * 2 * L.S, q = Math.min(1, v.appear), k = (q < 1 ? q * (1.2 - 0.2 * q) : 1) * (1 + v.pop * 0.4), sz = p.size * k;
                d.sprite("glow", { x: v.x, y: v.y + 7, width: sz * 1.2, height: sz * 0.5, color: "#07040f", opacity: 0.45 });
                d.sprite(tokenArt(t.id), { x: v.x, y: v.y + bob - v.pop * 10, width: sz, height: sz });
                if (v.pop > 0) d.additive(() => d.sprite("glow", { x: v.x, y: v.y, width: sz * 2, height: sz * 2, color: hex(t.el), opacity: v.pop }));
            });
        }
        // ---- Draw: caption, scoreboard, hand ----
        const plate = (d, x, y, w, h, col, strong) => {
            d.rect(w, h, { x, y, color: "#120822", radius: 12 });
            d.rect(w, h, { x, y, color: col, radius: 12, outline: strong ? 2 : 1, opacity: strong ? 1 : 0.5 });
        };
        function drawCaption(d, L, cur) {
            const idle = !V.cap && cur && !V.busy ? idleCaption(cur) : null, cap = V.cap ?? idle;
            plate(d, L.capX, L.capY, L.capW, L.capH, cap?.color ?? "#6a5a80", cap?.strong);
            if (!cap) return;
            const hasEq = cap.a && cap.b, pad = hasEq ? 92 : 14, cx = L.capX + (hasEq ? (pad - 14) / 2 : 0), w = L.capW - pad - 14;
            if (hasEq) { const x = L.capX - L.capW / 2 + 26, y = L.capY, a = tokenArt(cap.a), b = tokenArt(cap.b); d.sprite(a, { x, y, width: 34, height: 34 }); d.sprite(b, { x: x + 40, y, width: 34, height: 34 }); }
            label(d, cap.text, cx, L.capY, w, L.capH - 6, { size: 15, bold: true, color: cap.color });
        }
        function drawScore(d, L) {
            const t = Math.max(0, V.tier), col = TIERS[t][2], top = L.rimY + 34 * L.S, bottom = Math.min(L.potBottom, L.rimY + 165 * L.S), h = bottom - top, cy = (top + bottom) / 2, w = Math.min(230 * L.S, 220), big = fit(fmt(V.totalShown), w, h * 0.6, 34, true);
            d.rect(w + 16, h, { x: L.potX, y: cy, color: "#120822", radius: 14, opacity: 0.82 });
            d.rect(w + 16, h, { x: L.potX, y: cy, color: col, radius: 14, outline: 1.5 });
            d.text(big.text, { x: L.potX, y: cy - h * 0.2, size: big.size, bold: true, font: FONT, color: "#fff6dc" });
            label(d, `Chain ${V.fires}  ×${V.potShown}`, L.potX, cy + h * 0.28, w, h * 0.34, { size: 15, bold: true, color: col });
        }
        // Below the buttons: caption, scoreboard, shelf, Heat. The hand then goes on top of all of it.
        s.add([ui(), layer(-5), { draw(d) {
            const L = layout(), W = L.W, H = L.H, cur = cc(), mt = Math.max(minText(), 12);
            drawCaption(d, L, cur);
            if (V.busy && V.fires > 0) drawScore(d, L);
            const shelfTop = L.handTop - 3, sh = H - shelfTop;
            d.rect(W + 8, sh + 4, { x: W / 2, y: shelfTop + sh / 2 + 2, color: "#120822", opacity: 0.96 });
            d.rect(W + 8, 1.5, { x: W / 2, y: shelfTop, color: "#e7b75e", opacity: 0.5 });
            const hk = 1 + V.heatPulse * 0.2;
            d.push(); d.translate(L.heatX, L.heatY); d.scale(hk);
            d.sprite("heatgem", { y: -10, width: 54, height: 54 });
            d.circle(15, { y: 7, color: "#120822" }); d.circle(15, { y: 7, color: "#ffb04a", outline: 1.5 });
            d.text(`${V.heat}`, { y: 7, size: 19, bold: true, font: FONT, color: "#fff" });
            d.pop();
            if (run.witch === "posy" && !lesson) { const need = S.has(run, "sparewick") ? 2 : 3; for (let i = 0; i < need; i++) d.circle(3.5, { x: L.heatX - (need - 1) * 5 + i * 10, y: L.heatY + 28, color: i < V.flare ? "#ff7a2f" : "#4a3458" }); }
            const py = V.pst; let px = L.sl + 16;
            if (V.hover < 0 && !V.drag) for (const k of Object.keys(PST)) { if (!(py[k] > 0)) continue; const y = L.capBottom + 15; d.circle(14, { x: px, y, color: "#3a1030" }); d.text(`${PST[k][0][0]}${py[k]}`, { x: px, y, size: mt, bold: true, font: FONT, color: "#ffb0c0" }); V.stBoxes.push({ x: px, y, title: PST[k][0], text: PST[k][1] }); px += 31; }
        } }]);
        s.onDrawUI((d) => {
            const L = layout(), cur = cc();
            const w = want(), n = V.hand.length, spaced = n <= 5, focusing = V.hover >= 0 || V.drag;
            const order = V.hand.map((k, i) => i).sort((a, b) => (a === V.hover ? 1 : b === V.hover ? -1 : a - b));
            for (const i of order) {
                const k = V.hand[i], v = V.cards.get(k.u);
                if (!v || v.delay > 0) continue;
                const hov = V.hover === i, drag = V.drag?.u === k.u, can = cur && !V.busy ? S.canPlace(run, k) : true, wanted = w && k.id === w, blocked = w && k.id !== w;
                const cost = cur ? S.costOf(cur, k, run) : cardCost(CARDS[k.id], k.up), base = cardCost(CARDS[k.id], k.up), full = hov && v.lift > 0.8 && !drag && Math.abs(v.s - L.lw / L.cw) < 0.04;
                const cover = (!spaced && !hov && !drag) || v.y > L.handY + L.ch * 0.25;
                drawCard(d, k, { x: v.x, y: v.y, w: L.cw * v.s, rot: v.rot, tx: v.tx, ty: v.ty, lift: drag ? 1 : v.lift, compact: !full, textless: cover, foil: hov || drag ? 0.5 : 0, cost, costColor: cost < base ? "#c8ffb0" : !can ? "#ff9a8a" : "#fff", dim: blocked ? 0.62 : can ? 0 : 0.42, glow: wanted ? 0.6 + Math.sin(s.time * 6) * 0.25 : hov ? 0.18 : 0 });
            }
            for (const f of V.flights) drawCard(d, f.card, { x: f.x, y: f.y, w: f.w2 ?? f.w, rot: f.rot, lift: 1, textless: true, foil: 0.4 });
            for (const q of V.dissolves) drawDissolve(d, game, q.card, q, q.t / q.life);
            // Lesson finger: shows the fling, then gets out of the way.
            if (w && !V.drag && V.hover < 0) {
                const i = V.hand.findIndex((k) => k.id === w), b = i >= 0 ? V.cards.get(V.hand[i].u) : null;
                if (b) { const q = ((V.t ?? 0) * 0.7) % 1, x = lerp(b.x, L.potX, q * q), y = lerp(b.y, L.rimY, q * q * (3 - 2 * q)); d.circle(13, { x, y, color: "#fff6dc", opacity: (1 - q) * 0.8 }); d.circle(18, { x, y, color: "#ffe066", outline: 2, opacity: (1 - q) * 0.8 }); }
            }
            if (lesson && !w && !V.busy && cur?.brew.length && brewBtn.pulse) { d.additive(() => d.sprite("glow", { x: L.brewX, y: L.brewY, width: L.brewW * 1.3, height: L.brewH * 2.4, color: "#ffe066", opacity: 0.4 + Math.sin(s.time * 6) * 0.2 })); }
        });
        installOverlays(s);
        game.data.combat = { place: (i, p) => placeCard(i, p), brew: () => doBrew(), V, layout };
    });
}
