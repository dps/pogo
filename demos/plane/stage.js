// Everything the player sees in 3D: one draw hook feeds the renderer directly from pooled items, so a whole frame of
// town, sea, smoke, ribbons and motes costs a few dozen draw calls and no per-entity overhead.
import { color } from "./pogo.js";
import { TIMES } from "./data.js";
import { BOUNDS, ground, homes, landmarks, ribbons, sm, thermals, touch, warmWalls } from "./world.js";
import { hex, mix } from "./paper.js";

const CLOUDS = [[-180, 104, 120, 0], [-40, 118, 210, 1], [130, 96, 190, 0], [280, 112, 40, 1], [-300, 100, -60, 0], [-120, 126, -240, 1], [120, 108, -280, 0], [310, 100, -200, 1], [20, 134, 330, 0], [-330, 120, 240, 1], [240, 130, 300, 0], [-40, 96, -40, 1]];
const WHITE = [1, 1, 1];
const frac = (v) => v - Math.floor(v);
const hash = (i) => frac(Math.sin(i * 127.1) * 43758.5453);

export class Stage {
    constructor(s, game, built) {
        this.s = s; this.game = game; this.b = built; this.r = game.renderer; this.time = -1; this.t = 0; this.f = null;
        this.items = []; this.nItem = 0; this.mats = []; this.nMat = 0; this.geoms = new Map(); this.tex = game.assets.sprite("paper");
        this.cam = { x: 0, y: 40, z: 100 }; this.cd = [0, -0.1, -1]; this.camRoll = 0; this.fov = 62; this.mode = "title"; this.blend = 0; this.orbit = null; this.titlePos = [0, 0, 0];
        this.rings = []; this.stamps = []; this.doll = null; this.boat = null; this.lit = {}; this.litFrac = 0; this.lanterns = 0; this.beam = false; this.flash = 0; this.carry = false; this.planeMesh = "plane_postman";
        this.motes = []; for (let i = 0; i < 46; i++) this.motes.push({ x: 0, y: -999, z: 0, r: game.fxRng.range ? game.fxRng.range(0, 6) : i, l: i % 3 });
        this.tips = [[], []]; this.scraps = []; this.lanternPts = this.makeLanterns();
        this.boats = [[34, 76, 0.4, "#d9593f"], [52, 92, -0.7, "#4f7fae"], [104, 88, 1.2, "#3f8c8e"], [124, 78, 0.2, "#efc15f"]].map(([x, z, yaw, c]) => ({ x, z, yaw, c: hex(c) }));
        s.cam3.far = 1500; s.cam3.near = 0.3; s.cam3.fovAxis = "min";
        s.light.shadows = true; s.light.shadowRange = 96; s.light.softShadows = false;
        this.ent = null;
    }
    makeLanterns() {
        const L = [];
        for (const [z, y, x0, x1] of [[56, 3, -60, 130], [9, 9, -120, 130], [-34, 15, -120, 130], [-78, 21, -100, 100]]) for (let x = x0; x <= x1; x += 13) L.push([x, y + 1.3, z - 2 + Math.sin(x) * 1.2]);
        for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(hash(i + 5) * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; }
        L.sort((a, b) => b[2] - a[2] + (hash(a[0]) - 0.5) * 30);
        return L;
    }
    setTime(i) {
        const t = TIMES[i], s = this.s, l = s.light;
        this.time = i; this.tm = t;
        l.dir.set(...t.sun); l.color = color(t.col); l.sky = color(t.sky); l.ground = color(t.ground);
        l.fog = { color: color(t.fog), near: 190, far: 900 };
        s.background = t.fog;
        const L = Math.hypot(t.sun[0], t.sun[2]) || 1;
        this.sun = [-t.sun[0] / L, -t.sun[2] / L];
        this.glow = color(t.glow); this.seaTint = hex(t.sea);
        this.cloudTint = mix(hex(t.fog), [1, 1, 1], i === 3 ? 0.12 : 0.62); if (i === 3) this.cloudTint = [0.3, 0.36, 0.52]; if (i === 2) this.cloudTint = [1, 0.8, 0.66];
        this.puffTint = i === 3 ? [0.55, 0.62, 0.78] : i === 2 ? [1, 0.88, 0.76] : [1, 0.98, 0.95];
    }
    geom(name) { let g = this.geoms.get(name); if (!g) this.geoms.set(name, g = this.game.assets.geometry(name)); return g; }
    mat() { const i = this.nMat++; return this.mats[i] ?? (this.mats[i] = new Float32Array(16)); }
    /** Queue one instance. */
    put(name, m, r = 1, g = 1, b = 1, unlit = false, cast = false) {
        const i = this.nItem++, it = this.items[i] ?? (this.items[i] = { u0: 0, v0: 0, u1: 1, v1: 1, cutout: false, shine: 0, a: 1 });
        it.geom = this.geom(name); it.matrix = m; it.r = r; it.g = g; it.b = b; it.texture = this.tex; it.unlit = unlit; it.castShadow = cast;
        this.r.mesh(it);
    }
    trs(x, y, z, yaw = 0, sx = 1, sy = sx, sz = sx) {
        const m = this.mat(), c = Math.cos(yaw), s = Math.sin(yaw);
        m[0] = c * sx; m[1] = 0; m[2] = -s * sx; m[3] = 0; m[4] = 0; m[5] = sy; m[6] = 0; m[7] = 0; m[8] = s * sz; m[9] = 0; m[10] = c * sz; m[11] = 0; m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
        return m;
    }
    basis(r, u, b, x, y, z, sx = 1, sy = sx, sz = sx) {
        const m = this.mat();
        m[0] = r[0] * sx; m[1] = r[1] * sx; m[2] = r[2] * sx; m[3] = 0; m[4] = u[0] * sy; m[5] = u[1] * sy; m[6] = u[2] * sy; m[7] = 0; m[8] = b[0] * sz; m[9] = b[1] * sz; m[10] = b[2] * sz; m[11] = 0; m[12] = x; m[13] = y; m[14] = z; m[15] = 1;
        return m;
    }
    /** An instance with its local +z along a direction. */
    along(name, x, y, z, dx, dy, dz, w, len, r, g, b, unlit) {
        const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
        let rx = dz, rz = -dx, rl = Math.hypot(rx, rz); if (rl < 0.01) { rx = 1; rz = 0; rl = 1; } rx /= rl; rz /= rl;
        const ux = dy * rz, uy = dz * rx - dx * rz, uz = -dy * rx;
        this.put(name, this.basis([rx, 0, rz], [ux, uy, uz], [dx, dy, dz], x, y, z, w, 1, len), r, g, b, unlit);
    }

    // ---- Camera --------------------------------------------------------------------------------------------
    update(dt) {
        this.t += dt;
        const f = this.f, s = this.s, c = s.cam3;
        for (const m of this.motes) if (f) {
            const dx = m.x - c.pos.x, dy = m.y - c.pos.y, dz = m.z - c.pos.z;
            if (dx * dx + dy * dy + dz * dz > 42 * 42) {
                const R = this.game.fxRng, lead = 26, a = (R.next?.() ?? Math.random()) * 6.28, b = (R.next?.() ?? Math.random()) * 26;
                m.x = c.pos.x + (f.vx / Math.max(4, f.speed)) * lead + Math.cos(a) * b; m.y = c.pos.y + (f.vy / Math.max(4, f.speed)) * lead + ((R.next?.() ?? Math.random()) - 0.5) * 26; m.z = c.pos.z + (f.vz / Math.max(4, f.speed)) * lead + Math.sin(a) * b;
            }
        }
        if (f && f.state === "fly") {
            for (let i = 0; i < 2; i++) {
                const q = this.tips[i], sg = i ? 1 : -1, w = 0.9, p = [f.x + f.right[0] * sg * w, f.y + f.right[1] * sg * w, f.z + f.right[2] * sg * w];
                if (q.length && Math.hypot(p[0] - q[q.length - 1][0], p[1] - q[q.length - 1][1], p[2] - q[q.length - 1][2]) > 4) q.length = 0;
                q.push(p); if (q.length > 26) q.shift();
            }
        } else { this.tips[0].length = 0; this.tips[1].length = 0; }
        for (const q of this.scraps) { q.life -= dt; q.vy -= 5 * dt; q.vx *= 0.985; q.vz *= 0.985; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.a += q.w * dt; }
        this.scraps = this.scraps.filter((q) => q.life > 0);
        const wide = s.view.width > s.view.height;
        if (this.mode === "chase" && f) {
            const sp = f.speed, vt = f.cfg.vt, v = sp > 2 ? [f.vx / sp, f.vy / sp, f.vz / sp] : this.cd, k = 1 - Math.exp(-(f.state === "fly" ? 3.6 : 1) * dt);
            for (let i = 0; i < 3; i++) this.cd[i] += (v[i] - this.cd[i]) * k;
            const l = Math.hypot(...this.cd) || 1, d = this.cd.map((x) => x / l), over = Math.max(0, sp / vt - 1), dist = (wide ? 5.4 : 6.2) + Math.min(3.4, over * 3.2), h = 1.7 - Math.max(-0.5, Math.min(0.8, d[1] * 1.6));
            let ex = f.x - d[0] * dist, ey = f.y - d[1] * dist * 0.7 + h, ez = f.z - d[2] * dist;
            // Keep the camera out of the walls: slide in towards the plane until the view is clear.
            for (let i = 1; i <= 6; i++) {
                const a = i / 6, qx = f.x + (ex - f.x) * a, qy = f.y + (ey - f.y) * a, qz = f.z + (ez - f.z) * a;
                if (qy < ground(qx, qz) + 1.1 || touch(qx, qy, qz, 0.8)) { const b = (i - 1) / 6 + 0.02; ex = f.x + (ex - f.x) * b; ey = f.y + (ey - f.y) * b + 0.7; ez = f.z + (ez - f.z) * b; break; }
            }
            const seen = Math.max(0, ground(ex, ez) + 1.1 - ey); ey += seen;
            this.goal = [ex, ey, ez, f.x + d[0] * 9, f.y + d[1] * 6 + (wide ? 0.2 : -0.6), f.z + d[2] * 9];
            const rollGoal = this.game.opts.comfort ? 0 : f.roll * 0.55;
            this.camRoll += (rollGoal - this.camRoll) * (1 - Math.exp(-5 * dt));
            const fovGoal = this.game.opts.comfort ? 62 + Math.min(10, over * 10) : 60 + Math.max(-6, Math.min(30, (sp / vt - 1) * 24)) + (f.info.ribbon ? 9 : 0);
            this.fov += (fovGoal - this.fov) * (1 - Math.exp(-3 * dt));
        } else if (this.mode === "orbit" && this.orbit) {
            const o = this.orbit; o.a += o.w * dt;
            this.goal = [o.x + Math.sin(o.a) * o.r, o.y + o.h, o.z + Math.cos(o.a) * o.r, o.x, o.y + (o.ly ?? 0), o.z];
            this.camRoll *= 0.95; this.fov += ((o.fov ?? 52) - this.fov) * (1 - Math.exp(-2 * dt));
        } else if (this.mode === "title") {
            const a = 0.42 + Math.sin(this.t * 0.06) * 0.2, R = wide ? 150 : 176, cx = 14, cz = 66;
            this.goal = [cx + Math.sin(a) * R * 0.9, 34 + Math.sin(this.t * 0.11) * 6, cz + Math.cos(a) * R, cx - 6, 26, cz - 120];
            this.fov = wide ? 54 : 60; this.camRoll = 0;
        }
        if (this.goal) {
            const b = (this.blend = Math.min(1, this.blend + dt * 1.4)), e = b * b * (3 - 2 * b), g = this.goal;
            if (b >= 1 || !this.from) { c.pos.set(g[0], g[1], g[2]); c.target.set(g[3], g[4], g[5]); }
            else { const q = this.from; c.pos.set(q[0] + (g[0] - q[0]) * e, q[1] + (g[1] - q[1]) * e, q[2] + (g[2] - q[2]) * e); c.target.set(q[3] + (g[3] - q[3]) * e, q[4] + (g[4] - q[4]) * e, q[5] + (g[5] - q[5]) * e); }
        }
        c.fov = this.fov;
        const dx = c.target.x - c.pos.x, dy = c.target.y - c.pos.y, dz = c.target.z - c.pos.z, l = Math.hypot(dx, dy, dz) || 1;
        // Bank the world by tilting the camera's up vector about the view axis.
        const rx = -dz / l, rz = dx / l, rl = Math.hypot(rx, rz) || 1, sr = Math.sin(this.camRoll), cr = Math.cos(this.camRoll);
        c.up.set((rx / rl) * sr, cr, (rz / rl) * sr);
    }
    cut(mode, opts) { const c = this.s.cam3; this.from = [c.pos.x, c.pos.y, c.pos.z, c.target.x, c.target.y, c.target.z]; this.blend = 0; this.mode = mode; if (opts) this.orbit = opts; }
    snap() { this.blend = 1; this.from = null; }
    confetti(x, y, z, n, cols, sp = 8) {
        const R = this.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = R.next() * 6.28, e = R.next() * 2 - 1, v = sp * (0.4 + R.next());
            this.scraps.push({ x, y, z, vx: Math.cos(a) * v, vy: e * v + sp * 0.3, vz: Math.sin(a) * v, a: R.next() * 6, w: (R.next() - 0.5) * 16, life: 0.7 + R.next() * 1.1, c: cols[i % cols.length], s: 0.24 + R.next() * 0.3 });
        }
    }

    // ---- Draw ----------------------------------------------------------------------------------------------
    draw(d) {
        this.nItem = 0; this.nMat = 0;
        const s = this.s, c = s.cam3, e = c.eye, t = this.t, tm = this.tm, f = this.f, a = this.game.alpha;
        const fx = c.look.x - e.x, fz = c.look.z - e.z, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl, pitchDown = (e.y - c.look.y) / (Math.hypot(fx, e.y - c.look.y, fz) || 1), keepAll = pitchDown > 0.75;
        const seen = (x, z, r) => { const dx = x - e.x, dz = z - e.z, q = Math.hypot(dx, dz); if (q < r * 1.6 || keepAll) return q; return dx * ux + dz * uz > q * (this.fov > 80 ? -0.05 : 0.2) - r ? q : -1; };
        this.put(`sky${this.time}`, this.trs(e.x, 0, e.z), 1, 1, 1, true);
        const I = this.trs(0, 0, 0), B = this.b;
        for (const k of B.land) { const q = seen(k.x, k.z, k.r); if (q >= 0) this.put(k.name, I); }
        const range = s.light.shadowRange;
        for (const k of B.things) { const q = seen(k.x, k.z, k.r); if (q >= 0) this.put(k.name, I, 1, 1, 1, false, q < range + k.r + 20); }
        // Windows: dark glass by day; at dusk and night each one is a small warm light.
        const G = this.glow, lit = tm.glowLit, gr = G.r, gg = G.g, gb = G.b, dark = hex(TIMES[0].glow);
        B.glowTown.forEach((k, i) => { const q = seen(k.x, k.z, k.r); if (q < 0 || q > 420) return; const on = lit > 0 && hash(i + 2) < this.litFrac; if (on) this.put(k.name, I, gr, gg, gb, true); else this.put(k.name, I, dark[0] * 0.7, dark[1] * 0.7, dark[2] * 0.8, tm.glowLit > 0.9); });
        for (const [id, n] of Object.entries(B.glowHomes)) { const hm = homes[id]; if (hm && Math.hypot(hm.x - e.x, hm.z - e.z) > 300) continue; const on = lit > 0 && (this.litFrac >= 1 || this.lit[id]); if (on) this.put(n, I, gr, gg, gb, true); else this.put(n, I, dark[0] * 0.7, dark[1] * 0.7, dark[2] * 0.8, tm.glowLit > 0.9); }
        // The theatre sea: rows of cut waves sliding past one another.
        const sz = Math.floor(e.z / 10) * 10, sx = Math.floor(e.x / 14) * 14, sea = this.seaTint;
        for (let i = -20; i < 26; i++) {
            const z = sz + i * 10; if (z < 44) continue;
            const wob = Math.sin(t * 0.52 + z * 0.33) * 7, bob = Math.sin(t * 0.95 + z * 0.21) * 0.24, tone = (i & 1 ? 1 : 0.93) * (1.05 - Math.min(0.12, (z - 44) / 900));
            this.put("wave", this.trs(sx + wob + ((Math.floor(z / 10) & 1) ? 7 : 0), bob, z), tone * sea[0], tone * sea[1], tone * sea[2]);
        }
        const fz0 = Math.max(0, Math.floor(e.z / 30) * 30 + 240);
        for (let i = -40; i < 34; i++) { const z = Math.floor(e.z / 30) * 30 + i * 30; if (z < 54 || Math.abs(z - e.z) < 240) continue; this.put("wave", this.trs(sx, -0.8, z, 0, 3), 0.93 * sea[0], 0.93 * sea[1], 0.93 * sea[2]); }
        // Living things around the town.
        for (const b of this.boats) { const q = Math.sin(t * 1.1 + b.x) * 0.1; this.put("kittiwake", this.trs(b.x, Math.sin(t + b.z) * 0.18, b.z, b.yaw + q * 0.2, 0.42), b.c[0] * 1.5, b.c[1] * 1.5, b.c[2] * 1.5); }
        if (this.boat) this.put("kittiwake", this.trs(this.boat.x, Math.sin(t * 1.2) * 0.3 + 0.3, this.boat.z, this.boat.yaw, 1), 1, 1, 1, false, true);
        for (let i = 0; i < 10; i++) {
            const R = 44 + 18 * hash(i), w = 0.14 + hash(i + 9) * 0.1, an = t * w + i * 1.3, gx = 30 + Math.sin(i * 2) * 90, gz = 110 + Math.cos(i * 3) * 50, gy = 38 + 14 * hash(i + 3) + Math.sin(t * 0.4 + i) * 3;
            const fl2 = Math.sin(t * 5 + i * 2) > 0;
            this.put(fl2 ? "gullA" : "gullB", this.trs(gx + Math.cos(an) * R, gy, gz + Math.sin(an) * R, -an + Math.PI, 1.1));
        }
        { const m = landmarks.mill, r0 = t * 0.5; for (let i = 0; i < 4; i++) { const an = r0 + i * 1.5708, ca = Math.cos(an), sa = Math.sin(an); this.put("sail", this.basis([ca, sa, 0], [-sa, ca, 0], [0, 0, 1], m.x, m.y + 18, m.z + 7.2), 1, 1, 1, false, true); } }
        { const kx = -122 + Math.sin(t * 0.4) * 5, ky = 62 + Math.sin(t * 0.7) * 3; this.put("kite", this.trs(kx, ky, 78, 0.4 + Math.sin(t * 0.5) * 0.3)); }
        for (let i = 0; i < CLOUDS.length; i++) { const q = CLOUDS[i], x = q[0] + Math.sin(t * 0.02 + i) * 26, yaw = Math.atan2(e.x - x, e.z - q[2]), n = q[3] ? "cloudB" : "cloudA"; this.put(n, this.trs(x, q[1], q[2], yaw, 1.5 + 0.5 * hash(i)), this.cloudTint[0], this.cloudTint[1], this.cloudTint[2], true); }
        // Thermals: curls of paper smoke climbing out of the chimneys.
        for (let i = 0; i < thermals.length; i++) {
            const T = thermals[i]; if (Math.hypot(T.x - e.x, T.z - e.z) > 300) continue;
            const span = T.top - T.y, warm = T.kind === "bonfire", pc = this.puffTint;
            for (let n = 0; n < 7; n++) {
                const k = frac(t * 0.11 + n / 7 + hash(i)), y = T.y + 1 + k * span * 0.86, w = Math.sin(k * 7 + i + t * 0.5) * (1 + k * 3.4), sz2 = (0.5 + k * 2.6) * Math.min(1, (1 - k) * 4), tone = 0.9 + 0.1 * Math.sin(n);
                this.put("puff", this.trs(T.x + w, y, T.z + w * 0.5, Math.atan2(e.x - T.x, e.z - T.z), sz2), tone * pc[0], tone * pc[1] * (warm ? 0.92 : 1), tone * pc[2] * (warm ? 0.8 : 1), true);
            }
        }
        // Sun-warmed walls shimmer with rising flecks.
        if (tm.warm > 0) for (let wi = 0; wi < warmWalls.length; wi++) {
            const w = warmWalls[wi], sunny = (w.n[0] * this.sun[0] + w.n[1] * this.sun[1]) * tm.warm; if (sunny <= 0.05) continue;
            for (let i = 0; i < 90; i++) {
                const u = hash(i + wi * 100), x = w.a[0] + (w.b[0] - w.a[0]) * u, z = w.a[1] + (w.b[1] - w.a[1]) * u, di = 1 + hash(i + 7) * w.reach * 0.8, px = x + w.n[0] * di, pz = z + w.n[1] * di; if (Math.abs(px - e.x) + Math.abs(pz - e.z) > 170) continue;
                const k = frac(t * (0.16 + hash(i + 3) * 0.12) + hash(i + 1)), y = w.y0 + k * 40;
                this.put("scrap", this.trs(px + Math.sin(t + i) * 1.4, y, pz, t * 2 + i, 0.5 * Math.sin(k * 3.14)), 1.15, 0.92, 0.62, true);
            }
        }
        // Ribbons: taped helixes, with chevrons streaming through them.
        for (let i = 0; i < ribbons.length; i++) {
            const R = ribbons[i], bx = (R.box[0] + R.box[3]) / 2, bz = (R.box[2] + R.box[5]) / 2; this.put(`ribbon${i}`, I, 1, 1, 1, false, false);
            const hc = hex(R.hue), n = R.pts.length, stepC = 5, ph = t * R.speed / 4 / stepC;
            for (let k = 0; k < n / stepC; k++) {
                const q = (k + frac(ph)) * stepC, j = Math.floor(q) % n, P = R.pts[j], T = R.tan[j]; if (Math.abs(P[0] - e.x) + Math.abs(P[2] - e.z) > 190) continue;
                this.along("chevron", P[0], P[1], P[2], T[0], T[1], T[2], 1.5, 1.7, Math.min(1.2, hc[0] * 1.2), Math.min(1.2, hc[1] * 1.2), Math.min(1.2, hc[2] * 1.2), true);
            }
        }
        // Letters waiting, hoops, stamps.
        for (const g of this.rings) {
            const yaw = g.yaw ?? (t * 0.5 + g.x), pulse = 1 + Math.sin(t * 3 + g.x) * 0.04, name = g.kind === "letter" ? "wreath" : g.done ? "hoopDone" : "hoop", sc = (g.scale ?? 1) * pulse;
            if (g.kind === "letter" || !g.done) {
                const dist = Math.hypot(g.x - e.x, g.z - e.z), th = Math.max(0.2, dist * 0.002), cc = g.kind === "letter" ? [1.05, 0.48, 0.36] : [1, 0.78, 0.3];
                this.put("scrap", this.trs(g.x, g.y + 190, g.z, Math.atan2(e.x - g.x, e.z - g.z), th, 370, 1), cc[0], cc[1], cc[2], true);
            }
            this.put(name, this.trs(g.x, g.y, g.z, yaw, sc), 1, 1, 1, this.time === 3, true);
            if (g.kind === "letter") this.put("env", this.trs(g.x, g.y + Math.sin(t * 2 + g.z) * 0.35, g.z, -t * 1.1 + g.x, 2.1), 1, 1, 1, this.time === 3);
        }
        for (const q of this.stamps) { if (Math.hypot(q.x - e.x, q.z - e.z) > 280) continue; this.put("stamp", this.trs(q.x, q.y + Math.sin(t * 2 + q.x) * 0.3, q.z, t * 1.6 + q.x, 1.3), 1, 1, 1, true, true); }
        if (this.doll) { const q = this.doll; this.put(`doll_${q.id}`, this.trs(q.x, q.y, q.z, q.yaw, q.k * 1.4), 1, 1, 1, this.time === 3); }
        for (let i = 0; i < this.lanterns && i < this.lanternPts.length; i++) { const q = this.lanternPts[i], fl = 0.9 + 0.1 * Math.sin(t * 6 + i); this.put("puff", this.trs(q[0], q[1], q[2], i, 0.34 * fl), 1.3, 1.02, 0.55, true); }
        if (this.beam) { const L = landmarks.light, an = t * 0.7; for (const q of [0, Math.PI]) { const dx = Math.cos(an + q), dz = Math.sin(an + q); this.along("dash", L.x + dx * 4, L.y + 37.5, L.z + dz * 4, dx, -0.02, dz, 6, 220, 1.25, 1.05, 0.65, true); } }
        // Air: flecks of paper streaming past, the strongest sense of speed there is.
        if (f) {
            const sp = f.speed, k = Math.min(1, sp / f.cfg.vt);
            for (const m of this.motes) { const len = 0.1 + sp * 0.017; this.along("dash", m.x, m.y, m.z, f.vx || 0.1, f.vy, f.vz || 0.1, 0.022 + m.l * 0.01, len, 1.1, 1.08, 1.02, true); }
            if (f.state === "fly" && (sp > f.cfg.vt * 1.18 || f.alpha > 0.16)) for (const q of this.tips) for (let i = 1; i < q.length; i++) { const p = q[i - 1], n = q[i]; this.along("dash", p[0], p[1], p[2], n[0] - p[0], n[1] - p[1], n[2] - p[2], 0.03 + i * 0.002, Math.hypot(n[0] - p[0], n[1] - p[1], n[2] - p[2]), 1.2, 1.2, 1.2, true); }
        }
        for (const q of this.scraps) this.put("scrap", this.basis([Math.cos(q.a), 0, Math.sin(q.a)], [0, Math.cos(q.a * 0.7), Math.sin(q.a * 0.7)], [-Math.sin(q.a), 0.2, Math.cos(q.a)], q.x, q.y, q.z, q.s), q.c[0], q.c[1], q.c[2], true);
        if (f && this.showPlane !== false) this.drawPlane(f, a);
    }
    drawPlane(f, a) {
        const x = f.px + (f.x - f.px) * a, y = f.py + (f.y - f.py) * a, z = f.pz + (f.z - f.pz) * a, t = this.t, night = this.time === 3;
        if (f.state !== "fly") {
            const k = f.state === "crumple" ? 0 : Math.min(1, (f.t - f.t0) / 0.95), sp = f.spin ?? 0;
            if (k < 0.72) {
                const m = this.mat(), c = Math.cos(sp), s = Math.sin(sp), q = 1 + (k > 0 ? Math.sin(k * 20) * 0.08 : 0);
                m.set([c * q, s * q, 0, 0, -s * q, c * q, 0, 0, 0, 0, q, 0, x, y, z, 1]);
                this.put(k < 0.3 ? "ball" : "ball2", m, 1, 1, 1, false, true); return;
            }
        }
        const d = f.dir, u = f.up, r = f.right, wob = f.stalled ? Math.sin(t * 26) * 0.2 : 0, al = Math.min(0.5, f.alpha * 0.9), ca = Math.cos(al), sa = Math.sin(al);
        // Nose up by the angle of attack, so a stall visibly hangs on its tail.
        const fw = [d[0] * ca + u[0] * sa, d[1] * ca + u[1] * sa, d[2] * ca + u[2] * sa], up0 = [u[0] * ca - d[0] * sa, u[1] * ca - d[1] * sa, u[2] * ca - d[2] * sa];
        const cw = Math.cos(wob), sw = Math.sin(wob), R = [r[0] * cw + up0[0] * sw, r[1] * cw + up0[1] * sw, r[2] * cw + up0[2] * sw], U = [up0[0] * cw - r[0] * sw, up0[1] * cw - r[1] * sw, up0[2] * cw - r[2] * sw];
        const stretch = 1 + Math.min(0.28, Math.max(0, f.speed / f.cfg.vt - 1) * 0.22), w = 1 / Math.sqrt(stretch), pop = f.state === "unfold" ? 1 + Math.sin((f.t - f.t0) * 9) * 0.1 : 1;
        let mesh = this.planeMesh;
        if (mesh === "plane_crane") mesh = f.flap > 0.55 ? "plane_crane_up" : f.flap > 0.15 ? "plane_crane_down" : "plane_crane";
        const big = 1.22, m = this.basis(R, U, [-fw[0], -fw[1], -fw[2]], x, y, z, w * pop * big, pop * big, stretch * pop * big);
        this.put(mesh, m, 1, 1, 1, false, true);
        if (this.carry) this.put("env", this.basis(R, [fw[0], fw[1], fw[2]], U, x - U[0] * 0.28 + fw[0] * 0.15, y - U[1] * 0.28 + fw[1] * 0.15, z - U[2] * 0.28 + fw[2] * 0.15, 0.24), 1, 1, 1, night);
    }
}
export { homes };
