// Draws the sim: one 3D draw hook feeding instanced meshes directly, and a 2D pass for light, flame and floor marks.
// Nothing here affects the game: particles use game.fxRng, and bots run without it.
import { BRANCHES, D, W, WEAPONS } from "./data.js";
import { hex, mix } from "./meshkit.js";
import { DOORS, ROOMS } from "./rooms.js";
import { Floor, buildShell } from "./roomart.js";

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const SOCK_BY = (s) => Math.floor((s ?? 0) * 3) % 3;
const TIER_TINT = [null, null, { r: 0.85, g: 0.8, b: 0.92, a: 1 }, { r: 0.68, g: 0.6, b: 0.8, a: 1 }, { r: 0.5, g: 0.42, b: 0.66, a: 1 }];

const JUNK = {
    wood: { meshes: ["plank", "plank", "shard"], colors: ["#b9814a", "#8a5a31", "#d9a66b"], decal: "#8a5a31", puff: "#d9c0a0" },
    stuffing: { meshes: ["lump", "lump", "shard"], colors: ["#fff4e2", "#2f8f8b", "#e8ae35"], decal: "#efe6d8", puff: "#fff8ec" },
    glass: { meshes: ["shard"], colors: ["#bfeaff", "#e8fbff", "#7ad4ff"], decal: "#d9f3fb", puff: "#e8fbff" },
    paper: { meshes: ["book", "book", "plank"], colors: ["#e4644a", "#e8ae35", "#2f8f8b", "#fff1dc"], decal: "#efe6d8", puff: "#fff1dc" },
    soil: { meshes: ["lump", "shard"], colors: ["#5a3d28", "#d0683f", "#3f9f5e"], decal: "#4a3222", puff: "#7a5a3a" },
    metal: { meshes: ["shard", "cube"], colors: ["#c8d2da", "#8c97a3", "#ffffff"], decal: "#6c7480", puff: "#c8d2da" },
    porcelain: { meshes: ["shard", "cube"], colors: ["#ffffff", "#e8f2f2", "#bcd8dc"], decal: "#e8f2f2", puff: "#ffffff" },
    toys: { meshes: ["cube", "lump"], colors: ["#e8583f", "#7ec8f0", "#ffe08a", "#3f9f5e", "#9a86d6"], decal: "#d9b98a", puff: "#ffe08a" },
};
for (const j of Object.values(JUNK)) { j.tints = j.colors.map(hex).map(([r, g, b]) => ({ r, g, b, a: 1 })); j.decalC = hex(j.decal); }

/** Direct instancing: pooled matrices and items go straight to the renderer, with no entity per monster. */
class Inst {
    constructor(game) { this.game = game; this.pool = []; this.n = 0; this.geoms = new Map(); this.textures = new Map(); }
    begin(alpha) { this.n = 0; this.alpha = alpha; }
    /** yaw turns +x towards +z. pitch lifts the nose. roll tips sideways. */
    put(name, x, y, z, yaw = 0, sx = 1, sy = sx, sz = sx, col = WHITE, pitch = 0, roll = 0, o = null) {
        let it = this.pool[this.n];
        if (!it) it = this.pool[this.n] = { geom: null, matrix: new Float32Array(16), r: 1, g: 1, b: 1, a: 1, texture: null, u0: 0, v0: 0, u1: 1, v1: 1, unlit: false, castShadow: true, cutout: false, shine: 0 };
        this.n++;
        let g = this.geoms.get(name);
        if (!g) { g = this.game.assets.geometry(name); this.geoms.set(name, g); }
        const m = it.matrix, cy = Math.cos(yaw), sn = Math.sin(yaw);
        if (pitch === 0 && roll === 0) {
            m[0] = cy * sx; m[1] = 0; m[2] = sn * sx; m[3] = 0;
            m[4] = 0; m[5] = sy; m[6] = 0; m[7] = 0;
            m[8] = -sn * sz; m[9] = 0; m[10] = cy * sz; m[11] = 0;
        } else {
            const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
            // Ry * Rz(pitch) * Rx(roll)
            m[0] = cy * cp * sx; m[1] = sp * sx; m[2] = sn * cp * sx; m[3] = 0;
            m[4] = (-cy * sp * cr + sn * sr) * sy; m[5] = cp * cr * sy; m[6] = (-sn * sp * cr - cy * sr) * sy; m[7] = 0;
            m[8] = (cy * sp * sr + sn * cr) * sz * -1 * -1; m[9] = -cp * sr * sz; m[10] = (sn * sp * sr + cy * cr) * sz; m[11] = 0;
            m[8] = (cy * sp * sr - sn * cr) * sz;
        }
        m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
        it.geom = g; it.r = col.r; it.g = col.g; it.b = col.b; it.a = (col.a ?? 1) * this.alpha;
        it.texture = o?.texture ? this.tex(o.texture) : null;
        it.unlit = !!o?.unlit; it.castShadow = o?.shadow !== false; it.shine = o?.shine ?? 0;
        this.game.renderer.mesh(it);
    }
    tex(name) {
        let t = this.textures.get(name);
        if (!t) { t = this.game.assets.sprite(name); this.textures.set(name, t); }
        return t;
    }
}

export class View {
    constructor(game, s, sim, snd, { quiet = false } = {}) {
        this.game = game; this.s = s; this.sim = sim; this.snd = snd; this.quiet = quiet;
        this.inst = new Inst(game);
        this.floor = game.twinFloor ?? (game.twinFloor = new Floor(game));
        this.chunks = []; this.sprites = []; this.pops = []; this.t = 0; this.marks = [];
        this.squash = 0; this.squashV = 0; this.tiltX = 0; this.tiltZ = 0; this.lastVx = 0; this.lastVz = 0;
        this.camX = 0; this.camZ = 0; this.look = { x: 0, z: 0 };
        this.flash = 0; this.dark = 0; this.shake = 0; this.bellT = 0; this.hurtFlash = 0; this.doorOpen = 0;
        this.feed = [];       // banners for the HUD
        this.vp = null;
        this.rx = 0; this.rz = 0;
        this.room(sim.roomName);
        s.add([{ dim: 3, draw: (d) => this.draw3D(d) }]);
        const light = s.light;
        light.dir.set(0.5, -1, 0.42);
        light.shadows = true; light.shadowRange = 21;
        this.frameCam(true);
    }

    room(name) {
        const { game, sim, s } = this;
        this.shell = buildShell(game, name, sim);
        this.floor.paint(name, sim);
        this.chunks.length = 0; this.sprites.length = 0;
        this.doorOpen = 0;
        const room = ROOMS[name], li = s.light, tone = { living: "#fff0d8", kitchen: "#fff6e4", bathroom: "#f0fbff", laundry: "#fff1e8", nursery: "#fff2dd" }[name];
        this.sunBase = hex(tone);
        this.floorItems = [];
        const fw = this.floor.w, fd = this.floor.d;
        this.floor.names.forEach((n, i) => { this.floorItems.push([n, -W + (i % 4) * fw, -D + ((i / 4) | 0) * fd]); });
        this.frameCam(true);
    }

    // --- Camera -------------------------------------------------------------------------------
    frameCam(cut) {
        const { s, sim } = this, v = s.view, cam = s.cam3, p = sim.p, portrait = v.height > v.width;
        cam.fov = 34;
        const vis = portrait ? 15 : v.width < 760 ? 16 : 20;       // world units across the narrow side
        const dist = (vis / 2) / Math.tan(17 * Math.PI / 180);
        const aspect = v.width / v.height;
        const seenX = portrait ? vis : vis * aspect, seenZ = (portrait ? vis / aspect : vis) / Math.sin(1.2);
        const px = lerp(p.px, p.x, 1), pz = lerp(p.pz, p.z, 1);
        const lead = cut ? 0 : 1.6;
        this.look.x = lerp(this.look.x, p.aimX * lead + clamp(p.vx * 0.09, -1, 1), 0.04);
        this.look.z = lerp(this.look.z, p.aimZ * lead + clamp(p.vz * 0.09, -1, 1), 0.04);
        const mx = Math.max(0, W + 1 - seenX / 2), mz = Math.max(0, D + 2 - seenZ / 2);
        const offset = portrait ? 1.5 : 0;   // keep the action above the thumbs
        const tx = clamp(px + this.look.x, -mx, mx), tz = clamp(pz + this.look.z, -mz, mz) + offset;
        const k = cut ? 1 : 0.1;
        this.camX = lerp(this.camX, tx, k); this.camZ = lerp(this.camZ, tz, k);
        const ang = 1.2, ey = Math.sin(ang) * dist, ez = Math.cos(ang) * dist;
        const shake = this.shake, sx = shake ? (this.game.fxRng.range(-1, 1)) * shake : 0, sz = shake ? (this.game.fxRng.range(-1, 1)) * shake : 0;
        const ep = [this.camX + sx, ey, this.camZ + ez + sz], tp = [this.camX + sx, 0, this.camZ + sz];
        if (cut) cam.set(ep, tp);
        else { cam.pos.set(ep); cam.target.set(tp); }
    }

    /** Fast world-to-view with the matrix for this frame. */
    prepareProject() {
        const cam = this.s.cam3;
        cam.update(this.game.alpha ?? 1);
        this.vp = cam.viewProj;
        this.vw = this.s.view.width; this.vh = this.s.view.height;
    }
    proj(x, y, z) {
        const m = this.vp, w = m[3] * x + m[7] * y + m[11] * z + m[15];
        this.rx = ((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * 0.5 + 0.5) * this.vw;
        this.rz = (0.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w * 0.5) * this.vh;
        return 1 / w;
    }
    /** Size of one world unit in view units at the middle of the screen. */
    unitScale() { return this.s.view.width / (this.s.view.height > this.s.view.width ? 15 : this.s.view.width < 760 ? 16 * this.s.view.width / this.s.view.height : 20 * this.s.view.width / this.s.view.height); }

    // --- Per-step -----------------------------------------------------------------------------
    update(dt) {
        const { sim, game, s } = this;
        this.t += dt;
        for (const e of sim.events) this.onEvent(e);
        sim.events.length = 0;
        this.frameCam(false);
        this.shake = Math.max(0, this.shake - dt * 1.4);
        this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.4);
        // Spring squash on the robot.
        this.squashV += (-this.squash * 340 - this.squashV * 18) * dt;
        this.squash += this.squashV * dt;
        const p = sim.p;
        const ax = (p.vx - this.lastVx) / dt, az = (p.vz - this.lastVz) / dt;
        this.lastVx = p.vx; this.lastVz = p.vz;
        const f = Math.cos(p.yaw), g = Math.sin(p.yaw);
        const fwd = clamp((ax * f + az * g) * 0.0032, -0.25, 0.25), side = clamp((-ax * g + az * f) * 0.0032, -0.25, 0.25);
        this.tiltX = lerp(this.tiltX, fwd, 0.16); this.tiltZ = lerp(this.tiltZ, side, 0.16);

        this.updateChunks(dt);
        this.updateSprites(dt);
        this.floor.flush(s.input && 3);

        // Dust trailing from a dash; suction streaks.
        if (p.charging && Math.random) {
            const rng = game.fxRng, n = 1 + Math.floor(p.charge * 2);
            for (let i = 0; i < n; i++) {
                const a = rng.range(0, TAU), r = p.suck * rng.range(0.6, 1);
                this.sprites.push({ tex: "lint", x: p.x + Math.cos(a) * r, y: 0.3, z: p.z + Math.sin(a) * r, vx: 0, vy: 0, vz: 0, size: rng.range(0.12, 0.28), life: 0.34, max: 0.34, col: "#fff4e0", g: 0, seek: true, add: false, a: 0.85 });
            }
        }
        if (p.coneOn) this.coneFx(p);
        // Burning furniture.
        for (const fu of sim.furn) {
            if (fu.burn > 0 && fu.solid && game.fxRng.range(0, 1) < 0.5) {
                const rng = game.fxRng;
                this.addFlame(fu.x + rng.range(-fu.w / 2, fu.w / 2), fu.h * rng.range(0.4, 1), fu.z + rng.range(-fu.d / 2, fu.d / 2), rng.range(0.5, 1.1));
            }
        }
        for (const e of sim.foes) if (e.burn > 0 && game.fxRng.range(0, 1) < 0.2) this.addFlame(e.x, 0.6, e.z, 0.45 + e.r * 0.4);
        // Hazards in action.
        for (const h of sim.hazards) {
            if (h.kind === "jet" && h.active) {
                const rng = game.fxRng;
                const x = rng.range(h.x0, h.x1), z = rng.range(h.z0, h.z1);
                if (h.tint === "fire") this.addFlame(x, 0.5, z, rng.range(0.5, 0.9));
                else this.addPuff(x, 0.6, z, rng.range(0.6, 1.1), "#ffffff", 0.6, 0.5, 2);
            }
            if (h.kind === "wind" && h.active && game.fxRng.range(0, 1) < 0.7) {
                const rng = game.fxRng;
                this.sprites.push({ tex: "spark", x: rng.range(h.x0, h.x1), y: 0.5, z: h.z0 + rng.range(0, h.z1 - h.z0), vx: 0, vy: 0, vz: 13, size: 0.7, life: 0.4, max: 0.4, col: "#ffffff", g: 0, rot: Math.PI / 2, a: 0.5 });
            }
            if (h.kind === "vortex" && h.active && game.fxRng.range(0, 1) < 0.6) {
                const rng = game.fxRng, a = rng.range(0, TAU), r = rng.range(1, h.r);
                this.addPuff(h.x + Math.cos(a) * r, 0.2, h.z + Math.sin(a) * r, 0.4, "#c8f2fa", 0.5, 0.5, 0);
            }
        }
        // The cat dims the room.
        const c = sim.cat, cc = c.state !== "off" && c.state !== "leave" ? (c.state === "omen" ? 0.8 : 1) : 0;
        this.dark = lerp(this.dark, cc, 0.04);
        const li = s.light, k = 1 - this.dark * 0.46, sb = this.sunBase;
        li.color.r = sb[0] * 0.72 * k; li.color.g = sb[1] * 0.66 * k; li.color.b = sb[2] * 0.58 * k * (1 + this.dark * 0.1);
        li.sky.r = 0.62 * (1 - this.dark * 0.5); li.sky.g = 0.58 * (1 - this.dark * 0.45); li.sky.b = 0.66 * (1 - this.dark * 0.2);
        li.ground.r = 0.46; li.ground.g = 0.4; li.ground.b = 0.42;
        if (sim.phase === "exit" || sim.phase === "transit") this.doorOpen = Math.min(1, this.doorOpen + dt * 2);
        else this.doorOpen = 0;
        for (let i = this.pops.length - 1; i >= 0; i--) { const q = this.pops[i]; q.t += dt; if (q.t > q.life) this.pops.splice(i, 1); }
        for (let i = this.marks.length - 1; i >= 0; i--) { const q = this.marks[i]; q.t += dt; if (q.t > q.life) this.marks.splice(i, 1); }
        for (let i = this.feed.length - 1; i >= 0; i--) { const q = this.feed[i]; q.t += dt; if (q.t > q.life) this.feed.splice(i, 1); }
    }

    // --- Effects ------------------------------------------------------------------------------
    addFlame(x, y, z, size) {
        const r = this.game.fxRng;
        if (this.sprites.length > 500) return;
        this.sprites.push({ tex: "flame", x, y, z, vx: r.range(-0.6, 0.6), vy: r.range(1.6, 3.2), vz: r.range(-0.6, 0.6), size, life: 0.42, max: 0.42, col: "#ffffff", g: 0, add: true, grow: -0.5, a: 0.42 });
    }
    addPuff(x, y, z, size, col, life = 0.5, a = 0.85, up = 1) {
        const r = this.game.fxRng;
        if (this.sprites.length > 500) return;
        this.sprites.push({ tex: "puff", x, y, z, vx: r.range(-1, 1), vy: r.range(0.2, up), vz: r.range(-1, 1), size, life, max: life, col, g: 0, grow: 1.4, a, rot: r.range(0, TAU) });
    }
    fluff(x, z, n, col, speed = 5, size = 0.5) {
        const r = this.game.fxRng;
        for (let i = 0; i < n && this.sprites.length < 500; i++) {
            const a = r.range(0, TAU), s = r.range(speed * 0.3, speed);
            this.sprites.push({ tex: "puff", x, y: 0.5, z, vx: Math.cos(a) * s, vy: r.range(1, 5), vz: Math.sin(a) * s, size: r.range(size * 0.5, size), life: r.range(0.3, 0.6), max: 0.6, col, g: 12, grow: 0.4, a: 0.95, drag: 3, rot: r.range(0, TAU) });
        }
    }
    sparks(x, y, z, n, col = "#ffd98a", speed = 9) {
        const r = this.game.fxRng;
        for (let i = 0; i < n && this.sprites.length < 500; i++) {
            const a = r.range(0, TAU), s = r.range(speed * 0.4, speed);
            this.sprites.push({ tex: "spark", x, y, z, vx: Math.cos(a) * s, vy: r.range(2, 7), vz: Math.sin(a) * s, size: r.range(0.26, 0.5), life: r.range(0.16, 0.34), max: 0.34, col, g: 26, add: true, a: 1, along: true });
        }
    }
    glow(x, y, z, size, col, life = 0.16, a = 0.9) {
        if (this.sprites.length > 520) return;
        this.sprites.push({ tex: "soft", x, y, z, vx: 0, vy: 0, vz: 0, size, life, max: life, col, g: 0, add: true, grow: 0.8, a });
    }
    ringFx(x, z, r, col, life = 0.32, a = 0.9) {
        this.marks.push({ kind: "ring", x, z, r0: r * 0.3, r1: r, col, t: 0, life, a });
    }
    debris(x, y, z, junk, n, speed = 6, f = null) {
        const j = JUNK[junk] ?? JUNK.wood, r = this.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = r.range(0, TAU), s = r.range(speed * 0.25, speed), sz = r.range(0.7, 1.5);
            this.chunks.push({
                mesh: j.meshes[Math.floor(r.range(0, j.meshes.length))], tint: j.tints[Math.floor(r.range(0, j.tints.length))],
                x: x + (f ? r.range(-f.w / 2, f.w / 2) : 0), y, z: z + (f ? r.range(-f.d / 2, f.d / 2) : 0),
                vx: Math.cos(a) * s, vy: r.range(3, 9), vz: Math.sin(a) * s, yaw: r.range(0, TAU), pitch: r.range(0, TAU), roll: r.range(0, TAU),
                wy: r.range(-9, 9), wp: r.range(-12, 12), sz, rest: false, bounce: 0, junk,
            });
        }
        // Old rubble sinks into the floor as a mark, so mess never stops piling up and never costs more.
        const max = 360;
        while (this.chunks.length > max) {
            const c = this.chunks.shift();
            if (c.rest) this.floor.stamp("skid", c.x, c.z, 0.3 * c.sz, [c.tint.r * 0.7, c.tint.g * 0.7, c.tint.b * 0.7], 0.9, c.yaw, 0.45);
        }
    }
    updateChunks(dt) {
        const { sim } = this;
        for (const c of this.chunks) {
            if (c.rest) continue;
            c.vy -= 24 * dt;
            c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
            c.yaw += c.wy * dt; c.pitch += c.wp * dt;
            if (Math.abs(c.x) > W - 0.2) { c.x = Math.sign(c.x) * (W - 0.2); c.vx *= -0.4; }
            if (c.z < -D + 0.2) { c.z = -D + 0.2; c.vz *= -0.4; } else if (c.z > D - 0.2) { c.z = D - 0.2; c.vz *= -0.4; }
            if (c.y < 0.09) {
                c.y = 0.09;
                if (c.bounce++ > 1 || Math.abs(c.vy) < 3) { c.rest = true; c.pitch = 0; c.roll = 0; }
                else { c.vy *= -0.42; c.vx *= 0.6; c.vz *= 0.6; c.wy *= 0.5; c.wp *= 0.5; }
            }
        }
        // The robot kicks rubble as it drives through; the first thing anyone will try.
        const p = sim.p, sp = Math.hypot(p.vx, p.vz);
        if (sp > 3) for (const c of this.chunks) {
            if (!c.rest) continue;
            const dx = c.x - p.x, dz = c.z - p.z, q = dx * dx + dz * dz;
            if (q < 0.9) {
                const l = Math.sqrt(q) || 1, r = this.game.fxRng;
                c.rest = false; c.bounce = 0;
                c.vx = dx / l * sp * 0.5 + p.vx * 0.4; c.vz = dz / l * sp * 0.5 + p.vz * 0.4; c.vy = r.range(2, 5); c.y = 0.15;
                c.wy = r.range(-10, 10); c.wp = r.range(-12, 12);
            }
        }
    }
    updateSprites(dt) {
        const p = this.sim.p, list = this.sprites;
        let n = 0;
        for (let i = 0; i < list.length; i++) {
            const q = list[i];
            q.life -= dt;
            if (q.life <= 0) continue;
            if (q.seek) { const k = 1 - Math.exp(-9 * dt); q.x += (p.x - q.x) * k; q.z += (p.z - q.z) * k; }
            q.vy -= q.g * dt;
            if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vz *= k; }
            q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
            if (q.y < 0.05) { q.y = 0.05; q.vy = 0; }
            list[n++] = q;
        }
        list.length = n;
    }

    coneFx(p) {
        const rng = this.game.fxRng, yaw = Math.atan2(p.aimZ, p.aimX), w = WEAPONS[p.coneOn];
        const mx = p.x + Math.cos(yaw) * 0.8, mz = p.z + Math.sin(yaw) * 0.8;
        for (let i = 0; i < 3; i++) {
            const a = yaw + rng.range(-w.arc, w.arc) * 0.9, s = w.range * rng.range(1.5, 2.3);
            if (p.coneOn === "dryer") {
                this.sprites.push({ tex: "flame", x: mx, y: 0.6, z: mz, vx: Math.cos(a) * s + p.vx * 0.5, vy: rng.range(0, 1), vz: Math.sin(a) * s + p.vz * 0.5, size: rng.range(0.3, 0.55), life: 0.42, max: 0.42, col: "#ffffff", g: 0, add: true, grow: 2.6, a: 0.3 });
            } else {
                this.sprites.push({ tex: "spark", x: mx, y: 0.6, z: mz, vx: Math.cos(a) * s * 1.2, vy: 0, vz: Math.sin(a) * s * 1.2, size: rng.range(0.5, 1), life: 0.34, max: 0.34, col: "#e8ffe0", g: 0, a: 0.75, along: true });
            }
        }
    }

    say(text, o = {}) { this.feed.push({ text, t: 0, life: o.life ?? 2.2, big: !!o.big, col: o.col ?? "#fff6e6", sub: o.sub ?? null }); }
    pop(x, z, text, col = "#ffffff", size = 15, life = 0.8) { if (this.pops.length < 40) this.pops.push({ x, z, text, col, size, t: 0, life }); }
    kick(a) { this.shake = Math.min(0.5, Math.max(this.shake, a)); }

    onEvent(e) {
        const { s, snd, game, floor, sim } = this, fx = this.quiet ? null : snd, q = this.quiet;
        const rng = game.fxRng;
        switch (e.type) {
            case "room": this.room(e.name); break;
            case "kill": {
                const big = e.r > 0.7;
                if (e.k === "bunny" || e.k === "boss") {
                    this.fluff(e.x, e.z, big ? 16 : 8, "#d4c7d6", 6, big ? 0.9 : 0.55);
                    floor.stamp("splat", e.x, e.z, e.r * 1.9, [0.55, 0.5, 0.56], 0.34, rng.range(0, TAU));
                    if (rng.range(0, 1) < 0.5) floor.stamp("hair", e.x, e.z, 0.8, [0.44, 0.4, 0.46], 0.6, rng.range(0, TAU));
                    fx?.play(big ? "bigpoof" : e.why === "saw" ? "chop" : "poof", big ? "medium" : "tick", 0.05);
                } else if (e.k === "seg" || e.k === "snake") {
                    const cols = [hex("#ff5a6a"), hex("#3f8cff"), hex("#37c98b")], c = cols[SOCK_BY(e.segColor)];
                    floor.stamp("hair", e.x, e.z, 1, c, 0.8, rng.range(0, TAU));
                    this.fluff(e.x, e.z, 7, ["#ff8a95", "#7fb2ff", "#7fe3b5"][SOCK_BY(e.segColor)], 5, 0.5);
                    this.debris(e.x, 0.4, e.z, "stuffing", 2, 5);
                    fx?.play("chop", "light", 0.05);
                } else if (e.k === "puff") {
                    fx?.play("pop", "medium");
                } else if (e.k === "golem") {
                    this.fluff(e.x, e.z, 34, "#e6a15c", 9, 1.2);
                    floor.stamp("splat", e.x, e.z, 3, [0.7, 0.44, 0.22], 0.5, rng.range(0, TAU));
                    for (let i = 0; i < 5; i++) floor.stamp("hair", e.x + rng.range(-2, 2), e.z + rng.range(-2, 2), 1.6, [0.72, 0.42, 0.2], 0.85, rng.range(0, TAU));
                    s.freeze(0.09); this.kick(0.3); s.flash("#fff0d0", 0.08);
                    fx?.play("bigpoof", "heavy", 0.05);
                }
                if (e.score >= 120 && this.pops.length < 8) this.pop(e.x, e.z, `+${e.score}`, e.mult >= 3 ? "#ffd24d" : "#ffffff", 13 + Math.min(7, e.mult));
                if (!big && e.why === "saw") { this.sparks(e.x, 0.5, e.z, 2); s.freeze(0.012); }
                break;
            }
            case "hit":
                if (e.why === "saw") this.sparks(e.x, 0.6, e.z, 1);
                else if (e.why === "nail" || e.why === "lint") this.fluff(e.x, e.z, 1, "#e7dbe6", 4, 0.3);
                if (e.k === "trike") { this.sparks(e.x, 1.2, e.z, 3, "#ffe08a"); fx?.play("bump", "tick", 0.09); }
                break;
            case "saw":
                if (e.spun) this.sparks(e.x, 0.5, e.z, 2, "#ffb347", 11);
                if (!q) game.haptic(e.spun ? "light" : "tick");
                break;
            case "chew":
                this.debris(e.x, 0.8, e.z, e.junk, 1, 4);
                this.sparks(e.x, 0.8, e.z, 1);
                fx?.play("chew", "tick", 0.09);
                break;
            case "bump": {
                this.squashV += e.hard ? 16 : 7;
                this.sparks(e.x, 0.3, e.z, e.hard ? 8 : 3);
                this.kick(e.hard ? 0.24 : 0.07);
                fx?.play("bump", e.hard ? "heavy" : "light");
                if (e.hard) { floor.stamp("skid", e.x, e.z, 1.2, [0.14, 0.11, 0.12], 0.5, Math.atan2(e.nz, e.nx) + Math.PI / 2, 0.3); s.freeze(0.03); }
                if (e.furn >= 0) this.debris(e.x, 0.6, e.z, sim.furn[e.furn].def.junk, e.hard ? 4 : 1, 4);
                break;
            }
            case "hurt":
                this.hurtFlash = 1; this.kick(0.3); s.freeze(0.05);
                this.squashV -= 12;
                this.sparks(e.x, 0.5, e.z, 10, "#ff7a6a");
                fx?.play("hurt", "error");
                break;
            case "dash":
                this.squashV += 10;
                this.kick(0.08 + e.c * 0.14);
                fx?.play("dash", e.c > 0.7 ? "heavy" : "medium");
                this.ringFx(e.x, e.z, 2 + e.c * 2, "#bff6ff");
                for (let i = 0; i < 7; i++) floor.stamp("skid", e.x + e.dx * i * 0.7, e.z + e.dz * i * 0.7, 0.8, [0.2, 0.17, 0.18], 0.26 * (1 - i / 7), Math.atan2(e.dz, e.dx), 0.5);
                break;
            case "charge": fx?.play("gulp", "light"); break;
            case "charged": fx?.play("charged", "medium"); this.pop(sim.p.x, sim.p.z, "FULL POWER", "#7fffe9", 14, 0.7); break;
            case "spinout": fx?.play("spin", "medium"); this.ringFx(e.x, e.z, 2.6 + e.c * 1.6, "#ffd24d", 0.4); break;
            case "fullspin": fx?.play("spin", "light", 0.3); break;
            case "gulp":
                fx?.play(e.healed ? "heal" : "gulp", "tick", 0.07);
                this.squashV += 1.2;
                break;
            case "shoot": {
                const w = e.w, col = WEAPONS[w]?.color ?? [1, 1, 1];
                this.glow(e.x, 0.6, e.z, 0.7, "#fff3c4", 0.06);
                fx?.play(w === "sock" ? "sock" : w === "nail" ? "nail" : "pellet", w === "sock" ? "light" : "tick", 0.05);
                if (w === "sock") this.squashV += 5;
                break;
            }
            case "cone": if (e.w === "dryer") floor.stamp("scorch", e.x + Math.cos(e.yaw) * rng.range(1.5, e.range), e.z + Math.sin(e.yaw) * rng.range(1.5, e.range), rng.range(0.5, 0.9), [0.16, 0.12, 0.12], 0.08); break;
            case "fizz": this.fluff(e.x, e.z, 3, "#e7dbe6", 3, 0.28); break;
            case "stick":
                if (e.k === "nail") floor.stamp("soft", e.x, e.z, 0.14, [0.3, 0.3, 0.34], 0.8);
                this.sparks(e.x, 0.7, e.z, 2);
                break;
            case "ricochet": this.sparks(e.x, 0.7, e.z, 3); fx?.play("pellet", "tick", 0.07); break;
            case "blast": this.blastFx(e); break;
            case "merge": {
                this.fluff(e.x, e.z, 8, "#d4c7d6", 3, 0.6);
                fx?.play("poof", null, 0.1);
                this.ringFx(e.x, e.z, 1.2, "#e9dff0", 0.22, 0.5);
                break;
            }
            case "spawn":
                if (e.k !== "seg") this.addPuff(e.x, 0.3, e.z, 0.8, "#d4c7d6", 0.5, 0.7);
                fx?.play("spawn", null, 0.06);
                break;
            case "crack":
                this.debris(e.x, 1, e.z, e.junk, 6, 5, sim.furn[e.f]);
                fx?.play("chew", "light");
                break;
            case "smash": this.smashFx(e); break;
            case "equip":
                this.say(WEAPONS[e.w].name, { col: "#ffd24d" });
                this.ringFx(e.x, e.z, 2.4, "#ffd24d");
                this.squashV += 8;
                fx?.play("equip", "success");
                break;
            case "battery": this.pop(e.x, e.z, "+25", "#2bd17e", 16); fx?.play("battery", "success"); this.ringFx(e.x, e.z, 1.8, "#2bd17e"); break;
            case "drop": this.ringFx(e.x, e.z, 1.6, "#ffffff", 0.3, 0.7); fx?.play("door", "tick"); break;
            case "dry": this.say("BAG EMPTY: HOLD DASH TO SUCK UP DUST", { col: "#ff9a7a", life: 2.4 }); fx?.play("dry", "warn"); break;
            case "fuse": fx?.play("fuse", "light"); break;
            case "coil": fx?.play("coil", null, 0.1); break;
            case "lunge": fx?.play("lunge", null, 0.1); break;
            case "heave": fx?.play("heave"); break;
            case "windup": fx?.play("heave"); this.marks.push({ kind: "tele", x: e.x, z: e.z, r0: e.r, r1: e.r, col: "#ff6a4a", t: 0, life: 0.85, a: 0.5 }); break;
            case "lob": fx?.play("hiss", null, 0.1); break;
            case "zap": {
                const [ax, az] = e.a, [bx, bz] = e.b;
                for (let i = 0; i < 12; i++) { const t = i / 11; this.sparks(ax + (bx - ax) * t, 0.2, az + (bz - az) * t, 2, "#9fe8ff", 6); }
                fx?.play("zap", null);
                break;
            }
            case "jet": fx?.play(e.tint === "fire" ? "flame" : "hiss"); break;
            case "gurgle": fx?.play("gurgle"); this.ringFx(e.x, e.z, 5, "#8fe2f0", 0.8, 0.5); break;
            case "wind": fx?.play("whoosh"); break;
            case "brick": fx?.play("hurt", "light"); this.pop(e.x, e.z, "OUCH", "#ffffff", 14); break;
            case "brickgone": this.addPuff(e.x, 0.2, e.z, 0.5, "#ffffff", 0.3, 0.6); break;
            case "soap": fx?.play("bump", "light"); break;
            case "arc": this.marks.push({ kind: "bolt", x: e.x0, z: e.z0, x1: e.x1, z1: e.z1, col: "#a4e6ff", t: 0, life: 0.14, a: 1 }); break;
            case "catomen":
                fx?.play("growl", "warn");
                if (!sim.cat.seen) this.say("SOMETHING IS PURRING", { big: true, col: "#d8ff4a", life: 2.6 });
                break;
            case "catin":
                if (!e.scare) this.say("THE CAT", { big: true, col: "#d8ff4a", life: 1.8, sub: "Hide behind furniture. She hunts what she can see" });
                else this.say("THE CAT", { big: true, col: "#d8ff4a", life: 2.4, sub: "Not yet. Not today" });
                sim.cat.seen = true;
                fx?.play("meow", "warn");
                break;
            case "catcrouch": fx?.play("hisscat", "warn"); break;
            case "catleap": fx?.play("hisscat", null); break;
            case "catland": this.kick(0.5); s.freeze(0.08); fx?.play("stomp", "heavy"); this.fluff(e.x, e.z, 22, "#3f3a4d", 11, 1); this.ringFx(e.x, e.z, 4, "#d8ff4a", 0.4); floor.stamp("crack", e.x, e.z, 3, [0.18, 0.15, 0.18], 0.5, rng.range(0, TAU)); break;
            case "swipe": fx?.play("hisscat", "heavy"); this.kick(0.25); break;
            case "catleave": fx?.play("meow"); break;
            case "bossin": this.say("THE TINY TYRANT", { big: true, col: "#ff8a5a", life: 2.6, sub: "Smash the trike" }); fx?.play("giggle", "warn"); break;
            case "bell": fx?.play("bell", "warn"); this.bellT = 1; break;
            case "charge2": fx?.play("giggle", "medium"); break;
            case "crash": this.kick(0.5); s.freeze(0.09); fx?.play("crash", "heavy"); this.sparks(e.x, 1, e.z, 16); floor.stamp("crack", e.x, e.z, 3.6, [0.2, 0.16, 0.18], 0.5, rng.range(0, TAU)); this.pop(e.x, e.z, "DIZZY!", "#ffd24d", 22, 1.2); break;
            case "tantrum": fx?.play("wail", "heavy"); this.say("TANTRUM!", { big: true, col: "#ff6a5a", life: 1.3 }); break;
            case "wail": fx?.play("wail", "medium"); this.kick(0.15); break;
            case "shed": this.debris(e.x, 1.4, e.z, "toys", 10, 8); this.sparks(e.x, 1.4, e.z, 14); this.kick(0.3); s.freeze(0.05); fx?.play("crash", "heavy"); break;
            case "bossdown":
                s.freeze(0.2); this.kick(0.5); s.flash("#ffffff", 0.3);
                this.debris(e.x, 1.2, e.z, "metal", 30, 11); this.debris(e.x, 1.2, e.z, "toys", 20, 10);
                s.timeScale = 0.4;
                s.wait(1.2, () => { s.timeScale = 1; });
                fx?.play("crash", "heavy");
                this.say("TRIKE DESTROYED", { big: true, col: "#ffd24d", life: 3.4, sub: "Naptime" });
                this.bossRest = { x: e.x, z: e.z, yaw: e.yaw };
                break;
            case "reboot": this.say("BACKUP BATTERY!", { big: true, col: "#2bd17e" }); s.flash("#d8ffe8", 0.2); fx?.play("equip", "success"); break;
            case "wave":
                if (e.boss) this.say(e.name, { big: true, col: "#ff8a5a", life: 1.8 });
                else this.say(e.name, { big: true, col: e.storm ? "#ff8a5a" : "#fff6e6", life: 1.7, sub: e.index === 0 ? ROOMS[sim.roomName].hint : null });
                fx?.play("wave", "medium");
                break;
            case "waveclear": this.say("ROOM SECURE", { col: "#7fffe9", life: 1.2 }); fx?.play("clear", "success"); break;
            case "offer": fx?.play("door", "light"); break;
            case "upgrade": fx?.play("card", "success"); s.flash("#ffffff", 0.1); break;
            case "exits": this.say("PICK A DOOR", { big: true, col: "#ffd24d", life: 2.2 }); fx?.play("door", "success"); break;
            case "transit": fx?.play("door", "medium"); break;
            case "dead":
                s.timeScale = 0.3; s.wait(0.5, () => { s.timeScale = 1; });
                this.kick(0.5); s.flash("#ff5a4a", 0.25);
                this.sparks(e.x, 0.5, e.z, 30); this.debris(e.x, 0.6, e.z, "metal", 16, 9);
                fx?.play("crash", "heavy");
                floor.stamp("scorch", e.x, e.z, 2.2, [0.12, 0.1, 0.1], 0.8);
                break;
            case "won": break;
        }
    }

    blastFx(e) {
        const { floor, snd, s } = this, fx = this.quiet ? null : snd, rng = this.game.fxRng;
        switch (e.kind) {
            case "puff":
                this.glow(e.x, 0.5, e.z, e.r * 2.4, "#bfe8ff", 0.2);
                this.sparks(e.x, 0.5, e.z, 14, "#9fe8ff", 11);
                this.ringFx(e.x, e.z, e.r, "#9fe8ff");
                floor.stamp("scorch", e.x, e.z, e.r * 0.9, [0.2, 0.17, 0.2], 0.55, rng.range(0, TAU));
                fx?.play("pop", "medium");
                this.kick(0.15);
                break;
            case "sock":
                this.fluff(e.x, e.z, 14, "#ffb0b8", 8, 0.7);
                this.ringFx(e.x, e.z, e.r, "#ffffff");
                this.glow(e.x, 0.6, e.z, e.r * 1.6, "#ffd0a0", 0.14);
                floor.stamp("hair", e.x, e.z, 1.4, [0.9, 0.3, 0.36], 0.6, rng.range(0, TAU));
                fx?.play("bigpoof", "medium");
                this.kick(0.14);
                break;
            case "stomp":
                this.fluff(e.x, e.z, 14, "#e6a15c", 8, 0.8);
                this.ringFx(e.x, e.z, e.r, "#ff8a5a", 0.3);
                floor.stamp("crack", e.x, e.z, 2.2, [0.2, 0.15, 0.15], 0.35, rng.range(0, TAU));
                fx?.play("stomp", "heavy");
                this.kick(0.22);
                break;
            case "hairball":
                this.fluff(e.x, e.z, 12, "#e6a15c", 7, 0.7);
                floor.stamp("hair", e.x, e.z, 1.5, [0.72, 0.42, 0.2], 0.8, rng.range(0, TAU));
                fx?.play("bigpoof", "light");
                this.kick(0.12);
                break;
            case "block":
                this.sparks(e.x, 0.3, e.z, 8);
                this.debris(e.x, 0.3, e.z, "toys", 4, 6);
                floor.stamp("crack", e.x, e.z, 1.2, [0.2, 0.16, 0.18], 0.3, rng.range(0, TAU));
                fx?.play("bump", "medium");
                this.kick(0.16);
                break;
            case "crash": break;
            default:
                this.glow(e.x, 0.5, e.z, e.r * 1.8, "#ffd98a", 0.16);
                this.ringFx(e.x, e.z, e.r, "#ffd98a");
                this.sparks(e.x, 0.4, e.z, 12);
                floor.stamp("scorch", e.x, e.z, e.r * 0.7, [0.18, 0.15, 0.15], 0.45, rng.range(0, TAU));
                fx?.play("pop", "medium");
                this.kick(0.2);
        }
    }

    smashFx(e) {
        const { floor, s, snd, sim } = this, f = sim.furn[e.f], j = JUNK[e.junk] ?? JUNK.wood, fx = this.quiet ? null : snd, rng = this.game.fxRng;
        const n = Math.min(30, 10 + Math.round(f.w * f.d * 1.8));
        this.debris(f.x, f.h * 0.6, f.z, e.junk, n, 9, f);
        for (let i = 0; i < 12; i++) this.addPuff(f.x + rng.range(-f.w / 2, f.w / 2), 0.6, f.z + rng.range(-f.d / 2, f.d / 2), rng.range(0.5, 1), j.decal, 0.5, 0.6, 2);
        floor.stamp("splat", f.x, f.z, Math.max(f.w, f.d) * 0.8, j.decalC, 0.5, rng.range(0, TAU));
        floor.stamp("crack", f.x, f.z, Math.max(f.w, f.d) * 0.7, [0.2, 0.16, 0.16], 0.35, rng.range(0, TAU));
        this.kick(0.3); s.freeze(0.06);
        fx?.play(e.junk === "glass" || e.junk === "porcelain" ? "glass" : "crash", "heavy");
        this.pop(f.x, f.z, `-$${e.value.toLocaleString("en-US")}`, "#ffe08a", 18 + Math.min(10, e.value / 300), 1.3);
    }

    // --- 3D -----------------------------------------------------------------------------------
    draw3D(d) {
        const { inst, sim, game } = this, a = game.alpha ?? 1, t = this.t;
        const put = inst.put.bind(inst);
        inst.begin(1);
        for (const [n, x, z] of this.floorItems) put("fquad", x, 0, z, 0, this.floor.w, 1, this.floor.d, WHITE, 0, 0, { texture: n, shadow: false });
        put(this.shell, 0, 0, 0);
        // Exit doors swing open.
        for (const f of sim.furn) {
            const w = f.wob, sway = w ? Math.sin(t * 40) * w * 0.05 : 0;
            put(`f_${f.kind}_${f.stage}`, f.x + sway * 0.4, 0, f.z, -f.rot * Math.PI / 2, 1, 1 + w * 0.03, 1, WHITE, sway, 0, f.def.junk === "metal" || f.def.junk === "porcelain" || f.def.junk === "glass" ? { shine: 0.45 } : null);
        }
        for (const c of this.chunks) put(c.mesh, c.x, c.y, c.z, c.yaw, c.sz, c.sz, c.sz, c.tint, c.pitch, c.roll, c.rest ? { shadow: false } : null);
        this.drawHazards(put, a);
        this.drawPickups(put);
        this.drawMotes(put, a);
        this.drawFoes(put, a);
        this.drawCat(put, a);
        this.drawShots(put, a);
        if (this.bossRest && !sim.foes.some((e) => e.k === "trike")) this.drawNap(put);
        if (sim.phase !== "dead" || true) this.drawRobot(put, a);
    }

    drawRobot(put, a) {
        const { sim } = this, p = sim.p, x = lerp(p.px, p.x, a), z = lerp(p.pz, p.z, a), yaw = p.yaw;
        const stretch = 1 + clamp(this.squash, -0.3, 0.3), wide = 1 - clamp(this.squash, -0.3, 0.3) * 0.6;
        const dead = sim.phase === "dead";
        const blink = p.inv > 0 && p.hurtT > 0 && Math.floor(this.t * 30) % 2 === 0;
        const tint = blink ? { r: 3, g: 1.2, b: 1.2, a: 1 } : dead ? { r: 0.35, g: 0.33, b: 0.36, a: 1 } : WHITE;
        const R = 1.24, py = 0.02, pitch = this.tiltX, roll = this.tiltZ;
        const o = { shine: 0.65 };
        put("robot", x, py, z, yaw, R * wide, R * stretch, R * wide, tint, pitch, roll, o);
        const reach = p.stats.reach, rev = p.sawHit > 0 ? 0.02 : 0.008;
        const vib = Math.sin(this.t * 90) * rev;
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const bx = x + cy * 0.42 + sy * vib, bz = z + sy * 0.42 - cy * vib, by = 0.36;
        put("saw", bx, by, bz, yaw, reach / 1.4 * 1.05, 1, 1, tint, 0, 0, { shine: 0.5 });
        put(`teeth${Math.floor(this.t * (p.sawHit > 0 ? 40 : 18)) % 2}`, bx, by, bz, yaw, reach / 1.4 * 1.05, 1, 1, tint, 0, 0, { shadow: false });
        if (!dead) for (const s of [-1, 1]) {
            const ang = this.t * 26 * s, ox = 0.44, oz = s * 0.52;
            put("brush", x + cy * ox - sy * oz, 0.06, z + sy * ox + cy * oz, ang, R * 0.7, 1, R * 0.7, WHITE, 0, 0, { shadow: false });
        }
        const w = p.weapon, ay = Math.atan2(p.aimZ, p.aimX);
        put(`w_${w}`, x - cy * 0.08, 0.72 + (w === "dryer" || w === "nail" || w === "sock" ? 0.24 : 0.12), z - sy * 0.08, ay, 1.1, 1.1, 1.1, tint);
    }

    part(put, e, lx, ly, lz, mesh, yaw, sx, sy, sz, col, pitch = 0, roll = 0, x = e.x, z = e.z, o = null) {
        const c = Math.cos(yaw), s = Math.sin(yaw);
        put(mesh, x + c * lx - s * lz, ly, z + s * lx + c * lz, yaw, sx, sy, sz, col, pitch, roll, o);
    }

    drawFoes(put, a) {
        const { sim } = this, foes = sim.foes;
        const flashCol = { r: 3.2, g: 3, b: 2.8, a: 1 }, burnCol = { r: 1.9, g: 0.95, b: 0.4, a: 1 };
        for (let i = 0; i < foes.length; i++) {
            const e = foes[i], x = lerp(e.px, e.x, a), z = lerp(e.pz, e.z, a);
            const born = e.born > 0 ? clamp(1 - e.born / 0.55, 0.02, 1) : 1;
            const col = e.flash > 0 ? flashCol : e.burn > 0 ? burnCol : (e.k === "bunny" ? TIER_TINT[e.tier] : null) ?? WHITE;
            switch (e.k) {
                case "bunny": {
                    const s = e.r / 0.42 * born, sq = e.squash ?? 0, sy = s * (1 - sq * 0.3 + (e.y ?? 0) * 0.4), sw = s * (1 + sq * 0.2);
                    put("bunny", x, (e.y ?? 0), z, e.yaw, sw, sy, sw, col);
                    break;
                }
                case "puff": {
                    const fuse = e.state === "fuse", beat = fuse ? 1 + Math.sin(this.t * 40) * 0.12 + (0.95 - e.t) * 0.5 : 1;
                    const c = fuse && Math.floor(this.t * 16) % 2 ? flashCol : col;
                    put("puff", x, e.y, z, this.t * 1.6 + e.phase, beat * born, beat * born, beat * born, c);
                    break;
                }
                case "snake":
                case "seg": {
                    const v = SOCK_BY(e.color ?? 0.1);
                    if (e.k === "snake") {
                        const coil = e.state === "coil" ? 0.9 : 1;
                        put(`head${v}`, x, 0, z, e.yaw, born * coil, born, born * (e.state === "lunge" ? 0.85 : 1), col, e.state === "coil" ? 0.35 : e.state === "lunge" ? -0.1 : 0);
                    } else put(`seg${v}`, x, e.y, z, e.yaw, born, born, born, col);
                    break;
                }
                case "golem": {
                    const st = e.stride ?? 0, sw = Math.sin(st), yaw = e.yaw, s = born;
                    const wind = e.state === "stomp" ? (0.85 - e.t) / 0.85 : 0, heave = e.state === "throw" ? (0.6 - e.t) / 0.6 : 0;
                    put("golem_body", x, 0.3 + Math.abs(sw) * 0.12 + wind * 0.5, z, yaw, s, s, s, col, -wind * 0.2 + heave * 0.2, sw * 0.06);
                    for (const k of [-1, 1]) {
                        this.part(put, e, sw * 0.45 * k, 0.86, k * 0.62, "golem_limb", yaw, s, s * 0.82, s, col, 0, 0, x, z);
                        this.part(put, e, 0.14, 2.4 + wind * 1.4 + heave, k * 1.2, "golem_limb", yaw, s, s * (1.06), s, col, -sw * 0.5 * k - wind * 2.5 - heave * 2.4, 0, x, z);
                    }
                    break;
                }
                case "trike": this.drawTrike(put, e, x, z, col); break;
            }
        }
    }

    drawTrike(put, e, x, z, col) {
        const yaw = e.yaw, shed = e.shed ?? 0, w = e.wheel ?? 0, shake = e.state === "dazed" ? Math.sin(this.t * 30) * 0.12 : e.state === "wail" ? Math.sin(this.t * 44) * 0.09 : 0;
        const rock = e.state === "bell" ? Math.sin(this.t * 22) * 0.1 : 0;
        put("trike_frame", x, 0, z, yaw, 1.15, 1.15, 1.15, col, rock, shake * 0.8);
        this.part(put, e, 1.12, 1.12, 0, "trike_wheel", yaw, 1, 1, 1, col, -w, 0, x, z);
        if (shed < 3) for (const s of [-1, 1]) this.part(put, e, -1.4, 0.72, s * 1.15, "trike_wheel", yaw, 0.66, 0.66, 0.66, col, -w * 1.5, 0, x, z);
        else this.part(put, e, -1.4, 0.72, 1.15, "trike_wheel", yaw, 0.66, 0.66, 0.66, col, -w * 1.5, 0, x, z);
        if (shed < 1) this.part(put, e, 1.4, 2.0, 0, "trike_basket", yaw, 1, 1, 1, col, 0, 0, x, z);
        // The toddler rides on top and takes no hits: every blow lands on the trike.
        const b = Math.sin(this.t * 7) * 0.05;
        put("tod_body", x - Math.cos(yaw) * 0.6, 1.9 + b, z - Math.sin(yaw) * 0.6, yaw, 1, 1, 1, WHITE, 0, shake);
        const cry = e.state === "wail" || e.state === "dazed";
        put(cry ? "tod_cry" : "tod_head", x - Math.cos(yaw) * 0.5, 3.6 + b, z - Math.sin(yaw) * 0.5, yaw, 1.1, 1.1, 1.1, WHITE, 0.75 + (e.state === "bell" ? 0.2 : 0), shake);
        for (const s of [-1, 1]) {
            const reach = e.state === "throw" ? -1.4 + Math.sin(this.t * 14) : e.state === "wail" ? Math.sin(this.t * 30 + s) * 0.7 + 0.9 : -0.1;
            this.part(put, e, -0.3, 2.7 + b, s * 0.78, "tod_arm", yaw, 1, 1, 1, WHITE, reach, 0, x, z);
        }
    }

    /** Afterwards: a very tired toddler, sat on the floor, unhurt. */
    drawNap(put) {
        const r = this.bossRest, b = Math.sin(this.t * 2) * 0.03;
        put("tod_body", r.x, 0.1, r.z, Math.PI / 2, 1, 1 + b, 1);
        put("tod_cry", r.x, 1.8 + b, r.z + 0.1, Math.PI / 2, 1.1, 1.1, 1.1, WHITE, 0.7);
    }

    drawCat(put, a) {
        const c = this.sim.cat;
        if (c.state === "off" || c.state === "omen") return;
        const x = lerp(c.px, c.x, a), z = lerp(c.pz, c.z, a), yaw = c.yaw, w = c.walk ?? 0;
        const crouch = c.state === "crouch" ? 1 : c.state === "land" ? clamp(c.t / 1.2, 0, 1) * 0.8 : 0;
        const wig = c.state === "crouch" ? Math.sin(this.t * 24) * 0.12 : 0;
        const lift = c.y, S = 1, dy = lift - crouch * 0.95;
        const stretch = c.state === "pounce" ? 1.2 : 1;
        put("cat_body", x, dy, z, yaw, S * stretch, S * (1 - crouch * 0.18), S, WHITE, c.state === "pounce" ? 0.25 * (c.t / 0.23 - 1) : crouch * 0.06, wig);
        const e = { x, z };
        this.part(put, e, 3.1 * stretch, 3.0 + dy + Math.sin(w * 0.5) * 0.05, 0, "cat_head", yaw, 1.2, 1.2, 1.2, WHITE, 0.55 - crouch * 0.1, Math.sin(w * 0.3) * 0.05, x, z);
        for (const [lx, lz, ph] of [[1.8, 0.9, 0], [1.8, -0.9, Math.PI], [-1.8, 0.9, Math.PI], [-1.8, -0.9, 0]]) {
            const moving = c.state === "stalk" || c.state === "leave" || c.state === "scare";
            const sw = moving ? Math.sin(w * 1.4 + ph) * 0.5 : 0, ext = c.state === "pounce" ? 1.1 : 0;
            this.part(put, e, lx + sw * 1 + (lx > 0 ? ext : -ext), Math.max(0, lift - 0.1 - crouch * 0.2) + (moving ? Math.max(0, Math.cos(w * 1.4 + ph)) * 0.26 : 0), lz, "cat_leg", yaw, 1, 1 - crouch * 0.4, 1, WHITE, 0, 0, x, z);
        }
        for (let i = 0; i < 7; i++) {
            const k = i / 6, swing = Math.sin(this.t * 3 + k * 2.6) * (0.3 + k * 1.2);
            this.part(put, e, -3 - k * 3.1, 2.1 + dy + k * k * 2.6, swing, "cat_tail", yaw, 1 - k * 0.5, 1 - k * 0.5, 1 - k * 0.5, WHITE, 0, 0, x, z);
        }
    }

    drawShots(put, a) {
        const { sim } = this;
        for (const s of sim.shots) {
            const x = lerp(s.px, s.x, a), z = lerp(s.pz, s.z, a), yaw = Math.atan2(s.vz, s.vx);
            if (s.k === "nail") put("nail", x, 0.72, z, yaw, 1.5, 1.5, 1.5, WHITE, 0, 0, { unlit: true, shadow: false });
            else if (s.k === "sock") put("sockball", x, 0.7 + Math.abs(Math.sin(s.spin * 0.4)) * 0.5, z, s.spin, 1, 1, 1, WHITE, s.spin * 0.7);
            else if (s.k === "blade") put("blade", x, 0.6, z, s.spin, 1.2, 1.2, 1.2, WHITE, 0, 0, { unlit: true, shadow: false });
            else put("pellet", x, 0.68, z, s.spin, 1.1, 1.1, 1.1, WHITE, 0, 0, { unlit: true, shadow: false });
        }
        for (const l of sim.lobs) {
            const k = l.t / l.dur, x = lerp(l.x0, l.x1, k), z = lerp(l.z0, l.z1, k), y = 2.6 + Math.sin(k * Math.PI) * 6 - k * 2.4;
            put(l.k === "block" ? "toyblock" : "hairball", x, y, z, l.spin + k * 6, 1.2, 1.2, 1.2, WHITE, k * 5);
        }
    }

    drawMotes(put, a) {
        const m = this.sim.motes, col = { r: 1, g: 1, b: 1, a: 1 };
        for (let i = 0; i < m.length; i++) {
            const q = m[i], x = lerp(q.px, q.x, a), z = lerp(q.pz, q.z, a), s = 1 + (q.val - 1) * 0.35;
            put("mote", x, 0.14 + Math.sin(this.t * 3 + q.seed * 9) * 0.05, z, q.seed * 6, s, s, s, col, 0, 0, { unlit: true, shadow: false });
        }
    }

    drawPickups(put) {
        for (const k of this.sim.pickups) {
            const y = 0.9 + Math.sin(this.t * 3 + k.x) * 0.16, yaw = this.t * 1.8, born = Math.min(1, k.t * 3);
            const tint = k.life !== null && k.life < 3 && Math.floor(this.t * 8) % 2 ? { r: 1.8, g: 1.8, b: 1.8, a: 1 } : WHITE;
            if (k.k === "weapon") put(`w_${k.w}`, k.x, y, k.z, yaw, 1.9 * born, 1.9 * born, 1.9 * born, tint, 0, 0, { shine: 0.6 });
            else put("battery", k.x, y - 0.3, k.z, yaw, 1.5 * born, 1.5 * born, 1.5 * born, tint, 0, 0, { shine: 0.6 });
        }
    }

    drawHazards(put, a) {
        for (const h of this.sim.hazards) {
            if (h.kind === "soap") put("soap", h.x, 0.04, h.z, h.spin ?? 0, 1, 1, 1, WHITE, 0, 0, { shine: 0.8 });
            else if (h.kind === "bricks") {
                const cols = BRICKS;
                for (const b of h.items) if (b.live) put("brick", b.x, 0.03, b.z, b.yaw, 1, 1, 1, cols[b.c]);
            } else if (h.kind === "train") {
                h.points.forEach((c, i) => { if (c.px !== undefined) put(i === 0 ? "loco" : "traincar", lerp(c.px, c.x, a), 0.02, lerp(c.pz, c.z, a), c.yaw, 1, 1, 1); });
            }
        }
    }

    // --- 2D over the 3D -----------------------------------------------------------------------
    worldCircle(d, x, z, r, col, o = {}) {
        const n = o.n ?? 26, pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * TAU; this.proj(x + Math.cos(a) * r, o.y ?? 0.04, z + Math.sin(a) * r); pts.push([this.rx, this.rz]); }
        if (o.fill !== undefined) d.poly(pts, { color: col, opacity: o.fill });
        if (o.width) for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; d.line(a, b, { width: o.width, color: col, opacity: o.a ?? 1 }); }
    }
    worldLine(d, x0, z0, x1, z1, y, width, col, a = 1) {
        this.proj(x0, y, z0); const ax = this.rx, ay = this.rz;
        this.proj(x1, y, z1);
        d.line([ax, ay], [this.rx, this.rz], { width, color: col, opacity: a });
    }
    worldRect(d, x0, z0, x1, z1, col, op) {
        const p = [];
        for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) { this.proj(x, 0.04, z); p.push([this.rx, this.rz]); }
        d.poly(p, { color: col, opacity: op });
    }

    draw2D(d) {
        const { sim, t } = this;
        this.prepareProject();
        const u = this.unitScale();
        // Telegraphs live on the floor, so they read first.
        for (const h of sim.hazards) {
            if (h.kind === "cord") {
                const k = h.active ? 1 : h.warn ? h.phaseK : 0;
                if (k > 0) {
                    const blink = h.active ? 1 : Math.floor(t * 12) % 2 ? 0.75 : 0.28;
                    d.additive(() => this.worldLine(d, h.a[0], h.a[1], h.b[0], h.b[1], 0.1, (h.active ? 16 : 7) * u / 14, h.active ? "#bfefff" : "#58c8ff", blink));
                }
            }
            if (h.kind === "jet" && (h.warn || h.active)) {
                const col = h.tint === "fire" ? "#ff6a2a" : "#ffffff";
                this.worldRect(d, h.x0, h.z0, h.x1, h.z1, col, h.active ? 0.22 : 0.1 + 0.16 * (Math.floor(t * 10) % 2));
            }
            if (h.kind === "vortex" && (h.warn || h.active)) this.worldCircle(d, h.x, h.z, h.r * (h.active ? 1 : 0.8 + 0.2 * h.phaseK), "#8fe2f0", { width: 2, a: 0.7 });
            if (h.kind === "wind" && h.warn) this.worldRect(d, h.x0, h.z0, h.x1, h.z1, "#ffffff", 0.08);
        }
        for (const l of sim.lobs) {
            const k = l.t / l.dur;
            this.worldCircle(d, l.x1, l.z1, l.r, "#ff5a4a", { fill: 0.13 + k * 0.2, width: 2.2, a: 0.9 });
            this.worldCircle(d, l.x1, l.z1, l.r * k, "#ffd0a0", { width: 2, a: 0.8 });
        }
        for (const r of sim.rings) this.worldCircle(d, r.x, r.z, r.r, "#ff8aa8", { width: 5, a: 0.9, n: 40 });
        const c = sim.cat;
        if (c.state === "crouch" || c.state === "pounce") {
            const locked = c.state === "pounce" || c.t <= 0.38, pulse = 1 + Math.sin(t * 30) * 0.05;
            this.worldCircle(d, c.tx, c.tz, 2.5 * pulse, locked ? "#ff3a2a" : "#d8ff4a", { fill: locked ? 0.3 : 0.14, width: 3, a: 1 });
        }
        for (const e of sim.foes) {
            if (e.k === "puff" && e.state === "fuse") this.worldCircle(d, e.x, e.z, 2.7, "#9fe8ff", { fill: 0.09, width: 1.6, a: 0.8, n: 18 });
            if (e.k === "snake" && e.state === "coil") { const L = 6.4; this.worldLine(d, e.x, e.z, e.x + Math.cos(e.lockYaw) * L, e.z + Math.sin(e.lockYaw) * L, 0.05, 5, "#ff5a4a", 0.35); }
            if (e.k === "trike" && e.state === "bell") {
                const L = 26, cx = Math.cos(e.lockYaw), sz = Math.sin(e.lockYaw), n = -sz * 1.5, m = cx * 1.5;
                const pts = [[e.x + n, e.z + m], [e.x - n, e.z - m], [e.x - n + cx * L, e.z - m + sz * L], [e.x + n + cx * L, e.z + m + sz * L]].map(([x, z]) => { this.proj(x, 0.04, z); return [this.rx, this.rz]; });
                d.poly(pts, { color: "#ff4a3a", opacity: 0.2 + 0.1 * Math.sin(t * 22) });
            }
        }
        for (const m of this.marks) {
            const k = m.t / m.life;
            if (m.kind === "ring") this.worldCircle(d, m.x, m.z, lerp(m.r0, m.r1, 1 - (1 - k) * (1 - k)), m.col, { width: 3.5 * (1 - k) + 0.5, a: m.a * (1 - k), n: 24 });
            else if (m.kind === "tele") this.worldCircle(d, m.x, m.z, m.r0, m.col, { fill: 0.16 * k + 0.08, width: 2, a: 0.8 });
        }
        // Pickup beacons, and the charge ring.
        for (const k of sim.pickups) {
            this.proj(k.x, 0.1, k.z);
            d.sprite("ring", { x: this.rx, y: this.rz, width: u * 2.6, height: u * 1.6, color: k.k === "weapon" ? "#ffd24d" : "#2bd17e", opacity: 0.55 + Math.sin(t * 5) * 0.25 });
        }
        const p = sim.p;
        if (p.charging) {
            const R = p.suck, spin = t * 5;
            this.worldCircle(d, p.x, p.z, R, "#7fffe9", { width: 2, a: 0.32 + 0.3 * p.charge, n: 36 });
            for (let i = 0; i < 3; i++) {
                const k = ((t * 1.6 + i / 3) % 1), r = R * (1 - k);
                this.worldCircle(d, p.x, p.z, r, "#ffffff", { width: 1.5, a: k * 0.4, n: 22 });
            }
            this.proj(p.x, 0.5, p.z);
            const px = this.rx, py = this.rz;
            for (let i = 0; i < 28; i++) {
                if (i / 28 > p.charge) break;
                const a0 = i / 28 * TAU - Math.PI / 2, a1 = (i + 0.7) / 28 * TAU - Math.PI / 2, r = u * 1.15;
                d.line([px + Math.cos(a0) * r, py + Math.sin(a0) * r * 0.75], [px + Math.cos(a1) * r, py + Math.sin(a1) * r * 0.75], { width: 4, color: p.charge >= 1 ? "#7fffe9" : "#ffd24d" });
            }
        }
        if (Math.abs(p.spin) > p.stats.whirlAt && sim.phase !== "dead") {
            const r = p.stats.reach + 0.6;
            this.worldCircle(d, p.x, p.z, r, "#ffb347", { width: 3, a: Math.min(0.7, (Math.abs(p.spin) - p.stats.whirlAt) * 0.05), y: 0.3, n: 26 });
        }
        // Soft sprites: smoke below, fire above.
        for (let pass = 0; pass < 2; pass++) {
            const draw = () => {
                // One batch per texture, so a storm of particles stays a handful of draw calls.
                for (const tex of SPRITE_TEX) {
                    let put = null;
                    for (const q of this.sprites) {
                        if (q.tex !== tex || !!q.add !== (pass === 1)) continue;
                        put ??= d.quads(tex);
                        const k = q.life / q.max;
                        this.proj(q.x, q.y, q.z);
                        const size = (q.size + (1 - k) * (q.grow ?? 0) * q.size) * u * 2.2, op = (q.a ?? 1) * Math.min(1, k * 2.2);
                        const c = rgb(q.col);
                        if (q.along) put(this.rx, this.rz, size * 1.4, size * 0.4, Math.atan2(q.vz - q.vy * 0.4, q.vx), 0, c[0], c[1], c[2], op);
                        else put(this.rx, this.rz, size, size, q.rot ?? 0, 0, c[0], c[1], c[2], op);
                    }
                }
                // Lamps and eyes, a touch of glow.
                if (pass === 1) {
                    for (const m of this.marks) {
                        if (m.kind !== "bolt") continue;
                        this.proj(m.x, 0.5, m.z); const ax = this.rx, ay = this.rz;
                        this.proj(m.x1, 0.5, m.z1);
                        d.line([ax, ay], [this.rx, this.rz], { width: 3, color: m.col, opacity: m.a });
                    }
                    if (p.coneOn) {
                        const yaw = Math.atan2(p.aimZ, p.aimX);
                        this.proj(p.x + Math.cos(yaw), 0.6, p.z + Math.sin(yaw));
                        d.sprite("soft", { x: this.rx, y: this.rz, width: u * 2, height: u * 2, color: p.coneOn === "dryer" ? "#ffb060" : "#c8ffd0", opacity: 0.6 });
                    }
                }
            };
            if (pass === 1) d.additive(draw); else draw();
        }
        // Exit labels.
        if ((sim.phase === "exit" || sim.phase === "transit") && sim.exits) {
            for (const ex of sim.exits) {
                this.proj(ex.x, 1.6, ex.z + 0.4);
                const room = ROOMS[ex.name];
                const y = this.rz - 16 + Math.sin(t * 4) * 3;
                const w = Math.max(84, room.name.length * 9.5 + 18);
                d.rect(w, 28, { x: this.rx, y, color: room.accent, radius: 8 });
                d.rect(w, 28, { x: this.rx, y, color: "#1b1420", radius: 8, outline: 2 });
                d.text(room.name, { x: this.rx, y, size: 13, bold: true, color: "#ffffff" });
                d.poly([[this.rx - 8, y + 16], [this.rx + 8, y + 16], [this.rx, y + 26]], { color: room.accent });
                this.proj(ex.x, 0.05, ex.z + 1.4);
                d.sprite("ring", { x: this.rx, y: this.rz, width: u * 3.6, height: u * 2.2, color: "#ffd24d", opacity: 0.6 + Math.sin(t * 6) * 0.3 });
            }
        }
        // Boss's bell ring, and floating numbers.
        for (const q of this.pops) {
            const k = q.t / q.life, sc = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
            this.proj(q.x, 1.2 + k * 1.6, q.z);
            const op = k > 0.7 ? (1 - k) / 0.3 : 1;
            this.stick(d, q.text, this.rx, this.rz, q.size * sc, q.col, op);
        }
    }

    stick(d, str, x, y, size, col, opacity = 1) {
        const w = Math.max(1, size * 0.09), ink = "#1b1420";
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.78; d.text(str, { x: x + Math.cos(a) * w, y: y + Math.sin(a) * w, size, bold: true, color: ink, opacity, font: FONT }); }
        d.text(str, { x, y, size, bold: true, color: col, opacity, font: FONT });
    }

    /** Project for HUD use. */
    screen(x, y, z) { this.prepareProject(); this.proj(x, y, z); return [this.rx, this.rz]; }
    /** Pointer to the floor. */
    floorAt(px, py) {
        const r = this.s.cam3.ray(px, py), o = r.origin, dr = r.dir;
        if (Math.abs(dr.y) < 1e-4) return null;
        const t = (0.4 - o.y) / dr.y;
        return [o.x + dr.x * t, o.z + dr.z * t];
    }
}
const SPRITE_TEX = ["puff", "lint", "spark", "flame", "soft"];
const RGB = new Map();
const rgb = (h) => { let c = RGB.get(h); if (!c) { c = hex(h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h); RGB.set(h, c); } return c; };
const BRICKS = [{ r: 0.91, g: 0.34, b: 0.25, a: 1 }, { r: 0.25, g: 0.55, b: 1, a: 1 }, { r: 1, g: 0.82, b: 0.3, a: 1 }, { r: 0.25, g: 0.75, b: 0.45, a: 1 }];
export const FONT = '"Arial Rounded MT Bold","Nunito","Baloo 2",ui-rounded,system-ui,sans-serif';
