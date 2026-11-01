// A dead board must be noticed, and the hint must rewind out of it to a board that can still be won.
import "../game.js";
const game = globalThis.__pogo;
game.restart("title"); game.step(3);
game.app.demo("a4", 0); game.step(10);
const P = game.play;
const key = (ch) => { P.tryMove("urdl".indexOf(ch)); for (let i = 0; i < 40 && P.busy; i++) game.step(1); };
// Shove the first ball against the top fence: it can never come back down to the corridor.
for (const ch of "ru") key(ch);
for (let i = 0; i < 400 && !P.dead; i++) game.step(1);
console.log("pushes", game.data.pushes, "dead", P.dead);
P.requestHint();
for (let i = 0; i < 300 && !P.hint; i++) game.step(1);
console.log("after hint pushes", game.data.pushes, "dead", P.dead, "hint", !!P.hint, "next", P.hint?.plan.length);
