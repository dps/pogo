// Finale boards: takes a finished puzzle and stands a lantern ring on the bare cell that makes it hardest, within a limit.
// usage: node tools/plinth.mjs '<rows json>' need maxPushes
import { parseLevel, GROUND, SNOW, BALLS } from "../rules.js";
import { solve } from "../solver.js";
export function plinthize(rows, need, cap) {
    let best = null;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
        if (rows[y][x] !== ".") continue;
        const r2 = rows.map((r, j) => (j === y ? r.slice(0, x) + "*" + r.slice(x + 1) : r));
        const lvl = parseLevel({ id: "x", rows: r2, need });
        const a = solve(lvl, { max: 150000 });
        if (a.solved && a.pushes <= cap && (!best || a.pushes > best.pushes)) best = { rows: r2, pushes: a.pushes };
    }
    return best;
}
if (process.argv[2]) console.log(plinthize(JSON.parse(process.argv[2]), +process.argv[3] || 1, +process.argv[4] || 30));
