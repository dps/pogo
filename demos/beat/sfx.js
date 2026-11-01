// Custom sounds. Each head has a voice in each kit, and every event in the game gets its own noise.
export const KITS = [
    { id: "logs", name: "Hollow Logs", about: "Your first kit. Found in a bog.",
      voices: [
          [{ wave: "sine", freq: 190, to: 52, decay: 0.13, volume: 0.26 }, { wave: "noise", freq: 2400, to: 400, decay: 0.022, volume: 0.1 }],
          [{ wave: "noise", freq: 5200, to: 1400, decay: 0.09, volume: 0.15 }, { wave: "triangle", freq: 320, to: 150, decay: 0.06, volume: 0.13 }],
          [{ wave: "triangle", freq: 340, to: 120, decay: 0.12, volume: 0.22 }, { wave: "noise", freq: 2600, to: 500, decay: 0.02, volume: 0.08 }],
          [{ wave: "triangle", freq: 520, to: 220, decay: 0.1, volume: 0.2 }, { wave: "noise", freq: 3600, to: 800, decay: 0.02, volume: 0.08 }],
      ] },
    { id: "lids", name: "Pot Lids", about: "Stolen from a beach barbecue.",
      voices: [
          [{ wave: "square", freq: 240, to: 90, decay: 0.08, volume: 0.1 }, { wave: "noise", freq: 3000, to: 900, decay: 0.05, volume: 0.1 }],
          [{ wave: "square", freq: 900, to: 620, decay: 0.06, volume: 0.08 }, { wave: "noise", freq: 8000, to: 3000, decay: 0.09, volume: 0.1 }],
          [{ wave: "square", freq: 1180, to: 840, decay: 0.07, volume: 0.08 }, { wave: "noise", freq: 8000, to: 3000, decay: 0.06, volume: 0.08 }],
          [{ wave: "square", freq: 1500, to: 1100, decay: 0.08, volume: 0.08 }, { wave: "noise", freq: 8400, to: 3600, decay: 0.05, volume: 0.08 }],
      ] },
    { id: "skull", name: "Skull Toms", about: "Their owners no longer object.",
      voices: [
          [{ wave: "sine", freq: 150, to: 44, decay: 0.2, volume: 0.28 }],
          [{ wave: "sine", freq: 300, to: 110, decay: 0.15, volume: 0.24 }, { wave: "noise", freq: 1800, to: 300, decay: 0.03, volume: 0.1 }],
          [{ wave: "sine", freq: 420, to: 150, decay: 0.15, volume: 0.24 }, { wave: "noise", freq: 1800, to: 300, decay: 0.03, volume: 0.1 }],
          [{ wave: "sine", freq: 560, to: 210, decay: 0.15, volume: 0.24 }, { wave: "noise", freq: 1800, to: 300, decay: 0.03, volume: 0.1 }],
      ] },
    { id: "bells", name: "Cow Bells", about: "More of them. Always more.",
      voices: [
          [{ wave: "sine", freq: 170, to: 60, decay: 0.12, volume: 0.24 }, { wave: "square", freq: 540, decay: 0.05, volume: 0.05 }],
          [{ wave: "square", freq: 660, decay: 0.09, volume: 0.07 }, { wave: "square", freq: 990, decay: 0.09, volume: 0.05 }],
          [{ wave: "square", freq: 800, decay: 0.09, volume: 0.07 }, { wave: "square", freq: 1200, decay: 0.09, volume: 0.05 }],
          [{ wave: "square", freq: 1000, decay: 0.09, volume: 0.07 }, { wave: "square", freq: 1500, decay: 0.09, volume: 0.05 }],
      ] },
];

// Hit sounds sit on top of the music, so they're scaled to fit the headroom proved in tools/verify-songs.mjs.
const HIT_LEVEL = 0.72;
for (const k of KITS) for (const v of k.voices) for (const t of v) t.volume *= HIT_LEVEL;

export const SND = {
    miss: [{ wave: "sine", freq: 130, to: 60, decay: 0.16, volume: 0.15 }, { wave: "noise", freq: 320, to: 120, decay: 0.12, volume: 0.13 }],
    stray: { wave: "sine", freq: 160, to: 90, decay: 0.05, volume: 0.09 },
    tick: { wave: "square", freq: 1500, decay: 0.018, volume: 0.05 },
    swipe: [{ wave: "noise", freq: 900, to: 7000, decay: 0.09, volume: 0.17 }, { wave: "triangle", freq: 400, to: 1400, decay: 0.1, volume: 0.13 }],
    roll: { wave: "noise", freq: 4200, to: 1200, decay: 0.035, volume: 0.13 },
    holdTick: { wave: "triangle", freq: 880, decay: 0.03, volume: 0.05 },
    holdEnd: [{ wave: "triangle", freq: 660, decay: 0.06, volume: 0.14 }, { wave: "triangle", freq: 990, decay: 0.12, volume: 0.14, at: 0.05 }],
    drop: { wave: "sawtooth", freq: 300, to: 90, decay: 0.2, volume: 0.1 },
    fever: [
        { wave: "sawtooth", freq: 262, decay: 0.09, volume: 0.1 }, { wave: "sawtooth", freq: 392, decay: 0.09, volume: 0.1, at: 0.07 },
        { wave: "sawtooth", freq: 523, decay: 0.09, volume: 0.1, at: 0.14 }, { wave: "sawtooth", freq: 784, decay: 0.3, volume: 0.1, at: 0.21 },
        { wave: "noise", freq: 8000, to: 1000, decay: 0.5, volume: 0.13, at: 0.21 },
    ],
    feverEnd: { wave: "triangle", freq: 660, to: 220, decay: 0.34, volume: 0.13 },
    milestone: [{ wave: "square", freq: 880, decay: 0.05, volume: 0.07 }, { wave: "square", freq: 1320, decay: 0.09, volume: 0.07, at: 0.05 }],
    stamp: [{ wave: "sine", freq: 160, to: 46, decay: 0.26, volume: 0.34 }, { wave: "noise", freq: 3000, to: 300, decay: 0.12, volume: 0.22 }],
    star: { wave: "triangle", freq: 1046, to: 1568, decay: 0.16, volume: 0.17 },
    tickUp: { wave: "square", freq: 1320, decay: 0.012, volume: 0.03 },
    bonk: [{ wave: "sine", freq: 240, to: 70, decay: 0.12, volume: 0.25 }, { wave: "noise", freq: 2600, to: 500, decay: 0.03, volume: 0.13 }],
    page: { wave: "triangle", freq: 500, to: 700, decay: 0.05, volume: 0.09 },
    join: [{ wave: "square", freq: 523, decay: 0.08, volume: 0.08 }, { wave: "square", freq: 659, decay: 0.08, volume: 0.08, at: 0.08 }, { wave: "square", freq: 784, decay: 0.08, volume: 0.08, at: 0.16 }, { wave: "square", freq: 1047, decay: 0.25, volume: 0.09, at: 0.24 }],
    blip: { wave: "sine", freq: 880, decay: 0.08, volume: 0.13 },
    clap: { wave: "noise", freq: 5000, to: 1600, decay: 0.05, volume: 0.06 },
};

/** Haptics by feel. A hit on the kick is a thump you could set a watch by; a miss is a soft, flat flub. */
export const FEEL = {
    hit: 18, hitKick: 34, perfectKick: 42,
    miss: [6, 70, 6],
    stray: 4,
    swipe: [10, 24, 22],
    holdStart: 18, holdTick: 5, holdEnd: 28,
    roll: 8,
    fever: [30, 40, 30, 40, 60],
};

export const feverTone = (f, kind) => (kind === "brass"
    ? { wave: "square", freq: f, decay: 0.09, volume: 0.04 }
    : SND.clap);
