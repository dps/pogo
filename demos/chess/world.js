// The table: room, board, the 32 physical pieces and everything that happens to them. Rules live in engine.js;
// this file only knows where wooden things are and how they move.
import { color, mesh, billboard } from "./pogo.js";
import { BOARD, TRAY } from "./meshes.js";
import { P, N, B, R, Q, K, fileOf, rankOf } from "./engine.js";

export const sqX = (sq) => fileOf(sq) - 3.5;
export const sqZ = (sq) => 3.5 - rankOf(sq);
export const worldSq = (x, z) => {
    const f = Math.floor(x + 4), r = Math.floor(4 - z);
    return f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 16 + f;
};

const TYPE = { [P]: "p", [N]: "n", [B]: "b", [R]: "r", [Q]: "q", [K]: "k" };
export const typeChar = (p) => TYPE[p & 7];
export const sideChar = (p) => (p & 8 ? "b" : "w");

/** How each piece feels: mass drives lag, wobble and thump. */
export const FEEL = {
    p: { mass: 1.0, h: 0.85, r: 0.31, lift: 0.62 },
    n: { mass: 1.45, h: 1.14, r: 0.34, lift: 0.68 },
    b: { mass: 1.5, h: 1.28, r: 0.33, lift: 0.7 },
    r: { mass: 1.95, h: 1.07, r: 0.35, lift: 0.7 },
    q: { mass: 2.35, h: 1.39, r: 0.36, lift: 0.76 },
    k: { mass: 2.7, h: 1.62, r: 0.38, lift: 0.8 },
};

const GRAVITY = 30;
const TRAY_Z = BOARD.outer + 0.28 + TRAY.hz;
const ease = (t) => t * t * (3 - 2 * t);
/** With an opaque light-on-black texture, a tiny alpha and a huge color add light to the board instead of covering it. */
export const glowColor = (hex) => { const c = color(hex), k = 0.02; return color([c.r / k, c.g / k, c.b / k, k]); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

class Piece {
    constructor(world, type, side) {
        this.w = world;
        this.side = side;
        this.sq = -1;
        this.x = 0; this.y = 0; this.z = 0;
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.tiltX = 0; this.tiltZ = 0; this.tvx = 0; this.tvz = 0; // lean, as springs
        this.goalX = 0; this.goalZ = 0;
        this.squash = 0; this.squashV = 0;
        this.yaw = 0;
        this.mode = "rest";
        this.spin = null;        // free tumbling { rx, ry, rz, wx, wy, wz }
        this.traySlot = -1;
        this.delay = 0;
        const s = world.s;
        this.blob = s.add([mesh("plane", { size: 1, texture: "contact", unlit: true, color: "#ffffff", shadow: false }), { name: "blob" }]);
        this.blob.color = color([0.02, 0.01, 0.0, 0.98]);
        this.ent = s.add([mesh(`p${side}`, { shine: world.mats[side].shine }), { name: "piece" }]);
        this.mirror = s.add([mesh(`m_p${side}`, { unlit: true, shadow: false }), { name: "mirror" }]);
        this.setType(type);
    }

    setType(type) {
        this.type = type;
        this.feel = FEEL[type];
        const a = this.w.game.assets;
        this.ent.mesh = `${type}${this.side}`;
        this.ent.size.set(a.geometry(this.ent.mesh).natural);
        this.mirror.mesh = `m_${type}${this.side}`;
        this.mirror.size.set(a.geometry(this.mirror.mesh).natural);
        // Knights look across the board, so that you read the horse rather than the back of its head.
        this.yaw = type === "n" ? (this.side === "w" ? 1.2 : -1.94) : 0;
    }

    place(sq) {
        this.sq = sq;
        this.homeX = sqX(sq); this.homeZ = sqZ(sq);
    }

    teleport(sq) {
        this.place(sq);
        this.x = this.homeX; this.z = this.homeZ; this.y = 0;
        this.vx = this.vy = this.vz = 0;
        this.tiltX = this.tiltZ = this.tvx = this.tvz = this.goalX = this.goalZ = 0;
        this.spin = null; this.squash = this.squashV = 0;
        this.mode = "rest"; this.traySlot = -1; this.strike = null; this.onLand = null;
        this.ent.hidden = false;
    }

    /** Hop: used for every automatic move. */
    arcTo(x, z, o = {}) {
        const dist = Math.hypot(x - this.x, z - this.z), m = this.feel.mass;
        this.mode = "arc";
        this.arc = {
            x0: this.x, y0: this.y, z0: this.z, x1: x, z1: z, t: 0,
            dur: (o.dur ?? 0.3 + 0.035 * dist) * (0.82 + 0.12 * m),
            peak: o.peak ?? Math.max(this.y, 0.55 + Math.min(0.75, dist * 0.09)),
        };
        this.vx = this.vy = this.vz = 0;
        this.spin = null;
    }

    update(dt) {
        const w = this.w, m = this.feel.mass;
        if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) { this.pose(); return; } }
        switch (this.mode) {
            case "held": case "hover": {
                // A damped spring towards the fingers. Heavy pieces trail.
                const omega = 34 / Math.sqrt(m), k = omega * omega, c = 2 * omega * 0.82;
                this.vx += (k * (this.gx - this.x) - c * this.vx) * dt;
                this.vy += (k * (this.gy - this.y) - c * this.vy) * dt;
                this.vz += (k * (this.gz - this.z) - c * this.vz) * dt;
                this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
                const lean = 0.05 * Math.sqrt(m);
                this.goalX = clamp(this.vz * lean, -0.5, 0.5) + (this.mode === "held" ? this.leanX ?? 0 : 0);
                this.goalZ = clamp(-this.vx * lean, -0.5, 0.5) + (this.mode === "held" ? this.leanZ ?? 0 : 0);
                break;
            }
            case "arc": {
                const a = this.arc;
                a.t = Math.min(1, a.t + dt / a.dur);
                const e = ease(a.t), px = this.x, pz = this.z;
                this.x = a.x0 + (a.x1 - a.x0) * e;
                this.z = a.z0 + (a.z1 - a.z0) * e;
                const up = Math.sin(Math.PI * Math.min(1, a.t * 0.94 + 0.06 * (a.y0 > 0 ? 0.5 : 0)));
                this.y = a.y0 * (1 - e) + a.peak * up;
                this.goalX = clamp((this.z - pz) / dt * 0.05, -0.34, 0.34);
                this.goalZ = clamp(-(this.x - px) / dt * 0.05, -0.34, 0.34);
                if (a.t >= 1) {
                    this.mode = "rest";
                    this.vy = -5 - m * 0.5;
                    this.y = Math.max(0.04, this.y);
                    this.goalX = this.goalZ = 0;
                }
                break;
            }
            case "fly": this.flight(dt); break;
            case "topple": this.toppling(dt); break;
            case "tray": break;
            default: {
                // Falling onto its square, or simply sitting there.
                this.x += (this.homeX - this.x) * Math.min(1, dt * 26);
                this.z += (this.homeZ - this.z) * Math.min(1, dt * 26);
                this.goalX = this.goalZ = 0;
                if (this.y > 0 || this.vy > 0) {
                    this.vy -= GRAVITY * 1.3 * dt;
                    this.y += this.vy * dt;
                    if (this.y <= 0) {
                        this.y = 0;
                        const speed = -this.vy;
                        if (speed > 1.1) {
                            const first = !this.bounced;
                            this.vy = speed * (first ? 0.22 : 0.16);
                            this.squashV -= speed * 0.5 / Math.sqrt(m);
                            w.impact(this, speed, first);
                            this.bounced = true;
                            if (first && this.onLand) { const f = this.onLand; this.onLand = null; f(); }
                        } else {
                            this.vy = 0;
                            this.bounced = false;
                            if (this.onLand) { const f = this.onLand; this.onLand = null; f(); }
                        }
                    }
                }
            }
        }
        // Strike: the attacker reaches the victim's height and knocks it away.
        if (this.strike && this.y < this.strike.height) {
            const v = this.strike.victim, sx = this.strike.dx, sz = this.strike.dz;
            this.strike = null;
            w.knockOff(v, sx, sz, this);
        }
        // Lean and squash springs. Heavy pieces rock slower.
        const k = 230 / m, c = 8 + m * 1.4;
        this.tvx += (k * (this.goalX - this.tiltX) - c * this.tvx) * dt;
        this.tvz += (k * (this.goalZ - this.tiltZ) - c * this.tvz) * dt;
        this.tiltX += this.tvx * dt; this.tiltZ += this.tvz * dt;
        this.squashV += (-340 * this.squash - 22 * this.squashV) * dt;
        this.squash += this.squashV * dt;
        this.pose();
    }

    /** Ballistic with bounces, ending lying in its slot. */
    flight(dt) {
        const w = this.w, sp = this.spin, f = this.fly;
        f.t += dt;
        if (f.settling) {
            f.settling = Math.min(1, f.settling + dt * 4.5);
            const e = ease(f.settling);
            this.x += (f.tx - this.x) * e; this.y += (f.ty - this.y) * e; this.z += (f.tz - this.z) * e;
            sp.rx += (f.rx - sp.rx) * e; sp.ry += (f.ry - sp.ry) * e; sp.rz += (f.rz - sp.rz) * e;
            if (f.settling >= 1) { this.mode = "tray"; this.x = f.tx; this.y = f.ty; this.z = f.tz; }
            return;
        }
        this.vy -= GRAVITY * dt;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        sp.rx += sp.wx * dt; sp.ry += sp.wy * dt; sp.rz += sp.wz * dt;
        // Clip a standing neighbour on the way past.
        if (this.y < 1.2 && !f.clipped) {
            for (const o of w.pieces) {
                if (o === this || o.mode !== "rest" || o.sq < 0) continue;
                if (Math.hypot(o.x - this.x, o.z - this.z) < 0.52 && this.y < o.feel.h) {
                    const a = Math.atan2(o.z - this.z, o.x - this.x);
                    o.tvz -= Math.cos(a) * 2.6 / o.feel.mass; o.tvx += Math.sin(a) * 2.6 / o.feel.mass;
                    w.events.clip?.(this, o);
                    f.clipped = true;
                    break;
                }
            }
        }
        const floor = f.ty;
        if (this.y <= floor && f.t > 0.12) {
            this.y = floor;
            const speed = -this.vy;
            f.bounces++;
            if (f.bounces >= 3 || speed < 2.6) {
                f.settling = 0.01;
                w.events.settle?.(this);
                return;
            }
            this.vy = speed * 0.36;
            this.vx += (f.tx - this.x) * 3; this.vz += (f.tz - this.z) * 3;
            this.vx *= 0.5; this.vz *= 0.5;
            sp.wx *= 0.5; sp.wy *= 0.5; sp.wz *= 0.5;
            w.events.trayHit?.(this, speed, f.bounces);
            w.dust(this.x, this.y - 0.2, this.z, 7, 0.9);
        }
    }

    /** The king going over: a pivot around the edge of the base, accelerating, then a roll. */
    toppling(dt) {
        const t = this.topple, w = this.w;
        t.time += dt;
        if (t.time < t.hesitate) {
            // Rocks on the edge first, as if deciding.
            const a = Math.sin(t.time * 9) * 0.09 * (t.time / t.hesitate);
            this.tiltX = t.ax * a; this.tiltZ = t.az * a;
            return;
        }
        if (!t.fell) {
            t.w += (1.4 + Math.sin(t.angle) * 26) * dt;
            t.angle += t.w * dt;
            const limit = Math.PI / 2 - 0.14;
            if (t.angle >= limit) {
                t.angle = limit;
                t.bounce++;
                w.events.kingDown?.(this, t.bounce);
                t.w *= -0.28;
                if (t.bounce >= 3 || Math.abs(t.w) < 0.5) { t.fell = true; t.w = 0; }
            }
        }
        this.tiltX = t.ax * t.angle; this.tiltZ = t.az * t.angle;
        // Pivoting on the rim of the base lifts the far side a touch.
        const r = this.feel.r;
        this.y = Math.sin(t.angle) * r * 0.86;
        this.x = t.x0 + t.dx * (1 - Math.cos(t.angle)) * r * 0.9;
        this.z = t.z0 + t.dz * (1 - Math.cos(t.angle)) * r * 0.9;
    }

    pose() {
        const e = this.ent, m = this.mirror, b = this.blob, s = this.squash, sy = 1 + s, sx = 1 - s * 0.6;
        let rx, ry, rz, ox = 0, oz = 0;
        if (this.spin && (this.mode === "fly" || this.mode === "tray")) { rx = this.spin.rx; ry = this.spin.ry; rz = this.spin.rz; } else {
            rx = this.tiltX; ry = this.yaw; rz = this.tiltZ;
            if (this.mode === "held" || this.mode === "hover") {
                // Tilting around the fingers rather than the foot.
                const g = this.feel.h * 0.72;
                ox = rz * g; oz = -rx * g;
            }
        }
        const x = this.x + ox, y = this.y, z = this.z + oz;
        e.pos.set(x, y, z); e.rot.set(rx, ry, rz); e.scale.set(sx, sy, sx);
        const onBoard = Math.abs(x) < 4.9 && Math.abs(z) < 4.9 && y >= -0.02 && this.mode !== "tray";
        m.hidden = !onBoard || this.w.mirrorOn === false;
        if (!m.hidden) { m.pos.set(x, -y, z); m.rot.set(-rx, ry, -rz); m.scale.set(sx, sy, sx); }
        b.hidden = !onBoard || y > 2.6 || Math.abs(x) > 4.1 || Math.abs(z) > 4.1;
        if (!b.hidden) {
            const up = clamp(y / 2.6, 0, 1), size = this.feel.r * 3.1 * (1 + up * 1.1);
            b.pos.set(x, 0.006, z);
            b.scale.set(size, 1, size);
            b.opacity = 0.97 * (1 - up) * (1 - up);
        }
    }
}

export class World {
    constructor(game, scene, mats) {
        this.game = game;
        this.s = scene;
        this.mats = mats;
        this.pieces = [];
        this.events = {};
        this.motes = [];
        this.parts = [];
        this.tension = 0; this.tensionGoal = 0;
        this.yaw = 0; this.yawGoal = 0;
        this.orbitX = 0; this.orbitY = 0;
        this.zoom = 1; this.zoomGoal = 1;
        this.focus = null; this.focusAmt = 0; this.focusGoal = 0;
        this.fit = { dist: 20, tx: 0, tz: 0, pitch: 1, tier: 0 };
        this.flick = 0;
        this.wide = false;
        this.buildRoom();
        this.buildPieces();
        this.buildMarks();
        for (let i = 0; i < 34; i++) this.motes.push(this.newMote(true));
    }

    buildRoom() {
        const s = this.s, L = s.light;
        L.softShadows = true;
        s.background = "#0c0705";
        L.dir.set(0.66, -1, 0.1);
        L.color = color([1.1, 0.95, 0.76]);
        L.sky = color([0.42, 0.33, 0.27]);
        L.ground = color([0.2, 0.14, 0.1]);
        L.shadows = true;
        L.shadowRange = 9.5;
        L.fog = null;
        const fixed = (name, o = {}) => s.add([mesh(name, o), { name }]);
        fixed("room", { unlit: true, texture: "roomTex", shadow: false });
        fixed("floor", { unlit: true, shadow: false });
        fixed("reflection", { unlit: true, texture: "reflectTex", shadow: false });
        fixed("table", { texture: "tableTex", shadow: false, shine: 0.2 });
        fixed("frame", { texture: "boardTex", shine: 0.5 });
        const top = fixed("boardTop", { texture: "boardTex", shadow: false, shine: 0.34 });
        top.color = color([1, 1, 1, 0.76]);
        top.pos.set(0, -BOARD.sink, 0);
        this.trays = ["w", "b"].map(() => [fixed("trayRail", { shine: 0.4, texture: "tableTex" }), fixed("trayFelt", { texture: "feltTex" })]);
        // Lamp and tea at the far end of the table.
        const lamp = fixed("lampBase", { shine: 0.8 });
        const glass = fixed("lampGlass", { shine: 1, shadow: false });
        glass.color = color([1, 0.9, 0.74, 0.16]);
        this.flame = s.add([billboard("flame", { size: 0.92, unlit: true }), { name: "flame" }]);
        this.lampParts = [lamp, glass];
        this.tea = [fixed("saucer", { shine: 0.6 }), fixed("cup", { shine: 0.7 })];
        this.tea[0].color = color("#e0d5c0");
    }

    buildPieces() {
        const back = "rnbqkbnr";
        for (const side of ["w", "b"]) {
            for (let f = 0; f < 8; f++) {
                const a = new Piece(this, "p", side);
                a.startSq = (side === "w" ? 1 : 6) * 16 + f;
                a.teleport(a.startSq);
                const b = new Piece(this, back[f], side);
                b.startSq = (side === "w" ? 0 : 7) * 16 + f;
                b.teleport(b.startSq);
                this.pieces.push(a, b);
            }
        }
    }

    /** Swap every piece to a re-baked material, in place. */
    refreshMaterials(mats) {
        this.mats = mats;
        for (const p of this.pieces) {
            p.ent.shine = mats[p.side].shine;
            p.setType(p.type);
        }
    }

    buildMarks() {
        const s = this.s, plane = (tex) => {
            const e = s.add([mesh("plane", { size: 1, texture: tex, unlit: true, shadow: false }), { name: "mark" }]);
            e.pos.y = 0.012;
            e.opacity = 0; e.hidden = true;
            e.want = 0;
            return e;
        };
        this.marks = Array.from({ length: 28 }, () => plane("dotGlow"));
        this.lastFrom = plane("squareGlow"); this.lastTo = plane("squareGlow");
        this.lastFrom.color = this.lastTo.color = glowColor("#ffb860");
        this.selectMark = plane("squareGlow"); this.selectMark.color = glowColor("#ffd48a");
        this.hoverMark = plane("ringGlow"); this.hoverMark.color = glowColor("#ffe6b0");
        this.checkMark = plane("glow"); this.checkMark.color = glowColor("#ff3c14");
        this.hintA = plane("squareGlow"); this.hintB = plane("squareGlow");
        this.hintA.color = this.hintB.color = glowColor("#7fc8ff");
        this.pulses = Array.from({ length: 6 }, () => { const e = plane("ringGlow"); e.pos.y = 0.016; e.life = 0; return e; });
        this.all = [...this.marks, this.lastFrom, this.lastTo, this.selectMark, this.hoverMark, this.checkMark, this.hintA, this.hintB];
    }

    showMark(e, sq, want) {
        e.pos.x = sqX(sq); e.pos.z = sqZ(sq);
        e.want = want;
        e.hidden = false;
    }

    clearMoves() {
        for (const e of this.marks) e.want = 0;
        this.selectMark.want = 0;
        this.hoverMark.want = 0;
    }

    /** moves: [{ sq, capture }] */
    showMoves(from, moves) {
        this.clearMoves();
        this.showMark(this.selectMark, from, 0.34);
        this.selectMark.scale.set(1, 1, 1);
        moves.forEach((m, i) => {
            const e = this.marks[i];
            if (!e) return;
            e.mesh = "plane";
            e.texture = m.capture ? "ringGlow" : "dotGlow";
            e.color = glowColor(m.capture ? "#ff6a30" : "#ffcf80");
            this.showMark(e, m.sq, m.capture ? 0.95 : 0.8);
            e.size0 = m.capture ? 1.12 : 1.05;
            e.opacity = 0;
            e.born = i * 0.012;
        });
    }

    updateMarks(dt) {
        const t = this.s.time;
        for (const e of this.all) {
            if (e.hidden) continue;
            const goal = (e.born ?? 0) > 0 ? 0 : e.want;
            if (e.born > 0) e.born -= dt;
            e.opacity += (goal - e.opacity) * Math.min(1, dt * (goal > e.opacity ? 16 : 10));
            if (e.want === 0 && e.opacity < 0.012) { e.hidden = true; e.opacity = 0; continue; }
            e.opacity = Math.min(0.98, e.opacity);
        }
        for (const e of this.marks) {
            if (e.hidden) continue;
            const pop = 1 + Math.sin(t * 3.2 + e.pos.x * 0.7 + e.pos.z) * 0.05;
            const s = (e.size0 ?? 0.5) * pop;
            e.scale.set(s, 1, s);
        }
        const pulse = 1 + 0.16 * Math.sin(t * 6);
        this.checkMark.scale.set(2.1 * pulse, 1, 2.1 * pulse);
        this.hoverMark.scale.set(1.16, 1, 1.16);
        for (const e of this.pulses) {
            if (e.life <= 0) continue;
            e.life -= dt * 2.6;
            const k = 1 - e.life;
            const size = e.base * (0.7 + k * 1.1);
            e.scale.set(size, 1, size);
            e.opacity = Math.max(0, e.life) * e.strength;
            if (e.life <= 0) e.hidden = true;
        }
    }

    pulse(x, z, size, strength) {
        const e = this.pulses.find((p) => p.life <= 0);
        if (!e) return;
        e.pos.x = x; e.pos.z = z; e.base = size; e.life = 1; e.strength = strength * 0.7; e.hidden = false;
        e.color = glowColor("#ffdfa8");
    }

    // --- Layout ------------------------------------------------------------------------------------

    /** Fit the board into a rectangle of the view: as big as it will go, centred, tilted but readable. */
    layout(rect, wide) {
        const s = this.s, cam = s.cam3;
        this.wide = wide;
        const pitch = wide ? 1.03 : 1.12, fov = wide ? 28 : 25;
        cam.fov = fov;
        cam.near = 1; cam.far = 140;
        const corners = [[-BOARD.outer, 0, BOARD.outer], [BOARD.outer, 0, BOARD.outer], [BOARD.outer, 0, -BOARD.outer], [-BOARD.outer, 0, -BOARD.outer]];
        const measure = (dist, tx, tz) => {
            const eye = [tx, Math.sin(pitch) * dist, tz + Math.cos(pitch) * dist];
            cam.set(eye, [tx, 0, tz]);
            cam.update(1);
            let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
            for (const c of corners) {
                const p = cam.project(c);
                x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
            }
            return { x0, x1, y0, y1 };
        };
        let lo = 8, hi = 80, tx = 0, tz = 0;
        const W = rect.x1 - rect.x0, Ht = rect.y1 - rect.y0;
        for (let i = 0; i < 24; i++) {
            const dist = (lo + hi) / 2, m = measure(dist, 0, 0);
            if (m.x1 - m.x0 > W || m.y1 - m.y0 > Ht) lo = dist; else hi = dist;
        }
        const dist = hi;
        // Slide the look target until the board's box is centred in the rectangle.
        for (let i = 0; i < 8; i++) {
            const m = measure(dist, tx, tz), ex = (rect.x0 + rect.x1) / 2 - (m.x0 + m.x1) / 2, ey = (rect.y0 + rect.y1) / 2 - (m.y0 + m.y1) / 2;
            const unitsPerView = (BOARD.outer * 2) / Math.max(1, m.x1 - m.x0);
            tx -= ex * unitsPerView;
            tz -= ey * unitsPerView * 1.25;
        }
        this.fit = { dist, tx, tz, pitch };
        this.placeFurniture();
        this.applyCamera(true);
    }

    placeFurniture() {
        const wide = this.wide;
        // Captures go to the side of whoever made them: black's losses sit by white's seat.
        const pos = [[0, TRAY_Z], [0, -TRAY_Z]];
        this.trays.forEach((t, i) => {
            const flip = wide ? 1 : 0, sign = i === 0 ? 1 : -1;
            for (const e of t) {
                e.pos.set(wide ? sign * TRAY_Z : pos[i][0], 0, wide ? 0 : pos[i][1]);
                e.rot.set(0, flip ? Math.PI / 2 : 0, 0);
            }
        });
        const flip = this.propFlip ?? 1, lx = (wide ? -7.75 : -3.45) * flip, lz = (wide ? -1.6 : -7.95) * flip;
        const [lamp, glass] = this.lampParts, size = wide ? 1 : 0.74;
        lamp.pos.set(lx, BOARD.table, lz); glass.pos.set(lx, BOARD.table, lz);
        lamp.scale.set(size, size, size); glass.scale.set(size, size, size);
        this.flame.pos.set(lx, BOARD.table + 2.72 * size, lz);
        this.flameSize = size;
        const [saucer, cup] = this.tea;
        const cx = (wide ? -7.85 : 3.6) * flip, cz = (wide ? 2.3 : -8.0) * flip;
        saucer.pos.set(cx, BOARD.table, cz); cup.pos.set(cx, BOARD.table + 0.02, cz);
        for (const p of this.pieces) if (p.mode === "tray") p.restInTray(); // they follow when the phone turns
    }

    /** World position and rotation of a slot. side is the capturer's seat: 0 near white, 1 near black. */
    slot(seat, index, type) {
        const f = FEEL[type], t = -3.85 + index * 0.55, wiggle = Math.sin(index * 12.9) * 0.14;
        const dir = index % 2 ? 1 : -1, len = f.h * 0.5, y = BOARD.table + 0.04 + f.r * 0.78;
        const sign = seat === 0 ? 1 : -1;
        const along = sign * t, centre = TRAY_Z * sign;
        if (this.wide) {
            const x = centre + dir * -len * 0.96, z = along + wiggle * 0.3;
            return { x, y, z, rx: Math.PI / 2, ry: (dir > 0 ? Math.PI / 2 : -Math.PI / 2) + wiggle, rz: 0 };
        }
        const x = along + wiggle * 0.3, z = centre + dir * -len * 0.96;
        return { x, y, z, rx: Math.PI / 2, ry: (dir > 0 ? 0 : Math.PI) + wiggle, rz: 0 };
    }

    // --- Moving things -----------------------------------------------------------------------------

    pieceAt(sq) { return this.pieces.find((p) => p.sq === sq) ?? null; }

    /** Hit test: the pointer's ray against the standing pieces, nearest first. */
    pickPiece(x, y, filter) {
        const cam = this.s.cam3;
        cam.update(this.game.alpha);
        const { origin: o, dir: d } = cam.ray(x, y);
        let best = null, bestDist = 1e9;
        for (const p of this.pieces) {
            if (p.sq < 0 || !filter(p)) continue;
            const hh = p.feel.h * 0.92;
            for (let i = 0; i <= 5; i++) {
                const yy = hh * i / 5, t = (yy - o.y) / d.y, rx = o.x + d.x * t - p.x, rz = o.z + d.z * t - p.z;
                const radius = (i === 0 ? p.feel.r : Math.max(0.22, p.feel.r * (1 - i / 7))) + 0.05;
                if (rx * rx + rz * rz < radius * radius && t < bestDist) { bestDist = t; best = p; }
            }
        }
        return best;
    }

    planePoint(x, y, h = 0) {
        const cam = this.s.cam3;
        cam.update(this.game.alpha);
        const { origin: o, dir: d } = cam.ray(x, y);
        const t = (h - o.y) / d.y;
        return { x: o.x + d.x * t, z: o.z + d.z * t };
    }

    project(x, y, z) { return this.s.cam3.project([x, y, z]); }

    lift(p, tilt = true) {
        p.mode = "held";
        p.gx = p.x; p.gz = p.z; p.gy = p.feel.lift;
        p.leanX = tilt ? 0.14 : 0; p.leanZ = 0;
        p.vy += 1.5;
        p.squashV += 1.2;
        p.bounced = false; p.onLand = null;
    }

    /** Piece hovers where it stands: chosen by a tap, waiting for the second tap. */
    hover(p) {
        p.mode = "hover";
        p.gx = p.homeX; p.gz = p.homeZ; p.gy = p.feel.lift * 0.72;
    }

    /** Let go over this square. */
    drop(p, sq, onLand) {
        p.place(sq);
        p.mode = "rest";
        p.vy = Math.min(p.vy, -3.2);
        p.vx = p.vz = 0;
        p.onLand = onLand ?? null;
    }

    /** Move a piece by itself. */
    moveTo(p, sq, onLand, o) {
        p.place(sq);
        p.arcTo(p.homeX, p.homeZ, o);
        p.onLand = onLand ?? null;
    }

    /** Attacker is on its way down: when it reaches the victim's height, the victim goes. */
    armStrike(attacker, victim) {
        const dx = victim.x - attacker.x, dz = victim.z - attacker.z, l = Math.hypot(dx, dz);
        attacker.strike = { victim, height: victim.feel.h * 0.72 + 0.05, dx: l > 0.2 ? dx / l : 0, dz: l > 0.2 ? dz / l : 1 };
    }

    trayCount(seat) { return this.pieces.filter((p) => p.seat === seat && p.sq < 0).length; }

    /** Send a piece flying into a tray. */
    knockOff(v, dx, dz, attacker) {
        const seat = v.side === "b" ? 0 : 1, index = this.trayCount(seat);
        v.sq = -1;
        v.seat = seat;
        v.slotIndex = index;
        const goal = this.slot(seat, index, v.type), T = 0.82;
        v.mode = "fly";
        v.vx = (goal.x - v.x) / T + dx * 0.8;
        v.vz = (goal.z - v.z) / T + dz * 0.8;
        const lift = v.y + 0.1;
        v.y = lift;
        v.vy = (goal.y - lift) / T + GRAVITY * T / 2;
        const m = v.feel.mass, spin = 11 / Math.sqrt(m), r = this.game.fxRng;
        v.spin = { rx: v.tiltX, ry: v.yaw, rz: v.tiltZ, wx: (dz || 0.4) * spin * (1 + r.next() * 0.5), wy: r.range(-4, 4), wz: -(dx || 0.4) * spin };
        // Land on a matching quarter turn, so the settle doesn't whip around.
        const near = (a, b) => b + Math.round((a - b) / (Math.PI * 2)) * Math.PI * 2;
        const flightEnd = (a, w) => a + w * T;
        v.fly = {
            t: 0, tx: goal.x, ty: goal.y, tz: goal.z, bounces: 0, settling: 0,
            rx: near(flightEnd(v.spin.rx, v.spin.wx), goal.rx), ry: near(flightEnd(v.spin.ry, v.spin.wy), goal.ry), rz: near(flightEnd(v.spin.rz, v.spin.wz), goal.rz),
        };
        v.strike = null; v.onLand = null;
        this.dust(v.x, 0.05, v.z, 14, 1.3);
        this.pulse(v.x, v.z, 1.5, 0.5);
        this.events.capture?.(v, attacker);
    }

    /** Teleport a piece straight into its tray slot. */
    bench(v, seat, index) {
        v.sq = -1; v.seat = seat; v.slotIndex = index;
        v.spin = { rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0 };
        v.mode = "tray"; v.tiltX = v.tiltZ = v.tvx = v.tvz = 0; v.squash = 0; v.vy = 0; v.strike = null; v.onLand = null;
        v.restInTray();
    }

    /** Make the visible pieces match `pos`. animate=false for loading a save. */
    sync(pos, animate) {
        const want = [];
        for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
            const sq = r * 16 + f, b = pos.b[sq];
            if (b) want.push({ sq, type: typeChar(b), side: sideChar(b) });
        }
        const free = new Set(this.pieces);
        const open = [];
        for (const w of want) {
            const p = this.pieces.find((q) => q.sq === w.sq && q.type === w.type && q.side === w.side && free.has(q));
            if (p) free.delete(p); else open.push(w);
        }
        const cost = (p, w) => Math.hypot(p.x - sqX(w.sq), p.z - sqZ(w.sq)) + (p.sq < 0 ? 4 : 0);
        const moved = [];
        for (const pass of [(p, w) => p.type === w.type, () => true]) {
            for (let i = open.length - 1; i >= 0; i--) {
                const w = open[i];
                let best = null;
                for (const p of free) if (p.side === w.side && pass(p, w) && (!best || cost(p, w) < cost(best, w))) best = p;
                if (best) { free.delete(best); open.splice(i, 1); moved.push([best, w]); }
            }
        }
        // Whatever is left over leaves the board.
        const leavers = [...free].sort((a, b) => (a.slotIndex ?? 99) - (b.slotIndex ?? 99));
        for (const p of leavers) p.sq = -1;
        // A fallen king gets back up.
        for (const p of this.pieces) if (p.mode === "topple" && !free.has(p) && !moved.some(([q]) => q === p)) p.teleport(p.sq);
        moved.forEach(([p, w], i) => {
            const was = p.type;
            if (!animate) {
                if (was !== w.type) p.setType(w.type);
                p.teleport(w.sq);
                return;
            }
            p.place(w.sq);
            if (was !== w.type) p.setType(w.type);
            // Coming back from a tray, it stands itself up in the air.
            const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
            p.tiltX = p.spin ? wrap(p.spin.rx) * 0.9 : 0; p.tiltZ = p.spin ? wrap(p.spin.rz) * 0.9 : 0;
            p.tvx = p.tvz = 0;
            p.arcTo(p.homeX, p.homeZ, { dur: 0.4, peak: 1.2 });
            p.delay = i * 0.018;
            p.spin = null;
        });
        const counters = [0, 0];
        for (const p of leavers) {
            const seat = p.side === "b" ? 0 : 1, index = counters[seat]++;
            if (animate && p.mode !== "tray") { p.seat = undefined; this.knockOff(p, 0, seat ? -1 : 1, null); } else this.bench(p, seat, index);
        }
    }

    // --- Effects -----------------------------------------------------------------------------------

    impact(p, speed, first) {
        const strength = Math.min(1, speed / 7);
        if (first) {
            this.dust(p.x, 0.04, p.z, 5 + (p.feel.mass * 3 | 0), 0.6 + strength * 0.6);
            this.pulse(p.x, p.z, p.feel.r * 2.4, 0.2 + strength * 0.26);
            // Heavy pieces make the neighbours rattle.
            for (const o of this.pieces) {
                if (o === p || o.sq < 0 || o.mode !== "rest") continue;
                const d = Math.hypot(o.x - p.x, o.z - p.z);
                if (d < 2.4 && d > 0.01) {
                    const push = strength * p.feel.mass * 0.2 / (d * d) / o.feel.mass;
                    o.tvz += (o.x - p.x) / d * -push;
                    o.tvx += (o.z - p.z) / d * push;
                    o.squashV -= push * 0.2;
                }
            }
        }
        this.events.land?.(p, speed, first);
    }

    dust(x, y, z, count, power) {
        const r = this.game.fxRng;
        for (let i = 0; i < count; i++) {
            const a = r.next() * Math.PI * 2, s = (0.6 + r.next() * 1.3) * power;
            this.parts.push({
                x: x + Math.cos(a) * 0.28, y, z: z + Math.sin(a) * 0.28, vx: Math.cos(a) * s, vy: 0.25 + r.next() * 0.65 * power, vz: Math.sin(a) * s,
                life: 0.5 + r.next() * 0.6, max: 1.1, size: 7 + r.next() * 11, g: 0.5, drag: 3.2, c: "#e9cfa6", add: false,
            });
        }
        if (this.parts.length > 260) this.parts.splice(0, this.parts.length - 260);
    }

    embers(x, y, z, count, power, palette = ["#ffcf70", "#ffa23c", "#fff0c0"]) {
        const r = this.game.fxRng;
        for (let i = 0; i < count; i++) {
            const a = r.next() * Math.PI * 2, s = r.next() * 2.6 * power;
            this.parts.push({
                x, y, z, vx: Math.cos(a) * s, vy: (1.6 + r.next() * 4) * power, vz: Math.sin(a) * s,
                life: 0.9 + r.next() * 1.3, max: 2.2, size: 4 + r.next() * 8, g: 1.2, drag: 0.9, c: r.pick(palette), add: true,
            });
        }
    }

    newMote(anywhere) {
        const r = this.game.fxRng;
        return { x: r.range(-7, 7), y: anywhere ? r.range(0.3, 6) : -0.2, z: r.range(-7, 5), s: r.range(4, 9), p: r.range(0, 6.28), v: r.range(0.03, 0.13) };
    }

    step(dt, realDt) {
        for (const p of this.pieces) p.update(dt);
        this.updateMarks(realDt);
        for (let i = this.parts.length - 1; i >= 0; i--) {
            const q = this.parts[i];
            q.life -= dt;
            if (q.life <= 0) { this.parts.splice(i, 1); continue; }
            const k = Math.max(0, 1 - q.drag * dt);
            q.vx *= k; q.vz *= k; q.vy = q.vy * k - q.g * dt;
            q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
            if (q.y < 0.01 && Math.abs(q.x) < 5) { q.y = 0.01; q.vy = 0; }
        }
        for (const m of this.motes) {
            m.y += m.v * dt;
            m.p += dt * 0.5;
            m.x += Math.sin(m.p) * 0.06 * dt;
            if (m.y > 6.5) Object.assign(m, this.newMote(false));
        }
        // Firelight breathes. Check presses the room in.
        this.flick += dt;
        const f = this.flick, breathe = 1 + Math.sin(f * 7.1) * 0.012 + Math.sin(f * 11.3 + 1) * 0.01 + Math.sin(f * 2.3) * 0.022;
        this.tension += (this.tensionGoal - this.tension) * Math.min(1, realDt * 2.8);
        const t = this.tension, L = this.s.light;
        L.color.r = (1.1 + t * 0.12) * breathe; L.color.g = (0.95 - t * 0.28) * breathe; L.color.b = (0.76 - t * 0.28) * breathe;
        L.sky.r = 0.42 - t * 0.06; L.sky.g = 0.33 - t * 0.12; L.sky.b = 0.27 - t * 0.1;
        const fs = this.flameSize ?? 1;
        this.flame.scale.set(fs * (1 + Math.sin(f * 13) * 0.04), fs * (1 + Math.sin(f * 9.3) * 0.07), 1);
    }

    /** Called with real time, so the camera still moves in slow motion. */
    stepCamera(dt) {
        const k = Math.min(1, dt * 4.5);
        let d = this.yawGoal - this.yaw;
        this.yaw += d * Math.min(1, dt * 2.6);
        this.zoom += (this.zoomGoal - this.zoom) * k;
        this.focusAmt += (this.focusGoal - this.focusAmt) * Math.min(1, dt * 1.7);
        this.applyCamera(false);
    }

    applyCamera(cut) {
        const f = this.fit, cam = this.s.cam3;
        const yaw = this.yaw + this.orbitX, pitch = clamp(f.pitch + this.orbitY, 0.72, 1.32);
        const sinY = Math.sin(this.yaw), cosY = Math.cos(this.yaw);
        let tx = f.tx * cosY + f.tz * sinY, tz = -f.tx * sinY + f.tz * cosY, ty = 0;
        const dist = f.dist * this.zoom * (1 - this.focusAmt * 0.46);
        if (this.focus) {
            tx += (this.focus.x - tx) * this.focusAmt;
            ty += (this.focus.y - ty) * this.focusAmt;
            tz += (this.focus.z - tz) * this.focusAmt;
        }
        const eye = [tx + Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist];
        if (cut) cam.set(eye, [tx, ty, tz]);
        else { cam.pos.set(eye[0], eye[1], eye[2]); cam.target.set(tx, ty, tz); }
    }

    /** Soft dots in screen space, drawn over the 3D pass. */
    drawParticles(d) {
        const cam = this.s.cam3, scale = this.s.view.width / 360;
        for (const m of this.motes) {
            const p = cam.project([m.x, m.y, m.z]);
            if (!p.visible) continue;
            const glint = 0.1 + 0.14 * (0.5 + 0.5 * Math.sin(m.p * 3.1));
            d.sprite("mote", { x: p.x, y: p.y, width: m.s * scale, height: m.s * scale, opacity: glint, color: "#ffdcae" });
        }
        for (const q of this.parts) {
            if (q.add) continue;
            const p = cam.project([q.x, q.y, q.z]);
            if (!p.visible) continue;
            const a = Math.min(1, q.life / q.max * 2.4);
            d.sprite("mote", { x: p.x, y: p.y, width: q.size * scale, height: q.size * scale, opacity: a * 0.32, color: q.c });
        }
        d.additive(() => {
            for (const q of this.parts) {
                if (!q.add) continue;
                const p = cam.project([q.x, q.y, q.z]);
                if (!p.visible) continue;
                const a = Math.min(1, q.life / q.max * 2);
                d.sprite("mote", { x: p.x, y: p.y, width: q.size * scale * 1.6, height: q.size * scale * 1.6, opacity: a, color: q.c });
            }
        });
    }

    /** Start the king's fall, away from the attacker. */
    toppleKing(king, from) {
        const dx = king.x - from.x, dz = king.z - from.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
        king.mode = "topple";
        king.topple = { time: 0, hesitate: 0.34, angle: 0.02, w: 0.2, ax: uz, az: -ux, dx: ux, dz: uz, x0: king.x, z0: king.z, bounce: 0, fell: false };
    }

    /** Winners hop in a wave across their ranks. */
    wave(side) {
        for (const p of this.pieces) {
            if (p.side !== side || p.sq < 0 || p.mode !== "rest") continue;
            const delay = (p.x + 4) * 0.09 + (p.z + 4) * 0.03;
            this.s.wait(delay, () => {
                if (p.mode !== "rest" || p.sq < 0) return;
                p.vy = 3.2 + 0.8 / p.feel.mass;
                p.y = 0.01;
                p.bounced = true; // quiet landing, no thump chorus
                p.tvz += Math.sin(delay * 9) * 0.5;
            });
        }
    }
}

Piece.prototype.restInTray = function () {
    const g = this.w.slot(this.seat, this.slotIndex, this.type);
    this.x = g.x; this.y = g.y; this.z = g.z;
    this.spin = this.spin ?? { rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0 };
    this.spin.rx = g.rx; this.spin.ry = g.ry; this.spin.rz = g.rz;
    this.pose();
};
