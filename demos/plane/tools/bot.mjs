// Plays the whole story through the real scene, input and physics, from the title to the last letter, and reports
// how long each chapter takes, how many crumples, and every haptic style it felt.
import "../game.js";
import { Pilot } from "./pilot.mjs";
import { CHAPTERS, LETTERS } from "../data.js";
import { available, ringOf } from "../play.js";
const game = globalThis.__pogo, verbose = process.argv.includes("-v");
game.wipe(); game.opts.comfort = process.argv.includes("comfort"); game.restart("fly", { mode: "title" }); game.step(10);
game.sim.startFlight();
let steps = 0, chapterStart = 0; const report = [], perLetter = [];
const pilot = new Pilot(game), MAX = 60 * 60 * (+process.argv[2] || 60);
const tapMid = () => { const v = game.current.view; game.input.tap(v.width / 2, v.height / 2); };
let crumples = 0, stalls = 0, targetSince = 0, lastDone = 0, tried = null;
while (steps < MAX) {
    const G = game.sim, sc = game.currentName;
    if (sc === "fold") { if (!G.done) { if (steps % 40 === 0) tapMid(); } else if (steps % 30 === 0) game.input.press("confirm", 2); game.step(1); steps++; continue; }
    if (G.phase === "ending") {
        if (G.hud.card && G.hud.card.t > 0.6) tapMid();
    } else if (G.phase === "read") {
        if (G.hud.card && G.hud.card.t > 0.6) tapMid();
    } else if (G.phase === "fly") {
        const f = G.f, P = game.progress, a = G.st.rings;
        if (game.progress.done.length !== lastDone) { const now = steps / 60; perLetter.push([P.done[P.done.length - 1], +(now - targetSince).toFixed(1)]); targetSince = now; lastDone = P.done.length; if (verbose) console.log(P.done[P.done.length - 1], perLetter.at(-1)[1], "s"); }
        if (!a.length) { game.step(1); steps++; continue; }
        if (!a.includes(tried)) tried = a.reduce((b, r) => (Math.hypot(r.x - f.x, r.z - f.z) < Math.hypot(b.x - f.x, b.z - f.z) ? r : b), a[0]);
        const g = tried;
        if (f.state === "fly") pilot.steer(f, [g.x, g.y, g.z]); else game.input.setStick(0, 0);
        if (f.crashes > crumples) { crumples = f.crashes; }
    }
    if (game.currentName === "title" || (game.currentName === "fly" && game.sim.mode === "title" && game.progress.finished)) break;
    game.step(1); steps++; if (verbose && steps % 1800 === 0) { const q = game.sim; console.log(steps / 60, game.currentName, q.phase, q.mode, tried?.l?.to, tried?.x|0, tried?.y|0, tried?.z|0, pilot.lift?.x|0, q.f?.x?.toFixed(0), q.f?.y?.toFixed(0), q.f?.z?.toFixed(0), q.f?.state, q.st?.rings?.length); }
    if (game.sim?.f) { crumplesTotal(game.sim.f); }
}
function crumplesTotal(f) { if (f !== crumplesTotal.f) { crumplesTotal.f = f; crumplesTotal.base = 0; crumplesTotal.sum = (crumplesTotal.sum ?? 0) + (crumplesTotal.last ?? 0); } crumplesTotal.last = f.crashes; }
const P = game.progress;
console.log(`letters ${P.done.length}/${LETTERS.length}  chapter ${P.ch}  finished ${P.finished}  planes ${P.planes.join(",")}  time ${(steps / 60 / 60).toFixed(1)} min  crumples ${(crumplesTotal.sum ?? 0) + (crumplesTotal.last ?? 0)}`);
const worst = [...perLetter].sort((a, b) => b[1] - a[1]).slice(0, 6); console.log("slowest", JSON.stringify(worst));
console.log("haptics", JSON.stringify(game.state().haptics).slice(0, 200));
process.exit(P.finished ? 0 : 1);
