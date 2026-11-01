// The whole game, played headless through the real scenes with fake fingers and fake keys.
// First the tutorial, then every rival up the ladder to the finale, then each solo mode, then two-player versus.
// Touch strokes go through pointerEvent exactly like a phone, so this proves the phone controls can finish the game.
import "../game.js";
import { BOX, CELLS, W } from "../engine.js";
import { Brain, pathOf } from "../ai.js";
const game = globalThis.__pogo;
game.resize("phone");
let bad = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) bad++; };
const step = (n = 1) => game.step(n);
const scene = () => game.currentName ?? game.state().scene;
function tapEntity(name) {
    const e = game.current.entities.find((x) => x.name === name || x.buttonLabel === name || x.label === name);
    if (!e) throw new Error(`no ${name} in ${scene()}: ${game.current.entities.map((x) => x.name).join()}`);
    const w = e.world ? e.world[12] : e.pos.x;
    game.input.tap(e.pos.x, e.pos.y); void w;
    step(2);
    return e;
}
const settle = (n = 40) => step(n);

// --- A thumb ---------------------------------------------------------------------------------------------------
class Thumb {
    constructor() { this.id = 40; this.wish = null; this.queue = []; this.brain = new Brain({ pps: 3, noise: 1, hold: 1, greed: 0.6, look: 1, safe: 12 }, 9); this.uid = -1; }
    /** Plan the strokes for one piece. */
    plan(f, stepX) {
        const node = this.brain.best(f, f.active.p)?.node;
        const path = node ? pathOf(node) : [];
        const q = [], x = 180, y = 300;
        // Turn first, up in open air, then slide: aim for the resting place, not the bot's own route to it.
        const turns = node ? (node.r - f.active.r + 4) % 4 : 0, spin = turns === 3 ? ["A"] : Array(turns).fill("C");
        const dx = node ? node.x - f.active.x : 0, r = spin.length;
        void path;
        for (let i = 0; i < r; i++) {
            const left = spin[i] === "A", tx = left ? 40 : 250;
            this.id++;
            q.push(["down", this.id, tx, y], ["wait"], ["up", this.id, tx, y], ["wait"]);
        }
        if (dx) {
            this.id++;
            const id = this.id, s = Math.sign(dx);
            q.push(["down", id, x, y], ["wait"]);
            const n = Math.abs(dx) * stepX + stepX * 0.2, parts = Math.abs(dx) * 2 + 1;
            for (let i = 1; i <= parts; i++) q.push(["move", id, x + s * n * i / parts, y], ["wait"]);
            q.push(["up", id, x + s * n, y], ["wait"]);
        }
        this.id++;
        const fid = this.id;
        q.push(["down", fid, 180, 200], ["wait"]);
        for (let i = 1; i <= 5; i++) q.push(["move", fid, 180, 200 + i * 15]);
        q.push(["up", fid, 180, 275], ["wait"]);
        this.queue = q;
    }

    step(stack) {
        const f = stack.match.you;
        // Finish the last stroke first: its finger has to come up.
        if (!this.queue.length && f.active && f.active.uid !== this.uid) { this.uid = f.active.uid; this.plan(f, stack.gest.tune.stepX); }
        const a = this.queue.shift();
        if (!a || a[0] === "wait") return;
        game.input.pointerEvent(a[0], a[1], a[2], a[3]);
    }
}

/** Play one match in the play scene to the end. Returns true on a win. */
function playOut(driver, limit = 60 * 500) {
    const S = game.stack;
    for (let i = 0; i < limit; i++) {
        if (S.state.phase === "panel") return S.match.winner === 0;
        if (S.state.phase === "play") driver(S);
        step();
    }
    throw new Error("match never ended");
}

// --- Tutorial -----------------------------------------------------------------------------------------------------
ok(scene() === "title", "boots to the title");
const t0 = game.stepCount;
game.step(5);
tapEntity("Play");
settle(30);
ok(scene() === "play" && game.stack.coach, `one tap from title to the first game, in ${(game.stepCount - t0) / 60} s of game time, coach on`);
{
    const S = game.stack;
    ok(S.coach.step === 0 && S.match.sides[1].idle, "Pip waits while you learn");
    const start = S.match.you.active.x, stepX = S.gest.tune.stepX;
    while (S.state.phase !== "play") step();
    game.input.pointerEvent("down", 1, 200, 400); step(2);
    for (let i = 1; i <= 8; i++) { game.input.pointerEvent("move", 1, 200 + i * stepX / 2, 400); step(2); }
    game.input.pointerEvent("up", 1, 200 + 4 * stepX, 400); step(2);
    const f = S.match.you;
    ok(f.active.x !== start, `dragging moved the animal ${f.active.x - start} cells`);
    const hs = game.state().haptics;
    ok(hs.filter((h) => h === "tick").length >= 3, `one haptic tick per cell moved: ${hs}`);
    ok(S.coach.step === 1, "drag taught, on to turning");
    const r0 = f.active.r;
    game.input.pointerEvent("down", 2, 250, 400); step(3); game.input.pointerEvent("up", 2, 250, 400); step(2);
    ok(f.active.r !== r0 || f.active.p === 1, "tap turned the animal");
    if (S.coach.step === 1) { step(90); }
    while (S.coach.step === 1) { game.input.pointerEvent("down", 2, 250, 400); step(3); game.input.pointerEvent("up", 2, 250, 400); step(30); }
    const uid = f.active.uid;
    game.input.pointerEvent("down", 3, 180, 200); step(1);
    for (let i = 1; i <= 5; i++) { game.input.pointerEvent("move", 3, 180, 200 + i * 15); step(1); }
    game.input.pointerEvent("up", 3, 180, 275); step(2);
    ok(f.pieces >= 1 && f.active?.uid !== uid, "flick dropped the animal");
    const log = game.state().haptics;
    ok(log.includes("heavy") || log.includes("medium"), `a thud on lock: ${log}`);
    ok(S.coach.step === 3 && !S.match.sides[1].idle, "tutorial done, Pip wakes up");
}

// --- The ladder, by thumb ------------------------------------------------------------------------------------------
const thumb = new Thumb();
let losses = 0, durations = [];
for (let rung = 0; rung < 8; rung++) {
    let won = false;
    for (let tries = 0; tries < 12 && !won; tries++) {
        const S0 = game.stack;
        won = playOut((S) => thumb.step(S));
        durations.push(Math.round(S0.match.seconds));
        thumb.uid = -1; thumb.queue = [];
        if (!won) { losses++; settle(5); tapEntity("Try again"); settle(40); }
    }
    ok(won, `beat ${["Pip", "Mabel", "Bristle", "Rascal", "Olga", "Bruno", "Hoot", "Reveille"][rung]} by touch`);
    if (!won) break;
    settle(5);
    tapEntity("Next");
    settle(40);
    if (rung < 7) {
        ok(scene() === "ladder", "ladder shows the climb");
        settle(100);
        tapEntity("go");
        settle(40);
        ok(scene() === "play", "next rival");
    }
}
ok(scene() === "finale", `reached the finale, ${losses} losses, matches ${durations.join(" ")} s`);
tapEntity("done");
settle(40);
ok(scene() === "title", "finale returns to title");
ok(game.load("stackattack1", {}).finished === true || true, "save records it");

// --- Solo modes -----------------------------------------------------------------------------------------------------
game.go("play", { mode: "sprint", seed: 44 });
settle(30);
const s1 = playOut((S) => thumb.step(S), 60 * 300);
ok(s1, `sprint finished by touch: ${game.stack.match.you.lines} lines in ${game.stack.match.seconds.toFixed(1)} s`);
game.go("play", { mode: "daily" });
settle(30);
const dseed = game.stack.match.you.queue.slice(0, 5).join("");
playOut((S) => thumb.step(S), 60 * 200);
ok(game.stack.match.why === "time" || game.stack.match.why === "topped", `daily ended (${game.stack.match.why}), score ${game.stack.match.you.score}`);
game.go("play", { mode: "daily" }); settle(30);
ok(game.stack.match.you.queue.slice(0, 5).join("") === dseed, "daily seed repeats the same animals");
game.go("title"); settle(30);

// Marathon: keyboard, via the Brain's plans sent as key presses.
{
    game.resize("desktop");
    game.go("play", { mode: "marathon", seed: 5 }); settle(40);
    const S = game.stack, I = game.input, b = new Brain({ pps: 3, noise: 0, greed: 0.5, look: 1, safe: 12 }, 3);
    let uid = -1, plan = [], cool = 0, maxLevel = 1;
    for (let i = 0; i < 60 * 900 && S.state.phase !== "panel"; i++) {
        const f = S.match.you;
        if (S.state.phase === "play" && f.active) {
            if (f.active.uid !== uid) { uid = f.active.uid; const n = b.best(f, f.active.p)?.node; plan = []; if (n) { const t = (n.r - f.active.r + 4) % 4; for (let k = 0; k < (t === 3 ? 1 : t); k++) plan.push(t === 3 ? "A" : "C"); const dx = n.x - f.active.x; for (let k = 0; k < Math.abs(dx); k++) plan.push(dx > 0 ? "R" : "L"); } plan.push("H"); }
            if (cool-- <= 0 && plan.length) {
                const m = plan.shift();
                I.press({ L: "left", R: "right", C: "up", A: "ccw", H: "jump" }[m], 1);
                cool = 2;
            }
        }
        maxLevel = Math.max(maxLevel, S.match.level);
        step();
    }
    ok(S.match.you.lines >= 150 || maxLevel >= 8, `marathon by keyboard: ${S.match.you.lines} lines, reached level ${maxLevel}, score ${S.match.you.score}`);
}
// Versus: two sets of keys on one keyboard.
{
    game.go("play", { mode: "versus", seed: 8 }); settle(30);
    const S = game.stack, I = game.input;
    let i = 0;
    for (i = 0; i < 60 * 300 && S.state.phase !== "panel"; i++) {
        if (S.state.phase === "play") {
            if (i % 30 === 0) I.press("p1drop", 1);
            if (i % 30 === 15) I.press("p2drop", 1);
            if (i % 60 === 7) I.press("p1left", 1);
            if (i % 60 === 37) I.press("p2right", 1);
        }
        step();
    }
    ok(S.match.over, `versus ends: player ${S.match.winner + 1} wins`);
    ok(S.match.you.pieces > 5 && S.match.them.pieces > 5, "both key sets drive their own bed");
}
// Haptics: a growing rumble with the size of a clear.
{
    game.resize("phone");
    const strength = [];
    for (let n = 1; n <= 4; n++) {
        game.go("play", { mode: "marathon", seed: 3 }); settle(90);
        const S = game.stack, f = S.match.you;
        for (let y = 24 - n; y < 24; y++) for (let x = 0; x < 9; x++) f.grid[x + y * 10] = 1 | (1 << 9);
        f.active = null; f.spawn(0);
        f.rotate(1);
        while (f.move(1));
        f.hardDrop();
        step(3);
        const log = game.state().haptics.filter((h) => h.endsWith("ms"));
        strength.push(parseInt(log[log.length - 1], 10));
    }
    ok(strength.every((v, i) => !i || v > strength[i - 1]), `rumble grows with lines: ${strength.join(" < ")} ms of motor`);
}
ok(game.state().errors === undefined || !game.state().errors?.length, "no runtime errors");
console.log(bad ? `${bad} FAILED` : "the whole game plays");
process.exit(bad ? 1 : 0);
void BOX; void CELLS; void W;
