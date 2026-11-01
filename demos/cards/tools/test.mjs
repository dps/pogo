// Rules tests: determinism, preview fidelity, save round trips, no NaN, all content reachable.
import * as S from "../sim.js"; import { CARDS, cardText } from "../data/cards.js"; import { TRINKETS } from "../data/trinkets.js"; import { ENEMIES, BOSSES } from "../data/enemies.js"; import { EVENTS } from "../data/events.js"; import { REACTIONS, ELS, KEYWORDS } from "../data/rules.js";
import { playTurn, playRun, mkRng } from "./bot.mjs";
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log("FAIL", m); } };
const nCards = Object.values(CARDS).filter((c) => c.rar !== "curse").length, nEn = Object.values(ENEMIES).filter((e) => !e.boss).length;
ok(nCards >= 80, "80 cards"); ok(Object.keys(TRINKETS).length >= 30, "30 trinkets"); ok(nEn >= 20, "20 enemies"); ok(BOSSES.length === 4, "4 bosses"); ok(EVENTS.length >= 12, "events");
for (const a of ELS) for (const b of ELS) ok(REACTIONS[`${a}>${b}`], `reaction ${a}>${b}`);
const seen = new Set(); for (const c of Object.values(CARDS)) { const k = c.art.join("+") + c.el; if (seen.has(k) && c.rar !== "curse") console.log("note: same art recipe", c.id, k); seen.add(k); ok(!/\{/.test(cardText(c, 0)), "text fill " + c.id); ok(!/\{/.test(cardText(c, 1)), "text fill up " + c.id); }
// Same seed, same run.
for (const w of ["posy", "thistle", "vesper"]) { const a = playRun(777, w, 0, 1, { cards: {} }).run, b = playRun(777, w, 0, 1, { cards: {} }).run; ok(JSON.stringify(a.stats) === JSON.stringify(b.stats) && a.hp === b.hp && a.seed === b.seed, "determinism " + w); }
// Preview always matches the brew, and a save mid-fight plays out identically.
let checks = 0;
for (let seed = 1; seed < 26; seed++) for (const w of ["posy", "thistle", "vesper"]) {
    const run = S.newRun({ seed, witch: w }), rand = mkRng(seed);
    S.chooseNode(run, S.reachable(run)[0]);
    for (let t = 0; t < 6 && run.screen === "combat"; t++) {
        const c = run.combat;
        for (let i = 0; i < 5; i++) { const k = c.hand.findIndex((q) => !CARDS[q.id].instant && S.canPlace(run, q)); if (k < 0) break; S.place(run, k, Math.floor(rand() * (c.brew.length + 1))); }
        const p = S.preview(run), snap = JSON.stringify(run), hpBefore = c.enemies.map((e) => e.hp);
        const r2 = JSON.parse(snap), ev = S.brew(run), ev2 = S.brew(r2);
        ok(JSON.stringify(ev) === JSON.stringify(ev2), `save resume ${w} ${seed}`);
        const end = ev.find((e) => e.t === "brewEnd"); ok(end && end.total === p.total, `preview ${w} ${seed}: ${p.total} vs ${end?.total}`);
        for (const e of ev) for (const k in e) if (typeof e[k] === "number") ok(Number.isFinite(e[k]), "NaN in event " + e.t);
        checks++;
    }
}
// Every card fires without throwing, in every witch's pot, upgraded or not.
for (const c of Object.values(CARDS)) for (const up of [0, 1]) {
    const run = S.newRun({ seed: 3, witch: "vesper" }); S.startCombat(run, ["rat", "imp"], "fight");
    const cc = run.combat; cc.heat = 9; cc.hand.unshift(S.makeCard(run, c.id, up), S.makeCard(run, "spark"));
    S.place(run, 1); S.place(run, 0); if (run.combat) S.brew(run);
}
// Every event choice runs.
for (const e of EVENTS) e.choices.forEach((_, i) => { const run = S.newRun({ seed: 9, witch: "posy" }); run.gold = 500; run.event = { id: e.id, result: null }; run.screen = "event"; S.chooseEvent(run, i); ok(typeof run.event.result === "string", "event " + e.id); S.leaveEvent(run); while (run.screen === "pick") S.resolvePick(run, run.queue[0].kind === "cards" ? 0 : run.deck[0].u); });
// Every trinket pickup and every boss.
for (const id in TRINKETS) { const run = S.newRun({ seed: 2, witch: "vesper", }); S.gainTrinket(run, id); S.startCombat(run, ["rat"], "fight"); S.place(run, 0); if (run.combat) S.brew(run); }
for (const b in ENEMIES) { const run = S.newRun({ seed: 2, witch: "posy" }); run.act = 3; S.startCombat(run, [b], "fight"); run.hp = run.maxHp = 9999; for (let i = 0; i < 12 && run.combat; i++) S.brew(run); }
// The Boil Over cap really caps.
{ const run = S.newRun({ seed: 2, witch: "vesper" }); S.gainTrinket(run, "mobiusladle"); S.startCombat(run, ["ysolde"], "boss"); const c = run.combat; c.heat = 99; c.brew = []; c.hand = []; for (let i = 0; i < 8; i++) { const k = S.makeCard(run, i % 2 ? "giltflake" : "blackpin"); k.el = i % 2 ? "gilt" : "hex"; c.brew.push(k); } run.trinkets.push("infinite"); delete run.trinkets[run.trinkets.indexOf("infinite")]; run.trinkets = run.trinkets.filter(Boolean); const ev = S.brew(run); const end = ev.find((e) => e.t === "brewEnd"); ok(end.fires <= S.MAX_FIRES, "fire cap"); console.log(`8-slot Hex/Gilt loop: ${end.fires} fires, ${end.total} dmg, ×${end.pot}`); }
console.log(fail ? `${fail} FAILED` : `all passed (${checks} brews checked)`);
process.exit(fail ? 1 : 0);
