// Sounds and tunes. Everything is soft and woody: the garden is meant to feel like a music box, not an arcade.
const t = (wave, freq, to, decay, volume, at = 0, attack = 0.004) => ({ wave, freq, to, decay, volume, at, attack });

// name: [tone, haptic, minimum gap in seconds]
export const SFX = {
    pick: [[t("triangle", 520, 760, 0.07, 0.16)], "tick", 0],
    notch: [[t("sine", 900, 900, 0.03, 0.05)], "tick", 0.05],
    snap: [[t("noise", 500, 90, 0.14, 0.3), t("sine", 170, 60, 0.13, 0.42), t("triangle", 420, 620, 0.09, 0.14, 0.05)], "light", 0],
    nope: [[t("square", 180, 150, 0.08, 0.1), t("square", 150, 120, 0.1, 0.1, 0.09)], "warn", 0],
    tap: [[t("triangle", 620, 500, 0.05, 0.14)], "tick", 0],
    upgrade: [[t("triangle", 523, 523, 0.1, 0.2), t("triangle", 659, 659, 0.1, 0.2, 0.08), t("triangle", 784, 784, 0.1, 0.2, 0.16), t("sine", 1047, 1047, 0.24, 0.22, 0.24)], "success", 0],
    sell: [[t("sine", 700, 420, 0.1, 0.16), t("triangle", 300, 180, 0.12, 0.14, 0.03)], "light", 0],
    coin: [[t("sine", 1320, 1320, 0.05, 0.08), t("sine", 1760, 1760, 0.09, 0.08, 0.04)], null, 0.09],
    payday: [[t("sine", 988, 988, 0.07, 0.14), t("sine", 1319, 1319, 0.16, 0.16, 0.07)], "light", 0],
    fling: [[t("sine", 260, 520, 0.12, 0.13), t("noise", 900, 2400, 0.08, 0.05)], null, 0.1],
    bonk: [[t("sine", 150, 60, 0.11, 0.24), t("noise", 900, 200, 0.06, 0.1)], null, 0.08],
    bonkBig: [[t("sine", 110, 40, 0.24, 0.5), t("noise", 500, 80, 0.2, 0.3)], "medium", 0.2],
    pebble: [[t("triangle", 900, 500, 0.03, 0.06)], null, 0.1],
    squish: [[t("sine", 340, 90, 0.09, 0.16), t("noise", 700, 300, 0.05, 0.05)], null, 0.06],
    splat: [[t("sine", 200, 50, 0.2, 0.3), t("noise", 500, 90, 0.14, 0.18)], "light", 0.2],
    chomp: [[t("noise", 1100, 200, 0.05, 0.22), t("square", 200, 70, 0.07, 0.15), t("sine", 130, 70, 0.1, 0.24, 0.05)], "medium", 0.12],
    gulp: [[t("sine", 200, 520, 0.1, 0.16, 0.06), t("sine", 300, 120, 0.1, 0.14, 0.2)], null, 0.3],
    chime: [[t("sine", 1568, 1568, 0.5, 0.05), t("sine", 2093, 2093, 0.42, 0.04, 0.03), t("sine", 2637, 2637, 0.36, 0.025, 0.07)], null, 0.5],
    bell: [[t("sine", 523, 523, 0.8, 0.1), t("sine", 1046, 1046, 0.5, 0.06), t("sine", 1569, 1569, 0.3, 0.03)], "tick", 0.6],
    jet: [[t("noise", 2400, 1200, 0.2, 0.08)], null, 0.3],
    sting: [[t("sawtooth", 880, 1100, 0.03, 0.03)], null, 0.1],
    fire: [[t("noise", 1800, 500, 0.12, 0.1), t("sawtooth", 200, 100, 0.08, 0.05)], null, 0.14],
    fizz: [[t("noise", 5000, 3000, 0.16, 0.06)], null, 0.3],
    bonfire: [[t("noise", 800, 120, 0.4, 0.3), t("sine", 100, 50, 0.3, 0.3)], "medium", 0.2],
    bite: [[t("noise", 1400, 300, 0.06, 0.3), t("sine", 300, 90, 0.16, 0.34), t("square", 160, 90, 0.08, 0.1, 0.06)], "error", 0.15],
    gasp: [[t("sine", 520, 880, 0.12, 0.1)], null, 0.5],
    uproot: [[t("noise", 500, 120, 0.2, 0.2), t("sine", 90, 50, 0.2, 0.28)], "medium", 0.3],
    surface: [[t("noise", 700, 200, 0.12, 0.12), t("sine", 160, 240, 0.08, 0.1)], null, 0.15],
    stun: [[t("square", 700, 300, 0.1, 0.05)], null, 0.3],
    wave: [[t("triangle", 392, 392, 0.14, 0.16), t("triangle", 523, 523, 0.14, 0.16, 0.14), t("triangle", 659, 659, 0.3, 0.2, 0.28)], "light", 0],
    early: [[t("sine", 784, 784, 0.07, 0.15), t("sine", 988, 988, 0.07, 0.15, 0.06), t("sine", 1175, 1175, 0.07, 0.15, 0.12), t("sine", 1568, 1568, 0.2, 0.18, 0.18)], "medium", 0],
    bossIn: [[t("sawtooth", 70, 50, 0.8, 0.28), t("sine", 55, 40, 0.9, 0.5), t("triangle", 196, 185, 0.6, 0.18, 0.2), t("triangle", 233, 220, 0.8, 0.18, 0.5)], "heavy", 0],
    bossDie: [[t("noise", 900, 60, 0.7, 0.5), t("sine", 160, 40, 0.8, 0.6), t("triangle", 523, 1047, 0.4, 0.2, 0.3), t("triangle", 659, 1319, 0.4, 0.2, 0.4), t("triangle", 784, 1568, 0.6, 0.2, 0.5)], "heavy", 0],
    slipFly: [[t("sine", 300, 900, 0.22, 0.14), t("noise", 800, 3000, 0.2, 0.08)], null, 0],
    slipHit: [[t("sine", 130, 40, 0.3, 0.6), t("noise", 700, 100, 0.2, 0.4), t("square", 200, 90, 0.1, 0.14)], "heavy", 0],
    meow: [[t("sawtooth", 620, 900, 0.14, 0.07), t("sawtooth", 900, 500, 0.24, 0.07, 0.13)], "light", 0.5],
    star: [[t("triangle", 880, 880, 0.14, 0.2), t("sine", 1760, 1760, 0.2, 0.1, 0.02)], "medium", 0],
    win: [[t("triangle", 523, 523, 0.14, 0.2), t("triangle", 659, 659, 0.14, 0.2, 0.14), t("triangle", 784, 784, 0.14, 0.2, 0.28), t("triangle", 1047, 1047, 0.5, 0.24, 0.42), t("sine", 523, 523, 0.7, 0.14, 0.42)], "success", 0],
    lose: [[t("triangle", 392, 370, 0.3, 0.2), t("triangle", 330, 311, 0.3, 0.2, 0.28), t("triangle", 262, 233, 0.8, 0.22, 0.56)], "error", 0],
    thunder: [[t("noise", 300, 60, 1.1, 0.16)], null, 2],
    gust: [[t("noise", 500, 1400, 0.9, 0.06)], null, 2],
};

let last = {};
let clock = () => 0;
/** Bind to a game. Sounds and their paired pulses go through one call, so feel can be tuned in one table. */
export function bindAudio(game) {
    clock = () => game.stepCount / 60;
    return (name) => {
        const s = SFX[name];
        if (!s) return;
        const now = clock();
        if (s[2] && now - (last[name] ?? -9) < s[2]) return;
        last[name] = now;
        game.sfx(s[0], s[1] ? { haptic: s[1] } : undefined);
    };
}

// ---- Tunes. Chords are spelled out as eighth-note arpeggios. All tracks in a song are the same length. --------------
const CH = {
    C: "C3 G3 C4 E4", D: "D3 A3 D4 F#4", E: "E3 B3 E4 G#4", F: "F3 C4 F4 A4", G: "G3 D4 G4 B4", A: "A3 E4 A4 C#5", Bb: "A#2 F3 A#3 D4",
    Am: "A3 E4 A4 C5", Bm: "B3 F#4 B4 D5", Dm: "D3 A3 D4 F4", Em: "E3 B3 E4 G4",
};
const pluck = (chords, pat = [0, 2, 1, 3, 2, 1, 3, 2]) => chords.flatMap((c) => { const n = CH[c].split(" "); return pat.map((i) => n[i]); }).join(" ");
const bass = (chords, pat = [0, "-", "-", "-", 1, "-", "-", "-"]) => chords.flatMap((c) => { const n = CH[c].split(" ").slice(0, 2).map((x) => x.replace(/(\d)/, (m) => String(Number(m) - 1))); return pat.map((i) => (i === "-" ? "-" : n[i])); }).join(" ");
const shaker = (bars) => Array(bars).fill("C7 - C7 - C7 - C7 C7").join(" ");

const song = (bpm, chords, melody, o = {}) => ({
    bpm, steps: 2,
    tracks: [
        { wave: "triangle", notes: pluck(chords, o.pat), volume: o.pluck ?? 0.1, decay: 0.28 },
        { wave: "sine", notes: bass(chords), volume: 0.2, decay: 0.5 },
        { wave: o.lead ?? "sine", notes: melody, volume: o.leadVol ?? 0.085, decay: o.leadDecay ?? 0.42, attack: 0.02 },
        ...(o.shaker ? [{ wave: "noise", notes: shaker(chords.length), volume: o.shaker, decay: 0.03 }] : []),
    ],
});

export const MUSIC = {
    title: song(84, ["C", "G", "Am", "F", "C", "F", "G", "C"], `
        E5 - - G5 - - E5 D5  B4 - - D5 - - G5 -  C5 - - E5 - - A5 G5  F5 - - - A4 - - -
        G5 - - E5 - - C5 -  A4 - C5 - F5 - E5 -  D5 - - - G4 - B4 D5  C5 - - - - - - -`),
    spring: song(100, ["D", "A", "Bm", "G", "D", "G", "A", "D"], `
        F#5 - A5 - F#5 E5 D5 -  E5 - C#5 - A4 - - -  D5 - F#5 - B5 A5 F#5 -  G5 - - - D5 - - -
        A5 - F#5 - D5 - A4 -  B4 - D5 - G5 - F#5 -  E5 - A4 - C#5 - E5 -  D5 - - - - - - -`, { shaker: 0.018 }),
    summer: song(116, ["G", "C", "G", "D", "Em", "C", "D", "G"], `
        B4 D5 G5 - D5 - B4 -  C5 E5 G5 - E5 - C5 -  B4 D5 G5 - B5 - G5 -  A5 - F#5 - D5 - - -
        G5 - E5 - B4 - E5 -  G5 - E5 - C5 - G4 -  A4 - D5 - F#5 - A5 -  G5 - - - - - - -`, { lead: "triangle", leadVol: 0.07, shaker: 0.022 }),
    autumn: song(88, ["Am", "F", "C", "G", "Am", "Dm", "E", "Am"], `
        A5 - - C5 - E5 - A5  F5 - - A4 - C5 - -  G5 - E5 - C5 - E5 -  D5 - - - B4 - - -
        C5 - E5 - A5 - G5 E5  F5 - - D5 - A4 - -  E5 - G#4 - B4 - E5 -  A4 - - - - - - -`, { pat: [0, 1, 2, 3, 2, 1, 2, 1] }),
    winter: song(72, ["Em", "C", "G", "D", "Em", "C", "Am", "Em"], `
        B5 - - - G5 - E5 -  C6 - - - G5 - E5 -  D5 - G5 - B5 - - -  A5 - - - F#5 - D5 -
        B4 - E5 - G5 - B5 -  C6 - B5 - G5 - E5 -  A5 - - - E5 - C5 -  B4 - - - - - - -`, { pat: [0, 2, 3, 2, 1, 2, 3, 2], leadVol: 0.075, leadDecay: 0.7, pluck: 0.08 }),
    boss: {
        bpm: 132, steps: 2,
        tracks: [
            { wave: "triangle", notes: pluck(["Dm", "Bb", "C", "A", "Dm", "Bb", "A", "A"], [0, 0, 2, 0, 1, 0, 3, 0]), volume: 0.1, decay: 0.16 },
            { wave: "sine", notes: bass(["Dm", "Bb", "C", "A", "Dm", "Bb", "A", "A"], [0, "-", 0, "-", 1, "-", 0, 1]), volume: 0.24, decay: 0.26 },
            { wave: "noise", notes: Array(8).fill("C2 - - - C2 - C2 -").join(" "), volume: 0.05, decay: 0.08 },
        ],
    },
};
