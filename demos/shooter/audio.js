// Every sound in the game is synthesised. Music is pattern-based: a driving bass, an arpeggio, a lead and noise drums.

const n = (wave, freq, to, decay, volume, at = 0) => ({ wave, freq, to, decay, volume, at, attack: 0.002 });

export const SFX = {
    pea: [n("square", 760, 240, 0.07, 0.16), n("noise", 2600, 700, 0.06, 0.2), n("sine", 180, 70, 0.08, 0.28)],
    buss: [n("noise", 3600, 160, 0.26, 0.5), n("sawtooth", 150, 40, 0.24, 0.32), n("sine", 95, 34, 0.3, 0.5), n("square", 900, 400, 0.03, 0.12, 0.28), n("square", 500, 900, 0.04, 0.12, 0.38)],
    hose: [n("sawtooth", 520, 180, 0.05, 0.1), n("noise", 5000, 1200, 0.04, 0.16), n("sine", 130, 70, 0.05, 0.16)],
    mortar: [n("sine", 230, 60, 0.2, 0.5), n("noise", 900, 200, 0.14, 0.3), n("triangle", 500, 900, 0.12, 0.12, 0.05)],
    zap: [n("sawtooth", 2200, 120, 0.22, 0.2), n("square", 1500, 300, 0.2, 0.12), n("noise", 7000, 1500, 0.14, 0.18), n("sine", 70, 40, 0.2, 0.3)],
    empty: [n("square", 300, 260, 0.03, 0.1), n("square", 200, 180, 0.03, 0.08, 0.05)],
    swap: [n("square", 300, 520, 0.05, 0.08), n("noise", 3000, 1600, 0.05, 0.08, 0.04)],
    jump: [n("triangle", 260, 460, 0.1, 0.14)],
    land: [n("noise", 500, 120, 0.08, 0.18), n("sine", 110, 60, 0.08, 0.2)],
    dash: [n("noise", 1400, 5000, 0.18, 0.2), n("sine", 300, 700, 0.14, 0.1)],
    hit: [n("square", 1500, 900, 0.04, 0.09), n("noise", 4200, 1800, 0.05, 0.14)],
    crit: [n("square", 2200, 1400, 0.05, 0.12), n("noise", 5000, 2000, 0.05, 0.14)],
    ping: [n("triangle", 3000, 2400, 0.14, 0.18), n("square", 4400, 3000, 0.05, 0.08)],
    pop: [n("noise", 3200, 300, 0.2, 0.34), n("triangle", 900, 140, 0.2, 0.26), n("square", 1800, 2600, 0.06, 0.1, 0.03), n("triangle", 2400, 3200, 0.1, 0.08, 0.1)],
    popBig: [n("noise", 2400, 120, 0.42, 0.5), n("sine", 200, 40, 0.4, 0.5), n("triangle", 1200, 200, 0.3, 0.26), n("square", 1800, 2800, 0.1, 0.1, 0.12)],
    boom: [n("noise", 1800, 60, 0.6, 0.6), n("sine", 120, 30, 0.6, 0.6), n("sawtooth", 200, 40, 0.3, 0.2)],
    hurt: [n("sawtooth", 300, 120, 0.14, 0.24), n("noise", 1400, 300, 0.12, 0.2)],
    door: [n("sawtooth", 90, 150, 0.28, 0.12), n("noise", 400, 900, 0.3, 0.12)],
    locked: [n("square", 180, 150, 0.08, 0.16), n("square", 150, 120, 0.1, 0.16, 0.1)],
    click: [n("square", 1000, 1000, 0.02, 0.16), n("square", 1500, 1500, 0.05, 0.14, 0.05)],
    pickup: [n("triangle", 700, 1200, 0.08, 0.16), n("triangle", 1200, 1700, 0.1, 0.12, 0.06)],
    tea: [n("sine", 520, 700, 0.14, 0.2), n("sine", 780, 1040, 0.2, 0.16, 0.08), n("sine", 1040, 1400, 0.22, 0.1, 0.16)],
    armour: [n("square", 420, 620, 0.1, 0.1), n("square", 620, 840, 0.14, 0.1, 0.1)],
    key: [n("square", 880, 880, 0.08, 0.12), n("square", 1320, 1320, 0.08, 0.12, 0.08), n("square", 1760, 1760, 0.2, 0.12, 0.16)],
    weapon: [n("sawtooth", 200, 800, 0.2, 0.16), n("square", 440, 440, 0.1, 0.12, 0.16), n("square", 660, 660, 0.1, 0.12, 0.26), n("square", 880, 880, 0.24, 0.14, 0.36)],
    secret: [n("triangle", 660, 660, 0.1, 0.16), n("triangle", 880, 880, 0.1, 0.16, 0.1), n("triangle", 1100, 1100, 0.1, 0.16, 0.2), n("triangle", 1320, 1320, 0.34, 0.2, 0.3)],
    exit: [n("square", 523, 523, 0.14, 0.14), n("square", 659, 659, 0.14, 0.14, 0.12), n("square", 784, 784, 0.14, 0.14, 0.24), n("square", 1047, 1047, 0.4, 0.16, 0.36)],
    die: [n("sawtooth", 500, 40, 0.9, 0.3), n("noise", 900, 80, 0.8, 0.3), n("square", 200, 60, 0.7, 0.14, 0.2)],
    step: [n("noise", 500, 200, 0.05, 0.05), n("sine", 95, 60, 0.05, 0.08)],
    alert: [n("square", 700, 1100, 0.07, 0.07), n("square", 900, 1400, 0.08, 0.07, 0.07)],
    // Enemy voices: each has a readable tell
    tellNib: [n("square", 520, 900, 0.1, 0.1)],
    tellSling: [n("triangle", 300, 1000, 0.42, 0.14)],
    sling: [n("noise", 2000, 600, 0.08, 0.16), n("triangle", 500, 200, 0.1, 0.14)],
    tellFly: [n("sawtooth", 600, 1600, 0.45, 0.1), n("square", 900, 2000, 0.45, 0.05)],
    dive: [n("sawtooth", 1600, 300, 0.4, 0.14)],
    tellShield: [n("triangle", 200, 120, 0.3, 0.2), n("square", 90, 90, 0.25, 0.12)],
    bash: [n("noise", 1100, 200, 0.2, 0.3), n("sine", 140, 60, 0.2, 0.3)],
    fuse: [n("noise", 7000, 5000, 0.5, 0.14), n("square", 1400, 2400, 0.5, 0.06)],
    rev: [n("sawtooth", 60, 240, 0.9, 0.22), n("square", 45, 180, 0.9, 0.12)],
    charge: [n("sawtooth", 240, 120, 0.5, 0.2), n("noise", 800, 300, 0.5, 0.2)],
    wallbonk: [n("noise", 700, 80, 0.3, 0.4), n("sine", 120, 40, 0.3, 0.5)],
    bossTell: [n("sawtooth", 80, 220, 0.6, 0.26), n("square", 160, 440, 0.6, 0.1)],
    bossSlam: [n("noise", 600, 40, 0.8, 0.6), n("sine", 80, 22, 0.8, 0.7)],
    bossShot: [n("sawtooth", 400, 120, 0.14, 0.18), n("noise", 1500, 500, 0.12, 0.14)],
    bossRoar: [n("sawtooth", 200, 60, 0.9, 0.3), n("square", 110, 50, 0.9, 0.2), n("noise", 500, 100, 0.9, 0.2)],
    win: [n("square", 523, 523, 0.16, 0.14), n("square", 659, 659, 0.16, 0.14, 0.16), n("square", 784, 784, 0.16, 0.14, 0.32), n("square", 1047, 1047, 0.16, 0.14, 0.48), n("square", 784, 784, 0.16, 0.14, 0.64), n("square", 1047, 1047, 0.6, 0.16, 0.8)],
};

// Pattern helpers. A pattern is 16ths; notes joined with spaces, "-" is a rest.
const rep = (s, k) => Array(k).fill(s).join(" ");
const bar = (root, alt, up) => `${root} ${root} - ${root} ${alt} - ${root} - ${root} ${root} - ${up} - ${alt} ${root} -`;
const kick = rep("C2 - - - - - - - C2 - C2 - - - - -", 4);
const snare = rep("- - - - C7 - - - - - - - C7 - - -", 4);
const hat = rep("C8 - C8 C8", 16);

/** Six driving tracks. The tempo and the mode climb across the game. */
export const SONGS = [
    { // Back Garden: jaunty A minor, cheeky and bright
        bpm: 138, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.1, notes: [bar("A2", "C3", "E3"), bar("A2", "C3", "E3"), bar("F2", "A2", "C3"), bar("G2", "B2", "D3")].join(" ") },
            { wave: "square", volume: 0.045, notes: `${rep("A4 C5 E5 A5", 8)} ${rep("F4 A4 C5 F5", 4)} ${rep("G4 B4 D5 G5", 4)}` },
            { wave: "triangle", volume: 0.09, notes: "E5 - - - E5 - D5 - C5 - - - D5 - E5 - G5 - - - E5 - - - D5 - C5 - - - A4 - F5 - - - E5 - C5 - - - D5 - E5 - - - D5 - G5 - - - B4 - D5 - - - - - - - - - - -" },
            { wave: "noise", volume: 0.3, notes: kick }, { wave: "noise", volume: 0.1, notes: snare }, { wave: "noise", volume: 0.025, notes: hat },
        ],
    },
    { // Greenhouse: slinky E phrygian
        bpm: 146, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.1, notes: [bar("E2", "G2", "B2"), bar("F2", "G#2", "C3"), bar("E2", "G2", "B2"), bar("D2", "F2", "A2")].join(" ") },
            { wave: "square", volume: 0.04, notes: `${rep("E5 B4 G4 B4", 4)} ${rep("F5 C5 G#4 C5", 4)} ${rep("E5 B4 G4 B4", 4)} ${rep("D5 A4 F4 A4", 4)}` },
            { wave: "triangle", volume: 0.08, notes: "B5 - - - - - G5 - F5 - - - E5 - - - C6 - - - - - G#5 - F5 - - - G#5 - - - B5 - - - - - G5 - E5 - - - F5 - G5 - A5 - - - - - F5 - D5 - - - - - - -" },
            { wave: "noise", volume: 0.3, notes: kick }, { wave: "noise", volume: 0.1, notes: snare }, { wave: "noise", volume: 0.022, notes: hat },
        ],
    },
    { // Hollows: sparse, ominous, D minor drone
        bpm: 124, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.12, notes: "D2 - - - - - D2 - - - D2 - - - - - D2 - - - - - D#2 - - - D2 - - - C2 - D2 - - - - - D2 - - - D2 - - - - - A1 - - - - - A#1 - - - C2 - - - C#2 -" },
            { wave: "sine", volume: 0.1, notes: "A5 - - - - - - - F5 - - - - - - - D#5 - - - - - - - D5 - - - - - - - A5 - - - - - - - F5 - - - - - - - G#5 - - - - - - - - - - - - - - -" },
            { wave: "square", volume: 0.02, notes: rep("D6 - - A5 - - F5 - - - - - - - - -", 4) },
            { wave: "noise", volume: 0.3, notes: rep("C2 - - - - - - - - - - - C2 - - -", 4) }, { wave: "noise", volume: 0.03, notes: rep("- - C8 - - - - - C8 - - - - - C8 -", 4) },
        ],
    },
    { // Kiln Works: industrial C minor stomp
        bpm: 158, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.11, notes: [bar("C2", "D#2", "G2"), bar("C2", "D#2", "G2"), bar("G#1", "C2", "D#2"), bar("A#1", "D2", "F2")].join(" ") },
            { wave: "square", volume: 0.05, notes: `${rep("C4 - C4 G4", 8)} ${rep("G#3 - G#3 D#4", 4)} ${rep("A#3 - A#3 F4", 4)}` },
            { wave: "sawtooth", volume: 0.05, notes: "G5 - G5 - D#5 - C5 - G5 - G5 - G#5 - G5 - F5 - F5 - D5 - A#4 - F5 - F5 - G5 - F5 - D#5 - D#5 - C5 - G#4 - D#5 - D#5 - F5 - D#5 - D5 - D5 - F5 - A#5 - G5 - - - - - - -" },
            { wave: "noise", volume: 0.34, notes: rep("C2 - - - C2 - - - C2 - - - C2 - - -", 4) }, { wave: "noise", volume: 0.12, notes: snare }, { wave: "noise", volume: 0.03, notes: hat },
        ],
    },
    { // Palace: a grand, sinister waltz of power in G harmonic minor, played much too fast
        bpm: 168, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.1, notes: [bar("G2", "A#2", "D3"), bar("D#2", "G2", "A#2"), bar("C2", "D#2", "G2"), bar("D2", "F#2", "A2")].join(" ") },
            { wave: "square", volume: 0.045, notes: `${rep("G4 A#4 D5 G5", 4)} ${rep("D#4 G4 A#4 D#5", 4)} ${rep("C4 D#4 G4 C5", 4)} ${rep("D4 F#4 A4 D5", 4)}` },
            { wave: "triangle", volume: 0.1, notes: "D6 - - - A#5 - G5 - D6 - - - D#6 - D6 - A#5 - - - G5 - D#5 - A#5 - - - C6 - A#5 - G5 - - - D#5 - C5 - G5 - - - A5 - G5 - F#5 - - - A5 - D6 - - - - - - - - - - -" },
            { wave: "noise", volume: 0.32, notes: kick }, { wave: "noise", volume: 0.11, notes: snare }, { wave: "noise", volume: 0.03, notes: hat },
        ],
    },
    { // Boss: full speed, A minor with a flat second, every track shouting
        bpm: 184, steps: 4, tracks: [
            { wave: "sawtooth", volume: 0.13, notes: [bar("A1", "C2", "E2"), bar("A#1", "D2", "F2"), bar("A1", "C2", "E2"), bar("G#1", "B1", "E2")].join(" ") },
            { wave: "square", volume: 0.055, notes: `${rep("A4 E5 A5 E5", 4)} ${rep("A#4 F5 A#5 F5", 4)} ${rep("A4 E5 A5 E5", 4)} ${rep("G#4 E5 G#5 E5", 4)}` },
            { wave: "sawtooth", volume: 0.06, notes: "A5 - A5 - C6 - A5 - E6 - D6 - C6 - A#5 - A#5 - A#5 - D6 - F6 - E6 - D6 - A#5 - A5 - A5 - C6 - E6 - A6 - G6 - E6 - C6 - B5 - G#5 - B5 - E6 - G#6 - - - - - - -" },
            { wave: "noise", volume: 0.36, notes: rep("C2 - C2 - - - C2 - C2 - C2 - - - C2 -", 4) }, { wave: "noise", volume: 0.14, notes: snare }, { wave: "noise", volume: 0.035, notes: hat },
        ],
    },
];
