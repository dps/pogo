// Sound and haptics. Songs are folk-band loops in plain major keys, a crowd made of two filtered noise
// voices, and a small library of synthesised thumps and bleats.
import { loadSave } from "./data.js";

const seq = (s) => s.trim().split(/\s+/).join(" ");

const SONGS = {
    // Village fete fiddle. G D Em C.
    menu: { bpm: 132, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: seq("G2 - D3 - G2 - D3 - D2 - A2 - D2 - A2 - E2 - B2 - E2 - B2 - C3 - G2 - C3 - D3 -") },
        { wave: "square", volume: 0.045, decay: 0.14, notes: seq("B4 D5 G5 D5 B4 D5 G5 A5 A4 D5 F#5 D5 A4 D5 F#5 A5 G4 B4 E5 B4 G4 B4 E5 G5 G4 C5 E5 G5 F#5 E5 D5 C5") },
        { wave: "triangle", volume: 0.09, decay: 0.09, notes: seq("- G4 - B4 - G4 - B4 - F#4 - A4 - F#4 - A4 - G4 - B4 - G4 - B4 - G4 - C5 - G4 - A4") },
        { wave: "noise", freq: 6000, volume: 0.035, decay: 0.03, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 C4") },
    ] },
    // Brass band oom-pah, kept low so the crowd stays on top. C Am F G.
    match: { bpm: 118, steps: 2, tracks: [
        { wave: "triangle", volume: 0.16, decay: 0.18, notes: seq("C3 - G2 - C3 - G2 - A2 - E2 - A2 - E2 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - B2 -") },
        { wave: "sine", volume: 0.07, decay: 0.12, notes: seq("- E4 - E4 - G4 - E4 - C4 - E4 - C4 - A3 - C4 - A3 - F4 - C4 - D4 - G4 - D4 - F4") },
        { wave: "noise", freq: 200, to: 70, volume: 0.1, decay: 0.07, notes: seq("C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - - - C2 - C2 -") },
    ] },
    // The cup: a proud march. D G A D.
    cup: { bpm: 124, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: seq("D3 - A2 - D3 - A2 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - D3 - A2 - D3 - - ") },
        { wave: "square", volume: 0.05, decay: 0.2, notes: seq("F#5 - A5 - D6 - A5 - G5 - B5 - D6 - B5 - A5 - C#6 - E6 - C#6 - D6 - A5 - F#5 - -") },
        { wave: "noise", freq: 220, to: 70, volume: 0.15, decay: 0.08, notes: seq("C2 - C2 C2 C2 - C2 C2 C2 - C2 C2 C2 - C2 C2 C2 - C2 C2 C2 - C2 C2 C2 - C2 C2 C2 - - -") },
    ] },
    win: { bpm: 140, steps: 2, tracks: [
        { wave: "triangle", volume: 0.22, decay: 0.2, notes: seq("C3 G3 C3 G3 F2 C3 F2 C3 G2 D3 G2 D3 C3 G3 C4 -") },
        { wave: "square", volume: 0.06, decay: 0.2, notes: seq("E5 G5 C6 G5 F5 A5 C6 A5 D5 G5 B5 G5 E5 G5 C6 -") },
        { wave: "noise", freq: 6000, volume: 0.04, decay: 0.03, notes: seq("C4 - C4 - C4 - C4 - C4 - C4 - C4 - C4 C4") },
    ] },
    lose: { bpm: 84, steps: 2, tracks: [
        { wave: "triangle", volume: 0.18, decay: 0.5, notes: seq("A2 - E3 - F2 - C3 - D2 - A2 - E2 - B2 -") },
        { wave: "sine", volume: 0.1, decay: 0.6, notes: seq("C5 - - E5 - - A4 - - D5 - - B4 - - -") },
    ] },
};

export const HAPTIC = { kick: "tick", pass: "tick", power: "medium", trap: "tick", thud: [18, 24, 34], bowled: [30, 30, 14], post: "medium", save: "light", roar: [50, 30, 70, 30, 100, 40, 140, 50, 200], whistle: "tick", win: "success", lose: "warn" };

export class Sound {
    constructor(game) { this.game = game; this.current = null; this.crowd = null; this.roar = null; this.charge = null; this.heat = 0; this.gate = {}; }
    get cfg() { return loadSave(this.game).settings; }
    apply() {
        const c = this.cfg;
        this.game.audio.muted = !c.sfx && !c.music;
        this.game.haptics.enabled = c.haptics;
        if (!c.music) { this.game.stopMusic(); this.current = null; }
        else if (this.want) this.music(this.want);
    }
    music(name) {
        this.want = name;
        if (this.current === name) return;
        if (!this.cfg.music) return;
        this.current = name;
        this.game.music(SONGS[name]);
    }
    stopMusic() { this.want = null; this.current = null; this.game.stopMusic(); }

    /** Throttled one-shot. Haptics only when this was the player's own doing. */
    fx(tone, o = {}) {
        if (!this.cfg.sfx) { if (o.haptic) this.game.haptic(o.haptic); return; }
        this.game.sfx(tone, o.haptic ? { haptic: o.haptic } : undefined);
    }
    limited(key, gap) {
        const now = this.game.stepCount ?? 0;
        if ((this.gate[key] ?? -999) + gap > now) return false;
        this.gate[key] = now; return true;
    }

    kick(speed, power, mine) {
        const v = Math.min(1, speed / 36), tone = [
            { wave: "sine", freq: 170 + v * 60, to: 55, decay: 0.09 + v * 0.05, volume: 0.28 + v * 0.14 },
            { wave: "noise", freq: 1800, to: 500, decay: 0.03, volume: 0.1 + v * 0.1 },
        ];
        if (power) tone.push({ wave: "sawtooth", freq: 120, to: 34, decay: 0.34, volume: 0.2 }, { wave: "noise", freq: 3500, to: 300, decay: 0.3, volume: 0.17, at: 0.02 });
        this.fx(tone, { haptic: mine ? (power ? HAPTIC.power : HAPTIC.kick) : undefined });
    }
    trap(mine) { this.fx({ wave: "sine", freq: 150, to: 90, decay: 0.05, volume: 0.13 }, { haptic: mine ? HAPTIC.trap : undefined }); }
    dribble() { if (this.limited("drib", 8)) this.fx({ wave: "sine", freq: 130, to: 80, decay: 0.03, volume: 0.05 }); }
    bounce(v) { if (this.limited("bnc", 6)) this.fx({ wave: "sine", freq: 110 + v * 6, to: 60, decay: 0.06, volume: Math.min(0.18, v * 0.018) }); }
    wall(v) { if (this.limited("wall", 6)) this.fx([{ wave: "noise", freq: 900, to: 300, decay: 0.05, volume: Math.min(0.22, v * 0.02) }, { wave: "square", freq: 95, to: 60, decay: 0.05, volume: Math.min(0.08, v * 0.008) }]); }
    post(mine) {
        this.fx([{ wave: "triangle", freq: 880, to: 840, decay: 0.5, volume: 0.22 }, { wave: "triangle", freq: 1320, to: 1250, decay: 0.34, volume: 0.13 }, { wave: "square", freq: 2200, to: 1800, decay: 0.08, volume: 0.05 }, { wave: "noise", freq: 3000, decay: 0.03, volume: 0.15 }], { haptic: mine ? HAPTIC.post : undefined });
    }
    headbutt(mine) {
        this.fx([{ wave: "sine", freq: 130, to: 36, decay: 0.2, volume: 0.45 }, { wave: "square", freq: 210, to: 70, decay: 0.07, volume: 0.14 }, { wave: "noise", freq: 1300, to: 200, decay: 0.09, volume: 0.22 }], { haptic: mine ? HAPTIC.thud : undefined });
    }
    whoosh() { this.fx({ wave: "noise", freq: 900, to: 2600, decay: 0.16, volume: 0.09 }); }
    slide() { this.fx({ wave: "noise", freq: 2600, to: 500, decay: 0.36, volume: 0.13 }); }
    tackle(mine) { this.fx([{ wave: "sine", freq: 180, to: 80, decay: 0.08, volume: 0.28 }, { wave: "noise", freq: 2000, to: 400, decay: 0.06, volume: 0.14 }], { haptic: mine ? HAPTIC.pass : undefined }); }
    thud(v) { if (this.limited("thud", 7)) this.fx({ wave: "sine", freq: 100, to: 42, decay: 0.12, volume: Math.min(0.26, 0.08 + v * 0.03) }); }
    bleat(pitch = 1, big = false) {
        if (!this.limited("bleat", big ? 2 : 14)) return;
        // A goat is a sawtooth with a nervous breakdown: fast wobble in stacked short notes.
        const f = (big ? 560 : 640) * pitch, n = big ? 7 : 5, tones = [];
        for (let i = 0; i < n; i++) tones.push({ wave: "sawtooth", freq: f * (1 + (i % 2 ? 0.1 : -0.06)), to: f * (i % 2 ? 0.96 : 1.08), decay: 0.06, volume: 0.09 - i * 0.006, at: i * 0.05 });
        tones.push({ wave: "square", freq: f / 2, to: f / 2.4, decay: 0.05 * n, volume: 0.03 });
        this.fx(tones);
    }
    baa() { if (this.limited("baa", 30)) { const tones = []; for (let i = 0; i < 5; i++) tones.push({ wave: "sawtooth", freq: 300 + (i % 2) * 28, to: 280, decay: 0.08, volume: 0.075, at: i * 0.07 }); this.fx(tones); } }
    oi() { if (this.limited("oi", 40)) this.fx([{ wave: "sawtooth", freq: 240, to: 340, decay: 0.12, volume: 0.13 }, { wave: "sawtooth", freq: 340, to: 200, decay: 0.2, volume: 0.13, at: 0.12 }]); }
    whistle(kind) {
        const n = kind === "end" ? 3 : kind === "goal" ? 2 : 1, tones = [];
        for (let k = 0; k < n; k++) {
            const at0 = k * 0.42, len = k === n - 1 ? 0.5 : 0.28;
            for (let i = 0; i < 8; i++) tones.push({ wave: "sine", freq: 2750 + (i % 2) * 180, decay: len / 8 + 0.03, volume: 0.09, at: at0 + i * len / 8 });
        }
        this.fx(tones, { haptic: HAPTIC.whistle });
    }
    goalHorn() { this.fx([{ wave: "sawtooth", freq: 196, decay: 0.8, volume: 0.1 }, { wave: "sawtooth", freq: 247, decay: 0.8, volume: 0.08 }, { wave: "sawtooth", freq: 294, decay: 0.8, volume: 0.08 }, { wave: "triangle", freq: 392, decay: 1.1, volume: 0.1, at: 0.1 }]); }
    netRip() { this.fx({ wave: "noise", freq: 4500, to: 900, decay: 0.26, volume: 0.17 }); }
    ping() { this.fx([{ wave: "triangle", freq: 1046, decay: 0.2, volume: 0.13 }, { wave: "triangle", freq: 1568, decay: 0.3, volume: 0.1, at: 0.05 }], { haptic: "light" }); }
    ui() { this.game.sfx("click"); }
    fanfare() { this.fx([0, 0.12, 0.24, 0.36].map((at, i) => ({ wave: "square", freq: [523, 659, 784, 1046][i], decay: 0.26, volume: 0.09, at })), { haptic: "success" }); }
    sting(sad) { if (sad) this.fx([{ wave: "triangle", freq: 330, to: 220, decay: 0.4, volume: 0.12 }, { wave: "triangle", freq: 262, to: 174, decay: 0.5, volume: 0.1, at: 0.16 }]); }

    // ---- The crowd ---------------------------------------------------------------------------
    crowdOn() {
        if (this.crowd || !this.cfg.sfx) return;
        this.crowd = this.game.audio.voice({ wave: "noise", freq: 620, volume: 0.03 });
        this.roar = this.game.audio.voice({ wave: "noise", freq: 1300, volume: 0.0 });
        this.heat = 0; this.lift = 0;
    }
    crowdOff() { this.crowd?.stop(); this.roar?.stop(); this.crowd = this.roar = null; this.chargeOff(); }
    /** heat 0..1 follows danger; lift is a short surge such as a shot or goal. */
    crowdTick(dt, danger) {
        if (!this.crowd) return;
        this.heat += (danger - this.heat) * Math.min(1, dt * 1.6);
        this.lift = Math.max(0, this.lift - dt * 0.34);
        const swell = 0.5 + 0.5 * Math.sin(this.game.stepCount * 0.012);
        this.crowd.set({ volume: 0.024 + this.heat * 0.032 + swell * 0.006, freq: 520 + this.heat * 520 });
        this.roar.set({ volume: Math.min(0.2, this.lift * 0.23), freq: 900 + this.lift * 1500 });
    }
    surge(v) { this.lift = Math.max(this.lift ?? 0, v); }
    goalRoar() { this.surge(1.25); this.fx({ wave: "noise", freq: 1800, to: 2800, attack: 0.1, decay: 1.5, volume: 0.22 }, { haptic: HAPTIC.roar }); }
    oooh() { if (this.limited("ooh", 40)) { this.surge(0.5); this.fx({ wave: "sawtooth", freq: 220, to: 170, attack: 0.08, decay: 0.5, volume: 0.03 }); } }

    chargeTick(c) {
        if (!this.cfg.sfx) return;
        if (c > 0) {
            if (!this.charge) this.charge = this.game.audio.voice({ wave: "triangle", freq: 220, volume: 0.05 });
            this.charge.set({ freq: 200 + Math.min(1, c) * 520 + (c >= 1 ? Math.sin(this.game.stepCount * 0.9) * 30 : 0), volume: 0.05 + Math.min(1, c) * 0.05 });
        } else this.chargeOff();
    }
    chargeOff() { this.charge?.stop(); this.charge = null; }
}
