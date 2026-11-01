// Everything tunable, and the words that make the game funny. No framework imports, so the sim and bots can share it.

export const LANE = 2.4;            // Centre-to-centre lane spacing.
export const V0 = 15;               // Start speed, units per second. One unit is shown as one metre.
export const VMAX = 34;             // Asymptotic top speed.
export const VRAMP = 2600;          // Metres for the speed gap to shrink by e.
export const SKATE_BOOST = 1.12;    // Roller skates push past the top speed, so proofs run at TOP.
export const TOP = VMAX * SKATE_BOOST;

export const speedAt = (d) => VMAX - (VMAX - V0) * Math.exp(-d / VRAMP);
/** 0 at the start, 1 at top speed. */
export const levelAt = (d) => (speedAt(d) - V0) / (VMAX - V0);
/** Seconds between rows of a pattern. Time, not metres, is what a thumb cares about. */
export const beatAt = (d) => { const l = levelAt(d); return 1.25 - 0.57 * Math.pow(l, 0.8); };
export const MIN_BEAT = 0.68;

export const BIOMES = [
    { id: "farm", name: "Bottom Farm", sub: "Population: 1 fewer ostrich", start: 0, tag: "Oi!" },
    { id: "village", name: "Little Muddle", sub: "Twinned with nowhere", start: 750, tag: "Mind the bunting" },
    { id: "motorway", name: "The M-Nothing", sub: "Ostriches must use the slow lane", start: 1750, tag: "Services: never" },
    { id: "airport", name: "Departures", sub: "All feathers must be under 100ml", start: 2900, tag: "Gate closing" },
    { id: "ski", name: "Mount Regret", sub: "Black run. Blacker feathers.", start: 4150, tag: "Wheee" },
    { id: "launch", name: "Launch Complex", sub: "Please do not lick the rocket", start: 5500, tag: "T minus ostrich" },
];
export const ROUTE = 7000;          // Metres to the rocket.
export const FINALE_CLEAR = 170;    // The last stretch to the rocket has no obstacles.
export const biomeIndex = (lapD) => { let b = 0; for (let i = 0; i < BIOMES.length; i++) if (lapD >= BIOMES[i].start) b = i; return b; };

export const DISGUISES = {
    moustache: { name: "Fake Moustache", line: "Nobody suspects a thing", time: 12, color: "#c98a4b" },
    skates: { name: "Roller Skates", line: "Double score. Zero brakes.", time: 9, color: "#ff5d73" },
    jetpack: { name: "Jet Pack", line: "Ostriches can fly now, apparently", time: 6.5, color: "#ffb52e" },
    dress: { name: "Wedding Dress", line: "The train sweeps up every egg", time: 12, color: "#fff4f0" },
    hivis: { name: "Hi-Vis Vest", line: "Nobody stops a hi-vis vest", time: 6, color: "#d6f030" },
};
export const DISGUISE_IDS = Object.keys(DISGUISES);

export const OSTRICHES = [
    { id: "keith", name: "Keith", cost: 0, bio: "Has never once thought this through.", body: "#2b2730", tip: "#f7f1e6", skin: "#f2a58e", leg: "#e88f7c", beak: "#f4b860" },
    { id: "doris", name: "Doris", cost: 150, bio: "Left a note. The note says 'no'.", body: "#ef5f93", tip: "#ffe3ec", skin: "#ffc3c7", leg: "#ec7f92", beak: "#ffd166", hat: "bow" },
    { id: "gary", name: "Gary", cost: 400, bio: "Says he is an emu. He is not.", body: "#7a5230", tip: "#e6c79a", skin: "#d9a06b", leg: "#b77a48", beak: "#3f3a3a", hat: "mullet" },
    { id: "neville", name: "Sir Neville", cost: 800, bio: "Escaping purely on principle.", body: "#58606f", tip: "#e8ecf2", skin: "#e3b7a4", leg: "#c98f7e", beak: "#e5b45a", hat: "tophat" },
    { id: "dave", name: "Disco Dave", cost: 1500, bio: "The farmer owes him money.", body: "#6b3fd4", tip: "#2fe0c8", skin: "#ff9ecd", leg: "#ff7ab8", beak: "#ffe066", hat: "afro" },
    { id: "goldie", name: "Goldie", cost: -1, bio: "Reached the rocket. Laid the golden egg.", body: "#e8b020", tip: "#fff2b0", skin: "#ffd978", leg: "#e5a93a", beak: "#fff0a8", shine: 0.7 },
];

// { id, text, stat, goal, run?: true when it must happen in one run }
export const MISSIONS = [
    { id: "eggs50", text: "Collect 50 eggs in one run", stat: "eggs", goal: 50, run: true, pay: 25 },
    { id: "near5", text: "5 near misses in one run", stat: "near", goal: 5, run: true, pay: 30 },
    { id: "slide6", text: "Slide under 6 things", stat: "slides", goal: 6, pay: 20 },
    { id: "jump15", text: "Hurdle 15 obstacles", stat: "hops", goal: 15, pay: 20 },
    { id: "dis2", text: "Wear 2 disguises in one run", stat: "disguises", goal: 2, run: true, pay: 30 },
    { id: "chick10", text: "Barge through 3 chickens' worth of clutter", stat: "soft", goal: 3, run: true, pay: 15 },
    { id: "m500", text: "Run 500 m in one go", stat: "dist", goal: 500, run: true, pay: 30 },
    { id: "village", text: "Reach Little Muddle", stat: "biome", goal: 1, run: true, pay: 40 },
    { id: "eggs120", text: "Collect 120 eggs in one run", stat: "eggs", goal: 120, run: true, pay: 50 },
    { id: "near12", text: "12 near misses in one run", stat: "near", goal: 12, run: true, pay: 60 },
    { id: "mous3", text: "Fool the farmer 3 times", stat: "moustache", goal: 3, pay: 40 },
    { id: "jet", text: "Stay airborne with 40 jet-pack eggs", stat: "skyeggs", goal: 40, pay: 40 },
    { id: "smash12", text: "Smash 12 things in hi-vis", stat: "smash", goal: 12, pay: 40 },
    { id: "chain5", text: "Chain 4 near misses", stat: "chain", goal: 4, run: true, pay: 50 },
    { id: "motorway", text: "Reach the M-Nothing", stat: "biome", goal: 2, run: true, pay: 70 },
    { id: "m1500", text: "Run 1,500 m in one go", stat: "dist", goal: 1500, run: true, pay: 70 },
    { id: "airport", text: "Reach Departures", stat: "biome", goal: 3, run: true, pay: 100 },
    { id: "eggs300", text: "Collect 300 eggs in one run", stat: "eggs", goal: 300, run: true, pay: 120 },
    { id: "ski", text: "Reach Mount Regret", stat: "biome", goal: 4, run: true, pay: 150 },
    { id: "launch", text: "Reach the Launch Complex", stat: "biome", goal: 5, run: true, pay: 200 },
    { id: "m5000", text: "Run 5,000 m in one go", stat: "dist", goal: 5000, run: true, pay: 200 },
    { id: "rocket", text: "Get to the rocket", stat: "getaway", goal: 1, run: true, pay: 400 },
];
export const MAX_MULT = 12;

export const FARMER_LINES = ["OI!", "COME BACK, KEITH!", "THAT'S MY BIRD!", "I KNOW YOUR MOTHER!", "STOP THAT OSTRICH!", "YOU OWE ME A FENCE!", "I'VE GOT A LICENCE!"];
export const FOOLED_LINES = ["Afternoon, sir.", "Lovely weather, sir.", "Seen an ostrich, sir?", "Nice 'tache, sir."];
export const CAUGHT_LINES = [
    "Keith has been returned to the farm.", "The farmer sends his regards.", "Back to the pen. Again.",
    "Keith is reconsidering nothing.", "Technically that was a hug.", "Some fences are emotional.",
];
export const NEAR_WORDS = { dodge: "CLOSE!", hop: "HOP!", limbo: "LIMBO!" };
