// The tower: top-down walking, NPCs, trainers, clutter encounters, and the script runner that drives the story.
import { INK } from "./ink.js";
import { BEASTS, ITEMS } from "./data.js";
import { F, PROP, TILE, paintFloorSheet, paintPerson } from "./tiles.js";
import { COL, Dialog, FONT, Screen, T, TYPE, panel } from "./ui.js";
import { beastFlip, beastSprite, decalSprite, itemSprite, LOOKS } from "./sprites.js";
import { bossify, makeMon, healMon, maxHp, promotionFor } from "./sim.js";
import { BattleScreen } from "./battle.js";
import { PauseMenu, Promotion, LiftMenu, ShopMenu, ClosetMenu, GotMon } from "./menus.js";
import { FLOORS, objective } from "./story.js";

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: "down", down: "up", left: "right", right: "left" };
const STEP_TIME = 0.17;
export const freshSave = () => ({
    v: 1, name: "", floor: "L", x: 8, y: 13, dir: "up", party: [], box: [], bag: {}, cash: 300, flags: {}, beaten: {}, taken: {}, seen: {}, caught: {},
    steps: 0, time: 0, repel: 0, lastBreak: null, sigs: 0, settings: { sound: true, haptics: true, fastText: false }, battle: null, grace: 6, wins: 0, losses: 0, seenFloors: { L: 1 },
});
export const save = (game) => { const S = game.data.S; if (S) game.save("oq", S); };

export class World extends Screen {
    constructor(game, s) { super(); this.game = game; this.s = s; this.S = game.data.S; this.ents = []; this.hero = { x: 0, y: 0, px: 0, py: 0, dir: "down", walk: 0, moving: false, t: 0, from: null }; this.follower = null; this.time = 0; this.script = null; this.path = null; this.drag = null; this.banner = 0; this.opaque = true; this.fade = 0; this.fadeTo = 0; this.trail = []; this.ex = null; this.saveTick = 0; this.slide = null; this.bob = 0; }
    enter() { this.load(this.S.floor, this.S.x, this.S.y, this.S.dir, true); }

    // --- Map ------------------------------------------------------------------------------------------------------------
    load(id, x, y, dir, first) {
        const f = FLOORS[id]; this.f = f; this.S.floor = id; this.S.seenFloors[id] = 1;
        this.tileName = paintFloorSheet(this.game, f.themeId ?? id, f.theme);
        this.baseCache = new Map(); this.rows = f.map; this.h = f.map.length; this.w = Math.max(...f.map.map((r) => r.length));
        this.ents = [];
        for (let yy = 0; yy < this.h; yy++) for (let xx = 0; xx < this.w; xx++) {
            const ch = this.rows[yy][xx] ?? " ", def = f.ents?.[ch];
            if (def) { for (const dd of Array.isArray(def) ? def : [def]) this.addEnt(`${id}.${ch}`, ch, dd, xx, yy); }
        }
        const h = this.hero; h.x = x; h.y = y; h.px = x * TILE; h.py = y * TILE; h.dir = dir ?? h.dir; h.moving = false; h.from = null;
        this.path = null; this.trail = [{ x, y }]; this.follower = null; this.prepFollower();
        this.banner = 2.6; this.game.audioKit?.music(f.music ?? "office");
        if (f.onEnter && !first) this.run(f.onEnter);
        else if (f.onEnter && first && !this.script) this.run(f.onEnter);
    }
    addEnt(key, ch, def, x, y) {
        const e = { key: def.key ?? key, ch, def, x, y, px: x * TILE, py: y * TILE, dir: def.dir ?? "down", walk: 0, moving: false, t: 0, from: null, emote: null, hidden: !!def.hiddenStart };
        if (def.look) paintPerson(this.game, def.look, LOOKS[def.look]);
        if (def.beast) beastSprite(this.game, def.beast);
        this.ents.push(e);
    }
    active(e) {
        const d = e.def, S = this.S;
        if (e.hidden) return false;
        if (d.show && !d.show(S)) return false;
        if (d.t === "item" && S.taken[e.key]) return false;
        return true;
    }
    tile(x, y) { return this.rows[y]?.[x] ?? " "; }
    solidTile(x, y) {
        const c = this.tile(x, y);
        if (c === " " || "#WvE^+".includes(c)) return true;
        const p = PROP[c]; if (p) return p.solid;
        return false;
    }
    entAt(x, y) { return this.ents.find((e) => e.x === x && e.y === y && this.active(e) && e.def.t !== "step"); }
    blocked(x, y) {
        if (this.solidTile(x, y)) return true;
        const e = this.entAt(x, y);
        return !!(e && e.def.t !== "ghost");
    }
    /** Furniture and people stand on whichever floor surrounds them. */
    linoNear(x, y) {
        const key = y * 1000 + x; let v = this.baseCache.get(key);
        if (v === undefined) {
            let a = 0, b = 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const c = this.tile(x + dx, y + dy); if (c === ",") a++; else if (c === "." || c === "\"") b++; }
            v = a > b || (a === b && this.f.base === ","); this.baseCache.set(key, v);
        }
        return v;
    }
    prepFollower() {
        const lead = this.S.party.find((m) => m.hp > 0) ?? this.S.party[0];
        this.followSp = lead?.sp ?? null;
        if (this.followSp) beastSprite(this.game, this.followSp);
    }

    // --- Scripts ----------------------------------------------------------------------------------------------------------
    run(gen, o = {}) {
        const it = gen(this.ctx());
        this.script = it; this.path = null;
        this.scriptKey = o.key ?? null;
        const step = (v) => {
            const r = it.next(v);
            if (r.done) { if (this.script === it) { this.script = null; this.afterScript(); } return; }
            if (typeof r.value === "function") r.value(step); else step(r.value);
        };
        step();
    }
    afterScript() { this.checkPromotions(); this.scriptKey = null; save(this.game); }
    abortScript() { const it = this.script; this.script = null; it?.return?.(); }
    ctx() {
        const w = this, g = this.game, S = this.S, kit = g.audioKit;
        const c = {
            S, world: w,
            say: (who, text, o = {}) => (res) => w.stack.push(new Dialog(who, w.fmt(text), { ...o, voice: (who ?? "").length, done: () => res() })),
            ask: (who, text, choices, o = {}) => (res) => w.stack.push(new Dialog(who, w.fmt(text), { ...o, choices, done: (i) => res(i) })),
            note: (text, o = {}) => (res) => { w.stack.push(new Dialog(null, w.fmt(text), { ...o, fill: "#fff7d6", done: () => res() })); },
            flag: (k, v = 1) => { S.flags[k] = v; },
            has: (k) => S.flags[k],
            count: (it) => S.bag[it] ?? 0,
            give(it, n = 1) { S.bag[it] = (S.bag[it] ?? 0) + n; kit?.play("item"); w.toast(`+${n > 1 ? n + " " : ""}${ITEMS[it].name}`); },
            take(it, n = 1) { S.bag[it] = Math.max(0, (S.bag[it] ?? 0) - n); },
            cash(n) { S.cash += n; kit?.play("item"); w.toast(`+$${n} petty cash`); },
            wait: (t) => (res) => { w.waitT = t; w.waitFn = res; },
            face: (e, dir) => { w.get(e).dir = dir; },
            walk: (e, path) => (res) => w.walkEnt(w.get(e), path, res),
            emote: (e, ch = "!") => (res) => { const x = w.get(e); x.emote = { ch, t: 0 }; kit?.play("exclaim"); w.waitT = 0.55; w.waitFn = () => { x.emote = null; res(); }; },
            warp: (f, x, y, dir) => (res) => w.fadeThen(() => { w.load(f, x, y, dir); }, res),
            fadeOut: () => (res) => { w.fadeTo = 1; w.fadeCb = res; },
            fadeIn: () => (res) => { w.fadeTo = 0; w.fadeCb = res; },
            play: (n) => kit?.play(n), music: (n) => kit?.music(n),
            battle: (cfg) => (res) => {
                if (w.pendingResult) { const r = w.pendingResult; w.pendingResult = null; res(r); return; }
                w.startBattle(cfg, (r) => { if (r === "lose" && !cfg.mustWin) { w.blackout(); return; } res(r); });
            },
            recv: (sp, lvl, o = {}) => (res) => w.receive(sp, lvl, o, res),
            sig: () => { S.sigs++; kit?.play("sign"); },
            heal: () => w.healParty(),
            shake: (a = 6) => { w.shakeT = 0.4; w.shakeA = a; g.haptic("heavy"); },
            show: (e) => { w.get(e).hidden = false; }, hide: (e) => { w.get(e).hidden = true; },
            flash: (color = "#ffffff") => { w.flashT = 0.4; w.flashC = color; },
            screen: (Sc, ...a) => (res) => { w.stack.push(new Sc(...a, res)); },
            shop: (tier) => (res) => { w.stack.push(new ShopMenu(tier, res)); },
            end: () => (res) => { g.go("ending", {}, { fade: 0.8 }); res(); },
            when: (fn) => (res) => { w.waitUntil = fn; w.waitFn = res; },
        };
        return c;
    }
    get(e) { return e === "hero" ? this.hero : typeof e === "string" ? this.ents.find((x) => x.key.endsWith("." + e) || x.key === e) : e; }
    fmt(text) {
        const S = this.S, wrong = ["Jeff", "Dana", "New Kyle", "Bradley", "Temp", "Whatsit", "Janine", "Colin From Sales", "Trevor", "Other Dave"];
        return text.replaceAll("{name}", S.name || "New Hire").replaceAll("{wrong}", wrong[(S.steps >> 3) % wrong.length]).replaceAll("{sigs}", S.sigs);
    }
    toast(t) { this.game.toasts?.add(t); }
    walkEnt(e, path, res) {
        const list = [...path]; const nextStep = () => {
            const dir = list.shift();
            if (!dir) { res(); return; }
            e.dir = dir; const [dx, dy] = DIRS[dir];
            e.from = [e.x, e.y]; e.x += dx; e.y += dy; e.t = 0; e.moving = true; e.onArrive = nextStep;
        };
        nextStep();
    }
    fadeThen(mid, res) { this.fadeTo = 1; this.fadeCb = () => { mid(); this.fadeTo = 0; this.fadeCb = res; }; }
    healParty() { for (const m of this.S.party) healMon(m); this.game.audioKit?.play("heal"); this.prepFollower(); }
    addMon(m) {
        const S = this.S; S.seen[m.sp] = 1; S.caught[m.sp] = 1; delete m.v;
        if (S.party.length < 6) { S.party.push(m); return "party"; }
        S.box.push(m); return "box";
    }
    receive(sp, lvl, o, res) {
        const m = makeMon(sp, lvl), where = this.addMon(m); this.prepFollower();
        this.stack.push(new GotMon(m, where, o.text, res));
    }

    // --- Battles ----------------------------------------------------------------------------------------------------------
    startBattle(cfg, done) {
        const S = this.S; this.battleDone = done; this.path = null; this.drag = null;
        if (!S.party.some((m) => m.hp > 0)) { this.blackout(); return; }
        S.battleCtx = { key: this.scriptKey ?? null, kind: cfg.kind };
        const sc = new BattleScreen(this, cfg, (r, st) => this.battleOver(r, st));
        this.stack.push(sc);
    }
    resumeBattle(st) {
        const sc = new BattleScreen(this, { resume: st }, (r, s2) => this.battleOver(r, s2)); this.stack.push(sc);
        const key = this.S.battleCtx?.key;
        this.battleDone = (r) => {
            if (r === "lose") { this.blackout(); return; }
            const e = key && this.ents.find((x) => x.key === key);
            if (e) { this.pendingResult = r; this.interact(e); this.pendingResult = null; }
        };
    }
    battleOver(r, st) {
        const S = this.S;
        S.battle = null;
        for (const m of S.party) delete m.v;
        if (r === "win") S.wins++;
        if (r === "lose") S.losses++;
        if (st?.caught) { const m = st.caught; const where = this.addMon(m); this.toast(`${BEASTS[m.sp].name} joined ${where === "party" ? "the team" : "the Supply Closet"}!`); }
        this.prepFollower();
        const done = this.battleDone; this.battleDone = null;
        this.game.audioKit?.music(this.f.music ?? "office");
        save(this.game);
        const after = () => { done?.(r); };
        this.checkPromotions(after);
    }
    checkPromotions(after) {
        const m = this.S.party.find((x) => promotionFor(x));
        if (!m) { after?.(); return; }
        this.stack.push(new Promotion(m, promotionFor(m), () => { this.prepFollower(); this.checkPromotions(after); }));
    }
    blackout() {
        const S = this.S; this.abortScript();
        const lost = Math.floor(S.cash * 0.15); S.cash -= lost;
        const b = S.lastBreak ?? { floor: "B1", x: 4, y: 5 };
        this.fadeThen(() => { this.healParty(); this.load(b.floor, b.x, b.y, "down"); }, () => {
            this.stack.push(new Dialog(null, `You were sent home to "have a think", and came back for the next shift. $${lost} docked for the sick day. Everyone is rested.`, { fill: "#fff7d6" }));
        });
    }
    wildBattle() {
        const f = this.f, S = this.S, pool = f.wild.filter((w) => !w[4] || w[4](S));
        const total = pool.reduce((a, w) => a + w[3], 0); let r = this.game.rng.next ? this.game.rng.next() * total : Math.random() * total;
        let pick = pool[0];
        for (const w of pool) { r -= w[3]; if (r <= 0) { pick = w; break; } }
        const lvl = pick[1] + Math.floor(this.game.rng.next() * (pick[2] - pick[1] + 1)), foe = makeMon(pick[0], lvl);
        S.seen[foe.sp] = 1;
        this.startBattle({ kind: "wild", foes: [foe], fmt: 1 }, (res) => { if (res === "lose") this.blackout(); });
    }

    // --- Interaction ------------------------------------------------------------------------------------------------------
    interact(e) {
        const d = e.def, h = this.hero;
        if (e.def.turn !== false && e.def.t !== "item" && e.def.t !== "sign") e.dir = OPP[h.dir];
        if (d.run) { this.run(d.run, { key: e.key }); return; }
        if (d.t === "item") {
            const it = d.item, n = d.n ?? 1, S = this.S;
            S.taken[e.key] = 1;
            this.run(function* (c) { c.give(it, n); yield c.note(d.text ?? `You found ${n > 1 ? n + " x " : "a "}${ITEMS[it].name}. ${d.joke ?? ""}`); });
            return;
        }
        if (d.t === "trainer") { this.fightTrainer(e); return; }
        if (d.lines) { const self = this, lines = d.lines; this.run(function* (c) { for (const l of lines) yield c.say(d.name, l, { tab: d.tab }); }); }
        if (d.text) { const text = d.text; this.run(function* (c) { yield c.note(text); }); }
    }
    fightTrainer(e) {
        const d = e.def, S = this.S, w = this, key = e.key;
        const beaten = S.beaten[key];
        this.run(function* (c) {
            if (beaten) { yield c.say(d.name, d.post ?? "Good game. Let's not do that again."); return; }
            if (d.pre) yield c.say(d.name, d.pre);
            const foes = d.party.map(([sp, l]) => makeMon(sp, l));
            bossify(foes, d);
            for (const m of foes) S.seen[m.sp] = 1;
            const r = yield c.battle({ kind: d.boss ? "boss" : "trainer", foes, fmt: d.fmt ?? 1, name: d.name, ai: d.ai ?? 1, boss: d.boss, reward: d.reward ?? d.party.at(-1)[1] * 22, title: d.title, look: d.look });
            if (r === "win") {
                S.beaten[key] = 1;
                const pay = d.reward ?? d.party.at(-1)[1] * 22; c.cash(pay);
                if (d.win) yield c.say(d.name, d.win);
                if (d.after) yield* d.after(c);
            }
        }, { key });
    }
    trySee() {
        if (this.script) return;
        const h = this.hero;
        for (const e of this.ents) {
            const d = e.def;
            if (d.t !== "trainer" || !this.active(e) || this.S.beaten[e.key] || d.noSight) continue;
            const [dx, dy] = DIRS[e.dir], range = d.range ?? 4;
            for (let i = 1; i <= range; i++) {
                const x = e.x + dx * i, y = e.y + dy * i;
                if (this.solidTile(x, y)) break;
                if (x === h.x && y === h.y) {
                    const steps = i - 1, path = Array(steps).fill(e.dir), w = this;
                    this.run(function* (c) {
                        yield c.emote(e);
                        if (steps) yield c.walk(e, path);
                        h.dir = OPP[e.dir];
                        w.script = null;
                        w.fightTrainer(e);
                    });
                    return true;
                }
                if (this.entAt(x, y)) break;
            }
        }
        return false;
    }
    stepped() {
        const S = this.S, h = this.hero;
        S.steps++; S.x = h.x; S.y = h.y; S.dir = h.dir;
        if (S.repel > 0) S.repel--;
        this.game.audioKit?.play("step");
        for (const e of this.ents) if (e.def.t === "step" && e.x === h.x && e.y === h.y && this.active(e)) {
            if (e.def.once) { if (S.flags[e.key]) continue; S.flags[e.key] = 1; }
            this.run(e.def.run, { key: e.key }); return;
        }
        if (this.trySee()) return;
        if (this.tile(h.x, h.y) === "\"" && !this.script) {
            this.rustle = { x: h.x, y: h.y, t: 0 };
            S.grace--;
            if (S.party.length && S.grace <= 0 && S.repel <= 0 && this.game.rng.next() < (this.f.rate ?? 0.16)) { S.grace = 5; this.path = null; this.wildBattle(); return; }
        }
        this.saveTick++;
        if (this.saveTick >= 24) { this.saveTick = 0; save(this.game); }
    }
    tryMove(dir) {
        const h = this.hero; h.dir = dir;
        const [dx, dy] = DIRS[dir], nx = h.x + dx, ny = h.y + dy, c = this.tile(nx, ny);
        if (c === "^" || c === "v") return this.stairs(c), true;
        if (this.blocked(nx, ny)) {
            const now = this.time;
            if (now - (this.bumpAt ?? 0) > 0.35) { this.bumpAt = now; this.game.audioKit?.play("bump"); }
            return false;
        }
        h.from = [h.x, h.y]; this.trail.unshift({ x: h.x, y: h.y }); this.trail.length = Math.min(4, this.trail.length);
        h.x = nx; h.y = ny; h.t = 0; h.moving = true;
        h.onArrive = () => { const chute = PROP[this.tile(h.x, h.y)]?.chute; if (chute) { const [ax, ay] = DIRS[h.dir]; if (!this.blocked(h.x + ax, h.y + ay)) { this.slideNext = h.dir; } } this.stepped(); };
        return true;
    }
    stairs(c) {
        const f = this.f, to = c === "^" ? f.up : f.down, gate = c === "^" ? f.gateUp : f.gateDown;
        if (!to) return;
        const msg = gate?.(this.S);
        if (msg) { const m = msg; this.run(function* (x) { yield x.note(m); }); return; }
        const T2 = FLOORS[to], want = c === "^" ? "v" : "^";
        let sx = 2, sy = 2;
        T2.map.forEach((r, y) => { const i = r.indexOf(want); if (i >= 0) { sx = i; sy = y + 1; } });
        this.game.audioKit?.play("door");
        this.script = { locked: 1 };
        this.fadeThen(() => { this.script = null; this.load(to, sx, sy, "down"); save(this.game); });
    }
    frontTile() { const h = this.hero, [dx, dy] = DIRS[h.dir]; return [h.x + dx, h.y + dy]; }
    useFront() {
        const [x, y] = this.frontTile(); const e = this.entAt(x, y);
        if (e) { this.interact(e); return true; }
        return this.useProp(x, y);
    }
    useProp(x, y) {
        const c = this.tile(x, y), w = this, S = this.S, h = this.hero;
        const say = (text) => { this.run(function* (k) { yield k.note(text); }); return true; };
        if (c === "G") {   // coffee machine: heals and sets the respawn point
            S.lastBreak = { floor: S.floor, x: h.x, y: h.y };
            this.run(function* (k) {
                k.heal(); k.flash("#fff3d0");
                yield k.note(FLOORS[S.floor].breakLine ?? "The coffee machine groans. Everyone gets a cup. Team Morale fully restored. Your progress is saved.");
                save(w.game);
            });
            return true;
        }
        if (c === "V") { this.run(function* (k) { yield k.shop(Math.floor(S.sigs)); }); return true; }
        if (c === "M") { this.run(function* (k) { yield k.screen(ClosetMenu); }); return true; }
        if (c === "E") { if (!S.flags.lift) return say("The lift has been out of service since the last time someone was happy about it. A sign says: USE STAIRS. BUILD CHARACTER."); this.run(function* (k) { yield k.screen(LiftMenu); }); return true; }
        const pools = { D: DESK, W: WINDOW, "+": POSTER, H: COOLER, F: FRIDGE, B: CABINET, P: PLANT, O: BOARD, S: SERVER, Q: PRINTER, U: BIN, Y: YOGA, N: BOOKS, R: BOXES, I: null };
        const pool = (this.f.prop?.[c] ?? pools[c]);
        if (pool) return say(pool[(x * 7 + y * 13 + S.steps >> 2) % pool.length]);
        return false;
    }

    // --- Update -----------------------------------------------------------------------------------------------------------
    tick(dt) { this.time += dt; this.game.time2 = this.time; }
    update(dt, I) {
        const h = this.hero, S = this.S;
        S.time += dt;
        if (this.waitT !== undefined && this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) { const fn = this.waitFn; this.waitT = undefined; this.waitFn = null; fn?.(); } }
        if (this.waitUntil && this.waitUntil()) { this.waitUntil = null; const fn = this.waitFn; this.waitFn = null; fn?.(); }
        if (this.fade !== this.fadeTo) {
            this.fade += Math.sign(this.fadeTo - this.fade) * dt * 5;
            if (Math.abs(this.fade - this.fadeTo) < dt * 5.1) { this.fade = this.fadeTo; const cb = this.fadeCb; this.fadeCb = null; cb?.(); }
        }
        if (this.banner > 0) this.banner -= dt;
        if (this.flashT > 0) this.flashT -= dt;
        if (this.shakeT > 0) this.shakeT -= dt;
        for (const e of this.ents) this.moveActor(e, dt);
        this.moveActor(h, dt, this.slideNext ? 2 : 1);
        if (this.rustle) { this.rustle.t += dt; if (this.rustle.t > 0.35) this.rustle = null; }
        // NPCs turn and look about now and then
        if (!this.script && Math.floor(this.time * 0.5) !== Math.floor((this.time - dt) * 0.5)) for (const e of this.ents) if (e.def.look && e.def.t === "npc" && e.def.idle !== false) { const n = (e.x * 3 + Math.floor(this.time)) % 7; if (n === 0) e.dir = ["down", "left", "right", "down"][e.y % 4]; }
        if (this.script || this.stack.top !== this) { this.drag = null; return; }
        this.controls(dt, I);
    }
    moveActor(a, dt, speed = 1) {
        if (!a.moving) return;
        a.t += dt / (STEP_TIME * (a === this.hero ? 1 : 1.2)) * speed;
        const k = Math.min(1, a.t);
        a.px = (a.from[0] + (a.x - a.from[0]) * k) * TILE; a.py = (a.from[1] + (a.y - a.from[1]) * k) * TILE;
        a.walk = (a.walk ?? 0) + dt;
        if (k >= 1) { a.moving = false; const fn = a.onArrive; a.onArrive = null; fn?.(); }
    }
    controls(dt, I) {
        const h = this.hero, p = I.pointer;
        // Top bar and buttons get first refusal, in input(). Anything else is the floor.
        if (this.consumedTap) { this.consumedTap = false; }
        let want = null;
        if (I.held.up) want = "up"; else if (I.held.down) want = "down"; else if (I.held.left) want = "left"; else if (I.held.right) want = "right";
        if (want) this.path = null;
        if (p.pressed && !this.overHit(p.x, p.y)) this.drag = { x: p.x, y: p.y, cx: p.x, cy: p.y, active: false, t: 0 };
        if (this.drag) {
            const dr = this.drag; dr.cx = p.x; dr.cy = p.y; dr.t += dt;
            if (!p.down) { this.drag = null; }
            else {
                const dx = p.x - dr.x, dy = p.y - dr.y, dist = Math.hypot(dx, dy);
                if (dist > 12) { dr.active = true; this.path = null; const prev = dr.dir; const ax = Math.abs(dx), ay = Math.abs(dy), bias = prev === "left" || prev === "right" ? 1.25 : 0.8; dr.dir = ax * bias > ay ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"); if (dist > 58) { dr.x = p.x - dx / dist * 58; dr.y = p.y - dy / dist * 58; } }
                else if (dist < 6 && dr.active) dr.dir = null;
                if (dr.active && dr.dir) want = dr.dir;
            }
        }
        if (p.tapped && !this.overHit(p.x, p.y)) this.tapWorld(p.x, p.y);
        if (I.confirm && !h.moving && !want) { if (this.useFront()) return; }
        if (I.cancel && !h.moving) { this.openMenu(); return; }
        if (h.moving) return;
        if (this.slideNext) { const d = this.slideNext; this.slideNext = null; this.tryMove(d); return; }
        if (want) { this.tryMove(want); return; }
        if (this.path?.length) {
            const nx = this.path.shift();
            if (nx.interact) { this.hero.dir = nx.dir; this.path = null; const e = nx.ent; if (e) this.interact(e); else this.useProp(nx.x, nx.y); return; }
            if (!this.tryMove(nx)) this.path = null;
        }
    }
    overHit(x, y) { return this.hits.some((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h); }
    viewOffset() {
        const V = this.game.view, h = this.hero, mw = this.w * TILE, mh = this.h * TILE;
        const portraitShift = V.height > V.width ? 40 : 0;
        const cx = mw <= V.width ? (mw - V.width) / 2 : Math.max(0, Math.min(mw - V.width, h.px + TILE / 2 - V.width / 2));
        const cy = mh <= V.height ? (mh - V.height) / 2 : Math.max(-20, Math.min(mh - V.height + 40, h.py + TILE / 2 - V.height / 2 + portraitShift * 0));
        return [cx, cy];
    }
    tapWorld(px, py) {
        const [cx, cy] = this.viewOffset(), x = Math.floor((px + cx) / TILE), h = this.hero; let y = Math.floor((py + cy) / TILE);
        // People are taller than their tile, so a tap on a head counts as a tap on them.
        const head = this.entAt(x, y + 1);
        if (head && (head.def.look || head.def.beast) && !this.entAt(x, y)) y += 1;
        const e = this.entAt(x, y), interactive = !!e || ("GVMEHDWFO+BPSQUYNR".includes(this.tile(x, y)));
        if (Math.abs(x - h.x) + Math.abs(y - h.y) === 1 && interactive) {
            h.dir = x > h.x ? "right" : x < h.x ? "left" : y > h.y ? "down" : "up";
            if (e) this.interact(e); else this.useProp(x, y);
            return;
        }
        if (x === h.x && y === h.y) return;
        this.path = this.findPath(x, y, interactive, e);
    }
    /** BFS over walkable tiles. When the target is solid, finds the nearest tile beside it and interacts. Also used by the bot. */
    findPath(tx, ty, interactive, ent) {
        const h = this.hero, start = `${h.x},${h.y}`, prev = new Map([[start, null]]), q = [[h.x, h.y]];
        const goal = (x, y) => interactive ? Math.abs(x - tx) + Math.abs(y - ty) === 1 : x === tx && y === ty;
        let end = null;
        if (goal(h.x, h.y)) end = [h.x, h.y];
        while (q.length && !end) {
            const [x, y] = q.shift();
            for (const d of ["up", "down", "left", "right"]) {
                const [dx, dy] = DIRS[d]; let nx = x + dx, ny = y + dy;
                if (this.blocked(nx, ny)) continue;
                // Paper chutes carry you until something stops you.
                while (PROP[this.tile(nx, ny)]?.chute && !this.blocked(nx + dx, ny + dy)) { nx += dx; ny += dy; }
                const k = `${nx},${ny}`;
                if (prev.has(k)) continue;
                prev.set(k, [x, y, d]);
                if (goal(nx, ny)) { end = [nx, ny]; q.length = 0; break; }
                q.push([nx, ny]);
            }
        }
        if (!end) return null;
        const out = []; let cur = end;
        for (;;) { const pv = prev.get(`${cur[0]},${cur[1]}`); if (!pv) break; out.unshift(pv[2]); cur = pv; }
        if (interactive) { const d = tx > end[0] ? "right" : tx < end[0] ? "left" : ty > end[1] ? "down" : "up"; out.push({ interact: true, dir: d, ent, x: tx, y: ty }); }
        return out;
    }
    openMenu() { this.game.audioKit?.play("open"); this.stack.push(new PauseMenu(this)); }

    // --- Draw -------------------------------------------------------------------------------------------------------------
    draw(d, V) {
        const g = this.game, h = this.hero; let [cx, cy] = this.viewOffset();
        if (this.shakeT > 0) { cx += Math.sin(this.time * 70) * this.shakeA * this.shakeT; cy += Math.cos(this.time * 53) * this.shakeA * this.shakeT; }
        const t = this.time;
        d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: INK });
        d.push(); d.translate(-Math.round(cx), -Math.round(cy));
        const x0 = Math.max(0, Math.floor(cx / TILE) - 1), x1 = Math.min(this.w - 1, Math.ceil((cx + V.width) / TILE) + 1), y0 = Math.max(0, Math.floor(cy / TILE) - 1), y1 = Math.min(this.h - 1, Math.ceil((cy + V.height) / TILE) + 1);
        const put = d.quads(this.tileName), R = TILE + 0.6;
        const isWall = (x, y) => "#WE^v+ ".includes(this.tile(x, y));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const c = this.tile(x, y), X = x * TILE + TILE / 2, Y = y * TILE + TILE / 2;
            if (c === " ") continue;
            if (c === "#" || c === "W" || c === "+" || c === "E" || c === "^" || c === "v") {
                const below = this.tile(x, y + 1), open = below !== " " && !"#WE^v+".includes(below);
                if (open) { put(X, Y, R, R, 0, c === "W" ? F.window : c === "+" ? F.poster : c === "E" ? F.lift : c === "^" ? F.up : c === "v" ? F.down : F.face); continue; }
                let m = 0;
                const op = (a, b) => !isWall(a, b);
                if (op(x, y - 1)) m |= 1; if (op(x + 1, y)) m |= 2; if (open || op(x, y + 1)) m |= 4; if (op(x - 1, y)) m |= 8;
                put(X, Y, R, R, 0, F.cap + m);
                continue;
            }
            const v = (x * 7 + y * 13) & 3, lino = c === "," || (c !== "." && c !== "\"" && this.linoNear(x, y));
            put(X, Y, R, R, 0, lino ? F.lino + (v & 1) : F.floor + v);
            if (c === "\"") put(X, Y, R, R, 0, F.clutter + ((x + y * 3) % 3));
            if (c === "~") put(X, Y, R, R, 0, F.lino);
        }
        for (const dc of this.f.decals ?? []) d.sprite(decalSprite(g, dc.name), { x: dc.x * TILE, y: dc.y * TILE, width: dc.w, height: dc.h });
        // Y-sorted props and actors
        const items = [];
        const put2 = () => {};
        void put2;
        for (let y = y0; y <= y1 + 1; y++) for (let x = x0; x <= x1; x++) { const c = this.tile(x, y), p = PROP[c]; if (p && c !== "J" && c !== "&" && c !== "~") items.push({ y: y + 0.01, x, c, p, yy: y }); }
        for (const e of this.ents) if (this.active(e) && e.def.t !== "step" && e.def.t !== "ghost") items.push({ y: e.py / TILE, e });
        items.push({ y: h.py / TILE + 0.02, hero: 1 });
        if (this.followSp) items.push({ y: this.followY() - 0.01, fol: 1 });
        items.sort((a, b) => a.y - b.y);
        for (const it of items) {
            if (it.p) { const pr = d.quads("props"); pr(it.x * TILE + TILE / 2, it.yy * TILE + TILE - 27, 36, 54, 0, it.p.frame); }
            else if (it.e) this.drawEnt(d, it.e);
            else if (it.hero) this.drawActor(d, "p:hero", h);
            else if (it.fol) this.drawFollower(d);
        }
        if (this.rustle) for (let i = 0; i < 3; i++) { const a = i * 2.1 + t * 3, r = this.rustle.t * 34; d.rect(5, 6, { x: this.rustle.x * TILE + 18 + Math.cos(a) * r, y: this.rustle.y * TILE + 18 - r * 0.8 + Math.sin(a) * 4, color: "#fbf6e8", outline: INK, rot: a }); }
        // A small prompt over whoever you could talk to right now.
        if (!this.script && !h.moving) { const [fx, fy] = this.frontTile(), e = this.entAt(fx, fy); if (e && e.def.t !== "ghost") { const X = e.px + 18, Y = e.py - 24 + Math.sin(t * 5) * 2; d.circle(11, { x: X, y: Y, color: INK }); d.circle(9, { x: X, y: Y, color: COL.white }); for (let i = -1; i <= 1; i++) d.circle(1.5, { x: X + i * 4.5, y: Y, color: INK }); } }
        // Emotes
        for (const e of [...this.ents, h]) if (e.emote) { const X = e.px + 18, Y = e.py - 26 - Math.min(1, e.emote.t * 8) * 4; e.emote.t += 0.016; panel(d, X - 11, Y - 11, 22, 22, { radius: 11, fill: COL.sticky, shadow: 2 }); T(d, g, e.emote.ch, X, Y, { align: "center", size: 15, bold: true }); }
        d.pop();
        // Light: a soft vignette and fluorescent flicker, cheap and moody.
        const fl = this.f.dark ? 0.32 : 0;
        if (fl) d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#0d1022", opacity: fl + Math.sin(t * 11) * 0.01 });
        this.drawHud(d, V);
        if (this.drag?.active) { const dr = this.drag; d.circle(46, { x: dr.x, y: dr.y, color: "#1e223322" }); d.circle(46, { x: dr.x, y: dr.y, outline: { width: 2, color: "#fffdf566" } }); const dx = dr.cx - dr.x, dy = dr.cy - dr.y, l = Math.hypot(dx, dy) || 1, m = Math.min(l, 46); d.circle(20, { x: dr.x + dx / l * m, y: dr.y + dy / l * m, color: "#fffdf5aa" }); }
        if (this.flashT > 0) d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: this.flashC, opacity: Math.min(1, this.flashT * 2.5) });
        if (this.fade > 0) d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: INK, opacity: this.fade });
    }
    followY() { const h = this.hero, tr = this.trail[0] ?? h; const k = h.moving ? Math.min(1, h.t) : 1, last = this.trail[1] ?? tr; return last.y + (tr.y - last.y) * k; }
    drawFollower(d) {
        const h = this.hero, tr = this.trail[0] ?? { x: h.x, y: h.y }, last = this.trail[1] ?? tr, k = h.moving ? Math.min(1, h.t) : 1;
        const x = (last.x + (tr.x - last.x) * k) * TILE + 18, y = (last.y + (tr.y - last.y) * k) * TILE + 16, b = Math.abs(Math.sin((h.walk ?? 0) * 12)) * 3 + Math.sin(this.time * 3) * 0.8;
        const flip = h.x > tr.x; d.sprite(flip ? beastFlip(this.game, this.followSp) : beastSprite(this.game, this.followSp), { x, y: y - b, width: 34, height: 34, flipX: flip });
    }
    drawEnt(d, e) {
        const o = e.def;
        if (o.t === "item") { const b = Math.sin(this.time * 3 + e.x) * 2; d.sprite(itemSprite(this.game, "folder"), { x: e.px + 18, y: e.py + 18 + b, width: 26, height: 26 }); return; }
        if (o.prop) { d.quads("props")(e.px + 18, e.py + 36 - 27, 36, 54, 0, PROP[o.prop].frame); return; }
        if (o.beast) { const b = Math.abs(Math.sin(this.time * 2.5 + e.x)) * 3, flip = e.dir === "right"; d.sprite(flip ? beastFlip(this.game, o.beast) : beastSprite(this.game, o.beast), { x: e.px + 18, y: e.py + 12 - b, width: o.size ?? 42, height: o.size ?? 42, flipX: flip }); return; }
        if (o.look) this.drawActor(d, "p:" + o.look, e);
        if (o.t === "trainer" && !this.S.beaten[e.key]) { /* unbeaten trainers carry their stickers quietly */ }
    }
    drawActor(d, name, a) {
        const dirI = a.dir === "down" ? 0 : a.dir === "up" ? 1 : 2, frame = dirI * 2 + (a.moving ? (Math.floor((a.walk ?? 0) * 9) & 1) : 0);
        d.sprite(name, { x: a.px + 18, y: a.py + 12, width: 40, height: 48, frame, flipX: a.dir === "right" });
    }
    drawHud(d, V) {
        const g = this.game, S = this.S, f = this.f;
        if (this.banner > 0 && !(this.script && S.flags.__)) {
            const a = Math.min(1, this.banner * 2, (2.6 - this.banner) * 5), y = 14 + (1 - a) * -30;
            const w = Math.min(V.width - 80, Math.max(measure2(g, f.name) + 34, 170));
            panel(d, 10, y, w, 46, { fill: COL.manila, radius: 5 });
            T(d, g, f.tag ?? "", 22, y + 13, { size: 11, bold: true, font: TYPE, color: "#6b4d1e" });
            T(d, g, f.name, 22, y + 31, { size: 15, bold: true });
        }
        const o = !this.script ? objective(S) : null;
        if (o && this.banner <= 0 && S.flags.showObjective) {
            const w = Math.min(V.width - 80, measure2small(g, o.text) + 30);
            panel(d, 10, 12, w, 30, { fill: COL.sticky, radius: 3, shadow: 3 });
            T(d, g, o.text, 22, 27, { size: 12, bold: true });
        }
        if (S.steps < 3 && !this.script && this.fade <= 0) {
            const b = Math.sin(this.time * 4) * 5, y = V.height - 96, w = 230;
            panel(d, V.width / 2 - w / 2, y + b, w, 46, { fill: COL.sticky, radius: 5 });
            T(d, g, "Drag anywhere to walk", V.width / 2, y + 23 + b, { align: "center", size: 16, bold: true });
        }
        if (S.party.length && !this.script) {
            const x = V.width - 54, y = 10;
            this.addHit({ x: x - 2, y: y - 2, w: 50, h: 50, id: "menu", fn: () => this.openMenu() });
            panel(d, x, y, 44, 44, { fill: COL.white, radius: 8 });
            d.sprite(itemSprite(g, "case"), { x: x + 22, y: y + 22, width: 32, height: 32 });
            const ok = S.party.filter((m) => m.hp > 0).length;
            void ok;
        }
    }
}
const measure2 = (g, t) => g.renderer.measureText(t, { size: 15, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width;
const measure2small = (g, t) => g.renderer.measureText(t, { size: 12, font: FONT, bold: true, align: "center", maxWidth: 0, lineHeight: 1.25 }).width;

const DESK = [
    "A sticky note on the monitor says: PASSWORD IS ON THE OTHER STICKY NOTE.",
    "A framed photo of the stock family that came with the frame. It's been up for six years.",
    "The chair is still warm. The person is on their third 'quick coffee' of the morning.",
    "A motivational mug: HANG IN THERE. The tea inside gave up in April.",
    "Open on the screen: a spreadsheet, and behind it, a holiday in Portugal.",
    "An out-of-tray, an in-tray, and a much larger shake-it-all-about tray.",
    "Someone has written KEEP OFF, MIKE on a stapler. Mike took it anyway. There's a chalk outline.",
    "The drawer contains eleven soy sauce packets, and a resignation letter dated 2015.",
];
const WINDOW = ["You can see the car park. Somewhere down there, a car alarm is going through something.", "It doesn't open. None of them open. Legal insisted.", "A pigeon on the ledge makes eye contact. It has better benefits than you.", "The view is excellent. It is reserved for Grade 7 and above. Please look away."];
const POSTER = ["TEAMWORK: Because none of us is as paid as all of us.", "SAFETY FIRST. Productivity first as well. Both first.", "OUR VALUES: Integrity. Agility. Ownership. Integrity (again, for emphasis).", "IF YOU SEE SOMETHING, SAY SOMETHING, BUT SCHEDULE IT.", "THE BEATINGS WILL CONTINUE UNTIL ENGAGEMENT SCORES IMPROVE. (This poster has been removed. It is still here.)"];
const COOLER = ["The water cooler glugs. It knows things. It's not telling you.", "You take a paper cone of water. It leaks. It was always going to leak.", "Two colleagues stop talking as you approach, then start again, quieter."];
const FRIDGE = ["A note on the fridge: THIS IS NOT YOUR MOTHER. YOUR MOTHER WOULD HAVE LOVED YOU ANYWAY.", "Something at the back moved. You close the door gently."];
const CABINET = ["Filed under M: Miscellaneous. Filed under S: Stuff. Filed under Z: Things Karen said to throw away.", "It's locked. It has been locked since the key was filed in it.", "Each drawer contains exactly one paperclip and a sense of regret."];
const PLANT = ["Plastic. Someone has been watering it for three years.", "It's thriving, in spite of everything. Good for it.", "A label on the pot: PLEASE DO NOT WATER ME. I AM FULL. - FERN"];
const BOARD = ["The whiteboard says DO NOT ERASE in a hand that is no longer employed here.", "Someone drew a funnel. Everything goes in at the top. Nothing comes out.", "SYNERGY -> ??? -> PROFIT. Nobody can remember the middle step."];
const SERVER = ["It hums in a key that makes you feel slightly unemployed.", "A label reads: DO NOT TURN OFF. A second label, in different pen: WHY NOT?"];
const PRINTER = ["TRAY 2 EMPTY. You open Tray 2. It is full. You close it, and you think about your life.", "It whirrs when you walk past. Then stops, the moment you need it."];
const BIN = ["Mostly first drafts. One says 'Dear Sir, I quit.' It's got six revisions.", "A half-eaten sandwich, with a note: 'don't judge me.'"];
const YOGA = ["It's a yoga ball, being used as a chair, by someone who talks about it a lot."];
const BOOKS = ["The Contract Law, Vol. 1 to 9. Vol. 10 was sued out of existence.", "Every spine is uncracked. They are bought by the metre."];
const BOXES = ["Boxes marked 'Q3 Offsite Lanyards'. The Q3 in question was in 2008.", "Boxes marked 'Fragile'. Someone has written 'Same' underneath."];
