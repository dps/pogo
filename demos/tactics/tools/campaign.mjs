// Plays the campaign through the real scenes: the solver picks actions, the game's own input functions carry them out.
// Upgrades are bought the way a player would. Proves: every battle can be finished in order, in the actual game.
import "../game.js";
import { MISSIONS, unlockedAt } from "../missions.js";
import { solve } from "../solver.js";
import { loadMeta, saveMeta, buildSquad, buyUpgrade, defaultSquad, openNodes } from "../meta.js";
import { PIGEONS } from "../data.js";
const game = globalThis.__pogo;
game.restart("title");
game.step(5);
const prefer = ["sarge","doris","gale","lunch","vinnie","plume","kevin","quack"];
const LEVELS = [[3,2,3],[8,3,6],[16,4,12],[30,6,20]];
let total = 0, stars = 0;
const pump = (n, f) => { for (let i = 0; i < n && !(f && f()); i++) game.step(1); };
const only = process.argv[2] ? +process.argv[2] : MISSIONS.length;
for (const m of MISSIONS.slice(0, only)) {
    const meta = loadMeta(game);
    if (!openNodes(meta).has(m.id)) { console.log("not open", m.id); process.exit(1); }
    const keys = prefer.filter((k) => meta.roster[k]).slice(0, m.squad);
    const squad = buildSquad(meta, keys);
    game.go("battle", { mission: m, squad });
    game.step(30);
    const Q = globalThis.__squad;
    pump(60, () => Q.G.phase === "player" || (game.input.tap(180, 300), false));
    let plan = null;
    for (const [width, keep, roots] of LEVELS) { const r = solve(Q.st, { width, keep, roots, tune: { noDamage: true } }); if (r.win) { plan = r; break; } }
    if (!plan) { console.log("UNSOLVED", m.id, keys); process.exit(1); }
    let steps = 0;
    for (const turn of plan.plan) {
        for (const a of turn) {
            const wait = () => pump(600, () => Q.G.phase === "player" || Q.G.phase === "over");
            wait();
            if (Q.G.phase === "over") break;
            const u = Q.st.units.find((q) => q.id === a.id);
            if (!u || u.hp <= 0) continue;
            if (a.mv) { Q.doMove(u, a.mv[0], a.mv[1]); wait(); if (Q.G.phase === "over") break; }
            const v = Q.st.units.find((q) => q.id === a.id);
            if (a.act) { Q.doAct(v, a.act[0], a.act[1]); wait(); }
            else if (!a.mv) { Q.select(v.id); Q.waitUnit(); }
        }
        pump(600, () => Q.G.phase === "player" || Q.G.phase === "over");
        if (Q.G.phase === "over") break;
        Q.G.endArmed = 1; Q.pressEnd();
        pump(2400, () => Q.G.phase === "player" || Q.G.phase === "over");
        steps++;
    }
    pump(120);
    const r = Q.G.result;
    if (!r?.won) { console.log("LOST in real game", m.id, Q.st.why, Q.st.round, Q.G.phase); process.exit(1); }
    const after = loadMeta(game);
    // Spend seeds, cheapest useful first.
    for (const k of prefer) if (after.roster[k]) for (const u of [...PIGEONS[k].ups].sort((a,b)=>a.cost-b.cost)) buyUpgrade(after, k, u.id);
    saveMeta(game, after);
    const sc = r.stars.filter(Boolean).length; stars += sc; total++;
    console.log(m.id.padEnd(4), "stars", sc, "rounds", Q.st.round + "/" + m.rounds, "seeds", after.seeds, "squad", keys.join(","));
}
console.log(`campaign complete: ${total} battles, ${stars}/${total*3} stars`, game.state().haptics?.length ?? 0);
