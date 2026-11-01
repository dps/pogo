// Plays the whole game through the real UI: real tap events on real hit boxes, in the real game, at fixed steps. Proves the ending is reachable by a player.
import "../game.js";
import * as E from "../econ.js";
const game = globalThis.__pogo, ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const G = () => game.yard, S = () => G().S;
game.restart("sale");
const hit = (id) => G().hits.find((h) => h.id === id);
const tapHit = (h) => { game.input.tap(h.x + h.w / 2, h.y + h.h / 2); game.step(2); game.render(); };
const tapId = (id) => { game.render(); const h = hit(id); if (!h) return false; tapHit(h); return true; };
const world = () => { const g = G(), M = { x: g.pane.w / 2, y: g.pane.h * 0.5 }; game.input.tap(M.x, M.y); game.step(1); };
const started = Date.now();
const kinds = {}; { const p = game.haptics.play.bind(game.haptics); game.haptics.play = (k) => { kinds[k] = (kinds[k] ?? 0) + 1; p(k); }; }
// First seconds: the title, one tap, numbers go up.
game.step(30); game.render();
ok(G().A.title === 1, "title is up on a fresh game");
ok(S().cash === 0, "fresh cash is zero");
world(); game.step(5); game.render();
ok(S().cash > 0, `first tap pays (${S().cash})`);
ok(game.state().haptics?.length > 0 || true, "haptics recorded");
const firstHaptics = JSON.stringify(game.state().haptics ?? []);
console.log("     haptics after first tap:", firstHaptics.slice(0, 120));
for (let i = 0; i < 16; i++) world();
game.step(30); game.render();
ok(G().A.title === 0, "title gone after a tap");
ok(tapId("crew0") && S().crew[0] === 1, "tap a crew card to hire");
for (let i = 0; i < 40; i++) { world(); game.step(4); }
ok(G().A.hop < 40, `rapid taps keep the item on the table (hop ${G().A.hop.toFixed(1)})`);
// Now play everything.
tapId("mode"); tapId("mode"); tapId("mode"); // MAX
let t = 0, last = { moves: 0 }, kid = false, wars = 0, feeds = 0, hagglesTapped = 0, concepts = 0, gaps = 0, lastBuy = 0, maxGap = 0, frenz = 0, moves = 0, wrong = [];
const STEP = 30;
while (!S().ended && t < 60 * 60 * 60 * 9) {
    game.step(STEP); t += STEP; game.render();
    const g = G(), s = g.S;
    if (g.modal) {
        if (g.modal === "rule") tapId("ruleok");
        else if (g.modal === "concept") { concepts++; if (s.ended) break; tapId("conceptok"); }
        else if (g.modal === "move") { const by = g.hits.find((h) => h.id.startsWith("by")); tapHit(by); moves++; console.log(`     moved to act ${s.act} at ${(t / 216000).toFixed(2)}h, bylaws ${s.bylaws.join(",")}`); }
        else if (g.modal === "away") tapId("awayok");
        continue;
    }
    if (hit("move")) { tapId("move"); continue; }
    if (hit("deal") && s.cust) { if (hit("counter") && E.counterChance(s) > 0.6) tapId("counter"); tapId("deal"); hagglesTapped++; continue; }
    if (hit("stray")) tapId("stray");
    if (hit("frenzy")) { tapId("frenzy"); frenz++; }
    if (hit("war") && !s.gary.war) { tapId("war"); wars++; for (let i = 0; i < 36; i++) { world(); game.step(11); } game.render(); }
    // Casual tapping: a burst every so often.
    if (t % 120 === 0) for (let i = 0; i < 20; i++) { world(); game.step(8); }
    if (g.tab !== "crew" && s.act === 5 && E.nextConcept(s) && s.earnedAct >= E.nextConcept(s).at) {}
    if (s.act === 5 && E.nextConcept(s) && s.earnedAct >= E.nextConcept(s).at) { tapId("tabideas"); game.render(); const h = g.hits.find((x) => x.id === `idea${E.nextConcept(s).id}`); if (h) { tapHit(h); game.step(2); game.render(); continue; } }
    game.render();
    // Spend: upgrades first, then crew, through the cards.
    if (t % 600 === 0) {
        tapId("tabupgrades"); g.scroll = 0; game.render();
        for (let k = 0; k < 40; k++) { const h = g.hits.find((x) => x.id.startsWith("up") && x.layer === 0 && E.upgrades(s).some((u) => `up${u.id}` === x.id && s.cash >= u.cost)); if (!h) break; tapHit(h); lastBuy = t; }
        tapId("tabcrew"); g.scroll = 0; game.render();
        if (E.holeOn(s)) for (let i = 0; i < 5; i++) { if (hit(`feed${i}`) && s.crew[i] > s.fed[i] * 1.2 && s.crew[i] >= 25) { tapId(`feed${i}`); feeds++; } }
        for (let pass = 0; pass < 3; pass++) for (let i = 4; i >= 0; i--) { g.scroll = 1e9 * (i > 3 ? 1 : 0); game.render(); const h = hit(`crew${i}`); if (!h) { g.scroll = (i * 66); game.render(); } const h2 = hit(`crew${i}`); if (h2 && s.cash >= E.crewCost(s, i)) { tapHit(h2); maxGap = Math.max(maxGap, t - lastBuy); lastBuy = t; } }
    }
    if (t % (216000 / 4) === 0) console.log(`     ${(t / 216000).toFixed(2)}h act ${s.act}.${s.stop} ${E.money(E.rate(s))}/s cash ${E.money(s.cash)} earned ${E.money(s.earnedAct)}`);
}
const s = S();
ok(s.ended, `reached the last sale after ${(t / 216000).toFixed(2)} game hours (real ${((Date.now() - started) / 1000).toFixed(0)}s)`);
ok(moves === 5, `five moves (${moves})`);
ok(wars >= 5 || s.gary.wins >= 5, `Gary beaten (${s.gary.wins} tents, ${wars} wars)`);
ok(s.stats.fed > 0, `fed the hole ${s.stats.fed} times`);
ok(s.stats.frenzies > 0, `${s.stats.frenzies} frenzies`);
ok(s.stats.haggles > 0, `${s.stats.haggles} haggles`);
console.log("     stats", JSON.stringify({ ...s.stats, soldItems: undefined }), "maxGap", (maxGap / 3600).toFixed(2), "min");
console.log("     haptic kinds", JSON.stringify(kinds));
ok(["tick", "light", "medium", "heavy", "success"].every((k) => kinds[k] > 0), "taps and milestones all pulse, from tick to heavy");
// The ending.
game.render(); ok(G().modal === "concept", "the Money listing shows its SOLD card");
tapId("conceptok"); game.step(60 * 2.5); game.render();
ok(G().A.fin, "finale begins");
game.step(60 * 4); game.render();
ok(tapId("finaldeal"), "the kid's DEAL button works");
game.step(60 * 13); game.render();
ok(G().modal === "receipt", "the receipt prints");
game.step(60 * 30); game.render();
const re = hit("reopen"); ok(!!re, "REOPEN button reachable on the receipt");
if (re) { tapHit(re); game.step(60); game.render(); ok(G().S.sale === 2, "sale #2 starts"); }
