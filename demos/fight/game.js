// KITCHEN KNOCKOUT. A one-on-one fighting game between appliances who have finally had enough.
import { createGame, pin, rect, tap, text, ui } from "./pogo.js";
import { BY_ID, FIGHTERS, ROSTER } from "./fighters.js";
import { Fight } from "./sim.js";
import { LEVELS } from "./ai.js";
import { paintFighter, paintShared } from "./art.js";
import { paintGags, paintStage, STAGES, STAGE_SIZE } from "./stages.js";
import { Puppet } from "./puppet.js";
import { Match } from "./match.js";
import { Coach } from "./coach.js";
import { Sound, SONGS } from "./audio.js";
import { BANTER, ENDINGS, WIN_QUOTE } from "./story.js";
import { CREAM, DISPLAY, FONT, GOLD, INK, RED, TEAL, chunky, drawHapticIcon, drawSoundIcon, iconToggle } from "./ui.js";

const keyset = (p, o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [`${p}${k}`, v]));
const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#2c1f33", "#160e1c"], letterbox: "#160e1c",
    actions: {
        pause: ["Escape", "KeyP", "pad:start"], confirm: ["Enter", "pad:a"],
        ...keyset("a", { L: ["KeyA", "pad:left"], R: ["KeyD", "pad:right"], U: ["KeyW", "Space", "pad:up"], D: ["KeyS", "pad:down"], A: ["KeyJ", "KeyF", "pad:a"], B: ["KeyK", "KeyG", "pad:x"], S: ["KeyL", "KeyH", "pad:b"], G: ["KeyU", "KeyR", "pad:y"], T: ["KeyI", "KeyT"], X: ["KeyO", "KeyY"] }),
        ...keyset("b", { L: ["ArrowLeft"], R: ["ArrowRight"], U: ["ArrowUp"], D: ["ArrowDown"], A: ["Comma", "KeyZ"], B: ["Period", "KeyX"], S: ["Slash", "KeyC"], G: ["ShiftRight", "KeyV"], T: ["Semicolon"], X: ["Quote"] }),
    },
    seed: 1, maxDpr: 2, haptics: { auto: false },
});

// --- Art, painted a sheet at a time so the page stays alive while it loads ---------------------------------------
const sheets = {}, shared = paintShared(game.assets), gagParts = paintGags(game.assets);
const browser = typeof document !== "undefined";
if (browser) {
    game.assets.wait((async () => {
        for (const f of FIGHTERS) { sheets[f.id] = paintFighter(game.assets, f); await new Promise((r) => setTimeout(r, 0)); }
        document.getElementById("load")?.remove();
    })());
} else for (const f of FIGHTERS) sheets[f.id] = paintFighter(game.assets, f);

// --- Save data and the bits every scene shares ------------------------------------------------------------------
const SAVE = "knockout1";
const defaults = () => ({ coached: false, cleared: {}, gold: {}, muted: false, haptics: true, auto: true, difficulty: 1, last: "crumbs", bestCombo: 0, wins: 0 });
let save = { ...defaults(), ...game.load(SAVE, {}) };
const persist = () => game.save(SAVE, save);
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;
const sound = new Sound(game);
let pad = null;
const kit = {
    sheets, shared, gagParts, sound, save: () => save, mouse: false,
    onScreen() { return game.input.touchMode || (kit.mouse && !game.input.activePad); },
    song(name) { if (game.data.song !== name) { game.data.song = name; game.music(name); } },
    setPad(p) { pad = p; },
};
// The stock on-screen controls only know one player, so pointer events route through the game's own pad.
const touch = game.touch, stock = { down: touch.pointerDown.bind(touch), move: touch.pointerMove.bind(touch), up: touch.pointerUp.bind(touch), reset: touch.reset.bind(touch) };
touch.pointerDown = (id, x, y) => (pad ? pad.down(id, x, y) : stock.down(id, x, y));
touch.pointerMove = (id, x, y) => (pad ? pad.move(id, x, y) : stock.move(id, x, y));
touch.pointerUp = (id) => { pad?.up(id); stock.up(id); };
touch.reset = () => { pad?.reset(); stock.reset(); };

// Mouse with no keyboard: the on-screen pad appears on desktop too, and any fight key puts it away again.
if (browser) {
    addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") kit.mouse = true; }, true);
    addEventListener("keydown", (e) => { if (Object.values(game.input.actions).some((b) => b.includes(e.code))) kit.mouse = false; }, true);
}
const fakeFighter = (id) => new Fight({ a: id, b: id, training: true }).p[0];
const puppetOf = (id) => new Puppet(fakeFighter(id), sheets[id], shared);
const outlined = (d, str, o) => { const off = Math.max(1.4, (o.size ?? 20) * 0.07); d.text(str, { ...o, x: (o.x ?? 0) + off * 0.7, y: (o.y ?? 0) + off, color: o.ink ?? INK }); d.text(str, o); };
const settings = (s, anchor, offs) => {
    iconToggle(s, [pin(anchor, offs[0])], () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; persist(); sound.click(); }, (d, on) => drawSoundIcon(d, on));
    iconToggle(s, [pin(anchor, offs[1])], () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; persist(); if (game.haptics.enabled) game.haptic("medium"); sound.click(); }, (d, on, bg) => drawHapticIcon(d, on, bg));
};
const portrait = () => game.view.height > game.view.width;
/** A scene's painted backdrop: a UI entity under the buttons, because onDrawUI would draw over them. */
const backdrop = (s, fn) => s.add([ui(), { layer: -5, draw(d) { d.reset(); fn(d); d.reset(); } }]);
/** Stops a stray pad from lingering into a menu scene. */
const menu = () => { pad = null; game.touch.set({}); };
/** Menu keys: read so a pad or keyboard player is never stuck on a screen built for fingers. */
const nav = (s) => {
    const I = s.input;
    void I.pointer;     // Menus are tappable, so the audit knows these keys have a touch route.
    return { left: I.pressed("aL") || I.pressed("bL"), right: I.pressed("aR") || I.pressed("bR"), up: I.pressed("aU") || I.pressed("bU"), down: I.pressed("aD") || I.pressed("bD"), ok: I.pressed("confirm") || I.pressed("aA"), back: I.pressed("pause") || I.pressed("aB") };
};

// Leaving the tab or locking the phone pauses a fight.
let autoPause = null;
game.on("hide", () => { if (game.currentName === "play") autoPause?.(); });

// --- Title: the game plays itself behind the logo --------------------------------------------------------------
game.scene("title", (s) => {
    menu();
    kit.song(SONGS.title);
    const a = ROSTER[Math.floor(game.fxRng.next() * 8)], b = ROSTER[(ROSTER.indexOf(a) + 1 + Math.floor(game.fxRng.next() * 7)) % 8];
    const demo = () => new Match(game, s, { a, b, mode: "demo", stage: Math.floor(game.fxRng.next() * 4), rounds: 1, time: 40, onEnd: () => game.go("title", {}, { fade: 0.4 }) }, kit);
    const m = demo();
    menu();
    let t = 0;
    s.onUpdate(() => { t++; });
    const place = () => {
        const v = s.view, p = portrait(), W = v.width;
        return { p, W, y: p ? v.height * 0.2 + v.safe.top : 76 };
    };
    backdrop(s, (d) => {
        const v = s.view, { p, W, y } = place(), bob = Math.sin(t * 0.04) * 3, size = Math.min(p ? 62 : 54, W / 6.5);
        d.rect(W, v.height, { x: W / 2, y: v.height / 2, color: "#241a2c", opacity: 0.42 });
        d.push(); d.translate(W / 2, y + bob); d.rotate(-0.05);
        const K = "KITCHEN", N = "KNOCKOUT", dy = size * 0.96;
        for (const [str, yy, sc, c0] of [[K, -dy * 0.52, 0.86, CREAM], [N, dy * 0.42, 1, GOLD]]) {
            d.text(str, { x: 5, y: yy + 7, size: size * sc, bold: true, font: DISPLAY, color: "#000000", opacity: 0.4 });
            d.text(str, { x: 3, y: yy + 4, size: size * sc, bold: true, font: DISPLAY, color: RED });
            d.text(str, { x: 0, y: yy, size: size * sc, bold: true, font: DISPLAY, color: c0 });
        }
        d.pop();
        d.text(Object.keys(save.cleared).length >= 8 ? "THE GOLDEN SPATULA IS YOURS, CHEF." : "EIGHT APPLIANCES. ONE SPATULA.", { x: W / 2, y: y + dy + 18, size: 12, bold: true, font: FONT, color: CREAM });
    });
    const go = (mode) => { sound.pick(); game.haptic("light"); game.go("select", { mode }, { fade: 0.3 }); };
    const first = !save.coached;
    const big = () => { if (first) { save.coached = true; persist(); sound.pick(); game.go("play", { mode: "coach", a: "crumbs", b: "chill", stage: 0, players: 1, rounds: 1, level: 0, foeHp: 0.7 }, { fade: 0.25 }); } else go("arcade"); };
    const W = s.view.width, p = portrait();
    if (p) {
        s.add([pin("bottom", [0, 170]), chunky(first ? "FIGHT!" : "ARCADE", { width: 230, height: 62, textSize: 26, action: "confirm", onTap: big })]);
        s.add([pin("bottom", [-82, 96]), chunky("VERSUS", { width: 150, height: 46, textSize: 16, color: TEAL, onTap: () => go("versus") })]);
        s.add([pin("bottom", [82, 96]), chunky("TRAINING", { width: 150, height: 46, textSize: 16, color: "#7d6bd6", onTap: () => go("training") })]);
        s.add([pin("bottom", [0, 34]), chunky(`ENDINGS ${Object.keys(save.cleared).length}/8`, { width: 200, height: 50, textSize: 14, color: "#6b5b73", onTap: () => { sound.click(); game.go("gallery", {}, { fade: 0.25 }); } })]);
    } else {
        s.add([pin("bottom", [-190, 84]), chunky(first ? "FIGHT!" : "ARCADE", { width: 190, height: 58, textSize: 24, action: "confirm", onTap: big })]);
        s.add([pin("bottom", [20, 84]), chunky("VERSUS", { width: 150, height: 58, textSize: 18, color: TEAL, onTap: () => go("versus") })]);
        s.add([pin("bottom", [190, 84]), chunky("TRAINING", { width: 150, height: 58, textSize: 18, color: "#7d6bd6", onTap: () => go("training") })]);
        s.add([pin("bottom", [0, 24]), chunky(`ENDINGS ${Object.keys(save.cleared).length}/8`, { width: 170, height: 50, textSize: 13, color: "#6b5b73", onTap: () => { sound.click(); game.go("gallery", {}, { fade: 0.25 }); } })]);
    }
    settings(s, "top-right", [[34, 34], [86, 34]]);
});

// --- Fighter select ------------------------------------------------------------------------------------------
const stat = (f) => ({ POWER: (f.moves["5B"].d + f.moves.TH.d * 0.4) / 170, SPEED: f.walkF / 3.8, RANGE: (f.moves["5B"].box[0] + f.moves["5B"].box[2] / 2) / 130, GUTS: f.hp / 1240 });
game.scene("select", (s, args) => {
    menu();
    kit.song(SONGS.select);
    const mode = args.mode ?? "arcade";
    const vs = { players: args.players ?? 1, level: save.difficulty ?? 1, stage: 0 };
    let cursor = Math.max(0, ROSTER.indexOf(save.last)), p1 = args.p1 ?? null, t = 0, pulse = 0;
    const pups = ROSTER.map((id) => puppetOf(id));
    const big = ROSTER.map((id) => puppetOf(id));
    const tiles = [];
    const layout = () => {
        const v = s.view, P = portrait(), W = v.width, H = v.height;
        const cols = 4, rows = 2, gw = P ? W - 16 : W * 0.52, cell = gw / cols, ch = Math.min(cell * 1.05, P ? (H - v.safe.bottom) * 0.17 : (H - v.safe.top - v.safe.bottom - 122) / 2);
        const x0 = P ? 8 : W - gw - 8 - v.safe.right, y0 = P ? H - v.safe.bottom - 96 - ch * rows : v.safe.top + 42;
        return { P, W, H, cell, ch, x0, y0, cols };
    };
    ROSTER.forEach((id, i) => {
        const place = (self) => { const L = layout(); self.pos.x = L.x0 + L.cell * (i % 4 + 0.5); self.pos.y = L.y0 + L.ch * (Math.floor(i / 4) + 0.5); self.size.x = L.cell - 2; self.size.y = L.ch - 2; };
        const e = s.add([ui(), rect(50, 50, { color: "#00000000" }), tap(() => choose(i)), { i, update(dt, self) { place(self); } }]);
        place(e);
        tiles.push(e);
    });
    const choose = (i) => {
        if (cursor === i) { confirm(); return; }
        cursor = i; pulse = 1; sound.move(); game.haptic("tick"); big[i].squash = 0.3;
    };
    const confirm = () => {
        const id = ROSTER[cursor];
        sound.pick(); sound.sig(id); game.haptic("light");
        if (mode === "versus" && p1 === null) { p1 = id; cursor = (cursor + 1) % 8; return; }
        save.last = mode === "versus" ? p1 : id; persist();
        if (mode === "arcade") game.go("vs", arcadeStart(id), { fade: 0.25 });
        else if (mode === "training") game.go("play", { mode: "training", a: id, b: "crumbs" === id ? "chill" : "crumbs", stage: 0, players: 1 }, { fade: 0.25 });
        else game.go("vs", { mode: "versus", a: p1, b: id, stage: Math.floor(game.fxRng.next() * 4), players: vs.players, level: vs.level, rounds: 2 }, { fade: 0.25 });
    };
    s.onUpdate(() => {
        t++; pulse *= 0.85;
        for (const p of pups) { const f = p.f; f.t++; if (t % 2 === 0) p.update({ frame: t, flashBy: null, flash: 0 }, null, 0); }
        const b = big[cursor]; b.update({ frame: t, flashBy: null, flash: 0 }, null, 0);
        const n = nav(s);
        if (n.left) choose((cursor + 7) % 8);
        if (n.right) choose((cursor + 1) % 8);
        if (n.up || n.down) choose((cursor + 4) % 8);
        if (n.ok) confirm();
        if (n.back) { sound.back(); game.go("title", {}, { fade: 0.25 }); }
    });
    backdrop(s, (d) => {
        const L = layout(), { P, W, H } = L, f = FIGHTERS[cursor], v = s.view, top = v.safe.top;
        d.rect(W, H, { x: W / 2, y: H / 2, color: "#2c1f33" });
        // A diagonal slash of the fighter's colour behind them.
        const sx = P ? W / 2 : (L.x0 - 8) / 2 + v.safe.left / 2, sy = P ? top + 170 + (H - 640) * 0.1 : H * 0.56;
        d.push(); d.translate(sx, sy); d.rotate(-0.2);
        d.rect(W * 1.5, 150, { color: f.color, opacity: 0.9 }); d.rect(W * 1.5, 8, { y: -80, color: f.accent, opacity: 0.9 }); d.rect(W * 1.5, 8, { y: 80, color: f.accent, opacity: 0.9 });
        for (let i = 0; i < 12; i++) d.rect(60, 2, { x: ((i * 91 + t * 3) % 700) - 350, y: -66 + i * 12, color: "#fff", opacity: 0.16 });
        d.pop();
        const title = mode === "versus" ? (p1 ? "PLAYER 2 PICK" : "PLAYER 1 PICK") : mode === "training" ? "TRAINING" : "ARCADE";
        outlined(d, title, { x: W / 2 - (P ? 0 : 60), y: top + (P ? 22 : 16), size: P ? 20 : 13, bold: true, font: DISPLAY, color: GOLD });
        const scale = P ? 1.3 : 1.05;
        d.reset();
        big[cursor].draw(d, sx - (P ? 62 : 4), P ? sy + 70 * scale : H - v.safe.bottom - 12, { scale: scale * (1 + pulse * 0.1), face: 1 });
        d.reset();
        const tx = P ? sx + 88 : sx + 30, ty = P ? sy - 62 : top + 28;
        outlined(d, f.name, { x: tx, y: ty, size: Math.min(26, (P ? 180 : L.x0 - 20) / (f.name.length * 0.72)), bold: true, font: DISPLAY, color: "#ffffff" });
        outlined(d, f.type, { x: tx, y: ty + 21, size: 12, bold: true, font: FONT, color: f.accent === "#7a3e22" ? "#ffe08a" : f.accent });
        if (P) {
            const st = stat(f); let i = 0;
            for (const [k, val] of Object.entries(st)) {
                const y = ty + 42 + i * 19, bx = tx - 66; i++;
                d.text(k, { x: bx + 18, y, size: 10, bold: true, font: FONT, color: "#fff" });
                d.rect(84, 9, { x: bx + 90, y, color: INK, radius: 4 }); const w = Math.min(80, 80 * val); d.rect(w, 5, { x: bx + 50 + w / 2, y, color: GOLD, radius: 2 });
            }
        }
        const by = P ? L.y0 - 34 : L.y0 + L.ch * 2 + 16;
        d.text(f.blurb, { x: P ? W / 2 : L.x0 + L.cell * 2, y: by, size: 12, font: FONT, bold: true, color: CREAM, maxWidth: P ? W - 30 : L.cell * 4 - 10, align: "center", lineHeight: 1.25 });
        // The grid.
        for (let i = 0; i < 8; i++) {
            const e = tiles[i], g = FIGHTERS[i], x = L.x0 + L.cell * (i % 4 + 0.5), y = L.y0 + L.ch * (Math.floor(i / 4) + 0.5), on = i === cursor, taken = mode === "versus" && p1 === g.id;
            d.rect(L.cell - 4, L.ch - 4, { x, y, color: on ? GOLD : INK, radius: 10 });
            d.rect(L.cell - 10, L.ch - 10, { x, y, color: g.color, radius: 7, opacity: on ? 1 : 0.75 });
            d.reset();
            const k = Math.min(L.cell, L.ch) / 150;
            pups[i].draw(d, x, y + L.ch * 0.42, { scale: k * (g.height > 110 ? 0.9 : 1), face: 1, noShake: true });
            d.reset();
            if (save.cleared[g.id]) d.circle(6, { x: x + L.cell / 2 - 14, y: y - L.ch / 2 + 14, color: save.gold[g.id] ? GOLD : CREAM, outline: 0 });
            if (taken) outlined(d, "P1", { x, y: y - L.ch * 0.3, size: 14, bold: true, font: DISPLAY, color: GOLD });
        }
    });
    const P = portrait();
    if (P) {
        s.add([pin("bottom", [84, 30]), chunky("FIGHT!", { width: 170, height: 54, textSize: 22, action: "confirm", onTap: confirm })]);
        const dif = chunky(() => (mode === "training" ? "TRAIN" : LEVELS[vs.level]?.name ?? "NORMAL"), { width: 124, height: 46, textSize: 14, color: "#7d6bd6", onTap: () => { vs.level = (vs.level + 1) % 4; save.difficulty = vs.level; persist(); sound.click(); } });
        s.add([pin("bottom", [-96, 34]), dif]);
    } else {
        s.add([pin("bottom", [220, 26]), chunky("FIGHT!", { width: 160, height: 46, textSize: 20, action: "confirm", onTap: confirm })]);
        s.add([pin("bottom", [40, 26]), chunky(() => (mode === "training" ? "TRAIN" : LEVELS[vs.level]?.name ?? "NORMAL"), { width: 120, height: 42, textSize: 13, color: "#7d6bd6", onTap: () => { vs.level = (vs.level + 1) % 4; save.difficulty = vs.level; persist(); sound.click(); } })]);
    }
    if (mode === "versus") s.add([pin("top-right", [64, 26 + (P ? 8 : 0)]), chunky(() => (vs.players === 2 ? "2 PLAYER" : "VS CPU"), { width: 112, height: 38, textSize: 12, color: TEAL, onTap: () => { vs.players = vs.players === 2 ? 1 : 2; sound.click(); } })]);
    s.add([pin("top-left", [34, 32]), chunky("<", { width: 52, height: 50, textSize: 20, color: "#6b5b73", onTap: () => { sound.back(); game.go("title", {}, { fade: 0.25 }); } })]);
});

// --- Arcade ladder --------------------------------------------------------------------------------------------
function arcadeStart(id) {
        // A seeded order, with the hardest characters to read later on.
    const pref = ["chill", "crumbs", "knead", "whistle", "clamp", "ding", "frappe", "ristretto"].filter((x) => x !== id);
    return { mode: "arcade", a: id, ladder: pref.slice(0, 7), rung: 0, diff: save.difficulty ?? 1, players: 1, rounds: 2 };
}
const RAMP = [[0, 0.9], [0.4, 1.5], [1, 2.6], [2, 3]];
function rungConfig(a) {
    const [lo, hi] = RAMP[a.diff ?? 1], k = a.rung / 6;
    return { ...a, b: a.ladder[a.rung], stage: [0, 2, 1, 0, 2, 1, 3][a.rung], level: lo + (hi - lo) * k * k * 0.4 + (hi - lo) * k * 0.6, song: a.rung === 6 ? SONGS.boss : undefined };
}

// --- VS card ---------------------------------------------------------------------------------------------------
game.scene("vs", (s, args) => {
    menu();
    const cfg = args.mode === "arcade" ? rungConfig(args) : args;
    paintStage(game.assets, cfg.stage ?? 0);    // Behind the fade, while the screen is black.
    const A = puppetOf(cfg.a), B = puppetOf(cfg.b);
    B.f.face = -1;
    const line = game.fxRng.pick(BANTER[cfg.b]);
    let t = 0;
    const done = () => { if (t > 12) game.go("play", cfg, { fade: 0.2 }); };
    sound.superflash(); game.haptic("medium");
    s.add([rect(10000, 10000, { color: "#00000000" }), ui(), tap(done), pin("center")]);
    s.onUpdate(() => { t++; A.update({ frame: t, flashBy: null, flash: 0 }, null, 0); B.update({ frame: t, flashBy: null, flash: 0 }, null, 0); if (t === 96) done(); if (nav(s).ok) done(); });
    backdrop(s, (d) => {
        const v = s.view, W = v.width, H = v.height, P = H > W, k = Math.min(1, t / 14), e = 1 - (1 - k) ** 3, a = BY_ID[cfg.a], b = BY_ID[cfg.b];
        d.rect(W, H, { x: W / 2, y: H / 2, color: "#160e1c" });
        const half = P ? H / 2 : W / 2;
        if (P) { d.rect(W, H / 2, { x: W / 2 - (1 - e) * W, y: H * 0.25, color: a.color }); d.rect(W, H / 2, { x: W / 2 + (1 - e) * W, y: H * 0.75, color: b.color }); }
        else { d.rect(W / 2, H, { x: W * 0.25, y: H / 2 - (1 - e) * H, color: a.color }); d.rect(W / 2, H, { x: W * 0.75, y: H / 2 + (1 - e) * H, color: b.color }); }
        for (let i = 0; i < 26; i++) { const y = ((i * 53 + t * 9) % (H + 60)) - 30; d.rect(W, 2, { x: W / 2, y, color: "#ffffff", opacity: 0.08 }); }
        const scale = P ? 1.5 : 1.45;
        d.reset();
        A.draw(d, (P ? W * 0.3 : W * 0.23) - (1 - e) * W, (P ? H * 0.46 : H * 0.84), { scale, face: 1 });
        B.draw(d, (P ? W * 0.7 : W * 0.77) + (1 - e) * W, (P ? H * 0.96 - v.safe.bottom * 0.2 : H * 0.84), { scale, face: -1 });
        d.reset();
        const name = (f, x, y) => outlined(d, f.name, { x, y, size: Math.min(28, W * 0.5 / (f.name.length * 0.62)), bold: true, font: DISPLAY, color: "#ffffff" });
        if (P) { name(a, W * 0.68, v.safe.top + 60); name(b, W * 0.32, H * 0.56); } else { name(a, W * 0.25, v.safe.top + 34); name(b, W * 0.75, v.safe.top + 34); }
        const pop = t < 22 ? 2.4 - Math.min(1.4, (t - 10) * 0.12) : 1;
        if (t > 10) { d.push(); d.translate(W / 2, H / 2); d.rotate(-0.1); outlined(d, "VS", { size: 74 * Math.max(1, pop), bold: true, font: DISPLAY, color: GOLD }); d.pop(); }
        if (t > 22) outlined(d, `"${line}"`, { x: W / 2, y: P ? H * 0.635 : H - v.safe.bottom - 22, size: 13, bold: true, font: FONT, color: CREAM, maxWidth: W - 36, align: "center" });
        if (cfg.mode === "arcade") outlined(d, `COURSE ${cfg.rung + 1} OF 7`, { x: W / 2, y: v.safe.top + (P ? 22 : 18), size: 13, bold: true, font: DISPLAY, color: GOLD });
    });
});

// --- The fight -------------------------------------------------------------------------------------------------
game.scene("play", (s, args) => {
    const cfg = { players: 1, ...args };
    let m;
    const finish = (r) => {
        if (cfg.mode === "coach") { game.go("select", { mode: "arcade" }, { fade: 0.4 }); return; }
        const best = Math.max(r.stats[0].best, r.stats[1].best);
        if (best > (save.bestCombo ?? 0)) save.bestCombo = best;
        if (r.winner === 0) save.wins = (save.wins ?? 0) + 1;
        persist();
        game.go("result", { ...cfg, winner: r.winner, stats: r.stats }, { fade: 0.4 });
    };
    m = new Match(game, s, { ...cfg, onEnd: finish }, kit);
    if (cfg.mode === "coach") { m.coach = new Coach(m); m.announce = { text: "FIGHT!", t: 0, dur: 44, color: GOLD, big: 1 }; }
    game.data.fight = m.fight;
    game.match = m;
    // Pause, reachable from the timer on a phone and Esc on a keyboard.
    let panel = [];
    const closePanel = () => { for (const e of panel) e.destroy(); panel = []; m.paused = false; if (list) { list.destroy(); list = null; } };
    const openPanel = () => {
        if (m.paused) { closePanel(); return; }
        m.paused = true; sound.click();
        const auto = () => (m.fight.p[0].auto ? "AUTO COMBO: ON" : "AUTO COMBO: OFF");
        panel.push(s.add([ui(), rect(2000, 2000, { color: "#160e1cc8" }), pin("center"), { layer: 80 }]));
        const items = [["RESUME", closePanel, TEAL], [auto, () => { const f = m.fight.p[0]; f.auto = !f.auto; save.auto = f.auto; persist(); sound.click(); }, "#7d6bd6"],
            [() => (game.audio.muted ? "SOUND: OFF" : "SOUND: ON"), () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; persist(); sound.click(); }, "#6b5b73"],
            [() => (game.haptics.enabled ? "HAPTICS: ON" : "HAPTICS: OFF"), () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; persist(); if (game.haptics.enabled) game.haptic("medium"); }, "#6b5b73"],
            ["MOVES", () => toggleMoves(), TEAL], ["QUIT", () => { closePanel(); game.go("title", {}, { fade: 0.3 }); }, RED]];
        if (cfg.mode === "training") items.unshift(["RESET POSITIONS", () => { const f = m.fight; f.p[0].reset(-100); f.p[1].reset(100); f.proj = []; m.camX = 0; closePanel(); }, "#6b5b73"]);
        // One column on tall screens, two on short ones.
        const tall = s.view.height > 480, rows = tall ? items.length : Math.ceil(items.length / 2), gap = 58;
        items.forEach(([label, onTap, color], i) => {
            const col = tall ? 0 : i % 2, row = tall ? i : Math.floor(i / 2);
            panel.push(s.add([pin("center", [tall ? 0 : (col ? 122 : -122), (row - (rows - 1) / 2) * gap]), chunky(label, { width: 228, height: 50, textSize: 14, color, onTap }), { layer: 90 }]));
        });
        if (!kit.onScreen()) panel.push(s.add([pin("bottom", [0, 26]), ui(), { layer: 90, draw(d) {
            const two = cfg.players === 2;
            d.text(two ? "P1: WASD  F LIGHT  G HEAVY  H SPECIAL  R BLOCK  T THROW  Y SUPER" : "MOVE: WASD / ARROWS   J LIGHT   K HEAVY   L SPECIAL (+FORWARD, +DOWN)   U BLOCK   I THROW   O SUPER", { y: two ? -8 : 0, size: 10, bold: true, font: FONT, color: CREAM });
            if (two) d.text("P2: ARROWS  , LIGHT  . HEAVY  / SPECIAL  RSHIFT BLOCK  ; THROW  ' SUPER", { y: 8, size: 10, bold: true, font: FONT, color: CREAM });
        } }]));
    };
    // Every move with its real numbers, so the frame data is more than decoration.
    let list = null;
    const toggleMoves = () => {
        if (list) { list.destroy(); list = null; return; }
        sound.click();
        const f = BY_ID[cfg.a], order = ["5A", "2A", "5B", "2B", "6B", "jA", "jB", "TH", "S1", "S2", "S3", "SUP"], key = { "5A": "L", "2A": "D+L", "5B": "H", "2B": "D+H", "6B": "F+H", jA: "AIR L", jB: "AIR H", TH: "THROW", S1: "S1", S2: "S2", S3: "S3", SUP: "SUPER" };
        list = s.add([ui(), rect(10, 10, { color: "#00000000" }), tap(() => toggleMoves()), pin("center"), { layer: 95, draw(d) {
            const v = s.view, W = Math.min(v.width - 16, 420), lh = Math.min(19, (v.height - v.safe.top - v.safe.bottom - 50) / 14), top = -lh * 6.5;
            d.rect(W, lh * 14.4, { color: INK, radius: 10 });
            d.text(`${f.name}: start / active / recovery / on block`, { y: top - lh * 0.7, size: 10.5, bold: true, font: FONT, color: GOLD });
            order.forEach((id, i) => {
                const m = f.moves[id], y = top + i * lh + lh * 0.3, adv = m.bs ? m.bs - (m.a - 1) - m.r : null;
                d.text(key[id], { x: -W / 2 + 34, y, size: 10, bold: true, font: FONT, color: CREAM });
                d.text(m.name, { x: -W / 2 + 118, y, size: 10, font: FONT, bold: true, color: "#ffe08a" });
                d.text(`${m.s + 1} / ${m.a} / ${m.r}`, { x: W / 2 - 96, y, size: 10, font: FONT, bold: true, color: CREAM });
                d.text(adv === null ? (m.grab ? "THROW" : "-") : `${adv >= 0 ? "+" : ""}${adv}`, { x: W / 2 - 32, y, size: 10, font: FONT, bold: true, color: adv === null ? "#c9b8d0" : adv >= 0 ? "#7fe0a8" : "#ff9a8a" });
            });
        } }]);
        list.size.x = 2000; list.size.y = 2000;
    };
    autoPause = () => { if (!m.paused && !m.ended) openPanel(); };
    s.add([pin("top", [0, 34]), rect(58, 56, { color: "#00000000" }), tap(openPanel), { draw(d) { d.circle(11, { y: 20, color: INK, opacity: 0.55 }); d.rect(3.4, 10, { x: -3.4, y: 20, color: CREAM, radius: 1.4 }); d.rect(3.4, 10, { x: 3.4, y: 20, color: CREAM, radius: 1.4 }); } }]);
    s.onUpdate(() => { if (s.input.pressed("pause")) openPanel(); });
    if (cfg.mode === "training") {
        const names = ["STAND", "CROUCH", "BLOCK", "LOW BLOCK", "JUMP", "CPU"];
        const row = (x, label, onTap) => s.add([pin("top", [x, 92]), chunky(label, { width: 112, height: 46, textSize: 10, color: "#6b5b73", onTap })]);
        row(-118, () => `DUMMY: ${names[m.dummy]}`, () => { m.dummy = (m.dummy + 1) % 6; sound.click(); });
        row(0, () => (m.showBoxes ? "BOXES: ON" : "BOXES: OFF"), () => { m.showBoxes = !m.showBoxes; sound.click(); });
        row(118, () => (m.fight.o.fullMeter ? "HEAT: FULL" : "HEAT: REAL"), () => { m.fight.o.fullMeter = !m.fight.o.fullMeter; if (!m.fight.o.fullMeter) m.fight.p[0].meter = 0; sound.click(); });
    }
});

// --- Result ----------------------------------------------------------------------------------------------------
game.scene("result", (s, args) => {
    menu();
    const won = args.winner === 0, human = args.players === 2 || won, id = args.winner === 0 ? args.a : args.b, f = BY_ID[id], P = puppetOf(id);
    P.f.st = "win";
    if (args.mode === "arcade" && !won) sound.lose(); else sound.fanfare();
    game.haptic(won ? "success" : "warn");
    game.stopMusic(); game.data.song = null;
    let t = 0;
    const st = args.stats[args.winner];
    s.onUpdate(() => { t++; P.update({ frame: t, flashBy: null, flash: 0 }, null, 0); const n = nav(s); if (n.ok) primary(); if (n.back) game.go("title", {}, { fade: 0.3 }); });
    const primary = () => {
        sound.pick();
        if (args.mode === "arcade") {
            if (won && args.rung >= 6) {
                const first = !save.cleared[args.a]; save.cleared[args.a] = true; if ((args.diff ?? 1) >= 2) save.gold[args.a] = true; persist();
                game.go("ending", { id: args.a, first, next: "title" }, { fade: 0.4 });
            } else game.go("vs", { ...args, rung: won ? args.rung + 1 : args.rung, winner: undefined, stats: undefined }, { fade: 0.3 });
        } else game.go("vs", { ...args, winner: undefined, stats: undefined }, { fade: 0.3 });
    };
    backdrop(s, (d) => {
        const v = s.view, W = v.width, H = v.height, P2 = H > W;
        d.rect(W, H, { x: W / 2, y: H / 2, color: f.color });
        for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + t * 0.003; d.poly([[W / 2, H * 0.42], [W / 2 + Math.cos(a) * W * 1.6, H * 0.42 + Math.sin(a) * W * 1.6], [W / 2 + Math.cos(a + 0.17) * W * 1.6, H * 0.42 + Math.sin(a + 0.17) * W * 1.6]], { color: "#ffffff", opacity: 0.1 }); }
        const lost = args.mode === "arcade" && !won;
        outlined(d, lost ? "BURNT!" : args.players === 2 ? `PLAYER ${args.winner + 1} WINS` : won ? "YOU WIN!" : `${f.name} WINS`, { x: P2 ? W / 2 : W * 0.66, y: v.safe.top + (P2 ? 40 : 56), size: Math.min(36, W / 11), bold: true, font: DISPLAY, color: lost ? CREAM : GOLD });
        d.reset();
        P.draw(d, P2 ? W / 2 : W * 0.26, P2 ? H * 0.56 : H * 0.9, { scale: P2 ? 1.7 : 1.55, face: 1 });
        d.reset();
        outlined(d, `"${WIN_QUOTE[id]}"`, { x: P2 ? W / 2 : W * 0.66, y: P2 ? H * 0.61 : H * 0.36, size: 15, bold: true, font: FONT, color: "#ffffff", maxWidth: P2 ? W - 40 : W * 0.56, align: "center" });
        if (t > 20) outlined(d, `BEST COMBO ${st.best}   DAMAGE ${st.dmg}   SUPERS ${st.supers}`, { x: P2 ? W / 2 : W * 0.66, y: P2 ? H * 0.67 : H * 0.5, size: 12, bold: true, font: FONT, color: CREAM, maxWidth: W - 20 });
    });
    const label = args.mode === "arcade" ? (won ? (args.rung >= 6 ? "ENDING" : "NEXT COURSE") : "TRY AGAIN") : "REMATCH";
    const P2 = portrait();
    const dx = s.view.width * 0.16;
    s.add([pin("bottom", [P2 ? 0 : dx + 106, P2 ? 96 : 34]), chunky(label, { width: 200, height: 56, textSize: 20, onTap: primary })]);
    s.add([pin("bottom", [P2 ? 0 : dx - 88, P2 ? 32 : 36]), chunky("MENU", { width: 140, height: 44, textSize: 15, color: "#6b5b73", onTap: () => { sound.back(); game.go("title", {}, { fade: 0.3 }); } })]);
});

// --- Endings ---------------------------------------------------------------------------------------------------
function prop(d, name, W, H, t) {
    const x = W * 0.74, y = H * 0.3;
    if (name === "trophy") {
        const b = Math.sin(t * 0.05) * 3;
        d.rect(14, 60, { x: W / 2, y: H * 0.2 + b, color: GOLD, radius: 5 }); d.circle(20, { x: W / 2, y: H * 0.11 + b, color: GOLD });
        for (let i = 0; i < 3; i++) d.rect(5, 26, { x: W / 2 - 11 + i * 11, y: H * 0.1 + b, color: "#fff1a8", radius: 2 });
        d.additive(() => d.circle(60, { x: W / 2, y: H * 0.14 + b, color: GOLD, opacity: 0.14 }));
    } else if (name === "sun") { d.circle(34, { x, y, color: "#ffe99a" }); d.additive(() => d.circle(70, { x, y, color: "#ffcf6a", opacity: 0.16 })); }
    else if (name === "moon") { d.circle(28, { x, y, color: "#fff6c8" }); d.circle(25, { x: x + 12, y: y - 7, color: "#1d1c4a" }); for (let i = 0; i < 3; i++) outlined(d, "z", { x: W * 0.46 + i * 12, y: H * 0.42 - i * 16, size: 14 + i * 5, bold: true, font: DISPLAY, color: CREAM }); }
    else if (name === "toast" || name === "bread") { const p = shared.toast; d.sprite("shared", { x, y: H * 0.5, width: p.w * 1.4, height: p.h * 1.4, crop: p.crop }); }
    else if (name === "cup" || name === "dial") { const p = shared.bean; d.sprite("shared", { x, y: H * 0.42, width: p.w * 1.6, height: p.h * 1.6, crop: p.crop }); }
    else if (name === "corn") { const p = shared.mine; d.sprite("shared", { x: W * 0.5, y: H * 0.5, width: p.w * 1.8, height: p.h * 1.8, crop: p.crop }); }
    else if (name === "waffle") { d.rect(70, 70, { x, y: H * 0.42, color: "#a8742a", radius: 8 }); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) d.rect(16, 16, { x: x - 20 + i * 20, y: H * 0.42 - 20 + j * 20, color: "#e8b264", radius: 2 }); }
    else if (name === "roses") { for (let i = 0; i < 5; i++) d.circle(8, { x: x - 20 + i * 11, y: H * 0.4 + Math.sin(i) * 6, color: RED }); }
    else if (name === "plan") { d.rect(66, 86, { x, y: H * 0.42, color: "#fffdf5", radius: 3 }); for (let i = 0; i < 6; i++) d.rect(46, 3, { x, y: H * 0.42 - 30 + i * 11, color: "#3a3442" }); }
}
game.scene("ending", (s, args) => {
    menu();
    kit.song(SONGS.ending);
    const e = ENDINGS[args.id];
    let page = 0, t = 0, cast = [], stageName = null;
    const load = () => {
        const pn = e.panels[page];
        stageName = paintStage(game.assets, pn.stage);
        cast = pn.actors.map((a) => ({ a, p: puppetOf(a.id) }));
        for (const c of cast) { if (c.a.pose === "win") c.p.f.st = "win"; }
        t = 0;
    };
    load();
    const next = () => {
        const len = e.panels[page].text.length;
        if (t < len * 1.1) { t = len * 1.1 + 1; return; }
        sound.click(); page++;
        if (page >= e.panels.length) game.go(args.next ?? "title", {}, { fade: 0.5 }); else load();
    };
    s.add([ui(), rect(10000, 10000, { color: "#00000000" }), tap(next), pin("center")]);
    s.onUpdate(() => {
        t++;
        for (const c of cast) { c.p.update({ frame: t, flashBy: null, flash: 0 }, null, 0); if (c.a.pose === "sleep") { c.p.q.eye = "x"; c.p.blink = -1; c.p.q.eye = "norm"; c.p.q.mouth = "set"; c.p.q.lid = 0; c.p.q.eye = "joy"; } if (c.a.pose === "open") c.p.q.top = 1; }
        if (nav(s).ok) next();
    });
    backdrop(s, (d) => {
        const v = s.view, W = v.width, H = v.height, P = H > W, pn = e.panels[page], panelH = P ? H * 0.62 : H * 0.66, top = v.safe.top + 40;
        d.rect(W, H, { x: W / 2, y: H / 2, color: "#160e1c" });
        outlined(d, e.title, { x: W / 2, y: v.safe.top + 20, size: 16, bold: true, font: DISPLAY, color: GOLD });
        // A comic panel: the kitchen, a thick frame, and the cast.
        const pw = W - 24, cx = W / 2, cy = top + panelH / 2, zoom = Math.max(pw / 700, panelH / 420), S = STAGE_SIZE, cw = pw / zoom, chh = panelH / zoom;
        d.rect(pw + 10, panelH + 10, { x: cx, y: cy, color: CREAM, radius: 4 });
        d.sprite(stageName, { x: cx, y: cy, width: pw, height: panelH, crop: [S.X0 - cw / 2, Math.max(0, S.Y0 + 40 - chh), cw, chh] });
        const floor = top + panelH - 40 * zoom;
        for (const c of cast) { d.reset(); c.p.draw(d, cx + c.a.x * zoom, floor, { scale: zoom * 1.1, face: c.a.flip ? -1 : 1 }); }
        d.reset();
        d.push(); d.translate(0, top); for (const n of pn.props) prop(d, n, W, panelH, t); d.pop();
        const shown = pn.text.slice(0, Math.floor(t / 1.1));
        d.text(shown, { x: W / 2, y: top + panelH + (P ? 70 : 44), size: 15, bold: true, font: FONT, color: CREAM, maxWidth: W - 36, align: "left", lineHeight: 1.3 });
        d.text(`${page + 1} / ${e.panels.length}`, { x: W - 34, y: v.safe.top + 20, size: 12, font: FONT, bold: true, color: "#9c8fa6" });
    });
});
game.scene("gallery", (s) => {
    menu();
    kit.song(SONGS.select);
    const pups = ROSTER.map(puppetOf);
    let t = 0;
    s.onUpdate(() => { t++; for (const p of pups) p.update({ frame: t, flashBy: null, flash: 0 }, null, 0); if (nav(s).back) game.go("title", {}, { fade: 0.25 }); });
    const pos = (i) => { const v = s.view, P = portrait(), cols = P ? 2 : 4, rows = P ? 4 : 2, gw = v.width - 24, gh = v.height - v.safe.top - v.safe.bottom - 74, cw = gw / cols, ch = gh / rows; return { x: 12 + cw * (i % cols + 0.5), y: v.safe.top + 52 + ch * (Math.floor(i / cols) + 0.5), cw, ch }; };
    ROSTER.forEach((id, i) => {
        const fit = (e) => { const p = pos(i); e.pos.x = p.x; e.pos.y = p.y; e.size.x = p.cw - 6; e.size.y = p.ch - 6; };
        fit(s.add([ui(), rect(60, 60, { color: "#00000000" }), tap(() => { if (save.cleared[id]) { sound.pick(); game.go("ending", { id, next: "gallery" }, { fade: 0.3 }); } else { sound.back(); game.haptic("warn"); } }), { update(dt, e) { fit(e); } }]));
    });
    backdrop(s, (d) => {
        const v = s.view, W = v.width;
        d.rect(W, v.height, { x: W / 2, y: v.height / 2, color: "#2c1f33" });
        outlined(d, "ENDINGS", { x: W / 2, y: v.safe.top + 24, size: 22, bold: true, font: DISPLAY, color: GOLD });
        for (let i = 0; i < 8; i++) {
            const p = pos(i), f = FIGHTERS[i], has = save.cleared[f.id];
            d.rect(p.cw - 6, p.ch - 6, { x: p.x, y: p.y, color: INK, radius: 10 });
            d.rect(p.cw - 12, p.ch - 12, { x: p.x, y: p.y, color: has ? f.color : "#3b3042", radius: 7 });
            d.reset();
            pups[i].draw(d, p.x - p.cw * 0.25, p.y + p.ch * 0.4, { scale: Math.min(p.cw, p.ch * 1.6) / 220, face: 1, noShake: true });
            d.reset();
            outlined(d, f.name, { x: p.x + p.cw * 0.2, y: p.y - 12, size: Math.min(12, (p.cw * 0.54) / (f.name.length * 0.64)), bold: true, font: DISPLAY, color: "#ffffff" });
            d.text(has ? ENDINGS[f.id].title : "ARCADE TO UNLOCK", { x: p.x + p.cw * 0.2, y: p.y + 10, size: 9, bold: true, font: FONT, color: has ? CREAM : "#9c8fa6", maxWidth: p.cw * 0.56 });
        }
    });
    s.add([pin("top-left", [34, 32]), chunky("<", { width: 52, height: 50, textSize: 20, color: "#6b5b73", onTap: () => { sound.back(); game.go("title", {}, { fade: 0.25 }); } })]);
});

game.kit = { puppetOf, shared, paintStage };
game.start("title");
