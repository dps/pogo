// DEEP TROUBLE soundtrack: four loops that sink a key and speed up as the dive goes on.
const rep = (s, n) => Array(n).fill(s).join(" ");

export const SONGS = [
    // Sunlit Shallows: a bouncy shanty in C.
    { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.26, notes: "C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 B2" },
        { wave: "square", volume: 0.055, notes: "E5 G5 A5 - G5 E5 D5 - C5 - D5 E5 - - - - A4 C5 D5 - C5 A4 G4 - A4 - C5 D5 - G4 A4 C5 -" },
        { wave: "sine", volume: 0.1, notes: "C5 E5 G5 E5 C5 E5 G5 E5 A4 C5 E5 C5 A4 C5 E5 C5 F4 A4 C5 A4 F4 A4 C5 A4 G4 B4 D5 B4 G4 B4 D5 B4" },
    ] },
    // Twilight Drop: A minor, a little worried.
    { bpm: 126, steps: 2, tracks: [
        { wave: "triangle", volume: 0.28, notes: "A2 A2 - A2 E3 - A2 - F2 F2 - F2 C3 - F2 - D2 D2 - D2 A2 - D2 - E2 E2 - E2 B2 - G#2 -" },
        { wave: "square", volume: 0.05, notes: "A4 - C5 E5 - D5 C5 - A4 - C5 F5 - E5 C5 - D5 - F5 A5 - G5 F5 - E5 - G#5 B5 - - - -" },
        { wave: "sine", volume: 0.1, notes: "E5 A5 C6 A5 E5 A5 C6 A5 F5 A5 C6 A5 F5 A5 C6 A5 D5 F5 A5 F5 D5 F5 A5 F5 E5 G#5 B5 G#5 E5 G#5 B5 G#5" },
    ] },
    // Midnight Reef and the Abyss: D minor, sixteenth-note bass, no mercy.
    { bpm: 138, steps: 4, tracks: [
        { wave: "sawtooth", volume: 0.09, notes: `${rep("D2 D2 D3 D2", 4)} ${rep("Bb1 Bb1 Bb2 Bb1", 2)} ${rep("C2 C2 C3 C2", 2)}` },
        { wave: "triangle", volume: 0.26, notes: `${rep("D2 - - - D2 - - - D2 - - - - - - -", 2)} ${rep("Bb1 - - - Bb1 - - - C2 - - - C2 - - -", 2)}`},
        { wave: "square", volume: 0.05, notes: "D5 - - - A4 - - - D5 - F5 - E5 - - - D5 - - - A4 - - - C5 - Bb4 - A4 - - - Bb4 - - - D5 - - - F5 - - - E5 - D5 - C5 - - - E5 - - - G5 - - - A5 - - - - - - -" },
    ] },
    // The Trench: the boss. Tritones and a heartbeat.
    { bpm: 160, steps: 4, tracks: [
        { wave: "sawtooth", volume: 0.1, notes: `${rep("E2 E2 E3 E2 E2 E3 E2 E2", 2)} ${rep("F2 F2 F3 F2 F2 F3 F2 F2", 1)} ${rep("A#1 A#1 A#2 A#1 A#1 A#2 A#1 A#1", 1)}` },
        { wave: "square", volume: 0.055, notes: "E5 - E5 - B4 - E5 - F5 - - - E5 - - - E5 - E5 - B4 - G5 - A#5 - - - A5 - - - F5 - F5 - C5 - F5 - G5 - - - F5 - - - A#4 - E5 - A#4 - E5 - F5 - E5 - D#5 - B4 -" },
        { wave: "triangle", volume: 0.3, notes: rep("E1 - - E1 - - - - E1 - - - - - - -", 4) },
    ] },
];
