// Same seed and same inputs give the same run: the daily house is the same for everyone.
import { playRun } from "./bot.mjs";
for (const seed of [11, 222, 3333]) {
    const a = playRun(seed, 0.6), b = playRun(seed, 0.6);
    const ok = a.score === b.score && a.kills === b.kills && a.steps === b.steps && a.route === b.route;
    console.log(ok ? "ok  " : "FAIL", seed, a.route, a.score, a.steps);
    if (!ok) process.exit(1);
}
