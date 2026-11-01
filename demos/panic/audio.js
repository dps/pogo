// Six tiny house bands plus the jingles. A song is two bars so it can restart on every microgame without getting old.
const prog = {
    bouncy: ["C3", "A2", "F2", "G2"], funk: ["E2", "E2", "G2", "A2"], spooky: ["A2", "F2", "D2", "E2"],
    march: ["C3", "G2", "C3", "G2"], surf: ["D3", "C3", "A#2", "A2"], chip: ["F2", "G2", "A2", "C3"],
};
const melody = {
    bouncy: "E5 - G5 E5 C5 - D5 - C5 - E5 G5 A5 - G5 - A4 - C5 A4 F5 - E5 - D5 - B4 - G4 - B4 -",
    funk: "E5 - - E5 G5 - E5 - D5 - - D5 B4 - - - G5 - A5 - G5 E5 - D5 E5 - - - - - B4 -",
    spooky: "A4 - C5 - E5 - C5 - F4 - A4 - C5 - A4 - D5 - F5 - E5 - D5 - B4 - G#4 - E4 - - -",
    march: "C5 - C5 E5 G5 - E5 - D5 - D5 F5 B4 - G4 - C5 - C5 E5 G5 - C6 - B5 - G5 - D5 - - -",
    surf: "F#5 A5 D6 A5 F#5 - - - E5 G5 C6 G5 E5 - - - D5 F5 A#5 F5 D5 - - - C#5 E5 A5 E5 C#5 - - -",
    chip: "A5 C6 A5 F5 B5 D6 B5 G5 C6 E6 C6 A5 E6 - C6 - A5 C6 A5 F5 D6 B5 G5 B5 C6 A5 E5 A5 G5 E5 C5 E5",
};
const bars = (root) => root.flatMap((n) => [n, "-", n, "-", n, "-", n, "-"]).join(" ");
const repeat = (s, n) => Array(n).fill(s).join(" ");
const kick = repeat("C2 - - - C2 - - -", 4), snare = repeat("- - C4 - - - C4 -", 4), hat = repeat("C6 C6 C6 C6 C6 C6 C6 C6", 4);

export function song(mood, bpm) {
    return {
        bpm, steps: 2,
        tracks: [
            { wave: "square", notes: melody[mood], volume: 0.055, decay: 0.14 },
            { wave: "triangle", notes: bars(prog[mood]), volume: 0.16, decay: 0.17 },
            { wave: "sine", notes: kick, volume: 0.2, decay: 0.12, slide: 0.5 },
            { wave: "noise", notes: snare, volume: 0.045, decay: 0.08 },
            { wave: "noise", notes: hat, volume: 0.012, decay: 0.03 },
        ],
    };
}
export const MENU = {
    bpm: 132, steps: 2,
    tracks: [
        { wave: "square", volume: 0.05, decay: 0.16, notes: "E5 - G5 - A5 - G5 E5 D5 - E5 - C5 - - - E5 - G5 - A5 - C6 A5 G5 - E5 - D5 - - - F5 - A5 - C6 - A5 F5 E5 - G5 - C6 - - - D5 - F5 - A5 - G5 F5 E5 - D5 - C5 - - -" },
        { wave: "triangle", volume: 0.15, decay: 0.2, notes: "C3 - C3 G2 C3 - G2 - A2 - A2 E2 A2 - E2 - F2 - F2 C3 F2 - C3 - G2 - G2 D3 G2 - B2 - C3 - C3 G2 C3 - G2 - A2 - A2 E2 A2 - E2 - F2 - F2 C3 G2 - G2 - C3 - - - C3 - - -" },
        { wave: "sine", volume: 0.18, decay: 0.12, slide: 0.5, notes: repeat("C2 - - - C2 - - -", 8) },
        { wave: "noise", volume: 0.04, decay: 0.07, notes: repeat("- - C4 - - - C4 -", 8) },
    ],
};
export const PARTY = {
    bpm: 148, steps: 2,
    tracks: [
        { wave: "square", volume: 0.05, decay: 0.12, notes: "G5 G5 A5 G5 E5 - C5 - G5 G5 A5 G5 D5 - - - F5 F5 G5 F5 D5 - B4 - E5 G5 C6 G5 E5 - - -" },
        { wave: "triangle", volume: 0.16, decay: 0.16, notes: "C3 C3 G2 C3 E3 C3 G2 C3 G2 G2 D3 G2 B2 G2 D3 G2 F2 F2 C3 F2 A2 F2 C3 F2 C3 C3 G2 C3 C3 - G2 -" },
        { wave: "sine", volume: 0.2, decay: 0.1, slide: 0.5, notes: repeat("C2 - C2 - C2 - C2 -", 4) },
    ],
};
const t = (wave, freq, to, decay, volume, at) => ({ wave, freq, to: to ?? freq, decay, volume, at });
const arp = (notes, gap, wave = "square", vol = 0.11, dec = 0.12) => notes.map((f, i) => t(wave, f, f, dec, vol, i * gap));
export const JINGLE = {
    win: [...arp([659, 784, 1047, 1319], 0.065), t("triangle", 262, 262, 0.25, 0.2, 0)],
    win2: [...arp([523, 659, 523, 784, 1047], 0.055), t("triangle", 330, 330, 0.25, 0.2, 0)],
    fail: [t("sawtooth", 330, 110, 0.45, 0.14, 0), t("square", 233, 185, 0.18, 0.09, 0.06), t("square", 185, 139, 0.3, 0.09, 0.24)],
    fail2: [t("square", 392, 370, 0.14, 0.1, 0), t("square", 370, 349, 0.14, 0.1, 0.16), t("square", 349, 330, 0.14, 0.1, 0.32), t("square", 330, 300, 0.42, 0.12, 0.48)],
    slam: [t("sawtooth", 196, 90, 0.14, 0.16, 0), { wave: "noise", freq: 1000, decay: 0.09, volume: 0.1, at: 0 }, t("square", 880, 880, 0.05, 0.06, 0.02)],
    whoosh: [{ wave: "noise", freq: 1000, decay: 0.2, volume: 0.05, at: 0 }, t("sine", 240, 900, 0.2, 0.08, 0)],
    faster: [...arp([523, 587, 659, 698, 784, 880, 988, 1047], 0.05, "square", 0.1, 0.09)],
    boss: [t("sawtooth", 110, 220, 0.3, 0.16, 0), t("sawtooth", 110, 220, 0.3, 0.16, 0.34), t("sawtooth", 110, 440, 0.5, 0.18, 0.68)],
    over: [...arp([523, 494, 466, 440, 415, 392, 370, 349], 0.11, "triangle", 0.16, 0.2), t("sawtooth", 175, 55, 0.8, 0.14, 0.95)],
    finale: [...arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.09, "square", 0.12, 0.18), t("triangle", 131, 131, 1, 0.2, 0), t("triangle", 196, 196, 1, 0.16, 0.4)],
    tick: t("square", 1400, 1400, 0.03, 0.05, 0),
    tock: t("square", 900, 900, 0.03, 0.05, 0),
    pass: [...arp([392, 523, 659], 0.09, "triangle", 0.16, 0.16)],
};
