// One sitting: one or two fields, what they throw at each other, and how it ends. No rendering, so bots use it too.
import { Field, W, secondsPerRow, mulberry } from "./engine.js";
import { Brain } from "./ai.js";
import { MODES } from "./rivals.js";

const FLIGHT = 28;          // steps an attack spends in the air
export const LEVEL_LINES = 10;

export class Match {
    /**
     * mode: story, marathon, sprint, daily, versus. rival: entry of RIVALS for story.
     * brains: [a, b] options for bot players.
     */
    constructor(o) {
        this.mode = o.mode;
        this.rival = o.rival ?? null;
        this.seed = o.seed ?? 1;
        this.rand = mulberry(this.seed * 13 + 5);
        this.steps = 0;
        this.over = false;
        this.winner = -1;
        this.flights = [];
        this.events = [];       // match level: attacks, specials, the end
        const m = o.mode;
        this.versus = m === "versus";
        this.duel = m === "story" || this.versus;
        const a = new Field({ seed: this.seed, level: 1, garbageWait: this.rival?.garbageWait ?? 90 });
        this.sides = [{ f: a, brain: o.brains?.[0] ? new Brain(o.brains[0], this.seed + 1) : null, send: 1 }];
        if (this.duel) {
            // Both beds get the same animals in versus, so it is all down to the players.
            const b = new Field({ seed: this.versus ? this.seed : this.seed + 1000, level: 1, garbageWait: 90 });
            const opts = this.rival ? this.rival.brain : o.brains?.[1];
            this.sides.push({ f: b, brain: opts ? new Brain(opts, this.seed + 2) : null, send: this.rival ? this.rival.send : 1 });
            const lv = this.rival?.gravity ?? 3;
            a.levelNow = b.levelNow = lv;
            a.gravity = b.gravity = 1 / 60 / secondsPerRow(lv);
        } else a.levelNow = 1;
        this.level = this.rival?.gravity ?? 1;
        this.fx = { stink: 0, dark: 0, crow: 0 };
        this.special = this.rival?.attack ? { ...this.rival.attack, t: 60 * this.rival.attack.every, warnT: -1, charge: 0 } : null;
        this.crowdAt = 0;
        this.crowded = false;
    }

    get you() { return this.sides[0].f; }
    get them() { return this.sides[1]?.f ?? null; }
    get seconds() { return this.steps / 60; }

    /** Rate of gravity climbs in long duels, so two careful players can't stall for ever. */
    pressure() {
        const t = this.seconds;
        if (t < 60) return 1;
        return 1 + (t - 60) / 24;
    }

    /** After a while the bed gets crowded: both sides get sheep, so no duel drags on. Fair, and announced. */
    crowd() {
        const t = this.seconds;
        if (t < 100) return;
        const gap = t < 150 ? 11 : 7;
        if (t >= this.crowdAt) {
            if (!this.crowded) { this.crowded = true; this.events.push({ t: "crowd" }); }
            this.crowdAt = t + gap;
            for (const s of this.sides) s.f.addGarbage(1, 40, true);
        }
    }

    /** Run one step. softA, softB say whether soft drop is held. */
    step(softA = false, softB = false) {
        if (this.over) return;
        this.steps++;
        const sides = this.sides;
        for (let i = 0; i < sides.length; i++) {
            const s = sides[i];
            if (s.idle) continue;
            if (s.brain) s.brain.step(s.f);
            s.f.tick(i === 0 ? softA : softB);
            this.harvest(i);
        }
        this.flown();
        if (this.duel) {
            const scale = this.pressure();
            for (const s of sides) s.f.gravityScale = scale * (s === sides[0] && this.fx.crow > 0 ? 1.8 : 1);
            if (!this.sides[1].idle) { this.specials(); this.crowd(); }
            const a = sides[0].f, b = sides[1].f;
            if (a.dead || b.dead) this.finish(a.dead ? (b.dead ? (a.lines >= b.lines ? 0 : 1) : 1) : 0);
        } else this.solo();
    }

    /** Clears become attacks. */
    harvest(i) {
        const f = this.sides[i].f;
        for (const e of f.events) {
            if (e.t !== "clear" || !this.duel) continue;
            let a = e.attack * this.sides[i].send;
            a = Math.floor(a + this.rand() * 0.99);
            const rest = f.cancel(a);
            e.cancelled = a - rest;
            e.sent = rest;
            if (i === 0 && this.special) {
                // Fighting back slows the rival's special down.
                this.special.t = Math.min(this.special.t + 60 * (e.n + a), 60 * this.special.every);
            }
            if (rest > 0) {
                f.sent += rest;
                this.flights.push({ from: i, to: 1 - i, n: rest, t: FLIGHT });
                this.events.push({ t: "launch", from: i, n: rest, rows: e.rows, quad: e.n === 4 });
            }
        }
    }

    flown() {
        for (let i = this.flights.length - 1; i >= 0; i--) {
            const fl = this.flights[i];
            if (--fl.t > 0) continue;
            this.flights.splice(i, 1);
            this.sides[fl.to].f.addGarbage(fl.n);
            this.events.push({ t: "hit", to: fl.to, n: fl.n });
        }
    }

    /** The rival's own trick, telegraphed so it is never a cheap shot. */
    specials() {
        const sp = this.special, fx = this.fx;
        if (fx.stink > 0) fx.stink--;
        if (fx.dark > 0) fx.dark--;
        if (fx.crow > 0) fx.crow--;
        if (!sp) return;
        if (sp.warnT < 0) {
            sp.t--;
            if (sp.t <= sp.warn) { sp.warnT = sp.warn; this.events.push({ t: "warn", kind: sp.kind, name: sp.name }); }
            return;
        }
        if (--sp.warnT > 0) return;
        sp.warnT = -1;
        sp.t = 60 * sp.every;
        this.unleash(sp);
    }

    unleash(sp) {
        const f = this.sides[0].f;
        let kind = sp.kind;
        if (kind === "crow") {
            // Reveille steals everybody's best tricks in turn, and crows between each.
            this.crowN = (this.crowN ?? -1) + 1;
            kind = ["crow", "egg", "charge", "dark", "crow", "stink", "quills", "swipe"][this.crowN % 8];
        }
        const ev = { t: "attack", kind };
        if (kind === "egg") {
            const n = 3 + Math.floor(this.rand() * 2), cols = [];
            for (let i = 0; i < n; i++) { const x = Math.floor(this.rand() * W); if (f.dropEgg(x)) cols.push(x); }
            ev.cols = cols;
        } else if (kind === "quills") f.addGarbage(1, 20, true);
        else if (kind === "swipe") {
            ev.took = f.holdPiece;
            if (f.holdPiece >= 0) { f.holdPiece = -1; f.canHold = true; }
            else { const q = f.queue; [q[0], q[1]] = [q[1], q[0]]; }
        } else if (kind === "stink") this.fx.stink = sp.last ?? 420;
        else if (kind === "dark") this.fx.dark = sp.last ?? 480;
        else if (kind === "charge") f.addGarbage(sp.rows ?? 3, 30);
        else if (kind === "crow") this.fx.crow = sp.last ?? 300;
        this.events.push(ev);
    }

    solo() {
        const f = this.sides[0].f, m = MODES[this.mode];
        if (this.mode === "marathon" || this.mode === "daily") {
            const lv = Math.min(this.mode === "daily" ? 10 : 15, 1 + Math.floor(f.lines / LEVEL_LINES));
            if (lv !== f.levelNow) { f.levelNow = lv; this.events.push({ t: "level", level: lv }); }
            f.gravity = 1 / 60 / secondsPerRow(lv);
            this.level = lv;
        } else { f.gravity = 1 / 60 / secondsPerRow(1); this.level = 1; }
        if (f.dead) return this.finish(this.mode === "marathon" || this.mode === "daily" ? 0 : 1, this.mode === "daily" ? "time" : "topped");
        if (m.goal && f.lines >= m.goal) return this.finish(0, "goal");
        if (m.seconds && this.seconds >= m.seconds) return this.finish(0, "time");
    }

    finish(winner, why) {
        if (this.over) return;
        this.over = true;
        this.winner = winner;
        this.why = why ?? "ko";
        this.events.push({ t: "end", winner, why: this.why });
    }
}

