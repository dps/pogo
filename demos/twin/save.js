// Progress: settings, today's leaderboard, lifetime numbers. All local; game.save survives blocked storage quietly.
const KEY = "twin-save";
const FRESH = () => ({ muted: false, haptics: true, autofire: true, best: 0, runs: 0, wins: 0, kills: 0, damage: 0, streak: 0, lastDay: null, deep: false, taught: {}, boards: {} });

export function todayKey(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}
export const dailySeed = (key) => hashStr(`robovac:${key}`) || 1;
export const dayNumber = (key) => Math.floor(Date.parse(`${key}T12:00:00Z`) / 86400000) - 20000;

// The household's other appliances post scores too. They exist only in this game.
const RIVALS = ["Grandma's Upright", "Mop From Next Door", "The Toaster", "Hand Vac Harold"];
export function rivals(key) {
    let s = dailySeed(key);
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    return RIVALS.map((name, i) => ({ name, score: Math.round((26000 - i * 6000 + rnd() * 5000) / 10) * 10, rival: true }));
}

export function loadSave(game) {
    if (game.twinSave) return game.twinSave;
    let s = null;
    try { s = game.load(KEY, null); } catch { s = null; }
    s = { ...FRESH(), ...(s ?? {}) };
    game.twinSave = s;
    return s;
}
export function persist(game) { game.save(KEY, game.twinSave); }

/** Today's table, the player's runs mixed with the rivals', best first. */
export function board(game, key) {
    const s = loadSave(game);
    return [...(s.boards[key] ?? []).map((r) => ({ name: "YOU", ...r })), ...rivals(key)].sort((a, b) => b.score - a.score);
}

export function recordRun(game, res, mode, key) {
    const s = loadSave(game);
    s.runs++; s.kills += res.kills; s.damage += res.damage;
    const newBest = res.score > s.best;
    if (newBest) s.best = res.score;
    if (res.won) { s.wins++; s.deep = true; }
    let rank = 0;
    if (mode === "daily") {
        const list = (s.boards[key] ??= []);
        const row = { score: res.score, won: res.won, at: Date.now() };
        list.push(row);
        list.sort((a, b) => b.score - a.score);
        list.length = Math.min(list.length, 5);
        for (const k of Object.keys(s.boards)) if (k !== key) delete s.boards[k];
        rank = board(game, key).findIndex((r) => r.at === row.at) + 1;
        if (s.lastDay !== key) {
            const prev = todayKey(new Date(Date.parse(`${key}T12:00:00`) - 86400000));
            s.streak = s.lastDay === prev ? s.streak + 1 : 1;
            s.lastDay = key;
        }
    }
    persist(game);
    return { newBest, rank };
}
