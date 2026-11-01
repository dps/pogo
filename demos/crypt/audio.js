// Sound. Every event has a small tone paired with a deliberate haptic, and every mood has a song.
const rep = (s, n) => Array(n).fill(s).join(" ");

export const SONGS = {
    // Title: a tired little tango in A minor.
    title: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.28, notes: "A2 - - A2 E2 - A2 - D3 - - D3 A2 - D3 - E2 - - E2 B2 - E2 - A2 - - A2 E2 - G#2 -" },
        { wave: "square", volume: 0.035, decay: 0.3, notes: "E5 - C5 - A4 - B4 C5 D5 - A4 - F4 - A4 - B4 - G#4 - E4 - G#4 B4 C5 - A4 - E4 - - -" },
        { wave: "noise", volume: 0.025, decay: 0.03, notes: rep("C5 - - C5 - - C5 -", 4) },
    ] },
    // Catacombs: dusty waltz-time bassoon walk.
    cata: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.3, notes: "D3 - A2 - A2 - D3 - A2 - A2 - G2 - D3 - D3 - C3 - G2 - G2 - A2 - E3 - E3 - A2 - E3 - C#3 -" },
        { wave: "square", volume: 0.03, decay: 0.26, notes: "F4 - A4 - D5 - E5 - D5 - A4 - Bb4 - D5 - G5 - F5 - E5 - D5 - C#5 - E5 - A5 - G5 - E5 - C#5 -" },
    ] },
    // Baths: glassy and drippy.
    bath: { bpm: 84, steps: 2, tracks: [
        { wave: "sine", volume: 0.2, decay: 0.5, notes: "C3 - - - G3 - - - A2 - - - E3 - - - F2 - - - C3 - - - G2 - - - D3 - - -" },
        { wave: "triangle", volume: 0.07, decay: 0.45, notes: "E5 - G5 - B5 - - G5 C5 - E5 - A5 - - E5 A4 - C5 - F5 - - C5 B4 - D5 - G5 - - B4" },
    ] },
    // Resort: a pounding lounge number.
    fire: { bpm: 128, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.06, decay: 0.13, notes: "E2 E2 E3 E2 - E2 E3 - C2 C2 C3 C2 - C2 C3 - D2 D2 D3 D2 - D2 D3 - B1 B1 B2 B1 - D#2 F#2 B2" },
        { wave: "square", volume: 0.03, decay: 0.2, notes: "G5 - E5 - B4 - E5 - G5 - C6 - B5 - G5 - F#5 - D5 - A4 - D5 - F#5 - A5 - D#5 - F#5 -" },
        { wave: "noise", volume: 0.04, decay: 0.04, notes: rep("C4 - C5 - C4 C4 C5 -", 4) },
    ] },
    // Hotel: sly, chromatic lift music.
    hex: { bpm: 100, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.26, notes: "A2 - E3 - A2 - E3 - G#2 - E3 - G#2 - E3 - G2 - E3 - G2 - E3 - F#2 - D3 - B2 - E3 -" },
        { wave: "sine", volume: 0.09, decay: 0.34, notes: "C5 - E5 A5 - G#5 - E5 B4 - E5 G#5 - F5 - E5 Bb4 - D5 G5 - F5 - D5 A4 - D5 F#5 - G#5 - B5" },
        { wave: "noise", volume: 0.018, decay: 0.03, notes: rep("- C5 - C5", 12) },
    ] },
    // Bosses: oompah terror.
    boss: { bpm: 140, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.075, decay: 0.12, notes: "A1 A1 A2 A1 A1 A2 A1 A2 F1 F1 F2 F1 F1 F2 F1 F2 G1 G1 G2 G1 G1 G2 G1 G2 E1 E1 E2 E1 G#1 G#2 B1 E2" },
        { wave: "square", volume: 0.04, decay: 0.16, notes: "A4 - C5 E5 A5 - G5 E5 F5 - A5 C6 F5 - E5 D5 G4 - B4 D5 G5 - F5 D5 E5 - G#5 B5 E5 - D5 B4" },
        { wave: "noise", volume: 0.05, decay: 0.05, notes: rep("C3 - C5 - C3 C3 C5 -", 4) },
    ] },
    // Monday: the same tune but the alarm is going off.
    finale: { bpm: 156, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.07, decay: 0.1, notes: "D2 D2 D3 D2 D2 D3 D2 D3 Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 Bb1 Bb2 C2 C2 C3 C2 C2 C3 C2 C3 A1 A1 A2 A1 C#2 A2 E2 A2" },
        { wave: "square", volume: 0.035, decay: 0.06, notes: rep("A6 - A6 - - - - -", 4) },
        { wave: "square", volume: 0.035, decay: 0.2, notes: "D5 F5 A5 D6 - C6 A5 F5 Bb4 D5 F5 Bb5 - A5 F5 D5 C5 E5 G5 C6 - Bb5 G5 E5 A4 C#5 E5 A5 G5 E5 C#5 A4" },
        { wave: "noise", volume: 0.05, decay: 0.04, notes: rep("C3 C5 C5 C5", 8) },
    ] },
    // Gift shop: bossa muzak with a straight face.
    shop: { bpm: 92, steps: 2, tracks: [
        { wave: "triangle", volume: 0.19, decay: 0.3, notes: "F2 - - C3 - - F2 - E2 - - B2 - - E2 - D2 - - A2 - - D2 - G2 - - D3 - - C3 -" },
        { wave: "sine", volume: 0.09, decay: 0.3, notes: "A4 C5 E5 - C5 A4 - G4 G#4 B4 E5 - B4 G#4 - A4 F4 A4 D5 - A4 F4 - E4 F4 B4 D5 - E5 C5 - -" },
        { wave: "noise", volume: 0.02, decay: 0.03, notes: rep("C5 - - C5 - - C5 -", 4) },
    ] },
    // Holiday snaps: wistful, in a major key that doesn't quite believe it.
    snaps: { bpm: 76, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.5, notes: "C3 - G3 - E3 - G3 - A2 - E3 - C3 - E3 - F2 - C3 - A2 - C3 - G2 - D3 - B2 - D3 -" },
        { wave: "sine", volume: 0.1, decay: 0.55, notes: "E5 - - G5 - - C6 - C5 - - E5 - - A5 - A4 - - C5 - - F5 - D5 - - B4 - - G4 -" },
    ] },
};

export function makeFx(game) {
    const sfx = (t, h) => game.sfx(t, h ? { haptic: h } : undefined);
    let n = 0;
    return {
        step() { n++; sfx({ wave: "triangle", freq: n % 2 ? 150 : 132, to: 90, decay: 0.05, volume: 0.13 }, "tick"); },
        wait() { sfx({ wave: "sine", freq: 300, to: 240, decay: 0.08, volume: 0.1 }, "tick"); },
        shove() { sfx([{ wave: "square", freq: 170, to: 90, decay: 0.07, volume: 0.15 }, { wave: "noise", freq: 900, to: 300, decay: 0.05, volume: 0.1 }], "light"); },
        slam() { sfx([{ wave: "sine", freq: 130, to: 50, decay: 0.16, volume: 0.32 }, { wave: "noise", freq: 500, to: 120, decay: 0.08, volume: 0.13 }]); },
        bonk() { sfx([{ wave: "square", freq: 620, to: 160, decay: 0.14, volume: 0.2 }, { wave: "sine", freq: 180, to: 70, decay: 0.22, volume: 0.32 }, { wave: "triangle", freq: 1240, to: 900, at: 0.06, decay: 0.1, volume: 0.1 }]); },
        mstep(t) { sfx({ wave: "triangle", freq: 90 + (t % 5) * 18, to: 60, decay: 0.05, volume: 0.07 }); },
        bite() { sfx([{ wave: "sawtooth", freq: 240, to: 120, decay: 0.06, volume: 0.13 }]); },
        hurt() { sfx([{ wave: "sawtooth", freq: 320, to: 70, decay: 0.26, volume: 0.22 }, { wave: "noise", freq: 700, to: 200, decay: 0.12, volume: 0.13 }]); },
        shield() { sfx([{ wave: "sine", freq: 880, to: 1320, decay: 0.2, volume: 0.16 }]); },
        kill(how) {
            if (how === "pit") sfx([{ wave: "sine", freq: 900, to: 90, decay: 0.42, volume: 0.17 }, { wave: "noise", freq: 200, to: 80, at: 0.34, decay: 0.1, volume: 0.13 }]);
            else if (how === "lava") sfx([{ wave: "noise", freq: 2400, to: 400, decay: 0.3, volume: 0.15 }, { wave: "sine", freq: 300, to: 110, decay: 0.2, volume: 0.13 }]);
            else sfx([{ wave: "square", freq: 300, to: 80, decay: 0.15, volume: 0.13 }, { wave: "noise", freq: 1000, to: 200, decay: 0.1, volume: 0.1 }]);
        },
        boom() { game.sfx("explode"); },
        smash() { sfx([{ wave: "noise", freq: 1400, to: 200, decay: 0.16, volume: 0.2 }, { wave: "square", freq: 210, to: 70, decay: 0.08, volume: 0.1 }]); },
        coin() { sfx([{ wave: "square", freq: 988, decay: 0.05, volume: 0.1 }, { wave: "square", freq: 1319, at: 0.05, decay: 0.12, volume: 0.1 }], "tick"); },
        ticket() { sfx([{ wave: "triangle", freq: 660, decay: 0.08, volume: 0.17 }, { wave: "triangle", freq: 880, at: 0.07, decay: 0.08, volume: 0.17 }, { wave: "triangle", freq: 1320, at: 0.14, decay: 0.2, volume: 0.17 }], "light"); },
        tea() { sfx([{ wave: "sine", freq: 523, decay: 0.1, volume: 0.17 }, { wave: "sine", freq: 784, at: 0.08, decay: 0.2, volume: 0.17 }], "light"); },
        spit() { sfx([{ wave: "noise", freq: 2000, to: 500, decay: 0.08, volume: 0.13 }, { wave: "square", freq: 520, to: 200, decay: 0.08, volume: 0.09 }]); },
        windup() { sfx([{ wave: "sawtooth", freq: 80, to: 130, attack: 0.04, decay: 0.15, volume: 0.15 }]); },
        charge() { sfx([{ wave: "sawtooth", freq: 110, to: 240, decay: 0.14, volume: 0.18 }, { wave: "noise", freq: 400, to: 800, decay: 0.12, volume: 0.1 }], "medium"); },
        fuse() { sfx([{ wave: "noise", freq: 5000, to: 3000, decay: 0.25, volume: 0.08 }]); },
        crate() { sfx([{ wave: "triangle", freq: 180, to: 120, decay: 0.08, volume: 0.16 }, { wave: "noise", freq: 300, to: 200, decay: 0.08, volume: 0.1 }], "light"); },
        fill() { sfx([{ wave: "sine", freq: 150, to: 60, decay: 0.2, volume: 0.25 }], "medium"); },
        roll() { sfx([{ wave: "triangle", freq: 90, to: 140, decay: 0.2, volume: 0.17 }], "light"); },
        portal() { sfx([{ wave: "sine", freq: 300, to: 1200, decay: 0.14, volume: 0.13 }, { wave: "sine", freq: 1200, to: 300, at: 0.1, decay: 0.14, volume: 0.1 }], "light"); },
        door(open) { sfx(open ? [{ wave: "square", freq: 120, to: 200, decay: 0.12, volume: 0.1 }] : [{ wave: "square", freq: 110, to: 60, decay: 0.1, volume: 0.17 }, { wave: "noise", freq: 600, to: 200, decay: 0.08, volume: 0.13 }], "medium"); },
        mark() { sfx([{ wave: "square", freq: 1400, decay: 0.05, volume: 0.07 }, { wave: "square", freq: 1400, at: 0.1, decay: 0.05, volume: 0.07 }]); },
        lob() { sfx([{ wave: "sine", freq: 200, to: 700, decay: 0.26, volume: 0.13 }]); },
        tick() { sfx([{ wave: "square", freq: 1900, decay: 0.03, volume: 0.1 }, { wave: "triangle", freq: 950, decay: 0.05, volume: 0.1 }], "tick"); },
        spike() { sfx([{ wave: "noise", freq: 3500, to: 2000, decay: 0.05, volume: 0.09 }]); },
        shush() { sfx([{ wave: "noise", freq: 6000, to: 4000, attack: 0.04, decay: 0.3, volume: 0.15 }], "medium"); },
        frost() { sfx([{ wave: "sine", freq: 1500, to: 2400, decay: 0.3, volume: 0.1 }, { wave: "noise", freq: 8000, to: 5000, decay: 0.2, volume: 0.07 }], "medium"); },
        dig() { sfx([{ wave: "noise", freq: 400, to: 150, decay: 0.16, volume: 0.22 }, { wave: "sine", freq: 170, to: 60, decay: 0.16, volume: 0.22 }]); },
        hop() { sfx([{ wave: "square", freq: 300, to: 800, decay: 0.14, volume: 0.1 }], "light"); },
        bossHit() { sfx([{ wave: "sawtooth", freq: 440, to: 70, decay: 0.4, volume: 0.2 }, { wave: "sine", freq: 110, to: 40, decay: 0.34, volume: 0.32 }]); },
        bossDead() { sfx([{ wave: "sawtooth", freq: 500, to: 40, decay: 0.9, volume: 0.2 }, { wave: "noise", freq: 900, to: 100, decay: 0.8, volume: 0.17 }]); },
        // Menu and flow
        nope() { sfx({ wave: "square", freq: 110, to: 90, decay: 0.05, volume: 0.09 }, "tick"); },
        undo() { sfx([{ wave: "sine", freq: 900, to: 300, decay: 0.2, volume: 0.16 }, { wave: "triangle", freq: 450, to: 150, decay: 0.2, volume: 0.1 }], "medium"); },
        arm() { sfx([{ wave: "triangle", freq: 660, to: 880, decay: 0.08, volume: 0.14 }], "light"); },
        gate() { sfx([{ wave: "triangle", freq: 523, decay: 0.1, volume: 0.17 }, { wave: "triangle", freq: 659, at: 0.09, decay: 0.1, volume: 0.17 }, { wave: "triangle", freq: 784, at: 0.18, decay: 0.26, volume: 0.17 }], "success"); },
        exit() { sfx([{ wave: "square", freq: 1046, decay: 0.08, volume: 0.09 }, { wave: "square", freq: 1318, at: 0.08, decay: 0.08, volume: 0.09 }, { wave: "square", freq: 1568, at: 0.16, decay: 0.26, volume: 0.09 }], "success"); },
        till() { sfx([{ wave: "square", freq: 1760, decay: 0.05, volume: 0.09 }, { wave: "square", freq: 2637, at: 0.06, decay: 0.2, volume: 0.09 }, { wave: "noise", freq: 400, to: 200, decay: 0.05, volume: 0.1 }], "medium"); },
        shutter() { sfx([{ wave: "noise", freq: 3000, to: 1500, decay: 0.03, volume: 0.15 }, { wave: "noise", freq: 2000, to: 800, at: 0.07, decay: 0.05, volume: 0.13 }], "tick"); },
        death() { game.sfx("lose"); },
        victory() { game.sfx("win"); },
    };
}
