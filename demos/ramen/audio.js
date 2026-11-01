// Every sound in Ramen Rush. Perfect moves climb a pentatonic ladder, so a good rush plays a tune.
const rep = (s, n) => Array(n).fill(s).join(" ");
const SHAKE = (n) => rep("- C6 - C6", n);

export function makeSongs() {
    return {
        // Soft, a little sleepy: the ledger between shifts.
        menu: { bpm: 76, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.7, notes: "F2 - - C3 - - F3 - E2 - - B2 - - E3 - D2 - - A2 - - D3 - G2 - - D3 - - G3 -" },
            { wave: "sine", volume: 0.1, decay: 0.8, notes: "A4 - C5 - E5 - - - G4 - B4 - E5 - - - F4 - A4 - D5 - - - G4 - B4 - D5 - - -" },
            { wave: "sine", volume: 0.05, decay: 0.5, notes: "- - - - - - G5 - - - - - - - A5 - - - - - - - E5 - - - - - - - D5 -" },
        ] },
        cart: { bpm: 92, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.34, notes: "F2 - C3 - F2 - A2 - E2 - B2 - E2 - G2 - D2 - A2 - D2 - F2 - G2 - D3 - G2 - B2 -" },
            { wave: "sine", volume: 0.11, decay: 0.4, notes: "A4 C5 E5 - C5 - A4 - G4 B4 E5 - B4 - G4 - F4 A4 D5 - A4 - F4 - G4 B4 D5 - G5 - D5 -" },
            { wave: "noise", volume: 0.018, decay: 0.03, notes: SHAKE(8) },
        ] },
        station: { bpm: 108, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.2, notes: "C3 - G3 C3 - G3 C3 - A2 - E3 A2 - E3 A2 - F2 - C3 F2 - C3 F2 - G2 - D3 G2 - D3 B2 -" },
            { wave: "square", volume: 0.03, decay: 0.2, notes: "E5 G5 - A5 - G5 E5 - C5 E5 - G5 - E5 C5 - A4 C5 - D5 - C5 A4 - B4 D5 - G5 - F5 D5 -" },
            { wave: "noise", volume: 0.03, decay: 0.03, notes: rep("C6 - C6 C6", 8) },
            { wave: "sine", volume: 0.1, slide: 0.5, decay: 0.12, notes: rep("C3 - - - - - - -", 4) },
        ] },
        seaside: { bpm: 84, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.55, notes: "D3 - A3 - D3 - - - B2 - F#3 - B2 - - - G2 - D3 - G2 - - - A2 - E3 - A2 - - -" },
            { wave: "sine", volume: 0.1, decay: 0.55, notes: "F#5 - A5 - D6 - A5 - D5 - F#5 - B5 - F#5 - B4 - D5 - G5 - D5 - C#5 - E5 - A5 - E5 -" },
        ] },
        hall: { bpm: 100, steps: 2, tracks: [
            { wave: "triangle", volume: 0.23, decay: 0.3, notes: "A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - C3 - G3 - C3 - G3 - G2 - D3 - G2 - B2 -" },
            { wave: "sine", volume: 0.11, decay: 0.45, notes: "E5 - A5 - C6 - B5 A5 F5 - A5 - C6 - A5 - G5 - C6 - E6 - D6 C6 B4 - D5 - G5 - D5 -" },
            { wave: "sine", volume: 0.1, slide: 0.5, decay: 0.14, notes: rep("C3 - - - - C3 - -", 4) },
            { wave: "noise", volume: 0.02, decay: 0.03, notes: SHAKE(8) },
        ] },
        // Rush: the same chords as the cart, pushed along.
        rush: { bpm: 128, steps: 2, tracks: [
            { wave: "triangle", volume: 0.23, decay: 0.16, notes: "F2 F2 C3 F2 - F2 A2 C3 E2 E2 B2 E2 - E2 G2 B2 D2 D2 A2 D2 - D2 F2 A2 G2 G2 D3 G2 - G2 B2 D3" },
            { wave: "square", volume: 0.035, decay: 0.14, notes: "A5 C6 A5 E5 - C6 A5 - G5 B5 G5 E5 - B5 G5 - F5 A5 F5 D5 - A5 F5 - G5 B5 G5 D5 G5 B5 D6 -" },
            { wave: "sine", volume: 0.13, slide: 0.5, decay: 0.12, notes: rep("C3 - - - C3 - - -", 4) },
            { wave: "noise", volume: 0.035, decay: 0.03, notes: rep("C6 C6 C4 C6", 8) },
        ] },
        finale: { bpm: 68, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.9, notes: "C3 - G3 - C4 - - - A2 - E3 - A3 - - - F2 - C3 - F3 - - - G2 - D3 - G3 - - -" },
            { wave: "sine", volume: 0.12, decay: 1.0, notes: "E5 - - - G5 - - - C5 - - - E5 - - - A4 - - - C5 - - - B4 - - - D5 - - -" },
        ] },
    };
}

const SCALE = [392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];

export class Sound {
    constructor(game) { this.g = game; this.ladder = 0; this.now = 0; this.cool = {}; this.pourV = null; this.boilV = null; this.ok = true; }
    sfx(t, h) { this.g.sfx(t, h ? { haptic: h } : undefined); }
    tick() { this.now++; }
    gap(k, n) { if (this.now - (this.cool[k] ?? -999) < n) return false; this.cool[k] = this.now; return true; }

    /** One more rung up the scale. Anything less than perfect steps back down. */
    climb(h) { const f = SCALE[Math.min(this.ladder, SCALE.length - 1)]; this.ladder = Math.min(this.ladder + 1, SCALE.length - 1); this.sfx([{ wave: "triangle", freq: f, decay: 0.26, volume: 0.17 }, { wave: "sine", freq: f * 2, decay: 0.16, volume: 0.06 }], h); }
    stumble() { this.ladder = Math.max(0, this.ladder - 3); }

    ui() { this.sfx({ wave: "triangle", freq: 660, to: 760, decay: 0.05, volume: 0.13 }); }
    nope() { this.sfx({ wave: "triangle", freq: 200, to: 150, decay: 0.09, volume: 0.15 }, "warn"); }
    drop() { this.sfx([{ wave: "sine", freq: 300, to: 130, decay: 0.12, volume: 0.28 }, { wave: "noise", freq: 1200, to: 500, decay: 0.08, volume: 0.1 }], "light"); }
    ready() { this.sfx([{ wave: "triangle", freq: 880, decay: 0.09, volume: 0.1 }, { wave: "triangle", freq: 1174, decay: 0.12, volume: 0.1, at: 0.07 }], "tick"); }
    over() { this.sfx({ wave: "sine", freq: 300, to: 180, decay: 0.2, volume: 0.13 }, "warn"); }
    lift(k) { if (this.gap("lift", 5)) this.sfx({ wave: "triangle", freq: 240 + k * 420, decay: 0.04, volume: 0.1 }, "tick"); }
    splash() { this.sfx([{ wave: "noise", freq: 1600, to: 400, decay: 0.15, volume: 0.2 }, { wave: "sine", freq: 420, to: 150, decay: 0.12, volume: 0.22 }], "medium"); }
    scoop() { this.sfx([{ wave: "noise", freq: 800, to: 1800, decay: 0.09, volume: 0.13 }, { wave: "sine", freq: 180, to: 320, decay: 0.09, volume: 0.13 }], "light"); }
    chop() { const f = 180 + (this.now * 7 % 5) * 12; this.sfx([{ wave: "triangle", freq: f * 3, to: f, decay: 0.05, volume: 0.25 }, { wave: "noise", freq: 2600, to: 900, decay: 0.03, volume: 0.13 }], "tick"); }
    place(neat) { this.sfx([{ wave: "sine", freq: neat ? 520 : 400, to: 260, decay: 0.06, volume: 0.2 }, { wave: "noise", freq: 1800, decay: 0.02, volume: 0.05 }], "light"); }
    slide() { this.sfx([{ wave: "noise", freq: 500, to: 1500, decay: 0.26, volume: 0.13 }, { wave: "triangle", freq: 110, to: 180, decay: 0.2, volume: 0.17 }], "medium"); }
    bell() { if (this.gap("bell", 18)) this.sfx([{ wave: "sine", freq: 1760, decay: 0.34, volume: 0.075 }, { wave: "sine", freq: 2637, decay: 0.28, volume: 0.05, at: 0.05 }]); }
    coin() { if (this.gap("coin", 4)) this.sfx([{ wave: "square", freq: 1250, decay: 0.05, volume: 0.05 }, { wave: "square", freq: 1670, decay: 0.09, volume: 0.05, at: 0.05 }]); }
    slurp() {
        // A long wet rising gulp, then a satisfied little sigh.
        this.sfx([
            { wave: "noise", freq: 500, to: 3200, attack: 0.03, decay: 0.34, volume: 0.17 },
            { wave: "sawtooth", freq: 170, to: 520, attack: 0.02, decay: 0.3, volume: 0.05 },
            { wave: "sine", freq: 420, to: 250, attack: 0.05, decay: 0.3, volume: 0.09, at: 0.38 },
        ], "light");
    }
    perfect() { this.sfx([523, 659, 784, 1046].map((f, i) => ({ wave: "triangle", freq: f, decay: 0.34, volume: 0.13, at: i * 0.06 })), "success"); }
    good() { this.sfx([{ wave: "triangle", freq: 523, decay: 0.16, volume: 0.13 }, { wave: "triangle", freq: 659, decay: 0.2, volume: 0.13, at: 0.07 }]); }
    meh() { this.sfx({ wave: "triangle", freq: 330, decay: 0.2, volume: 0.13 }); }
    walk() { this.sfx([{ wave: "sine", freq: 340, to: 260, decay: 0.28, volume: 0.13 }, { wave: "sine", freq: 250, to: 196, decay: 0.32, volume: 0.1, at: 0.17 }], "warn"); }
    trainWarn() { this.sfx([{ wave: "triangle", freq: 659, decay: 0.18, volume: 0.1 }, { wave: "triangle", freq: 523, decay: 0.26, volume: 0.1, at: 0.2 }]); }
    train() { this.sfx([{ wave: "sawtooth", freq: 330, decay: 0.6, volume: 0.05 }, { wave: "sawtooth", freq: 415, decay: 0.6, volume: 0.05 }, { wave: "noise", freq: 200, to: 90, attack: 0.3, decay: 0.8, volume: 0.13 }], "medium"); }
    gull() { this.sfx([{ wave: "sawtooth", freq: 900, to: 1300, decay: 0.09, volume: 0.05 }, { wave: "sawtooth", freq: 1200, to: 700, decay: 0.16, volume: 0.05, at: 0.1 }]); }
    shoo() { this.sfx([{ wave: "noise", freq: 2000, to: 700, decay: 0.1, volume: 0.14 }, { wave: "triangle", freq: 500, to: 900, decay: 0.09, volume: 0.13 }], "medium"); }
    steal() { this.sfx({ wave: "sawtooth", freq: 1200, to: 500, decay: 0.2, volume: 0.05 }, "warn"); }
    rush() { this.sfx([440, 554, 659, 880].map((f, i) => ({ wave: "square", freq: f, decay: 0.12, volume: 0.05, at: i * 0.07 })), "heavy"); }
    star(i) { this.sfx([{ wave: "triangle", freq: 660 * 2 ** (i * 4 / 12), decay: 0.3, volume: 0.18 }, { wave: "sine", freq: 1320 * 2 ** (i * 4 / 12), decay: 0.2, volume: 0.08 }], i === 2 ? "success" : "medium"); }
    buy() { this.sfx([{ wave: "square", freq: 880, decay: 0.05, volume: 0.05 }, { wave: "square", freq: 1320, decay: 0.12, volume: 0.05, at: 0.06 }, { wave: "triangle", freq: 220, to: 330, decay: 0.09, volume: 0.15 }], "medium"); }

    pour(v, level) {
        if (v > 0.01) {
            this.pourV ??= this.g.audio.voice({ wave: "noise", freq: 500, volume: 0 });
            this.pourV.set({ freq: 420 + level * 1250, volume: 0.03 + v * 0.14 });
        } else if (this.pourV) { this.pourV.stop(); this.pourV = null; }
    }
    boil(n) {
        if (n > 0) { this.boilV ??= this.g.audio.voice({ wave: "noise", freq: 260, volume: 0 }); this.boilV.set({ freq: 240 + Math.sin(this.now * 0.03) * 40, volume: 0.01 + n * 0.008 }); }
        else if (this.boilV) { this.boilV.stop(); this.boilV = null; }
    }
    hush() { this.pour(0, 0); this.boil(0); }
}
