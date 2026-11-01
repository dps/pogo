// What survives between runs, plus missions. game.save and game.load already cope with blocked storage.
import { MAX_MULT, MISSIONS, OSTRICHES } from "./data.js";

const DEFAULTS = () => ({
    best: 0, bestD: 0, bank: 0, owned: ["keith"], skin: "keith", mult: 1, done: [], progress: {}, seen: [0], runs: 0,
    tutorial: false, getaways: 0, sound: true, music: true, haptics: true,
    daily: { day: 0, best: 0, streak: 0, claimed: false },
});
export function loadProfile(game) {
    let p = null;
    try { p = game.load("ostrich-getaway", null); } catch { p = null; }
    const out = { ...DEFAULTS(), ...(p ?? {}) };
    out.daily = { ...DEFAULTS().daily, ...(p?.daily ?? {}) };
    return out;
}
export const saveProfile = (game, p) => { if (!game.noSave) game.save("ostrich-getaway", p); };
export const activeMissions = (p) => MISSIONS.filter((m) => !p.done.includes(m.id)).slice(0, 3);
export const missionValue = (p, m, stats) => (m.run ? stats?.[m.stat] ?? 0 : (p.progress[m.id] ?? 0) + (stats?.[m.stat] ?? 0));
export const skinById = (id) => OSTRICHES.find((o) => o.id === id) ?? OSTRICHES[0];

/** Check missions against a run in progress. Returns those just finished. */
export function tickMissions(p, stats) {
    const out = [];
    for (const m of activeMissions(p)) if (missionValue(p, m, stats) >= m.goal) {
        p.done.push(m.id);
        p.bank += m.pay;
        p.mult = Math.min(MAX_MULT, p.mult + 1);
        out.push(m);
    }
    return out;
}
/** Bank a finished run's running totals. */
export function bankRun(p, run) {
    p.runs++;
    for (const m of activeMissions(p)) if (!m.run) p.progress[m.id] = (p.progress[m.id] ?? 0) + (run.stats[m.stat] ?? 0);
    p.bank += run.eggCount;
    p.getaways += run.getaways;
    const best = run.score > p.best;
    if (best) p.best = Math.floor(run.score);
    p.bestD = Math.max(p.bestD, Math.floor(run.stats.dist));
    if (run.getaways && !p.owned.includes("goldie")) p.owned.push("goldie");
    return best;
}
export const dayNumber = () => { const n = new Date(); return n.getUTCFullYear() * 10000 + (n.getUTCMonth() + 1) * 100 + n.getUTCDate(); };
