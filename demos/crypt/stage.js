// Draws a floor and turns the simulator's events into a little animated comedy.
// The rules have already finished by the time anything moves here: this is pure theatre.
import { C, GLYPH_COLOR, SPR, THEMES, ptext, spr } from "./art.js";
import { Lightmap, MARGIN } from "./light.js";
import { DIRS, H, M, MON0, MSIZE, O, T as TT, TER0, doorsOpen, gateOpen, handTiles, isBoss, monAt, monsters, spikePhase, threats } from "./sim.js";
import { MON_KEY } from "./data.js";

export const T = 24;
const lerp = (a, b, k) => a + (b - a) * k;
const backOut = (k) => { const c = 2.2; const u = k - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
const ease = (k) => 1 - (1 - k) * (1 - k);
const noise = (t, s) => Math.sin(t * 13.1 + s) * 0.5 + Math.sin(t * 7.3 + s * 2.1) * 0.3 + Math.sin(t * 23.7 + s * 0.7) * 0.2;

const maps = new Map();
function lightmapFor(game, w, h) {
    const k = `${w}x${h}`;
    if (!maps.has(k)) maps.set(k, new Lightmap(game, `lm${k}`, w, h));
    return maps.get(k);
}

const KILL_WORD = { bonk: "BONK!", pit: "BYE!", lava: "SIZZLE!", spike: "SKEWERED!", boom: "BOOM!", crush: "SQUASH!", door: "SLAM!", gore: "GORED!", spit: "SPLAT!", slam: "CRUNCH!", fuse: "", hand: "TICK!", boss: "" };

export class Stage {
    constructor(s, fl, state, o = {}) {
        this.s = s; this.game = s.game; this.fl = fl; this.state = state; this.vs = state; this.o = o;
        this.dkey = o.theme ?? "cata"; this.th = THEMES[this.dkey];
        this.keeper = o.keeper ?? "mort";
        this.time = 0; this.queue = []; this.active = []; this.parts = []; this.pops = []; this.flares = []; this.bolts = [];
        this.lm = lightmapFor(this.game, fl.w, fl.h);
        this.player = { x: 0, y: 0, z: 0, sx: 1, sy: 1, flip: false, flash: 0, hidden: false };
        this.actors = new Map(); this.hide = new Set(); this.floating = [];
        this.overlay = 0; this.lightClock = 1; this.exitPulse = 0;
        this.S = 2; this.ox = 0; this.oy = 0;
        this.hint = null; this.danger = new Uint8Array(fl.n); this.previews = [];
        this.floorVar = []; for (let i = 0; i < fl.n; i++) this.floorVar.push((((i * 2654435761) >>> 8) % 11 < 7 ? 0 : 1 + (i * 7) % 3));
        this.torches = this.pickTorches();
        this.sync(state);
        this.lm.setBlocks((x, y) => this.blocksLight(x, y));
        this.refreshDanger();
    }
    pickTorches() {
        const w = this.fl.w, list = [], ex = this.fl.ter.indexOf(TT.EXIT) % w;
        for (const x of w > 5 ? [0.5, w - 0.5, w / 2] : [0.5, w - 0.5]) if (Math.abs(x - ex - 0.5) > 1.2) list.push(x);
        return list;
    }
    blocksLight(x, y) {
        const fl = this.fl;
        if (x < 0 || y < 0 || x >= fl.w || y >= fl.h) return false;
        const i = y * fl.w + x, t = this.vs[TER0 + i];
        return t === TT.WALL || (t === TT.DOOR && !doorsOpen(fl, this.vs));
    }
    tileXY(i) { return [i % this.fl.w, (i / this.fl.w) | 0]; }
    sync(state) {
        this.vs = state; const [x, y] = this.tileXY(state[H.P]);
        this.player.x = x; this.player.y = y; this.actors.clear();
        for (const m of monsters(state)) { const [mx, my] = this.tileXY(m.p); this.actors.set(m.o, this.makeActor(m.t, mx, my, m.o)); }
        this.queue.length = 0; this.active.length = 0; this.floating.length = 0; this.hide.clear(); this.state = state;
    }
    makeActor(t, x, y, o) { return { t, x, y, z: 0, sx: 1, sy: 1, flash: 0, o, seed: o * 0.37, flip: false, dying: false, opacity: 1 }; }

    /** Fits the board to the rectangle left over by the HUD. */
    layout(x, y, w, h) {
        const fl = this.fl, bw = fl.w * T + 6, bh = fl.h * T + 56;
        let S = Math.min(w / bw, h / bh);
        S = Math.max(1, Math.floor(S * 4) / 4);
        this.S = S;
        this.ox = Math.round(x + w / 2 - fl.w * T * S / 2);
        this.oy = Math.round(y + (h - (fl.h * T + 54) * S) / 2 + 52 * S);
        this.bx = x; this.by = y; this.bw = w; this.bh = h;
    }
    toView(tx, ty) { return [this.ox + (tx + 0.5) * T * this.S, this.oy + (ty + 0.5) * T * this.S]; }
    /** Which tile is under a view point. */
    tileAt(vx, vy) { return [Math.floor((vx - this.ox) / (T * this.S)), Math.floor((vy - this.oy) / (T * this.S))]; }

    refreshDanger() {
        this.danger = threats(this.fl, this.state);
    }

    // ---------- the timeline ----------
    get busy() { return this.queue.length > 0 || this.active.length > 0; }
    beat(dur, tick, o = {}) { this.queue.push({ dur, tick, t: 0, with: o.with, end: o.end, start: o.start }); }
    update(dt) {
        const speed = this.queue.length > 6 ? 2.2 : 1;
        this.time += dt;
        const adv = dt * speed;
        if (!this.active.length && this.queue.length) this.pull();
        for (const b of this.active) {
            b.t += adv; const k = Math.min(1, b.t / b.dur);
            b.tick?.(k);
        }
        if (this.active.length && this.active.every((b) => b.t >= b.dur)) { for (const b of this.active) b.end?.(); this.active.length = 0; if (this.queue.length) this.pull(); else this.onIdle?.(); }
        for (const a of [this.player, ...this.actors.values()]) { a.flash = Math.max(0, a.flash - dt * 5); a.sx = lerp(a.sx, 1, Math.min(1, dt * 14)); a.sy = lerp(a.sy, 1, Math.min(1, dt * 14)); }
        for (let i = this.parts.length - 1; i >= 0; i--) { const p = this.parts[i]; p.life -= dt; if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        for (let i = this.pops.length - 1; i >= 0; i--) { const p = this.pops[i]; p.t += dt; if (p.t > p.life) this.pops.splice(i, 1); }
        for (let i = this.flares.length - 1; i >= 0; i--) { const f = this.flares[i]; f.t += dt; if (f.t > f.life) this.flares.splice(i, 1); }
        this.overlay = lerp(this.overlay, this.busy ? 0 : 1, Math.min(1, dt * (this.busy ? 18 : 10)));
        this.lightClock += dt;
    }
    pull() {
        do {
            const b = this.queue.shift(); b.start?.(); this.active.push(b); b.tick?.(0);
        } while (this.queue.length && this.queue[0].with);
    }

    // ---------- particles and pops ----------
    dust(x, y, n, col, o = {}) {
        const f = this.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = f.next() * 6.283, v = (o.speed ?? 30) * (0.3 + f.next());
            this.parts.push({ x: x + (f.next() - 0.5) * (o.spread ?? 8), y: y + (f.next() - 0.5) * (o.spread ?? 8), vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up ?? 10), g: o.g ?? 60, life: (o.life ?? 0.4) * (0.5 + f.next()), max: o.life ?? 0.4, c: Array.isArray(col) ? col[(f.next() * col.length) | 0] : col, size: o.size ?? (f.next() < 0.4 ? 2 : 1) });
            if (this.parts.length > 260) this.parts.shift();
        }
    }
    pop(text, tx, ty, color = C.gold, big = 1) { this.pops.push({ text, x: (tx + 0.5) * T, y: (ty + 0.2) * T, color, t: 0, life: 0.85, big }); }
    flare(tx, ty, r, c, life, i = 1.4) { this.flares.push({ x: tx, y: ty, r, c, life, t: 0, i }); }

    // ---------- turning events into theatre ----------
    play(events, next) {
        const g = this.o.fx ?? {};
        this.state = next;
        for (let i = 0; i < events.length; i++) this.event(events[i], g, i ? events[i - 1] : null);
        this.beat(0.001, null, { end: () => { this.vs = next; this.settle(next); this.lm.setBlocks((x, y) => this.blocksLight(x, y)); this.refreshDanger(); } });
    }
    /** After a turn, make sure every actor is exactly where the rules say. */
    settle(state) {
        const live = new Set();
        for (const m of monsters(state)) {
            live.add(m.o);
            const [x, y] = this.tileXY(m.p);
            const a = this.actors.get(m.o);
            if (!a) this.actors.set(m.o, this.makeActor(m.t, x, y, m.o)); else { a.x = x; a.y = y; a.z = 0; a.dying = false; a.opacity = 1; }
        }
        for (const k of [...this.actors.keys()]) if (!live.has(k)) this.actors.delete(k);
        const [px, py] = this.tileXY(state[H.P]); this.player.x = px; this.player.y = py; this.player.z = 0;
        this.hide.clear(); this.floating.length = 0;
    }
    actorAt(i) { const [x, y] = this.tileXY(i); for (const a of this.actors.values()) if (!a.dying && Math.round(a.x) === x && Math.round(a.y) === y) return a; return null; }
    slide(a, from, to, dur, o = {}) {
        const [x0, y0] = this.tileXY(from), [x1, y1] = this.tileXY(to);
        return (k) => {
            const e = o.linear ? k : ease(k);
            a.x = lerp(x0, x1, e); a.y = lerp(y0, y1, e);
            a.z = (o.hop ?? 0) * Math.sin(k * Math.PI);
        };
    }
    event(e, fx, prev) {
        const p = this.player, S = this;
        const stepBeat = { with: prev && ["step", "dazed", "fuse", "windup"].includes(prev.k) };
        switch (e.k) {
            case "move": {
                if (e.d === 1) p.flip = false; if (e.d === 3) p.flip = true;
                const dur = e.slid ? 0.2 : 0.085;
                this.beat(dur, this.slide(p, e.from, e.to, dur, { hop: e.slid ? 0 : 2.5 }), { start: () => { p.sx = 1.14; p.sy = 0.86; fx.step?.(); }, end: () => { p.sx = 0.9; p.sy = 1.1; const [x, y] = this.tileXY(e.to); this.dust((x + 0.5) * T, (y + 0.85) * T, 2, C.sand, { life: 0.25, speed: 14 }); } });
                break;
            }
            case "wait": this.beat(0.08, null, { start: () => { p.sy = 0.84; p.sx = 1.12; fx.wait?.(); } }); break;
            case "lunge": {
                if (e.d === 1) p.flip = false; if (e.d === 3) p.flip = true;
                const [x, y] = this.tileXY(e.at), [dx, dy] = DIRS[e.d];
                this.beat(0.05, (k) => { p.x = x + dx * 0.28 * k; p.y = y + dy * 0.28 * k; }, { start: () => { p.sx = dx ? 1.25 : 0.8; p.sy = dx ? 0.8 : 1.25; fx.shove?.(); } });
                this.beat(0.05, (k) => { p.x = x + dx * 0.28 * (1 - k); p.y = y + dy * 0.28 * (1 - k); });
                break;
            }
            case "shove": {
                const a = this.actors.get(e.o); if (!a) break;
                const dur = e.to === e.from ? 0.01 : e.slid ? 0.2 : 0.09;
                this.beat(dur, this.slide(a, e.from, e.to, dur), { with: true, start: () => { a.sx = 1.3; a.sy = 0.72; a.flash = 0.7; } });
                break;
            }
            case "slam": this.beat(0.1, null, { start: () => { const a = this.at(e.at); fx.slam?.(); this.s.shake(2.5, 0.12, { haptic: false }); this.game.haptic("medium"); this.pop("SLAM", ...a, C.straw); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 8, [C.bone, C.sand], { speed: 40 }); } }); break;
            case "bonk": this.beat(0.11, null, { start: () => { const a = this.at(e.at); fx.bonk?.(); this.s.freeze(0.07); this.s.shake(5, 0.2, { haptic: false }); this.s.flash("#fff6dc55", 0.08); this.game.haptic("heavy"); this.pop("BONK!", ...a, C.gold, 2); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 22, [C.gold, C.bone, C.ember], { speed: 70, size: 2 }); this.flare(a[0] + 0.5, a[1] + 0.5, 3, [255, 220, 120], 0.25); } }); break;
            case "kill": this.killBeat(e, fx); break;
            case "step": {
                const a = this.actors.get(e.o); if (!a) break;
                const [fx0] = this.tileXY(e.from), [fx1] = this.tileXY(e.to);
                if (fx1 !== fx0) a.flip = fx1 < fx0;
                this.beat(e.hop ? 0.14 : 0.08, this.slide(a, e.from, e.to, 0.08, { hop: e.hop ? 10 : 2 }), { ...stepBeat, start: () => { a.sy = 1.14; a.sx = 0.9; fx.mstep?.(a.t); }, end: () => { a.sy = 0.86; a.sx = 1.12; } });
                break;
            }
            case "bite": {
                const a = this.actors.get(e.o); if (!a) break;
                const [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to);
                this.beat(0.07, (k) => { a.x = lerp(x0, x1, k * 0.6); a.y = lerp(y0, y1, k * 0.6); }, { start: () => { fx.bite?.(); } });
                this.beat(0.08, (k) => { a.x = lerp(x0, x1, 0.6 * (1 - k)); a.y = lerp(y0, y1, 0.6 * (1 - k)); });
                break;
            }
            case "hurt": this.beat(0.16, null, { start: () => { const a = this.at(e.at); p.flash = 1; p.sx = 1.3; p.sy = 0.7; fx.hurt?.(); this.s.freeze(0.09); this.s.shake(6, 0.26, { haptic: false }); this.s.flash("#b52f3066", 0.14); this.game.haptic("error"); this.pop("OUCH", ...a, C.rose, 2); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 14, [C.red, C.ember, C.rose], { speed: 56 }); this.o.onHurt?.(e); } }); break;
            case "shield": this.beat(0.12, null, { start: () => { const a = this.at(e.at); fx.shield?.(); this.game.haptic("medium"); this.pop("BLOCKED", ...a, C.aqua); this.flare(a[0] + 0.5, a[1] + 0.5, 3, [120, 240, 220], 0.3); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 12, [C.aqua, C.mint], { speed: 50 }); } }); break;
            case "boom": this.beat(0.16, null, { start: () => this.boom(e.at, fx) }); break;
            case "smash": this.beat(0.05, null, { start: () => { const a = this.at(e.at); fx.smash?.(); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 16, [C.tan, C.sand, C.bone], { speed: 60, size: 2 }); this.s.shake(3, 0.12, { haptic: false }); } }); break;
            case "coin": this.beat(0.001, null, { with: true, start: () => { const a = this.at(e.at); fx.coin?.(); this.pop("+1", ...a, C.gold); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 8, [C.gold, C.bone], { speed: 34 }); this.o.onCoin?.(); } }); break;
            case "ticket": this.beat(0.001, null, { with: true, start: () => { const a = this.at(e.at); fx.ticket?.(); this.pop("TICKET!", ...a, C.bone, 1); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 12, [C.cream, C.gold], { speed: 44 }); } }); break;
            case "tea": this.beat(0.001, null, { with: true, start: () => { const a = this.at(e.at); fx.tea?.(); this.pop("LOVELY", ...a, C.mint); } }); break;
            case "spit": this.bolt(e, fx); break;
            case "windup": this.beat(0.1, null, { ...stepBeat, start: () => { const a = this.actors.get(this.monSlot(e.at)); if (a) { a.sy = 0.72; a.sx = 1.22; } fx.windup?.(); this.game.haptic("tick"); } }); break;
            case "charge": {
                const a = this.actors.get(e.o); if (!a) break;
                const n = Math.abs(((e.to / this.fl.w) | 0) - ((e.from / this.fl.w) | 0)) + Math.abs(e.to % this.fl.w - e.from % this.fl.w), dur = Math.max(0.06, 0.04 * n);
                this.beat(dur, this.slide(a, e.from, e.to, dur, { linear: true }), { start: () => { fx.charge?.(); a.sx = 1.25; a.sy = 0.8; }, end: () => { const [x, y] = this.tileXY(e.to); this.dust((x + 0.5) * T, (y + 0.7) * T, 8, C.sand, { speed: 40 }); if (e.crash) { this.s.shake(4, 0.16, { haptic: false }); this.game.haptic("medium"); fx.slam?.(); } } });
                break;
            }
            case "fuse": this.beat(0.09, null, { ...stepBeat, start: () => { fx.fuse?.(); this.game.haptic("warn"); const [x, y] = this.tileXY(e.at); this.pop("!", x, y - 0.2, C.ember, 2); } }); break;
            case "dazed": break;
            case "crate": {
                const [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to);
                const box = { x: x0, y: y0, sprite: "crate" };
                this.hide.add(e.to);
                this.floating.push(box);
                this.beat(0.085, (k) => { box.x = lerp(x0, x1, ease(k)); box.y = lerp(y0, y1, ease(k)); }, { with: true, start: () => fx.crate?.(), end: () => { if (e.fill) { this.dust((x1 + 0.5) * T, (y1 + 0.5) * T, 14, e.wasLava ? [C.ember, C.gold, C.ink2] : [C.tan, C.ink2], { speed: 40 }); fx.fill?.(); box.sprite = null; } } });
                break;
            }
            case "roll": {
                const [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to), n = Math.abs(x1 - x0) + Math.abs(y1 - y0), dur = Math.max(0.05, 0.045 * n);
                const box = { x: x0, y: y0, sprite: "keg", spin: 0 }; this.floating.push(box);
                this.beat(dur, (k) => { box.x = lerp(x0, x1, k); box.y = lerp(y0, y1, k); box.spin = k * n * 2; }, { with: true, start: () => fx.roll?.(), end: () => { box.sprite = null; if (e.sink) fx.fill?.(); } });
                break;
            }
            case "portal": {
                const target = e.player ? p : this.actors.get(e.o); if (!target) break;
                this.beat(0.14, (k) => { target.sx = target.sy = k < 0.5 ? 1 - k * 2 : (k - 0.5) * 2; if (k >= 0.5) { const [x, y] = this.tileXY(e.to); target.x = x; target.y = y; } }, { start: () => fx.portal?.() });
                break;
            }
            case "bossHit": this.beat(0.24, null, { start: () => { const a = this.at(e.at); fx.bossHit?.(); this.s.freeze(0.12); this.s.shake(7, 0.3, { haptic: false }); this.s.flash("#fff6dc88", 0.1); this.game.haptic("heavy"); this.pop(e.hp > 0 ? `${e.hp} LEFT!` : "DONE!", ...a, C.gold, 2); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 26, [C.gold, C.ember, C.bone], { speed: 80, size: 2 }); const ac = this.bossActor(); if (ac) ac.flash = 1; this.o.onBossHit?.(e); } }); break;
            case "bossDead": this.beat(0.8, (k) => { const ac = this.bossActor(); if (ac) { ac.sx = 1 + Math.sin(k * 40) * 0.1; ac.sy = 1 - k; ac.opacity = 1 - k * k; } }, { start: () => { const a = this.at(e.at); fx.bossDead?.(); this.s.shake(10, 0.7, { haptic: false }); this.game.haptic("success"); this.flare(a[0] + 0.5, a[1] + 0.5, 6, [255, 210, 110], 0.8, 2); for (let i = 0; i < 5; i++) this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 14, [C.gold, C.bone, C.ember], { speed: 40 + i * 20, life: 0.8, size: 2 }); this.o.onBossDead?.(e); } }); break;
            case "warp": {
                const a = this.actors.get(e.o); if (!a) break;
                this.beat(0.16, this.slide(a, e.from, e.to, 0.16, { hop: 24 }));
                break;
            }
            case "door": this.beat(0.05, null, { with: true, start: () => fx.door?.(e.open) }); break;
            case "slamDoor": this.beat(0.1, null, { start: () => { const a = this.at(e.at); this.s.shake(5, 0.2, { haptic: false }); this.pop("SLAM!", ...a, C.gold, 2); } }); break;
            case "mark": this.beat(0.05, null, { with: true, start: () => fx.mark?.() }); break;
            case "lob": {
                const [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to);
                const box = { x: x0, y: y0, sprite: "keg", z: 0 }; this.floating.push(box); this.hide.add(e.to);
                this.beat(0.28, (k) => { box.x = lerp(x0, x1, k); box.y = lerp(y0, y1, k); box.z = Math.sin(k * Math.PI) * 40; }, { start: () => fx.lob?.(), end: () => { box.sprite = null; this.dust((x1 + 0.5) * T, (y1 + 0.7) * T, 10, C.sand, { speed: 34 }); fx.slam?.(); this.game.haptic("light"); } });
                break;
            }
            case "sweep": this.beat(0.1, null, { with: true, start: () => { fx.tick?.(); this.sweepFlash = 1; } }); break;
            case "snoozeNext": this.beat(0.1, null, { start: () => { const a = this.at(e.at); this.pop("SNOOZE!", ...a, C.gold); fx.ticket?.(); } }); break;
            case "spikeUp": this.beat(0.02, null, { with: true, start: () => fx.spike?.() }); break;
            case "shush": this.beat(0.14, null, { start: () => { const a = this.at(e.at); fx.shush?.(); this.pop("SHHH!", ...a, C.mint, 2); this.flare(a[0] + 0.5, a[1] + 0.5, 4, [160, 240, 220], 0.4); } }); break;
            case "frost": this.beat(0.14, null, { start: () => { fx.frost?.(); this.s.flash("#b3f0d244", 0.2); } }); break;
            case "dig": this.beat(0.12, null, { start: () => { const a = this.at(e.at); fx.dig?.(); this.s.shake(3, 0.12, { haptic: false }); this.game.haptic("medium"); this.dust((a[0] + 0.5) * T, (a[1] + 0.5) * T, 16, [C.tan, C.brown], { speed: 50 }); } }); break;
            case "drop": this.beat(0.08, null, { start: () => { fx.crate?.(); } }); break;
            case "hop": { const dur = 0.2; this.beat(dur, this.slide(p, e.from, e.to, dur, { hop: 20 }), { start: () => fx.hop?.() }); break; }
            case "swap": {
                const a = this.actors.get(e.o), [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to);
                this.beat(0.16, (k) => { p.x = lerp(x0, x1, k); p.y = lerp(y0, y1, k); p.z = Math.sin(k * 3.14) * 8; if (a) { a.x = lerp(x1, x0, k); a.y = lerp(y1, y0, k); } }, { start: () => fx.portal?.() });
                break;
            }
            case "win": break;
        }
    }
    at(i) { return this.tileXY(i); }
    monSlot(i) { for (const a of this.actors.values()) if (!a.dying && this.tileXY(i)[0] === Math.round(a.x) && this.tileXY(i)[1] === Math.round(a.y)) return a.o; return 0; }
    bossActor() { for (const a of this.actors.values()) if (isBoss(a.t)) return a; return null; }
    killBeat(e, fx) {
        const self = this;
        let a = null;
        const dur = e.how === "pit" ? 0.3 : e.how === "lava" ? 0.26 : 0.16;
        const [x, y] = this.tileXY(e.at);
        this.beat(dur, (k) => {
            if (!a) return;
            if (e.how === "pit") { a.sx = a.sy = 1 - k * 0.95; a.z = -k * 10; a.spin = k * 8; }
            else if (e.how === "lava") { a.sy = 1 - k; a.sx = 1 + k * 0.3; a.opacity = 1 - k; }
            else { a.opacity = 1 - k; a.z = k * 6; a.flash = 1 - k; }
        }, {
            start: () => {
                a = [...self.actors.values()].find((q) => q.t === e.t && !q.dying && Math.round(q.x) === x && Math.round(q.y) === y) ?? [...self.actors.values()].find((q) => q.t === e.t && !q.dying);
                if (a) { a.dying = true; a.flash = 1; }
                const word = KILL_WORD[e.how] ?? "";
                if (word && e.how !== "bonk") self.pop(word, x, y, e.how === "lava" ? C.amber : C.gold, 1);
                fx.kill?.(e.how);
                self.game.haptic(e.how === "pit" ? "medium" : "heavy");
                self.dust((x + 0.5) * T, (y + 0.5) * T, 12, e.how === "lava" ? [C.ember, C.gold, C.ink2] : [C.lime, C.bone, C.mint], { speed: 46 });
                self.parts.push({ x: (x + 0.5) * T, y: (y + 0.3) * T, vx: 0, vy: -26, g: -6, life: 0.8, max: 0.8, c: C.mint, size: 3 });
            },
            end: () => { if (a) self.actors.delete(a.o); },
        });
    }
    boom(at, fx) {
        const [x, y] = this.tileXY(at);
        fx.boom?.(); this.s.freeze(0.08); this.s.shake(8, 0.32, { haptic: false }); this.s.flash("#ffce4a55", 0.1); this.game.haptic("heavy");
        this.flare(x + 0.5, y + 0.5, 5.5, [255, 170, 70], 0.42, 2.2);
        this.pop("BOOM!", x, y, C.gold, 2);
        for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) this.dust((x + i + 0.5) * T, (y + j + 0.5) * T, 9, [C.gold, C.amber, C.ember, C.ink2], { speed: 56, life: 0.5, spread: 14, size: 2, g: -20 });
    }
    bolt(e, fx) {
        const [x0, y0] = this.tileXY(e.from), [x1, y1] = this.tileXY(e.to);
        const b = { x: x0 + 0.5, y: y0 + 0.5 };
        this.beat(0.1, (k) => { b.x = lerp(x0, x1, k) + 0.5; b.y = lerp(y0, y1, k) + 0.5; }, {
            start: () => { fx.spit?.(); this.bolts.push(b); },
            end: () => { this.bolts.splice(this.bolts.indexOf(b), 1); this.dust((x1 + 0.5) * T, (y1 + 0.5) * T, 7, [C.lime, C.leaf], { speed: 40 }); },
        });
    }

    // ---------- lights ----------
    lights() {
        const t = this.time, list = [], p = this.player, th = this.th;
        list.push({ x: p.x + 0.72, y: p.y + 0.55 - p.z / T, r: 4.4 + noise(t, 1) * 0.12, i: 0.92 + noise(t, 2) * 0.05, c: [255, 186, 100] });
        for (const tx of this.torches) list.push({ x: tx, y: -0.2, r: 4.2, i: 0.62 + noise(t, tx) * 0.08, c: th.torch });
        const fl = this.fl, vs = this.vs;
        const open = gateOpen(fl, vs), ex = fl.ter.indexOf(TT.EXIT);
        if (ex >= 0) list.push({ x: ex % fl.w + 0.5, y: 0.3, r: open ? 4.2 : 2, i: open ? 0.95 + Math.sin(t * 3) * 0.05 : 0.2, c: open ? [255, 216, 120] : [200, 120, 80] });
        let lavaLights = 0;
        for (let i = 0; i < fl.n && lavaLights < 5; i++) { const c = vs[TER0 + i]; if (c === TT.LAVA) { lavaLights++; const [x, y] = this.tileXY(i); list.push({ x: x + 0.5, y: y + 0.5, r: 3, i: 0.5 + noise(t, i) * 0.08, c: [255, 96, 30] }); } else if (c === TT.PORTAL) { const [x, y] = this.tileXY(i); list.push({ x: x + 0.5, y: y + 0.5, r: 2.4, i: 0.45, c: [150, 110, 255] }); } }
        for (const m of monsters(vs)) { if (m.t === M.IMP && m.timer > 0) { const [x, y] = this.tileXY(m.p); list.push({ x: x + 0.7, y: y, r: 2.4, i: 0.6 + Math.sin(t * 20) * 0.2, c: [255, 170, 60] }); } }
        for (const b of this.bolts) list.push({ x: b.x, y: b.y, r: 2.6, i: 0.8, c: [190, 240, 110] });
        for (const f of this.flares) list.push({ x: f.x, y: f.y, r: f.r, i: f.i * (1 - f.t / f.life), c: f.c });
        return list;
    }

    // ---------- drawing ----------
    draw(d) {
        if (this.lightClock > 1 / 24 || this.flares.length) { this.lightClock = 0; this.lm.render(this.lights(), this.th.ambient, this.th.base); }
        d.push(); d.translate(this.ox, this.oy); d.scale(this.S, this.S);
        this.drawWorld(d, this.vs, true);
        d.pop();
    }
    drawWorld(d, st, live) {
        const fl = this.fl, k = this.dkey, w = fl.w, h = fl.h, W = w * T, HH = h * T, t = live ? this.time : 0;
        const back = `back_${k}`, wall = `wall_${k}`, floor = `floor_${k}`;
        const PAD = MARGIN;
        // Everything outside the room is wall tops, fading into the dark.
        const capLeft = -PAD, capRight = w + PAD;
        for (let y = -3; y < h + 2; y++) for (let x = capLeft; x < capRight; x++) {
            if (x >= 0 && x < w && y >= -2 && y < h) continue;
            if (y === h && x >= 0 && x < w) { spr(d, wall, (x + 0.5) * T, y * T + 15, { frame: (x + y) & 1, color: "#b8a8a8" }); continue; }
            spr(d, wall, (x + 0.5) * T, y * T + 12, { frame: (x * 3 + y) & 1, color: "#8a7680" });
        }
        for (let x = 0; x < w; x++) spr(d, back, (x + 0.5) * T, -18, { frame: x & 1 });
        for (let x = -1; x <= w; x += w + 1) for (let y = -2; y < h; y++) spr(d, wall, (x + 0.5) * T, y * T + 15, { frame: y & 1, color: "#b8a8a8" });
        // Floor
        for (let i = 0; i < fl.n; i++) {
            const x = (i % w + 0.5) * T, y = (((i / w) | 0) + 0.5) * T, tv = st[TER0 + i];
            switch (tv) {
                case TT.PIT: { const up = i - w; const lip = up < 0 || st[TER0 + up] !== TT.PIT; spr(d, `floor_${k}`, x, y, { frame: 0 }); spr(d, `pit_${k}`, x, y, { frame: lip ? 0 : 1 }); break; }
                case TT.ICE: spr(d, `ice_${k}`, x, y); break;
                case TT.LAVA: spr(d, "lava", x, y, { frame: (t * 5 + i) | 0 }); break;
                case TT.RUBBLE: spr(d, `rubble_${k}`, x, y); break;
                default: spr(d, floor, x, y, { frame: this.floorVar[i] });
            }
            if (tv >= TT.SPIKE0 && tv <= TT.SPIKE2) spr(d, "spike", x, y, { frame: spikePhase(st, tv) });
            else if (tv === TT.PLATE) spr(d, "plate", x, y, { frame: doorsOpen(fl, st) ? 1 : 0 });
            else if (tv === TT.PORTAL) spr(d, "portal", x, y, { frame: (t * 8) | 0 });
            else if (tv === TT.EXIT) spr(d, "mat", x, y);
        }
        // Soft contact shade under the back wall.
        for (let x = 0; x < w; x++) d.sprite("atlas", { x: (x + 0.5) * T, y: 3, crop: [SPR.shadow.x + 8, SPR.shadow.y + 3, 2, 1], width: T, height: 6, opacity: 0.3 });
        // Exit door and wall dressing
        const open = gateOpen(fl, st), ex = fl.ter.indexOf(TT.EXIT);
        if (ex >= 0) {
            const ey = (ex % w + 0.5) * T;
            spr(d, "exit", ey, -20, { frame: open ? 1 : 0 });
            spr(d, "sign", ey, -46);
            ptext(d, fl.boss === "monday" ? "BED" : "GIFTS", ey + 1, -46, { scale: 0.75, color: open ? C.gold : C.ink2, shadow: false });
        }
        for (const tx of this.torches) spr(d, "torch", tx * T, -16, { frame: (t * 9 + tx * 3) | 0 });
        if (w > 5) { const bx = [1.5, w - 1.5].filter((q) => Math.abs(q - ex % w - 0.5) > 1.6); for (const q of bx) spr(d, "banner", q * T, -24, { frame: k === "bath" ? 1 : k === "hex" ? 2 : 0 }); }

        if (live) this.drawDanger(d, st);
        this.drawHands(d, st);

        // Things, back to front
        const actors = live ? [...this.actors.values()] : monsters(st).map((m) => { const q = this.makeActor(m.t, m.p % w, (m.p / w) | 0, m.o); return q; });
        const px = live ? this.player.x : st[H.P] % w, py = live ? this.player.y : (st[H.P] / w) | 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = y * w + x, tv = st[TER0 + i], ob = st[fl.OBJ0 + i];
                const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
                if (tv === TT.WALL) spr(d, wall, cx, cy, { frame: (x + y) & 1 });
                if (tv === TT.DOOR) spr(d, "door", cx, cy, { frame: doorsOpen(fl, st) ? 1 : 0 });
                if (live && this.hide.has(i)) continue;
                if (ob === O.CRATE) { spr(d, "shadow", cx, cy + 11, { opacity: 0.45 }); spr(d, "crate", cx, cy - 2); }
                else if (ob === O.KEG) { spr(d, "shadow", cx, cy + 11, { opacity: 0.45 }); spr(d, "keg", cx, cy - 2, { frame: t * 6 & 1 }); }
                else if (ob === O.COIN) spr(d, "coin", cx, cy - 1 + Math.sin(t * 3 + i) * 1.5, { frame: (t * 8 + i) | 0 });
                else if (ob === O.TICKET) spr(d, "ticket", cx, cy - 2 + Math.sin(t * 3) * 2, { frame: (t * 3) & 1 });
                else if (ob === O.TEA) spr(d, "tea", cx, cy);
                else if (ob === O.PILLAR) { spr(d, "shadow", cx, cy + 11, { opacity: 0.5 }); spr(d, "pillar", cx, cy - 8); }
                else if (ob === O.SNOOZE) { spr(d, "snooze", cx, cy + 1, { frame: (t * 3) & 1 }); }
                else if (ob === O.MARK) spr(d, "mark", cx, cy, { frame: (t * 6) & 1 });
            }
            for (const a of actors) if (Math.ceil(a.y - 0.01) === y) this.drawActor(d, a, st, t);
            if (Math.ceil(py - 0.01) === y) this.drawKeeper(d, px, py, t, live);
        }
        for (const f of this.floating) if (f.sprite) { const cx = (f.x + 0.5) * T, cy = (f.y + 0.5) * T - (f.z ?? 0); spr(d, f.sprite, cx, cy - 2, f.spin ? { rot: f.spin } : {}); }

        // Light on top of everything in the room.
        const L = this.lm, lw = (w + MARGIN * 2) * T, lh = (h + MARGIN * 2 + 1) * T;
        const cxx = W / 2, cyy = (HH - T) / 2;
        d.sprite(L.dark, { x: cxx, y: cyy, width: lw, height: lh });
        d.additive(() => d.sprite(L.tint, { x: cxx, y: cyy, width: lw, height: lh }));

        if (live) {
            this.drawParts(d);
            this.drawBadges(d, st, actors, t);
            for (const p of this.pops) {
                const k2 = p.t / p.life, s0 = Math.min(1, p.t / 0.12), sc = (p.big === 2 ? 1.5 : 1) * backOut(s0);
                ptext(d, p.text, p.x, p.y - 8 - k2 * 12, { scale: sc, color: p.color, opacity: k2 > 0.7 ? (1 - k2) / 0.3 : 1, outline: true, shadow: false });
            }
        }
    }
    drawParts(d) {
        for (const p of this.parts) {
            const a = Math.min(1, p.life / p.max * 2);
            d.sprite("atlas", { x: Math.round(p.x), y: Math.round(p.y), crop: [SPR.pix.x, SPR.pix.y, 1, 1], width: p.size, height: p.size, color: p.c, opacity: a });
        }
        for (const b of this.bolts) { const x = b.x * T, y = b.y * T; d.circle(4, { x, y, color: C.lime }); d.circle(2, { x, y, color: C.bone }); }
    }
    drawDanger(d, st) {
        const a = this.overlay; if (a < 0.03) return;
        const fl = this.fl, w = fl.w, t = this.time, pulse = 0.2 + Math.sin(t * 5) * 0.05;
        for (let i = 0; i < fl.n; i++) {
            if (!this.danger[i]) continue;
            const x = (i % w + 0.5) * T, y = (((i / w) | 0) + 0.5) * T;
            d.sprite("atlas", { x, y, crop: [SPR.tint.x, SPR.tint.y, 1, 1], width: T - 2, height: T - 2, color: C.red, opacity: pulse * a * 1.6 });
            spr(d, "corner", x, y, { color: C.ember, opacity: a * 0.9 });
        }
        // Clock hands and telegraph lanes get drawn right on the floor.
        for (const pv of this.previews) {
            const x = (pv.i % w + 0.5) * T, y = (((pv.i / w) | 0) + 0.5) * T, bob = Math.sin(t * 6) * 1;
            if (pv.bad) spr(d, "skull", x, y + bob, { opacity: a });
            else spr(d, "arrowLine", x, y, { rot: pv.d * Math.PI / 2, color: pv.shove ? C.gold : C.bone, opacity: a * (pv.shove ? 0.95 : 0.42) });
        }
        if (this.hint) {
            const p = this.player, [dx, dy] = DIRS[this.hint.d] ?? [0, 0];
            const x = (p.x + 0.5 + dx * (0.85 + Math.sin(t * 8) * 0.1)) * T, y = (p.y + 0.5 + dy * (0.85 + Math.sin(t * 8) * 0.1)) * T;
            if (this.hint.d <= 3) spr(d, "arrow", x, y, { rot: this.hint.d * Math.PI / 2, color: C.mint, scale: 1.4, opacity: a });
        }
    }
    /** MONDAY's two hands lie across the floor: bright where they are, dim where they'll be next. */
    drawHands(d, st) {
        const clock = monsters(st).find((m) => m.t === M.MONDAY); if (!clock) return;
        const w = this.fl.w, x0 = (clock.p % w + 0.5) * T, y0 = (((clock.p / w) | 0) + 0.5) * T;
        for (const [dir, col, wd] of [[(clock.dir + 1 + 8) % 8, C.ember, 2], [clock.dir, C.gold, 4]]) {
            const tiles = handTiles(this.fl, st, clock.p, dir);
            for (const i of tiles) { const x = (i % w + 0.5) * T, y = (((i / w) | 0) + 0.5) * T; d.line({ x: x0, y: y0 }, { x, y }, { width: wd, color: col, opacity: 0.8 }); }
        }
    }
    drawKeeper(d, x, y, t, live) {
        const p = live ? this.player : { z: 0, sx: 1, sy: 1, flip: false, flash: 0 };
        const cx = (x + 0.5) * T, base = (y + 1) * T - 3;
        const breathe = live ? Math.floor(t * 2.6) & 1 : 0;
        spr(d, "shadow", cx, base + 1, { opacity: 0.5 * (p.z > 3 ? 0.6 : 1) });
        d.push(); d.translate(cx, base - p.z); d.scale(p.sx, p.sy);
        const col = p.flash > 0 ? mix(p.flash) : undefined;
        spr(d, `k_${this.keeper}`, 0, -11, { frame: breathe, flip: p.flip, color: col });
        spr(d, "lantern", p.flip ? -8 : 8, -6 + (breathe ? 1 : 0), { frame: (t * 7) & 1, flip: p.flip });
        d.pop();
    }
    drawActor(d, a, st, t) {
        const key = MON_KEY[a.t], cx = (a.x + 0.5) * T, base = (a.y + 1) * T - 3, boss = isBoss(a.t);
        const slot = (a.o - MON0) / MSIZE;
        const m = { stun: st[a.o + 3], dir: st[a.o + 4], timer: st[a.o + 5], live: st[a.o] === a.t };
        const name = boss ? `b_${key}` : `m_${key}`;
        let frame = Math.floor(t * 2.4 + slot * 0.7) & 1;
        let flip = a.flip;
        if (a.t === M.SPITTER) { frame = m.dir === 2 ? 0 : m.dir === 0 ? 2 : 1; flip = m.dir === 3; }
        if (a.t === M.IMP && m.timer > 0) frame = 2 + (Math.floor(t * 12) & 1);
        let sy = a.sy, wob = 0;
        if (a.t === M.BULL && m.dir >= 0) { sy *= 0.9; wob = Math.sin(t * 40) * 0.6; }
        if (a.t === M.LATHER && m.dir >= 0) { wob = Math.sin(t * 40) * 0.8; }
        if (a.t === M.HORSE) { a.bounce = Math.abs(Math.sin(t * 5 + slot)) * 2; }
        const air = a.t === M.PHANTOM ? 3 + Math.sin(t * 3 + slot) * 1.5 : a.bounce ?? 0;
                spr(d, "shadow", cx, base + 1, { opacity: 0.5 * (a.opacity ?? 1), scale: boss ? 1.5 : 1 });
        d.push(); d.translate(cx + wob, base - a.z - air); if (a.spin) d.rotate(a.spin); d.scale(a.sx, sy);
        const col = a.flash > 0 ? mix(a.flash) : undefined;
        spr(d, name, 0, boss ? -20 : -11, { frame, flip, color: col, opacity: a.t === M.PHANTOM ? 0.86 * a.opacity : a.opacity });
        d.pop();
        if (m.stun > 0 && m.live && !a.dying) spr(d, "stars", cx, base - (boss ? 40 : 25), { frame: (t * 9) | 0 });
    }
    /** Rule glyphs, ready lamps and health sit above the lighting, so the facts are never in shadow. */
    drawBadges(d, st, actors, t) {
        const a0 = this.overlay;
        for (const a of actors) {
            if (a.dying) continue;
            const key = MON_KEY[a.t], boss = isBoss(a.t), cx = (a.x + 0.5) * T, base = (a.y + 1) * T - 3;
            if (!boss) {
                const gx = cx + 9, gy = base - 22;
                spr(d, `g_${key}`, gx, gy, { opacity: 0.35 + 0.65 * a0, color: GLYPH_COLOR[key] });
            }
            const m = { dir: st[a.o + 4], timer: st[a.o + 5], stun: st[a.o + 3] };
            if (a0 > 0.4 && (a.t === M.SPITTER || a.t === M.BULL || a.t === M.LATHER)) {
                const armed = a.t === M.SPITTER ? !m.timer : m.dir >= 0;
                if (m.dir >= 0 && m.stun === 0) {
                    const [dx, dy] = DIRS[m.dir], k = 11 + Math.sin(t * 9) * 1.5;
                    spr(d, "arrowLine", cx + dx * k, base - 11 + dy * k, { rot: m.dir * Math.PI / 2, color: armed ? C.ember : C.ash, opacity: a0 });
                }
            }
            if (a.t === M.PHANTOM && a0 > 0.4) d.circle(1.8, { x: cx - 9, y: base - 22, color: m.timer ? C.ember : C.ash });
        }
    }
}
const mix = (k) => (k > 0.5 ? "#ffffff" : "#ffd0c0");
