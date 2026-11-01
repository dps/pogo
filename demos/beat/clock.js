// The only source of time in the game. Reads game.audio.song, smooths it, and survives audio being blocked.
//
// Audio blocked: the framework's song clock holds still if a context exists but never runs, so a song that doesn't move
// within half a second switches to a step-counted clock and stops the music, so nothing can start late and out of sync.
// Everything downstream calls clock.now(), and doesn't care which clock it got.

const STALL_STEPS = 30;

export class BeatClock {
    constructor(game) {
        this.game = game;
        this.arr = null;
        this.loop = false;
        this.silent = false;
        this.paused = false;
        this.onStall = null;
        this.stamps = [];
        this.time = 0;
        this.silentT = 0;
        this.lastStep = 0;
        this.lastRaw = -1e9;
        this.stall = 0;
        this.moved = false;
        this.sm = 0; this.smAt = 0; this.shown = 0;
        this.forceSilent = false;
        // Stamp input the moment the browser delivers it, not at the next step. A 16 ms step is a whole "perfect" tier on hard.
        if (typeof addEventListener === "function" && !game.headless) {
            const stamp = (e) => { if (e.repeat) return; this.gesture = true; this.stamps.push({ t: this.now(), at: performance.now() }); if (this.stamps.length > 8) this.stamps.shift(); };
            addEventListener("pointerdown", stamp, { capture: true, passive: true });
            addEventListener("keydown", stamp, { capture: true, passive: true });
        }
    }

    /** Play an arrangement from arrange(). */
    play(arr, o = {}) {
        this.stop();
        this.arr = arr; this.loop = !!o.loop;
        this.silent = this.forceSilent; this.paused = false;
        this.time = 0; this.silentT = 0; this.lastStep = this.game.stepCount; this.lastRaw = -1e9; this.stall = 0; this.moved = false;
        this.sm = 0; this.smAt = 0; this.shown = 0;
        if (!this.silent) this.game.music(arr.pogo);
        this.buildMaps(arr);
        // No audio device at all: the framework's own fallback would work, but this way everything knows it's silent.
        if (!this.silent && !this.game.headless && !this.game.audio.ctx) this.goSilent();
    }
    stop() { this.game.stopMusic(); this.arr = null; }

    buildMaps(a) {
        const last = (src) => { const out = new Int32Array(a.n); let at = -1; for (let i = 0; i < a.n; i++) { if (src(i)) at = i; out[i] = at; } return out; };
        const pulse = new Uint8Array(a.n), down = new Uint8Array(a.n);
        for (const p of a.pulses) { pulse[p.step] = 1; if (p.down) down[p.step] = 1; }
        a.lastKick ??= last((i) => a.seq.kick[i]);
        a.lastSnare ??= last((i) => a.seq.snare[i]);
        a.lastPulse ??= last((i) => pulse[i]);
        a.lastDown ??= last((i) => down[i]);
        if (!a.pulseNo) { a.pulseNo = new Int32Array(a.n); let c = -1; for (let i = 0; i < a.n; i++) { if (pulse[i]) c++; a.pulseNo[i] = c; } }
    }

    /** Call once per step. Works through hit-stop and pause, from a ui entity. */
    step() {
        const g = this.game, dt = g.dt * (g.stepCount - this.lastStep);
        this.lastStep = g.stepCount;
        if (!this.arr) return;
        if (this.paused) return;
        // Audio can't start before the first gesture. If a menu loop gave up waiting, try again now one has happened.
        if (this.gesture) { this.gesture = false; if (this.silent && this.loop && !this.forceSilent) { this.play(this.arr, { loop: true }); return; } }
        this.silentT += dt;
        if (this.silent) { this.time = this.silentT; return; }
        const raw = g.audio.song;
        if (Math.abs(raw.time - this.lastRaw) < 1e-7) this.stall++;
        else { this.stall = 0; if (this.lastRaw > -1e8) this.moved = true; }
        this.lastRaw = raw.time;
        if (this.stall > STALL_STEPS) {
            if (!this.moved) this.goSilent();
            else { this.stall = 0; this.onStall?.(); }     // It ran and then stopped: a phone call, a lock screen. Treat it as a pause.
            return;
        }
        this.time = raw.time;
        this.silentT = this.moved ? raw.time : this.silentT;
    }

    goSilent() {
        this.silent = true;
        this.game.stopMusic();
        this.time = this.silentT;
    }

    /** The best estimate of song time right now, for draws and input stamps. Smooth, and it never runs backwards. */
    now() {
        if (!this.arr) return 0;
        const g = this.game;
        if (this.silent) return this.paused ? this.silentT : this.silentT + (g._alpha ?? 0) * g.dt;
        if (g.headless || this.paused) return this.time;
        const raw = g.audio.song.time, pn = performance.now() / 1000;
        const pred = this.sm + (this.smAt ? pn - this.smAt : 0), err = raw - pred;
        // Audio time moves in buffer-sized jumps. Follow it gently, so notes glide, and snap if it really moved.
        this.sm = Math.abs(err) > 0.05 ? raw : pred + err * 0.08;
        this.smAt = pn;
        if (this.sm > this.shown || this.shown - this.sm > 0.05) this.shown = this.sm;
        return this.shown;
    }

    /** The time an input really happened, falling back to now. */
    takeStamp(fallback) {
        if (this.game.headless) return fallback;
        const cut = performance.now() - 70;
        while (this.stamps.length && this.stamps[0].at < cut) this.stamps.shift();
        const s = this.stamps.shift();
        return s ? s.t : fallback;
    }

    pause() { if (this.paused) return; this.paused = true; if (!this.silent) this.game.audio.suspend(); }
    resume() {
        if (!this.paused) return;
        this.paused = false; this.stall = 0; this.lastStep = this.game.stepCount;
        if (!this.silent) { this.lastRaw = -1e9; this.game.audio.resume(); }
    }

    /** Where the music is, for everything that dances. Values fall from 1 to 0 after each hit. */
    bop(t = this.now()) {
        const a = this.arr;
        if (!a) return IDLE;
        const len = a.n * a.stepDur;
        let tt = Math.max(0, t);
        if (this.loop) tt %= len; else tt = Math.min(tt, len - 0.001);
        const step = Math.min(a.n - 1, Math.floor(tt / a.stepDur)), age = (arr, k) => { const at = arr[step]; return at < 0 ? 0 : Math.exp(-(tt - at * a.stepDur) * k); };
        B.kick = age(a.lastKick, 9); B.snare = age(a.lastSnare, 11); B.pulse = age(a.lastPulse, 7); B.down = age(a.lastDown, 5);
        // Phase runs 0..1 between pulses, for swaying. In 7/8 the pulses are uneven, and so is the sway.
        const p = a.lastPulse[step];
        let next = p + 1;
        while (next < a.n && a.lastPulse[next] === p) next++;
        B.phase = p < 0 ? 0 : (tt - p * a.stepDur) / ((next - p) * a.stepDur);
        B.count = a.pulseNo[step];
        B.flip = B.count % 2 ? 1 : -1;
        B.sway = Math.cos(B.phase * Math.PI) * B.flip;
        B.t = tt;
        return B;
    }
}

const B = { kick: 0, snare: 0, pulse: 0, down: 0, phase: 0, count: 0, flip: 1, sway: 0, t: 0 };
const IDLE = { kick: 0, snare: 0, pulse: 0, down: 0, phase: 0, count: 0, flip: 1, sway: 0, t: 0 };
