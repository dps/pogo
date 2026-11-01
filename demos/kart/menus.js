// Every screen that isn't the race itself, plus the race scene's wiring.
import { button, mesh, pin, pos, sprite, text, ui } from "./pogo.js";
import { CLASSES, ORD, POINTS, RACERS, bestRank, classOpen, commit, loadSave, racerById, racerOpen, unlocks } from "./data.js";
import { CUPS, TRACKS, trackById } from "./tracks.js";
import { RIDER_Y, World } from "./world.js";
import { Track } from "./track.js";
import { Controls, FONT, attachHUD, fmt, sticker } from "./hud.js";

const INK = "#2b2140", CREAM = "#fff6e6";

const THEME_LIST = ["aisle", "freezer", "bakery", "garden", "dock", "rooftop"];
export const MEDALS = { aisle: [71, 78, 86], freezer: [82, 90, 99], bakery: [62, 68, 75], garden: [86, 94, 104], dock: [58, 64, 71], rooftop: [69, 76, 84] };

/** Rebuildable screen: all its entities go away and come back on a resize. */
function screen(s, build) {
    let items = [];
    const add = (...c) => { const e = s.add(c); items.push(e); return e; };
    const redo = () => { for (const e of items) e.destroy(); items = []; build(add, s.view); };
    redo();
    s.on("resize", redo);
    return redo;
}
function label(add, str, x, y, size, col = CREAM, o = {}) {
    return add(text(str, { size, bold: o.bold ?? true, font: FONT, color: col, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0 }), pos(x, y), ui(), { layerZ: 0 });
}
const big = (add, str, x, y, w, h, col, onTap, o = {}) => add(button(str, { width: w, height: h, color: col, textColor: o.ink ?? INK, textSize: o.size ?? 18, radius: o.radius ?? 16, action: o.action, onTap: () => { o.quiet || snd(o.game)?.click(); onTap(); } }), pos(x, y), ui());
const snd = (g) => g?.snd;

const routes = new Map();
/** A track's outline scaled to fit a box, for cards. */
function route(id, size) {
    if (!routes.has(id)) {
        const T = new Track(trackById(id)), pts = [];
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        for (let i = 0; i < T.n; i += 6) { pts.push([T.px[i], T.pz[i]]); x0 = Math.min(x0, T.px[i]); x1 = Math.max(x1, T.px[i]); z0 = Math.min(z0, T.pz[i]); z1 = Math.max(z1, T.pz[i]); }
        const k = 1 / Math.max(x1 - x0, z1 - z0);
        routes.set(id, pts.map((p) => [(p[0] - (x0 + x1) / 2) * k, (p[1] - (z0 + z1) / 2) * k]));
    }
    const pts = routes.get(id);
    return { draw(d) {
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            d.line([a[0] * size, a[1] * size], [b[0] * size, b[1] * size], { width: pass ? 2 : 5, color: pass ? "#ffc233" : INK });
        }
    } };
}

function menuBack(s) {
    s.background = ["#3a2a6b", "#b23a8e"];
    s.onDrawUI((d) => {
        const v = s.view, n = Math.ceil(v.width / 20);
        for (let r = 0; r < 2; r++) for (let i = 0; i <= n; i++) d.rect(20, 8, { x: i * 20 + 10, y: v.height - 4 - r * 8, color: (i + r) % 2 ? INK : CREAM, opacity: 0.7 });
    });
}
function topBar(game, s, add, v, title, back = "title") {
    const y = v.safe.top + 34;
    big(add, "Back", v.safe.left + 56, y, 96, 52, CREAM, () => game.go(back, undefined, { fade: 0.15 }), { game, action: "pause", size: 16 });
    label(add, title, v.width / 2 + 24, y, Math.min(28, v.width * 0.075));
    return y + 44;
}

// --- Title ---------------------------------------------------------------------------------------------------
function title(game) {
    game.scene("title", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game);
        const theme = THEME_LIST[(game.data.titleN = ((game.data.titleN ?? -1) + 1)) % 6];
        const track = TRACKS.find((t) => t.theme === theme && open(save, t));
        const W = new World(game, s, { track: (track ?? TRACKS[0]).id, mode: "demo", laps: 999 });
        game.sim = W;
        s.onUpdate((dt) => W.update(dt));
        snd(game).music("menu");
        s.onDrawUI((d) => {
            const v = s.view, portrait = v.height > v.width, w = Math.min(v.width - 24, portrait ? 340 : Math.min(290, v.width * 0.4)), cx = portrait ? v.width / 2 : v.width * 0.28, y = portrait ? v.safe.top + 130 : v.height * 0.5 - 8, f = w / 340, bob = Math.sin(W.time * 2) * 3;
            d.sprite("cartIcon", { x: cx + 118 * f, y: y - 58 * f + bob, width: 92 * f, height: 69 * f, rot: -0.08 });
            sticker(d, "SHOPPING", cx - 22 * f, y - 28 * f, 46 * f, "#ffc233");
            sticker(d, "CART", cx - 72 * f, y + 26 * f, 62 * f, "#ff4b3e");
            sticker(d, "GP", cx + 88 * f, y + 26 * f + bob * 0.6, 74 * f, CREAM);
        });
        screen(s, (add, v) => {
            const portrait = v.height > v.width, career = nextRace(save), bw = Math.min(280, v.width - 60);
            const cx = portrait ? v.width / 2 : v.width * 0.74, y = portrait ? v.height - v.safe.bottom - 170 : v.height - v.safe.bottom - 190;
            const go = () => { save.seen.tap = true; startCareer(game); };
            big(add, "RACE!", cx, y, bw, 72, "#ffc233", go, { game, action: "confirm", size: 32, radius: 22 });
            const lab = `${CUPS[career.cup].name}  race ${career.race + 1} of 3`;
            add(text(lab, { size: 14, bold: true, font: FONT, color: CREAM }), pos(cx, y + 50), ui());
            const row = y + 92, bw2 = (bw - 12) / 2;
            big(add, "Cups", cx - bw2 / 2 - 6, row, bw2, 50, CREAM, () => game.go("cups", undefined, { fade: 0.15 }), { game, size: 17 });
            big(add, "Time Trial", cx + bw2 / 2 + 6, row, bw2, 50, CREAM, () => game.go("trial", undefined, { fade: 0.15 }), { game, size: 17 });
            add(button("", { width: 52, height: 52, color: INK, radius: 26, onTap: () => { snd(game).click(); game.go("settings", undefined, { fade: 0.15 }); } }), pin("top-right", [10, 10]));
            add(sprite("gear", { width: 30, height: 30 }), pin("top-right", [21, 21]));
            add(button("", { width: 58, height: 58, color: racerById(save.racer).color, radius: 29, onTap: () => { snd(game).click(); game.go("racers", undefined, { fade: 0.15 }); } }), pin("top-left", [10, 10]));
            add(sprite(`face_${save.racer}`, { width: 52, height: 52 }), pin("top-left", [13, 13]));
        });
    });
}
const open = (save, t) => t.id && (CUPS[0].tracks.includes(t.id) || unlocks(save).clearance);
function nextRace(save) {
    const c = save.career;
    if (c.cup === 1 && !unlocks(save).clearance) return { cup: 0, race: 0 };
    return { cup: c.cup, race: c.race };
}
function startCareer(game) {
    const save = loadSave(game), n = nextRace(save);
    runCup(game, n.cup, n.race, save.career.points ?? {});
}
function runCup(game, cup, race, points) {
    const save = loadSave(game);
    game.data.cup = { cup, race, points: { ...points } };
    save.career.cup = cup; save.career.race = race; save.career.points = game.data.cup.points; commit(game);
    game.go("race", { track: CUPS[cup].tracks[race], mode: "race", cls: save.cls, racer: save.racer, mirror: save.mirror }, { fade: 0.2 });
}

// --- Race ---------------------------------------------------------------------------------------------------
function race(game) {
    game.scene("race", (s, a = {}) => {
        const save = loadSave(game);
        const args = { track: "aisle", mode: "race", cls: save.cls, racer: save.racer, ...a };
        args.goldCart = unlocks(save).goldCart;
        args.quickStart = save.played < 1;
        if (args.mode === "tt") args.ghost = save.tt[args.track]?.ghost ? { path: save.tt[args.track].ghost, racer: save.tt[args.track].racer } : null;
        game.touch.enabled = false;
        const W = new World(game, s, args), ctl = new Controls(game, s);
        W.controls = ctl; game.sim = W;
        attachHUD(game, s, W, ctl);
        s.onUpdate((dt) => W.update(dt));
        snd(game).music(W.def.theme);
        W.onDone = () => finishRace(game, W, args);
        // Pause
        const pauser = s.add([button("II", { width: 52, height: 52, color: INK, textColor: CREAM, textSize: 18, radius: 14, onTap: () => pause(true) }), pin("top-right", [8, 8])]);
        let menu = [];
        const pause = (on) => {
            for (const e of menu) e.destroy(); menu = [];
            s.paused = on; pauser.hidden = on;
            if (on) { snd(game).engine(0, 0, false, false); snd(game).engineOff(); }
            if (!on) return;
            const v = s.view, cx = v.width / 2, add = (...c) => { const e = s.add(c); menu.push(e); return e; };
            add({ update() { } }, ui(), { draw(d) { d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: INK, opacity: 0.74 }); } });
            const wide = v.height < 520, left = wide ? v.width * 0.27 : cx, y0 = wide ? v.safe.top + 40 : v.height * 0.1;
            add(text("PAUSED", { size: wide ? 26 : 34, bold: true, font: FONT, color: "#ffc233" }), pos(left, y0), ui());
            let y = y0 + (wide ? 52 : 62);
            big(add, "Resume", left, y, 220, 56, "#ffc233", () => pause(false), { game, size: 20 });
            big(add, "Restart", left, y += 64, 220, 52, CREAM, () => { s.paused = false; game.go("race", a, { fade: 0.15 }); }, { game });
            big(add, "Quit", left, y += 60, 220, 52, CREAM, () => { s.paused = false; game.go("title", undefined, { fade: 0.15 }); }, { game });
            settingsRows(game, add, wide ? v.width * 0.72 : cx, wide ? v.safe.top + 34 : y + 66, v, () => pause(true), wide);
            add(ui(), { update() { if (s.input.pressed("pause")) pause(false); } });
        };
        s.add([ui(), { update() { if (!s.paused && s.input.pressed("pause") && W.phase !== "finish") pause(true); } }]);
        game.pauseRace = () => { if (game.current === s && !s.paused && W.phase === "race") pause(true); };
    });
}

function finishRace(game, W, args) {
    const save = loadSave(game), me = W.results.find((r) => r.player);
    save.played++;
    if (args.mode === "tt") {
        const k = W.player, id = args.track, cur = save.tt[id] ?? {};
        const total = k.finishT, best = !cur.best || total < cur.best;
        const lap = k.bestLap, lapBest = !cur.lap || lap < cur.lap;
        const out = { time: total, lap, best, lapBest, prev: cur.best };
        if (best) cur.best = total;
        if (lapBest && W.bestRec) { cur.lap = lap; cur.ghost = W.bestRec; cur.racer = args.racer; }
        save.tt[id] = cur; commit(game);
        game.data.ttResult = { ...out, args };
        game.go("ttdone", undefined, { fade: 0.3 });
        return;
    }
    const c = game.data.cup ?? { cup: 0, race: 0, points: {} };
    W.results.forEach((r, i) => { c.points[r.id] = (c.points[r.id] ?? 0) + POINTS[i]; });
    // Bank the race now, so quitting from the results screen can't score it twice.
    save.career = c.race < 2 ? { cup: c.cup, race: c.race + 1, points: c.points } : { cup: c.cup, race: 0, points: {} };
    game.data.lastRace = { results: W.results, stats: W.stats, track: W.def.name, c, me };
    commit(game);
    game.go("results", undefined, { fade: 0.3 });
}

function results(game) {
    game.scene("results", (s) => {
        game.touch.enabled = false;
        menuBack(s);
        const L = game.data.lastRace ?? { results: RACERS.map((r, i) => ({ id: r.id, name: r.name, rank: i + 1, player: i === 2 })), c: { cup: 0, race: 0, points: {} }, track: "Aisle Nine", stats: { drifts: 0, boosts: 0 } }, c = L.c, save = loadSave(game);
        const table = [...L.results].map((r) => ({ ...r, pts: POINTS[r.rank - 1], total: c.points[r.id] ?? 0 }));
        const last = c.race >= 2;
        const next = () => {
            if (last) { game.data.cupEnd = { cup: c.cup, points: c.points }; game.go("podium", undefined, { fade: 0.3 }); }
            else runCup(game, c.cup, c.race + 1, c.points);
        };
        const me = table.find((r) => r.player);
        snd(game).music((me?.rank ?? 6) <= 3 ? "win" : "lose");
        let shown = 0, t = 0;
        s.onUpdate((dt) => { t += dt; const want = Math.min(6, Math.floor(t / 0.13)); if (want > shown) { shown = want; snd(game).pass(true); } });
        s.onDrawUI((d) => {
            const v = s.view, wide = v.height < 480, top = v.safe.top + (wide ? 84 : 92), rowH = Math.min(46, (v.height - top - (wide ? 20 : 142)) / 6), w = wide ? Math.min(420, v.width * 0.56) : Math.min(440, v.width - 24), mid = wide ? v.safe.left + 12 + w / 2 : v.width / 2, x0 = mid - w / 2;
            for (let i = 0; i < shown; i++) {
                const r = table[i], y = top + i * rowH, e = Math.min(1, (t - i * 0.13) / 0.2), ox = (1 - e * (2 - e)) * -60, h = rowH - 5;
                d.rect(w, h, { x: mid + ox, y, color: r.player ? "#ffc233" : CREAM, radius: 10, opacity: r.player ? 1 : 0.92 });
                d.text(ORD[i], { x: x0 + 26 + ox, y, size: 16, bold: true, font: FONT, color: INK });
                d.sprite(`face_${r.id}`, { x: x0 + 66 + ox, y, width: h - 2, height: h - 2 });
                d.text(r.name, { x: x0 + 150 + ox, y, size: 16, bold: true, font: FONT, color: INK });
                d.text(`+${r.pts}`, { x: x0 + w - 86 + ox, y, size: 16, bold: true, font: FONT, color: "#c22f7a" });
                d.text(String(r.total), { x: x0 + w - 30 + ox, y, size: 20, bold: true, font: FONT, color: INK });
            }
        });
        screen(s, (add, v) => {
            const wide = v.height < 480, cx = wide ? v.safe.left + 12 + Math.min(420, v.width * 0.56) / 2 : v.width / 2;
            label(add, L.track, cx, v.safe.top + 24, 26, "#ffc233");
            add(text(`Race ${c.race + 1} of 3   ${CUPS[c.cup].name}`, { size: 14, bold: true, font: FONT, color: CREAM }), pos(cx, v.safe.top + 50), ui());
            const bx = wide ? v.width - v.safe.right - 112 : v.width / 2, by = wide ? v.height / 2 : v.height - v.safe.bottom - 62;
            big(add, last ? "See the podium" : "Next race", bx, by, wide ? 200 : Math.min(280, v.width - 60), 62, "#ffc233", next, { game, action: "confirm", size: wide ? 18 : 22 });
        });
    });
}

function podium(game) {
    game.scene("podium", (s) => {
        game.touch.enabled = false;
        const save = loadSave(game), E = game.data.cupEnd ?? { cup: 0, points: { pip: 30, nan: 20, mop: 12 } };
        const sorted = RACERS.map((r) => ({ r, pts: E.points[r.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
        const rank = sorted.findIndex((x) => x.r.id === save.racer) + 1, cupId = CUPS[E.cup].id, key = `${cupId}:${save.cls}`;
        const before = unlocks(save);
        const prior = save.cups[key];
        if (!prior || rank < prior) save.cups[key] = rank;
        if (save.cls === "flatbed" && rank === 1) save.cups["*flatbed"] = 1;
        const after = unlocks(save), gained = [];
        if (after.clearance && !before.clearance) gained.push("Clearance Cup open");
        if (after.crumb && !before.crumb) gained.push("Chef Crumb joins the race");
        if (after.stan && !before.stan) gained.push("Big Stan joins the race");
        if (after.trolley && !before.trolley) gained.push("Trolley class open");
        if (after.flatbed && !before.flatbed) gained.push("Flatbed class open");
        if (after.mirror && !before.mirror) gained.push("Mirror mode and the golden cart");
        // Career moves on to the next cup.
        const cups = CUPS.length;
        save.career = { cup: rank <= 3 ? (E.cup + 1) % cups : E.cup, race: 0, points: {} };
        commit(game);
        game.data.cupEnd = E;
        // A little stage.
        s.background = ["#3a2a6b", "#ff8a5c"];
        s.light.dir.set(-0.4, -1, -0.5); s.light.shadowRange = 20; s.light.fog = null;
        s.add([mesh("box", { size: [90, 1, 90], color: "#7b4dff", shadow: false }), pos(0, -0.5, 0)]);
        const steps = [[0, 2.6, "#ffc233"], [-3.4, 1.7, "#dfe7f0"], [3.4, 1.0, "#f0b078"]];
        sorted.slice(0, 3).forEach((x, i) => {
            const [px, h, c] = steps[i];
            s.add([mesh("box", { size: [3.3, h, 3.3], color: c }), pos(px, h / 2, 0)]);
            const cart = s.add([mesh("cart", { color: x.r.color }), pos(px, h, 0)]);
            cart.child([mesh(`rider_${x.r.id}`), pos(0, RIDER_Y, 0)]);
            cart.rot.y = Math.PI + (px ? -px * 0.1 : 0);
        });
        let t = 0;
        s.cam3.set([0, 4.2, 12], [0, 2.8, 0]);
        snd(game).music(rank <= 3 ? "win" : "lose");
        snd(game).finish(rank);
        const cc = ["#ffc233", "#ff4b3e", "#38b6ff", "#2ec4a6", "#ff5fa2"];
        s.every(0.3, () => s.burst({ at: [game.fxRng.range(-5, 5), 7, game.fxRng.range(-2, 2)], count: 14, color: cc, speed: [2, 7], life: [0.8, 1.6], size: [0.1, 0.22], dim: 3, gravity: 0.25 }));
        s.onUpdate((dt) => { t += dt; { const wide = s.view.height < 480, ox = wide ? 3 : 0; s.cam3.pos.set(ox + Math.sin(t * 0.3) * 3, 4.6, 10 + Math.cos(t * 0.3)); s.cam3.target.set(ox, 1.6, 0); } s.cam3.fov = s.view.height > s.view.width ? 62 : 40; });
        s.onDrawUI((d) => {
            const v = s.view, wide = v.height < 480, y = v.safe.top + (wide ? 44 : 62), pop = Math.min(1.06, 0.4 + t * 2), hx = wide ? v.width * 0.74 : v.width / 2;
            sticker(d, CUPS[E.cup].name, hx, y - 26, wide ? 22 : Math.min(30, v.width * 0.08), CREAM);
            sticker(d, rank === 1 ? "CHAMPION!" : `${ORD[rank - 1]} OVERALL`, hx, y + 16, (wide ? 34 : Math.min(46, v.width * 0.11)) * pop, rank <= 3 ? "#ffc233" : CREAM);
            gained.forEach((g, i) => { const yy = v.height - v.safe.bottom - 132 - i * 34, ww = Math.min(v.width * (wide ? 0.44 : 1) - 24, 330); d.rect(ww, 30, { x: hx, y: yy, color: INK, radius: 15, opacity: 0.85 }); d.text(`Unlocked: ${g}`, { x: hx, y: yy, size: 13, bold: true, font: FONT, color: "#ffc233" }); });
        });
        screen(s, (add, v) => {
            big(add, "Carry on", v.height < 480 ? v.width * 0.74 : v.width / 2, v.height - v.safe.bottom - 62, Math.min(280, v.width * (v.height < 480 ? 0.4 : 1) - 40), 60, "#ffc233", () => game.go("title", undefined, { fade: 0.3 }), { game, action: "confirm", size: 22 });
        });
    });
}

// --- Cups ---------------------------------------------------------------------------------------------------
function cups(game) {
    game.scene("cups", (s) => {
        game.touch.enabled = false;
        menuBack(s);
        snd(game).music("menu");
        const save = loadSave(game), u = unlocks(save);
        const redo = screen(s, (add, v) => {
            let y = topBar(game, s, add, v, "Cups");
            const w = Math.min(420, v.width - 28), cx = v.width / 2;
            const seg = (w - 12) / 3;
            CLASSES.forEach((c, i) => {
                const on = save.cls === c.id, can = classOpen(save, c.id);
                big(add, can ? c.name : "Locked", cx - seg - 6 + i * (seg + 6), y, seg, 50, on ? "#ffc233" : can ? CREAM : "#8d82a8", () => { if (can) { save.cls = c.id; commit(game); redo(); } }, { game, size: 15 });
            });
            y += 36;
            if (u.mirror) { big(add, save.mirror ? "Mirror: on" : "Mirror: off", cx, y + 12, 150, 50, save.mirror ? "#7fe3ff" : CREAM, () => { save.mirror = !save.mirror; commit(game); redo(); }, { game, size: 14 }); y += 58; }
            const sideBySide = v.height < 480;
            const h = sideBySide ? v.height - y - v.safe.bottom - 22 : (v.height - y - v.safe.bottom - 30) / 2;
            const w0 = w;
            CUPS.forEach((c, i) => {
                const can = i === 0 || u.clearance, rank = bestRank(save, c.id, save.cls);
                const cardH = Math.min(h, 170) - 12, w = sideBySide ? (v.width - v.safe.left - v.safe.right - 38) / 2 : w0;
                const yy = sideBySide ? y + 8 + cardH / 2 : y + 8 + (i + 0.5) * Math.min(h, 170), cx = sideBySide ? v.safe.left + 14 + w / 2 + i * (w + 10) : v.width / 2;
                const card = add(button("", { width: w, height: cardH, color: can ? CREAM : "#6f6488", radius: 18, onTap: () => { if (can) { snd(game).click(); runCup(game, i, 0, {}); } } }), pos(cx, yy), ui());
                card.child([text(c.name, { size: 21, bold: true, font: FONT, color: can ? INK : CREAM }), pos(0, -cardH / 2 + 22)]);
                if (!can) card.child([text("Finish top 3 in the Fresh Cup", { size: 14, bold: true, font: FONT, color: CREAM }), pos(0, 8)]);
                else c.tracks.forEach((id, n) => {
                    const th = Math.min(56, cardH - 74), tx = (n - 1) * (w / 3.2);
                    card.child([route(id, th), pos(tx, -cardH / 2 + 46 + th / 2)]);
                    card.child([text(trackById(id).name, { size: 12, bold: true, font: FONT, color: INK }), pos(tx, cardH / 2 - 13)]);
                });
                if (rank >= 1 && rank <= 3) card.child([sprite(`medal${rank - 1}`, { width: 36, height: 36 }), pos(w / 2 - 28, -cardH / 2 + 24)]);
            });
        });
    });
}

function trial(game) {
    game.scene("trial", (s) => {
        game.touch.enabled = false;
        menuBack(s);
        snd(game).music("menu");
        const save = loadSave(game);
        screen(s, (add, v) => {
            const y0 = topBar(game, s, add, v, "Time Trial"), cols = v.width > 560 ? 2 : 1, use = v.width - v.safe.left - v.safe.right - 28, w = Math.min(420, (use - (cols - 1) * 10) / cols), mid = v.safe.left + (v.width - v.safe.left - v.safe.right) / 2;
            const list = TRACKS, rows = Math.ceil(list.length / cols), h = Math.min(72, (v.height - y0 - v.safe.bottom - 34) / rows);
            list.forEach((t, i) => {
                const can = open(save, t), rec = save.tt[t.id], m = MEDALS[t.id];
                const col = i % cols, row = Math.floor(i / cols);
                const x = mid + (cols === 2 ? (col - 0.5) * (w + 10) : 0), y = y0 + row * h + h / 2 - 8;
                const card = add(button("", { width: w, height: h - 8, color: can ? CREAM : "#6f6488", radius: 14, onTap: () => { if (can) { snd(game).click(); game.go("race", { track: t.id, mode: "tt", cls: "trolley", racer: save.racer }, { fade: 0.2 }); } } }), pos(x, y), ui());
                if (can) card.child([route(t.id, h * 0.56), pos(-w / 2 + h * 0.5, 0)]);
                card.child([text(can ? t.name : "Locked", { size: 17, bold: true, font: FONT, color: can ? INK : CREAM }), pos(8, can ? -10 : 0)]);
                if (can) card.child([text(rec?.best ? `Best ${fmt(rec.best)}` : `Gold ${fmt(m[0])}`, { size: 13, bold: true, font: FONT, color: "#6d5a8e" }), pos(8, 12)]);
                const med = rec?.best ? m.findIndex((q) => rec.best <= q) : -1;
                if (med >= 0) card.child([sprite(`medal${med}`, { width: 38, height: 38 }), pos(w / 2 - 32, 0)]);
            });
        });
    });
    game.scene("ttdone", (s) => {
        game.touch.enabled = false;
        menuBack(s);
        const R = game.data.ttResult ?? { time: 80, lap: 26, best: true, args: { track: "aisle", mode: "tt", cls: "trolley", racer: "pip" } }, m = MEDALS[R.args.track], med = m.findIndex((q) => R.time <= q);
        snd(game).music(med >= 0 ? "win" : "lose");
        if (R.best) snd(game).finish(1);
        let t = 0;
        s.onUpdate((dt) => { t += dt; });
        s.onDrawUI((d) => {
            const v = s.view, wide = v.height < 480, cx = wide ? v.width * 0.34 : v.width / 2, y = wide ? v.safe.top + 32 : v.height * 0.2, pop = 1 + Math.max(0, 0.4 - t) * 1.5, k = wide ? 0.72 : 1;
            sticker(d, trackById(R.args.track).name, cx, y, 30 * k, "#ffc233");
            sticker(d, fmt(R.time), cx, y + 74 * k, 58 * pop * k, CREAM);
            d.text(`Best lap ${fmt(R.lap)}`, { x: cx, y: y + 126 * k, size: 17, bold: true, font: FONT, color: CREAM });
            if (R.best) sticker(d, R.prev ? "NEW RECORD!" : "FIRST RECORD!", cx, y + 162 * k, 24 * k, "#2ec4a6");
            if (med >= 0) d.sprite(`medal${med}`, { x: cx, y: y + 216 * k, width: 72 * k, height: 72 * k });
            else d.text(`Bronze is ${fmt(m[2])}`, { x: cx, y: y + 206 * k, size: 16, bold: true, font: FONT, color: CREAM });
            if (R.lapBest) d.text("Ghost saved: race it next time", { x: cx, y: y + 266 * k, size: 14, bold: true, font: FONT, color: "#7fe3ff" });
        });
        screen(s, (add, v) => {
            const wide = v.height < 480, w = Math.min(wide ? 220 : 280, v.width - 60), y = wide ? v.height / 2 - 34 : v.height - v.safe.bottom - 124, x = wide ? v.width * 0.76 : v.width / 2;
            big(add, "Go again", x, y, w, 58, "#ffc233", () => game.go("race", R.args, { fade: 0.2 }), { game, action: "confirm", size: 21 });
            big(add, "Tracks", x, y + 66, w, 52, CREAM, () => game.go("trial", undefined, { fade: 0.2 }), { game, action: "pause" });
        });
    });
}

// --- Racers -------------------------------------------------------------------------------------------------
function racers(game) {
    game.scene("racers", (s) => {
        game.touch.enabled = false;
        s.background = ["#3a2a6b", "#ff8a5c"];
        snd(game).music("menu");
        const save = loadSave(game);
        s.light.dir.set(-0.5, -1, -0.6); s.light.shadowRange = 14; s.light.fog = null;
        s.add([mesh("cylinder", { size: [9, 0.4, 9], color: "#4a3a8a", shadow: false }), pos(0, -0.2, 0)]);
        const cart = s.add([mesh("cart", { color: racerById(save.racer).color, shine: 0.25 }), pos(0, 0, 0)]);
        let rider = cart.child([mesh(`rider_${save.racer}`), pos(0, RIDER_Y, 0)]);
        for (const [x, z] of [[-0.58, -0.92], [0.58, -0.92], [-0.58, 0.92], [0.58, 0.92]]) cart.child([mesh("wheel"), pos(x, 0.24, z)]);
        let hop = 0;
        const pick = (r) => {
            if (!racerOpen(save, r)) { snd(game).bump(); return; }
            save.racer = r.id; commit(game);
            cart.color = r.color; rider.destroy(); rider = cart.child([mesh(`rider_${r.id}`), pos(0, RIDER_Y, 0)]);
            hop = 1; snd(game).got(); redo();
        };
        s.onUpdate((dt) => {
            cart.rot.y += dt * 0.9; hop = Math.max(0, hop - dt * 3);
            const portrait = s.view.height > s.view.width;
            cart.pos.y = Math.sin(hop * Math.PI) * 1.2; cart.scale = 1 + hop * 0.15;
            s.cam3.fov = portrait ? 56 : 38;
            s.cam3.pos.set(portrait ? 0 : 3.3, 2.6, portrait ? 7 : 10); s.cam3.target.set(portrait ? 0 : 3.3, portrait ? -1.4 : 0.6, 0);
        });
        const redo = screen(s, (add, v) => {
            const portrait = v.height > v.width, r = racerById(save.racer);
            topBar(game, s, add, v, "Racers");
            const w = portrait ? Math.min(v.width - 24, 420) : Math.min(v.width * 0.5, 320), cx = portrait ? v.width / 2 : v.width - v.safe.right - w / 2 - 12;
            const cols = 3, gap = 8, cell = (w - gap * 2) / cols, cellH = Math.min(cell, portrait ? 86 : 56);
            const grid = v.height - v.safe.bottom - 18 - cellH * 2 - gap;
            RACERS.forEach((q, i) => {
                const can = racerOpen(save, q), x = cx - w / 2 + cell / 2 + (i % cols) * (cell + gap), y = grid + cellH / 2 + Math.floor(i / cols) * (cellH + gap);
                add(button("", { width: cell, height: cellH, color: q.id === save.racer ? "#ffc233" : can ? CREAM : "#6f6488", radius: 14, onTap: () => pick(q) }), pos(x, y), ui());
                const e = add(sprite(`face_${q.id}`, { width: cellH * 0.74, height: cellH * 0.74 }), pos(x, y), ui());
                if (!can) { e.opacity = 0.35; }
            });
            // stat card
            const sy = grid - 128;
            add(ui(), pos(cx, sy + 50), { draw(d) { d.rect(w, 118, { color: INK, radius: 14, opacity: 0.82 }); } });
            label(add, r.name, cx, sy, 22, "#ffc233");
            add(text(r.bio, { size: 13, bold: true, font: FONT, color: CREAM }), pos(cx, sy + 20), ui());
            const stats = [["Speed", r.speed], ["Accel", r.accel], ["Grip", r.handling], ["Drift", r.drift], ["Weight", r.weight]];
            add(ui(), pos(0, 0), { draw(d) {
                stats.forEach(([n, f], i) => {
                    const yy = sy + 40 + i * 13, x0 = cx - w / 2 + 62, bw = w - 80;
                    d.text(n, { x: x0 - 30, y: yy, size: 11, bold: true, font: FONT, color: CREAM });
                    d.rect(bw, 8, { x: x0 + bw / 2, y: yy, color: INK, radius: 4, opacity: 0.6 });
                    d.rect(Math.max(10, bw * f), 8, { x: x0 + bw * f / 2, y: yy, color: r.color, radius: 4 });
                });
            } });
        });
    });
}

// --- Settings -----------------------------------------------------------------------------------------------
const CONTROL_NAMES = { drag: "Controls: Drag + buttons", buttons: "Controls: Left / Right", one: "Controls: One thumb" };
function settingsRows(game, add, cx, y, v, refresh, tight = false) {
    const save = loadSave(game), c = save.settings, w = Math.min(290, v.width - 40), H = tight ? 50 : 50, gap = tight ? 6 : 8;
    const row = (label_, fn) => { big(add, label_, cx, y, w, H, CREAM, () => { fn(); commit(game); snd(game).apply(); refresh(); }, { game, size: 15, quiet: true }); y += H + gap; };
    row(`Music: ${c.music ? "on" : "off"}`, () => { c.music = !c.music; if (!c.music) snd(game).stopMusic(); else snd(game).resumeMusic(); });
    row(`Sound: ${c.sfx ? "on" : "off"}`, () => { c.sfx = !c.sfx; });
    row(`Haptics: ${c.haptics ? "on" : "off"}`, () => { c.haptics = !c.haptics; game.haptics.enabled = c.haptics; if (c.haptics) game.haptic("medium"); });
    row(CONTROL_NAMES[c.control], () => { const m = ["drag", "buttons", "one"]; c.control = m[(m.indexOf(c.control) + 1) % 3]; });
    row(`Shadows: ${c.shadows ? "on" : "off"}`, () => { c.shadows = !c.shadows; });
    return y;
}
function settings(game) {
    game.scene("settings", (s) => {
        game.touch.enabled = false;
        menuBack(s);
        const redo = screen(s, (add, v) => {
            const y = topBar(game, s, add, v, "Settings");
            settingsRows(game, add, v.width / 2 + (v.height < 520 ? v.width * 0.12 : 0), v.height < 520 ? v.safe.top + 34 : y + 20, v, () => redo(), v.height < 520);
        });
    });
}

export function registerScenes(game) {
    title(game); race(game); results(game); podium(game); cups(game); trial(game); racers(game); settings(game);
}
