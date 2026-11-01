// The hillside ground: terrain, walls, crowd, goats, ball and the broadcast camera.
import { billboard, color, dim, mesh, pos, rot, scale } from "./pogo.js";
import { MB, hex, mix, mul } from "./meshkit.js";
import { FURS, head, leg, torso } from "./models.js";
import { GW, HL, HW, R_BALL, ST, clamp, lerp } from "./sim.js";

const TAU = Math.PI * 2;
const dimmed = (h, k) => { const c = hex(h); return color(`#${c.map((v) => Math.round(v * k * 255).toString(16).padStart(2, "0")).join("")}`); };
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Ground height outside the pitch: a crowd bank, then rolling country. */
function terrain(x, z) {
    const dx = Math.max(0, Math.abs(x) - HL - 3.5), dz = Math.max(0, Math.abs(z) - HW - 2.2), d = Math.hypot(dx, dz);
    if (d <= 0) return 0;
    const bank = smooth(0, 9, d) * 3.2 + smooth(9, 16, d) * -0.8;
    const far = smooth(12, 60, d);
    const hills = (vnoise(x * 0.018 + 3, z * 0.018) * 34 + vnoise(x * 0.05, z * 0.05 + 7) * 9 - 9) * far + far * 7 + smooth(60, 150, d) * 14;
    return bank + hills;
}

export function buildPitch(game, name, V, mud) {
    const m = new MB(), a = hex(V.grass[0]), b = hex(V.grass[1]), wear = hex(V.wear), M = 3.6;
    const X = 56, Z = 34, x0 = -HL - M, z0 = -HW - M, dx = (HL + M) * 2 / X, dz = (HW + M) * 2 / Z;
    const colAt = (x, z) => {
        const stripe = mul(Math.floor((x + HL) / 4) % 2 ? a : b, 0.66);
        const n = vnoise(x * 0.6, z * 0.6), big = vnoise(x * 0.12 + 9, z * 0.12);
        let c = mul(stripe, 0.96 + n * 0.09);
        if (Math.abs(x) > HL || Math.abs(z) > HW) return mul(stripe, 0.86 + n * 0.1);
        const goalWear = Math.max(0, 1 - Math.hypot((Math.abs(x) - HL + 2) / 6.5, z / 5)) * (0.5 + n * 0.8), midWear = Math.max(0, 1 - Math.hypot(x / 5.5, z / 4)) * n * 0.9;
        c = mix(c, wear, clamp(Math.max(goalWear, midWear), 0, 0.75));
        if (mud) c = mix(c, wear, smooth(0.34, 0.6, big * 0.65 + n * 0.35) * 0.95);
        return c;
    };
    for (let i = 0; i < X; i++) for (let j = 0; j < Z; j++) {
        const x = x0 + i * dx, z = z0 + j * dz, x1 = x + dx, z1 = z + dz;
        m.quad([x, 0, z1], [x1, 0, z1], [x1, 0, z], [x, 0, z], colAt(x, z1), colAt(x1, z1), colAt(x1, z), colAt(x, z));
    }
    // Hand-limed lines.
    const L = mud ? mix(hex("#fff8e4"), wear, 0.35) : hex("#fff8e4"), y = 0.02, w = 0.11;
    const seg = (ax, az, bx, bz) => { const l = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / l * w, nz = (bx - ax) / l * w; m.quad([ax + nx, y, az + nz], [bx + nx, y, bz + nz], [bx - nx, y, bz - nz], [ax - nx, y, az - nz], L); };
    seg(-HL, -HW, HL, -HW); seg(HL, HW, -HL, HW); seg(-HL, HW, -HL, -HW); seg(HL, -HW, HL, HW); seg(0, -HW, 0, HW);
    const arc = (cx, cz, r, a0, a1, n) => { for (let i = 0; i < n; i++) { const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n; seg(cx + Math.cos(t0) * r, cz + Math.sin(t0) * r, cx + Math.cos(t1) * r, cz + Math.sin(t1) * r); } };
    arc(0, 0, 5, 0, TAU, 30);
    for (const s of [-1, 1]) {
        const bw = 8.6, bd = 7.5;
        seg(s * HL, -bw, s * (HL - bd), -bw); seg(s * (HL - bd), -bw, s * (HL - bd), bw); seg(s * (HL - bd), bw, s * HL, bw);
        seg(s * HL, -GW - 1.4, s * (HL - 2.6), -GW - 1.4); seg(s * (HL - 2.6), -GW - 1.4, s * (HL - 2.6), GW + 1.4); seg(s * (HL - 2.6), GW + 1.4, s * HL, GW + 1.4);
        const spot = s * (HL - 5.2); arc(spot, 0, 0.16, 0, TAU, 6);
    }
    arc(0, 0, 0.18, 0, TAU, 6);
    return m.register(game.assets, name);
}

/** Dry-stone walls, boards, hills, trees, barn, church. One mesh. */
export function buildScenery(game, name, V) {
    let m = new MB();
    const rnd = (i) => hash(i * 1.37, i * 0.73);
    const stoneA = hex("#b9ab94"), stoneB = hex("#8f8574"), moss = hex("#7d8a55");
    let id = 0;
    // Walls round the pitch. Near sides are lower so they never hide a goat.
    const wall = (ax, az, bx, bz, h, skipGoal) => {
        const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, yaw = Math.atan2(uz, ux);
        for (let row = 0; row < Math.ceil(h / 0.34); row++) {
            let s = (row % 2) * 0.3;
            while (s < len) {
                const w = 0.7 + rnd(id++) * 0.6, cx = ax + ux * (s + w / 2), cz = az + uz * (s + w / 2);
                s += w + 0.02;
                if (skipGoal && Math.abs(cz) < GW + 0.3) continue;
                const c = mix(mix(stoneA, stoneB, rnd(id++)), moss, rnd(id++) > 0.82 ? 0.5 : 0);
                m.at(cx, row * 0.34, cz, -yaw).box(0, 0, 0, w, 0.34 + rnd(id++) * 0.04, 0.56 - row * 0.05, c, { taper: 0.94 }).reset();
            }
        }
    };
    const WX = HL + 0.6, WZ = HW + 0.6;
    wall(-WX, -WZ, WX, -WZ, 1.0); wall(-WX, WZ, WX, WZ, 0.68); wall(-WX, -WZ, -WX, WZ, 1.0, true); wall(WX, -WZ, WX, WZ, 1.0, true);

    // Sponsors' boards on the far wall, hand-painted by someone's nephew.
    const signs = [["BLEAT FM", "#d9483b"], ["HOOF & SON FEED", "#2f6f9f"], ["TURNIP TIME", "#7a4fa0"], ["MUCKLE ALES", "#c98a1f"], ["NO DIVING", "#3f8f55"]];
    signs.forEach(([t, col], i) => {
        const cx = -HL + 5.4 + i * 9.4, w = 8.6, c = hex(col), y0 = 1.0, h = 1.05, z = -WZ - 0.3;
        m.quad([cx - w / 2, y0, z], [cx + w / 2, y0, z], [cx + w / 2, y0 + h, z], [cx - w / 2, y0 + h, z], c, c, mul(c, 1.1), mul(c, 1.1));
        m.quad([cx + w / 2, y0, z - 0.1], [cx - w / 2, y0, z - 0.1], [cx - w / 2, y0 + h, z - 0.1], [cx + w / 2, y0 + h, z - 0.1], mul(c, 0.6));
        m.box(cx - w / 2 + 0.3, 0, z - 0.05, 0.12, y0 + h, 0.1, hex("#6b4a2e")).box(cx + w / 2 - 0.3, 0, z - 0.05, 0.12, y0 + h, 0.1, hex("#6b4a2e"));
        m.text(t, [cx, y0 + h / 2, z + 0.03], [1, 0, 0], [0, 1, 0], Math.min(0.56, w * 0.8 / (t.length * 1.2)), hex("#fff6e0"));
    });

    // Near things cast shadows; the far country is a separate mesh that doesn't pay for a shadow pass.
    m.register(game.assets, `${name}_n`);
    m = new MB();

    // Terrain: patchwork fields on a big grid.
    const S = 7, X0 = -196, Z0 = -168, NX = 56, NZ = 48, H = V.hill, cols = H.map(hex), hedge = hex(V.hedge);
    const patch = (x, z) => {
        const u = Math.floor((x + vnoise(x * 0.02, z * 0.02) * 30) / 34), v = Math.floor((z + vnoise(z * 0.02, x * 0.02 + 5) * 30) / 28);
        return cols[Math.floor(hash(u, v) * cols.length)];
    };
    const near = mul(hex(V.grass[1]), 1.06);
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
        const x = X0 + i * S, z = Z0 + j * S, x1 = x + S, z1 = z + S;
        if (x > -HL - 3.6 && x1 < HL + 3.6 && z > -HW - 3.6 && z1 < HW + 3.6) continue;
        const dist = Math.hypot(Math.max(0, Math.abs(x) - HL), Math.max(0, Math.abs(z) - HW));
        const shade = (px, pz) => { const c = dist < 18 ? mix(near, patch(px, pz), smooth(8, 18, dist)) : patch(px, pz); return mul(c, 0.62 + vnoise(px * 0.2, pz * 0.2) * 0.09); };
        const P = (px, pz) => [px, terrain(px, pz) - 0.02, pz];
        m.tri(P(x, z1), P(x1, z1), P(x1, z), shade(x + 2, z + 5));
        m.tri(P(x, z1), P(x1, z), P(x, z), shade(x + 2, z + 2));
    }

    // Fence the pitch off from the bank with a mown strip, then hedgerows.
    for (let i = 0; i < 130; i++) {
        const u = -190 + hash(i, 1) * 380, v = -160 + hash(i, 2) * 320;
        const lenAxis = hash(i, 3) > 0.5;
        const n = 5 + Math.floor(hash(i, 4) * 6);
        for (let k = 0; k < n; k++) {
            const x = u + (lenAxis ? k * 3.5 : 0), z = v + (lenAxis ? 0 : k * 3.5);
            if (Math.abs(x) < HL + 24 && Math.abs(z) < HW + 18) continue;
            const y = terrain(x, z);
            m.ball(x, y + 1, z, 2, 5, 2, mul(hedge, 0.92 + hash(k, i) * 0.2), { sy: 0.9 });
        }
    }
    // Trees.
    for (let i = 0; i < 95; i++) {
        const x = -190 + hash(i, 5) * 380, z = -160 + hash(i, 6) * 320;
        if (Math.abs(x) < HL + 15 && Math.abs(z) < HW + 13) continue;
        const y = terrain(x, z), r = 2.4 + hash(i, 7) * 2.6, t = hash(i, 8);
        const c = mul(mix(hedge, hex(V.hill[1]), hash(i, 9) * 0.7), 0.94 + t * 0.14);
        m.cyl(x, y, z, 0.42, r * 1.1, 5, hex("#6b4a30"));
        if (t > 0.3) { m.ball(x, y + r * 1.8, z, r, 6, 3, c, { sy: 1.05 }); }
        else { m.cyl(x, y + r * 0.7, z, r * 0.85, r * 2, 6, c, { r2: 0, shade: 0.72 }); m.cyl(x, y + r * 1.7, z, r * 0.62, r * 1.7, 6, mul(c, 1.08), { r2: 0, shade: 0.72 }); }
    }
    // Barn.
    const bx = -46, bz = -52, by = terrain(bx, bz);
    m.at(bx, by, bz, 0.25).box(0, 0, 0, 16, 7, 9, hex("#b0473a"), { shade: 0.8 });
    m.quad([-8.6, 7, 5.2], [8.6, 7, 5.2], [8.6, 10.5, 0], [-8.6, 10.5, 0], hex("#6f5f58")).quad([8.6, 7, -5.2], [-8.6, 7, -5.2], [-8.6, 10.5, 0], [8.6, 10.5, 0], hex("#5f514c"));
    m.tri([-8, 7, 4.5], [-8, 10.5, 0], [-8, 7, -4.5], hex("#b0473a")).tri([8, 7, -4.5], [8, 10.5, 0], [8, 7, 4.5], hex("#a0413a"));
    m.box(0, 0, 4.55, 5, 4.6, 0.1, hex("#fff1d6")).box(0, 0, 4.62, 4.2, 4.2, 0.1, hex("#7f3028")).reset();
    // Church on the far hill.
    const cx = 58, cz = -112, cy = terrain(cx, cz);
    m.at(cx, cy, cz, -0.3).box(0, 0, 0, 13, 7, 6, hex("#c9bfa8"), { shade: 0.8 }).box(-8, 0, 0, 5, 13, 5, hex("#c9bfa8"), { shade: 0.8 }).cyl(-8, 13, 0, 3.5, 7, 4, hex("#5f6a78"), { r2: 0, rot: Math.PI / 4 });
    m.quad([-6.5, 7, 3.4], [6.5, 7, 3.4], [6.5, 10, 0], [-6.5, 10, 0], hex("#7a6456")).quad([6.5, 7, -3.4], [-6.5, 7, -3.4], [-6.5, 10, 0], [6.5, 10, 0], hex("#6a564a")).reset();
    // Round hay bales and a tractor just off the pitch.
    const hay = hex("#e0bb5a"), hay2 = hex("#c99f43");
    const bales = [[-HL - 8, -HW - 5], [-HL - 5, -HW - 3.5], [HL + 7, -HW - 4.5], [HL + 9.5, HW + 2], [-HL - 9, HW + 6], [HL + 12, -HW - 9], [-HL - 15, 8], [HL + 15, -6]];
    for (const [x, z] of bales) m.cylX(x, terrain(x, z) + 1, z, 1, 1.9, 9, hay, { cap: hay2, rot: 0.3 });
    const tx = HL + 15, tz = HW + 3, ty = terrain(tx, tz), R = hex("#c9412e");
    m.at(tx, ty, tz, 1.1).box(0, 0.7, 0.8, 1.5, 1.1, 2.2, R, { bottom: true }).box(0, 1.6, -0.4, 1.5, 1.6, 1.3, hex("#ffe9c0")).box(0, 3.2, -0.4, 1.7, 0.1, 1.5, R);
    m.cylX(0.95, 0.9, -0.8, 0.9, 0.5, 10, hex("#2c2826"), { cap: hex("#d9b84a") }).cylX(-0.95, 0.9, -0.8, 0.9, 0.5, 10, hex("#2c2826"), { cap: hex("#d9b84a") });
    m.cylX(0.85, 0.5, 1.3, 0.5, 0.36, 8, hex("#2c2826"), { cap: hex("#d9b84a") }).cylX(-0.85, 0.5, 1.3, 0.5, 0.36, 8, hex("#2c2826"), { cap: hex("#d9b84a") }).reset();
    // Bunting along the far side, above the boards.
    const flagCols = ["#d9483b", "#f4d24a", "#2f7fbf", "#f6efe0", "#3f9a55"].map(hex), yB = 3.8;
    for (const [ax, az, bx2, bz2] of [[-HL - 1, -HW - 2.2, 0, -HW - 2.2], [0, -HW - 2.2, HL + 1, -HW - 2.2]]) {
        m.at(ax, 0, az).cyl(0, 0, 0, 0.1, yB + 0.3, 5, hex("#7a5a3c")).reset(); m.at(bx2, 0, bz2).cyl(0, 0, 0, 0.1, yB + 0.3, 5, hex("#7a5a3c")).reset();
        const N = 20;
        for (let i = 0; i < N; i++) {
            const t = (i + 0.5) / N, x = lerp(ax, bx2, t), z = lerp(az, bz2, t), y = yB - Math.sin(t * Math.PI) * 0.9, c = flagCols[i % flagCols.length];
            m.tri([x - 0.45, y, z], [x, y - 0.8, z], [x + 0.45, y, z], c).tri([x + 0.45, y, z], [x, y - 0.8, z], [x - 0.45, y, z], mul(c, 0.8));
        }
    }
    return m.register(game.assets, name);
}

/** Spectators in chunks, so a chunk can bounce as one. */
export function buildCrowd(game, key, kits) {
    const names = [], cols = [hex(kits[0].c1), hex(kits[0].c2), hex(kits[1].c1), hex(kits[1].c2)];
    const animals = [["#f3ead8", "#d9b88a"], ["#8a5e3c", "#6a4630"], ["#4a3a34", "#2f2622"], ["#efe7d8", "#2c2628"], ["#ece4d4", "#d07f7a"], ["#d8a070", "#a06a44"]];
    const put = (m, x, y, z, yaw, i, team) => {
        const r = hash(i, 11), [B, H] = animals[Math.floor(hash(i, 12) * animals.length)], body = hex(B), hd = hex(H), kit = cols[team * 2 + (hash(i, 13) > 0.5 ? 1 : 0)];
        const sc = 0.66 + r * 0.2;
        m.at(x, y, z, yaw, sc);
        m.box(0, 0, 0, 0.74, 0.92, 0.6, body, { taper: 0.84 });
        m.box(0, 0.82, 0, 0.8, 0.2, 0.66, kit);        // scarf
        m.box(0, 1.02, 0.03, 0.56, 0.52, 0.56, hd);
        m.box(-0.38, 1.3, 0, 0.26, 0.12, 0.16, hd).box(0.38, 1.3, 0, 0.26, 0.12, 0.16, hd);
        m.box(0, 1.1, 0.33, 0.3, 0.22, 0.06, mul(hd, 0.75));
        if (hash(i, 14) > 0.72) { m.box(0.42, 0.6, 0, 0.09, 1.0, 0.09, body); m.box(0.72, 1.45, 0, 0.56, 0.4, 0.04, kit); }   // flag or scarf held up
        m.reset();
    };
    let idx = 0;
    const chunk = (cn, team, near) => {
        const m = new MB();
        cn(m, team);
        const name = `${key}_c${names.length}`;
        m.register(game.assets, name); names.push({ name, team, nearEnd: !!near });
    };
    // Far bank, split into strips. Near bank is sparse so the camera sees over it.
    const stripX = 10;
    for (let sx = 0; sx < 5; sx++) for (let t = 0; t < 2; t++) {
        const team = sx < 2 ? 0 : sx > 2 ? 1 : t;
        chunk((m) => {
            for (let row = 0; row < 7; row++) for (let i = 0; i < 9; i++) {
                if (hash(row + sx * 9 + t, i * 3) > 0.62) continue;
                const x = -HL + 1 + sx * stripX + (i + hash(i, row) * 0.7) * 1.08, z = -HW - 3.4 - row * 1.25 - (t ? 0.5 : 0);
                put(m, x, terrain(x, z) - 0.02, z, 0, idx++, team);
            }
        }, team);
    }
    // Ends, behind each goal.
    for (const s of [-1, 1]) for (let band = 0; band < 2; band++) chunk((m) => {
        for (let row = 0; row < 6; row++) for (let i = 0; i < 22; i++) {
            if (hash(row + band * 5, i * 2 + s) > 0.55) continue;
            const x = s * (HL + 4 + row * 1.25), z = -HW + (band ? HW : 0) + i * 0.68 + hash(i, row);
            put(m, x, terrain(x, z) - 0.02, z, -s * Math.PI / 2, idx++, s < 0 ? 0 : 1);
        }
    }, s < 0 ? 0 : 1, s < 0);
    return names;
}

// -----------------------------------------------------------------------------------------------

const Rig = (s, g) => {
    const root = s.add([dim(3), pos(0, 0, 0), rot(0, 0, 0), scale(1)]);
    const part = (m, x, y, z) => root.child([mesh(m, { shadow: true }), pos(x, y, z), rot(0, 0, 0), scale(1)]);
    const r = { root, body: part(g.torso, 0, 1.06, 0), head: part(g.heads[0], 0, 1.56, 0.92), fl: part(g.leg, 0.34, 0.92, 0.56), fr: part(g.leg, -0.34, 0.92, 0.56), bl: part(g.leg, 0.34, 0.92, -0.58), br: part(g.leg, -0.34, 0.92, -0.58), heads: g.heads, phase: g.id * 1.3, sq: 1, expr: 0 };
    return r;
};

export class World {
    constructor(game, s, o) {
        this.game = game; this.s = s; this.o = o;
        const { venue, kits, mud } = o, V = venue;
        this.V = V;
        s.background = V.sky;
        s.light.dir.set(-0.55, -1, -0.32);
        s.light.sky = dimmed(V.amb, 0.92); s.light.ground = dimmed(V.ground, 0.8); s.light.color = dimmed(V.sun, 0.86);
        s.light.shadows = true; s.light.shadowRange = 46; s.light.softShadows = false;
        s.light.fog = { color: color(V.fog), near: 110, far: 300 };
        s.cam3.fov = 34; s.cam3.near = 1; s.cam3.far = 600;
        const vk = `${o.venueKey}${mud ? "m" : ""}`;
        const a = game.assets, has = (n) => a.geoms.has(n);
        if (!has(`pitch_${vk}`)) buildPitch(game, `pitch_${vk}`, V, mud);
        if (!has(`scene_${vk}`)) buildScenery(game, `scene_${vk}`, V);
        s.add([mesh(`pitch_${vk}`, { shadow: false }), pos(0, 0, 0)]);
        s.add([mesh(`scene_${vk}`, { shadow: false }), pos(0, 0, 0)]);
        s.add([mesh(`scene_${vk}_n`, { shadow: true }), pos(0, 0, 0)]);
        // Goals.
        this.nets = [];
        for (const side of [0, 1]) {
            const sx = side ? 1 : -1, ang = side ? 0 : Math.PI;
            s.add([mesh("goalframe"), pos(sx * HL, 0, 0), rot(0, side ? -Math.PI / 2 * 0 : Math.PI, 0)]);
            const n = s.add([mesh("net0", { shadow: false }), pos(sx * HL, 0, 0), rot(0, ang, 0), { netT: 0, netZ: 1, netA: 0 }]);
            this.nets.push(n);
        }
        // Corner flags.
        this.flags = [];
        for (const [x, z, c] of [[-HL, -HW, 0], [HL, -HW, 1], [-HL, HW, 0], [HL, HW, 1]]) {
            s.add([mesh("cylinder", { color: "#fffaf0", size: [0.1, 2.6, 0.1] }), pos(x, 1.3, z)]);
            this.flags.push(s.add([mesh("flag", { color: kits[c].c1, shadow: false }), pos(x, 2.1, z), rot(0, 0, 0), scale([0.8, 0.6, 1])]));
        }
        // Big flags behind the far wall.
        for (let i = 0; i < 5; i++) {
            const x = -HL + 4 + i * 10, c = i < 2 ? 0 : i > 2 ? 1 : i % 2;
            s.add([mesh("cylinder", { color: "#c8b48a", size: [0.14, 7, 0.14] }), pos(x, terrain(x, -HW - 13) + 3.5, -HW - 13)]);
            this.flags.push(s.add([mesh("flag", { color: kits[c].c1, shadow: false }), pos(x, terrain(x, -HW - 13) + 5.2, -HW - 13), rot(0, 0, 0), scale([2.6, 2.2, 1])]));
        }
        // Crowd.
        this.crowd = buildCrowdCached(game, kits).map((c, i) => ({ e: s.add([mesh(c.name, { shadow: false }), pos(0, 0, 0)]), team: c.team, ph: i * 1.9, y: 0, nearEnd: c.nearEnd }));
        this.excite = [0.2, 0.2];

        // Rigs.
        this.rigs = o.goats.map((g) => Rig(s, g));
        this.ball = s.add([mesh("ball", { shine: 0.35 }), pos(0, R_BALL, 0), rot(0, 0, 0), scale(R_BALL * 1.3)]);
        this.ballSq = 1;
        this.marker = s.add([mesh("ring", { color: "#ffe14a", unlit: true, shadow: false }), pos(0, 0.05, 0), scale(1.15)]);
        this.marker2 = s.add([mesh("ring", { color: "#4af2ff", unlit: true, shadow: false }), pos(0, 0.05, 0), scale(1.15)]);
        this.marker2.hidden = true;
        this.chev = s.add([mesh("chevron", { color: "#ffe14a", unlit: true, shadow: false }), pos(0, 3, 0), rot(0, 0, 0), scale(1.15)]);
        this.chev2 = s.add([mesh("chevron", { color: "#4af2ff", unlit: true, shadow: false }), pos(0, 3, 0), rot(0, 0, 0), scale(1.15)]);
        this.chev2.hidden = true;
        this.arrow = s.add([mesh("arrow", { color: "#ffe14a", unlit: true, shadow: false }), pos(0, 0.06, 0), rot(0, 0, 0), scale(1.2)]);
        this.mate = s.add([mesh("ring2", { color: "#ffffff", unlit: true, shadow: false }), pos(0, 0.05, 0), scale(1.05)]); this.mate.hidden = true;
        this.landing = s.add([mesh("ring2", { color: "#fff6e0", unlit: true, shadow: false }), pos(0, 0.05, 0), scale(0.7)]); this.landing.hidden = true;
        this.ballGlow = s.add([billboard("glow", { size: [2.4, 2.4], color: "#ffb340", unlit: true }), pos(0, 0, 0), { }]); this.ballGlow.hidden = true;
        this.stars = [];
        for (let i = 0; i < 12; i++) { const e = s.add([billboard("star", { size: [0.62, 0.62], unlit: true }), pos(0, -5, 0)]); e.hidden = true; this.stars.push(e); }
        this.trail = [];
        for (let i = 0; i < 14; i++) { const e = s.add([billboard("flame", { size: [1, 1], unlit: true }), pos(0, -5, 0), scale(1)]); e.hidden = true; this.trail.push({ e, life: 0 }); }
        this.trailI = 0;
        this.ref = s.add([mesh("ref"), pos(-3, 0, 6), rot(0, 0, 0), { ph: 0 }]);
        this.critters = [];
        this.cam = { x: 0, z: 0, kind: null, zoom: 1, tx: 0, tz: 0, shakeHold: 0 };
        this.t = 0;
        this.snapCam = true;
    }

    /** view: { goats: [{x,y,z,ang,state,t,speed,charge,tumble,...}], ball, humans:[goat ids] } */
    syncGoat(i, g, dt, pose = {}) {
        const r = this.rigs[i], root = r.root, sp = g.speed;
        root.pos.set(g.x, 0, g.z);
        const stT = g.t;
        r.phase += dt * (3 + sp * 2.1);
        const p = r.phase;
        let y = g.y, rx = 0, rz = 0, ry = g.ang, sxz = 1, sy = 1, bodyY = 1.06, headRx = 0, headY = 1.56, headZ = 0.92, swing = clamp(sp / 8, 0, 1) * 0.95, expr = 0;
        let fl = Math.sin(p) * swing, fr = Math.sin(p + 0.7) * swing, bl = Math.sin(p + Math.PI) * swing, br = Math.sin(p + Math.PI + 0.7) * swing;
        const bob = Math.abs(Math.sin(p)) * 0.16 * swing;
        bodyY += bob;
        headY += bob * 1.2 + Math.sin(this.t * 2 + i) * 0.015;
        headRx = -0.05 + swing * 0.14 + Math.sin(p) * 0.08 * swing;
        rx = swing * 0.06;
        switch (g.state) {
            case ST.KICK: { const k = Math.sin(clamp(stT / 0.2, 0, 1) * Math.PI); fr = -1.5 * k; fl = 0.5 * k; rx -= 0.2 * k; sxz = 1 + 0.15 * k; sy = 1 - 0.1 * k; break; }
            case ST.BUTT: {
                const w = 0.07;
                if (stT < w) { rx = -0.35; headRx = -0.5; sxz = 0.86; sy = 1.1; }
                else { rx = 0.2; y += 0.28; headRx = 0.62; headZ += 0.26; headY -= 0.1; sxz = 1.24; sy = 0.92; fl = -1.1; fr = -1.1; bl = 1.0; br = 1.0; }
                expr = 1; break;
            }
            case ST.SLIDE: { y = 0; bodyY = 0.62; rx = -0.14; fl = fr = -1.3; bl = 1.1; br = 1.1; headY = 1.16; headRx = -0.25; expr = 1; break; }
            case ST.WHIFF: { const k = Math.sin(stT * 16) * 0.2; rz = k; rx = 0.2; headRx = 0.4; expr = 2; swing = 0; fl = fr = bl = br = 0; break; }
            case ST.BOWLED: { rx = g.tumble; rz = g.tumble * 0.4; y = g.y + 0.5; fl = 1.2; fr = -1.1; bl = -1; br = 1.3; expr = 2; bodyY = 0.5; headY = 1.0; break; }
            case ST.GETUP: { const k = clamp(stT / 0.38, 0, 1); rz = (1 - k) * 1.2; bodyY = lerp(0.5, 1.06, k); headY = lerp(1.0, 1.56, k); expr = 2; fl = fr = bl = br = (1 - k) * 0.8; break; }
            case ST.DIVE: { const sd = Math.sign(Math.sin(g.ang) + Math.cos(g.ang)) || 1; rz = 1.2 * sd; rx = 0; fl = fr = -1.5; bl = br = 0.8; sxz = 1.18; headRx = -0.2; break; }
            case ST.HOLD: { rx = -0.9; bodyY = 1.5; headY = 2.1; headZ = 0.7; fl = fr = -1.2; swing = 0; bl = br = 0.5; headRx = 0.3; break; }
            case ST.JUMP: { fl = fr = 0.7; bl = br = -0.7; headRx = 0.5; rx = -0.2; break; }
            case ST.CELEB: {
                const hop = Math.abs(Math.sin(stT * 8.5)) * 0.8;
                y = g.y + (sp < 3 ? hop : 0);
                rx = sp < 3 ? -0.7 + Math.sin(stT * 8.5) * 0.2 : -0.1;
                fl = fr = sp < 3 ? -1.1 + Math.sin(stT * 16) * 0.5 : fl; headRx = -0.5; expr = 3;
                if (pose.spin === 1) ry += stT * 9;
                else if (pose.spin === 2) { rx = stT * 7.5; y = g.y + Math.abs(Math.sin(stT * 3.75)) * 2.4; fl = fr = bl = br = 0.9; }
                else if (pose.spin === 3) { rx = -1.1; y = g.y + 0.5; headRx = -0.9; fl = fr = Math.sin(stT * 22) * 0.9; bl = br = 0.3; }
                break;
            }
            case ST.SAD: { headRx = 0.65; headY -= 0.25; swing = 0; break; }
        }
        if (g.charging) {
            const c = clamp(g.charge, 0, 1), sh = c >= 1 ? Math.sin(this.t * 60) * 0.05 : 0;
            rx -= 0.22 * c; sy *= 1 - 0.16 * c; sxz *= 1 + 0.1 * c; bl = -0.6 * c; br = -0.6 * c; fr = 0.8 * c; rz += sh; headRx -= 0.3 * c; expr = 1;
        }
        // Scale pop from impacts decays here.
        r.sq += (1 - r.sq) * Math.min(1, dt * 12);
        root.pos.y = y; root.rot.set(rx, ry, rz);
        const RS = 1.2;
        root.scale = [(sxz > 1 ? 1 / Math.sqrt(sxz) * r.sq : r.sq) * RS, sy * RS, sxz / Math.max(0.6, r.sq) * RS];
        r.body.pos.y = bodyY; r.head.pos.y = headY; r.head.pos.z = headZ; r.head.rot.x = headRx;
        r.head.rot.y = g.state === ST.RUN ? Math.sin(this.t * 1.6 + i * 2) * 0.12 * (1 - swing) : 0;
        r.fl.rot.x = fl; r.fr.rot.x = fr; r.bl.rot.x = bl; r.br.rot.x = br;
        for (const l of [r.fl, r.fr, r.bl, r.br]) l.pos.y = bodyY - 0.14;
        if (expr !== r.expr) { r.expr = expr; r.head.mesh = r.heads[expr]; }
    }

    syncBall(b, dt) {
        const e = this.ball;
        e.pos.set(b.x, b.y + 0.14, b.z);
        e.rot.set(b.rx, b.ry, b.rz);
        this.ballSq += (1 - this.ballSq) * Math.min(1, dt * 14);
        const sp = Math.hypot(b.vx ?? 0, b.vz ?? 0), st = clamp(sp / 60, 0, 0.2);
        e.scale = [R_BALL * 1.3 * (1 - st * 0.4) * this.ballSq, R_BALL * 1.3 / this.ballSq, R_BALL * 1.3 * (1 + st * 0.4) * this.ballSq];
    }

    /** Crowd, flags, nets, trail. mood 0..1 per team */
    tick(dt, wind) {
        const t = (this.t += dt);
        for (const c of this.crowd) {
            const ex = this.excite[c.team];
            const jump = ex > 0.5 ? Math.abs(Math.sin(t * (6 + (c.ph % 2)) + c.ph)) * (ex - 0.3) * 1.2 : Math.sin(t * 2.4 + c.ph) * 0.05 + 0.05;
            c.e.pos.y = jump;
            c.e.hidden = c.nearEnd && this.cam.kind === "tall";     // the camera stands among them in portrait
        }
        this.excite[0] += (0.2 - this.excite[0]) * dt * 0.42; this.excite[1] += (0.2 - this.excite[1]) * dt * 0.42;
        const wa = wind?.ang ?? 0.5, wk = wind?.k ?? 3;
        this.flags.forEach((f, i) => { f.rot.y = -wa + Math.sin(t * (3 + wk * 0.2) + i * 1.7) * 0.32; f.rot.x = Math.sin(t * 5 + i) * 0.08; });
        for (const n of this.nets) {
            if (n.netT > 0) {
                n.netT -= dt;
                const amp = Math.round(clamp(n.netT / 0.5 * n.netA, 0, 3)), key = amp <= 0 ? "net0" : `net_${n.netZ}_${amp}`;
                if (n.mesh !== key) n.mesh = key;
            }
        }
        for (const p of this.trail) {
            if (p.life > 0) { p.life -= dt; p.e.scale = Math.max(0.01, p.life / p.max) * p.size; if (p.life <= 0) p.e.hidden = true; }
        }
        // Ref trots after play.
        const r = this.ref, b = this.ball.pos;
        const tx = clamp(b.x - 5 * Math.sign(b.x || 1), -HL + 3, HL - 3), tz = clamp(b.z * 0.6 + 6.5, -HW + 1, HW - 1), dx = tx - r.pos.x, dz = tz - r.pos.z, d = Math.hypot(dx, dz);
        if (d > 2.2) { const v = Math.min(9, d * 1.5) * dt; r.pos.x += dx / d * v; r.pos.z += dz / d * v; r.rot.y = Math.atan2(dx, dz); r.ph += dt * 16; r.pos.y = Math.abs(Math.sin(r.ph)) * 0.2; }
        else r.pos.y = 0;
    }

    addTrail(x, y, z, size, col) {
        const p = this.trail[this.trailI = (this.trailI + 1) % this.trail.length];
        p.e.hidden = false; p.e.teleport(x, y, z); p.life = p.max = 0.32; p.size = size; p.e.color = col;
    }

    netHit(side, z, amp) {
        const n = this.nets[side];
        // Goal entity is rotated for the -x end, which mirrors z.
        const mz = side ? z : -z;
        n.netZ = mz < -1.2 ? 0 : mz > 1.2 ? 2 : 1; n.netT = 0.5; n.netA = amp;
    }

    /** Broadcast camera. shot: optional override { eye:[x,y,z], at:[x,y,z] } */
    camera(follow, dt, o = {}) {
        const s = this.s, v = s.view, portrait = v.height > v.width * 1.05 && !this.forceWide, c = this.cam, cam = s.cam3;
        const kind = portrait ? "tall" : "wide";
        if (c.kind !== kind) { c.kind = kind; this.snapCam = true; }
        const snap = this.snapCam;
        this.snapCam = false;
        let fx = follow.x + (follow.vx ?? 0) * 0.22, fz = follow.z + (follow.vz ?? 0) * 0.12;
        if (o.focus) { fx = o.focus[0]; fz = o.focus[1]; }
        const k = snap ? 1 : 1 - Math.exp(-dt * (o.fast ? 7 : 3.4));
        c.x += (fx - c.x) * k; c.z += (fz - c.z) * k;
        const zoomTo = o.zoom ?? 1;
        c.zoom += (zoomTo - c.zoom) * (snap ? 1 : 1 - Math.exp(-dt * 2.4));
        const aspect = v.width / v.height;
        if (portrait) {
            const cx = clamp(c.x, -HL + 2, HL - 4), cz = clamp(c.z, -HW + 7, HW - 7) * 0.92;
            const back = 21 / c.zoom, h = 15.5 / c.zoom, ahead = 6.5;
            cam.fov = 42;
            this.setCam(snap, cx - back, h, cz, cx + ahead, 0.4, cz);
        } else {
            const span = clamp(aspect, 1.3, 2.2);
            const cx = clamp(c.x, -HL + 9.5 * span, HL - 9.5 * span) * 1, cz = clamp(c.z, -6, 6) * 0.4;
            const back = 37 / c.zoom, h = 21 / c.zoom;
            cam.fov = 33;
            this.setCam(snap, cx, h, cz + back, cx, 0.2, cz - 1.5);
        }
    }

    setCam(snap, ex, ey, ez, ax, ay, az) {
        const cam = this.s.cam3;
        if (snap) { cam.pos.set(ex, ey, ez); cam.target.set(ax, ay, az); cam.prevPos?.set(ex, ey, ez); cam.prevTarget?.set(ax, ay, az); }
        else { cam.pos.set(ex, ey, ez); cam.target.set(ax, ay, az); }
    }

    /** Stick direction on screen to world: depends on the camera. Returns [mx, mz]. */
    stickToWorld(sx, sy) {
        const portrait = this.cam.kind === "tall";
        if (portrait) return [-sy, sx];
        return [sx, sy];
    }
}

const crowdCache = new Map();
function buildCrowdCached(game, kits) {
    const key = `crowd_${kits[0].c1}${kits[0].c2}${kits[1].c1}${kits[1].c2}`.replace(/#/g, "");
    if (!crowdCache.has(key)) crowdCache.set(key, buildCrowd(game, key, kits));
    return crowdCache.get(key);
}

/** Registers every mesh a side needs. Returns per-goat lists for Rig. */
export function kitGoats(game, kit, team, keyBase) {
    const out = [];
    for (let i = 0; i < 5; i++) {
        const keeper = i === 0, furI = kit.furs?.[i] ?? 0, fur = FURS[furI], key = `${keyBase}_${i}`;
        out.push({
            id: team * 5 + i,
            torso: torso(game, `${key}_t`, kit, fur, keeper ? 1 : [0, 1, 4, 7, 9][i], keeper),
            leg: leg(game, `${key}_l${keeper ? "k" : ""}`, kit, fur, keeper),
            heads: [0, 1, 2, 3].map((e) => head(game, `${key}_h${e}`, fur, kit.horns ?? 0, e, keeper, kit.c2)),
        });
    }
    return out;
}

