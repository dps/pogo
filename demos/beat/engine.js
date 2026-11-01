// The judge: pure rules with no Pogo in it, so bots can play every chart thousands of times in Node.
// All times are seconds of song time. The player's input arrives with a time; nothing here knows about steps or frames.

/** Hit windows in seconds, either side of the note. Early songs get wider ones. */
export const WINDOWS = {
    easy: { perfect: 0.06, great: 0.105, ok: 0.17 },
    normal: { perfect: 0.05, great: 0.09, ok: 0.145 },
    hard: { perfect: 0.042, great: 0.075, ok: 0.12 },
};
export function windowsFor(diff, songIndex = 99, practice = false) {
    const w = WINDOWS[diff], k = 1 + Math.max(0, 0.22 - songIndex * 0.04) + (practice ? 0.1 : 0);
    return { perfect: w.perfect * k, great: w.great * k, ok: w.ok * k };
}

const VALUE = { perfect: 300, great: 200, ok: 80, miss: 0 };
const WEIGHT = { perfect: 1, great: 0.8, ok: 0.4, miss: 0 };
const METER = { perfect: 0.034, great: 0.022, ok: 0.006, miss: -0.09 };

export function grade(acc) { return acc >= 0.98 ? "S+" : acc >= 0.94 ? "S" : acc >= 0.86 ? "A" : acc >= 0.74 ? "B" : acc >= 0.58 ? "C" : "D"; }
export const PASS = { easy: 0.5, normal: 0.58, hard: 0.62 };
export const stars = (acc) => (acc >= 0.94 ? 3 : acc >= 0.82 ? 2 : 1);

export class Judge {
    constructor(notes, o = {}) {
        this.notes = notes.map((n) => ({ ...n, state: "wait", hits: 0, need: 0, pressAt: 0, ticks: 0 }));
        this.w = o.windows ?? WINDOWS.normal;
        this.feverLength = o.feverLength ?? 8;
        this.on = o.on ?? (() => {});
        this.score = 0; this.combo = 0; this.maxCombo = 0;
        this.counts = { perfect: 0, great: 0, ok: 0, miss: 0 };
        this.meter = 0; this.feverUntil = -1; this.fevers = 0;
        this.earned = 0; this.judged = 0;
        this.first = 0;
        this.early = 0; this.late = 0; this.deltas = 0; this.deltaN = 0;
        this.total = this.notes.length;
    }
    get fever() { return this.now < this.feverUntil; }
    now = 0;
    get accuracy() { return this.judged ? this.earned / this.judged : 1; }
    /** Accuracy as a share of the whole song, which is what the grade uses. */
    get finalAccuracy() { return this.total ? this.earned / this.total : 0; }
    get multiplier() { return Math.min(4, 1 + Math.floor(this.combo / 12) * 0.5) * (this.fever ? 2 : 1); }

    gradeOf(d) { const a = Math.abs(d); return a <= this.w.perfect ? "perfect" : a <= this.w.great ? "great" : a <= this.w.ok ? "ok" : null; }

    award(g, note, delta = 0) {
        this.counts[g]++;
        this.judged++;
        this.earned += WEIGHT[g];
        if (g === "miss") { this.combo = 0; }
        else { this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); }
        this.score += Math.round(VALUE[g] * this.multiplier);
        if (g !== "miss" && g !== "ok" && note.kind !== "roll") { this.deltas += delta; this.deltaN++; if (delta < -this.w.perfect) this.early++; else if (delta > this.w.perfect) this.late++; }
        if (!this.fever) {
            this.meter = Math.max(0, Math.min(1, this.meter + METER[g]));
            if (this.meter >= 1) {
                this.meter = 0; this.fevers++;
                this.feverUntil = this.now + this.feverLength;
                this.on({ type: "fever" });
            }
        }
        this.on({ type: g === "miss" ? "miss" : "hit", grade: g, note, delta, combo: this.combo });
    }

    /** The note a press on this lane is aiming at, or null. Earliest first. */
    find(lane, t) {
        for (const n of this.notes) {
            if (n.time - t > this.w.ok) break;
            if (n.lane !== lane || n.state !== "wait") continue;
            if (t - n.time <= this.w.ok) return n;
        }
        return null;
    }
    roll(lane, t) {
        for (const n of this.notes) {
            if (n.time - t > this.w.ok) break;
            if (n.kind === "roll" && n.lane === lane && n.state !== "done" && t <= n.time + n.dur) return n;
        }
        return null;
    }

    /** A finger or key went down. Returns the note it took, if any. */
    press(lane, t) {
        this.now = Math.max(this.now, t);
        const r = this.roll(lane, t);
        if (r) {
            if (r.state === "wait") { r.state = "rolling"; r.need = Math.max(3, Math.round(r.dur / 0.125)); }
            r.hits++;
            this.score += Math.round(30 * this.multiplier);
            if (!this.fever) this.meter = Math.min(1, this.meter + 0.004);
            this.on({ type: "roll", note: r, hits: r.hits, need: r.need });
            return r;
        }
        const n = this.find(lane, t);
        if (!n) { this.on({ type: "stray", lane, t }); return null; }
        const d = t - n.time;
        n.pressAt = t;
        if (n.kind === "swipe") { n.state = "cocked"; n.delta = d; this.on({ type: "cock", note: n }); return n; }
        if (n.kind === "hold") { n.state = "held"; this.award(this.gradeOf(d), n, d); this.on({ type: "holdStart", note: n }); return n; }
        n.state = "done";
        this.award(this.gradeOf(d), n, d);
        return n;
    }

    /** A flick was seen, on the lane it began. Generous: a cocked note on any lane counts, then the nearest waiting swipe. */
    swipe(lane, t) {
        this.now = Math.max(this.now, t);
        let n = this.notes.find((x) => x.kind === "swipe" && x.state === "cocked" && x.lane === lane) ?? this.notes.find((x) => x.kind === "swipe" && x.state === "cocked");
        if (!n) {
            n = this.notes.find((x) => x.kind === "swipe" && x.state === "wait" && Math.abs(x.time - t) <= this.w.ok);
            if (!n) return null;
            n.delta = t - n.time;
        }
        n.state = "done";
        this.award(this.gradeOf(n.delta), n, n.delta);
        this.on({ type: "swiped", note: n });
        return n;
    }

    /** A finger or key came up. */
    release(lane, t) {
        this.now = Math.max(this.now, t);
        for (const n of this.notes) {
            if (n.time > t) break;
            if (n.lane !== lane) continue;
            if (n.state === "cocked") {
                // Tapped a swipe note without flicking: a little credit, no fever.
                n.state = "done";
                this.award("ok", n, n.delta);
                this.on({ type: "lazySwipe", note: n });
            } else if (n.state === "held") {
                if (t >= n.time + n.dur - Math.max(0.14, n.dur * 0.2)) this.finishHold(n);
                else { n.state = "done"; this.combo = 0; this.on({ type: "dropHold", note: n }); }
            }
        }
    }

    finishHold(n) {
        n.state = "done";
        const bonus = Math.round(100 * this.multiplier);
        this.score += bonus;
        this.on({ type: "holdEnd", note: n, bonus });
    }

    /** Advance time: miss what has passed, tick holds, finish rolls. Call every step. */
    tick(t) {
        this.now = Math.max(this.now, t);
        for (let i = this.first; i < this.notes.length; i++) {
            const n = this.notes[i];
            if (n.time - t > 1) break;
            if (n.state === "held") {
                const ticks = Math.floor((t - n.time) / 0.2);
                if (ticks > n.ticks && t < n.time + n.dur) { n.ticks = ticks; this.score += Math.round(10 * this.multiplier); this.on({ type: "holdTick", note: n }); }
                if (t >= n.time + n.dur) this.finishHold(n);
            }
            if (n.state === "cocked" && t - n.pressAt > 0.22) {
                n.state = "done";
                this.award("ok", n, n.delta);
                this.on({ type: "lazySwipe", note: n });
            }
            if (n.kind === "roll" && (n.state === "rolling" || n.state === "wait")) {
                if (t > n.time + n.dur) {
                    const ratio = n.need ? n.hits / n.need : 0;
                    n.state = "done";
                    this.award(ratio >= 0.7 ? "perfect" : ratio >= 0.4 ? "great" : ratio > 0.1 ? "ok" : "miss", n, 0);
                }
            } else if (n.state === "wait" && t - n.time > this.w.ok) {
                n.state = "done";
                this.award("miss", n);
            }
            if (i === this.first && n.state === "done") this.first++;
        }
    }

    get finished() { return this.first >= this.notes.length; }
}

/** Every number the results screen wants. */
export function summary(j, diff) {
    const acc = j.finalAccuracy, g = grade(acc), passed = acc >= PASS[diff];
    return { score: j.score, acc, grade: g, passed, stars: passed ? stars(acc) : 0, maxCombo: j.maxCombo, full: j.counts.miss === 0, counts: { ...j.counts }, fevers: j.fevers, early: j.early, late: j.late, bias: j.deltaN ? j.deltas / j.deltaN : 0 };
}
