// SUGAR CRASH rules. Pure logic with no Pogo imports, so bots run it thousands of times a second and the view
// is only an animator: every action resolves at once and returns a list of phases for the view to replay.
export const W = 8, H = 9, N = W * H;
export const NONE = 0, CANDY = 1, STRIPE_H = 2, STRIPE_V = 3, BONBON = 4, STAR = 5, BEE = 6, MALLOW = 7, FOLK = 8;
export const isSpecial = (k) => k >= STRIPE_H && k <= BEE;
const coloured = (k) => k >= CANDY && k <= BONBON || k === BEE;

const xOf = (i) => i % W, yOf = (i) => (i - i % W) / W;
const dist = (a, b) => Math.abs(xOf(a) - xOf(b)) + Math.abs(yOf(a) - yOf(b));
export const neighbours = (i) => {
    const x = xOf(i), y = yOf(i), out = [];
    if (x > 0) out.push(i - 1);
    if (x < W - 1) out.push(i + 1);
    if (y > 0) out.push(i - W);
    if (y < H - 1) out.push(i + W);
    return out;
};

export class Match {
    /**
     * def: { rows?: string[9] layout, colors, moves, goals, feedNeed, folk, folkMax, bites, biteEvery, endless }
     * Layout characters: `.` candy, ` ` gap, `f` frost, `F` frost x2, `c` `C` `K` cookie 1/2/3,
     * `l` caged candy, `L` caged on frost, `m` marshmallow, `u` fudge, `U` fudge on frost, `0`-`5` a set candy.
     */
    constructor(def, seed = 1) {
        this.def = def; this.seedValue = seed >>> 0;
        this.rs = (seed * 2654435761 + 1) >>> 0;
        this.colors = def.colors ?? 5;
        this.mask = new Uint8Array(N); this.frost = new Uint8Array(N); this.cookie = new Uint8Array(N);
        this.fudge = new Uint8Array(N); this.cage = new Uint8Array(N);
        this.pid = new Int32Array(N); this.pc = new Int8Array(N).fill(-1); this.pk = new Uint8Array(N);
        this.stamp = new Int32Array(N); this.burstId = 0; this.nextId = 1;
        this.moves = def.moves ?? 20; this.movesUsed = 0; this.score = 0; this.feed = 0;
        this.feedNeed = def.feedNeed ?? 42;
        this.endless = !!def.endless;
        this.folkTotal = def.folk ?? 0; this.folkLeft = this.folkTotal; this.folkDone = 0;
        this.counts = { c: [0, 0, 0, 0, 0, 0], mallow: 0, candies: 0, specials: 0, maxChain: 0, reshuffles: 0, rescues: 0, chomps: 0, bestBurst: 0 };
        this.fudgeHit = false; this.bitesDone = 0; this.won = false; this.lost = false;
        this.quiet = false; this.phases = []; this.q = []; this.ev = null; this.fresh = -1;
        this.setup();
        this.checkEnd();
    }

    rnd(n) {
        let t = (this.rs = (this.rs + 0x6d2b79f5) | 0);
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (((t ^ (t >>> 14)) >>> 0) % n);
    }

    /** A cheap copy for bots to look ahead with. It records no phases. */
    clone() {
        const b = Object.create(Match.prototype);
        Object.assign(b, this);
        for (const k of ["mask", "frost", "cookie", "fudge", "cage", "pid", "pc", "pk", "stamp"]) b[k] = this[k].slice();
        b.counts = { ...this.counts, c: this.counts.c.slice() };
        b.goals = this.goals.map((g) => ({ ...g })); b.q = []; b.phases = []; b.quiet = true; b.ev = null;
        return b;
    }

    setup() {
        const rows = this.def.rows ?? [], preset = new Int8Array(N).fill(-1);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = x + y * W, ch = rows[y]?.[x] ?? ".";
            if (ch === " ") continue;
            this.mask[i] = 1;
            switch (ch) {
                case "f": this.frost[i] = 1; break;
                case "F": this.frost[i] = 2; break;
                case "c": this.cookie[i] = 1; break;
                case "C": this.cookie[i] = 2; break;
                case "K": this.cookie[i] = 3; break;
                case "l": this.cage[i] = 1; break;
                case "L": this.cage[i] = 1; this.frost[i] = 1; break;
                case "u": this.fudge[i] = 1; break;
                case "U": this.fudge[i] = 1; this.frost[i] = 1; break;
                case "m": this.pk[i] = MALLOW; this.pid[i] = this.nextId++; break;
                default: if (ch >= "0" && ch <= "5") preset[i] = +ch;
            }
        }
        this.fill(preset);
        this.goals = (this.def.goals ?? []).map((g) => ({ ...g, have: 0 }));
        for (const g of this.goals) {
            if (g.t === "frost" || g.t === "cookie" || g.t === "fudge" || g.t === "cage") g.n = this.remaining(g);
            if (g.t === "mallow") g.n = this.pk.reduce((a, k) => a + (k === MALLOW ? 1 : 0), 0);
            if (g.t === "folk") g.n = this.folkTotal;
        }
        const folkStart = Math.min(this.def.folkStart ?? this.def.folkMax ?? 1, this.folkLeft);
        for (let n = 0, x = this.rnd(W); n < folkStart; n++, x = (x + 3) % W) {
            for (let y = 0; y < H; y++) {
                const i = x + y * W;
                if (this.pk[i] === CANDY && !this.cage[i]) { this.pk[i] = FOLK; this.pc[i] = -1; this.folkLeft--; break; }
            }
        }
    }

    /** A random board with no ready matches and at least a few moves. Set candies stay put. */
    fill(preset) {
        const slots = [];
        for (let i = 0; i < N; i++) if (this.mask[i] && !this.cookie[i] && !this.fudge[i] && !this.pk[i]) slots.push(i);
        for (let attempt = 0; attempt < 400; attempt++) {
            for (const i of slots) { this.pk[i] = CANDY; this.pc[i] = preset[i]; }
            for (const i of slots) {
                if (preset[i] >= 0) continue;
                this.pc[i] = this.safeColour(i);
            }
            if (preset.some((v) => v >= 0)) break;
            if (this.legal().length >= Math.min(3, Math.max(1, slots.length >> 3))) break;
        }
        for (const i of slots) this.pid[i] = this.nextId++;
    }

    safeColour(i) {
        const start = this.rnd(this.colors);
        for (let n = 0; n < this.colors; n++) {
            const c = (start + n) % this.colors;
            this.pc[i] = c;
            if (!this.matchAt(i)) return c;
        }
        return start;
    }

    // --- Queries --------------------------------------------------------------------------------------------
    fixed(i) { return !this.mask[i] || this.cookie[i] || this.fudge[i] || this.cage[i]; }
    movable(i) { return this.pk[i] !== NONE && !this.cage[i]; }
    colourAt(i) { return coloured(this.pk[i]) ? this.pc[i] : -1; }

    /** Is the candy at i part of a line of three or a 2x2 block? */
    matchAt(i) {
        const c = this.colourAt(i);
        if (c < 0) return false;
        const x = xOf(i), y = yOf(i), at = (a, b) => (a >= 0 && a < W && b >= 0 && b < H ? this.colourAt(a + b * W) === c : false);
        let n = 1;
        for (let a = x - 1; at(a, y); a--) n++;
        for (let a = x + 1; at(a, y); a++) n++;
        if (n >= 3) return true;
        n = 1;
        for (let b = y - 1; at(x, b); b--) n++;
        for (let b = y + 1; at(x, b); b++) n++;
        if (n >= 3) return true;
        for (const dx of [-1, 1]) for (const dy of [-1, 1]) if (at(x + dx, y) && at(x, y + dy) && at(x + dx, y + dy)) return true;
        return false;
    }

    swapRaw(a, b) {
        for (const arr of [this.pid, this.pc, this.pk]) { const t = arr[a]; arr[a] = arr[b]; arr[b] = t; }
    }

    canSwap(a, b) {
        if (a === b || dist(a, b) !== 1 || !this.movable(a) || !this.movable(b)) return false;
        if (isSpecial(this.pk[a]) || isSpecial(this.pk[b])) return true;
        // Townsfolk may always step down a cell: nobody gets stranded.
        if ((this.pk[a] === FOLK && b === a + W) || (this.pk[b] === FOLK && a === b + W)) return true;
        this.swapRaw(a, b);
        const ok = this.matchAt(a) || this.matchAt(b);
        this.swapRaw(a, b);
        return ok;
    }

    legal() {
        const out = [];
        for (let i = 0; i < N; i++) {
            if (xOf(i) < W - 1 && this.canSwap(i, i + 1)) out.push([i, i + 1]);
            if (yOf(i) < H - 1 && this.canSwap(i, i + W)) out.push([i, i + W]);
        }
        return out;
    }

    hasMove() {
        for (let i = 0; i < N; i++) {
            if (xOf(i) < W - 1 && this.canSwap(i, i + 1)) return true;
            if (yOf(i) < H - 1 && this.canSwap(i, i + W)) return true;
        }
        return false;
    }

    remaining(g) {
        switch (g.t) {
            case "frost": { let n = 0; for (let i = 0; i < N; i++) n += this.frost[i]; return n; }
            case "cookie": { let n = 0; for (let i = 0; i < N; i++) n += this.cookie[i]; return n; }
            case "fudge": { let n = 0; for (let i = 0; i < N; i++) n += this.fudge[i]; return n; }
            case "c": return Math.max(0, g.n - this.counts.c[g.c]);
            case "mallow": return Math.max(0, g.n - this.counts.mallow);
            case "cage": { let n = 0; for (let i = 0; i < N; i++) n += this.cage[i]; return n; }
            case "folk": return Math.max(0, g.n - this.folkDone);
            case "score": return Math.max(0, g.n - this.score);
        }
        return 0;
    }

    get chompReady() { return this.feed >= this.feedNeed; }
    goalsMet() { return !this.endless && this.goals.every((g) => this.remaining(g) === 0); }

    checkEnd() {
        if (this.won || this.endless) return;
        if (this.goalsMet()) this.won = true;
        else if (this.moves <= 0 && !this.chompReady) this.lost = true;
    }

    // --- Actions --------------------------------------------------------------------------------------------
    begin() { this.phases = []; }
    /** Each phase carries the counters as they stood when it happened, so the HUD can replay them in step. */
    push(p) {
        if (this.quiet) return;
        p.snap = { score: this.score, moves: this.moves, feed: this.feed, left: this.goals.map((g) => this.remaining(g)) };
        this.phases.push(p);
    }

    /** The player swaps a and b. Returns phases, or null when the swap is refused (it does not cost a move). */
    play(a, b) {
        if (this.won || this.lost || (this.moves <= 0 && !this.endless) || !this.canSwap(a, b)) return null;
        this.begin();
        const ka = this.pk[a], kb = this.pk[b];
        this.push({ t: "swap", a, b, ida: this.pid[a], idb: this.pid[b] });
        this.swapRaw(a, b);
        if (!this.endless) this.moves--;
        this.movesUsed++;
        this.fudgeHit = false;
        const seed = isSpecial(ka) || isSpecial(kb) ? { a, b } : null;
        this.resolve([a, b], seed);
        this.endTurn(true);
        return this.phases;
    }

    /** Morsel bites a 3x3 chunk out of the board. Free, and it needs a full tummy. */
    chomp(i) {
        if (this.won || this.lost || !this.chompReady) return null;
        this.begin();
        this.feed -= this.feedNeed;
        this.counts.chomps++;
        const cells = [], x0 = xOf(i), y0 = yOf(i);
        for (let y = y0 - 1; y <= y0 + 1; y++) for (let x = x0 - 1; x <= x0 + 1; x++) if (x >= 0 && x < W && y >= 0 && y < H && this.mask[x + y * W]) cells.push(x + y * W);
        this.push({ t: "chomp", i, cells });
        this.fudgeHit = true;
        this.resolve(null, { chomp: cells, at: i });
        this.endTurn(false);
        return this.phases;
    }

    /** Leftover moves become a Sugar Rush of stripes. Called once after a win, for score and spectacle. */
    finale() {
        this.begin();
        let rounds = 0;
        const left = this.moves;
        this.bonusMoves = left; this.finaleOn = true;
        this.score += left * 500;
        for (; (this.moves > 0 || this.anySpecial()) && rounds < 8; rounds++) {
            const take = Math.min(this.moves, Math.max(2, Math.ceil(left / 3)));
            const pool = [];
            for (let i = 0; i < N; i++) if (this.pk[i] === CANDY && !this.cage[i]) pool.push(i);
            const turned = [];
            for (let n = 0; n < take && pool.length; n++) {
                const j = this.rnd(pool.length), i = pool[j];
                pool[j] = pool[pool.length - 1]; pool.pop();
                this.pk[i] = this.rnd(2) ? STRIPE_H : STRIPE_V;
                turned.push({ id: this.pid[i], i, k: this.pk[i] });
            }
            this.moves -= take;
            const specials = [];
            for (let i = 0; i < N; i++) if (isSpecial(this.pk[i]) && !this.cage[i]) specials.push(i);
            this.push({ t: "rush", turned, left: this.moves });
            this.resolve(null, { fire: specials });
        }
        this.moves = 0;
        return this.phases;
    }

    anySpecial() { for (let i = 0; i < N; i++) if (isSpecial(this.pk[i]) && !this.cage[i]) return true; return false; }
    addMoves(n) { this.moves += n; this.lost = false; }

    // --- Resolution -----------------------------------------------------------------------------------------
    resolve(prefer, seed) {
        let chain = 0;
        for (;;) {
            const groups = this.findGroups();
            if (!groups.length && !seed) {
                if (this.exitFolk()) { this.gravity(); continue; }
                break;
            }
            this.burst(groups, seed, prefer, chain);
            seed = null; prefer = null;
            this.gravity();
            chain++;
            if (chain > 300) break;
        }
        if (chain > this.counts.maxChain) this.counts.maxChain = chain;
    }

    /** Lines of three or more and 2x2 blocks, merged into connected same-colour groups. */
    findGroups() {
        const runs = [], owner = new Int16Array(N).fill(-1), parent = [];
        const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
        const addRun = (cells, dir, c) => {
            const r = runs.length;
            runs.push({ cells, dir, c }); parent.push(r);
            for (const i of cells) { if (owner[i] >= 0) parent[find(r)] = find(owner[i]); else owner[i] = r; }
        };
        for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
            const c = this.colourAt(x + y * W);
            let e = x + 1;
            while (e < W && c >= 0 && this.colourAt(e + y * W) === c) e++;
            if (c >= 0 && e - x >= 3) { const cells = []; for (let a = x; a < e; a++) cells.push(a + y * W); addRun(cells, 0, c); }
            x = e;
        }
        for (let x = 0; x < W; x++) for (let y = 0; y < H;) {
            const c = this.colourAt(x + y * W);
            let e = y + 1;
            while (e < H && c >= 0 && this.colourAt(x + e * W) === c) e++;
            if (c >= 0 && e - y >= 3) { const cells = []; for (let a = y; a < e; a++) cells.push(x + a * W); addRun(cells, 1, c); }
            y = e;
        }
        for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
            const i = x + y * W, c = this.colourAt(i);
            if (c >= 0 && this.colourAt(i + 1) === c && this.colourAt(i + W) === c && this.colourAt(i + W + 1) === c) addRun([i, i + 1, i + W, i + W + 1], 2, c);
        }
        const map = new Map();
        for (let r = 0; r < runs.length; r++) {
            const root = find(r);
            if (!map.has(root)) map.set(root, { runs: [], cells: new Set(), c: runs[r].c });
            const g = map.get(root);
            g.runs.push(runs[r]);
            for (const i of runs[r].cells) g.cells.add(i);
        }
        return [...map.values()];
    }

    /** What a matched group turns into, and where. */
    planSpecial(g, prefer) {
        const lines = g.runs.filter((r) => r.dir < 2);
        let kind = NONE, at = -1;
        const long = lines.reduce((a, r) => (a && a.cells.length >= r.cells.length ? a : r), null);
        if (long && long.cells.length >= 5) kind = STAR;
        else {
            let cross = -1;
            for (const r of lines) if (r.dir === 0) for (const q of lines) if (q.dir === 1) for (const i of r.cells) if (q.cells.includes(i)) cross = i;
            if (cross >= 0) { kind = BONBON; at = cross; }
            else if (long && long.cells.length === 4) kind = long.dir === 0 ? STRIPE_V : STRIPE_H;
            else if (g.runs.some((r) => r.dir === 2)) kind = BEE;
        }
        if (!kind) return null;
        if (at < 0) {
            for (const i of prefer ?? []) if (g.cells.has(i)) at = i;
            if (at < 0) { const list = long && kind !== BEE ? long.cells : [...g.cells]; at = list[list.length >> 1]; }
        }
        if (this.cage[at]) {
            at = -1;
            for (const i of g.cells) if (!this.cage[i]) at = i;
            if (at < 0) return null;
        }
        return { kind, at, c: g.c };
    }

    burst(groups, seed, prefer, chain) {
        const id = ++this.burstId;
        const ev = this.ev = { t: "burst", chain, pops: [], hits: [], fx: [], makes: [], turns: [], words: [], gain: 0, feed: 0 };
        const made = [];
        for (const g of groups) {
            const plan = this.planSpecial(g, prefer);
            let sx = 0, sy = 0;
            for (const i of g.cells) { sx += xOf(i); sy += yOf(i); }
            ev.words.push({ x: sx / g.cells.size, y: sy / g.cells.size, n: g.cells.size, c: g.c });
            this.mergeAt = plan ? plan.at : -1;
            for (const i of g.cells) this.clear(i, 0, id, chain);
            this.mergeAt = -1;
            for (const i of g.cells) for (const n of neighbours(i)) this.splash(n, 0, id);
            if (plan) made.push(plan);
        }
        if (seed) this.applySeed(seed, id, chain);
        this.drain(id, chain);
        for (const m of made) {
            if (this.pk[m.at] !== NONE) continue;
            const pid = this.nextId++;
            this.pk[m.at] = m.kind; this.pc[m.at] = m.kind === STAR ? -1 : m.c; this.pid[m.at] = pid;
            ev.makes.push({ id: pid, i: m.at, c: this.pc[m.at], k: m.kind });
            this.counts.specials++;
            this.score += 200;
            ev.gain += 200;
        }
        if (ev.pops.length > this.counts.bestBurst) this.counts.bestBurst = ev.pops.length;
        this.ev = null;
        this.push(ev);
    }

    applySeed(seed, id, chain) {
        if (seed.chomp) { for (const i of seed.chomp) this.clear(i, dist(i, seed.at) * 0.03, id, chain); return; }
        if (seed.fire) { seed.fire.forEach((i, n) => this.clear(i, n * 0.05, id, chain)); return; }
        const { a, b } = seed, ka = this.pk[a], kb = this.pk[b], sa = isSpecial(ka), sb = isSpecial(kb);
        if (sa && sb) this.combo(a, b, id, chain);
        else {
            const s = sa ? a : b, o = sa ? b : a;
            if (this.pk[s] === STAR) {
                const c = this.colourAt(o);
                this.takePiece(s, id, 0, chain);
                this.starClear(s, c >= 0 ? c : this.commonColour(), 0, id, chain);
            } else this.clear(s, 0, id, chain);
        }
    }

    takePiece(i, id, d, chain) {
        this.stamp[i] = id;
        if (this.frost[i]) { this.frost[i]--; this.ev.hits.push({ i, w: "frost", left: this.frost[i], d }); }
        this.ev.pops.push({ id: this.pid[i], i, c: this.pc[i], k: this.pk[i], d });
        this.pk[i] = NONE; this.pid[i] = 0; this.pc[i] = -1;
    }

    combo(a, b, id, chain) {
        let ka = this.pk[a], kb = this.pk[b];
        const norm = (k) => (k === STRIPE_V ? STRIPE_H : k);
        const pa = norm(ka), pb = norm(kb), has = (k) => pa === k || pb === k, both = (k) => pa === k && pb === k;
        const ca = this.pc[a], cb = this.pc[b];
        const fx = this.ev.fx;
        this.counts.specials++;
        const row = (y, d) => { fx.push({ t: "line", i: b, dir: 0, y, d }); for (let x = 0; x < W; x++) this.clear(x + y * W, d + Math.abs(x - xOf(b)) * 0.022, id, chain); };
        const col = (x, d) => { fx.push({ t: "line", i: b, dir: 1, x, d }); for (let y = 0; y < H; y++) this.clear(x + y * W, d + Math.abs(y - yOf(b)) * 0.022, id, chain); };
        this.takePiece(a, id, 0, chain); this.takePiece(b, id, 0, chain);
        if (both(STAR)) {
            fx.push({ t: "nova", i: b, d: 0 });
            for (let i = 0; i < N; i++) this.clear(i, 0.1 + dist(i, b) * 0.035, id, chain);
            return;
        }
        if (has(STAR)) {
            const other = pa === STAR ? kb : ka, c = pa === STAR ? cb : ca;
            const list = [];
            for (let i = 0; i < N; i++) if (this.pc[i] === c && this.pk[i] === CANDY && !this.cage[i]) list.push(i);
            fx.push({ t: "beam", i: b, to: list, c, d: 0 });
            list.forEach((i, n) => {
                const k = other === STRIPE_H || other === STRIPE_V ? (n % 2 ? STRIPE_H : STRIPE_V) : other;
                this.pk[i] = k;
                this.ev.turns.push({ id: this.pid[i], i, k, d: 0.1 + n * 0.03 });
                this.clear(i, 0.3 + n * 0.07, id, chain);
            });
            return;
        }
        if (both(BONBON)) { fx.push({ t: "blast", i: b, r: 4, d: 0 }); this.diamond(b, 4, 0, id, chain); return; }
        if (has(BONBON) && has(STRIPE_H)) {
            const x = xOf(b), y = yOf(b);
            for (const dy of [-1, 0, 1]) if (y + dy >= 0 && y + dy < H) row(y + dy, 0);
            for (const dx of [-1, 0, 1]) if (x + dx >= 0 && x + dx < W) col(x + dx, 0.06);
            return;
        }
        if (both(STRIPE_H)) { row(yOf(b), 0); col(xOf(b), 0); return; }
        if (both(BEE)) { for (let n = 0; n < 3; n++) this.launchBee(b, NONE, 0.08 * n, id, chain); return; }
        const other = pa === BEE ? kb : ka;
        this.launchBee(b, other, 0, id, chain);
    }

    diamond(at, r, d, id, chain) {
        const x0 = xOf(at), y0 = yOf(at);
        for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) {
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const m = Math.abs(x - x0) + Math.abs(y - y0);
            if (m <= r) this.clear(x + y * W, d + m * 0.035, id, chain);
        }
    }

    commonColour() {
        const n = [0, 0, 0, 0, 0, 0];
        for (let i = 0; i < N; i++) if (this.colourAt(i) >= 0 && !this.cage[i]) n[this.colourAt(i)]++;
        let best = 0;
        for (let c = 1; c < 6; c++) if (n[c] > n[best]) best = c;
        return best;
    }

    starClear(from, c, d, id, chain) {
        const list = [];
        for (let i = 0; i < N; i++) if (this.colourAt(i) === c) list.push(i);
        this.ev.fx.push({ t: "beam", i: from, to: list, c, d });
        list.forEach((i, n) => this.clear(i, d + 0.12 + n * 0.022, id, chain));
    }

    /** The most useful single cell for a bee: unfinished goals first. */
    beeTarget(id) {
        const want = [], loose = [];
        const needs = new Set();
        for (const g of this.goals) if (this.remaining(g) > 0) needs.add(g.t === "c" ? "c" + g.c : g.t);
        for (let i = 0; i < N; i++) {
            if (!this.mask[i] || this.stamp[i] === id) continue;
            const c = this.colourAt(i);
            if (needs.has("frost") && this.frost[i]) want.push(i);
            else if (needs.has("cookie") && this.cookie[i]) want.push(i);
            else if (needs.has("fudge") && this.fudge[i]) want.push(i);
            else if (this.cage[i]) want.push(i);
            else if (c >= 0 && needs.has("c" + c)) want.push(i);
            else if (this.pk[i] === MALLOW) want.push(i);
            else if (this.pk[i] !== NONE && this.pk[i] !== FOLK) loose.push(i);
        }
        const pool = want.length ? want : loose;
        return pool.length ? pool[this.rnd(pool.length)] : -1;
    }

    launchBee(from, payload, d, id, chain) {
        const t = this.beeTarget(id);
        if (t < 0) return;
        this.ev.fx.push({ t: "bee", i: from, to: t, d, payload });
        const land = d + 0.34;
        if (payload === BONBON) this.diamond(t, 2, land, id, chain);
        else if (payload === STRIPE_H || payload === STRIPE_V) {
            this.stamp[t] = 0;
            this.ev.fx.push({ t: "line", i: t, dir: payload === STRIPE_H ? 0 : 1, x: xOf(t), y: yOf(t), d: land });
            this.clear(t, land, id, chain);
            this.lineFrom(t, payload === STRIPE_H ? 0 : 1, land, id, chain);
        } else this.clear(t, land, id, chain);
    }

    lineFrom(i, dir, d, id, chain) {
        const x0 = xOf(i), y0 = yOf(i);
        if (dir === 0) for (let x = 0; x < W; x++) this.clear(x + y0 * W, d + Math.abs(x - x0) * 0.022, id, chain);
        else for (let y = 0; y < H; y++) this.clear(x0 + y * W, d + Math.abs(y - y0) * 0.022, id, chain);
    }

    /** One cell takes one hit from a match or a blast. Each cell is hit at most once a burst. */
    clear(i, d, id, chain) {
        if (!this.mask[i] || this.stamp[i] === id) return;
        this.stamp[i] = id;
        const ev = this.ev;
        if (this.cookie[i]) { this.cookie[i]--; ev.hits.push({ i, w: "cookie", left: this.cookie[i], d }); return; }
        if (this.fudge[i]) { this.fudge[i] = 0; this.fudgeHit = true; ev.hits.push({ i, w: "fudge", left: 0, d }); return; }
        const k = this.pk[i];
        if (k === FOLK) return;
        if (this.cage[i]) { this.cage[i] = 0; ev.hits.push({ i, w: "cage", left: 0, d }); return; }
        if (this.frost[i]) { this.frost[i]--; ev.hits.push({ i, w: "frost", left: this.frost[i], d }); }
        if (k === NONE) return;
        const c = this.pc[i], pid = this.pid[i];
        const pop = { id: pid, i, c, k, d };
        if (this.mergeAt >= 0) pop.to = this.mergeAt;
        ev.pops.push(pop);
        this.pk[i] = NONE; this.pid[i] = 0; this.pc[i] = -1;
        if (k === MALLOW) this.counts.mallow++;
        else {
            if (c >= 0) this.counts.c[c]++;
            this.counts.candies++;
        }
        const gain = 60 * (1 + Math.min(chain, 6)) * (this.finaleOn ? 0.5 : 1);
        this.score += gain; ev.gain += gain;
        this.feed += 1; ev.feed += 1;
        if (isSpecial(k)) { this.q.push({ i, k, c, d }); this.counts.specials++; }
    }

    /** Matches next door crack cookies, cages' neighbours are left alone, marshmallows and fudge burst. */
    splash(i, d, id) {
        if (!this.mask[i] || this.stamp[i] === id) return;
        if (this.cookie[i] || this.fudge[i] || this.pk[i] === MALLOW) this.clear(i, d + 0.05, id, 0);
    }

    drain(id, chain) {
        for (let n = 0; n < this.q.length; n++) {
            const { i, k, c, d } = this.q[n], fx = this.ev.fx, wait = d + 0.04;
            switch (k) {
                case STRIPE_H: fx.push({ t: "line", i, dir: 0, y: yOf(i), d: wait }); this.lineFrom(i, 0, wait, id, chain); break;
                case STRIPE_V: fx.push({ t: "line", i, dir: 1, x: xOf(i), d: wait }); this.lineFrom(i, 1, wait, id, chain); break;
                case BONBON: fx.push({ t: "blast", i, r: 2, d: wait }); this.diamond(i, 2, wait, id, chain); break;
                case STAR: this.starClear(i, this.commonColour(), wait, id, chain); break;
                case BEE:
                    for (const m of neighbours(i)) this.clear(m, wait, id, chain);
                    this.launchBee(i, NONE, wait, id, chain);
                    break;
            }
        }
        this.q.length = 0;
    }

    // --- Falling --------------------------------------------------------------------------------------------
    isSpawner(i) { return i < W || !this.mask[i - W]; }
    isExit(i) { return i >= N - W || !this.mask[i + W]; }

    /** Could something fall straight into empty cell i, now or soon? */
    fedFromAbove(i) {
        for (let j = i; ; j -= W) {
            if (this.isSpawner(j)) return !this.fixed(j);
            const up = j - W;
            if (this.fixed(up)) return false;
        }
    }

    gravity() {
        const paths = new Map(), pk = this.pk, spawns = [];
        const empty = (i) => this.mask[i] && pk[i] === NONE && !this.cookie[i] && !this.fudge[i];
        const step = (from, to, tick) => {
            const id = this.pid[from];
            pk[to] = pk[from]; this.pc[to] = this.pc[from]; this.pid[to] = id;
            pk[from] = NONE; this.pc[from] = -1; this.pid[from] = 0;
            if (this.quiet) return;
            let p = paths.get(id);
            if (!p) { p = { id, from, steps: [] }; paths.set(id, p); }
            p.steps.push([tick, to]);
        };
        for (let tick = 0; tick < 200; tick++) {
            let moved = false;
            for (let i = N - 1; i >= 0; i--) {
                if (!empty(i)) continue;
                const up = i - W;
                if (up >= 0 && this.mask[up] && pk[up] !== NONE && !this.fixed(up)) { step(up, i, tick); moved = true; }
                else if (this.isSpawner(i)) {
                    this.spawn(i);
                    if (!this.quiet) { const id = this.pid[i]; spawns.push({ id, i, c: this.pc[i], k: pk[i], tick }); paths.set(id, { id, from: -1, steps: [[tick, i]] }); }
                    moved = true;
                }
            }
            if (moved) continue;
            for (let i = N - 1; i >= W; i--) {
                if (!empty(i) || this.fedFromAbove(i)) continue;
                const x = xOf(i), order = tick % 2 ? [-1, 1] : [1, -1];
                for (const dx of order) {
                    if (x + dx < 0 || x + dx >= W) continue;
                    const up = i - W + dx;
                    if (pk[up] !== NONE && !this.fixed(up)) { step(up, i, tick); moved = true; break; }
                }
            }
            if (!moved) break;
        }
        if (!this.quiet && paths.size) this.push({ t: "fall", paths: [...paths.values()], spawns });
    }

    spawn(i) {
        this.pid[i] = this.nextId++;
        const onBoard = this.folkCount();
        if (this.folkLeft > 0 && onBoard < (this.def.folkMax ?? 1) && this.movesUsed >= (this.lastFolk ?? 0) + (this.def.folkGap ?? 2)) {
            this.pk[i] = FOLK; this.pc[i] = -1; this.folkLeft--; this.lastFolk = this.movesUsed;
            return;
        }
        this.pk[i] = CANDY;
        this.pc[i] = this.rnd(this.colors);
    }

    folkCount() { let n = 0; for (let i = 0; i < N; i++) if (this.pk[i] === FOLK) n++; return n; }

    exitFolk() {
        let any = false;
        for (let i = 0; i < N; i++) if (this.pk[i] === FOLK && this.isExit(i)) {
            this.push({ t: "exit", id: this.pid[i], i });
            this.pk[i] = NONE; this.pid[i] = 0;
            this.folkDone++; this.score += 1000; any = true;
        }
        return any;
    }

    // --- End of a turn --------------------------------------------------------------------------------------
    endTurn(wasMove) {
        if (this.goalsMet()) { this.won = true; return; }
        if (wasMove && this.def.fudgeSpreads !== false && !this.fudgeHit) this.spreadFudge();
        if (wasMove && this.def.biteEvery && this.movesUsed % this.def.biteEvery === 0) this.monsterBite();
        if (this.moves > 0 || this.endless) this.ensureMoves();
        this.checkEnd();
    }

    spreadFudge() {
        const options = [];
        for (let i = 0; i < N; i++) if (this.fudge[i]) for (const n of neighbours(i)) if (this.pk[n] === CANDY && !this.cage[n]) options.push(n);
        if (!options.length) return;
        const t = options[this.rnd(options.length)];
        this.push({ t: "fudge", i: t, id: this.pid[t] });
        this.pk[t] = NONE; this.pid[t] = 0; this.pc[t] = -1; this.fudge[t] = 1;
    }

    /** World six: Morsel takes a real bite out of the board itself. */
    monsterBite() {
        const list = this.def.bites;
        if (!list || this.bitesDone >= list.length) return;
        const cells = list[this.bitesDone++].filter((i) => this.mask[i]);
        if (!cells.length) return;
        const eaten = [];
        for (const i of cells) {
            if (this.pid[i]) eaten.push(this.pid[i]);
            this.mask[i] = 0; this.pk[i] = NONE; this.pid[i] = 0; this.pc[i] = -1;
            this.frost[i] = this.cookie[i] = this.fudge[i] = this.cage[i] = 0;
        }
        this.push({ t: "bite", cells, eaten });
        this.gravity();
        this.resolve(null, null);
    }

    /** Guarantees a playable board: shuffle, then recolour, then a star, then Morsel chews a way through. */
    ensureMoves() {
        if (this.won) return;
        for (let guard = 0; guard < 40 && !this.hasMove(); guard++) {
            if (this.shuffle()) { this.counts.reshuffles++; continue; }
            if (this.recolour()) { this.counts.reshuffles++; continue; }
            if (this.gift()) { this.counts.rescues++; continue; }
            if (!this.rescue()) break;
            this.counts.rescues++;
        }
    }

    shuffle() {
        const cells = [];
        for (let i = 0; i < N; i++) if (this.pk[i] === CANDY && !this.cage[i]) cells.push(i);
        if (cells.length < 3) return false;
        const before = cells.map((i) => ({ id: this.pid[i], c: this.pc[i] }));
        for (let attempt = 0; attempt < 60; attempt++) {
            const list = before.slice();
            for (let n = list.length - 1; n > 0; n--) { const j = this.rnd(n + 1), t = list[n]; list[n] = list[j]; list[j] = t; }
            cells.forEach((i, n) => { this.pid[i] = list[n].id; this.pc[i] = list[n].c; });
            if (cells.some((i) => this.matchAt(i)) || !this.hasMove()) continue;
            this.push({ t: "shuffle", moves: cells.map((i) => ({ id: this.pid[i], i })) });
            return true;
        }
        cells.forEach((i, n) => { this.pid[i] = before[n].id; this.pc[i] = before[n].c; });
        return false;
    }

    /** When shuffling can't help, plant a guaranteed move: a pair next to a third candy of the same colour. */
    recolour() {
        for (let i = 0; i < N; i++) {
            if (this.pk[i] !== CANDY || this.cage[i]) continue;
            for (const j of neighbours(i)) {
                if (!this.movable(j)) continue;
                const line = this.lineFor(i, j);
                if (!line) continue;
                const c = this.pc[line[0]];
                const old = this.pc[i];
                this.pc[i] = c;
                if (!this.matchAt(i) && !(this.pk[j] === CANDY && this.matchAt(j)) && this.hasMove()) {
                    this.push({ t: "recolour", changes: [{ id: this.pid[i], c, i }] });
                    return true;
                }
                this.pc[i] = old;
            }
        }
        return false;
    }

    /** Find two same-coloured candies that would line up with candy i if it moved into cell j. */
    lineFor(i, j) {
        const dx = xOf(j) - xOf(i), dy = yOf(j) - yOf(i);
        const test = (a, b) => {
            if (a < 0 || b < 0 || a >= N || b >= N) return null;
            if (dist(a, j) > 2 || dist(b, j) > 2 || a === i || b === i) return null;
            if (this.pk[a] !== CANDY || this.pk[b] !== CANDY) return null;
            return this.pc[a] === this.pc[b] ? [a, b] : null;
        };
        const x = xOf(j), y = yOf(j), out = [];
        if (dx && x + dx >= 0 && x + dx < W && x + 2 * dx >= 0 && x + 2 * dx < W) out.push(test(j + dx, j + 2 * dx));
        if (dy && y + dy >= 0 && y + dy < H && y + 2 * dy >= 0 && y + 2 * dy < H) out.push(test(j + dy * W, j + 2 * dy * W));
        if (dx) { if (y > 0 && y < H - 1) out.push(test(j - W, j + W)); if (y > 1) out.push(test(j - W, j - 2 * W)); if (y < H - 2) out.push(test(j + W, j + 2 * W)); }
        if (dy) { if (x > 0 && x < W - 1) out.push(test(j - 1, j + 1)); if (x > 1) out.push(test(j - 1, j - 2)); if (x < W - 2) out.push(test(j + 1, j + 2)); }
        return out.find(Boolean) ?? null;
    }

    /** Morsel coughs up a star: a star swaps with anything, so this always leaves a move. */
    gift() {
        for (let i = 0; i < N; i++) {
            if (this.pk[i] !== CANDY || this.cage[i]) continue;
            if (!neighbours(i).some((j) => this.movable(j))) continue;
            this.pk[i] = STAR; this.pc[i] = -1;
            this.push({ t: "gift", id: this.pid[i], i });
            return true;
        }
        return false;
    }

    /** Nothing can move at all, so Morsel chews a cookie, cage or fudge free of charge. */
    rescue() {
        const hard = [];
        for (let i = 0; i < N; i++) if (this.cookie[i] || this.fudge[i] || this.cage[i]) hard.push(i);
        if (!hard.length) return false;
        const at = hard[this.rnd(hard.length)];
        const cells = [at, ...neighbours(at)].filter((i) => this.mask[i]);
        this.push({ t: "chomp", i: at, cells, free: true });
        for (const i of cells) { if (this.cookie[i]) this.cookie[i] = 1; }
        this.resolve(null, { chomp: cells, at });
        return true;
    }
}
