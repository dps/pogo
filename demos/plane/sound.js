// All of the game's sound. Paper is noise with a shape; the post is a music box; the wind is a filtered voice that
// tracks airspeed. Each time of day has its own short, quiet loop built on a real progression.
const pad = (chords, beats, vol, oct) => chords.map((c) => c.split(" ").slice(0, 1).map((n) => n + oct).concat(Array(beats - 1).fill("-")).join(" ")).join(" ");
const arp = (chords, pattern, oct) => chords.map((c) => { const t = c.split(" "); return pattern.map((i) => (i < 0 ? "-" : t[i % t.length] + (oct + Math.floor(i / t.length)))).join(" "); }).join(" ");
const SONGS = {
    title: { bpm: 76, ch: ["C E G B", "A C E G", "F A C E", "G B D F"], p: [0, 2, 3, 2, 4, 2, 3, 2] },
    morning: { bpm: 84, ch: ["C E G B", "F A C E", "A C E G", "G B D F"], p: [0, 2, 4, 2, 3, 2, 4, 2] },
    noon: { bpm: 96, ch: ["F A C E", "G B D F", "E G B D", "A C E G"], p: [0, 3, 2, 4, 0, 3, 2, 4] },
    golden: { bpm: 72, ch: ["D F A C", "Bb D F A", "F A C E", "C E G Bb"], p: [0, 2, 4, 3, 5, 3, 4, 2] },
    night: { bpm: 60, ch: ["A C E G", "F A C E", "C E G B", "E G B D"], p: [4, 2, 3, 0, 5, 2, 3, -1] },
    ending: { bpm: 66, ch: ["C E G B", "G B D F", "A C E G", "F A C E", "C E G B", "G B D F", "F A C E", "F A C E"], p: [0, 2, 4, 2, 5, 4, 3, 2] },
};
export class Sound {
    constructor(game) { this.g = game; this.song = null; this.wind = null; this.rib = null; this.stallV = null; }
    apply() { const o = this.g.opts; this.g.audio.muted = !o.sound; this.g.haptics.enabled = !!o.haptics; if (!o.sound) { this.windOff(); } }
    music(id) {
        if (this.song === id) return; this.song = id;
        const S = SONGS[id] ?? SONGS.title, ch = S.ch, n = ch.length;
        this.g.music({ bpm: S.bpm, steps: 2, tracks: [
            { wave: "triangle", notes: arp(ch, S.p, 5), volume: 0.05, decay: 1.1 },
            { wave: "sine", notes: arp(ch, S.p.map((v) => v), 6), volume: 0.022, decay: 0.7 },
            { wave: "sine", notes: pad(ch, 8, 0.05, 3), volume: 0.075, decay: 2.8, attack: 0.08 },
            { wave: "triangle", notes: ch.map((c) => { const t = c.split(" "); return `- - - - ${t[1]}4 - ${t[2]}4 -`; }).join(" "), volume: 0.022, decay: 2.2, attack: 0.12 },
        ] });
    }
    stop() { this.song = null; this.g.stopMusic(); }
    windOn() {
        if (this.wind || !this.g.opts.sound) return;
        this.wind = this.g.audio.voice({ wave: "noise", freq: 500, volume: 0 });
        this.rib = this.g.audio.voice({ wave: "sine", freq: 220, volume: 0 });
        this.stallV = this.g.audio.voice({ wave: "noise", freq: 2600, volume: 0 });
    }
    windOff() { this.wind?.stop(); this.rib?.stop(); this.stallV?.stop(); this.wind = this.rib = this.stallV = null; }
    air(speed, vt, ribbon, stalled, t) {
        if (!this.wind) return;
        const k = Math.min(2.4, speed / vt);
        this.wind.set({ freq: 240 + k * k * 520, volume: 0.012 + k * k * 0.021 });
        this.rib.set({ freq: ribbon ? 293 + 12 * Math.sin(t * 2) : 220, volume: ribbon ? 0.02 : 0 });
        this.stallV.set({ freq: 1800 + 900 * Math.sin(t * 40), volume: stalled ? 0.05 * (0.6 + 0.4 * Math.sin(t * 34)) : 0 });
    }
    quiet() { this.wind?.set({ volume: 0.006 }); this.rib?.set({ volume: 0 }); this.stallV?.set({ volume: 0 }); }
    fx(name, x = 0) {
        const g = this.g, E = {
            paper: [[{ wave: "noise", freq: 2600, decay: 0.09, volume: 0.09 }, { wave: "noise", freq: 3600, decay: 0.07, volume: 0.06, at: 0.07 }], "light"],
            crease: [[{ wave: "noise", freq: 4200, to: 900, decay: 0.16, volume: 0.13 }, { wave: "triangle", freq: 180, to: 90, decay: 0.09, volume: 0.1, at: 0.05 }], "medium"],
            scrape: [[{ wave: "noise", freq: 1500, to: 500, decay: 0.14, volume: Math.min(0.14, 0.05 + x * 0.012) }], "light"],
            crumple: [[{ wave: "noise", freq: 3000, decay: 0.05, volume: 0.15 }, { wave: "noise", freq: 1900, decay: 0.06, volume: 0.14, at: 0.05 }, { wave: "noise", freq: 2800, decay: 0.06, volume: 0.12, at: 0.13 }, { wave: "noise", freq: 1500, decay: 0.08, volume: 0.1, at: 0.21 }, { wave: "triangle", freq: 130, to: 70, decay: 0.12, volume: 0.13 }], "heavy"],
            splash: [[{ wave: "noise", freq: 900, to: 300, decay: 0.32, volume: 0.13 }, { wave: "sine", freq: 300, to: 130, decay: 0.16, volume: 0.08 }], "medium"],
            unfold: [[{ wave: "noise", freq: 2400, decay: 0.06, volume: 0.07 }, { wave: "noise", freq: 3200, decay: 0.06, volume: 0.07, at: 0.17 }, { wave: "noise", freq: 4200, decay: 0.08, volume: 0.08, at: 0.34 }, { wave: "sine", freq: 523, to: 784, decay: 0.3, volume: 0.05, at: 0.42 }], "light"],
            launch: [[{ wave: "noise", freq: 800, to: 2600, attack: 0.1, decay: 0.3, volume: 0.1 }, { wave: "sine", freq: 392, to: 587, decay: 0.28, volume: 0.05, at: 0.08 }], "medium"],
            lift: [[{ wave: "noise", freq: 500, to: 1600, attack: 0.12, decay: 0.34, volume: 0.05 }, { wave: "sine", freq: 523, to: 659, attack: 0.05, decay: 0.3, volume: 0.03 }], "tick"],
            ribbonIn: [[{ wave: "sine", freq: 392, decay: 0.3, volume: 0.05 }, { wave: "sine", freq: 587, decay: 0.34, volume: 0.05, at: 0.08 }, { wave: "sine", freq: 784, decay: 0.4, volume: 0.05, at: 0.16 }, { wave: "noise", freq: 900, to: 2800, attack: 0.15, decay: 0.3, volume: 0.07 }], "medium"],
            ribbonOut: [[{ wave: "noise", freq: 2200, to: 600, decay: 0.26, volume: 0.05 }], "tick"],
            stall: [[{ wave: "noise", freq: 3400, decay: 0.05, volume: 0.09 }, { wave: "noise", freq: 3000, decay: 0.05, volume: 0.09, at: 0.09 }, { wave: "sine", freq: 500, to: 340, decay: 0.3, volume: 0.05 }], "warn"],
            recover: [[{ wave: "sine", freq: 440, to: 660, decay: 0.2, volume: 0.04 }], "tick"],
            skim: [[{ wave: "noise", freq: 1200, to: 3400, decay: 0.1, volume: 0.04 }], "tick"],
            flap: [[{ wave: "noise", freq: 1100, to: 420, attack: 0.03, decay: 0.15, volume: 0.1 }], "tick"],
            deliver: [[{ wave: "triangle", freq: 659, decay: 0.42, volume: 0.09 }, { wave: "triangle", freq: 784, decay: 0.42, volume: 0.08, at: 0.1 }, { wave: "triangle", freq: 988, decay: 0.42, volume: 0.08, at: 0.2 }, { wave: "sine", freq: 1319, decay: 0.8, volume: 0.06, at: 0.3 }, { wave: "noise", freq: 3400, decay: 0.08, volume: 0.05 }], "success"],
            stamp: [[{ wave: "triangle", freq: 200, to: 70, decay: 0.09, volume: 0.15 }, { wave: "sine", freq: 880, decay: 0.3, volume: 0.06, at: 0.06 }, { wave: "sine", freq: 1319, decay: 0.5, volume: 0.05, at: 0.14 }], "medium"],
            hoop: [[{ wave: "triangle", freq: 440 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26][Math.min(11, x)] / 12), decay: 0.3, volume: 0.09 }, { wave: "noise", freq: 2200, to: 900, decay: 0.12, volume: 0.05 }], "light"],
            count: [[{ wave: "triangle", freq: 523, decay: 0.16, volume: 0.09 }], "tick"], go: [[{ wave: "triangle", freq: 1047, decay: 0.35, volume: 0.1 }], "medium"],
            finish: [[{ wave: "triangle", freq: 523, decay: 0.3, volume: 0.09 }, { wave: "triangle", freq: 659, decay: 0.3, volume: 0.09, at: 0.12 }, { wave: "triangle", freq: 784, decay: 0.3, volume: 0.09, at: 0.24 }, { wave: "triangle", freq: 1047, decay: 0.6, volume: 0.09, at: 0.36 }], "success"],
            bell: [[{ wave: "sine", freq: 392, decay: 2.4, volume: 0.1 }, { wave: "sine", freq: 787, decay: 1.5, volume: 0.05 }, { wave: "sine", freq: 1176, decay: 0.8, volume: 0.03 }], "medium"],
            page: [[{ wave: "noise", freq: 3800, to: 1300, decay: 0.14, volume: 0.07 }], "tick"],
            chapter: [[{ wave: "sine", freq: 523, decay: 0.8, volume: 0.07 }, { wave: "sine", freq: 659, decay: 0.8, volume: 0.06, at: 0.16 }, { wave: "sine", freq: 784, decay: 0.8, volume: 0.06, at: 0.32 }, { wave: "sine", freq: 1047, decay: 1.2, volume: 0.06, at: 0.48 }], "success"],
            light: [[{ wave: "sine", freq: 880, to: 1046, decay: 0.3, volume: 0.05 }], "light"],
        }[name];
        if (E) g.sfx(E[0], { haptic: E[1] });
    }
}
