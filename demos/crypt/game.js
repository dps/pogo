// Crypt Keeper's Day Off: a tiny turn-based tourist roguelike.
import { createGame } from "./pogo.js";
import { atlas, glowPixels } from "./art.js";
import { SONGS, makeFx } from "./audio.js";
import { addPlay } from "./play.js";
import { addScenes } from "./scenes.js";
import { loadSave } from "./run.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#170d14", seed: 7, maxDpr: 2, touch: { stick: false, buttons: [] },
    actions: { wait: ["Space", "Period", "pad:x"], undo: ["KeyZ", "KeyU", "Backspace", "pad:b"], ability: ["KeyE", "KeyQ", "pad:y"], card1: ["Digit1"], card2: ["Digit2"], guide: ["KeyH"] },
});

game.assets.paint("atlas", atlas.w, atlas.h, (p) => p.data.set(atlas.d));
game.assets.paint("glow", 64, 64, glowPixels, { smooth: true });

const fx = makeFx(game);
let save = null, current = null;
const ctx = {
    save() { return save ??= loadSave(game); },
    state: {},
    /** Starts a song unless it's already the one playing, so floors of a dungeon share one unbroken tune. */
    song(name) { if (name !== current) { current = name; game.music(SONGS[name]); } },
};
game.crypt = ctx;
addPlay(game, fx, ctx);
addScenes(game, fx, ctx);

game.start("title");
if (typeof document !== "undefined") document.getElementById("load")?.remove();
