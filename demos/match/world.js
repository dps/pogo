// The town. Six worlds of soft toy scenery, each prop painted whole, bitten, and thoroughly ruined.
// Morsel works through them one level at a time, and the damage stays.
import { INK, Painter, capsule, circle, ellipse, hex, mix3, polygon, rbox, rotated, smooth, star, stroke, arc, subtract, teeth, union } from "./sdf.js";

const PS = 200;
const c = hex;

class Kit {
    constructor(p) { this.p = p; this.tx = (f) => f; this.ky = 186; }
    /** Run fn with a move, turn and scale applied to everything it draws. */
    at(x, y, rot, s, fn) {
        const outer = this.tx, co = Math.cos(rot), si = Math.sin(rot);
        this.tx = (f) => outer((px, py) => { const dx = px - x, dy = py - y; return f((dx * co + dy * si) / s, (-dx * si + dy * co) / s) * s; });
        fn(this); this.tx = outer;
    }
    opts(o) { return { bevel: 9, gloss: 0.45, glow: 0.3, inkW: 3.5, ...o }; }
    paint(f, col, o = {}) { this.p.shape(this.tx(f), this.opts({ color: typeof col === "string" ? c(col) : col, ...o })); return this; }
    box(x, y, w, h, col, o = {}) { return this.paint(rbox(x, y, w / 2, h / 2, o.r ?? 4, o.rot ?? 0), col, o); }
    circ(x, y, r, col, o) { return this.paint(circle(x, y, r), col, o); }
    ell(x, y, rx, ry, col, o) { return this.paint(ellipse(x, y, rx, ry), col, o); }
    poly(pts, col, o = {}) { return this.paint(polygon(pts, o.r ?? 2), col, o); }
    line(pts, w, col, o) { return this.paint(stroke(pts, w), col, o); }
    /** Small unoutlined detail. */
    dot(x, y, r, col) { return this.paint(circle(x, y, r), col, { ink: null, inkW: 0, flat: true }); }
    bar(x, y, w, h, col) { return this.paint(rbox(x, y, w / 2, h / 2, Math.min(w, h) / 2), col, { ink: null, inkW: 0, flat: true }); }
    shadow(x, w) { this.p.soft(ellipse(x, this.ky + 2, w, 7), INK, 0.25, 5); return this; }
    crumbs(n, x0, x1, col) { for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * ((i * 0.618) % 1); this.circ(x, 183 - (i % 3) * 3, 3 + (i * 7 % 5), col, { inkW: 2.5 }); } return this; }
}

const brick = "#d9634c", cream = "#fff0d4", wood = "#c98a4a", dark = "#6b4a6e", steel = "#9db4c8", leaf = "#55c95a", pink = "#ff8fb4", sky = "#7fd4ff", gold = "#ffc93a";

const PROPS = [
    // Pudding Park
    [
        { name: "bench", bite: [130, 120], draw(k) { k.shadow(100, 72); for (const x of [58, 142]) k.box(x, 162, 12, 44, dark); k.box(100, 138, 150, 14, wood); k.box(100, 112, 150, 12, wood); k.box(100, 92, 150, 12, wood); }, ruin(k) { k.shadow(100, 72); k.at(62, 150, 0.5, 1, (q) => { q.box(-2, 26, 12, 44, dark); q.box(0, -6, 80, 14, wood); q.box(0, -30, 80, 12, wood); }); k.at(138, 150, -0.5, 1, (q) => { q.box(2, 26, 12, 44, dark); q.box(0, -6, 80, 14, wood); q.box(0, -30, 80, 12, wood); }); k.crumbs(5, 70, 130, wood); } },
        { name: "pond", bite: [150, 150], draw(k) { k.ell(100, 164, 90, 26, "#b08a5a"); k.ell(100, 160, 78, 19, sky, { gloss: 1 }); duck(k, 72, 146, 1); duck(k, 126, 150, -1); k.line([[160, 150], [166, 112]], 3, "#55a85a"); k.ell(167, 104, 5, 12, "#8a5a30"); }, ruin(k) { k.ell(100, 164, 90, 26, "#b08a5a"); k.ell(100, 162, 76, 18, "#8a6240", { gloss: 0.9 }); duck(k, 64, 152, 1); k.at(128, 146, 0.4, 1.05, (q) => duck(q, 0, 0, -1)); k.circ(100, 164, 5, sky, { inkW: 2 }); k.line([[160, 150], [150, 118]], 3, "#55a85a"); } },
        { name: "slide", bite: [66, 76], draw(k) { k.shadow(100, 76); for (const x of [44, 62]) k.line([[x, 184], [x, 66]], 4, steel); for (let y = 86; y < 180; y += 22) k.bar(53, y, 18, 4, steel); k.box(53, 62, 34, 8, pink); k.line([[64, 62], [100, 80], [140, 140], [170, 178]], 11, gold); }, ruin(k) { k.shadow(100, 76); for (const x of [44, 62]) k.line([[x, 184], [x + 12, 130], [x - 6, 96]], 4, steel); k.line([[60, 150], [84, 108], [118, 96], [132, 126], [106, 144], [88, 122], [112, 104], [150, 110], [172, 170]], 10, gold); } },
        { name: "tree", bite: [136, 66], draw(k) { k.shadow(100, 50); k.box(100, 152, 26, 70, wood); k.paint(smooth(12, circle(100, 72, 48), circle(62, 96, 34), circle(138, 96, 34)), leaf); k.circ(82, 62, 7, "#ff5c80"); k.circ(122, 88, 7, "#ff5c80"); k.circ(92, 104, 7, "#ff5c80"); }, ruin(k) { k.shadow(100, 40); k.box(100, 142, 26, 88, wood); k.line([[100, 100], [76, 74]], 5, wood); k.line([[100, 110], [130, 82]], 5, wood); k.circ(132, 78, 8, leaf); k.circ(104, 96, 12, "#f4d8a8"); k.crumbs(4, 60, 140, leaf); } },
        { name: "icecream", bite: [150, 80], draw(k) { k.shadow(100, 70); k.circ(60, 172, 13, dark); k.circ(136, 172, 13, dark); k.box(98, 132, 118, 62, cream); k.box(98, 112, 118, 10, pink, { r: 2 }); k.line([[92, 100], [92, 44]], 4, steel); k.paint(arc0(92, 44, 66, 30), "#ff77a8"); k.circ(152, 92, 16, "#ffe14f"); k.poly([[140, 102], [164, 102], [152, 128]], "#e8b464"); }, ruin(k) { k.shadow(100, 76); k.at(100, 128, 1.25, 0.72, (q) => { q.circ(-40, 22, 13, dark); q.circ(36, 22, 13, dark); q.box(-2, -18, 118, 62, cream); q.box(-2, -38, 118, 10, pink, { r: 2 }); }); k.ell(120, 176, 54, 9, "#ffe1ef", { bevel: 6 }); k.ell(60, 180, 30, 6, "#ffe14f", { bevel: 5 }); k.poly([[150, 164], [172, 164], [160, 180]], "#e8b464"); } },
        { name: "statue", bite: [100, 54], draw(k) { k.shadow(100, 48); k.box(100, 166, 92, 34, "#cfc6d8"); k.box(100, 134, 42, 40, "#b4d8c8"); k.circ(100, 94, 24, "#b4d8c8"); k.box(100, 66, 28, 28, "#b4d8c8", { r: 3 }); k.box(100, 77, 48, 7, "#b4d8c8"); k.line([[122, 124], [152, 86]], 7, "#b4d8c8"); }, ruin(k) { k.shadow(100, 48); k.box(100, 166, 92, 34, "#cfc6d8"); k.box(100, 134, 42, 40, "#b4d8c8"); k.line([[122, 124], [150, 132]], 7, "#b4d8c8"); k.line([[100, 112], [100, 74]], 4, cream); k.circ(100, 58, 22, "#ff5c80", { gloss: 1 }); k.at(40, 170, 0.5, 0.8, (q) => { q.circ(0, 0, 22, "#b4d8c8"); q.dot(-7, -2, 3, INK); q.dot(7, -2, 3, INK); q.ell(0, 9, 4, 5, INK, { ink: null, inkW: 0, flat: true }); }); } },
    ],
    // Main Street
    [
        { name: "lamp", bite: [100, 60], draw(k) { k.shadow(100, 30); k.box(100, 176, 40, 16, dark); k.line([[100, 170], [100, 60]], 6, dark); k.circ(100, 44, 22, "#ffe88a", { gloss: 1, glow: 1 }); k.box(100, 20, 40, 10, dark); }, ruin(k) { k.shadow(100, 30); k.box(100, 176, 40, 16, dark); k.line([[100, 170], [100, 120], [130, 90], [158, 104], [146, 130], [112, 120], [84, 88], [60, 100], [58, 130]], 6, dark); k.circ(58, 148, 20, "#ffe88a", { gloss: 1, glow: 1 }); } },
        { name: "postbox", bite: [100, 66], draw(k) { k.shadow(100, 40); k.box(100, 126, 72, 116, "#ff4f5e", { r: 30 }); k.box(100, 80, 44, 6, INK, { r: 3 }); k.box(100, 176, 86, 14, dark); k.ell(100, 112, 18, 10, "#fff", { inkW: 2 }); }, ruin(k) { k.shadow(100, 70); k.box(100, 168, 120, 30, "#ff4f5e", { r: 12 }); k.box(100, 158, 60, 5, INK, { r: 2 }); for (let n = 0; n < 6; n++) k.at(36 + n * 26, 138 - (n % 2) * 22, -0.5 + n * 0.25, 1, (q) => { q.box(0, 0, 26, 18, "#fff", { r: 2, inkW: 2.5 }); q.bar(0, -2, 14, 2, "#ff8fb4"); }); } },
        { name: "car", bite: [146, 110], draw(k) { k.shadow(100, 86); k.box(100, 142, 170, 48, sky, { r: 20, gloss: 0.9 }); k.paint(rbox(92, 112, 56, 28, 18), sky, { gloss: 0.9 }); k.box(70, 110, 38, 26, "#e8faff", { r: 7, inkW: 3 }); k.box(116, 110, 38, 26, "#e8faff", { r: 7, inkW: 3 }); k.circ(52, 166, 18, dark); k.circ(148, 166, 18, dark); k.circ(52, 166, 7, steel); k.circ(148, 166, 7, steel); }, ruin(k) { k.shadow(100, 86); k.at(56, 150, -0.25, 1, (q) => { q.box(0, 0, 80, 44, sky, { r: 14 }); q.box(0, -28, 40, 22, "#e8faff", { r: 6, inkW: 3 }); q.circ(-8, 24, 18, dark); q.circ(-8, 24, 7, steel); }); k.at(146, 150, 0.3, 1, (q) => { q.box(0, 0, 80, 44, sky, { r: 14 }); q.circ(10, 24, 18, dark); q.circ(10, 24, 7, steel); }); k.line([[100, 138], [112, 128], [100, 118]], 3, dark); k.crumbs(4, 90, 120, steel); } },
        { name: "bakery", bite: [150, 54], draw(k) { k.shadow(100, 88); k.box(100, 118, 164, 136, "#ffd9a8", { r: 6 }); k.poly([[8, 60], [192, 60], [172, 26], [28, 26]], "#ff77a8"); k.box(62, 142, 52, 84, "#fff4dc", { r: 4 }); k.box(138, 120, 58, 46, sky, { r: 5, gloss: 1 }); k.box(138, 160, 40, 40, "#c98a4a", { r: 4 }); for (let x = 22; x < 190; x += 32) k.ell(x, 76, 16, 10, x % 2 ? "#ffffff" : pink, { inkW: 2.5 }); k.box(62, 92, 72, 18, "#fff", { r: 4, inkW: 2.5 }); }, ruin(k) { k.shadow(100, 88); k.paint(polygon([[18, 186], [18, 92], [60, 120], [92, 76], [126, 118], [182, 96], [182, 186]], 4), "#ffd9a8"); k.box(62, 158, 52, 56, "#fff4dc", { r: 4 }); k.box(138, 160, 40, 40, wood, { r: 4 }); k.at(44, 62, -0.4, 0.9, (q) => q.box(0, 0, 80, 20, "#fff", { r: 4, inkW: 2.5 })); k.crumbs(6, 16, 184, "#ff77a8"); } },
        { name: "hydrant", bite: [100, 70], draw(k) { k.shadow(100, 32); k.box(100, 176, 62, 14, dark); k.box(100, 128, 44, 88, "#ffc93a", { r: 12 }); k.circ(100, 76, 25, "#ffc93a"); k.box(72, 118, 18, 22, "#ff8a1f"); k.box(128, 118, 18, 22, "#ff8a1f"); }, ruin(k) { k.shadow(100, 32); k.box(100, 176, 62, 14, dark); k.box(100, 142, 44, 58, "#ffc93a", { r: 8 }); for (let n = 0; n < 7; n++) { const a = -1.57 + (n - 3) * 0.28, x = 100 + Math.cos(a) * 90, y = 100 + Math.sin(a) * 80; k.line([[100, 112], [100 + Math.cos(a) * 46, 100 + Math.sin(a) * 50], [x, y]], 6, "#ff77a8", { inkW: 2.5, gloss: 1 }); k.circ(x, y, 7, "#ff9ec2", { inkW: 2.5 }); } k.at(146, 170, 0.4, 0.8, (q) => q.circ(0, 0, 22, "#ffc93a")); } },
        { name: "busstop", bite: [156, 44], draw(k) { k.shadow(100, 86); k.box(100, 36, 176, 14, "#ff8a1f"); k.box(34, 110, 10, 148, dark); k.box(166, 110, 10, 148, dark); k.box(100, 104, 110, 74, "#c8ecff", { alpha: 0.65, r: 6 }); k.box(100, 156, 112, 10, wood); k.box(100, 174, 90, 8, dark); k.circ(166, 26, 16, gold); }, ruin(k) { k.shadow(100, 96); k.box(100, 174, 184, 18, "#ff8a1f", { r: 3 }); k.at(46, 156, -0.2, 1, (q) => q.box(0, 0, 80, 10, dark)); k.at(150, 158, 0.15, 1, (q) => q.box(0, 0, 80, 10, dark)); k.at(100, 152, 0.05, 1, (q) => q.box(0, 0, 110, 12, "#c8ecff", { r: 3 })); k.circ(160, 136, 16, gold); } },
    ],
    // Town Square
    [
        { name: "fountain", bite: [100, 92], draw(k) { k.shadow(100, 84); k.ell(100, 160, 86, 26, "#d8cfe0"); k.ell(100, 154, 72, 15, sky, { gloss: 1 }); k.box(100, 118, 18, 66, "#d8cfe0"); k.ell(100, 88, 44, 12, "#d8cfe0"); k.circ(100, 64, 12, "#d8cfe0"); for (const s of [-1, 1]) k.line([[100, 56], [100 + s * 30, 42], [100 + s * 50, 84]], 3.2, sky, { inkW: 2 }); }, ruin(k) { k.shadow(100, 84); k.ell(100, 160, 86, 26, "#d8cfe0"); k.ell(100, 154, 72, 15, "#b8a6c2"); k.box(100, 134, 18, 34, "#d8cfe0"); k.at(100, 106, 0.5, 1, (q) => q.ell(0, 0, 44, 12, "#d8cfe0")); k.crumbs(5, 40, 160, "#d8cfe0"); } },
        { name: "clocktower", bite: [132, 48], draw(k) { k.shadow(100, 50); k.box(100, 118, 76, 136, "#f2c2a0", { r: 3 }); k.poly([[52, 54], [148, 54], [100, 6]], "#7a5ad0"); k.circ(100, 86, 28, cream); k.line([[100, 86], [100, 68]], 2.5, INK, { ink: null, inkW: 0, flat: true }); k.line([[100, 86], [114, 92]], 2.5, INK, { ink: null, inkW: 0, flat: true }); k.box(100, 162, 32, 48, wood, { r: 12 }); }, ruin(k) { k.shadow(100, 56); k.at(112, 186, 0.36, 1, (q) => { q.box(0, -68, 76, 136, "#f2c2a0", { r: 3 }); q.poly([[-48, -132], [48, -132], [0, -180]], "#7a5ad0"); q.paint(ellipse(0, -100, 30, 22), cream); q.line([[0, -100], [-6, -82], [8, -72]], 2.5, INK, { ink: null, inkW: 0, flat: true }); q.line([[0, -100], [18, -92], [22, -74]], 2.5, INK, { ink: null, inkW: 0, flat: true }); }); k.crumbs(3, 60, 90, "#f2c2a0"); } },
        { name: "bandstand", bite: [146, 54], draw(k) { k.shadow(100, 86); k.box(100, 172, 172, 22, wood); for (const x of [34, 76, 124, 166]) k.box(x, 118, 10, 96, cream); k.poly([[10, 74], [190, 74], [100, 18]], "#ff5c80"); k.circ(100, 14, 8, gold); k.box(100, 142, 150, 7, cream); }, ruin(k) { k.shadow(100, 86); k.box(100, 172, 172, 22, wood); for (const x of [34, 166]) k.box(x, 136, 10, 56, cream); k.at(100, 96, 0.3, 0.75, (q) => { q.poly([[-90, 30], [90, 30], [0, -26]], "#ff5c80"); q.circ(0, -30, 8, gold); }); k.at(76, 152, 1.3, 1, (q) => q.box(0, 0, 10, 60, cream)); } },
        { name: "stall", bite: [40, 60], draw(k) { k.shadow(100, 76); k.box(100, 150, 140, 60, wood); k.box(40, 102, 8, 88, dark); k.box(160, 102, 8, 88, dark); k.poly([[18, 80], [182, 80], [160, 42], [40, 42]], "#6fd4a0"); for (let n = 0; n < 5; n++) k.circ(56 + n * 22, 112, 11, ["#ff5c80", "#ffa24a", "#7bea5a", "#ffe14f", "#ff5c80"][n]); }, ruin(k) { k.shadow(100, 86); k.at(100, 168, 0.06, 1, (q) => q.box(0, 0, 160, 24, wood)); k.at(120, 138, 0.2, 1, (q) => q.poly([[-82, 18], [82, 18], [60, -20], [-60, -20]], "#6fd4a0")); for (let n = 0; n < 4; n++) k.circ(26 + n * 50, 178 - (n % 2) * 3, 9, ["#ff5c80", "#ffa24a", "#7bea5a", "#ffe14f"][n]); } },
        { name: "flagpole", bite: [130, 40], draw(k) { k.shadow(100, 30); k.box(100, 176, 50, 14, dark); k.line([[86, 176], [86, 18]], 4, steel); k.circ(86, 14, 7, gold); k.paint(polygon([[90, 22], [168, 26], [160, 42], [170, 62], [90, 66]], 3), "#ff5c80"); k.circ(122, 44, 12, "#fff", { inkW: 2.5 }); }, ruin(k) { k.shadow(100, 30); k.box(100, 176, 50, 14, dark); k.line([[86, 176], [86, 122], [128, 96], [150, 138]], 4, steel); k.paint(polygon([[150, 138], [120, 150], [132, 176], [168, 180]], 3), "#ff5c80"); } },
        { name: "townhall", bite: [152, 56], draw(k) { k.shadow(100, 90); k.box(100, 128, 176, 112, cream, { r: 4 }); k.poly([[8, 72], [192, 72], [100, 22]], "#ffb04a"); for (const x of [36, 74, 126, 164]) k.box(x, 130, 14, 96, "#fff"); k.box(100, 156, 34, 58, wood, { r: 12 }); k.circ(100, 54, 10, "#fff"); }, ruin(k) { k.shadow(100, 90); k.paint(polygon([[12, 186], [12, 76], [70, 60], [96, 96], [120, 78], [136, 120], [188, 130], [188, 186]], 4), cream); for (const x of [36, 74]) k.box(x, 134, 14, 88, "#fff"); k.at(146, 164, 1.5, 1, (q) => q.box(0, 0, 14, 80, "#fff")); k.box(100, 158, 34, 54, wood, { r: 12 }); k.at(42, 48, -0.3, 0.6, (q) => q.poly([[-90, 30], [90, 30], [0, -24]], "#ffb04a")); } },
    ],
    // Fudge Harbour
    [
        { name: "lighthouse", bite: [122, 52], draw(k) { k.shadow(100, 48); k.paint(polygon([[62, 186], [138, 186], [122, 56], [78, 56]], 3), (x, y) => (Math.floor((y + 8) / 32) % 2 ? c("#ff5c80") : c("#fff4e6"))); k.box(100, 46, 58, 12, dark); k.box(100, 28, 36, 26, "#ffe88a", { gloss: 1, glow: 1, r: 5 }); k.poly([[74, 16], [126, 16], [100, -2 + 6]], "#ff5c80"); }, ruin(k) { k.shadow(100, 48); k.paint(smooth(16, polygon([[64, 186], [136, 186], [118, 126], [82, 126]], 3), circle(100, 118, 14)), (x, y) => (Math.floor((y + 8) / 32) % 2 ? c("#ff5c80") : c("#fff4e6")), { gloss: 1, bevel: 20 }); k.at(46, 170, 0.3, 0.8, (q) => q.box(0, 0, 36, 26, "#ffe88a", { glow: 1, r: 5 })); } },
        { name: "ferry", bite: [152, 96], draw(k) { k.shadow(100, 90); k.poly([[8, 124], [192, 124], [170, 172], [32, 172]], "#fff4e6"); k.box(100, 162, 146, 10, "#ff5c80", { r: 0 }); k.box(92, 104, 110, 40, "#ffd98a", { r: 5 }); for (let x = 50; x < 140; x += 26) k.circ(x, 104, 7, sky, { inkW: 2.5 }); k.box(120, 66, 26, 44, "#ff8a1f"); k.bar(120, 58, 26, 7, "#fff"); }, ruin(k) { k.shadow(100, 90); k.at(58, 148, -0.4, 1, (q) => { q.poly([[-50, -24], [46, -24], [46, 24], [-28, 24]], "#fff4e6"); q.box(-4, -44, 60, 36, "#ffd98a", { r: 5 }); }); k.at(146, 148, 0.45, 1, (q) => { q.poly([[-44, -24], [50, -24], [28, 24], [-44, 24]], "#fff4e6"); q.box(4, -60, 26, 44, "#ff8a1f"); }); k.crumbs(4, 90, 120, "#fff4e6"); } },
        { name: "crane", bite: [160, 50], draw(k) { k.shadow(100, 60); k.box(70, 112, 26, 148, "#ffc93a", { r: 3 }); k.box(70, 182, 80, 10, dark); k.box(110, 42, 170, 16, "#ffc93a", { r: 3 }); k.box(70, 28, 30, 28, "#ff8a1f", { r: 5 }); k.line([[156, 50], [156, 108]], 2, INK, { ink: null, inkW: 0, flat: true }); k.box(156, 124, 40, 28, "#6fa8d8", { r: 3 }); }, ruin(k) { k.shadow(100, 60); k.box(70, 182, 80, 10, dark); k.line([[70, 176], [70, 96], [96, 58], [136, 62], [152, 100], [130, 128], [106, 112], [120, 92]], 11, "#ffc93a"); k.box(156, 170, 40, 28, "#6fa8d8", { r: 3, rot: 0.3 }); } },
        { name: "shack", bite: [146, 74], draw(k) { k.shadow(100, 74); k.box(100, 134, 136, 92, sky, { r: 3 }); k.poly([[20, 94], [180, 94], [150, 48], [50, 48]], wood); k.box(68, 148, 36, 64, cream, { r: 4 }); k.ell(134, 122, 26, 12, "#ff8a7a"); k.poly([[108, 122], [94, 110], [94, 134]], "#ff8a7a"); k.dot(148, 119, 2.5, INK); }, ruin(k) { k.shadow(100, 74); for (const [x, rot] of [[44, -0.3], [78, 0.2], [116, -0.15], [152, 0.35]]) k.box(x, 156, 26, 60, sky, { r: 3, rot }); k.at(104, 116, -0.2, 0.9, (q) => q.poly([[-80, 22], [80, 22], [50, -24], [-50, -24]], wood)); k.at(150, 72, 0.3, 1, (q) => { q.ell(0, 0, 26, 12, "#ff8a7a"); q.poly([[-26, 0], [-40, -12], [-40, 12]], "#ff8a7a"); q.dot(14, -3, 2.5, INK); }); } },
        { name: "buoy", bite: [100, 58], draw(k) { k.shadow(100, 56); k.ell(100, 162, 60, 22, "#ff5c80"); k.poly([[66, 150], [134, 150], [116, 60], [84, 60]], "#fff4e6"); k.bar(100, 104, 56, 12, "#ff5c80"); k.circ(100, 46, 16, "#ffe88a", { gloss: 1, glow: 1 }); }, ruin(k) { k.shadow(100, 56); k.ell(100, 164, 60, 20, "#ff5c80"); k.paint(polygon([[72, 150], [128, 150], [130, 118], [112, 132], [100, 112], [84, 128], [70, 116]], 2), "#fff4e6"); k.at(150, 170, 0, 0.6, (q) => q.circ(0, 0, 16, "#ffe88a")); } },
        { name: "containers", bite: [152, 54], draw(k) { k.shadow(100, 86); const cols = ["#ff5c80", "#3fb8d8", "#ffc93a", "#7bea5a", "#c77dff", "#ff8a1f"]; for (let y = 0; y < 3; y++) for (let x = 0; x < 2 - (y === 2 ? 1 : 0); x++) { k.box(58 + x * 84, 162 - y * 50, 82, 46, cols[(x + y * 2) % 6], { r: 3 }); for (let n = 0; n < 5; n++) k.bar(30 + x * 84 + n * 14, 162 - y * 50, 3, 34, "#00000033"); } }, ruin(k) { k.shadow(100, 90); const cols = ["#ff5c80", "#3fb8d8", "#ffc93a", "#7bea5a"]; [[52, 160, 0.1], [142, 162, -0.1], [100, 112, 0.5], [40, 96, -0.7]].forEach(([x, y, r], n) => k.box(x, y, 82, 46, cols[n], { r: 3, rot: r })); } },
    ],
    // Downtown
    [
        { name: "tower", bite: [146, 86], draw(k) { k.shadow(100, 56); k.box(100, 100, 100, 172, "#8fb4e8", { r: 3 }); for (let y = 30; y < 174; y += 24) for (let x = 68; x < 136; x += 22) k.box(x, y, 13, 15, "#fff0a8", { r: 2, inkW: 1.8 }); }, ruin(k) { k.shadow(100, 56); k.paint(subtract(rbox(100, 100, 50, 86, 3), teeth(150, 86, 38, 0.3, 7), teeth(62, 44, 22, 0.8, 5)), "#8fb4e8"); for (let y = 30; y < 174; y += 24) for (let x = 68; x < 136; x += 22) if (Math.hypot(x - 150, y - 86) > 56 && Math.hypot(x - 62, y - 44) > 38) k.box(x, y, 13, 15, "#fff0a8", { r: 2, inkW: 1.8 }); } },
        { name: "bank", bite: [40, 58], draw(k) { k.shadow(100, 90); k.box(100, 176, 180, 18, "#d8cfe0"); for (const x of [32, 66, 100, 134, 168]) k.box(x, 120, 16, 92, "#f6efe0"); k.box(100, 70, 180, 16, "#d8cfe0"); k.poly([[6, 62], [194, 62], [100, 12]], "#f6efe0"); k.circ(100, 44, 10, gold); }, ruin(k) { k.shadow(100, 90); k.box(100, 176, 180, 18, "#d8cfe0"); k.box(32, 130, 16, 72, "#f6efe0"); k.box(168, 130, 16, 72, "#f6efe0"); k.at(100, 154, 1.2, 1, (q) => q.box(0, 0, 16, 92, "#f6efe0")); k.at(100, 90, -0.14, 1, (q) => { q.box(0, 0, 170, 14, "#d8cfe0"); q.poly([[-90, -8], [90, -8], [0, -52]], "#f6efe0"); }); for (let n = 0; n < 9; n++) k.circ(30 + n * 18, 158 + (n % 3) * 3, 7, gold, { inkW: 2.2 }); } },
        { name: "mast", bite: [100, 40], draw(k) { k.shadow(100, 40); k.poly([[62, 186], [138, 186], [104, 16], [96, 16]], "#ff8a7a"); for (let y = 50; y < 180; y += 26) k.bar(100, y, 16 + (y - 16) * 0.42, 3.5, cream); k.circ(100, 12, 7, "#ff4f5e", { glow: 1 }); }, ruin(k) { k.shadow(100, 40); k.poly([[62, 186], [138, 186], [120, 110], [80, 110]], "#ff8a7a"); k.at(140, 76, 0.9, 0.7, (q) => { q.poly([[-5, 60], [5, 60], [3, -60], [-3, -60]], "#ff8a7a"); q.circ(0, -62, 7, "#ff4f5e"); }); } },
        { name: "billboard", bite: [156, 66], draw(k) { k.shadow(100, 80); for (const x of [56, 144]) k.box(x, 150, 12, 76, dark); k.box(100, 74, 178, 92, cream, { r: 5 }); k.circ(62, 74, 26, "#ff8fb4"); k.bar(130, 56, 76, 11, "#ff5c80"); k.bar(130, 76, 76, 7, INK); k.bar(130, 92, 60, 7, INK); }, ruin(k) { k.shadow(100, 80); k.box(56, 150, 12, 76, dark); k.at(140, 150, 0.4, 1, (q) => q.box(0, 0, 12, 76, dark)); k.at(90, 84, -0.14, 1, (q) => { q.box(0, 0, 150, 84, cream, { r: 5 }); q.paint(ellipse(-20, 0, 34, 30), "#2fe0c8"); q.dot(-32, -8, 7, "#fff"); q.dot(-8, -8, 7, "#fff"); q.dot(-32, -7, 3, INK); q.dot(-8, -7, 3, INK); q.bar(44, -14, 40, 8, "#ff5c80"); q.bar(44, 4, 40, 6, INK); }); } },
        { name: "stadium", bite: [156, 92], draw(k) { k.shadow(100, 94); k.ell(100, 130, 94, 56, "#c8c0e0"); k.ell(100, 112, 80, 26, "#7bea5a", { gloss: 0.2 }); k.bar(100, 112, 3, 40, "#fff"); for (const x of [18, 182]) { k.line([[x, 86], [x, 26]], 3, steel); k.box(x, 22, 30, 12, "#ffe88a", { glow: 1 }); } }, ruin(k) { k.shadow(100, 94); k.paint(subtract(ellipse(100, 130, 94, 56), teeth(142, 92, 36, 0.4, 6)), "#c8c0e0"); k.ell(76, 124, 44, 16, "#7bea5a", { gloss: 0.2 }); k.at(44, 58, -0.5, 1, (q) => { q.line([[0, 40], [0, -20]], 3, steel); q.box(0, -24, 30, 12, "#ffe88a"); }); k.circ(160, 170, 11, "#fff", { inkW: 2.6 }); k.dot(158, 167, 3, INK); k.dot(164, 173, 2.5, INK); } },
        { name: "skyscraper", bite: [124, 46], draw(k) { k.shadow(100, 44); k.poly([[66, 186], [134, 186], [122, 40], [78, 40]], "#ffb48a"); k.poly([[78, 40], [122, 40], [100, 4]], "#c77dff"); for (let y = 56; y < 180; y += 18) k.bar(100, y, 44 + (y - 40) * 0.2, 7, "#fff0a8"); }, ruin(k) { k.shadow(100, 44); k.poly([[66, 186], [134, 186], [126, 96], [74, 96]], "#ffb48a"); for (let y = 112; y < 180; y += 18) k.bar(100, y, 50 + (y - 40) * 0.1, 7, "#fff0a8"); k.at(146, 150, 1.25, 0.72, (q) => { q.poly([[-22, 60], [22, 60], [14, -40], [-14, -40]], "#ffb48a"); q.poly([[-14, -40], [14, -40], [0, -70]], "#c77dff"); }); } },
    ],
    // The Big Bite: there is nothing left down there, so he reaches up.
    [
        { name: "cloud", bite: [146, 90], float: 1, draw(k) { k.paint(smooth(16, circle(66, 110, 34), circle(108, 92, 44), circle(148, 112, 30), rbox(104, 126, 70, 18, 16)), "#ffffff", { gloss: 0.2, bevel: 24 }); }, ruin(k) { k.paint(subtract(smooth(16, circle(66, 110, 34), circle(108, 92, 44), rbox(90, 126, 56, 18, 16)), teeth(138, 104, 28, 0.2, 6)), "#ffffff", { gloss: 0.2, bevel: 24 }); k.at(160, 70, 0, 0.3, (q) => q.circ(0, 0, 30, "#fff", { gloss: 0.1 })); k.at(170, 124, 0, 0.22, (q) => q.circ(0, 0, 30, "#fff", { gloss: 0.1 })); } },
        { name: "blimp", bite: [150, 80], float: 1, draw(k) { k.ell(100, 84, 86, 42, "#ff77a8", { gloss: 1, bevel: 26 }); k.poly([[18, 82], [0, 56], [0, 112]], "#ffc93a"); k.box(100, 134, 44, 16, cream, { r: 6 }); k.bar(100, 84, 150, 8, "#fff"); }, ruin(k) { k.paint(stroke([[150, 92], [118, 76], [86, 96], [56, 82], [26, 100]], 24), "#ff77a8", { gloss: 1, bevel: 22 }); k.box(92, 150, 44, 16, cream, { r: 6, rot: 0.3 }); for (let n = 0; n < 4; n++) k.circ(164 + n * 7, 80 - n * 14, 3 + n, "#ffe1ef", { inkW: 2 }); } },
        { name: "plane", bite: [138, 98], float: 1, draw(k) { k.paint(capsule(30, 100, 170, 100, 19), "#ffffff", { gloss: 1 }); k.poly([[86, 104], [122, 104], [84, 158], [66, 158]], sky); k.poly([[30, 96], [20, 62], [50, 88]], "#ff5c80"); for (let x = 70; x < 150; x += 16) k.circ(x, 94, 4, sky, { inkW: 1.8 }); }, ruin(k) { k.paint(subtract(capsule(30, 100, 170, 100, 19), teeth(150, 104, 26, 0.3, 6)), "#ffffff", { gloss: 1 }); k.poly([[86, 104], [106, 104], [90, 140], [72, 140]], sky); k.poly([[30, 96], [20, 62], [50, 88]], "#ff5c80"); k.at(158, 150, 0.7, 0.9, (q) => q.poly([[-16, -22], [16, -22], [-8, 26], [-26, 26]], sky)); } },
        { name: "balloon", bite: [100, 52], float: 1, draw(k) { k.paint(smooth(10, circle(100, 72, 58), polygon([[70, 110], [130, 110], [112, 140], [88, 140]], 2)), (x, y) => (Math.floor((x + 300) / 26) % 2 ? c("#ffc93a") : c("#ff5c80")), { gloss: 0.9, bevel: 26 }); k.line([[90, 142], [90, 158]], 1.5, INK, { ink: null, inkW: 0, flat: true }); k.line([[110, 142], [110, 158]], 1.5, INK, { ink: null, inkW: 0, flat: true }); k.box(100, 168, 30, 22, wood, { r: 4 }); }, ruin(k) { k.paint(polygon([[60, 60], [120, 40], [146, 72], [106, 118], [88, 92]], 8), (x, y) => (Math.floor((x + 300) / 26) % 2 ? c("#ffc93a") : c("#ff5c80")), { gloss: 0.9 }); k.line([[100, 110], [100, 150]], 1.5, INK, { ink: null, inkW: 0, flat: true }); k.box(100, 162, 30, 22, wood, { r: 4, rot: 0.4 }); } },
        { name: "satellite", bite: [140, 96], float: 1, draw(k) { k.box(100, 100, 42, 42, "#d8d0e8", { r: 6 }); for (const s of [-1, 1]) { k.box(100 + s * 62, 100, 70, 26, "#3f77d8", { r: 3, gloss: 1 }); k.bar(100 + s * 32, 100, 10, 4, INK); } k.line([[100, 78], [100, 54]], 2.5, steel); k.circ(100, 50, 9, "#ffe14f"); }, ruin(k) { k.box(100, 100, 42, 42, "#d8d0e8", { r: 6, rot: 0.4 }); k.at(38, 96, 0.5, 1, (q) => q.box(0, 0, 70, 26, "#3f77d8", { r: 3, gloss: 1 })); k.line([[110, 80], [136, 52], [164, 66]], 2.5, steel); k.at(162, 144, -0.8, 0.9, (q) => q.box(0, 0, 50, 26, "#3f77d8", { r: 3 })); } },
        { name: "moon", bite: [146, 70], float: 1, draw(k) { moon(k); }, ruin(k) { k.paint(subtract(circle(100, 100, 82), teeth(160, 78, 62, 0.2, 7)), (x, y) => mix3(c("#e8e0f0"), c("#fff8d8"), y / 180), { gloss: 0.3, bevel: 34 }); for (const [x, y, r] of [[60, 80, 12], [84, 134, 16], [54, 124, 7]]) k.circ(x, y, r, "#c8bcd8", { inkW: 2, bevel: 6 }); } },
    ],
];

function moon(k) {
    k.circ(100, 100, 82, (x, y) => mix3(c("#e8e0f0"), c("#fff8d8"), y / 180), { gloss: 0.3, bevel: 34 });
    for (const [x, y, r] of [[60, 80, 12], [120, 64, 9], [132, 124, 15], [84, 134, 16], [54, 124, 7]]) k.circ(x, y, r, "#c8bcd8", { inkW: 2, bevel: 6 });
}
function duck(k, x, y, flip) {
    k.ell(x, y, 15, 11, "#ffe14f", { inkW: 2.6 }); k.circ(x + 10 * flip, y - 12, 8, "#ffe14f", { inkW: 2.6 });
    k.poly([[x + 16 * flip, y - 14], [x + 25 * flip, y - 11], [x + 16 * flip, y - 8]], "#ff8a1f", { inkW: 2 });
    k.dot(x + 12 * flip, y - 14, 1.8, INK);
}
const arc0 = (x, y, rx, ry) => subtract(ellipse(x, y, rx, ry), rbox(x, y + 200, 300, 200, 0));

const SKIES = [
    { top: "#8fe3ff", bottom: "#fff3cf", hill: "#a9ecb0", hill2: "#7fdc92", ground: "#6fd47e", ground2: "#46b86a", cloud: 0.9 },
    { top: "#ffc1a0", bottom: "#fff0cc", hill: "#f2b8c8", hill2: "#e49ab8", ground: "#a79ac0", ground2: "#7f7298", cloud: 0.7 },
    { top: "#c6b4ff", bottom: "#ffe4ee", hill: "#d8bce8", hill2: "#b8a0dc", ground: "#ffcfa0", ground2: "#e8a878", cloud: 0.7 },
    { top: "#74cdf2", bottom: "#ffedca", hill: "#8a5230", hill2: "#6e3c20", ground: "#c98f58", ground2: "#a36c3c", cloud: 0.9 },
    { top: "#ff8f7a", bottom: "#ffd98a", hill: "#a65aa8", hill2: "#7c4498", ground: "#8078a8", ground2: "#5a5484", cloud: 0.4 },
    { top: "#3a2388", bottom: "#ff8fb4", hill: "#6a3ca0", hill2: "#4a2a80", ground: "#8a6ab8", ground2: "#5a4288", cloud: 0.2 },
];

const SKYW = 720, SKYH = 420;
function paintBackdrop(assets, w) {
    const t = SKIES[w], name = `sky${w}`;
    assets.paint(name, SKYW, SKYH, (px) => {
        const p = new Painter(px.data, SKYW, SKYH), D = px.data, a = c(t.top), b = c(t.bottom);
        for (let y = 0; y < SKYH; y++) {
            const col = mix3(a, b, Math.min(1, y / (SKYH * 0.72)));
            for (let x = 0; x < SKYW; x++) { const q = (x + y * SKYW) * 4; D[q] = col[0] * 255; D[q + 1] = col[1] * 255; D[q + 2] = col[2] * 255; D[q + 3] = 255; }
        }
        const soft = { ink: null, inkW: 0, gloss: 0.12, bevel: 30, glow: 0.4 };
        let seed = 7 + w * 13;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        if (w === 5) for (let n = 0; n < 90; n++) p.soft(circle(rnd() * SKYW, rnd() * 240, 0.8 + rnd() * 1.6), [1, 1, 1], 0.9, 1);
        if (w === 4) p.soft(circle(500, 230, 76), hex("#fff3b0"), 0.9, 3).soft(circle(500, 230, 130), hex("#fff3b0"), 0.25, 50);
        if (w === 0 || w === 3) p.soft(circle(590, 70, 40), hex("#fff7cc"), 1, 2).soft(circle(590, 70, 86), hex("#fff7cc"), 0.3, 40);
        for (let n = 0; n < 7; n++) {
            const x = rnd() * SKYW, y = 40 + rnd() * 150, r = 20 + rnd() * 22;
            p.shape(smooth(14, circle(x, y, r), circle(x + r * 1.1, y + 4, r * 0.8), circle(x - r * 1.1, y + 6, r * 0.7), rbox(x, y + r * 0.5, r * 2, r * 0.4, r * 0.3)), { ...soft, color: [1, 1, 1], alpha: t.cloud * 0.85, bevel: 18 });
        }
        const H0 = 262;
        if (w === 0 || w === 2) {
            p.shape(smooth(60, circle(120, 420, 210), circle(420, 460, 260), circle(690, 410, 200)), { ...soft, color: c(t.hill) });
            p.shape(smooth(50, circle(280, 470, 220), circle(620, 500, 240), circle(-10, 500, 200)), { ...soft, color: c(t.hill2) });
        }
        if (w === 2) for (const [x, r] of [[140, 46], [520, 60]]) { p.shape(rbox(x, 300, r, 90, 6), { ...soft, color: c(t.hill2), bevel: 8 }); p.shape(circle(x, 212, r), { ...soft, color: c(t.hill), bevel: 22 }); }
        if (w === 1 || w === 4) {
            let x = -10;
            while (x < SKYW) {
                const bw = 44 + rnd() * 60, bh = (w === 4 ? 90 : 50) + rnd() * (w === 4 ? 120 : 60), col = mix3(c(t.hill), c(t.hill2), rnd());
                p.shape(rbox(x + bw / 2, H0 + 40 - bh / 2 + 20, bw / 2, bh / 2 + 30, 4), { ...soft, color: col, bevel: 6 });
                const rowsN = Math.floor(bh / 22);
                for (let r = 0; r < rowsN; r++) for (let q = 0; q < Math.floor(bw / 18); q++) if (rnd() > 0.35) p.soft(rbox(x + 12 + q * 18, H0 + 40 - bh + 14 + r * 22, 4, 6, 1), hex("#fff3b0"), 0.55, 1);
                x += bw + 4;
            }
        }
        if (w === 3) {
            p.shape(rbox(SKYW / 2, 318, 400, 64, 0), { ...soft, color: (x, y) => mix3(c(t.hill), c(t.hill2), Math.sin(x * 0.03 + y * 0.1) * 0.5 + 0.5), bevel: 10, gloss: 1 });
            for (let n = 0; n < 8; n++) p.soft(rotated(ellipse(rnd() * SKYW, 268 + rnd() * 80, 30, 4), 0, 0, 0), hex("#d09868"), 0.8, 2);
        }
        if (w === 5) {
            p.shape(circle(360, 1060, 800), { ...soft, color: (x, y) => mix3(c(t.hill), c(t.hill2), (y - 260) / 200), bevel: 50 });
            let x = 120;
            while (x < 620) { const h = 8 + rnd() * 16; p.shape(rbox(x, 276 - h + Math.abs(x - 360) * Math.abs(x - 360) * 0.00062, 6 + rnd() * 5, h, 1), { ...soft, color: c(t.ground2), bevel: 3 }); x += 18 + rnd() * 22; }
        }
        // Ground, with a soft lit lip.
        const gy = 316;
        p.shape(rbox(SKYW / 2, gy + 120, SKYW, 120, 0), { ...soft, color: (x, y) => mix3(c(t.ground), c(t.ground2), Math.min(1, (y - gy) / 100)), bevel: 10 });
        if (w === 1 || w === 4) for (let x = 20; x < SKYW; x += 80) p.soft(rbox(x, gy + 44, 26, 3, 3), hex("#ffffff"), 0.6, 1);
        if (w === 2) for (let n = 0; n < 60; n++) p.soft(ellipse(rnd() * SKYW, gy + 10 + rnd() * 90, 9, 5), c(t.ground2), 0.4, 2);
        if (w === 0) for (let n = 0; n < 60; n++) { const x = rnd() * SKYW, y = gy + 8 + rnd() * 90; p.soft(rbox(x, y, 1.6, 5, 1), c(t.ground2), 0.7, 1); }
        if (w === 3) for (let x = 0; x < SKYW; x += 44) p.soft(rbox(x, gy + 50, 1.4, 60, 0), c(t.ground2), 0.6, 1);
    }, { smooth: true });
}

function paintProps(assets, w) {
    const name = `props${w}`;
    assets.paint(name, PS * 6, PS * 3, (px) => {
        const p = new Painter(px.data, PS * 6, PS * 3);
        PROPS[w].forEach((prop, j) => {
            p.cell(j * PS, 0, PS, PS); prop.draw(new Kit(p));
            p.cell(j * PS, PS, PS, PS); prop.draw(new Kit(p));
            const [bx, by] = prop.bite;
            p.bite(teeth(bx, by, 22, j * 0.7, 5), { inkW: 3.2 });
            p.cell(j * PS, PS * 2, PS, PS); prop.ruin(new Kit(p));
        });
    }, { smooth: true });
    assets.grid(name, 6, 3);
}

/** World art is painted on first use, so startup stays quick. */
const done = new Set();
export function ensureWorld(game, w) {
    if (done.has(w)) return;
    done.add(w);
    paintBackdrop(game.assets, w);
    paintProps(game.assets, w);
}

export const propState = (beaten, j) => Math.max(0, Math.min(2, beaten - j * 2));
export const PROP_NAMES = PROPS.map((list) => list.map((p) => p.name));

/** Layout of a world: where each prop stands, across a strip of the given width. */
const XS = [0.1, 0.27, 0.74, 0.9, 0.41, 0.59];

export class Diorama {
    constructor(game, w, beaten) { this.game = game; this.w = w; this.beaten = beaten; this.x = 0; this.y = 0; this.width = 360; this.height = 200; this.ground = 180; this.scale = 1; this.t = 0; this.extra = new Map(); this.shake = new Float32Array(6); this.night = 0; ensureWorld(game, w); }
    /** Rectangle to fill, and the screen y the props stand on. */
    place(x, y, width, height, ground) { this.x = x; this.y = y; this.width = width; this.height = height; this.ground = ground; this.scale = Math.min(1.2, Math.max(0.62, Math.max(width / 380, (ground - y) / 210))) * (this.w === 5 ? 0.92 : 1); }
    propX(j) { return this.x + this.width * XS[j]; }
    propSize() { return 92 * this.scale; }
    update(dt) { this.t += dt; for (let j = 0; j < 6; j++) this.shake[j] *= Math.exp(-dt * 7); }
    hit(j) { this.shake[j] = 1; }

    drawSky(d) {
        const w = this.width, h = this.height, gy = this.ground, name = `sky${this.w}`;
        // The painted ground line sits at 316/420; line that up with the screen's ground line.
        const scale = Math.max(w / SKYW, (gy - this.y) / 316) * 1.002, t = SKIES[this.w];
        const cx = this.x + (this.skyWidth ?? w) / 2, sc = Math.max(scale, (this.skyWidth ?? 0) / SKYW);
        d.rect((this.skyWidth ?? w) * 3, h * 2, { x: cx, y: gy - h, color: t.top });
        for (const n of [-1, 0, 1]) d.sprite(name, { x: cx + n * SKYW * sc, y: gy - 106 * sc, width: SKYW * sc + 0.5, height: SKYH * sc, flipX: n !== 0 });
        const low = gy + 104 * sc - 2;
        if (low < this.y + h) d.rect((this.skyWidth ?? w) * 3, this.y + h * 2 - low, { x: cx, y: (low + this.y + h * 2) / 2, color: t.ground2 });
    }

    drawProps(d, slice = null) {
        const size = this.propSize(), order = [0, 3, 1, 2, 4, 5];
        for (const j of order) {
            if (slice && !slice(j)) continue;
            const st = this.extra.get(j) ?? propState(this.beaten, j);
            const float = PROPS[this.w][j].float;
            const q = this.shake[j], x = this.propX(j), ybase = float ? this.y + (this.ground - this.y) * (0.3 + (j % 3) * 0.17) + Math.sin(this.t * 0.9 + j) * 5 : this.ground - size / 2 + size * 0.07;
            d.push(); d.translate(x + Math.sin(this.t * 40) * q * 3, ybase + size / 2); d.scale(1 + q * 0.12, 1 - q * 0.14);
            d.sprite(`props${this.w}`, { frame: j + st * 6, x: 0, y: -size / 2, width: size, height: size });
            d.pop();
        }
    }
}

/** Sprite access for the "what's next" card and the map. */
export const propFrame = (j, st) => j + st * 6;
export { PROPS };
void [capsule, union, star];
