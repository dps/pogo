// Turns a baked Course into something to look at, and keeps the moving parts in step with the sim.
import { billboard, color, mesh, pos, rot } from "./pogo.js";
import { CELL, BALL_R, CUP_R, GRASS, GREEN, ROUGH, SAND, ICE, ROCK, WOOD, LAVA, WATER, SNOW, MAT } from "./course.js";
import { MB, hex, mix, mul } from "./meshkit.js";
import { LOOK, groundColor } from "./look.js";
import { scenery } from "./models.js";
import { deckPose, geyserIn, geyserOn, plantOpen, sweepAngle } from "./sim.js";

const TILE = 4;     // world units per mirrored detail tile; a whole number of cells
const tri = (v) => { const t = ((v / TILE) % 2 + 2) % 2; return t > 1 ? 2 - t : t; };
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rngOf = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

const NAMES = ["sky", "fair", "solid", "base", "pool", "poolw", "volc", "sea"];

export class Stage {
    constructor(game, s, course, sim, opts = {}) {
        this.game = game; this.s = s; this.c = course; this.sim = sim; this.L = LOOK[course.island]; this.opts = opts;
        this.items = []; this.fxT = 0;
        const L = this.L;
        s.background = L.sky;
        s.light.dir.set(...L.sun); s.light.color = color(L.sunCol); s.light.sky = color(L.skyL); s.light.ground = color(L.groundL);
        s.light.shadows = true; s.light.shadowRange = 26;
        s.light.fog = { color: color(L.fog), near: L.fogNear, far: L.fogFar };
        for (const n of NAMES) { try { game.assets.free(n); } catch { /* not built yet */ } }
        this.buildSky(); this.buildFair(); this.buildSolid(); this.buildBase(); this.buildPools(); this.buildSea();
        this.buildVolcano(); this.buildThings();
    }

    /** An inside-out gradient dome that follows the eye, so the horizon always meets the sea properly. */
    buildSky() {
        const L = this.L, top = hex(L.sky[0]), low = hex(L.sky[1]), m = new MB(), seg = 24, rings = 10, R = 400;
        const P = (i, j) => { const t = i / rings * Math.PI * 0.5 - 0.06, a = j / seg * Math.PI * 2; return [Math.cos(a) * Math.cos(t) * R, Math.sin(t) * R, Math.sin(a) * Math.cos(t) * R]; };
        const C = (i) => mix(low, top, Math.pow(i / rings, 0.7));
        for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) m.quad(P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j), C(i), C(i), C(i + 1), C(i + 1));
        m.register(this.game.assets, "sky");
        this.skyE = this.s.add([mesh("sky", { unlit: true, shadow: false }), pos(0, 0, 0)]);
    }

    // ------------ terrain -------------
    buildFair() {
        const c = this.c, sim = this.sim, L = this.L, { nx, nz, S, M, x0, z0 } = c, cup = c.cup_;
        const pos_ = [], nor = [], col = [], uv = [], idx = [];
        const heat = new Float32Array(nx * nz);
        for (let i = 0; i < heat.length; i++) if (M[i] === LAVA) heat[i] = 1;
        for (let r = 0; r < 4; r++) {
            const h2 = heat.slice();
            for (let k = 1; k < nz - 1; k++) for (let i = 1; i < nx - 1; i++) { const j = i + k * nx; if (heat[j] < 1) h2[j] = Math.max(heat[j], Math.max(heat[j - 1], heat[j + 1], heat[j - nx], heat[j + nx]) * 0.62); }
            heat.set(h2);
        }
        const Sm = (x, z) => Math.min(c.inFairway(x, z) ? 1 : -1, Math.hypot(x - cup.x, z - cup.z) - CUP_R);
        // Signed mesh field at grid corners: edge distance, then bite the cup out of it.
        const F = new Float32Array(nx * nz);
        for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const x = x0 + i * CELL, z = z0 + k * CELL; F[i + k * nx] = Math.min(S[i + k * nx], Math.hypot(x - cup.x, z - cup.z) - CUP_R); }
        const vert = (x, z, near) => {
            const h = sim.sample(x, z), hx = sim.hx, hz = sim.hz, l = Math.sqrt(1 + hx * hx + hz * hz), ny = 1 / l;
            const u = Math.round((x - x0) / CELL), w = Math.round((z - z0) / CELL), j = clamp(u, 0, nx - 1) + clamp(w, 0, nz - 1) * nx;
            let mat = M[near ?? j]; if (!mat || mat === LAVA || mat === WATER) { mat = M[near ?? j] === LAVA || M[near ?? j] === WATER ? ROCK : mat || GRASS; }
            const n = hash(Math.round(x * 4), Math.round(z * 4));
            const co = groundColor(L, mat, x, z, ny, Math.min(S[j], 1), heat[j], n);
            pos_.push(x, h, z); nor.push(-hx / l, ny, -hz / l); col.push(co[0], co[1], co[2]); uv.push(tri(x), tri(z));
            return pos_.length / 3 - 1;
        };
        const grid = new Int32Array(nx * nz).fill(-1), edges = new Map();
        const G = (i, k) => { const j = i + k * nx; if (grid[j] < 0) grid[j] = vert(x0 + i * CELL, z0 + k * CELL, j); return grid[j]; };
        const E = (i, k, dir) => {
            const key = (i + k * nx) * 2 + dir;
            let v = edges.get(key);
            if (v === undefined) {
                const a = i + k * nx, b = dir ? a + nx : a + 1, t = F[a] / (F[a] - F[b]), x = x0 + (i + (dir ? 0 : t)) * CELL, z = z0 + (k + (dir ? t : 0)) * CELL;
                v = vert(x, z, F[a] > 0 ? a : b); edges.set(key, v);
            }
            return v;
        };
        const poly = (list) => { for (let i = 1; i < list.length - 1; i++) idx.push(list[0], list[i + 1], list[i]); };
        for (let k = 0; k < nz - 1; k++) for (let i = 0; i < nx - 1; i++) {
            const a = F[i + k * nx] > 0, b = F[i + 1 + k * nx] > 0, d = F[i + (k + 1) * nx] > 0, e = F[i + 1 + (k + 1) * nx] > 0;
            const code = (a ? 1 : 0) | (b ? 2 : 0) | (e ? 4 : 0) | (d ? 8 : 0);
            if (!code) continue;
            const A = () => G(i, k), B = () => G(i + 1, k), C = () => G(i + 1, k + 1), D = () => G(i, k + 1), T = () => E(i, k, 0), Bt = () => E(i, k + 1, 0), Lf = () => E(i, k, 1), Rt = () => E(i + 1, k, 1);
            // Walked in increasing angle in x/z, which faces up after the winding flip in poly().
            switch (code) {
                case 15: poly([A(), B(), C(), D()]); break;
                case 1: poly([A(), T(), Lf()]); break; case 2: poly([T(), B(), Rt()]); break; case 4: poly([Rt(), C(), Bt()]); break; case 8: poly([Lf(), Bt(), D()]); break;
                case 3: poly([A(), B(), Rt(), Lf()]); break; case 6: poly([T(), B(), C(), Bt()]); break; case 12: poly([Lf(), Rt(), C(), D()]); break; case 9: poly([A(), T(), Bt(), D()]); break;
                case 7: poly([A(), B(), C(), Bt(), Lf()]); break; case 14: poly([T(), B(), C(), D(), Lf()]); break; case 13: poly([A(), T(), Rt(), C(), D()]); break; case 11: poly([A(), B(), Rt(), Bt(), D()]); break;
                case 5: poly([A(), T(), Rt(), C(), Bt(), Lf()]); break; case 10: poly([T(), B(), Rt(), Bt(), D(), Lf()]); break;
            }
        }
        this.game.assets.mesh("fair", { positions: pos_, normals: nor, colors: col, uvs: uv, indices: idx });
        this.s.add([mesh("fair", { texture: "detail" }), pos(0, 0, 0)]);
        this.verts = pos_.length / 3;
    }

    buildSolid() {
        const c = this.c, L = this.L, m = new MB(), sim = this.sim;
        const rail = c.island === 2 ? L.rail : L.rail;
        // Cliff skirt around every fairway edge, in strata.
        for (const loop of c.outline) {
            const s = loop.length > 6 ? loop.filter((_, i) => i % 3 === 0 || i === loop.length - 1) : loop;
            for (let i = 0; i < s.length - 1; i++) {
                const a = s[i], b = s[i + 1], ya = sim.sample(a[0], a[1]), yb = sim.sample(b[0], b[1]), drop = 3.4;
                const A = [a[0], ya, a[1]], B = [b[0], yb, b[1]];
                for (let lv = 0; lv < 3; lv++) {
                    const t0 = lv * drop / 3, t1 = (lv + 1) * drop / 3, col = lv % 2 ? L.cliff2 : L.cliff, k = 1 - lv * 0.1, sn = 0.14 * lv;
                    m.quad([b[0], yb - t1, b[1]], [a[0], ya - t1, a[1]], [a[0], ya - t0 + 0.03, a[1]], [b[0], yb - t0 + 0.03, b[1]], mul(col, k * 0.8), mul(col, k * 0.8), mul(col, k), mul(col, k));
                    m.quad([a[0], ya - t1, a[1]], [b[0], yb - t1, b[1]], [b[0], yb - t0 + 0.03, b[1]], [a[0], ya - t0 + 0.03, a[1]], mul(col, k * 0.8), mul(col, k * 0.8), mul(col, k), mul(col, k));
                }
            }
        }
        for (const r of c.railRuns) this.railMesh(m, r);
        m.register(this.game.assets, "solid");
        this.s.add([mesh("solid"), pos(0, 0, 0)]);
    }

    railMesh(m, run) {
        const c = this.c, L = this.L, pts = run.pts, th = run.th, H = run.h;
        if (H < 0.05 || pts.length < 2) return;
        // Miter the joints.
        const N = pts.map((p, i) => {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
            let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1;
            return [dz / l, -dx / l];
        });
        let along = 0;
        const groundY = pts.map((p) => c.groundAt(p[0], p[1], true));
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1], na = N[i], nb = N[i + 1], ya = groundY[i], yb = groundY[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
            const steps = Math.max(1, Math.ceil(len / 1.1));
            for (let j = 0; j < steps; j++) {
                const t0 = j / steps, t1 = (j + 1) / steps, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
                const y0 = ya + (yb - ya) * t0, y1 = ya + (yb - ya) * t1, n0 = [na[0] + (nb[0] - na[0]) * t0, na[1] + (nb[1] - na[1]) * t0], n1 = [na[0] + (nb[0] - na[0]) * t1, na[1] + (nb[1] - na[1]) * t1];
                const band = Math.floor((along + len * t0) / 1.1) & 1, base = run.mat ? L.wall : (band ? L.rail2 : L.rail), top = run.mat ? mix(L.wall, [1, 1, 1], 0.35) : L.railTop;
                const Q = (p, n, y, o, h) => [p[0] + n[0] * o, y + h, p[1] + n[1] * o];
                const bev = Math.min(0.05, th * 0.5);
                // Two sides, two bevels, a top.
                const low = mul(base, 0.7);
                m.quad(Q(p0, n0, y0, -th, -0.2), Q(p1, n1, y1, -th, -0.2), Q(p1, n1, y1, -th, H - bev), Q(p0, n0, y0, -th, H - bev), low, low, base, base);
                m.quad(Q(p1, n1, y1, th, -0.2), Q(p0, n0, y0, th, -0.2), Q(p0, n0, y0, th, H - bev), Q(p1, n1, y1, th, H - bev), low, low, base, base);
                m.quad(Q(p0, n0, y0, -th, H - bev), Q(p1, n1, y1, -th, H - bev), Q(p1, n1, y1, -th + bev, H), Q(p0, n0, y0, -th + bev, H), top);
                m.quad(Q(p1, n1, y1, th, H - bev), Q(p0, n0, y0, th, H - bev), Q(p0, n0, y0, th - bev, H), Q(p1, n1, y1, th - bev, H), top);
                m.quad(Q(p0, n0, y0, -th + bev, H), Q(p1, n1, y1, -th + bev, H), Q(p1, n1, y1, th - bev, H), Q(p0, n0, y0, th - bev, H), top);
            }
            along += len;
        }
        // Caps.
        for (const i of [0, pts.length - 1]) { const p = pts[i], y = groundY[i]; m.cyl(p[0], y - 0.2, p[1], th * 1.25, H + 0.26, 8, run.mat ? L.wall : L.post, { top: L.railTop, shade: 0.75 }); }
    }

    buildBase() {
        const c = this.c, L = this.L, m = new MB(), { bx, bz, B, bStep: st, b0x, b0z } = c, seaY = c.seaLevel;
        const V = (i, k) => [b0x + i * st, B[i + k * bx], b0z + k * st];
        const pick = (y, sl, n) => {
            if (y < seaY + 0.18) return mix(L.beach, L.sea, 0.45);
            if (y < seaY + 0.85) return L.beach;
            if (sl > 1.5) return mix(L.cliff, L.cliff2, n);
            return mix(L.hill, mul(L.hill, 0.86), n);
        };
        for (let k = 0; k < bz - 1; k++) for (let i = 0; i < bx - 1; i++) {
            const a = V(i, k), b = V(i + 1, k), d = V(i, k + 1), e = V(i + 1, k + 1);
            if (Math.max(a[1], b[1], d[1], e[1]) < seaY - 0.8) continue;
            const flip = (i + k) & 1, n = hash(i, k);
            const P = (p, q, r) => {
                const sl = Math.abs(p[1] - q[1]) + Math.abs(q[1] - r[1]) + Math.abs(p[1] - r[1]), my = (p[1] + q[1] + r[1]) / 3;
                m.tri(p, r, q, pick(my, sl * 0.33, n));
            };
            if (flip) { P(a, b, d); P(b, e, d); } else { P(a, b, e); P(a, e, d); }
        }
        // Scenery: the hole's hand-placed props, then a seeded scatter on the surrounding land.
        const r = rngOf(c.def.name.length * 31 + (c.def.par * 7));
        for (const p of c.props) {
            if (p.kind === "cave") continue;
            scenery(m, p.kind, p.x, c.inFairway(p.x, p.z) ? c.groundAt(p.x, p.z) : Math.max(c.baseAt(p.x, p.z), seaY), p.z, r, L);
        }
        const kinds = c.island === 0 ? ["palm", "palm", "fern", "fern", "stone", "flower", "flower"] : c.island === 1 ? ["pine", "pine", "crystal", "stone", "stone"] : ["basalt", "obsidian", "stone", "stone"];
        const span = c.span, N = 90;
        for (let i = 0; i < N; i++) {
            const x = span.x0 - 22 + r() * (span.x1 - span.x0 + 44), z = span.z0 - 22 + r() * (span.z1 - span.z0 + 44), y = c.baseAt(x, z);
            if (y < seaY + 0.7 || this.nearFair(x, z, 2.2)) continue;
            scenery(m, kinds[Math.floor(r() * kinds.length)], x, y, z, r, L);
        }
        m.register(this.game.assets, "base");
        this.s.add([mesh("base"), pos(0, 0, 0)]);
    }
    nearFair(x, z, d) { for (let a = 0; a < 8; a++) if (this.c.inFairway(x + Math.cos(a * 0.785) * d, z + Math.sin(a * 0.785) * d)) return true; return this.c.inFairway(x, z); }

    buildPools() {
        const c = this.c, { nx, x0, z0 } = c;
        const build = (mat, name, tint) => {
            const P = [], Cc = [], U = [], I = [];
            const seen = new Set();
            for (const p of c.pools) {
                if (p.mat !== mat) continue;
                for (const j of p.cells) {
                    if (seen.has(j)) continue;
                    seen.add(j);
                    const k = Math.floor(j / nx), i = j - k * nx, X = x0 + i * CELL, Z = z0 + k * CELL, b = P.length / 3, y = p.y;
                    const T = 3, fu = ((X / T) % 1 + 1) % 1, fv = ((Z / T) % 1 + 1) % 1, du = CELL / T;
                    for (const [a, e] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { P.push(X + a * CELL, y, Z + e * CELL); U.push(Math.min(1, fu + a * du), Math.min(1, fv + e * du)); Cc.push(...tint); }
                    I.push(b, b + 3, b + 2, b, b + 2, b + 1);
                }
            }
            if (!P.length) return null;
            this.game.assets.mesh(name, { positions: P, normals: P.map((_, i) => (i % 3 === 1 ? 1 : 0)), colors: Cc, uvs: U, indices: I });
            return this.s.add([mesh(name, { texture: mat === LAVA ? "lava0" : "sea0", unlit: true, shadow: false }), pos(0, 0, 0)]);
        };
        this.lavaE = build(LAVA, "pool", [1.3, 1.25, 1.2]);
        this.waterE = build(WATER, "poolw", [0.3, 0.86, 1.05]);
    }

    buildSea() {
        const L = this.L, P = [], Cc = [], U = [], I = [], cx = (this.c.span.x0 + this.c.span.x1) / 2, cz = (this.c.span.z0 + this.c.span.z1) / 2, N = 44, st = this.c.island === 2 ? 14 : 10;
        const lava = this.c.island === 2, far = hex(L.fog);
        const col = (x, z) => { const q = clamp((Math.hypot(x - cx, z - cz) - 20) / (N * st * 0.42), 0, 1); return lava ? mix(mix(L.sea, L.seaDeep, q * 1.4 > 1 ? 1 : q * 1.4), far, q * q) : mix(L.sea, L.seaDeep, q); };
        for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) {
            const x = cx + (i - N / 2) * st, z = cz + (k - N / 2) * st, b = P.length / 3;
            for (const [a, e] of [[0, 0], [1, 0], [1, 1], [0, 1]]) { const px = x + a * st, pz = z + e * st, co = col(px, pz); P.push(px, this.c.seaLevel, pz); U.push(a, e); Cc.push(co[0], co[1], co[2]); }
            I.push(b, b + 3, b + 2, b, b + 2, b + 1);
        }
        this.game.assets.mesh("sea", { positions: P, normals: P.map((_, i) => (i % 3 === 1 ? 1 : 0)), colors: Cc, uvs: U, indices: I });
        this.seaE = this.s.add([mesh("sea", { texture: lava ? "lava0" : "sea0", unlit: lava, shadow: false }), pos(0, 0, 0)]);
    }

    buildVolcano() {
        const L = this.L, c = this.c, m = new MB(), isl = c.island;
        const vo = this.opts.volc, cx = (c.span.x0 + c.span.x1) / 2 + (vo ? vo[0] : [-30, 44, 6][isl]), cz = c.span.z0 + (vo ? vo[1] : [-66, -72, -74][isl]), H = [50, 44, 62][isl], R = [52, 48, 60][isl], seg = 26, rings = 9;
        const top = [hex("#6a4a50"), hex("#d8e0ff"), hex("#3a2630")][isl], bot = [hex("#3fb06a"), hex("#7f7fc0"), hex("#2e2028")][isl];
        const P = (i, j) => {
            const t = i / rings, a = j / seg * Math.PI * 2, n = 1 + 0.09 * Math.sin(a * 5 + i) + 0.05 * Math.sin(a * 11 - i * 2), r = (R * Math.pow(1 - t, 1.5) + 8) * n;
            return [cx + Math.cos(a) * r, H * (1 - Math.pow(1 - t, 1.25)) - 1 + (i ? Math.sin(a * 3 + i * 2) * 0.8 : 0), cz + Math.sin(a) * r];
        };
        for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
            const a = P(i, j), b = P(i, j + 1), d = P(i + 1, j), e = P(i + 1, j + 1), t = (i + 0.5) / rings;
            let col = mix(bot, top, Math.min(1, t * 2.6));
            // Lava runs down the face in three tongues.
            const sw = (j + 200) % 9 === 3 && i > 2 ? 1 : 0;
            if (sw) col = isl === 1 ? mix(col, [1, 0.5, 0.4], 0.35) : [1.5, 0.42, 0.1];
            m.tri(a, e, b, mul(col, 0.92 + ((i + j) % 2) * 0.1)); m.tri(a, d, e, mul(col, 0.86 + ((i + j) % 3) * 0.06));
        }
        // Old Grumble's face: he is always watching the putting.
        const faceA = vo ? 1.3 : isl === 1 ? 2.2 : isl === 0 ? 1.1 : 1.57, S = (t, a, off = 1.03) => { const ty = 1 - Math.pow(1 - t, 1.25), r = (R * Math.pow(1 - t, 1.5) + 8) * off; return [cx + Math.cos(a) * r, H * ty - 1, cz + Math.sin(a) * r]; };
        const glow = isl === 1 ? [1.5, 0.8, 1.4] : [2.4, 1.05, 0.14], dark = [0.05, 0.03, 0.06];
        for (const e of [-1, 1]) {
            const inn = faceA + e * 0.1, out = faceA + e * 0.36;
            m.tri(S(0.46, inn, 1.07), S(0.46, out, 1.07), S(0.61, out, 1.08), e > 0 ? dark : dark); m.tri(S(0.46, out, 1.07), S(0.46, inn, 1.07), S(0.61, out, 1.08), dark);
            m.tri(S(0.48, inn, 1.09), S(0.49, out, 1.09), S(0.58, out, 1.1), glow); m.tri(S(0.49, out, 1.09), S(0.48, inn, 1.09), S(0.58, out, 1.1), glow);
        }
        for (let i = 0; i < 10; i++) { const a0 = faceA + (i - 5) * 0.07, a1 = a0 + 0.07, up = i % 2 ? 0.02 : 0, dn = i % 2 ? 0 : 0.02, l0 = 0.3 + up, l1 = 0.3 + dn; m.tri(S(l0, a0, 1.09), S(l1, a1, 1.09), S(l1 + 0.035, a1, 1.1), glow); m.tri(S(l1, a1, 1.09), S(l0, a0, 1.09), S(l1 + 0.035, a1, 1.1), glow); m.tri(S(l0, a0, 1.09), S(l1 + 0.035, a1, 1.1), S(l0 + 0.035, a0, 1.1), glow); m.tri(S(l1 + 0.035, a1, 1.1), S(l0, a0, 1.09), S(l0 + 0.035, a0, 1.1), glow); }
        // The crater glows.
        const crater = [cx, H * 0.985 + 0.2, cz], rt = 8;
        for (let j = 0; j < seg; j++) { const a0 = j / seg * 6.2832, a1 = (j + 1) / seg * 6.2832; m.tri(crater, [cx + Math.cos(a1) * rt, H - 1, cz + Math.sin(a1) * rt], [cx + Math.cos(a0) * rt, H - 1, cz + Math.sin(a0) * rt], isl === 1 ? [1.2, 0.9, 0.9] : [2.8, 1.1, 0.2]); }
        m.register(this.game.assets, "volc");
        this.s.add([mesh("volc", { shadow: false }), pos(0, 0, 0)]);
        this.volcTop = [cx, H, cz];
        // Slow smoke from the top and a few fixed clouds.
        this.smoke = [];
        for (let i = 0; i < 6; i++) this.smoke.push(this.s.add([billboard("smoke", { size: 16, unlit: true, color: isl === 2 ? "#40303a" : "#e8e0e8" }), pos(cx, H + i * 6, cz), { p: i / 6 }]));
        const r = rngOf(9 + isl);
        if (isl < 2) for (let i = 0; i < 7; i++) { const a = r() * 6.28, d = 170 + r() * 60; this.s.add([billboard("cloud", { size: 26 + r() * 22, unlit: true, color: isl ? "#ffd8e6" : "#ffffff" }), pos((c.span.x0 + c.span.x1) / 2 + Math.cos(a) * d, 34 + r() * 40, (c.span.z0 + c.span.z1) / 2 + Math.sin(a) * d)]); }
    }

    // ------------ things ------------
    deckMesh(name, d) {
        const m = new MB(), L = this.L, th = d.th, hw = d.hw, hd = d.hd;
        if (d.R) {
            const seg = 40, R = d.R, base = d.mat === ICE ? L.ice : d.mat === ROCK ? L.rock : L.grass, alt = d.mat === ICE ? [1, 1, 1] : d.mat === ROCK ? L.rock2 : L.green;
            for (let i = 0; i < seg; i++) {
                const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, c = Math.floor(i / 5) % 2 ? base : alt;
                const P = (r, a, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
                m.tri([0, 0, 0], P(R - 0.32, a1, 0), P(R - 0.32, a0, 0), c);
                m.quad(P(R - 0.32, a1, 0), P(R, a1, 0), P(R, a0, 0), P(R - 0.32, a0, 0), Math.floor(i / 2) % 2 ? L.rail2 : L.rail);
                m.quad(P(R, a0, -th), P(R, a0, 0), P(R, a1, 0), P(R, a1, -th), mul(L.cliff2, 0.8), L.cliff, L.cliff, mul(L.cliff2, 0.8));
            }
            m.cyl(0, 0, 0, 0.5, 0.03, 16, L.rail2, { shade: 1 });
        } else {
            const style = d.style, n = Math.max(1, Math.round(hd * 2 / 0.46));
            if (style === "ice") { m.box(0, -th, 0, hw * 2, th, hd * 2, L.ice, { top: mix(L.ice, [1, 1, 1], 0.4), bottom: true }); }
            else if (style === "ledge") { m.box(0, -th, 0, hw * 2, th, hd * 2, L.rock2, { top: L.rock, bottom: true }); }
            else if (style === "ramp") { m.box(0, -th, 0, hw * 2, th, hd * 2, L.rail2, { top: L.rail, bottom: true }); for (let i = 0; i < 3; i++) m.quad([-hw * 0.6, 0.01, hd * (0.5 - i * 0.6)], [hw * 0.6, 0.01, hd * (0.5 - i * 0.6)], [0, 0.01, hd * (0.1 - i * 0.6)], [0, 0.01, hd * (0.1 - i * 0.6)], L.rail2); }
            else {
                for (let i = 0; i < n; i++) {
                    const z = -hd + (i + 0.5) * hd * 2 / n, c = mix(style === "raft" ? hex("#9a6a3c") : L.wood, [1, 0.9, 0.7], ((i * 7) % 5) * 0.05), w = hw * 2 - (style === "raft" ? 0 : ((i * 3) % 3) * 0.02);
                    m.box(0, -th * 0.5, z, w, th * 0.5, hd * 2 / n * 0.96, c, { bottom: true, shade: 0.7 });
                }
                m.box(-hw + 0.1, -th, 0, 0.2, th * 0.6, hd * 2, mul(L.wood, 0.6), { bottom: true });
                m.box(hw - 0.1, -th, 0, 0.2, th * 0.6, hd * 2, mul(L.wood, 0.6), { bottom: true });
            }
        }
        m.register(this.game.assets, name);
    }

    buildThings() {
        const { s, c, game, L } = this, A = game.assets;
        this.deckE = c.decks.map((d, i) => { const n = "deck" + i; try { A.free(n); } catch { /* new */ } this.deckMesh(n, d); return s.add([mesh(n), pos(d.x, d.y, d.z)]); });
        this.bumperE = c.posts.map((p) => s.add([mesh(p.kick ? "bumper" : c.island === 1 ? "rockpostice" : "rockpost", { size: p.kick ? [p.r * 2, p.h, p.r * 2] : [p.r * 2.04, p.h, p.r * 2.04], shine: p.kick ? 0.5 : 0 }), pos(p.x, p.y, p.z), { hit: 0 }]));
        this.sweepE = c.sweepers.map((w) => {
            const hub = s.add([mesh("sweephub"), pos(w.x, w.y, w.z)]);
            const arms = []; for (let i = 0; i < w.arms; i++) arms.push(s.add([mesh("sweepbar", { size: [w.len, 0.36, w.th * 2] }), pos(w.x, w.y, w.z)]));
            return { hub, arms };
        });
        this.geyE = c.geysers.map((g) => {
            const v = s.add([mesh("vent"), pos(g.x, g.y, g.z)]); v.scale.set(g.r * 1.25, 1, g.r * 1.25);
            const p = s.add([mesh(g.lava ? "plumelava" : "plume", { size: [g.r * 1.2, 1, g.r * 1.2], unlit: true, shadow: false }), pos(g.x, g.y, g.z), { hidden: true, opacity: 0.8 }]);
            return { v, p };
        });
        this.plantE = c.plants.map((p) => {
            const k = p.ice ? "plantice" : "plant", S = p.s;
            const stem = s.add([mesh(k + "stem"), pos(p.x, p.y, p.z), rot(0, 0, 0)]); stem.scale.set(S, S, S);
            const head = s.add([{ dim: 3 }, pos(p.x, p.y + 1.15 * S, p.z), rot(0, 0, 0)]);
            head.dim = 3;
            const up = s.add([mesh(k + "up", { shine: 0.3 }), pos(p.x, p.y + 1.15 * S, p.z), rot(0, 0, 0)]);
            const lo = s.add([mesh(k + "lo", { shine: 0.3 }), pos(p.x, p.y + 1.15 * S, p.z), rot(0, 0, 0)]);
            return { stem, up, lo, head, yaw: 0, open: 0, punch: 0 };
        });
        for (const t of c.tubes) {
            const pr = c.props.find((q) => q.kind === "cave" && Math.hypot(q.x - t.x, q.z - t.z) < 1.2);
            s.add([mesh("cave"), pos(t.x, t.y + 0.2, t.z), rot(0, pr ? pr.dir : 0, 0)]).scale.set(1.15, 1.15, 1.15);
        }
        for (const p of c.props) if (p.kind === "cave" && !c.tubes.some((t) => Math.hypot(p.x - t.x, p.z - t.z) < 1.2)) s.add([mesh("cave"), pos(p.x, c.groundAt(p.x, p.z, true) + 0.2, p.z), rot(0, p.dir ?? 0, 0)]).scale.set(1.15, 1.15, 1.15);
        this.boostE = c.boosts.map((b) => s.add([mesh("arrow", { size: [b.r * 2, 0.02, b.r * 2], unlit: true, shadow: false }), pos(b.x, b.y + 0.04, b.z), rot(0, -b.dir, 0)]));
        this.secretE = c.secrets.map((q) => s.add([mesh("shell", { size: [0.5, 0.42, 0.5], shine: 0.7 }), pos(q.x, q.y + 0.1, q.z), rot(0, 0, 0)]));
        const cup = c.cup_;
        s.add([mesh("cupwall", { unlit: true, shadow: false, size: [0.8, 0.7, 0.8] }), pos(cup.x, cup.y + 0.005, cup.z)]);
        s.add([mesh("cupring", { size: [0.98, 0.01, 0.98], shadow: false }), pos(cup.x, cup.y + 0.004 - 0.05, cup.z)]);
        this.pole = s.add([mesh("flagpole", { size: [0.2, 2.72, 0.2] }), pos(cup.x, cup.y, cup.z)]);
        this.flag = s.add([mesh("flag0", { size: [1.05, 0.6, 0.2], shadow: false }), pos(cup.x + 0.5, cup.y + 2.2, cup.z), { lift: 0 }]);
        const t = c.tee_;
        s.add([mesh("tee", { size: [1.5, 0.05, 1.5] }), pos(t.x, t.y - BALL_R + 0.01, t.z)]);
    }

    /** Called every step. */
    update(dt) {
        const { s, c, sim, game } = this, t = sim.t, fx = game.fxRng;
        this.fxT += dt;
        const pose = {}, eye = s.cam3.pos;
        this.skyE.pos.set(eye.x, 0, eye.z);
        c.decks.forEach((d, i) => { deckPose(d, t, pose); const e = this.deckE[i]; e.pos.set(pose.x, pose.y, pose.z); e.rot.set(pose.tilt, pose.yaw, 0); });
        this.bumperE.forEach((e, i) => { if (!c.posts[i].kick) return; const k = 1 + 0.28 * Math.exp(-(t - sim.bumpT[i]) * 9) * (t - sim.bumpT[i] < 1 ? 1 : 0); e.scale.set(k, 2 - k, k); });
        c.sweepers.forEach((w, i) => {
            const a0 = sweepAngle(w, t), E = this.sweepE[i];
            E.hub.rot.y = -a0;
            E.arms.forEach((e, k) => { const a = a0 + k * Math.PI * 2 / w.arms; e.rot.y = -a; e.pos.set(w.x + Math.cos(a) * w.len / 2, w.y, w.z + Math.sin(a) * w.len / 2); });
        });
        c.geysers.forEach((g, i) => {
            const E = this.geyE[i], on = geyserOn(g, t), left = geyserIn(g, t);
            E.p.hidden = !on;
            if (on) {
                const ph = ((t / g.period + g.phase) % 1) * g.period / g.on, h = Math.sin(Math.min(1, ph) * Math.PI) * (g.lava ? 5.5 : 7);
                E.p.size.set(g.r * 1.3 * (1 + 0.1 * Math.sin(t * 40)), h, g.r * 1.3 * (1 + 0.1 * Math.sin(t * 40)));
                if (fx.range(1) < 0.5) s.burst({ at: [g.x + fx.range(-0.3, 0.3), g.y + h * fx.range(0.4, 1), g.z + fx.range(-0.3, 0.3)], count: 1, color: g.lava ? ["#ffb347", "#ff5a1f"] : ["#ffffff", "#d8ecff"], speed: [0.5, 2.5], life: [0.3, 0.7], size: [0.12, 0.36], gravity: g.lava ? -8 : 2, dim: 3 });
            } else if (left < 1 && fx.range(1) < 0.4) {
                // The warning: it hisses and spits before it blows.
                s.burst({ at: [g.x + fx.range(-0.3, 0.3), g.y + 0.1, g.z + fx.range(-0.3, 0.3)], count: 1, color: g.lava ? ["#ff8a2a", "#ffe066"] : ["#ffffff"], speed: [0.5, 1.5], life: [0.2, 0.5], size: [0.06, 0.18], gravity: 0, dim: 3 });
            }
        });
        c.plants.forEach((p, i) => {
            const E = this.plantE[i], ate = t - sim.ate[i], spat = t - sim.spat[i], open = plantOpen(p, t), S = p.s;
            let goal = open ? 1 : 0.06;
            if (ate >= 0 && ate < p.hold + 0.05) goal = 0;
            if (spat >= 0 && spat < 0.35) goal = 1.25;
            E.open += (goal - E.open) * Math.min(1, dt * (goal < E.open ? 22 : 7));
            const dx = sim.x - p.x, dz = sim.z - p.z, want = spat < 0.8 ? Math.atan2(p.to[0] - p.x, p.to[2] - p.z) : Math.atan2(dx, dz);
            let dy = want - E.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
            E.yaw += dy * Math.min(1, dt * 5);
            const breathe = 1 + Math.sin(t * 3 + i) * 0.03, gulp = ate >= 0 && ate < p.hold ? 1 + 0.26 * Math.sin(Math.min(1, ate / p.hold) * Math.PI) * (1 + 0.3 * Math.sin(ate * 24)) : 1;
            const hy = p.y + (1.12 + (ate >= 0 && ate < p.hold ? 0.1 : 0)) * S, ang = 0.09 + E.open * 0.62;
            for (const [e, sign] of [[E.up, 1], [E.lo, -1]]) {
                e.pos.set(p.x, hy - E.open * 0.12 * S, p.z);
                e.rot.set(-ang * sign, E.yaw, 0);
                const k = breathe * gulp * S * 1.3; e.scale.set(k, k, k);
            }
            E.stem.scale.set(gulp * S, S, gulp * S);
            if (open && fx.range(1) < 0.03) s.burst({ at: [p.x + Math.sin(E.yaw) * 0.5, hy, p.z + Math.cos(E.yaw) * 0.5], count: 1, color: ["#7dffa0", "#ffd23f"], speed: [0.2, 0.8], life: [0.4, 0.8], size: [0.05, 0.12], gravity: 4, dim: 3 });
        });
        this.secretE.forEach((e, i) => {
            const q = c.secrets[i], d = Math.hypot(sim.x - q.x, sim.z - q.z);
            e.rot.y = t * 1.4; e.pos.y = q.y + 0.12 + Math.sin(t * 2) * 0.07;
            e.hidden = sim.secret;
            if (!sim.secret && fx.range(1) < 0.04) s.burst({ at: [q.x + fx.range(-0.3, 0.3), q.y + 0.2, q.z + fx.range(-0.3, 0.3)], count: 1, color: ["#ffffff", "#ffd6ec"], speed: [0.1, 0.4], life: [0.4, 0.8], size: [0.05, 0.11], dim: 3 });
        });
        this.boostE.forEach((e) => { e.color = Math.sin(t * 8) > 0 ? "#ffe36b" : "#ffb347"; });
        const f = Math.floor(this.fxT * 7);
        this.flag.mesh = "flag" + (f % 4);
        const lava = "lava" + (Math.floor(this.fxT * 6) % 6), sea = "sea" + (Math.floor(this.fxT * 4) % 5);
        if (this.lavaE) this.lavaE.texture = lava;
        if (this.waterE) this.waterE.texture = sea;
        this.seaE.texture = c.island === 2 ? lava : sea;
        const vt = this.volcTop;
        for (const e of this.smoke) { e.p = (e.p + dt * 0.035) % 1; const u = e.p; e.pos.set(vt[0] + Math.sin(u * 9 + e.p) * 4 + u * 14, vt[1] + u * 40, vt[2]); e.opacity = (u < 0.2 ? u * 5 : 1 - (u - 0.2) / 0.8) * 0.75; e.scale.set(0.7 + u * 2.2, 0.7 + u * 2.2, 1); }
    }
}
