// The battle resolver. Pure integers and one seeded generator: the same teams and seed give the same event list in any engine,
// so a replay is just the same call again. The view never decides anything; it only plays back `events`.
import { CELLS, COLS, FAST, NORMAL, PET, ROWS, SLOW, TOKENS, TRAITS, TRAIT_IDS, abN, statOf } from "./data.js";

export const CHARGE = 100, CLOSING_BEAT = 20, MAX_BEATS = 44, TICK_EVERY = 4;

export function rngOf(seed) {
    let a = seed >>> 0;
    const next = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (t ^ (t >>> 14)) >>> 0; };
    return { next, int: (n) => next() % n, chance: (pct) => next() % 100 < pct };
}
export const hashStr = (h, s) => { for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

/** Trait levels for a list of { id, extra } pets. Each distinct pet counts once. Returns { trait: { count, lvl } }; lvl 0 is inactive. */
export function traitCounts(pets) {
    const seen = {}, out = {};
    for (const p of pets) {
        const def = PET[p.id]; if (!def) continue;
        for (const t of p.extra ? [...def.traits, p.extra] : def.traits) {
            const k = `${t}:${p.id}`; if (seen[k]) continue; seen[k] = 1;
            (out[t] ??= { count: 0, lvl: 0 }).count++;
        }
    }
    for (const t in out) {
        const c = out[t].count, tiers = TRAITS[t].tiers;
        if (t === "diva" && c === 2) { out[t].lvl = 0; continue; }
        let l = 0; for (const need of tiers) if (c >= need) l++;
        out[t].lvl = l;
    }
    return out;
}
export const traitVal = (t, lvl, i) => TRAITS[t].vals[lvl - 1][i];

function makeUnit(B, side, p, uid) {
    const def = PET[p.id] ?? TOKENS[p.id], star = p.star ?? 1;
    const atk = (p.token ? p.atk : statOf(def.atk, star)) + (p.atkB ?? 0), hp = (p.token ? p.hp : statOf(def.hp, star)) + (p.hpB ?? 0);
    const traits = p.extra ? [...def.traits, p.extra] : def.traits;
    return { uid, side, id: p.id, star, cell: p.cell, atk, hp, maxHp: hp, shield: 0, charge: 0, spd: def.spd, ranged: !!def.ranged, traits, ab: def.ab ?? null, curse: 0, soak: 0, stun: 0, taunt: false, thorn: 0, alive: true, gone: false, attacks: 0, hurtBeat: -1, token: !!p.token, killer: null };
}

export function battle(teamA, teamB, seed) {
    const rng = rngOf(seed), units = [], ev = [];
    const B = { rng, units, ev, beat: 0, lv: [{}, {}], gold: [0, 0], side: [teamA, teamB], pending: [] };
    const addTeam = (team, side) => {
        const tc = traitCounts(team.pets);
        for (const t of TRAIT_IDS) B.lv[side][t] = tc[t]?.lvl ?? 0;
        B.gold[side] = team.gold ?? 0;
        team.pets.forEach((p) => { const u = makeUnit(B, side, p, units.length); units.push(u); });
    };
    addTeam(teamA, 0); addTeam(teamB, 1);
    ev.push({ k: "roster", units: units.map(snap) });
    startOfBattle(B);
    resolveFaints(B);
    while (!over(B) && B.beat < MAX_BEATS) beat(B);
    const a = living(B, 0).length, b = living(B, 1).length;
    const winner = a && !b ? "a" : b && !a ? "b" : "draw";
    ev.push({ k: "end", winner });
    let h = 2166136261;
    for (const e of ev) h = hashStr(h, `${e.k}|${e.u ?? ""}|${e.v ?? ""}|${e.n ?? ""}|${e.hp ?? ""}`);
    return { winner, events: ev, beats: B.beat, hash: h, left: [a, b], unitsLeft: [survivorPower(B, 0), survivorPower(B, 1)], gold: B.gold };
}
const snap = (u) => ({ uid: u.uid, side: u.side, id: u.id, star: u.star, cell: u.cell, atk: u.atk, hp: u.hp, maxHp: u.maxHp, shield: u.shield, ranged: u.ranged, token: u.token });
const living = (B, side) => B.units.filter((u) => u.alive && u.side === side);
const over = (B) => !living(B, 0).length || !living(B, 1).length;
const survivorPower = (B, side) => living(B, side).reduce((n, u) => n + u.atk + u.hp, 0);
const col = (u) => u.cell % COLS, row = (u) => (u.cell / COLS) | 0;
const adjacent = (a, b) => a !== b && Math.abs(col(a) - col(b)) + Math.abs(row(a) - row(b)) === 1;
const say = (B, e) => B.ev.push({ ...e, beat: B.beat });

function startOfBattle(B) {
    for (const side of [0, 1]) {
        const lv = B.lv[side], foes = living(B, 1 - side), us = living(B, side);
        for (const t of TRAIT_IDS) if (lv[t]) say(B, { k: "trait", side, trait: t, lvl: lv[t] });
        if (lv.diva) { const pct = traitVal("diva", lv.diva, 0); for (const u of us) if (u.traits.includes("diva")) { u.atk += (u.atk * pct / 100) | 0; const add = (u.hp * pct / 100) | 0; u.hp += add; u.maxHp += add; say(B, { k: "buff", u: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp, tag: "diva" }); } const every = traitVal("diva", lv.diva, 1); if (every) for (const u of us) { u.atk += every; say(B, { k: "buff", u: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp }); } }
        if (lv.fluff) { const pct = traitVal("fluff", lv.fluff, 1); for (const u of us) if (u.traits.includes("fluff")) { const add = (u.hp * pct / 100) | 0; u.hp += add; u.maxHp += add; say(B, { k: "buff", u: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp, tag: "fluff" }); } }
        if (lv.beef) { const sh = traitVal("beef", lv.beef, 0), th = traitVal("beef", lv.beef, 1), tn = traitVal("beef", lv.beef, 2); for (const u of us) if (u.traits.includes("beef")) { addShield(B, u, sh, "beef"); u.thorn = th; if (tn && row(u) === 0) { u.taunt = true; say(B, { k: "taunt", u: u.uid }); } } }
        if (lv.band) { const pct = traitVal("band", lv.band, 0), every = traitVal("band", lv.band, 1); for (const u of us) { const p = (u.traits.includes("band") ? pct : 0) + every; if (p) u.spd += (u.spd * p / 100) | 0; } }
    }
    for (const side of [0, 1]) {
        const lv = B.lv[side];
        if (lv.suit) { const n = traitVal("suit", lv.suit, 0); say(B, { k: "banner", side, trait: "suit", text: "AUDIT!" }); for (const f of living(B, 1 - side)) weaken(B, f, n, "suit"); }
        if (lv.grem) { const n = traitVal("grem", lv.grem, 0); say(B, { k: "banner", side, trait: "grem", text: "SHOVED!" }); for (let i = 0; i < n; i++) shove(B, 1 - side); }
    }
    const order = B.units.slice();
    for (const u of order) if (u.alive && u.ab?.on === "start") ability(B, u, null);
}
function shove(B, side) {
    const list = living(B, side); if (!list.length) return;
    const u = list[B.rng.int(list.length)], to = B.rng.int(CELLS), other = list.find((o) => o.cell === to);
    if (other === u) return;
    if (other) { other.cell = u.cell; say(B, { k: "move", u: other.uid, cell: other.cell }); }
    u.cell = to; say(B, { k: "move", u: u.uid, cell: to });
}
function beat(B) {
    B.beat++;
    const closing = B.beat >= CLOSING_BEAT;
    say(B, { k: "beat", closing });
    // Faster units go first, ties by seeded shuffle, so simultaneous charges never depend on array order.
    const order = B.units.filter((u) => u.alive).map((u) => [u, B.rng.next()]).sort((a, b) => b[0].spd - a[0].spd || a[1] - b[1]).map((x) => x[0]);
    for (const u of order) {
        if (!u.alive) continue;
        if (u.stun > 0) { u.stun--; continue; }
        u.charge += u.spd;
        if (u.ab?.on === "tick" && B.beat % TICK_EVERY === 0) { ability(B, u, null); resolveFaints(B); if (over(B)) return; }
        if (u.charge >= CHARGE && u.atk > 0) { u.charge -= CHARGE; attack(B, u); resolveFaints(B); if (over(B)) return; }
        else if (u.charge >= CHARGE) u.charge = 0;
    }
    if (B.beat % 2 === 0) for (const side of [0, 1]) if (B.lv[side].fluff) {
        const n = traitVal("fluff", B.lv[side].fluff, 0), us = living(B, side);
        for (const u of us) if (u.traits.includes("fluff")) {
            let best = null; for (const o of us) if (adjacent(u, o) && o.hp < o.maxHp && (!best || o.hp * best.maxHp < best.hp * o.maxHp)) best = o;
            if (best) heal(B, best, n, u);
        }
    }
    for (const u of B.units) if (u.alive && u.curse) { strike(B, null, u, u.curse, "curse", true); }
    resolveFaints(B);
    if (closing) { const n = (B.beat - CLOSING_BEAT + 1) * 2; say(B, { k: "closing", n }); for (const u of B.units) if (u.alive) strike(B, null, u, n, "closing", true); resolveFaints(B); }
}
function pickNear(list, u, rng) {
    let best = [], d = 99;
    for (const o of list) { const dist = Math.abs(col(o) - col(u)); if (dist < d) { d = dist; best = [o]; } else if (dist === d) best.push(o); }
    return best.length > 1 ? best[rng.int(best.length)] : best[0];
}
function chooseTarget(B, u) {
    const foes = living(B, 1 - u.side), taunts = foes.filter((f) => f.taunt);
    if (taunts.length) return pickNear(taunts, u, B.rng);
    const front = foes.filter((f) => row(f) === 0), back = foes.filter((f) => row(f) === 1);
    if (u.ranged) return pickNear(back.length ? back : front, u, B.rng);
    return pickNear(front.length ? front : back, u, B.rng);
}
function attack(B, u) {
    const v = chooseTarget(B, u); if (!v) return;
    const lv = B.lv[u.side];
    u.attacks++;
    let dmg = u.atk, crit = false;
    if (lv.grem && u.traits.includes("grem") && B.rng.chance(traitVal("grem", lv.grem, 1))) { dmg *= 2; crit = true; }
    say(B, { k: "attack", u: u.uid, v: v.uid, ranged: u.ranged, crit });
    strike(B, u, v, dmg, u.ranged ? "shot" : "melee", false, crit);
    if (lv.hex && u.traits.includes("hex") && v.alive) addCurse(B, v, traitVal("hex", lv.hex, 0));
    if (lv.wet) {
        const pct = traitVal("wet", lv.wet, 0), bonus = traitVal("wet", lv.wet, 1);
        if (v.alive) { v.soak = Math.max(v.soak, bonus); say(B, { k: "soak", u: v.uid }); }
        const n = Math.max(1, (dmg * pct / 100) | 0);
        for (const f of living(B, v.side)) if (adjacent(v, f)) { f.soak = Math.max(f.soak, bonus); strike(B, u, f, n, "splash", true); }
    }
    if (lv.zap) {
        const hops = traitVal("zap", lv.zap, 0), pct = traitVal("zap", lv.zap, 1), n = Math.max(1, (dmg * pct / 100) | 0);
        const others = living(B, v.side).filter((f) => f !== v);
        for (let i = 0; i < hops && others.length; i++) { const f = others.splice(B.rng.int(others.length), 1)[0]; strike(B, u, f, f.soak ? n * 2 : n, "zap", true); }
    }
    if (u.alive && u.ab?.on === "hit" && (!u.ab.every || u.attacks % u.ab.every === 0)) ability(B, u, v);
}
/** All damage funnels here. `pure` hits skip thorns and hit triggers. */
function strike(B, src, v, n, kind, pure, crit) {
    if (!v.alive) return;
    if (v.soak && kind !== "curse" && kind !== "closing") n += v.soak;
    let left = n;
    if (kind !== "curse" && kind !== "closing" && v.shield) { const a = Math.min(v.shield, left); v.shield -= a; left -= a; }
    v.hp -= left;
    say(B, { k: "hit", u: src?.uid ?? -1, v: v.uid, n, kind, crit: !!crit, hp: Math.max(0, v.hp), sh: v.shield });
    if (v.hp <= 0) { v.alive = false; v.killer = src; B.pending.push(v); return; }
    if (!pure && src && kind === "melee" && v.thorn && src.alive) strike(B, null, src, v.thorn, "thorn", true);
    if (v.ab?.on === "hurt" && v.hurtBeat !== B.beat && kind !== "curse" && kind !== "closing") { v.hurtBeat = B.beat; ability(B, v, src); }
}
function resolveFaints(B) {
    let guard = 0;
    while (B.pending.length && guard++ < 64) {
        const u = B.pending.shift();
        if (u.gone) continue; u.gone = true;
        say(B, { k: "faint", u: u.uid, by: u.killer?.uid ?? -1 });
        const k = u.killer;
        if (u.ab?.on === "faint") ability(B, u, k);
        const lv = B.lv[u.side];
        if (lv.tiny && u.traits.includes("tiny") && !u.token) summon(B, u, "grub", traitVal("tiny", lv.tiny, 0), traitVal("tiny", lv.tiny, 1));
        if (lv.goth) { const n = traitVal("goth", lv.goth, 0); for (const o of living(B, u.side)) if (o.traits.includes("goth")) { o.atk += n; say(B, { k: "buff", u: o.uid, atk: o.atk, hp: o.hp, maxHp: o.maxHp, tag: "goth" }); } }
        for (const o of living(B, u.side)) if (o.ab?.on === "allyfaint") ability(B, o, null);
        const flv = B.lv[1 - u.side];
        if (flv.hex >= 3 && u.curse) { const near = living(B, u.side).filter((o) => adjacent(u, o)); for (const o of near) addCurse(B, o, u.curse); }
        if (k?.alive && k.ab?.on === "kill") ability(B, k, u);
    }
}
function addShield(B, u, n, tag) { u.shield += n; say(B, { k: "shield", u: u.uid, n, sh: u.shield, tag }); }
function addCurse(B, u, n) { u.curse += n; say(B, { k: "curse", u: u.uid, n, c: u.curse }); }
function weaken(B, u, n, tag) { const was = u.atk; u.atk = Math.max(1, u.atk - n); if (u.atk !== was) say(B, { k: "buff", u: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp, tag: tag ?? "weaken" }); }
function heal(B, u, n, src) { const add = Math.min(n, u.maxHp - u.hp); if (add <= 0) return; u.hp += add; say(B, { k: "heal", u: u.uid, n: add, hp: u.hp, src: src?.uid ?? -1 }); }
function summon(B, owner, id, n, atkPlus = 0) {
    const tok = TOKENS[id], star = owner.star;
    const used = new Set(living(B, owner.side).map((u) => u.cell));
    for (let i = 0; i < n; i++) {
        let best = -1, bd = 99;
        for (let c = 0; c < CELLS; c++) { if (used.has(c)) continue; const d = Math.abs(c % COLS - col(owner)) + Math.abs(((c / COLS) | 0) - row(owner)); if (d < bd) { bd = d; best = c; } }
        if (best < 0) return;
        used.add(best);
        const u = makeUnit(B, owner.side, { id, star: 1, cell: best, token: true, atk: tok.atk + star - 1 + atkPlus, hp: tok.hp + (star - 1) * 2 }, B.units.length);
        B.units.push(u);
        say(B, { k: "summon", unit: snap(u), from: owner.uid });
    }
}
function targets(B, u, who, foe) {
    const us = living(B, u.side), them = living(B, 1 - u.side);
    switch (who) {
        case "self": return [u];
        case "foe": return foe?.alive ? [foe] : them.length ? [them[B.rng.int(them.length)]] : [];
        case "adj": return us.filter((o) => adjacent(u, o));
        case "front": return us.filter((o) => row(o) === 0);
        case "back": return us.filter((o) => row(o) === 1);
        case "all": return us;
        case "rand": return us.length ? [us[B.rng.int(us.length)]] : [];
        case "erand": return them.length ? [them[B.rng.int(them.length)]] : [];
        case "ehigh": { let b = null; for (const o of them) if (!b || o.atk + o.hp > b.atk + b.hp) b = o; return b ? [b] : []; }
        case "elow": { let b = null; for (const o of them) if (!b || o.hp < b.hp) b = o; return b ? [b] : []; }
        case "eall": return them;
        case "efront": { const f = them.filter((o) => row(o) === 0); return f.length ? f : them; }
        case "eback": { const f = them.filter((o) => row(o) === 1); return f.length ? f : them; }
        case "elane": { const f = them.filter((o) => col(o) === col(u)); return f.length ? f : them.slice(0, 1); }
    }
    return [];
}
function ability(B, u, foe) {
    const ab = u.ab; if (!ab) return;
    const n = abN(ab, u.star);
    if (ab.fx === "summon") { say(B, { k: "proc", u: u.uid, fx: ab.fx }); summon(B, u, ab.who, n); return; }
    if (ab.fx === "gold") { B.gold[u.side] += 0; return; }
    if (ab.fx === "perm" || ab.fx === "permhp" || ab.fx === "permatk") return;
    const list = targets(B, u, ab.who, foe);
    if (!list.length) return;
    say(B, { k: "proc", u: u.uid, fx: ab.fx });
    for (const t of list) switch (ab.fx) {
        case "atk": t.atk += n; say(B, { k: "buff", u: t.uid, atk: t.atk, hp: t.hp, maxHp: t.maxHp }); break;
        case "hp": t.hp += n; t.maxHp += n; say(B, { k: "buff", u: t.uid, atk: t.atk, hp: t.hp, maxHp: t.maxHp }); break;
        case "weaken": weaken(B, t, n); break;
        case "shield": addShield(B, t, n); break;
        case "heal": heal(B, t, n, u); break;
        case "haste": t.charge += n; say(B, { k: "haste", u: t.uid }); break;
        case "dmg": strike(B, u, t, n, "ability", true); break;
        case "curse": addCurse(B, t, n); break;
        case "stun": t.stun += n; say(B, { k: "stun", u: t.uid, n }); break;
        case "soak": t.soak = Math.max(t.soak, 1); say(B, { k: "soak", u: t.uid }); break;
        case "taunt": t.taunt = true; say(B, { k: "taunt", u: t.uid }); break;
        case "copy": if (t.atk > u.atk) { u.atk = t.atk; say(B, { k: "buff", u: u.uid, atk: u.atk, hp: u.hp, maxHp: u.maxHp }); } break;
    }
}
