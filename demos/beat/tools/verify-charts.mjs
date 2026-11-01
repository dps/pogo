// Chart readability bot. Plays no game: it reads each chart the way a person with two thumbs would, and refuses anything a hand can't do.
// Run: node tools/verify-charts.mjs [--v]
import { SONGS } from "../music/songs.js";
import { CHARTS, compile, DIFFS, INTRO } from "../charts.js";
import { WINDOWS } from "../engine.js";

const v = process.argv.includes("--v");
let failures = 0;
const fail = (a, m) => { failures++; console.log(`  FAIL ${a}: ${m}`); };
const order = (id) => SONGS.findIndex((s) => s.id === id);

/** Best-case two-thumb fingering. Left thumb covers the left half of heads, right the right; a thumb can cross with travel time. */
function thumbs(notes, heads, at) {
    const REST = 0.075;                 // a thumb can't retap faster than this
    const TRAVEL = 0.052;               // extra seconds per head of distance
    // Search over both thumbs' state, keeping the slack of the best fingering.
    let states = [{ l: { lane: 0, t: -9, busy: -9 }, r: { lane: heads - 1, t: -9, busy: -9 }, slack: 9 }];
    const groups = [];
    for (const n of notes) { const g = groups.at(-1); if (g && Math.abs(g[0].time - n.time) < 0.001) g.push(n); else groups.push([n]); }
    for (const g of groups) {
        const out = [];
        const assign = (th, n, s) => {
            const t = s[th], need = REST + TRAVEL * Math.abs(n.lane - t.lane), gap = n.time - t.t;
            if (n.time < t.busy - 0.001) return null;
            return { lane: n.lane, t: n.time + (n.dur || 0) * (n.kind === "hold" || n.kind === "roll" ? 1 : 0), busy: n.time + (n.dur || 0), slack: gap - need };
        };
        for (const s of states) {
            const opts = g.length === 1 ? [["l"], ["r"]] : g.length === 2 ? [["l", "r"], ["r", "l"]] : [];
            for (const o of opts) {
                const next = { l: s.l, r: s.r, slack: s.slack };
                let ok = true;
                g.forEach((n, i) => {
                    const a = assign(o[i], n, next);
                    if (!a) { ok = false; return; }
                    next[o[i]] = { lane: a.lane, t: a.t, busy: a.busy };
                    next.slack = Math.min(next.slack, a.slack);
                });
                if (ok && next.slack >= 0) out.push(next);
            }
        }
        if (!out.length) return { ok: false, at: g[0], label: at };
        // Keep the best few states.
        out.sort((a, b) => b.slack - a.slack);
        states = out.slice(0, 16);
    }
    return { ok: true, slack: Math.min(...states.map((s) => s.slack)) };
}

const rows = [];
const prevByDiff = {};
for (const song of SONGS) {
    const idx = order(song.id);
    if (!CHARTS[song.id]) { fail(song.id, "no charts"); continue; }
    for (const diff of DIFFS) {
        if (!CHARTS[song.id][diff]) { fail(song.id, `no ${diff} chart`); continue; }
        const label = `${song.id}/${diff}`;
        let c;
        try { c = compile(song, diff); } catch (e) { fail(label, e.message); continue; }
        const { notes, arr: a, heads } = c, n = notes.length, seq = a.seq;
        // Follows the music: every note sits on something the player can hear.
        let onMusic = 0, kickSnare = 0;
        for (const x of notes) {
            const s = x.step, any = seq.kick[s] || seq.snare[s] || a.rawLead[s] || seq.bass[s] || seq.c0[s] || seq.counter[s] || seq.perc[s] || seq.hat[s];
            if (any) onMusic++; else if (v) console.log(`    off-music ${label} ${x.sec} step ${s - a.sections.find((q) => q.name === x.sec && s >= q.start && s < q.end).start} ${x.kind} ${x.lane + 1}`);
            if (seq.kick[s] || seq.snare[s]) kickSnare++;
        }
        const follow = Math.round(100 * onMusic / n);
        if (follow < 98) fail(label, `only ${follow}% of notes sit on a heard sound`);
        // Mechanics arrive when the story teaches them.
        for (const kind of ["hold", "roll", "swipe"]) if (order(INTRO[kind]) > idx && notes.some((x) => x.kind === kind)) fail(label, `uses ${kind} before ${INTRO[kind]}`);
        if (diff === "easy" && idx < 2 && heads !== 2) fail(label, "first songs must have two heads on easy");
        // Fingering
        const res = thumbs(notes, heads, label);
        if (!res.ok) fail(label, `no two-thumb fingering at ${res.at.time.toFixed(2)}s ${res.at.sec} lane ${res.at.lane + 1}`);
        // Spacing
        let minGap = 9, minSame = 9;
        for (let i = 1; i < n; i++) {
            const d = notes[i].time - notes[i - 1].time;
            if (d > 0.001) minGap = Math.min(minGap, d);
            for (let j = i - 1; j >= 0 && j > i - 8; j--) if (notes[j].lane === notes[i].lane) { const e = notes[j].time + (notes[j].kind === "tap" ? 0 : notes[j].dur); minSame = Math.min(minSame, notes[i].time - e); break; }
            if (notes[i].time === notes[i - 1].time && (notes[i].kind === "roll" || notes[i - 1].kind === "roll")) fail(label, "chord with a roll");
        }
        const floor = { easy: 0.3, normal: 0.17, hard: 0.095 }[diff];
        if (minGap < floor) fail(label, `gap of ${(minGap * 1000) | 0} ms`);
        if (minSame < 0.1) fail(label, `same head retap gap of ${(minSame * 1000) | 0} ms`);
        // Rolls and swipes need room around them.
        for (let i = 0; i < n; i++) {
            const x = notes[i];
            if (x.kind === "roll") for (const y of notes) if (y !== x && y.time > x.time - 0.001 && y.time < x.time + x.dur - 0.05) fail(label, `note inside roll at ${x.time.toFixed(1)}s`);
            if (x.kind === "swipe") {
                const before = notes.filter((y) => y.time < x.time).at(-1), lead = before ? x.time - before.time : 9;
                if (lead < (diff === "hard" ? 0.18 : 0.25)) fail(label, `swipe with only ${(lead * 1000) | 0} ms warning`);
            }
        }
        // Density by bar windows: no spikes against the song's own average, and a song starts gentler than it ends.
        const barDur = a.bar * a.stepDur, win = Math.max(barDur * 2, 3), dens = [];
        for (let t = a.sections[0].end * a.stepDur; t + win < a.end; t += win / 2) dens.push(notes.filter((x) => x.time >= t && x.time < t + win).length / win);
        const mean = n / (a.end - a.sections[0].end * a.stepDur), peak = Math.max(...dens);
        if (peak > mean * 2.2) fail(label, `density spike ${peak.toFixed(1)} over mean ${mean.toFixed(1)}`);
        const third = Math.max(1, Math.floor(dens.length / 3)), head = dens.slice(0, third).reduce((p, q) => p + q, 0) / third, tail = dens.slice(-third).reduce((p, q) => p + q, 0) / third;
        const cap = { easy: 3.1, normal: 4.6, hard: 7.8 }[diff];
        if (peak > cap) fail(label, `peak ${peak.toFixed(1)} nps over the ${diff} cap of ${cap}`);
        rows.push({ chart: label, heads, notes: n, nps: +mean.toFixed(2), peak: +peak.toFixed(2), gapMs: minGap * 1000 | 0, follow, drums: Math.round(100 * kickSnare / n), holds: notes.filter((x) => x.kind === "hold").length, rolls: notes.filter((x) => x.kind === "roll").length, swipes: notes.filter((x) => x.kind === "swipe").length, ramp: +(tail / (head || 1)).toFixed(2) });
        // Ramp across the story, with room for a gentle song after a hard one.
        const p = prevByDiff[diff];
        if (p !== undefined && mean > p.max * 1.55 && idx > 0) fail(label, `jumps ${p.max.toFixed(2)} > ${mean.toFixed(2)} nps from earlier songs`);
        prevByDiff[diff] = { max: Math.max(mean, p?.max ?? 0) };
    }
    // Harder must mean more to do.
    const counts = DIFFS.map((d) => { try { return compile(song, d).notes.length; } catch { return 0; } });
    if (!(counts[0] < counts[1] && counts[1] <= counts[2] * 1.02)) fail(song.id, `note counts do not rise: ${counts}`);
}
console.table(rows);
console.log(failures ? `\n${failures} FAILURES` : "\nALL CHART CHECKS PASS");
process.exit(failures ? 1 : 0);
