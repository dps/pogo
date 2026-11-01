// A pretend human for the pure kitchen sim. One thumb means one thing at a time, so every move costs time.
import { Dice, Kitchen, TUNE, makeKit, menuFor } from "../sim.js";
import { RECIPES, TOPPINGS } from "../data.js";

export const SKILL = {
    // Reaction, gesture speed, how far off the pour lands, and how often a laid topping misses its mark.
    expert: { think: 0.14, move: 0.8, pourErr: 0.03, sloppy: 0.03, slowPull: 0.05 },
    good:   { think: 0.26, move: 1.0, pourErr: 0.055, sloppy: 0.14, slowPull: 0.18 },
    casual: { think: 0.48, move: 1.35, pourErr: 0.1, sloppy: 0.4, slowPull: 0.4 },
};

export function playShift(shift, own, skill, seed = 1, o = {}) {
    const S = SKILL[skill];
    const k = new Kitchen({ shift, kit: makeKit(shift, own, o.assist), menu: o.menu ?? menuFor(shift, own), seed });
    const dice = new Dice(seed * 7 + 3), dt = 1 / 60;
    let busy = 0, pour = null, limit = 600;
    const cost = (t) => { busy = (t * S.move + S.think * (0.7 + dice.next() * 0.6)); };
    const nearest = () => k.bowls.filter((b) => b.c && b.hold <= 0).sort((a, b) => a.c.id - b.c.id);

    const act = () => {
        for (let i = 0; i < k.bins.length; i++) if (k.bins[i].gull) { k.shoo(i); cost(0.28); return; }
        const ready = k.pots.find((p) => p.state === "cook" && (k.potPhase(p) === "perfect" || k.potPhase(p) === "soft" || k.potPhase(p) === "mush") && k.bowlForPot(p));
        if (ready) {
            if (k.potPhase(ready) === "mush") { k.dump(ready.i); cost(0.3); return; }
            if (dice.next() > S.slowPull || k.potPhase(ready) !== "perfect") { k.pull(ready.i); cost(0.42); return; }
        }
        const full = k.bowls.find((b) => k.complete(b));
        if (full) { k.serve(full.i); cost(0.32); return; }
        for (const p of k.pots) if (p.state === "empty" && k.needNoodles().length) { k.dropNoodle(p.i); cost(0.24); return; }
        const list = nearest();
        for (const b of list) if (b.level < TUNE.pour.okLo) {
            pour = { b: b.i, stop: 0.97 - 0.09 + (dice.next() - 0.5) * 2 * S.pourErr * 1.6 };
            k.takeLadle(RECIPES[b.c.recipe].broth); k.aimLadle(b.i); cost(0.3);
            return;
        }
        for (const b of list) for (const id of RECIPES[b.c.recipe].tops) if (b.tops[id] === undefined) {
            const i = k.bins.findIndex((x) => x.id === id);
            if (k.bins[i].stock <= 0) { k.chop(i); cost(0.2); return; }
            const hurry = b.c.patience / b.c.max < 0.3;
            const neat = !hurry && dice.next() > S.sloppy;
            k.place(i, b.i, neat); cost(hurry ? 0.24 : 0.4);
            return;
        }
        const low = k.bins.findIndex((b) => TOPPINGS[b.id].sliced && b.stock < 3);
        if (low >= 0) { k.chop(low); cost(0.2); }
    };

    while (!k.done && k.time < limit) {
        k.step(dt);
        k.events.length = 0;
        if (pour) {
            const b = k.bowls[pour.b];
            if (b.level >= pour.stop || !k.ladle || k.ladle.fill <= 0) { k.aimLadle(-1); k.putLadle(); pour = null; cost(0.1); }
            continue;
        }
        busy -= dt;
        if (busy <= 0) act();
    }
    return k;
}
