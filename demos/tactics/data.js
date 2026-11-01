// Squad Goals: who everyone is. Pure data, shared by the game and the bots.

/** Pigeons. `act` names the ability in sim.js. Each has three upgrades, bought with seeds between battles. */
export const PIGEONS = {
    sarge: {
        name: "Sgt. Coo", role: "Brawler", hp: 4, mv: 3, act: "slap", actName: "Wing Slap", color: "#c9543f",
        actDesc: "Hit next to you for 2 and shove them 1.",
        tag: "Forty years in the Park. Thirty-nine in the bin.",
        ups: [
            { id: "dmg", name: "Knuckle Feathers", desc: "Slap deals 3.", cost: 5 },
            { id: "far", name: "Follow Through", desc: "Slap shoves 2 tiles.", cost: 6 },
            { id: "hp", name: "Tough Old Bird", desc: "+1 health.", cost: 4 },
        ],
        barks: ["Drop and give me twenty crumbs!", "That's for the '09 sandwich.", "I've eaten tougher chips.", "In my day we HAD no wings.", "Stand up straight, you lump.", "Coo. Coo. Hoo-rah."],
        hurt: ["Tis but a pluck!", "Felt that in my good leg."],
    },
    doris: {
        name: "Doris", role: "Bombardier", hp: 2, mv: 3, fly: true, act: "drop", actName: "Payload", color: "#e0a93a",
        actDesc: "Bomb a tile in line, 2 to 5 away. 1 damage, shoves everything around it.",
        tag: "Been saving this one since Tuesday.",
        ups: [
            { id: "dmg", name: "Extra Fibre", desc: "Payload deals 2.", cost: 6 },
            { id: "far", name: "Long Haul", desc: "Range up to 7.", cost: 4 },
            { id: "hp", name: "Good Knees", desc: "+1 health.", cost: 4 },
        ],
        barks: ["Bombs away, love.", "That's a nice statue you had.", "Ooh, I do feel better.", "Tuesday's finest.", "Mind your hat, dear.", "Lovely spread."],
        hurt: ["My hip!", "Not on a Thursday!"],
    },
    gale: {
        name: "Gale", role: "Windbag", hp: 3, mv: 3, act: "flap", actName: "Big Flap", color: "#55b8c4",
        actDesc: "Shove everything in a line of 3 tiles, friends included. No damage.",
        tag: "Teaches breathwork. Nobody asked.",
        ups: [
            { id: "far", name: "Hot Air", desc: "Flap reaches 5 tiles.", cost: 5 },
            { id: "dmg", name: "Stern Breeze", desc: "Enemies flapped lose their attack.", cost: 8 },
            { id: "hp", name: "Deep Lungs", desc: "+1 health.", cost: 3 },
        ],
        barks: ["Inhale. And... release.", "Let it go. Far away.", "You're holding tension in your beak.", "Namaste over there.", "Feel the draught.", "Be the breeze."],
        hurt: ["This is a learning moment.", "I forgive you. Ow."],
    },
    lunch: {
        name: "Big Lunch", role: "Heavy", hp: 5, mv: 2, act: "slide", actName: "Belly Slide", color: "#7e9b4e",
        actDesc: "Slide in a line until something stops you. Hits it for 2 and shoves it.",
        tag: "Weighs the same as a medium pizza. Has eaten three.",
        ups: [
            { id: "dmg", name: "Seconds", desc: "Slide deals 3.", cost: 6 },
            { id: "armor", name: "Crumb Armour", desc: "Starts each battle with a shield.", cost: 5 },
            { id: "mv", name: "Light Snack", desc: "+1 move.", cost: 4 },
        ],
        barks: ["Comin' through. Hungry.", "Is that a chip?", "This is my cardio.", "Pardon me.", "I'm not fat, I'm catered.", "Mmf."],
        hurt: ["Hey! I was chewing!", "That'll want a snack."],
    },
    vinnie: {
        name: "Slick Vinnie", role: "Swindler", hp: 3, mv: 4, fly: true, act: "swap", actName: "Nice Hat Trick", color: "#8b6ad6",
        actDesc: "Swap places with anyone in line, up to 4 away. Their attack goes with them.",
        tag: "Sold the same bench eleven times.",
        ups: [
            { id: "far", name: "Long Con", desc: "Swap reaches 6 tiles.", cost: 4 },
            { id: "dmg", name: "Pocket Sand", desc: "Swapped enemies lose their attack.", cost: 8 },
            { id: "hp", name: "Good Lawyer", desc: "+1 health.", cost: 3 },
        ],
        barks: ["Now you see me.", "Trust me, I'm a pigeon.", "That's a lovely spot. Mine now.", "No refunds.", "Check your wallet, pal.", "Ever seen a hat this nice?"],
        hurt: ["Not the hat!", "My lawyer'll hear about this."],
    },
    plume: {
        name: "Lady Plume", role: "Duchess", hp: 3, mv: 3, act: "hook", actName: "Crust on a String", color: "#d2699a",
        actDesc: "Hook the first thing in line, 2 to 6 away. 1 damage, drags it to you.",
        tag: "Terribly disappointed. In you, specifically.",
        ups: [
            { id: "dmg", name: "Stale Crust", desc: "Hook deals 2.", cost: 6 },
            { id: "far", name: "Withering Look", desc: "Hooked enemies lose their attack.", cost: 8 },
            { id: "hp", name: "Good Breeding", desc: "+1 health.", cost: 3 },
        ],
        barks: ["Come here, you ghastly thing.", "How frightfully common.", "One does not 'coo'.", "Do wipe your feet.", "Daddy will hear of this.", "I'd sooner eat a bagel."],
        hurt: ["How DARE you.", "This is silk!"],
    },
    quack: {
        name: "Dr. Quack", role: "Medic", hp: 3, mv: 3, act: "patch", actName: "Placebo", color: "#e8e2d6",
        actDesc: "Heal an ally or bag within 3 for 1, and shield it from the next hit.",
        tag: "Not a duck. Not a doctor.",
        ups: [
            { id: "dmg", name: "Actual Medicine", desc: "Heals 2.", cost: 5 },
            { id: "far", name: "House Calls", desc: "Reach 5 tiles.", cost: 4 },
            { id: "mv", name: "Bike Bell", desc: "+1 move.", cost: 4 },
        ],
        barks: ["Take two crumbs and call me Monday.", "Yes yes, it's all in your wing.", "I'm legally not allowed to say.", "Say coo.", "That'll be forty seeds.", "Next!"],
        hurt: ["Physician, heal thy... ow.", "Is there a doctor? Oh. No."],
    },
    kevin: {
        name: "Kevin", role: "Intern", hp: 2, mv: 3, act: "box", actName: "Kevin's Box", color: "#f08a3c",
        actDesc: "Put a box on an empty tile 1 or 2 away. Boxes block, shove and take hits.",
        tag: "Found a box. Is very proud.",
        ups: [
            { id: "dmg", name: "Fizzy Box", desc: "Places a fizzy can. It explodes when hit.", cost: 6 },
            { id: "far", name: "Kevin Did A Throw", desc: "Reach 4 tiles.", cost: 4 },
            { id: "hp", name: "Bigger Kevin", desc: "+1 health.", cost: 3 },
        ],
        barks: ["I found a box!", "Is this a box?", "Hi! I'm Kevin!", "I'm helping!", "Box!", "Sarge says I'm a good boy."],
        hurt: ["Ow! Is that normal?", "Sarge? SARGE?"],
    },
    reg: {
        name: "Old Reg", role: "Civilian", hp: 2, mv: 2, act: null, actName: null, color: "#a8a39a", npc: true,
        tag: "Knows the secret of the big bread. Forgot it.",
        ups: [], barks: ["Is it Wednesday?", "I knew your mother.", "Lovely weather."], hurt: ["Eh?"],
    },
};

export const CLASSES = ["sarge", "doris", "gale", "lunch", "vinnie", "plume", "quack", "kevin"];

/**
 * Enemies. `w` weights targets: bag, pigeon, box. `order` is fixed so a player can always read the numbers.
 * `ground` units die in water and over ledges; everyone else flaps.
 */
export const ENEMIES = {
    crow: { name: "Crow Thug", tribe: "crow", hp: 2, mv: 3, fly: true, intent: "melee", dmg: 1, desc: "Pecks next to it for 1." },
    slinger: { name: "Crow Slinger", tribe: "crow", hp: 2, mv: 2, fly: true, intent: "line", dmg: 1, range: 6, keep: 2, desc: "Flicks a stone down a line: first thing hit takes 1." },
    bruiser: { name: "Crow Bruiser", tribe: "crow", hp: 4, mv: 2, fly: true, intent: "melee", dmg: 2, push: 1, desc: "Hits next to it for 2 and shoves." },
    gull: { name: "Swooper", tribe: "gull", hp: 3, mv: 2, fly: true, intent: "dive", dmg: 2, desc: "Dives along a line into the first thing: 2 damage and a shove.", bag: 1.6 },
    screecher: { name: "Bin Baron", tribe: "gull", hp: 4, mv: 2, fly: true, intent: "wide", dmg: 1, desc: "Screeches at 3 tiles in front: 1 damage and a shove.", bag: 1.4 },
    squirrel: { name: "Scrapper", tribe: "squirrel", hp: 2, mv: 4, ground: true, intent: "melee", dmg: 1, push: 1, desc: "Fast. Hits next to it and shoves. Drowns.", bag: 1.2 },
    lobber: { name: "Acorn Lobber", tribe: "squirrel", hp: 2, mv: 2, ground: true, intent: "lob", dmg: 1, min: 2, max: 4, desc: "Lobs over anything, 2 to 4 away: 1 damage, shoves all around.", bag: 1.3 },
    nutcase: { name: "Nutcase", tribe: "squirrel", hp: 1, mv: 3, ground: true, intent: "blast", dmg: 2, desc: "Explodes next turn for 2 around it. Also explodes if killed.", bag: 1.4 },
    hazel: { name: "Chairman Hazel", tribe: "squirrel", hp: 10, mv: 2, ground: true, boss: true, bossHeavy: true, intents: ["lob", "wide"], dmg: 2, min: 2, max: 4, desc: "Boss. Takes only 1 per action, but water costs her 2." },
    steve: { name: "Big Steve", tribe: "gull", hp: 7, mv: 2, fly: true, boss: true, intents: ["dive", "wide"], dmg: 2, desc: "Boss. Takes only 1 per action. Dives, then sweeps." },
    contessa: { name: "The Contessa", tribe: "crow", hp: 7, mv: 3, fly: true, boss: true, intents: ["cross", "line"], dmg: 2, range: 8, desc: "Boss. Takes only 1 per action. Fires both ways down a line, then snipes." },
    swan: { name: "The Swan", tribe: "swan", hp: 13, mv: 2, fly: true, boss: true, swan: true, intents: ["wide", "dive", "cross"], dmg: 3, range: 8, desc: "Takes only 1 per action. It can break your arm." },
    sprinkler: { name: "Sprinkler", tribe: "env", hp: 99, mv: 0, env: true, intent: "spray", dmg: 0, range: 8, desc: "Sprays a line each round, turning clockwise. Shoves everything." },
};

/** Things on the board that are not anyone. */
export const PROPS = {
    can: { name: "Fizzy Can", hp: 1, desc: "Explodes when hit: 1 damage and a shove to all sides." },
    box: { name: "Kevin's Box", hp: 2, desc: "Blocks shots. Can be shoved." },
    bag: { name: "Bread Bag", hp: 3, anchored: true, keep: true, desc: "The squad's lunch. Protect it." },
    nest: { name: "Egg Nest", hp: 2, anchored: true, keep: true, desc: "Somebody's future. Protect it." },
    drum: { name: "Bass Drum", hp: 99, anchored: true, indestructible: true, desc: "Hit it: the shockwave shoves everything next to it." },
};

export const TERRAIN_INFO = {
    water: ["Water", "Soaks birds, cancelling attacks. Squirrels drown."],
    hedge: ["Hedge", "Blocks. Bumping it hurts both."],
    stone: ["Stone", "Blocks. Bumping it hurts."],
    slick: ["Melted Ice Cream", "Anything shoved here slides one further."],
    spike: ["Pigeon Spikes", "Shoved here: 2 damage."],
    void: ["Ledge", "Squirrels shoved off fall. Birds just tut."],
};
