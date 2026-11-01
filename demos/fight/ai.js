// The AI plays by the same rules as a thumb. It sees only `watch()`: what is visible on screen, delayed by its
// reaction time. It never sees buttons, buffers or the input mask. Everything it does goes in as a per-frame mask.
import { BTN } from "./sim.js";
import { BY_ID } from "./fighters.js";

/** Public picture of one fighter. There are deliberately no input fields here. */
function look(f) {
    return { x: f.x, y: f.y, vx: f.vx, vy: f.vy, face: f.face, hp: f.hp, hpMax: f.hpMax, st: f.st, move: f.mv?.id ?? null, phase: f.phase, rank: f.mv?.rank ?? 0, lvl: f.mv?.lvl ?? null, recoveryLeft: f.mv && f.phase === "recovery" ? f.mv.s + f.mv.a + f.mv.r - f.mt : 0, crouched: !!f.crouching };
}
export function watch(fight) {
    const [a, b] = fight.p;
    return { flash: fight.flash > 0 ? fight.flashBy : null, p: [look(a), look(b)], proj: fight.proj.map((q) => ({ by: q.by, x: q.x, y: q.y, vx: q.vx, kind: q.kind, armed: !!q.armed, fused: !!q.fuse })) };
}

/** Swings seen in roughly the last three seconds before the AI decides it's facing a masher. A patient player never gets here. */
const MASH = 2.2;

/** Skill presets. react is in frames: 14 is a sharp human, 40 is someone eating lunch. */
export const LEVELS = [
    { name: "EASY", react: 42, think: 44, idle: 0.42, block: 0.18, aa: 0.08, punish: 0.1, combo: 1, tech: 0, solid: 0, pattern: true, whiff: 0.32, throwRate: 0.04, meterUse: 0.1 },
    { name: "NORMAL", react: 26, think: 26, idle: 0.2, block: 0.48, aa: 0.32, punish: 0.4, combo: 2, tech: 0.15, solid: 0, whiff: 0.14, throwRate: 0.1, meterUse: 0.45 },
    { name: "HARD", react: 14, think: 13, idle: 0.04, block: 0.86, aa: 0.75, punish: 0.85, combo: 4, tech: 0.35, solid: 1, whiff: 0.05, throwRate: 0.15, meterUse: 0.8 },
    { name: "CHEF", react: 12, think: 11, idle: 0.02, block: 0.9, aa: 0.85, punish: 0.95, combo: 5, tech: 0.5, solid: 1, whiff: 0.02, throwRate: 0.18, meterUse: 1 },
];

/** Blend presets for the arcade ladder, so difficulty ramps by small steps. */
export function levelAt(x) {
    const i = Math.min(LEVELS.length - 2, Math.floor(x)), k = x - i, a = LEVELS[i], b = LEVELS[i + 1], out = { name: a.name };
    for (const key of Object.keys(a)) if (typeof a[key] === "number") out[key] = a[key] + (b[key] - a[key]) * k;
    out.combo = Math.round(out.combo);
    out.pattern = x < 0.75;
    return out;
}

export class Brain {
    constructor(i, fighterId, level, rng) {
        this.i = i;
        this.def = BY_ID[fighterId];
        this.ai = this.def.ai;
        this.lv = typeof level === "number" ? levelAt(level) : level;
        this.rng = rng;
        this.history = [];
        this.plan = [];
        this.wait = 0;
        this.guardFor = 0; this.crouchGuard = false;
        this.step = 0;
        this.combo = null; this.pressure = 0; this.heat = -1; this.lows = 0; this.roundMark = 0; this.blocked = null; this.fromStun = false; this.lastStart = null;
        this.patternI = 0;
        this.seen = null;
    }
    r(p) { return this.rng.next() < p; }
    /** Called every frame with the live fight; reads it only through watch() and its own fighter. */
    think(fight) {
        const pic = watch(fight);
        this.history.push(pic);
        const delay = Math.round(this.lv.react);
        if (this.history.length > delay + 1) this.history.shift();
        const seen = this.history[0];
        const me = pic.p[this.i];
        const foe = seen.p[1 - this.i];
        const self = fight.p[this.i];
        return this.decide(me, foe, seen, self, fight);
    }
    press(bit, frames = 2) { this.plan.push({ mask: bit, n: frames }); }
    hold(mask, n) { this.plan.push({ mask, n }); }
    gap(n) { this.plan.push({ mask: 0, n }); }
    dirs(me) { const fwd = me.face > 0 ? BTN.R : BTN.L, back = me.face > 0 ? BTN.L : BTN.R; return { fwd, back }; }
    pressMove(id, me) {
        const { fwd } = this.dirs(me);
        const map = { "5A": [BTN.A], "2A": [BTN.A, BTN.D], "5B": [BTN.B], "2B": [BTN.B, BTN.D], "6B": [BTN.B, fwd], S1: [BTN.S1], S2: [BTN.S2], S3: [BTN.S3], SUP: [BTN.X], TH: [BTN.T], jA: [BTN.A], jB: [BTN.B] };
        const m = map[id] ?? [BTN.A], mask = m.reduce((a, b) => a | b, 0);
        this.plan.push({ mask, n: 3 });
        this.plan.push({ mask: m.length > 1 ? mask & ~(BTN.A | BTN.B) : 0, n: 1 });
    }
    decide(me, foe, seen, self, fight) {
        const lv = this.lv, ai = this.ai;
        const dist = Math.abs(foe.x - me.x);
        const { fwd, back } = this.dirs(me);
        if (lv.solid > 0) {
            if (fight.frame < this.roundMark || this.heat < 0) this.heat = MASH + 1;
            this.study(foe);
            if (fight.phase !== "fight") this.heat = MASH + 1;      // Every round opens with respect.
        }
        // Hit-confirm on what its own body felt, a beat late, as a person does.
        if (this.combo && (self.st === "move" || self.st === "stand")) {
            const c = this.combo;
            if (self.st === "move" && self.landed && self.cancelLeft > 0) {
                c.wait = (c.wait ?? 0) + 1;
                const blocked = fight.p[1 - this.i].st === "gstun";
                if (c.wait >= Math.min(8, lv.react / 3)) {
                    c.i++;
                    c.wait = 0;
                    const next = c.list[c.i];
                    if (!next || (c.i >= lv.combo + 1 && next !== "SUP") || (blocked && (next === "SUP" || ((self.def.moves[next]?.rank ?? 0) >= 3 && !this.r(0.25))))) { this.combo = null; }
                    else this.plan.unshift({ mask: this.maskOf(next, me), n: 2 }, { mask: 0, n: 1 });
                }
            } else if (self.st === "stand") this.combo = null;
        }
        if (this.plan.length) {
            const a = this.plan[0], mask = a.mask;
            if (--a.n <= 0) this.plan.shift();
            return mask;
        }
        const free = me.st === "stand" || me.st === "crouch" || me.st === "guard";
        const inStun = me.st === "gstun";
        if (this.guardFor > 0) {
            this.guardFor--;
            return BTN.G | (this.crouchGuard ? BTN.D : 0);
        }
        if (inStun) {
            this.fromStun = true;
            if (foe.move) this.blocked = foe.move;
            return BTN.G | ((foe.lvl === "H" || foe.y > 20) && lv.solid ? 0 : foe.lvl === "L" || lv.solid ? BTN.D : 0);
        }
        if (me.st === "air") {
            if (me.y > 18 && me.vy < 2 && dist < 90 && Math.abs(foe.y - me.y) < 90 && this.r(0.2)) return this.r(0.5) ? BTN.B : BTN.A;
            return 0;
        }
        if (me.st === "thrown") return this.r(lv.tech) ? BTN.T : 0;
        if (!free) { if (me.st === "down" || me.st === "rise") this.wasDown = true; return 0; }

        // React to what it can see. Every branch is gated by a skill roll, once per thing seen.
        const threat = (foe.phase === "startup" || foe.phase === "active") && foe.rank > 0;
        const key = foe.move ? `${foe.move}|${foe.phase}` : foe.st;
        const fresh = key !== this.seen;
        this.seen = key;
        if (foe.rank > 0 && foe.phase !== "recovery") this.pressure = 40;
        else if (this.pressure > 0) this.pressure--;
        if (this.punishNext) {
            // Just blocked something: answer with the fastest thing available, if it still looks open.
            this.punishNext = false;
            if (dist < 105 && this.r(lv.punish)) { this.startCombo(this.r(0.5) ? ai.bnb[0] : ai.punish, me); return this.emit(); }
        }
        if (this.wasDown) { this.wasDown = false; if (dist < 110 && this.r(lv.punish * 0.45)) { this.pressMove(ai.reversal, me); return this.emit(); } if (dist < 120 && this.r(lv.block)) { this.guardFor = 14; this.crouchGuard = this.r(0.5); return BTN.G; } }
        // Anyone can see a bag of popcorn about to go off. Step away from it.
        const mine = seen.proj.find((q) => q.by !== this.i && q.fused && Math.abs(q.x - me.x) < 66);
        if (mine && this.r(lv.block * 0.25)) { const away = (me.x >= mine.x ? BTN.R : BTN.L); this.hold(away, 18); return this.emit(); }
        if (lv.solid > 0) {
            if (this.r(lv.solid)) { const m = this.solid(me, foe, seen, self, dist, fight, fwd, back); if (m !== null) return m; }
        }
        if (fresh) {
            const incomingProj = seen.proj.find((q) => q.by !== this.i && Math.abs(q.x - me.x) < 150 && Math.sign(q.vx) === Math.sign(me.x - q.x));
            if (incomingProj && this.def.armorDash && this.r(0.7)) { const { fwd: f2 } = this.dirs(me); this.hold(f2, 3); this.gap(1); this.hold(f2, 3); return this.emit(); }
            if (incomingProj && this.r(lv.block)) { this.guardFor = 16; this.crouchGuard = false; return BTN.G; }
            if (foe.y > 40 && foe.vy < 1 && dist < 130 && foe.st !== "juggle" && this.r(lv.aa)) { this.pressMove(ai.aa, me); return this.emit(); }
            if (threat && dist < 150 && this.r(lv.block)) {
                this.guardFor = 12 + Math.round(this.rng.next() * 6); this.crouchGuard = foe.lvl === "L" || (foe.lvl === "M" && this.r(0.3)); this.punishNext = true;
                return BTN.G | (this.crouchGuard ? BTN.D : 0);
            }
            if (foe.st === "move" && foe.phase === "recovery" && foe.recoveryLeft > lv.react * 0.3 + 6 && dist < 170 && this.r(lv.punish)) { this.startCombo(ai.punish, me); return this.emit(); }
            if ((foe.st === "down" || foe.st === "rise") && this.r(0.5)) { this.hold(fwd, 14); return this.emit(); }
        }
        const reach = self.def.moves["5A"].box[0] + self.def.moves["5A"].box[2] / 2 + 30;
        const close = dist < reach, foeGuarding = foe.st === "guard" || foe.st === "gstun";
                if (this.wait > 0) {
            this.wait--;
            // Between decisions, a good player's thumb rests on block.
            if (close && this.pressure > 0 && this.restGuard) return BTN.G;
            return close ? 0 : this.idleMove(me, dist, fwd, back);
        }
        this.wait = Math.round(lv.think * (close ? 0.45 : 0.6 + this.rng.next() * 0.8));
        this.restGuard = this.r(lv.block);
        if (lv.pattern) return this.readable(me, dist, fwd, back);

        // Choose an intent from range, role and resources.
        const meter = self.meter;
        if (meter >= 100 && dist < 150 && !lv.solid && this.r(lv.meterUse * 0.5)) { this.pressMove("SUP", me); return this.emit(); }
        if (this.r(lv.idle)) return 0;
        const mid = dist < ai.ideal + 30, style = ai.style;
        if (close) {
            // Someone in your face: guess, mix, or just hit them first.
            if (this.pressure > 0 && this.r(lv.punish * 0.22)) { this.pressMove(ai.reversal, me); return this.emit(); }
            if (this.pressure > 0 && this.r(lv.block * 0.8)) { this.guardFor = 12 + Math.round(lv.block * 8); this.crouchGuard = this.r(0.5); this.punishNext = true; return BTN.G | (this.crouchGuard ? BTN.D : 0); }
            if (ai.grab && (foeGuarding || style === "grap") && this.r(style === "grap" ? 0.24 : 0.2)) { this.pressMove(ai.grab, me); return this.emit(); }
            if (foeGuarding) {
                const k = this.rng.next();
                if (k < 0.4) { this.pressMove("TH", me); return this.emit(); }
                if (k < 0.65) { this.pressMove("2A", me); return this.emit(); }
                if (k < 0.8) { this.pressMove("6B", me); return this.emit(); }
                this.hold(back, 10);
                return this.emit();
            }
            if (style === "zone" && this.r(0.3)) { this.hold(back, 3); this.gap(1); this.hold(back, 3); return this.emit(); }
            if (this.r(lv.throwRate)) { this.pressMove("TH", me); return this.emit(); }
            this.startCombo(this.rng.pick(ai.bnb.filter((b) => b[0][1] === "A")) ?? ai.bnb[0], me);
            return this.emit();
        }
        if (ai.buff && !self.buff && meter >= 25 && dist > 170 && this.r(0.4)) { this.pressMove(ai.buff, me); return this.emit(); }
        if (style === "zone") {
            // Throwing plates inside their poke range just gets you poked. Back up first.
            const fm = fight.p[1 - this.i].def.moves["5B"], foePoke = fm.box[0] + fm.box[2] / 2 + self.def.width + 8;
            if (lv.solid && dist < foePoke + 22) { if (this.r(0.6)) { this.hold(back, 14); return this.emit(); } this.guardFor = 12; this.crouchGuard = true; return BTN.G | BTN.D; }
            if (dist > ai.ideal - 50 && this.r(0.55)) {
                const proj = fight.proj.filter((q) => q.by === this.i).length;
                if (ai.trap && proj < 2 && this.r(0.35)) { this.pressMove(ai.trap, me); return this.emit(); }
                if (proj < 2) { this.pressMove(ai.far, me); return this.emit(); }
            }
            if (dist < 120 && this.r(0.5)) { this.hold(back, 16); return this.emit(); }
        }
        if (style === "grap" && dist < 110 && this.r(0.3)) { this.hold(fwd, 8); this.pressMove(ai.grab, me); return this.emit(); }
        if (style === "counter" && dist < 150 && foe.rank > 0 && this.r(0.09)) { this.pressMove(ai.reversal, me); return this.emit(); }
        if (mid && this.r(0.55)) {
            if (dist > 100 && this.r(0.45)) { this.hold(fwd, 3); this.gap(1); this.hold(fwd, 3); this.gap(5); }
            if (this.r(0.15)) { this.hold(fwd, 4); this.pressMove("6B", me); return this.emit(); }
            this.startCombo(this.r(0.5) ? [ai.poke, ...ai.bnb[0].slice(-1)] : this.rng.pick(ai.bnb), me);
            return this.emit();
        }
        if (this.r(ai.jump) && dist < 200) { this.hold(BTN.U | fwd, 4); this.gap(10); this.pressMove(this.r(0.6) ? "jB" : "jA", me); return this.emit(); }
        if (dist > ai.ideal + 20) {
            if (this.r(0.4)) { this.hold(fwd, 3); this.gap(1); this.hold(fwd, 3); return this.emit(); }
            if (this.r(0.25) && ai.far) { this.pressMove(ai.far, me); return this.emit(); }
            this.hold(fwd, 18);
            return this.emit();
        }
        if (dist < ai.ideal - 30 && this.r(0.4)) { this.hold(back, 12); return this.emit(); }
        // Footsies: step in and out of range.
        this.hold(this.r(0.6) ? fwd : back, 8);
        return this.emit();
    }
    backstep(back) { this.hold(back, 1); this.gap(1); this.hold(back, 1); this.gap(10); }
    /** Confirmable strings, ending in the super when the gauge is full. */
    finish(list, self) { return self.meter >= 100 ? [...list, "SUP"] : list; }
    bnb(self, me) { this.startCombo(this.finish(this.ai.bnb.find((b) => b[0] === "5A") ?? ["5A", "5B", this.ai.punish.at(-1)], self), me); }
    poke(self, me) { this.startCombo(this.finish(["5B", this.ai.punish.at(-1)], self), me); }
    /** Habit tracking from what is visible: how often they swing, and whether those swings go low. */
    study(foe) {
        this.heat *= 0.994; this.lows *= 0.998;
        const start = foe.rank > 0 && foe.phase === "startup" ? foe.move : null;
        if (start && start !== this.lastStart) { this.heat += 1; if (foe.lvl === "L") this.lows += 1; }
        this.lastStart = start;
    }
    /**
     * Fundamentals, for the top levels. Nothing here reads a button: it uses the published frame data of the move it
     * can see, the delay it saw it with, and the opponent's visible habits. Returns a mask, or null for "nothing urgent".
     */
    solid(me, foe, seen, self, dist, fight, fwd, back) {
        const lv = this.lv, ai = this.ai, moves = self.def.moves, foeDef = fight.p[1 - this.i].def, delay = Math.round(lv.react);
        const reachOf = (d, id) => d.moves[id].box[0] + d.moves[id].box[2] / 2 + 32;
        const jabR = reachOf(self.def, "5A"), pokeR = reachOf(self.def, "5B"), foeR = foeDef.moves["5A"].box[0] + foeDef.moves["5A"].box[2] / 2 + self.def.width + 16;
        // A super flash lasts longer than any reaction: block it, or leave if it's a grab.
        if (seen.flash === 1 - this.i) {
            if (foeDef.moves.SUP.grab && dist < 170) { this.hold(BTN.U | back, 4); return this.emit(); }
            this.guardFor = 30; this.crouchGuard = false;
            return BTN.G;
        }
        // Out of blockstun: if the thing just blocked is minus, the published numbers say it's my turn.
        if (this.fromStun) {
            this.fromStun = false;
            const m = this.blocked ? foeDef.moves[this.blocked] : null, adv = m ? m.bs - (m.a - 1) - m.r : 0;
            // A light string has run out of chain, or they're plainly mashing: step out and let the next one whiff.
            const cornered = (me.x * (foe.x > me.x ? -1 : 1)) > 250, rev = moves[ai.reversal];
            // ...unless what's on screen now says they cancelled it into something else.
            const moved = foe.rank > 0 && foe.phase !== "recovery" && foe.move !== this.blocked;
            if (adv <= -3 && !moved) {
                if (dist < jabR) { this.bnb(self, me); return this.emit(); }
                if (dist < pokeR) { this.poke(self, me); return this.emit(); }
            }
            // Against a masher, the gap in a string is where a reversal goes. Armor just walks through the lights.
            if (this.heat > MASH) {
                const reaches = rev.parry || rev.proj || dist < rev.box[0] + rev.box[2] / 2 + 44;
                if (reaches && this.r(0.76)) { this.pressMove(ai.reversal, me); return this.emit(); }
                if (!cornered && !(foe.rank > 0 && foe.phase !== "recovery") && this.r(0.5)) { this.backstep(back); return this.emit(); }
                this.guardFor = 5; this.crouchGuard = !(foe.y > 20);
                return BTN.G | (this.crouchGuard ? BTN.D : 0);
            }
            this.guardFor = 6; this.crouchGuard = !(foe.y > 20);
            return BTN.G | (this.crouchGuard ? BTN.D : 0);
        }
        // They're stuck in recovery: hit them with the biggest thing that gets there in time.
        if (foe.st === "move" && foe.phase === "recovery") {
            const left = foe.recoveryLeft - delay;
            if (left >= moves["5B"].s + 1 && dist < pokeR) { this.poke(self, me); return this.emit(); }
            if (left >= moves["5A"].s + 1 && dist < jabR) { this.bnb(self, me); return this.emit(); }
        }
        const mid = foe.rank > 0 && foe.phase !== "recovery";
        if (mid && foe.lvl === "H" && dist < 170) { this.guardFor = 14; this.crouchGuard = false; return BTN.G; }
        if (this.heat < MASH) return null;
        // They keep swinging. Stay just outside their reach, stuff the walk-in, and let the rest whiff.
        const closing = (foe.x > me.x ? -foe.vx : foe.vx) > 0.4, soon = dist - (closing ? Math.abs(foe.vx) * (delay + moves["5B"].s) : 0);
        const grabs = Object.values(foeDef.moves).some((x) => x.cmd && x.rank === 3);
        if (dist < foeR + 8) {
            if (grabs && !mid && this.r(0.3)) { this.backstep(back); return this.emit(); }
            if (!mid && foe.st === "stand" && this.r(0.07)) { this.bnb(self, me); return this.emit(); }
            this.guardFor = 4; this.crouchGuard = !(foe.y > 20);
            return BTN.G | (this.crouchGuard ? BTN.D : 0);
        }
        if (!mid && soon < pokeR && soon > foeR - 26 && (closing || dist < pokeR)) { this.poke(self, me); return this.emit(); }
        if (!mid && closing && soon <= foeR - 26) { this.guardFor = 8; this.crouchGuard = !(foe.y > 20); return BTN.G | (this.crouchGuard ? BTN.D : 0); }
        if (dist < foeR + 34) { this.guardFor = 3; this.crouchGuard = !(foe.y > 20); return BTN.G | (this.crouchGuard ? BTN.D : 0); }
        if (dist < pokeR + 30) return back;
        return null;
    }
    /** Easy mode: a human can read this. Walk in, wind up, swing, stop and look around. */
    readable(me, dist, fwd, back) {
        const ai = this.ai, step = this.patternI++ % 6;
        if (this.r(this.lv.idle)) { this.gap(24); return 0; }
        if (dist > 130) { if (ai.style === "zone" && step % 3 === 0) this.pressMove(ai.far, me); else this.hold(fwd, 26); return this.emit(); }
        if (step === 5) { this.hold(back, 26); this.gap(30); return this.emit(); }
        if (step === 3 && this.r(0.5)) this.pressMove("6B", me);
        else if (step === 2) this.pressMove("2A", me);
        else this.pressMove(this.r(0.5) ? "5B" : "5A", me);
        this.gap(46);
        return this.emit();
    }
    startCombo(list, me) { this.combo = { list, i: 0 }; this.plan.push({ mask: this.maskOf(list[0], me), n: 3 }); }
    maskOf(id, me) {
        const { fwd } = this.dirs(me);
        return { "5A": BTN.A, "2A": BTN.A | BTN.D, "5B": BTN.B, "2B": BTN.B | BTN.D, "6B": BTN.B | fwd, S1: BTN.S1, S2: BTN.S2, S3: BTN.S3, SUP: BTN.X, TH: BTN.T }[id] ?? BTN.A;
    }
    emit() { if (!this.plan.length) return 0; const a = this.plan[0], m = a.mask; if (--a.n <= 0) this.plan.shift(); return m; }
    idleMove(me, dist, fwd, back) {
        const ideal = this.ai.ideal;
        if (this.lv.pattern) return 0;
        if (dist > ideal + 30) return fwd;
        if (dist < ideal - 40 && this.ai.style === "zone") return back;
        return 0;
    }
}
