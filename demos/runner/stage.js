// Draws a run. The road bends down and sideways with distance, so patterns rise over a hill and the straight road never
// looks straight; the first stretch stays flat so what the player judges is exactly what the sim tests. Slices,
// obstacles, eggs and sparks are all pools: nothing is created while running.
import { mesh, pos, color } from "./pogo.js";
import { BIOMES, DISGUISES, ROUTE, biomeIndex } from "./data.js";
import { laneX } from "./sim.js";
import { SLICE, VARIANTS } from "./scenery.js";
import { OstrichRig, FarmerRig } from "./rig.js";

const FLAT = 24, DROP = 0.00085, VIEW = 150;
const SKIES = {
    farm: { top: "#3ba6e6", bot: "#ffeec0", fog: "#fbedc4", sun: [0.74, 0.64, 0.5], sky: [0.56, 0.6, 0.68], gnd: [0.42, 0.36, 0.28], cloud: [1.1, 1.05, 1] },
    village: { top: "#59b5e8", bot: "#ffdcae", fog: "#fbe0b8", sun: [0.78, 0.62, 0.46], sky: [0.58, 0.58, 0.66], gnd: [0.44, 0.34, 0.27], cloud: [1.1, 1.0, 0.95] },
    motorway: { top: "#3f9bd8", bot: "#ffc98a", fog: "#fbd2a0", sun: [0.82, 0.6, 0.42], sky: [0.54, 0.55, 0.66], gnd: [0.42, 0.33, 0.26], cloud: [1.15, 0.98, 0.85] },
    airport: { top: "#2f9fe0", bot: "#e6f5ff", fog: "#e2f0f8", sun: [0.7, 0.67, 0.58], sky: [0.58, 0.62, 0.7], gnd: [0.42, 0.42, 0.4], cloud: [1.1, 1.1, 1.1] },
    ski: { top: "#2a8fe6", bot: "#d8efff", fog: "#e6f4ff", sun: [0.48, 0.47, 0.45], sky: [0.66, 0.72, 0.82], gnd: [0.52, 0.56, 0.64], cloud: [1.1, 1.1, 1.14] },
    launch: { top: "#3a2a86", bot: "#ff9a62", fog: "#f7a878", sun: [0.76, 0.56, 0.44], sky: [0.56, 0.52, 0.68], gnd: [0.44, 0.33, 0.32], cloud: [1.2, 0.8, 0.82] },
};
const FARMER_RIDES = [null, null, "tractor", "cart", "skis", "rocket"];
const hexRGB = (h) => { const c = color(h); return [c.r, c.g, c.b]; };
for (const k of Object.values(SKIES)) { k.topC = hexRGB(k.top); k.botC = hexRGB(k.bot); k.fogC = hexRGB(k.fog); }
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const toHex = (c) => color([Math.min(1, c[0]), Math.min(1, c[1]), Math.min(1, c[2])]).toHex();

const hash = (n) => { let t = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); t ^= t >>> 13; t = Math.imul(t, 0xc2b2ae35); return ((t ^ (t >>> 16)) >>> 0) / 4294967296; };

export class Stage {
    constructor(game, s, names, skin) {
        this.game = game; this.s = s; this.names = names;
        this.d = 0; this.lapStart = 0; this.cx = 0; this.t = 0; this.speed = 0;
        this.back = 42;      // Metres of road kept behind the bird, for the title and end cameras.
        const light = s.light;
        light.dir.set(0.5, -1, -0.5);
        light.shadows = true; light.shadowRange = 30; light.softShadows = false;
        light.fog = { color: color("#fbedc4"), near: 62, far: 150 };
        const cam = s.cam3; cam.fovAxis = "vertical"; cam.near = 0.5; cam.far = 460;
        this.mood = 0; this.moodFrom = 0; this.moodT = 1;
        // Sky props first, so transparent sorting has nothing else to think about.
        this.sun = s.add([mesh("quad", { texture: "sunglow", unlit: true, shadow: false }), pos(-58, 40, -360)]);
        this.sun.scale.set(120, 120, 1); this.sun.opacity = 0.99;
        this.bdA = s.add([mesh("bd_farm", { unlit: true, shadow: false }), pos(0, -6, -335)]);
        this.bdB = s.add([mesh("bd_farm", { unlit: true, shadow: false }), pos(0, -6, -325)]); this.bdB.hidden = true;
        this.clouds = [];
        for (let i = 0; i < 6; i++) {
            const c = s.add([mesh("cloud", { unlit: true, shadow: false }), pos(-190 + i * 76, 66 + hash(i) * 60, -300 + hash(i + 9) * 50)]);
            c.scale.set(4 + hash(i + 3) * 5, 2.6 + hash(i + 5) * 2.4, 2);
            this.clouds.push(c);
        }
        this.slots = [];
        const count = Math.ceil((VIEW + 90) / SLICE);
        for (let i = 0; i < count; i++) {
            const e = s.add([mesh(names.farm[0], { shadow: false }), pos(0, 0, 0)]);
            e.sliceIdx = null; this.slots.push(e);
        }
        this.bigRocket = s.add([mesh("big_rocket", { shadow: false, shine: 0.2 }), pos(0, 0, 0)]);
        this.bigRocket.hidden = true;
        this.free = []; this.live = new Set();
        this.eggViews = []; this.eggFree = [];
        for (let i = 0; i < 80; i++) { const e = s.add([mesh("egg", { shine: 0.75, shadow: false }), pos(0, 0, 0)]); e.hidden = true; e.scale = 1.25; this.eggFree.push(e); }
        this.pickViews = [];
        for (let i = 0; i < 3; i++) {
            const e = s.add([mesh("p_moustache", { shadow: false, shine: 0.3 }), pos(0, 0, 0)]), r = s.add([mesh("ring", { unlit: true, shadow: false }), pos(0, 0, 0)]);
            e.hidden = r.hidden = true; e.ringE = r; e.pick = null; this.pickViews.push(e);
        }
        this.fx = []; this.fxNext = 0;
        for (let i = 0; i < 90; i++) { const e = s.add([mesh("feather", { shadow: false, unlit: true }), pos(0, 0, 0)]); e.hidden = true; e.life = 0; this.fx.push(e); }
        this.rig = new OstrichRig(s, skin);
        this.farmer = new FarmerRig(s);
        this.applyMood(0, 1);
    }
    /** The sun swings round behind the camera when we look at Keith's face. */
    faceLight(front) { if (front) this.s.light.dir.set(-0.55, -1, 0.6); else this.s.light.dir.set(0.5, -1, -0.5); }
    /** Ahead-of-bird distance to a spot on the bent road. */
    bendY(a) { const u = Math.max(0, a - FLAT); return -DROP * u * u; }
    bendX(a) { const u = Math.max(0, a - FLAT); return this.cx * u * u; }
    slopeY(a) { const u = Math.max(0, a - FLAT); return -2 * DROP * u; }
    slopeX(a) { const u = Math.max(0, a - FLAT); return 2 * this.cx * u; }
    /** Put something on the road: ahead metres in front, x across, y up. */
    put(e, a, x = 0, y = 0, yaw = 0) {
        const sx = this.slopeX(a), sy = this.slopeY(a);
        e.pos.set(x + this.bendX(a), y + this.bendY(a), -a);
        e.rot.x = Math.atan(sy); e.rot.y = yaw + Math.atan(sx) * -1 * -1;
    }
    applyMood(i, t) {
        const a = SKIES[BIOMES[this.moodFrom].id], b = SKIES[BIOMES[i].id], s = this.s;
        const top = lerp3(a.topC, b.topC, t), bot = lerp3(a.botC, b.botC, t), fog = lerp3(a.fogC, b.fogC, t);
        s.background = [toHex(top), toHex(bot)];
        const L = s.light;
        L.fog.color.r = fog[0]; L.fog.color.g = fog[1]; L.fog.color.b = fog[2];
        const sun = lerp3(a.sun, b.sun, t), sky = lerp3(a.sky, b.sky, t), gnd = lerp3(a.gnd, b.gnd, t), cl = lerp3(a.cloud, b.cloud, t);
        L.color.r = sun[0]; L.color.g = sun[1]; L.color.b = sun[2];
        L.sky.r = sky[0]; L.sky.g = sky[1]; L.sky.b = sky[2];
        L.ground.r = gnd[0]; L.ground.g = gnd[1]; L.ground.b = gnd[2];
        for (const c of this.clouds) c.color = toHex(cl);
    }
    setMood(i, instant) {
        if (i === this.mood && !instant) return;
        this.moodFrom = instant ? i : this.mood; this.mood = i; this.moodT = instant ? 1 : 0;
        const name = `bd_${BIOMES[i].id}`;
        const swap = (e) => { e.mesh = name; e.size.set(this.game.assets.geometry(name).natural); };
        if (instant) { swap(this.bdA); this.bdB.hidden = true; this.applyMood(i, 1); }
        else { swap(this.bdB); this.bdB.hidden = false; this.bdB.opacity = 0; }
        this.farmer.setVehicle(FARMER_RIDES[i]);
    }
    /** Which mesh a road slice wears. Pure, so any seek or restart lands on the same road. */
    sliceMesh(idx) {
        const lap = idx * SLICE - this.lapStart;
        const end = lap + SLICE;
        for (let i = 1; i < BIOMES.length; i++) if (BIOMES[i].start >= lap && BIOMES[i].start < end) return `g_${BIOMES[i - 1].id}`;
        const list = this.names[BIOMES[biomeIndex(Math.max(0, Math.min(ROUTE + 400, lap)))].id];
        let v = Math.floor(hash(idx) * VARIANTS);
        if (v === Math.floor(hash(idx - 1) * VARIANTS)) v = (v + 1) % VARIANTS;   // Landmarks never appear twice running.
        return list[v];
    }
    resetRun(d, lapStart) {
        this.d = d; this.lapStart = lapStart;
        for (const e of this.slots) e.sliceIdx = null;
        for (const ob of [...this.live]) this.release(ob);
        for (const e of this.eggViews) { e.hidden = true; if (e.egg) e.egg.view = null; e.egg = null; this.eggFree.push(e); }
        this.eggViews.length = 0;
        for (const e of this.pickViews) { e.hidden = e.ringE.hidden = true; if (e.pick) e.pick.view = null; e.pick = null; }
        for (const f of this.fx) { f.hidden = true; f.life = 0; }
        this.setMood(biomeIndex(d - lapStart), true);
    }
    acquire(name) {
        const list = this.free;
        let i = list.findIndex((e) => e.mesh === name);
        if (i < 0) i = list.length ? 0 : -1;
        const e = i >= 0 ? list.splice(i, 1)[0] : this.s.add([mesh(name, { shadow: true }), pos(0, 0, 0)]);
        if (e.mesh !== name) { e.mesh = name; e.size.set(this.game.assets.geometry(name).natural); }
        e.hidden = false; e.scale = 1; e.rot.set(0, 0, 0); e.opacity = 1;
        return e;
    }
    obView(run, ob) {
        const id = BIOMES[biomeIndex(ob.d - run.lapStart)].id;
        const v = { e: this.acquire(ob.kind === "c" && id === "farm" && ob.id % 3 === 0 ? "chicken" : `ob_${id}_${ob.kind}`), tail: null, ob, tumble: null };
        v.chick = v.e.mesh === "chicken";
        if (v.chick) v.e.scale = 2;
        if (ob.kind === "L") v.tail = this.acquire(`ob_${id}_Lb`);
        if (ob.kind === "v") v.e.rot.y = 0;
        ob.view = v;
        this.live.add(ob);
    }
    release(ob) {
        const v = ob.view; if (!v) return;
        v.e.hidden = true; this.free.push(v.e);
        if (v.tail) { v.tail.hidden = true; this.free.push(v.tail); }
        ob.view = null; this.live.delete(ob);
    }
    /** Knock a thing off the road. */
    tumble(ob, dir = 0) { if (ob.view) ob.view.tumble = { vy: 11, vx: dir * 5 + (ob.id % 2 ? 4 : -4), vz: 8, rx: 7, rz: ob.id % 2 ? 6 : -6, y: 0, x: 0, z: 0, t: 0 }; }

    /** One step of drawing state. run may be null on the title. */
    update(dt, run, st = {}) {
        this.t += dt;
        const s = this.s;
        if (run) { this.d = run.d; this.lapStart = run.lapStart; this.speed = run.state === "run" ? run.speed : this.speed * Math.pow(0.04, dt); }
        const d = this.d;
        this.cx = (Math.sin(d / 190) * 0.65 + Math.sin(d / 83 + 1) * 0.35) * 0.00085;
        // Slices.
        const first = Math.floor((d - this.back) / SLICE), n = this.slots.length;
        for (let k = 0; k < n; k++) {
            const idx = first + k, e = this.slots[((idx % n) + n) % n];
            if (e.sliceIdx !== idx) {
                e.sliceIdx = idx;
                const name = this.sliceMesh(idx);
                if (e.mesh !== name) { e.mesh = name; e.size.set(this.game.assets.geometry(name).natural); }
                e._new = true;
            }
            const a0 = idx * SLICE - d, a1 = a0 + SLICE, y0 = this.bendY(a0), y1 = this.bendY(a1), x0 = this.bendX(a0), x1 = this.bendX(a1);
            const px = (x0 + x1) / 2, py = (y0 + y1) / 2, pz = -(a0 + a1) / 2;
            if (e._new) { e.teleport(px, py, pz); e._new = false; } else e.pos.set(px, py, pz);
            e.rot.x = Math.atan((y1 - y0) / SLICE);
            e.rot.y = Math.atan((x1 - x0) / SLICE);
        }
        if (this.moodT < 1) {
            this.moodT = Math.min(1, this.moodT + dt / 2.4);
            this.applyMood(this.mood, this.moodT);
            this.bdB.opacity = this.moodT >= 1 ? 1 : this.moodT;
            if (this.moodT >= 1) { const name = this.bdB.mesh; this.bdA.mesh = name; this.bdA.size.set(this.game.assets.geometry(name).natural); this.bdB.hidden = true; }
        }
        // The big rocket rises over the hill at the end of the route.
        const rocketA = this.lapStart + ROUTE + 52 - d;
        const R = this.bigRocket;
        if (st.rocketLift === undefined) {
            R.hidden = rocketA > 420 || rocketA < -60;
            if (!R.hidden) { this.put(R, rocketA, 0, 0); R.rot.x *= 0.25; }
        } else { R.hidden = false; R.pos.set(0, st.rocketLift, -rocketA); R.rot.x = 0; R.rot.y = 0; }

        if (run) this.drawThings(dt, run);
        for (const c of this.clouds) { c.pos.x += dt * 2.2; if (c.pos.x > 240) c.pos.x = -240; }
        this.bdA.pos.x = this.bdB.pos.x = Math.sin(d / 400) * 16;
        this.stepFx(dt);
    }
    drawThings(dt, run) {
        const d = run.d, t = this.t;
        for (const ob of run.obstacles) {
            if (ob.view || ob.dead) { continue; }
            const at = run.obD(ob);
            if (at - d < VIEW + 20 && at + ob.len - d > -9) this.obView(run, ob);
            else if (at - d >= VIEW + 20 && !ob.v) break;
        }
        for (const ob of [...this.live]) {
            const v = ob.view, at = run.obD(ob), a = at - d;
            if (a + ob.len < -this.back + 28 && !v.tumble) { this.release(ob); continue; }
            const x = laneX(ob.lane);
            if (v.tumble) {
                const u = v.tumble; u.t += dt; u.vy -= 30 * dt; u.y += u.vy * dt; u.x += u.vx * dt; u.z += u.vz * dt;
                v.e.pos.set(x + u.x, u.y, -a + u.z);
                v.e.rot.x += u.rx * dt; v.e.rot.z += u.rz * dt;
                if (v.tail) v.tail.hidden = true;
                if (u.t > 0.9) this.release(ob);
                continue;
            }
            if (ob.dead) { this.release(ob); continue; }
            this.put(v.e, a, x, 0, ob.v && v.e.mesh.endsWith("_v") ? 0 : 0);
            if (v.chick) { v.e.pos.y += Math.abs(Math.sin(t * 9 + ob.id)) * 0.3; v.e.rot.y = Math.sin(t * 3 + ob.id) * 0.7; }
            if (ob.kind === "v") v.e.pos.y += Math.sin(t * 16) * 0.02;
            if (v.tail) {
                const headLen = 3;
                const bodyLen = Math.max(0.5, ob.len - headLen);
                this.put(v.tail, a + headLen + bodyLen / 2, x, 0);
                v.tail.scale.set(1, 1, bodyLen);
            }
        }
        // Eggs.
        const views = this.eggViews;
        for (let i = views.length - 1; i >= 0; i--) {
            const e = views[i], g = e.egg, a = g.d - d;
            if (g.got || a < -7) {
                e.hidden = true; g.view = null; e.egg = null;
                this.eggFree.push(e); views[i] = views[views.length - 1]; views.pop();
                continue;
            }
            this.put(e, a, g.x, g.y + 0.55 + Math.sin(t * 5 + g.id) * 0.1);
            e.rot.y = t * 3.4 + g.id;
            e.rot.z = 0.3;
        }
        for (const g of run.eggs) {
            const a = g.d - d;
            if (a > VIEW - 6) { if (!g.sky) break; continue; }
            if (g.got || g.view || a < -7 || !this.eggFree.length) continue;
            const e = this.eggFree.pop();
            g.view = e; e.egg = g; e.hidden = false; views.push(e);
            this.put(e, a, g.x, g.y + 0.55); e.teleport(e.pos.x, e.pos.y, e.pos.z);
        }
        // Disguise pickups: the showpiece of the road.
        for (const k of run.pickups) {
            if (k.got || k.view) continue;
            const a = k.d - d;
            if (a > VIEW || a < -6) continue;
            const e = this.pickViews.find((v) => !v.pick);
            if (!e) break;
            e.pick = k; k.view = e;
            const name = `p_${k.kind}`;
            e.mesh = name; e.size.set(this.game.assets.geometry(name).natural);
            e.hidden = e.ringE.hidden = false;
        }
        for (const e of this.pickViews) {
            const k = e.pick; if (!k) continue;
            const a = k.d - d;
            if (k.got || a < -6) { e.pick = null; k.view = null; e.hidden = e.ringE.hidden = true; continue; }
            const bob = Math.sin(t * 3) * 0.14;
            this.put(e, a, laneX(k.lane), 1.5 + bob);
            e.rot.y += t * 2.1;
            e.scale = 0.9 + Math.sin(t * 6) * 0.05;
            this.put(e.ringE, a, laneX(k.lane), 2.1 + bob);
            e.ringE.rot.z = t * 0.9;
            e.ringE.scale = 1 + Math.sin(t * 6) * 0.05;
        }
    }
    /** A bit of the world flung about. o: { mesh, x, y, a, vx, vy, vz, color, life, size, grav, world } */
    spark(o) {
        const f = this.fx[this.fxNext = (this.fxNext + 1) % this.fx.length];
        const name = o.mesh ?? "chip";
        if (f.mesh !== name) { f.mesh = name; f.size.set(this.game.assets.geometry(name).natural); }
        f.teleport(o.x, o.y, -(o.a ?? 0));
        f.vx = o.vx ?? 0; f.vy = o.vy ?? 0; f.vz = o.vz ?? 0; f.grav = o.grav ?? 18;
        f.life = f.max = o.life ?? 0.7; f.base = o.size ?? 0.3; f.color = o.color ?? "#ffffff"; f.hidden = false;
        f.spin = (o.spin ?? 8) * (this.game.fxRng.next() - 0.5) * 2; f.moving = o.world !== false;
        f.rot.set(this.game.fxRng.next() * 6, this.game.fxRng.next() * 6, this.game.fxRng.next() * 6);
        f.airDrag = o.drag ?? 0;
        f.scale = f.base;
    }
    burst(n, o) {
        const r = this.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = r.next() * 6.283, sp = (o.speed ?? 8) * (0.5 + r.next() * 0.7), up = o.up ?? 8;
            const col = Array.isArray(o.colors) ? o.colors[Math.floor(r.next() * o.colors.length)] : o.colors;
            this.spark({ ...o, color: col, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp + (o.vz ?? 0), vy: up * (0.4 + r.next()), size: (o.size ?? 0.3) * (0.7 + r.next() * 0.6), life: (o.life ?? 0.7) * (0.7 + r.next() * 0.6) });
        }
    }
    stepFx(dt) {
        const v = this.speed;
        for (const f of this.fx) {
            if (f.life <= 0) continue;
            f.life -= dt;
            if (f.life <= 0) { f.hidden = true; continue; }
            f.vy -= f.grav * dt;
            if (f.airDrag) { const k = Math.exp(-f.airDrag * dt); f.vx *= k; f.vy *= k; f.vz *= k; }
            f.pos.x += f.vx * dt; f.pos.y += f.vy * dt; f.pos.z += (f.vz + (f.moving ? v : 0)) * dt;
            if (f.pos.y < 0.05) { f.pos.y = 0.05; f.vy *= -0.3; f.vx *= 0.6; }
            f.rot.x += f.spin * dt; f.rot.z += f.spin * 0.7 * dt;
            const k = f.life / f.max;
            f.scale = f.base * Math.min(1, k * 2.4);
        }
    }
}
export { DISGUISES };
