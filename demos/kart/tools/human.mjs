// Drives through the real input path with digital left/right and the drift key, like a keyboard player with
// a reaction lag. Compares never drifting with drifting: drifting must pay, and not drifting must still finish.
import "../game.js";
const game = globalThis.__pogo;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function run(track, drift, cls = "basket") {
    game.restart("race", { track, mode: "tt", cls, racer: "pip" });
    const W = game.sim, k = W.player, T = W.T;
    k.item = null; k.ttDrinks = 0;
    let steps = 0, walls = 0, holding = 0;
    const push = k.events.push.bind(k.events);
    k.events.push = (e) => { if (e[0] === "wall") walls++; return push(e); };
    while (game.currentName === "race" && steps < 60 * 240) {
        if (W.phase === "race" && steps % 5 === 0) {
            const i = T.wrap(k.i + 8), p = T.point(i, T.line[i] * 0.6);
            const err = wrap(Math.atan2(-(p[0] - k.x), -(p[2] - k.z)) - (k.driftDir ? Math.atan2(-k.vx, -k.vz) : k.yaw));
            if (err > 0.06) game.input.press("left", 5); else if (err < -0.06) game.input.press("right", 5);
            let bend = 0; for (let n = 2; n < 20; n += 3) bend += T.curv[T.wrap(k.i + n)]; bend /= 6;
            if (drift) {
                const dir = -Math.sign(bend);
                if (Math.abs(bend) > 0.014 && Math.abs(k.d) < T.hw[k.i]) {
                    if (k.driftDir === dir || (!k.driftDir && k.steer * dir > 0.2)) game.input.press("drift", 5);
                } else if (k.driftDir && Math.abs(bend) > 0.007 && -Math.sign(bend) === k.driftDir && Math.abs(k.d) < T.hw[k.i]) game.input.press("drift", 5);
            }
        }
        game.step(1); steps++;
    }
    return { t: W.t, lap: k.bestLap, walls, boosts: W.stats.boosts, done: game.currentName !== "race" };
}
for (const t of ["aisle", "freezer", "bakery", "garden", "dock", "rooftop"]) {
    const a = run(t, false), b = run(t, true);
    console.log(t.padEnd(8), `no drift ${a.t.toFixed(1)}s walls ${a.walls} done ${a.done}`.padEnd(38), `drift ${b.t.toFixed(1)}s walls ${b.walls} boosts ${b.boosts} done ${b.done}`);
}
process.exit(0);
