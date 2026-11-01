// The kitchen as a pure simulation: no drawing, no input, no Pogo. The stage turns gestures into these calls,
// and bots call them directly, so what a bot proves is what a player gets.
import { LOCATIONS, NOODLES, PASSERS, RECIPES, REGULARS, SHIFTS, TOPPINGS } from "./data.js";

export const TUNE = {
    pour: { ramp: 5.0, fall: 9.0, flow: 1.25, volume: 1.5, perfectLo: 0.90, perfectHi: 1.06, okLo: 0.68, okHi: 1.17, spill: 1.22 },
    noodle: { window: 2.0, soft: 3.2, earlyOk: 0.6 },
    chop: 2, cap: 6,
    eat: 2.6, slide: 0.32, newBowl: 0.3,
    lineDrain: 0.35,
    stars: [0.55, 0.72, 0.84],
    gull: { warn: 2.4, take: 2 },
    train: { warn: 5 },
    party: { window: 9, tip: 0.6 },
    sora: 0.7,
    mio: 2.0,
};

/** Seeded random, independent of Pogo, so runs repeat in Node and in Chrome. */
export class Dice {
    constructor(seed) { this.s = seed >>> 0 || 1; }
    next() { this.s = Math.imul(this.s, 1664525) + 1013904223 >>> 0; return this.s / 4294967296; }
    int(n) { return Math.floor(this.next() * n); }
    pick(a) { return a[this.int(a.length)]; }
    range(a, b) { return a + (b - a) * this.next(); }
}

/** Turn a shift definition and a kit into a plan. kit: { bowls, pots, seats, knife, ladle, patience, staff:{} } */
export function makeKit(shift, owned = {}, assist = false) {
    const k = owned.kit ?? {}, st = owned.staff ?? {};
    return {
        bowls: Math.min(3, shift.base[0] + (k.bowl ?? 0)),
        pots: Math.min(3, shift.base[1] + (k.pot ?? 0)),
        seats: LOCATIONS[shift.loc].seats,
        chop: TUNE.chop + (k.knife ?? 0),
        ladle: k.ladle ?? 0,
        patience: (1 + (k.stools ?? 0) * 0.1) * (st.hana ? 1.15 : 1) * (assist ? 1.35 : 1),
        staff: { ...st },
    };
}

/** The menu for a shift: its base recipes plus owned extras that still fit on the counter (3 broths, 6 toppings). */
export function menuFor(shift, owned = {}) {
    const menu = shift.menu.slice(), rec = owned.recipes ?? {};
    const broths = new Set(menu.map((id) => RECIPES[id].broth)), tops = new Set(menu.flatMap((id) => RECIPES[id].tops));
    const season = LOCATIONS[shift.loc].season;
    for (const [id, r] of Object.entries(RECIPES)) {
        if (menu.includes(id) || !rec[id] || r.season !== season || !r.cost) continue;
        const b = new Set(broths).add(r.broth), t = new Set(tops);
        r.tops.forEach((x) => t.add(x));
        if (b.size > 3 || t.size > 6) continue;
        menu.push(id); b.forEach((x) => broths.add(x)); t.forEach((x) => tops.add(x));
    }
    return menu;
}

let nextId = 1;

export class Kitchen {
    /**
     * o.shift: entry of SHIFTS, or for endless { endless: true, loc, menu, patience }.
     * o.kit from makeKit. o.menu from menuFor. o.seed.
     */
    constructor(o) {
        this.shift = o.shift; this.kit = o.kit; this.menu = o.menu; this.rng = new Dice(o.seed ?? 1);
        this.endless = !!o.shift.endless; this.time = 0; this.done = false; this.events = [];
        const R = this.menu.map((id) => RECIPES[id]);
        this.brothList = [...new Set(R.map((r) => r.broth))];
        this.topList = [...new Set(R.flatMap((r) => r.tops))].sort((a, b) => TOPPINGS[a].frame - TOPPINGS[b].frame);
        this.bins = this.topList.map((id) => ({ id, stock: TOPPINGS[id].sliced ? (o.shift.teach === 2 ? 0 : TUNE.chop * 2) : Infinity, gull: null }));
        this.pots = Array.from({ length: this.kit.pots }, (_, i) => ({ i, state: "empty", t: 0, kind: null, forId: 0 }));
        this.bowls = Array.from({ length: this.kit.bowls }, (_, i) => this.freshBowl(i));
        this.seats = Array(this.kit.seats).fill(null);
        this.line = []; this.customers = [];
        this.ladle = null; this.pendingLevel = 0;
        this.served = 0; this.walked = 0; this.smiles = 0; this.cash = 0; this.tips = 0; this.combo = 0; this.bestCombo = 0;
        this.perfects = 0; this.goods = 0; this.oks = 0; this.gullsShooed = 0;
        this.resultBowls = []; this.parties = new Map();
        this.mio = 0; this.lives = 3; this.diff = 0;
        this.planArrivals();
    }

    freshBowl(i) { return { i, c: null, level: 0, brothKind: null, noodle: null, tops: {}, hold: 0, id: nextId++ }; }

    planArrivals() {
        const s = this.shift; this.arrivals = []; this.trains = []; this.gulls = [];
        if (this.endless) { this.nextEndless = 2; return; }
        let t = 1.2;
        const castQueue = (s.cast ?? []).slice();
        let total = s.waves.reduce((a, w) => a + w.n, 0), placed = 0;
        const partyEvery = s.party ? Math.max(4, Math.round(total / 4)) : 0;
        s.waves.forEach((w) => {
            if (s.train) { this.trains.push({ t: t + TUNE.train.warn, warned: false, hit: false }); t += TUNE.train.warn; }
            for (let i = 0; i < w.n; i++) {
                let who = null;
                if (castQueue.length && (placed % Math.max(1, Math.floor(total / (s.cast.length + 1))) === 0 || total - placed <= castQueue.length)) who = castQueue.shift();
                this.arrivals.push({ t, recipe: this.orderFor(who), who, party: 0 });
                t += w.gap; placed++;
            }
            t += w.pause;
        });
        if (s.party) {
            // Groups come in together, a little closer than their wave.
            let pid = 1;
            for (let i = 2; i + s.party <= this.arrivals.length; i += partyEvery + 1) {
                for (let k = 0; k < s.party; k++) { const a = this.arrivals[i + k]; a.party = pid; a.t = this.arrivals[i].t + k * 0.6; }
                this.parties.set(pid, { n: s.party, firstAt: 0, served: 0, ok: true }); pid++;
            }
            this.arrivals.sort((a, b) => a.t - b.t);
        }
        if (s.gulls) {
            const span = this.arrivals[this.arrivals.length - 1].t + 10;
            for (let i = 0; i < s.gulls; i++) this.gulls.push({ t: 6 + (span - 6) * ((i + 0.3 + this.rng.next() * 0.4) / s.gulls), state: "due", bin: -1, left: 0 });
        }
        if (s.last) this.arrivals[this.arrivals.length - 1].who = "nana", this.arrivals[this.arrivals.length - 1].recipe = "lastpage", this.arrivals[this.arrivals.length - 1].party = 0;
        this.totalCustomers = this.arrivals.length;
    }

    orderFor(who) {
        if (who && REGULARS[who]) {
            const r = REGULARS[who];
            if (this.menu.includes(r.fav)) return r.fav;
            if (this.menu.includes(r.alt)) return r.alt;
        }
        // Later items on the menu are a little more common, so a new recipe gets ordered.
        const n = this.menu.length, i = this.endless ? this.rng.int(n) : Math.min(n - 1, Math.floor(Math.pow(this.rng.next(), 0.8) * n));
        return this.menu[i];
    }

    say(type, o = {}) { this.events.push({ type, ...o }); }

    // --- The clock --------------------------------------------------------------------------------------------
    step(dt) {
        if (this.done) return;
        this.time += dt;
        this.stepArrivals(dt);
        this.stepCustomers(dt);
        this.stepPots(dt);
        this.stepLadle(dt);
        this.stepBowls(dt);
        this.stepStaff(dt);
        this.stepGulls(dt);
        for (const t of this.trains ?? []) {
            if (!t.warned && this.time >= t.t - TUNE.train.warn) { t.warned = true; this.say("trainWarn", { at: t.t }); }
            if (!t.hit && this.time >= t.t) { t.hit = true; this.say("train"); }
        }
        if (!this.endless && !this.arrivals.length && !this.line.length && this.customers.length === 0) { this.done = true; this.say("end"); }
        if (this.endless && this.lives <= 0 && !this.done) { this.done = true; this.say("end"); }
    }

    stepArrivals() {
        if (this.endless) {
            const s = this.shift; this.diff = Math.min(1, this.time / 240);
            if (this.time >= this.nextEndless && this.customers.length + this.line.length < this.kit.seats + 4) {
                const gap = 6.6 - 3.6 * this.diff, wave = Math.sin(this.time * 0.09) * 1.1;
                this.nextEndless = this.time + Math.max(2.2, gap + wave);
                this.arrive({ recipe: this.orderFor(null), who: null, party: 0 });
            }
            return;
        }
        while (this.arrivals.length && this.arrivals[0].t <= this.time) this.arrive(this.arrivals.shift());
    }

    arrive(a) {
        const seatsTaken = this.seats.filter(Boolean).length;
        const base = this.shift.patience * this.kit.patience * (this.endless ? 1 - 0.3 * this.diff : 1);
        const reg = REGULARS[a.who];
        const c = { id: nextId++, recipe: a.recipe, who: a.who, party: a.party, state: "line", seat: -1, bowl: -1, patience: base * (reg?.patience ?? 1), max: base * (reg?.patience ?? 1), look: (this.lookNext = ((this.lookNext ?? this.rng.int(PASSERS.length)) + 1 + (this.rng.int(2))) % PASSERS.length), eat: 0, t: 0 };
        this.customers.push(c); this.line.push(c);
        this.say("arrive", { c, seatsTaken });
    }

    stepCustomers(dt) {
        // Seat whoever is waiting.
        const n = this.seats.length, middleOut = [...this.seats.keys()].sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2));
        for (const i of middleOut) if (!this.seats[i] && this.line.length) {
            const c = this.line.shift(); this.seats[i] = c; c.seat = i; c.state = "seated"; this.say("seat", { c });
        }
        for (const b of this.bowls) if (!b.c && b.hold <= 0) {
            const c = this.seats.find((x) => x && x.state === "seated" && x.bowl < 0);
            if (c) { c.bowl = b.i; b.c = c; this.say("ticket", { c, bowl: b.i }); }
        }
        for (const c of this.customers.slice()) {
            c.t += dt;
            if (c.state === "line") c.patience -= dt * TUNE.lineDrain * 0.5;
            else if (c.state === "seated") {
                c.patience -= dt;
                if (c.patience <= 0) this.walkOut(c);
            } else if (c.state === "eating") {
                c.eat -= dt;
                if (c.eat <= 0) this.leave(c);
            } else if (c.state === "served") { c.eat -= dt; if (c.eat <= 0) { c.state = "eating"; c.eat = TUNE.eat; this.say("slurp", { c, rating: c.rating }); } }
            else if (c.state === "gone") { c.eat -= dt; if (c.eat <= 0) { this.customers.splice(this.customers.indexOf(c), 1); } }
        }
    }

    walkOut(c) {
        this.walked++; this.combo = 0; this.lives--;
        if (c.bowl >= 0) {
            const b = this.bowls[c.bowl];
            for (const p of this.pots) if (p.forId === c.id) p.forId = 0;
            this.bowls[c.bowl] = this.freshBowl(c.bowl); this.bowls[c.bowl].hold = TUNE.newBowl;
            this.say("clearBowl", { bowl: b.i });
        }
        for (const p of this.pots) if (p.forId === c.id) p.forId = 0;
        if (c.party && this.parties.has(c.party)) this.parties.get(c.party).ok = false;
        this.resultBowls.push({ c, rating: 0 });
        this.say("walk", { c });
        this.leave(c);
    }

    leave(c) {
        if (c.seat >= 0) this.seats[c.seat] = null;
        c.state = "gone"; c.eat = 0.7; this.say("leave", { c });
    }

    // --- Noodles ------------------------------------------------------------------------------------------------
    needNoodles() {
        const taken = new Set(this.pots.filter((p) => p.state !== "empty").map((p) => p.forId));
        const q = this.seats.filter((c) => c && c.state === "seated").sort((a, b) => a.id - b.id);
        return [...q, ...this.line].filter((c) => !taken.has(c.id) && !(c.bowl >= 0 && this.bowls[c.bowl].noodle));
    }

    /** Tap a pot: a nest goes in for the oldest order that needs one. */
    dropNoodle(i) {
        const p = this.pots[i];
        if (!p || p.state !== "empty") return false;
        const c = this.needNoodles()[0];
        if (!c) { this.say("noOrder", { pot: i }); return false; }
        p.state = "cook"; p.t = 0; p.kind = RECIPES[c.recipe].noodle; p.forId = c.id; p.warned = false; p.ping = false;
        this.say("drop", { pot: i, kind: p.kind });
        return true;
    }

    noodleWindow() { return TUNE.noodle.window * (this.kit.staff.tetsu ? 1.5 : 1); }

    /** 'raw', 'early', 'perfect', 'soft', 'mush'. */
    potPhase(p) {
        if (p.state !== "cook") return "empty";
        const c = NOODLES[p.kind].cook, w = this.noodleWindow();
        if (p.t < c * TUNE.noodle.earlyOk) return "raw";
        if (p.t < c) return "early";
        if (p.t < c + w) return "perfect";
        if (p.t < c + w + TUNE.noodle.soft) return "soft";
        return "mush";
    }

    stepPots(dt) {
        for (const p of this.pots) if (p.state === "cook") {
            p.t += dt;
            const ph = this.potPhase(p);
            if (ph === "perfect" && !p.ping) { p.ping = true; this.say("noodlesReady", { pot: p.i }); }
            if (ph === "mush" && !p.warned) { p.warned = true; this.say("noodlesOver", { pot: p.i }); }
        }
    }

    bowlForPot(p, prefer = -1) {
        const fits = (b) => b.c && !b.noodle && RECIPES[b.c.recipe].noodle === p.kind && b.hold <= 0;
        if (prefer >= 0 && fits(this.bowls[prefer])) return this.bowls[prefer];
        return this.bowls.find((b) => b.c && b.c.id === p.forId && fits(b)) ?? this.bowls.find(fits) ?? null;
    }

    /** Pull noodles out and swing them into a bowl. */
    pull(i, prefer = -1) {
        const p = this.pots[i];
        if (!p || p.state !== "cook") return null;
        const ph = this.potPhase(p);
        if (ph === "raw") { this.say("notYet", { pot: i }); return null; }
        const b = this.bowlForPot(p, prefer);
        if (!b) { this.say("noBowl", { pot: i }); return null; }
        const q = ph === "perfect" ? 2 : ph === "mush" ? 0 : 1;
        b.noodle = { kind: p.kind, q };
        p.state = "empty"; p.forId = 0;
        this.say("pulled", { pot: i, bowl: b.i, q, phase: ph, kind: p.kind });
        return b;
    }

    /** Throw mushy noodles away. */
    dump(i) {
        const p = this.pots[i];
        if (!p || p.state !== "cook") return;
        p.state = "empty"; p.forId = 0; this.say("dump", { pot: i });
    }

    // --- Broth ---------------------------------------------------------------------------------------------------
    /** Dip the ladle. Lasts until putLadle. */
    takeLadle(kind) {
        if (!this.brothList.includes(kind)) return false;
        this.ladle = { kind, fill: TUNE.pour.volume, tilt: 0, bowl: -1, holding: false, flow: 0 };
        this.say("scoop", { kind });
        return true;
    }

    /** Aim the ladle: pass a bowl index to tip it over that bowl, or -1 to level it. */
    aimLadle(bowl) {
        const l = this.ladle;
        if (!l) return;
        if (bowl >= 0) {
            const b = this.bowls[bowl];
            const wrong = !b.c || RECIPES[b.c.recipe].broth !== l.kind || b.hold > 0;
            if (wrong) { if (l.bowl !== -2 - bowl) { l.bowl = -2 - bowl; this.say("wrongBroth", { bowl }); } l.holding = false; return; }
            l.bowl = bowl; l.holding = true;
        } else { l.holding = false; if (l.bowl < -1) l.bowl = -1; }
    }

    putLadle() {
        const l = this.ladle;
        if (!l) return;
        l.holding = false; l.leaving = true;
    }

    stepLadle(dt) {
        const l = this.ladle, T = TUNE.pour;
        if (!l) return;
        l.tilt += (l.holding ? T.ramp : -T.fall) * dt;
        l.tilt = Math.min(1, Math.max(0, l.tilt));
        const flow = l.bowl >= 0 && l.fill > 0 ? Math.pow(l.tilt, 1.6) * T.flow : 0;
        l.flow = flow;
        if (flow > 0) {
            const dv = Math.min(l.fill, flow * dt), b = this.bowls[l.bowl];
            l.fill -= dv;
            if (b.c) {
                b.level += dv; b.brothKind = l.kind;
                if (b.level > T.spill && !b.spilled) { b.spilled = true; this.say("spill", { bowl: b.i }); }
                b.level = Math.min(T.spill, b.level);
            }
        }
        if (l.leaving && l.tilt <= 0) { const b = l.bowl >= 0 ? this.bowls[l.bowl] : null; if (b) this.say("poured", { bowl: b.i, level: b.level }); this.ladle = null; }
    }

    brothQuality(level) {
        const T = TUNE.pour, widen = this.kit.ladle ? 0.04 : 0;
        if (level >= T.perfectLo - widen && level <= T.perfectHi + widen) return 2;
        if (level >= T.okLo && level <= T.okHi) return 1;
        return 0;
    }

    // --- Toppings -----------------------------------------------------------------------------------------------
    chop(i) {
        const b = this.bins[i];
        if (!b || !TOPPINGS[b.id].sliced || b.stock >= TUNE.cap) return false;
        b.stock = Math.min(TUNE.cap, b.stock + this.kit.chop);
        this.say("chop", { bin: i, stock: b.stock });
        return true;
    }

    bowlWantingTop(id, prefer = -1) {
        const wants = (b) => b.c && b.hold <= 0 && RECIPES[b.c.recipe].tops.includes(id) && b.tops[id] === undefined;
        if (prefer >= 0 && wants(this.bowls[prefer])) return this.bowls[prefer];
        if (prefer >= 0) return null;
        return this.bowls.filter(wants).sort((a, b) => a.c.id - b.c.id)[0] ?? null;
    }

    /** Lay a topping in a bowl. neat means it was set on its mark by hand; a tap drops it casually. */
    place(i, bowl, neat) {
        const bin = this.bins[i];
        if (!bin) return false;
        if (bin.stock <= 0) { this.say("emptyBin", { bin: i }); return false; }
        const b = this.bowlWantingTop(bin.id, bowl);
        if (!b) { this.say("noTop", { bin: i, bowl }); return false; }
        bin.stock--;
        b.tops[bin.id] = !!neat;
        this.say("placed", { bin: i, bowl: b.i, id: bin.id, neat: !!neat });
        return true;
    }

    // --- Staff and gulls ------------------------------------------------------------------------------------------
    stepStaff(dt) {
        if (this.kit.staff.mio) {
            this.mio -= dt;
            if (this.mio <= 0) {
                const i = this.bins.findIndex((b) => TOPPINGS[b.id].sliced && b.stock <= 1);
                if (i >= 0) { this.chop(i); this.events[this.events.length - 1].staff = true; this.mio = TUNE.mio; }
            }
        }
        if (this.kit.staff.sora) for (const b of this.bowls) if (this.complete(b)) {
            b.ripe = (b.ripe ?? 0) + dt;
            if (b.ripe > TUNE.sora) { this.serve(b.i, true); }
        }
    }

    stepGulls(dt) {
        for (const g of this.gulls) {
            if (g.state === "due" && this.time >= g.t) {
                const bins = this.bins.map((b, i) => (b.stock > 0 && Number.isFinite(b.stock) && !b.gull ? i : -1)).filter((i) => i >= 0);
                if (!bins.length) { g.t = this.time + 2; continue; }
                g.bin = this.rng.pick(bins); g.state = "land"; g.left = TUNE.gull.warn; this.bins[g.bin].gull = g;
                this.say("gull", { bin: g.bin });
            } else if (g.state === "land") {
                g.left -= dt;
                if (g.left <= 0) {
                    const b = this.bins[g.bin];
                    b.stock = Math.max(0, b.stock - TUNE.gull.take); b.gull = null; g.state = "gone";
                    this.say("gullSteal", { bin: g.bin });
                }
            }
        }
    }

    shoo(i) {
        const b = this.bins[i];
        if (!b?.gull) return false;
        b.gull.state = "gone"; b.gull = null; this.gullsShooed++;
        this.say("shoo", { bin: i });
        return true;
    }

    // --- Serving --------------------------------------------------------------------------------------------------
    missing(b) {
        if (!b.c) return [];
        const r = RECIPES[b.c.recipe], out = [];
        if (!b.noodle) out.push("noodles");
        if (b.level < TUNE.pour.okLo) out.push("broth");
        for (const t of r.tops) if (b.tops[t] === undefined) out.push(t);
        return out;
    }

    complete(b) { return !!b.c && b.hold <= 0 && this.missing(b).length === 0; }

    /** What a bowl would score now: faults count against perfection. */
    judge(b) {
        const r = RECIPES[b.c.recipe];
        let flaws = 0;
        if (!b.noodle) flaws += 3; else flaws += 2 - b.noodle.q;
        const bq = this.brothQuality(b.level);
        flaws += 2 - bq;
        for (const t of r.tops) {
            if (b.tops[t] === undefined) flaws += 2;
            else if (!b.tops[t]) flaws += 0.5;
        }
        return { flaws, rating: flaws === 0 ? 3 : flaws <= 2 ? 2 : 1 };
    }

    /** Slide the bowl down the counter. Needs at least noodles and some broth. */
    serve(i, auto = false) {
        const b = this.bowls[i];
        if (!b?.c || b.hold > 0) return false;
        if (!b.noodle || b.level < 0.3) { this.say("notReady", { bowl: i }); return false; }
        const c = b.c, { rating } = this.judge(b), R = RECIPES[c.recipe];
        const pay = Math.round(R.price * [0, 0.6, 0.85, 1][rating]);
        const calm = Math.max(0, c.patience / c.max);
        if (rating === 3) { this.combo++; this.perfects++; } else { this.combo = rating === 2 ? this.combo : 0; if (rating === 2) this.goods++; else this.oks++; }
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        const heat = 1 + Math.min(5, this.combo) * 0.2;
        const tip = Math.round(R.price * 0.3 * calm * (rating - 1) / 2 * heat);
        let bonus = 0;
        if (c.party && this.parties.has(c.party)) {
            const P = this.parties.get(c.party);
            if (!P.served) P.firstAt = this.time;
            P.served++;
            if (this.time - P.firstAt > TUNE.party.window) P.ok = false;
            if (P.served === P.n && P.ok) { bonus = Math.round(R.price * TUNE.party.tip * P.n); this.say("partyDone", { c, bonus }); }
        }
        this.cash += pay + tip + bonus; this.tips += tip + bonus; this.smiles += rating; this.served++;
        c.state = "served"; c.eat = TUNE.slide; c.rating = rating; c.bowlShown = { ...b };
        this.resultBowls.push({ c, rating, recipe: c.recipe });
        for (const p of this.pots) if (p.forId === c.id) p.forId = 0;
        this.say("serve", { bowl: i, c, rating, pay, tip, bonus, snap: b, combo: this.combo, staff: !!auto });
        const fresh = this.freshBowl(i); fresh.hold = TUNE.newBowl; this.bowls[i] = fresh;
        return true;
    }

    stepBowls(dt) { for (const b of this.bowls) if (b.hold > 0) b.hold -= dt; }

    // --- Score ----------------------------------------------------------------------------------------------------
    max() { return (this.endless ? this.served + this.walked : this.totalCustomers) * 3; }
    happiness() { const m = this.max(); return m ? this.smiles / m : 0; }
    stars() { const h = this.happiness(); return TUNE.stars.reduce((n, s) => n + (h >= s ? 1 : 0), 0); }
}

export { SHIFTS };
