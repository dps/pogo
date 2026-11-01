// All the sound and all the feel. Every event names its haptic here so the design is in one place.
import { MAT, ROCK, ROUGH, SAND, SNOW, WOOD, ICE } from "./course.js";

const seq = (s) => s.trim().split(/\s+/).join(" ");
const SONGS = {
    menu: { bpm: 104, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, notes: seq("F2 - - C3 - - F2 - Bb2 - - F3 - - Bb2 - C3 - - G2 - - C3 - F2 - - A2 - C3 - - -") },
        { wave: "triangle", volume: 0.13, decay: 0.25, notes: seq("A4 C5 - F5 - C5 A4 - D5 F5 - Bb5 - F5 D5 - E5 G5 - C6 - G5 E5 - F5 A5 - C6 - A5 F5 -") },
        { wave: "sine", volume: 0.09, decay: 0.35, notes: seq("- - F4 - - F4 - - - - F4 - - F4 - - - - E4 - - E4 - - - - F4 - - F4 - -") },
        { wave: "noise", freq: 5000, volume: 0.025, decay: 0.03, notes: seq("C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 -") },
    ] },
    cove: { bpm: 116, steps: 2, tracks: [
        { wave: "triangle", volume: 0.22, notes: seq("C3 - - G2 - - C3 - F2 - - C3 - - F2 - G2 - - D3 - - G2 - C3 - - G2 - C3 E3 G3 -") },
        { wave: "triangle", volume: 0.14, decay: 0.2, notes: seq("E5 G5 - E5 - C5 D5 E5 F5 A5 - C6 - A5 G5 F5 D5 G5 - B5 - G5 F5 D5 E5 G5 C6 - G5 E5 C5 -") },
        { wave: "sine", volume: 0.08, decay: 0.3, notes: seq("- - G4 - - G4 - - - - A4 - - A4 - - - - G4 - - G4 - - - - G4 - - E4 - -") },
        { wave: "noise", freq: 6000, volume: 0.03, decay: 0.03, notes: seq("C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 - C4 - C4 C4 - C4 C4 -") },
        { wave: "noise", freq: 200, to: 60, volume: 0.14, decay: 0.07, notes: seq("C2 - - C2 - - - - C2 - - C2 - - - - C2 - - C2 - - - - C2 - - C2 - - C2 -") },
    ] },
    frost: { bpm: 88, steps: 2, tracks: [
        { wave: "sine", volume: 0.24, decay: 0.8, notes: seq("D3 - - - - - A2 - Bb2 - - - - - F2 - F3 - - - - - C3 - C3 - - - A2 - - -") },
        { wave: "sine", volume: 0.13, decay: 0.9, notes: seq("A5 - F5 - D5 - A5 - D6 - Bb5 - F5 - D5 - C6 - A5 - F5 - C6 - G5 - E5 - C5 - E5 -") },
        { wave: "triangle", volume: 0.07, decay: 0.5, notes: seq("- - D5 - - - - - - - D5 - - - - - - - C5 - - - - - - - C5 - - - - -") },
        { wave: "noise", freq: 8000, volume: 0.02, decay: 0.05, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 - - - C4 -") },
    ] },
    crown: { bpm: 126, steps: 2, tracks: [
        { wave: "triangle", volume: 0.25, notes: seq("A2 A2 - A2 E3 - A2 - F2 F2 - F2 C3 - F2 - G2 G2 - G2 D3 - G2 - E2 E2 - E2 B2 - G#2 -") },
        { wave: "square", volume: 0.04, decay: 0.16, notes: seq("A4 - C5 E5 - C5 A4 - F4 - A4 C5 - A4 F4 - G4 - B4 D5 - B4 G4 - E4 - G#4 B4 - E5 D5 -") },
        { wave: "noise", freq: 140, to: 50, volume: 0.26, decay: 0.09, notes: seq("C2 - - - C2 - - - C2 - - - C2 - C2 - C2 - - - C2 - - - C2 - - - C2 - C2 C2") },
        { wave: "noise", freq: 5500, volume: 0.04, decay: 0.03, notes: seq("- - C4 - - - C4 - - - C4 - - - C4 C4 - - C4 - - - C4 - - - C4 - - - C4 C4") },
    ] },
    win: { bpm: 132, steps: 2, tracks: [
        { wave: "triangle", volume: 0.24, notes: seq("C3 - G3 - F3 - G3 - A3 - E3 - F3 - G3 -") },
        { wave: "triangle", volume: 0.16, decay: 0.3, notes: seq("C5 E5 G5 C6 A5 F5 C5 F5 A5 E5 C5 E5 F5 A5 B5 D6") },
        { wave: "noise", freq: 150, to: 50, volume: 0.2, decay: 0.08, notes: seq("C2 - C2 - C2 - C2 - C2 - C2 - C2 - C2 C2") },
    ] },
};
const T = (wave, freq, to, decay, volume, at = 0) => ({ wave, freq, to, decay, volume, at });

export class Sound {
    constructor(game) { this.game = game; this.song = null; this.roll = null; this.tension = null; this.lastTick = -1; this.rumbleT = 0; this.woodT = 0; }
    get set() { return this.game.data.save.settings; }
    apply() {
        const g = this.game, st = this.set;
        g.audio.muted = !st.sound; g.haptics.enabled = st.haptics;
        if (!st.music || !st.sound) { g.stopMusic?.(); this.song = null; } else if (this.want) this.play(this.want);
    }
    play(name) { this.want = name; if (!this.set.music || !this.set.sound) return; if (this.song === name) return; this.song = name; this.game.music(SONGS[name]); }
    silence() { this.want = null; this.song = null; this.game.stopMusic?.(); }
    sfx(tone, haptic) { this.game.sfx(tone, haptic === undefined ? undefined : { haptic }); }

    click() { this.sfx([T("triangle", 520, 680, 0.05, 0.16)], "tick"); }
    /** One notch of tension. Pitch and feel climb with the pull. */
    notch(n, max) {
        const k = n / max, g = this.game;
        this.sfx(T("square", 300 + 620 * k, undefined, 0.022, 0.05 + 0.05 * k));
        g.haptic(k > 0.85 ? "light" : "tick");
    }
    release() { this.sfx(T("triangle", 240, 90, 0.05, 0.08)); }
    /** The hit: one crisp tap, felt and heard, and nothing after it. */
    hit(power, chip) {
        const k = 0.45 + power * 0.55;
        this.sfx([T("square", chip ? 1500 : 1900, 500, 0.022, 0.2 * k), T("sine", 300, 140, 0.08, 0.3 * k), T("noise", 2400, undefined, 0.02, 0.1 * k)]);
        this.game.haptic(power > 0.6 ? "medium" : "light");
    }
    wall(speed, kind) {
        const k = Math.min(1, speed / 12);
        const base = kind === 1 ? 180 : kind === 2 ? 130 : 330;
        this.sfx([T("triangle", base + 200 * k, base * 0.7, 0.08, 0.14 + 0.2 * k), T("noise", 1500, undefined, 0.02, 0.05 + 0.08 * k)], k > 0.45 ? "medium" : "light");
    }
    bumper() { this.sfx([T("square", 660, 1320, 0.09, 0.14), T("sine", 880, 1760, 0.14, 0.14, 0.03)], "medium"); }
    land(speed, mat) {
        const k = Math.min(1, speed / 9);
        if (mat === SAND || mat === SNOW) this.sfx(T("noise", 900, 300, 0.11, 0.1 + k * 0.1), "light");
        else if (mat === ICE) this.sfx(T("triangle", 1500, 900, 0.07, 0.1 + k * 0.1), "light");
        else this.sfx(T("sine", 210, 90, 0.09, 0.2 + k * 0.2), k > 0.5 ? "medium" : "light");
    }
    sweep() { this.sfx([T("sawtooth", 180, 70, 0.1, 0.18), T("noise", 900, undefined, 0.05, 0.1)], "medium"); }
    chomp() { this.sfx([T("square", 200, 70, 0.08, 0.2), T("noise", 700, 200, 0.1, 0.16), T("sine", 150, 80, 0.14, 0.2, 0.08)], "heavy"); }
    gulp() { this.sfx([T("sine", 300, 120, 0.16, 0.2), T("sine", 240, 90, 0.16, 0.2, 0.2), T("sine", 180, 70, 0.2, 0.2, 0.42)]); this.game.haptic([12, 110, 12, 110, 18]); }
    spit() { this.sfx([T("sawtooth", 140, 800, 0.16, 0.14), T("noise", 2400, 800, 0.15, 0.12)], "medium"); }
    geyser() { this.sfx([T("noise", 1000, 5000, 0.5, 0.2), T("sine", 90, 200, 0.4, 0.2)], "heavy"); }
    hiss() { this.sfx(T("noise", 3800, 2000, 0.8, 0.05)); }
    snap() { this.sfx([T("square", 240, 110, 0.05, 0.05), T("noise", 900, 300, 0.05, 0.05)]); }
    tube() { this.sfx([T("sine", 500, 90, 0.4, 0.2), T("noise", 600, 200, 0.3, 0.06)], "light"); }
    tubeOut() { this.sfx([T("sine", 120, 600, 0.22, 0.2), T("noise", 1200, 2400, 0.1, 0.06)], "medium"); }
    boost() { this.sfx([T("sawtooth", 200, 1200, 0.2, 0.1), T("square", 400, 1600, 0.2, 0.05)], "medium"); }
    secret() { for (const [i, n] of [988, 1319, 1568, 2093].entries()) this.sfx(T("sine", n, undefined, 0.3, 0.14, i * 0.075)); this.game.haptic("success"); }
    lip() { this.sfx([T("triangle", 900, 500, 0.06, 0.18), T("noise", 2000, undefined, 0.02, 0.08)], "medium"); }
    /** Into the cup: a rattle, then the thud you feel in your hand. */
    cup() {
        this.sfx([T("triangle", 700, 380, 0.04, 0.2), T("triangle", 620, 340, 0.04, 0.16, 0.06), T("sine", 150, 48, 0.3, 0.5, 0.1), T("noise", 300, 90, 0.14, 0.18, 0.1)]);
        this.game.haptic([18, 50, 70]);
    }
    birdie() { for (const [i, n] of [659, 784, 988, 1319].entries()) this.sfx(T("triangle", n, undefined, 0.2, 0.16, i * 0.07)); this.game.haptic("success"); }
    par() { for (const [i, n] of [523, 659, 784].entries()) this.sfx(T("triangle", n, undefined, 0.2, 0.13, i * 0.08)); this.game.haptic("light"); }
    bogey() { for (const [i, n] of [392, 349, 294].entries()) this.sfx(T("triangle", n, undefined, 0.22, 0.12, i * 0.1)); this.game.haptic("tick"); }
    ace() {
        const F = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [784, 988, 1175], [1047, 1319, 1568]];
        F.forEach((c, i) => c.forEach((n) => { this.sfx(T("square", n, undefined, 0.2, 0.05, i * 0.13)); this.sfx(T("triangle", n / 2, undefined, 0.26, 0.1, i * 0.13)); }));
        this.sfx([T("noise", 400, 80, 1, 0.3, 0.6), T("sine", 70, 30, 1.3, 0.5, 0.62)]);
        this.game.haptic([40, 40, 40, 40, 40, 40, 90, 60, 160]);
    }
    boom(k = 1) { this.sfx([T("sine", 80 + 60 * k, 30, 0.5, 0.3), T("noise", 900, 120, 0.3, 0.14)]); }
    pop() { this.sfx(T("noise", 2600 + this.game.fxRng.range(0, 1800), 1200, 0.1, 0.05)); }
    sizzle() { this.sfx([T("noise", 5000, 1200, 0.5, 0.2), T("sawtooth", 300, 60, 0.25, 0.12)], "error"); }
    splash() { this.sfx([T("noise", 1400, 300, 0.32, 0.22), T("sine", 300, 90, 0.2, 0.2)], "warn"); }
    drop() { this.sfx([T("sine", 330, 660, 0.1, 0.15)]); this.game.haptic("tick"); }
    fanfare() { this.play("win"); }
    unlock() { for (const [i, n] of [784, 988, 1175, 1568].entries()) this.sfx(T("triangle", n, undefined, 0.3, 0.16, i * 0.09)); this.game.haptic("success"); }
    pass() { this.sfx([T("triangle", 440, 880, 0.14, 0.18)], "success"); }

    /** Rolling: a held voice whose pitch and level follow the ball, and rumble pulses on rough ground. */
    rolling(sim, dt) {
        const g = this.game, sp = sim.speed, onG = sim.ground > 0 && sim.mode === "roll", m = sim.mat;
        if (!this.roll) this.roll = g.audio.voice({ wave: "noise", freq: 400, volume: 0 });
        const rough = onG ? (m === ROCK ? 1 : m === ROUGH ? 0.7 : m === SAND || m === SNOW ? 0.55 : m === WOOD ? 0.3 : m === ICE ? 0 : 0.08) : 0;
        const vol = onG ? Math.min(0.12, sp * 0.012) * (m === ICE ? 0.35 : 1) * (0.6 + rough) : 0;
        this.roll.set({ freq: m === ICE ? 2600 : 240 + sp * 70 + rough * 300, volume: vol });
        if (!onG || sp < 0.8) { this.rumbleT = 0; return; }
        // The rumble: rate follows speed, grain follows the ground. Glass-smooth grass stays silent in the hand.
        if (m === WOOD) { this.woodT += sp * dt; if (this.woodT > 0.46) { this.woodT = 0; g.haptic(5); } return; }
        if (rough < 0.3) return;
        this.rumbleT -= dt;
        if (this.rumbleT <= 0) {
            this.rumbleT = Math.max(0.05, 0.17 - sp * 0.012);
            g.haptic(Math.round(4 + rough * 7));
        }
    }
    stopRoll() { this.roll?.set({ volume: 0 }); }
}
