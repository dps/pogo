// Draws the war and turns thumbs into trails. Reads the sim's arrays; everything dynamic lands in one batch on one atlas.
import { CASTES, FLYER, FOODS, FOOD_KINDS, PROPS, TEAMS, TICK_HZ } from "./data.js";
import { ATTACK, EV, GATHER, GUARD, NEST_R } from "./sim.js";

const TRAIL_RGB = [[1, 0.8, 0.32], [1, 0.26, 0.26], [0.36, 0.76, 1]];
const MAX_FX = 900, MAX_DECAL = 320, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hexRgb = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const TEAM_RGB = TEAMS.map((t) => hexRgb(t.c));
const LANE = new Float32Array(256); for (let i = 0; i < 256; i++) LANE[i] = Math.sin(i * 12.9898) * 13;

export class Stage {
    constructor(game, s, sim, W, snd, o = {}) {
        this.game = game; this.s = s; this.sim = sim; this.W = W; this.snd = snd; this.o = o;
        this.m = new Float32Array(6); this.groundName = o.ground;
        this.speed = 1; this.acc = 0; this.time = 0; this.slow = 1; this.frozen = 0;
        // Ant regions, flat for speed.
        const n = TEAMS.length * 5 * 5; this.reg = new Float32Array(n * 4);
        for (let t = 0; t < TEAMS.length; t++) for (let c = 0; c < 5; c++) for (let f = 0; f < 5; f++) { const a = W[`ant${t}_${c}_${f}`], k = (t * 25 + c * 5 + f) * 4; this.reg[k] = a.u0; this.reg[k + 1] = a.v0; this.reg[k + 2] = a.u1; this.reg[k + 3] = a.v1; }
        this.sizes = CASTES.map((c) => c.size * 1.5);
        // Effects pool.
        const F = (this.fx = { n: 0, x: new Float32Array(MAX_FX), y: new Float32Array(MAX_FX), vx: new Float32Array(MAX_FX), vy: new Float32Array(MAX_FX), life: new Float32Array(MAX_FX), max: new Float32Array(MAX_FX), size: new Float32Array(MAX_FX), rot: new Float32Array(MAX_FX), spin: new Float32Array(MAX_FX), r: new Float32Array(MAX_FX), g: new Float32Array(MAX_FX), b: new Float32Array(MAX_FX), reg: new Array(MAX_FX), add: new Uint8Array(MAX_FX), grow: new Float32Array(MAX_FX), fr: new Float32Array(MAX_FX) });
        this.decals = []; this.decalAt = 0; this.rings = [];
        this.heat = 0; this.level = 0; this.rumbleT = 0; this.warHold = 0; this.stroke = null; this.pinch = null; this.tapped = null; this.miniDrag = false;
        this.pings = []; this.motes = []; for (let i = 0; i < 26; i++) this.motes.push({ x: Math.random() * sim.w, y: Math.random() * sim.h, p: Math.random() * 6, r: 3 + Math.random() * 6 });
        this.alertShown = 0; this.raidAt = -999; this.banner = null; this.rippleT = 0;
        // Camera: free-floating, driven by minimap, pinch, wheel and painting at the edges.
        const v = s.view, me = sim.me ?? sim.cols.find(Boolean);
        this.cam = { x: me.x, y: me.y - 90, z: this.defaultZoom(), tx: me.x, ty: me.y - 90, tz: this.defaultZoom() };
        if (o.overview) { this.cam.z = this.minZoom(); this.cam.x = sim.w / 2; this.cam.y = sim.h / 2; }
        this.applyCam(true);
    }
    minZoom() { const v = this.s.view, pad = this.pads(); return Math.max(0.12, Math.min(v.width / (this.sim.w + 60), (v.height - pad.top - pad.bottom) / (this.sim.h + 60))); }
    defaultZoom() { return Math.max(this.minZoom() * 1.25, 0.62); }
    pads() { return this.o.pads ?? { top: 0, bottom: 0 }; }
    applyCam(cut) {
        const c = this.cam, s = this.s, v = s.view, pad = this.pads(), z = c.z, sim = this.sim;
        const hw = v.width / 2 / z, hh = v.height / 2 / z, offY = (pad.bottom - pad.top) / 2 / z, marginX = 40, marginY = 40;
        const fit = (t, half, size, m, off) => { if (half * 2 >= size + m * 2) return size / 2 + off; return clamp(t, half - m, size + m - half); };
        c.tx = fit(c.tx, hw, sim.w, marginX, 0); c.ty = hh * 2 - pad.top / z - pad.bottom / z >= sim.h + marginY * 2 ? sim.h / 2 + offY : clamp(c.ty, hh - pad.top / z - marginY, sim.h + marginY + pad.bottom / z - hh);
        s.cam.zoom = z;
        if (cut) { c.x = c.tx; c.y = c.ty; s.cam.cut([c.x, c.y]); } else s.cam.pos = [c.x, c.y];
    }
    lookAt(x, y, z) { this.cam.tx = x; this.cam.ty = y; if (z) this.cam.tz = z; }
    toggleZoom() { const min = this.minZoom(), far = this.cam.tz < min * 1.1 + 0.02; this.cam.tz = far ? this.defaultZoom() * 1.15 : min; return !far; }

    // --- Step -------------------------------------------------------------------------------------------------
    step(dt) {
        const { sim, cam, game } = this;
        this.time += dt; this.snd.tick();
        if (!this.paused) {
            this.acc += (this.speed * this.slow * TICK_HZ) / 60;
            let budget = 8; while (this.acc >= 1 && budget-- > 0) { sim.tick(); this.acc -= 1; }
            if (this.acc > 2) this.acc = 0;
        }
        this.drain();
        this.input(dt);
        const k = 1 - Math.pow(0.0015, dt);
        cam.z += (cam.tz - cam.z) * k; cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k;
        this.applyCam(false);
        this.stepFx(dt);
        this.stepBattle(dt);
    }
    stepBattle(dt) {
        this.heat *= Math.pow(0.12, dt);
        const lvl = clamp(Math.log(1 + this.heat) / Math.log(260), 0, 1); this.level += (lvl - this.level) * Math.min(1, dt * 5);
        this.snd.battle(this.o.quiet ? 0 : this.level);
        this.rumbleT -= dt;
        if (this.rumbleT <= 0 && this.level > 0.14 && !this.o.quiet) {
            // A rumble scaled to the size of the battle on screen: small scraps tick, huge ones growl.
            this.rumbleT = 0.42 - this.level * 0.2;
            this.game.haptic(Math.round(6 + this.level * this.level * 60));
            this.pulses = (this.pulses ?? 0) + 1; this.lastRumble = this.level;
            if (this.level > 0.6) this.s.shake(this.level * 1.8, 0.2, { haptic: false });
        }
    }
    inView(x, y, m = 60) { const c = this.cam, v = this.s.view, hw = v.width / 2 / c.z + m, hh = v.height / 2 / c.z + m; return Math.abs(x - c.x) < hw && Math.abs(y - c.y) < hh; }
    drain() {
        const ev = this.sim.ev, snd = this.snd, q = this.o.quiet, sim = this.sim, s = this.s;
        for (let i = 0; i < ev.length; i += 5) {
            const code = ev[i], x = ev[i + 1], y = ev[i + 2], a = ev[i + 3], b = ev[i + 4], seen = this.inView(x, y);
            switch (code) {
                case EV.HIT: if (seen) { this.heat += 1; if (this.fxBudget(0.5)) this.spark(x, y, a === 9 ? [1, 0.9, 0.6] : a < 5 ? TEAM_RGB[a] : [1, 1, 1], 2, 40); if (!q) snd.bite(); } break;
                case EV.DIE: if (seen) { this.heat += 3; this.corpse(x, y, a, b); this.spark(x, y, TEAM_RGB[a], 5, 70); if (!q) snd.death(); } else this.corpse(x, y, a, b); break;
                case EV.SPLAT: this.splat(x, y, a); break;
                case EV.SPIT: if (seen && !q) snd.spit(); break;
                case EV.SPAT: if (seen) { this.heat += 0.5; this.puff(x, y, 18, [0.75, 0.95, 0.3], 0.3); this.spark(x, y, [0.8, 1, 0.3], 3, 60); if (!q) snd.splash(); } break;
                case EV.LOAD: if (seen) { if (a === 0) { if (this.fxBudget(0.35)) this.spark(x, y, FOODS[b].rgb, 2, 30); if (!q) snd.munch(); } } break;
                case EV.DROP: if (seen) { if (!q && a === 0) snd.drop(b); if (a === 0 && this.fxBudget(0.3)) this.spark(x, y, FOODS[b].rgb, 1, 26); } if (a === 0) this.stockBump = 1; break;
                case EV.HATCH: if (seen && a === 0) { this.spark(x, y, [1, 0.95, 0.75], 2, 40); if (!q) snd.hatch(); } break;
                case EV.NESTHIT: if (seen) { this.heat += 2; this.puff(x, y, 22, [0.6, 0.45, 0.3], 0.35); } if (a === 0) { this.pingAt(x, y, 2); } break;
                case EV.HAND_WARN: if (!q) { snd.looming(); this.say("THE HAND!", x, y, 2); this.pingAt(x, y, 2); } break;
                case EV.HAND_SLAM: this.impact(x, y, 110, 4, !q && seen, a); if (!q) snd.slam(); if (!q && seen) { s.freeze(0.07); } break;
                case EV.SHOE_WARN: if (!q) { if (a) { snd.looming(); this.say("FOOTSTEPS!", x, y, 2); } this.pingAt(x, y, 2); } break;
                case EV.SHOE_STOMP: this.impact(x, y, 120, seen ? 5 : 2, !q, a); this.addDecal("print", x, y, b, 230, 104, 0.12, 0.09, 0.08, 0.4, 16); if (!q) snd.stomp(); if (!q && seen) s.freeze(0.06); break;
                case EV.QUEEN_DEAD: this.impact(x, y, 140, 6, !q, 30); this.queenBurst(x, y, a); if (!q) { snd.queen(a === 0); if (seen) s.freeze(0.12); this.cam.tx = x; this.cam.ty = y; } break;
                case EV.BUILT: if (a === 0) this.ring(x, y, 80, [1, 0.85, 0.5], 0.6); break;
                case EV.RAID: if (!q && this.time - this.raidAt > 8) { this.raidAt = this.time; snd.warn(); this.say("RAID INCOMING!", x, y, a === undefined ? 1 : 1, TEAMS[a]?.ui); this.pingAt(x, y, 1); } break;
                case EV.FOOD_GONE: if (seen) { this.spark(x, y, FOODS[a].rgb, 12, 90); this.puff(x, y, b, FOODS[a].rgb, 0.5); } break;
                case EV.TRAIL: if (a === 0) { this.ring(x, y, 46, b === 3 ? [1, 1, 1] : TRAIL_RGB[b], 0.45); } break;
                case EV.TRAIL_GONE: if (a === 0) this.ring(x, y, 30, [1, 1, 1], 0.3); break;
                case EV.FOOD_DROP: this.ring(x, y, 70, [1, 0.85, 0.5], 0.5); if (seen) { this.spark(x, y, FOODS[0].rgb, 10, 90); if (!q) snd.drop(0); } this.pingAt(x, y, 0); break;
                case EV.CHOMP: if (seen) { this.heat += 2; this.spark(x, y, [0.9, 0.2, 0.2], 6, 90); if (!q) snd.chomp(); } break;
                case EV.CRITTER_DEAD: this.impact(x, y, 80, 3, !q && seen, 12); if (!q) { snd.critter(); if (seen) s.freeze(0.08); } break;
            }
        }
        ev.length = 0;
        if (!q) this.watchAlert();
    }
    fxBudget(p) { return Math.random() < p && this.fx.n < MAX_FX - 80; }
    watchAlert() {
        const al = this.sim.alert;
        if (al && al.level >= 1 && this.time - this.raidAt > 10) { this.raidAt = this.time; this.snd[al.level === 2 ? "siren" : "warn"](); this.say(al.level === 2 ? "QUEEN UNDER ATTACK!" : "ENEMIES AT THE NEST!", al.x, al.y, al.level); this.pingAt(al.x, al.y, al.level); }
    }
    say(text, x, y, level, col) { this.banner = { text, x, y, level, t: 3.5, col }; }
    pingAt(x, y, level) { this.pings.push({ x, y, t: 0, level }); if (this.pings.length > 6) this.pings.shift(); }

    // --- Effects -----------------------------------------------------------------------------------------------
    addFx(reg, x, y, vx, vy, life, size, r, g, b, o = {}) {
        const F = this.fx; if (F.n >= MAX_FX) return; const n = F.n++;
        F.reg[n] = reg; F.x[n] = x; F.y[n] = y; F.vx[n] = vx; F.vy[n] = vy; F.life[n] = F.max[n] = life; F.size[n] = size; F.r[n] = r; F.g[n] = g; F.b[n] = b; F.rot[n] = o.rot ?? Math.random() * 6.3; F.spin[n] = o.spin ?? 0; F.add[n] = o.add ? 1 : 0; F.grow[n] = o.grow ?? 0; F.fr[n] = o.fr ?? 3;
    }
    stepFx(dt) {
        const F = this.fx;
        for (let i = 0; i < F.n;) {
            F.life[i] -= dt; if (F.life[i] <= 0) { const l = --F.n; for (const k of ["x", "y", "vx", "vy", "life", "max", "size", "rot", "spin", "r", "g", "b", "reg", "add", "grow", "fr"]) F[k][i] = F[k][l]; continue; }
            const k = Math.max(0, 1 - F.fr[i] * dt); F.vx[i] *= k; F.vy[i] *= k; F.x[i] += F.vx[i] * dt; F.y[i] += F.vy[i] * dt; F.rot[i] += F.spin[i] * dt; F.size[i] += F.grow[i] * dt; i++;
        }
        for (const r of this.rings) r.t += dt; this.rings = this.rings.filter((r) => r.t < r.life);
        for (const p of this.pings) p.t += dt; this.pings = this.pings.filter((p) => p.t < 3);
        if (this.banner && (this.banner.t -= dt) <= 0) this.banner = null;
        if (this.rippleT > 0) this.rippleT -= dt;
    }
    spark(x, y, c, n, sp) { const W = this.W; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.4 + Math.random()); this.addFx(i % 2 ? W.chip : W.dot, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.22 + Math.random() * 0.25, 3 + Math.random() * 3.5, c[0], c[1], c[2], { spin: 9 }); } }
    puff(x, y, size, c, life) { for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; this.addFx(this.W.puff, x + Math.cos(a) * size * 0.3, y + Math.sin(a) * size * 0.3, Math.cos(a) * 30, Math.sin(a) * 30, life, size, c[0], c[1], c[2], { grow: size * 1.2, spin: 1.5 }); } }
    ring(x, y, r, c, life) { this.rings.push({ x, y, r, c, t: 0, life }); }
    impact(x, y, r, shake, feel, kills) {
        this.ring(x, y, r * 1.5, [1, 1, 1], 0.5); this.puff(x, y, r * 0.7, [0.7, 0.62, 0.5], 0.75);
        for (let i = 0; i < 22; i++) { const a = i / 22 * TAU; this.addFx(this.W.puff, x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, Math.cos(a) * 170, Math.sin(a) * 170, 0.5, 26, 0.85, 0.78, 0.66, { grow: 40 }); }
        if (shake) this.s.shake(shake * (feel ? 1.6 : 0.5), 0.35, { haptic: false });
        this.heat += kills * 1.2;
    }
    queenBurst(x, y, team) { const c = TEAM_RGB[team]; for (let i = 0; i < 60; i++) { const a = Math.random() * TAU, v = 80 + Math.random() * 260; this.addFx(this.W.spark, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.8, 8 + Math.random() * 10, c[0], c[1], c[2], { spin: 6, add: 1, fr: 1.8 }); } this.ring(x, y, 220, c, 0.8); }
    addDecal(k, x, y, rot, w, h, r, g, b, a, life) {
        const d = { reg: this.W[k], x, y, rot, w, h, r, g, b, a, t: 0, life };
        if (this.decals.length < MAX_DECAL) this.decals.push(d); else { this.decals[this.decalAt] = d; this.decalAt = (this.decalAt + 1) % MAX_DECAL; }
    }
    corpse(x, y, team, caste) { this.addDecal(`ant${team}_${caste}_4`, x, y, Math.random() * 6.3, this.sizes[caste], this.sizes[caste], 1, 1, 1, 1, 9); }
    splat(x, y, team) { const c = TEAM_RGB[team]; this.addDecal(`splat${Math.random() < 0.5 ? 0 : 1}`, x, y, Math.random() * 6.3, 24, 24, c[0] * 0.6, c[1] * 0.6, c[2] * 0.6, 0.85, 12); }

    // --- Input: drag paints, two fingers or the wheel move the view -------------------------------------------------
    input(dt) {
        const { s, sim, cam, game } = this, inp = s.input, ptr = inp.pointer, v = s.view;
        if (this.o.noInput) return;
        if (inp.wheel) cam.tz = clamp(cam.tz * Math.exp(-inp.wheel * 0.0016), this.minZoom(), 2);
        const touches = inp.touches;
        if (touches.length >= 2) {
            const a = touches[0], b = touches[1], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, gap = Math.hypot(a.x - b.x, a.y - b.y);
            if (this.stroke) this.cancelStroke();
            if (this.pinch) { cam.tz = clamp(cam.tz * gap / this.pinch.gap, this.minZoom(), 2); cam.z = cam.tz; cam.tx -= (mx - this.pinch.mx) / cam.z; cam.ty -= (my - this.pinch.my) / cam.z; cam.x = cam.tx; cam.y = cam.ty; }
            this.pinch = { gap, mx, my }; return;
        }
        this.pinch = null;
        const mv = inp.move; if (mv.x || mv.y) { cam.tx += mv.x * 560 * dt / cam.z; cam.ty += mv.y * 560 * dt / cam.z; }
        if (ptr.pressed) this.beginStroke(ptr);
        const st = this.stroke;
        if (st) {
            if (ptr.down) this.extendStroke(ptr, dt);
            else this.endStroke(ptr);
        }
    }
    beginStroke(ptr) {
        const w = ptr.world;
        this.stroke = { pts: [w.x, w.y], len: 0, screen: 0, born: this.time, tingle: 0, kind: 2, x: ptr.x, y: ptr.y, hx: w.x, hy: w.y, snap: false, speed: 0 };
        this.readStroke(this.stroke, false);
    }
    readStroke(st, feel) {
        const { sim } = this, n = st.pts.length, a = sim.classify(0, st.pts[0], st.pts[1]), b = sim.classify(0, st.pts[n - 2], st.pts[n - 1]);
        const useA = (a.food || a.nest !== undefined || a.critter) && !(b.food || b.nest !== undefined || b.critter), c = useA ? a : b;
        const hit = !!(c.food || c.nest !== undefined || c.critter), kind = c.kind;
        if (feel && hit && (!st.snap || kind !== st.kind)) { this.snd.snap(kind); this.ring(c.x, c.y, (c.food?.r ?? 40) + 16, TRAIL_RGB[kind], 0.3); }
        st.kind = kind; st.snap = hit; st.tx = c.x; st.ty = c.y; st.home = c.home; st.target = c;
    }
    extendStroke(ptr, dt) {
        const { cam, s, game, snd } = this, st = this.stroke, w = ptr.world, n = st.pts.length, lx = st.pts[n - 2], ly = st.pts[n - 1], d = Math.hypot(w.x - lx, w.y - ly), sc = d * cam.z, v = s.view;
        st.x = ptr.x; st.y = ptr.y; st.speed += (sc - st.speed) * 0.3;
        if (sc > 4) {
            st.pts.push(w.x, w.y); st.len += d; st.screen += sc; st.tingle += sc;
            // The tingle: a tiny tick per stretch of trail, so the thumb can feel the line being laid.
            if (st.tingle > 20) { st.tingle = 0; game.haptic("tick"); this.tingles = (this.tingles ?? 0) + 1; if (Math.random() < 0.7) this.addFx(this.W.dot, w.x, w.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.4, 7, ...TRAIL_RGB[st.kind], { add: 1 }); }
            this.readStroke(st, true);
        }
        snd.paintSound(st.screen > 6, st.speed, st.kind);
        // Painting near the edge carries the view along, so one thumb can reach the whole map.
        const m = 46, pad = this.pads(), dx = ptr.x < m ? -1 : ptr.x > v.width - m ? 1 : 0, dy = ptr.y < pad.top + m ? -1 : ptr.y > v.height - pad.bottom - 14 ? 1 : 0;
        if (dx || dy) { cam.tx += dx * 420 * dt / cam.z; cam.ty += dy * 420 * dt / cam.z; }
    }
    cancelStroke() { this.stroke = null; this.snd.stopPaint(); }
    endStroke(ptr) {
        const st = this.stroke; this.stroke = null; this.snd.stopPaint();
        if (st.screen < 16 && this.time - st.born < 0.6) { this.tap(st.pts[0], st.pts[1]); return; }
        if (st.len < 20) return;
        const n = st.pts.length; if (this.onPaint?.(st) === false) return;
        const tr = this.sim.paint(0, st.pts);
        this.snd.trail(tr ? tr.kind : 2); if (tr) this.flashTrail(tr); else { this.snd.erase(); }
        this.painted = (this.painted ?? 0) + 1; this.afterPaint?.(tr);
    }
    flashTrail(tr) { for (let i = 0; i < tr.pts.length; i += 4) this.addFx(this.W.dot, tr.pts[i], tr.pts[i + 1], 0, 0, 0.25 + i * 0.0035, 13, ...TRAIL_RGB[tr.kind], { add: 1 }); }
    tap(wx, wy) {
        const { sim, cam, snd } = this, me = sim.me;
        for (let k = 0; k < 4; k++) { const tr = me.slots[k]; if (tr && Math.hypot(tr.hx - wx, tr.hy - wy) < Math.max(38, 44 / cam.z) && !tr.food) { sim.removeTrail(0, k); snd.erase(); return; } }
        for (let k = 0; k < 4; k++) { const tr = me.slots[k]; if (tr?.food) { const e = tr.food.r * 0.74; if (Math.hypot(tr.hx + e - wx, tr.hy - e - wy) < Math.max(26, 26 / cam.z)) { sim.removeTrail(0, k); snd.erase(); return; } } }
        if (Math.hypot(me.x - wx, me.y - wy) < Math.max(NEST_R + 24, 40 / cam.z)) { this.o.onNest?.(); return; }
        const c = sim.classify(0, wx, wy, 14 / cam.z);
        if (c.food || c.critter || c.nest !== undefined) { const tr = sim.paint(0, [me.x, me.y, c.x, c.y]); if (tr) { snd.trail(tr.kind); this.flashTrail(tr); this.painted = (this.painted ?? 0) + 1; this.afterPaint?.(tr); } return; }
        this.rippleT = 0.3; this.ripple = { x: wx, y: wy };
    }

    // --- Draw ----------------------------------------------------------------------------------------------------
    spr(reg, x, y, w, h, rot, r = 1, g = 1, b = 1, a = 1) {
        const m = this.m, c = Math.cos(rot), s = Math.sin(rot);
        m[0] = c; m[1] = s; m[2] = -s; m[3] = c; m[4] = x; m[5] = y;
        this.r.quad(m, -w / 2, -h / 2, w / 2, h / 2, reg.u0, reg.v0, reg.u1, reg.v1, r, g, b, a, this.tex, 0, 0, 0, 0, 0);
    }
    draw(d) {
        const { sim, W, game, cam, s } = this;
        const r = (this.r = game.renderer); this.tex = r.texture(game.assets.sprite("world"));
        const zoom = s.cam.zoom, v = s.view, vx = v.width / 2 / zoom + 40, vy = v.height / 2 / zoom + 40, cx = s.cam.pos.x, cy = s.cam.pos.y;
        this.vb = [cx - vx, cy - vy, cx + vx, cy + vy];
        if (this.groundName) { d.sprite(this.groundName, { x: sim.w / 2, y: sim.h / 2, width: sim.w * 1.9, height: sim.h * 1.9, color: "#5f7a58" }); d.sprite(this.groundName, { x: sim.w / 2, y: sim.h / 2, width: sim.w, height: sim.h }); }
        for (const sh of sim.map.shapes) if (sh.t === "web") this.spr(W.web, sh.x, sh.y, sh.r * 2.1, sh.r * 2.1, 0, 1, 1, 1, 0.8);
        // Flat things, then decals, then trails, so ants walk over all of it.
        for (const p of sim.map.props) { const k = PROPS[p.k]; if (!k.b) this.prop(p, k); }
        this.drawDecals();
        for (const p of sim.map.props) { const k = PROPS[p.k]; if (k.b) this.prop(p, k); }
        this.drawNests(d); this.drawFoods(); this.drawTrails(); this.drawAnts();
        this.drawCritters(d); this.drawSpit(); this.drawFx(false);
        this.drawHazards(); r.blend(true); this.drawGlow(); this.drawFx(true); r.blend(false);
    }
    prop(p, k) { const reg = this.W[`prop_${p.k}`], [a, b, c, e] = this.vb, sc = p.s ?? 1, w = k.w * sc * 1.28, h = w * reg.h / reg.w; if (p.x + w < a || p.x - w > c || p.y + w < b || p.y - w > e) return; this.spr(reg, p.x, p.y, w, h, p.rot ?? 0); }
    drawDecals() {
        const D = this.decals, dt = this.lastDt ?? 1 / 60;
        for (let i = 0; i < D.length; i++) { const k = D[i]; k.t += 1 / 60; if (k.t > k.life) continue; const fade = k.t > k.life * 0.7 ? 1 - (k.t - k.life * 0.7) / (k.life * 0.3) : 1; this.spr(k.reg, k.x, k.y, k.w, k.h, k.rot, k.r, k.g, k.b, k.a * fade); }
    }
    drawNests(d) {
        const { sim, W } = this;
        for (const col of sim.colList) {
            const reg = col.alive ? W[`nest${col.team}`] : W.nestDead, pulse = 1 + Math.sin(this.time * 2.4 + col.team) * 0.008, hit = sim.t - (col.lastHit ?? -999) < 6 ? 1.03 : 1;
            this.spr(reg, col.x, col.y, 150 * pulse * hit, 150 * pulse * hit, 0);
            if (col.alive && col.hp < col.maxHp) {
                const k = col.hp / col.maxHp, n = 28, c = k > 0.5 ? [0.5, 0.95, 0.4] : k > 0.25 ? [1, 0.8, 0.2] : [1, 0.25, 0.2];
                for (let i = 0; i < n; i++) { const a = i / n * TAU - 1.57; this.spr(W.disc, col.x + Math.cos(a) * 82, col.y + Math.sin(a) * 82, 9, 9, 0, i / n < k ? c[0] : 0.1, i / n < k ? c[1] : 0.1, i / n < k ? c[2] : 0.1, 0.92); }
            }
        }
    }
    drawFoods() {
        const { sim, W } = this; const [a, b, c, e] = this.vb, painting = this.stroke;
        for (const f of sim.foods) {
            if (!f.alive) continue; if (f.x + 120 < a || f.x - 120 > c || f.y + 120 < b || f.y - 120 > e) continue;
            const sz = f.r * 2.5 * (1 + f.bump * 0.04), reg = W[`food_${f.k}`] ?? W.food_jam; this.spr(reg, f.x, f.y, sz, sz, Math.sin(f.rot) * 0.5);
            if (painting) this.spr(W.ring, f.x, f.y, f.r * 2.5, f.r * 2.5, 0, ...FOODS[f.type].rgb, 0.5 + Math.sin(this.time * 6) * 0.25);
        }
    }
    drawTrails() {
        const { sim, W, r, time } = this; r.blend(true);
        for (const col of sim.colList) for (const tr of col.slots) {
            if (!tr) continue; const mine = col.team === 0, rgb = mine ? TRAIL_RGB[tr.kind] : TEAM_RGB[col.team], P = tr.pts, n = P.length / 2;
            if (!mine && tr.nest !== 0) continue;
            const base = mine ? 0.3 : 0.16;
            for (let i = 0; i < n; i += mine ? 1 : 2) {
                const x = P[i * 2], y = P[i * 2 + 1], beat = Math.sin(i * 0.42 - time * 7);
                const k = (i / n) * 0.3 + 0.7, sz = (mine ? 13 : 9) + tr.w * 2; this.spr(W.beat, x, y, sz, sz, 0, rgb[0], rgb[1], rgb[2], (base + Math.max(0, beat) * 0.3) * k);
            }
            if (!mine) continue;
            const step = 5, off = (time * 7) % step;
            for (let f = off; f < n - 1; f += step) { const i = f | 0, x = P[i * 2], y = P[i * 2 + 1], nx = P[i * 2 + 2], ny = P[i * 2 + 3]; this.spr(W.chev, x, y, 13, 13, Math.atan2(ny - y, nx - x), rgb[0], rgb[1], rgb[2], 0.75); }
        }
        r.blend(false);
        const me = sim.me; if (!me) return;
        for (const tr of me.slots) {
            if (!tr) continue; const reg = [W.headGather, W.headAttack, W.headGuard][tr.kind], sz = Math.max(24, 22 / this.cam.z) * (1 + Math.sin(this.time * 4) * 0.06), e = tr.kind === GATHER ? (tr.food?.r ?? 0) * 0.74 : 0;
            this.spr(reg, tr.hx + e, tr.hy - e, sz, sz, 0);
        }
    }
    drawAnts() {
        const { sim, r, reg, sizes, W, tex, m } = this;
        const { alive, team, caste, seed, carry, lunge, state } = sim, X = sim.x, Y = sim.y, PX = sim.px, PY = sim.py, ANG = sim.ang;
        const zoom = this.s.cam.zoom, lod = clamp(0.55 / zoom, 1, 1.75), t = this.time, [a, b, c, e] = this.vb;
        let frac = this.acc; frac = frac > 1 ? 1 : frac;
        const sh = W.shadow, showShadow = zoom > 0.34, flyers = this.flyers ?? (this.flyers = new Int16Array(2600)); let nf = 0;
        const bits = [W.bit0, W.bit1, W.bit2, W.bit3];
        if (showShadow) for (let i = 0, top = sim.top; i < top; i++) {
            if (!alive[i] || caste[i] === FLYER) continue;
            const x = PX[i] + (X[i] - PX[i]) * frac, y = PY[i] + (Y[i] - PY[i]) * frac; if (x < a || x > c || y < b || y > e) continue;
            const s = sizes[caste[i]] * lod * 0.5; m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 1; m[4] = x + 2; m[5] = y + 3;
            r.quad(m, -s, -s, s, s, sh.u0, sh.v0, sh.u1, sh.v1, 1, 1, 1, 0.35, tex, 0, 0, 0, 0, 0);
        }
        for (let i = 0, top = sim.top; i < top; i++) {
            if (!alive[i]) continue;
            const C = caste[i]; if (C === FLYER) { flyers[nf++] = i; continue; }
            const dx = X[i] - PX[i], dy = Y[i] - PY[i]; let x = PX[i] + dx * frac, y = PY[i] + dy * frac; if (x < a || x > c || y < b || y > e) continue;
            const ang = ANG[i], cs = Math.cos(ang), sn = Math.sin(ang), moving = dx * dx + dy * dy > 0.01, f = moving ? ((t * 14 + seed[i]) & 3) : 1;
            // Each ant keeps its own lane, so a stream reads as a wide marching ribbon rather than a single file.
            const lane = LANE[seed[i]]; x -= sn * lane; y += cs * lane;
            if (lunge[i]) { x += cs * 2.4; y += sn * 2.4; }
            const k = (team[i] * 25 + C * 5 + f) * 4, s = sizes[C] * lod;
            m[0] = cs * s; m[1] = sn * s; m[2] = -sn * s; m[3] = cs * s; m[4] = x; m[5] = y;
            r.quad(m, -0.5, -0.5, 0.5, 0.5, reg[k], reg[k + 1], reg[k + 2], reg[k + 3], 1, 1, 1, 1, tex, 0, 0, 0, 0, 0);
            const load = carry[i];
            if (load) { const bit = bits[load - 1], bs = (C === 3 ? 9 : 6) * lod, hx = x + cs * s * 0.46, hy = y + sn * s * 0.46; m[0] = bs; m[1] = 0; m[2] = 0; m[3] = bs; m[4] = hx; m[5] = hy; r.quad(m, -0.5, -0.5, 0.5, 0.5, bit.u0, bit.v0, bit.u1, bit.v1, 1, 1, 1, 1, tex, 0, 0, 0, 0, 0); }
        }
        for (let q = 0; q < nf; q++) {
            const i = flyers[q], dx = X[i] - PX[i], dy = Y[i] - PY[i], x = PX[i] + dx * frac, y = PY[i] + dy * frac; if (x < a || x > c || y < b || y > e) continue;
            const s = sizes[4] * lod; m[0] = 1; m[1] = 0; m[2] = 0; m[3] = 1; m[4] = x + 7; m[5] = y + 11;
            r.quad(m, -s * 0.4, -s * 0.3, s * 0.4, s * 0.3, sh.u0, sh.v0, sh.u1, sh.v1, 1, 1, 1, 0.3, tex, 0, 0, 0, 0, 0);
            const ang = ANG[i], cs = Math.cos(ang), sn = Math.sin(ang), f = (t * 30 + seed[i]) & 3, k = (team[i] * 25 + 20 + f) * 4, bob = Math.sin(t * 9 + seed[i]) * 1.4;
            m[0] = cs * s * 1.2; m[1] = sn * s * 1.2; m[2] = -sn * s * 1.2; m[3] = cs * s * 1.2; m[4] = x; m[5] = y + bob;
            r.quad(m, -0.5, -0.5, 0.5, 0.5, reg[k], reg[k + 1], reg[k + 2], reg[k + 3], 1, 1, 1, 1, tex, 0, 0, 0, 0, 0);
        }
    }
    drawCritters(d) {
        const { sim, W } = this; const frac = Math.min(1, this.acc);
        for (const c of sim.critters) {
            if (!c.alive) continue;
            const x = c.px + (c.x - c.px) * frac, y = c.py + (c.y - c.py) * frac, moved = Math.hypot(c.x - c.px, c.y - c.py) > 0.05, k = c.lunge > 0 ? 1.1 : 1;
            if (c.k === "spider") { const f = moved ? (this.time * 8 | 0) % 4 : 0; this.spr(W[`spider${f}`], x, y, 150 * k, 150 * k, c.ang, 1, 1 - c.hurt * 0.4, 1 - c.hurt * 0.4); }
            else { const f = moved ? (this.time * 6 | 0) % 2 : 0; this.spr(W[`ladybird${f}`], x, y, 74, 74, c.ang, 1, 1 - c.hurt * 0.3, 1 - c.hurt * 0.3); }
            if (c.hp < c.maxHp) { const w = c.k === "spider" ? 80 : 44, q = c.hp / c.maxHp; d.rect(w + 4, 8, { x, y: y - c.r - 30, color: "#1b1420", radius: 3 }); d.rect((w) * q, 4, { x: x - w * (1 - q) / 2, y: y - c.r - 30, color: q > 0.4 ? "#7be05a" : "#ff5a4a", radius: 2 }); }
        }
    }
    drawSpit() {
        const { sim, W } = this, frac = Math.min(1, this.acc);
        for (let n = 0; n < sim.spn; n++) { const t = (sim.spt[n] + frac) / sim.spl[n], x = sim.spx[n] + (sim.spu[n] - sim.spx[n]) * t, y = sim.spy[n] + (sim.spf[n] - sim.spy[n]) * t, lift = Math.sin(t * Math.PI) * Math.min(26, sim.spg[n] * 0.35); this.spr(W.shadow, x + 2, y + 2, 7, 7, 0, 1, 1, 1, 0.3); this.spr(W.spit, x, y - lift, 11, 11, 0); }
    }
    drawFx(add) {
        const F = this.fx;
        for (let i = 0; i < F.n; i++) { if (F.add[i] !== (add ? 1 : 0)) continue; const k = F.life[i] / F.max[i], a = k < 0.5 ? k * 2 : 1; this.spr(F.reg[i], F.x[i], F.y[i], F.size[i], F.size[i], F.rot[i], F.r[i], F.g[i], F.b[i], a * (F.reg[i] === this.W.puff ? 0.5 : 1)); }
    }
    drawGlow() {
        const { W, sim, time } = this;
        for (const r of this.rings) { const k = r.t / r.life, sz = r.r * 2 * (0.4 + k * 0.7); this.spr(W.ring, r.x, r.y, sz, sz, 0, r.c[0], r.c[1], r.c[2], 1 - k); }
        for (const m of this.motes) { const x = m.x + Math.sin(time * 0.3 + m.p) * 30, y = m.y + Math.cos(time * 0.23 + m.p) * 24; this.spr(W.dot, x, y, m.r, m.r, 0, 1, 0.95, 0.7, 0.28 + Math.sin(time * 1.2 + m.p) * 0.14); }
        const st = this.stroke;
        if (st) {
            const rgb = TRAIL_RGB[st.kind], P = st.pts, n = P.length / 2;
            for (let i = 0; i < n; i++) { const b = Math.sin(i * 0.5 - time * 12); this.spr(W.beat, P[i * 2], P[i * 2 + 1], 16, 16, 0, rgb[0], rgb[1], rgb[2], 0.5 + b * 0.25); }
            if (st.snap) { const sz = ((st.target?.food?.r ?? st.target?.critter?.r ?? 44) + 22) * 2 * (1 + Math.sin(time * 14) * 0.06); this.spr(W.ring, st.tx, st.ty, sz, sz, 0, rgb[0], rgb[1], rgb[2], 0.9); }
        }
        if (this.rippleT > 0 && this.ripple) { const k = 1 - this.rippleT / 0.3; this.spr(W.ring, this.ripple.x, this.ripple.y, 60 * k, 60 * k, 0, 1, 1, 1, 1 - k); }
        const al = sim.alert;
        for (const p of this.pings) { const k = (p.t * 1.5) % 1, sz = 80 + k * 200, c = p.level ? [1, 0.25, 0.2] : [1, 0.8, 0.2]; if (p.t < 2.5) this.spr(W.ring, p.x, p.y, sz, sz, 0, c[0], c[1], c[2], (1 - k) * 0.9); }
    }
    drawHazards() {
        const { sim, W } = this, h = sim.hand, sh = sim.shoe, frac = Math.min(1, this.acc);
        if (h && h.phase !== "wait") {
            const warn = h.warnTicks || 60;
            if (h.phase === "shadow") {
                const t = clamp((h.t + frac) / warn, 0, 1), ease = t * t, sz = 150 + (1 - ease) * 260;
                this.spr(W.shadow, h.x, h.y, sz, sz, 0, 1, 1, 1, 0.25 + ease * 0.55); const pulse = 1 + Math.sin(this.time * 12) * 0.04; this.spr(W.ring, h.x, h.y, 180 * pulse, 180 * pulse, 0, 1, 0.25, 0.2, 0.5 + ease * 0.5);
                if (t > 0.5) { const k = (t - 0.5) * 2; this.spr(W.handOpen, h.x + (1 - k) * 80, h.y + (1 - k * k) * 900 + 60, 380 + (1 - k) * 200, 400 + (1 - k) * 210, 0.1 * (1 - k)); }
            } else { const lift = h.phase === "lift" ? ((h.t + frac) / 26) ** 2 : 0; this.spr(W.handGrab, h.x, h.y + 70 + lift * 1000, 350 * (1 + lift * 0.5), 368 * (1 + lift * 0.5), 0); }
        }
        if (sh && sh.phase !== "wait" && sh.steps[sh.i]) {
            const s0 = sh.steps[sh.i], rot = s0.rot + (0);
            if (sh.phase === "shadow") {
                const t = clamp((sh.t + frac) / (sh.warnTicks || 30), 0, 1), e = t * t, grow = 1.6 - 0.6 * e;
                this.spr(W.shadow, s0.x, s0.y, 260 * grow, 130 * grow, rot, 1, 1, 1, 0.3 + e * 0.6); this.spr(W.ring, s0.x, s0.y, 260, 130, rot, 1, 0.25, 0.2, 0.4 + e * 0.6);
                if (t > 0.55) { const k = (t - 0.55) / 0.45, sc = 1 + (1 - k) * 1.2; this.spr(W.shoe, s0.x, s0.y - (1 - k) * 90, 260 * sc, 118 * sc, rot, 1, 1, 1, k); }
            } else if (sh.phase === "down") { const k = (sh.t + frac) / 10, sc = 1 + k * k * 0.4; this.spr(W.shoe, s0.x, s0.y - k * k * 60, 260 * sc, 118 * sc, rot, 1, 1, 1, 1 - k * k); }
        }
    }
}
