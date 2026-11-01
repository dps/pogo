// Monsters: dust bunnies that merge, puffs that pop, snakes that chop in two, golems, the Tiny Tyrant.
import { D, ENEMIES, W, WEAPONS } from "./data.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const P_R = 0.62;
const TIER_R = [0, 0.42, 0.6, 0.82, 1.05];

const methods = {
    spawnFoe(kind, x, z, extra) {
        const def = ENEMIES[kind], hs = kind === "trike" ? 1 + this.heat * 0.3 : this.healthScale();
        const e = {
            id: this.nextId++, k: kind, def, x, z, px: x, pz: z, vx: 0, vz: 0, kx: 0, kz: 0, r: def.r, hp: def.hp * hs, maxHp: def.hp * hs,
            speed: def.speed * (1 + 0.035 * this.run.depth + this.heat * 0.06) * this.range(0.9, 1.1),
            born: 0.55, age: 0, yaw: Math.atan2(this.p.z - z, this.p.x - x), flash: 0, burn: 0, burnT: 0, sawCd: 0, cd: this.range(0.3, 0.8), state: "go", t: 0,
            hop: this.rnd(), tier: 1, units: 1, prev: null, next: null, y: 0, phase: this.rnd() * TAU, seed: this.rnd(), dead: false, last: null, stun: 0,
        };
        this.foes.push(e);
        this.ev("spawn", { k: kind, x, z });
        if (kind === "snake") {
            let prev = e;
            const n = extra ?? 5;
            e.segIdx = 0;
            for (let i = 1; i <= n; i++) {
                const s = this.spawnFoe("seg", x, z);
                s.prev = prev; prev.next = s; s.segIdx = i; s.born = 0.55 + i * 0.07;
                s.color = e.seed;
                prev = s;
            }
            e.color = e.seed;
        }
        if (kind === "trike") {
            this.run.bossMax = e.maxHp; this.run.bossHp = e.hp;
            e.state = "enter"; e.t = 1.4; e.bell = 0; e.born = 0.1;
            this.boss = e;
            this.ev("bossin");
        }
        return e;
    },

    updateFoes(dt) {
        const p = this.p, foes = this.foes, n = foes.length;
        for (let i = 0; i < n; i++) {
            const e = foes[i];
            if (e.dead) continue;
            e.px = e.x; e.pz = e.z;
            e.age += dt;
            if (e.flash > 0) e.flash -= dt;
            if (e.born > 0) { e.born -= dt; continue; }
            if (e.burn > 0) {
                e.burn -= dt; e.burnT -= dt;
                if (e.burnT <= 0) { e.burnT = 0.25; this.hitFoe(e, 7, "burn", 0, 0, true); if (e.dead) continue; }
            }
            const dx = p.x - e.x, dz = p.z - e.z, dist = Math.hypot(dx, dz) || 1e-3;
            e.toP = dist;
            switch (e.k) {
                case "bunny": this.aiBunny(e, dt, dx, dz, dist); break;
                case "puff": this.aiPuff(e, dt, dx, dz, dist); break;
                case "snake": this.aiSnake(e, dt, dx, dz, dist); break;
                case "seg": this.aiSeg(e, dt); break;
                case "golem": this.aiGolem(e, dt, dx, dz, dist); break;
                case "trike": this.aiTrike(e, dt, dx, dz, dist); break;
            }
            // Bites.
            e.cd -= dt;
            const reach = e.r + P_R * 0.9;
            if (dist < reach) {
                const bite = e.def.bite * (e.k === "bunny" ? 1 + 0.45 * (e.tier - 1) : 1) * (e.k === "snake" && e.state === "lunge" ? 1.6 : 1);
                const speed = Math.hypot(p.vx, p.vz);
                if (p.dashT > 0) {
                    if (e.ramT === undefined || this.t > e.ramT) {
                        e.ramT = this.t + 0.25;
                        this.hitFoe(e, 16 + 26 * p.dashPower, "dash", p.vx * 0.5, p.vz * 0.5);
                    }
                } else if (p.ups.bumper && speed > 5.5 && (e.ramT === undefined || this.t > e.ramT)) {
                    e.ramT = this.t + 0.3;
                    this.hitFoe(e, speed * 2.6, "bumper", p.vx * 0.6, p.vz * 0.6);
                    if (!e.dead) p.vx *= 0.8, p.vz *= 0.8;
                } else if (bite > 0 && e.cd <= 0 && !e.dead) {
                    e.cd = 0.8;
                    this.hurt(bite, e.x, e.z, e.def.name, 6);
                }
                // Monsters are solid to the robot.
                if (!e.dead) {
                    const push = (reach - dist) * (e.r > 1 ? 0.6 : 0.18);
                    p.x -= dx / dist * push * (e.r > 1 ? 1 : 0.4);
                    p.z -= dz / dist * push * (e.r > 1 ? 1 : 0.4);
                    e.kx -= dx / dist * 12 * dt; e.kz -= dz / dist * 12 * dt;
                }
            }
        }
    },

    /** Unit vector towards the robot, round the furniture. */
    flow(e, out) {
        const ax = this.navDir(e.x, e.z);
        out.x = ax[0]; out.z = ax[1];
        return out;
    },

    move(e, wantX, wantZ, dt, sharp = 8) {
        const k = 1 - Math.exp(-sharp * dt);
        e.vx += (wantX - e.vx) * k; e.vz += (wantZ - e.vz) * k;
        const kk = Math.exp(-7 * dt);
        e.kx *= kk; e.kz *= kk;
        e.x += (e.vx + e.kx) * dt; e.z += (e.vz + e.kz) * dt;
    },

    aiBunny(e, dt, dx, dz, dist) {
        // Hops: speed comes in bursts, which is what makes a crowd look alive.
        e.hop += dt * (2.2 + e.speed * 0.5);
        const f = e.hop % 1, gait = f < 0.55 ? 1.5 : 0.25;
        e.y = f < 0.55 ? Math.sin(f / 0.55 * Math.PI) * (0.42 + 0.1 * e.tier) : 0;
        e.squash = f >= 0.55 ? Math.sin((f - 0.55) / 0.45 * Math.PI) : 0;
        const d = this.navDir(e.x, e.z), sp = e.speed * gait * (1 - 0.1 * (e.tier - 1));
        let wx = d[0], wz = d[1];
        if (dist < 3) { wx = dx / dist; wz = dz / dist; }
        // Sucked in by a strong enough robot.
        const p = this.p;
        if (p.ups.suck && p.suck > 0 && dist < p.suck * 0.7 && e.tier === 1) { e.kx += dx / dist * 40 * dt; e.kz += dz / dist * 40 * dt; }
        this.move(e, wx * sp, wz * sp, dt);
        if (Math.hypot(e.vx, e.vz) > 0.3) e.yaw = Math.atan2(e.vz, e.vx);
        // Merge: crowded bunnies clump, which keeps counts sane and gives the swarm bigger targets.
        if (e.tier < 4 && e.age > 1.4 && ((e.id + this.tick) & 15) === 0) {
            const crowd = this.foes.length > 170 ? 0.5 : this.foes.length > 60 ? 0.1 : 0.04;
            if (this.rnd() < crowd) {
                let mate = null;
                this.near(e.x, e.z, 1, (o) => {
                    if (mate || o === e || o.k !== "bunny" || o.tier !== e.tier || o.born > 0 || o.age < 1.4) return;
                    const q = (o.x - e.x) ** 2 + (o.z - e.z) ** 2, rr = (e.r + o.r) * 1.05;
                    if (q < rr * rr) mate = o;
                });
                if (mate) this.mergeBunnies(e, mate);
            }
        }
    },
    mergeBunnies(e, o) {
        o.dead = true;
        e.x = (e.x + o.x) / 2; e.z = (e.z + o.z) / 2;
        e.tier++;
        e.units += o.units;
        e.hp = e.hp + o.hp;
        e.maxHp = e.maxHp + o.maxHp;
        e.r = TIER_R[e.tier];
        e.flash = 0.1;
        this.ev("merge", { x: e.x, z: e.z, tier: e.tier });
    },

    aiPuff(e, dt, dx, dz, dist) {
        e.y = 0.35 + Math.sin(e.age * 3 + e.phase) * 0.14;
        if (e.state === "fuse") {
            e.t -= dt;
            this.move(e, 0, 0, dt);
            if (e.t <= 0) this.popPuff(e, true);
            return;
        }
        if (dist < 2.1) { e.state = "fuse"; e.t = 0.95; this.ev("fuse", { x: e.x, z: e.z }); return; }
        const d = this.navDir(e.x, e.z), wob = Math.sin(e.age * 2.4 + e.phase) * 0.5;
        const sp = e.speed * (dist < 6 ? 1.5 : 1);
        this.move(e, (d[0] - d[1] * wob) * sp, (d[1] + d[0] * wob) * sp, dt, 4);
    },
    popPuff(e, live) {
        if (e.dead && !live) return;
        const was = e.dead;
        e.dead = true;
        if (!was) { this.run.kills += 0; }
        const hurts = live ? 13 : 0;
        this.blast(e.x, e.z, live ? 2.7 : 2.3, 26, { friendly: !live, hurts, why: "Static Puff", kind: "puff" });
        if (live) this.addMotes(e.x, e.z, 2);
    },

    aiSnake(e, dt, dx, dz, dist) {
        e.t -= dt;
        if (e.state === "coil") {
            this.move(e, 0, 0, dt, 12);
            e.yaw = e.lockYaw;
            if (e.t <= 0) { e.state = "lunge"; e.t = 0.5; this.ev("lunge", { x: e.x, z: e.z }); }
            return;
        }
        if (e.state === "lunge") {
            const sp = 12.5;
            this.move(e, Math.cos(e.lockYaw) * sp, Math.sin(e.lockYaw) * sp, dt, 20);
            if (e.t <= 0) { e.state = "rest"; e.t = 0.9; }
            return;
        }
        if (e.state === "rest") {
            this.move(e, 0, 0, dt, 6);
            if (e.t <= 0) { e.state = "go"; e.t = 2 + this.rnd(); }
            return;
        }
        const d = this.navDir(e.x, e.z), w = Math.sin(e.age * 6 + e.phase) * 0.75;
        this.move(e, (d[0] - d[1] * w) * e.speed, (d[1] + d[0] * w) * e.speed, dt, 7);
        if (Math.hypot(e.vx, e.vz) > 0.2) e.yaw = Math.atan2(e.vz, e.vx);
        if (e.t <= 0 && dist < 6 && e.age > 1.5 && this.los(e.x, e.z, this.p.x, this.p.z)) {
            e.state = "coil"; e.t = 0.6; e.lockYaw = Math.atan2(dz, dx);
            this.ev("coil", { x: e.x, z: e.z });
        }
    },
    aiSeg(e, dt) {
        const a = e.prev;
        if (!a || a.dead) { e.prev = null; return; }
        const dx = a.x - e.x, dz = a.z - e.z, l = Math.hypot(dx, dz) || 1e-3, want = 0.66;
        if (l > want) { const m = (l - want) / l; e.x += dx * m; e.z += dz * m; }
        e.yaw = Math.atan2(dz, dx);
        e.y = Math.abs(Math.sin(e.age * 8 + e.segIdx)) * 0.04;
    },

    aiGolem(e, dt, dx, dz, dist) {
        e.t -= dt;
        e.stride = (e.stride ?? 0) + dt * Math.hypot(e.vx, e.vz) * 1.6;
        if (e.state === "stomp") {
            this.move(e, 0, 0, dt);
            if (e.t <= 0) {
                e.state = "go"; e.t = 2.4;
                this.blast(e.x, e.z, 3.6, 0, { friendly: false, hurts: 10, why: "Cat Hair Golem", kind: "stomp" });
            }
            return;
        }
        if (e.state === "throw") {
            this.move(e, 0, 0, dt);
            if (e.t <= 0) {
                e.state = "go"; e.t = this.range(3.2, 4.4);
                this.lob(e.x, e.z, this.p.x + this.p.vx * 0.5, this.p.z + this.p.vz * 0.5, "hairball", 1.25, 1.5, 10, "Cat Hair Golem");
            }
            return;
        }
        const d = this.navDir(e.x, e.z);
        this.move(e, d[0] * e.speed, d[1] * e.speed, dt, 3);
        if (Math.hypot(e.vx, e.vz) > 0.1) e.yaw = Math.atan2(e.vz, e.vx);
        if (dist < 3.4 && e.t <= 1.2) { e.state = "stomp"; e.t = 0.85; this.ev("windup", { x: e.x, z: e.z, r: 3.6 }); }
        else if (e.t <= 0 && dist > 3.6) { e.state = "throw"; e.t = 0.6; this.ev("heave", { x: e.x, z: e.z }); }
    },

    /** Something arcs through the air and lands on a marked spot. */
    lob(x0, z0, x1, z1, k, dur, r, dmg, why) {
        const spot = [clamp(x1, -W + 0.6, W - 0.6), clamp(z1, -D + 0.6, D - 0.6)];
        this.lobs.push({ k, x0, z0, x1: spot[0], z1: spot[1], t: 0, dur, r, dmg, why, spin: this.rnd() * TAU });
        this.ev("lob", { k });
    },
    updateLobs(dt) {
        for (let i = this.lobs.length - 1; i >= 0; i--) {
            const l = this.lobs[i];
            l.t += dt;
            if (l.t < l.dur) continue;
            this.lobs.splice(i, 1);
            this.blast(l.x1, l.z1, l.r, 0, { friendly: false, hurts: l.dmg, why: l.why, kind: l.k });
        }
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const w = this.rings[i], p = this.p, was = w.r;
            w.r += w.speed * dt;
            const d = Math.hypot(p.x - w.x, p.z - w.z);
            if (d > was - 0.5 && d < w.r + 0.5) this.hurt(w.dmg, w.x, w.z, w.why, 7);
            if (w.r > w.max) this.rings.splice(i, 1);
        }
    },

    aiTrike(e, dt, dx, dz, dist) {
        this.run.bossHp = e.hp;
        const frac = e.hp / e.maxHp, angry = frac < 0.33 ? 2 : frac < 0.66 ? 1 : 0;
        e.t -= dt;
        e.wheel = (e.wheel ?? 0) + Math.hypot(e.vx, e.vz) * dt * 2;
        e.anger = angry;
        // Thresholds shed bits of trike, so you can see it failing.
        if (e.shed === undefined) e.shed = 0;
        const shed = frac < 0.25 ? 3 : frac < 0.5 ? 2 : frac < 0.75 ? 1 : 0;
        if (shed > e.shed) { e.shed = shed; this.ev("shed", { x: e.x, z: e.z, n: shed }); this.addMotes(e.x, e.z, 12, 3); }
        switch (e.state) {
            case "enter": {
                this.move(e, 0.2 * 8, 7, dt, 3);
                if (e.t <= 0) { e.state = "ride"; e.t = 2; }
                break;
            }
            case "ride": {
                const d = this.navDir(e.x, e.z), sp = e.speed * (1 + angry * 0.25);
                this.move(e, d[0] * sp, d[1] * sp, dt, 3.5);
                e.yaw = this.turn(e.yaw, Math.atan2(e.vz, e.vx), 5 * dt);
                if (e.t <= 0) {
                    const roll = this.rnd();
                    if (angry >= 1 && !e.wailed) { e.wailed = angry === 2 ? 2 : 1; this.startWail(e); }
                    else if (angry === 2 && e.wailed === 1) { e.wailed = 2; this.startWail(e); }
                    else if (roll < 0.55 && dist > 4) { e.state = "bell"; e.t = 1.05 - angry * 0.15; e.lockYaw = Math.atan2(dz, dx); this.ev("bell", { x: e.x, z: e.z, yaw: e.lockYaw }); }
                    else { e.state = "throw"; e.t = 0.5; e.throws = 3 + angry; }
                }
                break;
            }
            case "bell":
                // Telegraph: rings the bell and rocks back, aim still tracking a little.
                this.move(e, 0, 0, dt, 8);
                e.lockYaw = this.turn(e.lockYaw, Math.atan2(dz, dx), 0.9 * dt);
                e.yaw = e.lockYaw;
                if (e.t <= 0) { e.state = "charge"; e.t = 2.2; this.ev("charge2", { x: e.x, z: e.z }); }
                break;
            case "charge": {
                const sp = 14 + angry * 2.5;
                this.move(e, Math.cos(e.lockYaw) * sp, Math.sin(e.lockYaw) * sp, dt, 7);
                const wall = e.x < -W + 1.7 || e.x > W - 1.7 || e.z < -D + 1.7 || e.z > D - 1.7;
                for (const f of this.furn) if (f.solid && Math.abs(e.x - f.x) < f.w / 2 + 1.3 && Math.abs(e.z - f.z) < f.d / 2 + 1.3) this.hitFurn(f, 400, "boss");
                if (wall || e.t <= 0) {
                    e.state = "dazed"; e.t = 2.1 - angry * 0.3; e.vx = e.vz = 0;
                    this.ev("crash", { x: e.x, z: e.z });
                    this.blast(e.x, e.z, 2.8, 0, { friendly: false, hurts: 0, kind: "crash" });
                }
                break;
            }
            case "dazed":
                this.move(e, 0, 0, dt, 5);
                if (e.t <= 0) { e.state = "ride"; e.t = 1.8 - angry * 0.4; }
                break;
            case "throw":
                this.move(e, 0, 0, dt, 6);
                e.yaw = this.turn(e.yaw, Math.atan2(dz, dx), 8 * dt);
                if (e.t <= 0) {
                    const p = this.p, a = this.rnd() * TAU, off = e.throws <= 1 ? 0 : this.range(0.8, 3);
                    this.lob(e.x, e.z, p.x + p.vx * 0.55 + Math.cos(a) * off, p.z + p.vz * 0.55 + Math.sin(a) * off, "block", 1.05, 1.5, 9, "Tiny Tyrant");
                    e.throws--;
                    e.t = 0.42;
                    if (e.throws <= 0) { e.state = "ride"; e.t = 1.6 - angry * 0.3; }
                }
                break;
            case "wail":
                this.move(e, 0, 0, dt, 8);
                e.wailT -= dt;
                if (e.wailT <= 0 && e.wails > 0) {
                    e.wails--;
                    e.wailT = 1.15;
                    this.rings.push({ x: e.x, z: e.z, r: 1.2, speed: 7.5, max: 26, dmg: 9, why: "Tiny Tyrant" });
                    this.ev("wail", { x: e.x, z: e.z });
                }
                if (e.t <= 0) { e.state = "ride"; e.t = 1.2; }
                break;
        }
    },
    startWail(e) {
        e.state = "wail"; e.t = 3 + (e.anger === 2 ? 1 : 0); e.wails = e.anger === 2 ? 3 : 2; e.wailT = 0.7;
        this.ev("tantrum", { x: e.x, z: e.z });
        const n = 6 + e.anger * 4;
        for (let i = 0; i < n; i++) {
            const a = i / n * TAU;
            const s = this.spawnFoe("bunny", clamp(e.x + Math.cos(a) * 2.6, -W + 1, W - 1), clamp(e.z + Math.sin(a) * 2.6, -D + 1, D - 1));
            s.kx = Math.cos(a) * 8; s.kz = Math.sin(a) * 8;
        }
    },
    turn(a, b, by) {
        let d = (b - a) % TAU;
        if (d > Math.PI) d -= TAU;
        if (d < -Math.PI) d += TAU;
        return a + clamp(d, -by, by);
    },

    resolveFoes() {
        this.tick = (this.tick ?? 0) + 1;
        const foes = this.foes, hw = W, hd = D;
        // Push apart, staggered: each foe tests its neighbours every other step.
        for (let i = 0; i < foes.length; i++) {
            const e = foes[i];
            if (e.dead || e.born > 0 || e.k === "seg" || ((i + this.tick) & 1)) continue;
            this.near(e.x, e.z, e.r + 0.7, (o) => {
                if (o === e || o.k === "seg" && o.prev === e) return;
                const dx = e.x - o.x, dz = e.z - o.z, rr = (e.r + o.r) * 0.92, q = dx * dx + dz * dz;
                if (q >= rr * rr || q < 1e-6) return;
                const l = Math.sqrt(q), push = (rr - l) * 0.5, w = o.r / (e.r + o.r);
                e.x += dx / l * push * w * 2; e.z += dz / l * push * w * 2;
                if (o.k !== "seg" && o.k !== "trike" && o.k !== "golem") { o.x -= dx / l * push * (1 - w) * 2; o.z -= dz / l * push * (1 - w) * 2; }
            });
        }
        const blocked = this.navNear;
        for (let i = 0; i < foes.length; i++) {
            const e = foes[i];
            if (e.dead) continue;
            const r = e.r;
            if (e.x < -hw + r) e.x = -hw + r; else if (e.x > hw - r) e.x = hw - r;
            if (e.z < -hd + r) e.z = -hd + r; else if (e.z > hd - r) e.z = hd - r;
            // A monster pushed into a sealed corner would hold up the wave for ever: it scuttles back out.
            if (((e.id + this.tick) & 31) === 0 && e.k !== "seg" && this.unreachable(e.x, e.z)) {
                const spot = this.reachableNear(e.x, e.z);
                if (spot) { e.x = e.px = spot[0]; e.z = e.pz = spot[1]; }
            }
            if (!blocked(e.x, e.z)) continue;
            for (const f of this.furn) {
                if (!f.solid) continue;
                const fw = f.w / 2, fd = f.d / 2;
                const cx = clamp(e.x, f.x - fw, f.x + fw), cz = clamp(e.z, f.z - fd, f.z + fd), dx = e.x - cx, dz = e.z - cz, q = dx * dx + dz * dz;
                if (q >= r * r) continue;
                if (q < 1e-6) {
                    const ax = fw - Math.abs(e.x - f.x), az = fd - Math.abs(e.z - f.z);
                    if (ax < az) e.x = f.x + (Math.sign(e.x - f.x) || 1) * (fw + r);
                    else e.z = f.z + (Math.sign(e.z - f.z) || 1) * (fd + r);
                } else { const l = Math.sqrt(q); e.x = cx + dx / l * r; e.z = cz + dz / l * r; }
            }
        }
        this.updateLobs(1 / 60);
    },

    hitFoe(e, dmg, why, kx, kz, quiet) {
        if (e.dead) return;
        if (e.k === "trike") {
            if (e.state === "dazed") dmg *= 1.8;
            if (e.state === "enter") dmg *= 0.3;
        }
        if (e.k === "golem") {
            if (why === "lint" || why === "nail") dmg *= 0.65;
            if (why === "dryer" || why === "burn") dmg *= 1.7;
        }
        e.hp -= dmg;
        e.flash = 0.09;
        const heavy = e.r > 1 ? 0.15 : 1;
        e.kx += kx * heavy; e.kz += kz * heavy;
        if (!quiet) this.ev("hit", { x: e.x, z: e.z, k: e.k, why, dmg });
        if (e.hp <= 0) this.killFoe(e, why);
    },

    killFoe(e, why) {
        const r = this.run, p = this.p;
        e.dead = true;
        r.kills++;
        r.combo++;
        r.comboT = 2.6;
        r.bestCombo = Math.max(r.bestCombo, r.combo);
        const mult = Math.min(8, 1 + Math.floor(r.combo / 12));
        const base = e.def.score * (e.k === "bunny" ? e.units : 1);
        r.score += base * mult;
        const sawBonus = p.ups.refund && why === "saw" ? 2 : 1;
        const motes = (e.k === "bunny" ? e.tier : e.def.motes) * sawBonus;
        this.addMotes(e.x, e.z, motes);
        this.ev("kill", { k: e.k, x: e.x, z: e.z, tier: e.tier, why, burn: e.burn > 0, score: base * mult, mult, segColor: e.color ?? 0, r: e.r });
        if (e.k === "seg" || e.k === "snake") {
            const n = e.next;
            if (n) {
                n.prev = null;
                if (n.dead !== true) {
                    n.k = "snake"; n.def = ENEMIES.snake; n.r = ENEMIES.snake.r; n.speed = ENEMIES.snake.speed * (1 + 0.035 * r.depth);
                    n.state = "go"; n.t = 1.2; n.age = Math.max(n.age, 2);
                }
            }
            if (e.prev) e.prev.next = null;
        }
        if (e.k === "bunny" && e.tier > 1) {
            const kids = 2, child = e.tier - 1;
            for (let i = 0; i < kids; i++) {
                const a = this.rnd() * TAU, s = this.spawnFoe("bunny", e.x + Math.cos(a) * 0.4, e.z + Math.sin(a) * 0.4);
                s.born = 0.12; s.tier = child; s.units = Math.ceil(e.units / 2); s.r = TIER_R[child]; s.hp = s.maxHp = s.maxHp * child * 0.6;
                s.kx = Math.cos(a) * 9; s.kz = Math.sin(a) * 9; s.age = -1;
            }
        }
        if (e.k === "puff") { e.dead = false; this.popPuff(e, false); e.dead = true; }
        if (e.k === "golem") {
            for (let i = 0; i < 4; i++) {
                const a = i / 4 * TAU + 0.4, s = this.spawnFoe("bunny", e.x + Math.cos(a), e.z + Math.sin(a));
                s.born = 0.2; s.kx = Math.cos(a) * 8; s.kz = Math.sin(a) * 8;
            }
            this.dropAfterGolem(e);
        }
        if (e.k === "trike") {
            this.boss = null; r.bossHp = 0;
            for (const o of this.foes) if (o !== e && !o.dead && o.k !== "trike") { o.dead = true; this.ev("kill", { k: o.k, x: o.x, z: o.z, tier: o.tier, why: "boss", score: 0, mult: 1, r: o.r, segColor: o.color ?? 0 }); }
            this.pending.length = 0;
            this.lobs.length = 0; this.rings.length = 0;
            this.ev("bossdown", { x: e.x, z: e.z, yaw: e.yaw });
        }
        // Static Arc: the kill jumps to two more monsters.
        if (p.ups.arc && why !== "arc" && (this.arcDepth ?? 0) < 1) {
            this.arcDepth = 1;
            const hits = [];
            this.near(e.x, e.z, 4, (o) => { if (hits.length < 2 && o !== e && o.born <= 0 && Math.hypot(o.x - e.x, o.z - e.z) < 4.2) hits.push(o); });
            for (const o of hits) { this.ev("arc", { x0: e.x, z0: e.z, x1: o.x, z1: o.z }); this.hitFoe(o, 14, "arc", 0, 0); }
            this.arcDepth = 0;
        }
        if (e.k !== "bunny" && e.k !== "seg" && this.rnd() < 0.06) this.dropWeapon(e.x, e.z);
        else if (e.k === "bunny" && e.tier >= 3 && this.rnd() < 0.2) this.dropWeapon(e.x, e.z);
    },
    dropAfterGolem(e) { if (this.rnd() < 0.5) this.dropWeapon(e.x, e.z); },

    // --- The Cat ------------------------------------------------------------------------------
    // She cannot be hurt. She hunts whatever she can see. Furniture hides you, so smashing it has a price.
    updateCat(dt) {
        const c = this.cat, p = this.p;
        c.px = c.x; c.pz = c.z;
        if (this.phase !== "wave" && c.state === "off") return;
        c.t -= dt;
        c.swipe -= dt;
        switch (c.state) {
            case "off":
                if (c.due > 0) { c.due -= dt; if (c.due <= 0) { c.scare = this.wave?.plan.cat === "scare"; c.state = "omen"; c.t = 2.6; this.ev("catomen", { scare: c.scare }); } }
                return;
            case "omen":
                if (c.t <= 0) {
                    const left = this.p.x > 0;
                    const d = DOORSIDE[left ? 0 : 1];
                    c.x = c.px = d[0]; c.z = c.pz = d[1]; c.y = 0; c.yaw = left ? 0 : Math.PI;
                    c.state = c.scare ? "scare" : "stalk"; c.t = c.scare ? 6 : 2.6; c.pounces = 0; c.left = c.scare ? 0 : 2 + (this.run.depth >= 2 ? 1 : 0);
                    c.dir = left ? 1 : -1;
                    this.ev("catin", { x: c.x, z: c.z, scare: c.scare });
                }
                break;
            case "scare": {
                c.x += c.dir * 4.4 * dt; c.z = -D + 1.2;
                c.walk = (c.walk ?? 0) + dt * 5;
                c.yaw = c.dir > 0 ? 0 : Math.PI;
                if (Math.abs(c.x) > W + 3 || c.t <= 0) { c.state = "off"; c.due = -1; this.ev("catout"); }
                break;
            }
            case "stalk": {
                const tgt = this.catTarget(c);
                c.tx = tgt.x; c.tz = tgt.z;
                const dx = tgt.x - c.x, dz = tgt.z - c.z, l = Math.hypot(dx, dz) || 1;
                c.yaw = this.turn(c.yaw, Math.atan2(dz, dx), 4 * dt);
                const sp = 3.6;
                c.x += Math.cos(c.yaw) * sp * dt; c.z += Math.sin(c.yaw) * sp * dt;
                c.walk = (c.walk ?? 0) + dt * 5;
                if (l < 2.4 && c.swipe <= 0 && Math.hypot(p.x - c.x, p.z - c.z) < 2.4) {
                    c.swipe = 1.4;
                    this.ev("swipe", { x: c.x, z: c.z });
                    this.hurt(10, c.x, c.z, "The Cat", 16);
                }
                if (c.t <= 0) {
                    if (l < 11) { c.state = "crouch"; c.t = 1.0; c.sx = c.x; c.sz = c.z; this.ev("catcrouch", { x: tgt.x, z: tgt.z }); }
                    else c.t = 0.6;
                }
                break;
            }
            case "crouch": {
                // The mark follows until the last 0.35 seconds, then it is locked: move or be flattened.
                if (c.t > 0.38) {
                    const tgt = this.catTarget(c);
                    c.tx = tgt.x; c.tz = tgt.z;
                }
                c.yaw = this.turn(c.yaw, Math.atan2(c.tz - c.z, c.tx - c.x), 6 * dt);
                if (c.t <= 0) { c.state = "pounce"; c.t = c.dur = 0.46; c.sx = c.x; c.sz = c.z; this.ev("catleap", { x: c.x, z: c.z }); }
                break;
            }
            case "pounce": {
                const k = 1 - Math.max(0, c.t) / c.dur;
                c.x = c.sx + (c.tx - c.sx) * k; c.z = c.sz + (c.tz - c.sz) * k;
                c.y = Math.sin(k * Math.PI) * 3.6;
                if (c.t <= 0) {
                    c.y = 0;
                    c.state = "land"; c.t = 1.2;
                    c.pounces++; c.left--;
                    this.ev("catland", { x: c.x, z: c.z });
                    // Monsters die under her too.
                    const under = [];
                    this.near(c.x, c.z, 2.6, (o) => { if (Math.hypot(o.x - c.x, o.z - c.z) < 2.6 + o.r && o.k !== "trike") under.push(o); });
                    for (const o of under) if (!o.dead) this.hitFoe(o, 200, "cat", 0, 0);
                    for (const f of this.furn) if (f.solid && Math.abs(c.x - f.x) < f.w / 2 + 1.2 && Math.abs(c.z - f.z) < f.d / 2 + 1.2) this.hitFurn(f, 90, "cat");
                    if (Math.hypot(p.x - c.x, p.z - c.z) < 2.3 + P_R * 0.4) this.hurt(24, c.x, c.z, "The Cat", 15);
                }
                break;
            }
            case "land":
                if (c.t <= 0) {
                    if (c.left <= 0) this.catLeave();
                    else { c.state = "stalk"; c.t = 2.2; }
                }
                break;
            case "leave": {
                const dir = Math.sign(c.x) || 1;
                c.yaw = this.turn(c.yaw, dir > 0 ? 0 : Math.PI, 6 * dt);
                c.x += Math.cos(c.yaw) * 7 * dt; c.z += Math.sin(c.yaw) * 7 * dt;
                c.walk = (c.walk ?? 0) + dt * 8;
                if (Math.abs(c.x) > W + 3 || c.t <= 0) { c.state = "off"; c.due = -1; this.ev("catout"); }
                break;
            }
        }
    },
    catLeave() { const c = this.cat; c.state = "leave"; c.t = 4; c.y = 0; this.ev("catleave"); },
    /** What she's watching: the robot if she can see it, otherwise the nearest monster, otherwise the last place she saw it. */
    catTarget(c) {
        const p = this.p;
        if (this.los(c.x, c.z, p.x, p.z)) { c.lastX = p.x; c.lastZ = p.z; return p; }
        let best = null, bd = 1e9;
        for (const e of this.foes) {
            if (e.dead || e.born > 0 || e.k === "trike") continue;
            const d = (e.x - c.x) ** 2 + (e.z - c.z) ** 2;
            if (d < bd) { bd = d; best = e; }
        }
        return best ?? { x: c.lastX ?? 0, z: c.lastZ ?? 0 };
    },
};

const DOORSIDE = [[-W - 3, 2], [W + 3, 2]];

export function installFoes(Sim) { Object.assign(Sim.prototype, methods); }
