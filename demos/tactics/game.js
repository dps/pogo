// Squad Goals: pigeons, a park, and every attack telegraphed. Rules are in sim.js; this file wires the scenes.
import { createGame } from "./pogo.js";
import { buildModels, BIRD } from "./models.js";
import { buildArt } from "./art.js";
import { hedgeMesh } from "./stage.js";
import { battleScene } from "./battle.js";
import { endingScene, mapScene, roostScene, rogueScene, titleScene } from "./scenes.js";
import { MISSIONS } from "./missions.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#a9e4f2", "#eaf8d9"], letterbox: "#201830", seed: 5, maxDpr: 2,
    actions: { undo: ["KeyZ", "KeyU", "pad:y"], endKey: ["KeyE", "pad:start"], waitKey: ["KeyX", "pad:x"], swapMode: ["KeyC", "pad:b"], nextUnit: ["Tab", "pad:select"] },
});
game.touch.enabled = false;

const data = buildModels(game);
buildArt(game, data, BIRD);
hedgeMesh(game);
battleScene(game);
titleScene(game);
mapScene(game);
roostScene(game);
rogueScene(game);
endingScene(game);

globalThis.__sg = { MISSIONS };
game.start("title");
globalThis.document?.getElementById?.("load")?.remove();
