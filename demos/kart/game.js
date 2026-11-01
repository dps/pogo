// Shopping Cart GP: a 3D kart racer through a supermarket, on one thumb.
import { createGame } from "./pogo.js";
import { RACERS, loadSave } from "./data.js";
import { registerModels } from "./models.js";
import { paintArt } from "./art.js";
import { Sound } from "./sound.js";
import { registerScenes } from "./menus.js";
import { sticker } from "./hud.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#3a2a6b", "#ff5fa2"],
    actions: { drift: ["Space", "ShiftLeft", "ShiftRight", "KeyZ", "pad:a", "pad:x"], item: ["KeyX", "KeyF", "KeyE", "ControlLeft", "pad:b", "pad:y"] },
    touch: {}, seed: 11, maxDpr: 2,
});
game.touch.enabled = false;

game.snd = new Sound(game);
loadSave(game);
game.snd.apply();
registerModels(game, RACERS);
paintArt(game, RACERS);
registerScenes(game);
game.on("scene", () => { game.snd.engineOff(); });
game.on("hide", () => game.pauseRace?.());
if (typeof window !== "undefined") window.__h = { sticker };
game.start("title");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
