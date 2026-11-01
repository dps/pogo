// Plays every sound and song once, and lists the feel of the two headline haptics.
import "../game.js";
import { SONGS } from "../audio.js";
const game = globalThis.__pogo, S = game.app.sound;
game.restart("title"); game.step(2);
S.step(1, true); game.step(30); const crunch = game.state().haptics?.slice?.(-1);
S.plop(); game.haptic([12, 45, 28]); game.step(30); const plop = game.state().haptics?.slice?.(-1);
for (const m of ["push", "grow", "stack", "win", "thud", "bump", "undo", "restart", "shake", "melt", "shrink", "fill", "gate", "hint", "unlock", "tap"]) { S[m]({}, false); game.step(4); }
for (const n of Object.keys(SONGS)) { S.current = null; S.play(n); game.step(10); const t = SONGS[n].tracks.map((x) => x.notes.split(" ").length); if (new Set(t).size !== 1) console.log("uneven", n, t); }
console.log("ok", JSON.stringify({ crunch, plop }), "errors", game.errors?.length ?? 0);
