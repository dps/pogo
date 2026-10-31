// All sound is synthesised. pogo tones are a single sweep, so a bleat is a chain of short wobbling saw notes.
export function bleat(game, pitch = 1, big = false) {
    const f = (big ? 150 : 310) * pitch, vol = big ? 0.09 : 0.075, tones = [];
    const n = big ? 6 : 5;
    for (let i = 0; i < n; i++) {
        const w = i % 2 ? 0.92 : 1.06;
        tones.push({ wave: "sawtooth", freq: f * w, to: f * w * 0.97, attack: 0.008, decay: 0.05, volume: vol * (1 - i / (n + 1)), at: i * 0.052 });
    }
    tones.push({ wave: "triangle", freq: f * 2, to: f * 1.7, decay: 0.2, volume: vol * 0.5 });
    game.sfx(tones);
}
export const bark = (game, k = 1) => game.sfx([
    { wave: "square", freq: 340 * k, to: 120 * k, attack: 0.004, decay: 0.09, volume: 0.22 },
    { wave: "noise", freq: 1600, to: 300, decay: 0.08, volume: 0.22 },
    { wave: "sawtooth", freq: 220 * k, to: 90 * k, decay: 0.1, volume: 0.1, at: 0.02 },
]);
export const skid = (game) => game.sfx({ wave: "noise", freq: 2600, to: 700, attack: 0.01, decay: 0.16, volume: 0.09 });
export const pop = (game, n) => {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24], s = scale[n % scale.length] + 12 * Math.floor(n / scale.length) * 0.5;
    const f = 392 * 2 ** (Math.min(s, 30) / 12);
    game.sfx([{ wave: "sine", freq: f * 0.7, to: f * 1.5, attack: 0.004, decay: 0.09, volume: 0.28 }, { wave: "triangle", freq: f * 2, decay: 0.09, volume: 0.09, at: 0.05 }]);
};
export const boing = (game) => game.sfx({ wave: "sine", freq: 180, to: 520, attack: 0.005, decay: 0.16, volume: 0.2 });
export const whoosh = (game) => game.sfx({ wave: "noise", freq: 900, to: 3200, attack: 0.05, decay: 0.2, volume: 0.07 });
export const thud = (game) => game.sfx([{ wave: "sine", freq: 130, to: 45, decay: 0.2, volume: 0.35 }, { wave: "noise", freq: 500, to: 120, decay: 0.12, volume: 0.2 }]);
export const crash = (game) => game.sfx([{ wave: "noise", freq: 3000, to: 200, decay: 0.45, volume: 0.32 }, { wave: "square", freq: 200, to: 50, decay: 0.3, volume: 0.15 }, { wave: "noise", freq: 1200, to: 300, decay: 0.2, volume: 0.2, at: 0.12 }]);
export const snort = (game) => game.sfx([{ wave: "noise", freq: 700, to: 1800, attack: 0.02, decay: 0.15, volume: 0.2 }, { wave: "sawtooth", freq: 80, to: 60, decay: 0.3, volume: 0.15 }, { wave: "noise", freq: 1500, to: 400, decay: 0.2, volume: 0.15, at: 0.2 }]);
export const moo = (game) => game.sfx([{ wave: "sawtooth", freq: 105, to: 150, attack: 0.08, decay: 0.5, volume: 0.2 }, { wave: "sawtooth", freq: 210, to: 160, decay: 0.45, volume: 0.07, at: 0.1 }]);
export const howl = (game) => game.sfx([{ wave: "triangle", freq: 330, to: 660, attack: 0.25, decay: 0.45, volume: 0.13 }, { wave: "triangle", freq: 660, to: 410, decay: 0.7, volume: 0.13, at: 0.65 }]);
export const yelp = (game) => game.sfx([{ wave: "square", freq: 900, to: 1500, decay: 0.05, volume: 0.13 }, { wave: "square", freq: 1300, to: 400, decay: 0.15, volume: 0.13, at: 0.06 }]);
export const thunder = (game, near) => game.sfx([{ wave: "noise", freq: near ? 3000 : 900, to: 90, decay: 0.8, volume: near ? 0.45 : 0.25 }, { wave: "noise", freq: 500, to: 50, attack: 0.1, decay: 1.4, volume: 0.32, at: 0.12 }, { wave: "sine", freq: 60, to: 30, attack: 0.05, decay: 1.2, volume: 0.3 }]);
export const cluck = (game) => game.sfx([{ wave: "square", freq: 700, to: 1100, decay: 0.05, volume: 0.06 }, { wave: "square", freq: 900, to: 500, decay: 0.08, volume: 0.06, at: 0.08 }]);
export const star = (game, n) => game.sfx([{ wave: "triangle", freq: 660 * 1.25 ** n, decay: 0.16, volume: 0.25 }, { wave: "sine", freq: 1320 * 1.25 ** n, decay: 0.35, volume: 0.16, at: 0.05 }, { wave: "noise", freq: 5000, to: 1800, decay: 0.15, volume: 0.05 }]);
export const tick = (game) => game.sfx({ wave: "sine", freq: 1400, decay: 0.03, volume: 0.09 });
export const bell = (game) => game.sfx([{ wave: "sine", freq: 880, decay: 0.9, volume: 0.15 }, { wave: "sine", freq: 1768, decay: 0.5, volume: 0.07 }]);

// Songs are built on a strict grid: pogo loops every track by its own length, so tracks of unequal length drift apart.
// Each bar is six steps of 6/8. Chords give the bass and the off-beat chop; the lead is written by hand.
const CHORDS = {
    G: ["G2 - - D3 - -", "- B3 D4 - B3 D4"], C: ["C3 - - G3 - -", "- E4 G4 - E4 G4"], D: ["D3 - - A3 - -", "- F#4 A4 - F#4 A4"],
    Em: ["E2 - - B2 - -", "- G3 B3 - G3 B3"], Am: ["A2 - - E3 - -", "- C4 E4 - C4 E4"], B: ["B2 - - F#3 - -", "- D#4 F#4 - D#4 F#4"],
};
const bass = (bars) => bars.map((c) => CHORDS[c][0]).join(" ");
const chop = (bars) => bars.map((c) => CHORDS[c][1]).join(" ");
const JIG_BARS = "G G C D G G D G G D C D C G D G".split(" ");
const jigLead = [
    "G4 - B4 D5 - B4", "G4 - B4 D5 E5 D5", "C5 - E5 G5 - E5", "D5 C5 B4 A4 - -", "G4 - B4 D5 - B4", "G4 - B4 D5 G5 F#5", "E5 D5 C5 B4 A4 F#4", "G4 - - G4 - -",
    "B4 D5 G5 B5 - G5", "A5 G5 F#5 G5 - D5", "E5 G5 C5 E5 - G5", "A5 G5 F#5 D5 - -", "G5 F#5 E5 D5 C5 B4", "C5 B4 A4 G4 A4 B4", "C5 E5 D5 C5 B4 A4", "G4 D4 G4 G4 - -",
].join(" ");
const NIGHT_BARS = "Em Em C D Em Am B Em C D Em C Am Em B Em".split(" ");
const nightLead = [
    "E4 - G4 B4 - -", "G4 - B4 E5 - -", "G5 - E5 C5 - -", "D5 - A4 F#4 - -", "E4 - G4 B4 - G4", "C5 - B4 A4 - -", "B4 - D#5 F#5 - -", "E5 - - - - -",
    "G5 - E5 C5 - E5", "F#5 - D5 A4 - -", "G4 B4 E5 - - G5", "E5 - C5 G4 - -", "A4 C5 E5 - D5 C5", "B4 G4 E4 - - -", "F#4 B4 D#5 - F#5 -", "E5 - - E4 - -",
].join(" ");

export const SONGS = {
    jig: { bpm: 108, steps: 3, tracks: [{ wave: "triangle", notes: jigLead, volume: 0.24 }, { wave: "triangle", notes: bass(JIG_BARS), volume: 0.3 }, { wave: "square", notes: chop(JIG_BARS), volume: 0.04 }] },
    hurry: { bpm: 144, steps: 3, tracks: [{ wave: "square", notes: jigLead, volume: 0.085 }, { wave: "triangle", notes: bass(JIG_BARS), volume: 0.3 }, { wave: "square", notes: chop(JIG_BARS), volume: 0.05 }] },
    night: { bpm: 76, steps: 3, tracks: [{ wave: "sine", notes: nightLead, volume: 0.24 }, { wave: "triangle", notes: bass(NIGHT_BARS), volume: 0.26 }, { wave: "triangle", notes: chop(NIGHT_BARS), volume: 0.05 }] },
    menu: { bpm: 90, steps: 3, tracks: [{ wave: "triangle", notes: jigLead, volume: 0.2 }, { wave: "sine", notes: bass(JIG_BARS), volume: 0.3 }] },
    win: { bpm: 150, steps: 2, loop: false, tracks: [{ wave: "triangle", notes: "G4 B4 D5 G5 - D5 G5 B5 - - G5 - B5 - - -", volume: 0.25 }, { wave: "triangle", notes: "G2 - D3 - G2 - D3 - G2 - - - G3 - - -", volume: 0.3 }] },
};
