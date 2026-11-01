// Songs for each mood and a tone for each event, every tone paired with a designed haptic.
const rep = (s, n) => Array(n).fill(s).join(" ");

export const SONGS = {
    // Title and map: a sneaky tiptoe bass with a pizzicato tune, in G minor turning hopeful.
    menu: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: "G2 - D3 - G2 - D3 - Eb2 - Bb2 - Eb2 - Bb2 - C3 - G3 - C3 - G3 - D3 - A3 - D3 - F#3 -" },
        { wave: "triangle", volume: 0.09, decay: 0.16, notes: "G4 - Bb4 D5 - Bb4 G4 - G4 - Bb4 Eb5 - Bb4 G4 - G4 - C5 Eb5 - C5 G4 - A4 - D5 F#5 - D5 A4 -" },
        { wave: "noise", volume: 0.025, decay: 0.03, notes: rep("- C5 - C5", 8) },
    ] },
    // Foraging: busy little marimba, major and cheerful.
    forage: { bpm: 124, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: "C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 - C3 - G3 - A2 - E3 - D3 - A3 - G2 - B2 -" },
        { wave: "sine", volume: 0.1, decay: 0.16, notes: "E5 G5 C6 G5 E5 A5 C6 A5 F5 A5 C6 A5 D5 G5 B5 G5 E5 G5 C6 G5 E5 A5 C6 A5 F5 A5 D6 A5 G5 B5 D6 B5" },
        { wave: "noise", volume: 0.03, decay: 0.03, notes: rep("C5 - - C5", 8) },
    ] },
    // War: minor drums, a march for very small boots.
    war: { bpm: 138, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.07, decay: 0.13, notes: "A1 A1 A2 A1 A1 A2 A1 A1 F1 F1 F2 F1 G1 G1 G2 G1 A1 A1 A2 A1 A1 A2 A1 A1 D2 D2 D3 D2 E2 E2 E3 G#2" },
        { wave: "square", volume: 0.04, decay: 0.2, notes: "A4 - C5 - E5 - D5 C5 F5 - E5 - D5 - B4 - A4 - C5 - E5 - A5 - G5 - F5 E5 D5 - E5 -" },
        { wave: "noise", volume: 0.055, decay: 0.05, notes: rep("C3 - C5 - C3 C3 C5 -", 4) },
    ] },
    // The final fight: same march, worse intentions.
    boss: { bpm: 150, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.08, decay: 0.12, notes: "D2 D2 D3 D2 D2 Eb3 D2 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 D2 D2 D3 D2 D2 Eb3 D2 D2 G1 G1 G2 G1 A1 A1 A2 C#2" },
        { wave: "square", volume: 0.05, decay: 0.2, notes: "D5 - F5 - A5 - Bb5 A5 G5 - F5 - E5 - C#5 - D5 - F5 - A5 - D6 - C#6 - Bb5 A5 G5 - A5 -" },
        { wave: "noise", volume: 0.06, decay: 0.05, notes: rep("C3 C5 C5 - C3 C3 C5 -", 4) },
    ] },
    win: { bpm: 132, steps: 2, tracks: [
        { wave: "triangle", volume: 0.22, decay: 0.3, notes: "C3 - G3 - F3 - C4 - G3 - D4 - C3 - G3 -" },
        { wave: "square", volume: 0.05, decay: 0.25, notes: "E5 G5 C6 - A5 C6 F6 - G5 B5 D6 - G5 C6 E6 -" },
    ] },
    lose: { bpm: 76, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.6, notes: "A2 - - - F2 - - - D2 - - - E2 - - -" },
        { wave: "sine", volume: 0.09, decay: 0.5, notes: "E5 - C5 - A4 - - - F4 - D4 - E4 - - -" },
    ] },
};

export class Sound {
    constructor(game) { this.game = game; this.cool = new Map(); this.now = 0; this.paintV = null; this.rumbleV = null; }
    tick() { this.now++; }
    /** Rate limit by key, so a battle is a roar and not a buzz. */
    ok(k, gap) { const t = this.cool.get(k) ?? -1e3; if (this.now - t < gap) return false; this.cool.set(k, this.now); return true; }
    sfx(t, h) { this.game.sfx(t, h ? { haptic: h } : undefined); }

    /** The painting hiss: a thin rising whisper that follows the thumb. */
    paintSound(on, speed = 0, kind = 2) {
        if (on && !this.paintV) this.paintV = this.game.audio.voice({ wave: "sine", freq: 500, volume: 0 });
        if (!this.paintV) return;
        const base = [660, 330, 495][kind];
        this.paintV.set({ freq: base * (1 + Math.min(1, speed / 26) * 0.5), volume: on ? 0.015 + Math.min(1, speed / 20) * 0.04 : 0 });
    }
    stopPaint() { this.paintV?.set({ volume: 0 }); }
    /** Low surf of bites that swells with the size of the battle. */
    battle(level) {
        if (level > 0.02 && !this.rumbleV) this.rumbleV = this.game.audio.voice({ wave: "sawtooth", freq: 52, volume: 0 });
        this.rumbleV?.set({ freq: 48 + level * 34, volume: Math.min(0.09, level * 0.1) });
    }
    stopAll() { try { this.paintV?.stop(); this.rumbleV?.stop(); } catch { /* audio blocked */ } this.paintV = null; this.rumbleV = null; }

    click() { this.sfx({ wave: "triangle", freq: 660, to: 880, decay: 0.05, volume: 0.16 }, "tick"); }
    trail(kind) { const f = [523, 349, 440][kind] ?? 392; this.sfx([{ wave: "triangle", freq: f, to: f * 1.5, decay: 0.12, volume: 0.22 }, { wave: "sine", freq: f * 2, at: 0.07, decay: 0.16, volume: 0.14 }], kind === 1 ? "medium" : "light"); }
    snap(kind) { const f = [784, 587, 659][kind] ?? 659; this.sfx({ wave: "sine", freq: f, to: f * 1.12, decay: 0.08, volume: 0.15 }, "light"); }
    erase() { this.sfx({ wave: "noise", freq: 1200, to: 300, decay: 0.12, volume: 0.1 }, "tick"); }
    munch() { if (this.ok("munch", 6)) this.sfx({ wave: "square", freq: 900 + this.now % 7 * 40, decay: 0.018, volume: 0.03 }); }
    drop(type) { if (this.ok("drop", 5)) this.sfx({ wave: "sine", freq: [587, 880, 440, 740][type] + this.now % 5 * 20, to: 1100, decay: 0.05, volume: 0.06 }); }
    hatch() { if (this.ok("hatch", 12)) this.sfx({ wave: "sine", freq: 500, to: 950, decay: 0.05, volume: 0.05 }); }
    bite() { if (this.ok("bite", 4)) this.sfx({ wave: "noise", freq: 2400 + this.now % 9 * 150, to: 900, decay: 0.03, volume: 0.09 }); }
    death() { if (this.ok("die", 5)) this.sfx({ wave: "square", freq: 340 + this.now % 6 * 30, to: 110, decay: 0.05, volume: 0.05 }); }
    spit() { if (this.ok("spit", 6)) this.sfx({ wave: "sine", freq: 300, to: 900, decay: 0.07, volume: 0.07 }); }
    splash() { if (this.ok("spl", 6)) this.sfx({ wave: "noise", freq: 700, to: 200, decay: 0.08, volume: 0.07 }); }
    chomp() { if (this.ok("chomp", 8)) this.sfx([{ wave: "square", freq: 150, to: 70, decay: 0.08, volume: 0.14 }, { wave: "noise", freq: 900, to: 300, decay: 0.05, volume: 0.1 }], "light"); }
    warn() { this.sfx([{ wave: "square", freq: 740, decay: 0.09, volume: 0.09 }, { wave: "square", freq: 554, at: 0.14, decay: 0.12, volume: 0.09 }], "warn"); }
    siren() { this.sfx([0, 0.22].map((at) => ({ wave: "sawtooth", freq: 420, to: 760, at, decay: 0.18, volume: 0.07 })), "error"); }
    looming() { this.sfx([{ wave: "sine", freq: 70, to: 150, attack: 0.5, decay: 0.8, volume: 0.28 }, { wave: "noise", freq: 200, to: 500, attack: 0.5, decay: 0.8, volume: 0.05 }], "warn"); }
    slam() { this.sfx([{ wave: "sine", freq: 110, to: 34, decay: 0.42, volume: 0.5 }, { wave: "noise", freq: 400, to: 60, decay: 0.3, volume: 0.32 }, { wave: "square", freq: 70, to: 40, decay: 0.16, volume: 0.16 }], "heavy"); }
    stomp() { this.sfx([{ wave: "sine", freq: 86, to: 28, decay: 0.5, volume: 0.55 }, { wave: "noise", freq: 260, to: 50, decay: 0.26, volume: 0.28 }], "heavy"); }
    build() { this.sfx([523, 659, 784, 1047].map((f, i) => ({ wave: "triangle", freq: f, at: i * 0.07, decay: 0.16, volume: 0.17 })), "success"); }
    denied() { this.sfx({ wave: "square", freq: 180, to: 130, decay: 0.12, volume: 0.09 }, "tick"); }
    focus(c) { this.sfx({ wave: "triangle", freq: 440 + c * 90, to: 660 + c * 90, decay: 0.09, volume: 0.17 }, "light"); }
    queen(mine) { this.sfx(mine ? [{ wave: "sawtooth", freq: 300, to: 50, decay: 1, volume: 0.25 }] : [392, 523, 659, 784, 1047].map((f, i) => ({ wave: "square", freq: f, at: i * 0.08, decay: 0.2, volume: 0.1 })), mine ? "error" : "success"); }
    critter() { this.sfx([{ wave: "sawtooth", freq: 240, to: 50, decay: 0.5, volume: 0.17 }, { wave: "noise", freq: 700, to: 100, decay: 0.3, volume: 0.13 }], "heavy"); }
    star(i) { this.sfx({ wave: "triangle", freq: [784, 988, 1319][i], decay: 0.3, volume: 0.26 }, "medium"); }
}
