// The whole campaign through the real game: scenes, saves, result cards and next-mission flow, with a bot for thumbs.
import "../game.js";
const game = globalThis.__pogo;
import { MISSIONS } from "../story.js";
let tries = 0, total = 0; const log = [];
for (let m = 0; m < MISSIONS.length; m++) {
    let won = false;
    for (let seed = 1; seed <= 12 && !won; seed++) {
        tries++;
        game.go("play", { mission: m, seed }); game.step(40);
        const A = game.ants; if (A.mission !== m) throw new Error(`scene did not change for ${m}`);
        A.sim.brains.push(new A.Commander(A.sim)); A.stage.speed = 4;
        let n = 0; while (!game.data.outcome && n++ < 60 * 60 * 22) game.step(60);
        total += A.sim.seconds;
        won = game.data.outcome === "win"; log.push(`M${m + 1} seed ${seed}: ${game.data.outcome ?? "timeout"} ${Math.round(A.sim.seconds)}s ${won ? game.data.lastStars + "*" : ""} peak ${A.sim.me.peak} ${A.sim.reason}`);
        game.step(200);
    }
    if (!won) { console.log(log.join("\n")); throw new Error(`mission ${m + 1} not beaten`); }
}
const save = game.load("antwars1", {});
console.log(log.join("\n"));
console.log(`campaign complete: ${tries} attempts, ${(total / 60).toFixed(0)} bot-minutes; stars ${JSON.stringify(save.stars)}; final scene ${game.state().scene}`);
