// Sea, weather and a little accordion band. Every effect is paired with a pulse where it should be felt.
const rep = (s, n) => Array(n).fill(s).join(" ");

export const SONGS = {
    // Spring: a gentle sea-shanty waltz feel in G.
    spring: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.16, decay: 0.42, notes: "G2 - D3 - G3 - D3 - C3 - G3 - C4 - G3 - E3 - B3 - E4 - B3 - D3 - A3 - F#3 - A3 -" },
        { wave: "sine", volume: 0.1, decay: 0.5, notes: "B5 - - D6 - - G5 - G5 - - E5 - - C6 - B5 - - G5 - - E5 - F#5 - - A5 - - D6 -" },
    ] },
    // Summer: brighter, a skipping fiddle over the bass.
    summer: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.16, decay: 0.28, notes: "C3 - G3 - C3 - G3 - F2 - C3 - F3 - C3 - A2 - E3 - A3 - E3 - G2 - D3 - G3 - D3 -" },
        { wave: "square", volume: 0.03, decay: 0.2, notes: "E5 G5 C6 G5 E5 - G5 - F5 A5 C6 A5 F5 - A5 - E5 A5 C6 A5 E5 - C5 - D5 G5 B5 G5 D5 - B4 -" },
        { wave: "noise", volume: 0.015, decay: 0.03, notes: rep("- - C5 -", 8) },
    ] },
    // Autumn: minor, wistful, the nets coming in.
    autumn: { bpm: 88, steps: 2, tracks: [
        { wave: "triangle", volume: 0.16, decay: 0.5, notes: "A2 - E3 - A3 - E3 - F2 - C3 - F3 - C3 - C3 - G3 - C4 - G3 - G2 - D3 - G3 - B3 -" },
        { wave: "sine", volume: 0.1, decay: 0.55, notes: "E6 - - C6 - - A5 - F5 - - A5 - - C6 - G5 - - C6 - - E6 - D6 - - B5 - - G5 -" },
    ] },
    // Winter: sparse, music-box bells.
    winter: { bpm: 72, steps: 2, tracks: [
        { wave: "sine", volume: 0.15, decay: 0.8, notes: "D3 - - - A3 - - - G2 - - - D3 - - - B2 - - - F#3 - - - A2 - - - E3 - - -" },
        { wave: "sine", volume: 0.07, decay: 0.7, notes: "F#6 - A6 - D6 - - - G6 - B6 - D6 - - - F#6 - D6 - B5 - - - E6 - C#6 - A5 - - -" },
    ] },
    // Storm: low driving pulse, a warning figure on top.
    storm: { bpm: 126, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.055, decay: 0.16, notes: "A1 A1 A2 A1 A1 A2 A1 A1 F1 F1 F2 F1 G1 G1 G2 G1 A1 A1 A2 A1 A1 A2 A1 A1 E1 E1 E2 E1 G#1 G#1 G#2 G#1" },
        { wave: "triangle", volume: 0.1, decay: 0.3, notes: "E5 - - C5 - - A4 - F5 - E5 - D5 - B4 - E5 - - C5 - - A4 - B4 - G#4 - E4 - G#4 -" },
        { wave: "noise", volume: 0.03, decay: 0.06, notes: rep("C3 - - C5 - C3 C5 -", 4) },
    ] },
};

export class Sound {
    constructor(game) {
        this.game = game; this.cool = new Map(); this.t = 0; this.song = null; this.musicOn = true;
        this.sea = null; this.wind = null;
    }
    tick(dt) { this.t += dt; }
    ok(k, gap) { const t = this.cool.get(k) ?? -9; if (this.t - t < gap) return false; this.cool.set(k, this.t); return true; }
    sfx(t, h) { this.game.sfx(t, h ? { haptic: h } : undefined); }

    play(name) {
        if (this.song === name) return;
        this.song = name;
        if (!this.musicOn || !SONGS[name]) { this.game.stopMusic(); return; }
        this.game.music(SONGS[name]);
    }
    setMusic(on) { this.musicOn = on; const n = this.song; this.song = null; if (on && n) this.play(n); else if (!on) { this.game.stopMusic(); this.song = n; } }

    /** The sea breathes under everything; wind and rain rise with the storm. */
    ambience(storm, tide) {
        if (!this.sea) {
            try {
                this.sea = this.game.audio.voice({ wave: "noise", freq: 420, volume: 0.02 });
                this.wind = this.game.audio.voice({ wave: "noise", freq: 900, volume: 0 });
            } catch { this.sea = { set() {}, stop() {} }; this.wind = this.sea; }
        }
        const swell = 0.5 + Math.sin(this.t * 0.9) * 0.5;
        this.sea.set({ freq: 300 + tide * 60 + swell * 240, volume: 0.016 + swell * 0.016 + storm * 0.03 });
        this.wind.set({ freq: 520 + Math.sin(this.t * 1.7) * 220 + storm * 500, volume: storm * 0.06 });
    }
    quiet() { this.sea?.stop(); this.wind?.stop(); this.sea = this.wind = null; }

    tap() { this.sfx({ wave: "triangle", freq: 620, to: 760, decay: 0.05, volume: 0.1 }, "tick"); }
    tock() { this.sfx({ wave: "triangle", freq: 330, to: 280, decay: 0.03, volume: 0.07 }, "tick"); }
    deny() { this.sfx([{ wave: "square", freq: 170, decay: 0.07, volume: 0.07 }, { wave: "square", freq: 130, decay: 0.1, volume: 0.07, at: 0.07 }], "warn"); }
    /** The plonk: a wooden thunk, then a rising arpeggio, one note for each star earned. */
    plonk(stars) {
        const notes = [523, 659, 784, 1047, 1319, 1568], t = [
            { wave: "sine", freq: 170, to: 62, decay: 0.16, volume: 0.42 },
            { wave: "triangle", freq: 420, to: 190, decay: 0.08, volume: 0.3 },
            { wave: "noise", freq: 900, to: 300, decay: 0.09, volume: 0.13 },
        ];
        for (let i = 0; i < Math.min(6, stars); i++) t.push({ wave: "triangle", freq: notes[i], attack: 0.004, decay: 0.16, volume: 0.13, at: 0.07 + i * 0.065 });
        this.sfx(t, stars >= 3 ? "medium" : "light");
    }
    coin(n) {
        if (!this.ok("coin", 0.14)) return;
        const f = 1250 + Math.min(n, 6) * 70;
        this.sfx([{ wave: "square", freq: f, decay: 0.05, volume: 0.03 }, { wave: "sine", freq: f * 1.5, decay: 0.09, volume: 0.05, at: 0.045 }], n >= 4 ? "tick" : undefined);
    }
    catch() { if (this.ok("catch", 0.3)) this.sfx([{ wave: "noise", freq: 1200, to: 500, decay: 0.09, volume: 0.05 }, { wave: "sine", freq: 520, to: 700, decay: 0.08, volume: 0.09 }]); }
    chop() { if (this.ok("chop", 0.3)) this.sfx([{ wave: "noise", freq: 1800, to: 900, decay: 0.03, volume: 0.06 }, { wave: "triangle", freq: 260, to: 170, decay: 0.05, volume: 0.09 }]); }
    harvest() { if (this.ok("harvest", 0.3)) this.sfx({ wave: "noise", freq: 3200, to: 1800, decay: 0.12, volume: 0.04 }); }
    horn() { this.sfx([{ wave: "sawtooth", freq: 146, attack: 0.04, decay: 0.42, volume: 0.09 }, { wave: "triangle", freq: 220, attack: 0.04, decay: 0.42, volume: 0.09 }], "light"); }
    gull() { if (this.ok("gull", 3)) this.sfx([{ wave: "triangle", freq: 1500, to: 1000, decay: 0.14, volume: 0.03 }, { wave: "triangle", freq: 1400, to: 900, decay: 0.16, volume: 0.03, at: 0.17 }]); }
    bell() { this.sfx([0, 0.42, 0.84].map((at) => ({ wave: "sine", freq: 880, decay: 0.42, volume: 0.13, at })).concat([0, 0.42, 0.84].map((at) => ({ wave: "triangle", freq: 1318, decay: 0.26, volume: 0.05, at }))), "warn"); }
    thunder(k = 1) { this.sfx([{ wave: "noise", freq: 240, to: 60, attack: 0.02, decay: 1.1, volume: 0.28 * k }, { wave: "sine", freq: 62, to: 34, decay: 0.9, volume: 0.28 * k }], "medium"); }
    splash() { if (this.ok("splash", 0.2)) this.sfx([{ wave: "noise", freq: 1400, to: 240, decay: 0.26, volume: 0.13 }, { wave: "sine", freq: 300, to: 110, decay: 0.16, volume: 0.1 }], "light"); }
    wreck() { if (this.ok("wreck", 0.12)) this.sfx([{ wave: "noise", freq: 700, to: 90, decay: 0.42, volume: 0.28 }, { wave: "triangle", freq: 170, to: 50, decay: 0.32, volume: 0.28 }, { wave: "square", freq: 95, to: 60, decay: 0.16, volume: 0.08, at: 0.1 }], "heavy"); }
    hammer() { this.sfx([0, 0.13, 0.26].map((at) => ({ wave: "triangle", freq: 740, to: 420, decay: 0.05, volume: 0.1, at })), "light"); }
    goal() { this.sfx([523, 659, 784, 1047].map((freq, i) => ({ wave: "triangle", freq, decay: 0.24, volume: 0.16, at: i * 0.08 })), "success"); }
    win() { this.sfx([392, 523, 659, 784, 1047, 784, 1047, 1319].map((freq, i) => ({ wave: i % 2 ? "triangle" : "sine", freq, decay: 0.32, volume: 0.17, at: i * 0.11 })), "success"); }
    calm() { this.sfx([659, 784, 988].map((freq, i) => ({ wave: "sine", freq, decay: 0.42, volume: 0.1, at: i * 0.14 })), "success"); }
}
