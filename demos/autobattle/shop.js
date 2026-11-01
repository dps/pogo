// The shop phase. Every pet is a spring: it lags your finger, tilts as it swings, leans into the slot under it, and lands with a thud.
import { CELLS, PET, SHOP, TRAITS, TRAIT_IDS, abN, describe } from "./data.js";
import { traitCounts, traitVal } from "./sim.js";
import { BENCH, at, boardCount, newRun, buy, canBuy, capFor, cardCost, fight, hold, incomeFor, locate, move, pets, pickFoe, reroll, rollCost, sell, sellPrice, teamOf, WIN_GOAL, LIVES } from "./run.js";
import { paintBackdrop, UI, frameOf } from "./art.js";
import { play } from "./audio.js";
import { G, INK, MINT, PINK, YEL, back, clamp, icon, lerp, makeButtons, makeFx, number, panel, pet, pips, shadow, small, statBadges, traitChip, txt } from "./ui.js";
import { settingsOverlay } from "./menus.js";
import { goldOpen, saveMeta } from "./meta.js";

const layout = (W, H, safe) => {
    const top = safe.top + 4, bot = H - safe.bottom - 6;
    if (W > H) {
        const m = 11, half = Math.floor(W * 0.5), L = { land: true, top, hudH: 34 }, y0 = top + 38, avail = bot - y0;
        const cw = Math.min(82, (half - 2 * m - 12) / 4), benchH = Math.min(60, avail * 0.26), ch = Math.min(90, (avail - benchH - 34) / 2);
        L.pen = { x: m + 6 + cw * 2, y: y0 + 12 + ch, w: cw * 4 + 12, h: ch * 2 + 22, cw, ch };
        L.bench = { x: L.pen.x, y: y0 + ch * 2 + 34 + benchH / 2, w: cw * 4 + 12, h: benchH, cw: (cw * 4) / BENCH };
        const rx = half + m, rw = W - rx - m;
        L.traits = { x: rx + rw / 2, y: y0 + 16, w: rw, size: 26 };
        const cards = Math.min(rw / 5 - 4, 86), ch2 = Math.min(176, avail - 104);
        L.shelf = { x: rx + rw / 2, y: y0 + 38 + ch2 / 2 + 6, w: rw, h: ch2, cw: cards };
        L.buttons = { y: bot - 26, roll: rx + 60, fight: rx + rw - (rw - 136) / 2 - 2, rollW: 112, fightW: rw - 136, h: 50 };
        return L;
    }
    const m = 8, inner = W - m * 2, L = { land: false, top, hudH: 38 }, y0 = top + 40, btnH = 54, shelfH = Math.min(150, Math.max(104, (H - y0) * 0.22)), benchH = Math.min(70, Math.max(54, H * 0.09)), traitH = 36;
    const cw = (inner - 10) / 4, room = bot - y0 - traitH - btnH - shelfH - benchH - 40, ch = Math.min(cw * 1.14, room / 2);
    L.traits = { x: W / 2, y: y0 + traitH / 2, w: inner, size: 27 };
    const py = y0 + traitH + 12;
    L.pen = { x: W / 2, y: py + ch, w: cw * 4 + 10, h: ch * 2 + 14, cw, ch };
    const after = py + ch * 2 + 22;
    L.bench = { x: W / 2, y: after + benchH / 2, w: inner, h: benchH, cw: (inner - 10) / BENCH };
    L.shelf = { x: W / 2, y: bot - btnH - shelfH / 2 - 8, w: inner, h: shelfH, cw: Math.min(86, inner / 5 - 3) };
    const gap0 = after + benchH + 6, gap1 = L.shelf.y - shelfH / 2 - 6; if (gap1 - gap0 > 34) L.next = { x: W / 2, y: (gap0 + gap1) / 2, w: inner - 16, h: Math.min(34, gap1 - gap0 - 8) };
    L.buttons = { y: bot - btnH / 2 + 1, roll: m + 62, fight: W - m - (inner - 132) / 2, rollW: 118, fightW: inner - 132, h: btnH };
    return L;
};

export function shopScene(game) {
    game.scene("shop", (s) => {
        // pogo check enters scenes directly, so the shop can open itself a run.
        if (!G.run) G.run = newRun({ seed: 5, shop: G.meta.shop });
        const run = G.run, m = G.meta, shop = SHOP[run.shop], B = makeButtons(s), fx = makeFx(game), V = new Map();
        G.playSong?.("shop");
        game.touch.enabled = false;
        paintBackdrop(game, `bg-${run.shop}-p`, 360, 640, shop.wall, shop.floor, shop.color); paintBackdrop(game, `bg-${run.shop}-l`, 640, 360, shop.wall, shop.floor, shop.color);
        let L = layout(s.view.width, s.view.height, s.view.safe), drag = null, hover = null, detail = null, toast = null, settings = false, kick = 0, pen = 0, ghosts = [], booms = [], lastRoll = 0, cards = [], sellHot = false, leaving = false, shown = run.shelf.map(() => 0), goldShown = run.gold, goldBump = 0, snackFlash = 0, tip = null, tipT = 0, step = 0, boomFlash = 0, sellPulse = 0;
        s.on("resize", () => { L = layout(s.view.width, s.view.height, s.view.safe); });
        const say = (t, col) => { toast = { t, col, life: 1.8 }; };
        const spots = () => { const out = []; for (let i = 0; i < CELLS; i++) out.push({ zone: "board", i, ...cellXY("board", i) }); for (let i = 0; i < BENCH; i++) out.push({ zone: "bench", i, ...cellXY("bench", i) }); return out; };
        const cellXY = (zone, i) => { if (zone === "board") { const { x, y, cw, ch } = L.pen, col = i % 4, row = i >> 2; return { x: x + (col - 1.5) * cw, y: y + (row - 0.5) * ch + 2 }; } const { x, y, cw } = L.bench; return { x: x + (i - 2) * cw, y: y + 2 }; };
        const cardXY = (i) => { const n = run.shelf.length, gap = L.shelf.w / n; return { x: L.shelf.x + (i - (n - 1) / 2) * gap, y: L.shelf.y }; };
        const petSize = () => Math.min(L.pen.cw, L.pen.ch) * 1.06, benchSize = () => Math.min(L.bench.cw * 1.02, L.bench.h * 1.05);
        const viewOf = (p) => { let v = V.get(p.uid); if (!v) { const sp = locate(run, p.uid), c = cellXY(sp.zone, sp.i); v = { x: c.x, y: c.y, vx: 0, vy: 0, sq: 0, sv: 0, rot: 0, rv: 0, lift: 0, spawn: 1, born: 1 }; V.set(p.uid, v); } return v; };
        for (const p of pets(run)) viewOf(p);
        if (run.lastSnacks?.length) { s.wait(0.5, () => { for (const uid of run.lastSnacks) { const p = pets(run).find((q) => q.uid === uid), v = p && V.get(uid); if (v) { fx.pop("YUM!", v.x, v.y - 30, { size: 13, color: "#ffe2b0" }); v.sv -= 3; } } if (run.lastSnacks.length) play(game, "buff"); }); }
        const rollIn = () => { lastRoll = s.time; shown = run.shelf.map(() => 0); };
        rollIn();
        const bumpGold = () => { goldBump = 1; };

        const doRoll = () => { const was = run.gold; if (!reroll(run)) { play(game, "nope"); say("Not enough gold"); return; } if (was !== run.gold) bumpGold(); rollIn(); play(game, "roll"); kick = 2; advance("roll"); };
        const openMerge = (merges) => {
            let delay = 0.02;
            merges.forEach((mg) => {
                const sp = locate(run, mg.pet.uid) ?? mg.spot, c = cellXY(sp.zone, sp.i), who = mg.from.map((u) => V.get(u)).filter(Boolean);
                for (const u of mg.from) V.delete(u);
                booms.push({ t: -delay, x: c.x, y: c.y, id: mg.id, star: mg.star, who, pet: mg.pet, done: false, list: who.map((v) => ({ x: v.x, y: v.y, id: mg.id, star: mg.star - 1 })) });
                delay += 0.62;
            });
            play(game, "merge0");
        };
        const tryBuy = (i, spot, view) => {
            const c = run.shelf[i]; if (!c) return false;
            if (run.gold < cardCost(run, c)) { play(game, "nope"); say("Not enough gold", "#ff5f6f"); return false; }
            const res = buy(run, i, spot);
            if (!res) { play(game, "nope"); say("No room: sell a pet or fill the pen", "#ff5f6f"); return false; }
            m.seen[c.id] = 1; bumpGold();
            const fromX = view?.x ?? cardXY(i).x, fromY = view?.y ?? cardXY(i).y;
            if (res.merges.length) {
                // The new copy flies in with the others: either it joined the pen first, or it arrived with the pen full.
                const first = booms.length, joined = res.merges[0].from.includes(res.pet.uid);
                if (joined) V.set(res.pet.uid, freshV(fromX, fromY));
                openMerge(res.merges);
                if (!joined) booms[first].list.push({ x: fromX, y: fromY, id: res.merges[0].id, star: 1 });
            } else { V.set(res.pet.uid, { ...freshV(fromX, fromY), sq: 0.28 }); play(game, "buy"); }
            fx.confetti(fromX, fromY, 8, 110);
            advance("buy");
            return true;
        };
        const freshV = (x, y) => ({ x, y, vx: 0, vy: 0, sq: 0, sv: 0, rot: 0, rv: 0, lift: 0, spawn: 1, born: 1 });
        const landOn = (v, big) => { v.sq = big ? 0.3 : 0.2; v.sv = 0; v.rv = 0; fx.dust(v.x, v.y + 22, big ? 8 : 5); kick = Math.max(kick, big ? 2.5 : 1.5); };
        const nearest = (x, y) => { let best = null, bd = 1e9; for (const p of spots()) { const dd = Math.hypot(p.x - x, p.y - y); if (dd < bd) { bd = dd; best = p; } } return bd < Math.max(L.pen.cw, 62) * 0.8 ? best : null; };
        const inShelf = (x, y) => Math.abs(y - L.shelf.y) < L.shelf.h / 2 + 14 && Math.abs(x - L.shelf.x) < L.shelf.w / 2 + 14;

        const press = (x, y) => {
            if (detail) return;
            for (let i = 0; i < run.shelf.length; i++) { const c = cardXY(i); if (run.shelf[i] && Math.abs(x - c.x) < L.shelf.cw / 2 + 2 && Math.abs(y - c.y) < L.shelf.h / 2) { drag = { kind: "card", i, sx: x, sy: y, moved: false, x, y, v: freshV(c.x, c.y - 10) }; drag.v.lift = 0; return; } }
            for (const p of pets(run)) { const sp = locate(run, p.uid), c = cellXY(sp.zone, sp.i), r = sp.zone === "board" ? petSize() * 0.5 : benchSize() * 0.5; if (Math.abs(x - c.x) < r && Math.abs(y - c.y) < r) { drag = { kind: "pet", uid: p.uid, from: sp, sx: x, sy: y, moved: false, x, y, v: viewOf(p), ox: c.x - x, oy: c.y - y }; return; } }
        };
        const release = (x, y) => {
            const dr = drag; drag = null; sellHot = false;
            if (!dr) return;
            const v = dr.v; v.lift = 0;
            if (!dr.moved) { detail = dr.kind === "card" ? { card: dr.i, t: 0 } : { uid: dr.uid, t: 0 }; play(game, "tap"); return; }
            const target = nearest(v.x, v.y) ?? nearest(x, y);
            if (dr.kind === "card") {
                if (inShelf(x, y) && !target) { play(game, "drop"); return; }
                if (!tryBuy(dr.i, target ? { zone: target.zone, i: target.i } : null, v)) return;
                const p = pets(run).at(-1); if (target && p) { /* the spring lands it */ }
                play(game, "snap");
                return;
            }
            const pp = at(run, dr.from);
            if (inShelf(x, y) && pp) {
                const g = sell(run, dr.from); V.delete(pp.uid); bumpGold(); play(game, "sell");
                fx.pop(`+${g}`, v.x, v.y - 20, { size: 22, color: YEL }); fx.stars(v.x, v.y, 7, 180, "coin"); kick = 2; advance("sell"); return;
            }
            if (target) {
                const was = at(run, target);
                if (move(run, dr.from, target)) { landOn(v); play(game, "snap"); advance("move"); if (was) { const w = V.get(was.uid); if (w) { w.sv -= 4; w.vy -= 200; } } m.tutorial || 0; return; }
                if (target.zone === "board" && !was) { play(game, "nope"); say(`Your pen holds ${capFor(run.round, run.shop)} pets this round`, "#ff5f6f"); v.sq = -0.2; return; }
            }
            play(game, "drop"); v.sq = 0.12;
        };
        const startFight = () => {
            if (leaving) return;
            // Anyone left on the bench with room in the pen hops in: no one misses the brawl by accident.
            for (let i = 0; i < BENCH; i++) if (run.bench[i] && boardCount(run) < capFor(run.round, run.shop)) { const c = [1, 2, 0, 3, 5, 6, 4, 7].find((k) => !run.board[k]); move(run, { zone: "bench", i }, { zone: "board", i: c }); }
            if (!boardCount(run)) { play(game, "nope"); say("Put a pet in your pen first!", "#ff5f6f"); pen = 1; return; }
            leaving = true; play(game, "fight");
            const { res, entry } = fight(run);
            for (const p of teamOf(run)) m.used[p.id] = (m.used[p.id] ?? 0) + 1;
            saveMeta(game, m);
            game.go("battle", { res, entry }, { fade: 0.14 });
        };
        game.shop = { run, tryBuy: (i, sp) => tryBuy(i, sp), roll: doRoll, startFight, layout: () => L, cellXY, cardXY, get booms() { return booms; }, V, get drag() { return drag; } };

        // First run: one line at a time, shown by a hand, never a wall of words.
        const tut = run.tutorial;
        const advance = (what) => {
            if (!tut) return;
            if (run.round === 1) { if (what === "buy" && step === 0) step = boardCount(run) >= 2 ? 2 : 1; else if (what === "buy" && step === 1) step = 2; }
            if (run.round === 2) { if (what === "buy" && run.merges > 0) step = 4; }
        };
        if (tut && run.round === 2) step = 3;
        if (run.round > 2 && !m.tutorial) { m.tutorial = true; saveMeta(game, m); }
        try { game.save("psb.run", run); } catch { /* blocked */ }
        // Round opener: what you earned, and whether the pen grew.
        s.wait(0.35, () => {
            const e = run.earned ?? {}, grew = capFor(run.round, run.shop) > capFor(run.round - 1, run.shop) && run.round > 1;
            fx.pop(`+${(e.income ?? 0) + (e.bonus ?? 0)} gold`, 44, L.top + L.hudH + 6, { size: 14, color: YEL, vy: 6, life: 1.2 }); play(game, "coin"); goldBump = 1;
            if (grew) { say(`The pen grew! ${capFor(run.round, run.shop)} pets now`, "#3fd6a8"); pen = 1; play(game, "unlock"); }
            else if (run.round === 1 && !tut) say(`Round 1 of your run. Win 10!`);
        });
        const tutHint = () => {
            if (!tut || run.round > 2) return null;
            if (run.round === 1) return step === 0 ? { text: "Drag a hamster into your pen", card: 0 } : step === 1 ? { text: "One more! Same pets stack up", card: run.shelf.findIndex((c) => c?.id === "taxham") } : { text: "Press FIGHT and watch them go", fight: true };
            if (run.merges === 0) return { text: "Collect three hamsters: they merge!", card: run.shelf.findIndex((c) => c?.id === "taxham") };
            return { text: "Stronger! Spend the rest, then FIGHT", fight: true };
        };

        s.onUpdate((dt) => {
            fx.update(dt); kick = Math.max(0, kick - dt * 18); pen = Math.max(0, pen - dt * 2.5); goldBump = Math.max(0, goldBump - dt * 4); goldShown += (run.gold - goldShown) * Math.min(1, dt * 12); boomFlash = Math.max(0, boomFlash - dt * 3); tipT += dt; sellPulse += dt;
            if (toast && (toast.life -= dt) <= 0) toast = null;
            for (let i = 0; i < shown.length; i++) shown[i] = Math.min(1, shown[i] + dt * 5);
            const P = s.input.pointer;
            const took = B.update();
            if (settings) { game.data.settings = true; return; }
            if (detail) { detail.t += dt; if (P.pressed && !B.hitAt(P.x, P.y)) detail = null; }
            else {
                if (P.pressed && !took) press(P.x, P.y);
                if (drag) {
                    drag.x = P.x; drag.y = P.y;
                    if (!drag.moved && Math.hypot(P.x - drag.sx, P.y - drag.sy) > 7) { drag.moved = true; drag.v.lift = 1; play(game, "pick"); }
                    if (drag.moved) { const t = nearest(P.x, P.y); const key = t ? `${t.zone}${t.i}` : null; if (key !== hover) { hover = key; if (key) play(game, "hover", 0.02); } sellHot = drag.kind === "pet" && inShelf(P.x, P.y); }
                    if (P.released) release(P.x, P.y);
                } else hover = null;
                if (s.input.pressed("roll")) doRoll();
                if (s.input.pressed("confirm")) startFight();
                for (let i = 0; i < 5; i++) if (s.input.pressed(`buy${i + 1}`) && run.shelf[i]) tryBuy(i, null);
            }
            // Springs. Dragged pets chase the finger on a stiff spring so they feel heavy but never laggy.
            for (const p of pets(run)) {
                const v = viewOf(p), sp = locate(run, p.uid), c = cellXY(sp.zone, sp.i); let tx = c.x, ty = c.y, k = 190, damp = 19;
                if (drag?.kind === "pet" && drag.uid === p.uid && drag.moved) { tx = drag.x; ty = drag.y - 16; k = 760; damp = 34; const t = nearest(drag.x, drag.y); if (t) { tx += (t.x - tx) * 0.2; ty += (t.y - ty) * 0.2; } }
                stepV(v, tx, ty, k, damp, dt);
            }
            if (drag?.kind === "card" && drag.moved) { const v = drag.v, t = nearest(drag.x, drag.y); let tx = drag.x, ty = drag.y - 16; if (t) { tx += (t.x - tx) * 0.2; ty += (t.y - ty) * 0.2; } stepV(v, tx, ty, 760, 34, dt); }
            for (let i = booms.length - 1; i >= 0; i--) {
                const b = booms[i]; b.t += dt;
                if (b.t > 0.44 && !b.done) {
                    b.done = true; const big = b.star === 3, v = freshV(b.x, b.y); v.spawn = 0; v.sq = -0.5; V.set(b.pet.uid, v);
                    play(game, big ? "merge3" : "merge"); s.freeze(big ? 0.12 : 0.07); kick = big ? 12 : 8; boomFlash = big ? 1 : 0.7; game.data.merges = run.merges;
                    fx.confetti(b.x, b.y, big ? 110 : 64, big ? 520 : 400); fx.stars(b.x, b.y, big ? 18 : 12, big ? 360 : 280); fx.stars(b.x, b.y, 7, 200, TRAITS[PET[b.id].traits[0]] ? PET[b.id].traits[0] : "star");
                    fx.ring(b.x, b.y, 10, big ? 190 : 130, 0.42, "#ffffff", 9); fx.ring(b.x, b.y, 6, big ? 130 : 90, 0.5, YEL, 6);
                    fx.pop(big ? "MEGA MERGE!" : "MERGE!", clamp(b.x, 90, s.view.width - 90), Math.max(L.top + 54, b.y - 54), { size: big ? 28 : 24, color: YEL, life: 1.2, vy: -26 });
                    for (const o of V.values()) if (o !== v) { o.sv -= 2.4; }
                }
                if (b.t > 1.1) booms.splice(i, 1);
            }
        });
        const stepV = (v, tx, ty, k, damp, dt) => {
            v.vx += ((tx - v.x) * k - v.vx * damp) * dt; v.vy += ((ty - v.y) * k - v.vy * damp) * dt; v.x += v.vx * dt; v.y += v.vy * dt;
            v.sv += (-v.sq * 300 - v.sv * 15) * dt; v.sq += v.sv * dt;
            const want = clamp(v.vx * 0.0011, -0.5, 0.5); v.rv += ((want - v.rot) * 240 - v.rv * 18) * dt; v.rot += v.rv * dt;
            v.spawn = Math.min(1, (v.spawn ?? 1) + dt * 3.2);
            if (v.lift !== undefined) { const stretch = clamp(Math.abs(v.vy) * 0.0005, 0, 0.14); v.st = stretch; }
        };
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height, l = L.land, bgw = l ? 640 : 360, bgh = l ? 360 : 640, k = Math.max(W / bgw, H / bgh);
            d.sprite(`bg-${run.shop}-${l ? "l" : "p"}`, { x: W / 2, y: H / 2, width: bgw * k, height: bgh * k });
        });
        const drawPet = (d, p, v, size, id = p.id, star = p.star) => {
            const lift = v.lift ? 1.2 : 1, sq = clamp(v.sq, -0.5, 0.5), st = v.st ?? 0, born = v.spawn < 1 ? back(v.spawn) : 1, sc = (star === 3 ? 1.1 : star === 2 ? 1.04 : 1) * lift * born;
            const w = size * sc * (1 + sq - st), h = size * sc * (1 - sq + st), bob = v.lift ? 0 : Math.sin(s.time * 2.4 + (p?.uid ?? 0)) * 0.8;
            shadow(d, v.x, v.y + size * (v.lift ? 0.56 : 0.4), size * (v.lift ? 0.5 : 0.62), v.lift ? 0.16 : 0.22);
            d.sprite("pets", { frame: frameOf(id, star), x: v.x, y: v.y + bob - (h - size * sc) / 2 - (v.lift ? 4 : 0), width: w, height: h, rot: v.rot });
        };
        s.onDrawUI((d) => {
            B.begin();
            const W = s.view.width, H = s.view.height;
            d.push(); if (kick > 0) d.translate(game.fxRng.range(-kick, kick), game.fxRng.range(-kick, kick));
            drawHud(d, W); drawPen(d); drawTraits(d); drawShelf(d); drawButtons(d);
            const sizeFor = (sp) => (sp.zone === "board" ? petSize() : benchSize());
            const list = pets(run).filter((p) => !(drag?.uid === p.uid && drag.moved));
            for (const p of list) { const v = viewOf(p), sp = locate(run, p.uid); drawPet(d, p, v, sizeFor(sp)); }
            for (const p of list) { const v = viewOf(p), sp = locate(run, p.uid), z = sizeFor(sp), st = statsOf(p); if (Math.abs(v.vx) + Math.abs(v.vy) < 800) { statBadges(d, st.atk, st.hp, v.x, v.y, z * 0.92); if (p.star > 1) pips(d, p.star, v.x, v.y - z * 0.46, 11); if (p.extra) icon(d, p.extra, v.x + z * 0.36, v.y - z * 0.3, 14); } }
            for (const b of booms) if (b.t >= 0 && !b.done) {
                const k = clamp(b.t / 0.44), e = k * k * k, wob = Math.sin(b.t * 60) * (1 - k) * 2;
                d.circle(lerp(0, 44, e), { x: b.x, y: b.y, color: "#ffffff", opacity: 0.45 * e });
                for (const g of b.list) drawPet(d, { uid: 0 }, { x: lerp(g.x, b.x, e) + wob, y: lerp(g.y, b.y, e) - Math.sin(k * 3.14) * 34, sq: 0, rot: k * 6, spawn: 1 }, petSize() * lerp(1, 0.7, e), g.id, g.star);
            }
            if (drag?.kind === "pet" && drag.moved) { const p = pets(run).find((q) => q.uid === drag.uid); if (p) drawPet(d, p, drag.v, petSize()); }
            if (drag?.kind === "card" && drag.moved) { const c = run.shelf[drag.i]; if (c) { if (shop.blind) icon(d, "crate", drag.v.x, drag.v.y, petSize()); else drawPet(d, { uid: 0 }, drag.v, petSize(), c.id, 1); } }
            fx.draw(d);
            drawTut(d);
            d.pop();
            if (boomFlash > 0) d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#ffffff", opacity: boomFlash * 0.26 });
            if (toast) { const a = clamp(toast.life * 3); panel(d, W / 2, H * 0.42, Math.min(W - 40, 280), 34, { color: toast.col ?? "#ffffff", radius: 11, opacity: a }); txt(d, toast.t, W / 2, H * 0.42, { size: 14, opacity: a }); }
            if (detail) drawDetail(d, W, H);
            if (settings) settingsOverlay(d, s, B, W, H, () => { settings = false; }, run);
        });
        const statsOf = (p) => { const b = PET[p.id]; return { atk: Math.round(b.atk * [0, 1, 1.9, 3.4][p.star] + 1e-6) + p.atkB, hp: Math.round(b.hp * [0, 1, 1.9, 3.4][p.star] + 1e-6) + p.hpB }; };
        const drawHud = (d, W) => {
            const y = L.top + L.hudH / 2, m = 8;
            panel(d, W / 2, y, W - m * 2 - 3, L.hudH - 8, { color: "#ffffff", radius: 12 });
            const big = 1 + goldBump * 0.3; d.push(); d.translate(m + 18, y); d.scale(big, big); icon(d, "coin", 0, 0, 24); d.pop();
            number(d, Math.round(goldShown), m + 44, y, 22);
            let x = m + 74; for (let i = 0; i < LIVES; i++) { icon(d, i < run.lives ? "heart" : "heartgone", x, y, 18); x += 16; }
            txt(d, `R${run.round}`, x + 11, y, { size: 14, color: YEL });
            const tw = L.land ? 13 : 11.4, start = W - m - 36 - (WIN_GOAL - 1) * tw;
            for (let i = 0; i < WIN_GOAL; i++) icon(d, i < run.wins ? "trophy" : "trophygone", start + i * tw, y, 15);
            B.button(d, "gear", W - m - 15, y, 28, 26, { icon: "gear", color: "#b48cff", fn: () => { settings = true; } });
        };
        const drawPen = (d) => {
            const P = L.pen, cap = capFor(run.round, run.shop), used = boardCount(run), glow = pen > 0 ? Math.sin(pen * 18) * 2 : 0;
            panel(d, P.x + glow, P.y, P.w, P.h, { color: "#ffe9c2", radius: 16, edge: goldOpen(m) ? "#ffd23f" : "#fff" });
            for (let i = 0; i < CELLS; i++) {
                const c = cellXY("board", i), open = !!run.board[i] || used < cap, hot = hover === `board${i}`, row = i >> 2;
                d.rect(P.cw - 6, P.ch - 6, { x: c.x, y: c.y - 2, radius: 12, color: hot ? "#fff27a" : row === 0 ? "#ffd59a" : "#ffc98a", opacity: open ? 1 : 0.4 });
                if (hot) d.rect(P.cw - 2, P.ch - 2, { x: c.x, y: c.y - 2, radius: 14, color: "#ff9f1c", outline: 2.5 });
                if (!open) icon(d, "lock", c.x, c.y - 2, 16, { opacity: 0.45 });
            }
            small(d, "FRONT", P.x - P.w / 2 + 26, P.y - P.h / 2 + 9, { size: 8.5, bold: true, color: "#a0642a" });
            small(d, "BACK", P.x - P.w / 2 + 24, P.y + P.h / 2 - 8, { size: 8.5, bold: true, color: "#a0642a" });
            txt(d, `${used}/${cap}`, P.x + P.w / 2 - 22, P.y - P.h / 2 + 8, { size: 12, color: used >= cap ? YEL : "#fff" });
            if (L.next) { const N = L.next; panel(d, N.x, N.y, N.w, N.h, { color: "#ffffff", radius: 10 }); d.rect(30, 16, { x: N.x - N.w / 2 + 22, y: N.y, radius: 6, color: "#ff5f6f" }); small(d, "BOT", N.x - N.w / 2 + 22, N.y, { size: 10.5, bold: true, color: "#fff" }); small(d, `Next: ${foe.name}`, N.x + 14, N.y, { size: 11.5, bold: true }); }
            const R = L.bench;
            panel(d, R.x, R.y, R.w, R.h, { color: "#d9d0ff", radius: 12 });
            for (let i = 0; i < BENCH; i++) { const c = cellXY("bench", i), hot = hover === `bench${i}`; d.rect(R.cw - 6, R.h - 10, { x: c.x, y: c.y - 2, radius: 10, color: hot ? "#fff27a" : "#c3b6f7", opacity: 0.9 }); }
        };
        const drawTraits = (d) => {
            const tc = traitCounts(teamOf(run)), T = L.traits, list = Object.keys(tc).sort((a, b) => tc[b].lvl - tc[a].lvl || tc[b].count - tc[a].count);
            const gap = Math.min(T.size + 7, (T.w - 8) / Math.max(1, list.length)); let x = T.x - ((list.length - 1) * gap) / 2;
            if (!list.length) { txt(d, foeLabel(), T.x, T.y, { size: 12, color: "#fff" }); return; }
            list.forEach((t) => {
                const c = tc[t], next = TRAITS[t].tiers.find((n) => n > c.count);
                traitChip(d, B, `t${t}`, t, x, T.y, T.size, c.count, c.lvl, () => { detail = { trait: t, t: 0 }; });
                x += gap;
            });
        };
        const foe = pickFoe(run);
        const foeLabel = () => `Round ${run.round}: next up is a BOT team`;
        const drawShelf = (d) => {
            const S = L.shelf, show = drag?.kind === "pet" && drag.moved;
            panel(d, S.x, S.y, S.w, S.h, { color: show ? (sellHot ? "#ff8f8f" : "#ffc2c2") : shop.color, radius: 14 });
            if (show) {
                const pp = pets(run).find((q) => q.uid === drag.uid), price = pp ? sellPrice(run, pp) : 0, z = sellHot ? 1.12 : 1;
                d.push(); d.translate(S.x, S.y); d.scale(z, z); icon(d, "bin", -60, 0, 46); txt(d, "SELL", 8, -8, { size: 20 }); icon(d, "coin", 2, 14, 16); txt(d, `+${price}`, 26, 14, { size: 15, color: YEL }); d.pop();
                return;
            }
            for (let i = 0; i < run.shelf.length; i++) {
                const c = run.shelf[i], p = cardXY(i), dragging = drag?.kind === "card" && drag.i === i && drag.moved, a = shown[i], yo = (1 - back(a)) * 26;
                if (!c || dragging) { d.rect(S.cw - 6, S.h - 18, { x: p.x, y: p.y, radius: 12, color: INK, opacity: 0.12 }); continue; }
                const def = PET[c.id], cost = cardCost(run, c), afford = run.gold >= cost, merging = !shop.blind && pets(run).filter((q) => q.id === c.id && q.star === 1).length >= (shop.need ?? 3) - 1, hasOne = !shop.blind && pets(run).some((q) => q.id === c.id);
                const cw = S.cw - 3, ch = S.h - 12, wob = merging ? Math.sin(s.time * 9 + i) * 0.03 : 0;
                d.push(); d.translate(p.x, p.y + yo); d.rotate(wob); d.scale(a * 0.1 + 0.9, a * 0.1 + 0.9);
                if (merging) d.rect(cw + 8, ch + 8, { radius: 16, color: YEL, opacity: 0.55 + Math.sin(s.time * 8) * 0.3 });
                const tierCol = ["", "#ffffff", "#d8f5ff", "#e6dcff", "#ffe2f0", "#fff0b5"][def.tier];
                d.rect(cw + 3, ch + 3, { radius: 13, color: INK });
                d.rect(cw + 1, ch + 1, { radius: 12, color: "#fff" });
                d.rect(cw - 4, ch - 4, { radius: 10, color: shop.blind ? "#ffe6c7" : tierCol });
                if (run.held[i]) { d.rect(cw - 4, ch - 4, { radius: 10, color: "#46d6ff", outline: 2.5 }); }
                const size = Math.min(cw * 1.08, ch * 0.66);
                if (shop.blind) { icon(d, "crate", 0, -ch * 0.14, size * 0.92); icon(d, def.traits[0], 0, -ch * 0.14 + size * 0.34, 20); }
                else { pet(d, c.id, 1, 0, -ch * 0.1, size, { opacity: afford ? 1 : 0.55 }); icon(d, def.traits[0], -cw * 0.3, -ch * 0.41, 17); icon(d, def.traits[1], cw * 0.3, -ch * 0.41, 17); if (c.extra) icon(d, c.extra, 0, -ch * 0.41, 17); }
                const by = ch * 0.34; if (!shop.blind) statBadges(d, def.atk, def.hp, 0, by - 2 - cw * 0.34, cw * 0.86);
                d.rect(cw * 0.66, 17, { y: ch * 0.5 - 7, radius: 8, color: afford ? "#ffd23f" : "#c9bedb" }); d.rect(cw * 0.66, 17, { y: ch * 0.5 - 7, radius: 8, color: INK, outline: 1.4 });
                icon(d, "coin", -9, ch * 0.5 - 7, 14); number(d, cost, 7, ch * 0.5 - 7, 15);
                if (merging) { txt(d, "MERGE!", 0, -ch * 0.47 + 4, { size: 11, color: YEL }); }
                else if (hasOne) { d.rect(32, 12, { y: -ch * 0.5 + 8, radius: 6, color: MINT }); small(d, "OWNED", 0, -ch * 0.5 + 8, { size: 7.5, bold: true }); }
                if (run.held[i]) icon(d, "hold", cw * 0.4, ch * 0.08, 19);
                d.pop();
            }
        };
        const drawButtons = (d) => {
            const b = L.buttons, c = rollCost(run), pulse = tutHint()?.fight ? Math.sin(s.time * 6) * 1.5 : 0;
            B.button(d, "roll", b.roll, b.y, b.rollW, b.h, { icon: "roll", label: c ? `ROLL ${c}` : "FREE", color: "#46b8ff", off: run.gold < c, fn: doRoll, fn0: () => say("Not enough gold", "#ff5f6f"), size: 15, sound: "pick", tw: 27 });
            B.button(d, "fight", b.fight, b.y, b.fightW, b.h, { label: "FIGHT!", color: boardCount(run) ? "#ff4f8b" : "#c9bedb", fn: startFight, size: 24, pulse, sound: "pick" });
            small(d, "vs BOT", b.fight, b.y + b.h * 0.33, { size: 9, color: "#fff", bold: true });
        };
        const drawTut = (d) => {
            const h = tutHint(); if (!h) return;
            const w = Math.min(s.view.width - 24, 300), y = L.pen.y; const a = 1;
            if (!boomsBusy()) {
                const tx = L.land ? L.pen.x : s.view.width / 2, ty = L.land ? L.pen.y : L.pen.y;
                panel(d, tx, ty - 2, Math.min(w, L.pen.w - 20), 34, { color: "#ffffff", radius: 12, opacity: 0.96 }); small(d, h.text, tx, ty - 2, { size: 13, bold: true });
            }
            if (h.card >= 0 && !drag) {
                const c = cardXY(h.card), t = clamp((tipT % 1.6) / 1.2), e = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2, g = cellXY("board", [1, 2, 0, 3][boardCount(run)] ?? 1), x = lerp(c.x, g.x, e), yy = lerp(c.y, g.y, e), al = tipT % 1.6 > 1.3 ? 0 : 1;
                icon(d, "hand", x + 12, yy + 16, 38, { opacity: al, rot: -0.3 });
            }
        };
        const boomsBusy = () => booms.length > 0;
        const drawDetail = (d, W, H) => {
            const k = back(clamp(detail.t / 0.16)), pw = Math.min(W - 26, 320), ph = detail.trait ? 150 : 216, cy = H * (L.land ? 0.5 : 0.46);
            d.rect(W + 8, H + 8, { x: W / 2, y: H / 2, color: "#3a1d5c", opacity: 0.4 });
            d.push(); d.translate(W / 2, cy); d.scale(k, k);
            if (detail.trait) {
                const t = detail.trait, def = TRAITS[t], tc = traitCounts(teamOf(run))[t], lvl = tc?.lvl ?? 0;
                panel(d, 0, 0, pw, ph, { color: "#fff6e6" });
                icon(d, t, -pw / 2 + 34, -ph / 2 + 32, 42); txt(d, `${def.name}: ${def.blurb}`, 22, -ph / 2 + 24, { size: 17, color: def.color });
                const c = tc?.count ?? 0; let x = 22 - 40; def.tiers.forEach((n, i) => { const on = c >= n; d.rect(36, 20, { x, y: -ph / 2 + 46, radius: 9, color: lvl === i + 1 ? def.color : on ? "#d8cfe8" : "#efe7f7" }); small(d, String(n), x, -ph / 2 + 46, { size: 12, bold: true, color: lvl === i + 1 ? "#fff" : INK }); x += 40; });
                small(d, def.info(def.vals[Math.max(0, lvl - 1)]), 0, 24, { size: 13, maxWidth: pw - 28 });
                small(d, lvl ? `Active now with ${c}` : `You have ${c}. Need ${def.tiers[0]}.`, 0, ph / 2 - 16, { size: 11, bold: true, color: def.color });
                d.pop(); return;
            }
            const inst = detail.uid != null ? pets(run).find((q) => q.uid === detail.uid) : null, card = detail.card != null ? run.shelf[detail.card] : null;
            if (!inst && !card) { d.pop(); detail = null; return; }
            const id = inst?.id ?? card.id, star = inst?.star ?? 1, def = PET[id], blind = shop.blind && card;
            panel(d, 0, 0, pw, ph, { color: "#fff6e6" });
            const ax = -pw / 2 + 58;
            if (blind) icon(d, "crate", ax, -ph / 2 + 58, 90); else pet(d, id, star, ax, -ph / 2 + 58, 108);
            const tx = 42, tw = pw - 124;
            txt(d, blind ? "Mystery Crate" : def.name, tx, -ph / 2 + 22, { size: def.name.length > 16 ? 13.5 : 16, maxWidth: tw + 12 });
            if (!blind) {
                if (star > 1) pips(d, star, tx, -ph / 2 + 41, 13);
                const stt = statsOf(inst ?? { id, star: 1, atkB: 0, hpB: 0 });
                icon(d, "atk", tx - 56, -ph / 2 + 60, 20); number(d, stt.atk, tx - 34, -ph / 2 + 60, 19); icon(d, "heart", tx + 2, -ph / 2 + 60, 20); number(d, stt.hp, tx + 22, -ph / 2 + 60, 19);
                small(d, `${def.ranged ? "Ranged" : "Melee"}, ${def.spd > 40 ? "fast" : def.spd < 30 ? "slow" : "steady"}`, tx + 8, -ph / 2 + 80, { size: 10.5, bold: true, color: "#7a5aa8" });
                const y = -ph / 2 + 104;
                [...def.traits, ...(inst?.extra || card?.extra ? [inst?.extra ?? card?.extra] : [])].forEach((t, i, arr) => { const x = (i - (arr.length - 1) / 2) * (pw / arr.length); icon(d, t, x - 34, y + 12, 20); small(d, TRAITS[t].name, x + 2, y + 12, { size: 11.5, bold: true, color: TRAITS[t].color }); B.next.push({ id: `dt${t}`, x, y: cy + y + 12, w: 88, h: 26, fn: () => { detail = { trait: t, t: 0 }; }, sound: "tap" }); });
                small(d, describe(def.ab, star), 0, y + 38, { size: 12.5, maxWidth: pw - 22, bold: true });
            } else small(d, `Could be anything with this trait. Open it to find out.`, 34, -30, { size: 12, maxWidth: tw });
            d.pop();
            const by = cy + ph / 2 - 26;
            if (card) {
                const i = detail.card, c = cardCost(run, card);
                B.button(d, "dbuy", W / 2 + 48, by, 124, 40, { label: `BUY ${c}`, color: "#ff4f8b", off: !canBuy(run, i), fn: () => { detail = null; tryBuy(i, null); }, fn0: () => say("Can't buy that yet", "#ff5f6f"), size: 16, sound: "pick" });
                B.button(d, "dhold", W / 2 - 62, by, 84, 40, { label: run.held[i] ? "UNHOLD" : "HOLD", color: "#46b8ff", fn: () => { hold(run, i); play(game, "hold"); detail = null; }, size: 13 });
            } else if (inst) {
                const pr = sellPrice(run, inst);
                B.button(d, "dsell", W / 2, by, 136, 40, { label: `SELL +${pr}`, color: "#ff8f6f", fn: () => { const sp = locate(run, inst.uid), v = V.get(inst.uid); sell(run, sp); V.delete(inst.uid); play(game, "sell"); bumpGold(); if (v) fx.stars(v.x, v.y, 7, 180, "coin"); detail = null; }, size: 15 });
            }
        };
    });
}
