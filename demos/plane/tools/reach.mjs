// Proves every letter's door and every stamp can really be reached: the pilot flies to each from the
// launch point, in the real scene with the real physics. A stamp's `via` waypoints are the secret path to it, and `from` starts at a height already proven
// reachable (the top of the bonfire's smoke, which the kite stamp proves).
import "../game.js";
import { Pilot } from "./pilot.mjs";
import { LETTERS, PEOPLE, STAMPS } from "../data.js";
import { ringOf, stampPos } from "../play.js";
import { clear, ground, touch } from "../world.js";
const game = globalThis.__pogo, planeArg = process.argv[2] ?? "postman", LIMIT = 60 * 240;
game.progress.plane = planeArg;
function flyTo(via, T, r, threaded, from, time = 1) {
    game.restart("fly", { mode: "free", time }); game.step(3);
    const G = game.sim, f = G.f, p = new Pilot(game); f.env.noCrash = false; G.st.stamps = [{ q: { id: "x" }, x: T[0], y: T[1], z: T[2], reach: 13, pull: 11 }];
    if (from) f.place(...from);
    const path = [...via, T]; let i = 0, n = 0;
    while (n < LIMIT) {
        const g = path[i], rr = i === path.length - 1 ? r : i === 0 ? 12 : 6;
        if (f.state === "fly") { if (threaded && (i > 0 || Math.hypot(g[0] - f.x, g[1] - f.y, g[2] - f.z) < 40)) p.thread(f, g); else p.steer(f, g, { margin: 1 }); } else { game.input.setStick(0, 0); if (i > 0 && f.state === "unfold") i = 0; }
        game.step(1); n++;
        if (f.state === "fly" && Math.hypot(g[0] - f.x, g[1] - f.y, g[2] - f.z) < rr) { if (++i >= path.length) return { ok: true, sec: n / 60, crashes: f.crashes }; }
    }
    return { ok: false, sec: n / 60, crashes: f.crashes, at: [f.x, f.y, f.z].map(Math.round), wp: i };
}
let bad = 0;
const row = (name, p, res) => { if (!res.ok) bad++; console.log(`${res.ok ? "ok  " : "FAIL"} ${name.padEnd(24)} [${p.map(Math.round)}]`.padEnd(52), `${res.sec.toFixed(1)}s, ${res.crashes} crumples`, res.ok ? "" : JSON.stringify(res)); };
const tasks = [];
for (const id of new Set(LETTERS.map((l) => l.to))) tasks.push([`letter to ${PEOPLE[id].name}`, ringOf(id), [], 8.5]);
for (const q of STAMPS) tasks.push([`stamp ${q.id}`, stampPos(q), q.via ?? [], 4.2, q.thread, q.from]);
const only = process.argv[3];
for (const [name, p, via, r, th, from] of tasks) {
    if (only && !name.includes(only)) continue;
    if (!clear(p[0], p[1], p[2], 1)) { console.log("BLOCKED", name, p, ground(p[0], p[2]), touch(p[0], p[1], p[2], 1)); bad++; }
    row(name, p, flyTo(via, p, r, th, from));
}
console.log(bad ? `${bad} problems` : "everything reachable");
process.exit(bad ? 1 : 0);
