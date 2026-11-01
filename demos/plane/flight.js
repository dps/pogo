// The paper plane. Real glide physics with a small trick: the state is the plane's velocity through the air, plus
// the air it has been caught up in. Lift, drag and stall live in the air's frame; thermals and ribbons simply carry
// you. Nothing here renders or knows about touch, so a bot flies with exactly the same numbers as a thumb.
import { BOUNDS, clear, ground, touch, wind } from "./world.js";

export const G = 12;
const DEG = Math.PI / 180, TRIM = 4 * DEG, SEA = 0.35, R = 0.75;

export class Flight {
    constructor(cfg, env) {
        this.cfg = cfg; this.env = env;      // env: { sun: [x,z] the light comes from, warm, comfort, noCrash }
        this.x = 0; this.y = 30; this.z = 0; this.ax = 0; this.ay = 0; this.az = -cfg.vt; this.fx = 0; this.fy = 0; this.fz = 0;
        this.alpha = TRIM; this.roll = 0; this.V = cfg.vt; this.stalled = false; this.stallT = 0; this.gamma = 0; this.lastGamma = 0;
        this.state = "fly"; this.t = 0; this.crumbs = []; this.crumbT = 0; this.gust = 0; this.spin = 0; this.squash = 0; this.flapT = 0; this.flap = 0;
        this.events = []; this.info = { thermal: 0, wall: 0, ribbon: null, ribbonI: 0, ribbonK: 0 }; this.W = [0, 0, 0];
        this.crashes = 0; this.stalls = 0; this.hitCool = 0; this.px = 0; this.py = 30; this.pz = 0; this.climb = 0; this.up = [0, 1, 0]; this.dir = [0, 0, -1]; this.right = [1, 0, 0];
        this.prevRibbon = null; this.prevThermal = 0; this.clearance = 99; this.vx = 0; this.vy = 0; this.vz = 0; this.spawn = null;
    }
    place(x, y, z, yaw, speed) {
        this.x = this.px = x; this.y = this.py = y; this.z = this.pz = z;
        const v = speed ?? this.cfg.vt * 1.05;
        this.ax = -Math.sin(yaw) * v; this.az = -Math.cos(yaw) * v; this.ay = 0; this.fx = this.fy = this.fz = 0; this.V = v; this.roll = 0; this.alpha = TRIM; this.stalled = false; this.state = "fly";
        this.crumbs.length = 0; this.vx = this.ax; this.vz = this.az; this.vy = 0; this.spawn = this.spawn ?? { x, y, z, yaw };
        this.dir = [this.ax / v, 0, this.az / v];
    }
    get yaw() { return Math.atan2(-this.ax - this.fx * 0.4, -this.az - this.fz * 0.4); }
    get speed() { return Math.hypot(this.vx, this.vy, this.vz); }

    step(dt, sx, sy) {
        this.t += dt; this.px = this.x; this.py = this.y; this.pz = this.z;
        this.hitCool = Math.max(0, this.hitCool - dt);
        if (this.state !== "fly") return this.grounded(dt);
        const c = this.cfg, env = this.env, comfort = env.comfort;
        const V0 = Math.max(0.5, this.V), rollGoal = sx * c.bank * (comfort ? 0.8 : 1);
        this.roll += (rollGoal - this.roll) * (1 - Math.exp(-c.roll * 1.5 * dt));
        // Elevator. The stick sets an angle of attack; neutral is trim. Pull hard and you trade speed for height.
        let cmd = sy >= 0 ? TRIM + sy * ((comfort ? 8.5 : Math.min(c.stall, 16) * 0.92) * DEG - TRIM) : TRIM + sy * (TRIM + 3.5 * DEG);
        cmd += TRIM * (1 / Math.max(0.45, Math.cos(this.roll)) - 1);
        const dg = (this.gamma - this.lastGamma) / dt; this.lastGamma = this.gamma;
        cmd -= Math.max(-0.1, Math.min(0.1, dg * 0.3));                 // pitch damping: the long phugoid stays a gentle bob
        if (this.gamma < -0.8) cmd += (-this.gamma - 0.8) * 0.6;             // no one wants a vertical dive by accident
        if (comfort) cmd -= 0.35 * Math.max(0, 0.75 - V0 / c.vt);        // the assist eases the nose down before any stall
        const stallAlpha = c.stall * DEG;
        if (!comfort && !this.stalled && c.stall < 80 && (V0 < 0.5 * c.vt || this.alpha > stallAlpha)) { this.stalled = true; this.stallT = 0; this.stalls++; this.events.push(["stall"]); }
        if (this.stalled) { this.stallT += dt; cmd = -3 * DEG; if (V0 > 0.86 * c.vt && this.stallT > 0.35) { this.stalled = false; this.events.push(["recover"]); } }
        this.alpha += (cmd - this.alpha) * (1 - Math.exp(-6 * dt));
        const q = (V0 / c.vt) ** 2;
        let cl = this.alpha / TRIM; if (this.stalled) cl *= 0.18;
        let load = Math.max(-1, Math.min(3.4, q * cl));
        const d = [this.ax / V0, this.ay / V0, this.az / V0];
        let u = [-d[0] * d[1], 1 - d[1] * d[1], -d[2] * d[1]], ul = Math.hypot(...u);
        if (ul < 0.05) { u = this.up.slice(); ul = 1; }
        u = [u[0] / ul, u[1] / ul, u[2] / ul];
        const r = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]];
        const cr = Math.cos(this.roll), sr = Math.sin(this.roll), L = [u[0] * cr + r[0] * sr, u[1] * cr + r[1] * sr, u[2] * cr + r[2] * sr];
        const dp = G / (2 * c.ld) * q, di = G / (2 * c.ld) * Math.min(14, load * load / Math.max(0.15, q)) * (this.stalled ? 3 : 1);
        const drag = dp * (this.stalled ? 2 : 1) + di, lift = G * load;
        this.ax += (L[0] * lift - d[0] * drag) * dt; this.ay += (L[1] * lift - d[1] * drag - G) * dt; this.az += (L[2] * lift - d[2] * drag) * dt;
        this.dir = d; this.up = L; this.right = [r[0] * cr - u[0] * sr, r[1] * cr - u[1] * sr, r[2] * cr - u[2] * sr];
        // The crane flaps when asked to climb or when it is running out of air.
        if (c.flap) {
            this.flapT -= dt;
            if (this.flapT <= 0 && (sy > 0.3 || V0 < c.vt * 0.82)) { this.flapT = 0.52; this.flap = 1; this.ax += d[0] * 2.3 + L[0] * 1.5; this.ay += d[1] * 2.3 + L[1] * 1.5; this.az += d[2] * 2.3 + L[2] * 1.5; this.events.push(["flap"]); }
            this.flap = Math.max(0, this.flap - dt * 2.4);
        }
        // Caught up in the moving air.
        const info = wind(this.x, this.y, this.z, env.sun, env.warm, 1, this.W, this.info), W = this.W;
        if (W[1] > 0) W[1] *= c.lift;
        if (this.gust > 0) { this.gust -= dt; W[1] += 8; }
        // A letter wants to get home: within reach of a door the air leans gently towards it, overriding the smoke.
        const M = env.magnet;
        if (M) { const dx = M.x - this.x, dy = M.y - this.y, dz = M.z - this.z, q = Math.hypot(dx, dy, dz); const R = M.reach ?? 24; if (q < R && q > 0.5) { const k2 = (1 - q / R) * (M.pull ?? 16) / q; W[0] += dx * k2; W[2] += dz * k2; W[1] = W[1] * (q / R) + dy * k2; } }
        const k = 1 - Math.exp(-(info.ribbon ? 3.4 : 2.1) * dt);
        this.fx += (W[0] - this.fx) * k; this.fy += (W[1] - this.fy) * k; this.fz += (W[2] - this.fz) * k;
        if (info.ribbon) {
            // A ribbon takes you by the hand: your nose comes round to its line unless you steer hard against it.
            const want = c.vt * 1.15, T = info.ribbon.tan[info.ribbonI], hold = (1 - Math.min(1, Math.abs(sx) * 0.8 + Math.abs(sy) * 0.5)) * 2.6 * info.ribbonK * dt, sp = Math.max(V0, want);
            this.ax += (T[0] * sp - this.ax) * hold; this.ay += (T[1] * sp - this.ay) * hold; this.az += (T[2] * sp - this.az) * hold;
            if (V0 < want) { const g = (want - V0) * 1.6 * dt; this.ax += d[0] * g; this.ay += d[1] * g; this.az += d[2] * g; }
        }
        if (comfort && V0 < c.vt * 0.72) { const g = (c.vt * 0.72 - V0) * 2 * dt; this.ax += d[0] * g; this.ay += d[1] * g; this.az += d[2] * g; }
        this.V = Math.hypot(this.ax, this.ay, this.az); this.gamma = Math.asin(Math.max(-1, Math.min(1, this.ay / Math.max(0.5, this.V))));
        // Speed limit, softly: a dive tops out rather than running away.
        const vmax = c.vt * 2.6; if (this.V > vmax) { const m = vmax / this.V; this.ax *= m; this.ay *= m; this.az *= m; this.V = vmax; }
        this.vx = this.ax + this.fx; this.vy = this.ay + this.fy; this.vz = this.az + this.fz; this.climb += (this.vy - this.climb) * 0.05;
        this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
        if (info.ribbon !== this.prevRibbon) { this.events.push([info.ribbon ? "ribbonIn" : "ribbonOut", info.ribbon?.name]); this.prevRibbon = info.ribbon; }
        const thermal = info.thermal > 0.15 || info.wall > 0.2; if (thermal !== !!this.prevThermal) { this.prevThermal = thermal; if (thermal) this.events.push(["lift"]); }
        this.collide(dt);
        if (this.state === "fly") this.breadcrumb(dt);
    }

    collide() {
        const gy = ground(this.x, this.z), floor = Math.max(gy, SEA);
        this.clearance = this.y - floor;
        let n = null, water = false, what = "wall";
        if (this.y - R < floor) {
            water = gy < SEA;
            if (!water && gy > this.py - R + 0.3) { const h = Math.hypot(this.vx, this.vz) || 1; n = [-this.vx / h, 0, -this.vz / h, floor + R - this.y]; what = "ledge"; }
            else { n = [0, 1, 0, floor + R - this.y]; what = water ? "water" : "ground"; }
        } else {
            const t = touch(this.x, this.y, this.z, R);
            if (t) { n = [t.nx, t.ny, t.nz, t.depth]; what = t.tag; }
        }
        if (!n) return;
        const vn = -(this.vx * n[0] + this.vy * n[1] + this.vz * n[2]);
        this.x += n[0] * (n[3] + 0.02); this.y += n[1] * (n[3] + 0.02); this.z += n[2] * (n[3] + 0.02);
        if (vn <= 0) return;
        const hard = what === "water" ? 4.5 : 9;
        if ((vn > hard || this.speed < this.cfg.vt * 0.45) && !this.env.noCrash) return this.crumple(what, vn);
        // A glance: the plane slides off and keeps flying, a little scuffed.
        this.ax += n[0] * vn * 1.4; this.ay += n[1] * vn * 1.4; this.az += n[2] * vn * 1.4;
        this.ax *= 0.96; this.az *= 0.96; this.fx *= 0.5; this.fy *= 0.5; this.fz *= 0.5;
        if (this.env.noCrash && vn > 6) { this.ay += 3; }
        // Free flight has no failure: a plane that has run out of air is simply picked up again.
        if (this.env.noCrash && this.speed < this.cfg.vt * 0.55) { this.gust = 1.6; const v = this.cfg.vt * 0.9, l = Math.hypot(this.ax, this.az) || 1; this.ax = this.ax / l * v; this.az = this.az / l * v; this.ay = Math.max(this.ay, 2); this.stalled = false; }
        if (!this.hitCool) { this.hitCool = 0.25; this.events.push(["scrape", vn, what]); }
    }
    crumple(what, vn) {
        this.state = "crumple"; this.t0 = this.t; this.crashes++; this.spin = 0; this.fx = this.fy = this.fz = 0;
        const s = what === "water" ? 0.2 : 0.35;
        this.vx = this.vx * s; this.vz = this.vz * s; this.vy = Math.max(4, Math.abs(this.vy) * s + 3); this.stalled = false;
        this.events.push(["crumple", what, vn]);
    }
    grounded(dt) {
        const t = this.t - this.t0;
        if (this.state === "crumple") {
            this.vy -= G * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt; this.spin += dt * 9 * Math.hypot(this.vx, this.vz, 2) * 0.2;
            this.vx *= 0.985; this.vz *= 0.985;
            const f = Math.max(ground(this.x, this.z), SEA) + 0.55;
            if (touch(this.x, this.y, this.z, 0.6)) { this.vx *= -0.4; this.vz *= -0.4; }
            if (this.y < f) { this.y = f; this.vy = Math.abs(this.vy) * 0.42; this.vx *= 0.6; this.vz *= 0.6; if (Math.abs(this.vy) > 1.2) this.events.push(["bounce"]); }
            if (t > 1.05) {
                const c = this.safeSpot(); this.state = "unfold"; this.t0 = this.t; this.from = [this.x, this.y, this.z]; this.to = c; this.events.push(["unfold"]);
            }
        } else if (this.state === "unfold") {
            const k = Math.min(1, t / 0.95), e = k * k * (3 - 2 * k), c = this.to, f = this.from;
            this.x = f[0] + (c[0] - f[0]) * e; this.z = f[2] + (c[2] - f[2]) * e; this.y = f[1] + (c[1] - f[1]) * e + Math.sin(k * Math.PI) * 3;
            if (k >= 1) { const v = this.cfg.vt * 1.12; this.place(c[0], c[1], c[2], c[3], v); this.crumbs = [{ x: c[0], y: c[1], z: c[2], yaw: c[3], t: this.t }]; this.gust = 2; this.lastLaunch = this.t; this.events.push(["relaunch"]); }
        }
    }
    breadcrumb(dt) {
        this.crumbT += dt; if (this.crumbT < 0.4) return; this.crumbT = 0;
        if (this.clearance > 7 && clear(this.x, this.y, this.z, 5)) { this.crumbs.push({ x: this.x, y: this.y, z: this.z, yaw: this.yaw, t: this.t }); if (this.crumbs.length > 32) this.crumbs.shift(); }
    }
    /** Somewhere open, a little back along your own path, higher than you were. */
    safeSpot() {
        // Twice in quick succession means this bit of air is a trap: lift clean out of it, up into open sky.
        this.trapped = this.t - (this.lastLaunch ?? -99) < 7 ? (this.trapped ?? 0) + 1 : 0;
        if (this.trapped >= 1) {
            let y = 96; while (y > 12 && clear(this.x, y, this.z, 6)) y -= 3;
            y = Math.min(100, Math.max(y + 10, ground(this.x, this.z) + 26)); this.crumbs.length = 0;
            const home = Math.atan2(this.x, this.z);                   // nose towards the middle of town
            return [this.x, y, this.z, home];
        }
        const list = this.crumbs;
        for (let i = list.length - 1; i >= 0; i--) {
            const b = list[i]; if (this.t - b.t < 1.8 && i > 0) continue;
            const y = Math.max(b.y, ground(b.x, b.z) + 15);
            if (!clear(b.x, y, b.z, 6)) continue;
            // Never point a relaunch at the thing you just hit: find a heading with room to fly.
            for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, 3.14]) {
                const yaw = b.yaw + off, ok = [18, 36, 54, 72].every((k) => clear(b.x - Math.sin(yaw) * k, y - k * 0.07, b.z - Math.cos(yaw) * k, 3.5));
                if (ok) return [b.x, y, b.z, yaw];
            }
        }
        const y = Math.max(this.y + 22, ground(this.x, this.z) + 26);
        for (let a = 0; a < 8; a++) { const yaw = a * 0.785, x = this.x, z = this.z; if (clear(x, y, z, 5) && clear(x - Math.sin(yaw) * 24, y, z - Math.cos(yaw) * 24, 4)) return [x, y, z, yaw]; }
        const s = this.spawn; return [s.x, s.y, s.z, s.yaw];
    }
}
