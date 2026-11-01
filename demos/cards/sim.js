// The pure rules of Hex & Cards. No drawing, no timers, only JSON-safe state in `run`, so a run can be
// saved at any moment and a bot can play thousands of them. All randomness comes from seeded streams
// kept in run.rs, which are themselves seeded from game.rng by the caller.
import { CARDS, REWARDABLE, cardCost, cardVals } from "./data/cards.js";
import { ELS, REACTIONS, WITCHES } from "./data/rules.js";
import { TRINKETS } from "./data/trinkets.js";
import { ACT_NAMES, BOSSES, ENCOUNTERS, ENEMIES } from "./data/enemies.js";
import { EVENTS } from "./data/events.js";

export const SAVE_VERSION = 3;
export const TUNE = { normal: [1.3, 1.5, 1.7, 1.75], elite: [1.3, 1.55, 1.75, 1.8], boss: [1.2, 1.5, 1.7, 1.85], dmg: [1, 1.05, 1.2, 1.3] };
export const MAX_FIRES = 300;
export const BASE_CAP = 5, BASE_HEAT = 3, BASE_DRAW = 5, MAX_HAND = 10;
export const ACTS = 4, ROWS = 8, COLS = 5;

// ---- Seeded streams ----
function next(rs, key) {
    let a = rs[key] = (rs[key] + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const stream = (run, key) => {
    const f = () => next(run.rs, key);
    return {
        next: f,
        int: (a, b) => a + Math.floor(f() * (b - a + 1)),
        chance: (p) => f() < p,
        pick: (arr) => arr[Math.floor(f() * arr.length)],
        shuffle: (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    };
};
export const has = (run, id) => run.trinkets.includes(id);
const sum = (run, field) => run.trinkets.reduce((n, id) => n + (TRINKETS[id][field] ?? 0), 0);
const product = (run, field) => run.trinkets.reduce((n, id) => n * (TRINKETS[id][field] ?? 1), 1);

function hook(run, c, name, x, ...args) {
    for (const id of run.trinkets) {
        const fn = TRINKETS[id].hooks[name];
        if (!fn) continue;
        const before = x?.ev?.length;
        fn({ run, c, x, m: run.tmem[id] ??= {}, api: runApi(run, x?.ev) }, ...args);
        if (x && !x.dry && name !== "brewStart" && x.ev.length !== before) x.ev.push({ t: "trinket", id });
    }
}

// ---- Cards in play ----
let uid = 1;
export const makeCard = (run, id, up = 0) => ({ id, up, u: run ? run.nextU++ : uid++ });
const def = (card) => CARDS[card.id];
export function costOf(c, card, run) {
    const base = card.free ? 0 : cardCost(def(card), card.up);
    if (run && c.placed === 0 && sum(run, "firstFree")) return 0;
    return base;
}
export const potSize = (run, c) => Math.max(2, BASE_CAP + sum(run, "cap") - (c.p.st.lid > 0 ? 1 : 0));
export const potUsed = (c) => c.brew.filter((t) => !t.light).length;
export const canPlace = (run, card) => {
    const c = run.combat;
    if (!c || c.over) return false;
    const d = def(card);
    if (costOf(c, card, run) > c.heat) return false;
    return d.instant || d.light || potUsed(c) < potSize(run, c);
};

// ---- A brew in progress: the context every card, reaction and trinket writes through ----
export class Brew {
    constructor(run, c, ev, dry) {
        this.run = run; this.c = c; this.ev = ev; this.dry = dry;
        this.tokens = c.brew; this.potency = 1 + (c.seedPot ?? 0); this.mult = 1; this.pendNext = 1; this.fires = 0; this.flat = 0;
        this.total = 0; this.wardGain = 0; this.healGain = 0; this.index = 0; this.depth = 0; this.maxDepth = 4; this.refiring = false;
        this.pend = 0; this.pendList = null; this.extra = 0; this.card = null; this.over = false; this.rxCount = 0;
    }
    get first() { return this.index === 0; }
    get last() { return this.index === this.tokens.length - 1; }
    get target() {
        const c = this.c, t = c.enemies[c.target];
        return t && t.hp > 0 ? t : c.enemies.find((e) => e.hp > 0) ?? null;
    }
    alive() { return this.c.enemies.filter((e) => e.hp > 0); }
    scale(n) {
        const w = this.c.p.st.weak > 0 ? 0.75 : 1;
        return Math.floor((n + this.flat) * this.potency * this.mult * w + 1e-6);
    }
    push(e) { if (!this.dry) this.ev.push(e); }
    // Numbers
    hit(e, v, source) {
        if (!e) { this.total += v; this.push({ t: "miss", v }); return false; }
        const c = this.c;
        if (e.st.hex > 0) v = Math.floor(v * 1.5);
        const blocked = Math.min(e.ward, v), through = v - blocked;
        e.ward -= blocked; e.hp -= through; this.total += v;
        c.brewDmg += through;
        this.push({ t: "hit", e: c.enemies.indexOf(e), v, blocked, hp: Math.max(0, e.hp), ward: e.ward, el: this.card?.el, big: v >= 30 });
        return this.after(e, source);
    }
    after(e) {
        const c = this.c;
        if (e.hp > 0 && (e.st.doom ?? 0) * (e.boss ? 0.5 : 1) >= e.hp) {
            e.hp = 0; c.doomKills = (c.doomKills ?? 0) + 1;
            this.push({ t: "die", e: c.enemies.indexOf(e), doom: true });
            this.killed(e);
            return true;
        }
        if (e.hp <= 0 && !e.dead) {
            this.push({ t: "die", e: c.enemies.indexOf(e) });
            this.killed(e);
            return true;
        }
        return false;
    }
    killed(e) {
        e.dead = true; e.hp = 0;
        const c = this.c;
        if (e.id === "ysolde") for (const o of c.enemies) if (o.hp > 0) { o.hp = 0; o.dead = true; this.push({ t: "die", e: c.enemies.indexOf(o) }); }
    }
    dmg(n) { return this.hit(this.target, this.scale(n)); }
    rawDmg(n) { return this.hit(this.target, Math.floor(n)); }
    aoe(n) { const v = this.scale(n); let k = false; for (const e of this.alive()) k = this.hit(e, v) || k; return k; }
    rawAoe(n) { for (const e of this.alive()) this.hit(e, Math.floor(n)); }
    ward(n) {
        const frail = this.c.p.st.frail > 0 ? 0.75 : 1;
        this.rawWard(Math.floor(this.scale(n) * frail));
    }
    rawWard(n) { this.c.p.ward += n; this.wardGain += n; this.push({ t: "ward", v: n, ward: this.c.p.ward }); }
    heal(n) {
        const r = this.run, before = r.hp;
        r.hp = Math.min(r.maxHp, r.hp + Math.floor(n * Math.sqrt(this.potency)));
        const g = r.hp - before;
        this.healGain += g; this.c.healed = (this.c.healed ?? 0) + g;
        this.push({ t: "heal", v: g, hp: r.hp });
    }
    lose(n) { const r = this.run; r.hp = Math.max(1, r.hp - n); this.push({ t: "lose", v: n, hp: r.hp }); }
    status(e, k, n) {
        if (!e || n <= 0) return;
        e.st[k] = (e.st[k] ?? 0) + n;
        this.push({ t: "status", e: this.c.enemies.indexOf(e), k, v: e.st[k] });
        hook(this.run, this.c, "onStatus", this, k);
        if (k === "doom") this.after(e);
    }
    scaleSt(n) { return Math.max(1, this.scale(n)); }
    burn(n) { this.status(this.target, "burn", this.scaleSt(n)); }
    burnAll(n) { const v = this.scaleSt(n); for (const e of this.alive()) this.status(e, "burn", v); }
    // Timed statuses are multiplied gently, or one big brew would freeze a boss for a month.
    timed(n) { return Math.max(1, Math.min(n + 2, Math.floor(n * Math.sqrt(this.potency * this.mult)))); }
    chill(n) { this.status(this.target, "chill", this.timed(n)); }
    chillAll(n) { const v = this.timed(n); for (const e of this.alive()) this.status(e, "chill", v); }
    hex(n) { this.status(this.target, "hex", this.timed(n)); }
    hexAll(n) { const v = this.timed(n); for (const e of this.alive()) this.status(e, "hex", v); }
    doom(n) { this.status(this.target, "doom", this.scaleSt(n)); }
    doomAll(n) { const v = this.scaleSt(n); for (const e of this.alive()) this.status(e, "doom", v); }
    doomQuiet(n) { const e = this.target; if (e) { e.st.doom = (e.st.doom ?? 0) + n; this.push({ t: "status", e: this.c.enemies.indexOf(e), k: "doom", v: e.st.doom }); this.after(e); } }
    rawDoom(n) { this.status(this.target, "doom", n); }
    doubleDoom() { const e = this.target; if (e) this.status(e, "doom", e.st.doom ?? 0); }
    doubleDoomAll() { for (const e of this.alive()) this.status(e, "doom", e.st.doom ?? 0); }
    strip() { const e = this.target; if (e) { e.ward = 0; this.push({ t: "strip", e: this.c.enemies.indexOf(e) }); } }
    stripAll() { for (const e of this.alive()) { e.ward = 0; this.push({ t: "strip", e: this.c.enemies.indexOf(e) }); } }
    tst(k) { return this.target?.st[k] ?? 0; }
    thp() { return this.target?.hp ?? 0; }
    pward() { return this.c.p.ward; }
    chilledFoes() { return this.alive().filter((e) => e.st.chill > 0).length; }
    hexedFoes() { return this.alive().filter((e) => e.st.hex > 0).length; }
    knell() { for (const e of this.alive()) if ((e.st.doom ?? 0) * (e.boss ? 1 : 2) >= e.hp) { e.hp = 0; this.c.doomKills = (this.c.doomKills ?? 0) + 1; this.after(e); } }
    spreadStatus() {
        const t = this.target; if (!t) return;
        let best = null, v = 0;
        for (const k of ["burn", "doom", "hex", "chill"]) if ((t.st[k] ?? 0) > v) { v = t.st[k]; best = k; }
        if (best) for (const e of this.alive()) if (e !== t) this.status(e, best, v);
    }
    freezeAll() { for (const e of this.alive()) e.stun = 1; this.push({ t: "freeze" }); }
    // Potency
    pot(n) { if (n === 0) return; this.potency = Math.round((this.potency + n) * 100) / 100; this.push({ t: "pot", v: this.potency }); }
    nextMul(m) { this.pendNext *= m; this.push({ t: "next", v: this.pendNext }); }
    seedPot(n) { this.c.seedNext = (this.c.seedNext ?? 0) + n; }
    twice() { this.extra += 1; }
    reflux(n) { this.pend = Math.max(this.pend, n); }
    refluxEl(el) { const l = []; for (let i = 0; i < this.index; i++) if (this.tokens[i].el === el) l.push(i); this.pendList = l; }
    refluxBack() { const l = []; for (let i = this.index - 1; i >= 0; i--) l.push(i); this.pendList = l; }
    deeper(n) { this.maxDepth += n; }
    // Counts
    count(el) { return this.tokens.filter((t) => t.el === el).length; }
    countBefore(el) { return this.tokens.slice(0, this.index).filter((t) => t.el === el).length; }
    distinct() { return new Set(this.tokens.map((t) => t.el).filter((e) => e !== "gunk")).size; }
    gunkOwned() { const c = this.c; return [...c.hand, ...c.draw, ...c.disc, ...c.gone, ...c.brew].filter((k) => def(k).el === "gunk").length; }
    held() { return this.card?.heldT ?? 0; }
    // Other
    gold(n) { const r = this.run; r.gold = Math.max(0, r.gold + n); this.push({ t: "gold", v: n, gold: r.gold }); }
    heatNext(n) { this.c.heatExtra = (this.c.heatExtra ?? 0) + n; this.push({ t: "note", text: `+${n} Heat next turn` }); }
    drawNext(n) { this.c.drawExtra = Math.min(5, (this.c.drawExtra ?? 0) + n); this.push({ t: "note", text: `+${n} card next turn` }); }
    draw(n) { drawCards(this.run, this.c, n, this.ev, this.dry); }
    heat(n) { this.c.heat += n; this.push({ t: "heat", v: this.c.heat }); }
    heatEvery(n) { this.c.heatEvery = (this.c.heatEvery ?? 0) + n; this.push({ t: "note", text: `+${n} Heat every turn` }); }
    holdWard() { this.c.holdWard = 1; this.push({ t: "note", text: "Ward will keep" }); }
    addGunk(n) { for (let i = 0; i < n; i++) this.c.disc.push(makeCard(this.run, "gunk")); }
    returnSelf() { if (this.card) this.card.toHand = 1; }
    secondBoil() { this.c.second = 1; this.push({ t: "note", text: "Second boil coming!" }); }
    scour() {
        const c = this.c, isG = (k) => def(k).el === "gunk";
        const n = c.hand.filter(isG).length + c.brew.filter(isG).length;
        for (const k of [...c.hand.filter(isG), ...c.brew.filter(isG)]) c.gone.push(k);
        c.hand = c.hand.filter((k) => !isG(k)); c.brew = c.brew.filter((k) => !isG(k)); this.tokens = c.brew;
        drawCards(this.run, c, n, this.ev, this.dry);
    }
    mem(k) { return this.c.mem[`${this.card?.u}:${k}`] ?? 0; }
    memAdd(k, n) { const key = `${this.card?.u}:${k}`; this.c.mem[key] = (this.c.mem[key] ?? 0) + n; }
    cardMem(k) { return this.run.deck.find((d) => d.u === this.card?.u)?.[k] ?? 0; }
    cardMemAdd(k, n) { if (this.dry) return; const d = this.run.deck.find((q) => q.u === this.card?.u); if (d) d[k] = (d[k] ?? 0) + n; }
    copyLeft() {
        let i = this.index - 1;
        while (i >= 0 && this.tokens[i].id === "mirrorpool") i--;
        const l = this.tokens[i];
        if (!l) return;
        const d = def(l);
        d.fx(this, cardVals(d, l.up));
    }
    // The heart of it.
    fire(i, opts = {}) {
        if (this.over) return;
        if (this.fires >= MAX_FIRES) { this.boilOver(); return; }
        const t = this.tokens[i]; if (!t) return;
        const d = def(t), left = opts.left ?? this.tokens[i - 1];
        const savedI = this.index, savedCard = this.card;
        this.index = i; this.card = t; this.extra = 0;
        const stew = stewOf(this.run, t);
        if (left && left.el !== "gunk" && t.el !== "gunk") {
            const key = `${left.el}>${t.el}`, rx = REACTIONS[key];
            if (rx) {
                this.rxCount++;
                this.push({ t: "rx", i, l: this.tokens.indexOf(left), key, name: rx.name, color: rx.color, depth: this.depth });
                if (!this.dry) { const s = this.run.stats; s.rx[key] = (s.rx[key] ?? 0) + 1; }
                rx.fx(this);
                hook(this.run, this.c, "onReaction", this, key, rx);
            }
        }
        if (this.mult === 1) this.mult = 1;
        hook(this.run, this.c, "beforeFire", this, t);
        const times = 1 + this.extra;
        this.mult *= stew;
        if (this.c.forbid && t.el === this.c.forbid) { this.mult *= 0.5; this.push({ t: "fizzle", i }); }
        for (let n = 0; n < times; n++) {
            this.fires++;
            const before = this.total;
            this.push({ t: "fire", i, id: t.id, n: this.fires, pot: this.potency, mult: this.mult, depth: this.depth, el: t.el, repeat: this.depth > 0 || n > 0 });
            d.fx(this, cardVals(d, t.up));
            if (t.el === "ember" && this.run.witch === "posy" && !this.run.prologue) this.flareTick();
            if (!this.dry) { const s = this.run.stats.cards; const e = s[t.id] ??= { fires: 0, dmg: 0 }; e.fires++; e.dmg += this.total - before; }
            hook(this.run, this.c, "afterFire", this, t);
            if (this.over) break;
        }
        this.mult = this.pendNext; this.pendNext = 1;
        const list = this.pendList, pend = this.pend;
        this.pendList = null; this.pend = 0;
        if ((list || pend > 0) && this.depth < this.maxDepth) {
            const idx = list ?? Array.from({ length: Math.min(pend, i) }, (_, k) => i - Math.min(pend, i) + k);
            if (idx.length) this.push({ t: "reflux", i, n: idx.length, depth: this.depth });
            this.depth++;
            const was = this.refiring; this.refiring = true;
            for (const j of idx) { if (this.over) break; this.fire(j); }
            this.refiring = was; this.depth--;
        }
        this.index = savedI; this.card = savedCard;
    }
    flareTick() {
        const c = this.c, need = has(this.run, "sparewick") ? 2 : 3;
        c.flare = (c.flare ?? 0) + 1;
        this.push({ t: "flareTick", v: c.flare, need });
        if (c.flare >= need) { c.flare = 0; this.push({ t: "flare" }); this.pot(1); this.ward(5); this.burnAll(2); }
    }
    boilOver() {
        this.over = true;
        this.push({ t: "boilover" });
        for (const e of this.alive()) this.hit(e, e.boss ? Math.ceil(e.maxHp * 0.6) : 9999);
    }
    all() {
        hook(this.run, this.c, "brewStart", this);
        this.mult = this.mult * this.pendNext; this.pendNext = 1;
        const n = this.tokens.length;
        for (let i = 0; i < n && !this.over; i++) this.fire(i);
        if (this.run.witch === "vesper" && n > 0 && !this.over) {
            this.push({ t: "ring" });
            this.refiring = true;
            this.fire(0, { left: this.tokens[n - 1] });
            if (has(this.run, "mobius") && n > 1) this.fire(1);
            this.refiring = false;
        }
        hook(this.run, this.c, "brewEnd", this);
    }
}

/** Old Stock's multiplier: slow, and capped, so one ingredient can't carry a whole deck. */
export const stewOf = (run, t) => (t.stew ? Math.min(has(run, "stewpot") ? 3 : 2, 1 + t.stew * (has(run, "stewpot") ? 0.5 : 0.25)) : 1);
// ---- Combat flow ----
export function makeEnemy(run, id, rng) {
    const d = ENEMIES[id];
    let hp = Math.round(rng.int(d.hp[0], d.hp[1]) * (d.boss ? TUNE.boss : d.elite ? TUNE.elite : TUNE.normal)[run.act]);
    if (run.asc >= 4) hp = Math.ceil(hp * 1.1);
    if (d.boss && run.asc >= 8) hp = Math.ceil(hp * 1.12);
    return { id, name: d.name, hp, maxHp: hp, ward: 0, st: {}, str: 0, turn: 0, boss: !!d.boss, elite: !!d.elite, move: null };
}
function planMove(run, c, e) {
    if (e.hp <= 0) return;
    const d = ENEMIES[e.id];
    e.move = d.ai(e, e.turn);
}
export function moveOf(e) { return e.move ? ENEMIES[e.id].moves[e.move] : null; }
export function intentDamage(run, c, e) {
    const m = moveOf(e);
    if (!m?.dmg) return 0;
    let v = (m.dmg + e.str) * TUNE.dmg[run.act];
    if (e.elite && run.asc >= 1) v *= 1.15;
    if (run.asc >= 7) v *= 1.1;
    if (e.st.chill > 0) v *= 0.75;
    return Math.floor(v);
}
export function startCombat(run, ids, kind) {
    const rng = stream(run, "combat");
    const enemies = ids.map((id) => makeEnemy(run, id, rng));
    const cards = rng.shuffle(run.deck.map((k) => ({ ...k })));
    const c = run.combat = {
        kind, enemies, hand: [], draw: cards, disc: [], gone: [], brew: [], p: { ward: 0, st: {} }, heat: 0, turn: 0, target: 0, placed: 0, mem: {}, brews: 0, brewDmg: 0,
    };
    for (const e of enemies) planMove(run, c, e);
    const ev = [];
    hook(run, c, "combatStart", { ev: [], dry: true });
    startTurn(run, c, ev);
    run.screen = "combat";
    return ev;
}
function drawCards(run, c, n, ev, dry) {
    const rng = stream(run, "combat"), out = [];
    for (let i = 0; i < n; i++) {
        if (c.hand.length >= MAX_HAND) break;
        if (!c.draw.length) {
            if (!c.disc.length) break;
            c.draw = rng.shuffle(c.disc); c.disc = [];
            if (!dry) ev.push({ t: "shuffle" });
        }
        const k = c.draw.pop(); k.toHand = 0; k.free = 0;
        c.hand.push(k); out.push(k.u);
    }
    if (!dry && out.length) ev.push({ t: "draw", cards: out });
}
function startTurn(run, c, ev) {
    c.turn++; c.placed = 0; c.brewDmg = 0;
    if (c.holdWard) c.holdWard = 0; else if (c.turn > 1) c.p.ward = Math.floor(c.p.ward * sum(run, "wardKeep"));
    c.seedPot = c.seedNext ?? 0; c.seedNext = 0;
    const drain = c.p.st.drain > 0 ? 1 : 0;
    const carried = sum(run, "keepHeat") ? Math.min(1, c.leftHeat ?? 0) : 0;
    c.heat = Math.max(0, BASE_HEAT + sum(run, "heat") + (c.heatExtra ?? 0) + (c.heatEvery ?? 0) + carried - drain + (c.turn === 1 ? c.heatBonusFirst ?? 0 : 0));
    c.heatExtra = 0;
    // Enemy gunk lands in the pot and sticks.
    for (let i = 0; i < (c.potGunk ?? 0); i++) { const g = makeCard(run, "gunk"); g.el = "gunk"; g.stuck = 1; g.light = 0; c.brew.push(g); }
    c.potGunk = 0;
    const boss = c.enemies.find((e) => e.id === "codex" && e.hp > 0);
    c.forbid = boss ? stream(run, "combat").pick(ELS) : null;
    const n = BASE_DRAW + sum(run, "draw") + (c.drawExtra ?? 0) - (c.turn === 1 ? c.firstDrawPenalty ?? 0 : 0);
    c.drawExtra = 0;
    drawCards(run, c, n, ev);
    ev.push({ t: "turn", turn: c.turn, heat: c.heat, ward: c.p.ward });
}
/** Drop a card from the hand into the pot. pos is where in the chain; omitted means the end. */
export function place(run, handIndex, pos) {
    const c = run.combat, card = c.hand[handIndex];
    if (!card || !canPlace(run, card)) return null;
    const d = def(card), cost = costOf(c, card, run), ev = [];
    c.heat -= cost; c.placed++;
    c.hand.splice(handIndex, 1);
    if (d.instant) {
        const x = new Brew(run, c, ev, false);
        x.card = card; x.index = -1;
        ev.push({ t: "instant", id: card.id, el: d.el });
        d.fx(x, cardVals(d, card.up));
        run.stats.cards[card.id] = run.stats.cards[card.id] ?? { fires: 0, dmg: 0 };
        run.stats.cards[card.id].fires++;
        (d.boil ? c.gone : c.disc).push(card);
        if (allDead(c)) finishWin(run, c, ev);
        return ev;
    }
    card.el = d.el; card.paid = cost; card.light = d.light ? 1 : 0;
    const min = c.brew[0]?.stock ? 1 : 0;
    const at = pos === undefined ? c.brew.length : Math.max(min, Math.min(c.brew.length, pos));
    c.brew.splice(at, 0, card);
    return ev;
}
/** Take a token back out. Free for your own ingredients, 1 Heat to skim stuck Gunk. */
export function unplace(run, index) {
    const c = run.combat, t = c.brew[index];
    if (!t || t.stock) return false;
    if (t.stuck) {
        if (c.heat < 1) return false;
        c.heat -= 1;
        c.brew.splice(index, 1);
        return true;
    }
    c.brew.splice(index, 1);
    c.heat += t.paid ?? 0; c.placed = Math.max(0, c.placed - 1);
    t.paid = 0;
    c.hand.push(t);
    return true;
}
export const allDead = (c) => c.enemies.every((e) => e.hp <= 0);

/** Fire the brew, then let the enemies act, then start the next turn. Returns an event list to animate. */
export function brew(run) {
    const c = run.combat;
    if (!c || c.over) return [];
    const ev = [], x = new Brew(run, c, ev, false);
    c.brewDmg = 0;
    ev.push({ t: "brewStart", n: c.brew.length });
    const recipe = c.brew.map((t) => t.id);
    x.all();
    c.brews++;
    ev.push({ t: "brewEnd", total: x.total, fires: x.fires, pot: x.potency, ward: x.wardGain, rx: x.rxCount, recipe });
    const st = run.stats;
    st.fires += x.fires;
    if (x.total > st.best.dmg) st.best = { dmg: x.total, fires: x.fires, pot: x.potency, recipe };
    st.maxFires = Math.max(st.maxFires, x.fires);
    // Stock: Nan Thistle's last ingredient stews on.
    let stock = null;
    if (run.witch === "thistle" && c.brew.length) {
        const last = [...c.brew].reverse().find((t) => t.el !== "gunk");
        if (last) { stock = last; last.stock = 1; last.stew = (last.stew ?? 0) + 1; last.paid = 0; }
    }
    for (const t of c.brew) {
        if (t === stock) continue;
        t.stock = 0; t.stew = 0;
        const d = def(t);
        if (t.stuck) continue;
        if (t.toHand) { t.paid = 0; c.hand.push(t); continue; }
        (d.boil ? c.gone : c.disc).push(t);
    }
    c.brew = stock ? [stock] : [];
    if (allDead(c)) { finishWin(run, c, ev); return ev; }
    if (c.second) {
        c.second = 0;
        ev.push({ t: "second" });
        c.heat += 2; c.placed = 0;
        drawCards(run, c, 3, ev);
        return ev;
    }
    for (const e of c.enemies) if (e.id === "hollow" && e.hp > 0 && c.brewDmg >= 60 && e.turn % 5 !== 4) { e.stun = 1; ev.push({ t: "stumble", e: c.enemies.indexOf(e) }); }
    endTurn(run, c, ev);
    return ev;
}
function endTurn(run, c, ev) {
    c.leftHeat = c.heat;
    const keepOne = sum(run, "keepOne");
    const keep = [];
    c.hand.forEach((k, i) => {
        const d = def(k);
        if (d.keep || (keepOne && i === c.hand.length - 1 && d.el !== "gunk")) { k.heldT = (k.heldT ?? 0) + 1; keep.push(k); } else c.disc.push(k);
    });
    c.hand = keep;
    if (ev) ev.push({ t: "discard" });
    const rng = stream(run, "combat");
    const scald = c.p.st.scald ?? 0;
    if (scald > 0) { run.hp -= scald; ev.push({ t: "scald", v: scald, hp: run.hp }); if (checkDeath(run, c, ev)) return; }
    for (const k of ["weak", "frail", "lid", "drain"]) if (c.p.st[k] > 0) c.p.st[k]--;
    if (c.p.st.scald > 0) c.p.st.scald = Math.max(0, c.p.st.scald - 1);
    const x = new Brew(run, c, ev, false);
    for (let i = 0; i < c.enemies.length; i++) {
        const e = c.enemies[i];
        if (e.hp <= 0) continue;
        e.ward = 0;
        if (e.st.burn > 0) {
            e.hp -= e.st.burn;
            ev.push({ t: "burnTick", e: i, v: e.st.burn, hp: Math.max(0, e.hp) });
            e.st.burn = Math.max(0, e.st.burn - 1 - Math.floor(e.st.burn / 8));
            ev.push({ t: "status", e: i, k: "burn", v: e.st.burn });
            x.after(e);
            if (e.hp <= 0) continue;
        }
        if (e.stun) { e.stun = 0; ev.push({ t: "stunned", e: i }); e.turn++; planMove(run, c, e); continue; }
        act(run, c, e, i, ev, rng);
        if (run.hp <= 0 && checkDeath(run, c, ev)) return;
        if (e.st.chill > 0) { e.st.chill--; ev.push({ t: "status", e: i, k: "chill", v: e.st.chill }); }
        if (e.st.hex > 0) { e.st.hex--; ev.push({ t: "status", e: i, k: "hex", v: e.st.hex }); }
        e.turn++;
        planMove(run, c, e);
        ev.push({ t: "intent", e: i, move: e.move });
    }
    if (allDead(c)) { finishWin(run, c, ev); return; }
    startTurn(run, c, ev);
}
function act(run, c, e, i, ev, rng) {
    const m = moveOf(e);
    if (!m) return;
    ev.push({ t: "act", e: i, name: m.n });
    if (m.heal) { e.hp = Math.min(e.maxHp, e.hp + m.heal); ev.push({ t: "eheal", e: i, hp: e.hp }); }
    if (m.ward) { e.ward += m.ward; ev.push({ t: "eward", e: i, ward: e.ward }); }
    if (m.buff?.str) { e.str += m.buff.str; ev.push({ t: "ebuff", e: i, str: e.str }); }
    if (m.dmg) {
        const v = intentDamage(run, c, e);
        for (let h = 0; h < (m.hits ?? 1); h++) {
            const blocked = Math.min(c.p.ward, v), through = v - blocked;
            c.p.ward -= blocked; run.hp -= through;
            ev.push({ t: "ehit", e: i, v, blocked, ward: c.p.ward, hp: Math.max(0, run.hp) });
            if (run.hp <= 0) return;
        }
    }
    if (m.status) for (const k in m.status) { c.p.st[k] = (c.p.st[k] ?? 0) + m.status[k]; ev.push({ t: "pstatus", k, v: c.p.st[k], e: i }); }
    if (m.add?.gunk) { for (let n = 0; n < m.add.gunk; n++) c.disc.push(makeCard(run, "gunk")); ev.push({ t: "addGunk", n: m.add.gunk, e: i }); }
    if (m.pot) { c.potGunk = (c.potGunk ?? 0) + m.pot; ev.push({ t: "potGunk", n: m.pot, e: i }); }
    if (m.summon) for (const id of m.summon) {
        if (c.enemies.filter((o) => o.hp > 0).length >= 3) break;
        const n = makeEnemy(run, id, rng);
        planMove(run, c, n);
        const slot = c.enemies.findIndex((o) => o.hp <= 0 && o !== e);
        if (slot >= 0) c.enemies[slot] = n; else c.enemies.push(n);
        ev.push({ t: "summon", e: c.enemies.indexOf(n), id });
    }
}
function checkDeath(run, c, ev) {
    if (run.hp > 0) return false;
    if (has(run, "revive") && !run.tmem.revive?.used) {
        (run.tmem.revive ??= {}).used = 1;
        run.hp = Math.ceil(run.maxHp * 0.3);
        ev.push({ t: "revive", hp: run.hp });
        return false;
    }
    c.over = true; run.hp = 0;
    ev.push({ t: "defeat" });
    endRun(run, false);
    return true;
}
function finishWin(run, c, ev) {
    if (c.over) return;
    c.over = true;
    ev.push({ t: "win" });
    const st = run.stats;
    st.wins++;
    if (c.kind === "elite") st.elites++;
    if (c.kind === "boss") st.bosses++;
    hook(run, c, "combatEnd", { ev: [], dry: true });
    run.combat = null;
    const rng = stream(run, "reward");
    if (c.kind === "boss" && run.act === ACTS - 1) { endRun(run, true); return; }
    const r = run.reward = { gold: 0, cards: null, trinket: null, kind: c.kind };
    if (c.kind === "lesson") {
        r.gold = 10;
        r.cards = lessonCards(run);
        run.screen = "reward";
        return;
    }
    const base = c.kind === "boss" ? rng.int(70, 90) : c.kind === "elite" ? rng.int(30, 42) : rng.int(13, 21);
    r.gold = Math.floor(base * product(run, "goldMult") * (run.asc >= 5 ? 0.75 : 1));
    r.cards = rollCards(run, 3 + sum(run, "rewardCards"), c.kind === "elite" ? 2 : c.kind === "boss" ? 5 : 1);
    if (c.kind === "elite") r.trinket = rollTrinket(run, rng.chance(0.3) ? "uncommon" : "common");
    if (run.pendingRare) { run.pendingRare = 0; r.cards = rollCards(run, 3, 30); }
    run.screen = "reward";
}
export function endRun(run, won) {
    run.screen = "end"; run.won = won; run.combat = null;
    run.stats.floors = totalFloor(run);
}
export const totalFloor = (run) => run.act * (ROWS + 1) + Math.max(0, run.floor + 1);
export function preview(run) {
    const c = run.combat;
    if (!c) return null;
    const r2 = { ...run, rs: { ...run.rs }, tmem: JSON.parse(JSON.stringify(run.tmem)), stats: run.stats };
    const c2 = {
        ...c, p: { ward: c.p.ward, st: { ...c.p.st } }, enemies: c.enemies.map((e) => ({ ...e, st: { ...e.st } })), hand: c.hand.slice(), draw: c.draw.slice(), disc: c.disc.slice(),
        gone: c.gone.slice(), brew: c.brew.map((t) => ({ ...t })), mem: { ...c.mem },
    };
    r2.combat = c2;
    const ev = [], x = new Brew(r2, c2, ev, true);
    x.push = () => { };
    const rx = [];
    const realPush = x.ev;
    const f = x.fire.bind(x);
    x.all();
    let wardAfter = c2.p.ward;
    const dmgTo = c2.enemies.map((e, i) => Math.max(0, c.enemies[i].hp - e.hp));
    return { total: x.total, ward: x.wardGain, heal: x.healGain, pot: x.potency, fires: x.fires, kills: c2.enemies.filter((e, i) => e.hp <= 0 && c.enemies[i].hp > 0).length, wardAfter, dmgTo, hp: c2.enemies.map((e) => Math.max(0, e.hp)), rxn: x.rxCount, st: c2.enemies.map((e) => e.st), enemiesAfter: c2.enemies, gold: r2.gold - run.gold };
}
/** Reactions currently primed in the pot, for the view: pairs of adjacent tokens. */
export function primed(c, witch) {
    const out = [], b = c.brew;
    for (let i = 1; i < b.length; i++) {
        const key = `${b[i - 1].el}>${b[i].el}`, r = REACTIONS[key];
        if (r) out.push({ i, key, name: r.name, text: r.text, color: r.color });
    }
    if (witch === "vesper" && b.length > 1) {
        const key = `${b[b.length - 1].el}>${b[0].el}`, r = REACTIONS[key];
        if (r) out.push({ i: 0, ring: true, key, name: r.name, text: r.text, color: r.color });
    }
    return out;
}
export function incoming(run) {
    const c = run.combat;
    let n = 0;
    for (const e of c.enemies) if (e.hp > 0) n += intentDamage(run, c, e) * (moveOf(e)?.hits ?? 1);
    return n;
}

// ---- Rewards ----
function rewardPool(run, rar) {
    const w = WITCHES[run.witch];
    return REWARDABLE.filter((c) => c.rar === rar && (c.tier ?? 0) <= run.tier);
}
const PLAIN = /^(Deal \d+( to ALL| twice)?\.( Block \d+\.)?|Block \d+\.)$/;
const isPlain = (c) => (c.el === "ember" || c.el === "brine") && PLAIN.test(c.text.replace(/\{\w+\}/g, "1"));
/** Lessons only offer cards a newcomer can read at a glance. */
function lessonCards(run) {
    const rng = stream(run, "reward");
    return rng.shuffle(REWARDABLE.filter(isPlain)).slice(0, 3).map((c) => ({ id: c.id, up: 0 }));
}
const TRICKY = /Reflux|Doom|Hex|Light|Refire/;
function rollCards(run, n, luck) {
    const rng = stream(run, "reward"), w = WITCHES[run.witch], out = [];
    let tries = 0;
    while (out.length < n && tries++ < 200) {
        const roll = rng.next() * 100, rar = roll < 4 + luck * 3 ? "rare" : roll < 34 + luck * 3 ? "uncommon" : "common";
        let pool = rewardPool(run, rar);
        // A first climb stays simple until the Cellar is done.
        if (run.tutorial && run.act === 0) pool = pool.filter((c) => !TRICKY.test(c.text));
        if (!pool.length) continue;
        if (rng.chance(0.68)) { const aff = pool.filter((c) => w.els.includes(c.el)); if (aff.length) pool = aff; }
        const c = rng.pick(pool);
        if (out.some((k) => k.id === c.id)) continue;
        out.push({ id: c.id, up: run.act >= 2 && rng.chance(0.2) ? 1 : 0 });
    }
    return out;
}
function rollTrinket(run, rar) {
    const rng = stream(run, "reward");
    const pool = Object.values(TRINKETS).filter((t) => t.rar === rar && !has(run, t.id) && (!t.witch || t.witch === run.witch) && !run.locked.includes(t.id));
    if (!pool.length) {
        const any = Object.values(TRINKETS).filter((t) => t.rar !== "boss" && !has(run, t.id) && (!t.witch || t.witch === run.witch) && !run.locked.includes(t.id));
        return any.length ? rng.pick(any).id : null;
    }
    return rng.pick(pool).id;
}
export function gainTrinket(run, id) {
    if (!id || has(run, id)) return;
    run.trinkets.push(id);
    const fn = TRINKETS[id].hooks.pickup;
    if (fn) fn({ run, c: null, x: null, m: run.tmem[id] ??= {}, api: runApi(run) });
}
export function addCard(run, id, up = 0) { run.deck.push(makeCard(run, id, up)); }
export function takeRewardCard(run, i) {
    const r = run.reward;
    if (!r?.cards?.[i]) return;
    const k = r.cards[i];
    addCard(run, k.id, k.up);
    r.cards = null;
}
export function takeRewardGold(run) { const r = run.reward; if (r?.gold) { run.gold += r.gold; r.gold = 0; } }
export function takeRewardTrinket(run) { const r = run.reward; if (r?.trinket) { gainTrinket(run, r.trinket); r.trinket = null; } }
export function leaveReward(run) {
    const r = run.reward;
    if (r?.gold) takeRewardGold(run);
    if (r?.trinket) takeRewardTrinket(run);
    const kind = r?.kind;
    run.reward = null;
    if (kind === "lesson") {
        run.prologue++;
        if (run.prologue <= 3) { startLesson(run); return; }
        run.prologue = 0; run.hp = run.maxHp;
        run.screen = "map";
        return;
    }
    if (kind === "boss") {
        run.hp = Math.min(run.maxHp, run.hp + Math.ceil((run.maxHp - run.hp) * 0.5));
        const rng = stream(run, "reward");
        const pool = rng.shuffle(Object.values(TRINKETS).filter((t) => t.rar === "boss" && !has(run, t.id) && !run.locked.includes(t.id)).map((t) => t.id));
        run.bossPick = pool.slice(0, 3);
        run.screen = "bossTrinket";
        return;
    }
    nextScreen(run);
}
export function pickBossTrinket(run, i) {
    if (i !== null && run.bossPick?.[i]) gainTrinket(run, run.bossPick[i]);
    run.bossPick = null;
    run.act++; run.floor = -1; run.pos = null;
    genAct(run);
    run.screen = "map";
}
function nextScreen(run) {
    if (run.queue?.length) { run.screen = "pick"; return; }
    run.screen = "map";
}

// ---- Map ----
export function genAct(run) {
    const rng = stream(run, "map"), a = run.act;
    const nodes = {}, at = (r, c) => nodes[`${r},${c}`] ??= { r, c, type: null, next: [] };
    const paths = 4, starts = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 3).sort((x, y) => x - y);
    const walks = [starts[0], starts[0] === starts[1] ? starts[1] : starts[1], starts[1], starts[2]];
    let prev = null;
    for (let p = 0; p < paths; p++) {
        const w = [walks[p]];
        for (let r = 1; r < ROWS; r++) {
            let cc = w[r - 1] + rng.int(-1, 1);
            cc = Math.max(0, Math.min(COLS - 1, cc));
            if (prev && cc < prev[r]) cc = prev[r];
            w.push(cc);
        }
        for (let r = 0; r < ROWS; r++) {
            const n = at(r, w[r]);
            if (r + 1 < ROWS) { if (!n.next.includes(w[r + 1])) n.next.push(w[r + 1]); }
        }
        prev = w;
    }
    const list = Object.values(nodes).sort((x, y) => x.r - y.r || x.c - y.c);
    const parents = (n) => list.filter((p) => p.r === n.r - 1 && p.next.includes(n.c));
    for (const n of list) {
        if (n.r === 0) { n.type = "fight"; continue; }
        if (n.r === ROWS - 1) { n.type = "rest"; continue; }
        if (n.r === 4 && rng.chance(0.5)) { n.type = "treasure"; continue; }
        const banned = new Set(parents(n).map((p) => p.type));
        for (let tries = 0; tries < 12; tries++) {
            const roll = rng.next() * 100;
            let t = roll < 44 ? "fight" : roll < 68 ? "event" : roll < 80 ? "elite" : roll < 90 ? "shop" : "rest";
            if (run.asc >= 10 && roll < 56 && roll >= 44) t = "elite";
            if (t === "elite" && n.r < 2) t = "fight";
            if ((t === "rest" || t === "elite" || t === "shop") && (banned.has(t) || n.r < 2)) continue;
            n.type = t;
            break;
        }
        n.type ??= "fight";
    }
    run.map = { act: a, nodes: list, boss: BOSSES[a] };
    run.floor = -1; run.pos = null;
}
export function reachable(run) {
    const m = run.map;
    if (!run.pos) return m.nodes.filter((n) => n.r === 0);
    if (run.pos.r === ROWS - 1) return [{ r: ROWS, c: 2, type: "boss", boss: true }];
    const cur = m.nodes.find((n) => n.r === run.pos.r && n.c === run.pos.c);
    return m.nodes.filter((n) => n.r === run.pos.r + 1 && cur.next.includes(n.c));
}
export function chooseNode(run, node) {
    run.pos = { r: node.r, c: node.c };
    run.floor = node.r;
    const rng = stream(run, "map");
    if (node.type === "boss") return startCombat(run, [BOSSES[run.act]], "boss");
    if (node.type === "fight" || node.type === "elite") {
        const tab = ENCOUNTERS[run.act], kind = node.type;
        let list = kind === "elite" ? tab.elite : run.act === 0 && run.fights < 3 ? tab.easy : run.fights % 6 < 2 ? tab.easy : tab.normal;
        const last = run.lastEnc;
        let pick = rng.pick(list);
        if (pick.join() === last && list.length > 1) pick = list[(list.indexOf(pick) + 1) % list.length];
        run.lastEnc = pick.join(); run.fights++;
        return startCombat(run, pick, kind);
    }
    if (node.type === "rest") { run.screen = "rest"; return []; }
    if (node.type === "shop") { openShop(run); return []; }
    if (node.type === "treasure") {
        const r = stream(run, "reward");
        run.reward = { kind: "treasure", gold: r.int(20, 40), trinket: rollTrinket(run, r.chance(0.2) ? "rare" : r.chance(0.4) ? "uncommon" : "common"), cards: null };
        run.screen = "treasure";
        return [];
    }
    if (node.type === "event") {
        const pool = EVENTS.filter((e) => !run.seen.includes(e.id));
        const e = rng.pick(pool.length ? pool : EVENTS);
        run.seen.push(e.id); run.event = { id: e.id, result: null };
        run.screen = "event";
        return [];
    }
    return [];
}

// ---- Rest ----
export const restHeal = (run) => Math.ceil(run.maxHp * ((run.asc >= 2 ? 0.25 : 0.32) + sum(run, "restBonus")));
export const canRest = (run) => !sum(run, "noRest");
export function rest(run) { if (!canRest(run)) return; run.hp = Math.min(run.maxHp, run.hp + restHeal(run)); run.screen = "map"; }
export function refine(run, u) { const k = run.deck.find((d) => d.u === u); if (k) k.up = 1; run.screen = "map"; }
export const upgradable = (run) => run.deck.filter((k) => !k.up && CARDS[k.id].rar !== "curse" && (Object.keys(CARDS[k.id].vals).length > 0));

// ---- Shop ----
const PRICE = { common: 45, uncommon: 72, rare: 145, boss: 300 };
const TPRICE = { common: 120, uncommon: 165, rare: 230 };
function priceMult(run) { return product(run, "shopMult") * (run.asc >= 3 ? 1.25 : 1); }
export function openShop(run) {
    const rng = stream(run, "reward"), m = priceMult(run);
    const cards = rollCards(run, 5, 3).map((k) => ({ ...k, price: Math.round(PRICE[CARDS[k.id].rar] * m * (0.92 + rng.next() * 0.18)), sold: 0 }));
    const tr = [];
    for (let i = 0; i < 3; i++) {
        const id = rollTrinket(run, i === 2 ? "rare" : i === 1 ? "uncommon" : "common");
        if (id && !tr.some((t) => t.id === id)) tr.push({ id, price: Math.round(TPRICE[TRINKETS[id].rar] * m * (0.92 + rng.next() * 0.18)), sold: 0 });
    }
    run.shop = { cards, trinkets: tr, removePrice: Math.round((60 + (run.removals ?? 0) * 25) * m), removed: 0 };
    run.screen = "shop";
}
export function buyCard(run, i) { const k = run.shop.cards[i]; if (!k || k.sold || run.gold < k.price) return false; run.gold -= k.price; k.sold = 1; addCard(run, k.id, k.up); return true; }
export function buyTrinket(run, i) { const k = run.shop.trinkets[i]; if (!k || k.sold || run.gold < k.price) return false; run.gold -= k.price; k.sold = 1; gainTrinket(run, k.id); return true; }
export function removeCard(run, u) {
    const i = run.deck.findIndex((d) => d.u === u);
    if (i >= 0) run.deck.splice(i, 1);
}
export function buyRemove(run, u) {
    const s = run.shop;
    if (!s || s.removed || run.gold < s.removePrice) return false;
    run.gold -= s.removePrice; s.removed = 1; run.removals = (run.removals ?? 0) + 1;
    removeCard(run, u);
    return true;
}
export function leaveShop(run) { run.shop = null; run.screen = "map"; }

// ---- Events and queued picks ----
function runApi(run, ev) {
    const rng = stream(run, "event");
    const q = (e) => (run.queue ??= []).push(e);
    return {
        run, rng,
        heal(n) { run.hp = Math.min(run.maxHp, run.hp + n); },
        healQuiet(n) { run.hp = Math.min(run.maxHp, run.hp + n); },
        lose(n) { run.hp = Math.max(1, run.hp - n); },
        hurt(n) { run.hp = Math.max(1, run.hp - n); },
        gold(n) { run.gold = Math.max(0, run.gold + n); },
        maxHp(n) { run.maxHp += n; run.hp = Math.min(run.maxHp, Math.max(1, run.hp + Math.max(0, n))); },
        addCard(id) { addCard(run, id); },
        curse(id) { addCard(run, id); },
        addToHand(id) { const c = run.combat; if (c) c.hand.push(makeCard(run, id)); },
        rareCard() { const p = rewardPool(run, "rare"); addCard(run, rng.pick(p).id); },
        rareCardLater() { run.pendingRare = 1; },
        trinket(rar) { gainTrinket(run, rollTrinket(run, rar)); },
        trinketId(id) { gainTrinket(run, id); },
        upgradeRandom(n) { const l = rng.shuffle(upgradable(run).slice()); for (let i = 0; i < Math.min(n, l.length); i++) l[i].up = 1; },
        transform(n) {
            const l = rng.shuffle(run.deck.filter((k) => CARDS[k.id].rar !== "curse"));
            for (let i = 0; i < Math.min(n, l.length); i++) { const p = rewardPool(run, rng.chance(0.25) ? "uncommon" : "common"); l[i].id = rng.pick(p).id; l[i].up = 0; }
        },
        pickRemove() { q({ kind: "remove" }); },
        pickUpgrade() { q({ kind: "upgrade" }); },
        cardReward() { q({ kind: "cards", cards: rollCards(run, 3, 2) }); },
        fight(ids) { run.pendingFight = ids; },
        flip: () => rng.chance(0.5),
    };
}
export const eventDef = (run) => EVENTS.find((e) => e.id === run.event?.id);
export function chooseEvent(run, i) {
    const e = eventDef(run), ch = e?.choices[i];
    if (!ch || (ch.can && !ch.can(run))) return;
    run.event.result = ch.run(runApi(run));
    run.event.choice = i;
}
export function leaveEvent(run) {
    run.event = null;
    if (run.pendingFight) { const ids = run.pendingFight; run.pendingFight = null; return startCombat(run, ids, "fight"); }
    nextScreen(run);
    return [];
}
export function resolvePick(run, u) {
    const p = run.queue?.shift();
    if (!p) { run.screen = "map"; return; }
    if (p.kind === "remove" && u != null) removeCard(run, u);
    if (p.kind === "upgrade" && u != null) { const k = run.deck.find((d) => d.u === u); if (k) k.up = 1; }
    if (p.kind === "cards" && u != null && p.cards[u]) addCard(run, p.cards[u].id, p.cards[u].up);
    nextScreen(run);
}

/** The first three fights of a first climb: one idea each, with the opening hand laid out. */
const LESSONS = { 1: { foes: ["rat"], hp: [16], hand: ["spark", "droplet", "spark"] }, 2: { foes: ["imp"], hp: [28], hand: ["droplet", "spark", "droplet", "spark", "spark"] }, 3: { foes: ["rat", "rat"], hp: [12, 14] } };
export function startLesson(run) {
    const l = LESSONS[run.prologue];
    run.pos = null; run.floor = -1;
    startCombat(run, l.foes, "lesson");
    const c = run.combat;
    c.enemies.forEach((e, i) => { e.hp = e.maxHp = l.hp[i]; });
    if (l.hand) {
        const all = [...c.hand, ...c.draw], take = (id) => all.splice(all.findIndex((k) => k.id === id), 1)[0];
        c.hand = l.hand.map(take);
        c.draw = all;
    }
    return [];
}
// ---- A new run ----
export function newRun({ seed, witch = "posy", asc = 0, tier = 99, locked = [], tutorial = false }) {
    const w = WITCHES[witch], s = seed >>> 0;
    const run = {
        v: SAVE_VERSION, seed: s, witch, asc, tier, locked, tutorial, hp: w.hp, maxHp: w.hp, gold: w.gold, deck: [], trinkets: [], tmem: {}, act: 0, floor: -1, pos: null, map: null,
        screen: "map", combat: null, reward: null, shop: null, event: null, queue: [], seen: [], fights: 0, nextU: 1,
        rs: { map: s ^ 0x1234567, combat: s ^ 0x2345678, reward: s ^ 0x3456789, event: s ^ 0x456789a },
        stats: { fires: 0, maxFires: 0, wins: 0, elites: 0, bosses: 0, best: { dmg: 0, fires: 0, pot: 1, recipe: [] }, rx: {}, cards: {}, floors: 0 },
    };
    if (asc >= 9) { run.maxHp -= 6; run.hp = run.maxHp; }
    if (tutorial) { run.prologue = 1; for (const id of ["spark", "spark", "spark", "spark", "spark", "droplet", "droplet", "droplet", "droplet", "droplet"]) addCard(run, id); }
    else for (const id of w.deck) addCard(run, id);
    if (asc >= 6) addCard(run, "gunk");
    genAct(run);
    return run;
}
export const clone = (x) => JSON.parse(JSON.stringify(x));
export { ACT_NAMES, stream };
