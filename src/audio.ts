// Synthesised audio: games get sound effects and music with no files. Every play is logged so headless runs can assert on it.
import { PogoError, suggest } from "./errors";
import type { Game } from "./game";

export interface Tone {
    wave?: OscillatorType | "noise";
    /** Start frequency in Hz. */
    freq?: number;
    /** End frequency in Hz; slides from freq. */
    to?: number;
    attack?: number;
    /** Seconds until silent. */
    decay?: number;
    volume?: number;
    /** Seconds after the sound's start. */
    at?: number;
}
export type Sfx = Tone | Tone[];

export const SFX: Record<string, Sfx> = {
    click: { wave: "square", freq: 660, to: 520, decay: 0.05, volume: 0.25 },
    jump: { wave: "square", freq: 280, to: 620, decay: 0.16, volume: 0.28 },
    land: { wave: "triangle", freq: 170, to: 80, decay: 0.08, volume: 0.35 },
    coin: [{ wave: "square", freq: 880, decay: 0.08, volume: 0.25 }, { wave: "square", freq: 1320, decay: 0.2, volume: 0.25, at: 0.07 }],
    shoot: { wave: "sawtooth", freq: 820, to: 160, decay: 0.14, volume: 0.2 },
    hit: { wave: "noise", freq: 900, to: 200, decay: 0.16, volume: 0.45 },
    explode: { wave: "noise", freq: 500, to: 50, decay: 0.5, volume: 0.6 },
    powerup: [{ wave: "triangle", freq: 440, decay: 0.1 }, { wave: "triangle", freq: 660, decay: 0.1, at: 0.09 }, { wave: "triangle", freq: 880, decay: 0.24, at: 0.18 }],
    lose: [{ wave: "sawtooth", freq: 330, to: 300, decay: 0.2, volume: 0.25 }, { wave: "sawtooth", freq: 262, to: 110, decay: 0.5, volume: 0.25, at: 0.2 }],
    win: [{ wave: "square", freq: 523, decay: 0.12, volume: 0.2 }, { wave: "square", freq: 659, decay: 0.12, volume: 0.2, at: 0.12 }, { wave: "square", freq: 784, decay: 0.12, volume: 0.2, at: 0.24 }, { wave: "square", freq: 1047, decay: 0.4, volume: 0.2, at: 0.36 }],
};

export interface Track { wave?: OscillatorType; volume?: number; notes: string; }
export interface Song { bpm?: number; /** Steps per beat. Default 2 (eighth notes). */ steps?: number; tracks: Track[]; loop?: boolean; }

const NOTE = /^([A-G])([#b]?)(\d)$/;
const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(n: string) {
    const m = NOTE.exec(n);
    if (!m) throw new PogoError("BAD_NOTE", `Cannot parse note "${n}".`, `Notes look like C4, F#3 or Bb2; "-" is a rest.`);
    const semi = SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
    return 440 * 2 ** ((semi - 69) / 12);
}

export class Audio {
    /** Recent sounds, newest last; visible in game.state(). */
    readonly log: string[] = [];
    muted = false;
    volume = 1;
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private noise: AudioBuffer | null = null;
    private buffers = new Map<string, AudioBuffer | null>();
    private music: { timer: ReturnType<typeof setInterval>; gain: GainNode } | null = null;
    private unlocked = false;
    private blocked = false;

    constructor(private game: Game) {}

    private ensure() {
        if (this.ctx || this.blocked || this.game.headless) return this.ctx;
        const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
        if (!Ctor) return null;
        // A blocked or exhausted audio device means a silent game, not a dead one.
        try { this.ctx = new Ctor() as AudioContext; } catch { this.blocked = true; return null; }
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        const n = Math.floor(this.ctx.sampleRate * 0.5);
        this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return this.ctx;
    }

    /** Browsers only allow audio after a user gesture; the DOM layer calls this on the first one. */
    unlock() {
        if (this.unlocked && this.ctx?.state === "running") return;
        this.unlocked = true;
        this.ensure()?.resume().catch(() => {});
    }
    suspend() { this.ctx?.suspend().catch(() => {}); }
    resume() { if (this.unlocked) this.ctx?.resume().catch(() => {}); }

    register(name: string) { this.buffers.set(name, null); }
    async load(name: string, url: string) {
        const res = await fetch(url);
        if (!res.ok) throw new PogoError("ASSET_LOAD", `Sound "${name}" failed to load from ${url} (${res.status}).`);
        const data = await res.arrayBuffer();
        const ctx = this.ensure();
        this.buffers.set(name, ctx ? await ctx.decodeAudioData(data) : null);
    }

    /** Play a preset, a loaded sound, or a custom tone. */
    play(sound: string | Sfx) {
        const name = typeof sound === "string" ? sound : "custom";
        if (typeof sound === "string" && !(sound in SFX) && !this.buffers.has(sound)) {
            throw new PogoError("UNKNOWN_SOUND", `No sound named "${sound}".`, suggest(sound, [...Object.keys(SFX), ...this.buffers.keys()]));
        }
        this.log.push(name);
        if (this.log.length > 32) this.log.shift();
        const ctx = this.ctx;
        if (!ctx || !this.master || this.muted || ctx.state !== "running") return;
        this.master.gain.value = this.volume;
        if (typeof sound === "string" && this.buffers.get(sound)) {
            const src = ctx.createBufferSource();
            src.buffer = this.buffers.get(sound)!;
            src.connect(this.master);
            src.start();
            return;
        }
        const def = typeof sound === "string" ? SFX[sound] : sound;
        for (const t of Array.isArray(def) ? def : [def]) this.tone(t, ctx.currentTime + (t.at ?? 0), this.master);
    }

    private tone(t: Tone, start: number, out: AudioNode) {
        const ctx = this.ctx!, gain = ctx.createGain(), attack = t.attack ?? 0.005, decay = t.decay ?? 0.15, peak = t.volume ?? 0.3, end = start + attack + decay;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + attack);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        gain.connect(out);
        const freq = t.freq ?? 440;
        if (t.wave === "noise") {
            const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
            src.buffer = this.noise;
            src.loop = true;
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(freq, start);
            if (t.to) filter.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), end);
            src.connect(filter).connect(gain);
            src.start(start);
            src.stop(end + 0.02);
        } else {
            const osc = ctx.createOscillator();
            osc.type = t.wave ?? "square";
            osc.frequency.setValueAtTime(freq, start);
            if (t.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, t.to), end);
            osc.connect(gain);
            osc.start(start);
            osc.stop(end + 0.02);
        }
    }

    /** Loop a song written as note strings: { bpm: 120, tracks: [{ notes: "C4 E4 G4 - C5 - G4 -" }] }. */
    playMusic(song: Song) {
        this.stopMusic();
        const parsed = song.tracks.map((t) => ({ ...t, seq: t.notes.trim().split(/\s+/).map((n) => (n === "-" ? 0 : noteFreq(n))) }));
        this.log.push("music");
        const ctx = this.ensure();
        if (!ctx || !this.master) return;
        const gain = ctx.createGain();
        gain.gain.value = 0.5;
        gain.connect(this.master);
        const stepDur = 60 / (song.bpm ?? 120) / (song.steps ?? 2), length = Math.max(...parsed.map((t) => t.seq.length));
        let step = 0, next = ctx.currentTime + 0.05;
        const timer = setInterval(() => {
            if (ctx.state !== "running" || this.muted) { next = ctx.currentTime + 0.05; return; }
            while (next < ctx.currentTime + 0.2) {
                if (step >= length && song.loop === false) { this.stopMusic(); return; }
                for (const t of parsed) {
                    const f = t.seq[step % t.seq.length];
                    if (f) this.tone({ wave: t.wave ?? "triangle", freq: f, decay: stepDur * 1.4, volume: t.volume ?? 0.2 }, next, gain);
                }
                step++;
                next += stepDur;
            }
        }, 60);
        this.music = { timer, gain };
    }

    stopMusic() {
        if (!this.music) return;
        clearInterval(this.music.timer);
        this.music.gain.disconnect();
        this.music = null;
    }
}
