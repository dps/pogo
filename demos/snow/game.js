// Snowplow: push snowballs through a quiet village. Three sizes, stacked, make a snowman.
import { createGame, sprite, text, ui } from "./pogo.js";
import { paintUI } from "./ui.js";
import { Sound } from "./audio.js";
import { playScene, makeSnowfall } from "./play.js";
import { worldScene } from "./world.js";
import { LevelView, defineShared } from "./view.js";
import { LEVELS } from "./levels.js";
import { THEMES, applyTheme } from "./themes.js";
import { newState, parseLevel } from "./rules.js";
import { SOLUTIONS } from "./solutions.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } }, background: ["#fcdcc6", "#c4b8ea"], seed: 1, maxDpr: 2,
    actions: { undo: ["KeyZ", "KeyU", "Backspace", "pad:x"], reset: ["KeyR", "pad:y"], hint: ["KeyH", "pad:select"], back: ["KeyM", "Escape", "pad:b"] },
    touch: { stick: false, buttons: [] },
});
paintUI(game.assets);
defineShared(game);

const defaults = { solved: {}, at: null, sfx: true, music: true, haptics: true, ended: false };
const app = {
    sound: new Sound(game),
    save: { ...defaults, ...game.load("snowplow", {}) },
    persist() { game.save("snowplow", app.save); },
    isComplete: () => LEVELS.filter((l) => !l.opt).every((l) => app.save.solved[l.id]),
    settings: {
        get: (k) => app.save[k],
        toggle: (k) => { app.save[k] = !app.save[k]; app.persist(); applySettings(); app.sound.tap(); },
    },
};
function applySettings() {
    game.audio.muted = !app.save.sfx;
    game.haptics.enabled = app.save.haptics;
    app.sound.setMusic(app.save.music && app.save.sfx);
}
applySettings();
game.app = app;
app.levels = LEVELS;
/** For tools: jump into a level and play `n` steps of its solution. */
app.demo = (id, n = 0) => {
    game.go("play", { id });
    game.step(3);
    const P = game.play, moves = SOLUTIONS[id].moves.slice(0, n < 0 ? SOLUTIONS[id].moves.length + n : n);
    for (const ch of moves) { P.tryMove("urdl".indexOf(ch)); for (let i = 0; i < 40 && P.busy; i++) game.step(1); }
    return P;
};

playScene(game, app);
worldScene(game, app);

const FIRST = LEVELS[0].id;
game.scene("title", (s) => {
    game.touch.enabled = false;
    const th = THEMES[0];
    applyTheme(s, th);
    const lvl = parseLevel({ id: "title", need: 1, rows: [" ###### ", "#,,..,,#", "#,D,.D,#", "#,,.,,##", "##,@,,.#", " #,,,,# "] });
    const v = new LevelView(game, s, lvl, th, { seed: 2 });
    v.sync(newState(lvl));
    const land = () => s.view.width > s.view.height * 1.15;
    const fit = () => { if (land()) v.frame(16, 12, s.view.width * 0.42, 12); else v.frame(s.view.height * 0.3, 130, 10, 10); };
    fit(); s.on("resize", fit);
    const anchor = (e) => { const q = s.view, sf = q.safe; if (land()) e.pos.set(sf.left + (q.width - sf.left) * 0.22, q.height * 0.42, 0); else e.pos.set(q.width / 2, sf.top + q.height * 0.13, 0); };
    s.add([text("Snowplow", { size: 54, bold: true, color: "#4a4f7c" }), ui(), { name: "title", add: anchor, update(dt, e) { anchor(e); e.scale = 1 + Math.sin(s.time * 1.3) * 0.012; } }]);
    const fall = makeSnowfall(s, 0.8);
    s.onDraw((d) => fall(d, 1 / 60));
    let gone = false;
    const begin = () => {
        if (gone) return;
        gone = true;
        app.sound.startWind();
        applySettings();
        app.sound.play("morning");
        game.haptic("light");
        if (Object.keys(app.save.solved).length) game.go("world", {}, { fade: 0.4 });
        else game.go("play", { id: FIRST }, { fade: 0.35 });
    };
    s.onUpdate((dt) => { v.update(dt); if (s.time > 0.1 && (s.input.pointer.pressed || s.input.pressed("confirm"))) begin(); });
    s.on("leave", () => v.leave());
    const goAt = (e) => { const q = s.view; if (land()) e.pos.set(q.safe.left + (q.width - q.safe.left) * 0.22, q.height * 0.68, 0); else e.pos.set(q.width / 2, q.height - q.safe.bottom - 70, 0); };
    s.add([sprite("ic_play", { width: 44, height: 44 }), ui(), { name: "go", add: goAt, update(dt, e) { goAt(e); e.scale = 1 + Math.sin(s.time * 3) * 0.08; } }]);
});

// A staged picture for the launcher: not reachable in play.
game.scene("hero", (s) => {
    const th = THEMES[4];
    applyTheme(s, th);
    const lvl = parseLevel({ id: "hero", need: 1, rows: ["#,,,,,,,#", ",,,D,,.,,", ",D,,,.L.,", ",,..,.,,,", ",,@S..,#,"] });
    const v = new LevelView(game, s, lvl, th, { seed: 1 });
    v.sync(newState(lvl));
    v.frame(10, 10, 10, 10, 1.1);
    s.onUpdate((dt) => v.update(dt));
    const fall = makeSnowfall(s, 0.7);
    s.onDraw((d) => fall(d, 1 / 60));
    s.on("leave", () => v.leave());
});

game.scene("end", (s) => {
    game.touch.enabled = false;
    const th = THEMES[7];
    applyTheme(s, th);
    app.sound.play("end");
    const lvl = parseLevel({ id: "end", need: 1, rows: ["  ####  ", " #D,,D# ", "#,,D.,,#", "#D,..,D#", " #,@.,# ", "  ####  "] });
    const v = new LevelView(game, s, lvl, th, { seed: 1 });
    v.sync(newState(lvl));
    const land = () => s.view.width > s.view.height * 1.15;
    const fit = () => { if (land()) v.frame(16, 12, s.view.width * 0.44, 12); else v.frame(s.view.height * 0.3, 120, 10, 10); };
    fit(); s.on("resize", fit);
    const place = (dy) => (e) => { const q = s.view, sf = q.safe; if (land()) e.pos.set(sf.left + (q.width - sf.left) * 0.23, q.height * 0.42 + dy, 0); else e.pos.set(q.width / 2, sf.top + q.height * 0.1 + dy, 0); };
    const line1 = place(0), line2 = place(44);
    s.add([text(`${Object.keys(app.save.solved).length} snowmen`, { size: 34, bold: true, color: "#fdf3d6" }), ui(), { name: "endTitle", add: line1, update(dt, e) { line1(e); } }]);
    s.add([text("The village sleeps well tonight.", { size: 15, color: "#cfd6ff" }), ui(), { name: "endLine", add: line2, update(dt, e) { line2(e); } }]);
    const fall = makeSnowfall(s, 1);
    s.onDraw((d) => fall(d, 1 / 60));
    v.mole.cheer = 2;
    s.onUpdate((dt) => { v.update(dt); if (s.time > 1.5 && (s.input.pointer.pressed || s.input.pressed("confirm"))) game.go("world", {}, { fade: 0.5 }); });
    s.on("leave", () => v.leave());
});

game.start("title");
try { document.getElementById("load")?.remove(); } catch { /* headless */ }
