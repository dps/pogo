// Every number a designer would want to touch: weapons, monsters, upgrades, waves.

// The working title in the owner's note used a real product's name, so the game ships under a generic one.
// To retitle, change these two words.
export const TITLE_TOP = "ROBOVAC", TITLE_BOTTOM = "RAMPAGE";

export const W = 10.5, D = 11.5;       // room half-width (x) and half-depth (z): near square, so portrait and landscape both fit

export const WEAPONS = {
    lint: { name: "LINT SPITTER", short: "LINT", kind: "shot", dmg: 6.5, rate: 4.2, speed: 16, cost: 0, spread: 0.03, range: 11, color: [0.85, 0.82, 0.78] },
    nail: { name: "NAIL GUN", short: "NAILS", kind: "shot", dmg: 7.5, rate: 11, speed: 28, cost: 0.55, spread: 0.05, pierce: 1, range: 14, color: [0.75, 0.8, 0.9] },
    blower: { name: "LEAF BLOWER", short: "BLOWER", kind: "cone", dmg: 20, tick: 0.08, range: 8.5, arc: 0.55, knock: 34, cost: 7, color: [0.75, 0.95, 0.75] },
    dryer: { name: "HAIR-DRYER FLAMER", short: "FLAMER", kind: "cone", dmg: 44, tick: 0.08, range: 6.2, arc: 0.36, knock: 3, burn: 2.2, cost: 9, color: [1, 0.55, 0.15] },
    sock: { name: "SOCK LAUNCHER", short: "SOCKS", kind: "sock", dmg: 34, rate: 1.9, speed: 15, cost: 4, blast: 2.6, bounces: 3, range: 13, color: [0.95, 0.4, 0.45] },
};
export const DROP_WEAPONS = ["nail", "blower", "dryer", "sock"];

export const ENEMIES = {
    bunny: { name: "Dust Bunny", r: 0.4, hp: 7, speed: 3.1, bite: 4, score: 10, motes: 1 },
    puff: { name: "Static Puff", r: 0.5, hp: 12, speed: 2.5, bite: 0, score: 25, motes: 2 },
    snake: { name: "Sock Snake", r: 0.42, hp: 12, speed: 3.5, bite: 7, score: 30, motes: 1 },
    seg: { name: "Sock Snake", r: 0.38, hp: 12, speed: 0, bite: 3, score: 15, motes: 1 },
    golem: { name: "Cat Hair Golem", r: 1.15, hp: 190, speed: 1.55, bite: 10, score: 150, motes: 10 },
    trike: { name: "Tiny Tyrant", r: 1.5, hp: 3600, speed: 3, bite: 10, score: 2000, motes: 30 },
};

// The upgrade tree. Each branch starts at a root, then forks: taking one fork locks its sibling.
export const UPGRADES = {
    // Chainsaw
    bar: { branch: "saw", name: "Longer Bar", text: "Chainsaw reach +40%", needs: null, icon: "saw" },
    whirl: { branch: "saw", name: "Whirlwind", text: "Spinning is easier and hits twice as hard", needs: "bar", locks: "teeth", icon: "spin" },
    teeth: { branch: "saw", name: "Diamond Teeth", text: "Chainsaw damage +70%", needs: "bar", locks: "whirl", icon: "saw" },
    cyclone: { branch: "saw", name: "Sawnado", text: "Every full spin throws sawdust blades", needs: "whirl", icon: "spin" },
    refund: { branch: "saw", name: "Sawdust Harvest", text: "Saw kills drop double dust", needs: "teeth", icon: "dust" },
    // Motor
    wheels: { branch: "motor", name: "Turbo Wheels", text: "Top speed +15%", needs: null, icon: "wheel" },
    bumper: { branch: "motor", name: "Bumper Car", text: "Ramming at speed hurts monsters", needs: "wheels", locks: "burner", icon: "wheel" },
    burner: { branch: "motor", name: "Quick Charge", text: "Dash charges 45% faster", needs: "wheels", locks: "bumper", icon: "bolt" },
    wrecker: { branch: "motor", name: "Wrecking Ball", text: "Hard bumps blast everything nearby", needs: "bumper", icon: "bolt" },
    twodash: { branch: "motor", name: "Twin Turbine", text: "Dash cooldown gone. Dash ends in a blast", needs: "burner", icon: "bolt" },
    // Bag
    bigbag: { branch: "bag", name: "Big Bag", text: "Bag holds +60 dust", needs: null, icon: "dust" },
    hepa: { branch: "bag", name: "HEPA Heart", text: "+30 max battery. Dust heals double", needs: "bigbag", locks: "suck", icon: "heart" },
    suck: { branch: "bag", name: "Monster Suction", text: "Suction reaches 60% further and drags bunnies in", needs: "bigbag", locks: "hepa", icon: "dust" },
    second: { branch: "bag", name: "Backup Battery", text: "Once per run, reboot at 50% instead of dying", needs: "hepa", icon: "heart" },
    compact: { branch: "bag", name: "Compactor", text: "Weapons use 40% less dust", needs: "suck", icon: "dust" },
    // Tools
    hardware: { branch: "tool", name: "Hardware Store", text: "Weapon damage +25%", needs: null, icon: "nail" },
    overclock: { branch: "tool", name: "Overclock", text: "Fire rate +30%", needs: "hardware", locks: "hotrod", icon: "bolt" },
    hotrod: { branch: "tool", name: "Hot Rod", text: "All shots set monsters on fire", needs: "hardware", locks: "overclock", icon: "flame" },
    ricochet: { branch: "tool", name: "Ricochet", text: "Shots bounce off walls and furniture", needs: "overclock", icon: "nail" },
    arc: { branch: "tool", name: "Static Arc", text: "Kills arc lightning to nearby monsters", needs: "hotrod", icon: "bolt" },
};
export const BRANCHES = {
    saw: { name: "CHAINSAW", color: "#f26a3d" },
    motor: { name: "MOTOR", color: "#f5b82e" },
    bag: { name: "BAG", color: "#37b5a4" },
    tool: { name: "TOOLS", color: "#6a8cff" },
};
export const FILLER = { name: "Fresh Battery", text: "Restore 40 battery", icon: "heart", branch: "bag" };

// Wave scripts. Each beat fires `after` seconds past the previous, or sooner once the room is empty.
// spawn: [kind, count, pattern, extra]. Counts scale with how deep into the house the room falls.
// patterns: door (one door at a time), doors (all), ring (around the player), edges (scattered at the walls).
const b = (after, ...spawn) => ({ after, spawn });
export const WAVES = {
    living: [
        { name: "The Dust Settles", gift: "nail", beats: [b(0.6, ["bunny", 5, "door", 0]), b(6, ["bunny", 7, "door", 1])] },
        { name: "Static in the Air", beats: [b(0.5, ["bunny", 10, "doors"]), b(5, ["puff", 3, "edges"]), b(6, ["bunny", 10, "doors"])] },
        { name: "One Long Sock", cat: "scare", beats: [b(0.5, ["snake", 1, "door", 2, 5]), b(5, ["bunny", 12, "doors"]), b(7, ["snake", 1, "door", 3, 6], ["puff", 2, "edges"])] },
    ],
    kitchen: [
        { name: "Crumb Rush", gift: true, beats: [b(0.5, ["bunny", 16, "door", 0]), b(3, ["bunny", 16, "door", 1]), b(4, ["puff", 4, "doors"])] },
        { name: "Sock Drawer", cat: true, beats: [b(0.5, ["snake", 2, "doors", 0, 6]), b(6, ["bunny", 18, "doors"]), b(6, ["snake", 2, "doors", 0, 7])] },
        { name: "A Hairy Situation", beats: [b(0.5, ["golem", 1, "door", 0]), b(4, ["bunny", 20, "doors"]), b(9, ["golem", 1, "door", 1], ["puff", 4, "edges"])] },
    ],
    bathroom: [
        { name: "Rising Damp", gift: true, beats: [b(0.5, ["bunny", 22, "ring"]), b(5, ["puff", 6, "edges"]), b(5, ["bunny", 18, "ring"])] },
        { name: "Drain Snakes", cat: true, beats: [b(0.5, ["snake", 3, "edges", 0, 5]), b(7, ["snake", 3, "edges", 0, 6], ["bunny", 14, "doors"])] },
        { name: "Bath Mat Colossus", beats: [b(0.5, ["golem", 2, "doors"]), b(8, ["bunny", 26, "doors"]), b(8, ["puff", 6, "ring"])] },
    ],
    laundry: [
        { name: "Spin Cycle", gift: true, beats: [b(0.5, ["snake", 2, "door", 0, 7]), b(4, ["bunny", 24, "doors"]), b(6, ["puff", 5, "ring"])] },
        { name: "Lint Trap", cat: true, beats: [b(0.5, ["bunny", 40, "edges"]), b(6, ["golem", 1, "door", 1]), b(6, ["bunny", 24, "ring"])] },
        { name: "Odd Socks", beats: [b(0.5, ["snake", 5, "doors", 0, 6]), b(9, ["golem", 1, "door", 0], ["snake", 2, "door", 1, 8])] },
    ],
    nursery: [
        { name: "Bedtime Stories", gift: true, beats: [b(0.5, ["bunny", 24, "doors"], ["puff", 4, "edges"]), b(7, ["golem", 1, "door", 0], ["snake", 2, "door", 1, 7])] },
        { name: "DUST STORM", storm: true, cat: true, beats: [b(0.5, ["bunny", 80, "edges"]), b(2, ["bunny", 80, "edges"]), b(5, ["puff", 8, "ring"], ["bunny", 60, "doors"]), b(7, ["golem", 2, "doors"], ["bunny", 40, "edges"])] },
        { name: "THE TINY TYRANT", boss: true, beats: [b(0.4, ["trike", 1, "door", 0])] },
    ],
};

export const ROOM_ORDER = ["living", "kitchen", "bathroom", "laundry", "nursery"];
