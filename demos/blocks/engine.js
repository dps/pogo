// The rules of Stack Attack, free of any rendering, so bots can play thousands of games and prove them fair.
// One Field is one bed: a 10 by 24 grid of which the top four rows are out of sight, with one grumpy animal falling.
// Everything runs in fixed 60 Hz steps and takes its randomness from its own seed.

export const W = 10, H = 24, TOP = 4, VIS = H - TOP;
// Kinds of cell. 1 to 7 are the seven animals, then sheep (garbage) and eggs.
export const NOODLE = 0, TRUFFLE = 1, MARMALADE = 2, BLUB = 3, MOSS = 4, HONK = 5, MUD = 6, SHEEP = 7, EGG = 8;
export const ANIMALS = [
    { key: "noodle", name: "Noodle", kind: "dachshund", moan: "HMPH" },
    { key: "truffle", name: "Truffle", kind: "pig", moan: "OINK" },
    { key: "marmalade", name: "Marmalade", kind: "cat", moan: "MRRF" },
    { key: "blub", name: "Blub", kind: "seal", moan: "ARF" },
    { key: "moss", name: "Moss", kind: "frog", moan: "URP" },
    { key: "honk", name: "Honk", kind: "goose", moan: "HONK" },
    { key: "mud", name: "Mud", kind: "hippo", moan: "OOF" },
];
const SHAPES = [
    ["....", "####", "....", "...."],
    ["##", "##"],
    [".#.", "###", "..."],
    [".##", "##.", "..."],
    ["##.", ".##", "..."],
    ["#..", "###", "..."],
    ["..#", "###", "..."],
];
export const BOX = SHAPES.map((s) => s.length);
/** CELLS[piece][rotation] is a list of [x, y] inside the piece's box. */
export const CELLS = SHAPES.map((rows) => {
    const n = rows.length, base = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") base.push([x, y]); }));
    const out = [base];
    for (let r = 1; r < 4; r++) out.push(out[r - 1].map(([x, y]) => [n - 1 - y, x]));
    return out;
});

// Bits of a stored cell: kind 0-15, join mask 4 bits (right, down, left, up), head flag, then a piece id.
export const RIGHT = 1, DOWN = 2, LEFT = 4, UP = 8;
export const kindOf = (c) => c & 15, maskOf = (c) => (c >> 4) & 15, isHead = (c) => (c >> 8) & 1, uidOf = (c) => c >>> 9;
const pack = (kind, mask, head, uid) => kind | mask << 4 | head << 8 | uid << 9;

/** Small, fast, seedable. */
export function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const fits = (grid, p, r, x, y) => {
    const cs = CELLS[p][r];
    for (let i = 0; i < 4; i++) {
        const cx = x + cs[i][0], cy = y + cs[i][1];
        if (cx < 0 || cx >= W || cy >= H) return false;
        if (cy >= 0 && grid[cx + cy * W]) return false;
    }
    return true;
};

/** Were these two placements touching? A rotation may never hop over a wall to a separate spot. */
function touching(p, r0, x0, y0, r1, x1, y1) {
    const a = CELLS[p][r0].map(([x, y]) => [x + x0, y + y0]), b = CELLS[p][r1].map(([x, y]) => [x + x1, y + y1]);
    for (const [ax, ay] of a) for (const [bx, by] of b) if (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1) return true;
    return false;
}

/**
 * Rotation with nudges. Not a table of magic offsets: the piece is pushed away from whatever it hit. If the turned
 * piece fits, done. Otherwise work out which side the clash is on and try: away from it, away and down (a tuck),
 * the other way, down, up, up and sideways, and for the long dog two cells. The order only depends on geometry, so
 * mirror-image situations always behave as mirror images. Returns { r, x, y, kick } or null.
 */
export function turn(grid, p, r, x, y, dir) {
    const nr = (r + dir + 4) & 3;
    if (fits(grid, p, nr, x, y)) return { r: nr, x, y, kick: 0 };
    let pull = 0;
    const n = BOX[p], mid = (n - 1) / 2, cs = CELLS[p][nr];
    for (let i = 0; i < 4; i++) {
        const cx = x + cs[i][0], cy = y + cs[i][1];
        if (cx < 0 || cx >= W || cy >= H || (cy >= 0 && grid[cx + cy * W])) pull += cs[i][0] - mid;
    }
    // Away from the clash. A dead centre clash goes the way the piece is turning.
    const s = pull > 0 ? -1 : pull < 0 ? 1 : dir;
    const tries = [[s, 0], [s, 1], [-s, 0], [-s, 1], [0, 1], [0, -1], [s, -1], [-s, -1]];
    if (p === NOODLE) tries.push([2 * s, 0], [-2 * s, 0], [0, -2], [2 * s, -1], [-2 * s, -1]);
    for (const [kx, ky] of tries) {
        if (fits(grid, p, nr, x + kx, y + ky) && touching(p, r, x, y, nr, x + kx, y + ky)) return { r: nr, x: x + kx, y: y + ky, kick: 1 };
    }
    return null;
}

export const TIMING = {
    LOCK: 30,           // half a second on the ground
    LOCK_RESETS: 15,    // moves that restart that half second, per row reached
    ENTRY: 4,           // a beat between pieces
    CLEAR: [0, 15, 18, 21, 26], // the clear animation holds the next piece for this long
    SOFT: 0.5,          // soft drop speed, cells per step
    GARBAGE_WAIT: 75,   // incoming sheep hover this long before they can land
};

/** Seconds a piece takes to fall one row at this level. */
export const secondsPerRow = (level) => Math.max(1 / 60, 1.0 * Math.pow(0.79, Math.min(level, 20) - 1));

/** Garbage sent by a clear: [lines] plus a combo, a wedge and back-to-back bonus. */
const BASE = [0, 0, 1, 2, 4], COMBO = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5];
export function attackFor(lines, wedge, combo, b2b, perfect) {
    if (!lines) return 0;
    let a = wedge ? lines * 2 : BASE[lines];
    a += COMBO[Math.min(combo, COMBO.length - 1)];
    if (b2b) a += 1;
    if (perfect) a += 6;
    return a;
}
const SCORE = [0, 100, 300, 500, 800];

export class Field {
    constructor(o = {}) {
        this.rand = mulberry(o.seed ?? 1);
        this.grid = new Int32Array(W * H);
        this.queue = [];
        this.bag = [];
        this.first = true;
        this.active = null;
        this.holdPiece = -1;
        this.canHold = true;
        this.gravity = o.gravity ?? 1 / 60 / secondsPerRow(o.level ?? 1);
        this.gravityScale = 1;
        this.fall = 0;
        this.lockT = 0; this.resets = 0; this.lowest = -99;
        this.delay = 0;
        this.clearing = null;
        this.events = [];
        this.uid = 1;
        this.lastRotate = false; this.lastKick = false;
        this.score = 0; this.lines = 0; this.pieces = 0; this.combo = -1; this.b2b = false; this.dead = false;
        this.sent = 0; this.quads = 0; this.wedges = 0; this.maxCombo = 0; this.steps = 0; this.perfects = 0;
        this.incoming = [];
        this.gapRand = mulberry((o.seed ?? 1) * 31 + 7);
        this.gap = Math.floor(this.gapRand() * W);
        this.garbageWait = o.garbageWait ?? TIMING.GARBAGE_WAIT;
        this.buffer = { rotate: 0, hold: false };
        this.autoSpawn = o.autoSpawn !== false;
        this.refill();
        if (this.autoSpawn) this.spawn();
    }

    refill() {
        while (this.queue.length < 8) {
            if (!this.bag.length) {
                this.bag = [0, 1, 2, 3, 4, 5, 6];
                for (let i = 6; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
                // Never open a fresh bed with a seal or a frog: they leave a hole on an empty floor.
                if (this.first) {
                    this.first = false;
                    const last = this.bag.length - 1;
                    if (this.bag[last] === BLUB || this.bag[last] === MOSS) { const k = this.bag.findIndex((q) => q !== BLUB && q !== MOSS); [this.bag[last], this.bag[k]] = [this.bag[k], this.bag[last]]; }
                }
            }
            this.queue.push(this.bag.pop());
        }
    }

    /** Bring in the next piece, or the one given. Rotation or hold pressed during the wait applies on arrival. */
    spawn(piece) {
        if (this.buffer.hold && this.canHold && piece === undefined) {
            this.buffer.hold = false;
            this.canHold = false;
            const was = this.holdPiece;
            this.holdPiece = this.queue.shift();
            this.refill();
            this.events.push({ t: "hold", p: this.holdPiece });
            if (was >= 0) return this.spawn(was);
        }
        this.buffer.hold = false;
        const p = piece ?? this.queue.shift();
        this.refill();
        const n = BOX[p], x = Math.floor((W - n) / 2);
        let y = TOP - 2 - (p === NOODLE ? 1 : 0), r = 0;
        const clear = () => fits(this.grid, p, r, x, y);
        if (!clear()) y--;
        if (!clear()) y--;
        if (!clear()) {
            this.active = { p, r, x, y, uid: this.uid++ };
            this.dead = true;
            this.events.push({ t: "dead" });
            return false;
        }
        this.active = { p, r, x, y, uid: this.uid++ };
        this.fall = 0; this.lockT = 0; this.resets = 0; this.lowest = y;
        this.lastRotate = false; this.lastKick = false;
        this.events.push({ t: "spawn", p });
        if (this.buffer.rotate) { const d = this.buffer.rotate; this.buffer.rotate = 0; this.rotate(d); }
        return true;
    }

    /** Where the piece would land. */
    ghostY() {
        const a = this.active;
        if (!a) return 0;
        let y = a.y;
        while (fits(this.grid, a.p, a.r, a.x, y + 1)) y++;
        return y;
    }

    grounded() { const a = this.active; return !!a && !fits(this.grid, a.p, a.r, a.x, a.y + 1); }

    /** A move or turn on the ground buys more time, but only so often. */
    touched() {
        if (this.resets < TIMING.LOCK_RESETS) { this.lockT = 0; this.resets++; }
    }

    move(dx) {
        const a = this.active;
        if (!a || this.dead) return false;
        if (!fits(this.grid, a.p, a.r, a.x + dx, a.y)) { return false; }
        a.x += dx;
        this.lastRotate = false;
        this.touched();
        this.events.push({ t: "move", dx });
        return true;
    }

    rotate(dir) {
        const a = this.active;
        if (!a || this.dead) { this.buffer.rotate = dir; return false; }
        if (a.p === TRUFFLE) { this.events.push({ t: "rotate", dir, kick: 0, still: true }); return false; }
        const got = turn(this.grid, a.p, a.r, a.x, a.y, dir);
        if (!got) { this.events.push({ t: "stuck" }); return false; }
        a.r = got.r; a.x = got.x; a.y = got.y;
        this.lastRotate = true; this.lastKick = !!got.kick;
        if (a.y > this.lowest) { this.lowest = a.y; this.resets = 0; }
        this.touched();
        this.events.push({ t: "rotate", dir, kick: got.kick });
        return true;
    }

    hold() {
        if (this.dead) return false;
        if (!this.active) { this.buffer.hold = true; return false; }
        if (!this.canHold) { this.events.push({ t: "stuck" }); return false; }
        const was = this.holdPiece;
        this.holdPiece = this.active.p;
        this.canHold = false;
        this.active = null;
        this.events.push({ t: "hold", p: this.holdPiece });
        if (was >= 0) this.spawn(was); else this.spawn();
        return true;
    }

    /** One row of drag on a phone: moves the piece, never locks it. */
    softStep() {
        const a = this.active;
        if (!a || !fits(this.grid, a.p, a.r, a.x, a.y + 1)) return false;
        a.y++; this.score += 1; this.fall = 0; this.lastRotate = false;
        this.noteRow();
        this.events.push({ t: "soft" });
        return true;
    }

    noteRow() { const a = this.active; if (a.y > this.lowest) { this.lowest = a.y; this.resets = 0; this.lockT = 0; } }

    hardDrop() {
        const a = this.active;
        if (!a || this.dead) return false;
        const y = this.ghostY(), dist = y - a.y;
        if (dist > 0) this.lastRotate = false;
        a.y = y;
        this.score += dist * 2;
        this.lock(true, dist);
        return true;
    }

    /** Can this piece not move left, right or up? Then it was wriggled in on purpose. */
    wedged() {
        const a = this.active;
        if (a.p === TRUFFLE || !this.lastRotate) return false;
        return !fits(this.grid, a.p, a.r, a.x - 1, a.y) && !fits(this.grid, a.p, a.r, a.x + 1, a.y) && !fits(this.grid, a.p, a.r, a.x, a.y - 1);
    }

    lock(hard, dist = 0) {
        const a = this.active, wedge = this.wedged(), cs = CELLS[a.p][a.r], g = this.grid, at = [];
        const has = (x, y) => cs.some((c) => c[0] === x && c[1] === y);
        // The animal's head goes on its highest cell, nearest the right.
        let hx = -1, hy = 99;
        for (const [x, y] of cs) if (y < hy || (y === hy && x > hx)) { hx = x; hy = y; }
        for (const [x, y] of cs) {
            const mask = (has(x + 1, y) ? RIGHT : 0) | (has(x, y + 1) ? DOWN : 0) | (has(x - 1, y) ? LEFT : 0) | (has(x, y - 1) ? UP : 0);
            const gx = a.x + x, gy = a.y + y;
            at.push([gx, gy]);
            if (gy >= 0) g[gx + gy * W] = pack(a.p + 1, mask, x === hx && y === hy ? 1 : 0, a.uid);
        }
        this.active = null;
        this.pieces++;
        this.canHold = true;
        const full = [];
        for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (g[x + y * W]) n++; if (n === W) full.push(y); }
        const event = { t: "lock", p: a.p, uid: a.uid, cells: at, hard, dist, wedge };
        this.events.push(event);
        if (full.length) {
            this.combo++;
            const big = full.length === 4 || wedge, b2b = big && this.b2b;
            this.b2b = big;
            let eggs = 0, left = 0;
            for (const y of full) for (let x = 0; x < W; x++) if (kindOf(g[x + y * W]) === EGG + 1) eggs++;
            for (let i = 0; i < W * H; i++) left += g[i] ? 1 : 0;
            const perfect = left === full.length * W;
            const attack = attackFor(full.length, wedge, this.combo, b2b, perfect);
            const level = this.levelNow ?? 1;
            let pts = SCORE[full.length] * level * (wedge ? 2 : 1) + 50 * Math.max(0, this.combo) * level;
            if (b2b) pts = Math.floor(pts * 1.5);
            if (perfect) pts += 2000 * level;
            pts += eggs * 150;
            this.score += pts;
            this.lines += full.length;
            if (full.length === 4) this.quads++;
            if (wedge) this.wedges++;
            if (perfect) this.perfects++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.clearing = full;
            this.delay = TIMING.CLEAR[full.length];
            this.events.push({ t: "clear", rows: full, n: full.length, wedge, combo: this.combo, b2b, perfect, attack, points: pts, eggs });
        } else {
            this.combo = -1;
            if (wedge) { this.score += 100 * (this.levelNow ?? 1); this.events.push({ t: "wedge" }); }
            this.landGarbage();
            this.delay = TIMING.ENTRY;
        }
    }

    /** Remove full rows, drop what's above, and split any animal that got cut in half. */
    collapse() {
        const g = this.grid, rows = this.clearing;
        this.clearing = null;
        for (const y of rows) for (let x = 0; x < W; x++) {
            const c = g[x + y * W];
            if (!c) continue;
            const m = maskOf(c);
            // Whoever was joined to this cell lets go.
            if (m & UP && y > 0) this.unjoin(x, y - 1, DOWN);
            if (m & DOWN && y < H - 1) this.unjoin(x, y + 1, UP);
        }
        for (const y of rows) {
            g.copyWithin(W, 0, y * W);
            g.fill(0, 0, W);
        }
        this.reheads();
        this.events.push({ t: "collapse", rows });
    }

    unjoin(x, y, bit) { const c = this.grid[x + y * W]; if (c) this.grid[x + y * W] = (c & ~(bit << 4)); }

    /** Every connected lump of animal has exactly one face, on its highest cell. */
    reheads() {
        const g = this.grid, seen = new Uint8Array(W * H), stack = [];
        for (let i = 0; i < W * H; i++) {
            if (!g[i] || seen[i]) continue;
            const kind = kindOf(g[i]);
            if (kind === SHEEP + 1 || kind === EGG + 1) continue;
            stack.length = 0; stack.push(i); seen[i] = 1;
            let best = i, n = 0, heads = 0;
            while (stack.length) {
                const c = stack.pop(), x = c % W, y = (c - x) / W, m = maskOf(g[c]);
                if (isHead(g[c])) { heads++; if (heads > 1) g[c] &= ~(1 << 8); else best = c; }
                else if (!heads && (y < Math.floor(best / W) || (y === Math.floor(best / W) && x > best % W))) best = c;
                n++;
                if (m & RIGHT && !seen[c + 1]) { seen[c + 1] = 1; stack.push(c + 1); }
                if (m & LEFT && !seen[c - 1]) { seen[c - 1] = 1; stack.push(c - 1); }
                if (m & DOWN && !seen[c + W]) { seen[c + W] = 1; stack.push(c + W); }
                if (m & UP && !seen[c - W]) { seen[c - W] = 1; stack.push(c - W); }
            }
            if (n && !heads) g[best] |= 1 << 8;
        }
    }

    /** The Queue: sheep on their way. Rows wait a moment so a quick clear can cancel them. */
    addGarbage(n, wait = this.garbageWait, sameGap = false) {
        if (n <= 0) return;
        if (!sameGap && this.gapRand() < 0.7) this.gap = (this.gap + 1 + Math.floor(this.gapRand() * (W - 1))) % W;
        this.incoming.push({ n, wait, gap: this.gap });
        this.events.push({ t: "incoming", n });
    }

    pending() { let n = 0; for (const e of this.incoming) n += e.n; return n; }

    /** A clear spends attack on incoming sheep first. Returns what is left to send. */
    cancel(n) {
        let was = 0;
        while (n > 0 && this.incoming.length) {
            const e = this.incoming[0], k = Math.min(n, e.n);
            e.n -= k; n -= k; was += k;
            if (!e.n) this.incoming.shift();
        }
        if (was) this.events.push({ t: "cancel", n: was });
        return n;
    }

    landGarbage() {
        let room = 8, landed = 0;
        while (this.incoming.length && room > 0 && this.incoming[0].wait <= 0) {
            const e = this.incoming[0], k = Math.min(room, e.n);
            this.rise(k, e.gap);
            landed += k; room -= k; e.n -= k;
            if (!e.n) this.incoming.shift();
        }
        if (landed) this.events.push({ t: "landed", n: landed });
    }

    /** Push the whole bed up and tuck a row of sheep underneath. */
    rise(n, gap) {
        const g = this.grid;
        for (let i = 0; i < n * W; i++) if (g[i]) { this.dead = true; }
        g.copyWithin(0, n * W, W * H);
        for (let y = H - n; y < H; y++) for (let x = 0; x < W; x++) {
            if (x === gap) { g[x + y * W] = 0; continue; }
            const mask = (x + 1 < W && x + 1 !== gap ? RIGHT : 0) | (x - 1 >= 0 && x - 1 !== gap ? LEFT : 0);
            g[x + y * W] = pack(SHEEP + 1, mask, (x * 3 + y * 5) % 4 === 1 ? 1 : 0, 0);
        }
        if (this.dead) this.events.push({ t: "dead" });
    }

    /** Eggs fall onto the top of a column. One cell each, cleared like anything else. */
    dropEgg(x) {
        const g = this.grid;
        let y = TOP - 1;
        const a = this.active;
        while (y + 1 < H && !g[x + (y + 1) * W]) y++;
        if (y < TOP) return false;
        if (a) for (const [cx, cy] of CELLS[a.p][a.r]) if (a.x + cx === x && a.y + cy === y) return false;
        g[x + y * W] = pack(EGG + 1, 0, 0, 0);
        this.events.push({ t: "egg", x, y });
        return true;
    }

    /** Height of the highest thing in the bed, in visible rows. */
    stackHeight() {
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.grid[x + y * W]) return H - y;
        return 0;
    }

    /** One 60 Hz step. soft is true while soft drop is held. */
    tick(soft) {
        if (this.dead) return;
        this.steps++;
        for (const e of this.incoming) if (e.wait > 0) e.wait--;
        if (this.delay > 0) {
            this.delay--;
            if (this.delay > 0) return;
            if (this.clearing) { this.collapse(); this.landGarbage(); if (this.dead) return; this.delay = TIMING.ENTRY; return; }
        }
        if (!this.active) { if (!this.spawn() || !this.active) return; }
        const a = this.active, g = this.gravity * this.gravityScale;
        this.fall += soft ? Math.max(TIMING.SOFT, g) : g;
        while (this.fall >= 1) {
            this.fall -= 1;
            if (!fits(this.grid, a.p, a.r, a.x, a.y + 1)) { this.fall = 0; break; }
            a.y++;
            this.lastRotate = false;
            if (soft) { this.score += 1; this.events.push({ t: "soft" }); }
            this.noteRow();
        }
        if (!fits(this.grid, a.p, a.r, a.x, a.y + 1)) {
            this.lockT++;
            if (this.lockT >= TIMING.LOCK) this.lock(false);
        }
    }
}
