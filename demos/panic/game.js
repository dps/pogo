// FIVE SECOND PANIC! A frantic chain of tiny games hosted by a very stressed alarm clock.
import { Rng, createGame, tap, ui } from "./pogo.js";
import { C, INK, HOST_FACE, bubble, ensurePat, fit, paintFont, paintHost } from "./ink.js";
import { Driver, GAMES, Micro, artKey, byId, ensureArt } from "./engine.js";
import { Director, TOP_SPEED, drawPage, drawStarburst, layoutPage } from "./show.js";
import { popButton } from "./ui.js";
import { WIPES } from "./wipes.js";
import { JINGLE, MENU, PARTY } from "./audio.js";
import { AVATARS, LISTS, PARTY_NAMES, loadSave, store, weekIndex } from "./meta.js";
import "./games/tap.js";
import "./games/swipe.js";
import "./games/hold.js";
import "./games/drag.js";
import "./games/rub.js";
import "./games/pinch.js";
import "./games/brain.js";
import "./games/timing.js";
import "./games/boss.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: C.pink,
    touch: { stick: false, buttons: [] },
    actions: { kl: ["ArrowLeft", "KeyA", "pad:left"], kr: ["ArrowRight", "KeyD", "pad:right"], ku: ["ArrowUp", "KeyW", "pad:up"], kd: ["ArrowDown", "KeyS", "pad:down"], kgo: ["Space", "pad:a"] },
    seed: 5, maxDpr: 2,
});
paintFont(game.assets); paintHost(game.assets);
globalThis.document?.getElementById?.("load")?.remove?.();

const save = loadSave(game);
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;
const persist = () => store(game, save);
const regular = GAMES.filter((g) => !g.boss), bosses = GAMES.filter((g) => g.boss);
const speedLabel = (v) => "x" + (Math.round(v * 10) / 10);
const menuMusic = () => { if (game.data.tune !== "menu") { game.data.tune = "menu"; game.music(MENU); } };
const stopTune = () => { game.data.tune = null; };

// ---------------------------------------------------------------------------- run recipes
function showRun(seed) {
    const rng = new Rng(seed), easy = rng.shuffle(regular.filter((g) => g.easy)).slice(0, 5), bag = rng.shuffle(regular.filter((g) => !easy.includes(g))), boss = rng.shuffle([...bosses]);
    const order = [...easy, ...bag];
    const speedAt = (n) => Math.min(TOP_SPEED, 1 + Math.floor(n / 5) * 0.13);
    return {
        mode: "show", seed, save, lives: 4, bossSpeed: 1.5, speedAt, levelAt: (n) => Math.min(1, n / 50),
        next(dir) {
            const n = dir.n;
            if ((n + 1) % 10 === 0) return boss[(Math.floor(n / 10)) % boss.length];
            const i = n - Math.floor(n / 10);
            return order[i % order.length];
        },
        interstitial(dir, def) {
            const n = dir.n;
            if (def.boss) return { t: 1.5, kind: "boss", color: C.red };
            if (n && n % 10 === 0) return { t: 1.3, kind: "clear", act: n / 10, color: C.grn };
            if (n && n % 5 === 0 && speedAt(n) > speedAt(n - 1)) return { t: 1.1, kind: "faster", color: C.org };
            return null;
        },
        ended: (dir) => dir.n >= 49,
        finish(dir, quit) { over(dir, { mode: "show", cleared: dir.n >= 49 && dir.lives > 0, quit }); },
    };
}
function weeklyRun() {
    const w = weekIndex(), rng = new Rng(w * 977 + 11), pick = rng.shuffle([...regular]).slice(0, 27), boss = rng.shuffle([...bosses]);
    return {
        mode: "weekly", week: w, seed: w, save, lives: 3, bossSpeed: 1.5, speedAt: (n) => Math.min(TOP_SPEED, 1 + n * 0.04), levelAt: (n) => Math.min(1, n / 30),
        next: (dir) => ((dir.n + 1) % 10 === 0 ? boss[Math.floor(dir.n / 10) % boss.length] : pick[dir.n - Math.floor(dir.n / 10)]),
        interstitial: (dir, def) => (def.boss ? { t: 1.5, kind: "boss", color: C.red } : null),
        ended: (dir) => dir.n >= 29,
        finish(dir, quit) { over(dir, { mode: "weekly", cleared: dir.n >= 29 && dir.lives > 0, quit }); },
    };
}
function listRun(list) {
    const seed = (Date.now() % 1e6) | 0, set = new Rng(seed).shuffle(GAMES.filter((g) => g.tags.includes(list.tag))).slice(0, list.tag === "boss" ? 6 : 12);
    return {
        mode: "list", list, seed, save, lives: 3, speedAt: (n) => Math.min(TOP_SPEED, 1 + n * 0.09), bossSpeed: 1.5, levelAt: (n) => n / Math.max(1, set.length - 1),
        next: (dir) => set[dir.n], interstitial: (dir, def) => (def.boss ? { t: 1.2, kind: "boss", color: C.red } : null),
        ended: (dir) => dir.n >= set.length - 1,
        finish(dir, quit) { over(dir, { mode: "list", list, cleared: dir.n >= set.length - 1 && dir.lives > 0, quit }); },
    };
}
function freeRun(def, speed) {
    return { mode: "free", save, lives: 1, endless: true, seed: (Date.now() % 1e6) | 0, speedAt: () => speed, levelAt: () => (speed - 1) / (TOP_SPEED - 1), next: () => def, finish: () => game.go("games", {}, { fade: 0.15 }) };
}
function partyRun(players) {
    const seed = (Date.now() % 1e6) | 0, rng = new Rng(seed), rounds = 3, perTurn = 3, pool = rng.shuffle(regular.filter((g) => !g.tags.includes("nomob"))), sets = [];
    for (let r = 0; r < rounds; r++) sets.push(pool.slice(r * perTurn, (r + 1) * perTurn));
    const P = { players, turn: 0, round: 0, i: 0, needHand: true, needBoard: false };
    const speeds = [1, 1.35, 1.7];
    const hand = () => ({ wait: true, kind: "handoff", player: players[P.turn], round: P.round + 1, color: players[P.turn].color === C.yel ? C.org : players[P.turn].color, button: "READY!" });
    return {
        mode: "party", save, lives: 1, endless: true, party: P, seed, speedAt: () => speeds[Math.min(P.round, 2)], levelAt: () => P.round / 2,
        microSeed: () => seed + P.round * 100 + P.i,
        next() {
            if (P.i === perTurn) {
                P.i = 0; P.turn++; P.needHand = true;
                if (P.turn === players.length) { P.turn = 0; P.round++; P.needBoard = true; if (P.round === rounds) return null; }
            }
            return sets[P.round][P.i++];
        },
        interstitial(dir) {
            if (P.needBoard) { P.needBoard = false; P.needHand = false; return { wait: true, kind: "board", color: C.pur, button: "NEXT ROUND", buttonColor: C.pink, done: () => dir.setHold(hand()) }; }
            if (P.needHand) { P.needHand = false; return hand(); }
            return { t: 0.4, kind: "blank" };
        },
        finish(dir, quit) { if (quit) game.go("title", {}, { fade: 0.2 }); else { save.party++; persist(); game.go("podium", { players }, { fade: 0.2 }); } },
    };
}
function over(dir, o) {
    const res = { ...o, week: dir.cfg.week, score: dir.score, wins: dir.wins, n: dir.n + 1, fresh: false };
    if (o.mode === "show") { if (dir.score > save.best) { save.best = dir.score; res.fresh = true; } save.bestRun = Math.max(save.bestRun, dir.wins); if (o.cleared) save.cleared++; }
    if (o.mode === "weekly") { const k = dir.cfg.week; if (dir.score > (save.weekly[k] ?? 0)) { save.weekly[k] = dir.score; res.fresh = true; } }
    if (o.mode === "list") { const k = o.list.id, b = save.lists[k] ?? { best: 0, cleared: false }; if (dir.score > b.best) { b.best = dir.score; res.fresh = true; } if (o.cleared) b.cleared = true; save.lists[k] = b; }
    save.played++;
    persist();
    if (o.quit) return game.go("title", {}, { fade: 0.2 });
    game.go("over", res, { fade: 0.2 });
}
function startRun(cfg) { stopTune(); game.go("run", { cfg }, { fade: 0.12 }); }

// ---------------------------------------------------------------------------- scenes
game.scene("run", (s, a) => {
    game.touch.enabled = false;
    const dir = new Director(game, s, a.cfg);
    game.panic.dir = dir;
    let bot = null, cur = null;
    s.onUpdate((dt) => {
        // ?auto lets the proof bot play the show live, for real-time checks and attract footage.
        if (game.panic.auto && dir.state === "play") { if (dir.m !== cur) { bot?.end(); cur = dir.m; bot = new Driver(game, { mode: "mouse" }); bot.begin(cur); } bot.step(cur); }
        if (game.panic.auto && dir.holdUi?.length) dir.holdUi[0].emit("tap");
        dir.update(dt);
    });
    s.onDraw((d) => dir.draw(d));
});
game.scene("play", (s, a) => { startRun(showRun(a?.seed ?? 1)); });

/** One microgame, no ceremony: for the proof bot and screenshots. */
game.scene("lab", (s, a) => {
    game.touch.enabled = false;
    const L = layoutPage(s); ensurePat(game.assets, "dots");
    const m = game.panic.m = new Micro(game, s, byId[a.id], { speed: a.speed ?? 1, level: a.level ?? 0, seed: a.seed ?? 1, panel: L.panel, keyboard: a.keyboard });
    game.panic.m = m;
    s.onUpdate((dt) => { if (!a.frozen) m.update(dt); });
    s.onDraw((d) => { m.draw(d); drawPage(d, L, m.def.bg?.[1] ?? C.pink, "dots", 0); });
});

/** A contact sheet of microgames, for looking at all the art at once. */
game.scene("sheet", (s, a) => {
    game.touch.enabled = false;
    const page = a.page ?? 0, cols = a.cols ?? 4, rows = a.rows ?? 3, list = GAMES.slice(page * cols * rows, (page + 1) * cols * rows), { width: W, height: H } = s.view, k = Math.min(W / cols, H / rows) / 344;
    const ms = list.map((def, i) => { const m = new Micro(game, s, def, { speed: 1, seed: 3, panel: { cx: 170, cy: 170, w: 340, h: 340 } }); m.nopat = true; for (let n = 0; n < (a.steps ?? 50) && !m.done; n++) m.update(1 / 60); return m; });
    s.onDraw((d) => { d.rect(W, H, { x: W / 2, y: H / 2, color: INK }); ms.forEach((m, i) => { d.push(); d.translate((i % cols) * 344 * k, Math.floor(i / cols) * 344 * k); d.scale(k, k); m.draw(d); d.text(m.def.verb, { x: 60, y: 14, size: 22, bold: true, color: C.wht }); d.pop(); }); });
});

/** All twelve wipes side by side, for checking they really cover the screen. */
game.scene("wipes", (s, a) => {
    game.touch.enabled = false;
    const { width: W, height: H } = s.view, cols = 4, q = W / cols / 360, ch = 640 * q;
    s.onDraw((d) => { d.rect(W, H, { x: W / 2, y: H / 2, color: C.wht }); WIPES.forEach((fn, i) => { d.push(); d.translate((i % cols) * 360 * q + 2, Math.floor(i / cols) * ch * 0.5); d.scale(q * 0.96, q * 0.48); fn(d, a.k ?? 0.6, 362, 642, C.cyan, C.yel); d.pop(); }); });
});

/** The launcher image: the whole cast crashing through the logo. */
game.scene("poster", (s) => {
    game.touch.enabled = false;
    const cast = [["fight", "kaiju", -0.1], ["honk", "clown", 0.12], ["slice", "pickle", 0.4], ["shove", "cat", -0.15], ["pet", "bun", 0.1], ["dance", "hen", -0.1], ["swat", "fly", 0.2], ["wrestle", "squid", 0.1], ["peel", "nana", -0.5], ["jump", "cheese", 0.3], ["snap", "squatch", 0.1], ["hug", "cactus", 0.14], ["lasso", "sofa", -0.2], ["bonk", "gopher", 0]];
    for (const [id] of cast) ensureArt(game, byId[id]);
    const st = backdrop(s, C.pink);
    s.onDraw((d) => {
        const { width: W, height: H } = s.view, t = 2, spot = [[80, 130, 1], [W - 90, 130, 0.9], [46, H - 70, 0.42], [W - 150, H - 70, 0.72], [205, H - 62, 0.56], [W - 44, 62 + 170, 0.55], [262, 26, 0.5], [W - 240, H - 44, 0.7], [18, 250, 0.3], [W - 30, H - 60, 0.6], [146, H - 74, 0.5], [W - 250, 44, 0.42], [W * 0.34, 48, 0.42], [W * 0.64, H - 40, 0.42]];
        cast.forEach(([id, art, rot], i) => { const a = byId[id].art[art], [x, y, k] = spot[i]; d.sprite(id + "." + art, { x, y, width: a[0] * k, height: a[1] * k, rot, frame: 0 }); });
        drawStarburst(d, W / 2, H / 2 - 14, 205, 118, 14, INK, 0.2); drawStarburst(d, W / 2, H / 2 - 14, 192, 108, 14, C.yel, 0.2);
        bubble(d, "FIVE SECOND", W / 2, H / 2 - 62, 30, { color: C.cyan, t, wob: 1 });
        bubble(d, "PANIC!", W / 2, H / 2 + 2, 68, { color: C.pink, t, wob: 2.4 });
        drawHost(d, W / 2 + 4, H / 2 + 112, 0.62, "scream", t);
    });
});

function backdrop(s, col, pat = "rays", col2 = C.wht) {
    const st = { t: 0 };
    ensurePat(game.assets, pat);
    s.onUpdate((dt) => { st.t += dt; });
    s.onDraw((d) => {
        const { width: W, height: H } = s.view, S = Math.max(W, H) * 1.7;
        d.rect(W + 2, H + 2, { x: W / 2, y: H / 2, color: col });
        d.sprite("pat_" + pat, { x: W / 2, y: H / 2, width: S, height: S, rot: pat === "rays" ? st.t * 0.12 : 0, color: col2, opacity: 0.22 });
    });
    return st;
}
const drawHost = (d, x, y, k, face, t, bob = 3) => { d.push(); d.translate(x, y + Math.sin(t * 6) * bob); d.rotate(Math.sin(t * 3) * 0.05); d.sprite("host", { width: 140 * k, height: 160 * k, frame: HOST_FACE[face] }); d.pop(); };
function place(s, comps, x, y) { const e = s.add(comps); e.pos.set(x, y); return e; }

game.scene("title", (s) => {
    game.touch.enabled = false;
    menuMusic();
    const st = backdrop(s, C.pink);
    let built = [];
    const face = { f: "idle", t: 0 };
    const build = () => {
        built.forEach((e) => e.destroy()); built = [];
        const { width: W, height: H, safe } = s.view, land = W > H, add = (c, x, y) => { const e = place(s, c, x, y); built.push(e); return e; };
        const play = () => { game.sfx(JINGLE.slam, { haptic: "heavy" }); startRun(showRun((Date.now() % 1e6) | 0)); };
        const sound = () => { save.muted = !save.muted; game.audio.muted = save.muted; persist(); build(); };
        const hapt = () => { save.haptics = !save.haptics; game.haptics.enabled = save.haptics; persist(); game.haptic("medium"); build(); };
        const col = land ? W * 0.74 : W / 2, bw = land ? 118 : 158, gapX = bw + 14, top = land ? 56 : H - safe.bottom - 268;
        add(popButton("PLAY!", { width: land ? 250 : 300, height: land ? 62 : 72, size: 40, color: C.grn, action: "kgo", onTap: play }), col, top);
        const rowY = top + (land ? 74 : 84), row2 = rowY + (land ? 62 : 68);
        add(popButton("PARTY", { width: bw, height: 54, color: C.cyan, onTap: () => game.go("party", {}, { fade: 0.12 }) }), col - gapX / 2, rowY);
        add(popButton("WEEKLY", { width: bw, height: 54, color: C.org, onTap: () => { game.sfx(JINGLE.slam, { haptic: "heavy" }); startRun(weeklyRun()); } }), col + gapX / 2, rowY);
        add(popButton("PLAYLISTS", { width: bw, height: 54, color: C.pur, onTap: () => game.go("lists", {}, { fade: 0.12 }) }), col - gapX / 2, row2);
        add(popButton("GAMES", { width: bw, height: 54, color: C.blu, onTap: () => game.go("games", {}, { fade: 0.12 }) }), col + gapX / 2, row2);
        const y3 = row2 + (land ? 56 : 60);
        add(popButton("SOUND " + (save.muted ? "OFF" : "ON"), { width: bw, height: 42, size: 18, color: C.paper, text: INK, action: "pause", onTap: sound }), col - gapX / 2, y3);
        add(popButton("BUZZ " + (save.haptics ? "ON" : "OFF"), { width: bw, height: 42, size: 18, color: C.paper, text: INK, onTap: hapt }), col + gapX / 2, y3);
    };
    build();
    s.on("resize", build);
    s.onDraw((d) => {
        const { width: W, height: H, safe } = s.view, t = st.t, land = W > H;
        const lx = land ? W * 0.27 : W / 2, top = safe.top + (land ? 54 : 50), sz = land ? 0.92 : 1;
        const pop = (i) => { const q = Math.min(1, Math.max(0, (t - i * 0.05) / 0.2)); return q * (2.2 - 1.2 * q); };
        drawStarburst(d, lx, top + 62 * sz, 196 * sz, 130 * sz, 14, INK, t * 0.3);
        drawStarburst(d, lx, top + 62 * sz, 184 * sz, 120 * sz, 14, C.yel, t * 0.3);
        bubble(d, "FIVE SECOND", lx, top + 12 * sz, 30 * sz, { color: C.cyan, pop, t, wob: 1 });
        bubble(d, "PANIC!", lx, top + 76 * sz, 70 * sz, { color: C.pink, pop: (i) => pop(i + 8), t, wob: 2.4 });
        const hy = land ? top + 212 : Math.max(top + 196, Math.min(H - safe.bottom - 372, top + 230));
        drawHost(d, lx, hy, land ? 0.95 : Math.min(1.05, (H - safe.bottom - 300 - top - 130) / 150 + 0.4), (t % 6) > 5.4 ? "shock" : (t % 6) > 4.4 ? "sly" : "happy", t);
        const line = save.best ? "BEST " + save.best : "";
        if (line) bubble(d, line, land ? lx : W / 2, land ? H - safe.bottom - 14 : H - safe.bottom - 18, 18, { color: C.wht });
    });
});

game.scene("over", (s, r) => {
    game.touch.enabled = false;
    const win = r.cleared, st = backdrop(s, win ? C.grn : C.pur);
    game.stopMusic(); stopTune();
    game.sfx(win ? JINGLE.finale : JINGLE.over, { haptic: win ? "success" : [40, 60, 40, 60, 120] });
    const { width: W, height: H, safe } = s.view, land = W > H;
    const again = () => startRun(r.mode === "weekly" ? weeklyRun() : r.mode === "list" ? listRun(r.list) : showRun((Date.now() % 1e6) | 0));
    place(s, popButton("AGAIN!", { width: 220, height: 66, size: 34, color: C.pink, action: "kgo", onTap: again }), land ? W * 0.72 : W / 2, land ? H / 2 + 18 : H - safe.bottom - 136);
    place(s, popButton("MENU", { width: 150, height: 50, color: C.cyan, action: "pause", onTap: () => game.go("title", {}, { fade: 0.15 }) }), land ? W * 0.72 : W / 2, land ? H / 2 + 92 : H - safe.bottom - 60);
    const unlocked = Object.keys(save.seen).length;
    const confetti = [];
    if (win || r.fresh) for (let i = 0; i < 70; i++) confetti.push({ x: game.fxRng.range(0, W), y: game.fxRng.range(-H, 0), v: game.fxRng.range(80, 220), r: game.fxRng.range(0, 6), c: [C.yel, C.pink, C.cyan, C.wht][i % 4] });
    s.onDraw((d) => {
        const t = st.t, cx = land ? W * 0.3 : W / 2, ty = safe.top + (land ? 44 : 66);
                const title = win ? "YOU DID IT!" : r.mode === "weekly" ? "WEEK " + r.week : "PANIC OVER";
        bubble(d, title, cx, ty, fit(title, (land ? W * 0.56 : W) - 24, 50), { color: C.yel, pop: (i) => Math.min(1, t * 8 - i * 0.3), t, wob: 2 });
        drawHost(d, cx, land ? H * 0.5 + 6 : H * 0.34 + 16, land ? 0.92 : 1.2, win ? "cheer" : (t % 3 > 2 ? "dizzy" : "cry"), t, win ? 8 : 2);
        const sy = land ? H - safe.bottom - 62 : H * 0.54 + 16, rx = cx;
        bubble(d, r.score, rx, sy, fit(r.score + "", 240, 58), { color: C.wht, t, wob: 1, pop: Math.min(1, t * 3) });
        d.text(`${r.wins} of ${r.n} games survived`, { x: rx, y: sy + 44, size: 15, bold: true, color: C.wht });
        if (r.fresh) bubble(d, "NEW BEST!", rx, sy - 50, 26, { color: C.yel, t, wob: 3 });
        d.text(`${unlocked} / ${GAMES.length} games found`, { x: rx, y: sy + 66, size: 14, bold: true, color: C.paper });
        for (const c of confetti) { const y = ((c.y + c.v * t) % (H + 40)); d.sprite("fx", { x: c.x + Math.sin(t * 3 + c.r) * 16, y, width: 14, height: 14, frame: 5, color: c.c, rot: c.r + t * 4 }); }
    });
});

game.scene("lists", (s) => {
    game.touch.enabled = false; menuMusic();
    const st = backdrop(s, C.pur);
    const { width: W, height: H, safe } = s.view, land = W > H, cols = land ? 4 : 2, rows = Math.ceil(LISTS.length / cols), y0 = safe.top + 74;
    const bw = (W - safe.left - safe.right - 18 - (cols - 1) * 10) / cols, bh = Math.min(84, (H - y0 - safe.bottom - 76 - (rows - 1) * 10) / rows);
    LISTS.forEach((l, i) => {
        const b = save.lists[l.id], x = safe.left + 9 + (i % cols) * (bw + 10) + bw / 2, y = y0 + Math.floor(i / cols) * (bh + 10) + bh / 2;
        place(s, popButton(l.name, { width: bw, height: bh, color: l.color, onTap: () => { game.sfx(JINGLE.slam, { haptic: "heavy" }); startRun(listRun(l)); }, draw(d) {
            const ink = l.color === C.yel;
            bubble(d, l.name, 0, -bh * 0.17, fit(l.name, bw - 18, 24), { color: ink ? INK : C.wht, shadow: ink ? C.wht : INK });
            d.text(b?.cleared ? `cleared  best ${b.best}` : b?.best ? `best ${b.best}` : l.blurb, { y: bh * 0.27, size: 12.5, bold: true, color: ink ? INK : C.wht });
        } }), x, y);
    });
    place(s, popButton("BACK", { width: 130, height: 46, size: 22, color: C.paper, text: INK, action: "pause", onTap: () => game.go("title", {}, { fade: 0.12 }) }), W / 2, H - safe.bottom - 34);
    s.onDraw((d) => bubble(d, "PLAYLISTS", W / 2, safe.top + 34, 38, { color: C.yel, t: st.t, wob: 1.5 }));
});

game.scene("games", (s, a) => {
    game.touch.enabled = false; menuMusic();
    const st = backdrop(s, C.blu, "plus");
    const { width: W, height: H, safe } = s.view, land = W > H, cols = land ? 8 : 5, y0 = safe.top + 58, tw = (W - safe.left - safe.right - 16) / cols, rows = Math.floor((H - y0 - safe.bottom - 66) / (tw + 18)), per = cols * rows, pages = Math.ceil(GAMES.length / per);
    let page = Math.min(a?.page ?? 0, pages - 1), sel = null, tiles = [], extra = [], paintQ = [];
    const found = () => Object.keys(save.seen).length;
    const open = (def) => {
        sel = def;
        extra.forEach((e) => e.destroy()); extra = [];
        game.haptic("tick");
        if (!def) return;
        const top = save.top[def.id] ?? 0, opts = [[1, C.grn], [1.5, C.org], [TOP_SPEED, C.red]];
        opts.forEach(([v, c], i) => {
            const b = place(s, popButton(speedLabel(v), { width: 96, height: 60, size: 26, color: c, onTap: () => { stopTune(); game.sfx(JINGLE.slam, { haptic: "heavy" }); startRun(freeRun(def, v)); } }), W / 2 + (i - 1) * 108, H / 2 + 50);
            b.layer = 20; extra.push(b);
        });
        const x = place(s, popButton("BACK", { width: 120, height: 44, size: 20, color: C.paper, text: INK, action: "pause", onTap: () => open(null) }), W / 2, H / 2 + 118);
        x.layer = 20; extra.push(x);
    };
    const render = () => {
        tiles.forEach((e) => e.destroy()); tiles = [];
        GAMES.slice(page * per, (page + 1) * per).forEach((def, i) => {
            const x = safe.left + 8 + (i % cols + 0.5) * tw, y = y0 + (Math.floor(i / cols) + 0.5) * (tw + 18);
            const has = !!save.seen[def.id], key = artKey(def), icon = def.icon ?? Object.keys(def.art ?? {})[0], [aw, ah] = def.art[icon];
            paintQ.push(def);
            const e = s.add([ui(), tap(() => { if (!sel && has) open(def); else if (!sel) game.sfx(JINGLE.tick, { haptic: "warn" }); }), { draw(d, en) {
                const size = tw - 6;
                d.rect(size + 4, size + 20, { color: INK, radius: 10 });
                d.rect(size, size + 16, { color: has ? def.bg?.[0] ?? C.cyan : C.dgry, radius: 8 });
                if (en.ok) { const q = (size - 10) / Math.max(aw, ah); d.sprite(key, { y: -6, width: aw * q, height: ah * q, color: has ? undefined : INK }); }
                d.text(has ? def.verb : "???", { y: size / 2 - 1, size: 9.5, bold: true, color: !has ? C.gry : [C.navy, C.pur, C.mag, C.blu, C.dgrn, C.dbrn, C.dgry, C.red].includes(def.bg?.[0]) ? C.wht : INK });
                if (def.boss) d.sprite("bell", { x: size / 2 - 6, y: -size / 2 + 4, width: 15, height: 15 });
            } }]);
            e.pos.set(x, y); e.size.set(tw - 2, tw + 14); e.def = def;
            tiles.push(e);
        });
    };
    const turn = (dp) => { page = (page + dp + pages) % pages; game.sfx(JINGLE.tick, { haptic: "tick" }); render(); };
    render();
    if (pages > 1) {
        place(s, popButton("<", { width: 56, height: 46, size: 26, color: C.yel, text: INK, action: "kl", onTap: () => { if (!sel) turn(-1); } }), W / 2 - 110, H - safe.bottom - 32);
        place(s, popButton(">", { width: 56, height: 46, size: 26, color: C.yel, text: INK, action: "kr", onTap: () => { if (!sel) turn(1); } }), W / 2 + 110, H - safe.bottom - 32);
    }
    place(s, popButton("BACK", { width: 118, height: 46, size: 22, color: C.paper, text: INK, action: "pause", onTap: () => { if (!sel) game.go("title", {}, { fade: 0.12 }); } }), W / 2, H - safe.bottom - 32);
    s.onUpdate(() => {
        // Paint a few thumbnails per frame so the page never hitches.
        for (let n = 0; n < 2 && paintQ.length; n++) { const def = paintQ.shift(); ensureArt(game, def, def.icon ?? Object.keys(def.art ?? {})[0]); }
        for (const t of tiles) { if (!t.ok && !paintQ.includes(t.def)) t.ok = true; }
    });
    s.onDrawUI((d) => {
        if (sel) {
            d.rect(W, H, { x: W / 2, y: H / 2, color: INK, opacity: 0.85 });
            bubble(d, sel.verb + "!", W / 2, H / 2 - 110, fit(sel.verb + "!", W - 40, 54), { color: C.yel, t: st.t, wob: 2 });
            d.text(`survived ${save.wins[sel.id] ?? 0} times  top speed ${speedLabel(save.top[sel.id] ?? 0)}`, { x: W / 2, y: H / 2 - 50, size: 15, bold: true, color: C.wht });
            d.text("pick a speed", { x: W / 2, y: H / 2 - 8, size: 15, bold: true, color: C.paper });
        }
    });
    s.onDraw((d) => {
        bubble(d, "GAMES", W / 2 - 54, safe.top + 28, 32, { color: C.yel });
        d.text(`${found()} / ${GAMES.length}`, { x: W / 2 + 74, y: safe.top + 28, size: 18, bold: true, color: C.wht });
    });
});

game.scene("party", (s) => {
    game.touch.enabled = false;
    if (game.data.tune !== "party") { game.data.tune = "party"; game.music(PARTY); }
    const st = backdrop(s, C.cyan, "rings");
    const { width: W, height: H, safe } = s.view, land = W > H;
    let n = 3;
    const bump = (dv) => { n = Math.max(2, Math.min(8, n + dv)); game.sfx(JINGLE.tick, { haptic: "light" }); };
    const y = land ? H * 0.5 : H * 0.48;
    place(s, popButton("-", { width: 64, height: 64, size: 36, color: C.pink, action: "kl", onTap: () => bump(-1) }), W / 2 - 110, y);
    place(s, popButton("+", { width: 64, height: 64, size: 36, color: C.grn, action: "kr", onTap: () => bump(1) }), W / 2 + 110, y);
    const go = () => { const players = []; for (let i = 0; i < n; i++) players.push({ name: PARTY_NAMES[i], color: AVATARS[i], score: 0 }); game.data.tune = null; game.sfx(JINGLE.slam, { haptic: "heavy" }); game.go("run", { cfg: partyRun(players) }, { fade: 0.12 }); };
    place(s, popButton("START!", { width: 220, height: 66, size: 34, color: C.pink, action: "kgo", onTap: go }), W / 2, H - safe.bottom - (land ? 96 : 120));
    place(s, popButton("BACK", { width: 120, height: 44, size: 20, color: C.paper, text: INK, action: "pause", onTap: () => { game.data.tune = null; game.go("title", {}, { fade: 0.12 }); } }), W / 2, H - safe.bottom - 34);
    s.onDraw((d) => {
        const t = st.t;
        bubble(d, "PARTY MODE", W / 2, safe.top + 40, fit("PARTY MODE", W - 30, 42), { color: C.yel, t, wob: 1.5 });
        d.text("pass the phone. 3 rounds. most points wins.", { x: W / 2, y: safe.top + 78, size: 14, bold: true, color: INK });
        bubble(d, n, W / 2, y, 74, { color: C.wht, t, wob: 2 });
        const row = safe.top + (land ? 118 : 150), gap = Math.min(40, (W - 40) / n);
        for (let i = 0; i < n; i++) {
            const x = W / 2 + (i - (n - 1) / 2) * gap;
            d.circle(19, { x, y: row, color: INK }); d.circle(16, { x, y: row, color: AVATARS[i] });
            d.push(); d.translate(x, row - 2 + Math.sin(t * 7 + i) * 2); d.sprite("host", { width: 30, height: 34, frame: (i + (t | 0)) % 3 }); d.pop();
        }
    });
});

game.scene("podium", (s, a) => {
    game.touch.enabled = false; game.stopMusic();
    game.sfx(JINGLE.finale, { haptic: "success" });
    const st = backdrop(s, C.yel, "rays", C.pink), { width: W, height: H, safe } = s.view, pls = [...a.players].sort((p, q) => q.score - p.score), top = pls[0], land = W > H;
    place(s, popButton("REMATCH!", { width: 190, height: 58, size: 28, color: C.pink, action: "kgo", onTap: () => { const players = a.players.map((p) => ({ ...p, score: 0 })); game.go("run", { cfg: partyRun(players) }, { fade: 0.12 }); } }), W / 2 - (land ? 110 : 0), H - safe.bottom - (land ? 38 : 96));
    place(s, popButton("MENU", { width: 130, height: 46, size: 22, color: C.cyan, action: "pause", onTap: () => game.go("title", {}, { fade: 0.12 }) }), W / 2 + (land ? 100 : 0), H - safe.bottom - (land ? 38 : 34));
    s.onDraw((d) => {
        const t = st.t, tie = pls.length > 1 && pls[1].score === top.score;
        bubble(d, tie ? "IT'S A TIE!" : top.name + " WINS!", W / 2, safe.top + 40, fit(top.name + " WINS!", W - 30, 44), { color: C.pink, shadow: INK, t, wob: 2.5 });
        const y0 = safe.top + (land ? 76 : 240), rowH = Math.min(36, (H - y0 - safe.bottom - (land ? 72 : 160)) / pls.length);
        if (!land) drawHost(d, W / 2, safe.top + 150, 1, "cheer", t, 7);
        pls.forEach((p, i) => {
            const y = y0 + i * rowH + rowH / 2, q = Math.min(1, Math.max(0, (t - i * 0.12) * 3)), w = 90 + (W - 130 - 90) * (p.score / Math.max(1, top.score)) * q;
            d.rect(w + 6, rowH - 2, { x: 26 + w / 2, y, color: INK, radius: 8 });
            d.rect(w, rowH - 8, { x: 26 + w / 2, y, color: p.color, radius: 6 });
            d.text(`${i + 1}. ${p.name}`, { x: 28 + 48, y, size: 14, bold: true, color: p.color === C.yel ? INK : C.wht });
            d.text(p.score, { x: Math.min(W - 40, 54 + w), y, size: 15, bold: true, color: INK });
        });
    });
});

game.panic = { save, GAMES, byId, Driver, showRun, weeklyRun, listRun, freeRun, partyRun, startRun, TOP_SPEED, m: null, dir: null, persist };
game.start("title");
export { game };
