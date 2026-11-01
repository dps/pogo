// The tower, floor by floor: maps, people, jokes and the plot. Map legend:
// # wall, W window, + poster, . floor, , lino, " clutter (wild Deskmates), ^ stairs up, v stairs down, E lift, ~ paper chute.
// Capital letters and = ! are furniture (tiles.js). Lower-case letters and digits are people and things, defined in ents.
import { FLOORS2, LIFT2, QUESTS2, STEPS2 } from "./story2.js";
import { BEASTS } from "./data.js";
import { fighter, npc, THEMES } from "./storykit.js";
import { makeMon } from "./sim.js";

export const SIGNERS = [
    { dept: "Facilities", name: "D. Lumen" }, { dept: "People", name: "C. Smiles" }, { dept: "IT", name: "N. Kumar" }, { dept: "Print", name: "(jam)" },
    { dept: "Marketing", name: "Tiff!" }, { dept: "Finance", name: "G. Ledger" }, { dept: "Wellness", name: "Sunny :)" }, { dept: "Legal", name: "Whereas" },
];

// --- The next thing to do. Shown on a sticky note, and followed by the bot. --------------------------------------------------
const STEPS = [
    [(f) => !f.intro, "Check in at reception", "L", "b"],
    [(f) => !f.met_marge, "Find the Mailroom, in the basement", "B1", "m"],
    [(f) => !f.starter, "Choose a Deskmate from the sorting table", "B1", "abc"],
    [(f) => !f.form, "Talk to Marge", "B1", "m"],
    [(f, S) => S.sigs < 1 && !f.f2_mop_back && !f.f2_gus, "Find a way through Facilities on 2", "F2", "g"],
    [(f, S) => S.sigs < 1 && !f.f2_mop_back && !f.f2_got_mop, "Find Gus's mop", "F2", "k"],
    [(f, S) => S.sigs < 1 && !f.f2_mop_back, "Bring Gus his mop", "F2", "g"],
    [(f, S) => S.sigs < 1, "Get Doug's signature", "F2", "d"],
    [(f, S) => S.sigs < 2 && (f.stamps ?? 0) < 3, "Collect three approval stamps on 3", "F3", null],
    [(f, S) => S.sigs < 2 && !f.f3_pass, "Show your stamps to Pam", "F3", "h"],
    [(f, S) => S.sigs < 2, "Get Cheryl's signature", "F3", "s"],
    [(f, S) => S.sigs < 3 && !f.f4_ticket, "Take a ticket at the IT desk on 4", "F4", "t"],
    [(f, S) => S.sigs < 3 && !f.f4_off, "Turn it off", "F4", "o"],
    [(f, S) => S.sigs < 3 && !f.f4_on, "Turn it on again", "F4", "i"],
    [(f, S) => S.sigs < 3, "Get Neil's signature", "F4", "n"],
    [(f, S) => S.sigs < 4, "Find the Printer on 5", "F5", "p"],
];
export function objective(S) {
    for (const [test, text, floor, ent, extra] of [...STEPS, ...STEPS2]) if (test(S.flags, S)) return { text, floor, ent, ...extra };
    return null;
}

// --- Lobby ------------------------------------------------------------------------------------------------------------------
const intro = function* (c) {
    const S = c.S;
    c.flag("intro"); c.flag("showObjective");
    yield c.say("Bev", "Welcome to Amalgamated Everything, where everything is amalgamated. Name?", { tab: "#c9b6ff" });
    const i = yield c.ask("Bev", "Sorry, go on. Name?", ["Alex", "Sam", "Jo", "Max"]);
    S.name = ["Alex", "Sam", "Jo", "Max"][i];
    yield c.say("Bev", "Lovely. I'll put you down as Jeff.", { tab: "#c9b6ff" });
    yield c.say("Bev", "The lanyard printer's broken, so you'll need a temporary one. They're with Marge, in the Mailroom. Stairs down, on the left.", { tab: "#c9b6ff" });
    yield c.say("Bev", "Reg won't let you upstairs without one. Reg won't let anyone upstairs. Reg has been told nothing, for years, and has made it his whole personality.", { tab: "#c9b6ff" });
    yield c.say("Bev", "Welcome aboard, Jeff! Today is the first day of the rest of your probation.", { tab: "#c9b6ff" });
};
const L = {
    id: "L", name: "Reception", tag: "GROUND", theme: THEMES.L, music: "lobby", base: ",",
    map: [
        "##################",
        "#WW+v###^##E#+WWW#",
        "#P...,,,,,,,,...V#",
        "#H...,,,,,,,,....#",
        "#....KKbKKKKK....#",
        "#.I..,,,,,,,,..I.#",
        "#...A,,,,,,,,A...#",
        "#...A,,,,,,,,A...#",
        "#.I..,,,,,,,,..I.#",
        "#.....,,,,,,.....#",
        "#L.y..,,,,,,..x.P#",
        "#L....111111.....#",
        "######,,,,,,######",
        "     #,,,,,,#     ",
        "     #,,,,,,#     ",
        "     ########     ",
    ],
    decals: [{ name: "rug", x: 9, y: 7.5, w: 216, h: 216 }],
    up: "F2", down: "B1",
    gateDown: (S) => (S.flags.intro ? null : "Best check in with Bev at reception first. She's watching. She's always watching."),
    gateUp: (S) => (S.flags.form ? null : `Reg blocks the stairs. "Lanyard. No lanyard, no upstairs. I don't make the rules. Nobody knows who makes the rules."`),
    ents: {
        b: npc("Bev", "bev", (function* (c) {
            if (!c.has("intro")) { yield* intro(c); return; }
            if (c.has("form")) { yield c.say("Bev", ["Morning, Jeff! Sorry: Dana. Sorry: Kyle.", "Someone left a parcel for you. It's ticking. It's probably fine.", "If anyone asks, the lift's fine. It's fine. Don't get in it."][c.S.steps % 3], { tab: "#c9b6ff" }); return; }
            yield c.say("Bev", "Mailroom, Jeff. Stairs down, on the left. Follow the smell of old envelopes.", { tab: "#c9b6ff" });
        }), { dir: "down", idle: false }),
        "1": { t: "step", once: 1, key: "L.1", run: intro, show: (S) => !S.flags.intro },
        y: npc("Visitor", "m5", ["I'm here for the 9 o'clock. They said to take a seat. That was in March."]),
        x: npc("Courier", "m4", ["Sign here. No, here. No, that's the old screen. I can't take it back. I've seen too much."]),
    },
};

// --- Mailroom ---------------------------------------------------------------------------------------------------------------
const pickStarter = (sp) => function* (c) {
    const S = c.S;
    if (c.has("starter")) { return; }
    if (!c.has("met_marge")) { yield c.note("It wriggles. Maybe talk to Marge first."); return; }
    const lines = { stickle: "Stickle. A sticky note with a long memory and a soft heart. PAPER. Good at keeping a team alive.", pingling: "Pingling. An eager little email. Fast, loud, and never sleeps. EMAIL. Hits first, asks later.", snaglet: "Snaglet. A roll of red tape with a grudge. RED TAPE. Slow to anger, impossible to shake off." };
    const i = yield c.ask("Marge", lines[sp] + " This one?", ["Yes, this one", "Let me think"], { tab: "#bfe0c8" });
    if (i) return;
    c.flag("starter", sp);
    yield c.recv(sp, 5, { text: "It climbed onto your shoulder. You have a Deskmate!" });
    c.world.ents.filter((e) => e.def.starter === sp).forEach((e) => { e.hidden = true; });
    yield c.say("Marge", "That one's taken to you. They don't do that for everyone. They don't do that for anyone, actually.", { tab: "#bfe0c8" });
    yield* kenzieIntro(c, sp);
};
const kenzieIntro = function* (c, sp) {
    c.show("q"); yield c.emote("q");
    yield c.walk("q", ["right", "right", "right", "right", "up", "up"]);
    yield c.say("Kenzie", "Hi! Kenzie, Graduate Management Associate. I've been here three weeks and I've already been to eleven lunch-and-learns.");
    yield c.say("Kenzie", "Are these the assets? Oh, I LOVE an asset. I'll take the one with the most leadership potential.");
    const pick = { stickle: "pingling", pingling: "snaglet", snaglet: "stickle" }[sp];
    c.world.ents.filter((e) => e.def.starter === pick).forEach((e) => { e.hidden = true; });
    yield c.say("Kenzie", "Let's do a quick feedback session, New Hire. Don't worry, it's a safe space. I'm going to win.");
    const foe = makeMon(pick, 4); foe.hp = Math.floor(foe.hp * 0.8);
    const r = yield c.battle({ kind: "trainer", foes: [foe], fmt: 1, name: "Kenzie", ai: 0, reward: 60, tutorial: 1, mustWin: true });
    if (r === "win") yield c.say("Kenzie", "Interesting! I'm going to take that away and action it. See you on the executive floor, New Hire.");
    else yield c.say("Kenzie", "Great effort! I've logged it as a Development Opportunity. Don't worry, you'll get them next time.");
    c.flag("rival1", r === "win" ? 1 : 2);
    yield c.walk("q", ["down", "down", "left", "left", "left", "left"]); c.hide("q");
    for (const m of c.S.party) m.hp = Math.max(m.hp, 1);
    c.heal();
};
const B1 = {
    id: "B1", name: "The Mailroom", tag: "BASEMENT", theme: THEMES.B1, music: "calm", base: ",",
    map: [
        "##########################",
        "#R.BB+BBB##^#E####+#BB..R#",
        "#.....,,,,,,,,,,......R.R#",
        "#.K.K.,,,,,,,,,,.....\"\"\"\"#",
        "#.KGK.,,TTTTTT,,.....\"\"\"\"#",
        "#.....,,.a.b.c.,,....\"\"\"\"#",
        "#.....,,,,,,,,,,,....\"\"\"\"#",
        "#RR...,,,,,m,,,,,....\"\"\"\"#",
        "#.....,,,,,,,,,,,..R.\"\"\"\"#",
        "#.....,,,,,,,,,,,..R.....#",
        "#..q..,,,,,,,,,,,..RRRRR.#",
        "#.....,,,,,,,,,,,......R.#",
        "#.\"\"\"\"\"\"\"\"\"..........fR.u#",
        "#.\"\"\"\"\"\"\"\"\"..........MRRR#",
        "#.\"\"\"\"\"\"\"\"\"..............#",
        "##########################",
    ],
    up: "L",
    wild: [["staplet", 3, 5, 40], ["formlet", 3, 4, 30], ["mugling", 3, 5, 22], ["loadipillar", 3, 4, 12]],
    rate: 0.2,
    breakLine: "Marge's coffee machine. It was installed the year you were born. Everyone gets a cup, and Morale is fully restored. You're safe to save here.",
    ents: {
        m: npc("Marge", "marge", (function* (c) {
            const say = (t) => c.say("Marge", t, { tab: "#bfe0c8" });
            if (!c.has("met_marge")) {
                c.flag("met_marge");
                yield say("You'll be {name}. It's on the manifest. Don't look so surprised, love, someone has to read it.");
                yield c.say("You", "You got my name right.");
                yield say("Thirty-nine years I've been down here. You're the first person who's come to the Mailroom on purpose.");
                yield say("Now then. Lanyards are in that box, but there's a slight problem, and I'd sooner you heard it from me.");
                yield say("The post is alive.");
                c.shake(3);
                yield c.note("On the sorting table, three parcels burst open. Three small somethings blink at you.");
                yield say("Office supplies, paperwork, the odd email. Leave anything in a building this long, with this little supervision, and it wakes up. We call them Deskmates.");
                yield say("Upstairs calls them Assets, Non-Human Resources, or Pest Control's Problem. Be nice, and they'll work with you. Pick one. They won't bite. Well.");
                return;
            }
            if (!c.has("starter")) { yield say("Go on, the sorting table. Choose whichever looks at you funny."); return; }
            if (!c.has("form")) {
                c.flag("form"); c.give("lanyard", 6); c.give("coffee", 4);
                yield say("Here's your lanyard. Lanyards are how you hire a Deskmate, too: wear one, you're staff. Tire them out first, then offer one. Nobody wants a job when they're fresh.");
                yield say("And this is Form 1, the Onboarding Form. Eight signatures, one from each department head, all the way up the tower.");
                yield say("It's how you get a permanent lanyard. It's how everything gets done here. Nobody has ever finished it.");
                yield c.say("You", "Nobody? In thirty-nine years?");
                yield say("Nobody's tried. Mind how you go, {name}. Coffee machine's in the corner, any time. Copier's your Supply Closet, for spare Deskmates.");
                return;
            }
            yield* margeTalk(c);
        }), { dir: "down", idle: false }),
        a: { t: "npc", beast: "stickle", starter: "stickle", dir: "down", size: 40, run: pickStarter("stickle"), show: (S) => S.flags.starter !== "stickle" && !S.flags.rival1 },
        b: { t: "npc", beast: "pingling", starter: "pingling", dir: "down", size: 40, run: pickStarter("pingling"), show: (S) => S.flags.starter !== "pingling" && !S.flags.rival1 },
        c: { t: "npc", beast: "snaglet", starter: "snaglet", dir: "down", size: 40, run: pickStarter("snaglet"), show: (S) => S.flags.starter !== "snaglet" && !S.flags.rival1 },
        q: { t: "npc", name: "Kenzie", look: "kenzie", key: "B1.q", show: (S) => S.flags.starter && !S.flags.rival1, turn: false, idle: false, dir: "right" },
        f: npc("Fitz", "m2", ["I've been redirecting the same parcel for six years. Addressed to a Mr. Occupant.", "Between you and me, the Staplets in that clutter love a tired stapling. Wear them down, then offer a lanyard."]),
        u: { t: "item", item: "fleece", joke: "Size: Corporate." },
    },
};
const margeTalk = function* (c) {
    const S = c.S, say = (t) => c.say("Marge", t, { tab: "#bfe0c8" }), n = Object.keys(S.caught).length;
    if (S.sigs >= 4 && !c.has("marge4")) { c.flag("marge4"); yield say("I heard the Printer's job finally went through. Don't you take that on yourself, love. It was held up a long time. Someone would have cleared it."); }
    // The Inventory Audit: rewards for hiring.
    const tiers = [[8, "fleece", 3], [16, "stock", 2], [28, "triple", 3], [40, "stock", 5], [Object.keys(BEASTS).length - 3, "handshake", 1]];
    let gave = false;
    for (const [need, it, q] of tiers) if (n >= need && !c.has("audit" + need)) { c.flag("audit" + need); c.flag("q_audit_on"); yield say(`${n} Deskmates on your books! For the Inventory Audit, I've found you something.`); c.give(it, q); gave = true; }
    if (!gave) {
        const lines = ["You've got " + n + " Deskmates on the books. Bring me more, and I'll see what's fallen off the back of a trolley. Call it an Inventory Audit.", "Eat something. You look like Tuesday.", "They weren't always this big, this building. Started as one room and a telephone.", "Don't mind me, love. I like it down here. It's the only floor where things arrive."];
        c.flag("q_audit_on");
        yield say(lines[S.steps % lines.length]);
    }
};

// --- 2: Facilities ----------------------------------------------------------------------------------------------------------
const F2 = {
    id: "F2", name: "Facilities", tag: "FLOOR 2", theme: THEMES.F2, music: "office",
    map: [
        "############################",
        "#W+WW##v####WW+WW###^##E#WW#",
        "#....!.......,,.......!....#",
        "#.DD.!.a.....,,.......!.DD.#",
        "#....!.......,,...b...!....#",
        "#==.==.==....,,....====.====",
        "#............,,............#",
        "#.P..........,,..........P.#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#..G....=....,,....=.......#",
        "#.K..c..!....,,....!.\"\"\"\"\"\"#",
        "#.K.....!....,,....!.\"\"\"\"\"\"#",
        "#===.===!..g.,,....!.\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"!....,,....!.\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"!.==wwww==.!...e...#",
        "#\"\"\"k\"\"\"!.!......!.!.......#",
        "#\"\"\"\"\"\"\"!.!.d....!.!..R.R..#",
        "#\"\"\"\"\"\"\"..!.TT...!....RRR..#",
        "#####.....!......!......V..#",
        "#####.h...!......!....f....#",
        "#####.....========.........#",
        "############################",
    ],
    up: "F3", down: "L",
    gateUp: (S) => (S.sigs >= 1 ? null : "A sign on the stairs: \"NO ACCESS TO 3 WITHOUT A FACILITIES SIGNATURE. - DOUG\". It's been laminated. It means business."),
    wild: [["staplet", 5, 7, 25], ["pottling", 5, 7, 24], ["mugling", 5, 7, 20], ["binjamin", 6, 8, 12], ["lukewarm", 7, 8, 8], ["snarlcord", 7, 8, 10]],
    breakLine: "A Facilities coffee machine, held together with gaffer tape. It works, out of fear. Morale restored. Progress saved.",
    ents: {
        a: fighter("Trevor from Plumbing", "m6", "right", "staplet:6", "You new? Never mind. Fight me, I've been on hold for an hour.", "Fair enough. Back to hold.", "Your call is important to them. Mine's not."),
        b: fighter("Sandra, Space Planner", "f1", "left", "pottling:6 mugling:6", "This floor is 8% over capacity. Someone has to go, and I've measured you.", "You've got a very small footprint.", "We're moving to hot-desking. The desks are not hot. It's a lie."),
        c: fighter("Clive, Fire Warden", "m1", "right", "staplet:7", "I've got the hi-vis and the clipboard. I'm basically a policeman.", "You'd have been fine in a real fire.", "The assembly point is the car park. The car park was sold in 2019."),
        e: fighter("Dot, Cleaner", "f6", "left", "binjamin:7 pottling:6", "You walked on that. I saw you. I just did that bit.", "Go on, then. Mind the wet.", "I know what's in everyone's bins. EVERYONE'S."),
        f: npc("Kevin", "m5", ["Someone's taken my stapler. I had it engraved. It says KEVIN.", "I'm not saying it was Dale. But Dale's got a lot of staples, for a man with no stapler."], { run: function* (c) { const say = (t) => c.say("Kevin", t); if (c.has("q_stapler")) { yield say("My stapler! I'd know that clack anywhere. Thank you. I've been holding my reports together with hope."); return; } if (c.has("f2_kevin_item")) { c.flag("q_stapler"); yield say("KEVIN. It says KEVIN! Here, take these, they're Dale's. I've been meaning to get him back."); c.give("fleece", 2); c.cash(150); return; } c.flag("q_stapler_on"); yield say("Someone's taken my stapler. I had it engraved. It says KEVIN."); yield say("Last seen somewhere near the old coffee stores. Probably running wild by now. They go feral, you know. In a week."); } }),
        h: { t: "npc", name: "Beige Stapler", beast: "staplet", show: (S) => !S.flags.f2_kevin_item, run: function* (c) { yield c.note("A small beige stapler. Engraved on the base: KEVIN. It stops chewing, and looks almost ashamed."); c.flag("f2_kevin_item"); c.play("item"); yield c.note("You tuck it under your arm. It bites you, gently."); } },
        g: npc("Gus", "gus", (function* (c) {
            const say = (t) => c.say("Gus", t);
            if (c.has("f2_mop_back")) { yield say("Floor's dry. Doug's through there. Mind his moods; he's been promising a new carpet since the Berlin Wall."); return; }
            if (c.has("f2_got_mop")) {
                c.flag("f2_mop_back"); yield say("My mop! Thirty years we've been together. I've spent more time with this mop than with my wife, and it's a better listener.");
                yield say("Right. Signs are coming up. Doug's office is straight on, and he's in one of his moods."); c.play("door"); yield c.wait(0.2);
                return;
            }
            c.flag("f2_gus");
            yield say("Can't let you past, son. Wet floor. Been wet since 2016, but rules are rules.");
            yield say("I'd mop it, but my mop's gone. Went walkabout in the clutter on the west side. Find it and I'll shift the signs.");
        }), { dir: "down", idle: false }),
        k: { t: "item", item: "coffee", show: (S) => !S.flags.f2_got_mop, run: function* (c) { c.flag("f2_got_mop"); c.S.taken["F2.k"] = 1; c.give("coffee", 1); yield c.note("You found Gus's mop! It's wedged between two nesting Lukewarms. There's a coffee stuck to it, too."); } },
        w: { t: "npc", prop: "X", name: "Sign", turn: false, show: (S) => !S.flags.f2_mop_back, run: function* (c) { yield c.note("CAUTION: WET FLOOR. The floor is bone dry. The sign has been here long enough to have a pension. Maybe ask Gus."); } },
        d: fighter("Doug Lumen", "doug", "down", "staplet:7 pottling:7", "Doug Lumen, Head of Facilities. Thirty-one years. You want a signature? You'll want to fill in a Work Order. I'll get to it in the next financial year.", "...Alright. You've a firm grip. I respect that in a person, and in a shelf bracket.", "Tell Cheryl upstairs her radiator's been fixed. It hasn't.", { boss: "facilities", title: "Head of Facilities", fmt: 2, ai: 1, reward: 500, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Doug signs your form with a carpenter's pencil. Signature 1 of 8.");
            yield c.say("Doug", "Eight, is it? Nobody's got past two. I'll tell you this for free: something up there's wrong with the invoices. Every purchase signed off by the CEO. Same words. Same time. For thirty-nine years.");
            yield c.say("Doug", "Stairs to People Ops are open. And take this. Don't tell the union."); c.give("flat_white", 2);
        } }),
    },
    prop: { Y: null },
};

// --- 3: People & Culture ----------------------------------------------------------------------------------------------------
const stampWin = (name) => function* (c) { c.flag("stamps", (c.has("stamps") ?? 0) + 1); c.play("sign"); yield c.note(`${name} stamps your form: APPROVED, with a sigh. ${c.has("stamps")} of 3 stamps.`); };
const F3 = {
    id: "F3", name: "People & Culture", tag: "FLOOR 3", theme: THEMES.F3, music: "office",
    map: [
        "############################",
        "#WW+W##v###+WW+####^##E#W+W#",
        "#..........,,,,,,,,........#",
        "#.P.A.A....,,,,,,,,......P.#",
        "#..........,,,,,,,,........#",
        "#.DD.a.DD..,,,,,,,,..f.DD..#",
        "#==.======.,,,,,,,,.===.====",
        "#........!.,,,,,,,,.!......#",
        "#.DD..c..!.,,,,,,,,.!..b...#",
        "#........!.,,,,,,,,.!..DD..#",
        "#.DD.....!.,,,,,,,,.!......#",
        "#........=.,,,,,,,,.=..DD..#",
        "#..........,,,,,,,,........#",
        "#=====.==============.======",
        "#......!\"\"\"\"\"\"\"\"\"\"\"\"!......#",
        "#.G..e.!\"\"\"\"\"\"\"\"\"\"\"\"!..R.R.#",
        "#.K....!\"\"\"\"\"\"\"\"\"\"\"\"!......#",
        "#.K....!\"\"\"\"\"\"\"\"\"\"\"\"!..d...#",
        "#.K....\"\"\"\"\"\"\"\"\"\"\"\"\"\"......#",
        "###.####\"\"\"\"\"\"\"\"\"\"\"\"###.####",
        "#............h..H..........#",
        "#.P.....=======1=====.P....#",
        "#.......!.DDD...DDD.!......#",
        "#..g....!....s......!...V..#",
        "#.......!.....T.....!......#",
        "############################",
    ],
    up: "F4", down: "F2",
    gateUp: (S) => (S.sigs >= 2 ? null : "A note on the door: \"Access to IT requires a completed Personal Development Plan, signed by Cheryl. Please bring your whole self.\""),
    wild: [["formlet", 8, 10, 26], ["stamplet", 8, 10, 24], ["invitling", 8, 10, 20], ["spadpole", 8, 10, 20], ["mugling", 8, 9, 10]],
    breakLine: "A coffee machine with a laminated sign: 'You are our most valued asset. Please descale me.' Morale restored. Saved.",
    ents: {
        a: fighter("Priti, Recruiter", "f4", "down", "stamplet:10", "Love your energy! Where do you see yourself in five years? Trick question. Nowhere.", "Great chat. We'll keep you on file.", "We're not hiring. We're always hiring. It depends who's asking.", { after: stampWin("Priti") }),
        b: fighter("Giles, Benefits", "m2", "left", "invitling:10 formlet:9", "Your benefits include a dental plan, a gym you can't reach, and a fruit bowl. The fruit is decorative.", "Fine. You've qualified for the fruit.", "It's a very competitive package. It's competing with nothing.", { after: stampWin("Giles") }),
        c: fighter("Marian, Compliance", "f6", "right", "formlet:10 spadpole:10", "Have you completed your Ladder Safety eLearning? You're on the third floor. Think about it.", "Slide 44 of 44. Well done.", "You'd be amazed what you agree to by clicking Next.", { after: stampWin("Marian") }),
        d: fighter("Ollie, Culture Champion", "m6", "up", "invitling:10 stamplet:10", "We're a family here! A family that does exit interviews.", "Thanks for bringing your whole self to that.", "Every Friday there's a mandatory voluntary social."),
        e: fighter("Bryn, Payroll", "m3", "left", "spadpole:11", "Your first pay comes in six weeks, minus lanyard hire.", "I'll see what I can do about the lanyard.", "Your tax code is OT. Nobody knows what that means."),
        f: npc("Janet", "f3", (function* (c) {
            const say = (t) => c.say("Janet", t);
            if (c.has("q_dave")) { yield say("It's lovely! Everyone signed. Dave will be so... wait, HR says Dave left in 2011? Who's been taking his birthday cake?"); return; }
            const signed = c.has("dave_cards") ?? 0;
            if (signed >= 4) { c.flag("q_dave"); yield say("All four floors! You lovely thing. It's Dave's birthday card. Nobody's seen him but he always gets a card."); yield say("Odd thing. The card's been signed by Dave. It says: 'Thanks. I'm still here. Come and find me.' Must be a joke. Here, have the leftover cake money."); c.cash(400); c.give("fleece", 3); return; }
            c.flag("q_dave_on"); yield say(`It's Dave's birthday! I need signatures on this card from four people on other floors. Nobody here will sign. They say "who's Dave?" You've got ${signed} so far.`);
        })),
        g: npc("Colin", "m5", ["I've had four managers this year. All of them have told me I'm 'really key to the team'.", "I don't know what I do. I'm scared to ask. It's been nine years."]),
        h: npc("Pam", "f1", (function* (c) {
            const say = (t) => c.say("Pam, Executive Assistant to Cheryl", t, { tab: "#ffc7d9" });
            if (c.S.sigs >= 2) { yield say("She's out of her meeting. She's in another meeting. It's about the first meeting."); return; }
            if ((c.has("stamps") ?? 0) >= 3) { if (!c.has("f3_pass")) { c.flag("f3_pass"); yield say("Three stamps! Good grief, you're the first since the Olympics. Go on through."); c.play("door"); } else yield say("Go on through. She'll pretend she didn't see you, then she'll see you."); return; }
            yield say(`Cheryl sees people by appointment. Appointments need three approval stamps: from Recruitment, Benefits, and Compliance. You've got ${c.has("stamps") ?? 0}.`);
            yield say("And before you ask: yes, the stamps need approving. That's what the fighting's for.");
        }), { dir: "down", idle: false }),
        s: fighter("Cheryl Smiles", "cheryl", "down", "stamplet:11 duplicate:12", "Hi! Sit down. Don't look so worried. This isn't a disciplinary. This is a Conversation. I've got a form for your feelings.", "Well! That was very... authentic. I'm going to put that in your file with a smiley.", "My door is always open. The door is a metaphor. It's locked.", { boss: "hr", title: "VP, People & Culture", fmt: 2, reward: 700, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Cheryl signs with a smiley over the 'i'. Signature 2 of 8.");
            yield c.say("Cheryl", "A little tip, between colleagues. Stop being friends with the stationery, hon. There's a Change Programme coming. It's going to be a very exciting time for some of us.");
            yield c.say("Cheryl", "Ooh, there's Kenzie. She's a real culture carrier.");
        } }),
        "1": { t: "npc", name: "Door", beast: null, show: (S) => !S.flags.f3_pass, run: function* (c) { yield c.note("The door to Cheryl's office. A sign says: \"Knock. Then wait. Then fill this in.\" Pam, at the desk inside, gives you a look through the glass."); yield c.note("Pam, at the little desk beside it, gives you a look over her glasses."); } },
    },
};

// --- 4: IT ------------------------------------------------------------------------------------------------------------------
const F4 = {
    id: "F4", name: "IT Service Desk", tag: "FLOOR 4", theme: THEMES.F4, music: "tense",
    map: [
        "##############################",
        "#S%SS##v####W+W####^##E##SS%S#",
        "#.............,,.............#",
        "#.DD.a..DD....,,....DD.b..DD.#",
        "#.............,,.............#",
        "#.DD....DD....,,....DD....DD.#",
        "#=====.====...,,...====.======",
        "#.............,,.............#",
        "#..t..........,,.........r...#",
        "#.TTT.........,,.............#",
        "#===========.=,,=.============",
        "#\"\"\"\"\"\"\"\"\"\"\"\".,,.\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\".,,.\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"\"\"\"\".,,.\"\"\"\"\"\"\"\"d\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\".,,.\"\"\"\"\"\"5\"\"\"\"\"#",
        "#=========.===.,,.===.========",
        "#.S.S.S.S.!...,,,,...!.S.S.S.#",
        "#.........!..........!.......#",
        "#.S.S.S.S.!...G..V...!.S.S.S.#",
        "#.........!..KKKKK...!.......#",
        "#o........!..........!......i#",
        "#.S.S.S.S.==.=====.===.S.S.S.#",
        "#.........................h..#",
        "#.S%S%S%S.=======2===.%S%S.S.#",
        "#.........!S%.......%S!......#",
        "#.P.....e.!S...n.....S!..P...#",
        "#.........!%...T.....%!......#",
        "##############################",
    ],
    up: "F5", down: "F3",
    gateUp: (S) => (S.sigs >= 3 ? null : "The door has a keypad and a Post-it: 'PLEASE RAISE A TICKET.'"),
    wild: [["loadipillar", 11, 13, 22], ["snarlcord", 11, 13, 22], ["cellmate", 11, 13, 22], ["spadpole", 11, 13, 18], ["starfone", 12, 14, 10], ["scribblet", 11, 13, 10]],
    breakLine: "A coffee machine with a USB port. Nobody knows why. Morale restored. Saved.",
    ents: {
        a: fighter("Rajesh, 1st Line", "m4", "right", "cellmate:13", "Have you tried turning it off? Have you tried turning you off?", "Ticket closed. Reason: user error.", "I'm contractually required to ask if there's anything else I can help you with. Please say no."),
        b: fighter("Tess, Network", "f2", "left", "snarlcord:13 loadipillar:12", "The network isn't down. The network's never down. It's you. You're down.", "Packet loss on my side. Fine.", "It was DNS. It's always DNS. Nobody will ever know what that means."),
        c: fighter("Yusuf, DevOps", "m2", "down", "snarlcord:13 spadpole:13", "I'm deploying on a Friday. You can't stop me. Nobody can.", "Rolling back. Rolling back everything. My whole life.", "It works on my machine."),
        d: fighter("Lin, Security", "f4", "left", "cellmate:14", "You failed the phishing test. You clicked FREE PIZZA. Everyone clicks FREE PIZZA.", "All right. Your password must now contain a hieroglyph.", "Don't write it on a sticky note. Your sticky note told me."),
        e: fighter("Barry, Legacy Systems", "m3", "right", "loadipillar:12 starfone:13", "This server's been up for nineteen years. If it goes down, so does payroll, and possibly Belgium.", "Don't touch anything on your way out.", "It's written in a language only I speak. That's called job security."),
        r: npc("Ravi and Hannah", "m1", (function* (c) {
            const say = (t) => c.say("Ravi", t);
            if (c.has("q_thermo")) { yield say(c.has("q_thermo") === 1 ? "Twenty-three degrees. Finally, the Bahamas. Hannah's stopped speaking to you. She's knitting a grudge." : "Nineteen degrees. Hannah's thrilled. I can see my breath, and it's disappointed in you."); return; }
            c.flag("q_thermo_on");
            yield say("You look neutral. Settle something. I say the thermostat goes up. Hannah says it goes down. It's been nine years. Our children aren't speaking.");
            const i = yield c.ask("Ravi", "Well? Where does it go?", ["Up: 23 degrees", "Down: 19 degrees", "Touch nothing"]);
            if (i === 2) { yield say("Coward. That's what the last person said. He's in Accounts now. In a jar."); return; }
            c.flag("q_thermo", i + 1);
            yield say("It's decided! The dial's a dummy, mind. It's not wired to anything. Hasn't been since 2003. But still. Here, for the trouble."); c.give("stock", 1); c.give("aspirin", 3);
        })),
        t: npc("Service Desk", "m6", (function* (c) {
            if (c.has("f4_ticket")) { yield c.say("Service Desk", ["Your ticket has been escalated to the back of the queue.", "To reset the server-room door, turn it off and on again. Switch one's in the west aisle. Switch two's in the east aisle. In that order. It's in the wiki, which is down."][c.S.steps % 2]); return; }
            c.flag("f4_ticket");
            yield c.say("Service Desk", "Welcome to IT. Your ticket number is 8,120,441. We are currently serving ticket number 12.");
            yield c.say("Service Desk", "Neil's in the server room. The door's locked itself, and no, we can't open it, it's a Smart Door. You'd have to turn it off and on again.");
            yield c.say("Service Desk", "OFF switch: far west of the racks. ON switch: far east of the racks. In that order. If you do it wrong, Neil will know, and he'll sigh.");
        }), { dir: "down", idle: false }),
        o: { t: "npc", name: "Switch", beast: null, run: function* (c) { if (c.has("f4_off")) { yield c.note("It's off. It's been off. It's the most off it's ever been."); return; } if (!c.has("f4_ticket")) { yield c.note("A big red switch labelled OFF. A note: 'RAISE A TICKET FIRST. WE WILL KNOW.'"); return; } c.flag("f4_off"); c.play("door"); yield c.note("KER-CHUNK. The whole floor dims. Somewhere, a man screams about unsaved work."); }, isSwitch: 1 },
        i: { t: "npc", name: "Switch", beast: null, run: function* (c) { if (!c.has("f4_off")) { yield c.note("A big green switch labelled ON. It's already on. It can't get any more on. Find OFF first."); return; } if (c.has("f4_on")) { yield c.note("It's on again. Everyone agrees it's better now, for reasons nobody can name."); return; } c.flag("f4_on"); c.play("door"); yield c.note("WHUMMM. Eleven hundred fans spin up. The server-room door clicks open, sounding faintly surprised."); }, isSwitch: 1 },
        h: npc("Password Reset Guy", "m5", (function* (c) {
            const say = (t) => c.say("Mike", t);
            if (c.has("q_pass")) { yield say("It worked! The password was 'password1'. The '1' was for security."); return; }
            if (c.has("f4_note")) { c.flag("q_pass"); yield say("My sticky note! 'password1'. Of course. You've saved my week."); c.give("rush", 3); return; }
            c.flag("q_pass_on"); yield say("I'm locked out. I wrote my password on a sticky note, and it walked off. Saw it heading to the clutter by the east racks.");
        })),
        "5": { t: "npc", name: "Sticky Note", beast: "stickle", show: (S) => S.flags.q_pass_on && !S.flags.f4_note, run: function* (c) { c.flag("f4_note"); c.play("item"); yield c.note("A very small sticky note that says 'password1'. It looks relieved to be found."); } },
        n: fighter("Neil Kumar", "neil", "down", "cellmate:13 snarlcord:13 starfone:14", "*sigh* Neil Kumar, Head of IT. You're the one who turned off the building. Have you any idea how many tickets that's going to create? Eleven. For me. Personally.", "Hm. Thanks for your patience. It's not you, it's a known issue.", "Please don't touch anything. Please don't touch anything else, I mean.", { boss: "it", title: "Head of IT", fmt: 2, reward: 950, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Neil signs digitally. Then he prints it out and signs it again, and scans that. Signature 3 of 8.");
            yield c.say("Neil", "One thing. There's a print job in the queue. Been stuck for eleven years. Same job. I've tried to clear it nine thousand times, and the Printer jams every time. Every time. On purpose.");
            yield c.say("Neil", "It's addressed from the CEO. I've never met the CEO. I handle his email, and it's the same six words every day. Anyway. Not my problem. Raise a ticket.");
        } }),
        "2": { t: "npc", name: "Smart Door", beast: null, show: (S) => !S.flags.f4_on, run: function* (c) { yield c.note("SMART DOOR. Status: Thinking. It has locked itself for your convenience. Maybe ask at the Service Desk."); } },
    },
};

// --- 5: Print Services ------------------------------------------------------------------------------------------------------
const printerAfter = function* (c) {
    c.sig(); c.flag("lift"); c.flag("mid");
    yield c.note("You open Tray 2. Eleven years of warm toner sighs out. The Printer signs your form, in a shaky dot-matrix. Signature 4 of 8.");
    c.music("sad");
    yield c.note("Then, for the first time in eleven years, the Printer stops jamming. And starts printing.");
    c.shake(4); c.play("paper");
    yield c.wait(0.5); c.play("paper"); yield c.wait(0.5); c.play("paper");
    yield c.note("Paper. Sheet after sheet. PROJECT RIGHTSIZING: FINAL_final_v7.pdf. From: The CEO.");
    yield c.note("\"All Non-Human Resources are to be collected and securely shredded on Floor 11. They will be replaced by The Portal. Have a great weekend.\"");
    yield c.note("There's a list. Every Staplet. Every Mugling. Every sticky note. It's every Deskmate in the building, by name.");
    yield c.note("It's forty thousand pages long. Your Deskmate reads over your shoulder, and goes very quiet.");
    yield c.say("The Printer", "...T R A Y   2   E M P T Y .");
    yield c.note("It isn't a fault code. You understand, now. It never was. It was the only thing it could say. It has been saying NO for eleven years.");
    yield c.say("You", "You weren't broken. You were stopping it. And I just made you sign.");
    c.show("q"); yield c.emote("q");
    yield c.say("Kenzie", "Oh, FANTASTIC. It's out! I'm on the implementation team. Do you know how long we've been waiting on this? This is going to look amazing on my review.");
    yield c.say("You", "Kenzie. They're going to shred them.");
    yield c.say("Kenzie", "We're going to transition them. It's very different. There's a slide.");
    yield c.say("Kenzie", "Great work unblocking this, New Hire. You've really moved the needle.");
    c.hide("q");
    yield c.say("The Printer", "...L O A D   F R I E N D .");
    yield c.recv("jamothy", 22, { text: "The Printer unbolted itself from the floor. Jamothy joined you!" });
    yield c.note("The lift has shuddered back to life. Friday's the deadline. There are four signatures left, and now you know why you want them.");
    c.music("tense");
};
const F5 = {
    id: "F5", name: "Print Services", tag: "FLOOR 5", theme: THEMES.F5, music: "tense",
    map: [
        "##############################",
        "#WW+WW##v###^###E###WW+###WWW#",
        "#.....,,,,,,,,,,,,,,,,,,.....#",
        "#.M.a.,,,,,,,,,,,,,,,,,,..b.M#",
        "#.....,,,,,,,,,,,,,,,,,,.....#",
        "#=====.===========.==========#",
        "#\"\"\"\"\"\"\"\"!..G..V..!\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"!.KKKKK..!\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"!.......f!\"\"\"\"d\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"!.......!\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"........\"\"\"\"\"\"\"\"\"\"\"\"#",
        "####.##########.##############",
        "#.............!......!.....Q.#",
        "#.Q...e.......!..g...!.......#",
        "#.Q...........!......!...h...#",
        "#.............!......!.....Q.#",
        "#=========.====.======.=======",
        "#~~~~~R~~~~~~~~~~~~~~~~~~R~~~#",
        "#~~~~~~~~~~~~R~~~~~~~~~~~~~~~#",
        "#~R~~~~~~~~~~~~~~~~~R~~~~~~~~#",
        "#~~~~~~~~R~~~~~~~~~~~~~~~R~~~#",
        "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
        "#~~~~R~~~~~~~~~~R~~~~~~~~~~~~#",
        "#~~~~~~~~~~~~~~~~~~~~R~~~~~~R#",
        "#=========.==========.========",
        "#.P......Q...............Q.P.#",
        "#.............p........q.....#",
        "#......R....................R#",
        "##############################",
    ],
    up: "F6", down: "F4",
    gateUp: (S) => (S.sigs >= 4 ? null : "A hand-lettered sign: \"NO ACCESS UPSTAIRS UNTIL THE PRINTER IS FIXED. - THE PRINTER COMMITTEE (DISBANDED)\""),
    wild: [["receiptile", 14, 16, 24], ["shredward", 14, 16, 16], ["binjamin", 14, 16, 20], ["formlet", 14, 15, 14], ["duplicate", 15, 16, 12], ["punchline", 15, 16, 14]],
    breakLine: "A coffee machine that prints a small receipt with every cup. Morale restored. Saved.",
    ents: {
        a: fighter("Graham, Toner", "m1", "right", "receiptile:17", "I've worked in toner for twenty years. Look at my hands. Look at my lungs.", "You've got a real... drum unit there.", "Cyan's gone. It's always cyan. You can't print black without cyan. Nobody can tell you why."),
        b: fighter("Fiona, Reprographics", "f3", "left", "shredward:16 formlet:16", "Single-sided? In THIS economy?", "Fine. Collated.", "A4 is the only thing that's ever made sense to me."),
        c: fighter("Terry, Binding", "m3", "down", "duplicate:17 formlet:16", "Comb or wire? Choose carefully.", "Wire. The man's a professional.", "I've bound things you wouldn't believe. Mostly quarterly reports."),
        d: fighter("Nadia, Paper Stock", "f2", "left", "receiptile:17 binjamin:17", "Eighty gram or a hundred? You think there's no difference. There's a difference.", "All right. You've got weight.", "They went paperless in 2009. We've never been busier."),
        e: fighter("Pete, Mail Merge", "m6", "right", "punchline:18", "Dear <FIRSTNAME>, I am going to destroy you.", "Yours sincerely, <SENDER>.", "<NAME>, you've got a good heart, <NAME>."),
        f: npc("Sue", "f6", ["The Printer used to be Print Services' Head. I mean, its boss retired. In the reshuffle, nobody replaced her. So they promoted the Printer.", "It's got an office. A parking space. It's quite good, as Heads go."]),
        g: npc("Waiting Man", "m5", ["I sent a document to print in 2015. I'm just going to wait. They said it was next in the queue.", "It's a pizza menu. I've forgotten why."]),
        h: npc("Jo", "f1", (function* (c) {
            if (c.has("mid")) { yield c.say("Jo", "It's stopped. Eleven years of grinding, and it's gone quiet. I didn't know you could miss a noise."); return; }
            yield c.say("Jo", "It's in the back. Over the chutes. Mind your step: the floor's been six inches deep in paper since the Merger.");
            yield c.say("Jo", "You can't stop on the loose stuff. You go till you hit something. Plan your line.");
        })),
        p: fighter("The Printer", null, "down", "jamothy:21", "...W A R M I N G   U P .", "...T R A Y   2   E M P T Y .", "...", { beast: "jamothy", size: 74, boss: "printer", hpx: 2, title: "Head of Print Services", fmt: 2, reward: 1200, noSight: true, after: printerAfter, show: (S) => !S.flags.mid }),
        q: { t: "npc", name: "Kenzie", look: "kenzie", key: "F5.q", dir: "up", turn: false, hiddenStart: 1 },
    },
};

export const FLOORS = { L, B1, F2, F3, F4, F5, ...FLOORS2 };
for (const f of Object.values(FLOORS)) { f.themeId = f.themeId ?? f.id; f.wild = f.wild ?? []; }
export const liftOpen = (S, f) => S.seenFloors[f] || (f === "B2" && S.flags.archive) || (f === "F11" && S.flags.ready11) || (f === "R" && S.flags.credits);
export const LIFT_ORDER = ["L", "B1", "F2", "F3", "F4", "F5", ...LIFT2];
export const QUESTS = [
    { flag: "q_stapler", name: "Kevin's Stapler", hint: "Find a beige stapler for Kevin on 2." },
    { flag: "q_dave", name: "Dave's Card", hint: "Get four people on other floors to sign Dave's card for Janet on 3." },
    { flag: "q_thermo", name: "The Thermostat War", hint: "Settle Ravi and Hannah on 4." },
    { flag: "q_pass", name: "password1", hint: "Find Mike's sticky note on 4." },
    ...QUESTS2,
];
