// Moonpatch: grow glowing crops by moonlight, sell them to polite ghosts by day.
import { createGame } from "./pogo.js";
import { G, paintPanels, saveGame } from "./core.js";
import { paintAtlas, paintSky, SKY } from "./art.js";
import { makeFont } from "./font.js";
import { Px, hex } from "./pix.js";
import { Sound } from "./audio.js";
import * as S from "./sim.js";
import { titleScene, endingScene } from "./title.js";
import { farmScene } from "./farm.js";
import { marketScene } from "./market.js";
import { pondScene } from "./pond.js";
import { kitchenScene } from "./kitchen.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 720, height: 405 } },
    background: "#171243", seed: 1, maxDpr: 3, touch: false,
    actions: { confirm: ["Enter", "NumpadEnter", "pad:a"], back: ["Escape", "pad:b"], dawn: ["KeyN", "pad:start"], book: ["KeyB", "pad:y"], build: ["KeyH", "pad:x"], next: ["BracketRight", "KeyE"], prev: ["BracketLeft", "KeyQ"], fire: ["Space"] },
});
game.touch.enabled = false;
G.game = game; G.sound = new Sound(game);

const atlas = paintAtlas();
paintPanels(atlas, hex, Px);
G.atlas = atlas; G.font = makeFont(atlas);
game.assets.paint("atlas", 1024, 1024, (p) => p.data.set(atlas.data));
// One soft round light, tinted as needed. This is the only filtered texture: it's what turns pixel art into moonlight.
game.assets.paint("glow", 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const q = Math.hypot(x - 31.5, y - 31.5) / 32, v = Math.max(0, 1 - q); p.set(x, y, [1, 1, 1, v * v * v]); }
}, { smooth: true });
for (const k of Object.keys(SKY)) game.assets.paint(`sky_${k}`, 480, 220, (p) => paintSky(new Px(480, 220, p.data, 480), SKY[k]));
// The scene backdrop: repainted when the place, season or screen shape changes.
const BG = 512;
game.assets.paint("bg", BG, BG, () => {});
G.bg = new Px(BG, BG, game.assets.sprite("bg").data, BG);
/** Repaint the backdrop only when something about it has changed. */
G.paintBg = (key, fn) => { if (G.bgKey === key) return; G.bgKey = key; fn(G.bg); game.assets.refresh("bg"); };

G.loadOrNew = () => {
    if (G.sim) return G.sim;
    let st = null;
    try { st = game.load("moonpatch1", null); } catch { st = null; }
    if (!st || st.v !== 1) st = null;
    G.sim = st;
    // Away for a while? Nothing was lost, and it rained. Kindness is the whole of the offline design.
    if (st && st.phase === "night" && st.savedAt && Date.now() - st.savedAt > 6 * 3600e3) { st.rain = true; st.backRain = true; }
    return st;
};
G.fresh = (seed = 1) => { G.sim = S.newGame(seed); saveGame(); return G.sim; };
game.moonpatch = G; G.simApi = S;
game.on("hide", saveGame);

try { game.audio.muted = !!game.load("moonpatch-mute", false); game.haptics.enabled = game.load("moonpatch-haptics", true) !== false; } catch { /* storage may be blocked */ }
game.scene("title", titleScene);
game.scene("farm", farmScene);
game.scene("market", marketScene);
game.scene("pond", pondScene);
game.scene("kitchen", kitchenScene);
game.scene("ending", endingScene);
game.start("title");
if (typeof document !== "undefined") document.getElementById("load")?.remove();
