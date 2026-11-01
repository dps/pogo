// Everything the player watches: the cast, the overlay on the board, and the playback of sim events.
import { color, mesh } from "./pogo.js";
import { BIRD, WING_OF } from "./models.js";
import { ZONES, bakeBoard, dressWater, wx, wz } from "./stage.js";
import { ACTS, DIRS, N, T, byId, inB, intentTiles, isSolid, forecast } from "./sim.js";
import { ENEMIES, PIGEONS, PROPS } from "./data.js";
import * as S from "./audio.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (t) => t * t * (3 - 2 * t);
const YAW = [Math.PI, Math.PI / 2, 0, -Math.PI / 2];   // facing per grid direction (N E S W)
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
const PROP_H = { can: 0.62, box: 0.66, bag: 0.86, nest: 0.5, drum: 1, sprinkler: 0.6 };

class Actor {
    constructor(v, u) {
        this.v = v; this.id = u.id; this.k = u.k; this.side = u.side;
        const s = v.s;
        this.x = wx(u.x); this.z = wz(u.y); this.y = 0;
        this.rest = u.side === 0 ? 0.62 : u.side === 2 || u.env ? 0.0 : null;
        this.yaw = this.rest ?? YAW[u.dir ?? 2]; this.goalYaw = this.yaw;
        this.sq = 0; this.sqV = 0; this.tilt = 0;
        this.bob = v.game.fxRng.next() * 6; this.peck = 0; this.flap = 0; this.idle = 2 + v.game.fxRng.next() * 5;
        this.hit = 0; this.anim = null; this.gone = false; this.lookZ = 0; this.sink = 0; this.scale = 0.0; this.grow = 1;
        const isChar = u.side !== 2 && !u.env;
        if (isChar) {
            this.cfg = BIRD[u.k] ?? BIRD.default;
            const wn = WING_OF[u.k] ?? "wing_grey";
            this.body = s.add([mesh(`${u.k}_body`, { shine: 0.12 }), { name: "body" }]);
            this.head = s.add([mesh(`${u.k}_head`, { shine: 0.12 }), { name: "head" }]);
            this.wl = s.add([mesh(wn), { name: "wing" }]);
            this.wr = s.add([mesh(wn), { name: "wing" }]);
            this.wl.hidden = this.wr.hidden = true;
            for (const e of [this.body, this.head, this.wl, this.wr]) e.size.set(this.v.game.assets.geometry(e.mesh).natural);
        } else {
            this.cfg = { s: 1 };
            this.body = s.add([mesh(u.k, { shine: u.k === "can" ? 0.5 : 0.05 }), { name: "prop" }]);
            this.isProp = true;
            this.body.size.set(this.v.game.assets.geometry(u.k).natural);
        }
        this.parts = [this.body, this.head, this.wl, this.wr].filter(Boolean);
        this.height = (isChar ? (u.k === "swan" ? 2.3 : 1.05) : PROP_H[u.k] ?? 0.6) * this.cfg.s;
        this.pose();
    }
    tint(c) { for (const e of this.parts) e.color = c; }
    move(x, z, dur, { arc = 0, ease: e = ease, onDone } = {}) {
        this.anim = { x0: this.x, z0: this.z, y0: this.y, x1: x, z1: z, t: 0, dur, arc, e, onDone };
    }
    remove() { this.gone = true; for (const e of this.parts) e.destroy(); this.parts = []; }
    update(dt) {
        if (this.gone) return;
        if (this.scale < 1) this.scale = Math.min(1, this.scale + dt * 5);
        if (this.anim) {
            const a = this.anim;
            a.t = Math.min(1, a.t + dt / a.dur);
            const e = a.e(a.t);
            this.x = a.x0 + (a.x1 - a.x0) * e; this.z = a.z0 + (a.z1 - a.z0) * e;
            this.y = a.arc * Math.sin(Math.PI * a.t);
            this.lookZ = Math.sin(a.t * Math.PI * 2) * 0.09;
            if (a.t >= 1) {
                this.anim = null; this.y = 0; this.lookZ = 0;
                this.sqV -= 5;
                a.onDone?.();
            }
        }
        // Squash spring.
        this.sqV += (-this.sq * 240 - this.sqV * 15) * dt;
        this.sq += this.sqV * dt;
        this.yaw = lerpAngle(this.yaw, this.goalYaw, Math.min(1, dt * 12));
        this.bob += dt;
        this.hit = Math.max(0, this.hit - dt * 5);
        this.flap = Math.max(0, this.flap - dt * 2.4);
        this.pose();
    }
    pose() {
        const c = this.cfg, k = c.s * 1.14 * this.scale * this.grow, sq = clamp(this.sq, -0.5, 0.5), sy = (1 + sq) * k, sxz = (1 - sq * 0.6) * k;
        const breathe = 1 + Math.sin(this.bob * 2.4) * 0.012, b = this.body, y = this.y - this.sink;
        const shake = this.hit > 0 ? Math.sin(this.bob * 80) * 0.05 * this.hit : 0;
        b.pos.set(this.x + shake, y, this.z);
        b.rot.set(this.tilt, this.yaw, 0);
        b.scale.set(sxz, sy * breathe, sxz);
        if (this.head) {
            const n = c.neck, sn = Math.sin(this.yaw), cs = Math.cos(this.yaw);
            const peck = this.peck > 0 ? Math.sin(this.peck * 8) * 0.06 : 0;
            if (this.peck > 0) this.peck -= 1 / 60;
            const f = n[2] + this.lookZ + peck, h = n[1] * sy * breathe;
            this.head.pos.set(this.x + shake + sn * f * sxz, y + h, this.z + cs * f * sxz);
            this.head.rot.set(peck * 3, this.yaw + Math.sin(this.bob * 0.7) * 0.18, 0);
            this.head.scale.set(k * 1.2, k * 1.2, k * 1.2);
            this.idle -= 1 / 60;
            if (this.idle < 0) { this.idle = 3 + this.v.game.fxRng.next() * 6; this.peck = 0.8; }
            const on = this.flap > 0;
            this.wl.hidden = this.wr.hidden = !on;
            if (on) {
                const a = Math.sin(this.bob * 30) * 0.9 * Math.min(1, this.flap * 2), wy = y + 0.46 * sy;
                this.wl.pos.set(this.x - cs * 0.22 * k, wy, this.z + sn * 0.22 * k);
                this.wr.pos.set(this.x + cs * 0.22 * k, wy, this.z - sn * 0.22 * k);
                this.wl.rot.set(0, this.yaw + Math.PI, a);
                this.wr.rot.set(0, this.yaw, a);
                this.wl.scale.set(k, k, k); this.wr.scale.set(k, k, k);
            }
        }
    }
    top() { return { x: this.x, y: this.y + this.height * (1 + this.sq * 0.4) - this.sink, z: this.z }; }
}

export class View {
    constructor(game, s, zoneId, m, tiles) {
        this.game = game; this.s = s; this.zoneId = zoneId; this.zone = ZONES[zoneId];
        this.actors = new Map(); this.fx = []; this.floats = []; this.bubbles = []; this.queue = []; this.playing = false; this.wait = 0; this.speed = 1;
        this.hedges = new Map(); this.onDone = null; this.time = 0; this.rings = [];
        const z = this.zone, l = s.light;
        const dim = (hex, k) => { const c = color(hex); return color([c.r * k, c.g * k, c.b * k, 1]); };
        l.dir.set(...z.light.dir); l.color = dim(z.light.color, 0.66); l.sky = dim(z.light.sky, 0.6); l.ground = dim(z.light.ground, 0.62);
        l.shadows = true; l.softShadows = !game.input?.touchMode; l.shadowRange = 13;
        s.background = z.sky;
        s.cam3.fovAxis = "vertical"; s.cam3.fov = 20;
        const name = `board_${m.id ?? "x"}`;
        bakeBoard(game, name, zoneId, m, tiles);
        s.add([mesh(name, { shine: 0.04 }), { name: "board" }]);
        this.board = name;
        this.water = dressWater(game, s, zoneId, tiles);
        const shadow = s.add([mesh("plane", { size: [20, 1, 20], texture: "softshadow", unlit: true, shadow: false, color: "#000000" }), { name: "ground shadow" }]);
        shadow.pos.set(-1, zoneId === "rooftop" ? -4.2 : -2.6, 1); shadow.opacity = 0.2;
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            const c = s.add([mesh("plane", { size: [7, 1, 3.5], texture: "cloud", unlit: true, shadow: false, color: z.cloud }), { name: "cloud" }]);
            c.rot.set(0.95, Math.PI / 4, 0);
            c.opacity = 0.55; c.cx = -9 + i * 5.5; c.cz = 9 - i * 4 + (i % 2) * 5; c.pos.set(c.cx, -3.2 - (i % 3), c.cz);
            this.clouds.push(c);
        }
        // The overlay is real tiles lying on the board, so birds stand in front of it.
        this.marks = []; this.danger = [];
        for (let i = 0; i < N * N; i++) {
            const x = i % N, y = Math.floor(i / N);
            const a = s.add([mesh("plane", { size: 1, texture: "tilefill", unlit: true, shadow: false }), { name: "mark" }]);
            const e = s.add([mesh("plane", { size: 1, texture: "tilemark", unlit: true, shadow: false }), { name: "danger" }]);
            for (const q of [a, e]) { q.pos.set(wx(x), 0.05, wz(y)); q.hidden = true; q.opacity = 0; q.goal = 0; }
            e.pos.y = 0.07;
            this.marks.push(a); this.danger.push(e);
        }
        this.ghostB = s.add([mesh("sarge_body_g", { shadow: false }), { name: "ghost" }]); this.ghostH = s.add([mesh("sarge_head_g", { shadow: false }), { name: "ghost" }]);
        this.ghostB.hidden = this.ghostH.hidden = true;
        this.selRing = s.add([mesh("plane", { size: 1.12, texture: "tilemark", unlit: true, shadow: false }), { name: "ring" }]);
        this.selRing.hidden = true;
        this.overlay = { marks: new Map(), danger: new Map() };
        this.fit();
        s.on("resize", () => this.fit());
    }

    /** Frame the board inside a rectangle of the view: tall camera on phones, lower on wide screens. */
    fit(rect) {
        this.rect = rect ?? this.rect;
        const s = this.s, v = s.view, r = this.rect ?? { x: 0, y: 0, w: v.width, h: v.height };
        const wide = r.w > r.h;
        const pitch = wide ? 0.88 : 0.98, yaw = Math.PI / 4, cp = Math.cos(pitch), sp = Math.sin(pitch);
        const dirv = [Math.sin(yaw) * cp, sp, Math.cos(yaw) * cp];
        let dist = 30, tx = 0, tz = 0;
        const ext = 4.3;
        const set = () => { s.cam3.set([tx + dirv[0] * dist, dirv[1] * dist, tz + dirv[2] * dist], [tx, 0, tz]); s.cam3.update(1); };
        for (let it = 0; it < 12; it++) {
            set();
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (const [a, b, c] of [[-ext, 0, -ext], [ext, 0, -ext], [-ext, 0, ext], [ext, -0.5, ext], [-ext, 1, -ext]]) { const p = s.cam3.project([a, b, c]); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
            const k = Math.max((x1 - x0) / (r.w - 6), (y1 - y0) / (r.h - 6));
            dist *= k;
            // Slide along the ground so the board's middle sits at the rectangle's middle.
            set();
            x0 = 1e9; x1 = -1e9; y0 = 1e9; y1 = -1e9;
            for (const [a, b, c] of [[-ext, 0, -ext], [ext, 0, -ext], [-ext, 0, ext], [ext, -0.5, ext], [-ext, 1, -ext]]) { const p = s.cam3.project([a, b, c]); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
            const dx = r.x + r.w / 2 - (x0 + x1) / 2, dy = r.y + r.h / 2 - (y0 + y1) / 2;
            const ax = s.cam3.project([1, 0, -1]), bx = s.cam3.project([0, 0, 0]), px = Math.hypot(ax.x - bx.x, ax.y - bx.y) / Math.SQRT2 || 1;
            const rg = -dx / px, ug = dy / (px * sp);
            tx += (rg - ug) * Math.SQRT1_2; tz += (-rg - ug) * Math.SQRT1_2;
        }
        set();
        s.cam3.cut?.();
        this.tileSize = Math.abs(s.cam3.project([1, 0, 0]).x - s.cam3.project([0, 0, 0]).x) * 2;
    }

    project(x, y, z) { return this.s.cam3.project([x, y, z]); }
    tileAt(px, py) {
        const r = this.s.cam3.ray(px, py);
        if (r.dir.y >= -0.001) return null;
        const t = -r.origin.y / r.dir.y, x = Math.round(r.origin.x + r.dir.x * t + 3.5), y = Math.round(r.origin.z + r.dir.z * t + 3.5);
        return inB(x, y) ? [x, y] : null;
    }
    /** The tile a tap means: bodies stand up from their tile, so a tap on a bird's head counts as its tile. */
    pick(px, py, st) {
        let best = null, bd = 1e9;
        for (const u of st.units) {
            if (u.hp <= 0) continue;
            const a = this.actors.get(u.id);
            if (!a) continue;
            const t = this.project(a.x, a.height * 0.55, a.z), r = Math.max(16, this.tileSize * 0.34), ry = Math.max(20, a.height * this.tileSize * 0.62);
            const d = Math.hypot((px - t.x) / r, (py - t.y) / ry);
            if (d < 1 && d < bd) { bd = d; best = [u.x, u.y]; }
        }
        return best ?? this.tileAt(px, py);
    }

    sync(st) {
        const seen = new Set();
        for (const u of st.units) {
            if (u.hp <= 0) continue;
            seen.add(u.id);
            let a = this.actors.get(u.id);
            if (!a) { a = new Actor(this, u); this.actors.set(u.id, a); }
            a.x = wx(u.x); a.z = wz(u.y); a.y = 0; a.anim = null; a.sink = 0; a.grow = 1; a.tilt = 0;
            if (a.rest !== null) a.goalYaw = a.rest;
            if (u.side === 1 && u.intent) a.goalYaw = YAW[u.intent.dir ?? 2];
        }
        for (const [id, a] of this.actors) if (!seen.has(id)) { a.remove(); this.actors.delete(id); }
        this.syncHedges(st);
    }
    syncHedges(st) {
        const wanted = new Map();
        for (let i = 0; i < N * N; i++) if (st.tiles[i] === T.HEDGE || st.tiles[i] === T.HEDGE1) wanted.set(i, st.tiles[i]);
        for (const [i, e] of this.hedges) if (!wanted.has(i)) { e.destroy(); this.hedges.delete(i); }
        for (const [i, t] of wanted) {
            const name = `hedge_${this.zoneId}${t === T.HEDGE1 ? "_hurt" : ""}`;
            let e = this.hedges.get(i);
            if (!e) { e = this.s.add([mesh(name), { name: "hedge" }]); e.pos.set(wx(i % N), 0, wz(Math.floor(i / N))); this.hedges.set(i, e); }
            if (e.mesh !== name) e.mesh = name;
            e.size.set(this.game.assets.geometry(name).natural);
        }
    }

    // ---- overlay ----
    setOverlay(marks, danger) { this.overlay.marks = marks; this.overlay.danger = danger; }
    ghost(k, x, y, yaw) {
        if (!k) { this.ghostB.hidden = this.ghostH.hidden = true; return; }
        const c = BIRD[k] ?? BIRD.default, K = c.s * 1.14;
        for (const [e, n] of [[this.ghostB, `${k}_body_g`], [this.ghostH, `${k}_head_g`]]) { if (e.mesh !== n) { e.mesh = n; e.size.set(this.game.assets.geometry(n).natural); } e.hidden = false; e.opacity = 0.62; e.scale.set(K, K, K); e.rot.set(0, yaw ?? 0, 0); }
        const sn = Math.sin(yaw ?? 0), cs = Math.cos(yaw ?? 0);
        this.ghostB.pos.set(wx(x), 0.02, wz(y));
        this.ghostH.pos.set(wx(x) + sn * c.neck[2] * K, c.neck[1] * K, wz(y) + cs * c.neck[2] * K);
    }
    update(dt) {
        this.time += dt;
        for (const a of this.actors.values()) a.update(dt);
        for (const w of this.water) w.pos.y = Math.sin(this.time * 1.6) * 0.012;
        for (const c of this.clouds) { c.cx += dt * 0.12; if (c.cx > 14) c.cx = -14; c.pos.x = c.cx; }
        const { marks, danger } = this.overlay, pulse = 0.82 + Math.sin(this.time * 5) * 0.14;
        for (let i = 0; i < N * N; i++) {
            const m = this.marks[i], d = this.danger[i], want = marks.get(i), dw = danger.get(i);
            m.goal = want ? want.a : 0; d.goal = dw ? dw.a * pulse : 0;
            if (want) m.color = want.c; if (dw) d.color = dw.c;
            for (const e of [m, d]) {
                e.opacity += (e.goal - e.opacity) * Math.min(1, dt * 18);
                e.hidden = e.opacity < 0.012;
            }
        }
        // play the event queue
        if (this.wait > 0) this.wait -= dt * this.speed;
        while (this.playing && this.wait <= 0) {
            if (!this.queue.length) { this.playing = false; this.speed = 1; const f = this.onDone; this.onDone = null; f?.(); break; }
            this.wait += this.handle(this.queue.shift()) ?? 0;
        }
        for (const f of this.fx) { f.life -= dt; f.t += dt; f.vy += (f.g ?? -9) * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.rot += (f.spin ?? 0) * dt; if (f.floor !== undefined && f.y < f.floor) { f.y = f.floor; f.vy *= -0.3; f.vx *= 0.5; f.vz *= 0.5; } }
        this.fx = this.fx.filter((f) => f.life > 0);
        for (const f of this.floats) { f.t += dt; f.y += dt * 0.7 * Math.max(0, 1 - f.t); }
        this.floats = this.floats.filter((f) => f.t < f.life);
        for (const b of this.bubbles) b.t += dt;
        this.bubbles = this.bubbles.filter((b) => b.t < b.life);
        for (const r of this.rings) r.t += dt;
        this.rings = this.rings.filter((r) => r.t < r.life);
    }

    // ---- juice ----
    bits(sprite, x, y, z, n, { speed = 2.4, up = 3, life = 0.7, size = 14, g = -9, spin = 8, floor = 0.04, fade = true, tint: c } = {}) {
        const R = () => this.game.fxRng.next();
        for (let i = 0; i < n; i++) {
            const a = R() * Math.PI * 2, sp = speed * (0.3 + R() * 0.8);
            this.fx.push({ sprite, x, y, z, vx: Math.cos(a) * sp, vy: up * (0.4 + R() * 0.8), vz: Math.sin(a) * sp, life: life * (0.6 + R() * 0.6), max: life, t: 0, size: size * (0.7 + R() * 0.6), rot: R() * 6, spin: (R() - 0.5) * spin, g, floor, fade, c });
        }
    }
    shot(sprite, from, to, dur, arc = 0, size = 16) {
        this.fx.push({ sprite, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, life: dur, max: dur, t: 0, size, rot: 0, spin: 10, from, to, dur, arc, path: true });
    }
    ring(x, z, col, size = 1, life = 0.35) { this.rings.push({ x, z, col, size, life, t: 0 }); }
    float(text, x, y, z, col = "#fff", size = 22, life = 0.9) { this.floats.push({ text, x, y, z, col, size, life, t: 0 }); }
    say(id, text, life = 1.9) {
        this.bubbles = this.bubbles.filter((b) => b.id !== id);
        this.bubbles.push({ id, text, t: 0, life });
    }
    actor(id) { return this.actors.get(id); }

    /** Queue events from the sim, then call done when they've all been shown. */
    play(events, done) {
        const prev = this.onDone;
        this.queue.push(...events);
        this.onDone = prev ? () => { prev(); done?.(); } : done;
        this.playing = true;
    }

    handle(e) {
        const g = this.game, s = this.s, a = e.id ? this.actors.get(e.id) : null;
        switch (e.t) {
            case "move": {
                if (!a) return 0;
                const u = e.path, flyer = PIGEONS[a.k]?.fly;
                let t = 0;
                for (const [x, y] of u) {
                    s.wait(t, () => {
                        const i = u.findIndex((p) => p[0] === x && p[1] === y), [px, py] = i ? u[i - 1] : [e.fx, e.fy];
                        a.goalYaw = YAW[DIRS.findIndex(([dx, dy]) => dx === x - px && dy === y - py)] ?? a.goalYaw;
                        if (flyer) a.flap = 0.5;
                        a.move(wx(x), wz(y), 0.12, { arc: flyer ? 0.34 : 0.17 });
                        S.hop(g, i);
                    });
                    t += 0.125;
                }
                s.wait(t, () => { g.haptic("tick"); this.bits("puff", a.x, 0.05, a.z, 3, { speed: 0.9, up: 0.6, life: 0.3, size: 9, g: 0 }); });
                return t + 0.04;
            }
            case "emove": {
                if (!a) return 0;
                const dist = Math.abs(e.x - e.fx) + Math.abs(e.y - e.fy);
                const def = ENEMIES[a.k];
                if (def?.fly) a.flap = 0.6;
                const dx = e.x - e.fx, dy = e.y - e.fy;
                a.goalYaw = YAW[Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0];
                a.move(wx(e.x), wz(e.y), 0.14 + dist * 0.05, { arc: def?.fly ? 0.5 : 0.3 });
                S.foeStep(g);
                return 0.14;
            }
            case "act": return this.act(e, a);
            case "attack": return this.attack(e, a);
            case "push": {
                if (!a) return 0;
                a.move(wx(e.x), wz(e.y), 0.14, { arc: 0.08, ease: (t) => 1 - (1 - t) * (1 - t) });
                a.hit = 0.6;
                this.bits("puff", a.x, 0.08, a.z, 3, { speed: 1, up: 0.5, life: 0.3, size: 10, g: 0 });
                S.shove(g);
                return 0.13;
            }
            case "bump": {
                if (!a) return 0;
                const d = DIRS[e.d], x = wx(e.x), z = wz(e.y);
                a.move(x + d[0] * 0.26, z + d[1] * 0.26, 0.06, { onDone: () => a.move(x, z, 0.1) });
                s.wait(0.06, () => { a.sqV += 6; S.bump(g); this.bits("spark", x + d[0] * 0.5, 0.4, z + d[1] * 0.5, 6, { speed: 2.6, up: 2.2, life: 0.32, size: 12 }); s.shake(3, 0.12, { haptic: false }); s.freeze(0.04); });
                return 0.18;
            }
            case "dmg": {
                const col = a ? a : null;
                if (col) { a.hit = 1; a.sqV += 7; a.tint("#ffb3a8"); s.wait(0.14, () => a.parts.length && a.tint("#ffffff")); }
                const t = col ? a.top() : { x: wx(e.x), y: 1, z: wz(e.y) };
                this.float(`-${e.n}`, t.x, t.y + 0.1, t.z, "#ffdc5e", e.n >= 3 ? 30 : 25);
                if (a && a.side !== 2) this.bits("feather", t.x, t.y * 0.6, t.z, 3 + e.n * 2, { speed: 1.3, up: 2, g: -2.2, life: 0.9, size: 11, spin: 5 });
                S.hit(g, e.n, a?.side);
                s.shake(2 + e.n * 1.5, 0.15, { haptic: false });
                if (a?.side === 0) { const p = PIGEONS[a.k]; this.say(a.id, p.hurt[Math.floor(g.fxRng.next() * p.hurt.length)], 1.4); s.flash("#ff4b3a18", 0.14); }
                return 0.14;
            }
            case "block": {
                if (a) { this.ring(a.x, a.z, "#8fd8ff", 1, 0.4); this.float("Blocked", a.x, a.height + 0.1, a.z, "#bdeaff", 17); }
                S.block(g);
                return 0.14;
            }
            case "die": return this.die(e, a);
            case "boom": {
                const x = wx(e.x), z = wz(e.y);
                this.ring(x, z, "#ffbe5c", 2.8, 0.42);
                this.bits("spark", x, 0.4, z, 16, { speed: 5.6, up: 5.2, life: 0.55, size: 15 });
                this.bits("puff", x, 0.3, z, 8, { speed: 2.3, up: 1.6, g: 0.6, life: 0.6, size: 20, floor: undefined, tint: "#ffd6a8" });
                S.boom(g);
                s.shake(10, 0.28); s.freeze(0.07); s.flash("#fff1c033", 0.12);
                return 0.2;
            }
            case "shock": {
                const x = wx(e.x), z = wz(e.y);
                this.ring(x, z, "#fff0bd", 2.4, 0.4);
                if (a) { a.sqV += 12; a.hit = 0.7; }
                S.drum(g);
                s.shake(6, 0.2, { haptic: false }); g.haptic("heavy");
                return 0.18;
            }
            case "soak": {
                if (a) { this.bits("drop", a.x, 0.1, a.z, 12, { speed: 2, up: 3.6, life: 0.55, size: 11 }); this.float("Soaked", a.x, a.height + 0.15, a.z, "#a9e6f7", 17); }
                S.splash(g);
                return 0.2;
            }
            case "drown": case "fall": return 0;
            case "heal": { if (a) { this.float(`+${e.n}`, a.x, a.height + 0.1, a.z, "#9ff0a8", 22); this.bits("spark", a.x, 0.6, a.z, 7, { speed: 0.9, up: 1.8, g: 0, life: 0.6, size: 11 }); } S.heal(g); return 0.16; }
            case "shield": { if (a) this.ring(a.x, a.z, "#8fd8ff", 1.2, 0.4); S.heal(g); return 0.1; }
            case "crumb": { const x = wx(e.x), z = wz(e.y); this.bits("spark", x, 0.3, z, 8, { speed: 1.4, up: 2.4, life: 0.5, size: 11 }); this.float("Crumb!", x, 0.9, z, "#ffe59e", 18); this.onCrumb?.(e.x, e.y); S.crumb(g); return 0.1; }
            case "perch": { const x = wx(e.x), z = wz(e.y); this.ring(x, z, "#ffe28a", 1.4, 0.5); this.float(`Sat ${e.n}`, x, 1.1, z, "#ffe59e", 19); S.perch(g, e.n); return 0.26; }
            case "tile": this.syncHedgesTile(e); return 0.03;
            case "appear": { const u = this.scratch?.units.find((q) => q.id === e.id) ?? { id: e.id, k: e.k, x: e.x, y: e.y, side: 2 }; const b = new Actor(this, u); this.actors.set(e.id, b); b.y = 1.4; b.move(wx(e.x), wz(e.y), 0.2); S.box(g); return 0.2; }
            case "spawn": { const u = { id: e.id, k: e.k, x: e.x, y: e.y, side: 1, dir: 2 }, b = new Actor(this, u); this.actors.set(e.id, b); b.y = 1.8; b.x = wx(e.x); b.z = wz(e.y); b.move(wx(e.x), wz(e.y), 0.26); b.flap = 0.7; S.spawn(g); this.bits("puff", b.x, 0.1, b.z, 6, { speed: 1.4, up: 0.7, life: 0.4, size: 12, g: 0 }); return 0.22; }
            case "blocked": { this.float("Blocked!", wx(e.x), 1.2, wz(e.y), "#fff", 18); return 0.16; }
            case "ride": { if (a) { a.move(wx(e.x), wz(e.y), 0.32); a.goalYaw += Math.PI / 2; } S.ride(g); return 0.02; }
            case "dive": {
                if (!a) return 0;
                const d = Math.hypot(e.x - e.fx, e.y - e.fy);
                a.flap = 0.5; a.move(wx(e.x), wz(e.y), 0.08 + d * 0.035, { arc: 0.2, ease: (t) => t * t });
                S.dive(g);
                return 0.1 + d * 0.035;
            }
            default: return 0;
        }
    }
    syncHedgesTile(e) {
        const i = e.y * N + e.x, h = this.hedges.get(i), x = wx(e.x), z = wz(e.y);
        this.bits("puff", x, 0.3, z, 5, { speed: 1.6, up: 2, g: -3, life: 0.45, size: 12, tint: this.zone.hedge2 });
        S.leaves(this.game);
        if (e.v === T.GRASS && h) { h.destroy(); this.hedges.delete(i); return; }
        if (h) { const n = `hedge_${this.zoneId}_hurt`; h.mesh = n; h.size.set(this.game.assets.geometry(n).natural); }
    }

    act(e, a) {
        const g = this.game, s = this.s;
        if (!a) return 0;
        a.goalYaw = YAW[e.d];
        const d = DIRS[e.d], from = { x: a.x, y: 0.55, z: a.z }, to = { x: wx(e.x), y: 0.35, z: wz(e.y) };
        switch (e.act) {
            case "slap": {
                const x = a.x, z = a.z;
                a.flap = 0.5; a.sqV -= 6;
                a.move(x + d[0] * 0.34, z + d[1] * 0.34, 0.09, { onDone: () => a.move(x, z, 0.14) });
                s.wait(0.08, () => { S.slap(g); s.freeze(0.05); g.haptic("medium"); });
                return 0.12;
            }
            case "drop": {
                a.flap = 0.8; a.y = 0; a.move(a.x, a.z, 0.42, { arc: 0.9 });
                this.shot("bomb", { x: a.x, y: 1.1, z: a.z }, { x: to.x, y: 0.1, z: to.z }, 0.38, 1.4, 20);
                S.whistle(g);
                s.wait(0.36, () => { this.ring(to.x, to.z, "#fffbe8", 2.6, 0.34); this.bits("bomb", to.x, 0.1, to.z, 10, { speed: 3, up: 3, life: 0.45, size: 9 }); S.splat(g); s.shake(5, 0.16); s.freeze(0.05); });
                return 0.4;
            }
            case "flap": {
                a.flap = 1; a.sqV += 7;
                S.whoosh(g); g.haptic("medium");
                for (let i = 1; i <= 4; i++) s.wait(i * 0.035, () => { this.bits("puff", a.x + d[0] * i * 0.8, 0.3, a.z + d[1] * i * 0.8, 3, { speed: 0.8, up: 0.6, g: 0, life: 0.3, size: 13, floor: undefined }); });
                return 0.2;
            }
            case "slide": {
                a.goalYaw = YAW[e.d]; a.sqV -= 10; a.tilt = 0.5;
                const dist = Math.abs(e.x - e.fx) + Math.abs(e.y - e.fy), dur = 0.1 + dist * 0.05;
                a.move(wx(e.x), wz(e.y), dur, { ease: (t) => t * t, onDone: () => { a.tilt = 0; } });
                S.slide(g);
                for (let i = 0; i < dist * 2; i++) s.wait((i * dur) / (dist * 2), () => this.bits("puff", a.x, 0.06, a.z, 1, { speed: 0.4, up: 0.3, life: 0.3, size: 12, g: 0 }));
                return dur;
            }
            case "swap": {
                const o = this.actors.get(e.other);
                S.swap(g); g.haptic("medium");
                for (const q of [a, o]) if (q) { this.ring(q.x, q.z, "#c7a7ff", 1.2, 0.3); this.bits("spark", q.x, 0.4, q.z, 7, { speed: 1.5, up: 1.6, g: 0, life: 0.4, size: 11 }); }
                a.move(wx(e.x), wz(e.y), 0.2, { arc: 0.7 }); o?.move(wx(e.fx), wz(e.fy), 0.2, { arc: 0.7 });
                return 0.22;
            }
            case "hook": {
                a.sqV -= 6;
                this.shot("crust", from, { x: to.x, y: 0.5, z: to.z }, 0.14, 0, 16);
                this.lines = { from, to: { x: to.x, y: 0.5, z: to.z }, t: 0 };
                s.wait(0.5, () => { this.lines = null; });
                S.hook(g);
                return 0.16;
            }
            case "patch": { a.sqV -= 4; S.heal(g); g.haptic("light"); return 0.14; }
            case "box": { this.shot("crust", from, to, 0.16, 0.8, 1); a.sqV -= 5; return 0.1; }
        }
        return 0.1;
    }

    attack(e, a) {
        const g = this.game, s = this.s;
        if (!a) return 0;
        const d = DIRS[e.dir ?? 0];
        if (e.dir !== undefined) a.goalYaw = YAW[e.dir];
        a.sqV -= 7;
        const t0 = e.tiles[0], x = a.x, z = a.z;
        const to = t0 ? { x: wx(t0[0]), y: 0.45, z: wz(t0[1]) } : { x, y: 0.5, z };
        switch (e.type) {
            case "melee": a.flap = 0.25; a.peck = 0.5; a.move(x + d[0] * 0.3, z + d[1] * 0.3, 0.1, { onDone: () => a.move(x, z, 0.12) }); s.wait(0.08, () => S.peck(g)); return 0.2;
            case "line": this.shot("pebble", { x, y: 0.6, z }, to, 0.14, 0.1, 13); S.flick(g); return 0.2;
            case "cross": for (const t of e.tiles) this.shot("pebble", { x, y: 0.7, z }, { x: wx(t[0]), y: 0.45, z: wz(t[1]) }, 0.14, 0.1, 15); S.flick(g); return 0.22;
            case "lob": this.shot("acorn", { x, y: 0.7, z }, { x: to.x, y: 0.1, z: to.z }, 0.34, 1.6, 18); S.whistle(g); s.wait(0.33, () => { this.ring(to.x, to.z, "#ffd9a8", 2.4, 0.3); S.splat(g); s.shake(4, 0.14); }); return 0.38;
            case "wide": a.flap = 0.5; S.screech(g); for (const t of e.tiles) this.ring(wx(t[0]), wz(t[1]), "#ffffff", 0.9, 0.25); s.shake(3, 0.2, { haptic: false }); return 0.25;
            case "dive": S.foeStep(g); a.sqV -= 8; return 0.16;
            case "blast": a.hit = 1; S.fuse(g); return 0.24;
            case "spray": for (let i = 1; i <= 6; i++) s.wait(i * 0.02, () => { if (e.tiles[i - 1]) this.bits("drop", wx(e.tiles[i - 1][0]), 0.35, wz(e.tiles[i - 1][1]), 3, { speed: 0.9, up: 1.8, life: 0.4, size: 10 }); }); S.spray(g); return 0.24;
        }
        return 0.1;
    }

    die(e, a) {
        const g = this.game, s = this.s;
        if (!a) return 0;
        const x = a.x, z = a.z, h = a.height;
        this.actors.delete(e.id);
        const done = () => a.remove();
        if (e.how === "drown") {
            this.bits("drop", x, 0.1, z, 18, { speed: 2.6, up: 4.4, life: 0.65, size: 12 });
            S.splash(g); g.haptic("medium");
            this.fading = this.fading ?? [];
            const fade = { a, t: 0 };
            const tick = s.every(1 / 30, () => { fade.t += 1 / 30; a.sink = fade.t * 1.5; a.pose(); if (fade.t > 0.4) { tick.cancel(); done(); } });
            this.float("Glub", x, 1, z, "#a9e6f7", 20);
            return 0.28;
        }
        if (e.how === "fall") {
            S.fall(g); g.haptic("medium");
            const fade = { t: 0 };
            const tick = s.every(1 / 30, () => { fade.t += 1 / 30; a.sink = fade.t * fade.t * 12; a.tilt += 0.2; a.pose(); if (fade.t > 0.6) { tick.cancel(); done(); } });
            this.float("Aaaa", x, 0.8, z, "#fff", 20);
            return 0.36;
        }
        if (a.side === 2) {
            this.bits(a.k === "box" ? "puff" : "spark", x, h * 0.5, z, 12, { speed: 2.4, up: 2.6, life: 0.4, size: 11, tint: a.k === "box" ? "#d9b27b" : undefined });
            done();
            return 0.05;
        }
        this.bits("feather", x, h * 0.6, z, 22, { speed: 2.8, up: 3.2, g: -2.4, life: 1.2, size: 13, spin: 6 });
        this.bits("puff", x, 0.3, z, 6, { speed: 1.6, up: 1.2, g: 0, life: 0.45, size: 18 });
        S.poof(g, a.side);
        s.freeze(0.07);
        g.haptic(a.side === 0 ? "error" : "heavy");
        s.wait(0.02, done);
        return 0.22;
    }

    // ---- drawn over the 3D ----
    drawFx(d) {
        const cam = this.s.cam3, ts = this.tileSize / 45;
        for (const r of this.rings) {
            const k = r.t / r.life, p = this.project(r.x, 0.1, r.z), rad = (0.25 + k) * r.size * this.tileSize * 0.5;
            const pts = 24;
            for (let i = 0; i < pts; i++) {
                const a = (i / pts) * Math.PI * 2, b = ((i + 1) / pts) * Math.PI * 2, y = 0.62;
                d.line([p.x + Math.cos(a) * rad, p.y + Math.sin(a) * rad * y], [p.x + Math.cos(b) * rad, p.y + Math.sin(b) * rad * y], { width: 4 * (1 - k) + 1, color: r.col });
            }
        }
        if (this.lines) { const a = this.project(this.lines.from.x, this.lines.from.y, this.lines.from.z), b = this.project(this.lines.to.x, this.lines.to.y, this.lines.to.z); d.line([a.x, a.y], [b.x, b.y], { width: 2, color: "#3a2412" }); }
        for (const f of this.fx) {
            let x = f.x, y = f.y, z = f.z;
            if (f.path) { const t = clamp(f.t / f.dur, 0, 1); x = f.from.x + (f.to.x - f.from.x) * t; z = f.from.z + (f.to.z - f.from.z) * t; y = f.from.y + (f.to.y - f.from.y) * t + Math.sin(t * Math.PI) * f.arc; }
            const p = cam.project([x, y, z]), o = f.fade === false ? 1 : clamp(f.life / (f.max * 0.5), 0, 1);
            d.sprite(f.sprite, { x: p.x, y: p.y, width: f.size * ts, height: f.size * ts, rot: f.rot, opacity: o, color: f.c });
        }
        for (const f of this.floats) {
            const p = this.project(f.x, f.y, f.z), k = f.t < 0.12 ? 0.6 + (f.t / 0.12) * 0.7 : f.t < 0.22 ? 1.3 - (f.t - 0.12) * 3 : 1, o = clamp((f.life - f.t) * 5, 0, 1);
            d.text(f.text, { x: p.x, y: p.y + 1.5, size: f.size * k, bold: true, color: "#1b1526", opacity: o });
            d.text(f.text, { x: p.x, y: p.y, size: f.size * k, bold: true, color: f.col, opacity: o });
        }
    }
    drawBubbles(d) {
        for (const b of this.bubbles) {
            const a = this.actors.get(b.id);
            if (!a) continue;
            const t = a.top(), p = this.project(t.x, t.y + 0.22, t.z), k = Math.min(1, b.t * 10), o = clamp((b.life - b.t) * 5, 0, 1), w = Math.min(170, b.text.length * 6.1 + 18), v = this.s.view;
            const lines = Math.ceil((b.text.length * 6.1) / 152), h = 12 + lines * 14, x = clamp(p.x, w / 2 + 6, v.width - w / 2 - 6), y = Math.max(h / 2 + 4, p.y - h / 2 - 6);
            d.push(); d.translate(x, y); d.scale(k, k);
            d.rect(w + 3, h + 3, { color: "#2a2233", radius: 10, opacity: o });
            d.rect(w, h, { color: "#fffaf0", radius: 9, opacity: o });
            d.poly([[p.x - x - 5, h / 2 - 1], [p.x - x + 5, h / 2 - 1], [p.x - x, h / 2 + 7]], { color: "#fffaf0", opacity: o });
            d.text(b.text, { size: 12, bold: true, color: "#2a2233", maxWidth: w - 10, opacity: o });
            d.pop();
        }
    }
}

export { intentTiles, isSolid, byId, forecast, ACTS, PROPS };
