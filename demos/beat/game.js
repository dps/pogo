// Beat Goblin: drum on the heads of a goblin marching band, all the way to the Grand Goblin Festival.
import { createGame, color } from "./pogo.js";
import { paintFont } from "./art/font.js";
import { paintGoblins } from "./art/goblins.js";
import { paintProps } from "./art/props.js";
import { BeatClock } from "./clock.js";
import { applySettings, loadSave } from "./story.js";
import { playScene } from "./scenes/play.js";
import { menus } from "./scenes/menus.js";
import { calibrateScene } from "./scenes/calibrate.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#2a1650", "#120a26"],
    touch: {},
    actions: {
        k0: ["KeyD", "ArrowLeft", "pad:left"], k1: ["KeyF", "ArrowDown", "pad:x"], k2: ["KeyJ", "ArrowUp", "pad:y"], k3: ["KeyK", "ArrowRight", "pad:b"],
        flick: ["Space", "pad:a"],
    },
    maxDpr: 2,
});

paintFont(game);
paintGoblins(game);
paintProps(game);

const ctx = { game, clock: new BeatClock(game), save: loadSave(game), run: null, hide: null, mood: null };
const memo = new Map();
ctx.mix = (a, b, t) => {
    const k = `${a}${b}${Math.round(t * 20)}`;
    let v = memo.get(k);
    if (!v) { v = color(a).lerp(b, Math.round(t * 20) / 20).toHex(); memo.set(k, v); }
    return v;
};
applySettings(game, ctx.save);
game.on("hide", () => ctx.hide?.());
// Menus lay themselves out once, so turning the phone rebuilds the screen. The play scene reflows live.
let wasWide = game.view.width > game.view.height;
game.on("resize", () => {
    const wide = game.view.width > game.view.height;
    if (wide === wasWide) return;
    wasWide = wide;
    if (game.current && game.currentName !== "play" && !game.headless) game.go(game.currentName, game.currentArgs);
});

// ?silent forces the fallback clock, to prove the game runs with audio blocked.
if (typeof location !== "undefined" && new URLSearchParams(location.search).has("silent")) ctx.clock.forceSilent = true;

playScene(ctx);
menus(ctx);
calibrateScene(ctx);
globalThis.__beat = ctx;

game.start("title");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
