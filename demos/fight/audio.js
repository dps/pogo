// All sound is synthesised. Hits are noise over a sine thump, so they stay crunchy at low volume; songs are short chord
// loops with a walking bass, because they repeat for a long time and must not grate.
const SEMI = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midi = (n, o) => 12 * (o + 1) + SEMI[n];
const name = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const QUAL = { M: [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 10], m7: [0, 3, 10], M7: [0, 4, 11], dim: [0, 3, 6] };

/** One bar per chord, eight steps a bar. Chords are written "Am", "F", "E7" and so on. */
function parse(c) { const m = c.match(/^([A-G][b#]?)(.*)$/); return { root: m[1], q: QUAL[m[2] || "M"] ?? QUAL.M }; }
export function song({ bpm, chords, lead, leadWave = "square", feel = "walk", drums = true, volume = 1, bass = 2 }) {
    const bassLine = [], stab = [], stab2 = [];
    for (const ch of chords) {
        const { root, q } = parse(ch), r = midi(root, bass), t = r + q[1], f = r + q[2], o = r + 12;
        const walk = feel === "walk" ? [r, "-", t, "-", f, "-", o - 2, "-"] : feel === "gallop" ? [r, r, "-", r, f, f, "-", o] : [r, "-", r, f, o, "-", f, r];
        for (const n of walk) bassLine.push(n === "-" ? "-" : name(n));
        const s = midi(root, 4), a = s + q[1], b = s + q[2];
        stab.push("-", "-", name(a), "-", "-", name(a), "-", "-");
        stab2.push("-", "-", name(b), "-", "-", name(b), "-", "-");
    }
    const n = chords.length * 8;
    const tracks = [
        { wave: "triangle", notes: bassLine.join(" "), volume: 0.26 * volume, decay: 0.2 },
        { wave: "square", notes: stab.join(" "), volume: 0.05 * volume, decay: 0.1 },
        { wave: "square", notes: stab2.join(" "), volume: 0.05 * volume, decay: 0.1 },
    ];
    if (lead) {
        const toks = lead.trim().split(/\s+/), full = [];
        for (let i = 0; i < n; i++) full.push(toks[i % toks.length]);
        tracks.push({ wave: leadWave, notes: full.join(" "), volume: (leadWave === "square" ? 0.06 : 0.11) * volume, decay: 0.2 });
    }
    if (drums) {
        const kick = [], hat = [], snare = [];
        for (let i = 0; i < n; i++) { const k = i % 8; kick.push(k === 0 || k === 4 || (feel !== "walk" && k === 5) ? "C2" : "-"); snare.push(k === 2 || k === 6 ? "C3" : "-"); hat.push("C6"); }
        tracks.push({ wave: "sine", notes: kick.join(" "), volume: 0.28 * volume, decay: 0.12, slide: 0.5 });
        tracks.push({ wave: "noise", notes: snare.join(" "), volume: 0.1 * volume, decay: 0.09 });
        tracks.push({ wave: "noise", notes: hat.join(" "), volume: 0.022 * volume, decay: 0.03 });
    }
    return { bpm, steps: 2, tracks };
}

export const SONGS = {
    title: song({ bpm: 132, chords: ["C", "Am", "Dm", "G7", "C", "Am", "F", "G7"], feel: "walk", lead: "E5 - G5 - A5 G5 E5 - E5 - C5 - D5 E5 C5 - D5 - F5 - A5 F5 D5 - B4 - D5 - G5 F5 D5 - E5 - G5 - A5 G5 E5 - E5 - C5 - D5 E5 C5 - F5 - A5 - C6 A5 F5 - G5 - - - F5 E5 D5 -", leadWave: "triangle" }),
    select: song({ bpm: 120, chords: ["F", "Dm", "Gm", "C7"], feel: "walk", lead: "A4 - C5 - - F5 - - A4 - D5 - - F5 - - Bb4 - D5 - - G5 - - G4 - Bb4 - C5 - E5 -", leadWave: "triangle", volume: 0.85 }),
    fight: [
        song({ bpm: 168, chords: ["Am", "Am", "F", "G", "Am", "Am", "Dm", "E7"], feel: "drive", lead: "A5 - - E5 A5 - C6 - B5 - A5 - G5 - E5 - F5 - A5 - C6 - A5 - G5 - B5 - D6 - B5 - A5 - - E5 A5 - C6 - E6 - D6 - C6 - B5 - D5 - F5 - A5 - D6 - E5 - G#5 - B5 - E6 -" }),
        song({ bpm: 150, chords: ["Em", "C", "Am", "B7"], feel: "gallop", lead: "E5 - G5 - B5 - - - C6 - B5 - G5 - - - A5 - C6 - E6 - - - F#5 - A5 - B5 - D#6 -" }),
        song({ bpm: 176, chords: ["Dm", "Bb", "F", "C", "Dm", "Bb", "Gm", "A7"], feel: "drive", lead: "D5 F5 A5 - F5 - D5 - Bb4 D5 F5 - D5 - Bb4 - A4 C5 F5 - A5 - F5 - G4 C5 E5 - G5 - E5 - D5 F5 A5 - D6 - A5 - F5 - Bb5 - F5 - D5 - Bb4 D5 G5 - Bb5 - G5 - A4 C#5 E5 - A5 - G5 -" }),
        song({ bpm: 184, chords: ["Cm", "Ab", "Bb", "G7"], feel: "gallop", lead: "C5 - Eb5 - G5 C6 - G5 Ab5 - C6 - Eb6 - C6 - Bb5 - D6 - F6 - D6 - B5 - D6 - G6 - F6 D6" }),
    ],
    boss: song({ bpm: 190, chords: ["Fm", "Db", "Bbm", "C7"], feel: "gallop", lead: "F5 - Ab5 - C6 F6 - C6 Db6 - F6 - Ab6 - F6 - Bb5 - Db6 - F6 - Db6 - C6 - E6 - G6 - Bb6 -" }),
    ending: song({ bpm: 96, chords: ["C", "Em", "F", "G", "Am", "F", "C", "G7"], feel: "walk", drums: false, lead: "G5 - - E5 C5 - - - G5 - - E5 B4 - - - A5 - - F5 C5 - - - B5 - - G5 D5 - - - C6 - - A5 E5 - - - A5 - - F5 C5 - - - G5 - - E5 C5 - - - F5 - - D5 B4 - - -", leadWave: "triangle", volume: 0.9 }),
};

const T = (wave, freq, to, decay, volume, at = 0, attack = 0.001) => ({ wave, freq, to, decay, volume, at, attack });
const SIG = {
    crumbs: [T("sine", 300, 900, 0.09, 0.14), T("sine", 1320, 1320, 0.2, 0.06, 0.08)],
    frappe: [T("sawtooth", 180, 620, 0.26, 0.09), T("noise", 2000, 800, 0.2, 0.05)],
    ristretto: [T("noise", 3000, 1200, 0.2, 0.07), T("square", 900, 1300, 0.08, 0.04, 0.04)],
    whistle: [T("sine", 1400, 2200, 0.32, 0.08), T("sine", 2100, 2500, 0.3, 0.03)],
    ding: [T("sine", 1760, 1760, 0.3, 0.08), T("square", 880, 880, 0.04, 0.03)],
    chill: [T("sine", 90, 60, 0.3, 0.2), T("noise", 800, 300, 0.2, 0.06)],
    knead: [T("sawtooth", 110, 200, 0.2, 0.07), T("triangle", 300, 180, 0.2, 0.09)],
    clamp: [T("square", 200, 90, 0.08, 0.09), T("noise", 1800, 400, 0.06, 0.1)],
};

export class Sound {
    constructor(game) { this.g = game; this.lastWhiff = -9; }
    play(t) { this.g.sfx(t); }
    click() { this.play([T("square", 660, 880, 0.05, 0.05)]); }
    back() { this.play([T("square", 500, 300, 0.07, 0.05)]); }
    move() { this.play([T("triangle", 520, 640, 0.05, 0.08)]); }
    pick() { this.play([T("square", 523, 523, 0.07, 0.06), T("square", 784, 784, 0.1, 0.06, 0.07), T("square", 1047, 1047, 0.16, 0.06, 0.14)]); }
    whiff(rank) { const heavy = rank >= 2; this.play([T("noise", heavy ? 900 : 1800, heavy ? 240 : 500, heavy ? 0.14 : 0.08, heavy ? 0.07 : 0.05)]); }
    jump() { this.play([T("sine", 240, 560, 0.1, 0.09)]); }
    land() { this.play([T("sine", 150, 60, 0.08, 0.14), T("noise", 400, 150, 0.05, 0.03)]); }
    dash() { this.play([T("noise", 2400, 600, 0.12, 0.05)]); }
    hit(rank, counter) {
        const k = [0.8, 1, 1.25, 1.5, 1.8][rank] ?? 1;
        const out = [T("noise", 2600, 240, 0.05 + 0.03 * rank, 0.16 * k), T("sine", 180 / k, 44, 0.09 + 0.03 * rank, 0.26 * k), T("square", 320 / k, 90, 0.04, 0.07 * k)];
        if (counter) out.push(T("square", 1400, 1860, 0.1, 0.06, 0.02));
        this.play(out);
    }
    block() { this.play([T("square", 1100, 620, 0.04, 0.06), T("noise", 4000, 2000, 0.03, 0.07)]); }
    armor() { this.play([T("square", 240, 240, 0.1, 0.09), T("sine", 620, 620, 0.2, 0.08)]); }
    parry() { this.play([T("square", 1320, 1320, 0.05, 0.08), T("square", 1980, 1980, 0.14, 0.07, 0.05)]); }
    tech() { this.play([T("square", 880, 1320, 0.1, 0.07), T("noise", 3000, 800, 0.08, 0.06)]); }
    grab() { this.play([T("sawtooth", 200, 110, 0.12, 0.1)]); }
    wall() { this.play([T("sine", 110, 40, 0.28, 0.32), T("noise", 1200, 140, 0.26, 0.18), T("square", 500, 260, 0.1, 0.06)]); }
    knockdown() { this.play([T("sine", 120, 44, 0.22, 0.26), T("noise", 700, 120, 0.14, 0.1)]); }
    proj(id) { this.play(SIG[id] ?? SIG.crumbs); }
    sig(id) { this.play(SIG[id] ?? SIG.crumbs); }
    pop() { this.play([T("sine", 520, 200, 0.08, 0.1), T("noise", 1800, 500, 0.05, 0.05)]); }
    superflash() { this.play([T("sawtooth", 110, 880, 0.5, 0.1), T("square", 220, 1760, 0.5, 0.05), T("noise", 700, 5000, 0.5, 0.07), T("sine", 1760, 1760, 0.3, 0.08, 0.5)]); }
    superHit(last) {
        this.play(last ? [T("sine", 90, 28, 0.9, 0.42), T("noise", 2400, 90, 0.8, 0.26), T("sawtooth", 200, 40, 0.6, 0.12), T("square", 1200, 300, 0.2, 0.06)] : [T("sine", 150, 44, 0.2, 0.34), T("noise", 3000, 200, 0.16, 0.2), T("square", 440, 110, 0.08, 0.07)]);
    }
    ko() { this.play([T("sine", 70, 24, 1.2, 0.42), T("noise", 1800, 60, 1, 0.2), T("sawtooth", 440, 55, 0.9, 0.08), T("square", 660, 660, 0.3, 0.05, 0.2)]); }
    round() { this.play([T("square", 392, 392, 0.1, 0.06), T("square", 523, 523, 0.14, 0.06, 0.12)]); }
    bell() { this.play([T("sine", 1760, 1760, 0.6, 0.1), T("sine", 2640, 2640, 0.4, 0.05), T("sine", 1760, 1760, 0.6, 0.1, 0.16), T("sine", 2640, 2640, 0.4, 0.05, 0.16)]); }
    fanfare() { this.play([523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => T("square", f, f, 0.14, 0.06, i * 0.1)).concat([T("triangle", 262, 262, 0.7, 0.14), T("triangle", 392, 392, 0.7, 0.1, 0.3)])); }
    lose() { this.play([523, 494, 466, 440, 415, 392].map((f, i) => T("triangle", f, f * 0.98, 0.2, 0.11, i * 0.16))); }
    tick() { this.play([T("square", 1800, 1800, 0.02, 0.03)]); }
    gag(kind) {
        const g = {
            bell: [T("sine", 2093, 2093, 0.5, 0.07), T("sine", 3136, 3136, 0.3, 0.03)],
            cuckoo: [T("sine", 880, 880, 0.14, 0.09), T("sine", 698, 698, 0.2, 0.09, 0.18)],
            meow: [T("sawtooth", 500, 900, 0.1, 0.05), T("sawtooth", 900, 420, 0.24, 0.05, 0.1)],
            squeak: [T("sine", 1800, 2600, 0.07, 0.07), T("sine", 2600, 1800, 0.07, 0.05, 0.08)],
            clang: [T("square", 700, 660, 0.3, 0.05), T("sine", 1320, 1300, 0.4, 0.06)],
            smash: [T("noise", 6000, 2500, 0.2, 0.1), T("square", 2200, 1800, 0.06, 0.04), T("square", 3100, 2600, 0.05, 0.03, 0.05)],
            flour: [T("noise", 900, 250, 0.4, 0.12)],
        }[kind];
        if (g) this.play(g);
    }
}
