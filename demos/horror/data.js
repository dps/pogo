// The factory, and the five nights. Everything the rules need and nothing about how it looks.
export const CELL = 2;
export const BASEMENT_Y = -3.6;

// # wall  W window  D door  s shelf  p paint rack  m press  k console  o desk  b boiler  e workbench  L locker  > < ^ v belt  1-4 stairs
export const MAP = [
    //0123456789012345678901234567
    "############################", //  0
    "#......#............#......#", //  1
    "#.p.p..#.ssss..ssss.#.o....#", //  2  paint room | north aisles | office
    "#......D............D.o...L#", //  3
    "#.p.p..#.ssss..ssss.#......#", //  4
    "#......#............##WWW###", //  5
    "#.p.p..#.ssss..ssss........#", //  6
    "#......#...................#", //  7
    "####D###...>>>>>>>>>>>v....#", //  8  locker room | Line A
    "#......#...^..........v....#", //  9
    "#......D..k^.mmmk.mmm.v..L.#", // 10
    "#......#...^..........v....#", // 11
    "#.LLLL.#...^<<<<<<<<<<<....#", // 12
    "########...................#", // 13
    "########.L.ss.....ss.ss....#", // 14  crates
    "########...................#", // 15
    "###############D#######D####", // 16
    "###############1#######1####", // 17  two stairs down, so a chase has a loop
    "###############2#######2####", // 18
    "###############3#######3####", // 19
    "###############4#######4####", // 20
    "######.....#.......#.....###", // 21  records | boiler | bench
    "######.ss..#.bb..b.#..e..###", // 22
    "######.....D.......D.....###", // 23
    "######.ss.L#.bb..b.#..e..###", // 24
    "######.....#.......#...L.###", // 25
    "############################", // 26
];
export const W = MAP[0].length, H = MAP.length;

/** Places, in cell units. y is metres above that cell's floor. face is the outward direction of a wall fitting. */
export const SPOTS = {
    start: { x: 24.5, z: 3.5 },
    clipboard: { x: 22.5, z: 3.1, y: 1.0, name: "Clipboard" },
    tape: { x: 22.5, z: 2.4, y: 1.0, name: "Tape machine" },
    clock: { x: 24.5, z: 1.0, y: 1.35, name: "Time clock", face: [0, 1] },
    line: { x: 10.5, z: 10.5, y: 1.15, name: "Line A switch" },
    press: { x: 16.5, z: 10.5, y: 1.15, name: "Press" },
    tagA: { x: 10.5, z: 7.0, y: 1.3, name: "Shelf A", face: [0, 1] },
    tagB: { x: 16.5, z: 1.98, y: 1.3, name: "Shelf B", face: [0, -1] },
    tagC: { x: 19.0, z: 6.5, y: 1.3, name: "Shelf C", face: [1, 0] },
    eyes: { x: 3.5, z: 5.5, y: 0.9, name: "Tray of glass eyes" },
    fuseboard: { x: 27.0, z: 14.5, y: 1.4, name: "Fuse board", face: [-1, 0] },
    spareFuse: { x: 8.5, z: 25.5, y: 0.8, name: "Spare fuse" },
    bench: { x: 22.5, z: 23.0, y: 1.0, name: "Workbench" },
    boiler: { x: 15.5, z: 22.0, y: 1.1, name: "Boiler" },
    bay: { x: 26.5, z: 10.5 },
};

// Where things stand. Batteries are placed by each night.
const B = {
    lockers: { x: 3.5, z: 11.5 }, north: { x: 19.5, z: 1.5 }, crates: { x: 16.5, z: 14.5 }, bay: { x: 25.5, z: 8.5 },
    paint: { x: 1.5, z: 1.5 }, records: { x: 9.5, z: 21.5 }, bench: { x: 23.5, z: 21.5 },
};

const plain = (x, z, at = null, extra = {}) => ({ kind: "plain", x, z, at, ...extra });
const blind = (x, z, at = null, extra = {}) => ({ kind: "blind", x, z, at, ...extra });

/**
 * A step is one line on the clipboard. kinds: light (turn the torch on), use, hold, scan, sweep, clock.
 * `say` plays when the step begins; `then` runs when it ends. A wake entry in `then` names a doll by index.
 * Timed lines in `beats` run at seconds after the step began.
 */
export const NIGHTS = [
    {
        title: "Orientation", rule: "They only move in the dark.", speed: 1.05, drain: 0.55, doorsOpenAfter: 0, stare: 0.2,
        dolls: [plain(18.5, 7.5, 75)], batteries: [B.bay],
        closed: [[20, 3]],
        steps: [
            { kind: "light", label: "Turn on your torch", say: "Evening. This is Mr. Pell, on tape. I'm not in the building at night. Nobody is. Torch first." },
            { kind: "use", at: "clipboard", label: "Take your clipboard", say: "Your clipboard is on the desk. Mind the stock. It came with the office." },
            { kind: "scan", at: "tagA", secs: 1.4, label: "Read the tally on Shelf A", say: "Out through the door. Shelf A, just past the aisles. Hold your light on the tally card.",
                then: [["say", "Stock settles at night. If some of it settles your way, keep your light on it. It stops."], ["wake", 0]] },
            { kind: "use", at: "line", label: "Start Line A", say: "Line A switch, by the belt. Give it a good shove.",
                then: [["belt", true], ["sound", "thud", "tagC"]] },
            { kind: "use", at: "press", label: "Check the press gauge", say: "Hear that? Lovely. Step across the belt and look at the press gauge. It's meant to read nothing." },
            { kind: "clock", at: "clock", label: "Punch out", say: "Good. That's a shift. Clock's in the office. Don't dawdle, the stock gets ideas." },
        ],
    },
    {
        title: "Stocktake", rule: "Doors stop them. Close one behind you.", speed: 1.1, drain: 0.7, doorsOpenAfter: 0, stare: 0.5,
        dolls: [plain(14.5, 7.5, 40), plain(9.5, 3.5, 90), plain(25.5, 13.5, 130)], batteries: [B.lockers, B.crates],
        closed: [[7, 3], [7, 10], [4, 8]],
        steps: [
            { kind: "scan", at: "tagB", secs: 1.4, label: "Read the tally on Shelf B", say: "Stocktake tonight. Shelf B first. The stock can't work a door, so shut one if you must.",
                then: [["wake", 0]], beats: [[9, "sound", "phone", "tape"]] },
            { kind: "use", at: "eyes", label: "Fetch the tray of glass eyes", say: "Paint room. There's a tray of eyes wants counting. Don't leave it out, they dry funny.",
                then: [["wake", 1], ["slam", 7, 3], ["sound", "musicbox", "tagA"], ["stare", 1]] },
            { kind: "scan", at: "tagC", secs: 1.4, label: "Read the tally on Shelf C", say: "Now Shelf C. Yes, I know the tune. Ignore the tune.",
                then: [["wake", 2]] },
            { kind: "use", at: "line", label: "Log the eyes at Line A", say: "Book the tray in at the Line A switch. It wants a signature, and I want it gone." },
            { kind: "clock", at: "clock", label: "Punch out", say: "That's the lot. Clock out. Nobody has ever been hurt on my shift, you know." },
        ],
    },
    {
        title: "Line Test", rule: "The belt doesn't care if they're frozen.", speed: 1.2, drain: 0.8, doorsOpenAfter: 6, stare: 1,
        dolls: [plain(14.5, 8.5), plain(19.5, 12.5), plain(24.5, 3 + 3.5), plain(9.5, 14.5, 70)],
        batteries: [B.north, B.lockers], closed: [[7, 10]],
        steps: [
            { kind: "use", at: "line", label: "Start Line A", say: "Line test. Stock on the belt rides the belt, lit or not. And they've learned handles. Six seconds, about.",
                then: [["belt", true], ["wake", 0]] },
            { kind: "hold", at: "press", secs: 2.2, label: "Run the press", say: "Press controls, inside the loop. Step over the belt and hold the lever.", then: [["wake", 1]] },
            { kind: "sweep", warn: 14, secs: 13, label: "Whistle! Get in a locker", say: "That's the whistle. They count themselves when it blows, and no torch stops the count. Get in a locker. Stay in." },
            { kind: "use", at: "line", label: "Stop Line A", say: "All clear. Stop the line.", then: [["belt", false]] },
            { kind: "clock", at: "clock", label: "Punch out", say: "Punch out. Don't look at Shelf C on your way past. It only encourages them." },
        ],
    },
    {
        title: "Power Cut", rule: "Blindfolded ones follow your torch. Turn it off and they stop.", speed: 1.2, drain: 0.75, doorsOpenAfter: 6, stare: 1, dark: true,
        zones: [{ at: [15, 18], act: ["flicker", 2.4] }, { at: [23, 18], act: ["flicker", 2.4] }],
        dolls: [plain(12.5, 7.5, 30), blind(15.5, 23.5), blind(21.5, 25.5), plain(25.5, 8.5, 60), plain(13.5, 13.5, 95)],
        batteries: [B.crates, B.records], closed: [],
        steps: [
            { kind: "use", at: "fuseboard", label: "Check the fuse board", say: "Power's out. Board's by the bay. Have a look." },
            { kind: "use", at: "spareFuse", label: "Fetch a fuse from the basement", say: "No fuse. Spare's in records, downstairs. I should mention the ones in blindfolds. They go to light. Dark stops them.",
                then: [["wake", 1], ["wake", 2]], beats: [[1, "wake", 1], [1, "wake", 2]] },
            { kind: "use", at: "bench", label: "Sign the bench log", say: "While you're down there, sign the log on the bench. It's only paperwork.",
                then: [["found", "bench"], ["say", "Unit 31. On order for this week. Don't read the tag, you'll only upset yourself."]] },
            { kind: "use", at: "fuseboard", label: "Fit the fuse", say: "Back up to the board." },
            { kind: "clock", at: "clock", label: "Punch out", say: "Lights on. One more night. Punch out." },
        ],
    },
    {
        title: "Last Shift", rule: "Don't let them touch you.", speed: 1.12, drain: 0.85, belt: true, doorsOpenAfter: 0, stare: 1, empty: true, jammed: true,
        dolls: [plain(9.5, 7.5, 10), plain(21.5, 7.5, 35), plain(12.5, 13.5, 75), plain(24.5, 13.5, 120), blind(15.5, 21.5, 15), blind(9.5, 23.5, 15), plain(13.5, 21.5, 150)],
        batteries: [B.north, B.lockers, B.records, B.bench], closed: [],
        steps: [
            { kind: "use", at: "bench", label: "Collect your pay from the bench", say: "Last shift. Doors are off the mains tonight, so they won't shut. Your pay is on the bench, in the basement." },
            { kind: "hold", at: "boiler", secs: 2.2, label: "Bank the boiler", say: "Bank the boiler while you're there. Hold it till the needle drops. Don't let them touch you." },
            { kind: "scan", at: "tagC", secs: 1.2, label: "Sign off Shelf C", say: "Sign off Shelf C. Empty is correct. Empty is correct." },
            { kind: "scan", at: "tagA", secs: 1.2, label: "Sign off Shelf A", say: "Shelf A. Empty is correct. Don't let them touch you. Don't let them touch you." },
            { kind: "use", at: "line", label: "Shut down Line A", say: "Shut the line down. Last time. They were all good workers. Don't let them touch you.", then: [["belt", false]] },
            { kind: "clock", at: "clock", label: "Punch out", say: "Punch out, and you're done. Thank you for your service. Don't let them touch you. Don't let them t" },
        ],
    },
];

/** One named doll a night. Hold your light on it and its tag reads. */
export const FILES = [
    { x: 9.5, z: 3.02, y: 1.7, name: "Ruth Adeyemi", line: "Night shift, 1974. Six shifts." },
    { x: 17.5, z: 3.02, y: 1.14, name: "Tomasz Wilk", line: "Night shift, 1981. Five shifts." },
    { x: 12.5, z: 7.02, y: 2.3, name: "Grace Lindqvist", line: "Night shift, 1988. Five shifts." },
    { x: 16.5, z: 5.02, y: 1.7, name: "Dev Raman", line: "Night shift, 1996. Five shifts." },
    { x: 10.5, z: 5.02, y: 1.14, name: "Marie Okoye", line: "Night shift, 2009. Four shifts." },
];

/** What you find when you wake in the car park. Tender, and wrong. */
export const WAKES = [
    "Your shoelaces have been tied in neat double bows.",
    "Your coat is buttoned to the neck. You don't remember doing that.",
    "Somebody has tucked a blanket round your shoulders. It smells of lavender and glue.",
    "There is a paper cup of tea beside you. It is still warm.",
    "Your car keys are in your hand. Your fingers have been folded round them, one at a time.",
    "Your hair has been combed.",
];
