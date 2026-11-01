// The car park, the shelf, and the sunrise.
import { button, color, mesh, opacity, pin, pos, rot, scale, text } from "./pogo.js";
import { CELL, FILES, NIGHTS, WAKES } from "./data.js";
import { MAT } from "./art.js";
import { Mesh } from "./world.js";
import { CONE, Sim, field, idx, isSolid } from "./sim.js";
import { Stage } from "./stage.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

export function buildYard(game) {
    const m = new Mesh();
    // Tarmac in large tiled squares, kerbs and painted bays.
    for (let x = -30; x < 30; x += 6) for (let z = -40; z < 12; z += 6) {
        const t = 0.62 + ((x * 7 + z * 3) & 7) * 0.012;
        m.quad([x, 0, z + 6], [x + 6, 0, z + 6], [x + 6, 0, z], [x, 0, z], MAT.wet, [t, t, t + 0.02]);
    }
    for (let x = -14; x <= 14; x += 4) m.box(x - 0.06, 0, -2, x + 0.06, 0.01, 3, null, [0.5, 0.48, 0.42], { noBottom: true });
    // The factory: a sawtooth roof, two chimneys, blank brick.
    const fz = -22, wall = [0.62, 0.5, 0.46];
    for (let x = -34; x < 34; x += 8.5) {
        m.quad([x, 0, fz], [x + 4.25, 0, fz], [x + 4.25, 4.5, fz], [x, 4.5, fz], MAT.brick, wall);
        m.quad([x + 4.25, 0, fz], [x + 8.5, 0, fz], [x + 8.5, 4.5, fz], [x + 4.25, 4.5, fz], MAT.brick, wall);
        m.quad([x, 4.5, fz], [x + 4.25, 4.5, fz], [x + 4.25, 9, fz], [x, 9, fz], MAT.brick, wall, [0, 0, 1, 0.48]);
        m.quad([x + 4.25, 4.5, fz], [x + 8.5, 4.5, fz], [x + 8.5, 9, fz], [x + 4.25, 9, fz], MAT.brick, wall, [0, 0, 1, 0.48]);
    }
    m.box(-34, 0, fz - 16, 34, 9, fz - 0.05, null, [0.2, 0.16, 0.16], { noBottom: true });
    for (let x = -34; x < 34; x += 8.5) {
        const y = 9, a = [x, y, fz - 0.2], b = [x + 8.5, y, fz - 0.2], t = [x + 8.5, y + 3.4, fz - 8];
        m.quad(a, b, t, t, MAT.tin, [0.5, 0.56, 0.6]);
        m.quad(b, [x + 8.5, y, fz - 8], t, t, MAT.tin, [0.36, 0.38, 0.4]);
    }
    for (const x of [-19, 15]) {
        m.lathe(x, fz - 8, [[1.5, 9], [1.1, 22], [1.2, 22.3], [1.2, 22.6]], 14, (t, a) => { const k = 0.34 + Math.cos(a) * 0.08; return [k * 1.3, k, k * 0.9]; });
    }
    for (let x = -28; x <= 28; x += 8) {
        m.box(x - 1.4, 3.8, fz + 0.02, x + 1.4, 7.2, fz + 0.1, MAT.plate, [0.12, 0.16, 0.2], { noBottom: true });
    }
    // The fence and its gate posts.
    for (let x = -30; x <= 30; x += 2.4) {
        if (Math.abs(x) < 4.4) continue;
        m.rod([x, 0, -10], [x, 3, -10], 0.05, 5, [0.26, 0.28, 0.3]);
    }
    for (const y of [0.3, 2.9]) { m.rod([-30, y, -10], [-4.5, y, -10], 0.03, 4, [0.26, 0.28, 0.3]); m.rod([4.5, y, -10], [30, y, -10], 0.03, 4, [0.26, 0.28, 0.3]); }
    for (let i = -30; i < 30; i += 0.6) {
        if (Math.abs(i) < 4.4) continue;
        m.rod([i, 0.3, -10], [i + 0.6, 2.9, -10], 0.008, 3, [0.3, 0.32, 0.34]);
        m.rod([i + 0.6, 0.3, -10], [i, 2.9, -10], 0.008, 3, [0.3, 0.32, 0.34]);
    }
    for (const x of [-4.4, 4.4]) m.box(x - 0.14, 0, -10.14, x + 0.14, 3.6, -9.86, MAT.plate, [0.4, 0.42, 0.44]);
    // A lamp post with a sodium head, and your car, small and alone.
    m.rod([9, 0, -5], [9, 6.2, -5], 0.07, 6, [0.2, 0.22, 0.22]);
    m.rod([9, 6.2, -5], [7.4, 6.5, -5], 0.05, 6, [0.2, 0.22, 0.22]);
    m.box(6.8, 6.34, -5.3, 7.8, 6.46, -4.7, MAT.plate, [0.3, 0.3, 0.3]);
    const body = [0.5, 0.2, 0.2], glass = [0.1, 0.13, 0.16];
    const cx = -4.2, cz = -3.2;
    m.box(cx - 2, 0.34, cz - 0.85, cx + 2, 0.98, cz + 0.85, MAT.plate, body);
    m.box(cx - 1.3, 0.98, cz - 0.75, cx + 0.9, 1.5, cz + 0.75, null, glass);
    m.box(cx - 1.4, 1.46, cz - 0.79, cx + 1, 1.54, cz + 0.79, MAT.plate, body);
    for (const x of [cx - 1.2, cx + 1.2]) for (const z of [cz - 0.8, cz + 0.8]) { m.ball(x, 0.34, z, 0.34, 0.34, 0.12, 12, 8, [0.06, 0.06, 0.07]); m.ball(x, 0.34, z + 0.05 * Math.sign(z - cz), 0.14, 0.14, 0.09, 8, 6, [0.5, 0.5, 0.52]); }
    for (const x of [cx - 1.7, cx + 1.7]) m.ball(x, 0.76, cz + 0.86, 0.16, 0.09, 0.03, 8, 6, [0.9, 0.2, 0.15]);
    m.done(game, "yard");
    const leaf = new Mesh();
    leaf.box(0, 0.2, -0.03, 4.2, 3.1, 0.03, MAT.tin, [0.5, 0.54, 0.56]);
    leaf.done(game, "gate");
    // The new hire: your coat, your cap, someone else in them.
    const h = new Mesh(), coat = [0.2, 0.24, 0.26], trousers = [0.08, 0.09, 0.11], skin = [0.72, 0.56, 0.44];
    for (const s of [-1, 1]) h.rod([s * 0.13, 0, 0], [s * 0.13, 0.86, 0], 0.09, 8, trousers, 0.1);
    h.lathe(0, 0, [[0.28, 0.72], [0.27, 1.1], [0.25, 1.32], [0.27, 1.5], [0.15, 1.58]], 14, coat, null, 1, 0.74);
    h.rod([0, 1.58, 0], [0, 1.68, 0], 0.06, 8, skin);
    h.ball(0, 1.8, 0, 0.13, 0.15, 0.14, 12, 9, skin);
    h.ball(0, 1.86, -0.01, 0.145, 0.1, 0.15, 12, 7, [0.12, 0.14, 0.17]);
    h.rod([0.27, 1.46, 0], [0.26, 1.2, 0.26], 0.06, 6, coat);
    h.rod([0.26, 1.2, 0.26], [0.22, 1.28, 0.56], 0.05, 6, skin);
    h.rod([0.22, 1.28, 0.54], [0.22, 1.3, 0.76], 0.05, 8, [0.3, 0.32, 0.34], 0.07);
    h.rod([-0.27, 1.46, 0], [-0.3, 0.86, 0.04], 0.06, 6, coat);
    h.box(-0.2, 1.24, 0.19, -0.05, 1.3, 0.2, null, [0.86, 0.8, 0.62], { noBottom: true });
    h.done(game, "hire");
    const cone = new Mesh(), L = 13, R = L * Math.tan(CONE), seg = 20, base = cone.count;
    for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * Math.PI * 2, x = Math.cos(a) * R, y = Math.sin(a) * R;
        cone.p.push(0, 0, 0, x, y, L); cone.n.push(0, 0, 1, 0, 0, 1); cone.u.push(0, 0, 0, 0); cone.c.push(1, 1, 1, 0.1, 0.1, 0.1);
    }
    for (let i = 0; i < seg; i++) { const a = base + i * 2; cone.i.push(a, a + 2, a + 3, a, a + 3, a + 1, a, a + 3, a + 2, a, a + 1, a + 3); }
    cone.done(game, "beamcone");
}

export function yardScene(game, { load, save, go, btn, play }) {
    function base(s, dawn) {
        const L = s.light;
        s.cam3.fov = 60;
        L.dir.set(dawn ? 0.5 : -0.55, dawn ? -0.32 : -1, dawn ? 0.8 : -0.3);
        L.shadows = true; L.softShadows = true; L.shadowRange = 26;
        L.color = color(dawn ? "#ffc38a" : "#e29a54");
        L.sky = color(dawn ? "#cba3a0" : "#46506f");
        L.ground = color(dawn ? "#a07a6c" : "#2a2a3a");
        L.fog = dawn ? { color: color("#e8a980"), near: 26, far: 90 } : { color: color("#2b3348"), near: 12, far: 62 };
        s.background = dawn ? ["#5d6f9c", "#f2b184"] : ["#0b1224", "#3c4258"];
        s.add([mesh("yard", { texture: "atlas" }), pos(0, 0, 0)]);
    }
    game.scene("carpark", (s, a) => {
        game.mouseLook = false;
        game.touch.enabled = false;
        base(s, false);
        s.add([mesh("gate", { texture: "atlas" }), pos(-4.3, 0, -10)]);
        s.add([mesh("gate", { texture: "atlas" }), pos(0.1, 0, -10)]);
        s.cam3.set([0.6, 0.86, 5.4], [-1.8, 1.3, -10]);
        let t = 0;
        const line = WAKES[a.wake % WAKES.length], W = Math.min(330, s.view.width - 34), repeat = a.wake >= WAKES.length;
        s.onUpdate((dt) => {
            t += dt;
            const k = Math.min(1, t / 7);
            s.cam3.pos.set(0.6 - k * 0.3, 0.86 + Math.sin(t * 0.6) * 0.02, 5.4 - k * 0.5);
        });
        s.onDrawUI((d) => {
            const v = s.view, y = v.height * 0.2 + v.safe.top * 0.4, a1 = clamp(t * 1.2 - 0.3, 0, 1), a2 = clamp(t * 1.2 - 1.4, 0, 1);
            d.additive(() => {
                const p = s.cam3.project([7.3, 6.3, -5]);
                d.sprite("glint", { x: p.x, y: p.y, width: 240, height: 240, color: "#ffb15e", opacity: 0.32 + Math.sin(t * 13) * 0.02 });
            });
            d.text("You wake in the car park.", { x: v.width / 2, y, size: 23, color: "#efe3c4", font: "Georgia, serif", opacity: a1, maxWidth: W, align: "center" });
            d.text(line, { x: v.width / 2, y: y + 54, size: 16, color: "#c8d2d6", font: "Georgia, serif", opacity: a2, maxWidth: W, align: "center", lineHeight: 1.4 });
        });
        s.add([btn(`Go back in: Night ${a.night + 1}`, () => go(a.night), { action: "confirm" }), pin("bottom", [0, 54])]);
        play("park");
        game.sfx({ wave: "sine", freq: 300, to: 240, decay: 1.2, volume: 0.05 }, { haptic: "light" });
    });

    game.scene("dawn", (s) => {
        game.mouseLook = false;
        game.touch.enabled = false;
        base(s, true);
        const g1 = s.add([mesh("gate", { texture: "atlas" }), pos(-4.3, 0, -10), rot(0, -1.4, 0)]);
        const g2 = s.add([mesh("gate", { texture: "atlas" }), pos(4.3, 0, -10), rot(0, Math.PI + 1.4, 0)]);
        // All of them, in rows, on the far side of the gate. Inside. They walked you here and they stop at the line.
        const dolls = [];
        for (let r = 0; r < 5; r++) for (let i = 0; i <= 8 + r; i++) {
            const x = (i - (8 + r) / 2) * 0.86 + (r % 2) * 0.1, z = -11.2 - r * 1.05, st = (i + r * 2) % 3;
            s.add([mesh(`body${st}_0`, { shine: 0.2 }), pos(x, 0, z)]);
            dolls.push(s.add([mesh(`head${st}`, { shine: 0.5 }), pos(x, 0.84, z), rot(0, Math.sin(i * 3 + r) * 0.15, 0)]));
        }
        const wave = s.add([mesh("body0_1", { shine: 0.2 }), pos(0.4, 0, -10.6), rot(0, 0, 0)]);
        const waveHead = s.add([mesh("head0", { shine: 0.5 }), pos(0.4, 0.84, -10.6), rot(0, 0, 0)]);
        s.cam3.set([0.5, 1.45, -1.5], [0, 1.1, -11]);
        let t = 0;
        const lines = [
            [1.5, "The gate is open."],
            [5, "In fifty years it has never been open."],
            [9, "Every morning you woke out here, they had carried you."],
            [14, "Every one of them worked this shift."],
            [18.5, "They were only ever trying to get someone out before the clock."],
            [24, "One of them is waving."],
        ], pr = load();
        s.onUpdate((dt) => {
            t += dt;
            const k = clamp(t / 30, 0, 1);
            s.cam3.pos.set(0.5 - k * 0.2, 1.45, -1.5 - k * 5.4);
            wave.rot.z = Math.sin(t * 3) * 0.12;
            waveHead.rot.z = Math.sin(t * 3) * 0.1 + 0.1;
            wave.mesh = t > 24 && Math.sin(t * 3.4) > 0 ? "body0_2" : "body0_1";
        });
        s.onDrawUI((d) => {
            const v = s.view;
            d.additive(() => {
                const p = s.cam3.project([17, 3, -30]);
                d.sprite("glint", { x: p.x, y: p.y, width: 620, height: 620, color: "#ffcf99", opacity: 0.4 });
            });
            const cur = lines.filter((l) => t >= l[0]).pop();
            if (cur) {
                const a = clamp(Math.min(t - cur[0], 3.5 - (t - cur[0] - (cur === lines.at(-1) ? 40 : 0))) * 1.2, 0, 1);
                d.rect(v.width, 92, { x: v.width / 2, y: v.height * 0.82 - 12, color: "#2a1a18", opacity: a * 0.34 });
                d.text(cur[1], { x: v.width / 2, y: v.height * 0.82 - 12, size: 19, color: "#fff4e0", font: "Georgia, serif", opacity: a, maxWidth: Math.min(330, v.width - 30), align: "center", lineHeight: 1.35 });
            }
            if (t > 28) {
                const a = clamp(t - 28, 0, 1);
                d.text("NIGHT SHIFT", { x: v.width / 2, y: v.height * 0.16 + v.safe.top * 0.5, size: 34, bold: true, color: "#fff4e0", font: "Georgia, serif", opacity: a });
                d.text(`Staff records found: ${pr.files.length} of ${FILES.length}.  Mornings in the car park: ${pr.wakes}.`, { x: v.width / 2, y: v.height * 0.16 + v.safe.top * 0.5 + 36, size: 12.5, color: "#fff0dc", opacity: a, maxWidth: v.width - 30, align: "center" });
            }
        });
        s.wait(28.5, () => s.add([btn("Home", () => game.go("title", {}, { fade: 0.8 }), { action: "confirm", color: "#6a3a2c" }), pin("bottom", [0, 26 + s.view.safe.bottom])]));
        play("dawn");
        game.sfx({ wave: "sine", freq: 196, decay: 2, volume: 0.06 }, { haptic: "success" });
    });
}

/** The shelf. You are small now. He has a torch. Your rule is his rule, turned round. */
class Flip {
    constructor() {
        this.world = new Sim({ night: 1, seed: 5 });
        for (const d of this.world.doors) d.open = true;
        this.world.dolls.length = 0;
        const p = this.world.p;
        p.x = 18.2; p.z = 3.2; p.yaw = Math.PI; p.pitch = 0.04; p.light = false;
        this.h = { x: 46, z: 29, yaw: Math.PI / 2, aim: Math.PI / 2, i: 0, pause: 0, steps: 0 };
        this.route = [[20, 29], [20, 15], [36, 15], [36, 29]];
        this.lit = false;
        this.t = 0;
        this.ev = [];
        this.done = false;
        this.dist = 99;
        this.litTime = 0;
    }
    beam() {
        const h = this.h;
        return [-Math.sin(h.aim), -Math.cos(h.aim)];
    }
    tick(dt, mx, my, yaw, pitch) {
        const w = this.world, p = w.p, h = this.h;
        this.t += dt;
        // He walks the route and sweeps, and now and then stops and turns round, because something moved.
        const [tx, tz] = this.route[h.i % this.route.length], dx = tx - h.x, dz = tz - h.z, d = Math.hypot(dx, dz);
        if (h.pause > 0) h.pause -= dt;
        else if (d < 0.4) { h.i++; h.pause = 0.8; } else {
            h.x += (dx / d) * 0.75 * dt; h.z += (dz / d) * 0.75 * dt;
            h.yaw = Math.atan2(-dx, -dz);
        }
        // Every so often he stops dead and turns right round. You'd have done the same. You did.
        const cyc = this.t % 10, back = cyc > 6.5 ? 1 : 0;
        h.back = (h.back ?? 0) + (back - (h.back ?? 0)) * Math.min(1, dt * 2.6);
        if (back) h.pause = Math.max(h.pause, 0.2);
        const sweep = Math.sin(this.t * 1.1) * 0.8 + Math.sin(this.t * 2.3) * 0.12;
        h.aim = h.yaw + sweep * (1 - h.back * 0.5) + h.back * Math.PI;
        const [ax, az] = this.beam(), ex = p.x - h.x, ez = p.z - h.z, far = Math.hypot(ex, ez) || 1;
        const lit = far < 12 && (ex * ax + ez * az) / far > Math.cos(CONE + 0.05) && w.sees(h.x, h.z, p.x, p.z);
        if (lit !== this.lit) { this.lit = lit; if (lit) this.ev.push("freeze"); }
        this.dist = far;
        p.yaw = yaw; p.pitch = pitch; p.aimYaw = yaw; p.aimPitch = pitch;
        if (lit) { p.moving = 0; this.litTime += dt; } else {
            const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = -fz, rz = fx, iy = -my, S = 1.75;
            const vx = (fx * iy + rx * mx) * S, vz = (fz * iy + rz * mx) * S;
            const [nx, nz] = w.collide(p.x + vx * dt, p.z + vz * dt, 0.2);
            p.moving = Math.hypot(vx, vz) / 2.2;
            p.x = nx; p.z = nz;
            p.stepAcc = (p.stepAcc ?? 0) + p.moving * dt * 3.4;
            if (p.stepAcc > 1) { p.stepAcc = 0; this.ev.push("step"); }
        }
        if (far < 1.25 && !lit) this.done = true;
    }
}

export function flipScene(game, { load, save, go, btn, play, snd }) {
    game.scene("flip", (s) => {
        const flip = new Flip(), w = flip.world, h = flip.h;
        game.flip = flip;
        game.mouseLook = true;
        game.touch.enabled = true;
        game.touch.set({ stick: true, look: true, buttons: [] });
        const stage = new Stage(game, s, w, { noHud: true, snd, doll: true, ambient: 2.4 });
        for (const v of stage.dolls) v.body.hidden = v.head.hidden = true;
        const man = s.add([mesh("hire", { unlit: true, color: "#8a8a8a" }), pos(h.x, 0, h.z)]);
        const cone = s.add([mesh("beamcone", { unlit: true, shadow: false, color: "#ffdba0" }), pos(h.x, 1.3, h.z), opacity(0.13)]);
        let yaw = w.p.yaw, pitch = w.p.pitch, phase = "wake", t = 0, cardT = 0;
        game.look = (y, q) => { yaw = y; pitch = q; };
        stage.cine = {
            camera(c) {
                const p = w.p;
                return { ex: c.ex, ey: 0.74 + Math.sin(stage.bob * 0.8) * 0.016 + (phase === "end" ? Math.min(0.4, cardT * 0.08) : 0), ez: c.ez, yaw: c.yaw, pitch: c.pitch };
            },
        };
        const lines = [[0.6, "Thank you, Unit 31."], [3.4, "You are very small. You can't feel your legs, but they work."], [7.2, "There's someone new on the floor. He has your coat. He has your torch."], [11, "You can only move when he isn't looking. You always could."], [15, "Reach him."]];
        s.onUpdate((dt) => {
            t += dt;
            const look = s.input.look;
            yaw -= look.x * 0.0036;
            pitch = clamp(pitch - look.y * 0.0034, -0.9, 1.1);
            if (phase === "wake") { flip.tick(dt, 0, 0, yaw, pitch); if (t > 14) phase = "play"; } else if (phase === "play") {
                const m = s.input.move;
                flip.tick(dt, m.x, m.y, yaw, pitch);
                if (flip.done) {
                    phase = "end";
                    game.mouseLook = false;
                    game.touch.enabled = false;
                    game.sfx([{ wave: "sine", freq: 523, decay: 0.8, volume: 0.09 }, { wave: "sine", freq: 659, at: 0.2, decay: 1, volume: 0.09 }], { haptic: "success" });
                    save({ ...load(), flipped: true });
                }
            } else cardT += dt;
            game.data.flip = { phase, dist: flip.dist, lit: flip.lit };
            for (const e of flip.ev) {
                if (e === "freeze") { game.sfx({ wave: "triangle", freq: 1400, to: 900, decay: 0.06, volume: 0.1 }, { haptic: "medium" }); s.shake(0.01, 0.1, { haptic: false }); } else if (e === "step") snd.play("creep", { volume: 0.5 });
            }
            flip.ev.length = 0;
            stage.update(dt);
            man.pos.set(h.x, Math.abs(Math.sin(t * 3.4)) * 0.03, h.z);
            man.rot.y = h.yaw + Math.PI;
            cone.pos.set(h.x - Math.sin(h.aim) * 0.7, 1.3, h.z - Math.cos(h.aim) * 0.7);
            cone.rot.y = h.aim + Math.PI;
            // His torch is the only sun in here now.
            const L = s.light;
            L.dir.set(-Math.sin(h.aim), -0.12, -Math.cos(h.aim));
            L.color.r = 0.28; L.color.g = 0.24; L.color.b = 0.18;
        });
        s.onDraw((d) => {
            const v = s.view;
            const lamp = s.cam3.project([h.x - Math.sin(h.aim) * 0.7, 1.3, h.z - Math.cos(h.aim) * 0.7]);
            if (lamp.visible && w.sees(w.p.x, w.p.z, h.x, h.z)) d.additive(() => d.sprite("glint", { x: lamp.x, y: lamp.y, width: 150, height: 150, color: "#ffdba0", opacity: 0.8 }));
            if (flip.lit) d.additive(() => d.rect(v.width + 2, v.height + 2, { x: v.width / 2, y: v.height / 2, color: "#ffe2b0", opacity: 0.38 }));
            const sz = Math.min(v.width, v.height) * 0.42, p = w.p, sw = Math.sin(stage.bob * 0.7) * 10 * p.moving, rise = phase === "end" ? Math.min(1, cardT / 1.2) * sz * 0.7 : 0;
            d.sprite("dollhand", { x: v.width * 0.76 + sw, y: v.height - sz * 0.12 - rise, width: sz, height: sz });
            d.sprite("dollhand", { x: v.width * 0.24 - sw, y: v.height - sz * 0.12 + Math.cos(stage.bob) * 4 * p.moving, width: sz, height: sz, flipX: true });
        });
        s.onDrawUI((d) => {
            const v = s.view, cx = v.width / 2;
            if (phase !== "end") {
                const cur = lines.filter((l) => t >= l[0]).pop();
                if (cur) {
                    const a = clamp(Math.min((t - cur[0]) * 2, 4.3 - (t - cur[0])), cur === lines.at(-1) ? 0 : 0, 1);
                    d.text(cur[1], { x: cx, y: v.height * 0.2, size: 16, color: "#efe3c4", font: "Georgia, serif", opacity: a, maxWidth: Math.min(330, v.width - 30), align: "center", lineHeight: 1.35 });
                }
                if (t < 1) d.rect(v.width + 2, v.height + 2, { x: cx, y: v.height / 2, color: "#000000", opacity: 1 - t });
                return;
            }
            const f = clamp(cardT * 0.7, 0, 0.9);
            d.rect(v.width + 2, v.height + 2, { x: cx, y: v.height / 2, color: "#020306", opacity: f });
            const a1 = clamp(cardT * 1.2 - 0.6, 0, 1), a2 = clamp(cardT * 1.2 - 2.4, 0, 1), a3 = clamp(cardT * 1.2 - 5.4, 0, 1), top = v.height * 0.17;
            d.text("You push a scrap of paper into his coat pocket.", { x: cx, y: top, size: 16, color: "#efe3c4", font: "Georgia, serif", opacity: a1, maxWidth: Math.min(320, v.width - 30), align: "center", lineHeight: 1.35 });
            const nw = Math.min(250, v.width * 0.66, v.height * 0.5);
            d.sprite("note", { x: cx, y: v.height * 0.42, width: nw, height: nw * 0.733, opacity: a2, rot: -0.04 });
            d.text("You don't remember writing it.\nYou remember reading it.", { x: cx, y: v.height * 0.42 + nw * 0.48, size: 16, color: "#efe3c4", font: "Georgia, serif", opacity: a3, maxWidth: Math.min(320, v.width - 30), align: "center", lineHeight: 1.4 });
        });
        s.wait(0, () => {});
        const offer = () => {
            s.add([btn("Night 5, again", () => go(4), { action: "confirm" }), pin("bottom", [0, 92])]);
            s.add([button("Not yet", { width: 150, height: 44, color: "#10161a", textColor: "#a4b4b8", textSize: 14, radius: 8, onTap: () => game.go("title", {}, { fade: 0.4 }) }), pin("bottom", [0, 36])]);
        };
        let offered = false;
        s.onUpdate(() => { if (phase === "end" && cardT > 6.6 && !offered) { offered = true; offer(); } });
        s.on("leave", () => { game.mouseLook = false; });
        play("flip");
    });
}
