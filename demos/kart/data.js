// Racers, classes and the save file.

export const RACERS = [
    { id: "pip", name: "Pip", role: "Stock clerk", color: "#ff4b3e", speed: 0.5, accel: 0.6, handling: 0.6, weight: 0.45, drift: 0.55,
      ai: { line: 0.8, driftSkill: 0.6, wobble: 0.12, aggro: 0.5, hoard: 0.3, ram: 0.2 }, bio: "All-rounder" },
    { id: "nan", name: "Nan Nitro", role: "Coupon collector", color: "#ff5fa2", speed: 0.85, accel: 0.35, handling: 0.4, weight: 0.65, drift: 0.45,
      ai: { line: 0.7, driftSkill: 0.45, wobble: 0.14, aggro: 1.0, hoard: 0.0, ram: 0.6 }, bio: "Top speed, fires at once" },
    { id: "mop", name: "Mopsy", role: "Cleaning robot", color: "#2ec4a6", speed: 0.5, accel: 0.5, handling: 0.95, weight: 0.5, drift: 0.5,
      ai: { line: 1.0, driftSkill: 0.8, wobble: 0.04, aggro: 0.25, hoard: 0.6, ram: 0.0 }, bio: "Perfect lines, big grip" },
    { id: "kiki", name: "Kiki Frost", role: "Freezer penguin", color: "#38b6ff", speed: 0.45, accel: 0.75, handling: 0.6, weight: 0.2, drift: 1.0,
      ai: { line: 0.85, driftSkill: 1.0, wobble: 0.1, aggro: 0.45, hoard: 0.3, ram: 0.0 }, bio: "Drift charges fastest" },
    { id: "crumb", name: "Chef Crumb", role: "Master baker", color: "#ffc233", speed: 0.6, accel: 0.9, handling: 0.5, weight: 0.55, drift: 0.6, unlock: "fresh",
      ai: { line: 0.75, driftSkill: 0.6, wobble: 0.1, aggro: 0.6, hoard: 0.9, ram: 0.1 }, bio: "Fastest off the line" },
    { id: "stan", name: "Big Stan", role: "Forklift driver", color: "#ff8a1f", speed: 1.0, accel: 0.2, handling: 0.35, weight: 1.0, drift: 0.35, unlock: "clearance",
      ai: { line: 0.65, driftSkill: 0.35, wobble: 0.16, aggro: 0.8, hoard: 0.2, ram: 1.0 }, bio: "Heavy. Barges everyone" },
];
export const racerById = (id) => RACERS.find((r) => r.id === id);

export const CLASSES = [
    { id: "basket", name: "Basket", tag: "Easy does it", speed: 0.92, ai: 0.76, rubberUp: 0.04, rubberDown: 0.16 },
    { id: "trolley", name: "Trolley", tag: "Proper racing", speed: 1.0, ai: 0.87, rubberUp: 0.07, rubberDown: 0.1 },
    { id: "flatbed", name: "Flatbed", tag: "Ridiculously fast", speed: 1.1, ai: 0.96, rubberUp: 0.1, rubberDown: 0.06 },
];

export const POINTS = [10, 7, 5, 3, 2, 1];
export const ORD = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

const FRESH = () => ({
    racer: "pip", cls: "basket", mirror: false,
    cups: {},                     // "fresh:basket" -> best finishing rank (1..6)
    tt: {},                       // track id -> { best, lap, ghost }
    seen: {},                     // tutorial steps done
    settings: { music: true, sfx: true, haptics: true, control: "drag", shadows: true },
    played: 0, career: { cup: 0, race: 0, points: {} },
});

export function loadSave(game) {
    if (game.data.save) return game.data.save;
    let s;
    try { s = game.load("cartgp", null); } catch { s = null; }
    const base = FRESH();
    s = s && typeof s === "object" ? { ...base, ...s, settings: { ...base.settings, ...s.settings }, career: { ...base.career, ...s.career } } : base;
    game.data.save = s;
    return s;
}
export function commit(game) { try { game.save("cartgp", game.data.save); } catch { /* blocked storage is fine */ } }

export const bestRank = (save, cup, cls) => save.cups[`${cup}:${cls}`] ?? 0;
const podium = (save, cup, cls) => { const r = bestRank(save, cup, cls); return r >= 1 && r <= 3; };

export function unlocks(save) {
    const has = (cup, cls) => podium(save, cup, cls);
    const cupDone = (cup) => ["basket", "trolley", "flatbed"].some((c) => has(cup, c));
    const golds = (cls) => ["fresh", "clearance"].every((c) => bestRank(save, c, cls) === 1);
    return {
        clearance: cupDone("fresh"),
        crumb: cupDone("fresh"),
        stan: cupDone("clearance"),
        trolley: cupDone("clearance"),
        flatbed: golds("trolley") || save.cups["*flatbed"] === 1,
        mirror: golds("flatbed"),
        goldCart: golds("flatbed"),
    };
}
export const racerOpen = (save, r) => !r.unlock || (r.unlock === "fresh" ? unlocks(save).crumb : unlocks(save).stan);
export const classOpen = (save, id) => id === "basket" || unlocks(save)[id];
