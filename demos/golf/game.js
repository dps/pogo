// Crazy Putt Volcano: slingshot mini golf on a volcanic island.
import { createGame } from "./pogo.js";
import { loadSave } from "./data.js";
import { buildModels } from "./models.js";
import { paintArt } from "./art.js";
import { Sound } from "./audio.js";
import { registerScenes } from "./menus.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#2d9df0", "#ffe6b3"],
    actions: { chip: ["KeyC", "pad:x"], view: ["KeyV", "KeyM", "pad:y"] },
    touch: {}, seed: 5, maxDpr: 2,
});
game.touch.enabled = false;
game.snd = new Sound(game);
loadSave(game);
game.snd.apply();
paintArt(game);
buildModels(game);
registerScenes(game);
game.on("hide", () => { if (game.currentName === "play") globalThis.__golf?.openPause?.(); game.snd.stopRoll(); });
game.start("title");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
