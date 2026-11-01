// Sounds and songs. Toy instruments: wooden blocks, plucks, a little brass band made of square waves.
const tone = (g, t, haptic) => g.sfx(t, haptic ? { haptic } : undefined);
const t = (wave, freq, decay, volume = 0.16, extra = {}) => ({ wave, freq, decay, volume, ...extra });

export const click = (g) => tone(g, t("square", 780, 0.05, 0.07), "tick");
export const select = (g) => tone(g, [t("triangle", 523, 0.08, 0.15), { ...t("triangle", 784, 0.1, 0.13), at: 0.05 }], "light");
export const coo = (g) => tone(g, [t("sine", 420, 0.12, 0.16, { to: 340 }), { ...t("sine", 460, 0.16, 0.14, { to: 300 }), at: 0.11 }], "tick");
export const hop = (g, i) => tone(g, t("triangle", 300 + (i % 3) * 60, 0.05, 0.1, { to: 520 }));
export const foeStep = (g) => tone(g, t("triangle", 170, 0.07, 0.1, { to: 110 }));
export const shove = (g) => tone(g, [t("noise", 300, 0.09, 0.1), t("sawtooth", 140, 0.08, 0.05, { to: 90 })], "light");
export const bump = (g) => tone(g, [t("square", 110, 0.1, 0.17, { to: 50 }), t("noise", 900, 0.05, 0.14)], "heavy");
export const hit = (g, n, side) => tone(g, [t("noise", 1400, 0.06, 0.13), t("square", side === 0 ? 220 : 330, 0.09, 0.11, { to: 90 })], n >= 2 ? "heavy" : "medium");
export const block = (g) => tone(g, [t("triangle", 1200, 0.12, 0.14), t("sine", 1800, 0.18, 0.08)], "medium");
export const boom = (g) => tone(g, [t("noise", 240, 0.4, 0.3), t("sine", 110, 0.4, 0.3, { to: 34 }), { ...t("noise", 900, 0.12, 0.1), at: 0.03 }], "heavy");
export const drum = (g) => tone(g, [t("sine", 90, 0.32, 0.32, { to: 44 }), t("noise", 500, 0.08, 0.12)]);
export const splash = (g) => tone(g, [t("noise", 900, 0.3, 0.17), t("sine", 500, 0.22, 0.09, { to: 150 })], "medium");
export const heal = (g) => tone(g, [t("sine", 659, 0.14, 0.13), { ...t("sine", 880, 0.2, 0.12), at: 0.08 }, { ...t("sine", 1175, 0.2, 0.08), at: 0.15 }], "light");
export const crumb = (g) => tone(g, [t("triangle", 988, 0.07, 0.14), { ...t("triangle", 1319, 0.12, 0.13), at: 0.06 }], "light");
export const perch = (g, n) => tone(g, [t("triangle", 523 * 2 ** (n / 12), 0.2, 0.16), { ...t("triangle", 659 * 2 ** (n / 12), 0.22, 0.13), at: 0.09 }], "success");
export const leaves = (g) => tone(g, t("noise", 3000, 0.12, 0.08));
export const box = (g) => tone(g, [t("square", 180, 0.07, 0.14, { to: 120 }), t("noise", 500, 0.05, 0.1)], "light");
export const spawn = (g) => tone(g, [t("sawtooth", 200, 0.16, 0.08, { to: 420 })], "tick");
export const ride = (g) => tone(g, t("triangle", 330, 0.2, 0.08, { to: 494 }));
export const dive = (g) => tone(g, t("sawtooth", 1500, 0.2, 0.09, { to: 220 }));
export const slap = (g) => tone(g, [t("noise", 2000, 0.05, 0.22), t("square", 260, 0.06, 0.1, { to: 120 })]);
export const whistle = (g) => tone(g, t("sine", 1500, 0.36, 0.09, { to: 380 }));
export const splat = (g) => tone(g, [t("noise", 420, 0.16, 0.2), t("sine", 210, 0.14, 0.17, { to: 70 })], "medium");
export const whoosh = (g) => tone(g, t("noise", 700, 0.3, 0.14));
export const slide = (g) => tone(g, t("sawtooth", 180, 0.22, 0.1, { to: 340 }), "medium");
export const swap = (g) => tone(g, [t("sine", 700, 0.1, 0.13, { to: 1300 }), { ...t("sine", 1300, 0.12, 0.12, { to: 620 }), at: 0.08 }]);
export const hook = (g) => tone(g, t("sine", 300, 0.16, 0.14, { to: 900 }), "medium");
export const peck = (g) => tone(g, [t("square", 900, 0.03, 0.14), { ...t("square", 900, 0.03, 0.12), at: 0.05 }], "medium");
export const flick = (g) => tone(g, t("triangle", 1100, 0.07, 0.15, { to: 300 }), "light");
export const screech = (g) => tone(g, [t("sawtooth", 1500, 0.28, 0.1, { to: 900 }), t("square", 1020, 0.26, 0.05, { to: 700 })], "medium");
export const fuse = (g) => tone(g, t("noise", 4000, 0.2, 0.09));
export const spray = (g) => tone(g, t("noise", 2600, 0.28, 0.1), "light");
export const fall = (g) => tone(g, t("sine", 900, 0.5, 0.12, { to: 120 }));
export const poof = (g, side) => tone(g, side === 0 ? [t("sine", 520, 0.3, 0.17, { to: 180 }), { ...t("sine", 330, 0.36, 0.14, { to: 120 }), at: 0.1 }] : [t("noise", 1100, 0.16, 0.16), t("triangle", 620, 0.14, 0.13, { to: 1100 })]);
export const banner = (g) => tone(g, [t("square", 392, 0.08, 0.08), { ...t("square", 523, 0.14, 0.09), at: 0.08 }], "light");
export const enemyBanner = (g) => tone(g, [t("sawtooth", 196, 0.14, 0.08), { ...t("sawtooth", 185, 0.2, 0.09), at: 0.11 }], "tick");
export const undo = (g) => tone(g, t("triangle", 620, 0.1, 0.13, { to: 310 }), "light");
export const bad = (g) => tone(g, t("square", 150, 0.1, 0.09), "warn");
export const buy = (g) => tone(g, [t("square", 880, 0.05, 0.08), { ...t("square", 1175, 0.08, 0.09), at: 0.05 }, { ...t("triangle", 1568, 0.2, 0.12), at: 0.11 }], "success");
export const starPop = (g, i) => tone(g, [t("triangle", 659 * 2 ** ((i * 4) / 12), 0.25, 0.17), { ...t("sine", 1319 * 2 ** ((i * 4) / 12), 0.2, 0.08), at: 0.03 }], "medium");
export const win = (g) => tone(g, [0, 0.11, 0.22, 0.33, 0.5].map((at, i) => ({ ...t("square", [523, 659, 784, 1047, 1319][i], i === 4 ? 0.5 : 0.13, 0.09), at })).concat([{ ...t("triangle", 262, 0.7, 0.16), at: 0 }]), "success");
export const lose = (g) => tone(g, [0, 0.2, 0.4].map((at, i) => ({ ...t("triangle", [392, 370, 294][i], i === 2 ? 0.7 : 0.2, 0.15), at })), "error");

// Songs. Each bar list loops; all tracks in a song add up to the same length.
const bass = (s) => s.split(" ").map((n) => `${n} - ${n === "-" ? "-" : "-"} -`).join(" ");
const song = (bpm, tracks) => ({ bpm, steps: 2, tracks });
const drums = (kick, snare, hat, v = 1) => [
    { wave: "sine", notes: kick, volume: 0.18 * v, decay: 0.14, slide: 0.5 },
    { wave: "noise", notes: snare, volume: 0.06 * v, decay: 0.09 },
    { wave: "noise", notes: hat, volume: 0.02 * v, decay: 0.03 },
];
const rep = (s, n) => Array(n).fill(s).join(" ");

export const SONGS = {
    title: song(108, [
        { wave: "triangle", notes: "C3 - G3 - A2 - E3 - F2 - C3 - G2 - D3 - ".trim(), volume: 0.16, decay: 0.26 },
        { wave: "square", notes: "E5 G5 C6 - A5 G5 E5 - F5 A5 C6 A5 G5 - B4 D5", volume: 0.035, decay: 0.2 },
        { wave: "triangle", notes: "G4 - C5 - E4 - A4 - A4 - C5 - G4 - B4 -", volume: 0.06, decay: 0.16 },
        ...drums("C2 - - - C2 - - - C2 - - - C2 - - -", "- - C4 - - - C4 - - - C4 - - - C4 -", rep("C7 -", 8), 0.8),
    ]),
    map: song(88, [
        { wave: "triangle", notes: "F2 - - - C3 - - - D3 - - - A2 - - - Bb2 - - - F2 - - - G2 - - - C3 - - -", volume: 0.15, decay: 0.4 },
        { wave: "sine", notes: "A4 - C5 - F5 - E5 - D5 - C5 - A4 - - - Bb4 - D5 - F5 - D5 - C5 - - - G4 - - -", volume: 0.09, decay: 0.4 },
    ]),
    // March time: oom-pah under a pompous tune, in a key that doesn't take itself seriously.
    battle: song(116, [
        { wave: "triangle", notes: "G2 - D3 - G2 - D3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - D3 - A3 - F#3 - A3 -", volume: 0.17, decay: 0.16 },
        { wave: "square", notes: "- - B4 D5 - - B4 D5 - - C5 E5 - - C5 E5 - - C5 E5 - - C5 E5 - - D5 F#5 - - D5 F#5", volume: 0.022, decay: 0.08 },
        { wave: "square", notes: "G5 - - D5 G5 - A5 B5 C6 - B5 A5 G5 - E5 - E5 - A5 - G5 - E5 - F#5 - - D5 F#5 - A5 -", volume: 0.03, decay: 0.2 },
        ...drums(rep("C2 - - - - - - -", 4), rep("- - - - C4 - - -", 4), rep("C7 - C7 -", 8)),
    ]),
    tense: song(124, [
        { wave: "sawtooth", notes: "D2 - D3 - D2 - D3 - Bb1 - Bb2 - Bb1 - Bb2 - C2 - C3 - C2 - C3 - A1 - A2 - A1 - A2 -", volume: 0.09, decay: 0.15 },
        { wave: "square", notes: "D5 - F5 A5 - G5 F5 - D5 - Bb4 D5 - F5 G5 - E5 - G5 C6 - Bb5 A5 - A4 - C#5 E5 - G5 A5 -", volume: 0.028, decay: 0.16 },
        ...drums(rep("C2 - - C2 - - C2 -", 4), rep("- - - - C4 - - -", 4), rep("C7 C7 C7 -", 8), 1.1),
    ]),
    boss: song(136, [
        { wave: "sawtooth", notes: "E2 E2 - E2 G2 - E2 - C2 C2 - C2 D2 - B1 -", volume: 0.1, decay: 0.12 },
        { wave: "square", notes: "E5 - G5 - B5 - A5 G5 F#5 - - - - - E5 F#5 G5 - - - A5 - B5 - C6 - B5 - A5 - G5 -", volume: 0.03, decay: 0.18 },
        ...drums(rep("C2 - - C2", 8), rep("- - C4 -", 8), rep("C7 C7", 16), 1.15),
    ]),
    swan: song(72, [
        { wave: "sine", notes: "A1 - - - - - - - F1 - - - - - - - D2 - - - - - - - E2 - - - - - - -", volume: 0.2, decay: 1.1 },
        { wave: "triangle", notes: "A4 - C5 - E5 - - - F5 - E5 - C5 - - - D5 - F5 - A5 - G#5 - - - - - - -", volume: 0.09, decay: 0.8 },
        { wave: "noise", notes: rep("C2 - - - - - - -", 4), volume: 0.06, decay: 0.5 },
    ]),
};
void bass;

export function playSong(game, name) {
    if (game.data._song === name) return;
    game.data._song = name;
    game.music(SONGS[name]);
}
