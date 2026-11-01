// Sound: every event has its own tone with a matching haptic. Short, round and toy-like, so it never grates over a 15 minute run.
const rep = (s, n) => Array(n).fill(s).join(" ");
export const SONGS = {
    title: { bpm: 112, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.26, notes: "C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - F2 - C3 - F2 - C3 - G2 - D3 - G2 - B2 -" },
        { wave: "square", volume: 0.035, decay: 0.16, notes: "E5 G5 C6 - G5 E5 - G5 A5 C6 E6 - C6 A5 - E5 F5 A5 C6 - A5 F5 - A5 G5 B5 D6 - B5 G5 - D5 -" },
        { wave: "noise", volume: 0.025, decay: 0.03, notes: rep("- - C5 -", 8) },
    ] },
    shop: { bpm: 126, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.2, notes: "F2 - C3 - F2 - C3 - D2 - A2 - D2 - A2 - G2 - D3 - G2 - D3 - C3 - G2 - C3 - E3 -" },
        { wave: "sine", volume: 0.1, decay: 0.16, notes: "A5 - C6 - F5 - A5 C6 F5 - A5 - D5 - F5 A5 G5 - B5 - D6 - B5 G5 E5 - G5 - C6 - E6 C6" },
        { wave: "noise", volume: 0.022, decay: 0.03, notes: rep("C5 - - - C5 - - C5", 4) },
    ] },
    battle: { bpm: 150, steps: 2, tracks: [
        { wave: "square", volume: 0.05, decay: 0.12, notes: "A2 A2 A3 A2 A2 A3 A2 A2 F2 F2 F3 F2 G2 G2 G3 G2 A2 A2 A3 A2 A2 A3 A2 A2 E2 E2 E3 E2 E2 E3 G#2 E3" },
        { wave: "triangle", volume: 0.13, decay: 0.14, notes: "E5 - A5 - C6 - B5 A5 F5 - A5 - G5 - B5 D6 E5 - A5 - C6 - E6 D6 B5 - G#5 - E5 - G#5 B5" },
        { wave: "noise", volume: 0.05, decay: 0.05, notes: rep("C3 - C5 - C3 C3 C5 -", 4) },
    ] },
    late: { bpm: 164, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.055, decay: 0.11, notes: "D2 D2 D3 D2 D2 D3 D2 D2 Bb1 Bb1 Bb2 Bb1 C2 C2 C3 C2 D2 D2 D3 D2 D2 D3 D2 D2 A1 A1 A2 A1 C#2 C#2 C#3 E3" },
        { wave: "square", volume: 0.04, decay: 0.16, notes: "A5 - D6 - F6 - E6 D6 Bb5 - D6 - C6 - E6 G6 A5 - D6 - F6 - A6 G6 E6 - C#6 - A5 - C#6 E6" },
        { wave: "noise", volume: 0.055, decay: 0.05, notes: rep("C3 - C5 C5 C3 C3 C5 -", 4) },
    ] },
    end: { bpm: 96, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.4, notes: "C3 - - G3 - - E3 - A2 - - E3 - - C3 - F2 - - C3 - - A2 - G2 - - D3 - - B2 -" },
        { wave: "sine", volume: 0.1, decay: 0.34, notes: "G5 - E5 - C6 - - - A5 - E5 - C5 - - - A5 - F5 - C6 - - - B5 - G5 - D6 - - -" },
    ] },
};
const tone = (wave, freq, to, decay, volume, at = 0, attack = 0.002) => ({ wave, freq, to, decay, volume, at, attack });
const arp = (notes, step, wave = "triangle", v = 0.16, d = 0.14) => notes.map((f, i) => tone(wave, f, f, d, v, i * step));
export const SFX = {
    pick: [[tone("sine", 520, 780, 0.08, 0.16)], "tick"],
    hover: [[tone("sine", 900, 900, 0.03, 0.05)], "tick"],
    drop: [[tone("triangle", 240, 110, 0.1, 0.24), tone("noise", 300, 90, 0.05, 0.08)], "light"],
    snap: [[tone("triangle", 520, 200, 0.07, 0.22), tone("square", 1300, 1300, 0.02, 0.04)], "medium"],
    buy: [arp([660, 990, 1320], 0.05, "triangle", 0.17, 0.1), "light"],
    nope: [[tone("square", 180, 130, 0.14, 0.08)], "warn"],
    roll: [[tone("noise", 700, 2200, 0.16, 0.1), ...arp([520, 620, 740], 0.04, "sine", 0.1, 0.06)], "light"],
    sell: [arp([990, 660, 880, 1320], 0.05, "square", 0.05, 0.1), "light"],
    hold: [[tone("square", 700, 700, 0.03, 0.06), tone("triangle", 330, 330, 0.08, 0.15, 0.04)], "tick"],
    merge0: [[tone("sawtooth", 150, 900, 0.5, 0.06), tone("noise", 300, 3000, 0.5, 0.06)], "medium"],
    merge: [[...arp([523, 659, 784, 1047, 1319, 1568], 0.055, "triangle", 0.2, 0.26), tone("noise", 2500, 300, 0.32, 0.14), tone("sine", 90, 50, 0.3, 0.3)], "success"],
    merge3: [[...arp([523, 659, 784, 1047, 1319, 1568, 2093, 2637], 0.06, "square", 0.08, 0.3), ...arp([262, 392, 523], 0.1, "triangle", 0.26, 0.5), tone("noise", 3000, 200, 0.5, 0.18)], "success"],
    fight: [[tone("sawtooth", 200, 600, 0.2, 0.09), tone("noise", 500, 2000, 0.2, 0.1), tone("square", 440, 880, 0.14, 0.06, 0.12)], "medium"],
    vs: [[tone("noise", 200, 60, 0.3, 0.26), tone("sine", 110, 40, 0.35, 0.34)], "heavy"],
    leap: [[tone("sine", 320, 760, 0.1, 0.08)], null],
    hit: [[tone("noise", 1100, 220, 0.08, 0.16), tone("triangle", 260, 90, 0.09, 0.2)], "tick"],
    bighit: [[tone("noise", 700, 90, 0.18, 0.26), tone("sine", 170, 44, 0.22, 0.34)], "medium"],
    crit: [[tone("square", 1200, 300, 0.1, 0.09), tone("noise", 1400, 200, 0.18, 0.24), tone("sine", 160, 40, 0.22, 0.32)], "heavy"],
    shot: [[tone("sine", 900, 420, 0.1, 0.09)], null],
    zap: [[tone("sawtooth", 1400, 500, 0.08, 0.06), tone("noise", 4000, 1500, 0.06, 0.06)], "tick"],
    splash: [[tone("noise", 500, 1500, 0.1, 0.1), tone("sine", 700, 300, 0.1, 0.08)], "tick"],
    curse: [[tone("triangle", 420, 310, 0.14, 0.13), tone("triangle", 445, 330, 0.14, 0.09)], "tick"],
    heal: [arp([784, 1047], 0.05, "sine", 0.11, 0.14), null],
    shield: [[tone("triangle", 880, 1320, 0.1, 0.11)], "tick"],
    buff: [arp([660, 880], 0.04, "triangle", 0.1, 0.08), null],
    proc: [[tone("square", 880, 1100, 0.05, 0.05)], "tick"],
    summon: [[tone("sine", 300, 900, 0.1, 0.13)], "tick"],
    faint: [[tone("sawtooth", 500, 70, 0.32, 0.08), tone("noise", 800, 200, 0.2, 0.12)], "medium"],
    stun: [arp([1400, 1100, 1400, 1100], 0.05, "sine", 0.07, 0.05), "tick"],
    closing: [[tone("square", 660, 660, 0.14, 0.08), tone("square", 660, 660, 0.14, 0.08, 0.2)], "warn"],
    win: [arp([523, 659, 784, 1047, 784, 1047, 1319], 0.09, "triangle", 0.2, 0.26), "success"],
    lose: [arp([392, 370, 349, 262], 0.16, "triangle", 0.18, 0.3), "error"],
    draw: [arp([440, 440], 0.16, "triangle", 0.15, 0.16), "warn"],
    trophy: [[...arp([1047, 1319, 1568, 2093], 0.05, "square", 0.05, 0.2)], "success"],
    heartbreak: [[tone("noise", 900, 200, 0.2, 0.16), tone("sawtooth", 300, 90, 0.3, 0.07)], "error"],
    champion: [[...arp([523, 523, 523, 698, 880, 1047, 880, 1047, 1319, 1568], 0.11, "triangle", 0.22, 0.32), ...arp([262, 349, 523], 0.33, "square", 0.05, 0.5)], "success"],
    unlock: [arp([784, 988, 1175, 1568], 0.07, "sine", 0.16, 0.24), "success"],
    tap: [[tone("triangle", 700, 500, 0.05, 0.12)], "tick"],
    coin: [arp([1320, 1760], 0.05, "square", 0.05, 0.08), "tick"],
};
let last = {};
/** Plays a named sound with its haptic, spaced out so a busy battle stays musical. */
export function play(game, name, gap = 0.04) {
    const e = SFX[name]; if (!e) return;
    const now = game.current?.time ?? 0, key = name;
    if (last[key] !== undefined && now - last[key] < gap && now >= last[key]) return;
    last[key] = now;
    game.sfx(e[0], e[1] ? { haptic: e[1] } : undefined);
}
