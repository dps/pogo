// All music here is original, written for Puddle Pip: chord loops, bass, arps, noise hats.

const rep = (s, n) => Array(n).fill(s).join(" ");
const join = (...p) => p.join(" ");

// --- Meadow: G major, bouncy. 8 eighth notes per bar. -------------------------------------------
const meadowLead = join(
    "G4 - B4 D5 - B4 G4 A4", "B4 - G4 E4 - G4 B4 D5", "E5 - D5 C5 - B4 A4 G4", "A4 - F#4 D4 E4 F#4 A4 -",
    "G4 - B4 D5 - G5 F#5 E5", "D5 - B4 G4 - B4 E5 D5", "C5 E5 D5 C5 B4 - A4 -", "G4 - D4 - G4 - - -",
    "E5 E5 - G5 E5 - C5 -", "F#5 F#5 - A5 F#5 - D5 -", "D5 - F#5 - B5 A5 F#5 D5", "E5 - G5 - B4 - - -",
    "E5 E5 - G5 E5 - C5 E5", "F#5 A5 - F#5 D5 - A4 D5", "C5 B4 A4 G4 F#4 G4 A4 -", "G4 B4 D5 G5 - D5 G5 -",
);
const meadowBass = join(
    "G2 - G3 - D3 - G3 -", "E2 - E3 - B2 - E3 -", "C3 - C3 - G2 - C3 -", "D3 - D3 - A2 - D3 -",
    "G2 - G3 - D3 - G3 -", "E2 - E3 - B2 - E3 -", "C3 - G2 - D3 - A2 -", "G2 - D3 - G2 - G3 -",
    "C3 - G3 - C3 - G3 -", "D3 - A3 - D3 - A3 -", "B2 - F#3 - B2 - F#3 -", "E3 - B2 - E3 - B2 -",
    "C3 - G3 - C3 - G3 -", "D3 - A3 - D3 - A3 -", "A2 - E3 - D3 - F#3 -", "G2 - D3 - G2 - - -",
);
const meadowArp = join(
    "- D4 - G4 - D4 - G4", "- B3 - E4 - B3 - E4", "- C4 - E4 - C4 - E4", "- D4 - F#4 - D4 - F#4",
    "- D4 - G4 - D4 - G4", "- B3 - E4 - B3 - E4", "- C4 - E4 - D4 - F#4", "- D4 - G4 - D4 - B3",
    "- E4 - G4 - E4 - G4", "- F#4 - A4 - F#4 - A4", "- D4 - F#4 - D4 - F#4", "- E4 - G4 - E4 - G4",
    "- E4 - G4 - E4 - G4", "- F#4 - A4 - F#4 - A4", "- C4 - E4 - D4 - F#4", "- D4 - G4 - D4 - G4",
);
const hats = rep("- - C8 - - - C8 C8", 4);

// --- Drainworks: A minor, dotted bass with an echo on the lead. ---------------------------------
const deepBass = rep("A2 - A2 C3 - A2 E3 G3", 2) + " " + rep("F2 - F2 A2 - F2 C3 E3", 1) + " " + rep("E2 - E2 G#2 - E2 B2 E3", 1);
const deepLead = join(
    "- - A4 - C5 - E5 -", "D5 - C5 - B4 - A4 -", "- - A4 - C5 - E5 -", "G5 - F5 - E5 - - -",
    "- - F4 - A4 - C5 -", "E5 - D5 - C5 - A4 -", "G#4 - B4 - E5 - D5 -", "B4 - G#4 - E4 - - -",
);
const deepEcho = join("- -", deepLead.split(" ").slice(0, -2).join(" "));
const deepDrop = rep("- - - - E7 - - -  - - - - - - B6 -", 4).replace(/\s+/g, " ");

// --- Dusk: E minor waltz-ish lope, for the rainy evening stage. --------------------------------
const duskLead = join(
    "E5 - - B4 - - G4 -", "A4 - B4 - G4 - E4 -", "C5 - - G4 - - E4 -", "F#4 - G4 - A4 - B4 -",
    "E5 - - B4 - - G5 -", "F#5 - E5 - D5 - B4 -", "C5 - D5 - E5 - G5 -", "F#5 - D#5 - B4 - - -",
);
const duskBass = join("E2 - B2 - E3 - B2 -", "A2 - E3 - A3 - E3 -", "C3 - G3 - C3 - G3 -", "D3 - A3 - D3 - F#3 -",
    "E2 - B2 - E3 - B2 -", "B2 - F#3 - B2 - F#3 -", "C3 - G3 - A2 - E3 -", "B2 - F#3 - B2 - D#3 -");
const duskArp = join(rep("- G4 B4 - - G4 B4 -", 1), rep("- A4 C5 - - A4 C5 -", 1), rep("- G4 C5 - - G4 C5 -", 1), rep("- A4 D5 - - A4 D5 -", 1),
    rep("- G4 B4 - - G4 B4 -", 1), rep("- F#4 B4 - - F#4 B4 -", 1), rep("- G4 C5 - - E4 A4 -", 1), rep("- F#4 B4 - - F#4 B4 -", 1));

// --- Stormkeep: D minor, driving eighths. ------------------------------------------------------
const keepBass = join(rep("D2 D2 D3 D2 D2 D3 D2 C3", 2), rep("Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 A2", 1), rep("A1 A1 A2 A1 A1 A2 C#3 A2", 1));
const keepLead = join(
    "D5 - - F5 - - A5 -", "G5 - F5 - E5 - D5 -", "D5 - - F5 - - C6 -", "A5 - G5 - F5 - A5 -",
    "Bb5 - - A5 - - G5 -", "F5 - G5 - A5 - D5 -", "C#5 - E5 - A5 - G5 -", "F5 - E5 - C#5 - A4 -",
);
const keepPad = join(rep("- A4 - D5 - A4 - D5", 2), rep("- Bb4 - D5 - Bb4 - D5", 1), rep("- A4 - C#5 - A4 - E5", 1));
const keepDrum = rep("C6 - C8 C8 G6 - C8 C8", 4);

// --- Boss: E minor, fast, chromatic bass. --------------------------------------------------------
const bossBass = join(rep("E2 E3 E2 E3 F2 F3 E2 E3", 2), rep("G2 G3 G2 G3 F#2 F#3 F2 F3", 1), rep("E2 E3 B2 E3 A#2 E3 B2 D#3", 1));
const bossLead = join(
    "E5 - B4 - E5 - G5 -", "F5 - E5 - D#5 - B4 -", "E5 - B4 - E5 - B5 -", "A#5 - B5 - G5 - E5 -",
    "G5 - D5 - G5 - B5 -", "A5 - G5 - F#5 - D5 -", "E5 G5 B5 G5 E5 G5 B5 G5", "A#5 G5 D#5 B4 A#4 B4 D#5 B4",
);
const bossDrum = rep("C6 C8 C8 C8 G6 C8 C8 C6", 4);

// --- Map: gentle C major. ----------------------------------------------------------------------
const mapLead = join("E5 - G5 - C5 - - -", "D5 - E5 - G4 - - -", "A4 - C5 - F5 - E5 -", "D5 - - - - - - -",
    "E5 - G5 - C6 - - -", "B5 - A5 - G5 - - -", "F5 - E5 - D5 - G4 -", "C5 - - - - - - -");
const mapBass = join("C3 - G3 - E3 - G3 -", "G2 - D3 - B2 - D3 -", "F2 - C3 - A2 - C3 -", "G2 - D3 - G3 - D3 -",
    "C3 - G3 - E3 - G3 -", "E3 - B3 - E3 - B3 -", "F2 - C3 - G2 - D3 -", "C3 - G3 - C3 - - -");

// --- Title: a confident little fanfare loop in F. ------------------------------------------------
const titleLead = join("C5 - F5 - A5 - C6 -", "A5 - F5 - - - G5 -", "A5 - Bb5 - C6 - A5 -", "G5 - - - - - - -",
    "C5 - F5 - A5 - C6 -", "D6 - C6 - Bb5 - A5 -", "G5 - A5 - Bb5 - G5 -", "F5 - - - C5 - F5 -");
const titleBass = join("F2 - C3 - F3 - C3 -", "D3 - A3 - D3 - A3 -", "Bb2 - F3 - Bb2 - F3 -", "C3 - G3 - C3 - G3 -",
    "F2 - C3 - F3 - C3 -", "Bb2 - F3 - Bb2 - F3 -", "C3 - G3 - C3 - E3 -", "F2 - C3 - F2 - - -");

// --- Bonus room: quick and bright. --------------------------------------------------------------
const bonusLead = join("C5 E5 G5 C6 B5 G5 E5 D5", "D5 F5 A5 D6 C6 A5 F5 E5", "E5 G5 B5 E6 D6 B5 G5 F5", "F5 A5 C6 F6 E6 C6 G5 E5");
const bonusBass = join("C3 G3 C3 G3 C3 G3 C3 G3", "D3 A3 D3 A3 D3 A3 D3 A3", "E3 B3 E3 B3 E3 B3 E3 B3", "F3 C4 F3 C4 G3 D4 G3 B3");

// --- Rainbow drop: invincible. -----------------------------------------------------------------
const rainbowLead = rep("C6 E6 G6 C7 G6 E6 C6 G5 D6 F6 A6 D7 A6 F6 D6 A5", 2);
const rainbowBass = rep("C3 C4 C3 C4 D3 D4 D3 D4", 4);

export const SONGS = {
    title: { bpm: 132, steps: 2, tracks: [
        { wave: "square", notes: titleLead, volume: 0.13 }, { wave: "triangle", notes: titleBass, volume: 0.3 }, { wave: "noise", notes: hats, volume: 0.035 }] },
    map: { bpm: 112, steps: 2, tracks: [{ wave: "triangle", notes: mapLead, volume: 0.24 }, { wave: "triangle", notes: mapBass, volume: 0.2 }] },
    meadow: { bpm: 148, steps: 2, tracks: [
        { wave: "square", notes: meadowLead, volume: 0.12 }, { wave: "square", notes: meadowArp, volume: 0.045 },
        { wave: "triangle", notes: meadowBass, volume: 0.32 }, { wave: "noise", notes: hats, volume: 0.04 }] },
    dusk: { bpm: 118, steps: 2, tracks: [
        { wave: "square", notes: duskLead, volume: 0.1 }, { wave: "triangle", notes: duskArp, volume: 0.1 },
        { wave: "triangle", notes: duskBass, volume: 0.3 }, { wave: "noise", notes: rep("- - - - C8 - - -", 4), volume: 0.03 }] },
    drain: { bpm: 126, steps: 2, tracks: [
        { wave: "square", notes: deepLead, volume: 0.1 }, { wave: "square", notes: deepEcho, volume: 0.035 },
        { wave: "triangle", notes: deepBass, volume: 0.34 }, { wave: "sine", notes: deepDrop, volume: 0.06 }] },
    keep: { bpm: 156, steps: 2, tracks: [
        { wave: "sawtooth", notes: keepLead, volume: 0.07 }, { wave: "square", notes: keepPad, volume: 0.04 },
        { wave: "triangle", notes: keepBass, volume: 0.34 }, { wave: "noise", notes: keepDrum, volume: 0.05 }] },
    boss: { bpm: 178, steps: 2, tracks: [
        { wave: "sawtooth", notes: bossLead, volume: 0.075 }, { wave: "triangle", notes: bossBass, volume: 0.36 }, { wave: "noise", notes: bossDrum, volume: 0.055 }] },
    bonus: { bpm: 170, steps: 2, tracks: [{ wave: "square", notes: bonusLead, volume: 0.09 }, { wave: "triangle", notes: bonusBass, volume: 0.3 }, { wave: "noise", notes: hats, volume: 0.03 }] },
    rainbow: { bpm: 190, steps: 2, tracks: [{ wave: "square", notes: rainbowLead, volume: 0.08 }, { wave: "triangle", notes: rainbowBass, volume: 0.3 }] },
    ending: { bpm: 100, steps: 2, tracks: [{ wave: "triangle", notes: titleLead, volume: 0.25 }, { wave: "triangle", notes: titleBass, volume: 0.22 }, { wave: "square", notes: mapLead, volume: 0.035 }] },
};

const seq = (wave, list, step, o = {}) => list.map((freq, i) => ({ wave, freq, at: i * step, decay: o.decay ?? step * 1.5, volume: o.volume ?? 0.2 }));
const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, D6: 1175, E6: 1319, G6: 1568, C7: 2093 };

export const SFX = {
    jump: { wave: "square", freq: 300, to: 760, decay: 0.13, volume: 0.13 },
    jumpBig: { wave: "square", freq: 200, to: 560, decay: 0.15, volume: 0.15 },
    stomp: [{ wave: "square", freq: 420, to: 120, decay: 0.09, volume: 0.22 }, { wave: "noise", freq: 2400, to: 300, decay: 0.07, volume: 0.2 }],
    kick: [{ wave: "square", freq: 240, to: 800, decay: 0.07, volume: 0.18 }, { wave: "noise", freq: 3000, to: 900, decay: 0.05, volume: 0.15 }],
    coin: [{ wave: "square", freq: N.B5, decay: 0.05, volume: 0.13 }, { wave: "square", freq: N.E6, decay: 0.26, volume: 0.13, at: 0.05 }],
    bump: { wave: "triangle", freq: 170, to: 90, decay: 0.08, volume: 0.42 },
    brick: [{ wave: "noise", freq: 3000, to: 400, decay: 0.16, volume: 0.32 }, { wave: "square", freq: 180, to: 70, decay: 0.1, volume: 0.16 }],
    sprout: seq("triangle", [N.G4, N.B4, N.D5, N.G5, N.B5], 0.045, { volume: 0.28 }),
    grow: seq("square", [N.C5, N.E5, N.G5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6], 0.05, { volume: 0.12 }),
    shrink: seq("square", [N.E5, N.C5, N.A4, N.F4, N.D4], 0.055, { volume: 0.13 }),
    zap: { wave: "sawtooth", freq: 1400, to: 300, decay: 0.1, volume: 0.1 },
    zapHit: { wave: "noise", freq: 4500, to: 800, decay: 0.08, volume: 0.2 },
    oneup: seq("square", [N.E5, N.G5, N.E6, N.C6, N.D6, N.G6], 0.075, { volume: 0.12 }),
    pipe: [{ wave: "square", freq: 240, to: 90, decay: 0.16, volume: 0.15 }, { wave: "square", freq: 240, to: 90, decay: 0.16, volume: 0.15, at: 0.16 }, { wave: "square", freq: 240, to: 90, decay: 0.16, volume: 0.15, at: 0.32 }],
    checkpoint: seq("triangle", [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6], 0.07, { volume: 0.3 }),
    spring: { wave: "square", freq: 180, to: 1200, decay: 0.24, volume: 0.13 },
    crumble: { wave: "noise", freq: 900, to: 200, decay: 0.14, volume: 0.2 },
    hurry: seq("square", [N.G5, N.C6, N.G5, N.C6, N.G5, N.C6], 0.1, { volume: 0.13 }),
    death: [...seq("square", [N.C6, N.G5, N.E5], 0.09, { volume: 0.14 }), ...seq("square", [N.F5, N.E5, N.D5, N.C5, N.B4, N.A4, N.G4], 0.07, { volume: 0.13 }).map((t) => ({ ...t, at: t.at + 0.4 }))],
    gameover: seq("triangle", [N.C5, N.G4, N.E4, N.A4, N.B4, N.A4, N.G4, N.E4, N.C4], 0.2, { volume: 0.32, decay: 0.3 }),
    grab: seq("triangle", [N.G4, N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 0.06, { volume: 0.32 }),
    clear: [...seq("square", [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6], 0.1, { volume: 0.13 }), ...seq("square", [N.A5, N.B5, N.C6, N.G5, N.C6, N.E6], 0.13, { volume: 0.13, decay: 0.2 }).map((t) => ({ ...t, at: t.at + 0.65 })),
        ...seq("triangle", [N.C4, N.G4, N.C5, N.G4, N.A4, N.G4, N.E4, N.G4], 0.17, { volume: 0.3 })],
    tally: { wave: "square", freq: N.A5, decay: 0.03, volume: 0.07 },
    tallyEnd: seq("square", [N.E6, N.G6, N.C7], 0.06, { volume: 0.11 }),
    firework: [{ wave: "noise", freq: 900, to: 90, decay: 0.45, volume: 0.25 }, { wave: "noise", freq: 6000, to: 2500, decay: 0.3, volume: 0.06, at: 0.1 }],
    thunder: [{ wave: "noise", freq: 2000, to: 60, decay: 0.8, volume: 0.42 }, { wave: "sawtooth", freq: 90, to: 40, decay: 0.5, volume: 0.15 }],
    warn: seq("square", [900, 700], 0.07, { volume: 0.1 }),
    bossHit: [{ wave: "sawtooth", freq: 500, to: 80, decay: 0.3, volume: 0.25 }, { wave: "noise", freq: 2600, to: 200, decay: 0.26, volume: 0.32 }],
    bossDie: [...seq("sawtooth", [400, 320, 260, 200, 150, 110, 80], 0.14, { volume: 0.2, decay: 0.24 }), { wave: "noise", freq: 1500, to: 50, decay: 1.4, volume: 0.45, at: 0.3 }],
    gate: { wave: "noise", freq: 400, to: 60, decay: 0.36, volume: 0.4 },
    select: { wave: "square", freq: 660, to: 880, decay: 0.05, volume: 0.13 },
    confirm: seq("square", [N.E5, N.A5], 0.06, { volume: 0.14 }),
    pause: seq("square", [N.E5, N.C5, N.E5], 0.06, { volume: 0.1 }),
    step: { wave: "triangle", freq: 200, to: 120, decay: 0.03, volume: 0.05 },
    skid: { wave: "noise", freq: 2500, to: 1200, decay: 0.09, volume: 0.09 },
    secret: seq("square", [N.G5, N.E6 * 0.75, N.A5, N.D5, N.B5, N.E6, N.G6, N.C7], 0.07, { volume: 0.09 }),
};
