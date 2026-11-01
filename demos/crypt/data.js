// Who's who: the keepers, the locals and the tat.
import { M } from "./sim.js";

export const KEEPERS = [
    { key: "mort", name: "Mort", role: "Crypt Keeper", hearts: 3, ability: "shush", charges: 1, label: "Shush!", desc: "Everything skips two actions. It's a library voice.", need: 0 },
    { key: "dolores", name: "Dolores", role: "Gravedigger", hearts: 4, ability: "dig", charges: 1, label: "Dig", desc: "Dig a pit next to you. Works under monsters.", need: 1, unlock: "Beat the Grand Curator" },
    { key: "rattle", name: "Sir Rattle", role: "Skeleton Butler", hearts: 2, ability: "hop", charges: 2, label: "Hop", desc: "Leap two tiles, over anything at all.", need: 2, unlock: "Beat Lady Lather" },
    { key: "gladys", name: "Gladys", role: "Resident Ghost", hearts: 2, ability: "swap", charges: 2, label: "Possess", desc: "Swap places with the first monster in a line.", need: 3, unlock: "Beat Chef Sizzle" },
];

export const MON_KEY = { [M.GHOUL]: "ghoul", [M.SPITTER]: "spitter", [M.CRAB]: "crab", [M.MIRROR]: "mirror", [M.BULL]: "bull", [M.IMP]: "imp", [M.HORSE]: "horse", [M.PHANTOM]: "phantom", [M.CURATOR]: "curator", [M.LATHER]: "lather", [M.CHEF]: "chef", [M.LANDLORD]: "landlord", [M.MONDAY]: "monday" };

/** One rule each. The death card quotes these back at you. */
export const MON_INFO = {
    ghoul: { name: "Tour Guide", rule: "Steps towards you. Bites anything next to it." },
    spitter: { name: "Gargoyle", rule: "Spits down its lane every other turn. Hits monsters too." },
    crab: { name: "Spa Crab", rule: "Only moves and pinches diagonally." },
    mirror: { name: "Vanity", rule: "Steps the opposite way to you. Bites if you meet." },
    bull: { name: "Pool Bull", rule: "Sees you, lowers its head, then charges that way next turn." },
    imp: { name: "Fuse Imp", rule: "Walks up, lights its fuse, and blows 3x3 next turn." },
    horse: { name: "Nightmare", rule: "Leaps in an L, like the chess piece. Bites where it can land." },
    phantom: { name: "Room Service", rule: "Moves every second turn, straight through walls." },
    curator: { name: "The Grand Curator", rule: "Steps towards you. Shove him onto raised spikes, three times." },
    lather: { name: "Lady Lather", rule: "Charges where you stood. Dodge, and let her break the pillars." },
    chef: { name: "Chef Sizzle", rule: "Lobs kegs at you. Shove them back, they roll and blow." },
    landlord: { name: "The Landlord", rule: "Moves opposite to you. Slam a door on him: step off the plate." },
    monday: { name: "MONDAY", rule: "Its hands sweep clockwise. Reach each snooze button to survive." },
};

export const CAUSE = { spike: { name: "A Spike Trap", rule: "Glowing tips rise next turn. Stand elsewhere." }, boom: { name: "A Keg", rule: "Blasts cover three by three. Stand further back." } };

export const RELICS = {
    sunhat: { name: "Sun Hat", desc: "+1 max heart, and heals 1.", price: 17, base: true },
    sunscreen: { name: "Factor 50", desc: "Ignore the first hit on every floor.", price: 22, base: true },
    sandals: { name: "Sturdy Sandals", desc: "Spikes never hurt you.", price: 11, base: true },
    snowglobe: { name: "Snow Globe", desc: "Monsters stay dazed a turn longer after a slam.", price: 13, base: true },
    insurance: { name: "Travel Insurance", desc: "+1 undo on every floor.", price: 17, base: true },
    phrasebook: { name: "Phrasebook", desc: "+1 ability charge on every floor.", price: 18, base: true },
    bumbag: { name: "Bumbag", desc: "Carry one more postcard, and get one now.", price: 13, base: true },
    detector: { name: "Metal Detector", desc: "Coins on the floor are worth double.", price: 10, base: true },
    thermos: { name: "Flask of Tea", desc: "Heal 1 after every boss.", price: 11, stamps: 6 },
    cushion: { name: "Whoopee Cushion", desc: "When hit, shove everything next to you.", price: 14, stamps: 12 },
    spoon: { name: "Souvenir Spoon", desc: "Slamming a dazed monster destroys it.", price: 20, stamps: 20 },
    dominoes: { name: "Dominoes", desc: "Bonks blow up three by three. You're fine.", price: 17, stamps: 30 },
    guidebook: { name: "Guidebook", desc: "Once a floor, shows the next flawless move.", price: 18, stamps: 40 },
};

export const CARDS = {
    p_blast: { what: "blast", dir: false, name: "Having A Blast", desc: "Explode everything around you. Not you." },
    p_frost: { what: "frost", dir: false, name: "Lovely Weather", desc: "All monsters are dazed for two turns." },
    p_crate: { what: "crate", dir: true, name: "Lost Luggage", desc: "Drop a suitcase next to you. Fills pits." },
    p_swap: { what: "swap", dir: true, name: "Wish You Were Here", desc: "Swap with the first monster in a line." },
    p_leap: { what: "leap", dir: true, name: "Gone Fishing", desc: "Leap three tiles over anything." },
    p_pit: { what: "dig", dir: true, name: "Greetings From Below", desc: "Open a pit next to you, even under a monster." },
};
export const CARD_PRICE = 7, TEA_PRICE = 6;
export const ABILITY_DIR = { shush: false, dig: true, hop: true, swap: true };

export function makeCtx(run) {
    const has = (k) => run.relics.includes(k);
    return { stunBonus: has("snowglobe") ? 1 : 0, slamKills: has("spoon"), noSpikes: has("sandals"), cushion: has("cushion"), dominoes: has("dominoes") };
}
