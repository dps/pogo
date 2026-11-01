// Two bots. Run: node tools/bot.mjs [sim|story|sync|all]
// sim:   model players of three skills through every chart in the pure judge, thousands of notes a second.
// story: the real game, headless, through real pointer and key input, from a fresh save to the ending.
// sync:  the Sync screen, with a tapper who lags by a known amount.
import { SONGS } from "../music/songs.js";
import { compile, DIFFS } from "../charts.js";
import { Judge, summary, windowsFor, PASS } from "../engine.js";

const what = process.argv[2] ?? "all";
let fails = 0;
const fail = (m) => { fails++; console.log(`  FAIL ${m}`); };

function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const normal = (r) => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.283 * r());

// A bot is not a human: these models are pessimistic about reading speed, because real first-timers also look at the goblins.
const SKILL = {
    novice: { sigma: 0.06, slip: 0.08, speedLimit: 2.0, panic: 0.16, mash: 6 },
    casual: { sigma: 0.04, slip: 0.03, speedLimit: 3.2, panic: 0.12, mash: 8 },
    expert: { sigma: 0.02, slip: 0.008, speedLimit: 6, panic: 0.05, mash: 11 },
};
function simulate(song, diff, skill, seed, idx) {
    const c = compile(song, diff), m = SKILL[skill], r = rng(seed), j = new Judge(c.notes, { windows: windowsFor(diff, idx), feverLength: 8 });
    const events = [];
    for (const n of c.notes) {
        const near = c.notes.filter((x) => Math.abs(x.time - n.time) < 1).length / 2;
        const slip = m.slip + Math.max(0, near - m.speedLimit) * m.panic;
        if (r() < slip) continue;
        const at = n.time + normal(r) * m.sigma;
        if (n.kind === "roll") { for (let t = n.time + 0.05; t < n.time + n.dur; t += 1 / m.mash) events.push([t, "press", n.lane], [t + 0.03, "release", n.lane]); continue; }
        events.push([at, "press", n.lane]);
        if (n.kind === "hold") events.push([n.time + n.dur - (r() < slip ? n.dur * 0.6 : 0), "release", n.lane]);
        else if (n.kind === "swipe") { if (r() > slip * 2) events.push([at + 0.03, "swipe", n.lane]); events.push([at + 0.09, "release", n.lane]); }
        else events.push([at + 0.05, "release", n.lane]);
    }
    events.sort((a, b) => a[0] - b[0]);
    for (const [t, k, l] of events) { j.tick(t); j[k](l, t); }
    j.tick(c.arr.end + 9);
    return summary(j, diff);
}
function sim() {
    const rows = [], curve = { easy: [], normal: [], hard: [] };
    SONGS.forEach((song, idx) => {
        for (const diff of DIFFS) {
            const row = { chart: `${song.id}/${diff}` };
            for (const skill of Object.keys(SKILL)) {
                let acc = 0, pass = 0, score = 0, fev = 0;
                const N = 24;
                for (let i = 0; i < N; i++) { const r = simulate(song, diff, skill, 1 + i * 77 + idx, idx); acc += r.acc; pass += r.passed ? 1 : 0; score += r.score; fev += r.fevers; }
                row[`${skill}%`] = Math.round(acc / N * 100); row[`${skill}Pass`] = Math.round(pass / N * 100);
                if (skill === "expert") row.fevers = +(fev / N).toFixed(1);
            }
            rows.push(row);
            curve[diff].push(row["casual%"]);
            if (diff === "easy" && idx < 6 && row.novicePass < 90) fail(`${row.chart}: a novice passes only ${row.novicePass}%`);
            if (diff === "easy" && row.casualPass < 90) fail(`${row.chart}: a casual player passes only ${row.casualPass}%`);
            if (diff === "normal" && row.casualPass < 50) fail(`${row.chart}: a casual player passes only ${row.casualPass}%`);
            if (row.expertPass < 95) fail(`${row.chart}: an expert passes only ${row.expertPass}%`);
            if (row["expert%"] < row["casual%"] - 1 || row["casual%"] < row["novice%"] - 1) fail(`${row.chart}: skill does not pay`);
        }
    });
    console.table(rows);
    // Ramp: over the story, chart difficulty for a casual player falls gently, with no cliffs.
    for (const [d, c] of Object.entries(curve)) {
        const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        const first = mean(c.slice(0, 4)), last = mean(c.slice(-4));
        console.log(`${d}: casual accuracy first four ${first.toFixed(0)}%, last four ${last.toFixed(0)}%, worst step ${Math.min(...c.slice(1).map((v, i) => v - c[i]))}`);
        if (last > first + 2) fail(`${d}: later songs are easier than early ones`);
    }
}

async function loadGame() {
    await import("../game.js");
    return { game: globalThis.__pogo, ctx: globalThis.__beat };
}

/** Play the current song through game.input, as a person with real fingers, with a touch of human timing. */
function playThrough(game, ctx, seed = 5, sigma = 0.018) {
    const r = rng(seed), { judge, L } = ctx.run, plan = [];
    for (const n of judge.notes) {
        const at = n.time + normal(r) * sigma, x = L.laneX[n.lane], y = L.hitY + 30, id = 700 + n.lane;
        if (n.kind === "tap") plan.push([at, "down", id, x, y], [at + 0.05, "up", id, x, y]);
        else if (n.kind === "hold") plan.push([at, "down", id, x, y], [n.time + n.dur + 0.02, "up", id, x, y]);
        else if (n.kind === "swipe") plan.push([at, "down", id, x, y], [at + 0.034, "move", id, x, y - 60], [at + 0.07, "up", id, x, y - 60]);
        else for (let t = n.time + 0.02; t < n.time + n.dur - 0.03; t += 0.11) plan.push([t, "down", id, x, y], [t + 0.05, "up", id, x, y]);
    }
    plan.sort((a, b) => a[0] - b[0]);
    let i = 0, guard = 0;
    while (game.currentName === "play" && guard++ < 60 * 400) {
        const t = ctx.clock.time + game.dt;
        while (i < plan.length && plan[i][0] <= t) { const p = plan[i++]; game.input.pointerEvent(p[1], p[2], p[3], p[4]); }
        game.step(1);
    }
    if (guard >= 60 * 400) fail("song never ended");
}

async function story() {
    const { game, ctx } = await loadGame();
    game.step(5);
    console.log("scene", game.currentName);
    if (game.currentName !== "title") fail("not on title");
    const fresh = !ctx.save.played;
    if (!fresh) fail("save was not fresh");
    const t0 = Date.now();
    let haptic = new Set(), played = 0;
    // First touch to play: tap PLAY by its real position, then count steps until the first note can be hit.
    const play = game.current.entities.find((e) => e.buttonLabel === "PLAY"), p0 = play.worldPos();
    game.input.tap(p0.x, p0.y);
    let steps = 0;
    while (game.currentName !== "play" && steps++ < 120) game.step(1);
    if (game.currentName !== "play") fail("PLAY did not start a song");
    const first = ctx.run.notes[0].time;
    console.log(`PLAY tap to song: ${(steps / 60).toFixed(2)} s, first note ${first.toFixed(2)} s later, on ${ctx.run.diff}`);
    if (steps / 60 + first > 5) fail("over five seconds to first play");
    const kinds = [];
    for (const song of SONGS) {
        if (game.currentName !== "play") { game.go("play", { id: song.id, diff: "easy" }); game.step(3); }
        if (ctx.run.song.id !== song.id) fail(`wrong song ${ctx.run.song.id}`);
        if (game.currentName !== "play") fail("not playing");
        const size = ctx.run.heads;
        playThrough(game, ctx, 7 + played);
        for (const h of game.state().haptics ?? []) haptic.add(h);
        const res = game.data.result, r = res.r;
        played++;
        kinds.push(`${song.id}:${r.grade}`);
        if (game.currentName !== "results") game.step(40);
        if (game.currentName !== "results") fail(`no results after ${song.id}: ${game.currentName}`);
        if (!r.passed) fail(`${song.id}: bot failed with ${(r.acc * 100).toFixed(1)}%`);
        if (r.grade[0] !== "S" && r.grade !== "A") fail(`${song.id}: careful bot only got ${r.grade}`);
        game.step(180);
    }
    console.log(kinds.join(" "));
    if (!ctx.save.won) fail("story not won");
    console.log(`band ${JSON.stringify(ctx.save.story)}, stars`, Object.values(ctx.save.songs).map((s) => s.easy.stars).join(""));
    const end = game.current.entities.find((e) => e.buttonLabel === "ONWARD" || e.buttonLabel === "TOUR");
    if (!end) fail("no way on from last results");
    else { const q = end.worldPos(); game.input.tap(q.x, q.y); game.step(60); }
    console.log("after last song:", game.currentName);
    if (game.currentName !== "ending") fail("ending not reached");
    game.step(600);
    console.log("story time", Date.now() - t0, "ms; haptics seen:", [...haptic].join(" "));
    if (![...haptic].some((h) => h === "34ms" || h === "42ms")) fail("no kick haptics seen");
    // A miss feels different from a hit: let one note go by.
    game.go("play", { id: "mudfoot", diff: "easy" }); game.step(5);
    while (ctx.run.judge.counts.miss < 1 && game.currentName === "play") game.step(1);
    game.step(2);
    if (!(game.state().haptics ?? []).includes("12ms")) fail("no dull miss haptic");
    if (!game.state().sounds?.length && !(game.audio.log.length)) fail("no sound logged");
    // Keyboard works too.
    game.go("play", { id: "mudfoot", diff: "easy" }); game.step(5);
    const n0 = ctx.run.notes[0];
    while (ctx.clock.time < n0.time - game.dt * 2) game.step(1);
    game.input.press(n0.lane === 0 ? "k0" : "k3", 3); game.step(4);
    if (ctx.run.judge.judged !== 1 || ctx.run.judge.counts.miss) fail("keyboard press was not judged a hit");
    // Practice loops a section at reduced speed, and comes back round.
    game.go("play", { id: "skank", diff: "normal", practice: { from: 1, to: 2, speed: 0.75 } }); game.step(5);
    const loop = ctx.run.arr.n * ctx.run.arr.stepDur, total = ctx.run.notes.length;
    console.log(`practice: loop ${loop.toFixed(1)} s, ${total} notes over six loops`);
    playThrough(game, ctx, 3);
    if (game.currentName !== "results") fail("practice did not end");
    console.log("practice acc", game.data.result.r.acc.toFixed(3));
}

async function sync() {
    const { game, ctx } = await loadGame();
    game.go("calibrate", { back: "title" }); game.step(3);
    ctx.calibrate.start();
    const beat = 60 / 100, lag = 0.062, r = rng(11);
    let n = 2, guard = 0;
    while (!ctx.calibrate.result() && guard++ < 3000) {
        const at = n * beat + lag + normal(r) * 0.012;
        if (ctx.clock.time + game.dt * 0.5 >= at) { game.input.tap(180, 500); n++; }
        game.step(1);
    }
    const res = ctx.calibrate.result();
    console.log("sync result", res, "offset now", game.audio.offset);
    if (!res || Math.abs(game.audio.offset - lag) > 0.012) fail("sync did not recover the lag");
    // Notes now line up: the same lagging player scores perfects.
    const before = ctx.clock.time;
    game.go("play", { id: "mudfoot", diff: "normal" }); game.step(3);
    const { judge, notes } = ctx.run;
    for (const n of notes.slice(0, 20)) {
        while (ctx.clock.time < n.time + lag - game.audio.offset - game.dt) game.step(1);
        const L = ctx.run.L; game.input.pointerEvent("down", 600, L.laneX[n.lane], L.hitY); game.step(1); game.input.pointerEvent("up", 600, L.laneX[n.lane], L.hitY); game.step(1);
    }
    console.log("after sync", judge.counts);
    if (judge.counts.perfect < 16) fail("calibrated player does not get perfects");
    game.audio.offset = 0;
}

if (what === "sim" || what === "all") sim();
if (what === "story") await story();
if (what === "sync") await sync();
console.log(fails ? `\n${fails} FAILURES` : "\nBOT PASS");
process.exit(fails ? 1 : 0);
