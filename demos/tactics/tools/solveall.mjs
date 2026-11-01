// Prove every campaign battle: unlocked default squad, no upgrades. Prints difficulty metrics.
import { MISSIONS, unlockedAt } from "../missions.js";
import { newBattle } from "../sim.js";
import { solve, randomPlay } from "../solver.js";
const only = process.argv[2];
const prefer = ["sarge","doris","gale","lunch","vinnie","plume","kevin","quack"];
process.stdout.write("");
const widths = [[1,1,1],[2,1,2],[3,2,3],[6,3,6],[12,4,10],[24,6,16],[40,8,30]];
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
let solved=0; const rows = [];
for (const m of MISSIONS) {
    if (only && !m.id.startsWith(only)) continue;
    const un = unlockedAt(m.index), squad = prefer.filter((k) => un.includes(k)).slice(0, m.squad).map((k) => ({ k, up: {} }));
    const t0 = Date.now();
    const s = newBattle(m, squad);
    let lvl = -1, res = null;
    for (let i = 0; i < widths.length; i++) {
        const [width, keep, roots] = widths[i];
        const r = solve(s, { width, keep, roots });
        if (r.win) { lvl = i; res = r; break; }
    }
    const naive = solve(s, { width: 1, keep: 1, roots: 1, tune: { blind: true } }).win;
    let sl = 0; const SN = 40, sloppy = [];
    for (const noise of [25, 60]) { let w = 0; for (let i = 0; i < SN; i++) if (solve(s, { width: 1, keep: 1, roots: 1, tune: { noise, rng } }).win) w++; sloppy.push(String(Math.round(100 * w / SN)).padStart(3)); }
    let rw = 0; const RN = 100;
    for (let i = 0; i < RN; i++) if (randomPlay(s, rng)) rw++;
    if (lvl >= 0) solved++;
    rows.push({ zone: m.zone, careful: +sloppy[0], sloppy: +sloppy[1], lvl });
    console.log(m.id.padEnd(4), m.win.padEnd(8), "think", String(lvl).padStart(2), "rand%", String(rw).padStart(3), naive ? "naive-W" : "naive-L", "careful%", sloppy[0], "sloppy%", sloppy[1], res ? `rounds ${res.state.round}/${m.rounds} lost ${res.state.stats.lost} dmg ${res.state.stats.damage} acts ${res.plan.flat().length}` : "UNSOLVED", (Date.now()-t0)+"ms");
}
console.log("solved", solved, "of", MISSIONS.length);
if (!only) {
    const zones = {}; for (const r of rows) (zones[r.zone] ??= []).push(r);
    for (const [z, l] of Object.entries(zones)) console.log(z.padEnd(10), "careful", Math.round(l.reduce((a, r) => a + r.careful, 0) / l.length), "sloppy", Math.round(l.reduce((a, r) => a + r.sloppy, 0) / l.length), "think", (l.reduce((a, r) => a + r.lvl, 0) / l.length).toFixed(1));
    const rank = (a) => { const s = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), o = []; s.forEach(([, i], r) => { o[i] = r; }); return o; };
    const x = rows.map((_, i) => i), y = rank(rows.map((r) => -(r.careful + r.sloppy) / 2)), n = x.length, d = x.reduce((a, v, i) => a + (v - y[i]) ** 2, 0);
    console.log("spearman (battle order vs difficulty):", (1 - (6 * d) / (n * (n * n - 1))).toFixed(2));
}
