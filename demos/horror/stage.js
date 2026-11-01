// What you see and hear. Reads the Sim, owns the entities, draws the torch.
// The torch is three tricks together: the single sun is aimed along the beam from your hand (so shadows swing), fog closes the distance,
// and a screen-space mask carves the cone. A cone from the eye is a circle on the screen, so the mask is exact, and the same angle drives the rules.
import { color, mesh, pin, pos, rot, scale, text } from "./pogo.js";
import { BASEMENT_Y, CELL, FILES, NIGHTS, SPOTS } from "./data.js";
import { CEIL, roomAt } from "./world.js";
import { CONE, DOORS, EYE, LOCKERS, RANGE, beltAt, field, floorY, idx, isSolid, spot } from "./sim.js";
import { Sound } from "./audio.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

const AMBIENT = {
    hall: [[0.05, 0.075, 0.13], [0.022, 0.026, 0.04]], paint: [[0.04, 0.06, 0.1], [0.02, 0.02, 0.03]], lockers: [[0.04, 0.06, 0.1], [0.02, 0.02, 0.03]], stairs: [[0.025, 0.03, 0.05], [0.01, 0.01, 0.015]],
    office: [[0.42, 0.34, 0.2], [0.2, 0.14, 0.08]], records: [[0.03, 0.04, 0.05], [0.015, 0.015, 0.02]], boiler: [[0.1, 0.045, 0.03], [0.05, 0.02, 0.015]], bench: [[0.035, 0.04, 0.05], [0.015, 0.015, 0.02]],
};
const DOLL = 1.22, NECK = 0.84 * DOLL;
const LOOP = [];
{   // Line A, as a closed path for the crates to ride.
    for (let x = 11; x <= 22; x++) LOOP.push([x, 8]);
    for (let z = 9; z <= 12; z++) LOOP.push([22, z]);
    for (let x = 21; x >= 11; x--) LOOP.push([x, 12]);
    for (let z = 11; z >= 9; z--) LOOP.push([11, z]);
}

export class Stage {
    constructor(game, s, sim, o = {}) {
        this.game = game; this.s = s; this.sim = sim; this.o = o;
        this.snd = o.snd ?? new Sound(game);
        this.snd.occluded = (x, z) => !sim.sees(sim.p.x, sim.p.z, x, z);
        this.t = 0; this.beam = 0; this.adapt = 1; this.sky = [0.04, 0.05, 0.08]; this.ground = [0.02, 0.02, 0.03];
        this.bob = 0; this.bobY = 0; this.heartAt = 0; this.beat = 0; this.toggleKick = 0; this.sub = null; this.subs = []; this.card = null; this.fileCard = null;
        this.holdSubs = 0; this.shakeLook = 0; this.lamp = 0; this.cine = null; this.flick = 1; this.tick = 0; this.motes = [];
        for (let i = 0; i < 26; i++) this.motes.push({ a: game.fxRng.range(0, 6.28), r: game.fxRng.range(0.05, 0.95), s: game.fxRng.range(0.2, 1), p: game.fxRng.range(0, 6.28) });
        this.build();
        this.audio();
        s.onDraw((d) => this.drawScreen(d));
        s.onDrawUI((d) => this.drawHud(d));
        s.on("leave", () => this.snd.stopAll());
        this.update(0);
        s.cam3.set(s.cam3.pos, s.cam3.target);
    }

    // --- Entities -------------------------------------------------------------------------------
    build() {
        const { s, sim } = this, def = sim.def;
        s.cam3.fov = 70;
        s.cam3.near = 0.06;
        s.background = "#000000";
        s.light.shadows = !this.o.noShadows;
        s.light.softShadows = false;
        s.light.shadowRange = 12;
        s.light.color = color("#ffffff");
        s.light.sky = color("#000000");
        s.light.ground = color("#000000");
        s.light.fog = { color: color("#03040a"), near: 2, far: 18 };
        // Walls can't cast: a sun aimed along the beam would be blocked by the wall behind you. Dolls can, which is much better.
        s.add([mesh("factory", { texture: "atlas", shine: 0, shadow: false }), pos(0, 0, 0)]);
        this.sitters = s.add([mesh("sitters", { shine: 0.35, shadow: false }), pos(0, 0, 0)]);
        this.sitters.hidden = !!def.empty;
        this.ribs = s.add([mesh("ribs0", { shadow: false }), pos(0, 0, 0)]);

        this.doors = sim.doors.map((d) => {
            const dirX = d.dir === "x", x = d.cx * CELL + (dirX ? 0 : 1), z = d.cz * CELL + (dirX ? 1 : 0), base = dirX ? 0 : -Math.PI / 2;
            const e = s.add([mesh("door", { texture: "atlas" }), pos(x, 0, z), rot(0, base, 0)]);
            return { d, e, base, open: d.open ? 1 : 0 };
        });
        this.dolls = sim.dolls.map((d, i) => {
            const style = i % 3, head = `${d.kind === "blind" ? "blind" : "head"}${style}`;
            return {
                d, style,
                body: s.add([mesh(`body${style}_0`, { shine: 0.04 }), pos(d.x, d.y, d.z), rot(0, d.yaw, 0), scale(DOLL)]),
                head: s.add([mesh(head, { shine: 0.45 }), pos(d.x, d.y + NECK, d.z), rot(0, d.yaw, 0), scale(DOLL * 0.92)]),
                sway: 0, lift: 0, hy: d.yaw, tilt: 0.3, blink: i * 1.7,
            };
        });
        // Shelf dolls that turn their heads. Only a dozen do, and they're the ones at eye height.
        this.starers = [];
        if (!def.empty) {
            const at = [[9.5, 3.03], [12.5, 3.03], [15.5, 3.03], [18.5, 3.03], [10.5, 4.97], [13.5, 4.97], [16.5, 4.97], [11.5, 5.03], [17.5, 5.03], [9.5, 7.03], [12.5, 7.03], [16.5, 7.03]];
            at.forEach(([cx, cz], i) => {
                const south = cz % 2 > 1 || (cz > 3 && cz < 4) ? 0 : 0;
                const facing = Math.abs(cz - Math.round(cz)) < 0.05 && (cz < 3.5 || cz > 5.01) ? 0 : Math.PI;
                const face = cz === 4.97 ? Math.PI : 0, z = cz * CELL + (face ? 0.34 : -0.36), x = cx * CELL, y = 1.5 + 0.2;
                const e = s.add([mesh(`shelfhead${i % 3}`, { shine: 0.4, shadow: false }), pos(x, 1.5 + 0.2 * 1.26, z), rot(0, face, 0), scale(1.26)]);
                this.starers.push({ e, base: face, yaw: face, x, z });
            });
        }
        // The named dolls: a manila tag on each.
        const f = FILES[sim.night];
        if (f && !def.empty) {
            const fx = f.x * CELL, fz = f.z * CELL, fy = f.y;
            s.add([mesh("box", { size: [0.13, 0.08, 0.01], color: "#d9c48f", shadow: false }), pos(fx, fy - 0.13, fz - 0.03), rot(0.1, 0, 0.28)]);
            s.add([mesh("box", { size: [0.02, 0.02, 0.01], color: "#7c2a26", shadow: false }), pos(fx - 0.05, fy - 0.11, fz - 0.02)]);
        }
        this.batteries = sim.batteries.map((b) => ({ b, e: s.add([mesh("battery", { shine: 0.7 }), pos(b.x, floorY(b.x, b.z) + 0.02, b.z), rot(0, 0, 1.45)]) }));

        this.crates = [];
        for (let i = 0; i < 6; i++) this.crates.push({ u: i * (LOOP.length / 6), e: s.add([mesh("beltcrate", { texture: "atlas" }), pos(0, 0.24, 0)]) });
        this.stamps = [];
        for (const cx of [13, 14, 15, 18, 19, 20]) this.stamps.push({ phase: cx * 0.73, e: s.add([mesh("stamp", { texture: "atlas" }), pos((cx + 0.5) * CELL, 3.0, 21)]) });

        // Set dressing for the night.
        if (sim.night === 0) this.deskDoll = this.prop("sitting", 0, 45.2, 0.86, 6.9, Math.PI / 2 + 0.2, 0.72);
        if (sim.night === 3) this.benchDoll = this.prop("bench", 1, 45.1, BASEMENT_Y + 0.98, 46.0, 0, 1);
    }
    prop(kind, style, x, y, z, yaw, sc) {
        const { s } = this;
        const body = s.add([mesh(`body${style}_0`, { shine: 0.2 }), pos(x, y, z), rot(0, yaw, 0), scale(sc)]);
        const head = s.add([mesh(`head${style}`, { shine: 0.6 }), pos(x, y + 0.84 * sc, z), rot(0, yaw, 0), scale(sc)]);
        return { body, head };
    }

    // --- Continuous sound ----------------------------------------------------------------------
    audio() {
        const snd = this.snd;
        this.room = snd.voice({ wave: "noise", freq: 150, volume: 0.03 });
        this.drone = snd.voice({ wave: "sine", freq: 55, volume: 0 });
        this.drone2 = snd.voice({ wave: "sine", freq: 55.7, volume: 0 });
        this.beltV = snd.voice({ wave: "noise", freq: 420, volume: 0 });
        this.beltM = snd.voice({ wave: "sawtooth", freq: 46, volume: 0 });
        this.boil = snd.voice({ wave: "sawtooth", freq: 41, volume: 0 });
        this.buzz = snd.voice({ wave: "sawtooth", freq: 120, volume: 0 });
        this.whisper = snd.voice({ wave: "noise", freq: 1400, volume: 0 });
    }
    updateAudio() {
        const { sim, snd, t } = this, p = sim.p;
        snd.x = p.x; snd.z = p.z; snd.yaw = p.yaw;
        const under = p.y < -1.5;
        this.room.set({ volume: under ? 0.04 : 0.028, freq: under ? 90 : 170 });
        const dg = sim.danger;
        this.drone.set({ volume: dg * dg * 0.13, freq: 52 + dg * 8 });
        this.drone2.set({ volume: dg * dg * 0.1, freq: 52.7 + dg * 9 });
        const belt = sim.belt ? 1 : 0, cx = clamp(p.x, 22, 46), cz = clamp(p.z, 16, 26);
        this.beltV.set({ x: cx, z: cz, volume: belt * 0.12, near: 8 });
        this.beltM.set({ x: cx, z: cz, volume: belt * 0.05 + 0.001, near: 8, freq: 46 + Math.sin(t * 5) * 1.5 });
        this.boil.set({ x: 31, z: 45, volume: 0.09, near: 7 });
        const office = !sim.def.dark;
        this.buzz.set({ x: 46, z: 7, volume: office ? 0.012 : 0, near: 5 });
        const n = sim.nearest;
        if (n && !n.frozen) this.whisper.set({ x: n.x, z: n.z, volume: 0.03 * (0.6 + Math.sin(t * 9) * 0.4), near: 3, freq: 1200 + Math.sin(t * 17) * 500 });
        else this.whisper.set({ volume: 0 });
    }

    // --- One step of the world --------------------------------------------------------------------
    update(dt) {
        const { sim, s, game } = this, p = sim.p;
        this.t += dt;
        this.handleEvents();
        this.updateAudio();
        const speed = p.moving;
        this.bob += speed * dt * 8.4;
        this.bobY = Math.sin(this.bob) * 0.03 * speed;

        // Torch state: it never quite behaves when low.
        const on = sim.beamOn() ? 1 : 0;
        let flick = 1;
        if (on && p.battery < 25) {
            this.tick -= dt;
            if (this.tick <= 0) { this.tick = game.fxRng.range(0.04, 0.5 + p.battery / 25); this.flick = game.fxRng.range(0.45, 1); }
            flick = this.flick;
        }
        this.beam = on ? Math.min(1, this.beam + dt * 16) : Math.max(0, this.beam - dt * 11);
        this.adapt = on ? Math.max(0, this.adapt - dt * 3) : Math.min(1, this.adapt + dt * 0.5);

        const ax = -Math.sin(p.aimYaw) * Math.cos(p.aimPitch), ay = Math.sin(p.aimPitch), az = -Math.cos(p.aimYaw) * Math.cos(p.aimPitch);
        const rx = Math.cos(p.aimYaw), rz = -Math.sin(p.aimYaw);
        const L = s.light, strength = this.beam * flick * (p.battery > 25 ? 1 : 0.62 + (p.battery / 25) * 0.38);
        L.dir.set(ax - rx * 0.12, ay + 0.15, az - rz * 0.12);
        const warm = p.battery > 25 ? [1.42, 1.32, 1.12] : [1.4, 1.05, 0.68];
        L.color.r = warm[0] * strength; L.color.g = warm[1] * strength; L.color.b = warm[2] * strength;

        const room = roomAt(p.x, p.z), base = AMBIENT[room] ?? AMBIENT.hall, litRoom = room === "office" && !sim.def.dark;
        const dark = room === "office" && sim.def.dark ? 0.1 : 1, boost = (1 + this.adapt * 2.1) * dark * (this.o.ambient ?? 1);
        this.sky = this.sky.map((c, i) => damp(c, base[0][i] * boost, 3, dt));
        this.ground = this.ground.map((c, i) => damp(c, base[1][i] * boost, 3, dt));
        L.sky.r = this.sky[0]; L.sky.g = this.sky[1]; L.sky.b = this.sky[2];
        L.ground.r = this.ground[0]; L.ground.g = this.ground[1]; L.ground.b = this.ground[2];
        this.lamp = damp(this.lamp, litRoom ? 1 : 0, 3, dt);
        const reach = sim.range();
        L.fog.near = lerp(3, 2.5, this.beam);
        L.fog.far = lerp(11, reach * 1.2, this.beam);

        // Camera.
        let ex = p.x, ey = p.y + EYE + this.bobY, ez = p.z, yaw = p.yaw, pitch = p.pitch;
        if (p.hide >= 0) ey = p.y + 1.5 + Math.sin(this.t * 1.3) * 0.012;
        if (this.cine?.camera) ({ ex, ey, ez, yaw, pitch } = this.cine.camera({ ex, ey, ez, yaw, pitch }, dt));
        const c = Math.cos(pitch);
        s.cam3.pos.set(ex, ey, ez);
        s.cam3.target.set(ex - Math.sin(yaw) * c, ey + Math.sin(pitch), ez - Math.cos(yaw) * c);

        if (!sim.def.empty) this.sitters.hidden = p.y < -1.8;
        this.syncDolls(dt);
        this.syncWorld(dt);
        this.heart(dt);
        if (this.cine?.update) this.cine.update(dt);
        this.subtitles(dt);
    }

    syncDolls(dt) {
        const { sim } = this, p = sim.p;
        for (const v of this.dolls) {
            const d = v.d;
            const moving = !d.frozen && d.awake;
            v.sway = moving ? Math.sin(this.t * 10 + d.i) * 0.14 : damp(v.sway, 0, 30, dt);
            v.lift = moving ? Math.abs(Math.sin(this.t * 10 + d.i)) * 0.045 : 0;
            v.body.pos.set(d.x, d.y + v.lift, d.z);
            v.body.rot.y = d.yaw; v.body.rot.z = v.sway;
            v.head.pos.set(d.x + Math.sin(v.sway) * -NECK * Math.cos(d.yaw), d.y + v.lift + NECK, d.z + Math.sin(v.sway) * NECK * Math.sin(d.yaw));
            const want = Math.atan2(p.x - d.x, p.z - d.z);
            if (!d.awake) { v.tilt = 0.42; } else if (moving) {
                v.hy += wrap(want - v.hy) * Math.min(1, dt * 6);
                v.tilt = damp(v.tilt, 0, 6, dt);
            }
            v.head.rot.y = v.hy;
            v.head.rot.x = v.tilt;
            v.head.rot.z = d.frozen ? [0, 0.32, -0.26][d.pose] : v.sway * 1.6;
            const pose = !d.awake ? 0 : d.pose;
            if (v.pose !== pose) { v.pose = pose; v.body.mesh = `body${v.style}_${pose}`; }
        }
        // The shelf: heads only turn when nothing is looking at them. That's the whole of the horror.
        const reachSq = (sim.stare * 12) ** 2;
        for (const h of this.starers) {
            const dx = p.x - h.x, dz = p.z - h.z, near = dx * dx + dz * dz < reachSq;
            const want = near ? clamp(wrap(Math.atan2(dx, dz) - h.base), -1.2, 1.2) + h.base : h.base;
            if (!sim.inBeam(h.x, 1.7, h.z, 0.1)) h.yaw = damp(h.yaw, want, 2.2, this.game.dt ?? 1 / 60);
            h.e.rot.y = h.yaw;
        }
    }

    syncWorld(dt) {
        const { sim } = this;
        for (const v of this.doors) {
            v.open = damp(v.open, v.d.open ? 1 : 0, v.d.slam ? 26 : 9, dt);
            v.e.rot.y = v.base + v.open * 1.5;
            v.e.hidden = false;
        }
        for (const b of this.batteries) { b.e.hidden = b.b.taken; b.e.rot.y = this.t * 0.8; }
        if (sim.belt) {
            this.beltPhase = (this.beltPhase ?? 0) + dt * 1.1;
            this.ribs.mesh = `ribs${Math.floor((this.beltPhase % 0.5) * 8)}`;
            for (const c of this.crates) c.u = (c.u + dt * 0.55) % LOOP.length;
            for (const st of this.stamps) st.e.pos.y = 2.2 + Math.abs(Math.sin(this.t * 1.5 + st.phase)) * 0.95;
        }
        for (const c of this.crates) {
            const i = Math.floor(c.u), a = LOOP[i], b = LOOP[(i + 1) % LOOP.length], f = c.u - i;
            c.e.pos.x = (lerp(a[0], b[0], f) + 0.5) * CELL;
            c.e.pos.z = (lerp(a[1], b[1], f) + 0.5) * CELL;
        }
    }

    heart(dt) {
        const { sim, game, snd } = this, g = sim.danger;
        this.beat = Math.max(0, this.beat - dt * 2.4);
        if (g < 0.1 || sim.status !== "play") return;
        this.heartAt -= dt;
        if (this.heartAt > 0) return;
        const gap = lerp(1.45, 0.4, g * g);
        this.heartAt = gap;
        this.beat = 1;
        // lub-dub: a stronger first pulse the nearer it gets.
        const first = Math.round(lerp(9, 34, g)), second = Math.round(lerp(5, 20, g));
        snd.play("heart", { volume: lerp(0.45, 1.1, g) });
        game.haptic([first, 130, second]);
    }

    say(text, secs) {
        this.subs.push({ text, secs });
        if (this.subs.length > 1) this.subs.shift();   // Tape runs on. Better to miss a line than to have it arrive a room too late.
        if (this.sub && this.sub.t > 2) this.sub.t = Math.max(this.sub.t, this.sub.secs - 0.6);
    }
    subtitles(dt) {
        if (this.holdSubs > 0) { this.holdSubs -= dt; return; }
        if (!this.sub && this.subs.length) {
            this.sub = { ...this.subs.shift(), t: 0, shown: 0 };
            this.snd.play("tape");
        }
        const u = this.sub;
        if (!u) return;
        u.t += dt;
        const was = Math.floor(u.shown);
        u.shown = Math.min(u.text.length, u.shown + dt * 36);
        if (Math.floor(u.shown) !== was && Math.floor(u.shown) % 5 === 0 && u.shown < u.text.length) this.snd.play("blip", { volume: 0.7 + this.game.fxRng.range(0, 0.6) });
        if (u.t > u.secs + (this.subs.length ? 0 : 1.2)) this.sub = null;
    }

    handleEvents() {
        const { sim, snd, game, s } = this;
        for (const e of sim.ev) {
            switch (e.type) {
                case "say": this.say(e.text, e.secs); break;
                case "foot": snd.play(e.stair ? "footStair" : e.belt ? "footBelt" : "foot", { volume: 0.75 }); break;
                case "click": snd.play(e.on ? "clickOn" : "clickOff", { haptic: "tick" }); this.toggleKick = 1; break;
                case "dead": snd.play("dead", { haptic: "warn" }); this.say("Torch is dead. Leave it off and it may recover.", 3); break;
                case "low": snd.play("low", { haptic: "tick" }); break;
                case "battery": snd.play("battery", { haptic: "light" }); this.pop = { text: "Fresh battery", t: 0 }; break;
                case "door":
                    if (e.slam) { snd.at("slam", e.d.cx * CELL + 1, e.d.cz * CELL + 1, { near: 8 }); if (!sim.gentle) { game.haptic("heavy"); s.shake(0.04, 0.3, { haptic: false }); } } else snd.at("door", e.d.cx * CELL + 1, e.d.cz * CELL + 1, { near: 6, volume: e.forced ? 1.3 : 1 });
                    if (!e.slam && !e.forced) game.haptic("light");
                    if (e.forced) this.say("That door just opened.", 2);
                    break;
                case "rattle": snd.at("rattle", e.x, e.z, { near: 6 }); break;
                case "jam": snd.play("jam", { haptic: "tick" }); break;
                case "creep": snd.at("creep", e.d.x, e.d.z, { near: 5, volume: 0.9 }); break;
                case "wake": snd.at("creep", e.d.x, e.d.z, { near: 7 }); break;
                case "freeze":
                    // Catching one is the core verb. A small porcelain click, right in the thumb.
                    if (Math.hypot(e.d.x - sim.p.x, e.d.z - sim.p.z) < 12) { snd.at("thud", e.d.x, e.d.z, { near: 4, volume: 0.3 }); game.haptic("tick"); }
                    break;
                case "sound": snd.at(e.name, e.x, e.z, { near: 9 }); break;
                case "scanTick": snd.play("scanTick", { haptic: "tick" }); break;
                case "crank": snd.play("crank", { haptic: "tick" }); break;
                case "done": snd.play(e.at.startsWith("tag") ? "scanDone" : "lever", { haptic: e.at.startsWith("tag") ? "light" : "medium" }); s.shake(0.01, 0.1, { haptic: false }); break;
                case "tick": break;
                case "belt": snd.at("lever", 21, 21, { near: 30 }); break;
                case "whistle": snd.play("whistle", { haptic: "warn" });  break;
                case "sweepOn": this.say("It's counting.", 2); break;
                case "sweepOff": snd.play("allclear", { haptic: "success" }); break;
                case "hide": snd.play("door", { haptic: "light", volume: 0.6 }); break;
                case "file": snd.play("file", { haptic: "light" }); this.fileCard = { f: e.f, t: 0 }; break;
                case "found": this.say("The tag on the doll has your name on it.", 4); snd.play("file", { haptic: "medium" }); break;
                case "punch": snd.play("punch", { haptic: "heavy" }); break;
                case "taken": snd.play("hand", { haptic: "light" }); break;
                case "flicker": snd.play("low", { haptic: "warn" }); break;
                case "peek": snd.at("creep", e.d.x, e.d.z, { near: 3 }); snd.play("thud", { volume: 0.7, haptic: "medium" }); break;
            }
            this.o.onEvent?.(e);
        }
        sim.ev.length = 0;
    }

    /** One compass bearing to the current job, walking the real route rather than through walls. */
    bearing() {
        const { sim } = this, st = sim.current, p = sim.p;
        if (!st?.at) {
            if (st?.kind === "sweep") {
                let best = null, v = 1e9;
                const f = field(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
                for (const l of LOCKERS) { const n = f[idx(l.cx + l.face[0], l.cz + l.face[1])]; if (n >= 0 && n < v) { v = n; best = l; } }
                if (!best) return null;
                return this.routeTo(best.x + best.face[0] * 1.6, best.z + best.face[1] * 1.6);
            }
            return null;
        }
        const s = spot(st.at);
        return this.routeTo(s.x + (s.face?.[0] ?? 0) * 0.6, s.z + (s.face?.[1] ?? 0) * 0.6);
    }
    routeTo(x, z) {
        const { sim } = this, p = sim.p;
        let tx = Math.floor(x / CELL), tz = Math.floor(z / CELL);
        if (isSolid(tx, tz)) {
            let best = null;
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (!isSolid(tx + a, tz + b)) { best = [tx + a, tz + b]; break; }
            if (!best) return null;
            [tx, tz] = best;
        }
        const f = field(tx, tz);
        let cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL);
        let n = f[idx(cx, cz)];
        if (n < 0) return null;
        const total = n;
        for (let i = 0; i < 3 && n > 0; i++) {
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const q = f[idx(cx + a, cz + b)];
                if (q >= 0 && q < n && !isSolid(cx + a, cz + b)) { cx += a; cz += b; n = q; break; }
            }
        }
        const gx = (cx + 0.5) * CELL, gz = (cz + 0.5) * CELL, ang = wrap(Math.atan2(-(gx - p.x), -(gz - p.z)) - p.yaw);
        return { ang, dist: total * CELL };
    }

    // --- The torch, on screen ----------------------------------------------------------------------
    project(x, y, z) {
        return this.s.cam3.project([x, y, z]);
    }
    drawScreen(d) {
        const { s, sim, game } = this, v = s.view, p = sim.p, W = v.width, H = v.height;
        const asp = W / H, tanY = Math.tan(s.cam3._fovY(asp) / 2), tanX = tanY * asp;
        const dy = wrap(p.aimYaw - p.yaw), dp = p.aimPitch - p.pitch;
        const cx = W / 2 + (Math.tan(-dy) / tanX) * (W / 2), cy = H / 2 - (Math.tan(dp) / tanY) * (H / 2), r = (Math.tan(CONE) / tanY) * (H / 2);
        const A = lerp(this.o.maskA ?? 0.9, 0.42, this.lamp) * this.beam, half = r / 0.46;
        const dark = "#02030a";
        if (A > 0.01) {
            d.sprite("mask", { x: cx, y: cy, width: half * 2, height: half * 2, opacity: A });
            const l = cx - half, ri = cx + half, t = cy - half, b = cy + half;
            d.rect(W + 4, Math.max(0, t) + 2, { x: W / 2, y: Math.max(0, t) / 2 - 1, color: dark, opacity: A });
            d.rect(W + 4, Math.max(0, H - b) + 2, { x: W / 2, y: H - Math.max(0, H - b) / 2 + 1, color: dark, opacity: A });
            const my = (Math.max(0, t) + Math.min(H, b)) / 2, mh = Math.min(H, b) - Math.max(0, t);
            d.rect(Math.max(0, l) + 2, mh, { x: Math.max(0, l) / 2 - 1, y: my, color: dark, opacity: A });
            d.rect(Math.max(0, W - ri) + 2, mh, { x: W - Math.max(0, W - ri) / 2 + 1, y: my, color: dark, opacity: A });
        }
        const heat = this.beam * clamp(1.15 - this.wallHit() / 7, 0.1, 1);
        d.additive(() => {
            if (this.beam > 0.02) {
                d.sprite("core", { x: cx, y: cy, width: r * 2.2, height: r * 2.2, opacity: 0.11 * this.beam + heat * 0.1 });
                const k = this.t * 0.05;
                for (const m of this.motes) {
                    const a = m.a + k * m.s + Math.sin(this.t * 0.2 + m.p), q = m.r * r * 0.95, tw = (Math.sin(this.t * m.s * 1.7 + m.p) + 1) * 0.5;
                    d.sprite("glint", { x: cx + Math.cos(a) * q, y: cy + Math.sin(a) * q + Math.sin(this.t * 0.3 + m.p) * 8, width: 2 + m.s * 3, height: 2 + m.s * 3, color: "#ffe9c4", opacity: tw * 0.2 * this.beam });
                }
            }
            this.drawGlints(d);
        });
        // The heart pushes at the edge of your sight, and fear takes the colour out of the corners.
        const vign = 0.55 + sim.danger * 0.35 + this.beat * sim.danger * 0.28;
        d.sprite("vignette", { x: W / 2, y: H / 2, width: W, height: H, opacity: clamp(vign, 0, 1) });
        const gx = (game.fxRng.range(0, 128) | 0), gy = (game.fxRng.range(0, 128) | 0), tile = 128;
        d.additive(() => {
            for (let x = -gx; x < W; x += tile) for (let y = -gy; y < H; y += tile) d.sprite("grain", { x: x + tile / 2, y: y + tile / 2, width: tile, height: tile, opacity: 0.035 });
        });
        if (p.hide >= 0) {
            const sz = Math.max(W, H) * 1.6;
            d.sprite("slats", { x: W / 2, y: H / 2, width: sz, height: sz });
        } else if (!this.o.doll && !this.o.noHud) this.drawHand(d, W, H);
    }
    wallHit() {
        const { sim } = this, p = sim.p, x = p.x, z = p.z, fx = -Math.sin(p.aimYaw), fz = -Math.cos(p.aimYaw);
        for (let t = 0.4; t < 10; t += 0.5) if (!sim.sees(x, z, x + fx * t, z + fz * t)) return t;
        return 10;
    }
    drawGlints(d) {
        const { sim } = this, p = sim.p;
        // Doll eyes catch what little light there is. Only the sighted ones.
        for (const v of this.dolls) {
            const q = v.d;
            v.body.castShadow = v.head.castShadow = sim.sees(p.x, p.z, q.x, q.z);
            if (!q.awake || q.kind === "blind" || q.lit) continue;
            const dist = Math.hypot(q.x - p.x, q.z - p.z);
            if (dist > 13 || dist < 1.2 || Math.abs(q.y - p.y) > 2 || !sim.sees(p.x, p.z, q.x, q.z)) continue;
            if (Math.sin(this.t * 0.9 + q.i * 2) > 0.86) continue;       // they do blink, which is worse
            const rx = Math.cos(v.hy) * 0.068, rz = -Math.sin(v.hy) * 0.068, a = this.project(q.x + rx, q.y + NECK + 0.17, q.z + rz), b = this.project(q.x - rx, q.y + NECK + 0.17, q.z - rz);
            if (!a.visible) continue;
            const sz = clamp(26 / dist, 4, 14), o = clamp(1.3 - dist / 13, 0.2, 0.75);
            d.sprite("glint", { x: a.x, y: a.y, width: sz, height: sz, color: "#d7f0ff", opacity: o });
            d.sprite("glint", { x: b.x, y: b.y, width: sz, height: sz, color: "#d7f0ff", opacity: o });
        }
        // A fresh battery catches the light, if you're near enough to want it.
        for (const b of this.batteries) {
            if (b.b.taken) continue;
            const near = Math.hypot(b.b.x - p.x, b.b.z - p.z);
            if (near > 11 || !sim.sees(p.x, p.z, b.b.x, b.b.z)) continue;
            const q = this.project(b.b.x, floorY(b.b.x, b.b.z) + 0.1, b.b.z);
            if (q.visible) d.sprite("glint", { x: q.x, y: q.y, width: 26, height: 26, color: "#ffb45e", opacity: 0.45 + Math.sin(this.t * 4) * 0.25 });
        }
        // Small lamps that keep to themselves: the time clock, and the job in hand.
        const st = sim.current;
        if (st?.at && sim.status === "play") {
            const q = spot(st.at), y = floorY(q.x, q.z) + q.y, near = Math.hypot(q.x - p.x, q.z - p.z);
            const pr = this.project(q.x, y, q.z);
            if (pr.visible && near < 16 && Math.abs(y - p.y - 1) < 2.6) {
                const pulse = 0.5 + Math.sin(this.t * 3.2) * 0.3;
                d.sprite("glint", { x: pr.x, y: pr.y, width: 44, height: 44, color: "#ffc96b", opacity: pulse * clamp(1.2 - near / 16, 0.2, 0.9) });
            }
        }
    }
    drawHand(d, W, H) {
        const { sim } = this, p = sim.p;
        const touch = this.game.input.touchMode, sz = Math.min(W, H) * (touch ? 0.62 : 0.68), swayX = Math.sin(this.bob * 0.5) * 7 * p.moving, swayY = Math.abs(Math.cos(this.bob * 0.5)) * 6 * p.moving;
        this.toggleKick = Math.max(0, this.toggleKick - 0.08);
        const lowerK = 0.2 + (1 - this.beam) * 0.14;
        const x = (touch ? W * 0.56 : W - sz * 0.3) + swayX + wrap(p.aimYaw - p.yaw) * -60, y = H - sz * lowerK * (touch ? 0.1 : 0.62) + swayY + this.toggleKick * 8;
        const lit = 0.34 + this.beam * 0.42 + this.lamp * 0.2;
        const c = clamp(lit, 0, 1);
        d.sprite("torch", { x, y, width: sz, height: sz, color: [c, c * 0.92, c * 0.84] });
    }

    // --- HUD -------------------------------------------------------------------------------------
    drawHud(d) {
        const { s, sim } = this, v = s.view, W = v.width, safe = v.safe;
        if (this.o.noHud) return;
        const st = sim.current, top = safe.top + 10, left = safe.left + 12;
        // Clipboard.
        if (st && sim.status === "play") {
            const lab = st.label, plate = Math.min(W * 0.62, 12 + lab.length * 7.4);
            d.rect(plate, 42, { x: left + plate / 2, y: top + 21, color: "#0a0d10", opacity: 0.55, radius: 6 });
            d.text(`NIGHT ${sim.night + 1}  ·  ${this.clock()}`, { x: left + 8 + 56, y: top + 12, size: 11, color: "#a4b4b8", bold: true });
            this.textL(d, lab, left + 8, top + 29, 13.5, "#f4e6c4", plate - 16);
            // The bearing: a small warm chevron along a rule.
            const b = this.bearing();
            if (b && sim.p.hide < 0) {
                const cx = W / 2, y = top + 58 + (W < 500 ? 8 : -46), span = Math.min(92, W * 0.24), a = clamp(b.ang / 1.6, -1, 1), x = cx - a * span;
                d.rect(span * 2 + 12, 1.5, { x: cx, y, color: "#ffffff", opacity: 0.16 });
                d.rect(1.5, 9, { x: cx, y, color: "#ffffff", opacity: 0.3 });
                const fade = Math.abs(a) > 0.97 ? 0.5 + Math.sin(this.t * 6) * 0.3 : 0.9;
                d.poly([[x - 7, y - 8], [x + 7, y - 8], [x, y + 2]], { color: "#ffc96b", opacity: fade });
            }
        }
        this.drawBattery(d, W - safe.right - 62, top + 8);
        // Tape, in a calm box.
        const u = this.sub;
        if (u) {
            const maxW = Math.min(W - 44, 520), yy = v.height * (v.height > v.width ? 0.235 : 0.23), a = clamp(Math.min(u.t * 4, (u.secs + 1.1 - u.t) * 3), 0, 1), lines = Math.ceil((u.text.length * 7.4) / maxW);
            d.rect(maxW + 20, lines * 20 + 18, { x: W / 2, y: yy, color: "#06080a", opacity: 0.62 * a, radius: 8 });
            d.text(u.text, { x: W / 2, y: yy, size: 14, color: "#d7e2dc", maxWidth: maxW, align: "center", lineHeight: 1.4, opacity: a });
        }
        // Prompt.
        const pr = sim.prompt;
        if (pr && sim.status === "play") {
            const y = v.height * 0.66, w = 28 + pr.label.length * 8;
            d.rect(w, 30, { x: W / 2, y, color: "#0a0d10", opacity: 0.62, radius: 15 });
            d.text(this.game.input.touchMode ? pr.label : `[E]  ${pr.label}`, { x: W / 2, y, size: 13.5, color: pr.type === "task" ? "#ffd27a" : "#e8e4d8", bold: true });
        }
        if ((st?.kind === "hold" || st?.kind === "scan") && sim.hold > 0) this.ring(d, W / 2, v.height * 0.5, 22, sim.hold);
        if (this.pop) {
            this.pop.t += 1 / 60;
            d.text(this.pop.text, { x: W / 2, y: v.height * 0.6 - this.pop.t * 16, size: 15, bold: true, color: "#ffd27a", opacity: clamp(2 - this.pop.t, 0, 1) });
            if (this.pop.t > 2) this.pop = null;
        }
        if (this.fileCard) {
            const c = this.fileCard;
            c.t += 1 / 60;
            const a = clamp(Math.min(c.t * 3, 5.4 - c.t), 0, 1), y = v.height * 0.34;
            d.rect(238, 76, { x: W / 2, y, color: "#d9c48f", opacity: a, radius: 3 });
            d.rect(226, 3, { x: W / 2, y: y - 24, color: "#7c2a26", opacity: a });
            d.text(c.f.name, { x: W / 2, y: y - 8, size: 17, bold: true, color: "#2a2320", opacity: a });
            d.text(c.f.line, { x: W / 2, y: y + 16, size: 12.5, color: "#3c3227", opacity: a });
            if (c.t > 5.4) this.fileCard = null;
        }
    }
    textL(d, str, x, y, size, col, maxW) {
        // d.text centres, so estimate the width for a left edge. Close enough at these sizes, and clipped by the plate if not.
        const w = str.length * size * 0.54;
        d.text(str, { x: x + Math.min(w, maxW) / 2, y, size, color: col, bold: true });
    }
    clock() {
        const t = 22 * 60 + Math.floor(this.sim.t * 2.5), h = Math.floor(t / 60) % 24, m = t % 60, hh = h % 12 || 12;
        return `${hh}:${String(m).padStart(2, "0")} ${h >= 12 && h < 24 ? "PM" : "AM"}`;
    }
    drawBattery(d, x, y) {
        const b = this.sim.p.battery, cells = 5, lit = Math.ceil(b / 20), col = b > 25 ? "#ffd27a" : b > 10 ? "#ff9a4a" : "#e0483e";
        d.rect(50, 18, { x: x + 25, y: y + 9, color: "#0a0d10", opacity: 0.6, radius: 3 });
        d.rect(4, 8, { x: x + 52, y: y + 9, color: "#a4b4b8", opacity: 0.7 });
        const blink = b <= 10 && Math.sin(this.t * 10) > 0;
        for (let i = 0; i < cells; i++) d.rect(7.4, 12, { x: x + 6.2 + i * 9.4, y: y + 9, color: i < lit ? col : "#2a2f33", opacity: i < lit && blink ? 0.3 : 1, radius: 1 });
    }
    ring(d, x, y, r, f) {
        const n = 28;
        d.circle(r + 5, { x, y, color: "#0a0d10", opacity: 0.45 });
        for (let i = 0; i < n * f; i++) {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2, b = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            d.line([x + Math.cos(a) * r, y + Math.sin(a) * r], [x + Math.cos(b) * r, y + Math.sin(b) * r], { width: 4, color: "#ffd27a" });
        }
    }
}
