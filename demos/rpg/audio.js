// Muzak, boss funk and little office noises. Short loops on real chord changes, kept quiet enough to live with.
const drums = (bars, kick = "C2 - - - C2 - - - ", snare = "- - - - D3 - - - ") => ({ kick: kick.repeat(bars), snare: snare.repeat(bars) });
const song = (bpm, tracks, steps = 2) => ({ bpm, steps, tracks });
const chords = (list, pat) => list.map((c) => pat.map((i) => (i === "-" ? "-" : c[i])).join(" ")).join(" ");
const dm = { Dm7: ["D3", "F3", "A3", "C4"], G7: ["G2", "B2", "D3", "F3"], C: ["C3", "E3", "G3", "B3"], Am: ["A2", "C3", "E3", "G3"], F: ["F2", "A2", "C3", "E3"], E7: ["E2", "G#2", "B2", "D3"], Bb: ["Bb2", "D3", "F3", "A3"], Em: ["E3", "G3", "B3", "D4"], A7: ["A2", "C#3", "E3", "G3"], Gm: ["G2", "Bb2", "D3", "F3"], Eb: ["Eb3", "G3", "Bb3", "D4"], Cm: ["C3", "Eb3", "G3", "Bb3"], Ab: ["Ab2", "C3", "Eb3", "G3"], Fm: ["F2", "Ab2", "C3", "Eb3"] };
const pick = (names) => names.map((n) => dm[n]);
const bossa = (names, bpm, lead, wave = "triangle") => {
    const c = pick(names);
    return song(bpm, [
        { wave: "sine", notes: c.map((x) => `${x[0]} - - ${x[2]} - - ${x[0]} -`).join(" "), volume: 0.2, decay: 0.3 },
        { wave: "triangle", notes: chords(c, ["-", 1, 3, "-", 2, "-", 1, 3]), volume: 0.07, decay: 0.22 },
        { wave, notes: lead, volume: 0.075, decay: 0.3 },
        { wave: "noise", notes: "C6 - C6 C6 - C6 C6 - ".repeat(c.length), volume: 0.012, decay: 0.03 },
    ]);
};
export const MUSIC = {
    title: bossa(["Dm7", "G7", "C", "Am"], 104, "A4 - C5 - F5 E5 - C5 G4 - B4 - D5 - - - G4 - B4 - E5 D5 - B4 A4 - G4 - E4 - - -"),
    lobby: bossa(["C", "Am", "Dm7", "G7"], 96, "E4 - G4 - B4 - G4 - C5 - A4 - E4 - - - F4 - A4 - C5 - A4 - D5 - B4 - G4 - - -"),
    office: bossa(["F", "Dm7", "Bb", "C"], 108, "A4 - - C5 - A4 F4 - D5 - - C5 - A4 D4 - F4 - A4 - D5 C5 - A4 G4 - - E4 - G4 - -"),
    tense: bossa(["Am", "F", "Dm7", "E7"], 100, "A4 - - - E5 - - C5 F4 - A4 - C5 - - A4 D4 - F4 - A4 - G4 F4 E4 - - G#4 - B4 - -", "sine"),
    calm: bossa(["C", "F", "Am", "G7"], 80, "G4 - - - E4 - - - A4 - - - F4 - - - C5 - - - A4 - - - G4 - - - F4 - - -", "sine"),
    sad: song(70, [{ wave: "sine", notes: "A2 - - - E3 - - - F2 - - - C3 - - - D3 - - - A3 - - - E2 - - - B2 - - - ", volume: 0.2, decay: 0.8 }, { wave: "triangle", notes: "E4 - - - - - D4 C4 C4 - - - - - - - A3 - - - C4 - D4 - B3 - - - - - - - ", volume: 0.09, decay: 0.8 }]),
    battle: (() => { const c = pick(["Am", "Am", "F", "E7"]); return song(144, [
        { wave: "sawtooth", notes: "A2 A2 - A2 C3 - A2 G2 A2 A2 - A2 E3 - D3 C3 F2 F2 - F2 A2 - F2 G2 E2 E2 - E2 G#2 - B2 D3", volume: 0.12, decay: 0.12 },
        { wave: "square", notes: chords(c, [2, "-", 3, 2, "-", 1, 2, "-"]), volume: 0.035, decay: 0.08 },
        { wave: "square", notes: "E5 - E5 D5 C5 - A4 - E5 - G5 - E5 D5 C5 - F5 - F5 E5 C5 - A4 - G#4 - B4 - D5 - E5 -", volume: 0.05, decay: 0.12 },
        { wave: "sine", notes: drums(4).kick, volume: 0.26, decay: 0.12, slide: 0.5 },
        { wave: "noise", notes: drums(4).snare, volume: 0.05, decay: 0.09 },
        { wave: "noise", notes: "C7 - C7 - C7 - C7 C7 ".repeat(4), volume: 0.012, decay: 0.025 }]); })(),
    boss: (() => { const c = pick(["Dm7", "Bb", "Gm", "A7"]); return song(156, [
        { wave: "sawtooth", notes: "D2 D3 D2 D3 F3 D3 C3 A2 Bb1 Bb2 Bb1 Bb2 D3 Bb2 A2 F2 G1 G2 G1 G2 Bb2 G2 F2 D2 A1 A2 A1 A2 C#3 A2 E3 G3", volume: 0.12, decay: 0.1 },
        { wave: "square", notes: chords(c, [3, 2, "-", 3, "-", 2, 1, "-"]), volume: 0.04, decay: 0.08 },
        { wave: "square", notes: "A5 - F5 D5 - A5 G5 F5 - D5 Bb4 - F5 D5 - Bb4 G5 - D5 Bb4 - D5 F5 G5 A5 - - G5 E5 - C#5 -", volume: 0.055, decay: 0.12 },
        { wave: "sine", notes: "C2 - - C2 - - C2 - ".repeat(4), volume: 0.28, decay: 0.12, slide: 0.5 },
        { wave: "noise", notes: "- - C5 - - C5 - C5 ".repeat(4), volume: 0.05, decay: 0.08 }]); })(),
    final: (() => { const c = pick(["C", "Am", "F", "G7"]); return song(120, [   // hold music, gone wrong
        { wave: "sine", notes: c.map((x) => `${x[0]} - - ${x[2]} - - ${x[0]} -`).join(" "), volume: 0.2, decay: 0.3 },
        { wave: "sawtooth", notes: "E5 - - G5 - - E5 D5 C5 - - E5 - - A4 - F5 - - A5 - - F5 E5 D5 - - G5 - F5 D5 B4", volume: 0.05, decay: 0.2 },
        { wave: "square", notes: chords(c, [1, 2, 3, 2, 1, 2, 3, 2]), volume: 0.03, decay: 0.06 },
        { wave: "sine", notes: drums(4).kick, volume: 0.25, decay: 0.14, slide: 0.5 },
        { wave: "noise", notes: drums(4).snare, volume: 0.05, decay: 0.09 }]); })(),
    ending: bossa(["C", "Em", "F", "G7"], 92, "G4 - C5 - E5 - D5 C5 B4 - G4 - B4 - D5 - A4 - C5 - F5 - E5 D5 D5 - B4 - G4 - - -"),
};
const SFX = {
    step: { wave: "noise", freq: 400, decay: 0.03, volume: 0.015 },
    blip: { wave: "square", freq: 520, decay: 0.022, volume: 0.022 },
    open: [{ wave: "square", freq: 440, decay: 0.05, volume: 0.06 }, { wave: "square", freq: 660, decay: 0.06, volume: 0.06, at: 0.05 }],
    close: [{ wave: "square", freq: 660, decay: 0.05, volume: 0.05 }, { wave: "square", freq: 440, decay: 0.06, volume: 0.05, at: 0.05 }],
    encounter: [{ wave: "sawtooth", freq: 220, to: 880, decay: 0.28, volume: 0.1 }, { wave: "square", freq: 880, decay: 0.1, volume: 0.07, at: 0.28 }, { wave: "square", freq: 1174, decay: 0.16, volume: 0.07, at: 0.36 }],
    exclaim: [{ wave: "square", freq: 880, decay: 0.06, volume: 0.08 }, { wave: "square", freq: 1320, decay: 0.14, volume: 0.08, at: 0.07 }],
    staple: [{ wave: "noise", freq: 1800, decay: 0.05, volume: 0.2 }, { wave: "square", freq: 170, to: 80, decay: 0.09, volume: 0.13 }],
    paper: [{ wave: "noise", freq: 3200, to: 900, decay: 0.16, volume: 0.1 }],
    email: [{ wave: "sine", freq: 1320, decay: 0.08, volume: 0.1 }, { wave: "sine", freq: 1760, decay: 0.15, volume: 0.09, at: 0.08 }],
    tape: [{ wave: "noise", freq: 900, to: 2600, decay: 0.2, volume: 0.1 }],
    coffee: [{ wave: "sine", freq: 300, to: 720, decay: 0.12, volume: 0.09 }, { wave: "sine", freq: 420, to: 880, decay: 0.12, volume: 0.07, at: 0.1 }],
    hardware: [{ wave: "square", freq: 240, to: 90, decay: 0.12, volume: 0.13 }, { wave: "noise", freq: 2000, decay: 0.06, volume: 0.1 }],
    meeting: [{ wave: "triangle", freq: 523, decay: 0.2, volume: 0.1 }, { wave: "triangle", freq: 392, decay: 0.3, volume: 0.1, at: 0.16 }],
    tech: [{ wave: "square", freq: 1400, to: 300, decay: 0.15, volume: 0.07 }, { wave: "square", freq: 2000, decay: 0.05, volume: 0.05, at: 0.14 }],
    snack: [{ wave: "noise", freq: 1200, decay: 0.06, volume: 0.1 }, { wave: "noise", freq: 900, decay: 0.07, volume: 0.1, at: 0.09 }],
    wellness: [{ wave: "sine", freq: 660, decay: 0.45, volume: 0.09 }, { wave: "sine", freq: 990, decay: 0.45, volume: 0.05, at: 0.05 }],
    none: [{ wave: "triangle", freq: 300, to: 160, decay: 0.1, volume: 0.1 }],
    hit: [{ wave: "noise", freq: 700, decay: 0.09, volume: 0.17 }, { wave: "square", freq: 150, to: 60, decay: 0.12, volume: 0.13 }],
    superhit: [{ wave: "noise", freq: 900, decay: 0.14, volume: 0.22 }, { wave: "sawtooth", freq: 220, to: 55, decay: 0.2, volume: 0.16 }, { wave: "square", freq: 1320, decay: 0.09, volume: 0.06, at: 0.04 }],
    weakhit: [{ wave: "triangle", freq: 200, to: 120, decay: 0.08, volume: 0.12 }],
    faint: [{ wave: "sine", freq: 523, to: 110, decay: 0.5, volume: 0.13 }],
    levelup: [{ wave: "square", freq: 523, decay: 0.08, volume: 0.08 }, { wave: "square", freq: 659, decay: 0.08, volume: 0.08, at: 0.08 }, { wave: "square", freq: 784, decay: 0.08, volume: 0.08, at: 0.16 }, { wave: "square", freq: 1047, decay: 0.2, volume: 0.09, at: 0.24 }],
    catch: [{ wave: "triangle", freq: 880, decay: 0.08, volume: 0.1 }, { wave: "triangle", freq: 1108, decay: 0.08, volume: 0.1, at: 0.09 }, { wave: "triangle", freq: 1318, decay: 0.25, volume: 0.1, at: 0.18 }],
    shake: [{ wave: "triangle", freq: 330, to: 260, decay: 0.08, volume: 0.09 }],
    heal: [{ wave: "sine", freq: 523, to: 1047, decay: 0.3, volume: 0.09 }],
    status: [{ wave: "square", freq: 300, to: 220, decay: 0.18, volume: 0.07 }, { wave: "square", freq: 220, to: 160, decay: 0.2, volume: 0.07, at: 0.14 }],
    buff: [{ wave: "triangle", freq: 440, to: 880, decay: 0.16, volume: 0.1 }],
    debuff: [{ wave: "triangle", freq: 660, to: 330, decay: 0.16, volume: 0.1 }],
    promote: [{ wave: "square", freq: 392, decay: 0.12, volume: 0.08 }, { wave: "square", freq: 523, decay: 0.12, volume: 0.08, at: 0.13 }, { wave: "square", freq: 659, decay: 0.12, volume: 0.08, at: 0.26 }, { wave: "square", freq: 784, decay: 0.45, volume: 0.1, at: 0.39 }, { wave: "triangle", freq: 1047, decay: 0.5, volume: 0.1, at: 0.39 }],
    bump: [{ wave: "triangle", freq: 120, decay: 0.05, volume: 0.1 }],
    item: [{ wave: "square", freq: 784, decay: 0.08, volume: 0.07 }, { wave: "square", freq: 1175, decay: 0.16, volume: 0.07, at: 0.08 }],
    door: [{ wave: "noise", freq: 500, decay: 0.12, volume: 0.07 }, { wave: "square", freq: 110, decay: 0.08, volume: 0.07, at: 0.1 }],
    lift: [{ wave: "sine", freq: 880, decay: 0.5, volume: 0.1 }],
    sign: [{ wave: "noise", freq: 2800, decay: 0.04, volume: 0.13 }, { wave: "noise", freq: 2400, to: 900, decay: 0.2, volume: 0.09, at: 0.08 }],
};
const HAPTIC = { open: "light", close: "tick", staple: "medium", hit: "medium", superhit: "heavy", weakhit: "light", faint: "warn", levelup: "success", catch: "success", shake: "tick", heal: "light", status: "warn", buff: "light", debuff: "light", promote: "success", bump: "tick", item: "light", door: "light", encounter: "heavy", exclaim: "warn", sign: "success" };
export function audioKit(game) {
    let current = null;
    const kit = {
        play(name) { const s = SFX[name]; if (s) game.sfx(s, HAPTIC[name] ? { haptic: HAPTIC[name] } : undefined); },
        blip(v = 0) { game.sfx({ ...SFX.blip, freq: 420 + (v % 5) * 70 }); },
        music(name) { if (current === name) return; current = name; if (name && MUSIC[name]) game.music(MUSIC[name]); else game.stopMusic?.(); },
        get current() { return current; }, reset() { current = null; },
    };
    game.audioKit = kit;
    return kit;
}
