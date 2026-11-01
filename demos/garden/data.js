// Everything that is a number or a name lives here: defenders, pests, seasons, levels, the Almanac.

export const COLS = 9, ROWS = 12;

// ---- Defenders ---------------------------------------------------------------------------------------------
// A defender's stats are its base stats overlaid with each upgrade it has bought. Upgrades: a[0] then a[1], or b[0] then b[1].
export const DEFS = {
    gnome: {
        name: "Gnome Flinger", short: "Gnome", cost: 50, unlock: 1, kind: "lob", tint: "#c8553d",
        range: 2.7, rate: 1.0, dmg: 11, splash: 0, ground: true, air: false,
        blurb: "Catapults small, furious gnomes at anything on the ground.",
        a: [
            { name: "Hefty Gnomes", cost: 70, desc: "Heavy hits crack shells and splash.", dmg: 26, rate: 1.3, splash: 0.8 },
            { name: "Garth the Anvil", cost: 170, desc: "Huge blast that stuns the lot.", dmg: 74, rate: 1.5, splash: 1.2, stunT: 0.6 },
        ],
        b: [
            { name: "Pebble Patter", cost: 60, desc: "Rapid pebbles. Weak against armour.", dmg: 6, rate: 0.36, range: 3.0, pebble: true },
            { name: "Gnome Gatling", cost: 150, desc: "A blur of pebbles. Hits flyers too.", dmg: 8, rate: 0.16, range: 3.3, pebble: true, air: true },
        ],
    },
    bramble: {
        name: "Bramble", short: "Bramble", cost: 15, unlock: 2, kind: "thorn", tint: "#7c4a6a",
        range: 1.1, rate: 0.5, dmg: 3, ground: true, air: false, plant: true,
        blurb: "A cheap thorny wall. Plant it to bend the pests' route.",
        a: [
            { name: "Rambling Rose", cost: 30, desc: "Sharper thorns that also snag.", dmg: 8, snare: 0.8 },
            { name: "Briar Patch", cost: 90, desc: "Wide, wicked and very slow going.", dmg: 22, snare: 0.6, range: 1.6 },
        ],
        b: [
            { name: "Trellis", cost: 40, desc: "Neighbours climb it: +0.5 range.", reach: 0.5 },
            { name: "Bean Arch", cost: 100, desc: "Neighbours gain +1 range.", reach: 1.0 },
        ],
    },
    hive: {
        name: "Bee Hive", short: "Hive", cost: 70, unlock: 3, kind: "hive", tint: "#e0a72e",
        range: 3.2, rate: 0.6, dmg: 3, bees: 2, ground: true, air: true, pierce: true,
        blurb: "Bees hunt pests on land and in the air. Stings ignore armour.",
        a: [
            { name: "Honey Pots", cost: 70, desc: "+10p each wave. Stung pests get sticky.", income: 10, honey: 0.75 },
            { name: "Royal Jelly", cost: 170, desc: "+25p each wave, and very sticky bees.", income: 25, honey: 0.6, bees: 3 },
        ],
        b: [
            { name: "Angry Swarm", cost: 80, desc: "Four cross bees.", bees: 4, dmg: 4 },
            { name: "Queen's Guard", cost: 190, desc: "Seven bees. Stings swell: pests take more.", bees: 7, dmg: 6, swell: true },
        ],
    },
    sprinkler: {
        name: "Sprinkler", short: "Sprinkler", cost: 60, unlock: 4, kind: "water", tint: "#4f9fc4",
        range: 1.7, rate: 0.5, wetT: 2.2, slip: 0.7, ground: true, air: false,
        blurb: "Wet ground is slippery. Snails unshell. Hidden pests show. Plants perk up.",
        a: [
            { name: "Power Hose", cost: 70, desc: "A jet that shoves pests back.", range: 2.6, push: 0.32 },
            { name: "Fire-Brigade Hose", cost: 170, desc: "Bigger shove, and it stings.", range: 3.0, push: 0.6, dmg: 6 },
        ],
        b: [
            { name: "Soaker Head", cost: 60, desc: "Wider, wetter, slower going.", range: 2.3, wetT: 4, slip: 0.55 },
            { name: "Mudslide", cost: 150, desc: "Pests topple over in the slop.", range: 2.9, wetT: 6, slip: 0.45, topple: true },
        ],
    },
    box: {
        name: "Honesty Box", short: "Honesty", cost: 60, unlock: 5, kind: "box", tint: "#b98a4e",
        range: 0, rate: 1, income: 14, ground: false, air: false,
        blurb: "Pays 14p every wave. Early waves pay sooner, if you dare.",
        a: [
            { name: "Village Fete", cost: 90, desc: "Pays 36p every wave.", income: 36 },
            { name: "County Show", cost: 210, desc: "Pays 80p every wave.", income: 80 },
        ],
        b: [
            { name: "Jam Stall", cost: 70, desc: "20p a wave, and tips for nearby kills.", income: 20, range: 2.5, tip: 0.5 },
            { name: "Farm Shop", cost: 170, desc: "32p a wave, and big tips nearby.", income: 32, range: 3, tip: 1.2 },
        ],
    },
    flytrap: {
        name: "Venus Flytrap", short: "Flytrap", cost: 90, unlock: 6, kind: "chomp", tint: "#8bb33f",
        range: 1.4, rate: 5.5, dmg: 130, bites: 1, ground: true, air: true, plant: true,
        blurb: "Swallows a pest whole, then needs a long think about it.",
        a: [
            { name: "Twin Jaws", cost: 90, desc: "Two heads, two pests.", bites: 2, rate: 4.5 },
            { name: "Hydra Trap", cost: 210, desc: "Four heads, and faster digestion.", bites: 4, rate: 3.5, dmg: 200 },
        ],
        b: [
            { name: "Gourmand", cost: 80, desc: "Bigger meals. +3p per chomp.", dmg: 280, pay: 3 },
            { name: "Glutton", cost: 200, desc: "Eats almost anything. +8p per chomp.", dmg: 640, pay: 8, rate: 5 },
        ],
    },
    compost: {
        name: "Compost Heap", short: "Compost", cost: 80, unlock: 7, kind: "aura", tint: "#6d4c33",
        range: 1.5, rate: 1, buffDmg: 0.25, buffRate: 0.12, warm: 1.5, ground: false, air: false,
        blurb: "Neighbours hit harder and stay warm. Nearby kills feed the heap.",
        a: [
            { name: "Hot Heap", cost: 90, desc: "A much stronger boost, and warmth.", buffDmg: 0.4, buffRate: 0.2, warm: 2.5 },
            { name: "Steaming Heap", cost: 210, desc: "Boosts everything two cells out.", buffDmg: 0.6, buffRate: 0.3, warm: 3.5, range: 2.5 },
        ],
        b: [
            { name: "Worm Farm", cost: 80, desc: "+12p a wave. Worms drag moles up.", income: 12, worm: 2.5 },
            { name: "Worm Empire", cost: 180, desc: "+28p a wave. Worms reach far.", income: 28, worm: 4.2 },
        ],
    },
    scarecrow: {
        name: "Scarecrow", short: "Scarecrow", cost: 70, unlock: 8, kind: "taunt", tint: "#d9b44a",
        range: 2.1, rate: 1, hp: 160, tauntN: 7, ground: true, air: true,
        blurb: "Pests stop to chew him. He mends between waves.",
        a: [
            { name: "Stuffed Straw", cost: 60, desc: "Tough, and pokes back.", hp: 420, thorn: 7 },
            { name: "Hay Titan", cost: 160, desc: "Huge. Even bosses stop to look.", hp: 1000, thorn: 16, tauntN: 14, range: 2.7, bossTaunt: true },
        ],
        b: [
            { name: "Turnip Head", cost: 70, desc: "A ghastly face. Pests flee in terror.", fear: 1.8, rate: 7 },
            { name: "Harvest Horror", cost: 170, desc: "Longer terror, and crows peck.", fear: 3, rate: 6, crow: 14 },
        ],
    },
    chime: {
        name: "Wind Chime", short: "Chime", cost: 70, unlock: 9, kind: "chime", tint: "#7ea6b5",
        range: 2.5, rate: 2, slow: 0.7, slowT: 2.3, ground: true, air: true,
        blurb: "Each note slows everything nearby, flyers included.",
        a: [
            { name: "Deep Bells", cost: 70, desc: "Stronger slow and a little stun.", slow: 0.5, stunT: 0.3 },
            { name: "Church Bell", cost: 170, desc: "Stuns, and shakes moles up.", slow: 0.4, stunT: 0.8, range: 3, dig: true },
        ],
        b: [
            { name: "Gale Chimes", cost: 70, desc: "Blows flyers back, and buffets.", gust: 1.2, dmg: 8 },
            { name: "Whirlwind", cost: 170, desc: "Bigger gusts shove ground pests.", gust: 2.1, dmg: 20, shove: 0.6 },
        ],
    },
    chilli: {
        name: "Chilli Bush", short: "Chilli", cost: 100, unlock: 10, kind: "spit", tint: "#d8432f",
        range: 2.7, rate: 1.2, dmg: 6, burn: 9, burnT: 3, ground: true, air: true, plant: true,
        blurb: "Sets pests alight, armour or not. Water puts them out!",
        a: [
            { name: "Scotch Bonnet", cost: 90, desc: "A far nastier burn.", burn: 18 },
            { name: "Ghost Pepper", cost: 210, desc: "Burning pests set off their friends.", burn: 32, burnT: 4, spread: true },
        ],
        b: [
            { name: "Pepper Spray", cost: 90, desc: "A steady cone of fire.", cone: true, rate: 0.25, dmg: 3, burn: 6, burnT: 1.5, range: 2.3 },
            { name: "Dragon's Breath", cost: 210, desc: "A roaring cone of fire.", cone: true, rate: 0.12, dmg: 5, burn: 11, burnT: 1.5, range: 2.9 },
        ],
    },
    lantern: {
        name: "Glow Lantern", short: "Lantern", cost: 60, unlock: 11, kind: "light", tint: "#f0c35a",
        range: 3, rate: 1, reveal: true, ground: true, air: true,
        blurb: "Shows hidden pests so everyone else can hit them.",
        a: [
            { name: "Glow Worms", cost: 50, desc: "Longer reach. Lit pests take +25%.", range: 4.2, mark: 0.25 },
            { name: "Moth Lamp", cost: 140, desc: "Lit pests take +40%. Flyers dawdle.", range: 5, mark: 0.4, lure: 0.7 },
        ],
        b: [
            { name: "Burning Glass", cost: 90, desc: "A beam that heats up on one pest.", beam: 45, range: 3 },
            { name: "Sun Lens", cost: 200, desc: "A beam that melts anything.", beam: 130, range: 3.7 },
        ],
    },
    wine: {
        name: "Elderberry Saucer", short: "Saucer", cost: 40, unlock: 12, kind: "wine", tint: "#6e3a78",
        range: 1.25, rate: 0.5, sips: 12, tipsyT: 3, ground: true, air: false, walk: true,
        blurb: "Goes on open ground. Pests sip, wobble and wander off. Refills each wave.",
        a: [
            { name: "Rhubarb Hooch", cost: 50, desc: "Poison in every sip.", poison: 10, sips: 18 },
            { name: "Moonshine", cost: 130, desc: "Deadlier, and it blows up when empty.", poison: 24, sips: 28, blast: 130 },
        ],
        b: [
            { name: "Sloe Sleep", cost: 60, desc: "Pests nod off where they stand.", sleepT: 2.5, tipsyT: 0, sips: 14 },
            { name: "Nightcap", cost: 140, desc: "A long, wide, heavy sleep.", sleepT: 4.5, tipsyT: 0, sips: 20, range: 1.7 },
        ],
    },
};
export const DEF_ORDER = ["gnome", "bramble", "hive", "sprinkler", "box", "flytrap", "compost", "scarecrow", "chime", "chilli", "lantern", "wine"];

// ---- Pests -------------------------------------------------------------------------------------------------
export const PESTS = {
    slug: { name: "Slug", hp: 30, speed: 0.72, bounty: 2.4, bites: 1, threat: 2, size: 0.56, sprite: "slug", tip: "Slugs. Slow, damp, and very hungry." },
    baby: { name: "Baby Slug", hp: 11, speed: 0.95, bounty: 0.6, bites: 0.4, threat: 0.8, size: 0.4, sprite: "baby" },
    ant: { name: "Ant", hp: 5, speed: 1.15, bounty: 0.45, bites: 0.25, threat: 0.45, size: 0.28, sprite: "ant", tip: "Ants come in hundreds. Splash them!" },
    earwig: { name: "Earwig", hp: 24, speed: 1.75, bounty: 2.4, bites: 1, threat: 3, size: 0.46, sprite: "earwig", tip: "Earwigs! Quick little beggars." },
    snail: { name: "Armoured Snail", hp: 80, speed: 0.48, bounty: 6, bites: 2, threat: 7, size: 0.72, sprite: "snail", armor: 7, tip: "Snails shrug off small hits. Wet ground brings them out of their shells." },
    aphid: { name: "Aphid", hp: 8, speed: 1.0, bounty: 0.7, bites: 0.3, threat: 0.7, size: 0.3, sprite: "aphid", fly: true, tip: "Aphids fly right over your maze. Bees love a chase." },
    wasp: { name: "Wasp", hp: 42, speed: 1.3, bounty: 4, bites: 1, threat: 5, size: 0.5, sprite: "wasp", fly: true, stings: true, tip: "Wasps sting defenders and knock them out for a moment." },
    mole: { name: "Mole", hp: 76, speed: 0.95, bounty: 6, bites: 2, threat: 7, size: 0.66, sprite: "mole", burrow: true, tip: "Moles dig straight under everything. Hit them when they pop up, or flood the tunnel." },
    beetle: { name: "Shield Beetle", hp: 120, speed: 0.58, bounty: 7, bites: 2, threat: 9, size: 0.68, sprite: "beetle", shield: true, tip: "Shield Beetles block anything from the front. Plant defenders behind the bends." },
    broody: { name: "Broody Slug", hp: 210, speed: 0.42, bounty: 12, bites: 3, threat: 16, size: 0.86, sprite: "broody", spawner: true, tip: "Broody Slugs lay eggs as they go. Pop the eggs quick." },
    egg: { name: "Slug Egg", hp: 14, speed: 0, bounty: 0.5, bites: 0, threat: 1, size: 0.34, sprite: "egg", egg: true },
    cater: { name: "Sneaky Caterpillar", hp: 64, speed: 0.92, bounty: 5, bites: 2, threat: 6, size: 0.6, sprite: "cater", stealth: true, tip: "Caterpillars are invisible to defenders until lit or soaked." },
    louse: { name: "Woodlouse", hp: 52, speed: 0.8, bounty: 4, bites: 1, threat: 4.5, size: 0.5, sprite: "louse", roller: true, tip: "Woodlice curl up and roll away from the first hit." },
    frost: { name: "Frost Slug", hp: 90, speed: 0.6, bounty: 6, bites: 2, threat: 7, size: 0.66, sprite: "frost", chills: true, tip: "Frost Slugs freeze defenders they crawl past. Keep a heap warm." },
};

export const BOSSES = {
    bertha: { name: "Big Bertha", title: "Queen of the Slime", hp: 900, speed: 0.32, bounty: 60, bites: 8, size: 2.1, sprite: "bertha", boss: true, trail: true, burp: true, tip: "That's Big Bertha! Mind her slime." },
    shelly: { name: "Sir Shellington", title: "The Armoured Knight", hp: 2200, speed: 0.26, bounty: 90, bites: 10, size: 2.1, sprite: "shelly", boss: true, armor: 11, shellup: true, tip: "Sir Shellington! Wet him down, or hit him hard." },
    digger: { name: "Old Digger", title: "King Under the Lawn", hp: 3000, speed: 0.42, bounty: 120, bites: 10, size: 2.1, sprite: "digger", boss: true, burrow: true, quake: true, tip: "Old Digger shakes your plants when he pops up!" },
    lady: { name: "Lady Greenfly", title: "Mother of Millions", hp: 3800, speed: 0.34, bounty: 140, bites: 12, size: 2.1, sprite: "lady", boss: true, fly: true, brood: true, tip: "Lady Greenfly! You need bees in the air." },
    gloop: { name: "Old Mother Gloop", title: "Slime of the Long Winter", hp: 9000, speed: 0.24, bounty: 300, bites: 20, size: 2.6, sprite: "gloop", boss: true, trail: true, burp: true, freeze: true, split: true, armor: 4, tip: "Old Mother Gloop. This is the one, dear." },
};
export const ALL_PESTS = { ...PESTS, ...BOSSES };

// ---- Seasons -----------------------------------------------------------------------------------------------
export const SEASONS = {
    spring: { name: "Spring", weather: "Showers", desc: "Showers soak the whole garden.", lead: "Rain", grass: ["#7fae55", "#93be63", "#6b9a49"], sky: ["#cfe6e9", "#f0e9cf"], song: "spring" },
    summer: { name: "Summer", weather: "Heatwave", desc: "Scorchers wilt thirsty plants and fire up chilli.", lead: "Scorcher", grass: ["#a3b254", "#b5c068", "#8d9d45"], sky: ["#a8d7ea", "#fbeec2"], song: "summer" },
    autumn: { name: "Autumn", weather: "Gales", desc: "Gales shove flyers and drop leaves that burn.", lead: "Gale", grass: ["#8d9a4c", "#a0a958", "#77863f"], sky: ["#e6c9a3", "#f3e0bf"], song: "autumn" },
    winter: { name: "Winter", weather: "Hard Frost", desc: "Cold slows plants, hives sleep and wet turns to ice.", lead: "Blizzard", grass: ["#dfe8ea", "#eef3f3", "#c9d7dd"], sky: ["#b9cbd9", "#e8eef0"], song: "winter" },
};

// ---- Maps. r=0 is beside the cottage. --------------------------------------------------------------------------
// G goal, S gate, . lawn, , flagstones (walkable, no planting), * rich soil (+20% to whatever grows there)
// Blocked: h hedge, b flower bed, o rock, ~ pond, T tree, p pots, B bird bath, w barrow
const M = (s) => s.trim().split(/\s+/);

export const LEVELS = [
    { name: "The Front Lawn", season: "spring", start: 110, waves: 5, ramp: [6, 1.3], mix: { slug: 1 }, map: M(`
        bbb.G.bbb
        .........
        .........
        ..T...o..
        .........
        ....*....
        ..o...T..
        .........
        .........
        .........
        hh.....hh
        hhh.S.hhh`) },
    { name: "Rhubarb Row", season: "spring", start: 130, waves: 6, ramp: [8, 1.3], mix: { slug: 1, ant: 0.7 }, map: M(`
        bbb.G.bbb
        .........
        .bbbb....
        .........
        ....bbbb.
        ..*......
        .bbbb....
        .........
        .........
        ....o..*.
        .........
        hhh.S.hhh`) },
    { name: "Two Gates", season: "spring", start: 160, waves: 7, ramp: [8, 1.25], mix: { slug: 1, ant: 0.6, aphid: 0.7 }, map: M(`
        bb..G..bb
        .........
        ...o.....
        .....*...
        ..T...T..
        .........
        .........
        .o.....o.
        .........
        .........
        .........
        hS.hhh.Sh`) },
    { name: "Bertha's Bed", season: "spring", start: 200, waves: 7, ramp: [9, 1.25], mix: { slug: 1, ant: 0.6, aphid: 0.6, snail: 0.5 }, force: { 7: [["bertha", 1]] }, map: M(`
        bbb.G.bbb
        .........
        ..~~.....
        ..~~...o.
        ...*.....
        ....T....
        .........
        .o....~~.
        ......~~.
        .........
        .........
        hhh.S.hhh`) },
    { name: "The Vegetable Rows", season: "spring", start: 220, waves: 8, ramp: [11, 1.27], mix: { slug: 1, ant: 0.7, snail: 0.5, earwig: 0.7, aphid: 0.4 }, map: M(`
        bb..G..bb
        .........
        .b.b.b.b.
        .b.b.b.b.
        .b.b.b.b.
        .........
        ....*....
        .b.b.b.b.
        .b.b.b.b.
        .b.b.b.b.
        .........
        hhh.S.hhh`) },

    { name: "Lily Pond", season: "summer", start: 240, waves: 8, ramp: [12, 1.28], mix: { slug: 1, earwig: 0.7, aphid: 0.7, broody: 0.3, snail: 0.5 }, map: M(`
        bbb.G.bbb
        .........
        ...~~~...
        ...~~~...
        .........
        .o.....T.
        ........S
        ....*....
        .T...o...
        .........
        .........
        hhhhhhhhh`) },
    { name: "The Long Border", season: "summer", start: 260, waves: 8, ramp: [13, 1.28], mix: { slug: 0.8, ant: 1, earwig: 0.6, wasp: 0.6, snail: 0.5, broody: 0.3 }, map: M(`
        hh..G..hh
        ,,,,,,,..
        bbbbbbb..
        .........
        .........
        ..bbbbbbb
        ..,,,,,,,
        ..*......
        .......*.
        bbbbbbb..
        .........
        hhhhhhS.h`) },
    { name: "Sir Shellington's Charge", season: "summer", start: 300, waves: 9, ramp: [13, 1.25], mix: { snail: 1, slug: 0.7, beetle: 0.6, aphid: 0.6, wasp: 0.3 }, force: { 9: [["shelly", 1]] }, map: M(`
        bbb.G.bbb
        .........
        .........
        ..oo.oo..
        ....*....
        .T.....T.
        .........
        ..oo.oo..
        .........
        .........
        .........
        hS.hhh.Sh`) },
    { name: "Orchard Corner", season: "summer", start: 320, waves: 9, ramp: [15, 1.28], mix: { slug: 0.6, ant: 0.8, beetle: 0.7, mole: 0.7, wasp: 0.5, earwig: 0.6 }, map: M(`
        T.T.G.T.T
        .........
        T..T.T..T
        .........
        ...*.....
        T..T.T..T
        .........
        .......*.
        T..T.T..T
        .........
        S........
        hhhhhhhhh`) },
    { name: "The Hosepipe Ban", season: "summer", start: 340, waves: 9, ramp: [16, 1.28], mix: { slug: 0.5, louse: 0.9, beetle: 0.7, mole: 0.6, wasp: 0.6, broody: 0.3 }, map: M(`
        ppp.G.ppp
        .........
        .o.....o.
        .........
        ...~~~...
        S..~~~..S
        ...~~~...
        .........
        .o..*..o.
        .........
        .........
        hhhhhhhhh`) },

    { name: "Windfall", season: "autumn", start: 360, waves: 9, ramp: [16, 1.29], mix: { slug: 0.5, cater: 1, ant: 1, aphid: 0.8, louse: 0.6, beetle: 0.5 }, map: M(`
        bbb.G.bbb
        .........
        .T.....T.
        .........
        ...T.T...
        ....*....
        .........
        .T.....T.
        .........
        .........
        .........
        hhhS.Shhh`) },
    { name: "Old Digger's Lawn", season: "autumn", start: 400, waves: 10, ramp: [17, 1.28], mix: { mole: 1, cater: 0.7, slug: 0.5, wasp: 0.5, beetle: 0.5 }, force: { 10: [["digger", 1]] }, map: M(`
        bbb.G.bbb
        .........
        .........
        ...o.o...
        .........
        .*.....*.
        .........
        ...o.o...
        .........
        .........
        .........
        hhh.S.hhh`) },
    { name: "The Maze of Yew", season: "autumn", start: 420, waves: 10, ramp: [18, 1.28], mix: { slug: 0.5, cater: 0.8, beetle: 0.8, broody: 0.4, ant: 0.8, louse: 0.6 }, map: M(`
        hhh.G.hhh
        .........
        .hhh.hhh.
        .h.....h.
        .h.h*h.h.
        .........
        .h.h.h.h.
        .h.....h.
        .hhh.hhh.
        .........
        .........
        hhh.S.hhh`) },
    { name: "Bonfire Night", season: "autumn", start: 440, waves: 10, ramp: [19, 1.29], mix: { earwig: 0.8, wasp: 0.8, cater: 0.7, mole: 0.6, beetle: 0.6, aphid: 1 }, map: M(`
        bb..G..bb
        .........
        ..w...w..
        .........
        S...*...S
        .........
        ..w...w..
        .........
        .........
        ....o....
        .........
        hhh.S.hhh`) },
    { name: "Marrow Harvest", season: "autumn", start: 480, waves: 11, ramp: [20, 1.28], mix: { slug: 0.5, ant: 1, cater: 0.7, beetle: 0.7, mole: 0.6, broody: 0.5, wasp: 0.6, louse: 0.5 }, map: M(`
        b.bbGbb.b
        .........
        .........
        .b.b.b.b.
        ....*....
        .........
        .........
        .b.b.b.b.
        .........
        .........
        .........
        hS.hhh.Sh`) },

    { name: "First Frost", season: "winter", start: 500, waves: 10, ramp: [22, 1.29], mix: { slug: 0.5, frost: 1, ant: 0.8, louse: 0.6, beetle: 0.5 }, map: M(`
        ppp.G.ppp
        .........
        .........
        ..~~.~~..
        ..~~.~~..
        ....*....
        .........
        .T.....T.
        .........
        .........
        .........
        hhh.S.hhh`) },
    { name: "Lady Greenfly's Blight", season: "winter", start: 540, waves: 10, ramp: [20, 1.27], mix: { aphid: 1.4, wasp: 0.8, frost: 0.6, cater: 0.6, beetle: 0.4 }, force: { 10: [["lady", 1]] }, map: M(`
        bbb.G.bbb
        .........
        .o.....o.
        ...*.*...
        .........
        ..T...T..
        .........
        .........
        .o.....o.
        .........
        .........
        hS.hhh.Sh`) },
    { name: "Snowdrift Lane", season: "winter", start: 560, waves: 11, ramp: [24, 1.28], mix: { frost: 1, beetle: 0.8, mole: 0.7, cater: 0.7, broody: 0.5, ant: 1 }, map: M(`
        hh..G..hh
        ,,,,,,,..
        hhhhhhh..
        .........
        ....*....
        ..hhhhhhh
        ..,,,,,,,
        .........
        .........
        hhhhhhh..
        .........
        Shhhhhhhh`) },
    { name: "The Long Dark", season: "winter", start: 600, waves: 12, ramp: [21, 1.24], mix: { frost: 0.8, cater: 0.9, beetle: 0.8, wasp: 0.7, mole: 0.7, broody: 0.5, louse: 0.6, aphid: 0.8 }, map: M(`
        bbb.G.bbb
        .........
        .T.o.o.T.
        .........
        ....*....
        .........
        .T.o.o.T.
        .........
        S.......S
        .........
        .........
        hhh.S.hhh`) },
    { name: "Old Mother Gloop", season: "winter", start: 700, waves: 12, ramp: [24, 1.24], mix: { frost: 1, beetle: 0.8, snail: 0.7, cater: 0.7, broody: 0.6, wasp: 0.6, mole: 0.6, aphid: 0.8 }, force: { 6: [["lady", 1]], 12: [["gloop", 1]] }, map: M(`
        bbb.G.bbb
        .........
        .........
        ..~~.~~..
        ....*....
        .........
        .T.....T.
        .........
        ....*....
        .........
        .........
        hS.hhh.Sh`) },
];

export const ENDLESS_MAPS = [1, 7, 11, 14, 18];
export const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];

// ---- Gran's Almanac: the meta tree, drawn as three bean vines. ----------------------------------------------------
// x and y are positions on the page in a 0..1 box. Each node needs its parent.
export const ALMANAC = [
    { id: "root", name: "Gran's Almanac", cost: 0, x: 0.5, y: 0.94, desc: "Spend stars here. Refund them any time." },

    { id: "tin", name: "Biscuit Tin", parent: "root", cost: 1, x: 0.165, y: 0.78, desc: "Savings earn 5% each wave, not 4%." },
    { id: "pension", name: "Pension Day", parent: "tin", cost: 1, x: 0.08, y: 0.62, desc: "Start every level with +30p." },
    { id: "bootsale", name: "Car Boot Sale", parent: "tin", cost: 2, x: 0.25, y: 0.62, desc: "Selling refunds 85%, not 70%." },
    { id: "earlybird", name: "Early Bird", parent: "pension", cost: 2, x: 0.08, y: 0.46, desc: "Early-wave bonuses are 50% bigger." },
    { id: "bigtin", name: "Bigger Tin", parent: "bootsale", cost: 2, x: 0.25, y: 0.46, desc: "Savings earn on up to 900p, not 500p." },
    { id: "windfall", name: "Inheritance", parent: "earlybird", cost: 3, x: 0.08, y: 0.3, desc: "Start every level with +60p more." },
    { id: "village", name: "Trusting Village", parent: "bigtin", cost: 3, x: 0.25, y: 0.3, desc: "All wave income is 30% bigger." },

    { id: "seedswap", name: "Seed Swap", parent: "root", cost: 2, x: 0.5, y: 0.78, desc: "Defenders cost 5% less." },
    { id: "whetstone", name: "Whetstone", parent: "seedswap", cost: 2, x: 0.42, y: 0.62, desc: "All damage +10%." },
    { id: "feed", name: "Tomato Feed", parent: "seedswap", cost: 2, x: 0.58, y: 0.62, desc: "Upgrades cost 10% less." },
    { id: "queen", name: "Queen Bee", parent: "whetstone", cost: 2, x: 0.42, y: 0.46, desc: "Every hive has one more bee." },
    { id: "dig", name: "Double Dig", parent: "feed", cost: 2, x: 0.58, y: 0.46, desc: "Rich soil gives +40%, not +20%." },
    { id: "hone", name: "Sharper Still", parent: "queen", cost: 3, x: 0.42, y: 0.3, desc: "All damage +10% more." },
    { id: "mulch", name: "Good Mulch", parent: "dig", cost: 3, x: 0.58, y: 0.3, desc: "Heaps give 25% more boost." },
    { id: "green", name: "Green Fingers", parent: "hone", cost: 4, x: 0.5, y: 0.14, desc: "Everything fires 10% faster." },

    { id: "skin", name: "Thick Skin", parent: "root", cost: 1, x: 0.835, y: 0.78, desc: "The marrow takes 4 more bites." },
    { id: "size9", name: "Size Nine", parent: "skin", cost: 1, x: 0.75, y: 0.62, desc: "Gran's slipper hits twice as hard." },
    { id: "bulk", name: "Bigger Marrow", parent: "skin", cost: 2, x: 0.92, y: 0.62, desc: "The marrow takes 6 more bites." },
    { id: "quick", name: "Quick Draw", parent: "size9", cost: 2, x: 0.75, y: 0.46, desc: "The slipper comes back in 25s, not 40s." },
    { id: "gerald", name: "Gerald the Cat", parent: "bulk", cost: 2, x: 0.92, y: 0.46, desc: "Gerald swats the first pest each wave." },
    { id: "toecap", name: "Steel Toecap", parent: "quick", cost: 3, x: 0.75, y: 0.3, desc: "The slipper is bigger, and hits moles too." },
    { id: "kettle", name: "Kettle's On", parent: "gerald", cost: 1, x: 0.92, y: 0.3, desc: "15 more seconds before the first wave." },
];

/** Turn owned node ids into the numbers the simulation reads. */
export function metaFx(owned = {}) {
    const has = (id) => !!owned[id];
    return {
        interest: has("tin") ? 0.05 : 0.04,
        interestCap: has("bigtin") ? 900 : 500,
        start: (has("pension") ? 30 : 0) + (has("windfall") ? 60 : 0),
        refund: has("bootsale") ? 0.85 : 0.7,
        early: has("earlybird") ? 1.5 : 1,
        income: has("village") ? 1.3 : 1,
        cost: has("seedswap") ? 0.95 : 1,
        upCost: has("feed") ? 0.9 : 1,
        dmg: 1 + (has("whetstone") ? 0.1 : 0) + (has("hone") ? 0.1 : 0),
        bees: has("queen") ? 1 : 0,
        rich: has("dig") ? 0.4 : 0.2,
        heap: has("mulch") ? 1.25 : 1,
        rate: has("green") ? 0.9 : 1,
        bites: (has("skin") ? 4 : 0) + (has("bulk") ? 6 : 0),
        slipperDmg: has("size9") ? 2 : 1,
        slipperCd: has("quick") ? 25 : 40,
        toecap: has("toecap"),
        gerald: has("gerald"),
        firstWait: has("kettle") ? 15 : 0,
    };
}

/** Which defenders are planted in this level's tray, and which pests are new here. */
export const unlockedAt = (level) => DEF_ORDER.filter((k) => DEFS[k].unlock <= level);

// ---- Waves ---------------------------------------------------------------------------------------------------
const hash = (a, b) => { let h = Math.imul(a + 7, 2654435761) ^ Math.imul(b + 13, 40503); h ^= h >>> 15; h = Math.imul(h, 2246822519); return (h ^ (h >>> 13)) >>> 0; };

/** Pick groups for one wave. Deterministic, so the preview always tells the truth. */
function composeWave(seed, budget, mix, gates, forced) {
    const groups = [], names = Object.keys(mix);
    let rnd = hash(seed, 1), left = budget, at = 0, g = 0;
    const roll = () => { rnd = Math.imul(rnd, 1664525) + 1013904223 >>> 0; return rnd / 4294967296; };
    const total = names.reduce((n, k) => n + mix[k], 0);
    let guard = 0;
    while (left > 0.5 && guard++ < 12) {
        let pick = roll() * total, type = names[0];
        for (const k of names) { pick -= mix[k]; if (pick <= 0) { type = k; break; } }
        const p = PESTS[type], share = Math.min(left, budget * (0.3 + roll() * 0.4));
        const count = Math.max(1, Math.round(share / p.threat));
        const gap = Math.max(0.13, Math.min(1.5, 0.5 / (p.speed * Math.sqrt(count) * 0.6) * p.size * 2.4));
        groups.push({ type, count, gap, gate: g++ % gates, at });
        at += Math.min(count * gap, 7) * 0.8 + 1.5;
        left -= count * p.threat;
    }
    for (const [type, count] of forced ?? []) groups.push({ type, count, gap: 1.5, gate: 0, at: Math.max(0, at * 0.35), boss: true });
    return groups;
}

export function levelWaves(index) {
    const lv = LEVELS[index], gates = lv.map.join("").split("S").length - 1, list = [];
    for (let w = 0; w < lv.waves; w++) {
        const budget = lv.ramp[0] * Math.pow(lv.ramp[1], w);
        // The first waves of a level show only the older pests, then newcomers join in.
        const mix = {};
        const names = Object.keys(lv.mix);
        for (let i = 0; i < names.length; i++) if (i === 0 || w >= Math.min(i, lv.waves - 2)) mix[names[i]] = lv.mix[names[i]];
        list.push(composeWave(index * 97 + w, budget, mix, gates, lv.force?.[w + 1]));
    }
    return list;
}

/** Waves for endless mode: forever, and always harder. */
export function endlessWave(w, gates) {
    const season = SEASON_ORDER[Math.floor(w / 5) % 4];
    const pool = {
        spring: { slug: 1, ant: 1, aphid: 0.8, snail: 0.7, earwig: 0.7 },
        summer: { earwig: 0.8, wasp: 0.8, beetle: 0.8, broody: 0.4, mole: 0.6 },
        autumn: { cater: 1, ant: 1, aphid: 1, louse: 0.7, mole: 0.7, beetle: 0.7 },
        winter: { frost: 1, beetle: 0.8, cater: 0.7, wasp: 0.7, broody: 0.5 },
    }[season];
    const budget = 14 * Math.pow(1.17, Math.min(w, 28)) * Math.pow(1.09, Math.max(0, w - 28));
    const force = (w + 1) % 10 === 0 ? [[["bertha", "shelly", "digger", "lady", "gloop"][((w + 1) / 10 - 1) % 5], 1]] : null;
    return composeWave(9000 + w, budget, pool, gates, force);
}

export const seasonOfWave = (w) => SEASON_ORDER[Math.floor(w / 5) % 4];

/** Every pest type in a wave, with counts, biggest first. */
export function waveSummary(groups) {
    const counts = {};
    for (const g of groups) counts[g.type] = (counts[g.type] ?? 0) + g.count;
    return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => (ALL_PESTS[b.type].boss ? 1 : 0) - (ALL_PESTS[a.type].boss ? 1 : 0) || b.count * ALL_PESTS[b.type].hp - a.count * ALL_PESTS[a.type].hp);
}
