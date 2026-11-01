// Headless players. `newcomer` plays like someone on their first evening; `sharp` drafts, reads traits and positions.
// `focus` forces a sharp bot to commit to a trait: that is how the balance report isolates each trait.
import { PET, SHOP } from "./data.js";
import { at, boardCount, buy, canBuy, capFor, cardCost, fight, move, pets, reroll, rollCost, sell, settle, teamOf } from "./run.js";
import { rngOf, traitCounts } from "./sim.js";

const tanky = (p) => { const d = PET[p.id]; return !d.ranged && (d.hp >= d.atk * 2.3 || d.traits.includes("beef")); };
/** Tanks up front, ranged behind, Fluffs next to the biggest fighter. */
export function arrange(run) {
    const list = run.board.filter(Boolean).concat();
    const score = (p) => (tanky(p) ? 30 : 0) + (PET[p.id].ranged ? -30 : 0) + (PET[p.id].hp * p.star) / 6;
    list.sort((a, b) => score(b) - score(a));
    const n = list.length, front = list.slice(0, Math.min(4, Math.ceil(n * 0.6))), back = list.slice(front.length);
    const cells = Array(8).fill(null), order = [1, 2, 0, 3];
    front.forEach((p, i) => { cells[order[i]] = p; });
    back.forEach((p, i) => { cells[4 + order[i]] = p; });
    run.board = cells;
}
function chooseFocus(run, forced) {
    if (forced) return forced;
    const seen = {};
    for (const p of pets(run)) for (const t of PET[p.id].traits) seen[t] = (seen[t] ?? 0) + 2 + p.star;
    for (const c of run.shelf) if (c) for (const t of PET[c.id].traits) seen[t] = (seen[t] ?? 0) + 1;
    return Object.entries(seen).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2).map((x) => x[0]);
}
function valueOf(run, card, focus) {
    const d = PET[card.id];
    // Crates hide the pet: bots judge them by the hint trait alone, as a player must.
    if (SHOP[run.shop].blind) return 2.4 + (focus.includes(d.traits[0]) ? 3 : 0);
    let v = d.tier * 2 + (d.atk + d.hp / 2) / (d.tier + 1);
    const copies = pets(run).filter((p) => p.id === card.id && p.star === 1).length;
    v += copies * 9;
    for (const t of d.traits) if (focus.includes(t)) v += 7;
    const have = traitCounts(teamOf(run));
    for (const t of d.traits) { const c = have[t]?.count ?? 0; if (c % 2 === 1 && !pets(run).some((p) => p.id === card.id)) v += 4; }
    if (card.extra && focus.includes(card.extra)) v += 8;
    return v / Math.sqrt(cardCost(run, card));
}
function seatBench(run) {
    const cap = capFor(run.round, run.shop);
    for (let i = 0; i < run.bench.length; i++) {
        const p = run.bench[i]; if (!p) continue;
        if (boardCount(run) < cap) { const c = run.board.indexOf(null); if (c >= 0) { move(run, { zone: "bench", i }, { zone: "board", i: c }); continue; } }
        // Swap the weakest fighter out when the bench holds someone better.
        let worst = -1, ws = 1e9;
        run.board.forEach((q, c) => { if (q) { const v = PET[q.id].tier * q.star * q.star + q.atkB + q.hpB; if (v < ws) { ws = v; worst = c; } } });
        if (worst >= 0 && PET[p.id].tier * p.star * p.star + p.atkB + p.hpB > ws) move(run, { zone: "bench", i }, { zone: "board", i: worst });
    }
}
export function sharpTurn(run, opt = {}) {
    if (!run.botFocus && run.round >= 3) run.botFocus = chooseFocus(run, opt.focus);
    const focus = [].concat(run.botFocus ?? chooseFocus(run, opt.focus));
    const reserve = opt.reserve ?? 0;
    for (let spend = 0; spend < 30; spend++) {
        let best = -1, bv = opt.floor ?? 2.2;
        run.shelf.forEach((c, i) => { if (!c || !canBuy(run, i) || run.gold - cardCost(run, c) < reserve) return; const v = valueOf(run, c, focus); if (v > bv) { bv = v; best = i; } });
        if (best >= 0) { buy(run, best); continue; }
        const c = rollCost(run);
        if (run.gold >= c + 1 + reserve && run.rolls < 12) { if (reroll(run)) continue; }
        break;
    }
    // Sell the weakest off-plan bench pets for one last purchase when the bench is full.
    if (!run.bench.includes(null)) { const i = run.bench.findIndex((p) => p && !PET[p.id].traits.some((t) => focus.includes(t))); if (i >= 0) sell(run, { zone: "bench", i }); }
    seatBench(run); arrange(run);
}
export function newcomerTurn(run, rng) {
    // Buys what looks nice until the money runs out, rerolls now and then, leaves pets where they land.
    for (let n = 0; n < 12; n++) {
        const opts = run.shelf.map((c, i) => (c && canBuy(run, i) ? i : -1)).filter((i) => i >= 0);
        if (!opts.length) { if (run.gold >= 1 && rng.chance(45) && run.rolls < 2) { reroll(run); continue; } break; }
        buy(run, opts[rng.int(opts.length)]);
    }
    seatBench(run);
}
export function playRun(opt) {
    const { make, turn } = opt;
    const run = make(); let guard = 0;
    while (!run.over && guard++ < 30) {
        turn(run);
        const { res } = fight(run, opt.bank);
        opt.onFight?.(run, res);
        settle(run, res.winner);
    }
    return run;
}
export const newcomer = (seed) => { const r = rngOf(seed ^ 0x5151); return (run) => newcomerTurn(run, r); };
