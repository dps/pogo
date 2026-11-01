// Balance bot: plays whole runs through sim.js with no rendering.
// node tools/bot.mjs [runs] [witch|all] [asc] [skill 0..1] [--cards]
import { CARDS, cardCost } from "../data/cards.js";
import * as S from "../sim.js";
import { TRINKETS } from "../data/trinkets.js";
import { ENEMIES } from "../data/enemies.js";

export function mkRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function score(run, p) {
    const c = run.combat, inc = S.incoming(run);
    let v = 0;
    const alive0 = c.enemies.filter((e) => e.hp > 0);
    let dmgIn = 0;
    p.enemiesAfter.forEach((e) => {
        if (e.hp > 0) {
            const d = S.intentDamage(run, { ...c }, e) * (S.moveOf(e)?.hits ?? 1);
            dmgIn += (e.st.chill > 0 && !(c.enemies.find((o) => o.id === e.id)?.st.chill > 0)) ? d * 0.75 : d;
        }
    });
    const unblocked = Math.max(0, dmgIn - p.wardAfter - 0);
    const hpFrac = run.hp / run.maxHp;
    const totalHp = alive0.reduce((n, e) => n + e.hp, 0);
    const dealt = p.dmgTo.reduce((n, d) => n + d, 0);
    v += dealt * 1.0;
    v += p.kills * 14;
    v -= unblocked * (2.2 - hpFrac * 1.3);
    if (unblocked >= run.hp) v -= 500;
    p.st.forEach((st, i) => { if (p.hp[i] > 0) v += (st.burn ?? 0) * 1.6 + Math.min(p.hp[i], st.doom ?? 0) * 0.45 + (st.hex ?? 0) * 2 + (st.chill ?? 0) * 2; });
    v += Math.min(p.heal, run.maxHp - run.hp) * 1.6;
    v += p.gold * 0.3;
    if (p.kills >= alive0.length) v += 400;
    return v + (dealt >= totalHp ? 200 : 0);
}
/** Beam search over placements. skill below 1 adds noise and narrows the search, like a person. */
export function playTurn(run, rand, skill) {
    const beam = skill >= 0.95 ? 6 : skill >= 0.6 ? 3 : 1;
    for (let guard = 0; guard < 12; guard++) {
        const c = run.combat;
        if (!c || c.over) return;
        // Target the enemy most worth killing.
        let best = -1, bv = 1e9;
        c.enemies.forEach((e, i) => { if (e.hp > 0 && e.hp < bv) { bv = e.hp; best = i; } });
        c.target = Math.max(0, best);
        // Cast free-to-keep Instants first.
        const gunks = [...c.hand, ...c.brew].filter((k) => CARDS[k.id].el === "gunk").length;
        const inst = c.hand.findIndex((k) => CARDS[k.id].instant && S.canPlace(run, k) && (k.id !== "cleanser" || gunks > 0) && cardCost(CARDS[k.id], k.up) <= 1);
        if (inst >= 0 && rand() < 0.5 + skill / 2) { S.place(run, inst); continue; }
        // Skim stuck gunk if it splits things and Heat allows.
        const stuck = c.brew.findIndex((t) => t.stuck);
        if (stuck >= 0 && c.heat >= 2) { S.unplace(run, stuck); continue; }
        break;
    }
    const c = run.combat;
    if (!c || c.over) return;
    const snapshot = (r) => JSON.stringify(r.combat);
    let frontier = [{ seq: [], v: score(run, S.preview(run)) }];
    let bestSeq = frontier[0];
    const base = JSON.stringify(c), gold = run.gold;
    for (let depth = 0; depth < 8; depth++) {
        const nextF = [];
        for (const f of frontier) {
            run.combat = JSON.parse(base);
            for (const [h, p] of f.seq) S.place(run, h, p);
            const cc = run.combat, seen = new Set();
            for (let h = 0; h < cc.hand.length; h++) {
                const k = cc.hand[h], d = CARDS[k.id];
                if (d.instant || d.el === "gunk" || seen.has(k.id + k.up)) continue;
                seen.add(k.id + k.up);
                if (!S.canPlace(run, k)) continue;
                const n = cc.brew.length;
                const spots = n <= 1 ? [n] : beam > 1 ? [...new Set([n, 0, n - 1])] : [n];
                for (const p of spots) {
                    const seq = [...f.seq, [h, p]];
                    run.combat = JSON.parse(JSON.stringify(cc));
                    S.place(run, h, p);
                    const v = score(run, S.preview(run)) * (1 + (1 - skill) * 0.6 * (rand() - 0.5)) + (1 - skill) * 6 * rand();
                    nextF.push({ seq, v });
                    run.combat = cc;
                }
            }
        }
        if (!nextF.length) break;
        nextF.sort((a, b) => b.v - a.v);
        frontier = nextF.slice(0, beam);
        if (frontier[0].v > bestSeq.v) bestSeq = frontier[0];
    }
    run.combat = JSON.parse(base); run.gold = gold;
    for (const [h, p] of bestSeq.seq) S.place(run, h, p);
    if (run.combat && !run.combat.over) S.brew(run);
}
const CARD_VALUE = (run, k) => {
    const d = CARDS[k.id], w = run.witch, els = { posy: ["ember", "brine", "gilt"], thistle: ["moss", "rime", "hex"], vesper: ["hex", "gilt", "brine"] }[w];
    let v = { common: 1, uncommon: 1.5, rare: 2.3, starter: 0.5, curse: -3 }[d.rar] ?? 0;
    if (els.includes(d.el)) v += 0.7;
    if (k.up) v += 0.3;
    return v;
};
function decide(run, rand, skill, log) {
    switch (run.screen) {
        case "combat": playTurn(run, rand, skill); return;
        case "reward": {
            const r = run.reward;
            if (r.cards) {
                let best = -1, bv = run.deck.length > 22 ? 2.6 : 1.1;
                r.cards.forEach((k, i) => { const v = CARD_VALUE(run, k) + rand() * 0.8 * (1.4 - skill); if (v > bv) { bv = v; best = i; } });
                r.cards.forEach((k, i) => { const s = log.cards[k.id] ??= { offered: 0, taken: 0, wins: 0, runs: 0 }; s.offered++; if (i === best) s.taken++; });
                if (best >= 0) S.takeRewardCard(run, best);
            }
            S.leaveReward(run);
            return;
        }
        case "bossTrinket": S.pickBossTrinket(run, run.bossPick?.length ? Math.floor(rand() * run.bossPick.length) : null); return;
        case "treasure": S.leaveReward(run); run.screen = "map"; return;
        case "rest": {
            if (S.canRest(run) && run.hp / run.maxHp < 0.62) S.rest(run);
            else { const l = S.upgradable(run); if (l.length) { l.sort((a, b) => CARD_VALUE(run, b) - CARD_VALUE(run, a)); S.refine(run, l[0].u); } else if (S.canRest(run)) S.rest(run); else run.screen = "map"; }
            return;
        }
        case "shop": {
            const sh = run.shop;
            for (let i = 0; i < sh.trinkets.length; i++) S.buyTrinket(run, i);
            const worst = run.deck.filter((k) => CARDS[k.id].rar === "curse" || CARDS[k.id].rar === "starter")[0];
            if (worst) S.buyRemove(run, worst.u);
            sh.cards.map((k, i) => [CARD_VALUE(run, k), i]).sort((a, b) => b[0] - a[0]).slice(0, 2).forEach(([v, i]) => { if (v > 2) S.buyCard(run, i); });
            S.leaveShop(run);
            return;
        }
        case "event": {
            const e = S.eventDef(run);
            if (run.event.result == null) {
                const ok = e.choices.map((c, i) => [c, i]).filter(([c]) => !c.can || c.can(run));
                S.chooseEvent(run, ok[Math.floor(rand() * ok.length)][1]);
            } else S.leaveEvent(run);
            return;
        }
        case "pick": {
            const p = run.queue[0];
            if (p.kind === "cards") S.resolvePick(run, 0);
            else if (p.kind === "remove") { const w = [...run.deck].sort((a, b) => CARD_VALUE(run, a) - CARD_VALUE(run, b))[0]; S.resolvePick(run, w?.u); }
            else { const l = S.upgradable(run); S.resolvePick(run, l[0]?.u); }
            return;
        }
        case "map": {
            const opts = S.reachable(run);
            const w = (n) => {
                const low = run.hp / run.maxHp < 0.45;
                return ({ fight: low ? 1 : 3, elite: low ? -2 : run.act === 0 && run.floor < 3 ? 0 : 3, rest: low ? 6 : 1, shop: run.gold > 150 ? 4 : 1, event: 2, treasure: 5, boss: 1 })[n.type] + rand() * (2.2 - skill);
            };
            const n = [...opts].sort((a, b) => w(b) - w(a))[0];
            S.chooseNode(run, n);
            return;
        }
    }
}
export function playRun(seed, witch, asc, skill, log, tier = 99) {
    const run = S.newRun({ seed, witch, asc, tier });
    const rand = mkRng(seed * 31 + 7);
    let turns = 0, screens = 0, guard = 0;
    while (run.screen !== "end" && guard++ < 6000) {
        if (run.screen === "combat") turns++; else screens++;
        decide(run, rand, skill, log);
    }
    return { run, turns, screens, stuck: run.screen !== "end" };
}
if (process.argv[1]?.endsWith("bot.mjs")) {
    const N = Number(process.argv[2] ?? 40), which = process.argv[3] ?? "all", asc = Number(process.argv[4] ?? 0), skill = Number(process.argv[5] ?? 1), showCards = process.argv.includes("--cards");
    const log = { cards: {} };
    const witches = which === "all" ? ["posy", "thistle", "vesper"] : [which];
    const perCard = {}, deaths = {}, bestDmg = [], turnsAll = [];
    for (const w of witches) {
        let bestRec = null, wins = 0, floors = 0, turns = 0, stuck = 0, nodes = 0, fires = 0, big = 0, bestDmgW = 0; const t0 = performance.now(); const byAct = [0, 0, 0, 0, 0];
        for (let i = 0; i < N; i++) {
            const r = playRun(i * 7919 + 13, w, asc, skill, log);
            wins += r.run.won ? 1 : 0; floors += r.run.stats.floors; turns += r.turns; nodes += r.screens; stuck += r.stuck ? 1 : 0; fires = Math.max(fires, r.run.stats.maxFires);
            byAct[r.run.won ? 4 : r.run.act]++;
            bestDmgW = Math.max(bestDmgW, r.run.stats.best.dmg);
            if (r.run.stats.best.dmg >= 500) big++;
            if (r.run.stats.best.dmg > bestDmgW * 0.999) bestRec = r.run.stats.best;
            if (!r.run.won) { const k = r.run.lastEnc ?? "?"; const key = `${r.run.act}:${r.run.pos ? "" : ""}${(r.run.floor >= 8 ? "boss" : k)}`; deaths[key] = (deaths[key] ?? 0) + 1; }
            for (const k of r.run.deck) { const s = perCard[k.id] ??= { n: 0, wins: 0 }; s.n++; s.wins += r.run.won ? 1 : 0; }
            for (const id in r.run.stats.cards) { const s = perCard[id] ??= { n: 0, wins: 0 }; s.fires = (s.fires ?? 0) + r.run.stats.cards[id].fires; s.dmg = (s.dmg ?? 0) + r.run.stats.cards[id].dmg; }
            for (const id of r.run.trinkets) { const s = perCard["T:" + id] ??= { n: 0, wins: 0 }; s.n++; s.wins += r.run.won ? 1 : 0; }
        }
        console.log(`${w.padEnd(8)} A${asc} skill ${skill}: win ${(wins / N * 100).toFixed(0)}%  died in act [${byAct.slice(0, 4).join(" ")}] won ${byAct[4]}  avg floor ${(floors / N).toFixed(1)}  turns ${(turns / N).toFixed(0)}  nodes ${(nodes / N).toFixed(0)}  stuck ${stuck}  maxFires ${fires}  bestDmg ${bestDmgW}  500+brews ${big}  ${((performance.now() - t0) / N).toFixed(0)} ms/run`);
        if (showCards && bestRec) console.log("  best:", bestRec.recipe.join(","), bestRec.dmg, "fires", bestRec.fires, "pot", bestRec.pot);
    }
    console.log("deaths:", Object.entries(deaths).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k}=${v}`).join(" "));
    if (showCards) {
        const rows = Object.entries(perCard).filter(([k]) => !k.startsWith("T:")).map(([k, s]) => ({ id: k, n: s.n, wr: s.wins / Math.max(1, s.n), f: s.fires ?? 0, dpf: (s.dmg ?? 0) / Math.max(1, s.fires ?? 1), off: log.cards[k]?.offered ?? 0, tk: log.cards[k]?.taken ?? 0 }));
        rows.sort((a, b) => b.dpf - a.dpf);
        console.log("top dmg/fire:", rows.slice(0, 12).map((r) => `${r.id}:${r.dpf.toFixed(0)}`).join(" "));
        const inDeck = rows.filter((r) => r.n >= N * witches.length * 0.05).sort((a, b) => b.wr - a.wr);
        console.log("best win%:", inDeck.slice(0, 12).map((r) => `${r.id}:${(r.wr * 100).toFixed(0)}(${r.n})`).join(" "));
        console.log("worst win%:", inDeck.slice(-12).map((r) => `${r.id}:${(r.wr * 100).toFixed(0)}(${r.n})`).join(" "));
        const all = Object.values(CARDS).filter((c) => ["common", "uncommon", "rare"].includes(c.rar));
        const never = all.filter((c) => !perCard[c.id] || !perCard[c.id].fires);
        console.log("never fired:", never.map((c) => c.id).join(" "));
        const trs = Object.entries(perCard).filter(([k]) => k.startsWith("T:")).map(([k, s]) => [k.slice(2), s.wins / s.n, s.n]).sort((a, b) => b[1] - a[1]);
        console.log("trinket win%:", trs.slice(0, 10).map(([k, w, n]) => `${k}:${(w * 100).toFixed(0)}(${n})`).join(" "));
    }
}
