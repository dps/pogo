// Clubs, venues, modes and the save file. All names are invented, all villages fictional.

export const VENUES = {
    meadow: { name: "Buttercup Meadow", sky: ["#58aee6", "#fdeec6"], grass: ["#7dc14c", "#6bb340"], hill: ["#8cc35a", "#6fae4d", "#b4cf63", "#c7c95f"], hedge: "#3f7440", fog: "#dcecd0", sun: "#fff0cf", amb: "#b8dcff", ground: "#7d9a58", wear: "#b8a763" },
    harvest: { name: "Harvest Hill", sky: ["#5b9fd8", "#ffdca0"], grass: ["#8fbc42", "#7fae3a"], hill: ["#d7b652", "#c79f42", "#a7b34c", "#e0c766"], hedge: "#6a7a34", fog: "#f3dfae", sun: "#ffe0ac", amb: "#c7d8ef", ground: "#9a8a50", wear: "#c2a35a" },
    moor: { name: "Fellside Moor", sky: ["#6a84b8", "#e6d3d9"], grass: ["#71ad57", "#62a04c"], hill: ["#8a7aa8", "#6f8a58", "#a08fb2", "#7f9960"], hedge: "#42604a", fog: "#cfcad8", sun: "#ffe6d8", amb: "#b9c6e8", ground: "#6a7a68", wear: "#a59a72" },
    sunset: { name: "Beacon Ridge", sky: ["#4f6fb8", "#ffb27a"], grass: ["#7cb44c", "#6da642"], hill: ["#7ea84c", "#5e9248", "#a8ab50", "#c39a52"], hedge: "#3c5f40", fog: "#f4c79c", sun: "#ffc98c", amb: "#b0b4e8", ground: "#70804c", wear: "#bb9a5a" },
    mud: { name: "The Quagmire", sky: ["#7f97ad", "#d8d3c3"], grass: ["#7d8a45", "#6c7a3d"], hill: ["#7f9a58", "#6c8a4e", "#93a262", "#a39a5e"], hedge: "#42603c", fog: "#c9cec2", sun: "#f4ead4", amb: "#bfcbd8", ground: "#6c6a4c", wear: "#6b4d2e" },
};

// Pattern, colours and a playing style for every club. skill is a tweak added to the division's level.
export const CLUBS = [
    // The Parish League
    { id: "muck", name: "Muckle Bottom", tag: "MBT", c1: "#b84a2e", c2: "#f6e6c2", pattern: "hoops", style: "direct", horns: 0, furs: [1, 2, 1, 0, 2], tier: 0, venue: "mud", quirk: { mud: true }, tweak: -0.03 },
    { id: "thistle", name: "Little Thistle", tag: "LTH", c1: "#7a4fa0", c2: "#f3ecd8", pattern: "plain", style: "mixed", horns: 1, furs: [4, 0, 4, 3, 0], tier: 0, venue: "meadow", tweak: 0.0 },
    { id: "turnip", name: "Turnip Hollow", tag: "THO", c1: "#e8e0cf", c2: "#8a3f8f", pattern: "stripes", style: "direct", horns: 2, furs: [0, 1, 2, 1, 0], tier: 0, venue: "harvest", quirk: { farmer: true }, tweak: 0.0 },
    { id: "gusset", name: "Gusset-on-Wold", tag: "GOW", c1: "#3f8fb0", c2: "#1f4f66", pattern: "halves", style: "pass", horns: 0, furs: [2, 3, 2, 0, 1], tier: 0, venue: "moor", quirk: { wind: true }, tweak: 0.02 },
    { id: "nobbin", name: "Nobbin Green", tag: "NOB", c1: "#3f9a55", c2: "#f6e6c2", pattern: "sash", style: "press", horns: 1, furs: [0, 0, 1, 2, 4], tier: 0, venue: "meadow", quirk: { sheep: true }, tweak: 0.03 },
    { id: "pudding", name: "Pudding Lane", tag: "PUD", c1: "#d9a020", c2: "#3a2c26", pattern: "stripes", style: "mixed", horns: 0, furs: [3, 1, 3, 2, 1], tier: 0, venue: "harvest", tweak: 0.05 },
    { id: "wobble", name: "Wobbleford", tag: "WOB", c1: "#d9536f", c2: "#ffffff", pattern: "plain", style: "press", horns: 2, furs: [1, 0, 0, 4, 2], tier: 0, venue: "sunset", tweak: 0.07 },
    // The County Combination
    { id: "bleat", name: "Bleatham Town", tag: "BLT", c1: "#2c6fb0", c2: "#ffffff", pattern: "stripes", style: "pass", horns: 0, furs: [0, 4, 1, 0, 3], tier: 1, venue: "meadow", tweak: 0.0 },
    { id: "cragg", name: "Cragg Rovers", tag: "CRG", c1: "#3a3f4a", c2: "#e8c547", pattern: "hoops", style: "direct", horns: 2, furs: [3, 2, 3, 3, 2], tier: 1, venue: "moor", quirk: { wind: true }, tweak: 0.02 },
    { id: "sowerby", name: "Sowerthorpe Marsh", tag: "SOW", c1: "#6a7a3a", c2: "#e8dcb8", pattern: "plain", style: "press", horns: 1, furs: [2, 1, 2, 0, 1], tier: 1, venue: "mud", quirk: { mud: true }, tweak: 0.03 },
    { id: "hobb", name: "Hobb's Cross", tag: "HOB", c1: "#c43d3d", c2: "#1f1f26", pattern: "stripes", style: "mixed", horns: 0, furs: [1, 3, 1, 2, 0], tier: 1, venue: "sunset", tweak: 0.04 },
    { id: "tansy", name: "Tansy Vale", tag: "TAN", c1: "#e8853a", c2: "#2a4a66", pattern: "halves", style: "pass", horns: 1, furs: [0, 1, 0, 2, 4], tier: 1, venue: "harvest", quirk: { farmer: true }, tweak: 0.05 },
    { id: "wether", name: "Wethers Fell", tag: "WFL", c1: "#2f8f8a", c2: "#f3ecd8", pattern: "sash", style: "press", horns: 2, furs: [4, 4, 0, 1, 2], tier: 1, venue: "moor", quirk: { sheep: true }, tweak: 0.06 },
    { id: "ramsgill", name: "Ramsgarth Athletic", tag: "RAM", c1: "#8f2f4f", c2: "#7fb8e0", pattern: "plain", style: "direct", horns: 2, furs: [2, 0, 3, 2, 1], tier: 1, venue: "meadow", tweak: 0.09 },
    // The High Fells Premier
    { id: "ironhoof", name: "Ironhoof United", tag: "IRN", c1: "#c8102e", c2: "#f4efe6", pattern: "plain", style: "mixed", horns: 2, furs: [3, 3, 4, 0, 3], tier: 2, venue: "sunset", tweak: 0.0 },
    { id: "kidderby", name: "Kidderby Albion", tag: "KID", c1: "#1f5fa8", c2: "#ffd24a", pattern: "plain", style: "pass", horns: 0, furs: [0, 0, 1, 4, 2], tier: 2, venue: "meadow", tweak: 0.02 },
    { id: "nanny", name: "Nannywick City", tag: "NAN", c1: "#74b8e8", c2: "#1f2f4f", pattern: "plain", style: "press", horns: 1, furs: [4, 1, 0, 2, 0], tier: 2, venue: "harvest", tweak: 0.03 },
    { id: "highgruff", name: "High Gruff", tag: "HGF", c1: "#20242c", c2: "#f4efe6", pattern: "stripes", style: "direct", horns: 2, furs: [2, 3, 2, 3, 4], tier: 2, venue: "moor", quirk: { wind: true }, tweak: 0.05 },
    { id: "billygate", name: "Billygate", tag: "BIL", c1: "#ffd24a", c2: "#20242c", pattern: "hoops", style: "press", horns: 0, furs: [1, 1, 3, 0, 2], tier: 2, venue: "sunset", tweak: 0.05 },
    { id: "capricorn", name: "Capricorn Park", tag: "CAP", c1: "#3f9a55", c2: "#ffffff", pattern: "hoops", style: "pass", horns: 1, furs: [0, 2, 2, 1, 0], tier: 2, venue: "harvest", quirk: { farmer: true }, tweak: 0.07 },
    { id: "summit", name: "Summit Real", tag: "SMT", c1: "#fff8ea", c2: "#c9a227", pattern: "plain", style: "pass", horns: 1, furs: [0, 0, 4, 0, 4], tier: 2, venue: "sunset", tweak: 0.1 },
];

export const TIERS = [
    { name: "The Parish League", short: "Parish League", base: 0.02, up: 3 },
    { name: "The County Combination", short: "County Combo", base: 0.24, up: 2 },
    { name: "The High Fells Premier", short: "High Fells", base: 0.42, up: 0 },
];

export const LEVELS = [
    { name: "Village Green", skill: 0.05, blurb: "They're mostly here for the oranges." },
    { name: "Parish", skill: 0.32, blurb: "They've heard of passing." },
    { name: "County", skill: 0.58, blurb: "They mark, they run, they mean it." },
    { name: "High Fells", skill: 0.85, blurb: "Grown goats have wept." },
];

export const MODES = [
    { id: "classic", name: "Classic", blurb: "Grass, goats, glory.", mode: {} },
    { id: "mud", name: "Mud Bath", blurb: "Skid, splat, ball dies in puddles.", mode: { mud: true }, venue: "mud" },
    { id: "farmer", name: "Wandering Farmer", blurb: "He's looking for his turnips.", mode: { farmer: true }, venue: "harvest" },
    { id: "wind", name: "Gale Force", blurb: "The ball goes where it likes.", mode: { wind: true }, venue: "moor" },
    { id: "sheep", name: "Sheep Invasion", blurb: "Six obstacles, all unbothered.", mode: { sheep: true }, venue: "meadow" },
];

export const CREST_WORDS = ["Rovers", "Town", "United", "Athletic", "Wanderers", "Billies", "Nannies", "Kids", "Rangers", "Harriers"];
export const VILLAGES = ["Goosefoot", "Mudford", "Clover Dell", "Hay Wain", "Nettlebed", "Thimble End", "Bramble Top", "Old Sprocket", "Pigs Knuckle", "Upper Wotsit"];
export const KIT_COLORS = ["#c8302e", "#e8853a", "#ffd24a", "#3f9a55", "#2f8f8a", "#2c6fb0", "#74b8e8", "#7a4fa0", "#d9536f", "#f4efe6", "#20242c", "#8a5e3c"];
export const PATTERNS = ["plain", "stripes", "hoops", "halves", "sash"];
export const HORNS = ["Swept", "Viking", "Ram"];
export const FUR_NAMES = ["Cream", "Honey", "Conker", "Peat", "Ash"];

const DEFAULT_SAVE = () => ({
    v: 1,
    team: { village: 0, word: 0, c1: 5, c2: 2, pattern: "stripes", horns: 0, fur: 0 },
    settings: { music: true, sfx: true, haptics: true, level: 1 },
    season: null, cup: null,
    best: { goals: 0, wins: 0, seasons: 0, titles: 0, cups: 0, played: 0, biggestWin: 0, tiersCleared: 0 },
    tier: 0, seenTips: {}, reel: [], trophies: [],
});

let cache = null;
export function loadSave(game) {
    if (cache) return cache;
    let s = null;
    try { s = game.load("goatsoccer"); } catch { s = null; }
    const d = DEFAULT_SAVE();
    cache = s && s.v === 1 ? { ...d, ...s, team: { ...d.team, ...s.team }, settings: { ...d.settings, ...s.settings }, best: { ...d.best, ...s.best } } : d;
    return cache;
}
export function writeSave(game) { try { game.save("goatsoccer", cache); } catch { /* blocked storage: progress lasts the session */ } }
export function resetCache(game) { cache = null; return loadSave(game); }

export function myClub(save) {
    const t = save.team;
    return {
        id: "me", name: `${VILLAGES[t.village]} ${CREST_WORDS[t.word]}`, tag: tagOf(VILLAGES[t.village]), c1: KIT_COLORS[t.c1], c2: KIT_COLORS[t.c2], pattern: t.pattern,
        style: "mixed", horns: t.horns, furs: [t.fur, t.fur, t.fur, t.fur, t.fur], furSame: true, tier: save.tier, venue: "meadow", tweak: 0, mine: true,
    };
}
export const tagOf = (s) => s.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
export const club = (id, save) => (id === "me" ? myClub(save) : CLUBS.find((c) => c.id === id));

/** Round-robin fixtures for 8 clubs: 7 rounds. Your club is index 0. Every other game is at your place. */
export function fixtures(ids) {
    const n = ids.length, rounds = [], arr = ids.slice();
    for (let r = 0; r < n - 1; r++) {
        const games = [];
        for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; games.push(r % 2 ? [b, a] : [a, b]); }
        rounds.push(games);
        arr.splice(1, 0, arr.pop());
    }
    return rounds;
}

export function newSeason(save, game) {
    const tier = save.tier, others = CLUBS.filter((c) => c.tier === tier).map((c) => c.id), ids = ["me", ...others];
    const table = {}; for (const id of ids) table[id] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
    save.season = { tier, year: (save.season?.year ?? 0) + 1, round: 0, rounds: fixtures(ids), table, form: [] };
    writeSave(game);
    return save.season;
}

export function sortedTable(season) {
    return Object.entries(season.table).map(([id, r]) => ({ id, ...r })).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

export function newCup(save, game) {
    // Eight clubs drawn from every tier, weakest first. Your own rung sets the bar.
    const pool = CLUBS.filter((c) => c.tier === save.tier || c.tier === Math.min(2, save.tier + 1)).map((c) => c.id);
    const picks = [];
    const start = (save.best.cups * 3 + save.cupDraw * 5 || 0) % pool.length;
    for (let i = 0; i < 7; i++) picks.push(pool[(start + i * 2) % pool.length]);
    save.cupDraw = (save.cupDraw ?? 0) + 1;
    save.cup = { round: 0, opponents: [picks[0], picks[3], picks[5]], alive: true, draw: picks };
    writeSave(game);
    return save.cup;
}

export const CUP_ROUNDS = ["Quarter-final", "Semi-final", "The Final"];
