// What survives between battles: the campaign, the roster, and the current roguelike run.
import { MISSIONS, MISSION, LINKS } from "./missions.js";
import { PIGEONS } from "./data.js";

const KEY = "squadgoals.v1";
const fresh = () => ({
    cleared: {}, seeds: 0, perma: false, chosen: false, roster: { sarge: { up: {} }, doris: { up: {} } }, last: ["sarge", "doris", "gale", "kevin"], taught: {},
    settings: { sound: true, music: true, haptics: true, fast: false },
    best: 0, run: null, runs: 0, won: false,
});

export function loadMeta(game) {
    const d = fresh();
    let got = null;
    try { got = game.load(KEY, null); } catch { got = null; }
    const m = { ...d, ...(got ?? {}) };
    m.settings = { ...d.settings, ...(m.settings ?? {}) };
    return m;
}
export const saveMeta = (game, m) => { try { game.save(KEY, m); } catch { /* storage blocked: progress lasts the session */ } };

/** The nodes that can be played now. */
export function openNodes(meta) {
    const open = new Set(["l1"]);
    for (const id of Object.keys(meta.cleared)) for (const n of LINKS[id] ?? []) open.add(n);
    return open;
}
export const totalStars = (meta) => Object.values(meta.cleared).reduce((a, b) => a + b, 0);
export const available = (meta) => Object.keys(meta.roster).filter((k) => !meta.roster[k].dead);

/** Dead is dead, but the park always has another Kevin. */
export function ensureSquad(meta, need) {
    const pool = ["kevin", "gale", "doris", "sarge"];
    for (const k of pool) { if (available(meta).length >= need) break; if (!meta.roster[k] || meta.roster[k].dead) meta.roster[k] = { up: {} }; }
}

export function buildSquad(meta, keys) { return keys.map((k) => ({ k, up: { ...(meta.roster[k]?.up ?? {}) } })); }

export function defaultSquad(meta, m) {
    const pick = [];
    for (const k of [...(meta.last ?? []), ...Object.keys(meta.roster)]) if (meta.roster[k] && !meta.roster[k].dead && !pick.includes(k) && pick.length < m.squad) pick.push(k);
    return pick;
}

export function buyUpgrade(meta, k, upId) {
    const u = PIGEONS[k].ups.find((q) => q.id === upId), r = meta.roster[k];
    if (!u || !r || r.up[upId] || meta.seeds < u.cost) return false;
    meta.seeds -= u.cost; r.up[upId] = true;
    return true;
}

/** Bank a win. Returns new stars and any recruit. */
export function recordWin(meta, m, stars, deadKeys) {
    const got = stars.filter(Boolean).length, had = meta.cleared[m.id] ?? 0, gain = Math.max(0, got - had);
    meta.cleared[m.id] = Math.max(had, got);
    const seeds = gain * 2 + (had === 0 ? 1 : 0);
    meta.seeds += seeds;
    let recruit = null;
    if (m.recruit && !meta.roster[m.recruit]) { meta.roster[m.recruit] = { up: {} }; recruit = m.recruit; }
    if (meta.perma) for (const k of deadKeys) if (meta.roster[k]) meta.roster[k].dead = true;
    if (m.final) meta.won = true;
    return { gain, seeds, recruit };
}

export { MISSIONS, MISSION };
