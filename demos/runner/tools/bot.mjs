// Plays the whole game through the real scene and real input: swipes via input.drag, keys via input.press.
// A planner reads ahead, so this proves wiring end to end: tutorial, disguises, every world, the rocket, lap two, retry.
import "../game.js";
import { BIOMES, ROUTE, DISGUISE_IDS } from "../data.js";
import { CMD } from "../sim.js";
import { solve } from "./solve.mjs";
const game = globalThis.__pogo;
const fails = [], ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails.push(m); };
game.noSave = true;
const P = () => game.play;
const fresh = () => { game.restart("play"); game.profile.tutorial = false; game.profile.runs = 0; game.noSlow = true; };
const view = () => game.view;
const swipe = (c) => {
    const x = view().width / 2, y = view().height / 2, d = 60;
    const to = { [CMD.left]: [-d, 0], [CMD.right]: [d, 0], [CMD.jump]: [0, -d], [CMD.slide]: [0, d] }[c];
    game.input.drag(x, y, x + to[0], y + to[1]);
};
const keys = { [CMD.left]: "left", [CMD.right]: "right", [CMD.jump]: "jump", [CMD.slide]: "down" };

// 1. First run: the tutorial, played by swiping.
fresh();
ok(P().phase === "title", "starts on the title with a live world");
game.step(30);
game.input.tap(view().width / 2, view().height * 0.5); game.step(2);
ok(P().phase === "run" && P().run.tutorial, "one tap on the title is already running the tutorial");
{
    const seen = {}; let steps = 0;
    while (P().run.tutorial && steps++ < 4000) {
        const h = game.play.hud.hint;
        if (h && !seen[h.need]) { seen[h.need] = true; swipe(h.need === "lane" ? CMD.left : h.need === "jump" ? CMD.jump : CMD.slide); }
        game.step(1);
    }
    ok(seen.lane && seen.jump && seen.slide, "tutorial asks for lane, jump and slide, and swipes answer it");
    ok(game.profile.tutorial === true && P().run.stats.stumbles === 0, "tutorial finished without a stumble");
}

// 2. A full game by keyboard, from the title to the rocket and on to lap two.
function drive(run, maxSteps = 60 * 400, use = (c) => game.input.press(keys[c], 1)) {
    let n = 0, wait = 0;
    while (P().phase === "run" && P().run === run && n++ < maxSteps) {
        if (wait-- <= 0 && run.p.fly <= 0) {
            wait = 5;
            const list = run.obstacles.filter((o) => !o.dead && run.obD(o) + o.len + 1 > run.d && run.obD(o) < run.d + run.speed * 2.2);
            if (list.length) { const r = solve(run.p, run.d, run.d + run.speed * 2, run.speed, list, 6, run.disguise === "skates"); if (r.ok && r.cmds[0]) use(r.cmds[0]); }
        }
        game.step(1);
    }
    return n;
}
fresh(); game.profile.tutorial = true;
game.step(10); game.input.press("jump", 1); game.step(2);
ok(P().phase === "run", "space starts a run");
const run = P().run, biomes = new Set(), worn = new Set();
const say = run.say.bind(run);
run.say = (t, d) => { if (t === "biome") biomes.add(d.i); if (t === "wear") worn.add(d.id); say(t, d); };
const steps = drive(run);
ok(P().phase === "finale", `reached the rocket through real input in ${(steps / 60).toFixed(0)} s, ${run.eggCount} eggs, ${Math.floor(run.score)} points, ${run.stats.stumbles} stumbles, ${run.stats.near} near misses`);
ok(biomes.size === BIOMES.length - 1, `passed through every world (${biomes.size + 1})`);
console.log("     disguises worn:", [...worn].join(" "));
ok(worn.size === DISGUISE_IDS.length, "every disguise turned up");
const hap = game.state().haptics ?? [];
console.log("     recent haptics:", JSON.stringify(hap.slice(-6)));
game.step(60 * 5);
ok(P().phase === "win" && game.profile.owned.includes("goldie"), "the finale ends on the win screen and unlocks Goldie");
game.input.tap(view().width / 2, view().height * 0.4); game.step(3);
ok(P().phase === "run" && run.lapD < 10, "tap carries on to lap two");
drive(run, 60 * 10);
ok(P().phase === "run", "lap two keeps running");

// 3. Failure: one tap back to running, inside a second.
fresh(); game.profile.tutorial = true; game.noSlow = true;
P().begin({ auto: true, seed: 4, noTutorial: true });
game.step(120);
P().run.catchMe("crash", null);
let t = 0;
while (P().phase !== "over" && t < 120) { game.step(1); t++; }
const toCard = t;
game.step(11);
game.input.tap(view().width / 2, view().height * 0.45);
let u = 0; while (P().phase !== "run" && u < 60) { game.step(1); u++; }
ok(P().phase === "run", `caught to end card in ${Math.round(toCard / 0.06)} ms; the tap at ${Math.round((toCard + 11) / 0.06)} ms restarted the run ${Math.round(u / 0.06)} ms later`);
ok((toCard + 11 + u) / 60 < 1, "failure to running again takes under a second");

// 4. Input forgiveness.
fresh(); game.profile.tutorial = true;
P().begin({ auto: true, seed: 5, noTutorial: true });
game.step(90);
const r = P().run, p = r.p;
r.obstacles.length = 0;
game.input.press("jump", 1); game.step(26);
game.input.press("jump", 1); game.step(16);
ok(r.stats !== undefined && r.t > 0 && p.air && p.vy > 8, "a jump pressed just before landing fires on landing");
game.step(40);
game.input.press("jump", 1); game.step(10);
game.input.press("down", 1); game.step(16);
ok(!p.air && p.slide > 0, "slide pressed in the air slams down and slides");
p.lane = 2; game.step(20);
game.input.press("left", 1); game.step(2); game.input.press("left", 1); game.step(26);
ok(p.lane === 0 && Math.abs(p.x + 2.4) < 0.01, "two quick swipes both count");
// Mid-gesture swipe: the lane changes while the finger is still down.
game.step(10);
game.input.pointerEvent("down", 5, 180, 300); game.step(1);
game.input.pointerEvent("move", 5, 205, 300); game.step(2);
ok(p.lane === 1, "a swipe fires mid-stroke, before the finger lifts");
game.input.pointerEvent("move", 5, 300, 300); game.step(2);
ok(p.lane === 1, "a long stroke counts once");
game.input.pointerEvent("move", 5, 260, 300); game.step(2);
ok(p.lane === 0, "reversing without lifting fires the other way");
game.input.pointerEvent("up", 5, 260, 300); game.step(2);
ok(game.state().sounds !== null, "still alive");

// 5. Near miss: reward, slow motion and a haptic.
fresh(); game.profile.tutorial = true; game.noSlow = false;
P().begin({ auto: true, seed: 6, noTutorial: true });
game.step(90);
{
    const r = P().run;
    r.obstacles.length = 0; r.gen.at = r.d + 500;
    const ob = r.addObstacle(r.d + r.speed * 0.3, r.p.lane, "B", 2);
    game.step(6); game.input.press(r.p.lane === 0 ? "right" : "left", 1);
    let slow = 1, near = 0, chain0 = r.stats.near;
    for (let i = 0; i < 30; i++) { game.step(1); slow = Math.min(slow, P().s.timeScale); near = r.stats.near; }
    ok(near > chain0 && slow < 0.8, `a late dodge scores a near miss with slow motion (time scale ${slow.toFixed(2)})`);
    const h = game.state().haptics ?? [];
    ok(h.length > 0, `haptics logged: ${JSON.stringify(h.slice(-4))}`);
}
console.log(fails.length ? `\n${fails.length} FAILED` : "\nall passed");
process.exit(fails.length ? 1 : 0);
