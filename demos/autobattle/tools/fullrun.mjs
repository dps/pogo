// Plays whole runs through the real scenes, in Node: buys by dragging, watches every battle, reaches the end screen, then replays.
import "../game.js";
import { sharpTurn, newcomerTurn } from "../ai.js";
import { rngOf } from "../sim.js";
const game = globalThis.__pogo, G = game.pb;
const check = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } };
function playBattle() {
    for (let i = 0; i < 6000 && !game.battle.done; i++) game.step(1);
    check(game.battle.done, "battle finished"); game.step(90);
    return game.data.battleWinner;
}
export function one(seed, mode) {
    game.restart("title", {}, { seed });
    G.meta.tutorial = mode !== "tutorial";
    game.startRun({ seed }); game.step(30);
    const r = rngOf(seed); let battles = 0, frames = 0, long = 0;
    while (true) {
        check(game.state().scene === "shop", `shop scene, got ${game.state().scene}`);
        const run = G.run, shopApi = game.shop;
        if (mode === "drag" || mode === "tutorial") {
            // Real input: pick up the first affordable card and drop it in the pen.
            const before = run.bought;
            const i = run.shelf.findIndex((c, k) => c && run.gold >= (run.shop === "shelter" ? 2 : 1) && k >= 0 && (run.board.filter(Boolean).length < 3 || run.round > 1));
            if (i >= 0) { const c = shopApi.cardXY(i), g = shopApi.cellXY("board", run.board.findIndex((p) => !p)); game.input.pointerEvent("down", 5, c.x, c.y); game.step(2); game.input.pointerEvent("move", 5, c.x, c.y - 40); game.step(3); game.input.pointerEvent("move", 5, g.x, g.y); game.step(10); game.input.pointerEvent("up", 5, g.x, g.y); game.step(20); check(run.bought >= before, "drag buy"); game.step(70); }
        }
        if (mode !== "drag" && mode !== "tutorial") sharpTurn(run, {}); else newcomerTurn(run, r);
        game.step(10);
        shopApi.startFight(); game.step(24);
        const t0 = game.stepCount;
        check(game.state().scene === "battle", "battle scene");
        const w = playBattle(); frames += game.stepCount - t0; battles++;
        game.battle.next(); game.step(40);
        if (game.state().scene === "end") break;
    }
    check(G.run.over, "run ended");
    game.step(200);
    const h = G.run.history.at(-1);
    game.go("battle", { entry: h, replay: true, back: "end" }); game.step(3);
    check(game.data.replayMatches === true, "replay hash"); game.battle.skip();
    return { wins: G.run.wins, over: G.run.over, battles, avgSec: frames / battles / 60, errors: game.errors?.length ?? 0, haptics: (game.state().haptics ?? []).length };
}
const runs = [one(11, "tutorial"), one(12, "drag"), one(13, "sharp"), one(14, "sharp")];
console.log(runs);
game.resize("phone-landscape"); game.startRun({ seed: 9 }); game.step(30); game.shop.tryBuy(0, null); game.step(30); check(game.audit().filter((a) => a.level === "error").length === 0, "audit"); console.log(game.audit().slice(0, 5));
console.log(process.exitCode ? "FAILED" : "ok");
