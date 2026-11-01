// All the words and numbers in Ramen Rush. No Pogo imports, so bots can read it directly.

export const BROTHS = {
    shoyu:    { name: "Shoyu",    frame: 0, price: 260, color: "#a9622a", deep: "#6e3414", light: "#dd9a4e" },
    shio:     { name: "Shio",     frame: 1, price: 260, color: "#e6bb62", deep: "#b98a38", light: "#f8e29a" },
    miso:     { name: "Miso",     frame: 2, price: 320, color: "#cf8f43", deep: "#955a22", light: "#ebbc72" },
    tonkotsu: { name: "Tonkotsu", frame: 3, price: 380, color: "#f1e2c4", deep: "#cdb48c", light: "#fff8e8" },
    tantan:   { name: "Tantan",   frame: 4, price: 360, color: "#d8542a", deep: "#94301a", light: "#f59a4c" },
};

// cook is seconds until the perfect window opens.
export const NOODLES = {
    thin:  { name: "Thin",  frame: 0, cook: 2.4, price: 0 },
    wavy:  { name: "Wavy",  frame: 1, cook: 3.2, price: 20 },
    thick: { name: "Thick", frame: 2, cook: 4.2, price: 40 },
};

// Slot is the place in the bowl, as a polar position in unit-bowl space, so every combination composes well.
// `sliced` toppings must be chopped on the board first. The others come ready.
export const TOPPINGS = {
    chashu:   { name: "Chashu",   frame: 0,  sliced: true,  slot: [0.50, -0.02], size: 0.52 },
    egg:      { name: "Egg",      frame: 1,  sliced: true,  slot: [-0.46, 0.30], size: 0.46 },
    negi:     { name: "Scallion", frame: 2,  sliced: true,  slot: [0.02, -0.06], size: 0.36 },
    nori:     { name: "Nori",     frame: 3,  sliced: false, slot: [-0.44, -0.56], size: 0.46 },
    swirl:    { name: "Swirl",    frame: 4,  sliced: true,  slot: [0.14, 0.58], size: 0.36 },
    bamboo:   { name: "Bamboo",   frame: 5,  sliced: false, slot: [0.30, -0.56], size: 0.44 },
    shrimp:   { name: "Shrimp",   frame: 6,  sliced: false, slot: [0.56, 0.36], size: 0.42 },
    peas:     { name: "Snap Peas",frame: 7,  sliced: false, slot: [-0.60, -0.10], size: 0.42 },
    tomato:   { name: "Tomato",   frame: 8,  sliced: true,  slot: [0.14, 0.58], size: 0.42 },
    mushroom: { name: "Mushroom", frame: 9,  sliced: true,  slot: [-0.60, -0.10], size: 0.44 },
    corn:     { name: "Corn",     frame: 10, sliced: false, slot: [0.30, -0.56], size: 0.46 },
    butter:   { name: "Butter",   frame: 11, sliced: false, slot: [-0.10, 0.30], size: 0.30 },
};

const R = (name, broth, noodle, tops, season, note, cost = 0) => ({ name, broth, noodle, tops, season, note, cost });

export const RECIPES = {
    // Street cart, spring
    plain:     R("Plain Shoyu", "shoyu", "thin", ["negi"], "spring", "Start here. Everybody starts here. Don't skip the scallion."),
    nana:      R("Nana's Shoyu", "shoyu", "thin", ["chashu", "negi"], "spring", "Fifty years on one pot. Skim it, and never let it boil angry."),
    night:     R("Night Shio", "shio", "thin", ["nori", "negi"], "spring", "For nurses, taxi drivers and the broken-hearted. Light on the salt."),
    sunrise:   R("Sunrise Shoyu", "shoyu", "thin", ["egg", "chashu", "negi"], "spring", "Goro's breakfast since before you were born. Egg goes in soft.", 2400),
    bloom:     R("First Bloom Shio", "shio", "wavy", ["shrimp", "peas"], "spring", "When the peas come in, stop arguing and make this.", 3800),
    garden:    R("Garden Miso", "miso", "wavy", ["peas", "bamboo", "egg"], "spring", "Mina swears it cured her cold. It did not. Serve it anyway.", 5200),
    // Station stall, summer
    express:   R("Express Miso", "miso", "wavy", ["corn", "negi"], "summer", "Ninety seconds, chopsticks to last sip. Rocco holds the record."),
    redline:   R("Red Line Shio", "shio", "thin", ["tomato", "egg"], "summer", "Tomato in ramen? Yes. Tell the Professor it was his idea."),
    platform:  R("Platform Tonkotsu", "tonkotsu", "thin", ["chashu", "swirl", "negi"], "summer", "Sixteen hours of bones, gone in four minutes. That's the deal."),
    heatwave:  R("Heatwave Tantan", "tantan", "thick", ["negi", "tomato", "egg"], "summer", "Eat something hot on a hot day. Nobody knows why it works.", 8000),
    lasttrain: R("Last Train", "shoyu", "wavy", ["chashu", "egg", "nori", "swirl"], "summer", "For whoever's still on the platform. Give them everything.", 11000),
    // Seaside shop, autumn
    harbour:   R("Harbour Shio", "shio", "thin", ["shrimp", "nori", "swirl"], "autumn", "Salt, sea, a little sweetness. Goro's late wife's favourite."),
    fisher:    R("Fisher's Miso", "miso", "thick", ["shrimp", "corn", "negi"], "autumn", "Eat it in oilskins, on a crate, if you want it properly."),
    tide:      R("Mushroom Tide", "shoyu", "thick", ["mushroom", "bamboo", "egg"], "autumn", "Dark, deep, and quieter than it looks.", 15000),
    golden:    R("Golden Hour", "tonkotsu", "wavy", ["mushroom", "chashu", "nori"], "autumn", "Serve at sunset. Say nothing. Let them look at it first.", 19000),
    gullsbane: R("Gull's Bane", "tantan", "wavy", ["shrimp", "egg", "negi", "nori"], "autumn", "Hot enough that no bird has ever finished one.", 23000),
    // Grand noodle hall, winter
    snow:      R("Snow Miso", "miso", "thick", ["corn", "butter", "chashu"], "winter", "Butter on the top, last thing. Watch it slide. That's the whole trick."),
    hall:      R("Hall Tonkotsu", "tonkotsu", "thin", ["chashu", "egg", "negi", "nori"], "winter", "The bowl the Hall was built on, the winter your nana was nineteen."),
    lantern:   R("Lantern Tantan", "tantan", "thick", ["butter", "corn", "negi"], "winter", "Red as the lamps outside. Odalys sang for one of these once.", 30000),
    grand:     R("The Grand Bowl", "tonkotsu", "thick", ["chashu", "egg", "swirl", "nori", "corn"], "winter", "Everything you've learned, in one bowl. Mind the rim.", 42000),
    lastpage:  R("Umi's Last Page", "shoyu", "thin", ["chashu", "egg", "negi", "nori"], "winter", "The same shoyu. Fifty years on. It was only ever about who it's for."),
};
for (const r of Object.values(RECIPES)) r.price = BROTHS[r.broth].price + NOODLES[r.noodle].price + r.tops.length * 80;
export const SEASON_LABEL = { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" };

// Personalities: a colour-free cast list. `look` is read by people.js. `lines` are what they remember:
// first (first visit), perfect, good, poor (last bowl was weak or they walked out), page (their gift line).
export const REGULARS = {
    goro: { name: "Old Goro", title: "retired trawlerman", fav: "sunrise", alt: "nana", patience: 1.1, gift: "sunrise", look: 0, lines: {
        first: ["Your nana's ladle. Careful with it.", "So you're the grandchild. Hm. Sit? No. I sit, you cook."],
        perfect: ["That {r} last night. I told the harbour cat about it.", "Same again. Don't let it go to your head."],
        good: ["Bit of salt in that {r}. Same again tomorrow.", "Better than the sea. Not by much. Again."],
        poor: ["Last time wasn't your night. Everyone gets one.", "I've eaten worse. On a boat. In a storm. Try again."],
        page: ["Your nana gave me this in '81. Think it's yours now."] } },
    mina: { name: "Mina", title: "night-shift nurse", fav: "night", alt: "plain", patience: 1.25, gift: "garden", look: 1, lines: {
        first: ["Twelve hours on my feet. Please be open.", "Oh, you're new. Umi's grandchild? You've got her hands."],
        perfect: ["I thought about your {r} all through rounds.", "That {r} got me through a double shift."],
        good: ["The {r} was lovely last time. Warm, like a hug.", "Back again. It's this or vending machine crackers."],
        poor: ["You looked tired last time. Eat something yourself, okay?", "Slow night last time? No harm. I'm a patient patient."],
        page: ["A patient's wife gave this to Umi. Umi gave it to me. Here."] } },
    tam: { name: "Professor Tam", title: "keeps ratings in a notebook", fav: "bloom", alt: "night", patience: 0.95, gift: "bloom", look: 2, lines: {
        first: ["Bowl one. I shall be making notes.", "Do not mind the notebook. It minds you."],
        perfect: ["I gave your {r} four and three-quarter spoons.", "My notes say {r}: 'unreasonably good'. I underlined it."],
        good: ["Your {r}: three and a half spoons. Room to grow.", "The {r} was competent. That is praise."],
        poor: ["I have torn out last week's page. Fresh start.", "My notes from last time are... charitable."],
        page: ["Cited in my thesis, this recipe. Footnote nine."] } },
    pip: { name: "Pip", title: "counts coins, wants extra egg", fav: "plain", alt: "nana", patience: 1.3, gift: "redline", look: 3, lines: {
        first: ["I have exactly enough. I counted twice.", "Is it true you can see your face in the broth?"],
        perfect: ["I told my whole class about the {r}!", "The {r} was SO good I drew it. Want to see?"],
        good: ["Can I have the {r} again? I saved up.", "I found a coin. So I'm back."],
        poor: ["It's okay. My mum burns toast and she's a grown-up.", "I'm not cross. I just came for a bowl."],
        page: ["Found this in the school bin. It smells like tomato?"] } },
    odalys: { name: "Madame Odalys", title: "retired opera star", fav: "platform", alt: "express", patience: 1.0, gift: "lantern", look: 4, lines: {
        first: ["Darling. I require a bowl. And an audience.", "I was told this stall has soul. Prove it."],
        perfect: ["Your {r}, darling! I wept in the second act!", "An encore of the {r}. I insist."],
        good: ["The {r} had promise. The third movement dragged.", "Bravo, mostly. Again, with feeling."],
        poor: ["Even Callio forgot her lines once. Once. Again!", "We shall not speak of last time. Maestro, please."],
        page: ["Sung for this recipe in the winter of the great snow. Take it."] } },
    rocco: { name: "Rocco", title: "bike courier, always late", fav: "express", alt: "redline", patience: 0.7, gift: "heatwave", look: 5, lines: {
        first: ["Quick quick quick. Got a parcel going cold.", "Fastest bowl in town, they said? Clock's on."],
        perfect: ["That {r} shaved four seconds off my whole day.", "Your {r} beat my personal best. Again!"],
        good: ["Decent lap last time. Go again.", "Not bad on the {r}. Can it go faster?"],
        poor: ["Had to bail last time! Parcel. Not you. Parcel.", "We'll get our timing right. Go go go."],
        page: ["Courier fee: one recipe, signed for. Sign here. Done."] } },
    fen: { name: "Auntie Fen", title: "runs the rival stall", fav: "harbour", alt: "platform", patience: 0.9, gift: "golden", look: 6, lines: {
        first: ["I'm only here to see what's wrong with it.", "Umi's grandchild, hm? We'll see, we'll see."],
        perfect: ["...Your {r} was acceptable. Don't tell anyone I came.", "Hmph. Who taught you the {r} like that? Don't answer."],
        good: ["I've had worse {r}. I've made worse, once. In 1974.", "You rushed the {r}. But your hands are learning."],
        poor: ["Ha! Now that's more like the competition I want.", "Don't look so sad. It's only soup. It is never only soup."],
        page: ["Stole this from your grandmother. Fifty years ago. Stop smiling."] } },
    daichi: { name: "Daichi", title: "salaryman who wants to paint", fav: "lasttrain", alt: "platform", patience: 0.85, gift: "gullsbane", look: 7, lines: {
        first: ["One more spreadsheet and I'll scream. One bowl, please.", "Is this seat taken? Is anything? I've missed my train."],
        perfect: ["I sketched your {r} on a sales report.", "I sat in the bathroom at work and thought about that {r}."],
        good: ["The {r} was the best part of Tuesday.", "Same seat. Same bowl. Different spreadsheet."],
        poor: ["Bad day for us both last time, I think.", "My boss says 'circle back'. So I did."],
        page: ["I quit. I paint boats now. This was in the frame I bought."] } },
};

// Everyone else. Painted from the same kit, drawn in several looks.
export const PASSERS = ["Stranger", "Student", "Taxi driver", "Fishmonger", "Commuter", "Tourist"];

export const LOCATIONS = [
    { id: "cart", name: "Street Cart", place: "Lantern Lane", season: "spring", seats: 3, cost: 0, blurb: "One burner, three stools, and the whole of the lane walking past.",
      rule: "Small and calm. One burner to mind." },
    { id: "station", name: "Station Stall", place: "Sunline, Platform 4", season: "summer", seats: 4, cost: 8000, blurb: "Trains come in, the crowd comes with them. Then silence. Then the next one.",
      rule: "Trains bring waves. Prep in the quiet." },
    { id: "seaside", name: "Seaside Shop", place: "Gull Point", season: "autumn", seats: 4, cost: 24000, blurb: "Salt on the windows, a slower crowd, and gulls with no shame at all.",
      rule: "Tap gulls away from your toppings." },
    { id: "hall", name: "Grand Noodle Hall", place: "Old Market Square", season: "winter", seats: 5, cost: 46000, blurb: "Your nana's first kitchen, shut for thirty years. Five stools. Long tables. Snow.",
      rule: "Banquet parties: serve them together." },
];

// Between shifts. `kit` adds to a location's base. Costs were set by tools/bot.mjs.
export const KIT = {
    pot:    { name: "Extra Burner", desc: "One more noodle pot on the stove.", levels: [1800, 16000], max: 2, icon: 0 },
    bowl:   { name: "Extra Bowl Slot", desc: "Work one more bowl at a time.", levels: [2600, 22000], max: 2, icon: 1 },
    knife:  { name: "Sharper Knife", desc: "Each chop gives one more slice.", levels: [1400], max: 1, icon: 2 },
    ladle:  { name: "Steady Ladle", desc: "A wider perfect pour.", levels: [2200], max: 1, icon: 3 },
    stools: { name: "Soft Stools", desc: "Everyone will wait a little longer.", levels: [3500, 15000], max: 2, icon: 4 },
};
export const STAFF = {
    mio:   { name: "Mio", role: "Apprentice", desc: "Keeps an empty board chopped.", cost: 6000, unlock: 6, look: 8, line: "I can chop! I've watched videos!" },
    tetsu: { name: "Tetsu", role: "Noodle Master", desc: "Noodles hold their perfect window longer.", cost: 12000, unlock: 12, look: 9, line: "Noodles are patient, if you are." },
    hana:  { name: "Hana", role: "Host", desc: "Waiting customers stay calm for longer.", cost: 22000, unlock: 18, look: 10, line: "They're not waiting. They're anticipating." },
    sora:  { name: "Sora", role: "Runner", desc: "Slides finished bowls out for you.", cost: 40000, unlock: 24, look: 11, line: "Fast hands. Short sentences. Bowl." },
};

// Cosmetics. Everything is visible at the counter.
export const DECOR = {
    noren: { label: "Curtain", items: [
        { id: "red", name: "Lacquer Red", cost: 0, a: "#a92d27", b: "#7c1d1f", ink: "#fbeed3" },
        { id: "indigo", name: "Night Indigo", cost: 1200, a: "#2f3f73", b: "#212c55", ink: "#fbeed3" },
        { id: "forest", name: "Pine Green", cost: 2400, a: "#33694e", b: "#234a38", ink: "#fbeed3" },
        { id: "plum", name: "Ume Plum", cost: 4800, a: "#7a2e62", b: "#561f45", ink: "#ffe9c9" },
        { id: "gold", name: "Hall Gold", cost: 18000, a: "#d59a2c", b: "#a56f18", ink: "#3a1d0f" },
    ] },
    lantern: { label: "Lanterns", items: [
        { id: "amber", name: "Amber Paper", cost: 0, c: "#f6a53a", g: "#ffb757" },
        { id: "rose", name: "Rose Paper", cost: 1500, c: "#ee6f6a", g: "#ff8f7e" },
        { id: "moon", name: "Moon Paper", cost: 3200, c: "#f3e9c0", g: "#ffeec8" },
        { id: "sea", name: "Sea Glass", cost: 9000, c: "#58c7b4", g: "#7fe0cc" },
    ] },
    glaze: { label: "Bowl Glaze", items: [
        { id: "cloud", name: "Cloud White", cost: 0 },
        { id: "wave", name: "Blue Wave", cost: 1000 },
        { id: "ember", name: "Ember Red", cost: 3000 },
        { id: "moss", name: "Moss Speckle", cost: 7000 },
        { id: "night", name: "Gold Night", cost: 20000 },
    ] },
    charm: { label: "Counter Charm", items: [
        { id: "none", name: "Bare Counter", cost: 0 },
        { id: "tanuki", name: "Lucky Tanuki", cost: 2000 },
        { id: "doll", name: "Round Red Doll", cost: 5000 },
        { id: "bonsai", name: "Little Pine", cost: 8000 },
        { id: "radio", name: "Nana's Radio", cost: 14000 },
    ] },
};

const W = (n, gap, pause = 8) => ({ n, gap, pause });
const S = (title, loc, o) => ({ title, loc, ...o });

// Every shift. waves are arrivals. `base` is the kit you get for free, so no purchase is ever required to get three stars.
// `say` is who speaks before the shift, and what. `post` is a postcard after it.
export const SHIFTS = [
    // --- STREET CART, SPRING ---
    S("First Night", 0, { waves: [W(3, 8)], menu: ["plain"], patience: 70, base: [1, 1], cast: ["goro"], gift: ["plain"], teach: 1,
      say: ["goro", "Cart's still warm. Your nana's ladle's on the hook. One bowl at a time. Nobody's rushing you."] }),
    S("Stool Number Two", 0, { waves: [W(4, 11)], menu: ["plain", "nana"], patience: 60, base: [1, 1], cast: ["mina"], gift: ["nana"], teach: 2,
      say: ["mina", "Goro says you can cook. Goro also says the moon is a fish. Chashu needs chopping, by the way: swipe across it."] }),
    S("A Little Queue", 0, { waves: [W(5, 10)], menu: ["plain", "nana"], patience: 55, base: [1, 1], cast: ["goro", "pip"], teach: 3,
      say: ["pip", "There's a queue! I've never been in a queue! Do I get a number?"] }),
    S("Night Shio", 0, { waves: [W(5, 9)], menu: ["nana", "night"], patience: 55, base: [1, 1], cast: ["mina", "goro"], gift: ["night"], teach: 4,
      say: ["mina", "Umi kept this recipe for the night crowd. Second pot's on the left. Keep them straight."] }),
    S("Goro's Spare Bowl", 0, { waves: [W(3, 5), W(3, 7)], menu: ["plain", "nana", "night"], patience: 50, base: [2, 1], cast: ["goro", "tam"],
      say: ["goro", "Dug this out of the shed. Two bowls at once. Don't look at me like that, it's only a bowl."] }),
    S("The Professor Takes Notes", 0, { waves: [W(3, 6), W(4, 6)], menu: ["nana", "night", "sunrise"], patience: 50, base: [2, 1], cast: ["tam", "pip"],
      say: ["tam", "I am compiling a survey of this lane's noodles. You are, at present, the survey."] }),
    S("Rain on the Awning", 0, { waves: [W(4, 5), W(4, 6)], menu: ["plain", "nana", "night", "bloom"], patience: 46, base: [2, 2], cast: ["mina", "tam"], rain: true,
      say: ["mina", "Everyone's sheltering under your awning. Might as well feed them."] }),
    S("Lantern Festival", 0, { waves: [W(3, 5), W(5, 4), W(4, 5)], menu: ["plain", "nana", "night", "sunrise", "bloom"], patience: 44, base: [2, 2], cast: ["goro", "mina", "pip", "tam"], rush: 1, finale: true,
      say: ["goro", "Whole town's out tonight. Your nana did this festival forty years running. Don't let the broth run dry."],
      post: "Dear one. Goro writes that you can hold a ladle. I hear a stall has come up at the station. Trains don't wait, and neither does broth. Go on. Love, Nana." }),

    // --- STATION STALL, SUMMER ---
    S("Platform 4", 1, { waves: [W(4, 3.5, 16), W(3, 4)], menu: ["plain", "express"], patience: 42, base: [2, 2], cast: ["rocco"], gift: ["express"], train: true,
      say: ["rocco", "New stall? Great. Train's in, everyone's got ninety seconds. Watch the board, cook in the quiet."] }),
    S("The 7:42", 1, { waves: [W(4, 3, 16), W(4, 3.5, 16), W(2, 5)], menu: ["night", "express", "redline"], patience: 40, base: [2, 2], cast: ["daichi", "rocco"], gift: ["redline"], train: true,
      say: ["daichi", "I've caught the 7:42 for eleven years. I have never once wanted to. One bowl, please."] }),
    S("Tomato? In Ramen?", 1, { waves: [W(4, 3, 16), W(5, 3.5)], menu: ["express", "redline"], patience: 40, base: [2, 2], cast: ["tam", "pip"], train: true,
      say: ["tam", "I have been told, by a reliable child, that tomato belongs in shio. I intend to disprove this."] }),
    S("Bones and Patience", 1, { waves: [W(5, 3, 16), W(4, 3.5, 14), W(2, 5)], menu: ["express", "platform", "redline"], patience: 40, base: [2, 2], cast: ["odalys", "daichi"], gift: ["platform"], train: true,
      say: ["odalys", "Darling! I have disembarked. Sixteen hours of bones, they tell me. I shall be the judge of that."] }),
    S("Heatwave", 1, { waves: [W(5, 3, 15), W(5, 3, 15)], menu: ["express", "redline", "heatwave"], patience: 34, base: [2, 2], cast: ["rocco", "mina"], heat: true, train: true,
      say: ["mina", "It's forty degrees and they want hot soup. People are wonderful. They won't wait long, though."] }),
    S("Signal Failure", 1, { waves: [W(8, 2.5, 10), W(4, 4)], menu: ["night", "express", "platform"], patience: 52, base: [2, 2], cast: ["daichi", "odalys"], train: true,
      say: ["daichi", "Signal failure. Nobody's going anywhere. Everybody's hungry and strangely calm."] }),
    S("Rush Hour", 1, { waves: [W(5, 2.8, 13), W(5, 2.8, 13), W(4, 3.2)], menu: ["express", "platform", "lasttrain"], patience: 36, base: [2, 3], cast: ["rocco", "daichi", "tam"], rush: 1, train: true,
      say: ["rocco", "Three trains, back to back. I've put money on you. Don't tell Tam."] }),
    S("Last Train", 1, { waves: [W(5, 2.8, 12), W(6, 2.8, 12), W(5, 3)], menu: ["platform", "lasttrain", "heatwave"], patience: 36, base: [2, 3], cast: ["daichi", "odalys", "rocco", "mina"], rush: 1, finale: true, train: true, gift: ["lasttrain"],
      say: ["daichi", "Last train of summer. I handed in my notice today. Feed me, then I'm going to go and paint something."],
      post: "Dear one. The sea air is doing my knees no favours, but there is a little shop going at Gull Point, next to mine. The gulls are terrible. You'll love it. Love, Nana." }),

    // --- SEASIDE SHOP, AUTUMN ---
    S("Gull Point", 2, { waves: [W(3, 7), W(4, 6)], menu: ["night", "harbour"], patience: 50, base: [2, 2], cast: ["goro"], gift: ["harbour"], gulls: 2,
      say: ["goro", "Followed you down the coast. Mind the gulls. Tap 'em before they thieve your board."] }),
    S("A Visit From Auntie", 2, { waves: [W(4, 6), W(4, 5)], menu: ["night", "harbour", "fisher"], patience: 46, base: [2, 2], cast: ["fen"], gift: ["fisher"], gulls: 2,
      say: ["fen", "So this is the place. Small. Damp. I've come to see what's wrong with it. Thick noodle, and don't dawdle."] }),
    S("Low Tide", 2, { waves: [W(5, 5), W(4, 5)], menu: ["harbour", "fisher", "plain"], patience: 46, base: [2, 2], cast: ["goro", "tam"], gulls: 3,
      say: ["tam", "A study of the local gull. Bold. Unrepentant. It took my pen."] }),
    S("Golden Hour", 2, { waves: [W(4, 5), W(5, 4.5)], menu: ["fisher", "harbour", "express"], patience: 42, base: [2, 2], cast: ["odalys", "fen"], gulls: 3,
      say: ["odalys", "Look at that light, darling. One simply cannot be sad at this hour. One can, however, be hungry."] }),
    S("Storm Coming", 2, { waves: [W(6, 4), W(5, 4)], menu: ["harbour", "fisher", "platform"], patience: 40, base: [2, 3], cast: ["goro", "rocco"], gulls: 4, rain: true,
      say: ["goro", "Glass is falling. Boats are in. Every hand on the quay's about to want soup."] }),
    S("Mushroom Season", 2, { waves: [W(5, 4), W(6, 4)], menu: ["fisher", "tide"], patience: 40, base: [2, 3], cast: ["fen", "mina"], gulls: 3, gift: ["tide"],
      say: ["mina", "I took a week off. First time in six years. I came to the sea and I'm in your queue."] }),
    S("The Gull Rebellion", 2, { waves: [W(5, 3.6), W(5, 3.6), W(4, 4)], menu: ["harbour", "fisher", "platform"], patience: 40, base: [3, 3], cast: ["tam", "pip"], gulls: 7, rush: 1,
      say: ["pip", "There are SO many gulls. I counted to forty and then one took my hat."] }),
    S("Last of the Light", 2, { waves: [W(5, 3.4), W(6, 3.4), W(5, 3.6)], menu: ["harbour", "platform", "golden"], patience: 40, base: [3, 3], cast: ["goro", "fen", "odalys", "daichi"], gulls: 4, rush: 1, finale: true,
      say: ["fen", "Your nana and I opened a kitchen together, you know. Before all of you. A great big ridiculous hall."],
      post: "Dear one. Fen told you, then. The Noodle Hall has stood empty for thirty years and they mean to pull it down. I'm too old to stop them. You're not. Love, Nana." }),

    // --- GRAND NOODLE HALL, WINTER ---
    S("Dust Sheets", 3, { waves: [W(4, 5), W(5, 4.5)], menu: ["harbour", "snow"], patience: 44, base: [3, 3], cast: ["fen"], gift: ["snow"], party: 2,
      say: ["fen", "Fifty years and it still smells of bones. Don't look at me like that, there's dust in my eye. Light the stove."] }),
    S("Table for Three", 3, { waves: [W(5, 4), W(6, 4)], menu: ["snow", "platform", "fisher"], patience: 44, base: [3, 3], cast: ["tam", "pip"], party: 3,
      say: ["pip", "We brought my whole family! Families have to get their bowls together, it's a rule. I made it up."] }),
    S("The Hall Tonkotsu", 3, { waves: [W(6, 3.6), W(6, 3.6)], menu: ["snow", "hall"], patience: 42, base: [3, 3], cast: ["odalys", "mina"], gift: ["hall"], party: 3,
      say: ["odalys", "I sang here once, darling, on that very table. They paid me in soup. I have never been happier."] }),
    S("First Snow", 3, { waves: [W(6, 3.4), W(7, 3.4)], menu: ["hall", "snow", "express"], patience: 40, base: [3, 3], cast: ["goro", "rocco"], party: 3, snow: true,
      say: ["rocco", "Bike's stuck in a drift. Delivered the last parcel on foot. Then I smelled this place."] }),
    S("Staff Dinner", 3, { waves: [W(7, 3.2), W(7, 3.2)], menu: ["hall", "platform", "harbour"], patience: 40, base: [3, 3], cast: ["daichi", "tam"], party: 4,
      say: ["daichi", "I painted the Hall. It's terrible. Can I hang it in the corner? I'll have the usual."] }),
    S("The Inspector", 3, { waves: [W(6, 3), W(7, 3), W(4, 3.4)], menu: ["hall", "snow", "plain"], patience: 38, base: [3, 3], cast: ["tam", "fen"], party: 4, rush: 1,
      say: ["fen", "Council man's coming to decide if this place stays. Feed him as if it matters. Feed everyone as if it matters."] }),
    S("Whole Town", 3, { waves: [W(7, 2.9), W(7, 2.9), W(6, 3)], menu: ["hall", "platform", "harbour", "plain"], patience: 38, base: [3, 3], cast: ["goro", "mina", "pip", "odalys"], party: 4, rush: 1,
      say: ["mina", "They've all come. Everyone from the lane, the station, the Point. Word got round. I may have helped."] }),
    S("Nana's Table", 3, { waves: [W(6, 3), W(8, 2.9), W(6, 3.2)], menu: ["hall", "snow", "plain", "lastpage"], patience: 38, base: [3, 3], cast: ["goro", "mina", "tam", "pip", "odalys", "rocco", "fen", "daichi"], party: 4, rush: 1, finale: true, last: true, gift: ["lastpage"],
      say: ["goro", "Big night. Oh. And there's a table by the stove been reserved since morning. Small old woman. Won't say a word till she's eaten."] }),
];

// What each move-in says when you unlock a new place.
export const ENDING = [
    "The last bowl goes out. Shoyu. The same shoyu. Skimmed, and never boiled angry.",
    "She looks at it for a long time. Then she eats, every drop, and sets the spoon down.",
    "\"Too much salt,\" says Nana. And she holds out the bowl for more.",
];

export const PROLOGUE = "Nana Umi has hung up her apron. She left you a cart, a ladle, and a cookbook with half its pages given away. Her note says: Feed them well. They'll give you the rest.";
export const NANA = { name: "Nana Umi", look: 12 };
