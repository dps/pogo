// Takes a rough board and removes everything that isn't doing a job: spare snow, spare scenery, spare ground.
// A change stays only if the level is not shorter, keeps every named idea, and still has a good share of wrong turns.
import { E, parseLevel } from "../rules.js";
import { analyze, solve } from "../solver.js";

const grid = (rows) => { const w = Math.max(...rows.map((r) => r.length)); return rows.map((r) => r.padEnd(w, " ").split("")); };
const out = (g) => g.map((r) => r.join("").replace(/\s+$/, ""));
const measure = (rows, need, needs, max) => {
    let lvl;
    try { lvl = parseLevel({ id: "p", rows, need }); } catch { return null; }
    const r = solve(lvl, { max });
    if (!r.solved) return null;
    for (const n of needs) { const k = solve(lvl, { forbid: E[n], max }); if (k.solved || !k.exhausted) return null; }
    return r;
};
/** Is this a shape worth drawing? One piece, no holes, no one-tile whiskers. */
function tidy(g) {
    const h = g.length, w = g[0].length, land = (x, y) => (g[y]?.[x] ?? " ") !== " ";
    let start = null, count = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (land(x, y)) { count++; start ??= [x, y]; }
    if (!start) return false;
    const seen = new Set([start.join()]), q = [start];
    while (q.length) { const [x, y] = q.pop(); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = `${x + a},${y + b}`; if (land(x + a, y + b) && !seen.has(k)) { seen.add(k); q.push([x + a, y + b]); } } }
    if (seen.size !== count) return false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (land(x, y)) {
            let n = 0;
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (land(x + a, y + b)) n++;
            if (n < 2) return false;
        } else {
            // A void with land on both sides along a line is a notch or a hole.
            if ((land(x - 1, y) && land(x + 1, y)) || (land(x, y - 1) && land(x, y + 1))) return false;
        }
    }
    return true;
}

export function polish(rows0, need = 1, needs = [], max = 90000) {
    let g = grid(rows0), base = measure(out(g), need, needs, max);
    if (!base) return null;
    const target = base.pushes, slack = target < 14 ? 1 : 3;
    let now = target;
    const attempt = (y, x, ch) => {
        const keep = g[y][x];
        g[y][x] = ch;
        const m = measure(out(g), need, needs, max);
        // Tidying must not quietly turn a gentle level into a hard one.
        if (m && m.pushes >= target && m.pushes <= target + slack) { now = m.pushes; return true; }
        g[y][x] = keep;
        return false;
    };
    let changed = true;
    for (let pass = 0; pass < 3 && changed; pass++) {
        changed = false;
        for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) {
            const c = g[y][x];
            if (c === "," || c === "#" || c === "~" || c === "^" || c === "=" || c === "T") { if (attempt(y, x, ".")) changed = true; }
        }
        // Ground nothing needs can go, as long as it trims the edge rather than holing the plot.
        for (let y = 0; y < g.length; y++) for (let x = 0; x < g[y].length; x++) {
            if (g[y][x] !== "." && g[y][x] !== "#") continue;
            const edge = [[0, 1], [1, 0], [0, -1], [-1, 0]].some(([a, b]) => (g[y + a]?.[x + b] ?? " ") === " ");
            if (!edge) continue;
            const keep = g[y][x];
            g[y][x] = " ";
            const fine = tidy(g);
            g[y][x] = keep;
            if (fine && attempt(y, x, " ")) changed = true;
        }
    }
    // Drop empty rows and columns.
    while (g.length && g[0].every((c) => c === " ")) g.shift();
    while (g.length && g[g.length - 1].every((c) => c === " ")) g.pop();
    while (g.every((r) => r[0] === " ")) g.forEach((r) => r.shift());
    while (g.every((r) => r[r.length - 1] === " ")) g.forEach((r) => r.pop());
    return { rows: out(g), pushes: now };
}
