// Analytic proof that the songs are music, since nobody can listen as we work. Run: node tools/verify-songs.mjs [--v]
// Checks: notes in key, chords that resolve, ranges, equal track lengths, peak level, melodic shape, and bass following the harmony.
// Renders every song to samples with the same envelopes the engine uses and measures true peak and RMS.
import { SONGS, MENU } from "../music/songs.js";
import { arrange } from "../music/arrange.js";
import { chord, midi, pc, scalePcs, noteName } from "../music/theory.js";
import { KITS, SND, feverTone } from "../sfx.js";

const verbose = process.argv.includes("--v");
let failures = 0;
const fail = (s, m) => { failures++; console.log(`  FAIL ${s}: ${m}`); };
const warn = (s, m) => { if (verbose) console.log(`  note ${s}: ${m}`); };
const pct = (a, b) => (b ? Math.round(100 * a / b) : 100);

const RANGE = { lead: [midi("E4") - 3, midi("G6")], counter: [midi("F3"), midi("A5")], bass: [midi("E1"), midi("D4")], comp: [midi("F#3"), midi("C6")] };

function freq(n) { const m = /^([A-G][#b]?\d)$/.exec(n); return 440 * 2 ** ((midi(m[1]) - 69) / 12); }

/** Offline render matching Audio.tone: linear attack, exponential decay, music gain 0.5. */
function render(a, sr = 11025) {
    const len = Math.ceil((a.n * a.stepDur + 1) * sr), out = new Float32Array(len);
    let seed = 1234;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };
    for (const t of a.pogo.tracks) {
        const notes = t.notes.trim().split(/\s+/);
        notes.forEach((n, i) => {
            if (n === "-") return;
            const f0 = freq(n), start = i * a.stepDur, atk = t.attack ?? 0.005, dec = t.decay, vol = t.volume ?? 0.2, s0 = Math.floor(start * sr), total = Math.floor((atk + dec) * sr);
            const f1 = t.slide ? f0 * t.slide : f0;
            let phase = 0, lp = 0;
            for (let k = 0; k < total && s0 + k < len; k++) {
                const time = k / sr, u = time / (atk + dec);
                const env = time < atk ? vol * time / atk : vol * (0.0001 / vol) ** ((time - atk) / dec);
                const f = f0 * (f1 / f0) ** u;
                let v;
                if (t.wave === "noise") {
                    const c = 1 - Math.exp(-2 * Math.PI * Math.min(f, sr / 2.2) / sr); lp += c * (rnd() - lp); v = lp;
                } else {
                    phase = (phase + f / sr) % 1;
                    v = t.wave === "sine" ? Math.sin(2 * Math.PI * phase) : t.wave === "square" ? (phase < 0.5 ? 1 : -1) : t.wave === "sawtooth" ? 2 * phase - 1 : 1 - 4 * Math.abs(phase - 0.5);
                }
                out[s0 + k] += v * env * 0.5;
            }
        });
    }
    return out;
}

const summary = [];
function verify(song, isMenu) {
    console.log(`${song.title} [${song.genre ?? "menu"}] ${song.sig ?? ""} ${song.bpm}bpm`);
    let a;
    try { a = arrange(song); } catch (e) { fail(song.id, e.message); return; }

    // Equal length tracks
    const lens = new Set(a.pogo.tracks.map((t) => t.notes.trim().split(/\s+/).length));
    if (lens.size !== 1) fail(song.id, `tracks differ in length: ${[...lens]}`);
    if (a.n % a.bar) fail(song.id, "song is not a whole number of bars");

    // Key: per-section scale, with chord tones of the current chord allowed as borrowed or secondary notes.
    let total = 0, inKey = 0, chordTone = 0, strong = 0, strongTone = 0, outside = new Map(), bigLeap = 0, intervals = 0, steps = 0, recover = 0, leapCount = 0;
    const secs = a.sections;
    for (const sec of secs) {
        const def = song.sections[sec.key];
        const key = def.key ?? song.key, mode = def.mode ?? song.mode;
        let scale = mode === "harmonic2" ? [...new Set([...scalePcs(key, "major"), ...scalePcs("A", "harmonic")])] : scalePcs(key, mode);
        let prev = 0, prevInt = 0;
        for (let i = sec.start; i < sec.end; i++) {
            const m = a.rawLead[i];
            if (!m) continue;
            total++;
            const ch = a.chords[i], p = m % 12, isChord = ch.pcs.includes(p), isScale = scale.includes(p);
            if (isScale) inKey++;
            if (isChord) chordTone++;
            if (!isScale && !isChord) outside.set(`${noteName(m)}@${sec.name}/${ch.sym}`, 1);
            const at = (i - sec.start) % song.bar;
            if (song.beats.includes(at)) { strong++; if (isChord) strongTone++; }
            if (prev) {
                const iv = m - prev, abs = Math.abs(iv);
                intervals++;
                if (abs <= 2) steps++;
                if (abs > 12) bigLeap++;
                if (Math.abs(prevInt) >= 7 && abs && Math.sign(iv) !== Math.sign(prevInt)) recover++;
                if (Math.abs(prevInt) >= 7 && abs) leapCount++;
                prevInt = iv;
            }
            prev = m;
        }
    }
    const keyPct = pct(inKey, total), tonePct = pct(strongTone, strong), okNotes = pct(total - outside.size, total);
    if (!isMenu) {
        if (keyPct < 88) fail(song.id, `only ${keyPct}% of melody notes are in key`);
        if (tonePct < 62) fail(song.id, `only ${tonePct}% of strong-beat notes are chord tones`);
        if (bigLeap > 0) fail(song.id, `${bigLeap} melodic leaps over an octave`);
        if (outside.size > Math.max(2, total * 0.03)) fail(song.id, `notes outside key and chord: ${[...outside.keys()].slice(0, 8).join(", ")}`);
        else if (outside.size) warn(song.id, `passing notes outside key and chord: ${[...outside.keys()].join(", ")}`);
    }

    // Harmony. The song must end on the tonic, reached by a real cadence, and dominants must mostly resolve.
    const prog = [];
    a.chords.forEach((c, i) => { if (!prog.length || prog[prog.length - 1].sym !== c.sym || i === 0) prog.push(c); });
    const tonicKey = song.sections[a.sections.at(-1).key].key ?? song.key;
    const tonic = pc(tonicKey), final = prog.at(-1), before = prog.at(-2);
    if (final && final.root !== tonic) fail(song.id, `ends on ${final.sym}, not ${tonicKey}`);
    if (before) {
        const fall = (before.root - tonic + 12) % 12;
        const cadence = fall === 7 ? "perfect" : fall === 5 ? "plagal" : fall === 1 ? "phrygian" : fall === 10 ? "aeolian" : fall === 11 ? "leading" : null;
        if (!cadence) fail(song.id, `final move ${before.sym} > ${final.sym} is no cadence`);
    }
    let doms = 0, resolved = 0;
    for (let i = 0; i + 1 < prog.length; i++) {
        const c = prog[i];
        if (!c.intervals.includes(10) || !c.intervals.includes(4)) continue;
        doms++;
        const d = (prog[i + 1].root - c.root + 12) % 12;
        const mode = song.mode;
        if (d === 5 || d === 11 || d === 0 || d === 2 || d === 10 || ((mode === "blues" || mode === "dorian") && d === 7)) resolved++;  // V-I, tritone sub, deceptive; blues and dorian vamps also fall IV7-I
    }
    if (doms && pct(resolved, doms) < 70) fail(song.id, `only ${pct(resolved, doms)}% of dominant chords resolve`);
    for (const sec of a.sections) {
        // Sections end on a chord that either closes or leans on what comes next.
        const c = a.chords[sec.end - 1], def = song.sections[sec.key], k = pc(def.key ?? song.key), deg = (c.root - k + 12) % 12;
        if (![0, 7, 9, 5, 4, 2, 1, 11, 10].includes(deg)) warn(song.id, `${sec.name} ends on unusual ${c.sym}`);
    }

    // Ranges
    for (const t of a.pogo.tracks) {
        const r = RANGE[t.role];
        if (!r) continue;
        for (const n of t.notes.trim().split(/\s+/)) if (n !== "-") { const m = midi(n); if (m < r[0] || m > r[1]) { fail(song.id, `${t.role} note ${n} is out of range`); break; } }
    }

    // Bass follows harmony: the note on each chord change is the chord's bass or root.
    let changes = 0, rooted = 0;
    for (let i = 0; i < a.n; i++) {
        const b = a.seq.bass[i];
        if (!b) continue;
        const c = a.chords[i], newChord = i === 0 || a.chords[i - 1] !== c;
        if (newChord) { changes++; if (b % 12 === c.bass || b % 12 === c.root) rooted++; }
    }
    if (changes && pct(rooted, changes) < 85) fail(song.id, `bass plays the root on only ${pct(rooted, changes)}% of changes`);

    // Voices stay out of each other's way.
    let crossing = 0, both = 0;
    for (let i = 0; i < a.n; i++) {
        const b = a.seq.bass[i], c = a.seq.c0[i], l = a.rawLead[i];
        if (b && c) { both++; if (b >= c) crossing++; }
        if (l && a.seq.c2[i] && l + 12 < a.seq.c2[i]) crossing++;
    }
    if (crossing > a.n * 0.05) fail(song.id, `voices cross ${crossing} times`);

    // Variety: a tune must not be one bar over and over.
    const bars = new Set(); let barCount = 0;
    if (!isMenu) for (let b = 0; b + song.bar <= a.rawLead.length; b += song.bar) { const s = a.rawLead.slice(b, b + song.bar).join(","); if (/[1-9]/.test(s)) { bars.add(s); barCount++; } }
    if (!isMenu && bars.size < 8) fail(song.id, `only ${bars.size} distinct melody bars`);

    // Level: worst case if every track peaks together, then a real render.
    const stack = a.pogo.tracks.reduce((s, t) => s + (t.volume ?? 0.2), 0) * 0.5;
    // Worst case: every note ringing at this moment reaches its peak phase at once. Random phases can't exceed this.
    let bound = 0;
    {
        const env = new Float32Array(a.n * 8 + 8), slice = a.stepDur / 8;
        for (const t of a.pogo.tracks) {
            const vol = t.volume ?? 0.2, dec = t.decay;
            t.notes.trim().split(/\s+/).forEach((n, i) => {
                if (n === "-") return;
                for (let k = 0; i * 8 + k < env.length; k++) {
                    const tt = k * slice;
                    if (tt > dec) break;
                    env[i * 8 + k] += vol * (0.0001 / vol) ** (tt / dec);
                }
            });
        }
        for (const v of env) bound = Math.max(bound, v * 0.5);
    }
    const out = render(a);
    let peak = 0, sum = 0;
    for (const v of out) { const x = Math.abs(v); if (x > peak) peak = x; sum += v * v; }
    const rms = Math.sqrt(sum / out.length);
    const level = (t) => (Array.isArray(t) ? t : [t]).reduce((a, x) => a + (x.volume ?? 0.3), 0);
    const HIT = Math.max(...KITS.flatMap((k) => k.voices.map(level))), FEVER = level(feverTone(440, "brass")) + level(SND.clap);
    if (peak + HIT + FEVER > 1) fail(song.id, `peak ${peak.toFixed(2)} + hit ${HIT.toFixed(2)} + fever ${FEVER.toFixed(2)} clips`);
    if (bound + HIT + FEVER > 1) fail(song.id, `worst-phase stack ${bound.toFixed(2)} + hit + fever clips`);
    summary.push({ id: song.id, bars: a.n / song.bar | 0, secs: Math.round(a.end), notes: total, key: keyPct, tones: tonePct, steps: pct(steps, intervals), doms: pct(resolved, doms), peak: +peak.toFixed(2), rms: +rms.toFixed(3), bound: +bound.toFixed(2), bars_uniq: bars.size });
}

for (const s of SONGS) verify(s, false);
for (const s of Object.values(MENU)) { if (s.id === "click") continue; verify(s, true); }
console.table(summary);

// Different tunes: no two songs share a run of four melody bars.
const fingerprints = new Map();
for (const s of SONGS) {
    const a = arrange(s), iv = [];
    for (let b = 0; b + s.bar * 4 <= a.rawLead.length; b += s.bar) {
        const notes = a.rawLead.slice(b, b + s.bar * 4).filter(Boolean);
        if (notes.length < 8) continue;
        const key = notes.map((n, i) => (i ? n - notes[i - 1] : 0)).join(",");
        if (fingerprints.has(key) && fingerprints.get(key) !== s.id) fail(s.id, `shares four bars with ${fingerprints.get(key)}`);
        fingerprints.set(key, s.id);
    }
}
const sigs = new Set(SONGS.map((s) => s.sig));
if (SONGS.length < 12) fail("all", "fewer than 12 songs");
const tempos = SONGS.map((s) => s.bpm);
console.log(`\n${SONGS.length} songs, meters ${[...sigs].join(" ")}, tempo ${Math.min(...tempos)} to ${Math.max(...tempos)}, loudest RMS spread ${(Math.max(...summary.map((s) => s.rms)) / Math.min(...summary.filter((s) => s.bars_uniq).map((s) => s.rms))).toFixed(2)}x`);
console.log(failures ? `\n${failures} FAILURES` : "\nALL SONG CHECKS PASS");
process.exit(failures ? 1 : 0);
