// Rivals play by the same rules and the same rotation code as you, one key at a time, so what you see on their board
// is a real game. Brain finds every placement reachable with real moves, scores them, then "presses" the moves.
import { BOX, CELLS, H, TRUFFLE, W, fits, kindOf, mulberry, turn } from "./engine.js";

const key = (x, y, r) => ((x + 3) + (y + 4) * 16) * 4 + r;

/** Every resting place reachable from the piece's position, with the moves to get there. */
export function placements(grid, p, r0, x0, y0) {
    const seen = new Map(), out = [], queue = [{ x: x0, y: y0, r: r0, prev: null, m: "" }];
    seen.set(key(x0, y0, r0), true);
    for (let i = 0; i < queue.length; i++) {
        const s = queue[i], { x, y, r } = s;
        const push = (nx, ny, nr, m) => {
            const k = key(nx, ny, nr);
            if (seen.has(k)) return;
            seen.set(k, true);
            queue.push({ x: nx, y: ny, r: nr, prev: s, m });
        };
        if (fits(grid, p, r, x - 1, y)) push(x - 1, y, r, "L");
        if (fits(grid, p, r, x + 1, y)) push(x + 1, y, r, "R");
        if (p !== TRUFFLE) {
            const a = turn(grid, p, r, x, y, 1); if (a) push(a.x, a.y, a.r, "C");
            const b = turn(grid, p, r, x, y, -1); if (b) push(b.x, b.y, b.r, "A");
        }
        if (fits(grid, p, r, x, y + 1)) push(x, y + 1, r, "D");
        else out.push(s);
    }
    return out;
}
export const pathOf = (s) => { const m = []; for (let n = s; n.prev; n = n.prev) m.push(n.m); return m.reverse(); };

/** Fast option for lookahead: straight drops only. */
function drops(grid, p, cb) {
    for (let r = 0; r < (p === TRUFFLE ? 1 : 4); r++) for (let x = -2; x < W; x++) {
        if (!fits(grid, p, r, x, 0)) continue;
        let y = 0;
        while (fits(grid, p, r, x, y + 1)) y++;
        cb(r, x, y);
    }
}

/** Occupancy copy of a grid. */
export const occupy = (grid) => { const o = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) o[i] = grid[i] ? 1 : 0; return o; };

/** Place and clear. Returns { grid, lines, eroded, height } with a fresh grid. */
function place(g, p, r, x, y) {
    const n = g.slice(), cs = CELLS[p][r];
    let top = H;
    for (const [cx, cy] of cs) { const yy = y + cy; if (yy >= 0) n[x + cx + yy * W] = 2; if (yy < top) top = yy; }
    let lines = 0, eroded = 0;
    for (let row = 0; row < H; row++) {
        let full = true, mine = 0;
        for (let c = 0; c < W; c++) { const v = n[c + row * W]; if (!v) { full = false; break; } if (v === 2) mine++; }
        if (full) {
            lines++; eroded += mine;
            n.copyWithin(W, 0, row * W);
            n.fill(0, 0, W);
        }
    }
    for (let i = 0; i < W * H; i++) if (n[i] === 2) n[i] = 1;
    return { grid: n, lines, eroded, land: H - top };
}

const heights = new Int32Array(W);
/** How comfortable a bed is. Larger is better. */
function comfort(g, b) {
    let holes = 0, rowT = 0, colT = 0, wells = 0, bump = 0, maxH = 0, covered = 0;
    for (let x = 0; x < W; x++) {
        let h = 0, seen = false, roof = 0;
        for (let y = 0; y < H; y++) {
            const v = g[x + y * W];
            if (v) { if (!seen) { h = H - y; seen = true; } roof++; }
            else if (seen) { holes++; covered += Math.min(roof, 3); }
            if (y > 0 && !!g[x + (y - 1) * W] !== !!v) colT++;
        }
        heights[x] = h;
        if (h > maxH) maxH = h;
    }
    for (let y = 2; y < H; y++) {
        let prev = 1;
        for (let x = 0; x < W; x++) { const v = g[x + y * W] ? 1 : 0; if (v !== prev) rowT++; prev = v; }
        if (!prev) rowT++;
    }
    let deepest = 0, deepX = -1;
    for (let x = 0; x < W; x++) {
        const l = x ? heights[x - 1] : 99, r = x < W - 1 ? heights[x + 1] : 99, d = Math.min(l, r) - heights[x];
        if (d > 0) { wells += d * (d + 1) / 2; if (d > deepest) { deepest = d; deepX = x; } }
        if (x) bump += Math.abs(heights[x] - heights[x - 1]);
    }
    const danger = Math.max(0, maxH - b.safe);
    let score = -rowT * 3.2 - colT * 9.3 - holes * 8 - covered * 3 - wells * (3.4 - b.greed * 2.4) - bump * 0.6 - danger * danger * 6;
    // A deliberate single well at the wall is how quads happen.
    if (b.greed && (deepX === 0 || deepX === W - 1) && deepest >= 3) score += b.greed * 14 * Math.min(deepest, 5);
    return score;
}

const DEFAULTS = { pps: 1, noise: 0, look: 0, greed: 0, slip: 0, hold: 1, safe: 12, hands: 3 };

/** One player. Call step(field) each 60 Hz step, before field.tick. */
export class Brain {
    constructor(o = {}, seed = 1) {
        this.o = { ...DEFAULTS, ...o };
        this.rand = mulberry(seed * 977 + 13);
        this.plan = null;
        this.uid = -1;
        this.wait = 0;
        this.handT = 0;
        this.clock = 0;
    }

    gauss() { return (this.rand() + this.rand() + this.rand() + this.rand() - 2) * 1.2; }

    /** Best move for this piece, considering the next one if this rival looks ahead. */
    best(f, p) {
        const a = f.active, o = this.o, g = occupy(f.grid), next = f.queue[0];
        const spawnR = 0, cands = p === a.p ? placements(f.grid, p, a.r, a.x, a.y) : placements(f.grid, p, spawnR, Math.floor((W - BOX[p]) / 2), a.y);
        const bias = { ...o, safe: f.pending() > 2 ? Math.min(o.safe, 8) : o.safe };
        let best = null, bestV = -1e12;
        for (const c of cands) {
            const r = place(g, p, c.r, c.x, c.y);
            let v = -r.land * 4.5 + (r.lines ? r.eroded * r.lines * 3.4 : 0);
            // A greedy rival saves up for a quad, and sulks at small clears.
            if (o.greed) { if (r.lines === 4) v += 90 * o.greed; else if (r.lines) v -= (22 - r.lines * 4) * o.greed; }
            if (o.look) {
                let top = -1e12;
                drops(r.grid, next, (nr, nx, ny) => {
                    const q = place(r.grid, next, nr, nx, ny), w = comfort(q.grid, bias) + (q.lines ? q.eroded * q.lines * 3.4 : 0) - q.land * 4.5;
                    if (w > top) top = w;
                });
                v += top;
            } else v += comfort(r.grid, bias);
            v += this.gauss() * o.noise;
            if (v > bestV) { bestV = v; best = c; }
        }
        return best ? { node: best, v: bestV } : null;
    }

    think(f) {
        const a = f.active, o = this.o;
        let pick = this.best(f, a.p), hold = false;
        if (o.hold && f.canHold) {
            const other = f.holdPiece >= 0 ? f.holdPiece : f.queue[0];
            if (other !== a.p) { const alt = this.best(f, other); if (alt && (!pick || alt.v > pick.v + 8)) { hold = true; pick = alt; } }
        }
        this.plan = hold ? ["H"] : (pick ? pathOf(pick.node) : []);
        this.replan = hold;
        // Trailing soft moves are pointless: the drop handles them.
        while (this.plan.length && this.plan[this.plan.length - 1] === "D") this.plan.pop();
        if (!hold && this.rand() < o.slip && this.plan.length) this.plan.push(this.rand() < 0.5 ? "L" : "R");
        // Pieces arrive in a steady rhythm, with a little humanity.
        const beat = 60 / o.pps;
        this.wait = Math.max(this.plan.length * o.hands + 2, beat * (0.75 + this.rand() * 0.5));
        this.handT = Math.max(0, this.wait * 0.3 - 8);
    }

    step(f) {
        if (f.dead || !f.active) { this.uid = -1; return; }
        if (f.active.uid !== this.uid) { this.uid = f.active.uid; this.think(f); }
        if (this.handT > 0) this.handT--;
        else if (this.plan.length) {
            this.handT = this.o.hands - 1;
            const m = this.plan.shift();
            if (m === "L") f.move(-1);
            else if (m === "R") f.move(1);
            else if (m === "C") f.rotate(1);
            else if (m === "A") f.rotate(-1);
            else if (m === "D") f.softStep();
            else if (m === "H") { f.hold(); this.uid = -1; return; }
        }
        this.wait--;
        if (this.wait <= 0 && !this.plan.length) f.hardDrop();
    }
}

/** Reads a grid for tests. */
export const rows = (grid) => { const out = []; for (let y = 0; y < H; y++) { let s = ""; for (let x = 0; x < W; x++) s += grid[x + y * W] ? "#0123456789"[Math.min(10, kindOf(grid[x + y * W]))] : "."; out.push(s); } return out.join("\n"); };
