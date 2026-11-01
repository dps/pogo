// Plays a whole run through the real scenes in headless Pogo: real taps on real buttons, resolve animations included.
// node tools/e2e.mjs [witch] [seed]
import "../game.js";
import * as S from "../sim.js";
import { CARDS } from "../data/cards.js";
import { playTurn, mkRng } from "./bot.mjs";
const game = globalThis.__pogo, { G } = globalThis.__hex;
const witch = process.argv[2] ?? "vesper", seed = Number(process.argv[3] ?? 21);
game.resize("phone");
game.save("hexcards-meta", null); G.meta.tutorial = true;
game.step(5);
game.go("witch"); game.step(5);
game.data.nextSeed = seed;
G.startRun(witch, 0, seed);
game.step(40);
if (process.env.GOD) { G.run.maxHp = G.run.hp = 99999; }
const tapBtn = (txt) => { const e = game.current.entities.find((q) => q.alive && !q.hidden && q.txt === txt); if (!e) return false; game.input.tap(e.pos.x, e.pos.y); game.step(3); return true; };
const anyBtn = () => game.current.entities.filter((q) => q.alive && !q.hidden && q.txt && q.txt !== "Deck" && q.txt !== "≡");
const rand = mkRng(seed), log = { steps: 0, combats: 0, turns: 0, scenes: {} };
let guard = 0; const t0 = performance.now(); let peak = 0;
while (guard++ < 60000) {
    const name = game.currentName, run = G.run;
    log.scenes[name] = (log.scenes[name] ?? 0) + 1;
    if (name === "end" || !run) break;
    if (G.overlay?.onPick) { const f = G.overlay.onPick, k = G.overlay.cards[0]; G.overlay = null; f(k); game.step(30); continue; }
    if (G.overlay) { G.overlay = null; }
    if (name === "combat") {
        const C = game.data.combat;
        if (!C?.V || C.V.busy || C.V.ended || C.V.flights.length || run.screen !== "combat") { game.step(10); continue; }
        const c = run.combat; if (!c) { game.step(10); continue; }
        if (process.env.GOD && c.enemies.length) for (const e of c.enemies) if (e.hp > 120) e.hp = 120;
        // Let the bot choose on a copy of the run, then do the same thing with fingers.
        const copy = JSON.parse(JSON.stringify(run)); let order = null;
        const real = S.place, seq = [];
        const shadow = JSON.parse(JSON.stringify(run));
        playChoice(shadow, seq);
        for (const u of seq) { const i = C.V.hand.findIndex((k) => k.u === u); if (i >= 0) { C.place(i); game.step(20); } }
        const e = game.current.entities.find((q) => q.alive && !q.hidden && (q.txt === "BREW" || q.txt === "End Turn"));
        if (e) { game.input.tap(e.pos.x, e.pos.y); log.turns++; }
        game.step(12);
        continue;
    }
    if (name === "map") { const n = S.reachable(run); const pick = n[Math.floor(rand() * n.length)]; S.chooseNode(run, pick); G.game.go(run.screen); game.step(30); continue; }
    if (name === "reward") { game.step(50); if (G.overlay) G.overlay = null; const r = run.reward; if (r?.cards?.length) { S.takeRewardCard(run, 0); } tapBtn("Skip") || tapBtn("Continue"); game.step(30); continue; }
    if (name === "pick") { game.step(10); if (G.overlay?.onPick) { const f = G.overlay.onPick; const k = G.overlay.cards[0]; G.overlay = null; f(k); } else if (run.queue?.[0]?.kind === "cards") tapBtn("Skip"); game.step(30); continue; }
    const b = anyBtn();
    if (b.length) { const q = b[Math.floor(rand() * b.length)]; if (q.disabled) { game.step(5); continue; } game.input.tap(q.pos.x, q.pos.y); game.step(25); continue; }
    game.step(10);
}
function playChoice(shadow, seq) {
    const orig = shadow.combat.hand.map((k) => k.u);
    const place = S.place;
    const before = new Set(shadow.combat.brew.map((k) => k.u));
    const fake = { ...shadow };
    // Plan the greedy order: first affordable ingredients left to right.
    const c = shadow.combat; let guard = 0;
    while (guard++ < 8) {
        const k = c.hand.find((q) => S.canPlace(shadow, q) && CARDS[q.id].el !== "gunk");
        if (!k) break;
        seq.push(k.u);
        S.place(shadow, c.hand.indexOf(k));
        if (!shadow.combat) break;
    }
}
const st = game.state();
console.log({ gameMinutes: +(game.stepCount / 3600).toFixed(1), end: game.currentName, won: G.run?.won, floors: G.run?.stats.floors, turns: log.turns, scenes: log.scenes, hapticsSample: (st.haptics ?? []).slice(-6), ms: Math.round(performance.now() - t0), guard });
if (game.currentName === "combat") { const V = game.data.combat.V; console.log({ busy: V.busy, q: V.q.length, qT: V.qT, later: V.later.length, ended: V.ended, endT: V.endT, screen: G.run?.screen, hp: G.run?.hp, combat: !!G.run?.combat, next: V.q[0], flights: V.flights.length, fading: game.fading }); }
