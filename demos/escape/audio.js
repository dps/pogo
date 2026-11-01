// Every sound is small, wooden or brass. Her song (E G A G E D C D) runs under all of it, in different clothes.
const NOTE = [261.63, 293.66, 329.63, 392.0, 440.0];
const song = (bpm, steps, tracks) => ({ bpm, steps, tracks });
const bar = (s, n = 1) => Array(n).fill(s).join(" ");
const pad = (notes, v, o = {}) => ({ wave: o.wave ?? "triangle", notes, volume: v, attack: o.attack ?? 0.25, decay: o.decay ?? 2 });
const pluck = (notes, v, o = {}) => ({ wave: o.wave ?? "sine", notes, volume: v, attack: 0.005, decay: o.decay ?? 1.1 });
// Four bars of three beats, a waltz: Am F C G and back, 24 steps at two steps a beat.
const W = (a, b, c, d) => [a, b, c, d].map((n) => `${n} - - - - -`).join(" ");
const THEME = "E5 - G5 - A5 - G5 - E5 - D5 - C5 - - - D5 - - - - - - - - - - - - - - -";
const THEME2 = "A4 - C5 - E5 - D5 - C5 - A4 - G4 - - - A4 - - - - - - - - - - - - - - -";
export const SONGS = {
    night: song(66, 2, [pad(W("A2", "F2", "C3", "G2"), 0.07), pad(W("E3", "C3", "G3", "D3"), 0.04), pluck(bar("- - - - - -", 2) + " " + "E5 - G5 - A5 - G5 - E5 - D5 -", 0.035)]),
    warm: song(84, 2, [pad(W("C3", "A2", "F2", "G2"), 0.07), pad(W("G3", "E3", "C3", "D3"), 0.045), pluck(THEME, 0.05), pluck("C4 - E4 - G4 - A3 - C4 - E4 - F3 - A3 - C4 - G3 - B3 - D4 -", 0.03, { decay: 0.6 })]),
    rain: song(60, 2, [pad(W("D3", "A2", "Bb2", "F2"), 0.07), pad(W("A3", "E3", "F3", "C3"), 0.035), pluck(bar("- - - - - -", 3) + " D5 - - - A4 -", 0.03)]),
    dawn: song(76, 2, [pad(W("F3", "C3", "D3", "A2"), 0.06), pad(W("C4", "G3", "A3", "E3"), 0.04), pluck("A5 - - - C6 - G5 - - - - - A5 - - - F5 - E5 - - - - -", 0.035, { decay: 1.6 })]),
    lullaby: song(70, 2, [pluck(THEME, 0.08, { wave: "triangle", decay: 1.8 }), pluck("C4 - - - - - G3 - - - - - C4 - - - - - G3 - - - - -", 0.05, { wave: "triangle", decay: 1.4 })]),
    duty: song(72, 2, [pad(W("E2", "C3", "G2", "D3"), 0.08, { wave: "sine" }), pad(W("B3", "G3", "D4", "A3"), 0.03), pluck("- - - - - - E4 - - - - - - - - - - - G4 - - - F#4 -", 0.03)]),
    snow: song(50, 2, [pad(W("A2", "A2", "F2", "E2"), 0.06, { wave: "sine", attack: 1 }), pluck(bar("- - - - - -", 2) + " E5 - - - - - - - - - - -", 0.02, { decay: 2.6 })]),
    thin: song(58, 2, [pluck("E5 - - - - - G5 - - - - - - - - - - - - - - - - -", 0.03, { decay: 2 }), pad(W("C3", "-", "G2", "-"), 0.04, { wave: "sine", attack: 1 })]),
    last: song(46, 2, [pad(W("A2", "-", "F2", "-"), 0.05, { wave: "sine", attack: 1.4, decay: 3 })]),
    home: song(72, 2, [pluck(THEME, 0.075, { wave: "triangle", decay: 2 }), pluck(THEME2, 0.04, { wave: "sine", decay: 2 }), pad(W("C3", "A2", "F2", "G2"), 0.07), pad(W("G3", "E3", "C3", "D3"), 0.045)]),
};
export class Sound {
    constructor(game) { this.g = game; this.lastHeart = 0; }
    t(tone, haptic) { this.g.sfx(tone, haptic ? { haptic } : undefined); }
    notch(pitch = 1) { this.t([{ wave: "square", freq: 2300 * pitch, to: 1300 * pitch, decay: 0.012, volume: 0.05 }, { wave: "triangle", freq: 620 * pitch, decay: 0.02, volume: 0.05 }], "tick"); }
    snap() { this.t([{ wave: "square", freq: 900, to: 300, decay: 0.03, volume: 0.1 }, { wave: "noise", freq: 2000, decay: 0.02, volume: 0.08 }, { wave: "triangle", freq: 180, to: 90, decay: 0.09, volume: 0.16, at: 0.02 }], "medium"); }
    latch() { this.t([{ wave: "square", freq: 500, to: 180, decay: 0.05, volume: 0.1 }, { wave: "noise", freq: 1200, decay: 0.03, volume: 0.1, at: 0.05 }, { wave: "triangle", freq: 140, to: 70, decay: 0.16, volume: 0.2, at: 0.05 }], "heavy"); }
    thunk() { this.t([{ wave: "triangle", freq: 120, to: 50, decay: 0.2, volume: 0.28 }, { wave: "noise", freq: 700, decay: 0.05, volume: 0.1 }], "heavy"); }
    clip() { this.t([{ wave: "square", freq: 3000, to: 900, decay: 0.02, volume: 0.1 }, { wave: "triangle", freq: 220, to: 80, decay: 0.12, volume: 0.22, at: 0.01 }, { wave: "noise", freq: 3000, decay: 0.03, volume: 0.08, at: 0.015 }], "heavy"); }
    wrong() { this.t([{ wave: "triangle", freq: 200, to: 150, decay: 0.12, volume: 0.1 }, { wave: "triangle", freq: 150, to: 110, decay: 0.16, volume: 0.1, at: 0.09 }], "warn"); }
    paper() { this.t({ wave: "noise", freq: 3200, to: 1400, attack: 0.02, decay: 0.09, volume: 0.05 }, "tick"); }
    tapSoft() { this.t({ wave: "triangle", freq: 340, to: 240, decay: 0.05, volume: 0.05 }, "tick"); }
    give() { this.t([{ wave: "sine", freq: 523, decay: 0.2, volume: 0.07 }, { wave: "sine", freq: 784, decay: 0.3, volume: 0.06, at: 0.09 }], "light"); }
    solved() { this.t([0, 1, 2, 3].map((i) => ({ wave: "triangle", freq: [440, 523, 659, 880][i], decay: 0.8, volume: 0.07, at: i * 0.13 })), "success"); }
    pluck(row, v = 0.14) { this.t([{ wave: "sine", freq: NOTE[row] * 2, decay: 0.9, volume: v }, { wave: "sine", freq: NOTE[row] * 4, decay: 0.3, volume: v * 0.3 }], "tick"); }
    bell(i) { const f = [988, 880, 784, 659][i % 4]; this.t([{ wave: "sine", freq: f, decay: 1.1, volume: 0.1 }, { wave: "sine", freq: f * 2.76, decay: 0.3, volume: 0.03 }], "light"); }
    sounder(long) { this.t({ wave: "square", freq: long ? 760 : 820, decay: long ? 0.22 : 0.07, volume: 0.04 }, long ? "medium" : "tick"); }
    thud() { this.t([{ wave: "triangle", freq: 110, to: 46, decay: 0.28, volume: 0.3 }, { wave: "noise", freq: 400, decay: 0.08, volume: 0.1 }], "heavy"); }
    wind() { this.t(Array.from({ length: 5 }, (_, i) => ({ wave: "square", freq: 1500 + i * 60, to: 900, decay: 0.015, volume: 0.05, at: i * 0.075 })), "tick"); this.g.haptic([6, 60, 6, 60, 6, 60, 6]); }
    whistle() { this.t([{ wave: "sine", freq: 1900, decay: 0.8, attack: 0.05, volume: 0.09 }, { wave: "sine", freq: 2040, decay: 0.8, attack: 0.05, volume: 0.07 }], "medium"); }
    flame() { this.t({ wave: "noise", freq: 900, to: 300, attack: 0.06, decay: 0.4, volume: 0.09 }, "light"); }
    /** One soft lub-dub. */
    heart(level = 0.5) { this.g.sfx([{ wave: "sine", freq: 62, to: 40, decay: 0.16, volume: 0.15 + level * 0.15 }, { wave: "sine", freq: 54, to: 36, decay: 0.14, volume: 0.1 + level * 0.1, at: 0.2 }]); this.g.haptic([18, 130, 12]); }
    clack(i) { this.g.sfx({ wave: "noise", freq: i % 2 ? 160 : 210, decay: 0.05, volume: 0.03 }); }
    fx(name) { if (this[name]) this[name](); else this.tapSoft(); }
}
