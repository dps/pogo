// Original music: every area is a slow chord loop built from a table, so it stays quiet, musical and easy to live with.
const N = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
const NAME = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const note = (root, semis, oct) => { const n = N[root] + semis; return NAME[((n % 12) + 12) % 12] + (oct + Math.floor(n / 12)); };
const parse = (c) => { const m = c.match(/^([A-G][b#]?)(m?)/); return { root: m[1], third: m[2] ? 3 : 4 }; };

function loop({ bpm, chords, arp = [0, 2, 1, 2], bars = 1, steps = 8, lead = null, drum = false, bassOct = 2, arpWave = "triangle", vol = 1 }) {
    const pad = [], bass = [], arps = [], kick = [], hat = [];
    for (const c of chords) for (let b = 0; b < bars; b++) {
        const { root, third } = parse(c), tones = [0, third, 7, 12];
        for (let i = 0; i < steps; i++) {
            pad.push(i === 0 ? note(root, third, 4) : "-");
            bass.push(i === 0 ? note(root, 0, bassOct) : i === 6 && steps === 8 ? note(root, 7, bassOct - 1) : "-");
            arps.push(i % 2 === 0 ? note(root, tones[arp[(i / 2) % arp.length]], 4) : "-");
            kick.push(drum && i % 4 === 0 ? "C3" : "-");
            hat.push(drum && i % 2 === 1 ? "C8" : "-");
        }
    }
    const tracks = [
        { wave: "sine", notes: pad.join(" "), volume: 0.1 * vol, attack: 0.5, decay: (60 / bpm) * 8 },
        { wave: "triangle", notes: bass.join(" "), volume: 0.16 * vol, decay: 1.1 },
        { wave: arpWave, notes: arps.join(" "), volume: 0.06 * vol, decay: 0.5 },
    ];
    if (lead) { const n = pad.length, l = lead.split(" "); tracks.push({ wave: "sine", notes: Array.from({ length: n }, (_, i) => l[i % l.length]).join(" "), volume: 0.075 * vol, attack: 0.03, decay: 0.8 }); }
    if (drum) { tracks.push({ wave: "sine", notes: kick.join(" "), volume: 0.2 * vol, slide: 0.5, decay: 0.16 }); tracks.push({ wave: "noise", notes: hat.join(" "), volume: 0.03 * vol, decay: 0.05 }); }
    return { bpm, steps: 2, tracks };
}

export const SONGS = {
    title: loop({ bpm: 58, chords: ["Am", "F", "C", "G", "Am", "Dm", "E", "E"], arp: [0, 1, 2, 3, 2, 1], lead: "E5 - - - C5 - - - D5 - - - - - - - A4 - - - B4 - - - C5 - - - - - - -" }),
    gum: loop({ bpm: 72, chords: ["Am", "F", "Dm", "E"], bars: 2, lead: "A4 - C5 - E5 - - - - - - - - - - - F5 - E5 - C5 - - - - - - - - - - - D5 - F5 - A5 - - - - - - - - - - - G#4 - B4 - E5 - - - - - - - - - - -" }),
    enamel: loop({ bpm: 66, chords: ["Em", "C", "G", "D"], bars: 2, arp: [2, 3, 1, 3], lead: "B5 - - - - - - - G5 - - - - - - - E5 - - - - - - - G5 - - - - - - -" }),
    sugar: loop({ bpm: 84, chords: ["C", "Am", "F", "G"], arp: [0, 1, 2, 3, 2, 3], arpWave: "sine", lead: "G5 E5 - C5 - - - - A5 - G5 - E5 - - - F5 A5 - F5 - - - - G5 - D5 - B4 - - -" }),
    tongue: loop({ bpm: 92, chords: ["F", "Dm", "Bb", "C"], arp: [0, 2, 1, 2], lead: "A4 - C5 - A4 - - - F4 - A4 - D5 - - - Bb4 - D5 - F5 - - - E5 - C5 - G4 - - -" }),
    swamp: loop({ bpm: 60, chords: ["Dm", "Dm", "Bb", "A"], bars: 2, bassOct: 2, arp: [0, 1, 0, 2], lead: "D5 - - F5 - - E5 - - - - - - - - -" }),
    nerve: loop({ bpm: 104, chords: ["Em", "F", "Em", "D"], arp: [0, 3, 1, 3], arpWave: "square", vol: 0.8, drum: true, lead: "E5 - - B4 - - E5 - F5 - - C5 - - A4 - E5 - - B4 - - G5 - F#5 - - D5 - - A4 -" }),
    tonsil: loop({ bpm: 76, chords: ["G", "Em", "C", "D"], arp: [0, 1, 2, 3], lead: "B4 - D5 - G5 - - - - - - - - - - - C5 - E5 - G5 - - - F#5 - D5 - - - - -" }),
    throat: loop({ bpm: 48, chords: ["Am", "Am", "Fm", "Em"], bars: 2, bassOct: 1, arp: [0, 3], vol: 0.9 }),
    stomach: loop({ bpm: 80, chords: ["Cm", "Ab", "Eb", "Bb"], arp: [0, 1, 2, 1], drum: true, vol: 0.8, lead: "G4 - Eb5 - C5 - - - Ab4 - C5 - Eb5 - - - G5 - Eb5 - Bb4 - - - D5 - F5 - Bb4 - - -" }),
    pulp: loop({ bpm: 64, chords: ["Dm", "Bb", "Gm", "A"], bars: 2, arp: [2, 1, 0, 1], lead: "A5 - - - F5 - - - D5 - - - - - - - G5 - - - E5 - - - C#5 - - - - - - -" }),
    boss: loop({ bpm: 148, chords: ["Em", "Em", "C", "B"], arp: [0, 2, 3, 2], arpWave: "square", drum: true, vol: 0.85, lead: "E5 - G5 - B5 - G5 - F#5 - E5 - D#5 - B4 - E5 - G5 - C6 - B5 - A5 - F#5 - D#5 - B4 -" }),
    ache: loop({ bpm: 132, chords: ["Dm", "Eb", "Dm", "C#"], arp: [0, 3, 1, 3], arpWave: "sawtooth", drum: true, vol: 0.8, lead: "D5 - F5 - A5 - F5 - Eb5 - G5 - Bb5 - G5 - D5 - F5 - A5 - D6 - C#6 - A5 - F5 - E5 -" }),
    ending: loop({ bpm: 70, chords: ["C", "G", "Am", "F", "C", "G", "F", "C"], arp: [0, 1, 2, 3, 2, 1], lead: "E5 - - - G5 - - - D5 - - - B4 - - - C5 - - - E5 - - - A4 - - - - - - -" }),
};

const t = (wave, freq, to, decay, volume, at = 0, attack = 0) => ({ wave, freq, to, decay, volume, at, attack });
export const SFX = {
    jump: t("sine", 300, 560, 0.1, 0.13), airJump: [t("noise", 1800, 500, 0.14, 0.09), t("sine", 500, 900, 0.1, 0.1)], wallJump: [t("square", 240, 420, 0.07, 0.06), t("noise", 900, 500, 0.06, 0.05)],
    land: t("sine", 150, 70, 0.08, 0.14), step: t("noise", 500, 300, 0.02, 0.02),
    drill: [t("sawtooth", 180, 240, 0.09, 0.07), t("square", 720, 680, 0.08, 0.025)], drillHit: [t("sawtooth", 150, 80, 0.1, 0.14), t("noise", 2200, 700, 0.07, 0.1)],
    clank: [t("square", 1500, 1200, 0.05, 0.08), t("square", 2300, 1900, 0.04, 0.05)], crack: t("noise", 1200, 300, 0.1, 0.12), break: [t("noise", 900, 100, 0.3, 0.2), t("sine", 120, 40, 0.25, 0.2)],
    floss: [t("sine", 900, 500, 0.06, 0.1), t("triangle", 160, 90, 0.1, 0.16)], flossMiss: t("sine", 500, 300, 0.1, 0.05), flossJump: t("sine", 400, 800, 0.12, 0.1),
    dash: [t("noise", 2600, 700, 0.18, 0.13), t("sine", 700, 300, 0.14, 0.08)], bounce: t("sine", 220, 880, 0.18, 0.14), splash: t("noise", 1400, 300, 0.2, 0.1), swim: t("noise", 800, 500, 0.08, 0.04),
    rail: t("square", 1100, 900, 0.05, 0.06), hurt: [t("sawtooth", 320, 90, 0.22, 0.17), t("noise", 900, 200, 0.14, 0.1)], foeHit: t("square", 480, 220, 0.07, 0.09), foeDie: [t("noise", 1000, 200, 0.16, 0.13), t("sine", 500, 90, 0.18, 0.12)],
    shoot: t("square", 620, 300, 0.09, 0.05), boom: [t("noise", 700, 60, 0.4, 0.22), t("sine", 110, 35, 0.4, 0.22)], slam: [t("sine", 130, 40, 0.3, 0.25), t("noise", 500, 80, 0.2, 0.12)], roar: [t("sawtooth", 120, 70, 0.6, 0.14), t("square", 90, 60, 0.6, 0.06)],
    tele: t("sine", 500, 900, 0.3, 0.06), bossHit: [t("sawtooth", 260, 90, 0.12, 0.16), t("noise", 2600, 500, 0.08, 0.12)], heartbeat: [t("sine", 62, 44, 0.12, 0.26), t("sine", 56, 40, 0.14, 0.2, 0.2)],
    pick: [t("triangle", 660, 660, 0.09, 0.11), t("triangle", 990, 990, 0.14, 0.1, 0.08)], crown: [t("triangle", 523, 523, 0.12, 0.13), t("triangle", 659, 659, 0.12, 0.13, 0.1), t("triangle", 784, 784, 0.12, 0.13, 0.2), t("triangle", 1047, 1047, 0.3, 0.14, 0.3)],
    tool: [t("sine", 392, 392, 0.2, 0.14), t("sine", 523, 523, 0.2, 0.14, 0.16), t("sine", 659, 659, 0.2, 0.14, 0.32), t("sine", 1047, 1047, 0.6, 0.16, 0.48)],
    sink: [t("sine", 700, 300, 0.2, 0.09), t("noise", 1800, 900, 0.5, 0.05, 0.05), t("sine", 880, 880, 0.4, 0.09, 0.2)], talk: t("square", 520, 620, 0.03, 0.03), beam: t("sawtooth", 880, 880, 0.08, 0.02), open: [t("sine", 200, 800, 0.4, 0.13), t("noise", 800, 300, 0.3, 0.08)],
    menu: t("sine", 800, 1000, 0.05, 0.08), map: [t("sine", 500, 700, 0.1, 0.07)], gate: [t("sine", 90, 60, 0.35, 0.22), t("noise", 400, 100, 0.2, 0.1)], die: [t("sawtooth", 500, 60, 0.8, 0.18), t("noise", 800, 100, 0.6, 0.1)],
};
