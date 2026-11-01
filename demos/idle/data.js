// Everything the game says and sells. No logic here beyond small tables.

/** Crew cost and yield, in units of the act's U. Later acts spread wider, so five hires cover more decades. */
export const BASE_COST = [15, 110, 1200, 13000, 140000];
export const BASE_YIELD = [0.1, 1, 8, 50, 300];

export const ACTS = [
    {
        name: "THE DRIVEWAY", place: "the driveway", move: "Main Street", deposit: "A permit for Main Street", U: 1, goal: 2e7, spread: 1, yield: 1, g: 1.15, m: 2, start: 4, pay: 0.3,
        ruleName: null,
        stops: [
            { scale: "Your Driveway", L: 1.0, item: "cables", title: "Box of Mystery Cables", note: "One of these charges something." },
            { scale: "Your Front Yard", L: 1.3, item: "lamp", title: "Lava Lamp (Lukewarm)", note: "It has seen things. Slowly." },
            { scale: "The Cul-de-Sac", L: 1.6, item: "bread", title: "Bread Maker", note: "Unused. Radiating guilt." },
            { scale: "The Whole Block", L: 1.9, item: "bike", title: "Exercise Bike (Coat Rack)", note: "Coats included." },
            { scale: "The Neighbourhood", L: 2.2, item: "trophy", title: "Someone Else's Trophy", note: "Regional Bowling, 3rd. Not yours." },
        ],
        crew: [
            { id: "nephew", name: "Nephew With A Wagon", note: "Paid in popsicles." },
            { id: "honor", name: "Honor Box", note: "Take a lamp, leave a dollar." },
            { id: "bake", name: "Neighbour's Bake Table", note: "Lemon bars: the real draw." },
            { id: "sign", name: "Arrow Sign Spinner", note: "Has a following." },
            { id: "table2", name: "A Second Card Table", note: "Now it's an operation." },
        ],
        ups: [
            ["Bigger Popsicles", "Bribery works."], ["Wagon Bell", "Ting ting. Commerce."],
            ["Padlock On The Box", "Trust, but padlock."], ["Card Reader", "Accepts cards. Also leaves."],
            ["Lemon Zest", "An arms race begins."], ["Second Oven", "The block smells incredible."],
            ["Bigger Arrow", "It points harder."], ["Sign Spinning Lessons", "He can do the helicopter."],
            ["Matching Tablecloth", "Suddenly it's a boutique."], ["Third Leg Repair", "It no longer wobbles."],
        ],
        taps: [["Neon Stickers", "Prices you can see from space. Eventually."], ["Fanny Pack", "Cash goes in faster."], ["Sales Patter", "\"She's a beauty.\" It's a toaster."]],
    },
    {
        name: "MAIN STREET", place: "Main Street", move: "The Planet", deposit: "A lease on the Planet", U: 2e6, goal: 1e17, spread: 1.6, yield: 1.2, g: 1.1, m: 7, pay: 0.00835,
        ruleName: "HYPE", ruleText: "Tapping builds HYPE. Fill it, then shout the words every yard sale is built on.",
        stops: [
            { scale: "Main Street", L: 2.56, item: "house", title: "Your House (Some Damp)", note: "The damp is structural." },
            { scale: "The Whole Town", L: 2.92, item: "bus", title: "School Bus", note: "Seats 40. Smells of 41." },
            { scale: "The County", L: 3.28, item: "tower", title: "Water Tower (Half Full)", note: "An optimist's purchase." },
            { scale: "The Big City", L: 3.6, item: "hall", title: "Town Hall (Mayor Included)", note: "He comes with the building." },
            { scale: "The Metro Area", L: 3.92, item: "bridge", title: "Suspension Bridge", note: "One careful owner." },
        ],
        crew: [
            { id: "stall", name: "Row Of Flea Stalls", note: "Each one sells the same lamp." },
            { id: "carol", name: "Carol In Real Estate", note: "Her face is on every bench." },
            { id: "tvad", name: "Late Night TV Ad", note: "\"Prices so low we're legally worried.\"" },
            { id: "mayor", name: "The Mayor, On Retainer", note: "Cuts ribbons on request." },
            { id: "zoning", name: "Zoning Loophole", note: "The town is technically a driveway." },
        ],
        ups: [
            ["Folding Awnings", "Shade: the luxury good."], ["Shared Cash Tin", "Nobody counts it. Everybody's happy."],
            ["Second Bench", "Now you can't avoid her."], ["Whiter Teeth", "Visible from the bypass."],
            ["Louder Announcer", "Nobody asked him to."], ["Fake Testimonial", "\"I'm a real person!\" - Real Person"],
            ["Bigger Scissors", "Ribbons fear him."], ["Commemorative Plaque", "Every bench is historic now."],
            ["Variance Form 12-B", "The form is also for sale."], ["Friendly Inspector", "He has never inspected anything."],
        ],
        taps: [["Bullhorn", "\"LAMPS.\""], ["Parade Float", "You are now a parade."], ["Key To The City", "It opens one door. It's a shed."]],
    },
    {
        name: "THE PLANET", place: "the planet", move: "The Solar System", deposit: "Planning permission for the Solar System", U: 1e16, goal: 1e33, spread: 3, yield: 1.5, g: 1.1, m: 9, pay: 8.98e-05,
        ruleName: "DISCOUNT GARY", ruleText: "A rival sale just opened on the other hemisphere. He has half your customers and a much bigger tent.",
        stops: [
            { scale: "The Coast", L: 4.2, item: "mountain", title: "A Mountain (Light Use)", note: "Summit shows minor wear." },
            { scale: "The Curve Of The Earth", L: 4.5, item: "ocean", title: "The Pacific (Some Salt)", note: "Sold as seen. Mostly wet." },
            { scale: "The Hemisphere", L: 4.82, item: "ice", title: "Antarctica", note: "Keep frozen. Do not refreeze." },
            { scale: "The Whole Planet", L: 5.12, item: "belt", title: "The Equator (Belt, XXL)", note: "Goes around once." },
            { scale: "Low Orbit", L: 5.5, item: "cloud", title: "The Atmosphere (Open Box)", note: "Slight leak. Nobody's noticed." },
        ],
        crew: [
            { id: "ship", name: "Cargo Ship Of Tat", note: "400,000 lamps. No manifest." },
            { id: "tvsh", name: "Shopping Channel", note: "\"Only nine billion left!\"" },
            { id: "drift", name: "Continental Drift Delivery", note: "Arrives in 40 million years." },
            { id: "zones", name: "Time Zone Arbitrage", note: "Buy tomorrow, sell yesterday." },
            { id: "storm", name: "Hurricane Clearance", note: "Everything must go. It's going." },
        ],
        ups: [
            ["Bigger Lamps", "Fewer lamps. Larger lamps."], ["Pirates Insured", "They're also customers."],
            ["Host With Hair", "The hair has its own contract."], ["Call Now Button", "There was always a button."],
            ["Tectonic Tailwind", "Now 41 million years, express."], ["Signature On Delivery", "Your great-great-etc will sign."],
            ["Leap Second Reserve", "Saved up for a rainy Thursday."], ["Date Line Kiosk", "Open yesterday through tomorrow."],
            ["Named Storms", "Hurricane Brenda: Up To 70% Off."], ["Eye Of The Store", "Calm aisle. Good parking."],
        ],
        taps: [["Global Megaphone", "Everyone heard it. Sorry."], ["Airship Banner", "It says LAMPS."], ["Planet-Wide Fanny Pack", "The strap is the Tropics."]],
    },
    {
        name: "THE SOLAR SYSTEM", place: "the solar system", move: "The Galaxy", deposit: "A galactic vendor's licence", U: 1e32, goal: 1e52, spread: 5, yield: 2, g: 1.1, m: 9, pay: 0.00237,
        ruleName: "ORBIT", ruleText: "Your driveway has left the atmosphere. A comet now circles the table. Tap as it passes the top for a perfect sale.",
        stops: [
            { scale: "The Moon's Orbit", L: 6.25, item: "moon", title: "The Moon", note: "Tides not included." },
            { scale: "The Inner Planets", L: 6.95, item: "mars", title: "Mars (Ideal Project)", note: "Rust throughout. Great bones." },
            { scale: "The Asteroid Belt", L: 7.5, item: "jupiter", title: "Jupiter", note: "Mostly packaging." },
            { scale: "The Outer Planets", L: 8.1, item: "saturn", title: "Saturn", note: "Rings sold separately." },
            { scale: "The Long Dark", L: 8.9, item: "sun", title: "The Sun (Runs Hot)", note: "Slight flicker. Do not stare at the price." },
        ],
        crew: [
            { id: "kiosk", name: "Moon Base Kiosk", note: "Low gravity, high margins." },
            { id: "belt", name: "Asteroid Conveyor", note: "A million rocks, all marked down." },
            { id: "comet", name: "Comet Courier", note: "Every 76 years, without fail." },
            { id: "ring", name: "Saturn Ring Rental", note: "By the hour. Bring it back." },
            { id: "dyson", name: "Dyson Cash Register", note: "Powered by the entire Sun. Still jams." },
        ],
        ups: [
            ["Pressurised Awning", "Awnings, but breathing."], ["Crater Parking", "Ample. Bumpy."],
            ["Rock Sorter", "Big rocks. Small rocks. Rocks."], ["Loyalty Rock", "Tenth rock free."],
            ["Tail Advertising", "Forty million miles of billboard."], ["Same-Millennium Shipping", "Extra."],
            ["Late Return Fee", "Compounding, per orbit."], ["Ring Polish", "It smells like ice."],
            ["Solar Receipt Roll", "Longer than Mercury's orbit."], ["Bigger Drawer", "For Sun-sized bills."],
        ],
        taps: [["Gravity Slingshot", "Throws the change back harder."], ["Solar Flare Sale", "Burning prices. Burning everything."], ["Lagrange Point Sticker", "It stays exactly where you put it."]],
    },
    {
        name: "THE GALAXY", place: "the galaxy", move: "The Abstract", deposit: "A way out of the universe", U: 1e51, goal: 1e74, spread: 8, yield: 3, g: 1.1, m: 7, pay: 0.000191,
        ruleName: "THE CLEARANCE HOLE", ruleText: "There's a black hole in the bargain bin. Feed it your crew. Everyone else gets richer. The crew seem fine with it.",
        stops: [
            { scale: "The Nearby Stars", L: 10.2, item: "nebula", title: "A Nebula", note: "Some assembly required." },
            { scale: "The Spiral Arm", L: 12.6, item: "pulsar", title: "A Pulsar", note: "Blinker stuck on." },
            { scale: "The Galaxy", L: 15.4, item: "neutron", title: "A Neutron Star", note: "Two-person lift. Two billion people." },
            { scale: "The Local Group", L: 16.7, item: "hole", title: "A Black Hole", note: "Box only." },
            { scale: "The Cosmic Web", L: 18.4, item: "galaxy", title: "The Galaxy", note: "Minor scuffing on one arm." },
        ],
        crew: [
            { id: "worm", name: "Wormhole Drive-Thru", note: "Your order arrives before you ask." },
            { id: "bill", name: "Pulsar Billboard", note: "BUY. BUY. BUY. BUY. BUY." },
            { id: "share", name: "Alien Timeshare", note: "One week a century, on Neptune's B-side." },
            { id: "ware", name: "Supercluster Warehouse", note: "Aisle 40 billion, next to the lamps." },
            { id: "dark", name: "Dark Matter Mystery Box", note: "85% of the universe. Unlabelled." },
        ],
        ups: [
            ["Valet Parking", "They'll bring your ship round. Eventually."], ["Yesterday's Specials", "Fresher than they sound."],
            ["Faster Blink", "The warning label is 9 parsecs long."], ["Two Word Slogan", "BUY LAMPS."],
            ["Free Lunch Seminar", "It's a real lunch. It's the last real thing."], ["Exit Interview Maze", "Nobody has left."],
            ["Forklift Licence", "Grade: Supermassive."], ["Loyalty Card, Infinite Punches", "You can feel it."],
            ["Tape Over The Label", "Still unlabelled, but now with tape."], ["Shake The Box", "It rattles at 3 kelvin."],
        ],
        taps: [["Event Horizon Sticker", "Prices past this point cannot be returned."], ["Hypernova Flyers", "The whole sector got one."], ["Great Attractor Patter", "Everyone is drawn to the lamp."]],
    },
    {
        name: "THE ABSTRACT", move: null, deposit: null, U: 1e73, goal: 1e100, spread: 12, yield: 5, g: 1.1, m: 4.5, pay: 0.000288,
        ruleName: "THE WEEK", ruleText: "Out here, the only things left to sell are ideas. The week turns beneath your table, and each day has its own rules. Then you start listing the ideas.",
        stops: [
            { scale: "The Edge Of Everything", L: 19.7, item: "universe", title: "The Observable Universe", note: "Observed once. Barely used." },
            { scale: "Just Past That", L: 20.3, item: "word:Maybe", title: "The Word \"Maybe\"", note: "Could go either way." },
            { scale: "The Part Nobody Mentions", L: 20.9, item: "word:Someday", title: "\"Someday\"", note: "Slightly overpromised." },
            { scale: "The Back Of The Closet", L: 21.5, item: "word:Almost", title: "\"Almost\"", note: "Nearly new." },
            { scale: "The Abstract", L: 22.1, item: "word:Enough", title: "\"Enough\"", note: "Nobody has ever had it." },
        ],
        crew: [
            { id: "tank", name: "Think Tank", note: "It's a tank. Of thinking." },
            { id: "dept", name: "Philosophy Department", note: "Does it sell? What is sell?" },
            { id: "dict", name: "Dictionary Editors", note: "Sold \"irregardless\" for a fortune." },
            { id: "fine", name: "Fine Print Lawyers", note: "Everything in here is theirs, subject to terms." },
            { id: "narr", name: "The Narrator", note: "He's been doing this the whole time." },
        ],
        ups: [
            ["Bottomless Coffee", "The thinking gets faster, not better."], ["Whiteboard, Unwiped", "DO NOT ERASE: everything."],
            ["Tenure", "They can never leave."], ["Second Opinion", "Same as the first, but longer."],
            ["Silent Letter Sale", "The K in knife: going cheap."], ["Oxford Commas, Bulk", "Lamps, lamps, and lamps."],
            ["Smaller Print", "Now legible only to ants."], ["Asterisk Reserve*", "*See below."],
            ["Better Voice", "Warmer. Slightly smug."], ["Foreshadowing", "It's the snow globe. You'll see."],
        ],
        taps: [["Sticker On The Void", "It sticks. Don't ask to what."], ["The Idea Of Haggling", "Purer than the real thing."], ["Platonic Fanny Pack", "All other fanny packs are shadows of it."]],
    },
];

/** One-shot listings in the last act. Each one changes the game, then funds the next. */
export const CONCEPTS = [
    { id: "beige", name: "The Colour Beige", at: 1e85, effect: "Crew earn x10. Beige is gone from the world.", sold: "A very calm man from Accounts buys it. The paper goes white. Nobody can remember why it was there." },
    { id: "monday", name: "Mondays", at: 1e90, effect: "Monday leaves the week. Taps x10.", sold: "Sold to a very tired cat. Everyone wakes up slightly confused and much happier." },
    { id: "seven", name: "The Number 7", at: 1e93, effect: "Every 7 vanishes. Crew earn x7, sort of.", sold: "A collector takes it home in a small box. Your prices now skip it. The 8 looks nervous." },
    { id: "gravity", name: "Gravity", at: 1e95, effect: "Cash falls upward. Haggles pay x25.", sold: "It was holding quite a lot up. Your coins are leaving. You keep them anyway." },
    { id: "irony", name: "Irony", at: 1e96, effect: "Customers mean it now. Crew earn x10.", sold: "A teenager buys it, then gives it back, then buys it for real. Everyone is suddenly very sincere." },
    { id: "orange", name: "The Colour Orange", at: 1e97, effect: "Your stickers go grey. Taps x50.", sold: "Sold to a traffic cone with big plans. It was the main thing holding this game's look together, honestly." },
    { id: "tuesday", name: "The Concept Of Tuesday", at: 1e98, effect: "It goes straight from Monday's grave to Wednesday. Everything x25.", sold: "Wednesday buys it outright, for expansion. Everyone on Earth wakes up two days older and asks where the bins went." },
    { id: "money", name: "Money", at: 1e100, effect: "One googol dollars. This is the last thing on the table.", sold: "Who buys money? With what? The question hangs in the air. Then a small voice says, \"Excuse me.\"" },
];

export const WEEK = [
    { id: "mon", name: "MONDAY", note: "Taps x3, crew x0.5. Nobody wants to be here.", tap: 3, crew: 0.5 },
    { id: "tue", name: "TUESDAY", note: "Nothing about this day is notable.", tap: 1, crew: 1 },
    { id: "wed", name: "WEDNESDAY", note: "Customers come three times as fast.", tap: 1, crew: 1, cust: 3 },
    { id: "thu", name: "THURSDAY", note: "Hype fills three times as fast.", tap: 1, crew: 1, hype: 3 },
    { id: "fri", name: "FRIDAY", note: "Crew x2. They can smell the weekend.", tap: 1, crew: 2 },
    { id: "sat", name: "SATURDAY", note: "Yard sale day. Everything x3.", tap: 3, crew: 3 },
    { id: "sun", name: "SUNDAY", note: "Crew x0.5. Haggles x5. Very relaxed.", tap: 1, crew: 0.5, haggle: 5 },
];

export const BYLAWS = [
    { id: "hands", name: "Hands Off", note: "Crew earn x2. Taps earn half." },
    { id: "fast", name: "Fast Hands", note: "Taps earn x5 and fill Hype twice as fast." },
    { id: "tongue", name: "Silver Tongue", note: "Customers never walk on your first counter. Haggles pay x3." },
    { id: "intern", name: "The Intern", note: "Buys the cheapest crew for you whenever you can afford it." },
    { id: "clerk", name: "The Clerk", note: "Buys upgrades for you the moment they're affordable." },
    { id: "lunch", name: "Long Lunch", note: "You earn 100% while away, not 50%, for up to 24 hours." },
    { id: "start", name: "Head Start", note: "Every new venue starts with 25 of your first crew." },
    { id: "bulk", name: "Bulk Discount", note: "All crew cost 30% less." },
    { id: "lucky", name: "Lucky Stickers", note: "Stray stickers show up three times as often and pay x3." },
    { id: "patience", name: "Everything Must Go, Slowly", note: "Hype frenzies last twice as long." },
    { id: "regulars", name: "Regulars", note: "Customers come twice as often." },
    { id: "laminate", name: "Laminated Milestones", note: "Every crew milestone also pays out 20 seconds of income." },
];

/** Customers. `look` picks a puppet. Lines: opening, deal, walk. Counter lines come from COUNTERS. */
export const CUSTOMERS = [
    [
        { name: "Mrs. Abernathy", look: 1, hi: "I'm just looking, dear. Would you take a nickel for looking?", deal: "I shall treasure this until Thursday.", walk: "Well! I've never been so priced." },
        { name: "The Man Who Knows What It's Worth", look: 2, hi: "I saw one on TV for way more. I'll give you less.", deal: "You have no idea what you just sold me.", walk: "You have no idea what you just lost." },
        { name: "Competitive Mom", look: 3, hi: "Is that the last one? Don't look at her. Name your price.", deal: "Karen can't have it now. Good.", walk: "I'll get it from Karen's yard sale." },
        { name: "Guy With A Truck", look: 4, hi: "I can take the whole table off your hands. For free. For you.", deal: "Pleasure. You want the truck too? No? OK.", walk: "Truck's leaving. Truck has feelings." },
        { name: "Collector Of Exactly One Thing", look: 5, hi: "Does it have a small dent on the left? I only buy small left dents.", deal: "Yes. Yes. This dent is correct.", walk: "That's a right dent. Ugh." },
    ],
    [
        { name: "Carol's Rival, Sharon", look: 3, hi: "I sell houses. I could sell this. I could sell you.", deal: "Charming. Needs staging.", walk: "My bench is bigger." },
        { name: "An Influencer", look: 6, hi: "I'll pay in exposure. It's very exposed. Like, legally.", deal: "OK chat, I bought a bus.", walk: "You're being unfollowed by me personally." },
        { name: "Town Historian", look: 2, hi: "This lamp stood on this spot in 1911. I'd like it. Cheaply.", deal: "History will remember this. I'll see to it.", walk: "I'm writing this down. In the bad book." },
        { name: "Three Raccoons In A Coat", look: 7, hi: "Hello. I am one tall business man. I have a coin.", deal: "Excellent. We mean: I mean excellent.", walk: "The coat is unhappy. All three of us. Of me." },
        { name: "The Deputy Mayor", look: 4, hi: "We'd like to tax this. Could we also buy it?", deal: "I'll have someone cut a ribbon on it.", walk: "Your permit has developed a problem." },
    ],
    [
        { name: "Billionaire With A Rocket", look: 2, hi: "I need something to do on the way to Mars. Is this bigger than my rocket?", deal: "Adding it to the rocket. Everything's on the rocket.", walk: "I'll simply buy a different planet." },
        { name: "A Whale", look: 8, hi: "I would like my ocean back. What will you take?", deal: "Whoooooo. That's whale for receipt, please.", walk: "Whoooooo. That's whale for your mother." },
        { name: "Penguin, Buying For A Friend", look: 9, hi: "It's not for me. It's for a friend. A penguin friend. Who is cold.", deal: "He'll love it. I'm him.", walk: "Waddles off with tremendous dignity." },
        { name: "Ambassador From Somewhere", look: 4, hi: "My country formally objects to this price. It also formally likes it.", deal: "We will name a very small roundabout after you.", walk: "Recalling myself. Good day." },
        { name: "A Very Large Cloud", look: 10, hi: "Everything looks so small from up here. I'll pay small.", deal: "Rain check. No, an actual cheque, in rain.", walk: "Drifts away, in a passive way." },
    ],
    [
        { name: "Space Trucker", look: 11, hi: "Three weeks from Ceres and all I want is that. Cash? Ore?", deal: "Strap it down. Last moon I bought drifted.", walk: "I've hauled worse for less." },
        { name: "Martian Homeowner", look: 12, hi: "We got rust in the HOA. I'm here to complain, and to shop.", deal: "This'll really bring the crater together.", walk: "Expect a very red letter." },
        { name: "Tiny Moon Goblin", look: 13, hi: "GIVE FOR ROCK? I HAVE ROCK. I HAVE ONE ROCK.", deal: "ROCK IS YOURS. GOODBYE ROCK.", walk: "NO DEAL. KEEPS ROCK. BITES AIR." },
        { name: "Retired Comet", look: 14, hi: "I only come round every 76 years, so make it quick. Oh, it's you again.", deal: "See you in 2061. Take care of my tail.", walk: "You'll regret this in 76 years." },
        { name: "Asteroid Miner", look: 11, hi: "I dig space dirt for a living. Show me your finest space dirt.", deal: "That's some honest dirt.", walk: "I've got dirt of my own, pal." },
    ],
    [
        { name: "Galactic Emperor (On Layaway)", look: 15, hi: "I rule nine thousand worlds. Do you do payment plans?", deal: "Send the invoice to Nine Thousand Worlds, Attn: Me.", walk: "I shall conquer you. In installments." },
        { name: "A Hive Mind", look: 12, hi: "We are all very interested. We have all agreed on a low offer.", deal: "We are pleased. We told ourselves we would be.", walk: "We vote to leave. It was unanimous. It always is." },
        { name: "Blob Family Of Six", look: 10, hi: "Bloop bloop. The kids want it. Blorp. Is it dishwasher safe?", deal: "Bloop! We have absorbed the receipt.", walk: "Blorp. That's a rude word, we looked it up." },
        { name: "Space Lawyer", look: 2, hi: "My client wishes to buy this without admitting that it exists.", deal: "Without prejudice, thank you.", walk: "You'll hear from me at light speed." },
        { name: "Sentient Nebula", look: 14, hi: "I am forty light years wide and I have nothing to wear.", deal: "It's perfect. I'll slowly collapse into it.", walk: "Disperses, over a million years, starting now." },
    ],
    [
        { name: "A Philosopher", look: 2, hi: "If I buy it, did you ever own it? Also, what's your lowest?", deal: "A fair price. Whatever fair is.", walk: "I reject the premise of this table." },
        { name: "The Month Of February", look: 6, hi: "I'm shorter than the others. Do you do a discount for that?", deal: "Thanks. I'll be back in four years with an extra day.", walk: "Nobody ever takes me seriously." },
        { name: "Wednesday (Looking To Expand)", look: 3, hi: "I'm the middle of something. I want more. What's next to me?", deal: "Excellent. I've had my eye on Tuesday.", walk: "I'm over the hump. And over you." },
        { name: "The Idea Of A Customer", look: 16, hi: "All other customers are imperfect copies of me. I'll pay ideal money.", deal: "This transaction was flawless, in theory.", walk: "Reality let me down again." },
        { name: "You, Slightly Later", look: 0, hi: "Don't sell me that. I mean, do. I already bought it. Twenty percent off?", deal: "I remember this. I said thanks.", walk: "I knew you'd do that. I did that." },
    ],
];

export const COUNTERS = [
    "Hmm. A little more, maybe.", "You drive a hard bargain.", "Is this a negotiation or a hostage situation?", "My grandmother haggled better. And she's a lamp now.",
    "OK OK. But I'm telling everyone.", "You're lucky I like your visor.", "Fine. But I want the box it came in.", "That's my kid's college fund. Sure.",
    "I can go higher, but not emotionally.", "Do you know how long I've been circling?",
];
/** Once Irony is sold, nobody means anything but what they say. */
export const SINCERE = [
    "I just really like it. Thank you for your time.", "I've had a hard week and this would help.", "You seem kind. I'd like to pay you fairly.",
    "My mother had one of these. I miss her.", "I don't need it. I just wanted to talk to someone.", "You're doing a good job.",
];

/** What the kid says in the very first haggle, and in the very last. */
export const KID = {
    hi: "How much is that snow globe? I have fifty cents.", first: "Hold it for me. I'll come back for it.", last: "I'm back. Fifty cents, like we said.",
};

export const GARY = {
    intro: "HA! Nice little table. I'm DISCOUNT GARY, and everything's cheaper over here.",
    taunts: ["My tent has a second tent inside it!", "I'm selling your lamps. They were on your lawn!", "Everything's 11% off! Even the 11%!", "My prices are so low they're underground!", "I've got a guy. The guy has a guy. Cheaper guys!"],
    lose: ["Is that all? I've seen tougher lawn chairs!", "Too slow! Gary always gets his man. And his man's lamps!"],
    win: ["You took my best customer! And her cousin!", "All right, one point to the table.", "OK that one stung. Gary's feeling this.", "My tent! My beautiful second tent!"],
    done: "All right. You win. Take the tent. Take the customers. Do you have a job for a man called Gary?",
};

export const NUMBER_WORDS = [
    [1e6, "million"], [1e9, "billion"], [1e12, "trillion"], [1e15, "quadrillion"], [1e18, "quintillion"], [1e21, "sextillion"], [1e24, "septillion"], [1e27, "octillion"],
    [1e30, "nonillion"], [1e33, "decillion"], [1e36, "gazillion"], [1e39, "bajillion"], [1e42, "kajillion"], [1e45, "squillion"], [1e48, "jillion"], [1e51, "zillion"],
    [1e54, "gorillion"], [1e57, "brazillion"], [1e60, "hojillion"], [1e63, "skadillion"], [1e66, "umptillion"], [1e69, "bazillion"], [1e72, "fantastillion"], [1e75, "ridiculillion"],
    [1e78, "absurdillion"], [1e81, "lotsillion"], [1e84, "heapillion"], [1e87, "whatillion"], [1e90, "stoppillion"], [1e93, "pleasillion"], [1e96, "nearlillion"], [1e99, "almostillion"], [1e100, "googol"],
];
