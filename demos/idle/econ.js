// The whole game as a pure state machine. No drawing, no audio, no clock: the simulator and the real game run this same code.
import { ACTS, BASE_COST, BASE_YIELD, BYLAWS, CONCEPTS, CUSTOMERS, KID, NUMBER_WORDS, WEEK } from "./data.js";

export const MILESTONES = [10]; for (let n = 25; n <= 2000; n += 25) MILESTONES.push(n);
export const TUNE = {
    saleHits: 10, saleBonus: 4,
    custEvery: 70, custFirst: 22, offerSecs: 20, offerTaps: 15,
    hypeTaps: 160, hypePassive: 1 / 300, frenzySecs: 15, frenzyMult: 3,
    orbitPeriod: 2.4, orbitWindow: 0.46,
    dayLength: 20,
    strayEvery: 150,
    awayRate: 0.5, awayCapHours: 8,
};

export function newState(o = {}) {
    return {
        v: 1, seed: o.seed ?? 12345, act: 0, sale: o.sale ?? 1, bylaws: o.bylaws ?? [], cash: 0, earnedAct: 0, earnedTotal: o.earnedTotal ?? 0, time: 0,
        stop: 0, crew: [0, 0, 0, 0, 0], ups: {}, milestonesSeen: [0, 0, 0, 0, 0],
        streak: 0, streakT: 0, hits: 0, hype: 0, frenzy: 0, perfect: 0, orbit: 2,
        cust: null, custT: TUNE.custFirst, kidDone: false, stray: false, strayT: TUNE.strayEvery,
        gary: { wins: 0, war: null, cool: 0, met: false }, fed: [0, 0, 0, 0, 0], weekT: 0, concepts: {},
        ready: false, ended: false, finale: 0, offered: null,
        stats: { taps: 0, sold: 0, haggles: 0, walked: 0, frenzies: 0, perfects: 0, stickers: 0, crew: 0, fed: 0, moved: 0, soldItems: {} },
        events: [],
    };
}

const emit = (S, t, o) => { S.events.push({ t, ...o }); };
export const act = (S) => ACTS[S.act];
export const has = (S, id) => S.bylaws.includes(id);
export const sold = (S, id) => !!S.concepts[id];
function rnd(S) { S.seed = (S.seed + 0x6d2b79f5) | 0; let t = Math.imul(S.seed ^ (S.seed >>> 15), 1 | S.seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// --- Upgrades ----------------------------------------------------------------------------------
const UPCACHE = ACTS.map((A, a) => {
    const list = [];
    A.crew.forEach((c, i) => {
        const base = A.U * BASE_COST[i] * A.spread ** i;
        list.push({ id: `${a}c${i}a`, kind: "crew", crew: i, name: A.ups[i * 2][0], note: A.ups[i * 2][1], mult: 2, cost: base * 12, need: 5 });
        list.push({ id: `${a}c${i}b`, kind: "crew", crew: i, name: A.ups[i * 2 + 1][0], note: A.ups[i * 2 + 1][1], mult: 3, cost: base * A.g ** 40 * 30, need: 40 });
    });
    A.taps.forEach((t, k) => list.push({ id: `${a}t${k}`, kind: "tap", name: t[0], note: t[1], mult: 2, pct: [0.005, 0.01, 0.015][k], cost: A.U * [120, 9000, 3e6][k] * A.spread ** (k * 1.5), stop: k }));
    return list;
});
export const upgrades = (S) => UPCACHE[S.act];
export const upBought = (S, u) => !!S.ups[u.id];
export const upVisible = (S, u) => !S.ups[u.id] && (u.kind === "crew" ? S.crew[u.crew] >= u.need || S.ups[`${u.id}!seen`] : S.stop >= u.stop);
export function buyUp(S, u) {
    if (S.ups[u.id] || S.cash < u.cost) return false;
    S.cash -= u.cost; S.ups[u.id] = 1; emit(S, "up", { u }); return true;
}
function upMult(S, i) { let m = 1; for (const u of UPCACHE[S.act]) if (u.crew === i && S.ups[u.id]) m *= u.mult; return m; }
export function milestoneCount(n) { let c = 0; for (const m of MILESTONES) if (n >= m) c++; return c; }
export function nextMilestone(n) { for (const m of MILESTONES) if (n < m) return m; return null; }
export const milestoneMult = (S, n) => act(S).m ** milestoneCount(n);
const growth = (S) => act(S).g;

// --- Rates ---------------------------------------------------------------------------------------
export const garyMult = (S) => (S.act < 2 ? 1 : S.act > 2 ? 1 : 0.5 * 1.9 ** S.gary.wins);
export const holeMult = (S) => { if (S.act < 4) return 1; let m = 1; for (let i = 0; i < 5; i++) m *= 1 + Math.sqrt(S.fed[i]) * (0.2 + 0.1 * i); return m; };
export const orbitOn = (S) => S.act >= 3;
export const hypeOn = (S) => S.act >= 1;
export const holeOn = (S) => S.act >= 4;
export const weekOn = (S) => S.act === 5;
export function weekDays(S) { return WEEK.filter((d) => !(d.id === "mon" && sold(S, "monday")) && !(d.id === "tue" && sold(S, "tuesday"))); }
export function today(S) { if (!weekOn(S)) return null; const days = weekDays(S); return days[Math.floor(S.weekT / TUNE.dayLength) % days.length]; }
function conceptCrew(S) { return (sold(S, "beige") ? 10 : 1) * (sold(S, "seven") ? 7 : 1) * (sold(S, "irony") ? 10 : 1) * (sold(S, "tuesday") ? 25 : 1); }
function conceptTap(S) { return (sold(S, "monday") ? 10 : 1) * (sold(S, "orange") ? 50 : 1) * (sold(S, "tuesday") ? 25 : 1); }
export const saleMult = (S) => 1 + (S.sale - 1);

/** Crew start out strong and thin out across a venue, which keeps every stretch of a venue about the same length. */
function payNow(S) { const A = act(S); return (A.start ?? 1) * A.pay ** Math.max(0, Math.min(1, Math.log(Math.max(S.earnedAct, A.U) / A.U) / Math.log(A.goal / A.U))); }
export function crewEach(S, i) {
    const A = act(S);
    return A.U * payNow(S) * BASE_YIELD[i] * A.yield ** i * upMult(S, i) * milestoneMult(S, S.crew[i]);
}
export function baseRate(S) {
    let r = 0;
    for (let i = 0; i < 5; i++) if (S.crew[i]) r += S.crew[i] * crewEach(S, i);
    const day = today(S);
    return r * 1.2 ** S.stop * garyMult(S) * holeMult(S) * conceptCrew(S) * (has(S, "hands") ? 2 : 1) * (day ? day.crew : 1) * saleMult(S);
}
export const rate = (S) => baseRate(S) * (S.frenzy > 0 ? TUNE.frenzyMult : 1);

export function tapValue(S) {
    let m = 1.5 ** S.stop, pct = 0;
    for (const u of UPCACHE[S.act]) if (u.kind === "tap" && S.ups[u.id]) { m *= u.mult; pct += u.pct; }
    const day = today(S);
    const base = act(S).U * m * conceptTap(S) * (day ? day.tap : 1) * (has(S, "fast") ? 5 : 1) * (has(S, "hands") ? 0.5 : 1) * saleMult(S) * garyMult(S) ** 0.5;
    return (base + baseRate(S) * pct) * (S.frenzy > 0 ? TUNE.frenzyMult : 1);
}
export const streakMult = (S) => 1 + Math.min(S.streak, 100) / 100;

// --- Money ----------------------------------------------------------------------------------------
/** How far through this venue, 0 to 1, on a log scale. */
export function progress(S) {
    const A = act(S), g = A.move ? A.goal : (nextConcept(S)?.at ?? A.goal);
    return Math.max(0, Math.min(1, Math.log(Math.max(S.earnedAct, A.U) / A.U) / Math.log(g / A.U)));
}
const STOP_AT = [0, 0.45, 0.7, 0.85, 0.95];
export function stopAt(S, k) { const A = act(S); return A.U * (A.goal / A.U) ** STOP_AT[k]; }
export function earn(S, x) {
    S.cash += x; S.earnedAct += x; S.earnedTotal += x;
    while (S.stop < 4 && S.earnedAct >= stopAt(S, S.stop + 1)) { S.stop++; emit(S, "stop", { stop: S.stop }); }
    if (!S.ready && act(S).goal && act(S).move && S.earnedAct >= act(S).goal) { S.ready = true; emit(S, "ready"); }
}
export function crewCost(S, i, count = 1) {
    const A = act(S), g = growth(S), base = A.U * BASE_COST[i] * A.spread ** i * g ** S.crew[i] * (has(S, "bulk") ? 0.7 : 1);
    return count === 1 ? base : (base * (g ** count - 1)) / (g - 1);
}
export function maxBuy(S, i) {
    const g = growth(S), c = crewCost(S, i);
    if (S.cash < c) return 0;
    return Math.floor(Math.log((S.cash * (g - 1)) / c + 1) / Math.log(g));
}
export function buyCrew(S, i, count = 1) {
    const c = crewCost(S, i, count);
    if (S.cash < c || count < 1) return false;
    const before = milestoneCount(S.crew[i]);
    S.cash -= c; S.crew[i] += count; S.stats.crew += count;
    for (const u of UPCACHE[S.act]) if (u.crew === i && S.crew[i] >= u.need) S.ups[`${u.id}!seen`] = 1;
    emit(S, "buy", { i, count });
    if (milestoneCount(S.crew[i]) > before) { emit(S, "milestone", { i, n: S.crew[i] }); if (has(S, "laminate")) earn(S, baseRate(S) * 20); }
    return true;
}
export const crewVisible = (S, i) => i === 0 || S.crew[i - 1] > 0 || S.crew[i] > 0 || S.cash >= crewCost(S, i) * 0.5;

// --- The tap ----------------------------------------------------------------------------------------
export function tap(S) {
    S.stats.taps++;
    S.streak++; S.streakT = 1.3;
    let perfect = false;
    if (orbitOn(S)) {
        const off = Math.abs(((S.orbit + Math.PI) % (Math.PI * 2)) - Math.PI);
        perfect = off < TUNE.orbitWindow;
        if (perfect) { S.perfect = Math.min(S.perfect + 1, 12); S.stats.perfects++; } else if (S.perfect > 0) S.perfect = Math.max(0, S.perfect - 2);
    }
    let v = tapValue(S) * streakMult(S);
    if (perfect) v *= 2 + S.perfect / 3;
    let finished = false;
    S.hits++;
    if (S.hits >= TUNE.saleHits) { S.hits = 0; v *= TUNE.saleBonus; finished = true; S.stats.sold++; const k = `${S.act}:${S.stop}`; S.stats.soldItems[k] = (S.stats.soldItems[k] ?? 0) + 1; }
    earn(S, v);
    if (hypeOn(S) && S.frenzy <= 0) {
        const day = today(S);
        S.hype = Math.min(1, S.hype + (perfect ? 4 : 1) * (has(S, "fast") ? 2 : 1) * (day?.hype ?? 1) / TUNE.hypeTaps);
    }
    const war = S.gary.war;
    if (war) { war.bar += 1 / war.need; if (war.bar >= 1) winWar(S); }
    return { value: v, streak: S.streak, finished, perfect };
}
export function frenzy(S) {
    if (S.hype < 1 || S.frenzy > 0) return false;
    S.hype = 0; S.frenzy = TUNE.frenzySecs * (has(S, "patience") ? 2 : 1); S.stats.frenzies++; emit(S, "frenzy"); return true;
}

// --- Customers ------------------------------------------------------------------------------------
function makeCustomer(S) {
    if (!S.kidDone) { S.cust = { kid: true, name: "A Small Kid", look: 17, line: KID.hi, offer: Math.max(0.5, 0), round: 0, stage: "open" }; return; }
    const list = CUSTOMERS[S.act], c = list[Math.floor(rnd(S) * list.length)];
    const offer = Math.max(baseRate(S) * TUNE.offerSecs, tapValue(S) * TUNE.offerTaps) * (0.8 + rnd(S) * 0.5);
    S.cust = { name: c.name, look: c.look, hi: c.hi, deal: c.deal, walk: c.walk, line: c.hi, offer, round: 0, stage: "open" };
}
export function counterChance(S) {
    const c = S.cust; if (!c) return 0;
    if (c.round === 0 && has(S, "tongue")) return 1;
    return [0.95, 0.7, 0.45, 0.2, 0.1][Math.min(c.round, 4)];
}
export function haggleDeal(S) {
    const c = S.cust; if (!c) return null;
    const pay = c.kid ? c.offer : c.offer * haggleMult(S);
    earn(S, pay);
    if (hypeOn(S) && S.frenzy <= 0) S.hype = Math.min(1, S.hype + 0.12);
    S.stats.haggles++;
    if (c.kid) S.kidDone = true;
    S.cust = null; S.custT = nextCust(S);
    return { pay, line: c.kid ? KID.first : c.deal };
}
export function haggleMult(S) { const day = today(S); return (has(S, "tongue") ? 3 : 1) * (sold(S, "gravity") ? 25 : 1) * (day?.haggle ?? 1); }
function nextCust(S) { const day = today(S); return (TUNE.custEvery * (0.75 + rnd(S) * 0.5)) / (has(S, "regulars") ? 2 : 1) / (day?.cust ?? 1); }
export function haggleCounter(S) {
    const c = S.cust; if (!c || c.kid) return null;
    if (rnd(S) < counterChance(S)) { c.offer *= 1.5 + rnd(S) * 0.35; c.round++; return { ok: true }; }
    S.stats.walked++; S.cust = null; S.custT = nextCust(S);
    return { ok: false, line: c.walk };
}

// --- Stray stickers -------------------------------------------------------------------------------
export function strayValue(S) { return Math.max(baseRate(S) * 40, tapValue(S) * 40) * (has(S, "lucky") ? 3 : 1); }
export function claimStray(S) {
    if (!S.stray) return 0;
    const v = strayValue(S); S.stray = false; S.stats.stickers++;
    S.strayT = TUNE.strayEvery * (0.8 + rnd(S) * 0.5) / (has(S, "lucky") ? 3 : 1);
    earn(S, v); if (hypeOn(S)) S.hype = Math.min(1, S.hype + 0.2);
    return v;
}

// --- Gary -----------------------------------------------------------------------------------------
export const garyActive = (S) => S.act === 2 && S.gary.wins < 5;
export const garyPayoff = (S) => Math.max(baseRate(S) * 90, act(S).U * 200);
export const garyReady = (S) => garyActive(S) && !S.gary.war && S.gary.cool <= 0;
export function startWar(S) {
    if (!garyReady(S)) return false;
    S.gary.war = { t: 8, bar: 0.3, need: 15 + 4 * S.gary.wins }; emit(S, "war"); return true;
}
function winWar(S) {
    S.gary.war = null; S.gary.wins++; S.gary.cool = S.gary.wins >= 5 ? 0 : 60; emit(S, "warwin", { wins: S.gary.wins });
}
export function payGary(S) {
    const c = garyPayoff(S);
    if (!garyActive(S) || S.gary.war || S.cash < c || S.gary.cool > 0) return false;
    S.cash -= c; winWar(S); return true;
}

// --- The hole -------------------------------------------------------------------------------------
export function feedGain(S, i) { const before = holeMult(S), f = S.fed[i]; S.fed[i] = Math.max(f, S.crew[i]); const after = holeMult(S); S.fed[i] = f; return after / before; }
export function feed(S, i) {
    if (!holeOn(S) || S.crew[i] <= S.fed[i] || S.crew[i] < 5) return false;
    S.fed[i] = S.crew[i]; S.crew[i] = 0; S.stats.fed++; emit(S, "feed", { i }); return true;
}

// --- Concepts -------------------------------------------------------------------------------------
export function nextConcept(S) { return CONCEPTS.find((c) => !S.concepts[c.id]) ?? null; }
export function listConcept(S) {
    const c = nextConcept(S);
    if (!c || S.act !== 5 || S.earnedAct < c.at) return false;
    S.concepts[c.id] = true; emit(S, "concept", { c });
    if (c.id === "money") { S.ended = true; S.finale = 1; emit(S, "finale"); }
    return true;
}

// --- Moving day ---------------------------------------------------------------------------------
export function bylawOffer(S) {
    if (S.offered) return S.offered;
    const left = BYLAWS.filter((b) => !S.bylaws.includes(b.id));
    const out = [];
    while (out.length < 3 && left.length) out.push(left.splice(Math.floor(rnd(S) * left.length), 1)[0].id);
    return (S.offered = out);
}
export function move(S, bylaw) {
    if (!S.ready || !act(S).move) return false;
    if (bylaw) S.bylaws.push(bylaw);
    S.act++; S.stats.moved++;
    S.cash = 0; S.earnedAct = 0; S.stop = 0; S.crew = [0, 0, 0, 0, 0]; S.ready = false; S.offered = null; S.hype = 0; S.frenzy = 0;
    S.fed = [0, 0, 0, 0, 0]; S.streak = 0; S.hits = 0; S.cust = null; S.custT = 15; S.perfect = 0;
    if (has(S, "start")) S.crew[0] = 25;
    emit(S, "moved", { act: S.act });
    return true;
}

// --- Time ---------------------------------------------------------------------------------------
export function tick(S, dt) {
    S.time += dt;
    const r = rate(S);
    if (r > 0) earn(S, r * dt);
    if (S.streakT > 0) { S.streakT -= dt; if (S.streakT <= 0) S.streak = 0; }
    if (S.frenzy > 0) { S.frenzy -= dt; if (S.frenzy <= 0) { S.frenzy = 0; emit(S, "frenzyEnd"); } }
    else if (hypeOn(S)) { const day = today(S); S.hype = Math.min(1, S.hype + TUNE.hypePassive * (day?.hype ?? 1) * dt); }
    if (orbitOn(S)) S.orbit = (S.orbit + (Math.PI * 2 * dt) / TUNE.orbitPeriod) % (Math.PI * 2);
    if (weekOn(S)) { const d0 = today(S); S.weekT += dt; const d1 = today(S); if (d1 !== d0) emit(S, "day", { day: d1 }); }
    if (!S.cust && !S.ended) { S.custT -= dt; if (S.custT <= 0) { makeCustomer(S); emit(S, "customer"); } }
    if (!S.stray && S.stop + S.act > 0) { S.strayT -= dt; if (S.strayT <= 0) { S.stray = true; emit(S, "stray"); } }
    if (S.gary.cool > 0) S.gary.cool -= dt;
    const w = S.gary.war;
    if (w) { w.t -= dt; w.bar = Math.max(0, w.bar - 0.035 * dt); if (w.t <= 0) { S.gary.war = null; S.gary.cool = 15; emit(S, "warlose"); } }
    if (has(S, "clerk")) for (const u of UPCACHE[S.act]) if (upVisible(S, u) && S.cash >= u.cost) buyUp(S, u);
    if (has(S, "intern")) { let best = -1, c = Infinity; for (let i = 0; i < 5; i++) { const k = crewCost(S, i); if (crewVisible(S, i) && k < c) { c = k; best = i; } } if (best >= 0 && S.cash >= c) buyCrew(S, best); }
}

/** Income while the page was closed. No frenzy and no day-of-week swings. */
export function away(S, secs) {
    const cap = (has(S, "lunch") ? 24 : TUNE.awayCapHours) * 3600, t = Math.min(secs, cap);
    const r = baseRate(S) / (today(S)?.crew ?? 1), pay = r * t * (has(S, "lunch") ? 1 : TUNE.awayRate);
    S.frenzy = 0; S.streak = 0;
    if (pay > 0) earn(S, pay);
    if (!S.cust && !S.ended) S.custT = Math.min(S.custT, 1);
    return { secs, counted: t, pay };
}

// --- Numbers ------------------------------------------------------------------------------------
export const FORMAT = { science: false, noSeven: false };
const trim = (x) => { const s = x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2); return s; };
function words(x) {
    if (x < 1000) return x >= 100 || Number.isInteger(x) ? String(Math.round(x)) : x.toFixed(x < 10 ? 2 : 1);
    if (x < 1e6) return Math.floor(x).toLocaleString("en-US");
    if (FORMAT.science) { const e = Math.floor(Math.log10(x)); return `${(x / 10 ** e).toFixed(2)}e${e}`; }
    let i = NUMBER_WORDS.length - 1;
    while (i > 0 && NUMBER_WORDS[i][0] > x * 1.0000001) i--;
    const [u, w] = NUMBER_WORDS[i], v = x / u;
    return `${v >= 999.5 ? v.toFixed(0) : trim(v)} ${w}`;
}
export function fmt(x) { const s = words(x); return FORMAT.noSeven ? s.replace(/7/g, "8") : s; }
export const money = (x) => `$${fmt(x)}`;
