// By day: the view from behind your own stall, with polite ghosts queuing in the sunshine.
import { G, COLORS, Fx, Group, ambient, dateLine, foot, glow, panel, saveGame, say, spr } from "./core.js";
import { paintMarket } from "./art.js";
import { CROPS, GHOSTS, GRAN_LAST_LETTER, HEART, KEEPSAKES, LETTERS } from "./data.js";
import * as S from "./sim.js";
import { Sky, Weather } from "./world.js";
import { Stage, basket, book, buildList, ghostCard, letter, toastCard } from "./modal.js";

export function marketScene(s, args = {}) {
    const game = G.game, st = G.sim ?? G.fresh(1), v = () => s.view, fx = new Fx(s), sky = new Sky(), stage = new Stage(s), hud = new Group(s), bits = new Group(s);
    game.touch.enabled = false;
    const portrait = () => v().height > v().width, counterH = () => portrait() ? 196 : 124;
    const paint = () => G.paintBg(`market:${S.season(st)}:${v().width}x${v().height}`, (p) => paintMarket(p, Math.ceil(v().width / 2), Math.ceil(v().height / 2), S.season(st), {}));
    paint();
    G.sound.song("day");
    let leaving = false, sold = 0, shown = st.pennies, weather = new Weather(["petal", "none", "leaf", "snow"][S.season(st)], v().width, v().height), fresh = 1, moodT = {};
    if (st.phase === "night") { game.go("farm", { from: "title" }); return; }
    const slots = () => {
        const n = st.orders.length, w = v().width, c = counterTop(), usable = w - v().safe.left - v().safe.right, per = usable / n, spacing = Math.min(per, 150);
        const yBase = c - (gs() === 3 ? 86 : 66);
        return st.orders.map((o, i) => ({ x: Math.round(w / 2 + (i - (n - 1) / 2) * spacing), y: Math.round(yBase - (i % 2) * (portrait() && n > 3 ? 72 : 0)) }));
    };
    const gs = () => portrait() && st.orders.length <= 3 ? 3 : 2;
    const counterTop = () => v().height - v().safe.bottom - counterH();
    const anim = st.orders.map((o, i) => ({ in: -i * 0.4, hop: 0, happy: 0, gone: false }));
    const hitServe = (i) => {
        const o = st.orders[i], p = slots()[i];
        const r = S.serve(st, i);
        if (!r) { G.sound.deny(); return; }
        anim[i].hop = 1; anim[i].happy = 2.4; fresh = 1;
        const cx = p.x, cy = p.y;
        fx.fly(`item:${o.item}`, v().width / 2, counterTop() + 10, cx, cy - 10, { dur: 0.32, lift: 40 });
        s.wait(0.3, () => { G.sound.chime(); fx.spark(cx, cy, { n: 14, col: "#ffe9a8" }); fx.float(cx, cy - 40, `+${r.pay}p`, "#ffe9a8"); for (let k = 0; k < 5; k++) fx.fly("coin", cx, cy, pennyAt().x, pennyAt().y, { delay: k * 0.05, dur: 0.4, lift: 30, s: 1.5, done: () => G.sound.coin(k) }); if (r.heart) { heartPop(cx, cy); } });
        rebuild(); saveGame();
    };
    const heartPop = (x, y) => { G.sound.heart(); fx.fly("heart", x, y, x, y - 70, { dur: 0.8, lift: 10, s: 2.5 }); fx.spark(x, y - 40, { n: 12, col: "#ffb0c0" }); };
    const pennyAt = () => ({ x: v().width - 80, y: v().safe.top + 26 });
    const sellRest = () => {
        const list = S.sellRest(st), c = { x: v().width / 2, y: counterTop() + 16 };
        if (!list.length) { G.sound.deny(); return; }
        const total = list.reduce((a, b) => a + b.pay, 0);
        list.slice(0, 14).forEach((b, k) => fx.fly("coin", c.x + (k % 5) * 12 - 24, c.y, pennyAt().x, pennyAt().y, { delay: k * 0.04, dur: 0.4, lift: 40, s: 1.5, done: () => G.sound.coin(k) }));
        fx.float(c.x, c.y - 24, `Sold! +${total}p`, "#ffe9a8", 3);
        s.shake(1, 0.1, { haptic: false }); game.haptic("medium");
        rebuild(); saveGame();
    };
    const hooks = {
        gifted: (g, r) => { const i = st.orders.findIndex((o) => o.g === g); if (i >= 0) { anim[i].happy = 2; anim[i].hop = 1; } fx.float(v().width / 2, v().height * 0.3, r.score === 3 ? "They love it!" : r.score === 2 ? "They like it." : "How thoughtful.", "#ffd0e4"); },
        lastLetter: () => { st.lastLetterRead = true; letter(stage, "To The Keeper", GRAN_LAST_LETTER, () => { saveGame(); rebuild(); }); },
        done: () => rebuild(),
    };
    const openGhost = (i) => ghostCard(stage, st.orders[i].g, hooks);
    const openBuild = () => buildList(stage, { bought: () => rebuild() });
    const moonrise = () => {
        if (leaving || stage.open) return; leaving = true;
        const ev = S.dusk(st); saveGame();
        game.go("farm", { from: "dusk", ev }, { fade: 0.25 });
    };
    const rebuild = () => {
        hud.clear(); bits.clear();
        const vw = v(), w = vw.width, h = vw.height, safe = vw.safe, ct = counterTop();
        // HUD
        hud.drawn({ draw(d) { panel(d, 6 + safe.left, safe.top + 6, 150, 40, "night"); spr(d, "sunnav", 26 + safe.left, safe.top + 26, { s: 1.2 }); say(d, dateLine(st), 46 + safe.left, safe.top + 17, { color: COLORS.paperHi }); panel(d, w - 110 - safe.right, safe.top + 6, 104, 40, "night"); spr(d, "coin", w - 92 - safe.right, safe.top + 26); say(d, `${shown}`, w - 78 - safe.right, safe.top + 17, { color: COLORS.gold }); } });
        hud.drawn({ layer: 44, draw(d) { const lines = G.font.wrap(S.goalText(st), w - 20); lines.forEach((l, j) => say(d, l, w / 2, safe.top + 52 + j * 20, { align: "center", color: "#fff8e4", outline: COLORS.ink })); } });
        // ghost bubbles
        st.orders.forEach((o, i) => {
            const p = slots()[i], can = S.stock(st, o.item) > 0, g = o.g;
            hud.button({ x: p.x - 44, y: p.y - 24 * gs() + 6, w: 88, h: 48 * gs() - 12, name: `ghost:${g}`, bare: true, draw: (d, x, y, bw, bh) => { }, onTap: () => openGhost(i) });
            if (!o.done) hud.button({ x: p.x - 52, y: p.y - 24 * gs() - 56, w: 104, h: 58, name: `serve:${i}`, kind: can ? "gold" : "plain", draw: (d, x, y, bw, bh) => {
                const a = anim[i]; if (a.in < 1) return;
                panel(d, x, y, bw, bh - 6, can ? "gold" : "plain");
                spr(d, `item:${o.item}`, x + 24, y + 25); spr(d, "coin", x + 52, y + 26, { s: 1.4 }); say(d, `${o.price}`, x + 62, y + 17, { color: COLORS.ink });
                d.rect(10, 6, { x: 0, y: y + bh - 4, color: can ? "#f4cf6a" : "#f6e8c4" });
            }, onTap: () => { if (can) hitServe(i); else { G.sound.deny(); fx.float(p.x, p.y - 100, `No ${CROPS[o.item]?.name ?? S.itemName(o.item)} yet`, "#fff"); } } });
            else if (S.hasStory(st, g) || S.favourReady(st, g)) hud.drawn({ layer: 46, draw(d) { const t = s.time; panel(d, p.x - 18, p.y - 24 * gs() - 40 + Math.sin(t * 4) * 3, 36, 36, "gold"); say(d, S.favourReady(st, g) ? "*" : "!", p.x, p.y - 24 * gs() - 33 + Math.sin(t * 4) * 3, { align: "center", color: COLORS.ink, scale: 2 }); } });
            if (!o.done && (S.hasStory(st, g) || S.favourReady(st, g))) hud.drawn({ layer: 46, draw(d) { panel(d, p.x + 34, p.y - 24 * gs() + 8, 24, 28, "rose"); say(d, "!", p.x + 46, p.y - 24 * gs() + 12, { align: "center", color: "#fff" }); } });
        });
        // counter buttons
        const items = Object.values(st.inv).reduce((a, b) => a + b, 0);
        const nav = (icon, name, x, y, sz, onTap, disabled) => hud.button({ x, y, w: sz, h: sz, icon, name, kind: "night", onTap, disabled });
        const kitchen = () => { if (!st.built.cauldron) { openBuild(); return; } saveGame(); game.go("kitchen", {}, { fade: 0.25 }); };
        const bb = () => basket(stage, { sold: (p) => { fx.float(pennyAt().x, pennyAt().y + 30, `+${p}p`, "#ffe9a8"); }, done: () => rebuild() });
        if (portrait()) {
            const y0 = ct + 62, sz = 56, gap = 4, bw = w - 16;
            hud.button({ x: 8, y: y0, w: bw - (sz + gap) * 2, h: sz, kind: "gold", label: `Sell the rest`, name: "sell", onTap: sellRest, disabled: !items });
            nav("potnav", "kitchen", w - 8 - sz * 2 - gap, y0, sz, kitchen); nav("basket", "basket", w - 8 - sz, y0, sz, bb);
            const y1 = y0 + sz + 6;
            nav("book", "book", 8, y1, sz, () => book(stage, 0)); nav("hammer", "build", 8 + sz + gap, y1, sz, openBuild);
            hud.button({ x: 8 + (sz + gap) * 2, y: y1, w: w - 16 - (sz + gap) * 2, h: sz, kind: "night", label: "To moonrise", icon: "moonnav", name: "dusk", color: "#f4e8d0", onTap: moonrise });
        } else {
            const y0 = h - safe.bottom - 58, sz = 52, x0 = Math.max(safe.left + 8, w / 2 - 330);
            hud.button({ x: x0, y: y0, w: 170, h: sz, kind: "gold", label: "Sell the rest", name: "sell", onTap: sellRest, disabled: !items });
            nav("potnav", "kitchen", x0 + 176, y0, sz, kitchen); nav("basket", "basket", x0 + 232, y0, sz, bb); nav("book", "book", x0 + 288, y0, sz, () => book(stage, 0)); nav("hammer", "build", x0 + 344, y0, sz, openBuild);
            hud.button({ x: x0 + 400, y: y0, w: 188 + 72, h: sz, kind: "night", label: "To moonrise", icon: "moonnav", name: "dusk", color: "#f4e8d0", onTap: moonrise });
        }
    };
    stage.refresh = rebuild;
    s.on("resize", () => { paint(); rebuild(); weather = new Weather(weather.kind, v().width, v().height); });
    s.onUpdate((dt) => {
        G.sound.tick(); sky.update(dt); fx.update(dt); weather.update(dt);
        shown += Math.sign(st.pennies - shown) * Math.ceil(Math.abs(st.pennies - shown) * 0.16);
        for (const a of anim) { a.in = Math.min(1, a.in + dt * 1.2); a.hop = Math.max(0, a.hop - dt * 2); a.happy = Math.max(0, a.happy - dt); }
        const inp = s.input; inp.pointer;
        if (!stage.open) {
            if (inp.pressed("confirm")) { const i = st.orders.findIndex((o) => !o.done && S.stock(st, o.item)); if (i >= 0) hitServe(i); else moonrise(); }
            if (inp.pressed("fire")) sellRest();
            if (inp.pressed("dawn")) moonrise(); if (inp.pressed("book")) book(stage, 0); if (inp.pressed("build")) openBuild(); }
    });
    s.onDraw((d) => {
        const w = v().width, h = v().height, t = s.time, tint = ambient(1), bw = Math.ceil(w / 2), bh = Math.ceil(h / 2), ct = counterTop();
        sky.draw(d, w, h * 0.5, 1, 4, null, { x: w * 0.74, y: 118 });
        d.sprite("bg", { crop: [0, 0, bw, bh], x: bw, y: bh, width: bw * 2, height: bh * 2, color: tint });
        // ghosts in order, nearest last, with soft shadows on the cobbles
        const ps = slots();
        st.orders.forEach((o, i) => {
            const a = anim[i], p = ps[i]; if (a.in <= 0) return;
            const e = 1 - (1 - a.in) ** 3, x = p.x, drift = (1 - e) * (i % 2 ? 60 : -60), y = p.y + Math.sin(t * 1.5 + i * 2) * 4 - Math.sin(a.hop * 3.14) * 18;
            const scale = gs();
            d.rect(30 * scale, 10, { x: x + drift, y: p.y + 24 * scale - 4, radius: 5, color: "#2a1b47", opacity: 0.18 * e });
            const mood = a.happy > 0 || o.done ? 1 : 0;
            spr(d, `ghost:${o.g}:${Math.floor(t * 2 + i) % 2}${mood}`, x + drift, y, { s: scale, opacity: 0.86 * e });
            d.additive(() => glow(d, x + drift, y, 60, GHOSTS[o.g].glow, 0.16 * e));
        });
        weather.draw(d, 1);
        // awning overhead
        const [ax, ay] = G.atlas.map.get("stall"), n = Math.ceil(w / 240);
        for (let i = 0; i < n; i++) d.sprite("atlas", { crop: [ax, ay, 120, 30], x: 120 + i * 240, y: v().safe.top * 0 + 30, width: 240, height: 60, color: tint });
        // counter
        const planks = Math.ceil(h - ct + 10);
        d.rect(w, planks, { x: w / 2, y: ct + planks / 2, color: "#5a3640" });
        d.rect(w, 8, { x: w / 2, y: ct + 2, color: "#dfb982" }); d.rect(w, 2, { x: w / 2, y: ct - 2, color: "#2a1b47" }); d.rect(w, 4, { x: w / 2, y: ct + 8, color: "#33202c" });
        for (let x = 40; x < w; x += 96) d.rect(2, planks, { x, y: ct + 10 + planks / 2, color: "#33202c", opacity: 0.6 });
        // what's on sale, sitting on the counter
        const keys = Object.keys(st.inv).slice(0, Math.floor((w - 40) / 40));
        keys.forEach((k, i) => { const x = 28 + i * 38, y = ct + 28 - ((i * 7) % 3) * 2; foot(d, `item:${S.isBase(k)}`, x, y + 16, {}); if (st.inv[k] > 1) say(d, `${st.inv[k]}`, x + 14, y + 8, { color: "#fff8e4", outline: COLORS.ink, align: "center" }); });
        if (!keys.length) say(d, "Nothing to sell just yet.", w / 2, ct + 24, { align: "center", color: "#dfb982" });
        d.additive(() => fx.drawGlow(d));
        fx.drawSolid(d);
    });
    s.onDrawUI((d) => {
        fx.drawTop(d);
        if (st.stats.served === 0 && !stage.open && st.orders.some((o) => !o.done && S.stock(st, o.item))) { const t = "Tap a gold sign to serve", w = v().width, tw = G.font.width(t) + 24, y = counterTop() - 40 + Math.sin(s.time * 3) * 3; panel(d, w / 2 - tw / 2, y, tw, 32, "paper"); say(d, t, w / 2, y + 7, { align: "center", color: COLORS.ink }); }
    });
    rebuild();
    if (st.letterUnread && st.letter >= 0) { const L = LETTERS[st.letter]; st.letterUnread = false; s.wait(0.45, () => { G.sound.chime(); letter(stage, "A letter from Gran", L.body, () => { saveGame(); rebuild(); }); }); }
    if (args.ev?.honey) fx.float(v().width / 2, v().height * 0.45, "+1 Moonhoney", "#ffe9a8");
    saveGame();
}
