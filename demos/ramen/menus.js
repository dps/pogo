// Everything outside a shift: title, the ledger between shifts, results, letters, the ending.
import { button, pin, pos, rect, tap, ui } from "./pogo.js";
import { BROTHS, DECOR, ENDING, KIT, LOCATIONS, NANA, PROLOGUE, RECIPES, REGULARS, SEASON_LABEL, SHIFTS, STAFF } from "./data.js";
import { buyDecor, buyKit, buyMove, buyRecipe, buyStaff, endlessOpen, greeting, kitCost, needsMove, recipeOpen, shiftIndex, staffOpen, starTotal, unlocked } from "./progress.js";
import { CREAM, FONT, GOLD, RED, SERIF, SOY, drawBowl, money } from "./stage.js";
import { MOOD, lookName } from "./people.js";
import { BGH, BGW, paintPlace } from "./places.js";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const PAPER = "#f7e9cc", PAPER2 = "#ecd9b4", INK = "#3a2015";

/** A lacquered button. */
export function chunky(label, o = {}) {
    const base = button(label, o), fill = o.color ?? RED, ink = o.textColor ?? CREAM, size = o.textSize ?? 18;
    return {
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = o.radius ?? 14, press = e._pressed ? 3 : 0;
            d.rect(w + 4, h + 7, { y: 3, color: "#160a06", radius: r + 2 });
            d.rect(w, h, { y: press, color: fill, radius: r });
            d.rect(w - 8, h * 0.42, { y: press - h * 0.2, color: "#ffffff", opacity: 0.13, radius: r - 4 });
            d.text(label, { y: press + (o.sub ? -8 : 0), size, bold: true, font: FONT, color: ink });
            if (o.sub) d.text(o.sub, { y: press + 12, size: 12, bold: true, font: FONT, color: ink, opacity: 0.85 });
        },
    };
}

/** Sound, vibration and thumb side. Returns the entities so a pause panel can remove them. */
export function settingsRow(s, R, anchor, off) {
    const out = [], g = s.game ?? R.game, game = R.stage?.game ?? g ?? globalThis.__pogo, W = 56;
    const icon = (dx, getter, flip, art) => {
        const e = s.add([pin(anchor, anchor === "center" ? [dx, off] : [off[0] + dx, off[1]]), rect(50, 50, { color: "#00000000" }), tap(() => { flip(); R.persist(); R.sound.ui(); }), { draw(d) {
            d.rect(44, 44, { color: "#160a06", radius: 13 }); d.rect(39, 39, { color: getter() ? "#7a4a2a" : "#4a3a36", radius: 11 });
            art(d, getter());
        } }]);
        out.push(e);
    };
    icon(-W, () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; R.save.muted = game.audio.muted; }, (d, on) => {
        d.poly([[-11, -4], [-5, -4], [2, -10], [2, 10], [-5, 4], [-11, 4]], { color: CREAM });
        if (on) { d.line([6, -6], [9, -9], { width: 2.4, color: CREAM }); d.line([7, 0], [12, 0], { width: 2.4, color: CREAM }); d.line([6, 6], [9, 9], { width: 2.4, color: CREAM }); }
        else { d.line([6, -5], [13, 5], { width: 2.6, color: "#ffb0a0" }); d.line([13, -5], [6, 5], { width: 2.6, color: "#ffb0a0" }); }
    });
    icon(0, () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; R.save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); }, (d, on) => {
        d.rect(13, 23, { color: CREAM, radius: 3 }); d.rect(8, 15, { y: -1, color: on ? "#7a4a2a" : "#4a3a36", radius: 1 });
        for (const sg of [-1, 1]) { d.line([sg * 10, -6], [sg * 13, -2], { width: 2.2, color: CREAM }); d.line([sg * 13, -2], [sg * 10, 2], { width: 2.2, color: CREAM }); d.line([sg * 10, 2], [sg * 13, 6], { width: 2.2, color: CREAM }); }
        if (!on) d.line([-15, -13], [15, 13], { width: 2.6, color: "#ffb0a0" });
    });
    icon(W, () => true, () => { R.save.hand = R.save.hand === "left" ? "right" : "left"; }, (d) => {
        d.text(R.save.hand === "left" ? "L" : "R", { y: -6, size: 16, bold: true, font: FONT, color: CREAM });
        d.text("thumb", { y: 10, size: 10, bold: true, font: FONT, color: CREAM });
    });
    return out;
}

function bgCover(d, name, W, H, dim = 0) {
    const sc = Math.max(W / BGW, H / BGH), bw = BGW * sc, bh = BGH * sc;
    d.sprite(name, { x: W / 2, y: H / 2, width: bw, height: bh });
    if (dim) d.rect(W, H, { x: W / 2, y: H / 2, color: "#1a0c08", opacity: dim });
}
const rise = (puffs, dt, x, y, rate, spread, g) => {
    if (g.fxRng.next() < dt * rate) puffs.push({ x: x + (g.fxRng.next() - 0.5) * spread, y, t: 0, s: 0.8 + g.fxRng.next() * 0.9, p: g.fxRng.next() * 6 });
    for (const p of puffs) { p.t += dt; p.y -= dt * 26; p.x += Math.sin(p.t * 1.8 + p.p) * dt * 11; }
    return puffs.filter((p) => p.t < 2.4);
};
const drawPuffs = (d, puffs) => d.additive(() => { for (const p of puffs) { const q = p.t / 2.4, s = 62 * p.s * (0.6 + q); d.sprite("steam", { x: p.x, y: p.y, width: s, height: s, rot: p.p + q, opacity: Math.sin(q * 3.14) * 0.24 }); } });

const recipeBowl = (id, glaze, t) => { const r = RECIPES[id]; return { glaze, broth: r.broth, level: 1, noodle: r.noodle, tops: Object.fromEntries(r.tops.map((x) => [x, true])), t }; };
const glazeOf = (R) => DECOR.glaze.items.findIndex((x) => x.id === R.save.equip.glaze);
const stars = (d, x, y, n, size = 18, gap = 19) => { for (let i = 0; i < 3; i++) d.sprite("star", { frame: i < n ? 1 : 0, x: x + (i - 1) * gap, y, width: size, height: size }); };
const portrait = (d, look, x, y, h, mood = MOOD.calm) => d.sprite(lookName(look), { frame: mood, x, y, width: h * 200 / 220, height: h });

export function installMenus(game, R) {
    const reach = () => shiftIndex(R.save);

    const begin = (i) => { R.sound.ui(); game.go("play", { shift: i }, { fade: 0.25 }); };

    // --- Title ----------------------------------------------------------------------------------------------------
    game.scene("title", (s) => {
        game.touch.enabled = false; game.data.scene = "title";
        const bg = paintPlace(game.assets, "cart");
        let t = 0, puffs = [];
        const go = () => {
            R.sound.ui(); R.song(R.save.day === 0 ? "cart" : "menu");
            if (R.save.day === 0) game.go("play", { shift: 0 }, { fade: 0.25 }); else game.go("ledger", {}, { fade: 0.25 });
        };
        const land = () => game.view.width > game.view.height * 1.05;
        s.onUpdate((dt) => { t += dt; const v = game.view; puffs = rise(puffs, dt, land() ? v.width * 0.27 : v.width / 2, bowlY() - 10, 9, 110, game); });
        const bowlY = () => (land() ? game.view.height * 0.62 : game.view.height * 0.655);
        s.onDraw((d) => {
            const v = game.view, W = v.width, H = v.height, L = land();
            d.reset();
            bgCover(d, bg, W, H * (L ? 1 : 0.72), 0);
            d.push(); d.translate(0, 0);
            const top = H * (L ? 0.74 : 0.56);
            const c = { w: Math.max(W, 720), h: H - top };
            const wh = Math.max(c.h, Math.max(c.w, c.h * 2) * 0.51);
            d.sprite("wood", { x: W / 2, y: top + wh / 2, width: Math.max(c.w, c.h * 2), height: wh });
            d.rect(W, 6, { x: W / 2, y: top - 1, color: "#f0b878" });
            d.rect(W, 9, { x: W / 2, y: top + 6, color: "#1a0c08", opacity: 0.45 });
            d.pop();
            d.sprite("noren", { x: W / 2, y: 30 + v.safe.top / 2, width: W, height: 62 + v.safe.top, color: "#a92d27" });
            const bx = L ? W * 0.27 : W / 2, r = L ? 78 : Math.min(104, W * 0.29);
            d.additive(() => d.sprite("glow", { x: bx, y: bowlY(), width: r * 4, height: r * 3.4, color: "#ffb757", opacity: 0.32 }));
            drawBowl(d, bx, bowlY(), r, { ...recipeBowl("lastpage", glazeOf(R), t) });
            drawPuffs(d, puffs);
            const lw = L ? Math.min(W * 0.38, 270) : Math.min(W * 0.92, 360), lh = lw * 0.5, ly = (L ? H * 0.3 : Math.max(v.safe.top + 76, H * 0.09) + lh * 0.5);
            const lx = L ? W * 0.68 : W / 2, drop = clamp(t / 0.5), bo = 1 - (1 - drop) ** 3;
            d.sprite("logo", { x: lx + 3, y: ly - 300 * (1 - bo) + 5, width: lw, height: lh, color: "#000000", opacity: 0.35 });
            d.sprite("logo", { x: lx, y: ly - 300 * (1 - bo) + Math.sin(t * 1.5) * 2, width: lw, height: lh });
            const tag = R.save.day ? `Day ${R.save.day + 1}  ·  ${money(R.save.cash)}` : "A noodle empire, one bowl at a time", ty = ly + lh * 0.55;
            d.rect(tag.length * 8.2, 24, { x: lx, y: ty, color: SOY, radius: 12, opacity: 0.72 });
            d.text(tag, { x: lx, y: ty, size: 14.5, bold: true, font: SERIF, color: CREAM });
        });
        const sw = land();
        s.add([pin("bottom", [sw ? game.view.width * 0.18 : 0, sw ? 62 : 84]), chunky(R.save.day ? "Open Shop" : "Start Cooking", { width: 230, height: 66, textSize: 25, action: "confirm", onTap: go })]);
        settingsRow(s, R, "bottom", [sw ? game.view.width * 0.18 : 0, sw ? 6 : 18]);
        s.on("resize", () => game.go("title"));
    });

    // --- Ledger -------------------------------------------------------------------------------------------------------
    const TABS = [["shop", "Today"], ["book", "Cookbook"], ["kit", "Kitchen"], ["decor", "Decor"], ["regs", "Regulars"], ["map", "Shifts"]];

    game.scene("ledger", (s, args = {}) => {
        game.touch.enabled = false; game.data.scene = "ledger";
        const tab = args.tab ?? "shop", S = R.save, day = reach(), loc = LOCATIONS[SHIFTS[day].loc];
        game.data.tab = tab;
        R.song("menu");
        const v = game.view, W = v.width, H = v.height, land = W > H * 1.05, safe = v.safe;
        const bg = paintPlace(game.assets, loc.id);
        const re = (o = {}) => game.go("ledger", { ...args, ...o });
        let t = 0, flash = 0;
        s.onUpdate((dt) => { t += dt; flash = Math.max(0, flash - dt * 2); });
        const body = { x: safe.left + 8, y: safe.top + 50, w: W - safe.left - safe.right - 16, h: H - safe.top - safe.bottom - 50 - (land ? 58 : 66) - 2 };
        if (land) { body.x += 92; body.w -= 92; body.h += 58; }
        const cx = body.x + body.w / 2;
        const add = (x, y, comp) => s.add([ui(), pos(x, y), comp]);
        const buy = (ok) => { if (ok) { R.sound.buy(); R.persist(); game.data.bought = (game.data.bought ?? 0) + 1; re(); } else { R.sound.nope(); flash = 1; } };
        const cards = [];        // Custom-drawn content; run after the panel.

        // Tabs: along the bottom on phones, down the left in landscape. All within thumb reach.
        TABS.forEach(([id, name], i) => {
            const w = land ? 88 : (W - safe.left - safe.right - 8) / TABS.length, h = land ? (H - safe.top - safe.bottom - 54) / TABS.length : 54;
            const x = land ? safe.left + 48 : safe.left + 4 + w * (i + 0.5), y = land ? safe.top + 52 + h * (i + 0.5) : H - safe.bottom - 32;
            add(x, y, chunky(name, { width: w - 4, height: h - 6, textSize: Math.min(13, w * 0.17), radius: 9, color: tab === id ? "#b8332a" : "#5a3524", onTap: () => { R.sound.ui(); re({ tab: id, page: 0, pick: null }); } }));
        });

        if (tab === "shop") shopTab();
        if (tab === "kit") kitTab();
        if (tab === "decor") decorTab();
        if (tab === "regs") regsTab();
        if (tab === "map") mapTab();
        if (tab === "book") bookTab();

        function shopTab() {
            const sh = SHIFTS[day], [who, line] = sh.say ?? [null, ""], move = needsMove(S), done = S.finished && S.day >= SHIFTS.length;
            const btnY = body.y + body.h - 40;
            const reg = REGULARS[who];
            cards.push((d) => {
                const y0 = body.y, h = body.h - 92;
                d.rect(body.w, h, { x: cx, y: y0 + h / 2, color: PAPER, radius: 12 });
                d.rect(body.w - 10, h - 10, { x: cx, y: y0 + h / 2, color: PAPER2, radius: 9, outline: 1 });
                if (move) {
                    const k = clamp(S.cash / move.cost);
                    d.text("Moving on", { x: cx, y: y0 + 22, size: 13, bold: true, font: FONT, color: RED });
                    d.text(move.name, { x: cx, y: y0 + 46, size: 26, bold: true, font: SERIF, color: INK });
                    d.sprite(paintPlace(game.assets, move.id), { x: cx, y: y0 + h * 0.5, width: Math.min(body.w - 28, (h - 150) * 2.4), height: Math.min((body.w - 28) / 2.4, h - 150) });
                    d.text(move.blurb, { x: cx, y: y0 + h - 56, size: 13.5, font: SERIF, color: INK, maxWidth: body.w - 34 });
                    d.rect(body.w - 50, 12, { x: cx, y: y0 + h - 20, color: "#b9a077", radius: 6 });
                    d.rect((body.w - 54) * k, 8, { x: cx - (body.w - 54) / 2 * (1 - k), y: y0 + h - 20, color: k >= 1 ? "#3f7a4e" : "#d59a2c", radius: 4 });
                } else {
                    d.text(`Day ${day + 1}  ·  ${loc.name}`, { x: cx, y: y0 + 22, size: 13, bold: true, font: FONT, color: RED });
                    d.text(done ? "The Hall is yours" : sh.title, { x: cx, y: y0 + 47, size: 25, bold: true, font: SERIF, color: INK, maxWidth: body.w - 20 });
                    d.text(loc.rule, { x: cx, y: y0 + 74, size: 13, bold: true, font: FONT, color: "#7a4a2a" });
                    const pic = h - 214;
                    if (pic > 50) {
                        const pw = body.w - 30, ch = Math.min(600, 1440 * pic / pw);
                        d.sprite(bg, { x: cx, y: y0 + 92 + pic / 2, width: pw, height: pic, crop: [240, 600 - ch, 960, Math.min(ch, 960 * pic / pw)] });
                    }
                    if (reg) {
                        const ph = Math.min(120, h * 0.4), py = y0 + h - 58;
                        portrait(d, reg.look, body.x + 56, y0 + h - ph / 2 - 6, ph, MOOD.calm);
                        d.text(reg.name, { x: cx + 44, y: y0 + h - 104, size: 13, bold: true, font: FONT, color: RED });
                        d.text(line, { x: cx + 44, y: py - 3, size: 13.5, font: SERIF, color: INK, maxWidth: body.w - 124, lineHeight: 1.18 });
                    } else d.text(PROLOGUE, { x: cx, y: y0 + h * 0.62, size: 14, font: SERIF, color: INK, maxWidth: body.w - 30 });
                    if (S.fails[day] >= 2) d.text("Nana left a note: take it slow, they'll wait longer today.", { x: cx, y: y0 + 96, size: 12, bold: true, font: SERIF, color: "#3f7a4e", maxWidth: body.w - 20 });
                }
            });
            if (move) add(cx, btnY, chunky(S.cash >= move.cost ? `Move in  ${money(move.cost)}` : `Need ${money(move.cost - S.cash)} more`, { width: body.w - 16, height: 66, textSize: 22, color: S.cash >= move.cost ? "#3f7a4e" : "#6e5a4a", action: "confirm", sub: S.cash >= move.cost ? null : endlessOpen(S) ? "Replay a shift or run Endless to earn it" : "Replay a shift to earn it", onTap: () => { if (buyMove(S)) { R.sound.perfect(); R.persist(); re(); } else { R.sound.nope(); re({ tab: "map" }); } } }));
            else {
                if (endlessOpen(S)) {
                    add(cx + body.w * 0.33 - 4, btnY, chunky("Endless", { width: body.w * 0.31, height: 66, textSize: 17, color: "#2f3f73", sub: S.endless.bowls ? `Best ${S.endless.bowls}` : null, onTap: () => { R.sound.ui(); game.go("play", { endless: true }, { fade: 0.25 }); } }));
                    add(cx - body.w * 0.17, btnY, chunky("Open Shop", { width: body.w * 0.64, height: 66, textSize: 23, action: "confirm", sub: done ? "Replay the final night" : null, onTap: () => begin(day) }));
                } else add(cx, btnY, chunky("Open Shop", { width: body.w - 16, height: 66, textSize: 25, action: "confirm", onTap: () => begin(day) }));
            }
        }

        function kitTab() {
            const rows = [...Object.keys(KIT).map((id) => ({ kind: "kit", id })), ...Object.keys(STAFF).map((id) => ({ kind: "staff", id }))];
            const per = Math.max(3, Math.floor(body.h / (land ? 58 : 66))), page = args.page ?? 0, pages = Math.ceil(rows.length / per), rh = (body.h - (pages > 1 ? 56 : 0)) / per;
            rows.slice(page * per, (page + 1) * per).forEach((r, i) => {
                const y = body.y + rh * (i + 0.5);
                if (r.kind === "kit") {
                    const k = KIT[r.id], c = kitCost(S, r.id), lvl = S.kit[r.id] ?? 0;
                    cards.push((d) => { rowCard(d, y, rh - 5); d.sprite("kit", { frame: k.icon, x: body.x + 32, y, width: 44, height: 41 }); d.text(`${k.name}${k.max > 1 ? `  ${lvl}/${k.max}` : ""}`, { x: cx - 20, y: y - 10, size: 15, bold: true, font: FONT, color: INK }); d.text(k.desc, { x: cx - 20, y: y + 11, size: 12, font: SERIF, color: "#6a4630", maxWidth: body.w - 190 }); });
                    if (c !== null) add(body.x + body.w - 50, y, chunky(money(c), { width: 92, height: Math.min(44, rh - 16), textSize: 14, color: S.cash >= c ? "#3f7a4e" : "#6e5a4a", onTap: () => buy(buyKit(S, r.id)) }));
                    else cards.push((d) => d.text("Fitted", { x: body.x + body.w - 50, y, size: 14, bold: true, font: FONT, color: "#3f7a4e" }));
                } else {
                    const t = STAFF[r.id], has = S.staff[r.id], open = staffOpen(S, r.id);
                    cards.push((d) => { rowCard(d, y, rh - 5); portrait(d, t.look, body.x + 32, y, Math.min(rh - 12, 54), open ? MOOD.happy : MOOD.calm); d.text(open ? `${t.name}, ${t.role}` : "Someone new", { x: cx - 20, y: y - 10, size: 15, bold: true, font: FONT, color: INK }); d.text(open ? t.desc : `Looking for work from day ${t.unlock + 1}`, { x: cx - 20, y: y + 11, size: 12, font: SERIF, color: "#6a4630", maxWidth: body.w - 190 }); });
                    if (has) cards.push((d) => d.text("Hired", { x: body.x + body.w - 50, y, size: 14, bold: true, font: FONT, color: "#3f7a4e" }));
                    else if (open) add(body.x + body.w - 50, y, chunky(money(t.cost), { width: 92, height: Math.min(44, rh - 16), textSize: 14, color: S.cash >= t.cost ? "#3f7a4e" : "#6e5a4a", onTap: () => buy(buyStaff(S, r.id)) }));
                }
            });
            pager(pages, page);
        }

        function rowCard(d, y, h) { d.rect(body.w, h, { x: cx, y, color: PAPER, radius: 10 }); }
        function pager(pages, page) {
            if (pages <= 1) return;
            const y = body.y + body.h - 26;
            add(cx - 70, y, chunky("Back", { width: 84, height: 50, textSize: 14, color: page > 0 ? "#5a3524" : "#3a2a24", onTap: () => { if (page > 0) re({ page: page - 1 }); } }));
            add(cx + 70, y, chunky("Next", { width: 84, height: 50, textSize: 14, color: page < pages - 1 ? "#5a3524" : "#3a2a24", onTap: () => { if (page < pages - 1) re({ page: page + 1 }); } }));
            cards.push((d) => d.text(`${page + 1} / ${pages}`, { x: cx, y, size: 13, bold: true, font: FONT, color: CREAM }));
        }

        function decorTab() {
            const slots = Object.keys(DECOR), rh = body.h / slots.length;
            slots.forEach((slot, i) => {
                const D = DECOR[slot], y = body.y + rh * (i + 0.5), n = D.items.length, sw = Math.min(58, (body.w - 16) / n - 4);
                cards.push((d) => { rowCard(d, y, rh - 5); d.text(D.label, { x: cx, y: y - rh / 2 + 14, size: 13, bold: true, font: FONT, color: RED }); });
                D.items.forEach((it, j) => {
                    const x = cx + (j - (n - 1) / 2) * (sw + 4), yy = y + 6, has = S.decor[slot][it.id], on = S.equip[slot] === it.id;
                    add(x, yy, { ...rect(sw, Math.min(rh - 26, 56), { color: "#00000000" }), ...tap(() => { if (has) { S.equip[slot] = it.id; R.sound.ui(); R.persist(); re(); } else buy(buyDecor(S, slot, it.id)); }), id: "swatch" });
                    cards.push((d) => {
                        const h = Math.min(rh - 26, 56);
                        d.rect(sw, h, { x, y: yy, color: on ? "#3f7a4e" : "#c9b08a", radius: 8 });
                        d.rect(sw - 5, h - 5, { x, y: yy, color: "#fff6e2", radius: 6 });
                        const q = h - 24;
                        if (slot === "noren") d.rect(sw - 14, q, { x, y: yy - 7, color: it.a, radius: 3 });
                        if (slot === "lantern") d.sprite("lantern", { x, y: yy - 7, width: q * 0.68, height: q, color: it.c });
                        if (slot === "glaze") d.sprite("bowl", { frame: j, x, y: yy - 7, width: q * 1.15, height: q });
                        if (slot === "charm") { if (j) d.sprite("charm", { frame: j, x, y: yy - 7, width: q, height: q }); else d.text("none", { x, y: yy - 7, size: 11, font: FONT, color: INK }); }
                        d.text(has ? (on ? "On" : "Own") : money(it.cost), { x, y: yy + h / 2 - 9, size: 10.5, bold: true, font: FONT, color: has ? "#3f7a4e" : S.cash >= it.cost ? INK : "#a04a3a" });
                    });
                });
            });
        }

        function regsTab() {
            const ids = Object.keys(REGULARS), per = land ? 4 : 4, page = args.page ?? 0, pages = Math.ceil(ids.length / per), rh = (body.h - 56) / per;
            ids.slice(page * per, (page + 1) * per).forEach((id, i) => {
                const r = REGULARS[id], e = S.regs[id], y = body.y + rh * (i + 0.5);
                cards.push((d) => {
                    rowCard(d, y, rh - 5);
                    if (!e) { portrait(d, r.look, body.x + 38, y, Math.min(rh - 12, 62), MOOD.calm); d.text("Not met yet", { x: cx + 24, y, size: 14, bold: true, font: FONT, color: "#7a6450" }); return; }
                    portrait(d, r.look, body.x + 38, y, Math.min(rh - 12, 62), e.last === 3 ? MOOD.happy : e.last ? MOOD.calm : MOOD.cross);
                    d.text(r.name, { x: cx + 24, y: y - rh * 0.3, size: 15, bold: true, font: FONT, color: INK });
                    d.text(greeting(S, id, 0), { x: cx + 24, y: y + 8, size: 12.5, font: SERIF, color: "#5a3a26", maxWidth: body.w - 88, lineHeight: 1.14 });
                    d.text(`${e.visits} visits  ·  ${e.perfects} perfect`, { x: cx + 24, y: y + rh * 0.36, size: 10.5, bold: true, font: FONT, color: RED });
                });
            });
            pager(pages, page);
        }

        function mapTab() {
            const cols = 8, rows = LOCATIONS.length, cw = body.w / cols, rh = body.h / rows;
            LOCATIONS.forEach((L, li) => {
                const y = body.y + rh * (li + 0.5), name = paintPlace(game.assets, L.id);
                cards.push((d) => {
                    d.sprite(name, { x: cx, y, width: body.w, height: rh - 5, crop: [120, 0, 480, Math.min(300, 480 * (rh - 5) / body.w)], opacity: S.locs[L.id] ? 1 : 0.32 });
                    d.rect(body.w, rh - 5, { x: cx, y, color: "#1a0c08", opacity: 0.5 });
                    d.text(L.name, { x: cx, y: y - rh * 0.33, size: 13, bold: true, font: FONT, color: CREAM });
                });
                SHIFTS.forEach((sh, i) => {
                    if (sh.loc !== li) return;
                    const n = i % 8, row = land ? 0 : Math.floor(n / 4), c = land ? n : n % 4, pc = land ? cols : 4, x = body.x + (body.w / pc) * (c + 0.5), yy = y + (land ? 8 : (row - 0.5) * (rh * 0.33) + 10), ok = unlocked(S, i), w = body.w / pc - 5, h = land ? rh * 0.54 : rh * 0.3;
                    if (ok) add(x, yy, { ...rect(w, h, { color: "#00000000" }), ...tap(() => begin(i)), id: "node" });
                    cards.push((d) => {
                        d.rect(w, h, { x, y: yy, color: ok ? (i === day ? "#b8332a" : "#5a3524") : "#2a1a14", radius: 7, opacity: 0.94 });
                        d.text(i + 1, { x, y: yy - h * 0.2 + 1, size: 12, bold: true, font: FONT, color: ok ? CREAM : "#7a6a5a" });
                        if (S.stars[i]) stars(d, x, yy + h * 0.24, S.stars[i], 11, 11);
                    });
                });
            });
        }

        function bookTab() {
            const seasons = ["spring", "summer", "autumn", "winter"], page = args.page ?? 0, season = seasons[page], ids = Object.keys(RECIPES).filter((id) => RECIPES[id].season === season), pick = args.pick;
            const y0 = body.y + 8, count = Object.values(S.book).filter((b) => b.perfect).length, total = Object.keys(RECIPES).length;
            const cols = 3, gridH = body.h - 54 - 48 - 74, nrows = Math.ceil(ids.length / cols), rh = gridH / nrows, cw = body.w / cols;
            const known = (id) => !!S.book[id] || !!S.recipes[id];
            cards.push((d) => {
                d.rect(body.w, body.h - 54, { x: cx, y: body.y + (body.h - 54) / 2, color: PAPER, radius: 12 });
                d.text(`${SEASON_LABEL[season]} pages`, { x: cx, y: y0 + 12, size: 19, bold: true, font: SERIF, color: INK });
                d.text(`${count} of ${total} recipes stamped perfect`, { x: cx, y: y0 + 34, size: 12, bold: true, font: FONT, color: RED });
            });
            ids.forEach((id, i) => {
                const r = RECIPES[id], x = body.x + cw * (i % cols + 0.5), y = y0 + 48 + rh * (Math.floor(i / cols) + 0.5), ok = known(id), e = S.book[id];
                add(x, y, { ...rect(cw - 6, rh - 6, { color: "#00000000" }), ...tap(() => { R.sound.ui(); re({ pick: id }); }), id: "page" });
                cards.push((d) => {
                    const br = Math.min(cw * 0.37, rh * 0.36);
                    if (id === pick) d.rect(cw - 4, rh - 4, { x, y, color: "#f4c76a", radius: 10 });
                    if (ok) drawBowl(d, x, y - rh * 0.1, br, recipeBowl(id, glazeOf(R), t));
                    else { d.sprite("bowl", { frame: 0, x, y: y - rh * 0.06, width: br * 2.1, height: br * 1.8, color: "#6a5040", opacity: 0.5 }); }
                    d.text(ok ? r.name : "Lost page", { x, y: y + rh * 0.37, size: 11.5, bold: true, font: FONT, color: ok ? INK : "#9a8468", maxWidth: cw - 6 });
                    if (e?.perfect) d.sprite("star", { frame: 1, x: x + br * 0.92, y: y - rh * 0.1 - br * 0.6, width: 20, height: 20 });
                });
            });
            const y = body.y + body.h - 88, p = pick && RECIPES[pick];
            if (p) {
                const ok = known(pick), canBuy = !S.recipes[pick] && recipeOpen(S, pick), e = S.book[pick];
                cards.push((d) => {
                    d.text(ok ? p.note : "Someone in town has this page. Keep feeding them.", { x: canBuy ? cx - 50 : cx, y: y + 6, size: 12.5, font: SERIF, color: INK, maxWidth: body.w - (canBuy ? 124 : 24), lineHeight: 1.14 });
                    if (ok) d.text(`${BROTHS[p.broth].name}  ·  ${money(p.price)}  ·  served ${e?.served ?? 0}, perfect ${e?.perfect ?? 0}`, { x: cx, y: y - 14, size: 11, bold: true, font: FONT, color: RED });
                });
                if (canBuy) add(body.x + body.w - 54, y + 4, chunky(money(p.cost), { width: 94, height: 42, textSize: 14, color: S.cash >= p.cost ? "#3f7a4e" : "#6e5a4a", onTap: () => buy(buyRecipe(S, pick)) }));
            } else cards.push((d) => d.text("Tap a page", { x: cx, y: y + 2, size: 13, font: SERIF, color: "#7a6450" }));
            pagerSeason(page);
        }
        function pagerSeason(page) {
            const y = body.y + body.h - 26, n = 4, seasons = ["Spring", "Summer", "Autumn", "Winter"], w = (body.w - 8) / n;
            seasons.forEach((nm, i) => add(body.x + 4 + w * (i + 0.5), y, chunky(nm, { width: w - 4, height: 50, textSize: 12.5, radius: 9, color: i === page ? "#b8332a" : "#5a3524", onTap: () => { R.sound.ui(); re({ page: i, pick: null }); } })));
        }

        s.onDraw((d) => {
            d.reset();
            bgCover(d, bg, W, H, 0.58);
            for (const c of cards) c(d);
        });
        s.onDrawUI((d) => {
            d.reset();
            d.rect(W, safe.top + 46, { x: W / 2, y: (safe.top + 46) / 2, color: SOY, opacity: 0.94 });
            d.sprite("coin", { x: safe.left + 22, y: safe.top + 23, width: 22, height: 22 });
            d.text(money(S.cash), { x: safe.left + 84, y: safe.top + 23, size: 18, bold: true, font: FONT, color: flash > 0 ? "#ff9a7a" : GOLD });
            d.sprite("star", { frame: 1, x: W - safe.right - 74, y: safe.top + 22, width: 24, height: 24 });
            d.text(`${starTotal(S)} / ${SHIFTS.length * 3}`, { x: W - safe.right - 38, y: safe.top + 23, size: 15, bold: true, font: FONT, color: CREAM });
        });
        s.on("resize", () => re());
    });

    // --- Results ------------------------------------------------------------------------------------------------------
    game.scene("results", (s, a) => {
        game.touch.enabled = false; game.data.scene = "results"; game.data.stars = a.stars;
        const fail = !a.endless && a.stars < 1, v = game.view, W = v.width, H = v.height, land = W > H * 1.05;
        const sh = a.endless ? null : SHIFTS[a.i], loc = a.endless ? LOCATIONS[0] : LOCATIONS[sh.loc], bg = paintPlace(game.assets, loc.id);
        R.song("menu");
        let t = 0, puffs = [], rung = 0, count = 0;
        const bowlX = land ? W * 0.27 : W / 2, bowlY = land ? H * 0.32 : H * 0.28, r = land ? 62 : Math.min(84, H * 0.115);
        s.onUpdate((dt) => {
            t += dt;
            puffs = rise(puffs, dt, bowlX, bowlY - 8, 7, 90, game);
            count = Math.min(a.cash, count + a.cash * dt * 1.2);
            while (!a.endless && rung < a.stars && t > 0.35 + rung * 0.34) { R.sound.star(rung); rung++; s.shake(1 + rung * 0.5, 0.1, { haptic: false }); s.burst({ at: [starsX(rung - 1), starsY], count: 14, color: [GOLD, "#fff"], speed: [60, 190], life: [0.3, 0.6], size: [2, 4] }); }
        });
        const px = land ? W * 0.72 : W / 2, starsY = land ? H * 0.14 : H * 0.46, starsX = (i) => px + (i - 1) * 58;
        const lines = [];
        if (a.endless) lines.push(`${a.served} bowls before closing`);
        else if (fail) lines.push(`${a.walked ? `${a.walked} went home hungry. ` : ""}They'll be back tomorrow.`, "You keep every coin. Try it again?");
        else if (a.stars === 3) lines.push(a.perfects === a.total ? "Every single bowl perfect." : "They'll be talking about this one.");
        else if (a.stars === 2) lines.push("A good night. A very good night."); else lines.push("Everyone fed. That's what matters.");
        s.onDraw((d) => {
            d.reset();
            bgCover(d, bg, W, H, 0.62);
            const hw = Math.min(W - 24, 340);
            if (a.best) {
                d.additive(() => d.sprite("glow", { x: bowlX, y: bowlY, width: r * 4.4, height: r * 4, color: "#ffb757", opacity: 0.32 + (a.stars === 3 ? 0.2 : 0) }));
                drawBowl(d, bowlX, bowlY, r * (1 + Math.max(0, 0.08 - t * 0.2)), recipeBowl(a.best, glazeOf(R), t));
                drawPuffs(d, puffs);
            } else { d.sprite("bowl", { frame: glazeOf(R), x: bowlX, y: bowlY, width: r * 2.2, height: r * 1.9 }); }
            if (!a.endless) for (let i = 0; i < 3; i++) {
                const on = rung > i, q = on ? clamp((t - 0.35 - i * 0.34) / 0.22) : 1, sz = 56 * (on ? 1 + (1 - q) * 0.9 : 0.9);
                d.sprite("star", { frame: on ? 1 : 0, x: starsX(i), y: starsY, width: sz, height: sz });
            }
            let y = starsY + (a.endless ? 0 : 44);
            d.text(a.endless ? "Closing Time" : sh.title, { x: px, y, size: 24, bold: true, font: SERIF, color: CREAM, maxWidth: hw }); y += 26;
            for (const l of lines) { d.text(l, { x: px, y, size: 14, font: SERIF, color: "#f2dcb4", maxWidth: hw }); y += 19; }
            d.sprite("coin", { x: px - 50, y: y + 12, width: 24, height: 24 });
            d.text(`+${money(count)}`, { x: px + 14, y: y + 12, size: 24, bold: true, font: FONT, color: GOLD }); y += 32;
            d.text(`${a.served} served  ·  ${a.perfects} perfect${a.combo > 1 ? `  ·  best run ${a.combo}` : ""}`, { x: px, y: y + 6, size: 12.5, bold: true, font: FONT, color: CREAM }); y += 24;
            if (a.hat) { d.text(`The regulars passed the hat: +${money(a.hat)}`, { x: px, y: y + 4, size: 13, bold: true, font: SERIF, color: "#ffd9a0", maxWidth: hw }); y += 18; }
            for (const g of a.gifts) { d.text(`${REGULARS[g.who].name} gave you a page: ${RECIPES[g.recipe].name}`, { x: px, y: y + 4, size: 13, bold: true, font: SERIF, color: "#ffd9a0", maxWidth: hw }); y += 18; }
            for (const id of a.stamped.slice(0, 2)) { d.text(`Stamped perfect: ${RECIPES[id].name}`, { x: px, y: y + 4, size: 12.5, font: SERIF, color: "#ffe3b8" }); y += 16; }
        });
        const nextShift = () => {
            R.sound.ui();
            if (a.first) return game.go("ending", {}, { fade: 0.5 });
            if (!a.endless && a.advanced && sh.post) return game.go("letter", { text: sh.post }, { fade: 0.3 });
            if (!a.endless && a.i === 0 && a.advanced) return game.go("letter", { text: PROLOGUE, first: true }, { fade: 0.3 });
            game.go("ledger", {}, { fade: 0.25 });
        };
        const bw = land ? W * 0.42 : W - 40, yb = 82;
        if (fail) {
            s.add([pin("bottom", [land ? -W * 0.23 : 0, yb]), chunky("Try Again", { width: Math.min(bw, 300), height: land ? 54 : 62, textSize: 23, action: "confirm", color: "#3f7a4e", onTap: () => { R.sound.ui(); game.go("play", { shift: a.i }, { fade: 0.25 }); } })]);
            s.add([pin("bottom", [land ? -W * 0.23 : 0, 18]), chunky("To the Ledger", { width: Math.min(bw, 220), height: 46, textSize: 15, color: "#5a3524", onTap: nextShift })]);
        } else {
            s.add([pin("bottom", [land ? -W * 0.23 : 0, yb]), chunky(a.endless ? "Done" : "Next Day", { width: Math.min(bw, 300), height: land ? 54 : 62, textSize: 23, action: "confirm", onTap: nextShift })]);
            s.add([pin("bottom", [land ? -W * 0.23 : 0, 18]), chunky(a.endless ? "Go Again" : "Replay Shift", { width: Math.min(bw, 220), height: 46, textSize: 15, color: "#5a3524", onTap: () => { R.sound.ui(); game.go("play", a.endless ? { endless: true } : { shift: a.i }, { fade: 0.25 }); } })]);
        }
    });

    // --- Letters from Nana ------------------------------------------------------------------------------------------
    game.scene("letter", (s, a) => {
        game.touch.enabled = false; game.data.scene = "letter";
        const v = game.view, W = v.width, H = v.height;
        let t = 0;
        s.onUpdate((dt) => { t += dt; });
        s.onDraw((d) => {
            d.reset();
            d.rect(W, H, { x: W / 2, y: H / 2, color: "#3a1f15" });
            const q = 1 - (1 - clamp(t / 0.4)) ** 3, w = Math.min(W - 36, 420), h = Math.min(H * 0.62, 340), x = W / 2, y = H * 0.42 + (1 - q) * 80;
            d.push(); d.translate(x, y); d.rotate(-0.02 + (1 - q) * 0.1);
            d.rect(w + 8, h + 8, { y: 4, color: "#000", opacity: 0.35, radius: 8 });
            d.rect(w, h, { color: PAPER, radius: 5 });
            d.rect(w - 16, h - 16, { color: PAPER2, radius: 3, outline: 1 });
            d.text(a.first ? "A note, tucked in the ladle" : "A postcard from Nana", { y: -h / 2 + 30, size: 13, bold: true, font: FONT, color: RED });
            d.text(a.text, { y: 12, size: Math.min(17, W * 0.046), font: SERIF, color: INK, maxWidth: w - 54, lineHeight: 1.34 });
            portrait(d, NANA.look, w / 2 - 44, h / 2 - 42, 62, MOOD.happy);
            d.pop();
        });
        s.add([pin("bottom", [0, 30]), chunky("Onward", { width: 200, height: 60, textSize: 22, action: "confirm", onTap: () => { R.sound.ui(); game.go("ledger", {}, { fade: 0.3 }); } })]);
    });

    // --- The end -----------------------------------------------------------------------------------------------------------
    game.scene("ending", (s) => {
        game.touch.enabled = false; game.data.scene = "ending";
        R.song("finale");
        const v = game.view, W = v.width, H = v.height, bg = paintPlace(game.assets, "hall");
        let t = 0, puffs = [];
        const step = 3.6, bowlY = H * 0.6, r = Math.min(100, W * 0.27);
        s.onUpdate((dt) => { t += dt; puffs = rise(puffs, dt, W / 2, bowlY - 10, 9, 110, game); });
        s.onDraw((d) => {
            d.reset(); bgCover(d, bg, W, H, 0.66);
            portrait(d, NANA.look, W / 2, H * 0.38, Math.min(190, H * 0.3), t > step * 2 ? MOOD.happy : t > step ? MOOD.slurp : MOOD.calm);
            drawBowl(d, W / 2, bowlY, r, recipeBowl("lastpage", glazeOf(R), t));
            drawPuffs(d, puffs);
            const i = Math.min(ENDING.length - 1, Math.floor(t / step)), a = clamp(Math.min((t - i * step) * 2, 1));
            d.text(ENDING[i], { x: W / 2, y: H * 0.12, size: 18, font: SERIF, color: CREAM, maxWidth: W - 40, opacity: a });
            if (t > step * 3) d.text("The End. The Hall stays open.", { x: W / 2, y: H * 0.2, size: 15, bold: true, font: FONT, color: GOLD, opacity: clamp(t - step * 3) });
        });
        s.add([pin("bottom", [0, 26]), chunky("Keep Cooking", { width: 220, height: 58, textSize: 20, action: "confirm", onTap: () => { R.sound.ui(); game.go("ledger", {}, { fade: 0.4 }); } })]);
    });
}
