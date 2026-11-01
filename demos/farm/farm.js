// The patch at night: the heart of the game. One finger, one verb per sweep, and everything ripples.
import { G, ART, COLORS, Fx, Group, ambient, dateLine, foot, glow, moonName, panel, saveGame, say, spr } from "./core.js";
import { COLS, CROPS, DISHES, GHOSTS, HYBRIDS, MOON_RULES, RELICS, ROWS, SEASONS, ZONES } from "./data.js";
import * as S from "./sim.js";
import { paintFarm } from "./art.js";
import { Sky, Weather, Moth, weatherFor } from "./world.js";
import { Stage, basket, book, buildList, dialog, toastCard } from "./modal.js";

const T = 48, FIELD = COLS * T;
export function layoutFarm(v) {
    const portrait = v.height > v.width, safe = v.safe;
    if (portrait) {
        const tray = 112, farmY = Math.round((v.height - safe.bottom - tray - FIELD - 2) / 2) * 2, farmX = Math.round((v.width - FIELD) / 4) * 2;
        return { portrait, farmX, farmY, horizon: Math.max(120, farmY - 36), trayY: farmY + FIELD + 6, moon: { x: v.width - 70, y: safe.top + 96 }, house: { x: Math.max(70, farmX + 66), y: farmY - 12 } };
    }
    const farmY = Math.max(safe.top + 40, Math.round((v.height - safe.bottom - FIELD - 8) / 2) * 2 + 2), farmX = Math.round((v.width - FIELD) / 4) * 2;
    return { portrait, farmX, farmY, horizon: Math.max(70, farmY - 26), moon: { x: farmX + FIELD - 30, y: 34 }, house: { x: farmX - 112, y: farmY + 258 } };
}
const stageOf = (c, sim) => { if (c.ripe) return 3; const def = CROPS[c.id]; return Math.min(2, Math.floor((c.age / def.days) * 3)); };
const HINTS = ["Drag across the glowing radishes", "Drag across the grass to till it", "Drag across the soil to plant", "Drag across the seedlings to water", "Greet the dawn"];

export function farmScene(s, args = {}) {
    const game = G.game, st = G.sim ?? G.fresh(1), v = () => s.view, ev = args.ev;
    game.touch.enabled = false;
    let L = layoutFarm(v());
    const paint = () => { L = layoutFarm(v()); G.farmLayout = L; G.paintBg(`farm:${S.season(st)}:${v().width}x${v().height}`, (p) => paintFarm(p, Math.ceil(v().width / 2), Math.ceil(v().height / 2), S.season(st), L)); };
    paint(); G.farmLayout = L;
    const fx = new Fx(s), sky = new Sky(), stage = new Stage(s), hud = new Group(s), moth = new Moth(L.farmX + 168, L.farmY + 120);
    let weather = new Weather(weatherFor(S.season(st), st.rain), v().width, v().height);
    G.sound.song("night");
    const anim = st.tiles.map(() => ({ bob: 0, pop: 0, tilt: 0, wet: 0, delay: [] }));
    let day = args.from === "dusk" ? 1 : 0, phase = args.from === "dusk" ? "dusk" : "night", phaseT = 0, frozenStage = null, dawnEv = null, hideSeed = 0;
    let banner = null, sweep = null, cursor = null, seedPage = 0, info = "", infoT = 0, tutT = 0, keyHeld = false, passing = null, passT = 8;
    const tileAt = (x, y) => { const c = Math.floor((x - L.farmX) / T), r = Math.floor((y - L.farmY) / T); return c >= 0 && r >= 0 && c < COLS && r < ROWS ? S.idx(c, r) : -1; };
    const center = (i) => ({ x: L.farmX + (i % COLS) * T + T / 2, y: L.farmY + Math.floor(i / COLS) * T + T / 2 });
    const say2 = (text, sec = 3) => { info = text; infoT = sec; };
    stage.toast = (t) => say2(t);

    /** The soft wave that spreads from every touched tile. */
    const ripple = (i, power = 1) => {
        const x = i % COLS, y = Math.floor(i / COLS);
        for (let j = 0; j < 49; j++) { const dist = Math.hypot((j % COLS) - x, Math.floor(j / COLS) - y); if (dist > 0 && dist < 3.2) anim[j].delay.push({ t: dist * 0.075, k: power * (1 - dist / 3.6) }); }
    };
    const act = (i, verb, n) => {
        const a = anim[i], c = center(i);
        if (verb === "till") {
            const r = S.till(st, i); if (!r) return false;
            a.pop = 1; G.sound.till(n); fx.spark(c.x, c.y + 8, { n: 9, col: "#7c4c46", soil: true, g: 240, v0: 40, v1: 120, a: -1.57, spread: 1.2, size: 2 });
            if (r.relic) relicFound(r.relic, c);
        } else if (verb === "plant") {
            const r = S.plant(st, i); if (!r) { if (st.pennies < CROPS[st.selected].seed) say2("Not enough pennies for that seed"); return false; }
            a.pop = 1; G.sound.plant(n); fx.spark(c.x, c.y + 8, { n: 4, col: "#b4ff8a", v0: 10, v1: 30, g: -30, size: 2 });
            if (r.cost) fx.float(c.x, c.y - 6, `-${r.cost}`, "#ffe9a8");
        } else if (verb === "water") {
            if (!S.water(st, i)) return false;
            a.wet = 1; a.pop = 0.5; G.sound.water(n); fx.ring(c.x, c.y + 6, "#8cc8ff", 26, 0.55);
            fx.spark(c.x, c.y - 4, { n: 7, col: "#a8d8ff", g: 260, v0: 40, v1: 90, a: -1.57, spread: 1, size: 2 });
        } else if (verb === "harvest") {
            const r = S.harvest(st, i); if (!r) return false;
            a.pop = 1; a.hop = 1; G.sound.pop(n, r.shining);
            const d = CROPS[r.id], b = basketAt();
            s.freeze(0.012);
            fx.spark(c.x, c.y - 14, { n: r.shining ? 16 : 10, col: d.glow, v0: 50, v1: 150, size: 3 }); fx.ring(c.x, c.y - 12, d.glow, 36, 0.5);
            fx.float(c.x, c.y - 16, r.n > 1 ? `+${r.n}` : "+1", r.shining ? "#fff0a8" : "#fff");
            for (let k = 0; k < Math.min(3, r.n); k++) fx.fly(`item:${r.id}`, c.x, c.y - 18, b.x, b.y, { delay: k * 0.07, dur: 0.46, glow: d.glow, done: () => { hud.basketKick = 1; G.sound.tick(); hud.fresh = st.stats.harvested; } });
            if (st.dex.crop[r.id] && st.stats.harvested <= r.n) { /* first ever */ }
        }
        if (st.glimmer && st.glimmer.i === i) takeGlimmer();
        ripple(i, verb === "harvest" ? 1.4 : 1);
        return true;
    };
    const takeGlimmer = () => {
        const g = S.grab(st); if (!g) return;
        const c = center(g.i); G.sound.relic(); fx.spark(c.x, c.y, { n: 14, col: "#ffe9a8" });
        fx.float(c.x, c.y, g.kind === "pennies" ? `+${g.n}p` : `+ ${S.itemName(g.id)}`, "#ffe9a8");
    };
    const relicFound = (id, c) => {
        fx.fly(`item:${id}`, c.x, c.y, c.x, c.y - 30, { dur: 0.3, lift: 12, s: 2 });
        G.sound.relic();
        pendingCards.push({ title: "Dug something up!", body: `${RELICS[id].name}. ${RELICS[id].note}`, icon: `item:${id}` });
    };
    const pendingCards = [];
    const flushCards = () => { if (stage.open || !pendingCards.length || sweep) return; const c = pendingCards.shift(); toastCard(stage, c.title, c.body, c.icon, c.done); };
    const basketAt = () => hud.basket ?? { x: v().width - 40, y: v().safe.top + 24 };

    // ---- sweeping --------------------------------------------------------------------------------------------------------
    const selectedBell = () => st.selected === "@bell";
    const verbFor = (i) => selectedBell() ? (st.tiles[i].c || st.tiles[i].b || !S.open(st, i) ? null : "bell") : S.verbAt(st, i);
    const touchTile = (i) => {
        if (sweep.seen.has(i)) return;
        sweep.seen.add(i);
        const list = [i];
        if (st.built.widehoe && sweep.dir && (sweep.verb === "till" || sweep.verb === "water")) { const w = Math.abs(sweep.dir.x) > Math.abs(sweep.dir.y) ? COLS : 1; for (const n of [i - w, i + w]) if (n >= 0 && n < 49 && (w === COLS || Math.floor(n / COLS) === Math.floor(i / COLS))) list.push(n); }
        for (const t of list) {
            sweep.seen.add(t);
            if (verbFor(t) === sweep.verb && act(t, sweep.verb, sweep.n)) { sweep.n++; sweep.did++; }
        }
    };
    const startSweep = (x, y) => {
        const i = tileAt(x, y);
        if (i < 0) return;
        if (selectedBell()) {
            if (S.placeBell(st, i)) { G.sound.build(); ripple(i, 1.4); fx.ring(center(i).x, center(i).y, "#a8d8ff", 60, 0.7); if (!st.bells) st.selected = S.seedList(st)[0]; refreshHud(); }
            else G.sound.deny();
            return;
        }
        const verb = S.verbAt(st, i);
        if (verb === "bramble") { sweepBramble(); return; }
        if (!verb) { tileInfo(i); return; }
        sweep = { verb, seen: new Set(), n: 0, did: 0, x, y, dir: null };
        touchTile(i);
    };
    const sweepBramble = () => { G.sound.page(); const z = S.nextZone(st); if (z) openBuild(); };
    const moveSweep = (x, y) => {
        if (!sweep) return;
        const dx = x - sweep.x, dy = y - sweep.y, dist = Math.hypot(dx, dy), steps = Math.ceil(dist / 10);
        if (dist > 6) sweep.dir = { x: dx, y: dy };
        for (let k = 1; k <= steps; k++) { const i = tileAt(sweep.x + dx * k / steps, sweep.y + dy * k / steps); if (i >= 0) touchTile(i); }
        sweep.x = x; sweep.y = y;
    };
    const endSweep = () => {
        if (!sweep) return;
        if (sweep.verb === "harvest" && sweep.did >= 3) { G.sound.chord(sweep.did); s.shake(1.4, 0.12, { haptic: false }); fx.float(moth.x, moth.y - 20, `${sweep.did} in one sweep!`, "#ffe9a8"); }
        else if (sweep.did >= 4) G.game.haptic("light");
        advanceTutorial(sweep.verb);
        sweep = null;
        refreshHud(); saveGame();
    };
    const advanceTutorial = () => {
        if (st.tut >= 5) return;
        const any = (fn) => st.tiles.some(fn), before = st.tut;
        if (st.tut === 0 && !any((t) => t.c && t.c.ripe)) st.tut = 1;
        if (st.tut === 1 && st.stats.tilled >= 3) st.tut = 2;
        if (st.tut === 2 && st.tiles.filter((t) => t.c).length >= 3) st.tut = 3;
        if (st.tut === 3 && !any((t) => t.c && !t.w)) st.tut = 4;
        if (st.tut !== before) tutT = 0;
    };
    const tileInfo = (i) => {
        const t = st.tiles[i];
        if (t.b) { say2("A Dew Bell. It waters the eight tiles round it each dusk."); return; }
        if (!t.c) return;
        const d = CROPS[t.c.id], left = Math.max(1, d.days - t.c.age), fr = d.friends.map((f) => CROPS[f].name).join(", ");
        const lines = `${left} night${left > 1 ? "s" : ""} to go.${fr ? ` Likes ${fr}.` : ""}`;
        toastCard(stage, d.name, lines, `item:${t.c.id}`);
        stage.btn({ x: v().width / 2 + 56, y: stage.modal.list.find((e) => e.name === "ok").pos.y - 18, w: 92, h: 36, label: "Dig up", kind: "rose", name: "dig", onTap: () => { S.removeCrop(st, i); G.sound.till(2); ripple(i); stage.close(); } });
    };
    const openBuild = () => buildList(stage, { bought: (k) => { if (k === "zone") { paint(); G.sound.chime(); s.flash("#ffe9a8", 0.2); } if (k === "bell" && st.bells) { st.selected = "@bell"; } refreshHud(); } });
    const openBook = (t = 0) => book(stage, t);

    // ---- dawn and dusk --------------------------------------------------------------------------------------------------
    const greetDawn = () => {
        if (phase !== "night" || stage.open) return;
        st.tut = 5;
        frozenStage = st.tiles.map((t) => (t.c ? stageOf(t.c) : -1));
        const wasRipe = st.tiles.map((t) => !!(t.c && t.c.ripe));
        dawnEv = S.dawn(st);
        phase = "dawn"; phaseT = 0; G.sound.dawn(); saveGame();
        hud.clear();
        G.sound.song("day");
        // Growth rolls across the field in a soft wave, row by row.
        st.tiles.forEach((t, i) => {
            if (!t.c) { frozenStage[i] = -1; return; }
            const x = i % COLS, y = Math.floor(i / COLS), wait = 0.5 + (x + y) * 0.1, ripe = t.c.ripe && !wasRipe[i];
            if (stageOf(t.c) !== frozenStage[i] || ripe) s.wait(wait, () => { frozenStage && (frozenStage[i] = -1); anim[i].pop = 1; ripple(i, 0.8); G.sound[ripe ? "ripe" : "grow"](x + y); if (ripe) { const c = center(i); fx.spark(c.x, c.y - 12, { n: 6, col: CROPS[t.c.id].glow, g: -20, v0: 10, v1: 50 }); } }); else frozenStage[i] = -1;
        });
    };
    const finishDawn = () => {
        if (phase !== "dawn") return;
        phase = "leaving";
        const after = () => game.go("market", { from: "dawn", ev: dawnEv }, { fade: 0.3 });
        const news = dawnEv?.hybrids?.filter((h) => h.first) ?? [];
        if (news.length) {
            G.sound.hybrid(); s.flash("#fff6c8", 0.3); news.forEach((h) => { fx.spark(center(h.i).x, center(h.i).y, { n: 24, col: CROPS[h.id].glow, size: 3 }); });
            const go = (k) => { if (k >= news.length) { after(); return; } const id = news[k].id; toastCard(stage, "A new crop!", `${CROPS[id].name} sprouted in the gap between its parents. Its seed is yours now.`, `item:${id}`, () => go(k + 1)); };
            go(0);
        } else after();
    };

    // ---- HUD ----------------------------------------------------------------------------------------------------------------
    const refreshHud = () => {
        if (phase !== "night") return;
        hud.clear(); const vw = v(), safe = vw.safe, w = vw.width, h = vw.height;
        const dayChip = (x, y, cw) => hud.button({ x, y, w: cw, h: 40, name: "moonchip", onTap: () => openBook(0), draw: (d, ax, ay, bw, bh) => {
            panel(d, ax, ay, bw, bh, "night");
            spr(d, `moon${S.moon(st)}`, ax + 20, ay + 20, { s: 0.55 });
            say(d, dateLine(st), ax + 40, ay + 11, { color: COLORS.paperHi });
        } });
        const pennyChip = (x, y, cw) => hud.drawn({ draw(d) { panel(d, x, y, cw, 40, "night"); spr(d, "coin", x + 18, y + 20); say(d, `${hud.shown ?? st.pennies}`, x + 32, y + 11, { color: COLORS.gold }); } });
        const basketChip = (x, y, cw) => {
            hud.basket = { x: x + cw / 2 - 10, y: y + 20 };
            hud.button({ x, y, w: cw, h: 40, name: "basket", onTap: () => basket(stage), draw: (d, ax, ay, bw, bh) => {
                panel(d, ax, ay, bw, bh, "night");
                const k = hud.basketKick ?? 0; spr(d, "basket", ax + 21, ay + 20, { s: 1 + k * 0.3 });
                say(d, `${Object.values(st.inv).reduce((a, b) => a + b, 0)}`, ax + 40, ay + 11, { color: COLORS.paperHi });
            } });
        };
        const seeds = S.seedList(st), chip = (id, x, y, cw, ch) => {
            const sel = st.selected === id, def = CROPS[id], cost = S.seedCost(st, id);
            hud.button({ x, y, w: cw, h: ch, name: `seed:${id}`, onTap: () => { st.selected = id; G.sound.plant(3); say2(seedLine(id), 3); refreshHud(); }, draw: (d, ax, ay, bw, bh, press) => {
                panel(d, ax, ay - (sel ? 3 : 0), bw, bh, sel ? "gold" : "plain");
                spr(d, `item:${id}`, ax + bw / 2, ay + bh / 2 - 8 - (sel ? 3 : 0));
                say(d, cost ? `${cost}` : "free", ax + bw / 2, ay + bh - 21 - (sel ? 3 : 0), { align: "center", color: COLORS.ink });
            } });
        };
        const bellChip = (x, y, cw, ch) => hud.button({ x, y, w: cw, h: ch, kind: selectedBell() ? "gold" : "plain", name: "seed:bell", icon: "drop", sub: `x${st.bells}`, onTap: () => { st.selected = "@bell"; say2("Tap a free tile to place the Dew Bell"); refreshHud(); } });
        const pageSeeds = (n) => { const list = st.bells ? ["@bell", ...seeds] : seeds; if (list.length <= n) return list; const per = n - 1, start = (seedPage % Math.ceil(list.length / per)) * per; return [...list.slice(start, start + per), "@more"]; };
        const moreChip = (x, y, cw, ch) => hud.button({ x, y, w: cw, h: ch, kind: "plain", label: ">", name: "seed:more", onTap: () => { seedPage++; G.sound.page(); refreshHud(); } });
        const place = (id, x, y, cw, ch) => id === "@bell" ? bellChip(x, y, cw, ch) : id === "@more" ? moreChip(x, y, cw, ch) : chip(id, x, y, cw, ch);
        const nav = (icon, name, x, y, sz, onTap) => hud.button({ x, y, w: sz, h: sz, icon, name, kind: "night", onTap });
        const goPond = () => { if (stage.open) return; saveGame(); game.go("pond", {}, { fade: 0.25 }); };
        const dawnBtn = (x, y, bw, bh) => hud.button({ x, y, w: bw, h: bh, kind: "gold", name: "dawn", label: L.portrait ? "Greet the dawn" : "Dawn", icon: "sunnav", onTap: greetDawn });
        if (L.portrait) {
            dayChip(6 + safe.left, safe.top + 6, 150); basketChip(w - 186, safe.top + 6, 72); pennyChip(w - 110, safe.top + 6, 104);
            const y = L.trayY, n = Math.max(5, Math.floor((w - 12) / 58)), list = pageSeeds(n), cw = Math.floor((w - 12) / n);
            list.forEach((id, i) => place(id, 6 + i * cw, y, cw - 2, 52));
            const y2 = y + 56, sz = 48;
            nav("fishnav", "pond", 6, y2, sz, goPond); nav("book", "book", 58, y2, sz, () => openBook(0)); nav("hammer", "build", 110, y2, sz, openBuild);
            dawnBtn(162, y2, w - 168, sz);
        } else {
            const lx = L.farmX - 170, rx = L.farmX + FIELD + 8;
            dayChip(lx, safe.top + 6, 160); basketChip(lx, safe.top + 50, 72); pennyChip(lx + 74, safe.top + 50, 86);
            nav("fishnav", "pond", lx, h - safe.bottom - 54, 50, goPond); nav("book", "book", lx + 54, h - safe.bottom - 54, 50, () => openBook(0)); nav("hammer", "build", lx + 108, h - safe.bottom - 54, 50, openBuild);
            const list = pageSeeds(12), cw = 54;
            list.forEach((id, i) => place(id, rx + (i % 3) * cw, safe.top + 8 + Math.floor(i / 3) * 56, cw - 2, 52));
            dawnBtn(rx, h - safe.bottom - 54, Math.min(162, v().width - rx - safe.right - 4), 50);
        }
        // goal ribbon
        hud.drawn({ layer: 44, draw(d) {
            const t = infoT > 0 ? info : st.tut < 5 ? "" : S.goalText(st);
            if (!t) return;
            const lines = G.font.wrap(t, L.portrait ? w - 20 : 160), x = L.portrait ? w / 2 : L.farmX - 90, y = L.portrait ? safe.top + 50 : safe.top + 100;
            lines.forEach((l, j) => say(d, l, x, y + j * 20, { align: "center", color: infoT > 0 ? "#fff6c8" : "#f6e8c4", outline: COLORS.ink }));
        } });
    };
    const seedLine = (id) => { const d = CROPS[id]; return `${d.name}: ${d.days} nights, sells ${d.sell}p${d.regrow ? ", keeps fruiting" : ""}`; };
    stage.refresh = refreshHud;

    // ---- frame --------------------------------------------------------------------------------------------------------------
    s.on("resize", () => { paint(); refreshHud(); weather = new Weather(weather.kind, v().width, v().height); });
    s.onUpdate((dt) => {
        G.sound.tick(); sky.update(dt); weather.update(dt); fx.update(dt);
        infoT = Math.max(0, infoT - dt); tutT += dt;
        if (banner) { banner.t += dt; if (banner.t > 2.4) banner = null; }
        hud.basketKick = Math.max(0, (hud.basketKick ?? 0) - dt * 5);
        const tgt = st.pennies; hud.shown = hud.shown === undefined ? tgt : hud.shown + Math.sign(tgt - hud.shown) * Math.ceil(Math.abs(tgt - hud.shown) * 0.2);
        for (const a of anim) {
            a.bob *= Math.pow(0.012, dt); a.pop = Math.max(0, a.pop - dt * 3.2); a.tilt *= Math.pow(0.02, dt);
            for (let q = a.delay.length - 1; q >= 0; q--) { const e = a.delay[q]; e.t -= dt; if (e.t <= 0) { a.bob = Math.min(1.2, a.bob + e.k); a.delay.splice(q, 1); } }
        }
        // the moth goes where your finger is, or where you ought to look next
        const inp = s.input, p = inp.pointer;
        if (sweep || p.down) { moth.tx = p.x; moth.ty = p.y - 34; }
        else if (st.tut < 4) { const tgtI = tutTarget(); if (tgtI >= 0) { const c = center(tgtI); moth.tx = c.x + 10; moth.ty = c.y - 34; } }
        moth.update(dt);
        passT -= dt;
        if (passT < 0 && !passing && phase === "night") { const g = ["bartleby", "odette", "biscuit", "fennimore", "quillon", "auberon"][Math.floor(game.fxRng.range(0, 5.99))]; passing = { g, x: -40, v: game.fxRng.range(14, 22), y: L.horizon + 6 }; }
        if (passing) { passing.x += passing.v * dt; if (passing.x > v().width + 40) { passing = null; passT = game.fxRng.range(10, 24); } }
        if (phase === "dusk") { phaseT += dt; day = Math.max(0, 1 - phaseT / 1.5); if (phaseT >= 1.5) { phase = "night"; refreshHud(); afterDusk(); } return; }
        if (phase === "dawn") { phaseT += dt; day = Math.min(1, phaseT / 2.2); if (phaseT > 2.4 || (phaseT > 0.5 && (p.pressed || inp.pressed("confirm")))) { day = 1; finishDawn(); } return; }
        if (phase !== "night" || stage.open) { if (sweep) endSweep(); return; }
        flushCards();
        if (p.pressed) startSweep(p.x, p.y);
        if (sweep) { if (p.down) moveSweep(p.x, p.y); else endSweep(); }
        keyboard();
    });
    const tutTarget = () => {
        const near = (fn) => st.tiles.findIndex((t, i) => fn(t, i));
        if (st.tut === 0) return near((t) => t.c && t.c.ripe);
        if (st.tut === 1) return near((t, i) => S.verbAt(st, i) === "till" && Math.floor(i / COLS) === 3);
        if (st.tut === 2) return near((t, i) => S.verbAt(st, i) === "plant");
        if (st.tut === 3) return near((t, i) => S.verbAt(st, i) === "water");
        return -1;
    };
    const keyboard = () => {
        const inp = s.input, dirs = [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]];
        for (const [a, dx, dy] of dirs) if (inp.pressed(a)) { const cur = cursor ?? { x: 3, y: 4 }; cursor = { x: Math.max(0, Math.min(6, cur.x + dx)), y: Math.max(0, Math.min(6, cur.y + dy)) }; G.sound.page(); if (sweep) { const c = center(S.idx(cursor.x, cursor.y)); moveSweep(c.x, c.y); } }
        const fire = inp.down("fire");
        if (fire && !keyHeld && cursor) { const c = center(S.idx(cursor.x, cursor.y)); startSweep(c.x, c.y); }
        if (!fire && keyHeld && sweep) endSweep();
        keyHeld = fire;
        if (inp.pressed("dawn")) greetDawn();
        if (inp.pressed("book")) openBook(0);
        if (inp.pressed("build")) openBuild();
        if (inp.pressed("next") || inp.pressed("prev")) { const list = S.seedList(st), i = list.indexOf(st.selected), n = (i + (inp.pressed("next") ? 1 : list.length - 1)) % list.length; st.selected = list[n]; G.sound.plant(3); say2(seedLine(list[n])); refreshHud(); }
    };

    s.onDraw((d) => {
        const w = v().width, h = v().height, tint = ambient(day), nightly = 1 - day, t = s.time;
        const moonY = L.moon.y + day * (L.horizon + 30 - L.moon.y), sunP = { x: 70, y: L.horizon + 20 - day * (L.horizon - 40) };
        sky.draw(d, w, L.horizon + 30, day, S.moon(st), { x: L.moon.x + day * 40, y: moonY, s: L.portrait ? 2 : 1 }, day > 0.01 ? sunP : null);
        const bw = Math.ceil(w / 2), bh = Math.ceil(h / 2);
        if (passing) spr(d, `ghost:${passing.g}:${Math.floor(t * 2) % 2}1`, passing.x, passing.y + Math.sin(t * 1.6) * 4, { s: 1, opacity: 0.8 });
        d.sprite("bg", { crop: [0, 0, bw, bh], x: bw, y: bh, width: bw * 2, height: bh * 2, color: tint });
        // buildings
        const by = L.farmY - 8;
        foot(d, "house", L.house.x, L.portrait ? by : L.house.y, { color: tint, s: L.portrait ? 2 : 1.5 });
        d.additive(() => foot(d, "house:glow", L.house.x, L.portrait ? by : L.house.y, { s: L.portrait ? 2 : 1.5, opacity: 0.35 + nightly * 0.65 }));
        if (L.portrait) {
            if (st.built.cauldron) foot(d, "shed", w - 110, by - 4, { s: 1.5, color: tint });
            if (st.built.hive) foot(d, "hive", w - 40, by, { color: tint });
            if (st.built.glass) foot(d, "glasshouse", w - 170, by - 8, { s: 1.5, color: tint });
        } else {
            if (st.built.cauldron) foot(d, "shed", L.farmX + FIELD + 56, L.farmY + 270, { s: 1.5, color: tint });
            if (st.built.hive) foot(d, "hive", L.farmX + FIELD + 130, L.farmY + 270, { color: tint });
            if (st.built.glass) foot(d, "glasshouse", L.farmX - 44, L.farmY + 264, { s: 1, color: tint });
        }
        // field, back to front so tall crops overlap the row behind them
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const i = S.idx(c, r), tile = st.tiles[i], a = anim[i], x = L.farmX + c * T + T / 2, y = L.farmY + r * T + T / 2, vari = (c * 7 + r * 3) % 3;
            if (!S.open(st, i)) { foot(d, `bramble${vari}`, x, y + T / 2 + 2, { color: tint }); continue; }
            const bump = a.pop > 0 ? Math.sin(a.pop * 3.14) * 3 : 0, sway = a.bob * Math.sin(t * 14 + c + r);
            if (tile.t) {
                const wet = tile.w || st.rain ? 1 : 0;
                spr(d, `soil${wet}${vari}`, x, y + bump * 0.5, { color: tint });
            } else if ((c * 5 + r * 11) % 4 === 0) spr(d, "tuft", x - 4 + (r % 3) * 6, y + 6, { color: tint });
            if (tile.b) foot(d, "dewbell", x, y + 22, { color: tint });
            const fs = frozenStage?.[i] ?? -1, sc = tile.c ? (fs >= 0 ? fs : stageOf(tile.c)) : -1;
            if (tile.c) {
                const stretch = 1 + a.pop * 0.35 + a.bob * 0.08, base = y + 18;
                d.push(); d.translate(x, base); d.rotate(sway * 0.18 + Math.sin(t * 1.3 + i) * 0.02); d.scale(2 - a.pop * 0.3, 2 * stretch);
                spr(d, `crop:${tile.c.id}:${sc}`, 0, -14, { s: 1, color: tint });
                if (sc >= 2) spr(d, `glow:${tile.c.id}:${sc}`, 0, -14, { s: 1, opacity: (sc === 3 ? 1 : 0.5) * (0.15 + nightly * 0.85) });
                d.pop();
            }
        }
        if (st.glimmer) { const c = center(st.glimmer.i), k = 0.6 + Math.sin(t * 5) * 0.4; d.additive(() => { glow(d, c.x, c.y, 26, "#ffe9a8", 0.7 * k); d.rect(2, 16 * k, { x: c.x, y: c.y, color: "#fff" }); d.rect(16 * k, 2, { x: c.x, y: c.y, color: "#fff" }); }); }
        // light: this is the additive pass that sells the whole game
        d.additive(() => {
            glow(d, L.farmX + FIELD / 2, L.farmY + FIELD / 2, FIELD * 0.95, "#2a3a90", 0.2 * nightly);
            for (let i = 0; i < 49; i++) {
                const tile = st.tiles[i]; if (!tile.c || !S.open(st, i)) continue;
                const fs = frozenStage?.[i] ?? -1, sc = fs >= 0 ? fs : stageOf(tile.c), def = CROPS[tile.c.id], c = center(i), a = anim[i], pulse = 0.82 + Math.sin(t * 1.8 + i * 1.3) * 0.18;
                const lit = (0.14 + nightly * 0.86) * pulse;
                const big = sc === 3 ? 54 : sc === 2 ? 30 : 12;
                glow(d, c.x, c.y - (sc === 3 ? 12 : 6), big + a.pop * 18, def.glow, (sc === 3 ? 0.62 : 0.24) * lit); if (sc === 3) glow(d, c.x, c.y - 12, 22, "#ffffff", 0.2 * lit);
                if (S.moon(st) === 4 && sc === 3 && Math.sin(t * 3 + i) > 0.6) d.rect(2, 2, { x: c.x + Math.sin(i * 9) * 16, y: c.y - 20 - ((t * 14 + i * 7) % 26), color: "#fff6c8", opacity: lit });
            }
            threads(d, nightly);
            fx.drawGlow(d);
        });
        fx.drawSolid(d);
        weather.draw(d, day);
        // the sweep's tool, floating above the thumb
        if (sweep && phase === "night") {
            const p = s.input.pointer, icon = { till: "hoe", plant: `item:${st.selected}`, water: "can", harvest: "sickle" }[sweep.verb];
            if (icon) spr(d, icon, p.x + 20, p.y - 42 + Math.sin(t * 16) * 2, { rot: Math.sin(t * 12) * 0.2 });
        }
        if (cursor && phase === "night") { const c = center(S.idx(cursor.x, cursor.y)); d.rect(T - 4, T - 4, { x: c.x, y: c.y, radius: 6, color: "#ffe9a8", outline: 2 }); }
        moth.draw(d, Math.max(0.2, nightly));
        if (phase === "night" && st.tut < 5) tutorial(d, t);
        if (phase === "dawn") { const dd = day; say(d, `${S.dayOfSeason(st) === 1 ? "" : ""}Morning`, w / 2, L.horizon - 60, { align: "center", scale: 3, color: "#fff8e4", outline: COLORS.ink, opacity: Math.min(1, phaseT) }); }
    });
    s.onDrawUI((d) => { fx.drawTop(d); if (banner) { const k = Math.min(1, banner.t * 3) * Math.min(1, (2.4 - banner.t) * 2.5); say(d, banner.text, v().width / 2, L.farmY + 110, { align: "center", scale: 5, color: "#fff8e4", outline: COLORS.ink, opacity: k }); } });
    const tutorial = (d, t) => {
        const w = v().width, text = HINTS[st.tut];
        if (st.tut === 4) { const b = hud.list.find((e) => e.name === "dawn"); if (b) d.additive(() => glow(d, b.pos.x, b.pos.y, 90, "#ffe9a8", 0.28 + Math.sin(t * 4) * 0.12)); }
        const list = [];
        const row = st.tut === 0 ? 4 : 3;
        if (st.tut < 4) for (let c = 0; c < COLS; c++) { const i = S.idx(c, row); if (S.verbAt(st, i) === ["harvest", "till", "plant", "water"][st.tut]) list.push(center(i)); }
        if (list.length > 1 && tutT > 0.3) {
            const a = list[0], b = list[list.length - 1], k = (t * 0.7) % 1;
            for (let n = 0; n < 12; n++) { const q = n / 11, x = a.x + (b.x - a.x) * q, y = a.y + (b.y - a.y) * q, on = Math.abs(q - k) < 0.1; d.rect(on ? 6 : 3, on ? 6 : 3, { x, y: y + 6, radius: 3, color: on ? "#fff6c8" : "#ffe9a8", opacity: on ? 0.95 : 0.5 }); }
            const fx0 = a.x + (b.x - a.x) * k, fy = a.y + (b.y - a.y) * k + 6; d.additive(() => glow(d, fx0, fy, 20, "#fff6c8", 0.7));
        }
        const y = L.portrait ? L.farmY - 36 : Math.max(v().safe.top + 8, L.farmY - 30), tw = G.font.width(text) + 24, x = w / 2;
        panel(d, x - tw / 2, y, tw, 32, "paper");
        say(d, text, x, y + 7, { align: "center", color: COLORS.ink });
    };
    /** Threads of light between companions and shimmering motes where two ripe parents flank a gap. */
    const threads = (d, nightly) => {
        const t = s.time;
        for (let i = 0; i < 49; i++) {
            const a = st.tiles[i]; if (!S.open(st, i)) continue;
            if (a.c) for (const j of [i + 1, i + COLS]) {
                if (j >= 49 || (j === i + 1 && j % COLS === 0)) continue;
                const b = st.tiles[j]; if (!b.c) continue;
                if (CROPS[a.c.id].friends.includes(b.c.id) || CROPS[b.c.id].friends.includes(a.c.id)) {
                    const p = center(i), q = center(j);
                    for (let n = 0; n < 5; n++) { const k = (n + 1) / 6, wob = Math.sin(t * 2 + n + i) * 3; d.rect(2, 2, { x: p.x + (q.x - p.x) * k + (q.y - p.y) / 48 * wob, y: p.y + (q.y - p.y) * k - 8 + (q.x - p.x) / 48 * wob, color: CROPS[a.c.id].glow, opacity: (0.35 + nightly * 0.5) * (0.5 + Math.sin(t * 3 - n) * 0.5) }); }
                }
            } else if (a.t && !a.b) {
                const ripe = S.nbrs(i).map((n) => st.tiles[n].c).filter((c) => c && c.ripe).map((c) => c.id);
                const h = HYBRIDS.find((id) => CROPS[id].parents.every((p) => ripe.includes(p)));
                if (h) { const c = center(i); for (let n = 0; n < 5; n++) { const k = (t * 0.5 + n / 5) % 1; d.rect(2, 2, { x: c.x + Math.sin(n * 2.4 + t) * 14, y: c.y + 14 - k * 34, color: "#fff0a8", opacity: (1 - k) * 0.9 }); } glow(d, c.x, c.y, 26, "#ffe9a8", 0.26); }
            }
        }
    };
    const afterDusk = () => {
        const queue = [];
        if (ev?.seasonChanged) queue.push(() => { G.sound.chime(); say2(`${SEASONS[S.season(st)]}.${ev.tucked ? ` ${ev.tucked} ripe crops tucked into your basket.` : ""}${ev.refund ? ` Seed money back: ${ev.refund}p.` : ""}`, 5); });
        if (ev?.scene !== null && ev?.scene !== undefined) { game.go("pond", { scene: ev.scene }, { fade: 0.5 }); return; }
        for (const q of queue) q();
        if (ev?.seasonChanged) banner = { text: SEASONS[S.season(st)], t: 0 };
        const kind = S.moonKind(S.moon(st));
        if (st.rain && !ev?.seasonChanged) say2(S.season(st) === 3 ? "Snowing. Everything's watered tonight." : "Rain tonight. Everything's watered.", 4);
        else if (!ev?.seasonChanged && (kind === "new" || S.moon(st) === 1 || S.moon(st) === 5 || kind === "full")) say2(MOON_RULES[kind], 5);
    };
    refreshHud();
    if (phase === "dusk") { G.sound.dusk(); }
    else if (args.from === "title" && st.backRain) { st.backRain = false; say2("It rained while you were gone. Everything's watered.", 5); }
}
