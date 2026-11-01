// Flies each time trial with the pilot through the real scene, for each plane, and reports medal-relevant times.
import "../game.js";
import { Pilot } from "./pilot.mjs";
import { PLANES, TRIALS } from "../data.js";
const game = globalThis.__pogo;
game.progress.ch = 9; game.progress.planes = PLANES.map((p) => p.id);
for (const T of TRIALS.filter((t) => !process.argv[3] || t.id === process.argv[3])) for (const id of (process.argv[2] ?? "postman,dart,longwing,swallow,crane").split(",")) {
    game.progress.plane = id; game.progress.best = {};
    game.restart("fly", { mode: "trial", trial: T.id }); game.step(2);
    const G = game.sim, f = G.f, p = new Pilot(game); let n = 0; const tr = G.trial, LIM = 60 * 300;
    while (n < LIM && !tr.done) { if (G.phase === "fly" && f.state === "fly") { const h = G.st.rings[tr.i]; if (process.argv[4]) p.thread(f, [h.x, h.y, h.z]); else p.steer(f, [h.x, h.y, h.z], { margin: 0, noLift: true }); } game.step(1); n++; }
    console.log(T.id.padEnd(9), id.padEnd(9), tr.done ? `${tr.t.toFixed(1)}s` : `DNF at hoop ${tr.i}`, `crumples ${f.crashes}`, "medals", T.times.join("/"));
}
process.exit(0);
