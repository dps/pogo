// Every sound in Sugar Crash and the songs for each mood. All made of tones, kept soft and round like the candy.
const rep = (s, n) => Array(n).fill(s).join(" ");
const hat = (n) => ({ wave: "noise", volume: 0.018, decay: 0.03, notes: rep("- C6 - C6", n) });
const kick = (n) => ({ wave: "sine", volume: 0.16, decay: 0.12, slide: 0.5, notes: rep("C3 - - - - - C3 -", n) });

export function makeSongs() {
    return {
        // F major bounce: I vi ii V.
        title: { bpm: 112, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.2, notes: "F2 - C3 - F2 - A2 - D2 - A2 - D3 - A2 - G2 - D3 - G2 - Bb2 - C3 - G2 - C3 - E3 -" },
            { wave: "sine", volume: 0.1, decay: 0.28, notes: "A5 - C6 A5 F5 - A5 - F5 - A5 F5 D5 - F5 - Bb5 - D6 Bb5 G5 - Bb5 - G5 A5 Bb5 C6 E6 - C6 -" },
            kick(4),
        ] },
        // Park: C major stroll, I IV vi V.
        park: { bpm: 104, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.24, notes: "C3 - G3 - C3 - G3 - F2 - C3 - F2 - C3 - A2 - E3 - A2 - E3 - G2 - D3 - G2 - B2 -" },
            { wave: "sine", volume: 0.09, decay: 0.3, notes: "E5 G5 C6 - G5 - E5 - F5 A5 C6 - A5 - F5 - E5 A5 C6 - A5 - E5 - D5 G5 B5 - G5 - D5 -" },
            hat(8),
        ] },
        // Main Street: D major shuffle, I V vi IV.
        street: { bpm: 118, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.18, notes: "D3 D3 A3 - D3 - A2 - A2 A2 E3 - A2 - C#3 - B2 B2 F#3 - B2 - F#2 - G2 G2 D3 - G2 - A2 -" },
            { wave: "square", volume: 0.03, decay: 0.16, notes: "F#5 - A5 - D6 - A5 - E5 - A5 - C#6 - A5 - F#5 - B5 - D6 - B5 - G5 - B5 - D6 - C#6 -" },
            kick(4), hat(8),
        ] },
        // Town Square: Bb major brass-band oom-pah.
        square: { bpm: 126, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.16, notes: "Bb2 - F3 - F2 - F3 - Eb3 - G3 - Bb2 - G3 - C3 - G3 - G2 - G3 - F2 - A3 - F3 - A3 -" },
            { wave: "square", volume: 0.035, decay: 0.2, notes: "D5 - - F5 Bb5 - F5 - Eb5 - - G5 Bb5 - G5 - C5 - - Eb5 G5 - Eb5 - C5 D5 Eb5 F5 A5 - F5 -" },
            hat(8),
        ] },
        // Harbour: A minor sea shanty sway.
        harbour: { bpm: 100, steps: 3, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.3, notes: "A2 - E3 A2 - E3 C3 - G3 C3 - G3 G2 - D3 G2 - D3 A2 - E3 A2 - E3" },
            { wave: "sine", volume: 0.1, decay: 0.28, notes: "E5 - E5 A5 - C6 G5 - G5 E5 - C5 D5 - D5 G5 - B5 C6 B5 A5 E5 - -" },
        ] },
        // Downtown: E minor drive, i VI III VII.
        downtown: { bpm: 128, steps: 2, tracks: [
            { wave: "sawtooth", volume: 0.05, decay: 0.12, notes: "E2 E2 E3 E2 E2 E3 E2 E2 C2 C2 C3 C2 C2 C3 C2 C2 G2 G2 G3 G2 G2 G3 G2 G2 D2 D2 D3 D2 D2 D3 D2 F#2" },
            { wave: "square", volume: 0.03, decay: 0.18, notes: "G5 - B5 - E6 - B5 - G5 - C6 - E6 - C6 - B5 - D6 - G6 - D6 - A5 - D6 - F#6 - D6 -" },
            kick(4), hat(8),
        ] },
        // The Big Bite: slow and huge, F minor.
        sky: { bpm: 96, steps: 2, tracks: [
            { wave: "sawtooth", volume: 0.06, decay: 0.4, notes: "F2 - - F2 - - C3 - Db2 - - Db2 - - Ab2 - Bb1 - - Bb1 - - F2 - C2 - - C2 - - E2 -" },
            { wave: "sine", volume: 0.11, decay: 0.5, notes: "C6 - Ab5 - F5 - - - Db6 - Ab5 - F5 - - - Db6 - Bb5 - F5 - - - C6 - G5 - E5 - - -" },
            kick(4),
        ] },
        // Nap Time: a music box lullaby in G, I IV ii V, very quiet.
        nap: { bpm: 66, steps: 2, tracks: [
            { wave: "sine", volume: 0.1, decay: 0.8, notes: "G3 - D4 - C3 - G3 - A2 - E3 - D3 - A3 -" },
            { wave: "sine", volume: 0.055, decay: 1, notes: "B5 D6 G6 D6 C6 E6 G6 E6 A5 C6 E6 C6 A5 D6 F#6 D6" },
        ] },
    };
}

/** Rising major pentatonic: each cascade step climbs it. */
const LADDER = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760, 2093];

export class Sound {
    constructor(game) { this.g = game; this.now = 0; this.cool = new Map(); }
    tick() { this.now++; }
    ok(k, gap) { const t = this.cool.get(k) ?? -1e3; if (this.now - t < gap) return false; this.cool.set(k, this.now); return true; }
    tone(t, h) { this.g.sfx(t, h ? { haptic: h } : undefined); }

    grab() { this.tone({ wave: "sine", freq: 300, to: 460, decay: 0.07, volume: 0.14 }, "tick"); }
    swap() { this.tone([{ wave: "sine", freq: 240, to: 520, decay: 0.09, volume: 0.2 }, { wave: "triangle", freq: 120, to: 90, decay: 0.08, volume: 0.14 }], "light"); }
    nope() { this.tone([{ wave: "sine", freq: 300, to: 180, decay: 0.09, volume: 0.2 }, { wave: "sine", at: 0.09, freq: 280, to: 170, decay: 0.12, volume: 0.16 }], "warn"); }
    /** The heart of the game: each step of a cascade rings higher. */
    chain(n, size) {
        const f = LADDER[Math.min(n, LADDER.length - 1)], v = Math.min(0.3, 0.2 + size * 0.008);
        const tones = [
            { wave: "sine", freq: f * 0.5, to: f, attack: 0.004, decay: 0.13, volume: v },
            { wave: "triangle", freq: f, to: f * 1.5, at: 0.03, decay: 0.12, volume: v * 0.6 },
            { wave: "sine", freq: 130 + n * 12, to: 80, decay: 0.09, volume: 0.18 },
        ];
        if (n >= 2) tones.push({ wave: "sine", freq: f * 2, at: 0.06, decay: 0.2, volume: v * 0.35 });
        this.tone(tones);
    }
    land(hit) { if (this.ok("land", 3)) this.tone({ wave: "sine", freq: 170 + hit * 60, to: 90, decay: 0.05, volume: 0.07 + hit * 0.06 }); }
    gulp() { if (this.ok("gulp", 5)) this.tone({ wave: "sine", freq: 200 + (this.now * 31 % 90), to: 90, decay: 0.08, volume: 0.13 }); }
    make(k) { this.tone([{ wave: "triangle", freq: 440, to: 880, decay: 0.12, volume: 0.22 }, { wave: "sine", at: 0.08, freq: 1320, decay: 0.2, volume: 0.15 }]); }
    stripe() { if (this.ok("stripe", 3)) this.tone([{ wave: "sawtooth", freq: 1500, to: 220, decay: 0.2, volume: 0.1 }, { wave: "noise", freq: 2400, to: 400, decay: 0.2, volume: 0.16 }, { wave: "sine", freq: 150, to: 60, decay: 0.15, volume: 0.26 }]); }
    boom(big) { this.tone([{ wave: "sine", freq: big ? 150 : 200, to: 40, decay: big ? 0.5 : 0.28, volume: 0.42 }, { wave: "noise", freq: 900, to: 120, decay: big ? 0.45 : 0.24, volume: big ? 0.3 : 0.2 }, { wave: "triangle", freq: 500, to: 100, decay: 0.14, volume: 0.15 }]); }
    star() { const a = []; [784, 988, 1175, 1568, 1976, 2349].forEach((f, n) => a.push({ wave: "sine", at: n * 0.035, freq: f, decay: 0.26, volume: 0.13 })); this.tone(a); }
    bee() { if (this.ok("bee", 4)) this.tone([{ wave: "sawtooth", freq: 190, to: 280, decay: 0.3, volume: 0.05 }, { wave: "square", freq: 195, to: 290, decay: 0.3, volume: 0.03 }]); }
    crack(left) { if (this.ok("crack", 2)) this.tone([{ wave: "noise", freq: 2200, to: 800, decay: 0.08, volume: 0.22 }, { wave: "square", freq: left ? 420 : 300, to: 120, decay: 0.05, volume: 0.07 }]); }
    lick() { if (this.ok("lick", 3)) this.tone({ wave: "sine", freq: 620, to: 980, decay: 0.08, volume: 0.1 }); }
    snap() { if (this.ok("snap", 3)) this.tone([{ wave: "square", freq: 780, to: 240, decay: 0.05, volume: 0.09 }, { wave: "noise", freq: 3200, decay: 0.04, volume: 0.1 }]); }
    splat() { if (this.ok("splat", 3)) this.tone([{ wave: "sine", freq: 180, to: 70, decay: 0.14, volume: 0.24 }, { wave: "noise", freq: 500, to: 200, decay: 0.08, volume: 0.1 }]); }
    ooze() { this.tone({ wave: "sine", freq: 90, to: 150, decay: 0.2, volume: 0.2 }); }
    mallow() { if (this.ok("mallow", 3)) this.tone({ wave: "sine", freq: 340, to: 620, decay: 0.09, volume: 0.17 }); }
    shuffle() { const a = []; for (let n = 0; n < 7; n++) a.push({ wave: "sine", at: n * 0.05, freq: 400 + n * 90, decay: 0.05, volume: 0.1 }); this.tone(a); }
    rushTick() { this.tone({ wave: "triangle", freq: 880, to: 1320, decay: 0.07, volume: 0.13 }); }
    ready() { this.tone([523, 659, 784, 1047].map((freq, n) => ({ wave: "triangle", freq, at: n * 0.06, decay: 0.16, volume: 0.17 })), "success"); }
    arm() { this.tone({ wave: "triangle", freq: 200, to: 620, decay: 0.15, volume: 0.2 }, "medium"); }
    chomp() { this.tone([{ wave: "square", freq: 120, to: 50, decay: 0.12, volume: 0.2 }, { wave: "noise", freq: 1400, to: 200, decay: 0.2, volume: 0.28 }, { wave: "sine", freq: 180, to: 45, decay: 0.34, volume: 0.42 }]); }
    roar() { this.tone([{ wave: "sawtooth", freq: 170, to: 340, decay: 0.45, volume: 0.1 }, { wave: "square", freq: 86, to: 170, decay: 0.45, volume: 0.06 }, { wave: "sine", freq: 340, to: 680, at: 0.1, decay: 0.3, volume: 0.1 }]); }
    stomp() { this.tone([{ wave: "sine", freq: 110, to: 35, decay: 0.34, volume: 0.45 }, { wave: "noise", freq: 700, to: 90, decay: 0.26, volume: 0.24 }]); }
    wreck() { this.tone([{ wave: "noise", freq: 1800, to: 180, decay: 0.42, volume: 0.28 }, { wave: "sine", freq: 130, to: 40, decay: 0.4, volume: 0.36 }, { wave: "square", freq: 420, to: 90, decay: 0.2, volume: 0.05 }]); }
    burp() { this.tone([{ wave: "sawtooth", freq: 110, to: 70, decay: 0.34, volume: 0.13 }, { wave: "square", freq: 56, to: 80, decay: 0.3, volume: 0.09 }]); }
    exit() { this.tone([660, 880, 1320].map((freq, n) => ({ wave: "sine", freq, at: n * 0.07, decay: 0.15, volume: 0.15 })), "light"); }
    star1(n) { this.tone([{ wave: "triangle", freq: [784, 988, 1175][n], decay: 0.3, volume: 0.25 }, { wave: "sine", freq: [1568, 1976, 2349][n], at: 0.03, decay: 0.3, volume: 0.13 }], n === 2 ? "heavy" : "medium"); }
    win() { const a = []; [523, 659, 784, 1047, 784, 1047, 1319].forEach((freq, n) => a.push({ wave: "triangle", freq, at: n * 0.1, decay: 0.24, volume: 0.2 })); this.tone(a, "success"); }
    lose() { this.tone([{ wave: "sine", freq: 300, to: 110, decay: 0.7, volume: 0.22 }, { wave: "sine", freq: 150, to: 60, at: 0.3, decay: 0.6, volume: 0.26 }], "error"); }
    ui() { this.tone({ wave: "sine", freq: 520, to: 700, decay: 0.07, volume: 0.15 }); }
    paper() { this.tone({ wave: "noise", freq: 3000, to: 900, decay: 0.2, volume: 0.1 }, "light"); }
    chime(n) { const f = [784, 880, 988, 1175, 1319][n % 5]; this.tone([{ wave: "sine", freq: f, decay: 0.9, volume: 0.1 }, { wave: "sine", freq: f * 2, at: 0.02, decay: 0.7, volume: 0.04 }], "tick"); }
    nap(n) { const f = [392, 440, 494, 587, 659, 784][Math.min(n, 5)]; this.tone({ wave: "sine", freq: f, decay: 0.3, volume: 0.09 }); }
}
