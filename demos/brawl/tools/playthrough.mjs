// The real game, headless, end to end: title button, every stage through the real input path, report cards, the ending, saves.
// A bot thumbs keys and the stick; it sees only the sim, as a player sees the screen. node tools/playthrough.mjs [skill]
import "../game.js";
import { Bot, SKILLS } from "./bot.mjs";
import { BTN, STAGES } from "../data.js";
const game = globalThis.__pogo, skill = process.argv[2] ?? "casual";
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
game.restart("title");
game.step(10);
ok(game.currentName === "title", "boots to the title");
game.input.press("confirm", 2); game.step(6);
let steps = 0; const t0 = Date.now(), log = [];
const until = (fn, n, what) => { for (let i = 0; i < n; i++) { if (fn()) return true; game.step(1); steps++; } console.log("timed out waiting for", what, game.currentName); return false; };
ok(until(() => game.currentName === "play", 120, "first stage"), "RIOT reaches stage 1 in " + steps + " steps");
const BUT = [["atk", BTN.A], ["hvy", BTN.H], ["jmp", BTN.J], ["spc", BTN.S], ["ddg", BTN.G], ["tag", BTN.T]];
const seen = new Set(), hap = new Set(); let done = false, fails = 0;
const realPlay = game.haptics.play.bind(game.haptics); for (const f of game.state().haptics) hap.add(f);
while (!done && steps < 60 * 60 * 40) {
    const n = game.currentName;
    if (n === "play") {
        const P = game.play, sim = P.sim;
        if (!P.bot || P.bot.s !== sim) { P.bot = new Bot(sim, SKILLS[skill], sim.stageIdx + 3); P.tk = -1; seen.add(sim.stageIdx); }
        if (sim.tick !== P.tk && !sim.over) {
            P.tk = sim.tick;
            const m = P.bot.step();
            game.input.setStick((m & BTN.R ? 1 : 0) - (m & BTN.L ? 1 : 0), (m & BTN.D ? 1 : 0) - (m & BTN.U ? 1 : 0));
            for (const [a, b] of BUT) if (m & b) game.input.press(a, 1);
        }
        game.step(1); steps++;
        if (steps % 30 === 0) for (const f of game.state().haptics) hap.add(f);
    } else if (n === "result") {
        game.step(70); steps += 70;
        const d = game.data; log.push(`${STAGES[game.currentArgs.stage].id} ${d.win ? "won " + d.letter : "lost"} score ${game.currentArgs.score}`);
        if (!d.win) fails++;
        game.input.press("confirm", 2); game.step(40); steps += 40;
    } else if (n === "ending") { done = true; }
    else { game.step(1); steps++; }
}
console.log(log.join("\n"));
ok(done, `reached the ending in ${(steps / 3600).toFixed(1)} game minutes, ${fails} retries, ${Date.now() - t0} ms`);
ok(seen.size === 6, `played ${seen.size} stages through the real input path`);
ok(hap.size >= 4, `haptics fired by name: ${[...hap].join(" ")}`);
const k = globalThis.__kit.save;
ok(k.cleared && k.reached === 5, `save records the win: reached ${k.reached}, cleared ${k.cleared}, grades ${JSON.stringify(k.grades)}`);

// Score attack: one stage, then the board.
game.go("select", { mode: "score" }); game.step(30);
ok(game.currentName === "select", "score attack list opens");
game.go("load", { stage: 2, mode: "score", seed: 3 }); game.step(10);
{
    let n = 0; const P = game.play, sim = P.sim, b = new Bot(sim, SKILLS.good, 5); let tk = -1;
    while (game.currentName === "play" && n++ < 60 * 60 * 8) {
        if (sim.tick !== tk && !sim.over) { tk = sim.tick; const m = b.step(); game.input.setStick((m & BTN.R ? 1 : 0) - (m & BTN.L ? 1 : 0), (m & BTN.D ? 1 : 0) - (m & BTN.U ? 1 : 0)); for (const [a, bit] of BUT) if (m & bit) game.input.press(a, 1); }
        game.step(1);
    }
    game.step(60);
    ok(game.currentName === "result" && k.scores.gym > 0, `score attack finishes and files a score: ${k.scores.gym}, grade ${game.data.letter}`);
}
