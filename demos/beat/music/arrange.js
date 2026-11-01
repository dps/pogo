// Turns a song written as sections, chords and melody lines into Pogo note strings, plus a map of what happens on each step.
// Charts read that map, and the bop system reads it, so the stage dances to the actual kick and snare.
import { chord, midi, noteName, voice } from "./theory.js";

/** Default mix. A style overrides any part. `d` is decay in steps, or `s` in seconds. All levels leave room for hit sounds. */
const MIX = {
    kick: { wave: "sine", note: "A3", vol: 0.42, s: 0.15, slide: 0.22 },
    click: { wave: "noise", note: "E7", vol: 0.11, s: 0.022 },
    snare: { wave: "noise", note: "C8", vol: 0.2, s: 0.13, slide: 0.35 },
    hat: { wave: "noise", note: "C9", vol: 0.055, s: 0.035 },
    perc: { wave: "noise", note: "G7", vol: 0.08, s: 0.05 },
    bass: { wave: "sawtooth", vol: 0.1, d: 2.4 },
    comp: { wave: "square", vol: 0.042, d: 1.6 },
    lead: { wave: "square", vol: 0.1, d: 2.2 },
    long: { wave: "square", vol: 0.1, d: 7 },
    counter: { wave: "triangle", vol: 0.1, d: 2.6 },
};

/** Overall level. Verified against clipping with a hit sound and the fever layer on top. */
const LOUD = 1.1;

/** Parse a line of tokens into a flat step array. Throws naming the bar if a bar has the wrong length. */
export function parseLine(line, bar, unit, label = "line") {
    const bars = line.trim().split("|").map((b) => b.trim());
    const out = [];
    bars.forEach((b, i) => {
        const tokens = b.match(/\[[^\]]*\]|\S+/g) ?? [];
        const row = [];
        for (const t of tokens) {
            if (t[0] === "[") {
                const inner = t.slice(1, -1).trim().split(/\s+/), each = unit / inner.length;
                if (each !== Math.floor(each)) throw new Error(`${label} bar ${i + 1}: group ${t} does not fit a unit of ${unit}`);
                for (const n of inner) { row.push(n); for (let k = 1; k < each; k++) row.push("-"); }
            } else { row.push(t); for (let k = 1; k < unit; k++) row.push("-"); }
        }
        if (row.length !== bar) throw new Error(`${label} bar ${i + 1}: ${row.length} steps, wanted ${bar}: "${b}"`);
        out.push(...row);
    });
    return out;
}

const rest = (t) => t === "-" || t === "." || t === undefined;
/** Expand a `x...` pattern or a list of them to one bar of a given index. */
function patternStep(p, barIndex, stepInBar) {
    if (!p) return false;
    const list = Array.isArray(p) ? p : [p], row = list[barIndex % list.length].replace(/\s/g, "");
    return row[stepInBar % row.length] === "x";
}

/** Resolve one section's chords to one chord per step. Chords in a bar split it evenly unless written like "C:6 G7:2". */
function chordLine(text, bar, label) {
    const steps = [];
    text.split("|").map((b) => b.trim()).forEach((b, i) => {
        const parts = b.split(/\s+/).map((p) => { const [sym, len] = p.split(":"); return { sym, len: len ? Number(len) : 0 }; });
        const fixed = parts.reduce((a, p) => a + p.len, 0), free = parts.filter((p) => !p.len).length;
        const each = free ? (bar - fixed) / free : 0;
        if (each !== Math.floor(each) || (!free && fixed !== bar)) throw new Error(`${label} chords bar ${i + 1}: "${b}" does not split ${bar} steps`);
        for (const p of parts) { const c = chord(p.sym); for (let k = 0; k < (p.len || each); k++) steps.push(c); }
    });
    return steps;
}

/** Bass note from a pattern token. R root, 3 5 7 chord tones, 8 octave, < and > chromatic approach to the next chord. */
function bassNote(tok, ch, next, low) {
    const rootNote = (p) => low + ((p - low) % 12 + 12) % 12;
    const root = rootNote(ch.bass);
    switch (tok) {
        case "R": return root;
        case "8": return root + 12;
        case "3": return root + ((ch.intervals[1] ?? 4));
        case "5": return root + (ch.intervals[2] ?? 7) - (root + (ch.intervals[2] ?? 7) > low + 14 ? 12 : 0);
        case "7": return root + (ch.intervals[3] ?? 10);
        case "<": return rootNote(next.root) - 1 + (rootNote(next.root) - 1 < low ? 12 : 0);
        case ">": return rootNote(next.root) + 1;
        default: return midi(tok);
    }
}

/** The whole song. `o.from`/`o.to` slice to section indexes for practice, `o.speed` scales tempo. */
export function arrange(song, o = {}) {
    const style = song.style ?? {}, mix = {};
    for (const k of Object.keys(MIX)) mix[k] = { ...MIX[k], ...(style.mix?.[k] ?? {}) };
    const bar = song.bar, unit = song.unit, grid = song.grid, speed = o.speed ?? 1;
    const bpm = song.bpm * speed, stepDur = 60 / bpm / grid;
    const form = song.form.trim().split(/\s+/), from = o.from ?? 0, to = o.to ?? form.length;
    const seq = { kick: [], snare: [], hat: [], perc: [], bass: [], c0: [], c1: [], c2: [], lead: [], long: [], counter: [] };
    const sections = [], chords = [], rawLead = [];
    let prev = null, barIndex = 0;
    for (let fi = from; fi < to; fi++) {
        const name = form[fi], key = name[0], sec = song.sections[key];
        if (!sec) throw new Error(`${song.id}: no section ${key}`);
        const label = `${song.id}.${name}`;
        const cs = chordLine(sec.chords, bar, label), bars = cs.length / bar;
        const lead = sec.lead ? parseLine(sec.lead, bar, sec.unit ?? unit, `${label}.lead`) : [];
        const counter = sec.counter ? parseLine(sec.counter, bar, sec.unit ?? unit, `${label}.counter`) : [];
        const bass = sec.bass ? parseLine(sec.bass, bar, sec.unit ?? unit, `${label}.bass`) : null;
        if (lead.length && lead.length !== cs.length) throw new Error(`${label}: lead has ${lead.length / bar} bars, chords ${bars}`);
        if (counter.length && counter.length !== cs.length) throw new Error(`${label}: counter has ${counter.length / bar} bars, chords ${bars}`);
        if (bass && bass.length !== cs.length) throw new Error(`${label}: bass has ${bass.length / bar} bars, chords ${bars}`);
        const start = seq.kick.length;
        sections.push({ name, key, start, end: start + cs.length, bars });
        const groove = { ...style, ...(sec.groove ?? {}) };
        const only = sec.only ? new Set(sec.only) : null, on = (r) => (only ? only.has(r) : !(sec.mute ?? []).includes(r));
        const bassPat = groove.bass, compPat = groove.comp;
        let voiced = null, voicedFor = null, tremNote = 0, tremCount = 0;
        const octave = (name[1] === "2" && sec.lift ? sec.lift : 0);
        for (let i = 0; i < cs.length; i++) {
            const b = Math.floor(i / bar), at = i % bar, lastBar = b === bars - 1;
            const ch = cs[i], next = cs[Math.min(cs.length - 1, Math.floor(i / bar) * bar + bar)] ?? ch;
            chords.push(ch);
            const fill = lastBar && groove.fill;
            seq.kick.push(on("kick") && patternStep(fill?.kick ?? groove.kick, b, at) ? 1 : 0);
            seq.snare.push(on("snare") && patternStep(fill?.snare ?? groove.snare, b, at) ? 1 : 0);
            seq.hat.push(on("hat") && patternStep(fill?.hat ?? groove.hat, b, at) ? 1 : 0);
            seq.perc.push(on("perc") && patternStep(groove.perc, b, at) ? 1 : 0);
            // Bass
            let bn = 0;
            if (on("bass")) {
                if (bass) { const t = bass[i]; bn = rest(t) ? 0 : midi(t); }
                else if (bassPat) {
                    const row = parseLine(Array.isArray(bassPat) ? bassPat[b % bassPat.length] : bassPat, bar, groove.bassUnit ?? unit, `${label}.bassPattern`);
                    const t = row[at];
                    // A chord that lands mid-pattern gets its root, whatever the pattern says.
                    const changed = i > 0 && cs[i - 1] !== ch;
                    bn = rest(t) ? 0 : bassNote(changed && t !== "-" ? "R" : t, ch, next, song.bassLow ?? 36);
                }
            }
            seq.bass.push(bn);
            // Chords: voice-led, re-voiced when the chord changes.
            let hit = on("comp") && patternStep(compPat, b, at);
            if (ch !== voicedFor) { voiced = voice(ch, voiced ?? prev, song.compLow ?? 54, song.compHigh ?? 76); voicedFor = ch; prev = voiced; }
            seq.c0.push(hit ? voiced[0] : 0);
            seq.c1.push(hit ? voiced[1] : 0);
            seq.c2.push(hit ? voiced[2] : 0);
            // Melody: notes that hold a beat or more go to the long-decay voice, since a Pogo track has one decay.
            const t = lead[i];
            const m = on("lead") && t && !rest(t) ? midi(t) + octave : 0;
            let hold = 0;
            if (m) { hold = 1; while (i + hold < lead.length && lead[i + hold] === "-") hold++; }
            const isLong = hold >= (song.longAt ?? song.grid * 1.5);
            rawLead[start + i] = m;
            if (sec.trem) {
                // Surf guitar: held notes are picked over and over.
                if (m) tremNote = m; else if (t !== "-") tremNote = 0;
                tremCount = m ? 0 : tremCount + 1;
                seq.lead.push(tremNote && tremCount % (song.tremEvery ?? 1) === 0 ? tremNote : 0);
                seq.long.push(0);
            } else { seq.lead.push(m && !isLong ? m : 0); seq.long.push(m && isLong ? m : 0); }
            const c = counter[i];
            seq.counter.push(on("counter") && c && !rest(c) ? midi(c) : 0);
        }
    }
    // A bar of tail so the last notes ring out before the framework stops the clock.
    const tail = bar;
    const last = chords[chords.length - 1];
    for (let i = 0; i < tail; i++) { for (const k of Object.keys(seq)) seq[k].push(0); chords.push(last); rawLead.push(0); }

    const n = seq.kick.length;

    const pitched = (arr, flats = true) => arr.map((m) => (m ? noteName(m, flats) : "-")).join(" ");
    const hits = (arr, note) => arr.map((v) => (v ? note : "-")).join(" ");
    const decay = (p) => p.s ?? p.d * stepDur;
    const tk = (p, notes, role) => ({ wave: p.wave, notes, volume: p.vol * LOUD, decay: decay(p), attack: p.attack, slide: p.slide, role });
    const tracks = [
        tk(mix.kick, hits(seq.kick, mix.kick.note), "kick"),
        tk(mix.click, hits(seq.kick, mix.click.note), "kick"),
        tk(mix.snare, hits(seq.snare, mix.snare.note), "snare"),
        tk(mix.hat, hits(seq.hat, mix.hat.note), "hat"),
        tk(mix.perc, hits(seq.perc, mix.perc.note), "perc"),
        tk(mix.bass, pitched(seq.bass), "bass"),
        tk(mix.comp, pitched(seq.c0), "comp"), tk(mix.comp, pitched(seq.c1), "comp"), tk(mix.comp, pitched(seq.c2), "comp"),
        tk(mix.lead, pitched(seq.lead), "lead"), tk(mix.long, pitched(seq.long), "lead"),
        tk(mix.counter, pitched(seq.counter), "counter"),
    ].filter((t) => /[A-G]/.test(t.notes));

    // Every pulse, respecting odd meters: 7/8 is 3+2+2, so beats are not evenly spaced.
    const pulses = [];
    for (let i = 0; i < n; i += bar) for (const b of song.beats) if (i + b < n) pulses.push({ step: i + b, down: b === 0 });

    return {
        pogo: { bpm, steps: grid, loop: !!o.loop, tracks },
        n, stepDur, bar, grid, seq, sections, chords, rawLead, pulses, bpm,
        end: (n - tail) * stepDur,
        tail: tail * stepDur,
    };
}

/** A short looped piece for menus. */
export function menuSong(song) { return arrange(song, { loop: true }).pogo; }
