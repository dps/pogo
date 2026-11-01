// All audio and haptics. Engine and tyre noise are continuous, which Pogo's one-shot tones can't do,
import { loadSave } from "./data.js";
// so they run on a small Web Audio graph of their own hung off game.audio.

const seq = (s) => s.trim().split(/\s+/).join(" ");
// Each song is bass, chords stabs, lead and a soft kit. All tracks share one length so they loop together.
const SONGS = {
    menu: { // lounge muzak: the sound of aisle nine on a quiet Tuesday
        bpm: 104, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, notes: seq("F2 - C3 - A2 - C3 - D2 - A2 - F2 - A2 - G2 - D3 - B2 - D3 - C3 - G2 - E2 - G2 -") },
            { wave: "sine", volume: 0.13, decay: 0.5, notes: seq("A4 - - - E4 - - C5 - - A4 - - - F4 - - G4 - - - B4 - - D5 - - C5 - - G4 - - E5 - - -") },
            { wave: "triangle", volume: 0.09, decay: 0.3, notes: seq("- - C4 - - - E4 - - - A3 - - - C4 - - - B3 - - - D4 - - - C4 - - - E4 - - -") },
            { wave: "noise", freq: 6000, volume: 0.04, decay: 0.03, notes: seq("C4 - C4 C4 C4 - C4 C4 C4 - C4 C4 C4 - C4 C4 C4 - C4 C4 C4 - C4 C4 C4 - C4 C4 C4 - C4 C4") },
        ],
    },
    aisle: { bpm: 152, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("C2 C3 C2 C3 G2 G3 G2 G3 A2 A3 A2 A3 F2 F3 F2 G2 C2 C3 C2 C3 G2 G3 G2 G3 F2 F3 F2 F3 G2 G3 B2 D3") },
        { wave: "square", volume: 0.055, decay: 0.16, notes: seq("E5 - G5 - C6 - G5 - D5 - G5 - B5 - G5 - C5 - E5 - A5 - E5 - C5 - F5 - A5 - G5 E5 - G5 - C6 - E6 - D6 - B5 - G5 - B5 - A5 - F5 - C5 - A5 - B5 - G5 - D5 - F5 -")},
        { wave: "noise", freq: 110, to: 50, volume: 0.28, decay: 0.08, notes: seq("C2 - - - C2 - - - C2 - - - C2 - - C2 C2 - - - C2 - - - C2 - - - C2 - C2 C2") },
        { wave: "noise", freq: 7000, volume: 0.05, decay: 0.03, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 C4 - - C4 - - - C4 - - - C4 - - - C4 C4") },
    ] },
    freezer: { bpm: 140, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("A2 A2 E3 A2 A2 E3 A2 E3 F2 F2 C3 F2 F2 C3 F2 C3 C3 C3 G3 C3 C3 G3 C3 G3 G2 G2 D3 G2 G2 D3 E3 G3") },
        { wave: "sine", volume: 0.12, decay: 0.4, notes: seq("E6 - A5 - C6 - E6 - F6 - C6 - A5 - G6 - E6 - C6 - G5 - D6 - B5 - G5 - E6 -")},
        { wave: "noise", freq: 100, to: 50, volume: 0.24, decay: 0.09, notes: seq("C2 - - - - - C2 - C2 - - - - - C2 - C2 - - - - - C2 - C2 - - - C2 - C2 -") },
        { wave: "noise", freq: 8000, volume: 0.05, decay: 0.03, notes: seq("C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4 C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4") },
    ] },
    bakery: { bpm: 164, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("D3 - A2 - D3 - A2 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - D3 - A2 - G2 - A2 -") },
        { wave: "square", volume: 0.05, decay: 0.12, notes: seq("F5 A5 D6 A5 F5 A5 D6 A5 G5 B5 D6 B5 G5 B5 D6 B5 A5 C#6 E6 C#6 A5 C#6 E6 C#6 D6 A5 F5 A5 B5 G5 A5 -") },
        { wave: "noise", freq: 110, to: 50, volume: 0.26, decay: 0.07, notes: seq("C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 C2 C2 - C2 - C2 C2") },
        { wave: "noise", freq: 5000, volume: 0.05, decay: 0.04, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - C4 - C4 C4") },
    ] },
    garden: { bpm: 132, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("G2 - G3 - D3 - G3 - E2 - E3 - B2 - E3 - C3 - C3 - G2 - C3 - D3 - D3 - A2 - F#3 -") },
        { wave: "triangle", volume: 0.12, decay: 0.3, notes: seq("B5 - D6 - G6 - D6 - B5 - E6 - G6 - E6 - C6 - E6 - G6 - E6 - A5 - D6 - F#6 - A6 -") },
        { wave: "noise", freq: 100, to: 50, volume: 0.24, decay: 0.08, notes: seq("C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - C2 -") },
        { wave: "noise", freq: 6000, volume: 0.045, decay: 0.03, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 -") },
    ] },
    dock: { bpm: 148, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.09, decay: 0.14, notes: seq("E2 E2 G2 E2 A2 E2 B2 A2 E2 E2 G2 E2 D3 B2 A2 G2 C2 C2 E2 C2 G2 C2 A2 G2 D2 D2 F#2 D2 A2 D2 B2 A2") },
        { wave: "square", volume: 0.05, decay: 0.2, notes: seq("B4 - - E5 - - G5 - F#5 - - D5 - - B4 - C5 - - E5 - - G5 - A5 - - F#5 - - D5 -") },
        { wave: "noise", freq: 120, to: 50, volume: 0.28, decay: 0.08, notes: seq("C2 - - C2 - - C2 - C2 - - C2 - - C2 - C2 - - C2 - - C2 - C2 - - C2 - - C2 C2") },
        { wave: "noise", freq: 3500, volume: 0.07, decay: 0.06, notes: seq("- - - - C4 - - - - - - - C4 - - - - - - - C4 - - - - - - - C4 - C4 C4") },
    ] },
    rooftop: { bpm: 158, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.09, decay: 0.12, notes: seq("A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 C3 C4 C3 C4 C3 C4 C3 C4 G2 G3 G2 G3 G2 G3 B2 B3") },
        { wave: "square", volume: 0.05, decay: 0.26, notes: seq("E5 - A5 - C6 - B5 - A5 - - - E5 - F5 - G5 - C6 - E6 - D6 - C6 - - - B5 - G5 -") },
        { wave: "noise", freq: 120, to: 50, volume: 0.28, decay: 0.08, notes: seq("C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - C2 C2") },
        { wave: "noise", freq: 8000, volume: 0.05, decay: 0.03, notes: seq("C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4 C4") },
    ] },
    win: { bpm: 126, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("C3 G3 C3 G3 F2 C3 F2 C3 G2 D3 G2 D3 C3 G3 C4 G3") },
        { wave: "square", volume: 0.06, decay: 0.2, notes: seq("E5 G5 C6 G5 F5 A5 C6 A5 D5 G5 B5 G5 E5 G5 C6 -") },
        { wave: "noise", freq: 6000, volume: 0.05, decay: 0.03, notes: seq("C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4") },
    ] },
    lose: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, notes: seq("A2 - E3 - F2 - C3 - D2 - A2 - E2 - B2 -") },
        { wave: "sine", volume: 0.12, decay: 0.5, notes: seq("C5 - - E5 - - A4 - - D5 - - B4 - - -") },
    ] },
};


export class Sound {
    constructor(game) {
        this.game = game; this.nodes = null; this.current = null; this.purrT = 0; this.tick = 0; this.rumbleT = 0;
    }
    get cfg() { return loadSave(this.game).settings; }
    apply() {
        const c = this.cfg;
        this.game.audio.muted = !c.sfx && !c.music ? true : false;
        this.game.haptics.enabled = c.haptics;
    }
    music(name, fast = 1) {
        const key = `${name}:${fast}`;
        this.lastSong = [name, fast];
        if (this.current === key) return;
        this.current = key;
        if (!this.cfg.music) { this.game.stopMusic?.(); return; }
        const s = SONGS[name] ?? SONGS.aisle, len = s.tracks[0].notes.split(" ").length;
        // Tracks loop on their own, so hold every part to the bass line's length.
        const tracks = s.tracks.map((t) => { const n = t.notes.split(" ").slice(0, len); while (n.length < len) n.push("-"); return { ...t, notes: n.join(" ") }; });
        this.game.music({ ...s, tracks, bpm: Math.round(s.bpm * fast) });
    }
    stopMusic() { this.current = null; this.game.stopMusic?.(); }
    resumeMusic() { this.current = null; if (this.lastSong) this.music(...this.lastSong); }
    fx(tone, haptic) { if (this.cfg.sfx) this.game.sfx(tone, haptic !== undefined ? { haptic } : undefined); else if (haptic !== undefined) this.game.haptic(haptic); }

    // --- Continuous engine and tyres -------------------------------------------------------------------------
    engineOn() {
        const a = this.game.audio;
        if (this.nodes || !a?.ctx || !a.master) return;
        try {
            const ctx = a.ctx, out = ctx.createGain(); out.gain.value = 0; out.connect(a.master);
            const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500; lp.connect(out);
            const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain();
            o1.type = "sawtooth"; o2.type = "square"; g2.gain.value = 0.5;
            o1.connect(lp); o2.connect(g2).connect(lp);
            const tyre = ctx.createBufferSource(); tyre.buffer = a.noise; tyre.loop = true;
            const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 1.2;
            const tg = ctx.createGain(); tg.gain.value = 0;
            tyre.connect(bp).connect(tg).connect(a.master);
            o1.start(); o2.start(); tyre.start();
            this.nodes = { out, lp, o1, o2, tyre, bp, tg, ctx };
        } catch { this.nodes = null; }
    }
    engine(speedFrac, boost, drifting, rough) {
        this.engineOn();
        const n = this.nodes;
        if (!n) return;
        const t = n.ctx.currentTime, on = this.cfg.sfx && !this.game.audio.muted;
        const f = 46 + speedFrac * 82 + boost * 16;
        n.o1.frequency.setTargetAtTime(f, t, 0.06); n.o2.frequency.setTargetAtTime(f * 1.5, t, 0.06);
        n.lp.frequency.setTargetAtTime(280 + speedFrac * 900 + boost * 500, t, 0.08);
        n.out.gain.setTargetAtTime(on ? 0.05 + speedFrac * 0.045 : 0, t, 0.05);
        n.bp.frequency.setTargetAtTime(rough ? 500 : 1700, t, 0.05);
        n.tg.gain.setTargetAtTime(on ? (drifting ? 0.07 : rough ? 0.09 : 0) : 0, t, 0.04);
    }
    engineOff() {
        const n = this.nodes; this.nodes = null;
        if (!n) return;
        try { n.out.gain.value = 0; n.tg.gain.value = 0; n.o1.stop(); n.o2.stop(); n.tyre.stop(); n.out.disconnect(); n.tg.disconnect(); } catch { /* already gone */ }
    }

    // --- Haptic textures: each runs once a step while the thing is happening. --------------------------------
    /** Engine purr: a pulse whose rate rises with speed. */
    purr(speedFrac, dt) {
        this.purrT -= dt;
        if (this.purrT > 0) return;
        this.purrT = 0.26 - speedFrac * 0.16;
        this.game.haptic(Math.round(3 + speedFrac * 4));
    }
    /** Gravel: an irregular rattle, far busier than the purr. */
    gravel(dt) {
        this.rumbleT -= dt;
        if (this.rumbleT > 0) return;
        this.rumbleT = 0.05 + this.game.fxRng.range(0, 0.04);
        this.game.haptic([14, 16, 9, 12, 16]);
    }
    /** Drift ticks, faster with each charge level. */
    driftTick(charge, tier, dt) {
        this.tick -= dt;
        if (this.tick > 0) return;
        this.tick = Math.max(0.05, 0.2 - charge * 0.052);
        this.game.haptic(tier >= 2 ? 11 : tier === 1 ? 8 : 5);
        this.fx({ wave: "square", freq: 900 + tier * 320 + charge * 80, decay: 0.02, volume: 0.035 });
    }

    // --- One-shots ---------------------------------------------------------------------------------------------
    count(n) { this.fx({ wave: "square", freq: n === 0 ? 880 : 440, decay: n === 0 ? 0.5 : 0.16, volume: 0.17 }, n === 0 ? "heavy" : "medium"); }
    hop() { this.fx({ wave: "triangle", freq: 240, to: 520, decay: 0.09, volume: 0.13 }, "tick"); }
    tier(t) {
        const f = [0, 620, 830, 1100][t];
        this.fx([{ wave: "square", freq: f, to: f * 1.5, decay: 0.09, volume: 0.13 }, { wave: "square", at: 0.06, freq: f * 1.5, to: f * 2, decay: 0.13, volume: 0.1 }], [12, 30, 22]);
    }
    miniturbo(t) {
        this.fx([{ wave: "noise", freq: 3000, to: 300, decay: 0.45, volume: 0.22 }, { wave: "sawtooth", freq: 110, to: 340 + t * 90, decay: 0.3, volume: 0.16 }, { wave: "sine", freq: 70, to: 40, decay: 0.2, volume: 0.32 }], t >= 2 ? [38, 20, 26] : [30, 16, 16]);
    }
    pad() { this.fx([{ wave: "sawtooth", freq: 220, to: 880, decay: 0.3, volume: 0.15 }, { wave: "noise", freq: 2600, to: 400, decay: 0.3, volume: 0.14 }], [28, 18, 18]); }
    wall(power) { this.fx([{ wave: "noise", freq: 2600, to: 500, decay: 0.12, volume: 0.15 + power * 0.1 }, { wave: "square", freq: 170, to: 80, decay: 0.09, volume: 0.13 }], power > 0.5 ? "medium" : "light"); }
    land(p) { this.fx([{ wave: "sine", freq: 120, to: 44, decay: 0.2, volume: 0.32 }, { wave: "noise", freq: 900, to: 200, decay: 0.12, volume: 0.13 }], p > 0.5 ? "heavy" : "medium"); }
    crate() { this.fx([{ wave: "triangle", freq: 660, decay: 0.08, volume: 0.15 }, { wave: "triangle", at: 0.07, freq: 990, decay: 0.12, volume: 0.15 }], "light"); }
    roll() { this.fx({ wave: "square", freq: 1200, decay: 0.02, volume: 0.04 }, "tick"); }
    got() { this.fx([{ wave: "triangle", freq: 780, decay: 0.08, volume: 0.15 }, { wave: "triangle", at: 0.08, freq: 1170, decay: 0.16, volume: 0.15 }], "medium"); }
    throw() { this.fx({ wave: "noise", freq: 1800, to: 500, decay: 0.14, volume: 0.14 }, "light"); }
    drop() { this.fx({ wave: "triangle", freq: 340, to: 160, decay: 0.12, volume: 0.15 }, "light"); }
    drink() { this.fx([{ wave: "noise", freq: 6000, to: 1800, decay: 0.2, volume: 0.13 }, { wave: "sawtooth", at: 0.05, freq: 180, to: 700, decay: 0.34, volume: 0.15 }], [34, 18, 24]); }
    shield() { this.fx([{ wave: "triangle", freq: 440, to: 880, decay: 0.2, volume: 0.14 }], "medium"); }
    crumble() { this.fx({ wave: "noise", freq: 3200, to: 800, decay: 0.16, volume: 0.17 }, "medium"); }
    splat() { this.fx([{ wave: "noise", freq: 900, to: 150, decay: 0.26, volume: 0.28 }, { wave: "sine", freq: 150, to: 40, decay: 0.22, volume: 0.34 }], [50, 26, 40, 20, 26]); }
    slip() { this.fx([{ wave: "sine", freq: 900, to: 180, decay: 0.3, volume: 0.15 }], [26, 24, 26, 24, 26]); }
    hitOther() { this.fx([{ wave: "noise", freq: 1200, to: 240, decay: 0.16, volume: 0.16 }, { wave: "triangle", freq: 660, at: 0.04, decay: 0.12, volume: 0.1 }], "light"); }
    bump() { this.fx({ wave: "square", freq: 150, to: 70, decay: 0.1, volume: 0.14 }, "light"); }
    smash() { this.fx({ wave: "noise", freq: 1400, to: 300, decay: 0.14, volume: 0.17 }, "light"); }
    fall() { this.fx({ wave: "sine", freq: 780, to: 110, decay: 0.7, volume: 0.17 }, "warn"); }
    lap() { this.fx([{ wave: "square", freq: 660, decay: 0.1, volume: 0.13 }, { wave: "square", at: 0.1, freq: 880, decay: 0.16, volume: 0.13 }], "success"); }
    finalLap() { this.fx([0, 0.1, 0.2].map((at, i) => ({ wave: "square", at, freq: 660 * [1, 1.26, 1.5][i], decay: 0.14, volume: 0.14 })), "success"); }
    pass(up) { if (up) this.fx({ wave: "triangle", freq: 880, to: 1320, decay: 0.09, volume: 0.1 }, "tick"); else this.fx({ wave: "triangle", freq: 520, to: 340, decay: 0.09, volume: 0.09 }, "tick"); }
    finish(rank) { this.fx([0, 0.12, 0.24, 0.36].map((at, i) => ({ wave: "square", at, freq: (rank <= 3 ? [523, 659, 784, 1047] : [440, 415, 392, 330])[i], decay: 0.2, volume: 0.14 })), rank <= 3 ? "success" : "warn"); }
    click() { this.fx({ wave: "triangle", freq: 620, decay: 0.05, volume: 0.1 }); }
}
