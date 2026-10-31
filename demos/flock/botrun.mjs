// Headless proof that every level can be won: node botrun.mjs [seeds] [levels]
import "./game.js";
const game = globalThis.__pogo;
const { LEVELS } = await import("./levels.js");
const { Bot } = await import("./bot.js");
const seeds = Number(process.argv[2] ?? 3), only = process.argv[3]?.split(",").map(Number);
let peakMs = 0, peakAvg = 0;
for (let i = 0; i < LEVELS.length; i++) {
    if (only && !only.includes(i + 1)) continue;
    const rows = [];
    for (let k = 1; k <= seeds; k++) {
        game.seed = k * 17 + i;
        game.restart("play", { level: i });
        const w = game.current.world, bot = new Bot(w, { seed: k });
        let steps = 0, total = 0, n = 0, slow = 0;
        const lim = 60 * (LEVELS[i].time + 8);
        while (!w.finished && steps < lim) {
            const c = bot.think();
            game.input.setStick(c.x, c.z);
            if (c.bark) game.input.press("bark", 1);
            const t = process.hrtime.bigint();
            game.step(1);
            const ms = Number(process.hrtime.bigint() - t) / 1e6;
            total += ms; n++; if (ms > slow) slow = ms; steps++;
        }
        game.input.setStick(0, 0);
        const r = w.result ?? { won: false, saved: w.saved, total: w.total, took: steps / 60, stars: 0 };
        peakMs = Math.max(peakMs, slow); peakAvg = Math.max(peakAvg, total / n);
        rows.push(`${r.won ? "WIN " : "lose"} ${r.saved}/${r.total} lost ${r.lost ?? 0} ${r.took.toFixed(0)}s ${"*".repeat(r.stars)}${" ".repeat(3 - r.stars)} ${(total / n).toFixed(3)}ms`);
    }
    const wins = rows.filter((r) => r.startsWith("WIN")).length, three = rows.filter((r) => r.includes("***")).length;
    const times = rows.filter((r) => r.startsWith("WIN")).map((r) => Number(/(\d+)s/.exec(r)[1])).sort((a, b) => a - b);
    console.log(`L${i + 1} ${LEVELS[i].name.padEnd(20)} need ${LEVELS[i].need} par ${LEVELS[i].par} dusk ${LEVELS[i].time}: wins ${wins}/${seeds}, 3-star ${three}, median ${times[times.length >> 1] ?? "-"}s, range ${times[0] ?? "-"}-${times[times.length - 1] ?? "-"}s`);
    if (process.env.VERBOSE) console.log("   " + rows.join("\n   "));
}
console.log(`peak avg ${peakAvg.toFixed(3)} ms/step, worst single step ${peakMs.toFixed(2)} ms`);
process.exit(0);
