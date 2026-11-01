// Every sound in Stack Attack and a song for each stretch of the long night. Soft, round and sleepy: plucked basses,
// sine bells, the odd brushed snare. Haptics are authored here too, right next to the sound they belong with.
const rep = (s, n) => Array(n).fill(s).join(" ");
const brush = (n, v = 0.02) => ({ wave: "noise", volume: v, decay: 0.04, notes: rep("- C6 - C6", n) });
const kick = (n, v = 0.16) => ({ wave: "sine", volume: v, decay: 0.12, slide: 0.5, notes: rep("C3 - - - C3 - - -", n) });

export const SONGS = {
    // Lullaby in G: I IV ii V. On the title and the ladder.
    lullaby: { bpm: 84, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.5, notes: "G2 - D3 - C3 - G3 - A2 - E3 - D3 - F#3 -" },
        { wave: "sine", volume: 0.09, decay: 0.7, notes: "B5 D6 G6 D6 C6 E6 G6 E6 A5 C6 E6 C6 A5 D6 F#6 D6" },
    ] },
    // Rungs 1 and 2: a cheeky walk in F, I vi ii V.
    dusk: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: "F2 - C3 - F2 - A2 - D2 - A2 - D3 - A2 - G2 - D3 - G2 - Bb2 - C3 - G2 - C3 - E3 -" },
        { wave: "sine", volume: 0.09, decay: 0.3, notes: "A5 - C6 - F5 - A5 - F5 - A5 - D5 - F5 - Bb5 - G5 - Bb5 D6 - C6 - G5 - E5 G5 C6 -" },
        kick(4), brush(8),
    ] },
    // Rungs 3 and 4: barn dance in D, I V vi IV, swung by the bass.
    barn: { bpm: 126, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.16, notes: "D3 - A2 - D3 - A2 - A2 - E3 - A2 - C#3 - B2 - F#3 - B2 - F#2 - G2 - D3 - G2 - A2 -" },
        { wave: "square", volume: 0.028, decay: 0.15, notes: "F#5 A5 D6 A5 F#5 - A5 - E5 A5 C#6 A5 E5 - A5 - F#5 B5 D6 B5 F#5 - B5 - G5 B5 D6 B5 A5 - C#6 -" },
        kick(4), brush(8),
    ] },
    // Rungs 5 and 6: minor prowl, A minor i VI III VII.
    midnight: { bpm: 132, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.045, decay: 0.12, notes: "A2 A2 A3 A2 A2 A3 A2 G2 F2 F2 F3 F2 F2 F3 F2 E2 C3 C3 C4 C3 C3 C4 C3 B2 G2 G2 G3 G2 G2 G3 B2 G#2" },
        { wave: "sine", volume: 0.1, decay: 0.2, notes: "E5 - A5 - C6 - A5 - F5 - A5 - C6 - F5 - G5 - C6 - E6 - C6 - D6 - B5 - G5 - G#5 -" },
        kick(4, 0.18), brush(8, 0.024),
    ] },
    // The owl: slow bells and hard thinking, D minor.
    owl: { bpm: 104, steps: 3, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.3, notes: "D2 - A2 D3 - A2 Bb1 - F2 Bb2 - F2 G2 - D3 G3 - D3 A2 - E3 A3 - C#3" },
        { wave: "sine", volume: 0.1, decay: 0.5, notes: "F5 - A5 D6 - A5 D5 - F5 Bb5 - F5 D5 - G5 Bb5 - G5 E5 - A5 C#6 - E6" },
    ] },
    // The rooster: bright and fast, C major IV V iii vi.
    dawn: { bpm: 146, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.045, decay: 0.1, notes: "F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 G2 G3 G2 G3 E2 E3 E2 E3 E2 E3 E2 E3 A2 A3 A2 A3 A2 A3 G2 G3" },
        { wave: "square", volume: 0.03, decay: 0.14, notes: "A5 C6 F6 C6 A5 C6 F6 A6 B5 D6 G6 D6 B5 D6 G6 B6 G5 B5 E6 B5 G5 B5 E6 G6 A5 C6 E6 C6 A5 C6 D6 E6" },
        kick(4, 0.18), brush(8, 0.026),
    ] },
    // Solo modes. Marathon: steady in E flat, I iii IV V.
    marathon: { bpm: 118, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.22, notes: "Eb3 - Bb2 - Eb3 - Bb2 - G2 - D3 - G2 - D3 - Ab2 - Eb3 - Ab2 - Eb3 - Bb2 - F3 - Bb2 - D3 -" },
        { wave: "sine", volume: 0.09, decay: 0.3, notes: "G5 - Bb5 - Eb6 - Bb5 - Bb5 - D6 - G6 - D6 - C6 - Eb6 - Ab6 - Eb6 - D6 - F6 - Bb6 - F6 -" },
        kick(4), brush(8),
    ] },
    // Sprint: a dash in E minor, i VI VII i.
    sprint: { bpm: 152, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.04, decay: 0.09, notes: "E2 E3 E2 E3 E2 E3 E2 E3 C2 C3 C2 C3 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 D2 D3 E2 E3 E2 E3 B2 B2 D3 D3" },
        { wave: "square", volume: 0.026, decay: 0.12, notes: "G5 B5 E6 B5 G5 B5 E6 B5 E5 G5 C6 G5 E5 G5 C6 G5 F#5 A5 D6 A5 F#5 A5 D6 A5 G5 B5 E6 B5 D6 B5 G5 B5" },
        kick(4, 0.18), brush(8, 0.026),
    ] },
    // Results: a warm cadence in C if you won, a falling A minor if you didn't.
    win: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.6, notes: "C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 -" },
        { wave: "sine", volume: 0.11, decay: 0.8, notes: "E5 G5 C6 E6 C6 A5 E5 A5 F5 A5 C6 F6 D6 B5 G5 B5" },
    ] },
    lose: { bpm: 72, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.7, notes: "A2 - E3 - F2 - C3 - D2 - A2 - E2 - B2 -" },
        { wave: "sine", volume: 0.08, decay: 0.9, notes: "C5 - E5 - A4 - C5 - F4 - A4 - G#4 - B4 -" },
    ] },
};

/** Four rising rungs: each line in a clear rings higher. */
const PENTA = [262, 330, 392, 523, 659, 784, 1047, 1319];
const MOAN = [150, 210, 190, 240, 130, 330, 105];

export class Sound {
    constructor(game) { this.g = game; this.bank = new Map(); this.step = 0; }
    tick() { this.step++; }
    ok(k, gap) { const t = this.bank.get(k) ?? -999; if (this.step - t < gap) return false; this.bank.set(k, this.step); return true; }
    tone(t, h) { this.g.sfx(t, h !== undefined ? { haptic: h } : undefined); }

    ui() { this.tone({ wave: "triangle", freq: 660, to: 880, decay: 0.05, volume: 0.1 }, "tick"); }
    /** A tick per cell. Several in one step arrive as one short pattern, so no cell goes unfelt. */
    move(n) {
        this.tone({ wave: "triangle", freq: 520 + n * 30, decay: 0.03, volume: 0.075 });
        if (n > 1) { const p = []; for (let i = 0; i < n; i++) p.push(6, 22); p.pop(); this.g.haptic(p); }
        else this.g.haptic("tick");
    }
    soft() { if (this.ok("soft", 3)) this.tone({ wave: "sine", freq: 300, decay: 0.02, volume: 0.05 }, "tick"); }
    softQuiet() { if (this.ok("soft", 4)) this.tone({ wave: "sine", freq: 300, decay: 0.02, volume: 0.035 }); }
    turn(kick) {
        this.tone([{ wave: "sine", freq: kick ? 480 : 420, to: kick ? 900 : 700, decay: 0.07, volume: 0.13 }], "tick");
    }
    stuck() { this.tone({ wave: "triangle", freq: 170, to: 120, decay: 0.07, volume: 0.13 }, "tick"); }
    hold() { this.tone([{ wave: "sine", freq: 620, to: 340, decay: 0.09, volume: 0.13 }, { wave: "sine", at: 0.06, freq: 340, to: 620, decay: 0.09, volume: 0.1 }], "light"); }
    /** The thud of something heavy and cross landing, then its complaint. */
    thud(p, dist, hard) {
        const weight = Math.min(1, dist / 14);
        this.tone([
            { wave: "sine", freq: 150 + weight * 40, to: 44, decay: 0.12 + weight * 0.1, volume: 0.28 + weight * 0.14 },
            { wave: "noise", freq: 400, decay: 0.05, volume: 0.05 + weight * 0.07 },
        ], hard ? (dist >= 8 ? "heavy" : "medium") : "medium");
        const m = MOAN[p];
        this.tone([{ wave: "triangle", at: 0.05, freq: m * 1.5, to: m, decay: 0.16, volume: 0.1 }, { wave: "sine", at: 0.08, freq: m * 2, to: m * 1.2, decay: 0.12, volume: 0.05 }]);
    }
    /** Clears. Pitch climbs with lines and combo, and the rumble grows with both. */
    clear(n, combo, wedge) {
        const base = Math.min(4, combo), tones = [];
        for (let i = 0; i < n + 1; i++) tones.push({ wave: "triangle", at: i * 0.05, freq: PENTA[Math.min(7, i + base)], decay: 0.2, volume: 0.17 });
        tones.push({ wave: "noise", freq: 900, decay: 0.12 + n * 0.05, volume: 0.05 + n * 0.02 });
        tones.push({ wave: "sine", freq: 110, to: 40, decay: 0.2 + n * 0.08, volume: 0.2 + n * 0.04 });
        if (wedge) tones.push({ wave: "square", at: 0.02, freq: 880, to: 1320, decay: 0.12, volume: 0.05 });
        this.tone(tones);
        this.g.haptic(rumble(n, combo));
    }
    stampede() {
        this.tone([
            { wave: "sawtooth", freq: 90, to: 220, decay: 0.4, volume: 0.14 },
            { wave: "square", at: 0.1, freq: 523, decay: 0.1, volume: 0.05 }, { wave: "square", at: 0.2, freq: 659, decay: 0.1, volume: 0.05 },
            { wave: "square", at: 0.3, freq: 784, decay: 0.1, volume: 0.05 }, { wave: "square", at: 0.4, freq: 1047, decay: 0.3, volume: 0.06 },
        ]);
    }
    launch(n) { this.tone({ wave: "sine", freq: 300, to: 900 + n * 60, decay: 0.2, volume: 0.13 }); }
    hit() { this.tone([{ wave: "sine", freq: 180, to: 60, decay: 0.16, volume: 0.22 }, { wave: "noise", freq: 500, decay: 0.05, volume: 0.05 }]); }
    incoming(n) { this.tone([{ wave: "square", freq: 330, decay: 0.07, volume: 0.05 }, { wave: "square", at: 0.09, freq: 300, decay: 0.07, volume: 0.05 }], n >= 4 ? "warn" : "light"); }
    cancel() { this.tone([{ wave: "triangle", freq: 700, to: 1100, decay: 0.1, volume: 0.12 }, { wave: "sine", at: 0.04, freq: 1400, decay: 0.08, volume: 0.06 }], "light"); }
    sheep(n) { this.tone([{ wave: "sine", freq: 95, to: 40, decay: 0.25, volume: 0.32 }, { wave: "noise", freq: 300, decay: 0.08, volume: 0.07 }, { wave: "triangle", at: 0.08, freq: 280, to: 260, decay: 0.2, volume: 0.07 }], n >= 3 ? "heavy" : "medium"); }
    warnAttack() { this.tone([{ wave: "square", freq: 660, decay: 0.09, volume: 0.05 }, { wave: "square", at: 0.14, freq: 660, decay: 0.09, volume: 0.05 }, { wave: "square", at: 0.28, freq: 880, decay: 0.14, volume: 0.06 }], "warn"); }
    attack(kind) {
        if (kind === "egg") this.tone([{ wave: "sine", freq: 900, to: 300, decay: 0.2, volume: 0.12 }, { wave: "noise", at: 0.18, freq: 2000, decay: 0.05, volume: 0.06 }], "medium");
        else if (kind === "crow") this.tone([{ wave: "sawtooth", freq: 500, to: 760, decay: 0.12, volume: 0.07 }, { wave: "sawtooth", at: 0.14, freq: 760, to: 960, decay: 0.1, volume: 0.07 }, { wave: "sawtooth", at: 0.26, freq: 960, to: 1200, decay: 0.34, volume: 0.08 }], "heavy");
        else if (kind === "charge") this.tone([{ wave: "noise", freq: 200, decay: 0.5, volume: 0.1 }, { wave: "sawtooth", freq: 70, to: 150, decay: 0.5, volume: 0.1 }], "heavy");
        else this.tone({ wave: "triangle", freq: 500, to: 160, decay: 0.25, volume: 0.14 }, "medium");
    }
    ko() { this.tone([{ wave: "sine", freq: 200, to: 30, decay: 0.7, volume: 0.32 }, { wave: "noise", freq: 400, decay: 0.3, volume: 0.1 }, { wave: "triangle", at: 0.15, freq: 300, to: 90, decay: 0.5, volume: 0.13 }], [60, 30, 80, 30, 120]); }
    fanfare() { this.tone([0, 0.12, 0.24, 0.36, 0.56].map((at, i) => ({ wave: "triangle", at, freq: [523, 659, 784, 1047, 1319][i], decay: 0.3, volume: 0.17 })), "success"); }
    sadTrombone() { this.tone([0, 0.25, 0.5].map((at, i) => ({ wave: "triangle", at, freq: [330, 311, 277][i], to: [320, 300, 240][i], decay: 0.34, volume: 0.15 })), "error"); }
    tickDown() { this.tone({ wave: "square", freq: 980, decay: 0.05, volume: 0.05 }, "tick"); }
    level() { this.tone([0, 0.08, 0.16].map((at, i) => ({ wave: "sine", at, freq: [660, 880, 1320][i], decay: 0.16, volume: 0.14 })), "success"); }
}

/** The rumble of a clear: more pulses, longer and stronger, for more lines and a longer combo. */
export function rumble(lines, combo = 0) {
    // It lands on the same step as the lock's thud, so even a single line has to outweigh a heavy thud or it merges away.
    const n = lines * 2 + Math.min(3, combo), p = [];
    for (let i = 0; i < n; i++) { p.push(Math.round(20 + i * (5 + lines))); p.push(18); }
    p.pop();
    return p;
}
