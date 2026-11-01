// Plays the real game headless, through the scenes: the whole 27-hole tour, a cup, and a 3-player pass-the-phone round.
// A sim-backed caddie picks each shot from the true state; the shot goes in through the same fire() a release uses,
// and a few go in through real pointer events to test the slingshot itself.
import "../game.js";
import { Sim, HZ } from "../sim.js";
import { HOLES } from "../holes.js";
import { MAX_OVER } from "../data.js";
import { seedRng, isTimed, restAt, shot } from "./lib.mjs";
const game = globalThis.__pogo, R = () => globalThis.__golf, log = (...a) => console.log(...a);
const rng = seedRng(77);
function tap(label) {
    const e = game.current.entities.find((x) => x._isButton && !x.hidden && x.buttonLabel === label);
    if (!e) throw new Error(`no "${label}" on ${game.currentName}: ${game.current.entities.filter((x) => x._isButton).map((x) => x.buttonLabel)}`);
    e.emit("tap");
}
const settle = (n = 30) => game.step(n);
let pointerChecks = 0, pointerErr = 0;
function caddie(r) {
    const c = r.c, sim2 = r.ghost, tm = isTimed(c), now = { x: r.sim.x, y: r.sim.y, z: r.sim.z, t: r.sim.t, nx: r.sim.nx, ny: r.sim.ny, nz: r.sim.nz };
    const cup = c.cup_, F = c.Fall;
    let best = null, bv = 1e9;
    const toCup = Math.atan2(cup.x - now.x, -(cup.z - now.z)), a = c.ahead(now.x, now.z, 5), toR = Math.atan2(a[0] - now.x, -(a[1] - now.z));
    for (let k = 0; k < 420; k++) {
        const fine = k < 160, h = (k % 2 ? toCup : toR) + (rng() - 0.5) * (fine ? 0.3 : 1), s = { h, p: 0.14 + rng() * 0.86, chip: k % 4 === 3, wait: tm ? [0, 0.5, 1, 1.5, 2, 2.5, 3][k % 7] : 0 };
        const e = shot(sim2, now, s);
        const v = e.mode === "holed" ? -10 + s.wait * 0.01 : e.mode === "rest" ? c.fieldAt(e.x, e.z, F) : 500;
        if (v < bv) { bv = v; best = s; }
    }
    return best;
}
function pointerShot(r, h, p) {
    const sim = r.sim, s = game.current, cam = s.cam3, b = cam.project([sim.x, sim.y, sim.z]), q = cam.project([sim.x + Math.sin(h) * 3, sim.y, sim.z - Math.cos(h) * 3]);
    const dx = b.x - q.x, dy = b.y - q.y, l = Math.hypot(dx, dy), v = s.view, maxPull = Math.min(v.width, v.height) * 0.42, L = p * maxPull;
    game.input.pointerEvent("down", 1, b.x, b.y); game.step(2);
    for (let i = 1; i <= 8; i++) { game.input.pointerEvent("move", 1, b.x + dx / l * L * i / 8, b.y + dy / l * L * i / 8); game.step(1); }
    const before = r.strokes;
    game.input.pointerEvent("up", 1, b.x + dx / l * L, b.y + dy / l * L); game.step(1);
    if (r.strokes !== before + 1) throw new Error("pull did not shoot");
    const err = Math.abs(Math.atan2(Math.sin(r.lastShot.heading - h), Math.cos(r.lastShot.heading - h)));
    pointerChecks++; pointerErr = Math.max(pointerErr, err);
    if (Math.abs(r.lastShot.power - p) > 0.05) throw new Error(`pull power ${r.lastShot.power} wanted ${p}`);
}
function playHole(usePointer = false) {
    const r = R();
    r.endIntro(); game.step(2);
    let frames = 0;
    while (r.state !== "holed" && frames < 60 * 240) {
        if (r.state === "aim" && r.sim.mode === "rest") {
            const s = caddie(r);
            for (let i = 0; i < Math.round(s.wait * 60); i++) game.step(1);
            if (r.state === "aim" && r.sim.mode === "rest") {
                if (usePointer && !s.chip && r.strokes === 0) pointerShot(r, s.h, s.p); else r.fire(s.h, s.p, s.chip);
            }
        }
        game.step(1); frames++;
    }
    if (r.state !== "holed") throw new Error(`stuck in ${r.state} on ${r.def.name}, mode ${r.sim.mode}`);
    return r;
}
function finishCard(r) {
    let n = 0; while (!r.card && n++ < 800) game.step(1);
    if (!r.card) throw new Error("no scorecard");
}
game.restart("title"); settle(30);
const save = () => game.data.save;
if (game.currentName !== "title") throw new Error("title");
tap("PLAY"); settle(40);
if (game.currentName !== "play") throw new Error("PLAY did not reach a hole: " + game.currentName);
// ---- the tour ----
let total = 0, par = 0, over = 0;
const lines = [];
for (let n = 0; n < 27; n++) {
    if (n > 0) { game.go("play", { hole: n }); settle(3); }
    const r = playHole(n % 3 === 0);
    if (r.n !== n) throw new Error(`expected hole ${n} got ${r.n}`);
    finishCard(r);
    total += r.score; par += r.def.par; if (r.score > r.def.par) over++;
    lines.push(`${n + 1}:${r.score}/${r.def.par}`);
}
log("tour", lines.join(" ")); log(`tour total ${total} vs par ${par}, over par on ${over} holes`);
log("pointer shots", pointerChecks, "worst heading error", (pointerErr * 180 / Math.PI).toFixed(2), "deg");
const st = save();
log("save: holes", Object.keys(st.best).length, "islands", st.islandDone.join(), "aces", st.aces, "birdies", st.birdies, "skins", st.owned.join());
if (Object.keys(st.best).length !== 27 || !st.islandDone.every(Boolean)) throw new Error("tour incomplete");
// ---- the feel, event by event ----
game.go("play", { hole: 18 }); settle(3);
{
    const r = R(); r.endIntro(); game.step(6);
    const felt = [], real = game.haptic.bind(game);
    game.haptic = (p) => { felt.push(p); return real(p); };
    pointerShot(r, 0, 0.8);
    const pull = felt.filter((p) => p === "tick" || p === "light").length, hit = felt[felt.length - 1];
    felt.length = 0;
    game.step(100);
    const rumble = felt.filter((p) => typeof p === "number").length;
    log(`haptics: ${pull} tension ticks on the pull, hit "${hit}", ${rumble} rumble pulses in 100 steps on lava rock`);
    if (pull < 5 || rumble < 5) throw new Error("haptics missing");
    felt.length = 0;
    game.go("play", { hole: 0 }); settle(3);
    const q = R(); q.endIntro(); game.step(6);
    const c = q.c.cup_, s2 = q.sim; s2.x = c.x + 0.2; s2.z = c.z + 2; s2.y = c.y + 0.21; game.step(2); felt.length = 0; q.fire(Math.atan2(-0.2, 2), 0.28, false);
    let g = 0; while (q.state !== "holed" && g++ < 500) game.step(1);
    log("haptics: into the cup", JSON.stringify(felt.filter((p) => Array.isArray(p))[0]));
    game.haptic = real;
}
// ---- a cup ----
game.go("cups"); settle(30);
tap("Coconut Classic"); settle(40);
{
    let rounds = 0;
    for (;;) {
        const r = playHole(); finishCard(r); settle(20); rounds++;
        const last = r.run.i === r.run.order.length - 1;
        tap(last ? "Final standings" : "Next hole"); settle(40);
        if (last) break;
    }
    if (game.currentName !== "final") throw new Error("cup did not reach final");
    settle(60);
    const run = game.data.run;
    log("cup finished, rounds", rounds, "scores", run.players[0].scores.join(), "rivals", run.rivals.map((x) => `${x.name}:${x.scores.reduce((a, b) => a + b, 0)}`).join(" "), "cups won", save().cups);
    tap("Carry on"); settle(30);
}
// ---- pass the phone ----
game.go("party"); settle(30);
tap("3"); settle(5);
tap("Tee off"); settle(30);
{
    let passes = 0;
    if (game.currentName !== "pass") throw new Error("no pass screen");
    for (let guard = 0; guard < 40; guard++) {
        const run = game.data.run;
        tap(`I'm ${run.players[run.p].name}`); settle(30);
        const r = playHole(); finishCard(r); settle(20); passes++;
        const nextP = run.p + 1 < run.players.length;
        const last = run.i === run.order.length - 1;
        if (nextP) tap(`Pass to ${run.players[run.p + 1].name}`); else tap(last ? "Final standings" : "Next hole");
        settle(40);
        if (!nextP && last) break;
    }
    if (game.currentName !== "final") throw new Error("party did not reach final: " + game.currentName);
    settle(60);
    log("party finished, turns", passes, game.data.run.players.map((p) => `${p.name}:${p.scores.join("+")}`).join("  "));
}
log("errors", game.errors?.length ?? 0);
log("OK");
process.exit(0);
