// The six worlds and seventy-two boards of Sugar Crash. Every board is authored here as nine half rows, mirrored
// down the middle unless a full eight-wide row is given. Move counts, star scores and first seeds are tuned by
// tools/tune.mjs against the bots and baked into par.js; the numbers here are starting points.
import { H, N, W } from "./engine.js";
import { PAR } from "./par.js";

export const WORLDS = [
    { key: "park", name: "Pudding Park", size: "cupcake", blurb: "A nice quiet park. For now." },
    { key: "street", name: "Main Street", size: "corgi", blurb: "Shops! Parked cars! Snacks!" },
    { key: "square", name: "Town Square", size: "minibus", blurb: "Everyone please walk to the exits." },
    { key: "harbour", name: "Fudge Harbour", size: "bakery", blurb: "The tide is in. The tide is fudge." },
    { key: "downtown", name: "Downtown", size: "office block", blurb: "He can reach the top floors now." },
    { key: "sky", name: "The Big Bite", size: "weather system", blurb: "There is nothing left but the game." },
];

const c = (colour, n) => ({ t: "c", c: colour, n });
const FROST = { t: "frost" }, COOKIE = { t: "cookie" }, FUDGE = { t: "fudge" };
const FOLK = { t: "folk" };

/** "abcd|efgh|..." to nine rows: four characters mirror, eight stay as they are; `_` is a hole. */
function rows(src) {
    const out = src.split("|").map((r) => (r.length === 4 ? r + [...r].reverse().join("") : r).replaceAll("_", " "));
    if (out.length !== H || out.some((r) => r.length !== W)) throw new Error(`Bad layout: ${src}`);
    return out;
}

const RAW = [
    // World 1, Pudding Park: gentle collecting, then frosting, then marshmallows.
    ["First Nibble", "____|_...|....|....|....|....|....|_...|____", 18, 4, [c(0, 19), c(3, 19)], { say: "Swipe candy to match three. I'm starving." }],
    ["Second Breakfast", "____|....|....|....|....|....|....|....|____", 18, 4, [c(1, 24), c(2, 24)], { say: "Four in a row makes a stripe. Stripes are spicy." }],
    ["Glazed Over", "____|....|..ff|..ff|..ff|..ff|..ff|....|____", 20, 4, [FROST], { say: "Match on the frosting to lick it clean." }],
    ["Square Meal", "....|....|....|....|....|....|....|....|____", 18, 4, [c(0, 26), c(2, 26), c(3, 16)], { say: "Make a square of four. It hatches a gummy bee!" }],
    ["Picnic Blanket", "ffff|f...|f...|f...|f...|f...|f...|f...|ffff", 22, 4, [FROST], { say: "Make an L or T for a bonbon. Boom." }],
    ["Duck Food", "__..|_...|....|....|....|....|....|_...|__..", 20, 5, [c(4, 32), c(1, 32)], { say: "When I'm full, tap me. I'll bite the board!" }],
    ["Soft Landing", "....|....|..m.|....|.m..|....|..m.|....|....", 20, 5, [{ t: "mallow" }, c(0, 26)], { say: "Marshmallows pop when you match next to them." }],
    ["Five Alive", "____|....|....|....|....|....|....|....|....", 20, 5, [c(2, 35), c(4, 35)], { say: "Five in a row makes a sugar star. Swap it with anything." }],
    ["Pond Skim", "__ff|_fff|ffff|ff..|ff..|ff..|ffff|_fff|__ff", 22, 5, [FROST] ],
    ["Puffball", "m..m|....|.mm.|....|m..m|....|.mm.|....|m..m", 22, 5, [{ t: "mallow" }] ],
    ["Flower Bed", "f_f_|ffff|f_f_|ffff|....|....|....|....|....", 22, 5, [FROST, c(3, 22)] ],
    ["Mayor's Plinth", "____|.ff.|.ff.|.mm.|....|.mm.|.ff.|.ff.|____", 24, 5, [FROST, { t: "mallow" }] ],

    // World 2, Main Street: cookies block the falls.
    ["Cookie Jar", "....|....|....|..cc|..cc|....|....|....|....", 20, 5, [COOKIE], { say: "Cookies are crunchy. Match beside them to crack them." }],
    ["Shop Awning", "c..c|....|....|....|....|....|....|....|....", 22, 5, [COOKIE, c(2, 22)] ],
    ["Double Glazed", "____|.FF.|.FF.|.FF.|.FF.|.FF.|.FF.|.FF.|____", 24, 5, [FROST], { say: "Thick frosting takes two licks." }],
    ["Letterbox", "....|....|cc..|....|..CC|....|cc..|....|....", 24, 5, [COOKIE] ],
    ["Parking Lot", "ffff|cffc|ffff|cffc|ffff|cffc|ffff|....|....", 25, 5, [FROST, COOKIE] ],
    ["Lamp Posts", "..c.|..c.|..C.|....|....|....|..C.|..c.|..c.", 24, 5, [COOKIE, c(1, 29)] ],
    ["Bakery Window", "____|.CC.|.ff.|.ff.|.ff.|.CC.|....|....|....", 24, 5, [COOKIE, FROST] ],
    ["Crumb Trail", "c...|.c..|..c.|...c|...c|..c.|.c..|c...|....", 26, 5, [COOKIE, c(4, 29)] ],
    ["Traffic Island", "....|.__.|.__.|....|....|....|.__.|.__.|....", 22, 6, [c(0, 29), c(3, 29), c(5, 29)] ],
    ["Corner Shop", "CCff|Cfff|ffff|ffff|ffff|ffff|ffff|Cfff|CCff", 28, 5, [FROST, COOKIE] ],
    ["Wafer Thin", "....|cc.c|....|....|c.cc|....|....|....|....", 26, 5, [COOKIE] ],
    ["Rush Hour", "KK..|K...|....|.ff.|.ff.|.ff.|....|K...|KK..", 28, 5, [COOKIE, FROST] ],

    // World 3, Town Square: cages lock candy, and the townsfolk need help getting out.
    ["Liquorice Lockup", "....|....|.ll.|.ll.|....|.ll.|.ll.|....|....", 22, 5, [{ t: "cage" }], { say: "Match a caged candy to bite through its liquorice." }],
    ["This Way Out", "....|....|....|....|....|....|....|....|....", 22, 5, [FOLK], { folk: 2, folkMax: 1, say: "Drop the townsfolk off the bottom. I don't eat people!" }],
    ["Bandstand", "____|.ll.|l..l|l..l|l..l|.ll.|....|....|....", 24, 5, [{ t: "cage" }, c(2, 26)] ],
    ["Fountain", "ffff|fLLf|fL_f|fL_f|fL_f|fLLf|ffff|....|....", 28, 5, [FROST, { t: "cage" }] ],
    ["Fire Drill", "....|....|..c.|....|....|....|..c.|....|....", 24, 5, [FOLK, COOKIE], { folk: 3, folkMax: 1 }],
    ["Clock Tower", "__..|__..|__..|__ff|__ff|__ff|__ff|....|....", 24, 5, [FROST, c(4, 19)] ],
    ["Pigeon Patrol", "m..m|.ll.|m..m|.ll.|m..m|.ll.|m..m|....|....", 26, 5, [{ t: "mallow" }, { t: "cage" }] ],
    ["Side Streets", "..__|..__|....|....|....|....|....|__..|__..", 24, 5, [FOLK], { folk: 3, folkMax: 2 }],
    ["Town Hall", "C..C|.ll.|.ll.|ffff|ffff|.ll.|.ll.|....|....", 28, 5, [COOKIE, { t: "cage" }, FROST] ],
    ["Evacuation Plan", "....|.cc.|....|l..l|....|l..l|....|.cc.|....", 28, 5, [FOLK, { t: "cage" }], { folk: 3, folkMax: 2 }],
    ["Market Day", "ll..|ll..|..ff|..ff|ll..|ll..|..ff|..ff|....", 30, 5, [FROST, { t: "cage" }] ],
    ["Statue Garden", "_.._|.CC.|.ll.|ffff|fKKf|ffff|.ll.|.CC.|_.._", 32, 5, [FROST, COOKIE, { t: "cage" }] ],

    // World 4, Fudge Harbour: fudge creeps every turn you ignore it.
    ["High Tide", "....|....|....|....|....|....|....|uuuu|uuuu", 22, 5, [FUDGE], { say: "Fudge spreads unless you pop some every turn." }],
    ["Slipway", "....|....|....|....|....|u...|uu..|uuu.|uuuu", 24, 5, [FUDGE, c(4, 22)] ],
    ["Pier Pressure", "..__|..__|....|ffff|ffff|....|.uu.|uuuu|uuuu", 26, 5, [FROST, FUDGE] ],
    ["Lighthouse", "__..|__..|_...|_...|_...|....|....|uuuu|uuuu", 26, 5, [FUDGE] ],
    ["Lobster Pots", "....|.cc.|....|.cc.|....|.uu.|....|.uu.|....", 26, 5, [FUDGE, COOKIE] ],
    ["Rusty Hull", ".cc.|c..c|c..c|....|....|uuuu|UUUU|UUUU|____", 30, 5, [FROST, COOKIE, FUDGE] ],
    ["Ferry Crossing", "....|....|uu.u|....|....|....|uu.u|....|....", 26, 6, [FUDGE, c(1, 22)] ],
    ["Fish Market", "m.m.|.m.m|m.m.|....|....|....|uu..|uu..|uu..", 28, 5, [{ t: "mallow" }, FUDGE] ],
    ["Lifeboats", "....|....|....|....|....|..uu|..uu|....|....", 28, 5, [FOLK, FUDGE], { folk: 3, folkMax: 2 }],
    ["Crane Game", "__..|__l.|__..|__.l|....|....|....|uuuu|uuuu", 30, 5, [{ t: "cage" }, FUDGE] ],
    ["Harbour Wall", "ffff|ffff|CC.C|....|....|....|uuuu|uuuu|uuuu", 32, 5, [FROST, COOKIE, FUDGE] ],
    ["Fudge Tsunami", "ff_f|ffff|ffff|....|....|UUUU|UUUU|UUUU|UUUU", 34, 5, [FROST, FUDGE] ],

    // World 5, Downtown: everything at once, six colours, fewer gifts.
    ["Lobby", "....|....|....|....|....|....|....|....|....", 22, 6, [c(0, 32), c(2, 32), c(4, 32)] ],
    ["Revolving Door", "..ll|..ll|....|....|....|ll..|ll..|....|....", 26, 6, [{ t: "cage" }, c(5, 22)] ],
    ["Elevator Shaft", "__ff|__ff|__ff|__ff|ffff|ffff|....|....|....", 28, 5, [FROST] ],
    ["Corner Office", "CC..|C...|....|....|....|....|....|...u|..uu", 30, 5, [COOKIE, FUDGE] ],
    ["Traffic Jam", "c.c.|....|.c.c|....|c.c.|....|.c.c|....|....", 30, 6, [COOKIE, FOLK], { folk: 2, folkMax: 1 }],
    ["Skyline", "_.__|_.__|_...|....|....|....|....|....|....", 28, 6, [c(3, 38), c(1, 38)] ],
    ["Bank Vault", "K..K|K..K|K..K|K..K|K..K|K..K|.KK.|....|....", 36, 5, [COOKIE] ],
    ["Stadium", "ffff|f__f|f__f|f..f|f..f|f..f|f__f|f__f|ffff", 34, 5, [FROST] ],
    ["Radio Mast", "__f.|__f.|__f.|_ff.|_ff.|ffff|ffff|ll.l|....", 32, 5, [FROST, { t: "cage" }] ],
    ["Monorail", "....|uu.u|....|ll..|..ll|ll..|..ll|....|....", 34, 5, [FUDGE, { t: "cage" }] ],
    ["Rooftop Pool", "C..C|CffC|CffC|CffC|....|....|....|....|uu..", 38, 5, [FROST, COOKIE, FUDGE] ],
    ["Tallest Thing", "__f_|__f.|_ff.|_ff.|ffff|ffff|C..C|....|....", 36, 5, [FROST, COOKIE] ],

    // World 6, The Big Bite: Morsel eats the board while you play on it.
    ["Fourth Wall", "....|....|....|....|....|....|....|....|....", 24, 5, [c(0, 35), c(3, 35)], { biteEvery: 5, bite: 3, say: "Sorry. The board looks delicious." }],
    ["Crust Only", "ffff|f..f|f..f|f..f|f..f|f..f|f..f|f..f|ffff", 28, 5, [FROST], { biteEvery: 6, bite: 2 }],
    ["Mind the Gap", "..__|....|....|__..|__..|....|....|..__|..__", 28, 5, [c(1, 35), c(4, 35)], { biteEvery: 6, bite: 2 }],
    ["Tooth Marks", "....|.cc.|.cc.|....|....|.cc.|.cc.|....|....", 30, 5, [COOKIE], { biteEvery: 6, bite: 3 }],
    ["Last Orders", "....|....|.ll.|.ll.|....|....|.ll.|.ll.|....", 30, 5, [{ t: "cage" }], { biteEvery: 6, bite: 3 }],
    ["Eat Your Greens", "....|.ff.|.ff.|.ff.|.ff.|.ff.|....|uuuu|uuuu", 30, 5, [FROST, FUDGE], { biteEvery: 7, bite: 2 }],
    ["Everybody Out", "....|....|....|....|....|....|....|....|....", 30, 5, [FOLK], { folk: 4, folkMax: 2, biteEvery: 7, bite: 2, biteTop: true }],
    ["Moon Pie", "__..|_...|.ff.|.ff.|.ff.|.ff.|.ff.|_...|__..", 32, 5, [FROST, c(2, 26)], { biteEvery: 6, bite: 2 }],
    ["Satellite Dish", "....|l..l|.ll.|....|.cc.|....|.ll.|l..l|....", 34, 5, [{ t: "cage" }, COOKIE], { biteEvery: 7, bite: 2 }],
    ["Empty Plate", "ffff|ffff|ffff|ffff|....|....|....|uuuu|uuuu", 34, 5, [FROST, FUDGE], { biteEvery: 7, bite: 2 }],
    ["One More Bite", "C..C|.ll.|ffff|.ll.|ffff|.ll.|ffff|.ll.|....", 38, 5, [FROST, COOKIE, { t: "cage" }], { biteEvery: 8, bite: 2 }],
    ["The Last Bite", "KffK|ffff|.ll.|ffff|.uu.|ffff|.ll.|ffff|cffc", 42, 5, [FROST, COOKIE, FUDGE, { t: "cage" }], { biteEvery: 8, bite: 2, say: "Last one. Then I'm eating the game." }],
];

/** Changes a level's move count and replans what depends on it. The tuner uses this. */
export function setMoves(def, moves) {
    def.moves = moves;
    if (def.biteEvery) def.bites = planBites(def.rows, def.biteSize, Math.floor(moves / def.biteEvery) + 3, def.biteTop);
}

/** Bites work inward from the outer edge, in clumps, top corners first. */
function planBites(r, size, count, fromTop) {
    const open = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (r[y][x] !== " ") open.push(x + y * W);
    const depth = (i) => {
        const x = i % W, y = (i - x) / W;
        return Math.min(x, W - 1 - x) + (fromTop ? y * 0.5 : Math.min(y, H - 1 - y)) * 0.8;
    };
    const order = open.slice().sort((a, b) => depth(a) - depth(b) || a - b);
    const eaten = new Set(), out = [];
    let side = 0;
    for (let n = 0; n < count; n++) {
        const pool = order.filter((i) => !eaten.has(i));
        const first = pool.find((i) => (i % W < W / 2) === (side % 2 === 0)) ?? pool[0];
        if (first === undefined) break;
        const clump = [first];
        for (const i of pool) {
            if (clump.length >= size) break;
            if (i !== first && Math.abs((i % W) - (first % W)) + Math.abs(Math.floor(i / W) - Math.floor(first / W)) === 1) clump.push(i);
        }
        clump.forEach((i) => eaten.add(i));
        out.push(clump);
        side++;
    }
    return out;
}

export const LEVELS = RAW.map(([name, layout, moves, colors, goals, extra = {}], n) => {
    const world = Math.floor(n / 12), r = rows(layout), par = PAR[n] ?? {};
    if (r.join("").length !== N) throw new Error(name);
    const def = {
        n, world, name, rows: r, colors, moves: par.moves ?? moves, goals,
        feedNeed: par.feedNeed ?? 50 + world * 6,
        stars: par.stars ?? [1000, 6000, 12000], seed: par.seed ?? n * 7 + 3,
        say: extra.say ?? null,
        folk: extra.folk ?? 0, folkMax: extra.folkMax ?? 1,
    };
    if (extra.biteEvery) {
        def.biteEvery = extra.biteEvery; def.biteSize = extra.bite; def.biteTop = !!extra.biteTop;
        setMoves(def, def.moves);
    }
    return def;
});

export const ENDLESS = { n: -1, world: 0, name: "Nap Time", rows: Array(H).fill("        ".replaceAll(" ", ".")), colors: 5, moves: 0, goals: [], endless: true, feedNeed: 60, stars: [0, 0, 0] };

/** Open cells that no falling candy can reach, treating blockers as solid. */
export function sealedCells(l) {
    const cell = (x, y) => (x >= 0 && x < W && y >= 0 && y < H ? l.rows[y][x] : " ");
    const solid = (ch) => "cCKuUlL ".includes(ch);
    const fed = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const ch = cell(x, y);
        if (solid(ch)) continue;
        if (y === 0 || cell(x, y - 1) === " " || [[0, -1], [-1, -1], [1, -1]].some(([a, b]) => fed.has(x + a + (y + b) * W))) fed.add(x + y * W);
    }
    let n = 0;
    for (let i = 0; i < N; i++) if (!solid(cell(i % W, Math.floor(i / W))) && !fed.has(i)) n++;
    return n;
}

/** Sanity checks on the table itself, used by tools and tests. */
export function validate() {
    const bad = [];
    LEVELS.forEach((l) => {
        for (const g of l.goals) if (g.t === "c" && g.c >= l.colors) bad.push(`${l.n + 1} ${l.name}: colour ${g.c} is not in play`);
        const text = l.rows.join("");
        const has = (s) => [...s].some((ch) => text.includes(ch));
        if (l.goals.some((g) => g.t === "frost") && !has("fFLU")) bad.push(`${l.n + 1} ${l.name}: frost goal without frost`);
        if (l.goals.some((g) => g.t === "cookie") && !has("cCK")) bad.push(`${l.n + 1} ${l.name}: cookie goal without cookies`);
        if (l.goals.some((g) => g.t === "fudge") && !has("uU")) bad.push(`${l.n + 1} ${l.name}: fudge goal without fudge`);
        if (l.goals.some((g) => g.t === "cage") && !has("lL")) bad.push(`${l.n + 1} ${l.name}: cage goal without cages`);
        if (l.goals.some((g) => g.t === "mallow") && !has("m")) bad.push(`${l.n + 1} ${l.name}: mallow goal without marshmallows`);
        if (l.goals.some((g) => g.t === "c") && 0) bad.push("");
        const sealed = sealedCells(l);
        if (sealed > 4) bad.push(`${l.n + 1} ${l.name}: ${sealed} cells can never refill until a blocker breaks`);
    });
    return bad;
}
