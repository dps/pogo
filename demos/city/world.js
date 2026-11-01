// The diorama: reads the sim and draws it. Static things are merged into a few meshes; anything that moves is an instance.
import { color } from "./pogo.js";
import { BUILDINGS, HOURS, STEP } from "./data.js";
import { DIRS, RADIUS, SQ3, cornerX, cornerZ, hexDist, hexX, hexZ, nearestHex } from "./hex.js";
import { MB, PAL, getModel, rgb } from "./models.js";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const yawTo = (dx, dz) => Math.atan2(dx, dz);

export const topY = (c) => (c.h >= 0 ? c.h * STEP : c.shallow ? -0.5 : -0.95);
const BED = -1.25;

/** Sun, sky and table through the day. Each row: hour, sun colour, sky ambient, ground ambient, backdrop top, backdrop bottom. */
const SKY = [
    [0, "#4a5a86", "#66769c", "#3e4667", "#10183a", "#1b2650"],
    [4.5, "#4a5a86", "#66769c", "#3e4667", "#141c43", "#232c5c"],
    [6.5, "#ffb37a", "#8c94bf", "#6a5a7d", "#f4a98a", "#ffd9a8"],
    [8.5, "#fff0cf", "#c6dcef", "#a79a88", "#a9e1ee", "#f7efd6"],
    [14, "#fff4dc", "#cfe6f5", "#b5a68f", "#a6e0ee", "#fbf2da"],
    [17, "#ffd59a", "#c0c6dc", "#a08a84", "#f7c79a", "#fde2b4"],
    [18.8, "#ff9a68", "#8f88b5", "#6a4f76", "#e9805f", "#7c5f96"],
    [20.5, "#4a5a86", "#66769c", "#3e4667", "#1d2452", "#2c2f66"],
    [24, "#4a5a86", "#66769c", "#3e4667", "#10183a", "#1b2650"],
].map(([h, ...c]) => [h, ...c.map(rgb)]);
const STORM = ["#7b8aa0", "#6f8096", "#46525f", "#55657a", "#333f52"].map(rgb);
const GRASS = ["#9fd873", "#83c763", "#dcc463", "#f4f8f9"].map(rgb);
const LEAF = ["#9fe07e", "#72c262", "#e5943f", "#d9e4e0"].map(rgb);

function skyAt(hour) {
    let i = 0;
    while (i < SKY.length - 2 && SKY[i + 1][0] <= hour) i++;
    const a = SKY[i], b = SKY[i + 1], t = (hour - a[0]) / (b[0] - a[0]);
    return a.map((v, k) => (k ? mix(v, b[k], t) : hour));
}

export class World {
    constructor(s, game, sim, o = {}) {
        this.s = s; this.game = game; this.sim = sim; this.o = o;
        this.a = game.assets;
        this.fx = game.fxRng;
        for (const c of sim.cells) {
            c.x = hexX(c.q, c.r); c.z = hexZ(c.q, c.r);
            c.shallow = c.h < 0 && c.n.some((j) => sim.cells[j].h >= 0);
        }
        this.vis = new Map();
        this.hops = [];                // Buildings out of the merged mesh, mid-bounce.
        this.ghost = null;
        this.rings = [];
        this.walkers = [];
        this.puffs = [];
        this.dust = [];
        this.waves = [];
        this.drops = [];
        this.boats = new Map();
        this.gulls = [];
        this.spinners = [];
        this.beams = [];
        this.dirtyTown = true;
        this.dirtyWater = true;
        this.time = 0;
        this.water = sim.water;
        this.stormVis = 0;
        this.dark = 0;
        this.glow = 0;
        this.rainAmt = 0;
        this.snowAmt = 0;
        this.windT = 0;
        this.shipT = 0.15;
        this.seasonMix = sim.seasonIndex;
        this.tintGrass = GRASS[sim.seasonIndex];
        this.tintLeaf = LEAF[sim.seasonIndex];
        this.flash = 0;
        this.nat = new Map();
        this.cam = { yaw: o.yaw ?? -0.5, pitch: 0.93, dist: 0, tYaw: o.yaw ?? -0.5, tPitch: 0.93, tDist: 0, minD: 10, maxD: 50, lift: 0 };
        this.reef = sim.cells.filter((c) => c.h < 0 && !c.shallow);
        this.buildGround();
        this.initWaves();
        for (let i = 0; i < 6; i++) this.gulls.push({ a: this.fx.range(0, 6.28), r: this.fx.range(3, 7), y: this.fx.range(1.6, 3), v: this.fx.range(0.25, 0.5) * (i % 2 ? 1 : -1), cx: this.fx.range(-3, 3), cz: this.fx.range(-3, 3), f: this.fx.range(0, 6) });
        this.clouds = [0, 1, 2].map((i) => ({ x: -13 + i * 11, z: -8 + i * 7, y: 5 + (i % 2) * 0.8, s: 0.95 + (i % 3) * 0.3 }));
        s.light.shadows = true;
        s.light.shadowRange = 17;
        s.cam3.fov = 22;
        s.cam3.far = 300;
        this.fit(true);
        this.lightUp();
        this.rebuildWater();
        this.rebuildTown();
    }

    get hour() { return (this.clockT % HOURS + HOURS) % HOURS; }
    get clockT() { return this.sim.t + (this.o.frac?.() ?? 0); }

    // --- Static meshes ---------------------------------------------------------------------------

    upload(name, mb) {
        this.a.free(name);
        this.a.mesh(name, mb.data());
    }

    buildGround() {
        const { cells } = this.sim, g = new MB(), gr = new MB();
        g.jit = 0.018; gr.jit = 0.035;
        const SIDE = { 0: ["#f6e4b1", "#e0c58b"], 1: ["#c79a64", "#a97d4e"], 2: ["#bd9160", "#9a7249"], 3: ["#b2aa9a", "#8f887c"] };
        for (const c of cells) {
            const y = topY(c), x = c.x, z = c.z;
            if (c.h < 0) {
                const bed = c.shallow ? "#f2dfa9" : "#58b4b4";
                g.poly(this.hexPts(x, y, z, 1.0), bed, [x, y - 1, z]);
            } else {
                const top = this.tileTop(c), target = c.h === 0 || c.h === 3 ? g : gr;
                target.poly(this.hexPts(x, y, z, 0.955), top, [x, y - 1, z]);
                for (let i = 0; i < 6; i++) {
                    const j = (i + 1) % 6;
                    target.poly([[x + cornerX(i) * 0.955, y, z + cornerZ(i) * 0.955], [x + cornerX(j) * 0.955, y, z + cornerZ(j) * 0.955], [x + cornerX(j), y - 0.045, z + cornerZ(j)], [x + cornerX(i), y - 0.045, z + cornerZ(i)]], top, [x, y - 1, z]);
                }
            }
            for (let i = 0; i < 6; i++) {
                const n = this.neighbour(c, i), other = n ? topY(n) : BED;
                const [p, q] = this.edgeCorners(i);
                const low = n ? other : BED, hi = c.h >= 0 ? y - 0.045 : y;
                if (hi <= low) continue;
                const sc = c.h >= 0 ? SIDE[c.h] : ["#3f90a0", "#2a7188"];
                const mid = Math.max(low, hi - 0.18);
                g.poly([[x + p[0], hi, z + p[1]], [x + q[0], hi, z + q[1]], [x + q[0], mid, z + q[1]], [x + p[0], mid, z + p[1]]], sc[0], [x, hi, z]);
                if (mid > low) g.poly([[x + p[0], mid, z + p[1]], [x + q[0], mid, z + q[1]], [x + q[0], low, z + q[1]], [x + p[0], low, z + p[1]]], sc[1], [x, mid, z]);
            }
        }
        this.upload("ground", g);
        this.upload("grass", gr);
        // The plinth: every tile stands in a chunky wooden board, so the tray is the shape of the hex map.
        const t = new MB();
        for (const c of cells) {
            t.poly(this.hexPts(c.x, BED - 0.5, c.z, 1.03), PAL.dark, [c.x, 0, c.z]);
            for (let d = 0; d < 6; d++) {
                if (this.neighbour(c, d)) continue;
                const [p, q] = this.edgeCorners(d);
                t.poly([[c.x + p[0], BED + 0.05, c.z + p[1]], [c.x + q[0], BED + 0.05, c.z + q[1]], [c.x + q[0], BED - 0.5, c.z + q[1]], [c.x + p[0], BED - 0.5, c.z + p[1]]], "#8a5a33", [c.x, BED, c.z]);
            }
        }
        this.upload("plinth", t);
    }

    hexPts(x, y, z, r) {
        const pts = [];
        for (let i = 0; i < 6; i++) pts.push([x + cornerX(i) * r, y, z + cornerZ(i) * r]);
        return pts;
    }

    neighbour(c, dir) {
        const j = this.sim.index.get(`${c.q + DIRS[dir][0]},${c.r + DIRS[dir][1]}`);
        return j === undefined ? null : this.sim.cells[j];
    }

    /** The two corners, as offsets, of the side facing DIRS[dir]. */
    edgeCorners(dir) {
        const dx = hexX(DIRS[dir][0], DIRS[dir][1]), dz = hexZ(DIRS[dir][0], DIRS[dir][1]), l = Math.hypot(dx, dz);
        const a = Math.atan2(dz / l, dx / l), p = a - Math.PI / 6, q = a + Math.PI / 6;
        return [[Math.cos(p), Math.sin(p)], [Math.cos(q), Math.sin(q)]];
    }

    tileTop(c) {
        const v = ((c.q * 7 + c.r * 13) & 3) * 0.018;
        if (c.h === 0) return [0.97 - v, 0.9 - v, 0.71 - v];
        if (c.h === 3) return [0.74 - v, 0.72 - v, 0.67 - v];
        const k = c.h === 2 ? 1 : 0.95;
        return [k - v, k - v, k - v];
    }

    /** Tufts, flowers, shells and the woods. Rebuilt into the town mesh so a building can clear them. */
    decoInto(c, g, gr, l, sn, tr) {
        let seed = (c.q + 7) * 7349 + (c.r + 7) * 1789 + 1009;     // Same tufts on every rebuild.
        const r = (n) => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000 * n; };
        const y = topY(c), x = c.x, z = c.z;
        if (c.forest) {
            const n = 4 + (r(3) | 0);
            for (let i = 0; i < n; i++) {
                const a = i * 2.3 + r(1), rr = i ? 0.28 + r(0.42) : r(0.1), size = 1.3 + r(0.9);
                const px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, ty = y;
                tr.cyl(px, ty, pz, 0.03 * size, 0.1 * size, PAL.dark, 5);
                const shade = i % 3 === 0 ? "#6dbb68" : i % 3 === 1 ? "#5ba75e" : "#7fc972";
                l.turn(px, pz, [[0.15 * size, ty + 0.07 * size], [0.015, ty + 0.3 * size]], shade, 6);
                l.turn(px, pz, [[0.115 * size, ty + 0.2 * size], [0.012, ty + 0.42 * size]], shade, 6);
                sn.turn(px, pz, [[0.06 * size, ty + 0.34 * size], [0.008, ty + 0.43 * size]], PAL.white, 6);
            }
            return;
        }
        if (c.h === 0) {
            for (let i = 0; i < 3; i++) {
                const a = r(6.28), rr = r(0.7);
                g.ball(x + Math.cos(a) * rr, y + 0.008, z + Math.sin(a) * rr, 0.018 + r(0.018), i % 2 ? "#e9d3c2" : "#f7c6b4", 4);
            }
        } else if (c.h === 3) {
            for (let i = 0; i < 4; i++) {
                const a = r(6.28), rr = r(0.62), sz = 0.08 + r(0.12);
                g.box(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, sz, sz * 0.7, sz, i % 2 ? PAL.stone : PAL.stone2, 0.72);
            }
        } else {
            for (let i = 0; i < 7; i++) {
                const a = r(6.28), rr = r(0.72), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr;
                if (i < 4) gr.poly([[px - 0.03, y, pz], [px + 0.03, y, pz], [px, y + 0.06 + r(0.03), pz + 0.004]], "#c9d9c0", [px, y + 0.03, pz - 1]);
                else {
                    g.cyl(px, y, pz, 0.005, 0.04, "#4f8f4d", 3);
                    g.ball(px, y + 0.045, pz, 0.016, ["#fff6e0", "#f8d24a", "#f28b9b"][i % 3], 4);
                }
            }
            if (r(1) > 0.72) {
                const a = r(6.28), rr = r(0.5);
                g.box(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr, 0.1, 0.06, 0.08, PAL.stone2, 0.7);
            }
        }
    }

    visOf(b) {
        let v = this.vis.get(b.id);
        if (!v) {
            const c = this.sim.cells[b.cell];
            v = { variant: (b.id * 5 + c.q * 3 + c.r * 2 + 40) % 60, yaw: 0, type: b.type };
            if (b.type === "dock" || b.type === "yard") v.yaw = this.seaYaw(c);
            else if (b.type === "wall") v.yaw = 0;
            else v.yaw = this.frontYaw(c, b);
            this.vis.set(b.id, v);
        }
        return v;
    }

    /** Which way does the pier go? Towards the longest run of open water. */
    seaYaw(c) {
        let best = 0, bestScore = -1;
        for (let d = 0; d < 6; d++) {
            let n = this.neighbour(c, d), run = 0;
            while (n && n.h < 0 && run < 4) { run++; n = this.neighbour(n, d); }
            if (run > bestScore) { bestScore = run; best = d; }
        }
        return yawTo(-hexX(...DIRS[best]), -hexZ(...DIRS[best]));
    }

    /** Doors look at the neighbour with the most going on. */
    frontYaw(c, b) {
        let best = 0, bestScore = -9;
        for (let d = 0; d < 6; d++) {
            const n = this.neighbour(c, d), t = n?.b?.type;
            const score = (t === "lane" ? 3 : t === "market" ? 3 : t === "hall" ? 2.5 : t ? 1 : 0) + ((d + b.id) % 6) * 0.1;
            if (score > bestScore) { bestScore = score; best = d; }
        }
        return yawTo(hexX(...DIRS[best]), hexZ(...DIRS[best]));
    }

    surface(c) {
        const b = c.b;
        const y = topY(c);
        return b && !b.wrecked && BUILDINGS[b.type].stilts && c.h === 0 ? STEP : b?.type === "wall" && !b.wrecked ? y + STEP * 1.5 + 0.02 : y;
    }

    baseY(b, c) {
        if (b.type === "dock" || b.type === "yard") return 0.08;
        return this.surface(c);
    }

    /** Merge the town. Called on any change; a full rebuild is a millisecond or two. */
    rebuildTown() {
        this.dirtyTown = false;
        const { cells, buildings } = this.sim;
        const solid = new MB(), glow = new MB(), leaf = new MB(), snow = new MB(), pads = new MB(), gr = new MB(), lit = new MB();
        pads.jit = solid.jit = gr.jit = leaf.jit = 0;
        this.spinners.length = 0;
        this.beams.length = 0;
        this.smokers = [];
        this.lamps = [];
        const hopping = new Set(this.hops.map((h) => h.id));
        for (const c of cells) if (c.h >= 0 && !c.b) this.decoInto(c, solid, gr, leaf, snow, solid);
        for (const b of buildings) {
            const c = cells[b.cell], v = this.visOf(b), base = this.surface(c), type = b.wrecked ? "ruin" : b.type;
            // The ground under it.
            if (type === "lane" && c.h === 0) this.boardwalk(pads, c);
            else if (type === "farm" || type === "wall" || b.type === "dock" || b.type === "yard") void 0;
            else if (type === "garden") pads.poly(this.hexPts(c.x, topY(c) + 0.012, c.z, 0.9), "#9ccf7d", [c.x, -9, c.z]);
            else if (type === "lane") { pads.poly(this.hexPts(c.x, topY(c) + 0.012, c.z, 0.93), "#d7c5a0", [c.x, -9, c.z]); this.cobbles(pads, c); }
            else {
                pads.poly(this.hexPts(c.x, topY(c) + 0.012, c.z, 0.93), "#d9c8a4", [c.x, -9, c.z]);
                pads.poly(this.hexPts(c.x, topY(c) + 0.016, c.z, 0.66), "#ecdfbd", [c.x, -9, c.z]);
            }
            for (let d = 0; d < 3; d++) {
                const n = this.neighbour(c, d);
                if (n?.b && b.type !== "wall" && n.b.type !== "wall") this.linkStrip(pads, c, n);
            }
            const m = getModel(type, v.variant), y = b.type === "dock" || b.type === "yard" ? 0.08 : base;
            if (hopping.has(b.id)) continue;
            solid.append(m.solid, v.yaw, c.x, y, c.z);
            glow.append(m.glow, v.yaw, c.x, y, c.z);
            leaf.append(m.leaf, v.yaw, c.x, y, c.z);
            snow.append(m.snow, v.yaw, c.x, y, c.z);
            this.collect(m, b, c, v, y);
        }
        for (let i = 0; i < glow.c.length; i++) glow.c[i] = 1;
        // Warm pools of light on the ground at night.
        lit.jit = 0;
        for (const l of this.lamps) {
            const r = 1, base = lit.count;
            lit.p.push(l[0] - r, l[1], l[2] - r, l[0] + r, l[1], l[2] - r, l[0] + r, l[1], l[2] + r, l[0] - r, l[1], l[2] + r);
            lit.n.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
            lit.c.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
            lit.i.push(base, base + 2, base + 1, base, base + 3, base + 2);
            lit.uv = lit.uv ?? [];
            lit.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
        }
        const litData = lit.data();
        if (lit.uv) litData.uvs = lit.uv;
        this.a.free("pools");
        this.a.mesh("pools", litData);
        pads.grounded(-9, 1);
        solid.append(pads);
        this.upload("town", solid);
        this.upload("townGlow", glow);
        this.upload("townLeaf", leaf);
        this.upload("townSnow", snow);
        this.upload("townGrass", gr);
    }

    collect(m, b, c, v, y) {
        const cs = Math.cos(v.yaw), sn = Math.sin(v.yaw);
        const P = (p) => [c.x + p[0] * cs + p[2] * sn, y + p[1], c.z - p[0] * sn + p[2] * cs];
        for (const p of m.smoke) this.smokers.push({ p: P(p), b, heavy: b.type === "smoke" });
        for (const p of m.spin) this.spinners.push({ p: P(p), yaw: v.yaw, b });
        if (m.beam) this.beams.push({ p: P(m.beam), b });
        if (b.type === "cottage" || b.type === "hall" || b.type === "pub") { const q = P([0, 0, 0.42]); this.lamps.push([q[0], topY(c) + 0.024, q[2]]); }
        for (const p of m.lamp) { const q = P(p); this.lamps.push([q[0], Math.max(topY(c), y - 0.2) + 0.024, q[2]]); }
        if (m.flag) this.flag = P(m.flag);
    }

    cobbles(pads, c) {
        for (let i = 0; i < 18; i++) {
            const a = i * 2.4, r = 0.15 + (i % 6) * 0.13;
            pads.box(c.x + Math.cos(a) * r, topY(c) + 0.012, c.z + Math.sin(a) * r, 0.11, 0.008, 0.08, i % 2 ? "#c4b18c" : "#e0d0ad");
        }
    }

    boardwalk(pads, c) {
        const y = STEP - 0.03;
        for (let i = 0; i < 7; i++) {
            const z = c.z - 0.72 + i * 0.24;
            const w = 1.72 * (1 - Math.abs(i - 3) / 3 * 0.42);
            pads.box(c.x, y, z, w, 0.03, 0.21, i % 2 ? PAL.wood : "#c58a50");
        }
        for (let i = 0; i < 6; i++) pads.cyl(c.x + cornerX(i) * 0.7, topY(c) - 0.1, c.z + cornerZ(i) * 0.7, 0.03, y - topY(c) + 0.1, PAL.dark, 5);
    }

    /** A worn track across the shared edge of two built tiles; a little ramp if they differ in height. */
    linkStrip(pads, a, b) {
        const ya = this.surface(a) + 0.014, yb = this.surface(b) + 0.014, dx = (b.x - a.x) / SQ3, dz = (b.z - a.z) / SQ3;
        const px = -dz * 0.24, pz = dx * 0.24, c0 = 0.7, c1 = SQ3 - 0.7;
        const stilt = BUILDINGS[a.b.type].stilts || BUILDINGS[b.b.type].stilts;
        const col = stilt ? "#c58a50" : "#d9c8a4";
        const q = [[a.x + dx * c0 - px, ya, a.z + dz * c0 - pz], [a.x + dx * c0 + px, ya, a.z + dz * c0 + pz], [a.x + dx * c1 + px, yb, a.z + dz * c1 + pz], [a.x + dx * c1 - px, yb, a.z + dz * c1 - pz]];
        pads.poly(q, col, [(a.x + b.x) / 2, Math.min(ya, yb) - 1, (a.z + b.z) / 2]);
    }

    /** The surface of the sea as far as it has reached: holes where walls keep it out. */
    rebuildWater() {
        this.dirtyWater = false;
        const top = new MB(), side = new MB(), foam = new MB(), wash = new MB();
        top.jit = side.jit = foam.jit = wash.jit = 0;
        const { cells } = this.sim;
        const isWater = (c) => c.h < 0 || c.wet;
        for (const c of cells) {
            if (!isWater(c)) continue;
            top.poly(this.hexPts(c.x, 0, c.z, 1), "#ffffff", [c.x, -1, c.z]);
            for (let d = 0; d < 6; d++) {
                const n = this.neighbour(c, d);
                const [p, q] = this.edgeCorners(d);
                if (!n) {
                    side.poly([[c.x + p[0], 0, c.z + p[1]], [c.x + q[0], 0, c.z + q[1]], [c.x + q[0], -1, c.z + q[1]], [c.x + p[0], -1, c.z + p[1]]], "#ffffff", [c.x, -0.5, c.z]);
                } else if (!isWater(n) || (n.b && n.b.type === "wall")) {
                    for (const [mb, w] of [[foam, 0.1], [wash, 0.3]]) {
                        const k = 1 - w;
                        mb.poly([[c.x + p[0], 0, c.z + p[1]], [c.x + q[0], 0, c.z + q[1]], [c.x + q[0] * k, 0, c.z + q[1] * k], [c.x + p[0] * k, 0, c.z + p[1] * k]], "#ffffff", [c.x, -1, c.z]);
                    }
                }
            }
        }
        this.upload("waterTop", top);
        this.upload("waterSide", side);
        this.upload("foam", foam);
        this.upload("wash", wash);
    }

    // --- Camera ----------------------------------------------------------------------------------

    /** Frame the land for this screen, leaving room for the HUD. */
    fit(snap) {
        const v = this.s.view, land = this.sim.cells.filter((c) => c.h >= 0);
        let r = 0;
        for (const c of land) r = Math.max(r, Math.hypot(c.x, c.z));
        const tall = v.height / v.width > 1;
        const need = r + 0.5;
        const fy = this.s.cam3.fov * Math.PI / 360;
        const portraitDist = need / Math.tan(fy);
        const wide = (need * 0.92) / Math.tan(fy);
        const d = tall ? portraitDist * 1.02 : wide * (this.o.title ? 1.12 : 1.5);
        this.cam.lift = this.o.title ? 0 : tall ? 0.16 : 0.42;
        this.cam.home = d;
        this.cam.minD = d * 0.32;
        this.cam.maxD = d * 1.55;
        this.cam.tDist = d;
        if (snap) { this.cam.dist = d; }
        this.applyCam(true);
    }

    applyCam(cut) {
        const c = this.cam, cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
        const ex = Math.sin(c.yaw) * cp, ez = Math.cos(c.yaw) * cp;
        const lift = (c.lift ?? 0) * c.dist * 0.1;
        const tx = -Math.sin(c.yaw) * -lift, tz = -Math.cos(c.yaw) * -lift;
        const px = (c.panX ?? 0), pz = (c.panZ ?? 0);
        const cam = this.s.cam3;
        const target = [tx + px, 0.3, tz + pz], eye = [target[0] + ex * c.dist, target[1] + sp * c.dist, target[2] + ez * c.dist];
        if (cut) cam.set(eye, target);
        else { cam.pos.set(eye); cam.target.set(target); }
    }

    /** The tile under a view point, walking the ray down through the land. */
    pick(px, py) {
        const ray = this.s.cam3.ray(px, py), o = ray.origin, d = ray.dir;
        if (d.y >= 0) return null;
        for (let y = 1.25; y >= -0.3; y -= 0.05) {
            const t = (y - o.y) / d.y, x = o.x + d.x * t, z = o.z + d.z * t;
            const [q, r] = nearestHex(x, z), i = this.sim.index.get(`${q},${r}`);
            if (i === undefined) continue;
            const c = this.sim.cells[i];
            if (Math.max(topY(c), 0) >= y - 0.001) return c;
        }
        return null;
    }

    // --- Moving things ---------------------------------------------------------------------------

    initWaves() {
        const n = 90;
        for (let i = 0; i < n; i++) this.waves.push(this.newWave());
    }

    newWave() {
        const a = this.fx.range(0, 6.28), r = Math.sqrt(this.fx.range(0.06, 1)) * (RADIUS + 0.6) * SQ3;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, t: this.fx.range(0, 1), life: this.fx.range(1.8, 3.4), yaw: this.fx.range(-0.5, 0.5), s: this.fx.range(0.5, 1.1) };
    }

    hop(b, delay = 0, power = 1) {
        if (this.hops.some((h) => h.id === b.id)) return;
        this.hops.push({ id: b.id, b, t: -delay, power });
        this.dirtyTown = true;
    }

    /** Drop a new building from the air. */
    plonk(b, power = 1) {
        this.hops = this.hops.filter((h) => h.id !== b.id);
        this.hops.push({ id: b.id, b, t: 0, drop: 0.2, power });
        this.dirtyTown = true;
    }

    puffAt(x, y, z, n, o = {}) {
        for (let i = 0; i < n; i++) {
            if (this.dust.length > 90) this.dust.shift();
            const a = i / n * 6.28 + this.fx.range(0, 0.5), v = this.fx.range(o.v0 ?? 0.8, o.v1 ?? 1.9);
            this.dust.push({ x: x + Math.cos(a) * 0.25, y: y + 0.04, z: z + Math.sin(a) * 0.25, vx: Math.cos(a) * v, vy: this.fx.range(0.1, 0.9), vz: Math.sin(a) * v, t: 0, life: this.fx.range(0.4, 0.8), s: this.fx.range(o.s0 ?? 0.14, o.s1 ?? 0.3), c: o.color ?? [0.95, 0.88, 0.74] });
        }
    }

    /** A route through built tiles, door to door. Returns points, or null if there's no way. */
    route(from, to) {
        const { cells } = this.sim, prev = new Map([[from, -1]]), q = [from];
        while (q.length) {
            const u = q.shift();
            if (u === to) break;
            for (const j of cells[u].n) {
                if (prev.has(j)) continue;
                const b = cells[j].b;
                if (!b || b.wrecked || b.wet) continue;
                prev.set(j, u);
                q.push(j);
            }
        }
        if (!prev.has(to)) return null;
        const tiles = [];
        for (let u = to; u !== -1; u = prev.get(u)) tiles.unshift(cells[u]);
        const pts = [];
        const rim = 0.8;
        let inA = null;
        tiles.forEach((c, i) => {
            const next = tiles[i + 1];
            const y = this.surface(c) + 0.02;
            const outA = next ? Math.atan2(next.z - c.z, next.x - c.x) : null;
            if (inA === null && outA !== null) inA = outA + Math.PI;
            if (outA === null && inA !== null) { pts.push([c.x + Math.cos(inA) * 0.72, y, c.z + Math.sin(inA) * 0.72]); return; }
            if (inA !== null && outA !== null) {
                let d = outA - inA;
                while (d > Math.PI) d -= 2 * Math.PI;
                while (d < -Math.PI) d += 2 * Math.PI;
                const steps = Math.ceil(Math.abs(d) / (Math.PI / 3));
                for (let k = 0; k <= steps; k++) {
                    const a = inA + d * k / Math.max(1, steps), r = k === 0 || k === steps ? 0.84 : rim;
                    pts.push([c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r]);
                }
                inA = outA + Math.PI;
            }
        });
        return pts;
    }

    send(from, to, o = {}) {
        if (this.walkers.length >= (o.cap ?? 60) || from === to) return;
        const pts = this.route(from, to);
        if (!pts || pts.length < 2) return;
        let len = 0;
        const seg = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2]) + 1e-3;
            seg.push(l); len += l;
        }
        const C = ["#e0694a", "#2f9c95", "#f0b43c", "#33557a", "#8f5a84", "#f2a596", "#7cc36a", "#ffffff"];
        const skins = ["#f3c9a0", "#e7b08a", "#b9805a", "#f6d7b8"];
        this.walkers.push({ pts, seg, len, d: 0, i: 0, s: 0, v: this.fx.range(0.8, 1.15) * (o.fast ? 1.5 : 1), col: rgb(o.color ?? C[this.fx.range(0, 8) | 0]), skin: rgb(skins[this.fx.range(0, 4) | 0]), crate: o.crate ?? false, phase: this.fx.range(0, 6) });
    }

    /** Boats sail out through open water and are back at their building's work hour. */
    boatOf(b) {
        let v = this.boats.get(b.id);
        if (v) return v;
        const c = this.sim.cells[b.cell], vis = this.visOf(b);
        const hx = -Math.sin(vis.yaw), hz = -Math.cos(vis.yaw);
        const berth = [c.x + hx * 1.1 + hz * 0.4, c.z + hz * 1.1 - hx * 0.4];
        const path = this.seaPath(berth, b.id);
        v = { path, b, yaw: 0, x: berth[0], z: berth[1], kind: null };
        this.boats.set(b.id, v);
        return v;
    }

    seaPath(berth, seed) {
        const { cells, index } = this.sim;
        const [q0, r0] = nearestHex(berth[0], berth[1]);
        const start = index.get(`${q0},${r0}`) ?? cells.find((c) => c.h < 0).i;
        const prev = new Map([[start, -1]]), q = [start];
        const clear = (c) => c.h < 0;
        let far = [];
        while (q.length) {
            const u = q.shift(), cu = cells[u];
            if (hexDist(cu.q, cu.r, 0, 0) >= RADIUS - 1 && !cu.shallow) far.push(u);
            for (const j of cu.n) if (!prev.has(j) && clear(cells[j])) { prev.set(j, u); q.push(j); }
        }
        if (!far.length) far = [start];
        far = far.slice(0, 16);
        const end = far[seed * 3 % far.length];
        const chain = [];
        for (let u = end; u !== -1; u = prev.get(u)) chain.unshift(cells[u]);
        const pts = [berth, ...chain.slice(1).map((c) => [c.x, c.z])];
        const out = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
            for (let k = 0; k < 6; k++) {
                const t = k / 6, t2 = t * t, t3 = t2 * t;
                const f = (n) => 0.5 * (2 * b[n] + (c[n] - a[n]) * t + (2 * a[n] - 5 * b[n] + 4 * c[n] - d[n]) * t2 + (3 * b[n] - a[n] - 3 * c[n] + d[n]) * t3);
                out.push([f(0), f(1)]);
            }
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    update(dt) {
        const sim = this.sim;
        this.time += dt;
        this.windT += dt * (1 + this.stormVis * 4);
        // Water follows the sim smoothly, including between ticks.
        const t = this.clockT;
        const target = sim.waterAt(t);
        this.water += (target - this.water) * Math.min(1, dt * 7);
        this.stormVis += (sim.stormB - this.stormVis) * Math.min(1, dt * 1.6);
        const season = sim.seasonIndex;
        this.tintGrass = mix(this.tintGrass, GRASS[season], Math.min(1, dt * 0.6));
        this.tintLeaf = mix(this.tintLeaf, LEAF[season], Math.min(1, dt * 0.6));
        this.snowAmt += ((season === 3 ? 1 : 0) - this.snowAmt) * Math.min(1, dt * 0.8);
        this.lightUp();
        if (this.dirtyWater) this.rebuildWater();
        const before = this.hops.length;
        for (const h of this.hops) h.t += dt;
        this.hops = this.hops.filter((h) => {
            if (h.drop && h.t > 0.2 && !h.landed) { h.landed = true; }
            return h.t < (h.drop ? 0.72 : 0.44);
        });
        if (this.hops.length !== before) this.dirtyTown = true;
        if (this.dirtyTown) this.rebuildTown();
        // Walkers.
        for (let i = this.walkers.length - 1; i >= 0; i--) {
            const w = this.walkers[i];
            w.s += dt * 0.42 * w.v;
            while (w.i < w.seg.length && w.s >= w.seg[w.i]) { w.s -= w.seg[w.i]; w.i++; }
            if (w.i >= w.seg.length) { this.walkers.splice(i, 1); continue; }
        }
        const light = this.dark < 0.5;
        const chance = dt * (light ? 1.1 : 0.25) * (1 - this.stormVis);
        if (this.fx.range(0, 1) < chance * Math.min(3, sim.buildings.length / 5)) this.errand();
        // Chimneys.
        this.smokeT = (this.smokeT ?? 0) + dt;
        if (this.smokers?.length && this.smokeT > 0.16) {
            this.smokeT = 0;
            for (let k = 0; k < 2; k++) {
                const m = this.smokers[this.fx.range(0, this.smokers.length) | 0];
                if (this.puffs.length < 70 && !m.b.wet && !m.b.wrecked) this.puffs.push({ x: m.p[0], y: m.p[1], z: m.p[2], t: 0, life: m.heavy ? 2.8 : 2.1, s: m.heavy ? 0.13 : 0.09, sway: this.fx.range(0, 6), dark: m.heavy ? 0.62 : 0.82 });
            }
        }
        const windX = 0.1 + this.stormVis * 1.1;
        for (let i = this.puffs.length - 1; i >= 0; i--) {
            const p = this.puffs[i];
            p.t += dt;
            p.y += dt * 0.34;
            p.x += dt * (windX + Math.sin(p.sway + p.t * 1.8) * 0.05);
            if (p.t >= p.life) this.puffs.splice(i, 1);
        }
        for (let i = this.dust.length - 1; i >= 0; i--) {
            const p = this.dust[i];
            p.t += dt;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            p.vx *= 1 - dt * 3.5; p.vz *= 1 - dt * 3.5; p.vy -= dt * 0.8;
            if (p.t >= p.life) this.dust.splice(i, 1);
        }
        for (let i = 0; i < this.waves.length; i++) {
            const w = this.waves[i];
            w.t += dt / w.life * (1 + this.stormVis);
            if (w.t >= 1) this.waves[i] = this.newWave(), this.waves[i].t = 0;
        }
        // Rain and snow.
        const wantRain = this.stormVis > 0.08 ? 110 * this.stormVis + 14 : 0;
        const wantSnow = season === 3 && this.stormVis < 0.1 ? 50 : 0;
        while (this.drops.length < wantRain + wantSnow) this.drops.push(this.newDrop());
        if (this.drops.length > wantRain + wantSnow) this.drops.length = Math.floor(wantRain + wantSnow);
        const snowing = season === 3;
        for (let i = 0; i < this.drops.length; i++) {
            const p = this.drops[i];
            p.y -= dt * (snowing ? 1.0 : 11);
            p.x += dt * (snowing ? Math.sin(p.y * 2 + p.x) * 0.3 : 3.5 * this.stormVis);
            if (p.y < -0.2) {
                if (!snowing && this.fx.range(0, 1) < 0.15 && this.dust.length < 70) this.dust.push({ x: p.x, y: Math.max(this.water * STEP, 0), z: p.z, vx: 0, vy: 0.5, vz: 0, t: 0, life: 0.2, s: 0.06, c: [0.9, 0.97, 1] });
                this.drops[i] = this.newDrop();
            }
        }
        // The cameras glide.
        const c = this.cam, k = Math.min(1, dt * 11);
        c.yaw += (c.tYaw - c.yaw) * k;
        c.pitch += (c.tPitch - c.pitch) * k;
        c.dist += (c.tDist - c.dist) * Math.min(1, dt * 9);
        this.applyCam(false);
    }

    newDrop() {
        const R = 12;
        return { x: this.fx.range(-R, R), y: this.fx.range(0, 8), z: this.fx.range(-R, R) };
    }

    /** Somebody pops out: to work, to market, to the pub. */
    errand() {
        const { buildings } = this.sim;
        const homes = buildings.filter((b) => b.type === "cottage" || b.type === "hall");
        const home = homes[this.fx.range(0, homes.length) | 0];
        const spots = buildings.filter((b) => b.type !== "wall" && b !== home && !b.wrecked);
        if (!home || !spots.length) return;
        const to = spots[this.fx.range(0, spots.length) | 0];
        if (this.fx.range(0, 1) < 0.5) this.send(home.cell, to.cell);
        else this.send(to.cell, home.cell);
    }

    lightUp() {
        const hour = this.hour, s = this.s, sky = skyAt(hour);
        const st = smooth(this.stormVis * 1.25);
        const sun = mix(sky[1], STORM[0], st), a = mix(sky[2], STORM[1], st), g = mix(sky[3], STORM[2], st);
        const bgT = mix(sky[4], STORM[3], st), bgB = mix(sky[5], STORM[4], st);
        const f = this.flash;
        const add = (c, k) => [c[0] + k, c[1] + k, c[2] + k];
        const L = s.light;
        const day = hour >= 5.5 && hour < 19.6;
        const ang = day ? (hour - 5.5) / 14.1 * Math.PI : ((hour + 4.4) % 24) / 9.9 * Math.PI;
        L.dir.set(-Math.cos(ang) * 0.9, -(0.62 + Math.sin(ang) * 0.5), -0.55);
        const E = 0.66;      // Sun and ambient add up, so hold each down to keep whites in range.
        L.color = color([sun[0] * E * (1 + f), sun[1] * E * (1 + f), sun[2] * E * (1 + f)]);
        L.sky = color(add([a[0] * E, a[1] * E, a[2] * E], f));
        L.ground = color(add([g[0] * E, g[1] * E, g[2] * E], f * 0.5));
        s.background = [color(add(bgT, f * 0.5)), color(add(bgB, f * 0.5))];
        // Lights come on before it is truly dark, and in storms.
        const eve = hour < 6.8 ? 1 - smooth((hour - 5.6) / 1.2) : smooth((hour - 17.6) / 1.5);
        this.glow = Math.max(eve, st * 0.8);
        this.dark = eve;
        this.flash = Math.max(0, f - 0.06);
    }

    // --- Drawing ---------------------------------------------------------------------------------

    /** One entity's draw hook feeds the whole diorama, so this is all instances and merged meshes. */
    put(d, name, m, o = {}) {
        let n = this.nat.get(name);
        const geo = this.a.geometry(name);
        if (!n || n.g !== geo) { n = { g: geo, v: geo.natural }; this.nat.set(name, n); }
        d.mesh(name, m, { size: n.v, color: o.color ?? WHITE, unlit: o.unlit ?? false, castShadow: o.shadow ?? true, shine: o.shine ?? 0, texture: o.texture ?? null });
    }

    draw(d) {
        const I = IDENT;
        const col = (c, a = 1) => { const q = color([c[0], c[1], c[2]]); q.a = a; return q; };
        this.put(d, "plinth", I);
        this.put(d, "ground", I);
        const grass = col(this.tintGrass);
        this.put(d, "grass", I, { color: grass });
        this.put(d, "townGrass", I, { color: grass, shadow: false });
        this.put(d, "town", I);
        this.put(d, "townLeaf", I, { color: col(this.tintLeaf) });
        const off = rgb("#44586f"), on = [1.25, 0.86, 0.46], g = this.glow;
        this.put(d, "townGlow", I, { color: col(mix(off, on, g)), unlit: true, shadow: false });
        if (this.snowAmt > 0.03) {
            const k = 0.02 + smooth(this.snowAmt) * 0.98;
            this.put(d, "townSnow", mat(0, (k - 1) * 0.04, 0), { shadow: false });
        }
        this.drawHops(d);
        this.drawGhost(d);
        this.drawMovers(d);
        this.drawWater(d);
    }

    drawHops(d) {
        for (const h of this.hops) {
            const b = h.b, c = this.sim.cells[b.cell], v = this.visOf(b), type = b.wrecked ? "ruin" : b.type;
            const y0 = b.type === "dock" || b.type === "yard" ? 0.08 : this.surface(c);
            let sy = 1, sxz = 1, y = y0;
            const t = Math.max(0, h.t);
            if (h.drop) {
                if (t < h.drop) { const q = t / h.drop; y = y0 + (1 - q * q) * 1.5; sy = 1.14; sxz = 0.9; }
                else {
                    const q = (t - h.drop) / 0.5, damp = Math.exp(-q * 5);
                    sy = 1 - Math.cos(q * 19) * 0.34 * damp * h.power;
                    sxz = 1 + Math.cos(q * 19) * 0.2 * damp * h.power;
                }
            } else {
                const q = t / 0.44, damp = 1 - q;
                y = y0 + Math.abs(Math.sin(q * Math.PI)) * 0.13 * h.power;
                sy = 1 + Math.sin(q * 12) * 0.08 * damp;
                sxz = 1 - Math.sin(q * 12) * 0.05 * damp;
            }
            this.drawModel(d, type, v.variant, c.x, y, c.z, v.yaw, sxz, sy);
        }
    }

    /** Draw a template model as instances, used for anything not merged yet. */
    drawModel(d, type, variant, x, y, z, yaw, sxz = 1, sy = 1, tint = null) {
        const key = `${type}.${variant % 60}`;
        const m = getModel(type, variant);
        if (!this.a.geoms?.has?.(`t.${key}.s`)) {
            this.a.mesh(`t.${key}.s`, m.solid.data());
            const glow = new MB();
            glow.append(m.glow);
            for (let i = 0; i < glow.c.length; i++) glow.c[i] = rgb("#44586f")[i % 3];
            this.a.mesh(`t.${key}.g`, glow.data());
            this.a.mesh(`t.${key}.l`, m.leaf.data());
        }
        const w = compose(x, y, z, yaw, sxz, sy);
        const tintc = tint ? color(tint) : undefined;
        this.put(d, `t.${key}.s`, w, { color: tintc });
        this.put(d, `t.${key}.g`, w, { color: tintc });
        this.put(d, `t.${key}.l`, w, { color: tintc ?? color(this.tintLeaf) });
    }

    drawGhost(d) {
        const g = this.ghost;
        // The tile rings: where you can build, and how well.
        for (const r of this.rings) {
            const c = this.sim.cells[r.cell], y = Math.max(this.surface(c), this.water * STEP) + 0.03;
            const m = matS(c.x, y, c.z, r.scale ?? 1, 1);
            this.put(d, "ring", m, { color: color(r.color), unlit: true, shadow: false });
        }
        if (!g) return;
        const c = this.sim.cells[g.cell], bob = 0.14 + Math.sin(this.time * 4.4) * 0.045;
        const stilt = g.type === "dock" || g.type === "yard";
        const y = (stilt ? 0.08 : this.surfaceFor(g.type, c)) + bob;
        this.drawModel(d, g.type, g.variant, c.x, y, c.z, g.yaw, 1, 1, g.ok ? null : [1, 0.45, 0.4]);
    }

    surfaceFor(type, c) {
        return BUILDINGS[type].stilts && c.h === 0 ? STEP : topY(c);
    }

    drawMovers(d) {
        const T = this.time, wy = this.water * STEP;
        // Walkers: two instances each.
        for (const w of this.walkers) {
            const a = w.pts[w.i], b = w.pts[w.i + 1], f = clamp(w.s / w.seg[w.i], 0, 1);
            const x = lerp(a[0], b[0], f), z = lerp(a[2], b[2], f), y = lerp(a[1], b[1], f) + Math.abs(Math.sin(T * 9 * w.v + w.phase)) * 0.016;
            const yaw = Math.atan2(b[0] - a[0], b[2] - a[2]), sway = Math.sin(T * 9 * w.v + w.phase) * 0.12;
            const m = compose(x, y, z, yaw, 1.15, 1.15, sway);
            this.put(d, "peg", m, { color: color(w.col), shadow: true });
            this.put(d, "pegHead", m, { color: color(w.skin), shadow: false });
            if (w.crate) this.put(d, "pegCrate", m, { shadow: false });
        }
        // Boats tie their position to the sim clock, so a boat comes home as its catch lands.
        const t = this.clockT;
        for (const b of this.sim.buildings) {
            if (b.type !== "dock" || b.wrecked) continue;
            const v = this.boatOf(b), n = v.path.length - 1;
            if (n < 1) continue;
            const hours = ((t - b.hour + 9) % HOURS + HOURS) % HOURS;   // 0 at sailing, 9 back at the berth.
            let q = hours < 9 ? 1 - Math.abs(hours / 4.5 - 1) : 0;
            q = smooth(q) * (1 - smooth(this.stormVis * 3));
            const fi = q * n, i = Math.min(n - 1, fi | 0), k = fi - i;
            const p0 = v.path[i], p1 = v.path[i + 1];
            const x = lerp(p0[0], p1[0], k), z = lerp(p0[1], p1[1], k);
            const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
            const out = hours < 4.5, yaw = Math.atan2(out ? dx : -dx, out ? dz : -dz);
            v.yaw = yaw;
            const y = wy + Math.sin(T * 2 + b.id) * 0.018;
            const roll = Math.sin(T * 1.7 + b.id) * (0.05 + this.stormVis * 0.2);
            this.put(d, b.trawler ? "trawler" : "rowboat", compose(x, y - 0.02, z, yaw, 1.1, 1.1, roll));
            if (q > 0.02 && q < 0.98 && this.fx.range(0, 1) < 0.2 && this.dust.length < 70) this.dust.push({ x: x - Math.sin(yaw) * 0.3, y, z: z - Math.cos(yaw) * 0.3, vx: 0, vy: 0, vz: 0, t: 0, life: 0.7, s: 0.13, c: [1, 1, 1], flat: true });
        }
        // A trading schooner passes every few days, well out.
        const R = (RADIUS + 0.2) * SQ3, sp = ((t / (HOURS * 5)) % 1);
        const sx = lerp(-R * 1.05, R * 1.05, sp), sz = -R * 0.62 + Math.sin(sp * 3) * 0.3;
        if (sp > 0.02 && sp < 0.98) this.put(d, "schooner", compose(sx, wy - 0.03 + Math.sin(T) * 0.02, sz, Math.PI / 2, 1.05, 1.05, Math.sin(T * 1.2) * 0.04));
        // Mills and the Hall's pennant.
        for (const m of this.spinners) {
            if (m.b.wet) continue;
            const spin = T * (m.b.wrecked ? 0 : 0.8 + this.stormVis * 3.6);
            const w = composeZ(m.p[0], m.p[1], m.p[2], m.yaw, spin);
            this.put(d, "sails", w);
        }
        if (this.flag) this.put(d, "pennant", compose(this.flag[0], this.flag[1], this.flag[2], Math.sin(T * 1.8) * 0.3 + this.stormVis * 0.9, 1, 1));
        // Chimney smoke.
        for (const p of this.puffs) {
            const k = p.t / p.life, size = p.s * (0.5 + k * 1.6) * (k > 0.72 ? (1 - k) / 0.28 : 1);
            const c = lerp(p.dark, 0.95, k);
            this.put(d, "puff", matS(p.x, p.y, p.z, size, size), { color: color([c, c, c * 1.02]), shadow: false });
        }
        for (const p of this.dust) {
            const k = p.t / p.life, size = p.s * (0.6 + k) * (1 - k * k);
            this.put(d, "puff", p.flat ? matS(p.x, p.y, p.z, size, size * 0.2) : matS(p.x, p.y, p.z, size, size), { color: color(p.c), shadow: false, unlit: !!p.flat });
        }
        // Wave crests: little white smiles on the swell.
        const sea = this.seaColour();
        for (const w of this.waves) {
            const [q, r] = nearestHex(w.x, w.z), i = this.sim.index.get(`${q},${r}`), cell = i === undefined ? null : this.sim.cells[i];
            if (!cell || !(cell.h < 0 || cell.wet)) continue;
            const k = Math.sin(w.t * Math.PI), sc = w.s * k * (1 + this.stormVis * 0.8);
            if (sc < 0.04) continue;
            const white = 0.55 + k * 0.45;
            this.put(d, "crest", compose(w.x, wy + 0.012, w.z, w.yaw + this.stormVis, sc, 1), { unlit: true, shadow: false, color: color(mix(sea, [1.05, 1.08, 1.08], white)) });
        }
        // Gulls.
        const flap = (Math.sin(T * 7) > 0);
        for (const g of this.gulls) {
            const a = g.a + T * g.v, x = g.cx + Math.cos(a) * g.r, z = g.cz + Math.sin(a) * g.r;
            const up = flap !== (g.f > 3);
            this.put(d, up ? "gullUp" : "gullDown", compose(x, g.y + Math.sin(T + g.f) * 0.2, z, -a + (g.v > 0 ? 0 : Math.PI), 1, 1));
        }
        // Rain and snow.
        const wind = this.stormVis * 0.3;
        const snow = this.sim.seasonIndex === 3 && this.stormVis < 0.1;
        for (const p of this.drops) {
            if (snow) this.put(d, "flake", matS(p.x, p.y, p.z, 1, 1), { unlit: true, shadow: false });
            else this.put(d, "rain", compose(p.x, p.y, p.z, 0, 1, 1, -wind), { unlit: true, shadow: false, color: color([0.78, 0.86, 0.96]) });
        }
        // Clouds cross the tray and cast soft shadows, darker in a storm.
        const st = this.stormVis;
        const cc = lerp(0.98, 0.62, smooth(st * 1.3)) * lerp(1, 0.7, this.dark);
        // They ride in the sky behind the board, wherever the camera has turned, so they never hide a tile.
        const sy = Math.sin(this.cam.yaw), cy = Math.cos(this.cam.yaw);
        for (const cl of this.clouds) {
            const u = ((cl.x + T * (0.18 + st * 0.8) + 18) % 36 + 36) % 36 - 18, back = 11 + cl.z * 0.35;
            const x = cy * u - sy * back, z = -sy * u - cy * back;
            this.put(d, "cloud", compose(x, cl.y, z, this.cam.yaw, cl.s, cl.s * 0.72), { color: color([cc, cc, cc * 1.02]), shadow: false, unlit: false });
        }
    }

    seaColour() {
        const sky = skyAt(this.hour);
        return mix(mix(sky[1], [1, 1, 1], 0.5), rgb("#59d2d0"), 0.7);
    }

    drawWater(d) {
        const sky = skyAt(this.hour), st = smooth(this.stormVis * 1.2), wy = this.water * STEP;
        const base = mix(rgb("#27b7c4"), rgb("#4a7d8c"), st);
        const lit = mix(sky[2], [1, 1, 1], 0.2 + (1 - this.dark) * 0.7);
        const c = [base[0] * lit[0], base[1] * lit[1], base[2] * lit[2]];
        const wc = color(c);
        wc.a = 0.62 + st * 0.2;
        this.put(d, "waterSide", matXYZ(0, wy, 0, 1, wy - BED, 1), { color: wc, shadow: false, unlit: true });
        const tc = color(c);
        tc.a = 0.6 + st * 0.2;
        this.put(d, "waterTop", mat(0, wy, 0), { color: tc, shadow: false, unlit: true });
        const pulse = 0.34 + Math.sin(this.time * 1.5) * 0.16;
        const w = color([1, 1, 1]);
        const white = lerp(0.72, 1, 1 - this.dark * 0.5);
        const wash = color([white, white, white]);
        wash.a = pulse * 0.6;
        this.put(d, "wash", mat(0, wy + 0.004, 0), { color: wash, shadow: false, unlit: true });
        w.r = w.g = w.b = white;
        w.a = 0.84;
        this.put(d, "foam", mat(0, wy + 0.008, 0), { color: w, shadow: false, unlit: true });
        // Pools of warm lamplight, and the lighthouse's sweep.
        if (this.glow > 0.05) {
            const pool = color([1, 0.78, 0.45]);
            pool.a = Math.min(0.9, this.glow * 0.9);
            this.put(d, "pools", IDENT, { texture: "halo", color: pool, unlit: true, shadow: false });
            for (const b of this.beams) {
                if (b.b.wet || b.b.wrecked) continue;
                const q = color([1, 0.93, 0.7]);
                q.a = this.glow * 0.2;
                this.put(d, "beam", compose(b.p[0], b.p[1], b.p[2], this.time * 0.9, 1, 1), { color: q, unlit: true, shadow: false });
                this.put(d, "beam", compose(b.p[0], b.p[1], b.p[2], this.time * 0.9 + Math.PI, 1, 1), { color: q, unlit: true, shadow: false });
            }
        }
    }
}

const WHITE = color("#ffffff");
const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const mat = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
const matS = (x, y, z, s, sy) => new Float32Array([s, 0, 0, 0, 0, sy, 0, 0, 0, 0, s, 0, x, y, z, 1]);
const matXYZ = (x, y, z, sx, sy, sz) => new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, x, y, z, 1]);
/** Yaw about y, an optional roll about the forward axis, then scale. */
function compose(x, y, z, yaw, sxz, sy, roll = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
    return new Float32Array([
        c * cr * sxz, sr * sxz, -s * cr * sxz, 0,
        -c * sr * sy, cr * sy, s * sr * sy, 0,
        s * sxz, 0, c * sxz, 0,
        x, y, z, 1,
    ]);
}
/** Yaw about y, then spin about the model's own z: the sails. */
function composeZ(x, y, z, yaw, a) {
    const c = Math.cos(yaw), s = Math.sin(yaw), ca = Math.cos(a), sa = Math.sin(a);
    return new Float32Array([
        c * ca, sa, -s * ca, 0,
        -c * sa, ca, s * sa, 0,
        s, 0, c, 0,
        x, y, z, 1,
    ]);
}
