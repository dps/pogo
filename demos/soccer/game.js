// Goat Soccer: two-minute arcade football on a hillside, where headbutting is legal.
import { createGame } from "./pogo.js";
import { paintSprites, registerProps } from "./models.js";
import { Sound } from "./audio.js";
import { CLUBS, LEVELS, loadSave } from "./data.js";
import { registerMatch } from "./match.js";
import { fixture, logo, registerMenus } from "./menus.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#5fb0e4", "#fdeec6"],
    actions: {
        pass: ["KeyZ", "KeyJ", "KeyF", "pad:a"], shoot: ["KeyX", "KeyK", "KeyG", "Space", "pad:b", "pad:x"],
        p1u: ["KeyW"], p1d: ["KeyS"], p1l: ["KeyA"], p1r: ["KeyD"], p1a: ["KeyF"], p1b: ["KeyG"],
        p2u: ["ArrowUp"], p2d: ["ArrowDown"], p2l: ["ArrowLeft"], p2r: ["ArrowRight"], p2a: ["KeyK"], p2b: ["KeyL"],
    },
    touch: {}, seed: 11, maxDpr: 2,
});
game.touch.enabled = false;
game.snd = new Sound(game);
loadSave(game);
game.snd.apply();
registerProps(game);
paintSprites(game);
registerMatch(game);
registerMenus(game);

// `pogo check --scene match` and tools come in with no fixture set: build a sensible one.
game.quickFixture = (a) => fixture(game, { opp: CLUBS[a.opp ?? 1], skill: LEVELS[a.level ?? 1].skill, comp: "friendly", mode: a.mode ?? {}, venue: a.venue, golden: a.golden, two: a.two });
game.on("hide", () => game.pauseMatch?.());
game.start("title");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
if (typeof window !== "undefined") window.__logo = logo;
