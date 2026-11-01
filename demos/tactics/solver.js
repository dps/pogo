// A planner that plays by the same rules as the player. The bots use it to prove every battle winnable, and the
// roguelike uses a small version of it so it never deals an unwinnable map.
import { ACTS, DIRS, N, T, actTargets, applyAct, applyMove, at, canAct, clone, endTurn, forecast, foes, idx, inB, moveTiles, pigeons } from "./sim.js";
import { PIGEONS } from "./data.js";

const hash = (s) => {
    let h = s.round + "|" + s.tiles.join("") + "|" + s.perchScore + "|" + s.crumbs.length;
    for (const u of s.units) if (u.hp > 0) h += `,${u.id}:${u.x}${u.y}${u.hp}${u.sh}${u.moved ? 1 : 0}${u.acted ? 1 : 0}${u.intent ? 1 : 0}`;
    return h;
};

/** How good a position looks, judged after the enemy's shown attacks have landed. */
export function evaluate(s0, tune) {
    const s = s0.over || tune?.blind ? s0 : forecast(s0);
    const m = s.m, roundsLeft = m.rounds - s.round;
    if (s.over === "win") return 1e6 - s.round * 1000 + hpScore(s);
    if (s.over === "lose") return -1e6 + hpScore(s) + (s.round * 1000);
    let v = hpScore(s);
    if (m.win === "rout" || m.win === "boss") { if (roundsLeft <= 2) v -= foeHp(s) * 12; }
    if (m.win === "boss") { const b = s.units.find((u) => u.boss && u.hp > 0); if (b) v -= b.hp * 14; }
    if (m.win === "escort") {
        const r = s.units.find((u) => u.npc), ex = s.exit % N, ey = Math.floor(s.exit / N);
        if (r) v -= (Math.abs(r.x - ex) + Math.abs(r.y - ey)) * 16;
    }
    if (m.win === "perch") {
        v += s.perchScore * 40;
        for (const i of s.perch) { const u = at(s, i % N, Math.floor(i / N)); if (u && u.side === 0) v += 28; else if (!u) v -= nearest(s, i) * 2; }
    }
    if (m.win === "collect") {
        v -= s.crumbs.length * 26;
        for (const i of s.crumbs) v -= nearest(s, i) * 3;
    }
    if (m.win === "survive" || m.win === "rout") for (const p of pigeons(s)) { for (const f of foes(s)) if (Math.abs(p.x - f.x) + Math.abs(p.y - f.y) <= 1) v += 0.2; }
    if (tune?.noDamage) v -= s.stats.damage * 30 + s.stats.lost * 60;
    if (tune?.noBag) v -= s.stats.bagHits * 40;
    if (tune?.noise) v += tune.rng() * tune.noise;   // a sloppy player: can't quite tell good moves from nearly good ones
    return v;
}
function nearest(s, i) {
    const x = i % N, y = Math.floor(i / N); let best = 12;
    for (const p of pigeons(s)) best = Math.min(best, Math.abs(p.x - x) + Math.abs(p.y - y));
    return best;
}
function foeHp(s) { let h = 0; for (const f of foes(s)) h += f.hp; return h; }
function hpScore(s) {
    let v = 0;
    for (const u of s.units) {
        if (u.hp <= 0) { if (u.side === 0) v -= 14; continue; }
        if (u.side === 0) v += u.hp * 4 + 10 + (u.sh ? 2 : 0);
        else if (u.side === 1 && !u.env) v -= u.hp * 5 + 6;
        else if (u.keep) v += u.hp * 18;
    }
    return v - s.pending.length * 3;
}

/** Everything one unit could do with its turn that isn't plainly a waste. */
export function unitOptions(s, u, thorough = false) {
    const out = [];
    const spots = [{ x: u.x, y: u.y, path: null }];
    if (!u.moved) spots.push(...moveTiles(s, u));
    for (const sp of spots) {
        let base = s;
        if (sp.path) { base = clone(s); applyMove(base, base.units.find((o) => o.id === u.id), sp.x, sp.y); if (base.over) { out.push({ mv: [sp.x, sp.y], act: null }); continue; } }
        const me = sp.path ? base.units.find((o) => o.id === u.id) : u;
        if (sp.path) out.push({ mv: [sp.x, sp.y], act: null });
        if (!canAct(base, me)) continue;
        const name = PIGEONS[me.k].act;
        for (const [x, y] of actTargets(base, me)) {
            if (!thorough && !useful(base, me, name, x, y)) continue;
            out.push({ mv: sp.path ? [sp.x, sp.y] : null, act: [x, y] });
        }
    }
    return out;
}

function useful(s, u, name, x, y) {
    if (name === "drop") {
        if (at(s, x, y)) return true;
        for (const [a, b] of DIRS) if (inB(x + a, y + b) && at(s, x + a, y + b)) return true;
        return false;
    }
    if (name === "flap") {
        const d = DIRS.findIndex(([a, b]) => u.x + a === x && u.y + b === y), r = u.up.far ? 5 : 3;
        for (let i = 1; i <= r; i++) { const a = u.x + DIRS[d][0] * i, b = u.y + DIRS[d][1] * i; if (inB(a, b) && at(s, a, b)) return true; }
        return false;
    }
    if (name === "box") {
        for (const f of s.units) if (f.side === 1 && f.intent && f.hp > 0) { if (Math.abs(f.x - x) + Math.abs(f.y - y) <= 3) return true; }
        return false;
    }
    return true;
}

function play(s, id, o) {
    const u = s.units.find((q) => q.id === id);
    if (o.mv) applyMove(s, u, o.mv[0], o.mv[1]);
    if (o.act && !s.over) applyAct(s, u, o.act[0], o.act[1]);
    if (!o.mv && !o.act) { u.moved = true; u.acted = true; }
    else { u.moved = true; if (o.act || !canAct(s, u)) u.acted = true; else u.acted = true; }
}

/** Beam search over one player turn. Returns finished end-of-turn nodes, best first. */
function planTurn(s0, width, keep, tune, deadline) {
    let beam = [{ s: s0, plan: [] }];
    const done = [{ s: s0, plan: [], v: evaluate(s0, tune) }];
    const units = pigeons(s0).length;
    for (let depth = 0; depth < units; depth++) {
        const seen = new Set(), next = [];
        for (const node of beam) {
            for (const u of pigeons(node.s)) {
                if (u.acted) continue;
                for (const o of unitOptions(node.s, u)) {
                    const c = clone(node.s);
                    play(c, u.id, o);
                    const h = hash(c);
                    if (seen.has(h)) continue;
                    seen.add(h);
                    next.push({ s: c, plan: [...node.plan, { id: u.id, ...o }], v: evaluate(c, tune) });
                }
            }
            if (deadline && Date.now() > deadline) break;
        }
        next.sort((a, b) => b.v - a.v);
        beam = next.slice(0, width);
        done.push(...beam.slice(0, keep));
        if (!beam.length || beam[0].s.over === "win") break;
    }
    done.sort((a, b) => b.v - a.v);
    return done.slice(0, keep);
}

/**
 * Search whole battles. width is breadth inside a turn, keep is end-of-turn states carried per state, roots is states
 * carried between rounds. Returns { win, plan, state } where plan is one list of actions per round.
 */
export function solve(start, { width = 8, keep = 4, roots = 8, tune = null, budgetMs = 0 } = {}) {
    let level = [{ s: start, plan: [] }];
    const deadline = budgetMs ? Date.now() + budgetMs : 0;
    let bestLose = null;
    for (let r = 0; r < 12; r++) {
        const seen = new Set(), nxt = [];
        for (const node of level) {
            const ends = planTurn(node.s, width, keep, tune, deadline);
            for (const e of ends) {
                const c = clone(e.s);
                if (c.over === "win") return { win: true, plan: [...node.plan, e.plan], state: c };
                if (c.over) continue;
                endTurn(c);
                const plan = [...node.plan, e.plan];
                if (c.over === "win") return { win: true, plan, state: c };
                if (c.over) { bestLose = { win: false, plan, state: c }; continue; }
                const h = hash(c);
                if (seen.has(h)) continue;
                seen.add(h);
                nxt.push({ s: c, plan, v: evaluate(c, tune) });
            }
            if (deadline && Date.now() > deadline) break;
        }
        if (!nxt.length) break;
        if (deadline && Date.now() > deadline) break;
        nxt.sort((a, b) => b.v - a.v);
        level = nxt.slice(0, roots);
    }
    return bestLose ?? { win: false, plan: [], state: level[0]?.s ?? start };
}

/** Random legal play: how often does someone who isn't thinking win? */
export function randomPlay(start, rng) {
    const s = clone(start);
    for (let guard = 0; guard < 40 && !s.over; guard++) {
        for (const u of pigeons(s)) {
            if (s.over) break;
            if (u.hp <= 0) continue;
            const opts = unitOptions(s, u, true);
            if (opts.length && rng() < 0.9) play(s, u.id, opts[Math.floor(rng() * opts.length)]);
        }
        if (!s.over) endTurn(s);
    }
    return s.over === "win";
}

export { T, idx, ACTS };
