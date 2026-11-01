// Every sound. All music sits on C major family chords, so the rising tap ladder always fits whatever is playing.
const rep = (s, n) => Array(n).fill(s).join(" ");
const SCALE = [0, 2, 4, 7, 9];
const hz = (semi) => 261.63 * 2 ** (semi / 12);
/** A rung of the pentatonic ladder: rung 0 is middle C. */
const rung = (n) => hz(SCALE[((n % 5) + 5) % 5] + 12 * Math.floor(n / 5));

export const SONGS = [
    // The Driveway: a sunny bossa on a Saturday morning.
    { bpm: 104, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.32, notes: "C3 - - G2 - C3 - - A2 - - E3 - A2 - - F2 - - C3 - F2 - - G2 - - D3 - G2 - -" },
        { wave: "sine", volume: 0.09, decay: 0.3, notes: "- E5 G5 - C5 - E5 - - C5 E5 - A4 - C5 - - A4 C5 - F4 - A4 - - B4 D5 - G4 - B4 -" },
        { wave: "noise", volume: 0.014, decay: 0.03, notes: rep("C6 - C6 C6", 8) },
    ] },
    // Main Street: a strolling small-town shuffle.
    { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.21, decay: 0.2, notes: "C3 - E3 - G3 - E3 - F2 - A2 - C3 - A2 - G2 - B2 - D3 - B2 - C3 - G2 - C3 - - -" },
        { wave: "square", volume: 0.028, decay: 0.16, notes: "G5 - E5 G5 - E5 C5 - A5 - F5 A5 - F5 C5 - B5 - G5 B5 - G5 D5 - C6 - G5 E5 - C5 - -" },
        { wave: "sine", volume: 0.1, slide: 0.5, decay: 0.12, notes: rep("C3 - - - - - C3 -", 4) },
        { wave: "noise", volume: 0.02, decay: 0.03, notes: rep("- - C6 -", 8) },
    ] },
    // The Planet: wide and bright, with a marching bass.
    { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.21, decay: 0.45, notes: "A2 - A2 E3 - A2 - - F2 - F2 C3 - F2 - - C3 - C3 G3 - C3 - - G2 - G2 D3 - G2 - -" },
        { wave: "sine", volume: 0.1, decay: 0.6, notes: "E5 - A5 - C6 - - - C5 - F5 - A5 - - - E5 - G5 - C6 - - - D5 - G5 - B5 - - -" },
        { wave: "sine", volume: 0.1, slide: 0.5, decay: 0.14, notes: rep("C3 - - C3 - - - -", 4) },
    ] },
    // The Solar System: lounge in zero gravity.
    { bpm: 88, steps: 2, tracks: [
        { wave: "sine", volume: 0.22, decay: 0.5, notes: "D3 - - A3 - - D3 - G2 - - D3 - - G2 - C3 - - G3 - - C3 - A2 - - E3 - - A2 -" },
        { wave: "triangle", volume: 0.08, decay: 0.8, notes: "F5 - A5 - C6 - - - F5 - B5 - D6 - - - E5 - G5 - C6 - - - E5 - A5 - C6 - - -" },
        { wave: "noise", volume: 0.012, decay: 0.05, notes: rep("- C6 - -", 8) },
    ] },
    // The Galaxy: slow pads, big space.
    { bpm: 72, steps: 2, tracks: [
        { wave: "sine", volume: 0.22, decay: 1.1, notes: "A2 - - - - - E3 - F2 - - - - - C3 - D3 - - - - - A3 - E3 - - - - - B2 -" },
        { wave: "triangle", volume: 0.07, decay: 1.2, attack: 0.08, notes: "C5 - - E5 - - A5 - A4 - - C5 - - F5 - D5 - - F5 - - A5 - B4 - - E5 - - G5 -" },
    ] },
    // The Abstract: the first song, remembered wrong.
    { bpm: 84, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.42, notes: "C3 - - G2 - C3 - - A2 - - E3 - A2 - - F2 - - C3 - F2 - - G2 - - D3 - G2 - -" },
        { wave: "sine", volume: 0.09, decay: 0.8, notes: "- E6 - - C5 - - - - C6 - - A4 - - - - A5 - - F4 - - - - B5 - - G4 - - -" },
    ] },
];
/** The end: just the first tune, slowly. */
export const ENDING = { bpm: 72, steps: 2, tracks: [
    { wave: "triangle", volume: 0.2, decay: 0.7, notes: "C3 - - G2 - C3 - - A2 - - E3 - A2 - - F2 - - C3 - F2 - - G2 - - D3 - G2 - -" },
    { wave: "sine", volume: 0.12, decay: 0.7, notes: "- E5 G5 - C5 - E5 - - C5 E5 - A4 - C5 - - A4 C5 - F4 - A4 - - B4 D5 - G4 - B4 -" },
] };
export const FRENZY_SONG = { bpm: 150, steps: 2, tracks: [
    { wave: "triangle", volume: 0.22, decay: 0.14, notes: "C3 C3 G3 C3 - C3 G3 C3 F2 F2 C3 F2 - F2 C3 F2 G2 G2 D3 G2 - G2 D3 G2 C3 G3 C3 G3 C3 E3 G3 C4" },
    { wave: "square", volume: 0.03, decay: 0.12, notes: "E5 G5 C6 G5 E5 G5 C6 G5 F5 A5 C6 A5 F5 A5 C6 A5 G5 B5 D6 B5 G5 B5 D6 B5 C6 E6 G6 E6 C6 G5 E5 C5" },
    { wave: "sine", volume: 0.13, slide: 0.5, decay: 0.1, notes: rep("C3 - - - C3 - - -", 4) },
    { wave: "noise", volume: 0.03, decay: 0.03, notes: rep("C6 C6 C4 C6", 8) },
] };

export function makeAudio(game) {
    const sfx = (t, h) => game.sfx(t, h ? { haptic: h } : undefined);
    return {
        /** The tap. Pitch climbs a pentatonic ladder as the streak grows, and tops out high and bright. */
        tap(streak, frenzy) {
            const n = Math.min(streak, 34) + (frenzy ? 6 : 0), f = rung(n);
            sfx([
                { wave: "sine", freq: f * 2.8, to: f * 1.3, attack: 0.001, decay: 0.05, volume: 0.1 },
                { wave: "triangle", freq: f, to: f * 1.5, attack: 0.002, decay: 0.11, volume: 0.15 },
                { wave: "noise", freq: 3000, attack: 0.001, decay: 0.018, volume: 0.05 },
            ]);
        },
        sold(streak) {
            const f = rung(10 + Math.min(streak, 20) >> 1);
            sfx([
                { wave: "noise", freq: 900, attack: 0.001, decay: 0.05, volume: 0.1 },
                { wave: "square", freq: 1318, attack: 0.002, decay: 0.07, volume: 0.05, at: 0 },
                { wave: "square", freq: 1760, attack: 0.002, decay: 0.2, volume: 0.05, at: 0.07 },
                { wave: "triangle", freq: f, attack: 0.002, decay: 0.2, volume: 0.1, at: 0.02 },
                { wave: "sine", freq: 110, to: 60, attack: 0.002, decay: 0.12, volume: 0.2 },
            ], "light");
        },
        tier(n) { const b = 12 + n * 2; sfx([0, 1, 2].map((i) => ({ wave: "triangle", freq: rung(b + i * 2), attack: 0.002, decay: 0.16, volume: 0.1, at: i * 0.05 })), "medium"); },
        perfect(p) { const f = rung(12 + p); sfx([{ wave: "sine", freq: f * 2, to: f * 2.02, attack: 0.002, decay: 0.3, volume: 0.1 }, { wave: "triangle", freq: f, attack: 0.002, decay: 0.2, volume: 0.1 }], "light"); },
        buy() { sfx([{ wave: "triangle", freq: 660, to: 880, attack: 0.002, decay: 0.08, volume: 0.13 }, { wave: "sine", freq: 1320, attack: 0.002, decay: 0.08, volume: 0.05, at: 0.05 }], "light"); },
        no() { sfx({ wave: "triangle", freq: 170, to: 130, attack: 0.002, decay: 0.09, volume: 0.1 }, "tick"); },
        ui() { sfx({ wave: "sine", freq: 880, to: 1100, attack: 0.002, decay: 0.05, volume: 0.07 }, "tick"); },
        up() { sfx([523, 784, 1046].map((f, i) => ({ wave: "triangle", freq: f, attack: 0.002, decay: 0.12, volume: 0.11, at: i * 0.05 })), "medium"); },
        milestone() { sfx([{ wave: "sine", freq: 90, to: 50, attack: 0.002, decay: 0.14, volume: 0.22 }, { wave: "noise", freq: 500, attack: 0.001, decay: 0.05, volume: 0.1 }, ...[784, 1046, 1318, 1568].map((f, i) => ({ wave: "triangle", freq: f, attack: 0.002, decay: 0.22, volume: 0.1, at: 0.05 + i * 0.06 }))], "success"); },
        whoosh() { sfx([{ wave: "noise", freq: 400, to: 3000, attack: 0.25, decay: 0.7, volume: 0.09 }, { wave: "sine", freq: 130, to: 520, attack: 0.1, decay: 0.75, volume: 0.1 }, ...[523, 659, 784, 1046].map((f, i) => ({ wave: "triangle", freq: f, attack: 0.01, decay: 0.3, volume: 0.09, at: 0.45 + i * 0.07 }))], "heavy"); },
        door() { sfx([{ wave: "sine", freq: 1568, attack: 0.002, decay: 0.3, volume: 0.1 }, { wave: "sine", freq: 1174, attack: 0.002, decay: 0.45, volume: 0.09, at: 0.13 }], "tick"); },
        counter() { sfx({ wave: "square", freq: 330, to: 495, attack: 0.002, decay: 0.09, volume: 0.05 }, "medium"); },
        walk() { sfx([{ wave: "triangle", freq: 330, to: 110, attack: 0.002, decay: 0.3, volume: 0.13 }], "warn"); },
        deal() { sfx([523, 659, 784, 1046, 1318].map((f, i) => ({ wave: "triangle", freq: f, attack: 0.002, decay: 0.14, volume: 0.11, at: i * 0.045 })), "success"); },
        sticker() { sfx([1046, 1318, 1568, 2093].map((f, i) => ({ wave: "sine", freq: f, attack: 0.002, decay: 0.16, volume: 0.09, at: i * 0.04 })), "medium"); },
        siren() { sfx([0, 1, 2, 3].map((i) => ({ wave: "square", freq: i % 2 ? 660 : 880, attack: 0.005, decay: 0.12, volume: 0.05, at: i * 0.12 })), "heavy"); },
        war() { sfx([{ wave: "sawtooth", freq: 110, to: 220, attack: 0.01, decay: 0.3, volume: 0.07 }, { wave: "square", freq: 220, attack: 0.002, decay: 0.2, volume: 0.04, at: 0.15 }], "heavy"); },
        hole() { sfx([{ wave: "sine", freq: 420, to: 40, attack: 0.01, decay: 0.6, volume: 0.2 }, { wave: "noise", freq: 200, to: 80, attack: 0.05, decay: 0.5, volume: 0.1 }], "heavy"); },
        stamp() { sfx([{ wave: "sine", freq: 120, to: 50, attack: 0.002, decay: 0.15, volume: 0.25 }, { wave: "noise", freq: 400, attack: 0.001, decay: 0.05, volume: 0.13 }], "heavy"); },
        fanfare() { sfx([392, 523, 659, 784, 1046, 784, 1046, 1318].map((f, i) => ({ wave: "triangle", freq: f, attack: 0.005, decay: 0.3, volume: 0.12, at: i * 0.11 })), "success"); },
        day() { sfx({ wave: "sine", freq: 660, attack: 0.002, decay: 0.2, volume: 0.06 }, "tick"); },
    };
}
