// The whole farm as plain data and pure rules. No drawing, no audio: the UI and the year bot both play through these same functions.
import { BUILDINGS, COLS, CROPS, DISHES, FISH, GHOSTS, GHOST_LIST, HEART, HYBRIDS, KEEPSAKES, LANTERN, LETTERS, MOON_DAYS, RELICS, RELIC_LIST, ROWS, SEASON_DAYS, YEAR_DAYS, ZONES, ZONE_MAP } from "./data.js";

const N = COLS * ROWS;
export const idx = (x, y) => y * COLS + x;
const nbrs = (i) => { const x = i % COLS, y = Math.floor(i / COLS), o = []; if (x > 0) o.push(i - 1); if (x < COLS - 1) o.push(i + 1); if (y > 0) o.push(i - COLS); if (y < ROWS - 1) o.push(i + COLS); return o; };
const around = (i) => { const x = i % COLS, y = Math.floor(i / COLS), o = []; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b) && x + a >= 0 && x + a < COLS && y + b >= 0 && y + b < ROWS) o.push(idx(x + a, y + b)); return o; };
export { nbrs, around };

function rnd(s) { s.r = Math.imul(s.r, 1664525) + 1013904223 >>> 0; let t = s.r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (s, a) => a[Math.floor(rnd(s) * a.length) % a.length];

export const season = (s) => Math.floor((s.day - 1) / SEASON_DAYS) % 4;
export const year = (s) => Math.floor((s.day - 1) / YEAR_DAYS) + 1;
export const dayOfSeason = (s) => (s.day - 1) % SEASON_DAYS + 1;
export const moonOf = (day) => (day + 2) % MOON_DAYS;
export const moon = (s) => moonOf(s.day);
export const moonKind = (m) => m === 0 ? "new" : m === 4 ? "full" : m < 4 ? "wax" : "wane";
export const heartLevel = (s, g) => Math.min(5, Math.floor(s.hearts[g] / HEART));
export const isBase = (k) => k.replace("*", "");
export const isShining = (k) => k.endsWith("*");
export const nightsToFull = (s) => { let n = 0; while (moonOf(s.day + n) !== 4) n++; return n; };

export function itemName(k) {
    const id = isBase(k), o = CROPS[id] ?? FISH[id] ?? DISHES[id] ?? (id === "honey" ? { name: "Moonhoney" } : null);
    return (isShining(k) ? "Shining " : "") + (o?.name ?? id);
}
export const itemKind = (id) => CROPS[id] ? "crop" : FISH[id] ? "fish" : DISHES[id] ? "dish" : "other";
const baseSell = (id) => CROPS[id]?.sell ?? FISH[id]?.sell ?? DISHES[id]?.sell ?? (id === "honey" ? 48 : 1);
export const priceOf = (s, k) => Math.round(baseSell(isBase(k)) * (isShining(k) ? 2 : 1) * (s.built.sign ? 1.2 : 1));
export const seedCost = (s, id) => (s.pennies < CROPS[id].seed && isCheapest(s, id) && fieldCount(s) < 6) ? 0 : CROPS[id].seed;
const fieldCount = (s) => s.tiles.filter((t) => t.c).length;
function isCheapest(s, id) { const list = seedList(s).filter((c) => !CROPS[c].hybrid); return list.length && [...list].sort((a, b) => CROPS[a].seed - CROPS[b].seed)[0] === id; }
/** Crops the tray offers this season, hybrids included once discovered. */
export function seedList(s) {
    const se = season(s), base = Object.keys(CROPS).filter((c) => CROPS[c].season === se), found = s.found.filter((c) => CROPS[c]);
    if (s.built.glass) for (const c of Object.keys(CROPS)) if (CROPS[c].season >= 0 && CROPS[c].season !== se) base.push(c);
    return [...base, ...found];
}
const isGlass = (s, i) => s.built.glass && Math.floor(i / COLS) === 3 && i % COLS >= 2 && i % COLS <= 5;
const fitsSeason = (s, id, i) => CROPS[id].season === -1 || CROPS[id].season === season(s) || isGlass(s, i);

export function newGame(seed = 1) {
    const s = {
        v: 1, seed, r: (seed * 2654435761) >>> 0, day: 1, phase: "night", pennies: 30, zones: 1, tiles: [], inv: {}, built: {}, bells: 0, lantern: 0,
        hearts: {}, told: {}, gifted: {}, orders: [], letter: -1, letterUnread: false, lastLetterRead: false, found: [], pity: {}, recipes: [], keepsakes: [],
        dex: { crop: {}, fish: {}, dish: {}, relic: {} }, casts: 3, buffs: {}, rain: false, moonSeen: 0, ended: false, finaleDone: false, glimmer: null, tut: 0, selected: "moonradish",
        stats: { harvested: 0, served: 0, sold: 0, cooked: 0, fish: 0, tilled: 0, earned: 0, hybrids: 0, nights: 0 }, milestones: 0,
    };
    for (const g of GHOST_LIST) { s.hearts[g] = 0; s.told[g] = 0; }
    for (let i = 0; i < N; i++) s.tiles.push({ z: +ZONE_MAP[i], t: false, w: false, c: null, b: null });
    // The first night starts with ripe radishes: the first thing the player ever does is the best thing in the game.
    for (const i of [idx(3, 4), idx(4, 4), idx(3, 5), idx(4, 5)]) { s.tiles[i].t = true; s.tiles[i].c = { id: "moonradish", age: 2, ripe: true }; }
    return s;
}

export const open = (s, i) => s.tiles[i].z < s.zones;
/** What a sweep starting on this tile will do. */
export function verbAt(s, i) {
    const t = s.tiles[i];
    if (s.phase !== "night") return null;
    if (!open(s, i)) return "bramble";
    if (t.b) return null;
    if (t.c) return t.c.ripe ? "harvest" : t.w ? null : "water";
    return t.t ? "plant" : "till";
}
export function till(s, i) {
    const t = s.tiles[i];
    if (verbAt(s, i) !== "till") return null;
    t.t = true; s.stats.tilled++;
    let relic = null;
    if (s.bonePending) { s.bonePending = false; s.boneFound = true; relic = "bone"; s.dex.relic.bone = 1; }
    else if (rnd(s) < 0.11) { const left = RELIC_LIST.filter((r) => !s.dex.relic[r]); if (left.length) { relic = pick(s, left); s.dex.relic[relic] = 1; museum(s); } }
    return { relic };
}
export function plant(s, i, id = s.selected) {
    const t = s.tiles[i], cost = seedCost(s, id);
    if (verbAt(s, i) !== "plant" || !fitsSeason(s, id, i) || s.pennies < cost) return null;
    s.pennies -= cost; t.c = { id, age: 0, ripe: false };
    return { cost };
}
export function water(s, i) {
    if (verbAt(s, i) !== "water") return null;
    s.tiles[i].w = true;
    return {};
}
/** Yield is 1, plus 1 for each kind of friend next door (up to 2), plus 1 for a bloom on the new moon. */
export function yieldOf(s, i) {
    const c = s.tiles[i].c, def = CROPS[c.id], friends = new Set();
    for (const n of nbrs(i)) { const o = s.tiles[n].c; if (o && (def.friends.includes(o.id) || CROPS[o.id].friends.includes(c.id))) friends.add(o.id); }
    return 1 + Math.min(2, friends.size) + (moon(s) === 0 && def.tag === "bloom" ? 1 : 0);
}
export function harvest(s, i) {
    if (verbAt(s, i) !== "harvest") return null;
    const t = s.tiles[i], c = t.c, def = CROPS[c.id], n = yieldOf(s, i), shining = moon(s) === 4, key = c.id + (shining ? "*" : "");
    add(s, key, n); s.stats.harvested += n;
    log(s, "crop", c.id);
    if (def.regrow) { c.ripe = false; c.age = def.days - def.regrow; } else t.c = null;
    return { id: c.id, key, n, shining };
}
function add(s, k, n = 1) { s.inv[k] = (s.inv[k] ?? 0) + n; }
function take(s, k, n = 1) { if ((s.inv[k] ?? 0) < n) return false; s.inv[k] -= n; if (s.inv[k] <= 0) delete s.inv[k]; return true; }
function log(s, kind, id) { if (!s.dex[kind][id]) { s.dex[kind][id] = 1; museum(s); return true; } return false; }
export const dexCount = (s) => Object.values(s.dex).reduce((n, o) => n + Object.keys(o).filter((k) => k !== "duchess" && k !== "bone").length, 0);
export const dexTotal = () => Object.keys(CROPS).length + Object.keys(FISH).filter((f) => !FISH[f].legend).length + Object.keys(DISHES).length + RELIC_LIST.length;
function museum(s) {
    const tier = Math.floor(dexCount(s) / 10);
    if (tier > s.milestones) { s.milestones = tier; s.pennies += tier * 80; s.note = `The Professor is thrilled. ${tier * 10} exhibits! Here's ${tier * 80} pennies.`; }
}
export function placeBell(s, i) {
    const t = s.tiles[i];
    if (s.bells <= 0 || !open(s, i) || t.c || t.b) return false;
    s.bells--; t.b = "bell"; t.t = true;
    return true;
}
export function removeCrop(s, i) { const t = s.tiles[i]; if (!t.c) return false; t.c = null; return true; }
export function grab(s) {
    const g = s.glimmer;
    if (!g) return null;
    s.glimmer = null;
    if (g.kind === "pennies") s.pennies += g.n;
    else if (g.kind === "item") { add(s, g.id, g.n); if (itemKind(g.id) === "crop") log(s, "crop", g.id); }
    return g;
}

/** Everything growing, in one go. Returns what happened for the morning's fanfare. */
export function dawn(s) {
    if (s.phase !== "night") return null;
    const m = moon(s), kind = moonKind(m), ev = { grew: [], ripened: [], hybrids: [], letter: false, honey: false };
    if (s.buffs.rainTonight) s.buffs.rainTonight = false;
    const grow = s.buffs.grow ? 1 : 0;
    s.tiles.forEach((t, i) => {
        const c = t.c;
        if (!c || c.ripe) return;
        if (!(t.w || s.rain)) return;
        const def = CROPS[c.id];
        let gain = 1 + grow;
        if (kind === "wax" && def.tag === "leaf") gain++;
        if (kind === "wane" && def.tag === "root") gain++;
        c.age += gain; ev.grew.push(i);
        if (c.age >= def.days) { c.ripe = true; ev.ripened.push(i); }
    });
    s.buffs.grow = false;
    // Matchmaking: an empty tilled tile with two ripe parents beside it.
    const sure = kind === "new" || s.buffs.pollen;
    let matched = false;
    s.tiles.forEach((t, i) => {
        if (t.c || !t.t || t.b || !open(s, i)) return;
        const ripe = nbrs(i).map((n) => s.tiles[n].c).filter((c) => c && c.ripe).map((c) => c.id);
        for (const h of HYBRIDS) {
            const [a, b] = CROPS[h].parents;
            if (!ripe.includes(a) || !ripe.includes(b)) continue;
            const chance = sure ? 1 : (s.built.hive ? 0.62 : 0.36) + (s.pity[h] ?? 0) * 0.22;
            if (rnd(s) < chance) {
                t.c = { id: h, age: 0, ripe: false }; s.pity[h] = 0; matched = true;
                const first = !s.found.includes(h);
                if (first) { s.found.push(h); s.stats.hybrids++; }
                ev.hybrids.push({ i, id: h, first });
                break;
            }
            s.pity[h] = (s.pity[h] ?? 0) + 1;
        }
    });
    if (matched) s.buffs.pollen = false;
    if (s.built.hive) { add(s, "honey", 1); ev.honey = true; }
    s.tiles.forEach((t) => { t.w = false; });
    s.rain = false;
    s.phase = "day"; s.gifted = {}; s.stats.nights++;
    makeOrders(s);
    if (s.letter < LETTERS.length - 1 && (s.letter < 0 || LETTERS[s.letter].done(s))) { s.letter++; s.letterUnread = true; ev.letter = true; }
    return ev;
}

function makeOrders(s) {
    const n = 2 + (s.built.awning ? 1 : 0) + (s.day > 8 ? 1 : 0);
    const pool = [...GHOST_LIST], who = [];
    for (let i = 0; i < n && pool.length; i++) who.push(pool.splice(Math.floor(rnd(s) * pool.length) % pool.length, 1)[0]);
    const have = Object.keys(s.inv).map(isBase).filter((k) => baseSell(k) > 5), seen = new Set();
    s.orders = who.map((g) => {
        const inSeason = seedList(s), loves = GHOSTS[g].loves.filter((k) => s.inv[k]);
        let item = loves.length && rnd(s) < 0.5 ? pick(s, loves) : have.length && rnd(s) < 0.75 ? pick(s, have) : pick(s, inSeason);
        if (seen.has(item) && have.length) item = pick(s, have);
        seen.add(item);
        return { g, item, price: Math.round(priceOf(s, item) * 1.6), done: false, gift: false };
    });
}
export const stock = (s, id) => (s.inv[id] ?? 0) + (s.inv[`${id}*`] ?? 0);
/** Serve the plain one first; a Shining one only if that's all there is, and it pays double. */
export function serve(s, n) {
    const o = s.orders[n];
    if (!o || o.done || s.phase !== "day" || !stock(s, o.item)) return null;
    const shining = !s.inv[o.item];
    take(s, shining ? `${o.item}*` : o.item);
    const pay = shining ? o.price * 2 : o.price;
    o.done = true; s.pennies += pay; s.stats.earned += pay; s.stats.served++;
    const before = heartLevel(s, o.g);
    s.hearts[o.g] += 1;
    return { pay, g: o.g, heart: heartLevel(s, o.g) > before };
}
/** Stock that a story goal still needs, so "sell the rest" never eats something important. */
export function reserved(s) {
    const r = {};
    const hold = (k, n) => { r[k] = Math.max(r[k] ?? 0, n); };
    if (!s.ended) hold("hearthlight", 1), hold("hearthlight*", 1);
    if (!s.keepsakes.includes("feather")) for (const c of Object.keys(CROPS)) if (CROPS[c].tag === "bloom") hold(`${c}*`, 3);
    if (!s.keepsakes.includes("woodspoon")) { for (const k of ["pearlroot", "silverperch", "wispwheat", "frostcap", "remembering"]) { hold(k, 1); hold(`${k}*`, 1); } }
    if (!s.recipes.length || s.built.cauldron) for (const o of s.orders) if (!o.done) hold(o.item, 1);
    return r;
}
export function sellOne(s, k) {
    if (s.phase !== "day" || !take(s, k)) return 0;
    const pay = priceOf(s, k);
    s.pennies += pay; s.stats.earned += pay; s.stats.sold++;
    return pay;
}
/** Sells crops above what's reserved. Fish, dishes and honey stay, because they're for gifts and cooking. */
export function sellRest(s) {
    if (s.phase !== "day") return [];
    const keep = reserved(s), out = [];
    for (const k of Object.keys(s.inv)) {
        const id = isBase(k);
        if (itemKind(id) !== "crop" && !(itemKind(id) === "other") && !(s.inv[k] > 3)) continue;
        const spare = s.inv[k] - (keep[k] ?? 0) - (itemKind(id) === "crop" || id === "honey" ? 0 : 3);
        for (let n = 0; n < spare; n++) out.push({ k, pay: sellOne(s, k) });
    }
    return out;
}
export function gift(s, g, k) {
    if (s.gifted[g] || s.phase !== "day" || !take(s, k)) return null;
    const id = isBase(k), G = GHOSTS[g], def = CROPS[id], tag = def?.tag ?? (FISH[id] ? "fish" : DISHES[id] ? "dish" : "");
    const score = G.loves.includes(id) ? 3 : G.likes.includes(tag) ? 2 : 1, pts = score + (isShining(k) ? 1 : 0), before = heartLevel(s, g);
    s.gifted[g] = true; s.hearts[g] += pts;
    return { score, pts, heart: heartLevel(s, g) > before };
}
export const hasStory = (s, g) => s.told[g] < heartLevel(s, g);
export function talk(s, g) { if (!hasStory(s, g)) return null; return GHOSTS[g].story[s.told[g]++]; }

export function favourReady(s, g) {
    if (s.keepsakes.includes(GHOSTS[g].keepsake) || heartLevel(s, g) < 5) return false;
    switch (g) {
        case "bartleby": return !!s.dex.fish.duchess;
        case "biscuit": return !!s.boneFound;
        case "auberon": return stock(s, "remembering") > 0;
        case "odette": return shiningBlooms(s) >= 3;
        case "fennimore": return s.found.length >= 3;
        case "quillon": return s.keepsakes.length >= 5;
    }
    return false;
}
function shiningBlooms(s) { return Object.keys(s.inv).filter((k) => isShining(k) && CROPS[isBase(k)]?.tag === "bloom").reduce((n, k) => n + s.inv[k], 0); }
export function doFavour(s, g) {
    if (!favourReady(s, g)) return null;
    if (g === "auberon") take(s, s.inv.remembering ? "remembering" : "remembering*");
    if (g === "odette") { let n = 3; for (const k of Object.keys(s.inv)) if (isShining(k) && CROPS[isBase(k)]?.tag === "bloom") while (n > 0 && take(s, k)) n--; }
    s.keepsakes.push(GHOSTS[g].keepsake);
    return GHOSTS[g].keepsake;
}
/** Biscuit's bone starts turning up once he's shown you he's looking. */
export function openFavour(s, g) { if (g === "biscuit" && !s.boneFound && heartLevel(s, g) >= 5) s.bonePending = true; }

export const canAfford = (s, n) => s.pennies >= n;
export function buy(s, id) {
    const b = BUILDINGS[id];
    if (!b || (s.built[id] && !b.multi) || s.pennies < b.cost) return false;
    s.pennies -= b.cost;
    if (b.multi) { s.bells += b.multi; s.built[id] = (s.built[id] ?? 0) + 1; } else s.built[id] = true;
    if (id === "rod") s.casts += 2;
    return true;
}
export const nextZone = (s) => s.zones < ZONES.length ? ZONES[s.zones] : null;
export function clearZone(s) { const z = nextZone(s); if (!z || s.pennies < z.cost) return false; s.pennies -= z.cost; s.zones++; return true; }
export const nextLantern = (s) => LANTERN[s.lantern] ?? null;
export function buildLantern(s) {
    const l = nextLantern(s);
    if (!l || s.pennies < l.cost) return false;
    if (s.lantern >= 2 && !s.found.includes("hearthlight")) return false;
    s.pennies -= l.cost; s.lantern++;
    return true;
}

export const maxCasts = (s) => s.built.rod ? 5 : 3;
export const duchessDue = (s) => s.built.rod && moon(s) === 4 && heartLevel(s, "bartleby") >= 5 && !s.dex.fish.duchess && s.phase === "night";
/** Picks what's on the line. The Old Duchess only takes the last cast of a full moon, once Bartleby has asked. */
export function bite(s) {
    if (s.casts <= 0 || s.phase !== "night") return null;
    if (duchessDue(s) && s.casts === 1) return "duchess";
    const se = season(s), kind = moonKind(moon(s));
    const list = Object.keys(FISH).filter((f) => { const d = FISH[f]; return d.weight > 0 && (d.season === -1 || d.season === se) && (!d.night || d.night === kind); });
    let t = rnd(s) * list.reduce((a, f) => a + FISH[f].weight, 0);
    for (const f of list) { t -= FISH[f].weight; if (t <= 0) return f; }
    return list[0];
}
export function land(s, id, shining) {
    if (s.casts <= 0) return null;
    s.casts--;
    const first = log(s, "fish", id);
    s.stats.fish++;
    if (id !== "duchess") add(s, id + (shining ? "*" : ""));
    return { first };
}
export function matchRecipe(ids) {
    const want = [...ids].sort().join();
    for (const [d, def] of Object.entries(DISHES)) {
        if (def.needs && [...def.needs].sort().join() === want) return d;
        if (def.altNeeds && [...def.altNeeds].sort().join() === want) return d;
    }
    return "broth";
}
/** keys are inventory keys; two or three of them. */
export function cook(s, keys) {
    if (!s.built.cauldron || keys.length < 2 || keys.length > 3 || s.phase !== "day") return null;
    const counts = {}; for (const k of keys) counts[k] = (counts[k] ?? 0) + 1;
    for (const k in counts) if ((s.inv[k] ?? 0) < counts[k]) return null;
    for (const k of keys) take(s, k);
    const id = matchRecipe(keys.map(isBase)), first = !s.recipes.includes(id);
    if (first) s.recipes.push(id);
    log(s, "dish", id); add(s, id); s.stats.cooked++;
    return { id, first };
}
export function eat(s, k) {
    const b = DISHES[isBase(k)]?.buff;
    if (!b || !take(s, k)) return null;
    if (b === "rain") s.buffs.rainNext = true; else s.buffs[b] = true;
    return b;
}
const RAIN = [0.2, 0.1, 0.2, 0.18];
export function dusk(s) {
    if (s.phase !== "day") return null;
    const before = season(s), ev = { tucked: 0, refund: 0, scene: null, seasonChanged: false };
    s.day++; s.phase = "night"; s.casts = maxCasts(s); s.orders = [];
    if (season(s) !== before) {
        ev.seasonChanged = true;
        // Nothing dies. Ripe crops go in the basket, and anything unfinished hands its seed money back.
        s.tiles.forEach((t, i) => {
            if (t.c && !fitsSeason(s, t.c.id, i)) { if (t.c.ripe) { add(s, t.c.id); ev.tucked++; } else { s.pennies += CROPS[t.c.id].seed; ev.refund += CROPS[t.c.id].seed; } t.c = null; }
        });
        if (!seedList(s).includes(s.selected)) s.selected = seedList(s)[0];
    }
    s.rain = !!s.buffs.rainNext || rnd(s) < RAIN[season(s)];
    s.buffs.rainNext = false;
    s.tiles.forEach((t, i) => {
        if (t.b === "bell") for (const n of around(i)) s.tiles[n].w = true;
        if (t.c && t.c.ripe && CROPS[t.c.id].tall) for (const n of nbrs(i)) s.tiles[n].w = true;
    });
    if (moon(s) === 4 && s.moonSeen < 5) { ev.scene = s.moonSeen; s.moonSeen++; }
    // Wick finds something now and then, somewhere on the open field.
    if (rnd(s) < 0.45) {
        const free = s.tiles.map((t, i) => (open(s, i) && !t.c && !t.b ? i : -1)).filter((i) => i >= 0);
        if (free.length) s.glimmer = { i: pick(s, free), ...(rnd(s) < 0.55 ? { kind: "pennies", n: 8 + Math.floor(rnd(s) * 18) + s.day } : { kind: "item", id: rnd(s) < 0.5 ? pick(s, ["pondlet", "silverperch"]) : pick(s, seedList(s).filter((c) => !CROPS[c].hybrid)), n: 1 }) };
    }
    return ev;
}
export const canFinish = (s) => !s.ended && s.phase === "night" && moon(s) === 4 && s.day > 34 && s.lantern >= 3 && s.keepsakes.length >= 6 && s.lastLetterRead && stock(s, "hearthlight") > 0;
export function finish(s) { if (!canFinish(s)) return false; take(s, s.inv.hearthlight ? "hearthlight" : "hearthlight*"); s.ended = true; return true; }
/** The one-line nudge for the HUD. */
export function goalText(s) {
    if (s.ended) return "The lantern is lit. Grow whatever you like.";
    if (s.letter >= 0 && !LETTERS[s.letter].done(s)) return LETTERS[s.letter].goal;
    if (s.letter < 0) return "Greet the dawn and open the stall";
    if (s.keepsakes.length < 6) return `Gather the six keepsakes (${s.keepsakes.length}/6)`;
    if (s.lantern < 3) return "Finish the Great Lamp at the dock";
    if (!stock(s, "hearthlight")) return "Keep one Hearthlight for the lamp";
    if (moon(s) !== 4) return `Light the lantern at the full moon, ${nightsToFull(s)} nights away`;
    return "Go down to the lake. It's time.";
}
export const worth = (s) => s.pennies + Object.keys(s.inv).reduce((n, k) => n + s.inv[k] * priceOf(s, k), 0);
export { KEEPSAKES, RELICS };
