// The save file, and everything that changes it. Pure, so the economy bot and the game share one set of rules.
import { DECOR, KIT, LOCATIONS, RECIPES, REGULARS, SHIFTS, STAFF } from "./data.js";

export const newSave = () => ({
    v: 1, day: 0, stars: [], cash: 0, earned: 0, kit: {}, staff: {}, recipes: {}, locs: { cart: true },
    decor: { noren: { red: true }, lantern: { amber: true }, glaze: { cloud: true }, charm: { none: true } },
    equip: { noren: "red", lantern: "amber", glaze: "cloud", charm: "none" },
    regs: {}, book: {}, fails: {}, endless: { best: 0, bowls: 0 },
    muted: false, haptics: true, hand: "right", seen: {}, finished: false,
});

export const loadSave = (raw) => {
    const d = newSave(), s = { ...d, ...(raw ?? {}) };
    for (const k of ["kit", "staff", "recipes", "locs", "decor", "equip", "regs", "book", "fails", "endless", "seen"]) s[k] = { ...d[k], ...(raw?.[k] ?? {}) };
    return s;
};

export const owned = (s) => ({ kit: s.kit, staff: s.staff, recipes: s.recipes });
export const starTotal = (s) => s.stars.reduce((a, b) => a + (b ?? 0), 0);
export const shiftIndex = (s) => Math.min(s.day, SHIFTS.length - 1);
export const locOf = (i) => LOCATIONS[SHIFTS[i].loc];
export const unlocked = (s, i) => i <= s.day && !!s.locs[locOf(i).id];
/** The stall you must buy before this shift can open, if any. */
export const needsMove = (s, i = shiftIndex(s)) => (s.locs[locOf(i).id] ? null : locOf(i));
export const endlessOpen = (s) => s.day >= 8;

export const kitCost = (s, id) => { const k = KIT[id], n = s.kit[id] ?? 0; return n >= k.max ? null : k.levels[n]; };
export function buyKit(s, id) { const c = kitCost(s, id); if (c === null || s.cash < c) return false; s.cash -= c; s.kit[id] = (s.kit[id] ?? 0) + 1; return true; }
export const staffOpen = (s, id) => s.day >= STAFF[id].unlock;
export function buyStaff(s, id) { const t = STAFF[id]; if (s.staff[id] || !staffOpen(s, id) || s.cash < t.cost) return false; s.cash -= t.cost; s.staff[id] = true; return true; }
export const recipeOpen = (s, id) => { const r = RECIPES[id]; return !!r.cost && s.locs[{ spring: "cart", summer: "station", autumn: "seaside", winter: "hall" }[r.season]] === true; };
export function buyRecipe(s, id) { const r = RECIPES[id]; if (s.recipes[id] || !recipeOpen(s, id) || s.cash < r.cost) return false; s.cash -= r.cost; s.recipes[id] = true; return true; }
export function buyMove(s) { const L = needsMove(s); if (!L || s.cash < L.cost) return false; s.cash -= L.cost; s.locs[L.id] = true; return true; }
export function buyDecor(s, slot, id) { const it = DECOR[slot].items.find((x) => x.id === id); if (!it || s.decor[slot][id] || s.cash < it.cost) return false; s.cash -= it.cost; s.decor[slot][id] = true; s.equip[slot] = id; return true; }

/** After a shift. Money always banks, so failing never takes anything away. Returns what's new. */
export function finishShift(s, i, k) {
    const stars = k.stars(), news = { stars, cash: k.cash, gifts: [], stamped: [], best: false, first: false, advanced: false };
    s.cash += k.cash; s.earned += k.cash;
    for (const b of k.resultBowls) {
        const id = b.recipe ?? b.c.recipe, who = b.c.who;
        if (b.rating) { const e = s.book[id] ?? { served: 0, perfect: 0 }; e.served++; if (b.rating === 3) { if (!e.perfect) news.stamped.push(id); e.perfect++; } s.book[id] = e; }
        if (who && REGULARS[who]) {
            const e = s.regs[who] ?? { visits: 0, perfects: 0, last: 0, recipe: null, gift: false };
            e.visits++; e.last = b.rating; if (b.recipe) e.recipe = b.recipe; if (b.rating === 3) e.perfects++;
            s.regs[who] = e;
            const g = REGULARS[who].gift;
            if (e.perfects >= 2 && !e.gift && g) { e.gift = true; if (!s.recipes[g]) { s.recipes[g] = true; news.gifts.push({ who, recipe: g }); } }
        }
    }
    if (k.endless) return news;
    if (stars > (s.stars[i] ?? 0)) { news.best = true; s.stars[i] = stars; }
    if (stars >= 1) {
        delete s.fails[i];
        for (const g of SHIFTS[i].gift ?? []) s.recipes[g] = true;
        if (i === s.day) {
            s.day++; news.advanced = true;
            // Every stall ends with the regulars passing the hat, so nobody is ever stuck short of the next one.
            const next = LOCATIONS[SHIFTS[i].loc + 1];
            if (SHIFTS[i].finale && next) { news.hat = Math.round(next.cost * 0.4 / 100) * 100; s.cash += news.hat; s.earned += news.hat; }
        }
        if (SHIFTS[i].last) { news.first = !s.finished; s.finished = true; }
    } else s.fails[i] = (s.fails[i] ?? 0) + 1;
    return news;
}

export const assisted = (s, i) => (s.fails[i] ?? 0) >= 2;

/** What a regular says when they sit down, from what they remember of you. */
export function greeting(s, who, pick) {
    const R = REGULARS[who], e = s.regs[who];
    if (!R) return null;
    const list = !e ? R.lines.first : e.last === 3 ? R.lines.perfect : e.last === 2 ? R.lines.good : R.lines.poor;
    const name = e?.recipe ? RECIPES[e.recipe].name : "bowl";
    return list[pick % list.length].replace("{r}", name);
}
