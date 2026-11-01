// Chess rules and search. No dependencies, no DOM: the same file runs on the main thread, in a Worker and in Node.
// The board is 0x88. A move is an int: from | to<<7 | promo<<14 | flag<<17.

export const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
export const WHITE = 0, BLACK = 8;
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const QUIET = 0, DOUBLE = 1, EP = 2, CASTLE = 3;
export const mv = (from, to, promo = 0, flag = 0) => from | to << 7 | promo << 14 | flag << 17;
export const mFrom = (m) => m & 127;
export const mTo = (m) => m >> 7 & 127;
export const mPromo = (m) => m >> 14 & 7;
export const mFlag = (m) => m >> 17 & 7;
export const isEP = (m) => mFlag(m) === EP;
export const isCastle = (m) => mFlag(m) === CASTLE;

export const sqName = (s) => "abcdefgh"[s & 7] + (1 + (s >> 4));
export const sqFrom = (name) => name.charCodeAt(0) - 97 + (name.charCodeAt(1) - 49) * 16;
export const fileOf = (s) => s & 7;
export const rankOf = (s) => s >> 4;

const KNIGHT_D = [31, 33, 14, 18, -31, -33, -14, -18];
const BISHOP_D = [15, 17, -15, -17];
const ROOK_D = [16, -16, 1, -1];
const KING_D = [16, -16, 1, -1, 15, 17, -15, -17];

// Castling rights: 1 K, 2 Q, 4 k, 8 q. Moving from or to a square keeps only these rights.
const CASTLE_MASK = new Int8Array(128).fill(15);
CASTLE_MASK[0] = 13; CASTLE_MASK[7] = 14; CASTLE_MASK[4] = 12;
CASTLE_MASK[112] = 7; CASTLE_MASK[119] = 11; CASTLE_MASK[116] = 3;

// Zobrist keys: a fixed sequence so every thread agrees.
let seed = 0x2f6e2b1;
const rand32 = () => {
    seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return (t ^ t >>> 14) | 0;
};
const ZP_LO = new Int32Array(16 * 128), ZP_HI = new Int32Array(16 * 128);
for (let i = 0; i < ZP_LO.length; i++) { ZP_LO[i] = rand32(); ZP_HI[i] = rand32(); }
const ZC_LO = new Int32Array(16), ZC_HI = new Int32Array(16);
for (let i = 0; i < 16; i++) { ZC_LO[i] = rand32(); ZC_HI[i] = rand32(); }
const ZE_LO = new Int32Array(128), ZE_HI = new Int32Array(128);
for (let i = 0; i < 128; i++) { ZE_LO[i] = rand32(); ZE_HI[i] = rand32(); }
const ZS_LO = rand32(), ZS_HI = rand32();

// PeSTO tapered piece-square tables, from a8 to h1.
const MG_VAL = [0, 82, 337, 365, 477, 1025, 0], EG_VAL = [0, 94, 281, 297, 512, 936, 0], PHASE = [0, 0, 1, 1, 2, 4, 0];
const PST_MG = [null,
    [0, 0, 0, 0, 0, 0, 0, 0, 98, 134, 61, 95, 68, 126, 34, -11, -6, 7, 26, 31, 65, 56, 25, -20, -14, 13, 6, 21, 23, 12, 17, -23, -27, -2, -5, 12, 17, 6, 10, -25, -26, -4, -4, -10, 3, 3, 33, -12, -35, -1, -20, -23, -15, 24, 38, -22, 0, 0, 0, 0, 0, 0, 0, 0],
    [-167, -89, -34, -49, 61, -97, -15, -107, -73, -41, 72, 36, 23, 62, 7, -17, -47, 60, 37, 65, 84, 129, 73, 44, -9, 17, 19, 53, 37, 69, 18, 22, -13, 4, 16, 13, 28, 19, 21, -8, -23, -9, 12, 10, 19, 17, 25, -16, -29, -53, -12, -3, -1, 18, -14, -19, -105, -21, -58, -33, -17, -28, -19, -23],
    [-29, 4, -82, -37, -25, -42, 7, -8, -26, 16, -18, -13, 30, 59, 18, -47, -16, 37, 43, 40, 35, 50, 37, -2, -4, 5, 19, 50, 37, 37, 7, -2, -6, 13, 13, 26, 34, 12, 10, 4, 0, 15, 15, 15, 14, 27, 18, 10, 4, 15, 16, 0, 7, 21, 33, 1, -33, -3, -14, -21, -13, -12, -39, -21],
    [32, 42, 32, 51, 63, 9, 31, 43, 27, 32, 58, 62, 80, 67, 26, 44, -5, 19, 26, 36, 17, 45, 61, 16, -24, -11, 7, 26, 24, 35, -8, -20, -36, -26, -12, -1, 9, -7, 6, -23, -45, -25, -16, -17, 3, 0, -5, -33, -44, -16, -20, -9, -1, 11, -6, -71, -19, -13, 1, 17, 16, 7, -37, -26],
    [-28, 0, 29, 12, 59, 44, 43, 45, -24, -39, -5, 1, -16, 57, 28, 54, -13, -17, 7, 8, 29, 56, 47, 57, -27, -27, -16, -16, -1, 17, -2, 1, -9, -26, -9, -10, -2, -4, 3, -3, -14, 2, -11, -2, -5, 2, 14, 5, -35, -8, 11, 2, 8, 15, -3, 1, -1, -18, -9, 10, -15, -25, -31, -50],
    [-65, 23, 16, -15, -56, -34, 2, 13, 29, -1, -20, -7, -8, -4, -38, -29, -9, 24, 2, -16, -20, 6, 22, -22, -17, -20, -12, -27, -30, -25, -14, -36, -49, -1, -27, -39, -46, -44, -33, -51, -14, -14, -22, -46, -44, -30, -15, -27, 1, 7, -8, -64, -43, -16, 9, 8, -15, 36, 12, -54, 8, -28, 24, 14],
];
const PST_EG = [null,
    [0, 0, 0, 0, 0, 0, 0, 0, 178, 173, 158, 134, 147, 132, 165, 187, 94, 100, 85, 67, 56, 53, 82, 84, 32, 24, 13, 5, -2, 4, 17, 17, 13, 9, -3, -7, -7, -8, 3, -1, 4, 7, -6, 1, 0, -5, -1, -8, 13, 8, 8, 10, 13, 0, 2, -7, 0, 0, 0, 0, 0, 0, 0, 0],
    [-58, -38, -13, -28, -31, -27, -63, -99, -25, -8, -25, -2, -9, -25, -24, -52, -24, -20, 10, 9, -1, -9, -19, -41, -17, 3, 22, 22, 22, 11, 8, -18, -18, -6, 16, 25, 16, 17, 4, -18, -23, -3, -1, 15, 10, -3, -20, -22, -42, -20, -10, -5, -2, -20, -23, -44, -29, -51, -23, -15, -22, -18, -50, -64],
    [-14, -21, -11, -8, -7, -9, -17, -24, -8, -4, 7, -12, -3, -13, -4, -14, 2, -8, 0, -1, -2, 6, 0, 4, -3, 9, 12, 9, 14, 10, 3, 2, -6, 3, 13, 19, 7, 10, -3, -9, -12, -3, 8, 10, 13, 3, -7, -15, -14, -18, -7, -1, 4, -9, -15, -27, -23, -9, -23, -5, -9, -16, -5, -17],
    [13, 10, 18, 15, 12, 12, 8, 5, 11, 13, 13, 11, -3, 3, 8, 3, 7, 7, 7, 5, 4, -3, -5, -3, 4, 3, 13, 1, 2, 1, -1, 2, 3, 5, 8, 4, -5, -6, -8, -11, -4, 0, -5, -1, -7, -12, -8, -16, -6, -6, 0, 2, -9, -9, -11, -3, -9, 2, 3, -1, -5, -13, 4, -20],
    [-9, 22, 22, 27, 27, 19, 10, 20, -17, 20, 32, 41, 58, 25, 30, 0, -20, 6, 9, 49, 47, 35, 19, 9, 3, 22, 24, 45, 57, 40, 57, 36, -18, 28, 19, 47, 31, 34, 39, 23, -16, -27, 15, 6, 9, 17, 10, 5, -22, -23, -30, -16, -16, -23, -36, -32, -33, -28, -22, -43, -5, -32, -20, -41],
    [-74, -35, -18, -18, -11, 15, 4, -17, -12, 17, 14, 17, 17, 38, 23, 11, 10, 17, 23, 15, 20, 45, 44, 13, -8, 22, 24, 27, 26, 33, 26, 3, -18, -4, 21, 24, 27, 23, 9, -11, -19, -3, 11, 21, 23, 16, 7, -9, -27, -11, 4, 13, 14, 4, -5, -17, -53, -34, -21, -11, -28, -14, -24, -43],
];
// S_MG[piece][sq]: value from white's point of view (black entries are negative).
const S_MG = new Int16Array(16 * 128), S_EG = new Int16Array(16 * 128);
for (let t = 1; t <= 6; t++) for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
    const sq = r * 16 + f, wi = (7 - r) * 8 + f, bi = r * 8 + f;
    S_MG[t * 128 + sq] = MG_VAL[t] + PST_MG[t][wi];
    S_EG[t * 128 + sq] = EG_VAL[t] + PST_EG[t][wi];
    S_MG[(t | 8) * 128 + sq] = -(MG_VAL[t] + PST_MG[t][bi]);
    S_EG[(t | 8) * 128 + sq] = -(EG_VAL[t] + PST_EG[t][bi]);
}

const STACK = 2048;

export class Position {
    constructor(fen = START_FEN) {
        this.b = new Int8Array(128);
        this.counts = new Int8Array(16);
        this.kings = new Int8Array(2);
        // Undo stack.
        this.uMove = new Int32Array(STACK);
        this.uCap = new Int8Array(STACK);
        this.uCastle = new Int8Array(STACK);
        this.uEp = new Int16Array(STACK);
        this.uHalf = new Int16Array(STACK);
        this.uLo = new Int32Array(STACK);
        this.uHi = new Int32Array(STACK);
        this.uMg = new Int32Array(STACK);
        this.uEg = new Int32Array(STACK);
        this.load(fen);
    }

    load(fen) {
        const [board, side, castle, ep, half, full] = fen.trim().split(/\s+/);
        this.b.fill(0);
        this.counts.fill(0);
        this.mg = this.eg = this.phase = 0;
        this.lo = this.hi = 0;
        let r = 7, f = 0;
        for (const ch of board) {
            if (ch === "/") { r--; f = 0; continue; }
            if (ch >= "1" && ch <= "8") { f += +ch; continue; }
            const lower = ch.toLowerCase(), t = " pnbrqk".indexOf(lower), p = t | (ch === lower ? BLACK : WHITE);
            this.put(p, r * 16 + f);
            f++;
        }
        this.side = side === "b" ? BLACK : WHITE;
        if (this.side) { this.lo ^= ZS_LO; this.hi ^= ZS_HI; }
        this.castle = 0;
        if (castle && castle !== "-") for (const c of castle) this.castle |= "KQkq".indexOf(c) >= 0 ? 1 << "KQkq".indexOf(c) : 0;
        this.lo ^= ZC_LO[this.castle]; this.hi ^= ZC_HI[this.castle];
        this.ep = ep && ep !== "-" ? sqFrom(ep) : -1;
        if (this.ep >= 0) { this.lo ^= ZE_LO[this.ep]; this.hi ^= ZE_HI[this.ep]; }
        this.half = +(half ?? 0);
        this.full = +(full ?? 1);
        this.sp = 0;
    }

    put(p, sq) {
        this.b[sq] = p;
        this.counts[p]++;
        const k = p * 128 + sq;
        this.mg += S_MG[k]; this.eg += S_EG[k]; this.phase += PHASE[p & 7];
        this.lo ^= ZP_LO[k]; this.hi ^= ZP_HI[k];
        if ((p & 7) === K) this.kings[p >> 3] = sq;
    }

    fen() {
        let s = "";
        for (let r = 7; r >= 0; r--) {
            let empty = 0;
            for (let f = 0; f < 8; f++) {
                const p = this.b[r * 16 + f];
                if (!p) { empty++; continue; }
                if (empty) { s += empty; empty = 0; }
                const c = " pnbrqk"[p & 7];
                s += p & 8 ? c : c.toUpperCase();
            }
            if (empty) s += empty;
            if (r) s += "/";
        }
        let c = "";
        for (let i = 0; i < 4; i++) if (this.castle & 1 << i) c += "KQkq"[i];
        return `${s} ${this.side ? "b" : "w"} ${c || "-"} ${this.ep >= 0 ? sqName(this.ep) : "-"} ${this.half} ${this.full}`;
    }

    attacked(sq, by) {
        const b = this.b;
        // Pawns: a white pawn attacks up the board, so look down from sq.
        if (by === WHITE) {
            if (!(sq - 15 & 0x88) && b[sq - 15] === P) return true;
            if (!(sq - 17 & 0x88) && b[sq - 17] === P) return true;
        } else {
            if (!(sq + 15 & 0x88) && b[sq + 15] === (P | 8)) return true;
            if (!(sq + 17 & 0x88) && b[sq + 17] === (P | 8)) return true;
        }
        const kn = N | by, ki = K | by, bi = B | by, ro = R | by, qu = Q | by;
        for (let i = 0; i < 8; i++) {
            const t = sq + KNIGHT_D[i];
            if (!(t & 0x88) && b[t] === kn) return true;
            const u = sq + KING_D[i];
            if (!(u & 0x88) && b[u] === ki) return true;
        }
        for (let i = 0; i < 4; i++) {
            let d = ROOK_D[i], t = sq + d;
            while (!(t & 0x88)) {
                const p = b[t];
                if (p) { if (p === ro || p === qu) return true; break; }
                t += d;
            }
            d = BISHOP_D[i]; t = sq + d;
            while (!(t & 0x88)) {
                const p = b[t];
                if (p) { if (p === bi || p === qu) return true; break; }
                t += d;
            }
        }
        return false;
    }

    inCheck(side = this.side) { return this.attacked(this.kings[side >> 3], side ^ 8); }

    /** After make(): did the side that just moved leave its own king attacked? */
    illegal() { return this.inCheck(this.side ^ 8); }

    /** Pseudo-legal moves into list; returns the count. With onlyTactical: captures and promotions. */
    gen(list, onlyTactical = false) {
        const b = this.b, side = this.side, enemy = side ^ 8;
        let n = 0;
        for (let sq = 0; sq < 120; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            const p = b[sq];
            if (!p || (p & 8) !== side) continue;
            const t = p & 7;
            if (t === P) {
                const up = side ? -16 : 16, rank = sq >> 4, last = side ? 1 : 6, home = side ? 6 : 1, to = sq + up;
                if (!b[to]) {
                    if (rank === last) {
                        list[n++] = mv(sq, to, Q);
                        if (!onlyTactical) { list[n++] = mv(sq, to, R); list[n++] = mv(sq, to, B); list[n++] = mv(sq, to, N); }
                    } else if (!onlyTactical) {
                        list[n++] = mv(sq, to);
                        if (rank === home && !b[to + up]) list[n++] = mv(sq, to + up, 0, DOUBLE);
                    }
                }
                for (let i = -1; i <= 1; i += 2) {
                    const c = to + i;
                    if (c & 0x88) continue;
                    const q = b[c];
                    if (q && (q & 8) === enemy) {
                        if (rank === last) {
                            list[n++] = mv(sq, c, Q); list[n++] = mv(sq, c, R); list[n++] = mv(sq, c, B); list[n++] = mv(sq, c, N);
                        } else list[n++] = mv(sq, c);
                    } else if (c === this.ep) list[n++] = mv(sq, c, 0, EP);
                }
            } else if (t === N || t === K) {
                const dirs = t === N ? KNIGHT_D : KING_D;
                for (let i = 0; i < 8; i++) {
                    const to = sq + dirs[i];
                    if (to & 0x88) continue;
                    const q = b[to];
                    if (q) { if ((q & 8) === enemy) list[n++] = mv(sq, to); } else if (!onlyTactical) list[n++] = mv(sq, to);
                }
                if (t === K && !onlyTactical) {
                    if (side === WHITE) {
                        if (this.castle & 1 && !b[5] && !b[6] && !this.attacked(4, BLACK) && !this.attacked(5, BLACK)) list[n++] = mv(4, 6, 0, CASTLE);
                        if (this.castle & 2 && !b[3] && !b[2] && !b[1] && !this.attacked(4, BLACK) && !this.attacked(3, BLACK)) list[n++] = mv(4, 2, 0, CASTLE);
                    } else {
                        if (this.castle & 4 && !b[117] && !b[118] && !this.attacked(116, WHITE) && !this.attacked(117, WHITE)) list[n++] = mv(116, 118, 0, CASTLE);
                        if (this.castle & 8 && !b[115] && !b[114] && !b[113] && !this.attacked(116, WHITE) && !this.attacked(115, WHITE)) list[n++] = mv(116, 114, 0, CASTLE);
                    }
                }
            } else {
                const dirs = t === B ? BISHOP_D : t === R ? ROOK_D : KING_D, count = t === Q ? 8 : 4;
                for (let i = 0; i < count; i++) {
                    const d = dirs[i];
                    let to = sq + d;
                    while (!(to & 0x88)) {
                        const q = b[to];
                        if (q) { if ((q & 8) === enemy) list[n++] = mv(sq, to); break; }
                        if (!onlyTactical) list[n++] = mv(sq, to);
                        to += d;
                    }
                }
            }
        }
        return n;
    }

    make(m) {
        const b = this.b, from = m & 127, to = m >> 7 & 127, promo = m >> 14 & 7, flag = m >> 17 & 7, p = b[from], side = this.side;
        const sp = this.sp++, cap = b[to];
        this.uMove[sp] = m; this.uCap[sp] = cap; this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half;
        this.uLo[sp] = this.lo; this.uHi[sp] = this.hi; this.uMg[sp] = this.mg; this.uEg[sp] = this.eg;
        let lo = this.lo ^ ZS_LO ^ ZC_LO[this.castle], hi = this.hi ^ ZS_HI ^ ZC_HI[this.castle];
        if (this.ep >= 0) { lo ^= ZE_LO[this.ep]; hi ^= ZE_HI[this.ep]; }
        let mg = this.mg, eg = this.eg, k;
        if (cap) {
            k = cap * 128 + to;
            lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg -= S_MG[k]; eg -= S_EG[k];
            this.counts[cap]--; this.phase -= PHASE[cap & 7];
        }
        k = p * 128 + from;
        lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg -= S_MG[k]; eg -= S_EG[k];
        b[from] = 0;
        let placed = p;
        if (promo) {
            placed = promo | side;
            this.counts[p]--; this.counts[placed]++;
            this.phase += PHASE[promo];
        }
        b[to] = placed;
        k = placed * 128 + to;
        lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg += S_MG[k]; eg += S_EG[k];
        if ((p & 7) === K) this.kings[side >> 3] = to;
        this.ep = -1;
        if (flag === DOUBLE) {
            this.ep = (from + to) >> 1;
            lo ^= ZE_LO[this.ep]; hi ^= ZE_HI[this.ep];
        } else if (flag === EP) {
            const v = to + (side ? 16 : -16), vp = b[v];
            b[v] = 0;
            k = vp * 128 + v;
            lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg -= S_MG[k]; eg -= S_EG[k];
            this.counts[vp]--;
        } else if (flag === CASTLE) {
            const kingside = to > from, rf = kingside ? to + 1 : to - 2, rt = kingside ? to - 1 : to + 1, r = R | side;
            b[rf] = 0; b[rt] = r;
            k = r * 128 + rf;
            lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg -= S_MG[k]; eg -= S_EG[k];
            k = r * 128 + rt;
            lo ^= ZP_LO[k]; hi ^= ZP_HI[k]; mg += S_MG[k]; eg += S_EG[k];
        }
        this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
        lo ^= ZC_LO[this.castle]; hi ^= ZC_HI[this.castle];
        this.half = (p & 7) === P || cap ? 0 : this.half + 1;
        if (side) this.full++;
        this.side = side ^ 8;
        this.lo = lo; this.hi = hi; this.mg = mg; this.eg = eg;
    }

    unmake() {
        const sp = --this.sp, m = this.uMove[sp], b = this.b;
        const from = m & 127, to = m >> 7 & 127, promo = m >> 14 & 7, flag = m >> 17 & 7;
        this.side ^= 8;
        const side = this.side;
        if (side) this.full--;
        const moved = b[to], cap = this.uCap[sp], p = promo ? P | side : moved;
        b[from] = p; b[to] = cap;
        if (cap) { this.counts[cap]++; this.phase += PHASE[cap & 7]; }
        if (promo) { this.counts[moved]--; this.counts[p]++; this.phase -= PHASE[promo]; }
        if ((p & 7) === K) this.kings[side >> 3] = from;
        if (flag === EP) {
            const v = to + (side ? 16 : -16), vp = P | side ^ 8;
            b[v] = vp;
            this.counts[vp]++;
        } else if (flag === CASTLE) {
            const kingside = to > from, rf = kingside ? to + 1 : to - 2, rt = kingside ? to - 1 : to + 1;
            b[rf] = b[rt]; b[rt] = 0;
        }
        this.castle = this.uCastle[sp]; this.ep = this.uEp[sp]; this.half = this.uHalf[sp];
        this.lo = this.uLo[sp]; this.hi = this.uHi[sp]; this.mg = this.uMg[sp]; this.eg = this.uEg[sp];
    }

    makeNull() {
        const sp = this.sp++;
        this.uMove[sp] = 0; this.uCap[sp] = 0; this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half;
        this.uLo[sp] = this.lo; this.uHi[sp] = this.hi; this.uMg[sp] = this.mg; this.uEg[sp] = this.eg;
        if (this.ep >= 0) { this.lo ^= ZE_LO[this.ep]; this.hi ^= ZE_HI[this.ep]; this.ep = -1; }
        this.lo ^= ZS_LO; this.hi ^= ZS_HI;
        this.side ^= 8;
        this.half = 0;
    }

    unmakeNull() {
        const sp = --this.sp;
        this.side ^= 8;
        this.ep = this.uEp[sp]; this.half = this.uHalf[sp]; this.lo = this.uLo[sp]; this.hi = this.uHi[sp];
    }

    /** True if this position already happened since the last irreversible move. */
    repeats() {
        const stop = Math.max(0, this.sp - this.half);
        for (let i = this.sp - 2; i >= stop; i -= 2) if (this.uLo[i] === this.lo && this.uHi[i] === this.hi) return true;
        return false;
    }

    /** Neither side can possibly mate. */
    dead() {
        const c = this.counts;
        if (c[P] || c[P | 8] || c[R] || c[R | 8] || c[Q] || c[Q | 8]) return false;
        const knights = c[N] + c[N | 8], bishops = c[B] + c[B | 8];
        if (knights + bishops <= 1) return true;
        if (knights) return false;
        let shade = -1;
        for (let sq = 0; sq < 120; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            if ((this.b[sq] & 7) === B) {
                const s = (sq + (sq >> 4)) & 1;
                if (shade >= 0 && s !== shade) return false;
                shade = s;
            }
        }
        return true;
    }

    /** Could this side ever deliver mate with what it has, for flag falls? */
    canMate(side) {
        const c = this.counts, s = side, e = side ^ 8;
        if (c[P | s] || c[R | s] || c[Q | s]) return true;
        const minors = c[N | s] + c[B | s];
        if (minors === 0) return false;
        if (minors === 1) return !!(c[P | e] || c[R | e] || c[Q | e] || c[N | e] || c[B | e]);
        return true;
    }

    legal() {
        const list = new Int32Array(256), n = this.gen(list), out = [];
        for (let i = 0; i < n; i++) {
            this.make(list[i]);
            if (!this.illegal()) out.push(list[i]);
            this.unmake();
        }
        return out;
    }

    uci(m) {
        const pr = m >> 14 & 7;
        return sqName(m & 127) + sqName(m >> 7 & 127) + (pr ? " pnbrqk"[pr] : "");
    }

    fromUci(s) {
        return this.legal().find((m) => this.uci(m) === s) ?? 0;
    }

    san(m) {
        const from = mFrom(m), to = mTo(m), p = this.b[from], t = p & 7, cap = this.b[to] || mFlag(m) === EP;
        let s;
        if (mFlag(m) === CASTLE) s = to > from ? "O-O" : "O-O-O";
        else if (t === P) {
            s = (cap ? "abcdefgh"[from & 7] + "x" : "") + sqName(to);
            if (mPromo(m)) s += "=" + " PNBRQK"[mPromo(m)];
        } else {
            const rivals = this.legal().filter((o) => mTo(o) === to && mFrom(o) !== from && this.b[mFrom(o)] === p);
            let which = "";
            if (rivals.length) {
                const sameFile = rivals.some((o) => (mFrom(o) & 7) === (from & 7)), sameRank = rivals.some((o) => mFrom(o) >> 4 === from >> 4);
                if (!sameFile) which = "abcdefgh"[from & 7];
                else if (!sameRank) which = String(1 + (from >> 4));
                else which = sqName(from);
            }
            s = " PNBRQK"[t] + which + (cap ? "x" : "") + sqName(to);
        }
        this.make(m);
        if (this.inCheck()) s += this.legal().length ? "+" : "#";
        this.unmake();
        return s;
    }
}

export function perft(pos, depth) {
    if (depth === 0) return 1;
    const list = new Int32Array(256), n = pos.gen(list);
    let nodes = 0;
    for (let i = 0; i < n; i++) {
        pos.make(list[i]);
        if (!pos.illegal()) nodes += perft(pos, depth - 1);
        pos.unmake();
    }
    return nodes;
}

/** A game: start position plus moves, with every rule that needs history. */
export class ChessGame {
    constructor(fen = START_FEN, uciMoves = []) {
        this.startFen = fen;
        this.pos = new Position(fen);
        this.history = []; // { m, san, uci, moved, captured, capturedSq, promo, side, fenKey }
        this.keys = [this.repKey()];
        for (const u of uciMoves) {
            const m = this.pos.fromUci(u);
            if (!m) throw new Error(`Bad move ${u} in saved game`);
            this.play(m);
        }
    }

    /** What makes two positions "the same" for threefold: FIDE counts en passant only if it can really be played. */
    repKey() {
        const p = this.pos, parts = p.fen().split(" ");
        if (p.ep >= 0 && !p.legal().some((m) => mFlag(m) === EP)) parts[3] = "-";
        return parts.slice(0, 4).join(" ");
    }

    get turn() { return this.pos.side; }
    legal() { return this.pos.legal(); }
    legalFrom(sq) { return this.pos.legal().filter((m) => mFrom(m) === sq); }

    play(m) {
        const p = this.pos, side = p.side, from = mFrom(m), to = mTo(m), ep = mFlag(m) === EP;
        const capturedSq = ep ? to + (side ? 16 : -16) : to, captured = p.b[capturedSq] || 0;
        const rec = { m, san: p.san(m), uci: p.uci(m), moved: p.b[from], captured, capturedSq, promo: mPromo(m), side };
        p.make(m);
        this.history.push(rec);
        this.keys.push(this.repKey());
        return rec;
    }

    undo() {
        if (!this.history.length) return null;
        this.pos.unmake();
        this.keys.pop();
        return this.history.pop();
    }

    repetitions() {
        const k = this.keys[this.keys.length - 1];
        return this.keys.reduce((n, x) => n + (x === k ? 1 : 0), 0);
    }

    /** { over, result: "white"|"black"|"draw"|null, reason, check } */
    status() {
        const p = this.pos, moves = p.legal(), check = p.inCheck();
        const out = (result, reason) => ({ over: true, result, reason, check });
        if (!moves.length) return check ? out(p.side ? "white" : "black", "checkmate") : out("draw", "stalemate");
        if (p.dead()) return out("draw", "insufficient material");
        if (this.repetitions() >= 3) return out("draw", "threefold repetition");
        if (p.half >= 100) return out("draw", "fifty-move rule");
        return { over: false, result: null, reason: "", check };
    }

    ucis() { return this.history.map((h) => h.uci); }
}

// ------------------------------------------------------------------------------------------------
// Evaluation and search
// ------------------------------------------------------------------------------------------------

export const MATE = 30000;
const INF = 32000, MAX_PLY = 80;

/** Style knobs. All in centipawns unless noted. */
export const NEUTRAL_STYLE = {
    noise: 0,        // random wobble per position: the main way to play worse
    attack: 6,       // pieces near the enemy king
    shelter: 10,     // pawns in front of your own king
    mobility: 3,     // squares for sliders
    pawnPush: 0,     // extra for advanced pawns
    structure: 1,    // scales doubled and isolated pawn penalties
    bishopPair: 30,
    knightLove: 0,
    queenOut: 0,     // early queen adventures, positive likes them
    greed: 1,        // scales the value of enemy material
    contempt: 0,     // score of a draw, from the engine's side
};

const FILE_MASK_SIZE = 8; // one slot per file

export function evaluate(p, st, side = p.side) {
    const b = p.b;
    const wPawn = evaluate.wp, bPawn = evaluate.bp;
    wPawn.fill(0); bPawn.fill(0);
    let wMost = evaluate.wm, bMost = evaluate.bm;
    wMost.fill(-1); bMost.fill(8);
    let wLeast = evaluate.wl, bLeast = evaluate.bl;
    wLeast.fill(8); bLeast.fill(-1);
    const wk = p.kings[0], bk = p.kings[1];
    const phase = Math.min(24, p.phase);
    let mg = p.mg, eg = p.eg, extra = 0;
    // First pass: pawn files.
    for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const q = b[sq];
        if (q === P) {
            const f = sq & 7, r = sq >> 4;
            wPawn[f]++;
            if (r > wMost[f]) wMost[f] = r;
            if (r < wLeast[f]) wLeast[f] = r;
        } else if (q === (P | 8)) {
            const f = sq & 7, r = sq >> 4;
            bPawn[f]++;
            if (r < bMost[f]) bMost[f] = r;
            if (r > bLeast[f]) bLeast[f] = r;
        }
    }
    const attack = st.attack, mob = st.mobility;
    for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const q = b[sq];
        if (!q) continue;
        const t = q & 7, white = !(q & 8), f = sq & 7, r = sq >> 4;
        if (t === P) {
            if (white) {
                if (wPawn[f] > 1) { mg -= 6 * st.structure; eg -= 14 * st.structure; }
                if (!(f > 0 && wPawn[f - 1]) && !(f < 7 && wPawn[f + 1])) { mg -= 9 * st.structure; eg -= 10 * st.structure; }
                if (r >= wMost[f] && !(bLeast[f] > r) && !(f > 0 && bLeast[f - 1] > r) && !(f < 7 && bLeast[f + 1] > r)) {
                    const bonus = PASSED[r];
                    mg += bonus >> 1; eg += bonus;
                }
                extra += st.pawnPush * Math.max(0, r - 2);
            } else {
                const rr = 7 - r;
                if (bPawn[f] > 1) { mg += 6 * st.structure; eg += 14 * st.structure; }
                if (!(f > 0 && bPawn[f - 1]) && !(f < 7 && bPawn[f + 1])) { mg += 9 * st.structure; eg += 10 * st.structure; }
                if (r <= bMost[f] && !(wLeast[f] < r) && !(f > 0 && wLeast[f - 1] < r) && !(f < 7 && wLeast[f + 1] < r)) {
                    const bonus = PASSED[rr];
                    mg -= bonus >> 1; eg -= bonus;
                }
                extra -= st.pawnPush * Math.max(0, rr - 2);
            }
            continue;
        }
        if (t === K) continue;
        const enemyK = white ? bk : wk, sign = white ? 1 : -1;
        const dist = Math.max(Math.abs(f - (enemyK & 7)), Math.abs(r - (enemyK >> 4)));
        extra += sign * attack * ATTACK_WEIGHT[t] * (7 - dist) >> 1;
        if (t === N) extra += sign * st.knightLove;
        if (t === B || t === R || t === Q) {
            // Cheap mobility: count free squares along the first steps of each ray.
            const dirs = t === B ? BISHOP_D : t === R ? ROOK_D : KING_D, n = t === Q ? 8 : 4;
            let free = 0;
            for (let i = 0; i < n; i++) {
                let to = sq + dirs[i];
                for (let step = 0; step < 4 && !(to & 0x88); step++, to += dirs[i]) {
                    if (b[to]) break;
                    free++;
                }
            }
            extra += sign * mob * (t === Q ? free >> 1 : free);
            if (t === R) {
                const own = white ? wPawn[f] : bPawn[f], other = white ? bPawn[f] : wPawn[f];
                if (!own) { mg += sign * (other ? 12 : 26); eg += sign * (other ? 6 : 14); }
                if ((white ? r === 6 : r === 1)) { mg += sign * 14; eg += sign * 22; }
            }
            if (t === Q && st.queenOut && (p.sp < 14)) extra += sign * st.queenOut;
        }
    }
    if (p.counts[B] >= 2) extra += st.bishopPair;
    if (p.counts[B | 8] >= 2) extra -= st.bishopPair;
    // King shelter, middlegame only.
    if (phase > 8) {
        mg += st.shelter * (shelter(b, wk, P, 16) - shelter(b, bk, P | 8, -16));
    }
    // Greed: count enemy material as worth more.
    if (st.greed !== 1) {
        const c = p.counts;
        const mw = 300 * (c[N] + c[B]) + 500 * c[R] + 900 * c[Q] + 100 * c[P];
        const mb = 300 * (c[N | 8] + c[B | 8]) + 500 * c[R | 8] + 900 * c[Q | 8] + 100 * c[P | 8];
        extra += (side === WHITE ? -mb : mw) * (st.greed - 1);
    }
    let score = ((mg * phase + eg * (24 - phase)) / 24 | 0) + (extra | 0);
    // Mop-up: drive a bare king to the edge so that won endgames finish.
    if (phase <= 6) {
        const margin = score;
        if (Math.abs(margin) > 350) {
            const lk = margin > 0 ? bk : wk, wnk = margin > 0 ? wk : bk;
            const cf = Math.abs((lk & 7) * 2 - 7), cr = Math.abs((lk >> 4) * 2 - 7);
            const near = 14 - Math.abs((lk & 7) - (wnk & 7)) - Math.abs((lk >> 4) - (wnk >> 4));
            score += (margin > 0 ? 1 : -1) * (cf + cr) * 6 + (margin > 0 ? 1 : -1) * near * 4;
        }
    }
    if (st.noise) {
        // A wobble fixed per position, so that repeated looks agree and hash tables stay honest.
        const h = Math.imul(p.lo ^ st.salt, 0x9e3779b1) ^ p.hi;
        score += ((h >>> 8 & 0xffff) / 65535 - 0.5) * 2 * st.noise | 0;
    }
    return (side === WHITE ? score : -score) + 12;
}
evaluate.wp = new Int8Array(FILE_MASK_SIZE); evaluate.bp = new Int8Array(FILE_MASK_SIZE);
evaluate.wm = new Int8Array(FILE_MASK_SIZE); evaluate.bm = new Int8Array(FILE_MASK_SIZE);
evaluate.wl = new Int8Array(FILE_MASK_SIZE); evaluate.bl = new Int8Array(FILE_MASK_SIZE);
const PASSED = [0, 6, 12, 24, 46, 84, 140, 0];
const ATTACK_WEIGHT = [0, 0, 2, 2, 3, 5, 0];

function shelter(b, king, pawn, up) {
    let n = 0;
    for (let d = -1; d <= 1; d++) {
        const a = king + up + d;
        if (a & 0x88) continue;
        if (b[a] === pawn) { n += 2; continue; }
        const c = a + up;
        if (!(c & 0x88) && b[c] === pawn) n += 1;
    }
    return n - 3;
}

const TT_EXACT = 1, TT_LOWER = 2, TT_UPPER = 3;
const VICTIM = [0, 100, 320, 330, 500, 900, 0];

// Search frame states.
const ENTER = 0, AFTER_NULL = 1, GENERATE = 2, NEXT = 3, AFTER_CHILD = 4;

/**
 * Iterative-deepening alpha-beta, written as a state machine over an explicit stack so that it can stop and carry on
 * at any node. A Worker runs it flat out. Without one, the frame loop gives it a few milliseconds at a time, and the
 * code path is identical. Quiescence is an ordinary recursion: it's short, and it finishes inside one slice.
 */
export class Search {
    constructor(ttBits = 19) {
        this.pos = new Position();
        const size = 1 << ttBits;
        this.ttMask = size - 1;
        this.ttLo = new Int32Array(size); this.ttHi = new Int32Array(size);
        this.ttMove = new Int32Array(size);
        this.ttData = new Int32Array(size); // score<<8 (signed) | depth<<2 | bound
        this.list = Array.from({ length: MAX_PLY + 2 }, () => new Int32Array(256));
        this.scores = Array.from({ length: MAX_PLY + 2 }, () => new Int32Array(256));
        this.qlist = Array.from({ length: 64 }, () => new Int32Array(128));
        this.qscore = Array.from({ length: 64 }, () => new Int32Array(128));
        this.killers = new Int32Array((MAX_PLY + 2) * 2);
        this.history = new Int32Array(16 * 128);
        const n = MAX_PLY + 2;
        this.st = new Int8Array(n); this.A = new Int32Array(n); this.Be = new Int32Array(n); this.D = new Int32Array(n);
        this.best = new Int32Array(n); this.bestM = new Int32Array(n); this.alpha0 = new Int32Array(n); this.I = new Int32Array(n);
        this.Cnt = new Int32Array(n); this.Legal = new Int32Array(n); this.Cur = new Int32Array(n); this.Mode = new Int32Array(n);
        this.Chk = new Int8Array(n); this.Ttm = new Int32Array(n); this.Eval = new Int32Array(n); this.Red = new Int32Array(n);
        this.done = true;
        this.result = null;
    }

    /**
     * fen + moves: the game so far, so repetitions are seen.
     * o: { maxDepth, maxNodes, maxMs, style, spread, seed }. `spread` scores every root move properly so weak players
     * can pick among them.
     */
    start(fen, moves, o = {}) {
        const p = this.pos;
        p.load(fen);
        for (const u of moves) {
            const m = p.fromUci(u);
            if (m) p.make(m);
        }
        this.ttLo.fill(0); this.ttHi.fill(0); this.ttData.fill(0); this.ttMove.fill(0);
        this.history.fill(0); this.killers.fill(0);
        this.style = { ...NEUTRAL_STYLE, ...(o.style ?? {}), salt: (o.seed ?? 1) * 2654435761 | 0 };
        this.maxDepth = Math.min(o.maxDepth ?? 64, MAX_PLY - 4);
        this.maxNodes = o.maxNodes ?? Infinity;
        this.maxMs = o.maxMs ?? Infinity;
        this.spread = !!o.spread;
        this.engineSide = p.side;
        this.nodes = 0;
        this.ply = 0;
        this.depth = 0;
        this.t0 = now();
        this.rootScores = new Map();
        this.bestMove = 0;
        this.bestScore = 0;
        this.completedDepth = 0;
        this.ret = 0;
        this.done = false;
        this.result = null;
        const legal = p.legal();
        if (!legal.length) { this.finish(); return; }
        this.bestMove = legal[0];
        this.legalCount = legal.length;
        this.nextIteration();
    }

    nextIteration() {
        this.depth++;
        this.ply = 0;
        this.rootBest = 0;
        this.rootBestScore = -INF;
        this.enter(0, this.depth, -INF, INF);
    }

    enter(ply, depth, alpha, beta) {
        this.st[ply] = ENTER; this.D[ply] = depth; this.A[ply] = alpha; this.Be[ply] = beta;
    }

    finish() {
        this.done = true;
        const scores = [...this.rootScores.entries()].map(([m, s]) => ({ uci: rawUci(m), score: s }));
        this.result = { move: this.bestMove ? rawUci(this.bestMove) : null, score: this.bestScore, depth: this.completedDepth, nodes: this.nodes, ms: Math.round(now() - this.t0), roots: scores };
    }

    /** Stop now with the best so far. The position is left mid-tree, which is fine: start() always reloads it. */
    stop() {
        if (!this.done) this.finish();
    }

    ttStore(depth, score, bound, move, ply) {
        if (score > MATE - 500) score += ply; else if (score < -MATE + 500) score -= ply;
        const p = this.pos, i = p.lo & this.ttMask, old = this.ttData[i];
        if (old && (old >> 2 & 63) > depth + 2 && this.ttLo[i] !== p.lo) return;
        this.ttLo[i] = p.lo; this.ttHi[i] = p.hi; this.ttMove[i] = move; this.ttData[i] = score << 8 | depth << 2 | bound;
    }

    /**
     * Run until `until` (a performance.now() time) or until the search ends. Returns true when finished.
     * This is the whole negamax. Each loop handles one state of the frame at this.ply; a child's value comes back in this.ret.
     */
    run(until = Infinity) {
        if (this.done) return true;
        const p = this.pos, st = this.st, A = this.A, Be = this.Be, D = this.D;
        let tick = 0;
        for (;;) {
            if (this.done) return true;
            if (++tick >= 256) {
                tick = 0;
                const t = now();
                if (t - this.t0 > this.maxMs || this.nodes > this.maxNodes) {
                    if (this.completedDepth >= 1) { this.finish(); return true; }
                }
                if (t >= until) return false;
            }
            const ply = this.ply;
            switch (st[ply]) {
                case ENTER: {
                    this.nodes++;
                    const beta = Be[ply];
                    let alpha = A[ply], depth = D[ply];
                    if (ply > 0) {
                        if (p.half >= 100 || p.repeats() || p.dead()) { this.leave(p.side === this.engineSide ? -this.style.contempt : this.style.contempt); continue; }
                        // A shorter mate is already in hand.
                        const mateBound = MATE - ply;
                        if (alpha >= mateBound) { this.leave(alpha); continue; }
                    }
                    const chk = p.inCheck();
                    this.Chk[ply] = chk ? 1 : 0;
                    if (chk && ply < MAX_PLY - 8) depth++;
                    D[ply] = depth;
                    if (depth <= 0 || ply >= MAX_PLY - 2) { this.leave(this.qsearch(alpha, beta, ply, 0)); continue; }
                    const i = p.lo & this.ttMask;
                    let ttMove = 0;
                    const pv = beta - alpha > 1;
                    if (this.ttLo[i] === p.lo && this.ttHi[i] === p.hi && this.ttData[i]) {
                        const data = this.ttData[i], bound = data & 3, td = data >> 2 & 63;
                        let s = data >> 8;
                        if (s > MATE - 500) s -= ply; else if (s < -MATE + 500) s += ply;
                        ttMove = this.ttMove[i];
                        if (ply > 0 && !pv && td >= depth && (bound === TT_EXACT || bound === TT_LOWER && s >= beta || bound === TT_UPPER && s <= alpha)) {
                            this.leave(s); continue;
                        }
                    }
                    this.Ttm[ply] = ttMove;
                    this.Eval[ply] = chk ? -INF : evaluate(p, this.style);
                    this.alpha0[ply] = alpha;
                    if (!pv && !chk && Math.abs(beta) < MATE - 500) {
                        const stat = this.Eval[ply];
                        // Reverse futility: far above beta close to the leaves.
                        if (depth <= 3 && stat - 110 * depth >= beta) { this.leave(stat - 110 * depth); continue; }
                        // Null move: if passing still holds, the position is good enough.
                        const us = p.side, majors = p.counts[N | us] + p.counts[B | us] + p.counts[R | us] + p.counts[Q | us];
                        if (depth >= 3 && majors > 0 && stat >= beta && this.Cur[ply - 1 < 0 ? 0 : ply - 1] !== 0) {
                            const r = 2 + (depth >= 7 ? 1 : 0);
                            p.makeNull();
                            this.Cur[ply] = 0;
                            st[ply] = AFTER_NULL;
                            this.ply = ply + 1;
                            this.enter(ply + 1, depth - 1 - r, -beta, -beta + 1);
                            continue;
                        }
                    }
                    st[ply] = GENERATE;
                    continue;
                }
                case AFTER_NULL: {
                    p.unmakeNull();
                    const s = -this.ret;
                    if (s >= Be[ply] && Math.abs(s) < MATE - 500) { this.leave(s); continue; }
                    st[ply] = GENERATE;
                    continue;
                }
                case GENERATE: {
                    const list = this.list[ply], score = this.scores[ply], n = p.gen(list), ttm = this.Ttm[ply];
                    const k0 = this.killers[ply * 2], k1 = this.killers[ply * 2 + 1], b = p.b;
                    for (let i = 0; i < n; i++) {
                        const m = list[i], to = m >> 7 & 127, from = m & 127, cap = b[to], pr = m >> 14 & 7;
                        let s;
                        if (m === ttm) s = 1 << 28;
                        else if (cap || (m >> 17 & 7) === EP) s = (1 << 24) + VICTIM[cap & 7] * 16 - VICTIM[b[from] & 7] / 16;
                        else if (pr === Q) s = (1 << 24) + 800;
                        else if (m === k0) s = 1 << 23;
                        else if (m === k1) s = (1 << 23) - 1;
                        else s = this.history[b[from] * 128 + to];
                        score[i] = s;
                    }
                    this.Cnt[ply] = n; this.I[ply] = 0; this.Legal[ply] = 0;
                    this.best[ply] = -INF; this.bestM[ply] = 0;
                    st[ply] = NEXT;
                    continue;
                }
                case NEXT: {
                    const i = this.I[ply], n = this.Cnt[ply];
                    if (i >= n) { this.closeNode(ply); continue; }
                    const list = this.list[ply], score = this.scores[ply];
                    let top = i;
                    for (let j = i + 1; j < n; j++) if (score[j] > score[top]) top = j;
                    const m = list[top], ms = score[top];
                    list[top] = list[i]; score[top] = score[i]; list[i] = m; score[i] = ms;
                    this.I[ply] = i + 1;
                    const depth = D[ply], legal = this.Legal[ply], chk = this.Chk[ply];
                    const quiet = ms < 1 << 23;
                    p.make(m);
                    if (p.illegal()) { p.unmake(); continue; }
                    // Futility and late-move pruning near the leaves, but never a quiet check: that's how mates get missed.
                    if (ply > 0 && quiet && !chk && legal > 0 && this.best[ply] > -MATE + 500 && !(m >> 14 & 7)) {
                        if ((depth <= 2 && this.Eval[ply] + 140 * depth <= A[ply] || depth <= 3 && legal >= 6 + depth * depth * 2) && !p.inCheck()) {
                            p.unmake();
                            this.Legal[ply] = legal + 1;
                            continue;
                        }
                    }
                    this.Legal[ply] = legal + 1;
                    this.Cur[ply] = m;
                    if (ply === 0 && !this.spread) this.rootMoveIndex = legal;
                    let alpha = A[ply];
                    const beta = Be[ply];
                    if (ply === 0 && this.spread) alpha = -INF;
                    this.ply = ply + 1;
                    st[ply] = AFTER_CHILD;
                    if (legal === 0 || (ply === 0 && this.spread)) {
                        this.Mode[ply] = 2; this.Red[ply] = 0;
                        this.enter(ply + 1, depth - 1, -beta, -alpha);
                    } else {
                        let r = 0;
                        if (depth >= 3 && legal >= 3 && quiet && !chk) {
                            r = 1 + (depth >= 6 ? 1 : 0) + (legal >= 12 ? 1 : 0);
                            if (p.inCheck()) r = 0;
                        }
                        this.Red[ply] = r;
                        this.Mode[ply] = 0;
                        this.enter(ply + 1, depth - 1 - r, -alpha - 1, -alpha);
                    }
                    continue;
                }
                case AFTER_CHILD: {
                    const s = -this.ret, depth = D[ply], beta = Be[ply];
                    let alpha = A[ply];
                    if (ply === 0 && this.spread) alpha = -INF;
                    const mode = this.Mode[ply];
                    if (mode === 0 && s > alpha) {
                        if (this.Red[ply] > 0) {
                            this.Mode[ply] = 1; this.Red[ply] = 0;
                            this.ply = ply + 1;
                            this.enter(ply + 1, depth - 1, -alpha - 1, -alpha);
                            continue;
                        }
                        if (s < beta) {
                            this.Mode[ply] = 2;
                            this.ply = ply + 1;
                            this.enter(ply + 1, depth - 1, -beta, -alpha);
                            continue;
                        }
                    } else if (mode === 1 && s > alpha && s < beta) {
                        this.Mode[ply] = 2;
                        this.ply = ply + 1;
                        this.enter(ply + 1, depth - 1, -beta, -alpha);
                        continue;
                    }
                    p.unmake();
                    const m = this.Cur[ply];
                    if (ply === 0) this.rootScores.set(m, s);
                    if (s > this.best[ply]) {
                        this.best[ply] = s;
                        if (s > alpha) {
                            this.bestM[ply] = m;
                            if (!(ply === 0 && this.spread)) A[ply] = s;
                            if (ply === 0) { this.rootBest = m; this.rootBestScore = s; if (this.depth > 1 || !this.bestMove) { this.bestMove = m; this.bestScore = s; } }
                            if (s >= beta) {
                                const to = m >> 7 & 127, b = p.b;
                                if (!b[to] && !(m >> 14 & 7) && (m >> 17 & 7) !== EP) {
                                    if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
                                    const h = b[m & 127] * 128 + to;
                                    this.history[h] = Math.min(this.history[h] + depth * depth, 1 << 22);
                                }
                                this.closeNode(ply);
                                continue;
                            }
                        }
                    }
                    st[ply] = NEXT;
                    continue;
                }
            }
        }
    }

    closeNode(ply) {
        const p = this.pos;
        if (!this.Legal[ply]) { this.leave(this.Chk[ply] ? -MATE + ply : 0); return; }
        const best = this.best[ply], bm = this.bestM[ply], beta = this.Be[ply];
        if (!(ply === 0 && this.spread)) {
            const bound = best >= beta ? TT_LOWER : best > this.alpha0[ply] ? TT_EXACT : TT_UPPER;
            this.ttStore(this.D[ply], best, bound, bm, ply);
        }
        this.leave(best);
    }

    /** Return a value from this frame to its parent, or finish the iteration at the root. */
    leave(v) {
        if (this.ply > 0) { this.ret = v; this.ply--; return; }
        // Iteration done.
        this.completedDepth = this.depth;
        if (this.rootBest) { this.bestMove = this.rootBest; this.bestScore = this.rootBestScore; }
        const mated = Math.abs(this.bestScore) > MATE - 200;
        if (this.depth >= this.maxDepth || mated || this.legalCount === 1 || this.nodes > this.maxNodes || now() - this.t0 > this.maxMs * 0.55) { this.finish(); return; }
        this.nextIteration();
    }

    qsearch(alpha, beta, ply, qply) {
        const p = this.pos;
        this.nodes++;
        const stand = evaluate(p, this.style);
        if (qply >= 16 || ply >= MAX_PLY - 1) return stand;
        if (stand >= beta) return stand;
        if (stand > alpha) alpha = stand;
        const list = this.qlist[qply], score = this.qscore[qply], n = p.gen(list, true), b = p.b;
        for (let i = 0; i < n; i++) {
            const m = list[i], cap = b[m >> 7 & 127];
            score[i] = VICTIM[cap & 7] * 16 - VICTIM[b[m & 127] & 7] / 16 + ((m >> 14 & 7) === Q ? 800 : 0) + ((m >> 17 & 7) === EP ? 100 : 0);
        }
        let best = stand;
        for (let i = 0; i < n; i++) {
            let top = i;
            for (let j = i + 1; j < n; j++) if (score[j] > score[top]) top = j;
            const m = list[top], ms = score[top];
            list[top] = list[i]; score[top] = score[i]; list[i] = m; score[i] = ms;
            // Delta pruning: even winning this piece can't reach alpha.
            const gain = VICTIM[b[m >> 7 & 127] & 7] + ((m >> 14 & 7) ? 800 : 0) + ((m >> 17 & 7) === EP ? 100 : 0);
            if (stand + gain + 200 < alpha) continue;
            p.make(m);
            if (p.illegal()) { p.unmake(); continue; }
            const s = -this.qsearch(-beta, -alpha, ply + 1, qply + 1);
            p.unmake();
            if (s > best) {
                best = s;
                if (s > alpha) { alpha = s; if (s >= beta) break; }
            }
        }
        return best;
    }
}

const rawUci = (m) => {
    const pr = m >> 14 & 7;
    return sqName(m & 127) + sqName(m >> 7 & 127) + (pr ? " pnbrqk"[pr] : "");
};
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
