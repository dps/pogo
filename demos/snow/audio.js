// All sound. Everything is soft: this is a game about quiet, so no tone here should ever be sharper than a snowball.
const N = (n) => n;
const pad = (s, n) => s.concat(Array(Math.max(0, n - s.length)).fill("-"));

/** Eight bars of arpeggio, bass and a sparse tune, all the same length so they loop together. */
function song(bpm, chords, tune, o = {}) {
    const bass = [], arp = [], up = [];
    const shape = o.shape ?? [0, 2, 1, 3, 2, 1, 3, 2];
    for (const c of chords) {
        const notes = c.split(" "), root = notes[0];
        bass.push(root, "-", "-", "-", "-", "-", "-", "-");
        for (const k of shape) arp.push(notes[1 + (k % (notes.length - 1))]);
    }
    const len = bass.length;
    return { bpm, steps: 2, tracks: [
        { wave: "sine", volume: 0.15, decay: 2.4, attack: 0.04, notes: bass.join(" ") },
        { wave: "triangle", volume: 0.055, decay: 1.1, attack: 0.006, notes: arp.join(" ") },
        { wave: "sine", volume: 0.1, decay: 1.5, attack: 0.012, notes: pad(tune.split(" "), len).slice(0, len).join(" ") },
    ] };
}

export const SONGS = {
    morning: song(72, ["C3 E4 G4 B4 D5", "A2 C4 E4 G4 B4", "F2 A3 C4 E4 G4", "G2 B3 D4 F4 A4", "C3 E4 G4 B4 D5", "E2 G3 B3 D4 G4", "F2 A3 C4 E4 A4", "G2 B3 D4 G4 B4"],
        "- - - - G5 - - - E5 - - - D5 - - - - - - - C5 - D5 - E5 - - - - - - - - - - - F5 - - - E5 - - - D5 - - - - - - - G5 - - - E5 - D5 - C5 - - - D5 - - - - - - -"),
    noon: song(80, ["D3 F#4 A4 C#5 E5", "B2 D4 F#4 A4 C#5", "G2 B3 D4 F#4 A4", "A2 C#4 E4 G4 B4", "F#2 A3 C#4 E4 A4", "B2 D4 F#4 A4 D5", "G2 B3 D4 F#4 B4", "A2 C#4 E4 A4 C#5"],
        "A5 - - - F#5 - - - E5 - - - - - - - D5 - E5 - F#5 - - - - - - - - - - - B5 - - - A5 - - - F#5 - - - - - - - G5 - - - F#5 - E5 - D5 - - - E5 - - - - - - -"),
    dusk: song(66, ["A2 C4 E4 G4 B4", "F2 A3 C4 E4 G4", "C3 E4 G4 B4 D5", "G2 B3 D4 F#4 A4", "D3 F4 A4 C5 E5", "A2 C4 E4 G4 C5", "F2 A3 C4 E4 A4", "E2 G#3 B3 D4 E4"],
        "- - - - E5 - - - C5 - - - - - - - D5 - C5 - A4 - - - - - - - - - - - - - - - E5 - G5 - F5 - E5 - - - - - D5 - - - C5 - - - A4 - - - - - B4 - - - - - - -", { shape: [0, 1, 2, 3, 2, 1, 0, 1] }),
    night: song(58, ["E3 G4 B4 D5 F#5", "C3 E4 G4 B4 D5", "G2 B3 D4 F#4 A4", "D3 F#4 A4 C#5 E5", "E3 G4 B4 D5 G5", "A2 C4 E4 G4 B4", "C3 E4 G4 B4 E5", "B2 D#4 F#4 A4 B4"],
        "B5 - - - - - - - G5 - - - F#5 - - - E5 - - - - - - - - - - - - - - - D5 - - - E5 - - - G5 - - - - - - - F#5 - - - E5 - - - D5 - - - - - B4 - - - - - - -", { shape: [3, 2, 1, 0, 1, 2, 3, 2] }),
    end: song(62, ["C3 E4 G4 B4 E5", "F2 A3 C4 E4 A4", "A2 C4 E4 G4 C5", "G2 B3 D4 G4 B4", "E3 G#3 B3 E4 G#4", "A2 C4 E4 A4 C5", "F2 A3 C4 F4 A4", "G2 B3 D4 F4 B4"],
        "E5 - - - G5 - - - C6 - - - - - - - A5 - - - G5 - - - E5 - - - - - - - D5 - - - E5 - - - G5 - - - B5 - - - C6 - - - A5 - - - G5 - - - - - - - - - - -"),
};

export class Sound {
    constructor(game) {
        this.game = game; this.now = 0; this.n = 0; this.current = null; this.musicOn = true; this.wind = null; this.tw = 0;
    }
    tick(dt) {
        this.now += dt;
        if (this.wind) { this.tw += dt; this.wind.set({ volume: 0.012 + Math.max(0, Math.sin(this.tw * 0.37) * Math.sin(this.tw * 0.13)) * 0.022, freq: 500 + Math.sin(this.tw * 0.21) * 220 }); }
    }
    startWind() { if (!this.wind) this.wind = this.game.audio.voice?.({ wave: "noise", freq: 500, volume: 0.012 }) ?? null; }
    play(name) {
        if (this.current === name) return;
        this.current = name;
        if (this.musicOn) this.game.music(SONGS[name]); else this.game.stopMusic();
    }
    setMusic(on) { this.musicOn = on; const c = this.current; this.current = null; if (on && c) this.play(c); else { this.current = c; this.game.stopMusic(); } }
    t(tone, haptic) { this.game.sfx(tone, haptic ? { haptic } : undefined); }

    /** The headline crunch: every step gets it, on foot and in the hand. */
    step(tile, snowy) {
        const k = (this.n = (this.n + 1) % 5), v = 1 + k * 0.08;
        if (snowy) this.t([{ wave: "noise", freq: 1500 * v, to: 420, decay: 0.07, volume: 0.1 }, { wave: "noise", freq: 3400, to: 1400, decay: 0.03, volume: 0.05, at: 0.012 }, { wave: "sine", freq: 130, to: 70, decay: 0.05, volume: 0.07 }]);
        else if (tile === 3) this.t({ wave: "sine", freq: 1760 * v, to: 1100, decay: 0.04, volume: 0.035 });
        else this.t([{ wave: "noise", freq: 900 * v, to: 300, decay: 0.04, volume: 0.05 }, { wave: "sine", freq: 170, to: 100, decay: 0.04, volume: 0.05 }]);
        this.game.haptic(snowy ? [7, 18, 5] : "tick");
    }
    push(info, slide) {
        if (slide) this.t([{ wave: "sine", freq: 1320, to: 880, decay: 0.3, volume: 0.05 }, { wave: "noise", freq: 3000, to: 1800, decay: 0.3, volume: 0.05 }]);
        else this.t([{ wave: "noise", freq: 420, to: 220, attack: 0.02, decay: 0.15, volume: 0.13 }, { wave: "sine", freq: 95, to: 75, attack: 0.02, decay: 0.14, volume: 0.12 }]);
    }
    grow(size) { const f = size === 4 ? 392 : 523; this.t([{ wave: "sine", freq: f * 0.75, to: f, attack: 0.01, decay: 0.16, volume: 0.15 }, { wave: "noise", freq: 2200, to: 700, decay: 0.08, volume: 0.07 }]); }
    stack(size) { this.t([{ wave: "sine", freq: 300, to: 130, decay: 0.14, volume: 0.22 }, { wave: "noise", freq: 800, to: 300, decay: 0.07, volume: 0.09 }]); }
    /** The head lands: a wet round plop, then a small bell of pleasure. */
    plop() {
        this.t([{ wave: "sine", freq: 520, to: 120, decay: 0.2, volume: 0.32 }, { wave: "noise", freq: 700, to: 240, decay: 0.1, volume: 0.12 },
            { wave: "sine", freq: 1046, decay: 0.7, volume: 0.09, at: 0.11 }, { wave: "sine", freq: 1318, decay: 0.8, volume: 0.08, at: 0.17 }, { wave: "sine", freq: 1568, decay: 1.1, volume: 0.08, at: 0.24 }]);
    }
    win() {
        const n = [523, 659, 784, 988, 1175, 1568];
        this.t(n.map((f, i) => ({ wave: "sine", freq: f, decay: 1.2, volume: 0.085, at: 0.1 + i * 0.11 })), "success");
    }
    thud() { this.t([{ wave: "sine", freq: 180, to: 90, decay: 0.1, volume: 0.16 }, { wave: "noise", freq: 500, to: 200, decay: 0.05, volume: 0.06 }]); }
    bump() { this.t({ wave: "sine", freq: 150, to: 110, decay: 0.07, volume: 0.1 }); this.game.haptic("tick"); }
    undo() { this.t({ wave: "sine", freq: 340, to: 520, decay: 0.07, volume: 0.07 }); this.game.haptic("tick"); }
    restart() { this.t([{ wave: "noise", freq: 400, to: 2400, attack: 0.05, decay: 0.22, volume: 0.09 }, { wave: "sine", freq: 300, to: 900, attack: 0.05, decay: 0.2, volume: 0.07 }], "light"); }
    shake() { this.t([{ wave: "noise", freq: 2600, to: 700, attack: 0.02, decay: 0.55, volume: 0.12 }, { wave: "sine", freq: 120, to: 80, decay: 0.18, volume: 0.14 }]); }
    melt() { this.t({ wave: "noise", freq: 4200, to: 2400, attack: 0.02, decay: 0.5, volume: 0.08 }); }
    shrink() { this.t([{ wave: "noise", freq: 3600, to: 2000, decay: 0.3, volume: 0.07 }, { wave: "sine", freq: 620, to: 400, decay: 0.15, volume: 0.09 }]); }
    fill() { this.t([{ wave: "sine", freq: 210, to: 70, decay: 0.26, volume: 0.28 }, { wave: "noise", freq: 1100, to: 300, decay: 0.2, volume: 0.14 }]); }
    gate(open) { this.t([{ wave: "triangle", freq: open ? 180 : 140, to: open ? 240 : 100, decay: 0.12, volume: 0.13 }, { wave: "noise", freq: 700, to: 300, decay: 0.08, volume: 0.05 }], "light"); }
    hint() { this.t([{ wave: "sine", freq: 880, decay: 0.5, volume: 0.07 }, { wave: "sine", freq: 1320, decay: 0.6, volume: 0.05, at: 0.08 }], "tick"); }
    unlock() { this.t([{ wave: "sine", freq: 659, decay: 0.6, volume: 0.08 }, { wave: "sine", freq: 988, decay: 0.8, volume: 0.07, at: 0.1 }], "light"); }
    tap() { this.t({ wave: "sine", freq: 620, to: 700, decay: 0.05, volume: 0.06 }); }
}
