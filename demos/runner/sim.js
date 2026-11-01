// The run itself: pure, deterministic, and free of the framework. The game, the bots and the passability proof all
// call movePlayer and touching below, so what is proved is what is played.
import { BIOMES, DISGUISES, DISGUISE_IDS, LANE, ROUTE, SKATE_BOOST, biomeIndex, speedAt } from "./data.js";
import { Generator } from "./chunks.js";

export const JUMP_H = 2.7, JUMP_T = 0.6;
export const JUMP_V = 4 * JUMP_H / JUMP_T, GRAV = 8 * JUMP_H / (JUMP_T * JUMP_T);
export const SLIDE_T = 0.62;
export const LANE_T = 0.13;          // Seconds for one lane.
export const BUFFER = 0.24;          // A press stays alive this long waiting for its moment.
export const HURDLE = 0.95, BAR = 1.3, STAND = 2.2, DUCK = 0.95, HALF = 1.2, BODY = 0.25;
export const CMD = { none: 0, left: 1, right: 2, jump: 3, slide: 4 };
export const laneX = (l) => (l - 1) * LANE;

export const newPlayer = (lane = 1) => ({ x: laneX(lane), lane, y: 0, vy: 0, air: false, slide: 0, bufJ: 0, bufS: 0, fall: false, fly: 0, wall: 0 });

/** One step of player movement. cmd is a CMD value. This is every control rule in the game. */
export function movePlayer(p, dt, cmd, skates = false) {
    p.wall = 0;
    if (cmd === CMD.left) { if (p.lane > 0) p.lane--; else p.wall = -1; }
    else if (cmd === CMD.right) { if (p.lane < 2) p.lane++; else p.wall = 1; }
    else if (cmd === CMD.jump) { p.bufJ = BUFFER; p.bufS = 0; }
    else if (cmd === CMD.slide) { p.bufS = BUFFER; p.bufJ = 0; }

    const tx = laneX(p.lane), step = LANE / (skates ? LANE_T * 0.75 : LANE_T) * dt;
    p.x = Math.abs(tx - p.x) <= step ? tx : p.x + Math.sign(tx - p.x) * step;

    if (p.fly > 0) { p.bufJ = p.bufS = 0; return; }
    if (p.air) {
        if (p.bufS > 0) p.fall = true;      // Slide in the air slams down, then slides on landing.
        p.vy -= GRAV * (p.fall ? 4 : 1) * dt;
        p.y += p.vy * dt;
        if (p.y <= 0) { p.y = 0; p.vy = 0; p.air = false; p.fall = false; p.landed = true; }
    }
    if (!p.air) {
        if (p.bufJ > 0) { p.bufJ = 0; p.slide = 0; p.air = true; p.vy = JUMP_V; p.y = 1e-3; p.jumped = true; }
        else if (p.bufS > 0) { p.bufS = 0; p.slide = SLIDE_T; p.slid = true; }
        else if (p.slide > 0) p.slide = Math.max(0, p.slide - dt);
    }
    p.bufJ = Math.max(0, p.bufJ - dt);
    p.bufS = Math.max(0, p.bufS - dt);
}

/** Does the player, at run distance d, touch this obstacle? 0 no, 1 from the front, 2 from the side. */
export function touching(p, d, prevX, prevD, ob, obD) {
    const near = obD - BODY, far = obD + ob.len + BODY;
    if (d < near || d > far) return 0;
    const ox = laneX(ob.lane);
    if (Math.abs(p.x - ox) >= HALF) return 0;
    if (ob.kind === "j" || ob.kind === "c") { if (p.y > HURDLE) return 0; }
    else if (ob.kind === "s") { if (p.y + (p.slide > 0 ? DUCK : STAND) <= BAR) return 0; }
    return prevD >= near && Math.abs(prevX - ox) >= HALF ? 2 : 1;
}

export class Run {
    /** o: { seed, start, disguise, tutorial, daily } */
    constructor(o = {}) {
        this.seed = o.seed ?? 1;
        this.d = o.start ?? 0;
        this.lapStart = 0;
        this.startD = this.d;
        this.t = 0;
        this.p = newPlayer(1);
        this.state = "run";          // run | caught | finale
        this.reason = null;
        this.speed = speedAt(this.d);
        this.obstacles = []; this.eggs = []; this.pickups = [];
        this.events = [];
        this.score = 0; this.eggCount = 0;
        this.mult = o.mult ?? 1;
        this.heat = o.heat ?? 0.5;   // 0 far behind, 1 caught.
        this.disguise = null; this.disguiseT = 0;
        this.inv = 0;
        this.getaways = 0;
        this.chain = 0; this.chainT = 0;
        this.leftLane = [-9, -9, -9];
        this.jumpAt = -9; this.slideAt = -9;
        this.lastLane = 1;
        this.landing = 0;
        this.tutorial = !!o.tutorial;
        this.stats = { eggs: 0, near: 0, slides: 0, hops: 0, disguises: 0, soft: 0, dist: 0, biome: 0, moustache: 0, skyeggs: 0, smash: 0, chain: 0, getaway: 0, stumbles: 0 };
        this.nextId = 1;
        this.hints = [];
        this.gen = new Generator(this.seed, this.d + 70);
        if (this.tutorial) {
            this.gen.at = this.d + 62;
            this.gen.script = [
                { id: "t-side", tier: 0, rows: [".B."], hint: "lane" },
                { id: "t-rest", tier: 0, rows: ["..."] },
                { id: "t-jump", tier: 0, rows: ["jjj"], hint: "jump" },
                { id: "t-rest", tier: 0, rows: ["..."] },
                { id: "t-duck", tier: 0, rows: ["sss"], hint: "slide" },
                { id: "t-rest", tier: 0, rows: ["..."] },
            ];
        }
        if (o.disguise) this.wear(o.disguise);
        this.plan();
    }
    get lapD() { return this.d - this.lapStart; }
    get biome() { return biomeIndex(this.lapD); }
    plan() {
        this.gen.fill(this, this.d + 240);
        const cut = this.d - 8;
        if (this.obstacles.length > 60 && this.obstacles[0].d + this.obstacles[0].len < cut) this.obstacles = this.obstacles.filter((o) => o.d + o.len >= cut || o.keep);
        if (this.eggs.length > 160) this.eggs = this.eggs.filter((e) => e.d >= cut && !e.got);
        if (this.pickups.length > 3) this.pickups = this.pickups.filter((e) => e.d >= cut && !e.got);
    }
    addObstacle(d, lane, kind, len) {
        const ob = { id: this.nextId++, d, lane, kind, len, dead: false, passed: false, fired: false, v: 0 };
        if (kind === "v") ob.v = 0.75;        // Closes at 1.75x run speed, timed to arrive on its row at the speed then.
        this.obstacles.push(ob);
        return ob;
    }
    addEgg(d, lane, y) { this.eggs.push({ id: this.nextId++, d, lane, y, got: false, x: laneX(lane), sky: false }); }
    addPickup(d, lane, id) { this.pickups.push({ id: this.nextId++, d, lane, kind: id, got: false }); }
    /** Where an obstacle is now. Oncoming ones slide toward the player, reaching their row as the player does. */
    obD(ob) { return ob.v ? ob.d + (ob.d - this.d) * ob.v : ob.d; }
    say(type, data) { this.events.push({ type, ...data }); }

    wear(id) {
        const def = DISGUISES[id];
        const was = this.disguise;
        this.disguise = id; this.disguiseT = def.time;
        this.stats.disguises++;
        if (id === "moustache") { this.heat = 0; this.stats.moustache++; }
        if (id === "jetpack") this.takeOff();
        else if (was === "jetpack") this.p.fly = 0;
        this.say("wear", { id });
    }
    takeOff() {
        const p = this.p, n = 34, gap = this.speed * 0.17;
        p.fly = DISGUISES.jetpack.time; p.air = false; p.slide = 0; p.vy = 0;
        let lane = p.lane, hold = 0;
        for (let i = 0; i < n; i++) {
            if (--hold < 0) { lane = Math.max(0, Math.min(2, lane + [-1, 1][this.gen.rng.int(0, 1)])); hold = 5; }
            const e = { id: this.nextId++, d: this.d + 24 + i * gap, lane, y: 6, got: false, x: laneX(lane), sky: true };
            this.eggs.push(e);
        }
    }
    strip(why) {
        const id = this.disguise;
        this.disguise = null;
        if (id === "jetpack") { this.p.fly = 0; this.p.air = true; this.p.vy = 0; this.p.y = Math.max(this.p.y, 1); this.inv = 1.5; }
        this.say("strip", { id, why });
    }

    /** cmd is a CMD value. Advance the world by dt seconds. */
    step(dt, cmd = 0) {
        if (this.state !== "run") return;
        const p = this.p, prevX = p.x, prevD = this.d, prevLane = p.lane;
        this.t += dt;
        const skates = this.disguise === "skates";
        this.speed = (this.forceSpeed ?? speedAt(this.d)) * (skates ? SKATE_BOOST : 1);
        if (this.t < 1.2) this.speed *= 0.55 + 0.45 * this.t / 1.2;      // A burst of acceleration out of the pen.
        p.jumped = p.slid = p.landed = false;
        movePlayer(p, dt, cmd, skates);
        if (p.lane !== prevLane) { this.leftLane[prevLane] = this.t; this.say("lane", { dir: Math.sign(p.lane - prevLane) }); }
        if (p.wall) this.say("wall", { dir: p.wall });
        if (p.jumped) { this.jumpAt = this.t; this.say("jump", {}); }
        if (p.slid) { this.slideAt = this.t; this.say("slide", {}); }
        if (p.landed) this.say("land", { hard: true });
        this.d += this.speed * dt;
        this.score += this.speed * dt * this.mult * (skates ? 2 : 1) * 0.5;
        this.stats.dist = this.d - this.startD;
        const biome = this.biome;
        if (biome !== this.lastBiome) { if (this.lastBiome !== undefined) this.say("biome", { i: biome }); this.lastBiome = biome; this.stats.biome = Math.max(this.stats.biome, biome); }
        this.heat = this.disguise === "moustache" ? 0 : Math.max(0, this.heat - dt * 0.085);
        this.inv = Math.max(0, this.inv - dt);
        if (this.chainT > 0 && (this.chainT -= dt) <= 0) this.chain = 0;

        if (p.fly > 0) {
            p.y += (6 - p.y) * Math.min(1, dt * 6);
            p.fly -= dt;
        }
        if (this.disguise && (this.disguiseT -= dt) <= 0) { this.strip("time"); }
        this.collide(prevX, prevD);
        this.collect();
        this.plan();
        if (this.lapD >= ROUTE) { this.state = "finale"; this.stats.getaway = 1; this.getaways++; this.say("finale", {}); }
    }

    collide(prevX, prevD) {
        const p = this.p;
        for (const ob of this.obstacles) {
            if (ob.dead) continue;
            const at = this.obD(ob);
            if (at > this.d + 2) { if (!ob.v) break; continue; }
            if (at + ob.len + BODY < this.d) { if (!ob.passed) this.passed(ob); continue; }
            if (!ob.fired && at - BODY <= this.d) { ob.fired = true; this.rate(ob); }
            if (p.fly > 0) continue;
            const prevAt = ob.v ? ob.d + (ob.d - prevD) * ob.v : at;
            const hit = touching(p, this.d, prevX, prevD + (at - prevAt), ob, at);
            if (!hit) continue;
            if (this.disguise === "hivis" || (ob.kind === "c" && this.disguise === "skates")) { ob.dead = true; this.stats.smash++; this.say("smash", { ob }); continue; }
            if (this.inv > 0) continue;
            if (this.tutorial) { ob.dead = true; this.say("smash", { ob }); continue; }
            // Rails, bars and clutter break: Keith stumbles and the farmer gains. Only tall things stop him dead.
            if ("cjs".includes(ob.kind)) { ob.dead = true; this.stats.soft++; this.stumble(ob, "soft"); if (this.state !== "run") return; continue; }
            if (hit === 2) { p.lane = this.lastSafeLane(ob); this.inv = 0.5; this.stumble(ob, "side"); if (this.state !== "run") return; continue; }
            if (this.disguise === "moustache") { ob.dead = true; this.inv = 1.3; this.say("smash", { ob }); this.strip("hit"); continue; }
            this.catchMe("crash", ob);
            return;
        }
    }
    lastSafeLane(ob) { const p = this.p; return p.x < laneX(ob.lane) ? ob.lane - 1 : ob.lane + 1; }
    stumble(ob, why) {
        this.stats.stumbles++;
        this.inv = Math.max(this.inv, 0.4);
        this.say("stumble", { ob, why });
        if (this.disguise === "moustache") return;
        this.heat += 0.62;
        if (this.heat >= 1) this.catchMe("caught", ob);
    }
    catchMe(reason, ob) {
        this.state = "caught"; this.reason = reason;
        this.chain = 0;
        this.say("caught", { reason, ob });
    }
    rate(ob) {
        const p = this.p, t = this.t;
        let kind = null;
        if ("BLv".includes(ob.kind)) { if (t - this.leftLane[ob.lane] < 0.3 && p.lane !== ob.lane) kind = "dodge"; }
        else if (ob.kind === "j" && Math.abs(p.x - laneX(ob.lane)) < HALF && p.air) {
            this.stats.hops++;
            if (t - this.jumpAt < 0.2) kind = "hop";
        } else if (ob.kind === "s" && Math.abs(p.x - laneX(ob.lane)) < HALF && p.slide > 0) {
            this.stats.slides++;
            if (t - this.slideAt < 0.2) kind = "limbo";
        }
        if (!kind || p.fly > 0) return;
        this.chain++; this.chainT = 3;
        this.stats.near++;
        this.stats.chain = Math.max(this.stats.chain, this.chain);
        this.score += 25 * this.chain * this.mult;
        this.say("near", { kind, chain: this.chain, ob });
    }
    passed(ob) { ob.passed = true; }
    collect() {
        const p = this.p, magnet = this.disguise === "dress";
        for (const e of this.eggs) {
            if (e.got) continue;
            const a = e.d - this.d;
            if (a > 9) { if (!e.sky) break; continue; }
            if (a < -3) continue;
            if (magnet && a < 8 && !e.sky) { e.x += (p.x - e.x) * 0.3; e.d += (this.d - e.d) * 0.3; }
            if (Math.abs(a) < 1.35 && Math.abs(e.x - p.x) < 1.25 && (p.fly > 0 ? e.sky : e.y < p.y + 3.2)) {
                e.got = true;
                this.eggCount++; this.stats.eggs++;
                if (e.sky) this.stats.skyeggs++;
                this.score += 10 * this.mult;
                this.say("egg", { e });
            }
        }
        for (const k of this.pickups) {
            if (k.got) continue;
            if (Math.abs(k.d - this.d) < 1.6 && Math.abs(laneX(k.lane) - p.x) < 1.3) { k.got = true; this.wear(k.kind); }
        }
    }
    /** After the rocket: Keith crash-lands on the farm and the chase goes on, faster. */
    nextLap() {
        this.lapStart = this.d;
        this.obstacles = []; this.eggs = []; this.pickups = [];
        const g = new Generator(this.seed + this.getaways * 77, this.d + 70, this.lapStart);
        this.gen = g;
        this.lastBiome = undefined;
        this.p = newPlayer(1);
        this.state = "run";
        this.disguise = null;
        this.heat = 0.2;
        this.plan();
    }
}
export { BIOMES, DISGUISE_IDS };
