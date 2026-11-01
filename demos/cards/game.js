// Hex & Cards: a deck-building roguelike where cards are ingredients and order is everything.
// sim.js holds the rules, data/ the content, art/ the painting and ui/ the scenes.
import { createGame } from "./pogo.js";
import { paintAll, trinketArt, warmStep } from "./art/index.js";
import { G, init, route, saveRun, setTrArt } from "./ui/core.js";
import { combatScene } from "./ui/combat.js";
import { screens } from "./ui/screens.js";
import { paintTitle, titleScene } from "./ui/title.js";
import * as S from "./sim.js";
import { lockedTrinkets, tierOf } from "./meta.js";
import { CARDS } from "./data/cards.js";

const browser = typeof location !== "undefined", q = browser ? new URLSearchParams(location.search) : null;
// Bots pass ?seed=; people get a fresh tower each session. Either way every run's seed comes from game.rng.
const seed = q?.get("seed") ? Number(q.get("seed")) : browser ? (Date.now() ^ (performance.now() * 1000)) >>> 0 : 1;
const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#1a0f2c", "#0c0618"], seed, maxDpr: 2.5,
    actions: {},
});
game.touch.enabled = false;
init(game);
paintAll(game);
paintTitle(game);
setTrArt(trinketArt);
G.startRun = (witch, asc, forced) => {
    const m = G.meta, runSeed = forced ?? game.rng.int(1, 2147483646);
    game.data.lastSeed = runSeed; game.data.nextSeed = undefined;
    G.run = S.newRun({ seed: runSeed, witch, asc, tier: tierOf(m), locked: lockedTrinkets(m) });
    route();
};
/** The first ever touch: straight into one scripted fight that teaches the whole game in four moves. */
G.startTutorial = () => {
    const m = G.meta, runSeed = game.rng.int(1, 2147483646);
    const run = G.run = S.newRun({ seed: runSeed, witch: "posy", asc: 0, tier: tierOf(m), locked: lockedTrinkets(m), tutorial: true });
    const first = run.map.nodes.find((n) => n.r === 0);
    run.pos = { r: 0, c: first.c }; run.floor = 0; run.fights = 1;
    S.startCombat(run, ["rat"], "fight");
    const c = run.combat, all = [...c.hand, ...c.draw], take = (id) => { const i = all.findIndex((k) => k.id === id); return all.splice(i, 1)[0]; };
    c.hand = [take("spark"), take("droplet"), take("spark"), take("droplet"), take("firecorn")];
    c.draw = all;
    c.enemies[0].hp = c.enemies[0].maxHp = 16;
    route();
};
/** For tools: a mid-run state, with no menus in the way. pogo check --scene combat --args '{"demo":1,"act":2}' */
G.demoRun = (a = {}) => {
    const run = G.run = S.newRun({ seed: a.seed ?? 7, witch: a.witch ?? "vesper", asc: a.asc ?? 0 });
    run.act = a.act ?? 0; S.genAct(run);
    for (const id of ["coal", "tide", "ouroboros", "hailstone", "pact", "mandrakelet"]) S.addCard(run, id, 0);
    if (!a.map) S.chooseNode(run, a.boss ? { r: S.ROWS, c: 2, type: "boss", boss: true } : S.reachable(run)[0]);
};
combatScene(game); screens(game); titleScene(game);
game.scene("boot", (s) => { s.wait(0, () => game.go("title")); });
game.on("scene", () => { G.overlay = null; G.routing = false; G.keys.length = 0; });
// Between frames, paint one queued picture at a time.
if (browser) setInterval(() => { if (!game.headless) warmStep(); }, 40);
if (browser) document.getElementById("boot")?.remove();
game.start("title");
globalThis.__hex = { G, S, game };
export { game };
