// Everything you hear is synthesised. Songs are short chord loops with a walking bass and a cheeky lead, in the key of a marching band
// that has stopped caring. Hits are a noise crack over a sine thump, so they stay crunchy at low volume.
const SEMI = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const midi = (n, o) => 12 * (o + 1) + SEMI[n];
const name = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const QUAL = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 10], m7: [0, 3, 10], M7: [0, 4, 11], dim: [0, 3, 6], "5": [0, 7, 12] };
const parse = (c) => { const m = c.match(/^([A-G][b#]?)(.*)$/); return { root: m[1], q: QUAL[m[2]] ?? QUAL[""] }; };

function song({ bpm, chords, lead, leadWave = "square", feel = "punk", drums = true, volume = 1 }) {
    const bass = [], gtrA = [], gtrB = [];
    for (const ch of chords) {
        const { root, q } = parse(ch), r = midi(root, 2), f = r + q[1], fi = r + q[2];
        const pat = feel === "punk" ? [r, r, r, r, r, r, fi, r] : feel === "walk" ? [r, "-", f, "-", fi, "-", r + 10, "-"] : feel === "gallop" ? [r, r, "-", r, fi, fi, "-", r + 12] : [r, "-", "-", fi, r, "-", fi, "-"];
        for (const n of pat) bass.push(n === "-" ? "-" : name(n));
        const s = midi(root, 4), a = s + q[1], b = s + q[2];
        const on = feel === "punk" ? [1, 0, 0, 1, 0, 0, 1, 0] : feel === "spy" ? [0, 0, 1, 0, 0, 0, 1, 0] : [0, 0, 1, 0, 0, 1, 0, 0];
        for (const k of on) { gtrA.push(k ? name(a) : "-"); gtrB.push(k ? name(b) : "-"); }
    }
    const n = chords.length * 8;
    const tracks = [
        { wave: "sawtooth", notes: bass.join(" "), volume: 0.13 * volume, decay: 0.14 },
        { wave: "square", notes: gtrA.join(" "), volume: 0.042 * volume, decay: 0.1 },
        { wave: "square", notes: gtrB.join(" "), volume: 0.042 * volume, decay: 0.1 },
    ];
    if (lead) { const t = lead.trim().split(/\s+/), full = []; for (let i = 0; i < n; i++) full.push(t[i % t.length]); tracks.push({ wave: leadWave, notes: full.join(" "), volume: (leadWave === "square" ? 0.05 : 0.09) * volume, decay: 0.18 }); }
    if (drums) {
        const k = [], s = [], h = [];
        for (let i = 0; i < n; i++) { const b = i % 8; k.push(b === 0 || b === 4 || (feel === "punk" && b === 3) ? "C2" : "-"); s.push(b === 2 || b === 6 ? "C3" : "-"); h.push("C6"); }
        tracks.push({ wave: "sine", notes: k.join(" "), volume: 0.3 * volume, decay: 0.11, slide: 0.5 }, { wave: "noise", notes: s.join(" "), volume: 0.11 * volume, decay: 0.09 }, { wave: "noise", notes: h.join(" "), volume: 0.02 * volume, decay: 0.025 });
    }
    return { bpm, steps: 2, tracks };
}

export const SONGS = {
    title: song({ bpm: 148, chords: ["C", "Am", "F", "G7", "C", "Am", "F", "G7"], feel: "punk", lead: "C5 - E5 - G5 - E5 - A5 - G5 - E5 - C5 - F5 - A5 - C6 - A5 - G5 - F5 - D5 - B4 -" }),
    stage1: song({ bpm: 150, chords: ["A", "A", "D", "E", "A", "F#m", "D", "E"], feel: "punk", lead: "E5 - - C#5 E5 - F#5 - E5 - C#5 - A4 - - - F#5 - A5 - F#5 - E5 - G#5 - E5 - B4 - - -" }),
    stage2: song({ bpm: 132, chords: ["Em", "Em", "C", "B7", "Em", "G", "C", "B7"], feel: "spy", lead: "E5 - - G5 - - B5 - A5 - G5 - F#5 - E5 - C5 - E5 - G5 - E5 - D#5 - F#5 - B4 - - -" }),
    stage3: song({ bpm: 156, chords: ["G", "C", "G", "D7", "G", "E", "A7", "D7"], feel: "gallop", lead: "D5 D5 - B4 D5 - G5 - E5 E5 - C5 E5 - G5 - D5 D5 - B4 D5 - G5 - F#5 - A5 - C6 - A5 - " }),
    stage4: song({ bpm: 126, chords: ["Dm", "Bb", "F", "A7", "Dm", "Bb", "Gm", "A7"], feel: "spy", lead: "A4 - D5 - F5 - - E5 D5 - - - Bb4 - D5 - - F5 - A5 - G5 F5 - E5 - C#5 - - - ", leadWave: "triangle" }),
    stage5: song({ bpm: 112, chords: ["Am7", "Dm7", "Am7", "E7", "F", "Dm7", "Bb", "E7"], feel: "walk", lead: "E5 - - - G5 - E5 - F5 - - - A5 - F5 - E5 - D5 - C5 - B4 - G#4 - B4 - E5 - - -", leadWave: "triangle", volume: 0.9 }),
    stage6: song({ bpm: 164, chords: ["Cm", "Ab", "Bb", "Cm", "Cm", "Ab", "G7", "G7"], feel: "punk", lead: "C5 - Eb5 - G5 - C6 - Bb5 - G5 - F5 - Eb5 - D5 - Eb5 - F5 - G5 - B4 - D5 - G5 - - -" }),
    boss: song({ bpm: 172, chords: ["Em5", "Em5", "C5", "D5", "Em5", "Em5", "A5", "B5"], feel: "gallop", lead: "E5 E5 - E5 G5 - E5 - E5 E5 - D5 C5 - B4 - E5 E5 - E5 G5 - B5 - A5 - F#5 - D#5 - B4 -" }),
    win: song({ bpm: 140, chords: ["C", "G", "Am", "F", "C", "G", "F", "G"], feel: "walk", lead: "G5 - E5 - C5 - E5 - G5 - B5 - D6 - - - C6 - A5 - E5 - A5 - C6 - A5 - F5 - A5 - C6 - - - G5 - B5 - D6 - B5 -", drums: true }),
    lose: song({ bpm: 92, chords: ["Am", "E7", "Am", "E7"], feel: "walk", lead: "A4 - - C5 - - B4 - G#4 - - B4 - - E4 - ", leadWave: "triangle", drums: false }),
};

const N = (decay, volume, freq = 1200, to = 300) => ({ wave: "noise", freq, to, decay, volume });
const S = (freq, to, decay, volume = 0.2, wave = "sine", at = 0) => ({ wave, freq, to, decay, volume, at });
const FX = {
    swing: [N(0.09, 0.05, 2600, 600)],
    swingH: [N(0.16, 0.08, 1500, 300)],
    hit: [N(0.05, 0.16, 3000, 800), S(190, 90, 0.08, 0.26)],
    hit2: [N(0.06, 0.17, 2400, 600), S(240, 110, 0.08, 0.26)],
    hit3: [N(0.06, 0.18, 2000, 500), S(150, 70, 0.1, 0.3)],
    clang: [S(1240, 900, 0.22, 0.09, "square"), S(1860, 1400, 0.16, 0.06, "square", 0.01), N(0.05, 0.14, 5000, 2000), S(120, 60, 0.12, 0.3)],
    bonk: [S(620, 170, 0.14, 0.2, "triangle"), N(0.04, 0.16, 1800, 500), S(110, 60, 0.12, 0.34)],
    big: [N(0.14, 0.26, 2200, 200), S(140, 40, 0.24, 0.5), S(420, 120, 0.1, 0.12, "square")],
    block: [S(900, 600, 0.08, 0.1, "square"), N(0.03, 0.1, 4000, 2000)],
    crack: [N(0.2, 0.3, 3600, 400), S(300, 60, 0.2, 0.3, "square")],
    jump: [S(240, 620, 0.12, 0.09, "triangle")],
    land: [S(120, 60, 0.08, 0.16), N(0.04, 0.06, 700, 200)],
    dodge: [N(0.14, 0.09, 900, 3200), S(300, 800, 0.1, 0.05, "triangle")],
    perfect: [S(880, 880, 0.1, 0.09, "triangle"), S(1320, 1320, 0.14, 0.09, "triangle", 0.07), S(1760, 1760, 0.2, 0.08, "triangle", 0.14)],
    grab: [S(200, 120, 0.1, 0.16, "square"), N(0.04, 0.08, 1200, 500)],
    toss: [N(0.22, 0.12, 700, 2600), S(180, 520, 0.2, 0.1, "triangle")],
    tel: [S(740, 980, 0.1, 0.06, "square")],
    telBig: [S(330, 440, 0.16, 0.09, "square"), S(330, 440, 0.16, 0.09, "square", 0.16)],
    hurt: [N(0.09, 0.2, 1400, 300), S(320, 90, 0.2, 0.24, "square")],
    ko: [S(520, 60, 0.6, 0.18, "square")],
    freed: [S(660, 660, 0.07, 0.07, "triangle"), S(990, 990, 0.1, 0.07, "triangle", 0.06)],
    food: [S(520, 780, 0.1, 0.1, "triangle"), S(780, 1040, 0.14, 0.09, "triangle", 0.08)],
    weapon: [S(300, 300, 0.07, 0.1, "square"), S(600, 600, 0.12, 0.1, "square", 0.06)],
    brk: [N(0.18, 0.2, 2600, 500), S(180, 70, 0.14, 0.2)],
    splat: [N(0.12, 0.14, 700, 160), S(200, 70, 0.14, 0.18, "triangle")],
    explode: [N(0.34, 0.34, 1600, 90), S(110, 36, 0.4, 0.5)],
    throwHit: [N(0.1, 0.2, 2000, 300), S(210, 60, 0.16, 0.4)],
    strike: [S(523, 523, 0.1, 0.1, "square"), S(659, 659, 0.1, 0.1, "square", 0.08), S(784, 784, 0.1, 0.1, "square", 0.16), S(1047, 1047, 0.3, 0.1, "square", 0.24)],
    soup1: [N(0.3, 0.2, 500, 2000), S(160, 80, 0.3, 0.3)],
    soup2: [N(0.5, 0.28, 400, 2600), S(120, 50, 0.5, 0.4), S(330, 660, 0.3, 0.1, "square")],
    soup3: [S(90, 40, 1.1, 0.55), N(0.9, 0.36, 300, 2400), S(220, 880, 0.7, 0.1, "sawtooth")],
    whistle: [S(2300, 2500, 0.34, 0.09, "square"), S(2600, 2300, 0.2, 0.05, "square", 0.05)],
    charge: [S(220, 880, 0.5, 0.08, "sawtooth")],
    tag: [S(392, 392, 0.07, 0.11, "square"), S(587, 587, 0.07, 0.11, "square", 0.07), S(784, 784, 0.14, 0.11, "square", 0.14)],
    tagLand: [S(150, 60, 0.18, 0.4), N(0.1, 0.18, 1800, 300)],
    gradeUp: [S(660, 990, 0.14, 0.1, "square"), S(990, 1320, 0.14, 0.08, "square", 0.09)],
    combo: [S(523, 784, 0.16, 0.07, "triangle")],
    go: [S(523, 523, 0.08, 0.1, "square"), S(784, 784, 0.16, 0.1, "square", 0.09)],
    bell: [S(1046, 1040, 0.6, 0.12), S(2093, 2080, 0.4, 0.05, "sine", 0.0), S(1046, 1040, 0.5, 0.11, "sine", 0.26), S(2093, 2080, 0.3, 0.05, "sine", 0.26)],
    bossTel: [S(180, 300, 0.22, 0.14, "square")],
    bossSlam: [N(0.24, 0.3, 1400, 120), S(90, 34, 0.36, 0.6)],
    bossHit: [N(0.2, 0.28, 1300, 200), S(160, 70, 0.26, 0.4), S(70, 40, 0.3, 0.3)],
    bossDie: [S(440, 50, 1.4, 0.26, "square"), N(1.2, 0.3, 2000, 100)],
    bossPop: [N(0.5, 0.4, 2600, 100), S(110, 30, 0.7, 0.6)],
    shush: [N(0.8, 0.2, 5200, 3000)],
    stamp: [S(90, 40, 0.2, 0.6), N(0.06, 0.2, 1400, 300)],
    click: [S(660, 880, 0.06, 0.09, "square")],
    pause: [S(440, 330, 0.08, 0.08, "square")],
};
const HAPTIC = { hit: "tick", hit2: "tick", hit3: "light", clang: "medium", bonk: "medium", big: "heavy", crack: "heavy", perfect: "success", grab: "medium", toss: "light", hurt: "error", ko: "error", food: "light", weapon: "light", brk: "medium", splat: "light", explode: "heavy", throwHit: "heavy", strike: "success", soup1: "heavy", soup2: "heavy", soup3: [30, 30, 60, 30, 120], tagLand: "heavy", gradeUp: "light", go: "light", bossSlam: "heavy", bossHit: "medium", bossDie: "heavy", bossPop: [40, 30, 80], stamp: "heavy", click: "tick", jump: "tick", land: "tick", dodge: "light", tel: "tick", telBig: "warn", bossTel: "warn" };

export class Sound {
    constructor(game) { this.g = game; this.song = null; this.nHit = 0; }
    play(name, o = {}) { const t = FX[name]; if (!t) return; this.g.sfx(t, { haptic: o.silent ? undefined : HAPTIC[name] }); }
    hit() { this.play(["hit", "hit2", "hit3"][this.nHit++ % 3]); }
    music(name) { if (this.song === name) return; this.song = name; this.g.stopMusic?.(); this.g.music(SONGS[name]); }
    stop() { this.song = null; this.g.stopMusic?.(); }
}
