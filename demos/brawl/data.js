// LUNCH LADY RIOT: every number the game is balanced on. Frames are 1/60 s, distances are world units (a student is about 100 tall).
export const BTN = { L: 1, R: 2, U: 4, D: 8, A: 16, H: 32, J: 64, S: 128, G: 256, T: 512 };
export const DEPTH = 96, GRAV = 1500, ARENA = 640, METER_BAR = 100;

const L = (o) => ({ cls: "L", depth: 38, lunge: 90, kb: 34, stun: 22, poise: 6, y1: 120, freeze: 2, ...o });
const H = (o) => ({ cls: "H", depth: 44, lunge: 110, kb: 60, stun: 30, poise: 24, y1: 140, freeze: 5, breaks: true, ...o });
const A = (o) => ({ cls: "A", air: true, depth: 50, lunge: 60, kb: 30, up: 210, stun: 30, poise: 6, y0: -70, y1: 130, freeze: 3, range: 170, ...o });

export const HEROES = {
    dot: {
        id: "dot", name: "DOT", title: "HEAD LUNCH LADY", hp: 200, walk: 196, zwalk: 142, jump: 640, jumps: 1, w: 34, h: 128, voice: "low",
        moves: {
            L1: L({ anim: "jab", st: 4, ac: 3, rc: 10, dmg: 6, reach: 78, next: "L2", word: "BOP" }),
            L2: L({ anim: "back", st: 5, ac: 3, rc: 10, dmg: 7, reach: 82, next: "L3", word: "WHAP", kb: 40 }),
            L3: L({ anim: "over", st: 7, ac: 3, rc: 12, dmg: 9, reach: 90, next: "L4", word: "BONK", stun: 28, kb: 44 }),
            L4: L({ anim: "twirl", st: 10, ac: 5, rc: 20, dmg: 16, reach: 104, depth: 56, knock: true, kb: 320, up: 330, word: "KLONK", freeze: 6, poise: 18, big: true }),
            HN: H({ anim: "wallop", st: 13, ac: 4, rc: 20, dmg: 20, reach: 108, fly: true, kb: 420, up: 230, word: "WALLOP", freeze: 7, big: true }),
            HU: H({ anim: "scoop", st: 9, ac: 4, rc: 18, dmg: 13, reach: 92, up: 680, kb: 26, launch: true, word: "SCOOP", freeze: 6, big: true }),
            H1: H({ anim: "scoop", st: 8, ac: 4, rc: 18, dmg: 13, reach: 92, up: 680, kb: 26, launch: true, word: "SCOOP", freeze: 6, big: true }),
            H2: H({ anim: "slam", st: 11, ac: 4, rc: 20, dmg: 18, reach: 100, spike: true, up: 420, kb: 12, word: "SLAM", freeze: 8, big: true, shock: true }),
            H3: H({ anim: "homer", st: 12, ac: 4, rc: 22, dmg: 24, reach: 112, fly: true, kb: 760, up: 170, word: "HOME RUN", freeze: 10, big: true, poise: 40 }),
            A1: A({ anim: "air1", st: 4, ac: 4, rc: 8, dmg: 6, reach: 80, next: "A2", word: "BIP" }),
            A2: A({ anim: "air2", st: 4, ac: 4, rc: 9, dmg: 7, reach: 84, next: "A3", word: "BAP" }),
            A3: A({ anim: "air1", st: 5, ac: 4, rc: 10, dmg: 8, reach: 88, next: "A1", up: 240, word: "BOOP" }),
            AH: A({ cls: "H", anim: "spike", st: 6, ac: 5, rc: 12, dmg: 15, reach: 90, spike: true, up: 400, word: "SPLAT", freeze: 8, big: true, breaks: true, poise: 24 }),
            DA: L({ anim: "slide", st: 3, ac: 8, rc: 16, dmg: 12, reach: 90, depth: 50, knock: true, kb: 240, up: 280, word: "SWOOSH", freeze: 4, big: true, poise: 14 }),
            TAG: H({ anim: "tag", st: 2, ac: 8, rc: 14, dmg: 16, reach: 110, depth: 70, up: 560, kb: 40, launch: true, word: "TAG IN", freeze: 7, big: true }),
        },
    },
    pip: {
        id: "pip", name: "PIP", title: "HALL MONITOR, GRADE 4", hp: 140, walk: 250, zwalk: 170, jump: 690, jumps: 2, w: 24, h: 88, voice: "high",
        moves: {
            L1: L({ anim: "jab", st: 3, ac: 2, rc: 8, dmg: 4, reach: 66, next: "L2", word: "TAK", stun: 18, lunge: 120 }),
            L2: L({ anim: "back", st: 3, ac: 2, rc: 8, dmg: 4, reach: 66, next: "L3", word: "TAK", stun: 18, lunge: 120 }),
            L3: L({ anim: "jab", st: 3, ac: 3, rc: 8, dmg: 5, reach: 70, next: "L4", word: "TIK", stun: 20, lunge: 120 }),
            L4: L({ anim: "back", st: 4, ac: 3, rc: 9, dmg: 5, reach: 72, next: "L5", word: "TOK", stun: 22, lunge: 120 }),
            L5: L({ anim: "twirl", st: 7, ac: 5, rc: 16, dmg: 11, reach: 92, depth: 56, knock: true, kb: 290, up: 340, word: "STOP", freeze: 5, big: true, poise: 14 }),
            HN: H({ anim: "wallop", st: 9, ac: 4, rc: 16, dmg: 12, reach: 92, stunLock: 96, kb: 30, stun: 96, word: "FREEZE", freeze: 8, big: true }),
            HU: H({ anim: "scoop", st: 7, ac: 4, rc: 15, dmg: 10, reach: 80, up: 720, kb: 20, launch: true, word: "UPPIES", freeze: 5, big: true }),
            H1: H({ anim: "scoop", st: 6, ac: 4, rc: 15, dmg: 10, reach: 80, up: 720, kb: 20, launch: true, word: "UPPIES", freeze: 5, big: true }),
            H2: H({ anim: "scoop", st: 6, ac: 4, rc: 15, dmg: 10, reach: 80, up: 720, kb: 20, launch: true, word: "UPPIES", freeze: 5, big: true }),
            H3: H({ anim: "slam", st: 9, ac: 4, rc: 18, dmg: 14, reach: 92, spike: true, up: 420, kb: 12, word: "SLAM", freeze: 7, big: true, shock: true }),
            H4: H({ anim: "homer", st: 9, ac: 4, rc: 18, dmg: 16, reach: 100, fly: true, kb: 680, up: 170, word: "OUTTA HERE", freeze: 8, big: true }),
            A1: A({ anim: "air1", st: 3, ac: 3, rc: 6, dmg: 4, reach: 70, next: "A2", word: "TIK", up: 200 }),
            A2: A({ anim: "air2", st: 3, ac: 3, rc: 6, dmg: 4, reach: 70, next: "A3", word: "TAK", up: 200 }),
            A3: A({ anim: "air1", st: 3, ac: 3, rc: 6, dmg: 5, reach: 70, next: "A4", word: "TOK", up: 210 }),
            A4: A({ anim: "air2", st: 4, ac: 3, rc: 8, dmg: 5, reach: 74, next: "A1", word: "TIK", up: 230 }),
            AH: A({ cls: "H", anim: "spike", st: 5, ac: 5, rc: 10, dmg: 11, reach: 82, spike: true, up: 400, word: "SPLAT", freeze: 7, big: true, breaks: true, poise: 20 }),
            DA: L({ anim: "slide", st: 2, ac: 9, rc: 12, dmg: 9, reach: 80, depth: 50, knock: true, kb: 240, up: 280, word: "SWOOSH", freeze: 4, big: true, poise: 12 }),
            TAG: H({ anim: "tag", st: 2, ac: 8, rc: 10, dmg: 12, reach: 104, depth: 70, up: 600, kb: 40, launch: true, word: "TAG IN", freeze: 7, big: true }),
        },
    },
};

// Pickups. Weapons replace the light attack; heavy throws them.
export const WEAPONS = {
    tray: { name: "TRAY", dur: 14, mv: L({ anim: "tray", st: 3, ac: 3, rc: 8, dmg: 11, reach: 92, depth: 46, kb: 70, stun: 26, word: "CLANG", freeze: 4, big: true, breaks: true, poise: 12 }), toss: { kind: "tray", dmg: 18, speed: 620, r: 30, life: 70, pierce: 3, back: true } },
    mop: { name: "MOP", dur: 12, mv: L({ anim: "mop", st: 7, ac: 6, rc: 12, dmg: 13, reach: 150, depth: 66, kb: 260, up: 240, knock: true, word: "SWISH", freeze: 4, big: true, breaks: true, poise: 16 }), toss: { kind: "mop", dmg: 26, speed: 760, r: 26, life: 60, pierce: 9 } },
    custard: { name: "CUSTARD", dur: 3, mv: H({ anim: "dump", st: 8, ac: 4, rc: 12, dmg: 12, reach: 120, depth: 66, knock: true, kb: 180, up: 260, word: "GLOOP", freeze: 5, big: true, puddle: true }), toss: { kind: "custard", dmg: 22, speed: 420, r: 34, life: 80, arc: 360, pierce: 1, puddle: true } },
};
export const FOOD = { cookie: { heal: 36, meter: 0 }, milk: { heal: 70, meter: 0 }, pudding: { heal: 16, meter: 60 } };

// Enemies. `tel` is the readable wind-up, in frames. Food rides on every head; when it pops off, the kid is free.
const atk = (o) => ({ tel: 34, ac: 6, rc: 30, reach: 84, depth: 34, dmg: 10, ...o });
export const ENEMIES = {
    kid: { hp: 58, speed: 104, w: 28, h: 104, ring: 130, poise: 40, score: 100, atk: atk({ anim: "punch" }) },
    tot: { hp: 38, speed: 178, w: 24, h: 92, ring: 170, poise: 30, score: 120, flee: true, atk: atk({ anim: "lunge", tel: 30, reach: 78, dmg: 7, lunge: 380, ac: 12, rc: 24 }) },
    tray: { hp: 72, speed: 82, w: 34, h: 106, ring: 120, poise: 50, score: 180, shield: 2, atk: atk({ anim: "bash", tel: 38, reach: 88, dmg: 11, lunge: 240, ac: 10 }) },
    lobber: { hp: 46, speed: 96, w: 26, h: 100, ring: 250, poise: 30, score: 160, ranged: true, atk: atk({ anim: "lob", tel: 40, ac: 4, rc: 46, dmg: 9, reach: 0 }) },
    stink: { hp: 26, speed: 128, w: 30, h: 96, ring: 90, poise: 16, score: 200, bomb: true, atk: atk({ anim: "swell", tel: 70, ac: 3, rc: 0, reach: 54, dmg: 22 }) },
    big: { hp: 220, speed: 66, w: 52, h: 150, ring: 110, poise: 90, score: 500, armor: true, atk: atk({ anim: "slam", tel: 52, ac: 8, rc: 44, reach: 112, depth: 46, dmg: 18, knock: true, shock: true }) },
    mini: { hp: 70, speed: 120, w: 34, h: 74, ring: 100, poise: 40, score: 200, atk: atk({ anim: "lunge", tel: 34, reach: 80, dmg: 9, lunge: 320, ac: 12, rc: 26 }) },
};

export const GRADES = [
    { at: 0, g: "-", word: "" }, { at: 40, g: "D", word: "DRY" }, { at: 120, g: "C", word: "CRISPY" }, { at: 220, g: "B", word: "BUTTERY" },
    { at: 330, g: "A", word: "APPETIZING" }, { at: 450, g: "S", word: "SCRUMPTIOUS" }, { at: 570, g: "SS", word: "SECONDS!!" },
];
export const STYLE_MAX = 680;
export const gradeOf = (v) => { let i = 0; for (let k = 0; k < GRADES.length; k++) if (v >= GRADES[k].at) i = k; return i; };
export const REPORT = [[0, "F"], [0.3, "D"], [0.5, "C"], [0.72, "B"], [0.95, "A"], [1.25, "S"]];
export const report = (r) => { let g = "F"; for (const [k, l] of REPORT) if (r >= k) g = l; return g; };

// Waves are strings; each arena locks the camera until its waves are done.
export const STAGES = [
    {
        id: "cafeteria", name: "THE CAFETERIA", sub: "Period 1: Lunch", boss: "meatloaf", tokens: 1, gap: 86, par: 68000, len: 2700, song: "stage1",
        arenas: [
            { at: 240, waves: ["kid", "kid kid"], hint: "attack" },
            { at: 900, waves: ["kid tot", "kid kid tot"], hint: "launch" },
            { at: 1560, waves: ["tray kid", "kid tot tot"], hint: "shield" },
        ],
        props: [["table", 520, 16], ["crate", 700, 80, "tray"], ["table", 1240, 60, "cookie"], ["crate", 1380, 12, "custard"], ["table", 1850, 18, "milk"], ["crate", 1980, 74, "cookie"]],
    },
    {
        id: "lockers", name: "LOCKER HALL", sub: "Period 2: Detention", boss: "frank", tokens: 1, gap: 72, par: 100000, len: 3300, song: "stage2",
        arenas: [
            { at: 260, waves: ["tot tot", "kid tray", "tot kid"] },
            { at: 960, waves: ["lobber kid", "lobber tray kid"], hint: "lobber" },
            { at: 1660, waves: ["kid kid tot tot", "tray lobber kid"] },
            { at: 2300, waves: ["tray tray", "lobber lobber tot", "kid tot tot"] },
        ],
        props: [["locker", 660, 8, "tray"], ["crate", 800, 84, "cookie"], ["locker", 1370, 10, "mop"], ["crate", 1500, 70, "pudding"], ["locker", 2060, 8, "cookie"], ["crate", 2240, 80, "custard"], ["locker", 2740, 12, "milk"]],
    },
    {
        id: "gym", name: "THE GYM", sub: "Period 3: Dodgeball", boss: "coach", tokens: 2, gap: 64, par: 170000, len: 3400, song: "stage3",
        arenas: [
            { at: 260, waves: ["kid kid lobber", "tot tot tot"] },
            { at: 960, waves: ["big", "big kid"], hint: "big" },
            { at: 1680, waves: ["tray tray lobber", "kid kid kid tot"] },
            { at: 2380, waves: ["big lobber tot", "tot tot tray kid"] },
        ],
        props: [["bench", 660, 12, "mop"], ["crate", 820, 76, "cookie"], ["bench", 1400, 70, "tray"], ["crate", 1600, 14, "pudding"], ["bench", 2100, 14, "custard"], ["crate", 2260, 80, "cookie"], ["bench", 2820, 70, "milk"]],
    },
    {
        id: "lab", name: "SCIENCE LAB", sub: "Period 4: Chemistry", boss: "aspic", tokens: 2, gap: 58, par: 180000, len: 3500, song: "stage4",
        arenas: [
            { at: 260, waves: ["stink kid kid", "lobber lobber tray"], hint: "stink" },
            { at: 980, waves: ["stink stink tot tot", "big stink"] },
            { at: 1700, waves: ["tray tray kid kid", "lobber lobber kid tot"] },
            { at: 2420, waves: ["big big", "stink tot tot tot", "tray lobber lobber kid"] },
        ],
        props: [["bench", 680, 8, "cookie"], ["crate", 840, 84, "tray"], ["bench", 1430, 76, "custard"], ["crate", 1600, 10, "milk"], ["bench", 2140, 12, "mop"], ["crate", 2320, 78, "pudding"], ["bench", 2880, 12, "milk"]],
    },
    {
        id: "library", name: "THE LIBRARY", sub: "Period 5: Silent Reading", boss: "shush", tokens: 2, gap: 50, par: 180000, len: 3600, song: "stage5",
        arenas: [
            { at: 260, waves: ["kid kid tray lobber", "tot tot tot stink"] },
            { at: 980, waves: ["big tray", "lobber lobber lobber kid"] },
            { at: 1720, waves: ["big stink stink", "tray tray kid tot tot"] },
            { at: 2460, waves: ["big big lobber", "tot tot tot tot kid", "tray tray stink lobber"] },
        ],
        props: [["shelf", 690, 6, "custard"], ["crate", 860, 86, "cookie"], ["shelf", 1450, 8, "mop"], ["crate", 1640, 80, "milk"], ["shelf", 2180, 8, "tray"], ["crate", 2360, 80, "cookie"], ["shelf", 2920, 8, "milk"]],
    },
    {
        id: "roof", name: "THE ROOF", sub: "Period 6: The Final Bell", boss: "casserole", tokens: 3, gap: 42, par: 300000, len: 3700, song: "stage6",
        arenas: [
            { at: 260, waves: ["kid kid kid tot tot", "big lobber lobber"] },
            { at: 1000, waves: ["tray tray stink stink", "tot tot tot tot lobber"] },
            { at: 1760, waves: ["big big kid", "tray lobber lobber stink tot"] },
            { at: 2520, waves: ["big big tray", "kid kid kid kid tot tot", "big stink stink lobber lobber"] },
        ],
        props: [["vent", 700, 10, "milk"], ["crate", 880, 84, "tray"], ["vent", 1480, 12, "custard"], ["crate", 1660, 80, "mop"], ["vent", 2240, 10, "milk"], ["crate", 2420, 76, "cookie"], ["vent", 2980, 10, "milk"]],
    },
];
export const DIFFS = [{ id: "normal", name: "REGULAR", hp: 1, dmg: 1, gap: 1 }, { id: "spicy", name: "EXTRA SPICY", hp: 1.35, dmg: 1.5, gap: 0.72 }];
