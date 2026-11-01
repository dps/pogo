// LUNCH LADY RIOT. The food has possessed the school. One lunch lady has a ladle and a very short fuse.
import { createGame, pin, rect, tap, text, ui } from "./pogo.js";
import { BTN, DIFFS, STAGES, report } from "./data.js";
import { BOSSES } from "./bosses.js";
import { C, paintCast } from "./art.js";
import { Sound } from "./audio.js";
import { FONT, comic } from "./view.js";
import { Play } from "./play.js";
import { Puppet, Stamp, drawPuppet, tickClock } from "./puppet.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#22122e", "#160c20"], letterbox: "#160c20",
    actions: {
        left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"],
        atk: ["KeyJ", "KeyZ", "pad:x"], hvy: ["KeyK", "KeyX", "pad:y"], jmp: ["Space", "KeyL", "KeyC", "pad:a"], spc: ["KeyI", "KeyV", "pad:down"], ddg: ["ShiftLeft", "ShiftRight", "Semicolon", "pad:b"], tag: ["KeyE", "KeyQ", "pad:up"],
        pause: ["Escape", "KeyP", "pad:start"], confirm: ["Enter", "pad:a"],
    },
    seed: 1, maxDpr: 2,
});

const cast = paintCast(game.assets), st = new Stamp(cast);
const SAVE = "lunchriot1";
const defaults = () => ({ reached: 0, best: {}, grades: {}, scores: {}, sound: true, haptics: true, taught: 0, topCombo: 0, cleared: false, diff: 0 });
let save = { ...defaults(), ...game.load(SAVE, {}) };
const persist = () => game.save(SAVE, save);
game.audio.muted = !save.sound; game.haptics.enabled = save.haptics;
const sound = new Sound(game);
let pad = null;
const kit = {
    cast, sound, get save() { return save; }, persist, mouse: false,
    onScreen: () => game.input.touchMode || kit.mouse,
    setPad(p) { pad = p; },
    noteCombo(n) { if (n > save.topCombo) { save.topCombo = n; persist(); } },
    pause: null,
};
// The stock touch controls have one layout; pointer events route through our pad while it's on screen.
const T = game.touch, stock = { down: T.pointerDown.bind(T), move: T.pointerMove.bind(T), up: T.pointerUp.bind(T), reset: T.reset.bind(T) };
T.pointerDown = (id, x, y) => (pad ? pad.down(id, x, y) : stock.down(id, x, y));
T.pointerMove = (id, x, y) => (pad ? pad.move(id, x, y) : stock.move(id, x, y));
T.pointerUp = (id) => { pad?.up(id); stock.up(id); };
T.reset = () => { pad?.reset(); stock.reset(); };
if (typeof addEventListener !== "undefined") {
    addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") kit.mouse = true; }, true);
    addEventListener("keydown", (e) => { if (Object.values(game.input.actions).some((b) => b.includes(e.code))) kit.mouse = false; }, true);
}
const menu = () => { pad = null; game.touch.set({}); };

// --- Small UI kit ---------------------------------------------------------------------------------------------------
function btn(s, label, anchor, off, w, h, col, onTap, o = {}) {
    const dark = o.dark ?? (col === C.mustard || col === C.cream);
    const e = s.add([rect(w, h, { color: col, radius: Math.min(h / 2.4, 16), outline: 0 }), pin(anchor, off), tap(() => { sound.play("click"); e.scale = 0.92; s.wait(0.08, () => { e.scale = 1; onTap(); }); }), { layer: 5, name: label }]);
    e.onDrawUnder = true;
    if (o.action) e.onUpdate(() => { if (s.input.pressed(o.action)) { sound.play("click"); onTap(); } });
    e.child([text(label, { size: o.size ?? Math.min(19, h * 0.42), bold: true, font: FONT, color: dark ? C.ink : "#fff8ea" }), { name: "label", layer: 6 }]);
    return e;
}
const label = (s, str, anchor, off, size, color = C.cream, extra = {}) => s.add([text(str, { size, bold: true, font: FONT, color, align: "center", ...extra }), pin(anchor, off), { layer: 6 }]);
const inkPlate = (d, x, y, w, h, col = C.ink, r = 14) => d.rect(w, h, { x, y, color: col, radius: r });

const widthOf = (str, size) => game.renderer.measureText(str, { size, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width;
/** d.text centres on x; report cards want a left edge. */
const textL = (d, str, x, y, size, color) => d.text(str, { x: x + widthOf(str, size) / 2, y, size, bold: true, font: FONT, color });
const STAGE_COL = [C.tomato, C.blue, C.orange, C.teal, C.grape, C.pink];
const NOTES = { S: "Gold star. Don't tell the others.", A: "A delight to have in class.", B: "Shows real promise with a ladle.", C: "Could try harder. And hit harder.", D: "See me about your follow-through.", F: "See me after class." };
function sunburst(d, v, cx, cy, t, a, b) {
    const n = 14, R = Math.max(v.width, v.height) * 1.1;
    d.rect(v.width + 10, v.height + 10, { x: v.width / 2, y: v.height / 2, color: a });
    for (let i = 0; i < n; i++) { const p = (i / n) * 6.283 + t * 0.002, q = p + 3.14 / n; d.poly([[cx, cy], [cx + Math.cos(p) * R, cy + Math.sin(p) * R], [cx + Math.cos(q) * R, cy + Math.sin(q) * R]], { color: b }); }
}
/** Live posed puppets for menus. */
let poserId = 0;
function poser(list) {
    const ps = list.map(([kind, o]) => { const a = { id: (poserId += 7), st: "idle", t: 0, face: 1, flash: 0, x: 0, y: 0, z: 0, hp: 10, vy: 0, vx: 0, type: kind, ...o }; return new Puppet(a, kind, o.stage ?? 0); });
    return ps;
}

// --- Title ---------------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    menu(); game.touch.set({}); game.data.scene = "title";
    const first = save.reached === 0 && !save.grades.cafeteria;
    sound.music("title");
    const M = { st: "atk", t: 16, mv: { st: 13, ac: 4, rc: 20, anim: "wallop" } };
    const P = poser([
        ["dot", { hero: true, key: "dot", ...M }],
        ["kid", { variant: 1, st: "air", vy: 300, face: -1 }], ["tot", { variant: 2, st: "fly", face: -1, stage: 0 }], ["big", { variant: 0, st: "hit", hurtPose: 2, face: -1 }], ["tray", { variant: 3, st: "hit", hurtPose: 0, face: -1, shield: 0 }],
        ["pip", { hero: true, key: "pip", st: "atk", t: 9, mv: { st: 7, ac: 4, rc: 15, anim: "scoop" } }],
    ]);
    for (let i = 0; i < 40; i++) P.forEach((p) => p.update());
    P[0].a.st = "x"; P[5].a.st = "x"; P[0].eye = "mad"; P[0].mouth = "yell"; P[5].eye = "mad"; P[5].mouth = "yell";
    let t = 0;
    s.onUpdate(() => { t++; tickClock(); for (let i = 1; i < 5; i++) P[i].update(); P[1].spin += 0.03; P[2].spin += 0.05; });
    s.onDraw((d) => {
        const v = s.view, portrait = v.height > v.width, cx = v.width * (portrait ? 0.5 : 0.66), cy = v.height * (portrait ? 0.52 : 0.6);
        sunburst(d, v, cx, cy, t, "#ffc52e", "#ffdc6a");
        const k = portrait ? Math.min(v.width / 370, v.height / 660) : Math.min(v.height / 345, v.width / 620), gy = portrait ? v.height * 0.76 : v.height * 0.9;
        const stamp = (p, x, y, K) => { st.part(d, "shadow", x, gy + 4, { sx: K * 1.1 }); drawPuppet(d, st, p, x, y, K); };
        // A floor and a slam of light behind the hit.
        const fw = v.width + 10, fh = v.height - gy, tile = 46; d.rect(fw, fh, { x: v.width / 2, y: gy + fh / 2, color: "#ffd7a8" });
        for (let j = 0; j * tile < fh + tile; j++) for (let i = -1; i * tile < fw + tile; i++) if ((i + j) % 2 === 0) d.rect(tile, tile, { x: i * tile, y: gy + tile / 2 + j * tile, color: "#f47a5e" });
        d.rect(fw, 6, { x: v.width / 2, y: gy, color: C.ink });
        const bx = cx + 56 * k, by = gy - 96 * k;
        stamp(P[3], cx + 136 * k, gy, k * 0.8);
        const bob = Math.sin(t * 0.05) * 6;
        drawPuppet(d, st, P[1], cx + 74 * k, gy - (portrait ? 186 : 150) * k + bob, k * 0.9);
        drawPuppet(d, st, P[2], cx + 158 * k, gy - (portrait ? 200 : 136) * k - bob, k * 0.8);
        // Lunch, airborne.
        for (let i = 0; i < 9; i++) { const a = i * 0.7 + t * 0.012, r = (90 + (i * 53) % 150) * k, fx = bx + Math.cos(a) * r * 1.3, fy = by - 60 * k + Math.sin(a * 1.3) * r * 0.62; st.part(d, ["p_peas", "i_cookie", "p_gravy", "p_crouton", "f_tot", "i_pudding", "p_mustard", "i_milk", "p_slip"][i], fx, fy, { sx: k * 0.74, rot: a * 3 + i }); }
        st.part(d, "burst", bx, by, { sx: k * 1.2 * (1 + Math.sin(t * 0.3) * 0.08), rot: t * 0.01, color: C.tomato });
        st.part(d, "burst", bx, by, { sx: k * 0.86, rot: 0.4 + t * 0.01 });
        stamp(P[5], cx - 132 * k, gy + 4, k * 0.86);
        stamp(P[0], cx - 44 * k, gy, k * 1.06);
    });
    s.onDrawUI((d) => {
        const v = s.view, portrait = v.height > v.width, cx = v.width * (portrait ? 0.5 : 0.25), big = Math.min(portrait ? v.width * 0.14 : v.width * 0.072, 72), y = v.safe.top + (portrait ? 62 + big * 0.7 : big * 1.2) + 6;
        const wob = Math.sin(t * 0.06) * 0.012;
        comic(d, "LUNCH LADY", cx, y, big * 0.86, 1, -0.04 + wob, ["#fff4dc", C.tomato]);
        comic(d, "RIOT!", cx + big * 0.3, y + big * 1.16, big * 1.62, 1 + Math.sin(t * 0.09) * 0.012, -0.04 - wob, [C.tomato, C.ink]);
    });
    const v = s.view, portrait = v.height > v.width;
    const go = () => { if (first) start({ stage: 0, mode: "story" }); else game.go("select", { mode: "story" }, { fade: 0.2 }); };
    btn(s, first ? "RIOT!" : "PLAY", portrait ? "bottom" : "bottom-left", portrait ? [0, 74] : [Math.max(8, v.width * 0.25 - v.safe.left - 100), 72], portrait ? 240 : 200, portrait ? 66 : 56, C.tomato, go, { action: "confirm", size: 26 });
    if (!first) btn(s, "SCORE ATTACK", "bottom", [0, portrait ? 18 : -999], 190, 44, C.blue, () => game.go("select", { mode: "score" }, { fade: 0.2 }), { size: 14 });
    if (!first && !portrait) btn(s, "SCORE ATTACK", "bottom-left", [Math.max(8, v.width * 0.25 - v.safe.left - 100), 16], 200, 44, C.blue, () => game.go("select", { mode: "score" }, { fade: 0.2 }), { size: 14 });
    settings(s);
});
function settings(s, low = false) {
    const mk = (idx, key, on, off, apply) => {
        const e = s.add([rect(72, 50, { color: low ? C.blue : C.ink, radius: 20 }), low ? pin("bottom", [(idx - 0.5) * 84, 14]) : pin("top-right", [8 + idx * 80, 8]), tap(() => { save[key] = !save[key]; apply(save[key]); persist(); e.get?.("x"); lab.text = save[key] ? on : off; sound.play("click"); }), { layer: 7, name: key }]);
        const lab = e.child([text(save[key] ? on : off, { size: 13, bold: true, font: FONT, color: C.cream }), { layer: 8 }]);
    };
    mk(0, "sound", "SOUND", "MUTE", (v) => { game.audio.muted = !v; });
    mk(1, "haptics", "BUZZ", "NO BZ", (v) => { game.haptics.enabled = v; if (v) game.haptic("medium"); });
}
function start(a) {
    menu();
    game.go("load", a, { fade: 0.18 });
}
/** One frame of black so the sheet paint has a card over it. */
game.scene("load", (s, a) => {
    menu(); s.onDrawUI((d) => { const v = s.view; comic(d, STAGES[a.stage].name, v.width / 2, v.height / 2, Math.min(30, v.width * 0.08), 1, -0.03, [C.mustard, C.tomato]); });
    let n = 0; s.onUpdate(() => { if (++n === 3) game.go("play", a); });
});

// --- Stage select: a class timetable --------------------------------------------------------------------------------
game.scene("select", (s, a) => {
    menu(); game.data.scene = "select";
    const score = a.mode === "score";
    if (save.diff > 0 && !save.cleared) save.diff = 0;
    s.onDraw((d) => { const v = s.view; sunburst(d, v, v.width / 2, v.height * 0.2, 0, score ? "#3f7ff0" : "#17b5a6", score ? "#5a94f4" : "#2cc6b6"); });
    const v = s.view, portrait = v.height > v.width;
    label(s, score ? "SCORE ATTACK" : "TIMETABLE", "top", [12, 26], score ? 20 : 24, C.mustard);
    btn(s, "BACK", "top-left", [8, 8], 66, 44, C.ink, () => game.go("title", {}, { fade: 0.2 }), { size: 13, action: undefined });
    const n = STAGES.length, cols = portrait ? 1 : 2, rows = Math.ceil(n / cols), W = portrait ? v.width - 30 : (v.width - 40) / 2, gap = 6, H = Math.min(88, (v.height - 130 - (save.cleared ? 50 : 0)) / rows - gap);
    STAGES.forEach((c, i) => {
        const open = score ? i <= save.reached : i <= save.reached, col = cols === 2 ? (i % 2) : 0, row = cols === 2 ? i >> 1 : i;
        const off = [(col - (cols - 1) / 2) * (W + 8), 66 + row * (H + gap) + H / 2];
        const best = score ? save.scores[c.id] : save.best[c.id], g = save.grades[c.id];
        const e = s.add([rect(W, H, { color: open ? C.cream : "#8a7f98", radius: 12 }), pin("top", off), tap(() => { if (!open) { sound.play("block"); return; } sound.play("click"); start({ stage: i, mode: a.mode, diff: save.diff }); }), { layer: 5, name: `stage${i}` }]);
        const nameStr = open ? c.name : "LOCKED", subStr = open ? `vs ${BOSSES[c.boss].name}` : "beat the last boss", L = -W / 2 + 56;
        e.child([text(nameStr, { size: 15, bold: true, font: FONT, color: C.ink }), { layer: 6 }]).pos = [L + widthOf(nameStr, 15) / 2, -10];
        e.child([text(subStr, { size: 13, bold: true, font: FONT, color: "#5a4a68" }), { layer: 6 }]).pos = [L + widthOf(subStr, 13) / 2, 12];
        e.child([rect(36, 36, { color: open ? STAGE_COL[i] : "#6d6078", radius: 18 }), { layer: 6 }]).pos = [-W / 2 + 28, 0];
        e.child([text(String(i + 1), { size: 18, bold: true, font: FONT, color: "#fff8ea" }), { layer: 7 }]).pos = [-W / 2 + 28, 0];
        if (g) e.child([text(g, { size: 26, bold: true, font: FONT, color: C.tomato }), { layer: 6 }]).pos = [W / 2 - 28, best ? -8 : 0];
        if (best) { const b = String(best); e.child([text(b, { size: 13, bold: true, font: FONT, color: C.ink }), { layer: 6 }]).pos = [W / 2 - 12 - widthOf(b, 13) / 2, H / 2 - 13]; }
    });
    if (save.cleared) btn(s, DIFFS[save.diff].name, "bottom", [0, 8], 200, 40, save.diff ? C.tomato : C.ink, () => { save.diff = save.diff ? 0 : 1; persist(); game.go("select", a); }, { size: 13 });
});

// --- Report card ----------------------------------------------------------------------------------------------------
game.scene("result", (s, a) => {
    menu(); game.data.scene = "result";
    const c = STAGES[a.stage], win = a.win, o = a.over, letter = win ? o.letter : "F";
    game.data.letter = letter; game.data.win = win;
    let newBest = false;
    if (win) {
        if (a.stage + 1 > save.reached) save.reached = Math.min(STAGES.length - 1, a.stage + 1);
        const rank = "FDCBAS"; if (!save.grades[c.id] || rank.indexOf(letter) > rank.indexOf(save.grades[c.id])) save.grades[c.id] = letter;
        const tbl = a.mode === "score" ? save.scores : save.best;
        if ((tbl[c.id] ?? 0) < a.score) { tbl[c.id] = a.score; newBest = true; }
        if (a.stage === STAGES.length - 1 && a.mode !== "score") save.cleared = true;
        persist();
    }
    sound.music(win ? "win" : "lose");
    const lines = win ? [["P.E.", `${a.stats.best} hit combo`], ["HOME EC", `${a.stats.freed} students freed`], ["PHYSICS", `${a.stats.throws} thrown, ${a.stats.aerial} in the air`], ["GYM", `${a.stats.perfects} perfect dodges`], ["CONDUCT", `${a.stats.dmgTaken} damage taken`], ["ATTENDANCE", `${Math.floor(a.stats.secs / 60)}m ${Math.floor(a.stats.secs % 60)}s`]] : [["P.E.", `${a.stats.best} hit combo`], ["HOME EC", `${a.stats.freed} students freed`], ["NOTE", "See me after class."]];
    let t = 0;
    const who = poser([["dot", { hero: true, key: "dot" }]])[0];
    s.onUpdate(() => { tickClock(); who.update(); who.eye = win ? "happy" : "mad"; who.mouth = win ? "grin" : "flat"; if (++t === 42) { sound.play("stamp"); s.shake(7, 0.2, { haptic: false }); } });
    s.onDraw((d) => {
        const v = s.view; sunburst(d, v, v.width / 2, v.height * 0.4, t, win ? "#ffc52e" : "#7b4de0", win ? "#ffdc6a" : "#8f64e8");
        const W = Math.min(v.width - 28, 460), H = Math.min(v.height - 110, 92 + lines.length * 30 + (win ? 40 : 0)), x = v.width / 2, y = v.safe.top + 14 + H / 2, slide = Math.max(0, 1 - t / 14), yy = y - slide * slide * v.height;
        d.push(); d.translate(x, yy); d.rotate(-0.012);
        d.rect(W + 8, H + 8, { color: C.ink, radius: 8 }); d.rect(W, H, { color: "#fffdf0", radius: 5 });
        for (let i = 0; -H / 2 + 62 + i * 28 < H / 2 - 8; i++) d.rect(W - 8, 1.5, { y: -H / 2 + 62 + i * 28, color: "#9ad8f0", opacity: 0.6 });
        d.rect(2, H, { x: -W / 2 + 28, color: C.tomato, opacity: 0.5 });
        textL(d, "REPORT CARD", -W / 2 + 38, -H / 2 + 22, 19, C.ink);
        textL(d, c.name, -W / 2 + 38, -H / 2 + 44, 12, "#5a4a68");
        lines.forEach(([k, val], i) => {
            const ly = -H / 2 + 76 + i * 28, on = t > 12 + i * 4;
            if (!on) return;
            textL(d, k, -W / 2 + 38, ly, 11, C.blue);
            textL(d, val, -W / 2 + 128, ly, 12, C.ink);
        });
        if (win) {
            d.text(`SCORE ${a.score}${newBest ? "  NEW BEST!" : ""}`, { x: 0, y: H / 2 - 22, size: 15, bold: true, font: FONT, color: newBest ? C.tomato : C.ink });
        }
        if (t > 40) { const q = Math.min(1, (t - 40) / 6), k = 1 + (1 - q) * 2.4; comic(d, letter, W / 2 - 46, -H / 2 + 40, 58, k, 0.16, [win ? C.tomato : "#7b4de0", C.ink]); }
        d.pop();
        // A word from the lunch lady.
        const room = v.height - (yy + H / 2) - 150;
        if (v.height > v.width && room > 120) {
            const K = Math.min(0.92, room / 250), gy = yy + H / 2 + 24 + 196 * K, px = v.width * 0.26;
            st.part(d, "shadow", px, gy, { sx: K }); drawPuppet(d, st, who, px, gy, K * 0.96);
            const note = NOTES[letter], bw = Math.min(v.width * 0.58, 230), bh = 58, bx = v.width * 0.66, by = gy - 96 * K;
            d.rect(bw + 7, bh + 7, { x: bx, y: by, color: C.ink, radius: 12 }); d.rect(bw, bh, { x: bx, y: by, color: "#fffdf0", radius: 10 });
            d.poly([[bx - bw / 2 + 2, by + 8], [bx - bw / 2 - 18, by + 22], [bx - bw / 2 + 2, by + 22]], { color: C.ink });
            d.text(note, { x: bx, y: by, size: 12, bold: true, font: FONT, color: C.ink, maxWidth: bw - 16, lineHeight: 1.2 });
        }
    });
    const v = s.view, portrait = v.height > v.width;
    if (win) {
        const last = a.stage === STAGES.length - 1, next = () => { if (a.mode === "score") game.go("select", { mode: "score" }, { fade: 0.2 }); else if (last) game.go("ending", {}, { fade: 0.4 }); else start({ stage: a.stage + 1, mode: "story", diff: a.diff, carry: a.carry }); };
        btn(s, a.mode === "score" ? "DONE" : last ? "THE END?" : "NEXT PERIOD", "bottom", [portrait ? 0 : 92, portrait ? 24 : 14], 200, 54, C.tomato, next, { action: "confirm", size: 18 });
        btn(s, "TIMETABLE", "bottom", [portrait ? 0 : -130, portrait ? 86 : 14], 170, 44, C.ink, () => game.go("select", { mode: a.mode ?? "story" }, { fade: 0.2 }), { size: 13 });
    } else {
        const cp = a.mode === "score" ? 0 : a.arena ?? 0;
        btn(s, a.mode === "score" ? "RETRY" : "TRY AGAIN", "bottom", [portrait ? 0 : 92, portrait ? 24 : 14], 200, 54, C.tomato, () => start({ stage: a.stage, mode: a.mode, diff: a.diff, start: cp, carry: undefined }), { action: "confirm", size: 18 });
        btn(s, "TIMETABLE", "bottom", [portrait ? 0 : -130, portrait ? 86 : 14], 170, 44, C.ink, () => game.go("select", { mode: a.mode ?? "story" }, { fade: 0.2 }), { size: 13 });
    }
});

// --- Ending -----------------------------------------------------------------------------------------------------------
game.scene("ending", (s) => {
    menu(); game.data.scene = "ending"; sound.music("win");
    const P = poser([["dot", { hero: true, key: "dot" }], ["pip", { hero: true, key: "pip" }], ...[0, 1, 2, 3, 0, 1].map((n, i) => [["kid", "tot", "lobber", "tray", "stink", "kid"][i], { variant: n, st: "ko", t: 200 + i * 30, face: i < 3 ? 1 : -1 }])]);
    let t = 0;
    s.onUpdate(() => { t++; tickClock(); P.forEach((p) => { if (!p.a.hero) p.a.t = 120; p.update(); }); });
    s.onDraw((d) => {
        const v = s.view; sunburst(d, v, v.width / 2, v.height * 0.5, t, "#ff9a6a", "#ffb48a");
        const portrait = v.height > v.width, k = portrait ? v.width / 340 : v.height / 400, gy = v.height * (portrait ? 0.7 : 0.76);
        d.rect(v.width + 10, v.height - gy, { x: v.width / 2, y: (gy + v.height) / 2, color: "#b86a58" }); d.rect(v.width + 10, 6, { x: v.width / 2, y: gy, color: C.ink });
        P.forEach((p, i) => { if (i < 2) return; const X = v.width / 2 + (i - 4.5) * 58 * k, b = Math.abs(Math.sin(t * 0.14 + i)) * 26 * k; st.part(d, "shadow", X, gy + 8, { sx: k }); drawPuppet(d, st, p, X, gy - b + 6, k * 0.8); });
        st.part(d, "shadow", v.width / 2 - 40 * k, gy + 16, { sx: k * 1.2 }); drawPuppet(d, st, P[0], v.width / 2 - 40 * k, gy + 18, k * 1.1);
        st.part(d, "shadow", v.width / 2 + 54 * k, gy + 18, { sx: k }); drawPuppet(d, st, P[1], v.width / 2 + 54 * k, gy + 20, k);
    });
    s.onDrawUI((d) => {
        const v = s.view; comic(d, "LUNCH IS SERVED", v.width / 2, v.safe.top + 40, Math.min(32, v.width * 0.082), 1, -0.03, [C.mustard, C.tomato]);
        const str = save.diff ? "Even Extra Spicy couldn't stop her." : "The school is free. EXTRA SPICY is on the menu.", size = Math.min(13, v.width / 34), w = widthOf(str, size) + 24;
        d.rect(w, size + 14, { x: v.width / 2, y: v.safe.top + 78, color: C.cream, radius: 8 });
        d.text(str, { x: v.width / 2, y: v.safe.top + 78, size, bold: true, font: FONT, color: C.ink });
    });
    btn(s, "SECONDS?", "bottom", [0, 24], 200, 54, C.tomato, () => game.go("select", { mode: "story" }, { fade: 0.2 }), { action: "confirm", size: 18 });
});

// --- Play ---------------------------------------------------------------------------------------------------------------
let play = null;
game.scene("play", (s, a) => {
    game.touch.set({});
    play = new Play(game, s, a, kit);
    game.play = play;
    s.add([rect(46, 46, { color: "#00000000", radius: 23 }), pin("top-right", [1, 1]), tap(() => kit.pause(play)), { layer: 9, name: "pause" }]);
});
/** A menu over the frozen fight. */
kit.pause = (p) => {
    const s = p.s;
    if (p.paused) return;
    p.paused = true; s.paused = true; sound.play("pause"); pad?.reset();
    const items = [];
    const close = () => { for (const e of items) e.destroy(); s.paused = false; p.paused = false; s.input.pressed("pause"); };
    const v = s.view, keyboard = !p.pad.show;
    const dim = s.add([rect(v.width * 2, v.height * 2, { color: "#22122ed0" }), ui(), { layer: 20, pos: [v.width / 2, v.height / 2] }]); dim.pos = [v.width / 2, v.height / 2]; items.push(dim);
    const add = (e) => { e.layer = 21; for (const c of e.children ?? []) c.layer = 22; items.push(e); return e; };
    add(label(s, "PAUSED", "center", [0, -116], 30, C.mustard));
    add(btn(s, "BACK TO CLASS", "center", [0, -44], 220, 54, C.tomato, close, { size: 16 }));
    add(btn(s, "RESTART", "center", [0, 18], 220, 52, C.blue, () => { s.paused = false; game.go("play", p.a, { fade: 0.15 }); }, { size: 15 }));
    add(btn(s, "TIMETABLE", "center", [0, 78], 220, 52, C.ink, () => { s.paused = false; game.go("select", { mode: p.a.mode ?? "story" }, { fade: 0.15 }); }, { size: 15 }));
    add(label(s, keyboard ? "WASD MOVE  J ATTACK  K HEAVY  SPACE JUMP\nSHIFT DODGE  I SOUP  E TAG" : "HEAVY AFTER ATTACK: SCOOP, SLAM, HOME RUN\nSTICK UP + HEAVY: LAUNCH.  WALK INTO KIDS: GRAB", "center", [0, 142], 13, C.cream, { maxWidth: v.width - 24 }));
    const e0 = s.add([{ ui: true, update: () => { if (s.input.pressed("pause")) close(); } }]); items.push(e0);
    settingsPaused(s, items);
};
function settingsPaused(s, items) { const before = s.entities.length; settings(s, true); for (let i = before; i < s.entities.length; i++) { s.entities[i].layer = 22; items.push(s.entities[i]); } }

const browser = typeof document !== "undefined";
if (browser) document.getElementById("load")?.remove();
game.start("title");
if (globalThis) globalThis.__kit = kit;
