// Hint test: from a random mid-game board, repeatedly take the hint, and the level must finish. From dead boards, the hint must rewind.
import { parseLevel, newState, solved, move, placeKey, DIR_LETTERS, copyState } from "../rules.js";
import { HintSearch } from "../solver.js";
import { LEVELS } from "../levels.js";
import { SOLUTIONS } from "../solutions.js";
let ok = 0, dead = 0, gaveUp = 0, worst = 0;
for (const def of LEVELS) {
    const lvl = parseLevel(def), known = new Map(), st0 = newState(lvl); const plan = [];
    known.set(placeKey(lvl, st0), { i: 0 });
    for (const ch of SOLUTIONS[def.id].moves) { const stand = st0.p, d = DIR_LETTERS.indexOf(ch), info = move(lvl, st0, d); if (info.kind !== "walk") { plan.push([stand, d]); known.set(placeKey(lvl, st0), { i: plan.length }); } }
    for (let t = 0; t < 8; t++) {
        const st = newState(lvl);
        for (let k = 0; k < 12; k++) move(lvl, st, Math.floor(Math.random() * 4));
        if (solved(lvl, st.c)) continue;
        const h = new HintSearch(lvl, st, known, 90000), t0 = performance.now();
        while (!h.step(5));
        worst = Math.max(worst, performance.now() - t0);
        if (h.dead) dead++; else if (h.gaveUp) gaveUp++; else {
            const s2 = copyState(st);
            let p = h.plan.concat(h.join ? plan.slice(h.join.i) : []);
            for (const [stand, d] of p) { s2.p = stand; if (!move(lvl, s2, d)) throw new Error(`hint plan blocked in ${def.id}`); }
            if (!solved(lvl, s2.c)) throw new Error(`hint plan did not win ${def.id}`);
            ok++;
        }
    }
}
console.log({ ok, dead, gaveUp, worstMs: Math.round(worst) });
