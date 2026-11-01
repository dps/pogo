// The holiday itinerary: seventeen floors over four rival dungeons and one horrible Monday.
// Openers and bosses are authored. The rest are generated, and a generated floor only exists if the
// search bot walked it flawlessly with nothing but moves and shoves.
import { BASE, H, M, O, T, flagHazards, makeFloor, makeState, step as stepSim } from "./sim.js";
import { search, solve, verify } from "./solver.js";

export const DUNGEONS = [
    { key: "cata", name: "Bonehaven Catacombs", tag: "Voted 4th nicest ossuary", time: "9 AM", song: "cata",
      rooms: ["The Ticket Queue", "Hall of Mild Regret", "Femur Gallery", "Ossuary Annexe", "Mind The Skull", "The Long Nave"] },
    { key: "bath", name: "Thermae of Dread", tag: "No lifeguard on duty", time: "12 NOON", song: "bath",
      rooms: ["The Cold Plunge", "Locker Room C", "Slippery When Cursed", "The Tepid Pool", "Verruca Corridor", "Towel Amnesty"] },
    { key: "fire", name: "Cinderbrook Grand Resort", tag: "All inclusive. All on fire.", time: "4 PM", song: "fire",
      rooms: ["Poolside Magma", "The Kids' Club", "Buffet Inferno", "Conference Suite B", "Hot Tub Time", "Sauna Deluxe"] },
    { key: "hex", name: "Hotel Hex", tag: "Check out any time", time: "8 PM", song: "hex",
      rooms: ["Room 13", "The Long Carpet", "Lift Out Of Order", "Honeymoon Suite", "Ice Machine", "Corridor Of Doors"] },
    { key: "home", name: "Home, Sweet Crypt", tag: "The day off is nearly over", time: "11:59 PM", song: "boss", rooms: ["Your Own Front Room"] },
];

const LEGEND_T = { ".": T.FLOOR, "#": T.WALL, o: T.PIT, "~": T.ICE, "%": T.LAVA, ",": T.SPIKE0, ";": T.SPIKE1, ":": T.SPIKE2, P: T.PLATE, D: T.DOOR, E: T.EXIT };
const LEGEND_O = { C: O.CRATE, K: O.KEG, $: O.COIN, t: O.TICKET, H: O.TEA, I: O.PILLAR, Z: O.SNOOZE };
const LEGEND_M = { g: M.GHOUL, x: M.CRAB, m: M.MIRROR, B: M.BULL, i: M.IMP, h: M.HORSE, f: M.PHANTOM };
const SPIT = { A: 0, ">": 1, v: 2, "<": 3 };

/** Turns a text map into arrays. Every map must be rectangular; `boss` puts the boss on the # marker '*'. */
export function parseMap(rows, extra = {}) {
    const h = rows.length, w = rows[0].length, ter = new Array(w * h).fill(0), obj = new Array(w * h).fill(0), mons = [];
    let start = 0;
    const portals = [], pairA = [], pairB = [];
    rows.forEach((row, y) => [...row].forEach((c, x) => {
        const i = y * w + x;
        if (c === "@") start = i;
        else if (c in LEGEND_T) ter[i] = LEGEND_T[c];
        else if (c in LEGEND_O) obj[i] = LEGEND_O[c];
        else if (c in LEGEND_M) mons.push({ t: LEGEND_M[c], p: i });
        else if (c in SPIT) mons.push({ t: M.SPITTER, p: i, dir: SPIT[c] });
        else if (c === "1") { ter[i] = T.PORTAL; pairA.push(i); }
        else if (c === "2") { ter[i] = T.PORTAL; pairB.push(i); }
        else if (c === "*") mons.unshift({ t: extra.boss, p: i, hp: extra.bossHp ?? 3, dir: extra.bossDir ?? -1 });
    }));
    if (pairA.length === 2) portals.push(...pairA);
    if (pairB.length === 2) portals.push(...pairB);
    return { w, h, ter, obj, mons, start, portals };
}

const FLIP = { ">": "<", "<": ">" };
export const flipRows = (rows) => rows.map((r) => [...r].reverse().map((c) => FLIP[c] ?? c).join(""));

// ---------- the authored floors ----------
const HAND = {
    // Up, up, up: the first shove drops the guide down a hole.
    first: { goal: "clear", rows: [
        "..E..",
        ".....",
        "..o..",
        "..g..",
        ".....",
        ".....",
        "..@..",
    ] },
    // Two guides, one line: push one into the other. A wall gives a free stun.
    bonk: { goal: "clear", rows: [
        "...E..",
        "......",
        ".g..#.",
        "...o..",
        ".g....",
        "......",
        "...@..",
    ] },
};

const BOSS = {
    curator: { boss: M.CURATOR, bossHp: 3, goal: "boss", name: "The Grand Curator", song: "boss", rows: [
        "...E...",
        ".,.;.:.",
        ".......",
        "..;*,..",
        ".......",
        ".:.,.;.",
        "...@...",
    ] },
    lather: { boss: M.LATHER, bossHp: 3, goal: "boss", name: "Lady Lather", song: "boss", rows: [
        "...E...",
        ".......",
        ".......",
        "..~~~..",
        "I.~*~.I",
        "..~~~..",
        ".......",
        ".@...I.",
    ] },
    chef: { boss: M.CHEF, bossHp: 3, goal: "boss", name: "Chef Sizzle", song: "boss", rows: [
        "E..*...",
        "%.....%",
        "%.....%",
        ".......",
        "..g....",
        ".......",
        "...@...",
    ] },
    landlord: { boss: M.LANDLORD, bossHp: 3, goal: "boss", name: "The Landlord", song: "boss", rows: [
        "...E...",
        ".*.....",
        "#D#D#D#",
        ".......",
        ">.....<",
        ".P...P.",
        "...@...",
    ] },
    monday: { boss: M.MONDAY, bossHp: 3, bossDir: 0, goal: "boss", name: "MONDAY", song: "finale", rows: [
        "...E...",
        ".#...#.",
        ".......",
        "...*...",
        ".......",
        ".#...#.",
        "Z..@...",
    ], snoozeList: [[0, 6], [6, 2], [0, 0]] },
};

// One entry per floor of the run.
export const ITINERARY = [
    { d: 0, hand: "first", name: "The Ticket Queue" },
    { d: 0, hand: "bonk", name: "Hall of Mild Regret" },
    { d: 0, w: 6, h: 7, goal: "ticket", mons: { [M.GHOUL]: 1, [M.SPITTER]: 1 }, pits: 3, spikes: 2, walls: 2, crates: 1, len: [6, 14], debut: M.SPITTER },
    { d: 0, boss: "curator" },
    { d: 1, w: 6, h: 7, goal: "clear", mons: { [M.CRAB]: 1, [M.GHOUL]: 1 }, ice: 6, pits: 3, walls: 2, len: [6, 18], debut: M.CRAB },
    { d: 1, w: 6, h: 7, goal: "ticket", mons: { [M.MIRROR]: 2, [M.CRAB]: 1 }, ice: 6, pits: 2, walls: 3, len: [7, 18], debut: M.MIRROR },
    { d: 1, w: 7, h: 7, goal: "clear", mons: { [M.CRAB]: 1, [M.MIRROR]: 1, [M.GHOUL]: 1 }, ice: 8, pits: 3, walls: 2, crates: 1, len: [8, 20] },
    { d: 1, boss: "lather" },
    { d: 2, w: 6, h: 7, goal: "clear", mons: { [M.IMP]: 2 }, lava: 3, kegs: 1, walls: 2, len: [6, 18], debut: M.IMP },
    { d: 2, w: 7, h: 7, goal: "clear", mons: { [M.BULL]: 1, [M.GHOUL]: 1 }, lava: 4, crates: 1, kegs: 1, walls: 2, len: [7, 18], debut: M.BULL },
    { d: 2, w: 7, h: 8, goal: "ticket", mons: { [M.BULL]: 1, [M.IMP]: 1, [M.CRAB]: 1, [M.SPITTER]: 1 }, lava: 5, kegs: 2, spikes: 3, walls: 3, len: [10, 22] },
    { d: 2, boss: "chef" },
    { d: 3, w: 6, h: 8, goal: "clear", mons: { [M.HORSE]: 1, [M.GHOUL]: 1 }, pits: 4, portals: 1, walls: 3, len: [7, 20], debut: M.HORSE },
    { d: 3, w: 7, h: 8, goal: "ticket", mons: { [M.PHANTOM]: 1, [M.HORSE]: 1, [M.GHOUL]: 1 }, pits: 3, doors: 1, walls: 3, crates: 1, len: [10, 24], debut: M.PHANTOM },
    { d: 3, w: 7, h: 8, goal: "ticket", mons: { [M.PHANTOM]: 1, [M.HORSE]: 1, [M.BULL]: 1, [M.SPITTER]: 1 }, pits: 4, doors: 1, portals: 1, spikes: 3, walls: 3, len: [10, 24] },
    { d: 3, boss: "landlord" },
    { d: 4, boss: "monday" },
];
export const FLOORS = ITINERARY.length;

// ---------- seeded dice ----------
export function hashSeed(...parts) {
    let h = 2166136261;
    for (const p of parts) for (const c of String(p)) { h = Math.imul(h ^ c.charCodeAt(0), 16777619); }
    return h >>> 0;
}
export class Dice {
    constructor(seed) { this.a = seed >>> 0 || 1; }
    next() { let t = (this.a += 0x6d2b79f5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    int(n) { return (this.next() * n) | 0; }
    pick(a) { return a[this.int(a.length)]; }
    chance(p) { return this.next() < p; }
    shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
}

// ---------- building a floor ----------
function finish(map, meta) {
    const fl = flagHazards(makeFloor({ ...map, ...meta, ctx: meta.ctx ?? BASE }));
    return fl;
}
const startOf = (map, hp = 3) => ({ p: map.start, hp, mons: map.mons });

function bake(map, meta) {
    const fl = finish(map, meta);
    const s = makeState(fl, startOf(map));
    return { fl, map, s };
}

export function bossFloor(key, dice) {
    const b = BOSS[key], flip = dice.chance(0.5) && key !== "monday";
    const rows = flip ? flipRows(b.rows) : b.rows;
    const map = parseMap(rows, b);
    let snoozes = [];
    if (b.snoozeList) snoozes = b.snoozeList.map(([x, y]) => y * map.w + x);
    const home = map.mons[0].p;
    return { map, meta: { name: b.name, goal: b.goal, home, snoozes, boss: key, song: b.song } };
}

function tilesOf(w, h) { const a = []; for (let i = 0; i < w * h; i++) a.push(i); return a; }

/** One random candidate from a spec. Returns null if it came out obviously broken. */
function roll(spec, dice) {
    const { w, h } = spec, n = w * h, ter = new Array(n).fill(0), obj = new Array(n).fill(0), mons = [];
    const ex = 1 + dice.int(w - 2), sx = 1 + dice.int(w - 2);
    const exit = ex, start = (h - 1) * w + sx;
    ter[exit] = T.EXIT;
    const dist = (a, b) => Math.abs(a % w - b % w) + Math.abs(((a / w) | 0) - ((b / w) | 0));
    const free = dice.shuffle(tilesOf(w, h).filter((i) => i !== exit && i !== start && i !== exit + w && dist(i, start) > 1));
    const taken = (i) => ter[i] !== 0 || obj[i] !== 0 || mons.some((m) => m.p === i);
    const take = (test) => { for (let k = 0; k < free.length; k++) { const i = free[k]; if (!taken(i) && (!test || test(i))) { free.splice(k, 1); return i; } } return -1; };
    const y = (i) => (i / w) | 0;
    // Short wall runs, which give shoves something to slam against.
    for (let i = 0; i < (spec.walls ?? 0); i++) {
        const a = take((q) => y(q) > 0 && y(q) < h - 1); if (a < 0) continue;
        ter[a] = T.WALL;
        if (dice.chance(0.45)) { const b = a + (dice.chance(0.5) ? 1 : w); if (b < n && a % w !== w - 1 && !taken(b) && b !== start && y(b) < h - 1) ter[b] = T.WALL; }
    }
    const scatter = (count, kind, test) => { for (let i = 0; i < (count ?? 0); i++) { const a = take(test); if (a >= 0) ter[a] = typeof kind === "function" ? kind() : kind; } };
    const inner = (q) => y(q) > 0;
    scatter(spec.pits, T.PIT, inner);
    scatter(spec.lava, T.LAVA, inner);
    scatter(spec.spikes, () => T.SPIKE0 + dice.int(3), inner);
    if (spec.ice) { // ice comes in sheets, not confetti
        let seed = take(inner), left = spec.ice;
        const sheet = seed >= 0 ? [seed] : [];
        while (sheet.length && left > 0) {
            const a = sheet[dice.int(sheet.length)]; left--;
            if (!ter[a] && !taken(a) || a === seed) ter[a] = T.ICE;
            for (const d of [1, -1, w, -w]) { const b = a + d; if (b >= 0 && b < n && Math.abs(b % w - a % w) <= 1 && !taken(b) && b !== start && b !== exit && y(b) > 0 && dice.chance(0.6)) sheet.push(b); }
            seed = -2;
        }
    }
    if (spec.doors) {
        const row = 2 + dice.int(h - 4);
        for (let x = 0; x < w; x++) { const i = row * w + x; if (i !== start) ter[i] = T.WALL; }
        const dx = dice.int(w), plateY = row + 1 + dice.int(h - row - 2);
        ter[row * w + dx] = T.DOOR;
        let plate = plateY * w + dice.int(w); if (plate === start || ter[plate]) plate = start - w;
        ter[plate] = T.PLATE;
        if (dice.chance(0.6)) { const d2 = (dx + 2 + dice.int(w - 3)) % w; ter[row * w + d2] = T.DOOR; }
    }
    const portals = [];
    if (spec.portals) {
        const a = take((q) => y(q) >= 1 && y(q) < h / 2 + 1), b = take((q) => y(q) >= h / 2);
        if (a >= 0 && b >= 0) { ter[a] = ter[b] = T.PORTAL; portals.push(a, b); }
    }
    for (let i = 0; i < (spec.crates ?? 0); i++) { const a = take((q) => { const x = q % w; return y(q) > 0 && y(q) < h - 1 && x > 0 && x < w - 1; }); if (a >= 0) obj[a] = O.CRATE; }
    for (let i = 0; i < (spec.kegs ?? 0); i++) { const a = take((q) => y(q) > 0 && y(q) < h - 1); if (a >= 0) obj[a] = O.KEG; }
    if (spec.goal === "ticket") {
        const a = take((q) => dist(q, exit) >= 3 && dist(q, start) >= 3); if (a < 0) return null;
        obj[a] = O.TICKET;
    }
    for (const [t, count] of Object.entries(spec.mons)) for (let i = 0; i < count; i++) {
        const type = Number(t);
        const a = take((q) => dist(q, start) >= 3);
        if (a < 0) return null;
        const mon = { t: type, p: a };
        if (type === M.SPITTER) {
            // Face down the longest open lane, so its threat means something.
            mon.dir = y(a) < h / 2 ? 2 : (a % w < w / 2 ? 1 : 3);
        }
        mons.push(mon);
    }
    return { w, h, ter, obj, mons, start, portals };
}

/** Fair and interesting? Bigger is better. Null rejects the candidate. */
function judge(spec, map, res) {
    if (!res.path) return null;
    const len = res.path.length, [lo, hi] = spec.len;
    if (len < lo || len > hi) return null;
    const waits = res.path.filter((a) => a === 4).length;
    let score = res.dead / Math.max(1, res.nodes) * 12 + Math.min(len, hi) * 0.5 - waits * 0.4;
    if (spec.goal === "ticket") {
        const w = map.w, t = map.obj.indexOf(O.TICKET), d = (a, b) => Math.abs(a % w - b % w) + Math.abs(((a / w) | 0) - ((b / w) | 0));
        const walk = d(map.start, t) + d(t, map.ter.indexOf(T.EXIT));
        if (len <= walk) score -= 1.5;
    }
    return score;
}

const CAP = 14000;
/**
 * Generates a floor as a resumable job: each call to run() does a little work, so a phone can keep drawing.
 * The result depends only on the seed and floor number, never on the clock or the keeper.
 */
export class FloorJob {
    constructor(seed, index) {
        this.seed = seed; this.index = index; this.spec = ITINERARY[index];
        this.dice = new Dice(hashSeed(seed, "floor", index));
        this.tries = 0; this.found = 0; this.best = null; this.bestScore = -1e9; this.done = null;
        this.room = this.dice.pick(DUNGEONS[this.spec.d].rooms);
        if (this.spec.hand || this.spec.boss) this.finishAuthored();
    }
    finishAuthored() {
        const sp = this.spec;
        let map, meta;
        if (sp.hand) {
            const h = HAND[sp.hand];
            map = parseMap(this.dice.chance(0.5) ? flipRows(h.rows) : h.rows);
            meta = { name: sp.name, goal: h.goal };
        } else ({ map, meta } = bossFloor(sp.boss, this.dice));
        const { fl, s } = bake(map, meta);
        const res = solve(fl, s, { cap: 400000, maxDepth: 60 });
        this.done = { map, meta, par: res.path?.length ?? 0, path: res.path, nodes: res.nodes };
    }
    /** Does one slice of work: a few hundred search nodes. Returns true when the floor is ready. */
    run() {
        if (this.done) return true;
        const sp = this.spec, want = this.index >= 9 ? 3 : 5;
        if (!this.cur) {
            this.tries++;
            const map = roll(sp, this.dice);
            if (map) {
                const meta = { name: this.room, goal: sp.goal };
                const { fl, s } = bake(map, meta);
                this.cur = { map, meta, it: search(fl, s, { cap: CAP, maxDepth: sp.len[1] }) };
            }
        }
        if (this.cur) {
            const r = this.cur.it.next();
            if (!r.done) return false;
            const { map, meta } = this.cur, res = r.value, score = judge(sp, map, res);
            this.cur = null;
            if (score !== null) {
                this.found++;
                if (score > this.bestScore) { this.bestScore = score; this.best = { map, meta, par: res.path.length, path: res.path, nodes: res.nodes }; }
            }
        }
        if (this.found >= want || (this.best && this.tries > 40) || this.tries > 900) {
            if (!this.best) throw new Error(`No floor for ${this.seed}/${this.index}`);
            this.addCoins(this.best);
            this.done = this.best;
            return true;
        }
        return false;
    }
    /** Tempting coins, placed off the flawless route so the greedy pay for them. */
    addCoins(b) {
        const { map, path } = b, w = map.w;
        const route = new Set();
        const { fl, s } = bake(map, b.meta);
        let st = s; route.add(st[H.P]);
        for (const a of path) { st = stepSim(fl, st, a); route.add(st[H.P]); }
        const spots = this.dice.shuffle(map.ter.map((t, i) => i).filter((i) => map.ter[i] === T.FLOOR && !map.obj[i] && !route.has(i) && !map.mons.some((m) => m.p === i) && i !== map.start));
        const count = Math.min(spots.length, 2 + (this.index > 7 ? 1 : 0));
        for (let i = 0; i < count; i++) map.obj[spots[i]] = O.COIN;
    }
}

/** Blocking helper, for the bots. */
export function buildFloor(seed, index) {
    const job = new FloorJob(seed, index);
    while (!job.run());
    return job;
}

export function instantiate(done, ctx) {
    return flagHazards(makeFloor({ ...done.map, ...done.meta, ctx: ctx ?? BASE }));
}
export { verify, startOf };
