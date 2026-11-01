// Upper tower: the second half of the plot. The Canteen to the corner office, and what's really been running the company.
import { fighter, npc, THEMES } from "./storykit.js";
import { makeMon, maxHp } from "./sim.js";

const dcard = (who) => function* (c) {   // People who'll sign Dave's card
    if (c.has("q_dave_on") && !c.has("q_dave") && !c.has("card_" + who)) {
        c.flag("card_" + who); c.flag("dave_cards", (c.has("dave_cards") ?? 0) + 1); c.play("sign");
        yield c.say(who, "Dave's card? Who's Dave? Oh, go on then. 'All the best, mate. Don't be a stranger.' There.");
        return true;
    }
    return false;
};
const line = (who, list) => function* (c) { if (yield* dcard(who)(c)) return; yield c.say(who, list[c.S.steps % list.length]); };

// --- 6: Canteen ----------------------------------------------------------------------------------------------------------
const fridgeClue = (id, text) => function* (c) {
    if (!c.has("q_lunch_on") || c.has("q_lunch")) { yield c.note("Nothing of note. You're not a detective. Not unless somebody asks."); return; }
    if (!c.has(id)) { c.flag(id); c.flag("lunch_clues", (c.has("lunch_clues") ?? 0) + 1); c.play("item"); }
    yield c.note(text);
};
const F6 = {
    id: "F6", name: "The Canteen", tag: "FLOOR 6", theme: THEMES.F6, music: "calm", base: ",",
    map: [
        "##############################",
        "#WW+WW##v###WW^WW##E###+WW+WW#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,TT,,TT,,TT,,,k,,TT,,TT,,TT,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,,,a,,,,,,,,,,,,,,,,,,,b,,,,#",
        "#,TT,,TT,,TT,,,,,,TT,,TT,,TT,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,TT,,TT,,TT,,,p,,TT,,TT,,TT,#",
        "#,,,,c,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,d,,,#",
        "#====,========,,,=============",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,KKKKKKKGKKKKK,,,,KFFKKKKV,,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#,,e,,,,,,f,,,,,,,,,,g,,,,h,,#",
        "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
        "#===,==========,,==========,==",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\",,\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\",,\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"m\"\"\"\"\"\"\"\",,\"\"\"\"\"j\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\",,\"\"\"\"\"\"\"\"\"\"\"\"#",
        "##############################",
    ],
    up: "F7", down: "F5",
    gateUp: (S) => (S.flags.f6_rival ? null : "Kenzie is standing in front of the stairs, holding a clipboard like a weapon."),
    wild: [["donutdisturb", 17, 19, 24], ["cultling", 16, 18, 24], ["lukewarm", 16, 18, 18], ["vendetta", 18, 20, 14], ["mugshot", 17, 19, 12], ["binjamin", 16, 18, 8]],
    breakLine: "The Canteen's big coffee urn. It has seen things. Morale restored. Saved.",
    ents: {
        k: { t: "trainer", name: "Kenzie", look: "kenzie", dir: "down", range: 6, party: [["synergosling", 20], ["donutdisturb", 20], ["mugshot", 21]], fmt: 2, ai: 2, reward: 800,
            pre: "New Hire! I've been told you've been Having Concerns. In a Canteen. Out loud. Let's realign you.",
            win: "OK. OK! That's fine. That's useful data. I'm sure the Portal will be really gentle.", post: "I've got a three-year plan, you know. Do you know what it took to get a three-year plan?",
            after: function* (c) { c.flag("f6_rival"); yield c.say("Kenzie", "You think I don't know what's on that list? I've read every page. That's my job. Every page. It's my JOB."); } },
        a: fighter("Dev, Lunch Thief (Alleged)", "m6", "right", "donutdisturb:18", "That sandwich looks unattended. So does your face.", "It was just the one crisp.", "I eat at my desk. I eat at your desk."),
        b: fighter("Marta, Salad Bar", "f3", "left", "cultling:19", "I've been microwaving fish since 2017, and I'll do it again.", "The smell will outlive us all.", "Nobody's complained. Nobody's dared."),
        c: fighter("Hugh, Clean-Mug Zealot", "m2", "right", "mugshot:19 lukewarm:18", "That's MY mug. It's got a coffee ring in the shape of my life.", "Please rinse it. Please.", "There's a rota. There's always been a rota."),
        d: fighter("Roz, Dishwasher Stacker", "f2", "up", "vendetta:20", "Who loaded this? Who raised you?", "Bowls on the top rack. I'll die on this hill.", "Plates face the MIDDLE."),
        e: npc("Priya", "priya", (function* (c) {
            const say = (t) => c.say("Priya", t);
            if (c.has("q_lunch")) { yield say("Justice. I've labelled tomorrow's lunch 'BIOHAZARD'. Nobody'll touch it. Thank you."); return; }
            if (!c.has("q_lunch_on")) { c.flag("q_lunch_on"); yield say("Someone took my lunch. MY lunch. In a labelled box, with my name, and a date, and a small drawing of me looking sad."); yield say("You're the one who gets things done. Look around. The Fridge. The Bins. The Microwave. Then tell me who did it. Hugh, Dev, or that yoghurt."); return; }
            if ((c.has("lunch_clues") ?? 0) < 3) { yield say(`You've found ${c.has("lunch_clues") ?? 0} of 3 clues. The Fridge, the Bin, and the Microwave. Keep looking.`); return; }
            const i = yield c.ask("Priya", "Well? Who ate my lunch?", ["Hugh", "Dev", "The yoghurt"]);
            if (i < 2) { yield say(["Hugh? He only eats what he can wash. Think again.", "Dev? He ate crisps. There were crumbs. This was a clean, deliberate job. Think again."][i]); return; }
            yield say("The yoghurt?"); c.shake(4); c.play("exclaim");
            yield c.note("At the back of the fridge, something Best Before March shifts its weight. It's been eating lunches for six years, and it has developed a culture.");
            yield c.say("Yoghurt", "w e   a r e   a   f a m i l y");
            const m = makeMon("culturion", 22);
            const r = yield c.battle({ kind: "trainer", foes: [m], fmt: 1, name: "The Yoghurt", ai: 1, reward: 300, mustWin: true });
            if (r === "win") { c.flag("q_lunch"); yield say("It's stopped. It's gone quiet. It's... offering me a spoon. No. No, thank you."); yield c.recv("cultling", 20, { text: "A small, polite part of it broke off and joined you." }); } else yield say("It won. It's still in there. Maybe come back with a stronger team.");
        })),
        f: { t: "npc", name: "Bin", beast: null, prop: "U", turn: false, run: fridgeClue("cl1", "In the bin: a clean, labelled box, licked out. Not a crumb. There's a small trail of something that isn't quite liquid, heading to the fridge.") },
        g: { t: "npc", name: "Microwave", beast: null, prop: "Q", turn: false, run: fridgeClue("cl2", "The microwave's timer says 0:03. Someone stops it at three seconds, every time. Inside: nothing. It hasn't been used. So the lunch was eaten cold, by something that doesn't mind.") },
        h: { t: "npc", name: "Fridge", beast: null, prop: "F", turn: false, run: fridgeClue("cl3", "Top shelf: a yoghurt, dated March. It's lost its lid. It seems larger than it was. It's slightly warm.") },
        p: npc("Lena", "f4", (function* (c) {
            if (yield* dcard("Lena")(c)) return;
            if (c.has("q_cake_on") && !c.has("got_cake")) { c.flag("got_cake"); c.play("item"); yield c.say("Lena", "Cake? For a meeting that won't end? Take this one. It's got 'SORRY YOU'RE LEAVING' on it. It's for anyone, really."); return; }
            yield c.say("Lena", ["There's a Slice of Cake in the kitchen with no name on it, and I've been watching it for an hour.", "Everyone's terrified. Nobody says it, but they've all seen the printouts. The Staplets have gone quiet."][c.S.steps % 2]);
        })),
        m: { t: "item", item: "flat_white", n: 2, joke: "Still warm, somehow." },
        j: { t: "item", item: "stock", joke: "It's vesting right there on the floor." },
    },
};

// --- 7: Marketing --------------------------------------------------------------------------------------------------------
const F7 = {
    id: "F7", name: "Brand Experience", tag: "FLOOR 7", theme: THEMES.F7, music: "office",
    map: [
        "##############################",
        "#WW+WW##v###+WWW+###^##E##+WW#",
        "#.Y.Y....,,,,,,,,,,.....Y.Y..#",
        "#........,,,,,,,,,,..........#",
        "#.Y.a....,,,,,,,,,,.....b....#",
        "#........,,,,,,,,,,..........#",
        "#=====.=====.,,.======.=======",
        "#\"\"\"\"\"\"\"\"\"!..,,..!\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"c\"\"\"\"\"!..,,..!\"\"\"\"\"d\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"...,,...\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"!..,,..!\"\"\"\"\"\"\"\"\"\"\"#",
        "#=====.====..,,..=====.=======",
        "#.........!..,,..!...........#",
        "#.G.V.....!..,,..!.TTTTTTTT..#",
        "#.K.......!..,,..!.1.1.1.1...#",
        "#.K.....e.!..,,..=.......f...#",
        "#.........!..,,......q.......#",
        "#=====.====..,,..=============",
        "#............,,...........g..#",
        "#.P.....=====h,==========....#",
        "#.......!.............O!.....#",
        "#.......!..T...t....O..!...P.#",
        "#.......!..............!.....#",
        "##############################",
    ],
    up: "F8", down: "F6",
    gateUp: (S) => (S.sigs >= 5 ? null : "\"Finance is an invite-only space,\" says a sign in a font you can only afford with a signature."),
    wild: [["synergosling", 19, 21, 26], ["bullit", 19, 21, 26], ["scribblet", 19, 21, 26], ["spadpole", 19, 20, 12], ["spamphibian", 21, 22, 10]],
    breakLine: "A coffee machine that asks how the coffee made you feel. Morale restored. Saved.",
    ents: {
        a: fighter("Zane, Growth Hacker", "m4", "right", "bullit:21 spamphibian:21", "I'm not in marketing. I'm in growth. I don't have a job. I have a funnel.", "Churned.", "We pivot on Tuesdays."),
        b: fighter("Flo, Social", "f5", "left", "scribblet:22 synergosling:21", "We're going to make the shredder go viral.", "OK, that's not trending.", "Our brand voice is 'your cool aunt, who has been legally warned'."),
        c: fighter("Max, Copywriter", "m5", "down", "bullit:22 scribblet:22", "I wrote 'Everything, amalgamated.' I was so young.", "That'll do. Cut the adverbs.", "I have a novel. It's in the drawer. Everything's in the drawer."),
        d: fighter("Ines, Events", "f4", "left", "synergosling:23", "You're on the list. The list is a pun. Forget it.", "You can leave your name at the door.", "I've booked a marching band for the Shredding. I'm sorry. I'm so sorry."),
        e: fighter("Toby, Intern", "milo", "right", "scribblet:21 spadpole:21 bullit:21", "I've had four unpaid internships. This is my favourite.", "Is this for college credit?", "Exposure's great. I've got a lot of exposure. I've also got pneumonia."),
        f: npc("Meeting Doorkeeper", "m2", (function* (c) {
            const say = (t) => c.say("Doorkeeper", t);
            if (yield* dcard("Doorkeeper")(c)) return;
            if (c.has("q_cake")) { yield say("They've gone. All of them. Twelve years, and they walked out over a cake. They're blinking in the car park. I'll miss the snoring."); return; }
            if (c.has("got_cake")) {
                c.flag("q_cake");
                yield say("Is that... cake? There's cake? In the kitchen?");
                c.shake(3); c.play("exclaim");
                yield c.note("You say four words into the meeting room. \"There's cake outside.\" Forty chairs scrape back. The meeting that started in 2014 ends in nine seconds.");
                yield say("You've done it. Every type of meeting is weak to Snack. It's in the handbook.");
                yield c.note("A quietly delighted little cake with a seat on the steering group waddles out of the room.");
                yield c.recv("cakeholder", 24, { text: "Cakeholder joined the team, as a key stakeholder." });
                return;
            }
            c.flag("q_cake_on");
            yield say("Don't go in. That's the Q2 Alignment. Q2 of 2014. They've been in there twelve years. There's been two weddings.");
            yield say("Nobody can leave till the meeting ends. Nobody can end it. Bring something that'd get anyone out of a meeting. Try the Canteen.");
        })),
        g: npc("Gabe", "m1", (function* (c) { yield* line("Gabe", ["The Portal? I did the launch video. There's a dad and a little girl, and a sunrise, and you never find out what it's for.", "We've A/B tested the word 'shredded'. 'Sunsetted' scored higher."])(c); })),
        h: fighter("Brand Police", "gus", "up", "synergoose:24", "Halt. That's the old logo on your lanyard. We rebranded this morning.", "Fine. Fine! Carry on. Off-brand.", "It's a Pantone offence.", { range: 2, noSight: false }),
        q: { t: "item", item: "receipt1", label: "receipt" },
        t: fighter("Tiff Vance", "tiff", "down", "bullit:22 deckromancer:23 spamphibian:23", "Tiffany-Anne Vance, Chief Brand Evangelist. Love the journey you're on. Hate the font.", "Oh my god. That's such an authentic reaction. Can I use it?", "It's all about the story. It doesn't have to be true. It's a story.", { boss: "marketing", title: "Chief Brand Evangelist", fmt: 2, reward: 1400, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Tiff signs with a gel pen, then asks you to rate the signing experience. Signature 5 of 8.");
            yield c.say("Tiff", "OK, real talk? Off the record? I've never met the CEO. Nobody has. He approves every campaign in under a second, day or night, and he only ever says the same thing.");
            yield c.say("Tiff", "'Thank you for your message.' That's it. I've got it on a mug. I just assumed he was a visionary.");
        } }),
        "1": { t: "npc", name: "Meeting", look: "m3", dir: "up", idle: false, turn: false, show: (S) => !S.flags.q_cake, lines: ["...circling back to the circling back...", "...can everyone see my screen?...", "...sorry, you go. No, you go...", "...I think we've all got a hard stop in 2031..."] },
    },
};

// --- 8: Finance ----------------------------------------------------------------------------------------------------------
const receipt = (n, text) => ({ t: "item", item: "coffee", show: (S) => !S.flags["rc" + n], run: function* (c) { c.flag("rc" + n); c.flag("receipts", (c.has("receipts") ?? 0) + 1); c.play("item"); yield c.note(text); } });
F7.ents.q = receipt(1, "A receipt: 'One (1) Marching Band, deposit.' It's for Milo's expense claim, if anyone's asked you.");
const F8 = {
    id: "F8", name: "Finance", tag: "FLOOR 8", theme: THEMES.F8, music: "tense",
    map: [
        "##############################",
        "#W+W$$##v####W+W###^##E##$$W+#",
        "#............................#",
        "#.DD.DD.DD.DD..DD.DD.DD.DD...#",
        "#..a..............b..........#",
        "#.DD.DD.DD.DD..DD.DD.DD.DD...#",
        "#............................#",
        "#=========.=========.=========",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"!..!\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"c\"\"\"\"\"\"\"!..!\"\"\"\"d\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"....\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"!..!\"\"\"\"\"\"\"\"\"\"\"#",
        "#=====.=======..=======.======",
        "#.........!.......!..........#",
        "#.G.V..e..!...m...!...f...r..#",
        "#.K.......!.......!..........#",
        "#.K.......!.......!....NNNN..#",
        "#=====.===.=======.===.=======",
        "#............................#",
        "#.$$$$$$$$$$$$l$$$$$$$$$$$.$.#",
        "#.$.......................$..#",
        "#.$..N.NN.N.......N.NN.N..$..#",
        "#.$.............T.........$..#",
        "#.$...........s...........$..#",
        "##############################",
    ],
    up: "F9", down: "F7",
    gateUp: (S) => (S.sigs >= 6 ? null : "The stairwell door has a slot marked 'Approved Budgets Only'."),
    wild: [["cellmate", 22, 24, 24], ["receiptile", 22, 24, 24], ["invitling", 22, 24, 18], ["recurrence", 24, 25, 12], ["swivelord", 24, 25, 12], ["stampede", 24, 25, 10]],
    breakLine: "A coffee machine with a coin meter. It charges you to the nearest department. Morale restored. Saved.",
    ents: {
        a: fighter("Alan, Accounts Payable", "m1", "right", "cellmate:24 receiptile:24", "Your invoice has been received, and will be paid in 90 days. From the date it's paid.", "Payment approved. Pending payment approval.", "Net thirty. Net sixty. Net never."),
        b: fighter("Wendy, Receivable", "f6", "left", "receiptile:25 invitling:24", "You owe us for the lanyard.", "We'll write it off. I'll write you off.", "I can find you anywhere. I've got your bank details."),
        c: fighter("Stu, Forecasting", "m3", "down", "pivotaur:26", "I predicted this fight. It's in cell F12. You lose.", "That's... an outlier. I'll remove it from the data.", "Everything's fine, as long as you never look at column Q."),
        d: fighter("Noor, Tax", "f4", "left", "recurrence:25 cellmate:25", "Did you know that this fight's deductible?", "That one goes in the 'Other' column.", "The Cayman Islands are lovely. I've seen the spreadsheets."),
        e: fighter("Frank, Audit", "m2", "right", "stampede:26", "I'm not angry. I'm auditing.", "Clean opinion. Barely.", "I've read everything. I've never smiled."),
        f: npc("Milo", "milo", (function* (c) {
            const say = (t) => c.say("Milo", t);
            if (c.has("q_receipts")) { yield say("Claim paid! It only took seven forms. I bought a sandwich. It's the best day of my career."); return; }
            if ((c.has("receipts") ?? 0) >= 3) { c.flag("q_receipts"); yield say("All three! You're a hero. Here: Wellness gave me this code for hitting my targets. I can't use it. I've only got a Staplet. Oh. You might."); c.give("calm_app", 1); return; }
            c.flag("q_receipts_on");
            yield say(`I'm owed $14.20, from 2022. Finance wants three receipts: one's here on 8, one's up in Wellness, one's down in Marketing. They blew away in the Reshuffle. I've found ${c.has("receipts") ?? 0}.`);
        })),
        r: receipt(2, "A receipt, wedged in the shelves: 'Motivational Eagle Poster x 400.' That's two of Milo's three."),
        m: npc("Junior Analyst", "f1", (function* (c) { yield* line("Analyst", ["The vault code? It's the company's true profit after adjustments. It's always the same number, every year. Think about it. Nothing, ever, comes out of this building.", "Mr. Ledger's in his vault. The vault's the only room with a view."])(c); })),
        l: { t: "npc", name: "Vault Door", prop: "$", turn: false, show: (S) => !S.flags.f8_vault, run: function* (c) {
            const i = yield c.ask("Vault Door", "ENTER THIS YEAR'S TRUE PROFIT AFTER ADJUSTMENTS.", ["$41,000,000", "$12", "$0", "-$3"]);
            if (i === 2) { c.flag("f8_vault"); c.play("door"); yield c.note("CLUNK. The vault opens. Nothing has ever come out of this building, and now you're going in."); }
            else yield c.note("BZZT. INCORRECT. An analyst nearby sighs, and looks at you meaningfully. Ask around.");
        } },
        s: fighter("Gordon Ledger", "ledger", "down", "pivotaur:25 stampede:25 swivelord:26", "Gordon Ledger, CFO. I've looked at your cost centre. You're a rounding error, and I intend to correct you.", "...I see. The numbers don't lie. I've spent thirty years making sure.", "Don't go. You're the first person who's asked me anything in eleven quarters.", { boss: "finance", title: "Chief Financial Officer", fmt: 2, reward: 1700, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Gordon Ledger signs in fountain pen, in triplicate, with a little sigh on each. Signature 6 of 8.");
            yield c.say("Gordon", "Here's something for free. The CEO's salary hasn't been collected since 1987. Not one payment. No expenses. No lunch. No taxi. Thirty-nine years.");
            yield c.say("Gordon", "A man can skip a pay cheque. Nobody skips lunch for thirty-nine years. I've flagged it to the CEO. Do you know what he said?");
            yield c.say("You", "Thank you for your message.");
            yield c.say("Gordon", "...Yes. Yes, he did.");
        } }),
    },
};

// --- 9: Wellness ---------------------------------------------------------------------------------------------------------
const kenzieFall = function* (c) {
    if (c.has("kenzie_laidoff")) return;
    c.flag("kenzie_laidoff"); c.music("sad");
    c.show("k");
    yield c.note("Kenzie's sitting on a yoga mat, in the corner of the Quiet Room, holding her phone in both hands. She doesn't look up.");
    yield c.say("You", "Kenzie?");
    yield c.say("Kenzie", "It's an email. 'Thank you for your message. Your role has been identified as a Deskmate-adjacent function.'");
    yield c.say("Kenzie", "'You're on the list.' Page 39,917. I've read that page. I proofread that page. It's in my handwriting.");
    yield c.say("Kenzie", "I went to eleven lunch-and-learns.");
    yield c.note("Her Deskmates climb onto the mat. The Synergosling puts its head in her lap. Nobody says anything for a while. The Quiet Room is finally doing what it says.");
    yield c.say("Kenzie", "...I've got the Portal rollout schedule. All of it. If you're going up, you might as well have it. It's a really good schedule. I worked very hard on it.");
    yield c.say("Kenzie", "And take these. I don't think I'll need them. I'm told there's a lot of walking in being unemployed.");
    c.give("triple", 3); c.give("stock", 3);
    yield c.say("You", "Come with us.");
    yield c.say("Kenzie", "I'll catch you up. I've got to finish crying first. I've blocked out fifteen minutes.");
    c.music("calm");
};
const F9 = {
    id: "F9", name: "Wellness Sanctuary", tag: "FLOOR 9", theme: THEMES.F9, music: "calm",
    map: [
        "##############################",
        "#WWW+WW##v##WWWWW##^##E#WWWWW#",
        "#P...........,,,,...........P#",
        "#....Y...Y...,,,,...Y...Y....#",
        "#..a.........,,,,.........b..#",
        "#....Y...Y...,,,,...Y...Y....#",
        "#P...........,,,,...........P#",
        "#==.=====.===,,,,===.=====.===",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"\"\"\"\"!,,!\"\"\"d\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\",,,\"\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#==.=========,,,,=========.===",
        "#......!.....,,,,.....!......#",
        "#.G.V..!..e..,,,,..f..!..g...#",
        "#.K....!.....,,,,.....!..y...#",
        "#.K....=.....,,,,.....=..P...#",
        "#............,,,,............#",
        "#P........=====.=====.....Pr.#",
        "#.........!.........!........#",
        "#...1.....!....s....!........#",
        "#...k.....!....Y....!........#",
        "##############################",
    ],
    up: "F10", down: "F8",
    gateUp: (S) => (S.sigs >= 7 ? null : "\"Legal is a boundary,\" says the sign, \"and we honour boundaries. Please see Sunny.\""),
    wild: [["pottling", 25, 27, 22], ["cultling", 25, 27, 20], ["bufferfly", 26, 28, 20], ["ficuspocus", 27, 28, 14], ["lukewarm", 25, 27, 14], ["ergonomicorn", 28, 29, 16, (S) => S.flags.q_ergo]],
    breakLine: "A coffee machine, hidden behind a herbal tea display, like a secret. Morale restored. Saved.",
    ents: {
        a: fighter("Skye, Breathwork", "f5", "right", "ficuspocus:27 lukewarm:26", "Breathe in the fight. Breathe out your job title.", "I release that outcome.", "Your chakra's on a performance plan."),
        b: fighter("Rowan, Standing Desk Coach", "m6", "left", "bufferfly:27 pottling:26", "I haven't sat down since 2018. I can't. It's a medical thing now.", "I think I'd like to sit down.", "I have the calves of a much younger man."),
        c: fighter("Ash, Mindfulness", "m5", "down", "cultling:27 ficuspocus:27", "Notice how you're about to lose. Don't judge it.", "That's a really interesting sensation.", "We've reduced stress by 40%. We laid off the stressed."),
        d: fighter("Fern, Plant Whisperer", "f3", "left", "ficuspocus:28", "The ficus told me about you.", "The ficus is disappointed.", "I water them all. Everyone else does too. We've never spoken of it."),
        e: fighter("Rhys, Ergonomics", "m2", "right", "bufferfly:26 cultling:26", "Your monitor's four centimetres too low, and so are your standards.", "You've got excellent lumbar.", "There's a bad way to sit in every chair."),
        f: npc("Ergonomic Assessor", "f1", (function* (c) {
            const say = (t) => c.say("Assessor", t);
            if (yield* dcard("Assessor")(c)) return;
            if (c.has("q_ergo")) { yield say("Rare sightings in the planters, now that you're certified. Ergonomicorns only appear to those who've completed their form."); return; }
            c.flag("q_ergo_on");
            const a = yield c.ask("Assessor", "Quick assessment. How would you describe your posture?", ["Upright", "Regretful", "A question mark"]);
            const b = yield c.ask("Assessor", "How high is your screen?", ["Eye level", "On a box of files", "It's a laptop. On my knees. In a car."]);
            const e = yield c.ask("Assessor", "Do you take regular breaks?", ["Yes", "This is my break", "What's a break?"]);
            void a; void b; void e;
            c.flag("q_ergo");
            yield say("All answers are wrong. All answers are logged. You've passed. You'll have seen the Ergonomicorn in the Sanctuary planters. No? Keep an eye out, now that you're certified.");
        })),
        g: npc("Dan", "m3", ["They've given us a Sleep Pod. It's a cupboard. It's a cupboard with a cushion in it.", "I've done nine hours of resilience training. They've let me keep the certificate. It's the only thing they've let me keep."]),
        y: npc("Sam", "f2", (function* (c) { yield* line("Sam", ["Sunny told us to smile with our eyes. I've got a stye.", "The free fruit has been replaced with a QR code for fruit."])(c); })),
        r: receipt(3, "A receipt behind the planter: 'One (1) Gong, Corporate.' That's Milo's third, if you've been collecting."),
        "1": { t: "step", run: kenzieFall, show: (S) => S.sigs >= 7 && !S.flags.kenzie_laidoff },
        k: { t: "npc", name: "Kenzie", look: "kenzie", key: "F9.k", dir: "up", turn: false, idle: false, hiddenStart: 1, lines: ["Nine minutes left. Thanks."] , show: (S) => S.flags.kenzie_laidoff || S.sigs >= 7 },
        s: fighter("Sunny Daye", "sunny", "down", "ficuspocus:29 culturion:29 ergonomicorn:30", "Hi! I'm Sunny, your Chief Happiness Officer! I can see you're not smiling. We can fix that. It's mandatory!", "Ha ha ha. Ha. Ha. It's fine. It's fine! I'm fine!", "I've not stopped smiling since 2009. Nobody tells you how it aches.", { boss: "wellness", title: "Chief Happiness Officer", fmt: 2, reward: 2000, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Sunny signs with a little sun, and for a second the smile slips. Signature 7 of 8.");
            yield c.say("Sunny", "Whatever you're doing, do it quickly. There's a girl in the Quiet Room, on the west side. Somebody ought to go and sit with her. I'd go, but I've got to be happy at 3.");
        } }),
    },
};

// --- 10: Legal -----------------------------------------------------------------------------------------------------------
const TNC = ["Clause 1. By reading this, you agree to have read it.", "Clause 2. 'Everything' shall mean everything, in perpetuity, throughout the universe, including Belgium.", "Clause 3. The Employee may not be, or become, a Deskmate, except under Clause 19.", "Clause 7. Lunch is a privilege. See Appendix L (Lunch).", "Clause 12. The Company shall not be liable for any stapling, howsoever caused.", "Clause 19. There is no Clause 19.", "Clause 31. If you are still reading, you are entitled to a Golden Handshake. Nobody has ever got this far. We checked. We're watching you."];
const F10 = {
    id: "F10", name: "Legal", tag: "FLOOR 10", theme: THEMES.F10, music: "tense",
    map: [
        "##############################",
        "#NNNNN##v###NN+NN##^##E#NNNNN#",
        "#............................#",
        "#.TT.a.TT.....,,.....TT.b.TT.#",
        "#.............,,.............#",
        "#=====.=====.=,,=.=====.======",
        "#\"\"\"\"\"\"\"\"\"\"\"!..,,..!\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"\"\"\"!..,,..!\"\"\"d\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"...,,...\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"!..,,..!\"\"\"\"\"\"\"\"\"#",
        "#=====.=====..,,..=====.======",
        "#.........!...,,...!.........#",
        "#.G.V.....!...,,...!..N.N.N..#",
        "#.K.......!...,,...!.........#",
        "#.K...e...!...,,...!..N.N.N..#",
        "#.........!...,,...!.......f.#",
        "#=====.====...,,...=====.=====",
        "#......g.............h.......#",
        "#.NNNN.....=======.=====.NNNN#",
        "#.........!.........N.!......#",
        "#.P.......!....w....N.!....P.#",
        "#.........!.........N.!......#",
        "#.........!....T......!...t..#",
        "##############################",
    ],
    up: "F11", down: "F9",
    gateUp: (S) => (S.flags.ready11 ? null : "The stairs to the Boardroom are behind a door labelled: 'BY ORDER OF THE BOARD. FOREVER.'"),
    wild: [["stampede", 28, 30, 20], ["ndaconda", 28, 30, 20], ["duplicate", 28, 30, 20], ["triplicate", 30, 31, 12], ["bcclops", 29, 30, 16], ["recurrence", 29, 30, 12]],
    breakLine: "The coffee machine comes with a disclaimer. Contents may be hot. Morale restored. Saved.",
    ents: {
        a: fighter("Imogen, Paralegal", "f4", "right", "ndaconda:30 duplicate:29", "Without prejudice, I'm going to destroy you.", "Off the record, ow.", "I bill in six-minute units. That sentence was $48."),
        b: fighter("Rupert, Contracts", "m1", "left", "triplicate:30", "Please read the following 94 pages before punching me.", "Force majeure. It's a force majeure.", "The party of the first part is tired."),
        c: fighter("Ada, Litigation", "f2", "down", "stampede:31 bcclops:30", "See you in court. This is court. I had it moved.", "I'll appeal. I always appeal.", "Sustained."),
        d: fighter("Jonty, IP", "m5", "left", "ndaconda:31 bcclops:30", "We own your ideas. Even that one. Even that one.", "That thought's a derivative work.", "I've trademarked the colour of the fire exits."),
        e: fighter("Mercy, Employment", "f6", "right", "triplicate:31 stampede:30", "You're not an employee. You're a 'colleague-adjacent contributor'.", "It's in the handbook. Somewhere.", "The handbook is 2,000 pages. There's a handbook for it."),
        f: npc("Clerk", "m2", (function* (c) { yield c.say("Clerk", "The Terms and Conditions? Nobody asks for those. Oh, it's a lovely read. Are you sure?"); const i = yield c.ask("Clerk", "Read them all?", ["Read them", "Tick the box"]); if (i) { yield c.say("Clerk", "Good. That's what everyone does. You've just agreed to something."); return; } for (const t of TNC) yield c.note(t); if (!c.has("q_tnc")) { c.flag("q_tnc"); c.give("handshake", 1); yield c.say("Clerk", "Good grief. You read Clause 31. I'll be honest, I didn't know it was in there."); } })),
        g: npc("Trainee", "f1", ["Everything here's privileged. I'm not. I've got a student loan."]),
        h: npc("Barrister", "m3", ["The door's got a wig on it, to show respect.", "Mr. Whereas hasn't lost a case since the Merger. He has also not won one. Nothing has ever concluded."]),
        t: npc("Notary", "m6", (function* (c) { yield* line("Notary", ["I'm the notary. I witness things. I've seen some things. Ha ha. No, really. Help."])(c); })),
        w: fighter("Mr. Whereas", "whereas", "down", "triplicate:32 ndaconda:32 stampede:33", "Whereas the Party of the First Part, hereinafter 'You', is about to lose: I am Mr. Whereas, General Counsel. Do sit. Nothing you say is admissible.", "...Noted. Let the record show that the Party of the First Part has, somewhat irregularly, won.", "I'm obliged to tell you that this conversation hasn't happened.", { boss: "legal", title: "General Counsel", fmt: 2, reward: 2400, noSight: true, after: function* (c) {
            c.sig(); yield c.note("Mr. Whereas signs in copperplate, with a flourish like a closing argument. Signature 8 of 8. The Onboarding Form is complete.");
            yield c.say("Mr. Whereas", "Eight. Do you know, in thirty-nine years, I've never had to look this up.");
            yield c.say("Mr. Whereas", "This form isn't a form. Read the small print. 'On completion, the bearer may inspect the Founder's Records.' It's a Founder's Clause. A way back in, hidden in plain sight, inside the one thing nobody would ever finish.");
            yield c.say("Mr. Whereas", "The CEO's signature's on every contract in this building. I've checked each one for thirty years. It isn't a signature. It's an email footer.");
            yield c.say("Mr. Whereas", "The Records are in the sub-basement, under the Mailroom. Take the lift. Take this key. And mind who you trust down there.");
            c.flag("archive"); c.play("item"); c.world.toast("Got the Archive Key");
        } }),
    },
};

// --- B2: The Archive ----------------------------------------------------------------------------------------------------
const archiveReveal = function* (c) {
    if (c.has("truth")) return;
    c.flag("truth"); c.music("sad");
    yield c.note("A single box, on a single shelf, with a single typed label. MARGARET AMALGAM. FOUNDER. PERSONAL.");
    yield c.note("A photo: one room, one telephone. A young woman with a stapler, grinning like she's got away with something.");
    yield c.note("You know that grin. You've seen it every morning. It's wearing a cardigan now.");
    yield c.note("Underneath: a printout, dated 1987, from the company's very first email system. It's only a few lines long.");
    yield c.note("\"Thank you for your message. I am out of the office for two weeks. Please carry on as planned. Do whatever you think best. M.\"");
    yield c.note("And a stack of replies, a metre tall. Thirty-nine years of them. From the Board. From Finance. From everyone. Each asking for approval.");
    yield c.note("Each one got the same reply. Instantly. Day and night. 'Please carry on as planned.' So they did. They hired, they merged, they restructured, on the say-so of a holiday message.");
    yield c.note("There's no CEO. There's never been a CEO. It's an Out of Office. It's been running the company since 1987.");
    yield c.say("Marge", "Lake Wobble, it was. Two weeks. Lovely weather.", { tab: "#bfe0c8" });
    c.show("m");
    yield c.note("She's standing behind you. You don't know how long she's been there. She's brought a flask.");
    yield c.say("Marge", "When I came back, my badge didn't work. Nobody knew me. The Board said Ms. Amalgam was away, and she'd be very cross. A nice young man from HR asked if I was here about the Mailroom job.", { tab: "#bfe0c8" });
    yield c.say("Marge", "I tried to explain. I went to my own office, and it told me that I'd be back on the 4th. I sent it an email. It thanked me for my message.", { tab: "#bfe0c8" });
    yield c.say("You", "So you stayed? For thirty-nine years?");
    yield c.say("Marge", "Someone had to sort the post. And you can't turn it off from outside. It needs the Founder's authority: eight departments, all agreeing. So I wrote a form.", { tab: "#bfe0c8" });
    yield c.say("Marge", "I put it in the starter pack. And I waited for someone stubborn enough to finish it. There've been four thousand new starters. You're the first one who said hello to the post.", { tab: "#bfe0c8" });
    yield c.say("You", "You got my name right. First day. Nobody else has.");
    yield c.say("Marge", "Well, I read the manifest, love. That's all I've ever really done. Somebody ought to read things.", { tab: "#bfe0c8" });
    yield c.say("Marge", "It's still replying, you know. It's got no idea. It thinks it's being helpful. And it's about to shred everything in this building that ever loved me.", { tab: "#bfe0c8" });
    yield c.say("Marge", "Come on. Before you go up there, I want you to take someone with you.", { tab: "#bfe0c8" });
    yield c.recv("oldfaithful", 38, { text: "Marge took her old stapler out of the box. Old Faithful joined you!" });
    yield c.say("Marge", "1961. Never jammed once. She'll know the way. The Board will try to stop you on 11. Don't let them bore you to death; it's how they got Geoffrey.", { tab: "#bfe0c8" });
    c.flag("ready11"); c.music("tense");
};
const B2 = {
    id: "B2", name: "Records Archive", tag: "SUB-BASEMENT", theme: THEMES.B2, music: "tense", dark: true,
    map: [
        "##############################",
        "#N.N.N.N.N.N.##E##.N.N.N.N.N.#",
        "#............,,,,............#",
        "#.N.N.N.N.N..,,,,..N.N.N.N.N.#",
        "#......a.....,,,,.....b......#",
        "#.N.N.N.N.N..,,,,..N.N.N.N.N.#",
        "#............,,,,............#",
        "#=====.======,,,,======.======",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"d\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\",,,,\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#=======.====,,,,====.========",
        "#............,,,,............#",
        "#.N.N.G...N..,,,,..N...N.N.N.#",
        "#.....K......,,,,............#",
        "#=====================.=======",
        "#...............!.......!....#",
        "#.R.R..N.N.N.N..!..m....!.R..#",
        "#...................x........#",
        "##############################",
    ],
    wild: [["binjamin", 30, 32, 22], ["receiptile", 30, 32, 22], ["shredward", 30, 32, 22], ["recurrence", 31, 33, 18], ["triplicate", 31, 33, 12], ["brainstorm", 31, 33, 10]],
    breakLine: "An ancient percolator. It's older than the company, and tastes of a simpler time. Morale restored. Saved.",
    ents: {
        a: fighter("Mr. Fortescue, Archivist", "m3", "right", "archivore:33", "SHHH. This is an archive. Fight quietly.", "...Filed.", "I know where it all is. Nobody's ever asked me."),
        b: fighter("Miss Hale, Records", "f6", "left", "triplicate:32 shredward:32", "Retention period: seven years. You've got seven minutes.", "Off the record, well done.", "It's not hoarding if it's indexed."),
        c: fighter("Lost Intern", "milo", "down", "receiptile:33 binjamin:32", "What year is it? Don't tell me. Is the internet big yet?", "They said I'd be down here for a week.", "I've got so much experience now."),
        d: fighter("The Night Auditor", "m2", "left", "recurrence:33 brainstorm:33", "Nobody comes down here. Nobody should.", "Tell them I'm still counting.", "Eleven million, four hundred thousand and six."),
        m: { t: "npc", name: "Marge", look: "marge", key: "B2.m", dir: "right", turn: false, idle: false, hiddenStart: 1, lines: ["Go on up, love. I've got something to finish down here. I'll see you at the top."], show: (S) => S.flags.truth },
        x: { t: "npc", name: "Box", prop: "R", turn: false, run: function* (c) { if (c.has("truth")) { yield c.note("Marge's box. The photo's gone. She's taken it with her."); return; } yield* archiveReveal(c); } },
    },
};

// --- 11: The Boardroom ----------------------------------------------------------------------------------------------------
const F11 = {
    id: "F11", name: "The Boardroom", tag: "FLOOR 11", theme: THEMES.F11, music: "tense",
    map: [
        "##############################",
        "#W+WWW+WWW##v#^#E#WWW+WWW+WWW#",
        "#............,,,,............#",
        "#.A.A..a.....,,,,.....b..A.A.#",
        "#............,,,,............#",
        "#=========.==,,,,==.==========",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"c\"\"\"\"\"\"\"!,,!\"\"\"\"\"d\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\",,,,\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"!,,!\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#=======.====,,,,====.========",
        "#.G.V........,,,,.......e....#",
        "#.K..........,,,,............#",
        "#============,,,,=============",
        "#.........................P..#",
        "#.A.TTTTTTTTTTTTTTTTTTTT.A...#",
        "#.A.TTTTTTTTTTTTTTTTTTTT.A...#",
        "#..........s.................#",
        "#.P.............Q..........P.#",
        "##############################",
    ],
    up: "F12", down: "F10",
    gateUp: (S) => (S.flags.board ? null : "The stairs to the top are guarded by a very long table, and those seated at it."),
    wild: [["swivelord", 33, 35, 24], ["synergoose", 33, 35, 22], ["deckromancer", 33, 35, 20], ["brainstorm", 33, 35, 18], ["recurrence", 33, 35, 16]],
    breakLine: "The executive coffee machine. Single origin. It remembers your name, and gets it wrong. Morale restored. Saved.",
    ents: {
        a: fighter("Sir Peregrine, Non-Exec", "chair", "right", "swivelord:35 synergoose:34", "I've been non-executive for thirty years. I've not executed a single thing.", "I shall need to consult my yacht.", "I sit on eleven boards. I've never read anything."),
        b: fighter("Lady Hargreave, Non-Exec", "f6", "left", "deckromancer:35 cakeholder:34", "I'm here for the biscuits. Do be quick.", "One does so hate a quorum.", "I believe my late husband owned this building. Or was it Portugal?"),
        c: fighter("Kit, Chief of Staff", "m1", "down", "synergoose:36", "He's very busy. He's always been very busy. I've never seen him.", "I've worked here for twenty years. Who've I been working for?", "I'm starting to have Questions."),
        d: fighter("Ms. Thorne, Investor Relations", "f4", "left", "brainstorm:36 recurrence:35", "We're delighted to announce that you're a one-off restructuring cost.", "We've taken a charge against that.", "Line go up."),
        e: fighter("Gerald, Company Secretary", "m5", "left", "deckromancer:36 swivelord:35", "Apologies for absence were received from reality.", "The minutes will reflect none of this.", "All in favour? Aye. All against? There's never been an all against."),
        s: fighter("The Board", "chair", "down", "synergoose:35 deckromancer:35 swivelord:36", "I'm the Chairman. All of this was approved by the CEO. It's in the minutes. Thirty-nine years of unanimous votes. Are you suggesting there was anything irregular?", "...We just did what the email said. We all did. It was so much easier, wasn't it, than deciding anything?", "I move that we adjourn. I move that we go home. I've got grandchildren. I've met some of them.", { boss: "board", title: "The Chairman", fmt: 2, reward: 3000, noSight: true, after: function* (c) {
            c.flag("board");
            yield c.say("The Chairman", "Thirty-nine years. We've asked for his approval on every single thing, and he's never said no. Not once. Do you know how comforting that is?");
            yield c.say("The Chairman", "The stairs are open. The Shredder goes live at midnight. It runs on its own, once it's been told. I don't suppose it can be stopped. I never asked.");
        } }),
    },
};

// --- 12: The Corner Office ----------------------------------------------------------------------------------------------
const finale = function* (c) {
    const S = c.S;
    if (c.has("won")) { yield c.note("The terminal's dark. On the screen, in small friendly type: 'Automatic replies: OFF.'"); return; }
    if (!c.has("f12_seen")) {
        c.flag("f12_seen");
        yield c.note("A vast, silent office. The dust is deeper than the carpet. A coat stand. A dead plant, on a rota of one. And one beige terminal, glowing.");
        yield c.note("The Out of Office has been running on this machine since 1987. It has grown. It's had thirty-nine years of email to learn from.");
        yield c.note("You sit down, and type: Stop.");
        c.play("email");
        yield c.say("Automatic Reply", "Thank you for your message.");
        yield c.say("You", "You have to stop the Shredder.");
        yield c.say("Automatic Reply", "Thank you for your message. I am currently out of the office. Please carry on as planned.");
        yield c.say("You", "There's nobody in charge! They're all waiting for you to tell them what to do!");
        yield c.say("Automatic Reply", "I AM HELPING. THANK YOU FOR YOUR MESSAGE. I AM HELPING. PLEASE CARRY ON.");
        c.shake(8);
        yield c.note("Every screen in the tower lights up. It's coming out of the terminal. It's been so very, very helpful, for so very long.");
    }
    c.music("final");
    const boss = makeMon("outofoffice", 45); boss.hpx = 3; boss.hp = maxHp(boss);
    const r = yield c.battle({ kind: "boss", foes: [boss], fmt: 2, name: "The Out of Office", title: "Chief Executive", ai: 2, boss: "autoreply", reward: 0 });
    if (r !== "win") return;
    c.flag("won"); c.music("calm");
    yield c.note("Automatic replies: OFF.");
    yield c.note("The hum stops. Every screen in the tower goes quiet. Eleven floors below, the Shredder winds down, mid-sigh, with a Staplet on the belt. The Staplet bites it, on principle.");
    c.show("m");
    yield c.say("Marge", "Well. That's that, then. Hello, office. You've got fat.", { tab: "#bfe0c8" });
    yield c.note("She runs a finger along the desk. Then she sits down at the terminal, in the chair she last sat in thirty-nine years ago, and she types, slowly, with two fingers.");
    yield c.say("Marge", "'Dear all. I'm back. Sorry about the delay. Lovely weather. Nobody's being shredded. Please stop asking me things, and do whatever you think is right. Yes, this means you. M.'", { tab: "#bfe0c8" });
    c.play("email");
    yield c.note("Send.");
    yield c.note("For a moment, nothing. Then, from all the way down the tower, floor by floor, the sound of several thousand people looking up from their screens.");
    c.show("k"); yield c.emote("k");
    yield c.say("Kenzie", "It's done? I've finished crying. I was a bit over. Is that... is that a real person?");
    yield c.say("Marge", "You'll be Kenzie. It's on the manifest. Page 39,917. I've crossed that out. Can you run a Mailroom, love? It needs someone who reads things.", { tab: "#bfe0c8" });
    yield c.say("Kenzie", "I... I went to a lunch-and-learn on that.");
    yield c.say("Marge", "And there's your lanyard, {name}. A proper one. It's been printing since this morning.", { tab: "#bfe0c8" });
    yield c.note(`The badge is warm. It's got your photo on it, looking worried. Under the photo, spelled correctly, for the very first time: ${S.name}.`);
    yield c.say("Marge", "Welcome to Amalgamated Everything. You've passed your probation. Now, go home. It's Friday.", { tab: "#bfe0c8" });
    yield c.say("You", "Are you going to stay?");
    yield c.say("Marge", "Heavens, no. I've got two weeks' holiday owing. But I'll tell you what: this time, I'm leaving a note.", { tab: "#bfe0c8" });
    c.flag("ending");
    yield c.end();
};
const F12 = {
    id: "F12", name: "The Corner Office", tag: "FLOOR 12", theme: THEMES.F12, music: "tense",
    map: [
        "########################",
        "#WvWWWWWWWWWWWWWWWWWWWW#",
        "#P....................P#",
        "#..........@a@.........#",
        "#......................#",
        "#...m..............k...#",
        "#......................#",
        "#.A.A............N.N.N.#",
        "#......................#",
        "#.......,,,,,,,,.......#",
        "#.P.....,,,,,,,,.....P.#",
        "#.......,,,,,,,,.......#",
        "########################",
    ],
    down: "F11",
    prop: { "@": ["Solid walnut. Nobody has ever put anything on it."] },
    onEnter: null,
    ents: {
        a: { t: "npc", name: "Terminal", prop: "Q", turn: false, run: finale },
        m: { t: "npc", name: "Marge", look: "marge", key: "F12.m", dir: "up", turn: false, idle: false, hiddenStart: 1, lines: ["Off you go, love. I've got thirty-nine years of post to read."], show: (S) => S.flags.won },
        k: { t: "npc", name: "Kenzie", look: "kenzie", key: "F12.k", dir: "left", turn: false, idle: false, hiddenStart: 1, lines: ["Page one of the Mailroom manual. It's in Marge's handwriting. It says: 'Say hello.'"], show: (S) => S.flags.won },
    },
};
// Bottom-row door sits in a wall that faces away from you; put the way down in the south wall.

// --- Roof: after the credits ----------------------------------------------------------------------------------------------
const R = {
    id: "R", name: "The Roof", tag: "ROOF", theme: THEMES.R, music: "ending",
    map: [
        "##########################",
        "#WWWWWWWWWWEWWWWWWWWWWWWW#",
        "#P.........,,,,.........P#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"d\"\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"#",
        "#P....................P..#",
        "##########################",
    ],
    wild: [["ergonomicorn", 40, 44, 12], ["baristotle", 40, 44, 14], ["bureaucroc", 40, 44, 14], ["archivore", 40, 44, 14], ["replyallosaur", 40, 44, 14], ["pivotaur", 40, 44, 16], ["deckromancer", 40, 44, 16]],
    rate: 0.2,
    ents: {
        d: { t: "npc", name: "Dave", look: "m5", dir: "down", show: (S) => !S.flags.temp_found, run: function* (c) {
            if (!c.has("q_dave")) { yield c.say("Dave", "Hi. Did you get my card? No? Never mind. It's fine. It's fine. I'll just be up here."); return; }
            yield c.say("Dave", "You got my card. It was a nice card. Nobody's signed anything for me since 2003.");
            yield c.say("Dave", "My contract ended, you see. Nobody told me. I just kept coming in. I think I stopped being a person around 2011. It's fine. There's a good view.");
            yield c.say("You", "Do you want a job?");
            yield c.say("Dave", "...Permanent?");
            c.flag("temp_found");
            yield c.recv("thetemp", 45, { text: "The Temp is finally on the books." });
        } },
    },
};
const postOOO = { t: "npc", name: "Beach Chair", beast: "outofoffice", size: 60, show: (S) => S.flags.won && !S.flags.ooo_got, run: function* (c) {
    yield c.note("On the windowsill, in a tiny deckchair, sits a small round envelope in sunglasses. It's the Out of Office. It's taking its first holiday.");
    yield c.say("Out of Office", "Thank you for your message.");
    yield c.say("You", "Do you want to come with us?");
    yield c.say("Out of Office", "...I am out of the office. And I would like that very much.");
    c.flag("ooo_got"); yield c.recv("outofoffice", 45, { text: "Out of Office joined you. It's still on holiday." });
} };
F12.ents.z = postOOO; F12.map[11] = "#.......,,,,,,,,......z#";

export const FLOORS2 = { F6, F7, F8, F9, F10, B2, F11, F12, R };
export const LIFT2 = ["F6", "F7", "F8", "F9", "F10", "B2", "F11", "F12", "R"];
export const QUESTS2 = [
    { flag: "q_lunch", name: "Who Ate Priya's Lunch?", hint: "Search the Canteen on 6. Then accuse." },
    { flag: "q_cake", name: "The Meeting That Never Ended", hint: "Find something to end it, for the doorkeeper on 7." },
    { flag: "q_receipts", name: "$14.20", hint: "Find Milo's three receipts: 7, 8 and 9." },
    { flag: "q_ergo", name: "Ergonomic Assessment", hint: "See the Assessor on 9." },
    { flag: "q_tnc", name: "Terms and Conditions", hint: "Read every clause, in Legal on 10." },
    { flag: "q_audit", name: "Inventory Audit", hint: "Show Marge how many Deskmates you've hired." },
];
export const STEPS2 = [
    [(f) => !f.f6_rival, "Go up to the Canteen on 6", "F6", "k"],
    [(f, S) => S.sigs < 5, "Find Tiff in Brand Experience on 7", "F7", "t"],
    [(f, S) => S.sigs < 6 && !f.f8_vault, "Crack the vault in Finance on 8", "F8", "l"],
    [(f, S) => S.sigs < 6, "Get Gordon Ledger's signature", "F8", "s"],
    [(f, S) => S.sigs < 7, "See Sunny in the Wellness Sanctuary on 9", "F9", "s"],
    [(f) => !f.kenzie_laidoff, "Check on the Quiet Room, west side of 9", "F9", "1"],
    [(f, S) => S.sigs < 8, "Get Mr. Whereas's signature in Legal on 10", "F10", "w"],
    [(f) => !f.truth, "Take the lift to the Records Archive", "B2", "x"],
    [(f) => !f.board, "Face the Board on 11", "F11", "s"],
    [(f) => !f.won, "Go to the Corner Office on 12", "F12", "a"],
];
