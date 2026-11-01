// Music theory helpers: note names, chords, scales and voice leading. Pure data, so tools can import it in Node.
const NAT = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** "Bb4" -> 70. */
export function midi(n) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(n);
    if (!m) throw new Error(`Bad note "${n}"`);
    return NAT[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
}
/** 70 -> "Bb4" */
export const noteName = (m, flats = true) => `${(flats ? FLAT : SHARP)[m % 12]}${Math.floor(m / 12) - 1}`;
export const pc = (name) => {
    const m = /^([A-G])([#b]?)/.exec(name);
    return (NAT[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12;
};

export const QUALITY = {
    "": [0, 4, 7], m: [0, 3, 7], 5: [0, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
    dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8], sus4: [0, 5, 7], "7sus4": [0, 5, 7, 10], 9: [0, 4, 7, 10, 2], m9: [0, 3, 7, 10, 2],
    m7b5: [0, 3, 6, 10], "7b9": [0, 4, 7, 10, 1], maj9: [0, 4, 7, 11, 2],
};

/** "Bbmaj7/D" -> { root, quality, pcs, bass } */
export function chord(sym) {
    const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(sym);
    if (!m || !(m[2] in QUALITY)) throw new Error(`Bad chord "${sym}"`);
    const root = pc(m[1]), iv = QUALITY[m[2]];
    return { sym, root, quality: m[2], pcs: iv.map((i) => (root + i) % 12), bass: m[3] ? pc(m[3]) : root, intervals: iv };
}

export const SCALE = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], melodic: [0, 2, 3, 5, 7, 8, 9, 10, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10], freygish: [0, 1, 4, 5, 7, 8, 10], blues: [0, 3, 4, 5, 6, 7, 9, 10],
};
export const scalePcs = (key, mode) => SCALE[mode].map((i) => (pc(key) + i) % 12);

/** Three notes close to the previous voicing, within [low, high]. Keeps the root, third and seventh of rich chords. */
export function voice(ch, prev, low = 52, high = 74) {
    const iv = ch.intervals;
    const want = iv.length <= 3 ? iv.map((i) => (ch.root + i) % 12)
        : [iv[1], iv[3], iv[4] ?? iv[2]].map((i) => (ch.root + i) % 12);  // third, seventh, colour or fifth: the bass has the root
    while (want.length < 3) want.push(want[0]);
    const options = [];
    for (let a = low; a <= high; a++) if (a % 12 === want[0])
        for (let b = low; b <= high; b++) if (b % 12 === want[1])
            for (let c = low; c <= high; c++) if (c % 12 === want[2]) {
                const v = [a, b, c].sort((x, y) => x - y);
                const spread = v[2] - v[0];
                if (spread > 14 || (v[1] - v[0] < 3 && v[1] !== v[0]) || (v[2] - v[1] < 3 && v[2] !== v[1])) continue;
                options.push(v);
            }
    if (!options.length) return [low + want[0] % 12, low + 12 + want[1] % 12, low + 12 + want[2] % 12].map((n) => Math.min(n, high + 6));
    const centre = (low + high) / 2;
    let best = options[0], score = Infinity;
    for (const v of options) {
        const s = prev ? Math.abs(v[0] - prev[0]) + Math.abs(v[1] - prev[1]) + Math.abs(v[2] - prev[2]) : Math.abs(v[1] - centre);
        if (s < score) { score = s; best = v; }
    }
    return best;
}
