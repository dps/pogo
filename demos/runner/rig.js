// The ostrich is the joke, so he gets the most code. Legs are two-bone IK on a stride loop, and the neck is a soft spring
// chain, which is why it flops. Everything is one shared limb and orb geometry, so the rig stays cheap on draw calls.
import { mesh, pos } from "./pogo.js";
import { laneX } from "./sim.js";

const N = 7;                              // Neck nodes.
const SEG = 0.34;

/** Aim an entity's local +y from a to b. */
function aim(e, ax, ay, az, bx, by, bz, r0, r1) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l = Math.hypot(dx, dy, dz) || 1;
    e.pos.set(ax, ay, az);
    e.rot.set(Math.acos(Math.max(-1, Math.min(1, dy / l))), Math.atan2(dx, dz), 0);
    e.scale.set(r0, l, r1 ?? r0);
}
/** Rotate (x,y,z) by yaw then pitch, matching Pogo's rotation order. */
function rotate(out, x, y, z, rx, ry) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    out[0] = x * cy + z1 * sy; out[1] = y1; out[2] = -x * sy + z1 * cy;
    return out;
}

export class OstrichRig {
    constructor(s, skin) {
        this.s = s;
        const add = (name, o = {}) => s.add([mesh(name, { color: o.color, shine: o.shine ?? 0, shadow: o.shadow ?? true, unlit: o.unlit ?? false }), pos(0, 0, 0)]);
        this.skin = skin;
        const id = skin.id, sh = skin.shine ?? 0;
        this.body = add(`o_body_${id}`, { shine: sh });
        this.tail = add(`o_tail_${id}`, { shine: sh });
        this.wings = [add(`o_wing_${id}`, { shine: sh }), add(`o_wing_${id}`, { shine: sh })];
        this.neck = []; for (let i = 0; i < N - 1; i++) this.neck.push(add("limb", { color: skin.skin, shine: sh }));
        this.head = add(`o_head_${id}`, { shine: sh });
        this.jaw = add(`o_jaw_${id}`, { shine: sh, shadow: false });
        this.pupils = [add("orb", { color: "#191720", shadow: false }), add("orb", { color: "#191720", shadow: false })];
        this.thigh = [add("limb", { color: skin.body }), add("limb", { color: skin.body })];
        this.shin = [add("limb", { color: skin.leg }), add("limb", { color: skin.leg })];
        this.foot = [add(`o_foot_${id}`), add(`o_foot_${id}`)];
        // Disguises, hidden until worn.
        const g = (n, o) => { const e = add(n, o); e.hidden = true; return e; };
        this.d = {
            moustache: g("d_moustache", { shadow: false }), skates: [g("d_skate", { shine: 0.5 }), g("d_skate", { shine: 0.5 })],
            jet: g("d_jet", { shine: 0.6 }), flames: [g("flame", { unlit: true, shadow: false }), g("flame", { unlit: true, shadow: false })],
            dress: g("d_dress"), veil: g("d_veil", { shadow: false }), train: [g("d_train", { shadow: false }), g("d_train", { shadow: false }), g("d_train", { shadow: false }), g("d_train", { shadow: false })],
            vest: g("d_vest", { shine: 0.2 }), hat: g("d_hat", { shine: 0.5 }),
        };
        this.nodes = []; for (let i = 0; i < N; i++) this.nodes.push({ x: 0, y: 3 + i * SEG, z: -1, vx: 0, vy: 0, vz: 0 });
        this.pupilOff = [{ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0, vx: 0, vy: 0 }];
        this.phase = 0; this.x = 0; this.y = 0; this.lean = 0; this.roll = 0; this.pose = 0; this.slideK = 0; this.glance = 0;
        this.jaw0 = 0; this.t = 0; this.squash = 0; this.trainPts = [0, 1, 2, 3, 4].map(() => ({ x: 0, y: 0, z: 0 }));
        this.flop = 0; this.spin = 0; this.yaw = 0;
        this.settle();
    }
    /** Swap to another bird without rebuilding. */
    setSkin(o) {
        this.skin = o; const id = o.id, sh = o.shine ?? 0;
        const set = (e, name) => { e.mesh = name; e.size.set(this.s.game.assets.geometry(name).natural); e.shine = sh; };
        set(this.body, `o_body_${id}`); set(this.tail, `o_tail_${id}`); set(this.head, `o_head_${id}`); set(this.jaw, `o_jaw_${id}`);
        for (const w of this.wings) set(w, `o_wing_${id}`);
        for (const f of this.foot) set(f, `o_foot_${id}`);
        for (const e of this.neck) { e.color = o.skin; e.shine = sh; }
        for (const e of this.thigh) e.color = o.body;
        for (const e of this.shin) e.color = o.leg;
    }
    settle() { for (let i = 0; i < 90; i++) this.update(1 / 60, { x: 0, y: 0, speed: 0, mode: "idle" }); }
    kick(x, y, z) { for (let i = 2; i < N; i++) { const k = i / N; this.nodes[i].vx += x * k; this.nodes[i].vy += y * k; this.nodes[i].vz += z * k; } }
    wearing(id) {
        const d = this.d;
        d.moustache.hidden = id !== "moustache";
        for (const e of d.skates) e.hidden = id !== "skates";
        d.jet.hidden = id !== "jetpack";
        for (const e of d.flames) e.hidden = id !== "jetpack";
        d.dress.hidden = d.veil.hidden = id !== "dress";
        for (const e of d.train) e.hidden = id !== "dress";
        d.vest.hidden = d.hat.hidden = id !== "hivis";
        this.id = id;
    }
    /** st: { x, y, z, speed, mode: idle|run|slide|air|fly|flop, panic } */
    update(dt, st) {
        this.t += dt;
        const mode = st.mode, z0 = st.z ?? 0;
        const vx = (st.x - this.x) / Math.max(dt, 1e-4);
        this.x = st.x;
        this.roll += ((-vx * 0.022) - this.roll) * Math.min(1, dt * 12);
        const slide = mode === "slide" ? 1 : 0, flop = mode === "flop" ? 1 : 0, idle = mode === "idle" ? 1 : 0, fly = mode === "fly" ? 1 : 0;
        this.slideK += (slide - this.slideK) * Math.min(1, dt * 18);
        this.flop += (flop - this.flop) * Math.min(1, dt * 9);
        const K = this.slideK, F = this.flop;
        const skating = this.id === "skates" && mode !== "fly";
        const stride = idle ? 0 : Math.max(1.6, 5.2 * Math.sqrt(st.speed / 15));
        if (mode === "run") this.phase += dt * stride * (skating ? 0.35 : 1);
        const ph = this.phase, bob = idle ? Math.sin(this.t * 2.4) * 0.03 : Math.abs(Math.sin(ph)) * 0.34;
        this.squash *= Math.pow(0.0015, dt);
        const hipY = (2.05 - K * 1.25 - F * 1.45 + bob * (1 - K)) + st.y * (1 - F * 0.5) - Math.max(0, this.squash) * 0.5;
        const leanT = idle ? 0.06 : mode === "air" ? (st.vy > 0 ? -0.25 : 0.2) : fly ? 0.55 : 0.2 + K * 0.28;
        this.lean += (leanT - this.lean) * Math.min(1, dt * 10);
        const b = this.body, lean = this.lean, x = st.x;
        b.pos.set(x, hipY, z0);
        b.rot.set(lean + F * 0.5, this.yaw, this.roll + F * 0.8);
        const sq = 1 + this.squash * 0.25;
        b.scale.set(sq, 1 / sq, 1);
        // Tail and wings ride on the body, flapping out of time with the legs, because they don't help.
        const p = [0, 0, 0];
        const local = (lx, ly, lz) => { rotate(p, lx, ly, lz, b.rot.x, b.rot.y); return [x + p[0], hipY + p[1], z0 + p[2]]; };
        const tl = local(0, 0.12, 0.95);
        this.tail.pos.set(tl[0], tl[1], tl[2]);
        this.tail.rot.set(lean - Math.sin(ph * 2) * 0.25, this.yaw, Math.sin(ph) * 0.25);
        const flap = idle ? 0.1 : mode === "air" || fly ? 1.1 + Math.sin(this.t * 34) * 0.5 : 0.5 + Math.sin(ph * 2 + 1) * 0.55;
        for (const s of [0, 1]) {
            const w = this.wings[s], side = s ? 1 : -1, q = local(side * 0.62, 0.2, -0.28);
            w.pos.set(q[0], q[1], q[2]);
            w.rot.set(lean, this.yaw + (s ? 0 : Math.PI) * 0, side * flap);
            w.scale.set(side * 1.2, 1.2, 1.1);
        }
        // Legs.
        for (const s of [0, 1]) {
            const side = s ? 1 : -1, hip = local(side * 0.3, -0.34, 0.08);
            let fx = x + side * 0.34, fy, fz;
            const ph2 = ph + s * Math.PI;
            if (idle || K > 0.6 || F > 0.5) {
                fy = F > 0.5 ? 0.2 : 0; fz = z0 + (F > 0.5 ? 2.2 + s * 0.3 : K > 0.6 ? -1.4 - s * 0.5 : 0.1);
                if (K > 0.6) { fy = 0.1; fx = x + side * 0.5; }
                if (F > 0.5) { fx = x + side * 0.9; }
            } else if (mode === "air" || mode === "fly") {
                fy = st.y + (mode === "fly" ? 0.5 : 0.7) + Math.sin(this.t * 20 + s * 3) * 0.28; fz = z0 + (s ? 0.75 : -0.6) * (mode === "fly" ? 1.5 : 1);
            } else if (skating) {
                fy = 0; fz = z0 + (s ? 0.9 : -0.5) + Math.sin(this.t * 3) * 0.3; fx = x + side * (0.45 + Math.sin(ph) * 0.15);
            } else {
                const c = (ph2 / (Math.PI * 2)) % 1, reach = 1.6 + Math.min(1, st.speed / 30) * 0.7;
                if (c < 0.42) { const t = c / 0.42; fy = 0; fz = z0 + reach * (-0.95 + t * 1.9); }
                else { const t = (c - 0.42) / 0.58; fy = Math.sin(t * Math.PI) * 1.05 + t * t * 0.1; fz = z0 + reach * (0.95 - t * 1.9) + Math.sin(t * Math.PI) * 0.6; }
                if (st.y > 0) fy += st.y;
                if (c < 0.03 && this.lastPlant !== (Math.floor(ph2 / (Math.PI * 2)))) { this.lastPlant = Math.floor(ph2 / (Math.PI * 2)); this.kick(0, -1.5, 0.6); this.squash = Math.max(this.squash, 0.2); }
            }
            const L1 = 1.05, L2 = 1.2;
            let dx = fx - hip[0], dy = fy + 0.14 - hip[1], dz = fz - hip[2], d = Math.hypot(dx, dy, dz);
            const max = (L1 + L2) * 0.999; if (d > max) { const k = max / d; dx *= k; dy *= k; dz *= k; d = max; fy = hip[1] + dy - 0.14; fz = hip[2] + dz; fx = hip[0] + dx; }
            const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
            const ux = dx / d, uy = dy / d, uz = dz / d;
            // The knee goes backwards, as it does on a real ostrich, which is half the comedy.
            let nx = 0, ny = -uz, nz = uy; const nl = Math.hypot(ny, nz) || 1; ny /= nl; nz /= nl;
            const kx = hip[0] + ux * a + nx * h, ky = hip[1] + uy * a + ny * h, kz = hip[2] + uz * a + nz * h;
            aim(this.thigh[s], hip[0], hip[1], hip[2], kx, ky, kz, 0.16, 0.16);
            aim(this.shin[s], kx, ky, kz, hip[0] + dx, hip[1] + dy, hip[2] + dz, 0.075);
            const f = this.foot[s];
            f.pos.set(hip[0] + dx, hip[1] + dy - 0.14, hip[2] + dz);
            f.rot.set(fy > 0.1 ? 0.7 : 0, 0, 0);
            if (this.id === "skates") { const sk = this.d.skates[s]; sk.pos.set(f.pos.x, f.pos.y - 0.02, f.pos.z - 0.05); sk.rot.y = 0; }
        }
        // Neck: springs toward an S-curve, then lengths are forced back. Head wants up and forward; momentum disagrees.
        const nodes = this.nodes, root = local(0, 0.42, -0.95);
        const air = mode === "air" ? (st.vy > 0 ? 1 : -1) : 0;
        const forward = K * 1.1 + fly * 1.0 + F * 0.3, lift = 1 - K * 0.92 - fly * 0.72 - F * 0.96;
        const sway = idle ? Math.sin(this.t * 1.7) * 0.06 : Math.sin(ph) * 0.09;
        const peck = idle && st.peck ? st.peck : 0;
        const wind = Math.min(1, st.speed / 30) * 0.42;
        nodes[0].x = root[0]; nodes[0].y = root[1]; nodes[0].z = root[2];
        for (let i = 1; i < N; i++) {
            const n = nodes[i], t = i / (N - 1);
            const tx = root[0] + sway * i * 0.5, ty = root[1] + lift * (i * SEG * 1.0 - t * t * 0.18) - K * 0.06 * i + F * (-root[1] + 0.3) * t - peck * t * t * 2.6;
            const tz = root[2] - forward * i * SEG * 1.2 + Math.sin(t * Math.PI) * 0.34 * lift - t * t * 0.3 + wind * t * lift + peck * -t * 1.2;
            const k = 150 - t * 110, damp = 12;
            n.vx += (tx - n.x) * k * dt; n.vy += (ty - n.y) * k * dt; n.vz += (tz - n.z) * k * dt;
            const dd = Math.exp(-damp * dt);
            n.vx *= dd; n.vy *= dd; n.vz *= dd;
            n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;
        }
        for (let i = 1; i < N; i++) {
            const a = nodes[i - 1], n = nodes[i];
            const dx = n.x - a.x, dy = n.y - a.y, dz = n.z - a.z, l = Math.hypot(dx, dy, dz) || 1, k = SEG / l;
            n.x = a.x + dx * k; n.y = a.y + dy * k; n.z = a.z + dz * k;
            aim(this.neck[i - 1], a.x, a.y, a.z, n.x + (n.x - a.x) * 0.1, n.y + (n.y - a.y) * 0.1, n.z + (n.z - a.z) * 0.1, 0.2 - i * 0.017);
        }
        // Head: aimed down the neck, levelled off, and turned to look behind when things go badly.
        const tip = nodes[N - 1], pre = nodes[N - 2];
        let pitch = Math.atan2(tip.y - pre.y, Math.hypot(tip.x - pre.x, tip.z - pre.z));
        pitch = pitch * 0.25 + 0.02;
        this.glance += ((st.panic ? 1 : 0) - this.glance) * Math.min(1, dt * 8);
        const yaw = Math.sin(this.t * (st.panic ? 7 : 1.1)) * 0.2 + this.glance * (Math.PI * 0.86) + this.yaw;
        const head = this.head; head.pos.set(tip.x, tip.y + 0.05, tip.z);
        head.rot.set(-pitch, yaw, 0);
        const J = this.jaw;
        const open = Math.max(st.panic ? 0.5 + Math.sin(this.t * 40) * 0.2 : 0, this.jaw0);
        this.jaw0 *= Math.pow(0.02, dt);
        rotate(p, 0, -0.1, -0.2, head.rot.x, yaw); J.pos.set(head.pos.x + p[0], head.pos.y + p[1], head.pos.z + p[2]);
        J.rot.set(head.rot.x - open, yaw, 0);
        for (const s of [0, 1]) {
            const q = this.pupilOff[s], side = s ? 1 : -1;
            q.vx += (-q.x * 400 - (vx * 0.5)) * dt + (st.panic ? Math.sin(this.t * 31 + s) * 2 : 0); q.vy += (-q.y * 300 + Math.sin(ph * 2 + s) * 5 * (idle ? 0 : 1) - st.y * 0.4) * dt;
            q.vx *= Math.exp(-5 * dt); q.vy *= Math.exp(-5 * dt); q.x += q.vx * dt * 5; q.y += q.vy * dt * 5;
            q.x = Math.max(-0.08, Math.min(0.08, q.x)); q.y = Math.max(-0.08, Math.min(0.08, q.y));
            rotate(p, side * (0.31 + q.x * 0.1), 0.1 + q.y, -0.17 + q.x, head.rot.x, yaw);
            const e = this.pupils[s];
            e.pos.set(head.pos.x + p[0], head.pos.y + p[1], head.pos.z + p[2]);
            e.scale = 0.1;
        }
        // Disguises ride their anchors.
        const id = this.id, d = this.d;
        if (id === "moustache") { rotate(p, 0, -0.1, -0.5, head.rot.x, yaw); d.moustache.pos.set(head.pos.x + p[0], head.pos.y + p[1], head.pos.z + p[2]); d.moustache.rot.set(head.rot.x, yaw, Math.sin(this.t * 24) * 0.06); d.moustache.scale = 1.7; }
        if (id === "jetpack") {
            const q = local(0, 0.72, 0.15);
            d.jet.pos.set(q[0], q[1], q[2]); d.jet.rot.set(lean - 0.2, 0, this.roll);
            for (const s of [0, 1]) {
                const e = d.flames[s], fl = local(s ? 0.3 : -0.3, 0.05, 0.45);
                e.pos.set(fl[0], fl[1], fl[2] + 0.1); e.rot.set(Math.PI - 0.28, 0, 0);
                e.scale.set(1 + Math.sin(this.t * 50 + s) * 0.2, 1.2 + Math.sin(this.t * 70 + s * 2) * 0.5, 1 + Math.sin(this.t * 44) * 0.2);
                e.opacity = 1;
            }
        }
        if (id === "dress") {
            d.dress.pos.set(x, hipY, z0); d.dress.rot.set(lean * 0.8, 0, this.roll); d.dress.scale.set(1.14, 1.12 - K * 0.2, 1.14);
            rotate(p, 0, 0.25, 0.25, head.rot.x, yaw); d.veil.pos.set(head.pos.x + p[0], head.pos.y + p[1], head.pos.z + p[2]); d.veil.rot.set(head.rot.x, yaw, 0); d.veil.scale = 0.72;
            const pts = this.trainPts;
            pts[0].x = x; pts[0].y = hipY - 0.9; pts[0].z = z0 + 0.7;
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], n = pts[i], wave = Math.sin(this.t * 10 - i * 1.3) * 0.12 * i;
                n.x += (a.x - n.x) * Math.min(1, dt * 22); n.y += (Math.max(0.1 + wave * 0.3, a.y - 0.3 + wave) - n.y) * Math.min(1, dt * 22);
                n.z = a.z + 1.1;
                const e = d.train[i - 1];
                e.pos.set(a.x, a.y, a.z);
                const dx = n.x - a.x, dy = n.y - a.y;
                e.rot.set(-Math.atan2(dy, 1.1), Math.atan2(dx, 1.1) * 1, 0);
                e.scale.set(0.9 + i * 0.14, 1, 1.35);
            }
        }
        if (id === "hivis") {
            d.vest.pos.set(x, hipY, z0); d.vest.rot.set(lean, 0, this.roll);
            rotate(p, 0, 0.3, 0, head.rot.x, yaw); d.hat.pos.set(head.pos.x + p[0], head.pos.y + p[1], head.pos.z + p[2]); d.hat.rot.set(head.rot.x, yaw, 0);
        }
    }
}

export class FarmerRig {
    constructor(s) {
        this.s = s;
        const add = (name, o = {}) => s.add([mesh(name, { color: o.color, shadow: o.shadow ?? true, shine: o.shine ?? 0 }), pos(0, 0, 0)]);
        this.body = add("f_body"); this.head = add("f_head");
        this.arm = [add("limb", { color: "#d94f3d" }), add("limb", { color: "#d94f3d" })];
        this.hand = [add("orb", { color: "#ffbe94" }), add("orb", { color: "#ffbe94" })];
        this.leg = [add("limb", { color: "#3f6fb5" }), add("limb", { color: "#3f6fb5" })];
        this.boot = [add("f_boot"), add("f_boot")];
        this.fork = add("f_fork", { shine: 0.2 });
        this.ride = {};
        for (const n of ["tractor", "cart", "skis", "rocket"]) { this.ride[n] = add(`r_${n}`, { shine: 0.2 }); this.ride[n].hidden = true; }
        this.phase = 0; this.t = 0; this.vehicle = null; this.hidden = false;
    }
    hide(v) {
        if (v === this.hidden) return;
        this.hidden = v;
        for (const e of [this.body, this.head, ...this.arm, ...this.hand, ...this.leg, ...this.boot, this.fork]) e.hidden = v;
        for (const n in this.ride) this.ride[n].hidden = v || n !== this.vehicle;
    }
    setVehicle(n) { this.vehicle = n; for (const k in this.ride) this.ride[k].hidden = this.hidden || k !== n; }
    /** yaw 0 faces -z, away from the camera, running after the bird. */
    update(dt, st) {
        this.t += dt;
        const v = this.vehicle, seated = v === "tractor" || v === "cart", ride = v && this.ride[v], x = st.x, z = st.z;
        const yaw = st.yaw ?? 0;
        this.phase += dt * (st.run ?? 12);
        const ph = this.phase, c = Math.cos(yaw), si = Math.sin(yaw);
        const L = (lx, ly, lz) => [x + lx * c + lz * si, ly, z - lx * si + lz * c];
        const lift = seated ? (v === "tractor" ? 1.15 : 0.6) : v === "rocket" ? 1.2 : 0;
        const waist = 1.15 + lift + Math.abs(Math.sin(ph)) * (v ? 0.04 : 0.15) + Math.sin(this.t * 9) * (v === "rocket" ? 0.1 : 0);
        this.body.pos.set(x, waist, z); this.body.rot.set(-0.14, yaw, Math.sin(ph) * 0.05);
        const h = L(0, waist + 1.65, 0);
        this.head.pos.set(h[0], h[1], h[2]); this.head.rot.set(Math.sin(ph * 2) * 0.1, yaw + Math.sin(this.t * 3) * 0.2, 0);
        if (ride) { ride.pos.set(x, Math.sin(this.t * 13) * 0.04 + (v === "rocket" ? 0.4 : 0), z); ride.rot.set(0, yaw, 0); }
        for (const s of [0, 1]) {
            const side = s ? 1 : -1, sw = Math.sin(ph + s * Math.PI) * (v ? 0.05 : 0.9);
            const hip = L(side * 0.24, waist + 0.05, 0);
            const foot = seated ? L(side * 0.32, lift + 0.25, -0.5) : L(side * 0.3, v ? 0.1 : Math.max(0.1, 0.1 + Math.cos(ph + s * Math.PI) * 0.4), -sw);
            aim(this.leg[s], hip[0], hip[1], hip[2], foot[0], foot[1], foot[2], 0.17);
            this.boot[s].pos.set(foot[0], foot[1] - 0.08, foot[2]); this.boot[s].rot.set(0, yaw, 0);
            const sh = L(side * 0.56, waist + 1.15, 0);
            const raised = s === 1;
            const hx = raised ? L(side * 0.72, waist + 1.95 + Math.sin(this.t * 11) * 0.22, -0.2 + Math.sin(this.t * 11) * 0.3) : seated ? L(-0.4, waist + 0.9, -0.7) : L(side * 0.66, waist + 0.65, -sw * 0.8);
            aim(this.arm[s], sh[0], sh[1], sh[2], hx[0], hx[1], hx[2], 0.11);
            this.hand[s].pos.set(hx[0], hx[1], hx[2]); this.hand[s].scale = 0.15;
            if (raised) { this.fork.pos.set(hx[0], hx[1], hx[2]); this.fork.rot.set(-0.3 + Math.sin(this.t * 11) * 0.35, yaw, 0.1); }
        }
    }
}
export { laneX };
