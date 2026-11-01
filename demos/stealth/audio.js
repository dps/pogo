// CAT BURGLAR. Late-night jazz for a cat with no respect for property, and a sound for every small crime.
const bars = (...b) => b.join(" ");

export const SONGS = {
    // Cm7 Ab7 Fm7 G7, a slow walk down a corridor at 3am.
    prowl: { bpm: 84, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.42, notes: bars("C2 - G2 - Bb2 - G2 -", "Ab1 - Eb2 - Gb2 - Eb2 -", "F2 - C2 - Ab2 - C3 -", "G1 - D2 - F2 - B1 -") },
        { wave: "sine", volume: 0.075, decay: 1.1, notes: bars("- Eb4 - - - - G4 -", "- C4 - - - - Gb4 -", "- Ab3 - - - - Eb4 -", "- B3 - - - - F4 -") },
        { wave: "sine", volume: 0.06, decay: 1.1, notes: bars("- Bb4 - - - - - -", "- Eb4 - - - - - -", "- C4 - - - - - -", "- D4 - - - - - -") },
        { wave: "noise", volume: 0.022, decay: 0.05, notes: bars("C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4") },
        { wave: "triangle", volume: 0.065, decay: 1.6, notes: bars("- - - - - - - -", "G5 - - Eb5 - - - -", "- - - - - - - -", "F5 - D5 - B4 - - -") },
    ] },
    // Suspicion: the same walk, faster and in a hurry to be somewhere else.
    chase: { bpm: 138, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.07, decay: 0.16, notes: bars("C2 C2 Eb2 C2 G2 C2 Bb1 C2", "C2 C2 Eb2 C2 Gb2 F2 Eb2 D2") },
        { wave: "square", volume: 0.03, decay: 0.12, notes: bars("C4 - - Eb4 - - G4 -", "- Gb4 - F4 - Eb4 - D4") },
        { wave: "noise", volume: 0.05, decay: 0.05, notes: bars("C4 - C4 - C4 - C4 C4", "C4 - C4 - C4 - C4 C4") },
        { wave: "sine", volume: 0.2, decay: 0.14, slide: 0.5, notes: bars("C3 - - - C3 - - -", "C3 - - - C3 - C3 -") },
    ] },
    // Moon over the rooftops.
    title: { bpm: 72, steps: 2, tracks: [
        { wave: "triangle", volume: 0.17, decay: 0.8, notes: bars("C2 - - - G1 - - -", "Ab1 - - - Eb2 - - -", "F1 - - - C2 - - -", "G1 - - - D2 - B1 -") },
        { wave: "sine", volume: 0.07, decay: 1.8, notes: bars("Eb4 - - G4 - - Bb4 -", "C4 - - Eb4 - - Gb4 -", "Ab3 - - C4 - - Eb4 -", "B3 - - D4 - - F4 -") },
        { wave: "triangle", volume: 0.075, decay: 1.9, notes: bars("G5 - - - - Eb5 - D5", "Eb5 - C5 - - - - -", "C5 - - Ab4 - - C5 -", "D5 - - - B4 - - -") },
        { wave: "noise", volume: 0.014, decay: 0.06, notes: bars("- - C4 - - - C4 -", "- - C4 - - - C4 -", "- - C4 - - - C4 -", "- - C4 - - - C4 -") },
    ] },
    // Rank screen: he knows exactly how good that was.
    smug: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.19, decay: 0.34, notes: bars("Eb2 - G2 - Bb2 - G2 -", "C2 - Eb2 - G2 - Bb1 -", "F2 - Ab2 - C3 - Ab2 -", "Bb1 - D2 - F2 - Ab2 -") },
        { wave: "sine", volume: 0.07, decay: 0.7, notes: bars("- G4 - - Bb4 - - -", "- G4 - - Eb5 - - -", "- Ab4 - - C5 - - -", "- Ab4 - - D5 - - -") },
        { wave: "triangle", volume: 0.08, decay: 0.8, notes: bars("Bb5 - G5 - - Eb5 - -", "G5 - - - - - C5 -", "C6 - Ab5 - - F5 - -", "F5 - D5 - Bb4 - - -") },
        { wave: "noise", volume: 0.02, decay: 0.04, notes: bars("C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4", "C4 - C4 C4 C4 - C4 C4") },
    ] },
    shop: { bpm: 80, steps: 2, tracks: [
        { wave: "triangle", volume: 0.16, decay: 0.5, notes: bars("F2 - - C2 - - F2 -", "Bb1 - - F2 - - Bb1 -", "G2 - - D2 - - G2 -", "C2 - - G1 - - C2 -") },
        { wave: "sine", volume: 0.06, decay: 1.1, notes: bars("- A4 - C5 - - - -", "- Bb4 - D5 - - - -", "- Bb4 - D5 - - - -", "- Bb4 - E5 - - - -") },
        { wave: "noise", volume: 0.015, decay: 0.05, notes: bars("- - C4 - - - C4 -", "- - C4 - - - C4 -", "- - C4 - - - C4 -", "- - C4 - - - C4 -") },
    ] },
};

const n = (wave, freq, to, decay, volume, at = 0, attack = 0.004) => ({ wave, freq, to, decay, volume, at, attack });
export const SFX = {
    pat: n("sine", 880, 700, 0.05, 0.1),
    tipGlass: [n("triangle", 1500, 1500, 0.1, 0.05), n("triangle", 1720, 1720, 0.12, 0.04, 0.05)],
    fall: n("sine", 900, 240, 0.34, 0.08),
    smash: [n("noise", 3400, 700, 0.42, 0.34), n("triangle", 2400, 900, 0.16, 0.14), n("triangle", 3200, 1400, 0.12, 0.1, 0.05), n("triangle", 1900, 1100, 0.2, 0.07, 0.11), n("sine", 130, 44, 0.3, 0.42)],
    leap: n("sine", 260, 620, 0.14, 0.09),
    land: n("sine", 170, 80, 0.09, 0.14),
    run: n("noise", 500, 200, 0.05, 0.04),
    creak: [n("sawtooth", 150, 96, 0.28, 0.1), n("sawtooth", 210, 120, 0.2, 0.05, 0.08)],
    vent: [n("square", 300, 180, 0.07, 0.05), n("noise", 1400, 500, 0.2, 0.08, 0.03)],
    ventOut: [n("noise", 1400, 600, 0.12, 0.08), n("square", 220, 340, 0.06, 0.05, 0.05)],
    boxIn: n("noise", 400, 150, 0.12, 0.14),
    boxOut: n("noise", 700, 280, 0.1, 0.1),
    boxShuffle: n("noise", 340, 180, 0.09, 0.06),
    grab: [n("triangle", 523, 523, 0.14, 0.14), n("triangle", 659, 659, 0.14, 0.14, 0.09), n("triangle", 784, 784, 0.14, 0.14, 0.18), n("triangle", 1047, 1047, 0.34, 0.16, 0.27)],
    loot: [n("triangle", 880, 880, 0.08, 0.12), n("triangle", 1319, 1319, 0.2, 0.12, 0.07)],
    huh: [n("triangle", 330, 494, 0.16, 0.13)],
    check: [n("triangle", 294, 392, 0.12, 0.11), n("triangle", 392, 523, 0.14, 0.11, 0.12)],
    spotted: [n("square", 660, 660, 0.09, 0.1), n("square", 880, 880, 0.2, 0.12, 0.09), n("sawtooth", 110, 80, 0.36, 0.14)],
    giveup: [n("triangle", 392, 330, 0.16, 0.09), n("triangle", 330, 247, 0.24, 0.09, 0.13)],
    bark: [n("sawtooth", 340, 180, 0.09, 0.2), n("noise", 900, 400, 0.08, 0.1), n("sawtooth", 360, 170, 0.11, 0.2, 0.17), n("noise", 900, 400, 0.08, 0.1, 0.17)],
    growl: n("sawtooth", 72, 64, 0.26, 0.09),
    sneeze: [n("noise", 1300, 3200, 0.16, 0.1), n("noise", 3600, 500, 0.18, 0.2, 0.17), n("sawtooth", 520, 180, 0.15, 0.1, 0.17)],
    rub: [n("sine", 72, 72, 0.5, 0.2), n("sine", 76, 76, 0.5, 0.15, 0.2), n("sine", 70, 70, 0.5, 0.15, 0.48)],
    aww: [n("triangle", 523, 659, 0.3, 0.1), n("triangle", 659, 784, 0.32, 0.08, 0.1)],
    wriggle: [n("triangle", 300, 900, 0.14, 0.14), n("noise", 1800, 900, 0.1, 0.1)],
    alarm: [n("square", 720, 960, 0.2, 0.08), n("square", 720, 960, 0.2, 0.08, 0.26), n("square", 720, 960, 0.2, 0.08, 0.52)],
    caught: [n("sawtooth", 311, 294, 0.3, 0.13), n("sawtooth", 294, 277, 0.3, 0.13, 0.32), n("sawtooth", 277, 262, 0.3, 0.13, 0.64), n("sawtooth", 262, 196, 0.9, 0.14, 0.96)],
    yarn: n("sine", 300, 180, 0.3, 0.07),
    mew: [n("triangle", 620, 980, 0.12, 0.12), n("triangle", 980, 640, 0.2, 0.11, 0.1)],
    chomp: n("noise", 900, 400, 0.05, 0.04),
    heart: [n("sine", 62, 44, 0.12, 0.3), n("sine", 58, 42, 0.14, 0.2, 0.17)],
    stamp: [n("noise", 300, 90, 0.1, 0.3), n("sine", 120, 50, 0.16, 0.4)],
    chime: [n("sine", 659, 659, 0.5, 0.1), n("sine", 988, 988, 0.6, 0.08, 0.1), n("sine", 1319, 1319, 0.7, 0.06, 0.2)],
    tick: n("triangle", 1200, 1000, 0.03, 0.05),
    click: n("triangle", 520, 420, 0.05, 0.1),
    buy: [n("triangle", 523, 523, 0.1, 0.12), n("triangle", 784, 784, 0.1, 0.12, 0.08), n("sine", 1568, 1568, 0.4, 0.08, 0.16)],
};

/** Long, loose pulse: feels like a cat settling on your hand. */
export const PURR = [18, 26, 18, 26, 18, 26, 18, 26, 18, 26, 18, 26, 18, 26, 18, 26, 24, 34, 24, 34, 24, 34, 24, 34];
export const HEARTBEAT = [14, 110, 9];
