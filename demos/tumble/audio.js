// All sound in Tumble Keep: event tones with paired haptics, and a song for each mood.
const rep = (s, n) => Array(n).fill(s).join(" ");

export function makeSongs() {
    return {
        // Title and map: a jaunty lute walk in G.
        menu: { bpm: 104, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.3, notes: "G2 - D3 - G2 - D3 - E2 - B2 - E2 - B2 - C3 - G3 - C3 - G3 - D3 - A3 - D3 - F#3 -" },
            { wave: "triangle", volume: 0.09, decay: 0.25, notes: "B4 D5 G5 D5 B4 D5 G5 D5 G4 B4 E5 B4 G4 B4 E5 B4 G4 C5 E5 C5 G4 C5 E5 C5 A4 D5 F#5 D5 A4 D5 F#5 A5" },
        ] },
        meadow: { bpm: 118, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.22, notes: "C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - B2 -" },
            { wave: "square", volume: 0.04, decay: 0.18, notes: "E5 - G5 A5 G5 - E5 - C5 - E5 D5 C5 - A4 - A4 C5 F5 - E5 C5 A4 - B4 D5 G5 - F5 D5 B4 -" },
            { wave: "noise", volume: 0.03, decay: 0.03, notes: rep("- - C5 -", 8) },
        ] },
        frost: { bpm: 96, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.45, notes: "A2 - - - E3 - - - F2 - - - C3 - - - D3 - - - A2 - - - E2 - - - B2 - - -" },
            { wave: "sine", volume: 0.1, decay: 0.5, notes: "E6 - C6 - A5 - E5 - F6 - C6 - A5 - F5 - F6 - D6 - A5 - F5 - E6 - B5 - G#5 - E5 -" },
        ] },
        ember: { bpm: 132, steps: 2, tracks: [
            { wave: "sawtooth", volume: 0.07, decay: 0.14, notes: "D2 D2 D3 D2 D2 D3 D2 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 D2 D2 D3 D2 D2 D3 D2 D2 G1 G1 G2 G1 A1 A1 A2 C#2" },
            { wave: "square", volume: 0.04, decay: 0.2, notes: "D5 - - F5 - - A5 - Bb5 - A5 - G5 - F5 - E5 - - G5 - - Bb5 - A5 - G5 - F5 - E5 -" },
            { wave: "noise", volume: 0.05, decay: 0.05, notes: rep("C4 - - - C4 - C4 -", 4) },
        ] },
        storm: { bpm: 112, steps: 2, tracks: [
            { wave: "triangle", volume: 0.24, decay: 0.3, notes: "E2 - E2 - E3 - E2 - C2 - C2 - C3 - C2 - D2 - D2 - D3 - D2 - B1 - B1 - B2 - D#2 -" },
            { wave: "sine", volume: 0.09, decay: 0.32, notes: "G5 B5 E6 B5 G5 B5 E6 B5 G5 C6 E6 C6 G5 C6 E6 C6 F#5 A5 D6 A5 F#5 A5 D6 A5 F#5 B5 D#6 B5 F#5 B5 D#6 B5" },
        ] },
        gilded: { bpm: 124, steps: 2, tracks: [
            { wave: "triangle", volume: 0.22, decay: 0.2, notes: "D3 - A3 - D3 - A3 - G2 - D3 - G2 - D3 - E3 - B3 - E3 - B3 - A2 - E3 - A2 - C#3 -" },
            { wave: "square", volume: 0.04, decay: 0.16, notes: "A5 F#5 D5 F#5 A5 - D6 - B5 G5 D5 G5 B5 - D6 - G#5 E5 B4 E5 G#5 - B5 - A5 E5 C#5 E5 A5 - C#6 -" },
            { wave: "noise", volume: 0.03, decay: 0.03, notes: rep("- - C5 C5", 8) },
        ] },
        boss: { bpm: 148, steps: 2, tracks: [
            { wave: "sawtooth", volume: 0.08, decay: 0.12, notes: "E2 E2 E3 E2 E2 E3 E2 E2 F2 F2 F3 F2 A#1 A#1 A#2 A#1 E2 E2 E3 E2 E2 E3 E2 E2 C2 C2 C3 C2 B1 B1 B2 D#2" },
            { wave: "square", volume: 0.05, decay: 0.2, notes: "E5 - B4 - E5 - G5 - F5 - - E5 - - D5 - E5 - B4 - G5 - A#5 - B5 - - A5 - G5 F#5 D#5" },
            { wave: "noise", volume: 0.06, decay: 0.05, notes: rep("C3 - C5 - C3 C3 C5 -", 4) },
        ] },
        sandbox: { bpm: 90, steps: 2, tracks: [
            { wave: "triangle", volume: 0.2, decay: 0.4, notes: "C3 - - G3 - - E3 - F2 - - C3 - - A3 - D3 - - A3 - - F3 - G2 - - D3 - - B2 -" },
            { wave: "sine", volume: 0.07, decay: 0.4, notes: "G5 - E5 - C5 - - - A5 - F5 - C5 - - - A5 - F5 - D5 - - - B5 - G5 - D5 - - -" },
        ] },
    };
}

export class Sound {
    constructor(game) { this.game = game; this.cool = new Map(); this.now = 0; }
    tick() { this.now++; }
    /** Limits how often an effect plays, so a collapse is a roar and not a buzz. */
    ok(k, gap) { const t = this.cool.get(k) ?? -1e3; if (this.now - t < gap) return false; this.cool.set(k, this.now); return true; }
    sfx(t, h) { this.game.sfx(t, h ? { haptic: h } : undefined); }

    tension(k) { this.sfx({ wave: "triangle", freq: 170 + k * 520, to: 190 + k * 560, attack: 0.001, decay: 0.045, volume: 0.13 }, undefined); }
    release(k) {
        this.sfx([{ wave: "noise", freq: 500 + k * 1500, to: 120, decay: 0.2, volume: 0.22 }, { wave: "triangle", freq: 420 + k * 400, to: 90, decay: 0.2, volume: 0.28 }, { wave: "square", freq: 130, to: 60, decay: 0.08, volume: 0.1 }]);
    }
    thud(mat, J) {
        const v = Math.min(1, J / 26), big = 0.45 + v * 0.55;
        if (mat === "wood" || mat === "roof") { if (!this.ok("wood", 3)) return; const f = 170 + (this.now * 37 % 90); this.sfx([{ wave: "triangle", freq: f * 1.9, to: f, decay: 0.09, volume: 0.25 * big }, { wave: "noise", freq: 900, to: 300, decay: 0.05, volume: 0.1 * big }]); }
        else if (mat === "stone") { if (!this.ok("stone", 4)) return; const f = 80 + (this.now * 13 % 34); this.sfx([{ wave: "sine", freq: f * 1.6, to: f * 0.6, decay: 0.17, volume: 0.36 * big }, { wave: "noise", freq: 380, to: 90, decay: 0.12, volume: 0.15 * big }]); }
        else if (mat === "glass") { if (!this.ok("glass", 4)) return; const f = 1900 + (this.now * 71 % 1400); this.sfx({ wave: "sine", freq: f, to: f * 0.96, decay: 0.11, volume: 0.1 * big }); }
        else if (mat === "shot") { if (!this.ok("shot", 5)) return; this.sfx([{ wave: "sine", freq: 130, to: 50, decay: 0.2, volume: 0.42 * big }, { wave: "noise", freq: 260, to: 70, decay: 0.12, volume: 0.2 * big }]); }
        else if (mat === "gold") { if (!this.ok("gold", 5)) return; this.sfx({ wave: "triangle", freq: 1320, to: 1250, decay: 0.2, volume: 0.13 }); }
    }
    breakIt(mat) {
        const n = this.now;
        if (mat === "wood" || mat === "roof") { if (!this.ok("bw", 4)) return; this.sfx([{ wave: "sawtooth", freq: 340 + n * 31 % 240, to: 90, decay: 0.09, volume: 0.13 }, { wave: "noise", freq: 2200, to: 500, decay: 0.12, volume: 0.17 }, { wave: "square", freq: 130, to: 80, at: 0.04, decay: 0.06, volume: 0.1 }]); }
        else if (mat === "stone") { if (!this.ok("bs", 5)) return; this.sfx([{ wave: "noise", freq: 620, to: 120, decay: 0.24, volume: 0.28 }, { wave: "sine", freq: 96, to: 44, decay: 0.26, volume: 0.42 }, { wave: "noise", freq: 2500, to: 1000, at: 0.03, decay: 0.05, volume: 0.1 }]); }
        else if (mat === "glass") {
            if (!this.ok("bg", 4)) return;
            const f = 2100 + n * 97 % 1300;
            this.sfx([{ wave: "noise", freq: 6200, to: 3000, decay: 0.15, volume: 0.17 }, { wave: "sine", freq: f, to: f * 0.8, decay: 0.2, volume: 0.1 }, { wave: "sine", freq: f * 1.33, at: 0.03, decay: 0.18, volume: 0.08 }, { wave: "sine", freq: f * 1.78, at: 0.07, decay: 0.2, volume: 0.06 }]);
        }
    }
    boom(big) { this.sfx([{ wave: "noise", freq: 1400, to: 80, decay: 0.55 * big, volume: 0.5 }, { wave: "sine", freq: 110, to: 30, decay: 0.6 * big, volume: 0.6 }, { wave: "square", freq: 70, to: 34, decay: 0.2, volume: 0.16 }]); }
    fuse() { if (this.ok("fuse", 8)) this.sfx({ wave: "noise", freq: 4800, to: 3000, decay: 0.12, volume: 0.1 }); }
    squash(boss) { this.sfx([{ wave: "square", freq: boss ? 300 : 620, to: 90, decay: 0.2, volume: 0.15 }, { wave: "noise", freq: 900, to: 200, decay: 0.09, volume: 0.17 }, { wave: "triangle", freq: 200, to: 60, decay: 0.16, volume: 0.28 }], "heavy"); }
    squeak() { if (this.ok("squeak", 16)) { const f = 560 + (this.now * 53 % 300); this.sfx([{ wave: "square", freq: f, to: f * 1.6, decay: 0.06, volume: 0.05 }, { wave: "square", freq: f * 1.5, to: f, at: 0.07, decay: 0.09, volume: 0.05 }]); } }
    groan(load) {
        if (!this.ok("groan", 30)) return;
        const f = 74 + (this.now * 11 % 26);
        this.sfx([{ wave: "sawtooth", freq: f * 1.35, to: f * 0.8, attack: 0.09, decay: 0.7, volume: 0.1 }, { wave: "triangle", freq: f * 2.03, to: f * 1.5, attack: 0.12, decay: 0.6, volume: 0.1 }, { wave: "noise", freq: 340, to: 200, attack: 0.1, decay: 0.5, volume: 0.05 }]);
    }
    rumble(k) { if (this.ok("rum", 11)) this.sfx([{ wave: "noise", freq: 180 + k * 130, to: 80, attack: 0.02, decay: 0.3, volume: 0.1 + k * 0.28 }, { wave: "sine", freq: 58, to: 42, attack: 0.02, decay: 0.28, volume: 0.1 + k * 0.28 }]); }
    combo(m) { const f = 392 * 2 ** ((Math.min(m, 12) * 2) / 12); this.sfx([{ wave: "square", freq: f, decay: 0.08, volume: 0.07 }, { wave: "square", freq: f * 1.5, at: 0.07, decay: 0.12, volume: 0.08 }], "light"); }
    score() { if (this.ok("score", 5)) this.sfx({ wave: "triangle", freq: 980 + (this.now * 29 % 300), decay: 0.04, volume: 0.05 }); }
    slowmo() { this.sfx([{ wave: "sine", freq: 180, to: 46, attack: 0.05, decay: 0.8, volume: 0.32 }, { wave: "noise", freq: 400, to: 100, attack: 0.1, decay: 0.7, volume: 0.09 }]); }
    power(kind) {
        if (kind === "split") this.sfx([{ wave: "square", freq: 880, to: 1320, decay: 0.08, volume: 0.09 }, { wave: "square", freq: 660, to: 1100, at: 0.04, decay: 0.08, volume: 0.09 }], "medium");
        else if (kind === "slam") this.sfx([{ wave: "sawtooth", freq: 620, to: 90, decay: 0.28, volume: 0.15 }, { wave: "noise", freq: 2200, to: 300, decay: 0.2, volume: 0.1 }], "medium");
        else this.sfx([{ wave: "sine", freq: 220, to: 900, decay: 0.16, volume: 0.22 }, { wave: "triangle", freq: 330, to: 1100, decay: 0.12, volume: 0.1 }], "medium");
    }
    boing() { if (this.ok("boing", 5)) this.sfx({ wave: "sine", freq: 170, to: 560, decay: 0.16, volume: 0.25 }); }
    bell() { this.sfx([{ wave: "sine", freq: 523, decay: 0.7, volume: 0.15 }, { wave: "sine", freq: 1319, decay: 0.45, volume: 0.07 }, { wave: "sine", freq: 523, at: 0.3, decay: 0.7, volume: 0.14 }, { wave: "sine", freq: 1319, at: 0.3, decay: 0.45, volume: 0.06 }], "medium"); }
    star(i) { const n = [659, 784, 1047][i]; this.sfx([{ wave: "triangle", freq: n, decay: 0.28, volume: 0.25 }, { wave: "square", freq: n * 2, decay: 0.12, volume: 0.05 }, { wave: "sine", freq: n * 1.5, at: 0.05, decay: 0.3, volume: 0.13 }], i === 2 ? "success" : "medium"); }
    fanfare() {
        const t = (f, at, d = 0.2) => ({ wave: "square", freq: f, at, decay: d, volume: 0.09 }), b = (f, at) => ({ wave: "triangle", freq: f, at, decay: 0.35, volume: 0.24 });
        this.sfx([t(523, 0), t(659, 0.12), t(784, 0.24), t(1047, 0.36, 0.5), b(131, 0), b(196, 0.24), b(261, 0.36)], "success");
    }
    sad() { this.sfx([{ wave: "triangle", freq: 392, to: 370, decay: 0.25, volume: 0.2 }, { wave: "triangle", freq: 330, at: 0.22, to: 311, decay: 0.25, volume: 0.2 }, { wave: "triangle", freq: 262, at: 0.44, to: 233, decay: 0.55, volume: 0.22 }], "warn"); }
    click() { this.sfx({ wave: "triangle", freq: 660, to: 880, decay: 0.05, volume: 0.13 }); }
    unlock() { this.sfx([{ wave: "square", freq: 523, decay: 0.1, volume: 0.09 }, { wave: "square", freq: 784, at: 0.09, decay: 0.1, volume: 0.09 }, { wave: "square", freq: 1047, at: 0.18, decay: 0.3, volume: 0.1 }, { wave: "triangle", freq: 261, decay: 0.5, volume: 0.25 }], "success"); }
}
