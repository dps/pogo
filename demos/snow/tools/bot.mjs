// Plays the whole game through the real scenes: walks the map to every plot and solves it with real key input,
// then checks the end. Also exercises undo, restart and hints. usage: node tools/bot.mjs [--all] [--quick]
import "../game.js";
import { LEVELS } from "../levels.js";
import { SOLUTIONS } from "../solutions.js";
const game = globalThis.__pogo, app = game.app;
const quick = process.argv.includes("--quick"), KEY = { u: "up", r: "right", d: "down", l: "left" };
const fail = (m) => { console.log("FAIL", m); process.exit(1); };
const until = (fn, max, why) => { for (let i = 0; i < max; i++) { if (fn()) return i; game.step(1); } fail(`timed out: ${why} scene=${game.currentName}`); };
let totalSteps = 0, undos = 0, endSeen = false;
function playLevel(id) {
    const moves = SOLUTIONS[id]?.moves;
    if (!moves) fail(`no solution for ${id}`);
    until(() => game.currentName === "play" && game.play?.lvl.id === id, 200, `enter ${id}`);
    const P = game.play;
    game.step(30);
    if (quick) {
        // A wrong move and an undo first, so the solution has to survive them.
        const before = P.st.c.join();
        for (const d of [0, 1, 2, 3]) if (P.tryMove(d)) { until(() => !P.busy, 90, "move"); break; }
        P.restart(); game.step(4);
        if (P.st.c.join() !== before) fail(`restart differs in ${id}`);
        // A real push, then the undo key, must give the same board back.
        const pre = P.st.c.join(), plan = moves;
        let i = 0;
        for (; i < plan.length && game.data.pushes === 0; i++) { P.tryMove("urdl".indexOf(plan[i])); until(() => !P.busy, 90, "demo move"); }
        game.input.press("undo", 1); game.step(3);
        if (P.st.c.join() !== pre) fail(`undo differs in ${id}`);
        undos++;
        P.restart(); game.step(4);
    }
    for (const ch of moves) {
        until(() => !P.busy, 200, `ready in ${id}`);
        game.input.press(KEY[ch], 1);
        const was = P.st.p, c = P.st.c.join();
        until(() => P.st.p !== was || P.st.c.join() !== c, 40, `move ${ch} took in ${id}`);
    }
    until(() => P.won, 80, `won ${id}`);
    until(() => game.currentName === "world", 500, "back to map");
}
game.restart("title");
game.step(30);
game.input.tap(180, 300);
playLevel(LEVELS[0].id);
for (let i = 1; i < LEVELS.length; i++) {
    const l = LEVELS[i];
    until(() => game.map && !game.map.busy, 500, "map idle");
    game.step(170);
    if (game.currentName === "end" || game.app.isComplete() && game.currentName !== "world") {
        until(() => game.currentName === "end", 200, "end scene");
        endSeen = true;
        game.step(120); game.input.tap(180, 300);
        until(() => game.currentName === "world", 200, "back from the end");
        game.step(10);
        until(() => !game.map.busy, 300, "map idle after end");
    }
    if (!game.map.open.has(l.id)) fail(`${l.id} not open after solving ${LEVELS[i - 1].id}`);
    const r = game.map.go(l.id);
    until(() => game.currentName === "play" || !game.map.busy, 2000, `walk to ${l.id}`);
    if (game.currentName !== "play") game.map.enter();
    playLevel(l.id);
    totalSteps += game.stepCount;
}
game.step(400);
console.log("solved", Object.keys(app.save.solved).length, "of", LEVELS.length, "scene", game.currentName, "end screen seen", endSeen, "ended", app.save.ended, "errors", game.errors?.length ?? 0, "undos tested", undos, "haptics", JSON.stringify(game.state().haptics?.slice?.(-3)));
