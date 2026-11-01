// The town. Pure logic with no framework in it, so bots can run a thousand years in Node.
// The world layer reads this state and the event list; it never writes back.
import { ADJ, BOAT_WOOD, BUILDINGS, DRIFT, HOURS, MAX_STARS, PRICE, SEASON_DAYS, SEASONS, WALL_RISE, WRECK_DEPTH, gain } from "./data.js";
import { DIRS, RADIUS, hexDist } from "./hex.js";

const HEIGHT = { ".": -1, s: 0, m: 1, h: 2, R: 3, f: 1, F: 2, "@": 1, A: 2, d: 0 };
export const FOREST = 4;              // Cell flag only; see cell.forest.
const WEEK = 8;                       // Days from one spring tide to the next.

/** Parse an island map into cells. Exposed for the validator. */
export function parseMap(text) {
    const rows = text.trim().split("\n").map((l) => l.trim().split(/\s+/));
    if (rows.length !== RADIUS * 2 + 1) throw new Error(`map has ${rows.length} rows`);
    const cells = [], index = new Map();
    rows.forEach((row, ri) => {
        const r = ri - RADIUS, q0 = Math.max(-RADIUS, -r - RADIUS);
        if (row.length !== RADIUS * 2 + 1 - Math.abs(r)) throw new Error(`row ${ri} has ${row.length} tiles: ${row.join(" ")}`);
        row.forEach((ch, i) => {
            if (!(ch in HEIGHT)) throw new Error(`bad tile ${ch}`);
            const q = q0 + i, c = { i: cells.length, q, r, h: HEIGHT[ch], forest: ch === "f" || ch === "F", ch, n: [], b: null, wet: false };
            index.set(`${q},${r}`, c.i);
            cells.push(c);
        });
    });
    for (const c of cells) for (const [dq, dr] of DIRS) {
        const j = index.get(`${c.q + dq},${c.r + dr}`);
        if (j !== undefined) c.n.push(j);
    }
    return { cells, index };
}

export const stiltFloor = (type, h) => h + (BUILDINGS[type].stilts ? 1 : 0);

export class Sim {
    constructor(scn, opts = {}) {
        this.scn = scn;
        this.relaxed = !!opts.relaxed;
        const m = parseMap(scn.map);
        this.cells = m.cells;
        this.index = m.index;
        this.t = 7;                   // Start at 7am, so the first dawn is already underway.
        this.buildings = [];
        this.nextId = 1;
        this.coins = scn.start.coins;
        this.wood = scn.start.wood;
        this.fish = 0;
        this.grain = 0;
        this.water = 0;
        this.events = [];
        this.stats = { earned: 0, sold: { fish: 0, grain: 0 }, trawlers: 0, wrecked: 0, flooded: 0, peakFed: 0, peakCheer: 0, peakFolk: 0, streak: 0, placed: 0, ridden: 0 };
        this.goalDone = scn.goals.map(() => false);
        this.finishedDay = 0;
        this.storms = scn.storms.map((s) => ({ ...s, raw: s.level, level: this.relaxed ? Math.min(s.level, 0.95) : s.level }));
        this.stormIdx = 0;
        this.stormB = 0;
        this.storm = null;
        this.stormCottagesWet = 0;
        this.lastLevelKey = null;
        for (const c of this.cells) if (c.ch === "@" || c.ch === "A") this._raise("hall", c, true);
        for (const c of this.cells) if (c.ch === "d") this._raise("dock", c, true);
        this.refresh();
        this.updateWater();
    }

    // --- Time ------------------------------------------------------------------------------------

    get day() { return Math.floor(this.t / HOURS); }
    get hour() { return this.t % HOURS; }
    get seasonIndex() { return (this.scn.startSeason + Math.floor(this.day / SEASON_DAYS)) % 4; }
    get season() { return SEASONS[this.seasonIndex]; }
    get year() { return 1 + Math.floor((this.scn.startSeason * SEASON_DAYS + this.day) / (SEASON_DAYS * 4)); }

    /** Water height at a given sim time, ignoring storms. High water falls at midday-ish and drifts with the spring tides. */
    tideAt(t) {
        const d = t / HOURS, spring = 0.5 + 0.5 * Math.cos(2 * Math.PI * d / WEEK);
        const amp = (0.42 + 0.28 * spring) * this.scn.tide;
        return amp * Math.sin(2 * Math.PI * (t - 18) / HOURS);   // Low water at noon, so the beaches are out by day.
    }

    /** Storm strength 0 to 1 across its 36 hours: builds, holds at the top, ebbs. */
    stormAt(t) {
        for (let i = Math.max(0, this.stormIdx - 1); i < this.storms.length; i++) {
            const s = this.storms[i], x = (t - s.day * HOURS) / 36;
            if (x > 0 && x < 1) {
                const b = x < 0.45 ? smooth(x / 0.45) : x < 0.6 ? 1 : 1 - smooth((x - 0.6) / 0.4);
                return { storm: s, b };
            }
        }
        return null;
    }

    waterAt(t) {
        const f = this.stormAt(t), tide = this.tideAt(t);
        return f ? tide * (1 - f.b) + f.storm.level * f.b : tide;
    }

    /** The next storm, if there is one to forecast. */
    get nextStorm() {
        return this.storms[this.stormIdx] ?? null;
    }

    /** Hours until the storm begins. Forecast at 5 days, 9 with a working lighthouse. */
    get forecast() {
        const s = this.nextStorm;
        if (!s) return null;
        const hours = s.day * HOURS - this.t, reach = this.count("light") ? 9 : 5;
        return hours <= reach * HOURS ? { storm: s, hours, level: s.level } : null;
    }

    count(type) {
        return this.buildings.reduce((n, b) => n + (b.type === type && !b.wrecked ? 1 : 0), 0);
    }

    get folk() {
        let n = 2;
        for (const b of this.buildings) if (b.type === "cottage" && !b.wrecked && !b.wet) n += 3;
        return n;
    }

    get jobs() {
        let n = 0;
        for (const b of this.buildings) if (BUILDINGS[b.type].staff && !b.wrecked) n += BUILDINGS[b.type].staff;
        return n;
    }

    get cheer() {
        let n = 0;
        for (const b of this.buildings) if (!b.wrecked) n += b.stars;
        return n;
    }

    // --- Rules for one tile ----------------------------------------------------------------------

    /** Would the sea reach this cell at this level, given the walls now standing? Returns a marked array. */
    floodMap(level, extraWall = -1, ignore = -1) {
        const seen = new Uint8Array(this.cells.length), stack = [];
        const enter = (c) => {
            if (seen[c.i]) return;
            if (level <= c.h) return;
            if (c.i === ignore) { seen[c.i] = 1; stack.push(c); return; }
            const isWall = c.i === extraWall || (c.b && c.b.type === "wall" && !c.b.wrecked);
            if (isWall && level <= c.h + WALL_RISE) return;
            seen[c.i] = 1;
            stack.push(c);
        };
        for (const c of this.cells) if (c.h < 0) { seen[c.i] = 1; stack.push(c); }
        while (stack.length) {
            const c = stack.pop();
            for (const j of c.n) enter(this.cells[j]);
        }
        return seen;
    }

    /**
     * For every cell, the lowest water level that can reach it past the walls now standing.
     * A bottleneck search outward from the open sea, cached until the town changes.
     */
    reachLevels() {
        if (this._reach) return this._reach;
        const n = this.cells.length, reach = new Float32Array(n).fill(99), done = new Uint8Array(n);
        const entry = (c) => (c.b && c.b.type === "wall" && !c.b.wrecked ? c.h + WALL_RISE : c.h);
        for (const c of this.cells) if (c.h < 0) reach[c.i] = -1;
        for (let k = 0; k < n; k++) {
            let u = -1;
            for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || reach[i] < reach[u])) u = i;
            if (u < 0 || reach[u] >= 99) break;
            done[u] = 1;
            for (const j of this.cells[u].n) {
                const v = Math.max(reach[u], entry(this.cells[j]));
                if (v < reach[j]) reach[j] = v;
            }
        }
        return this._reach = reach;
    }

    /** The lowest water level at which this tile, with this building, gets wet. */
    safeLevel(type, cell) {
        if (type === "wall") return cell.h + WALL_RISE;
        return Math.max(stiltFloor(type, cell.h), this.reachLevels()[cell.i]);
    }

    canPlace(type, cell) {
        const B = BUILDINGS[type];
        if (cell.h < 0) return { ok: false, why: "That's open sea" };
        if (cell.b) return { ok: false, why: "Tile taken" };
        if (!this.scn.unlocks.includes(type)) return { ok: false, why: "Not available here" };
        if (!cell.n.some((j) => this.cells[j].b)) return { ok: false, why: "Must touch the town" };
        const sand = cell.h === 0;
        if (!B.terrain.includes(cell.h)) {
            // Non-stilted buildings may stand on sand a wall has reclaimed.
            const reclaim = sand && type !== "wall" && type !== "dock" && type !== "yard" && this.reachLevels()[cell.i] >= 0.9;
            if (!reclaim) return { ok: false, why: sand ? "Too wet: wall this sand off first" : cell.h === 3 ? "Bare rock won't take it" : "Wrong ground" };
        }
        if (B.shore && !cell.n.some((j) => this.cells[j].h < 0) && cell.n.length === 6) return { ok: false, why: "Must touch the sea" };
        if (this.coins < B.cost[0] || this.wood < B.cost[1]) return { ok: false, why: this.coins < B.cost[0] ? "Not enough coins" : "Not enough wood", poor: true };
        return { ok: true };
    }

    /** Stars a building of this type earns on this cell, with reasons. `without` pretends a cell is empty. */
    starsFor(type, cell, extra = null) {
        const table = ADJ[type];
        const parts = [];
        let total = 0;
        if (table) for (const j of cell.n) {
            const n = this.cells[j];
            const t = extra && extra.cell === n.i ? extra.type : (n.b && !n.b.wrecked ? n.b.type : null);
            if (!t) continue;
            const v = table[t] ?? 0;
            if (v) { total += v; parts.push({ cell: j, v, label: BUILDINGS[t].name }); }
        }
        const terr = (v, label) => { total += v; parts.push({ cell: cell.i, v, label }); };
        if (type === "wood") {
            let trees = 0;
            for (const j of cell.n) if (this.cells[j].forest && !(extra && extra.cell === j)) { trees++; parts.push({ cell: j, v: 1, label: "Woods" }); }
            total += trees;
        }
        if (type === "mill" && cell.h >= 2) terr(cell.h - 1, "High ground");
        if (type === "light" && cell.h >= 2) terr(cell.h === 3 ? 3 : 1, "High ground");
        if (type === "cottage" && cell.h >= 2) terr(1, "The view");
        return { stars: Math.max(0, Math.min(MAX_STARS, total)), parts };
    }

    /**
     * What placing here would do: how the tile scores, how neighbours change, and how safe it is.
     * This is the number on the ghost, and what bots read.
     */
    preview(type, cell) {
        const can = this.canPlace(type, cell);
        const own = this.starsFor(type, cell);
        const links = [], extra = { cell: cell.i, type };
        let delta = own.stars;
        for (const j of cell.n) {
            const c = this.cells[j], b = c.b;
            if (!b || b.wrecked) continue;
            const after = this.starsFor(b.type, c, extra).stars, d = after - b.stars;
            if (d) { delta += d; links.push({ cell: j, v: d, label: BUILDINGS[b.type].name }); }
        }
        if (cell.forest) for (const j of cell.n) {
            const c = this.cells[j];
            if (c.b?.type === "wood" && !c.b.wrecked) delta -= 1;
        }
        const safe = this.safeLevel(type, cell), fc = this.nextStorm;
        const out = { ...can, stars: own.stars, delta, parts: own.parts, links, safe, atRisk: !!fc && fc.level > safe, output: this.outputOf(type, own.stars, cell) };
        if (type === "wall") out.saves = this.wallSaves(cell);
        return out;
    }

    /** The level a wall is judged against: the next storm, or the worst tide if the skies are clear. */
    get testLevel() { return Math.max(this.nextStorm?.level ?? 0, 0.9); }

    /** Land a wall here would keep dry from the next storm. Sand behind it counts too: that is how bays are reclaimed. */
    wallSaves(cell) {
        const L = this.testLevel, before = this.floodMap(L), after = this.floodMap(L, cell.i);
        let n = 0;
        for (const c of this.cells) if (c.h >= 0 && c.i !== cell.i && before[c.i] && !after[c.i]) n++;
        return n;
    }

    /** One line for the tooltip: what a day's work pays with this many stars. */
    outputOf(type, stars) {
        const g = gain(stars);
        switch (type) {
            case "cottage": return `${g} rent a day`;
            case "dock": return `${g} fish a day`;
            case "market": return `sells ${2 + stars} a day`;
            case "wood": return `${g} wood a day`;
            case "farm": return `${g} grain a day`;
            case "pub": return `brews ${1 + g} a day`;
            case "smoke": return `smokes ${1 + g} a day`;
            case "yard": return "builds trawlers";
            case "mill": return "boosts farms";
            case "light": return "guards boats";
            case "wall": return "holds the sea";
            case "lane": return "links tiles";
            case "garden": return "neighbours smile";
            default: return "";
        }
    }

    // --- Changing the town ---------------------------------------------------------------------

    _raise(type, cell, free = false) {
        const b = {
            id: this.nextId++, type, cell: cell.i, stars: 0, connected: true, staffed: true, wet: false, soak: 0, wrecked: false, trawler: false, boatOut: false, built: this.t, hour: 0, depth: 0, last: "", fed: false, sand: cell.h === 0,
        };
        b.hour = 8 + (b.id * 7) % 11;          // Spread work through the day, so the town is always doing something.
        cell.b = b;
        this.buildings.push(b);
        if (!free) this.stats.placed++;
        return b;
    }

    place(type, cell) {
        const can = this.canPlace(type, cell);
        if (!can.ok) return null;
        const [c, w] = BUILDINGS[type].cost;
        this.coins -= c;
        this.wood -= w;
        const cleared = cell.forest;
        if (cleared) { cell.forest = false; this.wood += 2; this.events.push({ e: "clear", cell: cell.i }); }
        const b = this._raise(type, cell);
        this.refresh();
        this.updateFlood(true);
        return b;
    }

    /** Always allowed, always refunds half: no layout can trap a player. */
    demolish(cell) {
        const b = cell.b;
        if (!b || b.type === "hall") return false;
        const [c, w] = BUILDINGS[b.type].cost;
        if (!b.wrecked) { this.coins += Math.floor(c / 2); this.wood += Math.floor(w / 2); }
        cell.b = null;
        this.buildings.splice(this.buildings.indexOf(b), 1);
        this.events.push({ e: "demolish", cell: cell.i, type: b.type });
        this.refresh();
        this.updateFlood(true);
        return true;
    }

    /** Recompute links, staffing and stars. Cheap enough to run after every change. */
    refresh() {
        this._reach = null;
        const hall = this.buildings.find((b) => b.type === "hall");
        const seen = new Set([hall.cell]), stack = [hall.cell];
        while (stack.length) {
            for (const j of this.cells[stack.pop()].n) {
                const b = this.cells[j].b;
                if (!b || seen.has(j) || b.wrecked || b.wet) continue;
                seen.add(j);
                stack.push(j);
            }
        }
        let spare = this.folk;
        for (const b of this.buildings) {
            b.connected = seen.has(b.cell);
            const need = BUILDINGS[b.type].staff;
            b.staffed = !need || spare >= need;
            if (need && b.staffed && !b.wrecked) spare -= need;
            b.stars = b.wrecked ? 0 : this.starsFor(b.type, this.cells[b.cell]).stars;
        }
        this.spare = spare;
        this.linked = (t) => this.buildings.some((b) => b.type === t && this.working(b));
    }

    /** A rough coins-a-day figure, for the HUD and for bots. */
    income() {
        let n = DRIFT.coins;
        for (const b of this.buildings) if (b.type === "cottage" && b.fed) n += gain(b.stars);
        return n + Math.min(this.fish + this.grain, 6);
    }

    working(b) {
        return !b.wrecked && !b.wet && !b.soak && b.connected && b.staffed;
    }

    earn(n, b, good) {
        if (n <= 0) return;
        this.coins += n;
        this.stats.earned += n;
        this.events.push({ e: "coin", n, cell: b.cell, good });
    }

    // --- The sea ---------------------------------------------------------------------------------

    updateWater() {
        this.water = this.waterAt(this.t);
        this.updateFlood(false);
    }

    updateFlood(force) {
        const level = Math.round(this.water * 20) / 20;
        if (!force && level === this.lastLevelKey) return;
        this.lastLevelKey = level;
        const map = this.floodMap(this.water);
        let changed = false;
        for (const c of this.cells) {
            const wet = !!map[c.i];
            if (wet !== c.wet) { c.wet = wet; changed = true; }
            const b = c.b;
            if (!b || b.wrecked) continue;
            if (b.type === "wall") {
                if (this.water > c.h + WALL_RISE && !this.relaxed) this.breach(b);
                continue;
            }
            const floor = stiltFloor(b.type, c.h);
            const under = wet && this.water > floor;
            if (under && !b.wet) {
                b.wet = true;
                b.depth = 0;
                this.stats.flooded++;
                if (b.type === "cottage") this.stormCottagesWet++;
                this.events.push({ e: "flood", cell: c.i, type: b.type });
                changed = true;
            }
            if (under) b.depth = Math.max(b.depth, this.water - floor);
            if (!under && b.wet) {
                b.wet = false;
                changed = true;
                if (b.depth >= WRECK_DEPTH && !this.relaxed && b.type !== "hall") {
                    b.wrecked = true;
                    b.trawler = false;
                    this.stats.wrecked++;
                    this.events.push({ e: "wreck", cell: c.i, type: b.type });
                } else {
                    b.soak = 2;
                    this.events.push({ e: "soak", cell: c.i, type: b.type });
                }
            }
        }
        if (changed) { this.refresh(); this.events.push({ e: "tideline" }); }
    }

    breach(b) {
        b.wrecked = true;
        this.stats.wrecked++;
        this.events.push({ e: "breach", cell: b.cell, type: "wall" });
        this.refresh();
        this.lastLevelKey = null;
    }

    stormStep() {
        const f = this.stormAt(this.t);
        const was = this.storm;
        this.storm = f ? f.storm : null;
        this.stormB = f ? f.b : 0;
        if (f && !was) {
            this.stormCottagesWet = 0;
            this.events.push({ e: "storm", storm: f.storm });
        }
        if (!f && was) {
            this.stormIdx++;
            if (this.scn.sandbox || this.stormIdx >= this.storms.length) this.scheduleMore(was);
            const ride = this.stormCottagesWet === 0 && this.count("cottage") >= 3;
            if (ride) {
                this.stats.ridden = Math.max(this.stats.ridden, was.raw);
            }
            const drift = 3 + Math.round(was.level * 2);
            this.wood += drift;
            this.events.push({ e: "stormEnd", storm: was, ride, drift });
        }
        if (f && f.b > 0.55) {
            for (const b of this.buildings) {
                if (b.type !== "dock" || !b.trawler) continue;
                const c = this.cells[b.cell];
                const guarded = this.buildings.some((l) => l.type === "light" && !l.wrecked && !l.wet && l.staffed && hexDist(c.q, c.r, this.cells[l.cell].q, this.cells[l.cell].r) <= 6);
                if (!guarded && !this.relaxed) {
                    b.trawler = false;
                    this.events.push({ e: "boatLost", cell: b.cell });
                }
            }
        }
    }

    /** The sea never gives up, but it does draw breath: past the written storms, a lesser gale, then the worst again. */
    scheduleMore(last) {
        const written = this.scn.storms;
        if (this.scn.sandbox) {                 // Free Build: storms slowly grow, then hold.
            const raw = Math.min(2.2, 1.2 + this.stormIdx * 0.12);
            this.storms.push({ day: this.day + 13, level: this.relaxed ? Math.min(raw, 0.95) : raw, raw, name: "a storm" });
            return;
        }
        const top = Math.max(...written.map((s) => s.level));
        const lesser = last.raw >= top && top > 1.2;
        const raw = lesser ? Math.max(1.2, top - 0.6) : top;
        this.storms.push({ day: this.day + 11, level: this.relaxed ? Math.min(raw, 0.95) : raw, raw, name: lesser ? "a passing gale" : "the big one again" });
    }

    // --- The working day -------------------------------------------------------------------------

    tick() {
        this.t++;
        const hour = this.hour;
        this.updateWater();
        this.stormStep();
        if (hour === 0) {
            const season = this.seasonIndex, prev = (this.scn.startSeason + Math.floor((this.day - 1) / SEASON_DAYS)) % 4;
            if (season !== prev) this.events.push({ e: "season", season });
            this.events.push({ e: "dawn" });
        }
        if (hour === 6) {
            // Beachcombing, and when times are hard the mainland sends a little more.
            this.coins += DRIFT.coins + (this.coins < 10 ? 3 : 0);
            this.wood += DRIFT.wood;
            this.events.push({ e: "drift" });
            for (const b of this.buildings) if (b.soak > 0) { b.soak--; if (!b.soak) this.events.push({ e: "dry", cell: b.cell }); }
            this.refresh();
        }
        if (hour === 7 && !this.storm) this.repair();
        const storming = this.stormB > 0.2;
        for (const b of this.buildings) if (b.hour === hour && this.working(b)) this.work(b, storming);
        if (hour === 20) this.supper();
        this.checkGoals();
    }

    /** Work crews mend one ruin a day, walls first, once the town can pay half the price. */
    repair() {
        const ruins = this.buildings.filter((b) => b.wrecked).sort((a, b) => +(b.type === "wall") - +(a.type === "wall"));
        for (const b of ruins) {
            const c = Math.ceil(BUILDINGS[b.type].cost[0] / 2), w = Math.ceil(BUILDINGS[b.type].cost[1] / 2);
            if (this.coins < c + 6 || this.wood < w) continue;   // Crews leave a little in the kitty for the player.
            this.coins -= c;
            this.wood -= w;
            b.wrecked = false;
            b.depth = 0;
            b.soak = 1;
            this.events.push({ e: "repair", cell: b.cell, type: b.type });
            this.refresh();
            this.updateFlood(true);
            return;
        }
    }

    work(b, storming) {
        const s = b.stars, season = this.seasonIndex;
        switch (b.type) {
            case "dock": {
                if (storming) { b.last = "storm"; return; }
                const n = Math.max(1, gain(s) + (b.trawler ? 2 : 0) - (season === 3 ? 1 : 0));
                this.fish += n;
                this.events.push({ e: "catch", n, cell: b.cell, trawler: b.trawler });
                break;
            }
            case "wood": {
                const n = gain(s);
                this.wood += n;
                this.events.push({ e: "wood", n, cell: b.cell });
                break;
            }
            case "farm": {
                if (season === 3) { b.last = "winter"; return; }
                const n = gain(s) + (season === 1 || season === 2 ? 1 : 0);
                this.grain += n;
                this.events.push({ e: "grain", n, cell: b.cell });
                break;
            }
            case "market": {
                let cap = 2 + s;
                const keep = this.larder();
                let coins = 0;
                while (cap > 0 && this.fish + this.grain > keep) {
                    if (this.fish >= this.grain && this.fish > 0) { this.fish--; this.stats.sold.fish++; coins += PRICE.fish; }
                    else if (this.grain > 0) { this.grain--; this.stats.sold.grain++; coins += PRICE.grain; }
                    cap--;
                }
                this.earn(coins, b, "market");
                break;
            }
            case "smoke": {
                const n = Math.min(Math.max(0, this.fish + this.grain - this.larder()), this.fish, 1 + gain(s));
                if (!n || !this.linked("market")) return;
                this.fish -= n;
                this.stats.sold.fish += n;
                this.earn(n * PRICE.smoked, b, "smoked");
                break;
            }
            case "pub": {
                const n = Math.min(Math.max(0, this.fish + this.grain - this.larder()), this.grain, 1 + gain(s));
                if (!n) return;
                this.grain -= n;
                this.stats.sold.grain += n;
                this.earn(n * PRICE.ale, b, "ale");
                break;
            }
            case "yard": {
                if (this.wood < BOAT_WOOD) return;
                const d = this.buildings.find((x) => x.type === "dock" && !x.trawler && !x.wrecked && x.connected);
                if (!d) return;
                this.wood -= BOAT_WOOD;
                d.trawler = true;
                this.stats.trawlers = Math.max(this.stats.trawlers, this.buildings.filter((x) => x.trawler).length);
                this.events.push({ e: "trawler", cell: d.cell, from: b.cell });
                break;
            }
            default:
        }
    }

    /** Food held back from sale: tonight's supper, and in autumn and winter enough to see the cottages through to spring. */
    larder() {
        const mouths = this.count("cottage"), season = this.seasonIndex;
        return mouths * (season === 2 ? 6 : season === 3 ? 3 : 1);
    }

    supper() {
        const market = this.linked("market");
        let fed = 0, total = 0;
        for (const b of this.buildings) {
            if (b.type !== "cottage" || b.wrecked) continue;
            total++;
            if (!this.working(b)) { b.fed = false; continue; }
            b.fed = market && this.fish + this.grain > 0;
            if (b.fed) {
                if (this.fish >= this.grain) this.fish--; else this.grain--;
                fed++;
            }
            this.earn(b.fed ? gain(b.stars) : 0, b, "rent");
        }
        this.stats.peakFed = Math.max(this.stats.peakFed, fed);
        if (total > 0 && fed === total && total >= 2 && this.seasonIndex === 3) this.stats.streak++;
        this.events.push({ e: "supper", fed, total });
    }

    // --- Goals -----------------------------------------------------------------------------------

    goalValue(g) {
        switch (g.type) {
            case "cottages": return this.count("cottage");
            case "count": return this.count(g.kind);
            case "sold": return this.stats.sold[g.good];
            case "cheer": return this.cheer;
            case "fed": return this.stats.peakFed;
            case "trawlers": return this.buildings.filter((b) => b.trawler).length;
            case "earned": return this.stats.earned;
            case "folk": return this.folk;
            case "feedStreak": return this.stats.streak;
            case "reclaimed": return this.buildings.filter((b) => b.sand && !BUILDINGS[b.type].stilts && b.type !== "wall" && !b.wrecked).length;
            case "ride": return this.stats.ridden >= g.level ? 1 : 0;
            default: return 0;
        }
    }

    goalTarget(g) {
        return g.type === "ride" ? 1 : g.n;
    }

    checkGoals() {
        const goals = this.scn.goals;
        goals.forEach((g, i) => {
            if (this.goalDone[i]) return;
            if (this.goalValue(g) >= this.goalTarget(g)) {
                this.goalDone[i] = true;
                this.events.push({ e: "goal", index: i, goal: g });
            }
        });
        if (goals.length && !this.finishedDay && this.goalDone.every(Boolean)) {
            this.finishedDay = Math.max(1, this.day + 1);
            this.events.push({ e: "win", day: this.finishedDay });
        }
    }

    /** One to three stars for a finished scenario. */
    grade() {
        if (!this.finishedDay) return 0;
        if (this.relaxed) return 1;
        return 1 + (this.finishedDay <= this.scn.par ? 1 : 0) + (this.stats.wrecked === 0 ? 1 : 0);
    }
}

function smooth(x) { return x * x * (3 - 2 * x); }
