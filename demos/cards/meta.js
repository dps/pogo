// What survives between runs: Stars, unlocks, ascension ranks, the Almanac of reactions and the best brew.
import { CARDS } from "./data/cards.js";
export const UNLOCKS = [
    { stars: 0, text: "The basics." },
    { stars: 8, text: "New ingredients: Sapling. New trinket: Heat Stone.", trinkets: ["heatstone"] },
    { stars: 20, text: "New ingredients: Emberheart, Frozen Moment. New trinket: Tasting Notes.", trinkets: ["tastingnotes"] },
    { stars: 36, text: "New ingredients: Perpetual Drip, Snowball. New trinket: Bottled Familiar.", trinkets: ["revive"] },
    { stars: 56, text: "New ingredients: Foxglove Waltz, Widdershins. New trinket: Ouroboros Ladle.", trinkets: ["mobiusladle"] },
    { stars: 80, text: "New ingredient: Klein Bottle. New trinkets: Spare Wick, Bottomless Stewpot, Möbius Band.", trinkets: ["sparewick", "stewpot", "mobius"] },
];
export const LOCKABLE_TRINKETS = UNLOCKS.flatMap((u) => u.trinkets ?? []);
export const freshMeta = () => ({ v: 1, stars: 0, runs: 0, wins: 0, asc: { posy: 0, thistle: 0, vesper: 0 }, ascMax: 0, reactions: {}, best: { dmg: 0, fires: 0, pot: 1, recipe: [], name: "" }, tutorial: false, seen: {}, sound: true, haptics: true, music: true });
export const tierOf = (m) => { let t = 0; UNLOCKS.forEach((u, i) => { if (m.stars >= u.stars) t = i; }); return t; };
export const lockedTrinkets = (m) => { const t = tierOf(m); return UNLOCKS.slice(t + 1).flatMap((u) => u.trinkets ?? []); };
export const nextUnlock = (m) => UNLOCKS.find((u) => u.stars > m.stars) ?? null;
/** Stars earned for a finished run, itemised for the end screen. */
export function starsFor(run) {
    const s = run.stats, parts = [];
    parts.push(["Floors climbed", Math.floor(s.floors / 4)]);
    if (s.elites) parts.push(["Elites slain", s.elites]);
    if (s.bosses) parts.push(["Bosses slain", s.bosses * 3]);
    if (run.won) parts.push(["Reached the Crown", 6]);
    if (run.asc) parts.push([`Rank ${run.asc} bonus`, run.asc]);
    return parts;
}
export function bankRun(meta, run) {
    const parts = starsFor(run), gained = parts.reduce((n, p) => n + p[1], 0), before = tierOf(meta);
    meta.stars += gained; meta.runs++;
    for (const k in run.stats.rx) meta.reactions[k] = (meta.reactions[k] ?? 0) + run.stats.rx[k];
    if (run.won) { meta.wins++; meta.asc[run.witch] = Math.max(meta.asc[run.witch] ?? 0, Math.min(10, run.asc + 1)); }
    const unlocked = UNLOCKS.slice(before + 1, tierOf(meta) + 1);
    return { parts, gained, unlocked };
}
const ADJ = ["Thrice-Boiled", "Unlicensed", "Grandmother's", "Forbidden", "Accidental", "Regrettable", "Beryl's Second", "Extra-Strength", "Medicinal", "Sunday", "Ill-Advised", "Reheated", "Ceremonial", "Slightly Illegal", "Weeping", "Vintage", "Bottomless"];
const NOUN = { ember: ["Hot Pot", "Dragon's Regret", "Vindaloo"], brine: ["Chowder", "Tidal Soup", "Bisque"], moss: ["Pottage", "Forest Tea", "Mulch"], rime: ["Slushie", "Cold Soup", "Gazpacho"], hex: ["Curse Stew", "Omen Broth", "Black Cordial"], gilt: ["Consommé", "Gold Reduction", "Investment"], gunk: ["Surprise"] };
/** A silly, stable name for a recipe, so a big combo can be remembered and bragged about. */
export function recipeName(recipe) {
    let h = 7;
    for (const id of recipe) for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    const count = {};
    for (const id of recipe) { const el = CARDS[id]?.el ?? "gunk"; count[el] = (count[el] ?? 0) + 1; }
    const top = Object.keys(count).sort((a, b) => count[b] - count[a])[0] ?? "gunk";
    const n = NOUN[top];
    return `${ADJ[h % ADJ.length]} ${n[(h >> 5) % n.length]}`;
}
