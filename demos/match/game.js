// SUGAR CRASH. Match candy to feed Morsel, a tiny gummy monster who grows until he has eaten the town, the level
// and the game. Rules live in engine.js, boards in levels.js, feel in boardview.js, the character in monster.js.
import { createGame, pin, rect, tap } from "./pogo.js";
import { paintSheet, SHEET, SLOT } from "./art.js";
import { Morsel, paintMorsel } from "./monster.js";
import { Diorama } from "./world.js";
import { LEVELS, WORLDS } from "./levels.js";
import { Sound, makeSongs } from "./audio.js";
import { CREAM, FONT, INK, inkText } from "./boardview.js";
import { drawLogo, iconBack, iconBuzz, iconHome, iconNext, iconSound, jelly, paintLogo, roundIcon } from "./ui.js";
import { dressMorsel, growth, makePlay, sizeFor } from "./play.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 400 } },
    background: ["#ffb4d2", "#ffe9c9"],
    touch: { stick: false, buttons: [] },
    actions: { chomp: ["KeyC", "pad:y"] },
    seed: 1, maxDpr: 2,
});
paintSheet(game.assets); paintMorsel(game.assets); paintLogo(game.assets);

const SAVE = "sugarcrash1", SONGS = makeSongs();
const clean = () => ({ stars: [], best: [], fails: [], sugar: 0, muted: false, haptics: true, nap: { candies: 0, dreams: 0 }, finished: false, tip: 0 });
const save = { ...clean(), ...game.load(SAVE, {}) };
save.nap = { candies: 0, dreams: 0, ...save.nap };
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;
const sound = new Sound(game);
let lastSave = 0;
const persist = () => game.save(SAVE, save);
const ctx = {
    save, persist, sound,
    persistSoon() { const t = game.current?.time ?? 0; if (t - lastSave > 4 || t < lastSave) { lastSave = t; persist(); } },
    flush: persist,
    useSong(name) { if (game.data.song !== name) { game.data.song = name; game.music(SONGS[name]); } },
};
game.on("hide", persist);

const beatenIn = (w) => save.stars.slice(w * 12, w * 12 + 12).filter(Boolean).length;
const nextLevel = () => { for (let i = 0; i < LEVELS.length; i++) if (!save.stars[i]) return i; return LEVELS.length - 1; };
const unlocked = (i) => i === 0 || !!save.stars[i - 1] || !!save.stars[i];
const currentWorld = () => Math.floor(nextLevel() / 12);

function settings(s, anchor, off) {
    const icon = (x, get, flip, draw) => s.add([pin(anchor, [off[0] + x, off[1]]), rect(50, 50, { color: "#00000000" }), tap(() => { flip(); persist(); sound.ui(); }), { draw(d) { roundIcon(d, "#2fb8a8", get()); draw(d, get()); } }]);
    icon(0, () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; }, iconSound);
    icon(54, () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); }, iconBuzz);
}

// --- Title ----------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    game.touch.enabled = false;
    const w = currentWorld(), total = growth(save), dio = new Diorama(game, w, beatenIn(w));
    const m = new Morsel(game, s);
    dressMorsel(m, total);
    for (let i = 0; i < Math.min(9, 3 + total); i++) m.gulp((i * 3 % 6) * 8, false);
    ctx.useSong("title");
    let logoY = 0, logoH = 0, logoX = 0;
    const place = () => {
        const v = s.view, wide = v.width > v.height;
        if (wide) {
            const gy = v.height * 0.78;
            dio.place(0, 0, v.width, v.height, gy);
            logoX = v.width * 0.3; logoY = v.height * 0.25; logoH = Math.min(100, v.height * 0.235);
            m.x = v.width * 0.73; m.y = gy; m.size = Math.min(210, v.height * 0.58);
        } else {
            const gy = v.height * 0.66;
            dio.place(0, 0, v.width, v.height, gy);
            logoX = v.width / 2; logoH = Math.min(96, v.width * 0.27); logoY = v.safe.top + logoH + 56;
            m.x = v.width / 2; m.y = gy + 8; m.size = Math.min(gy - logoY - logoH - 10, 200);
        }
    };
    place();
    const v = s.view, wide = v.width > v.height, go = () => {
        if (!total) game.go("play", { level: 0 }, { fade: 0.25 });
        else game.go("map", { world: w }, { fade: 0.25 });
    };
    const label = save.finished ? "Replay" : total ? `Level ${nextLevel() + 1}` : "Play";
    const fin = () => game.go("play", { level: nextLevel() }, { fade: 0.25 });
    if (wide) {
        s.add([pin("center", [-v.width * 0.2, 54]), jelly(label, { width: 200, height: 56, onTap: total && !save.finished ? fin : go, action: "confirm", color: "#2fd6b0", deep: "#128a78", textSize: 26 })]);
        s.add([pin("center", [-v.width * 0.2 - 54, 120]), jelly("Town", { width: 96, height: 44, onTap: () => game.go("map", { world: w }, { fade: 0.25 }), color: "#b078e8", deep: "#6a3cb0", textSize: 17 })]);
        s.add([pin("center", [-v.width * 0.2 + 54, 120]), jelly("Nap Time", { width: 96, height: 44, textSize: 15, onTap: () => game.go("play", { nap: true }, { fade: 0.4 }), color: "#5a64d8", deep: "#3038a0" })]);
    } else {
        s.add([pin("bottom", [0, 110]), jelly(label, { width: 240, height: 64, onTap: total && !save.finished ? fin : go, action: "confirm", color: "#2fd6b0", deep: "#128a78", textSize: 30 })]);
        s.add([pin("bottom", [-62, 44]), jelly("Town", { width: 116, height: 46, onTap: () => game.go("map", { world: w }, { fade: 0.25 }), color: "#b078e8", deep: "#6a3cb0", textSize: 18 })]);
        s.add([pin("bottom", [62, 44]), jelly("Nap Time", { width: 116, height: 46, textSize: 17, onTap: () => game.go("play", { nap: true }, { fade: 0.4 }), color: "#5a64d8", deep: "#3038a0" })]);
    }
    settings(s, "top-right", [8, 8]);
    s.on("resize", () => { place(); if ((s.view.width > s.view.height) !== wide) game.go("title"); });
    let chompT = 3;
    s.onUpdate((dt) => {
        m.update(dt); dio.update(dt); sound.tick();
        const p = s.input.pointer;
        if (p.pressed && m.contains(p.x, p.y)) { m.kick(5); m.mood("happy", "grin", 0.6); sound.mallow(); game.haptic("light"); }
        m.lookTarget = p.down ? { x: p.x, y: p.y } : { x: logoX, y: logoY };
        chompT -= dt;
        if (chompT < 0) { chompT = 3 + game.fxRng.next() * 3; m.kick(3); m.open(0.4); s.wait(0.4, () => { m.gulp((Math.floor(game.fxRng.next() * 6)) * 8, true); sound.gulp(); }); }
    });
    s.onDraw((d) => { dio.drawSky(d); dio.drawProps(d); m.shadow(d); m.draw(d); });
    s.onDrawUI((d) => {
        drawLogo(d, logoX, logoY, logoH, s.time, save.finished);
        const vv = s.view;
        const line = total ? `${total} of ${LEVELS.length} landmarks eaten` : "Feed the monster. Lose the town.";
        inkText(d, line, { x: logoX, y: logoY + logoH + 16, size: 14, ink: 1.6, color: CREAM });
        void vv;
    });
});

// --- Town map: twelve candies per world, with the wreckage above them -----------------------------------------
game.scene("map", (s, args = {}) => {
    game.touch.enabled = false;
    let w = Math.max(0, Math.min(5, args.world ?? currentWorld()));
    const open = (i) => { if (unlocked(i)) game.go("play", { level: i }, { fade: 0.25 }); };
    const beaten = beatenIn(w), dio = new Diorama(game, w, beaten), m = new Morsel(game, s), total = growth(save);
    dressMorsel(m, total);
    ctx.useSong(WORLDS[w].key);
    const nodes = [];
    let px = 0, py = 0, cell = 60;
    const place = () => {
        const v = s.view, wide = v.width > v.height, sa = v.safe;
        if (wide) {
            const panel = v.width * 0.46;
            dio.place(0, 0, panel, v.height, v.height * 0.8); dio.skyWidth = v.width;
            m.x = panel * 0.5; m.y = v.height * 0.8; m.size = sizeFor(w, beatenIn(w), v.height * 0.5);
            cell = Math.min((v.width - panel - sa.right - 24) / 4, (v.height - sa.top - 90) / 3);
            px = panel + 12 + (v.width - panel - sa.right - 24 - cell * 4) / 2; py = sa.top + 70;
        } else {
            const gy = Math.max(190, v.height * 0.36);
            dio.place(0, 0, v.width, v.height, gy);
            m.x = v.width / 2; m.y = gy; m.size = sizeFor(w, beatenIn(w), gy - sa.top - 60);
            cell = Math.min((v.width - 24) / 4, (v.height - gy - sa.bottom - 26) / 3);
            px = (v.width - cell * 4) / 2; py = gy + (v.height - gy - sa.bottom - cell * 3) / 2;
        }
        nodes.forEach((e, i) => { e.pos.x = px + (i % 4 + 0.5) * cell; e.pos.y = py + (Math.floor(i / 4) + 0.5) * cell; });
    };
    for (let k = 0; k < 12; k++) {
        const i = w * 12 + k;
        nodes.push(s.add([rect(58, 58, { color: "#00000000" }), tap(() => { if (unlocked(i)) open(i); else { game.haptic("warn"); sound.nope(); } }), "ui", { ui: true, layer: 5, draw(d) {
            const on = unlocked(i), now = i === nextLevel(), st = save.stars[i] ?? 0, pulse = now ? 1 + Math.sin(s.time * 5) * 0.05 : 1, size = cell * 0.82;
            d.push(); d.scale(pulse);
            d.rect(size + 6, size + 8, { y: 2, color: INK, radius: 16 });
            d.rect(size, size, { color: now ? "#ffe14f" : st ? "#ff9ec2" : on ? "#fff0d8" : "#b5a4bf", radius: 13 });
            d.rect(size - 12, size * 0.26, { y: -size * 0.27, color: "#ffffff", opacity: 0.35, radius: 7 });
            d.text(i + 1, { y: -5, size: size * 0.36, bold: true, font: FONT, color: on ? INK : "#776a80" });
            for (let q = 0; q < 3; q++) d.sprite(SHEET, { frame: q < st ? SLOT.star1 : SLOT.star0, x: (q - 1) * size * 0.27, y: size * 0.27, width: size * 0.3, height: size * 0.3, opacity: on ? 1 : 0.4 });
            d.pop();
        } }]));
    }
    place(); s.on("resize", place);
    const flip = (dir) => { const next = w + dir; if (next < 0 || next > 5) return; if (next * 12 > nextLevel()) { sound.nope(); game.haptic("warn"); return; } sound.ui(); game.go("map", { world: next }, { fade: 0.2 }); };
    s.add([pin("top-left", [6, 6]), rect(46, 46, { color: "#00000000" }), tap(() => { sound.ui(); game.go("title", {}, { fade: 0.2 }); }), { draw(d) { roundIcon(d, "#ff77a8"); iconHome(d); } }]);
    const nav = (anchor, off, dir, icon) => s.add([pin(anchor, off), rect(46, 46, { color: "#00000000" }), tap(() => flip(dir)), { draw(d) { const ok = w + dir >= 0 && w + dir <= 5 && (w + dir) * 12 <= nextLevel(); roundIcon(d, "#b078e8", ok); icon(d); } }]);
    nav("top-right", [6, 6], 1, iconNext);
    nav("top-right", [58, 6], -1, iconBack);
    s.onUpdate((dt) => {
        m.update(dt); dio.update(dt); sound.tick();
        const inp = s.input;
        if (inp.swipe === "left") flip(1); if (inp.swipe === "right") flip(-1);
        if (inp.pressed("left")) flip(-1); if (inp.pressed("right")) flip(1);
        if (inp.pressed("confirm") && Math.floor(nextLevel() / 12) === w) open(nextLevel());
    });
    s.onDraw((d) => {
        dio.drawSky(d); dio.drawProps(d); m.shadow(d); m.draw(d);
        d.rect(cell * 4 + 22, cell * 3 + 22, { x: px + cell * 2, y: py + cell * 1.5 + 2, color: INK, radius: 26 });
        d.rect(cell * 4 + 12, cell * 3 + 12, { x: px + cell * 2, y: py + cell * 1.5, color: "#ffd0e2", radius: 22 });
    });
    s.onDrawUI((d) => {
        const v = s.view, wide = v.width > v.height, x = wide ? v.width * 0.73 : v.width / 2, y = wide ? v.safe.top + 34 : v.safe.top + 32;
        inkText(d, WORLDS[w].name, { x: wide ? x : v.width / 2 - 26, y, size: wide ? 26 : 22, color: "#ffe14f" });
        inkText(d, WORLDS[w].blurb, { x: wide ? x : v.width / 2, y: y + (wide ? 26 : 26), size: 12.5, ink: 1.4 });
        void beaten;
    });
});

// --- Finale: he eats the board. Then the game. ----------------------------------------------------------------
game.scene("finale", (s) => {
    game.touch.enabled = false;
    save.finished = true; persist();
    const m = new Morsel(game, s);
    dressMorsel(m, 72);
    const dio = new Diorama(game, 5, 12);
    ctx.useSong("sky");
    let eaten = 0, t = 0, step = 0, done = false;
    const place = () => { const v = s.view, wide = v.width > v.height; dio.place(0, 0, v.width, v.height, v.height * 0.46); m.x = wide ? v.width * 0.5 : v.width / 2; m.y = v.height * 0.49; m.size = Math.min(v.height * (wide ? 0.44 : 0.3), 280); };
    place(); s.on("resize", place);
    const lines = ["He ate the park.", "He ate the town.", "He ate the board.", "He is still hungry."];
    s.onUpdate((dt) => {
        t += dt; m.update(dt); dio.update(dt); sound.tick();
        if (t > 0.9 && eaten < 72 && t > 0.9 + eaten * 0.045) {
            eaten += 4; sound.chomp(); m.gulp((eaten % 6) * 8, true); m.chew = 0.4;
            s.shake(4 + eaten * 0.1, 0.12, { haptic: false }); game.haptic(eaten % 12 === 0 ? "heavy" : "medium");
        }
        if (eaten >= 72 && step === 0) { step = 1; m.mood("star", "wide", 2); sound.roar(); s.shake(16, 0.7, { haptic: false }); s.flash("#ffffff", 0.3); game.haptic([40, 30, 80, 30, 120]); s.wait(1.8, () => { sound.burp(); m.mood("happy", "grin", 3); }); }
        if (t > 6 && !done) {
            done = true;
            const wide = s.view.width > s.view.height, bx = wide ? s.view.width * 0.31 : 0;
            s.add([wide ? pin("center", [bx, 30]) : pin("bottom", [0, 112]), jelly("Nap Time", { width: 220, height: 56, textSize: 24, onTap: () => game.go("play", { nap: true }, { fade: 0.5 }), color: "#5a64d8", deep: "#3038a0", action: "confirm" })]);
            s.add([wide ? pin("center", [bx, 96]) : pin("bottom", [0, 50]), jelly("Title", { width: 150, height: 46, onTap: () => game.go("title", {}, { fade: 0.4 }), color: "#ff4f8a", deep: "#b81e62" })]);
        }
    });
    s.onDraw((d) => {
        dio.drawSky(d); dio.drawProps(d);
        const v = s.view, cs = Math.min(v.width / 9.5, v.height * 0.5 / 9), ox = v.width / 2, oy = v.height * 0.47;
        for (let i = 71; i >= eaten; i--) {
            const x = ox + ((i % 8) - 3.5) * cs, y = oy + (Math.floor((71 - i) / 8) + 0.5) * cs * 0.56 + (8 - Math.floor((71 - i) / 8)) * 0;
            d.sprite(SHEET, { frame: SLOT.tile((i + (i >> 3)) & 1), x, y, width: cs, height: cs });
            d.sprite(SHEET, { frame: ((i * 5) % 6) * 8, x, y: y - 2, width: cs * 0.9, height: cs * 0.9 });
        }
        m.shadow(d); m.draw(d);
    });
    s.onDrawUI((d) => {
        const v = s.view;
        lines.forEach((l, i) => { const a = Math.min(1, Math.max(0, t - 1.6 - i * 1)), wide = v.width > v.height; if (a > 0) inkText(d, l, { x: wide ? v.width * 0.2 : v.width / 2, y: v.height * (wide ? 0.48 : 0.5) + (wide ? 0 : 36) + i * 30, size: i === 3 ? 25 : 20, opacity: a, color: i === 3 ? "#ffe14f" : "#fff" }); });
        const wide = v.width > v.height;
        drawLogo(d, wide ? v.width * 0.16 : v.width / 2, wide ? v.height * 0.2 : v.safe.top + 54, 44, s.time, true);
    });
});

game.scene("play", makePlay(game, ctx));
game.sugarSave = save;
/** Test hook: pretend these levels are beaten. */
game.grant = (n, stars = 3) => { for (let i = 0; i < n; i++) save.stars[i] = stars; };
game.start("title");
globalThis.document?.getElementById?.("load")?.remove();
