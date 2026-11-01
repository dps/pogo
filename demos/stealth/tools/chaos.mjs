// Proves the other rank. A loud, reckless bot sprints from vase to vase, smashing the par for the heist, grabs the fish and legs it.
// It reacts to nothing and tries again from a new order if it gets grabbed, so a human with eyes has an easier time than this.
import { Sim, RUN_AT } from "../sim.js";
import { HEISTS } from "../levels.js";
import { HIGH, T, flagXY } from "../world.js";
import { distField, graph } from "./solve.mjs";

const CELL = 16;
function attempt(def, G, order, slink) {
    const s = new Sim(def), w = s.world, cw = G.cw, cellOf = () => Math.floor(s.cat.y / CELL) * cw + Math.floor(s.cat.x / CELL);
    const xy = (c) => [((c % cw) + 0.5) * CELL, (Math.floor(c / cw) + 0.5) * CELL];
    const goalsFor = (it) => {
        const out = [];
        for (let c = 0; c < cw * G.ch; c++) {
            if (!G.edges[c].length) continue;
            const [x, y] = xy(c), d = Math.hypot(x - it.x, y - it.y), perch = !!(flagXY(w, x, y) & 4), high = !!(flagXY(w, it.x, it.y) & HIGH);
            if (perch ? d < 36 : !high && d < 30) out.push(c);
        }
        return out;
    };
    const plans = [];
    for (const i of order.slice(0, def.chaos ?? 3)) plans.push({ item: s.items[i], field: distField(G, goalsFor(s.items[i])) });
    const tile = (p) => { const c = p.c * 2, r = p.r * 2; return [r * cw + c, r * cw + c + 1, (r + 1) * cw + c, (r + 1) * cw + c + 1]; };
    plans.push({ fish: true, field: distField(G, tile(w.target)) });
    plans.push({ exit: true, field: distField(G, [Math.floor(w.start.y / CELL) * cw + Math.floor(w.start.x / CELL)]) });
    let p = 0, n = 0, hold = 0;
    while (s.status === "play" && n++ < 60 * 150) {
        let goal = plans[p], inp = {};
        const c = s.cat;
        if (goal?.item && goal.item.state !== "still") { p++; goal = plans[p]; }
        if (goal?.fish && c.fish) { p++; goal = plans[p]; }
        if (["ground", "perch", "box"].includes(c.mode) && goal) {
            const here = cellOf(), f = goal.field;
            if (goal.item && f[here] === 0 && !hold) {
                const ctx = s.context();
                if (ctx?.type === "knock" && s.items[ctx.item] === goal.item) inp = { act: true };
                else if (ctx?.type === "knock") inp = { act: true };
                else { p++; }
            } else {
                let best = null;
                for (const e of G.edges[here]) if (f[e.to] + e.s < (best ? f[best.to] + best.s : 1e9)) best = e;
                const pow = slink ? 0.7 : 1;
                if (best?.kind === "vent") inp = { act: true };
                else if (best?.kind === "leap") inp = { mx: best.dx * 0.7, my: best.dy * 0.7 };
                else if (best) { const [x, y] = xy(best.to), dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1; inp = { mx: dx / d * pow, my: dy / d * pow }; }
                else { const dx = (xy(here)[0] - c.x), dy = (xy(here)[1] - c.y); inp = { mx: dx * 0.1, my: dy * 0.1 }; }
            }
        }
        hold = Math.max(0, hold - 1);
        s.step(inp); s.events.length = 0;
    }
    return s;
}
void RUN_AT; void T;
let bad = 0;
console.log("heist                     smashed/par  chases  tries  time");
for (const def of HEISTS) {
    const G = graph(def), probe = new Sim(def), idx = probe.items.map((_, i) => i);
    let found = null, tries = 0;
    outer: for (let k = 0; k < 160; k++) {
        const order = idx.slice();
        for (let i = order.length - 1; i > 0; i--) { const j = (k * 7 + i * 13) % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
        for (const slink of [false, true]) {
            tries++;
            const s = attempt(def, G, order, slink);
            if (s.status === "won" && s.stats.smashed >= (def.chaos ?? 3)) { found = s; break outer; }
        }
    }
    const name = `${String(HEISTS.indexOf(def) + 1).padStart(2)} ${def.title}`.padEnd(25);
    if (found) console.log(`${name} ${found.stats.smashed}/${def.chaos}          ${String(found.stats.chases).padStart(3)}   ${String(tries).padStart(3)}   ${found.t.toFixed(0)}s  ${found.grade().style}`);
    else { bad++; console.log(`${name} NOT ACHIEVED (par ${def.chaos}, ${probe.items.length} items)`); }
}
console.log(bad ? `${bad} heists without a chaos run` : "CHAOS RANK ACHIEVED ON EVERY HEIST");
process.exit(bad ? 1 : 0);
