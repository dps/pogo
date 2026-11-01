// STACK ATTACK. Grumpy chubby animals fall into bed. Fill a row and they're flung at the neighbours.
// Rules live in engine.js, opponents in ai.js and rivals.js, touch in gestures.js, feel in view.js and play.js.
import { createGame, pin, pos, rect, tap, ui } from "./pogo.js";
import { FACE_SCALE, FX, MOODS, RIVAL_FRAMES, RIVAL_KEYS, TILE_SCALE, drawLogo, paintAll } from "./art.js";
import { Brain } from "./ai.js";
import { Sound, SONGS } from "./audio.js";
import { KEYS } from "./control.js";
import { Field } from "./engine.js";
import { makePlay } from "./play.js";
import { RIVALS, dailySeed } from "./rivals.js";
import { CREAM, DIM, FONT, INK, MOON, Night, icons, inkText, pillow, roundIcon } from "./ui.js";
import { FieldView } from "./view.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 400 } },
    background: ["#2c2274", "#141a58"],
    touch: { stick: false, buttons: [] },
    actions: KEYS,
    seed: 1, maxDpr: 2,
});
paintAll(game.assets, !game.headless && !location.search.includes("paused"));

const SAVE = "stackattack1";
const clean = () => ({ rung: 0, stars: [], hardStars: [], fails: [], tutored: false, finished: false, insomniaDone: false, muted: false, haptics: true, buttons: false, speed: "normal", best: { marathon: 0, sprint: 0, daily: { key: "", score: 0, streak: 0 } } });
const loaded = game.load(SAVE, {});
const save = { ...clean(), ...loaded, best: { ...clean().best, ...(loaded?.best ?? {}) } };
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;
const sound = new Sound(game);
const ctx = {
    save, sound,
    persist() { game.save(SAVE, save); },
    useSong(name) { if (game.data.song !== name) { game.data.song = name; game.music(SONGS[name]); } },
};
game.on("hide", () => { ctx.persist(); ctx.onHide?.(); });
// Every raw touch sample, not just the latest one per frame: gestures must read the same at any frame rate.
// Hardware timestamps too: a busy main thread hands samples over late, and a flick must not look slow because of that.
if (!game.headless) for (const kind of ["pointerdown", "pointermove", "pointerup", "pointercancel"]) addEventListener(kind, (e) => { ctx.stamp = e.timeStamp; }, { capture: true, passive: true });
const rawPointer = game.input.pointerEvent.bind(game.input);
game.input.pointerEvent = (kind, id, x, y) => { rawPointer(kind, id, x, y); ctx.onPointer?.(kind, id, x, y); };
makePlay(game, ctx);

/** A sleeping heap of animals for the title, built by really dropping pieces. */
function heap(seed, count = 24) {
    const f = new Field({ seed }), b = new Brain({ pps: 20, hands: 1, noise: 4, safe: 16, greed: 1 }, seed);
    for (let i = 0; i < 40000 && (f.pieces < count || f.clearing) && !f.dead; i++) { if (f.pieces < count) b.step(f); f.tick(false); }
    f.active = null; f.delay = 9e9;
    f.events.length = 0;
    return f;
}

function settings(s, anchor, x, y) {
    roundIcon(s, anchor, [x, y], icons.sound, () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; ctx.persist(); sound.ui(); });
    roundIcon(s, anchor, [x + 50, y], icons.buzz, () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); ctx.persist(); });
}

// --- Title ------------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    game.touch.enabled = false;
    s.background = ["#3a2a88", "#141a58"];
    ctx.useSong("lullaby");
    const night = new Night(5), f = heap(12), view = new FieldView(f);
    let t = 0;
    const v = s.view, wide = v.width > v.height;
    const story = () => {
        sound.ui();
        if (!save.tutored) game.go("play", { mode: "story", rung: 0 }, { fade: 0.2 });
        else game.go("ladder", {}, { fade: 0.25 });
    };
    const start = (mode) => () => { sound.ui(); game.go("play", { mode }, { fade: 0.25 }); };
    const placeHeap = () => {
        const vw = s.view;
        const c = wide ? Math.min(30, vw.height / 15) : Math.min(32, vw.width / 10.6), floor = wide ? vw.height + 2 : vw.height - vw.safe.bottom - 158;
        view.place(wide ? vw.width * 0.74 - c * 5 : vw.width / 2 - c * 5, floor - c * 20, c);
    };
    placeHeap();
    s.on("resize", placeHeap);
    const label = !save.tutored ? "Play" : save.finished ? "Ladder" : `Rival ${Math.min(save.rung, RIVALS.length - 1) + 1}`;
    const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`, dailyNow = dailySeed().key;
    const chips = [["Marathon", "marathon", save.best.marathon ? `${save.best.marathon}` : ""], ["Sprint", "sprint", save.best.sprint ? fmt(save.best.sprint) : ""], ["Daily", "daily", save.best.daily.key === dailyNow ? `${save.best.daily.score}` : "New today"]];
    const hasKeys = !game.input.touchMode && v.width > 560;
    if (hasKeys) chips.push(["2 Players", "versus", ""]);
    if (wide) {
        s.add([pillow(label, { width: 196, height: 58, textSize: 25, onTap: story, action: "confirm", color: "#ffb04d", deep: "#c8551e" }), pin("left", [34, 30])]);
        chips.forEach(([name, m, sub], i) => s.add([pillow(name, { sub, width: 108, height: 50, textSize: 15, onTap: start(m), color: "#c9c7e4", deep: "#7c79ad" }), pin("left", [34 + (i % 2) * 118 - 0, 96 + Math.floor(i / 2) * 56]), { name }]));
        settings(s, "top-right", 56, 8);
    } else {
        s.add([pillow(label, { width: 220, height: 60, textSize: 27, onTap: story, action: "confirm", color: "#ffb04d", deep: "#c8551e" }), pin("bottom", [0, 96])]);
        chips.forEach(([name, m, sub], i) => s.add([pillow(name, { sub, width: 106, height: 50, textSize: 15, onTap: start(m), color: "#c9c7e4", deep: "#7c79ad" }), pin("bottom", [(i - 1) * 114, 36]), { name }]));
        settings(s, "top-right", 58, 6);
    }
    s.onUpdate((dt) => { t += dt; view.step(dt); });
    s.add([{ name: "bg", layer: 1, draw(d) {
        night.draw(d, s.view, t, { moonX: wide ? 0.9 : 0.82, moonY: 0.14, near: "#141242", far: "#231e63" });
        view.draw(d, d.quads("tiles"), d.quads("faces"));
    } }]);
    s.onDraw((d) => {
        const vw = s.view, sf = vw.safe;
        if (wide) drawLogo(d, vw.width * 0.27, sf.top + 96, Math.min(300, vw.width * 0.46), t);
        else drawLogo(d, vw.width / 2, sf.top + 158, Math.min(330, vw.width * 0.92), t);
        // A big rude z floats off the pile.
        const fx = d.quads("fx");
        for (let i = 0; i < 3; i++) { const k = ((t * 0.35 + i / 3) % 1); fx(view.x + view.width * 0.56 + Math.sin(k * 7 + i) * 10 + i * 18, view.y + view.height * 0.62 - k * 70, 12 + k * 14, 12 + k * 14, Math.sin(k * 5) * 0.2, FX.z, 1, 1, 1, Math.min(1, (1 - k) * 2) * 0.9); }
    });
});

// --- Ladder -----------------------------------------------------------------------------------------------------
game.scene("ladder", (s, args = {}) => {
    game.touch.enabled = false;
    const hard = !!args.hard;
    s.background = hard ? ["#6a2a6a", "#0e1040"] : ["#ff9d6c", "#1d2068"];
    ctx.useSong("lullaby");
    const night = new Night(9);
    let t = 0;
    const stars = hard ? save.hardStars : save.stars;
    const top = hard ? (() => { let n = 0; while (stars[n]) n++; return Math.min(n, RIVALS.length - 1); })() : Math.min(save.rung, RIVALS.length - 1);
    const from = args.climbed !== undefined ? args.climbed : top;
    const token = { at: from };
    s.tween(token, { at: top }, 0.9, { delay: 0.4, ease: "inOutQuad", onDone: () => { if (args.climbed !== undefined) sound.level(); } });
    const fight = (i) => () => { sound.ui(); game.go("play", { mode: "story", rung: i, hard }, { fade: 0.25 }); };
    const spots = [];
    const lay = () => {
        const v = s.view, sf = v.safe, wide = v.width > v.height;
        spots.length = 0;
        for (let i = 0; i < RIVALS.length; i++) {
            if (wide) {
                const k = i / (RIVALS.length - 1), left = 64 + sf.left, x = left + k * (v.width - left - 76 - sf.right), y = v.height * 0.58 - k * v.height * 0.36 - (i % 2 ? 24 : 0);
                spots.push([x, y]);
            } else {
                const by = v.height - sf.bottom - 196, ty = sf.top + 78, k = i / (RIVALS.length - 1);
                spots.push([v.width / 2 + Math.sin(i * 1.9) * v.width * 0.3, by + (ty - by) * k]);
            }
        }
    };
    lay(); s.on("resize", lay);
    for (let i = 0; i < RIVALS.length; i++) {
        s.add([ui(), pos(spots[i][0], spots[i][1]), rect(52, 52, { color: "#00000000" }), tap(() => { if (i <= top) fight(i)(); else sound.stuck(); }), { name: `rung${i}`, update(dt, e) { e.pos.x = spots[i][0]; e.pos.y = spots[i][1]; } }]);
    }
    const r = RIVALS[top];
    const wideNow = s.view.width > s.view.height;
    s.add([pillow(`Wake up ${r.name.split(" ").pop()}`, { width: 214, height: 54, textSize: 19, onTap: fight(top), action: "confirm", color: "#ffb04d", deep: "#c8551e" }), pin("bottom", wideNow ? [0, 34] : [0, 42]), { name: "go" }]);
    s.add([pin("top-left", [4, 4]), rect(50, 50, { color: "#00000000" }), tap(() => { sound.ui(); game.go("title", {}, { fade: 0.25 }); }), { name: "back", draw(d) { d.circle(21, { color: INK, opacity: 0.8 }); icons.left(d, -1, 0, 11, CREAM); } }]);
    if (save.finished && !hard) s.add([pillow("Insomnia", { width: 110, height: 38, textSize: 14, onTap: () => { sound.ui(); game.go("ladder", { hard: true }, { fade: 0.3 }); }, color: "#d48dff", deep: "#7c3fb8" }), pin("top-right", [8, 12]), { name: "insomnia" }]);
    if (hard) s.add([pillow("Normal", { width: 100, height: 38, textSize: 14, onTap: () => { sound.ui(); game.go("ladder", {}, { fade: 0.3 }); }, color: "#c9c7e4", deep: "#7c79ad" }), pin("top-right", [8, 12]), { name: "normal" }]);
    s.onUpdate((dt) => { t += dt; });
    s.add([{ name: "bg", layer: 1, draw(d) { night.draw(d, s.view, t, { moonX: 0.14, moonY: 0.12, moonR: 0.08, near: "#121040", far: "#262063", hillH: s.view.height * 0.4 }); } }]);
    s.onDraw((d) => {
        const v = s.view, q = d.quads("rivals");
        // The path uphill.
        for (let i = 0; i + 1 < spots.length; i++) {
            const [ax, ay] = spots[i], [bx, by] = spots[i + 1], done = i < top;
            for (let k = 0; k <= 8; k++) d.circle(done ? 3 : 2.2, { x: ax + (bx - ax) * k / 8, y: ay + (by - ay) * k / 8, color: done ? MOON : DIM, opacity: done ? 0.9 : 0.4 });
        }
        for (let i = 0; i < RIVALS.length; i++) {
            const [x, y] = spots[i], open = i <= top, beat = i < top || stars[i] > 0, cur = i === top, sz = cur ? 66 + Math.sin(t * 4) * 2 : 50;
            d.circle(sz * 0.56, { x, y, color: INK, opacity: 0.9 });
            d.circle(sz * 0.5, { x, y, color: cur ? "#ffb04d" : beat ? "#4a4698" : "#2a2650" });
            const tint = open ? 1 : 0.32;
            q(x, y, sz, sz, 0, RIVAL_KEYS.indexOf(RIVALS[i].key) * RIVAL_FRAMES + (beat && !cur ? 2 : 0), tint, tint, tint + 0.05);
            if (stars[i]) { const fx = d.quads("fx"); for (let n = 0; n < stars[i]; n++) fx(x - 13 + n * 13, y + sz * 0.56, 15, 15, 0, FX.star); }
        }
        // Your little cat in bed, climbing the hill.
        const a = Math.floor(token.at), b = Math.min(spots.length - 1, a + 1), k = token.at - a, cx = spots[a][0] + (spots[b][0] - spots[a][0]) * k, cy = spots[a][1] + (spots[b][1] - spots[a][1]) * k - 44 + Math.sin(t * 5) * 2;
        const tt = d.quads("tiles"), fa = d.quads("faces");
        tt(cx, cy, 26 * TILE_SCALE, 26 * TILE_SCALE, 0, 2 * 16);
        fa(cx, cy, 26 * FACE_SCALE, 26 * FACE_SCALE, 0, 2 * 5 + MOODS.grump);
        const wide = v.width > v.height, ry = wide ? v.height - v.safe.bottom - 100 : v.height - v.safe.bottom - 124;
        inkText(d, `${r.name} ${r.title}`, v.width / 2, ry, 18, MOON);
        d.text(`"${r.intro}"`, { x: v.width / 2, y: ry + 19, size: 12, bold: true, font: FONT, color: CREAM, maxWidth: v.width - 36, align: "center" });
        inkText(d, hard ? "Insomnia" : "One long night", v.width / 2, v.safe.top + 26, 20, hard ? "#e6b3ff" : CREAM);
    });
});

// --- Finale ------------------------------------------------------------------------------------------------------
game.scene("finale", (s) => {
    game.touch.enabled = false;
    s.background = ["#ffb27a", "#7a4fa0"];
    ctx.useSong("lullaby");
    const f = heap(5, 46), view = new FieldView(f), night = new Night(2);
    let t = 0;
    sound.fanfare();
    const placeIt = () => { const v = s.view, c = Math.min(v.width > v.height ? 15 : 30, v.width / 11), floor = v.height - v.safe.bottom - 96; view.place(v.width / 2 - c * 5, floor - c * 20, c); };
    placeIt(); s.on("resize", placeIt);
    s.add([pillow("Goodnight", { width: 180, height: 54, onTap: () => { sound.ui(); game.go("title", {}, { fade: 0.4 }); }, action: "confirm", color: "#7be0b0", deep: "#2f9a6e" }), pin("bottom", [0, 30]), { name: "done" }]);
    s.onUpdate((dt) => { t += dt; view.step(dt); });
    s.add([{ name: "bg", layer: 1, draw(d) { night.draw(d, s.view, t, { moonX: 0.5, moonY: 0.3, moonR: 0.16, near: "#4a2f7d", far: "#7a4fa0", stars: 0.2, moonGlow: "#fff0c0" }); view.draw(d, d.quads("tiles"), d.quads("faces")); } }]);
    s.onDraw((d) => {
        const v = s.view, q = d.quads("rivals"), y0 = v.safe.top;
        inkText(d, "Everybody sleeps", v.width / 2, y0 + 44, 28, MOON);
        d.text("Even Reveille. It's morning, but nobody's telling.", { x: v.width / 2, y: y0 + 76, size: 13, bold: true, font: FONT, color: CREAM, maxWidth: v.width - 40, align: "center" });
        for (let i = 0; i < 8; i++) { const col = (i - 3.5) * Math.min(42, (v.width - 20) / 8); q(v.width / 2 + col, y0 + 122 + (i % 2) * 12 + Math.sin(t * 2 + i) * 2, 46, 46, 0, i * RIVAL_FRAMES + 3); }
    });
});

game.start("title");
