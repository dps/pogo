// Save data, score words, cups and the rival field.
import { HOLES } from "./holes.js";
import { SKINS } from "./models.js";

export const MAX_OVER = 5;          // Pick up at par + this.
export const CUPS = [
    { id: "classic", name: "Coconut Classic", island: 0, holes: [0, 1, 2, 3, 4, 5, 6, 7, 8], skill: 0.2, blurb: "Nine holes in the sun" },
    { id: "invite", name: "Frostbite Invitational", island: 1, holes: [9, 10, 11, 12, 13, 14, 15, 16, 17], skill: 0.45, blurb: "Nine holes on thin ice" },
    { id: "masters", name: "Molten Masters", island: 2, holes: [18, 19, 20, 21, 22, 23, 24, 25, 26], skill: 0.7, blurb: "Nine holes in the crater" },
    { id: "slam", name: "Grumble's Grand Slam", island: 2, holes: Array.from({ length: 27 }, (_, i) => i), skill: 0.82, blurb: "All 27. One champion" },
];
export const RIVALS = [
    { name: "Captain Coconut", col: "#ffb347", form: 0 }, { name: "Lulu Lagoon", col: "#3fd7cf", form: 0.1 }, { name: "Dr. Gecko", col: "#7ddc5a", form: 0.22 },
    { name: "Sir Pinch", col: "#ff6a57", form: -0.1 }, { name: "Frosty Pete", col: "#a6e8ff", form: 0.08 }, { name: "Madame Magma", col: "#ff4fd0", form: 0.3 },
];
export const PLAYER_COLS = ["#ffc53d", "#3fd7ff", "#ff6fb1", "#7ddc5a"];

const fresh = () => ({
    v: 1, best: {}, shellsFound: {}, aces: 0, birdies: 0, icePars: 0, done: 0, islandDone: [false, false, false], cups: 0, cupBest: {}, skin: "pearl",
    settings: { sound: true, music: true, haptics: true, trail: true }, seen: {}, owned: ["pearl"], plays: 0,
});

export function loadSave(game) {
    if (game.data.save) return game.data.save;
    let s = null;
    try { s = game.load("crazyputt", null); } catch { s = null; }
    if (!s || s.v !== 1) s = fresh();
    const f = fresh();
    for (const k of Object.keys(f)) if (s[k] === undefined) s[k] = f[k];
    s.settings = { ...f.settings, ...s.settings };
    game.data.save = s;
    return s;
}
export function store(game) { try { game.save("crazyputt", game.data.save); } catch { /* storage may be blocked */ } }

export const shellCount = (s) => Object.keys(s.shellsFound).length;
export const stats = (s) => ({ ...s, shells: shellCount(s) });
export function ownedSkins(s) { const st = stats(s); return SKINS.filter((k) => k.test(st)); }

/** Mark new skins; returns the ones just earned. */
export function checkSkins(game) {
    const s = game.data.save, got = [];
    for (const k of ownedSkins(s)) if (!s.owned.includes(k.id)) { s.owned.push(k.id); got.push(k); }
    return got;
}
export const islandOpen = (s, i) => i === 0 || islandHoles(i - 1).some((h) => s.best[h] !== undefined) && islandHoles(i - 1).filter((h) => s.best[h] !== undefined).length >= 6;
export const islandHoles = (i) => HOLES.map((_, n) => n).filter((n) => HOLES[n].island === i);
export const holeOpen = (s, n) => {
    const i = HOLES[n].island;
    if (!islandOpen(s, i)) return false;
    const list = islandHoles(i), k = list.indexOf(n);
    return k === 0 || s.best[list[k - 1]] !== undefined || s.best[n] !== undefined;
};
export function nextHole(s) { for (let n = 0; n < HOLES.length; n++) if (s.best[n] === undefined && holeOpen(s, n)) return n; return 0; }

export function word(strokes, par) {
    if (strokes === 1) return "HOLE IN ONE!";
    const d = strokes - par;
    if (d <= -3) return "ALBATROSS!"; if (d === -2) return "EAGLE!"; if (d === -1) return "BIRDIE!"; if (d === 0) return "PAR"; if (d === 1) return "BOGEY"; if (d === 2) return "DOUBLE BOGEY";
    return `+${d}`;
}
export const toPar = (n) => (n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`);

/** What a rival shoots on a hole: par, with a lean set by the cup's skill and their form. Seeded by caller's rng. */
export function rivalScore(r, skill, form, par) {
    const p = 0.34 - skill * 0.1 - form * 0.15, under = 0.12 + skill * 0.32 + form * 0.2, v = r();
    let s = par;
    if (v < under) s = par - 1; else if (v > 1 - p) s = par + 1;
    if (r() < 0.05 + skill * 0.05) s -= 1;
    if (r() < 0.05) s += 1;
    return Math.max(1, s);
}
