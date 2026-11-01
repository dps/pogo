// Pacing simulator. Drives the real econ.js as different kinds of player and reports where time goes.
import * as E from "../econ.js";
import { ACTS, BYLAWS } from "../data.js";
const { TUNE } = E;
const PROFILES = {
    active: { tapsPerSec: 6, tapDuty: 1, look: 3, label: "keen player: taps constantly, shops every 3s" },
    casual: { tapsPerSec: 3, tapDuty: 0.35, look: 12, label: "casual: taps in bursts, shops every 12s" },
    relaxed: { tapsPerSec: 2.5, tapDuty: 0.15, look: 30, label: "second screen: rare bursts, shops every 30s" },
    idle: { tapsPerSec: 0, tapDuty: 0, look: 60, label: "never taps except to start, shops every 60s" },
};
const pickBylaw = (S, offer, style) => {
    const pref = style === "worst" ? ["lucky", "regulars", "patience", "lunch", "tongue", "laminate", "clerk", "start", "fast", "intern", "hands", "bulk"]
        : ["bulk", "laminate", "hands", "fast", "clerk", "intern", "tongue", "start", "regulars", "patience", "lucky", "lunch"];
    return [...offer].sort((a, b) => pref.indexOf(a) - pref.indexOf(b))[0];
};
function payback(S, i) { const before = E.baseRate(S); S.crew[i]++; const after = E.baseRate(S); S.crew[i]--; return E.crewCost(S, i) / Math.max(after - before, 1e-300); }
export function run(name, { seed = 1, style = "best", verbose = false, hourLimit = 30, only = null, bylaws = [] } = {}) {
    const P = PROFILES[name], S = E.newState({ seed, bylaws: [...bylaws] }), dt = 0.1;
    if (only !== null) { S.act = only; S.kidDone = true; }
    let rng = seed * 7919 + 1; const r = () => (rng = (rng * 16807) % 2147483647) / 2147483647;
    const timeline = []; let novelty = 0, lastNew = 0, t = 0, nextLook = 0, tapCredit = 0, burst = 0, last = 0, gaps = [], maxGap = 0, gapAt = 0, firstBuy = null, purchases = 0;
    const acts = [], marks = []; let actT = 0;
    const bought = () => { if (firstBuy === null) firstBuy = t; const g = t - last; if (g > maxGap) { maxGap = g; gapAt = S.act + ":" + S.stop; } gaps.push(g); last = t; purchases++; };
    const shop = () => {
        // Rule actions.
        if (S.cust) {
            if (S.cust.kid) E.haggleDeal(S);
            else { if (name !== "idle" && E.counterChance(S) > 0.6) E.haggleCounter(S); if (S.cust) { E.haggleDeal(S); } }
        }
        if (S.stray) E.claimStray(S);
        if (S.hype >= 1) E.frenzy(S);
        if (E.garyReady(S)) {
            if (name === "idle" || name === "relaxed") { if (E.payGary(S)) bought(); }
            else E.startWar(S);
        }
        if (E.holeOn(S) && S.act >= 4) {
            for (let i = 0; i < 4; i++) {
                const best = E.crewCost(S, 4) ;
                if (S.crew[i] >= 5 && S.crew[i] > S.fed[i] * 1.15 && E.feedGain(S, i) > 1.5 && S.crew[i] * 1 >= 25) { if (E.feed(S, i)) bought(); }
            }
        }
        if (S.act === 5) while (E.listConcept(S)) bought();
        if (S.ended) return;
        if (S.ready) { const by = E.bylawOffer(S); E.move(S, pickBylaw(S, by, style)); acts.push(t - actT); actT = t; last = t; if (verbose) console.log("moved", t / 60 | 0, "min", E.money(S.earnedTotal)); return; }
        for (let guard = 0; guard < 400; guard++) {
            let best = null, score = Infinity;
            for (const u of E.upgrades(S)) if (E.upVisible(S, u)) { const s = u.cost / Math.max(E.baseRate(S) + E.tapValue(S), 1e-300) / (u.mult - 1 + 1) ; if (u.cost < score * 1e30 && S.cash >= u.cost && s < score) { score = s; best = u; } }
            let crew = -1; let pb = Infinity;
            for (let i = 0; i < 5; i++) if (E.crewVisible(S, i)) { const p = payback(S, i); if (p < pb) { pb = p; crew = i; } }
            if (best) { E.buyUp(S, best); bought(); continue; }
            if (crew >= 0 && S.cash >= E.crewCost(S, crew)) { E.buyCrew(S, crew); bought(); continue; }
            break;
        }
    };
    while (!S.ended && t < hourLimit * 3600 && !(only !== null && S.act !== only)) {
        t += dt; E.tick(S, dt); for (const ev of S.events) if (["stop", "moved", "concept"].includes(ev.t)) { novelty = Math.max(novelty, t - lastNew); lastNew = t; timeline.push(`${(t / 60).toFixed(0)}:${ev.t === "stop" ? `s${S.act}.${ev.stop}` : ev.t === "moved" ? `MOVE${ev.act}` : ev.c.id}`); } S.events.length = 0;
        const tapping = S.gary.war ? true : (P.tapDuty > 0 && ((t % 60) / 60 < P.tapDuty));
        if (tapping || t < 20) { tapCredit += (S.gary.war ? 6 : P.tapsPerSec || 3) * dt; while (tapCredit >= 1) { tapCredit--; if (S.act >= 3 && name !== "idle" && r() < 0.6) { const was = S.orbit; S.orbit = 0; E.tap(S); S.orbit = was; } else E.tap(S); } }
        if (S.gary.war && name !== "active" && name !== "casual") {}
        if (t >= nextLook) { nextLook = t + P.look; shop(); }
        if (Math.floor(t) % 300 === 0 && Math.abs(t - Math.round(t)) < dt / 2) marks.push(`${(t / 60) | 0}m a${S.act}.${S.stop} ${E.money(E.rate(S))}/s`);
    }
    acts.push(t - actT);
    gaps.sort((a, b) => a - b);
    return { name, done: S.ended, hours: t / 3600, acts: acts.map((a) => Math.round(a / 60)), firstBuy, maxGapMin: maxGap / 60, gapAt, p95: gaps[Math.floor(gaps.length * 0.95)], purchases, S, marks, timeline, novelty: novelty / 60 };
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const only = process.argv[2], bad = [];
    for (const name of only && PROFILES[only] ? [only] : Object.keys(PROFILES)) for (const style of ["best", "worst"]) {
        const R = run(name, { style, verbose: false, hourLimit: name === "idle" ? 30 : 12 });
        console.log(`${name.padEnd(8)} ${style.padEnd(5)} done=${R.done} ${R.hours.toFixed(2)}h acts(min)=${R.acts.join("/")} firstBuy=${R.firstBuy?.toFixed(1)}s maxGap=${R.maxGapMin.toFixed(2)}min at ${R.gapAt} buys=${R.purchases} newThingGap=${R.novelty.toFixed(1)}min rate=${E.money(E.rate(R.S))}/s earned=${E.money(R.S.earnedTotal)}`);
        if (process.argv.includes("-v")) console.log(R.marks.join("\n"));
        if (!R.done) bad.push(`${name}/${style} never finished`);
        if (["active", "casual"].includes(name) && R.done && (R.hours < 1.2 || R.hours > 7)) bad.push(`${name}/${style} took ${R.hours.toFixed(2)}h`);
        if (name !== "idle" && R.maxGapMin > 5) bad.push(`${name}/${style} dead stretch of ${R.maxGapMin.toFixed(1)}min at ${R.gapAt}`);
    }
    console.log(bad.length ? `FAIL\n${bad.join("\n")}` : "PACING OK");
    process.exit(bad.length ? 1 : 0);
}
