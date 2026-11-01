// Sound. The framework's voices have no pan, so each one is routed through a small stereo bus of our own, by briefly swapping audio.master while it connects.
// Everything degrades to nothing when audio is blocked.

const TONES = {
    clickOn: [{ wave: "square", freq: 2300, to: 1500, decay: 0.018, volume: 0.09 }, { wave: "noise", freq: 3000, decay: 0.03, volume: 0.05 }],
    clickOff: [{ wave: "square", freq: 1500, to: 900, decay: 0.02, volume: 0.07 }],
    foot: [{ wave: "noise", freq: 240, decay: 0.07, volume: 0.05 }, { wave: "sine", freq: 80, to: 50, decay: 0.08, volume: 0.09 }],
    footBelt: [{ wave: "noise", freq: 500, decay: 0.05, volume: 0.05 }, { wave: "square", freq: 110, to: 70, decay: 0.05, volume: 0.03 }],
    footStair: [{ wave: "noise", freq: 340, decay: 0.09, volume: 0.07 }, { wave: "sine", freq: 120, to: 60, decay: 0.1, volume: 0.09 }],
    creep: [{ wave: "triangle", freq: 1900, to: 1400, decay: 0.03, volume: 0.1 }, { wave: "noise", freq: 900, at: 0.012, decay: 0.03, volume: 0.05 }],
    heart: [{ wave: "sine", freq: 62, to: 40, decay: 0.15, volume: 0.42 }, { wave: "sine", freq: 54, to: 36, at: 0.2, decay: 0.2, volume: 0.28 }],
    door: [{ wave: "noise", freq: 400, decay: 0.09, volume: 0.13 }, { wave: "sine", freq: 130, to: 62, decay: 0.16, volume: 0.24 }, { wave: "square", freq: 900, at: 0.06, decay: 0.02, volume: 0.03 }],
    slam: [{ wave: "noise", freq: 800, decay: 0.26, volume: 0.45 }, { wave: "sine", freq: 96, to: 34, decay: 0.42, volume: 0.6 }],
    rattle: [{ wave: "square", freq: 170, to: 120, decay: 0.04, volume: 0.08 }, { wave: "noise", freq: 1200, at: 0.07, decay: 0.03, volume: 0.09 }, { wave: "square", freq: 160, to: 130, at: 0.13, decay: 0.04, volume: 0.07 }],
    thud: [{ wave: "noise", freq: 340, decay: 0.12, volume: 0.32 }, { wave: "triangle", freq: 1600, to: 900, at: 0.03, decay: 0.09, volume: 0.13 }, { wave: "sine", freq: 90, to: 50, decay: 0.2, volume: 0.32 }],
    lever: [{ wave: "noise", freq: 800, decay: 0.06, volume: 0.22 }, { wave: "sine", freq: 180, to: 60, decay: 0.26, volume: 0.42 }, { wave: "square", freq: 240, to: 70, at: 0.07, decay: 0.14, volume: 0.08 }],
    scanTick: [{ wave: "sine", freq: 880, decay: 0.05, volume: 0.09 }],
    scanDone: [{ wave: "sine", freq: 660, decay: 0.1, volume: 0.13 }, { wave: "sine", freq: 990, at: 0.09, decay: 0.2, volume: 0.13 }],
    crank: [{ wave: "square", freq: 300, to: 180, decay: 0.03, volume: 0.09 }, { wave: "noise", freq: 2000, decay: 0.02, volume: 0.04 }],
    battery: [{ wave: "triangle", freq: 660, decay: 0.08, volume: 0.15 }, { wave: "triangle", freq: 880, at: 0.07, decay: 0.08, volume: 0.15 }, { wave: "square", freq: 1400, at: 0.17, decay: 0.03, volume: 0.05 }],
    low: [{ wave: "sine", freq: 520, to: 430, decay: 0.16, volume: 0.1 }, { wave: "sine", freq: 520, to: 430, at: 0.22, decay: 0.16, volume: 0.1 }],
    dead: [{ wave: "sawtooth", freq: 420, to: 60, decay: 0.5, volume: 0.1 }],
    jam: [{ wave: "square", freq: 120, to: 100, decay: 0.06, volume: 0.1 }, { wave: "noise", freq: 300, decay: 0.05, volume: 0.1 }],
    punch: [{ wave: "noise", freq: 1800, decay: 0.05, volume: 0.32 }, { wave: "square", freq: 200, to: 60, decay: 0.09, volume: 0.24 }, { wave: "sine", freq: 2100, at: 0.09, decay: 0.3, volume: 0.1 }],
    sting: [{ wave: "sawtooth", freq: 880, to: 1240, decay: 0.5, volume: 0.13 }, { wave: "sawtooth", freq: 932, to: 1180, decay: 0.5, volume: 0.13 }, { wave: "noise", freq: 3200, decay: 0.34, volume: 0.3 }, { wave: "sine", freq: 70, to: 30, decay: 0.7, volume: 0.6 }],
    hand: [{ wave: "sine", freq: 523, decay: 0.8, volume: 0.09 }, { wave: "sine", freq: 659, at: 0.14, decay: 0.8, volume: 0.09 }, { wave: "sine", freq: 784, at: 0.28, decay: 1.1, volume: 0.09 }],
    file: [{ wave: "triangle", freq: 330, decay: 0.3, volume: 0.1 }, { wave: "triangle", freq: 311, at: 0.2, decay: 0.5, volume: 0.1 }],
    tape: [{ wave: "noise", freq: 2600, decay: 0.05, volume: 0.05 }, { wave: "square", freq: 240, at: 0.03, decay: 0.03, volume: 0.03 }],
    blip: [{ wave: "triangle", freq: 170, to: 150, decay: 0.05, volume: 0.05 }],
    phone: [0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42].flatMap((t, i) => [{ wave: "square", freq: i % 2 ? 620 : 760, at: t, decay: 0.05, volume: 0.1 }]).concat([0, 0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42].map((t, i) => ({ wave: "square", freq: i % 2 ? 620 : 760, at: t + 1.1, decay: 0.05, volume: 0.1 }))),
    musicbox: ["E6", "A5", "C6", "E6", "D6", "B5", "G#5", "E5"].map((n, i) => ({ wave: "sine", freq: [1318.5, 880, 1046.5, 1318.5, 1174.7, 987.8, 830.6, 659.3][i], at: i * 0.46, decay: 0.7, volume: 0.13 })),
    whistle: [{ wave: "sawtooth", freq: 240, to: 660, decay: 0.8, volume: 0.13 }, { wave: "sawtooth", freq: 660, at: 0.75, decay: 1.5, volume: 0.13 }, { wave: "sawtooth", freq: 664, at: 0.75, decay: 1.5, volume: 0.1 }, { wave: "sawtooth", freq: 660, to: 220, at: 2.1, decay: 1, volume: 0.1 }],
    allclear: [{ wave: "sine", freq: 523, decay: 0.3, volume: 0.1 }, { wave: "sine", freq: 392, at: 0.26, decay: 0.5, volume: 0.1 }],
};

export const SONGS = {
    // A music box that has been left wound. Am, F, Dm, E, and it never quite resolves.
    title: { bpm: 48, steps: 2, tracks: [
        { wave: "sine", volume: 0.09, decay: 1.2, notes: "E6 A5 C6 E6 D6 B5 G#5 E5  C6 A5 F5 A5 C6 F6 E6 -  D6 F5 A5 D6 C6 A5 F5 A5  B5 G#5 E5 G#5 B5 D6 E6 -" },
        { wave: "triangle", volume: 0.07, decay: 3, notes: "A2 - - - - - - -  F2 - - - - - - -  D2 - - - - - - -  E2 - - - - - - -" },
        { wave: "sine", volume: 0.035, decay: 3, attack: 0.6, notes: "C4 - - - - - - -  A3 - - - - - - -  F3 - - - - - - -  G#3 - - - - - - -" },
    ] },
    // Under a shift: almost nothing, a slow rise and fall a long way off.
    shift: { bpm: 38, steps: 1, tracks: [
        { wave: "triangle", volume: 0.05, decay: 5, attack: 1.2, notes: "A1 - - - F1 - - - D1 - - - E1 - - -" },
        { wave: "sine", volume: 0.022, decay: 5, attack: 1.6, notes: "E4 - - - C4 - - - F4 - - - G#4 - - -" },
    ] },
    // The car park: tired, a little kind.
    park: { bpm: 56, steps: 1, tracks: [
        { wave: "sine", volume: 0.05, decay: 2.4, attack: 0.2, notes: "A3 - C4 E4 F3 - A3 C4 C4 - E4 G4 G3 - B3 D4" },
        { wave: "triangle", volume: 0.05, decay: 4, notes: "A2 - - - F2 - - - C3 - - - G2 - - -" },
    ] },
    // Sunrise. The same tune, turned to the major, and let go.
    dawn: { bpm: 60, steps: 2, tracks: [
        { wave: "sine", volume: 0.1, decay: 1.6, notes: "E6 C6 G5 C6 E6 G6 E6 -  F6 C6 A5 C6 F6 A6 F6 -  D6 B5 G5 B5 D6 G6 D6 -  E6 C6 G5 C6 E6 C7 G6 -" },
        { wave: "triangle", volume: 0.09, decay: 3.4, notes: "C3 - - - - - - -  F2 - - - - - - -  G2 - - - - - - -  C3 - - - - - - -" },
        { wave: "sine", volume: 0.045, decay: 3.4, attack: 0.5, notes: "E4 - - - G4 - - -  A4 - - - C5 - - -  B4 - - - D5 - - -  G4 - - - E4 - - -" },
    ] },
    // Inside the shelf. The music box again, slowed and out of true.
    flip: { bpm: 34, steps: 2, tracks: [
        { wave: "sine", volume: 0.08, decay: 1.8, notes: "E5 A4 C5 E5 D5 B4 G#4 E4  C5 A4 F4 A4 C5 F5 E5 -" },
        { wave: "sine", volume: 0.05, decay: 1.8, notes: "F5 - C5 - D#5 - A4 -  C#5 - F#4 - D5 - F5 -" },
    ] },
};

export class Sound {
    constructor(game) {
        this.game = game;
        this.yaw = 0; this.x = 0; this.z = 0;
        this.buses = null;
        this.voices = [];
        this.occluded = () => false;
    }
    get ctx() { return this.game.audio.ctx; }
    makeBus() {
        const ctx = this.ctx, a = this.game.audio;
        try {
            const gain = ctx.createGain();
            if (!ctx.createStereoPanner) return null;
            const pan = ctx.createStereoPanner();
            gain.connect(pan);
            pan.connect(a.master);
            return { gain, pan };
        } catch { return null; }
    }
    /** Run fn with audio.master pointing at a bus, so what it plays is routed there. */
    routed(bus, fn) {
        const a = this.game.audio, m = a.master;
        if (bus) a.master = bus.gain;
        try { return fn(); } finally { a.master = m; }
    }
    /** Where this is, heard from the player: [gain, pan]. Things behind a wall are quieter and softer. */
    hear(x, z, near = 3, range = 34) {
        const dx = x - this.x, dz = z - this.z, d = Math.hypot(dx, dz);
        const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = -fz, rz = fx;
        const side = (dx * rx + dz * rz) / (d || 1), behind = (dx * fx + dz * fz) / (d || 1) < 0 ? 0.8 : 1;
        const fall = 1 / (1 + (d / near) ** 2), edge = Math.max(0, 1 - d / range);
        return [fall * edge * behind * (this.occluded(x, z) ? 0.55 : 1), Math.max(-0.92, Math.min(0.92, side * Math.min(1, d / 2)))];
    }
    /** A one-shot here, in your head. */
    play(name, o = {}) {
        const def = TONES[name] ?? name;
        this.game.sfx(o.volume ? scaled(def, o.volume) : def, o.haptic ? { haptic: o.haptic } : undefined);
    }
    /** A one-shot out there in the factory. */
    at(name, x, z, o = {}) {
        const [g, pan] = this.hear(x, z, o.near ?? 4);
        if (g * (o.volume ?? 1) < 0.006) return;
        const def = scaled(TONES[name] ?? name, g * (o.volume ?? 1) * 1.6);
        if (!this.ctx || this.ctx.state !== "running") { this.game.sfx(def); return; }
        if (!this.buses) {
            this.buses = [-0.9, -0.45, 0, 0.45, 0.9].map((p) => { const b = this.makeBus(); if (b) b.pan.pan.value = p; return b; });
        }
        const bus = this.buses[Math.round((pan + 0.9) / 0.45)];
        this.routed(bus, () => this.game.sfx(def));
    }
    /** A continuous source. set({ x, z, volume, freq }) each step. With no position it plays centred. */
    voice(o) {
        const a = this.game.audio;
        const ctx = a.ensure?.();
        if (!ctx || !a.master) return { set() {}, stop() {} };
        const bus = this.makeBus(), v = this.routed(bus, () => a.voice(o)), self = this;
        const handle = {
            set(q) {
                let volume = q.volume ?? o.volume;
                if (q.x !== undefined) {
                    const [g, pan] = self.hear(q.x, q.z, q.near ?? 6);
                    volume *= g;
                    if (bus) bus.pan.pan.setTargetAtTime(pan, ctx.currentTime, 0.08);
                }
                v.set({ volume, freq: q.freq });
            },
            stop() {
                v.stop();
                self.voices.splice(self.voices.indexOf(handle), 1);
            },
        };
        this.voices.push(handle);
        return handle;
    }
    stopAll() { for (const v of this.voices.slice()) v.stop(); }
}

function scaled(def, k) {
    return (Array.isArray(def) ? def : [def]).map((t) => ({ ...t, volume: (t.volume ?? 0.2) * k }));
}
