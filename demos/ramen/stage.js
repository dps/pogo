// The counter: draws the Kitchen sim and turns thumbs into cooking. All game rules live in sim.js.
import { BROTHS, DECOR, LOCATIONS, NOODLES, RECIPES, REGULARS, TOPPINGS } from "./data.js";
import { TUNE } from "./sim.js";
import { BOWL, WHOLE, clamp, mix } from "./art.js";
import { MOOD, PH, PW, lookName } from "./people.js";
import { BGH, BGW, paintPlace } from "./places.js";
import { greeting } from "./progress.js";

export const FONT = '"Arial Rounded MT Bold",ui-rounded,"SF Pro Rounded","Trebuchet MS",system-ui,sans-serif';
export const SERIF = 'Georgia,"Iowan Old Style","Palatino Linotype",serif';
export const CREAM = "#fbeed3", SOY = "#2a1712", RED = "#b8332a", AMBER = "#f4a93c", GOLD = "#ffd76a", GREEN = "#86c24a";

const ease = (t) => 1 - (1 - t) * (1 - t);
const back = (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const money = (n) => "¥" + Math.round(n).toLocaleString("en-US");
export { money };

// Where a level (0 to 1.22) sits as a fraction of the inside of the bowl.
const levelK = (L) => clamp(0.34 + 0.58 * Math.sqrt(clamp(L / 1.05, 0, 1.2)), 0, 1);
export const lookOf = (c) => (c.who === "nana" ? 12 : REGULARS[c.who] ? REGULARS[c.who].look : 13 + c.look % 6);

/** Draw one bowl, from a plain description, so cookbook pages and the counter share it. */
export function drawBowl(d, x, y, r, o = {}) {
    const k = r / BOWL.rx, ry = r * BOWL.ry / BOWL.rx, ix = r * 0.9, iy = ry * 0.9, t = o.t ?? 0;
    d.sprite("glow", { x: x + 6, y: y + r * 0.86, width: r * 2.5, height: r * 0.72, color: "#000000", opacity: 0.45 });
    d.sprite("bowl", { frame: o.glaze ?? 0, x, y: y + (BOWL.h / 2 - BOWL.cy) * k, width: BOWL.w * k, height: BOWL.h * k });
    const level = o.level ?? 0;
    if (level > 0.01 && o.broth) {
        const kl = levelK(level), B = BROTHS[o.broth], wob = 1 + Math.sin(t * 9) * 0.006 * (o.slosh ?? 0.5) + (o.dip ?? 0) * 0.02;
        d.sprite("broth", { frame: B.frame, x, y: y + (1 - kl) * iy * 0.34, width: ix * 2 * kl * wob, height: iy * 2 * kl / wob, opacity: clamp(level * 5) });
        const sw = t * 0.4;
        d.additive(() => d.sprite("glow", { x: x - ix * 0.28 + Math.sin(sw) * 3, y: y - iy * 0.36, width: ix * 0.8, height: iy * 0.42, opacity: 0.16 }));
    }
    if (o.noodle) d.sprite("nest", { frame: NOODLES[o.noodle].frame, x: x + 1, y: y + iy * 0.03, width: ix * 1.5, height: iy * 1.5 });
    const tops = o.tops ?? {};
    for (const id of Object.keys(TOPPINGS)) {
        const T = TOPPINGS[id], has = tops[id] !== undefined, ghost = o.ghosts?.includes(id);
        if (!has && !ghost) continue;
        const sx = x + T.slot[0] * ix * 0.86, sy = y + T.slot[1] * iy * 0.86, size = T.size * ix * 1.9;
        const pop = has ? (o.pops?.[id] ?? 0) : 0, sq = 1 + pop * 0.4;
        if (ghost && !has) {
            d.sprite("tops", { frame: T.frame, x: sx, y: sy, width: size, height: size * 0.82, color: "#2a1712", opacity: 0.22 + Math.sin(t * 4) * 0.06 });
            continue;
        }
        const loose = tops[id] === false ? 0.09 : 0, seed = T.frame * 2.4;
        d.sprite("tops", { frame: T.frame, x: sx + Math.cos(seed) * loose * ix, y: sy + Math.sin(seed) * loose * iy, width: size * sq, height: size * 0.82 / (1 + pop * 0.2), rot: loose * Math.sin(seed * 3) * 3 });
    }
}

export class Stage {
    constructor(game, s, k, o) {
        Object.assign(this, { game, s, k, o, save: o.save, snd: o.sound });
        this.loc = LOCATIONS[k.shift.loc];
        this.bg = paintPlace(game.assets, this.loc.id);
        this.glaze = DECOR.glaze.items.findIndex((x) => x.id === o.save.equip.glaze);
        this.noren = DECOR.noren.items.find((x) => x.id === o.save.equip.noren);
        this.lantern = DECOR.lantern.items.find((x) => x.id === o.save.equip.lantern);
        this.charm = DECOR.charm.items.findIndex((x) => x.id === o.save.equip.charm);
        this.t = 0; this.grab = null; this.puffs = []; this.floats = []; this.coins = []; this.slides = []; this.flights = []; this.ripples = []; this.weather = []; this.drips = [];
        this.seatVis = new Map(); this.bowlFx = k.bowls.map(() => ({ dip: 0, vd: 0, tilt: 0, pops: {}, born: 0.5, flick: 0, wob: 0 }));
        this.potFx = k.pots.map(() => ({ shake: 0, lift: 0, bubble: 0 })); this.binFx = k.bins.map(() => ({ chop: 0, shake: 0, pulse: 0, knife: 1 }));
        this.brothFx = k.brothList.map(() => ({ shake: 0 }));
        this.ladle = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, on: 0, pot: -1 };
        this.bubble = null; this.idle = 0; this.cashShown = 0; this.flow = 0; this.rushed = 0; this.banner = null; this.trainV = -2; this.trainAt = null; this.spillCool = 0; this.endT = -1; this.focus = 0;
        this.layout();
    }

    get v() { return this.game.view; }

    // --- Layout: every position in the game comes from here. ---------------------------------------------------
    layout() {
        const v = this.v, W = v.width, H = v.height, safe = v.safe, land = W > H * 1.05, k = this.k, flip = this.save.hand === "left";
        const L = this.L = { W, H, land, safe };
        const nb = k.bowls.length, nn = k.pots.length, nf = k.brothList.length, nt = k.bins.length, seats = k.seats.length;
        if (!land) {
            const sc = Math.min(1.28, W / 360), hTall = Math.max(0, H - 640);
            L.counter = Math.round(H * 0.375);
            L.seatY = L.counter + 4;
            L.bustH = Math.min(128, 108 + hTall * 0.1) * sc;
            L.ticketW = Math.min(106 * sc, (W - 10) / seats - 5);
            L.pdx = 0; L.tdx = 0; L.tickY = safe.top + 64;
            const r = [72, 62, 52][nb - 1] * Math.min(1.2, sc) * (1 + Math.min(0.1, hTall / 900));
            const by = L.counter + 16 + r * 0.82 + hTall * 0.14;
            L.bowls = k.bowls.map((_, i) => ({ x: W / 2 + (i - (nb - 1) / 2) * Math.min((W - 24) / nb, r * 2.5), y: by, r }));
            const binH = Math.min(96, (W - 12) / Math.max(nt, 3.6) * 1.15) * 1, binW = Math.min((W - 12) / nt, 100 * sc);
            const binY = H - safe.bottom - binH / 2 - 6;
            L.bins = k.bins.map((_, i) => ({ x: W / 2 + (i - (nt - 1) / 2) * binW, y: binY, w: binW - 4, h: binH }));
            const room = binY - binH / 2 - (by + r * 0.92), py = by + r * 0.92 + room * 0.5;
            const total = nn + nf, pw = Math.min(84 * sc, (W - 16) / total - 2);
            const xs = Array.from({ length: total }, (_, i) => W / 2 + (i - (total - 1) / 2) * (pw + 3));
            const a = xs.slice(0, nn), b = xs.slice(nn);
            L.pots = k.pots.map((_, i) => ({ x: flip ? W - a[i] : a[i], y: py, w: pw }));
            L.broths = k.brothList.map((_, i) => ({ x: flip ? W - b[i] : b[i], y: py, w: pw }));
        } else {
            L.counter = Math.round(H * 0.41);
            L.seatY = L.counter + 3; L.bustH = L.counter - safe.top - 42;
            const cell = (W - safe.left - safe.right) / seats;
            L.ticketW = Math.min(88, cell * 0.47);
            L.pdx = -cell * 0.21; L.tdx = cell * 0.26; L.tickY = Math.max(safe.top + 46, L.counter - L.ticketW * 0.82 - 10);
            const binH = Math.min(74, H * 0.19), binW = Math.min(92, (W * 0.62) / nt), binY = H - safe.bottom - binH / 2 - 5;
            L.bins = k.bins.map((_, i) => ({ x: W / 2 + (i - (nt - 1) / 2) * binW, y: binY, w: binW - 4, h: binH }));
            const room = binY - binH / 2 - L.counter, r = Math.min(room * 0.56, [62, 56, 48][nb - 1]), by = L.counter + 8 + r * 0.8;
            L.bowls = k.bowls.map((_, i) => ({ x: W / 2 + (i - (nb - 1) / 2) * (r * 2.3), y: by, r }));
            const pw = Math.min(64, (W / 2 - nb * r * 1.2 - safe.left - 10) / 3 - 2), py = L.counter + room * 0.56;
            const left = safe.left + 8 + pw / 2, right = W - safe.right - 8 - pw / 2;
            L.pots = k.pots.map((_, i) => { const p = i * (pw + 3); return { x: flip ? right - p : left + p, y: py, w: pw }; });
            L.broths = k.brothList.map((_, i) => { const p = i * (pw + 3); return { x: flip ? left + p : right - p, y: py, w: pw }; });
        }
        const inset = safe.left + 2, span = W - safe.left - safe.right - 4;
        L.seats = k.seats.map((_, i) => ({ x: inset + span * (i + 0.5) / seats, y: L.seatY }));
        this.L.lanterns = [];
        const n = land ? 5 : 3;
        for (let i = 0; i < n; i++) L.lanterns.push(W * (i + 0.5) / n);
    }

    // --- Input -------------------------------------------------------------------------------------------------
    hitBowl(x, y, grow = 1.12) {
        let best = -1, bd = 1e9;
        this.L.bowls.forEach((b, i) => { const dd = Math.hypot((x - b.x) / (b.r * grow), (y - b.y) / (b.r * grow * 0.86)); if (dd < 1 && dd < bd) { bd = dd; best = i; } });
        return best;
    }
    hitPot(list, x, y) { return list.findIndex((p) => Math.abs(x - p.x) < p.w * 0.54 && Math.abs(y - p.y) < p.w * 0.6); }
    hitBin(x, y) { return this.L.bins.findIndex((b) => Math.abs(x - b.x) < b.w * 0.53 && Math.abs(y - b.y) < b.h * 0.56); }

    input(dt) {
        const P = this.s.input.pointer, k = this.k, x = P.x, y = P.y;
        if (P.pressed && !this.grab) {
            this.idle = 0;
            // After a dropped frame the finger has already moved on, so judge the touch by where it landed.
            const start = this.s.input.primary, px = start?.startX ?? x, py = start?.startY ?? y;
            const bin = this.hitBin(px, py), np = this.hitPot(this.L.pots, px, py), fp = this.hitPot(this.L.broths, px, py), bowl = this.hitBowl(px, py);
            if (bin >= 0 && k.bins[bin].gull) { k.shoo(bin); }
            else if (bin >= 0) this.grab = { type: "bin", i: bin, x0: px, y0: py, mode: null, side: 0, x, y, t: 0 };
            else if (np >= 0) this.grab = { type: "pot", i: np, x0: px, y0: py, x, y, t: 0, pull: 0 };
            else if (fp >= 0) { if (k.takeLadle(k.brothList[fp])) { const p = this.L.broths[fp], l = this.ladle; this.grab = { type: "ladle", i: fp, x, y }; l.x = p.x; l.y = p.y - 8; l.vx = l.vy = 0; l.pot = fp; this.brothFx[fp].shake = 1; } }
            else if (bowl >= 0) this.grab = { type: "bowl", i: bowl, x0: px, y0: py, x, y, t: 0, id: k.bowls[bowl].id };
        }
        const g = this.grab;
        if (!g) return;
        this.idle = 0;
        g.x = x; g.y = y; g.t = (g.t ?? 0) + dt;
        const up = (g.y0 ?? y) - y, side = x - (g.x0 ?? x);
        if (g.type === "bin") {
            const box = this.L.bins[g.i], bin = k.bins[g.i], sliced = TOPPINGS[bin.id].sliced;
            if (!g.mode) {
                if (Math.abs(side) > 11 && sliced && up < Math.abs(side) * 0.6) { g.mode = "chop"; g.side = side > 0 ? 1 : -1; this.chop(g.i); g.far = x; }
                else if (up > 8 && bin.stock > 0) { g.mode = "pick"; this.snd.sfx({ wave: "triangle", freq: 500, to: 640, decay: 0.05, volume: 0.1 }, "tick"); }
            } else if (g.mode === "chop" && y < box.y - box.h * 0.6 && k.bins[g.i].stock > 0) {
                g.mode = "pick";       // A shallow drag that climbs out of the board was a pickup all along.
            } else if (g.mode === "chop") {
                // Each change of direction is a stroke; going past the far edge counts too.
                const dir = x - g.far;
                if (Math.abs(dir) > 15 && Math.sign(dir) !== g.side) { g.side = Math.sign(dir); g.far = x; const j = this.hitBin(x, box.y); if (j >= 0 && TOPPINGS[k.bins[j].id].sliced) this.chop(j); }
                else if (Math.sign(dir) === g.side) g.far = x;
            }
            if (P.released || !P.down) { this.releaseBin(g, x, y); this.grab = null; }
        } else if (g.type === "pot") {
            const p = k.pots[g.i], ph = k.potPhase(p);
            if (p.state === "cook" && up > 6) { g.pull = clamp(up / 70); this.potFx[g.i].lift = g.pull; this.snd.lift(g.pull); }
            if (P.released || !P.down) {
                const held = up > 14;
                if (p.state === "empty") { if (!held) k.dropNoodle(g.i); }
                else if (ph === "mush" && !held) k.dump(g.i);
                else {
                    const b = this.hitBowl(x, y - 30, 1.3);
                    this.lastPull = { x, y };
                    if (!k.pull(g.i, b)) this.potFx[g.i].shake = 1;
                }
                this.potFx[g.i].lift = 0;
                this.grab = null;
            }
        } else if (g.type === "ladle") {
            const b = this.hitBowl(x, y - 40, 1.2);
            k.aimLadle(b);
            if (P.released || !P.down) { k.aimLadle(-1); k.putLadle(); this.grab = null; }
        } else if (g.type === "bowl") {
            const fx = this.bowlFx[g.i]; fx.flick = clamp(up / 34, -0.3, 1);
            const stale = k.bowls[g.i].id !== g.id;
            if (stale) { this.grab = null; fx.flick = 0; return; }
            if (up > 26 || Math.abs(side) > 40) { fx.flick = 0; this.flickSeat = x - g.x0; k.serve(g.i); this.grab = null; return; }
            if (P.released || !P.down) {
                fx.flick = 0;
                if (g.t < 0.3 && k.complete(k.bowls[g.i])) k.serve(g.i);
                else if (g.t < 0.3) { fx.wob = 1; }
                this.grab = null;
            }
        }
    }

    chop(i) {
        if (!this.k.chop(i)) { this.binFx[i].shake = 1; return; }
    }

    releaseBin(g, x, y) {
        const k = this.k, bin = k.bins[g.i];
        if (g.mode === "pick") {
            const hy = y - 38, b = this.hitBowl(x, hy, 1.25);
            if (b >= 0) {
                const T = TOPPINGS[bin.id], box = this.L.bowls[b], ix = box.r * 0.9, iy = ix * 0.714;
                const sx = box.x + T.slot[0] * ix * 0.86, sy = box.y + T.slot[1] * iy * 0.86, off = Math.hypot(x - sx, hy - sy);
                this.lastDrop = { x, y: hy };
                k.place(g.i, b, off < box.r * 0.5);
            } else if (y < this.L.bins[g.i].y - this.L.bins[g.i].h * 0.7) { this.lastDrop = { x, y: hy }; k.place(g.i, -1, false); }
        } else if (!g.mode) {
            this.lastDrop = null;
            if (bin.stock <= 0 && TOPPINGS[bin.id].sliced) this.chop(g.i);
            else if (g.t < 0.4) k.place(g.i, -1, false);
        }
    }

    keys() {
        const I = this.s.input, k = this.k;
        const list = k.bowls.filter((b) => b.c).sort((a, b) => a.c.id - b.c.id);
        if (I.pressed("nextBowl")) this.focus++;
        const f = list.length ? list[this.focus % list.length] : null;
        this.keyBowl = f ? f.i : -1;
        if (I.pressed("noodle")) {
            const p = k.pots.find((q) => q.state === "cook" && !["raw", "mush"].includes(k.potPhase(q)) && k.bowlForPot(q)) ?? k.pots.find((q) => q.state === "cook" && k.potPhase(q) === "mush") ?? k.pots.find((q) => q.state === "empty");
            if (p) { if (p.state === "empty") k.dropNoodle(p.i); else if (k.potPhase(p) === "mush") k.dump(p.i); else k.pull(p.i); }
        }
        if (f && I.pressed("pour") && !this.grab) {
            const j = k.brothList.indexOf(RECIPES[f.c.recipe].broth);
            if (j >= 0 && k.takeLadle(k.brothList[j])) { const p = this.L.broths[j], l = this.ladle, B = this.L.bowls[f.i]; this.grab = { type: "keyLadle", i: j, bowl: f.i }; l.x = p.x; l.y = p.y; l.pot = j; l.vx = l.vy = 0; k.aimLadle(f.i); this.keyPour = B; }
        }
        if (this.grab?.type === "keyLadle") {
            k.aimLadle(this.grab.bowl);
            if (!I.down("pour")) { k.aimLadle(-1); k.putLadle(); this.grab = null; }
        }
        for (let i = 0; i < k.bins.length; i++) if (I.pressed(`bin${i + 1}`)) {
            if (k.bins[i].gull) k.shoo(i);
            else if (k.bins[i].stock <= 0) this.chop(i);
            else { this.lastDrop = null; k.place(i, f && k.bowlWantingTop(k.bins[i].id, f.i) ? f.i : -1, true); }
        }
        if (f && I.pressed("serve")) k.serve(f.i);
    }

    // --- The step ----------------------------------------------------------------------------------------------
    update(dt) {
        const k = this.k;
        this.t += dt; this.snd.tick();
        if (this.endT < 0) { this.keys(); this.input(dt); }
        k.step(dt);
        for (const e of k.events) this.event(e);
        k.events.length = 0;
        this.idle += dt;
        this.animate(dt);
    }

    float(x, y, text, o = {}) { this.floats.push({ x, y, text, t: 0, life: o.life ?? 1.1, color: o.color ?? CREAM, size: o.size ?? 17, big: !!o.big }); }
    bowlPos(i) { return this.L.bowls[i]; }

    event(e) {
        const { k, snd, s, L } = this;
        switch (e.type) {
            case "arrive": snd.bell(); break;
            case "seat": {
                const seat = L.seats[e.c.seat];
                this.seatVis.set(e.c.id, { rise: 0, pop: 0, x: seat.x, spoke: false, leave: 0 });
                if (e.c.who && (REGULARS[e.c.who])) {
                    const line = greeting(this.save, e.c.who, Math.floor(k.time * 7));
                    if (line) this.bubble = { c: e.c, text: line, t: 0, life: 3.4, name: REGULARS[e.c.who].name };
                }
                if (e.c.who === "nana") this.bubble = { c: e.c, text: "...", t: 0, life: 6, name: "Nana Umi" };
                break;
            }
            case "ticket": this.bowlFx[e.bowl].born = 0; this.bowlFx[e.bowl].pops = {}; break;
            case "drop": {
                const p = L.pots[e.pot]; snd.drop(); this.potFx[e.pot].shake = 0.6;
                s.burst({ at: [p.x, p.y - p.w * 0.2], count: 8, color: ["#fff6dc", "#e8d9a8"], speed: [30, 90], life: [0.15, 0.35], size: [1.5, 3], gravity: 300, angle: -Math.PI / 2, spread: 1.4 });
                break;
            }
            case "noodlesReady": snd.ready(); this.potFx[e.pot].ping = 1; break;
            case "noodlesOver": snd.over(); this.float(L.pots[e.pot].x, L.pots[e.pot].y - 36, "Overdone!", { color: "#ffc0a0", size: 13 }); break;
            case "notYet": { snd.nope(); this.potFx[e.pot].shake = 1; this.float(L.pots[e.pot].x, L.pots[e.pot].y - 36, "Still raw", { size: 13 }); break; }
            case "noBowl": snd.nope(); this.potFx[e.pot].shake = 1; break;
            case "noOrder": this.potFx[e.pot].shake = 0.5; this.float(L.pots[e.pot].x, L.pots[e.pot].y - 36, "No orders yet", { size: 13 }); break;
            case "dump": snd.drop(); break;
            case "pulled": {
                const b = L.bowls[e.bowl], p = L.pots[e.pot], from = this.lastPull ?? { x: p.x, y: p.y };
                this.lastPull = null;
                this.flights.push({ kind: e.kind, x0: from.x, y0: Math.min(from.y, p.y) - 20, x1: b.x, y1: b.y, t: 0, dur: 0.22, bowl: e.bowl, q: e.q });
                break;
            }
            case "scoop": snd.scoop(); break;
            case "wrongBroth": { snd.nope(); this.bowlFx[e.bowl].wob = 1; const b = k.bowls[e.bowl]; if (b.c) this.float(L.bowls[e.bowl].x, L.bowls[e.bowl].y - 44, `Wants ${BROTHS[RECIPES[b.c.recipe].broth].name}`, { size: 14, color: "#ffd9b0" }); break; }
            case "spill": { const b = L.bowls[e.bowl]; snd.nope(); s.shake(1.5, 0.1); this.float(b.x, b.y - b.r * 0.7, "Whoa! Too full", { size: 14, color: "#ffc0a0" }); s.burst({ at: [b.x + b.r * 0.6, b.y + 10], count: 18, color: [BROTHS[k.bowls[e.bowl].brothKind ?? "shoyu"].color, CREAM], speed: [30, 110], life: [0.3, 0.6], size: [2, 4], gravity: 500, angle: Math.PI / 2, spread: 2 }); break; }
            case "poured": {
                const q = k.brothQuality(e.level), b = L.bowls[e.bowl];
                if (q === 2) { snd.climb("light"); this.float(b.x, b.y - b.r * 0.82, "Right on the line!", { color: GOLD, size: 15 }); this.flow += 0.2; }
                else { snd.stumble(); this.float(b.x, b.y - b.r * 0.82, q === 1 ? (e.level < 1 ? "A bit shy" : "A bit full") : "Top it up", { size: 13 }); }
                break;
            }
            case "chop": {
                const b = L.bins[e.bin], f = this.binFx[e.bin];
                snd.chop(); f.chop = 1; f.knife = -f.knife; f.pulse = 1;
                const id = k.bins[e.bin].id, col = { chashu: ["#e8a888", "#fff0d8"], egg: ["#ffffff", "#f8a13a"], negi: ["#8fc058", "#d8ecb0"], swirl: ["#ffffff", "#f06090"], tomato: ["#e0402a", "#ffb060"], mushroom: ["#8a5a38", "#f0d8b0"] }[id] ?? [CREAM, CREAM];
                s.burst({ at: [b.x, b.y - 4], count: 6, color: col, speed: [40, 120], life: [0.15, 0.32], size: [1.5, 3.2], gravity: 500, angle: -Math.PI / 2, spread: 1.5 });
                if (e.staff) this.float(b.x, b.y - b.h * 0.6, "Mio!", { size: 12, color: "#ffd0a0" });
                break;
            }
            case "placed": {
                const box = L.bowls[e.bowl], T = TOPPINGS[e.id], ix = box.r * 0.9, iy = ix * 0.714, bin = L.bins[e.bin], from = this.lastDrop ?? { x: bin.x, y: bin.y };
                this.lastDrop = null;
                this.flights.push({ top: T.frame, id: e.id, x0: from.x, y0: from.y, x1: box.x + T.slot[0] * ix * 0.86, y1: box.y + T.slot[1] * iy * 0.86, t: 0, dur: e.neat ? 0.09 : 0.16, bowl: e.bowl, neat: e.neat, size: T.size * ix * 1.9 });
                break;
            }
            case "emptyBin": { snd.nope(); this.binFx[e.bin].shake = 1; if (TOPPINGS[k.bins[e.bin].id].sliced) this.float(L.bins[e.bin].x, L.bins[e.bin].y - L.bins[e.bin].h * 0.6, "Chop me!", { size: 13 }); break; }
            case "noTop": snd.nope(); this.binFx[e.bin].shake = 1; break;
            case "notReady": { snd.nope(); this.bowlFx[e.bowl].wob = 1; const m = k.missing(k.bowls[e.bowl]); this.float(L.bowls[e.bowl].x, L.bowls[e.bowl].y - 40, m[0] === "noodles" ? "Needs noodles" : "Needs broth", { size: 14 }); break; }
            case "gull": { snd.gull(); const b = L.bins[e.bin]; this.binFx[e.bin].gull = 0; this.float(b.x, b.y - b.h * 0.7, "Shoo it!", { size: 13, color: "#ffe0a0" }); break; }
            case "gullSteal": { snd.steal(); this.binFx[e.bin].shake = 1; this.float(L.bins[e.bin].x, L.bins[e.bin].y - L.bins[e.bin].h * 0.7, "Thief!", { size: 13, color: "#ffc0a0" }); break; }
            case "shoo": { snd.shoo(); const b = L.bins[e.bin]; s.burst({ at: [b.x, b.y - 6], count: 12, color: ["#ffffff", "#c8d0da"], speed: [80, 200], life: [0.25, 0.5], size: [2, 4], gravity: 300 }); this.flee = { x: b.x, y: b.y - 10, t: 0 }; break; }
            case "trainWarn": { snd.trainWarn(); this.trainAt = e.at; this.banner = { text: "Train due!", t: 0, life: 1.6, color: GOLD }; break; }
            case "train": { snd.train(); this.trainV = -1; s.shake(1.6, 0.5); this.trainAt = null; break; }
            case "partyDone": { const p = L.seats[e.c.seat] ?? { x: L.W / 2, y: L.counter }; this.float(p.x, L.counter - 60, `Party tip ${money(e.bonus)}`, { color: GOLD, size: 15, big: true }); break; }
            case "serve": this.serveFx(e); if (e.staff) this.float(L.bowls[e.bowl].x, L.bowls[e.bowl].y, "Sora!", { size: 13, color: "#ffd0a0" }); break;
            case "slurp": {
                const vis = this.seatVis.get(e.c.id), seat = L.seats[e.c.seat];
                snd.slurp();
                if (vis) vis.pop = 1;
                if (e.rating === 3) for (let i = 0; i < 10; i++) this.puff(seat.x + (i - 5) * 6, L.counter - 8, 1.4, 1.1, true);
                break;
            }
            case "walk": {
                snd.walk(); snd.stumble();
                const seat = L.seats[e.c.seat];
                const v = this.seatVis.get(e.c.id); if (v) v.walk = true;
                this.float(seat.x, L.counter - 70, "Maybe next time", { size: 13, color: "#ffd0b8" });
                break;
            }
            case "leave": { const v = this.seatVis.get(e.c.id); if (v) v.leave = 0.001; break; }
            case "clearBowl": this.bowlFx[e.bowl].born = 0; break;
            case "end": this.endT = 0; if (this.grab) { this.grab = null; } this.snd.hush(); break;
        }
    }

    serveFx(e) {
        const { L, snd, s, k } = this, B = L.bowls[e.bowl], seat = L.seats[e.c.seat], snap = e.snap;
        snd.slide();
        this.slides.push({ snap: { ...snap, noodle: snap.noodle?.kind, recipe: e.c.recipe }, x0: B.x, y0: B.y, r0: B.r, x1: seat.x, y1: L.counter + 6, r1: Math.min(30, L.W / k.seats.length * 0.28), t: 0, dur: TUNE.slide, e });
        this.bowlFx[e.bowl] = { dip: 0, vd: 0, tilt: 0, pops: {}, born: 0, flick: 0, wob: 0 };
        for (let i = 0; i < 6; i++) this.puff(B.x + (i - 3) * 8, B.y, 0.6, 0.7);
        if (e.rating < 3) snd.stumble();
        void s;
    }

    /** The bowl has reached the customer: the payoff. */
    landFx(sl) {
        const { L, snd, s } = this, e = sl.e, x = sl.x1, y = L.counter;
        const label = ["", "OK", "Tasty", "PERFECT"][e.rating], vis = this.seatVis.get(e.c.id);
        if (vis) vis.pop = 1;
        if (e.rating === 3) {
            snd.perfect(); s.freeze(0.05);
            s.flash("#ffe7a8", 0.1); s.shake(1.2, 0.14, { haptic: false });
            for (let i = 0; i < 26; i++) this.puff(x + Math.cos(i) * 34, y - Math.abs(Math.sin(i * 1.7)) * 16, 1.9, 1.4, true);
            s.burst({ at: [x, y - 40], count: 26, color: [GOLD, "#fff6d8"], speed: [80, 240], life: [0.3, 0.7], size: [2, 4.5], gravity: 240 });
            this.ripples.push({ x, y: y - 44, t: 0, life: 0.5, r: 60, c: GOLD });
            this.float(x, y - 66, label, { color: GOLD, size: 26, big: true, life: 1.3 });
            this.flow = Math.min(1, this.flow + 0.34);
            if (!this.momented || e.combo % 3 === 0) { this.momented = true; this.moment = { x, t: 0 }; this.s.timeScale = 0.45; for (let i = 0; i < 16; i++) this.puff(x + (i - 8) * 13, y - 6, 2.6, 1.9, true); }
        } else { (e.rating === 2 ? snd.good() : snd.meh()); this.float(x, y - 66, label, { color: CREAM, size: 20, big: true }); this.flow *= e.rating === 2 ? 0.8 : 0.3; }
        if (e.combo >= 2) this.float(x, y - 42, `${e.combo} in a row`, { color: "#ffc98a", size: 14 });
        const n = 3 + e.rating * 2;
        for (let i = 0; i < n; i++) this.coins.push({ x: x + (i - n / 2) * 7, y: y - 24, t: -i * 0.04, x1: 0, y1: 0 });
        this.cashTarget = this.k.cash;
        if (e.tip) this.float(x + 20, y - 18, `+${money(e.pay + e.tip)}`, { size: 14, color: "#ffe9b0" });
    }

    puff(x, y, size = 1, life = 1.2, gold = false) {
        if (this.puffs.length > 90) return;
        const R = this.game.fxRng, rnd = () => R.next();
        this.puffs.push({ x, y, vx: (R.next?.() ?? 0.5) * 16 - 8, vy: -14 - (R.next?.() ?? 0.5) * 22, t: 0, life: life * (0.8 + (R.next?.() ?? 0.5) * 0.4), size, gold, seed: (R.next?.() ?? 0.5) * 6.28 });
    }

    animate(dt) {
        const { k, L, snd, s } = this;
        const R = () => this.game.fxRng.next?.() ?? 0.5;
        // Steam from every full bowl, and pots at the boil.
        k.bowls.forEach((b, i) => {
            const f = this.bowlFx[i], B = L.bowls[i];
            f.born = Math.min(1, f.born + dt / 0.28);
            f.vd += (-f.dip * 240 - f.vd * 16) * dt; f.dip += f.vd * dt;
            f.wob = Math.max(0, f.wob - dt * 3.2);
            for (const id of Object.keys(f.pops)) f.pops[id] = Math.max(0, f.pops[id] - dt * 5);
            if (b.level > 0.4 && R() < dt * 9) this.puff(B.x + (R() - 0.5) * B.r * 1.1, B.y - B.r * 0.2 + (R() - 0.5) * B.r * 0.3, 0.7 + R() * 0.5, 1.5);
        });
        let boiling = 0;
        k.pots.forEach((p, i) => {
            const f = this.potFx[i], P = L.pots[i];
            f.shake = Math.max(0, f.shake - dt * 4); f.ping = Math.max(0, (f.ping ?? 0) - dt * 2.4);
            if (p.state === "cook") { boiling++; if (R() < dt * 7) this.puff(P.x + (R() - 0.5) * P.w * 0.4, P.y - P.w * 0.24, 0.55, 1.1); }
        });
        k.brothList.forEach((_, i) => { const f = this.brothFx[i], P = L.broths[i]; f.shake = Math.max(0, f.shake - dt * 5); if (R() < dt * 3) this.puff(P.x + (R() - 0.5) * P.w * 0.4, P.y - P.w * 0.24, 0.45, 1); });
        snd.boil(boiling);
        k.bins.forEach((_, i) => { const f = this.binFx[i]; f.chop = Math.max(0, f.chop - dt * 8); f.shake = Math.max(0, f.shake - dt * 4); f.pulse = Math.max(0, f.pulse - dt * 6); });

        // The ladle has weight: it lags the thumb, sags while full, and swings as it moves.
        const l = this.ladle, lk = k.ladle, B = this.grab?.type === "keyLadle" ? L.bowls[this.grab.bowl] : null;
        if (lk) {
            // The cup follows the thumb from above, so the thumb never hides the bowl.
            const arm = 46, cx = B ? B.x : this.grab?.type === "ladle" ? this.grab.x : null, cy = B ? B.y - 36 : this.grab?.type === "ladle" ? this.grab.y - 74 : null;
            const tx = cx === null ? l.x : cx + arm * Math.cos(l.rot), ty = (cy === null ? l.y : cy + arm * Math.sin(l.rot)) + (lk.fill / TUNE.pour.volume) * 8;
            l.on = Math.min(1, l.on + dt * 9);
            const K = 150, D = 15;
            l.vx += ((tx - l.x) * K - l.vx * D) * dt; l.vy += ((ty - l.y) * K - l.vy * D + 90 * (lk.fill / TUNE.pour.volume)) * dt;
            l.x += l.vx * dt; l.y += l.vy * dt;
            l.rot += ((-lk.tilt * 0.95 + clamp(l.vx * 0.0014, -0.3, 0.3)) - l.rot) * Math.min(1, dt * 16);
            if (lk.flow > 0.02) {
                const bi = lk.bowl, f = this.bowlFx[bi], bb = L.bowls[bi];
                f.vd -= lk.flow * dt * 26;
                if (R() < dt * 26) s.burst({ at: [this.stream?.x1 ?? bb.x, this.stream?.y1 ?? bb.y], count: 2, color: [BROTHS[lk.kind].light, "#fff6dc"], speed: [20, 70], life: [0.12, 0.26], size: [1, 2.4], gravity: 340, angle: -Math.PI / 2, spread: 1.6 });
                if (R() < dt * 10) this.ripples.push({ x: this.stream?.x1 ?? bb.x, y: this.stream?.y1 ?? bb.y, t: 0, life: 0.4, r: 18, c: "#fff2d0" });
                snd.pour(clamp(lk.flow / TUNE.pour.flow), k.bowls[bi].level);
                if (snd.gap("pourh", 6)) this.game.haptic(lk.tilt > 0.8 ? "light" : "tick");
                const q = k.brothQuality(k.bowls[bi].level);
                if (q === 2 && !k.bowls[bi].hitLine) { k.bowls[bi].hitLine = true; this.game.haptic("medium"); }
            } else snd.pour(0, 0);
        } else {
            l.on = Math.max(0, l.on - dt * 7);
            snd.pour(0, 0);
        }

        for (const p of this.puffs) { p.t += dt; p.x += (p.vx + Math.sin(p.t * 2.2 + p.seed) * 9) * dt; p.y += p.vy * dt; }
        this.puffs = this.puffs.filter((p) => p.t < p.life);
        for (const f of this.floats) { f.t += dt; f.y -= dt * (f.big ? 18 : 26); }
        this.floats = this.floats.filter((f) => f.t < f.life);
        for (const r of this.ripples) r.t += dt;
        this.ripples = this.ripples.filter((r) => r.t < r.life);
        for (const c of this.coins) { c.t += dt; }
        const before = this.coins.length;
        this.coins = this.coins.filter((c) => c.t < 0.5);
        if (this.coins.length < before) snd.coin();
        for (const sl of this.slides) { const was = sl.t; sl.t += dt; if (was < sl.dur && sl.t >= sl.dur) this.landFx(sl); }
        this.slides = this.slides.filter((sl) => sl.t < sl.dur);
        for (const f of this.flights) {
            const was = f.t; f.t += dt;
            if (was < f.dur && f.t >= f.dur) {
                const fx = this.bowlFx[f.bowl], b = L.bowls[f.bowl];
                if (f.kind) {
                    fx.vd -= 26; snd.splash();
                    s.burst({ at: [b.x, b.y], count: 14, color: ["#fff2d0", BROTHS[k.bowls[f.bowl].brothKind ?? "shio"].light], speed: [50, 160], life: [0.2, 0.42], size: [1.5, 3.4], gravity: 480, angle: -Math.PI / 2, spread: 1.6 });
                    if (f.q === 2) { snd.climb("medium"); this.float(b.x, b.y - b.r * 0.82, "Just right!", { color: GOLD, size: 15 }); this.flow = Math.min(1, this.flow + 0.2); s.freeze(0.03); }
                    else { snd.stumble(); this.float(b.x, b.y - b.r * 0.82, f.q === 1 ? "A little off" : "Mushy", { size: 13 }); }
                } else {
                    fx.vd -= 11; fx.pops[f.id] = 1;
                    if (f.neat) { snd.climb("light"); s.burst({ at: [f.x1, f.y1], count: 5, color: [GOLD, "#fff"], speed: [30, 80], life: [0.14, 0.28], size: [1.4, 2.4], gravity: 0 }); this.ripples.push({ x: f.x1, y: f.y1, t: 0, life: 0.3, r: 18, c: GOLD }); }
                    else { snd.place(false); }
                }
            }
        }
        this.flights = this.flights.filter((f) => f.t < f.dur);
        if (this.moment) { this.moment.t += dt; if (this.moment.t > 0.2) this.s.timeScale = 1; if (this.moment.t > 1.1) this.moment = null; }
        if (this.flee) { this.flee.t += dt; if (this.flee.t > 1) this.flee = null; }
        if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.life) this.bubble = null; }
        if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.life) this.banner = null; }
        for (const [id, v] of this.seatVis) {
            v.rise = Math.min(1, v.rise + dt / 0.28); v.pop = Math.max(0, v.pop - dt * 3.5);
            if (v.leave) { v.leave += dt / 0.5; if (v.leave >= 1) this.seatVis.delete(id); }
        }
        this.flow = Math.max(0, this.flow - dt * 0.03);
        this.cashShown += (k.cash - this.cashShown) * Math.min(1, dt * 7);
        this.stepWeather(dt, R);
        if (this.trainV > -2) { this.trainV += dt * 0.9; if (this.trainV > 2) this.trainV = -2; }
        if (this.endT >= 0) this.endT += dt;
    }

    stepWeather(dt, R) {
        const sh = this.k.shift, L = this.L, season = this.loc.season, W = L.W;
        const mode = sh.rain ? "rain" : season === "spring" ? "petal" : season === "autumn" ? "leaf" : season === "winter" ? "snow" : null;
        const rate = mode === "rain" ? 60 : mode === "snow" ? 16 : mode ? 5 : 0;
        if (R() < dt * rate && this.weather.length < 80) this.weather.push({ x: R() * W * 1.2 - W * 0.1, y: -6, s: 0.6 + R() * 0.7, ph: R() * 6.28, mode });
        for (const p of this.weather) {
            if (p.mode === "rain") { p.x -= 90 * dt; p.y += 620 * dt; }
            else if (p.mode === "snow") { p.x += Math.sin(this.t + p.ph) * 12 * dt; p.y += 34 * p.s * dt; }
            else { p.x += (Math.sin(this.t * 1.4 + p.ph) * 34 + 16) * dt; p.y += 44 * dt; }
        }
        this.weather = this.weather.filter((p) => p.y < L.counter);
    }

    // --- Drawing -----------------------------------------------------------------------------------------------
    drawBack(d) {
        const L = this.L, { W } = L, c = L.counter, h = c + 8, sc = Math.max(W / BGW, h / BGH), bw = BGW * sc, bh = BGH * sc;
        d.sprite(this.bg, { x: W / 2, y: h - bh / 2, width: bw, height: bh });
        if (this.loc.id === "cart" || this.loc.id === "hall") d.rect(W, h, { x: W / 2, y: h / 2, color: "#1a0d10", opacity: 0.1 });
        for (const p of this.weather) {
            if (p.mode === "rain") d.line([p.x, p.y], [p.x - 4, p.y + 14], { width: 1.1, color: "#bcd4ee", opacity: 0.5 });
            else if (p.mode === "snow") d.circle(1.7 * p.s, { x: p.x, y: p.y, color: "#ffffff", opacity: 0.85 });
            else d.rect(5 * p.s, 3.4 * p.s, { x: p.x, y: p.y, radius: 1.6, color: p.mode === "petal" ? "#f9b8c6" : "#df8a3a", opacity: 0.9 });
        }
        if (this.trainV > -1.5) {     // Train: a long painted streak behind the counter.
            const tx = W * (1 - this.trainV) * 1.1, ty = c - 62;
            for (let i = 0; i < 4; i++) {
                const cx = tx + i * 210;
                d.rect(204, 82, { x: cx, y: ty + 1, color: "#3a3a44", radius: 12 });
                d.rect(200, 76, { x: cx, y: ty, color: "#efe8d8", radius: 10 }); d.rect(200, 10, { x: cx, y: ty - 36, color: "#c9c0ae", radius: 5 });
                d.rect(200, 11, { x: cx, y: ty + 15, color: RED }); d.rect(200, 3, { x: cx, y: ty + 23, color: AMBER });
                for (let j = 0; j < 4; j++) { d.rect(30, 23, { x: cx - 72 + j * 48, y: ty - 15, color: "#34485a", radius: 3 }); d.rect(9, 18, { x: cx - 76 + j * 48, y: ty - 17, color: "#7f9fb4", opacity: 0.6, radius: 2 }); }
                d.rect(2, 60, { x: cx - 48, y: ty + 6, color: "#a89e8c" }); d.rect(2, 60, { x: cx + 48, y: ty + 6, color: "#a89e8c" });
            }
        }
    }

    drawCustomers(d) {
        const L = this.L;
        const list = this.k.customers.filter((c) => c.seat >= 0).sort((a, b) => a.seat - b.seat);
        for (const c of list) {
            const v = this.seatVis.get(c.id), seat = L.seats[c.seat];
            if (!v) continue;
            const frac = c.patience / c.max;
            let mood = frac < 0.33 ? MOOD.cross : MOOD.calm;
            if (c.state === "served") mood = MOOD.happy;
            if (c.state === "eating") mood = Math.floor(this.t * 3) % 3 === 2 ? MOOD.happy : MOOD.slurp;
            if (v.walk) mood = MOOD.cross;
            const h = L.bustH, w = h * PW / PH, rise = back(v.rise), bob = Math.sin(this.t * 1.7 + c.id) * 0.8;
            const off = v.leave ? ease(clamp(v.leave)) * (h * 0.8) : (1 - rise) * h * 0.7;
            const squash = 1 + v.pop * 0.13, panic = frac < 0.2 && c.state === "seated" ? Math.sin(this.t * 22) * 1.1 : 0;
            d.sprite(lookName(lookOf(c)), { frame: mood, x: seat.x + panic + L.pdx, y: seat.y - h / 2 * squash + off + bob, width: w / Math.sqrt(squash), height: h * squash });
        }
    }

    drawNoren(d) {
        const L = this.L, { W, safe } = L, top = safe.top, hgt = (L.land ? 30 : 46) + top;
        const nc = this.noren;
        d.rect(W, 8 + top * 0.3, { x: W / 2, y: (8 + top * 0.3) / 2, color: "#3a2015" });
        d.sprite("noren", { x: W / 2, y: hgt / 2 + 3, width: W, height: hgt, color: nc.a });
        const n = L.land ? 7 : 5;
        for (let i = 0; i < n; i++) { const x = W * (i + 0.5) / n, sw = Math.sin(this.t * 1.2 + i * 1.4) * 1.5; d.circle(3.5, { x: x + sw, y: hgt - 12, color: nc.ink, opacity: 0.16 }); }
        for (let i = 0; i < L.lanterns.length; i++) {
            const x = L.lanterns[i] + (i - (L.lanterns.length - 1) / 2) * 6, y = hgt + 19, sw = Math.sin(this.t * 1.1 + i) * 0.05;
            if (L.land) continue;
            d.additive(() => d.sprite("glow", { x, y, width: 120, height: 120, color: this.lantern.g, opacity: 0.2 + Math.sin(this.t * 3 + i) * 0.02 + this.flow * 0.14 }));
            d.sprite("lantern", { x, y: y - 2, width: 34, height: 50, color: this.lantern.c, rot: sw });
        }
    }

    drawCounterTop(d) {
        const L = this.L, { W, H } = L, c = L.counter;
        const hh = H - c, tw = 720, th = 368, k = Math.max(W / tw, hh / th);
        const wh = Math.max(hh, th * k);
        d.sprite("wood", { x: W / 2, y: c + wh / 2 + 2, width: tw * k, height: wh });
        d.rect(W, hh, { x: W / 2, y: c + hh / 2, color: "#1c0e08", opacity: 0.16 });
        d.rect(W, 10, { x: W / 2, y: c + 2, color: "#7e4a2a" });
        d.rect(W, 2.5, { x: W / 2, y: c - 2, color: "#f0b878" });
        d.rect(W, 7, { x: W / 2, y: c + 10, color: "#180c06", opacity: 0.4 });
        d.additive(() => d.sprite("glow", { x: W / 2, y: this.L.bowls[0].y, width: W * 1.2, height: this.L.bowls[0].r * 5, color: this.lantern.g, opacity: 0.14 + this.flow * 0.14 }));
        if (this.charm > 0) { const sz = L.land ? 34 : 38; d.sprite("charm", { frame: this.charm, x: W - L.safe.right - sz * 0.62, y: c + (L.land ? 12 : 8) + sz * 0.42, width: sz, height: sz * 1.03 }); }
    }

    drawServed(d) {
        const L = this.L, r = Math.min(26, L.W / this.k.seats.length * 0.24);
        for (const c of this.k.customers) if (c.state === "eating" && c.bowlShown && c.seat >= 0) {
            const s = L.seats[c.seat], sn = c.bowlShown;
            drawBowl(d, s.x + L.pdx, L.counter + r * 0.2, r, { glaze: this.glaze, broth: sn.brothKind, level: Math.max(0.2, sn.level * (c.eat / TUNE.eat)), noodle: c.eat > TUNE.eat * 0.4 ? sn.noodle?.kind : null, t: this.t });
        }
    }

    want(id, k = this.k) { return k.bowls.some((b) => b.c && b.hold <= 0 && RECIPES[b.c.recipe].tops.includes(id) && b.tops[id] === undefined); }

    drawPots(d) {
        const { k, L } = this;
        const needDrop = k.needNoodles().length > 0;
        k.pots.forEach((p, i) => {
            const P = L.pots[i], f = this.potFx[i], w = P.w, h = w * 0.9, sh = Math.sin(this.t * 40) * f.shake * 2.6, ph = k.potPhase(p), x = P.x + sh, y = P.y;
            const cooking = p.state === "cook";
            if (!cooking && needDrop) d.additive(() => d.sprite("glow", { x, y, width: w * 1.6, height: w * 1.6, color: AMBER, opacity: 0.2 + Math.sin(this.t * 5) * 0.1 }));
            if (ph === "perfect") d.additive(() => d.sprite("glow", { x, y: y - 4, width: w * 1.9, height: w * 1.9, color: GOLD, opacity: 0.55 + Math.sin(this.t * 9) * 0.2 }));
            d.additive(() => d.sprite("flame", { frame: Math.floor(this.t * 9) % 3, x, y: y + h * 0.56, width: w * 0.86, height: w * 0.26, opacity: cooking ? 1 : 0.5 }));
            d.sprite("pot", { x, y, width: w, height: h });
            const wx = x, wy = y - h * 0.122, ww = w * 0.72, wh = w * 0.42;
            d.sprite("water", { x: wx, y: wy, width: ww, height: wh, opacity: 0.96 });
            if (cooking) {
                const lift = f.lift ?? 0;
                d.sprite("nest", { frame: NOODLES[p.kind].frame, x: wx, y: wy - lift * 6, width: ww * (0.76 + lift * 0.1), height: wh * (0.76 + lift * 0.1), color: ph === "mush" ? "#d8c8a0" : ph === "raw" ? "#f8e8b8" : "#ffffff" });
                const nb = 5;
                for (let j = 0; j < nb; j++) { const q = (this.t * (1.4 + j * 0.2) + j * 0.37) % 1, a = j * 2.4 + i, bx = wx + Math.cos(a) * ww * 0.36, by = wy + Math.sin(a) * wh * 0.34; d.circle(1 + q * 2.6, { x: bx, y: by, color: "#fffdf0", opacity: (1 - q) * 0.75 }); }
                this.drawTimer(d, p, x, y + h * 0.58, w * 0.92);
            } else {
                const a = this.t * 0.6 + i;
                for (let j = 0; j < 3; j++) { const q = (a + j * 0.33) % 1; d.circle(1 + q * 1.6, { x: wx + Math.cos(j * 2 + i) * ww * 0.2, y: wy + Math.sin(j * 2 + i) * wh * 0.2, color: "#fffdf0", opacity: (1 - q) * 0.4 }); }
            }
        });
        k.brothList.forEach((id, i) => {
            const P = L.broths[i], f = this.brothFx[i], w = P.w, h = w * 0.9, x = P.x + Math.sin(this.t * 44) * f.shake * 2, y = P.y;
            const want = k.bowls.some((b) => b.c && b.hold <= 0 && b.level < TUNE.pour.perfectLo && RECIPES[b.c.recipe].broth === id);
            if (want) d.additive(() => d.sprite("glow", { x, y, width: w * 1.6, height: w * 1.6, color: BROTHS[id].light, opacity: 0.26 + Math.sin(this.t * 5) * 0.1 }));
            d.additive(() => d.sprite("flame", { frame: (Math.floor(this.t * 7) + i) % 3, x, y: y + h * 0.56, width: w * 0.7, height: w * 0.2, opacity: 0.55 }));
            d.sprite("pot", { x, y, width: w, height: h });
            d.sprite("broth", { frame: BROTHS[id].frame, x, y: y - h * 0.122, width: w * 0.72, height: w * 0.42 });
            const hold = k.ladle?.kind === id;
            if (!hold) d.sprite("ladle", { x: x + w * 0.16, y: y - h * 0.3, width: w * 1.0, height: w * 0.4, rot: -0.1 });
            d.rect(w * 0.84, 14, { x, y: y + h * 0.56, color: SOY, radius: 7, opacity: 0.86 });
            d.text(BROTHS[id].name, { x, y: y + h * 0.56, size: Math.min(11, w * 0.16), bold: true, font: FONT, color: BROTHS[id].light === "#fff8e8" ? "#fff8e8" : BROTHS[id].light });
        });
    }

    drawTimer(d, p, x, y, w) {
        const k = this.k, c = NOODLES[p.kind].cook, win = k.noodleWindow(), span = c + win + TUNE.noodle.soft, X = (t) => x - w / 2 + w * clamp(t / span);
        d.rect(w + 4, 11, { x, y, color: SOY, radius: 5.5 });
        d.rect(w * (c / span), 7, { x: X(c / 2), y, color: "#5a7ca0", radius: 3 });
        d.rect(w * (win / span), 7, { x: X(c + win / 2), y, color: GOLD, radius: 3 });
        d.rect(w * (TUNE.noodle.soft / span), 7, { x: X(c + win + TUNE.noodle.soft / 2), y, color: "#c0572e", radius: 3 });
        const nx = X(p.t);
        d.rect(3.4, 15, { x: nx, y, color: "#fff", radius: 1.7 });
    }

    drawBins(d) {
        const { k, L } = this;
        k.bins.forEach((b, i) => {
            const B = L.bins[i], f = this.binFx[i], T = TOPPINGS[b.id], sh = Math.sin(this.t * 40) * f.shake * 3, x = B.x + sh, y = B.y;
            const want = this.want(b.id);
            d.push();
            d.translate(x, y); const sq = 1 + f.pulse * 0.06; d.scale(sq, 1 / sq);
            if (want) d.additive(() => d.sprite("glow", { width: B.w * 1.5, height: B.h * 1.5, color: GOLD, opacity: 0.26 + Math.sin(this.t * 5) * 0.08 }));
            d.sprite("bin", { width: B.w, height: B.h });
            const s0 = Math.min(B.w, B.h);
            if (T.sliced) {
                const id = WHOLE[b.id], stock = b.stock;
                d.sprite("whole", { frame: id, y: -s0 * 0.14 - f.chop * 2, width: B.w * 0.76, height: B.w * 0.76 * 0.78, opacity: stock >= TUNE.cap ? 0.75 : 1 });
                const n = Math.min(stock, 6);
                for (let j = 0; j < n; j++) d.sprite("tops", { frame: T.frame, x: (j - (n - 1) / 2) * s0 * 0.13, y: s0 * 0.22 + (j % 2) * 2, width: s0 * 0.36, height: s0 * 0.3 });
                if (stock <= 0) { const q = Math.sin(this.t * 6) * 0.5 + 0.5; d.line([-B.w * 0.34, s0 * 0.24], [B.w * 0.34, s0 * 0.24], { width: 2, color: CREAM, opacity: 0.4 + q * 0.5 }); d.text("chop", { y: s0 * 0.33, size: 11, bold: true, font: FONT, color: CREAM }); }
                if (f.chop > 0) d.sprite("knife", { x: f.knife * B.w * (0.16 - (1 - f.chop) * 0.4) * 1.0, y: -s0 * 0.26 + (1 - f.chop) * s0 * 0.12, width: B.w * 0.74, height: B.w * 0.31, flipX: f.knife < 0, rot: -0.5 * f.knife + (1 - f.chop) * 0.4 * f.knife });
            } else d.sprite("tops", { frame: T.frame, width: s0 * 0.86, height: s0 * 0.78 });
            d.pop();
            if (b.gull) {
                const g = b.gull, frac = g.left / TUNE.gull.warn, hop = Math.abs(Math.sin(this.t * 7)) * 4;
                d.sprite("gull", { frame: Math.floor(this.t * 5) % 2, x, y: y - B.h * 0.3 - hop, width: B.w * 0.9, height: B.w * 0.58 });
                d.rect(B.w * 0.7, 6, { x, y: y - B.h * 0.66, color: SOY, radius: 3 });
                d.rect(B.w * 0.66 * frac, 3.4, { x: x - B.w * 0.33 * (1 - frac), y: y - B.h * 0.66, color: "#ff8a5a", radius: 2 });
            }
        });
        if (this.flee) { const f = this.flee, t = f.t; d.sprite("gull", { frame: Math.floor(this.t * 16) % 2, x: f.x + t * 240, y: f.y - t * t * 520, width: 54, height: 35, rot: -0.5, opacity: 1 - t * 0.6 }); }
    }

    drawBowls(d) {
        const { k, L } = this;
        k.bowls.forEach((b, i) => {
            const B = L.bowls[i], f = this.bowlFx[i], lift = f.flick * 10, sh = Math.sin(this.t * 44) * f.wob * 3.4;
            d.sprite("glow", { x: B.x, y: B.y + 3, width: B.r * 2.6, height: B.r * 2.1, color: "#120704", opacity: 0.3 });
            const r = B.r * (0.86 + 0.14 * back(f.born)), op = f.born < 1 ? f.born : 1;
            void op;
            if (!b.c) { drawBowl(d, B.x, B.y, r, { glaze: this.glaze, t: this.t }); return; }
            const R = RECIPES[b.c.recipe], ghosts = R.tops.filter((t) => b.tops[t] === undefined);
            drawBowl(d, B.x + sh, B.y - lift + f.dip, r, { glaze: this.glaze, broth: b.brothKind ?? R.broth, level: b.level, noodle: this.landed(b, i), tops: this.landedTops(b, i), ghosts, pops: f.pops, t: this.t, dip: Math.abs(f.dip), slosh: 1 + Math.abs(f.dip) });
            this.drawLine(d, b, B, f);
            this.drawBowlTag(d, b, B, f);
            if (k.complete(b) || (this.keyBowl === i && this.s.input.touchMode === false)) {
                if (k.complete(b)) { const a = this.t % 1; d.line([B.x, B.y - B.r * 0.96 - a * 8], [B.x - 7, B.y - B.r * 0.82 - a * 8], { width: 3.2, color: GOLD, opacity: 1 - a }); d.line([B.x, B.y - B.r * 0.96 - a * 8], [B.x + 7, B.y - B.r * 0.82 - a * 8], { width: 3.2, color: GOLD, opacity: 1 - a }); d.additive(() => d.sprite("glow", { x: B.x, y: B.y, width: B.r * 3, height: B.r * 2.6, color: GOLD, opacity: 0.14 + Math.sin(this.t * 6) * 0.05 })); }
            }
            if (this.keyBowl === i && !this.s.input.touchMode && k.bowls.filter((q) => q.c).length > 1) d.rect(B.r * 1.5, 3, { x: B.x, y: B.y + B.r * 1.06, color: GOLD, radius: 2 });
        });
    }

    /** Noodles only appear in the bowl when they land. */
    landed(b, i) { if (!b.noodle) return null; return this.flights.some((f) => f.kind && f.bowl === i) ? null : b.noodle.kind; }
    landedTops(b, i) { const t = { ...b.tops }; for (const f of this.flights) if (f.id && f.bowl === i) delete t[f.id]; return t; }

    drawLine(d, b, B, f) {
        const k = this.k, lad = k.ladle;
        const pouring = lad && (lad.bowl === b.i || (this.grab?.type === "ladle" && this.hitBowl(this.grab.x, this.grab.y - 40, 1.2) === b.i));
        const want = b.c && b.level < TUNE.pour.perfectHi && (b.level > 0.05 || pouring);
        if (!want && !pouring) return;
        const ix = B.r * 0.9, iy = ix * 0.714, kl = levelK(1.0), cy = B.y + (1 - kl) * iy * 0.34 + f.dip, rx = ix * kl, ry = iy * kl, inBand = k.brothQuality(b.level) === 2;
        const n = 34, col = inBand ? GOLD : "#fff6dc";
        for (let i = 0; i < n; i += 1) {
            if (i % 2) continue;
            const a = i / n * 6.283, a2 = (i + 1) / n * 6.283;
            d.line([B.x + Math.cos(a) * rx, cy + Math.sin(a) * ry], [B.x + Math.cos(a2) * rx, cy + Math.sin(a2) * ry], { width: inBand ? 2.2 : 1.5, color: col, opacity: pouring ? 0.95 : 0.4 });
        }
    }

    drawBowlTag(d, b, B, f) {
        const c = b.c, w = B.r * 1.5, y = B.y + B.r * 0.97, frac = clamp(c.patience / c.max), col = frac > 0.5 ? GREEN : frac > 0.25 ? AMBER : "#e8583a";
        d.rect(w + 4, 8, { x: B.x, y, color: SOY, radius: 4, opacity: 0.9 });
        d.rect(Math.max(3, w * frac), 4.4, { x: B.x - w / 2 * (1 - frac), y, color: col, radius: 2.2 });
        d.sprite(lookName(lookOf(c)), { frame: frac < 0.33 ? MOOD.cross : MOOD.calm, x: B.x - w / 2 - 12, y: y - 3, width: 26, height: 28.6 });
        void f;
    }

    /** Things in the air, over everything on the counter. */
    drawFront(d) {
        const { L, k } = this;
        for (const r of this.ripples) { const q = r.t / r.life; d.circle(r.r * (0.3 + q), { x: r.x, y: r.y, color: r.c, opacity: (1 - q) * 0.6, outline: 2 }); }
        d.additive(() => {
            for (const p of this.puffs) {
                const q = p.t / p.life, a = Math.sin(q * 3.14) * (p.gold ? 0.5 : 0.17), s = 26 * p.size * (0.6 + q * 1.3);
                d.sprite("steam", { x: p.x, y: p.y, width: s, height: s, rot: p.seed + q, opacity: a, color: p.gold ? "#ffe2a0" : "#ffffff" });
            }
        });
        for (const sl of this.slides) {
            const t = ease(clamp(sl.t / sl.dur)), x = mix(sl.x0, sl.x1, t), y = mix(sl.y0, sl.y1, t), r = mix(sl.r0, sl.r1, t), S = sl.snap;
            for (let i = 1; i <= 3; i++) { const q = t - i * 0.06; if (q > 0) d.sprite("steam", { x: mix(sl.x0, sl.x1, q), y: mix(sl.y0, sl.y1, q), width: r * 1.3, height: r, opacity: 0.1 }); }
            drawBowl(d, x, y, r, { glaze: this.glaze, broth: S.brothKind, level: S.level, noodle: S.noodle, tops: S.tops, t: this.t });
        }
        for (const f of this.flights) {
            const t = clamp(f.t / f.dur), x = mix(f.x0, f.x1, t), y = mix(f.y0, f.y1, t) - Math.sin(t * 3.14) * (f.kind ? 32 : 14);
            if (f.kind) d.sprite("nest", { frame: NOODLES[f.kind].frame, x, y, width: 70 - t * 10, height: 50 - t * 8, rot: t * 2 });
            else d.sprite("tops", { frame: f.top, x, y, width: f.size * (1.1 - t * 0.1), height: f.size * 0.86 });
        }
        const g = this.grab;
        if (g?.type === "pot" && (g.pull ?? 0) > 0 && k.pots[g.i].state === "cook") {
            const P = L.pots[g.i], kind = k.pots[g.i].kind, ph = k.potPhase(k.pots[g.i]);
            const col = ph === "raw" ? "#fff0c8" : ph === "mush" ? "#d8c8a0" : "#f6cf78", tx = g.x, ty = g.y - 26;
            for (let s = -3; s <= 3; s++) {
                let px = P.x + s * 5, py = P.y - P.w * 0.15;
                for (let i = 1; i <= 8; i++) {
                    const q = i / 8, nx = mix(P.x + s * 5, tx + s * 3, q) + Math.sin(q * 6 + this.t * 8 + s) * 3 * (1 - q), ny = mix(P.y - P.w * 0.15, ty, q) + Math.sin(q * 3.14) * 8;
                    d.line([px + 1, py + 1.4], [nx + 1, ny + 1.4], { width: 3, color: "#8a5420", opacity: 0.45 }); d.line([px, py], [nx, ny], { width: 2.6, color: col }); px = nx; py = ny;
                }
            }
            d.sprite("nest", { frame: NOODLES[kind].frame, x: tx, y: ty, width: 64, height: 46 });
        }
        if (g?.type === "bin" && g.mode === "pick") {
            const b = k.bins[g.i], T = TOPPINGS[b.id], hy = g.y - 38, target = this.hitBowl(g.x, hy, 1.25), B = target >= 0 ? L.bowls[target] : L.bowls[0], size = T.size * B.r * 0.9 * 1.9;
            if (target >= 0) {
                const ix = B.r * 0.9, iy = ix * 0.714, sx = B.x + T.slot[0] * ix * 0.86, sy = B.y + T.slot[1] * iy * 0.86, ok = Math.hypot(g.x - sx, hy - sy) < B.r * 0.5;
                d.circle(size * 0.56, { x: sx, y: sy, color: ok ? GOLD : CREAM, outline: 2, opacity: 0.9 });
            }
            d.sprite("tops", { frame: T.frame, x: g.x + 2, y: hy + 3, width: size, height: size * 0.82, color: "#000000", opacity: 0.25 });
            d.sprite("tops", { frame: T.frame, x: g.x, y: hy, width: size * 1.06, height: size * 0.88 });
        }
        if (k.ladle || this.ladle.on > 0.02) this.drawLadle(d);
    }

    drawLadle(d) {
        const l = this.ladle, lk = this.k.ladle, W = 150, H = W * 130 / 320, lipX = -W * 0.47;
        const cos = Math.cos(l.rot), sin = Math.sin(l.rot), lx = l.x + lipX * cos + 6 * sin, ly = l.y + lipX * sin - 6 * cos;
        const kind = lk?.kind;
        if (lk && lk.flow > 0.015 && lk.bowl >= 0) {
            const B = this.L.bowls[lk.bowl], ix = B.r * 0.9, iy = ix * 0.714, tx = clamp(lx, B.x - ix * 0.7, B.x + ix * 0.7), ty = B.y + clamp(ly - B.y + 44, -iy * 0.4, iy * 0.5), w = 2 + lk.flow * 7, C = BROTHS[kind];
            this.stream = { x1: tx, y1: ty };
            const steps = 7;
            let px = lx, py = ly + 2;
            for (let i = 1; i <= steps; i++) {
                const q = i / steps, nx = mix(lx, tx, q * q) + Math.sin(q * 9 + this.t * 26) * 0.9, ny = mix(ly + 2, ty, q);
                d.line([px, py], [nx, ny], { width: w * (1 - q * 0.34), color: C.color }); d.line([px - w * 0.2, py], [nx - w * 0.2, ny], { width: w * 0.34, color: C.light, opacity: 0.85 });
                px = nx; py = ny;
            }
            d.circle(w * 1.1, { x: tx, y: ty, color: "#fff2d0", opacity: 0.5 });
        } else this.stream = null;
        d.sprite("ladle", { x: l.x + 4, y: l.y + 7, width: W, height: H, rot: l.rot, color: "#000000", opacity: 0.25 * l.on });
        d.sprite("ladle", { x: l.x, y: l.y, width: W, height: H, rot: l.rot, opacity: l.on });
        if (lk && kind) {
            const f = clamp(lk.fill / TUNE.pour.volume), cupX = l.x - W * 0.305 * cos + 2 * sin, cupY = l.y - W * 0.305 * sin - H * 0.08;
            d.sprite("broth", { frame: BROTHS[kind].frame, x: cupX, y: cupY - H * 0.08, width: W * 0.28 * (0.5 + f * 0.5), height: H * 0.16, rot: l.rot * 0.3 });
        }
    }

    /** What the next useful thing is, for the guiding hand. */
    nextStep() {
        const { k, L } = this, list = k.bowls.filter((b) => b.c && b.hold <= 0).sort((a, b) => a.c.id - b.c.id);
        for (const p of k.pots) if (p.state === "cook" && ["perfect", "soft"].includes(k.potPhase(p)) && k.bowlForPot(p)) {
            const b = k.bowlForPot(p), P = L.pots[p.i], B = L.bowls[b.i];
            return { kind: "drag", x0: P.x, y0: P.y, x1: B.x, y1: B.y, say: "Now! Pull the noodles up" };
        }
        for (const b of list) {
            const B = L.bowls[b.i], R = RECIPES[b.c.recipe];
            if (k.complete(b)) return { kind: "flick", x0: B.x, y0: B.y, x1: B.x, y1: B.y - 90, say: "Flick the bowl up to serve" };
            if (b.level < TUNE.pour.okLo && !k.ladle) { const j = k.brothList.indexOf(R.broth), P = L.broths[j]; return { kind: "drag", x0: P.x, y0: P.y, x1: B.x, y1: B.y + 40, say: "Hold the ladle over the bowl. Let go at the line" }; }
        }
        for (const b of list) if (!b.noodle) {
            const cooking = k.pots.find((p) => p.forId === b.c.id && p.state === "cook");
            if (cooking) continue;
            const p = k.pots.find((q) => q.state === "empty");
            if (p) { const P = L.pots[p.i]; return { kind: "tap", x0: P.x, y0: P.y, say: "Tap the pot to drop noodles" }; }
        }
        for (const b of list) {
            const B = L.bowls[b.i], R = RECIPES[b.c.recipe];
            for (const id of R.tops) if (b.tops[id] === undefined) {
                const i = k.bins.findIndex((q) => q.id === id), P = L.bins[i], T = TOPPINGS[id], ix = B.r * 0.9;
                if (k.bins[i].stock <= 0) return { kind: "chop", x0: P.x - 16, y0: P.y, x1: P.x + 16, y1: P.y, say: "Swipe back and forth to chop" };
                return { kind: "drag", x0: P.x, y0: P.y, x1: B.x + T.slot[0] * ix * 0.86, y1: B.y + T.slot[1] * ix * 0.62 + 38, say: "Drag it into the bowl, on its shadow" };
            }
        }
        return null;
    }

    drawHint(d) {
        const sh = this.k.shift, wait = sh.teach ? 0.5 : this.o.hints ? 6 : 1e9;
        if (this.idle < wait || this.grab || this.endT >= 0) return;
        const st = this.nextStep();
        if (!st) return;
        const L = this.L, a = (this.t * 0.8) % 1, w = 46;
        let x = st.x0, y = st.y0, tap = 0;
        if (st.kind === "tap") { tap = Math.abs(Math.sin(this.t * 5)); }
        else if (st.kind === "chop") { const q = Math.sin(this.t * 7); x = (st.x0 + st.x1) / 2 + q * 22; }
        else { const q = clamp(a * 1.35); x = mix(st.x0, st.x1, ease(q)); y = mix(st.y0, st.y1, ease(q)); }
        d.sprite("hand", { x: x + w * 0.14, y: y + w * 0.5 + tap * 6, width: w, height: w * 1.07, opacity: st.kind === "tap" || st.kind === "chop" ? 0.96 : clamp(Math.min(a * 8, (1 - a) * 8)) });
        const ty = L.land ? L.bins[0].y - L.bins[0].h * 0.72 : L.bowls[0].y - L.bowls[0].r * 1.0 - 6, tw = Math.min(L.W - 28, 330);
        if (sh.teach) {
            d.rect(tw, 26, { x: L.W / 2, y: ty, color: SOY, radius: 13, opacity: 0.88 });
            d.text(st.say, { x: L.W / 2, y: ty, size: 13.5, bold: true, font: FONT, color: CREAM });
        }
    }

    drawTickets(d) {
        const { k, L } = this, w = L.ticketW, h = L.land ? w * 0.82 : Math.min(54, w * 0.62 + 4), icon = Math.min(21, w * 0.27);
        for (const c of k.customers) {
            if (c.state !== "seated" || c.seat < 0) continue;
            const seat = L.seats[c.seat], v = this.seatVis.get(c.id); if (!v) continue;
            const R = RECIPES[c.recipe], x = seat.x + L.tdx, y = L.tickY + h / 2 - (1 - back(v.rise)) * 30, frac = clamp(c.patience / c.max);
            d.push(); d.translate(x, y); d.rotate(Math.sin(c.id * 2.1) * 0.02 + Math.sin(this.t * 1.5 + c.id) * 0.01);
            d.rect(w + 2, h + 3, { y: 1.5, color: "#000", opacity: 0.28, radius: 5 });
            d.rect(w, h, { color: c.bowl >= 0 ? "#fff6e2" : "#e9dcc2", radius: 4 });
            d.rect(w, 5, { y: -h / 2 + 2.5, color: c.party ? "#e0a82e" : c.who ? RED : "#a88a6a", radius: 2 });
            if (c.party) d.text(`Party ${c.party}`, { y: h / 2 + 8, size: 10.5, bold: true, font: FONT, color: GOLD });
            const icons = [{ broth: R.broth }, { noodle: R.noodle }, ...R.tops.map((t) => ({ top: t }))];
            const cols = Math.max(2, Math.floor((w - 6) / (icon + 2))), rows = Math.ceil(icons.length / cols);
            const b = c.bowl >= 0 ? k.bowls[c.bowl] : null;
            icons.forEach((ic, i) => {
                const row = Math.floor(i / cols), inRow = row === rows - 1 ? icons.length - row * cols : cols, cx = (i % cols - (inRow - 1) / 2) * (icon + 2), cy = (row - (rows - 1) / 2) * (icon + 1) - 2;
                let done = false;
                if (ic.broth) { d.circle(icon * 0.44, { x: cx, y: cy, color: BROTHS[ic.broth].color }); d.circle(icon * 0.44, { x: cx, y: cy, color: SOY, outline: 1.2 }); done = b && b.level >= TUNE.pour.okLo; }
                else if (ic.noodle) { d.sprite("nest", { frame: NOODLES[ic.noodle].frame, x: cx, y: cy, width: icon * 1.1, height: icon * 0.84 }); done = !!b?.noodle; }
                else { d.sprite("tops", { frame: TOPPINGS[ic.top].frame, x: cx, y: cy, width: icon, height: icon }); done = b && b.tops[ic.top] !== undefined; }
                if (done) { d.line([cx - 4, cy], [cx - 1, cy + 3], { width: 2.2, color: "#2e8a3e" }); d.line([cx - 1, cy + 3], [cx + 5, cy - 4], { width: 2.2, color: "#2e8a3e" }); }
            });
            const pc = frac > 0.5 ? "#6aa83a" : frac > 0.25 ? "#e89a2a" : "#d8452a";
            d.rect((w - 8) * frac, 3.6, { x: -(w - 8) / 2 * (1 - frac), y: h / 2 - 4, color: pc, radius: 1.8 });
            d.pop();
        }
    }

    drawHUD(d) {
        const { k, L } = this, { W, safe } = L, y = safe.top + 22, stars = TUNE.stars;
        // Purse
        const px = safe.left + 10;
        d.rect(96, 30, { x: px + 48, y, color: SOY, radius: 15, opacity: 0.92 });
        d.sprite("coin", { x: px + 15, y, width: 21, height: 21 });
        d.text(money(this.cashShown), { x: px + 58, y, size: 14.5, bold: true, font: FONT, color: GOLD });
        // Happiness meter with its three stars
        const mw = Math.min(W - 212 - safe.left - safe.right, 220), mx = W / 2 + 18;
        d.rect(mw + 10, 18, { x: mx, y, color: SOY, radius: 9, opacity: 0.92 });
        const h = this.k.endless ? 0 : clamp(k.smiles / k.max());
        if (!k.endless) {
            d.rect(Math.max(0, (mw - 4) * h), 8, { x: mx - (mw - 4) / 2 * (1 - h), y, color: h >= stars[2] ? GOLD : AMBER, radius: 4 });
            stars.forEach((st, i) => d.sprite("star", { frame: h >= st ? 1 : 0, x: mx - mw / 2 + mw * st, y: y - 1, width: 21, height: 21 }));
        } else {
            for (let i = 0; i < 3; i++) d.sprite("star", { frame: i < k.lives ? 1 : 0, x: mx - 24 + i * 24, y: y - 1, width: 21, height: 21 });
        }
        // How the shift is going
        const left = k.endless ? null : k.arrivals.length + k.line.length;
        const sy = y + 26;
        d.rect(k.endless ? 118 : 106, 20, { x: px + (k.endless ? 59 : 53), y: sy, color: SOY, radius: 10, opacity: 0.8 });
        d.text(k.endless ? `${k.served} bowls served` : left > 0 ? `${left} more to come` : "Last orders", { x: px + (k.endless ? 59 : 53), y: sy, size: 12, bold: true, font: FONT, color: CREAM });
        if (this.trainAt) { const eta = Math.max(0, this.trainAt - k.time); d.rect(96, 20, { x: mx, y: sy, color: "#101820", radius: 4 }); d.text(`TRAIN ${eta.toFixed(0)}s`, { x: mx, y: sy, size: 12.5, bold: true, font: FONT, color: "#ffc94a" }); }
        if (k.combo >= 2) { d.text(`${k.combo} perfect`, { x: mx, y: sy, size: 13, bold: true, font: FONT, color: GOLD }); }
        for (const c of this.coins) {
            const q = clamp(c.t / 0.46); if (c.t < 0) continue;
            const e = q * q, x = mix(c.x, px + 15, e), yy = mix(c.y, y, e) - Math.sin(q * 3.14) * 24;
            d.sprite("coin", { x, y: yy, width: 15, height: 15 });
        }
    }

    drawBubble(d) {
        const b = this.bubble, L = this.L;
        if (!b || b.c.seat < 0) return;
        const seat = L.seats[b.c.seat], w = Math.min(L.W - 30, 240), lines = Math.ceil(b.text.length / 30), h = 28 + lines * 15, left = seat.x < L.W / 2, x = clamp(seat.x + (left ? 1 : -1) * (L.bustH * 0.5 + w * 0.42), w / 2 + 10, L.W - w / 2 - 10);
        const pop = back(clamp(b.t / 0.18)), fade = clamp((b.life - b.t) * 4), y = L.counter - h / 2 - 6;
        d.push(); d.translate(x, y); d.scale(pop, pop);
        d.rect(w + 4, h + 4, { color: SOY, radius: 12, opacity: fade * 0.9 });
        d.rect(w, h, { color: "#fff6e2", radius: 10, opacity: fade });
        d.text(b.name, { y: -h / 2 + 10, size: 11, bold: true, font: FONT, color: RED, opacity: fade });
        d.text(b.text, { y: 7, size: 13, font: SERIF, color: SOY, maxWidth: w - 18, opacity: fade, lineHeight: 1.12 });
        d.pop();
    }

    drawFloats(d) {
        if (this.moment) {
            const m = this.moment, q = clamp(m.t / 1.1), a = Math.sin(q * 3.14), L = this.L;
            d.additive(() => {
                d.sprite("glow", { x: m.x, y: L.counter - L.bustH * 0.55, width: L.bustH * 3.6, height: L.bustH * 3.2, color: "#ffc768", opacity: a * 0.55 });
                for (let i = 0; i < 3; i++) { const dx = (i - 1) * L.bustH * 0.34, up = q * 90 + i * 12, s = L.bustH * (0.7 + q * 0.7); d.sprite("steam", { x: m.x + dx + Math.sin(q * 5 + i) * 12, y: L.counter - 30 - up, width: s, height: s * 1.3, rot: i + q * 2, opacity: a * 0.42, color: "#fff0cc" }); }
            });
        }
        for (const f of this.floats) {
            const q = f.t / f.life, a = clamp((1 - q) * 3), s = f.big ? back(clamp(f.t / 0.16)) : 1;
            const half = f.text.length * f.size * 0.3 + 6;
            d.push(); d.translate(clamp(f.x, half, this.L.W - half), f.y); d.scale(s, s);
            d.text(f.text, { x: 1, y: 2, size: f.size, bold: true, font: FONT, color: "#1a0a06", opacity: a * 0.75 });
            d.text(f.text, { size: f.size, bold: true, font: FONT, color: f.color, opacity: a });
            d.pop();
        }
        if (this.banner) {
            const b = this.banner, L = this.L, a = clamp(Math.min(b.t * 6, (b.life - b.t) * 4));
            d.rect(L.W, 46, { x: L.W / 2, y: L.counter + 2, color: SOY, opacity: a * 0.82 });
            d.text(b.text, { x: L.W / 2, y: L.counter + 2, size: 26, bold: true, font: FONT, color: b.color, opacity: a });
        }
    }

    drawWorld(d) {
        this.drawBack(d);
        this.drawCustomers(d);
        this.drawNoren(d);
        this.drawCounterTop(d);
        this.drawServed(d);
        this.drawPots(d);
        this.drawBins(d);
        this.drawBowls(d);
    }
}
