// The rules of the office: types, moves, perks, Deskmates and items. Pure data, shared by the game and the bots.

export const TYPES = {
    paper: { name: "Paper", color: "#e8c98a", dark: "#8a6a2e" }, email: { name: "Email", color: "#6aa7ee", dark: "#25508f" },
    tape: { name: "Red Tape", color: "#e5484d", dark: "#8c1f25" }, coffee: { name: "Coffee", color: "#a06a44", dark: "#4f2e18" },
    hardware: { name: "Hardware", color: "#9aa4b5", dark: "#454e60" }, meeting: { name: "Meeting", color: "#a487f5", dark: "#4f369c" },
    tech: { name: "Tech", color: "#2fa6a0", dark: "#135c58" }, snack: { name: "Snack", color: "#ff9a5c", dark: "#a34c17" },
    wellness: { name: "Wellness", color: "#6cc265", dark: "#2c6d28" }, none: { name: "Admin", color: "#c9c3b3", dark: "#6b665a" },
};
// attacker -> defender. Each pair carries the office logic the type screen shows.
export const STRONG = {
    paper: { email: "Get it in writing.", meeting: "The minutes are binding." },
    email: { tape: "Per my last email.", meeting: "This could have been an email." },
    tape: { paper: "Needs three signatures.", wellness: "Mandatory compliance training.", snack: "Allergen disclosure required." },
    coffee: { tech: "Spilled on the keyboard.", paper: "Permanent ring stain." },
    hardware: { paper: "Stapled. Shredded. Done.", tape: "Scissors exist.", snack: "Kicked the vending machine." },
    meeting: { coffee: "It went cold in the meeting.", wellness: "Back-to-back until 6.", hardware: "Scheduled maintenance." },
    tech: { paper: "We're going paperless.", hardware: "Firmware update.", email: "Caught by the spam filter." },
    snack: { meeting: "There's cake in the kitchen!", wellness: "Cheat day." },
    wellness: { tech: "Digital detox.", coffee: "Have you tried herbal tea?", email: "Notifications off." },
};
export const WEAK = {
    paper: ["hardware", "tech"], email: ["paper", "tech"], tape: ["hardware", "email"], coffee: [],
    hardware: ["tech", "meeting"], meeting: ["email", "snack"], tech: ["coffee", "wellness"], snack: ["hardware", "tape"], wellness: ["snack", "meeting"],
};
export const effectiveness = (atk, types) => {
    let m = 1;
    if (atk === "none") return 1;
    for (const t of types) { if (STRONG[atk]?.[t]) m *= 2; else if (WEAK[atk]?.includes(t)) m *= 0.5; }
    return m;
};

export const STATUS = {
    meeting: { name: "In a Meeting", short: "MTG", color: "#a487f5" }, mute: { name: "On Mute", short: "MUTE", color: "#6b7385" },
    burnout: { name: "Burnout", short: "BURN", color: "#f07a3c" }, replyall: { name: "Reply-All Storm", short: "RPLY", color: "#6aa7ee" },
};

// id: [name, type, category h/s/x, power, accuracy, cooldown, extras, text]
const raw = {
    nudge: ["Gentle Nudge", "none", "h", 35, 100, 0, {}, "As per our conversation."],
    // Paper
    paper_cut: ["Paper Cut", "paper", "h", 42, 100, 0, {}, "Small. Shallow. Unforgivable."],
    sticky_slap: ["Sticky Slap", "paper", "h", 45, 100, 0, { foe: { pace: -1 }, chance: 30 }, "May slow the target down."],
    memo: ["Strongly Worded Memo", "paper", "s", 58, 100, 0, {}, "Three paragraphs. One underline."],
    paper_plane: ["Paper Plane", "paper", "h", 40, 100, 0, { prio: 1 }, "Always goes first. Hits a stranger."],
    tidy_desk: ["Tidy Desk", "paper", "x", 0, 100, 1, { target: "self", heal: 0.4 }, "Restores 40%. A clean desk heals the soul."],
    file_away: ["File Away", "paper", "x", 0, 100, 1, { target: "self", self: { def: 1, sav: 1 } }, "Raises Grit and Savvy."],
    paper_trail: ["Paper Trail", "paper", "s", 72, 100, 0, { sure: 1 }, "It always finds you."],
    ream: ["Five Hundred Sheets", "paper", "h", 92, 95, 2, {}, "A full ream, at speed."],
    minutes: ["Minutes of Doom", "paper", "s", 115, 95, 3, {}, "Everything you said, in writing."],
    // Email
    ping: ["Ping", "email", "s", 40, 100, 0, { prio: 1 }, "Always goes first. Just checking in!"],
    per_my_last: ["Per My Last Email", "email", "s", 62, 100, 0, { vol: "passive", chance: 30 }, "May leave the target Second-Guessing."],
    cc_all: ["CC Everyone", "email", "s", 50, 100, 0, { target: "all" }, "Hits both foes."],
    flag_urgent: ["Flag as Urgent", "email", "x", 0, 100, 1, { target: "self", self: { sav: 2 } }, "Sharply raises Savvy. Nothing is actually urgent."],
    bounce: ["Bounce Back", "email", "s", 70, 100, 0, { slowBonus: 1 }, "Hits harder if the user moves last."],
    unsubscribe: ["Unsubscribe", "email", "x", 0, 100, 1, { clear: 1 }, "Wipes the target's stat changes."],
    reply_all: ["Reply All", "email", "s", 78, 95, 2, { target: "all", status: "replyall", chance: 40 }, "May start a Reply-All Storm. On both foes."],
    spam_blast: ["Spam Blast", "email", "s", 92, 90, 1, {}, "You may already be a winner."],
    inbox_zero: ["Inbox Zero", "email", "s", 120, 90, 3, {}, "A myth, weaponised."],
    // Red tape
    snag: ["Snag", "tape", "h", 42, 100, 0, { foe: { pace: -1 }, chance: 30 }, "May slow the target down."],
    form_7b: ["Form 7-B", "tape", "s", 55, 100, 0, {}, "Please use black ink."],
    bind: ["Bound in Red Tape", "tape", "h", 65, 100, 0, { foe: { pace: -1 }, chance: 50 }, "May slow the target down."],
    pending: ["Pending Approval", "tape", "x", 0, 85, 1, { status: "mute" }, "Puts the target On Mute."],
    triplicate_hit: ["In Triplicate", "tape", "s", 28, 100, 1, { hits: 3 }, "Hits three times. Keep the pink copy."],
    cease: ["Cease and Desist", "tape", "x", 0, 100, 1, { foe: { atk: -2 } }, "Sharply lowers Hustle."],
    compliance: ["Compliance Training", "tape", "s", 80, 100, 1, { status: "meeting", chance: 15 }, "May put the target In a Meeting."],
    hold_harmless: ["Hold Harmless", "tape", "x", 0, 100, 2, { target: "self", protect: 1, prio: 3 }, "Blocks everything this turn."],
    red_line: ["Red Line", "tape", "h", 96, 95, 2, {}, "Crosses out your whole career."],
    audit_trail: ["Regulatory Audit", "tape", "s", 120, 90, 3, {}, "Every receipt since 2009."],
    // Coffee
    sip: ["Quick Sip", "coffee", "x", 0, 100, 1, { target: "self", heal: 0.35 }, "Restores 35%."],
    hot_spill: ["Hot Spill", "coffee", "s", 46, 100, 0, { status: "burnout", chance: 25 }, "May cause Burnout."],
    double_shot: ["Double Shot", "coffee", "h", 30, 100, 0, { hits: 2 }, "Hits twice."],
    refill: ["Refill", "coffee", "x", 0, 100, 1, { target: "ally", heal: 0.4, refresh: 1 }, "Heals an ally 40% and clears its cooldowns."],
    caffeinate: ["Caffeinate", "coffee", "x", 0, 100, 2, { target: "ally", vol: "caffeine" }, "Fuels an ally for 3 turns: faster, stronger."],
    espresso: ["Espresso Strike", "coffee", "h", 76, 100, 0, {}, "Small cup. Bad attitude."],
    cold_brew: ["Cold Brew", "coffee", "x", 0, 100, 2, { target: "team", heal: 0.22 }, "Heals the whole team 22%."],
    daily_grind: ["The Daily Grind", "coffee", "h", 92, 95, 2, {}, "It never ends."],
    boil_over: ["Boil Over", "coffee", "s", 118, 90, 3, { recoil: 0.25 }, "Scalds the user too."],
    // Hardware
    staple: ["Staple", "hardware", "h", 42, 100, 0, {}, "Ka-chunk."],
    clamp: ["Clamp Down", "hardware", "h", 55, 100, 0, { foe: { def: -1 }, chance: 30 }, "May lower Grit."],
    reinforce: ["Reinforce", "hardware", "x", 0, 100, 1, { target: "self", self: { def: 2 } }, "Sharply raises Grit."],
    hole_punch: ["Hole Punch", "hardware", "h", 66, 100, 0, { pierce: 1 }, "Ignores the target's Grit boosts."],
    swivel: ["Executive Swivel", "hardware", "h", 58, 100, 0, { self: { pace: 1 } }, "Spins up. Raises user's Pace."],
    shred: ["Shred", "hardware", "h", 80, 100, 1, {}, "Confidential."],
    heavy_duty: ["Heavy Duty", "hardware", "h", 100, 90, 2, {}, "Rated for 200 sheets."],
    wrecking: ["Wrecking Stapler", "hardware", "h", 126, 90, 3, { recoil: 0.25 }, "Voids the warranty."],
    // Meeting
    quick_sync: ["Quick Sync", "meeting", "s", 40, 100, 0, { prio: 1 }, "Always goes first. Never quick."],
    agenda: ["Agenda Item", "meeting", "s", 56, 100, 0, {}, "Item one of forty."],
    circle_back: ["Circle Back", "meeting", "s", 70, 100, 0, { slowBonus: 1 }, "Hits harder if the user moves last."],
    schedule: ["Let's Schedule a Meeting", "meeting", "x", 0, 75, 2, { status: "meeting" }, "Puts the target In a Meeting."],
    on_mute: ["You're On Mute", "meeting", "x", 0, 90, 1, { status: "mute" }, "Puts the target On Mute."],
    synergize: ["Synergize", "meeting", "x", 0, 100, 2, { target: "team", team: { atk: 1, sav: 1 } }, "Raises Hustle and Savvy of the active team."],
    take_offline: ["Take It Offline", "meeting", "x", 0, 100, 2, { force: 1 }, "Drags the target off the field."],
    blue_sky: ["Blue-Sky Storm", "meeting", "s", 84, 95, 1, { target: "all" }, "Hits both foes."],
    all_hands: ["All Hands", "meeting", "s", 118, 90, 3, { target: "all", status: "mute", chance: 30 }, "Hits both foes. Nobody can unmute."],
    // Tech
    patch: ["Patch", "tech", "s", 42, 100, 0, {}, "Fixes one thing. Breaks two."],
    static: ["Static Shock", "tech", "s", 46, 100, 0, { status: "mute", chance: 20 }, "May put the target On Mute."],
    cable_lash: ["Cable Lash", "tech", "h", 62, 100, 0, {}, "The good cable is always in use."],
    reboot: ["Off and On Again", "tech", "x", 0, 100, 2, { target: "self", heal: 0.5, cure: 1 }, "Restores 50% and cures status."],
    update: ["Mandatory Update", "tech", "x", 0, 100, 1, { foe: { pace: -2 } }, "Sharply lowers Pace. Now? Yes. Now."],
    firewall: ["Firewall", "tech", "x", 0, 100, 2, { target: "team", team: { def: 1, sav: 1 } }, "Raises Grit and Savvy of the active team."],
    pivot: ["Pivot Table", "tech", "s", 76, 100, 0, { self: { sav: 1 }, chance: 30 }, "May raise Savvy. Nobody knows how it works."],
    overclock: ["Overclock", "tech", "s", 96, 95, 2, { recoil: 0.15 }, "Runs hot. Costs the user some Morale."],
    blue_screen: ["Screen of Death", "tech", "s", 128, 90, 3, {}, "All unsaved work is lost."],
    // Snack
    crumb: ["Crumbs", "snack", "h", 42, 100, 0, {}, "In the keyboard. Forever."],
    stale_bite: ["Stale Bite", "snack", "h", 52, 100, 0, { status: "burnout", chance: 20 }, "May cause Burnout."],
    sugar_rush: ["Sugar Rush", "snack", "h", 60, 100, 0, { self: { pace: 1 } }, "Raises user's Pace."],
    free_cake: ["Free Cake", "snack", "x", 0, 100, 2, { target: "team", heal: 0.25 }, "Heals the whole team 25%."],
    expired: ["Past Its Date", "snack", "s", 66, 100, 0, { status: "burnout", chance: 30 }, "May cause Burnout."],
    food_coma: ["Food Coma", "snack", "x", 0, 75, 2, { status: "meeting" }, "Puts the target In a Meeting, of sorts."],
    lunch_thief: ["Lunch Thief", "snack", "h", 72, 100, 1, { drain: 0.5 }, "Heals the user. It had your name on it."],
    vending_slam: ["Vending Slam", "snack", "h", 100, 90, 2, {}, "Exact change only."],
    sheet_cake: ["Sheet Cake", "snack", "s", 120, 90, 3, {}, "Congratulations on your departure."],
    // Wellness
    leaf_slap: ["Leaf Slap", "wellness", "h", 44, 100, 0, {}, "Rustles passive-aggressively."],
    natural_light: ["Natural Light", "wellness", "s", 60, 100, 1, { drain: 0.5 }, "Heals the user. Rare on this floor."],
    desk_stretch: ["Desk Stretch", "wellness", "x", 0, 100, 1, { target: "self", self: { atk: 1, pace: 1 } }, "Raises Hustle and Pace."],
    deep_breath: ["Deep Breath", "wellness", "x", 0, 100, 1, { target: "self", self: { sav: 1, def: 1 } }, "Raises Savvy and Grit."],
    boundaries: ["Set Boundaries", "wellness", "x", 0, 100, 2, { target: "self", protect: 1, prio: 3 }, "Blocks everything this turn."],
    detox: ["Team Detox", "wellness", "x", 0, 100, 2, { target: "team", cure: 1 }, "Cures status across the party."],
    mindful: ["Mindful Moment", "wellness", "s", 82, 100, 0, {}, "Notice the damage without judging it."],
    ergo_kick: ["Ergonomic Kick", "wellness", "h", 88, 100, 1, {}, "Lumbar support, delivered at speed."],
    health_day: ["Mental Health Day", "wellness", "x", 0, 100, 3, { target: "self", heal: 1, rest: 1 }, "Full heal, then In a Meeting with yourself."],
    inner_peace: ["Inner Peace", "wellness", "s", 120, 90, 3, {}, "Devastating serenity."],
    // Boss moves
    paper_jam: ["Deliberate Jam", "hardware", "h", 70, 100, 0, {}, "It knows what it's doing."],
    toner_cloud: ["Toner Cloud", "paper", "s", 60, 100, 0, { target: "all", foe: { acc: -1 } }, "Hits both foes. Lowers accuracy."],
    auto_response: ["Automatic Reply", "email", "s", 90, 100, 0, { target: "all" }, "Thank you for your message."],
    out_of_office: ["Out of Office", "email", "s", 130, 100, 2, {}, "Back on the 4th. It didn't say of what."],
};
export const MOVES = {};
for (const [id, r] of Object.entries(raw)) MOVES[id] = { id, name: r[0], type: r[1], cat: r[2], pow: r[3], acc: r[4], cd: r[5], ...r[6], text: r[7] };

export const PERKS = {
    thick: { name: "Thick Skin", text: "Takes 25% less from super-effective hits." },
    overtime: { name: "Overtime", text: "Hits 40% harder below a third of Morale." },
    union: { name: "Union Rep", text: "Can't be put In a Meeting." },
    early: { name: "Early Bird", text: "First move after arriving goes first." },
    team: { name: "Team Player", text: "Hits 4% harder for each healthy teammate." },
    recycled: { name: "Recycled", text: "Regains 1/16 Morale every turn." },
    ruthless: { name: "Ruthless", text: "Raises Hustle and Savvy after a knockout." },
    petty: { name: "Petty", text: "Attackers may start Second-Guessing." },
    frugal: { name: "Frugal", text: "Cooldowns are one turn shorter." },
    prickly: { name: "Prickly", text: "Hustle attackers lose 1/10 Morale." },
    backup: { name: "Backup Copy", text: "Survives one knockout blow from full Morale." },
    fueled: { name: "Runs on Coffee", text: "Coffee moves heal it instead of hurting." },
    analyst: { name: "Analyst", text: "Super-effective hits deal 25% more." },
    title: { name: "Big Job Title", text: "Lowers foes' Hustle on arrival." },
    alert: { name: "Always Online", text: "Status moves on it fail half the time." },
    multitask: { name: "Multitasker", text: "Multi-hit and all-foe moves hit 30% harder." },
    supportive: { name: "Supportive", text: "Its healing is 50% stronger." },
    inertia: { name: "Inertia", text: "Hits 30% harder when moving last." },
};

// The four stats: Morale (hp), Hustle (atk), Grit (def), Savvy (sav, both ways), Pace.
// [id, name, types, [hp, atk, def, sav, pace], perk, catch 1-255, dex line, evolution?]
const S = (id, name, types, st, perk, rate, dex, evo) => ({ id, name, types, base: { hp: st[0], atk: st[1], def: st[2], sav: st[3], pace: st[4] }, perk, rate, dex, evo });
const list = [
    // Paper starter line
    S("stickle", "Stickle", ["paper"], [52, 48, 52, 62, 48], "supportive", 45, "Will remind you. Then remind you again. Falls off at the worst moment.", { to: "foldling", lvl: 14 }),
    S("foldling", "Foldling", ["paper"], [70, 62, 72, 84, 60], "supportive", 45, "Contains everything you need, somewhere, under a label that says MISC.", { to: "archivore", lvl: 30 }),
    S("archivore", "Archivore", ["paper"], [96, 84, 104, 116, 70], "supportive", 45, "Has eaten every document since 1974. Can quote any of them, with contempt."),
    // Email starter line
    S("pingling", "Pingling", ["email"], [44, 46, 42, 60, 62], "early", 45, "Very excited to circle up. Arrives at 11 p.m. with one small question.", { to: "inboxer", lvl: 14 }),
    S("inboxer", "Inboxer", ["email"], [58, 62, 56, 80, 76], "early", 45, "Fights in rounds. Each round is 400 unread messages.", { to: "replyallosaur", lvl: 30 }),
    S("replyallosaur", "Replyallosaur", ["email"], [76, 76, 74, 112, 92], "multitask", 45, "Extinct since the Great Thread of 2011. Please remove it from this list."),
    // Tape starter line
    S("snaglet", "Snaglet", ["tape"], [54, 56, 58, 42, 44], "petty", 45, "Sticks to everything except the point.", { to: "redtapir", lvl: 14 }),
    S("redtapir", "Redtapir", ["tape"], [72, 76, 78, 54, 52], "petty", 45, "Its snout can detect a missing signature from three floors away.", { to: "bureaucroc", lvl: 30 }),
    S("bureaucroc", "Bureaucroc", ["tape"], [96, 106, 102, 66, 60], "thick", 45, "Its jaws can only be opened by submitting Form 12 to its jaws."),
    // Stapler line
    S("staplet", "Staplet", ["hardware"], [42, 60, 56, 26, 46], "early", 190, "Bites when startled. Always startled. Jams out of spite.", { to: "chompler", lvl: 18, item: "calm_app", itemTo: "namastapler" }),
    S("chompler", "Chompler", ["hardware"], [82, 112, 94, 40, 74], "ruthless", 80, "Rated for 200 sheets. Has opinions about 201.", { item: "calm_app", itemTo: "namastapler" }),
    S("namastapler", "Namastapler", ["hardware", "wellness"], [80, 82, 90, 80, 58], "recycled", 45, "Has released its need to bind. Binds anyway, mindfully."),
    // Singles of hardware
    S("punchline", "Punchline", ["hardware"], [62, 96, 70, 50, 82], "ruthless", 100, "Makes the same three holes every time. Waits for the laugh."),
    S("swivelord", "Swivelord", ["hardware"], [86, 90, 84, 66, 74], "title", 60, "Sat at the head of the table for so long it became the head of the table."),
    S("shredward", "Shredward", ["hardware", "paper"], [74, 106, 68, 74, 74], "inertia", 70, "Gentle soul. Knows too much. Please stop feeding it fingers."),
    // Coffee line
    S("mugling", "Mugling", ["coffee"], [52, 46, 50, 56, 52], "supportive", 170, "Says WORLD'S OKAYEST BOSS. It has been told this is a compliment.", { to: "mugshot", lvl: 16 }),
    S("mugshot", "Mugshot", ["coffee"], [66, 72, 62, 74, 68], "supportive", 80, "Booked twice for being too strong. Posted bail in loose change.", { to: "baristotle", lvl: 32 }),
    S("baristotle", "Baristotle", ["coffee"], [88, 84, 80, 104, 84], "frugal", 45, "Holds that the unexamined latte is not worth drinking. Holds it at 96 degrees."),
    S("lukewarm", "Lukewarm", ["coffee", "wellness"], [112, 44, 78, 88, 44], "recycled", 120, "Left in the microwave on Tuesday. Has forgiven you. Mostly."),
    // Email singles
    S("spadpole", "Spadpole", ["email"], [38, 36, 34, 56, 68], "alert", 190, "Hatched from a chain letter. Forward it to ten friends or it will grow legs.", { to: "spamphibian", lvl: 20 }),
    S("spamphibian", "Spamphibian", ["email"], [68, 54, 60, 100, 94], "alert", 60, "A prince in a distant land would like to discuss your account."),
    S("bcclops", "Bcclops", ["email", "meeting"], [70, 50, 64, 94, 88], "petty", 70, "Sees all. Is invisible on the thread. Knows who was left off."),
    // Forms
    S("formlet", "Formlet", ["tape"], [46, 36, 58, 52, 34], "backup", 190, "Please press firmly. You are making three copies.", { to: "duplicate", lvl: 15 }),
    S("duplicate", "Duplicate", ["tape"], [58, 48, 76, 66, 40], "backup", 90, "Two heads, identical in every way except for the one that matters.", { to: "triplicate", lvl: 32 }),
    S("triplicate", "Triplicate", ["tape"], [84, 62, 100, 96, 54], "multitask", 45, "The pink copy holds a grudge. The yellow one is lost."),
    S("stamplet", "Stamplet", ["tape"], [44, 60, 44, 36, 66], "early", 170, "Only knows one word. It's either APPROVED or DENIED. It hasn't checked.", { to: "stampede", lvl: 22 }),
    S("stampede", "Stampede", ["tape"], [72, 104, 74, 50, 96], "ruthless", 70, "Forty rubber stamps moving as one. Your request has been received."),
    S("ndaconda", "NDAconda", ["tape", "email"], [86, 78, 80, 94, 80], "title", 55, "We can neither confirm nor deny the existence of this entry."),
    // Tech
    S("snarlcord", "Snarlcord", ["tech"], [76, 84, 80, 60, 56], "prickly", 110, "Went into the drawer neat. Nobody knows what happens in the drawer."),
    S("loadipillar", "Loadipillar", ["tech"], [44, 34, 46, 50, 38], "recycled", 200, "Estimated time remaining: 2 minutes. 11 hours. 4 minutes.", { to: "bufferfly", lvl: 19 }),
    S("bufferfly", "Bufferfly", ["tech", "wellness"], [66, 40, 62, 104, 96], "recycled", 70, "Beautiful, briefly. Then it stops in mid-air to think."),
    S("cellmate", "Cellmate", ["tech", "paper"], [52, 38, 54, 64, 52], "analyst", 150, "Serving a life sentence in column C. Innocent. It was a rounding error.", { to: "pivotaur", lvl: 26 }),
    S("pivotaur", "Pivotaur", ["tech", "paper"], [86, 70, 86, 112, 66], "analyst", 50, "Lives at the centre of a labyrinth nobody can edit. Do not sort it."),
    // Meetings
    S("invitling", "Invitling", ["meeting"], [52, 40, 48, 56, 44], "alert", 170, "Accept? Decline? Tentative? It has already told your manager.", { to: "recurrence", lvl: 24 }),
    S("recurrence", "Recurrence", ["meeting"], [88, 56, 82, 94, 70], "frugal", 60, "Every Tuesday. Forever. The person who booked it left in 2016."),
    S("scribblet", "Scribblet", ["meeting"], [40, 34, 38, 66, 62], "analyst", 170, "A dry-erase marker with one idea and no ink.", { to: "brainstorm", lvl: 23 }),
    S("brainstorm", "Brainstorm", ["meeting"], [70, 50, 64, 110, 88], "multitask", 60, "There are no bad ideas. There is, however, this one."),
    S("starfone", "Starfone", ["meeting", "tech"], [80, 46, 84, 90, 54], "fueled", 90, "Can you hear me? Can you hear me? I think Dave's dropped."),
    S("bullit", "Bullit", ["meeting"], [44, 62, 40, 54, 60], "early", 170, "One point. Three sub-points. Slowly fades in.", { to: "deckromancer", lvl: 27 }),
    S("deckromancer", "Deckromancer", ["meeting"], [74, 72, 66, 112, 90], "title", 55, "Raises dead slides from 2012. Reads every one of them aloud."),
    S("synergosling", "Synergosling", ["meeting"], [46, 52, 46, 50, 50], "team", 170, "Wants to touch base. Does not know what base is.", { to: "synergoose", lvl: 25 }),
    S("synergoose", "Synergoose", ["meeting"], [84, 100, 76, 70, 80], "team", 60, "Honks at dawn to align stakeholders. Will bite if unaligned."),
    // Snacks
    S("vendetta", "Vendetta", ["snack", "hardware"], [106, 102, 98, 44, 44], "inertia", 60, "Kept your dollar in 2014. Remembers your face."),
    S("donutdisturb", "Donutdisturb", ["snack"], [72, 74, 58, 76, 88], "supportive", 100, "Left in the kitchen with a note. Gone in nine minutes. Comes back angrier."),
    S("cultling", "Cultling", ["snack"], [60, 54, 56, 66, 44], "recycled", 150, "Best before March. It did not say which March.", { to: "culturion", lvl: 28 }),
    S("culturion", "Culturion", ["snack"], [104, 70, 82, 112, 60], "recycled", 50, "An actual company culture. Live, active, and growing on the second shelf."),
    S("cakeholder", "Cakeholder", ["snack", "meeting"], [86, 62, 66, 96, 76], "team", 70, "Must be consulted before any decision. Must be eaten before Friday."),
    // Wellness
    S("pottling", "Pottling", ["wellness"], [54, 46, 56, 62, 46], "recycled", 180, "Watered by four people, each convinced they're the only one.", { to: "ficuspocus", lvl: 21 }),
    S("ficuspocus", "Ficus Pocus", ["wellness"], [84, 66, 84, 102, 74], "supportive", 60, "Pulled a whole department out of a hat. Nobody has seen them since."),
    S("ergonomicorn", "Ergonomicorn", ["wellness"], [84, 100, 84, 76, 96], "thick", 40, "Its horn adjusts for lumbar. Seen only by those who filled in the assessment."),
    S("binjamin", "Binjamin", ["paper", "snack"], [100, 88, 96, 56, 48], "recycled", 130, "Emptied nightly. Full by nine. Contains nearly everyone's second draft."),
    S("receiptile", "Receiptile", ["paper"], [68, 82, 58, 70, 92], "prickly", 110, "Grows a metre per coffee. Sheds at expense-claim time."),
    // Gifts and legends
    S("jamothy", "Jamothy", ["hardware", "paper"], [118, 88, 110, 100, 54], "backup", 3, "Jammed on purpose for eleven years so nobody would get hurt. Tray 2 is fine."),
    S("oldfaithful", "Old Faithful", ["hardware", "coffee"], [100, 108, 100, 90, 92], "thick", 3, "Marge's stapler since 1961. Has never once jammed. Hums when she walks by."),
    S("thetemp", "The Temp", ["wellness", "email"], [80, 60, 60, 120, 120], "alert", 3, "Contract ended in 2003. Nobody told him. Nobody told anyone."),
    S("outofoffice", "Out of Office", ["email", "meeting"], [110, 70, 90, 120, 90], "frugal", 3, "Thank you for your message. It is currently on holiday, and for the first time, it means it."),
];
export const BEASTS = Object.fromEntries(list.map((b, i) => [b.id, { ...b, no: i + 1 }]));

// Learnsets: [level, move] pairs per family, shared by each stage.
const L = (...a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
const fam = (ids, l) => { for (const id of ids) BEASTS[id].learn = l; };
fam(["stickle", "foldling", "archivore"], L(1, "paper_cut", 1, "nudge", 4, "tidy_desk", 7, "sticky_slap", 11, "file_away", 15, "memo", 19, "refill", 24, "paper_trail", 30, "cold_brew", 35, "ream", 42, "minutes"));
fam(["pingling", "inboxer", "replyallosaur"], L(1, "ping", 1, "nudge", 4, "flag_urgent", 7, "per_my_last", 12, "cc_all", 16, "quick_sync", 20, "bounce", 26, "unsubscribe", 30, "reply_all", 36, "spam_blast", 42, "inbox_zero"));
fam(["snaglet", "redtapir", "bureaucroc"], L(1, "snag", 1, "nudge", 4, "pending", 7, "form_7b", 11, "cease", 15, "bind", 20, "hold_harmless", 25, "staple", 30, "compliance", 35, "red_line", 42, "audit_trail"));
fam(["staplet", "chompler"], L(1, "staple", 1, "nudge", 6, "clamp", 10, "paper_cut", 14, "reinforce", 19, "hole_punch", 24, "shred", 30, "swivel", 36, "heavy_duty", 42, "wrecking"));
fam(["namastapler"], L(1, "staple", 1, "deep_breath", 6, "clamp", 14, "reinforce", 18, "leaf_slap", 22, "natural_light", 26, "hole_punch", 30, "boundaries", 35, "mindful", 40, "heavy_duty", 44, "inner_peace"));
fam(["punchline"], L(1, "staple", 1, "nudge", 8, "clamp", 12, "paper_cut", 16, "hole_punch", 20, "swivel", 25, "shred", 31, "desk_stretch", 36, "heavy_duty", 43, "wrecking"));
fam(["swivelord"], L(1, "swivel", 1, "nudge", 12, "clamp", 16, "cease", 20, "hole_punch", 25, "reinforce", 29, "shred", 34, "synergize", 38, "heavy_duty", 44, "wrecking"));
fam(["shredward"], L(1, "staple", 1, "paper_cut", 12, "shred", 18, "memo", 22, "hole_punch", 27, "sticky_slap", 32, "ream", 38, "heavy_duty", 44, "wrecking"));
fam(["mugling", "mugshot", "baristotle"], L(1, "hot_spill", 1, "sip", 5, "double_shot", 9, "caffeinate", 13, "refill", 18, "espresso", 23, "pivot", 27, "cold_brew", 33, "daily_grind", 40, "boil_over"));
fam(["lukewarm"], L(1, "sip", 1, "hot_spill", 8, "deep_breath", 12, "natural_light", 17, "refill", 22, "espresso", 27, "cold_brew", 32, "mindful", 38, "boil_over", 43, "inner_peace"));
fam(["spadpole", "spamphibian"], L(1, "ping", 1, "nudge", 6, "per_my_last", 10, "cc_all", 15, "flag_urgent", 20, "bounce", 25, "unsubscribe", 29, "spam_blast", 35, "reply_all", 42, "inbox_zero"));
fam(["bcclops"], L(1, "ping", 1, "quick_sync", 14, "per_my_last", 18, "on_mute", 23, "agenda", 28, "circle_back", 33, "spam_blast", 39, "all_hands", 44, "inbox_zero"));
fam(["formlet", "duplicate", "triplicate"], L(1, "form_7b", 1, "nudge", 6, "pending", 10, "reinforce", 14, "triplicate_hit", 19, "hold_harmless", 24, "cease", 30, "compliance", 36, "unsubscribe", 42, "audit_trail"));
fam(["stamplet", "stampede"], L(1, "snag", 1, "nudge", 7, "staple", 11, "bind", 15, "cease", 21, "clamp", 26, "shred", 32, "red_line", 38, "heavy_duty"));
fam(["ndaconda"], L(1, "snag", 1, "per_my_last", 18, "pending", 22, "bind", 26, "bounce", 30, "compliance", 35, "red_line", 40, "spam_blast", 45, "audit_trail"));
fam(["snarlcord"], L(1, "cable_lash", 1, "snag", 12, "static", 15, "update", 20, "bind", 24, "shred", 29, "reboot", 34, "overclock", 39, "heavy_duty", 44, "blue_screen"));
fam(["loadipillar", "bufferfly"], L(1, "patch", 1, "nudge", 6, "update", 10, "static", 14, "reboot", 19, "natural_light", 24, "pivot", 29, "deep_breath", 33, "mindful", 38, "overclock", 44, "blue_screen"));
fam(["cellmate", "pivotaur"], L(1, "patch", 1, "paper_cut", 8, "memo", 12, "update", 16, "file_away", 21, "pivot", 26, "paper_trail", 31, "firewall", 37, "overclock", 42, "minutes", 46, "blue_screen"));
fam(["invitling", "recurrence"], L(1, "agenda", 1, "nudge", 6, "schedule", 10, "quick_sync", 14, "reinforce", 19, "circle_back", 24, "on_mute", 29, "take_offline", 34, "blue_sky", 40, "all_hands"));
fam(["scribblet", "brainstorm"], L(1, "quick_sync", 1, "nudge", 6, "agenda", 10, "flag_urgent", 14, "static", 19, "circle_back", 23, "blue_sky", 28, "memo", 33, "synergize", 40, "all_hands"));
fam(["starfone"], L(1, "quick_sync", 1, "static", 11, "on_mute", 15, "agenda", 19, "patch", 24, "circle_back", 28, "firewall", 33, "overclock", 38, "all_hands", 44, "blue_screen"));
fam(["bullit", "deckromancer"], L(1, "agenda", 1, "snag", 6, "quick_sync", 10, "memo", 14, "on_mute", 19, "circle_back", 24, "pivot", 28, "blue_sky", 34, "synergize", 40, "all_hands"));
fam(["synergosling", "synergoose"], L(1, "nudge", 1, "quick_sync", 6, "synergize", 10, "swivel", 15, "agenda", 20, "desk_stretch", 25, "bind", 30, "shred", 35, "take_offline", 40, "heavy_duty", 44, "all_hands"));
fam(["vendetta"], L(1, "crumb", 1, "staple", 16, "clamp", 20, "sugar_rush", 24, "reinforce", 29, "lunch_thief", 34, "vending_slam", 40, "wrecking"));
fam(["donutdisturb"], L(1, "crumb", 1, "sugar_rush", 14, "free_cake", 18, "food_coma", 22, "stale_bite", 27, "expired", 33, "lunch_thief", 38, "cold_brew", 44, "sheet_cake"));
fam(["cultling", "culturion"], L(1, "crumb", 1, "leaf_slap", 8, "stale_bite", 12, "deep_breath", 17, "expired", 22, "natural_light", 28, "food_coma", 33, "mindful", 38, "detox", 44, "sheet_cake"));
fam(["cakeholder"], L(1, "crumb", 1, "agenda", 20, "free_cake", 24, "circle_back", 28, "expired", 32, "synergize", 36, "blue_sky", 42, "sheet_cake"));
fam(["pottling", "ficuspocus"], L(1, "leaf_slap", 1, "nudge", 6, "deep_breath", 10, "tidy_desk", 15, "natural_light", 20, "detox", 25, "food_coma", 30, "mindful", 35, "cold_brew", 42, "inner_peace"));
fam(["ergonomicorn"], L(1, "leaf_slap", 1, "desk_stretch", 26, "swivel", 30, "ergo_kick", 34, "boundaries", 38, "heavy_duty", 42, "health_day", 46, "inner_peace"));
fam(["binjamin"], L(1, "crumb", 1, "paper_cut", 12, "tidy_desk", 16, "stale_bite", 20, "unsubscribe", 22, "sugar_rush", 25, "lunch_thief", 30, "ream", 36, "vending_slam"));
fam(["receiptile"], L(1, "paper_cut", 1, "snag", 12, "paper_plane", 16, "double_shot", 20, "paper_trail", 25, "bind", 30, "espresso", 34, "ream", 40, "minutes"));
fam(["jamothy"], L(1, "paper_jam", 1, "toner_cloud", 1, "reinforce", 1, "ream", 30, "heavy_duty", 40, "minutes", 45, "wrecking"));
fam(["oldfaithful"], L(1, "staple", 1, "espresso", 1, "reinforce", 1, "hole_punch", 30, "daily_grind", 36, "heavy_duty", 42, "wrecking", 46, "boil_over"));
fam(["thetemp"], L(1, "ping", 1, "mindful", 1, "flag_urgent", 1, "reply_all", 40, "inner_peace", 44, "inbox_zero"));
fam(["outofoffice"], L(1, "auto_response", 1, "out_of_office", 1, "all_hands", 1, "flag_urgent"));

export const ITEMS = {
    coffee: { name: "Drip Coffee", cat: "heal", heal: 40, price: 60, text: "Restores 40 Morale. Tastes of the pot it came from." },
    flat_white: { name: "Flat White", cat: "heal", heal: 120, price: 180, text: "Restores 120 Morale. Costs a day of your salary." },
    triple: { name: "Triple Shot", cat: "heal", heal: 9999, price: 420, text: "Fully restores Morale. Your hands may shake." },
    donuts: { name: "Box of Donuts", cat: "team", heal: 60, price: 260, text: "Restores 60 Morale to the whole team." },
    aspirin: { name: "Aspirin", cat: "cure", price: 80, text: "Cures any status." },
    sick_note: { name: "Sick Note", cat: "revive", price: 240, text: "Brings back a Deskmate who's Out of Office, at half Morale." },
    lanyard: { name: "Lanyard", cat: "catch", ball: 1, price: 50, text: "Offer it to a wild Deskmate. Works better when they're tired." },
    fleece: { name: "Company Fleece", cat: "catch", ball: 1.6, price: 150, text: "Better odds. Nobody turns down a free fleece." },
    stock: { name: "Stock Options", cat: "catch", ball: 2.5, price: 400, text: "Great odds. Vesting over forty years." },
    handshake: { name: "Golden Handshake", cat: "catch", ball: 255, price: 0, text: "Never refused. You only get one." },
    dnd: { name: "Do Not Disturb Sign", cat: "field", price: 90, text: "No wild Deskmates for 80 steps." },
    calm_app: { name: "Calm-Down App Code", cat: "evo", price: 500, text: "Use on Staplet or Chompler for a very different promotion." },
    rush: { name: "Energy Drink", cat: "battle", price: 120, text: "In battle: raises Hustle and Savvy of one Deskmate." },
};
export const SHOP = [["coffee", 0], ["aspirin", 0], ["lanyard", 0], ["dnd", 1], ["flat_white", 2], ["sick_note", 2], ["fleece", 2], ["rush", 3], ["donuts", 3], ["calm_app", 3], ["triple", 5], ["stock", 5]];
