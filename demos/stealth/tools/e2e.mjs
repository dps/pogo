// The whole game through its real scenes, touching only input. Plays every heist with the solver's route, then checks the books.
import { readFileSync } from "node:fs";
const paths = JSON.parse(readFileSync(new URL("./paths.json", import.meta.url)));
await import("../game.js");
const game = globalThis.__pogo;
const { HEISTS } = await import("../levels.js");
game.start?.call;
const failures = [];
const step = (n = 1) => { for (let i = 0; i < n; i++) game.step(1); };
const X = 180, Y = 420, R = 64;
step(30);
if (game.currentName !== "title") failures.push("not on title");
game.input.tap(180, 300); step(30);
for (let i = 0; i < HEISTS.length; i++) {
    const def = HEISTS[i], route = paths[def.id];
    if (game.currentName !== "play" || game.data.heist !== i) { failures.push(`heist ${i}: on ${game.currentName}, heist ${game.data.heist}`); break; }
    game.input.press("act", 1); step(2);       // skips the opening pan
    // One thumb, held down for the whole heist. Steps are matched to the sim, as a replay must be.
    game.input.pointerEvent("down", 1, X, Y); game.step(1); game.input.pointerEvent("move", 1, X + 14, Y); game.step(1); game.input.pointerEvent("move", 1, X, Y);
    let guard = 0;
    while (game.currentName === "play" && game.data.status === "play" && guard++ < 60 * 300) {
        const [mx = 0, my = 0, act = 0] = route.inputs[game.sim.step_] ?? [];
        if (act) game.input.press("act", 1);
        game.input.pointerEvent("move", 1, X + mx * R, Y + my * R);
        game.step(1);
    }
    game.input.pointerEvent("up", 1, X, Y);
    step(70);
    const last = game.data.last;
    const line = `${String(i + 1).padStart(2)} ${def.title.padEnd(24)} ${game.currentName.padEnd(5)} ${last?.heist === i ? `${last.style} loot ${last.got}/${last.total} t=${last.time.toFixed(1)}s +${last.gain}` : "NO RESULT " + game.data.status}`;
    console.log(line);
    if (last?.heist !== i || game.currentName !== "rank" || !last.ghost) failures.push(line);
    step(60);
    game.input.press("confirm", 1); step(40);
}
// The feel: heartbeat under suspicion, a thud on a smash, a purr on success.
game.go("play", { i: 0 }); step(30); game.input.press("act", 1); step(4);
{
    const sim = game.sim; sim.guards[0].route = []; sim.guards[0].path = []; sim.guards[0].x = 3.5 * 32; sim.guards[0].y = 3.5 * 32;
    const seen = new Set(), watch = (n) => { for (let i = 0; i < n; i++) { game.step(1); for (const h of game.state().haptics) seen.add(h); } };
    sim.guards[0].s = 0.5; sim.guards[0].state = "curious"; watch(120);
    const heart = [...seen].join(" | "); seen.clear();
    const it = sim.items[0]; sim.tip(it); watch(100);
    console.log("suspicion haptics:", heart, "\nsmash haptics:", [...seen].join(" | "));
    if (!heart || !seen.size) failures.push("missing haptics");
}
const save = game.progress();
console.log(`bones ${save.bones}, done ${Object.keys(save.done).length}/${HEISTS.length}, ghosts ${Object.values(save.done).filter((d) => d.ghost).length}`);
console.log("haptics seen:", [...new Set(game.state().haptics)].slice(0, 8).join(" | "));
console.log("errors:", game.errors.length);
console.log(failures.length ? `FAILED:\n${failures.join("\n")}` : "WHOLE GAME PLAYED THROUGH");
process.exit(failures.length || game.errors.length ? 1 : 0);
