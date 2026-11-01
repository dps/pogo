// Plays the real game through its real input, headless: menus, swipes, a chomp, a win, the news page, a loss, a
// second helping, nap time and the finale. Replay state is compared to the rules after every move.
import "../game.js";
import { W, H, N } from "../engine.js";
import { LEVELS } from "../levels.js";
const game = globalThis.__pogo;
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log("FAIL", m); } else console.log("ok  ", m); };
const S = () => game.sugar;
const idle = (max = 900) => { for (let i = 0; i < max && !S().view.idle; i++) game.step(1); };
const synced = () => {
    const { m, view: v } = S();
    for (let i = 0; i < N; i++) {
        for (const k of ["frost", "cookie", "cage", "fudge", "mask"]) if (m[k][i] !== v.vis[k][i]) return `${k} at ${i}`;
        if (!!m.pid[i] !== !!v.pieces.get(m.pid[i])) return `piece at ${i}`;
    }
    return null;
};
function swipe(a, b) {
    const v = S().view;
    const I = game.input;
    I.pointerEvent("down", 7, v.cx(a), v.cy(a)); game.step(2);
    I.pointerEvent("move", 7, (v.cx(a) + v.cx(b)) / 2, (v.cy(a) + v.cy(b)) / 2); game.step(2);
    I.pointerEvent("move", 7, v.cx(b), v.cy(b)); game.step(2);
    I.pointerEvent("up", 7, v.cx(b), v.cy(b)); game.step(8);
}
function playMove() {
    const { m } = S(), l = m.legal();
    swipe(l[0][0], l[0][1]);
    idle();
    const s = synced();
    if (s) { ok(false, `view out of step: ${s}`); bad += 100; }
}

game.resize("phone");
game.restart("title");
game.step(30);
ok(game.currentName === "title", "boots to title");
const btn = game.current.entities.find((e) => e.buttonLabel === "Play");
ok(!!btn, "play button exists");
game.input.tap(btn.pos.x, btn.pos.y);
game.step(40);
ok(game.currentName === "play", `first tap reaches play (${(game.state().time ?? 0)})`);
game.step(30);
const before = S().m.moves;
playMove();
ok(S().m.moves === before - 1, "a real drag swaps and costs one move");
ok(game.state().haptics?.length > 0, `haptics fired: ${JSON.stringify(game.state().haptics?.slice(-3))}`);

// A refused swap costs nothing.
{
    const { m } = S();
    let bad0 = null;
    for (let i = 0; i < N - 1 && !bad0; i++) if (i % W < W - 1 && m.movable(i) && m.movable(i + 1) && !m.canSwap(i, i + 1)) bad0 = i;
    const mv = m.moves;
    swipe(bad0, bad0 + 1); idle();
    ok(m.moves === mv, "a refused swap costs nothing");
}
// Chomp through the monster.
{
    const { m, monster, view } = S();
    m.feed = m.feedNeed; view.snap.feed = m.feed;
    game.step(3);
    const c = monster.centre();
    game.input.tap(c.x, c.y); game.step(3);
    ok(view.aiming, "tapping a full Morsel arms a chomp");
    const t = 2 + 4 * W;
    game.input.tap(view.cx(t), view.cy(t)); game.step(4);
    ok(!view.aiming && m.counts.chomps === 1, "tapping the board bites it");
    idle(); ok(!synced(), "still in step after chomp");
    game.step(60);
    ok(Math.abs(monster.x - 180) < 30, "Morsel hops home");
}
// Haptics climb with the cascade.
{
    const { host } = S(), seen = [];
    for (const chain of [0, 1, 2, 3, 4]) { game.step(12); const n = game.state().haptics.length; host.onBurst({ chain, pops: [{}, {}, {}], feed: 0 }); game.step(1); seen.push(game.state().haptics.slice(n).join("+") || game.state().haptics.at(-1)); }
    console.log("     cascade haptics:", seen.join(" > "));
    ok(new Set(seen).size >= 3, "haptics rise along a cascade");
}
// Keyboard: arrows, confirm, arrow swaps.
{
    const { m, view } = S();
    game.step(10); game.input.press("down", 1); game.step(2);
    ok(view.cursor >= 0, "arrow key shows a cursor");
    const l = m.legal()[0], used = m.movesUsed;
    view.cursor = l[0];
    game.input.press("confirm", 1); game.step(2);
    ok(view.sel === l[0], "confirm picks up a candy");
    game.input.press(l[1] === l[0] + 1 ? "right" : "down", 1); game.step(3);
    ok(m.movesUsed === used + 1, "arrow swaps it");
    idle(); view.cursor = -1;
}
// Play level to a win by real swipes.
let guard = 0;
while (!S().m.won && !S().m.lost && guard++ < 60) { if (S().m.chompReady && S().m.moves <= 0) break; playMove(); }
ok(S().m.won, `level 1 beaten by swipes after ${S().m.movesUsed} moves`);
for (let i = 0; i < 900 && S().phase !== "news"; i++) game.step(1);
ok(S().phase === "news", "win leads through the ruin to the news page");
ok(game.sugarSave.stars[0] >= 1, `stars saved: ${game.sugarSave.stars[0]}`);
game.step(90);
game.input.press("confirm", 2); game.step(50);
ok(game.currentName === "play" && S().m.def.n === 1, "Next goes straight to level 2");
game.step(30);

// Losing, the free second helping, and retry.
{
    const { m, view } = S();
    m.moves = 1; view.snap.moves = 1; m.feed = 0;
    m.goals[0].n = 999;
    playMove();
    if (m.chompReady) { m.feed = 0; }
    game.step(10);
    ok(S().phase === "lost" || m.lost, "running out of moves loses");
    game.step(40);
    const helping = game.current.entities.find((e) => e.buttonLabel?.startsWith("Second"));
    ok(!!helping, "a free second helping is offered");
    game.input.tap(helping.pos.x, helping.pos.y); game.step(30);
    ok(S().phase === "play" && m.moves === 5 && !m.lost, "second helping gives five moves");
    playMove(); ok(m.moves === 4, "and they work");
}

// Every world's art paints and every board loads and draws on every device.
for (const device of ["phone", "phone-landscape", "desktop", "phone-small", "tablet"]) {
    game.resize(device);
    for (const n of [0, 12, 28, 40, 50, 66, 71]) { game.go("play", { level: n }); game.step(30); game.render(); }
    game.go("map", { world: 3 }); game.step(30); game.render();
}
game.resize("phone");
ok(true, "all worlds draw on all devices");

// Force through the ruin for all 72 levels to prove every verb and prop.
game.grant(0, 0);
for (let n = 0; n < LEVELS.length; n += 1) {
    delete game.sugarSave.stars[n];
    game.go("play", { level: n, attempt: 1 }); game.step(25);
    S().finish();
    for (let i = 0; i < 1500 && S().phase !== "news"; i++) game.step(1);
    if (S().phase !== "news") ok(false, `level ${n + 1} never reached the news`);
    game.step(70);
}
ok(game.sugarSave.stars.filter(Boolean).length === 72, "all 72 ruins played, every landmark");

// Finale.
game.input.press("confirm", 2); game.step(50);
ok(game.currentName === "finale", "last level leads to the finale");
game.step(500);
ok(game.sugarSave.finished, "game marked finished");
const nap = game.current.entities.find((e) => e.buttonLabel === "Nap Time");
game.input.tap(nap.pos.x, nap.pos.y); game.step(60);
ok(game.currentName === "play" && S().m.endless, "finale opens Nap Time");
for (let n = 0; n < 40; n++) playMove();
ok(S().m.moves <= 0 && !S().m.lost && !S().m.won, "nap mode has no end and no failure");
ok(game.sugarSave.nap.candies > 0, `nap counts: ${JSON.stringify(game.sugarSave.nap)}`);
console.log(bad ? `${bad} FAILURES` : "PASS");
process.exit(bad ? 1 : 0);
