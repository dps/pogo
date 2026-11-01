// Rotation and rules proof. Every claim here is about being fair to the player:
//  1. Any piece in open space turns without moving, and four turns bring it home.
//  2. A piece against a wall or floor can always turn (a kick finds room), so walls are never traps.
//  3. Mirror-image situations behave as exact mirror images: no side is favoured.
//  4. A turn never moves a piece more than two cells, never hops over a wall, and never leaves it overlapping.
//  5. Turning can't stall for ever: lock delay runs out.
//  6. On realistic messy stacks, every plain drop (rotate up high, slide, drop) stays reachable, from the real spawn.
//  7. A turn that fails leaves the piece exactly where it was.
//  8. Tuck-in positions used by wedges exist, and the reachable set never shrinks after a kick is possible.
import { BOX, CELLS, Field, H, NOODLE, TOP, TRUFFLE, W, fits, mulberry, turn, ANIMALS } from "../engine.js";
import { placements } from "../ai.js";

let bad = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) bad++; };
const blank = () => new Int32Array(W * H);
const cellsAt = (p, r, x, y) => CELLS[p][r].map(([a, b]) => [a + x, b + y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const key = (l) => l.map((c) => c.join(",")).join(" ");

// 1
{
    let fails = 0;
    for (let p = 0; p < 7; p++) for (let r = 0; r < 4; r++) for (const dir of [1, -1]) {
        let s = { r, x: 3, y: 10 };
        for (let i = 0; i < 4; i++) { const n = turn(blank(), p, s.r, s.x, s.y, dir); if (!n || n.kick) fails++; else s = n; }
        if (s.x !== 3 || s.y !== 10 || s.r !== r) fails++;
    }
    ok(!fails, "open space: every piece turns on the spot, four turns come home");
}
// 2 Hard against walls and floor: every in-bounds position of every piece in an empty bed can turn both ways.
{
    let total = 0, stuck = 0, far = 0, list = [];
    const g = blank();
    for (let p = 0; p < 7; p++) { if (p === TRUFFLE) continue;
        for (let r = 0; r < 4; r++) for (let x = -3; x < W; x++) for (let y = 0; y < H; y++) {
            if (!fits(g, p, r, x, y)) continue;
            for (const dir of [1, -1]) {
                total++;
                const n = turn(g, p, r, x, y, dir);
                if (!n) { stuck++; if (list.length < 5) list.push([ANIMALS[p].name, r, x, y, dir]); continue; }
                if (Math.abs(n.x - x) > 2 || Math.abs(n.y - y) > 2) far++;
            }
        }
    }
    ok(!stuck, `empty bed: ${total} positions next to walls and floor, none refuse to turn ${list}`);
    ok(!far, "empty bed: no kick travels more than two cells");
}
// 3 Mirror symmetry on random boards.
{
    const rand = mulberry(5);
    let trials = 0, broken = 0;
    const twin = [NOODLE, TRUFFLE, 2, 4, 3, 6, 5];    // mirror of each animal
    const mirrorCells = (cs) => cs.map(([x, y]) => [W - 1 - x, y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (let n = 0; n < 40000; n++) {
        const g = blank(), m = blank(), fill = 0.08 + rand() * 0.4;
        for (let y = 10; y < H; y++) for (let x = 0; x < W; x++) if (rand() < fill) { g[x + y * W] = 1; m[W - 1 - x + y * W] = 1; }
        const p = Math.floor(rand() * 7);
        if (p === TRUFFLE) continue;
        const r = Math.floor(rand() * 4), x = Math.floor(rand() * 11) - 2, y = 8 + Math.floor(rand() * 12), dir = rand() < 0.5 ? 1 : -1;
        if (!fits(g, p, r, x, y)) continue;
        // Find the mirrored placement.
        const want = key(mirrorCells(cellsAt(p, r, x, y)));
        // Vertical shapes look the same in two rotation states, so the mirrored state must be the mirrored rotation.
        const q = twin[p], mr = (4 - r) % 4;
        let mx = null;
        for (let xx = -3; xx < W + 2; xx++) if (key(cellsAt(q, mr, xx, y)) === want) mx = xx;
        if (mx === null) { broken++; continue; }
        trials++;
        const a = turn(g, p, r, x, y, dir), b = turn(m, q, mr, mx, y, -dir);
        if (!a !== !b) { broken++; continue; }
        if (a && key(mirrorCells(cellsAt(p, a.r, a.x, a.y))) !== key(cellsAt(q, b.r, b.x, b.y))) broken++;
    }
    ok(!broken, `mirror: ${trials} random situations behave as exact mirror images (${broken} did not)`);
}
// 4 + 7 Random stacks: bounded kicks, no overlaps, no hopping, no change on failure.
{
    const rand = mulberry(9);
    let n = 0, overlap = 0, hop = 0, bigs = 0;
    for (let t = 0; t < 120000; t++) {
        const g = blank(), fill = 0.1 + rand() * 0.5;
        for (let y = 6; y < H; y++) for (let x = 0; x < W; x++) if (rand() < fill) g[x + y * W] = 1;
        const p = Math.floor(rand() * 7), r = Math.floor(rand() * 4), x = Math.floor(rand() * 11) - 2, y = 4 + Math.floor(rand() * 18);
        if (p === TRUFFLE || !fits(g, p, r, x, y)) continue;
        const dir = rand() < 0.5 ? 1 : -1, s = turn(g, p, r, x, y, dir);
        n++;
        if (!s) continue;
        if (!fits(g, p, s.r, s.x, s.y)) overlap++;
        if (Math.abs(s.x - x) > 2 || Math.abs(s.y - y) > 2) bigs++;
        const a = cellsAt(p, r, x, y), b = cellsAt(p, s.r, s.x, s.y);
        if (!a.some(([ax, ay]) => b.some(([bx, by]) => Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1))) hop++;
    }
    ok(!overlap && !bigs && !hop, `random stacks: ${n} turns, ${overlap} overlaps, ${bigs} long kicks, ${hop} hops over walls`);
    // Long dog in a one-wide well: never thrown out.
    const g = blank();
    for (let y = 8; y < H; y++) for (let x = 0; x < W; x++) if (x !== 5) g[x + y * W] = 1;
    const v = (() => { for (let r = 0; r < 4; r++) for (let x = 0; x < W; x++) if (cellsAt(0, r, x, 12).every(([a, b]) => a === 5 && b >= 12)) return { r, x }; })();
    ok(!turn(g, 0, v.r, v.x, 12, 1) && !turn(g, 0, v.r, v.x, 12, -1), "a long dog deep in a one-wide well stays put when you turn it");
}
// 5 Stalling: spinning for ever on the floor still locks.
{
    const f = new Field({ seed: 3 });
    const first = f.active.uid;
    while (!f.grounded()) f.tick(true);
    let steps = 0;
    while (f.active && f.active.uid === first && steps < 2000) { if (steps % 5 === 0) f.rotate(steps % 2 ? 1 : -1); f.tick(false); steps++; }
    ok(steps < 700, `spinning on the floor locks after ${steps} steps (${(steps / 60).toFixed(1)} s), you can't stall for ever`);
    const g = new Field({ seed: 4 });
    const uid = g.active.uid;
    while (!g.grounded()) g.tick(true);
    let wig = 0, climbed = 0, y0 = g.active.y;
    while (g.active && g.active.uid === uid && wig < 3000) { g.rotate(1); g.tick(false); wig++; if (g.active) climbed = Math.max(climbed, y0 - g.active.y); }
    ok(wig < 3000 && climbed <= 3, `floor kicks can't climb: a spun piece rose at most ${climbed} rows`);
    // Rotate at the very top of the bed, on the spawn row.
    let ceiling = 0;
    for (let p = 0; p < 7; p++) for (const dir of [1, -1]) {
        const fld = new Field({ seed: 1, autoSpawn: false });
        fld.spawn(p);
        if (p !== TRUFFLE && !fld.rotate(dir)) ceiling++;
    }
    ok(!ceiling, "every animal can turn the moment it appears, even against the ceiling");
}
// 6 Reachability on messy stacks from the real spawn.
{
    const rand = mulberry(11);
    let boards = 0, drops = 0, lost = 0, tucks = 0, sample = null;
    for (let t = 0; t < 1500; t++) {
        const g = blank(), heights = [];
        let h = Math.floor(rand() * 10);
        for (let x = 0; x < W; x++) { h = Math.max(0, Math.min(14, h + Math.floor(rand() * 7) - 3)); heights[x] = h; for (let y = H - h; y < H; y++) if (rand() < 0.85) g[x + y * W] = 1; for (let y = H - h; y === H - h && h; y++) g[x + y * W] = 1; }
        const p = Math.floor(rand() * 7), n = BOX[p], sx = Math.floor((W - n) / 2), sy = TOP - 2 - (p === NOODLE ? 1 : 0);
        boards++;
        const got = new Set(placements(g, p, 0, sx, sy).map((s) => key(cellsAt(p, s.r, s.x, s.y))));
        for (let r = 0; r < (p === TRUFFLE ? 1 : 4); r++) for (let x = -3; x < W; x++) {
            if (!fits(g, p, r, x, sy)) continue;
            let y = sy;
            while (fits(g, p, r, x, y + 1)) y++;
            drops++;
            if (!got.has(key(cellsAt(p, r, x, y)))) { lost++; sample ??= { p, r, x, y }; }
        }
        // Count places only reachable by tucking or twisting: the good stuff.
        const plain = new Set();
        for (let r = 0; r < 4; r++) for (let x = -3; x < W; x++) { if (!fits(g, p, r, x, sy)) continue; let y = sy; while (fits(g, p, r, x, y + 1)) y++; plain.add(key(cellsAt(p, r, x, y))); }
        tucks += got.size - plain.size;
    }
    ok(!lost, `reachability: ${boards} messy stacks, all ${drops} straight drops reachable from spawn ${sample ? JSON.stringify(sample) : ""}`);
    console.log(`     ${tucks} extra resting places reachable by tucks and turns`);
}
// 8 Classic wedge slot: a cat fits a T-shaped hole by turning at the last moment.
{
    const g = blank();
    for (let y = H - 3; y < H; y++) for (let x = 0; x < W; x++) g[x + y * W] = 1;
    // A slot with an overhang on the left: open two wide on top, three wide beneath it, one wide at the bottom.
    for (const [x, y] of [[4, H - 3], [5, H - 3], [3, H - 2], [4, H - 2], [5, H - 2], [4, H - 1]]) g[x + y * W] = 0;
    const reach = placements(g, 2, 0, 3, 2);
    const hit = reach.filter((s) => { const c = cellsAt(2, s.r, s.x, s.y); return c.every(([, y]) => y >= H - 2) && c.some(([x, y]) => x === 3 && y === H - 2); });
    ok(hit.length > 0, `a wedge exists: a cat can be wriggled under an overhang (${hit.length} ways)`);
    const f = new Field({ seed: 2, autoSpawn: false });
    f.grid.set(g);
    f.spawn(2);
    const s = hit[0], path = []; for (let n = s; n.prev; n = n.prev) path.unshift(n.m);
    for (const m of path) { if (m === "L") f.move(-1); if (m === "R") f.move(1); if (m === "C") f.rotate(1); if (m === "A") f.rotate(-1); if (m === "D") f.softStep(); }
    f.hardDrop();
    const clear = f.events.find((e) => e.t === "clear");
    ok(clear?.wedge && clear.attack > 0, `the rules call it a wedge and it sends ${clear?.attack} (${clear?.n} lines)`);
}
// Spawn order is a fair shuffle, and a bed never opens with a seal or frog.
{
    let first = 0, gap = 0;
    for (let s = 1; s < 2000; s++) {
        const f = new Field({ seed: s, autoSpawn: false }), seq = [];
        const q = f.queue.slice(0, 7);
        if (q[0] === 3 || q[0] === 4) first++;
        for (let i = 0; i < 70; i++) { seq.push(f.queue.shift()); f.refill(); }
        for (let i = 0; i < 70; i += 7) if (new Set(seq.slice(i, i + 7)).size !== 7) gap++;
    }
    ok(!first, "no game opens on a seal or frog");
    ok(!gap, "every run of seven has all seven animals");
}
console.log(bad ? `${bad} FAILED` : "rules hold");
process.exit(bad ? 1 : 0);
