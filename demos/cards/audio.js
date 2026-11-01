// All sound in one place: small tones, a pentatonic ladder for chains, and a loop for each mood.
const PENTA = [0, 2, 4, 7, 9];
const f = (semi) => 220 * Math.pow(2, semi / 12);
export const ladder = (n) => f(Math.floor(n / 5) * 12 + PENTA[n % 5] + 3);
export function Sound(game) {
    const on = () => !game.audio.muted;
    const play = (tone, haptic) => game.sfx(tone, haptic ? { haptic } : undefined);
    return {
        notch(i) { play({ wave: "triangle", freq: 620 + i * 70, decay: 0.03, volume: 0.05 }, "tick"); },
        lift() { play({ wave: "sine", freq: 300, to: 520, decay: 0.07, volume: 0.07 }, "tick"); },
        snapBack() { play({ wave: "triangle", freq: 340, to: 220, decay: 0.07, volume: 0.06 }, "tick"); },
        deny() { play([{ wave: "square", freq: 170, decay: 0.07, volume: 0.05 }, { wave: "square", freq: 130, decay: 0.08, volume: 0.05, at: 0.07 }], "warn"); },
        fling() { play({ wave: "noise", freq: 900, to: 300, decay: 0.12, volume: 0.05 }, "light"); },
        plop(el) {
            const base = { ember: 260, brine: 330, moss: 220, rime: 440, hex: 196, gilt: 392, gunk: 110 }[el] ?? 260;
            play([{ wave: "sine", freq: base * 0.6, to: base * 1.7, decay: 0.12, volume: 0.13 }, { wave: "noise", freq: 500, decay: 0.06, volume: 0.05 }, { wave: "sine", freq: base * 1.8, to: base * 2.6, decay: 0.08, volume: 0.05, at: 0.06 }], "medium");
        },
        unplop() { play({ wave: "sine", freq: 500, to: 200, decay: 0.1, volume: 0.08 }, "light"); },
        primed() { play([{ wave: "sine", freq: 740, decay: 0.09, volume: 0.05 }, { wave: "sine", freq: 988, decay: 0.12, volume: 0.05, at: 0.06 }], "tick"); },
        fire(n, el) { const q = ladder(n); play([{ wave: "triangle", freq: q, decay: 0.12, volume: 0.09 }, { wave: "sine", freq: q * 2, decay: 0.07, volume: 0.03 }], n > 16 ? undefined : "tick"); },
        reaction(n) { const q = ladder(n + 4); play([{ wave: "sine", freq: q, to: q * 1.5, decay: 0.16, volume: 0.09 }, { wave: "triangle", freq: q * 1.5, decay: 0.2, volume: 0.05, at: 0.05 }, { wave: "noise", freq: 2000, decay: 0.09, volume: 0.03 }], "medium"); },
        reflux() { play({ wave: "sawtooth", freq: 300, to: 900, decay: 0.16, volume: 0.04 }, "medium"); },
        potency(n) { play({ wave: "triangle", freq: 440 + n * 60, to: 880 + n * 60, decay: 0.09, volume: 0.05 }); },
        hit(big) { play([{ wave: "square", freq: big ? 160 : 240, to: 60, decay: big ? 0.2 : 0.09, volume: big ? 0.11 : 0.07 }, { wave: "noise", freq: 800, decay: 0.06, volume: 0.06 }], big ? "heavy" : "medium"); },
        ward() { play({ wave: "triangle", freq: 520, to: 720, decay: 0.1, volume: 0.06 }, "light"); },
        heal() { play([{ wave: "sine", freq: 660, decay: 0.1, volume: 0.05 }, { wave: "sine", freq: 880, decay: 0.14, volume: 0.05, at: 0.07 }], "light"); },
        status() { play({ wave: "sawtooth", freq: 240, to: 180, decay: 0.1, volume: 0.03 }); },
        coin() { play([{ wave: "square", freq: 988, decay: 0.05, volume: 0.04 }, { wave: "square", freq: 1319, decay: 0.12, volume: 0.04, at: 0.05 }], "light"); },
        die() { play([{ wave: "sawtooth", freq: 300, to: 50, decay: 0.32, volume: 0.09 }, { wave: "noise", freq: 400, decay: 0.26, volume: 0.07 }], "heavy"); },
        ouch(big) { play([{ wave: "sawtooth", freq: big ? 110 : 150, to: 55, decay: 0.2, volume: 0.1 }, { wave: "noise", freq: 300, decay: 0.12, volume: 0.07 }], big ? "heavy" : "medium"); },
        tier(t) {
            const r = 220 * Math.pow(2, t / 6), ch = [1, 1.25, 1.5, 2].map((q, i) => ({ wave: "triangle", freq: r * q, decay: 0.42, volume: 0.07, at: i * 0.045 }));
            play([...ch, { wave: "noise", freq: 3000, decay: 0.26, volume: 0.04 }], t >= 3 ? [20, 30, 30, 30, 60] : [12, 30, 24]);
        },
        boilover() { play([0, 0.08, 0.16, 0.24, 0.32].flatMap((at, i) => [{ wave: "sawtooth", freq: 110 * Math.pow(2, i / 2), decay: 0.42, volume: 0.09, at }, { wave: "noise", freq: 200 + i * 300, decay: 0.3, volume: 0.06, at }]), [40, 30, 60, 30, 90, 30, 140]); },
        pour(total) { const big = total > 80; play([{ wave: "sine", freq: big ? 90 : 140, to: 40, decay: 0.42, volume: 0.16 }, { wave: "noise", freq: 200, decay: 0.34, volume: 0.09 }], big ? "heavy" : "medium"); },
        win() { play([523, 659, 784, 1047].map((freq, i) => ({ wave: "triangle", freq, decay: 0.3, volume: 0.09, at: i * 0.1 })), "success"); },
        lose() { play([330, 262, 220, 165].map((freq, i) => ({ wave: "sawtooth", freq, decay: 0.42, volume: 0.06, at: i * 0.2 })), "error"); },
        pick() { play([{ wave: "triangle", freq: 660, decay: 0.08, volume: 0.07 }, { wave: "triangle", freq: 990, decay: 0.12, volume: 0.07, at: 0.06 }], "light"); },
        page() { play({ wave: "noise", freq: 2600, to: 1400, decay: 0.08, volume: 0.03 }, "tick"); },
        step() { play({ wave: "sine", freq: 180, to: 120, decay: 0.08, volume: 0.09 }, "light"); },
        unlock() { play([523, 784, 1047, 1319, 1568].map((freq, i) => ({ wave: "sine", freq, decay: 0.42, volume: 0.07, at: i * 0.09 })), "success"); },
        toll() { play([{ wave: "sine", freq: 196, decay: 1.1, volume: 0.14 }, { wave: "sine", freq: 493, decay: 0.8, volume: 0.04 }], "heavy"); },
        whoosh() { play({ wave: "noise", freq: 400, to: 1800, decay: 0.2, volume: 0.04 }); },
    };
}
const arp = (chords, pat) => chords.map((c) => pat.map((i) => (i === null ? "-" : c[i])).join(" ")).join(" ");
const bar = (notes, per) => notes.map((n) => [n, ...Array(per - 1).fill("-")].join(" ")).join(" ");
const Am = ["A3", "C4", "E4", "A4"], F = ["F3", "A3", "C4", "F4"], C = ["C4", "E4", "G4", "C5"], G = ["G3", "B3", "D4", "G4"], Dm = ["D4", "F4", "A4", "D5"], E = ["E3", "G#3", "B3", "E4"];
export const SONGS = {
    title: { bpm: 84, steps: 2, tracks: [
        { wave: "triangle", volume: 0.1, decay: 0.42, notes: arp([Am, F, C, E], [0, 1, 2, 3, 2, 1, 2, 1]) },
        { wave: "sine", volume: 0.15, decay: 1.2, notes: bar(["A2", "F2", "C3", "E2"], 8) },
        { wave: "sine", volume: 0.05, decay: 0.8, notes: "E5 - - - - - - - C5 - - - A4 - - - G4 - - - - - E5 - G#4 - - - B4 - - -" },
    ] },
    map: { bpm: 72, steps: 2, tracks: [
        { wave: "triangle", volume: 0.09, decay: 0.5, notes: arp([Dm, Am, F, G], [0, null, 2, null, 1, null, 2, 3]) },
        { wave: "sine", volume: 0.13, decay: 1.4, notes: bar(["D3", "A2", "F2", "G2"], 8) },
    ] },
    combat: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.13, decay: 0.16, notes: "A2 - A2 - E3 - A2 - A2 - A2 - C3 - D3 - F2 - F2 - C3 - F2 - F2 - G2 - A2 - B2 - A2 - A2 - E3 - A2 - A2 - A2 - C3 - D3 - E2 - E2 - B2 - E2 - G#2 - B2 - E3 - D3 -" },
        { wave: "square", volume: 0.03, decay: 0.09, notes: arp([Am, F, Am, E], [2, 3, 1, 2, 3, 2, 1, 2, 2, 3, 1, 2, 3, 2, 1, 2]) },
        { wave: "noise", volume: 0.03, decay: 0.04, notes: Array(32).fill("C7 - C7 C7").join(" ").split(" ").slice(0, 64).join(" ") },
    ] },
    boss: { bpm: 132, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.08, decay: 0.14, notes: "A2 A2 - A2 C3 - A2 - A#2 - A2 - G2 - E2 - A2 A2 - A2 C3 - A2 - D3 - C3 - A#2 - G#2 -" },
        { wave: "square", volume: 0.03, decay: 0.1, notes: "E4 - A4 - C5 - A4 - E4 - A#4 - D5 - A#4 - E4 - A4 - C5 - A4 - F4 - G#4 - B4 - G#4 -" },
        { wave: "noise", volume: 0.05, decay: 0.05, slide: 0, notes: "C3 - C7 - C5 - C7 - C3 - C7 - C5 - C7 C7 C3 - C7 - C5 - C7 - C3 C3 C7 - C5 - C7 C7" },
    ] },
    frenzy: { bpm: 160, steps: 2, tracks: [
        { wave: "square", volume: 0.05, decay: 0.08, notes: "A4 C5 E5 A5 G5 E5 C5 E5 F4 A4 C5 F5 E5 C5 A4 C5 C5 E5 G5 C6 B5 G5 E5 G5 E4 G#4 B4 E5 D5 B4 G#4 B4" },
        { wave: "triangle", volume: 0.13, decay: 0.12, notes: "A2 - A3 - A2 - A3 - F2 - F3 - F2 - F3 - C3 - C4 - C3 - C4 - E2 - E3 - E2 - E3 -" },
        { wave: "noise", volume: 0.05, decay: 0.04, notes: "C3 C7 C7 C7 C5 C7 C7 C7 C3 C7 C7 C7 C5 C7 C7 C7 C3 C7 C7 C7 C5 C7 C7 C7 C3 C7 C5 C7 C5 C7 C5 C5" },
    ] },
    calm: { bpm: 60, steps: 2, tracks: [
        { wave: "sine", volume: 0.09, decay: 1.0, notes: arp([C, Am, F, G], [0, null, 2, null, 3, null, 2, null]) },
        { wave: "triangle", volume: 0.1, decay: 1.6, notes: bar(["C3", "A2", "F2", "G2"], 8) },
    ] },
    shop: { bpm: 104, steps: 2, tracks: [
        { wave: "triangle", volume: 0.11, decay: 0.2, notes: "D3 - A3 - D3 - A3 - G2 - D3 - G2 - D3 - D3 - A3 - D3 - A3 - A2 - E3 - A2 - C#3 -" },
        { wave: "square", volume: 0.03, decay: 0.12, notes: "- F4 - A4 - F4 - D4 - G4 - B4 - D5 - - F4 - A4 - D5 - A4 - G4 - E4 - C#4 - E4" },
    ] },
    victory: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.11, decay: 0.42, notes: arp([C, G, Am, F], [0, 1, 2, 3, 2, 3, 2, 1]) },
        { wave: "sine", volume: 0.14, decay: 1, notes: bar(["C3", "G2", "A2", "F2"], 8) },
        { wave: "sine", volume: 0.06, decay: 0.6, notes: "G5 - E5 - G5 - C6 - B5 - D5 - G5 - - - A5 - E5 - A5 - C6 - A5 - F5 - C6 - - -" },
    ] },
};
let current = null, wanted = null;
export function playSong(game, name) {
    wanted = name;
    if (current === name) return;
    current = name;
    if (!name || !game.data.musicOn) { game.stopMusic(); if (!game.data.musicOn) current = null; return; }
    game.music(SONGS[name]);
}
export const resetSong = () => { current = null; };
/** After the music toggle comes back on, pick up whatever this screen wanted. */
export const resumeSong = (game) => { current = null; if (wanted) playSong(game, wanted); };
