// The campaign. Boards are text: pictures of the board, so they can be read and edited like one.
//  . ground   _ path   ~ water   h hedge   # stone   i melted ice cream   ^ pigeon spikes   v ledge gap
//  1-4 squad   c fizzy can   b box   B bread bag   N egg nest   D drum   P perch   @ crumb   O exit   r Old Reg
//  C crow   S slinger   R bruiser   G swooper   E bin baron   Q scrapper   L lobber   X nutcase   W sprinkler
//  H Chairman Hazel   Z Big Steve   K The Contessa   Y The Swan
import { N, T } from "./sim.js";

const FOE = { C: "crow", S: "slinger", R: "bruiser", G: "gull", E: "screecher", Q: "squirrel", L: "lobber", X: "nutcase", W: "sprinkler", H: "hazel", Z: "steve", K: "contessa", Y: "swan" };
const TILE = { ".": T.GRASS, _: T.PATH, "~": T.WATER, h: T.HEDGE, "#": T.STONE, i: T.SLICK, "^": T.SPIKE, v: T.VOID };
const PROP = { c: "can", b: "box", B: "bag", N: "nest", D: "drum" };

export function parseBoard(rows, under = ".") {
    const r = { tiles: [], deploy: [], foes: [], props: [], crumbs: [], perch: [], reg: [], exit: null };
    rows.forEach((row, y) => {
        [...row].forEach((c, x) => {
            const i = y * N + x;
            r.tiles[i] = TILE[c] ?? TILE[under];
            if (c >= "1" && c <= "4") r.deploy[+c - 1] = [x, y];
            else if (FOE[c]) r.foes.push([FOE[c], x, y]);
            else if (PROP[c]) r.props.push([PROP[c], x, y]);
            else if (c === "P") r.perch.push(i);
            else if (c === "@") r.crumbs.push(i);
            else if (c === "O") r.exit = i;
            else if (c === "r") r.reg.push([x, y]);
        });
    });
    r.deploy = r.deploy.filter(Boolean);
    return r;
}

const w = (round, ...u) => { const units = []; for (let i = 0; i < u.length; i += 3) units.push([u[i], u[i + 1], u[i + 2]]); return { round, units }; };

const mission = (id, name, zone, o, rows) => ({ id, name, zone, squad: 3, ...o, ...parseBoard(rows, o.under), rows });

export const MISSIONS = [
    // ---- The Lawn: learn the verbs ----
    mission("l1", "Boots on the Lawn", "lawn", { win: "rout", rounds: 6, squad: 2, stars: [{ k: "noDmg", n: 1 }, { k: "fast", n: 4 }],
        brief: "Two crows on our lawn. Slap them off it.", speaker: "sarge" }, [
        "........",
        "........",
        ".h.C..h.",
        "........",
        "....C...",
        "..._....",
        "..1_2...",
        "..._....",
    ]),
    mission("l2", "Pond Life", "lawn", { win: "rout", rounds: 6, squad: 2, stars: [{ k: "hazard", n: 2 }, { k: "noLoss" }],
        brief: "Squirrels can't swim. Don't ask how I know.", speaker: "doris" }, [
        "........",
        ".Q....Q.",
        "........",
        "..~~~~..",
        "..~~~~..",
        "........",
        "...12...",
        "........",
    ]),
    mission("l3", "Hands Off the Bread", "lawn", { win: "survive", rounds: 3, squad: 2, recruit: "gale", stars: [{ k: "bag" }, { k: "kills", n: 2 }],
        brief: "The red marks show what they'll hit. Move the crow, and the peck moves with it.", speaker: "sarge" }, [
        "........",
        "..C..C..",
        "..h..h..",
        "........",
        "...B....",
        "........",
        "..1..2..",
        "........",
    ]),
    mission("l4", "Friendly Fire", "lawn", { win: "rout", rounds: 5, stars: [{ k: "ff" }, { k: "noDmg", n: 1 }],
        brief: "Attacks stay aimed the way they were aimed. Shove a crow in front of its friend.", speaker: "gale" }, [
        "..S..S..",
        "........",
        "...h....",
        "........",
        ".C....C.",
        "........",
        "..1.2.3.",
        "........",
    ]),
    mission("l5", "Fizzy Business", "lawn", { win: "rout", rounds: 5, stars: [{ k: "chain", n: 3 }, { k: "fast", n: 3 }],
        brief: "Humans leave fizzy cans everywhere. One knock and off they go.", speaker: "doris" }, [
        "...Q....",
        ".c.c.c..",
        "..Q.Q...",
        ".c...c..",
        "........",
        ".._..h..",
        ".1_2.3..",
        ".._.....",
    ]),
    mission("l6", "Picnic Run", "lawn", { win: "collect", rounds: 5, recruit: "kevin", stars: [{ k: "noLoss" }, { k: "fast", n: 3 }],
        brief: "A blanket, unattended. Get every crumb before the squirrels do.", speaker: "sarge" }, [
        "@..h...@",
        "...Q....",
        "...~~...",
        ".C.~~.Q.",
        "...@....",
        ".h....h.",
        ".@.12.3@",
        "........",
    ]),
    mission("l7", "The Long Hedge", "lawn", { win: "rout", rounds: 6, boss: true, stars: [{ k: "noLoss" }, { k: "fast", n: 5 }],
        brief: "The crows hold the hedge. Take it, and the bandstand's in reach.", speaker: "sarge",
        waves: [w(2, "crow", 0, 0, "crow", 7, 0)] }, [
        ".R...S..",
        "...S....",
        "hhh..hhh",
        "........",
        "..c..c..",
        "........",
        "..1.2.3.",
        "........",
    ]),

    // ---- The Bandstand: drums, roundabouts, squirrels with plans ----
    mission("b1", "Sound Check", "bandstand", { win: "rout", rounds: 5, stars: [{ k: "hazard", n: 2 }, { k: "noDmg", n: 1 }],
        brief: "Hit a drum and everything next to it gets a shove. Mind the moat.", speaker: "gale", under: "_" }, [
        "..Q..Q..",
        "........",
        ".~~D.~~.",
        ".~~..~~.",
        "...Q....",
        "...D....",
        ".1..2.3.",
        "........",
    ]),
    mission("b2", "Front Row Seats", "bandstand", { win: "perch", goal: 4, rounds: 4, recruit: "vinnie", stars: [{ k: "noLoss" }, { k: "fast", n: 3 }],
        brief: "Stand on the seats when the round ends. Four sits wins it.", speaker: "kevin", under: "_" }, [
        "...L....",
        ".Q....Q.",
        "..P..P..",
        "..hDDh..",
        "..hP.h..",
        "........",
        "..1.2.3.",
        "........",
    ]),
    mission("b3", "Nut Job", "bandstand", { win: "survive", rounds: 3, stars: [{ k: "bag" }, { k: "chain", n: 2 }],
        brief: "Those squirrels are wired. Keep them away from the lunch, or use them.", speaker: "doris", under: "_",
        waves: [w(1, "nutcase", 7, 3)] }, [
        ".X....X.",
        "........",
        "..c..c..",
        "........",
        "...BB...",
        ".h....h.",
        "..1.2.3.",
        "........",
    ]),
    mission("b4", "Round and Round", "bandstand", { win: "rout", rounds: 6, carousel: [3, 3], stars: [{ k: "noLoss" }, { k: "fast", n: 4 }],
        brief: "The roundabout turns a quarter every round. Anyone on it rides.", speaker: "vinnie", under: "_" }, [
        "..L..L..",
        "........",
        "..Q..C..",
        ".~......",
        ".~....~.",
        "...D..~.",
        ".1..2.3.",
        "........",
    ]),
    mission("b5", "Encore", "bandstand", { win: "survive", rounds: 4, recruit: "lunch", stars: [{ k: "bag" }, { k: "noLoss" }],
        brief: "They keep coming back. Hold the bread until the band goes home.", speaker: "sarge", under: "_",
        waves: [w(1, "squirrel", 0, 0, "squirrel", 7, 0), w(2, "lobber", 3, 0)] }, [
        "...Q....",
        "........",
        "..D..D..",
        "...B....",
        "..c.....",
        ".h....c.",
        "..1.2.3.",
        "........",
    ]),
    mission("b6", "Chairman Hazel", "bandstand", { win: "boss", rounds: 7, boss: true, squad: 4, stars: [{ k: "noLoss" }, { k: "hazard", n: 1 }],
        brief: "Comrades! The bandstand belongs to the nuts! ...And you can't swim, Chairman.", speaker: "hazel", under: "_",
        waves: [w(2, "squirrel", 0, 3), w(4, "squirrel", 7, 3)] }, [
        "........",
        "..~~~~..",
        "...H....",
        ".D....D.",
        "..~~~~..",
        ".c....c.",
        ".1.2.3.4",
        "........",
    ]),

    // ---- The Fountain: gulls and a lot of water ----
    mission("f1", "Seagull Season", "fountain", { win: "rout", rounds: 5, recruit: "plume", stars: [{ k: "noDmg", n: 2 }, { k: "fast", n: 4 }],
        brief: "Gulls dive in straight lines. Put something in the way, or get out of it.", speaker: "sarge", under: "_" }, [
        "G.....G.",
        "........",
        "..~##~..",
        "..~##~..",
        "........",
        "..c..c..",
        ".1.2.3..",
        "........",
    ]),
    mission("f2", "Old Reg Goes for a Walk", "fountain", { win: "escort", rounds: 6, stars: [{ k: "noLoss" }, { k: "fast", n: 4 }],
        brief: "Old Reg knows where the big bread is. Walk him to the gate. Slowly.", speaker: "plume", under: "_" }, [
        "......O.",
        "..C.....",
        "~~~..~~~",
        "..Q.....",
        "...h....",
        "....C...",
        ".r1.2.3.",
        "........",
    ]),
    mission("f3", "Splash Zone", "fountain", { win: "perch", goal: 4, rounds: 4, stars: [{ k: "noDmg", n: 1 }, { k: "fast", n: 3 }],
        brief: "The sprinklers turn clockwise. Read them. Sit on the plinths.", speaker: "gale", under: "_" }, [
        "...G....",
        ".P....P.",
        "...W....",
        "..~~~~..",
        "..~~~~..",
        "....W...",
        ".1P.2.3.",
        "........",
    ]),
    mission("f4", "Bin Day", "fountain", { win: "survive", rounds: 4, recruit: "quack", stars: [{ k: "bag" }, { k: "noLoss" }],
        brief: "The Bin Barons want the eggs. They shout very wide and very loud.", speaker: "plume", under: "_",
        waves: [w(2, "crow", 0, 3, "crow", 7, 3)] }, [
        "...E....",
        "........",
        "..#..#..",
        ".N....N.",
        "........",
        "..c..c..",
        ".1.2.3..",
        "........",
    ]),
    mission("f5", "The Ice Cream Incident", "fountain", { win: "rout", rounds: 5, stars: [{ k: "hazard", n: 2 }, { k: "fast", n: 4 }],
        brief: "A cone went down. Things shoved through the mess don't stop.", speaker: "kevin", under: "_" }, [
        "..Q..Q..",
        "..~~~~..",
        ".iiiiii.",
        ".iiQGii.",
        ".iiiiii.",
        "........",
        ".1.2.3..",
        "........",
    ]),
    mission("f6", "Big Steve", "fountain", { win: "boss", rounds: 7, boss: true, squad: 4, stars: [{ k: "noLoss" }, { k: "fast", n: 5 }],
        brief: "That is my chip. That is also my chip. They're all my chips.", speaker: "steve", under: "_",
        waves: [w(3, "gull", 0, 0)] }, [
        "........",
        "..c..c..",
        "...Z....",
        ".c.##.c.",
        "...##...",
        ".c....c.",
        ".1.2.3.4",
        "........",
    ]),

    // ---- The Rooftops: nothing behind you but air ----
    mission("r1", "Up on the Roof", "rooftop", { win: "rout", rounds: 5, ledge: true, stars: [{ k: "hazard", n: 3 }, { k: "fast", n: 4 }],
        brief: "No fence up here. A squirrel shoved off the edge is a squirrel gone.", speaker: "vinnie", under: "_" }, [
        "Q......Q",
        "........",
        "..#..#..",
        "...Q....",
        "........",
        "...#....",
        ".1.2.3..",
        "........",
    ]),
    mission("r2", "Pigeon Spikes", "rooftop", { win: "collect", rounds: 5, ledge: true, stars: [{ k: "noLoss" }, { k: "fast", n: 4 }],
        brief: "They put these up for us. Very flattering. Shove someone else onto them.", speaker: "plume", under: "_" }, [
        "@.^^^^.@",
        "..^C.^..",
        "..^^.^..",
        "........",
        ".@.^^.@.",
        ".S.^^...",
        ".1.2.3..",
        "........",
    ]),
    mission("r3", "Chimney Sweep", "rooftop", { win: "perch", goal: 5, rounds: 4, ledge: true, stars: [{ k: "noDmg", n: 2 }, { k: "fast", n: 3 }],
        brief: "Hold the chimneys. The view's lovely. Everyone will hate that.", speaker: "doris", under: "_",
        waves: [w(2, "gull", 7, 0)] }, [
        "..G.....",
        ".P..v.P.",
        "....v...",
        "..#.v.S.",
        "....v...",
        ".P..c...",
        ".1.2.3..",
        "........",
    ]),
    mission("r4", "Reg's Last Stand", "rooftop", { win: "escort", rounds: 6, ledge: true, squad: 4, stars: [{ k: "noLoss" }, { k: "noDmg", n: 2 }],
        brief: "He says the big bread's across the roofs. He said that about the bus.", speaker: "kevin", under: "_" }, [
        "O..vv...",
        "...vv.S.",
        "...vv...",
        ".G.__...",
        "...vv.E.",
        "...vv...",
        "1r.vv...",
        "234vv...",
    ]),
    mission("r5", "Nest Egg", "rooftop", { win: "survive", rounds: 4, ledge: true, squad: 4, minKeep: 2, stars: [{ k: "bag" }, { k: "noLoss" }],
        brief: "Crows from the north, gulls from the east, and three nests to keep. Lose two and it's over.", speaker: "quack", under: "_",
        waves: [w(1, "gull", 7, 3), w(2, "crow", 0, 0, "slinger", 7, 0)] }, [
        "...S....",
        "..R.....",
        "...^^...",
        ".N....N.",
        "...N....",
        "..c..c..",
        ".1.2.3.4",
        "........",
    ]),
    mission("r6", "The Contessa", "rooftop", { win: "boss", rounds: 7, ledge: true, boss: true, squad: 4, stars: [{ k: "noLoss" }, { k: "fast", n: 4 }],
        brief: "Darling. You came all this way, and in those feet.", speaker: "contessa", under: "_",
        waves: [w(2, "slinger", 0, 0), w(4, "bruiser", 7, 0)] }, [
        "........",
        ".^....^.",
        "...K....",
        ".c.##.c.",
        "....#...",
        "^.c..c.^",
        ".1.2.3.4",
        "........",
    ]),

    // ---- The Island ----
    mission("x1", "The Truce", "island", { win: "rout", rounds: 6, squad: 4, stars: [{ k: "chain", n: 2 }, { k: "noLoss" }],
        brief: "Crows, gulls and squirrels, all on one bank, all looking at the island. All terrified.", speaker: "reg", under: ".",
        waves: [w(2, "crow", 7, 3)] }, [
        "~~~..~~~",
        "~Q....S~",
        "..c..c..",
        "..#..G..",
        "...L....",
        "..c..c..",
        ".1.2.3.4",
        "~......~",
    ]),
    mission("x2", "The Swan", "island", { win: "boss", rounds: 8, squad: 4, boss: true, final: true, stars: [{ k: "noLoss" }, { k: "fast", n: 5 }],
        brief: "It has always been the Swan.", speaker: "reg", under: ".",
        waves: [w(3, "gull", 0, 3), w(5, "gull", 7, 3)] }, [
        "~~~~~~~~",
        "~.c..c.~",
        "~..Y...~",
        "~.^..^.~",
        "..c##c..",
        "...##...",
        ".1.2.3.4",
        "~......~",
    ]),
];

/** Pressure, kept apart from the pictures so it can be tuned against the bots. */
const TUNE = {
    l4: { waves: [w(2, "crow", 0, 2)] },
    l5: { waves: [w(2, "squirrel", 7, 1)] },
    l6: { rounds: 6, waves: [w(2, "crow", 3, 0)] },
    l7: { waves: [w(2, "crow", 0, 0, "crow", 7, 0), w(3, "slinger", 3, 0)] },
    b1: { vet: 0, waves: [w(2, "lobber", 7, 0), w(3, "squirrel", 0, 0, "squirrel", 7, 0)] },
    b2: { goal: 5, waves: [w(1, "squirrel", 0, 5), w(2, "crow", 7, 4)] },
    b3: { rounds: 4, bagHp: 1, waves: [w(1, "nutcase", 7, 3, "squirrel", 0, 1), w(2, "nutcase", 0, 3, "squirrel", 3, 0), w(3, "nutcase", 7, 2, "lobber", 0, 1)] },
    b4: { waves: [w(2, "crow", 7, 0), w(3, "squirrel", 0, 0, "lobber", 3, 0)] },
    b5: { rounds: 5, bagHp: 2, waves: [w(1, "squirrel", 0, 0, "squirrel", 7, 0), w(2, "lobber", 3, 0, "nutcase", 6, 2), w(3, "crow", 0, 4, "lobber", 5, 0), w(4, "squirrel", 7, 4)] },
    b6: { vet: 0, rounds: 5, bagHp: 1, extra: [["bag", 3, 5], ["bag", 5, 5]], minKeep: 1, waves: [w(1, "nutcase", 0, 3), w(2, "squirrel", 7, 3, "lobber", 3, 0), w(4, "squirrel", 0, 3, "nutcase", 7, 3)] },
    f1: { vet: 0, rounds: 6, waves: [w(2, "crow", 3, 0), w(3, "gull", 7, 3)] },
    f2: { vet: 1, rounds: 5, waves: [w(1, "crow", 6, 3), w(2, "slinger", 3, 0, "gull", 0, 3), w(3, "gull", 7, 1)] },
    f3: { vet: 1, goal: 6, waves: [w(1, "crow", 0, 3), w(2, "gull", 7, 6)] },
    f4: { vet: 0, waves: [w(1, "gull", 0, 0), w(2, "crow", 0, 3, "crow", 7, 3)] },
    f5: { vet: 0, rounds: 6, waves: [w(2, "squirrel", 0, 0, "squirrel", 7, 0), w(3, "gull", 3, 0)] },
    f6: { vet: 1, rounds: 6, extra: [["nest", 3, 5], ["nest", 5, 7], ["nest", 2, 7]], minKeep: 2, waves: [w(1, "gull", 0, 0), w(3, "gull", 7, 0, "crow", 3, 0), w(5, "screecher", 0, 3)] },
    r1: { vet: 1, rounds: 6, waves: [w(2, "squirrel", 7, 3, "lobber", 3, 0), w(3, "squirrel", 0, 3, "crow", 5, 0)] },
    r2: { vet: 1, rounds: 4, waves: [w(1, "crow", 3, 3, "gull", 7, 3), w(2, "gull", 0, 3, "bruiser", 4, 3), w(3, "slinger", 0, 3)] },
    r3: { vet: 1, waves: [w(1, "crow", 7, 5), w(2, "gull", 7, 0, "crow", 0, 0)] },
    r4: { vet: 1, rounds: 4, waves: [w(1, "crow", 2, 0, "crow", 2, 5), w(2, "gull", 0, 3, "bruiser", 6, 6), w(3, "slinger", 2, 3)] },
    r5: { vet: 1, waves: [w(1, "gull", 7, 3, "crow", 0, 3), w(2, "crow", 0, 0, "slinger", 7, 0), w(3, "screecher", 3, 0)] },
    r6: { vet: 1, rounds: 5, bagHp: 2, extra: [["bag", 3, 7], ["bag", 5, 7]], minKeep: 1, waves: [w(1, "slinger", 0, 0), w(2, "bruiser", 7, 0), w(4, "gull", 0, 3, "crow", 7, 3)] },
    x1: { vet: 2, rounds: 5, waves: [w(1, "gull", 0, 2), w(2, "crow", 7, 3, "nutcase", 0, 7), w(3, "screecher", 3, 0)] },
    x2: { vet: 2, rounds: 6, extra: [["nest", 0, 5], ["nest", 7, 5], ["nest", 3, 7], ["nest", 5, 7]], minKeep: 3, waves: [w(1, "crow", 0, 2), w(2, "gull", 0, 4, "crow", 7, 2), w(3, "screecher", 7, 4), w(4, "gull", 7, 4, "crow", 0, 4)] },
};
MISSIONS.forEach((m, i) => { m.index = i; const { extra, ...rest } = TUNE[m.id] ?? {}; Object.assign(m, rest); if (extra) m.props = [...m.props, ...extra]; if (m.bagHp) for (const q of m.props) if (q[0] === "bag") q[3] = m.bagHp; });
export const MISSION = Object.fromEntries(MISSIONS.map((m) => [m.id, m]));

/** Who a mission can be played with, in the order pigeons join the squad. */
export const ROSTER_ORDER = ["sarge", "doris", "gale", "kevin", "vinnie", "lunch", "plume", "quack"];
export function unlockedAt(mi) {
    const got = ["sarge", "doris"];
    for (let i = 0; i < mi; i++) if (MISSIONS[i].recruit) got.push(MISSIONS[i].recruit);
    return got;
}

/** The strategic map: each node opens the ones listed. Positions are on a 0-1 plan of the whole park. */
export const LINKS = {
    l1: ["l2"], l2: ["l3"], l3: ["l4", "l5"], l4: ["l6"], l5: ["l6"], l6: ["l7"],
    l7: ["b1"], b1: ["b2", "b3"], b2: ["b4"], b3: ["b4"], b4: ["b5"], b5: ["b6"],
    b6: ["f1"], f1: ["f2", "f3"], f2: ["f4"], f3: ["f4"], f4: ["f5"], f5: ["f6"],
    f6: ["r1"], r1: ["r2", "r3"], r2: ["r4"], r3: ["r4"], r4: ["r5"], r5: ["r6"],
    r6: ["x1"], x1: ["x2"], x2: [],
};
