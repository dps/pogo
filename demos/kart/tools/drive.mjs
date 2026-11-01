// Headless: send one autopilot kart round every track alone and report how it drove.
import "../game.js";
const game = globalThis.__pogo;
const ids = process.argv[2] ? process.argv[2].split(",") : ["aisle", "freezer", "bakery", "garden", "dock", "rooftop"];
for (const track of ids) {
    game.restart("race", { track, mode: "tt", cls: "trolley", racer: "pip", autopilot: true });
    const W = game.sim, k = W.player;
    let maxV = 0, sum = 0, n = 0, walls = 0, rough = 0, drifts = 0, falls = 0, steps = 0, mini = 0, airs = 0;
    const seen = k.events;
    const orig = seen.push.bind(seen);
    seen.push = (e) => { if (e[0] === "wall") walls++; if (e[0] === "fall") falls++; if (e[0] === "driftStart") drifts++; if (e[0] === "miniturbo") mini++; if (e[0] === "land") airs++; return orig(e); };
    while (game.currentName === "race" && steps < 60 * 300) {
        game.step(1); steps++;
        if (W.phase === "race") { maxV = Math.max(maxV, k.speed); sum += k.speed; n++; if (k.rough) rough++; }
    }
    console.log(track.padEnd(8), "time", W.t.toFixed(1), "bestLap", (k.bestLap || 0).toFixed(1), "avg", (sum / n).toFixed(1), "max", maxV.toFixed(1), "walls", walls, "rough%", (rough / n * 100).toFixed(0), "drifts", drifts, "boosts", mini, "jumps", airs, "falls", falls, "scene", game.currentName);
}
process.exit(0);
