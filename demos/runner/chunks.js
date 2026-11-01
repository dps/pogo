// Patterns are short, readable rows. Each row has three lanes, near lane left. Rows are one beat apart, so a pattern
// keeps the same feel at any speed. Generation only joins chunks with a clear tail, so a chunk that can be passed from
// any lane in any state keeps the whole endless road passable. tools/passable.mjs proves that with the real player code.
import { BIOMES, DISGUISE_IDS, FINALE_CLEAR, ROUTE, beatAt, biomeIndex, levelAt, speedAt } from "./data.js";

// Row letters: . clear, j hurdle (hard, jump it), c clutter (soft, stumble), s overhead (hard, slide under),
// B tall block (hard, change lane), L long tall block that runs on to the next row, v an oncoming block.
export const CHUNKS = [
    // Tier 1: one idea at a time.
    { id: "pillar", tier: 1, rows: [".B."] },
    { id: "side", tier: 1, rows: ["B.."] },
    { id: "pinch", tier: 1, rows: ["B.B"] },
    { id: "hay", tier: 1, rows: [".c."] },
    { id: "hay2", tier: 1, rows: ["c.c"] },
    { id: "hurdle1", tier: 1, rows: [".j."] },
    { id: "hurdles", tier: 1, rows: ["jjj"] },
    { id: "limbo1", tier: 1, rows: [".s."] },
    { id: "limbos", tier: 1, rows: ["sss"] },
    { id: "swerve", tier: 1, rows: ["B..", "...", "..B"] },
    { id: "cattle", tier: 1, rows: ["c.c", "...", ".c."] },
    // Tier 2: two ideas, with room.
    { id: "wall2", tier: 2, rows: ["BB."] },
    { id: "stairs", tier: 2, rows: ["BB.", "...", ".BB"] },
    { id: "hopduck", tier: 2, rows: ["jjj", "...", "sss"] },
    { id: "choice", tier: 2, rows: ["j.s"] },
    { id: "gate", tier: 2, rows: ["BjB"] },
    { id: "arch", tier: 2, rows: ["BsB"] },
    { id: "corridor", tier: 2, rows: ["L.L", "L.L", "..."] },
    { id: "alley", tier: 2, rows: ["L.c", "L.c"] },
    { id: "pair", tier: 2, rows: [".j.", "c.c"] },
    { id: "double", tier: 2, rows: ["jjj", "jjj"] },
    // Tier 3: two beats in a row, three verbs.
    { id: "slalom", tier: 3, rows: ["B.B", ".B.", "B.B"] },
    { id: "verbs", tier: 3, rows: ["jBs"] },
    { id: "tunneljump", tier: 3, rows: ["LjL", "L.L"] },
    { id: "tunnelduck", tier: 3, rows: ["L.L", "LsL"] },
    { id: "quick", tier: 3, rows: ["jjj", "sss"] },
    { id: "cross", tier: 3, rows: ["BB.", ".BB"] },
    { id: "hopline", tier: 3, rows: ["jjj", "B.B"] },
    { id: "duckline", tier: 3, rows: ["sss", ".B."] },
    { id: "oncoming", tier: 3, rows: ["v..", ".v.", "..v"] },
    { id: "headon", tier: 3, rows: ["v.v", "...", ".v."] },
    { id: "lorries", tier: 3, rows: ["L.L", "L.L", "...", ".L.", ".L."] },
    // Tier 4: the top of the curve. Tight, still one clear line.
    { id: "ladder", tier: 4, rows: ["jBB", "BBj"] },
    { id: "limbotrap", tier: 4, rows: ["sBB", "B.B", "BBs"] },
    { id: "gauntlet", tier: 4, rows: ["LjL", "LsL", "LjL"] },
    { id: "zigzag", tier: 4, rows: ["BB.", "B.B", ".BB", "B.B"] },
    { id: "triple", tier: 4, rows: ["jjj", "sss", "jjj"] },
    { id: "choices", tier: 4, rows: ["jBs", "sBj"] },
    { id: "rushhour", tier: 4, rows: ["v.v", "v.v"] },
    { id: "chicane", tier: 4, rows: ["L.L", "L.L", "BjB", "...", ".BB"] },
];

const mirror = (rows) => rows.map((r) => [...r].reverse().join(""));
/** Every chunk and its mirror image, which is what the generator can really emit. */
export const ALL_CHUNKS = CHUNKS.flatMap((c) => {
    const m = mirror(c.rows);
    return m.join() === c.rows.join() ? [c] : [c, { ...c, id: c.id + "~", rows: m }];
});

/** Small, seedable, and independent of the framework so sims can run anywhere. */
export function makeRng(seed) {
    let s = seed >>> 0;
    const next = () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return { next, int: (a, b) => a + Math.floor(next() * (b - a + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)] };
}

const tierWeights = (l) => [Math.max(0, 1.3 - l * 2.4), l < 0.08 ? 0 : 0.5 + l * 0.5, l < 0.3 ? 0 : (l - 0.25) * 2.4, l < 0.62 ? 0 : (l - 0.58) * 4.5];
const BLOCKED = "BLv";

/** Row by row, the lane that needs the fewest moves. Eggs lay this line, so following them is always safe. */
function safeLine(rows, entry) {
    const n = rows.length, cost = rows.map(() => [1e9, 1e9, 1e9]), from = rows.map(() => [0, 0, 0]);
    for (let l = 0; l < 3; l++) if (!BLOCKED.includes(rows[0][l])) cost[0][l] = Math.abs(l - entry) * 1.5 + (rows[0][l] === "c" ? 3 : 0);
    for (let r = 1; r < n; r++) for (let l = 0; l < 3; l++) {
        if (BLOCKED.includes(rows[r][l])) continue;
        for (let p = 0; p < 3; p++) {
            // Sliding sideways past a tall block is fine only if the lanes between are open on the row we leave.
            if (Math.abs(p - l) === 2 && BLOCKED.includes(rows[r - 1][1]) && BLOCKED.includes(rows[r][1])) continue;
            const c = cost[r - 1][p] + Math.abs(p - l) * 1.5 + (rows[r][l] === "c" ? 3 : 0);
            if (c < cost[r][l]) { cost[r][l] = c; from[r][l] = p; }
        }
    }
    let lane = 0;
    for (let l = 1; l < 3; l++) if (cost[n - 1][l] < cost[n - 1][lane]) lane = l;
    const line = [];
    for (let r = n - 1; r >= 0; r--) { line[r] = lane; lane = from[r][lane]; }
    return line;
}

export class Generator {
    constructor(seed, start = 0, lapStart = 0) {
        this.rng = makeRng(seed);
        this.at = start;                // Next free metre, in run distance.
        this.lapStart = lapStart;
        this.lane = 1;
        this.sinceRest = 0;
        this.nextDisguise = start + 230;
        this.bag = [];
        this.last = "";
        this.id = 0;
        this.log = [];
        this.script = [];
    }
    pickDisguise() {
        if (!this.bag.length) {
            const a = [...DISGUISE_IDS];
            for (let i = a.length - 1; i > 0; i--) { const j = this.rng.int(0, i), t = a[i]; a[i] = a[j]; a[j] = t; }
            // The first anyone sees is the joke that sells the game.
            if (this.at < 500) { a.splice(a.indexOf("moustache"), 1); a.unshift("moustache"); }
            this.bag = a;
        }
        return this.bag.shift();
    }
    choose(d) {
        const l = levelAt(d), w = tierWeights(l), pool = [];
        let total = 0;
        for (const c of ALL_CHUNKS) {
            if (c.id.replace("~", "") === this.last) continue;
            const v = w[c.tier - 1];
            if (v <= 0) continue;
            total += v; pool.push([c, v]);
        }
        let r = this.rng.next() * total;
        for (const [c, v] of pool) { r -= v; if (r <= 0) return c; }
        return pool[pool.length - 1][0];
    }
    /** Emit chunks into the run until the road is planned past `until`. */
    fill(run, until) {
        while (this.at < until) {
            const lap = this.at - this.lapStart;
            // The rocket stretch and each biome's gate stay clear.
            if (lap >= ROUTE - FINALE_CLEAR) { this.bonus(run, 40); continue; }
            const next = BIOMES.find((b) => b.start > lap);
            const toGate = next ? next.start - lap : 1e9;
            const prev = [...BIOMES].reverse().find((b) => b.start <= lap);
            if (prev.start > 0 && lap - prev.start < 24) { this.at += 24; continue; }
            if (this.script.length) { this.emit(run, this.script.shift()); continue; }
            const d = this.at, beat = beatAt(d), v = speedAt(d), rowGap = beat * v;
            if (toGate < rowGap * 7) { this.bonus(run, Math.max(10, toGate + 26)); continue; }
            const l = levelAt(d);
            const restEvery = 2 + Math.floor(l * 3);
            if (this.sinceRest >= restEvery && this.rng.next() < 0.75) { this.sinceRest = 0; this.bonus(run, rowGap * (2.2 - l * 0.8)); continue; }
            const c = this.choose(d);
            this.last = c.id.replace("~", "");
            this.sinceRest++;
            this.emit(run, c);
        }
    }
    /** A clear stretch with a lazy curl of eggs. Rests matter: they're what make the patterns readable. */
    bonus(run, len) {
        const v = speedAt(this.at), count = Math.floor(len / (v * 0.1));
        const lane = this.lane;
        for (let i = 2; i < Math.min(count, 24); i++) if (i % 2 === 0) run.addEgg(this.at + i * v * 0.1, lane, 0);
        this.at += len;
        this.dropDisguise(run, this.at - len * 0.5, lane);
    }
    dropDisguise(run, d, lane) {
        if (d < this.nextDisguise) return;
        this.nextDisguise = d + 300 + this.rng.int(0, 180);
        run.addPickup(d, lane, this.pickDisguise());
    }
    emit(run, chunk) {
        const d0 = this.at, beat = beatAt(d0), v = speedAt(d0), gap = beat * v;
        const line = safeLine(chunk.rows, this.lane);
        const rows = chunk.rows;
        this.log.push({ id: chunk.id, tier: chunk.tier, d: d0, beat, v, n: rows.length });
        if (chunk.hint) run.hints.push({ d: d0, need: chunk.hint, done: false });
        for (let r = 0; r < rows.length; r++) {
            const rd = d0 + r * gap;
            for (let l = 0; l < 3; l++) {
                const k = rows[r][l];
                if (k === ".") continue;
                if (k === "L") {
                    if (r > 0 && rows[r - 1][l] === "L") continue;     // Only the first row of a run makes the block.
                    let n = 1; while (r + n < rows.length && rows[r + n][l] === "L") n++;
                    run.addObstacle(rd, l, "L", (n - 1) * gap + gap * 0.55);
                } else if (k === "v") {
                    // Oncoming: starts further away and closes twice as fast, arriving exactly on its row.
                    run.addObstacle(rd, l, "v", 3.2);
                } else run.addObstacle(rd, l, k, k === "B" ? 2 : 1.3);
            }
            this.lay(run, rows, r, rd, gap, line[r], r + 1 < rows.length ? line[r + 1] : line[r]);
        }
        this.lane = line[rows.length - 1];
        this.at = d0 + (rows.length - 1) * gap + gap * 1.5 + (rows.some((row) => row.includes("L")) ? gap * 0.5 : 0);
        this.dropDisguise(run, this.at - gap * 0.75, this.lane);
    }
    lay(run, rows, r, rd, gap, lane, nextLane) {
        const k = rows[r][lane];
        // Eggs hop over hurdles and dip under bars, so the trail shows the move as well as the lane.
        if (k === "j" || k === "c") for (const [t, y] of [[-0.14, 1.9], [0, 2.5], [0.14, 1.9]]) run.addEgg(rd + t * gap, lane, y);
        else run.addEgg(rd, lane, 0);
        if (nextLane === lane) for (const t of [0.3, 0.55, 0.8]) if (r + 1 < rows.length || t < 0.6) run.addEgg(rd + t * gap, lane, 0);
    }
}
