// Everything the rules know about: traits, pets, tokens, shops. No drawing here, so bots can import it bare.
export const COLS = 4, ROWS = 2, CELLS = COLS * ROWS;
export const SLOW = 25, NORMAL = 34, FAST = 50;
export const STAT_MUL = [0, 1, 1.9, 3.4];

/** tiers: distinct pets needed. Pets with the same id count once. */
export const TRAITS = {
    suit: { name: "Suits", color: "#3f6fd8", tiers: [2, 4, 6], blurb: "Paperwork", info: (v) => `Every enemy starts with -${v[0]} ATK, and you earn +${v[1]} gold next round.`, vals: [[2, 2], [3, 3], [5, 5]] },
    goth: { name: "Goths", color: "#7a3fc4", tiers: [2, 4, 6], blurb: "Gloom", info: (v) => `When any ally faints, your Goths gain +${v[0]} ATK.`, vals: [[1], [2], [4]] },
    chef: { name: "Chefs", color: "#f28a1e", tiers: [2, 4, 6], blurb: "Snacks", info: (v) => `Each round ${v[0]} random pets gain +${v[1]} ATK and +${v[1]} HP for the whole run.`, vals: [[2, 1], [3, 2], [5, 3]] },
    band: { name: "Band", color: "#ef3f8f", tiers: [2, 4, 6], blurb: "Encore", info: (v) => `Band pets act ${v[0]}% faster.${v[1] ? ` The whole team acts ${v[1]}% faster.` : ""}`, vals: [[30, 0], [55, 0], [90, 20]] },
    hex: { name: "Hexers", color: "#2fb56a", tiers: [2, 4, 6], blurb: "Curses", info: (v) => `Hexer attacks add ${v[0]} Curse. Cursed pets lose that much HP each beat, shields or not.${v[1] ? " Curses jump when a victim faints." : ""}`, vals: [[1, 0], [2, 0], [3, 1]] },
    beef: { name: "Bouncers", color: "#e23d3d", tiers: [2, 4, 6], blurb: "Doormen", info: (v) => `Bouncers start with ${v[0]} shield and return ${v[1]} damage to melee hits.${v[2] ? " Front row Bouncers draw all attacks." : ""}`, vals: [[8, 1, 0], [18, 3, 1], [36, 5, 1]] },
    grem: { name: "Gremlins", color: "#79b92f", tiers: [2, 4, 6], blurb: "Mischief", info: (v) => `Battle start: ${v[0]} enemy pets get shoved somewhere else. Gremlins have a ${v[1]}% chance to hit twice as hard.`, vals: [[1, 25], [2, 40], [4, 60]] },
    diva: { name: "Divas", color: "#e8b21c", tiers: [1, 3, 5], blurb: "Spotlight", info: (v) => `Divas gain ${v[0]}% ATK and HP. Exactly two Divas refuse to share a stage: nothing happens.${v[1] ? ` Every ally gains +${v[1]} ATK.` : ""}`, vals: [[22, 0], [36, 0], [70, 2]] },
    tiny: { name: "Tinies", color: "#d98a2b", tiers: [2, 4, 6], blurb: "Swarm", info: (v) => `When a Tiny faints it leaves ${v[0]} Grub${v[0] > 1 ? "s" : ""} behind. Grubs get +${v[1]} ATK.`, vals: [[2, 1], [3, 2], [4, 3]] },
    wet: { name: "Soggies", color: "#25a9e0", tiers: [2, 4, 6], blurb: "Splash", info: (v) => `Attacks soak the target and splash neighbours for ${v[0]}%. Soaked pets take +${v[1]} damage from every hit.`, vals: [[25, 1], [50, 1], [90, 2]] },
    fluff: { name: "Fluffs", color: "#f06fb0", tiers: [2, 4, 6], blurb: "Cuddles", info: (v) => `Fluffs have ${v[1]}% more HP. Every other beat each heals its most hurt neighbour for ${v[0]}.`, vals: [[4, 25], [8, 50], [15, 80]] },
    zap: { name: "Zappers", color: "#e6c21a", tiers: [2, 4, 6], blurb: "Static", info: (v) => `Attacks arc to ${v[0]} other enemies for ${v[1]}% damage, double on soaked pets.`, vals: [[1, 35], [2, 45], [3, 60]] },
};
export const TRAIT_IDS = Object.keys(TRAITS);

export const TOKENS = {
    grub: { id: "grub", name: "Grub", atk: 2, hp: 5, spd: NORMAL, traits: [] },
    cone: { id: "cone", name: "Traffic Cone", atk: 0, hp: 8, spd: SLOW, traits: [] },
};

const list = [];
/** P(id, name, tier, atk, hp, "traits", ability, flags). flags: r ranged, s speed */
const P = (id, name, tier, atk, hp, traits, ab, o = {}) => list.push({ id, name, tier, atk, hp, traits: traits.split(" "), ab, ranged: !!o.r, spd: o.s ?? NORMAL });
const A = (on, fx, who, n = 1, o = {}) => ({ on, fx, who, n, ...o });

// Tier 1
P("taxham", "Tax Hamster", 1, 2, 7, "suit fluff", A("won", "gold", "self", 1));
P("gothrab", "Goth Rabbit", 1, 3, 5, "goth fluff", A("allyfaint", "atk", "self", 1));
P("suitbee", "Bee in a Tiny Suit", 1, 2, 4, "suit tiny", A("hit", "weaken", "foe", 1), { r: 1 });
P("soupnewt", "Soup Newt", 1, 2, 6, "chef wet", A("round", "permhp", "adj", 1));
P("mothint", "Moth Intern", 1, 1, 6, "suit goth", A("start", "shield", "adj", 2));
P("drumcrab", "Drum Crab", 1, 2, 7, "band wet", A("hit", "haste", "adj", 8));
P("staticat", "Static Cat", 1, 3, 5, "zap fluff", A("start", "dmg", "erand", 2));
P("bogfrog", "Bog Witch Frog", 1, 2, 5, "hex wet", A("start", "curse", "erand", 1), { r: 1 });
P("buffpug", "Bouncer Pug", 1, 2, 9, "beef fluff", A("start", "taunt", "self", 1));
P("cablerat", "Cable Rat", 1, 3, 4, "grem zap", A("kill", "haste", "self", 40), { s: FAST });
P("chickstar", "Understudy Chick", 1, 2, 5, "diva tiny", A("allyfaint", "hp", "self", 2));
P("antcom", "Ant Committee", 1, 1, 6, "tiny suit", A("faint", "summon", "grub", 2));
P("cookbug", "Ladybug Line Cook", 1, 2, 5, "chef tiny", A("round", "permatk", "rand", 1));
P("slugbass", "Slug Bassist", 1, 2, 6, "band goth", A("allyfaint", "haste", "all", 8), { s: SLOW });
P("pigeon", "Cursed Pigeon", 1, 2, 4, "hex grem", A("hit", "curse", "erand", 1), { r: 1 });
P("bathduck", "Bath Duck", 1, 2, 8, "beef tiny", A("hurt", "shield", "self", 1));
P("snailerina", "Prima Snailerina", 1, 1, 10, "diva wet", A("start", "heal", "adj", 2), { s: SLOW });
P("busker", "Hedgehog Busker", 1, 2, 6, "band beef", A("hurt", "dmg", "erand", 1));
// Tier 2
P("owlaudit", "Owl Auditor", 2, 3, 7, "suit hex", A("start", "weaken", "ehigh", 2), { r: 1 });
P("batpoet", "Bat Poet", 2, 3, 7, "goth hex", A("allyfaint", "curse", "eall", 1), { r: 1 });
P("pigchef", "Pig Pastry Chef", 2, 3, 10, "chef fluff", A("round", "permhp", "rand", 2));
P("wiregoat", "Wire Goat", 2, 4, 8, "grem zap", A("hit", "stun", "foe", 1, { every: 3 }));
P("zapsheep", "Static Sheep", 2, 3, 9, "zap fluff", A("hurt", "dmg", "erand", 2));
P("clubturtle", "Club Turtle", 2, 3, 13, "beef fluff", A("start", "shield", "front", 3), { s: SLOW });
P("axotenor", "Axolotl Tenor", 2, 3, 8, "diva wet", A("start", "heal", "all", 1), { r: 1 });
P("octodj", "Octo DJ", 2, 2, 9, "band wet", A("start", "haste", "all", 15), { r: 1 });
P("jellyfuse", "Jelly Fuse", 2, 3, 6, "zap wet", A("faint", "dmg", "eall", 3), { r: 1 });
P("penmaitre", "Penguin Maitre D", 2, 3, 8, "chef suit", A("won", "permatk", "front", 1));
P("foxpick", "Fox Pickpocket", 2, 4, 6, "grem suit", A("kill", "gold", "self", 1), { s: FAST });
P("binraccoon", "Bin Raccoon", 2, 3, 9, "grem chef", A("sold", "permatk", "rand", 2));
P("molemourn", "Mole Mourner", 2, 3, 9, "goth tiny", A("faint", "summon", "grub", 2));
P("aphidnan", "Aphid Nanny", 2, 2, 8, "tiny fluff", A("start", "summon", "grub", 1));
P("spidertail", "Spider Tailor", 2, 3, 6, "hex tiny", A("hit", "curse", "foe", 1), { r: 1 });
P("geckostar", "Gecko Stand-In", 2, 4, 7, "diva grem", A("hurt", "atk", "self", 1), { s: FAST });
// Tier 3
P("llamalaw", "Llama Lawyer", 3, 4, 11, "suit diva", A("start", "weaken", "eall", 1), { r: 1 });
P("slothundt", "Sloth Undertaker", 3, 6, 15, "goth beef", A("allyfaint", "heal", "self", 4), { s: SLOW });
P("caulcat", "Cauldron Cat", 3, 4, 10, "hex chef", A("round", "permatk", "adj", 1), { r: 1 });
P("capyspa", "Capybara Masseur", 3, 3, 15, "fluff wet", A("tick", "heal", "all", 1), { s: SLOW });
P("flamsolo", "Flamingo Soloist", 3, 5, 10, "diva band", A("hit", "haste", "self", 15), { s: FAST });
P("skunkpunk", "Skunk Punk", 3, 4, 11, "band hex", A("hurt", "curse", "eall", 1));
P("otterplumb", "Otter Plumber", 3, 5, 10, "tiny grem", A("start", "soak", "eall", 1), { s: FAST });
P("stagdoor", "Stag Doorman", 3, 5, 15, "beef tiny", A("faint", "summon", "cone", 2));
P("mantisushi", "Mantis Sushi Chef", 3, 6, 8, "chef zap", A("kill", "permatk", "self", 1), { s: FAST });
P("eelfixer", "Eel Electrician", 3, 4, 10, "zap suit", A("hit", "dmg", "erand", 2), { r: 1 });
P("hornetrepo", "Hornet Repo Agent", 3, 5, 9, "tiny suit", A("start", "dmg", "eback", 2), { s: FAST });
P("crowflor", "Crow Florist", 3, 5, 9, "goth grem", A("allyfaint", "dmg", "erand", 3), { r: 1 });
P("ampmouse", "Amp Mouse", 3, 3, 11, "band zap", A("tick", "dmg", "erand", 2));
P("bunnyghost", "Dust Bunny", 3, 4, 9, "fluff goth", A("faint", "heal", "all", 3));
// Tier 4
P("bodybadger", "Bodyguard Badger", 4, 6, 22, "beef suit", A("start", "shield", "all", 3));
P("oilsnake", "Snake Oil Salesman", 4, 5, 14, "hex suit", A("hit", "curse", "elane", 2), { r: 1 });
P("walrusoon", "Walrus Crooner", 4, 6, 19, "band diva", A("tick", "shield", "all", 2));
P("chamtemp", "Chameleon Temp", 4, 7, 13, "grem diva", A("start", "copy", "ehigh", 1), { s: FAST });
P("yakbuffet", "Yak Buffet", 4, 5, 24, "chef beef", A("round", "permhp", "all", 1), { s: SLOW });
P("mantaframe", "Manta Mainframe", 4, 6, 15, "zap wet", A("tick", "dmg", "eall", 2), { r: 1 });
P("pallbear", "Pangolin Pallbearer", 4, 7, 20, "goth beef", A("allyfaint", "shield", "all", 3));
P("hivemgr", "Hive Manager", 4, 5, 15, "tiny chef", A("tick", "summon", "grub", 1), { r: 1 });
P("kiwistunt", "Kiwi Stunt Double", 4, 8, 12, "grem band", A("faint", "dmg", "ehigh", 8), { s: FAST });
P("cumulus", "Cumulus Ram", 4, 6, 19, "fluff zap", A("hurt", "heal", "adj", 2));
P("toadlich", "Toad Lich", 4, 5, 15, "hex goth", A("faint", "curse", "eall", 3), { r: 1 });
// Tier 5
P("ceocto", "Octopus CEO", 5, 7, 24, "suit wet", A("won", "gold", "self", 3), { r: 1 });
P("vampuss", "Vampurress", 5, 10, 22, "goth diva", A("kill", "heal", "self", 10), { s: FAST });
P("whalesous", "Whale Sous Chef", 5, 7, 36, "chef wet", A("round", "permatk", "all", 1), { s: SLOW });
P("alpacavolt", "Thunder Alpaca", 5, 8, 22, "zap band", A("tick", "dmg", "eall", 3), { r: 1 });
P("hamhydra", "Hamster Hydra", 5, 8, 26, "fluff tiny", A("faint", "summon", "grub", 5));
P("rhinobeet", "Rhino Beetle Boss", 5, 9, 34, "beef grem", A("start", "stun", "efront", 1), { s: SLOW });
P("lampqueen", "Lamp Queen", 5, 7, 22, "hex diva", A("tick", "curse", "eall", 1), { r: 1 });

export const PETS = list;
export const PET = Object.fromEntries(list.map((p) => [p.id, p]));
export const isToken = (id) => !!TOKENS[id];

/** Stat for a star level with run bonuses. Integer in every engine. */
export const statOf = (base, star) => Math.round(base * STAT_MUL[star] + 1e-6);
export const abN = (ab, star) => (ab.fx === "summon" ? ab.n + star - 1 : ab.fx === "stun" ? (star >= 3 ? 2 : 1) : ab.fx === "taunt" || ab.fx === "copy" || ab.fx === "soak" ? 1 : ab.n * star);

const WHO = { self: "itself", foe: "the target", adj: "neighbours", front: "the front row", back: "the back row", all: "all allies", rand: "a random ally", erand: "a random enemy", ehigh: "the toughest enemy", elow: "the weakest enemy", eall: "all enemies", efront: "the enemy front row", eback: "the enemy back row", elane: "enemies in its column" };
const ON = { start: "Battle start", hit: "After attacking", hurt: "When hurt", faint: "When it faints", kill: "On a knockout", allyfaint: "When an ally faints", tick: "Every 4 beats", round: "Each round", won: "After a win", sold: "When sold" };
/** Rules text comes from the data, so it can never disagree with what the pet does. */
export function describe(ab, star = 1) {
    const n = abN(ab, star), who = WHO[ab.who] ?? "", on = ab.every ? `Every ${ab.every}rd attack` : ON[ab.on];
    switch (ab.fx) {
        case "gold": return `${on}: +${n} gold.`;
        case "atk": return `${on}: ${who} gains +${n} ATK.`;
        case "hp": return `${on}: ${who} gains +${n} HP.`;
        case "permhp": return `${on}: ${who} gains +${n} HP for the run.`;
        case "permatk": return `${on}: ${who} gains +${n} ATK for the run.`;
        case "weaken": return `${on}: ${who} loses ${n} ATK.`;
        case "shield": return `${on}: ${who} gains ${n} shield.`;
        case "heal": return `${on}: heal ${who} for ${n}.`;
        case "haste": return `${on}: ${who} acts ${n}% sooner.`;
        case "dmg": return `${on}: ${n} damage to ${who}.`;
        case "curse": return `${on}: ${n} Curse on ${who}.`;
        case "stun": return `${on}: stun ${who} for ${n} beat${n > 1 ? "s" : ""}.`;
        case "soak": return `${on}: soak ${who}.`;
        case "taunt": return `${on}: draws all attacks.`;
        case "copy": return `${on}: copies the ATK of ${who}.`;
        case "summon": return `${on}: ${n} ${TOKENS[ab.who].name}${n > 1 ? "s" : ""} appear${n > 1 ? "" : "s"}.`;
    }
    return "";
}

// Shops are the run's rule set. `id` order is the unlock order on the track.
export const SHOPS = [
    { id: "corner", name: "Corner Shop", tag: "The classic.", rule: "Five shelves, no funny business.", color: "#ff7eb6", wall: "#ffd9e8", floor: "#ffb4d2" },
    { id: "bargain", name: "Bargain Bin", tag: "First 2 rolls each round are free.", rule: "Sold pets pay just 1 gold.", color: "#34c7a6", wall: "#d4f5e7", floor: "#a7e8cf", freeRolls: 2, flatSell: 1 },
    { id: "shelter", name: "Rescue Shelter", tag: "Every crate costs 2, and hides its pet.", rule: "1 less gold each round.", color: "#ffa94d", wall: "#ffe6c7", floor: "#ffd09a", blind: true, income: -1 },
    { id: "night", name: "Night Market", tag: "Unspent gold rolls over.", rule: "Only four shelves.", color: "#7b5cff", wall: "#d9d0ff", floor: "#b5a4ff", carry: true, slots: 4 },
    { id: "twins", name: "Twin Hatchery", tag: "Merges need only 2 copies.", rule: "Pen holds 2 fewer pets.", color: "#44b6ff", wall: "#d2eeff", floor: "#a4dcff", need: 2, capMod: -2 },
    { id: "lab", name: "Mutant Lab", tag: "One shelf pet has a bonus trait.", rule: "It costs 2 more. 1 less gold each round.", color: "#a3d62e", wall: "#ecf9c4", floor: "#d2ef8e", mutant: true, income: -1 },
];
export const SHOP = Object.fromEntries(SHOPS.map((s) => [s.id, s]));
