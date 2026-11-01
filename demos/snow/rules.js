// The rules of Snowplow, and nothing else: no framework, no drawing. The game, the solver and the bots all run this file,
// so what the solver proves is exactly what the player plays.
export const VOID = 0, GROUND = 1, WALL = 2, ICE = 3, WARM = 4, DITCH = 5, PLATE = 6, GATE = 7, PINE = 8, PLINTH = 9;

// One byte per cell: which balls stand here, whether fresh snow lies here, and whether a ditch is filled or a pine shaken.
export const S = 1, M = 2, L = 4, BALLS = 7, SNOW = 8, DONE = 16;

// Things that can happen in one move. A forbidden event is how the checker proves a level needs an idea.
export const E = {
    WALK: 1, PUSH: 2, GROW: 4, GROW_BIG: 8, BARE: 16, STACK: 32, UNSTACK: 64, SNOWMAN: 128, SLIDE: 256, SLIDE_STACK: 512,
    SHRINK: 1024, MELT: 2048, SHAKE: 4096, FILL: 8192, ON_PLATE: 16384, OFF_PLATE: 32768, CLEAR: 65536, HEAD: 131072, ICE_STOP: 262144, TOP_GROW: 524288,
    SNOW_REGROW: 1048576, ICE_SNOWMAN: 2097152, FILL_GROW: 4194304, WARM_STACK: 8388608, PLOW: 16777216, TRACK: 33554432,
};

export const DIRS = { up: 0, right: 1, down: 2, left: 3 };
export const DIR_NAMES = ["up", "right", "down", "left"];
export const DIR_LETTERS = "urdl";

const TILE = {
    " ": [VOID], ".": [GROUND], ",": [GROUND, SNOW], "#": [WALL], "~": [ICE], "^": [WARM], "=": [DITCH], "o": [PLATE], "|": [GATE], "T": [PINE], "*": [PLINTH],
    "s": [GROUND, SNOW | S], "m": [GROUND, SNOW | M], "l": [GROUND, SNOW | L], "S": [GROUND, S], "M": [GROUND, M], "L": [GROUND, L],
    "A": [GROUND, S | M], "B": [GROUND, M | L], "C": [GROUND, S | L], "D": [GROUND, S | M | L],
    "@": [GROUND], "&": [GROUND, SNOW], "1": [ICE, S], "2": [ICE, M], "3": [ICE, L], "4": [PLATE, S], "5": [PLATE, M], "6": [PLATE, L],
};

/** A level from its rows. `need` is the number of snowmen to build. */
export function parseLevel(def) {
    const rows = def.rows, h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const tiles = new Uint8Array(w * h), start = new Uint8Array(w * h);
    let player = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = rows[y][x] ?? " ", t = TILE[ch];
        if (!t) throw new Error(`Bad tile "${ch}" in level ${def.id}`);
        tiles[x + y * w] = t[0];
        start[x + y * w] = t[1] ?? 0;
        if (ch === "@" || ch === "&") player = x + y * w;
    }
    if (player < 0) throw new Error(`Level ${def.id} has no player`);
    const plates = [], gates = [], plinths = [], live = [];
    for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        if (t === PLATE) plates.push(i);
        if (t === GATE) gates.push(i);
        if (t === PLINTH) plinths.push(i);
        if (t !== VOID && t !== WALL) live.push(i);
    }
    const left = (i) => i % w === 0, right = (i) => i % w === w - 1;
    const near = new Int32Array(tiles.length * 4);
    for (let i = 0; i < tiles.length; i++) {
        near[i * 4] = i >= w ? i - w : -1;
        near[i * 4 + 1] = right(i) ? -1 : i + 1;
        near[i * 4 + 2] = i + w < tiles.length ? i + w : -1;
        near[i * 4 + 3] = left(i) ? -1 : i - 1;
    }
    return { def, id: def.id, w, h, tiles, start, player, need: def.need ?? 1, plates, gates, plinths, near, live: Int32Array.from(live), size: tiles.length, snow0: start.map((c) => c & SNOW) };
}

export const newState = (lvl) => ({ c: lvl.start.slice(), p: lvl.player });
export const copyState = (st) => ({ c: st.c.slice(), p: st.p });

export const gateOpen = (lvl, c) => {
    for (const i of lvl.plates) if (!(c[i] & BALLS)) return false;
    return true;
};

/** What a ball is on top of a stack: the smallest one present. */
export const topBall = (m) => (m & S ? S : m & M ? M : m & L ? L : 0);

/** Can anything get onto this cell? Ground rules only; balls are handled by the caller. */
function floorOpen(lvl, c, i) {
    const t = lvl.tiles[i];
    if (t === VOID || t === WALL || t === PINE) return false;
    if (t === GATE && !(c[i] & BALLS) && !gateOpen(lvl, c)) return false;
    return true;
}

/**
 * Roll ball `b` off cell `q` in direction `d`. The ball has already been lifted out of `c`.
 * Returns where it stopped (or -1 if it never moved), and records the path in `trace` if given.
 */
function roll(lvl, c, q, d, b, out) {
    let pos = q, ev = 0, moved = false;
    const t = lvl.tiles, near = lvl.near;
    for (;;) {
        const r = near[pos * 4 + d];
        if (r < 0 || !floorOpen(lvl, c, r)) break;
        const there = c[r] & BALLS;
        if (there) {
            if (there === (S | M | L) || b >= topBall(there)) break;
            c[r] |= b;
            ev |= E.STACK | (moved ? E.SLIDE_STACK : 0);
            if (t[r] === WARM) ev |= E.WARM_STACK;
            if ((c[r] & BALLS) === (S | M | L)) {
                ev |= E.SNOWMAN | (b === S ? E.HEAD : 0);
                if (t[r] === ICE) ev |= E.ICE_SNOWMAN;
            }
            if (t[r] === PLATE) ev |= E.ON_PLATE;
            out.end = r; out.size = b; out.fate = "stack";
            return ev;
        }
        if (t[r] === DITCH && !(c[r] & DONE)) {
            c[r] |= DONE | SNOW;
            out.end = r; out.size = b; out.fate = "fill";
            return ev | E.FILL;
        }
        pos = r; moved = true;
        if (t[r] === WARM) {
            b >>= 1;
            ev |= E.SHRINK;
            if (!b) { out.end = r; out.size = 0; out.fate = "melt"; return ev | E.MELT; }
            c[r] |= b;
            out.end = r; out.size = b; out.fate = "shrink";
            return ev;
        }
        if (t[r] === ICE) { ev |= E.SLIDE; continue; }
        if (c[r] & SNOW) {
            c[r] &= ~SNOW;
            ev |= E.CLEAR;
            if (b < L) { b <<= 1; ev |= E.GROW; if (b === L) ev |= E.GROW_BIG; if (t[r] === DITCH) ev |= E.FILL_GROW; if (!lvl.snow0[r]) ev |= E.SNOW_REGROW; } else ev |= E.PLOW;
            c[r] |= b;
            if (t[r] === PLATE) ev |= E.ON_PLATE;
            out.end = r; out.size = b; out.fate = "grow";
            return ev;
        }
        ev |= E.BARE;
        if (lvl.snow0[r] && t[r] !== DITCH) ev |= E.TRACK;
        // Ice ended on bare ground: it rolls one cell and stops, as if pushed.
        c[r] |= b;
        if (t[r] === PLATE) ev |= E.ON_PLATE;
        out.end = r; out.size = b; out.fate = "bare";
        return ev;
    }
    if (!moved) return -1;
    c[pos] |= b;   // stopped on ice against something
    if (t[pos] === PLATE) ev |= E.ON_PLATE;
    out.end = pos; out.size = b; out.fate = "stop";
    return ev | E.ICE_STOP;
}

/**
 * One move. Changes `st` in place when it succeeds and returns a description, or returns null when the way is blocked
 * and leaves `st` alone. `info` is reused by the solver to avoid garbage.
 */
export function move(lvl, st, d, info = {}) {
    const c = st.c, p = st.p, t = lvl.tiles, q = lvl.near[p * 4 + d];
    if (q < 0) return null;
    const tile = t[q];
    if (tile === PINE) {
        if (c[q] & DONE) return null;
        c[q] |= DONE;
        const fell = [];
        for (let k = 0; k < 4; k++) {
            const n = lvl.near[q * 4 + k];
            if (n >= 0 && t[n] === GROUND && !(c[n] & SNOW)) { c[n] |= SNOW; fell.push(n); }
        }
        info.ev = E.SHAKE; info.kind = "shake"; info.at = q; info.fell = fell; info.from = p; info.end = -1; info.ball = 0; info.size = 0; info.fate = "";
        return info;
    }
    if (!floorOpen(lvl, c, q)) return null;
    if (tile === DITCH && !(c[q] & DONE)) return null;
    const m = c[q] & BALLS;
    if (!m) {
        st.p = q;
        info.ev = E.WALK; info.kind = "walk"; info.from = p; info.at = q; info.end = -1; info.ball = 0; info.size = 0; info.fate = ""; info.fell = null;
        return info;
    }
    if (m === (S | M | L)) return null;
    const b = topBall(m), stacked = m !== b;
    c[q] &= ~b;
    const ev = roll(lvl, c, q, d, b, info);
    if (ev < 0) { c[q] |= b; return null; }
    info.ev = ev | E.PUSH | (stacked ? E.UNSTACK : 0);
    if (stacked && ev & E.GROW) info.ev |= E.TOP_GROW;
    if (t[q] === PLATE && !stacked) info.ev |= E.OFF_PLATE;
    if (!stacked) st.p = q;
    info.kind = "push"; info.from = p; info.at = q; info.ball = b; info.fell = null; info.stacked = stacked;
    return info;
}

export const countSnowmen = (lvl, c) => {
    let n = 0;
    for (const i of lvl.live) if ((c[i] & BALLS) === BALLS) n++;
    return n;
};

export function solved(lvl, c) {
    for (const i of lvl.plinths) if ((c[i] & BALLS) !== BALLS) return false;
    return countSnowmen(lvl, c) >= lvl.need;
}

/** A compact key for one board, without the player. */
export function boardKey(lvl, c) {
    const live = lvl.live, n = live.length, a = new Array(n);
    for (let i = 0; i < n; i++) a[i] = c[live[i]] + 40;
    return String.fromCharCode.apply(null, a);
}

/** Where the player can walk without touching anything. */
export function reach(lvl, st, seen, stack) {
    const c = st.c, near = lvl.near, t = lvl.tiles;
    seen.fill(0);
    let sp = 0, low = st.p;
    stack[sp++] = st.p; seen[st.p] = 1;
    while (sp) {
        const i = stack[--sp];
        if (i < low) low = i;
        for (let k = 0; k < 4; k++) {
            const n = near[i * 4 + k];
            if (n < 0 || seen[n]) continue;
            const f = t[n];
            if (f === VOID || f === WALL || f === PINE || (c[n] & BALLS) || (f === DITCH && !(c[n] & DONE))) continue;
            if (f === GATE && !gateOpen(lvl, c)) continue;
            seen[n] = 1; stack[sp++] = n;
        }
    }
    return low;
}

/** A key for a board and the region the player stands in: two states with the same key are the same puzzle position. */
export function placeKey(lvl, st) {
    const n = lvl.size;
    return boardKey(lvl, st.c) + String.fromCharCode(40 + reach(lvl, st, new Uint8Array(n), new Int32Array(n)));
}

/** Walking route on the current board, as direction numbers, or null. */
export function walkPath(lvl, st, to) {
    if (st.p === to) return [];
    const prev = new Int32Array(lvl.size).fill(-1), dir = new Int8Array(lvl.size), q = [st.p], c = st.c, t = lvl.tiles;
    prev[st.p] = st.p;
    for (let h = 0; h < q.length; h++) {
        const i = q[h];
        for (const k of [0, 1, 2, 3]) {
            const n = lvl.near[i * 4 + k];
            if (n < 0 || prev[n] >= 0) continue;
            const f = t[n];
            if (f === VOID || f === WALL || f === PINE || (c[n] & BALLS) || (f === DITCH && !(c[n] & DONE))) continue;
            if (f === GATE && !gateOpen(lvl, c)) continue;
            prev[n] = i; dir[n] = k;
            if (n === to) {
                const path = [];
                for (let x = to; x !== st.p; x = prev[x]) path.unshift(dir[x]);
                return path;
            }
            q.push(n);
        }
    }
    return null;
}
