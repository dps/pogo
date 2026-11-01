// The one scene. The title, the run and the end screen share a live world, so a tap on the title is already running.
import { DISGUISES, BIOMES, CAUGHT_LINES, FARMER_LINES, FOOLED_LINES, NEAR_WORDS, ROUTE, biomeIndex, speedAt, DISGUISE_IDS } from "./data.js";
import { CMD, Run, laneX } from "./sim.js";
import { Stage } from "./stage.js";
import { Hud, INK } from "./hud.js";
import { Menus } from "./menus.js";
import { bankRun, dayNumber, saveProfile, skinById, tickMissions } from "./profile.js";
import { layer, mesh, pin, pos, sprite, tap } from "./pogo.js";

const SWIPE = 16, SIDE = 26;     // View units of finger travel. Well under a real flick, so a swipe fires mid-gesture.
const lerp = (a, b, t) => a + (b - a) * t;

export class Play {
    constructor(game, s, names, args) {
        this.game = game; this.s = s; this.pf = game.profile; this.clock = 0;
        this.stage = new Stage(game, s, names, skinById(this.pf.skin));
        this.hud = new Hud(this);
        this.menus = new Menus(this);
        this.run = null;
        this.phase = "title";            // title | run | caught | over | finale | win
        this.cmds = [];
        this.touches = new Map();
        this.slowN = 0; this.slowK = 1; this.nearCool = 0;
        this.cam = { x: 4, y: 3, z: -8, tx: 0, ty: 2.5, tz: 0, k: 1 };
        this.camGoal = { ...this.cam };
        this.setCamTitle();
        Object.assign(this.cam, this.camGoal); s.cam3.set([this.cam.x, this.cam.y, this.cam.z], [this.cam.tx, this.cam.ty, this.cam.tz]);
        this.pen = [];
        for (const x of [-2.4, 0, 2.4]) { const e = s.add([mesh("ob_farm_j", { shadow: true }), pos(x, 0, 3.6)]); e.scale.set(1.05, 1.15, 1); this.pen.push(e); }
        this.frameAspect();
        s.on("resize", () => { this.frameAspect(); this.menus.reflow(); });
        s.onUpdate((dt) => this.update(dt));
        s.onDrawUI((d) => { this.hud.draw(d); this.menus.draw(d); });
        s.onDraw((d) => this.speedLines(d));
        this.pauseBtn = s.add([sprite("pause_icon", { width: 52, height: 52 }), pin("top-left", [8, 8]), layer(15), tap(() => { if (this.phase === "run" && !s.paused) this.menus.pause(); })]);
        this.pauseBtn.name = "pause";
        this.peck = 0; this.peckT = 2;
        this.stage.rig.settle();
        this.stage.update(1 / 60, null);
        this.syncTitle();
        if (args?.auto) this.begin(args); else { this.menus.title(); game.sound.song("title"); }
        this.unsub = game.on("hide", () => { if (this.phase === "run") this.menus.pause(); game.sound.hush(); });
        s.on("leave", () => this.unsub?.());
    }
    frameAspect() {
        const v = this.s.view, tall = v.height / v.width;
        this.tall = tall;
        this.s.cam3.fov = tall > 1.5 ? 66 : tall > 1 ? 58 : 46;
    }
    syncTitle() { this.game.data.phase = this.phase; }
    setCamTitle() {
        const v = this.s.view, wide = v.width > v.height;
        this.stage?.faceLight(true);
        Object.assign(this.camGoal, wide ? { x: 2.2, y: 2.3, z: -9.8, tx: 4.4, ty: 2.7, tz: 0, k: 4 } : { x: 3.6, y: 2.5, z: -9.6, tx: 0, ty: 3.5, tz: 0, k: 4 });
    }
    /** Start a run. o: { seed, start, disguise, daily } */
    begin(o = {}) {
        const s = this.s, P = this.pf, g = this.game;
        const tutorial = !P.tutorial && !o.start && !o.noTutorial && !o.daily;
        const seed = o.seed ?? ((P.runs * 7919 + g.fxRng.int(1, 1e6)) >>> 0);
        this.runOpts = { ...o, seed: undefined };
        const first = !this.retrying;
        this.run = new Run({ seed, start: o.start ?? 0, disguise: null, tutorial, mult: P.mult, heat: first ? 0.55 : 0.3 });
        if (o.heat !== undefined) this.run.heat = o.heat;
        if (this.retrying) this.run.t = 0.55;
        this.daily = !!o.daily;
        this.stage.resetRun(this.run.d, 0);
        this.stage.farmer.hide(false);
        const rig = this.stage.rig;
        rig.setSkin(skinById(P.skin)); rig.yaw = 0; rig.wearing(null);
        for (const e of this.pen) e.hidden = true;
        this.stage.faceLight(false);
        this.phase = "run"; this.syncTitle();
        this.cmds.length = 0; this.touches.clear();
        this.hud.reset(); this.menus.clear();
        this.endT = 0; this.slowN = 0; this.s.timeScale = 1; this.slowK = 1; this.missionT = 0; this.scoreTick = 0; this.lastHint = null;
        this.setCamRun(!first);
        if (first && !o.auto) {
            // The first burst: the pen fence goes flying.
            for (const x of [-2.4, 0, 2.4]) this.stage.burst(9, { x, y: 1, a: 3.4, colors: ["#b97a3f", "#fff1d6", "#e8432e"], speed: 9, up: 12, size: 0.4, vz: 8, world: false, life: 0.9 });
            g.sound.play("smash", "heavy"); s.shake(0.25, 0.25, { haptic: false });
        } else if (!o.auto) { g.sound.play("retry", "light"); s.flash("#fff4dc", 0.14); }
        g.sound.song(BIOMES[this.run.biome].id);
        this.hud.say(g.fxRng.pick(FARMER_LINES), 1.4);
        if (o.disguise) this.run.wear(o.disguise);
        this.retrying = false;
    }
    retry() { this.retrying = true; this.begin({ ...this.runOpts }); }
    setCamRun(cut) {
        const x = this.run?.p.x ?? 0, y = this.run?.p.y ?? 0, tall = this.tall > 1.5, wide = this.tall < 1;
        const camH = tall ? 8.1 : wide ? 6.2 : 7, camZ = tall ? 10.6 : wide ? 10.5 : 10.6, lookY = tall ? 0.6 : 1.5, lookZ = tall ? -7 : -9;
        Object.assign(this.camGoal, { x: x * 0.62, y: camH + y * 0.72, z: camZ, tx: x * 0.72, ty: lookY + y * 0.72, tz: lookZ, k: 7 });
        if (cut) { Object.assign(this.cam, this.camGoal); this.s.cam3.set([this.cam.x, this.cam.y, this.cam.z], [this.cam.tx, this.cam.ty, this.cam.tz]); }
    }
    /** Swipes fire mid-gesture, from any finger, so the thumb never has to finish the stroke. */
    readInput() {
        const inp = this.s.input, g = this.cmds;
        if (inp.pressed("left")) g.push(CMD.left);
        if (inp.pressed("right")) g.push(CMD.right);
        if (inp.pressed("up") || inp.pressed("jump")) g.push(CMD.jump);
        if (inp.pressed("down")) g.push(CMD.slide);
        const list = inp.touches, seen = new Set();
        for (const t of list) {
            seen.add(t.id);
            let k = this.touches.get(t.id);
            if (!k) { k = { ax: t.x, ay: t.y, last: null, fired: false }; this.touches.set(t.id, k); continue; }
            const dx = t.x - k.ax, dy = t.y - k.ay, ax = Math.abs(dx), ay = Math.abs(dy);
            const dir = ax > ay ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
            // After a stroke, the anchor trails the finger: going on in the same way does nothing, turning back fires again.
            const need = k.last === null ? SWIPE : (dir === k.last ? Infinity : SIDE);
            if (Math.max(ax, ay) >= need) {
                g.push({ left: CMD.left, right: CMD.right, up: CMD.jump, down: CMD.slide }[dir]);
                k.last = dir; k.ax = t.x; k.ay = t.y; k.fired = true;
            } else if (k.last !== null) {
                if (k.last === "left") k.ax = Math.min(k.ax, t.x); else if (k.last === "right") k.ax = Math.max(k.ax, t.x);
                else if (k.last === "up") k.ay = Math.min(k.ay, t.y); else k.ay = Math.max(k.ay, t.y);
            }
        }
        let anyFired = false;
        for (const [id, k] of this.touches) if (!seen.has(id)) { anyFired ||= k.fired; this.touches.delete(id); }
        // input.swipe covers a gesture that arrived whole in one step, which is how scripted drags and very fast flicks land.
        const sw = inp.swipe;
        if (sw && !anyFired) g.push({ left: CMD.left, right: CMD.right, up: CMD.jump, down: CMD.slide }[sw]);
    }
    update(dt) {
        const g = this.game, s = this.s, frame = 1 / 60;
        this.clock += frame;
        this.hud.tick(frame);
        this.menus.tick(frame);
        const P = this.phase, st = this.stage, rig = st.rig, run = this.run;
        this.pauseBtn.hidden = P !== "run";
        if (P === "run") {
            this.readInput();
            const cmd = this.cmds.length ? this.cmds.shift() : 0;
            if (this.s.input.pressed("pause")) { this.menus.pause(); return; }
            run.step(dt, cmd);
            this.tutorial();
            this.handleEvents();
            this.setCamRun(false);
            this.missionT -= frame;
            if (this.missionT <= 0) {
                this.missionT = 0.25;
                for (const m of tickMissions(this.pf, run.stats)) {
                    run.mult = this.pf.mult;
                    this.hud.toast(`Mission done: ${m.text}`, `+${m.pay} eggs, score multiplier x${this.pf.mult}`);
                    g.sound.play("mission", "success");
                    saveProfile(g, this.pf);
                }
            }
            g.data.score = Math.floor(run.score); g.data.d = Math.floor(run.d); g.data.eggs = run.eggCount;
            if (run.state === "caught") this.onCaught();
            else if (run.state === "finale") this.onFinale();
            this.slowMotion();
            g.sound.tone(run.speed, run.p.fly > 0);
        } else if (P === "title" || P === "over" || P === "win") {
            const inp = s.input;
            this.readAny(inp);
        }
        // Every phase keeps animating.
        st.update(dt, run && P !== "title" ? run : null, this.finaleState());
        this.poseBird(dt);
        this.poseFarmer(dt);
        this.moveCamera(dt);
        if (P === "caught") { this.endT += frame; if (this.endT > 0.34) this.showOver(); }
        if (P === "finale") this.finaleStep(frame);
    }
    readAny(inp) {
        if (this.menus.modal) return;
        if (this.phase === "title") {
            this.peckT -= 1 / 60;
            if (this.peckT < 0) { this.peck = 1; this.peckT = 2.5 + this.game.fxRng.next() * 3; }
            this.peck *= 0.95;
            if (inp.pointer.tapped || inp.swipe || inp.pressed("confirm") || inp.pressed("jump") || inp.pressed("up")) { this.begin({}); }
        } else if (this.phase === "over" || this.phase === "win") {
            // A tap always counts. Swipes and keys wait a beat, since they may be left over from the run.
            const settled = this.endT >= 0.18;
            if (!settled) this.endT += 1 / 60;
            if (inp.pointer.tapped || (settled && (inp.swipe || inp.pressed("confirm") || inp.pressed("jump") || inp.pressed("up")))) {
                if (this.phase === "over") this.retry(); else this.continueAfterWin();
            }
        }
    }
    poseBird(dt) {
        const st = this.stage, rig = st.rig, run = this.run, P = this.phase;
        if (P === "title") { rig.update(dt, { x: 0, y: 0, speed: 0, mode: "idle", peck: this.peck }); return; }
        const p = run.p;
        if (P === "run") {
            const mode = p.fly > 0 ? "fly" : p.slide > 0 ? "slide" : p.air ? "air" : "run";
            const panic = this.panicT > 0 || run.heat > 0.75 || (run.disguise === "moustache" && Math.sin(this.clock * 1.6) > 0.72);
            this.panicT = Math.max(0, (this.panicT ?? 0) - dt);
            rig.update(dt, { x: p.x, y: p.y, vy: p.vy, speed: run.speed, mode, panic });
            if (p.slide > 0 && Math.floor(this.clock * 30) % 2 === 0) st.spark({ x: p.x + (this.game.fxRng.next() - 0.5), y: 0.2, a: 0.8, vy: 2, vz: 3, color: BIOME_DUST[run.biome], size: 0.3, life: 0.4 });
            if (p.fly > 0 || (run.disguise === "jetpack")) {
                const c = ["#ffb52e", "#ff7a22", "#fff1d6"];
                st.spark({ x: p.x + (this.game.fxRng.next() - 0.5) * 0.7, y: p.y + 1.6, a: -0.7, vy: -7, vz: 6, color: c[Math.floor(this.clock * 40) % 3], size: 0.24, life: 0.28, grav: 0 });
            }
        } else if (P === "finale") {
            const k = this.finT;
            if (this.finRocket < 1) rig.update(dt, { x: p.x * (1 - Math.min(1, k)), y: 0, speed: Math.max(10, run.speed), mode: "run" });
        } else {
            rig.update(dt, { x: p.x, y: 0, vy: 0, speed: 0, mode: "flop", panic: true });
        }
    }
    poseFarmer(dt) {
        const st = this.stage, f = st.farmer, run = this.run, P = this.phase;
        if (P === "title") {
            f.setVehicle(null); f.hide(false);
            f.update(dt, { x: -3.4, z: 5.2, run: 7, yaw: Math.PI * 0.86 });
            return;
        }
        if (!run) return;
        if (P === "run") {
            const fooled = run.disguise === "moustache", h = Math.min(1, run.heat);
            this.farmerZ = lerp(this.farmerZ ?? 6, h < 0.26 ? 12 : lerp(6.4, 2.2, h), dt * 3);
            this.farmerX = lerp(this.farmerX ?? 2, run.p.x * 0.5 + (run.p.lane === 2 ? -2.2 : 2.2), dt * 2.4);
            f.hide(this.farmerZ > 7.4 || run.p.fly > 0);
            if (!f.hidden) f.update(dt, { x: this.farmerX, z: this.farmerZ, run: 8 + run.speed * 0.28 });
        } else if (P === "caught" || P === "over") {
            f.hide(false);
            f.setVehicle(null);
            f.update(dt, { x: run.p.x + 1.6, z: -0.6, run: 11, yaw: Math.PI * 0.52 });
        } else if (P === "finale") {
            f.hide(false);
            f.setVehicle(null);
            f.update(dt, { x: 2, z: 6, run: 14 });
        } else f.hide(true);
    }
    moveCamera(dt) {
        const c = this.cam, G = this.camGoal, k = Math.min(1, dt * G.k), s = this.s;
        for (const key of ["x", "y", "z", "tx", "ty", "tz"]) c[key] += (G[key] - c[key]) * k;
        s.cam3.pos.set(c.x, c.y, c.z); s.cam3.target.set(c.tx, c.ty, c.tz);
    }
    slowMotion() {
        if (this.nearCool > 0) this.nearCool -= 1 / 60;
        const target = this.slowN > 0 ? this.slowTo : 1;
        if (this.slowN > 0) this.slowN--;
        this.slowK += (target - this.slowK) * 0.28;
        if (!this.holdT) this.s.timeScale = this.slowK;
    }
    slow(scale, steps) { if (this.game.noSlow) return; this.slowTo = scale; this.slowN = steps; }
    tutorial() {
        const run = this.run;
        this.hud.hint = null; this.holdT = false;
        if (!run.tutorial) return;
        const h = run.hints.find((x) => !x.done);
        if (!h) { if (run.d > (run.hints[run.hints.length - 1]?.d ?? 0) + 8 && run.hints.length) { run.tutorial = false; this.pf.tutorial = true; saveProfile(this.game, this.pf); this.hud.toast("You've got it. Run!", "The farmer has not given up."); } return; }
        const eta = (h.d - run.d) / run.speed;
        if (eta < 0) { h.done = true; return; }
        // Held at the moment the move would work, so doing it straight away is doing it right.
        if (eta < (h.need === "jump" ? 0.36 : h.need === "slide" ? 0.42 : 0.75)) { this.hud.hint = h; this.holdT = true; this.s.timeScale = 0.16; this.tutorialNeed = h; }
    }
    handleEvents() {
        const run = this.run, g = this.game, s = this.s, st = this.stage, rig = st.rig, snd = g.sound, p = run.p;
        for (const e of run.events) switch (e.type) {
            case "lane":
                snd.play("lane", "tick"); rig.kick(-e.dir * 6, 0.5, 0);
                this.dust(0.6, 4);
                if (this.tutorialNeed?.need === "lane") this.doneHint();
                break;
            case "wall": snd.play("wall", "light"); rig.kick(-e.dir * 9, 1, 0); s.shake(0.06, 0.1, { haptic: false }); break;
            case "jump":
                snd.play("jump", "light"); rig.squash = -0.4; rig.kick(0, -7, 2.5); this.dust(0.4, 5);
                if (this.tutorialNeed?.need === "jump") this.doneHint();
                break;
            case "land": snd.play("land", "light"); rig.squash = 1; rig.kick(0, -10, -1.5); this.dust(0.8, 7); break;
            case "slide":
                snd.play("slide", "light"); rig.kick(0, -5, -3); this.dust(0.8, 6);
                if (this.tutorialNeed?.need === "slide") this.doneHint();
                break;
            case "egg":
                snd.egg(this.clock); this.hud.eggPop = 1; this.hud.scorePop = Math.max(this.hud.scorePop, 0.4);
                for (let i = 0; i < 2; i++) st.spark({ x: e.e.x, y: (e.e.y || 0) + 1.2, a: 0.5, vx: (g.fxRng.next() - 0.5) * 7, vy: 5 + g.fxRng.next() * 3, vz: -3, color: "#ffd65c", size: 0.2, life: 0.35, grav: 10 });
                break;
            case "near":
                snd.near(e.chain); rig.jaw0 = 1; this.hud.pop(`${NEAR_WORDS[e.kind]}${e.chain > 1 ? ` x${e.chain}` : ""}`, e.chain > 2 ? "#ff8fb0" : "#ffe08a", 24 + Math.min(e.chain, 5) * 2);
                this.hud.scorePop = 1;
                if (this.nearCool <= 0) { this.slow(0.5, 12); this.nearCool = 1.1; }
                break;
            case "wear": this.onWear(e.id); break;
            case "strip": this.onStrip(e.id, e.why); break;
            case "smash":
                snd.play("smash", "medium"); st.tumble(e.ob, Math.sign(laneX(e.ob.lane) - p.x)); this.debris(e.ob); s.shake(0.14, 0.14, { haptic: false }); s.freeze(0.03);
                break;
            case "stumble": this.onStumble(e); break;
            case "biome": this.onBiome(e.i); break;
            default: break;
        }
        run.events.length = 0;
    }
    doneHint() { const h = this.tutorialNeed; if (h) h.done = true; this.tutorialNeed = null; this.holdT = false; this.hud.hint = null; this.slowK = 0.7; }
    dust(a, n) { const run = this.run, p = run.p, c = BIOME_DUST[run.biome]; this.stage.burst(n, { x: p.x, y: 0.2, a, colors: c, speed: 3.2, up: 3, size: 0.26, life: 0.4, grav: 6, vz: 2 }); }
    debris(ob) {
        const id = BIOMES[biomeIndex(ob.d - this.run.lapStart)].id, st = this.stage;
        st.burst(12, { x: laneX(ob.lane), y: 1, a: 1, colors: DEBRIS[id], speed: 9, up: 11, size: 0.42, life: 0.8, vz: 3 });
    }
    onWear(id) {
        const g = this.game, s = this.s, st = this.stage, k = DISGUISES[id], p = this.run.p;
        st.rig.wearing(id);
        st.burst(26, { mesh: "chip", x: p.x, y: 2.4, a: 0, colors: [k.color, "#ffffff", "#ffc933", "#ff7aa8"], speed: 7, up: 11, size: 0.34, life: 0.9, grav: 14 });
        g.sound.play("wear", "success");
        s.flash(k.color + "66", 0.25);
        this.hud.wear(id);
        this.slow(0.45, 16);
        st.rig.jaw0 = 1;
        st.rig.kick(0, 10, 0);
        if (id === "moustache") this.hud.say(g.fxRng.pick(FOOLED_LINES), 2.2);
    }
    onStrip(id, why) {
        const g = this.game, st = this.stage, p = this.run.p;
        st.rig.wearing(null);
        if (!id) return;
        g.sound.play("off", why === "hit" ? "medium" : "light");
        st.burst(12, { x: p.x, y: 2, a: 0, colors: [DISGUISES[id].color, "#ffffff"], speed: 6, up: 8, size: 0.3, life: 0.7 });
        if (why === "hit") { this.hud.pop("MOUSTACHE GONE!", "#ffe08a", 26); this.s.shake(0.2, 0.2, { haptic: false }); this.s.flash("#ffffff66", 0.15); }
    }
    onStumble(e) {
        const g = this.game, s = this.s, st = this.stage, run = this.run, p = run.p;
        g.sound.play("stumble", "warn");
        g.sound.play("honk");
        if (e.ob) { st.tumble(e.ob, Math.sign(laneX(e.ob.lane) - p.x)); this.debris(e.ob); }
        st.burst(10, { mesh: "feather", x: p.x, y: 2, a: 0, colors: [st.rig.skin.body, st.rig.skin.tip], speed: 5, up: 7, size: 1, life: 1, grav: 6, spin: 5 });
        s.shake(0.26, 0.2, { haptic: false });
        s.freeze(0.04);
        st.rig.kick((e.why === "side" ? 12 : 0), 6, 10); st.rig.jaw0 = 1;
        this.panicT = 1.1;
        this.hud.heatFlash = 1;
        if (run.state === "run" && run.disguise !== "moustache") { this.hud.say(g.fxRng.pick(FARMER_LINES), 1.3); g.sound.play("oi"); if (run.heat > 0.5) g.sound.song("panic"); }
        this.farmerSong = run.heat > 0.5;
    }
    onBiome(i) {
        const g = this.game, st = this.stage, pf = this.pf;
        st.setMood(i);
        this.hud.biome(i);
        g.sound.play("biome", "success");
        g.sound.song(BIOMES[i].id);
        if (!pf.seen.includes(i)) { pf.seen.push(i); saveProfile(g, pf); this.hud.toast(`Postcard: ${BIOMES[i].name}`, "Start from here on the title screen"); }
    }
    onCaught() {
        const g = this.game, s = this.s, st = this.stage, run = this.run, p = run.p;
        this.phase = "caught"; this.syncTitle(); this.endT = 0;
        run.events.length = 0;
        g.sound.play("crash", "heavy"); g.sound.play("honk");
        g.sound.hush(); g.sound.stopSong();
        s.freeze(0.08); s.shake(0.5, 0.35, { haptic: false }); s.flash("#ffffff", 0.16);
        s.timeScale = 1; this.slowK = 1; this.slowN = 0;
        st.burst(20, { mesh: "feather", x: p.x, y: 2, a: 0, colors: [st.rig.skin.body, st.rig.skin.tip, "#fff"], speed: 7, up: 10, size: 1.1, life: 1.2, grav: 7, spin: 6 });
        if (run.reason === "crash") { const ob = run.obstacles.find((o) => o.view && !o.dead && run.obD(o) - run.d < 3 && run.obD(o) + o.len - run.d > -1 && o.lane === p.lane); if (ob) st.tumble(ob, 0); }
        st.rig.wearing(null); st.rig.kick(0, 9, 12); st.rig.jaw0 = 1;
        this.hud.reset();
    }
    showOver() {
        const g = this.game, run = this.run, s = this.s, st = this.stage;
        this.phase = "over"; this.syncTitle(); this.endT = 0;
        st.faceLight(true);
        // Clear the road for the punchline.
        for (const ob of [...st.live]) if (run.obD(ob) - run.d < 34) { st.release(ob); ob.dead = true; }
        for (const e of st.eggViews) e.egg.got = true;
        const b = this.tall < 1 ? { x: 3.4, y: 2.9, z: -6.4, tx: run.p.x - 3.6, ty: 1.6, tz: 0 } : { x: run.p.x + 2.2, y: 3.3, z: -7, tx: run.p.x + 0.4, ty: 2.8, tz: 0 };
        Object.assign(this.camGoal, b, { k: 30 }); Object.assign(this.cam, b);
        s.cam3.set([b.x, b.y, b.z], [b.tx, b.ty, b.tz]);
        s.flash("#ffffff", 0.12);
        const pf = this.pf;
        tickMissions(pf, run.stats);
        const best = bankRun(pf, run);
        if (this.daily) this.bankDaily(run);
        saveProfile(g, pf);
        g.sound.play("over");
        this.menus.over(best, g.fxRng.pick(CAUGHT_LINES));
    }
    bankDaily(run) {
        const k = this.pf.daily;
        if (k.day !== dayNumber()) { k.streak = k.day === dayNumber() - 1 ? k.streak + 1 : 1; k.day = dayNumber(); k.best = 0; this.pf.bank += 50; }
        k.best = Math.max(k.best, Math.floor(run.score));
    }
    // --- The rocket --------------------------------------------------------------------------
    finaleState() { return this.phase === "finale" || this.phase === "win" ? { rocketLift: this.rocketY ?? 0 } : {}; }
    onFinale() {
        const g = this.game, s = this.s, st = this.stage, run = this.run;
        this.phase = "finale"; this.syncTitle();
        this.finT = 0; this.finRocket = 0; this.rocketY = 0;
        run.events.length = 0;
        s.timeScale = 1; this.slowK = 1;
        g.sound.stopSong(); g.sound.hush();
        g.sound.play("getaway", "success");
        this.hud.reset();
        this.hud.say("NOOOOO!", 3);
    }
    finaleStep(frame) {
        const g = this.game, s = this.s, st = this.stage, run = this.run;
        this.finT += frame;
        const t = this.finT, R = st.bigRocket;
        const rig = st.rig;
        if (t < 1.5) {
            run.d += run.speed * 0.6 * frame * (1 - t / 1.8);
            Object.assign(this.camGoal, { x: 8, y: 3.4, z: 14, tx: 0, ty: 7 + t * 8, tz: -30, k: 2.2 });
        }
        if (t > 1.3 && !this.finRocket) {
            this.finRocket = 1;
            s.flash("#ffffff", 0.5); s.shake(0.8, 3, { haptic: false });
            g.haptic("heavy");
            g.sound.play("crash"); rig.wearing(null);
            for (const e of [rig.body, rig.tail, rig.head, rig.jaw, ...rig.wings, ...rig.neck, ...rig.pupils, ...rig.thigh, ...rig.shin, ...rig.foot]) e.hidden = true;
            this.hud.say("KEITH, YOU MAD BIRD!", 3);
        }
        if (this.finRocket) {
            const k = t - 1.3;
            this.rocketY = k * k * 7;
            for (let i = 0; i < 2; i++) st.spark({ mesh: "orb", x: (g.fxRng.next() - 0.5) * 14, y: Math.max(0.5, this.rocketY), a: -R.pos.z - 0, vx: (g.fxRng.next() - 0.5) * 18, vy: -6, vz: (g.fxRng.next() - 0.5) * 18, color: ["#ffb52e", "#ff7a22", "#fff1d6", "#d8dbe0"][i * 2 + (Math.floor(t * 20) % 2)], size: 2.6, life: 1.4, grav: 0, world: false, drag: 1, spin: 1 });
            Object.assign(this.camGoal, { ty: 8 + this.rocketY * 0.5, k: 3 });
            if (t > 3.8) this.showWin();
        }
    }
    showWin() {
        const g = this.game, run = this.run;
        this.phase = "win"; this.syncTitle(); this.endT = 0;
        const pf = this.pf;
        tickMissions(pf, run.stats);
        if (!pf.owned.includes("goldie")) pf.owned.push("goldie");
        saveProfile(g, pf);
        g.sound.song("title");
        this.menus.win();
    }
    /** Back to the pen. */
    toTitle() {
        const st = this.stage, rig = st.rig, g = this.game;
        for (const e of [rig.body, rig.tail, rig.head, rig.jaw, ...rig.wings, ...rig.neck, ...rig.pupils, ...rig.thigh, ...rig.shin, ...rig.foot]) e.hidden = false;
        this.run = null; this.rocketY = undefined; this.phase = "title"; this.syncTitle();
        rig.wearing(null); rig.yaw = 0;
        rig.setSkin(skinById(this.pf.skin));
        st.resetRun(0, 0);
        for (const e of this.pen) e.hidden = false;
        st.farmer.hide(false);
        this.hud.reset();
        this.setCamTitle();
        Object.assign(this.cam, this.camGoal);
        this.s.cam3.set([this.cam.x, this.cam.y, this.cam.z], [this.cam.tx, this.cam.ty, this.cam.tz]);
        g.sound.song("title"); g.sound.hush();
        this.menus.title();
    }
    /** Keep what a run earned when the player leaves it early. */
    bankWin() { bankRun(this.pf, this.run); saveProfile(this.game, this.pf); }
    continueAfterWin() {
        const st = this.stage, run = this.run, g = this.game, rig = st.rig;
        for (const e of [rig.body, rig.tail, rig.head, rig.jaw, ...rig.wings, ...rig.neck, ...rig.pupils, ...rig.thigh, ...rig.shin, ...rig.foot]) e.hidden = false;
        this.rocketY = undefined;
        run.nextLap();
        st.resetRun(run.d, run.lapStart);
        st.farmer.hide(false);
        this.menus.clear(); this.hud.reset();
        st.faceLight(false);
        this.phase = "run"; this.syncTitle();
        this.setCamRun(true);
        this.s.flash("#ffffff", 0.3);
        this.hud.toast("The rocket came straight back down.", "Keith is fine. The farmer is furious.");
        g.sound.song("farm");
        g.sound.play("crash", "heavy");
    }
    /** A warm bloom where the sun sits, laid over the 3D. It costs one quad and sells the whole mood. */
    sunBloom(d) {
        const p = this.s.cam3.project([this.stage.sun.pos.x, this.stage.sun.pos.y, this.stage.sun.pos.z]);
        if (p.depth > 1) return;
        const v = this.s.view, size = Math.max(v.width, v.height) * 1.5;
        d.additive(() => d.sprite("bloom", { x: p.x, y: p.y, width: size, height: size, opacity: 0.3 }));
    }
    speedLines(d) {
        this.sunBloom(d);
        const run = this.run;
        if (!run || this.phase !== "run") return;
        const v = this.s.view, k = Math.max(0, (run.speed - 22) / 16) + (run.p.fly > 0 ? 0.6 : 0);
        if (k <= 0) return;
        const r = this.game.fxRng, cx = v.width / 2, cy = v.height * 0.46, n = Math.floor(2 + k * 9);
        d.additive(() => {
            for (let i = 0; i < n; i++) {
                const a = r.next() * 6.283, c = Math.cos(a), si = Math.sin(a), m = Math.max(v.width, v.height), r0 = m * (0.34 + r.next() * 0.26), r1 = r0 + m * 0.11 * (0.5 + k);
                d.line([cx + c * r0, cy + si * r0], [cx + c * r1, cy + si * r1], { width: 1.6, color: "#ffffff2e" });
            }
        });
    }
}
const BIOME_DUST = [["#e6c48a", "#d9a85c"], ["#e0d3bd", "#c9b79c"], ["#9a98a4", "#c5c3cc"], ["#d8dbe0", "#b8c2cc"], ["#ffffff", "#dfeefb"], ["#e8cfa8", "#d9b288"]];
const DEBRIS = {
    farm: ["#eec65a", "#b97a3f", "#fff1d6"], village: ["#f58a2a", "#ff7aa8", "#fff1d6"], motorway: ["#ff7a22", "#ffffff", "#d8dbe0"],
    airport: ["#e8432e", "#2472c8", "#ffc933"], ski: ["#ffffff", "#dfeefb", "#8a5a33"], launch: ["#c9a26b", "#d8dbe0", "#ffc933"],
};
export { ROUTE, speedAt, DISGUISE_IDS, INK };
