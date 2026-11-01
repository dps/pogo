// Kitchen Knockout fight engine. Runs at exactly 60 frames per second of game time, knows nothing about drawing,
// and takes only per-frame button masks, so the same code drives the game, the AI, the training room and the balance sim.
import { BY_ID, FIELD } from "./fighters.js";

export const BTN = { L: 1, R: 2, U: 4, D: 8, A: 16, B: 32, S1: 64, S2: 128, S3: 256, G: 512, T: 1024, X: 2048 };
const BITS = Object.values(BTN);
const { WALL, SEP, GRAV, BUF } = FIELD;
const INTRO = 120, OUTRO = 170, FLASH = 40;

const NEUTRAL = new Set(["stand", "crouch", "guard"]);

class Fighter {
    constructor(i, defId, o = {}) {
        this.i = i;
        this.def = BY_ID[defId];
        this.hpMax = Math.round(this.def.hp * (o.hpScale ?? 1));
        this.dmgScale = (o.dmgScale ?? 1) * (this.def.tuneDmg ?? 1);
        this.auto = !!o.auto;
        this.meter = 0;
        this.wins = 0;
        this.buf = new Int8Array(BITS.length);
        this.prev = 0;
        this.reset(i ? 100 : -100);
    }
    reset(x) {
        this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
        this.face = this.i ? -1 : 1;
        this.hp = this.hpMax; this.st = "stand"; this.t = 0;
        this.mv = null; this.mt = 0; this.stop = 0; this.inv = 0; this.throwInv = 0;
        this.landed = false; this.hitsThisMove = 0; this.lastHit = -99; this.cancelLeft = 0; this.chain = 0; this.routeI = 0;
        this.stun = 0; this.hits = 0; this.comboDmg = 0; this.jug = 0; this.wbUsed = false; this.crouched = false;
        this.dashDir = 0; this.lastF = -99; this.lastB = -99; this.airUsed = false; this.buff = 0; this.armorUsed = false;
        this.grab = null; this.grabbedBy = null; this.fromAir = false; this.counterHit = 0; this.jumpDir = 0; this.lean = 0;
        this.buf.fill(0); this.kdBounce = 0; this.wbFlying = 0; this.outcome = null; this.dashLock = 0;
    }
    get actionable() { return NEUTRAL.has(this.st); }
    get airborne() { return this.y > 0 || this.st === "air" || this.st === "juggle"; }
    get height() { return this.crouching ? this.def.height * 0.66 : this.def.height; }
    get crouching() { return this.st === "crouch" || ((this.st === "guard" || this.st === "gstun") && this.crouched) || (this.mv && (this.mv.id === "2A" || this.mv.pose === "slide")); }
    /** Which phase the current move is in, as seen by anyone watching. */
    get phase() {
        if (!this.mv) return null;
        const m = this.mv;
        return this.mt <= m.s ? "startup" : this.mt <= m.s + m.a ? "active" : "recovery";
    }
}

export class Fight {
    constructor(o) {
        this.o = o;
        this.p = [new Fighter(0, o.a, o.p1), new Fighter(1, o.b, o.p2)];
        this.bestOf = o.rounds ?? 2;
        this.training = !!o.training;
        this.fast = !!o.fast;
        this.time = (o.time ?? FIELD.TIME) * 60;
        this.round = 1;
        this.frame = 0;
        this.ev = [];
        this.proj = [];
        this.flash = 0; this.flashBy = null;
        this.cine = null;
        this.phase = this.fast || this.training ? "fight" : "intro";
        this.phaseT = 0;
        this.winner = null; this.roundWinner = null; this.draws = 0;
        this.adv = null; this.track = null;
        this.stats = [{ hits: 0, best: 0, dmg: 0, supers: 0, blocks: 0, throws: 0 }, { hits: 0, best: 0, dmg: 0, supers: 0, blocks: 0, throws: 0 }];
        this.push("round", { n: this.round });
    }
    push(type, o = {}) { this.ev.push({ type, ...o }); }
    /** Advance one frame with both players' masks. Events pile up in this.ev; the caller drains them. */
    step(m0, m1) {
        this.frame++;
        const [a, b] = this.p;
        if (this.phase === "over") return;
        if (this.phase === "intro") {
            if (++this.phaseT >= INTRO) { this.phase = "fight"; this.phaseT = 0; this.push("fight"); }
            this.idleFloat();
            return;
        }
        if (this.cine) { this.stepCine(); return; }
        if (this.flash > 0) {
            this.flash--;
            this.input(a, m0); this.input(b, m1);     // Buffer only: the world holds for the super flash.
            if (this.flash === 0) { const f = this.p[this.flashBy]; f.stop = 0; }
            return;
        }
        if (this.phase === "ko") {
            if (++this.phaseT >= OUTRO) this.endRound();
            if (this.phaseT === 76 && this.roundWinner !== null) { const w = this.p[this.roundWinner]; if (w.actionable) { w.st = "win"; w.t = 0; w.mv = null; w.vx = 0; } }
            m0 = m1 = 0;
        }
        this.tick(a, b, m0);
        this.tick(b, a, m1);
        this.pushApart(a, b);
        this.stepProj();
        const hitA = this.collect(a, b), hitB = this.collect(b, a);
        if (hitA) this.strike(a, b, hitA);
        if (hitB && !this.cine) this.strike(b, a, hitB);    // A same-frame trade hits both, unless a super just took over.
        if (!this.cine) { this.grabCheck(a, b); this.grabCheck(b, a); }
        this.trackAdvantage();
        if (this.phase === "fight") {
            if (!this.training && this.time > 0 && --this.time === 0) this.timeUp();
            if (this.training) this.trainingRefill();
        }
    }
    idleFloat() { for (const f of this.p) { f.t++; f.face = f.i ? -1 : 1; } }
    input(f, mask) {
        const pressed = mask & ~f.prev;
        f.prev = mask;
        f.mask = mask;
        for (let i = 0; i < BITS.length; i++) {
            if (pressed & BITS[i]) f.buf[i] = BUF;
            else if (f.buf[i] > 0) f.buf[i]--;
        }
        const fwdBit = f.face > 0 ? BTN.R : BTN.L, backBit = f.face > 0 ? BTN.L : BTN.R;
        f.wantDash = 0;
        if (pressed & fwdBit) { if (this.frame - f.lastF < 13 && this.frame - f.lastF > 1) f.wantDash = 1; f.lastF = this.frame; }
        if (pressed & backBit) { if (this.frame - f.lastB < 13 && this.frame - f.lastB > 1) f.wantDash = -1; f.lastB = this.frame; }
    }
    took(f, bit) { const i = BITS.indexOf(bit); if (f.buf[i] > 0) { f.buf[i] = 0; return true; } return false; }
    has(f, bit) { return f.buf[BITS.indexOf(bit)] > 0; }

    tick(f, foe, mask) {
        this.input(f, mask);
        if (f.buff > 0) f.buff--;
        if (f.stop > 0) { f.stop--; return; }
        f.t++;
        if (f.inv > 0) f.inv--;
        if (f.throwInv > 0) f.throwInv--;
        const held = f.mask;
        switch (f.st) {
            case "stand": case "crouch": case "guard": this.neutral(f, foe, held); break;
            case "prejump":
                if (f.t >= 4) {
                    f.st = "air"; f.t = 0; f.vy = f.def.jumpV; f.vx = f.jumpDir * f.def.jumpX * (f.buff ? 1.2 : 1); f.y = 0.1; f.airUsed = false;
                    this.push("jump", { i: f.i, x: f.x });
                }
                break;
            case "dash":
                f.vx = f.dashDir * f.face * f.def.dash * (f.dashDir < 0 ? 0.82 : 1) * (1 - f.t / (f.def.dashT * 1.5)) * (f.buff ? 1.25 : 1);
                if (f.t >= f.def.dashT * (f.dashDir < 0 ? 1.1 : 1)) { f.st = "stand"; f.t = 0; }
                else if (f.dashDir > 0 && f.t > 6 && this.tryAttack(f, foe, held)) { /* dash cancel */ }
                break;
            case "air": this.air(f, foe, held); break;
            case "land":
                f.vx *= 0.7;
                if (f.t >= f.landFor) this.toNeutral(f, foe, held);
                break;
            case "move": this.moveTick(f, foe, held); break;
            case "hit":
                f.vx *= 0.88;
                if (f.t >= f.stun) this.recover(f, foe, held);
                break;
            case "gstun":
                f.vx *= 0.86;
                f.crouched = !!(held & BTN.D);
                if (f.t >= f.stun) this.recover(f, foe, held);
                break;
            case "juggle": this.juggle(f); break;
            case "down":
                f.vx *= 0.85;
                if (f.t >= 28 && !f.koed) { f.st = "rise"; f.t = 0; this.push("rise", { i: f.i }); }
                break;
            case "rise":
                if (f.t >= 20) { f.inv = 6; f.throwInv = 8; this.endCombo(f); this.toNeutral(f, foe, held); }
                break;
            case "thrown": case "grabbing": break;
            case "ko": f.vx *= 0.9; if (f.y > 0) { f.vy -= GRAV; } break;
            case "win": break;
        }
        // Integrate. Grounded and airborne share walls.
        if (f.st !== "thrown" && f.st !== "grabbing") {
            f.x += f.vx;
            if (f.y > 0 || f.vy > 0) {
                f.y += f.vy;
                if (f.st !== "juggle" && f.st !== "ko") f.vy -= f.mv?.hover ? GRAV * 0.5 : GRAV;
                if (f.y <= 0) this.landed(f, foe);
            }
        }
        if (f.x < -WALL) this.wall(f, -1);
        else if (f.x > WALL) this.wall(f, 1);
    }
    wall(f, side) {
        f.x = side * WALL;
        if (f.st === "juggle" && f.wbFlying > 0) {
            f.vx = -side * Math.abs(f.vx) * 0.45; f.vy = 7; f.wbFlying = 0;
            f.stop = 8;
            const o = this.p[1 - f.i]; o.stop = Math.max(o.stop, 8);
            this.push("wall", { i: f.i, x: f.x, y: f.y + 50, side });
        } else if (f.st === "juggle" && Math.abs(f.vx) > 1) f.vx = -f.vx * 0.3;
    }
    landed(f, foe) {
        f.y = 0; f.vy = 0;
        if (f.st === "air") { f.st = "land"; f.t = 0; f.landFor = 3; this.push("land", { i: f.i, x: f.x }); }
        else if (f.st === "move" && f.mv) {
            if (f.mv.air) { f.st = "land"; f.t = 0; f.landFor = 7 - (f.landed ? 3 : 0); f.mv = null; this.push("land", { i: f.i, x: f.x }); }
            else if (f.mv.air2) { f.st = "land"; f.t = 0; f.landFor = 12; f.mv = null; this.push("land", { i: f.i, x: f.x }); }
        } else if (f.st === "juggle") {
            if (f.kdBounce < 1 && Math.abs(f.vyWas ?? 0) > 6) { f.vy = 3.6; f.y = 0.1; f.kdBounce++; this.push("bounce", { i: f.i, x: f.x }); }
            else { f.st = "down"; f.t = 0; f.vy = 0; this.push("knockdown", { i: f.i, x: f.x }); }
        }
        if (f.hp <= 0) this.push("slump", { i: f.i });
    }
    faceFoe(f, foe) { if (Math.abs(foe.x - f.x) > 1) f.face = foe.x > f.x ? 1 : -1; }
    toNeutral(f, foe, held) { f.st = "stand"; f.t = 0; f.mv = null; this.endComboIfFree(f); this.faceFoe(f, foe); this.neutral(f, foe, held); }
    recover(f, foe, held) {
        const was = f.st; f.st = "stand"; f.t = 0; f.stun = 0;
        this.endCombo(f);
        if (was === "gstun" && (held & BTN.G)) { f.st = "guard"; f.crouched = !!(held & BTN.D); }
        else this.neutral(f, foe, held);
    }
    endComboIfFree(f) { if (f.st === "stand") this.endCombo(f); }
    endCombo(f) {
        if (f.hits > 1) this.push("comboEnd", { by: 1 - f.i, hits: f.hits, dmg: f.comboDmg });
        f.hits = 0; f.comboDmg = 0; f.jug = 0; f.wbUsed = false; f.kdBounce = 0;
    }
    neutral(f, foe, held) {
        const fwd = f.face > 0 ? BTN.R : BTN.L, back = f.face > 0 ? BTN.L : BTN.R;
        this.faceFoe(f, foe);
        f.vx *= 0.6;
        if (this.tryAttack(f, foe, held)) return;
        if (held & BTN.G) {
            if (f.st !== "guard") { f.st = "guard"; f.t = 0; this.push("guardup", { i: f.i }); }
            f.crouched = !!(held & BTN.D);
            f.vx = 0;
            return;
        }
        if (held & BTN.U) {
            f.st = "prejump"; f.t = 0; f.jumpDir = held & BTN.R ? 1 : held & BTN.L ? -1 : 0; f.vx = 0;
            return;
        }
        if (f.wantDash) {
            f.st = "dash"; f.t = 0; f.dashDir = f.wantDash; if (f.wantDash < 0) f.inv = 8;
            this.push("dash", { i: f.i, x: f.x, dir: f.wantDash * f.face });
            return;
        }
        if (held & BTN.D) { if (f.st !== "crouch") { f.st = "crouch"; f.t = 0; } f.vx = 0; return; }
        if (f.st !== "stand") { f.st = "stand"; f.t = 0; }
        const speed = f.buff ? 1.28 : 1;
        if (held & fwd) f.vx = f.face * f.def.walkF * speed;
        else if (held & back) f.vx = -f.face * f.def.walkB * speed;
        else f.vx = 0;
    }
    air(f, foe, held) {
        if (!f.airUsed && this.tryAttack(f, foe, held)) f.airUsed = true;
    }
    /** Read the buffer and start the strongest wanted attack, if the current state allows it. */
    tryAttack(f, foe, held, cancelling = false) {
        const def = f.def, fwd = f.face > 0 ? BTN.R : BTN.L, m = def.moves, air = f.y > 0;
        const from = cancelling ? f.mv : null;
        const allow = (mv) => {
            if (!mv) return false;
            if (air && !mv.air) return false;
            if (!air && mv.air) return false;
            if (mv.cost && f.meter < mv.cost) return false;
            if (!from) return true;
            if (mv.rank > from.rank) return true;
            if (from.rank === 1 && mv.rank === 1) return f.chain < 3;
            return false;
        };
        const start = (mv, bit) => { if (bit) this.took(f, bit); this.startMove(f, mv, foe, cancelling); return true; };
        if (f.auto && !air && this.has(f, BTN.A)) {
            const route = def.route;
            // Auto-combo only follows up a hit that landed; into a block it stops, so it can't be a free pressure string.
            let next = cancelling ? (f.confirmed ? route[f.routeI + 1] : null) : route[0];
            if (next === "SUP" && f.meter < 100) next = null;
            if (next && allow(m[next])) { f.routeI = cancelling ? f.routeI + 1 : 0; return start(m[next], BTN.A); }
        }
        if (this.has(f, BTN.X) && allow(m.SUP)) return start(m.SUP, BTN.X);
        for (const [bit, key] of [[BTN.S1, "S1"], [BTN.S2, "S2"], [BTN.S3, "S3"]]) if (this.has(f, bit) && allow(m[key])) return start(m[key], bit);
        if (this.has(f, BTN.T) && !air && !cancelling) return start(m.TH, BTN.T);
        if (this.has(f, BTN.B)) {
            const id = air ? "jB" : held & BTN.D ? "2B" : held & fwd ? "6B" : "5B";
            if (allow(m[id])) return start(m[id], BTN.B);
        }
        if (this.has(f, BTN.A)) {
            const id = air ? "jA" : held & BTN.D ? "2A" : "5A";
            if (allow(m[id])) return start(m[id], BTN.A);
        }
        return false;
    }
    startMove(f, m, foe, cancelling) {
        f.chain = cancelling && m.rank === 1 ? f.chain + 1 : 1;
        if (m.cost) f.meter -= m.cost;
        f.st = "move"; f.t = 0; f.mv = m; f.mt = 0; f.landed = false; f.confirmed = false; f.hitsThisMove = 0; f.lastHit = -99; f.cancelLeft = 0; f.armorUsed = false; f.parried = false;
        // A chained attack steps forward, so a string stays in range through the pushback.
        if (!m.air) { f.vx = cancelling ? f.face * 4 : 0; this.faceFoe(f, foe); }
        this.push("startup", { i: f.i, move: m.id, rank: m.rank, x: f.x, y: f.y });
        if (m.rank === 4) {
            this.flash = FLASH; this.flashBy = f.i;
            this.stats[f.i].supers++;
            this.push("superflash", { i: f.i, x: f.x, y: f.y });
        }
    }
    moveTick(f, foe, held) {
        const m = f.mv;
        f.mt++;
        if (f.hitstopCarry) f.hitstopCarry = 0;
        if (m.inv && f.mt >= m.inv[0] && f.mt <= m.inv[1]) f.inv = Math.max(f.inv, 1);
        if (m.vel) for (const v of m.vel) if (v[0] === f.mt) { f.vx = v[1] * f.face * (f.buff ? 1.15 : 1); if (v[2]) { f.vy = v[2]; f.y = Math.max(f.y, 0.1); } }
        if (!m.air && f.y <= 0) f.vx *= m.vel ? 0.97 : 0.75;
        if (m.proj && f.mt === m.proj.at) this.spawn(f, m.proj);
        if (m.buff && f.mt === m.s) { f.buff = m.buff; this.push("buff", { i: f.i, x: f.x, y: f.y }); }
        if (m.parry && f.mt >= m.parry[0] && f.mt <= m.parry[1]) f.parrying = true; else f.parrying = false;
        if (m.rank <= 2 && f.mt <= 3 && !f.landed) {
            // Two-button chords: a throw or super pressed a hair after a normal replaces it.
            if (this.has(f, BTN.T) && !m.air && m.id !== "TH") { this.took(f, BTN.T); this.startMove(f, f.def.moves.TH, foe, false); return; }
            if (this.has(f, BTN.X) && f.meter >= 100 && !m.air) { this.took(f, BTN.X); this.startMove(f, f.def.moves.SUP, foe, false); return; }
        }
        if (f.landed && f.cancelLeft > 0) {
            f.cancelLeft--;
            if (m.cancel || m.rank === 3) { if (this.tryAttack(f, foe, held, true)) return; }
        }
        const total = m.s + m.a + m.r - (f.buff ? 3 : 0);
        if (f.mt >= total) {
            f.parrying = false;
            f.mv = null; f.t = 0;
            if (f.y > 0) { f.st = "air"; f.airUsed = true; }
            else this.toNeutral(f, foe, held);
        }
    }
    spawn(f, p) {
        if (this.proj.filter((q) => q.by === f.i && q.kind === p.kind).length >= (p.max ?? 2)) return;
        this.proj.push({ ...p, by: f.i, face: f.face, x: f.x + f.face * p.x, y: f.y + p.y, vx: p.vx * f.face, vy: p.vy, t: 0, hitsLeft: p.hits, dead: false, hitStop: 0, grounded: false });
        this.push("proj", { i: f.i, kind: p.kind, x: f.x + f.face * p.x, y: f.y + p.y });
    }
    stepProj() {
        for (const p of this.proj) {
            if (p.hitStop > 0) { p.hitStop--; continue; }
            p.t++;
            if (!p.grounded) { p.x += p.vx; p.y += p.vy; p.vy -= p.g; }
            if (p.ground && p.y <= 16) { p.y = 16; p.grounded = true; p.vx = 0; p.vy = 0; }
            else if (p.y <= 8 && p.g) { p.dead = true; this.push("pop", { kind: p.kind, x: p.x, y: 8 }); }
            if (p.t >= p.life || Math.abs(p.x) > WALL + 30) { if (p.t >= p.life && !p.fuse) this.push("pop", { kind: p.kind, x: p.x, y: p.y }); p.dead = true; }
            if (p.fuse && p.t === p.fuse) { p.armed = true; this.push("fuse", { x: p.x, y: p.y }); }
        }
        // Projectiles clash in the air.
        for (const a of this.proj) for (const b of this.proj) {
            if (a.by !== 0 || b.by !== 1 || a.dead || b.dead || a.fuse || b.fuse) continue;
            if (Math.abs(a.x - b.x) < (a.box[0] + b.box[0]) / 2 && Math.abs(a.y - b.y) < (a.box[1] + b.box[1]) / 2) { a.dead = b.dead = true; this.push("clash", { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }); }
        }
        for (const p of this.proj) {
            if (p.dead || p.hitStop > 0) continue;
            if (p.fuse && !p.armed) continue;
            if (p.fuse && p.t > p.fuse + 10) { p.dead = true; continue; }
            const foe = this.p[1 - p.by];
            if (this.touches(foe, p.x, p.y, p.box[0], p.box[1])) this.projHit(p, foe);
        }
        if (this.proj.some((p) => p.dead)) this.proj = this.proj.filter((p) => !p.dead);
    }
    /** Overlap of a world-space box against a fighter's hurtbox. */
    touches(f, cx, cy, w, h) {
        if (f.koed || f.inv > 0 || f.st === "down" || f.st === "rise" || f.st === "thrown" || f.st === "ko") return false;
        if (f.st === "juggle" && f.jug > 6) return false;
        const hh = f.height, hw = f.def.width + 4;
        return Math.abs(f.x - cx) < hw + w / 2 && Math.abs(f.y + hh / 2 - cy) < hh / 2 + h / 2;
    }
    projHit(p, foe) {
        const att = this.p[p.by];
        if (foe.st === "dash" && foe.dashDir > 0 && foe.def.armorDash) { foe.hp = Math.max(1, foe.hp - Math.round(p.d * 0.25)); this.push("armor", { i: foe.i, x: p.x, y: p.y }); p.dead = true; return; }
        if (foe.mv?.armor && !foe.mv.meleeArmor && this.armored(foe)) { foe.armorUsed = true; foe.hp = Math.max(1, foe.hp - Math.round(p.d * 0.4)); this.push("armor", { i: foe.i, x: p.x, y: p.y }); p.dead = true; return; }
        const m = { id: p.kind, rank: 3, d: p.d, hs: p.hs, bs: p.bs, lvl: p.lvl, push: 4.5, stop: 9, launch: p.launch, chip: 0.14, proj: true };
        this.strike(att, foe, { m, x: p.x, y: p.y, fromProj: p });
        p.dead = true;
    }
    armored(f) { const m = f.mv; return m?.armor && !f.armorUsed && f.mt >= m.armor[0] && f.mt <= m.armor[1]; }
    collect(att, def) {
        const m = att.mv;
        if (att.st !== "move" || !m || m.grab || !m.box[2] || att.stop > 0) return null;
        if (att.mt <= m.s || att.mt > m.s + m.a) return null;
        if (m.every ? (att.hitsThisMove >= m.hitsMax || att.mt - att.lastHit < m.every) : att.hitsThisMove > 0) return null;
        const cx = att.x + att.face * m.box[0], cy = att.y + m.box[1];
        if (!this.touches(def, cx, cy, m.box[2], m.box[3])) return null;
        return { m, x: (cx + def.x) / 2, y: Math.min(cy, def.y + def.height * 0.7) };
    }
    /** One attack connects: decide block, armor or hit, and apply everything that follows. */
    strike(att, def, hit) {
        const m = hit.m;
        if (m.rank === 4 && att.mv !== m) return;
        if (!hit.fromProj) {
            if (def.parrying) { att.hitsThisMove = 99; this.parry(def, att, null); return; }
            att.hitsThisMove++; att.lastHit = att.mt;
        }
        const multi = m.every;
        const stopFrames = m.stop;
        const blocking = (def.st === "guard" || def.st === "gstun") && def.y <= 0 && !(m.lvl === "L" && !def.crouched) && !(m.lvl === "H" && def.crouched);
        if (blocking) {
            const chip = Math.round(m.d * (m.chip ?? 0) * att.dmgScale);
            if (chip > 0) def.hp = Math.max(1, def.hp - chip);
            def.st = "gstun"; def.t = 0; def.stun = m.bs;
            def.vx = (hit.fromProj ? Math.sign(hit.x - def.x) * -1 : att.face) * m.push * 0.9;
            def.stop = Math.round(stopFrames * 0.6);
            if (!hit.fromProj) {
                att.stop = Math.round(stopFrames * 0.6);
                att.landed = true; att.cancelLeft = 10;
                if (Math.abs(def.x) > WALL - 16) att.vx = -att.face * m.push * 0.6;
            }
            att.meter = Math.min(100, att.meter + m.d * 0.03 + (m.meter ?? 0));
            def.meter = Math.min(100, def.meter + m.d * 0.02);
            this.stats[def.i].blocks++;
            this.track = { att: att.i };
            this.push("block", { att: att.i, i: def.i, x: hit.x, y: hit.y, rank: m.rank, dmg: chip, move: m.id });
            return;
        }
        if (def.mv && !m.crush && this.armored(def)) {
            // Light attacks can't crack armor at all, so mashing into it only feeds the swing.
            const light = m.rank === 1;
            if (!light) def.armorUsed = true;
            def.hp = Math.max(1, def.hp - Math.round(m.d * (light ? 0.25 : 0.5)));
            const stop = light ? 4 : 8;
            def.stop = stop; if (!hit.fromProj) { att.stop = stop; att.landed = true; att.cancelLeft = 10; }
            this.push("armor", { i: def.i, x: hit.x, y: hit.y });
            return;
        }
        const counter = def.st === "move" && def.mv && def.phase === "startup" && !hit.fromProj;
        if (m.rank === 4 && m.cine) { this.startCine(att, def); return; }
        const hits = ++def.hits;
        const scale = Math.max(0.3, hits <= 2 ? 1 : 1 - 0.1 * (hits - 2));
        const dmg = Math.max(4, Math.round(m.d * scale * (counter ? 1.25 : 1) * att.dmgScale * (att.auto ? 0.88 : 1) * (att.buff ? 1.1 : 1)));
        def.hp = Math.max(0, def.hp - dmg);
        def.comboDmg += dmg;
        const s = this.stats[att.i];
        s.hits++; s.dmg += dmg; s.best = Math.max(s.best, hits);
        const fromFace = hit.fromProj ? hit.fromProj.face : att.face;
        const launchNow = m.launch && (!multi || (m.lastLaunch ? att.hitsThisMove >= m.hitsMax : true));
        const inAir = def.y > 0 || def.st === "juggle";
        def.mv = null; def.parrying = false; def.grab = null;
        if (launchNow || inAir || m.kd) {
            def.jug += m.rank >= 3 ? 2 : 1;
            def.st = "juggle"; def.t = 0;
            const l = launchNow ? m.launch : [2.2, 5.6];
            def.vx = fromFace * l[0]; def.vy = l[1] - def.jug * 0.28;
            def.y = Math.max(def.y, 0.1);
            if (m.wb && !def.wbUsed) { def.wbFlying = 40; def.wbUsed = true; }
        } else {
            const decay = Math.min(8, Math.floor(hits / 3));
            def.st = "hit"; def.t = 0; def.stun = m.hs - decay + (counter ? 4 : 0);
            def.vx = fromFace * m.push;
            if (!hit.fromProj && Math.abs(def.x) > WALL - 14) att.vx = -att.face * m.push * 0.8;
        }
        const strong = m.rank >= 2;
        def.stop = stopFrames + (counter ? 4 : 0);
        if (!hit.fromProj) {
            att.stop = stopFrames + (counter ? 4 : 0);
            att.landed = true; att.confirmed = true; att.cancelLeft = 12;
        }
        att.meter = Math.min(100, att.meter + dmg * 0.09 + (m.meter ?? 0));
        def.meter = Math.min(100, def.meter + dmg * 0.06);
        this.track = { att: att.i };
        this.push("hit", { att: att.i, i: def.i, x: hit.x, y: hit.y, dmg, rank: m.rank, strong, counter, hits, move: m.id, lvl: m.lvl, wb: !!m.wb, launch: !!launchNow });
        if (def.hp <= 0) this.ko(att, def);
    }
    parry(f, att, proj) {
        f.parrying = false;
        this.push("parry", { i: f.i, x: f.x + f.face * 30, y: f.y + 50 });
        f.meter = Math.min(100, f.meter + 8);
        f.stop = 10; att.stop = 14;
        const c = f.def.moves.S1c;
        f.st = "move"; f.t = 0; f.mv = c; f.mt = 0; f.landed = false; f.hitsThisMove = 0; f.lastHit = -99; f.armorUsed = false;
    }
    /** Throws and command grabs. Air, stun and wakeup all beat them. */
    grabCheck(att, def) {
        const m = att.mv;
        if (att.st !== "move" || !m?.grab || att.stop > 0) return;
        if (att.mt <= m.s || att.mt > m.s + m.a || att.hitsThisMove) return;
        if (def.y > 0 || def.st === "hit" || def.st === "gstun" || def.st === "down" || def.st === "rise" || def.st === "juggle" || def.st === "thrown" || def.st === "ko" || def.inv > 0 || def.throwInv > 0) return;
        const cx = att.x + att.face * m.box[0];
        if (Math.abs(cx - def.x) > m.box[2] / 2 + def.def.width) return;
        att.hitsThisMove = 1;
        if (def.parrying) { this.parry(def, att, null); return; }     // Snap Trap catches hands as well as hits.
        if (m.rank === 4) { this.startCine(att, def); return; }
        if (!m.cmd && (this.has(def, BTN.T) || (def.st === "move" && def.mv === def.def.moves.TH && def.mt <= 6))) {
            // Throw break: both spring apart.
            for (const f of [att, def]) { f.mv = null; f.st = "gstun"; f.t = 0; f.stun = 12; f.vx = -f.face * 6; }
            this.push("tech", { x: (att.x + def.x) / 2, y: 60 });
            return;
        }
        if (m.cmd && def.st === "move" && def.mv === def.def.moves.TH) { /* A plain throw never stops a command grab. */ }
        def.mv = null; def.parrying = false;
        att.st = "grabbing"; att.t = 0; def.st = "thrown"; def.t = 0; def.vx = att.vx = 0; def.y = 0;
        att.grab = { t: 0, dur: m.cmd ? 62 : 48, m, techable: !m.cmd };
        def.grabbedBy = att.i;
        this.stats[att.i].throws++;
        this.push("grab", { i: att.i, kind: m.grab, cmd: !!m.cmd, x: att.x, y: 60 });
    }
    finishGrab(att, def) {
        const g = att.grab, m = g.m, scale = 1;
        const dmg = Math.round(m.d * scale * att.dmgScale);
        def.hp = Math.max(0, def.hp - dmg);
        def.hits = 1; def.comboDmg = dmg;
        att.grab = null; att.mv = null;
        att.st = "move"; att.mv = { ...m, s: 0, a: 0, r: 14, grab: null, box: [0, 0, 0, 0], vel: null, rank: 2, cancel: false, proj: null }; att.mt = 0; att.t = 0;
        def.st = "juggle"; def.t = 0; def.x = clampWall(att.x + att.face * 42); def.y = 30; def.vx = att.face * 4.2; def.vy = 6.5; def.jug = 3; def.grabbedBy = null;
        att.meter = Math.min(100, att.meter + dmg * 0.08 + (m.meter ?? 0));
        def.meter = Math.min(100, def.meter + dmg * 0.05);
        this.stats[att.i].dmg += dmg;
        att.stop = 12; def.stop = 12;
        this.push("hit", { att: att.i, i: def.i, x: def.x, y: 50, dmg, rank: 3, strong: true, counter: false, hits: 1, move: m.id, lvl: "M", grabHit: true });
        if (def.hp <= 0) this.ko(att, def);
    }
    juggle(f) {
        f.vyWas = f.vy;
        f.vy -= GRAV * (0.95 + Math.min(0.5, f.jug * 0.08));
        if (f.wbFlying > 0) f.wbFlying--;
    }
    pushApart(a, b) {
        for (const g of [a, b]) if (g.st === "grabbing") this.stepGrab(g, this.p[1 - g.i]);
        if (a.st === "thrown" || b.st === "thrown" || a.st === "ko" || b.st === "ko") return;
        // Screen limit: nobody walks out of the camera.
        const gap = b.x - a.x;
        if (Math.abs(gap) > SEP) {
            const over = (Math.abs(gap) - SEP) / 2 * Math.sign(gap);
            a.x += over; b.x -= over;
        }
        const noPush = (f) => f.st === "down" || f.st === "rise";
        if (noPush(a) || noPush(b)) return;
        const need = (a.def.width + b.def.width) * 1.26, dx = b.x - a.x;
        if (Math.abs(dx) >= need) return;
        if (Math.abs(a.y - b.y) > Math.min(a.def.height, b.def.height) * 0.7) return;
        const dir = dx === 0 ? (a.face || 1) : Math.sign(dx), over = need - Math.abs(dx);
        a.x -= dir * over / 2; b.x += dir * over / 2;
        for (const [f, side] of [[a, -dir], [b, dir]]) {
            if (Math.abs(f.x) > WALL) {
                const excess = Math.abs(f.x) - WALL; f.x = Math.sign(f.x) * WALL;
                const o = f === a ? b : a; o.x -= side * excess;
            }
        }
    }
    stepGrab(att, def) {
        const g = att.grab;
        if (!g) return;
        g.t++;
        const k = g.t / g.dur, up = Math.sin(k * Math.PI);
        def.x = clampWall(att.x + att.face * (46 - (g.m.grab === "store" ? 34 * Math.min(1, k * 3) : 0)));
        def.y = g.m.grab === "store" ? 16 * up : 56 * up;
        def.face = -att.face;
        if (g.techable && g.t < 8 && this.has(def, BTN.T)) {
            att.grab = null; att.mv = null; att.st = "gstun"; att.t = 0; att.stun = 12; att.vx = -att.face * 6;
            def.st = "gstun"; def.t = 0; def.stun = 12; def.vx = att.face * 6; def.y = 0; def.grabbedBy = null;
            this.push("tech", { x: (att.x + def.x) / 2, y: 60 });
            return;
        }
        if (g.t >= g.dur) this.finishGrab(att, def);
    }
    // --- Super cinematics ------------------------------------------------------------------
    startCine(att, def) {
        const m = att.mv, c = m.cine;
        const scale = 1 - Math.min(0.5, def.hits * 0.08);
        def.mv = null; def.parrying = false; def.st = "thrown"; def.t = 0; def.vx = 0; def.vy = 0; def.y = 0; def.grab = null;
        att.st = "grabbing"; att.t = 0; att.vx = 0; att.grab = null;
        this.cine = { by: att.i, t: 0, dur: c.dur, hits: c.hits, scale, m, startX: att.x, foeX: def.x };
        this.proj = [];
        this.push("cine", { i: att.i, foe: def.i, id: att.def.id });
    }
    stepCine() {
        const c = this.cine, att = this.p[c.by], def = this.p[1 - c.by];
        c.t++; att.t++; def.t++;
        for (const [at, d] of c.hits) if (at === c.t) {
            const last = at === c.hits[c.hits.length - 1][0];
            const dmg = Math.round(d * c.scale * att.dmgScale * (att.auto ? 0.9 : 1));
            const room = Math.max(last ? 0 : 1, def.hp - dmg);
            def.hp = room;
            this.stats[att.i].dmg += dmg;
            att.meter = Math.min(100, att.meter + 1);
            this.push("cinehit", { att: att.i, i: def.i, last, dmg, n: c.hits.findIndex((h) => h[0] === at) });
        }
        if (c.t >= c.dur) {
            const dir = att.face;
            this.cine = null;
            att.st = "stand"; att.t = 0; att.mv = null; att.grab = null;
            def.st = "juggle"; def.t = 0; def.y = 30; def.vx = dir * 5; def.vy = 7; def.jug = 9; def.grabbedBy = null;
            def.x = clampWall(att.x + dir * 80);
            this.push("cineEnd", { i: att.i });
            if (def.hp <= 0) this.ko(att, def);
        }
    }
    // --- Round flow ----------------------------------------------------------------------
    ko(att, def) {
        if (this.phase !== "fight") return;
        if (this.training) { def.hp = 1; return; }
        def.st = "juggle"; def.koed = true;
        this.phase = "ko"; this.phaseT = 0; this.roundWinner = att.i;
        att.wins++;
        this.push("ko", { i: def.i, by: att.i, x: def.x, y: def.y + 50 });
    }
    timeUp() {
        const [a, b] = this.p, ra = a.hp / a.hpMax, rb = b.hp / b.hpMax;
        const win = Math.abs(ra - rb) < 1e-6 ? null : ra > rb ? 0 : 1;
        this.phase = "ko"; this.phaseT = 0; this.roundWinner = win;
        if (win !== null) this.p[win].wins++; else this.draws++;
        this.push("timeup", { win });
    }
    endRound() {
        const [a, b] = this.p;
        for (const f of [a, b]) f.koed = false;
        if (a.wins >= this.bestOf || b.wins >= this.bestOf || this.round >= this.bestOf * 2 + 1) {
            this.phase = "over";
            this.winner = a.wins === b.wins ? (a.hp >= b.hp ? 0 : 1) : a.wins > b.wins ? 0 : 1;
            this.push("over", { win: this.winner });
            return;
        }
        this.round++;
        a.reset(-100); b.reset(100); this.proj = [];
        this.time = (this.o.time ?? FIELD.TIME) * 60;
        this.phase = this.fast ? "fight" : "intro"; this.phaseT = 0; this.roundWinner = null;
        this.push("round", { n: this.round });
    }
    trainingRefill() {
        for (const f of this.p) if (f.actionable && f.hits === 0 && f.hp < f.hpMax) {
            if ((f.idle = (f.idle ?? 0) + 1) > 50) { f.hp = f.hpMax; f.idle = 0; }
        } else f.idle = 0;
        if (this.o.fullMeter) for (const f of this.p) f.meter = 100;
    }
    /** Frame advantage after an exchange: the training room's headline number. */
    trackAdvantage() {
        const tr = this.track;
        if (!tr) return;
        const a = this.p[tr.att], d = this.p[1 - tr.att];
        const free = (f) => f.actionable || f.st === "air";
        if (free(a) && tr.aFree === undefined) tr.aFree = this.frame;
        if (free(d) && tr.dFree === undefined) tr.dFree = this.frame;
        if (tr.aFree !== undefined && tr.dFree !== undefined) { this.adv = tr.dFree - tr.aFree; this.track = null; this.push("adv", { adv: this.adv }); }
    }
    drain() { const e = this.ev; this.ev = []; return e; }
}
const clampWall = (x) => Math.max(-WALL, Math.min(WALL, x));
