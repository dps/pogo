// Cosmic Yard Sale. Start with a card table in your driveway. End by selling the concept of Tuesday.
import { createGame } from "./pogo.js";
import * as E from "./econ.js";
import { ACTS, CONCEPTS, COUNTERS, GARY, KID, SINCERE } from "./data.js";
import { C, paintArt } from "./art.js";
import { paintFont, T } from "./font.js";
import { ENDING, FRENZY_SONG, makeAudio, SONGS } from "./audio.js";
import { drawWorld, skyAt } from "./world.js";
import { drawStage, metrics } from "./stage.js";
import { btn, drawHUD, drawModal, drawPanel } from "./panel.js";

const game = createGame({
    view: { width: 390, height: 720, landscape: { width: 800, height: 430 } }, background: ["#6fd0ea", "#ffe9b0"], maxDpr: 2, seed: 7,
    actions: { sell: ["Space"], buy1: ["Digit1"], buy2: ["Digit2"], buy3: ["Digit3"], buy4: ["Digit4"], buy5: ["Digit5"], deal: ["KeyD"], counter: ["KeyC"], frenzy: ["KeyF"], nextTab: ["KeyT"], mode: ["KeyB"], settings: ["KeyS", "Escape"] },
});
paintFont(game.assets);
paintArt(game.assets);
game.touch.enabled = false;
const SAVE = "cosmic-yard-sale", OPTS = "cosmic-yard-sale-opts";
const fx = () => game.fxRng.next();

function blank() { return { title: 1, sx: 1, sy: 1, rot: 0, rotV: 0, hop: 0, sqV: 0, dropY: 0, flyT: 0, flyKey: "", itemIn: 1, cashPulse: 0, cashShown: 0, vendor: 0, vendorHop: 0, tableRot: 0, tableRotV: 0, tableSq: 0, cust: null, bubble: null, banners: [], stray: null, crewHop: [0, 0, 0, 0, 0], cardFx: {}, nextNote: 0, space: 0, ground: 1, holeKick: 0, garyArm: 0, L: ACTS[0].stops[0].L, flash: 0 }; }

game.scene("sale", (s) => {
    const G = { game, S: null, A: blank(), hits: [], time: 0, tab: "crew", buyMode: 0, scroll: 0, maxScroll: 0, modal: null, modalAge: 0, armed: null, snd: makeAudio(game), opts: game.load(OPTS, {}) };
    game.data.G = G;
    const load = () => { const v = game.load(SAVE, null); return v && v.v === 1 ? v : E.newState({ seed: 1 + Math.floor(fx() * 1e6) }); };
    let S = (G.S = load());
    S.events ??= []; S.events.length = 0;
    const A = G.A; const coins = [], pops = [], rings = [];
    if (S.time > 0 || S.stats.taps > 0) A.title = 0;
    A.L = targetL(); A.cashShown = S.cash;
    A.space = S.act >= 3 ? 1 : 0;
    const applyOpts = () => { game.audio.muted = !!G.opts.mute; game.haptics.enabled = !G.opts.noHaptic; E.FORMAT.science = !!G.opts.science; };
    applyOpts();
    G.setOpt = (k, v) => { G.opts[k] = v; game.save(OPTS, G.opts); applyOpts(); G.snd.ui(); };

    function targetL() {
        const a = ACTS[S.act], k = S.stop, here = a.stops[k].L, next = k < 4 ? a.stops[k + 1].L : (ACTS[S.act + 1]?.stops[0].L ?? here + 0.5);
        const lo = E.stopAt(S, k), hi = k < 4 ? E.stopAt(S, k + 1) : a.goal, f = Math.max(0, Math.min(1, Math.log(Math.max(S.earnedAct, lo) / lo) / Math.log(hi / lo)));
        return here + 0.34 * (next - here) * f;
    }
    function layout() {
        const v = game.view, portrait = v.height >= v.width;
        if (portrait) { const h = Math.round(v.height * (A.title > 0 ? 0.6 + 0 : 0.6)); G.pane = { x: 0, y: 0, w: v.width, h }; G.panel = { x: 0, y: h, w: v.width, h: v.height - h }; }
        else { const w = Math.round(v.width * 0.56); G.pane = { x: 0, y: 0, w, h: v.height }; G.panel = { x: w, y: 0, w: v.width - w, h: v.height }; }
        const M0 = G.pane.h * 0.62; G.pane.groundY = M0 + Math.min(214, G.pane.w * 0.56, G.pane.h * 0.5) * 0.385;
    }
    layout();
    s.on("resize", layout);

    // --- Save and return ---------------------------------------------------------------------
    const persist = () => { S.savedAt = Date.now(); const ev = S.events; S.events = []; game.save(SAVE, S); S.events = ev; };
    let lastSeen = Date.now();
    function welcome() {
        const now = Date.now(), from = S.savedAt ?? now, gap = (now - from) / 1000;
        if (gap > 30 && E.rate(S) > 0 && !S.ended) { G.awayInfo = E.away(S, gap); if (G.awayInfo.pay > 0) { open("away"); return; } }
    }
    const offHide = game.on("hide", () => persist()), offShow = game.on("show", () => { welcome(); persist(); });
    s.on("leave", () => { offHide(); offShow(); });
    welcome();

    function open(m) { G.modal = m; G.modalAge = 0; G.armed = null; G.wipeArmed = false; G.snd.ui(); }
    G.open = open;
    G.close = () => { const m = G.modal; G.modal = null; G.snd.ui(); if (m === "concept" && G.conceptShown?.id === "money") startFinale(); };

    // --- Juice helpers ---------------------------------------------------------------------------
    const pop = (x, y, text, size, color = C.gold, life = 0.9, rot = 0) => { if (pops.length > 40) pops.shift(); pops.push({ x, y, text, size, color, t: 0, life, rot, vx: (fx() - 0.5) * 26 }); };
    const coin = (x, y, n, spread = 1) => {
        const up = E.sold(S, "gravity"), cap = 60;
        for (let i = 0; i < n && coins.length < cap; i++) { const a = fx() * Math.PI * 2, v = 120 + fx() * 180; coins.push({ x, y, vx: Math.cos(a) * v * spread, vy: -220 - fx() * 220 + (up ? -120 : 0), rot: fx() * 6, vr: (fx() - 0.5) * 16, t: 0, life: 0.9 + fx() * 0.4, f: fx() < 0.35 ? 4 : 3, delay: 0, up }); }
    };
    const banner = (big, small, o = {}) => { A.banners.push({ big, small, age: 0, life: o.life ?? 2.4, y: o.y ?? 0.3, color: o.color, size: o.size, rot: o.rot }); if (A.banners.length > 2) A.banners.shift(); };
    const say = (text, name, o = {}) => { A.bubble = { text, name, t: 0, age: 0, life: o.life ?? 3.2, x: o.x, color: o.color, keep: o.keep }; };

    // --- Actions -----------------------------------------------------------------------------------
    function sell(px, py) {
        if (S.ended) return;
        const M = metrics(G), r = E.tap(S), pitch = r.streak;
        if (A.title > 0) { A.titleOut = true; startMusic(); }
        A.sx = 1.22; A.sy = 0.78; A.hop = Math.max(A.hop, 10 + Math.min(r.streak, 40) * 0.2); A.rotV += (fx() - 0.5) * 7; A.tableSq = 1; A.tableRotV += (px < M.cx ? -1 : 1) * 0.4; A.vendor = 0.15; A.cashPulse = 1; A.vendorHop = 6;
        rings.push({ x: px, y: py, t: 0, life: 0.28, size: 60 + Math.min(r.streak, 60) });
        const size = 13 + Math.min(6, r.streak / 10) + (r.perfect ? 3 : 0);
        let tapPops = 0; for (let i = pops.length - 1; i >= 0; i--) if (pops[i].tap && ++tapPops >= 6) { pops.splice(i, 1); break; }
        pop(px + (fx() - 0.5) * 70, py - 12 - fx() * 44, money(r.value), size, r.perfect ? "#9be3d3" : S.frenzy > 0 ? "#fff09a" : C.gold); pops[pops.length - 1].tap = true;
        coin(M.cx, M.yTop - M.itemS * 0.5, 1 + Math.min(3, r.streak >> 4));
        G.snd.tap(pitch, S.frenzy > 0);
        game.haptic(r.streak % 5 === 0 ? "light" : "tick");
        if (r.perfect) { G.snd.perfect(S.perfect); for (let i = pops.length - 1; i >= 0; i--) if (pops[i].slot) pops.splice(i, 1); pop(M.cx, M.yTop - M.tw * 0.92, S.perfect > 5 ? `SYZYGY ×${S.perfect}` : "PERFECT", 15, "#9be3d3", 0.7); pops[pops.length - 1].slot = true; }
        for (const [n, tier] of [[10, 0], [25, 1], [50, 2], [100, 3], [200, 4]]) if (r.streak === n) {
            G.snd.tier(tier); s.shake(2 + tier * 1.4, 0.16, { haptic: false }); s.freeze(0.03 + tier * 0.012);
            pop(M.cx, M.yTop - M.tw * 0.68, ["NICE!", "ON A ROLL!", "UNSTOPPABLE!", "HAGGLER OF LEGEND", "PLEASE STOP, IT'S FREE"][tier], 15 + tier * 2, C.paper, 1.1, -0.06);
            coin(M.cx, M.yTop - M.itemS * 0.5, 8 + tier * 5);
        }
        if (r.finished) {
            A.flyKey = E.act(S).stops[S.stop].item; A.flyT = 0.35; A.dropY = 150; A.itemIn = 1;
            G.snd.sold(r.streak); coin(M.cx, M.yTop - M.itemS * 0.5, 12, 1.4);
            s.shake(2.2, 0.12, { haptic: false });
            A.sold = { t: 0 };
            A.crewHop = A.crewHop.map(() => fx() * 0.8 + 0.3);
        }
    }
    function startMusic() { game.music(SONGS[Math.min(S.act, 5)]); }
    G.buy = (i) => {
        const n = (G.buyMode === 0 ? 1 : G.buyMode === 1 ? 10 : G.buyMode === 2 ? (E.nextMilestone(S.crew[i]) ?? S.crew[i] + 25) - S.crew[i] : Math.max(1, E.maxBuy(S, i)));
        if (!E.buyCrew(S, i, n)) { G.snd.no(); return; }
        G.snd.buy(); A.cardFx[`crew${i}`] = 1; A.crewHop[i] = 1;
    };
    G.buyUp = (u) => { if (E.buyUp(S, u)) { G.snd.up(); say(u.note, u.name, { life: 2 }); } else G.snd.no(); };
    G.goFrenzy = () => { if (E.frenzy(S)) { /* event */ } };
    G.deal = () => {
        const c = S.cust; if (!c) return;
        const r = E.haggleDeal(S), M = metrics(G);
        G.snd.deal(); say(r.line, c.name, { life: 2.4, x: A.cust.x - 20 }); persist();
        pop(M.cx, M.yTop - M.tw * 0.8, `+${money(r.pay)}`, 24, C.gold, 1.2); coin(M.cx, M.yTop - M.itemS * 0.5, 14, 1.3); s.shake(2, 0.14, { haptic: false });
        A.cust.leaving = true; A.cust.talk = 0.4;
    };
    G.counter = () => {
        const c = S.cust; if (!c || c.kid) return;
        const r = E.haggleCounter(S);
        if (r.ok) { G.snd.counter(); const line = E.sold(S, "irony") ? pickFx(SINCERE) : pickFx(COUNTERS); say(line, c.name, { life: 30, x: A.cust.x - 20 }); c.line = line; A.cust.talk = 0.3; A.tableRotV += 0.8; game.haptic("medium"); }
        else { G.snd.walk(); say(r.line, c.name, { life: 2.4, x: A.cust.x - 20 }); A.cust.leaving = true; s.shake(1.6, 0.12, { haptic: false }); }
    };
    const pickFx = (l) => l[Math.floor(fx() * l.length)];
    G.claimStray = () => { const st = A.stray; if (!st) return; const v = E.claimStray(S); A.stray = null; G.snd.sticker(); pop(st.x, st.y, `+${money(v)}`, 22, C.gold, 1.1); coin(st.x, st.y, 12, 1.2); };
    G.goWar = () => { E.startWar(S); };
    G.feed = (i) => { if (E.feed(S, i)) { /* event */ } };
    G.list = () => { E.listConcept(S); };
    G.moveWith = (id) => { G.modal = null; E.move(S, id); };
    G.wipe = () => {
        if (!G.wipeArmed) { G.wipeArmed = true; G.snd.no(); return; }
        const fresh = E.newState({ seed: 1 + Math.floor(fx() * 1e6) }); game.save(SAVE, fresh); game.haptic("warn"); game.stopMusic(); game.go("sale", {}, { fade: 0.3 });
    };
    G.reopen = () => {
        const fresh = E.newState({ seed: 1 + Math.floor(fx() * 1e6), sale: S.sale + 1 }); fresh.time = 1; game.save(SAVE, fresh); game.stopMusic(); game.go("sale", {}, { fade: 0.4 });
    };

    // --- The finale ------------------------------------------------------------------------------
    function startFinale() { A.fin = { stage: "wait", t: 0 }; game.stopMusic(); }
    function finaleStep(dt) {
        const F = A.fin; if (!F) return; F.t += dt;
        if (F.stage === "wait" && F.t > 1.6) { F.stage = "kid"; F.t = 0; S.cust = { kid: true, name: "A Small Kid", look: 17, offer: 0.5, round: 0, final: true }; A.cust = { look: 17, x: G.pane.x + G.pane.w + 60, tx: 0, step: 0, talk: 0, arrived: false, leaving: false, line: KID.last, name: "A Small Kid" }; G.snd.door(); }
    }
    G.finalDeal = () => {
        const F = A.fin; if (F.stage !== "kid") return; F.stage = "reveal"; F.t = 0; S.cust = null; A.bubble = null; G.snd.deal(); game.haptic("success");
        s.flash("#ffffff", 0.6); G.globeGone = true; A.L = A.finL = ACTS[0].stops[0].L; A.space = 0; S.act = 0; S.stop = 0; S.cash = 0; S.crew = [0, 0, 0, 0, 0]; A.cashShown = 0; game.music(ENDING);
        A.cust = { look: 17, x: metrics(G).cx + metrics(G).tw * 0.62, step: 0, talk: 0, arrived: true, leaving: false };
    };

    // --- Events from the economy -----------------------------------------------------------------
    function events() {
        const M = metrics(G);
        for (const ev of S.events) {
            if (ev.t === "stop") {
                const st = E.act(S).stops[ev.stop]; A.nextNote = 3; banner(st.scale, "NOW SELLING AT", { life: 2.8 }); G.snd.whoosh(); s.shake(3, 0.3, { haptic: false }); A.flyKey = E.act(S).stops[ev.stop - 1].item; A.flyT = 0.35; A.dropY = 220; persist();
                say(`${st.title}. ${st.note}`, null, { life: 3 });
            }
            if (ev.t === "ready") { G.snd.fanfare(); banner("VENUE AVAILABLE", null, { y: 0.34 }); persist(); }
            if (ev.t === "customer") { const c = S.cust; A.cust = { look: c.look, x: G.pane.x + G.pane.w + 60, step: 0, talk: 0, arrived: false, leaving: false }; G.snd.door(); }
            if (ev.t === "stray") A.stray = { x: G.pane.x + G.pane.w * (0.25 + fx() * 0.5), y: G.pane.h * (0.32 + fx() * 0.1), vx: 0 };
            if (ev.t === "frenzy") { G.snd.siren(); game.music(FRENZY_SONG); banner("EVERYTHING MUST GO!", null, { size: 20, color: C.coral, y: 0.36 }); s.flash("#ffd76e", 0.25); s.shake(5, 0.4, { haptic: false }); coin(M.cx, M.yTop - 40, 30, 1.8); }
            if (ev.t === "frenzyEnd") { startMusic(); G.snd.day(); }
            if (ev.t === "buy") {}
            if (ev.t === "milestone") { G.snd.milestone(); A.cardFx[`crew${ev.i}`] = 1.5; const c = E.act(S).crew[ev.i]; banner(`${c.name}: ${ev.n}!`, `CREW ×${E.act(S).m}`, { y: 0.47, size: 15, life: 1.8 }); }
            if (ev.t === "up") {}
            if (ev.t === "war") { G.snd.war(); say(pickFx(GARY.taunts), "DISCOUNT GARY", { life: 7, x: G.pane.x + 80 }); A.garyArm = 1; s.shake(3, 0.2, { haptic: false }); }
            if (ev.t === "warwin") { G.snd.deal(); banner("BID WON", `GARY LOSES A TENT. INCOME ×1.9`, { y: 0.4, color: C.mint }); s.freeze(0.08); s.shake(4, 0.25, { haptic: false }); coin(M.cx, M.yTop - 40, 24, 1.6); say(ev.wins >= 5 ? GARY.done : GARY.win[Math.min(ev.wins - 1, 3)], "DISCOUNT GARY", { life: 4, x: G.pane.x + 80 }); if (ev.wins >= 5) G.snd.fanfare(); }
            if (ev.t === "warlose") { G.snd.walk(); say(pickFx(GARY.lose), "DISCOUNT GARY", { life: 3, x: G.pane.x + 80 }); }
            if (ev.t === "feed") { G.snd.hole(); A.holeKick = 1; s.shake(5, 0.35, { haptic: false }); s.freeze(0.07); pop(M.cx, M.yTop - M.tw * 0.7, `ALL CREW ×${(E.holeMult(S)).toFixed(0)}`, 20, C.pink, 1.2); }
            if (ev.t === "concept") { G.conceptShown = ev.c; G.snd.stamp(); s.flash("#ffffff", 0.35); s.shake(6, 0.4, { haptic: false }); game.haptic("heavy"); persist(); open("concept"); }
            if (ev.t === "moved") {
                A.space = S.act >= 3 ? A.space : 0; A.flyT = 0; A.dropY = 260; G.tab = "crew"; G.scroll = 0; A.cust = null; A.bubble = null; A.cashShown = 0; A.stray = null; G.snd.whoosh(); G.snd.fanfare(); s.flash("#ffffff", 0.4); s.shake(7, 0.5, { haptic: false }); startMusic(); persist();
                if (ev.act === 2) S.gary.met = true;
                open("rule");
            }
            if (ev.t === "day") G.snd.day();
        }
        S.events.length = 0;
    }

    // --- Input ---------------------------------------------------------------------------------------
    let scrollV = 0, dragY = 0, dragging = false;
    const inside = (h, x, y) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
    const topHit = (x, y) => { let best = null; for (const h of G.hits) if (inside(h, x, y) && (!best || h.layer >= best.layer)) best = h; return best; };
    function input(dt) {
        const inp = s.input, p = inp.pointer, kb = (a) => inp.pressed(a);
        const presses = [];
        if (p.pressed) presses.push({ x: p.x, y: p.y, main: true });
        for (const t of inp.touches) if (t.pressed && !(p.pressed && t.x === p.x && t.y === p.y)) presses.push({ x: t.x, y: t.y });
        for (const q of presses) {
            const h = topHit(q.x, q.y);
            if (G.modal) { if (h && q.main) { G.armed = h.id; G.armedHit = h; } continue; }
            if (h) { if (q.main) { G.armed = h.id; G.armedHit = h; dragY = 0; dragging = false; } continue; }
            if (A.fin) continue;
            if (inWorld(q.x, q.y)) sell(q.x, q.y);
            else if (q.main) { dragging = false; dragY = 0; }
        }
        if (p.down && G.listRect && inside(G.listRect, p.x, p.y) && !G.modal) { G.scroll -= p.dy; dragY += Math.abs(p.dy); scrollV = -p.dy / Math.max(dt, 1 / 120); if (dragY > 9) { dragging = true; if (G.armed && G.armedHit?.layer === 0) G.armed = null; } }
        else if (!p.down) { G.scroll += scrollV * dt; scrollV *= Math.exp(-dt * 6); }
        if (inp.wheel) { G.scroll += inp.wheel * 0.6; scrollV = 0; }
        if (p.released) {
            const h = G.armed ? G.armedHit : null; G.armed = null;
            if (h && inside(h, p.x, p.y)) h.fn();
        }
        if (G.modal) {
            const ok = kb("confirm") || kb("sell");
            if (G.modal === "away" && ok) G.close(); if (G.modal === "rule" && ok) G.close(); if (G.modal === "concept" && ok) G.close();
            if (G.modal === "settings" && (kb("settings") || kb("pause"))) G.close();
            if (G.modal === "receipt") G.receiptScroll = Math.max(0, (G.receiptScroll ?? 0) + inp.wheel * 0.6 - (p.down ? p.dy : 0));
            return;
        }
        if (A.fin) { if (kb("deal") || kb("confirm")) { if (A.fin.stage === "kid" && A.cust?.arrived) G.finalDeal(); } return; }
        if (kb("sell")) { const M = metrics(G); sell(M.cx + (fx() - 0.5) * 60, M.yTop - 40 + (fx() - 0.5) * 40); }
        for (let i = 0; i < 5; i++) if (kb(`buy${i + 1}`) && E.crewVisible(S, i)) G.buy(i);
        if (kb("deal") || kb("confirm")) { if (S.cust && A.cust?.arrived) G.deal(); else if (S.ready) open("move"); else if (S.act === 5 && E.nextConcept(S) && S.earnedAct >= E.nextConcept(S).at) G.list(); }
        if (kb("counter") && S.cust && A.cust?.arrived) G.counter();
        if (kb("frenzy")) G.goFrenzy();
        if (kb("nextTab")) { const t = ["crew", "upgrades", ...(S.act === 5 ? ["ideas"] : [])]; G.tab = t[(t.indexOf(G.tab) + 1) % t.length]; G.scroll = 0; G.snd.ui(); }
        if (kb("mode")) { G.buyMode = (G.buyMode + 1) % 4; G.snd.ui(); }
        if (kb("settings") || kb("pause")) open("settings");
    }
    const inWorld = (x, y) => x >= G.pane.x && x <= G.pane.x + G.pane.w && y >= G.pane.y && y <= G.pane.y + G.pane.h;

    // --- Per-step animation --------------------------------------------------------------------------
        let saveT = 8, tauntT = 18;
    s.onUpdate((dt) => {
        layout();
        G.time += dt; G.modalAge += dt;
        input(dt);
        E.FORMAT.noSeven = E.sold(S, "seven");
        if (!A.fin) { if (A.title <= 0 || A.titleOut) E.tick(S, dt); events(); if (S.cust && !A.cust) A.cust = { look: S.cust.look, x: G.pane.x + G.pane.w + 60, step: 0, talk: 0, arrived: false, leaving: false }; }
        if (A.titleOut && A.title > 0) A.title = Math.max(0, A.title - dt * 2.6);
        // Item spring.
        A.sxV = (A.sxV ?? 0) + (1 - A.sx) * 620 * dt; A.sxV *= Math.exp(-22 * dt); A.sx += A.sxV * dt;
        A.syV = (A.syV ?? 0) + (1 - A.sy) * 620 * dt; A.syV *= Math.exp(-22 * dt); A.sy += A.syV * dt;
        A.rotV += -A.rot * 280 * dt; A.rotV *= Math.exp(-13 * dt); A.rot += A.rotV * dt;
        A.hop *= Math.exp(-dt * 14);
        A.tableSq = Math.max(0, A.tableSq - dt * 9); A.tableRotV += -A.tableRot * 500 * dt; A.tableRotV *= Math.exp(-20 * dt); A.tableRot += A.tableRotV * dt;
        A.dropY = A.dropY > 0.5 ? A.dropY * Math.exp(-dt * 16) : 0; A.flyT = Math.max(0, A.flyT - dt);
        A.cashPulse = Math.max(0, A.cashPulse - dt * 7); A.vendor = Math.max(0, A.vendor - dt); A.vendorHop = Math.max(0, A.vendorHop - dt * 50); A.holeKick = Math.max(0, A.holeKick - dt * 1.6); A.garyArm = Math.max(0, A.garyArm - dt);
        A.nextNote = Math.max(0, A.nextNote - dt);
        for (let i = 0; i < 5; i++) A.crewHop[i] = Math.max(0, A.crewHop[i] - dt * 4);
        for (const k in A.cardFx) { A.cardFx[k] -= dt * 3; if (A.cardFx[k] <= 0) delete A.cardFx[k]; }
        A.cashShown += (S.cash - A.cashShown) * Math.min(1, dt * 14);
        if (A.cashShown > S.cash * 1.5 || !Number.isFinite(A.cashShown)) A.cashShown = S.cash;
        // Crew "sell" bounces while they work.
        if (!G.modal && !A.fin) for (let i = 0; i < 5; i++) if (S.crew[i] && fx() < dt * 0.8) { A.crewHop[i] = 1; const M = metrics(G), n = S.crew.filter((c) => c > 0).length, k = S.crew.slice(0, i).filter((c) => c > 0).length, size = Math.min(34, M.tw * 0.17); pop(M.cx + (k - (n - 1) / 2) * (size + 6), M.yFeet, `+${money(E.crewEach(S, i) * S.crew[i] * 1.25)}`, 10.5, "#9be3d3", 0.8); }
        // Zoom.
        const zoomTo = A.fin ? A.finL ?? 23.2 : targetL();
        A.L += (zoomTo - A.L) * (1 - Math.exp(-dt * 1.5));
        A.space += ((S.act >= 3 ? 1 : 0) - A.space) * Math.min(1, dt * 2);
        // Customer walks in and speaks.
        const c = A.cust, M = metrics(G);
        if (c) {
            const homeX = M.cx + M.tw * 0.62;
            c.talk = Math.max(0, c.talk - dt);
            if (c.leaving) { c.x += 150 * dt; c.step += dt * 9; if (c.x > G.pane.x + G.pane.w + 70) { A.cust = null; } }
            else if (c.x > homeX) { c.x = Math.max(homeX, c.x - 170 * dt); c.step += dt * 9; }
            else if (!c.arrived) {
                c.arrived = true; c.step = 0;
                if (A.fin) { say(KID.last, "A SMALL KID", { life: 900, x: c.x - 20 }); }
                else if (S.cust) { const line = S.cust.kid ? KID.hi : E.sold(S, "irony") ? pickFx(SINCERE) : S.cust.line; say(line, S.cust.name, { life: 900, x: c.x - 20 }); c.talk = 0.5; game.haptic("light"); }
            }
        }
        if (A.bubble) { const b = A.bubble; b.t += dt; b.age += dt; b.life -= dt; if (b.life <= 0) A.bubble = null; }
        if (S.cust && A.cust?.arrived && !A.bubble) { say(S.cust.line ?? S.cust.hi ?? "", S.cust.name, { life: 900, x: A.cust.x - 20 }); }
        for (const b of A.banners) { b.age += dt; b.life -= dt; } A.banners = A.banners.filter((b) => b.life > 0);
        if (A.stray) A.stray.y += Math.sin(G.time * 1.3) * 0.2; else if (S.stray) A.stray = { x: G.pane.x + G.pane.w * 0.7, y: G.pane.h * 0.36 };
        // Gary heckles.
        if (E.garyActive(S) && !G.modal && !S.cust && !S.gary.war) { tauntT -= dt; if (tauntT <= 0) { tauntT = 40 + fx() * 30; if (!S.gary.met2) { S.gary.met2 = true; say(GARY.intro, "DISCOUNT GARY", { life: 5, x: G.pane.x + 80 }); } else say(pickFx(GARY.taunts), "DISCOUNT GARY", { life: 3.4, x: G.pane.x + 80 }); A.garyArm = 1; } }
        finaleUpdate(dt);
        const idea = S.act === 5 && !S.ended ? E.nextConcept(S) : null;
        if (idea && S.earnedAct >= idea.at && A.ideaSeen !== idea.id) { A.ideaSeen = idea.id; banner(idea.name, "AN IDEA IS READY TO LIST", { y: 0.42, size: 16, life: 3.4 }); G.snd.fanfare(); }
        // Particles.
        const cashX = G.pane.x + G.pane.w / 2, cashY = game.view.safe.top + 26;
        for (const k of coins) {
            k.t += dt; const q = k.t / k.life;
            if (q < 0.5) { k.vy += (k.up ? -700 : 900) * dt; k.x += k.vx * dt; k.y += k.vy * dt; }
            else { const p2 = (q - 0.5) * 2; k.x += (cashX - k.x) * Math.min(1, dt * (6 + p2 * 18)); k.y += (cashY - k.y) * Math.min(1, dt * (6 + p2 * 18)); }
            k.rot += k.vr * dt;
        }
        for (let i = coins.length - 1; i >= 0; i--) if (coins[i].t >= coins[i].life) { coins.splice(i, 1); A.cashPulse = Math.max(A.cashPulse, 0.5); }
        for (const q of pops) { q.t += dt; q.y -= (64 - q.t * 40) * dt; q.x += q.vx * dt; }
        for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > pops[i].life) pops.splice(i, 1);
        for (let i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > rings[i].life) rings.splice(i, 1); }
        if (A.sold) { A.sold.t += dt; if (A.sold.t > 0.55) A.sold = null; }
        saveT -= dt; if (saveT <= 0) { saveT = 8; persist(); }
        s.background = skyAt(A.L);
    });
    function finaleUpdate(dt) {
        const F = A.fin; if (!F) return;
        finaleStep(dt);
        if (F.stage === "kid") A.finL = 22.4;
        if (F.stage === "reveal") {
            if (F.t < 0.2) F.age ??= 0;
            if (F.t > 3.8) { F.stage = "driveway"; F.t = 0; G.globeGone = false; G.snd.stamp(); s.shake(1.5, 0.1, { haptic: false }); }
        }
        if (F.stage === "driveway") {
            A.L = ACTS[0].stops[0].L;
            if (F.t > 1.6 && !F.paid) { F.paid = true; S.cash = 0.5; A.cashShown = 0.5; A.cashPulse = 1; G.snd.sold(0); game.haptic("light"); say("Thanks, mister.", "A SMALL KID", { life: 3, x: A.cust.x - 20 }); }
            if (F.paid) { const M = metrics(G), q = Math.min(1, (F.t - 1.6) / 0.7), e = q * q * (3 - 2 * q), gs = M.tw * 0.14; G.globeGone = true; A.held = { x: M.cx - M.tw * 0.39 + (A.cust ? A.cust.x - 14 - M.cx + M.tw * 0.39 : 0) * e, y: M.yTop - gs * 0.5 + (M.yFeet - M.tw * 0.26 - M.yTop) * e - Math.sin(e * Math.PI) * 40, s: gs }; }
            if (F.t > 3.6 && A.cust && !A.cust.leaving) A.cust.leaving = true;
            if (F.t > 7.5) { F.stage = "done"; A.held = null; G.receiptLines = receipt(); G.receiptScroll = 0; open("receipt"); }
        }
    }
    function receipt() {
        const out = [];
        ACTS.forEach((a, i) => a.stops.forEach((st, k) => { const n = S.stats.soldItems[`${i}:${k}`] ?? 0; if (n) out.push([`${n} × ${st.title}`, ""]); }));
        CONCEPTS.forEach((c) => out.push([`1 × ${c.name.replace("7", "_")}`, ""]));
        out.push(["", ""], [`TAPS`, `${S.stats.taps}`], ["HAGGLES WON", `${S.stats.haggles}`], ["WALKED OFF", `${S.stats.walked}`], ["FRENZIES", `${S.stats.frenzies}`], ["CREW HIRED", `${S.stats.crew}`], ["CREW FED TO HOLE", `${S.stats.fed}`], ["HOURS AT THE TABLE", (S.time / 3600).toFixed(1)], ["", ""], ["1 × THE UNIVERSE", "$0.50"]);
        return out;
    }

    // --- Draw -----------------------------------------------------------------------------------------
    s.onDraw((d) => {
        drawWorld(d, A.L, G.time, G.pane, game.view, { noLabel: !!A.fin });
        drawStage(d, G);
        if (A.held) d.sprite("globe", { x: A.held.x, y: A.held.y, width: A.held.s, height: A.held.s * 1.16 });
    });
    s.onDrawUI((d) => {
        G.hits.length = 0;
        const F = A.fin;
        drawPanel(d, G);
        if (F?.stage === "reveal") { drawReveal(d, F); return; }
        if (!F || F.stage === "kid") drawHUD(d, G);
        else if (F.stage === "driveway" || F.stage === "done") { T(d, E.money(S.cash), G.pane.x + G.pane.w / 2, game.view.safe.top + 34, 34 * (1 + A.cashPulse * 0.2), { color: C.gold, outline: C.ink }); }
        if (F?.stage === "kid" && A.cust?.arrived) drawFinalDeal(d);
        drawFx(d);
        if (A.sold) { const M = metrics(G), q = A.sold.t / 0.55, k = q < 0.2 ? 1.8 - q * 4 : 1; T(d, "SOLD!", M.cx, M.yTop - M.itemS * 0.5, 30 * k, { color: sticker2(), outline: C.paper, rot: -0.16, opacity: Math.min(1, (1 - q) * 3) }); }
        if (S.frenzy > 0) frenzyEdge(d);
        drawModal(d, G);
    });
    const sticker2 = () => (E.sold(S, "orange") ? "#7a7a86" : C.coral);
    function drawFinalDeal(d) { const P = G.pane; btn(d, G, "finaldeal", "DEAL", P.x + P.w / 2, P.h - 34, Math.min(P.w - 60, 240), 52, () => G.finalDeal(), { color: C.teal, sub: "50¢", size: 18, pulse: true, layer: 3 }); }
    function drawReveal(d, F) {
        // The universe rushes up to the glass, and the glass has been sitting on your table the whole time.
        const v = game.view, q = Math.min(1, F.t / 3.8), M = metrics(G), e = q * q * q * (q * (6 * q - 15) + 10), big = Math.max(v.width, v.height) * 2.1, gs = M.tw * 0.14;
        const size = big * (gs / big) ** e, x = v.width / 2 + (M.cx - M.tw * 0.39 - v.width / 2) * e, y = v.height * 0.42 + (M.yTop - gs * 0.5 - v.height * 0.42) * e;
        d.sprite("globe", { x, y, width: size, height: size * 1.16 });
        if (q > 0.5 && q < 1) T(d, "IT WAS A SNOW GLOBE", G.panel.x + G.panel.w / 2, G.panel.y + G.panel.h / 2 - 76, 20, { color: C.paper, outline: C.ink, opacity: Math.min(1, (q - 0.5) * 5), maxW: G.panel.w - 30 });
    }
    function frenzyEdge(d) { const v = game.view, a = 0.55 + Math.sin(G.time * 10) * 0.25, c = S.stats.frenzies % 2 ? C.gold : C.coral; d.rect(v.width, 5, { x: v.width / 2, y: 2.5, color: c, opacity: a }); d.rect(v.width, 5, { x: v.width / 2, y: v.height - 2.5, color: c, opacity: a }); d.rect(5, v.height, { x: 2.5, y: v.height / 2, color: c, opacity: a }); d.rect(5, v.height, { x: v.width - 2.5, y: v.height / 2, color: c, opacity: a }); }
    function drawFx(d) {
        const put = d.quads("fx");
        for (const k of coins) { const a = Math.min(1, (k.life - k.t) * 8); put(k.x, k.y, k.f === 4 ? 22 : 17, k.f === 4 ? 13 : 17, k.rot, k.f, 1, 1, 1, a); }
        for (const r of rings) { const q = r.t / r.life, sz = r.size * (0.5 + q * 0.9); put(r.x, r.y, sz, sz, q, 2, 1, 0.84, 0.43, (1 - q) * 0.75); }
        for (const q of pops) { const u = q.t / q.life, sc = u < 0.14 ? 0.5 + (u / 0.14) * 0.75 : u < 0.24 ? 1.25 - ((u - 0.14) / 0.1) * 0.25 : 1; T(d, q.text, q.x, q.y, q.size * sc, { color: q.color, outline: C.ink, opacity: Math.min(1, (1 - u) * 3.5), rot: q.rot, maxW: q.tap ? Math.min(170, G.pane.w * 0.5) : G.pane.w - 16 }); }
    }
    const money = E.money;
    // Expose a thin debug surface for bots.
    game.data.score = () => ({ act: S.act, stop: S.stop, cash: S.cash, taps: S.stats.taps, ended: S.ended });
    game.yard = G; G.persist = persist; G.sellAt = sell; G.startFinale = startFinale;
    // Music starts on the first gesture.
    s.onUpdate(() => { if (!G.musicOn && (s.input.pointer.pressed || s.input.pressed("sell"))) { G.musicOn = true; startMusic(); } });
    // Finale tap wiring: the kid's deal button is drawn in the same pass.
    if (S.ended && !A.fin) { startFinale(); }
    G.events = events;
    /** Test hook: jump straight to a spot in the game. Screenshots and bots use this. */
    G.jump = (act, stop = 0, o = {}) => {
        S.act = act; S.stop = stop; S.kidDone = true; A.title = 0; A.titleOut = true; S.earnedAct = E.stopAt(S, stop) * (o.f ?? 3); S.cash = o.cash ?? S.earnedAct * 0.3; A.cashShown = S.cash; S.crew = o.crew ?? [40, 30, 20, 12, 3]; S.hype = o.hype ?? 0.4; S.custT = o.custT ?? 999; S.strayT = 9999; A.space = act >= 3 ? 1 : 0; A.L = targetL(); S.events.length = 0; S.ready = false;
    };
});
game.start("sale");
globalThis.document?.getElementById("load")?.remove();
