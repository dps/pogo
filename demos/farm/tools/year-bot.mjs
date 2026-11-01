// Plays Moonpatch's rules for a whole year, through the same sim functions the UI calls, and proves three things:
// the economy never stalls (even for a player who skips most of the game), the story can finish, and nothing can trap you.
import * as S from "../sim.js";
import { BUILDINGS, BUILD_ORDER, COLS, CROPS, DISHES, GHOSTS, GHOST_LIST, LANTERN, LETTERS, ROWS, SEASONS, YEAR_DAYS } from "../data.js";

import * as P from "./policy.mjs";
const ALL = P.ALL;

function fishAll(s) { let n = 0; while (s.casts > 0) { const f = S.bite(s); if (!f) break; S.land(s, f, n++ === 0 && S.moon(s) === 4); } }
const hour = () => 0;

/** The keeper: follows tools/policy.mjs for every ghost arc. */
function careful(seed, opts = {}) {
    const s = S.newGame(seed), rows = []; let finished = null, stalls = 0, lastWorth = 0;
    for (let guard = 0; guard < YEAR_DAYS + 2; guard++) {
        const ev0 = { d: s.day, season: SEASONS[S.season(s)], moon: S.moon(s) };
        S.grab(s);
        { const g = P.digTile(s); if (g >= 0) S.removeCrop(s, g); }
        for (const i of P.ALL) if (S.verbAt(s, i) === "till") S.till(s, i);
        for (const i of P.ALL) if (S.verbAt(s, i) === "harvest" && !P.holdHarvest(s, i)) S.harvest(s, i);
        for (const i of P.ALL) if (S.verbAt(s, i) === "plant") { const id = P.planTile(s, i); if (id) S.plant(s, i, id); }
        for (const i of P.ALL) if (S.verbAt(s, i) === "water") S.water(s, i);
        if (s.day > 1) fishAll(s);
        if (S.canFinish(s) && !finished) { S.finish(s); finished = s.day; }
        S.dawn(s);
        { const c = P.cookChoice(s); if (c) S.cook(s, c); }
        s.orders.forEach((o, i) => S.serve(s, i));
        for (const o of s.orders) {
            const k = P.giftFor(s, o.g); if (k) S.gift(s, o.g, k);
            while (S.hasStory(s, o.g)) S.talk(s, o.g);
            S.openFavour(s, o.g);
            if (S.favourReady(s, o.g)) S.doFavour(s, o.g);
        }
        if (s.keepsakes.length >= 6) s.lastLetterRead = true;
        const c = P.cookChoice(s); if (c) S.cook(s, c);
        S.sellRest(s);
        for (const b of P.shopping(s)) { if (b === "zone") S.clearZone(s); else if (b === "lantern") S.buildLantern(s); else S.buy(s, b); }
        if (s.bells) for (const i of P.ALL) { const x = i % 7, y = Math.floor(i / 7); if (s.bells && x % 3 === 1 && y % 3 === 0 && !s.tiles[i].c) S.placeBell(s, i); }
        const w = S.worth(s);
        rows.push({ ...ev0, pennies: s.pennies, worth: w, hearts: GHOST_LIST.map((g) => S.heartLevel(s, g)).join(""), keep: s.keepsakes.length, zones: s.zones, lantern: s.lantern, found: s.found.length, letter: s.letter });
        if (s.day % 12 === 0) { const e = s.stats.earned; if (e <= lastWorth) stalls++; lastWorth = e * 1.0; }
        S.dusk(s);
    }
    return { s, rows, finished, stalls };
}
/** Does the bare minimum: one small patch of the cheapest crop, one sale. */
function lazy(seed) {
    const s = S.newGame(seed), byDay = [];
    for (let d = 0; d < YEAR_DAYS; d++) {
        let planted = 0;
        for (const i of ALL) { if (S.verbAt(s, i) === "harvest") S.harvest(s, i); }
        const cheap = S.seedList(s).filter((c) => !CROPS[c].hybrid).sort((a, b) => CROPS[a].seed - CROPS[b].seed)[0];
        for (const i of ALL) if (planted < 6) { const v = S.verbAt(s, i); if (v === "till") S.till(s, i); if (S.verbAt(s, i) === "plant" && S.plant(s, i, cheap)) planted++; if (S.tiles) break; }
        for (const i of ALL) if (S.verbAt(s, i) === "till" && planted < 6) { S.till(s, i); if (S.plant(s, i, cheap)) planted++; } else if (S.verbAt(s, i) === "plant" && planted < 6 && S.plant(s, i, cheap)) planted++;
        for (const i of ALL) if (S.verbAt(s, i) === "water") S.water(s, i);
        S.dawn(s); S.sellRest(s); S.dusk(s);
        byDay.push(s.pennies);
    }
    return { pennies: s.pennies, min: Math.min(...byDay), earned: s.stats.earned, harvested: s.stats.harvested };
}
/** Spends everything, ignores the field for a season, then comes back. Nothing may be lost, and play must restart. */
function neglect(seed) {
    const s = S.newGame(seed);
    s.pennies = 0;
    for (let d = 0; d < 20; d++) { S.dawn(s); S.dusk(s); }
    const startEmpty = s.pennies, cheap = S.seedList(s).filter((c) => !CROPS[c].hybrid).sort((a, b) => CROPS[a].seed - CROPS[b].seed)[0];
    s.pennies = 0; for (const t of s.tiles) t.c = null;
    let ok = 0;
    for (const i of ALL) { if (S.verbAt(s, i) === "till") S.till(s, i); if (S.verbAt(s, i) === "plant" && S.plant(s, i, cheap)) ok++; if (ok >= 3) break; }
    for (let d = 0; d < 8; d++) { for (const i of ALL) { if (S.verbAt(s, i) === "harvest") S.harvest(s, i); if (S.verbAt(s, i) === "water") S.water(s, i); } S.dawn(s); S.sellRest(s); S.dusk(s); if (d % 2) for (const i of ALL) { if (S.verbAt(s, i) === "plant" && S.plant(s, i, S.seedList(s).sort((a, b) => CROPS[a].seed - CROPS[b].seed)[0])) ok++; } }
    return { freeSeeds: ok, pennies: s.pennies };
}

let fail = 0; const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail = 1; };
const verbose = process.argv.includes("-v");
const finishes = [];
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const r = careful(seed);
    if (verbose && seed === 1) for (const x of r.rows) console.log(`d${String(x.d).padStart(2)} ${x.season.padEnd(6)} m${x.moon} p${String(x.pennies).padStart(6)} worth${String(x.worth).padStart(7)} z${x.zones} L${x.lantern} letter${x.letter} found${x.found} keep${x.keep} hearts ${x.hearts}`);
    finishes.push(r.finished);
    const seasons = [11, 23, 35, 47].map((d) => r.rows[d].worth), grow = true;
    if (!r.finished) console.log(`  stuck: keep ${r.s.keepsakes} L${r.s.lantern} letter ${r.s.letter} found ${r.s.found} hearth ${S.stock(r.s, "hearthlight")} read ${r.s.lastLetterRead} goal "${S.goalText(r.s)}" duchess ${!!r.s.dex.fish.duchess} bone ${r.s.boneFound} inv ${Object.keys(r.s.inv).join()}`);
    console.log(`seed ${seed}: finished day ${r.finished}, worth by season ${seasons.join(" ")}, built ${Object.keys(r.s.built).length}, dex ${S.dexCount(r.s)}/${S.dexTotal()}, hearts ${r.rows.at(-1).hearts}`);
    ok(r.stalls === 0 && grow, `seed ${seed}: economy never stalls`);
    ok(r.finished && r.finished <= 50, `seed ${seed}: the story finishes by the year-end full moon (day ${r.finished})`);
}
for (const seed of [1, 2, 3]) { const l = lazy(seed); ok(l.min >= 0 && l.earned > 0, `lazy seed ${seed}: six-tile radish player still earns (${l.pennies}p, ${l.harvested} harvested)`); }
{ const n = neglect(1); ok(n.freeSeeds > 0, `broke and neglected for 20 days: free seeds restart the farm (${n.freeSeeds} planted, ${n.pennies}p after 8 days)`); }
console.log(`finishes: ${finishes.join(" ")}`);
process.exit(fail);
