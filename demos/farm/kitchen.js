// Gran's cauldron. Drop things in, stir round and round, see what you've made.
import { G, COLORS, Fx, Group, dateLine, foot, glow, panel, saveGame, say, spr } from "./core.js";
import { paintKitchen } from "./art.js";
import { CROPS, DISHES } from "./data.js";
import * as S from "./sim.js";
import { Stage, toastCard } from "./modal.js";

export function kitchenScene(s) {
    const game = G.game, st = G.sim ?? G.fresh(1), v = () => s.view, fx = new Fx(s), stage = new Stage(s), hud = new Group(s);
    game.touch.enabled = false;
    if (st.phase !== "day" || !st.built.cauldron) { game.go(st.phase === "day" ? "market" : "farm", {}); return; }
    const paint = () => G.paintBg(`kitchen:${v().width}x${v().height}`, (p) => paintKitchen(p, Math.ceil(v().width / 2), Math.ceil(v().height / 2)));
    paint();
    G.sound.song("kitchen");
    let pot = [], page = 0, angle = null, turned = 0, stir = 0, bubbles = [], swirl = 0, hit = 0;
    const portrait = () => v().height > v().width;
    const potAt = () => portrait() ? { x: v().width / 2, y: Math.round(v().height * 0.38) } : { x: Math.round(v().width * 0.28), y: Math.round(v().height * 0.52) };
    const avail = () => { const used = {}; for (const k of pot) used[k] = (used[k] ?? 0) + 1; return Object.keys(st.inv).filter((k) => S.itemKind(S.isBase(k)) !== "dish" || true).filter((k) => st.inv[k] - (used[k] ?? 0) > 0); };
    const hint = () => {
        const next = Object.entries(DISHES).find(([id, d]) => d.needs && !st.recipes.includes(id) && !d.secret && d.needs.some((n) => S.stock(st, n)));
        if (!next) return st.recipes.length ? "Gran's card: try two things that grow together." : "Gran's card: two things in a pot is cooking.";
        const [id, d] = next, have = d.needs.find((n) => S.stock(st, n));
        return `Gran's card: ${S.itemName(have)} wants a friend.`;
    };
    const drop = (k) => {
        if (pot.length >= 3) { G.sound.deny(); return; }
        pot.push(k); const c = potAt(), id = S.isBase(k);
        fx.fly(`item:${id}`, c.x + (pot.length - 2) * 60, c.y + 120, c.x, c.y - 44, { dur: 0.36, lift: 60, done: () => { G.sound.plop(); fx.spark(c.x, c.y - 44, { n: 10, col: "#ffb45a", a: -1.57, spread: 1.1, v0: 40, v1: 120, g: 260 }); hit = 1; } });
        rebuild();
    };
    const cookNow = () => {
        if (pot.length < 2) return;
        const r = S.cook(st, pot), c = potAt(); pot = []; turned = 0;
        if (!r) { rebuild(); return; }
        const D = DISHES[r.id], good = r.id !== "broth";
        G.sound.cooked(good); fx.spark(c.x, c.y - 40, { n: good ? 30 : 8, col: good ? "#ffe9a8" : "#a0a070", v0: 40, v1: 180, a: -1.57, spread: 1.4, size: 3 });
        s.flash(good ? "#ffe9a8" : "#8a8a70", 0.15); s.shake(1.5, 0.15, { haptic: false }); saveGame();
        const canEat = D.buff && st.inv[r.id];
        toastCard(stage, r.first ? "New recipe!" : "Cooked", `${D.name}. ${D.note}`, `item:${r.id}`, () => { rebuild(); });
        if (canEat) stage.btn({ x: stage.modal.list[1] ? v().width / 2 - 50 : 0, y: v().height / 2 + 86, w: 100, h: 38, label: "Eat it", kind: "green", name: "eat", onTap: () => { const b = S.eat(st, r.id); G.sound.heart(); stage.close(); fx.float(c.x, c.y - 80, { rain: "Rain's coming!", grow: "You feel things grow.", pollen: "Moths are watching." }[b], "#ffe9a8"); } });
    };
    const rebuild = () => {
        hud.clear();
        const vw = v(), w = vw.width, h = vw.height, safe = vw.safe, keys = avail();
        const need = Math.min(3, Math.ceil(keys.length / 6) || 1) * 60, area = portrait() ? { x: 8, y: h - safe.bottom - 62 - need, w: w - 16, h: need } : { x: Math.round(w * 0.52), y: safe.top + 50, w: Math.round(w * 0.46) - safe.right, h: Math.min(h - safe.bottom - safe.top - 112, Math.max(1, Math.ceil(keys.length / 6)) * 60) };
        const cols = Math.floor(area.w / 56), rows = Math.max(1, Math.floor(area.h / 60)), per = Math.max(1, cols * rows - 1), pages = Math.max(1, Math.ceil(keys.length / per)); page %= pages;
        hud.drawn({ layer: 40, draw(d) { panel(d, area.x - 4, area.y - 6, area.w + 8, area.h + 10, "night", { opacity: 0.9 }); if (!keys.length) say(d, "Nothing left to cook.", area.x + area.w / 2, area.y + 12, { align: "center", color: COLORS.paper }); } });
        keys.slice(page * per, (page + 1) * per).forEach((k, i) => {
            const id = S.isBase(k), x = area.x + (i % cols) * 56, y = area.y + Math.floor(i / cols) * 60;
            const used = pot.filter((q) => q === k).length;
            hud.button({ x, y, w: 52, h: 56, kind: S.isShining(k) ? "gold" : "plain", icon: `item:${id}`, sub: `x${st.inv[k] - used}`, name: `drop:${k}`, onTap: () => drop(k) });
        });
        if (pages > 1) hud.button({ x: area.x + (cols - 1) * 56, y: area.y + (rows - 1) * 60, w: 52, h: 56, label: ">", kind: "plain", name: "more", onTap: () => { page++; rebuild(); } });
        const by = h - safe.bottom - 50;
        hud.button({ x: 8 + safe.left, y: by, w: 110, h: 44, label: "Stall", icon: "stallnav", kind: "night", color: "#f4e8d0", name: "back", onTap: leave });
        hud.button({ x: 124 + safe.left, y: by, w: 110, h: 44, label: "Empty", kind: "plain", name: "empty", disabled: !pot.length, onTap: () => { pot = []; turned = 0; rebuild(); } });
        hud.button({ x: 240 + safe.left, y: by, w: Math.min(200, w - 248 - safe.left - safe.right), h: 44, label: "Stir", kind: "gold", name: "stir", disabled: pot.length < 2, onTap: cookNow });
        const lines = G.font.wrap(pot.length >= 2 ? "Stir round the pot with your finger." : hint(), portrait() ? w - 20 : w * 0.46);
        hud.drawn({ layer: 44, draw(d) { lines.forEach((l, j) => say(d, l, portrait() ? w / 2 : w * 0.26, safe.top + 12 + j * 20, { align: "center", color: "#fff8e4", outline: COLORS.ink })); } });
    };
    let left = false; const leave = () => { if (left) return; left = true; saveGame(); game.go("market", {}, { fade: 0.25 }); };
    stage.refresh = rebuild;
    s.on("resize", () => { paint(); rebuild(); });
    s.onUpdate((dt) => {
        G.sound.tick(); fx.update(dt); swirl += dt * (1 + stir * 6); stir = Math.max(0, stir - dt * 1.6); hit = Math.max(0, hit - dt * 3);
        if (s.time % 0.3 < dt) G.sound.bubble();
        if (game.fxRng.chance(0.3)) bubbles.push({ x: game.fxRng.range(-54, 54), t: 0, r: game.fxRng.range(2, 5) });
        for (const b of bubbles) b.t += dt; bubbles = bubbles.filter((b) => b.t < 0.7);
        const p = s.input.pointer, c = potAt();
        if (!stage.open && pot.length >= 2 && p.down && Math.hypot(p.x - c.x, p.y - (c.y - 20)) < 130) {
            const a = Math.atan2(p.y - c.y, p.x - c.x);
            if (angle !== null) { let da = a - angle; if (da > 3.14) da -= 6.283; if (da < -3.14) da += 6.283; turned += Math.abs(da); if (Math.abs(da) > 0.02) { stir = Math.min(1, stir + Math.abs(da) * 1.2); G.sound.stir(Math.min(1, turned / 9)); } }
            angle = a;
            if (turned > 9) { angle = null; cookNow(); }
        } else angle = null;
        if (!stage.open && s.input.pressed("confirm") && pot.length >= 2) cookNow();
        if (s.input.pressed("back") && !stage.open) leave();
    });
    s.onDraw((d) => {
        const w = v().width, h = v().height, bw = Math.ceil(w / 2), bh = Math.ceil(h / 2), t = s.time, c = potAt();
        d.sprite("bg", { crop: [0, 0, bw, bh], x: bw, y: bh, width: bw * 2, height: bh * 2 });
        d.additive(() => { glow(d, c.x, c.y + 70, 230, "#ff8a3a", 0.3 + Math.sin(t * 7) * 0.05); glow(d, c.x, c.y - 30, 150, "#ffcf7a", 0.22 + stir * 0.2); });
        // fire under the pot
        
        spr(d, "cauldron", c.x, c.y + hit * 4, {});
        for (let i = 0; i < 11; i++) { const x = Math.round((c.x - 70 + i * 14) / 2) * 2, k = Math.sin(t * 9 + i * 1.7) * 0.5 + 0.5, hh = Math.round((12 + k * 22 + (5 - Math.abs(i - 5)) * 5) / 2) * 2; d.rect(12, hh, { x, y: c.y + 90 - hh / 2, color: i % 2 ? "#ffb45a" : "#ff6a3a" }); d.rect(6, hh * 0.5, { x, y: c.y + 90 - hh * 0.25, color: "#fff0a8" }); }
        // the broth: its colour comes from what's in it
        const col = pot.length ? CROPS[S.isBase(pot[pot.length - 1])]?.glow ?? "#ffb45a" : "#ffb45a";
        d.rect(144, 22, { x: c.x, y: c.y - 53, radius: 11, color: col, opacity: 0.8 });
        d.additive(() => {
            glow(d, c.x, c.y - 52, 86, col, 0.5 + stir * 0.4);
            for (const b of bubbles) d.circle(b.r, { x: c.x + b.x, y: c.y - 54 - b.t * 22, color: "#fff", outline: 1, opacity: (1 - b.t / 0.7) * 0.6 });
            for (let i = 0; i < 6; i++) { const a = swirl + i * 1.05, x = c.x + Math.cos(a) * 58, y = c.y - 53 + Math.sin(a) * 8; d.rect(3, 3, { x, y, color: "#fff6c8", opacity: 0.5 + stir * 0.5 }); }
        });
        if (pot.length >= 2) { const p = s.input.pointer, a = (angle ?? t * 2); d.push(); d.translate(c.x + Math.cos(a) * 34, c.y - 86 + Math.sin(a) * 6); d.rotate(-1.3 + Math.cos(a) * 0.3); spr(d, "spoon", 0, 0, { s: 1.6 }); d.pop(); }
        pot.forEach((k, i) => spr(d, `item:${S.isBase(k)}`, c.x + (i - 1) * 40, c.y + 118));
        if (turned > 0) { const k = Math.min(1, turned / 9); panel(d, c.x - 60, c.y - 128, 120, 14, "dim"); d.rect(112 * k, 6, { x: c.x - 56 + 56 * k, y: c.y - 121, color: "#f4cf6a" }); }
        d.additive(() => fx.drawGlow(d));
        fx.drawSolid(d);
    });
    s.onDrawUI((d) => fx.drawTop(d));
    rebuild();
}
