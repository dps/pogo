// A run through one stage: the moth, the song clock, enemies, bosses, grazing, bombs and score.
import { button, pos, ui as uiC } from "./pogo.js";
import { Bullets, FIELD_W, Fx, Motes } from "./bullets.js";
import { ensureFrame, ensureSky, ACOLS, AMBER, AROWS, GLOW, GOLD, JADE, PEARL, RING, ROSE, STAR, ENEMY, DASH } from "./art.js";
import { Conductor, Director, marchAt } from "./director.js";
import { DIFFS, STAGES } from "./stages.js";
import { SONGS } from "./music.js";
import { SND } from "./sfx.js";
import { bossStep, drawBoss, makeBoss } from "./bosses.js";
import { FONT, drawHud, HudFx } from "./ui.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const SHOTS = 96, BOMB_RADIUS = 860, CHARGE_NEED = 90, MAX_BOMBS = 3;

export const newRun = (diff) => ({ diff, score: 0, shown: 0, lives: DIFFS[diff].lives, bombs: 1, charge: 0, mult: 1, graze: 0, continues: 0, deaths: 0, bombsUsed: 0, stage: 0, peak: 0 });

export class Play {
    constructor(game, s, a, ctx) {
        this.game = game; this.s = s; this.a = a; this.ctx = ctx;
        const r = (game.data.run ??= newRun(ctx.save.diff ?? 0));
        this.run = r; this.diff = DIFFS[a.practice ? a.practice.diff ?? ctx.save.diff : r.diff]; this.stage = STAGES[a.stage ?? 0]; this.practice = a.practice ?? null;
        ensureSky(game.assets, this.stage.sky); ensureFrame(game.assets);
        this.W = FIELD_W; this.bullets = new Bullets(); this.motes = new Motes(); this.fx = new Fx(game.fxRng); this.cond = new Conductor(game); this.dir = new Director(this); this.hud = new HudFx();
        this.layout();
        this.moth = { x: 180, y: this.H + 30, lastX: 180, lastY: this.H + 30, hitR: 1.6, grazeR: 17, focus: 0, inv: 3, alive: true, flap: 0, tilt: 0, glow: 0, respawn: 0, enter: 1, aura: 0, hitT: 0 };
        this.enemies = []; this.boss = null; this.mode = "waves"; this.shots = { x: new Float32Array(SHOTS), y: new Float32Array(SHOTS), a: new Float32Array(SHOTS), n: 0 };
        this.bombT = 0; this.bombR = 0; this.bombX = 0; this.bombY = 0; this.fireT = 0; this.rush = 0; this.rushScore = 0; this.rushIdle = 0; this.heat = 0; this.grazeHeld = 0; this.lastTick = -99; this.grazeT = 99; this.step_ = 0;
        this.paused = false; this.over = false; this.pops = []; this.title = 1; this.bannerT = 4; this.banner = this.stage.name; this.touch = new Set(); this.dragOff = false; this.keyUsed = false; this.moved = 0; this.well = null;
        this.stars = this.makeStars(); this.scroll = 0; this.beatPulse = 0; this.downPulse = 0; this.lastBeat = -1; this.dps = 0; this.hurtFlash = 0; this.tally = null; this.phaseI = -1; this.clearT = 0; this.alpha = 0;
        if (!this.practice) { this.ctx.unlock(`s${this.stage.id}`); r.stage = Math.max(r.stage, this.stage.id - 1); }
        this.startMusicAndScript();
        const big = s.view.scale < 0.8 ? 1.5 : 1;
        this.bombBtn = s.add([button("", { action: "bomb", width: 78 * big, height: 78 * big, color: "#00000000", radius: 39 * big, onTap: () => this.bomb() }), uiC(), pos(0, 0), "hudbtn"]);
        this.pauseBtn = s.add([button("II", { action: "pause", width: 48 * big, height: 48 * big, color: "#ffffff14", textColor: "#ffe9c0", textSize: 15 * big, radius: 24 * big, onTap: () => this.togglePause() }), uiC(), pos(0, 0), "hudbtn"]);
        this.placeButtons();
        s.add([uiC(), { update: () => this.step() }]);
        s.onDraw((d) => this.draw(d));
        s.onDrawUI((d) => drawHud(d, this));
        s.on("resize", () => { this.layout(); this.placeButtons(); });
        this.offHide = game.on("hide", () => { if (game.current === s && !this.over) this.setPaused(true); });
    }

    layout() {
        const v = this.s.view; this.vw = v.width; this.vh = v.height;
        this.H = Math.max(640, Math.min(v.height, 790)); this.ox = Math.max(0, Math.round((v.width - FIELD_W) / 2)); this.wide = v.width >= 560;
        this.bullets.w0 = FIELD_W; this.bullets.h0 = this.H;
    }
    placeButtons() {
        const v = this.s.view, sa = v.safe ?? { top: 0, bottom: 0, left: 0, right: 0 }, bw = this.bombBtn.size.x / 2, pw = this.pauseBtn.size.x / 2;
        if (this.wide) { this.bombBtn.pos = [this.ox / 2, v.height - bw - 14 - (sa.bottom ?? 0)]; this.pauseBtn.pos = [v.width - this.ox / 2, pw + 8 + (sa.top ?? 0)]; }
        else { this.bombBtn.pos = [v.width - bw - 6 - (sa.right ?? 0), v.height - bw - 8 - (sa.bottom ?? 0)]; this.pauseBtn.pos = [v.width - pw - 6 - (sa.right ?? 0), pw + 6 + (sa.top ?? 0)]; }
    }
    makeStars() { const r = this.game.fxRng, out = []; for (let i = 0; i < 90; i++) out.push({ x: r.range(0, 1), y: r.range(0, 1), s: r.range(4, 13), f: r.range(0.4, 2.4), p: r.range(0, 6.3), z: r.range(0.04, 0.3), h: r.pick([PEARL, PEARL, GOLD, 3, 5]) }); return out; }

    startMusicAndScript() {
        const c = this.dir, P = this.practice;
        if (this.a.fromPhase !== undefined) { this.beginBoss(this.a.fromPhase); this.bannerT = 0; return; }
        if (P) {
            if (P.type === "wave") {
                this.cond.play(SONGS[this.stage.song]);
                const w = this.stage.waves[P.i], self = this;
                this.waveName = w.name;
                c.run((function* () { yield 2; for (;;) { yield* w.fn(c); self.practiceLap(); yield 4; } })(), "main", 0);
            } else this.beginBoss(P.i);
            this.run.lives = 99; this.run.bombs = Math.max(this.run.bombs, 2); this.banner = P.name; return;
        }
        const self = this, stage = this.stage;
        this.cond.play(SONGS[stage.song]);
        c.run((function* () {
            yield stage.id === 1 ? 2 : self.cond.meter * 2;
            for (const w of stage.waves) { self.ctx.unlock(`${stage.id}:w:${w.id}`); self.waveName = w.name; yield* w.fn(c); }
            yield self.cond.meter;
            self.bannerT = 0;
            c.fire(() => self.beginBoss(0));
        })(), "main", 0);
    }
    practiceLap() { this.ctx.bestLap?.(this); this.hud.say("again", 1.2); }

    /** Boss music starts at bar one and everything counts from there. */
    beginBoss(i) {
        this.dir.clear(); this.flipAll(false);
        this.cond.play(SONGS[this.stage.bossSong]);
        this.dir.lastBell = -1;
        const b = (this.boss = makeBoss(this, this.stage.boss)); this.mode = "bossIn";
        b.y = -120; this.dir.cursor = 0; this.dir.owner = null; this.dir.glide(b, b.home[0], b.home[1], this.cond.meter);
        this.hud.bossName = this.stage.boss.name; this.hud.bossT = 3.4;
        this.startPhase(i, this.cond.meter * 2);
    }
    startPhase(i, at) {
        const b = this.boss, ph = b.def.phases[i], c = this.dir, owner = "phase";
        this.mode = "gap"; this.phaseI = i; this.nextAt = at; this.phaseDef = ph;
        c.cursor = at; c.owner = owner;
        for (const t of ph.tracks) c.run(t(c, b), owner, at);
        c.fire(() => {
            this.mode = "phase"; this.phaseEnd = at + ph.bars * this.cond.meter; b.hp = b.hpMax = (ph.hp * (0.8 + this.diff.lvl * 0.2)) || 1; b.timed = !!ph.timed; ph.enter?.(b, this);
            this.ctx.unlock(`${this.stage.id}:p:${ph.id}`); this.hud.say(ph.name, 2.4, true); this.game.sfx(SND.phase, { haptic: "medium" }); this.s.shake(3, 0.2, { haptic: false });
            this.fx.ring(b.x, b.y, GOLD, 40, 420, 0.8, 0.8); this.phaseStartScore = this.run.score; this.phaseDeaths = this.run.deaths;
        }, at);
    }
    endPhase(won) {
        const b = this.boss, ph = this.phaseDef, c = this.dir, last = this.phaseI >= b.def.phases.length - 1;
        ph.leave?.(b, this);
        c.clear(); this.mode = "gap";
        this.flipAll(true);
        const clean = this.run.deaths === this.phaseDeaths;
        if (won) { const bonus = Math.round((3000 + this.phaseI * 1500) * this.diff.score * this.run.mult * (clean ? 2 : 1)); this.addScore(bonus, true); this.pop(b.x, b.y + 40, `+${bonus.toLocaleString("en-US")}`, "#ffe9a8", 22); if (clean) this.hud.say("untouched", 1.6); }
        this.game.sfx(SND.phase, { haptic: "heavy" }); this.s.shake(7, 0.35, { haptic: false }); this.s.flash("#ffe9c033", 0.25); this.fx.burst(b.x, b.y, 50, GOLD, 260, 0.9, 18); this.fx.ring(b.x, b.y, PEARL, 30, 500, 0.9, 1); this.hold = 0.09;
        if (this.practice) { this.finishPractice(won); return; }
        if (last) { this.bossDown(); return; }
        const m = this.cond.meter, at = (Math.floor(this.cond.beat / m) + 2) * m;
        this.startPhase(this.phaseI + 1, at);
    }
    bossDown() {
        const b = this.boss; this.mode = "dying"; this.clearT = 3.2; b.dying = 1;
        this.game.sfx(SND.bossDie, { haptic: "heavy" }); this.s.shake(14, 1.2, { haptic: false }); this.s.flash("#fff3d0aa", 0.6); this.hold = 0.16;
        for (let i = 0; i < 6; i++) this.fx.ring(b.x, b.y, [GOLD, PEARL, ROSE, 3, 5, AMBER][i], 20, 560, 1.2, 0.9, i * 0.14);
    }
    stageClear() {
        this.mode = "clear"; this.cond.stop(); this.boss = null; this.game.sfx(SND.clear, { haptic: "success" });
        const r = this.run, lifeBonus = r.lives * 10000, grazeBonus = r.grazeStage * 20 | 0, total = Math.round((20000 * this.stage.id + lifeBonus + grazeBonus) * this.diff.score);
        this.tally = { t: 0, rows: [["Night survived", 20000 * this.stage.id], ["Moths remaining", lifeBonus], ["Light grazed", grazeBonus]], total, added: false };
        r.bombs = Math.min(MAX_BOMBS, r.bombs + 1);
    }
    leaveStage() {
        if (this.left) return; this.left = true;
        const r = this.run; if (!this.tally.added) { this.addScore(this.tally.total, true); this.tally.added = true; }
        r.grazeStage = 0;
        const i = this.stage.id;              // Next index, because ids count from one.
        if (i >= 6) this.ctx.finish(this, "flame");
        else if (i === 5 && r.continues > 0) this.ctx.finish(this, "dawn");
        else this.game.go("play", { stage: i }, { fade: 0.7 });
    }
    finishPractice(won) { this.cond.stop(); this.over = true; this.mode = "pdone"; this.hud.practiceDone = { won, deaths: this.run.deaths }; this.ctx.practiceOver(this, won); }

    addScore(n, flat = false) { this.run.score += Math.round(flat ? n : n * this.run.mult * this.diff.score); }
    pop(x, y, str, color = "#ffe9a8", size = 14) { if (this.pops.length < 24) this.pops.push({ x, y, str, color, size, t: 0 }); }

    // --- Step ---------------------------------------------------------------------------------------------------

    step() {
        if (this.paused || this.over) { return; }
        this.step_++;
        const dt0 = this.game.dt, sdt = this.cond.step(dt0), dt = this.hold > 0 ? 0 : sdt;
        if (this.hold > 0) this.hold -= dt0;
        this.bullets.march = marchAt(this.cond.beat);
        this.dir.update(this.cond.beat);
        const beat = this.cond.beat;
        const fl = Math.floor(beat); if (fl !== this.lastBeat) { this.lastBeat = fl; this.beatPulse = 1; if (fl % this.cond.meter === 0) this.downPulse = 1; }
        this.beatPulse *= Math.pow(0.002, dt0); this.downPulse *= Math.pow(0.02, dt0);
        this.input(dt0);
        this.stepMoth(dt0);
        this.bullets.gravity = this.well;
        const m = this.moth;
        this.bullets.step(dt, m, (i) => this.grazed(i));
        m.lastX = m.x; m.lastY = m.y;
        this.run.peak = Math.max(this.run.peak, this.bullets.count);
        if (this.bullets.hit && m.alive && m.inv <= 0 && m.hitT <= 0) this.struck();
        this.stepShots(dt0);
        this.stepEnemies(dt0, beat);
        if (this.boss) { bossStep(this, this.boss, dt0, beat); if (this.mode === "phase") { if (this.boss.timed ? beat >= this.phaseEnd : this.boss.hp <= 0) this.endPhase(!this.boss.timed || true); else if (beat >= this.phaseEnd) this.endPhase(false); } }
        this.stepBomb(dt);
        this.stepScore(dt0);
        this.motes.step(dt0, m.x, m.y, (hue) => this.gotMote(hue));
        this.fx.step(dt0);
        for (let i = this.pops.length - 1; i >= 0; i--) { const q = this.pops[i]; q.t += dt0; q.y -= 22 * dt0; if (q.t > 1.1) this.pops.splice(i, 1); }
        this.scroll += dt0 * (this.mode === "phase" ? 6 : 16);
        this.hud.step(dt0, this);
        if (this.bannerT > 0) this.bannerT -= dt0;
        if (this.mode === "dying") {
            this.clearT -= dt0; const b = this.boss;
            if (this.step_ % 3 === 0 && b) { const t = this.game.fxRng.range(0, TAU), q = this.game.fxRng.range(0, 60); this.fx.burst(b.x + Math.cos(t) * q, b.y + Math.sin(t) * q, 4, [GOLD, ROSE, 3, 5][this.step_ % 4], 180, 0.7, 16); }
            if (this.clearT <= 0) this.stageClear();
        }
        if (this.mode === "clear") { const T = this.tally; T.t += dt0; if (Math.floor(T.t * 30) !== Math.floor((T.t - dt0) * 30) && T.t < 1.6) this.game.sfx(SND.tally); if (T.t > (this.bot ? 0.5 : 4.5)) this.leaveStage(); }
        if (this.gameoverT > 0) { this.gameoverT -= dt0; if (this.gameoverT <= 0) this.gameOver(); }
    }

    input(dt) {
        const ip = this.s.input, m = this.moth, t = ip.touches, ids = new Set();
        let dx = 0, dy = 0, focusHeld = false, bombNow = false;
        const b = this.bot;
        if (b) { dx = b.dx ?? 0; dy = b.dy ?? 0; focusHeld = !!b.focus; bombNow = !!b.bomb; b.bomb = false; }
        else {
            const bb = this.bombBtn, cx = bb.worldPos ? bb.pos.x : 0, cy = bb.pos.y;
            let fingers = 0;
            for (const q of t) {
                ids.add(q.id);
                const fresh = !this.touch.has(q.id);
                if (fresh && Math.hypot(q.x - cx, q.y - cy) < 46) { bombNow = true; this.bombFinger = q.id; }
                if (q.id !== this.bombFinger) fingers++;
            }
            this.touch = ids; if (!ids.has(this.bombFinger)) this.bombFinger = null;
            focusHeld = fingers >= 2 || ip.down("focus");
            const ptr = ip.pointer;
            if (ptr.pressed) this.dragOff = this.bombFinger !== null && fingers === 0;
            if (ptr.down && !this.dragOff && !this.paused) { const g = this.ctx.save.sense ?? 1.25; dx = ptr.dx * g; dy = ptr.dy * g; }
            const mv = ip.move;
            if (mv.x || mv.y) { const sp = (focusHeld ? 96 : 215) * dt; dx += mv.x * sp; dy += mv.y * sp; this.keyUsed = true; }
            if (bombNow) this.bomb();
        }
        if (b && bombNow) this.bomb();
        // Focus by hand, or by itself when the air gets close. Either way the hand slows and the dot shows.
        const auto = (this.ctx.save.autoFocus ?? true) && this.bullets.danger >= 3 ? 1 : 0, want = focusHeld ? 1 : auto;
        m.focus += (want - m.focus) * clamp(dt * (want > m.focus ? 14 : 6));
        const slow = 1 - 0.46 * m.focus * (focusHeld ? 1 : 0.8);
        if (m.alive && m.enter <= 0) {
            // A flick is banked, not lost: the moth catches up at top speed, so the thumb never slips.
            let mx = dx * (b ? 1 : slow) + (m.bx ?? 0), my = dy * (b ? 1 : slow) + (m.by ?? 0); m.bx = 0; m.by = 0;
            const lim = 8.2, q = Math.hypot(mx, my); if (q > lim) { const k = lim / q; m.bx = mx * (1 - k); m.by = my * (1 - k); mx *= k; my *= k; }
            m.x = clamp(m.x + mx, 7, FIELD_W - 7); m.y = clamp(m.y + my, 12, this.H - 12);
            m.tilt += (clamp(mx * 0.12, -0.5, 0.5) - m.tilt) * 0.2;
            if (q > 0.2) this.moved += q;
        }
    }

    stepMoth(dt) {
        const m = this.moth;
        if (m.inv > 0) m.inv -= dt;
        m.flap += dt * (m.focus > 0.5 ? 16 : 26);
        m.aura += (Math.min(1, (this.run.mult - 1) / 3 + this.run.bombs * 0.1) - m.aura) * clamp(dt * 3);
        if (m.hitT > 0) { m.hitT -= dt; if (m.hitT <= 0) this.die(); }
        if (!m.alive) {
            m.respawn -= dt;
            if (m.respawn <= 0 && !this.gameoverT && !this.tallyOver) { m.alive = true; m.enter = 1; m.x = 180; m.y = this.H + 26; m.lastX = m.x; m.lastY = m.y; m.inv = 3.4; this.game.sfx(SND.respawn, { haptic: "light" }); }
        }
        if (m.enter > 0 && m.alive) {
            const goal = this.H - 110; m.y += (goal - m.y) * clamp(dt * 3.6); m.lastY = m.y; m.enter -= dt * 1.3;
        }
        if (this.well && m.alive) { const dx = this.well.x - m.x, dy = this.well.y - m.y, q = Math.hypot(dx, dy) + 1, f = this.well.pull * dt; m.x += dx / q * f; m.y += dy / q * f; }
        if (m.alive && this.step_ % 2 === 0) this.fx.add(m.x + this.fx.rng.range(-4, 4), m.y + 9, { vy: 40, vx: this.fx.rng.range(-14, 14), life: 0.4, s0: 7 + m.aura * 9, s1: 0, a: 0.5, hue: GOLD });
    }

    grazed(i) {
        const r = this.run, b = this.bullets, m = this.moth; if (!m.alive) return;
        r.graze++; r.grazeStage = (r.grazeStage ?? 0) + 1; r.mult = Math.min(8, r.mult + 0.025); this.addScore(40); this.heat = Math.min(30, this.heat + 1.6); this.grazeT = 0; this.grazeHeld++;
        const a = Math.atan2(b.y[i] - m.y, b.x[i] - m.x), v = 90;
        this.fx.add(m.x + Math.cos(a) * 12, m.y + Math.sin(a) * 12, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.22, s0: 12, s1: 0, hue: b.hue[i], kind: STAR, drag: 0.1 });
        if (r.bombs < MAX_BOMBS) { r.charge += 1 / CHARGE_NEED; if (r.charge >= 1) { r.charge -= 1; r.bombs++; this.game.sfx(SND.charge, { haptic: "success" }); this.fx.ring(m.x, m.y, GOLD, 10, 90, 0.5); this.hud.say("your light is ready", 1.5); this.ctx.tip?.("bomb"); } }
        else r.charge = 1;
    }
    /** Ticks speed up as you hold your nerve: one every quarter second at first, a purr at the peak. */
    grazeHaptics() {
        if (this.grazeHeld <= 0) return;
        const k = clamp(this.heat / 18), gap = Math.round(16 - 13 * k), now = this.game.stepCount;
        if (now - this.lastTick >= gap) { this.lastTick = now; this.grazeHeld = 0; this.game.haptic("tick"); this.game.sfx(SND.graze(k)); }
    }

    stepScore(dt) {
        const r = this.run; this.grazeT += dt; this.heat = Math.max(0, this.heat - dt * (this.grazeT > 0.5 ? 14 : 3));
        if (this.grazeT > 2.5) r.mult = Math.max(1, r.mult - dt * 0.4);
        this.grazeHaptics();
        if (r.shown !== r.score) r.shown += Math.ceil((r.score - r.shown) * 0.2);
        if (this.rush > 0) { this.rushIdle += dt; if (this.rushIdle > 0.28) { if (this.rush > 20) { this.game.sfx(SND.rushEnd, { haptic: "success" }); this.pop(this.moth.x, this.moth.y - 24, `+${this.rushScore.toLocaleString("en-US")}`, "#fff1b8", 16 + Math.min(16, this.rush / 40)); this.fx.ring(this.moth.x, this.moth.y, GOLD, 16, 150, 0.6); } this.rush = 0; this.rushScore = 0; } }
    }

    struck() {
        const m = this.moth;
        if (this.diff.grace && this.run.bombs > 0) { this.bomb(); return; }
        m.hitT = 0.13; this.hurtFlash = 1;
    }
    die() {
        const m = this.moth, r = this.run;
        if (m.inv > 0 || this.bombT > 0) return;
        r.deaths++; r.mult = Math.max(1, r.mult * 0.5); m.alive = false; m.respawn = 1; m.inv = 0;
        this.game.sfx(SND.die, { haptic: "error" }); this.s.shake(9, 0.4, { haptic: false }); this.s.flash("#ff5a7a55", 0.3); this.fx.burst(m.x, m.y, 44, GOLD, 240, 0.9, 16); this.fx.ring(m.x, m.y, ROSE, 6, 200, 0.6); this.hold = 0.1;
        this.flipNear(m.x, m.y, 130);
        if (this.practice) { r.lives = 99; return; }
        r.lives--;
        if (r.lives < 0) { r.lives = 0; this.gameoverT = 1.1; }
    }
    /** Your stored light. Every bullet the wave touches turns to a mote. */
    bomb() {
        const r = this.run, m = this.moth;
        if (r.bombs <= 0 || this.bombT > 0 || !m.alive || this.mode === "clear" || this.over) return;
        r.bombs--; r.bombsUsed++; m.hitT = 0; m.inv = Math.max(m.inv, 2.6); this.bombT = 2; this.bombR = 0; this.bombX = m.x; this.bombY = m.y; this.hold = 0.05;
        this.game.sfx(SND.bomb, { haptic: "heavy" }); this.s.shake(10, 0.5, { haptic: false }); this.s.flash("#ffefc066", 0.22);
        for (let i = 0; i < 5; i++) this.fx.ring(m.x, m.y, [GOLD, PEARL, AMBER, ROSE, 3][i], 10, 800, 1 + i * 0.1, 0.9, i * 0.05);
        this.fx.burst(m.x, m.y, 60, GOLD, 320, 0.9, 18);
        for (const e of this.enemies) e.hp -= 30;
        if (this.boss && this.mode === "phase" && !this.boss.timed) this.boss.hp -= this.boss.hpMax * 0.12;
    }
    stepBomb(dt) {
        if (this.bombT <= 0) return;
        this.bombT -= dt; this.bombR = Math.min(BOMB_RADIUS, this.bombR + 640 * dt);
        this.flipNear(this.bombX, this.bombY, this.bombR);
    }
    flipNear(cx, cy, R) {
        const b = this.bullets, q = R * R, rng = this.fx.rng;
        for (let i = 0; i < b.hi; i++) {
            if (!b.live[i]) continue;
            const dx = b.x[i] - cx, dy = b.y[i] - cy;
            if (dx * dx + dy * dy < q) this.flip(i, rng);
        }
    }
    flip(i, rng) {
        const b = this.bullets, t = rng.range(0, TAU);
        this.motes.add(b.x[i], b.y[i], b.vx[i] * 0.3 + Math.cos(t) * 60, b.vy[i] * 0.3 + Math.sin(t) * 60, rng.chance(0.5) ? GOLD : b.hue[i]);
        b.kill(i);
    }
    flipAll(show) { const b = this.bullets, rng = this.fx.rng; for (let i = 0; i < b.hi; i++) if (b.live[i]) this.flip(i, rng); }
    gotMote(hue) {
        const r = this.run; this.rush++; this.rushIdle = 0; const v = Math.round(25 * r.mult * this.diff.score); r.score += v; this.rushScore += v;
        if (this.rush % 3 === 1) { this.game.sfx(SND.mote(this.rush / 3)); this.game.haptic("tick"); }
        this.moth.glow = 1;
        if (this.rush % 2 === 0) this.fx.add(this.moth.x, this.moth.y, { life: 0.3, s0: 24, s1: 60, a: 0.25, hue: GOLD });
    }

    stepShots(dt) {
        const m = this.moth, sh = this.shots; let n = sh.n;
        const canFire = m.alive && m.enter <= 0 && this.mode !== "clear" && this.mode !== "dying";
        if (canFire && --this.fireT <= 0) {
            this.fireT = 5;
            const spread = (1 - m.focus) * 0.14, lv = 1 + (this.run.mult >= 2.5 ? 1 : 0) + (this.run.mult >= 5 ? 1 : 0);
            const add = (x, a) => { if (n < SHOTS) { sh.x[n] = x; sh.y[n] = m.y - 10; sh.a[n] = a; n++; } };
            add(m.x - 5, -spread * 0.3); add(m.x + 5, spread * 0.3);
            if (lv >= 2) { add(m.x - 12, -spread * 1.5); add(m.x + 12, spread * 1.5); }
            if (lv >= 3) add(m.x, 0);
        }
        const hit = (t, r, x, y) => Math.abs(x - t.x) < r && Math.abs(y - t.y) < r;
        const b = this.boss, soft = b && this.mode === "phase" && !b.timed;
        for (let i = 0; i < n; i++) {
            sh.y[i] -= 760 * dt; sh.x[i] += sh.a[i] * 760 * dt;
            let dead = sh.y[i] < -10, x = sh.x[i], y = sh.y[i];
            if (!dead) for (const e of this.enemies) if (hit(e, 22, x, y)) { e.hp -= 1; e.flash = 1; dead = true; this.addScore(2); break; }
            if (!dead && b) {
                for (const t of b.parts()) if (hit(t, t.r, x, y)) {
                    dead = true; b.flash = 1;
                    if (soft) { b.hp -= 1; this.addScore(5); }
                    if (this.step_ % 3 === 0) this.fx.add(x, y + 4, { vx: this.fx.rng.range(-70, 70), vy: this.fx.rng.range(30, 120), life: 0.25, s0: 12, s1: 0, hue: GOLD, kind: STAR });
                    if (this.step_ % 9 === 0) this.game.sfx(SND.hit);
                    break;
                }
            }
            if (dead) { n--; sh.x[i] = sh.x[n]; sh.y[i] = sh.y[n]; sh.a[i] = sh.a[n]; i--; }
        }
        sh.n = n;
    }

    spawnEnemy(kind, o) {
        const e = { kind, frame: ENEMY[kind], path: o.path, t0: this.dir.cursor, hp: Math.ceil((o.hp ?? 8) * (0.85 + this.diff.lvl * 0.15)), points: o.points ?? 100, flash: 0, x: -99, y: -99, big: (o.hp ?? 8) > 30 };
        const p = e.path(0); if (p) { e.x = p[0]; e.y = p[1]; }
        this.enemies.push(e);
        if (o.script) this.dir.run(o.script(this.dir, e), e, this.dir.cursor);
    }
    stepEnemies(dt, beat) {
        const list = this.enemies;
        for (let i = list.length - 1; i >= 0; i--) {
            const e = list[i], p = e.path(Math.max(0, beat - e.t0));
            if (e.flash > 0) e.flash -= dt * 6;
            if (!p || p[1] > this.H + 40) { this.dir.clear(e); list.splice(i, 1); continue; }
            e.x = p[0]; e.y = p[1];
            if (e.hp <= 0) {
                this.dir.clear(e); list.splice(i, 1); this.addScore(e.points);
                const n = e.big ? 34 : 12, hue = [GOLD, AMBER, 3, JADE, 5, GOLD, 3, 0][e.frame];
                for (let k = 0; k < n; k++) { const t = k / n * TAU; this.motes.add(e.x, e.y, Math.cos(t) * 120, Math.sin(t) * 120, GOLD); }
                this.fx.burst(e.x, e.y, e.big ? 36 : 14, hue, e.big ? 220 : 150, 0.6, 15); this.fx.ring(e.x, e.y, hue, 8, e.big ? 130 : 70, 0.4);
                this.game.sfx(e.big ? SND.bigPop : SND.pop(this.game.fxRng.int(0, 6)), { haptic: e.big ? "medium" : "light" }); this.s.shake(e.big ? 4 : 1.2, 0.15, { haptic: false });
                if (e.big) this.hold = 0.05;
            }
        }
    }
    gameOver() {
        this.over = true; this.cond.stop(); this.game.sfx(SND.over, { haptic: "error" }); this.ctx.gameOver(this);
    }
    /** Back in, with fresh lives and an empty score, from the top of this stage or this phase. The Flame only meets those who never needed this. */
    continueRun() {
        const r = this.run; r.continues++; r.lives = Math.max(2, DIFFS[r.diff].lives - 1); r.bombs = 2; r.score = 0; r.shown = 0; r.mult = 1;
        this.game.go("play", { stage: this.stage.id - 1, fromPhase: this.boss ? Math.max(0, this.phaseI) : undefined }, { fade: 0.4 });
    }
    togglePause() { this.setPaused(!this.paused); }
    setPaused(v) {
        if (this.over || this.mode === "clear" || v === this.paused) return;
        this.paused = v; this.ctx.pauseMenu(this, v);
        if (v) this.game.audio.suspend(); else this.game.audio.resume();
    }

    // --- Draw -----------------------------------------------------------------------------------------------------

    draw(d) {
        const g = this.game, r = g.renderer, atlas = r.texture(g.assets.sprite("atlas")), ox = this.ox, vw = this.vw, vh = this.vh, sky = this.stage.sky, alpha = this.paused || this.over ? 0 : g.alpha, H = this.H;
        const cover = Math.max(vw / 200, vh / 440);
        d.sprite(`sky-${sky}`, { x: vw / 2, y: vh / 2, width: 200 * cover, height: 440 * cover });
        // Two strips of dark forms sliding past: one near, one far.
        const wh = vw > 900 ? 0 : 1;
        for (const [sp, a, w] of [[0.5, 0.5, 1.2], [1, 0.9, 1.04]]) {
            const hgt = FIELD_W * w * 2.56, y = ((this.scroll * sp) % hgt);
            for (let k = -1; k <= 1; k++) d.sprite(`wall-${sky}`, { x: ox + 180, y: y + k * hgt + hgt / 2 - 40, width: FIELD_W * w, height: hgt, opacity: a });
        }
        d.additive(() => {
            const us = 1 / ACOLS, vs = 1 / AROWS, I = (this.I ??= new Float32Array([1, 0, 0, 1, 0, 0]));
            I[4] = 0; I[5] = 0;
            const t = g.stepCount / 60;
            for (const q of this.stars) {
                const x = q.x * vw, y = ((q.y * vh + this.scroll * q.z) % vh), tw = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(t * q.f + q.p)) + this.beatPulse * 0.15, s = q.s * 0.5;
                r.quad(I, x - s, y - s, x + s, y + s, GLOW * us, q.h * vs, (GLOW + 1) * us, (q.h + 1) * vs, 1, 1, 1, tw, atlas, 0, 0, 0, 0, 0);
            }
            // The whole sky breathes on the downbeat.
            d.sprite("atlas", { x: ox + 180, y: 200, width: 640, height: 640, crop: [GLOW * 64, 3 * 64, 64, 64], opacity: 0.1 + this.downPulse * 0.14 });
            this.bullets.drawPanes(r, ox, 0.11, this.beatPulse, alpha);
        });
        d.push(); d.translate(ox, 0);
        if (this.boss) drawBoss(d, r, this.boss, this, atlas);
        for (const e of this.enemies) {
            const s = 42 * (e.big ? 1.32 : 1), bob = Math.sin(this.cond.t * 3 + e.t0) * 3;
            d.additive(() => d.sprite("atlas", { x: e.x, y: e.y + bob, width: s * 1.9, height: s * 1.9, crop: [GLOW * 64, GOLD * 64, 64, 64], opacity: 0.32 + this.beatPulse * 0.2 + e.flash * 0.4 }));
            const crop = [e.frame * 96, 0, 96, 96];
            d.sprite("enemies", { x: e.x, y: e.y + bob, crop, width: s, height: s });
            if (e.flash > 0) d.additive(() => d.sprite("enemies", { x: e.x, y: e.y + bob, crop, width: s, height: s, opacity: e.flash * 0.7 }));
        }
        d.pop();
        d.additive(() => {
            this.drawShots(r, atlas, ox);
            this.bullets.draw(r, atlas, ox, alpha, this.beatPulse);
            this.fx.draw(r, atlas, ox);
            this.motes.draw(r, atlas, ox, alpha);
            if (this.bombT > 0 && this.bombR < BOMB_RADIUS) { const R = this.bombR, s = R * 2.56; d.sprite("atlas", { x: ox + this.bombX, y: this.bombY, width: s, height: s, crop: [RING * 64, GOLD * 64, 64, 64], opacity: clamp(this.bombT) }); }
        });
        d.push(); d.translate(ox, 0);
        this.drawMoth(d);
        for (const q of this.pops) d.text(q.str, { x: q.x, y: q.y, size: q.size, bold: true, color: q.color, opacity: clamp(1.8 - q.t * 2), font: FONT });
        d.pop();
        // Wide screens: the rest of the window, seen from inside. Bullets end at the leading.
        if (ox > 0) {
            for (const s of [0, 1]) {
                const w = Math.max(256, ox), x = s ? vw - ox + w / 2 : ox - w / 2;
                d.sprite("frame", { x, y: vh / 2, width: w, height: vh, flipX: !!s });
                d.rect(4, vh, { x: s ? vw - ox : ox, y: vh / 2, color: "#caa15a" });
                d.rect(2, vh, { x: s ? vw - ox + 4 : ox - 4, y: vh / 2, color: "#0a0814" });
            }
        }
    }
    drawShots(r, tex, ox) {
        const sh = this.shots, us = 1 / ACOLS, vs = 1 / AROWS, u0 = DASH * us, v0 = GOLD * vs, m = (this.sm ??= new Float32Array([0, -1, 1, 0, 0, 0]));
        for (let i = 0; i < sh.n; i++) { m[4] = sh.x[i] + this.ox; m[5] = sh.y[i]; r.quad(m, -13, -9, 13, 9, u0, v0, u0 + us, v0 + vs, 1, 1, 1, 0.72, tex, 0, 0, 0, 0, 0); }
    }
    drawMoth(d) {
        const m = this.moth; if (!m.alive) return;
        const blink = m.inv > 0 && Math.floor(m.inv * 12) % 2 === 0 ? 0.45 : 1, f = m.focus, flap = Math.sin(m.flap), wing = 0.42 + 0.58 * Math.abs(flap) * (1 - f * 0.5), S = 25 - f * 3, x = m.x, y = m.y;
        d.additive(() => {
            const s = 74 + m.aura * 80 + this.beatPulse * 14;
            d.sprite("atlas", { x, y, width: s, height: s, crop: [GLOW * 64, GOLD * 64, 64, 64], opacity: 0.55 + m.aura * 0.4 });
        });
        d.push(); d.translate(x, y); d.rotate(m.tilt);
        for (const s of [1, -1]) {
            d.push(); d.translate(s * (1.5 + S * wing * 0.5), -2);
            d.sprite("wing", { width: S * wing, height: S * 1.16, flipX: s < 0, opacity: blink });
            d.pop();
        }
        d.sprite("mothbody", { y: -1, width: 11.5, height: 21, opacity: blink });
        d.pop();
        // The dot is the whole truth of the game: always on top, never hidden. It grows clear when it matters.
        const ring = 7 + f * 2;
        d.circle(ring, { x, y, color: `#ffffff${Math.round(50 + f * 170).toString(16).padStart(2, "0")}`, outline: 1.2 });
        d.circle(3.4, { x, y, color: "#7a1030" });
        d.circle(2.3, { x, y, color: "#ffffff" });
        if (f > 0.05) d.circle(m.grazeR, { x, y, color: `#ffe9a8${Math.round(f * 56).toString(16).padStart(2, "0")}`, outline: 1 });
    }
}
