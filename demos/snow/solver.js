// Exhaustive search over Snowplow boards. Nodes are boards plus the region the player can walk in, edges are pushes and
// pine shakes. Used by the checker (with no limit), and by the hint system in slices (see HintSearch).
import { E, DIR_LETTERS, boardKey, copyState, gateOpen, move, newState, reach, solved, walkPath, countSnowmen, BALLS, S, M, L, SNOW, PINE, DONE } from "./rules.js";

/**
 * Rough lower limit on what's left: enough balls must remain. It can only prune boards that truly cannot finish.
 */
export function hopeless(lvl, c) {
    let balls = 0, built = 0;
    for (const i of lvl.live) {
        const m = c[i] & BALLS;
        if (m === BALLS) built++;
        else balls += (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1);
    }
    return balls < (lvl.need - built) * 3;
}

const expand = (lvl, st, seen, fn) => {
    const info = {}, near = lvl.near;
    for (let i = 0; i < lvl.size; i++) {
        if (!seen[i]) continue;
        for (let d = 0; d < 4; d++) {
            const q = near[i * 4 + d];
            if (q < 0) continue;
            if (!(st.c[q] & BALLS) && lvl.tiles[q] !== PINE) continue;
            const next = { c: st.c.slice(), p: i };
            if (move(lvl, next, d, info)) fn(next, info.ev, i, d);
        }
    }
};

/**
 * Shortest number of pushes (a pine shake counts as a push). Stops at `max` boards; `forbid` is an event mask that may not
 * occur, which is how an idea is shown to be necessary. Returns { solved, exhausted, pushes, boards, plan }.
 * `plan` is a list of [standCell, dir] pairs.
 */
export function solve(lvl, o = {}) {
    const forbid = o.forbid ?? 0, max = o.max ?? 2e6, seen = new Uint8Array(lvl.size), stack = new Int32Array(lvl.size);
    const start = o.from ? copyState(o.from) : newState(lvl);
    const keyOf = (st) => boardKey(lvl, st.c) + String.fromCharCode(40 + reach(lvl, st, seen, stack));
    const nodes = [{ st: start, parent: -1, stand: 0, d: 0 }];
    const index = new Set([keyOf(start)]);
    let found = -1, depthEnd = 1, depth = 0;
    if (solved(lvl, start.c)) found = 0;
    for (let h = 0; h < nodes.length && found < 0; h++) {
        if (h === depthEnd) { depth++; depthEnd = nodes.length; }
        if (nodes.length > max) return { solved: false, exhausted: false, boards: nodes.length };
        const n = nodes[h];
        reach(lvl, n.st, seen, stack);
        const moves = [];
        expand(lvl, n.st, seen, (next, ev, stand, d) => { moves.push([next, ev, stand, d]); });
        for (const [next, ev, stand, d] of moves) {
            if (ev & forbid) continue;
            if (hopeless(lvl, next.c)) continue;
            const key = keyOf(next);
            if (index.has(key)) continue;
            index.add(key);
            nodes.push({ st: next, parent: h, stand, d });
            if (solved(lvl, next.c)) { found = nodes.length - 1; break; }
        }
    }
    if (found < 0) return { solved: false, exhausted: true, boards: nodes.length };
    const plan = [];
    for (let i = found; nodes[i].parent >= 0; i = nodes[i].parent) plan.unshift([nodes[i].stand, nodes[i].d]);
    return { solved: true, exhausted: false, pushes: plan.length, boards: nodes.length, plan };
}

/** Turn a push plan into every step, as a string of u r d l. Returns the string and proves the plan by replaying it. */
export function planToMoves(lvl, plan, from) {
    const st = from ? copyState(from) : newState(lvl);
    let out = "";
    for (const [stand, d] of plan) {
        const path = walkPath(lvl, st, stand);
        if (!path) throw new Error(`Plan cannot be walked in level ${lvl.id}`);
        for (const k of path) { out += DIR_LETTERS[k]; if (!move(lvl, st, k)) throw new Error("walk failed"); }
        out += DIR_LETTERS[d];
        if (!move(lvl, st, d)) throw new Error(`Plan push failed in level ${lvl.id}`);
    }
    if (!solved(lvl, st.c)) throw new Error(`Plan does not solve level ${lvl.id}`);
    return out;
}

/**
 * Fewest steps in all, walking included: Dijkstra over boards with the player's exact standing place after each push.
 * Returns { steps, moves } or null.
 */
export function shortestSteps(lvl, max = 3e6) {
    const size = lvl.size, seen = new Uint8Array(size), stack = new Int32Array(size);
    const start = newState(lvl), buckets = [[0]];
    const nodes = [{ st: start, dist: 0, parent: -1, stand: 0, d: 0 }];
    const best = new Map([[boardKey(lvl, start.c) + String.fromCharCode(40 + (start.p >> 6), 40 + (start.p & 63)), 0]]);
    const dist = new Int32Array(size), q = new Int32Array(size);
    for (let g = 0; g < buckets.length; g++) {
        const b = buckets[g];
        if (!b) continue;
        for (let h = 0; h < b.length; h++) {
            const n = nodes[b[h]];
            if (n.dist !== g) continue;
            if (solved(lvl, n.st.c)) {
                const plan = [];
                for (let i = b[h]; nodes[i].parent >= 0; i = nodes[i].parent) plan.unshift([nodes[i].stand, nodes[i].d]);
                return { steps: g, plan, moves: planToMoves(lvl, plan) };
            }
            if (nodes.length > max) return null;
            // Walking distances from exactly here.
            reach(lvl, n.st, seen, stack);
            dist.fill(-1); dist[n.st.p] = 0;
            let tail = 0; q[tail++] = n.st.p;
            for (let i = 0; i < tail; i++) for (let k = 0; k < 4; k++) {
                const m = lvl.near[q[i] * 4 + k];
                if (m >= 0 && seen[m] && dist[m] < 0) { dist[m] = dist[q[i]] + 1; q[tail++] = m; }
            }
            expand(lvl, n.st, seen, (next, ev, stand, d) => {
                if (hopeless(lvl, next.c)) return;
                const cost = g + dist[stand] + 1;
                const key = boardKey(lvl, next.c) + String.fromCharCode(40 + (next.p >> 6), 40 + (next.p & 63));
                const known = best.get(key);
                if (known !== undefined && nodes[known].dist <= cost) return;
                nodes.push({ st: next, dist: cost, parent: b[h], stand, d });
                best.set(key, nodes.length - 1);
                (buckets[cost] ??= []).push(nodes.length - 1);
            });
        }
    }
    return null;
}

/**
 * The whole graph of a level: every reachable board, which of them can still be won, how far each is from winning.
 * Slow, so the authoring tools use it; the game never does.
 */
export function analyze(lvl, max = 1.5e6) {
    const seen = new Uint8Array(lvl.size), stack = new Int32Array(lvl.size);
    const start = newState(lvl), ids = new Map();
    const keyOf = (st) => boardKey(lvl, st.c) + String.fromCharCode(40 + reach(lvl, st, seen, stack));
    ids.set(keyOf(start), 0);
    const nodes = [start], edges = [], goals = [];
    for (let h = 0; h < nodes.length; h++) {
        if (nodes.length > max) return null;
        const n = nodes[h], out = [];
        edges.push(out);
        if (solved(lvl, n.c)) { goals.push(h); continue; }
        reach(lvl, n, seen, stack);
        const moves = [];
        expand(lvl, n, seen, (next, ev) => moves.push(next));
        for (const next of moves) {
            if (hopeless(lvl, next.c)) continue;
            const key = keyOf(next);
            let id = ids.get(key);
            if (id === undefined) { id = nodes.length; ids.set(key, id); nodes.push(next); }
            out.push(id);
        }
    }
    const N = nodes.length, back = Array.from({ length: N }, () => []);
    let edgeCount = 0;
    edges.forEach((out, i) => { edgeCount += out.length; for (const j of out) back[j].push(i); });
    const toGoal = new Int32Array(N).fill(-1);
    let frontier = goals.slice();
    frontier.forEach((g) => { toGoal[g] = 0; });
    for (let d = 1; frontier.length; d++) {
        const nextF = [];
        for (const i of frontier) for (const j of back[i]) if (toGoal[j] < 0) { toGoal[j] = d; nextF.push(j); }
        frontier = nextF;
    }
    let alive = 0;
    for (let i = 0; i < N; i++) if (toGoal[i] >= 0) alive++;
    // Walk the shortest route(s), measuring how many choices each moment offers and how many are still good.
    let forced = 0, optionsSeen = 0, goodSeen = 0, onPath = 0;
    if (toGoal[0] >= 0) {
        let layer = new Set([0]);
        for (let d = toGoal[0]; d > 0; d--) {
            const nextL = new Set();
            for (const i of layer) {
                const opts = new Set(edges[i]);
                let good = 0, keep = 0;
                for (const j of opts) { if (toGoal[j] >= 0) good++; if (toGoal[j] === d - 1) { keep++; nextL.add(j); } }
                optionsSeen += opts.size; goodSeen += good; onPath++;
                if (good === 1) forced++;
            }
            layer = nextL;
        }
    }
    return { boards: N, edges: edgeCount, alive, deadShare: 1 - alive / N, pushes: toGoal[0], goals: goals.length, branching: edgeCount / N, trap: optionsSeen ? 1 - goodSeen / optionsSeen : 0, forced: onPath ? forced / onPath : 0, solvable: toGoal[0] >= 0 };
}

/** How often does a player who pushes at random win within `limit` pushes? A level beaten by flailing has no idea in it. */
export function randomWins(lvl, tries, limit, rng) {
    const seen = new Uint8Array(lvl.size), stack = new Int32Array(lvl.size);
    let wins = 0;
    for (let t = 0; t < tries; t++) {
        let st = newState(lvl);
        for (let k = 0; k < limit; k++) {
            reach(lvl, st, seen, stack);
            const opts = [];
            expand(lvl, st, seen, (next) => opts.push(next));
            if (!opts.length) break;
            st = opts[Math.floor(rng() * opts.length)];
            if (solved(lvl, st.c)) { wins++; break; }
        }
    }
    return wins / tries;
}

/**
 * The hint search: the same breadth-first walk, run a few hundred boards at a time so the game keeps its frame rate.
 * call step(budgetMs); when done is true, `plan` holds the pushes to the nearest win, or `dead` is true if none exists.
 * `known` is an optional map of boards on the stored solution: reaching one ends the search early.
 */
export class HintSearch {
    constructor(lvl, from, known, limit = 60000) {
        this.lvl = lvl; this.limit = limit; this.known = known;
        this.seen = new Uint8Array(lvl.size); this.stack = new Int32Array(lvl.size);
        const st = copyState(from);
        this.nodes = [{ st, parent: -1, stand: 0, d: 0 }];
        this.index = new Set([this.key(st)]);
        this.head = 0; this.done = false; this.plan = null; this.dead = false; this.join = null; this.gaveUp = false;
        if (solved(lvl, st.c)) this.finish(0);
        else if (known?.has(this.key(st))) this.finish(0, known.get(this.key(st)));
    }
    key(st) { return boardKey(this.lvl, st.c) + String.fromCharCode(40 + reach(this.lvl, st, this.seen, this.stack)); }
    finish(i, join = null) {
        const plan = [], nodes = this.nodes;
        for (; nodes[i].parent >= 0; i = nodes[i].parent) plan.unshift([nodes[i].stand, nodes[i].d]);
        this.plan = plan; this.join = join; this.done = true;
    }
    step(ms, clock = () => performance.now()) {
        const lvl = this.lvl, nodes = this.nodes, end = clock() + ms;
        while (!this.done) {
            if (this.head >= nodes.length) { this.dead = true; this.done = true; break; }
            if (nodes.length > this.limit) { this.gaveUp = true; this.done = true; break; }
            const n = nodes[this.head], h = this.head++;
            reach(lvl, n.st, this.seen, this.stack);
            const moves = [];
            expand(lvl, n.st, this.seen, (next, ev, stand, d) => moves.push([next, stand, d]));
            for (const [next, stand, d] of moves) {
                if (hopeless(lvl, next.c)) continue;
                const key = this.key(next);
                if (this.index.has(key)) continue;
                this.index.add(key);
                nodes.push({ st: next, parent: h, stand, d });
                if (solved(lvl, next.c)) { this.finish(nodes.length - 1); break; }
                const bk = this.known?.get(key);
                if (bk !== undefined) { this.finish(nodes.length - 1, bk); break; }
            }
            if ((this.head & 15) === 0 && clock() >= end) break;
        }
        return this.done;
    }
}
