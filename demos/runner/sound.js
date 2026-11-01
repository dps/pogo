// Every sound in one place. Songs share one shape: a bass, a chord stab or arp, a tune, and light drums.
// Custom tones get an explicit haptic where the hand should feel them.

const pad = (notes) => notes.join(" ");
/** Spread a progression of triads across a pattern. pattern letters: 1 2 3 chord notes, b bass, - rest. */
function fill(prog, pattern) {
    const out = [];
    for (const ch of prog) for (const c of pattern) {
        if (c === "-") out.push("-");
        else if (c === "b") out.push(ch[0].replace(/\d/, (n) => String(n - 1)));
        else out.push(ch[Number(c) - 1]);
    }
    return pad(out);
}
const kick = (bars, pat = "x---x---") => pad([...pat.repeat(bars)].map((c) => (c === "x" ? "C2" : "-")));
const hat = (bars, pat = "--x---x-") => pad([...pat.repeat(bars)].map((c) => (c === "x" ? "C7" : "-")));
const song = (bpm, bass, stab, tune, o = {}) => ({
    bpm, steps: 2,
    tracks: [
        { wave: o.bassWave ?? "triangle", notes: bass, volume: 0.2, decay: 0.28 },
        { wave: o.stabWave ?? "square", notes: stab, volume: 0.05, decay: 0.16 },
        { wave: o.leadWave ?? "triangle", notes: tune, volume: 0.13, decay: o.leadDecay ?? 0.32 },
        { wave: "sine", notes: kick(o.bars ?? 4, o.kick), volume: 0.22, decay: 0.14, slide: 0.5 },
        { wave: "noise", notes: hat(o.bars ?? 4, o.hat), volume: 0.035, decay: 0.05 },
    ],
});

const G = ["G3", "B3", "D4"], C = ["C4", "E4", "G4"], D = ["D4", "F#4", "A4"], Em = ["E4", "G4", "B4"], Am = ["A3", "C4", "E4"], F = ["F3", "A3", "C4"], Bb = ["A#3", "D4", "F4"], Dm = ["D4", "F4", "A4"], E7 = ["E4", "G#4", "B4"], A = ["A3", "C#4", "E4"], Fm = ["F3", "G#3", "C4"], Cm = ["C4", "D#4", "G4"], Eb = ["D#4", "G4", "A#4"], Ab = ["G#3", "C4", "D#4"];

export const SONGS = {
    // Barn dance: a daft banjo-ish plod with a tune you could whistle.
    title: song(112, fill([G, C, G, D], "b-1-b-2-"), fill([G, C, G, D], "--2---3-"), "G4 - B4 D5 - B4 G4 - C5 - E5 - D5 C5 B4 - G4 - B4 D5 G5 - D5 - F#5 - E5 - D5 - - -"),
    farm: song(132, fill([G, C, G, D, Em, C, D, G], "b-1-").replace(/$/, ""), fill([G, C, G, D, Em, C, D, G], "2-3-"), "D5 B4 G4 B4 C5 E5 D5 C5 B4 D5 G5 D5 A4 C5 B4 A4 G4 B4 E5 B4 C5 E5 G5 E5 F#5 E5 D5 A4 G5 - - -", { bars: 4 }),
    // A brass-band oom-pah for the village fete.
    village: song(138, fill([F, Bb, C, F, Dm, Bb, C, F].map((x, i) => x), "b-3-"), fill([F, Bb, ["C4", "E4", "G4"], F, Dm, Bb, ["C4", "E4", "G4"], F], "--1-"), "C5 A4 C5 F5 D5 A#4 D5 F5 E5 C5 E5 G5 F5 - C5 - D5 F5 A5 F5 D5 F5 A#5 F5 G5 E5 C5 E5 F5 - - -", { leadWave: "square", stabWave: "triangle" }),
    // Driving eighths on the bass, like the seams in the road.
    motorway: song(144, fill([Am, F, C, G], "bbbbbbbb"), fill([Am, F, C, G], "1-2-3-2-"), "A4 - C5 E5 - D5 C5 - A4 - C5 F5 - E5 D5 - G4 - C5 E5 - D5 C5 - B4 - D5 G5 - F#5 E5 D5", { bassWave: "sawtooth", kick: "x---x---" }),
    // Lounge bossa: departures-board calm while everything falls apart.
    airport: song(148, fill([Dm, G, C, Am], "b--2b-1-"), fill([Dm, G, C, Am], "1--2-3--"), "A4 - F5 E5 - D5 - C5 B4 - D5 G5 - F5 E5 - G5 - E5 D5 - C5 - E5 A4 - C5 E5 - D5 C5 B4", { stabWave: "sine", leadWave: "sine", kick: "x--x--x-" }),
    // Sleigh-bell gallop.
    ski: song(156, fill([D, A, Em, G], "b-1-b-2-"), fill([D, A, Em, G], "1313"+"2323"), "F#5 A5 F#5 D5 E5 F#5 A5 - E5 A5 E5 C#5 D5 E5 A5 - G5 E5 B4 E5 G5 B5 G5 - D5 G5 B5 G5 F#5 E5 D5 -", { hat: "x-x-x-x-" }),
    // Minor arps climbing to the rocket.
    launch: song(164, fill([Cm, Ab, Eb, ["A#3", "D4", "F4"]], "bb-bbb-b"), fill([Cm, Ab, Eb, ["A#3", "D4", "F4"]], "12312312"), "C5 - D#5 G5 - F5 D#5 D5 C5 - D#5 G#5 - G5 F5 D#5 D#5 - G5 A#5 - G5 F5 D#5 D5 - F5 A#5 - G#5 G5 F5", { bassWave: "sawtooth", stabWave: "sawtooth", hat: "x-x-x-x-" }),
    panic: song(176, fill([Am, E7], "bbbbbbbb"), fill([Am, E7], "12312312"), "A4 C5 E5 A5 E5 C5 A4 C5 G#4 B4 E5 G#5 E5 B4 G#4 B4", { bars: 2, bassWave: "sawtooth", hat: "x-x-x-x-" }),
};

const T = (o) => o;
export const SFX = {
    lane: T({ wave: "sine", freq: 340, to: 520, decay: 0.07, volume: 0.09 }),
    wall: T([{ wave: "square", freq: 110, to: 70, decay: 0.08, volume: 0.1 }]),
    jump: T([{ wave: "square", freq: 240, to: 640, decay: 0.14, volume: 0.09 }, { wave: "sine", freq: 480, to: 900, decay: 0.12, volume: 0.07, at: 0.02 }]),
    land: T({ wave: "sine", freq: 150, to: 60, decay: 0.09, volume: 0.2 }),
    slide: T([{ wave: "noise", freq: 2000, to: 500, decay: 0.26, volume: 0.1 }, { wave: "sine", freq: 500, to: 180, decay: 0.2, volume: 0.07 }]),
    egg: [523, 587, 659, 698, 784, 880, 988, 1047].map((f) => T([{ wave: "triangle", freq: f, decay: 0.09, volume: 0.1 }, { wave: "sine", freq: f * 2, decay: 0.12, volume: 0.05, at: 0.03 }])),
    near: [0, 1, 2, 3, 4, 5].map((i) => T([{ wave: "noise", freq: 3000, to: 900, decay: 0.16, volume: 0.09 }, { wave: "square", freq: 440 * Math.pow(1.122, i), to: 660 * Math.pow(1.122, i), decay: 0.11, volume: 0.07 }])),
    wear: T([523, 659, 784, 1047, 1319].map((f, i) => ({ wave: "square", freq: f, decay: 0.12, volume: 0.07, at: i * 0.055 }))),
    honk: T([{ wave: "sawtooth", freq: 310, to: 170, decay: 0.22, volume: 0.12 }, { wave: "square", freq: 155, to: 90, decay: 0.24, volume: 0.08 }]),
    stumble: T([{ wave: "square", freq: 220, to: 90, decay: 0.2, volume: 0.13 }, { wave: "noise", freq: 900, to: 200, decay: 0.18, volume: 0.1 }, { wave: "sawtooth", freq: 620, to: 260, decay: 0.2, volume: 0.09, at: 0.05 }]),
    smash: T([{ wave: "noise", freq: 2400, to: 300, decay: 0.2, volume: 0.15 }, { wave: "sine", freq: 180, to: 50, decay: 0.16, volume: 0.17 }]),
    crash: T([{ wave: "noise", freq: 1500, to: 120, decay: 0.42, volume: 0.22 }, { wave: "sine", freq: 170, to: 34, decay: 0.42, volume: 0.28 }, { wave: "sawtooth", freq: 460, to: 110, decay: 0.3, volume: 0.09, at: 0.04 }]),
    oi: T([{ wave: "sawtooth", freq: 180, to: 260, decay: 0.12, volume: 0.1 }, { wave: "sawtooth", freq: 260, to: 190, decay: 0.16, volume: 0.1, at: 0.11 }]),
    mission: T([659, 784, 1047, 1319].map((f, i) => ({ wave: "triangle", freq: f, decay: 0.2, volume: 0.12, at: i * 0.08 }))),
    biome: T([392, 523, 659, 784].map((f, i) => ({ wave: "square", freq: f, decay: 0.3, volume: 0.07, at: i * 0.1 }))),
    blink: T({ wave: "square", freq: 900, decay: 0.05, volume: 0.05 }),
    off: T({ wave: "triangle", freq: 700, to: 220, decay: 0.2, volume: 0.1 }),
    retry: T([{ wave: "sine", freq: 300, to: 900, decay: 0.12, volume: 0.1 }, { wave: "noise", freq: 3000, to: 1200, decay: 0.12, volume: 0.05 }]),
    over: T([494, 466, 440, 392].map((f, i) => ({ wave: "triangle", freq: f, decay: 0.28, volume: 0.13, at: i * 0.14 }))),
    getaway: T([523, 659, 784, 1047, 784, 1047, 1319, 1568].map((f, i) => ({ wave: "square", freq: f, decay: 0.2, volume: 0.09, at: i * 0.09 }))),
    tick: T({ wave: "sine", freq: 880, decay: 0.05, volume: 0.07 }),
    buy: T([784, 1047, 1319].map((f, i) => ({ wave: "triangle", freq: f, decay: 0.18, volume: 0.12, at: i * 0.07 }))),
};

export class Sound {
    constructor(game) {
        this.game = game; this.current = null; this.eggStep = 0; this.eggAt = -9;
        this.wind = null; this.jet = null; this.musicOn = true;
    }
    apply(prefs) {
        this.game.audio.muted = !prefs.sound;
        this.musicOn = prefs.music;
        this.game.haptics.enabled = prefs.haptics;
        if (!prefs.music) { this.game.stopMusic(); this.current = null; }
    }
    song(name) {
        if (!this.musicOn || this.current === name) return;
        this.current = name;
        this.game.music(SONGS[name]);
    }
    stopSong() { this.current = null; this.game.stopMusic(); }
    play(name, haptic) { this.game.sfx(SFX[name], haptic ? { haptic } : undefined); }
    egg(now) {
        this.eggStep = now - this.eggAt < 0.32 ? Math.min(this.eggStep + 1, 7) : 0;
        this.eggAt = now;
        this.game.sfx(SFX.egg[this.eggStep], { haptic: "tick" });
    }
    near(chain) { this.game.sfx(SFX.near[Math.min(chain - 1, 5)], { haptic: [6, 26, 14] }); }
    /** Wind grows with speed; jet noise joins while flying. Quiet, and silent where audio is blocked. */
    tone(speed, flying) {
        if (!this.wind) this.wind = this.game.audio.voice({ wave: "noise", freq: 700, volume: 0 });
        this.wind.set({ freq: 400 + speed * 22, volume: Math.min(0.05, speed * 0.0014) });
        if (flying && !this.jet) this.jet = this.game.audio.voice({ wave: "sawtooth", freq: 90, volume: 0.05 });
        if (!flying && this.jet) { this.jet.stop(); this.jet = null; }
        if (this.jet) this.jet.set({ freq: 85 + Math.random() * 0 + speed * 0.5 });
    }
    hush() { this.wind?.set({ volume: 0 }); if (this.jet) { this.jet.stop(); this.jet = null; } }
}
