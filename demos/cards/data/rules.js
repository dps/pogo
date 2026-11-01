// Elements, keywords and the reaction table: the heart of Hex & Cards.
// A reaction fires when an ingredient lands to the RIGHT of another, so order matters:
// Ember then Brine is Steam, Brine then Ember is Quench.
export const ELEMENTS = {
    ember: { name: "Ember", color: "#ff7a2f", dark: "#a32a12", light: "#ffd27a" },
    brine: { name: "Brine", color: "#2fb6e8", dark: "#124f8f", light: "#b5f0ff" },
    moss: { name: "Moss", color: "#6fce46", dark: "#23703a", light: "#d9f79a" },
    rime: { name: "Rime", color: "#a9dcf5", dark: "#4a7fb8", light: "#f2fcff" },
    hex: { name: "Hex", color: "#b45cff", dark: "#4c1c93", light: "#eec3ff" },
    gilt: { name: "Gilt", color: "#f7c33c", dark: "#a4661a", light: "#fff2b0" },
    gunk: { name: "Gunk", color: "#7c7a52", dark: "#3b3a29", light: "#b5b283" },
};
export const ELS = ["ember", "brine", "moss", "rime", "hex", "gilt"];

// Words that are tappable wherever they appear in card text.
export const KEYWORDS = {
    Ward: { color: "#8fd6ff", text: "Blocks damage. Melts away at the start of your next turn." },
    Burn: { color: "#ff9a4a", text: "Deals its number as damage on the enemy's turn, then drops by 1." },
    Chill: { color: "#bfeaff", text: "A Chilled foe deals 25% less damage. Lasts that many turns." },
    Hex: { color: "#d08bff", text: "A Hexed foe takes 50% more damage. Lasts that many turns." },
    Doom: { color: "#ff6b9a", text: "Stacks. When a foe's HP falls to its Doom or lower, it dies. Bosses count Doom at half." },
    Potency: { color: "#ffe066", text: "Multiplies every number in this brew from now on. Starts at ×1 each brew." },
    Reflux: { color: "#7ef0c8", text: "Boils the previous ingredients again, reactions and all." },
    Instant: { color: "#ffd9a0", text: "Takes effect the moment it lands. Uses no space in the pot." },
    Keep: { color: "#c9f7a5", text: "Stays in your hand at the end of the turn." },
    "Boil Away": { color: "#ffb3a0", text: "Gone for the rest of this fight once used." },
    Light: { color: "#fff0c0", text: "Floats. Takes up no space in the pot." },
    Steam: { color: "#e6f6ff", text: "The next ingredient counts double. Made by Ember, then Brine." },
    Heat: { color: "#ffb04a", text: "Pays for ingredients. Refills at the start of your turn." },
    Gunk: { color: "#b5b283", text: "Useless sludge. It fills a space and breaks reactions." },
    First: { color: "#ffe9b8", text: "Only when this is the first ingredient in the brew." },
    Last: { color: "#ffe9b8", text: "Only when this is the last ingredient in the brew." },
    Simmer: { color: "#ffc27a", text: "Two ingredients of one element in a row add +0.5 Potency." },
};

// sign "A>B": A is on the left, B lands on its right. fx runs as B is about to fire.
const rx = (name, text, fx, color) => ({ name, text, fx, color });
export const REACTIONS = {
    // Same element: the Simmer family.
    "ember>ember": rx("Flare-up", "+0.5 Potency. Burn 1.", (x) => { x.pot(0.5); x.burn(1); }, "#ffb04a"),
    "brine>brine": rx("Undertow", "+0.5 Potency. Ward 2.", (x) => { x.pot(0.5); x.ward(2); }, "#58d0ff"),
    "moss>moss": rx("Overgrowth", "+0.5 Potency. Heal 1.", (x) => { x.pot(0.5); x.heal(1); }, "#9fe66f"),
    "rime>rime": rx("Permafrost", "+0.5 Potency. Chill 1.", (x) => { x.pot(0.5); x.chill(1); }, "#d4f2ff"),
    "hex>hex": rx("Coven", "+0.5 Potency. Hex 1.", (x) => { x.pot(0.5); x.hex(1); }, "#c88bff"),
    "gilt>gilt": rx("Alloy", "+0.5 Potency. 2 gold.", (x) => { x.pot(0.5); x.gold(2); }, "#ffe066"),
    // Ember first.
    "ember>brine": rx("Steam", "Next ingredient ×2.", (x) => x.nextMul(2), "#e8f6ff"),
    "ember>moss": rx("Smoke", "Burn ALL 2.", (x) => x.burnAll(2), "#9b8f8a"),
    "ember>rime": rx("Thermal Crack", "Strip Ward. Deal 5.", (x) => { x.strip(); x.dmg(5); }, "#ffd9c0"),
    "ember>hex": rx("Hellfire", "Deal 3 to ALL. Hex 1.", (x) => { x.aoe(3); x.hex(1); }, "#ff5ca8"),
    "ember>gilt": rx("Forge", "+1 Potency.", (x) => x.pot(1), "#ffb347"),
    // Brine first.
    "brine>ember": rx("Quench", "Ward 5.", (x) => x.ward(5), "#7ad1ff"),
    "brine>moss": rx("Bloom", "Heal 2.", (x) => x.heal(2), "#a8f08a"),
    "brine>rime": rx("Freeze", "Chill 2.", (x) => x.chill(2), "#c6ecff"),
    "brine>hex": rx("Black Tide", "Doom 5.", (x) => x.doom(5), "#7a5cff"),
    "brine>gilt": rx("Liquid Silver", "Next ingredient ×1.5. 2 gold.", (x) => { x.nextMul(1.5); x.gold(2); }, "#d6e2f0"),
    // Moss first.
    "moss>ember": rx("Kindling", "This Ember fires twice.", (x) => x.twice(), "#ffa040"),
    "moss>brine": rx("Steep", "Next ingredient ×1.5. Ward 2.", (x) => { x.nextMul(1.5); x.ward(2); }, "#7fd8a8"),
    "moss>rime": rx("Frostbite", "Burn 4.", (x) => x.burn(4), "#b8f0d8"),
    "moss>hex": rx("Mandrake", "Doom 6.", (x) => x.doom(6), "#a06be0"),
    "moss>gilt": rx("Gilded Lily", "+0.5 Potency, and +0.5 to your next brew.", (x) => { x.pot(0.5); x.seedPot(0.5); }, "#e8e070"),
    // Rime first.
    "rime>ember": rx("Meltwater", "+1 Heat next turn.", (x) => x.heatNext(1), "#a0dcff"),
    "rime>brine": rx("Slush", "Ward 3. Draw 1 next turn.", (x) => { x.ward(3); x.drawNext(1); }, "#bfe6f7"),
    "rime>moss": rx("Hoarfrost", "Ward 4. Heal 1.", (x) => { x.ward(4); x.heal(1); }, "#d0f7e0"),
    "rime>hex": rx("Wraithglass", "Next ingredient ×2.", (x) => x.nextMul(2), "#d7b8ff"),
    "rime>gilt": rx("Diamond Dust", "Deal 8.", (x) => x.dmg(8), "#fff6d0"),
    // Hex first.
    "hex>ember": rx("Black Flame", "Next ingredient ×1.5. Burn 2.", (x) => { x.nextMul(1.5); x.burn(2); }, "#c04aff"),
    "hex>brine": rx("Cursed Well", "Hex ALL 1.", (x) => x.hexAll(1), "#6a78ff"),
    "hex>moss": rx("Rot", "Double the target's Doom.", (x) => x.doubleDoom(), "#8fb04a"),
    "hex>rime": rx("Cold Curse", "Chill ALL 1. Hex ALL 1.", (x) => { x.chillAll(1); x.hexAll(1); }, "#a8a8ff"),
    "hex>gilt": rx("Transmute", "Reflux 3.", (x) => x.reflux(3), "#ffe080"),
    // Gilt first.
    "gilt>ember": rx("Molten", "Deal 2 per ingredient fired this brew.", (x) => x.dmg(2 * Math.max(1, x.fires)), "#ff9a2f"),
    "gilt>brine": rx("Quicksilver", "Reflux 1.", (x) => x.reflux(1), "#cfe8ff"),
    "gilt>moss": rx("Golden Apple", "Heal 2. 2 gold.", (x) => { x.heal(2); x.gold(2); }, "#d8e860"),
    "gilt>rime": rx("Silver Shiver", "Ward 4. Chill 1.", (x) => { x.ward(4); x.chill(1); }, "#e2eef8"),
    "gilt>hex": rx("Philosopher's Salt", "+1 Potency.", (x) => x.pot(1), "#ffd27a"),
};

export const WITCHES = {
    posy: {
        id: "posy", name: "Posy Cinderwick", title: "the Scorched Apprentice", hp: 72, gold: 80, color: "#ff7a2f", els: ["ember", "brine", "gilt"],
        power: "Flare", powerText: "Every 3rd Ember fired sets off a Flare: +1 Potency for the rest of the brew, Ward 5, and Burn ALL 2.",
        blurb: "Sets fire to things. Occasionally on purpose.",
        deck: ["spark", "spark", "spark", "spark", "droplet", "droplet", "droplet", "firecorn", "dewsalt", "bellows"],
    },
    thistle: {
        id: "thistle", name: "Nan Thistle", title: "the Slow Cooker", hp: 66, gold: 60, color: "#6fce46", els: ["moss", "rime", "hex"],
        power: "Old Stock", powerText: "The last ingredient of each brew stays in the pot, costs nothing, and comes back 25% stronger each turn it stews, up to double.",
        blurb: "Ninety-one years old. Has outlived four kings and most of her recipes.",
        deck: ["nettle", "nettle", "nettle", "nettle", "hoar", "hoar", "hoar", "barkskin", "toadcap", "mandrakelet"],
    },
    vesper: {
        id: "vesper", name: "Vesper Quill", title: "the Circular Argument", hp: 60, gold: 100, color: "#b45cff", els: ["hex", "gilt", "brine"],
        power: "The Ring", powerText: "Her pot is a ring: after the last ingredient, the first fires again, reacting with the last.",
        blurb: "Expelled from academy for proving a spell by assuming the spell.",
        deck: ["blackpin", "blackpin", "blackpin", "giltflake", "giltflake", "giltflake", "droplet", "droplet", "omen", "pawnedcoin"],
    },
};

export const RANKS = [
    { need: 0, text: "Elevenses at the bottom of the tower." },
    { need: 1, text: "Stones in pockets: elites hit harder." },
    { need: 2, text: "Thin soup: heal less at the fire." },
    { need: 3, text: "Inflation: shops charge a quarter more." },
    { need: 4, text: "Sharper teeth: all foes have more HP." },
    { need: 5, text: "Stingy spirits: less gold from fights." },
    { need: 6, text: "Heavy lid: you start with a Gunk in your deck." },
    { need: 7, text: "Mean streak: all foes hit harder." },
    { need: 8, text: "Bosses have had a good breakfast." },
    { need: 9, text: "A pact: you start with less HP." },
    { need: 10, text: "The Long Night: elites everywhere, no mercy." },
];
