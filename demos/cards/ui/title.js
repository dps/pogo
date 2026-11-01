// Title, witch select and the Grimoire. One tap from the logo gets you into a fight.
import { CARDS } from "../data/cards.js";
import { ELS, ELEMENTS, RANKS, REACTIONS, WITCHES } from "../data/rules.js";
import { BOSSES } from "../data/enemies.js";
import * as S from "../sim.js";
import { UNLOCKS, lockedTrinkets, nextUnlock, recipeName, tierOf } from "../meta.js";
import { Painter, rgb, fbm } from "../art/kit.js";
import M from "../art/motifs.js";
import { warm } from "../art/index.js";
import { ASPECT, drawCard } from "./cardview.js";
import { rnd, COLORS, FONT, Fx, G, clamp, fmt, hurryKeys, lerp, loadRun, route, saveRun, song, spellBtn, ui } from "./core.js";
import { deckView, installOverlays, settings, tip, zoom } from "./overlay.js";

export function paintTitle(game) {
    game.assets.paint("bg_title", 300, 480, (p) => {
        const k = new Painter(p), W = 300, H = 480, A = rgb("#0c0620"), B = rgb("#3a1a6a"), C = rgb("#ff7a4a");
        k.wash((u, v, x, y) => {
            const t = v, n = fbm(x * 0.015, y * 0.03, 3) - 0.5;
            const a = Math.min(1, t * 1.5 + n * 0.3), b = Math.max(0, (t - 0.55) * 2.3 + n * 0.3);
            return [A[0] + (B[0] - A[0]) * a + (C[0] - B[0]) * b * 0.8, A[1] + (B[1] - A[1]) * a + (C[1] - B[1]) * b * 0.8, A[2] + (B[2] - A[2]) * a + (C[2] - B[2]) * b * 0.8];
        });
        k.dots(110, 2, 0, 0, W, H * 0.6, 0.4, 1.5, "#fff0d8", 0.95);
        k.save().at(226, 90, 1.25); M.moon(k, { a: "#ffe9b8" }); k.restore();
        k.glow(226, 90, 120, "#ffc8a0", 0.3);
        for (const [x, y, r] of [[30, 300, 70], [120, 330, 60], [230, 310, 80], [290, 340, 60]]) k.fill(k.circle(x, y, r), { c: "#4a2a7a", hi: "#a060b0", inkW: 0, alpha: 0.45 });
        const tw = "#1a0f33";
        k.fill(k.polygon([[108, 420], [122, 168], [114, 168], [150, 44], [186, 168], [178, 168], [192, 420]]), { c: tw, hi: "#5a3a9a", lo: "#0c0620", inkW: 1.5, bevel: 16 });
        k.fill(k.polygon([[178, 250], [224, 240], [216, 240], [232, 196], [250, 240], [242, 240], [236, 420], [180, 420]]), { c: "#150c2c", hi: "#4a2f80", inkW: 1.5, bevel: 10 });
        k.fill(k.polygon([[120, 300], [84, 292], [92, 292], [76, 256], [60, 292], [68, 292], [76, 420], [120, 420]]), { c: "#150c2c", hi: "#4a2f80", inkW: 1.5, bevel: 10 });
        for (const [x, y] of [[150, 110], [140, 170], [160, 214], [146, 266], [158, 320], [232, 262], [74, 310]]) { k.fill(k.box(x, y, 8, 14, 3), { c: "#ffd27a", flat: true, inkW: 0 }); k.glow(x, y, 22, "#ffb347", 0.5); }
        k.fill(k.polygon([[0, 480], [0, 400], [70, 372], [150, 396], [230, 368], [300, 398], [300, 480]]), { c: "#0e0720", hi: "#3a2060", inkW: 0, bevel: 30 });
    }, { smooth: true });
}
const DEMO = ["emberheart", "philosopher", "ouroboros", "tsunami", "snowball"];
function logo(d, x, y, k = 1, t = 0) {
    const big = 54 * k, small = 22 * k;
    const line = (str, yy, size, c1, c2) => {
        for (const [ox, oy] of [[-2.5, 0], [2.5, 0], [0, -2.5], [0, 3.5], [-2, -2], [2, 2], [-2, 2], [2, -2]]) d.text(str, { x: x + ox * k, y: yy + oy * k, size, bold: true, font: FONT, color: "#120822" });
        d.text(str, { x, y: yy + 1.5 * k, size, bold: true, font: FONT, color: c2 });
        d.text(str, { x, y: yy, size, bold: true, font: FONT, color: c1 });
    };
    d.additive(() => d.sprite("glow", { x, y: y + 8, width: 340 * k, height: 180 * k, color: "#b45cff", opacity: 0.32 + Math.sin(t * 2) * 0.06 }));
    line("HEX", y - 34 * k, big, "#ffe9a8", "#d8701e");
    line("& CARDS", y + 24 * k, big * 0.8, "#ffe9a8", "#d8701e");
    d.text("a brewing roguelike", { x, y: y - 76 * k, size: 14 * k, font: FONT, color: "#e0c8ff", opacity: 0.9 });
}
export function titleScene(game) {
    game.scene("title", (s) => {
        G.run = null;
        const saved = loadRun(), fx = new Fx(), V = { t: 0, bub: [] };
        song("title");
        warm(DEMO);
        const start = () => {
            if (!G.meta.tutorial) { G.startTutorial(); return; }
            game.go("witch", {}, { fade: 0.2 });
        };
        const play = s.add([ui(), spellBtn(saved ? "New Climb" : "BREW!", { width: 190, height: 54, size: 22, color: "#c0401e", action: saved ? undefined : "confirm", onTap: start })]);
        const cont = saved ? s.add([ui(), spellBtn("Continue", { width: 190, height: 54, size: 21, color: "#3f8f4a", action: "confirm", onTap: () => { G.run = saved; route(); } })]) : null;
        const book = s.add([ui(), spellBtn("Grimoire", { width: 108, height: 46, size: 14, color: "#4a2a7a", onTap: () => game.go("grimoire", {}, { fade: 0.2 }) })]);
        const gear = s.add([ui(), spellBtn("Settings", { width: 108, height: 46, size: 14, color: "#4a2a7a", onTap: settings })]);
        s.onUpdate((dt) => {
            V.t += dt; fx.update(dt); hurryKeys();
            const W = s.view.width, H = s.view.height, bot = game.view.safe.bottom, land = W > H;
            if (land) {
                const x = W * 0.76, y = H * 0.5;
                if (cont) { cont.pos.set(x, y - 64); play.pos.set(x, y); } else play.pos.set(x, y - 30);
                book.pos.set(x - 56, y + 60); gear.pos.set(x + 56, y + 60);
            } else {
                const y = H - bot - 64;
                book.pos.set(W / 2 - 58, y + 28); gear.pos.set(W / 2 + 58, y + 28);
                if (cont) { cont.pos.set(W / 2, y - 92); play.pos.set(W / 2, y - 32); } else play.pos.set(W / 2, y - 36);
            }
            if (rnd() < dt * 22) { const cx = land ? W * 0.34 : W / 2; fx.spark(cx + (rnd() - 0.5) * 120, land ? H * 0.66 : H * 0.62, ["#7ef0c8", "#b45cff", "#ffe066"][Math.floor(rnd() * 3)], { a: -1.57 + (rnd() - 0.5) * 0.6, sp: 50 + rnd() * 90, g: -14, s: 3 + rnd() * 4, life: 1.6 }); }
        });
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height, land = W > H, k = Math.max(W / 300, H / 480) * 1.02;
            d.sprite("bg_title", { x: land ? W / 2 : W / 2, y: H / 2, width: 300 * k, height: 480 * k });
            // Cauldron and a fan of its best-known ingredients.
            const cx = land ? W * 0.32 : W / 2, sc = land ? Math.min(0.56, H / 560) : Math.min(W / 400, H / 860), py = land ? H * 0.6 : H * 0.62, cw = land ? 84 : 112 * sc * 1.25;
            DEMO.forEach((id, i) => {
                const off = i - 2, a = off * 0.3 + Math.sin(V.t * 0.7 + i) * 0.025, r = cw * 1.5;
                drawCard(d, { id, up: 0 }, { x: cx + Math.sin(a) * r * 1.15, y: py + 10 - Math.cos(a) * r - Math.abs(off) * -8 + Math.sin(V.t + i * 1.4) * 4, w: cw, rot: a, tx: Math.sin(V.t * 0.9 + i) * 0.5, ty: Math.cos(V.t * 0.7 + i) * 0.3, foil: 0.2, lift: 0.3 });
            });
            d.sprite("pot_back", { x: cx, y: py, width: 300 * sc, height: 110 * sc });
            d.push(); d.translate(cx, py + 2 * sc); d.scale(1, 0.27); d.circle(122 * sc, { color: "#1f8a7a" }); d.circle(112 * sc, { color: "#37d8ac" }); d.pop();
            d.additive(() => d.sprite("glow", { x: cx, y: py - 10, width: 480 * sc, height: 260 * sc, color: "#37d8ac", opacity: 0.45 }));
            for (let i = 0; i < 10; i++) { const q = (V.t * (0.5 + i * 0.07) + i * 0.37) % 1, x = cx + Math.sin(i * 2.4) * 96 * sc, y = py + Math.cos(i * 1.7) * 20 * sc, r = (3 + i % 4 * 2) * sc * (0.5 + q); d.sprite("bub", { x, y, width: r * 2, height: r * 2, color: "#b5fff0", opacity: q > 0.85 ? (1 - q) * 6 : 1 }); }
            d.additive(() => { for (let i = 0; i < 7; i++) d.sprite("glow", { x: cx + (i - 3) * 34 * sc, y: py + 170 * sc, width: 46 * sc, height: (56 + Math.sin(V.t * 9 + i * 2) * 14) * sc, color: i % 2 ? "#ff7a2f" : "#ffb347", opacity: 0.85 }); });
            d.sprite("logs", { x: cx, y: py + 192 * sc, width: 300 * sc, height: 84 * sc });
            d.sprite("pot_front", { x: cx, y: py + 87 * sc, width: 320 * sc, height: 210 * sc });
            d.sprite("witch_posy", { x: cx - 130 * sc, y: py + 118 * sc, width: 170 * sc, height: 216 * sc });
            fx.draw(d);
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, land = W > H;
            logo(d, land ? W * 0.76 : W / 2, land ? 78 + top : Math.max(88, H * 0.14) + top, land ? Math.min(0.86, H / 420) : Math.min(1, W / 340, H / 700), V.t);
            if (G.meta.runs) d.text(`${G.meta.stars} stars   ${G.meta.wins} wins`, { x: land ? W * 0.76 : W / 2, y: H - 14 - game.view.safe.bottom, size: 12, font: FONT, color: COLORS.dim });
        });
        installOverlays(s);
    });

    // ---- Witch select ----
    game.scene("witch", (s) => {
        const ids = Object.keys(WITCHES), meta = G.meta, V = { i: meta.lastWitch ? ids.indexOf(meta.lastWitch) : 0, x: 0, asc: 0, press: null, t: 0 };
        if (V.i < 0) V.i = 0;
        V.x = V.i;
        song("title");
        const maxAsc = () => meta.asc[ids[V.i]] ?? 0;
        V.asc = Math.min(maxAsc(), meta.lastAsc ?? 0);
        const go = s.add([ui(), spellBtn("Enter the Tower", { width: 210, height: 52, size: 18, color: "#c0401e", action: "confirm", onTap: () => { meta.lastWitch = ids[V.i]; meta.lastAsc = V.asc; G.startRun(ids[V.i], V.asc, game.data.nextSeed); } })]);
        const back = s.add([ui(), spellBtn("Back", { width: 72, height: 44, size: 13, color: "#4a2a7a", onTap: () => game.go("title", {}, { fade: 0.2 }) })]);
        const prev = s.add([ui(), spellBtn("‹", { width: 46, height: 60, size: 28, color: "#4a2a7a", onTap: () => change(-1) })]);
        const nextB = s.add([ui(), spellBtn("›", { width: 46, height: 60, size: 28, color: "#4a2a7a", onTap: () => change(1) })]);
        const down = s.add([ui(), spellBtn("-", { width: 46, height: 44, size: 20, color: "#4a2a7a", onTap: () => { V.asc = clamp(V.asc - 1, 0, maxAsc()); } })]);
        const up = s.add([ui(), spellBtn("+", { width: 46, height: 44, size: 20, color: "#4a2a7a", onTap: () => { if (V.asc >= maxAsc()) { tip("Locked", "Win a run at this rank to unlock the next one."); return; } V.asc++; } })]);
        function change(n) { V.i = (V.i + n + ids.length) % ids.length; V.asc = Math.min(V.asc, maxAsc()); G.snd.notch(V.i); warm(WITCHES[ids[V.i]].deck); }
        warm(WITCHES[ids[V.i]].deck);
        s.onUpdate((dt) => {
            V.t += dt; V.x += (V.i - V.x) * Math.min(1, dt * 12);
            const W = s.view.width, H = s.view.height, bot = game.view.safe.bottom, top = game.view.safe.top, land = W > H;
            go.pos.set(land ? W * 0.72 : W / 2, H - 42 - bot); back.pos.set(44, top + 26);
            prev.pos.set(30, land ? H * 0.5 : H * 0.34); nextB.pos.set(land ? W * 0.47 : W - 30, land ? H * 0.5 : H * 0.34);
            down.pos.set((land ? W * 0.72 : W / 2) - 90, H - 94 - bot); up.pos.set((land ? W * 0.72 : W / 2) + 90, H - 94 - bot);
            for (const k of hurryKeys()) { if (k === "ArrowLeft") change(-1); if (k === "ArrowRight") change(1); }
            const p = s.input.pointer;
            if (G.overlay) return;
            if (s.input.swipe === "left") change(1); if (s.input.swipe === "right") change(-1);
        });
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height, k = Math.max(W / 300, H / 480) * 1.02;
            d.sprite("bg_title", { x: W / 2, y: H / 2, width: 300 * k, height: 480 * k });
            d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: 0.5 });
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top, land = W > H, id = ids[V.i], w = WITCHES[id];
            d.text("Choose Your Witch", { x: W / 2, y: top + 26, size: 22, bold: true, font: FONT, color: COLORS.gold });
            const cx = land ? W * 0.26 : W / 2, cy = land ? H * 0.54 : H * 0.34, sc = land ? Math.min(1.1, H / 360) : Math.min(1.16, H / 640);
            ids.forEach((q, i) => {
                const off = i - V.x, wrap = off > 1.5 ? off - 3 : off < -1.5 ? off + 3 : off, x = cx + wrap * 160, a = 1 - Math.min(1, Math.abs(wrap) * 0.8), z = 1 - Math.min(0.5, Math.abs(wrap) * 0.3);
                if (a <= 0.05) return;
                d.additive(() => d.sprite("glow", { x, y: cy, width: 300 * sc * z, height: 320 * sc * z, color: WITCHES[q].color, opacity: 0.4 * a }));
                d.sprite(`witch_${q}`, { x, y: cy + Math.sin(V.t * 2 + i) * 3, width: 190 * sc * z, height: 242 * sc * z, opacity: a });
            });
            const tx = land ? W * 0.72 : W / 2, tw = land ? W * 0.5 : W - 36; let y = land ? top + 64 : cy + 134 * sc;
            d.text(w.name, { x: tx, y, size: 24, bold: true, font: FONT, color: "#fff6dc" }); y += 22;
            d.text(w.title, { x: tx, y, size: 14, font: FONT, color: w.color }); y += 24;
            d.text(`${w.power}. ${w.powerText}`, { x: tx, y: y + 20, size: 14, font: FONT, color: COLORS.cream, maxWidth: tw, align: "center" }); y += 62;
            if (H > 620 || land) d.text(`"${w.blurb}"`, { x: tx, y, size: 12, font: FONT, color: COLORS.dim, maxWidth: tw, align: "center" });
            const ry = H - 94 - game.view.safe.bottom;
            d.text(`Rank ${V.asc}`, { x: tx, y: ry - 8, size: 16, bold: true, font: FONT, color: V.asc ? "#ffb0a0" : COLORS.gold });
            d.text(RANKS[V.asc].text, { x: tx, y: ry + 8, size: 10, font: FONT, color: COLORS.dim, maxWidth: 126, align: "center" });
        });
        installOverlays(s);
    });

    // ---- Grimoire: Almanac of reactions, collection, records ----
    game.scene("grimoire", (s) => {
        const meta = G.meta, V = { tab: 0, scroll: 0, press: null };
        song("calm");
        const back = s.add([ui(), spellBtn("Back", { width: 72, height: 44, size: 13, color: "#4a2a7a", onTap: () => game.go("title", {}, { fade: 0.2 }) })]);
        const t1 = s.add([ui(), spellBtn("Reactions", { width: 104, height: 36, size: 13, color: "#7a3ad0", onTap: () => { V.tab = 0; V.scroll = 0; } })]);
        const t2 = s.add([ui(), spellBtn("Ingredients", { width: 104, height: 36, size: 13, color: "#4a2a7a", onTap: () => openCards() })]);
        const t3 = s.add([ui(), spellBtn("Records", { width: 90, height: 36, size: 13, color: "#4a2a7a", onTap: () => { V.tab = 1; } })]);
        const tier = tierOf(meta);
        const openCards = () => deckView("All ingredients", Object.values(CARDS).filter((c) => c.rar !== "curse" && (c.tier ?? 0) <= tier).map((c) => ({ id: c.id, up: 0 })));
        const seen = () => Object.keys(meta.reactions).length;
        let boxes = [];
        s.onUpdate((dt) => {
            const W = s.view.width, top = game.view.safe.top, p = s.input.pointer; hurryKeys();
            back.pos.set(44, top + 26); t1.pos.set(W / 2 - 58 + 30, top + 70); t2.pos.set(W / 2 + 54 + 30, top + 70); t3.pos.set(W / 2 - 168 + 30 < 50 ? 52 + 0 : W / 2 - 168 + 30, top + 70);
            if (W < 380) { t3.pos.set(W - 50, top + 26); t1.pos.set(W / 2 - 56, top + 70); t2.pos.set(W / 2 + 56, top + 70); }
            if (G.overlay) return;
            if (p.pressed) { const b = boxes.find((q) => Math.abs(p.x - q.x) < q.w / 2 && Math.abs(p.y - q.y) < q.h / 2); if (b) { const r = REACTIONS[b.key]; const [a, c] = b.key.split(">"); if (meta.reactions[b.key]) tip(r.name, r.text, { sub: `${ELEMENTS[a].name} then ${ELEMENTS[c].name}`, extra: `Brewed ${meta.reactions[b.key]} times` }); else tip("Undiscovered", `Try ${ELEMENTS[a].name} and then ${ELEMENTS[c].name} in the pot.`); } }
        });
        s.onDraw((d) => {
            const W = s.view.width, H = s.view.height, k = Math.max(W / 300, H / 420) * 1.03;
            d.sprite("bg_1", { x: W / 2, y: H / 2, width: 300 * k, height: 420 * k });
            d.rect(W + 4, H + 4, { x: W / 2, y: H / 2, color: "#120822", opacity: 0.72 });
        });
        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height, top = game.view.safe.top;
            d.text("The Grimoire", { x: W / 2, y: top + 26, size: 22, bold: true, font: FONT, color: COLORS.gold });
            boxes = [];
            if (V.tab === 0) {
                const total = Object.keys(REACTIONS).length, gridTop = top + 118, size = Math.min((W - 56) / 6, (H - gridTop - 50) / 6, 62), x0 = W / 2 - size * 3 + 12;
                d.text(`${seen()} of ${total} reactions brewed. First ingredient on the left, second on top.`, { x: W / 2, y: top + 98, size: 12, font: FONT, color: COLORS.dim, maxWidth: W - 24, align: "center" });
                ELS.forEach((el, i) => {
                    d.sprite(`glyph_${el}`, { x: x0 + i * size + size / 2, y: gridTop + 4, width: 22, height: 22 });
                    d.sprite(`glyph_${el}`, { x: x0 - 14, y: gridTop + 22 + i * size + size / 2, width: 22, height: 22 });
                });
                ELS.forEach((a, r) => ELS.forEach((b, c) => {
                    const key = `${a}>${b}`, x = x0 + c * size + size / 2, y = gridTop + 22 + r * size + size / 2, on = !!meta.reactions[key], R = REACTIONS[key];
                    d.rect(size - 3, size - 3, { x, y, color: on ? "#2f2150" : "#1a1030", radius: 7 });
                    if (on) { d.rect(size - 3, size - 3, { x, y, color: R.color, radius: 7, outline: 1.2 }); d.text(R.name, { x, y, size: Math.min(10, size / 5.4), bold: true, font: FONT, color: R.color, maxWidth: size - 6, align: "center" }); } else d.text("?", { x, y, size: 15, bold: true, font: FONT, color: "#4a3a62" });
                    boxes.push({ x, y, w: size, h: size, key });
                }));
            } else {
                let y = top + 118;
                const row = (a, b) => { d.text(a, { x: W / 2 - 80, y, size: 15, font: FONT, color: COLORS.cream }); d.text(`${b}`, { x: W / 2 + 90, y, size: 15, bold: true, font: FONT, color: COLORS.gold }); y += 26; };
                row("Stars", meta.stars); row("Runs", meta.runs); row("Wins", meta.wins); row("Biggest brew", fmt(meta.best.dmg)); row("Longest chain", meta.best.fires);
                if (meta.best.name) { d.text(`"${meta.best.name}"`, { x: W / 2, y, size: 16, bold: true, font: FONT, color: "#ffd9a0" }); y += 34; }
                const nx = nextUnlock(meta);
                y += 8;
                for (const [i, u] of UNLOCKS.entries()) { if (i === 0) continue; const on = meta.stars >= u.stars; d.text(`${on ? "Unlocked" : `${u.stars} stars`}: ${u.text}`, { x: W / 2, y, size: 12, font: FONT, color: on ? "#d9ffb0" : COLORS.dim, maxWidth: W - 30, align: "center" }); y += 36; }
            }
        });
        installOverlays(s);
    });
}
