// The rules of the factory. No drawing and no sound: this file only keeps state and pushes events, so a bot can play it a thousand times a minute.
import { BASEMENT_Y, CELL, FILES, H, MAP, NIGHTS, SPOTS, W } from "./data.js";

const TAU = Math.PI * 2;
export const CONE = 0.36;           // half-angle of the beam, radians
export const RANGE = 15;            // metres at full battery
export const WALK = 2.6, RADIUS = 0.3, EYE = 1.55, DOLL_H = 1.05;
const REACH = 0.72, USE_RANGE = 2.3, BELT_SPEED = 1.1;

const cellAt = (cx, cz) => (cx < 0 || cz < 0 || cx >= W || cz >= H ? "#" : MAP[cz][cx]);
const SOLID = new Set(["#", "W", "s", "p", "m", "k", "o", "b", "e", "L"]);
const SIGHT = new Set(["#", "s", "m", "L", "b"]);
const BELT = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], v: [0, 1] };

export const isSolid = (cx, cz) => SOLID.has(cellAt(cx, cz));
export const blocksSight = (cx, cz) => SIGHT.has(cellAt(cx, cz));
export const beltAt = (cx, cz) => BELT[cellAt(cx, cz)] ?? null;
export const idx = (cx, cz) => cz * W + cx;

export function floorY(x, z) {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL), c = cellAt(cx, cz);
    if (c >= "1" && c <= "4") {           // the stairs run south, and fall smoothly
        const t = (z / CELL - 17) / 4;
        return BASEMENT_Y * Math.max(0, Math.min(1, t));
    }
    if (cz >= 21) return BASEMENT_Y;
    return BELT[c] ? 0.22 : 0;
}

// Doors, by position. dir "x" means the leaf spans x and you pass along z.
export const DOORS = [], LOCKERS = [];
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = MAP[z][x];
    if (c === "D") DOORS.push({ cx: x, cz: z, dir: isSolid(x - 1, z) ? "x" : "z" });
    if (c === "L") {
        const open = [[0, 1], [0, -1], [1, 0], [-1, 0]].find(([a, b]) => !isSolid(x + a, z + b) && cellAt(x + a, z + b) !== "D") ?? [0, 1];
        LOCKERS.push({ cx: x, cz: z, x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, face: open });
    }
}

// Distance fields, one per target cell, built on first use. Doors count as passable: a doll walks to a shut door and waits there.
const FIELDS = new Map();
export function field(cx, cz) {
    const key = idx(cx, cz);
    let f = FIELDS.get(key);
    if (f) return f;
    f = new Int16Array(W * H).fill(-1);
    const q = [key];
    f[key] = 0;
    for (let i = 0; i < q.length; i++) {
        const c = q[i], x = c % W, z = (c - x) / W, d = f[c] + 1;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + a, nz = z + b;
            if (nx < 0 || nz < 0 || nx >= W || nz >= H || isSolid(nx, nz)) continue;
            const n = idx(nx, nz);
            if (f[n] < 0) { f[n] = d; q.push(n); }
        }
    }
    FIELDS.set(key, f);
    return f;
}
export const FLOOR_CELLS = [];
for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) if (!isSolid(x, z)) FLOOR_CELLS.push([x, z]);

function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const spot = (name) => {
    const s = SPOTS[name];
    return { name, label: s.name, x: s.x * CELL, z: s.z * CELL, y: s.y ?? 1, face: s.face ?? null };
};

export class Sim {
    constructor({ night = 0, seed = 1, gentle = false, spectral = false } = {}) {
        this.night = night;
        this.def = NIGHTS[night];
        this.gentle = gentle;
        this.spectral = spectral;           // true on a replay of the last night: the note means something now
        this.rand = mulberry(seed * 7919 + night * 31 + 11);
        this.t = 0;
        this.ev = [];
        this.status = "play";                // play, caught, done, taken
        this.taking = 0;
        const s = SPOTS.start;
        this.p = {
            x: s.x * CELL, z: s.z * CELL, y: 0, yaw: Math.PI / 2, pitch: -0.1, aimYaw: Math.PI / 2, aimPitch: -0.1,
            light: false, battery: 100, hide: -1, step: 0, moving: 0, offFor: 0, stillFor: 0, onBelt: false,
        };
        this.flicker = 0;                     // seconds the torch is forced dark
        this.belt = !!this.def.belt;
        this.danger = 0;
        this.nearest = null;
        this.stare = this.def.stare;
        this.beats = [];
        this.hold = 0;                        // progress on a hold or scan step, 0 to 1
        this.prompt = null;
        this.sweep = null;
        this.fileAt = 0;
        this.fileRead = -1;
        this.doors = DOORS.map((d, i) => ({ ...d, i, open: !this.def.closed.some(([x, z]) => x === d.cx && z === d.cz), jammed: !!this.def.jammed, t: 0 }));
        if (this.def.jammed) for (const d of this.doors) d.open = true;
        this.batteries = this.def.batteries.map((b) => ({ x: b.x * CELL, z: b.z * CELL, taken: false }));
        this.dolls = this.def.dolls.map((d, i) => ({
            i, kind: d.kind, x: d.x * CELL, z: d.z * CELL, y: 0, yaw: this.rand() * TAU, awake: false, wakeAt: d.at, frozen: true, moved: 0,
            lit: false, peek: 0, calm: 0, speed: this.def.speed * (d.kind === "blind" ? 0.75 : 1), wander: null, stuck: 0, pose: 0, poseAt: 0, stepAt: 0, door: null, seen: 0, look: 0,
        }));
        this.zones = (this.def.zones ?? []).map((z) => ({ ...z }));
        this.step = 0;
        this.stepT = 0;
        this.stats = { caught: 0, lit: 0, battery: 0 };
        this.firstDanger = -1;
        this.warnedFor = 0;
        this.begin();
    }

    get current() { return this.def.steps[this.step] ?? null; }

    aim() {
        const p = this.p, c = Math.cos(p.aimPitch);
        return [-Math.sin(p.aimYaw) * c, Math.sin(p.aimPitch), -Math.cos(p.aimYaw) * c];
    }
    eye() {
        return [this.p.x, this.p.y + EYE, this.p.z];
    }
    /** A clear straight line on the map between two points. */
    sees(ax, az, bx, bz) {
        const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), n = Math.ceil(len / 0.4);
        for (let i = 1; i < n; i++) {
            const t = i / n, x = ax + dx * t, z = az + dz * t, cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
            if (blocksSight(cx, cz)) return false;
            const c = cellAt(cx, cz);
            if (c === "D" && !this.doorAt(cx, cz).open) return false;
        }
        return true;
    }
    doorAt(cx, cz) {
        return this.doors.find((d) => d.cx === cx && d.cz === cz);
    }
    beamOn() {
        return this.p.light && this.p.battery > 0 && this.flicker <= 0 && this.p.hide < 0;
    }
    /** Is this world point inside the cone, in range, with nothing in the way? */
    inBeam(x, y, z, r = 0) {
        if (!this.beamOn()) return false;
        const [ex, ey, ez] = this.eye(), [ax, ay, az] = this.aim();
        const dx = x - ex, dy = y - ey, dz = z - ez, d = Math.hypot(dx, dy, dz);
        if (d > this.range()) return false;
        const cos = (dx * ax + dy * ay + dz * az) / (d || 1), a = Math.acos(Math.min(1, cos));
        return a < CONE + Math.atan2(r, d) && this.sees(ex, ez, x, z);
    }
    range() {
        const b = this.p.battery;
        return RANGE * (b > 25 ? 1 : 0.55 + (b / 25) * 0.45);
    }
    say(text, secs) { this.ev.push({ type: "say", text, secs: secs ?? Math.min(9, 2.2 + text.length * 0.055) }); }

    begin() {
        const st = this.current;
        this.stepT = 0;
        this.hold = 0;
        if (!st) return;
        if (st.say) this.say(st.say);
        if (st.kind === "sweep") {
            this.sweep = { phase: "warn", left: st.warn, secs: st.secs };
            this.ev.push({ type: "whistle" });
        }
        this.ev.push({ type: "step", step: this.step });
        this.beats = (st.beats ?? []).map((b) => ({ at: b[0], act: b.slice(1) })).concat(this.beats);
    }
    advance() {
        const st = this.current;
        for (const a of st.then ?? []) this.act(a);
        this.step++;
        this.ev.push({ type: "tick" });
        if (this.current) this.begin();
    }
    act(a) {
        const [k, x, y] = a;
        if (k === "wake") this.wake(this.dolls[x]);
        else if (k === "say") this.beats.push({ at: this.stepT + 6.5, act: ["sayNow", x] });
        else if (k === "sayNow") this.say(x);
        else if (k === "belt") { this.belt = x; this.ev.push({ type: "belt", on: x }); }
        else if (k === "sound") { const s = spot(y); this.ev.push({ type: "sound", name: x, x: s.x, z: s.z }); }
        else if (k === "stare") this.stare = x;
        else if (k === "flicker") { this.flicker = x; this.ev.push({ type: "flicker", secs: x }); }
        else if (k === "slam") {
            const d = this.doorAt(x, y);
            if (d && d.open) { d.open = false; this.ev.push({ type: "door", d, slam: true }); }
        } else if (k === "found") this.ev.push({ type: "found", what: x });
    }
    wake(d) {
        if (!d || d.awake) return;
        d.awake = true;
        this.ev.push({ type: "wake", d });
    }

    /** One 60th of a second. input: { mx, my, yaw, pitch, light, use, useDown } where mx/my is a stick and light/use are presses. */
    tick(dt, input) {
        if (this.status !== "play") { if (this.status === "taken") this.embrace(dt); return; }
        this.t += dt;
        this.stepT += dt;
        const p = this.p;
        for (const b of this.beats.slice()) {
            if (this.stepT >= b.at) {
                this.beats.splice(this.beats.indexOf(b), 1);
                this.act(b.act);
            }
        }
        for (const d of this.dolls) if (d.wakeAt !== null && this.t >= d.wakeAt) this.wake(d);
        this.flicker = Math.max(0, this.flicker - dt);
        for (const z of this.zones) {
            if (!z.done && Math.floor(p.x / CELL) === z.at[0] && Math.floor(p.z / CELL) === z.at[1]) { z.done = true; this.act(z.act); }
        }

        this.movePlayer(dt, input);
        this.updateLight(dt, input);
        this.updateSweep(dt);
        this.updateDolls(dt);
        this.updateDoors(dt);
        this.updateTask(dt, input);
        this.updateFiles(dt);
        this.updateDanger();
        // The last rule, which the note was always about. Stand still in the dark, on the last night, and don't fight.
        if (this.night === 4 && !p.light && p.offFor >= 4 && p.stillFor >= 3 && p.hide < 0 && this.status === "play") {
            const near = this.dolls.some((d) => d.awake && Math.hypot(d.x - p.x, d.z - p.z) < 3.5);
            if (near) this.yield();
        }
    }
    yield() {
        this.status = "taken";
        this.taking = 0;
        this.ev.push({ type: "taken" });
    }
    embrace(dt) {
        this.taking += dt;
        this.t += dt;
        const p = this.p;
        for (const d of this.dolls) {
            const dist = Math.hypot(d.x - p.x, d.z - p.z);
            if (dist > 0.8) {
                const s = Math.min(1.8, dist) * dt;
                d.x += ((p.x - d.x) / dist) * s;
                d.z += ((p.z - d.z) / dist) * s;
                d.y = floorY(d.x, d.z);
            }
            d.yaw = Math.atan2(p.x - d.x, p.z - d.z);
            d.frozen = dist <= 0.82;
            d.lit = false;
        }
    }

    collide(x, z, r = RADIUS) {
        // Push a circle out of solid cells and shut doors. Returns [x, z].
        const c0 = Math.floor((x - r) / CELL), c1 = Math.floor((x + r) / CELL), r0 = Math.floor((z - r) / CELL), r1 = Math.floor((z + r) / CELL);
        for (let cz = r0; cz <= r1; cz++) for (let cx = c0; cx <= c1; cx++) {
            let x0 = cx * CELL, x1 = x0 + CELL, z0 = cz * CELL, z1 = z0 + CELL;
            const c = cellAt(cx, cz);
            if (c === "D") {
                const d = this.doorAt(cx, cz);
                if (d.open) continue;
                if (d.dir === "x") { z0 += CELL / 2 - 0.15; z1 -= CELL / 2 - 0.15; } else { x0 += CELL / 2 - 0.15; x1 -= CELL / 2 - 0.15; }
            } else if (!SOLID.has(c)) continue;
            const nx = Math.max(x0, Math.min(x, x1)), nz = Math.max(z0, Math.min(z, z1));
            const dx = x - nx, dz = z - nz, d2 = dx * dx + dz * dz;
            if (d2 >= r * r) continue;
            if (d2 > 1e-9) {
                const d = Math.sqrt(d2);
                x = nx + (dx / d) * r;
                z = nz + (dz / d) * r;
            } else {
                const l = x - x0, ri = x1 - x, t = z - z0, b = z1 - z, m = Math.min(l, ri, t, b);
                if (m === l) x = x0 - r; else if (m === ri) x = x1 + r; else if (m === t) z = z0 - r; else z = z1 + r;
            }
        }
        return [x, z];
    }

    movePlayer(dt, input) {
        const p = this.p;
        p.yaw = input.yaw;
        p.pitch = Math.max(-1.25, Math.min(1.25, input.pitch));
        const k = 1 - Math.exp(-dt * 22);
        let dy = p.yaw - p.aimYaw;
        dy = ((dy + Math.PI) % TAU + TAU) % TAU - Math.PI;
        p.aimYaw += dy * k;
        p.aimPitch += (p.pitch - p.aimPitch) * k;
        if (p.hide >= 0) { p.moving = 0; p.stillFor += dt; return; }
        const len = Math.hypot(input.mx, input.my), m = Math.min(1, len);
        let vx = 0, vz = 0;
        if (m > 0.05) {
            const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = -fz, rz = fx;
            const ix = input.mx / Math.max(1, len), iy = -input.my / Math.max(1, len);
            vx = (fx * iy + rx * ix) * WALK;
            vz = (fz * iy + rz * ix) * WALK;
        }
        const speed = Math.hypot(vx, vz);
        p.moving += ((speed / WALK) - p.moving) * Math.min(1, dt * 10);
        p.stillFor = speed > 0.3 ? 0 : p.stillFor + dt;
        const cx = Math.floor(p.x / CELL), cz = Math.floor(p.z / CELL), b = this.belt ? beltAt(cx, cz) : null;
        p.onBelt = !!b;
        if (b) { vx += b[0] * BELT_SPEED; vz += b[1] * BELT_SPEED; }
        const nx = p.x + vx * dt, nz = p.z + vz * dt;
        const [x1, z1] = this.collide(nx, nz);
        p.x = x1; p.z = z1;
        const g = floorY(p.x, p.z);
        p.y += (g - p.y) * Math.min(1, dt * 14);
        if (speed > 0.3) {
            p.step += (speed / WALK) * dt * 1.9;
            if (p.step >= 1) {
                p.step -= 1;
                this.ev.push({ type: "foot", belt: !!beltAt(cx, cz), stair: cz >= 17 && cz <= 20 });
            }
        }
    }

    updateLight(dt, input) {
        const p = this.p;
        if (input.light && p.hide < 0) {
            p.light = !p.light;
            this.ev.push({ type: "click", on: p.light });
        }
        if (p.light && this.beamOn()) {
            p.battery = Math.max(0, p.battery - this.def.drain * dt);
            this.stats.lit += dt;
            if (p.battery === 0) this.ev.push({ type: "dead" });
            if (p.battery < 20 && !this.warnedLow) { this.warnedLow = true; this.ev.push({ type: "low" }); }
            p.offFor = 0;
        } else if (!p.light) {
            p.offFor += dt;
            // A rested battery always comes back a little, so an empty torch is a bad spot and never a dead end.
            if (p.battery < 16) p.battery = Math.min(16, p.battery + 1.1 * dt);
            if (p.battery >= 20) this.warnedLow = false;
        }
        if (p.hide >= 0) p.offFor += dt;
        for (const b of this.batteries) {
            if (!b.taken && Math.hypot(b.x - p.x, b.z - p.z) < 1.4 && Math.abs(floorY(b.x, b.z) - p.y) < 1) {
                b.taken = true;
                p.battery = Math.min(100, p.battery + 50);
                this.stats.battery++;
                this.ev.push({ type: "battery", b });
            }
        }
    }

    updateSweep(dt) {
        const w = this.sweep;
        if (!w) return;
        w.left -= dt;
        // A set piece. While you hold your breath in the locker, one of them stops right outside it.
        if (w.phase === "on" && !this.peeked && this.p.hide >= 0 && w.left < w.secs - 3) {
            this.peeked = true;
            const l = LOCKERS[this.p.hide], d = this.dolls.filter((q) => q.awake).sort((a, b) => Math.hypot(a.x - l.x, a.z - l.z) - Math.hypot(b.x - l.x, b.z - l.z))[0];
            if (d && !this.gentle) {
                d.x = l.x + l.face[0] * 1.75; d.z = l.z + l.face[1] * 1.75; d.y = floorY(d.x, d.z);
                d.yaw = Math.atan2(l.x - d.x, l.z - d.z);
                d.peek = 4.2;
                d.pose = 2;
                this.ev.push({ type: "peek", d });
            } else if (d) this.ev.push({ type: "sound", name: "creep", x: l.x + l.face[0] * 3, z: l.z + l.face[1] * 3 });
        }
        if (w.left > 0) return;
        if (w.phase === "warn") {
            w.phase = "on";
            w.left = w.secs;
            for (const d of this.dolls) this.wake(d);
            this.ev.push({ type: "sweepOn" });
        } else {
            this.sweep = null;
            for (const d of this.dolls) { d.calm = 12; d.peek = 0; d.wander = null; }   // The count is done. They go back to their places, and give you time to step out.
            this.ev.push({ type: "sweepOff" });
            if (this.current?.kind === "sweep") this.advance();
        }
    }

    frozenRule(d) {
        const sweeping = this.sweep?.phase === "on";
        if (sweeping) return false;
        if (d.kind === "blind") return !this.beamOn();
        return d.lit;
    }

    updateDolls(dt) {
        const p = this.p, pcx = Math.floor(p.x / CELL), pcz = Math.floor(p.z / CELL);
        const sweeping = this.sweep?.phase === "on";
        for (const d of this.dolls) {
            d.lit = this.inBeam(d.x, d.y + 0.7, d.z, 0.34) || this.inBeam(d.x, d.y + 0.2, d.z, 0.3);
            if (d.lit) d.seen += dt;
            const cx = Math.floor(d.x / CELL), cz = Math.floor(d.z / CELL);
            const rode = this.belt ? beltAt(cx, cz) : null;
            if (rode) {
                const [x, z] = this.collide(d.x + rode[0] * BELT_SPEED * dt, d.z + rode[1] * BELT_SPEED * dt, 0.2);
                d.x = x; d.z = z;
            }
            const held = !d.awake || this.frozenRule(d);
            if (held !== d.frozen) {
                d.frozen = held;
                if (held && d.awake) { d.pose = (d.pose + 1) % 3; this.ev.push({ type: "freeze", d }); }
            }
            d.y = floorY(d.x, d.z);
            if (d.frozen) continue;
            if (d.peek > 0) { d.peek -= dt; continue; }
            if (d.calm > 0) d.calm -= dt;
            const dist = Math.hypot(p.x - d.x, p.z - d.z);
            let tx = pcx, tz = pcz;
            if (p.hide >= 0 || d.calm > 0) {
                if (!d.wander || (cx === d.wander[0] && cz === d.wander[1])) d.wander = this.farCell(p);
                [tx, tz] = d.wander;
            } else d.wander = null;
            const roaming = p.hide >= 0 || d.calm > 0;
            const f = field(tx, tz), here = f[idx(cx, cz)];
            let gx = 0, gz = 0;
            if (dist < 4 && !roaming && this.sees(d.x, d.z, p.x, p.z)) { gx = p.x; gz = p.z; } else {
                let best = here < 0 ? 9999 : here, bx = cx, bz = cz;
                for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const n = f[idx(cx + a, cz + b)];
                    if (n >= 0 && n < best && !isSolid(cx + a, cz + b)) { best = n; bx = cx + a; bz = cz + b; }
                }
                gx = (bx + 0.5) * CELL;
                gz = (bz + 0.5) * CELL;
                const door = cellAt(bx, bz) === "D" ? this.doorAt(bx, bz) : null;
                if (door && !door.open) {
                    // Against a shut door they wait. From Night 3 they've learned the handle.
                    door.t += dt * 2;
                    d.door = door;
                    if (this.def.doorsOpenAfter && door.t > this.def.doorsOpenAfter) {
                        door.open = true;
                        door.t = 0;
                        this.ev.push({ type: "door", d: door, forced: true });
                    } else if ((d.stepAt -= dt) <= 0) {
                        d.stepAt = 0.7;
                        this.ev.push({ type: "rattle", x: door.cx * CELL + 1, z: door.cz * CELL + 1 });
                    }
                    continue;
                }
            }
            d.door = null;
            const dx = gx - d.x, dz = gz - d.z, l = Math.hypot(dx, dz) || 1;
            let sp = d.speed;
            const pathed = (here < 0 ? 40 : here) * CELL;
            if (pathed > 18) sp *= 1.7;                                // Far stock hurries, so the factory never empties behind you.
            if (sweeping) sp = p.hide >= 0 ? 2.2 : 3.3;
            const [nx, nz] = this.collide(d.x + (dx / l) * sp * dt, d.z + (dz / l) * sp * dt, 0.22);
            d.moved += Math.hypot(nx - d.x, nz - d.z);
            d.x = nx; d.z = nz;
            d.yaw = Math.atan2(p.x - d.x, p.z - d.z);
            if ((d.stepAt -= dt) <= 0) {
                d.stepAt = 0.55 / Math.max(0.6, sp);
                this.ev.push({ type: "creep", d, near: dist });
            }
            if (dist < REACH && !roaming && Math.abs(d.y - p.y) < 1) this.caught(d);
        }
    }
    farCell(p) {
        for (let tries = 0; tries < 12; tries++) {
            const c = FLOOR_CELLS[Math.floor(this.rand() * FLOOR_CELLS.length)];
            if (Math.hypot((c[0] + 0.5) * CELL - p.x, (c[1] + 0.5) * CELL - p.z) > 9) return c;
        }
        return FLOOR_CELLS[0];
    }
    caught(d) {
        if (this.status !== "play") return;
        this.status = "caught";
        this.stats.caught = 1;
        this.ev.push({ type: "caught", d });
    }

    updateDoors(dt) {
        for (const d of this.doors) if (d.t > 0) d.t = Math.max(0, d.t - dt);
    }

    /** What the player could interact with right now: the nearest thing they're facing. */
    findPrompt() {
        const p = this.p, st = this.current;
        if (p.hide >= 0) return { type: "unhide", label: "Step out" };
        const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
        const facing = (x, z, r = USE_RANGE) => {
            const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
            if (d > r) return 0;
            const dot = d < 0.6 ? 1 : (dx * fx + dz * fz) / d;
            return dot > 0.45 ? (1 + dot) / (d + 0.5) : 0;
        };
        let best = null, score = 0;
        const offer = (o, s) => { if (s > score) { best = o; score = s; } };
        if (st && (st.kind === "use" || st.kind === "hold" || (st.kind === "clock" && this.step === this.def.steps.length - 1))) {
            const s = spot(st.at);
            // Tasks ask for nearness, not aim: you can work a lever with your back to it and your light on a doll.
            if (Math.hypot(s.x - p.x, s.z - p.z) < 2.8) offer({ type: "task", label: st.kind === "clock" ? "Punch out" : st.label, hold: st.kind === "hold" }, 9);
        }
        for (const d of this.doors) {
            if (d.jammed && d.open) { offer({ type: "jam", label: "Door won't shut" }, facing(d.cx * CELL + 1, d.cz * CELL + 1, 1.5) * 0.5); continue; }
            offer({ type: "door", d, label: d.open ? "Close door" : "Open door" }, facing(d.cx * CELL + 1, d.cz * CELL + 1, 2.4));
        }
        for (let i = 0; i < LOCKERS.length; i++) {
            const l = LOCKERS[i];
            offer({ type: "hide", i, label: "Hide in locker" }, facing(l.x + l.face[0], l.z + l.face[1], 2.0) * (this.sweep ? 3 : 0.9));
        }
        return best;
    }

    updateTask(dt, input) {
        const p = this.p, st = this.current;
        this.prompt = this.findPrompt();
        const pr = this.prompt;
        if (st?.kind === "light" && p.light) { this.advance(); return; }
        if (st?.kind === "scan") {
            const s = spot(st.at), y = floorY(s.x, s.z) + s.y;
            // Nudged off the shelf face so the line of sight ends in open floor.
            const fx = s.face ? s.face[0] * 0.1 : 0, fz = s.face ? s.face[1] * 0.1 : 0;
            if (this.inBeam(s.x + fx, y, s.z + fz, 0.25)) {
                const was = this.hold;
                this.hold = Math.min(1, this.hold + dt / st.secs);
                if (Math.floor(was * 4) !== Math.floor(this.hold * 4)) this.ev.push({ type: "scanTick", v: this.hold });
                if (this.hold >= 1) { this.ev.push({ type: "done", at: st.at }); this.advance(); }
            } else this.hold = Math.max(0, this.hold - dt * 0.4);
        }
        if (st?.kind === "hold") {
            if (pr?.type === "task" && input.useDown) {
                const was = this.hold;
                this.hold = Math.min(1, this.hold + dt / st.secs);
                if (Math.floor(was * 6) !== Math.floor(this.hold * 6)) this.ev.push({ type: "crank", v: this.hold });
                if (this.hold >= 1) { this.ev.push({ type: "done", at: st.at }); this.advance(); return; }
            } else this.hold = Math.max(0, this.hold - dt * 0.5);
        }
        if (!input.use || !pr) return;
        if (pr.type === "task") {
            if (st.kind === "use") { this.ev.push({ type: "done", at: st.at }); this.advance(); } else if (st.kind === "clock") this.finish();
        } else if (pr.type === "door") {
            pr.d.open = !pr.d.open;
            pr.d.t = 0;
            this.ev.push({ type: "door", d: pr.d });
        } else if (pr.type === "jam") {
            this.ev.push({ type: "jam" });
        } else if (pr.type === "hide") {
            p.hide = pr.i;
            p.light = false;
            const l = LOCKERS[pr.i];
            p.saved = [p.x, p.z];
            p.x = l.x; p.z = l.z;
            p.yaw = p.aimYaw = Math.atan2(-l.face[0], -l.face[1]);
            p.pitch = p.aimPitch = 0;
            this.ev.push({ type: "hide", on: true, yaw: p.yaw });
        } else if (pr.type === "unhide") {
            const l = LOCKERS[p.hide];
            p.x = l.x + l.face[0] * 1.45; p.z = l.z + l.face[1] * 1.45;
            p.hide = -1;
            this.ev.push({ type: "hide", on: false });
        }
    }
    finish() {
        this.status = "done";
        this.ev.push({ type: "punch" });
    }

    updateFiles(dt) {
        const f = FILES[this.night];
        if (!f || this.fileRead >= 0 || this.def.empty) return;
        const x = f.x * CELL, z = f.z * CELL, y = floorY(x, z) + f.y;
        if (this.inBeam(x, y, z, 0.2)) {
            this.fileAt += dt;
            if (this.fileAt > 1.1) { this.fileRead = this.night; this.ev.push({ type: "file", f, i: this.night }); }
        } else this.fileAt = Math.max(0, this.fileAt - dt);
    }

    updateDanger() {
        const p = this.p, f = field(Math.floor(p.x / CELL), Math.floor(p.z / CELL));
        let best = 99, who = null;
        for (const d of this.dolls) {
            if (!d.awake) continue;
            const n = f[idx(Math.floor(d.x / CELL), Math.floor(d.z / CELL))], path = n < 0 ? 40 : n * CELL;
            const straight = Math.hypot(d.x - p.x, d.z - p.z), dist = Math.max(straight, Math.min(path, straight * 1.8));
            const felt = dist + (d.frozen ? 5 : 0);
            if (felt < best) { best = felt; who = d; }
        }
        this.nearest = who;
        const sweepBoost = this.sweep?.phase === "on" ? 0.35 : this.sweep ? 0.2 : 0;
        const raw = Math.max(0, 1 - best / 16) + sweepBoost;
        this.danger = p.hide >= 0 ? Math.min(raw, 0.45) : Math.min(1, raw);
    }
}
