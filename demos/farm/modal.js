// Everything that opens on top of a scene: story dialogue, ghost cards, the basket, the build list and the Moon Book.
import { G, COLORS, Group, panel, say, spr, saveGame } from "./core.js";
import { BUILDINGS, BUILD_ORDER, CROPS, DISHES, FISH, GHOSTS, GHOST_LIST, HEART, HYBRIDS, KEEPSAKES, LETTERS, MOON_RULES, RELICS, RELIC_LIST, SEASONS, ZONES } from "./data.js";
import * as S from "./sim.js";

const LAYER = 200;
const fontH = 20;
export const portraitOf = (who) => (who === "you" ? null : who);

/** One stage per scene: its particles, its modal stack, and the rebuild hook for the HUD. */
export class Stage {
    constructor(s) { this.s = s; this.modal = new Group(s); this.open = false; this.onClose = null; this.refresh = () => {}; }
    close() { this.modal.clear(); this.open = false; const f = this.onClose; this.onClose = null; this.refresh(); f?.(); saveGame(); }
    begin(onClose) { this.modal.clear(); this.open = true; this.onClose = onClose ?? null; this.backdrop(); }
    backdrop(close = true, shade = 0.6) {
        const { s } = this, v = s.view;
        this.modal.button({ x: 0, y: 0, w: v.width, h: v.height, layer: LAYER, name: "backdrop", draw: (d, x, y, w, h) => d.rect(w, h, { color: "#120c2c", opacity: shade }), onTap: close ? () => this.close() : undefined });
    }
    frame(w, h, draw, o = {}) {
        const v = this.s.view, x = Math.round((v.width - w) / 2), y = Math.round(o.y ?? (v.height - h) / 2);
        this.modal.drawn({ layer: LAYER + 1, draw(d) { panel(d, x, y, w, h, o.kind ?? "paper"); draw?.(d, x, y, w, h); } });
        return { x, y, w, h };
    }
    btn(o) { return this.modal.button({ layer: LAYER + 2, ...o }); }
    closeBtn(f) { this.btn({ x: f.x + f.w - 42, y: f.y + 4, w: 38, h: 38, label: "x", kind: "plain", name: "close", onTap: () => this.close() }); }
}

export const panelW = (s) => Math.min(s.view.width - 16, 480);

/** Lines: [speaker id or null, text]. Tap reveals then advances. */
export function dialog(stage, lines, done, o = {}) {
    const { s } = stage, v = s.view;
    let i = 0, shown = 0, finished = false;
    stage.begin(done);
    const W = panelW(s), maxLines = Math.max(...lines.map(([w, t]) => G.font.wrap(t, W - 28).length + (w ? 1.2 : 0))), PH = Math.round(Math.min(v.height * 0.5, maxLines * fontH + 38)), x = Math.round((v.width - W) / 2), y = Math.round(v.height - v.safe.bottom - PH - 10);
    const advance = () => {
        const full = lines[i][1];
        if (shown < full.length) { shown = full.length; return; }
        i++; shown = 0; G.sound.page(); o.onLine?.(i);
        if (i >= lines.length) { if (!finished) { finished = true; stage.close(); } return; }
    };
    stage.modal.list[0].destroy(); stage.modal.list.length = 0;
    stage.modal.button({ x: 0, y: 0, w: v.width, h: v.height, layer: LAYER, name: "advance", draw: (d, ax, ay, w, h) => d.rect(w, h, { color: "#120c2c", opacity: o.shade ?? 0.34 }), onTap: advance });
    stage.modal.drawn({ layer: LAYER + 1, update(dt) {
        if (s.input.pressed("confirm") || s.input.pressed("fire")) advance();
        if (i < lines.length) { const n = shown; shown = Math.min(lines[i][1].length, shown + dt * 46); if (Math.floor(shown) > Math.floor(n)) G.sound.type(); }
    }, draw(d) {
        if (i >= lines.length) return;
        const [who, text] = lines[i], g = who && who !== "you" ? who : null, t = s.time;
        if (g) spr(d, `ghost:${g}:${Math.floor(t * 2.4) % 2}${/[!?]/.test(text) ? 0 : 1}`, x + 70, y - 34 + Math.sin(t * 2) * 3, { s: 3 });
        panel(d, x, y, W, PH, who === null ? "night" : "paper");
        const dark = who !== null, col = dark ? COLORS.ink : COLORS.paperHi;
        if (who) { const name = who === "you" ? "You" : who === "gran" ? "Gran" : GHOSTS[who].name; say(d, name, x + 14, y + 10, { color: who === "you" ? "#8a2c48" : "#6a4a8c" }); }
        const lines2 = G.font.wrap(text, W - 28), tw = Math.floor(shown);
        let n = 0;
        lines2.forEach((l, j) => { const part = l.slice(0, Math.max(0, tw - n)); n += l.length + 1; say(d, part, x + 14, y + (who ? 34 : 16) + j * fontH, { color: col }); });
        if (shown >= text.length && Math.sin(t * 6) > -0.4) spr(d, "heart", x + W - 22, y + PH - 18, { s: 1, color: dark ? "#fff" : "#ffd0e4" });
    } });
}
export const letterLines = (text) => text.split("\n\n");
/** A letter, on paper, one page. */
export function letter(stage, title, body, done) {
    const { s } = stage, v = s.view, W = panelW(s), wrapped = G.font.wrap(body, W - 36), H = Math.min(v.height - 24, wrapped.length * fontH + 96);
    stage.begin(done);
    const f = stage.frame(W, H, (d, x, y) => {
        spr(d, "letter", x + 34, y + 26);
        say(d, title, x + 60, y + 16, { color: "#6a4a8c" });
        wrapped.forEach((l, j) => say(d, l, x + 18, y + 48 + j * fontH, { color: COLORS.ink }));
    });
    G.sound.page();
    stage.btn({ x: f.x + f.w / 2 - 60, y: f.y + f.h - 44, w: 120, h: 38, label: "Folded", kind: "gold", name: "ok", onTap: () => stage.close() });
    stage.modal.drawn({ update() { if (s.input.pressed("confirm")) stage.close(); }, draw() {} });
}

export function toastCard(stage, title, body, icon, done) {
    const { s } = stage, W = Math.min(panelW(s), 340), wrapped = G.font.wrap(body, W - 32), H = wrapped.length * fontH + (icon ? 126 : 84);
    stage.begin(done);
    const f = stage.frame(W, H, (d, x, y, w) => {
        say(d, title, x + w / 2, y + 12, { align: "center", color: "#6a4a8c" });
        if (icon) { d.additive(() => d.sprite("glow", { x: x + w / 2, y: y + 62, width: 96, height: 96, color: "#ffe9a8", opacity: 0.6 })); spr(d, icon, x + w / 2, y + 62, { s: 3 }); }
        wrapped.forEach((l, j) => say(d, l, x + w / 2, y + (icon ? 96 : 40) + j * fontH, { align: "center", color: COLORS.ink }));
    });
    stage.btn({ x: f.x + f.w / 2 - 50, y: f.y + f.h - 42, w: 100, h: 36, label: "Lovely", kind: "gold", name: "ok", onTap: () => stage.close() });
    stage.modal.drawn({ update() { if (s.input.pressed("confirm")) stage.close(); }, draw() {} });
}

// ---- Ghost card --------------------------------------------------------------------------------------------------------------
export function ghostCard(stage, g, hooks = {}) {
    const st = G.sim, { s } = stage, D = GHOSTS[g], W = panelW(s), lv0 = S.heartLevel(st, g);
    const wantFavour = lv0 >= 5 && !st.keepsakes.includes(D.keepsake), H = 138 + (S.hasStory(st, g) ? 44 : 0) + (wantFavour ? (S.favourReady(st, g) ? 44 : 20 + G.font.wrap(D.favour, W - 32).length * fontH) : 0) + 44;
    stage.begin(hooks.done);
    const lv = S.heartLevel(st, g), order = st.orders.find((o) => o.g === g), idx = st.orders.indexOf(order), line = D.lines[(st.day + g.length) % D.lines.length];
    S.openFavour(st, g);
    const quote = G.font.wrap(`"${line}"`, W - 110), f = stage.frame(W, H, (d, x, y) => {
        spr(d, `ghost:${g}:${Math.floor(s.time * 2.4) % 2}1`, x + 50, y + 54 + Math.sin(s.time * 2) * 2);
        say(d, D.name, x + 96, y + 12, { color: "#6a4a8c" });
        for (let i = 0; i < 5; i++) spr(d, i < lv ? "heart" : "heart0", x + 108 + i * 28, y + 46);
        quote.slice(0, 3).forEach((l, j) => say(d, l, x + 96, y + 62 + j * fontH, { color: COLORS.ink }));
    });
    stage.closeBtn(f);
    const bx = f.x + 12, bw = f.w - 24; let by = f.y + 128;
    const row = (o) => { stage.btn({ x: bx, y: by, w: bw, h: 40, ...o }); by += 44; };
    if (S.hasStory(st, g)) row({ label: `Listen (heart ${st.told[g] + 1})`, kind: "gold", name: "listen", onTap: () => { const t = S.talk(st, g); dialog(stage, [[g, t]], () => ghostCard(stage, g, hooks), { shade: 0.5 }); } });
    if (lv >= 5 && !st.keepsakes.includes(D.keepsake)) {
        if (S.favourReady(st, g)) row({ label: "Do them the last favour", kind: "gold", name: "favour", onTap: () => { const k = S.doFavour(st, g); G.sound.heart(); hooks.keepsake?.(k); const lastLetter = g === "quillon"; toastCard(stage, KEEPSAKES[k].name, `${D.name} gives you this to hang on the Long Lantern.`, `item:${k}`, () => { if (lastLetter) hooks.lastLetter?.(); else ghostCard(stage, g, hooks); }); } });
        else stage.modal.drawn({ layer: LAYER + 2, draw: ((yy) => (d) => { G.font.wrap(D.favour, bw - 8).forEach((l, j) => say(d, l, bx + 4, yy + j * fontH, { color: "#8a2c48" })); })(by) }), by += 10 + G.font.wrap(D.favour, bw - 8).length * fontH;
    }
    if (st.phase === "day" && !st.gifted[g] && Object.keys(st.inv).length) row({ label: "Give a gift", kind: "plain", name: "gift", onTap: () => giftPicker(stage, g, hooks) });
    else if (st.gifted[g]) stage.modal.drawn({ layer: LAYER + 2, draw: ((yy) => (d) => say(d, "Thanked you for today's gift.", bx + 4, yy, { color: "#6a5a70" }))(by) });
}
function giftPicker(stage, g, hooks) {
    const st = G.sim, keys = Object.keys(st.inv), G0 = GHOSTS[g], { s } = stage, W = panelW(s), cols = Math.floor((W - 24) / 56), rows = Math.min(4, Math.ceil(keys.length / cols)), H = 76 + Math.max(1, rows) * 60;
    stage.begin(() => {});
    stage.onClose = null;
    const f = stage.frame(W, H, (d, x, y) => say(d, `Gift for ${G0.name}`, x + 14, y + 12, { color: "#6a4a8c" }));
    stage.btn({ x: f.x + f.w - 42, y: f.y + 4, w: 38, h: 38, label: "x", kind: "plain", name: "close", onTap: () => ghostCard(stage, g, hooks) });
    keys.slice(0, cols * 4).forEach((k, i) => {
        const id = S.isBase(k), love = G0.loves.includes(id), x = f.x + 12 + (i % cols) * 56, y = f.y + 48 + Math.floor(i / cols) * 60;
        stage.btn({ x, y, w: 52, h: 56, kind: S.isShining(k) ? "gold" : "plain", name: `gift:${k}`, icon: `item:${id}`, sub: `x${st.inv[k]}`, onTap: () => {
            const r = S.gift(st, g, k);
            if (!r) return;
            hooks.gifted?.(g, r);
            if (r.heart) G.sound.heart(); else G.sound.chime();
            ghostCard(stage, g, hooks);
        } });
    });
}

// ---- Basket ------------------------------------------------------------------------------------------------------------------
export function basket(stage, hooks = {}) {
    const st = G.sim, { s } = stage, W = panelW(s), keys = Object.keys(st.inv), cols = Math.floor((W - 24) / 56), perRow = cols, H = Math.min(s.view.height - 60, 100 + Math.max(1, Math.ceil(keys.length / perRow)) * 60);
    stage.begin(hooks.done);
    const day = st.phase === "day";
    const f = stage.frame(W, H, (d, x, y) => {
        say(d, day ? "Basket: tap to sell one" : "Basket", x + 14, y + 12, { color: "#6a4a8c" });
        if (!keys.length) say(d, "Empty. Go and sweep something.", x + 14, y + 52, { color: COLORS.ink });
    });
    stage.closeBtn(f);
    const fit = Math.max(1, Math.floor((H - 76) / 60)) * cols;
    keys.slice(0, fit).forEach((k, i) => {
        const id = S.isBase(k), x = f.x + 12 + (i % cols) * 56, y = f.y + 48 + Math.floor(i / cols) * 60;
        stage.btn({ x, y, w: 52, h: 56, kind: S.isShining(k) ? "gold" : "plain", name: `sell:${k}`, icon: `item:${id}`, sub: `x${st.inv[k]}`, onTap: () => { if (!day) { G.sound.page(); toast(stage, `${S.itemName(k)}: ${S.priceOf(st, k)}p`); return; } const p = S.sellOne(st, k); G.sound.coin(); hooks.sold?.(p); basket(stage, hooks); } });
    });
}
export function toast(stage, text) { stage.toast?.(text); }

// ---- Build list --------------------------------------------------------------------------------------------------------------
export function buildList(stage, hooks = {}, page = 0) {
    const st = G.sim, { s } = stage, W = panelW(s), rows = [];
    const z = S.nextZone(st), l = S.nextLantern(st);
    if (z) rows.push({ name: z.name, note: "Clear the brambles and open more field.", cost: z.cost, icon: "hoe", buy: () => S.clearZone(st), key: "zone" });
    if (l && st.letter >= 5) rows.push({ name: `Dock: ${l.name}`, note: l.note, cost: l.cost, icon: "hammer", key: "lantern", buy: () => S.buildLantern(st), blocked: st.lantern >= 2 && !st.found.includes("hearthlight") ? "Needs a Hearthlight found first." : null });
    for (const b of BUILD_ORDER) {
        const B = BUILDINGS[b];
        if (st.built[b] && !B.multi) continue;
        rows.push({ name: B.name, note: B.note, cost: B.cost, icon: b === "cauldron" ? "potnav" : b === "rod" ? "fishnav" : b === "bell" ? "drop" : b === "widehoe" ? "hoe" : b === "hive" ? "item:honey" : b === "awning" || b === "sign" ? "stallnav" : "farmnav", key: b, buy: () => S.buy(st, b) });
    }
    const per = Math.max(2, Math.floor((s.view.height - 140) / 84)), pages = Math.max(1, Math.ceil(rows.length / per)), shownRows = Math.min(per, rows.length || 1), H = Math.min(s.view.height - 24, 56 + shownRows * 84 + (pages > 1 ? 44 : 0));
    stage.begin(hooks.done);
    const f = stage.frame(W, H, (d, x, y) => {
        say(d, "Build", x + 14, y + 12, { color: "#6a4a8c" });
        spr(d, "coin", x + 92, y + 19); say(d, `${st.pennies}`, x + 106, y + 12, { color: COLORS.ink });
        if (!rows.length) say(d, "Everything's built. Gran would be smug.", x + 14, y + 60, { color: COLORS.ink });
    });
    stage.closeBtn(f);
    rows.slice(page * per, (page + 1) * per).forEach((r, i) => {
        const y = f.y + 46 + i * 84, afford = st.pennies >= r.cost && !r.blocked, note = G.font.wrap(r.blocked ?? r.note, f.w - 156);
        stage.modal.drawn({ layer: LAYER + 2, draw(d) {
            spr(d, r.icon, f.x + 28, y + 22); say(d, r.name, f.x + 56, y + 2, { color: COLORS.ink });
            note.slice(0, 3).forEach((l, j) => say(d, l, f.x + 56, y + 22 + j * fontH, { color: "#6a5a70" }));
        } });
        stage.btn({ x: f.x + f.w - 92, y: y + 4, w: 82, h: 46, label: `${r.cost}`, kind: afford ? "gold" : "plain", disabled: !afford, name: `buy:${r.key}`, onTap: () => { if (r.buy()) { G.sound.build(); stage.s.shake(2, 0.15, { haptic: false }); hooks.bought?.(r.key); buildList(stage, hooks, page); } } });
    });
    if (pages > 1) {
        stage.btn({ x: f.x + 12, y: f.y + f.h - 40, w: 60, h: 36, label: "<", kind: "plain", disabled: page === 0, name: "prev", onTap: () => buildList(stage, hooks, page - 1) });
        stage.btn({ x: f.x + f.w - 72, y: f.y + f.h - 40, w: 60, h: 36, label: ">", kind: "plain", disabled: page >= pages - 1, name: "next", onTap: () => buildList(stage, hooks, page + 1) });
    }
}

// ---- The Moon Book ---------------------------------------------------------------------------------------------------------
const TABS = [["Moon", "moonnav", 2], ["Crops", "farmnav", 2], ["Museum", "item:marble", 2], ["Ghosts", "ghost:quillon:01", 0.8], ["Sound", "gear", 2]];
function pageMoon(d, f, st) {
    const lines = [MOON_RULES.wax, MOON_RULES.full, MOON_RULES.wane, MOON_RULES.new, "Friends side by side give one extra each harvest. Look for the threads of light.", "Ripe melons and gourds shade their neighbours, keeping them damp.", "Crops stay ripe as long as you like. Nothing dies, ever."];
    let y = f.y + 104;
    const m = S.moon(st);
    spr(d, `moon${m}`, f.x + 40, f.y + 74, { s: 0.8 });
    say(d, S.nightsToFull(st) === 0 ? "Full moon tonight" : `Full moon in ${S.nightsToFull(st)} nights`, f.x + 74, f.y + 64, { color: "#6a4a8c" });
    for (const t of lines) { for (const l of G.font.wrap(t, f.w - 28)) { if (y < f.y + f.h - 16) say(d, l, f.x + 14, y, { color: COLORS.ink }); y += 19; } y += 7; }
}
function grid(d, f, list, y0, known, draw) {
    const cell = 40, cols = Math.floor((f.w - 20) / cell);
    list.forEach((id, i) => {
        const x = f.x + 12 + (i % cols) * cell + cell / 2, y = y0 + Math.floor(i / cols) * cell + cell / 2;
        panel(d, x - 18, y - 18, 36, 36, known(id) ? "plain" : "dim");
        if (known(id)) spr(d, `item:${id}`, x, y);
        else spr(d, `item:${id}`, x, y, { color: "#1c1230", opacity: 0.8 });
    });
    return y0 + Math.ceil(list.length / cols) * cell;
}
function pageCrops(d, f, st) {
    let y = f.y + 52;
    say(d, "Hybrids to find", f.x + 14, y, { color: "#6a4a8c" }); y += 22;
    y = grid(d, f, HYBRIDS, y, (id) => st.found.includes(id));
    const next = HYBRIDS.filter((h) => !st.found.includes(h))[0];
    y += 6;
    if (next) {
        const [a, b] = CROPS[next].parents, known = (c) => st.dex.crop[c] || st.found.includes(c);
        const hint = `A hint: ${known(a) ? CROPS[a].name : "something"} beside ${known(b) ? CROPS[b].name : "something"}, with a gap of tilled soil between.`;
        for (const l of G.font.wrap(hint, f.w - 28)) { if (y < f.y + f.h - 16) say(d, l, f.x + 14, y, { color: COLORS.ink }); y += 19; }
    } else say(d, "Every hybrid found! The Professor faints.", f.x + 14, y, { color: COLORS.ink });
}
function pageMuseum(d, f, st) {
    let y = f.y + 50;
    say(d, `${S.dexCount(st)} of ${S.dexTotal()} exhibits`, f.x + 14, y, { color: "#6a4a8c" }); y += 22;
    const fish = Object.keys(FISH).filter((k) => !FISH[k].legend), dish = Object.keys(DISHES), crops = Object.keys(CROPS).filter((k) => !CROPS[k].hybrid);
    y = grid(d, f, crops, y, (id) => st.dex.crop[id]);
    y = grid(d, f, fish, y + 4, (id) => st.dex.fish[id]);
    y = grid(d, f, dish, y + 4, (id) => st.dex.dish[id]);
    y = grid(d, f, RELIC_LIST, y + 4, (id) => st.dex.relic[id]);
}
function pageGhosts(stage, f, st) {
    GHOST_LIST.forEach((g, i) => {
        const y = f.y + 48 + i * 44, D = GHOSTS[g], lv = S.heartLevel(st, g), done = st.keepsakes.includes(D.keepsake);
        stage.btn({ x: f.x + 10, y, w: f.w - 20, h: 42, kind: "plain", name: `ghost:${g}`, draw: (d, x, yy, w, h, press) => {
            panel(d, x, yy, w, h, "plain");
            spr(d, `ghost:${g}:01`, x + 24, yy + 20, { s: 0.8 });
            say(d, D.name, x + 46, yy + 12, { color: COLORS.ink });
            if (done) spr(d, `item:${D.keepsake}`, x + w - 150, yy + 21, { s: 1 });
            for (let k = 0; k < 5; k++) spr(d, k < lv ? "heart" : "heart0", x + w - 120 + k * 22, yy + 21, { s: 1.5 });
        }, onTap: () => {
            const told = D.story.slice(0, st.told[g]);
            if (told.length) dialog(stage, told.map((t) => [g, t]), () => book(stage, 3));
            else { dialog(stage, [[g, D.lines[0]]], () => book(stage, 3)); }
        } });
    });
}
function pageSound(stage, f, st, tab) {
    const game = G.game, y = f.y + 56;
    stage.btn({ x: f.x + 12, y, w: f.w - 24, h: 44, label: `Sound: ${game.audio.muted ? "off" : "on"}`, kind: "plain", name: "sound", onTap: () => { game.audio.muted = !game.audio.muted; game.save("moonpatch-mute", game.audio.muted); book(stage, tab); } });
    stage.btn({ x: f.x + 12, y: y + 50, w: f.w - 24, h: 44, label: `Haptics: ${game.haptics.enabled ? "on" : "off"}`, kind: "plain", name: "haptics", onTap: () => { game.haptics.enabled = !game.haptics.enabled; game.save("moonpatch-haptics", game.haptics.enabled); if (game.haptics.enabled) game.haptic("medium"); book(stage, tab); } });
    stage.btn({ x: f.x + 12, y: y + 100, w: f.w - 24, h: 44, label: "To the title", kind: "plain", name: "title", onTap: () => { saveGame(); stage.modal.clear(); stage.open = false; game.go("title", {}, { fade: 0.25 }); } });
    stage.modal.drawn({ layer: LAYER + 2, draw(d) {
        const hints = G.font.wrap(game.input.touchMode ? "Saved after everything you do. It waits for you." : "Drag to sweep. Arrows and Space work too. N: next. B: book. H: build. Saved always.", f.w - 28);
        hints.forEach((l, j) => say(d, l, f.x + 14, y + 152 + j * 19, { color: "#6a5a70" }));
    } });
}
export function book(stage, tab = 0) {
    const st = G.sim, { s } = stage, W = panelW(s), H = Math.min(s.view.height - 24, 520);
    stage.begin();
    const f = stage.frame(W, H, (d, x, y, w, h) => {
        if (tab === 0) pageMoon(d, { x, y, w, h }, st);
        if (tab === 1) pageCrops(d, { x, y, w, h }, st);
        if (tab === 2) pageMuseum(d, { x, y, w, h }, st);
    });
    const tw = Math.floor((f.w - 54) / TABS.length);
    TABS.forEach(([t, icon, iconS], i) => stage.btn({ x: f.x + 6 + i * tw, y: f.y + 6, w: tw - 2, h: 40, icon, iconS, kind: i === tab ? "gold" : "plain", name: `tab:${t}`, onTap: () => { G.sound.page(); book(stage, i); } }));
    stage.closeBtn(f);
    if (tab === 3) pageGhosts(stage, f, st);
    if (tab === 4) pageSound(stage, f, st, tab);
}
