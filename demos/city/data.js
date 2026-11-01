// Everything a designer would tune: buildings, adjacency, seasons and the scenarios with their islands.
// Pure data, no framework, so bots can load it in plain Node.

export const STEP = 0.34;              // World height of one level of water or land.
export const HOURS = 24;               // A day is 24 sim hours.
export const SEASON_DAYS = 6;
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];

/**
 * cost: coins and wood. staff: folk needed. stilts: floor stands one level above the tile, so sand is fine.
 * terrain: which heights it can stand on (0 sand, 1 meadow, 2 high meadow, 3 rock).
 * shore: must touch open water.
 */
export const BUILDINGS = {
    hall:    { name: "Harbour Hall", cost: [0, 0], staff: 0, terrain: [1, 2], blurb: "Home of the town. Everything must link back here." },
    cottage: { name: "Cottage", cost: [9, 4], staff: 0, terrain: [1, 2, 3], blurb: "Three more folk. Pays rent, more if fed." },
    lane:    { name: "Lane", cost: [2, 0], staff: 0, terrain: [0, 1, 2, 3], stilts: true, blurb: "Links tiles. On sand it's a boardwalk." },
    dock:    { name: "Fishing Dock", cost: [10, 3], staff: 1, terrain: [0, 1], stilts: true, shore: true, blurb: "Catches fish. Must touch the sea." },
    market:  { name: "Market", cost: [16, 4], staff: 1, terrain: [1, 2, 3], blurb: "Feeds cottages and sells spare food." },
    wood:    { name: "Woodcutter", cost: [7, 2], staff: 1, terrain: [1, 2, 3], blurb: "Wood from every wood beside it." },
    farm:    { name: "Farm", cost: [8, 3], staff: 1, terrain: [1, 2], blurb: "Grain, best at harvest. Nothing in winter." },
    mill:    { name: "Windmill", cost: [14, 5], staff: 1, terrain: [1, 2, 3], blurb: "Lifts every farm beside it. Loves high ground." },
    yard:    { name: "Boatyard", cost: [18, 6], staff: 1, terrain: [0, 1], stilts: true, shore: true, blurb: "Turns wood into trawlers for your docks." },
    pub:     { name: "The Salty Pub", cost: [16, 5], staff: 1, terrain: [1, 2, 3], blurb: "Brews grain into coins. Cottages adore it." },
    smoke:   { name: "Smokehouse", cost: [14, 4], staff: 1, terrain: [1, 2, 3], blurb: "Smokes fish into better coin." },
    light:   { name: "Lighthouse", cost: [28, 10], staff: 1, terrain: [1, 2, 3], blurb: "Guides trawlers home through storms." },
    wall:    { name: "Sea Wall", cost: [6, 3], staff: 0, terrain: [0, 1, 2], blurb: "Holds back the sea, two levels above its tile." },
    garden:  { name: "Garden", cost: [4, 1], staff: 0, terrain: [1, 2, 3], blurb: "Flowers. Neighbours love it." },
};

export const TRAY_ORDER = ["cottage", "lane", "dock", "market", "wood", "farm", "mill", "yard", "smoke", "pub", "light", "wall", "garden"];

/** ADJ[self][neighbour]: stars self gains from that neighbour. */
export const ADJ = {
    cottage: { cottage: 1, market: 2, pub: 2, garden: 2, hall: 1, smoke: -1, yard: -1, dock: -1 },
    dock:    { smoke: 2, yard: 1, market: 1, hall: 1, dock: 1 },
    market:  { cottage: 1, dock: 1, hall: 1, pub: 1, smoke: 1, farm: 1 },
    wood:    { yard: 1 },
    farm:    { farm: 1, mill: 2, garden: 1 },
    mill:    { farm: 1 },
    yard:    { wood: 2, dock: 1 },
    pub:     { cottage: 1, dock: 1, market: 1, farm: 1 },
    smoke:   { dock: 2, wood: 1, market: 1 },
    light:   { dock: 1 },
    garden:  { cottage: 1, garden: 1 },
};
export const MAX_STARS = 5;
/** Every producer pays one, plus one for each two stars or part of two. */
export const gain = (stars) => 1 + Math.ceil(stars / 2);

export const PRICE = { fish: 2, grain: 1, smoked: 3, ale: 3 };
export const BOAT_WOOD = 3;
export const WALL_RISE = 2;           // A wall holds water up to its tile's height + 2.
export const WRECK_DEPTH = 0.6;       // Flood this far over a floor and it is wrecked, not just soaked.
export const DRIFT = { coins: 2, wood: 1 };   // Beachcombing pays every day, whatever happens. This keeps every town alive.

const COMMON = ["cottage", "lane", "dock", "market", "wood"];

/**
 * Islands are hex rows, r = -5 to 5, top to bottom.
 * .  sea    s sand    m meadow    h high meadow    R rock
 * f  woods on meadow    F woods on high meadow
 * @  the Hall on meadow    A the Hall on high meadow    d a dock already standing (on sand)
 */
export const SCENARIOS = [
    {
        id: "cove", name: "Pebble Cove", tag: "Your first harbour", start: { coins: 30, wood: 14 }, startSeason: 0, par: 20,
        unlocks: [...COMMON, "garden"], tide: 1,
        storms: [{ day: 7, level: 0.95, name: "a spring squall" }],
        goals: [
            { type: "cottages", n: 4, text: "Build 4 cottages" },
            { type: "sold", good: "fish", n: 16, text: "Sell 16 fish at market" },
            { type: "cheer", n: 14, text: "Reach 14 cheer" },
        ],
        map: `
          . . . . . .
         . . . . . . .
        . . . s s . . .
       . . s m f f s . .
      . . s m h F f m . .
     . . s m @ m h f m s .
      . . d m m m h m s .
       . . s s m m m s .
        . . . . s s . .
         . . . . . . .
          . . . . . .`,
    },
    {
        id: "bread", name: "Barley Bay", tag: "Grain, boats and an autumn gale", start: { coins: 30, wood: 14 }, startSeason: 0, par: 24,
        unlocks: [...COMMON, "farm", "mill", "yard", "garden"], tide: 1,
        storms: [{ day: 9, level: 1.2, name: "the first gale" }, { day: 18, level: 1.4, name: "the autumn blow" }],
        goals: [
            { type: "fed", n: 6, text: "Feed 6 cottages in one night" },
            { type: "trawlers", n: 2, text: "Fit out 2 trawlers" },
            { type: "earned", n: 300, text: "Earn 300 coins" },
        ],
        map: `
          . . . . . .
         . . . s s . .
        . . s m m h s .
       . s m m h h F m .
      . s m m h h F f s .
     . d m @ m h h f m . .
      . . s m m m m m s .
       . . s s m m m s .
        . . . . s m s .
         . . . . s s .
          . . . . . .`,
    },
    {
        id: "spit", name: "Longshore Spit", tag: "Low ground. Learn the sea wall", start: { coins: 40, wood: 18 }, startSeason: 1, par: 40,
        unlocks: [...COMMON, "farm", "wall", "garden", "light", "yard"], tide: 1,
        storms: [{ day: 12, level: 1.35, name: "the summer surge" }, { day: 24, level: 1.5, name: "the harvest surge" }, { day: 36, level: 1.6, name: "the long surge" }],
        goals: [
            { type: "ride", level: 1.3, text: "Ride out a surge with every cottage dry" },
            { type: "cottages", n: 6, text: "Build 6 cottages" },
            { type: "count", kind: "light", n: 1, text: "Light the lighthouse" },
        ],
        map: `
          . . . . . .
         . . . s s . .
        . . s h h h s .
       . s h m m m h s .
      . d m @ m m m h s .
     . . s m m m f m s . .
      . s h m m m F h . .
       . . s h m h h s .
        . . . s R h s .
         . . . s s . .
          . . . . . .`,
    },
    {
        id: "dark", name: "Winterholm", tag: "Starts at harvest. Stock up for the dark", start: { coins: 36, wood: 16 }, startSeason: 2, par: 36,
        unlocks: [...COMMON, "farm", "mill", "yard", "smoke", "pub", "garden", "wall"], tide: 1,
        storms: [{ day: 8, level: 1.3, name: "the first frost gale" }, { day: 18, level: 1.5, name: "midwinter's gale" }, { day: 32, level: 1.5, name: "the thaw storm" }],
        goals: [
            { type: "feedStreak", n: 4, text: "Feed every cottage on 4 winter nights" },
            { type: "folk", n: 20, text: "House 20 folk" },
            { type: "earned", n: 400, text: "Earn 400 coins" },
        ],
        map: `
          . . . . . .
         . . s s s . .
        . s m h h m . .
       . s h h R h f . .
      . d m A h F F f s .
     . . s h h h F f m . .
      . . s m m m h m s .
       . . s m m m m s .
        . . s s s m s .
         . . . . s s .
          . . . . . .`,
    },
    {
        id: "polder", name: "The Saltings", tag: "Wall off the bay. Farm the sea floor", start: { coins: 50, wood: 24 }, startSeason: 0, par: 38,
        unlocks: [...COMMON, "farm", "mill", "yard", "smoke", "pub", "garden", "wall", "light"], tide: 1,
        storms: [{ day: 14, level: 1.4, name: "the spring tide gale" }, { day: 28, level: 1.7, name: "the salt storm" }],
        goals: [
            { type: "reclaimed", n: 4, text: "Build on 4 reclaimed sand tiles" },
            { type: "count", kind: "farm", n: 4, text: "Work 4 farms" },
            { type: "ride", level: 1.7, text: "Keep cottages dry through a level 1.7 surge" },
        ],
        map: `
          . . . . . .
         . . h h h s .
        . h h F f m s .
       . s h m @ m m h .
      . s s s d m m h s .
     . . s s s s m h m s .
      . . s s s s m h s .
       . . h s s m h s .
        . . h h h h s .
         . . . s s . .
          . . . . . .`,
    },
    {
        id: "great", name: "The Great Tide", tag: "Everything you've learned. One enormous sea", start: { coins: 50, wood: 24 }, startSeason: 0, par: 52,
        unlocks: [...COMMON, "farm", "mill", "yard", "smoke", "pub", "garden", "wall", "light"], tide: 1.1,
        storms: [{ day: 12, level: 1.4, name: "a stiff gale" }, { day: 26, level: 1.7, name: "the equinox storm" }, { day: 44, level: 2.3, name: "the Great Tide" }],
        goals: [
            { type: "folk", n: 26, text: "House 26 folk" },
            { type: "cheer", n: 50, text: "Reach 50 cheer" },
            { type: "ride", level: 2.3, text: "Hold the Great Tide with every cottage dry" },
        ],
        map: `
          . . . s s .
         . . s h h s .
        . s h R h h s .
       . s h m F f h s .
      . d m @ m m m h s .
     . . s m m m f m m s .
      . s h m m m m h s .
       . s h h m m R s .
        . s s h R h s .
         . . . s s . .
          . . . . . .`,
    },
];

/** The free-build isles. Every building, gentle storms, no goals. */
export const SANDBOX_MAPS = [SCENARIOS[5], SCENARIOS[4], SCENARIOS[1]];
export const SANDBOX = {
    id: "sandbox", name: "Free Build", tag: "No goals. Your island, your rules", start: { coins: 150, wood: 80 }, startSeason: 0, par: 0, sandbox: true,
    unlocks: [...COMMON, "farm", "mill", "yard", "smoke", "pub", "garden", "wall", "light"], tide: 1, storms: [{ day: 14, level: 1.2, name: "a storm" }], goals: [],
};
