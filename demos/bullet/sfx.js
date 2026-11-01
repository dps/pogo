// Every event's sound, each paired with what the hand should feel. Haptics are chosen here, in one place.
export const SND = {
    graze: (heat) => ({ wave: "sine", freq: 1320 + heat * 1500, to: 1500 + heat * 1700, decay: 0.03, attack: 0.001, volume: 0.016 + heat * 0.012 }),
    hit: { wave: "triangle", freq: 900, to: 1300, decay: 0.02, attack: 0.001, volume: 0.012 },
    pop: (k) => [{ wave: "sine", freq: 620 + k * 90, to: 1240 + k * 120, decay: 0.12, volume: 0.07 }, { wave: "noise", freq: 5000, to: 800, decay: 0.1, volume: 0.03 }],
    bigPop: [{ wave: "sine", freq: 300, to: 900, decay: 0.3, volume: 0.1 }, { wave: "triangle", freq: 1200, decay: 0.3, volume: 0.05 }, { wave: "noise", freq: 3000, to: 300, decay: 0.3, volume: 0.05 }],
    charge: [{ wave: "sine", freq: 880, decay: 0.2, volume: 0.07 }, { wave: "sine", freq: 1320, decay: 0.3, at: 0.07, volume: 0.07 }, { wave: "sine", freq: 1760, decay: 0.45, at: 0.14, volume: 0.08 }],
    bomb: [{ wave: "sine", freq: 70, to: 34, decay: 0.9, volume: 0.32 }, { wave: "noise", freq: 6000, to: 200, decay: 1, volume: 0.14 }, { wave: "sine", freq: 523, to: 2093, decay: 0.7, attack: 0.1, volume: 0.09 }, { wave: "triangle", freq: 659, to: 2637, decay: 0.8, attack: 0.1, volume: 0.05 }],
    mote: (k) => ({ wave: "sine", freq: 500 * 2 ** (Math.floor(k) * 2 / 12 % 3), decay: 0.05, attack: 0.001, volume: 0.03 }),
    rushEnd: [{ wave: "sine", freq: 1047, decay: 0.5, volume: 0.08 }, { wave: "sine", freq: 1319, at: 0.06, decay: 0.5, volume: 0.07 }, { wave: "sine", freq: 1568, at: 0.12, decay: 0.7, volume: 0.07 }, { wave: "sine", freq: 2093, at: 0.18, decay: 0.9, volume: 0.06 }],
    die: [{ wave: "sine", freq: 880, to: 55, decay: 0.7, volume: 0.18 }, { wave: "noise", freq: 2500, to: 150, decay: 0.6, volume: 0.1 }, { wave: "triangle", freq: 330, to: 40, decay: 0.8, volume: 0.1 }],
    respawn: [{ wave: "sine", freq: 440, to: 880, decay: 0.3, attack: 0.05, volume: 0.06 }, { wave: "sine", freq: 660, to: 1320, decay: 0.4, attack: 0.1, volume: 0.05 }],
    phase: [{ wave: "sine", freq: 196, to: 98, decay: 0.8, volume: 0.2 }, { wave: "sine", freq: 784, decay: 0.8, volume: 0.07 }, { wave: "sine", freq: 1175, decay: 1, at: 0.08, volume: 0.06 }, { wave: "noise", freq: 4000, to: 300, decay: 0.6, volume: 0.06 }],
    bossDie: [{ wave: "sine", freq: 110, to: 28, decay: 1.8, volume: 0.32 }, { wave: "noise", freq: 5000, to: 100, decay: 1.6, volume: 0.14 }, { wave: "sine", freq: 880, at: 0.3, decay: 1.2, volume: 0.07 }, { wave: "sine", freq: 1319, at: 0.45, decay: 1.2, volume: 0.06 }, { wave: "sine", freq: 1760, at: 0.6, decay: 1.6, volume: 0.06 }],
    tally: { wave: "triangle", freq: 1400, decay: 0.03, volume: 0.03 },
    clear: [{ wave: "triangle", freq: 587, decay: 0.3, volume: 0.09 }, { wave: "triangle", freq: 740, at: 0.1, decay: 0.3, volume: 0.09 }, { wave: "triangle", freq: 880, at: 0.2, decay: 0.3, volume: 0.09 }, { wave: "triangle", freq: 1175, at: 0.3, decay: 0.8, volume: 0.1 }],
    tap: { wave: "sine", freq: 880, to: 1100, decay: 0.05, volume: 0.06 },
    over: [{ wave: "sine", freq: 294, to: 220, decay: 0.8, volume: 0.1 }, { wave: "sine", freq: 220, to: 147, at: 0.3, decay: 1.2, volume: 0.1 }],
};
