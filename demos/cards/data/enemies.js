// The tower's residents. Moves are telegraphed: the view reads the same data the sim acts on.
export const ENEMIES = {};
const E = (id, name, hp, moves, ai, o = {}) => { ENEMIES[id] = { id, name, hp, moves, ai, ...o }; };
const cycle = (...keys) => (e, t) => keys[t % keys.length];

// ---- The Cellar ----
E("rat", "Cellar Rat", [12, 15], { bite: { n: "Bite", dmg: 5 }, gnaw: { n: "Gnaw the Ladle", dmg: 3, status: { weak: 1 } } }, cycle("bite", "gnaw", "bite"), { blurb: "Has eaten more spells than you've cast." });
E("mold", "Mold Puff", [17, 21], { spore: { n: "Spore Sneeze", add: { gunk: 1 } }, bump: { n: "Soft Bump", dmg: 6 } }, cycle("bump", "spore", "bump"), { blurb: "Damp. Sentient. Disappointed." });
E("imp", "Bottle Imp", [22, 26], { cork: { n: "Cork Shot", dmg: 8 }, hide: { n: "Hide in the Bottle", ward: 8 } }, cycle("cork", "hide", "cork"), { blurb: "Wish-granting license long expired." });
E("ghoul", "Ladle Ghoul", [32, 36], { slop: { n: "Slop", dmg: 9 }, stir: { n: "Stir Menacingly", buff: { str: 2 } } }, cycle("slop", "stir", "slop", "slop"), { blurb: "Died mid-recipe. Still following it." });
E("wight", "Candle Wight", [25, 29], { melt: { n: "Hot Wax", dmg: 4, status: { scald: 2 } }, flick: { n: "Flicker Lunge", dmg: 10 } }, cycle("melt", "flick"), { blurb: "Burning at both ends, and the middle." });
// Elites
E("pickle", "The Pickled One", [78, 86], { slam: { n: "Jar Slam", dmg: 13 }, ferment: { n: "Ferment", buff: { str: 3 } }, fling: { n: "Fling Vinegar", dmg: 7, pot: 1 } }, cycle("fling", "slam", "ferment", "slam"), { elite: true, blurb: "A cucumber with ambition and no remaining cartilage." });
E("turnip", "Turnip Colossus", [96, 106], { stomp: { n: "Root Stomp", dmg: 11 }, sprout: { n: "Sprout", ward: 12, heal: 8 }, sit: { n: "Sit On the Lid", dmg: 6, status: { lid: 1 } } }, cycle("sit", "stomp", "sprout"), { elite: true, blurb: "Harvest was a mistake." });

// ---- The Library ----
E("worm", "Bookworm", [38, 44], { chew: { n: "Chew Chapter", dmg: 11 }, digest: { n: "Digest the Plot", buff: { str: 2 }, ward: 6 } }, cycle("chew", "digest", "chew"), { blurb: "Knows how it ends. Won't shut up about it." });
E("inkblot", "Living Inkblot", [46, 52], { splat: { n: "Splat", dmg: 12, status: { frail: 1 } }, smear: { n: "Smear", dmg: 7, add: { gunk: 1 } } }, cycle("smear", "splat"), { blurb: "What do you see in it? It sees you." });
E("sprite", "Page Sprite", [22, 26], { cuts: { n: "Thousand Paper Cuts", dmg: 3, hits: 3 }, flutter: { n: "Flutter", ward: 8 } }, cycle("cuts", "flutter", "cuts"), { blurb: "Small, sharp, and overdue." });
E("quill", "Quill Imp", [30, 34], { stab: { n: "Stab", dmg: 10 }, footnote: { n: "Add a Footnote", status: { weak: 2 } } }, cycle("footnote", "stab", "stab"), { blurb: "Citation needed. Blood needed." });
E("mothswarm", "Moth Swarm", [34, 38], { dust: { n: "Wing Dust", dmg: 2, hits: 5 }, circle: { n: "Circle the Candle", buff: { str: 1 }, heal: 5 } }, cycle("dust", "circle"), { blurb: "Have eaten your jumper and want the rest." });
E("overdue", "The Overdue", [124, 136], { fine: { n: "Collect the Fine", dmg: 16 }, shush: { n: "SHHHH", status: { drain: 1 }, dmg: 8 }, stamp: { n: "Date Stamp", buff: { str: 3 }, ward: 12 } }, cycle("shush", "fine", "stamp", "fine"), { elite: true, blurb: "Returned from the grave, four centuries late." });
E("gargoyle", "Reading Gargoyle", [140, 150], { peer: { n: "Peer Over Spectacles", ward: 20 }, drop: { n: "Drop From the Ceiling", dmg: 24 }, tut: { n: "Tut", status: { weak: 2, frail: 2 } } }, cycle("tut", "peer", "drop"), { elite: true, blurb: "Has been meaning to get around to you." });

// ---- The Belfry ----
E("batchoir", "Bat Choir", [40, 46], { screech: { n: "Screech Harmony", dmg: 5, hits: 3 }, rehearse: { n: "Rehearse", buff: { str: 2 } } }, cycle("rehearse", "screech", "screech"), { blurb: "Sopranos at the back, unfortunately." });
E("bellwraith", "Bell Wraith", [56, 62], { toll: { n: "Toll", dmg: 18 }, hum: { n: "Low Hum", ward: 14, status: { drain: 1 } } }, cycle("hum", "toll"), { blurb: "Asks not for whom. Knows exactly." });
E("ropehag", "Rope Hag", [52, 58], { snare: { n: "Bell Rope Snare", dmg: 9, status: { lid: 1 } }, yank: { n: "Yank", dmg: 15 } }, cycle("snare", "yank", "yank"), { blurb: "Sixty years of ringing. Shoulders like a bear." });
E("crow", "Clockwork Crow", [44, 50], { peck: { n: "Peck on the Hour", dmg: 7, hits: 2 }, wind: { n: "Wind Up", buff: { str: 3 } }, gunkit: { n: "Oil Leak", pot: 1, dmg: 8 } }, cycle("peck", "gunkit", "wind"), { blurb: "Right twice a day, and rude the rest." });
E("verger", "The Verger", [186, 200], { sweep: { n: "Sweep", dmg: 12, hits: 2 }, bar: { n: "Bar the Door", ward: 22, status: { lid: 1 } }, sermon: { n: "Very Long Sermon", status: { weak: 2, frail: 2 }, buff: { str: 2 } } }, cycle("sermon", "sweep", "bar", "sweep"), { elite: true, blurb: "He has swept these stairs for 300 years. You've tracked mud in." });

// ---- The Crown ----
E("stormcrow", "Storm Crow", [64, 72], { bolt: { n: "Forked Beak", dmg: 12, hits: 2 }, gale: { n: "Gale", ward: 16 } }, cycle("bolt", "gale", "bolt"), { blurb: "Brings bad news, and delivers it at speed." });
E("weatherhex", "Weather Hex", [72, 80], { drizzle: { n: "Personal Drizzle", dmg: 8, status: { scald: 3 } }, front: { n: "Cold Front", dmg: 20 }, sour: { n: "Sour the Milk", add: { gunk: 2 } } }, cycle("sour", "drizzle", "front"), { blurb: "An unlicensed forecast." });
E("thorn", "Thorn Knight", [92, 100], { lunge: { n: "Lunge", dmg: 24 }, brace: { n: "Brace", ward: 22, buff: { str: 2 } } }, cycle("brace", "lunge"), { blurb: "Sworn to protect the tower. Has forgotten from whom." });
E("sister", "Mirror Sister", [68, 76], { mimic: { n: "Mimic Curse", dmg: 10, status: { weak: 1, frail: 1 } }, smile: { n: "Same Smile", dmg: 17 } }, cycle("mimic", "smile"), { blurb: "She's you, but she flosses." });
E("stag", "The Gloam Stag", [270, 290], { gore: { n: "Gore", dmg: 32 }, antlers: { n: "Crown of Antlers", ward: 30, buff: { str: 3 } }, gloom: { n: "Gloom Bellow", dmg: 12, add: { gunk: 2 }, status: { drain: 1 } } }, cycle("gloom", "gore", "antlers"), { elite: true, blurb: "The last thing a great many witches admired." });

// ---- Bosses ----
E("gristle", "Madam Gristle", [190, 190], {
    ladle: { n: "Big Ladle", dmg: 12 }, toss: { n: "Too Many Cooks", dmg: 6, pot: 1 }, taste: { n: "Taste the Broth", ward: 14, buff: { str: 1 } }, feast: { n: "Banquet Slam", dmg: 20 },
}, cycle("toss", "ladle", "taste", "feast"), { boss: true, title: "Cook of the Cellar", rule: "Too Many Cooks: she tosses Gunk straight into your pot. Tap it to skim it out for 1 Heat.", blurb: "Her soup has a body count and two Michelin curses." });
E("codex", "The Codex Moth", [280, 280], {
    read: { n: "Forbidden Page", dmg: 14, forbid: true }, swarm: { n: "Marginalia", dmg: 6, hits: 3, forbid: true }, fold: { n: "Dog-Ear", ward: 26, forbid: true }, shred: { n: "Shred Chapter", dmg: 26, forbid: true },
}, cycle("read", "swarm", "fold", "shred"), { boss: true, title: "Keeper of the Library", rule: "Forbidden Page: each turn one element is forbidden, and fizzles at half strength.", blurb: "Ate the only copy of the only book about how to stop it." });
E("hollow", "The Tolling Hollow", [420, 420], {
    swing: { n: "Clapper Swing", dmg: 18 }, chime: { n: "Chime", dmg: 9, hits: 2 }, hush: { n: "The Hush Before", ward: 30 }, toll: { n: "THE TOLL", dmg: 52, hits: 1 },
}, cycle("swing", "chime", "hush", "swing", "toll"), { boss: true, title: "Voice of the Belfry", rule: "Every fifth bell, THE TOLL. Land 60 damage in one brew and it stumbles, skipping its next swing.", blurb: "The bell has no ringer. It has never needed one." });
E("ysolde", "Hexmother Ysolde", [620, 620], {
    curse: { n: "Mother's Disappointment", dmg: 20, status: { weak: 1 } }, brood: { n: "Call the Coven", summon: ["sister"], ward: 24 }, drink: { n: "Sip Your Brew", dmg: 14, add: { gunk: 2 } }, end: { n: "Last Rites", dmg: 15, hits: 3 }, lid: { n: "The Last Lid", dmg: 24, status: { lid: 2 } },
}, (e, t) => (e.hp > e.maxHp / 2 ? ["curse", "drink", "brood", "curse"] : ["lid", "end", "drink", "end"])[t % 4], { boss: true, title: "Mother of the Tower", rule: "Below half HP she closes the Last Lid and stops being polite.", blurb: "She built this tower so nobody could visit. Rude of you, honestly." });

export const BOSSES = ["gristle", "codex", "hollow", "ysolde"];
// [easy, normal, elite] encounters per act.
export const ENCOUNTERS = [
    {
        easy: [["rat", "rat"], ["mold"], ["imp"]],
        normal: [["ghoul"], ["wight", "rat"], ["imp", "mold"], ["rat", "rat", "rat"], ["wight", "mold"]],
        elite: [["pickle"], ["turnip"]],
    },
    {
        easy: [["worm"], ["sprite", "sprite"], ["quill"]],
        normal: [["inkblot"], ["worm", "sprite"], ["mothswarm", "quill"], ["sprite", "sprite", "sprite"], ["inkblot", "quill"]],
        elite: [["overdue"], ["gargoyle"]],
    },
    {
        easy: [["batchoir"], ["crow"], ["ropehag"]],
        normal: [["bellwraith"], ["crow", "batchoir"], ["ropehag", "crow"], ["bellwraith", "batchoir"]],
        elite: [["verger"], ["verger", "batchoir"]],
    },
    {
        easy: [["stormcrow"], ["sister"], ["weatherhex"]],
        normal: [["thorn"], ["stormcrow", "sister"], ["weatherhex", "stormcrow"], ["thorn", "weatherhex"]],
        elite: [["stag"], ["stag", "stormcrow"]],
    },
];
export const ACT_NAMES = ["The Cellar", "The Library", "The Belfry", "The Crown"];
