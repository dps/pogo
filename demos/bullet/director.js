// The conductor and the pattern language. Patterns are generators that `yield` a number of beats, so a phase reads like a score.
// Scripts run one beat AHEAD of the music: that lets each burst gather light for a beat, schedule its bell exactly on the note,
// and then release on the beat itself. Nothing in a pattern is timed in steps.
import { F_ENTER, F_MARCH } from "./bullets.js";
import { GOLD, PEARLB, PEARL } from "./art.js";
import { midiFreq } from "./music.js";

const TAU = Math.PI * 2;

/** Song time. Follows game.audio.song, smoothly, and survives audio being blocked or stalled. */
export class Conductor {
    constructor(game) { this.game = game; this.song = null; this.t = 0; this.last = -1e9; this.stall = 0; this.free = false; }
    play(song) {
        this.song = song; this.t = 0; this.last = -1e9; this.stall = 0; this.free = false; this.spb = song.secBeat;
        this.game.music(song.pogo);
    }
    stop() { this.game.stopMusic(); this.song = null; }
    /** Advance one step; returns seconds of song that passed, which is what the world moves by. */
    step(dt) {
        if (!this.song) return dt;
        const raw = this.game.audio.song.time, before = this.t;
        if (raw !== this.last) { this.last = raw; this.stall = 0; this.free = false; } else if (++this.stall > 20) this.free = true;
        this.t += dt;
        if (!this.free) {
            const err = raw - this.t;
            if (err > 0.3) this.t = raw;              // Lost time: a dropped-frame burst. Catch up at once.
            else if (err < -0.3) this.t -= 0.016;     // Ran ahead (a suspended tab). Hold back gently.
            else this.t += err * (Math.abs(err) > 0.05 ? 0.3 : 0.1);
        }
        return Math.max(0, Math.min(this.t - before, 0.05));
    }
    get beat() { return this.t / (this.spb ?? 1); }
    get meter() { return this.song?.meter ?? 4; }
}

/** The surge of a beat: bullets flagged march move in steps, in time, and cover the same ground as if they glided. */
export function marchAt(beat) { const f = beat - Math.floor(beat); return 0.47 + 2.2 * Math.exp(-f * 4.2); }

export class Director {
    constructor(play) { this.p = play; this.scripts = []; this.pending = []; this.cursor = 0; this.rows = {}; this.bellI = 0; this.log = []; this.maxLate = 0; this.lastBell = -1; }
    get b() { return this.p.bullets; }
    get d() { return this.p.diff; }
    get lvl() { return this.p.diff.lvl; }
    /** How many beads deep each ray or wall is. Density climbs without narrowing the doors between rays. */
    get depth() { return Math.max(1, Math.round((this.p.stage.depth ?? 3) * this.d.depth)); }
    get song() { return this.p.cond.song; }
    get rng() { return this.p.s.rng; }
    get meter() { return this.p.cond.meter; }
    get moth() { return this.p.moth; }
    bars(n) { return n * this.meter; }
    sec(beats) { return beats * this.p.cond.spb; }
    n(x, min = 3) { return Math.max(min, Math.round(x * this.d.n)); }
    sp(x) { return x * this.d.sp; }
    get W() { return this.p.W; }
    get H() { return this.p.H; }
    aim(from) { const f = this.pos(from); return Math.atan2(this.moth.y - f[1], this.moth.x - f[0]); }
    pos(a) { return Array.isArray(a) ? a : [a.x, a.y]; }

    clear(owner) {
        if (owner === undefined) { this.scripts.length = 0; this.pending.length = 0; this.rows = {}; return; }
        this.scripts = this.scripts.filter((s) => s.owner !== owner); this.pending = this.pending.filter((e) => e.owner !== owner);
    }
    /** Start a generator at a beat. owner ties it to an enemy or phase, so it dies with them. */
    run(gen, owner = null, at = this.cursor) { this.scripts.push({ it: gen, next: at, owner }); }
    after(beats, fn) { this.fire(fn, this.cursor + beats); }
    fire(fn, at = this.cursor) { this.pending.push({ at, fn, owner: this.owner }); }

    update(beat) {
        const lead = 1;
        for (let i = 0; i < this.scripts.length; i++) {
            const s = this.scripts[i];
            let guard = 0;
            while (s.next <= beat + lead && !s.done) {
                this.cursor = s.next; this.owner = s.owner;
                const r = s.it.next();
                if (r.done) { s.done = true; break; }
                if (!(r.value > 0)) throw new Error("A pattern yielded no time.");
                s.next += r.value;
                if (++guard > 64) throw new Error("Pattern ran away.");
            }
            if (s.done) { this.scripts.splice(i--, 1); }
        }
        const p = this.pending, songNow = this.p.cond.song;
        for (let i = 0; i < p.length; i++) {
            const e = p[i];
            if (this.p.cond.song !== songNow) break;      // A new song starts counting beats from zero.
            if (e.at <= beat) {
                p.splice(i--, 1);
                this.owner = e.owner; this.cursor = e.at;
                const late = (beat - e.at) * this.p.cond.spb; if (late > this.maxLate) this.maxLate = late;
                e.fn(late);
                this.log.push(e.at);
                if (this.log.length > 512) this.log.shift();
            }
        }
    }

    // --- Pattern primitives -----------------------------------------------------------------------------

    /** A soft bell on the note the burst lands on. Runs of bursts walk up the chord, so the pattern plays along. */
    bell(i = null, vol = 0.055, oct = 5) {
        const song = this.song; if (!song || this.p.quiet) return;
        const at = this.cursor; if (at === this.lastBell) return; this.lastBell = at;
        const m = song.bellNote(at, i ?? this.bellI++, oct), f = midiFreq(m);
        this.p.game.audio.playAt([{ wave: "sine", freq: f, decay: 0.5, attack: 0.004, volume: vol }, { wave: "sine", freq: f * 3, decay: 0.12, volume: vol * 0.25 }], at * this.p.cond.spb);
    }
    /** Light gathering into a point over the beat before a burst. */
    gather(at, hue, big = 56) {
        const [x, y] = this.pos(at), delay = Math.max(0, (this.cursor - this.p.cond.beat - 1)) * this.p.cond.spb, life = this.sec(1) * 0.98;
        this.p.fx.ring(x, y, hue, big, 8, life, 0.5, delay);
    }

    /** n bullets in a circle or arc. See the options in bulletOpts. */
    ring(o) {
        const n = o.exact ? o.n : this.n(o.n, 2), at = o.at ?? this.p.boss ?? [180, 150];
        if (o.tele !== false) this.gather(at, o.hue ?? 3, o.gatherR ?? 56);
        if (o.bell !== false) this.bell(o.bell ?? null, o.vol);
        const arc = o.arc ?? TAU, full = arc >= TAU - 1e-3, sp = this.sp(o.sp), jit = o.a0 === "aim" ? 0 : 0;
        const gapC = o.gapC, gapW = o.gapW ?? 0, depth = o.solo ? 1 : (o.depth ?? this.depth), step = o.step ?? 0.055;
        this.fire((late) => {
            const [x, y] = this.pos(at);
            const base = (o.a0 === "aim" ? this.aim(at) + (o.off ?? 0) : typeof o.a0 === "function" ? o.a0() : (o.a0 ?? 0)) + jit;
            const row = [], c = gapC === "aim" ? this.aim(at) : gapC;
            const opts = this.opts(o);
            for (let i = 0; i < n; i++) {
                const a = full ? base + (i / n) * TAU : base + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0);
                if (gapW) { const e = Math.atan2(Math.sin(a - c), Math.cos(a - c)); if (Math.abs(e) < gapW / 2) { row.push(-1); continue; } }
                const r0 = o.r0 ?? 8, px = x + Math.cos(a) * (r0 + sp * late), py = y + Math.sin(a) * (r0 + sp * late);
                if (o.wAlt) opts.w = (i % 2 ? 1 : -1) * o.wAlt;
                if (o.hueAlt !== undefined) opts.hue = i % 2 ? o.hueAlt : o.hue ?? 3;
                row.push(this.b.add(px, py, sp, a, opts));
                // The ray behind the lead bead: same heading, a little slower, so it draws out into a line of light.
                for (let k = 1; k < depth; k++) { const f = 1 - k * step; this.b.add(px, py, sp * f, a, { ...opts, maxS: opts.maxS * f, size: opts.size * (1 - k / depth * 0.3), spd2: opts.spd2 === undefined ? undefined : opts.spd2 * f, minS: opts.minS * f, wait: opts.wait }); }
            }
            if (o.mesh) this.weld(o.mesh, row, full, o.pane ?? o.hue ?? 3, o.paneAlt, o.shade);
        });
    }
    opts(o) {
        return { kind: o.kind ?? PEARLB, hue: o.hue ?? 3, size: o.size ?? 1, w: o.w ?? 0, acc: o.acc ?? 0, minS: o.minS ?? 0, maxS: o.maxS ?? 900, wait: o.wait ? this.sec(o.wait) : 0, turn: o.turn ?? 0, spd2: o.spd2 !== undefined ? this.sp(o.spd2) : undefined, wob: o.wob ?? 0, wobF: o.wobF ?? 0, flags: (o.march ? F_MARCH : 0) | (o.flags ?? 0), life: o.life ?? 18, fall: o.fall ?? 0 };
    }
    /** Join this row of bullets to the last row in glass: the living window. */
    weld(key, row, wrap, hue, alt, shade = 1) {
        const prev = this.rows[key]; this.rows[key] = row;
        if (!prev || prev.length !== row.length) return;
        const n = row.length, b = this.b, last = wrap ? n : n - 1;
        for (let i = 0; i < last; i++) {
            const j = (i + 1) % n, a = row[i], c = row[j], d = prev[i], e = prev[j];
            if (a < 0 || c < 0 || d < 0 || e < 0) continue;
            const h = alt !== undefined && i % 2 ? alt : hue;
            b.pane(a, c, d, h, shade); b.pane(c, d, e, h, shade * 0.8);
        }
    }
    /** One bullet, or several in a tight aimed line. */
    shot(o) {
        const at = o.at ?? this.p.boss, n = o.line ?? 1, sp = this.sp(o.sp);
        if (o.bell !== false) this.bell(o.bell ?? null, o.vol ?? 0.04);
        if (o.tele) this.gather(at, o.hue ?? 3, 36);
        this.fire(() => {
            const [x, y] = this.pos(at), a = o.a0 === "aim" || o.a0 === undefined ? this.aim(at) + (o.off ?? 0) : o.a0, op = this.opts(o);
            for (let i = 0; i < n; i++) this.b.add(x, y, sp * (1 + i * (o.lineStep ?? 0.09)), a, op);
        });
    }
    /** Bullets laid along a line between two points. */
    row(o) {
        const n = o.exact ? o.n : this.n(o.n, 2), [ax, ay] = o.from, [bx, by] = o.to, sp = this.sp(o.sp ?? 0), thick = o.thick ?? 1;
        if (o.bell !== false) this.bell(o.bell ?? null, o.vol);
        this.fire(() => {
            const op = this.opts(o), row = [];
            for (let i = 0; i < n; i++) {
                const t = n > 1 ? i / (n - 1) : 0.5;
                if (o.skip && o.skip(t, i)) { row.push(-1); continue; }
                op.flags |= (ax + (bx - ax) * t < -8 || ay + (by - ay) * t < -8 || ax + (bx - ax) * t > this.W + 8 || ay + (by - ay) * t > this.H + 8) ? F_ENTER : 0;
                // Rows ripple, and each layer behind sits in the gaps of the one before, so a wall reads as water and not as a grid.
                const ripple = o.wave ? Math.sin(t * 9 + this.cursor * 0.7) * o.wave : 0, px = ax + (bx - ax) * t, py = ay + (by - ay) * t + ripple, a = typeof o.a === "function" ? o.a(t, i) : (o.a ?? Math.PI / 2);
                row.push(this.b.add(px, py, sp, a, op));
                for (let k = 1; k < thick; k++) { const q = this.b.add(px - Math.cos(a) * k * 10 + (k % 2 ? 7 : 0) * Math.sin(a), py - Math.sin(a) * k * 10, sp, a, { ...op, flags: op.flags | F_ENTER }); if (q < 0) break; }
            }
            if (o.mesh) this.weld(o.mesh, row, false, o.pane ?? o.hue ?? 3, o.paneAlt, o.shade);
        });
    }
    /** A horizontal row sweeping down, with one gap the width the moth needs. */
    lane(o) { const w = o.gap ?? 56, c = o.c; return this.row({ thick: this.depth, ...o, wave: o.wave ?? 12, from: [-6, o.y ?? -10], to: [this.W + 6, o.y ?? -10], a: Math.PI / 2, skip: (t) => Math.abs(t * this.W - c) < w / 2 }); }

    /** A thin line of light along where something is about to appear. */
    warn(from, to, hue) {
        const n = 14, delay = Math.max(0, this.cursor - this.p.cond.beat - 1) * this.p.cond.spb, life = this.sec(1);
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; this.p.fx.add(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, { s0: 16, s1: 7, life, a: 0.55, hue, delay }); }
    }
    /** Move an actor on the beat. */
    glide(a, x, y, beats, ease = "inOut") { this.fire(() => { a.tw = { x0: a.x, y0: a.y, x1: x, y1: y, t0: this.p.cond.beat, t1: this.p.cond.beat + beats, ease }; }); }
    enemy(kind, o) {
        this.fire(() => { this.p.spawnEnemy(kind, o); });
    }
    /** A beat in a boss's little story. */
    pose(fn) { this.fire(fn); }
}
export { GOLD, PEARL };
