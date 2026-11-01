// Sound and music. Every event has its own small voice; three motors hum underneath.
// Pulses are chosen for the hand: tick for pickups, light for shots landing, medium for hits, heavy for impacts.

const SEMI = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const up = (notes, k) => notes.replace(/([A-G]#?)(\d)/g, (_, n, o) => { const v = SEMI[n] + k + Number(o) * 12; return NAMES[((v % 12) + 12) % 12] + Math.floor(v / 12); });
const rep = (s, n) => Array(n).fill(s).join(" ");

const KICK = (n) => ({ wave: "sine", notes: n, slide: 0.35, decay: 0.16, volume: 0.32 });
const HAT = (n, v = 0.05) => ({ wave: "noise", notes: n, decay: 0.035, volume: v });
const SNARE = (n) => ({ wave: "noise", notes: n, decay: 0.12, volume: 0.1 });

// Bedsit jazz: ii-V-I-vi in C, soft and lazy. For menus and quiet moments.
const CALM = {
    bpm: 92, steps: 2, tracks: [
        { wave: "triangle", volume: 0.2, decay: 0.34, notes: "D3 - A3 - G2 - B2 - C3 - G3 - A2 - E3 - D3 - F3 - G2 - F3 - C3 - E3 - A2 - C3 -" },
        { wave: "sine", volume: 0.1, decay: 0.8, notes: "F4 - - - F4 - - - E4 - - - E4 - - - F4 - - - F4 - - - E4 - - - E4 - - -" },
        { wave: "sine", volume: 0.1, decay: 0.8, notes: "A4 - - - B4 - - - G4 - - - A4 - - - A4 - - - B4 - - - G4 - - - C5 - - -" },
        { wave: "triangle", volume: 0.09, decay: 0.3, notes: "- - C5 - - D5 - - E5 - - - D5 - C5 - - - A4 - - C5 - - D5 - - - E5 - G5 -" },
    ],
};
const fight = (k, bpm) => ({
    bpm, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.1, decay: 0.14, notes: up(`${rep("A2 A2 A3 A2", 2)} ${rep("F2 F2 F3 F2", 2)} ${rep("C3 C3 C4 C3", 2)} ${rep("G2 G2 G3 G2", 2)}`, k) },
        { wave: "square", volume: 0.05, decay: 0.22, notes: up("A4 - C5 - E5 - D5 C5 A4 - - G4 A4 - C5 - F4 - A4 - C5 - D5 C5 A4 - - G4 F4 - A4 - G4 - C5 - E5 - G5 E5 D5 - C5 - D5 - E5 - D5 - B4 - D5 - G4 - - A4 B4 -", k) },
        KICK(rep("C2 - - - C2 - - - ", 8).trim()),
        SNARE(rep("- - - - C4 - - - ", 8).trim()),
        HAT(rep("C6 - C6 C6 ", 16).trim()),
    ],
});
const CAT = {
    bpm: 64, steps: 2, tracks: [
        { wave: "sine", volume: 0.36, decay: 0.2, slide: 0.5, notes: "C2 - C2 - - - - - C2 - C2 - - - - -" },
        { wave: "triangle", volume: 0.1, decay: 1.4, notes: "- - - - - - F#3 - - - - - - - G3 -" },
        { wave: "sine", volume: 0.06, decay: 1.8, notes: "C5 - - - - - - - C#5 - - - - - - -" },
    ],
};
const BOSS = {
    bpm: 168, steps: 2, tracks: [
        { wave: "sawtooth", volume: 0.1, decay: 0.12, notes: `${rep("D3 D3 D3 D4", 2)} ${rep("A#2 A#2 A#2 A#3", 2)} ${rep("C3 C3 C3 C4", 2)} ${rep("A2 A2 A2 A3", 2)}` },
        { wave: "square", volume: 0.05, decay: 0.18, notes: "D5 F5 A5 F5 D5 F5 A5 C6 A#5 A5 F5 D5 A#4 D5 F5 A5 C5 E5 G5 E5 C5 E5 G5 A#5 A5 G5 E5 C#5 A4 C#5 E5 A5" },
        KICK(rep("C2 - C2 - ", 8).trim()),
        SNARE(rep("- - C4 - ", 8).trim()),
        HAT(rep("C6 C6 ", 16).trim(), 0.04),
    ],
};
const WIN = {
    bpm: 120, steps: 2, loop: false, tracks: [
        { wave: "triangle", volume: 0.22, decay: 0.4, notes: "C3 - G3 - F3 - A3 - G3 - B3 - C4 - - - - -" },
        { wave: "square", volume: 0.07, decay: 0.3, notes: "E5 G5 C6 - F5 A5 C6 - G5 B5 D6 - E6 - - - - -" },
    ],
};
const LOSE = {
    bpm: 72, steps: 2, tracks: [
        { wave: "triangle", volume: 0.18, decay: 0.8, notes: "A2 - E3 - F2 - C3 - D3 - A3 - E2 - G#3 -" },
        { wave: "sine", volume: 0.1, decay: 1, notes: "C5 - - - A4 - - - F4 - - - E4 - - -" },
    ],
};
const ROOM_KEY = { living: 0, kitchen: 2, bathroom: -3, laundry: 3, nursery: 5 };

const FX = {
    pellet: [{ wave: "square", freq: 520, to: 200, decay: 0.05, volume: 0.05 }],
    nail: [{ wave: "square", freq: 1400, to: 500, decay: 0.03, volume: 0.05 }, { wave: "noise", freq: 2600, decay: 0.03, volume: 0.05 }],
    sock: [{ wave: "sine", freq: 180, to: 520, decay: 0.12, volume: 0.2 }, { wave: "noise", freq: 900, decay: 0.08, volume: 0.1 }],
    chop: [{ wave: "noise", freq: 1500, to: 400, decay: 0.08, volume: 0.15 }, { wave: "sawtooth", freq: 340, to: 120, decay: 0.08, volume: 0.1 }],
    poof: [{ wave: "noise", freq: 700, to: 200, decay: 0.12, volume: 0.13 }, { wave: "sine", freq: 300, to: 120, decay: 0.1, volume: 0.1 }],
    bigpoof: [{ wave: "noise", freq: 400, to: 100, decay: 0.34, volume: 0.25 }, { wave: "sine", freq: 150, to: 50, decay: 0.3, volume: 0.25 }],
    pop: [{ wave: "noise", freq: 3000, to: 500, decay: 0.16, volume: 0.22 }, { wave: "square", freq: 900, to: 100, decay: 0.14, volume: 0.1 }],
    bump: [{ wave: "sine", freq: 170, to: 60, decay: 0.09, volume: 0.28 }, { wave: "noise", freq: 500, decay: 0.03, volume: 0.1 }],
    crash: [{ wave: "noise", freq: 2600, to: 240, decay: 0.42, volume: 0.32 }, { wave: "sine", freq: 130, to: 40, decay: 0.34, volume: 0.32 }, { wave: "square", freq: 1600, to: 300, decay: 0.08, at: 0.04, volume: 0.08 }],
    glass: [{ wave: "noise", freq: 5200, to: 2400, decay: 0.28, volume: 0.2 }, { wave: "sine", freq: 3200, decay: 0.12, volume: 0.07 }, { wave: "sine", freq: 4400, decay: 0.16, at: 0.06, volume: 0.06 }],
    chew: [{ wave: "noise", freq: 1800, to: 900, decay: 0.05, volume: 0.07 }],
    gulp: [{ wave: "sine", freq: 500, to: 1100, decay: 0.06, volume: 0.07 }],
    heal: [{ wave: "sine", freq: 660, to: 990, decay: 0.08, volume: 0.09 }],
    equip: [{ wave: "square", freq: 330, decay: 0.07, volume: 0.1 }, { wave: "square", freq: 494, decay: 0.07, at: 0.07, volume: 0.1 }, { wave: "square", freq: 659, decay: 0.14, at: 0.14, volume: 0.1 }],
    battery: [{ wave: "triangle", freq: 523, decay: 0.08, volume: 0.16 }, { wave: "triangle", freq: 784, decay: 0.16, at: 0.08, volume: 0.16 }],
    hurt: [{ wave: "sawtooth", freq: 240, to: 80, decay: 0.2, volume: 0.22 }, { wave: "noise", freq: 800, decay: 0.08, volume: 0.14 }],
    dash: [{ wave: "noise", freq: 500, to: 3000, decay: 0.2, volume: 0.2 }, { wave: "sawtooth", freq: 150, to: 800, decay: 0.2, volume: 0.1 }],
    charged: [{ wave: "triangle", freq: 880, decay: 0.08, volume: 0.14 }, { wave: "triangle", freq: 1320, decay: 0.14, at: 0.06, volume: 0.14 }],
    spin: [{ wave: "sawtooth", freq: 200, to: 620, decay: 0.26, volume: 0.1 }, { wave: "noise", freq: 1400, to: 3000, decay: 0.24, volume: 0.1 }],
    fuse: [{ wave: "square", freq: 1000, decay: 0.04, volume: 0.06 }, { wave: "square", freq: 1300, decay: 0.04, at: 0.12, volume: 0.07 }, { wave: "square", freq: 1600, decay: 0.04, at: 0.24, volume: 0.08 }],
    hiss: [{ wave: "noise", freq: 3200, to: 1800, decay: 0.3, volume: 0.1 }],
    coil: [{ wave: "triangle", freq: 200, to: 500, decay: 0.28, volume: 0.13 }],
    lunge: [{ wave: "noise", freq: 1200, to: 400, decay: 0.2, volume: 0.13 }],
    heave: [{ wave: "sine", freq: 120, to: 240, decay: 0.3, volume: 0.2 }],
    stomp: [{ wave: "sine", freq: 90, to: 36, decay: 0.3, volume: 0.42 }, { wave: "noise", freq: 200, decay: 0.2, volume: 0.2 }],
    zap: [{ wave: "sawtooth", freq: 90, to: 1200, decay: 0.08, volume: 0.13 }, { wave: "square", freq: 2000, to: 90, decay: 0.1, at: 0.08, volume: 0.1 }, { wave: "noise", freq: 5000, decay: 0.12, volume: 0.12 }],
    flame: [{ wave: "noise", freq: 500, to: 200, decay: 0.5, volume: 0.2 }],
    gurgle: [{ wave: "sine", freq: 140, to: 80, decay: 0.2, volume: 0.2 }, { wave: "sine", freq: 180, to: 90, decay: 0.2, at: 0.18, volume: 0.2 }, { wave: "sine", freq: 110, to: 60, decay: 0.3, at: 0.36, volume: 0.2 }],
    whoosh: [{ wave: "noise", freq: 400, to: 1000, attack: 0.2, decay: 0.6, volume: 0.1 }],
    bell: [{ wave: "sine", freq: 2100, decay: 0.26, volume: 0.15 }, { wave: "sine", freq: 2800, decay: 0.2, volume: 0.08 }, { wave: "sine", freq: 2100, decay: 0.26, at: 0.2, volume: 0.15 }, { wave: "sine", freq: 2800, decay: 0.2, at: 0.2, volume: 0.08 }],
    wail: [{ wave: "triangle", freq: 700, to: 1300, decay: 0.3, volume: 0.13 }, { wave: "triangle", freq: 1300, to: 600, decay: 0.5, at: 0.3, volume: 0.13 }],
    giggle: [{ wave: "sine", freq: 800, to: 1000, decay: 0.06, volume: 0.1 }, { wave: "sine", freq: 900, to: 1100, decay: 0.06, at: 0.1, volume: 0.1 }, { wave: "sine", freq: 1000, to: 1300, decay: 0.08, at: 0.2, volume: 0.1 }],
    meow: [{ wave: "sawtooth", freq: 380, to: 780, attack: 0.1, decay: 0.32, volume: 0.1 }, { wave: "sawtooth", freq: 780, to: 280, decay: 0.42, at: 0.3, volume: 0.1 }],
    growl: [{ wave: "sawtooth", freq: 58, to: 46, attack: 0.3, decay: 1.4, volume: 0.18 }, { wave: "noise", freq: 120, attack: 0.3, decay: 1.2, volume: 0.1 }],
    hisscat: [{ wave: "noise", freq: 4200, to: 2200, attack: 0.02, decay: 0.38, volume: 0.24 }],
    wave: [{ wave: "triangle", freq: 392, decay: 0.1, volume: 0.13 }, { wave: "triangle", freq: 523, decay: 0.14, at: 0.1, volume: 0.13 }],
    clear: [{ wave: "triangle", freq: 523, decay: 0.09, volume: 0.15 }, { wave: "triangle", freq: 659, decay: 0.09, at: 0.09, volume: 0.15 }, { wave: "triangle", freq: 784, decay: 0.09, at: 0.18, volume: 0.15 }, { wave: "triangle", freq: 1046, decay: 0.26, at: 0.27, volume: 0.15 }],
    card: [{ wave: "triangle", freq: 660, to: 1320, decay: 0.2, volume: 0.15 }],
    door: [{ wave: "sine", freq: 220, to: 330, decay: 0.3, volume: 0.15 }],
    combo: [{ wave: "square", freq: 880, to: 1320, decay: 0.08, volume: 0.06 }],
    dry: [{ wave: "square", freq: 200, decay: 0.05, volume: 0.1 }, { wave: "square", freq: 150, decay: 0.08, at: 0.08, volume: 0.1 }],
    spawn: [{ wave: "noise", freq: 2600, to: 800, decay: 0.06, volume: 0.025 }],
};

export class Sound {
    constructor(game) {
        this.game = game; this.motor = null; this.chain = null; this.suck = null; this.flame = null; this.track = null; this.last = {};
    }
    /** Play with a minimum gap, so a hundred kills don't become noise. */
    play(name, haptic, gap = 0.04) {
        const g = this.game, now = g.stepCount ?? 0;
        if (this.last[name] !== undefined && now - this.last[name] < gap * 60) return;
        this.last[name] = now;
        g.sfx(FX[name], haptic ? { haptic } : undefined);
    }
    song(mood, room) {
        const key = mood === "fight" ? `fight${room}` : mood;
        if (this.track === key) return;
        this.track = key;
        const g = this.game;
        if (mood === "calm") g.music(CALM);
        else if (mood === "fight") g.music(fight(ROOM_KEY[room] ?? 0, 132 + (ROOM_KEY[room] ?? 0)));
        else if (mood === "cat") g.music(CAT);
        else if (mood === "boss") g.music(BOSS);
        else if (mood === "win") g.music(WIN);
        else if (mood === "lose") g.music(LOSE);
        else g.stopMusic();
    }
    startMotors() {
        const v = this.game.audio;
        if (this.motor) return;
        this.motor = v.voice({ wave: "triangle", freq: 70, volume: 0 });
        this.chain = v.voice({ wave: "sawtooth", freq: 95, volume: 0 });
        this.suck = v.voice({ wave: "noise", freq: 900, volume: 0 });
        this.flame = v.voice({ wave: "noise", freq: 300, volume: 0 });
    }
    motors(speed, sawHit, charge, charging, cone, spin) {
        if (!this.motor) return;
        this.motor.set({ freq: 60 + speed * 11, volume: 0.03 + speed * 0.006 });
        const rev = sawHit > 0 ? 170 : 96 + Math.min(120, Math.abs(spin) * 7);
        this.chain.set({ freq: rev, volume: sawHit > 0 ? 0.085 : 0.03 });
        this.suck.set({ freq: charging ? 900 + charge * 2400 : 700, volume: charging ? 0.06 + charge * 0.07 : 0 });
        this.flame.set({ freq: cone === "dryer" ? 500 : 2100, volume: cone ? 0.08 : 0 });
    }
    /** Silence the hum without dropping the voices, for pauses. */
    hush() { for (const k of ["motor", "chain", "suck", "flame"]) this[k]?.set({ volume: 0 }); }
    stopMotors() {
        for (const k of ["motor", "chain", "suck", "flame"]) { this[k]?.stop(); this[k] = null; }
    }
}
