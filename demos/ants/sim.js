// The whole war, as plain arrays. No Pogo imports: bots run this headless at thousands of ticks a second,
// and the renderer only reads it. Ants live in typed arrays; movement comes from Dijkstra flow fields, one per trail.
import { BASE_CAP, CAP_BONUS, FOOD_SCALE, CASTES, CARRIER, CHAMBER_BY_ID, CHAMBERS, CRUMB, DMG, FLYER, FOOD_KINDS, LAY_TICKS, MEAT, NEST_HP, PROPS, SOLDIER, SPITTER, SUGAR, TICK_HZ, WORKER } from "./data.js";

export const CELL = 16, MAX_ANTS = 2600, MAX_SPIT = 400;
const HCELL = 32, UNREACHED = 65535, NO_FLOW = 0;
export const S_IDLE = 0, S_GO = 1, S_BACK = 2, S_HOLD = 3, S_FORAGE = 4, S_RALLY = 5;
export const GATHER = 0, ATTACK = 1, GUARD = 2;
const NEST_T = -100, CRIT_T = -2;
export const NEST_R = 40;

// Event codes for the renderer; bots ignore them. Flat [code, x, y, a, b] records.
export const EV = { HIT: 1, DIE: 2, SPIT: 3, SPLAT: 4, LOAD: 5, DROP: 6, HATCH: 7, NESTHIT: 8, HAND_WARN: 9, HAND_SLAM: 10, SHOE_WARN: 11, SHOE_STOMP: 12, QUEEN_DEAD: 13, BUILT: 14, RAID: 15, FOOD_GONE: 16, TRAIL: 17, TRAIL_GONE: 18, CHOMP: 19, CRITTER_DEAD: 20, HAND_LIFT: 21, FLEE: 22, SPAT: 23, FOOD_DROP: 24 };

const SIN = new Float32Array(256); for (let i = 0; i < 256; i++) SIN[i] = Math.sin(i / 256 * Math.PI * 2);
const CAP = CASTES.map((c) => c);
const wrap = (a) => { while (a > Math.PI) a -= 6.2831853; while (a < -Math.PI) a += 6.2831853; return a; };
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

class Field {
    constructor(n) { this.dist = new Uint16Array(n); this.fx = new Int8Array(n); this.fy = new Int8Array(n); }
}

export class Colony {
    constructor(team, nest, side) {
        this.team = team; this.side = side; this.x = nest.x; this.y = nest.y; this.alive = true;
        this.hp = this.maxHp = nest.hp ?? NEST_HP;
        this.stock = [0, 0, 0, 0]; this.gathered = [0, 0, 0, 0]; this.heavy = 0;
        this.chambers = { nursery: 0, pantry: 0, gym: 0, vat: 0, hall: 0, loft: 0 };
        this.slots = [null, null, null, null];
        this.counts = [0, 0, 0, 0, 0]; this.total = 0;
        this.mix = [1, 0, 0, 0, 0]; this.focus = WORKER;
        this.layT = 10; this.home = null; this.alarm = null; this.alarmField = null; this.alarmAt = -999;
        this.dirty = true; this.hatched = 0; this.lost = 0; this.kills = 0;
        this.foodMult = 1; this.atkMult = 1; this.hpMult = 1; this.layMult = 1; this.bitT = 0;
        this.fightersOnTrail = 0; this.peak = 0;
    }
    get cap() { return Math.min(this.maxPop ?? 9999, BASE_CAP + CAP_BONUS[this.chambers.pantry]); }
    get pop() { return this.total; }
    trails() { return this.slots.filter(Boolean); }
    unlocked(c) { const k = CASTES[c].chamber; return !k || this.chambers[k] > 0; }
}

export class Sim {
    /** map: see maps.js. opts: { seed, sides, mission } */
    constructor(map, opts = {}) {
        this.map = map; this.t = 0; this.rs = (opts.seed ?? 1) * 2654435761 >>> 0 || 1;
        const w = this.w = map.w, h = this.h = map.h;
        const gw = this.gw = Math.ceil(w / CELL), gh = this.gh = Math.ceil(h / CELL), n = this.gn = gw * gh;
        this.cost = new Uint8Array(n).fill(10); this.mask = new Uint8Array(n);
        this.heap = new Float64Array(n * 8); this.hn = 0;
        this.buildGrid();
        const N = MAX_ANTS;
        this.x = new Float32Array(N); this.y = new Float32Array(N); this.px = new Float32Array(N); this.py = new Float32Array(N); this.ang = new Float32Array(N);
        this.hp = new Float32Array(N); this.alive = new Uint8Array(N); this.team = new Uint8Array(N); this.caste = new Uint8Array(N); this.state = new Uint8Array(N);
        this.seed = new Uint8Array(N); this.job = new Int8Array(N).fill(-1); this.carry = new Uint8Array(N); this.load = new Uint8Array(N); this.food = new Int16Array(N);
        this.target = new Int16Array(N).fill(-1); this.cd = new Uint8Array(N); this.wait = new Uint8Array(N); this.lunge = new Uint8Array(N);
        this.doom = new Uint8Array(N); this.heavyLoad = new Uint8Array(N);
        this.free = new Int16Array(N); for (let i = 0; i < N; i++) this.free[i] = N - 1 - i;
        this.nfree = N; this.top = 0; this.count = 0;
        this.hw = Math.ceil(w / HCELL) + 2; this.hh = Math.ceil(h / HCELL) + 2;
        this.hhead = new Int16Array(this.hw * this.hh); this.hnext = new Int16Array(N);
        // Spit
        this.spn = 0; this.spx = new Float32Array(MAX_SPIT); this.spy = new Float32Array(MAX_SPIT); this.spt = new Float32Array(MAX_SPIT); this.spu = new Float32Array(MAX_SPIT);
        this.spf = new Float32Array(MAX_SPIT); this.spg = new Float32Array(MAX_SPIT); this.spl = new Float32Array(MAX_SPIT); this.spteam = new Uint8Array(MAX_SPIT); this.spdmg = new Float32Array(MAX_SPIT); this.spcrit = new Int16Array(MAX_SPIT);
        this.ev = []; this.events = opts.events !== false;
        this.foods = []; this.fid = 0;
        for (const f of map.foods) { const g = this.addFood(f.k, f.x, f.y, (f.amount ?? FOOD_KINDS[f.k].amount) * FOOD_SCALE, f.rot); g.r0 = g.r = FOOD_KINDS[f.k].r * Math.max(0.6, Math.min(1.15, Math.sqrt((f.amount ?? FOOD_KINDS[f.k].amount) / FOOD_KINDS[f.k].amount))); }
        this.cols = []; this.brains = [];
        for (const c of map.nests) {
            const col = new Colony(c.team, c, c.side ?? (c.team === 0 ? 0 : 1)); this.cols[c.team] = col;
            col.stock = (c.stock ?? [20, 0, 0, 0]).slice(); col.maxPop = c.maxPop;
            if (c.chambers) Object.assign(col.chambers, c.chambers);
            col.home = new Field(n); this.field(col.home, [[col.x, col.y]], null);
            for (let i = 0; i < (c.ants ?? 20); i++) this.spawn(c.team, WORKER, i);
            for (const [cs, num] of Object.entries(c.army ?? {})) for (let i = 0; i < num; i++) this.spawn(c.team, Number(cs), i);
        }
        this.colList = this.cols.filter(Boolean);
        this.me = this.cols[0] ?? null;
        this.critters = [];
        for (const c of map.critters ?? []) this.addCritter(c.k, c.x, c.y, c);
        this.hand = map.hazards?.hand ? { ...map.hazards.hand, phase: "wait", timer: (map.hazards.hand.first ?? 60) * TICK_HZ, x: 0, y: 0, grabbed: 0, t: 0, slams: 0 } : null;
        this.shoe = map.hazards?.shoe ? { ...map.hazards.shoe, phase: "wait", timer: (map.hazards.shoe.first ?? 80) * TICK_HZ, steps: [], i: 0, t: 0, x: 0, y: 0, rot: 0, walks: 0 } : null;
        this.goal = opts.mission ?? map.goal ?? { destroy: true };
        this.outcome = null; this.reason = ""; this.bites = 0; this.biteLog = 0; this.handStolen = 0;
        this.alert = null; this.fieldsBuilt = 0;
    }

    rand() { let s = this.rs; s ^= s << 13; s ^= s >>> 17; s ^= s << 5; this.rs = s >>> 0; return (s >>> 0) / 4294967296; }
    emit(code, x, y, a = 0, b = 0) { if (this.events) this.ev.push(code, x, y, a, b); }

    // --- Grid ---------------------------------------------------------------------------------------------
    buildGrid() {
        const { gw, gh, cost, map } = this;
        const stamp = (cx, cy, rx, ry, rot, val) => {
            const m = Math.max(rx, ry), c = Math.cos(rot), s = Math.sin(rot);
            const x0 = Math.max(0, Math.floor((cx - m) / CELL)), x1 = Math.min(gw - 1, Math.floor((cx + m) / CELL));
            const y0 = Math.max(0, Math.floor((cy - m) / CELL)), y1 = Math.min(gh - 1, Math.floor((cy + m) / CELL));
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const dx = (x + 0.5) * CELL - cx, dy = (y + 0.5) * CELL - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
                if (u * u + v * v <= 1) { const i = x + y * gw; if (val === 0 || cost[i] !== 0) cost[i] = val; }
            }
        };
        for (const sh of map.shapes ?? []) {
            if (sh.t === "soda") stamp(sh.x, sh.y, sh.rx, sh.ry, sh.rot ?? 0, 26);
            if (sh.t === "water") stamp(sh.x, sh.y, sh.rx, sh.ry, sh.rot ?? 0, 0);
        }
        for (const p of map.props ?? []) {
            const k = PROPS[p.k]; if (!k?.b) continue;
            const sc = p.s ?? 1; stamp(p.x, p.y, k.b[0] * sc + 4, k.b[1] * sc + 4, p.rot ?? 0, 0);
        }
    }
    cellAt(x, y) { let c = x / CELL | 0, r = y / CELL | 0; if (c < 0) c = 0; else if (c >= this.gw) c = this.gw - 1; if (r < 0) r = 0; else if (r >= this.gh) r = this.gh - 1; return c + r * this.gw; }

    /** Dijkstra outward from the sources. Cells under `pts` are cheap, so ants fall into the painted line and run along it. */
    field(f, sources, pts) {
        const { gw, gh, cost, mask, gn } = this, dist = f.dist, heap = this.heap;
        this.fieldsBuilt++;
        dist.fill(UNREACHED); let hn = 0;
        if (pts) for (let i = 0; i < pts.length; i += 2) {
            const c = this.cellAt(pts[i], pts[i + 1]), x = c % gw, y = c / gw | 0; mask[c] = 2;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !mask[nx + ny * gw]) mask[nx + ny * gw] = 1; }
        }
        const push = (key) => {
            let i = hn++; heap[i] = key;
            while (i > 0) { const p = (i - 1) >> 1; if (heap[p] <= key) break; heap[i] = heap[p]; i = p; } heap[i] = key;
        };
        const pop = () => {
            const top = heap[0], last = heap[--hn]; let i = 0;
            for (;;) { let k = i * 2 + 1; if (k >= hn) break; if (k + 1 < hn && heap[k + 1] < heap[k]) k++; if (heap[k] >= last) break; heap[i] = heap[k]; i = k; }
            heap[i] = last; return top;
        };
        for (const [sx, sy] of sources) { const c = this.cellAt(sx, sy); dist[c] = 0; push(c); }
        while (hn > 0) {
            const key = pop(), c = key % 65536, d = (key - c) / 65536;
            if (d !== dist[c]) continue;
            const x = c % gw, y = (c - x) / gw;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
                const nc = nx + ny * gw, k = cost[nc]; if (!k) continue;
                if (dx && dy && (!cost[nx + y * gw] || !cost[x + ny * gw])) continue;
                const m = mask[nc], unit = m === 2 ? 0.28 : m === 1 ? 0.55 : 1;
                const nd = d + ((dx && dy ? 14 : 10) * (k / 10) * unit + 0.5 | 0);
                if (nd < dist[nc]) { dist[nc] = nd; push(nd * 65536 + nc); }
            }
        }
        const fx = f.fx, fy = f.fy;
        for (let c = 0; c < gn; c++) {
            const d = dist[c]; fx[c] = 0; fy[c] = 0;
            if (d === 0 || d === UNREACHED) continue;
            const x = c % gw, y = (c - x) / gw; let best = d, bx = 0, by = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                if (!dx && !dy) continue;
                const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
                if (dx && dy && (!cost[nx + y * gw] || !cost[x + ny * gw])) continue;
                const nd = dist[nx + ny * gw]; if (nd < best) { best = nd; bx = dx; by = dy; }
            }
            const norm = bx && by ? 89 : 127; fx[c] = bx * norm; fy[c] = by * norm;
        }
        if (pts) for (let i = 0; i < pts.length; i += 2) {
            const c = this.cellAt(pts[i], pts[i + 1]), x = c % gw, y = c / gw | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) mask[nx + ny * gw] = 0; }
        }
    }
    /** Ants go home along their own gather trails, so a stream forms a two-way road. */
    rebuildHome(col) {
        const pts = []; for (const tr of col.slots) if (tr && tr.kind === GATHER) for (let i = 0; i < tr.pts.length; i++) pts.push(tr.pts[i]);
        this.field(col.home, [[col.x, col.y]], pts.length ? pts : null);
    }

    // --- Entities -----------------------------------------------------------------------------------------
    addFood(k, x, y, amount, rot) {
        const K = FOOD_KINDS[k], a = amount ?? K.amount;
        const f = { id: this.fid++, k, type: K.type, x, y, r0: K.r * Math.max(0.55, Math.min(1.2, Math.sqrt(a / K.amount))), r: 0, amount: a, max: a, heavy: !!K.heavy, alive: true, rot: rot ?? this.rand() * 6.28, bump: 0 };
        f.r = f.r0; this.foods[f.id] = f; return f;
    }
    takeFood(f, n) {
        const got = Math.min(n, f.amount); f.amount -= got; f.bump = 1;
        f.r = f.r0 * (0.4 + 0.6 * Math.sqrt(f.amount / f.max));
        if (f.amount <= 0 && f.alive) { f.alive = false; this.emit(EV.FOOD_GONE, f.x, f.y, f.type, f.r0); this.foodGone(f); }
        return got;
    }
    foodGone(f) {
        for (const col of this.colList) for (let s = 0; s < 4; s++) {
            const tr = col.slots[s]; if (!tr || tr.food !== f) continue;
            let next = null, best = 200 * 200;
            for (const g of this.foods) if (g.alive && g.k !== "scraps" && g.type === f.type && g.heavy === f.heavy) { const d = dist2(g.x, g.y, f.x, f.y); if (d < best) { best = d; next = g; } }
            if (next) { tr.food = next; tr.hx = next.x; tr.hy = next.y; this.field(tr.field, [[next.x, next.y]], tr.pts); col.dirty = true; }
            else this.removeTrail(col.team, s);
        }
    }
    /** Picnics are messy: fresh crumbs keep falling where old food ran out, so wars never starve to a stalemate. */
    fallingFood() {
        const spots = this.map.foods.filter((f) => !this.foods.some((g) => g.alive && dist2(g.x, g.y, f.x, f.y) < 3600));
        if (!spots.length) return;
        const f = spots[this.rand() * spots.length | 0], g = this.addFood("crumbs", f.x, f.y, 110);
        this.emit(EV.FOOD_DROP, g.x, g.y, 0, 0);
    }
    addScrap(x, y, n) {
        for (const f of this.foods) if (f.k === "scraps" && f.alive && dist2(f.x, f.y, x, y) < 2500) { f.amount = Math.min(f.amount + n, 40); f.max = Math.max(f.max, f.amount); f.r = f.r0 * (0.4 + 0.6 * Math.sqrt(f.amount / f.max)); return; }
        let n2 = 0; for (const f of this.foods) if (f.k === "scraps" && f.alive) n2++;
        if (n2 < 24) this.addFood("scraps", x, y, n, this.rand() * 6.28);
    }
    addCritter(k, x, y, o = {}) {
        const K = { spider: { hp: 520, r: 26, speed: 34 }, ladybird: { hp: 90, r: 18, speed: 20 } }[k];
        const hp = o.hp ?? K.hp;
        const c = { k, x, y, px: x, py: y, hx: x, hy: y, hp, maxHp: hp, r: K.r, speed: K.speed, ang: this.rand() * 6.28, cd: 0, alive: true, prey: -1, food: null, t: 0, lunge: 0, leash: o.leash ?? 240, hurt: 0, drop: o.drop };
        this.critters.push(c); return c;
    }
    spawn(team, caste, i = 0) {
        if (this.nfree === 0) return -1;
        const id = this.free[--this.nfree], col = this.cols[team], a = this.rand() * 6.283, r = 10 + this.rand() * 26;
        this.alive[id] = 1; this.team[id] = team; this.caste[id] = caste; this.state[id] = S_IDLE;
        this.x[id] = this.px[id] = col.x + Math.cos(a) * r; this.y[id] = this.py[id] = col.y + Math.sin(a) * r; this.ang[id] = a;
        this.hp[id] = CASTES[caste].hp * col.hpMult * (caste === FLYER && col.chambers.loft > 1 ? 1.4 : 1); this.seed[id] = this.rand() * 256 | 0;
        this.job[id] = -1; this.carry[id] = 0; this.load[id] = 0; this.food[id] = -1; this.target[id] = -1; this.cd[id] = 0; this.wait[id] = 0; this.lunge[id] = 0; this.doom[id] = 0;
        col.counts[caste]++; col.total++; col.peak = Math.max(col.peak, col.total);
        this.count++; if (id >= this.top) this.top = id + 1;
        return id;
    }
    kill(i, by, squash) {
        if (!this.alive[i]) return;
        const T = this.team[i], C = this.caste[i], col = this.cols[T];
        this.alive[i] = 0; this.free[this.nfree++] = i; this.count--;
        col.counts[C]--; col.total--; col.lost++;
        if (by >= 0 && this.cols[by]) this.cols[by].kills++;
        this.emit(squash ? EV.SPLAT : EV.DIE, this.x[i], this.y[i], T, C);
        if (!squash && C !== FLYER && (i & 1)) this.addScrap(this.x[i], this.y[i], C === WORKER ? 1 : 2);
    }

    // --- Commands: the player, the AI and the bots all speak these ---------------------------------------
    classify(team, x, y, slop = 22) {
        const col = this.cols[team];
        for (const c of this.colList) if (c.alive && c.side !== col.side && dist2(c.x, c.y, x, y) < (NEST_R + 24 + slop) ** 2) return { kind: ATTACK, nest: c.team, x: c.x, y: c.y };
        let best = null, bd = 1e12;
        for (const c of this.critters) if (c.alive) { const d = dist2(c.x, c.y, x, y); if (d < (c.r + 22 + slop) ** 2 && d < bd) { bd = d; best = c; } }
        if (best) return { kind: ATTACK, critter: best, x: best.x, y: best.y };
        for (const f of this.foods) if (f.alive) { const d = dist2(f.x, f.y, x, y); if (d < (f.r + 8 + slop) ** 2 && d < bd) { bd = d; best = f; } }
        if (best) return { kind: GATHER, food: best, x: best.x, y: best.y };
        if (dist2(col.x, col.y, x, y) < (NEST_R + 18 + slop) ** 2) return { kind: GUARD, home: true, x: col.x, y: col.y };
        return { kind: GUARD, x, y };
    }
    /** Lay a trail. Either end may be the target, so strokes drawn "backwards" just work. Returns the trail, or null for a recall. */
    paint(team, raw) {
        const col = this.cols[team]; if (!col?.alive) return null;
        let pts = this.resample(raw), n = pts.length / 2;
        let a = this.classify(team, pts[0], pts[1]), b = this.classify(team, pts[n * 2 - 2], pts[n * 2 - 1]);
        if (n > 1 && (a.food || a.nest !== undefined || a.critter) && !(b.food || b.nest !== undefined || b.critter)) {
            const rev = []; for (let i = n - 1; i >= 0; i--) rev.push(pts[i * 2], pts[i * 2 + 1]); pts = rev; const t = a; a = b; b = t;
        }
        if (b.home) { this.recall(team); return null; }
        let slot = -1;
        for (let s = 0; s < 4; s++) { const tr = col.slots[s]; if (tr && ((b.food && tr.food === b.food) || (b.nest !== undefined && tr.nest === b.nest) || (b.critter && tr.critter === b.critter))) slot = s; }
        const w = slot >= 0 ? Math.min(3, col.slots[slot].w + 1) : 1;
        if (slot >= 0) { col.slots[slot] = null; }
        else {
            slot = col.slots.indexOf(null);
            if (slot < 0) { let old = 0; for (let s = 1; s < 4; s++) if (col.slots[s].born < col.slots[old].born) old = s; this.removeTrail(team, old); slot = old; }
        }
        const tr = { id: ++this.fieldsBuilt, team, slot, kind: b.kind, pts: Float32Array.from(pts), hx: b.x, hy: b.y, food: b.food ?? null, nest: b.nest, critter: b.critter ?? null, w, born: this.t, field: new Field(this.gn), movedAt: this.t };
        col.slots[slot] = tr;
        this.field(tr.field, [[tr.hx, tr.hy]], tr.pts);
        if (tr.kind === GATHER) this.rebuildHome(col);
        col.dirty = true;
        this.emit(EV.TRAIL, tr.hx, tr.hy, team, tr.kind);
        if (tr.kind !== GATHER && team !== 0) this.warnRaid(col, tr);
        return tr;
    }
    /** Evenly spaced points along a stroke, so trails stamp solidly into the grid and draw as a steady line. */
    resample(raw, gap = 14) {
        const out = [raw[0], raw[1]]; let px = raw[0], py = raw[1], left = gap;
        for (let i = 2; i < raw.length; i += 2) {
            let x = raw[i], y = raw[i + 1], d = Math.hypot(x - px, y - py);
            while (d >= left && d > 0) { const k = left / d; px += (x - px) * k; py += (y - py) * k; out.push(px, py); d -= left; left = gap; }
            left -= d; px = x; py = y;
        }
        return out;
    }
    warnRaid(col, tr) {
        const me = this.me; if (!me?.alive || col.side === me.side) return;
        if (tr.nest === 0) this.emit(EV.RAID, tr.hx, tr.hy, col.team, 1);
        else if (tr.kind === ATTACK) for (const mine of me.slots) if (mine?.kind === GATHER && dist2(mine.hx, mine.hy, tr.hx, tr.hy) < 40000) this.emit(EV.RAID, tr.hx, tr.hy, col.team, 0);
    }
    removeTrail(team, slot) {
        const col = this.cols[team], tr = col.slots[slot]; if (!tr) return;
        col.slots[slot] = null; col.dirty = true;
        if (tr.kind === GATHER) this.rebuildHome(col);
        this.emit(EV.TRAIL_GONE, tr.hx, tr.hy, team, slot);
    }
    /** Every fighter home. */
    recall(team) { const col = this.cols[team]; for (let s = 0; s < 4; s++) if (col.slots[s] && col.slots[s].kind !== GATHER) this.removeTrail(team, s); this.emit(EV.TRAIL, col.x, col.y, team, 3); }
    setFocus(team, caste) { const col = this.cols[team]; col.focus = caste; col.mix = [0, 0, 0, 0, 0]; col.mix[caste] = 1; }
    affordable(col, cost) { for (let i = 0; i < 4; i++) if (col.stock[i] < cost[i]) return false; return true; }
    pay(col, cost) { for (let i = 0; i < 4; i++) col.stock[i] -= cost[i]; }
    canBuild(team, id) { const col = this.cols[team], ch = CHAMBER_BY_ID[id], lv = col.chambers[id]; const allowed = this.goal.chambers; if (allowed && !allowed.includes(id)) return false; return lv < ch.levels.length && this.affordable(col, ch.levels[lv]); }
    chamberOpen(col, id) { const allowed = this.goal.chambers; return (!allowed || allowed.includes(id)) && col.chambers[id] < CHAMBER_BY_ID[id].levels.length; }
    /** The queen stops laying until this chamber can be paid for, then builds it. Calling again cancels. */
    saveFor(team, id) { const col = this.cols[team]; col.saving = col.saving === id || !this.chamberOpen(col, id) ? null : id; return col.saving; }
    build(team, id) {
        if (!this.canBuild(team, id)) return false;
        const col = this.cols[team]; this.pay(col, CHAMBER_BY_ID[id].levels[col.chambers[id]]); col.chambers[id]++;
        if (id === "hall" && col.chambers.hall > 1) col.carryBoost = true;
        this.emit(EV.BUILT, col.x, col.y, team, CHAMBERS.findIndex((c) => c.id === id)); return true;
    }

    // --- Queries for AI and HUD ---------------------------------------------------------------------------
    enemiesNear(x, y, r, side) {
        let n = 0; const r2 = r * r, { hw, hhead, hnext, team, cols } = this;
        const cx0 = Math.max(0, (x - r) / HCELL | 0), cx1 = Math.min(hw - 1, (x + r) / HCELL | 0), cy0 = Math.max(0, (y - r) / HCELL | 0), cy1 = Math.min(this.hh - 1, (y + r) / HCELL | 0);
        for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) for (let i = hhead[cx + cy * hw] - 1; i >= 0; i = hnext[i] - 1) if (this.alive[i] && cols[team[i]].side !== side && dist2(this.x[i], this.y[i], x, y) < r2) n++;
        return n;
    }

    // --- The tick -----------------------------------------------------------------------------------------
    tick() {
        if (this.outcome) { this.t++; this.stepAnts(); this.stepSpit(); return; }
        this.t++;
        this.rebuildHash();
        this.stepAnts();
        this.stepSpit();
        for (const col of this.colList) this.stepColony(col);
        this.stepCritters();
        this.stepHand(); this.stepShoe();
        if (this.t % 10 === 0) { for (const b of this.brains) b.think(); }
        if (this.t % 20 === 7) this.updateAlert();
        if (this.t % 10 === 3) this.trackMovers();
        if (this.t % 280 === 0 && !this.goal.gather && !this.goal.endless) this.fallingFood();
        for (const f of this.foods) if (f.bump > 0) f.bump = Math.max(0, f.bump - 0.2);
        this.checkGoal();
    }
    rebuildHash() {
        const { hhead, hnext, hw, hh, x, y, alive, top } = this; hhead.fill(0);
        for (let i = 0; i < top; i++) {
            if (!alive[i]) continue;
            let cx = x[i] / HCELL | 0, cy = y[i] / HCELL | 0; if (cx < 0) cx = 0; else if (cx >= hw) cx = hw - 1; if (cy < 0) cy = 0; else if (cy >= hh) cy = hh - 1;
            const c = cx + cy * hw; hnext[i] = hhead[c]; hhead[c] = i + 1;
        }
    }
    /** Nearest enemy within r, or -1. Scans at most a couple of dozen ants, which is what keeps fights cheap. */
    findEnemy(i, r) {
        const { hhead, hnext, hw, hh, x, y, team, cols, alive } = this, side = cols[team[i]].side, ax = x[i], ay = y[i];
        const span = r > HCELL ? 2 : 1; let cx = ax / HCELL | 0, cy = ay / HCELL | 0, best = -1, bd = r * r, seen = 0;
        for (let oy = -span; oy <= span; oy++) {
            const yy = cy + oy; if (yy < 0 || yy >= hh) continue;
            for (let ox = -span; ox <= span; ox++) {
                const xx = cx + ox; if (xx < 0 || xx >= hw) continue;
                for (let j = hhead[xx + yy * hw] - 1; j >= 0; j = hnext[j] - 1) {
                    if (!alive[j] || cols[team[j]].side === side) continue;
                    const dx = x[j] - ax, dy = y[j] - ay, d = dx * dx + dy * dy;
                    if (d < bd) { bd = d; best = j; }
                    if (++seen > 28) return best;
                }
            }
        }
        return best;
    }
    assignJob(i, col) {
        const C = this.caste[i], seed = this.seed[i]; let total = 0;
        const fighter = C === SOLDIER || C === SPITTER || C === FLYER, hauler = C === WORKER || C === CARRIER;
        const noArmy = col.counts[SOLDIER] + col.counts[SPITTER] + col.counts[FLYER] === 0;
        const militia = C === WORKER && noArmy && (seed & 3) === 0;
        const combatFirst = fighter || militia;
        for (let s = 0; s < 4; s++) {
            const tr = col.slots[s]; if (!tr) continue;
            if (tr.kind === GATHER ? (hauler && !combatFirst && (!tr.food?.heavy || C === CARRIER)) : combatFirst) total += tr.w;
        }
        if (!total) { this.job[i] = -1; return; }
        let pick = (seed * 37 % 256) / 256 * total;
        for (let s = 0; s < 4; s++) {
            const tr = col.slots[s]; if (!tr) continue;
            if (tr.kind === GATHER ? (hauler && !combatFirst && (!tr.food?.heavy || C === CARRIER)) : combatFirst) { pick -= tr.w; if (pick < 0) { this.job[i] = s; return; } }
        }
        this.job[i] = -1;
    }
    stepAnts() {
        const { x, y, px, py, ang, hp, alive, team, caste, state, seed, job, carry, load, target, cd, wait, lunge, doom, cols, cost, gw, gh, t, critters, foods } = this;
        const over = !!this.outcome, dt = 1 / TICK_HZ, W = this.w - 2, H = this.h - 2;
        for (let i = 0, top = this.top; i < top; i++) {
            if (!alive[i]) continue;
            const ax = x[i], ay = y[i]; px[i] = ax; py[i] = ay;
            const T = team[i], C = caste[i], cs = CAP[C], col = cols[T], sd = seed[i], fly = C === FLYER;
            if (cd[i]) cd[i]--; if (lunge[i]) lunge[i]--;
            if (doom[i]) { if (--doom[i] === 0) { this.kill(i, -1, false); continue; } ang[i] += SIN[(t * 11 + sd) & 255] * 1.4; const sp0 = cs.speed * dt * 1.2; x[i] = Math.max(2, Math.min(W, ax + Math.cos(ang[i]) * sp0)); y[i] = Math.max(2, Math.min(H, ay + Math.sin(ang[i]) * sp0)); continue; }
            if (wait[i]) { wait[i]--; continue; }
            if (col.dirty || ((i + t) & 31) === 0) this.assignJob(i, col);
            let want = NaN, speed = cs.speed * dt, tg = target[i];
            const sample = ((i + t) & 7) === 0;
            const carrying = carry[i] > 0;
            // Targeting ---------------------------------------------------------------------------------
            if (tg >= 0) {
                if (!alive[tg]) tg = target[i] = -1;
                else if (sample) { const d = dist2(ax, ay, x[tg], y[tg]), lim = cs.aggro * 2.2; if (d > lim * lim) tg = target[i] = -1; }
            } else if (tg <= NEST_T) { if (!cols[NEST_T - tg]?.alive) tg = target[i] = -1; }
            else if (tg <= CRIT_T) { const c = critters[CRIT_T - tg]; if (!c?.alive) tg = target[i] = -1; }
            if (tg === -1 && sample && !over && (!carrying || sd < 40)) {
                const found = this.findEnemy(i, cs.aggro);
                if (found >= 0 && (C !== WORKER && C !== CARRIER || sd < 150)) { tg = target[i] = found; }
                else if (C !== WORKER && C !== CARRIER) {
                    for (let k = 0; k < critters.length; k++) { const c = critters[k]; if (c.alive && dist2(ax, ay, c.x, c.y) < (cs.aggro + c.r) ** 2) { tg = target[i] = CRIT_T - k; break; } }
                }
                if (tg === -1 && C !== WORKER && C !== CARRIER) for (const c of this.colList) if (c.alive && c.side !== col.side && dist2(ax, ay, c.x, c.y) < (NEST_R + 22) ** 2) { tg = target[i] = NEST_T - c.team; break; }
            }
            // Fight --------------------------------------------------------------------------------------
            if (tg !== -1) {
                let tx, ty, tr2;
                if (tg >= 0) { tx = x[tg]; ty = y[tg]; tr2 = cs.range; }
                else if (tg <= NEST_T) { const c = cols[NEST_T - tg]; tx = c.x; ty = c.y; tr2 = cs.range + NEST_R - 6; }
                else { const c = critters[CRIT_T - tg]; tx = c.x; ty = c.y; tr2 = cs.range + c.r; }
                const dx = tx - ax, dy = ty - ay, d2 = dx * dx + dy * dy;
                if (d2 < tr2 * tr2) {
                    want = Math.atan2(dy, dx); speed = 0;
                    if (cd[i] === 0) {
                        cd[i] = cs.cd + (sd & 3);
                        const up = C === SOLDIER && col.chambers.gym > 1 ? 1.3 : C === SPITTER && col.chambers.vat > 1 ? 1.25 : 1;
                        const dmg = cs.dmg * up * col.atkMult;
                        if (C === SPITTER) this.fireSpit(i, tx, ty, dmg, tg <= CRIT_T && tg > NEST_T ? CRIT_T - tg : -1, tg);
                        else if (tg >= 0) { lunge[i] = 3; this.bite(i, tg, dmg * DMG[C][caste[tg]]); }
                        else if (tg <= NEST_T) { lunge[i] = 3; this.biteNest(cols[NEST_T - tg], dmg, T, ax, ay); }
                        else { lunge[i] = 3; this.biteCritter(critters[CRIT_T - tg], dmg, i, ax, ay); }
                    }
                } else { want = Math.atan2(dy, dx); }
            }
            // Duties --------------------------------------------------------------------------------------
            if (want !== want) {
                const st0 = state[i]; let st = st0;
                const j = job[i], tr = j >= 0 ? col.slots[j] : null;
                if (carrying) st = S_BACK;
                else if (tr) { if (st !== S_HOLD) st = S_GO; }
                else if (st === S_GO || st === S_HOLD || st === S_BACK) st = S_IDLE;
                const alarmed = col.alarm && C !== WORKER && C !== CARRIER && !tr;
                if (alarmed) st = S_RALLY; else if (st === S_RALLY) st = S_IDLE;
                let f = null, sx = 0, sy = 0;
                if (st === S_BACK) {
                    f = col.home; sx = col.x; sy = col.y;
                    if (dist2(ax, ay, sx, sy) < 900) {
                        const n = load[i], type = carry[i] - 1;
                        carry[i] = 0; load[i] = 0; col.stock[type] += n * col.foodMult; col.gathered[type] += n; if (this.heavyLoad[i]) { col.heavy += n; this.heavyLoad[i] = 0; }
                        wait[i] = 3; this.emit(EV.DROP, ax, ay, T, type); st = tr ? S_GO : S_IDLE;
                        ang[i] += 3.1; state[i] = st; x[i] = ax; y[i] = ay; continue;
                    }
                } else if (st === S_GO) {
                    if (tr.kind === GATHER) {
                        const food = tr.food; f = tr.field; sx = tr.hx; sy = tr.hy;
                        const reach = food.r * 0.82 + 5;
                        if (dist2(ax, ay, sx, sy) < reach * reach) { this.loadUp(i, food, col, T, ax, ay); state[i] = S_BACK; continue; }
                    } else {
                        f = tr.field; sx = tr.hx; sy = tr.hy; const d = dist2(ax, ay, sx, sy);
                        if (tr.nest !== undefined && d < (NEST_R + 24) ** 2) { target[i] = NEST_T - tr.nest; }
                        else if (tr.critter && d < (tr.critter.r + 34) ** 2) { const k = critters.indexOf(tr.critter); if (k >= 0) target[i] = CRIT_T - k; }
                        else if (d < 2000) st = S_HOLD;
                    }
                } else if (st === S_HOLD) {
                    if (!tr) st = S_IDLE; else {
                        const n = Math.min(200, col.total); const rad = 12 + (sd / 255) * (22 + Math.sqrt(n) * 5), a2 = sd * 0.37 + t * 0.012;
                        sx = tr.hx + Math.cos(a2) * rad; sy = tr.hy + Math.sin(a2) * rad;
                        const dx = sx - ax, dy = sy - ay; if (dx * dx + dy * dy > 90) want = Math.atan2(dy, dx); else speed = 0;
                        if (dist2(ax, ay, tr.hx, tr.hy) > 8100) st = S_GO;
                    }
                } else if (st === S_RALLY) {
                    if (dist2(ax, ay, col.alarm.x, col.alarm.y) < 1600) { speed *= 0.5; want = ang[i] + SIN[(t * 5 + sd) & 255]; }
                    else f = col.alarmField;
                    sx = col.alarm.x; sy = col.alarm.y;
                } else if (st === S_FORAGE) {
                    const food = foods[this.food[i]];
                    if (!food?.alive || (food.heavy && C !== CARRIER)) st = S_IDLE;
                    else {
                        const dx = food.x - ax, dy = food.y - ay, reach = food.r * 0.82 + 5;
                        if (dx * dx + dy * dy < reach * reach) { this.loadUp(i, food, col, T, ax, ay); state[i] = S_BACK; continue; }
                        want = Math.atan2(dy, dx);
                    }
                }
                if (st === S_IDLE) {
                    if ((C === WORKER || C === CARRIER) && ((i + t) & 63) === 0) {
                        // Idle workers wander out to whatever food is close to the nest. Trails are simply much better.
                        const food = this.nearFood(col, sd); if (food) { this.food[i] = food.id; st = S_FORAGE; }
                    }
                    if (st === S_IDLE) {
                        const rad = (fly ? 54 : C === SOLDIER || C === SPITTER ? 64 : 46) + (sd & 31) * (fly ? 1.4 : 1.1), a2 = sd * 0.49 + t * (C === WORKER ? 0.02 : 0.006);
                        const tx = col.x + Math.cos(a2) * rad, ty = col.y + Math.sin(a2) * rad, dx = tx - ax, dy = ty - ay;
                        if (dx * dx + dy * dy > 100) { want = Math.atan2(dy, dx); speed *= 0.7; } else speed = 0;
                    }
                }
                state[i] = st;
                if (f) {
                    if (fly) want = Math.atan2(sy - ay, sx - ax);
                    else {
                        const c = (ax / CELL | 0) + (ay / CELL | 0) * gw, fx = f.fx[c], fy = f.fy[c];
                        want = fx || fy ? Math.atan2(fy, fx) : Math.atan2(sy - ay, sx - ax);
                    }
                }
            }
            // Separation: a light shove so crowds spread and encircle rather than stack ---------------------
            let nx = ax, ny = ay;
            if (((i + t) & 3) === 0) {
                const hc = (ax / HCELL | 0) + (ay / HCELL | 0) * this.hw; let budget = 5;
                for (let j = this.hhead[hc] - 1; j >= 0 && budget > 0; j = this.hnext[j] - 1) {
                    if (j === i) continue; budget--;
                    const dx = ax - x[j], dy = ay - y[j], d = dx * dx + dy * dy;
                    if (d < 64 && d > 0.01) { const k = (8 - Math.sqrt(d)) * 0.28 / Math.sqrt(d); nx += dx * k; ny += dy * k; }
                }
            }
            // Steering ---------------------------------------------------------------------------------------
            let a = ang[i];
            if (want === want) {
                const wig = speed > 0 && tg === -1 ? SIN[(t * 7 + sd * 3) & 255] * 0.42 : 0;
                let da = want + wig - a; if (da > 3.1416) da -= 6.2832; else if (da < -3.1416) da += 6.2832;
                const turn = cs.turn; a += da > turn ? turn : da < -turn ? -turn : da;
                if (a > 3.1416) a -= 6.2832; else if (a < -3.1416) a += 6.2832;
                ang[i] = a;
            }
            if (speed > 0) {
                const c0 = fly ? 10 : cost[(ax / CELL | 0) + (ay / CELL | 0) * gw];
                if (c0 > 10) speed *= 0.45;
                nx += Math.cos(a) * speed; ny += Math.sin(a) * speed;
            }
            if (nx < 2) nx = 2; else if (nx > W) nx = W; if (ny < 2) ny = 2; else if (ny > H) ny = H;
            if (!fly) {
                const here = cost[(ax / CELL | 0) + (ay / CELL | 0) * gw];
                if (here && !cost[(nx / CELL | 0) + (ny / CELL | 0) * gw]) {
                    if (cost[(nx / CELL | 0) + (ay / CELL | 0) * gw]) ny = ay;
                    else if (cost[(ax / CELL | 0) + (ny / CELL | 0) * gw]) nx = ax;
                    else { nx = ax; ny = ay; ang[i] += 1.2; }
                }
            }
            x[i] = nx; y[i] = ny;
        }
        for (const col of this.colList) col.dirty = false;
    }
    nearFood(col, sd) {
        if (this.t - (col.nearT ?? -999) > 40) {
            col.nearT = this.t; col.near = [];
            for (const f of this.foods) if (f.alive && !f.heavy && dist2(f.x, f.y, col.x, col.y) < 62500) col.near.push(f);
        }
        const n = col.near; if (!n.length) return null;
        const f = n[sd % n.length]; return f.alive ? f : null;
    }
    loadUp(i, food, col, T, ax, ay) {
        const C = this.caste[i]; let cap = CAP[C].carry; if (C === CARRIER && col.chambers.hall > 1) cap = 11;
        if (food.alive && (!food.heavy || C === CARRIER)) {
            const n = this.takeFood(food, cap); this.carry[i] = food.type + 1; this.load[i] = n; this.wait[i] = 5; this.heavyLoad[i] = food.heavy ? 1 : 0;
            this.emit(EV.LOAD, ax, ay, T, food.type);
        }
    }
    bite(i, j, dmg) {
        this.hp[j] -= dmg; this.bites++;
        const T = this.team[i], Tj = this.team[j];
        this.emit(EV.HIT, this.x[j], this.y[j], Tj, dmg);
        const col = this.cols[Tj];
        if (this.hp[j] <= 0) this.kill(j, T, false);
        else if (this.target[j] === -1 && (this.caste[j] !== WORKER || this.seed[j] < 120)) this.target[j] = i;
        if ((this.t & 3) === 0 && dist2(this.x[j], this.y[j], col.x, col.y) < 90000) this.raiseAlarm(col, this.x[j], this.y[j]);
    }
    biteNest(col, dmg, by, x, y) {
        // A nest is dug deep: however big the swarm, a siege takes the better part of a minute, so defenders can answer it.
        if (col.biteT !== this.t) { col.biteT = this.t; col.biteSum = 0; }
        const cap = col.maxHp / (TICK_HZ * 50), hit = Math.min(dmg * 0.16, Math.max(0, cap - col.biteSum)); col.biteSum += hit;
        col.hp -= hit; this.bites++; col.lastHit = this.t;
        if ((this.t & 7) === 0) { this.emit(EV.NESTHIT, x, y, col.team, by); this.raiseAlarm(col, x, y); }
        if (col.hp <= 0) this.killQueen(col, by);
    }
    biteCritter(c, dmg, i, x, y) {
        c.hp -= dmg; c.hurt = 1; this.bites++; this.emit(EV.HIT, x, y, 9, dmg);
        if (c.hp <= 0 && c.alive) {
            c.alive = false; this.emit(EV.CRITTER_DEAD, c.x, c.y, c.k === "spider" ? 0 : 1, 0);
            if (this.cols[this.team[i]]) this.cols[this.team[i]].kills += 20;
            const f = this.addFood("beetle", c.x, c.y, c.drop ?? (c.k === "spider" ? 120 : 30), 0); if (c.k === "ladybird") { f.k = "jam"; f.type = SUGAR; }
        }
    }
    raiseAlarm(col, x, y) {
        col.alarm = { x, y, until: this.t + 60 };
        if (this.t - col.alarmAt > 30) { col.alarmAt = this.t; col.alarmField ??= new Field(this.gn); this.field(col.alarmField, [[x, y]], null); }
    }
    killQueen(col, by) {
        if (!col.alive) return;
        col.alive = false; col.hp = 0; this.emit(EV.QUEEN_DEAD, col.x, col.y, col.team, by);
        for (let i = 0; i < this.top; i++) if (this.alive[i] && this.team[i] === col.team) this.doom[i] = 20 + this.rand() * 120;
        for (let s = 0; s < 4; s++) col.slots[s] = null;
        this.addFood("sausage", col.x, col.y, 160, 0);
    }
    fireSpit(i, tx, ty, dmg, crit, tg) {
        if (this.spn >= MAX_SPIT) return;
        const n = this.spn++, d = Math.hypot(tx - this.x[i], ty - this.y[i]);
        this.spx[n] = this.x[i]; this.spy[n] = this.y[i]; this.spu[n] = tx; this.spf[n] = ty; this.spt[n] = 0; this.spl[n] = Math.max(4, d / 13); this.spg[n] = d;
        this.spteam[n] = this.team[i]; this.spdmg[n] = dmg; this.spcrit[n] = tg <= NEST_T ? tg : crit >= 0 ? CRIT_T - crit : -1;
        this.emit(EV.SPIT, this.x[i], this.y[i], this.team[i], 0);
    }
    stepSpit() {
        const sp = this;
        for (let n = 0; n < sp.spn;) {
            sp.spt[n]++;
            if (sp.spt[n] < sp.spl[n]) { n++; continue; }
            const x = sp.spu[n], y = sp.spf[n], T = sp.spteam[n], dmg = sp.spdmg[n], col = sp.cols[T], tgt = sp.spcrit[n];
            sp.emit(EV.SPAT, x, y, T, 0);
            if (tgt <= NEST_T) { if (sp.cols[NEST_T - tgt]?.alive) sp.biteNest(sp.cols[NEST_T - tgt], dmg * 0.8, T, x, y); }
            else if (tgt <= CRIT_T) { const c = sp.critters[CRIT_T - tgt]; if (c?.alive) { c.hp -= dmg; c.hurt = 1; if (c.hp <= 0) sp.biteCritter(c, 0, -1, x, y); } }
            else {
                const r = (col.chambers.vat > 1 ? 24 : 16), r2 = r * r, { hhead, hnext, hw, hh } = sp; let hits = 0;
                const cx = x / HCELL | 0, cy = y / HCELL | 0;
                for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
                    const xx = cx + ox, yy = cy + oy; if (xx < 0 || yy < 0 || xx >= hw || yy >= hh) continue;
                    for (let j = hhead[xx + yy * hw] - 1; j >= 0 && hits < 3; j = hnext[j] - 1) {
                        if (!sp.alive[j] || sp.cols[sp.team[j]].side === col.side) continue;
                        if (dist2(sp.x[j], sp.y[j], x, y) < r2) { hits++; sp.hp[j] -= dmg * DMG[SPITTER][sp.caste[j]]; sp.bites++; sp.emit(EV.HIT, sp.x[j], sp.y[j], sp.team[j], dmg); if (sp.hp[j] <= 0) sp.kill(j, T, false); }
                    }
                }
            }
            const l = --sp.spn;
            sp.spx[n] = sp.spx[l]; sp.spy[n] = sp.spy[l]; sp.spu[n] = sp.spu[l]; sp.spf[n] = sp.spf[l]; sp.spt[n] = sp.spt[l]; sp.spl[n] = sp.spl[l]; sp.spg[n] = sp.spg[l]; sp.spteam[n] = sp.spteam[l]; sp.spdmg[n] = sp.spdmg[l]; sp.spcrit[n] = sp.spcrit[l];
        }
    }
    stepColony(col) {
        if (!col.alive) return;
        if (col.alarm && col.alarm.until < this.t) col.alarm = null;
        if (col.hp < col.maxHp && this.t - (col.lastHit ?? -999) > 100) col.hp = Math.min(col.maxHp, col.hp + 0.25);
        if (col.saving) { if (this.build(col.team, col.saving)) col.saving = null; else if (!this.chamberOpen(col, col.saving)) col.saving = null; }
        if (--col.layT > 0) return;
        col.layT = LAY_TICKS[col.chambers.nursery ?? 0] * col.layMult * (col.chambers.nursery > 1 ? 1 : 1);
        if (col.total >= col.cap || col.saving) return;
        let c = this.pickCaste(col);
        if (c < 0 || (c === WORKER && !this.affordable(col, CASTES[WORKER].cost))) {
            // A starving queen scrapes together a free worker now and then, so no colony is ever stuck.
            if (col.counts[WORKER] + col.counts[CARRIER] >= 8 || this.t % 3) return;
            this.spawn(col.team, WORKER); return;
        }
        this.pay(col, CASTES[c].cost);
        const id = this.spawn(col.team, c); col.hatched++; this.assignJobSafe(id, col);
        if (id >= 0) this.emit(EV.HATCH, col.x, col.y, col.team, c);
    }
    assignJobSafe(id, col) { if (id >= 0) this.assignJob(id, col); }
    pickCaste(col) {
        const mix = col.mix; let sum = 0, tried = 0, spare = -1;
        for (let c = 0; c < 5; c++) sum += mix[c];
        for (let n = 0; n < 5; n++) {
            let best = -1, bs = -1e9;
            for (let c = 0; c < 5; c++) {
                if (tried & (1 << c) || mix[c] <= 0 || !col.unlocked(c)) continue;
                const s = mix[c] / sum - col.counts[c] / Math.max(1, col.total);
                if (s > bs) { bs = s; best = c; }
            }
            if (best < 0) break;
            tried |= 1 << best;
            if (this.affordable(col, CASTES[best].cost)) return best;
            const cost = CASTES[best].cost; if (cost[1] > col.stock[1] || cost[2] > col.stock[2] || cost[3] > col.stock[3]) spare = 1; else return -1;
        }
        // Short of a rare food: keep the colony growing. Short of crumbs: save up rather than spending them on workers.
        if ((spare > 0 || !tried) && this.affordable(col, CASTES[WORKER].cost)) return WORKER;
        return -1;
    }

    // --- Neutrals ------------------------------------------------------------------------------------------
    stepCritters() {
        const dt = 1 / TICK_HZ;
        for (const c of this.critters) {
            if (!c.alive) continue;
            c.px = c.x; c.py = c.y; c.t++; if (c.cd > 0) c.cd--; if (c.hurt > 0) c.hurt = Math.max(0, c.hurt - 0.1); if (c.lunge > 0) c.lunge--;
            if (c.k === "spider") this.stepSpider(c, dt); else this.stepLadybird(c, dt);
        }
    }
    stepSpider(c, dt) {
        const { alive, x, y } = this;
        if (c.t % 12 === 0 || (c.prey >= 0 && !alive[c.prey])) {
            let best = -1, bd = 130 * 130;
            const cx = c.x / HCELL | 0, cy = c.y / HCELL | 0;
            for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) {
                const xx = cx + ox, yy = cy + oy; if (xx < 0 || yy < 0 || xx >= this.hw || yy >= this.hh) continue;
                for (let j = this.hhead[xx + yy * this.hw] - 1; j >= 0; j = this.hnext[j] - 1) { if (!alive[j]) continue; const d = dist2(x[j], y[j], c.x, c.y); if (d < bd) { bd = d; best = j; } }
            }
            c.prey = best;
        }
        const home = dist2(c.x, c.y, c.hx, c.hy) > c.leash ** 2;
        if (c.prey >= 0 && alive[c.prey] && !home) {
            const j = c.prey, dx = x[j] - c.x, dy = y[j] - c.y, d = Math.hypot(dx, dy);
            c.ang = Math.atan2(dy, dx);
            if (d < c.r + 14) { if (c.cd === 0) { c.cd = 9; c.lunge = 4; this.hp[j] -= 34; this.bites++; this.emit(EV.CHOMP, x[j], y[j], 0, 0); if (this.hp[j] <= 0) this.kill(j, -1, false); } }
            else { const sp = (d < 60 ? 95 : c.speed + 26) * dt; c.x += dx / d * sp; c.y += dy / d * sp; }
        } else {
            const a = c.t * 0.013, tx = c.hx + Math.cos(a) * 60, ty = c.hy + Math.sin(a * 1.3) * 50, dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
            if (d > 4) { c.ang = Math.atan2(dy, dx); c.x += dx / d * c.speed * dt; c.y += dy / d * c.speed * dt; }
        }
    }
    stepLadybird(c, dt) {
        if (!c.food?.alive) {
            c.food = null; let bd = 1e12;
            for (const f of this.foods) if (f.alive && f.k !== "scraps") { const d = dist2(f.x, f.y, c.x, c.y); if (d < bd) { bd = d; c.food = f; } }
        }
        const f = c.food;
        if (f) {
            const dx = f.x - c.x, dy = f.y - c.y, d = Math.hypot(dx, dy) || 1;
            c.ang = Math.atan2(dy, dx) + Math.sin(c.t * 0.05) * 0.3;
            if (d > f.r * 0.8 + 6) { c.x += dx / d * c.speed * dt; c.y += dy / d * c.speed * dt; }
            else if (c.t % 14 === 0) this.takeFood(f, 1);
        }
        if (c.hurt > 0.8 && c.cd === 0) {
            // Reflex bleed: bitter goo that knocks the nearest biter out.
            c.cd = 26; const i = this.findCritTarget(c); if (i >= 0) { this.hp[i] -= 12; this.emit(EV.CHOMP, this.x[i], this.y[i], 1, 0); if (this.hp[i] <= 0) this.kill(i, -1, false); }
        }
    }
    findCritTarget(c) {
        const cx = c.x / HCELL | 0, cy = c.y / HCELL | 0; let best = -1, bd = 2500;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
            const xx = cx + ox, yy = cy + oy; if (xx < 0 || yy < 0 || xx >= this.hw || yy >= this.hh) continue;
            for (let j = this.hhead[xx + yy * this.hw] - 1; j >= 0; j = this.hnext[j] - 1) { if (!this.alive[j]) continue; const d = dist2(this.x[j], this.y[j], c.x, c.y); if (d < bd) { bd = d; best = j; } }
        }
        return best;
    }
    /** Everything under a footprint dies. Flyers are above it all. */
    squash(cx, cy, rx, ry, rot, by) {
        const c = Math.cos(rot), s = Math.sin(rot), m = Math.max(rx, ry); let n = 0;
        for (let i = 0; i < this.top; i++) {
            if (!this.alive[i] || this.caste[i] === FLYER) continue;
            const dx = this.x[i] - cx, dy = this.y[i] - cy; if (Math.abs(dx) > m || Math.abs(dy) > m) continue;
            const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
            if (u * u + v * v <= 1) { this.kill(i, -1, true); n++; }
        }
        return n;
    }
    stepHand() {
        const h = this.hand; if (!h) return;
        h.t++;
        if (--h.timer > 0) return;
        if (h.phase === "wait") {
            let best = null, bs = 0;
            for (const f of this.foods) if (f.alive && f.k !== "scraps" && !f.heavy && f.type !== MEAT) { const s = f.amount + this.rand() * 60; if (s > bs) { bs = s; best = f; } }
            if (!best) { h.timer = 200; return; }
            h.phase = "shadow"; h.timer = (h.warn ?? 3.5) * TICK_HZ; h.warnTicks = h.timer; h.food = best; h.x = best.x; h.y = best.y; h.t = 0;
            this.emit(EV.HAND_WARN, h.x, h.y, 0, 0);
        } else if (h.phase === "shadow") {
            h.phase = "grab"; h.timer = 16; h.t = 0;
            const n = this.squash(h.x, h.y, 78, 70, 0); h.grabbed = 0;
            if (h.food?.alive) { const got = Math.min(h.food.amount, Math.max(h.grab ?? 120, h.food.max * 0.34)); this.handStolen += got; h.grabbed = got; this.takeFood(h.food, got); }
            this.emit(EV.HAND_SLAM, h.x, h.y, n, h.grabbed);
        } else if (h.phase === "grab") {
            h.phase = "lift"; h.timer = 26; h.t = 0; this.emit(EV.HAND_LIFT, h.x, h.y);
        } else { h.phase = "wait"; h.timer = (h.every ?? 45) * TICK_HZ; h.slams++; }
    }
    stepShoe() {
        const h = this.shoe; if (!h) return;
        h.t++;
        if (--h.timer > 0) return;
        if (h.phase === "wait") {
            // A stroll across the map: pick an edge-to-edge line through somewhere busy.
            const fromLeft = this.rand() < 0.5, y0 = this.h * (0.2 + this.rand() * 0.6), y1 = this.h * (0.2 + this.rand() * 0.6);
            const n = Math.ceil(this.w / 150) + 1, steps = [];
            for (let i = 0; i <= n; i++) {
                const k = i / n, x = fromLeft ? k * this.w : (1 - k) * this.w, y = y0 + (y1 - y0) * k, nrm = i % 2 ? 44 : -44, rot = Math.atan2(y1 - y0, fromLeft ? this.w : -this.w);
                steps.push({ x: x - Math.sin(rot) * nrm, y: y + Math.cos(rot) * nrm, rot, left: i % 2 === 0 });
            }
            h.steps = steps; h.i = 0; h.phase = "shadow"; h.warnTicks = h.timer = (h.warn ?? 2.5) * TICK_HZ; h.t = 0;
            const s = steps[0]; h.x = s.x; h.y = s.y; h.rot = s.rot; h.left = s.left;
            this.emit(EV.SHOE_WARN, s.x, s.y, 1, 0); h.walks++;
        } else if (h.phase === "shadow") {
            const s = h.steps[h.i]; const n = this.squash(s.x, s.y, 104, 46, s.rot);
            for (const col of this.colList) if (col.alive && dist2(col.x, col.y, s.x, s.y) < 14400) { col.hp -= col.maxHp * 0.08; col.lastHit = this.t; if (col.hp <= 0) this.killQueen(col, -1); }
            this.emit(EV.SHOE_STOMP, s.x, s.y, n, s.rot); h.lastLeft = s.left;
            h.phase = "down"; h.timer = 10; h.t = 0;
        } else if (h.phase === "down") {
            h.i++;
            if (h.i >= h.steps.length) { h.phase = "wait"; h.timer = (h.every ?? 70) * TICK_HZ; return; }
            const s = h.steps[h.i]; h.x = s.x; h.y = s.y; h.rot = s.rot; h.left = s.left; h.phase = "shadow"; h.warnTicks = h.timer = (h.stepWarn ?? 1.3) * TICK_HZ; h.t = 0;
            this.emit(EV.SHOE_WARN, s.x, s.y, 0, 0);
        }
    }
    /** Keep war trails pointing at critters that wander, and raise alerts on what's closing on the player. */
    trackMovers() {
        for (const col of this.colList) for (const tr of col.slots) {
            if (!tr) continue;
            if (tr.critter) {
                if (!tr.critter.alive) { this.removeTrail(col.team, tr.slot); continue; }
                if (this.t - tr.movedAt > 40 && dist2(tr.hx, tr.hy, tr.critter.x, tr.critter.y) > 2500) { tr.hx = tr.critter.x; tr.hy = tr.critter.y; tr.movedAt = this.t; this.field(tr.field, [[tr.hx, tr.hy]], tr.pts); }
            }
            if (tr.nest !== undefined && !this.cols[tr.nest]?.alive) this.removeTrail(col.team, tr.slot);
        }
    }
    updateAlert() {
        const me = this.me; if (!me?.alive) { this.alert = null; return; }
        const near = this.enemiesNear(me.x, me.y, 300, me.side);
        const hit = this.t - (me.lastHit ?? -999) < 30;
        if (hit) this.alert = { level: 2, x: me.x, y: me.y, n: near };
        else if (near >= 3) { this.alert = { level: 1, x: me.x, y: me.y, n: near }; }
        else {
            this.alert = null;
            for (const col of this.colList) if (col.alive && col.side !== me.side) for (const tr of col.slots) if (tr?.nest === 0) {
                // Find the head of the column: the raider closest to home.
                let bx = 0, by = 0, bd = 1e12;
                for (let i = 0; i < this.top; i += 3) if (this.alive[i] && this.team[i] === col.team && this.job[i] === tr.slot) { const d = dist2(this.x[i], this.y[i], me.x, me.y); if (d < bd) { bd = d; bx = this.x[i]; by = this.y[i]; } }
                if (bd < 1e12 && bd < 700 * 700) this.alert = { level: 0, x: bx, y: by, n: 0, team: col.team };
            }
        }
    }
    // --- Winning ---------------------------------------------------------------------------------------------
    get seconds() { return this.t / TICK_HZ; }
    enemyAlive() { const me = this.me; return this.colList.some((c) => c.alive && c.side !== me.side); }
    /** Progress lines for the HUD, each { text, done, have, need }. */
    objectives() {
        const g = this.goal, me = this.me, out = [];
        if (g.gather) for (const [type, need] of g.gather) out.push({ have: Math.min(need, Math.floor(me.gathered[type])), need, label: "food", type });
        if (g.heavy) out.push({ have: Math.min(g.heavy, Math.floor(me.heavy)), need: g.heavy, label: "cake" });
        if (g.build) for (const id of g.build) out.push({ have: me.chambers[id] ? 1 : 0, need: 1, label: "build", id });
        if (g.pop) out.push({ have: Math.min(g.pop, me.total), need: g.pop, label: "ants" });
        if (g.critters) { const n = this.critters.filter((c) => c.alive && (g.critters === true || c.k === g.critters)).length, all = this.critters.filter((c) => g.critters === true || c.k === g.critters).length; out.push({ have: all - n, need: all, label: "critters" }); }
        if (g.destroy) { const all = this.colList.filter((c) => c.side !== me.side).length, left = this.colList.filter((c) => c.side !== me.side && c.alive).length; out.push({ have: all - left, need: all, label: "queens" }); }
        if (g.survive) out.push({ have: Math.min(g.survive, Math.floor(this.seconds)), need: g.survive, label: "survive" });
        return out;
    }
    checkGoal() {
        if (this.t % 5) return;
        const g = this.goal, me = this.me; if (!me) return;
        if (!me.alive) { this.outcome = "lose"; this.reason = "queen"; return; }
        if (g.limit && this.seconds >= g.limit) { this.outcome = "lose"; this.reason = "time"; return; }
        if (g.gather && g.gather.some(([type, need]) => { let left = me.gathered[type]; for (const f of this.foods) if (f.alive && f.type === type) left += f.amount; let ml = 0; for (let i = 0; i < this.top; i++) if (this.alive[i] && this.team[i] === 0 && this.carry[i] === type + 1) ml += this.load[i]; return left + ml < need; })) { this.outcome = "lose"; this.reason = "food"; return; }
        if (g.rival && this.colList.some((c) => c.side !== me.side && c.gathered[0] >= g.rival)) { this.outcome = "lose"; this.reason = "rival"; return; }
        const obj = this.objectives();
        if (obj.length && obj.every((o) => o.have >= o.need)) { this.outcome = "win"; for (const c of this.colList) if (c.alive && c.side !== me.side && g.destroy) this.killQueen(c, 0); }
    }
    /** 1 for finishing, +1 for keeping the queen healthy, +1 for beating par. */
    stars() { const g = this.goal, me = this.me; return 1 + (me.hp / me.maxHp >= 0.6 ? 1 : 0) + (this.seconds <= (g.par ?? 300) ? 1 : 0); }
}
