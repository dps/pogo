// The words of the game: people, letters, stamps, the planes you fold, the times of day.
export const PEOPLE = {
    wren: { name: "Wren Alder", role: "Postmistress", home: "post", hair: "#e9e4d8", skin: "#eec5a4", coat: "#c8452f", hat: "bun" },
    agnes: { name: "Agnes Rye", role: "Baker", home: "bakery", hair: "#8a8079", skin: "#f0c9a8", coat: "#f6e7c8", hat: "cap" },
    tomas: { name: "Tomas Keel", role: "Lighthouse keeper", home: "light", hair: "#d6d2c8", skin: "#d9a57e", coat: "#2f5f73", hat: "beard" },
    pim: { name: "Pim Marlow", role: "Aged nine", home: "marlow", hair: "#c8602f", skin: "#f3cdb0", coat: "#efc15f", hat: "plaits" },
    nell: { name: "Nell Marlow", role: "Net mender", home: "fish", hair: "#6b3f2a", skin: "#eec5a4", coat: "#3f8c8e", hat: "scarf" },
    oake: { name: "Gerald Oake", role: "Grower of pears", home: "oake", hair: "#a7a39a", skin: "#e4b590", coat: "#5f7d4e", hat: "flat" },
    finch: { name: "Dora Finch", role: "Owner of a cat", home: "finch", hair: "#b0a0c0", skin: "#f0c9a8", coat: "#cdb9d4", hat: "bun" },
    quill: { name: "Edith Quill", role: "Retired teacher", home: "school", hair: "#d8d4cc", skin: "#efcbae", coat: "#54657f", hat: "specs" },
    bram: { name: "Bram Sorrel", role: "The new boy", home: "inn", hair: "#3d2c26", skin: "#a9744f", coat: "#d9593f", hat: "none" },
    hester: { name: "Hester Bell", role: "Bell ringer", home: "chapel", hair: "#2e2a33", skin: "#c98f6a", coat: "#7a4b6e", hat: "none" },
    cobb: { name: "Old Cobb", role: "Miller", home: "mill", hair: "#ece8df", skin: "#d9a57e", coat: "#a9744f", hat: "beard" },
    ines: { name: "Ines Vale", role: "Harbour master", home: "harbour", hair: "#1f2430", skin: "#c98f6a", coat: "#2f5f73", hat: "flat" },
};

// after: this letter appears once that one has been delivered. Everything else in a chapter is open from the start.
export const LETTERS = [
    // ---- Morning: nobody here has said what they mean for years.
    { id: "m1", ch: 0, from: "pim", to: "agnes", text: "Dear Mrs Rye, I have saved four pennies. Is that enough for one of the loaves shaped like a fish? It's for Dad when the Kittiwake comes home tonight. Please keep it secret from the fish." },
    { id: "m2", ch: 0, from: "agnes", to: "tomas", after: "m1", text: "Tomas. Forty years I've sent you the heel of the first loaf, and you've never once said if you like it. Today's has caraway. Eat it while it's warm, you stubborn man. Pim's four pennies were plenty, by the way. Don't tell her they weren't." },
    { id: "m3", ch: 0, from: "tomas", to: "agnes", after: "m2", text: "Agnes. I have never liked caraway. I have eaten every one." },
    { id: "m4", ch: 0, from: "oake", to: "finch", text: "Madam. Your cat has again sat on my seedlings. I enclose the evidence: one muddy paw print, on card, labelled. G. Oake." },
    { id: "m5", ch: 0, from: "finch", to: "oake", after: "m4", text: "Mr Oake. What a good likeness. I've framed it. Your pears hang over my fence, as they have since 1974. I enclose the evidence: one core. It was delicious. D. Finch." },
    { id: "m6", ch: 0, from: "bram", to: "quill", text: "Dear Miss Quill. I'm the new boy at the Inn. In the Saturday class I didn't put my hand up because I don't know anybody here yet. I knew the answer, though. It was seven." },

    // ---- Noon: help is asked for.
    { id: "n1", ch: 1, from: "quill", to: "bram", text: "Bram. It was seven. My eyes aren't what they were and small print has gone to fog. I need a clear voice to read me the paper at noon. I pay in biscuits and in knowing things. Are you free? E. Quill." },
    { id: "n2", ch: 1, from: "bram", to: "pim", after: "n1", text: "Hello. Miss Quill says you know where the best rock pools are. I read to her at noon now, but I'm free after. I haven't got a bucket. I'm Bram. The new one." },
    { id: "n3", ch: 1, from: "pim", to: "bram", after: "n2", text: "Meet at the slipway. I have two buckets. I am in charge. Pim." },
    { id: "n4", ch: 1, from: "ines", to: "nell", text: "Nell. The Kittiwake called in at dawn. Trouble with her engine out by the Skerries, all hands well. She'll be in after dark tonight, on the tide, and not a minute before. Ines." },
    { id: "n5", ch: 1, from: "nell", to: "tomas", after: "n4", text: "Tomas, Joss brings her in after dark, past the Skerries, on the turn of the tide. I know you never miss a night. I wanted to ask anyway. Keep it bright for him. Nell." },
    { id: "n6", ch: 1, from: "tomas", to: "cobb", after: "n5", text: "Cobb. The drive gear on my lamp has worn through. It won't turn tonight. You're the only man left who can cut one. I know we haven't spoken since 1961. Tomas." },

    // ---- Golden hour: the town begins to lean towards itself.
    { id: "g1", ch: 2, from: "cobb", to: "tomas", text: "It was 1959, and you were wrong about the weather. I'll cut your gear. It'll want a day and a night on the lathe, and you've not got that. Sit tight. Cobb. P.S. I kept your good hammer." },
    { id: "g2", ch: 2, from: "tomas", to: "ines", after: "g1", text: "Ines. There'll be no lamp tonight. I've kept it lit for forty-one years and I don't know how to write this sentence. Don't tell Nell yet. Tell me what to do." },
    { id: "g3", ch: 2, from: "ines", to: "finch", after: "g2", text: "Dora. You've the highest window on Top Lane and the worst habit of knowing everyone's business. So you'll know already. If a boat can't see the lighthouse, what could she see instead? Ines." },
    { id: "g4", ch: 2, from: "finch", to: "oake", after: "g3", text: "Mr Oake. I have eleven jam jars and no pride. Every window on this hill, lit, top to bottom, is a line a boat could steer by. You have the candles from your greenhouse. Please. It's for the Marlow child. Dora." },
    { id: "g5", ch: 2, from: "oake", to: "hester", after: "g4", text: "Miss Bell. At dusk would you ring the bell, and keep ringing? They'll need a sound to steer by too. Mrs Finch is organising us. It's terrifying. I find I don't mind. Gerald." },
    { id: "g6", ch: 2, from: "quill", to: "wren", text: "Wren, Bram writes this for me, so forgive his spelling. We're putting a notice in every door tonight. It wants your little plane. I hear you've been unwell. Rest. I hear also you've been watching it fly." },

    // ---- Night: every window.
    { id: "w1", ch: 3, from: "wren", to: "agnes", light: "bakery", text: "Light in your window, please, Agnes, and bring the jars from the shop. All of them. The Kittiwake must see us from the Skerries. Pass it on." },
    { id: "w2", ch: 3, from: "agnes", to: "pim", light: "marlow", text: "Pim, take a lantern to the top of the steps and stand there and hold it high. Your dad will know it's you. The fish loaf is in the oven. It's got a very surprised face." },
    { id: "w3", ch: 3, from: "pim", to: "quill", light: "school", text: "Miss Quill Bram says you can't see the lights so I'm going to tell you. There's one on every step. Bram is here holding the other bucket, it's full of candles. It looks like someone spilled the stars and they rolled down the hill." },
    { id: "w4", ch: 3, from: "quill", to: "hester", light: "chapel", text: "Hester, ring. I can't see the hill but I can hear the town breathing. Ring until your arms give out, and then Bram will take a turn." },
    { id: "w5", ch: 3, from: "hester", to: "cobb", light: "mill", text: "Cobb, you can see further from the mill than anyone. Light your sails. All four. Tomas says you won't. I told him you'd do it to spite him." },
    { id: "w6", ch: 3, from: "cobb", to: "nell", light: "fish", text: "Nell. Masthead light, off the Skerries, coming round. She's on the line of the hill. She's steering by us, girl. Go down to the quay." },
    { id: "w7", ch: 3, from: "agnes", to: "tomas", light: "light", text: "Come down off your tower, you stubborn man. You have kept this town safe for forty-one years. Tonight it's our turn. I've brought supper. No caraway." },
];
export const FINALE = { from: "wren", text: "Little plane, if you are reading this you have unfolded, as I always hoped. I wrote this on the back of the last sheet from the Post Office, then folded it, because I didn't know how to send it. For fifty years I've carried this town's words. They had stopped saying them. So I made one last thing that would make them write. All my love, to everyone. It was always going to be you." };
export const CHAPTERS = [
    { title: "The Morning Post", time: 0, intro: "Every letter here has been waiting for a good wind." },
    { title: "Noon, and Asking", time: 1, intro: "The hardest letter is the one that says please." },
    { title: "Golden Hour", time: 2, intro: "The light is going, and the Kittiwake is late." },
    { title: "Every Window", time: 3, intro: "Carry the word. Light the hill." },
];

/** Light rigs. sun: direction the sunlight travels. warm: how strongly sunlit walls lift. */
export const TIMES = [
    { name: "Morning", sun: [-0.72, -0.58, -0.38], col: "#b8a48a", sky: "#cfd2cf", ground: "#b4a68e", fog: "#f8e6d6", warm: 1, dome: ["#fbe8d2", "#fbdcc4", "#f7cdbd", "#d7dfe0", "#a9d3dd", "#7ec1d6"], sea: "#ffffff", shore: 0, glow: "#3e5c78", glowLit: 0, mood: "morning" },
    { name: "Noon", sun: [-0.2, -0.92, -0.36], col: "#a89e88", sky: "#d4dad8", ground: "#b8b09c", fog: "#e7f2ee", warm: 0.8, dome: ["#eef6ee", "#dff0ec", "#bfe4e4", "#96d3de", "#6fc0da", "#4fa8d0"], sea: "#ffffff", shore: 0, glow: "#3e5c78", glowLit: 0, mood: "noon" },
    { name: "Golden Hour", sun: [0.8, -0.34, -0.5], col: "#dca678", sky: "#c9b8c0", ground: "#a98a84", fog: "#f6c79c", warm: 1, dome: ["#fcdca0", "#f9bf86", "#f19d7c", "#d97f85", "#a26a90", "#5f5a90"], sea: "#f6dcc8", shore: 0, glow: "#f0b35e", glowLit: 0.5, mood: "golden" },
    { name: "Night", sun: [0.3, -0.8, -0.5], col: "#4c5c86", sky: "#3f4e76", ground: "#2c3456", fog: "#1e2a4e", warm: 0, dome: ["#2a3a64", "#223158", "#1c294e", "#172244", "#121b3a", "#0e1630"], sea: "#8ea0c8", shore: 0, glow: "#ffcf73", glowLit: 1, mood: "night" },
];

/** Plane designs. vt: trim speed. ld: glide ratio. roll: bank rate. stall: stall angle. lift: how well it rides warm air. */
export const PLANES = [
    { id: "postman", name: "The Postman", blurb: "Wren's first fold. Honest, steady, forgiving.", vt: 19, ld: 13, roll: 2.6, bank: 1.05, stall: 15, lift: 1, steps: ["Fold it in half", "Fold the corners in", "Fold the wings down"] },
    { id: "dart", name: "The Swift Dart", blurb: "All nose. Fast, flat and hard to slow down.", vt: 25, ld: 11.5, roll: 3.3, bank: 1.0, stall: 12, lift: 0.8, steps: ["Fold it in half", "Fold the corners in", "Fold the corners again", "Fold the wings down"] },
    { id: "longwing", name: "The Longwing", blurb: "A slow, patient glider. Warm air loves it.", vt: 15, ld: 20, roll: 1.8, bank: 0.95, stall: 17, lift: 1.3, steps: ["Fold the nose down", "Fold the tip back", "Fold it in half", "Fold the wide wings"] },
    { id: "swallow", name: "The Swallow", blurb: "A forked tail. Turns inside any street.", vt: 18, ld: 11, roll: 4.4, bank: 1.25, stall: 16, lift: 1.05, steps: ["Fold it in half", "Fold the corners in", "Snip the tail", "Fold the wings up"] },
    { id: "crane", name: "The Crane", blurb: "Wren's last fold. It remembers how to flap.", vt: 17, ld: 15, roll: 2.8, bank: 1.1, stall: 90, lift: 1.3, flap: true, steps: ["Fold it square", "Fold the petals", "Pull the neck", "Pull the tail", "Open the wings"] },
];

/** Stamps sit in out of the way places. hint is what the album says until you find it. via: waypoints for the proving bot. */
export const STAMPS = [
    { id: "gull", name: "Herring Gull", hint: "Under the boards of the long pier", at: [-6, 3.4, 130], from: [-120, 54, 86, -2.3], via: [[-44, 20, 194]] },
    { id: "bell", name: "The Chapel Bell", hint: "In the belfry, between the four posts", at: [-182, 0, 4], yFrom: "belfry", via: [] },
    { id: "needle", name: "The Needle's Eye", hint: "Through the hole in the far sea stack", at: [-258, 12, 168], via: [[-206, 42, 16]] },
    { id: "cut", name: "Smuggler's Cut", hint: "Harbour side of the headland: a slot in the cliff", at: [190, 8, 142], via: [[138, 8, 118], [168, 8, 124]] },
    { id: "arch", name: "Viaduct Arch", hint: "Under the fourth arch of the viaduct", at: [-76, 25, -150], thread: true, via: [[-76, 46, -70], [-76, 32, -116]] },
    { id: "mill", name: "The Mill Cap", hint: "Above the sails of the mill on the moor", at: [62, 0, -200], yFrom: "millcap", via: [] },
    { id: "lamp", name: "The Great Lamp", hint: "Right above the lighthouse", at: [208, 0, 132], yFrom: "lightcap", via: [] },
    { id: "cove", name: "Hidden Cove", hint: "West of the cliffs, tucked behind the point", at: [-262, 6, 74], via: [] },
    { id: "cat", name: "The Cat", hint: "On the disputed fence on Top Lane", at: [-6, 25.5, -95], via: [] },
    { id: "pear", name: "The Pear Tree", hint: "High in the pear tree's shade", at: [-22, 33, -112], via: [] },
    { id: "clock", name: "Post Office Clock", hint: "Level with the clock", at: [14, 32, -9], via: [] },
    { id: "band", name: "The Bandstand", hint: "Through the bandstand, between the pillars", at: [14, 12.5, 6], thread: true, via: [[112, 19, 3.5], [64, 14, 3.5], [30, 12.8, 3.5]] },
    { id: "boat", name: "Harbour Light", hint: "Round the little light at the end of the wall", at: [86, 10, 116], via: [] },
    { id: "kite", name: "The Lost Kite", hint: "Very high over the beach", at: [-120, 54, 86], via: [] },
    { id: "alley", name: "Fish Alley", hint: "The narrow alley behind Harbour Row", at: [-74.3, 7, 20], thread: true, via: [[-74.3, 22, 104], [-74.3, 9, 62], [-74.3, 7.5, 42]] },
    { id: "moor", name: "The Standing Stone", hint: "Far out on the northern moor", at: [-150, 0, -178], yFrom: "ground8", via: [] },
];

/** Time trials. hoops: [x, y, z]. Times in seconds, from the bot's clean runs, with a human margin. */
export const TRIALS = [
    { id: "bay", name: "Round the Bay", unlock: 1, plane: null, stamp: "tBay", hoops: [[-30, 34, 92], [-6, 30, 165], [50, 26, 150], [86, 24, 130], [128, 22, 100], [100, 18, 74], [40, 14, 66], [-20, 12, 76]], times: [38, 48, 62] },
    { id: "rooftops", name: "Over the Rooftops", unlock: 2, stamp: "tRoof", hoops: [[-110, 46, -44], [-50, 42, -44], [20, 38, -44], [84, 34, -44], [116, 30, 0], [70, 28, 2], [14, 25, 2], [-30, 26, 8], [-28, 27, 36], [-10, 13, 58], [50, 11, 52]], times: [64, 82, 105] },
    { id: "long", name: "The Long Way Round", unlock: 3, stamp: "tLong", hoops: [[20, 36, 60], [126, 44, 84], [196, 60, 84], [176, 62, -60], [84, 58, -188], [-20, 60, -216], [-120, 56, -176], [-226, 34, 60], [-120, 24, 110], [-20, 18, 80]], times: [62, 82, 110] },
];
