// All of Moonpatch's content: crops, recipes, fish, ghosts and the story. The rules live in sim.js.

export const HEART = 4, SEASON_DAYS = 12, MOON_DAYS = 8, YEAR_DAYS = 48, COLS = 7, ROWS = 7;
export const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
export const MOONS = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
/** What each moon does, shown in the almanac and on the moon chip. */
export const MOON_RULES = {
    new: "New Moon: flanked gaps always cross-pollinate, and blooms give one extra.",
    wax: "Waxing moon: leafy crops grow two nights in one.",
    full: "Full Moon: everything you harvest tonight is Shining, worth double.",
    wane: "Waning moon: root crops grow two nights in one.",
};

// tag: root leaf fruit bloom. days to first harvest. regrow: nights between later harvests. season -1 grows all year.
export const CROPS = {
    moonradish: { name: "Moonradish", season: 0, tag: "root", days: 2, seed: 6, sell: 14, glow: "#9fe8ff", friends: ["silverleek"] },
    silverleek: { name: "Silverleek", season: 0, tag: "leaf", days: 3, seed: 10, sell: 26, glow: "#c8ffe0", friends: ["moonradish", "hushbell"] },
    glowpea: { name: "Glowpea", season: 0, tag: "fruit", days: 4, regrow: 2, seed: 22, sell: 18, glow: "#b4ff8a", friends: ["moonradish"] },
    hushbell: { name: "Hushbell", season: 0, tag: "bloom", days: 3, seed: 12, sell: 30, glow: "#c9b0ff", friends: ["glowpea"] },
    lampberry: { name: "Lampberry", season: 1, tag: "fruit", days: 4, regrow: 2, seed: 26, sell: 22, glow: "#ffb86a", friends: ["fireflax"] },
    starmelon: { name: "Starmelon", season: 1, tag: "fruit", days: 6, seed: 42, sell: 120, tall: true, glow: "#a8fff0", friends: ["emberroot"] },
    fireflax: { name: "Fireflax", season: 1, tag: "bloom", days: 3, seed: 14, sell: 36, glow: "#ffd76a", friends: ["emberroot"] },
    emberroot: { name: "Emberroot", season: 1, tag: "root", days: 3, seed: 14, sell: 34, glow: "#ff8f6a", friends: ["fireflax", "starmelon"] },
    ghourd: { name: "Ghourd", season: 2, tag: "fruit", days: 6, seed: 46, sell: 130, tall: true, glow: "#ffc861", friends: ["wispwheat"] },
    wispwheat: { name: "Wispwheat", season: 2, tag: "leaf", days: 2, seed: 9, sell: 20, glow: "#ffeeb0", friends: ["duskbeet", "ghourd"] },
    duskbeet: { name: "Duskbeet", season: 2, tag: "root", days: 3, seed: 15, sell: 38, glow: "#ff7fb6", friends: ["wispwheat"] },
    veilbloom: { name: "Veilbloom", season: 2, tag: "bloom", days: 4, seed: 20, sell: 56, glow: "#e6a8ff", friends: ["duskbeet"] },
    frostcap: { name: "Frostcap", season: 3, tag: "leaf", days: 3, seed: 16, sell: 40, glow: "#a8d8ff", friends: ["snowbell"] },
    snowbell: { name: "Snowbell", season: 3, tag: "bloom", days: 3, seed: 16, sell: 42, glow: "#e8f4ff", friends: ["icewort"] },
    icewort: { name: "Icewort", season: 3, tag: "root", days: 2, seed: 12, sell: 28, glow: "#8fffe6", friends: ["frostcap"] },
    // Hybrids can't be bought until found, and they grow in every season.
    pearlroot: { name: "Pearlroot", season: -1, hybrid: true, tag: "root", days: 3, seed: 30, sell: 76, glow: "#fff0d8", parents: ["moonradish", "silverleek"], friends: ["chimepea"] },
    chimepea: { name: "Chimepea", season: -1, hybrid: true, tag: "fruit", days: 3, regrow: 2, seed: 44, sell: 44, glow: "#ffb0e8", parents: ["glowpea", "hushbell"], friends: ["pearlroot"] },
    sunmelon: { name: "Sunmelon", season: -1, hybrid: true, tag: "fruit", days: 5, seed: 70, sell: 190, tall: true, glow: "#ffe27a", parents: ["lampberry", "starmelon"], friends: [] },
    emberbell: { name: "Emberbell", season: -1, hybrid: true, tag: "bloom", days: 3, seed: 36, sell: 92, glow: "#ff9a5c", parents: ["fireflax", "emberroot"], friends: ["gloamgourd"] },
    gloamgourd: { name: "Gloamgourd", season: -1, hybrid: true, tag: "fruit", days: 5, seed: 76, sell: 210, tall: true, glow: "#d890ff", parents: ["ghourd", "veilbloom"], friends: ["emberbell"] },
    nightgrain: { name: "Nightgrain", season: -1, hybrid: true, tag: "leaf", days: 2, seed: 24, sell: 58, glow: "#b4a8ff", parents: ["wispwheat", "duskbeet"], friends: [] },
    rimeblossom: { name: "Rimeblossom", season: -1, hybrid: true, tag: "bloom", days: 3, seed: 40, sell: 104, glow: "#bfeaff", parents: ["frostcap", "snowbell"], friends: [] },
    hearthlight: { name: "Hearthlight", season: -1, hybrid: true, tag: "bloom", days: 4, seed: 120, sell: 340, glow: "#ffcf7a", parents: ["emberbell", "pearlroot"], friends: [] },
};
export const HYBRIDS = Object.keys(CROPS).filter((c) => CROPS[c].hybrid);

export const FISH = {
    pondlet: { name: "Pondlet", sell: 16, weight: 40, season: -1, glow: "#a8d8ff" },
    silverperch: { name: "Silver Perch", sell: 34, weight: 26, season: -1, glow: "#dfeeff" },
    lanternloach: { name: "Lantern Loach", sell: 52, weight: 14, season: 1, glow: "#ffc861" },
    mistcarp: { name: "Mist Carp", sell: 58, weight: 14, season: 0, glow: "#c8ffe0" },
    duskeel: { name: "Dusk Eel", sell: 70, weight: 12, season: 2, glow: "#ff9ac8" },
    icedace: { name: "Ice Dace", sell: 74, weight: 12, season: 3, glow: "#a8f0ff" },
    moonkoi: { name: "Moon Koi", sell: 150, weight: 4, season: -1, glow: "#fff0d8", night: "full" },
    oldboot: { name: "Polite Boot", sell: 3, weight: 6, season: -1, glow: "#c9b0ff" },
    duchess: { name: "The Old Duchess", sell: 0, weight: 0, season: -1, glow: "#ffe9a8", legend: true },
};

// Ingredients match exactly; order doesn't matter. Anything else makes Thin Broth.
export const DISHES = {
    broth: { name: "Thin Broth", sell: 12, needs: null, note: "It tries its best." },
    slaw: { name: "Moonlit Slaw", sell: 74, needs: ["moonradish", "silverleek"], note: "Crunches quietly." },
    peasoup: { name: "Glowpea Soup", sell: 90, needs: ["glowpea", "moonradish"], note: "Glows on the way down." },
    fishpie: { name: "Perch Pie", sell: 110, needs: ["silverperch", "silverleek"], note: "Has a very polite crust." },
    jam: { name: "Lampberry Jam", sell: 95, needs: ["lampberry", "fireflax"], note: "A jar of August." },
    melonice: { name: "Starmelon Ice", sell: 230, needs: ["starmelon", "lampberry"], note: "Rain Tonic: rain tomorrow night.", buff: "rain" },
    stew: { name: "Ember Stew", sell: 120, needs: ["emberroot", "pondlet"], note: "Growing Stew: every crop grows an extra night.", buff: "grow" },
    pie: { name: "Ghourd Pie", sell: 240, needs: ["ghourd", "wispwheat"], note: "A slice of October." },
    bread: { name: "Duskbread", sell: 120, needs: ["wispwheat", "duskbeet"], note: "Dark, sweet and very kind." },
    cordial: { name: "Moth Cordial", sell: 170, needs: ["hushbell", "veilbloom"], altNeeds: ["hushbell", "fireflax"], note: "Moths adore it. The next gap always pollinates.", buff: "pollen" },
    chowder: { name: "Frost Chowder", sell: 150, needs: ["frostcap", "silverperch"], note: "Warms you from the feet up." },
    tea: { name: "Snowbell Tea", sell: 130, needs: ["snowbell", "icewort"], note: "Tastes like a held breath." },
    remembering: { name: "Remembering Soup", sell: 400, needs: ["pearlroot", "silverperch", "wispwheat"], altNeeds: ["pearlroot", "silverperch", "frostcap"], note: "Auberon's wife's soup. Tastes of being home.", secret: true },
};

export const RELICS = {
    spoon: { name: "Bent Spoon", note: "Somebody stirred with feeling." }, button: { name: "Brass Button", note: "From the ferryman's coat." },
    thimble: { name: "Silver Thimble", note: "Still warm, somehow." }, key: { name: "Small Key", note: "Fits nothing. Keep it anyway." },
    marble: { name: "Moon Marble", note: "Rolls uphill on full moons." }, ticket: { name: "Ferry Ticket", note: "Single. Never punched." },
    bell: { name: "Cow Bell", note: "The cow has moved on. Good for her." }, teacup: { name: "Teacup Handle", note: "Just the handle. A mystery." },
    coin: { name: "Old Penny", note: "Dated before the lake was a lake." }, pipe: { name: "Clay Pipe", note: "Smells of good stories." },
    bone: { name: "Very Old Bone", note: "Biscuit's. Absolutely Biscuit's.", quest: true },
};
export const RELIC_LIST = Object.keys(RELICS).filter((r) => !RELICS[r].quest);

export const KEEPSAKES = {
    whistle: { name: "Brass Whistle", ghost: "bartleby" }, collar: { name: "Worn Collar", ghost: "biscuit" }, woodspoon: { name: "Auberon's Spoon", ghost: "auberon" },
    feather: { name: "Stage Feather", ghost: "odette" }, moth: { name: "Pressed Moth", ghost: "fennimore" }, stamp: { name: "Last Stamp", ghost: "quillon" },
};

export const ZONES = [
    { name: "Home patch", cost: 0 },
    { name: "West brambles", cost: 300 },
    { name: "North brambles", cost: 1000 },
    { name: "Far brambles", cost: 2600 },
];
/** Which zone each tile of the 7x7 field belongs to. */
export const ZONE_MAP = [
    "3333333",
    "3333333",
    "2222222",
    "1100002",
    "1100002",
    "1100002",
    "1100002",
].join("");

export const BUILDINGS = {
    cauldron: { name: "Gran's Cauldron", cost: 180, note: "Cook two or three things together. Some dishes do more than feed you." },
    rod: { name: "Better Rod", cost: 240, note: "Two more casts every night, and it can hold a legend." },
    widehoe: { name: "Wide Tools", cost: 320, note: "Your hoe and can reach the tiles beside your sweep too." },
    bell: { name: "Dew Bell", cost: 220, multi: 4, note: "Place it on a tile. It waters all eight around it each dusk." },
    hive: { name: "Moth Hive", cost: 500, note: "Gives moonhoney each dawn, and pollinating gets much easier." },
    awning: { name: "Stall Awning", cost: 700, note: "One more ghost comes to the stall each day." },
    glass: { name: "Moon Glasshouse", cost: 1400, note: "Top row of the home patch grows any season's crop." },
    sign: { name: "Painted Sign", cost: 900, note: "Word gets round. Everything sells for a fifth more." },
};
export const BUILD_ORDER = ["cauldron", "bell", "rod", "widehoe", "hive", "awning", "sign", "glass"];
export const LANTERN = [
    { name: "Dock planks", cost: 1000, note: "The old dock is mostly holes. Polite holes." },
    { name: "Lantern post", cost: 2600, note: "Tall enough to be seen from the far shore." },
    { name: "Great lamp", cost: 5200, note: "Waiting for six keepsakes and a Hearthlight." },
];

export const GHOSTS = {
    quillon: {
        name: "Mrs. Quillon", title: "the postmistress", loves: ["hushbell", "tea", "jam"], likes: ["bloom"], glow: "#c9b0ff",
        lines: ["Good day, dear. You have your grandmother's way of squinting.", "Letters keep. That's the entire point of them."],
        story: [
            "I ran the Lull post office for forty-one years. I have never once lost a letter. Do remember that, later.",
            "When the lake rose, I carried the mail out on my head. Every bag. I kept walking, and I'm told the walking went on rather longer than I did.",
            "Your grandmother wrote to you every week. Some of them she never let me send. She said you'd come when you came.",
            "I hold one letter left. Addressed to The Keeper, to be delivered when the lamp is ready and not one minute before.",
            "Forty-one years and one letter to go. I confess I've been afraid to finish. What is a postmistress with an empty bag?",
        ],
        favour: "Bring me all five other keepsakes, dear. Then I can deliver my last letter.", keepsake: "stamp",
    },
    bartleby: {
        name: "Bartleby Reed", title: "the old fisherman", loves: ["silverperch", "fishpie", "chowder"], likes: ["fish"], glow: "#a8d8ff",
        lines: ["Morning. Fish are biting, or they're being polite about it.", "Ever seen a ghost fish? No? Me neither. Keeps me up."],
        story: [
            "Sixty years on this lake. Never fell in once. Then the lake came and fell on me. Cheek.",
            "There's a fish out there, the Old Duchess. Long as a rowing boat. I hooked her in my twenties and she looked at me. Just looked.",
            "Biscuit there was my dog. Yes, yes, a very good dog. He came looking for me afterwards. I never did forgive myself that.",
            "I told everybody I stayed for the Duchess. Truth is, I don't know what a man does on the far shore with no boat.",
            "Catch her for me. Not to keep. I only want to see her once more, and say good evening properly.",
        ],
        favour: "On a full moon, with a proper rod, she'll rise. Bring her to the line.", keepsake: "whistle",
    },
    biscuit: {
        name: "Biscuit", title: "a very good dog", loves: ["bone", "pondlet", "moonradish"], likes: ["root"], glow: "#ffd9a8", dog: true,
        lines: ["Wuff.", "(Biscuit is wagging so hard his back half has gone see-through.)"],
        story: [
            "(Biscuit sniffs your hand. Your hand goes pleasantly cold. He seems delighted with this outcome.)",
            "(He brings you a stick. It passes through your fingers. He brings it again, full of hope.)",
            "(He trots to the dock and looks across the water. Then he looks at Bartleby. Then back at the water. Then he sits.)",
            "(He digs at the edge of your field, then looks up at you with enormous meaning.)",
            "(He puts his chin on your boot. There's no weight to it at all. You keep very still anyway.)",
        ],
        favour: "(Biscuit is sure he buried something in your field. Till new soil and keep an eye out.)", keepsake: "collar",
    },
    auberon: {
        name: "Auberon Mull", title: "the innkeeper", loves: ["slaw", "stew", "pie"], likes: ["dish"], glow: "#ffcf8a",
        lines: ["You look thin. Everyone looks thin to me. I'm transparent.", "Salt! No. Sorry. Force of habit."],
        story: [
            "I ran the Hollow Spoon. Best table in Lull. I can't taste a thing now, you know, but I remember tasting, and that's very nearly dinner.",
            "My Maud made a soup. Every Thursday. She wouldn't write it down. She said if I wanted it I'd have to stay married to her.",
            "She went ahead on the ferry, the first year. Waved and everything. I said I'd catch the next one.",
            "That was thirty-one years ago. I couldn't go. I couldn't arrive without the soup. She'd ask me what was in it. It's the only thing she ever asked.",
            "Pearlroot, I think. Perch. Something of the fields. If you could only try. I'd know it. I'd know it by the steam.",
        ],
        favour: "Cook Remembering Soup: Pearlroot, Silver Perch, and Wispwheat or Frostcap.", keepsake: "woodspoon",
    },
    odette: {
        name: "Odette Marchetti", title: "of the Lull Playhouse", loves: ["veilbloom", "rimeblossom", "melonice"], likes: ["bloom"], glow: "#ffb0d0",
        lines: ["Darling! In this light? You flatter me. I have no light.", "A lady never reveals her age. Mine is now a matter for historians."],
        story: [
            "I was the greatest actress in the county. It was a small county. It was a very great actress.",
            "We were mid-run when the water came. Act Three, and I'd just gone off for my change. I never came back on. The whole town was waiting for me!",
            "I have rehearsed that last speech every night since. I've got it perfect. There is nobody left to hear it who hasn't heard it nine thousand times.",
            "I'll tell you a secret, darling. I'm terrified of leaving the stage. Who am I in the wings, where nobody's clapping?",
            "One more curtain call. That's all. Flowers at my feet, the kind that shine, and then I'll exit like a lady.",
        ],
        favour: "Bring three Shining blooms, harvested under a full moon.", keepsake: "feather",
    },
    fennimore: {
        name: "Prof. Fennimore", title: "the naturalist", loves: ["pearlroot", "chimepea", "nightgrain"], likes: ["fruit"], glow: "#b4ffd0",
        lines: ["Fascinating! Have you considered pollination? I've considered little else.", "Leave a gap between two ripe plants. Nature abhors a vacuum and adores a gap."],
        story: [
            "I began the museum to catalogue every moth in Lull. There turned out to be one. I've been very thorough about her.",
            "That moth, Wick you call her? She arrived the very week your grandmother went quiet. I've never managed to key her out. No species fits.",
            "Moon crops cross when you leave them room. Two parents, one gap, a good dark night. Your grandmother taught me that. It should have been the other way round.",
            "I stay for the collection, I tell people. A catalogue is a way of saying nothing's truly gone. You'll note I'm a ghost saying this.",
            "Find me three new crops, things nobody has ever named. I'd like to leave something unfinished for somebody else. That's what science is.",
        ],
        favour: "Discover three hybrid crops.", keepsake: "moth",
    },
};
export const GHOST_LIST = Object.keys(GHOSTS);

// Gran's letters reach you at dawn, one at a time, each once the one before has been answered.
// Each has a small goal, so they double as the game's guide.
export const LETTERS = [
    { from: "Gran", body: "My dear, if you're reading this, the field is yours. I'm sorry about the ghosts. They're no trouble. They pay on time, and they say please.\n\nOpen the stall. Be kind. Don't let Auberon near your salt.", goal: "Serve a ghost at the stall", done: (s) => s.stats.served >= 1 },
    { from: "Gran", body: "The soil remembers. Clear the brambles and it will give you more than you give it.\n\nA drag over the bramble-line will do it, if you can spare the pennies.", goal: "Clear the West brambles", done: (s) => s.zones >= 2 },
    { from: "Gran", body: "Moonlight won't feed a person, however it looks. My cauldron is under the tarpaulin. Two things in a pot is cooking. Three is an opinion.", goal: "Cook a dish", done: (s) => s.stats.cooked >= 1 },
    { from: "Gran", body: "The lake is better company than it looks. Go down of a night and cast a line. It's good for you to sit still.", goal: "Catch 3 fish", done: (s) => s.stats.fish >= 3 },
    { from: "Gran", body: "Leave a gap of tilled soil between two ripe crops that like each other's company, and let the moon do the matchmaking. Ask the Professor. He will tell you. He will not stop.", goal: "Discover a hybrid crop", done: (s) => s.found.length >= 1 },
    { from: "Gran", body: "You'll have seen the ferry by now, and how nobody ever gets on. The old dock's in a state. Would you mend it? It would mean a great deal to some people who can't lift a plank.", goal: "Mend the dock", done: (s) => s.lantern >= 1 },
    { from: "Gran", body: "They'll start telling you the real reasons now. People do, once you've fed them. Listen properly. Nobody stays for the reason they give first.", goal: "Earn 3 hearts with two ghosts", done: (s) => Object.values(s.hearts).filter((h) => h >= 3 * HEART).length >= 2 },
    { from: "Gran", body: "The Long Lantern stood at the end of that dock. It takes a post and a lamp and a great deal of patience, and it has never once been cheap.", goal: "Raise the lantern post", done: (s) => s.lantern >= 2 },
    { from: "Gran", body: "Every lamp wants a flame that means something. Cross your two proudest crops, Emberbell and Pearlroot, and see what the moon makes of it.", goal: "Grow a Hearthlight", done: (s) => s.found.includes("hearthlight") },
    { from: "Gran", body: "Nearly there, my love. Each of them has one thing left to set down. Help them set it down. Then go and see Mrs. Quillon. She's been very patient about it.", goal: "Gather the six keepsakes", done: (s) => s.keepsakes.length >= 6 },
];

// A little scene at the lake on each full moon. Speaker null is narration.
export const MOON_SCENES = [
    [[null, "A light is crossing the lake. Slow, low, and very calm."], ["quillon", "Oh! There she is. Right on time, as ever."], ["bartleby", "The ferry. Comes every full moon, from the far shore."], [null, "One by one the ghosts drift down to the dock. Your moth settles on your shoulder."], ["fennimore", "Nothing to see, young keeper. She'll turn around presently."], [null, "She does."]],
    [[null, "The ferry noses up to the broken dock. Its gangplank lowers with a sigh."], ["odette", "After you, Mr. Reed."], ["bartleby", "Wouldn't dream of it. After you, ma'am."], ["auberon", "Ladies first, surely."], ["quillon", "Oh, but I insist. After you, Professor."], ["fennimore", "No, no. After you."], [null, "This goes on for some time. The ferry waits. Then, with the air of having done this before, it leaves."]],
    [[null, "The ferry comes again. The ghosts line up. Nobody moves."], ["you", "How long have you all been doing this?"], ["fennimore", "Thirty-one years. Three hundred and eighty-three sailings. I keep a tally."], ["bartleby", "Can't go before a lady. It wouldn't be right."], ["odette", "And I couldn't possibly go before the post."], ["quillon", "And I couldn't go before everyone's been delivered, dear."], [null, "They all look terribly pleased with how considerate they're being. Your moth sighs. You didn't know moths could."]],
    [[null, "Biscuit sits at the very end of the dock, tail going."], ["you", "But you could just... get on."], [null, "A long, shocked silence."], ["auberon", "And leave Odalys? Your gran fed this whole village for thirty years. She never left."], ["quillon", "One doesn't step ahead of Odalys Vane. It simply isn't done."], ["you", "But Gran's gone. Isn't she?"], ["odette", "Darling. Nobody here has ever said that."], [null, "On your shoulder, something very small stops breathing, as if hoping not to be noticed."]],
    [[null, "The ferry waits in the frost. The Long Lantern stands dark above it."], ["fennimore", "The old rule. The lamp must be lit by a living hand, with the things that kept them here."], ["bartleby", "Lit lantern means a clear crossing. Means anyone may go, and nobody's rude for going."], ["quillon", "We've not had a lit lamp since your grandmother's hands got too old to reach it."], [null, "So that's the whole of it. A village too kind to go first, and a lamp nobody could light."], [null, "Next full moon, perhaps, or the one after. The ghosts look at you and politely say nothing at all. They're very good at waiting."]],
];

export const GRAN_LAST_LETTER = "To The Keeper.\n\nHello, my love. If Mrs. Quillon has given you this, the lamp is ready, and you'll have worked out why a moth has been following you about.\n\nI couldn't leave you to it. I told them I'd stay till you were settled. They told me they'd not go before me. I said after you. They said after you. You know how it is here.\n\nYou've done it now, though. You've fed them. You've heard them.\n\nLight the lamp. Tell them it's all right to go. And when it's my turn, don't make a fuss.\n\nYour loving Gran. Odalys.\n\nP.S. The radishes want thinning.";

export const FINALE = [
    [null, "The full moon stands right over the dock. Everyone has come."],
    [null, "You hang the six keepsakes on the Long Lantern, and set the Hearthlight in the lamp."],
    ["you", "It's all right. You can go now. All of you. You've been very polite."],
    [null, "The lamp catches. Gold runs out across the water, right to the far shore. The ferry waits."],
    ["fennimore", "Well. After... no. No, I'll go. I'll go first. How extraordinary. Three hundred and eighty-six sailings!"],
    ["odette", "Hold your applause, darling. No, on second thoughts, don't."],
    [null, "You clap. You clap until your hands hurt. She takes the deepest bow Lull has ever seen."],
    ["auberon", "Thursday tomorrow, I shouldn't wonder. I've brought the recipe."],
    ["bartleby", "Come on then, boy. Come on, Biscuit. Good lad. Best lad."],
    [null, "He doesn't need telling twice. He's first up the plank after all, and then back, and then up again."],
    ["quillon", "Forty-one years, and a clean sheet. Goodbye, dear. Do write."],
    [null, "Your moth lifts from your shoulder and hangs in the gold. Just for a moment, she isn't a moth."],
    ["gran", "Look at you. Look at that field."],
    ["you", "After you, Gran."],
    ["gran", "Oh, you cheeky thing."],
    [null, "The ferry turns. Its one small light goes out across the lake, a long way, and very calmly."],
    [null, "You stay until it's gone. Then you go home, because the radishes want thinning."],
];
export const EPILOGUE = "The Lantern stays lit. Ghosts from further off have started to hear of a stall that says please.\n\nThe far shore has a very good ferry service. Your friends visit on market days.";
