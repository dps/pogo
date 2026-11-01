// One run of the game: money, shelves, pen, merges, lives. Pure and seeded so bots can play thousands of runs headless.
import { CELLS, PET, PETS, SHOP, TRAIT_IDS, abN } from "./data.js";
import { battle, hashStr, rngOf, traitCounts, traitVal } from "./sim.js";
import { GHOSTS } from "./ghosts.js";

export const WIN_GOAL = 10, LIVES = 4, BENCH = 5, ROLL_COST = 1, MAX_GOLD = 30;
/** Shelf odds by tier, %. Index by min(round, 12). */
const ODDS = [null, [100, 0, 0, 0, 0], [80, 20, 0, 0, 0], [65, 30, 5, 0, 0], [50, 35, 15, 0, 0], [40, 35, 20, 5, 0], [30, 35, 25, 10, 0], [25, 30, 28, 15, 2], [20, 25, 30, 20, 5], [15, 25, 30, 22, 8], [12, 20, 30, 26, 12], [10, 18, 30, 28, 14], [8, 16, 28, 30, 18]];

export const incomeFor = (round, shop) => Math.min(11, 5 + round) + (SHOP[shop].income ?? 0);
export const capFor = (round, shop) => Math.max(2, Math.min(8, 3 + (round >> 1)) + (SHOP[shop].capMod ?? 0));

/** Each run stocks a random 8 of the 12 traits: copies turn up often enough to merge, and every run has its own builds. */
export function stockFor(seed, unlocked) {
    const rng = rngOf(hashStr(seed >>> 0, "stock")), ids = TRAIT_IDS.slice();
    for (let i = ids.length - 1; i > 0; i--) { const j = rng.int(i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const traits = ids.slice(0, 8);
    let pool = PETS.filter((p) => p.traits.every((t) => traits.includes(t)) && (!unlocked || unlocked.has(p.id)));
    // Keep every tier stocked even with few unlocks.
    for (let tier = 1; tier <= 5; tier++) if (pool.filter((p) => p.tier === tier).length < 3) {
        const extra = PETS.filter((p) => p.tier === tier && p.traits.some((t) => traits.includes(t)) && (!unlocked || unlocked.has(p.id)) && !pool.includes(p));
        pool = pool.concat(extra.slice(0, 4));
    }
    return { traits, pool: pool.map((p) => p.id) };
}

export function newRun({ seed = 1, shop = "corner", unlocked = null, hard = false, tutorial = false } = {}) {
    const stock = stockFor(seed, unlocked);
    const run = { seed: seed >>> 0, shop, hard, tutorial, round: 0, wins: 0, lives: LIVES, gold: 0, board: Array(CELLS).fill(null), bench: Array(BENCH).fill(null), shelf: [], held: [], rolls: 0, uid: 1, stock, log: [], phase: "shop", over: null, history: [], rng: seed >>> 0, bonusGold: 0, merges: 0, lastMerge: [], foe: null, bought: 0 };
    startRound(run);
    return run;
}
const R = (run) => { const r = rngOf(run.rng); const v = r.next(); run.rng = v; return r; };
const need = (run) => SHOP[run.shop].need ?? 3;
export const pets = (run) => [...run.board, ...run.bench].filter(Boolean);
export const teamOf = (run) => run.board.flatMap((p, cell) => (p ? [{ id: p.id, star: p.star, atkB: p.atkB, hpB: p.hpB, extra: p.extra, cell }] : []));
export const boardCount = (run) => run.board.filter(Boolean).length;

function rollCard(run, r) {
    const odds = ODDS[Math.min(run.round, 12)], pool = run.stock.pool;
    for (let tries = 0; tries < 8; tries++) {
        let roll = r.int(100), tier = 1;
        for (let i = 0; i < 5; i++) { if (roll < odds[i]) { tier = i + 1; break; } roll -= odds[i]; }
        const ids = pool.filter((id) => PET[id].tier === tier);
        if (!ids.length) continue;
        // Pets you already own turn up more, so a merge is always worth chasing.
        const mine = ids.filter((id) => pets(run).some((p) => p.id === id));
        const id = mine.length && r.chance(38) ? mine[r.int(mine.length)] : ids[r.int(ids.length)];
        return { id, extra: null };
    }
    return { id: pool[r.int(pool.length)], extra: null };
}
export function fillShelf(run, keepHeld = true) {
    const s = SHOP[run.shop], n = s.slots ?? 5, r = R(run), next = [];
    for (let i = 0; i < n; i++) next.push(keepHeld && run.shelf[i] && run.held[i] ? run.shelf[i] : rollCard(run, r));
    run.held = run.held.map((h, i) => (keepHeld ? h && !!run.shelf[i] : false));
    run.shelf = next;
    if (s.mutant) {
        const opts = next.map((c, i) => i).filter((i) => !next[i].extra && !run.held[i]);
        if (opts.length) { const i = opts[r.int(opts.length)], c = next[i], t = TRAIT_IDS.filter((x) => !PET[c.id].traits.includes(x)); c.extra = t[r.int(t.length)]; }
    }
}
export function cardCost(run, card) { const s = SHOP[run.shop]; if (s.blind) return 2; return PET[card.id].tier + (card.extra ? 2 : 0); }

/** Round start: bank, snacks, shelves. Fires the `round` abilities. */
export function startRound(run) {
    run.round++; run.phase = "shop"; run.rolls = 0; run.lastSnacks = [];
    const shop = SHOP[run.shop], income = incomeFor(run.round, run.shop);
    const carry = shop.carry ? Math.min(run.gold, 14) : 0;
    run.gold = Math.min(MAX_GOLD, income + carry + run.bonusGold);
    run.earned = { income, carry, bonus: run.bonusGold };
    run.bonusGold = 0;
    const team = pets(run), r = R(run);
    const tc = traitCounts(teamOf(run));
    if (tc.chef?.lvl) {
        const [count, amt] = [traitVal("chef", tc.chef.lvl, 0), traitVal("chef", tc.chef.lvl, 1)], on = run.board.filter(Boolean);
        for (let i = 0; i < count && on.length; i++) { const p = on[r.int(on.length)]; p.atkB += amt; p.hpB += amt; run.lastSnacks.push(p.uid); }
    }
    run.board.forEach((p, cell) => { if (p) { const ab = PET[p.id].ab; if (ab.on === "round") perm(run, p, cell, ab, r); } });
    if (!run.tutorial || run.round > 2) fillShelf(run, true); else tutorialShelf(run);
}
function tutorialShelf(run) {
    const [a, b] = ["taxham", "gothrab"];
    run.shelf = run.round === 1 ? [{ id: a }, { id: b }, { id: "buffpug" }, { id: a }, { id: "staticat" }] : [{ id: a }, { id: "bathduck" }, { id: "suitbee" }, { id: a }, { id: "soupnewt" }];
    run.held = [];
}
function perm(run, p, cell, ab, r) {
    const n = abN(ab, p.star), add = (t) => { if (ab.fx === "permatk") t.atkB += n; else t.hpB += n; run.lastSnacks.push(t.uid); };
    const on = run.board.map((q, c) => (q ? [q, c] : null)).filter(Boolean);
    const near = on.filter(([, c]) => Math.abs((c % 4) - (cell % 4)) + Math.abs((c >> 2) - (cell >> 2)) === 1);
    if (ab.who === "adj") near.forEach(([q]) => add(q));
    else if (ab.who === "rand") { const o = on.filter(([q]) => q !== p); if (o.length) add(o[r.int(o.length)][0]); }
    else if (ab.who === "all") on.forEach(([q]) => add(q));
    else if (ab.who === "front") on.filter(([, c]) => c < 4).forEach(([q]) => add(q));
    else if (ab.who === "self") add(p);
}
export function canBuy(run, i) {
    const c = run.shelf[i]; if (!c || run.gold < cardCost(run, c)) return false;
    return !!freeSpot(run) || wouldMerge(run, c.id);
}
const wouldMerge = (run, id) => pets(run).filter((p) => p.id === id && p.star === 1).length >= need(run) - 1;
export function freeSpot(run) {
    if (boardCount(run) < capFor(run.round, run.shop)) { const order = [1, 2, 0, 3, 5, 6, 4, 7]; for (const c of order) if (!run.board[c]) return { zone: "board", i: c }; }
    const b = run.bench.indexOf(null);
    return b >= 0 ? { zone: "bench", i: b } : null;
}
/** Buy shelf card i. `to` may name a spot; otherwise the first free one. Returns { pet, spot, merges } or null. */
export function buy(run, i, to = null) {
    const c = run.shelf[i]; if (!c) return null;
    const cost = cardCost(run, c);
    if (run.gold < cost) return null;
    let spot = null;
    if (to) { const cur = at(run, to); if (!cur && (to.zone === "bench" || boardCount(run) < capFor(run.round, run.shop))) spot = to; }
    spot ??= freeSpot(run);
    if (!spot && !wouldMerge(run, c.id)) return null;
    run.gold -= cost; run.bought++;
    const pet = { uid: run.uid++, id: c.id, star: 1, atkB: 0, hpB: 0, extra: c.extra ?? null };
    if (!spot) { // Full, but this copy merges: it passes through a spot that the merge frees.
        const m = doMerge(run, pet);
        run.shelf[i] = null; run.held[i] = false;
        return { pet: m[m.length - 1].pet, spot: m[0].spot, merges: m };
    }
    put(run, spot, pet);
    run.shelf[i] = null; run.held[i] = false;
    return { pet, spot, merges: checkMerges(run) };
}
export const at = (run, s) => (s.zone === "board" ? run.board[s.i] : run.bench[s.i]);
const put = (run, s, p) => { if (s.zone === "board") run.board[s.i] = p; else run.bench[s.i] = p; };
export function locate(run, uid) {
    let i = run.board.findIndex((p) => p?.uid === uid); if (i >= 0) return { zone: "board", i };
    i = run.bench.findIndex((p) => p?.uid === uid); return i >= 0 ? { zone: "bench", i } : null;
}
function doMerge(run, incoming) {
    const out = [], group = pets(run).filter((p) => p.id === incoming.id && p.star === incoming.star).slice(0, need(run) - 1);
    const best = group[0], spot = locate(run, best.uid), from = group.map((p) => p.uid);
    for (const p of group) put(run, locate(run, p.uid), null);
    const pet = { uid: run.uid++, id: incoming.id, star: incoming.star + 1, atkB: Math.max(incoming.atkB, ...group.map((p) => p.atkB)) + 1, hpB: Math.max(incoming.hpB, ...group.map((p) => p.hpB)) + 1, extra: incoming.extra ?? group.find((p) => p.extra)?.extra ?? null };
    put(run, spot, pet);
    run.merges++;
    out.push({ id: pet.id, star: pet.star, spot, pet, from });
    return [...out, ...checkMerges(run)];
}
export function checkMerges(run) {
    const groups = {};
    for (const p of pets(run)) if (p.star < 3) (groups[`${p.id}/${p.star}`] ??= []).push(p);
    for (const k in groups) if (groups[k].length >= need(run)) {
        const list = groups[k].slice(0, need(run));
        // Land on the board if any copy is there, so a bench copy never pulls a fighter out of the pen.
        list.sort((a, b) => (locate(run, a.uid).zone === "board" ? 0 : 1) - (locate(run, b.uid).zone === "board" ? 0 : 1));
        const spot = locate(run, list[0].uid), from = list.map((p) => p.uid);
        for (const p of list) put(run, locate(run, p.uid), null);
        const pet = { uid: run.uid++, id: list[0].id, star: list[0].star + 1, atkB: Math.max(...list.map((p) => p.atkB)) + 1, hpB: Math.max(...list.map((p) => p.hpB)) + 1, extra: list.find((p) => p.extra)?.extra ?? null };
        put(run, spot, pet);
        run.merges++;
        return [{ id: pet.id, star: pet.star, spot, pet, from }, ...checkMerges(run)];
    }
    return [];
}
/** Move or swap. Returns true if anything changed. */
export function move(run, from, to) {
    if (from.zone === to.zone && from.i === to.i) return false;
    const a = at(run, from), b = at(run, to); if (!a) return false;
    if (from.zone === "bench" && to.zone === "board" && !b && boardCount(run) >= capFor(run.round, run.shop)) return false;
    put(run, to, a); put(run, from, b);
    return true;
}
export const sellPrice = (run, p) => { const s = SHOP[run.shop]; if (s.flatSell) return s.flatSell; return Math.max(1, Math.ceil(PET[p.id].tier * (p.star === 1 ? 1 : p.star === 2 ? 3 : 9) / 2)); };
export function sell(run, spot) {
    const p = at(run, spot); if (!p) return 0;
    const g = sellPrice(run, p); put(run, spot, null); run.gold = Math.min(MAX_GOLD, run.gold + g);
    const ab = PET[p.id].ab;
    if (ab.on === "sold") perm(run, p, spot.zone === "board" ? spot.i : 0, ab, R(run));
    return g;
}
export const rollCost = (run) => ((SHOP[run.shop].freeRolls ?? 0) > run.rolls ? 0 : ROLL_COST);
export function reroll(run) {
    const c = rollCost(run); if (run.gold < c) return false;
    run.gold -= c; run.rolls++;
    const was = run.shelf; run.shelf = was.map((x, i) => (run.held[i] ? x : null));
    fillShelf(run, true);
    return true;
}
export function hold(run, i) { if (run.shelf[i]) run.held[i] = !run.held[i]; }

export const TUNE = { base: -0.06, round: 0, wins: 0.04, hard: 0.3 };
/** The bank is sorted weak to strong within each round. Later rounds and a good record reach further up it. */
export function pickFoe(run, bank = GHOSTS) {
    const rows = bank[Math.min(run.round, bank.length - 1)] ?? [];
    if (!rows.length) return { name: "Empty Shop", pets: [], gold: 0 };
    if (run.tutorial && run.round <= 2) return rows[0];
    const r = rngOf(hashStr(run.seed, `foe${run.round}`));
    const pct = Math.max(0, Math.min(0.97, TUNE.base + (run.hard ? TUNE.hard : 0) + run.round * TUNE.round + run.wins * TUNE.wins + (r.int(21) - 10) / 100));
    const k = Math.max(0, Math.min(rows.length - 1, Math.round(pct * (rows.length - 1))));
    return rows[k];
}
export const battleSeed = (run) => hashStr(run.seed, `battle${run.round}`);
/** Lock in and fight. The result carries everything a replay needs. */
export function fight(run, bank = GHOSTS) {
    const me = { pets: teamOf(run), gold: run.gold }, foe = pickFoe(run, bank), seed = battleSeed(run);
    const res = battle(me, foe, seed);
    const entry = { round: run.round, me, foe: { name: foe.name, pets: foe.pets, gold: foe.gold ?? 0 }, seed, winner: res.winner, hash: res.hash };
    run.history.push(entry);
    return { res, entry };
}
/** Apply a resolved battle, after the player has watched it. */
export function settle(run, winner) {
    if (winner === "a") {
        run.wins++;
        for (const p of pets(run)) { const ab = PET[p.id].ab; if (ab.on === "won" && locate(run, p.uid).zone === "board") { if (ab.fx === "gold") run.bonusGold += abN(ab, p.star); else { const s = locate(run, p.uid); perm(run, p, s.i, ab, R(run)); } } }
    } else if (winner === "b") run.lives--;
    const tc = traitCounts(teamOf(run));
    if (tc.suit?.lvl) run.bonusGold += traitVal("suit", tc.suit.lvl, 1);
    if (run.wins >= WIN_GOAL) { run.over = "won"; run.phase = "over"; }
    else if (run.lives <= 0) { run.over = "lost"; run.phase = "over"; }
    else startRound(run);
}
