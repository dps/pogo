// Quiet, musical, and made to loop for a long time. Each mood is a real chord progression; each sweep plays up a pentatonic ladder in the key of the music.
const rep = (s, n) => Array(n).fill(s).join(" ");
export const SONGS = {
    // Night on the patch: a lullaby in F. F, Am, Bb, C over slow plucked arpeggios.
    night: { bpm: 72, steps: 2, tracks: [
        { wave: "sine", volume: 0.16, decay: 1.1, notes: "F2 - - - - - C3 - A2 - - - - - E3 - A#2 - - - - - F3 - C3 - - - - - G3 - F2 - - - - - C3 - D3 - - - - - A3 - A#2 - - - - - F3 - C3 - - - - - E3 -" },
        { wave: "triangle", volume: 0.07, decay: 0.8, notes: "F4 A4 C5 A4 F4 - - - E4 A4 C5 A4 E4 - - - F4 A#4 D5 A#4 F4 - - - G4 C5 E5 C5 G4 - - - F4 A4 C5 F5 C5 A4 - - D4 F4 A4 D5 A4 F4 - - F4 A#4 D5 F5 D5 A#4 - - E4 G4 C5 E5 G5 E5 - -" },
        { wave: "sine", volume: 0.05, decay: 1.4, notes: "- - - - C6 - - - - - - - A5 - - - - - - - A#5 - - - - - - - G5 - - - - - - - C6 - D6 - - - - - A5 - - - - - - - F6 - - - - - - - E6 - - -" },
    ] },
    // Day at the stall: a lilting walk in C. C, F, Am, G.
    day: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.15, decay: 0.45, notes: "C3 - G3 - E3 - G3 - F2 - C3 - A2 - C3 - A2 - E3 - C3 - E3 - G2 - D3 - B2 - D3 -" },
        { wave: "triangle", volume: 0.07, decay: 0.34, notes: "E5 G5 C6 G5 E5 - D5 E5 F5 A5 C6 A5 F5 - E5 F5 E5 A5 C6 A5 E5 - D5 C5 D5 G5 B5 G5 D5 - G4 B4" },
        { wave: "noise", volume: 0.012, decay: 0.03, notes: rep("- - C6 -", 8) },
    ] },
    // The lake: open fifths and a lot of space, in D minor.
    pond: { bpm: 60, steps: 2, tracks: [
        { wave: "sine", volume: 0.15, decay: 1.8, notes: "D2 - - - - - - - A#1 - - - - - - - F2 - - - - - - - C2 - - - - - - -" },
        { wave: "sine", volume: 0.06, decay: 1.5, notes: "A4 - - - F4 - - - A#4 - - - D5 - - - C5 - - - A4 - - - G4 - - - E4 - - -" },
    ] },
    // The kitchen: a little music box in G.
    kitchen: { bpm: 108, steps: 2, tracks: [
        { wave: "sine", volume: 0.13, decay: 0.5, notes: "G2 - D3 - G2 - D3 - C3 - G3 - C3 - G3 - E3 - B3 - E3 - B3 - D3 - A3 - D3 - F#3 -" },
        { wave: "sine", volume: 0.07, decay: 0.6, notes: "B5 D6 G6 D6 B5 - - - C6 E6 G6 E6 C6 - - - B5 E6 G6 E6 B5 - - - A5 D6 F#6 D6 A5 - - -" },
    ] },
    // The ending: the night tune, slower, resolving each phrase upward.
    finale: { bpm: 54, steps: 2, tracks: [
        { wave: "sine", volume: 0.18, decay: 2.2, notes: "F2 - - - C3 - - - D3 - - - A2 - - - A#2 - - - F3 - - - C3 - - - C3 - - -" },
        { wave: "triangle", volume: 0.08, decay: 1.6, notes: "A4 - C5 - F5 - - - F4 - A4 - D5 - - - D4 - F4 - A#4 - - - G4 - C5 - E5 - F5 -" },
    ] },
};
// F major pentatonic, matching the night song.
const LADDER = [349.2, 392, 440, 523.3, 587.3, 698.5, 784, 880, 1046.5, 1174.7, 1396.9, 1568];
const note = (i) => LADDER[Math.min(LADDER.length - 1, i)];

export class Sound {
    constructor(game) { this.game = game; this.now = 0; this.cool = new Map(); this.current = null; this.waterVoice = null; }
    tick() { this.now++; }
    ok(k, gap) { const t = this.cool.get(k) ?? -1e3; if (this.now - t < gap) return false; this.cool.set(k, this.now); return true; }
    play(t, haptic) { this.game.sfx(t, haptic ? { haptic } : undefined); }
    song(name) { if (this.current === name) return; this.current = name; try { this.game.music(SONGS[name]); } catch { /* blocked audio never matters */ } }
    till(n) { const f = 110 + n * 8; this.play([{ wave: "triangle", freq: f * 1.8, to: f * 0.8, decay: 0.09, volume: 0.24 }, { wave: "noise", freq: 700, to: 200, decay: 0.07, volume: 0.1 }, { wave: "sine", freq: note(n), decay: 0.12, volume: 0.04 }], "tick"); }
    plant(n) { const f = note(n); this.play([{ wave: "triangle", freq: f, decay: 0.14, volume: 0.13 }, { wave: "sine", freq: f * 2, at: 0.02, decay: 0.1, volume: 0.05 }, { wave: "noise", freq: 2600, to: 1500, decay: 0.02, volume: 0.03 }], "tick"); }
    water(n) { const f = note(n); this.play([{ wave: "sine", freq: f * 1.5, to: f * 2.2, decay: 0.09, volume: 0.1 }, { wave: "noise", freq: 3200, to: 1800, decay: 0.08, volume: 0.035 }, { wave: "sine", freq: f, at: 0.05, to: f * 1.5, decay: 0.08, volume: 0.05 }], "tick"); }
    /** The pop: a quick upward blip and a sparkle on top, climbing the ladder across a sweep. */
    pop(n, shining) { const f = note(n); this.play([{ wave: "sine", freq: f * 0.5, to: f * 1.6, decay: 0.06, volume: 0.32 }, { wave: "triangle", freq: f * 2, at: 0.03, decay: 0.16, volume: 0.13 }, ...(shining ? [{ wave: "sine", freq: f * 4, at: 0.06, decay: 0.2, volume: 0.05 }] : [])], "light"); }
    chord(n) { const b = [349.2, 440, 523.3, 698.5]; this.play(b.map((f, i) => ({ wave: "triangle", freq: f, at: i * 0.05, decay: 0.5, volume: 0.08 + Math.min(n, 8) * 0.005 })), n >= 6 ? "success" : "light"); }
    deny() { if (this.ok("deny", 12)) this.play({ wave: "sine", freq: 220, to: 196, decay: 0.12, volume: 0.1 }); }
    relic() { this.play([587, 784, 1175].map((f, i) => ({ wave: "sine", freq: f, at: i * 0.08, decay: 0.4, volume: 0.11 })), "success"); }
    coin(n = 0) { if (!this.ok("coin", 2)) return; const f = 1319 + (n % 5) * 110; this.play([{ wave: "square", freq: f, decay: 0.05, volume: 0.03 }, { wave: "sine", freq: f * 1.5, at: 0.04, decay: 0.16, volume: 0.09 }], "tick"); }
    click() { this.play({ wave: "triangle", freq: 660, to: 880, decay: 0.05, volume: 0.1 }); }
    page() { this.play({ wave: "noise", freq: 1800, to: 900, decay: 0.07, volume: 0.04 }, "tick"); }
    type() { if (this.ok("type", 3)) this.play({ wave: "sine", freq: 520 + (this.now * 37) % 90, decay: 0.03, volume: 0.025 }); }
    chime() { this.play([{ wave: "sine", freq: 880, decay: 0.5, volume: 0.1 }, { wave: "sine", freq: 1319, at: 0.09, decay: 0.6, volume: 0.09 }, { wave: "sine", freq: 1760, at: 0.2, decay: 0.8, volume: 0.06 }], "medium"); }
    heart() { this.play([{ wave: "sine", freq: 659, decay: 0.2, volume: 0.13 }, { wave: "sine", freq: 880, at: 0.1, decay: 0.3, volume: 0.13 }, { wave: "sine", freq: 1319, at: 0.2, decay: 0.45, volume: 0.1 }], "success"); }
    dawn() { const c = [262, 330, 392, 523, 659]; this.play(c.map((f, i) => ({ wave: "triangle", freq: f, at: i * 0.16, attack: 0.05, decay: 0.8, volume: 0.09 })), "medium"); }
    dusk() { const c = [698, 523, 440, 349]; this.play(c.map((f, i) => ({ wave: "sine", freq: f, at: i * 0.18, attack: 0.04, decay: 0.8, volume: 0.09 })), "light"); }
    grow(n) { if (this.ok("grow", 2)) this.play({ wave: "sine", freq: note(n) * 0.5, to: note(n), decay: 0.12, volume: 0.07 }); }
    ripe(n) { if (this.ok("ripe", 2)) { const f = note(n + 2); this.play([{ wave: "sine", freq: f * 2, decay: 0.3, volume: 0.05 }], "tick"); } }
    hybrid() { const c = [523, 659, 784, 1047, 1319, 1568]; this.play(c.map((f, i) => ({ wave: "sine", freq: f, at: i * 0.09, decay: 0.9, volume: 0.09 })), "success"); }
    plop() { this.play([{ wave: "sine", freq: 300, to: 110, decay: 0.14, volume: 0.25 }, { wave: "noise", freq: 900, to: 400, decay: 0.08, volume: 0.06 }], "light"); }
    cast() { this.play({ wave: "noise", freq: 1400, to: 3000, decay: 0.2, volume: 0.05 }, "tick"); }
    bite() { this.play([{ wave: "sine", freq: 880, decay: 0.1, volume: 0.17 }, { wave: "sine", freq: 1175, at: 0.07, decay: 0.16, volume: 0.15 }], "medium"); }
    reel(k) { if (this.ok("reel", 4)) this.play({ wave: "triangle", freq: 400 + k * 500, decay: 0.03, volume: 0.05 }, "tick"); }
    caught(big) { const c = big ? [349, 440, 523, 698, 880, 1047] : [523, 659, 784]; this.play(c.map((f, i) => ({ wave: "triangle", freq: f, at: i * 0.07, decay: 0.45, volume: 0.1 })), big ? "success" : "medium"); }
    slipped() { this.play({ wave: "sine", freq: 440, to: 262, decay: 0.3, volume: 0.1 }, "light"); }
    bubble() { if (this.ok("bub", 7)) { const f = 180 + this.now * 47 % 160; this.play({ wave: "sine", freq: f, to: f * 2.1, decay: 0.05, volume: 0.05 }); } }
    stir(k) { if (this.ok("stir", 5)) this.play([{ wave: "sine", freq: 150 + k * 170, to: 220 + k * 200, decay: 0.08, volume: 0.13 }, { wave: "noise", freq: 500, to: 300, decay: 0.05, volume: 0.02 }], "tick"); }
    cooked(good) { const c = good ? [392, 494, 587, 784, 988] : [294, 247]; this.play(c.map((f, i) => ({ wave: "sine", freq: f, at: i * 0.08, decay: 0.5, volume: 0.11 })), good ? "success" : "light"); }
    build() { this.play([{ wave: "triangle", freq: 180, to: 90, decay: 0.1, volume: 0.25 }, { wave: "noise", freq: 800, to: 200, decay: 0.07, volume: 0.09 }, { wave: "triangle", freq: 200, at: 0.14, to: 100, decay: 0.1, volume: 0.25 }, { wave: "sine", freq: 784, at: 0.26, decay: 0.5, volume: 0.1 }, { wave: "sine", freq: 1175, at: 0.34, decay: 0.6, volume: 0.09 }], "medium"); }
}
