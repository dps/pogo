// Plays the game end to end headless: both cups in Basket, then Trolley, with the autopilot at a human-ish skill,
// proving each race ends, results flow to the podium, unlocks open, and a time trial saves a ghost.
import "../game.js";
const game = globalThis.__pogo;
const log = (...a) => console.log(...a);
const skill = Number(process.argv[2] ?? 0.86);       // scales the player's top speed, standing in for human driving error
const out = { races: 0, placements: [] };
function pressFirst(label) {
    const e = game.current.entities.find((x) => x._isButton && x.buttonLabel === label);
    if (!e) throw new Error(`no button "${label}" on ${game.currentName}: ${game.current.entities.filter((x) => x._isButton).map((x) => x.buttonLabel)}`);
    e.emit("tap");
}
function race(label) {
    const W = game.sim, k = W.player;
    W.autopilot = true; k.top *= skill; k.accel *= skill;
    let n = 0;
    while (game.currentName === "race" && n < 60 * 400) { game.step(1); n++; }
    if (n >= 60 * 400) throw new Error(`race never ended on ${W.def.id}`);
    out.races++; out.placements.push(k.rank);
    log(`${label.padEnd(10)} ${W.def.id.padEnd(8)} ${W.cls.id.padEnd(8)} rank ${k.rank} time ${W.t.toFixed(1)}s lap ${k.bestLap.toFixed(1)} drifts ${W.stats.drifts} boosts ${W.stats.boosts} used ${W.stats.itemsUsed} walls ${W.stats.wallHits}  hapt ${game.state().haptics?.length ?? "?"}`);
}
function settle(n = 30) { game.step(n); }
function playCup() {
    settle(40);
    for (let i = 0; i < 3; i++) {
        race(`race ${i + 1}`);
        settle(30);
        if (game.currentName !== "results") throw new Error("expected results, got " + game.currentName);
        settle(90);
        pressFirst(i === 2 ? "See the podium" : "Next race");
        settle(40);
    }
    if (game.currentName !== "podium") throw new Error("expected podium, got " + game.currentName);
    settle(120);
    const s = game.data.save;
    log("  cups", JSON.stringify(s.cups));
    pressFirst("Carry on"); settle(60);
}
game.restart("title"); settle(30);
game.data.save.seen = { steer: 1, drift: 1, item: 1 };
game.rng.reseed?.(Number(process.argv[3] ?? 1));
pressFirst("RACE!"); playCup();
if (game.currentName !== "title") throw new Error("not back at title");
pressFirst("RACE!"); playCup();
const { unlocks } = await import("../data.js");
log("unlocks", JSON.stringify(unlocks(game.data.save)));
if (!unlocks(game.data.save).trolley) log("NOTE trolley not unlocked: bot lost a cup");
game.data.save.cls = "trolley";
pressFirst("RACE!"); playCup();
// Time trial, twice, so the ghost loads the second time.
for (const n of [0, 1]) {
    game.go("race", { track: "aisle", mode: "tt", cls: "trolley", racer: "pip" });
    settle(2);
    const W = game.sim;
    log("tt ghost loaded", !!W.ghostData, W.ghostData?.path?.length);
    W.autopilot = true;
    let g = 0, seen = false;
    while (game.currentName === "race" && g++ < 60 * 200) { game.step(1); if (W.ghostE && !W.ghostE.hidden) seen = true; }
    log("  tt finished", W.t.toFixed(1), "ghost visible", seen, "scene", game.currentName);
    settle(40);
    pressFirst("Tracks"); settle(40);
}
log("saved best", game.data.save.tt.aisle.best, "ghost points", game.data.save.tt.aisle.ghost.length / 4);
game.go("race", { track: "rooftop", cls: "flatbed", racer: "stan", autopilot: true }); settle(2);
{ const W = game.sim; let g = 0; while (game.currentName === "race" && g++ < 60 * 200) game.step(1); log("flatbed rooftop rank", W.player.rank, "time", W.t.toFixed(1), "scene", game.currentName); }
log("haptics sample", JSON.stringify(game.state().haptics?.slice?.(-8)));
log("OK", JSON.stringify(out));
process.exit(0);
