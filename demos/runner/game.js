// Ostrich Getaway: a 3D lane runner. An ostrich called Keith leaves a farm in a hurry and does not stop.
import { createGame } from "./pogo.js";
import { registerModels } from "./models.js";
import { buildWorld } from "./scenery.js";
import { paintArt } from "./art.js";
import { Sound } from "./sound.js";
import { loadProfile } from "./profile.js";
import { Play } from "./play.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#3ba6e6", "#ffeec0"],
    touch: {}, seed: 7, maxDpr: 2,
});
game.touch.enabled = false;
game.profile = loadProfile(game);
game.sound = new Sound(game);
game.sound.apply(game.profile);
registerModels(game);
paintArt(game);
const names = buildWorld(game);
game.scene("play", (s, args) => { game.play = new Play(game, s, names, args ?? {}); });
game.start("play");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
