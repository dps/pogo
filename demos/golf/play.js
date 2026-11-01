// One player on one hole: the slingshot, the camera, the juice, the scorecard.
import { layer, mesh, pin, pos, rot, ui } from "./pogo.js";
import { Course, BALL_R, MAT, ICE, ROCK, ROUGH, SAND, SNOW, WOOD, LAVA, WATER } from "./course.js";
import { HOLES, ISLANDS } from "./holes.js";
import { Sim, HZ, geyserIn, plantOpen } from "./sim.js";
import { Stage } from "./stage.js";
import { LOOK } from "./look.js";
import { SKINS } from "./models.js";
import { MAX_OVER, RIVALS, checkSkins, loadSave, rivalScore, shellCount, store, toPar, word } from "./data.js";
import { CREAM, FONT, INK, clamp, fatButton, panel, sticker } from "./ui.js";

const TAU = Math.PI * 2;
const NOTCHES = 14;
const wrap = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const courses = new Map();
export function courseFor(n) { if (!courses.has(n)) { if (courses.size > 3) courses.delete(courses.keys().next().value); courses.set(n, new Course(HOLES[n], HOLES[n].island)); } return courses.get(n); }

const easeBack = (t) => { const c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; };

export class Round {
    constructor(game, s, run) {
        this.game = game; this.s = s; this.run = run;
        this.save = loadSave(game); this.snd = game.snd;
        const n = run.order[run.i]; this.n = n; this.def = HOLES[n];
        this.player = run.players[run.p];
        this.c = courseFor(n);
        this.sim = new Sim(this.c, (t, a, b) => this.event(t, a, b)); this.sim.visual = true;
        this.ghost = new Sim(this.c); this.ghost.quiet = true;
        this.stage = new Stage(game, s, this.c, this.sim);
        this.L = LOOK[this.c.island];
        this.strokes = 0; this.state = "intro"; this.stateT = 0; this.power = 0; this.shownP = 0; this.heading = 0; this.notch = 0; this.pull = null; this.chip = false; this.keyAim = false;
        this.acc = 0; this.trail = []; this.toasts = []; this.overview = 0; this.zoom = 1; this.confetti = []; this.path = []; this.idle = 0; this.bandT = 0; this.card = null;
        this.skin = SKINS.find((k) => k.id === this.player.skin) ?? SKINS[0];
        const t = this.c.tee_;
        this.ball = s.add([mesh("ball_" + this.skin.id, { size: BALL_R * 2.1, shine: this.skin.shine ?? 0.55, shadow: false }), pos(t.x, t.y, t.z), rot(0, 0, 0), { squash: 0 }]);
        this.blob = s.add([mesh("blob", { size: [0.34, 0.01, 0.34], shadow: false, unlit: true }), pos(t.x, t.y - BALL_R + 0.015, t.z), { opacity: 0.3 }]);
        s.cam3.fov = 46; s.cam3.fovAxis = "min";
        const fwd = this.c.ahead(t.x, t.z, 9);
        this.yaw = this.routeYaw(t.x, t.z); this.heading = this.yaw; this.camF = [t.x, t.y, t.z];
        this.camDist = 6.6; this.camH = 5.2; this.look = 3.6; this.sweep = this.buildSweep();
        this.hudButtons();
        s.onUpdate((dt) => this.update(dt));
        s.onDraw((d) => this.draw2d(d));
        s.onDrawUI((d) => this.drawUI(d));
        s.on("leave", () => this.snd.stopRoll());
        game.data.hole = n; game.data.strokes = 0; game.data.state = "intro"; game.data.par = this.def.par;
        this.snd.play(ISLANDS[this.c.island].id);
        globalThis.__golf = this; this.sticker = sticker;
    }

    routeYaw(x, z) { const a = this.c.ahead(x, z, 8); return Math.atan2(a[0] - x, -(a[1] - z)); }
    fwd(h) { return [Math.sin(h), -Math.cos(h)]; }

    /** Cup back to tee along the route, then settle behind the ball. */
    buildSweep() {
        const c = this.c, t = c.tee_, pts = [[t.x, t.z]];
        for (let i = 0; i < 40; i++) { const l = pts[pts.length - 1], a = c.ahead(l[0], l[1], 3); if (a[0] === l[0] && a[1] === l[1]) break; pts.push(a); if (Math.hypot(a[0] - c.cup_.x, a[1] - c.cup_.z) < 1.5) break; }
        pts.push([c.cup_.x, c.cup_.z]);
        pts.reverse();
        let len = 0; const d = [0];
        for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); d.push(len); }
        return { pts, d, len, T: clamp(len * 0.095, 2.4, 4.6) };
    }
    atSweep(u) {
        const { pts, d, len } = this.sweep, want = u * len;
        let i = 1; while (i < pts.length - 1 && d[i] < want) i++;
        const a = pts[i - 1], b = pts[i], k = clamp((want - d[i - 1]) / Math.max(1e-3, d[i] - d[i - 1]), 0, 1);
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    }

    set(state) { this.state = state; this.stateT = 0; this.game.data.state = state; }

    // ---------- UI buttons ----------
    hudButtons() {
        const s = this.s, m = 12;
        this.btnChip = s.add([fatButton("CHIP", { w: 86, h: 54, size: 16, color: CREAM, dark: "#cdbb9d", label: () => (this.chip ? "CHIP!" : "CHIP"), on: true, hot: () => this.chip, onTap: () => this.toggleChip(), action: undefined, icon: null, radius: 16 }), pin("bottom-left", [m, m])]);
        this.btnView = s.add([fatButton("VIEW", { w: 86, h: 54, size: 16, color: "#3fd7cf", dark: "#1f9c98", label: () => (this.overview > 0.5 ? "BALL" : "MAP"), onTap: () => { this.snd.click(); this.wantOverview = !this.wantOverview; }, radius: 16 }), pin("bottom-right", [m, m])]);
        this.btnMenu = s.add([fatButton("Menu", { w: 50, h: 50, size: 15, label: () => "", color: CREAM, dark: "#cdbb9d", onTap: () => this.openPause(), radius: 15, action: "pause", icon: (d, off) => { for (let i = -1; i <= 1; i++) d.rect(22, 4, { y: off + i * 7, color: INK, radius: 2 }); } }), pin("top-right", [m, m])]);
        this.buttons = [this.btnChip, this.btnView, this.btnMenu];
    }
    showAimButtons(on) { this.btnChip.hidden = !on; this.btnView.hidden = !on && this.state !== "roll"; }
    toggleChip() {
        if (this.state !== "aim") return;
        this.chip = !this.chip; this.snd.click();
        this.toast(this.chip ? "Chip: lobs over trouble" : "Putt: rolls along the ground", "#fff");
    }

    // ---------- pause ----------
    openPause() {
        if (this.pauseE || this.card) return;
        this.snd.click();
        const s = this.s, v = s.view, cx = v.width / 2, cy = v.height / 2, st = this.save.settings, items = [], wide = v.width > v.height;
        s.paused = true;
        const add = (...c) => { const e = s.add(c); items.push(e); return e; };
        const X = (c) => (wide ? cx + (c - 0.5) * 250 : cx), Y = (c, r) => (wide ? cy - 58 + r * 58 : cy - 124 + (c * 3 + r) * 58);
        const row = (label, key, r) => add(fatButton(label, { w: 230, h: 50, size: 17, color: "#7ddc5a", dark: "#3f9c3a", on: () => st[key], label: () => `${label}: ${st[key] ? "ON" : "OFF"}`, onTap: () => { st[key] = !st[key]; store(this.game); this.snd.apply(); this.snd.click(); } }), pos(X(0), Y(0, r)), ui());
        row("Sound", "sound", 0); row("Music", "music", 1); row("Haptics", "haptics", 2);
        add(fatButton("Resume", { w: 230, h: 56, size: 19, onTap: () => close(), action: "pause" }), pos(X(1), Y(1, 0)), ui());
        add(fatButton("Quit hole", { w: 230, h: 50, size: 15, color: "#ff8f7f", dark: "#c44b3e", onTap: () => { s.paused = false; this.game.go(this.run.mode === "tour" ? "hub" : "title", { island: this.c.island }, { fade: 0.2 }); } }), pos(X(1), Y(1, 1)), ui());
        const close = () => { for (const e of items) e.destroy(); this.pauseE = null; s.paused = false; };
        this.pauseE = items;
    }

    // ---------- step ----------
    advance(dt) {
        this.acc += dt * HZ;
        const n = Math.floor(this.acc + 1e-6);
        this.acc -= n;
        for (let i = 0; i < n; i++) this.sim.step();
    }

    update(dt) {
        const { s, sim, game } = this, input = s.input;
        this.stateT += dt;
        // Long ice slides can be hurried along by holding a finger down.
        this.hurry = this.state === "roll" && this.stateT > 2.5 && input.pointer.down;
        this.advance(this.hurry ? dt * 3 : dt);
        this.stage.update(dt);
        this.syncBall(dt);
        switch (this.state) {
            case "intro": this.intro(dt); break;
            case "aim": this.aim(dt); break;
            case "roll": this.rolling(dt); break;
            case "lost":
                if (this.stateT > (sim.reason === "timeout" ? 0.25 : 1)) this.reset();
                break;
            case "holed": if (this.stateT > (this.aced ? 6 : 1.7) && !this.card) this.showCard(); break;
            default: break;
        }
        this.btnChip.hidden = this.state !== "aim";
        this.btnView.hidden = !(this.state === "aim" || this.state === "roll");
        this.btnMenu.hidden = this.state === "intro" && this.stateT < 0.3;
        this.ambient();
        this.camera(dt);
        if (this.card) this.card.t += dt;
        this.toasts = this.toasts.filter((t) => (t.t += dt) < t.life);
        this.tickConfetti(dt);
        if (input.wheel) this.zoom = clamp(this.zoom * (1 + input.wheel * 0.001), 0.6, 1.6);
        game.data.strokes = this.strokes; game.data.state = this.state;
    }

    syncBall(dt) {
        const { sim, ball, blob } = this;
        const hide = sim.mode === "inside" || (sim.mode === "holed" && false);
        ball.hidden = hide; blob.hidden = hide || sim.mode === "holed";
        ball.pos.set(sim.x, sim.y, sim.z);
        const q = sim.q, a = q[0], b = q[1], c = q[2], d = q[3];
        // Quaternion to Pogo's Euler order (Ry * Rx * Rz).
        const m8 = 2 * (b * d + a * c), m9 = 2 * (c * d - a * b), m10 = 1 - 2 * (b * b + c * c), m1 = 2 * (b * c + a * d), m5 = 1 - 2 * (b * b + d * d);
        ball.rot.set(Math.asin(clamp(-m9, -1, 1)), Math.atan2(m8, m10), Math.atan2(m1, m5));
        ball.squash = Math.max(0, ball.squash - dt * 6);
        const k = ball.squash, sq = 1 + Math.sin(k * 9) * k * 0.3;
        ball.scale.set(sq, 2 - sq, sq);
        const grounded = sim.ground > 0, gy = grounded ? sim.y - BALL_R : sim.sample(sim.x, sim.z), h = clamp((sim.y - BALL_R - gy) / 3, 0, 1);
        blob.pos.set(sim.x, gy + 0.018, sim.z);
        blob.opacity = 0.34 * (1 - h); const bs = 1 + h * 0.8; blob.scale.set(bs, 1, bs);
        // Trail.
        if (sim.mode === "roll" && sim.speed > 1) { this.trail.push([sim.x, sim.y, sim.z]); if (this.trail.length > 26) this.trail.shift(); } else if (this.trail.length) this.trail.shift();
    }

    intro(dt) {
        const inp = this.s.input, T = this.sweep.T;
        if (this.stateT > 0.25 && (inp.pointer.tapped || inp.pressed("confirm") || inp.pressed("jump"))) this.endIntro();
        else if (this.stateT >= T) this.endIntro();
    }
    endIntro() { this.set("aim"); this.sim.t = 0; this.camF = [this.sim.x, this.sim.y, this.sim.z]; this.heading = this.yaw; }

    // ---------- aiming ----------
    aim(dt) {
        const { s, sim } = this, inp = s.input, p = inp.pointer;
        if (sim.mode === "roll" || sim.mode === "inside") { this.pull = null; this.set("roll"); return; }
        if (sim.mode === "lost") { this.set("lost"); return; }
        if (this.pauseE) return;
        this.idle += dt;
        const v = s.view, b = s.cam3.project([sim.x, sim.y, sim.z]), maxPull = Math.min(v.width, v.height) * 0.42;
        this.ballView = b;
        if (p.pressed && !this.pull) {
            const near = Math.hypot(p.x - b.x, p.y - b.y) < Math.max(96, maxPull * 0.6) || p.y > b.y - 16;
            this.pull = near ? { x0: p.x, y0: p.y, x: p.x, y: p.y, grab: true } : { x0: p.x, y0: p.y, x: p.x, y: p.y, grab: false };
            if (near) { this.snd.drop(); this.keyAim = false; }
        }
        if (this.pull) {
            const P = this.pull;
            P.x = p.x; P.y = p.y;
            if (P.grab) {
                const dx = P.x - b.x, dy = P.y - b.y, sx = P.x - P.x0, sy = P.y - P.y0, len = Math.hypot(sx, sy);
                const raw = clamp(len / maxPull, 0, 1);
                this.power = raw;
                if (len > 8) {
                    // Direction is where the band points: from the finger, through the ball, on the ground plane.
                    const g = this.groundPoint(b.x - sx, b.y - sy);
                    this.heading = g ? Math.atan2(g[0] - sim.x, -(g[1] - sim.z)) : this.yaw + Math.atan2(-sx, sy);
                }
                this.setNotch(raw);
            } else {
                this.yaw = wrap(this.yaw - p.dx * 0.007);
                this.heading = this.yaw;
                this.camH = clamp(this.camH + p.dy * 0.012, 2.2, 9);
            }
            if (!p.down) {
                if (P.grab && this.power > 0.07) this.fire(this.heading, this.power, this.chip);
                else if (P.grab) { this.snd.release(); this.power = 0; }
                this.pull = null; this.notch = 0;
            }
        } else {
            // Keys and pad.
            const turn = (inp.down("left") ? -1 : 0) + (inp.down("right") ? 1 : 0) + inp.move.x;
            if (turn) { if (!this.keyAim) this.keyAim = true; this.heading = wrap(this.heading + turn * dt * (inp.down("up") ? 1.2 : 0.9)); this.yaw = wrap(this.yaw + turn * dt * 0.4); }
            if (inp.down("up")) { this.keyAim = true; this.power = clamp(this.power + dt * 0.55, 0, 1); this.setNotch(this.power); }
            if (inp.down("down")) { this.keyAim = true; this.power = clamp(this.power - dt * 0.55, 0, 1); this.setNotch(this.power); }
            if (inp.pressed("fire") || inp.pressed("jump") || inp.pressed("confirm")) { if (this.power < 0.07) this.power = 0.4; this.fire(this.heading, this.power, this.chip); }
            if (inp.pressed("chip")) this.toggleChip();
            if (inp.pressed("view")) { this.snd.click(); this.wantOverview = !this.wantOverview; }
        }
        this.shownP += (this.power - this.shownP) * Math.min(1, dt * 24);
        this.bandT += dt;
        if (this.pull?.grab || this.keyAim) this.preview();
        else this.path = [];
    }

    groundPoint(x, y) {
        const r = this.s.cam3.ray(x, y), o = r.origin ?? r.from ?? r.pos, d = r.dir ?? r.direction;
        if (!o || !d || d.y > -0.02) return null;
        const t = (this.sim.y - o.y) / d.y;
        return t > 0 ? [o.x + d.x * t, o.z + d.z * t] : null;
    }

    setNotch(p) {
        const n = Math.round(p * NOTCHES);
        if (n === this.notch) return;
        const up = n > this.notch; this.notch = n;
        if (n === 0) return;
        if (up || n % 2 === 0) this.snd.notch(n, NOTCHES);
        this.ball.squash = Math.max(this.ball.squash, 0.12);
    }

    preview() {
        const g = this.ghost, sim = this.sim;
        if (this.power < 0.03) { this.path = []; return; }
        g.copyFrom(sim); g.safe = [sim.x, sim.y, sim.z];
        g.shoot(this.heading, this.power, this.chip);
        const steps = this.chip ? 460 : 150 + 150 * this.power, P = [];
        this.landing = null;
        for (let i = 0; i < steps; i++) {
            g.step();
            if (i % 9 === 0) P.push([g.x, g.y - BALL_R + 0.02, g.z, g.ground > 0]);
            if (g.mode !== "roll") break;
            if (this.chip && g.ground > 0 && P.length > 4 && i > 40) { this.landing = [g.x, g.y - BALL_R, g.z]; break; }
        }
        this.path = P;
    }

    /** The shot, from any source. Bots call this too. */
    fire(heading, power, chip) {
        const { s, sim } = this;
        this.strokes++; this.idle = 0;
        this.power = 0; this.shownP = 0; this.path = []; this.pull = null; this.notch = 0; this.keyAim = false;
        sim.shoot(heading, power, chip);
        this.lastShot = { heading, power, chip, t: sim.t };
        this.ball.squash = 0.45 + power * 0.5;
        s.freeze(0.02 + power * 0.03);
        if (power > 0.75) s.shake(0.06 + power * 0.08, 0.14, { haptic: false });
        s.burst({ at: [sim.x, sim.y - 0.1, sim.z], count: 6 + Math.round(power * 10), color: chip ? ["#fff", "#d7f4c2"] : ["#ffffff", this.skin.trail], speed: [0.8, 2 + power * 3.5], life: [0.2, 0.45], size: [0.06, 0.16], gravity: 8, dim: 3 });
        this.chip = false;
        this.set("roll");
    }

    rolling(dt) {
        const { sim, s } = this;
        this.snd.rolling(sim, dt);
        if (sim.mode === "rest" || sim.mode === "lost") { /* handled by events */ }
        // Dust and chips by ground.
        if (sim.ground > 0 && sim.mode === "roll" && sim.speed > 3 && this.game.fxRng.range(1) < 0.3) {
            const col = sim.mat === SAND ? ["#ffe0a0"] : sim.mat === SNOW ? ["#ffffff"] : sim.mat === ROCK ? ["#6a5059", "#ffb347"] : sim.mat === ICE ? ["#d7f4ff"] : ["#7fe36a"];
            s.burst({ at: [sim.x, sim.y - BALL_R, sim.z], count: 1, color: col, speed: [0.2, 1.2], life: [0.15, 0.35], size: [0.04, 0.09], gravity: 6, dim: 3 });
        }
    }

    // ---------- events from the sim ----------
    event(type, a, b) {
        const { s, sim, snd, game } = this, at = [sim.x, sim.y, sim.z];
        switch (type) {
            case "hit": snd.hit(a, b); break;
            case "wall": snd.wall(a, b); this.ball.squash = Math.max(this.ball.squash, Math.min(0.5, a * 0.05)); if (a > 5) { s.freeze(0.025); s.burst({ at, count: 7, color: ["#fff6e6", "#ffc53d"], speed: [1, 4], life: [0.15, 0.35], size: [0.05, 0.12], dim: 3 }); } break;
            case "bumper": snd.bumper(); s.freeze(0.04); s.shake(0.09, 0.14, { haptic: false }); s.burst({ at, count: 16, color: ["#ffe36b", "#ff4fd0", "#fff"], speed: [2, 7], life: [0.2, 0.5], size: [0.08, 0.18], dim: 3 }); this.pop("+", at, "#ffe36b"); break;
            case "sweep": snd.sweep(); s.freeze(0.05); s.shake(0.1, 0.16, { haptic: false }); s.burst({ at, count: 10, color: ["#ffe36b", "#fff"], speed: [2, 6], life: [0.2, 0.4], size: [0.06, 0.14], dim: 3 }); break;
            case "land": snd.land(a, b); this.ball.squash = Math.max(this.ball.squash, Math.min(0.6, a * 0.07)); s.burst({ at: [sim.x, sim.y - BALL_R, sim.z], count: Math.min(12, Math.round(a * 1.6)), color: b === SAND ? ["#ffe0a0", "#e8c07a"] : b === SNOW ? ["#fff"] : b === ICE ? ["#d7f4ff", "#fff"] : b === ROCK ? ["#6a5059", "#ffb347"] : ["#7fe36a", "#3fb04a"], speed: [0.6, 2.6], life: [0.2, 0.45], size: [0.05, 0.12], gravity: 10, dim: 3 }); break;
            case "lip": snd.lip(); this.toast("Lipped out!", "#fff", 0.9); s.shake(0.05, 0.1, { haptic: false }); break;
            case "chomp": snd.chomp(); s.freeze(0.08); s.shake(0.12, 0.2, { haptic: false }); s.burst({ at, count: 18, color: ["#ff5a7a", "#7dffa0", "#ffd23f"], speed: [1, 5], life: [0.2, 0.5], size: [0.07, 0.16], dim: 3 }); this.toast("CHOMP!", "#ff8fb0", 1, true); s.wait(0.15, () => snd.gulp()); this.trail = []; break;
            case "spit": snd.spit(); s.shake(0.1, 0.16, { haptic: false }); this.ball.squash = 0.7; s.burst({ at, count: 18, color: ["#a6ff9a", "#ffd23f", "#fff"], speed: [2, 6], life: [0.2, 0.5], size: [0.07, 0.15], dim: 3 }); break;
            case "plantbonk": snd.wall(b, 2); break;
            case "geyser": { snd.geyser(); s.freeze(0.05); s.shake(0.14, 0.25, { haptic: false }); const g = this.c.geysers[a]; s.burst({ at: [g.x, g.y + 0.3, g.z], count: 26, color: g.lava ? ["#ffb347", "#ff5a1f", "#ffe066"] : ["#fff", "#d7ecff"], speed: [2, 9], life: [0.3, 0.8], size: [0.1, 0.3], gravity: 6, dim: 3 }); this.trail = []; break; }
            case "tube": snd.tube(); this.trail = []; break;
            case "tubeout": snd.tubeOut(); s.burst({ at, count: 12, color: ["#ffc53d", "#fff"], speed: [1, 4], life: [0.2, 0.4], size: [0.06, 0.13], dim: 3 }); break;
            case "boost": snd.boost(); s.burst({ at, count: 12, color: ["#ffb347", "#ffe066"], speed: [1, 5], life: [0.2, 0.5], size: [0.06, 0.14], dim: 3 }); break;
            case "secret": this.foundSecret(); break;
            case "lost": this.onLost(a); break;
            case "hole": this.onHole(a); break;
            case "rest": this.onRest(); break;
            case "woke": break;
            default: break;
        }
    }

    foundSecret() {
        const { s, sim, snd } = this, first = !this.save.shellsFound[this.n];
        snd.secret();
        s.burst({ at: [sim.x, sim.y, sim.z], count: 26, color: ["#ffd6ec", "#ff7fbf", "#fff"], speed: [1.5, 6], life: [0.4, 0.9], size: [0.07, 0.16], gravity: 4, dim: 3 });
        this.toast(first ? "SECRET SHELL!" : "Shortcut!", "#ffc7e2", 1.8, true);
        if (first) { this.save.shellsFound[this.n] = 1; store(this.game); this.newShell = true; }
    }

    onLost(reason) {
        const { s, sim, snd } = this, at = [sim.x, sim.y, sim.z];
        snd.stopRoll();
        this.set("lost");
        if (reason === "lava") {
            snd.sizzle(); s.flash("#ff7a1a", 0.25); s.shake(0.2, 0.3, { haptic: false });
            s.burst({ at, count: 34, color: ["#ffb347", "#ff5a1f", "#ffe066", "#2a1a22"], speed: [2, 9], life: [0.4, 1], size: [0.08, 0.26], gravity: 12, dim: 3 });
            this.toast("MELTED!  +1", "#ffb347", 1.2, true); this.strokes++;
        } else if (reason === "timeout") {
            this.toast("Ball back", "#fff", 0.8);
        } else {
            snd.splash(); s.burst({ at, count: 26, color: reason === "water" || reason === "sea" ? ["#ffffff", "#9fe9ff"] : ["#c8b8a0", "#fff"], speed: [2, 7], life: [0.3, 0.8], size: [0.08, 0.2], gravity: 14, dim: 3 });
            this.toast(reason === "water" || reason === "sea" ? "SPLASH!  +1" : "OUT!  +1", "#bff1ff", 1.2, true); this.strokes++;
        }
    }

    reset() {
        const { sim, s } = this;
        sim.respawn(); this.trail = [];
        this.snd.drop();
        s.burst({ at: [sim.x, sim.y, sim.z], count: 12, color: ["#fff", this.skin.trail], speed: [0.8, 2.5], life: [0.2, 0.5], size: [0.06, 0.14], dim: 3 });
        this.ball.squash = 0.6;
        this.toAim();
    }
    onRest() { this.snd.stopRoll(); if (this.state === "roll") this.toAim(); }
    toAim() {
        const { sim } = this;
        if (this.strokes >= this.def.par + MAX_OVER) { this.pickedUp = true; this.toast("Picked up", "#fff", 1.2); this.finish(); return; }
        this.set("aim");
        this.yawGoal = this.routeYaw(sim.x, sim.z);
        this.heading = this.yawGoal;
        if (this.strokes === 0) return;
        if (!this.save.seen.chip && this.strokes >= 2 && this.def.island === 0 && this.n >= 2) { this.save.seen.chip = 1; this.toast("Tap CHIP to lob the ball", "#ffe36b", 2.4); }
    }

    onHole(speed) {
        const { s, sim, snd } = this, c = this.c.cup_;
        snd.stopRoll();
        this.set("holed");
        this.pole.lift = 1;
        snd.cup();
        s.freeze(0.07);
        s.shake(0.08, 0.16, { haptic: false });
        s.burst({ at: [c.x, c.y + 0.1, c.z], count: 22, color: ["#fff", "#ffc53d", this.skin.trail], speed: [1.5, 5], life: [0.3, 0.7], size: [0.06, 0.16], gravity: 10, dim: 3 });
        this.finish();
    }
    get pole() { return this.stage.flag; }

    /** Book the score and pick the fanfare. */
    finish() {
        const { def, snd, s, save, game } = this, par = def.par, st = this.pickedUp ? par + MAX_OVER : this.strokes, c = this.c.cup_;
        this.score = st;
        if (this.pickedUp) this.set("holed");
        this.player.scores[this.run.i] = st;
        const human = !this.player.ai;
        const w = this.pickedUp ? "PICKED UP" : word(st, par);
        this.word = w; this.wordT = 0;
        const isAce = st === 1 && !this.pickedUp;
        if (human) {
            const prev = save.best[this.n];
            if (prev === undefined) save.done++;
            if (prev === undefined || st < prev) save.best[this.n] = st;
            if (isAce) save.aces++;
            if (st < par) save.birdies++;
            if (def.island === 1 && st <= par) save.icePars++;
            for (let i = 0; i < 3; i++) { const list = HOLES.map((_, k) => k).filter((k) => HOLES[k].island === i); if (list.every((k) => save.best[k] !== undefined)) save.islandDone[i] = true; }
            this.earned = checkSkins(game);
            store(game);
        }
        if (isAce) this.celebrate();
        else {
            this.aced = false;
            s.wait(0.4, () => { if (st < par) { snd.birdie(); this.fireworks(st <= par - 2 ? 8 : 4); } else if (st === par) snd.par(); else snd.bogey(); });
        }
    }

    /** The big one. */
    celebrate() {
        const { s, snd, game } = this, c = this.c.cup_;
        this.aced = true;
        this.aceT = 0;
        s.timeScale = 0.5;
        s.freeze(0.16);
        s.flash("#ffffff", 0.55);
        snd.ace();
        s.shake(0.55, 1.4, { haptic: false });
        s.wait(0.5, () => { s.timeScale = 1; });
        s.burst({ at: [c.x, c.y + 0.4, c.z], count: 90, color: ["#ffc53d", "#fff", "#ff5fa2", "#3fd7ff"], speed: [3, 12], life: [0.6, 1.6], size: [0.1, 0.3], gravity: 9, dim: 3 });
        // Old Grumble goes off, and so does the sky over the cup.
        let n = 0;
        s.every(0.26, () => { if (n++ < 18) { this.firework(); } });
        const vt = this.stage.volcTop;
        s.every(0.14, () => { if (n < 18) s.burst({ at: [vt[0] + game.fxRng.range(-4, 4), vt[1] + 2, vt[2] + game.fxRng.range(-4, 4)], count: 8, color: ["#ffb347", "#ff5a1f", "#ffe066"], speed: [8, 26], life: [0.8, 1.6], size: [0.8, 2.2], gravity: 14, dim: 3 }); });
        for (let i = 0; i < 90; i++) this.confetti.push(this.newConfetti(true));
    }
    firework() {
        const { s, game, snd } = this, c = this.c.cup_, fx = game.fxRng, col = fx.pick([["#ffc53d", "#fff"], ["#ff5fa2", "#ffd6ec"], ["#3fd7ff", "#fff"], ["#7dffa0", "#fff"]]);
        s.burst({ at: [c.x + fx.range(-6, 6), c.y + 4 + fx.range(0, 5), c.z + fx.range(-6, 6)], count: 40, color: col, speed: [3, 7], life: [0.5, 1.1], size: [0.1, 0.22], gravity: 4, dim: 3 });
        snd.pop();
    }
    fireworks(n) { for (let i = 0; i < n; i++) this.s.wait(i * 0.28, () => this.firework()); for (let i = 0; i < 26; i++) this.confetti.push(this.newConfetti(false)); }
    newConfetti(big) {
        const v = this.s.view, fx = this.game.fxRng;
        return { x: fx.range(0, v.width), y: -fx.range(10, big ? 500 : 200), vx: fx.range(-30, 30), vy: fx.range(90, 240), r: fx.range(0, 6), vr: fx.range(-8, 8), w: fx.range(5, 11), c: fx.pick(["#ffc53d", "#ff5fa2", "#3fd7ff", "#7ddc5a", "#fff6e6"]), ph: fx.range(0, 6) };
    }
    tickConfetti(dt) {
        const v = this.s.view;
        for (const c of this.confetti) { c.ph += dt * 5; c.x += (c.vx + Math.sin(c.ph) * 40) * dt; c.y += c.vy * dt; c.r += c.vr * dt; }
        this.confetti = this.confetti.filter((c) => c.y < v.height + 20);
    }

    /** Nearby gimmicks talk: a hiss before a vent blows, a snap as a mouth shuts. */
    ambient() {
        const { sim, c, snd } = this;
        c.geysers.forEach((g, i) => {
            const d = Math.hypot(sim.x - g.x, sim.z - g.z), left = geyserIn(g, sim.t), cyc = Math.floor(sim.t / g.period + g.phase);
            if (d < 14 && left < 0.9 && this.hissed?.[i] !== cyc) { (this.hissed ??= [])[i] = cyc; snd.hiss(); if (d < 5) this.game.haptic("tick"); }
        });
        c.plants.forEach((p, i) => {
            const open = plantOpen(p, sim.t), was = this.wasOpen?.[i];
            (this.wasOpen ??= [])[i] = open;
            if (was && !open && Math.hypot(sim.x - p.x, sim.z - p.z) < 12) snd.snap();
        });
    }

    // ---------- camera ----------
    camera(dt) {
        const { s, sim, c } = this, cam = s.cam3, st = this.state;
        const ball = [sim.x, sim.y, sim.z];
        this.overview += ((this.wantOverview ? 1 : 0) - this.overview) * Math.min(1, dt * 4);
        const F = this.camF;
        if (st === "intro") {
            const T = this.sweep.T, u = clamp(this.stateT / T, 0, 1), e = u * u * (3 - 2 * u);
            const a = this.atSweep(Math.max(0, e - 0.0)), b = this.atSweep(Math.min(1, e + 0.12)), dx = b[0] - a[0], dz = b[1] - a[1], ga = sim.sample(a[0], a[1]);
            const yaw0 = Math.atan2(dx, -dz), H = 6 + Math.sin(u * Math.PI) * 2.5;
            // Fly the route backwards from the flag, facing the flag side, and ease round to behind the ball.
            const look = u < 0.72 ? yaw0 + Math.PI : this.yaw + wrap(yaw0 + Math.PI - this.yaw) * (1 - (u - 0.72) / 0.28);
            const fx = Math.sin(look), fz = -Math.cos(look), hgt = Math.max(ga > -5 ? ga : c.cup_.y, 2);
            cam.pos.set(a[0] - fx * 7.5, hgt + H, a[1] - fz * 7.5);
            cam.target.set(a[0] + fx * 1.5, hgt + 0.2, a[1] + fz * 1.5);
            if (this.stateT < 0.05) cam.cut?.();
            return;
        }
        const spd = st === "roll" ? 7 : 5;
        F[0] += (ball[0] - F[0]) * Math.min(1, dt * spd); F[1] += (ball[1] - F[1]) * Math.min(1, dt * spd * 0.8); F[2] += (ball[2] - F[2]) * Math.min(1, dt * spd);
        if (st === "aim" && !this.pull && this.yawGoal !== undefined && !this.keyAim) { const dy = wrap(this.yawGoal - this.yaw); this.yaw = wrap(this.yaw + dy * Math.min(1, dt * 3)); if (Math.abs(dy) < 0.01) this.yawGoal = undefined; }
        else if (st === "roll" && sim.speed > 5 && sim.ground > 0) { const h = Math.atan2(sim.vx, -sim.vz); this.yaw = wrap(this.yaw + wrap(h - this.yaw) * Math.min(1, dt * 0.7)); }
        else if (st === "holed") this.yaw = wrap(this.yaw + dt * (this.aced ? 0.9 : 0.35));
        const speedOut = st === "roll" ? clamp(sim.speed / 16, 0, 1) : 0;
        let dist = (this.camDist + speedOut * 2.2) * this.zoom, H = (this.camH + speedOut * 1.4) * this.zoom, lk = this.look + speedOut * 1.5;
        if (st === "holed") { dist = this.aced ? 6.5 : 5.5; H = this.aced ? 3 : 3.6; lk = 0; }
        const f = this.fwd(this.yaw);
        let ex = F[0] - f[0] * dist, ez = F[1] === undefined ? 0 : F[2] - f[1] * dist, ey = F[1] + H, tx = F[0] + f[0] * lk, ty = F[1] + 0.15, tz = F[2] + f[1] * lk;
        if (this.overview > 0.01) {
            const sp = c.span, cx = (sp.x0 + sp.x1) / 2, cz = (sp.z0 + sp.z1) / 2, w = sp.x1 - sp.x0, d = sp.z1 - sp.z0, v = s.view, aspect = v.width / v.height, far = Math.max(w / Math.min(1.1, aspect * 1.2), d) * 0.92 + 4, k = this.overview * this.overview * (3 - 2 * this.overview);
            const oy = c.cup_.y + far * 0.95;
            ex += (cx - f[0] * far * 0.25 - ex) * k; ey += (oy - ey) * k; ez += (cz - f[1] * far * 0.25 - ez) * k;
            tx += (cx - tx) * k; ty += (c.cup_.y - ty) * k; tz += (cz - tz) * k;
        }
        // Stay above the ground under the eye.
        if (c.inFairway(ex, ez)) { const g = sim.sample(ex, ez) + 1.3; if (ey < g) ey = g; }
        cam.pos.set(ex, ey, ez); cam.target.set(tx, ty, tz);
    }

    // ---------- 2D over the 3D ----------
    toast(str, col = "#fff", life = 1.4, big = false) { this.toasts.push({ str, col, t: 0, life, big }); }
    pop(str, at, col) { /* kept simple: bursts already mark bumpers */ }

    draw2d(d) {
        const { s, sim } = this, cam = s.cam3;
        // Trail.
        if (this.trail.length > 2 && this.state !== "intro" && this.save.settings.trail) {
            const T = this.trail, col = this.skin.trail;
            d.additive(() => { for (let i = 1; i < T.length; i++) { const a = cam.project(T[i - 1]), b = cam.project(T[i]); d.line([a.x, a.y], [b.x, b.y], { width: 1 + i / T.length * 5, color: col, opacity: i / T.length * 0.32 }); } });
        }
        if (this.state === "aim") this.drawAim(d);
    }

    drawAim(d) {
        const { s, sim } = this, cam = s.cam3, b = cam.project([sim.x, sim.y, sim.z]), P = this.pull, pw = this.shownP;
        const hot = pw < 0.5 ? mixHex("#7dffa0", "#ffe36b", pw * 2) : mixHex("#ffe36b", "#ff4a2a", (pw - 0.5) * 2);
        // A breathing ring says: grab me.
        if (!P?.grab && !this.keyAim) {
            const k = 0.5 + 0.5 * Math.sin(s.time * 4);
            d.circle(20 + k * 7, { x: b.x, y: b.y, color: "#ffffff", outline: 2.5, opacity: 0.75 - k * 0.45 });
            if ((this.n === 0 && this.strokes === 0) || this.idle > 7) this.drawHint(d, b);
        }
        if (pw < 0.02) return;
        // Dotted flight or roll line, fading away.
        const n = this.path.length;
        for (let i = 1; i < n; i++) {
            const p = cam.project(this.path[i]), k = 1 - i / n;
            if (!p.visible) continue;
            d.circle(2 + k * 3.5, { x: p.x, y: p.y, color: "#141a2e", opacity: k * 0.35 });
            d.circle(1.5 + k * 2.8, { x: p.x, y: p.y, color: i % 2 ? hot : "#ffffff", opacity: 0.35 + k * 0.65 });
        }
        if (this.chip && this.landing) {
            const l = cam.project(this.landing), k = 0.5 + 0.5 * Math.sin(s.time * 8);
            d.circle(13 + k * 3, { x: l.x, y: l.y, color: INK, outline: 5, opacity: 0.5 }); d.circle(13 + k * 3, { x: l.x, y: l.y, color: hot, outline: 3 });
        }
        // The power arc, laid out on the ground ahead of the ball, sweeping open as you pull.
        const h = this.heading, R = 0.8 + pw * 3.2, spread = 0.2 + pw * 0.55, seg = 16, pts = [], inner = [];
        for (let i = 0; i <= seg; i++) {
            const a = h + (i / seg - 0.5) * spread * 2, x = sim.x + Math.sin(a) * R, z = sim.z - Math.cos(a) * R, xi = sim.x + Math.sin(a) * (R - 0.38), zi = sim.z - Math.cos(a) * (R - 0.38), y = sim.y - BALL_R + 0.05;
            pts.push(cam.project([x, y, z])); inner.push(cam.project([xi, y, zi]));
        }
        for (let i = 0; i < seg; i++) d.line([pts[i].x, pts[i].y + 2], [pts[i + 1].x, pts[i + 1].y + 2], { width: 4, color: INK, opacity: 0.35 });
        for (let i = 0; i < seg; i++) {
            const k = 1 - Math.abs(i / (seg - 1) - 0.5) * 2;
            d.poly([[pts[i].x, pts[i].y], [pts[i + 1].x, pts[i + 1].y], [inner[i + 1].x, inner[i + 1].y], [inner[i].x, inner[i].y]], { color: hot, opacity: 0.5 + k * 0.5 });
        }
        // The band: two strands from the ball to the pouch under your finger.
        if (P?.grab) {
            const sx = P.x - P.x0, sy = P.y - P.y0, l = Math.hypot(sx, sy) || 1, q = { x: b.x + sx, y: b.y + sy }, ux = -sy / l * 12, uy = sx / l * 12, w = 7 - pw * 4;
            d.line([b.x + ux, b.y + uy], [q.x, q.y], { width: w, color: INK }); d.line([b.x - ux, b.y - uy], [q.x, q.y], { width: w, color: INK });
            d.line([b.x + ux, b.y + uy], [q.x, q.y], { width: w * 0.55, color: hot }); d.line([b.x - ux, b.y - uy], [q.x, q.y], { width: w * 0.55, color: hot });
            d.circle(13, { x: q.x, y: q.y, color: INK }); d.circle(9.5, { x: q.x, y: q.y, color: hot }); d.circle(3.5, { x: q.x - 2.5, y: q.y - 2.5, color: "#ffffff", opacity: 0.8 });
        }
        // Power ring round the ball.
        const r = 28 + pw * 6, ang = pw * TAU, ns = 34;
        d.circle(r, { x: b.x, y: b.y, color: INK, outline: 7, opacity: 0.55 });
        for (let i = 0; i < ns * pw; i++) {
            const a0 = -Math.PI / 2 + i / ns * TAU, a1 = a0 + TAU / ns;
            d.line([b.x + Math.cos(a0) * r, b.y + Math.sin(a0) * r], [b.x + Math.cos(a1) * r, b.y + Math.sin(a1) * r], { width: 4.5, color: i / ns < 0.5 ? mixHex("#7dffa0", "#ffe36b", i / ns * 2) : mixHex("#ffe36b", "#ff4a2a", (i / ns - 0.5) * 2) });
        }
        sticker(d, `${Math.round(pw * 100)}`, b.x, b.y - r - 17, 15, CREAM, INK);
    }

    drawHint(d, b) {
        // A ghost thumb showing the pull, on a loop, until it's learned.
        const s = this.s, t = (s.time % 2.2) / 2.2, k = t < 0.15 ? 0 : t < 0.7 ? (t - 0.15) / 0.55 : 1, gone = t > 0.82 ? 1 - (t - 0.82) / 0.18 : 1, e = k * k * (3 - 2 * k), x = b.x, y = b.y + 18 + e * 82;
        d.line([b.x, b.y + 10], [x, y], { width: 3, color: "#ffffff", opacity: 0.55 * gone });
        d.circle(15, { x, y, color: "#ffffff", opacity: 0.3 * gone }); d.circle(9, { x, y, color: "#ffffff", opacity: 0.85 * gone });
        sticker(d, "PULL BACK", b.x, b.y - 58, 21, "#ffe36b", INK, { opacity: 1 });
    }

    drawUI(d) {
        const { s } = this, v = s.view, sf = v.safe, L = this.L, def = this.def;
        const portrait = v.height > v.width, top = sf.top + 10;
        // Hole plate.
        if ((this.state !== "intro" || this.stateT > 0.2) && !this.card) {
            const w = 158, x = sf.left + 12 + w / 2, y = top + 25;
            panel(d, x, y, w, 50, { radius: 15, color: CREAM });
            d.rect(46, 42, { x: x - w / 2 + 27, y, color: L.accent, radius: 11 });
            d.text(`${this.run.mode === "tour" ? this.n % 9 + 1 : this.run.i + 1}`, { x: x - w / 2 + 27, y: y + 1, size: 25, bold: true, font: FONT, color: "#fff" });
            d.text(def.name.length > 15 ? def.name.slice(0, 14) + "…" : def.name, { x: x + 21, y: y - 10, size: 12, bold: true, font: FONT, color: INK });
            d.text(`Par ${def.par}`, { x: x + 21, y: y + 9, size: 15, bold: true, font: FONT, color: L.accent });
        }
        // Stroke count.
        const cx = v.width - sf.right - 12 - 48 - 10 - 34, cy = top + 25;
        if (!this.card) {
            panel(d, cx, cy, 68, 50, { radius: 15 });
            d.text("SHOTS", { x: cx, y: cy - 14, size: 10, bold: true, font: FONT, color: INK, opacity: 0.7 });
            d.text(`${this.strokes}`, { x: cx, y: cy + 8, size: 25, bold: true, font: FONT, color: this.strokes >= def.par ? "#d43b2a" : INK });
        }
        if (this.run.players.length > 1 && !this.run.cup) { sticker(d, this.player.name, v.width / 2, top + 72, 15, this.player.col); }
        this.flagMark(d);
        if (this.state === "intro") this.drawIntro(d);
        // Toasts.
        let ty = v.height * 0.26;
        for (const t of this.toasts) {
            const k = clamp(t.t / 0.18, 0, 1), o = clamp((t.life - t.t) / 0.25, 0, 1), size = (t.big ? 34 : 19) * Math.min(1, v.width / 340) * (0.6 + 0.4 * easeBack(k));
            sticker(d, t.str, v.width / 2, ty - (1 - k) * 12, size, t.col, INK, { opacity: o });
            ty += size + 12;
        }
        for (const c of this.confetti) { d.push(); d.translate(c.x, c.y); d.rotate(c.r); d.rect(c.w, c.w * 0.55 * Math.abs(Math.sin(c.ph)) + 2, { color: c.c }); d.pop(); }
        if (this.hurry) sticker(d, ">>>", v.width / 2, v.height - v.safe.bottom - 40, 22, this.L.gold, INK);
        else if (this.state === "roll" && this.stateT > 4) sticker(d, "Hold to hurry", v.width / 2, v.height - v.safe.bottom - 40, 13, CREAM, INK, { opacity: 0.8 });
        if (this.word && this.state === "holed") this.drawWord(d);
    }

    flagMark(d) {
        const { s, sim, c } = this, v = s.view, cam = s.cam3, cup = c.cup_;
        if (this.state !== "aim" && this.state !== "roll") return;
        const p = cam.project([cup.x, cup.y + 3, cup.z]), dist = Math.hypot(sim.x - cup.x, sim.z - cup.z), bob = Math.sin(s.time * 5) * 3;
        const m = 26, top = v.safe.top + 92, bot = v.height - v.safe.bottom - 84;
        if (p.visible && p.y > top - 10) {
            d.poly([[p.x - 8, p.y - 14 + bob], [p.x + 8, p.y - 14 + bob], [p.x, p.y - 3 + bob]], { color: "#ff4a4a" });
            sticker(d, `${Math.round(dist)}m`, p.x, p.y - 25 + bob, 13, CREAM, INK);
        } else {
            let ax = clamp(p.x, m, v.width - m), ay = clamp(p.y, top, bot);
            const a = Math.atan2(p.y - v.height / 2, p.x - v.width / 2);
            d.push(); d.translate(ax, ay); d.rotate(a);
            d.poly([[12, 0], [-6, -9], [-6, 9]], { color: "#ff4a4a" });
            d.pop();
        }
    }

    drawIntro(d) {
        const { s } = this, v = s.view, u = this.stateT, T = this.sweep.T, inn = clamp(u / 0.4, 0, 1), o = clamp((T - u) / 0.3, 0, 1), k = easeBack(inn), cx = v.width / 2 + (1 - k) * -v.width, y = v.height * 0.2 + 34, size = Math.min(48, v.width * 0.12);
        const lab = this.run.mode === "tour" ? `HOLE ${this.n % 9 + 1}` : `HOLE ${this.run.i + 1}`;
        sticker(d, lab, cx, y, size, this.L.gold, INK, { opacity: o });
        sticker(d, this.def.name, cx, y + size * 0.88, Math.min(26, v.width * 0.065), CREAM, INK, { opacity: o });
        sticker(d, `PAR ${this.def.par}`, cx, y + size * 1.58, 20, "#ffffff", this.L.accent, { opacity: o });
        const t2 = clamp((u - 0.6) / 0.3, 0, 1) * o;
        if (t2 > 0) {
            const by = v.height - v.safe.bottom - 72, w = Math.min(v.width - 30, 420);
            d.rect(w, 42, { x: v.width / 2, y: by, color: INK, opacity: 0.8 * t2, radius: 14 });
            d.text(this.def.tip, { x: v.width / 2, y: by, size: 14.5, bold: true, font: FONT, color: CREAM, opacity: t2, maxWidth: w - 16, align: "center" });
            sticker(d, "Tap to skip", v.width / 2, by - 34, 12, "#ffffff", INK, { opacity: t2 * 0.8 });
        }
    }

    drawWord(d) {
        const { s } = this, v = s.view;
        const u = this.stateT, big = this.aced;
        if (big) {
            // A slow sunburst behind everything, then letters falling in one at a time, big enough to fill the screen.
            const rays = 14, R = Math.hypot(v.width, v.height), fade = clamp(u * 2, 0, 1) * clamp((6 - u) * 2, 0, 1), sx = v.width / 2, sy = v.height * 0.43;
            d.additive(() => { for (let i = 0; i < rays; i++) { const a = u * 0.35 + i / rays * TAU, w = TAU / rays * 0.25; d.poly([[sx, sy], [sx + Math.cos(a - w) * R, sy + Math.sin(a - w) * R], [sx + Math.cos(a + w) * R, sy + Math.sin(a + w) * R]], { color: i % 2 ? "#ffc53d" : "#ff5fa2", opacity: 0.2 * fade }); } });
            const words = ["HOLE", "IN", "ONE!"], size = Math.min(v.width / 3.4, 104), cx = v.width / 2;
            let y = v.height * 0.27;
            words.forEach((w, row) => {
                const step = size * 0.82, x0 = cx - (w.length - 1) * step / 2;
                [...w].forEach((ch, i) => {
                    const delay = 0.05 + row * 0.2 + i * 0.07, t = clamp((u - delay) / 0.4, 0, 1);
                    if (t <= 0) return;
                    const e = easeBack(t), wob = Math.sin(u * 4 + i + row) * 0.05, hue = ["#ffd23f", "#ff5fa2", "#3fd7ff", "#7dffa0"][(i + row) % 4];
                    sticker(d, ch, x0 + i * step, y - (1 - e) * v.height * 0.5 + Math.sin(u * 5 + i * 0.9) * 5, size * (0.9 + e * 0.1), hue, INK, { rot: wob });
                });
                y += size * 0.98;
            });
            return;
        }
        const t = clamp(u / 0.3, 0, 1), e = easeBack(t), size = Math.min(v.width / 6.4, 58) * (this.word.length > 8 ? 0.8 : 1);
        const good = this.score <= this.def.par;
        sticker(d, this.word, v.width / 2, v.height * 0.3, size * e, good ? "#ffd23f" : CREAM, INK);
    }

    // ---------- the scorecard ----------
    showCard() {
        const { s, run, game, snd, def, save } = this;
        const v = s.view;
        this.card = { t: 0, word: this.word }; this.word = null;
        // Rivals post their hole in a cup.
        if (run.cup) for (const r of run.rivals) { const rng = () => game.rng.range(0, 1); r.scores[run.i] = rivalScore(rng, run.cup.skill, r.form, def.par); }
        const last = run.i === run.order.length - 1;
        const nextP = run.players.length > 1 && !run.cup ? (run.p + 1 < run.players.length ? run.p + 1 : null) : null;
        let label = "Next hole", go;
        if (nextP !== null) { label = `Pass to ${run.players[nextP].name}`; go = () => { run.p = nextP; game.go("pass", {}, { fade: 0.2 }); }; }
        else if (last) { label = run.mode === "tour" ? "Back to the map" : "Final standings"; go = () => { if (run.mode === "tour") game.go("hub", { island: this.c.island }, { fade: 0.25 }); else game.go("final", {}, { fade: 0.25 }); }; }
        else go = () => { run.i++; run.p = 0; if (run.players.length > 1 && !run.cup) game.go("pass", {}, { fade: 0.2 }); else game.go("play", {}, { fade: 0.25 }); };
        const wide = v.width > v.height, bx = wide ? v.width * 0.74 : v.width / 2, by = wide ? v.height / 2 + 38 : v.height - v.safe.bottom - 54;
        this.btnNext = s.add([fatButton(label, { w: wide ? 220 : 250, h: 56, size: 19, onTap: () => { snd.click(); go(); }, action: "confirm", pulse: true }), pos(bx, by), ui()]);
        if (run.mode === "tour") this.btnAgain = s.add([fatButton("Play again", { w: 170, h: 50, size: 15, color: CREAM, dark: "#cdbb9d", onTap: () => { snd.click(); game.go("play", {}, { fade: 0.2 }); } }), pos(bx, by - 66), ui()]);
        s.add([ui(), layer(-5), { draw: (d) => this.drawCard(d) }]);
    }
    standings() {
        const { run } = this, list = [...run.players];
        if (run.cup) list.push(...run.rivals);
        const upto = run.i;
        const rows = list.map((p) => { let st = 0, par = 0; for (let i = 0; i <= upto; i++) if (p.scores[i] !== undefined) { st += p.scores[i]; par += HOLES[run.order[i]].par; } return { p, st, par, d: st - par }; });
        rows.sort((a, b) => a.d - b.d);
        return rows;
    }
    drawCard(d) {
        const { s, run } = this, v = s.view, c = this.card;
        const k = easeBack(clamp(c.t / 0.3, 0, 1));
        d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: INK, opacity: 0.45 * clamp(c.t * 4, 0, 1) });
        const w = Math.min(v.width - 30, 340), rows = run.mode === "tour" ? [] : this.standings().slice(0, 6), h = 128 + rows.length * 30 + (this.earned?.length ? 46 : 0) + (this.newShell ? 26 : 0), wide = v.width > v.height, cx = wide ? v.width * 0.3 : v.width / 2, cy = (wide ? v.height / 2 : (v.height - 120 - v.safe.bottom) / 2 + 20) - (1 - k) * 60;
        panel(d, cx, cy, w, h, { opacity: clamp(c.t * 5, 0, 1) });
        let y = cy - h / 2 + 30;
        d.text(c.word, { x: cx, y, size: 26, bold: true, font: FONT, color: this.score <= this.def.par ? "#d97706" : INK }); y += 34;
        d.text(this.def.name, { x: cx, y, size: 15, bold: true, font: FONT, color: INK, opacity: 0.75 }); y += 26;
        const dd = this.score - this.def.par;
        d.text(`${this.score} ${this.score === 1 ? "shot" : "shots"}  ·  par ${this.def.par}  ·  ${toPar(dd)}`, { x: cx, y, size: 16, bold: true, font: FONT, color: INK }); y += 28;
        const best = this.save.best[this.n];
        if (run.mode === "tour") { d.text(`Best here: ${best ?? "-"}   Shells: ${shellCount(this.save)} of 27`, { x: cx, y, size: 13, bold: true, font: FONT, color: INK, opacity: 0.7 }); y += 22; }
        if (this.newShell) { d.text("Secret shell found!", { x: cx, y, size: 15, bold: true, font: FONT, color: "#e0439b" }); y += 26; }
        rows.forEach((r, i) => {
            const me = !r.p.rival;
            d.rect(w - 28, 26, { x: cx, y, color: me ? "#ffe9b0" : "#f4e6cc", radius: 8 });
            d.circle(7, { x: cx - w / 2 + 28, y, color: r.p.col });
            d.text(`${i + 1}. ${r.p.name}`, { x: cx - 22, y, size: 14, bold: true, font: FONT, color: INK });
            d.text(toPar(r.d), { x: cx + w / 2 - 38, y, size: 15, bold: true, font: FONT, color: r.d < 0 ? "#c0392b" : INK });
            y += 30;
        });
        if (this.earned?.length) { const e = this.earned[0]; d.text("New ball!", { x: cx, y: y + 2, size: 13, bold: true, font: FONT, color: "#e0439b" }); d.text(e.name, { x: cx, y: y + 21, size: 18, bold: true, font: FONT, color: INK }); }
    }
}

function mixHex(a, b, t) {
    t = clamp(t, 0, 1);
    const p = (h, i) => parseInt(h.slice(i, i + 2), 16), f = (i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0");
    return `#${f(1)}${f(3)}${f(5)}`;
}
