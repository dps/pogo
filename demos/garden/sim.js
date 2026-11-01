// The garden as pure rules, with no drawing. Positions are in cells: (2.5, 3.5) is the centre of column 2, row 3.
// A bot can run this directly, far faster than real time. The view listens through `hook(event, a, b, c)`.
import { ALL_PESTS, BOSSES, COLS, DEFS, LEVELS, PESTS, ROWS, SEASONS, endlessWave, levelWaves, seasonOfWave, unlockedAt, waveSummary } from "./data.js";

export const LAWN = 0, FLAG = 1, RICH = 2, BLOCK = 3, GOAL = 4, GATE = 5, POND = 6;
const N = COLS * ROWS, FAR = 32000;
export const cellOf = (c, r) => r * COLS + c;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const WEATHER = {
    spring: { kind: "rain", on: 7, off: 15 },
    summer: { kind: "scorcher", on: 10, off: 14 },
    autumn: { kind: "gale", on: 5, off: 12 },
    winter: { kind: "blizzard", on: 7, off: 16 },
};

class Rng {
    constructor(seed) { this.s = seed >>> 0 || 1; }
    next() { this.s = Math.imul(this.s, 1664525) + 1013904223 >>> 0; return this.s / 4294967296; }
    range(a, b) { return a + this.next() * (b - a); }
}

export class Sim {
    /** @param o { level: index, endless: mapIndex or undefined, meta: metaFx(), seed, hook } */
    constructor(o) {
        this.meta = o.meta;
        this.hook = o.hook ?? null;
        this.rng = new Rng(o.seed ?? 12345);
        this.endless = o.endless !== undefined;
        this.levelIndex = this.endless ? o.endless : o.level;
        const lv = LEVELS[this.levelIndex];
        this.def = lv;
        this.season = this.endless ? "spring" : lv.season;
        this.unlocked = this.endless ? unlockedAt(99) : unlockedAt(this.levelIndex + 1);

        this.tile = new Uint8Array(N);
        this.tower = new Array(N).fill(null);
        this.wet = new Float32Array(N);
        this.wetSlip = new Float32Array(N).fill(1);
        this.slime = new Float32Array(N);
        this.leaf = new Uint8Array(N);
        this.dist = new Int16Array(N);
        this.next = new Int16Array(N);
        this.gates = [];
        this.goal = null;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const ch = lv.map[r][c], i = cellOf(c, r);
            this.tile[i] = ch === "." ? LAWN : ch === "," ? FLAG : ch === "*" ? RICH : ch === "G" ? GOAL : ch === "S" ? GATE : ch === "~" ? POND : BLOCK;
            if (ch === "G") this.goal = { c, r, x: c + 0.5, y: r + 0.5, i };
            if (ch === "S") this.gates.push({ c, r, x: c + 0.5, y: r + 0.5, i });
        }

        this.enemies = [];
        this.towers = [];
        this.shots = [];
        this.bees = [];
        this.buckets = Array.from({ length: N }, () => []);
        this.scratch = [];
        this.time = 0;
        this.nextId = 1;
        this.killed = 0;
        this.earned = 0;

        this.pennies = lv.start + this.meta.start + (this.endless ? 300 : 0);
        this.maxBites = this.endless ? 20 + this.meta.bites : 20 + this.meta.bites;
        this.bites = this.maxBites;
        this.waves = this.endless ? [] : levelWaves(this.levelIndex);
        this.total = this.endless ? Infinity : this.waves.length;
        this.wave = 0;              // waves started so far
        this.spawnQ = [];
        this.clock = 0;
        this.hold = !this.endless && this.levelIndex === 0;   // the very first level waits for your first plant
        this.countdown = 22 + this.meta.firstWait + (this.levelIndex < 4 ? 8 : 0);
        this.countdownMax = this.countdown;
        this.sentEarly = 0;
        this.geraldReady = this.meta.gerald;
        this.slipperCd = 0;
        this.over = null;           // "win" | "lose"
        this.weather = { kind: WEATHER[this.season].kind, on: false, t: 11, dir: 1 };
        this.fxClock = 0;
        this.leafClock = 0;
        this.route();
    }

    emit(a, b, c, d) { if (this.hook) this.hook(a, b, c, d); }
    get bossAlive() { return this.enemies.find((e) => e.t.boss && !e.dead) ?? null; }

    // ---- Routes ----------------------------------------------------------------------------------------------
    blocked(i) { const t = this.tile[i]; if (t === BLOCK || t === POND) return true; const w = this.tower[i]; return !!w && !w.s.walk; }

    /** Breadth-first from the goal. `plug` pretends one extra cell is blocked, for placement previews. */
    bfs(dist, next, plug = -1) {
        dist.fill(FAR);
        const q = [this.goal.i];
        dist[this.goal.i] = 0; next[this.goal.i] = this.goal.i;
        for (let h = 0; h < q.length; h++) {
            const i = q[h], c = i % COLS, r = (i - c) / COLS, d = dist[i] + 1;
            for (let n = 0; n < 4; n++) {
                const nc = c + (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 0 : -1), nr = r + (n === 0 ? 1 : n === 2 ? -1 : 0);
                if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
                const j = cellOf(nc, nr);
                if (dist[j] !== FAR || j === plug || this.blocked(j)) continue;
                dist[j] = d; next[j] = i; q.push(j);
            }
        }
    }

    route() {
        this.bfs(this.dist, this.next);
        // Blocked cells still point at their best neighbour, so anyone standing on a fresh plant walks off it.
        for (let i = 0; i < N; i++) if (this.dist[i] === FAR) {
            const c = i % COLS, r = (i - c) / COLS; let best = FAR, to = i;
            for (const [dc, dr] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
                const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
                const j = cellOf(nc, nr); if (this.dist[j] < best) { best = this.dist[j]; to = j; }
            }
            this.next[i] = to;
        }
        this.routes = this.gates.map((g) => this.trace(g.i, this.dist, this.next));
        this.routeLen = this.routes.reduce((n, p) => Math.max(n, p.length), 0);
    }

    trace(i, dist, next) {
        const pts = []; let guard = 0;
        while (guard++ < 200) {
            const c = i % COLS, r = (i - c) / COLS;
            pts.push([c + 0.5, r + 0.5]);
            if (dist[i] === 0 || dist[i] === FAR) break;
            i = next[i];
        }
        return pts;
    }

    /** Would planting at this cell leave a way through? Returns the routes it would make, or null. */
    tryRoutes(i) {
        const d = this._d ??= new Int16Array(N), n = this._n ??= new Int16Array(N);
        this.bfs(d, n, i);
        for (const g of this.gates) if (d[g.i] === FAR) return null;
        for (const e of this.enemies) {
            if (e.dead || e.fly || e.burrowed) continue;
            const k = cellOf(e.x | 0, e.y | 0);
            if (k !== i && d[k] === FAR) return null;
        }
        return this.gates.map((g) => this.trace(g.i, d, n));
    }

    // ---- Planting --------------------------------------------------------------------------------------------
    costOf(key) { return Math.round(DEFS[key].cost * this.meta.cost); }
    upCost(t, branch) {
        const u = this.nextUp(t, branch);
        return u ? Math.round(u.cost * this.meta.upCost) : 0;
    }
    nextUp(t, branch) {
        const b = t.branch ?? branch;
        if (t.tier >= 3 || (t.branch && branch && branch !== t.branch)) return null;
        return DEFS[t.key][b]?.[t.tier - 1] ?? null;
    }

    /** Why this can't go here, or "" if it can. */
    whyNot(key, c, r) {
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return "outside";
        const i = cellOf(c, r), t = this.tile[i], d = DEFS[key];
        if (t === BLOCK || t === POND || t === GOAL || t === GATE) return "occupied";
        if (this.tower[i]) return "occupied";
        if (t === FLAG && !d.walk) return "paving";
        if (!d.walk && !this.tryRoutes(i)) return "sealed";
        return "";
    }

    plant(key, c, r) {
        if (this.over || this.whyNot(key, c, r) || this.pennies < this.costOf(key)) return null;
        const d = DEFS[key], i = cellOf(c, r), price = this.costOf(key);
        const t = {
            id: this.nextId++, key, def: d, c, r, i, x: c + 0.5, y: r + 0.5, tier: 1, branch: null, s: { ...d }, spent: price,
            cd: 0.3, stun: 0, stacks: 0, hp: d.hp ?? 0, down: false, mDmg: 1, mRate: 1, mRange: 0, watered: false, warm: true, sleeping: false,
            target: null, heat: 0, sips: d.sips ?? 0, pulse: 0, attackT: 0, angle: 0, heads: null, nibbled: 0,
        };
        this.pennies -= price;
        this.tower[i] = t;
        this.towers.push(t);
        if (!d.walk) this.route();
        this.syncBees(t);
        this.towerFx();
        this.hold = false;
        this.emit("plant", t);
        return t;
    }

    upgrade(t, branch) {
        const u = this.nextUp(t, branch), cost = this.upCost(t, branch);
        if (this.over || !u || this.pennies < cost) return false;
        this.pennies -= cost;
        t.spent += cost;
        t.branch = t.branch ?? branch;
        t.tier++;
        const hpGain = (u.hp ?? t.s.hp ?? 0) - (t.s.hp ?? 0);
        Object.assign(t.s, u);
        if (u.hp) t.hp += hpGain;
        if (u.sips) t.sips = u.sips;
        this.syncBees(t);
        this.towerFx();
        this.emit("upgrade", t);
        return true;
    }

    sellValue(t) { return Math.floor(t.spent * this.meta.refund); }
    sell(t) {
        if (this.over) return false;
        this.pennies += this.sellValue(t);
        this.tower[t.i] = null;
        this.towers.splice(this.towers.indexOf(t), 1);
        this.bees = this.bees.filter((b) => b.t !== t);
        for (const e of this.enemies) if (e.taunt === t) e.taunt = null;
        this.route();
        this.towerFx();
        this.emit("sell", t);
        return true;
    }

    syncBees(t) {
        if (t.s.kind !== "hive") return;
        const want = t.s.bees + this.meta.bees, have = this.bees.filter((b) => b.t === t).length;
        for (let i = have; i < want; i++) this.bees.push({ t, x: t.x, y: t.y, px: t.x, py: t.y, target: null, cd: 0, a: this.rng.range(0, 6.28), seek: 0 });
    }

    /** Rebuild what every neighbourhood, heap, trellis and the weather does to each defender. */
    towerFx() {
        const w = this.weather, hot = w.kind === "scorcher" && w.on, cold = w.kind === "blizzard";
        const heaps = this.towers.filter((t) => t.s.kind === "aura"), trellis = this.towers.filter((t) => t.s.reach), sprinklers = this.towers.filter((t) => t.s.kind === "water");
        const within = (a, b, r) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r)) <= r - 0.5 + 1e-6;
        for (const t of this.towers) {
            let dmg = this.meta.dmg, rate = 1, reach = 0;
            if (this.tile[t.i] === RICH) { dmg += this.meta.rich; rate += this.meta.rich; }
            for (const h of heaps) if (h !== t && within(h, t, h.s.range)) {
                dmg += (h.s.buffDmg + h.stacks * 0.02) * this.meta.heap;
                rate += h.s.buffRate * this.meta.heap;
            }
            for (const h of trellis) if (h !== t && within(h, t, 1.5)) reach = Math.max(reach, h.s.reach);
            t.watered = false;
            if (t.s.plant) for (const h of sprinklers) if (Math.hypot(h.x - t.x, h.y - t.y) <= h.s.range + 0.01) t.watered = true;
            if (t.watered) rate += 0.2;
            if (hot && t.s.plant && !t.watered) rate -= 0.3;
            if (hot && (t.s.kind === "spit" || t.s.beam)) dmg *= 1.5;
            t.warm = true;
            if (cold) {
                t.warm = heaps.some((h) => Math.hypot(h.x - t.x, h.y - t.y) <= (h.s.warm ?? 0) + 0.01) || this.towers.some((o) => o.s.kind === "spit" && Math.hypot(o.x - t.x, o.y - t.y) <= 1.5);
                if (!t.warm) rate -= 0.25;
            }
            t.sleeping = cold && t.s.kind === "hive" && !t.warm;
            t.mDmg = dmg; t.mRate = Math.max(0.3, rate) / this.meta.rate; t.mRange = reach;
        }
    }

    // ---- Waves -----------------------------------------------------------------------------------------------
    groupsFor(w) { return this.endless ? endlessWave(w, this.gates.length) : this.waves[w]; }
    preview() { return this.wave < this.total ? waveSummary(this.groupsFor(this.wave)) : []; }
    earlyBonus() {
        if (this.wave >= this.total || this.hold) return 0;
        return Math.floor(Math.max(0, this.countdown) * (0.8 + this.levelIndex * 0.06) * this.meta.early);
    }

    /** Send the next wave. If it was the player's choice, pay the early bonus. */
    sendWave(early = true) {
        if (this.over || this.wave >= this.total) return false;
        if (early) {
            const bonus = this.earlyBonus();
            if (bonus > 0) { this.pennies += bonus; this.earned += bonus; this.sentEarly++; this.emit("early", bonus); }
        }
        const w = this.wave++, groups = this.groupsFor(w);
        let last = 0;
        for (const g of groups) for (let j = 0; j < g.count; j++) {
            const at = this.clock + g.at + j * g.gap;
            this.spawnQ.push({ at, type: g.type, gate: g.gate % this.gates.length });
            last = Math.max(last, at);
        }
        this.spawnQ.sort((a, b) => a.at - b.at);
        this.hold = false;
        this.countdown = Math.max(16, (last - this.clock) + 10);
        this.countdownMax = this.countdown;
        if (this.wave >= this.total) this.countdown = 0;

        // Pay day. Every wave is a day's takings plus Gran's savings interest.
        let income = 0;
        for (const t of this.towers) if (t.s.income) income += t.s.income;
        income *= this.meta.income;
        const interest = w > 0 ? Math.floor(Math.min(this.pennies, this.meta.interestCap) * this.meta.interest) : 0;
        const wage = w > 0 ? 18 + w * 4 : 0;
        const pay = Math.floor(income) + interest + wage;
        if (pay > 0) { this.pennies += pay; this.earned += pay; this.emit("payday", pay, interest, Math.floor(income)); }
        for (const t of this.towers) {
            if (t.s.kind === "taunt") { t.hp = t.s.hp; if (t.down) { t.down = false; this.emit("mend", t); } }
            if (t.s.kind === "wine") t.sips = t.s.sips;
        }
        this.geraldReady = this.meta.gerald;
        if (this.endless) {
            const s = seasonOfWave(w);
            if (s !== this.season) {
                this.season = s;
                this.weather = { kind: WEATHER[s].kind, on: false, t: 8, dir: 1 };
                this.towerFx();
                this.emit("season", s);
            }
        }
        this.emit("wave", w, groups.some((g) => ALL_PESTS[g.type].boss));
        return true;
    }

    // ---- Pests -----------------------------------------------------------------------------------------------
    scaleHp(type, w) {
        const t = ALL_PESTS[type];
        if (this.endless) return t.boss ? 1 + w * 0.05 : (1 + w * 0.055);
        return t.boss ? 1 : (1 + this.levelIndex * 0.05) * (1 + w * 0.03);
    }

    spawn(type, x, y, o = {}) {
        const t = ALL_PESTS[type], hp = t.hp * (o.hpScale ?? this.scaleHp(type, Math.max(0, this.wave - 1)));
        const e = {
            id: this.nextId++, type, t, x, y, px: x, py: y, hp, maxHp: hp, armor: t.armor ?? 0, fly: !!t.fly, burrowed: !!t.burrow, size: t.size,
            hx: 0, hy: -1, lx: this.rng.range(-0.3, 0.3), ly: this.rng.range(-0.3, 0.3), phase: this.rng.range(0, 6.28),
            slowT: 0, slowF: 1, stunT: 0, sleepT: 0, tipsyT: 0, fearT: 0, burn: 0, burnT: 0, poison: 0, poisonT: 0, wet: 0, revealT: 0, markT: 0, mark: 0, swell: 0, hitT: 0,
            taunt: null, tauntT: 0, tauntCd: 0, sipCd: 0, moleT: this.rng.range(1.2, 2.2), surfT: 0, wander: 0, rollT: 0, rolled: false, cd: 0, shellT: 0, shellCd: 10,
            eggT: t.egg ? 3.2 : 0, layCd: 2.5, stageHp: 0.66, prog: 999, dead: false, knock: 0, wormCd: 0, under: -1, sx: 1,
            gx: this.goal.x, gy: this.goal.y, wobble: this.rng.range(0.8, 1.3), spd: t.speed * this.rng.range(0.94, 1.06),
        };
        this.enemies.push(e);
        if (this._seen === undefined) this._seen = {};
        if (!this._seen[type]) { this._seen[type] = true; this.emit("firstSeen", type); }
        if (t.boss) this.emit("boss", e);
        return e;
    }

    gain(p) { this.pennies += p; this.earned += p; }

    damage(e, amount, fx, fy, pierce) {
        if (e.dead || amount <= 0) return;
        if (e.shellT > 0) amount *= 0.12;
        if (e.t.shield && !pierce && fx !== undefined) {
            const dx = fx - e.x, dy = fy - e.y, len = Math.hypot(dx, dy) || 1;
            if ((dx * e.hx + dy * e.hy) / len > 0.35) { amount *= 0.12; e.blockT = 0.2; this.emit("block", e); }
        }
        if (e.t.roller && !e.rolled && !pierce) { e.rolled = true; e.rollT = 2.4; amount *= 0.2; this.emit("roll", e); }
        const armor = e.wet > 0 ? 0 : e.armor;
        if (!pierce && armor > 0) amount = Math.max(amount * 0.12, amount - armor);
        if (e.wet > 0 && this.season === "winter" && !e.fly) amount *= 1.35;   // ice makes them brittle
        if (e.markT > 0) amount *= 1 + e.mark;
        if (e.swell > 0) amount *= 1 + e.swell * 0.08;
        e.hp -= amount;
        e.hitT = 0.12;
        if (e.hp <= 0) this.kill(e);
        else if (e.t.boss) this.bossStages(e);
    }

    bossStages(e) {
        const f = e.hp / e.maxHp;
        if (f < e.stageHp) {
            e.stageHp -= 0.33;
            if (e.t.burp) {
                for (let i = 0; i < 6; i++) this.spawn("baby", e.x + this.rng.range(-0.6, 0.6), e.y + this.rng.range(-0.6, 0.6));
                this.emit("burp", e);
            }
            if (e.t.split) {
                this.spawn("broody", e.x - 0.6, e.y); this.spawn("frost", e.x + 0.6, e.y); this.spawn("frost", e.x, e.y + 0.5);
                e.spd *= 1.25;
            }
        }
    }

    kill(e) {
        if (e.dead) return;
        e.dead = true;
        this.killed++;
        this.gain(e.t.bounty * 2.2);
        for (const t of this.towers) {
            if (t.s.kind === "aura") { if (t.stacks < 10 && Math.hypot(t.x - e.x, t.y - e.y) < 2.6) { t.stacks++; this._fxDirty = true; } }
            else if (t.s.tip && Math.hypot(t.x - e.x, t.y - e.y) < t.s.range) this.gain(t.s.tip);
        }
        if (e.burn > 0 && e.spread) {
            this.near(e.x, e.y, 1.3, false);
            for (const o of this.scratch) { o.burn = Math.max(o.burn, e.burn); o.burnT = Math.max(o.burnT, 2.5); o.spread = true; }
            this.emit("flare", e.x, e.y);
        }
        if (e.t.spawner) for (let i = 0; i < 4; i++) this.spawn("baby", e.x + this.rng.range(-0.4, 0.4), e.y + this.rng.range(-0.4, 0.4));
        this.emit("kill", e);
    }

    /** Fills this.scratch with living, surfaced pests within r. Touches only nearby buckets. */
    near(x, y, r, flyersToo = true) {
        const out = this.scratch; out.length = 0;
        const c0 = clamp((x - r) | 0, 0, COLS - 1), c1 = clamp((x + r) | 0, 0, COLS - 1), r0 = clamp((y - r) | 0, 0, ROWS - 1), r1 = clamp((y + r) | 0, 0, ROWS - 1), rr = r * r;
        for (let j = r0; j <= r1; j++) for (let i = c0; i <= c1; i++) {
            const b = this.buckets[cellOf(i, j)];
            for (let k = 0; k < b.length; k++) {
                const e = b[k]; if (e.dead || (e.fly && !flyersToo)) continue;
                const dx = e.x - x, dy = e.y - y;
                if (dx * dx + dy * dy <= rr) out.push(e);
            }
        }
        return out;
    }

    /** The pest nearest the marrow that this defender can see. */
    pick(t, range) {
        const list = this.near(t.x, t.y, range);
        let best = null, bp = Infinity;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (e.t.stealth && e.revealT <= 0) continue;
            if (e.fly ? !t.s.air : !t.s.ground) continue;
            if (e.prog < bp) { bp = e.prog; best = e; }
        }
        return best;
    }

    surface(e, sec) { if (e.burrowed) { e.burrowed = false; e.surfT = sec; this.emit("surface", e); this.onSurface(e); } else e.surfT = Math.max(e.surfT, sec); }
    onSurface(e) {
        if (e.t.quake) {
            for (const t of this.towers) if (Math.hypot(t.x - e.x, t.y - e.y) < 2.3) { t.stun = Math.max(t.stun, 2.5); this.emit("daze", t); }
            this.emit("quake", e);
        }
    }

    // ---- Main tick -------------------------------------------------------------------------------------------
    tick(dt) {
        if (this.over) return;
        this.time += dt;
        if (this.slipperCd > 0) this.slipperCd -= dt;
        this.tickWeather(dt);
        this.tickWaves(dt);

        for (let i = 0; i < N; i++) { const b = this.buckets[i]; if (b.length) b.length = 0; }
        const list = this.enemies;
        for (let i = 0; i < list.length; i++) {
            const e = list[i];
            if (!e.burrowed) this.buckets[cellOf(clamp(e.x | 0, 0, COLS - 1), clamp(e.y | 0, 0, ROWS - 1))].push(e);
        }
        const hot = this.weather.kind === "scorcher" && this.weather.on;
        for (let i = 0; i < N; i++) {
            if (this.wet[i] > 0) { this.wet[i] -= dt * (hot ? 3 : 1); if (this.wet[i] <= 0) this.wetSlip[i] = 1; }
            if (this.slime[i] > 0) this.slime[i] -= dt;
        }
        this.fxClock -= dt;
        if (this.fxClock <= 0 || this._fxDirty) { this.fxClock = 0.5; this._fxDirty = false; this.towerFx(); }

        for (let i = 0; i < this.towers.length; i++) this.tickTower(this.towers[i], dt);
        for (let i = 0; i < list.length; i++) if (!list[i].dead) this.tickPest(list[i], dt);
        this.tickShots(dt);
        this.tickBees(dt);

        let n = 0;
        for (let i = 0; i < list.length; i++) if (!list[i].dead) list[n++] = list[i];
        list.length = n;

        if (!this.over && this.wave >= this.total && !this.spawnQ.length && !list.length) this.finish("win");
    }

    finish(result) {
        this.over = result;
        this.stars = result === "win" ? (this.bites >= this.maxBites * 0.9 ? 3 : this.bites >= this.maxBites * 0.5 ? 2 : 1) : 0;
        this.emit("over", result);
    }

    tickWeather(dt) {
        const w = this.weather, cfg = WEATHER[this.season];
        if (this.wave === 0) return;                // hold the clouds until the first wave
        w.t -= dt;
        if (w.t <= 0) {
            w.on = !w.on;
            w.t = w.on ? cfg.on : cfg.off;
            w.dir = this.rng.next() < 0.5 ? -1 : 1;
            this.towerFx();
            this.emit("weather", w.kind, w.on);
        }
        if (w.kind === "rain" && w.on) for (let i = 0; i < N; i++) if (this.tile[i] !== BLOCK) { this.wet[i] = Math.max(this.wet[i], 0.7); this.wetSlip[i] = Math.min(this.wetSlip[i], 0.8); }
        if (w.kind === "gale" && w.on) {
            this.leafClock -= dt;
            if (this.leafClock <= 0) {
                this.leafClock = 1.1;
                const i = (this.rng.next() * N) | 0;
                if (this.tile[i] === LAWN && !this.tower[i] && !this.leaf[i] && this.leafCount() < 8) { this.leaf[i] = 1; this.emit("leaf", i); }
            }
        }
    }
    leafCount() { let n = 0; for (let i = 0; i < N; i++) n += this.leaf[i]; return n; }

    igniteLeaf(i) {
        if (!this.leaf[i] || this.wet[i] > 0) return;
        this.leaf[i] = 0;
        const c = i % COLS, r = (i - c) / COLS;
        this.near(c + 0.5, r + 0.5, 1.4);
        for (const e of [...this.scratch]) { e.burn = Math.max(e.burn, 12); e.burnT = Math.max(e.burnT, 3); this.damage(e, 12); }
        this.emit("bonfire", c + 0.5, r + 0.5);
    }

    tickWaves(dt) {
        this.clock += dt;
        const q = this.spawnQ;
        while (q.length && q[0].at <= this.clock) {
            const s = q.shift(), g = this.gates[s.gate];
            this.spawn(s.type, g.x + this.rng.range(-0.25, 0.25), g.y + this.rng.range(-0.2, 0.2));
        }
        if (this.hold || this.wave >= this.total) return;
        this.countdown -= dt;
        if (this.countdown <= 0) this.sendWave(false);
    }

    // ---- Defenders -------------------------------------------------------------------------------------------
    tickTower(t, dt) {
        if (t.attackT > 0) t.attackT -= dt;
        if (t.stun > 0) { t.stun -= dt; t.target = null; return; }
        if (t.sleeping || t.down) return;
        const s = t.s, range = (s.range ?? 0) + t.mRange;
        t.cd -= dt * t.mRate;
        switch (s.kind) {
            case "lob":
                if (t.cd > 0) return;
                { const e = this.pick(t, range); if (!e) { t.cd = 0.08; return; }
                    t.cd = s.rate; t.attackT = 0.25; t.angle = Math.atan2(e.y - t.y, e.x - t.x);
                    const T = s.pebble ? 0 : 0.45;
                    if (s.pebble) this.shots.push({ kind: "pebble", x: t.x, y: t.y - 0.2, px: t.x, py: t.y, e, speed: 9, dmg: s.dmg * t.mDmg, fx: t.x, fy: t.y, life: 1, t });
                    else this.shots.push({ kind: "gnome", x: t.x, y: t.y, px: t.x, py: t.y, sx: t.x, sy: t.y, tx: clamp(e.x + e.hx * e.spd * 0.4, 0.3, COLS - 0.3), ty: clamp(e.y + e.hy * e.spd * 0.4, 0.3, ROWS - 0.3), T: T + Math.hypot(e.x - t.x, e.y - t.y) * 0.08, a: 0, dmg: s.dmg * t.mDmg, splash: s.splash, stunT: s.stunT ?? 0, heavy: t.tier === 3, fx: t.x, fy: t.y, big: t.branch === "a" ? t.tier : 1 });
                    this.emit("fire", t);
                }
                return;
            case "thorn":
                if (t.cd > 0) return;
                t.cd = s.rate;
                if (s.dmg) { const list = this.near(t.x, t.y, range, false); let hit = false;
                    for (let i = list.length - 1; i >= 0; i--) { const e = list[i]; if (e.t.stealth && e.revealT <= 0) continue; this.damage(e, s.dmg * t.mDmg, undefined, undefined, true); hit = true; if (s.snare) { e.slowF = Math.min(e.slowF, s.snare); e.slowT = Math.max(e.slowT, 0.6); } if (i === 0) break; }
                    if (hit) t.attackT = 0.15; }
                return;
            case "water": this.tickWater(t, s, range, dt); return;
            case "chomp": this.tickChomp(t, s, range); return;
            case "taunt": this.tickTaunt(t, s, range, dt); return;
            case "chime":
                if (t.cd > 0) return;
                t.cd = s.rate;
                { const list = this.near(t.x, t.y, range); let any = list.length > 0;
                    for (let i = list.length - 1; i >= 0; i--) { const e = list[i];
                        if (!e.t.boss || !s.stunT) if (s.stunT && !e.t.boss) e.stunT = Math.max(e.stunT, s.stunT);
                        e.slowF = Math.min(e.t.boss ? Math.max(s.slow, 0.7) : s.slow, e.slowT > 0 ? e.slowF : 1); e.slowT = Math.max(e.slowT, s.slowT);
                        if (s.gust && e.fly) { const dx = e.x - this.goal.x, dy = e.y - this.goal.y, l = Math.hypot(dx, dy) || 1, k = e.t.boss ? 0.2 : 1; e.x = clamp(e.x + dx / l * s.gust * k, 0.2, COLS - 0.2); e.y = clamp(e.y + dy / l * s.gust * k, 0.2, ROWS - 0.2); }
                        if (s.shove && !e.fly && !e.t.boss) e.knock = Math.max(e.knock, s.shove);
                        if (s.dmg) this.damage(e, s.dmg * t.mDmg, undefined, undefined, true);
                    }
                    if (s.dig) for (const e of this.enemies) if (e.burrowed && Math.hypot(e.x - t.x, e.y - t.y) < range) { this.surface(e, 1.4); any = true; }
                    t.attackT = 0.5;
                    this.emit("chime", t, any);
                }
                return;
            case "spit":
                if (t.cd > 0) return;
                { const e = this.pick(t, range); if (!e) { t.cd = 0.08; return; }
                    t.cd = s.rate; t.attackT = 0.2; t.angle = Math.atan2(e.y - t.y, e.x - t.x);
                    if (s.cone) {
                        const ax = Math.cos(t.angle), ay = Math.sin(t.angle), list = [...this.near(t.x, t.y, range)];
                        for (const o of list) { const dx = o.x - t.x, dy = o.y - t.y, l = Math.hypot(dx, dy) || 1; if ((dx * ax + dy * ay) / l < 0.8) continue; if (o.t.stealth && o.revealT <= 0) continue; this.ignite(o, s, t); this.damage(o, s.dmg * t.mDmg, undefined, undefined, true); }
                        if (this.leaf.length) { const c = (t.x + ax * 1.5) | 0, r = (t.y + ay * 1.5) | 0; if (c >= 0 && r >= 0 && c < COLS && r < ROWS) this.igniteLeaf(cellOf(c, r)); }
                        this.emit("spray", t);
                    } else {
                        this.shots.push({ kind: "seed", x: t.x, y: t.y - 0.2, px: t.x, py: t.y, e, speed: 6.5, dmg: s.dmg * t.mDmg, fx: t.x, fy: t.y, life: 1.2, t, s });
                        this.emit("fire", t);
                    }
                }
                return;
            case "light":
                if (t.cd <= 0) { t.cd = 0.2;
                    const list = this.near(t.x, t.y, range);
                    for (let i = 0; i < list.length; i++) { const e = list[i]; e.revealT = 0.5; if (s.mark) { e.markT = 0.5; e.mark = s.mark; } if (s.lure && e.fly && !e.t.boss) { e.slowF = Math.min(e.slowF, s.lure); e.slowT = 0.4; } }
                }
                if (s.beam) {
                    let e = t.target;
                    if (!e || e.dead || e.burrowed || Math.hypot(e.x - t.x, e.y - t.y) > range) { e = this.pick(t, range); if (e !== t.target) t.heat = 0; t.target = e; }
                    if (e) { t.heat = Math.min(1, t.heat + dt / 3); this.damage(e, s.beam * (0.12 + 0.88 * t.heat) * t.mDmg * t.mRate * dt, undefined, undefined, true); }
                }
                return;
            case "wine":
                if (t.sips <= 0 || t.cd > 0) return;
                t.cd = s.rate;
                { const list = this.near(t.x, t.y, range, false);
                    for (let i = 0; i < list.length && t.sips > 0; i++) { const e = list[i];
                        if (e.t.boss || e.sipCd > 0 || e.t.egg) continue;
                        e.sipCd = 5; t.sips--; t.attackT = 0.3;
                        if (s.tipsyT) e.tipsyT = s.tipsyT;
                        if (s.sleepT) e.sleepT = s.sleepT;
                        if (s.poison) { e.poison = Math.max(e.poison, s.poison * t.mDmg); e.poisonT = 5; }
                        this.emit("sip", e, t);
                        if (t.sips <= 0 && s.blast) { const near = [...this.near(t.x, t.y, 1.7)]; for (const o of near) this.damage(o, s.blast * t.mDmg, undefined, undefined, true); this.emit("blast", t); break; }
                    }
                }
                return;
            default: return;
        }
    }

    tickWater(t, s, range, dt) {
        t.angle += dt * 2.4;
        if (t.cd > 0) return;
        t.cd = s.rate;
        const R = Math.ceil(range);
        for (let r = t.r - R; r <= t.r + R; r++) for (let c = t.c - R; c <= t.c + R; c++) {
            if (c < 0 || r < 0 || c >= COLS || r >= ROWS || Math.hypot(c - t.c, r - t.r) > range + 0.05) continue;
            const i = cellOf(c, r); if (this.tile[i] === BLOCK) continue;
            this.wet[i] = Math.max(this.wet[i], s.wetT); this.wetSlip[i] = Math.min(this.wetSlip[i], s.slip);
            if (this.leaf[i] && this.season !== "autumn") this.leaf[i] = 0;
        }
        t.pulse++;
        if ((s.push || s.dmg) && t.pulse % 3 === 0) {
            const list = this.near(t.x, t.y, range, false);
            for (let i = 0; i < list.length; i++) {
                const e = list[i]; if (e.t.boss) continue;
                e.knock = Math.max(e.knock, s.push ?? 0);
                if (s.dmg) e.hp -= s.dmg * t.mDmg * 0.5;
                if (e.hp <= 0) { this.kill(e); }
            }
            t.attackT = 0.3;
            this.emit("jet", t);
        }
    }

    tickChomp(t, s, range) {
        if (t.cd > 0) return;
        const list = this.near(t.x, t.y, range), meals = [];
        for (let i = 0; i < list.length; i++) { const e = list[i]; if (e.t.stealth && e.revealT <= 0) continue; if (!e.t.egg) meals.push(e); }
        if (!meals.length) { t.cd = 0.08; return; }
        meals.sort((a, b) => b.hp - a.hp);
        t.cd = s.rate; t.attackT = 0.6;
        const n = Math.min(s.bites, meals.length);
        for (let i = 0; i < n; i++) {
            const e = meals[i], bite = s.dmg * t.mDmg;
            if (e.hp <= bite && !e.t.boss) { e.swallowed = true; this.emit("swallow", e, t); this.kill(e); }
            else this.damage(e, bite, undefined, undefined, true);
            if (s.pay) this.gain(s.pay);
        }
        this.emit("chomp", t, n);
    }

    tickTaunt(t, s, range, dt) {
        if (t.hp <= 0) { if (!t.down) { t.down = true; this.emit("collapse", t); for (const e of this.enemies) if (e.taunt === t) e.taunt = null; } return; }
        t.nibbled = 0;
        if (t.cd > 0 && !s.fear) { /* taunts below on their own clock */ }
        t._tc = (t._tc ?? 0) - dt;
        if (t._tc <= 0) {
            t._tc = 0.3;
            const list = this.near(t.x, t.y, range);
            let held = 0;
            for (const e of this.enemies) if (e.taunt === t) held++;
            for (let i = 0; i < list.length && held < s.tauntN; i++) {
                const e = list[i];
                if (e.taunt || e.tauntCd > 0 || e.t.egg || e.fearT > 0 || (e.t.boss && !s.bossTaunt)) continue;
                e.taunt = t; e.tauntT = e.t.boss ? 2 : 4; held++;
                this.emit("taunt", t);
            }
        }
        if (s.fear && t.cd <= 0) {
            t.cd = s.rate; t.attackT = 0.7;
            const list = this.near(t.x, t.y, range);
            for (let i = 0; i < list.length; i++) { const e = list[i]; if (!e.t.boss && !e.t.egg) { e.fearT = s.fear; e.taunt = null; if (s.crow) this.damage(e, s.crow * t.mDmg, undefined, undefined, true); } }
            this.emit("fear", t);
        }
    }

    ignite(e, s, t) {
        if (e.wet > 0 && !e.fly) { this.emit("fizz", e); return; }
        e.burn = Math.max(e.burn, s.burn * t.mDmg); e.burnT = Math.max(e.burnT, s.burnT); if (s.spread) e.spread = true;
    }

    // ---- Shots and bees --------------------------------------------------------------------------------------
    tickShots(dt) {
        const shots = this.shots;
        let n = 0;
        for (let i = 0; i < shots.length; i++) {
            const p = shots[i];
            p.px = p.x; p.py = p.y;
            let done = false;
            if (p.kind === "gnome") {
                p.a += dt / p.T;
                const k = Math.min(1, p.a);
                p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k;
                if (k >= 1) {
                    done = true;
                    const r = Math.max(p.splash, 0.5), list = [...this.near(p.tx, p.ty, r, false)];
                    let hit = 0;
                    for (const e of list) { if (e.t.stealth && e.revealT <= 0) continue; this.damage(e, p.dmg, p.fx, p.fy, false); if (p.stunT && !e.t.boss) e.stunT = Math.max(e.stunT, p.stunT); hit++; }
                    this.emit("land", p, hit);
                }
            } else {
                const e = p.e;
                p.life -= dt;
                if (e.dead || e.burrowed) { done = p.life <= 0 || e.dead; if (e.dead || e.burrowed) done = true; }
                else {
                    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy), step = p.speed * dt;
                    if (d <= step + 0.12) {
                        done = true;
                        if (p.kind === "seed") {
                            this.ignite(e, p.s, p.t); this.damage(e, p.dmg, undefined, undefined, true);
                            const c = e.x | 0, r = e.y | 0; if (c >= 0 && r >= 0 && c < COLS && r < ROWS) this.igniteLeaf(cellOf(c, r));
                        } else this.damage(e, p.dmg, p.fx, p.fy, false);
                        this.emit("hit", p, e);
                    } else { p.x += dx / d * step; p.y += dy / d * step; }
                }
            }
            if (!done) shots[n++] = p;
        }
        shots.length = n;
    }

    tickBees(dt) {
        const gale = this.weather.kind === "gale" && this.weather.on;
        for (const b of this.bees) {
            b.px = b.x; b.py = b.y;
            const t = b.t, s = t.s;
            if (t.stun > 0 || t.sleeping) { b.target = null; const dx = t.x - b.x, dy = t.y - 0.1 - b.y; b.x += dx * dt * 5; b.y += dy * dt * 5; b.home = true; continue; }
            b.home = false;
            b.seek -= dt; b.cd -= dt * t.mRate;
            let e = b.target;
            if (e && (e.dead || e.burrowed || Math.hypot(e.x - t.x, e.y - t.y) > s.range + t.mRange + 0.8)) e = b.target = null;
            if (!e && b.seek <= 0) { b.seek = 0.2; e = b.target = this.pick(t, s.range + t.mRange); }
            const speed = (gale ? 3 : 4.6) * dt;
            if (e) {
                const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
                if (d > 0.14) { b.x += dx / d * speed; b.y += dy / d * speed; }
                else if (b.cd <= 0) {
                    b.cd = s.rate;
                    this.damage(e, s.dmg * t.mDmg, undefined, undefined, true);
                    if (s.honey) { e.slowF = Math.min(e.slowF, s.honey); e.slowT = Math.max(e.slowT, 1.5); }
                    if (s.swell) e.swell = Math.min(5, e.swell + 1);
                    this.emit("sting", e);
                }
            } else {
                b.a += dt * 3;
                const hx = t.x + Math.cos(b.a) * 0.5, hy = t.y - 0.25 + Math.sin(b.a * 1.3) * 0.35, dx = hx - b.x, dy = hy - b.y;
                b.x += dx * dt * 5; b.y += dy * dt * 5;
            }
        }
    }

    // ---- Pest behaviour --------------------------------------------------------------------------------------
    tickPest(e, dt) {
        e.px = e.x; e.py = e.y;
        const T = e.t;
        if (e.hitT > 0) e.hitT -= dt;
        if (e.sipCd > 0) e.sipCd -= dt;
        if (e.wormCd > 0) e.wormCd -= dt;
        if (e.tauntCd > 0) e.tauntCd -= dt;
        if (e.markT > 0) e.markT -= dt;
        if (e.revealT > 0) e.revealT -= dt;

        const c = clamp(e.x | 0, 0, COLS - 1), r = clamp(e.y | 0, 0, ROWS - 1), i = cellOf(c, r);
        const tileWet = this.wet[i] > 0;
        e.wet = !e.fly && tileWet ? 0.5 : Math.max(0, e.wet - dt);
        if (e.wet > 0 && T.stealth) e.revealT = Math.max(e.revealT, 0.4);
        if (e.burn > 0) {
            if (e.wet > 0 && this.season !== "winter") { e.burn = 0; e.burnT = 0; this.emit("fizz", e); }
            else {
                e.burnT -= dt; e.hp -= e.burn * dt; e.hitT = Math.max(e.hitT, 0.03);
                if (T.stealth) e.revealT = Math.max(e.revealT, 0.3);
                if (this.leaf[i]) this.igniteLeaf(i);
                if (e.burnT <= 0) e.burn = 0;
                if (e.hp <= 0) { this.kill(e); return; }
            }
        }
        if (e.poison > 0) { e.poisonT -= dt; e.hp -= e.poison * dt; if (e.poisonT <= 0) e.poison = 0; if (e.hp <= 0) { this.kill(e); return; } }

        if (T.egg) {
            e.eggT -= dt;
            if (e.eggT <= 0) { e.dead = true; for (let k = 0; k < 3; k++) this.spawn("baby", e.x + this.rng.range(-0.25, 0.25), e.y + this.rng.range(-0.25, 0.25)); this.emit("hatch", e); }
            return;
        }
        if (e.stunT > 0) { e.stunT -= dt; return; }
        if (e.sleepT > 0) { e.sleepT -= dt; return; }

        // Specials
        if (T.spawner) { e.layCd -= dt; if (e.layCd <= 0) { e.layCd = 3.6; this.spawn("egg", e.x, e.y); this.emit("lay", e); } }
        if (T.stings) this.tickWasp(e, dt);
        if (T.chills) { e.cd -= dt; if (e.cd <= 0) { e.cd = 0.7; const w = this.towerNear(e, 1.15); if (w && w.stun <= 0) { w.stun = 1.1; this.emit("freeze", w); } } }
        if (T.trail) this.slime[i] = 6;
        if (T.shellup) {
            if (e.shellT > 0) { e.shellT -= dt; e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt); return; }
            e.shellCd -= dt;
            if (e.shellCd <= 0) { e.shellCd = 12; e.shellT = 3; this.emit("shellup", e); }
        }
        if (T.brood) { e.layCd -= dt; if (e.layCd <= 0) { e.layCd = 5; for (let k = 0; k < 5; k++) this.spawn("aphid", e.x + this.rng.range(-0.5, 0.5), e.y + this.rng.range(-0.5, 0.5)); this.emit("brood", e); } }
        if (T.freeze) { e.cd -= dt; if (e.cd <= 0) { e.cd = 10; for (const t of this.towers) if (Math.hypot(t.x - e.x, t.y - e.y) < 2.6) { t.stun = Math.max(t.stun, 2); this.emit("freeze", t); } this.emit("frostwave", e); } }

        // Speed
        let f = 1;
        if (e.slowT > 0) { e.slowT -= dt; f *= e.slowF; if (e.slowT <= 0) e.slowF = 1; }
        if (!e.fly && !e.burrowed) {
            if (tileWet) f *= this.season === "winter" ? 1.35 : this.wetSlip[i] || 1;
            if (this.slime[i] > 0 && !T.boss) f *= 1.25;
        }
        const w = this.weather;
        if (w.kind === "blizzard") f *= w.on ? 0.78 : 0.93;
        if (e.rollT > 0) { e.rollT -= dt; f *= 2; }
        const speed = e.spd * f;

        if (e.burrowed || (T.burrow && e.surfT > 0)) { this.tickMole(e, dt, speed, i, tileWet); return; }
        if (e.fly) { this.tickFlyer(e, dt, speed); return; }
        this.tickWalker(e, dt, speed, i, c, r);
    }

    towerNear(e, d) {
        const list = this.towers;
        for (let i = 0; i < list.length; i++) { const t = list[i]; const dx = t.x - e.x, dy = t.y - e.y; if (dx * dx + dy * dy < d * d && !t.s.walk) return t; }
        return null;
    }

    tickWasp(e, dt) {
        e.cd -= dt;
        if (e.cd > 0) return;
        const t = this.towerNear(e, 1.3);
        if (t) { e.cd = 3.5; t.stun = Math.max(t.stun, 2.6); this.emit("waspSting", t, e); }
        else e.cd = 0.25;
    }

    tickFlyer(e, dt, speed) {
        const w = this.weather;
        if (e.taunt) { if (this.tauntPull(e, dt, speed)) return; }
        if (e.fearT > 0) { e.fearT -= dt; speed = -speed * 0.8; }
        const dx = e.gx - e.x, dy = e.gy - e.y, d = Math.hypot(dx, dy) || 1;
        const sway = Math.sin(this.time * 2.4 * e.wobble + e.phase) * 0.55;
        e.hx = dx / d; e.hy = dy / d;
        e.x += (e.hx - e.hy * sway) * speed * dt;
        e.y += (e.hy + e.hx * sway) * speed * dt;
        if (w.kind === "gale" && w.on) e.x += w.dir * 0.8 * dt * (e.t.boss ? 0.2 : 1);
        e.x = clamp(e.x, 0.15, COLS - 0.15);
        e.prog = d;
        if (d < 0.4) this.reachGoal(e);
    }

    tickMole(e, dt, speed, i, tileWet) {
        if (!e.burrowed) {
            e.surfT -= dt;
            if (e.surfT <= 0) { e.burrowed = true; e.moleT = this.rng.range(1.6, 2.4); this.emit("dive", e); }
            else return;
        }
        // Underground. Water floods the tunnel; worms drag them up.
        if (tileWet && this.season !== "winter") { this.surface(e, 1.5); return; }
        for (const t of this.towers) {
            if (t.s.worm && e.wormCd <= 0 && Math.hypot(t.x - e.x, t.y - e.y) < t.s.worm) { e.wormCd = 4; this.surface(e, 1.5); e.stunT = 0.8; this.emit("worm", t, e); return; }
        }
        const w = this.tower[i];
        if (w && e.under !== i && !w.s.walk) { e.under = i; w.stun = Math.max(w.stun, 1); this.emit("uproot", w); }
        const dx = e.gx - e.x, dy = e.gy - e.y, d = Math.hypot(dx, dy) || 1;
        e.hx = dx / d; e.hy = dy / d;
        e.x += e.hx * speed * dt; e.y += e.hy * speed * dt;
        e.prog = d;
        if (d < 0.45) { e.burrowed = false; this.reachGoal(e); return; }
        e.moleT -= dt;
        if (e.moleT <= 0) this.surface(e, e.t.boss ? 3.5 : 1.5);
    }

    tauntPull(e, dt, speed) {
        const t = e.taunt;
        e.tauntT -= dt;
        if (t.down || !t.s || e.tauntT <= 0) { e.taunt = null; e.tauntCd = 3; return false; }
        const dx = t.x - e.x, dy = t.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 0.75) {
            t.hp -= (e.t.boss ? 60 : 8 + e.t.threat) * dt; t.nibbled = 1;
            if (t.s.thorn) { e.hp -= t.s.thorn * t.mDmg * dt; if (e.hp <= 0) this.kill(e); }
            return true;
        }
        e.hx = dx / d; e.hy = dy / d;
        const nx = e.x + e.hx * speed * dt, ny = e.y + e.hy * speed * dt;
        if (e.fly) { e.x = nx; e.y = ny; return true; }
        const free = (x, y) => { const c = x | 0, r = y | 0; return c >= 0 && r >= 0 && c < COLS && r < ROWS && !this.blocked(cellOf(c, r)); };
        if (free(nx, ny)) { e.x = nx; e.y = ny; } else if (free(nx, e.y)) e.x = nx; else if (free(e.x, ny)) e.y = ny; else t.hp -= 2 * dt;
        return true;
    }

    reachGoal(e) {
        e.dead = true;
        if (this.geraldReady && !e.t.boss) { this.geraldReady = false; this.gain(e.t.bounty); this.emit("gerald", e); return; }
        this.bites = Math.max(0, this.bites - e.t.bites);
        this.emit("bite", e);
        if (this.bites <= 0) this.finish("lose");
    }

    tickWalker(e, dt, speed, i, c, r) {
        if (this.tile[i] === GOAL) { this.reachGoal(e); return; }
        if (e.taunt && this.tauntPull(e, dt, speed)) return;

        let tx, ty;
        if (e.knock > 0) {
            // Shoved back the way they came.
            const k = Math.min(e.knock, dt * 3.5); e.knock -= k;
            const mult = this.season === "winter" && this.wet[i] > 0 ? 2 : 1;
            this.shove(e, this.backFrom(i), k * mult);
            return;
        }
        if (e.fearT > 0) { e.fearT -= dt; const b = this.backFrom(i); tx = b[0]; ty = b[1]; }
        else if (e.tipsyT > 0) {
            e.tipsyT -= dt; e.wander -= dt;
            if (e.wander <= 0) { e.wander = 0.5; const a = this.rng.range(0, 6.28); e.wx = Math.cos(a); e.wy = Math.sin(a); }
            tx = e.x + e.wx; ty = e.y + e.wy; speed *= 0.6;
        } else {
            // Head for the next cell, cutting the corner when both sides of it are open.
            let n = this.next[i];
            const n2 = this.next[n], c2 = n2 % COLS, r2 = (n2 - c2) / COLS;
            if (c2 !== c && r2 !== r && Math.abs(c2 - c) === 1 && Math.abs(r2 - r) === 1 && !this.blocked(cellOf(c2, r)) && !this.blocked(cellOf(c, r2))) n = n2;
            const nc = n % COLS, nr = (n - nc) / COLS;
            tx = nc + 0.5 + e.lx * (this.tile[n] === GOAL ? 0 : 1); ty = nr + 0.5 + e.ly * (this.tile[n] === GOAL ? 0 : 1);
        }
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
        const turn = Math.min(1, dt * (e.t.boss ? 4 : 9));
        e.hx += (dx / d - e.hx) * turn; e.hy += (dy / d - e.hy) * turn;
        const hl = Math.hypot(e.hx, e.hy) || 1;
        const nx = e.x + e.hx / hl * speed * dt, ny = e.y + e.hy / hl * speed * dt;
        const nci = cellOf(clamp(nx | 0, 0, COLS - 1), clamp(ny | 0, 0, ROWS - 1));
        if (!this.blocked(nci) || this.blocked(i)) { e.x = nx; e.y = ny; }
        else {
            // Slide along whatever is in the way.
            const a = cellOf(clamp(nx | 0, 0, COLS - 1), r), b = cellOf(c, clamp(ny | 0, 0, ROWS - 1));
            if (!this.blocked(a)) e.x = nx; else if (!this.blocked(b)) e.y = ny; else { e.x += (c + 0.5 - e.x) * dt * 3; e.y += (r + 0.5 - e.y) * dt * 3; }
        }
        const fr = this.tile[i] === FLAG ? 0 : 0;
        e.prog = this.dist[i] + fr + (1 - this.frac(e, i));
    }

    /** How far through its cell a pest is, for telling who leads. */
    frac(e, i) { const n = this.next[i], nc = n % COLS, nr = (n - nc) / COLS, c = i % COLS, r = (i - c) / COLS; return clamp(0.5 + (e.x - c - 0.5) * (nc - c) + (e.y - r - 0.5) * (nr - r), 0, 1); }

    backFrom(i) {
        const c = i % COLS, r = (i - c) / COLS; let best = -1, bx = c + 0.5, by = r + 0.5;
        for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
            const nc = c + dc, nr = r + dr; if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
            const j = cellOf(nc, nr); if (this.blocked(j) || this.dist[j] === FAR) continue;
            if (this.dist[j] > best) { best = this.dist[j]; bx = nc + 0.5; by = nr + 0.5; }
        }
        return [bx, by];
    }

    shove(e, to, amount) {
        const dx = to[0] - e.x, dy = to[1] - e.y, d = Math.hypot(dx, dy) || 1, s = Math.min(amount, d);
        const nx = e.x + dx / d * s, ny = e.y + dy / d * s;
        if (!this.blocked(cellOf(clamp(nx | 0, 0, COLS - 1), clamp(ny | 0, 0, ROWS - 1)))) { e.x = nx; e.y = ny; }
    }

    // ---- Gran's slipper --------------------------------------------------------------------------------------
    slipper(x, y) {
        if (this.slipperCd > 0 || this.over) return false;
        this.slipperCd = this.meta.slipperCd;
        const r = this.meta.toecap ? 1.7 : 1.3, dmg = 90 * this.meta.slipperDmg * (1 + this.levelIndex * 0.12);
        this.emit("slipper", x, y);
        if (this.meta.toecap) for (const e of this.enemies) if (e.burrowed && Math.hypot(e.x - x, e.y - y) < r) this.surface(e, 1.2);
        const list = [...this.near(x, y, r)];
        for (const e of list) { this.damage(e, dmg, undefined, undefined, true); if (!e.t.boss) e.stunT = Math.max(e.stunT, 1.2); }
        return true;
    }
}

export { BOSSES, PESTS, SEASONS };
