// Sounds and music. Wood on wood is a short pitched thump plus a burst of filtered noise. Heavier pieces sound lower and longer.
export const WEIGHT_PITCH = { p: 520, n: 430, b: 410, r: 330, q: 280, k: 240 };

export function knock(type, strength = 1, dark = false) {
    const f = WEIGHT_PITCH[type] * (dark ? 0.94 : 1.03), v = 0.16 + 0.26 * strength, long = type === "k" || type === "q" ? 0.03 : 0;
    return [
        { wave: "sine", freq: f * 2.1, to: f * 1.5, decay: 0.028, volume: v * 0.5 },
        { wave: "triangle", freq: f, to: f * 0.66, decay: 0.08 + long, volume: v },
        { wave: "sine", freq: f * 0.5, to: f * 0.34, decay: 0.12 + long * 2, volume: v * 0.8 },
        { wave: "noise", freq: 2600, to: 500, decay: 0.03, volume: v * 0.55 },
    ];
}

export const lift = (type) => { const f = WEIGHT_PITCH[type]; return [{ wave: "sine", freq: f * 1.1, to: f * 1.5, decay: 0.05, volume: 0.1 }, { wave: "noise", freq: 1400, to: 3000, decay: 0.03, volume: 0.05 }]; };
export const slide = (dark) => [{ wave: "noise", freq: dark ? 900 : 1300, to: 500, decay: 0.022, volume: 0.05 }];
export const back = (type) => knock(type, 0.3);
export const nope = [{ wave: "triangle", freq: 200, to: 150, decay: 0.09, volume: 0.14 }];
export const select = [{ wave: "sine", freq: 660, to: 880, decay: 0.06, volume: 0.08 }];

export const crack = (mass) => [
    { wave: "noise", freq: 3800, to: 500, decay: 0.05, volume: 0.42 },
    { wave: "square", freq: 190 - mass * 20, to: 70, decay: 0.08, volume: 0.13 },
    { wave: "sine", freq: 150 - mass * 12, to: 46, decay: 0.24, volume: 0.42 },
    { wave: "triangle", freq: 720, to: 300, decay: 0.05, volume: 0.2 },
];
export const trayThud = (strength) => [{ wave: "triangle", freq: 230, to: 120, decay: 0.09, volume: 0.09 + 0.14 * strength }, { wave: "noise", freq: 900, to: 300, decay: 0.05, volume: 0.1 * strength }];
export const check = [
    { wave: "sine", freq: 60, to: 40, decay: 0.3, volume: 0.5 }, { wave: "triangle", freq: 311, decay: 0.42, volume: 0.14, at: 0.03 },
    { wave: "triangle", freq: 466, decay: 0.42, volume: 0.1, at: 0.05 }, { wave: "sine", freq: 55, to: 36, decay: 0.3, volume: 0.44, at: 0.3 },
];
export const heartbeat = [{ wave: "sine", freq: 62, to: 38, decay: 0.16, volume: 0.26 }, { wave: "sine", freq: 54, to: 34, decay: 0.2, volume: 0.2, at: 0.2 }];
export const castle = [{ wave: "triangle", freq: 330, to: 220, decay: 0.09, volume: 0.2 }, { wave: "triangle", freq: 440, to: 300, decay: 0.09, volume: 0.2, at: 0.13 }];
export const promote = [523, 659, 784, 1047, 1319].map((freq, i) => ({ wave: "triangle", freq, decay: 0.34, volume: 0.15, at: i * 0.07 }));
export const hint = [{ wave: "sine", freq: 880, decay: 0.28, volume: 0.1 }, { wave: "sine", freq: 1320, decay: 0.3, volume: 0.08, at: 0.1 }];
export const lowTime = [{ wave: "square", freq: 1400, decay: 0.018, volume: 0.05 }];
export const kingDown = (n) => [
    { wave: "sine", freq: 105 / n, to: 34, decay: 0.55 / n, volume: 0.6 / n }, { wave: "noise", freq: 2200, to: 200, decay: 0.09, volume: 0.35 / n },
    { wave: "triangle", freq: 240, to: 110, decay: 0.16, volume: 0.28 / n },
];
export const victory = [392, 494, 587, 784, 988, 1175].map((freq, i) => ({ wave: "triangle", freq, decay: 0.8, volume: 0.13, at: i * 0.13 }));
export const defeat = [440, 392, 349, 262].map((freq, i) => ({ wave: "triangle", freq, decay: 0.9, volume: 0.13, at: i * 0.3 }));
export const drawn = [{ wave: "triangle", freq: 330, decay: 0.9, volume: 0.13 }, { wave: "triangle", freq: 494, decay: 0.9, volume: 0.1, at: 0.2 }];
export const tick = [{ wave: "sine", freq: 1200, decay: 0.03, volume: 0.05 }];
export const page = [{ wave: "noise", freq: 2600, to: 900, decay: 0.07, volume: 0.1 }];

const CHORD = {
    Am: ["A2", "A3", "C4", "E4", "A4"], F: ["F2", "A3", "C4", "F4", "A4"], C: ["C3", "G3", "C4", "E4", "G4"], G: ["G2", "G3", "B3", "D4", "G4"],
    Dm: ["D3", "A3", "D4", "F4", "A4"], E: ["E2", "G#3", "B3", "E4", "G#4"], Em: ["E3", "G3", "B3", "E4", "G4"], Bb: ["A#2", "A#3", "D4", "F4", "A#4"],
};
/** One bar is eight eighths: a low note, then a slow broken chord, with a melody line on top. */
function fireside(chords, melody) {
    const bass = [], arp = [], mid = [];
    for (const c of chords) {
        const [b, n1, n2, n3, n4] = CHORD[c];
        bass.push(b, "-", "-", "-", "-", "-", "-", "-");
        arp.push("-", n1, n2, n3, n2, n3, n4, n3);
        mid.push(n2, "-", "-", "-", n3, "-", "-", "-");
    }
    return [
        { wave: "sine", notes: bass.join(" "), volume: 0.17, decay: 2.4 },
        { wave: "triangle", notes: arp.join(" "), volume: 0.055, decay: 0.8 },
        { wave: "sine", notes: mid.join(" "), volume: 0.035, decay: 1.8, attack: 0.08 },
        { wave: "triangle", notes: melody, volume: 0.075, decay: 1.5, attack: 0.02 },
    ];
}

export const SONGS = {
    calm: { bpm: 72, steps: 2, tracks: fireside(["Am", "F", "C", "G", "Dm", "Am", "E", "Am"],
        "- - E5 - - - D5 C5 A4 - - - - - - - G4 - - - C5 - E5 - D5 - - - - - B4 - A4 - - - C5 - D5 - E5 - - - - - D5 C5 B4 - - - - - G#4 - A4 - - - - - - -") },
    evening: { bpm: 66, steps: 2, tracks: fireside(["C", "Am", "F", "G", "Em", "Am", "Dm", "G"],
        "E5 - - - G5 - - - E5 - - - C5 - - - A4 - C5 - D5 - - - B4 - - - G4 - - - B4 - - - E5 - - - C5 - - - A4 - - - F4 - A4 - D5 - - - B4 - - - - - - -") },
    tension: { bpm: 84, steps: 2, tracks: [
        { wave: "sine", notes: "A1 - - - A1 - - - A1 - - - A#1 - - - A1 - - - A1 - - - A1 - - - G#1 - - -", volume: 0.24, slide: 0.6, decay: 0.34 },
        { wave: "triangle", notes: "- - E4 - - - F4 - - - E4 - - - D#4 - - - E4 - - - F4 - - - G4 - F4 - E4 -", volume: 0.05, decay: 0.5 },
        { wave: "sine", notes: "A3 - - - - - - - A#3 - - - - - - - A3 - - - - - - - G#3 - - - - - - -", volume: 0.03, decay: 2.2, attack: 0.3 },
    ] },
    win: { bpm: 96, steps: 2, tracks: fireside(["C", "G", "Am", "F", "C", "G", "C", "C"],
        "G4 - C5 - E5 - G5 - G5 - F5 - E5 - D5 - E5 - C5 - A4 - C5 - F5 - - - E5 - D5 - C5 - E5 - G5 - - - D5 - G5 - - - E5 - D5 - C5 - - - - - - - - - - - - - - -") },
    sad: { bpm: 56, steps: 2, tracks: fireside(["Am", "Dm", "E", "Am", "F", "Dm", "E", "Am"],
        "E5 - - - - - - - D5 - - - - - - - B4 - - - G#4 - - - A4 - - - - - - - C5 - - - - - - - A4 - - - F4 - - - E4 - - - G#4 - - - A4 - - - - - - -") },
};
