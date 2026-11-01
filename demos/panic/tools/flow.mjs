// Plays the real show end to end through the director: transitions, lives, bosses, finale, game over, weekly, playlists, free play, party.
import "../game.js";
const game = globalThis.__pogo, P = game.panic, { Driver } = P;
const assert = (c, msg) => { if (!c) { console.log("FAILED:", msg); process.exit(1); } };
function play(start, o = {}) {
    start();
    let b = null, cur = null, steps = 0, seen = [], speeds = [], kinds = new Set(), states = new Set(), haptics = new Set();
    const cap = o.cap ?? 400000;
    while (steps++ < cap) {
        game.step(1);
        if (steps % 97 === 0) game.render(1);
        if (game.currentName !== "run" && steps > 10) break;
        const d = P.dir;
        if (!d) continue;
        states.add(d.state); if (d.state === "hold") kinds.add(d.hold.kind);
        if (d.state === "hold" && d.hold.wait && d.st > 0.3) { for (const e of d.holdUi ?? []) e.emit("tap"); o.onHold?.(d); }
        if (d.state === "play" && d.m !== cur) { cur = d.m; if (b) b.end(); b = new Driver(game, { mode: "touch" }); b.begin(cur); seen.push(cur.def.id); speeds.push(cur.speed); }
        if (d.state === "play" && cur && !(o.sabotage?.(cur, d))) b.step(cur);
    }
    b?.end();
    return { steps, seen, speeds, kinds, states, scene: game.currentName, dir: P.dir };
}
game.resize("phone");
game.go("title"); game.step(30);
assert(game.currentName === "title", "title");
let r = play(() => P.startRun(P.showRun(12345)));
console.log("show:", r.seen.length, "games, speed", r.speeds[0], "to", r.speeds.at(-1), "bosses", r.seen.filter((i) => P.byId[i].boss).length, "wins", r.dir.wins, "score", r.dir.score, "lives", r.dir.lives, "end", r.scene, "minutes", (r.steps / 3600).toFixed(1));
assert(r.scene === "over", "show ends on over"); assert(new Set(r.seen).size === r.seen.length, "no repeats in a run: " + r.seen);
assert(r.kinds.has("boss") && r.kinds.has("faster") && r.kinds.has("clear"), "interstitials " + [...r.kinds]);
// A hopeless player loses all four bells quickly.
r = play(() => P.startRun(P.showRun(777)), { sabotage: () => true });
console.log("idle show:", r.seen.length, "games, lives", r.dir.lives, "end", r.scene);
assert(r.scene === "over" && r.dir.lives === 0, "idle dies");
r = play(() => P.startRun(P.weeklyRun())); console.log("weekly:", r.seen.length, "wins", r.dir.wins, r.scene);
assert(r.seen.length === 30, "weekly length");
const a = P.weeklyRun(), b2 = P.weeklyRun(); assert(a.next({ n: 3 }).id === b2.next({ n: 3 }).id, "weekly is seeded");
for (const l of (await import("../meta.js")).LISTS) { r = play(() => P.startRun(P.listRun(l))); console.log("list", l.id, r.seen.length, "wins", r.dir.wins, r.scene); assert(r.scene === "over", "list"); }
for (const n of [2, 8]) {
    const players = []; for (let i = 0; i < n; i++) players.push({ name: "P" + i, color: "#ff2d87", score: 0 });
    let hands = 0, boards = 0;
    r = play(() => game.go("run", { cfg: P.partyRun(players) }), { onHold: (d) => { if (d.hold?.kind === "handoff") hands++; if (d.hold?.kind === "board") boards++; } });
    console.log("party", n, "games", r.seen.length, "scores", players.map((p) => p.score).join(" "), r.scene);
    assert(r.seen.length === n * 9, "party length"); assert(r.scene === "podium", "podium"); assert(r.kinds.has("handoff") && r.kinds.has("board"), "party cards");
    const first = r.seen.slice(0, 3).join(), second = r.seen.slice(3, 6).join(); assert(first === second, "same games for each player");
}
// Free play loops until quit.
start: {
    P.startRun(P.freeRun(P.byId.swat, 1.5)); let t = 0, b3 = null, cur = null, count = 0;
    while (t++ < 2600) { game.step(1); const d = P.dir; if (d.state === "play") { if (d.m !== cur) { cur = d.m; count++; b3 = new Driver(game, { mode: "touch" }); b3.begin(cur); } b3.step(cur); } }
    console.log("free play rounds:", count, "bells", P.dir.lives); assert(count > 3, "free loops");
    b3.end(); P.dir.finish(true); game.step(40); assert(game.currentName === "games", "free returns to games");
}
game.go("games"); game.step(60); game.render(1); game.go("lists"); game.step(10); game.render(1); game.go("party"); game.step(10); game.render(1); game.go("podium", { players: [{ name: "PINK", color: "#ff2d87", score: 300 }, { name: "BLUE", color: "#12c9e8", score: 100 }] }); game.step(20); game.render(1);
console.log("seen", Object.keys(P.save.seen).length, "of", P.GAMES.length, "OK");
