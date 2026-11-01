// ANT WARS rules: every number a balance pass might touch lives here. No Pogo imports, so bots run it bare.
export const TICK_HZ = 20;

export const WORKER = 0, SOLDIER = 1, SPITTER = 2, CARRIER = 3, FLYER = 4;
export const CRUMB = 0, SUGAR = 1, MEAT = 2, PICKLE = 3;
export const FOODS = [
    { id: "crumb", name: "Crumbs", tint: "#e8b866", rgb: [0.91, 0.72, 0.4] },
    { id: "sugar", name: "Sugar", tint: "#ff7fa8", rgb: [1, 0.5, 0.66] },
    { id: "meat", name: "Protein", tint: "#d9534f", rgb: [0.85, 0.33, 0.31] },
    { id: "pickle", name: "Pickle", tint: "#9ccc3c", rgb: [0.61, 0.8, 0.24] },
];

// cost is [crumb, sugar, meat, pickle]. Speed in world units a second, cd in ticks.
export const CASTES = [
    { id: "worker", name: "Worker", hp: 10, dmg: 1.2, cd: 14, range: 11, speed: 50, aggro: 26, carry: 2, size: 13, turn: 0.55, cost: [2, 0, 0, 0], chamber: null, blurb: "Hauls food. Bites if cornered." },
    { id: "soldier", name: "Soldier", hp: 34, dmg: 5, cd: 12, range: 14, speed: 44, aggro: 46, carry: 0, size: 18, turn: 0.45, cost: [3, 0, 1, 0], chamber: "gym", blurb: "Big jaws. Crushes workers and flyers." },
    { id: "spitter", name: "Spitter", hp: 14, dmg: 3.6, cd: 26, range: 76, speed: 40, aggro: 84, carry: 0, size: 15, turn: 0.45, cost: [3, 0, 0, 1], chamber: "vat", blurb: "Lobs pickle acid. Melts soldiers." },
    { id: "carrier", name: "Carrier", hp: 28, dmg: 1.5, cd: 14, range: 12, speed: 36, aggro: 22, carry: 7, size: 19, turn: 0.35, cost: [5, 1, 0, 0], chamber: "hall", blurb: "Hauls seven crumbs, or one huge prize." },
    { id: "flyer", name: "Flyer", hp: 12, dmg: 3, cd: 12, range: 12, speed: 84, aggro: 60, carry: 0, size: 15, turn: 0.32, cost: [3, 2, 0, 0], chamber: "loft", blurb: "Crosses anything. Dives on spitters." },
];
// Attacker row, defender column: soldier > worker, spitter > soldier, flyer > spitter, soldier > flyer.
export const DMG = [
    [1, 0.6, 1, 0.8, 0.4],
    [1.5, 1, 1.5, 1.2, 1.1],
    [1, 1.5, 1, 1, 0.8],
    [1, 0.6, 1, 0.8, 0.5],
    [1.2, 0.6, 2.4, 0.8, 1],
];

// Chambers: `need` is the food the tech demands, so controlling a food type is controlling a tech.
export const CHAMBERS = [
    { id: "nursery", name: "Nursery", joke: "Softer eggs, louder lullabies.", levels: [[20, 0, 0, 0], [50, 10, 0, 0]], does: ["Queen lays 40% faster", "Queen lays 40% faster again"] },
    { id: "pantry", name: "Pantry", joke: "Room for more mouths.", levels: [[30, 0, 0, 0], [70, 0, 15, 0], [120, 30, 30, 0]], does: ["+200 ant capacity", "+250 ant capacity", "+300 ant capacity"] },
    { id: "gym", name: "Mandible Gym", joke: "Do you even bite?", levels: [[25, 0, 10, 0], [50, 0, 35, 0]], does: ["Unlocks Soldiers", "Soldiers bite 30% harder"], caste: SOLDIER },
    { id: "vat", name: "Pickle Vat", joke: "Fermented with malice.", levels: [[25, 0, 0, 10], [50, 0, 0, 35]], does: ["Unlocks Spitters", "Spit splashes wider, hits harder"], caste: SPITTER },
    { id: "hall", name: "Porters' Hall", joke: "Lift with the thorax.", levels: [[35, 8, 0, 0], [60, 30, 0, 0]], does: ["Unlocks Carriers", "Carriers haul eleven"], caste: CARRIER },
    { id: "loft", name: "Wing Loft", joke: "Sugar rush, literally.", levels: [[25, 12, 0, 0], [50, 40, 0, 0]], does: ["Unlocks Flyers", "Flyers are 25% faster and tougher"], caste: FLYER },
];
export const CHAMBER_BY_ID = Object.fromEntries(CHAMBERS.map((c) => [c.id, c]));

export const BASE_CAP = 250;
export const CAP_BONUS = [0, 200, 450, 750];
export const LAY_TICKS = [10, 6, 3.5];
export const FOOD_SCALE = 2.4;     // ticks an egg, by nursery level
export const NEST_HP = 900;

// Teams: 0 is always the player's colours.
export const TEAMS = [
    { id: "marmalade", name: "Marmalade Colony", leader: "Queen Marmalade", c: "#f59a23", hi: "#ffd27a", lo: "#a44f0c", ink: "#3a1c08", ui: "#ffb547" },
    { id: "soot", name: "Soot Raiders", leader: "Baron Cinder", c: "#3b3744", hi: "#8c86a6", lo: "#16131c", ink: "#0a0810", ui: "#9b94b8" },
    { id: "cherry", name: "Cherry Harvesters", leader: "Madame Pip", c: "#d62f3f", hi: "#ff8e8a", lo: "#7c0f22", ink: "#35060e", ui: "#ff6b6b" },
    { id: "pale", name: "Pale Sappers", leader: "Old Chalk", c: "#e7e2cf", hi: "#ffffff", lo: "#a8a288", ink: "#3d3a2c", ui: "#f4efdc" },
    { id: "violet", name: "Vinegaretta's Legion", leader: "Empress Vinegaretta", c: "#8e3fd6", hi: "#d3a4ff", lo: "#4a1785", ink: "#1e0838", ui: "#c084fc" },
];

// Food kinds on the map. `r` is the radius at full size, `amount` the default.
export const FOOD_KINDS = {
    crumbs: { type: CRUMB, r: 26, amount: 60, name: "Crumbs" },
    bread: { type: CRUMB, r: 44, amount: 180, name: "Crust" },
    sandwich: { type: CRUMB, r: 78, amount: 500, name: "Sandwich" },
    cake: { type: CRUMB, r: 86, amount: 400, heavy: true, name: "Giant Cake" },
    jam: { type: SUGAR, r: 30, amount: 90, name: "Jam" },
    melon: { type: SUGAR, r: 56, amount: 240, name: "Melon" },
    lolly: { type: SUGAR, r: 34, amount: 120, name: "Boiled Sweet" },
    ham: { type: MEAT, r: 44, amount: 130, name: "Ham" },
    sausage: { type: MEAT, r: 46, amount: 200, name: "Sausage" },
    beetle: { type: MEAT, r: 22, amount: 40, name: "Dead Beetle" },
    gherkin: { type: PICKLE, r: 40, amount: 130, name: "Gherkin" },
    lemon: { type: PICKLE, r: 34, amount: 90, name: "Lemon" },
    scraps: { type: MEAT, r: 16, amount: 6, name: "Fallen" },
};

// Scenery. `b` is a blocking ellipse [rx, ry] in world units, rotated with the prop; omit for walk-over decoration.
export const PROPS = {
    can: { b: [88, 36], w: 220 }, plate: { b: [108, 108], w: 240 }, jar: { b: [64, 64], w: 150 }, apple: { b: [46, 46], w: 110 },
    pot: { b: [70, 70], w: 160 }, stone: { b: [44, 34], w: 110 }, stone2: { b: [32, 26], w: 80 }, shades: { b: [90, 34], w: 210 },
    fork: { b: [104, 14], w: 220 }, trowel: { b: [112, 30], w: 240 }, mushroom: { b: [40, 40], w: 100 }, log: { b: [110, 36], w: 260 },
    flipflop: { b: [102, 46], w: 220 }, napkin: { w: 200 }, leaf: { w: 120 }, daisy: { w: 80 }, clover: { w: 70 }, twig: { w: 170 },
};
