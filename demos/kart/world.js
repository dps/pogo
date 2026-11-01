// One race: track, six karts, items, hazards, camera and every bit of feedback. The title screen runs one too,
// with no player in it, as a live attract mode.
import { color, mesh, pos } from "./pogo.js";
import { RADIUS, TIERS, giveBoost, hurt, launch, makeKart, placeOnGrid, stepKart, wrapAngle } from "./kart.js";
import { initAI, driveAI } from "./ai.js";
import { CLASSES, RACERS, loadSave } from "./data.js";
import { Track } from "./track.js";
import { trackById } from "./tracks.js";
import { THEMES, buildScenery } from "./scenery.js";

export const SPARK = [["#fff6e6", "#ffe9a8"], ["#7fe3ff", "#2f9dff"], ["#ffb347", "#ff6a1f"], ["#ff8ae0", "#c44dff"]];
export const RIDER_Y = 0.28;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ITEM_TABLE = {
    front: [["banana", 45], ["watermelon", 25], ["shield", 30]],
    mid: [["banana", 15], ["watermelon", 30], ["melon", 20], ["shield", 15], ["drink", 20]],
    back: [["melon", 35], ["drink", 35], ["watermelon", 20], ["shield", 10]],
};
const PROP_MESH = { aisle: ["prop_cans", "prop_box", "prop_cone"], freezer: ["prop_box", "prop_cone"], bakery: ["prop_box", "prop_cans"], garden: ["prop_box", "prop_cone"], dock: ["prop_box", "prop_cone"], rooftop: ["prop_cone", "prop_box"] };
const HAZARD = {
    cone: { mesh: "hz_ice", r: 2.2, hit: "spin" }, pin: { mesh: "hz_pin", r: 2.2, hit: "spin", roll: true }, forklift: { mesh: "hz_forklift", r: 2.6, hit: "tumble", face: true },
    trolley: { mesh: "cart", r: 2.0, hit: "spin", face: true, scale: 1.6, tint: "#c9d4e3" },
};
export const ITEM_NAMES = { banana: "Banana", melon: "Homing Melon", watermelon: "Bowling Melon", shield: "Baguette Shield", drink: "Energy Drink" };

export class World {
    constructor(game, s, o) {
        this.game = game; this.s = s; this.o = o; this.snd = game.snd;
        const def = trackById(o.track);
        this.def = def; this.mode = o.mode ?? "race";
        this.T = new Track(def, !!o.mirror);
        this.th = THEMES[def.theme];
        this.cls = CLASSES.find((c) => c.id === (o.cls ?? "basket")) ?? CLASSES[0];
        this.laps = o.laps ?? def.laps;
        this.time = 0; this.t = 0; this.phase = "countdown"; this.countT = 0; this.count = 3; this.rng = s.rng; this.finishCount = 0;
        this.karts = []; this.items = []; this.props = []; this.hazards = []; this.crates = []; this.chunks = [];
        this.player = null; this.shake = 0; this.fxNote = null; this.banner = null; this.results = null;
        this.camYaw = 0; this.camLat = 0; this.camPos = null; this.camY = 0; this.fov = 66; this.intro = 0; this.roll = 0;
        this.stats = { drifts: 0, boosts: 0, hits: 0, airtime: 0, wallHits: 0, offroad: 0, tiers: [0, 0, 0, 0], itemsUsed: 0 };
        this.autopilot = !!o.autopilot;
        this.mood(); this.buildWorld(); this.buildKarts();
        if (this.mode === "tt") this.setupTT();
        this.snapCamera();
        if (this.mode === "demo") { this.phase = "race"; for (const k of this.karts) k.vf = 0; }
    }

    mood() {
        const { s, th } = this, L = s.light;
        s.background = th.sky;
        L.dir.set(...th.dir);
        const sun = color(th.sun).clone(); sun.r *= th.sunI; sun.g *= th.sunI; sun.b *= th.sunI; L.color = sun;
        const dim = (c, k) => { const q = color(c).clone(); q.r *= k; q.g *= k; q.b *= k; return q; };
        L.sky = dim(th.ambSky, th.amb ?? 0.62); L.ground = dim(th.ambGround, th.amb ?? 0.62);
        L.shadows = loadSave(this.game).settings.shadows !== false; L.shadowRange = 34;
        L.fog = { color: color(th.fog), near: th.fogNear, far: th.fogFar };
        s.cam3.near = 0.4; s.cam3.far = 900;
    }

    buildWorld() {
        const { s, game, T } = this;
        const built = this.built = buildScenery(game, T);
        const shadow = { shadow: false };
        if (built.far) s.add([mesh(built.far, shadow), pos(0, 0, 0)]);
        for (const c of built.chunks) this.chunks.push({ ...c, e: s.add([mesh(c.name, shadow), pos(0, 0, 0)]) });
        for (const p of built.pads) {
            const b = s.add([mesh("boostpad", { size: [p.w, 1, 7], unlit: true, shadow: false, color: "#3ff5ff" }), pos(p.x, p.y + 0.09, p.z)]);
            b.rot.y = p.yaw; b.rot.z = T.bank[p.i]; b.rot.x = Math.atan(T.slope[p.i]);
            p.e = b;
        }
        const padEntities = built.pads.map((p) => p.e);
        s.onUpdate(() => { const f = (this.time * 5) % 1, c = f < 0.5 ? "#3ff5ff" : "#fff27a"; for (const e of padEntities) e.color = c; });
        // Smashable props
        const list = PROP_MESH[this.def.theme];
        (this.def.props ?? []).forEach(([at, d], n) => {
            const i = T.index(at), fl = T.mirror ? -1 : 1, p = T.point(i, d * fl);
            const e = s.add([mesh(list[n % list.length], { shadow: true }), pos(p[0], p[1], p[2])]);
            e.rot.y = n * 1.3;
            this.props.push({ e, i, d: d * fl, x: p[0], y: p[1], z: p[2], rx: 0, ry: 0, vx: 0, vy: 0, vz: 0, flying: 0, away: false });
        });
        // Moving hazards
        for (const h of this.def.hazards ?? []) {
            const K = HAZARD[h.kind], i = T.index(h.at);
            const e = s.add([mesh(K.mesh, K.tint ? { color: K.tint } : {}), pos(0, 0, 0)]);
            if (K.scale) e.scale = K.scale;
            this.hazards.push({ e, i, K, amp: h.amp, period: h.period, x: 0, y: 0, z: 0, d: 0, ph: i * 0.7 });
        }
        // Prize crates
        for (const at of this.def.rows ?? []) {
            const i = T.index(at), hw = T.hw[i];
            for (let c = 0; c < 4; c++) {
                const d = (c - 1.5) * hw * 0.46, p = T.point(i, d);
                const e = s.add([mesh("crate", { shadow: true, color: "#ff5fa2" }), pos(p[0], p[1] + 1.7, p[2])]);
                this.crates.push({ e, i, d, x: p[0], y: p[1] + 1.7, z: p[2], t: 0, n: c });
            }
        }
    }

    buildKarts() {
        const { s, T, o, cls } = this;
        const pool = RACERS.slice();
        let lineup;
        if (this.mode === "demo") lineup = pool;
        else if (this.mode === "tt") lineup = pool.filter((r) => r.id === o.racer);
        else lineup = o.lineup ? o.lineup.map((id) => RACERS.find((r) => r.id === id)) : [...pool.filter((r) => r.id !== o.racer), pool.find((r) => r.id === o.racer)];
        const pace = [1.0, 0.985, 0.97, 0.955, 0.94, 0.925];
        lineup.forEach((r, idx) => {
            const isP = r.id === o.racer && this.mode !== "demo";
            const k = makeKart(r, cls, isP ? 1 : cls.ai * pace[idx] * (this.mode === "demo" ? 1.2 : 1));
            k.player = isP;
            placeOnGrid(k, T, idx);
            if (!isP) initAI(k, this.rng);
            this.karts.push(k); this.addKartModel(k);
            if (isP) this.player = k;
        });
        this.focus = this.player ?? this.karts[0];
    }

    addKartModel(k) {
        const { s } = this, gold = k.player && this.o.goldCart;
        const e = k.e = s.add([mesh("cart", { color: gold ? "#ffd34d" : k.racer.color, shine: gold ? 0.8 : 0.25 }), pos(k.x, k.y, k.z)]);
        k.rider = e.child([mesh(`rider_${k.id}`), pos(0, RIDER_Y, 0)]);
        k.wheels = [[-0.58, -0.92], [0.58, -0.92], [-0.58, 0.92], [0.58, 0.92]].map(([x, z]) => e.child([mesh("wheel"), pos(x, 0.24, z)]));
        k.flame = [-0.42, 0.42].map((x) => { const f = e.child([mesh("flame", { unlit: true, shadow: false }), pos(x, 0.5, 1.2)]); f.hidden = true; return f; });
        k.baguettes = [0, 1, 2].map(() => { const b = s.add([mesh("baguette"), pos(0, -50, 0)]); b.hidden = true; return b; });
    }

    setupTT() {
        const k = this.player, g = this.o.ghost;
        k.item = "drink"; k.ttDrinks = 3;
        this.ghostData = g ?? null; this.rec = []; this.bestRec = null; this.recBest = 1e9; this.recT = 0;
        if (g) {
            const col = "#7fe3ff";
            const e = this.ghostE = this.s.add([mesh("cart", { color: col, shadow: false }), pos(0, -50, 0)]);
            e.opacity = 0.5;
            const r = e.child([mesh(`rider_${g.racer ?? "pip"}`, { shadow: false, color: col })]);
            r.opacity = 0.5;
        }
    }

    // --- Step ------------------------------------------------------------------------------------------------
    update(dt) {
        const { T, karts } = this;
        this.time += dt;
        if (this.phase === "countdown") {
            this.countT += dt; this.intro = Math.min(1, this.countT / 1.1);
            const len = this.o.quickStart ? 0.55 : 0.75, n = 3 - Math.floor(this.countT / len);
            if (n !== this.count) {
                this.count = n;
                if (n > 0) this.snd.count(n);
                if (n <= 0) this.go();
            }
            const pl = this.player;
            if (pl) {
                this.readControls(dt);
                // Hold DRIFT through the last count for a rocket start.
                pl.rocket = pl.input.drift && n <= 2 ? (pl.rocket ?? 0) + dt : 0;
            }
        }
        if (this.phase === "race" || this.phase === "finish") { this.t += this.phase === "race" ? dt : 0; }
        const phaseForKart = this.phase === "countdown" ? "wait" : "race";
        for (const k of karts) {
            if (k.player && !this.autopilot && !k.finished && this.phase !== "countdown") this.readControls(dt);
            if ((!k.player || this.autopilot || k.finished) && this.phase !== "countdown") {
                if (!k.ai) initAI(k, this.rng);
                driveAI(k, this, dt);
            }
            stepKart(k, T, dt, phaseForKart);
            this.kartItems(k, dt);
        }
        this.bumpKarts(); this.stepDraft(dt); this.rank(); this.stepCrates(dt); this.stepProps(dt); this.stepHazards(dt);
        this.stepObjects(dt); this.stepPads();
        for (const k of karts) { this.drain(k); this.pose(k, dt); }
        this.playerFeel(dt); this.record(dt); this.ghostStep(); this.checkFinish(dt); this.camera(dt); this.cull();
        this.sparks();
    }

    go() {
        this.phase = "race"; this.t = 0;
        this.snd.count(0);
        const p = this.player;
        if (p) {
            p.lapStart = 0;
            if (p.rocket > 0.15) { giveBoost(p, 1.1, 2); p.vx += -Math.sin(p.yaw) * 10; p.vz += -Math.cos(p.yaw) * 10; this.banner = { text: "ROCKET START!", t: 1.4, c: "#ffc233" }; this.snd.miniturbo(2); this.s.shake(0.25, 0.3); }
            p.driftHeld = false;
        }
    }

    readControls(dt) {
        const c = this.controls, inp = this.player.input;
        if (!c) return;
        c.read(inp, dt, this);
    }

    rank() {
        const sorted = this.order = [...this.karts].sort((a, b) => (b.finished ? 1 : 0) - (a.finished ? 1 : 0) || (a.finished && b.finished ? a.finishT - b.finishT : b.progress - a.progress));
        sorted.forEach((k, i) => {
            const old = k.rank; k.rank = i + 1;
            if (k.player && old !== k.rank && this.phase === "race" && this.t > 0.5) { this.snd.pass(k.rank < old); this.rankPop = 1; }
        });
        const p = this.player, cls = this.cls;
        if (!p) return;
        for (const k of this.karts) {
            if (k === p) continue;
            const gap = k.progress - p.progress;
            k.rubber = gap > 0 ? 1 - clamp(gap / 110, 0, 1) * cls.rubberDown : 1 + clamp(-gap / 110, 0, 1) * cls.rubberUp;
        }
        if (this.mode === "tt") p.rubber = 1;
    }
    nextAhead(k) { return this.order && k.rank > 1 ? this.order[k.rank - 2] : null; }
    nextBehind(k) { return this.order && k.rank < this.order.length ? this.order[k.rank] : null; }

    // --- Items -------------------------------------------------------------------------------------------------
    kartItems(k, dt) {
        const inp = k.input;
        if (k.roll2 > 0) {
            k.roll2 -= dt;
            if (k.player) {
                k.rollTick = (k.rollTick ?? 0) - dt;
                if (k.rollTick <= 0) { k.rollTick = 0.09; this.snd.roll(); }
                if (k.roll2 <= 0) this.snd.got();
            }
        }
        const pressed = inp.item && !k.itemHeld;
        k.itemHeld = inp.item;
        if (pressed && k.item && k.roll2 <= 0 && k.spin <= 0 && k.rescue <= 0 && this.phase !== "countdown") this.useItem(k);
        if (k.ai) inp.item = false;
    }
    rollItem(k) {
        const f = (k.rank - 1) / Math.max(1, this.karts.length - 1);
        const t = f < 0.2 ? ITEM_TABLE.front : f < 0.65 ? ITEM_TABLE.mid : ITEM_TABLE.back;
        let sum = 0; for (const e of t) sum += e[1];
        let r = this.rng.range(0, sum);
        for (const e of t) { r -= e[1]; if (r <= 0) return e[0]; }
        return t[0][0];
    }
    useItem(k) {
        const { s, T } = this, kind = k.item;
        const fwd = [-Math.sin(k.yaw), -Math.cos(k.yaw)];
        this.stats.itemsUsed += k.player ? 1 : 0;
        if (k.ttDrinks > 1) k.ttDrinks--; else { k.item = null; k.ttDrinks = 0; }
        if (kind === "drink") {
            giveBoost(k, 1.9, 2); k.vx += fwd[0] * 6; k.vz += fwd[1] * 6;
            k.events.push(["pad"]);
            if (k.player) { this.snd.drink(); s.flash("#27e1a060", 0.2); this.note("WHOOSH!", "#27e1a0"); }
            s.burst({ at: [k.x, k.y + 1.2, k.z], count: 16, color: ["#27e1a0", "#fff6e6"], speed: [4, 12], life: [0.2, 0.5], size: [0.15, 0.3], dim: 3, gravity: 1 });
        } else if (kind === "shield") {
            k.shield = 3; k.shieldT = 14;
            if (k.player) { this.snd.shield(); this.note("BAGUETTES UP!", "#ffc233"); }
        } else if (kind === "banana") {
            const x = k.x - fwd[0] * 3.2, z = k.z - fwd[1] * 3.2;
            this.spawn("banana", k, x, z, 0, 0);
            if (k.player) this.snd.drop();
        } else if (kind === "melon") {
            const it = this.spawn("melon", k, k.x + fwd[0] * 2.5, k.z + fwd[1] * 2.5, 0, 0);
            it.target = this.nextAhead(k); it.speed = Math.max(k.speed + 14, 50);
            it.lateral = k.d; it.y = k.y + 1.4;
            if (k.player) { this.snd.throw(); this.note(it.target ? `AFTER ${it.target.racer.name.toUpperCase()}!` : "LOOSE MELON!", "#ffa63d"); }
        } else if (kind === "watermelon") {
            const sp = Math.max(k.speed + 16, 44);
            this.spawn("watermelon", k, k.x + fwd[0] * 3, k.z + fwd[1] * 3, fwd[0] * sp, fwd[1] * sp);
            if (k.player) this.snd.throw();
        }
        if (k.player) k.throwPop = 1;
    }
    spawn(kind, owner, x, z, vx, vz) {
        const e = this.s.add([mesh(kind), pos(x, owner.y + 0.6, z)]);
        if (kind === "banana") e.scale = 1.05;
        const it = { kind, e, owner, x, y: owner.y + 0.6, z, vx, vy: 0, vz, i: owner.i, u: owner.u, d: owner.d, lap: 0, t: 0, bounces: 0, dead: false };
        this.T.locate(it);
        this.items.push(it);
        return it;
    }
    stepObjects(dt) {
        const { T, karts, s } = this;
        for (const it of this.items) {
            if (it.dead) continue;
            it.t += dt;
            if (it.kind === "banana") {
                it.y = T.height(it.i, it.u, it.d) + 0.0;
                it.e.rot.y += dt * 0.6;
                if (it.t > 28) it.dead = true;
            } else if (it.kind === "melon") {
                // Fly down the road, then swing in on the target.
                const tg = it.target, n = T.wrap(it.i + 3);
                let dest;
                if (tg && !tg.finished) {
                    const gap = T.wrap(tg.i - it.i);
                    if (gap < 12) dest = [tg.x, tg.z];
                    else { it.lateral += (T.line[n] - it.lateral) * Math.min(1, 3 * dt); const p = T.point(n, it.lateral); dest = [p[0], p[2]]; }
                } else { const p = T.point(n, it.lateral * 0.9); dest = [p[0], p[2]]; }
                const dx = dest[0] - it.x, dz = dest[1] - it.z, l = Math.hypot(dx, dz) || 1;
                it.vx = dx / l * it.speed; it.vz = dz / l * it.speed;
                it.x += it.vx * dt; it.z += it.vz * dt; T.locate(it);
                const h = T.surf[it.i] === 3 ? it.y : T.height(it.i, it.u, it.d) + 1.5;
                it.y += (h + Math.abs(Math.sin(it.t * 9)) * 0.7 - it.y) * Math.min(1, 12 * dt);
                it.e.rot.x -= dt * 14;
                if (it.t > 7) this.pop(it, false);
            } else if (it.kind === "watermelon") {
                it.x += it.vx * dt; it.z += it.vz * dt; T.locate(it);
                const lim = T.wall[it.i] - 1.1;
                if (Math.abs(it.d) > lim) {
                    const side = Math.sign(it.d), rx = T.rx[it.i], rz = T.rz[it.i];
                    const vn = (it.vx * rx + it.vz * rz) * side;
                    it.x -= rx * side * (Math.abs(it.d) - lim); it.z -= rz * side * (Math.abs(it.d) - lim);
                    if (vn > 0) {
                        it.vx -= 2 * rx * side * vn; it.vz -= 2 * rz * side * vn; it.bounces++;
                        s.burst({ at: [it.x, it.y, it.z], count: 6, color: ["#fff6e6", "#35b24a"], speed: [3, 9], life: [0.15, 0.3], size: [0.15, 0.28], dim: 3 });
                        if (it.bounces > 5) this.pop(it, false);
                    }
                }
                const h = T.surf[it.i] === 3 ? it.y - dt * 16 : T.height(it.i, it.u, it.d) + 1.05;
                it.y += (h - it.y) * Math.min(1, 16 * dt);
                it.e.rot.x -= dt * Math.hypot(it.vx, it.vz) * 0.9;
                it.e.rot.y = Math.atan2(-it.vx, -it.vz);
                if (it.t > 7) this.pop(it, false);
            }
            if (!it.dead) {
                it.e.pos.set(it.x, it.y, it.z);
                if (it.kind === "banana") it.e.scale = 1.05 + Math.sin(it.t * 5) * 0.03;
                let hits = 0;
                const R = it.kind === "watermelon" ? 2.5 : 2.2;
                for (const k of karts) {
                    if (k === it.owner && it.t < 0.7) continue;
                    if (k.rescue > 0 || k.finished && !k.player) continue;
                    const dx = k.x - it.x, dz = k.z - it.z;
                    if (dx * dx + dz * dz > R * R || Math.abs(k.y - it.y) > 3.2) continue;
                    if (this.strike(k, it)) hits++;
                    if (it.kind !== "watermelon") { it.dead = true; break; }
                }
                if (it.kind === "watermelon" && hits > 0) {
                    if (it.owner.player && hits >= 2) this.note("STRIKE!", "#35b24a");
                    it.hits = (it.hits ?? 0) + hits;
                    if (it.hits >= 3) this.pop(it, true);
                }
            }
        }
        for (const b of this.items) if (b.dead) { b.e.destroy(); }
        if (this.items.some((b) => b.dead)) this.items = this.items.filter((b) => !b.dead);
        // Items cancel each other.
        for (let a = 0; a < this.items.length; a++) for (let b = a + 1; b < this.items.length; b++) {
            const p = this.items[a], q = this.items[b];
            if (p.kind === "banana" && q.kind === "banana") continue;
            const dx = p.x - q.x, dz = p.z - q.z;
            if (dx * dx + dz * dz < 5 && Math.abs(p.y - q.y) < 3) { this.pop(p, true); this.pop(q, true); }
        }
    }
    pop(it, loud) {
        const { s } = this;
        it.dead = true;
        const c = it.kind === "banana" ? ["#ffd93b", "#fff6e6"] : it.kind === "melon" ? ["#ffa63d", "#fff2c9", "#e87a14"] : ["#35b24a", "#ff4b5c", "#ff8fa0"];
        s.burst({ at: [it.x, it.y, it.z], count: loud ? 26 : 12, color: c, speed: [4, 15], life: [0.25, 0.6], size: [0.18, 0.4], dim: 3, gravity: 1.2 });
    }
    strike(k, it) {
        const { s } = this;
        if (k.shield > 0) {
            k.shield--; if (k.shield === 0) k.shieldT = 0;
            this.pop(it, true);
            s.burst({ at: [k.x, k.y + 1.2, k.z], count: 22, color: ["#e9ad5b", "#fff0c9"], speed: [4, 12], life: [0.25, 0.5], size: [0.14, 0.3], dim: 3, gravity: 1 });
            if (k.player) { this.snd.crumble(); this.note("BLOCKED!", "#ffc233"); s.shake(0.2, 0.2); }
            return false;
        }
        const kind = it.kind === "banana" ? "spin" : "tumble";
        if (!hurt(k, kind)) return false;
        const owner = it.owner;
        if (it.kind !== "watermelon") this.pop(it, true);
        else s.burst({ at: [k.x, k.y + 1, k.z], count: 22, color: ["#ff4b5c", "#35b24a", "#ff8fa0"], speed: [5, 15], life: [0.3, 0.6], size: [0.2, 0.42], dim: 3, gravity: 1.2 });
        if (k.player) {
            if (kind === "spin") this.snd.slip(); else this.snd.splat();
            s.shake(kind === "spin" ? 0.3 : 0.6, 0.4); s.freeze(kind === "spin" ? 0.04 : 0.09);
            s.flash(kind === "spin" ? "#ffd93b55" : "#ff4b3e77", 0.22);
        } else if (owner?.player) { this.snd.hitOther(); this.note(`GOT ${k.racer.name.toUpperCase()}!`, "#ff5fa2"); s.freeze(0.05); this.stats.hits++; }
        return true;
    }

    stepCrates(dt) {
        const f = this.time, t = this.time;
        const cols = ["#ff5fa2", "#ffc233", "#2ec4a6", "#38b6ff"];
        for (const c of this.crates) {
            if (c.t > 0) {
                c.t -= dt;
                if (c.t <= 0) { c.e.hidden = false; c.e.scale = 0.2; }
                continue;
            }
            const e = c.e;
            e.rot.y = t * 1.7 + c.n; e.rot.x = 0.3;
            e.pos.y = c.y + Math.sin(t * 2.6 + c.n) * 0.22;
            e.scale = Math.min(1.05, e.scale.x + dt * 3);
            e.color = cols[(c.n + Math.floor(f * 3)) % 4];
            for (const k of this.karts) {
                const dx = k.x - c.x, dz = k.z - c.z;
                if (dx * dx + dz * dz > 7.5 || Math.abs(k.y - c.y) > 3.6) continue;
                c.t = 3.2; e.hidden = true;
                this.s.burst({ at: [c.x, c.y, c.z], count: 14, color: ["#fff6e6", "#ffc233", "#ff5fa2", "#38b6ff"], speed: [4, 13], life: [0.2, 0.5], size: [0.16, 0.34], dim: 3, gravity: 1 });
                if (!k.item && k.shield === 0 && this.mode !== "tt") {
                    k.item = this.rollItem(k); k.roll2 = k.player ? 0.85 : 0.5;
                    if (k.ai) k.ai.itemT = 0;
                }
                if (k.player) this.snd.crate();
                break;
            }
        }
    }

    stepProps(dt) {
        const { T, s } = this;
        for (const p of this.props) {
            if (p.flying > 0) {
                p.flying -= dt;
                p.vy -= 34 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
                p.e.pos.set(p.x, p.y, p.z); p.e.rot.x += p.rx * dt; p.e.rot.z += p.ry * dt;
                if (p.flying <= 0) { p.e.hidden = true; p.away = true; }
                continue;
            }
            if (p.away) {
                // Tidied up once the pack has moved on.
                if (this.karts.every((k) => Math.abs(T.wrap(k.i - p.i) - T.n / 2) < T.n * 0.4)) {
                    const q = T.point(p.i, p.d);
                    p.x = q[0]; p.y = q[1]; p.z = q[2]; p.away = false; p.e.hidden = false; p.e.rot.x = 0; p.e.rot.z = 0; p.e.pos.set(p.x, p.y, p.z);
                }
                continue;
            }
            for (const k of this.karts) {
                const dx = k.x - p.x, dz = k.z - p.z;
                if (dx * dx + dz * dz > 7 || Math.abs(k.y - p.y) > 3) continue;
                const l = this.game.fxRng;
                p.flying = 1.4; p.vx = k.vx * 0.8 + l.range(-6, 6); p.vz = k.vz * 0.8 + l.range(-6, 6); p.vy = 12 + l.range(0, 6); p.rx = l.range(-9, 9); p.ry = l.range(-9, 9);
                k.vx *= 0.97; k.vz *= 0.97;
                s.burst({ at: [p.x, p.y + 1, p.z], count: 10, color: ["#d9a066", "#fff6e6", "#ff8a1f"], speed: [3, 10], life: [0.2, 0.45], size: [0.15, 0.32], dim: 3, gravity: 1 });
                if (k.player) { this.snd.smash(); s.shake(0.14, 0.14); }
                break;
            }
        }
    }

    stepHazards(dt) {
        const { T, s } = this;
        for (const h of this.hazards) {
            const a = Math.sin((this.time + h.ph) / h.period * Math.PI * 2), d = a * h.amp;
            const prev = h.d, p = T.point(h.i, d);
            h.d = d; h.x = p[0]; h.y = p[1]; h.z = p[2];
            const e = h.e, vel = (d - prev) / dt;
            e.pos.set(p[0], p[1], p[2]);
            const road = T.yaw(h.i);
            if (h.K.mesh === "hz_pin") { e.rot.y = road + Math.PI / 2; e.rot.x = -d * 1.4 / 0.72 * 0.6; e.pos.y += 0; }
            else if (h.K.face) e.rot.y = road + (vel > 0 ? -Math.PI / 2 : Math.PI / 2);
            else e.rot.y = road;
            for (const k of this.karts) {
                const dx = k.x - p[0], dz = k.z - p[2], R = h.K.r + RADIUS;
                if (dx * dx + dz * dz > R * R || Math.abs(k.y - p[1]) > 3) continue;
                if (hurt(k, h.K.hit) && k.player) {
                    if (h.K.hit === "tumble") this.snd.splat(); else this.snd.slip();
                    s.shake(0.5, 0.35); s.freeze(0.07); s.flash("#ff4b3e55", 0.2);
                }
            }
        }
    }

    stepPads() {
        const { T } = this, pads = this.built.pads;
        for (const k of this.karts) {
            if (!k.grounded || k.spin > 0) continue;
            for (const p of pads) {
                const g = T.wrap(k.i - p.i + 2);
                if (g > 4 || Math.abs(k.d - p.d) > p.w / 2 + 0.8) continue;
                if (k.onPad <= 0) { giveBoost(k, 1.15, 1); k.onPad = 0.5; k.events.push(["pad"]); }
            }
        }
    }

    bumpKarts() {
        const K = this.karts;
        for (let a = 0; a < K.length; a++) for (let b = a + 1; b < K.length; b++) {
            const p = K[a], q = K[b];
            if (p.rescue > 0 || q.rescue > 0) continue;
            const dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz, R = RADIUS * 2;
            if (d2 > R * R || Math.abs(p.y - q.y) > 2.2) continue;
            const d = Math.sqrt(d2) || 0.01, nx = dx / d, nz = dz / d, over = R - d;
            const wa = q.weight / (p.weight + q.weight), wb = 1 - wa;
            p.x -= nx * over * wa; p.z -= nz * over * wa; q.x += nx * over * wb; q.z += nz * over * wb;
            const rel = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
            if (rel < 0) {
                const j = rel * 1.35;
                p.vx += nx * j * wa; p.vz += nz * j * wa; q.vx -= nx * j * wb; q.vz -= nz * j * wb;
                const hitP = p.player || q.player;
                if (hitP && rel < -4 && this.time - (this.bumpT ?? 0) > 0.25) {
                    this.bumpT = this.time; this.snd.bump(); this.s.shake(0.12, 0.12);
                    this.s.burst({ at: [(p.x + q.x) / 2, p.y + 0.8, (p.z + q.z) / 2], count: 8, color: ["#fff6e6", "#ffc233"], speed: [3, 9], life: [0.12, 0.28], size: [0.1, 0.2], dim: 3, gravity: 0.6 });
                }
            }
        }
    }

    stepDraft(dt) {
        for (const k of this.karts) {
            let in_ = false;
            if (k.speed > 22 && k.boost <= 0) for (const o of this.karts) {
                if (o === k) continue;
                const dx = o.x - k.x, dz = o.z - k.z, d2 = dx * dx + dz * dz;
                if (d2 > 260 || d2 < 7) continue;
                const l = Math.sqrt(d2), f = (dx / l) * -Math.sin(k.yaw) + (dz / l) * -Math.cos(k.yaw);
                if (f > 0.97) { in_ = true; break; }
            }
            k.draft = in_ ? Math.min(1.5, k.draft + dt) : Math.max(0, k.draft - dt * 2);
            k.drafting = k.draft > 0.7 ? k.draft - 0.5 : 0;
        }
    }

    // --- Events into feedback ----------------------------------------------------------------------------------
    drain(k) {
        const { s, snd } = this, me = k.player, near = me || this.nearFocus(k);
        for (const ev of k.events) {
            const [name, a, b] = ev;
            if (name === "hop") { if (me) snd.hop(); }
            else if (name === "driftStart") { if (me) { this.stats.drifts++; k.driftT = 0; } }
            else if (name === "tier") {
                if (me) {
                    snd.tier(a); this.stats.tiers[a]++;
                    this.tierFlash = { t: 1, tier: a };
                    s.burst({ at: [k.x, k.y + 0.4, k.z], count: 18 + a * 6, color: SPARK[a], speed: [4, 13], life: [0.2, 0.45], size: [0.12, 0.28], dim: 3, gravity: 0.5 });
                }
            }
            else if (name === "miniturbo") {
                k.flashT = 0.4;
                if (near) s.burst({ at: [k.x, k.y + 0.5, k.z], count: 16 + a * 8, color: SPARK[a], speed: [5, 16], life: [0.2, 0.45], size: [0.14, 0.3], dim: 3, gravity: 0.4 });
                if (me) { snd.miniturbo(a); s.shake(0.1 + a * 0.08, 0.2); this.stats.boosts++; s.flash(SPARK[a][0] + "55", 0.14); this.kick = 1; this.note(["", "BOOST!", "SUPER BOOST!", "ULTRA BOOST!"][a], SPARK[a][0]); s.freeze(0.03 + a * 0.008); }
            }
            else if (name === "pad") { k.flashT = 0.3; if (me) { snd.pad(); this.kick = 1; s.shake(0.14, 0.16); } }
            else if (name === "wall") {
                const pw = clamp(a / 26, 0, 1);
                if (near) s.burst({ at: [k.x + this.T.rx[k.i] * b * RADIUS, k.y + 0.7, k.z + this.T.rz[k.i] * b * RADIUS], count: 6 + Math.floor(pw * 12), color: ["#fff27a", "#ffb347", "#fff6e6"], speed: [4, 14], life: [0.15, 0.35], size: [0.1, 0.2], dim: 3, gravity: 1 });
                if (me) { snd.wall(pw); s.shake(0.1 + pw * 0.3, 0.16); this.stats.wallHits++; }
            }
            else if (name === "land") {
                const pw = clamp(a / 20, 0, 1);
                if (near) s.burst({ at: [k.x, k.y + 0.2, k.z], count: 12, color: ["#fff6e6", this.th.rough], speed: [3, 9], life: [0.2, 0.4], size: [0.2, 0.4], dim: 3, gravity: 0.4 });
                if (me) { snd.land(pw); s.shake(0.15 + pw * 0.3, 0.2); this.stats.airtime += b; this.camDrop = pw; }
            }
            else if (name === "trick") { if (me) { snd.hop(); this.note("TRICK!", "#ff5fa2"); } }
            else if (name === "trickBoost") { k.flashT = 0.3; if (me) { snd.miniturbo(1); this.kick = 1; } }
            else if (name === "hurt") { if (a === "bump" && me) { snd.bump(); s.shake(0.2, 0.2); } }
            else if (name === "fall") { if (me) { snd.fall(); this.note("OOPS!", "#ff4b3e"); } }
            else if (name === "line") this.crossed(k, a);
        }
        k.events.length = 0;
    }
    nearFocus(k) { const f = this.focus, dx = f.x - k.x, dz = f.z - k.z; return dx * dx + dz * dz < 2500; }
    note(text, c) { this.banner = { text, t: 1.1, c }; }

    crossed(k, delta) {
        if (delta <= 0) return;
        const lapNow = k.lap;
        if (lapNow <= (k.maxLap ?? -1)) return;    // re-crossing after reversing over the line doesn't count
        k.maxLap = lapNow;
        if (lapNow > 0 && k.player) {
            const lapTime = this.t - k.lapStart;
            k.lastLap = lapTime; if (!k.bestLap || lapTime < k.bestLap) k.bestLap = lapTime;
            k.lapStart = this.t;
            this.lapDone?.(k, lapTime);
        } else if (lapNow === 0) k.lapStart = this.t;
        if (lapNow >= this.laps && !k.finished) {
            k.finished = true; k.finishT = this.t; this.finishCount++;
            if (k.player) this.playerFinished(k);
            return;
        }
        if (k.player && lapNow > 0) {
            if (lapNow === this.laps - 1) { this.snd.finalLap(); this.banner = { text: "FINAL LAP!", t: 1.8, c: "#ff4b3e" }; this.snd.music(this.def.theme, 1.09); }
            else { this.snd.lap(); this.banner = { text: `LAP ${lapNow + 1}`, t: 1.3, c: "#fff6e6" }; }
        }
    }
    playerFinished(k) {
        this.phase = "finish"; this.finishWait = 3.6;
        this.rank();
        this.snd.finish(k.rank);
        this.snd.music(k.rank <= 3 ? "win" : "lose");
        this.s.flash("#ffffff88", 0.3); this.s.timeScale = 0.55; this.s.wait(0.9, () => { this.s.timeScale = 1; });
        this.banner = { text: this.mode === "tt" ? "FINISH!" : k.rank === 1 ? "YOU WIN!" : `${["", "", "2ND", "3RD", "4TH", "5TH", "6TH"][k.rank]} PLACE`, t: 3.4, c: k.rank <= 3 ? "#ffc233" : "#fff6e6" };
        const c = ["#ffc233", "#ff4b3e", "#38b6ff", "#2ec4a6", "#ff5fa2"];
        for (let i = 0; i < 4; i++) this.s.wait(i * 0.25, () => this.s.burst({ at: [k.x, k.y + 3, k.z], count: 26, color: c, speed: [6, 18], life: [0.5, 1], size: [0.2, 0.4], dim: 3, gravity: 0.8 }));
    }
    checkFinish(dt) {
        if (this.mode === "demo") return;
        const p = this.player;
        if (this.mode === "race" && this.phase === "race" && this.karts.every((k) => k.finished || k === p)) {
            this.lateT = (this.lateT ?? 0) + dt;
            if (this.lateT > 18) { p.finished = true; p.finishT = this.t + 30; this.playerFinished(p); }
        }
        if (this.phase === "finish") {
            this.finishWait -= dt;
            if (this.finishWait <= 0 && !this.results) {
                this.results = this.order.map((k, i) => ({ id: k.id, name: k.racer.name, player: k.player, time: k.finished ? k.finishT : null, rank: i + 1 }));
                this.onDone?.(this);
            }
        }
    }

    // --- Time trial ghost ----------------------------------------------------------------------------------------
    record(dt) {
        if (this.mode !== "tt" || this.phase !== "race") return;
        const k = this.player;
        this.recT += dt;
        if (this.recT < 0.0999) return;
        this.recT -= 0.1;
        const r = (v) => Math.round(v * 20) / 20;
        this.rec.push(r(k.x), r(k.y), r(k.z), Math.round((k.yaw + k.driftVis) * 100) / 100);
    }
    lapDone(k, time) {
        if (this.mode !== "tt") return;
        if (time < this.recBest) { this.recBest = time; this.bestRec = this.rec; }
        this.rec = []; this.recT = 0;
    }
    ghostStep() {
        const g = this.ghostData;
        if (!g || !this.ghostE) return;
        const k = this.player, t = this.t - k.lapStart, f = t * 10, i = Math.floor(f), d = g.path;
        if (this.phase !== "race" || i * 4 + 7 >= d.length) { this.ghostE.hidden = true; return; }
        this.ghostE.hidden = false;
        const a = i * 4, u = f - i, e = this.ghostE;
        e.pos.set(d[a] + (d[a + 4] - d[a]) * u, d[a + 1] + (d[a + 5] - d[a + 1]) * u, d[a + 2] + (d[a + 6] - d[a + 2]) * u);
        e.rot.y = d[a + 3];
    }

    // --- Rendering state -----------------------------------------------------------------------------------------
    pose(k, dt) {
        const e = k.e;
        const tumble = k.tumble > 0 ? k.spinVis : 0;
        e.pos.set(k.x, k.y + k.hop, k.z);
        e.rot.y = k.yaw + k.driftVis + (k.tumble > 0 ? 0 : k.spinVis) + k.trickSpin;
        e.rot.x = k.pitch + tumble * 0.8;
        e.rot.z = k.roll + k.lean * 0.5;
        const sq = k.squash, st = k.hopV > 0 ? 0.08 : 0, boost = k.boost > 0 ? 0.03 : 0;
        e.scale.set(1.12 * (1 + sq * 0.22 - st), 1.12 * (1 - sq * 0.3 + st), 1.12 * (1 + sq * 0.1 + boost * 2));
        k.rider.rot.z = k.lean * 1.3; k.rider.rot.y = -k.steer * 0.3 - k.driftVis * 0.5;
        k.rider.pos.y = RIDER_Y + Math.sin(this.time * 19 + k.top) * 0.02 * Math.min(1, k.speed / 12) * (k.rough ? 4 : 1);
        const roll = k.vf * dt / 0.24;
        k.wheels.forEach((w, i) => { w.rot.x = wrapAngle(w.rot.x - roll); if (i < 2) w.rot.y = -k.steer * 0.5; });
        const on = k.boost > 0, fx = this.game.fxRng;
        for (const f of k.flame) { f.hidden = !on; if (on) { const n = 0.8 + fx.range(0, 0.5) + (k.flashT > 0 ? 0.5 : 0); f.scale.set(0.9, 0.9, n); } }
        if (k.flashT > 0) k.flashT -= dt;
        // Shield
        const n = k.shield;
        k.baguettes.forEach((b, i) => {
            b.hidden = i >= n;
            if (i < n) {
                const a = this.time * 4 + i * 2.09;
                b.pos.set(k.x + Math.cos(a) * 2.1, k.y + 1.1, k.z + Math.sin(a) * 2.1);
                b.rot.y = -a;
            }
        });
    }

    sparks() {
        const { s, T } = this, fx = this.game.fxRng;
        for (const k of this.karts) {
            if (!this.nearFocus(k)) continue;
            const sn = Math.sin(k.yaw + k.driftVis), cs = Math.cos(k.yaw + k.driftVis);
            const bx = k.x + sn * 1.0, bz = k.z + cs * 1.0;
            if (k.driftDir && k.grounded) {
                const col = SPARK[k.tier], side = -k.driftDir;
                const wx = bx + cs * 0.65 * side, wz = bz - sn * 0.65 * side;
                s.burst({ at: [wx, k.y + 0.12, wz], count: 1 + k.tier * 2, color: col, speed: [2, 8 + k.tier * 2], life: [0.12, 0.3], size: [0.06 + k.tier * 0.02, 0.15 + k.tier * 0.04], dim: 3, gravity: 0.7 });
            }
            if (k.rough && k.speed > 8 && fx.next() < 0.6) s.burst({ at: [bx, k.y + 0.2, bz], count: 1, color: [this.th.rough, "#fff6e6"], speed: [2, 5], life: [0.2, 0.4], size: [0.2, 0.42], dim: 3, gravity: 0.3 });
            if (k.ice && k.driftDir && fx.next() < 0.5) s.burst({ at: [bx, k.y + 0.15, bz], count: 1, color: ["#ffffff", "#bfeeff"], speed: [1, 5], life: [0.2, 0.5], size: [0.15, 0.32], dim: 3, gravity: 0.2 });
            if (k.boost > 0 && fx.next() < 0.7) s.burst({ at: [bx, k.y + 0.5, bz], count: 1, color: ["#fff27a", "#ffb347", "#ff6a1f"], speed: [1, 4], life: [0.12, 0.28], size: [0.12, 0.26], dim: 3 });
        }
    }

    playerFeel(dt) {
        const k = this.player, snd = this.snd;
        if (!k) return;
        const frac = clamp(k.speed / k.top, 0, 1.4);
        snd.engine(Math.min(1.2, frac), k.boost > 0 ? 1 : 0, !!k.driftDir, k.rough);
        if (this.phase === "countdown" || k.finished) return;
        if (k.driftDir) snd.driftTick(k.charge, k.tier, dt);
        else if (k.rough && k.speed > 6) { snd.gravel(dt); this.stats.offroad += dt; }
        else if (k.kerb && k.speed > 10) snd.gravel(dt * 0.45);
        else if (k.speed > 3) snd.purr(frac, dt);
        this.kick = Math.max(0, (this.kick ?? 0) - dt * 2.6);
        this.rankPop = Math.max(0, (this.rankPop ?? 0) - dt * 3);
        if (this.tierFlash) { this.tierFlash.t -= dt * 2.4; if (this.tierFlash.t <= 0) this.tierFlash = null; }
        if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
        k.throwPop = Math.max(0, (k.throwPop ?? 0) - dt * 4);
    }

    snapCamera() {
        const k = this.focus;
        this.camYaw = k.yaw; this.camPos = null;
        this.camera(1 / 60, true);
    }
    camera(dt, snap = false) {
        const { s, T } = this, k = this.focus, v = s.view, portrait = v.height > v.width;
        const frac = clamp(k.speed / (k.top || 1), 0, 1.5), boost = k.boost > 0 ? 1 : 0;
        // The camera trails where the kart is going, and swings out when it drifts.
        const velYaw = k.speed > 6 ? Math.atan2(-k.vx, -k.vz) : k.yaw;
        const aim = k.rescue > 0 ? this.camYaw : k.yaw + wrapAngle(velYaw - k.yaw) * 0.55 + k.driftVis * -0.15;
        this.camYaw = snap ? aim : wrapAngle(this.camYaw + wrapAngle(aim - this.camYaw) * Math.min(1, (k.driftDir ? 4.6 : 6.4) * dt));
        const sn = Math.sin(this.camYaw), cs = Math.cos(this.camYaw);
        const kick = this.kick ?? 0;
        const dist = (portrait ? 6.0 : 6.3) + frac * 0.9 + boost * 0.8 + kick * 1.0, h = (portrait ? 3.5 : 2.9) + frac * 0.1;
        const sway = Math.sin(this.time * 2.2) * 0.1 * frac + k.steer * 0.55;
        this.camLat += (sway - this.camLat) * Math.min(1, 5 * dt);
        const x = k.x + sn * dist + cs * this.camLat, z = k.z + cs * dist - sn * this.camLat;
        let y = k.y + h;
        // Keep the camera above the road behind us, and lag the height so landings read.
        const gy = T.py[T.wrap(k.i - Math.round(dist / T.ds))] + 1.6;
        if (y < gy) y = gy;
        this.camY = snap ? y : this.camY + (y - this.camY) * Math.min(1, 9 * dt);
        this.camDrop = Math.max(0, (this.camDrop ?? 0) - dt * 5);
        const look = 6 + frac * 3;
        const tx = k.x - sn * look, tz = k.z - cs * look, ty = k.y + (portrait ? -0.5 : 0.7);
        let px = x, pz = z, py = this.camY - (this.camDrop ?? 0) * 0.45, Tx = tx, Tz = tz, Ty = ty;
        // Grid intro: start in front of the kart and swing round behind it.
        if (this.phase === "countdown") {
            const a = (1 - this.intro), e = a * a * (3 - 2 * a), ang = e * 2.5;
            const c = Math.cos(ang), n = Math.sin(ang), ox = sn * dist, oz = cs * dist;
            px = k.x + (ox * c - oz * n) * (1 + e * 0.1); pz = k.z + (ox * n + oz * c) * (1 + e * 0.1); py = this.camY - e * 1.6;
            Tx = k.x + (tx - k.x) * (1 - e); Tz = k.z + (tz - k.z) * (1 - e); Ty = k.y + 1.2;
        }
        // The finish orbit.
        if (this.phase === "finish" || this.mode === "demo") {
            const a = this.time * 0.35, d = this.mode === "demo" ? 9 : 8;
            const ox = Math.sin(this.camYaw + (this.mode === "demo" ? 0.5 + Math.sin(a) * 0.45 : 2.2 + a)), oz = Math.cos(this.camYaw + (this.mode === "demo" ? 0.5 + Math.sin(a) * 0.45 : 2.2 + a));
            px = k.x + ox * d; pz = k.z + oz * d; py = k.y + (this.mode === "demo" ? 2.5 : 2.8); Tx = k.x - sn * 2; Tz = k.z - cs * 2; Ty = k.y + 1.3;
        }
        s.cam3.pos.set(px, py, pz); s.cam3.target.set(Tx, Ty, Tz);
        if (snap) s.cam3.set([px, py, pz], [Tx, Ty, Tz]);
        const base = portrait ? 60 : 58, want = base + frac * 10 + boost * 9 + kick * 7;
        this.fov = snap ? want : this.fov + (want - this.fov) * Math.min(1, 7 * dt);
        s.cam3.fov = this.fov;
        const rollGoal = clamp(-k.steer * 0.035 - (k.driftDir ? k.driftDir * 0.05 : 0) + k.roll * 0.5, -0.2, 0.2);
        this.roll += (rollGoal - this.roll) * Math.min(1, 6 * dt);
        s.cam3.up.set(Math.sin(this.roll) * cs, Math.cos(this.roll), -Math.sin(this.roll) * sn);
    }
    cull() {
        const cam = this.s.cam3, fx = cam.target.x - cam.pos.x, fz = cam.target.z - cam.pos.z, l = Math.hypot(fx, fz) || 1;
        const far = this.th.fogFar + 30;
        for (const c of this.chunks) {
            const dx = c.x - cam.pos.x, dz = c.z - cam.pos.z, d = Math.hypot(dx, dz);
            const front = (dx * fx + dz * fz) / l;
            c.e.hidden = front < -c.r - 12 || d - c.r > far;
        }
    }
}
