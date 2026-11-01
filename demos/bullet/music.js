// The songs, and what the patterns read from them. A song is written as chords and a melody; arrange() turns it into Pogo note strings
// and keeps the chord chart, so every burst of bullets can ring a note that belongs to the bar it lands in.

const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PC = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
export const noteName = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
export const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);
const QUAL = { "": [0, 4, 7], m: [0, 3, 7], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 7: [0, 4, 7, 10], sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], dim: [0, 3, 6], m9: [0, 3, 7, 10, 14], maj9: [0, 4, 7, 11, 14] };
export function parseChord(c) {
    const m = c.match(/^([A-G][#b]?)(.*)$/);
    if (!m || !(m[1] in PC) || !(m[2] in QUAL)) throw new Error(`Bad chord ${c}`);
    return { root: PC[m[1]], tones: QUAL[m[2]], name: c };
}
const toMidi = (n) => { const m = n.match(/^([A-G][#b]?)(-?\d)$/); if (!m) throw new Error(`Bad note ${n}`); return PC[m[1]] + (Number(m[2]) + 1) * 12; };

/** Nearest voicing of a chord around a centre note. */
function voicing(ch, centre, n = 3) {
    const out = ch.tones.slice(0, Math.max(n, 3)).map((t) => { let m = ch.root + t; while (m < centre - 6) m += 12; while (m >= centre + 6) m -= 12; return m; });
    return out.sort((a, b) => a - b).slice(0, n);
}

/**
 * spec: { bpm, meter (beats a bar), sub (steps a beat), chords: "Dm7 Bb C F" one per `perChord` bars, repeat, parts }
 * parts, each optional. Pattern strings have one symbol per step and repeat each bar; digits are chord-tone indices, "." is rest.
 *   pad: { vol, oct }           long held chords
 *   bass: { pat, vol, oct }     e.g. "0.......4......."
 *   arp: { pat, vol, oct, wave, echo } echo is steps of fake delay
 *   lead: "F5 . . A5 ..."        hand-written, whole-song, one token per step of `leadUnit` steps
 *   kick, hat, snare: pattern strings with "x"
 *   bell: extra high ornaments, chord-tone pattern
 */
export function arrange(spec) {
    const { bpm, meter = 4, sub = 4, perChord = 1, repeat = 1 } = spec, p = spec.parts, bar = meter * sub;
    const list = spec.chords.trim().split(/\s+/).map(parseChord), bars = list.length * perChord * repeat, n = bars * bar, secStep = 60 / bpm / sub;
    const chordAt = (b) => list[Math.floor(b / perChord) % list.length];
    const tracks = [], blank = () => Array(n).fill("-");
    const stamp = (t, i, m) => { t[i] = noteName(m); };
    const pattern = (pat, fn) => { const q = pat.replace(/\s+/g, ""); if (q.length !== bar && q.length !== bar * 2 && q.length !== bar * 4) throw new Error(`Pattern ${pat} is ${q.length}, wanted ${bar}`); for (let i = 0; i < n; i++) { const c = q[i % q.length]; if (c !== "." && c !== "-") fn(i, c, Math.floor(i / bar)); } };

    if (p.pad) {
        const v = p.pad, count = v.voices ?? 3;
        for (let k = 0; k < count; k++) {
            const t = blank();
            for (let b = 0; b < bars; b += perChord) { const ch = chordAt(b), m = voicing(ch, v.centre ?? 62, count)[k]; if (m !== undefined) stamp(t, b * bar, m); }
            const dur = perChord * bar * secStep;
            tracks.push({ wave: v.wave ?? "triangle", volume: v.vol ?? 0.05, attack: Math.min(dur * 0.34, 0.9), decay: dur * 1.02, notes: t.join(" ") });
        }
    }
    if (p.bass) {
        const v = p.bass, t = blank();
        pattern(v.pat, (i, c, b) => { const ch = chordAt(b), iv = c === "o" ? 12 : ch.tones[Number(c) % ch.tones.length]; stamp(t, i, ch.root + (v.oct ?? 3) * 12 + 12 + iv - (ch.root > 7 ? 12 : 0)); });
        tracks.push({ wave: v.wave ?? "triangle", volume: v.vol ?? 0.2, decay: v.decay ?? secStep * 3.4, attack: 0.012, notes: t.join(" ") });
    }
    if (p.arp) {
        for (const v of [].concat(p.arp)) {
            const t = blank(), e = v.echo ? blank() : null;
            pattern(v.pat, (i, c, b) => {
                const ch = chordAt(b), vs = voicing(ch, v.centre ?? 72, 4), d = Number.parseInt(c, 16), m = d >= 4 ? vs[d % vs.length] + 12 : vs[d % vs.length];
                stamp(t, i, m); if (e) stamp(e, (i + v.echo) % n, m);
            });
            tracks.push({ wave: v.wave ?? "sine", volume: v.vol ?? 0.07, decay: v.decay ?? secStep * 3, notes: t.join(" ") });
            if (e) tracks.push({ wave: v.wave ?? "sine", volume: (v.vol ?? 0.07) * 0.34, decay: v.decay ?? secStep * 3, notes: e.join(" ") });
        }
    }
    if (p.lead) {
        const v = p.lead, unit = v.unit ?? sub, toks = v.line.replace(/\|/g, " ").trim().split(/\s+/), t = blank();
        toks.forEach((tk, i) => { if (tk !== "." && tk !== "-") { const at = i * unit; if (at >= n) throw new Error(`Lead runs past the song: ${spec.id}, token ${i} of ${toks.length}, song ${n / unit} units`); stamp(t, at, toMidi(tk)); } });
        tracks.push({ wave: v.wave ?? "triangle", volume: v.vol ?? 0.11, decay: v.decay ?? secStep * unit * 1.8, attack: v.attack ?? 0.02, notes: t.join(" ") });
        if (v.echo) tracks.push({ wave: v.wave ?? "triangle", volume: (v.vol ?? 0.11) * 0.3, decay: v.decay ?? secStep * unit * 1.8, attack: 0.02, notes: t.map((_, i) => t[(i - v.echo + n) % n]).join(" ") });
    }
    if (p.kick) { const t = blank(); pattern(p.kick, (i) => { t[i] = "A2"; }); tracks.push({ wave: "sine", volume: p.kickVol ?? 0.28, decay: 0.16, slide: 0.3, attack: 0.002, notes: t.join(" ") }); }
    if (p.snare) { const t = blank(); pattern(p.snare, (i) => { t[i] = "C7"; }); tracks.push({ wave: "noise", volume: p.snareVol ?? 0.07, decay: 0.12, attack: 0.002, notes: t.join(" ") }); }
    if (p.hat) { const t = blank(); pattern(p.hat, (i) => { t[i] = "C9"; }); tracks.push({ wave: "noise", volume: p.hatVol ?? 0.022, decay: 0.03, attack: 0.001, notes: t.join(" ") }); }
    return {
        id: spec.id, bpm, meter, sub, bars, secBeat: 60 / bpm, secBar: meter * 60 / bpm, chordAt,
        /** The chord sounding at a beat. Loops with the song. */
        chordAtBeat: (beat) => chordAt(Math.floor(beat / meter)),
        pogo: { bpm, steps: sub, tracks },
        /** Note for a burst: rising chord tones, so a run of bursts arpeggiates the bar it falls in. */
        bellNote(beat, i = 0, oct = 5) { const ch = chordAt(Math.floor(beat / meter)), t = ch.tones, k = ((i % t.length) + t.length) % t.length; return (oct + 1) * 12 + ch.root + t[k] + 12 * Math.floor(i / t.length % 2 + (i < 0 ? 1 : 0)); },
    };
}

export const SONGS = {
    // Title: a slow Lydian breath around one candle.
    title: arrange({ id: "title", bpm: 76, meter: 4, sub: 4, chords: "Dmaj9 Dmaj9 Bm7 Bm7 Gmaj7 Gmaj7 A7 A7", parts: {
        pad: { vol: 0.042, centre: 64, voices: 4 }, bass: { pat: "0.......4.......", vol: 0.14, decay: 1.2 },
        arp: { pat: "0.2.1.3.5.3.1.2.", vol: 0.06, echo: 3, centre: 74, decay: 0.7 },
        lead: { unit: 8, vol: 0.075, echo: 6, wave: "sine", decay: 1.4, line: "A5 F#5 | E5 . | D5 F#5 | B4 . | B5 A5 | G5 D5 | E5 F#5 | E5 ." },
    } }),
    s1: arrange({ id: "s1", bpm: 92, meter: 4, sub: 4, chords: "Dadd9 Aadd9 Bm7 Gmaj7", perChord: 2, repeat: 2, parts: {
        pad: { vol: 0.04 }, bass: { pat: "0.....0.4.......", vol: 0.17 },
        arp: { pat: "0.1.2.1.3.2.1.2.", vol: 0.058, echo: 3, decay: 0.5 }, kick: "x.......x.......", kickVol: 0.17, hat: "..x...x...x...x.",
        lead: { unit: 4, vol: 0.085, echo: 6, line: "F#5 . A5 . | E5 . . . | E5 . A5 . | C#5 . . . | D5 . F#5 . | B4 . . D5 | D5 . B4 . | G4 . . . | F#5 . A5 . | B5 . A5 . | E5 . A5 . | C#6 . . . | D6 . B5 . | A5 . F#5 . | G5 . E5 . | D5 . . ." },
    } }),
    b1: arrange({ id: "b1", bpm: 104, meter: 4, sub: 4, chords: "Bm7 Gmaj7 Dadd9 Aadd9 Bm7 Gmaj7 Em7 F#m7", repeat: 2, parts: {
        pad: { vol: 0.04 }, bass: { pat: "0..0..0.4..4..2.", vol: 0.18 },
        arp: { pat: "0213021302130213", vol: 0.05, echo: 3, decay: 0.34 }, kick: "x...x...x...x.x.", kickVol: 0.2, snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
        lead: { unit: 8, vol: 0.09, echo: 6, line: "F#5 A5 | B5 . | A5 F#5 | E5 . | F#5 A5 | B5 D6 | B5 G5 | A5 C#6 | D6 C#6 | B5 . | A5 F#5 | E5 . | F#5 D6 | B5 . | G5 B5 | C#6 ." },
    } }),
    s2: arrange({ id: "s2", bpm: 84, meter: 4, sub: 4, chords: "Am9 Fmaj7 Cmaj7 Em7 Dm7 Fmaj7 Am9 E7", perChord: 2, parts: {
        pad: { vol: 0.042, wave: "sine", voices: 4, centre: 60 }, bass: { pat: "0.......0...4...", vol: 0.17 },
        arp: { pat: "0.2.4.2.1.3.5.3.", vol: 0.055, echo: 3, decay: 0.6 }, kick: "x.........x.....", kickVol: 0.14, hat: "....x.......x...",
        lead: { unit: 8, vol: 0.085, echo: 3, wave: "sine", decay: 1.1, line: "E5 G5 | B5 A5 | A5 . | G5 E5 | G5 . | E5 D5 | E5 . | B4 . | A4 C5 | F5 E5 | A5 . | C6 B5 | E5 A5 | C6 . | B5 . | G#5 ." },
    } }),
    b2: arrange({ id: "b2", bpm: 96, meter: 4, sub: 4, chords: "Am7 Fmaj7 Dm7 E7 Am7 Fmaj7 Gmaj7 E7", repeat: 2, parts: {
        pad: { vol: 0.04, wave: "sine", voices: 4, centre: 60 }, bass: { pat: "0..4..0.0..4..2.", vol: 0.18 },
        arp: { pat: "0.2.4.5.4.2.1.3.", vol: 0.062, echo: 3, decay: 0.42 }, kick: "x.....x...x.....", kickVol: 0.2, snare: "....x.......x...", snareVol: 0.05, hat: "x.x.x.x.x.x.x.x.",
        lead: { unit: 8, vol: 0.09, echo: 6, line: "A5 C6 | E6 . | C6 A5 | F5 . | F5 A5 | D6 . | B5 G#5 | E5 . | A5 C6 | E6 . | F6 E6 | C6 . | B5 D6 | G6 . | G#5 B5 | E6 ." },
    } }),
    // Stage three is a waltz: she spins in threes.
    s3: arrange({ id: "s3", bpm: 138, meter: 3, sub: 2, chords: "Em7 Cmaj7 Am7 B7 Em7 Cmaj7 Gmaj7 B7", perChord: 2, parts: {
        pad: { vol: 0.038 }, bass: { pat: "0.....", vol: 0.19, decay: 0.9 },
        arp: { pat: "..12..12..30", vol: 0.056, echo: 2, decay: 0.45, wave: "triangle" }, hat: "..x.x...x.x.",
        lead: { unit: 6, vol: 0.09, echo: 3, line: "B5 | G5 | E5 | . | C6 | G5 | E5 | . | A5 | E5 | F#5 | D#5 | B5 | G5 | E5 | ." },
    } }),
    b3: arrange({ id: "b3", bpm: 156, meter: 3, sub: 2, chords: "Em Cmaj7 Am B7 Em G Am B7", repeat: 2, parts: {
        pad: { vol: 0.04 }, bass: { pat: "0...4.", vol: 0.19, decay: 0.5 },
        arp: { pat: "012301", vol: 0.05, echo: 2, decay: 0.3 }, kick: "x.....", kickVol: 0.2, snare: "..x.x.", snareVol: 0.04, hat: "x.x.x.",
        lead: { unit: 6, vol: 0.09, echo: 3, line: "E6 | C6 | A5 | B5 | G5 | D6 | C6 | D#6 | E6 | G6 | E6 | D#6 | B5 | D6 | E6 | F#6" },
    } }),
    s4: arrange({ id: "s4", bpm: 100, meter: 4, sub: 4, chords: "Dm7 Dm7 Bbmaj7 Bbmaj7 Gm7 C7 Fmaj7 A7", repeat: 2, parts: {
        pad: { vol: 0.05, wave: "sawtooth", voices: 4, centre: 58 }, bass: { pat: "0.......0.......", vol: 0.19, decay: 1.1 },
        arp: { pat: "0...2...4...2...", vol: 0.06, echo: 6, decay: 0.8, wave: "triangle" }, kick: "x...............", kickVol: 0.16,
        lead: { unit: 8, vol: 0.085, echo: 6, wave: "triangle", decay: 1, line: "D5 F5 | A5 . | G5 F5 | D5 . | G5 A5 | C6 . | C6 A5 | C#6 . | D6 C6 | A5 . | G5 F5 | G5 . | D5 G5 | E5 . | F5 A5 | E5 ." },
    } }),
    b4: arrange({ id: "b4", bpm: 112, meter: 4, sub: 4, chords: "Dm Bb Gm A7 Dm Bb C A7", repeat: 2, parts: {
        pad: { vol: 0.05, wave: "sawtooth", voices: 4, centre: 58 }, bass: { pat: "0.0.0.4.0.0.4.2.", vol: 0.19, decay: 0.3 },
        arp: { pat: "0.2.4.2.0.2.4.5.", vol: 0.056, echo: 3, decay: 0.3, wave: "triangle" }, kick: "x...x...x...x...", kickVol: 0.22, snare: "....x.......x..x", snareVol: 0.05, hat: "..x...x...x...x.",
        lead: { unit: 8, vol: 0.09, echo: 6, wave: "square", decay: 0.5, line: "D6 F6 | A6 . | D6 F6 | Bb6 . | G6 D6 | Bb5 G5 | A5 C#6 | E6 . | D6 F6 | A6 . | D7 C7 | Bb6 . | C7 G6 | E6 C6 | C#6 E6 | A6 ." },
    } }),
    s5: arrange({ id: "s5", bpm: 128, meter: 4, sub: 4, chords: "Cm9 Abmaj7 Ebmaj7 Bbsus4 Cm9 Abmaj7 Fm7 G7", perChord: 1, repeat: 4, parts: {
        pad: { vol: 0.04 }, bass: { pat: "0.0.0..00.0.4.0.", vol: 0.17, decay: 0.26 },
        arp: { pat: "0.1.2.3.5.3.2.1.", vol: 0.05, echo: 3, decay: 0.3 }, kick: "x.....x.x.....x.", kickVol: 0.2, snare: "....x.......x...", snareVol: 0.05, hat: "x.x.x.x.x.x.x.x.",
        lead: { unit: 8, vol: 0.08, echo: 6, line: "G5 Bb5 | C6 . | G5 C6 | Eb6 . | Bb5 Eb6 | G6 F6 | F5 Bb5 | Eb6 . | G6 Eb6 | C6 . | Ab5 C6 | Eb6 . | F6 Ab5 | C6 . | B5 D6 | G6 . | G5 Bb5 | C6 . | G5 C6 | Eb6 . | Bb5 Eb6 | G6 F6 | F5 Bb5 | Eb6 . | C7 Bb6 | G6 . | Ab6 G6 | Eb6 . | F6 Ab6 | C7 . | B6 G6 | D6 ." },
    } }),
    b5: arrange({ id: "b5", bpm: 140, meter: 4, sub: 4, chords: "Cm Ab Eb Bb Fm Ab G7 G7", repeat: 2, parts: {
        pad: { vol: 0.04 }, bass: { pat: "0.0.0.0.0.0.4.4.", vol: 0.18, decay: 0.2, wave: "sawtooth" },
        arp: { pat: "0123012301230123", vol: 0.045, echo: 3, decay: 0.2 }, kick: "x...x...x...x...", kickVol: 0.24, snare: "....x.......x...", snareVol: 0.06, hat: "x.xxx.xxx.xxx.xx",
        lead: { unit: 8, vol: 0.085, echo: 6, wave: "square", decay: 0.4, line: "C6 Eb6 | G6 . | C6 Eb6 | Ab6 . | Bb5 Eb6 | G6 . | Bb5 D6 | F6 . | C6 F6 | Ab6 . | Eb6 Ab6 | C7 . | B6 G6 | D6 . | B5 D6 | G6 ." },
    } }),
    s6: arrange({ id: "s6", bpm: 72, meter: 4, sub: 4, chords: "Dm9 Bbmaj7 Gm7 A7", perChord: 2, parts: {
        pad: { vol: 0.05, voices: 4, centre: 60 }, bass: { pat: "0...............", vol: 0.16, decay: 2 },
        arp: { pat: "0.......2.......", vol: 0.05, echo: 6, decay: 1.2 },
        lead: { unit: 8, vol: 0.075, echo: 6, wave: "sine", decay: 1.8, line: "A5 . | F5 . | D5 . | . . | G5 . | D5 . | E5 . | C#5 ." },
    } }),
    b6: arrange({ id: "b6", bpm: 120, meter: 4, sub: 4, chords: "Dm9 Bbmaj7 Gm7 A7 Fmaj7 Cmaj7 Gm7 A7", repeat: 2, parts: {
        pad: { vol: 0.05, voices: 4, centre: 60 }, bass: { pat: "0..0..0.0..4..4.", vol: 0.19, decay: 0.3 },
        arp: { pat: "0213521302135213", vol: 0.046, echo: 3, decay: 0.28 }, kick: "x...x...x...x...", kickVol: 0.22, snare: "....x.......x...", snareVol: 0.05, hat: "x.x.x.x.x.x.x.x.",
        lead: { unit: 8, vol: 0.09, echo: 6, line: "A5 D6 | F6 . | F5 Bb5 | D6 . | G5 Bb5 | D6 . | C#6 E6 | A6 . | C6 F6 | A6 . | G6 E6 | C6 . | D6 G6 | Bb6 . | A6 G6 | E6 ." },
    } }),
    // The end: Dm resolves to D major, at last.
    ending: arrange({ id: "ending", bpm: 66, meter: 4, sub: 4, chords: "Dadd9 Aadd9 Bm7 Gmaj7 Dadd9 Aadd9 Gmaj7 Dadd9", parts: {
        pad: { vol: 0.05, voices: 4, centre: 66 }, bass: { pat: "0.......4.......", vol: 0.15, decay: 1.6 },
        arp: { pat: "0.1.2.3.5.3.2.1.", vol: 0.052, echo: 3, decay: 0.8 },
        lead: { unit: 8, vol: 0.08, echo: 6, wave: "sine", decay: 1.6, line: "F#5 A5 | E5 A5 | D5 F#5 | D5 G5 | A5 D6 | C#6 . | B5 G5 | A5 ." },
    } }),
};
