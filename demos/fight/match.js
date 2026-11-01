// A match on screen: owns the Fight, puppets, kitchen, camera, HUD, touch pad and every bit of juice.
// The sim only reports events. Sound, sparks, shake and haptics all hang off those events, here.
import { BTN, Fight } from "./sim.js";
import { Brain } from "./ai.js";
import { BY_ID, FIELD } from "./fighters.js";
import { Puppet } from "./puppet.js";
import { Cine } from "./cine.js";
import { StageRun, STAGES } from "./stages.js";
import { SONGS } from "./audio.js";
import { Pad, deckHeight } from "./pad.js";
import { CREAM, DISPLAY, FONT, GOLD, INK, RED, TEAL } from "./ui.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const PROJ_ART = { toast: "toast", bean: "bean", steam: "puff", scald: "puff", puff: "puff", plate: "plate", mine: "mine", ice: "ice", dough: "dough" };
const HIT_COL = ["#ffffff", "#ffe08a", "#ffb04a", "#ff6a3c", "#ff3c7a"];

export class Match {
    constructor(game, s, cfg, kit) {
        this.g = game; this.s = s; this.cfg = cfg; this.kit = kit;
        const save = kit.save();
        const auto = cfg.auto ?? (save.auto !== false && kit.onScreen());
        const opts = { a: cfg.a, b: cfg.b, rounds: cfg.rounds ?? 2, training: cfg.mode === "training", time: cfg.time, p1: { auto: auto && cfg.mode !== "demo" }, p2: { hpScale: cfg.foeHp ?? 1 }, fullMeter: false, fast: cfg.mode === "coach" };
        this.fight = new Fight(opts);
        this.quiet = cfg.mode === "demo";
        this.human = cfg.players === 2 ? [true, true] : [cfg.mode !== "demo", false];
        this.pup = [0, 1].map((i) => new Puppet(this.fight.p[i], kit.sheets[this.fight.p[i].def.id], kit.shared));
        this.stageIndex = cfg.stage ?? 0;
        this.stage = new StageRun(s, this.stageIndex, kit.gagParts, game, this.quiet ? { gag() {} } : kit.sound);
        this.brains = [null, null];
        if (cfg.players !== 2) {
            this.brains[1] = new Brain(1, cfg.b, cfg.level ?? 1, game.rng);
            if (cfg.mode === "demo") this.brains[0] = new Brain(0, cfg.a, 2, game.rng);
        }
        this.pad = null;
        if (cfg.mode !== "demo") {
            const names = [BY_ID[cfg.a].special, BY_ID[cfg.b].special];
            this.pad = new Pad(game, { players: cfg.players === 2 ? 2 : 1, names, active: () => kit.onScreen(), latch: () => kit.mouse && !game.input.touchMode });
            kit.setPad(this.pad);
            s.on("resize", () => this.pad?.layout());
        } else kit.setPad(null);
        this.fx = []; this.floaters = []; this.combo = [null, null]; this.banner = null; this.announce = null; this.cine = null;
        this.camX = 0; this.camY = -120; this.camZ = 1; this.baseZoom = 1; this.punch = 0; this.slow = 0; this.paused = false; this.t = 0; this.hpShow = [1, 1]; this.hpTrail = [1, 1];
        this.ended = false; this.lastMask = [0, 0]; this.hist = []; this.showBoxes = cfg.mode === "training"; this.dummy = 0; this.lastMove = null; this.chipFlash = 0; this.coach = null; this.superFlashA = 0;
        this.updateCamera(true);
        s.add([{ layer: 0, draw: (d) => this.drawWorld(d) }]);
        s.onUpdate(() => this.update());
        s.onDraw((d) => this.drawFx(d));
        s.onDrawUI((d) => this.drawUI(d));
        if (cfg.mode === "training") this.fight.o.time = 0;
        if (!this.quiet && cfg.music !== false) kit.song(cfg.song ?? SONGS.fight[STAGES[this.stageIndex].music]);
    }
    get deck() { return this.kit.onScreen() && this.cfg.mode !== "demo" ? deckHeight(this.g.view) : 0; }

    keys(p) {
        const I = this.s.input, solo = this.cfg.players !== 2, f = this.fight.p[p];
        let m = this.pad ? this.pad.read(p) : 0;
        const sets = solo ? ["a", "b"] : [p ? "b" : "a"];
        let special = false, light = false, heavy = false, lightEdge = false, heavyEdge = false, specialEdge = false;
        for (const k of sets) {
            if (I.down(`${k}L`)) m |= BTN.L; if (I.down(`${k}R`)) m |= BTN.R; if (I.down(`${k}U`)) m |= BTN.U; if (I.down(`${k}D`)) m |= BTN.D;
            if (I.down(`${k}A`)) light = true; if (I.down(`${k}B`)) heavy = true; if (I.down(`${k}S`)) special = true;
            if (I.pressed(`${k}A`)) lightEdge = true; if (I.pressed(`${k}B`)) heavyEdge = true; if (I.pressed(`${k}S`)) specialEdge = true;
            if (I.down(`${k}G`)) m |= BTN.G; if (I.down(`${k}T`)) m |= BTN.T; if (I.down(`${k}X`)) m |= BTN.X;
        }
        if (light) m |= BTN.A;
        if (heavy) m |= BTN.B;
        const fwd = f.face > 0 ? BTN.R : BTN.L;
        const compact = this.pad?.controls.some((c) => c.p === p && c.label === "S");
        // One Special key: direction picks which, as a shortcut for the three one-tap buttons on touch.
        if (special || (compact && (m & BTN.S1))) { m &= ~BTN.S1; m |= m & fwd ? BTN.S2 : m & BTN.D ? BTN.S3 : BTN.S1; }
        // Chords, for pads and for anyone who prefers them: Light+Heavy throws, Special+Heavy is the super.
        const now = this.t, ch = this.chord ??= [{}, {}], c = ch[p];
        if (lightEdge || ((m & BTN.A) && !(this.lastMask[p] & BTN.A))) c.a = now;
        if (heavyEdge || ((m & BTN.B) && !(this.lastMask[p] & BTN.B))) c.b = now;
        if (specialEdge) c.s = now;
        const near = (x, y) => x !== undefined && y !== undefined && Math.abs(x - y) <= 3;
        if (near(c.a, c.b) && (now === c.a || now === c.b)) m |= BTN.T;
        if (near(c.s, c.b) && (now === c.s || now === c.b)) m |= BTN.X;
        this.lastMask[p] = m;
        return m;
    }
    dummyMask() {
        const f = this.fight.p[1], { dummy } = this;
        return [0, BTN.D, BTN.G, BTN.G | BTN.D, f.y === 0 && f.st === "stand" ? BTN.U : 0][dummy] ?? 0;
    }
    update() {
        if (this.paused) { this.s.input.pointer; return; }
        this.t++;
        const f = this.fight, s = this.s;
        if (this.pad) { this.pad.meter = [f.p[0].meter, f.p[1].meter]; }
        // A finger on the stage, not a control, pokes the kitchen.
        const ptr = s.input.pointer;
        if (ptr.tapped) { const w = s.cam.toWorld([ptr.x, ptr.y]); this.stage.poke(w.x - this.camX * 0.22, w.y); }
        if (this.slow > 0 && --this.slow % 3 !== 0) { this.afterStep(); return; }
        const inPhase = f.phase === "fight" || f.phase === "ko";
        let m0 = inPhase && !this.quiet ? this.keys(0) : 0, m1 = 0;
        if (this.brains[0]) m0 = this.brains[0].think(f);
        if (this.coach?.lock) m0 = this.coach.lock(m0);
        if (this.cfg.mode === "training" && this.dummy !== 5) m1 = this.dummyMask();
        else if (this.coach && this.coach.foeIdle()) m1 = this.coach.foeMask();
        else if (this.brains[1]) m1 = this.brains[1].think(f);
        else if (inPhase) m1 = this.keys(1);
        if (this.cfg.mode === "training") this.logInput(m0);
        f.step(m0, m1);
        for (const e of f.drain()) this.onEvent(e);
        this.coach?.update();
        this.afterStep();
        if (f.phase === "over" && !this.ended) {
            this.ended = true;
            s.wait(this.quiet ? 0.2 : 0.9, () => this.cfg.onEnd?.({ winner: f.winner, stats: f.stats, fight: f }));
        }
    }
    afterStep() {
        const f = this.fight;
        if (this.cine) this.cine.update();
        const frozen = (i) => this.cine && (i === f.cine?.by ? false : this.cine.def?.still);
        for (const i of [0, 1]) if (!frozen(i)) this.pup[i].update(f, f.p[1 - i], i);
        if (this.cine) {
            const c = this.cine;
            const q = this.pup[f.cine?.by ?? 0].q;
            if (c.atk.top !== undefined) q.top = c.atk.top;
            if (c.atk.spin) q.aux = 1;
        }
        this.stage.update();
        this.ambient();
        for (const i of [0, 1]) {
            const p = f.p[i], k = p.hp / p.hpMax;
            this.hpShow[i] = k;
            if (this.hpTrail[i] > k) { if (p.hits === 0 || p.st === "stand") this.hpTrail[i] = Math.max(k, this.hpTrail[i] - 0.012); } else this.hpTrail[i] = k;
            const c = this.combo[i]; if (c && --c.t <= 0) this.combo[i] = null;
        }
        for (const x of this.fx) x.t++;
        if (this.fx.length) this.fx = this.fx.filter((x) => x.t < x.dur);
        for (const x of this.floaters) { x.t++; x.y -= x.vy ?? 0.3; }
        if (this.floaters.length) this.floaters = this.floaters.filter((x) => x.t < x.dur);
        if (this.banner && ++this.banner.t > this.banner.dur) this.banner = null;
        if (this.announce && ++this.announce.t > this.announce.dur) this.announce = null;
        if (this.cine && !f.cine) this.cine = null;
        this.updateCamera(false);
        this.punch *= 0.86;
    }
    /** Little signs of life: every appliance is running, all the time. */
    ambient() {
        if (this.t % 7 || this.cine) return;
        const f = this.fight, s = this.s, R = this.g.fxRng;
        for (const g of f.p) {
            if (g.koed) { if (this.t % 14 === 0) s.burst({ at: [g.x, -g.y - 50], count: 2, color: ["#6b5f70", "#3a2f44"], speed: [10, 40], life: [0.6, 1.1], size: [8, 16], gravity: -90 }); continue; }
            const dir = g.face, id = g.def.id, x = g.x, y = -g.y, low = g.hp / g.hpMax < 0.3, roll = R.next();
            if (low && roll < 0.5) s.burst({ at: [x, y - g.def.height * 0.8], count: 1, color: ["#8a7f90", "#5a4f60"], speed: [10, 30], life: [0.5, 0.9], size: [6, 12], gravity: -80 });
            if (id === "whistle" && roll < 0.6) s.burst({ at: [x + dir * 62, y - 100], count: 1, color: ["#ffffff", "#ffdbe8"], speed: [20, 50], life: [0.4, 0.8], size: [5, 10], gravity: -120 });
            else if (id === "crumbs" && g.meter >= 100) s.burst({ at: [x + R.range(-20, 20), y - 100], count: 2, color: ["#ffc23c", "#ff5a3c"], speed: [30, 70], life: [0.3, 0.5], size: [4, 8], gravity: -200 });
            else if (id === "chill" && roll < 0.5) s.burst({ at: [x + R.range(-30, 30), y - 6], count: 1, color: ["#dff6ff", "#a8e0f4"], speed: [6, 24], life: [0.5, 1], size: [6, 12], gravity: -10 });
            else if (id === "ristretto" && (g.buff > 0 || roll < 0.2)) s.burst({ at: [x + dir * 36, y - 90], count: g.buff > 0 ? 3 : 1, color: ["#fff", g.buff > 0 ? "#ffe08a" : "#e6d8c4"], speed: [20, 60], life: [0.3, 0.6], size: [4, 8], gravity: -160 });
            else if (id === "frappe" && roll < 0.35) s.burst({ at: [x + R.range(-14, 14), y - 90], count: 1, color: ["#ffd6e6", "#ffffff"], speed: [4, 14], life: [0.3, 0.5], size: [2, 4], gravity: -100 });
            if (g.meter >= 100 && this.t % 14 === 0) s.burst({ at: [x + R.range(-30, 30), y - 8], count: 3, color: [g.def.color, "#ffe08a"], speed: [20, 60], life: [0.35, 0.6], size: [4, 8], gravity: -240 });
        }
    }
    updateCamera(cut) {
        const v = this.g.view, s = this.s, f = this.fight, [a, b] = f.p, deck = this.deck, H = v.height - deck;
        const floorY = H - (deck ? 30 : this.pad && this.kit.onScreen() ? 68 : 40), sep = Math.abs(a.x - b.x);
        const zMax = Math.min(v.width / 330, H / 236), zMin = Math.max(v.width / 760, floorY / 490, 0.6);
        this.baseZoom = Math.max(zMin, Math.min(zMax, v.width / (sep + 210)));
        let goalZ = this.baseZoom, goalX = (a.x + b.x) / 2, top = Math.max(a.y, b.y);
        const hw = () => v.width / 2 / goalZ;
        let goalFoot = 0;
        if (this.cine?.want) { goalZ = this.cine.want.z; goalX = this.cine.want.x; }
        const lim = Math.max(0, FIELD.WALL + 46 - hw());
        goalX = clamp(goalX, -lim, lim);
        const sp = this.cine ? 0.12 : 0.14;
        this.camX = cut ? goalX : lerp(this.camX, goalX, sp);
        this.camZ = cut ? goalZ : lerp(this.camZ, goalZ, 0.1);
        const z = this.camZ * (1 + this.punch), lift = Math.min(90, Math.max(0, top - 50) * 0.42);
        let cy = (v.height / 2 - floorY) / z - lift;
        // During a super the camera frames the film, not the floor.
        if (this.cine?.want?.y !== undefined) { const t = this.cine.want.y + (v.height / 2 - H / 2) / z; this.cineY = this.cineY === undefined ? cy : lerp(this.cineY, Math.max(t, cy - 70), 0.12); cy = this.cineY; } else this.cineY = undefined;
        s.cam.zoom = z;
        s.cam.pos = [this.camX, cy];
        s.cam.angle = this.cine?.angle ?? 0;
        if (cut) s.cam.cut();
    }
    say(text, x, y, color = GOLD, size = 18, dur = 46) { this.floaters.push({ text, x, y, color, size, t: 0, dur, vy: 0.5 }); }
    spark(x, y, rank, tint, flip) { this.fx.push({ kind: "star", x, y, rank, t: 0, dur: 9 + rank * 3, rot: this.g.fxRng.range(0, 6.28), tint }); }
    /** Haptics are the same for both players on one device, and silent in the title demo. */
    buzz(kind) { if (!this.quiet) this.g.haptic(kind); }
    noise(fn, ...a) { if (!this.quiet) this.kit.sound[fn](...a); }
    onEvent(e) {
        const { s, g, fight: f } = this;
        this.stage.onEvent(e);
        this.coach?.event(e);
        const P = (i) => f.p[i];
        switch (e.type) {
            case "hit": {
                const y = -e.y, def = this.pup[e.i], att = this.pup[e.att], r = e.rank, power = r + (e.counter ? 1 : 0);
                this.spark(e.x, y, power, HIT_COL[Math.min(4, power)]);
                def.hit(r / 2); att.squash = 0.1;
                s.burst({ at: [e.x, y], count: 4 + r * 4, color: [HIT_COL[Math.min(4, r)], "#fff"], speed: [120, 300 + r * 90], life: [0.12, 0.34], size: [3, 7 + r], gravity: 500 });
                s.shake(1.2 + r * 1.6, 0.07 + r * 0.05, { haptic: false });
                this.punch = Math.max(this.punch, 0.012 * r * r);
                this.noise("hit", r, e.counter);
                // Haptics scale with the blow.
                this.buzz(r >= 3 ? [34] : r === 2 ? [28] : "medium");
                if (e.counter) { this.say("COUNTER!", e.x, y - 34, "#ff6a3c", 17); this.noise("tick"); }
                if (e.hits >= 2) this.combo[e.att] = { hits: e.hits, dmg: f.p[e.i].comboDmg, t: 90, pop: 1 };
                if (e.launch && r >= 2) s.burst({ at: [P(e.i).x, 0], count: 7, color: ["#fff1d6", "#d6c2a0"], speed: [50, 160], life: [0.2, 0.5], size: [6, 12], gravity: -120 });
                break;
            }
            case "block": {
                this.spark(e.x, -e.y, 0, "#9fd6ff");
                this.pup[e.i].shake = 4;
                s.shake(0.8, 0.06, { haptic: false });
                this.noise("block");
                this.buzz("tick");
                break;
            }
            case "armor": { this.spark(e.x, -e.y, 2, "#9fd6ff"); this.say("ARMOR", e.x, -e.y - 30, "#9fd6ff", 15); this.noise("armor"); this.buzz("medium"); s.shake(2, 0.1, { haptic: false }); this.pup[e.i].flash = 5; break; }
            case "parry": { this.spark(e.x, -e.y, 3, "#ffe08a"); this.say("SNAP!", e.x, -e.y - 30, GOLD, 19); this.noise("parry"); this.buzz("medium"); s.flash("#fff1d6", 0.12); s.shake(2, 0.12, { haptic: false }); break; }
            case "tech": { this.spark(e.x, -e.y, 1, "#ffffff"); this.say("BREAK!", e.x, -e.y - 30, "#ffffff", 16); this.noise("tech"); this.buzz("light"); break; }
            case "startup": {
                if (e.rank >= 3 && e.rank < 4) this.noise("sig", P(e.i).def.id);
                else if (e.rank < 3) this.noise("whiff", e.rank);
                if (this.cfg.mode === "training" && e.i === 0) this.lastMove = P(0).def.moves[e.move] ?? null;
                break;
            }
            case "jump": this.noise("jump"); s.burst({ at: [e.x, -2], count: 5, color: ["#fff1d6", "#cdbba0"], speed: [30, 90], life: [0.15, 0.3], size: [4, 8], gravity: -60 }); break;
            case "land": this.noise("land"); s.burst({ at: [e.x, -2], count: 5, color: ["#fff1d6", "#cdbba0"], speed: [40, 120], life: [0.15, 0.3], size: [4, 9], gravity: -40 }); this.pup[e.i].squash = 0.2; break;
            case "dash": this.noise("dash"); s.burst({ at: [e.x, -6], count: 6, color: ["#fff1d6", "#cdbba0"], speed: [60, 150], life: [0.15, 0.35], size: [5, 10], angle: e.dir > 0 ? Math.PI : 0, spread: 0.6 }); break;
            case "proj": this.noise("sig", P(e.i).def.id); s.burst({ at: [e.x, -e.y], count: 5, color: ["#fff", P(e.i).def.accent], speed: [60, 200], life: [0.1, 0.3], size: [3, 7] }); break;
            case "pop": case "clash": this.noise("pop"); s.burst({ at: [e.x, -e.y], count: 9, color: ["#fff", "#ffe08a"], speed: [80, 240], life: [0.15, 0.4], size: [3, 8], gravity: 300 }); if (e.type === "clash") this.buzz("tick"); break;
            case "fuse": { this.noise("pop"); this.buzz("light"); for (let i = 0; i < 16; i++) this.fx.push({ kind: "corn", x: e.x, y: -e.y, vx: g.fxRng.range(-3.5, 3.5), vy: g.fxRng.range(-8, -2), t: 0, dur: 34, rot: g.fxRng.range(0, 6) }); s.shake(2, 0.12, { haptic: false }); break; }
            case "buff": { this.noise("sig", "ristretto"); this.say("EXTRA SHOT!", e.x, -e.y - 110, "#ffe08a", 18, 60); s.burst({ at: [e.x, -60], count: 18, color: ["#ffe08a", "#fff"], speed: [80, 260], life: [0.3, 0.6], size: [4, 9], gravity: -100 }); this.buzz("light"); break; }
            case "grab": { this.noise("grab"); this.buzz("light"); break; }
            case "knockdown": this.noise("knockdown"); s.shake(2.4, 0.14, { haptic: false }); s.burst({ at: [e.x, -2], count: 10, color: ["#fff1d6", "#cdbba0"], speed: [40, 180], life: [0.2, 0.5], size: [6, 13], gravity: -40 }); this.buzz("light"); break;
            case "wall": {
                this.noise("wall"); this.buzz([40]);
                this.spark(e.x, -e.y, 4, "#ffffff");
                s.shake(7, 0.26, { haptic: false }); this.punch = 0.05; s.flash("#ffffff", 0.08);
                this.say("WALL BOUNCE!", clamp(e.x, this.camX - 120, this.camX + 120), -e.y - 34, "#ffffff", 18, 54);
                s.burst({ at: [e.x, -e.y], count: 16, color: ["#fff", "#ffe08a"], speed: [120, 340], life: [0.2, 0.5], size: [4, 10], gravity: 500 });
                break;
            }
            case "superflash": {
                const fi = P(e.i);
                this.noise("superflash"); this.buzz("heavy");
                this.banner = { i: e.i, name: fi.def.superName, full: fi.def.name, t: 0, dur: 42 };
                s.shake(3, 0.3, { haptic: false });
                s.burst({ at: [e.x, -e.y - 50], count: 24, color: [fi.def.color, "#fff"], speed: [150, 420], life: [0.3, 0.7], size: [4, 11] });
                break;
            }
            case "cine": { this.cine = new Cine(this, e); this.noise("superHit", false); this.buzz("heavy"); s.flash("#ffffff", 0.2); break; }
            case "cinehit": {
                this.noise("superHit", e.last);
                this.buzz("heavy");
                s.shake(e.last ? 12 : 5, e.last ? 0.5 : 0.18, { haptic: false });
                s.flash(e.last ? "#ffffff" : "#ffe08a", e.last ? 0.3 : 0.1);
                this.punch = e.last ? 0.1 : 0.03;
                if (this.combo) this.combo[e.att] = { hits: (this.combo[e.att]?.hits ?? 0) + 1, dmg: (this.combo[e.att]?.dmg ?? 0) + e.dmg, t: 120, pop: 1 };
                break;
            }
            case "cineEnd": this.cine = null; break;
            case "fight": this.announce = { text: "FIGHT!", t: 0, dur: 44, color: GOLD, big: 1 }; this.noise("bell"); this.buzz("light"); break;
            case "round": {
                if (this.cfg.mode === "training" || this.cfg.mode === "coach" || this.quiet) break;
                const final = f.p[0].wins === f.bestOf - 1 && f.p[1].wins === f.bestOf - 1;
                this.announce = { text: final ? "FINAL ROUND" : `ROUND ${e.n}`, t: 0, dur: 100, color: CREAM };
                this.noise("round");
                this.camX = 0; this.pup.forEach((p) => { p.tumble = 0; p.trail.length = 0; });
                break;
            }
            case "ko": {
                this.slow = 75; this.noise("ko"); this.buzz("heavy"); this.g.haptic("heavy");
                s.flash("#ffffff", 0.32); s.shake(10, 0.5, { haptic: false }); this.punch = 0.1;
                const perfect = P(e.by).hp === P(e.by).hpMax;
                this.announce = { text: perfect ? "PERFECT!" : "K.O.!", t: 0, dur: 130, color: RED, big: 1.4 };
                s.burst({ at: [e.x, -e.y], count: 30, color: ["#fff", "#ffc23c"], speed: [120, 480], life: [0.3, 0.9], size: [4, 13], gravity: 300 });
                break;
            }
            case "timeup": this.announce = { text: "TIME UP", t: 0, dur: 130, color: CREAM, big: 1 }; this.noise("bell"); this.buzz("warn"); break;
            case "comboEnd": if (e.hits >= 4) this.say(`${e.dmg} DAMAGE`, this.camX, -160, "#fff1d6", 14); break;
            case "adv": this.advShown = e.adv; break;
        }
    }
    // --- World -------------------------------------------------------------------------
    drawWorld(d) {
        const f = this.fight, a = this.g.alpha;
        this.stage.drawBack(d, this.camX);
        const flashing = f.flash > 0;
        const v = this.g.view;
        if (flashing || this.cine) {
            const tint = this.cine ? this.cine.film.tint : "#160a1c";
            d.rect(3000, 3000, { x: this.camX, y: -100, color: tint, opacity: this.cine ? 0.62 * Math.min(1, this.cine.t / 12) : 0.66 });
        }
        const pos = (i) => { const p = this.pup[i], g = f.p[i]; return [lerp(p.prevX, g.x, a), -lerp(p.prevYpos, g.y, a)]; };
        // Contact shadows, sized by height.
        for (const i of [0, 1]) {
            const g = f.p[i], c = this.cine;
            let x = pos(i)[0];
            if (c) { const o = c.m.fight.cine?.by === i ? c.atk : c.def; if (o) { if (o.hide) continue; x = o.x ?? x; } }
            const k = 1 - Math.min(0.7, g.y / 220), w = (g.def.width * 2.5 + 16) * k;
            d.rect(w, 12 * k, { x, y: 3, color: "#241a2c", radius: 6, opacity: 0.32 * k });
        }
        for (const q of f.proj) if (q.t !== undefined && this.behind(q)) this.drawProj(d, q);
        // The attacker draws in front.
        const lead = f.cine ? f.cine.by : f.p[1].st === "move" && f.p[0].st !== "move" ? 1 : f.p[0].st === "move" ? 0 : 0;
        const order = this.cine?.def?.behind ? [1 - lead, lead] : this.cine ? [lead, 1 - lead] : [1 - lead, lead];
        for (const i of order) {
            const p = this.pup[i];
            let [x, y] = pos(i);
            for (const t of p.trail) {
                const q = 1 - t.age / 12;
                d.push(); d.translate(t.x, -t.y); d.scale(t.face * p.k, p.k); d.translate(p.r.body[0], p.r.body[1]); d.rotate(t.lean); d.translate(-p.r.body[0], -p.r.body[1]);
                d.rect(70, 70, { y: p.r.body[1], color: f.p[i].def.color, opacity: 0.16 * q, radius: 24 }); d.pop();
            }
            if (this.cine) {
                const isAtk = f.cine?.by === i, o = isAtk ? this.cine.atk : this.cine.def;
                if (!o || o.hide) continue;
                x = o.x ?? x; y = o.y ?? 0;
                d.push(); d.translate(x, y - 50); if (o.rot) d.rotate(o.rot); d.translate(-x, -y + 50);
                if (o.sqx) { d.translate(x, 0); d.scale(o.sqx, o.sqy); d.translate(-x, 0); }
                if (o.blur) d.rect(120, 90, { x, y: y - 50, color: f.p[i].def.color, radius: 40, opacity: 0.22 });
                else p.draw(d, x, y, { scale: o.scale ?? 1 });
                d.pop();
            } else p.draw(d, x, y);
        }
        for (const q of f.proj) if (q.t !== undefined && !this.behind(q)) this.drawProj(d, q);
        if (this.showBoxes) this.drawBoxes(d);
    }
    behind(q) { return q.fuse && !q.armed; }
    drawProj(d, q) {
        const sh = this.kit.shared, name = PROJ_ART[q.kind], part = sh[name], x = q.x, y = -q.y, t = q.t;
        const place = (o = {}) => { const sc = o.sc ?? 1, w = part.w * sc, h = part.h * sc; d.push(); d.translate(x, y + (o.dy ?? 0)); if (o.rot) d.rotate(o.rot); d.scale(q.face, 1); d.sprite("shared", { width: w, height: h, crop: part.crop, color: o.color, opacity: o.opacity }); d.pop(); };
        switch (q.kind) {
            case "toast": place({ rot: t * 0.3, sc: 1.1 }); d.additive(() => d.circle(26, { x, y, color: "#ff8a3c", opacity: 0.18 })); break;
            case "bean": place({ rot: t * 0.6, sc: 0.9 }); d.rect(40, 4, { x: x - q.face * 26, y, color: "#ffe08a", opacity: 0.5, radius: 2 }); break;
            case "steam": for (let i = 0; i < 3; i++) { const sc = 1 + Math.sin(t * 0.3 + i) * 0.12 + i * 0.1; d.sprite("shared", { x: x - q.face * i * 16, y: y + Math.sin(i * 2 + t * 0.2) * 5, width: part.w * sc, height: part.h * sc, crop: part.crop, opacity: 0.86 - i * 0.24 }); } break;
            case "scald": place({ sc: 0.9 + Math.sin(t * 0.4) * 0.1, color: "#ffc0d8" }); break;
            case "puff": place({ sc: 1.4 + t * 0.03, opacity: 1 - t / 18 }); break;
            case "plate": place({ sc: 1, dy: Math.sin(t * 0.2) * 2 }); d.rect(30, 2, { x: x - q.face * 28, y, color: "#fff", opacity: 0.4 }); d.rect(22, 2, { x: x - q.face * 24, y: y + 6, color: "#fff", opacity: 0.3 }); break;
            case "mine": {
                const blink = q.fuse - t < 40 && t % 8 < 4;
                if (q.armed) { for (let i = 0; i < 10; i++) { const a = i * 0.63; d.circle(20 + (i % 3) * 8, { x: x + Math.cos(a) * 34, y: y - 26 + Math.sin(a) * 30, color: i % 2 ? "#fff6d8" : "#ffd14a", opacity: 0.9 }); } }
                else { place({ sc: 0.8 + (blink ? 0.14 : 0), dy: -10 }); if (blink) d.additive(() => d.circle(22, { x, y: y - 8, color: "#ff5a3c", opacity: 0.5 })); }
                break;
            }
            case "ice": place({ rot: t * 0.25, sc: 1 }); break;
            case "dough": place({ rot: q.vx * t * 0.03, sc: 1 }); break;
        }
    }
    drawBoxes(d) {
        const f = this.fight;
        const r = (x, y, w, h, c, a) => { d.rect(w, h, { x, y: -y, color: c, opacity: a * 0.3 }); d.rect(w, h, { x, y: -y, color: c, outline: 1.4, opacity: a }); };
        for (const g of f.p) {
            const hh = g.height, inv = g.inv > 0;
            r(g.x, g.y + hh / 2, (g.def.width + 4) * 2, hh, inv ? "#ffffff" : "#5ddc7a", 0.9);
            const m = g.mv;
            if (m?.box[2] && g.st === "move") {
                const on = g.mt > m.s && g.mt <= m.s + m.a, c = m.grab ? "#ffd14a" : "#ff3c5a";
                r(g.x + g.face * m.box[0], g.y + m.box[1], m.box[2], m.box[3], c, on ? 1 : 0.28);
            }
        }
        for (const q of f.proj) r(q.x, q.y, q.box[0], q.box[1], "#ff3c5a", 0.9);
    }
    drawFx(d) {
        const shared = this.kit.shared, star = shared.star;
        for (const x of this.fx) {
            if (x.kind === "star") {
                const k = x.t / x.dur, sc = (0.4 + x.rank * 0.3) * (0.7 + k * 0.7) , o = 1 - k * k;
                d.push(); d.translate(x.x, x.y); d.rotate(x.rot);
                d.additive(() => { d.sprite("shared", { width: star.w * sc * 1.6, height: star.h * sc * 1.6, crop: star.crop, color: x.tint, opacity: o * 0.9 }); });
                d.sprite("shared", { width: star.w * sc, height: star.h * sc, crop: star.crop, color: "#ffffff", opacity: o * (1 - k) });
                d.pop();
                d.circle(28 * sc + k * 28, { x: x.x, y: x.y, color: x.tint, outline: 3 * (1 - k), opacity: o });
            } else if (x.kind === "corn") {
                const k = shared.kernel, t = x.t, px = x.x + x.vx * t, py = x.y + x.vy * t + 0.22 * t * t;
                d.sprite("shared", { x: px, y: py, rot: x.rot + t * 0.2, width: k.w, height: k.h, crop: k.crop });
            }
        }
        for (const x of this.floaters) {
            const k = x.t / x.dur, sc = x.t < 6 ? 0.6 + x.t * 0.12 : 1, o = 1 - Math.max(0, (k - 0.7) / 0.3);
            d.text(x.text, { x: x.x + 1.4, y: x.y + 1.6, size: x.size * sc, bold: true, font: DISPLAY, color: "#241a2c", opacity: o });
            d.text(x.text, { x: x.x, y: x.y, size: x.size * sc, bold: true, font: DISPLAY, color: x.color, opacity: o });
        }
    }
    // --- HUD ----------------------------------------------------------------------------------
    drawUI(d) {
        if (this.quiet) return;
        const v = this.g.view, W = v.width, deck = this.deck, H = v.height - deck, top = v.safe.top + 6, f = this.fight, t = this.t;
        this.drawCombo(d, W, H);
        if (this.cine) this.cine.drawOver(d, W, H);
        if (this.banner) this.drawBanner(d, W, H);
        if (deck) this.drawDeck(d, W, H, deck);
        // A super owns the screen: the HUD gets out of the way, unless the controls live on the deck.
        if (!this.cine || deck) this.pad?.draw(d, t, f.p[0].face);
        if (this.coach) this.coach.draw(d, W, H);
        if (!this.cine) this.drawBars(d, W, top);
        if (this.cfg.mode === "training") this.drawTraining(d, W, H, top);
        if (this.announce) this.drawAnnounce(d, W, H);
    }
    drawDeck(d, W, H, deck) {
        const v = this.g.view, all = v.height - H;
        // The controls sit on the front of an old enamel stove.
        d.rect(W, all + 4, { x: W / 2, y: H + all / 2, color: "#ece3cf" });
        d.rect(W, 16, { x: W / 2, y: H + 8, color: "#c9d6e0" }); d.rect(W, 5, { x: W / 2, y: H + 4, color: "#f4fbff" }); d.rect(W, 4, { x: W / 2, y: H + 15, color: "#5b6878" });
        d.rect(W, 7, { x: W / 2, y: H + 1, color: INK });
        d.rect(W - 12, all - 32, { x: W / 2, y: H + 22 + (all - 32) / 2, color: "#3b3042", radius: 16 });
        d.rect(W - 18, all - 38, { x: W / 2, y: H + 22 + (all - 32) / 2, color: "#463a52", radius: 13 });
        if (this.fight.p[0].auto) d.text("AUTO COMBO: TAP LIGHT", { x: 88, y: H + 36, size: 9, bold: true, font: FONT, color: "#c9b8d0" });
    }
    drawBars(d, W, top) {
        const f = this.fight, mid = W / 2, bw = mid - 34, H = 15;
        for (const i of [0, 1]) {
            const g = f.p[i], dir = i ? 1 : -1, x0 = mid + dir * 26, name = g.def.name;
            const fill = (k, c, h = H - 5, y = top + H / 2, o) => { const w = Math.max(0, bw - 4) * k; d.rect(w, h, { x: x0 + dir * (w / 2 + 2), y, color: c, radius: 3, opacity: o }); };
            d.rect(bw + 4, H + 4, { x: x0 + dir * bw / 2, y: top + H / 2, color: INK, radius: 6 });
            d.rect(bw, H, { x: x0 + dir * bw / 2, y: top + H / 2, color: "#5a2d3a", radius: 4 });
            fill(this.hpTrail[i], "#ff5a3c");
            const k = this.hpShow[i], low = k < 0.25 && this.t % 20 < 10;
            fill(k, low ? "#fff1d6" : k < 0.25 ? "#ffa23c" : GOLD);
            if (k > 0.05) fill(k, "#ffffff", 3, top + 4, 0.35);
            // Name, wins and the heat gauge.
            const ny = top + H + 12;
            const nw = name.length * 8.4 + 10;
            d.rect(nw, 15, { x: x0 + dir * (nw / 2), y: ny, color: INK, opacity: 0.8, radius: 5 });
            d.text(name, { x: x0 + dir * (nw / 2), y: ny, size: 11, bold: true, font: DISPLAY, color: CREAM });
            for (let r = 0; r < f.bestOf; r++) { const px = x0 + dir * (bw - 7 - r * 15), won = g.wins > r; d.circle(6.2, { x: px, y: ny, color: INK }); d.circle(4.6, { x: px, y: ny, color: won ? GOLD : "#5a4a60" }); }
            const my = ny + 13, m = g.meter / 100, ready = m >= 1, mw = bw * 0.72;
            d.rect(mw + 4, 9, { x: x0 + dir * (mw / 2), y: my, color: INK, radius: 4 });
            const w = Math.max(0, mw) * m;
            d.rect(w, 5, { x: x0 + dir * (w / 2 + 0), y: my, color: ready ? (this.t % 12 < 6 ? "#fff1d6" : "#ff7a3c") : "#ff7a3c", radius: 2.4 });
            if (ready) { d.text("SUPER!", { x: x0 + dir * (mw + 24), y: my, size: 10, bold: true, font: DISPLAY, color: this.t % 12 < 6 ? GOLD : CREAM }); }
        }
        // The kitchen timer.
        const left = this.cfg.mode === "training" ? "--" : String(Math.ceil(f.time / 60)), urgent = f.time < 600 && this.cfg.mode !== "training";
        d.circle(24, { x: mid, y: top + 12, color: INK });
        d.circle(20, { x: mid, y: top + 12, color: urgent && this.t % 30 < 15 ? RED : "#fff1d6" });
        d.text(left, { x: mid, y: top + 12, size: 20, bold: true, font: DISPLAY, color: urgent && this.t % 30 < 15 ? CREAM : INK });
    }
    drawCombo(d, W, H) {
        for (const i of [0, 1]) {
            const c = this.combo[i]; if (!c) continue;
            c.pop *= 0.8;
            const x = i ? W - 62 : 62, y = H * 0.36, o = Math.min(1, c.t / 20), sc = 1 + c.pop * 0.6, shake = Math.sin(this.t) * c.pop * 3, col = c.hits >= 7 ? "#ff5a3c" : c.hits >= 4 ? GOLD : CREAM;
            d.text(String(c.hits), { x: x + 2 + shake, y: y + 3, size: 42 * sc, bold: true, font: DISPLAY, color: INK, opacity: o });
            d.text(String(c.hits), { x: x + shake, y, size: 42 * sc, bold: true, font: DISPLAY, color: col, opacity: o });
            d.text("HITS", { x: x + 1, y: y + 30, size: 14, bold: true, font: DISPLAY, color: INK, opacity: o });
            d.text("HITS", { x, y: y + 29, size: 14, bold: true, font: DISPLAY, color: CREAM, opacity: o });
        }
    }
    drawBanner(d, W, H) {
        const b = this.banner, k = b.t / b.dur, inK = Math.min(1, b.t / 7), o = 1 - Math.max(0, (k - 0.82) / 0.18), dir = b.i ? -1 : 1, y = H * 0.44, h = 70;
        const col = this.fight.p[b.i].def.color;
        d.push(); d.translate(W / 2, y); d.rotate(-0.05 * dir);
        const shift = (1 - inK) * W * dir * -1;
        d.rect(W * 1.3, h + 12, { x: shift, color: INK, opacity: o });
        d.rect(W * 1.3, h, { x: shift * 1.2, color: col, opacity: o });
        for (let i = 0; i < 16; i++) d.rect(W * 0.3, 2.4, { x: ((i * 77 + b.t * 16 * dir) % (W * 1.6)) - W * 0.8, y: -30 + i * 4, color: "#ffffff", opacity: 0.2 * o });
        const size = Math.min(34, W / (b.name.length * 0.8));
        d.text(b.name, { x: -shift * 0.2 + 2, y: 3, size, bold: true, font: DISPLAY, color: INK, opacity: o });
        d.text(b.name, { x: -shift * 0.2, y: 0, size, bold: true, font: DISPLAY, color: "#ffffff", opacity: o });
        d.pop();
    }
    drawAnnounce(d, W, H) {
        const a = this.announce, k = a.t / a.dur, e = a.t < 8 ? 1.7 - a.t * 0.0875 : 1, o = 1 - Math.max(0, (k - 0.82) / 0.18), size = Math.min(58 * (a.big ?? 1), W / (a.text.length * 0.62)) * e, y = H * 0.4;
        d.text(a.text, { x: W / 2 + 3, y: y + 4, size, bold: true, font: DISPLAY, color: INK, opacity: o });
        d.text(a.text, { x: W / 2, y, size, bold: true, font: DISPLAY, color: a.color, opacity: o });
    }
    drawTraining(d, W, H, top) {
        const f = this.fight, y0 = top + 100;
        // Input history: newest first, with how long each was held.
        const y = (i) => y0 + 26 + i * 15;
        for (let i = 0; i < Math.min(9, this.hist.length); i++) {
            const h = this.hist[this.hist.length - 1 - i], o = 1 - i * 0.08;
            d.rect(84, 14, { x: 50, y: y(i), color: "#241a2c", opacity: 0.55 * o, radius: 4 });
            d.text(String(Math.min(99, h.n)), { x: 18, y: y(i), size: 9, font: FONT, color: "#c9b8d0", opacity: o });
            d.text(h.label, { x: 56, y: y(i), size: 10, bold: true, font: FONT, color: CREAM, opacity: o });
        }
        const m = this.lastMove;
        if (m) {
            const adv = this.advShown, lines = [`${m.name}`, `start ${m.s + 1}  active ${m.a}  rec ${m.r}`, m.d ? `dmg ${m.d}  hit ${m.hs}  block ${m.bs}` : "no direct damage", adv === undefined ? "" : `advantage ${adv >= 0 ? "+" : ""}${adv}`];
            const x = W - 88;
            d.rect(166, 56, { x: x - 0, y: y0 + 54, color: "#241a2c", opacity: 0.66, radius: 6 });
            lines.forEach((l, i) => d.text(l, { x, y: y0 + 34 + i * 13, size: i ? 10 : 11, bold: !i, font: FONT, color: i === 3 && adv !== undefined ? (adv >= 0 ? "#7fe0a8" : "#ff9a8a") : CREAM }));
        }
    }
    logInput(mask) {
        const dirs = [];
        if (mask & BTN.U) dirs.push("UP"); if (mask & BTN.D) dirs.push("DOWN"); if (mask & BTN.L) dirs.push("LEFT"); if (mask & BTN.R) dirs.push("RIGHT");
        for (const [b, n] of [[BTN.A, "L"], [BTN.B, "H"], [BTN.S1, "S1"], [BTN.S2, "S2"], [BTN.S3, "S3"], [BTN.G, "BLK"], [BTN.T, "THR"], [BTN.X, "SUP"]]) if (mask & b) dirs.push(n);
        const label = dirs.join(" ") || ".";
        const last = this.hist[this.hist.length - 1];
        if (last && last.label === label) last.n++;
        else { this.hist.push({ label, n: 1 }); if (this.hist.length > 24) this.hist.shift(); }
    }
}
