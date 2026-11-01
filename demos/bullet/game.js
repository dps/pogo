// MOTH TO A FLAME. Thread light, brush past it, and carry it home.
import { button, createGame, pin, rect, text, ui as uiC } from "./pogo.js";
import { paintAll } from "./art.js";
import { Play, newRun } from "./play.js";
import { DIFFS, STAGES } from "./stages.js";
import { SONGS } from "./music.js";
import { SND } from "./sfx.js";
import { installMenus } from "./menus.js";

const game = createGame({
    view: { width: 360, height: 640 }, background: "#050618", seed: 1, maxDpr: 2,
    touch: { stick: false, buttons: [] },
    actions: { focus: ["ShiftLeft", "ShiftRight", "KeyZ", "pad:a"], bomb: ["KeyX", "Space", "pad:b"], confirm: ["Enter", "pad:start"] },
});
paintAll(game.assets);

const SAVE = "mothflame1";
const defaults = () => ({ diff: 0, unlocked: {}, scores: [[], [], []], muted: false, haptics: true, autoFocus: true, sense: 1.25, cleared: {}, taught: false, flame: false });
const save = { ...defaults(), ...game.load(SAVE, {}) };
const ctx = { game, save, STAGES, DIFFS, SONGS, SND, persist: () => game.save(SAVE, save), unlock(k) { if (!save.unlocked[k]) { save.unlocked[k] = true; ctx.persist(); } } };
game.audio.muted = !!save.muted; game.haptics.enabled = save.haptics !== false;

globalThis.__moth = ctx;
game.scene("play", (s, a) => { game.touch.enabled = false; game.stopMusic(); ctx.play = new Play(game, s, a, ctx); });
installMenus(ctx);

if (typeof document !== "undefined") document.getElementById("load")?.remove();
game.start("title");
