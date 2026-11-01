// Puzzle workbench. Starts from a shaped plot, mutates it, and keeps boards where the shortest solution is long, the wrong
// moves are many, and the named idea is provably needed. Output is raw material: tools/out/<spec>.json, for curating by hand.
// usage: node tools/forge.mjs <spec> <seconds> <seed>
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { E, parseLevel, newState, move, solved, DIR_LETTERS } from "../rules.js";
import { analyze, solve, planToMoves } from "../solver.js";
import { SPECS } from "./specs.mjs";

const [name, secs = "60", seedArg = "1"] = process.argv.slice(2);
const spec = SPECS[name];
if (!spec) { console.log("specs:", Object.keys(SPECS).join(" ")); process.exit(1); }
let seed = Number(seedArg) * 2654435761 >>> 0 || 1;
const R = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const ri = (n) => Math.floor(R() * n), pick = (a) => a[ri(a.length)];

const W = spec.w ?? 7, H = spec.h ?? 7, CELLS = spec.cells ?? ".,";
const SHAPES = [
    (x, y) => true,
    (x, y) => !((x < 2 && y < 2) || (x >= W - 2 && y >= H - 2)),
    (x, y) => !((x >= W - 2 && y < 2) || (x < 2 && y >= H - 2)),
    (x, y) => !(x < 2 && y < 2) && !(x >= W - 2 && y < 2),
    (x, y) => !(x < 2 && y >= H - 2) && !(x >= W - 2 && y >= H - 2),
    (x, y) => !((x === 0 || x === W - 1) && (y === 0 || y === H - 1)),
    (x, y) => !((x < 2 || x >= W - 2) && (y < 2 || y >= H - 2)),
];

function fresh() {
    const g = [], shape = pick(SHAPES), snowy = spec.snow ?? 0.35;
    for (let y = 0; y < H; y++) {
        g.push([]);
        for (let x = 0; x < W; x++) g[y].push(shape(x, y) ? (R() < snowy ? "," : ".") : " ");
    }
    const open = () => { for (;;) { const x = ri(W), y = ri(H); if (g[y][x] === "." || g[y][x] === ",") return [x, y]; } };
    for (let i = ri((spec.walls ?? 4) + 1); i > 0; i--) { const [x, y] = open(); g[y][x] = "#"; }
    for (const ch of spec.tiles ?? []) { const [x, y] = open(); g[y][x] = ch; }
    for (const ch of spec.strips ?? []) {
        let [x, y] = open(); const horiz = R() < 0.5, n = 2 + ri(3);
        for (let i = 0; i < n; i++) { if (g[y]?.[x] === "." || g[y]?.[x] === ",") g[y][x] = ch; if (horiz) x++; else y++; }
    }
    for (const b of spec.balls) { const [x, y] = open(); g[y][x] = b; }
    const [x, y] = open(); g[y][x] = "@";
    return g;
}

const BALL = "SML", clone = (g) => g.map((r) => r.slice());
function mutate(g0) {
    const g = clone(g0);
    for (let k = 1 + ri(3); k > 0; k--) {
        const x = ri(W), y = ri(H), c = g[y][x], op = R();
        if (c === " ") continue;
        if (op < 0.4) {
            if (c === ".") g[y][x] = ",";
            else if (c === ",") g[y][x] = ".";
        } else if (op < 0.75 && "SMLABC@".includes(c)) {
            const nx = x + ri(5) - 2, ny = y + ri(5) - 2;
            if (g[ny]?.[nx] === "." || g[ny]?.[nx] === ",") { g[ny][nx] = c; g[y][x] = "."; }
        } else if (op < 0.85) {
            if (c === "#") g[y][x] = R() < 0.5 ? "." : ",";
            else if ((c === "." || c === ",") && R() < 0.5) {
                let walls = 0;
                for (const r of g) for (const q of r) if (q === "#") walls++;
                if (walls < (spec.walls ?? 4)) g[y][x] = "#";
            }
        } else if ((spec.tiles || spec.strips) && (spec.tiles ?? spec.strips).join("").includes(c) || (spec.strips ?? []).includes(c)) {
            const nx = x + ri(3) - 1, ny = y + ri(3) - 1;
            if (g[ny]?.[nx] === "." || g[ny]?.[nx] === ",") { const t = g[ny][nx]; g[ny][nx] = c; g[y][x] = spec.strips?.includes(c) && R() < 0.3 ? "," : t; }
        } else if (spec.strips && (c === "." || c === ",") && R() < 0.4) g[y][x] = pick(spec.strips);
    }
    return g;
}

const rowsOf = (g) => g.map((r) => r.join("").replace(/\s+$/, ""));
const needMask = (spec.needs ?? []).map((n) => E[n]);

function evaluate(g) {
    const rows = rowsOf(g);
    let lvl;
    try { lvl = parseLevel({ id: "f", rows, need: spec.need ?? 1 }); } catch { return null; }
    const max = spec.max ?? 40000;
    const r = solve(lvl, { max });
    if (!r.solved) return null;
    if (r.pushes < (spec.min ?? 4)) return { score: r.pushes * 0.1 - 5, rows };
    // Count how often the solution changes hands: long straight shoves are dull, juggling is interesting.
    let switches = 0, st = newState(lvl), lastEnd = -1;
    const info = {};
    for (const [stand, d] of r.plan) {
        st.p = stand;
        const q = lvl.near[stand * 4 + d];
        move(lvl, st, d, info);
        if (q !== lastEnd) switches++;
        lastEnd = info.end;
    }
    for (const mask of needMask) {
        const k = solve(lvl, { forbid: mask, max: 150000 });
        if (k.solved || !k.exhausted) return { score: r.pushes * 0.2 + switches * 0.2 - 3, rows };
    }
    const a = analyze(lvl, max * 3);
    if (!a) return { score: r.pushes * 0.3 + switches * 0.3 - 1, rows };
    let walls = 0, cells = 0, seams = 0;
    const kind = (c) => (c === "~" ? 1 : c === "=" ? 2 : c === "," ? 3 : c === "#" ? 4 : 0);
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === "#") walls++;
        if (ch !== " ") cells++;
        if (ch === " ") continue;
        for (const n of [row[x + 1], rows[y + 1]?.[x]]) if (n !== undefined && n !== " " && kind(n) !== kind(ch) && kind(ch) * kind(n) !== 0) seams++;
        // Speckle is ugly and unreadable: count cells of terrain with no neighbour of their kind.
        if (kind(ch) && ![row[x + 1], row[x - 1], rows[y + 1]?.[x], rows[y - 1]?.[x]].some((n) => n !== undefined && kind(n) === kind(ch))) seams += 2;
    } });
    const over = Math.max(0, a.pushes - (spec.cap ?? 40));
    const score = a.pushes + switches * 2 + a.trap * 18 + a.forced * 8 + Math.min(a.deadShare * 6, 5) - walls * 0.3 - cells * 0.05 - over * 2 - seams * 0.7;
    return { score, rows, a, switches, ok: true, seams };
}

const BUCKETS = [[5, 8], [9, 12], [13, 17], [18, 24], [25, 34], [35, 99]], out = BUCKETS.map(() => new Map()), file = new URL(`./out/${name}.${seedArg}.json`, import.meta.url);
mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
const end = Date.now() + Number(secs) * 1000;
let tries = 0;
// Quality without length: how much of each moment is a real choice, how often the hands change.
const quality = (e) => e.a.trap * 10 + (e.switches / e.a.pushes) * 6 + e.a.forced * 3 - (e.rows.join("").match(/#/g)?.length ?? 0) * 0.15 - e.seams * 0.35;
function keep(e) {
    if (!e?.ok) return;
    const i = BUCKETS.findIndex(([a, b]) => e.a.pushes >= a && e.a.pushes <= b);
    if (i < 0) return;
    const m = out[i];
    m.set(e.rows.join("/"), e);
    if (m.size > 12) { const worst = [...m.entries()].sort((a, b) => quality(a[1]) - quality(b[1]))[0][0]; m.delete(worst); }
}
const flush = () => writeFileSync(file, JSON.stringify(out.flatMap((m) => [...m.values()]).map((b) => ({ score: +quality(b).toFixed(1), pushes: b.a.pushes, switches: b.switches, boards: b.a.boards, trap: +b.a.trap.toFixed(2), forced: +b.a.forced.toFixed(2), dead: +b.a.deadShare.toFixed(2), rows: b.rows }))));
while (Date.now() < end) {
    let cur = null, g = null;
    for (let i = 0; i < 300 && !cur; i++) { g = fresh(); cur = evaluate(g); tries++; }
    if (!cur) continue;
    let stale = 0;
    while (stale < (spec.patience ?? 180) && Date.now() < end) {
        const ng = mutate(g), e = evaluate(ng);
        tries++;
        keep(e);
        if (e && e.score >= cur.score) { if (e.score > cur.score) stale = 0; else stale++; g = ng; cur = e; } else stale++;
    }
    flush();
}
flush();
console.log(name, seedArg, "tries", tries, "kept", out.map((m) => m.size).join(","));
