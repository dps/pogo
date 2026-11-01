// The game itself, with no drawing and no framework in it: one step(mask) per 1/60 s. The view reads actors and an event list,
// so bots can play the whole school in Node in seconds. x runs along the corridor, z is depth on the floor (0 far, DEPTH near), y is up.
import { ARENA, BTN, DEPTH, ENEMIES, FOOD, GRAV, GRADES, HEROES, METER_BAR, STAGES, STYLE_MAX, WEAPONS, gradeOf, report } from "./data.js";
import { BOSSES, bossInit, bossStep } from "./bosses.js";

const DT = 1 / 60;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sign = (v) => (v < 0 ? -1 : 1);
function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

let nextId = 1;
export class Sim {
    constructor({ stage = 0, mode = "story", seed = 1, diff = { hp: 1, dmg: 1, gap: 1 }, start = 0, hp = null, meter = 0, active = "dot" } = {}) {
        this.cfg = STAGES[stage]; this.stageIdx = stage; this.mode = mode; this.diff = diff;
        this.rand = mulberry(seed * 7919 + 13);
        this.tick = 0; this.events = []; this.enemies = []; this.shots = []; this.hazards = []; this.drops = []; this.ghosts = [];
        this.props = this.cfg.props.map(([kind, x, z, drop]) => ({ id: nextId++, kind, x, z, drop, hp: 16, w: kind === "crate" ? 34 : 54, flash: 0, broken: false }));
        const mk = (id) => ({ id: nextId++, hero: true, key: id, def: HEROES[id], x: 90, y: 0, z: 48, vx: 0, vy: 0, vz: 0, face: 1, st: "idle", t: 0, hp: HEROES[id].hp, maxHp: HEROES[id].hp, w: HEROES[id].w, h: HEROES[id].h, inv: 0, mv: null, mvId: "", jumps: 0, wp: null, held: null, airHits: 0, walkT: 0, flash: 0, ko: false, push: 0 });
        this.team = { dot: mk("dot"), pip: mk("pip") };
        if (hp) { this.team.dot.hp = hp.dot; this.team.pip.hp = hp.pip; }
        this.hero = this.team[active]; if (this.hero.hp <= 0) this.hero = this.other(this.hero);
        this.buf = { A: 0, H: 0, J: 0, G: 0, S: 0, T: 0 }; this.mask = 0; this.prev = 0; this.tagCd = 0;
        this.meter = meter; this.combo = 0; this.comboT = 0; this.bestCombo = 0; this.score = 0; this.style = 0; this.lastMoves = [];
        this.arena = -1; this.wave = 0; this.queue = []; this.waveWait = 0; this.bounds = { x0: 0, x1: this.cfg.arenas[0].at + ARENA }; this.phase = "walk"; this.over = null; this.boss = null;
        this.tokenCd = 120; this.hitCd = 0; this.slow = 0; this.hushed = 0;
        this.stats = { hits: 0, kills: 0, freed: 0, dmgTaken: 0, throws: 0, perfects: 0, specials: 0, tags: 0, aerial: 0, bowled: 0, knockdowns: 0, styleTicks: 0, fightTicks: 0, peak: 0, timeline: [], byMove: {} };
        if (start > 0) {
            // Checkpoint: straight back to the arena that beat you.
            const c = this.cfg, atBoss = start >= c.arenas.length, x = atBoss ? c.len - ARENA : c.arenas[start].at;
            for (const h of Object.values(this.team)) h.x = x + 70;
            this.arena = start - 1; this.bounds = { x0: x, x1: atBoss ? c.len : x + ARENA };
            for (const p of this.props) if (p.x < x) p.broken = true;
        }
        this.ev("stage", { name: this.cfg.name });
    }
    rng(a = 1, b) { const r = this.rand(); return b === undefined ? r * a : a + r * (b - a); }
    ev(t, o = {}) { this.events.push({ t, ...o }); }
    other(h) { return h === this.team.dot ? this.team.pip : this.team.dot; }
    get grade() { return gradeOf(this.style); }
    get alive() { let n = 0; for (const e of this.enemies) if (!e.gone && e.hp > 0) n++; return n; }

    // --- Main loop --------------------------------------------------------------------------------------------------
    step(mask = 0) {
        if (this.over) return;
        this.tick++;
        const prev = this.mask; this.prev = prev; this.mask = mask;
        const edge = mask & ~prev, buf = this.buf;
        for (const k in buf) { if (edge & BTN[k]) buf[k] = 12; else if (buf[k] > 0) buf[k]--; }
        if (this.comboT > 0 && --this.comboT === 0) this.endCombo();
        if (this.tagCd > 0) this.tagCd--;
        if (this.hitCd > 0) this.hitCd--;
        if (this.hushed > 0) this.hushed--;
        if (this.slow > 0) this.slow--;
        this.style = Math.max(0, this.style - (this.comboT > 0 ? 0.12 : 0.42));
        if (this.phase !== "walk") { this.stats.fightTicks++; this.stats.styleTicks += this.style; }
        this.stepHero(this.hero);
        // The hero on the bench gets their wind back.
        const bench = this.other(this.hero);
        if (bench.hp > 0 && bench.hp < bench.maxHp && this.tick % 24 === 0) bench.hp = Math.min(bench.maxHp, bench.hp + 1);
        for (let i = 0; i < this.enemies.length; i++) this.stepEnemy(this.enemies[i]);
        this.enemies = this.enemies.filter((e) => !e.gone);
        this.separate();
        this.stepShots(); this.stepHazards(); this.stepDrops(); this.director();
        if (this.tick % 60 === 0) { const n = this.alive; this.stats.peak = Math.max(this.stats.peak, n); if (this.phase !== "walk") this.stats.timeline.push(n); }
        for (const p of this.props) if (p.flash > 0) p.flash--;
    }
    endCombo() {
        if (this.combo >= 5) this.ev("comboEnd", { n: this.combo, grade: this.grade });
        this.score += this.combo * this.combo * 5;
        this.combo = 0;
    }

    // --- Wave director ----------------------------------------------------------------------------------------------
    director() {
        const c = this.cfg, h = this.hero;
        if (this.phase === "walk") {
            const next = this.arena + 1;
            if (next < c.arenas.length) {
                const a = c.arenas[next];
                if (h.x > a.at + 170) this.lock(next);
            } else if (h.x > c.len - ARENA + 200) this.lockBoss();
            return;
        }
        if (this.queue.length) {
            if (--this.waveWait <= 0) { this.waveWait = 26; this.spawn(this.queue.shift()); }
        } else if (this.phase === "fight") {
            const waves = c.arenas[this.arena].waves, more = this.wave + 1 < waves.length;
            if (this.alive <= (more && this.stageIdx >= 2 ? 1 : 0)) {
                if (more) { this.wave++; this.queue = waves[this.wave].split(" "); this.waveWait = 40; }
                else if (!this.enemies.some((e) => e.hp > 0)) {
                    this.phase = "walk"; this.ev("go"); this.freeBounds();
                    this.score += 500; if (h.hp < h.maxHp) h.hp = Math.min(h.maxHp, h.hp + 12);
                }
            }
        }
        this.tokens();
    }
    lock(i) {
        const a = this.cfg.arenas[i];
        this.arena = i; this.wave = 0; this.phase = "fight"; this.bounds = { x0: a.at, x1: a.at + ARENA };
        this.queue = a.waves[0].split(" "); this.waveWait = 20;
        this.ev("lock", { arena: i, hint: a.hint });
    }
    freeBounds() {
        const c = this.cfg, n = this.arena + 1, cur = this.bounds;
        this.bounds = { x0: cur.x0 + 160, x1: n < c.arenas.length ? c.arenas[n].at + ARENA : c.len };
    }
    lockBoss() {
        const c = this.cfg, x0 = c.len - ARENA;
        this.arena = c.arenas.length; this.phase = "boss"; this.bounds = { x0, x1: c.len };
        const b = this.makeEnemy("kid", x0 + ARENA - 120, DEPTH / 2);
        bossInit(this, b, c.boss); this.boss = b;
        this.ev("boss", { id: c.boss, name: BOSSES[c.boss].name, line: BOSSES[c.boss].line });
    }
    tokens() {
        if (this.tokenCd > 0) { this.tokenCd--; return; }
        const c = this.cfg, h = this.hero;
        if (h.st === "kd" || h.st === "down" || h.st === "wake" || h.st === "ko") return;
        let active = 0, best = null, bd = 1e9;
        for (const e of this.enemies) {
            if (e.boss) continue;
            if (e.token) active++;
            else if (e.st === "move" && e.cd <= 0 && e.y <= 0) { const d = Math.abs(e.x - h.x) * (e.def.ranged ? 0.5 : 1) - e.wait * 0.4; if (d < bd) { bd = d; best = e; } }
        }
        if (best && active < c.tokens) { best.token = true; this.tokenCd = Math.round((c.gap + this.rng(-8, 16)) * this.diff.gap); }
    }

    // --- Spawning ---------------------------------------------------------------------------------------------------
    makeEnemy(type, x, z) {
        const def = ENEMIES[type], hp = Math.round(def.hp * this.diff.hp);
        const e = { id: nextId++, type, def, x, y: 0, z, vx: 0, vy: 0, vz: 0, face: -1, st: "spawn", t: 0, hp, maxHp: hp, w: def.w, h: def.h, poise: def.poise, shield: def.shield ?? 0, cd: this.rng(10, 70), token: false, wait: 0, j: 0, bounces: 0, flash: 0, hits: null, side: this.rng() < 0.5 ? -1 : 1, rz: this.rng(-34, 34), noGrab: 0, variant: Math.floor(this.rng(4)), gone: false, seen: 0, atk: def.atk, hurtPose: 0, dizzy: 0 };
        this.enemies.push(e);
        return e;
    }
    spawn(type) {
        const b = this.bounds, h = this.hero, side = (this.spawnSide = -(this.spawnSide ?? -1));
        const left = side < 0 && h.x > b.x0 + 120;
        const x = left ? b.x0 - 110 : b.x1 + 110, z = this.rng(8, DEPTH - 8);
        const e = this.makeEnemy(type, x, z);
        e.face = left ? 1 : -1; e.t = 0; e.entry = left ? b.x0 + 40 : b.x1 - 40;
        return e;
    }
    /** Dropped in by a boss, close to the action. */
    summon(type, x, z) { const e = this.makeEnemy(type, x, z); e.y = 420; e.st = "air"; e.vy = -200; e.summoned = true; this.ev("summon", { x, z }); return e; }

    // --- Hero ---------------------------------------------------------------------------------------------------------
    stick(h) {
        const m = this.mask;
        return { x: (m & BTN.R ? 1 : 0) - (m & BTN.L ? 1 : 0), z: (m & BTN.D ? 1 : 0) - (m & BTN.U ? 1 : 0) };
    }
    stepHero(h) {
        if (h.flash > 0) h.flash--;
        if (h.inv > 0) h.inv--;
        h.t++;
        const s = this.stick(h), def = h.def;
        switch (h.st) {
            case "idle": case "land": this.heroGround(h, s); break;
            case "jump": this.heroAir(h, s); break;
            case "atk": this.heroAttack(h, s); break;
            case "dodge": {
                const k = h.t < 20 ? 1 : 0.4;
                h.x += h.vx * k * DT; h.z += h.vz * k * DT;
                if (h.t >= 3 && h.t <= 19) h.inv = Math.max(h.inv, 1);
                if (h.t > 10 && this.buf.A && !h.y) { this.buf.A = 0; this.start(h, "DA"); h.vx = 0; h.vz = 0; break; }
                if (h.t >= 25) { h.st = "idle"; h.t = 0; h.vx = h.vz = 0; }
                break;
            }
            case "hurt": h.x += h.vx * DT; h.vx *= 0.86; if (h.t >= h.stun) { h.st = "idle"; h.t = 0; } else if (h.t > 8 && this.buf.S && this.meter >= METER_BAR) this.special(h); break;
            case "kd":
                h.vy -= GRAV * DT; h.x += h.vx * DT; h.y += h.vy * DT;
                if (h.y <= 0) { h.y = 0; h.vy = 0; h.st = "down"; h.t = 0; h.vx *= 0.3; this.ev("thud", this.at(h)); }
                break;
            case "down": h.x += h.vx * DT; h.vx *= 0.8; if (h.t >= 34) { h.st = "wake"; h.t = 0; h.inv = 80; this.ev("wake", this.at(h)); } break;
            case "wake": if (h.t >= 16) { h.st = "idle"; h.t = 0; } break;
            case "grab": this.heroGrab(h, s); break;
            case "throw": if (h.t >= 18) { h.st = "idle"; h.t = 0; } break;
            case "special": this.heroSpecial(h); break;
            case "tagin":
                h.vy -= GRAV * 1.4 * DT; h.y += h.vy * DT;
                if (h.y <= 0) { h.y = 0; h.vy = 0; h.st = "idle"; h.t = 0; this.start(h, "TAG"); h.inv = 30; this.ev("tagLand", this.at(h)); }
                break;
            case "chase": this.heroChase(h); break;
            case "ko": h.vy -= GRAV * DT; h.x += h.vx * DT; h.y += h.vy * DT; if (h.y <= 0) { h.y = 0; h.vy = 0; h.vx = 0; } if (h.t === 70) this.afterKo(h); break;
        }
        const b = this.bounds;
        h.x = clamp(h.x, b.x0 + 20, b.x1 - 20); h.z = clamp(h.z, 2, DEPTH - 2);
    }
    free(h) { return h.st === "idle" || h.st === "land" || h.st === "jump"; }
    canTag(h) { return this.tagCd <= 0 && this.other(h).hp > 0 && h.st !== "kd" && h.st !== "down" && h.st !== "ko" && h.st !== "special" && h.st !== "grab"; }
    common(h, s, cancelOK = true) {
        const b = this.buf;
        if (b.S && this.meter >= METER_BAR && cancelOK) { b.S = 0; this.special(h); return true; }
        if (b.T && cancelOK && this.canTag(h)) { b.T = 0; this.swap(h); return true; }
        if (b.G && cancelOK) { b.G = 0; this.dodge(h, s); return true; }
        return false;
    }
    dodge(h, s) {
        h.st = "dodge"; h.t = 0; h.mv = null; h.perfect = false; h.dodgeFrom = h.y;
        let dx = s.x, dz = s.z;
        if (!dx && !dz) dx = -h.face;
        const l = Math.hypot(dx, dz); h.vx = (dx / l) * 400; h.vz = (dz / l) * 300; h.y = 0; h.vy = 0;
        this.ev("dodge", this.at(h));
    }
    heroGround(h, s) {
        const def = h.def, b = this.buf;
        if (h.st === "land" && h.t >= 5) { h.st = "idle"; h.t = 0; }
        if (this.common(h, s)) return;
        if (b.J) {
            b.J = 0;
            if (this.chaseTarget(h)) return;
            h.st = "jump"; h.t = 0; h.vy = def.jump; h.jumps = 1; h.airHits = 0; h.vx = s.x * def.walk * 0.9; this.ev("jump", this.at(h)); return;
        }
        if (b.H) {
            b.H = 0;
            if (h.wp) { this.tossWeapon(h); return; }
            const up = s.z < 0;
            if (h.chain && this.tick - h.chainAt < 20 && def.moves["H" + h.chain] && !up) { this.start(h, "H" + h.chain); return; }
            this.start(h, up ? "HU" : "HN"); return;
        }
        if (b.A) {
            b.A = 0;
            if (this.chaseTarget(h)) return;
            if (h.wp) { this.swingWeapon(h); return; }
            this.start(h, "L1"); return;
        }
        // Walking.
        const moving = s.x || s.z, l = moving ? Math.hypot(s.x, s.z) : 1;
        h.vx = (s.x / l) * def.walk; h.vz = (s.z / l) * def.zwalk;
        h.x += h.vx * DT; h.z += h.vz * DT;
        if (s.x) h.face = s.x;
        h.moving = !!moving;
        if (moving) h.walkT++; else h.walkT = 0;
        this.tryGrab(h, s);
    }
    tryGrab(h, s) {
        if (!s.x) { h.push = 0; return; }
        let got = null;
        for (const e of this.enemies) {
            if (e.boss || e.hp <= 0 || e.y > 8 || e.noGrab > 0) continue;
            const ok = e.st === "dizzy" || ((e.st === "hit" || e.st === "move" || e.st === "rec") && !e.def.armor) || (e.st === "tel" && !e.def.armor && !e.def.bomb && e.t < 12);
            if (!ok) continue;
            if (Math.abs(e.x - h.x) < h.w + e.w + 16 && sign(e.x - h.x) === s.x && Math.abs(e.z - h.z) < 28) { got = e; break; }
        }
        if (!got) { h.push = Math.max(0, h.push - 1); return; }
        if (++h.push < (got.st === "dizzy" ? 2 : 9)) return;
        h.push = 0; h.st = "grab"; h.t = 0; h.held = got; h.bonks = 0; h.face = sign(got.x - h.x);
        this.dropToken(got); got.st = "held"; got.t = 0; got.shield = 0; got.vx = got.vy = got.vz = 0;
        this.ev("grab", this.at(h));
    }
    heroGrab(h, s) {
        const e = h.held, b = this.buf;
        if (!e || e.hp <= 0 && e.st !== "held") { h.st = "idle"; h.t = 0; h.held = null; return; }
        e.x = h.x + h.face * (h.w + 18); e.z = h.z + 1; e.y = 34; e.face = -h.face;
        if (b.S && this.meter >= METER_BAR) { b.S = 0; this.release(h); this.special(h); return; }
        if (s.x) h.face = s.x;
        if (b.A && (h.bonkT ?? 0) <= h.t) {
            b.A = 0; h.bonks++; h.bonkT = h.t + 12;
            const mv = { dmg: 7, cls: "G", word: "BONK", freeze: 4, poise: 0, grabBonk: true };
            e.hp -= 7; this.registerHit(mv, e, false); this.ev("bonk", this.at(e, { word: "BONK" }));
            if (h.bonks >= 3 || e.hp <= 0) { this.throwHeld(h, s, "side"); return; }
        }
        if (b.H) { b.H = 0; this.throwHeld(h, s, "side"); return; }
        if (b.J) { b.J = 0; this.throwHeld(h, s, "up"); return; }
        if (h.t >= 110) this.throwHeld(h, s, "side");
    }
    release(h) { const e = h.held; if (e) { e.st = "hit"; e.t = 0; e.stun = 20; e.y = 0; h.held = null; } }
    /** Aim for the fattest group on that side; a thrown student is a bowling ball. */
    throwHeld(h, s, how) {
        const e = h.held; h.held = null; h.st = "throw"; h.t = 0; this.stats.throws++;
        if (how === "up") {
            e.st = "air"; e.vy = 760; e.vx = 0; e.y = 40; e.j = 0; e.hits = null; this.ev("toss", this.at(e, { up: true }));
            h.lastLaunch = { e, t: this.tick }; this.addStyle("TOSS", 30);
            return;
        }
        let dir = s.x || 0, tz = null;
        const score = (d) => { let n = 0, z = 0; for (const o of this.enemies) if (o !== e && o.hp > 0 && !o.boss && sign(o.x - h.x) === d) { n++; z += o.z; } return [n, n ? z / n : h.z]; };
        const [nr, zr] = score(1), [nl, zl] = score(-1);
        if (!dir) dir = nl > nr ? -1 : nr > nl ? 1 : h.face;
        tz = dir > 0 ? zr : zl;
        h.face = dir;
        e.st = "thrown"; e.t = 0; e.vx = dir * 640; e.vy = 180; e.y = 44; e.hits = new Set(); e.bowled = 0; e.vz = clamp((tz - e.z) * 2.4, -160, 160); e.j = 0; e.face = -dir;
        this.addStyle("THROW", 34);
        this.ev("throw", this.at(e, { dir }));
    }
    start(h, id, moveOverride) {
        const m = moveOverride ?? h.def.moves[id];
        h.st = "atk"; h.t = 0; h.mv = m; h.mvId = id; h.conn = false; h.hitset = new Set(); h.aim = null; h.lx = 0; h.vx = 0; h.vz = 0;
        h.chain = 0;
        const tgt = this.pick(h, m.range ?? 170, !!m.air);
        if (tgt) {
            if (tgt.x !== h.x) h.face = sign(tgt.x - h.x);
            h.aim = tgt;
            const gap = Math.abs(tgt.x - h.x) - tgt.w * 0.6 - m.reach * 0.62;
            h.lx = clamp(gap, 0, m.lunge ?? 0) / Math.max(1, m.st + 2);
        } else {
            const s = this.stick(h); if (s.x) h.face = s.x;
            h.lx = (m.lunge ?? 0) * 0.12 / Math.max(1, m.st + 1);
        }
        this.ev("swing", this.at(h, { cls: m.cls, anim: m.anim, heavy: m.cls === "H", id, hero: h.key }));
    }
    /** Comfortable aim: nearest body within reach, biased by where the stick points and by what's in front. */
    pick(h, range, air) {
        const s = this.stick(h); let best = null, bd = 1e9;
        for (const e of this.enemies) {
            if (e.hp <= 0 && e.st !== "air") continue;
            if (e.st === "down" || e.st === "held" || e.st === "spawn" && Math.abs(e.x - h.x) > 120) continue;
            const dx = e.x - h.x, dz = e.z - h.z, ax = Math.abs(dx) - (e.boss ? e.w * 0.6 : 0);
            if (ax > range || Math.abs(dz) > (e.boss ? 200 : 90)) continue;
            let d = Math.max(0, ax) + Math.abs(dz) * 1.5;
            if (air) d += Math.abs(e.y - h.y) * 0.6;
            if (s.x && sign(dx) !== s.x) d += 120;
            else if (!s.x && sign(dx) !== h.face) d += 30;
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }
    heroAttack(h, s) {
        const m = h.mv, b = this.buf, a = m.st + m.ac, end = a + m.rc;
        if (h.t <= m.st + 1 && h.lx) h.x += h.face * h.lx;
        if (h.aim && h.t <= a && h.aim.hp > -1) {
            const dz = h.aim.z - h.z; h.z += clamp(dz, -5, 5);
            if (m.air) { const dy = h.aim.y - h.y + 10; h.y += clamp(dy, -7, 7); }
        }
        if (m.air) {
            h.vy -= GRAV * 0.14 * DT; h.y += h.vy * DT; h.vy = Math.max(h.vy, -120);
            if (h.y <= 0) { h.y = 0; h.vy = 0; h.st = "land"; h.t = 0; this.ev("land", this.at(h)); return; }
        } else { h.y = Math.max(0, h.y - 12); }
        if (h.t > m.st && h.t <= a) this.heroHits(h, m);
        if (m.shock && h.t === m.st + 1) this.ev("slamFx", this.at(h, { x: h.x + h.face * m.reach * 0.7 }));
        const canc = h.conn ? h.t > m.st : h.t >= a;
        if (canc) {
            if (this.common(h, s)) return;
            if (m.launch && h.conn && (b.J || b.A)) { b.J = 0; b.A = 0; if (this.chaseTarget(h)) return; }
            if (m.air) {
                if (b.H) { b.H = 0; this.start(h, "AH"); return; }
                if (b.A && m.next && h.airHits < 7) { b.A = 0; this.start(h, m.next); h.airHits++; return; }
            } else {
                if (b.J) { b.J = 0; h.st = "jump"; h.t = 0; h.vy = h.def.jump; h.jumps = 1; h.airHits = 0; h.vx = 0; this.ev("jump", this.at(h)); return; }
                if (b.A && h.wp && m.anim === h.wpAnim) { b.A = 0; this.swingWeapon(h); return; }
                if (b.A && m.next) { b.A = 0; this.start(h, m.next); h.chain = 0; return; }
                if (b.H && !m.big && !h.wp) {
                    b.H = 0;
                    const n = +h.mvId.slice(1) || 1, id = s.z < 0 ? "HU" : "H" + n;
                    this.start(h, h.def.moves[id] ? id : "HN"); return;
                }
            }
        }
        if (h.t >= end) {
            h.mv = null; h.t = 0;
            if (h.y > 0) { h.st = "jump"; h.jumps = Math.max(h.jumps, 1); } else h.st = "idle";
        }
    }
    heroAir(h, s) {
        const def = h.def, b = this.buf;
        h.vy -= GRAV * DT; h.y += h.vy * DT;
        h.vx += (s.x * def.walk - h.vx) * 0.12; h.x += h.vx * DT; h.z += s.z * def.zwalk * 0.7 * DT;
        if (s.x) h.face = s.x;
        if (h.y <= 0) { h.y = 0; h.vy = 0; h.vx = 0; h.st = "land"; h.t = 0; this.ev("land", this.at(h)); return; }
        if (b.S && this.meter >= METER_BAR) { b.S = 0; this.special(h); return; }
        if (b.G) { b.G = 0; this.dodge(h, s); return; }
        if (b.J && h.jumps < def.jumps) { b.J = 0; h.jumps++; h.vy = def.jump * 0.86; this.ev("jump", this.at(h, { dbl: true })); return; }
        if (b.H) { b.H = 0; this.start(h, "AH"); return; }
        if (b.A) { b.A = 0; h.airHits++; this.start(h, "A1"); }
    }
    /** After a launcher, jump or attack homes in on whoever is in the air. */
    chaseTarget(h) {
        const l = h.lastLaunch;
        if (!l || this.tick - l.t > 36 || l.e.st !== "air" || l.e.y < 40) return false;
        h.st = "chase"; h.t = 0; h.chaseT = l.e; h.lastLaunch = null; h.airHits = 0; h.jumps = 1; h.vx = h.vz = 0; h.mv = null;
        h.face = sign(l.e.x - h.x) || h.face;
        this.ev("jump", this.at(h, { chase: true }));
        return true;
    }
    heroChase(h) {
        const e = h.chaseT, n = 12, k = Math.min(1, h.t / n);
        if (!e || e.st !== "air") { h.st = "jump"; h.t = 0; h.vy = 120; return; }
        const tx = e.x - h.face * (h.w + 24), ty = Math.max(30, e.y - 20);
        h.x += (tx - h.x) * (0.22 + k * 0.3); h.y += (ty - h.y) * (0.22 + k * 0.3); h.z += (e.z - h.z) * 0.3;
        if (h.t >= n) { h.st = "jump"; h.t = 0; h.vy = 80; h.vx = 0; this.start(h, "A1"); }
    }
    swingWeapon(h) {
        const w = WEAPONS[h.wp.type], m = w.mv;
        h.wpAnim = m.anim; this.start(h, "W", m);
        if (--h.wp.dur <= 0) h.wpBreak = true;
    }
    tossWeapon(h) {
        const type = h.wp.type, w = WEAPONS[type], t = w.toss, tg = this.pick(h, 320, false);
        if (tg) h.face = sign(tg.x - h.x);
        h.st = "throw"; h.t = 0; h.wp = null;
        const dz = tg ? clamp(tg.z - h.z, -60, 60) : 0;
        this.shots.push({ id: nextId++, kind: t.kind, foe: false, x: h.x + h.face * 30, y: 70, z: h.z, vx: h.face * t.speed, vy: t.arc ?? 0, vz: dz * 3, g: t.arc ? GRAV * 0.8 : 0, r: t.r, dmg: t.dmg, life: t.life, pierce: t.pierce, hits: new Set(), back: t.back, puddle: t.puddle, face: h.face, born: this.tick });
        this.ev("toss", this.at(h, { kind: t.kind }));
    }
    heroHits(h, m) {
        for (const e of this.enemies) {
            if (e.gone || h.hitset.has(e.id)) continue;
            if (e.hp <= 0 && e.st !== "air") continue;
            if (e.st === "spawn" && Math.abs(e.x - h.x) > 150) continue;
            if (e.st === "down" && !m.shock && !m.air && m.cls !== "H") continue;
            if (e.st === "held" || e.st === "thrown" || e.st === "ko") continue;
            const dx = (e.x - h.x) * h.face, w = e.w;
            if (dx < -24 - w * 0.5 || dx > m.reach + w) continue;
            if (Math.abs(e.z - h.z) > m.depth + (e.boss ? e.depthW ?? 20 : 0)) continue;
            const ey0 = e.y, ey1 = e.y + e.h, hy0 = h.y + (m.y0 ?? -10), hy1 = h.y + (m.y1 ?? 130);
            if (ey1 < hy0 || ey0 > hy1) continue;
            h.hitset.add(e.id);
            this.hitEnemy(h, e, m);
        }
        for (const p of this.props) {
            if (p.broken || h.hitset.has(p.id)) continue;
            if (Math.abs(p.z - h.z) > m.depth + 16 || h.y > 90) continue;
            const dx = (p.x - h.x) * h.face;
            if (dx < -20 || dx > m.reach + p.w) continue;
            h.hitset.add(p.id); this.hitProp(p, m.dmg, h);
        }
    }
    hitProp(p, dmg, h) {
        p.hp -= Math.max(6, dmg); p.flash = 8;
        if (h) h.conn = true;
        this.ev("propHit", { x: p.x, y: 40, z: p.z, kind: p.kind });
        if (p.hp <= 0) {
            p.broken = true; this.score += 50;
            this.ev("propBreak", { x: p.x, y: 40, z: p.z, kind: p.kind });
            if (p.drop) this.dropItem(p.drop, p.x, p.z);
        }
    }
    dropItem(kind, x, z) { this.drops.push({ id: nextId++, kind, x, y: 30, z, vy: 340, vx: this.rng(-40, 40), t: 0, life: 900 }); }

    // --- Hits on enemies ---------------------------------------------------------------------------------------------
    hitEnemy(h, e, m) {
        const wasAir = e.y > 2;
        h.conn = true;
        if (e.boss) { this.hitBoss(h, e, m); return; }
        const dir = h.face;
        // Shield: the front is safe from lights.
        if (e.shield > 0 && e.st !== "dizzy" && e.st !== "air" && sign(h.x - e.x) === e.face && !wasAir) {
            if (!m.breaks) { h.x -= dir * 6; e.flash = 6; e.x += dir * 4; this.ev("block", this.at(e, { y: 64, dir })); this.hitCd = 0; return; }
            e.shield--;
            if (e.shield <= 0) { this.ev("shieldBreak", this.at(e, { y: 64, dir, word: "CRACK" })); this.setDizzy(e, 90); this.registerHit(m, e, wasAir); return; }
            e.flash = 8; this.ev("block", this.at(e, { y: 64, dir, heavy: true })); return;
        }
        const scale = 1 - Math.min(0.5, this.combo * 0.012);
        const dmg = Math.max(1, Math.round(m.dmg * scale));
        e.hp -= dmg;
        e.flash = 8;
        e.hurtPose = (e.hurtPose + 1) % 3;
        if (e.token) this.dropToken(e);
        this.registerHit(m, e, wasAir);
        if (e.st === "tel" && e.def.bomb && e.hp <= 0) { this.explode(e); return; }
        // Big ones shrug off light hits until their poise is gone.
        if (e.def.armor && !wasAir && e.st !== "dizzy") {
            e.poise -= m.poise ?? 6;
            if (e.poise <= 0) { e.poise = e.def.poise; this.ev("stagger", this.at(e)); this.setDizzy(e, 130); return; }
            if (m.cls !== "H" && e.hp > 0) { e.x += dir * 3; this.ev("armor", this.at(e, { y: 90 })); return; }
        }
        this.react(e, m, dir, wasAir);
        if (e.hp <= 0) this.koLaunch(e, m, dir);
    }
    react(e, m, dir, wasAir) {
        e.noGrab = 0;
        if (e.def.armor && (m.up || m.fly) && e.st !== "dizzy") { e.st = "hit"; e.t = 0; e.stun = 26; e.vx = dir * 120; return; }
        if (m.spike && wasAir) { e.st = "air"; e.vy = -960; e.vx = dir * 30; e.spiked = true; e.t = 0; return; }
        if (m.spike) { e.st = "air"; e.vy = m.up; e.vx = dir * m.kb; e.t = 0; e.y = 2; e.j += 1; return; }
        if (m.fly) { e.st = "fly"; e.t = 0; e.vx = dir * m.kb; e.vy = m.up; e.y = Math.max(e.y, 6); e.hits = new Set(); e.bowled = 0; e.vz = 0; return; }
        if (wasAir || m.up) {
            e.st = "air"; e.t = 0; e.j++;
            e.vy = Math.max((m.up ?? 170) * (wasAir ? Math.max(0.4, 1 - e.j * 0.05) : 1), wasAir ? 60 : 0); e.vx = dir * (m.kb ?? 30) * (m.knock ? 1 : 0.5); e.y = Math.max(e.y, 3);
            if (m.launch) { this.hero.lastLaunch = { e, t: this.tick }; this.ev("launch", this.at(e)); }
            return;
        }
        if (m.stunLock) { this.setDizzy(e, m.stunLock); return; }
        e.st = "hit"; e.t = 0; e.stun = m.stun ?? 20; e.vx = dir * (m.kb ?? 30) * 2.2;
    }
    setDizzy(e, t) { e.st = "dizzy"; e.t = 0; e.dizzy = t; e.y = 0; e.vy = 0; e.vx *= 0.3; this.dropToken(e); }
    dropToken(e) { if (e.token) { e.token = false; e.cd = this.rng(50, 110); } }
    koLaunch(e, m, dir) {
        if (e.st === "fly" || e.st === "air") { e.vy = Math.max(e.vy, 340); }
        else { e.st = "air"; e.vy = 420; e.vx = dir * 260; e.y = 3; }
        e.killer = dir;
        if (this.alive === 0 && !this.queue.length) this.ev("lastKo", this.at(e));
    }
    registerHit(m, e, wasAir) {
        const s = this.stats, id = m.word ?? "x";
        this.combo++; this.comboT = 130; s.hits++;
        s.byMove[id] = (s.byMove[id] ?? 0) + 1;
        if (wasAir) s.aerial++;
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.meter = Math.min(METER_BAR * 3, this.meter + (m.dmg ?? 6) * 0.3 + 0.4);
        this.addStyle(id, (m.big ? 22 : 10) + (wasAir ? 8 : 0));
        this.score += Math.round((10 + m.dmg * 5) * (1 + this.combo * 0.1) * (1 + this.grade * 0.25));
        const big = m.big || e.boss && m.cls === "H";
        this.ev("hit", this.at(e, { y: e.y + (e.boss ? e.h * 0.5 : e.h * 0.62), dir: this.hero.face, word: m.word, big, cls: m.cls, freeze: m.freeze ?? 2, combo: this.combo, kill: e.hp <= 0, boss: !!e.boss, shock: m.shock }));
    }
    addStyle(id, n) {
        const l = this.lastMoves, rep = l.filter((x) => x === id).length;
        l.push(id); if (l.length > 6) l.shift();
        const prev = this.grade;
        this.style = Math.min(STYLE_MAX, this.style + n * (rep >= 3 ? 0.25 : rep === 2 ? 0.6 : 1) * (1 + this.combo * 0.008));
        const g = this.grade;
        if (g > prev) this.ev("gradeUp", { g });
    }
    hitBoss(h, b, m) {
        const open = b.open ? 1.3 : 1, armor = b.invuln ? 0 : 1;
        if (!armor) { this.ev("block", this.at(b, { y: 100, dir: h.face })); return; }
        const dmg = Math.max(1, Math.round(m.dmg * open * (b.dizzy > 0 ? 1.2 : 1)));
        b.hp -= dmg; b.flash = 6;
        this.registerHit(m, b, false);
        b.poiseNow -= m.poise ?? 6;
        if (b.poiseNow <= 0 && b.dizzy <= 0) { b.poiseNow = b.maxPoise; b.dizzy = 200; b.mv = null; b.phaseT = 0; b.vx = 0; this.ev("stagger", this.at(b, { y: b.h * 0.8, boss: true })); }
        if (b.hp <= 0) { b.hp = 0; this.killBoss(b); }
    }
    killBoss(b) {
        b.st = "bossdie"; b.t = 0; b.mv = null; b.invuln = true;
        for (const e of this.enemies) if (!e.boss && e.hp > 0) { e.hp = 0; e.st = "air"; e.vy = 400; e.vx = this.rng(-200, 200); e.y = 3; }
        this.shots.length = 0; this.hazards.length = 0;
        this.ev("bossDie", this.at(b, { y: b.h * 0.5 }));
    }
    bonus() {
        const s = this.stats, t = this.tick / 60, hpK = (this.team.dot.hp + this.team.pip.hp) / (this.team.dot.maxHp + this.team.pip.maxHp);
        const par = 150 + this.stageIdx * 30, time = Math.max(0, Math.round((par - t) * 40));
        const health = Math.round(hpK * 3000 * (1 + this.stageIdx * 0.25)), comboB = this.bestCombo * 60;
        return { time, health, combo: comboB };
    }
    finish() {
        this.endCombo();
        const b = this.bonus();
        this.score += b.time + b.health + b.combo;
        const ratio = this.score / this.cfg.par;
        this.over = { win: true, bonus: b, ratio, letter: report(ratio), score: this.score, avgStyle: this.stats.fightTicks ? this.stats.styleTicks / this.stats.fightTicks : 0 };
        this.ev("clear", this.over);
    }

    // --- Enemies ----------------------------------------------------------------------------------------------------
    stepEnemy(e) {
        if (e.flash > 0) e.flash--;
        e.t++;
        if (e.noGrab > 0) e.noGrab--;
        if (e.boss) { bossStep(this, e); return; }
        const h = this.hero;
        switch (e.st) {
            case "spawn": {
                const d = sign(e.entry - e.x);
                e.x += d * Math.max(e.def.speed, 150) * DT; e.face = d;
                if (Math.abs(e.x - e.entry) < 8 || e.t > 200) { e.st = "move"; e.t = 0; }
                break;
            }
            case "move": this.aiMove(e, h); break;
            case "tel": this.aiTel(e, h); break;
            case "atk": this.aiAtk(e, h); break;
            case "rec": e.x += e.vx * DT; e.vx *= 0.9; if (e.t >= e.atk.rc) { e.st = "move"; e.t = 0; e.cd = this.rng(40, 120); this.dropToken(e); } break;
            case "hit": this.flyPhys(e, 0.8); if (e.t >= e.stun) { e.st = "move"; e.t = 0; e.cd = Math.max(e.cd, 30); } break;
            case "dizzy": e.x += e.vx * DT; e.vx *= 0.85; if (e.t >= e.dizzy) { e.st = "move"; e.t = 0; e.cd = 50; e.noGrab = 40; } break;
            case "air": this.airPhys(e); break;
            case "fly": case "thrown": this.missile(e); break;
            case "slip": if (e.t >= 70) { e.st = "getup"; e.t = 0; } break;
            case "down": e.x += e.vx * DT; e.vx *= 0.84; if (e.hp <= 0) { if (e.t >= 22) this.ko(e); } else if (e.t >= 46) { e.st = "getup"; e.t = 0; } break;
            case "getup": if (e.t >= 24) { e.st = "move"; e.t = 0; e.cd = Math.max(e.cd, 40); e.j = 0; e.bounces = 0; e.noGrab = 30; } break;
            case "held": e.t = Math.min(e.t, 500); break;
            case "ko": if (e.t < 90) { e.x += e.side * 30 * DT; } else { e.x += e.side * 300 * DT; if (e.t > 170) e.gone = true; } break;
        }
        // Anything left in the air by a hit that didn't launch it still has to come down.
        if (e.y > 0 && (e.st === "hit" || e.st === "move" || e.st === "dizzy" || e.st === "tel" || e.st === "atk" || e.st === "rec" || e.st === "getup" || e.st === "down")) {
            e.vy = Math.min(e.vy, 0) - GRAV * DT; e.y += e.vy * DT; if (e.y <= 0) { e.y = 0; e.vy = 0; }
        }
        for (const z of this.hazards) if (z.type === "custard" && e.y < 4 && e.st !== "slip" && e.st !== "down" && e.st !== "ko" && e.st !== "held" && e.hp > 0 && !e.def.armor && Math.hypot(e.x - z.x, (e.z - z.z) * 1.6) < z.r) {
            e.st = "air"; e.vy = 330; e.vx = e.face * 120; e.y = 2; e.slipped = true; this.dropToken(e); this.ev("slip", this.at(e, { word: "WHOOPS" })); this.addStyle("SLIP", 12);
        }
    }
    ko(e) {
        e.st = "ko"; e.t = 0; e.y = 0; e.vx = e.vy = 0; e.token = false;
        this.stats.kills++; this.stats.freed++;
        this.score += Math.round(e.def.score * (1 + this.grade * 0.25));
        this.addStyle("KO", 16);
        this.meter = Math.min(METER_BAR * 3, this.meter + 4);
        // A sensible snack for anyone having a hard time.
        const h = this.hero, low = h.hp / h.maxHp;
        if (this.rng() < (low < 0.35 ? 0.4 : low < 0.6 ? 0.1 : 0.03)) this.dropItem(this.rng() < 0.5 ? "cookie" : "pudding", e.x, e.z);
        this.ev("freed", this.at(e, { y: 110, type: e.type }));
    }
    flyPhys(e, k) { e.x += e.vx * DT; e.vx *= k; this.keepIn(e); }
    keepIn(e) { const b = this.bounds; if (e.x < b.x0 + 8) e.x = b.x0 + 8; if (e.x > b.x1 - 8) e.x = b.x1 - 8; e.z = clamp(e.z, 2, DEPTH - 2); }
    airPhys(e) {
        const g = 1 + Math.min(1.1, e.j * 0.04);
        e.vy -= GRAV * g * DT; e.x += e.vx * DT; e.y += e.vy * DT; e.z = clamp(e.z, 2, DEPTH - 2);
        const b = this.bounds; if (e.x < b.x0 + 8) { e.x = b.x0 + 8; e.vx = Math.abs(e.vx) * 0.6; } if (e.x > b.x1 - 8) { e.x = b.x1 - 8; e.vx = -Math.abs(e.vx) * 0.6; }
        if (e.y <= 0) {
            e.y = 0;
            if (e.spiked && e.bounces < 2) { e.bounces++; e.spiked = false; e.vy = 430; e.y = 2; this.ev("groundBounce", this.at(e)); this.stompNeighbours(e); return; }
            if (e.vy < -520 && e.bounces < 3) { e.bounces++; e.vy = 190; e.y = 1; e.vx *= 0.6; this.ev("thud", this.at(e, { soft: true })); return; }
            e.vy = 0; e.st = "down"; e.t = 0; e.spiked = false; e.vx *= 0.45;
            this.stats.knockdowns++; this.ev("thud", this.at(e));
        }
    }
    stompNeighbours(e) {
        for (const o of this.enemies) if (o !== e && !o.boss && o.hp > 0 && o.y < 8 && o.st !== "held" && Math.hypot(o.x - e.x, o.z - e.z) < 90) { o.hp -= 8; o.flash = 6; o.st = "air"; o.vy = 300; o.vx = sign(o.x - e.x) * 120; o.y = 3; this.registerHit({ dmg: 8, word: "THUD", freeze: 2, cls: "G" }, o, false); }
    }
    missile(e) {
        e.vy -= GRAV * 0.7 * DT; e.x += e.vx * DT; e.y += e.vy * DT; e.z = clamp(e.z + (e.vz ?? 0) * DT, 2, DEPTH - 2);
        const b = this.bounds;
        if (e.x < b.x0 + 10 || e.x > b.x1 - 10) {
            e.x = clamp(e.x, b.x0 + 10, b.x1 - 10); e.vx *= -0.45; e.vy = 260; e.hp -= 8; this.ev("wall", this.at(e, { y: e.y + 50, dir: sign(e.vx) }));
            this.registerHit({ dmg: 8, word: "WALL", freeze: 6, cls: "G", big: true }, e, true);
        }
        for (const o of this.enemies) {
            if (o === e || o.gone || o.st === "ko" || o.st === "held" || e.hits.has(o.id) || o.hp <= 0) continue;
            if (Math.abs(o.x - e.x) > 44 + o.w || Math.abs(o.z - e.z) > 40 || o.y > e.y + 90) continue;
            e.hits.add(o.id); e.bowled++;
            if (o.boss) { o.hp -= 18; o.flash = 6; this.registerHit({ dmg: 18, word: "BOWLED", freeze: 5, cls: "H", big: true }, o, false); if (o.hp <= 0) { o.hp = 0; this.killBoss(o); } e.vx *= -0.3; continue; }
            o.hp -= 16; o.flash = 8; this.dropToken(o);
            if (o.shield > 0) o.shield = 0;
            o.st = "air"; o.vy = 380; o.vx = sign(e.vx) * 230; o.y = 3; o.t = 0;
            this.registerHit({ dmg: 16, word: e.bowled >= 2 ? "STRIKE" : "BOWLED", freeze: 5, cls: "H", big: true }, o, false);
            this.stats.bowled++;
            if (e.bowled === 3) { this.ev("strike", this.at(o, { word: "STRIKE" })); this.addStyle("STRIKE", 60); }
            if (o.def.bomb) this.explode(o);
        }
        if (e.y <= 0) {
            e.y = 0; e.hp -= 12;
            if (e.def.bomb && e.st === "thrown") { this.explode(e); return; }
            e.st = "air"; e.vy = 200; e.y = 2; e.vx *= 0.4; e.t = 0; e.j = 2;
            this.ev("thud", this.at(e));
        }
    }
    explode(e) {
        e.hp = 0; e.st = "air"; e.vy = 300; e.y = 3; e.vx = 0;
        this.ev("explode", this.at(e, { y: 60 }));
        const h = this.hero;
        if (Math.hypot(h.x - e.x, h.z - e.z) < 96 && h.y < 100) this.hurtHero(e.atk.dmg * this.diff.dmg, { knock: true, dir: sign(h.x - e.x), src: "stink" });
        for (const o of this.enemies) if (o !== e && !o.boss && o.hp > 0 && o.st !== "held" && Math.hypot(o.x - e.x, o.z - e.z) < 120) { o.hp -= 26; o.flash = 8; o.st = "air"; o.vy = 400; o.vx = sign(o.x - e.x) * 220; o.y = 3; this.dropToken(o); this.registerHit({ dmg: 26, word: "PHEW", freeze: 4, cls: "H", big: true }, o, false); }
        for (const p of this.props) if (!p.broken && Math.hypot(p.x - e.x, p.z - e.z) < 120) this.hitProp(p, 20);
    }
    aiMove(e, h) {
        const d = e.def;
        e.cd--; e.wait++;
        const dx = h.x - e.x, dz = h.z - e.z, b = this.bounds;
        e.face = sign(dx) || e.face;
        let tx, tz, sp = d.speed;
        if (e.token) {
            if (d.ranged) { tx = h.x - sign(dx) * Math.min(250, Math.abs(dx)); tz = e.z; }
            else { tx = h.x - sign(dx) * (e.atk.reach * 0.72 + h.w * 0.4); tz = h.z; sp *= 1.25; }
            const near = Math.abs(dx) < e.atk.reach + h.w && Math.abs(dz) < 24;
            if (d.ranged || near) { e.st = "tel"; e.t = 0; e.tgt = { x: h.x, z: h.z }; e.face = sign(dx); this.ev("tel", this.at(e, { y: e.h + 16, kind: e.type, heavy: d.armor })); return; }
            if (e.wait > 420) this.dropToken(e);
        } else {
            // Without the attack token: hang around in a readable ring, both sides if there are enough of them.
            const side = e.side, wob = Math.sin((this.tick + e.id * 40) * 0.024) * 26;
            tx = h.x + side * (d.ring + wob);
            if (tx < b.x0 + 30 || tx > b.x1 - 30) { e.side = -side; tx = h.x - side * (d.ring + wob); }
            tz = clamp(h.z + e.rz, 4, DEPTH - 4); sp *= 0.72;
        }
        const mx = tx - e.x, mz = tz - e.z, l = Math.hypot(mx, mz);
        if (l > 8) { e.vx = (mx / l) * sp; e.vz = (mz / l) * sp * 0.7; e.x += e.vx * DT; e.z += e.vz * DT; e.moving = true; } else { e.moving = false; e.vx = e.vz = 0; }
        this.keepIn(e);
    }
    aiTel(e, h) {
        const a = e.atk;
        e.vx = 0;
        // They keep tracking for the first half, then commit: that's the dodge window.
        if (e.t < a.tel * 0.5 && !e.def.ranged) { e.face = sign(h.x - e.x) || e.face; e.tgt.x = h.x; e.tgt.z = h.z; }
        if (e.def.ranged) { e.tgt.x = e.t < a.tel * 0.6 ? h.x : e.tgt.x; e.tgt.z = e.t < a.tel * 0.6 ? h.z : e.tgt.z; }
        if (e.t >= a.tel) {
            if (e.def.bomb) { this.explode(e); return; }
            e.st = "atk"; e.t = 0; e.hitDone = false;
            this.ev("enemySwing", this.at(e, { kind: e.type, anim: a.anim }));
            if (e.def.ranged) this.lob(e);
            if (a.lunge) e.vx = e.face * a.lunge;
        }
    }
    aiAtk(e, h) {
        const a = e.atk;
        if (a.lunge) { e.x += e.vx * DT; e.vx *= 0.95; e.z += clamp(e.tgt.z - e.z, -1.2, 1.2); }
        this.keepIn(e);
        if (!e.hitDone && e.t <= a.ac && a.reach) {
            const dx = (h.x - e.x) * e.face;
            if (dx > -24 && dx < a.reach + h.w && Math.abs(h.z - e.z) < a.depth && h.y < 86) {
                if (this.hurtHero(a.dmg * this.diff.dmg, { knock: !!a.knock, dir: e.face, src: e.type })) e.hitDone = true;
            }
        }
        if (a.shock && e.t === 3) { this.ev("slamFx", this.at(e, { x: e.x + e.face * a.reach * 0.7 })); this.hazards.push({ type: "ring", x: e.x + e.face * a.reach * 0.7, z: e.z, r: 16, v: 7, w: 16, dmg: 10 * this.diff.dmg, top: 40, life: 16, hit: false }); }
        if (e.t >= a.ac) { e.st = "rec"; e.t = 0; if (e.def.flee) { e.vx = -e.face * 260; e.cd = 140; } }
    }
    lob(e) {
        const t = e.tgt, flight = 42, dx = t.x - e.x, dz = t.z - e.z, y0 = 90;
        this.shots.push({ id: nextId++, kind: this.stageIdx === 2 ? "ball" : this.stageIdx === 3 ? "beaker" : this.stageIdx === 4 ? "book" : "peas", foe: true, x: e.x, y: y0, z: e.z, vx: dx / (flight * DT), vz: dz / (flight * DT), vy: (0.5 * GRAV * 0.9 * flight * DT) - y0 / (flight * DT), g: GRAV * 0.9, r: 34, dmg: e.atk.dmg * this.diff.dmg, life: flight + 2, target: { x: t.x, z: t.z }, flight, born: this.tick, hits: new Set() });
    }

    separate() {
        const a = this.enemies;
        for (let i = 0; i < a.length; i++) {
            const p = a[i]; if (p.y > 0 || p.st === "ko" || p.boss || p.hp <= 0) continue;
            for (let j = i + 1; j < a.length; j++) {
                const q = a[j]; if (q.y > 0 || q.st === "ko" || q.boss || q.hp <= 0) continue;
                const dx = q.x - p.x, dz = q.z - p.z, need = p.w + q.w + 6;
                if (Math.abs(dx) < need && Math.abs(dz) < 20) { const push = (need - Math.abs(dx)) * 0.05, s = sign(dx || 1); if (p.st === "move") p.x -= s * push; if (q.st === "move") q.x += s * push; }
            }
        }
    }

    // --- Things in flight and on the floor ---------------------------------------------------------------------------
    shot(o) { const s = { id: nextId++, foe: true, y: 80, vy: 0, vz: 0, g: 0, r: 30, life: 120, hits: new Set(), born: this.tick, ...o }; this.shots.push(s); return s; }
    hazard(o) { const z = { id: nextId++, t: 0, ...o }; this.hazards.push(z); return z; }
    stepShots() {
        const h = this.hero;
        this.shots = this.shots.filter((s) => {
            s.life--;
            s.vy -= s.g * DT; s.x += s.vx * DT; s.y += s.vy * DT; s.z += s.vz * DT;
            if (s.back && s.life === 34) { s.vx *= -1; s.vz *= -1; s.hits.clear(); }
            if (s.foe) {
                if (Math.abs(s.x - h.x) < s.r + h.w * 0.6 && Math.abs(s.z - h.z) < s.r * 0.9 && s.y < h.y + h.h && s.y + 20 > h.y) {
                    if (this.hurtHero(s.dmg, { dir: sign(s.vx), src: s.kind, knock: s.knock })) { this.ev("splat", this.at(s, { kind: s.kind, big: s.knock })); return false; }
                }
                if (s.target && s.life <= 2) { this.ev("splat", { x: s.target.x, y: 0, z: s.target.z, kind: s.kind }); if (s.spawnPuddle) this.hazard({ type: "acid", x: s.target.x, z: s.target.z, r: 52, life: 240, dmg: 4 }); return false; }
            } else {
                for (const e of this.enemies) {
                    if (s.hits.has(e.id) || e.hp <= 0 || e.st === "held" || e.st === "ko") continue;
                    if (Math.abs(e.x - s.x) < s.r + e.w && Math.abs(e.z - s.z) < 40 + (e.depthW ?? 0) && s.y < e.y + e.h && s.y > e.y - 30) {
                        s.hits.add(e.id); s.pierce--;
                        const m = { dmg: s.dmg, cls: "H", word: s.kind === "mop" ? "THWACK" : s.kind === "tray" ? "CLANG" : "GLOOP", freeze: 5, big: true, knock: true, kb: 200, up: 260, breaks: true, poise: 30 };
                        const save = { face: this.hero.face };
                        this.hero.face = sign(s.vx); const conn = this.hero.conn; this.hitEnemy(this.hero, e, m); this.hero.conn = conn; this.hero.face = save.face;
                        if (s.pierce <= 0) { if (s.puddle) this.hazard({ type: "custard", x: s.x, z: s.z, r: 70, life: 420 }); return false; }
                    }
                }
            }
            if (s.puddle && s.y <= 0) { this.hazard({ type: "custard", x: s.x, z: s.z, r: 70, life: 420 }); this.ev("splat", this.at(s, { kind: "custard", big: true })); return false; }
            if (s.life <= 0 || s.x < this.bounds.x0 - 300 || s.x > this.bounds.x1 + 300) return false;
            return true;
        });
    }
    stepHazards() {
        const h = this.hero;
        this.hazards = this.hazards.filter((z) => {
            z.t++;
            switch (z.type) {
                case "ring":
                    z.r += z.v;
                    if (!z.hit && h.y < z.top && Math.abs(Math.hypot(h.x - z.x, (h.z - z.z) * 1.5) - z.r) < z.w) { if (this.hurtHero(z.dmg, { dir: sign(h.x - z.x), knock: z.knock, src: "ring" })) z.hit = true; }
                    return z.t < z.life;
                case "lane":
                    if (z.t > z.tel && z.t <= z.tel + z.act && !z.hit && Math.abs(h.z - z.z) < z.w && h.y < (z.top ?? 90) && h.x > z.x0 && h.x < z.x1) { if (this.hurtHero(z.dmg, { dir: z.dir ?? 1, knock: true, src: z.kind })) z.hit = true; }
                    if (z.t === z.tel) this.ev("laneFire", { z: z.z, kind: z.kind });
                    return z.t < z.tel + z.act + 12;
                case "drop":
                    if (z.t === z.tel) {
                        this.ev("dropLand", { x: z.x, y: 0, z: z.z, kind: z.kind });
                        if (h.y < 90 && Math.hypot(h.x - z.x, (h.z - z.z) * 1.5) < z.r) this.hurtHero(z.dmg, { dir: sign(h.x - z.x), src: z.kind, knock: z.knock });
                    }
                    return z.t < z.tel + 6;
                case "custard": return z.t < z.life;
                case "acid":
                    if (z.t % 26 === 0 && h.y < 10 && Math.hypot(h.x - z.x, (h.z - z.z) * 1.6) < z.r) this.hurtHero(z.dmg, { dir: h.face, src: "acid", chip: true });
                    return z.t < z.life;
                case "column": {
                    z.x += z.vx * DT;
                    if (Math.abs(h.x - z.x) < z.w && h.y < z.top) { if (!z.hit && this.hurtHero(z.dmg, { dir: sign(z.vx), knock: true, src: z.kind })) z.hit = true; }
                    return z.t < z.life;
                }
            }
            return false;
        });
    }
    stepDrops() {
        const h = this.hero;
        this.drops = this.drops.filter((d) => {
            d.t++;
            d.vy -= GRAV * DT; d.y += d.vy * DT; d.x += d.vx * DT;
            if (d.y <= 0) { d.y = 0; d.vy = 0; d.vx = 0; }
            if (d.t > 18 && Math.abs(d.x - h.x) < 42 && Math.abs(d.z - h.z) < 34 && h.y < 60) {
                if (WEAPONS[d.kind]) { if (!h.wp) { h.wp = { type: d.kind, dur: WEAPONS[d.kind].dur }; this.ev("pickup", this.at(h, { kind: d.kind, weapon: true })); return false; } }
                else {
                    const f = FOOD[d.kind];
                    if (f.meter || h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + f.heal); this.meter = Math.min(METER_BAR * 3, this.meter + f.meter); this.ev("pickup", this.at(h, { kind: d.kind })); return false; }
                }
            }
            return d.t < d.life;
        });
        if (h.wpBreak && h.st !== "atk") { h.wpBreak = false; if (h.wp && h.wp.dur <= 0) { this.ev("weaponBreak", this.at(h, { kind: h.wp.type })); h.wp = null; } }
    }

    // --- Being hit --------------------------------------------------------------------------------------------------
    /** Every source of damage comes here, so fairness and the dodge live in one place. */
    hurtHero(dmg, { knock = false, dir = 1, src = "", chip = false } = {}) {
        const h = this.hero;
        if (h.st === "dodge" && h.inv > 0) {
            if (!h.perfect && h.t <= 14) { h.perfect = true; this.stats.perfects++; this.meter = Math.min(METER_BAR * 3, this.meter + 26); this.addStyle("PERFECT", 60); this.ev("perfect", this.at(h, { word: "NICE TRY" })); this.slow = 26; }
            return false;
        }
        if (h.inv > 0 || h.st === "special" || h.st === "ko" || h.st === "tagin" || h.st === "kd" || h.st === "down") return false;
        dmg = Math.round(dmg);
        h.hp -= dmg; this.stats.dmgTaken += dmg; h.flash = 10; h.inv = chip ? 20 : 50;
        if (chip) { this.ev("chip", this.at(h)); if (h.hp <= 0) this.heroDown(h, dir); return true; }
        this.meter = Math.min(METER_BAR * 3, this.meter + dmg * 0.4);
        if (this.combo) this.endCombo();
        this.style = Math.max(0, this.style - 160);
        if (h.held) this.release(h);
        h.mv = null;
        this.tokenCd = Math.max(this.tokenCd, 40);
        this.ev("hurt", this.at(h, { y: h.y + h.h * 0.6, dmg, knock, src }));
        if (h.hp <= 0) { this.heroDown(h, dir); return true; }
        if (knock) { h.st = "kd"; h.t = 0; h.vy = 340; h.vx = dir * 200; h.y = Math.max(h.y, 2); this.stats.knockdownsTaken = (this.stats.knockdownsTaken ?? 0) + 1; }
        else { h.st = h.y > 0 ? "kd" : "hurt"; h.t = 0; h.stun = 20; h.vx = dir * 150; if (h.y > 0) h.vy = 120; }
        return true;
    }
    heroDown(h, dir) {
        h.hp = 0; h.st = "ko"; h.t = 0; h.vy = 420; h.vx = dir * 160; h.y = Math.max(h.y, 2); h.mv = null; h.ko = true; h.wp = null;
        if (this.combo) this.endCombo();
        this.ev("heroKo", this.at(h));
    }
    afterKo(h) {
        const o = this.other(h);
        if (o.hp > 0) { this.swapIn(h, o, false); return; }
        this.endCombo();
        this.over = { win: false, score: this.score, letter: "F", ratio: this.score / this.cfg.par };
        this.ev("fail", {});
    }
    swap(h) { if (h.held) this.release(h); this.stats.tags++; this.tagCd = 210; const tagged = this.combo > 0; if (tagged) this.addStyle("TAG", 40); this.swapIn(h, this.other(h), true); }
    swapIn(h, o, voluntary) {
        o.x = clamp(h.x - h.face * 40, this.bounds.x0 + 30, this.bounds.x1 - 30); o.z = h.z; o.y = 300; o.vy = -260; o.st = "tagin"; o.t = 0; o.face = h.face; o.inv = 60; o.mv = null; o.held = null; o.vx = 0;
        const out = h; out.mv = null; out.st = "idle"; out.t = 0; out.held = null; out.y = 0; out.ko = out.hp <= 0;
        this.hero = o;
        this.ev("tag", { from: h.key, to: o.key, x: h.x, y: 80, z: h.z, voluntary });
    }

    // --- Specials -----------------------------------------------------------------------------------------------------
    special(h) {
        const bars = Math.min(3, Math.floor(this.meter / METER_BAR));
        this.meter -= bars * METER_BAR;
        if (h.held) this.release(h);
        h.st = "special"; h.t = 0; h.spLevel = bars; h.mv = null; h.vx = h.vz = 0; h.spVy = h.y; h.y = 0; h.vy = 0; h.inv = 90;
        this.stats.specials++; this.addStyle("SPECIAL", 40 * bars);
        this.ev("special", this.at(h, { level: bars, hero: h.key }));
    }
    heroSpecial(h) {
        const L = h.spLevel, dur = [0, 34, 46, 96][L], fire = [0, 14, 20, 60][L];
        if (h.t === fire) {
            const r = [0, 190, 270, 1200][L], dmg = h.key === "dot" ? [0, 30, 52, 110][L] : [0, 20, 36, 70][L];
            this.ev("specialHit", this.at(h, { level: L, hero: h.key, r }));
            for (const e of this.enemies) {
                if (e.hp <= 0 || e.st === "ko" || e.st === "held") continue;
                if (Math.hypot(e.x - h.x, (e.z - h.z) * 1.4) > r + e.w) continue;
                const dir = sign(e.x - h.x) || h.face, wasAir = e.y > 2;
                if (e.boss) { if (e.invuln) continue; const d = Math.round(dmg * 0.9); e.hp -= d; e.flash = 10; this.registerHit({ dmg: d, word: "SOUP", cls: "H", big: true, freeze: 6 }, e, false); if (e.hp <= 0) { e.hp = 0; this.killBoss(e); } continue; }
                e.shield = 0; e.hp -= dmg; e.flash = 10; this.dropToken(e);
                this.registerHit({ dmg, word: h.key === "dot" ? "SOUP" : "TWEET", cls: "H", big: true, freeze: 3 }, e, wasAir);
                if (h.key === "pip" && L === 1 && e.hp > 0) { this.setDizzy(e, 150); continue; }
                e.st = "air"; e.t = 0; e.vy = L >= 2 ? 780 : 420; e.vx = dir * (L === 1 ? 260 : 120); e.y = 3; e.j = 0;
                if (L >= 2) h.lastLaunch = { e, t: this.tick };
            }
            for (const p of this.props) if (!p.broken && Math.hypot(p.x - h.x, p.z - h.z) < r) this.hitProp(p, 30);
            this.shots = this.shots.filter((s) => !s.foe);
        }
        if (h.t >= dur) { h.st = "idle"; h.t = 0; h.inv = 20; }
    }
    at(o, extra) { return { x: o.x, y: o.y, z: o.z, ...extra }; }
}
export { DT, clamp, sign, GRADES };
