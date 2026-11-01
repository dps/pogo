// The whole game rules, with no rendering: a robot, a room, a clock. Deterministic for a seed and inputs,
// so bots can run hundreds of houses in Node. The view reads the state and drains `events`.
import { BRANCHES, D, DROP_WEAPONS, ENEMIES, FILLER, UPGRADES, W, WAVES, WEAPONS } from "./data.js";
import { DOORS, FURN, ROOMS, footprint } from "./rooms.js";
import { installFoes } from "./foes.js";
import { installHouse } from "./house.js";

export const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const angDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
};

// Spatial hash over the room.
const HC = 1.5, HX = Math.ceil(W * 2 / HC) + 2, HZ = Math.ceil(D * 2 / HC) + 2;

export const P_R = 0.62;       // robot radius

export class Sim {
    constructor({ seed = 1, heat = 0, attract = false } = {}) {
        this.seed = seed >>> 0;
        this.state = this.seed || 1;
        this.heat = heat;
        this.attract = attract;
        this.events = [];
        this.t = 0;
        this.nextId = 1;
        this.head = new Int32Array(HX * HZ).fill(-1);
        this.link = new Int32Array(2048);
        this.scratch = [];
        this.foes = []; this.shots = []; this.lobs = []; this.rings = []; this.motes = []; this.pickups = [];
        this.furn = []; this.hazards = []; this.pending = [];
        this.p = this.makePlayer();
        this.run = { depth: 0, route: [], wave: 0, waveTotal: 0, score: 0, kills: 0, damage: 0, invoice: {}, combo: 0, comboT: 0, bestCombo: 0, time: 0, peak: 0, won: false, killedBy: null, taken: [], bossHp: 0, bossMax: 0 };
        this.choices = null;
        this.exits = null;
        this.cat = { state: "off", x: 0, z: 0, px: 0, pz: 0, yaw: 0, t: 0, pounces: 0, due: -1, y: 0, tx: 0, tz: 0, sx: 0, sz: 0, swipe: 0, seen: false };
        this.recalc();
        this.loadRoom("living");
    }

    // --- Random numbers: mulberry32 -----------------------------------------------------------
    rnd() {
        this.state = (this.state + 0x6d2b79f5) | 0;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.rnd(); }
    pick(list) { return list[Math.floor(this.rnd() * list.length)]; }

    ev(type, o = {}) { o.type = type; this.events.push(o); return o; }

    makePlayer() {
        return {
            x: 0, z: 6, px: 0, pz: 6, vx: 0, vz: 0, yaw: -Math.PI / 2, pyaw: -Math.PI / 2, spin: 0, whirlT: 0, spun: 0,
            hp: 100, maxHp: 100, bag: 40, bagMax: 100, weapon: "lint",
            charging: false, charge: 0, dashT: 0, dashCd: 0, dashPower: 0, inv: 0, hurtT: 0,
            aimX: 0, aimZ: -1, firing: false, cool: 0, coneT: 0, coneOn: null, target: null, targetT: 0,
            ups: {}, reboots: 0, slick: 0, sawCd: 0, sawHit: 0, bump: 0, suck: 0, dryNote: 0, stats: null,
        };
    }

    /** Derive stats from the upgrades taken. */
    recalc() {
        const p = this.p, u = p.ups, oldMax = p.maxHp;
        p.stats = {
            accel: 42 * (u.wheels ? 1.15 : 1), drag: 4.4,
            reach: 1.4 * (u.bar ? 1.4 : 1), saw: 6 * (u.teeth ? 1.7 : 1),
            whirlAt: u.whirl ? 5 : 8, whirlMul: u.whirl ? 3.2 : 1.7,
            chargeTime: u.burner ? 0.36 : 0.65, dashCd: u.twodash ? 0.05 : 0.45,
            heal: 0.5 * (u.hepa ? 2 : 1), suckR: 6.5 * (u.suck ? 1.6 : 1), cost: u.compact ? 0.6 : 1,
            wDmg: u.hardware ? 1.25 : 1, rate: u.overclock ? 1.3 : 1,
        };
        p.maxHp = 100 + (u.hepa ? 30 : 0);
        p.bagMax = 100 + (u.bigbag ? 60 : 0);
        if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    }

    // --- Rooms --------------------------------------------------------------------------------
    loadRoom(name) {
        const room = ROOMS[name], p = this.p, r = this.run;
        this.roomName = name;
        this.room = room;
        r.depth = r.route.length;
        r.route.push(name);
        r.wave = 0;
        r.waveTotal = WAVES[name].length;
        this.foes.length = 0; this.shots.length = 0; this.lobs.length = 0; this.rings.length = 0;
        this.motes.length = 0; this.pickups.length = 0; this.pending.length = 0;
        this.head.fill(-1);
        this.furn = room.furn.map((pl, i) => {
            const k = FURN[pl.kind], fp = footprint(pl);
            return { id: i, kind: pl.kind, def: k, x: pl.x, z: pl.z, rot: pl.rot, w: fp.w, d: fp.d, h: k.h, hp: k.hp, maxHp: k.hp, stage: 0, wob: 0, burn: 0, chip: 0, solid: true };
        });
        this.setupHazards(room);
        p.x = p.px = room.start[0]; p.z = p.pz = room.start[1];
        p.vx = p.vz = 0; p.charging = false; p.dashT = 0; p.whirlT = 0;
        this.cat.state = "off"; this.cat.due = -1;
        this.navDirty = true;
        this.navTime = 0;
        this.updateNav();
        this.phase = "intro";
        this.phaseT = 1.5;
        this.exits = null;
        this.ev("room", { name });
    }

    /** Is this point inside a standing piece of furniture, grown by r? */
    furnAt(x, z, r = 0) {
        for (const f of this.furn) if (f.solid && Math.abs(x - f.x) < f.w / 2 + r && Math.abs(z - f.z) < f.d / 2 + r) return f;
        return null;
    }

    /** Clear line between two floor points. */
    los(x0, z0, x1, z1) {
        for (const f of this.furn) {
            if (!f.solid) continue;
            const hw = f.w / 2, hd = f.d / 2, dx = x1 - x0, dz = z1 - z0;
            let t0 = 0, t1 = 1;
            for (const [o, d, lo, hi] of [[x0, dx, f.x - hw, f.x + hw], [z0, dz, f.z - hd, f.z + hd]]) {
                if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { t0 = 2; break; } continue; }
                let a = (lo - o) / d, b = (hi - o) / d;
                if (a > b) [a, b] = [b, a];
                t0 = Math.max(t0, a); t1 = Math.min(t1, b);
                if (t0 > t1) break;
            }
            if (t0 <= t1) return false;
        }
        return true;
    }

    // --- Spatial hash -------------------------------------------------------------------------
    rebuildHash() {
        const foes = this.foes, head = this.head;
        head.fill(-1);
        if (this.link.length < foes.length) this.link = new Int32Array(foes.length * 2);
        for (let i = 0; i < foes.length; i++) {
            const e = foes[i], c = this.cellOf(e.x, e.z);
            this.link[i] = head[c];
            head[c] = i;
        }
    }
    cellOf(x, z) {
        const cx = clamp(Math.floor((x + W) / HC) + 1, 0, HX - 1), cz = clamp(Math.floor((z + D) / HC) + 1, 0, HZ - 1);
        return cz * HX + cx;
    }
    /** Visit foes near a point. Radius includes everything up to the largest foe's reach. */
    near(x, z, rad, fn) {
        const R = rad + 1.6;
        const x0 = clamp(Math.floor((x - R + W) / HC) + 1, 0, HX - 1), x1 = clamp(Math.floor((x + R + W) / HC) + 1, 0, HX - 1);
        const z0 = clamp(Math.floor((z - R + D) / HC) + 1, 0, HZ - 1), z1 = clamp(Math.floor((z + R + D) / HC) + 1, 0, HZ - 1);
        const foes = this.foes, head = this.head, link = this.link;
        for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
            for (let i = head[cz * HX + cx]; i >= 0; i = link[i]) {
                const e = foes[i];
                if (e && !e.dead) fn(e);
            }
        }
    }

    // --- The step -----------------------------------------------------------------------------
    step(dt, inp) {
        this.t += dt;
        const r = this.run, p = this.p;
        if (this.phase === "upgrade" || this.phase === "dead" || this.phase === "won") { this.tickDeadTime(dt); return; }
        r.time += dt;
        this.rebuildHash();
        this.updateNav(dt);
        this.movePlayer(dt, inp);
        this.updateHazards(dt);
        this.updateFoes(dt);
        this.resolveFoes();
        this.rebuildHash();
        this.saw(dt);
        this.fire(dt, inp);
        this.updateShots(dt);
        this.updateMotes(dt);
        this.updatePickups(dt);
        this.updateFurn(dt);
        this.updateCat(dt);
        this.director(dt);
        this.sweep();
        if (r.comboT > 0) { r.comboT -= dt; if (r.comboT <= 0) r.combo = 0; }
        r.peak = Math.max(r.peak, this.foes.length);
        if (p.hp <= 0 && this.phase !== "dead") this.die();
    }
    tickDeadTime(dt) {
        this.phaseT -= dt;
        this.p.px = this.p.x; this.p.pz = this.p.z; this.p.pyaw = this.p.yaw;
    }
    sweep() {
        const foes = this.foes;
        let n = 0;
        for (let i = 0; i < foes.length; i++) if (!foes[i].dead) foes[n++] = foes[i];
        foes.length = n;
    }

    // --- Player -------------------------------------------------------------------------------
    movePlayer(dt, inp) {
        const p = this.p, st = p.stats;
        p.px = p.x; p.pz = p.z; p.pyaw = p.yaw;
        p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt);
        p.dashCd = Math.max(0, p.dashCd - dt); p.bump = Math.max(0, p.bump - dt);
        p.dryNote = Math.max(0, p.dryNote - dt);
        const locked = this.phase === "transit";

        // Charged dash: hold to suck, let go to launch.
        p.suck = 0;
        if (!locked && inp.dash && p.dashCd <= 0 && p.dashT <= 0) {
            if (!p.charging) { p.charging = true; p.charge = 0; this.ev("charge"); }
            const was = p.charge;
            p.charge = Math.min(1, p.charge + dt / st.chargeTime);
            if (was < 1 && p.charge >= 1) this.ev("charged");
            p.suck = st.suckR * (0.55 + 0.45 * p.charge);
        } else if (p.charging) {
            p.charging = false;
            let dx = inp.mx, dz = inp.mz;
            if (Math.hypot(dx, dz) < 0.2) { dx = Math.cos(p.yaw); dz = Math.sin(p.yaw); }
            const l = Math.hypot(dx, dz) || 1, c = p.charge;
            const sp = 15 + 17 * c;
            p.vx = dx / l * sp; p.vz = dz / l * sp;
            p.dashT = 0.16 + 0.2 * c;
            p.dashPower = c;
            p.inv = Math.max(p.inv, p.dashT + 0.12);
            p.dashCd = st.dashCd + p.dashT;
            this.ev("dash", { c, x: p.x, z: p.z, dx: dx / l, dz: dz / l });
        }

        if (p.dashT > 0) {
            p.dashT -= dt;
            p.suck = 2.4;
            if (p.dashT <= 0) {
                // A dash ends in a free spin: the saw sweeps a full circle.
                const c = p.dashPower;
                p.whirlT = 0.3 + 0.42 * c;
                p.spin = (p.spin >= 0 ? 1 : -1) * (16 + 8 * c);
                this.ev("spinout", { x: p.x, z: p.z, c });
                if (p.ups.twodash) this.blast(p.x, p.z, 3 + c, 28, { friendly: true, kind: "dash" });
            }
        } else {
            const a = st.accel * (p.charging ? 0.42 : 1) * (p.slick > 0 ? 0.42 : 1);
            if (!locked) { p.vx += inp.mx * a * dt; p.vz += inp.mz * a * dt; }
            const drag = p.slick > 0 ? 0.85 : st.drag;
            const k = Math.exp(-drag * dt);
            p.vx *= k; p.vz *= k;
        }
        p.slick = 0;
        p.x += p.vx * dt; p.z += p.vz * dt;
        this.collidePlayer();

        // Aim: stick or mouse if given, otherwise the nearest monster, otherwise where we're rolling.
        p.targetT -= dt;
        if (p.targetT <= 0) { p.target = this.findTarget(); p.targetT = 0.08; }
        let want = null;
        p.firing = false;
        if (inp.aim) {
            want = Math.atan2(inp.az, inp.ax);
            p.firing = !!inp.fire;
        } else if (p.target && !p.target.dead) {
            want = Math.atan2(p.target.z - p.z, p.target.x - p.x);
            p.firing = !!inp.auto;
        } else if (Math.hypot(p.vx, p.vz) > 1) want = Math.atan2(p.vz, p.vx);
        if (want !== null) { p.aimX = Math.cos(want); p.aimZ = Math.sin(want); }

        // The body is a spring on the aim, so it swings past and settles.
        if (p.whirlT > 0) {
            p.whirlT -= dt;
        } else if (want !== null) {
            p.spin += (angDiff(want, p.yaw) * 230 - p.spin * 19) * dt;
        } else {
            p.spin *= Math.exp(-6 * dt);
        }
        p.yaw += p.spin * dt;
        if (p.yaw > TAU * 8 || p.yaw < -TAU * 8) { const w = p.yaw % TAU; p.pyaw += w - p.yaw; p.yaw = w; }

        // Spin bonus: Sawnado throws blades on each full turn.
        if (Math.abs(p.spin) > st.whirlAt) {
            p.spun += Math.abs(p.spin) * dt;
            if (p.spun >= TAU) {
                p.spun -= TAU;
                this.ev("fullspin", { x: p.x, z: p.z });
                if (p.ups.cyclone) for (let i = 0; i < 6; i++) {
                    const a = p.yaw + i / 6 * TAU;
                    this.addShot("blade", p.x, p.z, Math.cos(a) * 13, Math.sin(a) * 13, 12, { pierce: 3, life: 0.7, r: 0.28 });
                }
            }
        } else p.spun = 0;
    }

    findTarget() {
        const p = this.p;
        let best = null, bd = 12 * 12;
        for (const e of this.foes) {
            if (e.dead || e.born > 0 || e.k === "seg") continue;
            const dx = e.x - p.x, dz = e.z - p.z;
            let d = dx * dx + dz * dz;
            if (e.k === "puff") d *= 0.6;
            if (d < bd && this.los(p.x, p.z, e.x, e.z)) { bd = d; best = e; }
        }
        return best;
    }

    collidePlayer() {
        const p = this.p;
        const wall = (nx, nz) => this.bounce(nx, nz, null);
        if (p.x < -W + P_R) { p.x = -W + P_R; if (p.vx < 0) wall(1, 0); }
        if (p.x > W - P_R) { p.x = W - P_R; if (p.vx > 0) wall(-1, 0); }
        if (p.z < -D + P_R) { p.z = -D + P_R; if (p.vz < 0) wall(0, 1); }
        if (p.z > D - P_R) { p.z = D - P_R; if (p.vz > 0) wall(0, -1); }
        for (const f of this.furn) {
            if (!f.solid) continue;
            const hw = f.w / 2, hd = f.d / 2;
            const cx = clamp(p.x, f.x - hw, f.x + hw), cz = clamp(p.z, f.z - hd, f.z + hd);
            let dx = p.x - cx, dz = p.z - cz, l = Math.hypot(dx, dz);
            if (l >= P_R) continue;
            if (l < 1e-5) {
                const ax = hw - Math.abs(p.x - f.x), az = hd - Math.abs(p.z - f.z);
                if (ax < az) { dx = Math.sign(p.x - f.x) || 1; dz = 0; p.x += dx * (ax + P_R); }
                else { dx = 0; dz = Math.sign(p.z - f.z) || 1; p.z += dz * (az + P_R); }
                l = 1;
            } else {
                p.x = cx + dx / l * P_R; p.z = cz + dz / l * P_R;
                dx /= l; dz /= l;
            }
            this.bounce(dx, dz, f);
        }
    }

    /** Hit a surface: reflect, spin from the glancing part, and hurt furniture if we were fast. */
    bounce(nx, nz, f) {
        const p = this.p, vn = p.vx * nx + p.vz * nz;
        if (vn >= 0) return;
        const speed = -vn, restitution = p.dashT > 0 ? 0.85 : 0.62;
        const tx = -nz, tz = nx, vt = p.vx * tx + p.vz * tz;
        p.vx -= (1 + restitution) * vn * nx;
        p.vz -= (1 + restitution) * vn * nz;
        p.spin += clamp(vt * 0.9, -14, 14) * Math.min(1, speed / 6);
        if (speed > 2.6 && p.bump <= 0) {
            p.bump = 0.12;
            const hard = speed > 9;
            this.ev("bump", { x: p.x - nx * P_R, z: p.z - nz * P_R, speed, nx, nz, hard, furn: f?.id ?? -1 });
            if (hard && p.ups.wrecker) this.blast(p.x, p.z, 3.2, 26, { friendly: true, kind: "bump" });
        }
        if (f && speed > 5) this.hitFurn(f, speed * (p.dashT > 0 ? 5 : 1.5), "bump");
    }

    hurt(n, x, z, why, knock = 0) {
        const p = this.p;
        if (p.inv > 0 || this.phase === "dead" || this.phase === "won" || this.attract) return false;
        const dmg = n * (this.dmgScale() + this.heat * 0.15);
        p.hp -= dmg;
        p.inv = 0.75;
        p.hurtT = 0.3;
        const r = this.run;
        r.combo = Math.floor(r.combo / 2);
        if (knock) {
            const dx = p.x - x, dz = p.z - z, l = Math.hypot(dx, dz) || 1;
            p.vx += dx / l * knock; p.vz += dz / l * knock;
        }
        this.ev("hurt", { n: dmg, x: p.x, z: p.z, why });
        if (p.hp <= 0) {
            if (p.ups.second && !p.reboots) {
                p.reboots = 1;
                p.hp = p.maxHp * 0.5;
                p.inv = 2;
                this.blast(p.x, p.z, 5, 60, { friendly: true, kind: "reboot" });
                this.ev("reboot", { x: p.x, z: p.z });
            } else r.killedBy = why;
        }
        return true;
    }
    /** Damage to the robot grows with depth. The living room is gentle. */
    dmgScale() { return [0.6, 1.05, 1.4, 1.55][this.run.depth] ?? 1.55; }
    healthScale() { return (1 + 0.38 * this.run.depth + this.run.wave * 0.06) * (1 + this.heat * 0.3); }

    die() {
        this.phase = "dead";
        this.phaseT = 2;
        this.p.charging = false;
        this.ev("dead", { x: this.p.x, z: this.p.z });
    }

    // --- Chainsaw -----------------------------------------------------------------------------
    saw(dt) {
        const p = this.p, st = p.stats, reach = st.reach;
        p.sawCd -= dt;
        if (p.sawCd > 0) return;
        p.sawCd = 0.05;
        const c = Math.cos(p.yaw), s = Math.sin(p.yaw), x0 = p.x + c * 0.5, z0 = p.z + s * 0.5, len = reach + 0.2;
        const spun = Math.abs(p.spin) > st.whirlAt;
        const dashing = p.dashT > 0;
        let touched = 0;
        this.near(p.x, p.z, len + 1, (e) => {
            if (e.born > 0 || e.sawCd > this.t) return;
            const ex = e.x - x0, ez = e.z - z0, t = clamp(ex * c + ez * s, 0, len);
            const qx = ex - c * t, qz = ez - s * t;
            if (qx * qx + qz * qz > (e.r + 0.26) ** 2) return;
            e.sawCd = this.t + 0.1;
            const mul = (spun ? st.whirlMul : 1) * (dashing ? 2 : 1);
            this.hitFoe(e, st.saw * mul, "saw", c * 3, s * 3);
            touched++;
        });
        if (touched) { p.sawHit = 0.1; this.ev("saw", { x: p.x + c * (0.6 + reach * 0.7), z: p.z + s * (0.6 + reach * 0.7), n: touched, spun }); }
        else p.sawHit = Math.max(0, p.sawHit - 0.05);
        // Chewing furniture.
        const tx = p.x + c * (0.5 + reach), tz = p.z + s * (0.5 + reach), f = this.furnAt(tx, tz, 0.05);
        if (f) {
            f.chip -= 0.05;
            if (f.chip <= 0) {
                f.chip = 0.1;
                this.hitFurn(f, st.saw * 2.4, "saw");
                this.ev("chew", { x: tx, z: tz, junk: f.def.junk, f: f.id });
            }
        }
    }

    // --- Weapons ------------------------------------------------------------------------------
    fire(dt, inp) {
        const p = this.p, st = p.stats;
        p.cool -= dt;
        p.coneOn = null;
        if (!p.firing || p.charging || p.dashT > 0) return;
        let wName = p.weapon, w = WEAPONS[wName];
        const cost = (w.kind === "cone" ? w.cost * dt : w.cost) * st.cost;
        if (w.cost && p.bag < cost) {
            if (p.dryNote <= 0) { this.ev("dry"); p.dryNote = 3; }
            wName = "lint"; w = WEAPONS.lint;
        }
        const yaw = Math.atan2(p.aimZ, p.aimX);
        if (w.kind === "cone") {
            p.coneOn = wName;
            p.bag -= cost;
            p.coneT -= dt;
            if (p.coneT <= 0) { p.coneT = w.tick; this.cone(w, wName, yaw); }
            return;
        }
        if (p.cool > 0) return;
        p.cool = 1 / (w.rate * st.rate);
        if (w.cost) p.bag -= cost;
        const spread = w.spread ?? 0, a = yaw + this.range(-spread, spread);
        const mx = p.x + Math.cos(yaw) * 0.8, mz = p.z + Math.sin(yaw) * 0.8;
        const dmg = w.dmg * st.wDmg;
        if (w.kind === "sock") this.addShot("sock", mx, mz, Math.cos(a) * w.speed, Math.sin(a) * w.speed, dmg, { bounces: w.bounces + (p.ups.ricochet ? 2 : 0), life: w.range / w.speed + 0.8, r: 0.36, blast: w.blast });
        else this.addShot(wName, mx, mz, Math.cos(a) * w.speed, Math.sin(a) * w.speed, dmg, { pierce: w.pierce ?? 0, life: w.range / w.speed, r: 0.2, bounces: p.ups.ricochet ? 1 : 0 });
        this.ev("shoot", { w: wName, x: mx, z: mz, yaw: a });
        p.vx -= Math.cos(a) * (w.kind === "sock" ? 2.4 : 0.25);
        p.vz -= Math.sin(a) * (w.kind === "sock" ? 2.4 : 0.25);
    }

    cone(w, name, yaw) {
        const p = this.p, st = p.stats, cy = Math.cos(yaw), sy = Math.sin(yaw);
        this.near(p.x + cy * w.range / 2, p.z + sy * w.range / 2, w.range / 2 + 1, (e) => {
            if (e.born > 0) return;
            const dx = e.x - p.x, dz = e.z - p.z, l = Math.hypot(dx, dz);
            if (l > w.range + e.r) return;
            const off = Math.abs(angDiff(Math.atan2(dz, dx), yaw));
            if (off > w.arc + e.r / Math.max(l, 0.5) || !this.los(p.x, p.z, e.x, e.z)) return;
            const fall = 1 - 0.5 * (l / w.range);
            this.hitFoe(e, w.dmg * w.tick * st.wDmg * fall, name, cy * w.knock * w.tick * fall * 8, sy * w.knock * w.tick * fall * 8, true);
            if (w.burn) e.burn = Math.max(e.burn, w.burn);
        });
        if (name === "blower") for (const m of this.motes) {
            const dx = m.x - p.x, dz = m.z - p.z, l = Math.hypot(dx, dz);
            if (l < w.range && dx * cy + dz * sy > l * 0.7) { m.vx += cy * 3; m.vz += sy * 3; }
        }
        // First piece of furniture in the stream takes it.
        for (let d = 1.2; d < w.range; d += 0.9) {
            const f = this.furnAt(p.x + cy * d, p.z + sy * d);
            if (f) {
                this.hitFurn(f, name === "dryer" ? 6 : 2, name);
                if (name === "dryer" && f.def.flam) f.burn = Math.max(f.burn, 3);
                break;
            }
        }
        this.ev("cone", { w: name, x: p.x, z: p.z, yaw, range: w.range });
    }

    addShot(k, x, z, vx, vz, dmg, o = {}) {
        const s = { k, x, z, px: x, pz: z, vx, vz, dmg, life: o.life ?? 1, r: o.r ?? 0.2, pierce: o.pierce ?? 0, bounces: o.bounces ?? 0, blast: o.blast ?? 0, y: 0.7, last: 0, spin: 0, dead: false };
        this.shots.push(s);
        return s;
    }

    updateShots(dt) {
        const hot = !!this.p.ups.hotrod;
        for (const s of this.shots) {
            s.px = s.x; s.pz = s.z;
            s.life -= dt;
            s.spin += dt * 18;
            s.x += s.vx * dt; s.z += s.vz * dt;
            if (s.life <= 0) { this.endShot(s); continue; }
            // Walls and furniture.
            let hit = null;
            if (s.x < -W) { s.x = -W; hit = [1, 0]; } else if (s.x > W) { s.x = W; hit = [-1, 0]; }
            if (s.z < -D) { s.z = -D; hit = [0, 1]; } else if (s.z > D) { s.z = D; hit = [0, -1]; }
            const f = hit ? null : this.furnAt(s.x, s.z);
            if (f) {
                const ax = f.w / 2 - Math.abs(s.x - f.x), az = f.d / 2 - Math.abs(s.z - f.z);
                hit = ax < az ? [Math.sign(s.x - f.x) || 1, 0] : [0, Math.sign(s.z - f.z) || 1];
                s.x = s.px; s.z = s.pz;
                this.hitFurn(f, s.dmg * (s.k === "sock" ? 0.5 : 0.4), "shot");
            }
            if (hit) {
                if (s.bounces > 0) {
                    s.bounces--;
                    if (hit[0]) s.vx = Math.abs(s.vx) * hit[0];
                    if (hit[1]) s.vz = Math.abs(s.vz) * hit[1];
                    this.ev("ricochet", { x: s.x, z: s.z, k: s.k });
                } else { this.ev("stick", { x: s.x, z: s.z, k: s.k, f: f?.id ?? -1 }); this.endShot(s); continue; }
            }
            // Monsters.
            let done = false;
            this.near(s.x, s.z, s.r + 0.2, (e) => {
                if (done || e.born > 0 || e.id === s.last) return;
                const dx = e.x - s.x, dz = e.z - s.z, rr = e.r + s.r;
                if (dx * dx + dz * dz > rr * rr) return;
                if (s.k === "sock") { done = true; this.endShot(s); return; }
                const l = Math.hypot(s.vx, s.vz) || 1;
                this.hitFoe(e, s.dmg, s.k, s.vx / l * 1.6, s.vz / l * 1.6);
                if (hot) e.burn = Math.max(e.burn, 1.4);
                s.last = e.id;
                if (s.pierce > 0) s.pierce--;
                else { done = true; this.endShot(s, true); }
            });
        }
        let n = 0;
        for (let i = 0; i < this.shots.length; i++) if (!this.shots[i].dead) this.shots[n++] = this.shots[i];
        this.shots.length = n;
    }
    endShot(s, quiet) {
        if (s.dead) return;
        s.dead = true;
        if (s.blast) this.blast(s.x, s.z, s.blast, s.dmg, { friendly: true, kind: "sock" });
        else if (!quiet) this.ev("fizz", { x: s.x, z: s.z, k: s.k });
    }

    /** An area of damage. friendly: spares the robot. hurts: the robot takes this much in range. */
    blast(x, z, r, dmg, o = {}) {
        this.ev("blast", { x, z, r, kind: o.kind ?? "blast" });
        const list = [];
        this.near(x, z, r + 1, (e) => {
            const dx = e.x - x, dz = e.z - z, l = Math.hypot(dx, dz);
            if (l < r + e.r) list.push([e, dx / (l || 1), dz / (l || 1), 1 - l / (r + e.r + 1)]);
        });
        for (const [e, nx, nz, k] of list) if (!e.dead && e.born <= 0) this.hitFoe(e, dmg * (0.5 + 0.5 * k), o.kind ?? "blast", nx * 9, nz * 9);
        for (const f of this.furn) {
            if (!f.solid) continue;
            const cx = clamp(x, f.x - f.w / 2, f.x + f.w / 2), cz = clamp(z, f.z - f.d / 2, f.z + f.d / 2);
            if (Math.hypot(x - cx, z - cz) < r) this.hitFurn(f, dmg * 0.6, "blast");
        }
        const p = this.p;
        if (o.hurts && Math.hypot(p.x - x, p.z - z) < r + P_R * 0.5) this.hurt(o.hurts, x, z, o.why ?? "blast", 10);
        for (const m of this.motes) {
            const dx = m.x - x, dz = m.z - z, l = Math.hypot(dx, dz);
            if (l < r && l > 0.01) { m.vx += dx / l * 6; m.vz += dz / l * 6; }
        }
    }

    // --- Dust ---------------------------------------------------------------------------------
    addMotes(x, z, n, spread = 2.2) {
        for (let i = 0; i < n; i++) {
            if (this.motes.length >= 320) {
                // Keep the floor readable: fold the newest into an old one.
                const m = this.motes[Math.floor(this.rnd() * this.motes.length)];
                m.val = Math.min(4, m.val + 1);
                continue;
            }
            const a = this.rnd() * TAU, s = this.range(0.5, spread) * 1.6;
            this.motes.push({ x, z, px: x, pz: z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, val: 1, age: 0, seed: this.rnd() });
        }
    }

    updateMotes(dt) {
        const p = this.p, clearing = this.phase === "clear" || this.phase === "exit";
        const pass = 1.25 + (p.ups.bigbag ? 0.4 : 0);
        let picked = 0, healed = 0;
        for (let i = this.motes.length - 1; i >= 0; i--) {
            const m = this.motes[i];
            m.px = m.x; m.pz = m.z;
            m.age += dt;
            const k = Math.exp(-5 * dt);
            m.vx *= k; m.vz *= k;
            const dx = p.x - m.x, dz = p.z - m.z, l = Math.hypot(dx, dz) || 1e-3;
            let reach = pass;
            if (p.suck > reach) reach = p.suck;
            if (clearing) reach = 100;
            if (l < reach && m.age > 0.2) {
                const pull = (clearing ? 28 : 46) * (1.25 - l / (reach + 0.5));
                m.vx += dx / l * pull * dt * 2; m.vz += dz / l * pull * dt * 2;
            }
            m.x = clamp(m.x + m.vx * dt, -W + 0.2, W - 0.2);
            m.z = clamp(m.z + m.vz * dt, -D + 0.2, D - 0.2);
            if (l < 0.8) {
                p.bag = Math.min(p.bagMax, p.bag + m.val * 1.6);
                if (p.suck > 0) { p.hp = Math.min(p.maxHp, p.hp + p.stats.heal * m.val); healed += m.val; }
                picked += m.val;
                this.motes[i] = this.motes[this.motes.length - 1];
                this.motes.pop();
            }
        }
        if (picked) this.ev("gulp", { n: picked, healed, x: p.x, z: p.z });
    }

    updatePickups(dt) {
        const p = this.p;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const k = this.pickups[i];
            k.t += dt;
            if (k.life !== null && (k.life -= dt) <= 0) { this.pickups.splice(i, 1); continue; }
            if (Math.hypot(k.x - p.x, k.z - p.z) < 1.25) {
                this.pickups.splice(i, 1);
                if (k.k === "weapon") {
                    p.weapon = k.w;
                    p.bag = Math.min(p.bagMax, p.bag + 30);
                    this.ev("equip", { w: k.w, x: k.x, z: k.z });
                } else {
                    p.hp = Math.min(p.maxHp, p.hp + 25);
                    this.ev("battery", { x: k.x, z: k.z });
                }
            }
        }
    }
    dropWeapon(x, z, w, gift = false) {
        const p = this.p;
        const held = new Set([p.weapon, ...this.pickups.filter((k) => k.k === "weapon").map((k) => k.w)]);
        const options = DROP_WEAPONS.filter((n) => !held.has(n));
        const name = w && !held.has(w) ? w : options.length ? this.pick(options) : null;
        if (!name) return;
        const spot = this.freeSpot(x, z);
        this.pickups.push({ k: "weapon", w: name, x: spot[0], z: spot[1], t: 0, life: gift ? null : 16 });
        this.ev("drop", { x: spot[0], z: spot[1], w: name });
    }
    freeSpot(x, z) {
        x = clamp(x, -W + 1.4, W - 1.4); z = clamp(z, -D + 1.4, D - 1.4);
        for (let i = 0; i < 24 && this.furnAt(x, z, 0.8); i++) {
            const a = i * 2.4, r = 0.6 + i * 0.35;
            x = clamp(x + Math.cos(a) * r, -W + 1.4, W - 1.4);
            z = clamp(z + Math.sin(a) * r, -D + 1.4, D - 1.4);
        }
        return [x, z];
    }

    // --- Furniture ----------------------------------------------------------------------------
    hitFurn(f, dmg, why) {
        if (!f.solid) return;
        f.hp -= dmg;
        f.wob = Math.min(1, f.wob + dmg / 30);
        if (f.stage === 0 && f.hp < f.maxHp * 0.55) {
            f.stage = 1;
            this.ev("crack", { f: f.id, x: f.x, z: f.z, junk: f.def.junk });
        }
        if (f.hp <= 0) this.smash(f);
    }
    smash(f) {
        const r = this.run, value = f.def.value;
        f.solid = false; f.stage = 2; f.burn = 0;
        r.damage += value;
        r.score += Math.round(value / 8);
        r.invoice[f.def.name] = (r.invoice[f.def.name] ?? 0) + 1;
        this.navDirty = true;
        this.addMotes(f.x, f.z, Math.min(14, 3 + Math.round(f.w * f.d)), 3.4);
        const die = this.rnd();
        if (die < 0.34) this.dropWeapon(f.x, f.z);
        else if (die < 0.56) {
            const s = this.freeSpot(f.x, f.z);
            this.pickups.push({ k: "battery", x: s[0], z: s[1], t: 0, life: 18 });
            this.ev("drop", { x: s[0], z: s[1], w: null });
        }
        this.ev("smash", { f: f.id, x: f.x, z: f.z, value, junk: f.def.junk, kind: f.kind, name: f.def.name });
        if (f.def.pop) this.blast(f.x, f.z, 3, 22, { friendly: true, kind: "pop" });
    }
    updateFurn(dt) {
        for (const f of this.furn) {
            f.wob = Math.max(0, f.wob - dt * 2.4);
            if (f.burn > 0 && f.solid) {
                f.burn -= dt;
                this.hitFurn(f, 22 * dt, "fire");
                if (this.rnd() < dt * 0.8) for (const g of this.furn) {
                    if (g !== f && g.solid && g.def.flam && g.burn <= 0 && Math.abs(g.x - f.x) < (g.w + f.w) / 2 + 1.6 && Math.abs(g.z - f.z) < (g.d + f.d) / 2 + 1.6) g.burn = 3;
                }
            }
        }
    }

    // --- Upgrades -----------------------------------------------------------------------------
    offerUpgrades() {
        const u = this.p.ups, open = [];
        const locked = new Set();
        for (const key of Object.keys(u)) if (UPGRADES[key]?.locks) locked.add(UPGRADES[key].locks);
        for (const [key, up] of Object.entries(UPGRADES)) {
            if (u[key] || locked.has(key)) continue;
            if (up.needs && !u[up.needs]) continue;
            open.push(key);
        }
        const picks = [];
        // One card per branch when possible, so the three cards are a real choice.
        const byBranch = Object.keys(BRANCHES).map((b) => open.filter((k) => UPGRADES[k].branch === b)).filter((l) => l.length);
        while (picks.length < 3 && byBranch.length) {
            const i = Math.floor(this.rnd() * byBranch.length), list = byBranch.splice(i, 1)[0];
            picks.push(this.pick(list));
        }
        while (picks.length < 3) picks.push("battery");
        return picks;
    }
    /** Take card i. */
    choose(i) {
        if (this.phase !== "upgrade") return;
        const key = this.choices[i] ?? this.choices[0];
        const p = this.p;
        if (key === "battery") p.hp = Math.min(p.maxHp, p.hp + 40);
        else { p.ups[key] = true; this.run.taken.push(key); this.recalc(); }
        this.ev("upgrade", { key, card: i, up: UPGRADES[key] ?? FILLER });
        this.choices = null;
        p.hp = Math.min(p.maxHp, p.hp + 3);
        this.afterUpgrade();
    }
    afterUpgrade() {
        const r = this.run;
        if (r.wave >= r.waveTotal) this.openExits();
        else { this.phase = "lull"; this.phaseT = 1.1; }
    }
    openExits() {
        const r = this.run, seen = new Set(r.route), side = ["kitchen", "bathroom", "laundry"].filter((n) => !seen.has(n));
        let options;
        if (r.depth >= 2) options = ["nursery"];
        else {
            options = side.slice();
            while (options.length > 2) options.splice(Math.floor(this.rnd() * options.length), 1);
        }
        this.exits = options.map((name, i) => ({ name, door: options.length === 1 ? i : i, x: DOORS[i].x, z: DOORS[i].z }));
        this.phase = "exit";
        this.phaseT = 0;
        this.p.hp = Math.min(this.p.maxHp, this.p.hp + this.p.maxHp * 0.2);
        this.ev("exits", { exits: this.exits });
    }
    updateExit(dt) {
        const p = this.p;
        for (const e of this.exits) {
            if (Math.abs(p.x - e.x) < 1.7 && p.z < -D + 1.7) {
                this.phase = "transit";
                this.phaseT = 0.55;
                this.nextRoom = e.name;
                this.ev("transit", { name: e.name });
                return;
            }
        }
    }

    // --- Wave director ------------------------------------------------------------------------
    startWave() {
        const r = this.run, plan = WAVES[this.roomName][r.wave];
        // Deeper in the house, later waves come back for a second helping.
        const beats = r.depth >= 1 && r.wave >= 1 && !plan.boss ? [...plan.beats, { ...plan.beats[0], after: 4 }] : plan.beats;
        this.wave = { plan, beats, beat: 0, t: beats[0].after };
        this.phase = "wave";
        this.ev("wave", { name: plan.name, index: r.wave, boss: !!plan.boss, storm: !!plan.storm });
        if (plan.gift) this.dropWeapon(this.p.x + (this.p.x > 0 ? -3 : 3), this.p.z - 2, plan.gift === true ? null : plan.gift, true);
        const cat = this.cat;
        if (plan.cat === "scare") cat.due = 9;
        else if (plan.cat) cat.due = this.range(7, 12);
    }

    director(dt) {
        switch (this.phase) {
            case "intro":
                this.phaseT -= dt;
                if (this.phaseT <= 0) this.startWave();
                break;
            case "lull":
                this.phaseT -= dt;
                if (this.phaseT <= 0) this.startWave();
                break;
            case "wave": this.runWave(dt); break;
            case "clear":
                this.phaseT -= dt;
                if (this.phaseT <= 0) {
                    if (this.run.wonNow) { this.phase = "won"; this.run.won = true; this.phaseT = 3; this.ev("won"); break; }
                    this.choices = this.offerUpgrades();
                    this.phase = "upgrade";
                    this.ev("offer", { choices: this.choices });
                }
                break;
            case "exit": this.updateExit(dt); break;
            case "transit":
                this.phaseT -= dt;
                if (this.phaseT <= 0) this.loadRoom(this.nextRoom);
                break;
        }
    }

    runWave(dt) {
        const w = this.wave, beats = w.beats;
        this.flushPending(dt);
        w.t -= dt;
        const quiet = !this.foes.length && !this.pending.length;
        // A straggler that gets wedged somewhere can't be allowed to hold up the house: it comes to you.
        w.since = (w.since ?? 0) + dt;
        if (this.run.kills !== w.kills) { w.kills = this.run.kills; w.since = 0; }
        if (w.since > 9 && w.beat >= beats.length && this.foes.length <= 8) {
            w.since = 0;
            const p = this.p;
            for (const e of this.foes) {
                if (e.k === "seg" || e.k === "trike" || Math.hypot(e.x - p.x, e.z - p.z) < 5) continue;
                const a = this.rnd() * TAU, spot = this.freeSpot(p.x + Math.cos(a) * 5, p.z + Math.sin(a) * 5);
                e.x = e.px = spot[0]; e.z = e.pz = spot[1]; e.born = 0.4;
                this.ev("spawn", { k: e.k, x: e.x, z: e.z });
            }
        }
        if (w.beat < beats.length) {
            if (quiet && w.t > 0.5) w.t = 0.5;
            if (w.t <= 0) {
                this.fireBeat(beats[w.beat]);
                w.beat++;
                if (w.beat < beats.length) w.t = beats[w.beat].after;
            }
        } else if (quiet) {
            this.run.wave++;
            this.ev("waveclear", { index: this.run.wave });
            this.run.score += 100 * this.run.wave * (this.run.depth + 1);
            if (w.plan.boss) { this.run.wonNow = true; this.phaseT = 4.2; }
            else this.phaseT = 1.4;
            this.phase = "clear";
            if (this.cat.state !== "off" && this.cat.state !== "leave") this.catLeave();
        }
    }

    fireBeat(beat) {
        const depth = this.run.depth, scale = [1, 1.4, 1.75, 1][depth] ?? 1;
        for (const [kind, n0, pattern, doorIdx, extra] of beat.spawn) {
            const n = kind === "bunny" || kind === "puff" ? Math.round(n0 * scale) : kind === "snake" && depth === 2 ? n0 + 1 : n0;
            for (let i = 0; i < n; i++) {
                const where = this.spawnPoint(pattern, doorIdx, i, n);
                this.pending.push({ kind, x: where[0], z: where[1], t: where[2], extra, door: where[3] });
            }
        }
        this.ev("beat", { n: beat.spawn.length });
    }

    spawnPoint(pattern, doorIdx, i, n) {
        const p = this.p;
        if (pattern === "door" || pattern === "doors") {
            const d = DOORS[pattern === "door" ? (doorIdx ?? 0) % 4 : i % 4];
            const lane = (i % 3 - 1) * 0.7;
            return [d.x + d.nx * 0.9 + (d.nz ? lane : 0), d.z + d.nz * 0.9 + (d.nx ? lane : 0), Math.floor(i / 4) * 0.35 + i * 0.03, d];
        }
        if (pattern === "ring") {
            const a = i / n * TAU + this.rnd() * 0.3, r = this.range(7, 9);
            return [...this.freeSpot(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r), i * 0.03, null];
        }
        // edges
        const side = Math.floor(this.rnd() * 4), u = this.rnd();
        const x = side < 2 ? -W + 1 + u * (W * 2 - 2) : side === 2 ? -W + 1 : W - 1;
        const z = side === 0 ? -D + 1 : side === 1 ? D - 1 : -D + 1 + u * (D * 2 - 2);
        return [...this.freeSpot(x, z), i * 0.025, null];
    }

    flushPending(dt) {
        const list = this.pending;
        for (let i = list.length - 1; i >= 0; i--) {
            const s = list[i];
            s.t -= dt;
            if (s.t > 0) continue;
            list[i] = list[list.length - 1];
            list.pop();
            if (this.foes.length < 260) this.spawnFoe(s.kind, s.x, s.z, s.extra);
        }
    }

    result() {
        const r = this.run;
        return { score: r.score, kills: r.kills, damage: r.damage, invoice: r.invoice, won: r.won, rooms: r.route.length, room: this.roomName, wave: r.wave, time: r.time, bestCombo: r.bestCombo, killedBy: r.killedBy, seed: this.seed };
    }
}
installFoes(Sim);
installHouse(Sim);
