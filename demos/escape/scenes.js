// Twelve carriages and the room at the end. Each scene is a base painting, its lamps, and props that change with the story.
import { BRASS, INK, OX, PAPER, WOOD, WORLD, bench, clock, coat, curtains, dk, door, framed, label, lt, pencil, pendant, rack, sconce, sconceGlow, shelf, shell, suitcase, win, wren } from "./kit.js";
import { hash } from "./paint.js";
const { W, wallTop: T, wallBot: B, H } = WORLD;

const LP = "#ffcf8a";
const std = (flares) => flares.map(([x, y]) => [x, y + 2]);
/** Standard wall sconces with matching lamps, flares and glow. */
function lights(xs, y = 150, i = 1, r = 240, c = LP) {
    return { lamps: xs.map((x) => ({ x, y: y - 26, r, i, c })), sc: (p) => xs.forEach((x) => sconce(p, x, y)), gl: (p) => xs.forEach((x) => sconceGlow(p, x, y)), flares: xs.map((x) => [x, y + 2]) };
}
const ROOM = { c1: lights([66, 540, 780, 1056]), c4: lights([410, 610, 980], 150, 0.5, 200, "#fff0d0"), c7: lights([140, 690, 1020], 160, 0.75, 210, "#ffb878"), c10: lights([160, 600], 150, 0.3, 170, "#c8d8ff") };

export const SCENES = {
    c1: {
        out: "moor", amb: "#5a6490", lamps: ROOM.c1.lamps, windows: [[250, 96, 240, 150], [812, 96, 200, 150]], doorHoles: [[1107, 103, 50, 92]], flares: ROOM.c1.flares, wren: [130, 334, 0], start: 440,
        base(p) {
            shell(p, { wall: "#2f6a68", trim: "#84502a", runner: OX, floor: "#3e2a22" });
            win(p, 250, 96, 240, 150); curtains(p, 250, 96, 240, 150, "#8e3136");
            win(p, 812, 96, 200, 150); curtains(p, 812, 96, 200, 150, "#8e3136");
            bench(p, 226, 288, "#a13a3a"); bench(p, 800, 224, "#a13a3a");
            rack(p, 40, 90, 170); rack(p, 516, 90, 190);
            door(p, 1086); ROOM.c1.sc(p); clock(p, 620, 176, 24);
            framed(p, 96, 210, 54, 38, (q, x, y, w, h) => { q.rect(x, y + h * 0.5, w, h * 0.5, { c: "#4a5a48" }); q.rect(x, y, w, h * 0.5, { c: "#8fa8b8" }); });
        },
        glow: ROOM.c1.gl,
        props: {
            case: { box: [520, 30, 130, 70], show: "!c1.down", paint(p) { suitcase(p, 530, 46, 108, 44, "#8a5a34"); } },
            caseDown: { box: [530, 276, 150, 90], show: "c1.down !c1.open", paint(p) { p.ell(610, 352, 70, 7, { c: "#000000", a: 0.4 }); suitcase(p, 550, 292, 118, 58, "#8a5a34"); } },
            caseOpen: { box: [530, 240, 150, 126], show: "c1.open", paint(p) { p.ell(610, 352, 70, 7, { c: "#000000", a: 0.4 }); p.rr(550, 252, 118, 46, 5, { c: "#6d4326", c2: "#3a2316" }); p.rect(556, 258, 106, 36, { c: "#c5a97c", c2: "#8a7350" }); suitcase(p, 550, 298, 118, 50, "#8a5a34", { handle: false }); } },
            coat: { box: [660, 50, 100, 170], paint(p) { coat(p, 710, 60); } },
            blind: { box: [240, 86, 262, 170], show: "!c1.blind", paint(p) { p.rr(250, 96, 240, 150, 12, { c: "#c2a87a", c2: "#8a7350", m: 0.12, s: 0.3, sd: "h" }); for (let i = 1; i < 9; i++) p.rect(252, 96 + i * 16.5, 236, 1.6, { c: "#6b5638", a: 0.6 }); p.ell(370, 240, 7, 7, { c: BRASS }); } },
            blind2: { box: [802, 86, 222, 170], show: "!c1.blind2", paint(p) { p.rr(812, 96, 200, 150, 12, { c: "#c2a87a", c2: "#8a7350", m: 0.12, s: 0.3, sd: "h" }); for (let i = 1; i < 9; i++) p.rect(814, 96 + i * 16.5, 196, 1.6, { c: "#6b5638", a: 0.6 }); p.ell(912, 240, 7, 7, { c: BRASS }); } },
            note: { box: [1090, 336, 60, 26], show: "!c1.note", paint(p) { p.poly([[1096, 346], [1140, 340], [1146, 356], [1100, 360]], { c: PAPER, c2: "#c9b98e" }); } },
        },
    },
    c2: {
        out: "fields", amb: "#a08a70", lamps: [{ x: 660, y: 120, r: 420, i: 0.75, c: "#ffdc9a" }, { x: 240, y: 180, r: 260, i: 0.45 }], windows: [[450, 62, 440, 124]], doorHoles: [[1107, 103, 50, 92], [39, 103, 50, 92]], flares: [], wren: [670, 196, 1],
        base(p) {
            shell(p, { wall: "#c79a3e", trim: "#4f6f8c", runner: false, floor: "#8a5a34", dado: 288, paper(q) { for (let y = 86; y < 288; y += 34) for (let x = (y % 68 ? 28 : 8); x < W; x += 56) { q.rect(x, y, 20, 8, { c: "#a97a2a", a: 0.6, wob: 0.3 }); q.ell(x + 4, y + 9, 2.4, 2.4, { c: "#a97a2a", a: 0.6 }); q.ell(x + 16, y + 9, 2.4, 2.4, { c: "#a97a2a", a: 0.6 }); } } });
            win(p, 450, 62, 440, 124, { frame: "#3f5f7c", bar: false }); p.rect(668, 62, 5, 124, { c: "#3f5f7c" });
            // The rug, the giant chair, the giant table leg: you are six.
            p.ell(420, 392, 280, 34, { c: "#a13a3a", c2: "#6b2a2e", m: 0.2 }); p.ell(420, 392, 240, 26, { c: "#d8a03c", a: 0.4 }); p.ell(420, 392, 200, 20, { c: "#a13a3a" });
            for (const x of [130, 280]) p.rr(x, 180, 34, 214, 8, { c: "#7a4a26", c2: "#3a2214", s: 0.4, sd: "v" }); p.rr(100, 150, 220, 40, 10, { c: "#8a5a34", c2: "#4a2c18", s: 0.3 }); p.ell(210, 396, 150, 10, { c: "#000", a: 0.3 });
            framed(p, 214, 96, 64, 76, (q, x, y, w, h) => { q.rect(x, y, w, h, { c: "#c4b89a", c2: "#8a8068" }); q.ell(x + w / 2, y + h * 0.42, 10, 11, { c: "#5a5040" }); q.rect(x + w / 2 - 12, y + h * 0.55, 24, 30, { c: "#3a3a44" }); }, { frame: "#3a2416" });
            p.poly([[320, 108], [392, 104], [396, 174], [324, 178]], { c: "#f5edd8" }); p.line([[332, 150], [344, 124], [372, 124], [382, 156], [340, 164]], 2.4, { c: "#3a5ea8" }); p.ell(358, 106, 3, 3, { c: OX });
            // Low table with the model railway.
            p.ell(790, 352, 170, 9, { c: "#000", a: 0.34 }); for (const x of [650, 920]) p.rect(x, 268, 14, 84, { c: "#7a4a26", c2: "#3a2214" }); p.rr(632, 246, 316, 26, 4, { c: "#6b4a2a", c2: "#3a2214" }); p.poly([[640, 200], [940, 200], [948, 248], [632, 248]], { c: "#4f8a5a", c2: "#34603e", m: 0.2 });
            p.ell(790, 224, 120, 16, { c: "#d8dfe6", a: 0.0 }); for (let t = 0; t < 6.28; t += 0.14) { p.ell(790 + Math.cos(t) * 122, 224 + Math.sin(t) * 17, 2.4, 1.4, { c: "#5a3a22" }); } p.ell(698, 214, 13, 10, { c: "#d8dfe6", a: 0.2 });
            p.rect(860, 196, 44, 24, { c: "#b4563e", c2: "#7c3a2c" }); p.poly([[854, 196], [882, 182], [910, 196]], { c: "#4f6f8c" }); p.ell(720, 208, 14, 10, { c: "#3a7f4a" }); p.rr(690, 214, 16, 12, 2, { c: "#3f7f96" });
            // Bricks.
            [[110, 360, "#a13a3a"], [150, 368, "#3a6a8c"], [132, 340, "#d8a03c"], [960, 372, "#3a8a5a"], [1000, 360, "#a13a3a"]].forEach(([x, y, c]) => { p.rr(x, y, 34, 30, 3, { c: lt(c, 0.2), c2: dk(c, 0.6) }); });
            door(p, 1086, { c: "#4f6f8c" }); door(p, 18, { c: "#4f6f8c", hinge: "r" });
        },
        props: {
            chest: { box: [420, 220, 190, 124], show: "!c2.chest", paint(p) { p.ell(515, 342, 92, 8, { c: "#000", a: 0.4 }); p.rr(434, 258, 162, 84, 4, { c: "#a97a48", c2: "#6b4a2a", s: 0.4 }); p.rr(428, 236, 174, 34, 8, { c: "#c19660", c2: "#7a5a34", s: 0.4 }); p.rr(505, 262, 22, 22, 3, { c: BRASS, c2: dk(BRASS, 0.5) }); p.rect(434, 300, 162, 6, { c: "#7c2a26", a: 0.8 }); } },
            chestOpen: { box: [420, 190, 190, 154], show: "c2.chest", paint(p) { p.ell(515, 342, 92, 8, { c: "#000", a: 0.4 }); p.rr(428, 196, 174, 62, 8, { c: "#7a5a34", c2: "#4a3220", s: 0.4 }); p.rect(438, 250, 154, 18, { c: "#2a1c12" }); p.rr(434, 258, 162, 84, 4, { c: "#a97a48", c2: "#6b4a2a", s: 0.4 }); p.ell(476, 252, 16, 12, { c: "#a97a48" }); p.rr(510, 244, 26, 18, 3, { c: "#a13a3a" }); } },
            engine: { box: [720, 212, 90, 44], paint(p) { p.rr(734, 224, 54, 18, 4, { c: "#a13a3a", c2: "#6b2a2e" }); p.rect(778, 214, 12, 28, { c: "#7c2a26" }); p.rect(738, 214, 7, 12, { c: "#2a1c20" }); for (const x of [742, 758, 776]) p.ell(x, 244, 6, 6, { c: "#2a1c20" }); } },
            drawer: { box: [852, 214, 60, 28], show: "c2.ran", paint(p) { p.rect(862, 218, 40, 12, { c: "#3a2416", c2: "#2a1c12" }); p.rect(858, 226, 48, 10, { c: "#a97a48" }); } },
            arm: { box: [1048, 150, 54, 60], show: "!c2.blown", paint(p) { p.rect(1060, 152, 6, 60, { c: "#3a2416" }); p.rect(1050, 162, 48, 12, { c: "#a13a3a" }); p.rect(1086, 162, 5, 12, { c: "#fff" }); } },
            armDown: { box: [1048, 150, 54, 70], show: "c2.blown", paint(p) { p.rect(1060, 152, 6, 60, { c: "#3a2416" }); p.poly([[1058, 160], [1096, 200], [1088, 208], [1050, 170]], { c: "#a13a3a" }); } },
        },
    },
    c3: {
        out: "town", amb: "#6a7084", lamps: [{ x: 210, y: 90, r: 340, i: 1.1 }, { x: 620, y: 90, r: 300, i: 0.8 }], windows: [[640, 66, 170, 46]], doorHoles: [[39, 103, 50, 92]], flares: [[210, 92], [620, 92]], flare: "#ffa050", wren: [770, 324, 0], brush: 3.6,
        base(p) {
            shell(p, { wall: "#4e5a52", trim: "#4a3626", runner: false, floor: "#4a3a2c", ceil: "#7a7464", dado: 300, paper(q) { for (let x = 0; x < W; x += 66) q.rect(x, T + 6, 3, 300, { c: "#2a322e", a: 0.8, wob: 0.8 }); for (let i = 0; i < 40; i++) q.ell(hash(i, 2) * W, 80 + hash(2, i) * 200, 2.4, 2.4, { c: "#2a322e", a: 0.7 }); } });
            win(p, 640, 66, 170, 46, { frame: "#3a2c20", bar: false, latch: false, r: 3 });
            for (const x of [210, 620]) { p.line([[x, 30], [x, 70]], 2, { c: "#2a2018" }); p.poly([[x - 26, 92], [x - 8, 70], [x + 8, 70], [x + 26, 92]], { c: "#3a4048", c2: "#23262c" }); p.ell(x, 94, 9, 7, { c: "#fff0c2" }); }
            p.rr(150, 150, 70, 92, 3, { c: "#6b4a2a", c2: "#3a2214" }); p.rect(156, 160, 58, 76, { c: PAPER, c2: "#c9b98e" }); p.rr(172, 146, 26, 12, 3, { c: "#a0a6ac" }); for (let i = 0; i < 6; i++) p.rect(162, 172 + i * 10, 46 - (i % 3) * 8, 1.8, { c: INK, a: 0.7 });
            // Platform scale.
            p.ell(355, 350, 96, 8, { c: "#000", a: 0.4 }); p.rect(272, 306, 170, 40, { c: "#3a3f3a", c2: "#1e2220", m: 0.2 }); p.rect(300, 212, 10, 96, { c: "#5a5f5a" }); p.rect(300, 208, 120, 7, { c: BRASS, c2: dk(BRASS, 0.5) }); p.rect(260, 300, 190, 10, { c: "#7a6a4a" }); suitcase(p, 330, 266, 80, 36, "#41688c");
            // The wire cage.
            p.rect(490, 96, 130, 244, { c: "#2a221a", c2: "#14100c" }); for (let x = 494; x < 620; x += 11) p.rect(x, 96, 1.5, 244, { c: "#8a8a80", a: 0.8 }); for (let y = 100; y < 340; y += 11) p.rect(490, y, 130, 1.5, { c: "#8a8a80", a: 0.8 }); p.rect(486, 92, 138, 7, { c: "#3a3f44" }); p.rect(486, 336, 138, 7, { c: "#3a3f44" });
            // Trunk.
            p.ell(735, 350, 98, 8, { c: "#000", a: 0.4 }); suitcase(p, 650, 246, 170, 100, "#5a3a22"); p.poly([[805, 206], [850, 214], [846, 246], [800, 238]], { c: "#e9d9b0" }); p.line([[812, 228], [802, 252]], 1, { c: "#ccc" });
            // Piles of luggage in the gloom.
            suitcase(p, 880, 262, 110, 84, "#6d4a2c"); suitcase(p, 960, 280, 90, 66, "#3f5a4a"); suitcase(p, 905, 214, 80, 48, "#7c3a2c");
            door(p, 1086, { c: "#3a2c20", hole: false }); door(p, 18, { c: "#3a2c20", hinge: "r" });
            for (let i = 0; i < 3; i++) p.rect(1100, 150 + i * 30, 64, 8, { c: "#6d7680", c2: "#3a4048" });
        },
        props: {
            cageLamp: { box: [520, 180, 70, 90], show: "!p:c3scale", paint(p) { p.line([[554, 186], [554, 200]], 2, { c: "#6d7680" }); p.rr(536, 200, 36, 12, 3, { c: "#6d7680" }); p.rect(540, 212, 28, 34, { c: "#8a9aa8" }); p.rr(534, 246, 40, 10, 3, { c: "#6d7680" }); } },
            cageOpen: { box: [486, 92, 138, 252], show: "p:c3scale", paint(p) { p.rect(490, 96, 130, 244, { c: "#3a2c1c", c2: "#20180f" }); p.rr(528, 180, 56, 40, 4, { c: BRASS, c2: dk(BRASS, 0.5) }); for (const y of [192, 208]) p.rect(538, y, 36, 3, { c: "#3a2410" }); } },
            trunkOpen: { box: [640, 200, 190, 150], show: "c3.trunk", paint(p) { p.rr(654, 206, 162, 52, 5, { c: "#3a2416" }); p.rect(660, 244, 150, 16, { c: "#d8c080", m: 0.3 }); } },
            dark: { box: [850, 0, 350, 440], show: "!c3.lit", paint(p) { p.pool(1120, 200, 340, 520, "#05060c", 1, "over"); p.rect(960, 0, 260, 440, { c: "#05060c", a: 0.96 }); } },
            lit: { box: [930, 40, 130, 120], show: "c3.lit", paint(p) { p.line([[990, 40], [990, 74]], 2, { c: "#2a2018" }); p.rr(978, 74, 24, 8, 2, { c: "#6d7680" }); p.rect(980, 82, 20, 26, { c: "#ffd27a" }); p.rr(976, 108, 28, 7, 2, { c: "#6d7680" }); } },
        },
    },
    c4: {
        out: "river", amb: "#a8acb8", lamps: [...ROOM.c4.lamps, { x: 260, y: 170, r: 320, i: 0.5, c: "#ffe6c0" }, { x: 800, y: 170, r: 340, i: 0.5, c: "#ffe6c0" }], windows: [[150, 96, 220, 150], [650, 96, 290, 150]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: ROOM.c4.flares, flare: "#ffe0b0", wren: [262, 248, 0],
        base(p) {
            shell(p, { wall: "#8faab0", trim: "#a08458", runner: "#3f5a7a", floor: "#6d6052", ceil: "#efe4c9" });
            win(p, 150, 96, 220, 150); win(p, 650, 96, 290, 150); ROOM.c4.sc(p);
            bench(p, 128, 262, "#4a6a8c", { top: 256 });
            for (const [i, n] of [3, 5, 8, 12].entries()) { const x = 636 + i * 80; bench(p, x, 72, "#4a6a8c", { top: 262 }); p.rr(x + 22, 250, 30, 16, 2, { c: BRASS, c2: dk(BRASS, 0.5) }); }
            // Lost Property cupboard.
            p.ell(505, 342, 74, 7, { c: "#000", a: 0.4 }); p.rr(440, 110, 130, 232, 4, { c: "#7a4a26", c2: "#3a2214", s: 0.4, sd: "v" }); p.rect(450, 124, 110, 26, { c: PAPER }); for (let i = 0; i < 2; i++) { p.rect(452 + i * 56, 160, 50, 170, { c: "#8a5a34", c2: "#4a2c18", s: 0.5, sd: "v" }); } p.ell(500, 240, 4, 4, { c: BRASS }); p.ell(512, 240, 4, 4, { c: BRASS });
            door(p, 1086, { c: "#6d5a3c" }); door(p, 18, { c: "#6d5a3c", hinge: "r" });
        },
        props: {
            fog: { box: [146, 92, 228, 158], show: "!p:c4fog", paint(p) { p.rr(150, 96, 220, 150, 12, { c: "#dfe5e8", c2: "#c4ced4", a: 0.9, m: 0.14 }); } },
            open: { box: [440, 110, 130, 232], show: "p:c4dial", paint(p) { p.rr(446, 150, 118, 186, 3, { c: "#2a1c12" }); for (const y of [204, 262]) p.rect(446, y, 118, 5, { c: "#6b4a2a" }); p.ell(480, 196, 22, 8, { c: "#34405a" }); p.rect(500, 176, 10, 28, { c: "#2a2a30" }); p.rr(462, 236, 44, 26, 2, { c: "#7c2a26" }); p.ell(530, 256, 12, 6, { c: "#3a5ea8" }); } },
            seat12: { box: [860, 240, 96, 60], show: "p:c4seats", paint(p) { p.rr(870, 252, 64, 34, 3, { c: "#2a1c20" }); p.poly([[884, 258], [920, 256], [918, 280], [886, 282]], { c: PAPER }); } },
        },
    },
    c5: {
        out: "orchard", amb: "#7a6480", lamps: [{ x: 300, y: 110, r: 240, i: 0.9 }, { x: 480, y: 215, r: 240, i: 0.55 }, { x: 720, y: 96, r: 240, i: 0.8 }, { x: 960, y: 90, r: 220, i: 0.7 }], windows: [[330, 88, 300, 120]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: [[300, 96], [660, 96], [960, 96]], wren: [596, 210, 1],
        base(p) {
            shell(p, { wall: "#6e2230", trim: "#6b4a2a", runner: "#2f4a48", floor: "#3a2820", ceil: "#d4b878", paper(q) { for (let x = 16; x < W; x += 44) for (let y = 74; y < 256; y += 44) { q.ell(x + (y % 88 ? 22 : 0), y, 8, 12, { c: "#8a3040", a: 0.7 }); q.ell(x + (y % 88 ? 22 : 0), y, 3, 3, { c: "#b08a4a", a: 0.8 }); } } });
            win(p, 330, 88, 300, 120, { brass: "#d9ae5a" }); curtains(p, 330, 88, 300, 110, "#a9843a");
            for (const x of [300, 660, 960]) pendant(p, x, 92);
            // Side table with menu.
            p.rect(236, 262, 10, 82, { c: "#3a2214" }); p.rr(196, 256, 90, 10, 3, { c: "#7a4a26" }); p.poly([[210, 198], [266, 198], [270, 256], [206, 256]], { c: PAPER, c2: "#c9b98e" }); for (let i = 0; i < 5; i++) p.rect(220, 210 + i * 8, 34, 1.5, { c: INK, a: 0.6 });
            // Long table.
            p.ell(480, 354, 190, 9, { c: "#000", a: 0.4 }); for (const x of [340, 610]) p.rect(x, 290, 12, 62, { c: "#3a2214" }); p.poly([[318, 240], [642, 240], [660, 312], [300, 312]], { c: "#f2e8d4", c2: "#cdbf9e", s: 0.2, sd: "v", m: 0.08 });
            for (let i = 0; i < 3; i++) for (const y of [254, 290]) { const x = 368 + i * 112; p.ell(x, y, 26, 8, { c: "#fff", c2: "#d8cfbc" }); p.ell(x, y, 16, 5, { c: "#e8dfcc" }); }
            for (const x of [410, 550]) { p.rect(x - 2, 216, 4, 36, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(x, 252, 10, 3, { c: BRASS }); p.rect(x - 2.5, 202, 5, 16, { c: "#fff8e8" }); p.ell(x, 199, 2.6, 5, { c: "#ffe9a0" }); }
            p.ell(480, 264, 24, 6, { c: "#c9c0ae" }); p.rect(477, 226, 6, 38, { c: "#c9c0ae" }); p.ell(480, 226, 44, 7, { c: "#efe8da" });
            // Service bells.
            p.rr(700, 120, 110, 76, 4, { c: "#7a4a26", c2: "#3a2214", s: 0.4 }); for (let i = 0; i < 4; i++) { p.poly([[716 + i * 26, 142], [726 + i * 26, 142], [732 + i * 26, 164], [710 + i * 26, 164]], { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(721 + i * 26, 168, 3, 3, { c: BRASS }); }
            // Hatch frame.
            p.rr(826, 106, 168, 138, 4, { c: "#7a4a26", c2: "#3a2214" }); p.rect(836, 116, 148, 118, { c: "#1a100c" }); 
            door(p, 1086, { c: "#4a2c1e" }); door(p, 18, { c: "#4a2c1e", hinge: "r" }); p.ell(1132, 250, 11, 11, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(1132, 250, 6, 6, { c: "#2a1c12" });
        },
        glow(p) { for (const x of [300, 660, 960]) pendant(p, x, 92); for (const x of [410, 550]) p.ell(x, 199, 3, 6, { c: "#fff4c0" }); },
        props: {
            shutter: { box: [834, 114, 152, 122], show: "!p:c5bells", paint(p) { p.rect(836, 116, 148, 118, { c: "#7a4a26", c2: "#4a2c18", s: 0.4, sd: "h" }); for (let y = 122; y < 232; y += 12) p.rect(838, y, 144, 2, { c: "#2a1c12", a: 0.7 }); } },
            plate: { box: [860, 150, 110, 84], show: "p:c5bells", paint(p) { p.ell(915, 222, 44, 9, { c: "#efe8da" }); p.poly([[892, 164], [940, 158], [944, 216], [896, 220]], { c: "#d4c8a8" }); } },
            box: { box: [452, 186, 56, 40], show: "p:c5seat !p:c5box", paint(p) { p.rr(462, 196, 36, 26, 3, { c: "#5a1e38", c2: "#2a0e1c" }); p.rect(462, 206, 36, 2, { c: BRASS }); } },
            ringset: { box: [1116, 234, 34, 34], show: "c5.ring", paint(p) { p.ell(1132, 250, 7, 7, { c: "#ffd878" }); p.ell(1132, 250, 4, 4, { c: "#2a1c12" }); } },
        },
    },
    c6: {
        out: "rain", amb: "#646c7c", lamps: [{ x: 300, y: 70, r: 330, i: 0.9 }, { x: 720, y: 80, r: 300, i: 0.85 }, { x: 960, y: 100, r: 220, i: 0.6 }], windows: [[676, 92, 150, 88]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: [[300, 90], [720, 90]], wren: [420, 300, 1],
        base(p) {
            shell(p, { wall: "#556050", trim: "#5a4632", runner: false, floor: "#4a4036", ceil: "#a8a088" });
            win(p, 676, 92, 150, 88, { r: 6, bar: false });
            for (const x of [300, 720]) { p.line([[x, 30], [x, 72]], 2, { c: "#2a2018" }); p.poly([[x - 28, 92], [x - 6, 72], [x + 6, 72], [x + 28, 92]], { c: "#2f4a3a", c2: "#1a2a20" }); p.ell(x, 94, 9, 6, { c: "#fff0c2" }); }
            p.rr(146, 110, 110, 90, 2, { c: PAPER, c2: "#c9b98e" }); p.line([[156, 180], [178, 150], [202, 160], [222, 130], [246, 124]], 2.4, { c: OX }); for (const q of [[156, 180], [178, 150], [202, 160], [222, 130], [246, 124]]) p.ell(q[0], q[1], 4, 4, { c: INK });
            // Pigeonholes.
            p.rect(276, 82, 258, 208, { c: "#6b4a2a", c2: "#3a2214" }); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 284 + c * 41, y = 90 + r * 48; p.rect(x, y, 36, 42, { c: "#17100a" }); if (hash(r * 7, c) > 0.45) p.poly([[x + 4, y + 42], [x + 8, y + 22], [x + 32, y + 24], [x + 32, y + 42]], { c: PAPER, c2: "#b4a47c" }); }
            p.ell(405, 352, 150, 8, { c: "#000", a: 0.3 }); p.rect(290, 290, 12, 62, { c: "#3a2214" }); p.rect(510, 290, 12, 62, { c: "#3a2214" });
            for (let i = 0; i < 3; i++) p.ell(350 + i * 60, 322, 26, 24, { c: "#a89a78", c2: "#6d6248", m: 0.3 });
            p.rect(560, 110, 80, 96, { c: PAPER, c2: "#c9b98e" }); p.rect(568, 120, 64, 3, { c: OX }); for (let i = 0; i < 8; i++) p.rect(568, 132 + i * 8, 40 + (i % 3) * 8, 1.5, { c: INK, a: 0.6 });
            p.rect(850, 110, 90, 100, { c: PAPER, c2: "#c9b98e" }); for (let i = 0; i < 8; i++) p.rect(858, 122 + i * 10, 74, 1.5, { c: INK, a: 0.6 });
            // Desk.
            p.ell(800, 352, 190, 8, { c: "#000", a: 0.35 }); p.rect(636, 278, 330, 14, { c: "#7a4a26", c2: "#3a2214" }); p.rect(790, 292, 170, 54, { c: "#6b3f22", c2: "#2a1c12", s: 0.4 }); p.rect(644, 292, 14, 56, { c: "#3a2214" }); p.rr(848, 300, 54, 34, 3, { c: "#7a4a26" }); p.ell(875, 317, 11, 11, { c: BRASS, c2: dk(BRASS, 0.5) });
            p.rr(650, 262, 118, 16, 3, { c: "#3a2c1c" }); p.rect(668, 232, 20, 30, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(678, 228, 14, 8, { c: "#2a2a30" }); p.line([[700, 258], [752, 244]], 7, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(754, 240, 8, 8, { c: "#1a1420" });
            door(p, 1086, { c: "#3f4a40" }); door(p, 18, { c: "#3f4a40", hinge: "r" });
            p.rr(1100, 240, 62, 40, 3, { c: "#6d7680", c2: "#3a4048" }); p.ell(1131, 260, 13, 13, { c: "#f4e9cf" });
        },
        glow(p) { for (const x of [300, 720]) p.ell(x, 94, 10, 6, { c: "#fff4c0" }); },
        props: {
            cleared: { box: [282, 88, 244, 196], show: "p:c6sort", paint(p) { for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 284 + c * 41, y = 90 + r * 48; p.rect(x, y, 36, 42, { c: "#17100a" }); if ((r * 6 + c) % 2) p.rect(x + 6, y + 26, 26, 16, { c: PAPER, c2: "#b4a47c" }); } } },
            drawer: { box: [840, 296, 80, 56], show: "c6.drawer", paint(p) { p.rect(844, 312, 62, 34, { c: "#7a4a26", c2: "#3a2214" }); p.rect(850, 302, 50, 12, { c: "#14100c" }); } },
        },
    },
    c7: {
        out: "stars", amb: "#5c64a0", lamps: ROOM.c7.lamps, windows: [[872, 110, 120, 120]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: ROOM.c7.flares, flare: "#ff9860", wren: [720, 260, 0],
        base(p) {
            shell(p, { wall: "#27346a", trim: "#5a3a2a", runner: "#6e3a56", floor: "#2e2230", ceil: "#47507a", paper(q) { for (let i = 0; i < 90; i++) { const x = hash(i, 3) * W, y = 70 + hash(3, i) * 190, r = 0.8 + hash(i, 6) * 1.7; q.ell(x, y, r, r, { c: "#e8dcaa", a: 0.7, wob: 0 }); } } });
            win(p, 872, 110, 120, 120, { r: 58, bar: false, latch: false, frame: BRASS }); ROOM.c7.sc(p);
            p.poly([[176, 116], [244, 112], [246, 174], [178, 178]], { c: "#f5edd8" }); wren(p, 212, 148, 0.66);
            // Bunks.
            p.ell(390, 354, 150, 9, { c: "#000", a: 0.4 }); for (const x of [270, 498]) p.rect(x, 96, 12, 256, { c: "#7a4a26", c2: "#3a2214" }); p.rr(270, 120, 240, 48, 5, { c: "#a13a4a", c2: "#5a2030" }); p.rect(266, 166, 248, 10, { c: "#7a4a26" }); p.ell(320, 126, 32, 13, { c: "#efe4c9", c2: "#c9b98e" });
            p.rect(282, 176, 216, 74, { c: "#14122a" }); p.rr(270, 262, 240, 70, 5, { c: "#c9a23a", c2: "#7a5a20", m: 0.2 }); p.rect(266, 326, 248, 12, { c: "#7a4a26" });
            for (let i = 0; i < 6; i++) p.line([[440 + i * 7, 96], [442 + i * 7, 124]], 1.2, { c: "#8a3a4a", a: 0.8 }); p.line([[496, 100], [506, 330]], 2.5, { c: BRASS, a: 0.0 });
            for (let i = 0; i < 6; i++) p.rect(504, 130 + i * 34, 28, 5, { c: BRASS, c2: dk(BRASS, 0.5) });
            // Shoes.
            p.ell(580, 354, 28, 5, { c: "#000", a: 0.4 }); p.rr(556, 338, 22, 14, 6, { c: "#a13a3a" }); p.rr(582, 340, 22, 14, 6, { c: "#a13a3a" });
            shelf(p, 550, 286, 130); shelf(p, 712, 226, 120);
            p.rr(1020, 200, 0, 0, 0, { c: "#000" });
            door(p, 1086, { c: "#3a3a5a" }); door(p, 18, { c: "#3a3a5a", hinge: "r" });
        },
        glow: ROOM.c7.gl,
        props: {
            pillow: { box: [290, 240, 150, 40], show: "!c7.sheet", paint(p) { p.ell(350, 262, 50, 16, { c: "#efe4c9", c2: "#c9b98e" }); } },
            pillow2: { box: [290, 240, 150, 40], show: "c7.sheet", paint(p) { p.ell(350, 262, 50, 16, { c: "#efe4c9", c2: "#c9b98e" }); p.ell(352, 262, 18, 7, { c: "#c0b08a" }); } },
            mbox: { box: [560, 226, 110, 62], show: "!p:c7pins", paint(p) { p.rr(574, 246, 82, 40, 3, { c: "#7c3a1c", c2: "#3a1c0c", s: 0.4 }); p.rr(570, 238, 90, 12, 3, { c: "#a05a2a", c2: "#5a2c10" }); p.ell(662, 268, 5, 5, { c: BRASS }); } },
            mboxOpen: { box: [560, 190, 110, 98], show: "p:c7pins", paint(p) { p.rr(574, 246, 82, 40, 3, { c: "#7c3a1c", c2: "#3a1c0c", s: 0.4 }); p.poly([[572, 246], [656, 246], [652, 200], [576, 200]], { c: "#a05a2a", c2: "#5a2c10" }); wren(p, 616, 234, 0.44); } },
            lamp: { box: [730, 126, 84, 102], paint(p) { p.poly([[748, 222], [796, 222], [790, 150], [754, 150]], { c: "#7a8088", c2: "#3a4048" }); p.poly([[750, 150], [794, 150], [772, 130]], { c: "#a0a6ac" }); for (let i = 0; i < 14; i++) p.ell(758 + hash(i, 1) * 28, 158 + hash(1, i) * 58, 1.4, 1.4, { c: "#ffe9a0" }); } },
            stars: { box: [640, 60, 400, 120], show: "p:c7stars", paint(p) { for (let i = 0; i < 40; i++) p.ell(650 + hash(i, 2) * 380, 66 + hash(2, i) * 100, 1.4, 1.4, { c: "#ffe9a0" }); } },
        },
    },
    c8: {
        out: "sea", amb: "#a08a7a", lamps: [{ x: 600, y: 150, r: 620, i: 0.75, c: "#ffc890" }], windows: [[120, 66, 300, 196], [440, 66, 300, 196], [760, 66, 300, 196]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: [], wren: [470, 256, 1],
        base(p) {
            shell(p, { wall: "#c9a878", trim: "#8a5a34", runner: "#2f5a64", floor: "#6b4a34", ceil: "#efd9a8", dado: 276 });
            for (const x of [120, 440, 760]) win(p, x, 66, 300, 196, { bar: false, r: 8, latch: false, brass: BRASS });
            // Telescope on a tripod.
            p.ell(270, 352, 70, 8, { c: "#000", a: 0.4 }); for (const dx of [-50, 0, 50]) p.line([[270, 226], [270 + dx, 350]], 6, { c: "#5a3a22" }); p.line([[210, 188], [340, 214]], [22, 12], { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(342, 214, 8, 11, { c: "#3a2410" }); p.ell(270, 222, 10, 10, { c: dk(BRASS, 0.6) });
            // Low table.
            p.ell(560, 352, 180, 8, { c: "#000", a: 0.35 }); p.rr(410, 322, 300, 12, 3, { c: "#a97a48", c2: "#5a3a22" }); for (const x of [430, 680]) p.rect(x, 334, 10, 18, { c: "#5a3a22" });
            p.rect(424, 286, 96, 36, { c: "#3f6a7a", c2: "#26444e" }); p.rect(430, 290, 84, 30, { c: PAPER, a: 0.3 }); wren(p, 476, 304, 0.34);
            p.rr(596, 282, 96, 40, 6, { c: "#c0432e", c2: "#7c2a26" }); p.ell(644, 300, 30, 12, { c: "#f2d898" }); p.rect(640, 288, 8, 22, { c: "#efe4c9" });
            bench(p, 760, 280, "#2f6a78", { top: 266 });
            door(p, 1086, { c: "#6b4a2a" }); door(p, 18, { c: "#6b4a2a", hinge: "r" });
        },
        props: {},
    },
    c9: {
        out: "junction", amb: "#6a6c84", lamps: [{ x: 300, y: 70, r: 300, i: 0.8 }, { x: 760, y: 70, r: 340, i: 0.95 }, { x: 80, y: 280, r: 150, i: 0.5, c: "#ff8a40" }], windows: [[310, 70, 320, 100], [660, 70, 380, 100]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: [[300, 90], [760, 90]], wren: [960, 318, 1],
        base(p) {
            shell(p, { wall: "#7a6444", trim: "#4f5a4a", runner: false, floor: "#5a4632", ceil: "#c9b98e", dado: 300 });
            win(p, 310, 70, 320, 100, { bar: false, r: 3 }); win(p, 660, 70, 380, 100, { bar: false, r: 3 }); for (const x of [420, 530, 790, 910]) p.rect(x, 70, 4, 100, { c: WOOD });
            for (const x of [300, 760]) { p.line([[x, 30], [x, 62]], 2, { c: "#2a2018" }); p.poly([[x - 24, 86], [x - 6, 62], [x + 6, 62], [x + 24, 86]], { c: "#3a3f3a" }); p.ell(x, 88, 8, 6, { c: "#fff0c2" }); }
            p.rect(150, 100, 76, 96, { c: PAPER, c2: "#c9b98e" }); for (let i = 0; i < 8; i++) p.rect(158, 112 + i * 10, 58, 1.5, { c: INK, a: 0.6 });
            shelf(p, 240, 276, 110); p.rr(252, 240, 74, 36, 3, { c: "#7c2a26", c2: "#4a1a18" }); p.rect(258, 246, 62, 3, { c: BRASS });
            // Locker.
            p.ell(415, 342, 62, 7, { c: "#000", a: 0.4 }); p.rr(360, 110, 110, 232, 3, { c: "#4a5a4a", c2: "#26302a" }); for (let i = 0; i < 4; i++) p.rect(385, 126 + i * 8, 60, 3, { c: "#14181a" }); p.rr(440, 214, 14, 34, 3, { c: "#a0a6ac" });
            // Bell on a shelf.
            shelf(p, 496, 206, 120); p.rr(520, 150, 70, 56, 4, { c: "#5a3a22", c2: "#2a1c12" }); p.ell(555, 164, 18, 16, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(555, 192, 6, 6, { c: "#a83a34" });
            // The lever frame.
            p.rect(620, 300, 270, 44, { c: "#3a2c1c", c2: "#1a140c" }); for (let i = 0; i < 6; i++) { const x = 640 + i * 46, c = ["#d8b84a", "#b03a3a", "#2a2a30", "#3f6aa8", "#b03a3a", "#efe4c9"][i]; p.line([[x, 306], [x + (i === 4 ? -14 : 0), 206]], 7, { c }); p.rr(x - 9 + (i === 4 ? -14 : 0), 196, 18, 22, 5, { c: "#cfd4da" }); }
            p.rr(910, 110, 110, 60, 3, { c: BRASS, c2: dk(BRASS, 0.5) });
            // Stove.
            p.ell(112, 352, 50, 7, { c: "#000", a: 0.5 }); 
            door(p, 1086, { c: "#4f5a4a" }); door(p, 18, { c: "#4f5a4a", hinge: "r" });
        },
        glow(p) { for (const x of [300, 760]) p.ell(x, 88, 9, 6, { c: "#fff4c0" }); },
        props: {
            pass: { box: [320, 80, 700, 86], show: "p:c9levers", paint(p) { for (let i = 0; i < 6; i++) { p.rect(344 + i * 110, 124, 94, 30, { c: "#1a1626", a: 0.9 }); for (let w = 0; w < 4; w++) p.rect(352 + i * 110 + w * 20, 130, 14, 14, { c: "#ffd27a", wob: 0 }); } } },
        },
    },
    c10: {
        out: "snow", amb: "#7c8cb4", lamps: ROOM.c10.lamps, windows: [[320, 96, 240, 150], [880, 96, 160, 150]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: ROOM.c10.flares, flare: "#b8ccff", wren: [950, 250, 1],
        base(p) {
            shell(p, { wall: "#3f5a7a", trim: "#58627a", runner: "#4a5a80", floor: "#3a4258", ceil: "#c8d4e4" });
            win(p, 320, 96, 240, 150, { frame: "#58627a" }); win(p, 880, 96, 160, 150, { frame: "#58627a" }); ROOM.c10.sc(p);
            bench(p, 128, 180, "#54688c", { top: 256 }); bench(p, 870, 180, "#54688c", { top: 256 });
            p.poly([[190, 238], [276, 234], [280, 272], [194, 276]], { c: PAPER, c2: "#c9b98e" });
            // Radiator and valves.
            p.rr(620, 280, 134, 64, 4, { c: "#6d7a90", c2: "#3a4258" }); for (let i = 0; i < 8; i++) p.rect(630 + i * 15, 286, 8, 54, { c: "#8a98ae", c2: "#4a5670" }); p.line([[684, 280], [684, 200]], 8, { c: "#6d7680" }); for (let i = 0; i < 3; i++) { p.ell(646 + i * 38, 216, 15, 15, { c: "#a83a34", c2: "#6b2a26" }); p.ell(646 + i * 38, 216, 5, 5, { c: BRASS }); }
            // The little table, with the shape of a watch worn into it.
            p.ell(850, 352, 40, 6, { c: "#000", a: 0.4 }); p.rect(846, 270, 9, 82, { c: "#58627a" }); p.ell(850, 266, 44, 11, { c: "#8a98ae", c2: "#58627a" }); p.ell(850, 264, 12, 4, { c: "#3a4258" });
            for (let i = 0; i < 26; i++) { const x = hash(i, 6) * W; p.poly([[x, 56], [x + 7, 56], [x + 3, 66 + hash(6, i) * 22]], { c: "#e4f0fb", a: 0.8 }); }
            door(p, 1086, { c: "#465470" }); door(p, 18, { c: "#465470", hinge: "r" });
        },
        glow: ROOM.c10.gl,
        props: {
            frost1: { box: [316, 92, 248, 158], show: "!p:c10wipe", paint(p) { p.rr(320, 96, 240, 150, 12, { c: "#e4eef8", c2: "#b8cce2", a: 0.96, m: 0.2 }); } },
            frost2: { box: [876, 92, 168, 158], show: "!p:c10valves", paint(p) { p.rr(880, 96, 160, 150, 12, { c: "#e4eef8", c2: "#b8cce2", a: 0.94, m: 0.2 }); } },
            ice: { box: [1076, 180, 100, 70], show: "!c10.thaw", paint(p) { p.ell(1138, 216, 36, 30, { c: "#d8ecfa", c2: "#a0c4e0", a: 0.92 }); } },
            watch: { box: [826, 244, 48, 30], show: "c10.left", paint(p) { p.ell(850, 260, 12, 5, { c: BRASS, c2: dk(BRASS, 0.5) }); p.ell(850, 260, 8, 3.2, { c: "#f4e9cf" }); } },
        },
    },
    c11: {
        out: "fog", amb: "#b4b0a4", lamps: [{ x: 600, y: 120, r: 620, i: 0.5, c: "#fff4dc" }], windows: [[520, 86, 110, 110]], doorHoles: [[39, 103, 50, 92], [1107, 103, 50, 92]], flares: [], brush: 3, wren: [940, 326, 1],
        base(p) {
            shell(p, { wall: "#d4d0c4", trim: "#b8b2a2", runner: false, floor: "#b4ae9e", ceil: "#e8e4d8", dado: 300 });
            win(p, 520, 86, 110, 110, { frame: "#b8b2a2", bar: false, latch: false, brass: "#b8b2a2" });
            // Labels on everything. Her writing.
            const labs = [[540, 208], [60, 214], [200, 90], [960, 130], [930, 254], [1094, 72], [28, 72], [480, 318]]; labs.forEach(([x, y], i) => label(p, x, y, 66, 20, (i % 3 - 1) * 0.06));
            p.rect(160, 110, 110, 120, { c: "#f4f0e4" }); for (let i = 0; i < 9; i++) p.rect(172, 124 + i * 10, 84, 1.4, { c: INK, a: 0.4 });
            p.rr(296, 92, 158, 158, 6, { c: "#c8c4b6" }); p.rect(304, 100, 142, 142, { c: "#f4f0e4" }); pencil(p, Array.from({ length: 25 }, (_, i) => [375 + Math.cos(i / 24 * 6.28) * 58, 171 + Math.sin(i / 24 * 6.28) * 58]));
            p.ell(545, 322, 90, 7, { c: "#000", a: 0.16 }); p.rect(470, 300, 150, 10, { c: "#a0a6ac" }); for (const x of [486, 590]) p.rect(x, 308, 8, 40, { c: "#8a8a80" }); p.rr(486, 270, 118, 28, 4, { c: "#d8dcdf", c2: "#a0a6ac" });
            shelf(p, 650, 216, 230, "#a89c84");
            p.rr(650, 240, 106, 102, 3, { c: "#efece2", c2: "#c4c0b4" }); p.poly([[668, 256], [712, 252], [716, 296], [670, 300]], { c: "#fff8c8" }); p.rect(644, 342, 118, 3, { c: "#000", a: 0.2 });
            p.rr(770, 256, 116, 80, 8, { c: "#c7a878", c2: "#8a7350" }); p.rect(770, 280, 116, 5, { c: "#6b5638" });
            door(p, 1086, { c: "#b8b2a2" }); door(p, 18, { c: "#b8b2a2", hinge: "r" });
        },
        props: {
            objs: { box: [660, 150, 214, 66], paint(p) { p.rr(670, 172, 40, 44, 4, { c: "#c7a878", c2: "#8a7350" }); p.ell(740, 208, 26, 6, { c: "#44506a" }); p.ell(740, 196, 15, 13, { c: "#566480", c2: "#34405a" }); p.ell(794, 196, 19, 19, { c: "#a0a6ac", c2: "#5a6068" }); p.line([[810, 190], [824, 180]], 5, { c: "#a0a6ac" }); p.rr(838, 170, 30, 46, 3, { c: "#b4563e", c2: "#7c3a2c" }); } },
        },
    },
    c12: {
        out: "blank", amb: "#ffffff", lamps: [], windows: [[160, 96, 80, 110], [960, 96, 80, 110]], doorHoles: [[39, 103, 50, 92]], flares: [[335, 118]], raw: true, flare: "#ffd9a0", wren: [560, 330, 0],
        base(p) {
            p.rect(-8, -8, W + 16, H + 16, { c: "#f0ebde", c2: "#e4dece", m: 0.05, s: 0.02, wob: 0 });
            pencil(p, [[0, T], [W, T]]); pencil(p, [[0, B], [W, B]]); pencil(p, [[0, 262], [W, 262]], "#a09a8c", 1);
            for (let i = -12; i < 13; i += 3) pencil(p, [[600 + i * 60, B], [600 + i * 104, H]], "#a09a8c", 1);
            for (const w of [[160, 96], [960, 96]]) { p.rr(w[0], w[1], 80, 110, 8, { blend: "erase", wob: 0 }); pencil(p, [[w[0], w[1]], [w[0] + 80, w[1]], [w[0] + 80, w[1] + 110], [w[0], w[1] + 110], [w[0], w[1]]]); }
            // Only the lamp is finished. It's the last thing left.
            p.line([[335, 0], [335, 96]], 2, { c: "#3a2c1c" }); p.poly([[313, 96], [357, 96], [376, 136], [294, 136]], { c: "#ffe2a0", c2: "#f4a24a", m: 0.1 }); p.ell(335, 140, 10, 6, { c: "#fff6da" });
            // Destination board, blank.
            p.rr(680, 96, 240, 140, 5, { c: "#2a2e36", c2: "#14161c" }); for (const x of [700, 754, 808, 862]) p.rect(x, 124, 46, 80, { c: "#0d0f14" }); pencil(p, [[680, 92], [920, 92]]);
            // The door, half drawn.
            door(p, 18, { c: "#c8c2b2", hinge: "r" });
            p.rr(1086, 86, 92, 260, 5, { c: "#6b3f22", c2: "#3a2214", s: 0.3, sd: "v", m: 0.14 }); p.rr(1102, 100, 60, 92, 6, { c: "#1a120c" }); p.ell(1164, 214, 7, 7, { c: BRASS });
            p.pool(1130, 348, 120, 22, "#ffb860", 0.5);
        },
        props: {
            wall: { box: [430, 80, 200, 170], show: "p:c12ticket", paint(p) { const pts = [[-0.62, -0.78], [-0.46, -0.24], [-0.12, -0.2], [0.18, -0.4], [0.42, -0.44], [0.76, -0.24], [0.36, -0.02], [0.28, 0.26], [-0.02, 0.42], [-0.4, 0.22], [0.02, 0.72], [0.4, -0.27]]; pts.forEach(([x, y]) => { p.pool(530 + x * 90, 164 + y * 70, 18, 18, "#ff9c40", 0.5, "over"); p.ell(530 + x * 90, 164 + y * 70, 4, 4, { c: "#fff4c8", wob: 0 }); }); } },
            dest: { box: [696, 120, 216, 90], show: "p:c12dest", paint(p) { [..."WREN"].forEach((ch, i) => { const x = 702 + i * 54, y = 128; const seg = { W: [[0, 0], [10, 70], [21, 20], [32, 70], [42, 0]], R: [[4, 70], [4, 0], [34, 0], [38, 18], [34, 34], [6, 34], [38, 70]], E: [[38, 0], [4, 0], [4, 70], [38, 70]], N: [[4, 70], [4, 0], [38, 70], [38, 0]] }[ch]; p.line(seg.map(([a, b]) => [x + a, y + b]), 6, { c: "#ffd27a", wob: 0.1 }); if (ch === "E") p.line([[x + 4, y + 35], [x + 32, y + 35]], 6, { c: "#ffd27a" }); }); } },
            doorGlow: { box: [1100, 96, 66, 100], show: "p:c12dest", paint(p) { p.rr(1102, 100, 60, 92, 6, { c: "#ffd27a", c2: "#ff9c40" }); p.rr(1118, 128, 28, 66, 8, { c: "#2a1c20" }); p.ell(1132, 116, 11, 12, { c: "#2a1c20" }); } },
        },
    },
};

/** Paints a scene's base and props. Returns canvases; the caller bakes them. */
import { Canvas } from "./paint.js";
export function paintScene(id, S = 2) {
    const sc = SCENES[id], base = new Canvas(W, H, S);
    sc.base(base);
    if (!sc.raw) base.light(sc.amb, sc.lamps);
    if (sc.glow) sc.glow(base);
    if (!sc.raw) base.brush(sc.brush ?? 2.8);
    base.finish({ vig: sc.raw ? 0.08 : 0.18 });
    const props = {};
    for (const [k, v] of Object.entries(sc.props ?? {})) {
        const [x, y, w, h] = v.box, c = new Canvas(w, h, S, x, y);
        v.paint(c);
        if (!v.raw) c.light(sc.amb, sc.lamps);
        c.brush(2, { fine: true });
        props[k] = c;
    }
    return { base, props };
}
