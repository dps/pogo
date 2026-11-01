// Gran's Garden Wall. Scenes and saves live here; the rules are sim.js and the play scene is play.js.
import { createGame, layer, pos, ui } from "./pogo.js";
import { ALMANAC, BOSSES, DEFS, ENDLESS_MAPS, LEVELS, SEASONS, unlockedAt } from "./data.js";
import { F, paintAll, spr } from "./art.js";
import { MUSIC, bindAudio } from "./audio.js";
import { paintCottage, paintGarden, paintPathGround } from "./world.js";
import { playScene } from "./play.js";
import { FONT, INK, btn, card, txt } from "./ui.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#2f4a32", "#22382a"],
    touch: { stick: false, buttons: [] },
    actions: {
        speed: ["KeyF"], cancel: ["Escape", "KeyX"], seed1: ["Digit1"], seed2: ["Digit2"], seed3: ["Digit3"], seed4: ["Digit4"], seed5: ["Digit5"], seed6: ["Digit6"], seed7: ["Digit7"], seed8: ["Digit8"], seed9: ["Digit9"],
        confirm: ["Enter", "Space", "pad:a"], pause: ["KeyP", "pad:start"],
    },
    seed: 11, maxDpr: 2,
});
game.touch.enabled = false;

// ---- Saves -----------------------------------------------------------------------------------------------------------
const FRESH = () => ({ stars: [], meta: {}, seen: {}, best: 0, endlessStars: 0, sound: true, haptics: true, lastLevel: 0, endlessUsed: 0 });
const G = { sfx: bindAudio(game), save: null };
function loadSave() {
    let s;
    try { s = game.load("garden-v1", null); } catch { s = null; }
    G.save = { ...FRESH(), ...(s ?? {}) };
    game.audio.muted = !G.save.sound;
    game.haptics.enabled = G.save.haptics;
}
G.commit = () => { try { game.save("garden-v1", G.save); } catch { /* storage blocked: progress lasts the session */ } };
G.starsWon = () => G.save.stars.reduce((n, v) => n + (v ?? 0), 0) + G.save.endlessStars;
G.starsSpent = () => ALMANAC.reduce((n, a) => n + (G.save.meta[a.id] ? a.cost : 0), 0);
G.starsFree = () => G.starsWon() - G.starsSpent();
G.reached = () => { let i = 0; while (i < LEVELS.length && (G.save.stars[i] ?? 0) > 0) i++; return Math.min(i, LEVELS.length - 1); };
G.play = (args) => game.go("play", args, { fade: 0.25 });
G.toMap = () => game.go("path", {}, { fade: 0.25 });
G.toggleSound = () => { G.save.sound = !G.save.sound; game.audio.muted = !G.save.sound; G.commit(); G.sfx("tap"); };
G.toggleHaptics = () => { G.save.haptics = !G.save.haptics; game.haptics.enabled = G.save.haptics; G.commit(); game.haptic("medium"); };

/** Record a finished game. Returns what the result screen needs to show. */
G.finish = (sim) => {
    const r = { newStars: 0, nextLevel: null, best: G.save.best, gained: 0 };
    if (sim.endless) {
        if (sim.wave > G.save.best) G.save.best = sim.wave;
        const want = Math.min(8, Math.floor(G.save.best / 10));
        r.gained = Math.max(0, want - G.save.endlessStars);
        r.newStars = r.gained;
        G.save.endlessStars = Math.max(G.save.endlessStars, want);
        r.best = G.save.best;
    } else if (sim.over === "win") {
        const i = sim.levelIndex, old = G.save.stars[i] ?? 0;
        r.newStars = Math.max(0, sim.stars - old);
        while (G.save.stars.length <= i) G.save.stars.push(0);
        G.save.stars[i] = Math.max(old, sim.stars);
        r.nextLevel = i + 1 < LEVELS.length ? i + 1 : null;
    }
    G.save.lastLevel = sim.levelIndex;
    G.commit();
    return r;
};

// ---- Title ----------------------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    game.touch.enabled = false;
    let t = 0;
    const V = () => game.view;
    const first = !G.save.seen.planted;
    paintGarden(game, 0, "spring", V().height >= V().width);
    paintCottage(game);
    const portrait = () => V().height >= V().width;
    const petals = [];
    for (let i = 0; i < 26; i++) petals.push({ x: game.fxRng.next(), y: game.fxRng.next(), s: 5 + game.fxRng.next() * 6, v: 0.03 + game.fxRng.next() * 0.04, r: game.fxRng.next() * 6, f: 4 + (i % 2) });
    const flies = [0, 1, 2].map((i) => ({ x: 0.2 + i * 0.3, y: 0.68, c: i, t: i * 2 }));
    const slugX = { v: 0.6 };

    s.onUpdate((dt) => {
        t += dt; slugX.v += dt * 0.022; if (slugX.v > 1.2) slugX.v = -0.2;
        for (const p of petals) { p.y += p.v * dt; p.x += Math.sin(t + p.r) * 0.02 * dt; p.r += dt; if (p.y > 1.05) p.y = -0.05; }
        for (const f of flies) f.t += dt;
    });
    s.onDraw((d) => {
        const v = V(), W = v.width, H = v.height, P = portrait();
        // Sky, hills, cottage, lawn: painted back to front.
        const lawnY = P ? H * 0.5 : H * 0.62;
        const cs = P ? W / 430 : W * 1.03 / 720;
        const cotW = 720 * cs, cotH = 300 * cs, cx = P ? W * 0.25 + 248 * cs : W / 2, cy = lawnY - cotH / 2 + 2;
        d.sprite("garden", { x: W / 2, y: lawnY + (H - lawnY) / 2 - 20, width: Math.max(W * 1.3, (H - lawnY) * 1.4), height: H - lawnY + 230 });
        d.rect(W + 4, lawnY + 4, { x: W / 2, y: lawnY / 2, color: "#cfe6e9" });
        d.rect(W + 4, lawnY * 0.5, { x: W / 2, y: lawnY * 0.75, color: "#f4ecd2", opacity: 0.55 });
        for (let i = 0; i < 5; i++) spr(d, "glow", 0, ((i * 137 + t * 5) % (W + 240)) - 120, 24 + (i * 47) % (lawnY * 0.4), 220, 62, { color: "#ffffff", opacity: 0.9 });
        spr(d, "glow", 0, W * 0.2, lawnY - 8, W * 1.1, 90, { color: "#7fa86a", opacity: 0.9 });
        spr(d, "glow", 0, W * 0.8, lawnY - 4, W * 1.2, 70, { color: "#5f8a4b", opacity: 0.8 });
        d.sprite("cottage", { x: cx, y: cy, width: cotW, height: cotH });
        // Gran waves from the window
        const wx = cx - cotW / 2 + 112 * cs, wy = cy - cotH / 2 + 186 * cs, sz = 150 * cs;
        spr(d, "gran", Math.sin(t * 1.2) > 0.2 ? 3 : ((t * 2.6) | 0) % 2, wx, wy + 8 * cs + Math.sin(t * 1.6) * 1.2, sz, sz);
        d.rect(174 * cs, 15 * cs, { x: wx, y: wy + 72 * cs, color: "#6d4c33", radius: 3 });
        d.rect(174 * cs, 3 * cs, { x: wx, y: wy + 66 * cs, color: "#a57a4d", radius: 2 });
        spr(d, "cat", Math.sin(t * 0.5) > 0.7 ? 1 : 0, wx + 50 * cs, wy + 50 * cs, 60 * cs);
        for (let i = 0; i < 11; i++) { const x = (i + 0.5) / 11 * W, sway = Math.sin(t * 1.4 + i) * 0.06; d.push(); d.translate(x, lawnY + 12); d.rotate(sway); spr(d, "flower", [0, 3, 5, 8, 1, 7, 2, 9, 6, 15, 4][i], 0, -18, P ? 48 : 40); d.pop(); }
        const my = P ? H * 0.615 : H * 0.74, ms = P ? Math.min(W * 0.46, 180) : 96, mx = P ? W * 0.5 : W * 0.25;
        spr(d, "glow", 0, mx, my + ms * 0.4, ms * 1.5, ms * 0.4, { color: "#23304a", opacity: 0.2 });
        spr(d, "marrow", 0, mx, my, ms);
        spr(d, "gnome", 3, P ? W * 0.14 : W * 0.09, my + ms * 0.12, P ? ms * 0.56 : 62);
        spr(d, "hive", 0, P ? W * 0.86 : W * 0.8, my + ms * 0.08, P ? ms * 0.52 : 62);
        const crawl = my + ms * 0.48;
        spr(d, "slug", ((t * 4) | 0) & 1, W * slugX.v, crawl, 60);
        spr(d, "snail", ((t * 2) | 0) & 1, W * (slugX.v - 0.16), crawl + 4, 62);
        spr(d, "ant", ((t * 9) | 0) & 1, W * (slugX.v - 0.3), crawl + 12, 30);
        spr(d, "ant", ((t * 9) | 0) & 1, W * (slugX.v - 0.35), crawl + 15, 30);
        const wallY = H - 26, wn = Math.ceil(W / 58) + 1;
        for (let i = 0; i < wn; i++) spr(d, "wall", i % 3, i * 58 - 8, wallY, 70);
        spr(d, "robin", ((t * 0.7) | 0) % 3 === 0 ? 1 : 0, W * 0.22, wallY - 34, 34, 34);
        for (const f of flies) spr(d, "butterfly", f.c * 2 + (((f.t * 9) | 0) & 1), W * (f.x + Math.sin(f.t * 0.7) * 0.14), H * (f.y + Math.cos(f.t * 0.9) * 0.1), 26);
        for (const p of petals) spr(d, "leaf", p.f, p.x * W, p.y * H, p.s, p.s, { rot: p.r, opacity: 0.9 });
    });
    const logo = s.add([ui(), pos(0, 0), layer(2), { name: "logo", draw(d) {
        const v = V(), P = portrait(), x = v.width / 2, y = P ? v.safe.top + Math.max(66, v.height * 0.125) : v.safe.top + 52, sz = P ? Math.min(46, v.width / 8) : 40;
        const wob = Math.sin(t * 1.6) * 1.5;
        for (const [dx, dy] of [[-2.5, 0], [2.5, 0], [0, -2.5], [0, 2.5], [-2, -2], [2, 2], [-2, 2], [2, -2], [0, 5], [2, 5], [-2, 5]]) { d.text("Gran's", { x: x + dx, y: y - sz * 0.6 + dy + wob, size: sz * 0.76, bold: true, font: FONT, color: INK }); d.text("Garden Wall", { x: x + dx, y: y + sz * 0.34 + dy + wob, size: sz, bold: true, font: FONT, color: INK }); }
        d.text("Gran's", { x, y: y - sz * 0.6 + wob, size: sz * 0.76, bold: true, font: FONT, color: "#ffd98a" });
        d.text("Garden Wall", { x, y: y + sz * 0.34 + wob, size: sz, bold: true, font: FONT, color: "#fff6dc" });
    } }]);
    void logo;
    const go = () => { G.sfx("tap"); game.music(MUSIC.title); if (first) G.play({ level: 0 }); else G.toMap(); };
    const play = btn(game, s, { name: "play", w: 200, h: 62, label: first ? "Plant something" : "To the garden", size: 20, fill: "#5f8a4b", action: "confirm", onTap: go });
    const sound = btn(game, s, { name: "sound", w: 46, h: 46, fill: "#6f8fa8", onTap: () => G.toggleSound(), art: (d) => spr(d, "i_sound", game.audio.muted ? 1 : 0, 0, 0, 26) });
    const buzz = btn(game, s, { name: "buzz", w: 46, h: 46, fill: "#6f8fa8", onTap: () => G.toggleHaptics(), art: (d) => spr(d, "i_buzz", game.haptics.enabled ? 0 : 1, 0, 0, 26) });
    const place = () => {
        const v = V(), P = portrait();
        play.pos.set(v.width / 2, P ? v.height * 0.8 : v.height - v.safe.bottom - 40, 0);
        const b = v.height - v.safe.bottom - 30;
        sound.pos.set(v.width - v.safe.right - 80, v.safe.top + 30, 0);
        buzz.pos.set(v.width - v.safe.right - 30, v.safe.top + 30, 0);
    };
    place();
    s.on("resize", () => { paintGarden(game, 0, "spring", portrait()); place(); });
});

// ---- The garden path: level select ----------------------------------------------------------------------------------------------
game.scene("path", (s) => {
    game.touch.enabled = false;
    paintPathGround(game);
    const seasons = ["spring", "summer", "autumn", "winter"];
    const tint = { spring: "#d4e6b0", summer: "#ece3a0", autumn: "#ecc088", winter: "#e0ecf2" };
    const V = () => game.view;
    let scroll = 0, target = null, t = 0, dragY = null, vel = 0, moved = 0;
    const reached = G.reached();
    const GAP = 74;
    const nodePos = (i) => {
        const v = V(), wid = Math.min(v.width, 460), cx = v.width / 2;
        return [cx + Math.sin(i * 1.15) * (wid * 0.3), 150 + (LEVELS.length - 1 - i) * GAP + Math.floor((LEVELS.length - 1 - i) / 5) * 34];
    };
    const totalH = () => nodePos(0)[1] + 150;
    const clampScroll = () => { scroll = Math.max(0, Math.min(scroll, Math.max(0, totalH() - V().height))); };
    const focus = (i) => { scroll = nodePos(i)[1] - V().height * 0.56; clampScroll(); };
    focus(reached);

    const inView = (i) => { const y = nodePos(i)[1] - scroll; return y > 31 + V().safe.top && y < V().height - V().safe.bottom - 31; };
    const nodes = LEVELS.map((lv, i) => {
        const locked = i > reached, boss = lv.force && Object.values(lv.force).flat().some((f) => BOSSES[f[0]]);
        const e = btn(game, s, {
            name: `level${i + 1}`, w: 58, h: 58, fill: tint[lv.season], ink: true, radius: 29, layer: 2, visible: () => inView(i), onTap: () => {
                if (moved > 12) return;
                if (locked) { G.sfx("nope"); return; }
                G.sfx("tap"); G.play({ level: i });
            },
            art: (d) => {
                const stars = G.save.stars[i] ?? 0, cur = i === reached;
                if (cur) d.circle(36 + Math.sin(t * 4) * 2, { color: "#ffe08a", opacity: 0.8, outline: 3 });
                if (locked) spr(d, "i_lock", 0, 0, 0, 30);
                else if (boss) { const b = BOSSES[lv.force[Math.max(...Object.keys(lv.force).map(Number))][0][0]]; spr(d, b.sprite, 0, 0, -3, 46); }
                else txt(d, String(i + 1), 0, -3, 22, INK, true);
                if (!locked) for (let k = 0; k < 3; k++) spr(d, "star", k < stars ? 0 : 1, (k - 1) * 16, 24, 17);
            },
        });
        return e;
    });

    const placeNodes = () => nodes.forEach((e, i) => { const [x, y] = nodePos(i); e.pos.set(x, y - scroll, 0); e.hidden = !inView(i); });
    placeNodes();
    s.onDraw((d) => {
        const v = V();
        // One painted ground, spring at the bottom and winter at the top, with a winding path through it.
        const bandY = (i) => nodePos(i)[1] - scroll;
        const th = Math.max(totalH() + 200, v.height + 200);
        d.sprite("pathground", { x: v.width / 2, y: th / 2 - scroll - 100, width: Math.max(v.width, 360) + 8, height: th });
        for (let i = 0; i + 1 < LEVELS.length; i++) {
            const [ax, ay] = nodePos(i), [bx, by] = nodePos(i + 1);
            const steps = 10;
            for (let j = 0; j <= steps; j++) { const k = j / steps, x = ax + (bx - ax) * k, y = ay + (by - ay) * k - scroll; if (y < -20 || y > v.height + 20) continue; d.circle(8.5, { x, y, color: i < reached ? "#f0e3c2" : "#7a6a54", opacity: i < reached ? 1 : 0.5 }); }
        }
        // Scenery along the way
        for (let i = 0; i < LEVELS.length; i++) {
            const [x, y] = nodePos(i), season = LEVELS[i].season, yy = y - scroll, side = x > v.width / 2 ? -1 : 1;
            if (yy < -60 || yy > v.height + 60) continue;
            const ox = x + side * Math.min(v.width * 0.42, 150), sway = Math.sin(t * 1.3 + i) * 0.05;
            if (i % 2 === 0) spr(d, "tree", seasons.indexOf(season), ox, yy - 6, 92);
            else spr(d, "hedge", 0, ox, yy, 54);
            const f = { spring: 0, summer: 5, autumn: 12, winter: 11 }[season];
            for (let k = 0; k < 3; k++) { d.push(); d.translate(x - side * (46 + k * 16), yy + 34 + k * 3); d.rotate(sway + k * 0.03); spr(d, "flower", f + (season === "winter" ? 0 : k % 2), 0, -13, 30); d.pop(); }
        }
        for (let k = 0; k < 4; k++) {
            const y = bandY(k * 5 + 4) - 44;
            if (y < -30 || y > v.height + 30) continue;
            card(d, v.width / 2, y, 130, 28, "#f6ecd2", 8);
            txt(d, SEASONS[seasons[k]].name, v.width / 2, y, 15, INK, true);
        }
    });
    s.onUpdate((dt) => {
        t += dt;
        const p = s.input.pointer, raw = game.input._raw ? game.input._raw() : p;
        if (raw.pressed) { dragY = raw.y; moved = 0; vel = 0; }
        if (dragY !== null && (raw.down ?? p.down ?? true)) { const dy = raw.y - dragY; scroll -= dy; moved += Math.abs(dy); vel = -dy; dragY = raw.y; }
        if (raw.released) dragY = null;
        if (dragY === null) { scroll += vel; vel *= 0.92; }
        if (s.input.wheel) scroll += s.input.wheel;
        clampScroll();
        placeNodes();
    });

    // Header
    s.add([ui(), pos(0, 0), layer(10), { name: "pathHud", draw(d) {
        const v = V(), top = v.safe.top + 4;
        d.rect(v.width, top + 56, { x: v.width / 2, y: (top + 56) / 2, color: "#f6ecd2" });
        d.rect(v.width, 2.5, { x: v.width / 2, y: top + 56, color: INK });
        txt(d, "The Garden Path", (v.width - 46) / 2, top + 26, Math.min(20, v.width / 21), INK, true);
    } }]);
    const free = () => G.starsFree();
    const back = btn(game, s, { name: "back", w: 44, h: 44, icon: "i_back", fill: "#8a6a48", layer: 11, onTap: () => { G.sfx("tap"); game.go("title", {}, { fade: 0.2 }); } });
    const book = btn(game, s, { name: "almanac", w: 96, h: 44, fill: "#5f8a4b", layer: 11, onTap: () => { G.sfx("tap"); game.go("almanac", {}, { fade: 0.2 }); }, art: (d, e) => {
        spr(d, "i_book", 0, -28, 0, 28); spr(d, "star", 0, 8, 0, 20); txt(d, String(free()), 30, 0, 16, "#fff6e0", true);
        if (free() > 0) d.circle(52 + Math.sin(t * 5) * 2, { color: "#ffe08a", opacity: 0.0 });
        void e;
    } });
    const endlessOpen = () => G.reached() >= 5;
    const endless = btn(game, s, { name: "endless", w: 150, h: 46, fill: "#6f8fa8", layer: 11, onTap: () => {
        if (!endlessOpen()) { G.sfx("nope"); return; }
        G.sfx("tap"); G.save.endlessUsed = (G.save.endlessUsed + 1) % ENDLESS_MAPS.length; G.commit();
        G.play({ endless: ENDLESS_MAPS[G.save.endlessUsed] });
    }, art: (d, e) => {
        spr(d, endlessOpen() ? "i_infinity" : "i_lock", 0, -e.size.x / 2 + 22, 0, 26);
        txt(d, endlessOpen() ? (G.save.best ? `Endless: ${G.save.best}` : "Endless") : "Beat 5 gardens", 16, 0, 13.5, "#fff6e0", true, 0, 104);
    } });
    const place = () => {
        const v = V(), top = v.safe.top + 30;
        back.pos.set(v.safe.left + 30, top, 0);
        book.pos.set(v.width - v.safe.right - 54, top, 0);
        endless.pos.set(v.width / 2, v.height - v.safe.bottom - 32, 0);
    };
    place();
    s.on("resize", () => { place(); clampScroll(); });
    game.music(MUSIC.title);
});

// ---- Gran's Almanac: the meta tree -------------------------------------------------------------------------------------------------
game.scene("almanac", (s) => {
    game.touch.enabled = false;
    const V = () => game.view;
    let t = 0, sel = null, flashT = 0;
    const box = () => {
        const v = V(), top = v.safe.top + 66, bottom = v.height - v.safe.bottom - 96;
        const left = v.safe.left + 8, w = v.width - v.safe.left - v.safe.right - 16;
        return { left, top, w, h: bottom - top };
    };
    const at = (n) => { const b = box(); return [b.left + 30 + n.x * (b.w - 60) * 1, b.top + 24 + n.y * (b.h - 44)]; };
    const owned = (id) => id === "root" || !!G.save.meta[id];
    const avail = (n) => n.parent && owned(n.parent) && !owned(n.id);
    const nodes = ALMANAC.map((n) => {
        const e = btn(game, s, {
            name: n.id, w: 46, h: 46, radius: 23, fill: "#f6ecd2", ink: true, layer: 3, onTap: () => { sel = n; G.sfx("tap"); },
            art: (d) => {
                if (owned(n.id)) { d.circle(19, { color: "#8fbf5a" }); }
                else if (!avail(n)) d.circle(19, { color: "#c9bda6" });
                if (sel === n) d.circle(25, { color: "#ffe08a", outline: 3 });
                if (n.id === "root") spr(d, "i_book", 0, 0, 0, 30);
                else if (owned(n.id)) spr(d, "leaf", 0, 0, 0, 0);
                if (n.id !== "root" && !owned(n.id)) { spr(d, "star", avail(n) && G.starsFree() >= n.cost ? 0 : 1, -7, 0, 18); txt(d, String(n.cost), 10, 0, 15, INK, true); }
                if (n.id !== "root" && owned(n.id)) spr(d, "star", 0, 0, 0, 22);
            },
        });
        return e;
    });
    const buy = btn(game, s, { name: "buy", w: 120, h: 46, fill: "#5f8a4b", layer: 5, visible: () => sel && avail(sel), labelFn: () => (sel ? `Grow it (${sel.cost})` : ""), onTap: () => {
        if (!sel || !avail(sel)) return;
        if (G.starsFree() < sel.cost) { G.sfx("nope"); flashT = 0.4; return; }
        G.save.meta[sel.id] = 1; G.commit(); G.sfx("upgrade");
    } });
    const reset = btn(game, s, { name: "refund", w: 96, h: 40, label: "Refund all", size: 13, fill: "#9a5a3c", layer: 5, onTap: () => { G.save.meta = {}; sel = null; G.commit(); G.sfx("sell"); } });
    const back = btn(game, s, { name: "back", w: 44, h: 44, icon: "i_back", fill: "#8a6a48", layer: 11, onTap: () => { G.sfx("tap"); G.toMap(); } });

    s.onUpdate((dt) => { t += dt; if (flashT > 0) flashT -= dt; });
    s.add([ui(), pos(0, 0), layer(-1), { name: "page", draw(d) {
        const v = V(), b = box();
        d.rect(v.width + 4, v.height + 4, { x: v.width / 2, y: v.height / 2, color: "#e9dfc6" });
        for (let i = 0; i < 14; i++) d.rect(v.width, 1, { x: v.width / 2, y: 40 + i * ((v.height - 40) / 14), color: "#c9b48a", opacity: 0.35 });
        // Vines, drawn as thick bean stems
        for (const n of ALMANAC) if (n.parent) {
            const p = ALMANAC.find((q) => q.id === n.parent), [ax, ay] = at(n), [bx, by] = at(p), on = owned(n.id);
            d.line([ax, ay], [bx, by], { width: on ? 7 : 4, color: on ? "#5f8a4b" : "#b9ad90" });
            if (on) { const mx = (ax + bx) / 2, my = (ay + by) / 2; spr(d, "flower", 10, mx, my - 4, 22); }
        }
        const headY = at({ x: 0, y: 0.17 })[1];
        for (const [name, x] of [["Thrift", 0.165], ["Green Fingers", 0.5], ["Stubborn", 0.835]]) txt(d, name, at({ x, y: 0 })[0], name === "Green Fingers" ? headY - 62 : headY + 6, 13, "#5f7a45", true);
        const top = v.safe.top + 4;
        txt(d, "Gran's Almanac", v.width / 2, top + 26, Math.min(22, v.width / 17), INK, true);
        spr(d, "star", 0, v.width - v.safe.right - 62, top + 26, 26);
        txt(d, `${G.starsFree()}`, v.width - v.safe.right - 32, top + 26, 20, flashT > 0 ? "#b5392c" : INK, true);
        void b;
        const w = Math.min(v.width - 20, 460), y = v.height - v.safe.bottom - 48;
        card(d, v.width / 2, y, w, 84, "#f6ecd2", 10);
        const n = sel;
        const tx = v.width / 2 - 66;
        if (n) { txt(d, n.name, tx, y - 22, 15, INK, true, 0, w - 170); txt(d, n.desc, tx, y + 10, 12.5, "#5a4432", false, w - 170); }
        else { txt(d, "Tap a leaf to read it.", tx, y - 8, 14, INK, true, 0, w - 170); txt(d, `Stars come from gardens. You've won ${G.starsWon()}.`, tx, y + 14, 12, "#5a4432", false, w - 170); }
    } }]);
    const place = () => {
        const v = V(), y = v.height - v.safe.bottom - 48, w = Math.min(v.width - 20, 460), rx = v.width / 2 + w / 2 - 66;
        buy.pos.set(rx, y + 16, 0); reset.pos.set(rx, y - 18, 0);
        buy.size.set(116, 44, 0); reset.size.set(116, 34, 0);
        back.pos.set(v.safe.left + 30, v.safe.top + 30, 0);
        nodes.forEach((e, i) => { const [x, yy] = at(ALMANAC[i]); e.pos.set(x, yy, 0); });
    };
    place();
    s.on("resize", place);
});

game.scene("play", (s, args) => {
    game.touch.enabled = false;
    playScene(game, s, args ?? { level: 0 }, G);
});

// ---- Boot -----------------------------------------------------------------------------------------------------------------------------
function boot() {
    loadSave();
    if (globalThis.document) { const l = document.getElementById("loading"); if (l) l.remove(); }
}
const browser = typeof document !== "undefined";
if (browser) {
    const bar = document.getElementById("bar");
    const painted = paintAll(game, (k) => { if (bar) bar.style.width = `${Math.round(k * 100)}%`; });
    game.assets.pending.push(painted);
    paintCottage(game);
    loadSave();
    game.start("title").then(boot);
} else {
    paintAll(game, null, true);
    paintCottage(game);
    loadSave();
    game.start("title");
}

// For tools: buy whatever the tree allows, cheapest first.
globalThis.__garden = {
    G,
    spendAll() {
        for (const n of [...ALMANAC].sort((a, b) => a.cost - b.cost)) {
            if (n.id === "root" || G.save.meta[n.id] || n.cost > G.starsFree()) continue;
            if (n.parent !== "root" && !G.save.meta[n.parent]) continue;
            G.save.meta[n.id] = 1;
        }
        G.commit();
    },
};
export { DEFS, F, unlockedAt };
