// The battle engine. Pure and JSON-safe: a battle is a plain object, so it can be saved mid-fight, replayed, and played by bots.
// resolveTurn() takes everyone's choices and returns a list of events; the battle scene just animates that list.
import { BEASTS, MOVES, ITEMS, PERKS, STATUS, effectiveness } from "./data.js";

export const rand = (st) => {   // mulberry32 keeps its state in the battle, so saves resume exactly
    st.seed = (st.seed + 0x6D2B79F5) | 0; let t = st.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const chance = (st, pct) => rand(st) * 100 < pct;

// --- Deskmates ---------------------------------------------------------------------------------------------------------
export const XP_RATE = { value: 1 };
export const xpForLevel = (l) => Math.floor(0.9 * l * l * l);
export const stat = (m, k) => {
    const b = BEASTS[m.sp].base[k], l = m.lvl;
    return k === "hp" ? Math.floor((Math.floor(b * 2 * l / 100) + l + 12) * (m.hpx ?? 1)) : Math.floor(b * 2 * l / 100) + 5;
};
export const maxHp = (m) => stat(m, "hp");
export const baseTotal = (sp) => Object.values(BEASTS[sp].base).reduce((a, b) => a + b, 0);
let uid = 1;
export const bumpUid = (mons) => { for (const m of mons) uid = Math.max(uid, (m.uid ?? 0) + 1); };
export function makeMon(sp, lvl) {
    const known = [];
    for (const [l, mv] of BEASTS[sp].learn) if (l <= lvl && !known.includes(mv)) known.push(mv);
    const m = { sp, lvl, xp: xpForLevel(lvl), hp: 0, moves: bestMoves(known, sp), known, status: null, statusT: 0, uid: uid++ };
    m.hp = maxHp(m);
    return m;
}
/** Picks a sensible four: strong same-type attacks, some coverage, one utility. */
export function bestMoves(known, sp) {
    const types = BEASTS[sp].types, score = (id) => {
        const v = MOVES[id]; let s = v.pow ? v.pow * (types.includes(v.type) ? 1.35 : 1) * (v.hits ?? 1) * (1 - v.cd * 0.07) : 62;
        if (v.prio) s += 8; if (v.heal || v.status) s += 10; return s;
    };
    const sorted = [...known].sort((a, b) => score(b) - score(a)), pick = [], cats = (f) => pick.filter((id) => f(MOVES[id])).length;
    for (const id of sorted) {
        if (pick.length >= 4) break;
        const v = MOVES[id];
        if (!v.pow && cats((x) => !x.pow) >= 2) continue;
        if (v.pow && pick.length >= 3 && cats((x) => !x.pow) === 0 && sorted.some((o) => !MOVES[o].pow)) continue;
        pick.push(id);
    }
    for (const id of sorted) if (pick.length < 4 && !pick.includes(id)) pick.push(id);
    return pick;
}
/** Adds XP. Returns the events for level-ups and new moves. */
export function gainXp(m, amount, idx) {
    const ev = [];
    m.xp += amount;
    while (m.lvl < 60 && m.xp >= xpForLevel(m.lvl + 1)) {
        const before = maxHp(m); m.lvl++;
        if (m.hp > 0) m.hp += maxHp(m) - before;
        ev.push({ k: "level", idx, lvl: m.lvl, sp: m.sp });
        for (const [l, mv] of BEASTS[m.sp].learn) if (l === m.lvl && !m.known.includes(mv)) {
            m.known.push(mv);
            if (m.moves.length < 4) m.moves.push(mv); else if (!m.custom) m.moves = bestMoves(m.known, m.sp);
            ev.push({ k: "learn", idx, move: mv, sp: m.sp, equipped: m.moves.includes(mv) });
        }
    }
    return ev;
}
export const promotionFor = (m) => { const e = BEASTS[m.sp].evo; return e && e.lvl && m.lvl >= e.lvl ? e.to : null; };
export function promote(m, to) {
    const before = maxHp(m); m.sp = to; m.hp = Math.max(1, m.hp + maxHp(m) - before);
    for (const [l, mv] of BEASTS[to].learn) if (l <= m.lvl && !m.known.includes(mv)) m.known.push(mv);
    if (!m.custom) m.moves = bestMoves(m.known, m.sp);
}
/** Department heads' teams are tougher than their grade suggests, so a boss fight lasts long enough for its gimmick to matter. */
export function bossify(foes, d) {
    if (!d.boss) return foes;
    foes.forEach((m, i) => { m.hpx = i === 0 && d.hpx ? d.hpx : 1.3; m.hp = maxHp(m); });
    return foes;
}
export const healMon = (m) => { m.hp = maxHp(m); m.status = null; m.statusT = 0; delete m.v; };

// --- Setting up ----------------------------------------------------------------------------------------------------------
const freshV = () => ({ boost: { atk: 0, def: 0, sav: 0, pace: 0, acc: 0 }, cd: {}, passive: 0, caffeine: 0, protect: false, first: true, toxic: 0, rest: 0 });
const able = (side) => side.mons.map((m, i) => (m.hp > 0 ? i : -1)).filter((i) => i >= 0);
/** opts: kind wild|trainer|boss, fmt 1|2, you, foes, seed, name, ai, boss */
export function createBattle(o) {
    const fmt = o.fmt === 2 && able({ mons: o.you }).length >= 2 ? 2 : 1;
    for (const m of [...o.you, ...o.foes]) m.v = freshV();
    const st = {
        seed: o.seed | 0, turn: 0, kind: o.kind, fmt, name: o.name ?? "", ai: o.ai ?? 1, boss: o.boss ? { id: o.boss, t: 0, data: {} } : null,
        sides: [{ mons: o.you, active: [] }, { mons: o.foes, active: [] }], over: null, need: [], seen: {}, invert: 0, counts: { turns: 0, dmgDealt: {}, kos: {} }, fled: 0, reward: o.reward ?? 0,
    };
    const yours = able(st.sides[0]);
    st.sides[0].active = yours.slice(0, fmt);
    st.sides[1].active = o.foes.map((_, i) => i).slice(0, fmt === 2 && o.foes.length > 1 ? 2 : 1);
    const ev = [];
    for (const s of [0, 1]) for (const a of st.sides[s].active) { markSeen(st, a, s); onEnter(st, s, a, ev); }
    BOSS[st.boss?.id]?.start?.(st, ev);
    st.intro = ev;
    return st;
}
const markSeen = (st, i, s) => { if (s === 0) st.seen[st.sides[0].mons[i].uid] = 1; };
const onEnter = (st, s, i, ev) => {
    const m = st.sides[s].mons[i];
    if (BEASTS[m.sp].perk === "title") for (const f of liveActive(st, 1 - s)) { boostBy(st, f.m, { atk: -1 }, ev, 1 - s, f.i); }
};
const liveActive = (st, s) => st.sides[s].active.map((i) => ({ i, m: st.sides[s].mons[i] })).filter((a) => a.m && a.m.hp > 0);
const nameOf = (st, s, m) => (s === 1 && st.kind === "wild" ? "Wild " : s === 1 ? "Foe " : "") + (BEASTS[m.sp].name);
const STAT_NAMES = { atk: "Hustle", def: "Grit", sav: "Savvy", pace: "Pace", acc: "Accuracy" };

function boostBy(st, m, ch, ev, s, i) {
    for (const [k, n] of Object.entries(ch)) {
        const before = m.v.boost[k]; m.v.boost[k] = Math.max(-5, Math.min(5, before + n));
        ev.push({ k: "stat", s, i, stat: k, n, text: `${nameOf(st, s, m)}'s ${STAT_NAMES[k]} ${n > 0 ? "rose" : "fell"}${Math.abs(n) > 1 ? " sharply" : ""}!` });
    }
}
const stage = (n) => n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
export const speedOf = (m) => {
    let p = stat(m, "pace") * stage(m.v?.boost.pace ?? 0);
    if (m.v?.caffeine > 0) p *= 1.5;
    return p;
};
const typesOf = (st, s, m) => m.v?.types ?? BEASTS[m.sp].types;
const effOf = (st, type, s, m) => { let e = effectiveness(type, typesOf(st, s, m)); if (st.invert > 0 && e !== 1) e = 1 / e; return e; };

/** Pure damage estimate. roll 0..1 and crit flags let the AI ask the same question without side effects. */
export function damageOf(st, as, am, ds, dm, mv, o = {}) {
    if (!mv.pow) return 0;
    const P = BEASTS[am.sp].perk, Q = BEASTS[dm.sp].perk, h = mv.cat === "h";
    let A = stat(am, h ? "atk" : "sav") * stage(am.v.boost[h ? "atk" : "sav"]);
    let dBoost = dm.v.boost[h ? "def" : "sav"]; if (mv.pierce && dBoost > 0) dBoost = 0;
    const D = stat(dm, h ? "def" : "sav") * stage(dBoost);
    if (h && am.status === "burnout") A *= 0.6;
    let pow = mv.pow;
    if (mv.slowBonus && o.movedLast) pow *= 1.5;
    let dmg = ((2 * am.lvl / 5 + 2) * pow * A / D / 50 + 2);
    const eff = effOf(st, mv.type, ds, dm);
    if (typesOf(st, as, am).includes(mv.type)) dmg *= 1.35;
    dmg *= eff;
    if (o.crit) dmg *= 1.5;
    if (o.spread) dmg *= 0.8;
    if (am.v.caffeine > 0) dmg *= 1.25;
    if (P === "overtime" && am.hp < maxHp(am) / 3) dmg *= 1.4;
    if (P === "inertia" && o.movedLast) dmg *= 1.3;
    if (P === "analyst" && eff > 1) dmg *= 1.25;
    if (P === "multitask" && (mv.hits || mv.target === "all")) dmg *= 1.3;
    if (P === "team") dmg *= 1 + 0.04 * st.sides[as].mons.filter((x) => x !== am && x.hp > 0).length;
    if (Q === "thick" && eff > 1) dmg *= 0.75;
    if (Q === "fueled" && mv.type === "coffee") return 0;
    dmg *= 0.88 + 0.12 * (o.roll ?? 0.5);
    return Math.max(1, Math.floor(dmg));
}

// --- What can be done ----------------------------------------------------------------------------------------------------
export const usableMoves = (m) => {
    const u = m.moves.filter((id) => !(m.v?.cd?.[id] > 0));
    return u.length ? u : ["nudge"];
};
export const bossSpecials = (st) => BOSS[st.boss?.id]?.specials?.(st) ?? [];

// --- Enemy brains --------------------------------------------------------------------------------------------------------
export function chooseFor(st, s, slot, tier = st.ai) {
    const side = st.sides[s], i = side.active[slot], m = side.mons[i];
    const foes = liveActive(st, 1 - s), allies = liveActive(st, s);
    const opts = usableMoves(m).map((id) => {
        const mv = MOVES[id]; let score = 0, target = foes[0]?.i ?? 0;
        if (mv.pow) {
            let best = -1;
            const list = mv.target === "all" ? foes : foes;
            for (const f of list) {
                let d = damageOf(st, s, m, 1 - s, f.m, mv, { spread: mv.target === "all" && foes.length > 1 }) * (mv.hits ?? 1) * mv.acc / 100;
                if (d >= f.m.hp) d *= 1.6;
                if (mv.target === "all") best = (best < 0 ? 0 : best) + d;
                else if (d > best) { best = d; target = f.i; }
            }
            score = best;
            if (mv.prio && foes.some((f) => damageOf(st, s, m, 1 - s, f.m, mv) >= f.m.hp)) score *= 1.5;
            if (mv.recoil) score *= 0.85;
        } else {
            const avg = foes.reduce((a, f) => a + maxHp(f.m), 0) / Math.max(1, foes.length) * 0.22;
            if (mv.status) { const t = foes.find((f) => !f.m.status && BEASTS[f.m.sp].perk !== "union" || (!f.m.status && mv.status !== "meeting")); score = t ? avg * 1.1 : 0; if (t) target = t.i; }
            else if (mv.heal && (mv.target === "self")) score = m.hp < maxHp(m) * 0.45 ? avg * 1.5 : 0;
            else if (mv.heal && mv.target === "team") score = allies.some((a) => a.m.hp < maxHp(a.m) * 0.55) ? avg * 1.4 : 0;
            else if (mv.heal && mv.target === "ally") { const a = allies.filter((x) => x.m !== m).sort((p, q) => p.m.hp / maxHp(p.m) - q.m.hp / maxHp(q.m))[0]; score = a && a.m.hp < maxHp(a.m) * 0.6 ? avg * 1.4 : (m.hp < maxHp(m) * 0.45 ? avg : 0); target = a?.i ?? i; }
            else if (mv.vol === "caffeine") { const a = allies.find((x) => x.m !== m && !x.m.v.caffeine) ?? (!m.v.caffeine ? { i, m } : null); score = a ? avg * 0.9 : 0; if (a) target = a.i; }
            else if (mv.protect) score = m.v.lastProtect === st.turn - 1 ? 0 : m.hp < maxHp(m) * 0.3 ? avg * 0.8 : avg * 0.2;
            else if (mv.self || mv.team) score = st.turn <= 2 && m.hp > maxHp(m) * 0.6 && (m.v.boost.sav + m.v.boost.atk + m.v.boost.def) < 2 ? avg : avg * 0.15;
            else if (mv.foe) { const t = foes[0]; score = t && Object.entries(mv.foe).every(([k]) => t.m.v.boost[k] > -2) ? avg * 0.7 : 0; if (t) target = t.i; }
            else if (mv.clear) score = foes.some((f) => Object.values(f.m.v.boost).some((v) => v > 1)) ? avg : 0;
            else if (mv.force) score = foes.some((f) => Object.values(f.m.v.boost).some((v) => v > 1)) ? avg * 0.9 : 0;
            else if (mv.cure) score = allies.some((a) => a.m.status) || st.sides[s].mons.some((x) => x.status) ? avg : 0;
        }
        return { id, score, target };
    });
    if (tier <= 0) {   // wild things are mostly random, and a bit daft
        const usable = opts.filter((o) => o.score > 0 || MOVES[o.id].pow);
        const c = usable[Math.floor(rand(st) * usable.length)] ?? opts[0];
        return { t: "move", move: c.id, target: c.target };
    }
    const noise = tier >= 2 ? 0.08 : 0.3;
    opts.forEach((o) => { o.score *= 1 + (rand(st) - 0.5) * noise * 2; });
    opts.sort((a, b) => b.score - a.score);
    return { t: "move", move: opts[0].id, target: opts[0].target };
}

// --- Resolving a turn ----------------------------------------------------------------------------------------------------
export function resolveTurn(st, choices) {
    const ev = [], acts = [];
    st.turn++; st.counts.turns++;
    const bossH = BOSS[st.boss?.id];
    st.sides[0].active.forEach((i, slot) => {
        const m = st.sides[0].mons[i]; if (!m || m.hp <= 0) return;
        const c = choices[slot] ?? { t: "move", move: usableMoves(m)[0], target: st.sides[1].active[0] };
        acts.push({ s: 0, slot, i, m, c });
    });
    st.sides[1].active.forEach((i, slot) => {
        const m = st.sides[1].mons[i]; if (!m || m.hp <= 0) return;
        const c = bossH?.pick?.(st, m, slot, ev) ?? chooseFor(st, 1, slot);
        acts.push({ s: 1, slot, i, m, c });
    });
    const prioOf = (a) => {
        if (a.c.t === "switch" || a.c.t === "run") return 10;
        if (a.c.t === "item") return 9;
        if (a.c.t === "special") return 8;
        const mv = MOVES[a.c.move]; let p = mv?.prio ?? 0;
        if (BEASTS[a.m.sp].perk === "early" && a.m.v.first) p += 1;
        return p;
    };
    const order = acts.map((a) => ({ a, r: rand(st) })).sort((x, y) => prioOf(y.a) - prioOf(x.a) || speedOf(y.a.m) - speedOf(x.a.m) || x.r - y.r).map((x) => x.a);
    const lastAct = order[order.length - 1];
    for (const a of order) {
        if (st.over) break;
        if (a.m.hp <= 0) continue;
        if (!st.sides[a.s].active.includes(a.i)) continue;
        act(st, a, ev, a === lastAct || order.indexOf(a) >= order.length / 2);
    }
    if (!st.over) endOfTurn(st, ev);
    return ev;
}

function act(st, a, ev, late) {
    const { s, m, c } = a;
    if (c.t === "run") {
        st.fled++;
        const foe = liveActive(st, 1)[0]?.m;
        const ok = st.kind === "wild" && (!foe || speedOf(m) * 1.3 + 12 * st.fled > speedOf(foe) * rand(st) * 1.6);
        if (st.kind !== "wild") ev.push({ k: "say", text: "You can't walk out of this one. HR is watching." });
        else if (ok) { ev.push({ k: "say", text: "You remembered a very important meeting." }, { k: "run" }); st.over = "run"; }
        else ev.push({ k: "say", text: "\"Do you have a minute?\" You could not get away." });
        return;
    }
    if (c.t === "switch") return doSwitch(st, s, a.slot, c.to, ev);
    if (c.t === "item") return useItem(st, c, ev);
    if (c.t === "special") { BOSS[st.boss.id].special?.(st, c.id, a, ev); return; }
    useMove(st, a, ev, late);
}

export function doSwitch(st, s, slot, to, ev) {
    const side = st.sides[s], outI = side.active[slot], out = side.mons[outI];
    if (out) { resetV(out); if (out.hp > 0) ev.push({ k: "recall", s, slot, text: `${BEASTS[out.sp].name}, take five.` }); }
    side.active[slot] = to;
    const m = side.mons[to]; m.v = freshV();
    markSeen(st, to, s);
    ev.push({ k: "send", s, slot, i: to, text: s === 0 ? `You're up, ${BEASTS[m.sp].name}!` : `${st.name} sent in ${BEASTS[m.sp].name}!` });
    onEnter(st, s, to, ev);
}
const resetV = (m) => { const cd = m.v?.cd; m.v = freshV(); if (cd) m.v.cd = {}; };

function useItem(st, c, ev) {
    const it = ITEMS[c.item], you = st.sides[0];
    if (it.cat === "catch") return tryCatch(st, c, ev);
    const m = you.mons[c.on]; if (!m) return;
    const nm = BEASTS[m.sp].name;
    if (it.cat === "heal") { const n = Math.min(maxHp(m) - m.hp, it.heal); m.hp += n; ev.push({ k: "heal", s: 0, i: c.on, n, hp: m.hp, text: `${nm} drank a ${it.name}.` }); }
    else if (it.cat === "team") { for (const [i, x] of you.mons.entries()) if (x.hp > 0) { const n = Math.min(maxHp(x) - x.hp, it.heal); x.hp += n; ev.push({ k: "heal", s: 0, i, n, hp: x.hp, quiet: 1 }); } ev.push({ k: "say", text: "Donuts! The whole team forgets the last hour." }); }
    else if (it.cat === "cure") { m.status = null; m.v.passive = 0; ev.push({ k: "cure", s: 0, i: c.on, text: `${nm} took an Aspirin and feels fine.` }); }
    else if (it.cat === "revive") { m.hp = Math.floor(maxHp(m) / 2); m.status = null; ev.push({ k: "revive", s: 0, i: c.on, hp: m.hp, text: `${nm} is back from Out of Office.` }); }
    else if (it.cat === "battle") { boostBy(st, m, { atk: 1, sav: 1 }, ev, 0, c.on); }
}
export function catchOdds(st, target, ball) {
    const m = target, sp = BEASTS[m.sp], hpf = m.hp / maxHp(m);
    const statusBonus = m.status === "meeting" ? 2 : m.status ? 1.5 : 1;
    const a = (3 - 2 * hpf) / 3 * sp.rate * ball * statusBonus;
    return Math.min(1, a / 255 * 1.15 + 0.03);
}
function tryCatch(st, c, ev) {
    const it = ITEMS[c.item], tI = st.sides[1].active[0], t = st.sides[1].mons[tI];
    if (st.kind !== "wild") { ev.push({ k: "say", text: "It's already employed. Poaching is against policy." }); return; }
    const odds = catchOdds(st, t, it.ball), ok = rand(st) < odds, shakes = ok ? 3 : Math.min(2, Math.floor(rand(st) * 3));
    ev.push({ k: "catch", ok, shakes, item: c.item, i: tI, text: `You offered ${BEASTS[t.sp].name} a ${it.name}...` });
    if (ok) { st.caught = t; st.over = "caught"; ev.push({ k: "say", text: `${BEASTS[t.sp].name} accepted! Welcome to the team.` }); awardXp(st, t, ev, 0.6); }
    else ev.push({ k: "say", text: FAILS[Math.floor(rand(st) * FAILS.length)].replace("$", BEASTS[t.sp].name) });
}
const FAILS = ["$ wants to discuss the package.", "$ has another offer on the table.", "$ read the fine print.", "$ asked about remote work. Awkward silence.", "$ left you on read."];

function useMove(st, a, ev, late) {
    const { s, m } = a; let id = a.c.move;
    const v = m.v, nm = nameOf(st, s, m);
    v.first = false;
    if (m.status === "meeting") {
        m.statusT--;
        if (m.statusT <= 0) { m.status = null; ev.push({ k: "cure", s, i: a.i, text: `${nm}'s meeting finally ended.` }); }
        else { ev.push({ k: "blocked", s, i: a.i, status: "meeting", text: `${nm} is In a Meeting. ${MEET[Math.floor(rand(st) * MEET.length)]}` }); return; }
    }
    if (v.rest > 0) { v.rest--; ev.push({ k: "blocked", s, i: a.i, status: "meeting", text: `${nm} is taking some time for itself.` }); return; }
    if (v.passive > 0) {
        v.passive--;
        if (v.passive === 0) ev.push({ k: "say", text: `${nm} let it go.` });
        else if (chance(st, 33)) {
            const d = Math.max(1, Math.floor(maxHp(m) / 8)); m.hp = Math.max(0, m.hp - d);
            ev.push({ k: "hit", s, i: a.i, d, hp: m.hp, eff: 1, text: `${nm} is Second-Guessing itself. "Was that... fine?"` });
            if (m.hp <= 0) faint(st, s, a.i, ev, null);
            return;
        }
    }
    const mv = MOVES[id];
    if (!mv) return;
    if (m.status === "mute" && (!mv.pow || chance(st, 35))) { ev.push({ k: "blocked", s, i: a.i, status: "mute", text: `${nm} is On Mute. Nobody heard ${mv.name}.` }); setCd(m, mv); return; }
    ev.push({ k: "move", s, i: a.i, slot: a.slot, move: id, text: `${nm} used ${mv.name}!` });
    setCd(m, mv);
    // Targets
    const foes = liveActive(st, 1 - s), allies = liveActive(st, s);
    let targets;
    if (mv.target === "self") targets = [{ s, i: a.i, m }];
    else if (mv.target === "team") targets = allies.map((x) => ({ s, i: x.i, m: x.m }));
    else if (mv.target === "ally") { const t = allies.find((x) => x.i === a.c.target) ?? allies.find((x) => x.m !== m) ?? { i: a.i, m }; targets = [{ s, i: t.i, m: t.m }]; }
    else if (mv.target === "all") targets = foes.map((x) => ({ s: 1 - s, i: x.i, m: x.m }));
    else { const t = foes.find((x) => x.i === a.c.target) ?? foes[0]; targets = t ? [{ s: 1 - s, i: t.i, m: t.m }] : []; }
    if (!targets.length) { ev.push({ k: "say", text: "But nobody was there. It went to voicemail." }); return; }
    const spread = mv.target === "all" && targets.length > 1;
    let anyHit = false;
    for (const t of targets) {
        if (t.s !== s && t.m.v.protect) { ev.push({ k: "protect", s: t.s, i: t.i, text: `${nameOf(st, t.s, t.m)} set a clear boundary.` }); continue; }
        if (t.s !== s || mv.target === undefined) {
            const accB = stage(m.v.boost.acc), hit = mv.sure || chance(st, mv.acc * accB);
            if (!hit) { ev.push({ k: "miss", s: t.s, i: t.i, text: `${nameOf(st, s, m)} missed. Probably a calendar conflict.` }); continue; }
        }
        if (!mv.pow && t.s !== s && BEASTS[t.m.sp].perk === "alert" && chance(st, 50)) { ev.push({ k: "say", text: `${nameOf(st, t.s, t.m)} is Always Online and saw it coming.` }); continue; }
        anyHit = true;
        if (mv.pow) strike(st, a, t, mv, spread, late, ev);
        if (st.over) return;
        if (t.m.hp > 0) applyEffects(st, a, t, mv, ev);
    }
    // Self effects after damage
    if (mv.pow && anyHit) {
        if (mv.self && (mv.chance === undefined || chance(st, mv.chance))) boostBy(st, m, mv.self, ev, s, a.i);
    } else if (mv.self && !mv.pow) boostBy(st, m, mv.self, ev, s, a.i);
    if (mv.recoil && anyHit && m.hp > 0) { const d = Math.max(1, Math.floor(maxHp(m) * mv.recoil)); m.hp = Math.max(0, m.hp - d); ev.push({ k: "hit", s, i: a.i, d, hp: m.hp, eff: 1, text: `${nm} is feeling it.` }); if (m.hp <= 0) faint(st, s, a.i, ev, null); }
    if (mv.rest) { v.rest = 1; }
}
const MEET = ["It'll be out in five.", "It can see your message.", "It has a hard stop. It's lying.", "Someone is sharing their screen.", "They're still on slide 2."];
const setCd = (m, mv) => { const f = BEASTS[m.sp].perk === "frugal" ? 1 : 0, n = mv.cd - f; if (n > 0) m.v.cd[mv.id] = n + 1; };

function strike(st, a, t, mv, spread, late, ev) {
    const { s, m } = a, hits = mv.hits ?? 1;
    if (BEASTS[t.m.sp].perk === "fueled" && mv.type === "coffee") { const n = Math.min(maxHp(t.m) - t.m.hp, Math.floor(maxHp(t.m) / 4)); t.m.hp += n; ev.push({ k: "heal", s: t.s, i: t.i, n, hp: t.m.hp, text: `${BEASTS[t.m.sp].name} runs on coffee. Thanks!` }); return; }
    let total = 0;
    for (let h = 0; h < hits && t.m.hp > 0; h++) {
        const crit = chance(st, 6.25), eff = effOf(st, mv.type, t.s, t.m);
        let d = damageOf(st, s, m, t.s, t.m, mv, { crit, roll: rand(st), spread, movedLast: late });
        const P = BEASTS[t.m.sp].perk;
        if (P === "backup" && !t.m.v.backupUsed && t.m.hp === maxHp(t.m) && d >= t.m.hp) { d = t.m.hp - 1; t.m.v.backupUsed = 1; ev.push({ k: "say", text: `${BEASTS[t.m.sp].name} had a Backup Copy!` }); }
        if (st.boss && t.s === 1 && BOSS[st.boss.id].absorb) d = BOSS[st.boss.id].absorb(st, t, d, ev);
        t.m.hp = Math.max(0, t.m.hp - d); total += d;
        if (s === 0) st.counts.dmgDealt[m.uid] = (st.counts.dmgDealt[m.uid] ?? 0) + d;
        ev.push({ k: "hit", s: t.s, i: t.i, d, hp: t.m.hp, eff, crit, type: mv.type, cat: mv.cat, from: { s, i: a.i } });
        if (h === hits - 1 || t.m.hp <= 0) { if (eff > 1) ev.push({ k: "eff", text: st.invert > 0 ? "The terms have changed. It's super effective!" : superLine(mv.type, typesOf(st, t.s, t.m)), good: 1 }); else if (eff < 1) ev.push({ k: "eff", text: "It's not very effective. Noted.", good: 0 }); }
        if (crit) ev.push({ k: "crit", text: "A career-defining hit!" });
    }
    if (mv.drain && m.hp > 0) { const n = Math.min(maxHp(m) - m.hp, Math.floor(total * mv.drain)); if (n > 0) { m.hp += n; ev.push({ k: "heal", s, i: a.i, n, hp: m.hp, text: `${nameOf(st, s, m)} took the credit.` }); } }
    if (t.m.hp > 0) {
        const P = BEASTS[t.m.sp].perk;
        if (P === "prickly" && mv.cat === "h" && m.hp > 0) { const d = Math.max(1, Math.floor(maxHp(m) / 10)); m.hp = Math.max(0, m.hp - d); ev.push({ k: "hit", s, i: a.i, d, hp: m.hp, eff: 1, text: `${nameOf(st, s, m)} got tangled up.` }); if (m.hp <= 0) faint(st, s, a.i, ev, null); }
        if (P === "petty" && m.hp > 0 && !m.v.passive && chance(st, 30)) { m.v.passive = 3; ev.push({ k: "vol", s, i: a.i, text: `${BEASTS[t.m.sp].name} said "No, it's fine." ${nameOf(st, s, m)} is Second-Guessing itself.` }); }
    }
    if (t.m.hp <= 0) {
        faint(st, t.s, t.i, ev, { s, i: a.i, m });
    }
}
const superLine = (atk, types) => {
    for (const t of types) { const line = STRONGX(atk, t); if (line) return line; }
    return "It's super effective!";
};
import { STRONG } from "./data.js";
const STRONGX = (a, d) => STRONG[a]?.[d];

function applyEffects(st, a, t, mv, ev) {
    const { s, m } = a, tm = t.m, can = mv.chance === undefined || chance(st, mv.chance), P = BEASTS[m.sp].perk;
    if (mv.heal) {
        const mul = (P === "supportive" ? 1.5 : 1), n = Math.min(maxHp(tm) - tm.hp, Math.floor(maxHp(tm) * mv.heal * mul));
        if (n > 0) { tm.hp += n; ev.push({ k: "heal", s: t.s, i: t.i, n, hp: tm.hp, text: `${BEASTS[tm.sp].name} feels better.` }); } else ev.push({ k: "say", text: `${BEASTS[tm.sp].name} is already fine, thanks.` });
    }
    if (mv.cure) {
        const list = mv.target === "team" ? st.sides[t.s].mons.filter((x) => x.hp > 0) : [tm];
        for (const x of list) if (x.status) { x.status = null; ev.push({ k: "cure", s: t.s, i: st.sides[t.s].mons.indexOf(x), text: `${BEASTS[x.sp].name} is back in the room.` }); }
    }
    if (mv.refresh) { tm.v.cd = {}; }
    if (mv.protect) { tm.v.protect = true; tm.v.lastProtect = st.turn; }
    if (mv.status && can) inflict(st, t, mv.status, ev);
    if (mv.vol === "passive" && can && !tm.v.passive) { tm.v.passive = 3; ev.push({ k: "vol", s: t.s, i: t.i, text: `${nameOf(st, t.s, tm)} is Second-Guessing itself.` }); }
    if (mv.vol === "caffeine") { tm.v.caffeine = 4; ev.push({ k: "vol", s: t.s, i: t.i, vol: "caffeine", text: `${BEASTS[tm.sp].name} is Caffeinated! Its eye is twitching.` }); }
    if (mv.foe && t.s !== s && can) boostBy(st, tm, mv.foe, ev, t.s, t.i);
    if (mv.team) boostBy(st, tm, mv.team, ev, t.s, t.i);
    if (mv.clear) { tm.v.boost = { atk: 0, def: 0, sav: 0, pace: 0, acc: 0 }; ev.push({ k: "vol", s: t.s, i: t.i, text: `${BEASTS[tm.sp].name} has been unsubscribed from its confidence.` }); }
    if (mv.force) {
        const side = st.sides[t.s], bench = side.mons.map((x, i) => (x.hp > 0 && !side.active.includes(i) ? i : -1)).filter((i) => i >= 0);
        const isBossLead = st.boss && t.s === 1;
        if (bench.length && !isBossLead) { ev.push({ k: "say", text: `"Let's take this offline," said ${BEASTS[m.sp].name}.` }); doSwitch(st, t.s, side.active.indexOf(t.i), bench[Math.floor(rand(st) * bench.length)], ev); }
        else ev.push({ k: "say", text: "But it stayed on the call." });
    }
}
export function inflict(st, t, status, ev) {
    const m = t.m;
    if (m.status) return void ev.push({ k: "say", text: `${BEASTS[m.sp].name} already has enough going on.` });
    if (status === "meeting" && BEASTS[m.sp].perk === "union") return void ev.push({ k: "say", text: `${BEASTS[m.sp].name}'s Union Rep said no.` });
    m.status = status;
    if (status === "meeting") m.statusT = 2 + Math.floor(rand(st) * 2);
    if (status === "replyall") m.v.toxic = 1;
    ev.push({ k: "status", s: t.s, i: t.i, status, text: `${nameOf(st, t.s, m)} is ${STATUS_LINE[status]}` });
}
const STATUS_LINE = { meeting: "In a Meeting!", mute: "On Mute!", burnout: "feeling the Burnout!", replyall: "caught in a Reply-All Storm!" };

function faint(st, s, i, ev, by) {
    const m = st.sides[s].mons[i];
    ev.push({ k: "faint", s, i, text: `${nameOf(st, s, m)} is Out of Office.` });
    if (by && by.m.hp > 0) {
        if (BEASTS[by.m.sp].perk === "ruthless") boostBy(st, by.m, { atk: 1, sav: 1 }, ev, by.s, by.i);
        if (by.s === 0) st.counts.kos[by.m.uid] = (st.counts.kos[by.m.uid] ?? 0) + 1;
    }
    if (s === 1) awardXp(st, m, ev, 1);
    checkOver(st, ev);
}
function awardXp(st, foe, ev, mul) {
    const bt = baseTotal(foe.sp), base = bt / 4 * foe.lvl / 7 * (st.kind === "wild" ? 1 : 1.5) * mul * XP_RATE.value + 2;
    st.sides[0].mons.forEach((m, i) => {
        if (m.hp <= 0) return;
        const part = st.sides[0].active.includes(i) || st.seen[m.uid];
        const gain = Math.max(1, Math.floor(base * (part ? 1 : 0.6)));
        ev.push({ k: "xp", idx: i, gain, sp: m.sp, part: !!part });
        ev.push(...gainXp(m, gain, i));
    });
}
function checkOver(st, ev) {
    const foesLeft = able(st.sides[1]).length, mineLeft = able(st.sides[0]).length;
    if (foesLeft === 0) {
        if (BOSS[st.boss?.id]?.onAllDown?.(st, ev)) return;
        st.over = "win"; ev.push({ k: "win" });
    } else if (mineLeft === 0) { st.over = "lose"; ev.push({ k: "lose" }); }
}

function endOfTurn(st, ev) {
    if (st.invert > 0) { st.invert--; if (!st.invert) ev.push({ k: "say", text: "The Terms and Conditions were changed back." }); }
    for (const s of [0, 1]) for (const i of st.sides[s].active) {
        const m = st.sides[s].mons[i]; if (!m || m.hp <= 0) continue;
        const v = m.v, nm = nameOf(st, s, m);
        v.protect = false;
        for (const k of Object.keys(v.cd)) { v.cd[k]--; if (v.cd[k] <= 0) delete v.cd[k]; }
        if (v.caffeine > 0) { v.caffeine--; if (!v.caffeine) ev.push({ k: "vol", s, i, text: `${nm} crashed a little.` }); }
        if (m.status === "burnout") { const d = Math.max(1, Math.floor(maxHp(m) / 12)); m.hp = Math.max(0, m.hp - d); ev.push({ k: "hit", s, i, d, hp: m.hp, eff: 1, dot: "burnout", text: `${nm} is running on fumes.` }); }
        if (m.status === "replyall") { const d = Math.max(1, Math.floor(maxHp(m) * Math.min(5, v.toxic) / 18)); v.toxic++; m.hp = Math.max(0, m.hp - d); ev.push({ k: "hit", s, i, d, hp: m.hp, eff: 1, dot: "replyall", text: `${nm}'s inbox won't stop.` }); }
        if (BEASTS[m.sp].perk === "recycled" && m.hp > 0 && m.hp < maxHp(m)) { const n = Math.min(maxHp(m) - m.hp, Math.max(1, Math.floor(maxHp(m) / 16))); m.hp += n; ev.push({ k: "heal", s, i, n, hp: m.hp, quiet: 1 }); }
        if (m.hp <= 0) { faint(st, s, i, ev, null); if (st.over) return; }
    }
    BOSS[st.boss?.id]?.end?.(st, ev);
    if (st.turn >= 30 && !st.over) overtime(st, ev);
    if (!st.over) refill(st, ev);
}
/** Stalemates end: after turn 30 everyone is working late, and it hurts. */
function overtime(st, ev) {
    if (st.turn === 30) ev.push({ k: "say", text: "It's past 7. Nobody has eaten. Everyone starts to flag." });
    for (const s of [0, 1]) for (const a of liveActive(st, s)) {
        const d = Math.max(1, Math.floor(maxHp(a.m) * Math.min(0.5, (st.turn - 29) * 0.06))); a.m.hp = Math.max(0, a.m.hp - d);
        ev.push({ k: "hit", s, i: a.i, d, hp: a.m.hp, eff: 1, dot: "overtime" });
        if (a.m.hp <= 0) { faint(st, s, a.i, ev, null); if (st.over) return; }
    }
}
/** Replaces fainted fighters. Foes pick their own; for the player, st.need lists the slots waiting on a choice. */
function refill(st, ev) {
    const foe = st.sides[1];
    foe.active.forEach((i, slot) => {
        if (foe.mons[i]?.hp > 0) return;
        const next = foe.mons.findIndex((x, n) => x.hp > 0 && !foe.active.includes(n));
        if (next >= 0) doSwitch(st, 1, slot, next, ev);
    });
    foe.active = foe.active.filter((i, n, arr) => foe.mons[i]?.hp > 0 || arr.length === 1);
    const you = st.sides[0]; st.need = [];
    you.active.forEach((i, slot) => { if (!(you.mons[i]?.hp > 0)) st.need.push(slot); });
    const bench = you.mons.filter((x, n) => x.hp > 0 && !you.active.includes(n)).length;
    if (st.need.length > bench) {   // not enough bench: drop the empty slots
        const keep = you.active.filter((i) => you.mons[i]?.hp > 0);
        const needed = Math.min(st.need.length, bench);
        const missing = st.need.length - needed;
        you.active = [...you.active.filter((i, n) => !(st.need.slice(needed).includes(n)))];
        st.need = you.active.map((i, slot) => (you.mons[i]?.hp > 0 ? -1 : slot)).filter((n) => n >= 0);
        void keep; void missing;
    }
}
export const replaceFainted = (st, slot, to) => { const ev = []; doSwitch(st, 0, slot, to, ev); st.need = st.need.filter((n) => n !== slot); return ev; };

// --- Department head gimmicks ---------------------------------------------------------------------------------------------
const foeLead = (st) => liveActive(st, 1)[0];
const yours = (st) => liveActive(st, 0);
const say = (ev, text, extra) => ev.push({ k: "boss", text, ...extra });
export const BOSS = {
    // Facilities: every third turn the floor is wet.
    facilities: {
        end(st, ev) { if (st.turn % 3 === 0) { say(ev, "Doug put out a WET FLOOR sign. Your team slows down, carefully."); for (const y of yours(st)) boostBy(st, y.m, { pace: -1 }, ev, 0, y.i); } },
    },
    // HR: a Performance Improvement Plan on your strongest fighter.
    hr: {
        end(st, ev) { if (st.turn % 3 === 0) { const y = yours(st).sort((a, b) => Math.max(b.m.v.boost.atk, b.m.v.boost.sav) - Math.max(a.m.v.boost.atk, a.m.v.boost.sav) || b.m.hp - a.m.hp)[0]; if (y) { say(ev, `Cheryl has placed ${BEASTS[y.m.sp].name} on a Performance Improvement Plan.`); boostBy(st, y.m, { atk: -1, sav: -1 }, ev, 0, y.i); } } },
    },
    // IT: every third turn everything gets turned off and on again.
    it: {
        end(st, ev) {
            if (st.turn % 3 === 2) say(ev, "Neil's finger hovers over the power switch. Next turn: RESET.");
            if (st.turn % 3 === 0) { say(ev, "Have you tried turning it off and on again? All stat changes wiped!"); for (const s of [0, 1]) for (const x of liveActive(st, s)) { x.m.v.boost = { atk: 0, def: 0, sav: 0, pace: 0, acc: 0 }; if (s === 1) x.m.v.cd = {}; } }
        },
    },
    // The Printer jams on purpose. It warms up, then fires, unless someone opens Tray 2.
    printer: {
        start(st, ev) { st.boss.data.charge = 0; say(ev, "The printer's display reads: READY. It is lying."); },
        specials(st) { return st.boss.data.charge > 0 ? [{ id: "tray", name: "Open Tray 2", text: "Clears the jam. Stops its big attack and stuns it." }] : []; },
        special(st, id, a, ev) {
            const f = foeLead(st); if (!f) return;
            st.boss.data.charge = 0; st.boss.data.stun = 1;
            say(ev, `${BEASTS[a.m.sp].name} opened Tray 2. There is nothing in Tray 2. There has never been anything in Tray 2.`);
            const d = Math.floor(maxHp(f.m) * 0.1); f.m.hp = Math.max(1, f.m.hp - d);
            ev.push({ k: "hit", s: 1, i: f.i, d, hp: f.m.hp, eff: 1, text: "The printer is stunned." });
        },
        pick(st, m, slot) {
            const b = st.boss.data;
            if (BEASTS[m.sp].id !== "jamothy") return null;
            if (b.stun) { b.stun = 0; return { t: "special", id: "stunned" }; }
            if (b.charge === 1) return { t: "special", id: "fire" };
            return { t: "move", move: st.turn % 2 ? "toner_cloud" : "paper_jam", target: yours(st)[0]?.i };
        },
        end(st, ev) {
            const b = st.boss.data;
            if (b.charge === 0 && st.turn % 3 === 0 && !b.stun) { b.charge = 1; say(ev, "TRAY 2 EMPTY. Fuser glowing. Something terrible is warming up!", { warn: 1 }); }
        },
        absorb(st, t, d) { return d; },
    },
    // Marketing: rebrands its lead's type every two turns.
    marketing: {
        start(st, ev) { BOSS.marketing.rebrand(st, ev); },
        rebrand(st, ev) {
            const f = foeLead(st); if (!f) return;
            const list = ["wellness", "tech", "coffee", "hardware", "paper"], t = list[st.boss.data.n = ((st.boss.data.n ?? -1) + 1) % list.length];
            f.m.v.types = [t];
            say(ev, `REBRAND! ${BEASTS[f.m.sp].name} is now a ${t === "tech" ? "tech company" : t === "coffee" ? "coffee-first lifestyle" : t === "wellness" ? "wellness journey" : t === "hardware" ? "hardware disruptor" : "paper-forward brand"}.`, { rebrand: t, i: f.i });
        },
        end(st, ev) { if (st.turn % 2 === 0) BOSS.marketing.rebrand(st, ev); },
    },
    // Finance: Budget Cuts freeze your best-used move.
    finance: {
        end(st, ev) {
            if (st.turn % 2 !== 0) return;
            const y = yours(st)[Math.floor(rand(st) * yours(st).length)]; if (!y) return;
            const mv = [...y.m.moves].sort((a, b) => MOVES[b].pow - MOVES[a].pow)[0];
            y.m.v.cd[mv] = 3; say(ev, `Budget Cuts! ${MOVES[mv].name} is frozen until next quarter.`);
        },
    },
    // Wellness: Mandatory Fun heals her team on a timer. Burst it down.
    wellness: {
        end(st, ev) { if (st.turn % 2 === 0) { say(ev, "Mandatory Fun! Sunny leads everyone in a group stretch."); for (const f of liveActive(st, 1)) { const n = Math.min(maxHp(f.m) - f.m.hp, Math.floor(maxHp(f.m) * 0.1)); if (n > 0) { f.m.hp += n; ev.push({ k: "heal", s: 1, i: f.i, n, hp: f.m.hp, quiet: 1 }); } } } },
    },
    // Legal: amends the Terms, flipping the whole type chart for three turns.
    legal: {
        end(st, ev) {
            if (st.turn % 4 === 3) say(ev, "Mr. Whereas uncaps his pen. The Terms are about to change.", { warn: 1 });
            if (st.turn % 4 === 0) { st.invert = 2; say(ev, "TERMS AMENDED! For two turns the type chart is reversed.", { warn: 1 }); }
        },
    },
    // The Board votes every third turn, buffing the whole side.
    board: {
        end(st, ev) { if (st.turn % 4 === 0) { say(ev, "All in favour? Aye. The motion carries. The Board grows bolder."); for (const f of liveActive(st, 1)) boostBy(st, f.m, { atk: 1, sav: 1 }, ev, 1, f.i); } },
    },
    // The Auto-Reply can't be knocked out. It can only be switched off, and the settings keep asking if you're sure.
    autoreply: {
        start(st, ev) { st.boss.data.confirm = 0; st.boss.data.down = 0; say(ev, "Thank you for your message. I am currently out of the office."); },
        specials(st) {
            const f = foeLead(st), d = st.boss.data;
            if (!f || f.m.hp > maxHp(f.m) * 0.5 && !d.confirm) return [];
            return [{ id: "off", name: ["Turn Off Automatic Replies", "Are you sure?", "Are you REALLY sure?"][d.confirm] ?? "Confirm", text: `Step ${d.confirm + 1} of 3. Your Deskmate must stay in the settings menu all turn.` }];
        },
        special(st, id, a, ev) {
            const d = st.boss.data; d.confirm++;
            if (d.confirm >= 3) { say(ev, "Automatic replies: OFF."); st.over = "win"; ev.push({ k: "win", final: 1 }); return; }
            say(ev, `${BEASTS[a.m.sp].name} tapped through. ${d.confirm === 1 ? "Are you sure you want to stop being helpful?" : "This cannot be undone. It can be undone. Are you sure?"}`);
        },
        absorb(st, t, d, ev) {
            if (t.m.hp - d <= 0) { st.boss.data.down++; t.m.hp = Math.floor(maxHp(t.m) * 0.45) + d; say(ev, "Your message has been received. It will be read on my return."); }
            return d;
        },
        pick(st, m) {
            const d = st.boss.data;
            if (d.confirm >= 1 || st.turn % 3 === 0) return { t: "move", move: "auto_response", target: yours(st)[0]?.i };
            return null;
        },
    },
};
// Foes that pick "special" act through the printer's turn handler.
const baseSpecial = BOSS.printer.special;
BOSS.printer.special = function (st, id, a, ev) {
    if (id === "stunned") { say(ev, "The printer is recalibrating. It smells of warm dust."); return; }
    if (id === "fire") {
        st.boss.data.charge = 0;
        say(ev, "PAPER JAM! Five hundred hot sheets, all at once!", { warn: 1 });
        for (const y of yours(st)) {
            const d = Math.floor(maxHp(y.m) * 0.5); y.m.hp = Math.max(0, y.m.hp - d);
            ev.push({ k: "hit", s: 0, i: y.i, d, hp: y.m.hp, eff: 2, type: "paper", cat: "s", from: { s: 1, i: a.i } });
            if (y.m.hp <= 0) faint(st, 0, y.i, ev, null);
        }
        return;
    }
    baseSpecial(st, id, a, ev);
};
export const PERK_LIST = PERKS; export const STATUS_LIST = STATUS;
