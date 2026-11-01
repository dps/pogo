// The match itself: pure, deterministic, no Pogo. The scene feeds it stick and buttons and drains `events`.
// Bots run thousands of these in Node. Humans and AI go through the same kick, butt and slide functions.
import { teamThink, keeperDistribute, pickMate } from "./ai.js";

export const HL = 24, HW = 14.5, GW = 3.9, GH = 3.0, GD = 2.6;      // half length, half width, goal half width, height, depth
export const R_GOAT = 0.85, R_BALL = 0.5, GRAV = 24;
export const RUN = 8.6, RUN_BALL = 7.7, ACCEL = 46, CHARGE_T = 0.75;
export const ST = { RUN: 0, KICK: 1, SLIDE: 2, BUTT: 3, BOWLED: 4, GETUP: 5, DIVE: 6, HOLD: 7, JUMP: 8, CELEB: 9, SAD: 10, WHIFF: 11 };

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };

export function rng32(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Advance a ball-like object one step. Shared with AI prediction, so what the keeper reads is real physics. */
export function ballStep(b, dt, env, useSpin = true) {
    const sp = Math.hypot(b.vx, b.vy, b.vz), air = b.y > R_BALL + 0.02;
    if (air) {
        const drag = 0.0016 * sp;                      // quadratic air drag
        b.vx -= b.vx * drag * dt * 10; b.vy -= b.vy * drag * dt * 10; b.vz -= b.vz * drag * dt * 10;
        b.vy -= GRAV * dt;
        if (useSpin) {                                  // Magnus: spin x velocity
            const k = 0.016;
            b.vx += k * (b.sy * b.vz - b.sz * b.vy) * dt;
            b.vy += k * (b.sz * b.vx - b.sx * b.vz) * dt;
            b.vz += k * (b.sx * b.vy - b.sy * b.vx) * dt;
        }
        b.vx += env.windX * dt; b.vz += env.windZ * dt;
    } else {
        // Rolling: a constant part and a speed part, so it dies believably rather than exponentially.
        const h = Math.hypot(b.vx, b.vz);
        if (h > 0) {
            const dec = (3.4 + 0.3 * h) * env.roll * dt, k = Math.max(0, h - dec) / h;
            b.vx *= k; b.vz *= k;
            if (useSpin && h > 3) { const k2 = 0.006; b.vx += k2 * b.sy * b.vz * dt; b.vz -= k2 * b.sy * b.vx * dt; }
        }
        b.vx += env.windX * 0.12 * dt; b.vz += env.windZ * 0.12 * dt;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y < R_BALL) {
        b.y = R_BALL;
        if (b.vy < -2.2) {
            b.bounced = -b.vy;
            b.vy = -b.vy * env.bounce;
            // Tangential grip: spin bites on the bounce and the ball kicks sideways.
            const grip = 0.14;
            const cx = b.vx + b.sz * R_BALL * 0.0, cz = b.vz;
            b.vx = cx * (1 - grip) - b.sz * R_BALL * grip; b.vz = cz * (1 - grip) + b.sx * R_BALL * grip;
        } else b.vy = 0;
    }
    const decay = Math.exp(-(air ? 0.5 : 2.2) * dt);
    b.sx *= decay; b.sy *= decay; b.sz *= decay;
}

const HUMAN_BLANK = () => ({ mx: 0, mz: 0, a: false, b: false });

export class Match {
    /** o: { teams: [{skill, style, name}, {...}], seed, duration, mode: {mud, wind, farmer, sheep}, humans: [{team}], golden, fast } */
    constructor(o = {}) {
        this.o = o;
        this.rand = rng32(o.seed ?? 1);
        this.mode = { mud: false, wind: false, farmer: false, sheep: false, ...(o.mode ?? {}) };
        this.env = { roll: this.mode.mud ? 2.0 : 1, bounce: this.mode.mud ? 0.3 : 0.62, grip: this.mode.mud ? 0.42 : 1, speed: this.mode.mud ? 0.9 : 1, windX: 0, windZ: 0 };
        this.windAng = this.rand() * TAU; this.windK = 0;
        this.dt = 1 / 60;
        this.time = 0; this.clock = o.duration ?? 120; this.golden = false;
        this.score = [0, 0]; this.events = [];
        this.phase = "kickoff"; this.phaseT = 0; this.kicker = 0;
        this.stats = [mkStats(), mkStats()];
        this.scorers = [];
        this.teams = (o.teams ?? [{ skill: 0.5 }, { skill: 0.5 }]).map((t, i) => ({ ...t, id: i, dir: i === 0 ? 1 : -1, skill: t.skill ?? 0.5, style: t.style ?? "mixed" }));
        this.goats = [];
        for (let t = 0; t < 2; t++) for (let i = 0; i < 5; i++) this.goats.push(mkGoat(this.goats.length, t, i, this.teams[t].dir));
        this.ball = { x: 0, y: R_BALL, z: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0, owner: null, passTo: null, passT: 0, last: null, lastK: null, since: 9, power: 0, hot: 0, lastTeam: -1, rot: [0, 0, 0], curveSum: 0, flightT: 0, bounced: 0, touch: 0 };
        this.humans = (o.humans ?? []).map((h) => ({ team: h.team, goat: null, ...HUMAN_BLANK(), pa: false, pb: false, holdA: 0, after: 0, afterAxis: null, sw: 0, assist: h.assist ?? true }));
        this.critters = [];
        if (this.mode.farmer) this.critters.push(mkCritter("farmer", -HW * 0.2, -HW, this.rand));
        if (this.mode.sheep) for (let i = 0; i < 6; i++) this.critters.push(mkCritter("sheep", (this.rand() - 0.5) * HL * 1.3, (this.rand() - 0.5) * HW * 1.5, this.rand));
        this.resetKickoff(this.rand() < 0.5 && !o.humans?.length ? 1 : 0);
    }

    get teamGoats() { return this.goats; }
    side(t) { return this.goats.slice(t * 5, t * 5 + 5); }
    emit(t, d = {}) { d.t = t; this.events.push(d); }
    isHuman(g) { return this.humans.some((h) => h.goat === g); }

    resetKickoff(team) {
        this.kicker = team; this.phase = "kickoff"; this.phaseT = 0;
        const b = this.ball;
        const taker = this.goats[team * 5 + 4];
        for (const g of this.goats) {
            const a = KICK_SLOTS[g.idx];
            g.x = -a[0] * this.teams[g.team].dir; g.z = a[1]; g.y = 0; g.vx = g.vz = g.vy = 0;
            g.state = ST.RUN; g.t = 0; g.charge = 0; g.charging = false; g.cool = 0; g.noTouch = 0; g.immune = 0; g.buffer = null; g.tumble = 0; g.tumbleV = 0; g.tilt = 0;
            g.ang = this.teams[g.team].dir > 0 ? Math.PI / 2 : -Math.PI / 2; g.cmd.mx = g.cmd.mz = 0;
            g.aiT = g.id * 3 % 10; g.plan = null;
        }
        taker.x = -1.4 * this.teams[team].dir; taker.z = 0;
        Object.assign(b, { x: 0, y: R_BALL, z: 0, vx: 0, vy: 0, vz: 0, sx: 0, sy: 0, sz: 0, owner: taker, passTo: null, power: 0, hot: 0, last: taker, since: 9, flightT: 0 });
        b.lastTeam = team;
        for (const h of this.humans) { h.goat = h.team === team ? taker : this.goats[h.team * 5 + 4]; h.after = 0; h.sw = 0; h.holdA = 0; }
        // Second human on the same side takes a different goat.
        if (this.humans.length === 2 && this.humans[0].team === this.humans[1].team) this.humans[1].goat = this.goats[this.humans[1].team * 5 + 3];
        this.emit("kickoff", { team });
    }

    // ---- Main step --------------------------------------------------------------------------
    step() {
        const dt = this.dt;
        this.time += dt; this.phaseT += dt;
        this.updateWind(dt);
        if (this.phase === "kickoff") {
            const human = this.humans.some((h) => h.team === this.kicker);
            const moved = this.humans.some((h) => h.team === this.kicker && (Math.hypot(h.mx, h.mz) > 0.3 || h.a || h.b));
            if (this.phaseT > (human ? (moved ? 0.12 : 1.5) : this.o.fast ? 0.3 : 0.9)) { this.phase = "play"; this.phaseT = 0; this.emit("whistle", { kind: "start" }); }
            else { this.trapBall(); this.updateCritters(dt); return; }
        }
        if (this.phase === "fulltime") { this.celebrate(dt); this.moveGoats(dt); this.ballPhysics(dt); return; }
        if (this.phase === "goal") {
            this.celebrate(dt); this.moveGoats(dt); this.ballPhysics(dt);
            if (!this.o.scripted && this.phaseT > (this.o.fast ? 0.05 : 5.2)) this.afterGoal();
            return;
        }
        // play
        if (!this.golden) {
            this.clock -= dt;
            if (this.clock <= 0) {
                this.clock = 0;
                const b = this.ball, dangerous = !b.owner && b.since < 1.6 && Math.abs(b.x) > HL * 0.55 && Math.hypot(b.vx, b.vz) > 12;
                if (!dangerous) { if (this.endOfTime()) return; }
            }
        }
        for (const h of this.humans) this.humanStep(h, dt);
        teamThink(this, this.teams[0], dt);
        teamThink(this, this.teams[1], dt);
        this.moveGoats(dt);
        this.updateCritters(dt);
        this.ballPhysics(dt);
        if (this.phase === "play") this.stats[this.ball.lastTeam === 1 ? 1 : 0].poss += dt;
    }

    endOfTime() {
        if (this.o.golden && this.score[0] === this.score[1]) {
            this.golden = true; this.emit("golden"); this.resetKickoff(this.rand() < 0.5 ? 0 : 1); return true;
        }
        this.phase = "fulltime"; this.phaseT = 0; this.emit("whistle", { kind: "end" }); this.emit("fulltime");
        const w = this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1;
        for (const g of this.goats) if (g.state !== ST.BOWLED) { g.state = w < 0 ? ST.RUN : g.team === w ? ST.CELEB : ST.SAD; g.t = 0; g.charge = 0; g.charging = false; }
        if (this.ball.owner) this.release();
        return true;
    }

    afterGoal() {
        if (this.golden) {
            this.phase = "fulltime"; this.phaseT = 0; this.emit("whistle", { kind: "end" }); this.emit("fulltime");
            for (const g of this.goats) if (g.state !== ST.BOWLED) { g.state = g.team === this.lastGoalTeam ? ST.CELEB : ST.SAD; g.t = 0; }
            return;
        }
        this.resetKickoff(this.lastGoalTeam === 0 ? 1 : 0);
    }

    trapBall() {
        const b = this.ball, g = b.owner;
        if (g) { b.x = g.x + this.teams[g.team].dir * 1.4; b.z = g.z; b.y = R_BALL; }
    }

    updateWind(dt) {
        if (!this.mode.wind) return;
        this.windAng += (Math.sin(this.time * 0.13) * 0.14) * dt;
        const gust = 7 + 5.5 * Math.sin(this.time * 0.37 + 1) + 2.5 * Math.sin(this.time * 1.1);
        this.windK = gust;
        this.env.windX = Math.cos(this.windAng) * gust; this.env.windZ = Math.sin(this.windAng) * gust;
    }

    // ---- Human control ----------------------------------------------------------------------
    humanStep(h, dt) {
        const b = this.ball;
        h.sw -= dt;
        const pressA = h.a && !h.pa, pressB = h.b && !h.pb, relA = !h.a && h.pa, relB = !h.b && h.pb;
        h.pa = h.a; h.pb = h.b;
        this.autoSwitch(h);
        const g = h.goat, stick = Math.hypot(h.mx, h.mz) > 0.2;
        g.cmd.mx = h.mx; g.cmd.mz = h.mz; g.cmd.speed = 1;

        // Aftertouch: the stick bends the ball for a moment after the shot.
        if (h.after > 0) {
            h.after -= dt;
            const sp = Math.hypot(b.vx, b.vz);
            if (!b.owner && sp > 8 && stick) {
                const nx = b.vx / sp, nz = b.vz / sp, lat = h.mx * -nz + h.mz * nx, k = 95 * dt * (h.after / 0.55 + 0.4);
                b.sy = clamp(b.sy - lat * k * 1.0, -44, 44);
                b.curveTouched = true;
                const along = h.mx * nx + h.mz * nz;     // pulling back dips it
                b.sx += nz * along * 40 * dt; b.sz -= nx * along * 40 * dt;
            }
        }
        if (b.owner === g) {
            if (h.a) h.holdA += dt;
            if (relA && g.state !== ST.KICK) { this.passByHuman(h, g); h.holdA = 0; }
            if (h.b && !g.charging && g.state === ST.RUN) { g.charging = true; g.charge = 0; this.emit("charge", { g, human: true }); }
            if (relB && g.charging) {
                const aim = this.aimHuman(g, h);
                this.kickShot(g, g.charge, aim, 0, aim.spin);
                h.after = 0.55;
            }
            if (!h.b && g.charging) { g.charging = false; }
        } else {
            h.holdA = 0;
            if (g.state === ST.RUN || g.state === ST.KICK) {
                const hot = this.oneTouchChance(g);
                if (pressA) { if (hot) { g.buffer = { kind: "pass", t: 0.4 }; } else if (g.cool <= 0) this.startSlide(g); }
                if (pressB) { if (hot) { g.buffer = { kind: "shot", t: 0.4 }; } else if (g.cool <= 0) this.startButt(g); }
            }
            if (b.owner && b.owner.role === 0 && b.owner.team === h.team && (pressA || pressB)) b.owner.holdT = 0;
            // Neutral stick on an incoming pass: meet the ball.
            if (!stick && b.passTo === g && !b.owner) { const dx = b.x - g.x, dz = b.z - g.z, l = Math.hypot(dx, dz) || 1; if (l > 1.5) { g.cmd.mx = dx / l * 0.8; g.cmd.mz = dz / l * 0.8; } }
        }
    }

    oneTouchChance(g) {
        const b = this.ball;
        if (b.owner) return false;
        const d = Math.hypot(b.x - g.x, b.z - g.z), sp = Math.hypot(b.vx, b.vz);
        if (b.passTo === g) return d < 12;
        return d < 3.4 + sp * 0.12 && (b.y > 1 || sp > 5) && (b.vx * (g.x - b.x) + b.vz * (g.z - b.z) > -2);
    }

    /** What the context buttons mean right now. Read by the HUD. */
    contextFor(h) {
        const g = h.goat, b = this.ball;
        if (!g) return { a: "PASS", b: "SHOOT" };
        if (b.owner === g) return { a: "PASS", b: "SHOOT", charge: g.charging ? clamp(g.charge, 0, 1) : 0, holdA: clamp(h.holdA / 0.22, 0, 1), own: true };
        if (b.owner && b.owner.team === h.team) return { a: "PASS", b: "SHOOT" };
        if (this.oneTouchChance(g)) return { a: "FLICK", b: b.y > 1.1 ? "HEADER" : "VOLLEY", hot: true, cool: 0 };
        return { a: "SLIDE", b: "BUTT", cool: clamp(g.cool / 1, 0, 1) };
    }

    autoSwitch(h) {
        const b = this.ball, cur = h.goat;
        const free = (g) => !this.humans.some((o) => o !== h && o.goat === g);
        if (b.owner && b.owner.team === h.team) { if (b.owner.role !== 0 && free(b.owner)) { h.goat = b.owner; if (cur !== h.goat) this.emit("switch", { g: h.goat, human: true }); } return; }
        if (b.passTo && b.passTo.team === h.team && b.passTo.role !== 0 && free(b.passTo)) { h.goat = b.passTo; return; }
        if (h.after > 0.1) return;
        if (cur.role === 0 || (cur.state !== ST.RUN && cur.state !== ST.GETUP && cur.state !== ST.BOWLED && cur.state !== ST.WHIFF && cur.state !== ST.KICK)) { if (cur.role !== 0) return; }
        if (h.sw > 0 && cur.role !== 0) return;
        let best = null, bd = 1e9;
        const tx = b.x + b.vx * 0.2, tz = b.z + b.vz * 0.2;
        for (const g of this.side(h.team)) {
            if (g.role === 0 || !free(g)) continue;
            let d = Math.hypot(g.x - tx, g.z - tz);
            if (g.state === ST.BOWLED || g.state === ST.GETUP) d += 8;
            if (g === cur) d -= 3.5;
            if (d < bd) { bd = d; best = g; }
        }
        if (best && best !== cur) { h.goat = best; h.sw = 0.45; this.emit("switch", { g: best, human: true }); }
    }

    passByHuman(h, g) {
        const lob = h.holdA >= 0.22, stick = Math.hypot(h.mx, h.mz) > 0.25;
        const dirx = stick ? h.mx : Math.sin(g.ang), dirz = stick ? h.mz : Math.cos(g.ang);
        const mate = pickMate(this, g, dirx, dirz);
        if (mate) this.kickPassTo(g, mate, { lob });
        else this.kickPassDir(g, dirx, dirz);
    }

    aimHuman(g, h) {
        const dir = this.teams[g.team].dir, goalX = dir * HL;
        const stick = Math.hypot(h.mx, h.mz) > 0.3;
        // Stick pointing back at your own half: a hoof in that direction.
        if (stick && h.mx * dir < -0.45 && (g.x * dir < 8)) return { dirx: h.mx, dirz: h.mz, hoof: true };
        const k = this.side(1 - g.team)[0];
        let zt;
        if (stick && Math.abs(h.mz) > 0.3) zt = Math.sign(h.mz) * GW * 0.78 + h.mz * 0.2;
        else zt = (k.z > g.z * 0.3 ? -1 : 1) * GW * 0.62;
        return { x: goalX, z: zt };
    }

    // ---- Kicks ------------------------------------------------------------------------------
    release() {
        const b = this.ball;
        if (b.owner) { b.owner.charging = false; b.owner = null; }
    }

    launch(g, vx, vy, vz, kind, o = {}) {
        const b = this.ball;
        this.release();
        b.vx = vx; b.vy = vy; b.vz = vz; b.since = 0; b.flightT = 0; b.curveTouched = false;
        b.sx = o.sx ?? 0; b.sy = o.sy ?? 0; b.sz = o.sz ?? 0;
        b.power = o.power ?? 0; b.hot = o.power ? 1.2 : 0; b.passTo = o.passTo ?? null; b.passT = o.passTo ? 3 : 0;
        b.last = g; b.lastTeam = g.team; b.lastK = { g, team: g.team, kind, x: g.x, z: g.z, speed: Math.hypot(vx, vy, vz), t: this.time, first: !!o.first };
        b.touch = 0;
        g.noTouch = o.noTouch ?? 0.3; g.state = g.state === ST.JUMP ? ST.JUMP : ST.KICK; g.t = 0; g.charging = false; g.charge = 0; g.buffer = null;
        const sp = Math.hypot(vx, vy, vz);
        g.ang = Math.atan2(vx, vz);
        this.emit("kick", { g, kind, speed: sp, x: b.x, y: b.y, z: b.z, power: !!o.power, human: this.isHuman(g), first: !!o.first });
    }

    /** Ground pass with enough pace to arrive alive, or a lofted ball that lands on the spot. */
    kickPoint(g, tx, tz, o = {}) {
        const b = this.ball, dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz) || 1;
        const err = (o.err ?? 0) * (this.rand() - 0.5) * 2, c = Math.cos(err), s = Math.sin(err);
        const nx = (dx / d) * c - (dz / d) * s, nz = (dx / d) * s + (dz / d) * c;
        if (o.lob) {
            const vh = clamp(9 + d * 0.5, 11, 22), T = d / vh, vy = GRAV * T / 2 * 0.98;
            this.launch(g, nx * vh, clamp(vy, 4, 15), nz * vh, "lob", { passTo: o.passTo, first: o.first });
        } else {
            const roll = this.env.roll, arrive = 11, dec = (3.4 + 0.3 * 16) * roll;
            const v = clamp(Math.sqrt(arrive * arrive + 2 * dec * d), 13, 31) * (1 + (o.paceErr ?? 0) * (this.rand() - 0.5));
            this.launch(g, nx * v, 0.6, nz * v, "pass", { passTo: o.passTo, first: o.first, sy: o.spin ?? 0 });
        }
        this.stats[g.team].passes++;
    }

    kickPassTo(g, mate, o = {}) {
        const b = this.ball, d = Math.hypot(mate.x - b.x, mate.z - b.z);
        const lead = (o.lob ? 0.95 : 0.34) * (d / 20 + 0.45);
        const sx = o.lob ? 1 + 0.6 : 1;
        let tx = mate.x + mate.vx * lead * sx * 1.5, tz = mate.z + mate.vz * lead * sx * 1.5;
        tx = clamp(tx, -HL + 1, HL - 1); tz = clamp(tz, -HW + 1, HW - 1);
        this.kickPoint(g, tx, tz, { ...o, passTo: mate });
    }

    kickPassDir(g, dx, dz) {
        const l = Math.hypot(dx, dz) || 1, b = this.ball;
        this.kickPoint(g, b.x + dx / l * 12, b.z + dz / l * 12, {});
    }

    /** charge 0..1. aim: {x, z} goal point, or {dirx, dirz, hoof}. */
    kickShot(g, charge, aim, err = 0, spin = 0, first = false) {
        const b = this.ball, power = charge >= 1;
        const spd = power ? 41 : lerp(23, 35, clamp(charge, 0, 1));
        if (aim.hoof) {
            const l = Math.hypot(aim.dirx, aim.dirz) || 1;
            this.launch(g, aim.dirx / l * spd * 0.72, 11, aim.dirz / l * spd * 0.72, "hoof", { first });
            return;
        }
        const dx = aim.x - b.x, dz = aim.z - b.z, d = Math.hypot(dx, dz) || 1;
        // Pressure and awkward angles spoil a shot for everyone.
        const opp = this.nearestOpp(g), press = opp ? clamp(1 - opp.d / 3.5, 0, 1) : 0;
        const away = Math.abs(wrap(Math.atan2(dx, dz) - g.ang)) / Math.PI;
        const scatter = (err + press * 0.07 + away * 0.06 + (first ? 0.03 : 0)) * (this.rand() - 0.5) * 2;
        const a = Math.atan2(dx, dz) + scatter;
        const tt = d / spd;
        const yAim = aim.y ?? (power ? 1.1 : lerp(0.5, 1.5, this.rand() * 0.4 + charge * 0.6));
        const vy = clamp((yAim - b.y) / tt + 0.5 * GRAV * tt * 0.92, 1, 16);
        this.launch(g, Math.sin(a) * spd, vy, Math.cos(a) * spd, power ? "power" : first ? "volley" : "shot", { sy: spin, power, first, noTouch: 0.4 });
        this.stats[g.team].shots++;
        this.emit("shot", { g, power, human: this.isHuman(g) });
    }

    nearestOpp(g) {
        let best = null, bd = 1e9;
        for (const o of this.goats) {
            if (o.team === g.team) continue;
            const d = Math.hypot(o.x - g.x, o.z - g.z);
            if (d < bd) { bd = d; best = o; }
        }
        return best ? { goat: best, d: bd } : null;
    }

    startButt(g) {
        g.state = ST.BUTT; g.t = 0; g.cool = 1.15; g.didHit = false; g.charging = false;
        const m = Math.hypot(g.cmd.mx, g.cmd.mz);
        if (m > 0.3) g.ang = Math.atan2(g.cmd.mx, g.cmd.mz);
        this.emit("buttStart", { g, human: this.isHuman(g) });
    }

    startSlide(g) {
        g.state = ST.SLIDE; g.t = 0; g.cool = 1.1; g.didHit = false; g.charging = false;
        const m = Math.hypot(g.cmd.mx, g.cmd.mz);
        if (m > 0.3) g.ang = Math.atan2(g.cmd.mx, g.cmd.mz);
        g.sv = 15.5 * (this.mode.mud ? 1.15 : 1);
        this.emit("slide", { g, human: this.isHuman(g) });
    }

    bowl(g, dx, dz, force, by, kind = "butt") {
        if (g.immune > 0 || g.state === ST.BOWLED) return false;
        if (g.state === ST.HOLD) return false;
        const b = this.ball, had = b.owner === g, l = Math.hypot(dx, dz) || 1;
        g.state = ST.BOWLED; g.t = 0; g.vx = dx / l * force; g.vz = dz / l * force; g.vy = 5 + force * 0.42; g.tumbleV = (9 + this.rand() * 5) * (this.rand() < 0.5 ? -1 : 1); g.bounces = 0; g.charging = false; g.charge = 0; g.buffer = null; g.bowledBy = by ?? null;
        if (had) {
            this.release();
            b.vx = dx / l * 7 + (this.rand() - 0.5) * 7; b.vz = dz / l * 7 + (this.rand() - 0.5) * 7; b.vy = 6.5; b.since = 0; b.passTo = null;
            b.last = by ?? g; b.lastTeam = (by ?? g).team; g.noTouch = 0.8; if (by) by.noTouch = 0;
        }
        this.emit("bowl", { g, by, kind, force, stole: had, human: this.isHuman(g) || (by && this.isHuman(by)), mine: this.isHuman(g) });
        if (by) this.stats[by.team].butts++;
        return true;
    }

    // ---- Goat movement ----------------------------------------------------------------------
    moveGoats(dt) {
        const env = this.env, b = this.ball;
        for (const g of this.goats) {
            g.t += dt; g.cool = Math.max(0, g.cool - dt); g.noTouch = Math.max(0, g.noTouch - dt); g.immune = Math.max(0, g.immune - dt);
            if (g.buffer) { g.buffer.t -= dt; if (g.buffer.t <= 0) g.buffer = null; }
            const f = [Math.sin(g.ang), Math.cos(g.ang)];
            switch (g.state) {
                case ST.BUTT: {
                    const wind = 0.07, lunge = 0.27;
                    if (g.t < wind) { g.vx *= 0.8; g.vz *= 0.8; }
                    else if (g.t < wind + lunge) {
                        const sp = 17 * (1 - (g.t - wind) / lunge * 0.45);
                        g.vx = f[0] * sp * env.speed; g.vz = f[1] * sp * env.speed;
                        this.buttHits(g, f);
                    } else {
                        if (!g.didHit) { g.state = ST.WHIFF; g.t = 0; this.emit("whiff", { g }); }
                        else { g.state = ST.RUN; g.t = 0; }
                    }
                    break;
                }
                case ST.SLIDE: {
                    g.sv *= Math.exp(-2.3 * dt / (this.mode.mud ? 1.5 : 1));
                    g.vx = f[0] * g.sv; g.vz = f[1] * g.sv;
                    this.slideHits(g, f);
                    if (g.t > 0.62) { g.state = ST.WHIFF; g.t = 0.1; }
                    break;
                }
                case ST.WHIFF: {
                    g.vx *= 0.9; g.vz *= 0.9;
                    if (g.t > 0.5) { g.state = ST.RUN; g.t = 0; }
                    break;
                }
                case ST.BOWLED: {
                    g.vy -= 26 * dt; g.y += g.vy * dt; g.tumble += g.tumbleV * dt;
                    if (g.y <= 0) {
                        g.y = 0;
                        if (g.vy < -5 && g.bounces < 2) { g.vy *= -0.42; g.bounces++; g.vx *= 0.66; g.vz *= 0.66; g.tumbleV *= 0.7; this.emit("thud", { g, x: g.x, z: g.z, v: -g.vy }); }
                        else { g.vy = 0; g.vx *= Math.pow(0.02, dt); g.vz *= Math.pow(0.02, dt); g.tumbleV *= 0.9; }
                    }
                    // A flying goat is a bowling ball.
                    if (Math.hypot(g.vx, g.vz) > 7) for (const o of this.goats) {
                        if (o === g || o.state === ST.BOWLED || o.immune > 0 || o.state === ST.HOLD) continue;
                        if (Math.hypot(o.x - g.x, o.z - g.z) < R_GOAT * 1.9 && g.y < 1.8) { const by = g.bowledBy; if (this.bowl(o, o.x - g.x + g.vx * 0.1, o.z - g.z + g.vz * 0.1, 7.5, by, "strike") && by) this.emit("strike", { g: o, by, human: this.isHuman(by) }); }
                    }
                    if (g.t > 1.15 && g.y <= 0.01) { g.state = ST.GETUP; g.t = 0; g.tumble = 0; g.immune = 1.2; }
                    break;
                }
                case ST.GETUP: {
                    g.vx *= 0.8; g.vz *= 0.8;
                    if (g.t > 0.38) { g.state = ST.RUN; g.t = 0; }
                    break;
                }
                case ST.DIVE: {
                    g.vy -= 26 * dt; g.y = Math.max(0, g.y + g.vy * dt);
                    if (g.y <= 0) { g.vx *= 0.9; g.vz *= 0.9; if (g.vy < 0) g.vy = 0; }
                    if (g.t > 0.85) { g.state = ST.GETUP; g.t = 0; g.y = 0; }
                    break;
                }
                case ST.HOLD: { g.vx *= 0.8; g.vz *= 0.8; break; }
                case ST.JUMP: {
                    g.vy -= 26 * dt; g.y = Math.max(0, g.y + g.vy * dt);
                    if (g.y <= 0 && g.t > 0.1) { g.state = ST.RUN; g.t = 0; g.y = 0; g.vy = 0; }
                    this.steer(g, dt, 0.5);
                    break;
                }
                case ST.CELEB: case ST.SAD: this.steer(g, dt, g.state === ST.SAD ? 0.3 : 1.1); break;
                case ST.KICK: if (g.t > 0.2) { g.state = ST.RUN; g.t = 0; } this.steer(g, dt, 0.85); break;
                default: this.steer(g, dt, 1);
            }
            g.x += g.vx * dt; g.z += g.vz * dt;
            if (g.charging) { g.charge = Math.min(1.25, g.charge + dt / CHARGE_T); if (g.charge >= 1 && !g.fullPing) { g.fullPing = true; this.emit("chargeFull", { g, human: this.isHuman(g) }); } } else { g.fullPing = false; }
        }
        // Goat on goat.
        for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) {
            const a = this.goats[i], c = this.goats[j];
            if (a.y > 1 || c.y > 1) continue;
            const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz, min = R_GOAT * 1.75;
            if (d2 < min * min && d2 > 1e-6) {
                const d = Math.sqrt(d2), p = (min - d) * 0.5, nx = dx / d, nz = dz / d;
                const wa = a.state === ST.BUTT || a.state === ST.SLIDE || a.state === ST.DIVE ? 0.1 : c.state === ST.BUTT ? 1.6 : 1, wc = 2 - wa;
                a.x -= nx * p * wa; a.z -= nz * p * wa; c.x += nx * p * wc; c.z += nz * p * wc;
            }
        }
        for (const c of this.critters) for (const g of this.goats) {
            const dx = g.x - c.x, dz = g.z - c.z, d = Math.hypot(dx, dz), min = c.r + R_GOAT * 0.8;
            if (d < min && d > 1e-4) {
                g.x += dx / d * (min - d); g.z += dz / d * (min - d);
                if (c.kind === "farmer" && g.state === ST.BUTT && c.fall <= 0) { c.fall = 2.4; this.emit("farmerHit", { x: c.x, z: c.z, human: this.isHuman(g) }); g.didHit = true; }
            }
        }
        for (const g of this.goats) {
            const keeper = g.role === 0;
            g.x = clamp(g.x, -HL + (keeper ? 0.3 : 0.5), HL - (keeper ? 0.3 : 0.5));
            g.z = clamp(g.z, -HW + 0.7, HW - 0.7);
        }
    }

    steer(g, dt, k) {
        const env = this.env, m = g.cmd;
        const carry = this.ball.owner === g;
        let top = (carry ? RUN_BALL : RUN) * env.speed * k * (m.speed ?? 1);
        if (g.charging) top *= 0.5;
        const len = Math.min(1, Math.hypot(m.mx, m.mz));
        const tx = m.mx * top, tz = m.mz * top;
        const ax = tx - g.vx, az = tz - g.vz, al = Math.hypot(ax, az) || 1;
        const lim = ACCEL * env.grip * dt, k2 = Math.min(1, lim / al);
        g.vx += ax * k2; g.vz += az * k2;
        if (len > 0.15) {
            const want = Math.atan2(m.mx, m.mz), rate = (carry ? 8.5 : 12) * (this.mode.mud ? 0.65 : 1);
            const d = wrap(want - g.ang);
            g.ang = wrap(g.ang + clamp(d, -rate * dt, rate * dt));
        }
    }

    buttHits(g, f) {
        const hx = g.x + f[0] * 1.25, hz = g.z + f[1] * 1.25, b = this.ball;
        for (const o of this.goats) {
            if (o.team === g.team || o.state === ST.BOWLED || o.state === ST.HOLD) continue;
            if (o.immune > 0) continue;
            const d = Math.hypot(o.x - hx, o.z - hz);
            if (d < R_GOAT + 0.75) {
                g.didHit = true;
                const force = o.role === 0 ? 8 : 13.5;
                if (this.bowl(o, f[0] + (o.x - g.x) * 0.05, f[1] + (o.z - g.z) * 0.05, force, g, "butt")) { g.vx *= 0.3; g.vz *= 0.3; g.state = ST.RUN; g.t = 0; g.cool = 0.5; }
                return;
            }
        }
        if (!b.owner && g.noTouch <= 0 && Math.hypot(b.x - hx, b.z - hz) < 1.15 && b.y < 2.4) {
            g.didHit = true;
            this.launch(g, f[0] * 25, 3.2, f[1] * 25, "butt", { noTouch: 0.4 });
            g.state = ST.BUTT; g.t = 0.2;
        }
    }

    slideHits(g, f) {
        const b = this.ball, reach = 1.5;
        if (b.y < 1.2 && (!b.owner || b.owner.team !== g.team) && !(b.owner && b.owner.state === ST.HOLD)) {
            const fx = g.x + f[0] * 0.8, fz = g.z + f[1] * 0.8;
            if (Math.hypot(b.x - fx, b.z - fz) < reach * 0.8 && g.noTouch <= 0) {
                const victim = b.owner;
                if (victim) { this.release(); victim.noTouch = 0.7; this.trip(victim, g); this.stats[g.team].tackles++; }
                const out = Math.hypot(g.vx, g.vz) * 0.9 + 3;
                this.launch(g, f[0] * out + (this.rand() - 0.5) * 2, 1.2, f[1] * out + (this.rand() - 0.5) * 2, "tackle", { noTouch: 0.32 });
                g.state = ST.SLIDE; g.t = Math.max(g.t, 0.3);
                this.emit("tackle", { g, x: b.x, z: b.z, won: true, human: this.isHuman(g) });
                return;
            }
        }
        if (g.didHit) return;
        for (const o of this.goats) {
            if (o.team === g.team || o.state === ST.BOWLED || o.state === ST.HOLD || o.immune > 0 || o.role === 0) continue;
            if (Math.hypot(o.x - g.x - f[0] * 0.8, o.z - g.z - f[1] * 0.8) < 1.35) { g.didHit = true; this.trip(o, g); break; }
        }
    }

    trip(o, by) {
        if (this.bowl(o, Math.sin(by.ang) * 0.6 + (o.x - by.x) * 0.2, Math.cos(by.ang) * 0.6 + (o.z - by.z) * 0.2, 6, by, "trip")) o.vy = 6;
    }

    // ---- Celebration ------------------------------------------------------------------------
    celebrate(dt) {
        const hero = this.hero;
        for (const g of this.goats) {
            const c = g.cmd; c.speed = 1;
            if (this.phase === "fulltime") {
                if (g.state === ST.CELEB) { c.mx = Math.sin(this.time * 2 + g.id); c.mz = Math.cos(this.time * 1.7 + g.id * 2); c.speed = 0.4; }
                else { c.mx = c.mz = 0; }
                if (g.state === ST.BOWLED || g.state === ST.GETUP) continue;
                continue;
            }
            if (g.state === ST.BOWLED || g.state === ST.GETUP) continue;
            if (g === hero || !hero) {
                if (!this.celebSpot) { c.mx = c.mz = 0; continue; }
                const dx = this.celebSpot[0] - g.x, dz = this.celebSpot[1] - g.z, d = Math.hypot(dx, dz);
                if (d > 1.2) { c.mx = dx / d; c.mz = dz / d; c.speed = 1.05; } else { c.mx = c.mz = 0; g.arrived = true; }
            } else if (g.team === this.lastGoalTeam && g.role !== 0) {
                const dx = hero.x - g.x, dz = hero.z - g.z, d = Math.hypot(dx, dz);
                if (d > 2.6) { c.mx = dx / d; c.mz = dz / d; c.speed = 1; } else { c.mx = c.mz = 0; if (g.state === ST.RUN) { g.state = ST.CELEB; g.t = g.id * 0.13; } }
            } else { c.mx = c.mz = 0; if (g.state === ST.RUN && g.team !== this.lastGoalTeam) { g.state = ST.SAD; g.t = 0; } }
        }
    }

    scoreGoal(team) {
        const b = this.ball, k = b.lastK;
        const own = !!(b.last && b.last.team !== team);
        this.score[team]++; this.lastGoalTeam = team;
        const scorer = k && k.team === team ? k.g : (b.last && b.last.team === team ? b.last : null);
        const hero = scorer ?? this.side(team)[4];
        const dist = k ? Math.hypot(k.x - (team === 0 ? HL : -HL), k.z) : 0;
        const rating = rateGoal(k, dist, b, own);
        this.scorers.push({ team, id: hero.idx, min: Math.round((this.o.duration ?? 120) - this.clock), own, rating });
        this.hero = hero; this.phase = "goal"; this.phaseT = 0;
        const sideZ = Math.abs(hero.z) < 4 ? (this.rand() < 0.5 ? -1 : 1) : Math.sign(hero.z);
        this.celebSpot = [team === 0 ? HL * 0.74 : -HL * 0.74, sideZ * (HW - 2.4)];
        for (const g of this.goats) { g.charging = false; g.buffer = null; if (g.team === team && g.state !== ST.BOWLED) { g.state = ST.RUN; g.t = 0; } }
        hero.state = ST.CELEB; hero.t = 0; hero.arrived = false; this.celebKind = Math.floor(this.rand() * 3);
        this.emit("whistle", { kind: "goal" });
        this.emit("goal", { team, g: hero, own, rating, dist, human: this.humans.some((h) => h.team === team), x: b.x, y: b.y, z: b.z, speed: Math.hypot(b.vx, b.vy, b.vz) });
    }

    // ---- Ball -------------------------------------------------------------------------------
    ballPhysics(dt) {
        const b = this.ball;
        b.since += dt; b.flightT += dt; b.hot = Math.max(0, b.hot - dt); b.passT -= dt;
        if (b.passT <= 0) b.passTo = null;
        if (b.hot <= 0) b.power = 0;
        if (b.owner) { this.dribble(b.owner, dt); this.spinFromRoll(dt); return; }
        const prevX = b.x, prevZ = b.z;
        const preVx = b.vx, preVz = b.vz;
        ballStep(b, dt, this.env);
        b.curveSum = (b.curveSum ?? 0) * (b.since < dt * 2 ? 0 : 1) + Math.abs(preVx * b.vz - preVz * b.vx) / (Math.hypot(preVx, preVz) ** 2 + 4);
        if (b.bounced) {
            if (b.bounced > 3.5) this.emit("bounce", { x: b.x, z: b.z, v: b.bounced });
            b.bounced = 0;
        }
        this.spinFromRoll(dt);
        this.walls(prevX, prevZ);
        if (this.phase === "play") this.goalCheck(prevX);
        if (this.phase === "play") this.contacts(dt);
        else this.netCatch();
        for (const c of this.critters) {
            const dx = b.x - c.x, dz = b.z - c.z, d = Math.hypot(dx, dz), min = c.r + R_BALL;
            if (d < min && d > 1e-4 && b.y < c.h) {
                const nx = dx / d, nz = dz / d, vn = b.vx * nx + b.vz * nz;
                b.x = c.x + nx * min; b.z = c.z + nz * min;
                if (vn < 0) {
                    b.vx -= 1.75 * vn * nx; b.vz -= 1.75 * vn * nz; b.vy += 1.5; b.passTo = null;
                    this.emit("critterHit", { kind: c.kind, x: c.x, z: c.z, v: -vn });
                    if (c.kind === "farmer" && -vn > 15 && c.fall <= 0) c.fall = 2.0;
                    if (c.kind === "sheep") c.scared = 1.5;
                }
            }
        }
    }

    spinFromRoll(dt) {
        const b = this.ball, r = b.rot;
        // Visual roll. When airborne it shows the kick spin; on the ground it rolls with travel.
        if (b.y <= R_BALL + 0.03) { r[0] += b.vz / R_BALL * dt; r[2] -= b.vx / R_BALL * dt; }
        else { r[0] += (b.sx * 0.8 + b.vz * 0.6) * dt; r[1] += b.sy * dt; r[2] += (b.sz * 0.8 - b.vx * 0.6) * dt; }
        for (let i = 0; i < 3; i++) if (Math.abs(r[i]) > 40) r[i] = wrap(r[i]);
    }

    dribble(g, dt) {
        const b = this.ball;
        if (g.state === ST.HOLD) {
            b.x = g.x + Math.sin(g.ang) * 0.9; b.z = g.z + Math.cos(g.ang) * 0.9; b.y = 1.0; b.vx = g.vx; b.vz = g.vz; b.vy = 0; return;
        }
        const sp = Math.hypot(g.vx, g.vz);
        g.dribT = (g.dribT ?? 0) + dt * (2 + sp * 0.55);
        const pulse = Math.sin(g.dribT * 2.0) * Math.min(1, sp / 6);
        if (pulse > 0.96 && (g.lastTouch ?? 0) + 0.25 < this.time) { g.lastTouch = this.time; this.emit("dribble", { g, human: this.isHuman(g) }); }
        const off = R_GOAT + 0.5 + 0.28 * pulse;
        const tx = g.x + Math.sin(g.ang) * off, tz = g.z + Math.cos(g.ang) * off;
        const k = Math.min(1, 22 * dt);
        const nx = b.x + (tx - b.x) * k + g.vx * dt, nz = b.z + (tz - b.z) * k + g.vz * dt;
        b.vx = (nx - b.x) / dt; b.vz = (nz - b.z) / dt; b.x = nx; b.z = nz;
        b.y = Math.max(R_BALL, b.y - 8 * dt); b.vy = 0;
        b.x = clamp(b.x, -HL + R_BALL, HL - R_BALL); b.z = clamp(b.z, -HW + R_BALL, HW - R_BALL);
        // Losing it: a run into a wall knocks it loose rather than sticking there forever.
        if (g.state === ST.BOWLED || g.state === ST.DIVE) this.release();
    }

    walls(prevX) {
        const b = this.ball, e = 0.72;
        const hitZ = HW - R_BALL;
        if (Math.abs(b.z) > hitZ && Math.abs(b.x) < HL + GD) {
            if (Math.abs(b.x) <= HL + R_BALL || Math.abs(b.z) > GW) {
                b.z = Math.sign(b.z) * hitZ; if (Math.abs(b.vz) > 1) this.emit("wall", { x: b.x, z: b.z, v: Math.abs(b.vz) });
                b.vz *= -e; b.vx *= 0.92; b.sy *= -0.4; b.passTo = null;
            }
        }
        const lim = HL - R_BALL;
        if (Math.abs(b.x) > lim) {
            const inMouth = Math.abs(b.z) < GW - R_BALL * 0.5 && b.y < GH - R_BALL * 0.5;
            if (!inMouth && Math.abs(prevX) <= lim + 0.02) {
                // End wall, posts and crossbar.
                const postZ = Math.abs(Math.abs(b.z) - GW), barY = Math.abs(b.y - GH);
                if (Math.abs(b.z) < GW + 0.5 && b.y < GH + 0.5 && (postZ < 0.6 || barY < 0.6)) {
                    this.emit("post", { x: b.x, y: b.y, z: b.z, v: Math.abs(b.vx), team: b.lastTeam, bar: barY < postZ });
                    b.x = Math.sign(b.x) * lim; b.vx *= -0.78; b.vz += (Math.abs(b.z) > GW ? Math.sign(b.z) : -Math.sign(b.z)) * 2.5; if (barY < postZ) b.vy = -Math.abs(b.vy) - 3;
                    b.passTo = null; b.power = 0;
                } else {
                    b.x = Math.sign(b.x) * lim; if (Math.abs(b.vx) > 1) this.emit("wall", { x: b.x, z: b.z, v: Math.abs(b.vx), end: true, near: Math.abs(b.z) < 8 });
                    b.vx *= -e; b.passTo = null;
                }
            }
        }
        if (b.y > 11) { b.y = 11; b.vy = -Math.abs(b.vy) * 0.5; }
    }

    goalCheck(prevX) {
        const b = this.ball;
        if (Math.abs(b.x) > HL + R_BALL) {
            if (Math.abs(b.z) < GW && b.y < GH) this.scoreGoal(b.x > 0 ? 0 : 1);
            else { b.x = Math.sign(b.x) * (HL - R_BALL); b.vx *= -0.6; b.vz *= 0.8; b.passTo = null; }
        }
    }

    netCatch() {
        const b = this.ball;
        if (Math.abs(b.x) > HL + 0.2) {
            const lim = HL + GD - R_BALL;
            if (Math.abs(b.x) > lim) { b.x = Math.sign(b.x) * lim; b.vx *= -0.12; b.vz *= 0.4; b.vy *= 0.5; if (!b.netted) { b.netted = true; this.emit("net", { x: b.x, y: b.y, z: b.z }); } }
            b.vx *= 0.97; b.vz *= 0.9; b.vy *= 0.97;
            if (Math.abs(b.z) > GW - R_BALL) { b.z = Math.sign(b.z) * (GW - R_BALL); b.vz *= -0.2; }
            if (b.y > GH - R_BALL) { b.y = GH - R_BALL; b.vy *= -0.2; }
        } else b.netted = false;
    }

    contacts(dt) {
        const b = this.ball;
        if (b.y > 4) return;
        const speed = Math.hypot(b.vx, b.vy, b.vz);
        // Keepers first: they have hands.
        for (const t of [0, 1]) if (this.keeperContact(this.goats[t * 5], speed)) return;
        let best = null, bd = 1e9;
        for (const g of this.goats) {
            if (g.role === 0) continue;
            const d = Math.hypot(g.x - b.x, g.z - b.z);
            if (d < bd && d < 3.4) { bd = d; best = g; }
        }
        if (!best) return;
        const g = best;
        if (g.state === ST.BOWLED || g.state === ST.SLIDE || g.state === ST.BUTT || g.state === ST.GETUP) { if (bd < R_GOAT + R_BALL && b.y < 1.6) this.deflect(g, bd, speed); return; }
        if (g.noTouch > 0) return;
        const reachLow = R_GOAT + R_BALL + 0.42;
        if (g.buffer) {
            const inv = this.ballRelative(g);
            const reach = b.y > 1.1 ? 2.3 : 2.1;
            if (bd < reach && b.y < 3.4) {
                const kind = g.buffer.kind;
                if (b.y > 1.1) { g.state = ST.JUMP; g.t = 0; g.vy = clamp((b.y - 1.5) * 8, 4, 9); g.y = 0.02; }
                this.firstTime(g, kind, inv);
                return;
            }
        }
        if (bd < reachLow && b.y < 1.5) {
            // Ball pace decides control. Hard shots rebound; soft ones stick.
            const sense = g.team === b.lastTeam ? 30 : 23, vrx = b.vx - g.vx, vrz = b.vz - g.vz, vr = Math.hypot(vrx, vrz);
            if (b.power > 0 && b.lastTeam !== g.team) { this.bowl(g, b.vx, b.vz, 9, b.last, "ball"); b.vx *= 0.6; b.vz *= 0.6; b.vy += 3; b.power = 0; b.hot = 0; return; }
            if (vr < sense) { this.take(g); return; }
            this.deflect(g, bd, speed);
        } else if (bd < R_GOAT + R_BALL && b.y < 2.3) this.deflect(g, bd, speed);
    }

    ballRelative(g) { return 0; }

    firstTime(g, kind) {
        const b = this.ball, dir = this.teams[g.team].dir, h = this.humans.find((x) => x.goat === g);
        if (kind === "shot") {
            let aim;
            if (h) aim = this.aimHuman(g, h);
            else { const k = this.side(1 - g.team)[0]; aim = { x: dir * HL, z: (k.z > 0 ? -1 : 1) * GW * 0.7 }; }
            const header = b.y > 1.1;
            if (aim.hoof) { this.kickShot(g, 0.5, aim, 0, 0, true); return; }
            aim.y = header ? 0.9 : undefined;
            this.kickShot(g, header ? 0.45 : 0.8, aim, g.aiErr ?? 0, 0, true);
            if (b.lastK) b.lastK.kind = header ? "header" : "volley";
            if (h) h.after = 0.4;
        } else {
            const sx = h ? h.mx : 0, sz = h ? h.mz : 0, stick = Math.hypot(sx, sz) > 0.25;
            const mate = pickMate(this, g, stick ? sx : dir, stick ? sz : 0);
            if (mate) this.kickPassTo(g, mate, { first: true }); else this.kickPassDir(g, stick ? sx : dir, stick ? sz : 0);
        }
    }

    take(g) {
        const b = this.ball;
        if (b.owner) return;
        const k = b.lastK;
        if (k && k.team !== g.team && b.since < 2 && (k.kind === "pass" || k.kind === "lob")) { this.stats[g.team].steals++; this.emit("intercept", { g, human: this.isHuman(g) }); }
        b.owner = g; b.last = g; b.lastTeam = g.team; b.passTo = null; b.power = 0;
        const hit = Math.hypot(b.vx - g.vx, b.vz - g.vz);
        this.emit("trap", { g, hit, x: b.x, z: b.z, human: this.isHuman(g) });
    }

    deflect(g, d, speed) {
        const b = this.ball;
        const nx = (b.x - g.x) / (d || 1), nz = (b.z - g.z) / (d || 1), vn = (b.vx - g.vx) * nx + (b.vz - g.vz) * nz;
        const min = R_GOAT + R_BALL;
        if (d < min) { b.x = g.x + nx * min; b.z = g.z + nz * min; }
        if (vn < 0) {
            b.vx -= 1.55 * vn * nx; b.vz -= 1.55 * vn * nz; b.vy = Math.abs(b.vy) * 0.5 + 1.5 + speed * 0.06;
            b.passTo = null;
            b.last = g; b.lastTeam = g.team; b.power = 0;
            if (speed > 6) this.emit("deflect", { g, x: b.x, y: b.y, z: b.z, v: speed, human: this.isHuman(g) });
            if (b.lastK && b.lastK.team === g.team) b.lastK = { ...b.lastK, kind: "deflect", g };
        }
    }

    keeperContact(k, speed) {
        const b = this.ball, own = -this.teams[k.team].dir * HL;
        if (Math.abs(b.x - own) > 9) return false;
        if (k.state === ST.BOWLED || k.state === ST.GETUP) return false;
        if (k.noTouch > 0) return false;
        const diving = k.state === ST.DIVE;
        const d = Math.hypot(k.x - b.x, k.z - b.z), reach = diving ? 2.0 : 1.5, top = diving ? 3.1 : 3.0;
        if (d > reach || b.y > top) return false;
        const toward = (b.vx * (k.x - b.x) + b.vz * (k.z - b.z)) > -8;
        if (!toward) return false;
        if (b.lastTeam === k.team && b.since < 0.8 && speed > 6) return false;      // no catching your mate's backpass in the face
        const threat = b.lastK && b.lastK.team !== k.team && speed > 12;
        if (b.power > 0 && b.lastTeam !== k.team) {
            // A power shot wins the fight: keeper goes flying, ball goes wherever physics sends it.
            const nz = (b.z - k.z) * 0.5, kx = b.vx / (speed || 1);
            this.bowl(k, kx, nz * 0.1, 10, b.last, "keeper");
            b.vx *= -0.34; b.vz = b.vz * 0.4 + (Math.abs(nz) < 0.2 ? (this.rand() - 0.5) * 12 : Math.sign(nz) * 8); b.vy = 3 + this.rand() * 6; b.power = 0; b.hot = 0; b.passTo = null;
            b.last = k; b.lastTeam = k.team;
            this.emit("save", { g: k, x: b.x, y: b.y, z: b.z, big: true, parry: true, by: b.lastK?.g, human: b.lastK && this.isHuman(b.lastK.g) });
            this.stats[1 - k.team].onTarget++;
            return true;
        }
        const catchable = speed < (diving ? 22 : 29);
        if (catchable) {
            b.owner = k; b.passTo = null; b.last = k; b.lastTeam = k.team; b.power = 0; b.vx = b.vz = b.vy = 0;
            k.state = ST.HOLD; k.t = 0; k.holdT = this.o.fast ? 0.4 : 0.85; k.y = 0; k.vy = 0;
            k.ang = this.teams[k.team].dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            if (threat) { this.emit("save", { g: k, x: b.x, y: b.y, z: b.z, caught: true, big: speed > 18 }); this.stats[1 - k.team].onTarget++; }
            else this.emit("collect", { g: k });
            return true;
        }
        // Parry round the side.
        const side = b.z >= k.z ? 1 : -1, out = -Math.sign(own);
        b.vx = out * (6 + speed * 0.16); b.vz = side * (8 + speed * 0.22) * (Math.abs(b.z) > GW * 0.4 ? 1 : 0.8); b.vy = 4 + this.rand() * 5; b.since = 0; b.flightT = 0; b.passTo = null;
        b.last = k; b.lastTeam = k.team; k.noTouch = 0.5;
        this.emit("save", { g: k, x: b.x, y: b.y, z: b.z, parry: true, big: true });
        this.stats[1 - k.team].onTarget++;
        return true;
    }

    updateCritters(dt) {
        for (const c of this.critters) {
            c.t += dt; c.fall = Math.max(0, c.fall - dt); c.scared = Math.max(0, (c.scared ?? 0) - dt);
            if (c.fall > 0) continue;
            c.wait -= dt;
            if (c.wait <= 0) {
                c.wait = 2 + this.rand() * 4;
                if (c.kind === "farmer") { c.tx = (this.rand() - 0.5) * HL * 1.4; c.tz = (this.rand() - 0.5) * HW * 1.6; }
                else { c.tx = clamp(c.x + (this.rand() - 0.5) * 12, -HL + 3, HL - 3); c.tz = clamp(c.z + (this.rand() - 0.5) * 10, -HW + 2, HW - 2); }
            }
            const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz), sp = c.scared > 0 ? 4 : c.kind === "farmer" ? 1.8 : 1.0;
            if (d > 0.3) { c.x += dx / d * sp * dt; c.z += dz / d * sp * dt; c.ang = Math.atan2(dx, dz); c.moving = true; } else c.moving = false;
        }
    }

    get done() { return this.phase === "fulltime"; }
    get winner() { return this.score[0] > this.score[1] ? 0 : this.score[1] > this.score[0] ? 1 : -1; }
}

const mkStats = () => ({ poss: 0, shots: 0, onTarget: 0, passes: 0, tackles: 0, butts: 0, steals: 0 });

// Kickoff positions: distance behind halfway, lateral.
const KICK_SLOTS = [[HL - 1.6, 0], [12, 0], [6, -7], [6, 7], [3.2, 0]];

function mkGoat(id, team, idx, dir) {
    return {
        id, team, idx, role: idx, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, ang: 0, state: ST.RUN, t: 0, charge: 0, charging: false, cool: 0, noTouch: 0, immune: 0, buffer: null,
        tumble: 0, tumbleV: 0, tilt: 0, didHit: false, sv: 0, holdT: 0, cmd: { mx: 0, mz: 0, speed: 1 }, aiT: 0, plan: null, tx: 0, tz: 0,
    };
}

function mkCritter(kind, x, z, rand) {
    return { kind, x, z, tx: x, tz: z, ang: rand() * TAU, wait: rand() * 3, t: rand() * 5, r: kind === "farmer" ? 0.9 : 0.8, h: kind === "farmer" ? 3.0 : 1.5, fall: 0, moving: false, scared: 0 };
}

/** Grades a goal so replays and the season reel can call it something. */
export function rateGoal(k, dist, b, own) {
    if (own) return { score: 5, label: "OWN GOAT" };
    if (!k) return { score: 10, label: "SCRAMBLE" };
    const curve = b.curveSum ?? 0;
    let score = 20 + dist * 2.1 + curve * 34;
    let label = "TAP-IN";
    if (dist > 8) label = "FINE FINISH";
    if (dist > 15) label = "LONG RANGER";
    if (k.kind === "deflect") { label = "SCRAPPY ONE"; score -= 15; }
    if (curve > 0.6 && dist > 7) { label = "BANANA SHOT"; score += 16; }
    if (k.kind === "volley" && dist > 5) { label = "SWEET VOLLEY"; score += 22; }
    if (k.kind === "header") { label = "BULLET HEADER"; score += 20; }
    if (k.kind === "power") { label = dist > 16 ? "ABSOLUTE SCREAMER" : "THUNDERBOLT"; score += 20; }
    if (k.kind === "butt") { label = "HEADBUTT GOAL"; score += 30; }
    return { score: Math.round(clamp(score, 0, 120)), label };
}

export { keeperDistribute };
