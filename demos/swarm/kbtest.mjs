// Plays by keyboard actions only, on a desktop screen, to prove nothing needs touch.
import "./game.js";
const game = globalThis.__pogo, D = globalThis.__deep;
game.resize("desktop");
game.input.touchMode = false;
game.restart("title");
game.step(5);
game.input.press("confirm", 2);
game.step(40);
console.log("scene after Enter on title:", game.currentName);
let picks = 0, pausedOk = false;
for (let i = 0; i < 60 * 900 && game.currentName === "play"; i++) {
    const R = D.R;
    if (R.cards.length) {
        if (R.cardT > 0.35) {
            if (picks % 3 === 0) { game.input.press("right", 2); game.step(3); game.input.press("confirm", 2); }
            else game.input.press("card" + (picks % 3 + 1), 2);
            picks++;
            game.step(3);
        } else game.step(1);
        continue;
    }
    if (i === 300) { game.input.press("pause", 2); game.step(3); pausedOk = game.current.paused; game.input.press("pause", 2); game.step(3); console.log("pause toggled:", pausedOk, "resumed:", !game.current.paused); }
    const a = ["left", "up", "right", "down"][Math.floor(i / 50) % 4];
    game.input.press(a, 2);
    game.step(1);
}
console.log("finished in", game.currentName, "time", game.data.time, "level", game.data.level, "picks", picks, "weapons", JSON.stringify(game.data.weapons));
game.step(120);
console.log("scene:", game.currentName, "result:", JSON.stringify(game.data.result));
game.input.press("confirm", 2); game.step(60);
console.log("retry by Enter:", game.currentName);
console.log("best saved:", JSON.stringify(game.load("deep-trouble-v1", null)));
process.exit(0);
