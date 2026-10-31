// Nine hand-built levels. Built from code rather than ASCII because 200-column strings can't be edited sanely.
//
// Design rules, from tools/measure.mjs (run jump 5.4 tiles high and 9.8 far; walk jump 4.7 and 5; stand 3.9):
//   - gaps: at most 4 tiles when you can't get a run-up, at most 8 with one
//   - steps up: at most 4 rows from a stand
//   - a block you bump sits 4 rows above the floor you stand on
//   - nothing lethal sits past a blind jump; every hazard is visible for a second at run speed
import { BRICK, CLOUD, COIN, CRUMBLE, EMPTY, GROUND, HARD, HIDDEN, LAVA, ONEWAY, PIPE, SECRET, SUN, THORN, THORN_DOWN, TILE } from "./physics.js";

const GR = 13;  // row of the ground's top surface

export class Room {
    constructor(id, w, h, theme, o = {}) {
        Object.assign(this, { id, w, h, theme, T: new Uint8Array(w * h), contents: new Map(), pipeV: new Map(), pipes: [], spawns: [], plats: [], decor: [], springs: [], gates: [], start: null, checks: [], goal: null, boss: null, sorb: null, music: o.music ?? null, seed: o.seed ?? 1, noDeco: o.noDeco ?? false });
    }
    set(c, r, t) { if (c >= 0 && c < this.w && r >= 0 && r < this.h) this.T[r * this.w + c] = t; return this; }
    get(c, r) { return c < 0 || c >= this.w || r < 0 || r >= this.h ? EMPTY : this.T[r * this.w + c]; }
    /** Solid terrain from row `top` down to the floor of the level. */
    ground(c0, c1, top = GR) { for (let c = c0; c <= c1; c++) for (let r = top; r < this.h; r++) this.set(c, r, GROUND); return this; }
    /** A filled rectangle of terrain or any other tile. */
    fill(c0, r0, c1, r1, t = GROUND) { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) this.set(c, r, t); return this; }
    clear(c0, r0, c1, r1) { return this.fill(c0, r0, c1, r1, EMPTY); }
    /**
     * Blocks from a string, left to right from (c, r):
     * B brick, C sun+coin, M sun+power-up, U sun+extra life, S sun+rainbow drop, K brick with many coins,
     * H hidden coin block, L hidden extra life, X hard block, O one-way plank, ~ cloud, * coin, Q crumble, . gap.
     */
    blocks(c, r, str) {
        [...str].forEach((ch, i) => {
            const x = c + i, key = r * this.w + x;
            if (ch === ".") return;
            if (ch === "B") this.set(x, r, BRICK);
            else if (ch === "K") { this.set(x, r, BRICK); this.contents.set(key, "multi"); }
            else if (ch === "C") { this.set(x, r, SUN); this.contents.set(key, "coin"); }
            else if (ch === "M") { this.set(x, r, SUN); this.contents.set(key, "power"); }
            else if (ch === "U") { this.set(x, r, SUN); this.contents.set(key, "boot"); }
            else if (ch === "S") { this.set(x, r, SUN); this.contents.set(key, "rainbow"); }
            else if (ch === "H") { this.set(x, r, HIDDEN); this.contents.set(key, "coin"); }
            else if (ch === "L") { this.set(x, r, HIDDEN); this.contents.set(key, "boot"); }
            else if (ch === "X") this.set(x, r, HARD);
            else if (ch === "O") this.set(x, r, ONEWAY);
            else if (ch === "~") this.set(x, r, CLOUD);
            else if (ch === "*") this.set(x, r, COIN);
            else if (ch === "Q") this.set(x, r, CRUMBLE);
            else throw new Error(`blocks: unknown "${ch}"`);
        });
        return this;
    }
    coins(c, r, n, step = 1) { for (let i = 0; i < n; i++) this.set(c + i * step, r, COIN); return this; }
    arc(c, r, n) { for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * 2 - 1; this.set(c + i, Math.round(r + t * t * 2), COIN); } return this; }
    pipe(c, top, o = {}) {
        for (let r = top; r < this.h; r++) {
            if (this.get(c, r) === GROUND) break;   // stops at the ground, so no slits beside it
            this.set(c, r, PIPE); this.set(c + 1, r, PIPE);
            this.pipeV.set(r * this.w + c, r === top ? 0 : 2); this.pipeV.set(r * this.w + c + 1, r === top ? 1 : 3);
        }
        const p = { c, top, id: o.id ?? null, to: o.to ?? null, toPipe: o.toPipe ?? null };
        this.pipes.push(p);
        if (o.eel) this.spawns.push({ kind: "eel", c, r: top, o: {} });
        return this;
    }
    e(kind, c, r, o = {}) { this.spawns.push({ kind, c, r: r ?? null, o }); return this; }
    /** Moving platform: `w` tiles wide, centred at (c, r), swinging by ax/ay tiles. */
    plat(c, r, w, ax, ay, period = 4, phase = 0) { this.plats.push({ kind: "path", w: w * TILE, h: 10, x0: (c + w / 2) * TILE, y0: r * TILE + 5, ax: ax * TILE, ay: ay * TILE, period, phase }); return this; }
    fallPlat(c, r, w) { this.plats.push({ kind: "fall", w: w * TILE, h: 10, x: (c + w / 2) * TILE, y: r * TILE + 5, ax: 0, ay: 0, x0: (c + w / 2) * TILE, y0: r * TILE + 5 }); return this; }
    spring(c, r) { this.springs.push({ c, r }); return this; }
    check(c, r = GR) { this.checks.push({ c, r }); return this; }
    goalAt(c, r = GR) { this.goal = { c, r }; return this; }
    thorns(c0, c1, r = GR - 1) { for (let c = c0; c <= c1; c++) this.set(c, r, THORN); return this; }
    thornsDown(c0, c1, r) { for (let c = c0; c <= c1; c++) this.set(c, r, THORN_DOWN); return this; }
    lava(c0, c1, r = GR + 1) { for (let c = c0; c <= c1; c++) for (let q = r; q < this.h; q++) this.set(c, q, LAVA); return this; }
    secret(c, r) { this.set(c, r, SECRET); return this; }
    deco(s, c, r, o = {}) { this.decor.push({ s, x: c * TILE + (o.dx ?? 8), y: r * TILE, ...o }); return this; }
    gate(c, r0, r1) { this.gates.push({ c, r0, r1, closed: false }); return this; }
    /** Hand-scatter by rule: fills open ground with the theme's greenery so levels never look bare. */
    dress() {
        const rock = this.theme === "drain" || this.theme === "vault", castle = this.theme === "keep" || this.theme === "hall", s = this.theme === "dusk" ? "_d" : "";
        let rnd = this.seed * 9301 + 49297;
        const R = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
        const clearAbove = (c, r, up = 2) => { for (let q = r - up; q < r; q++) if (this.get(c, q) !== EMPTY) return false; return true; };
        for (let c = 2; c < this.w - 2; c++) {
            let r = 1;
            while (r < this.h && this.get(c, r) !== GROUND) r++;
            if (r >= this.h || !clearAbove(c, r, 1) || this.get(c, r - 1) !== EMPTY) continue;
            const v = R();
            if (rock) {
                if (this.theme === "vault") continue;
                if (v < 0.1) this.deco("shroom", c, r, { anim: 2 });
                else if (v < 0.17) this.deco("crystal", c, r, { anim: 2 });
                else if (v < 0.22) this.deco("crystal2", c, r, { anim: 2 });
            } else if (castle) {
                if (v < 0.05) this.deco("skullpile", c, r);
            } else {
                if (v < 0.3) this.deco(`tuft${s}`, c, r, { anim: 2 });
                else if (v < 0.38) this.deco("flower", c, r, { anim: 2, dx: 4 + R() * 8 | 0 });
                else if (v < 0.46 && this.get(c + 1, r) === GROUND && clearAbove(c, r, 2)) { this.deco(`bush1${s}`, c, r, { dx: 16 }); c += 1; }
                else if (v < 0.53 && this.get(c + 1, r) === GROUND && this.get(c + 2, r) === GROUND && clearAbove(c, r, 2)) { this.deco(`bush2${s}`, c, r, { dx: 24 }); c += 2; }
                else if (v < 0.6 && this.get(c + 2, r) === GROUND && this.get(c + 1, r) === GROUND && clearAbove(c + 1, r, 5)) { this.deco(`tree${s}`, c, r, { dx: 24 }); c += 2; }
                else if (v < 0.64 && this.get(c + 1, r) === GROUND) { this.deco("rock", c, r, { dx: 12 }); c += 1; }
            }
        }
        return this;
    }
}

function vault(id, returnPipe, build) {
    const R = new Room(id, 22, 15, "vault", { noDeco: true });
    R.ground(0, 21, GR);
    R.fill(0, 0, 1, 12, GROUND); R.fill(20, 0, 21, 12, GROUND); R.fill(0, 0, 21, 1, GROUND);
    R.pipe(2, 12, { id: "in" });                     // you drop out of this one
    R.pipe(18, 11, { id: "out", to: "main", toPipe: returnPipe });
    build(R);
    return R;
}

const LV = (o) => o;
export const WORLDS = [{ name: "PUDDLEBROOK MEADOWS", from: 0, to: 2 }, { name: "THE DRAINWORKS", from: 3, to: 5 }, { name: "STORMKEEP", from: 6, to: 8 }];

// --- 1-1 First Drops: run, stomp, bump, and a first peek at a secret. -------------------------------
function level1() {
    const R = new Room("main", 196, 15, "meadow", { seed: 11 });
    R.start = { c: 3, r: GR };
    R.ground(0, 62);
    R.deco("sign", 8, GR);
    R.hints = [{ c: 8, r: 9, touch: "PUSH THE STICK FAR TO RUN", keys: "SPACE JUMP, HOLD X TO RUN" }, { c: 50, r: 6, touch: "STICK DOWN ON A PIPE", keys: "DOWN ON A PIPE" }];
    R.blocks(14, 9, "C"); R.blocks(19, 9, "BCBMB").blocks(21, 5, "C");
    R.e("sog", 24); R.e("sog", 21, 12, { dir: 1 });
    R.pipe(30, 11); R.coins(28, 8, 1); R.coins(32, 9, 1);
    R.pipe(38, 10); R.e("sog", 35); R.e("sog", 43); R.e("sog", 45);
    R.pipe(49, 9, { id: "a", to: "bonus", toPipe: "in" });
    R.arc(53, 8, 5); R.blocks(57, 8, "H");
    // First real gap: three tiles, with a coin trail teaching the arc.
    R.ground(66, 108); R.arc(62, 8, 5);
    R.blocks(72, 9, "BCB"); R.e("sog", 76); R.e("sog", 78);
    R.blocks(80, 9, "KB"); R.blocks(82, 5, "BCBB"); R.coins(82, 4, 4);
    R.check(86); R.deco("sign", 84, GR);
    R.blocks(92, 9, "BBB"); R.e("snail", 96); R.blocks(98, 9, "C..M..C");
    R.e("sog", 103); R.e("sog", 105); R.e("sog", 107);
    // Terrace steps, a four-tile gap, and a run at the kite.
    R.ground(109, 112, 12); R.ground(113, 116, 11); R.ground(117, 120, 10);
    R.ground(124, 132, 10); R.coins(121, 7, 3); R.e("brolly", 128, 6, { ax: 3, period: 4 });
    R.ground(133, 136, 11); R.ground(137, 140, 12); R.ground(141, 196);
    R.blocks(147, 9, "BBUBB"); R.e("sog", 152); R.e("snail", 156); R.pipe(159, 11, { eel: true });
    R.e("sog", 165);
    R.ground(170, 171, 12); R.ground(172, 173, 11); R.ground(174, 175, 10); R.ground(176, 177, 9);
    R.goalAt(183); R.dress();
    const B = vault("bonus", "a", (V) => {
        for (let r = 4; r <= 10; r += 2) V.coins(6, r, 10);
        V.blocks(8, 11, "XX.XX.XX");
        V.blocks(10, 9, "..");
    });
    return LV({ name: "FIRST DROPS", time: 300, rooms: { main: R, bonus: B } });
}

// --- 1-2 Springwater Steps: platforms and flyers over open air. --------------------------------------
function level2() {
    const R = new Room("main", 206, 15, "meadow", { seed: 23 });
    R.start = { c: 3, r: GR };
    R.ground(0, 26); R.blocks(10, 9, "CBC"); R.e("sog", 15); R.e("brolly", 21, 8, { ay: 2, period: 3 }); R.coins(9, 5, 5);
    R.spring(24, GR);
    // A high shelf reached by spring: the coin line points at it.
    R.fill(28, 6, 40, 6, ONEWAY); R.coins(29, 5, 11);
    R.plat(30, 11, 3, 3.5, 0, 4.2); R.coins(29, 9, 6);
    R.ground(43, 66); R.e("sog", 46); R.e("snail", 54); R.blocks(50, 9, "BMB"); R.pipe(58, 11, { eel: true }); R.e("sog", 63);
    // Two lifts rising past each other.
    R.plat(69, 10, 3, 0, 2.5, 3.5, 0); R.plat(75, 9, 3, 0, 3, 3.5, 0.5); R.coins(72, 5, 3);
    R.e("brolly", 74, 6, { ax: 3, period: 4 });
    R.ground(80, 100); R.check(83); R.blocks(88, 9, "BBKBB"); R.blocks(90, 5, "C"); R.e("sog", 90); R.e("sog", 92); R.e("snail", 96);
    R.pipe(98, 10, { id: "a", to: "bonus", toPipe: "in" });
    // Stepping stones with a choice: low planks or a high cloud road for runners.
    R.fill(103, 10, 105, 10, ONEWAY); R.fill(109, 9, 111, 9, ONEWAY); R.fill(115, 10, 117, 10, ONEWAY);
    R.e("brolly", 107, 7, { ay: 2, period: 2.6 }); R.e("brolly", 113, 6, { ay: 2, period: 2.6, phase: 0.5 });
    R.blocks(104, 5, "~~~~~~~~~~~~~~"); R.coins(105, 4, 12);
    R.ground(120, 138); R.e("snail", 125); R.blocks(130, 9, "C.C.C"); R.e("sog", 133); R.e("sog", 135);
    R.plat(142, 11, 3, 3, 0, 3.6); R.plat(151, 9, 3, 3, 0, 3.6, 0.5);
    R.ground(158, 206); R.e("sog", 163); R.e("sog", 166); R.blocks(170, 9, "BUB"); R.e("snail", 174); R.e("brolly", 178, 8, { ay: 2, period: 3 });
    R.ground(182, 183, 11); R.ground(184, 185, 9);
    R.goalAt(192); R.dress();
    const B = vault("bonus", "a", (V) => {
        V.coins(5, 9, 13); V.coins(5, 6, 13); V.blocks(6, 10, "BBBBBBBBBBB"); V.spring(11, 13); V.blocks(10, 3, "U");
    });
    return LV({ name: "SPRINGWATER STEPS", time: 300, rooms: { main: R, bonus: B } });
}

// --- 1-3 Rainy Evening: falling planks, shells to kick, eels in the culverts. ------------------------
function level3() {
    const R = new Room("main", 214, 15, "dusk", { seed: 37 });
    R.start = { c: 3, r: GR };
    R.ground(0, 34); R.blocks(12, 9, "BCBMB"); R.e("snail", 18); R.e("sog", 22); R.e("sog", 24); R.e("sog", 26); R.e("sog", 28); R.coins(11, 12, 0);
    R.pipe(32, 10, { eel: true });
    R.fallPlat(37, 11, 3); R.fallPlat(42, 10, 3); R.fallPlat(47, 9, 3); R.fallPlat(52, 10, 3);
    R.coins(38, 8, 2); R.coins(43, 7, 2); R.coins(48, 6, 2); R.coins(53, 7, 2);
    R.ground(57, 84); R.pipe(60, 11, { eel: true }); R.pipe(66, 10, { eel: true }); R.e("sog", 64); R.e("brolly", 70, 7, { ax: 3, period: 4 });
    R.blocks(72, 9, "BBBB"); R.blocks(74, 5, "BCB"); R.e("snail", 76); R.e("sog", 81);
    R.check(79);
    // A valley of thorns under one-way planks.
    R.ground(85, 104, 14); R.thorns(85, 104, 13);
    R.fill(87, 10, 90, 10, ONEWAY); R.fill(93, 9, 96, 9, ONEWAY); R.fill(99, 10, 102, 10, ONEWAY); R.e("sog", 94, 8); R.coins(88, 7, 3); R.coins(94, 6, 3); R.coins(100, 7, 3);
    R.ground(105, 132); R.e("snail", 110); R.e("sog", 114); R.e("sog", 116); R.blocks(112, 9, "KCK");
    R.pipe(120, 10, { id: "a", to: "bonus", toPipe: "in" }); R.e("brolly", 125, 8, { ay: 2, period: 3 });
    R.ground(130, 132, 11);
    R.plat(135, 10, 3, 0, 2.5, 3.2); R.fallPlat(141, 9, 3); R.plat(147, 9, 3, 0, 3, 3.2, 0.5); R.coins(142, 6, 2);
    R.ground(152, 214); R.e("sog", 157); R.e("sog", 159); R.pipe(163, 11, { eel: true }); R.e("snail", 168);
    R.blocks(172, 9, "BUB"); R.e("brolly", 176, 7, { ax: 4, period: 4 }); R.e("sog", 180); R.e("sog", 182);
    R.fill(186, 12, 196, 12, HARD); R.fill(189, 11, 196, 11, HARD); R.fill(192, 10, 196, 10, HARD);
    R.goalAt(202); R.dress();
    const B = vault("bonus", "a", (V) => { V.blocks(5, 9, "MCCCCCCCCCCU"); V.coins(5, 12, 12); V.coins(5, 7, 12); });
    return LV({ name: "RAINY EVENING", time: 320, rooms: { main: R, bonus: B } });
}

// --- 2-1 Culvert Mouth: low ceilings, break your way through. ------------------------------------------
function level4() {
    const R = new Room("main", 200, 15, "drain", { seed: 41 });
    R.start = { c: 3, r: GR };
    R.ground(0, 60); R.fill(0, 0, 200 - 1, 1, GROUND);
    R.fill(10, 2, 20, 3, GROUND); R.blocks(14, 9, "CMC"); R.e("sog2", 18); R.e("sog2", 20);
    R.fill(24, 2, 60, 2, GROUND); R.e("drip", 26, 3); R.e("drip", 30, 3); R.e("snail2", 33);
    // A brick wall with a gap at the top: break through when big, or go over it.
    R.fill(38, 9, 39, 12, BRICK); R.coins(38, 7, 2); R.coins(38, 6, 2);
    R.e("sog2", 44); R.e("sog2", 46); R.blocks(43, 9, "B.B.B");
    R.e("drip", 49, 3); R.e("drip", 52, 3); R.pipe(55, 10, { eel: true });
    R.fill(60, 2, 110, 2, GROUND);
    R.ground(64, 92); R.e("snail2", 68); R.e("sog2", 72); R.e("sog2", 74); R.blocks(70, 9, "BCKCB"); R.e("drip", 78, 3); R.e("drip", 81, 3);
    R.check(84);
    R.pipe(88, 10, { id: "a", to: "bonus", toPipe: "in" });
    // Over a flooded trench on a shuttling raft.
    R.plat(95, 10, 3, 4, 0, 4); R.e("brolly", 98, 6, { ax: 3, period: 3.5 });
    R.ground(103, 140); R.fill(110, 2, 140, 3, GROUND); R.blocks(108, 8, "BBBBBBBB"); R.e("sog2", 110, 7); R.e("sog2", 113, 7); R.coins(108, 6, 8);
    R.e("snail2", 120); R.pipe(126, 11, { eel: true }); R.e("sog2", 131); R.e("drip", 133, 4); R.e("drip", 136, 4);
    R.fill(140, 2, 199, 2, GROUND);
    R.plat(143, 9, 3, 0, 2.5, 3.2); R.plat(150, 8, 3, 0, 2.5, 3.2, 0.5);
    R.ground(156, 200); R.blocks(162, 9, "BUB"); R.e("sog2", 165); R.e("snail2", 170); R.e("sog2", 175);
    R.fill(178, 11, 181, 12, HARD); R.fill(180, 9, 181, 10, HARD);
    R.goalAt(188); R.dress();
    const B = vault("bonus", "a", (V) => { V.coins(4, 6, 15); V.coins(4, 8, 15); V.coins(4, 10, 15); V.blocks(10, 4, "U"); V.blocks(7, 9, "...."); });
    return LV({ name: "CULVERT MOUTH", time: 300, rooms: { main: R, bonus: B } });
}

// --- 2-2 Crystal Shafts: tall room, you climb. ---------------------------------------------------------
function level5() {
    const H = 30, G = H - 2, R = new Room("main", 170, H, "drain", { seed: 53 });
    R.start = { c: 3, r: G };
    R.ground(0, 30, G); R.fill(0, 0, 169, 1, GROUND);
    R.blocks(10, G - 4, "CBM"); R.e("sog2", 16, G - 1); R.e("sog2", 20, G - 1); R.thorns(24, 26, G - 1); R.coins(23, G - 5, 5);
    // First shaft: climb the lifts up the wall.
    R.ground(31, 44, G); R.fill(45, 2, 60, 17, GROUND);
    R.plat(33, G - 4, 3, 0, 2, 3); R.fill(37, G - 8, 41, G - 8, ONEWAY); R.plat(41, G - 12, 3, 0, 2, 3, 0.5); R.fill(35, G - 12, 38, G - 12, ONEWAY); R.e("brolly", 39, G - 15, { ax: 2, period: 3 }); R.coins(36, G - 13, 2);
    R.ground(45, 72, G - 8); R.fill(45, 2, 60, 12, GROUND);
    R.clear(45, 13, 72, G - 9); R.fill(45, 2, 72, 9, GROUND);
    R.check(48, G - 8); R.e("snail2", 54, G - 9); R.e("drip", 58, 10); R.e("drip", 62, 10); R.blocks(50, G - 12, "BCB"); R.e("sog2", 66, G - 9); R.thorns(69, 70, G - 9);
    R.clear(61, 10, 72, 12);
    // Second shaft: down a pit of crystal thorns and back up.
    R.ground(73, 110, G); R.thorns(73, 110, G - 1); R.clear(73, 2, 110, G - 2); R.fill(73, 2, 110, 3, GROUND);
    R.plat(75, G - 9, 3, 2.5, 0, 3.4); R.fallPlat(83, G - 10, 3); R.plat(89, G - 12, 3, 0, 3, 3.6); R.fallPlat(95, G - 13, 3); R.plat(101, G - 12, 3, 3, 0, 3.4, 0.25);
    R.coins(84, G - 13, 2); R.coins(96, G - 16, 2);
    R.e("brolly", 87, G - 16, { ay: 2, period: 3 }); R.e("brolly", 99, G - 8, { ay: 3, period: 3 });
    R.ground(111, 130, G - 8); R.clear(111, 2, 130, G - 9); R.fill(111, 2, 130, 7, GROUND);
    R.e("snail2", 116, G - 9); R.blocks(118, G - 12, "CUC"); R.e("sog2", 124, G - 9);
    R.pipe(120, G - 10, { id: "a", to: "bonus", toPipe: "in" });
    R.ground(131, 169, G); R.fill(131, 2, 169, 7, GROUND);
    R.fill(133, G - 5, 136, G - 5, ONEWAY); R.fill(133, G - 2, 136, G - 2, ONEWAY); R.e("sog2", 142, G - 1); R.e("sog2", 145, G - 1); R.e("snail2", 149, G - 1);
    R.goalAt(158, G); R.dress();
    const B = vault("bonus", "a", (V) => { V.blocks(5, 8, "CBCBCBCBCBCBC"); V.coins(5, 11, 13); V.coins(5, 5, 13); });
    return LV({ name: "CRYSTAL SHAFTS", time: 340, rooms: { main: R, bonus: B } });
}

// --- 2-3 Pump Station: crumbling walkways and shell work. ---------------------------------------------
function level6() {
    const R = new Room("main", 208, 15, "drain", { seed: 67 });
    R.start = { c: 3, r: GR };
    R.ground(0, 26); R.fill(0, 0, 207, 1, GROUND); R.blocks(8, 9, "BMB"); R.e("snail2", 14); R.e("sog2", 18); R.e("sog2", 19); R.e("sog2", 20); R.e("sog2", 22);
    R.pipe(24, 11, { eel: true });
    // Crumbling bridge: don't stop running.
    R.blocks(28, 11, "QQQQQQQQQQQQQQQQ"); R.coins(29, 8, 14); R.e("brolly", 36, 7, { ay: 2, period: 2.8 });
    R.ground(45, 72); R.e("sog2", 50); R.e("sog2", 52); R.blocks(48, 9, "CKC"); R.thorns(56, 57); R.thornsDown(53, 60, 2); R.e("snail2", 62); R.e("drip", 66, 2); R.pipe(69, 10, { eel: true });
    R.check(47);
    R.plat(75, 9, 3, 0, 3, 3); R.blocks(81, 9, "QQQQ"); R.plat(87, 9, 3, 0, 3, 3, 0.5); R.blocks(93, 10, "QQQQ"); R.e("brolly", 83, 5, { ax: 2, period: 3 });
    R.ground(99, 134); R.e("sog2", 104); R.e("snail2", 108); R.e("sog2", 112); R.e("sog2", 113); R.blocks(106, 9, "BUB");
    R.pipe(116, 11, { id: "a", to: "bonus", toPipe: "in" }); R.thorns(122, 124); R.blocks(120, 9, "XXXXXXX"); R.coins(120, 8, 7); R.e("drip", 128, 2); R.e("drip", 131, 2);
    R.blocks(137, 10, "QQQ"); R.blocks(143, 9, "QQQ"); R.blocks(149, 10, "QQQ"); R.blocks(155, 11, "QQQ");
    R.e("brolly", 146, 6, { ay: 2, period: 2.6 });
    R.ground(160, 208); R.e("snail2", 165); R.e("sog2", 170); R.e("sog2", 172); R.pipe(176, 10, { eel: true }); R.e("sog2", 182);
    R.goalAt(195); R.dress();
    const B = vault("bonus", "a", (V) => { V.coins(4, 10, 15); V.coins(4, 7, 15); V.blocks(8, 9, "CCCCCCCC"); V.coins(4, 4, 15); V.spring(5, 13); V.spring(16, 13); });
    return LV({ name: "PUMP STATION", time: 320, rooms: { main: R, bonus: B } });
}

// --- 3-1 Storm Ramparts: cannons and wind-torn umbrellas on the walls. -------------------------------
function level7() {
    const R = new Room("main", 204, 15, "keep", { seed: 71 });
    R.start = { c: 3, r: GR };
    R.ground(0, 30); R.blocks(10, 9, "BMB"); R.e("sog3", 15); R.e("sog3", 17); R.e("cannon", 22, 12); R.e("brolly", 27, 8, { ay: 2, period: 3 });
    R.ground(34, 60, 11); R.e("sog3", 40, 10); R.e("snail", 45, 10); R.e("cannon", 50, 10); R.blocks(42, 7, "BCB");
    R.ground(61, 64, 12); R.thorns(61, 64, 11);
    R.fill(60, 7, 66, 7, HARD); R.coins(61, 6, 5);
    R.ground(65, 92, 11); R.e("sog3", 70, 10); R.e("sog3", 72, 10); R.e("cannon", 76, 10); R.pipe(80, 8, { id: "a", to: "bonus", toPipe: "in" }); R.check(84, 11);
    R.plat(95, 9, 3, 0, 2.5, 3); R.plat(101, 8, 3, 2, 0, 3, 0.25); R.e("brolly", 104, 5, { ay: 2, period: 2.6 });
    R.ground(109, 136); R.e("cannon", 113, 12); R.e("sog3", 118); R.e("snail", 122); R.blocks(120, 9, "BUB"); R.e("sog3", 126); R.e("cannon", 131, 12);
    R.fallPlat(139, 10, 3); R.fallPlat(145, 9, 3); R.fallPlat(151, 10, 3); R.e("brolly", 148, 6, { ax: 3, period: 3.4 });
    R.ground(157, 204); R.thorns(162, 163); R.e("cannon", 167, 12); R.e("sog3", 172); R.e("sog3", 174); R.e("brolly", 178, 8, { ay: 2, period: 3 });
    R.ground(182, 186, 11); R.ground(187, 190, 9);
    R.goalAt(194); R.dress();
    for (const [c, r] of [[6, 13], [20, 13], [38, 11], [56, 11], [70, 11], [88, 11], [112, 13], [128, 13], [160, 13], [176, 13]]) R.deco("lamp", c, r);
    const B = vault("bonus", "a", (V) => { V.coins(4, 5, 15); V.coins(4, 7, 15); V.coins(4, 9, 15); V.coins(6, 11, 11); V.blocks(10, 4, "S"); });
    return LV({ name: "STORM RAMPARTS", time: 300, rooms: { main: R, bonus: B } });
}

// --- 3-2 Ember Halls: lava floors, spark rods. ------------------------------------------------------
function level8() {
    const R = new Room("main", 200, 15, "hall", { seed: 83 });
    R.start = { c: 3, r: GR };
    R.ground(0, 22); R.fill(0, 0, 199, 2, GROUND); R.blocks(10, 9, "BMB"); R.e("sog3", 16); R.e("sog3", 18); R.e("rod", 20, 8, { n: 4, speed: 1.5 });
    R.deco("torch", 6, 8); R.deco("torch", 14, 8);
    // First lava bath, with stepping pillars.
    R.ground(23, 44, 14); R.lava(23, 44, 13);
    R.ground(26, 27, 11); R.ground(32, 33, 10); R.ground(38, 39, 11); R.e("ember", 29, 12, { delay: 0 }); R.e("ember", 35, 12, { delay: 1 }); R.e("ember", 41, 12, { delay: 0.5 }); R.coins(26, 8, 2); R.coins(32, 7, 2); R.coins(38, 8, 2);
    R.ground(45, 76); R.fill(53, 3, 76, 5, GROUND); R.e("sog3", 50); R.e("rod", 56, 9, { n: 4, speed: -1.6 }); R.e("snail", 60); R.e("rod", 66, 9, { n: 4, speed: 1.6 }); R.blocks(63, 9, "C"); R.e("sog3", 70); R.e("sog3", 72);
    R.check(48);
    R.pipe(74, 11, { id: "a", to: "bonus", toPipe: "in" });
    R.ground(77, 110, 14); R.lava(77, 110, 13);
    R.plat(79, 10, 3, 2.5, 0, 3.2); R.blocks(86, 10, "QQQ"); R.plat(91, 9, 3, 0, 2.5, 3); R.blocks(96, 10, "QQQ"); R.plat(102, 10, 3, 2.5, 0, 3.2, 0.5);
    R.e("ember", 89, 12, { delay: 0.3 }); R.e("ember", 100, 12, { delay: 0.9 }); R.e("rod", 94, 5, { n: 3, speed: 1.4 });
    R.ground(111, 140); R.e("sog3", 115); R.e("cannon", 120, 12); R.e("snail", 125); R.blocks(123, 9, "BUB"); R.e("rod", 131, 9, { n: 4, speed: 1.8 }); R.e("sog3", 136); R.thornsDown(128, 134, 3);
    R.ground(141, 164, 14); R.lava(141, 164, 13);
    R.ground(143, 144, 11); R.ground(150, 151, 10); R.ground(157, 158, 11); R.e("ember", 147, 12, { delay: 0 }); R.e("ember", 154, 12, { delay: 0.8 }); R.e("rod", 150, 6, { n: 4, speed: 1.4 });
    R.ground(165, 200); R.e("sog3", 170); R.e("sog3", 172); R.e("rod", 176, 9, { n: 4, speed: -1.8 }); R.ground(180, 182, 11); R.ground(183, 185, 9);
    R.goalAt(191); R.dress();
    for (const c of [8, 52, 80, 118, 170]) R.deco("banner", c, 8);
    for (const c of [48, 112, 126, 138, 168, 186]) R.deco("torch", c, 8);
    const B = vault("bonus", "a", (V) => { V.blocks(4, 9, "MUM"); V.coins(9, 9, 9); V.coins(9, 7, 9); V.coins(9, 5, 9); });
    return LV({ name: "EMBER HALLS", time: 300, rooms: { main: R, bonus: B } });
}

// --- 3-3 The Belfry: a short run, then Baron Gloam. -------------------------------------------------
function level9() {
    const R = new Room("main", 100, 15, "hall", { seed: 97 });
    R.start = { c: 3, r: GR };
    R.ground(0, 99); R.fill(0, 0, 99, 1, GROUND);
    R.blocks(10, 9, "BMB"); R.e("sog3", 15); R.blocks(21, 9, "CUC"); R.e("rod", 24, 9, { n: 4, speed: 1.6 }); R.e("sog3", 30); R.e("snail", 33);
    R.ground(36, 39, 14); R.lava(36, 39, 13); R.fill(36, 2, 39, 6, GROUND);
    R.e("rod", 44, 9, { n: 4, speed: -1.6 }); R.blocks(47, 9, "M");
    R.check(53);
    R.ground(60, 60, 13); R.fill(58, 2, 60, 6, GROUND);
    R.gate(58, 7, 12);
    // Arena runs from column 59 to 85.
    R.fill(86, 2, 99, 12, GROUND);
    R.boss = { c: 72, x0: 59 * TILE, x1: 86 * TILE };
    R.deco("banner", 63, 7); R.deco("banner", 72, 7); R.deco("banner", 81, 7); R.deco("torch", 67, 7); R.deco("torch", 77, 7);
    for (const c of [8, 18, 40, 50]) R.deco("torch", c, 8);
    R.dress();
    return LV({ name: "THE BELFRY", time: 400, rooms: { main: R } });
}

export const TITLE_ROOM = () => {
    const R = new Room("title", 240, 15, "meadow", { seed: 5 });
    R.ground(0, 239);
    for (let c = 8; c < 232; c += 26) R.blocks(c, 9, "BCB");
    R.dress();
    return R;
};

export const LEVELS = [level1(), level2(), level3(), level4(), level5(), level6(), level7(), level8(), level9()].map((l, i) => ({ ...l, id: `${Math.floor(i / 3) + 1}-${i % 3 + 1}`, index: i }));

// Where each level sits on the overworld, in map pixels.
export const MAP_NODES = [[70, 196], [128, 146], [186, 212], [262, 160], [330, 208], [402, 140], [470, 196], [526, 134], [588, 152]];
