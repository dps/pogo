// Port Lull, in card. Land is stacked contour sheets, everything else is folded model-making paper. All static
// things are merged into chunk meshes: land (no shadow cost) and buildings (casting), plus lit-window meshes per home.
import { Paper, CUT, Rand, hex, mix, mul } from "./paper.js";
import { BOUNDS, H, FLOOR, STEP, buildings, gridInfo, ground, homes, landmarks, ribbons, shoreZ, solid, sm } from "./world.js";

const C = {
    sand: hex("#f1dcae"), sand2: hex("#e8cb94"), grass: hex("#a9c77c"), grass2: hex("#86b06c"), grass3: hex("#6f9f6c"), moor: hex("#b5a0b8"), moor2: hex("#9db98a"),
    pave: hex("#dfcba6"), pave2: hex("#d4bb92"), road: hex("#ead9b8"), stone: hex("#c9bfae"), stone2: hex("#a89d90"), rock: hex("#8f8a93"), rock2: hex("#b3a79f"),
    wood: hex("#a9744f"), wood2: hex("#7f5238"), cream: hex("#fbf3e0"), dark: hex("#3a4a5c"), leaf: hex("#5f9c6e"), leaf2: hex("#7cb36f"), leaf3: hex("#e0a23f"), pine: hex("#3f7d6a"), pine2: hex("#2f6a60"),
    red: hex("#d9593f"), teal: hex("#3f8c8e"), blue: hex("#4f7fae"), yellow: hex("#efc15f"), pink: hex("#f2a5a0"), white: hex("#fff8ea"), glass: hex("#4b6a86"), plum: hex("#7a4b6e"),
};
const CH = 90;                                     // chunk size in world units
const chunkKey = (x, z) => `${Math.floor(x / CH)},${Math.floor(z / CH)}`;

class ChunkSet {
    constructor(seed, grain) { this.map = new Map(); this.seed = seed; this.grain = grain; }
    at(x, z) {
        const k = chunkKey(x, z); let p = this.map.get(k);
        if (!p) { p = new Paper(this.seed + this.map.size * 31, this.grain); p.cx = (Math.floor(x / CH) + 0.5) * CH; p.cz = (Math.floor(z / CH) + 0.5) * CH; this.map.set(k, p); }
        return p;
    }
}

function landColor(l, x, z, r) {
    const shore = shoreZ(x) - z;
    if (l <= 0) return mix(C.sand, C.sand2, Math.min(1, Math.max(0, -shore / 16 + 0.3)));
    const tw = sm(-140, -118, x) * (1 - sm(136, 156, x)) * sm(-124, -112, z);
    if (tw > 0.5) return l <= 1 ? (z > 44 ? C.stone : C.pave) : l & 1 ? C.pave : C.pave2;
    // Patchwork fields on the high ground: each field one sheet of green, ochre or lilac.
    if (z < -118 || (x > 130 && z < 30) || (x < -130 && z < -80)) {
        const a = 0.38, u = x * Math.cos(a) + z * Math.sin(a), v = -x * Math.sin(a) + z * Math.cos(a), i = Math.floor(u / 46), j = Math.floor(v / 34);
        const k = Math.abs(Math.sin(i * 12.9 + j * 78.2) * 43758.5) % 1;
        const list = [hex("#b7cf84"), hex("#97bf7a"), hex("#d9c978"), hex("#a8c88a"), hex("#c8bd8f"), hex("#8fb97e"), hex("#bfa9c4")];
        return list[Math.floor(k * list.length)];
    }
    return mix(C.grass, C.grass3, Math.min(1, l / 14) * 0.8 + 0.1 * Math.sin(x * 0.03 + z * 0.02));
}

/** Marching squares over each contour sheet. Sheets lift off each other with a pale cut edge: the look of the whole game. */
function buildLand(set) {
    const G = gridInfo(), W = G.w, r = new Rand(9);
    const val = (i, j) => G.data[j * (W + 1) + i];
    const lev = (h) => (h < 0 ? -1 : Math.floor(h / STEP));
    const yOf = (l) => (l <= 0 ? 1 : l * STEP);
    const townAt = (x, z) => x > -134 && x < 146 && z > -118 && z < 60;
    for (let j = 0; j < G.h; j++) for (let i = 0; i < W; i++) {
        const x0 = G.x0 + i * G.cs, z0 = G.z0 + j * G.cs, x1 = x0 + G.cs, z1 = z0 + G.cs;
        const h = [val(i, j), val(i + 1, j), val(i + 1, j + 1), val(i, j + 1)], P = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
        const lo = Math.min(lev(h[0]), lev(h[1]), lev(h[2]), lev(h[3])), hi = Math.max(lev(h[0]), lev(h[1]), lev(h[2]), lev(h[3]));
        if (hi < 0) continue;
        const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, p = set.at(mx, mz);
        for (let l = Math.max(0, lo); l <= hi; l++) {
            const iso = l <= 0 ? 0 : l * STEP, y = yOf(l), poly = [], cut = [];
            for (let k = 0; k < 4; k++) {
                const a = h[k], b = h[(k + 1) % 4], A = P[k], B = P[(k + 1) % 4];
                if (a >= iso) poly.push([A[0], y, A[1]]);
                if ((a >= iso) !== (b >= iso)) { const t = (iso - a) / (b - a), q = [A[0] + (B[0] - A[0]) * t, y, A[1] + (B[1] - A[1]) * t]; poly.push(q); cut.push({ q, out: a >= iso }); }
            }
            if (poly.length < 3) continue;
            // Paint the sheet only if nothing higher fully covers it.
            if (l === hi || poly.length !== 4 || lo === hi || true) {
                const col = landColor(l, mx, mz, r), c = mul(col, l & 1 ? 1 : 0.975);
                p.fan([...poly].reverse().length ? poly.slice().reverse() : poly, c);
            }
            if (cut.length === 2) {
                const a = cut[0], b = cut[1], A = a.out ? b : a, B = a.out ? a : b, y0 = l <= 0 ? -3 : yOf(l - 1), town = townAt(mx, mz);
                // A sheet's edge: a bright cut lip over the shaded thickness of the card below it.
                const body = town ? mix(C.stone, C.stone2, 0.3) : mul(mix(landColor(l, mx, mz, r), CUT, 0.22), 0.8), lip = y - 0.42, foot = mul(body, 0.74);
                p.quad([B.q[0], lip, B.q[2]], [A.q[0], lip, A.q[2]], [A.q[0], y0, A.q[2]], [B.q[0], y0, B.q[2]], body, body, foot, foot);
                p.quad([B.q[0], y, B.q[2]], [A.q[0], y, A.q[2]], [A.q[0], lip, A.q[2]], [B.q[0], lip, B.q[2]], CUT);
            }
        }
    }
}

// ---- Town furniture -----------------------------------------------------------------------------------------
function roofPanel(p, a, b, c, d, col, r, style) {
    // a-b eave, c-d ridge, seen from outside. Rows of cut tiles, each row laid on the one below.
    const rows = Math.max(3, Math.round(Math.hypot(d[0] - a[0], d[1] - a[1], d[2] - a[2]) / 1.2)), lift = 0.1;
    const nrm = cross(sub(b, a), sub(d, a)), n = norm(nrm);
    p.quad(a, b, c, d, mul(col, 0.8));
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), tabs = Math.max(3, Math.round(len / 1.7));
    for (let i = 0; i < rows; i++) {
        const v0 = i / rows, v1 = (i + 1) / rows, tone = p.wander(i % 2 ? col : mul(col, 0.93), 0.035), lo = mul(tone, 0.86);
        const L = (u, v, up) => add(lerp3(lerp3(a, d, v), lerp3(b, c, v), u), scale(n, up));
        p.quad(L(0, v0 + 0.25 / rows, lift), L(1, v0 + 0.25 / rows, lift), L(1, v1, 0.03), L(0, v1, 0.03), tone, tone, mul(tone, 1.04), mul(tone, 1.04));
        if (style === 0) for (let t = 0; t < tabs; t++) {
            const u0 = t / tabs, u1 = (t + 1) / tabs, um = (u0 + u1) / 2, e = i % 2 ? 0.5 / tabs : 0, v = v0 + 0.25 / rows;
            p.fan([L(u0, v, lift), L(u0 + (u1 - u0) * 0.14, v - 0.13 / rows, lift), L(um, v - 0.25 / rows, lift), L(u1 - (u1 - u0) * 0.14, v - 0.13 / rows, lift), L(u1, v, lift)], lo);
        }
    }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** A window applied to a wall, as layers of paper. (u, v) on the wall plane, n outward. */
function windowOn(p, glow, O, U, V, n, u, v, w, h, wall, shut, arch) {
    const P = (a, b, d) => add(add(add(O, scale(U, u + a)), scale(V, v + b)), scale(n, d));
    const sh = mul(wall, 0.72);
    p.quad(P(-w / 2 - 0.1, -h / 2 - 0.2, 0.03), P(w / 2 + 0.22, -h / 2 - 0.2, 0.03), P(w / 2 + 0.22, h / 2 + 0.06, 0.03), P(-w / 2 - 0.1, h / 2 + 0.06, 0.03), sh);      // drop shadow
    const f = 0.16, cr = C.cream;
    p.quad(P(-w / 2 - f, -h / 2 - f, 0.07), P(w / 2 + f, -h / 2 - f, 0.07), P(w / 2 + f, h / 2 + f, 0.07), P(-w / 2 - f, h / 2 + f, 0.07), cr);
    const pane = [P(-w / 2, -h / 2, 0.1), P(w / 2, -h / 2, 0.1), P(w / 2, h / 2, 0.1), P(-w / 2, h / 2, 0.1)];
    glow.fan(pane, [1, 1, 1]);
    p.quad(P(-0.05, -h / 2, 0.13), P(0.05, -h / 2, 0.13), P(0.05, h / 2, 0.13), P(-0.05, h / 2, 0.13), cr);
    p.quad(P(-w / 2, -0.05, 0.13), P(w / 2, -0.05, 0.13), P(w / 2, 0.05, 0.13), P(-w / 2, 0.05, 0.13), cr);
    p.quad(P(-w / 2 - 0.3, -h / 2 - 0.34, 0.11), P(w / 2 + 0.3, -h / 2 - 0.34, 0.11), P(w / 2 + 0.3, -h / 2 - 0.12, 0.11), P(-w / 2 - 0.3, -h / 2 - 0.12, 0.11), cr);
    if (shut) for (const s of [-1, 1]) {
        const a = s * (w / 2 + f), b = s * (w / 2 + f + w * 0.42);
        const q = s > 0 ? [P(a, -h / 2, 0.16), P(b, -h / 2, 0.16), P(b, h / 2, 0.16), P(a, h / 2, 0.16)] : [P(b, -h / 2, 0.16), P(a, -h / 2, 0.16), P(a, h / 2, 0.16), P(b, h / 2, 0.16)];
        p.fan(q, shut);
    }
}
function doorOn(p, O, U, V, n, u, w, h, col) {
    const P = (a, b, d) => add(add(add(O, scale(U, u + a)), scale(V, b)), scale(n, d));
    const pts = [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.72], [w * 0.36, h * 0.88], [0, h], [-w * 0.36, h * 0.88], [-w / 2, h * 0.72]];
    p.fan(pts.map(([a, b]) => P(a * 1.25, b * 1.12, 0.06)), C.cream);
    p.fan(pts.map(([a, b]) => P(a, b, 0.11)), col);
    p.fan([P(w * 0.26, h * 0.42, 0.14), P(w * 0.36, h * 0.42, 0.14), P(w * 0.36, h * 0.5, 0.14), P(w * 0.26, h * 0.5, 0.14)], C.yellow);
}

function bunting(p, a, b, r, cols, n = 16) {
    for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 0.72) / n, sag = (t) => -2.2 * 4 * t * (1 - t);
        const A = lerp3(a, b, t0), B = lerp3(a, b, t1); A[1] += sag(t0); B[1] += sag(t1);
        const m = lerp3(A, B, 0.5); m[1] -= 1.1;
        p.both([A, B, m], cols[i % cols.length]);
    }
}

function building(p, glow, b, r) {
    const { x, y, z, w, d, h, ridge } = b, wall = hex(b.wall), roof = hex(b.roof);
    p.at(0, 0, 0); p.reset();
    p.box(x, y - 3, z, w, h + 3, d, wall, { noTop: !!ridge });
    const faces = [
        { O: [x - w / 2, y, z + d / 2], U: [1, 0, 0], n: [0, 0, 1], len: w, front: true },
        { O: [x + w / 2, y, z - d / 2], U: [-1, 0, 0], n: [0, 0, -1], len: w },
        { O: [x + w / 2, y, z + d / 2], U: [0, 0, -1], n: [1, 0, 0], len: d },
        { O: [x - w / 2, y, z - d / 2], U: [0, 0, 1], n: [-1, 0, 0], len: d },
    ];
    const V = [0, 1, 0], shutters = r.next() < 0.6 ? mul(roof, 0.92) : null;
    for (const f of faces) {
        const cols = Math.max(1, Math.floor(f.len / 3.5)), door = f.front;
        for (let fl = 0; fl < b.floors; fl++) for (let c = 0; c < cols; c++) {
            const u = (c + 0.5) / cols * f.len;
            if (fl === 0 && door && (c === Math.floor(cols / 2))) continue;
            if (!f.front && !(c % 2) && cols > 2) continue;
            windowOn(p, glow, f.O, f.U, V, f.n, u, fl * FLOOR + 2.5, 1.5, 2.1, wall, f.front ? shutters : null);
        }
        if (door) doorOn(p, f.O, f.U, V, f.n, (Math.floor(cols / 2) + 0.5) / cols * f.len, 1.8, 3.2, b.shop ? hex(b.shop) : r.pick([C.teal, C.red, C.blue, C.plum]));
        // A band of pale card at each floor, like a printed string course.
        if (f.front) p.quad(add(f.O, [0, FLOOR, 0.05 * f.n[2]]), add(add(f.O, scale(f.U, f.len)), [0, FLOOR, 0.05 * f.n[2]]), add(add(f.O, scale(f.U, f.len)), [0, FLOOR + 0.22, 0.05 * f.n[2]]), add(f.O, [0, FLOOR + 0.22, 0.05 * f.n[2]]), mix(wall, C.cream, 0.6));
    }
    if (b.shop) { // striped scalloped awning
        const n = Math.round(w / 1.2), z0 = z + d / 2, y1 = y + 4.1, y0 = y + 3.1, out = 1.9, s = hex(b.shop);
        for (let i = 0; i < n; i++) {
            const a = x - w / 2 + i / n * w, e = x - w / 2 + (i + 1) / n * w, c = i % 2 ? C.cream : s;
            p.quad([a, y0, z0 + out], [e, y0, z0 + out], [e, y1, z0], [a, y1, z0], c);
            p.fan([[e, y0, z0 + out], [a, y0, z0 + out], [(a + e) / 2, y0 - 0.45, z0 + out]].reverse(), mul(c, 0.92));
            p.both([[a, y0, z0 + out], [e, y0, z0 + out], [(a + e) / 2, y0 - 0.45, z0 + out]], mul(c, 0.92));
        }
    }
    if (ridge) {
        const o = 0.8, top = y + h, x0 = x - w / 2 - o, x1 = x + w / 2 + o, z0 = z - d / 2 - o, z1 = z + d / 2 + o, ry = top + ridge, drop = 0.4, style = r.next() < 0.6 ? 0 : 1;
        roofPanel(p, [x0, top - drop, z1], [x1, top - drop, z1], [x1, ry, z], [x0, ry, z], roof, r, style);
        roofPanel(p, [x1, top - drop, z0], [x0, top - drop, z0], [x0, ry, z], [x1, ry, z], roof, r, style);
        p.quad([x0, top - drop - 0.02, z0], [x1, top - drop - 0.02, z0], [x1, top - drop - 0.02, z1], [x0, top - drop - 0.02, z1], mul(C.cream, 0.7));
        for (const s of [-1, 1]) {
            const X = x + s * w / 2; const tri = [[X, top, z - d / 2], [X, top, z + d / 2], [X, ry - 0.1, z]];
            p.fan(s > 0 ? tri.slice().reverse() : tri, mix(wall, C.cream, 0.15));
            // cut-card barge boards
            const E = x + s * (w / 2 + o), T = 0.34, q = (a, c) => { p.both([[E, a[0], a[1]], [E, c[0], c[1]], [E, c[0] + T, c[1]], [E, a[0] + T, a[1]]], C.cream); };
            q([top - drop, z1], [ry, z]); q([top - drop, z0], [ry, z]);
        }
        p.quad([x0, ry + 0.06, z - 0.32], [x0, ry + 0.06, z + 0.32], [x1, ry + 0.06, z + 0.32], [x1, ry + 0.06, z - 0.32], mix(roof, C.cream, 0.45));
        if (b.tower) {
            const tw = 5.4, tb = top + ridge * 0.6, th = 7;
            p.box(x, tb, z, tw, th, tw, wall, { noTop: true });
            const pts = [[x - tw / 2 - 0.5, tb + th, z + tw / 2 + 0.5], [x + tw / 2 + 0.5, tb + th, z + tw / 2 + 0.5], [x, tb + th + 4.4, z]];
            for (let k = 0; k < 4; k++) { const a = k * 1.5708, rot = (q) => [x + (q[0] - x) * Math.cos(a) - (q[2] - z) * Math.sin(a), q[1], z + (q[0] - x) * Math.sin(a) + (q[2] - z) * Math.cos(a)]; p.tri(rot(pts[0]), rot(pts[1]), rot(pts[2]), k % 2 ? roof : mul(roof, 0.86)); }
            const fz = z + tw / 2 + 0.05, cy = tb + th * 0.56;
            const disc = []; for (let i = 0; i < 16; i++) disc.push([x + 1.75 * Math.cos(i / 16 * 6.2832), cy + 1.75 * Math.sin(i / 16 * 6.2832), fz]);
            p.fan(disc, C.cream);
            p.fan([[x - 0.1, cy, fz + 0.04], [x + 0.1, cy, fz + 0.04], [x + 0.1, cy + 1.3, fz + 0.04], [x - 0.1, cy + 1.3, fz + 0.04]], C.dark);
            p.fan([[x, cy - 0.1, fz + 0.04], [x + 1, cy - 0.1, fz + 0.04], [x + 1, cy + 0.1, fz + 0.04], [x, cy + 0.1, fz + 0.04]], C.dark);
        }
    }
    if (b.chim) {
        const [cx, top, cz] = b.chim, t0 = y + h;
        p.box(cx, t0, cz, 1.9, top - t0, 1.9, mix(hex("#c97b5c"), wall, 0.15), { top: C.dark });
        p.box(cx, top - 0.5, cz, 2.2, 0.36, 2.2, C.cream);
        p.pleat(cx, top, cz, 0.5, 1, 6, hex("#c97b5c"), { r2: 0.42, cap: C.dark });
    }
    // Flower box under a front window, a dab of colour.
    if (r.next() < 0.6) { const fx = x - w / 2 + (0.5 / Math.max(1, Math.floor(w / 3.5))) * w; for (let i = 0; i < 5; i++) { const px = fx + (i - 2) * 0.32, c = r.pick([C.red, C.pink, C.yellow, C.white]); p.fan([[px - 0.18, y + 1.15, z + d / 2 + 0.34], [px + 0.18, y + 1.15, z + d / 2 + 0.34], [px + 0.18, y + 1.5, z + d / 2 + 0.34], [px - 0.18, y + 1.5, z + d / 2 + 0.34]], c); } }
}

function pine(p, x, y, z, s, r) {
    p.reset();
    p.pleat(x, y, z, 0.5 * s, 2 * s, 6, C.wood, { r2: 0.35 * s, foot: 0.8 });
    const g = r.next() < 0.5 ? C.pine : mix(C.pine, C.pine2, 0.7), rot = r.next() * 6;
    p.pleat(x, y + 1.3 * s, z, 3.1 * s, 3.6 * s, 10, g, { under: true, rot, foot: 0.72, alt: 0.8 });
    p.pleat(x, y + 3.1 * s, z, 2.5 * s, 3.2 * s, 10, mix(g, C.leaf2, 0.14), { under: true, rot: rot + 0.3, foot: 0.74, alt: 0.8 });
    p.pleat(x, y + 4.9 * s, z, 1.8 * s, 3 * s, 10, mix(g, C.leaf2, 0.28), { under: true, rot: rot + 0.6, foot: 0.76, alt: 0.8 });
}
/** A pop-up tree: two scalloped discs slotted through each other, with a card trunk. */
function popTree(p, x, y, z, s, r, tone) {
    p.reset();
    p.pleat(x, y, z, 0.42 * s, 3.2 * s, 6, C.wood2, { r2: 0.3 * s, foot: 0.8 });
    const n = 11, cy = y + 5.6 * s, R = 3.5 * s, g = tone ?? r.pick([C.leaf, C.leaf2, mix(C.leaf, C.leaf2, 0.5), mix(C.leaf2, C.leaf3, 0.35)]), a0 = r.next() * 3;
    for (let k = 0; k < 3; k++) {
        const a = a0 + k * 1.0472, ux = Math.cos(a), uz = Math.sin(a), pts = [];
        for (let i = 0; i < n * 2; i++) { const t = i / (n * 2) * 6.2832, q = R * (i % 2 ? 0.86 : 1.02); pts.push([x + ux * q * Math.cos(t), cy + q * Math.sin(t) * 1.06, z + uz * q * Math.cos(t)]); }
        p.both(pts, mul(g, 1 - k * 0.09));
    }
    const puff = 7; for (let i = 0; i < 3; i++) p.pleat(x, cy + (i - 1) * 2.1 * s, z, (2.5 - Math.abs(i - 1)) * s, 0.01, 0, g);
}
function hedge(p, x0, z0, x1, z1, y, col, r) {
    p.reset();
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 2.6));
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; p.pleat(x, y, z, 1.5, 1.8 + r.next() * 0.6, 8, p.wander(col, 0.06), { r2: 1.0, cap: mul(col, 1.1) }); }
}
function fence(p, x0, z0, x1, z1, y, col) {
    p.reset();
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.1)), dx = (x1 - x0) / n, dz = (z1 - z0) / n;
    for (let i = 0; i <= n; i++) {
        const x = x0 + dx * i, z = z0 + dz * i, nx = -dz * 0.3, nz = dx * 0.3;
        p.both([[x - nx, y, z - nz], [x + nx, y, z + nz], [x + nx, y + 1.5, z + nz], [x, y + 1.9, z], [x - nx, y + 1.5, z - nz]], col);
    }
    p.both([[x0, y + 0.9, z0], [x1, y + 0.9, z1], [x1, y + 1.2, z1], [x0, y + 1.2, z0]], mul(col, 0.9));
}
function beachHut(p, x, z, col) {
    const y = ground(x, z), w = 4, d = 4, h = 4.2;
    p.reset();
    const n = 7;
    for (let i = 0; i < n; i++) { const a = x - w / 2 + i / n * w, e = a + w / n, c = i % 2 ? C.cream : col; p.quad([a, y, z + d / 2], [e, y, z + d / 2], [e, y + h, z + d / 2], [a, y + h, z + d / 2], mul(c, 0.86), mul(c, 0.86), c, c); }
    p.box(x, y, z - 0.02, w, h, d - 0.02, C.cream, { noTop: true });
    p.fan([[x - w / 2 - 0.4, y + h, z + d / 2 + 0.4], [x + w / 2 + 0.4, y + h, z + d / 2 + 0.4], [x, y + h + 2, z]], col);
    p.fan([[x + w / 2 + 0.4, y + h, z + d / 2 + 0.4], [x + w / 2 + 0.4, y + h, z - d / 2 - 0.4], [x, y + h + 2, z]], mul(col, 0.85));
    p.fan([[x - w / 2 - 0.4, y + h, z - d / 2 - 0.4], [x - w / 2 - 0.4, y + h, z + d / 2 + 0.4], [x, y + h + 2, z]], mul(col, 0.85));
    p.fan([[x + w / 2 + 0.4, y + h, z - d / 2 - 0.4], [x - w / 2 - 0.4, y + h, z - d / 2 - 0.4], [x, y + h + 2, z]], col);
    solid(x - w / 2, y, z - d / 2, x + w / 2, y + h + 1.2, z + d / 2, "hut");
}
function boat(p, x, y, z, yaw, col) {
    p.at(x, y, z, yaw);
    const L = 5, W = 1.8, H_ = 1.1;
    p.both([[-L, H_, 0], [-L * 0.4, 0, W * 0.8], [L * 0.6, 0, W * 0.8], [L, H_ * 1.2, 0], [L * 0.5, H_, W], [-L * 0.5, H_, W]], col);
    p.both([[-L, H_, 0], [-L * 0.5, H_, -W], [L * 0.5, H_, -W], [L, H_ * 1.2, 0], [L * 0.6, 0, -W * 0.8], [-L * 0.4, 0, -W * 0.8]], mul(col, 0.9));
    p.quad([-L * 0.5, H_ * 0.9, W], [L * 0.5, H_ * 0.9, W], [L * 0.5, H_ * 0.9, -W], [-L * 0.5, H_ * 0.9, -W], C.cream);
    p.both([[0.1, H_, 0], [0.3, H_, 0], [0.3, 7, 0], [0.1, 7, 0]], C.wood);
    p.both([[0.4, 1.8, 0], [3.8, 1.8, 0], [0.4, 6.8, 0]], C.white, C.white);
    p.reset();
}

function lighthouse(p, glow, r) {
    const { x, y, z } = landmarks.light, bands = 5, H0 = 34, R0 = 7, R1 = 4.7;
    for (let i = 0; i < bands; i++) {
        const t0 = i / bands, t1 = (i + 1) / bands, c = i % 2 ? C.white : C.red;
        p.pleat(x, y + t0 * H0, z, R0 + (R1 - R0) * t0, (t1 - t0) * H0, 18, c, { r2: R0 + (R1 - R0) * t1, foot: 0.93, alt: 0.92 });
    }
    p.pleat(x, y + H0, z, 7, 0.7, 18, C.dark, { r2: 7, cap: C.dark, under: true });
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.2832; p.both([[x + 6.7 * Math.cos(a) - 0.06, y + H0 + 0.7, z + 6.7 * Math.sin(a)], [x + 6.7 * Math.cos(a) + 0.06, y + H0 + 0.7, z + 6.7 * Math.sin(a)], [x + 6.7 * Math.cos(a) + 0.06, y + H0 + 2.6, z + 6.7 * Math.sin(a)], [x + 6.7 * Math.cos(a) - 0.06, y + H0 + 2.6, z + 6.7 * Math.sin(a)]], C.dark); }
    p.pleat(x, y + H0 + 0.7, z, 3.9, 5.2, 12, hex("#f8e3a0"), { r2: 3.9, foot: 1 });
    p.pleat(x, y + H0 + 5.9, z, 4.9, 3.8, 12, C.red, { under: true, alt: 0.86 });
    p.pleat(x, y + H0 + 9.7, z, 0.5, 1, 6, C.yellow, { r2: 0.2, cap: C.yellow });
    p.box(x + 15, y, z, 14, 7, 12, hex("#fbf1dc"), { noTop: true });
    const tri = (a, b, c, col) => p.tri(a, b, c, col);
    roofPanel(p, [x + 7.6, y + 6.8, z + 6.6], [x + 22.4, y + 6.8, z + 6.6], [x + 22.4, y + 11, z], [x + 7.6, y + 11, z], hex("#54657f"), r, 0);
    roofPanel(p, [x + 22.4, y + 6.8, z - 6.6], [x + 7.6, y + 6.8, z - 6.6], [x + 7.6, y + 11, z], [x + 22.4, y + 11, z], hex("#54657f"), r, 0);
    tri([x + 22, y + 7, z + 6], [x + 22, y + 7, z - 6], [x + 22, y + 10.8, z], C.cream);
    doorOn(p, [x - 7, y, z + 7], [1, 0, 0], [0, 1, 0], [0, 0, 1], 7, 2, 3.6, C.teal);
    for (const h of [11, 20, 28]) windowOn(p, glow, [x, y, z + (R0 + (R1 - R0) * h / H0)], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0, h, 1.3, 1.9, C.white, null);
    windowOn(p, glow, [x + 8, y, z + 6], [1, 0, 0], [0, 1, 0], [0, 0, 1], 7, 3.4, 1.5, 2.1, C.cream, C.teal);
}
function chapel(p, glow, r) {
    const { x, y, z } = landmarks.chapel, wall = hex("#f4e8d0"), roof = hex("#54657f");
    p.box(x, y - 3, z - 2, 16, 15, 26, wall, { noTop: true });
    const y1 = y + 12, y2 = y1 + 7;
    roofPanel(p, [x + 8.7, y1 - 0.2, z + 11.8], [x + 8.7, y1 - 0.2, z - 15.8], [x, y2, z - 15.8], [x, y2, z + 11.8], roof, r, 0);
    roofPanel(p, [x - 8.7, y1 - 0.2, z - 15.8], [x - 8.7, y1 - 0.2, z + 11.8], [x, y2, z + 11.8], [x, y2, z - 15.8], roof, r, 0);
    p.tri([x + 8, y1, z - 15], [x - 8, y1, z - 15], [x, y2 - 0.2, z - 15], wall);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        const O = [x + s * 8, y, z - 11 + i * 6.4], n = [s, 0, 0], U = [0, 0, 1];
        const P = (a, b, d) => add(add(add(O, scale(U, a)), [0, b, 0]), scale(n, d));
        const pts = [[-1.1, 2.6], [1.1, 2.6], [1.1, 7], [0.8, 8], [0, 8.8], [-0.8, 8], [-1.1, 7]];
        const shp = (s > 0 ? pts : [...pts].reverse());
        p.fan(shp.map(([a, b]) => P(a * 1.25, b + (b > 4 ? 0.1 : -0.1), 0.05)), C.cream);
        glow.fan(shp.map(([a, b]) => P(a, b, 0.09)), [1, 1, 1]);
    }
    // Bell tower: base, four posts, a floor, a cap. The gap is real; a bold pilot can pass through it.
    const tx = x, tz = z + 18;
    p.box(tx, y - 3, tz, 12, 21, 12, wall, { noTop: true, foot: 0.9 });
    p.box(tx, y + 18, tz, 13.4, 0.5, 13.4, C.cream, { bottom: true });
    for (const [a, b] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) p.box(tx + a, y + 18, tz + b, 2, 10, 2, wall, { noTop: true, foot: 1 });
    p.box(tx, y + 28, tz, 13.4, 0.8, 13.4, C.cream, { bottom: true });
    for (let k = 0; k < 4; k++) {
        const a = k * 1.5708, c = Math.cos(a), s = Math.sin(a), rot = (q) => [tx + q[0] * c - q[1] * s, y + q[2], tz + q[0] * s + q[1] * c];
        p.tri(rot([-6.7, 6.7, 28.8]), rot([6.7, 6.7, 28.8]), rot([0, 0, 40]), k % 2 ? roof : mul(roof, 0.86));
    }
    p.pleat(tx, y + 39.4, tz, 0.3, 3, 4, C.yellow, { r2: 0.1 });
    doorOn(p, [tx - 6, y, tz + 6], [1, 0, 0], [0, 1, 0], [0, 0, 1], 6, 2.8, 5, C.wood2);
    p.pleat(tx, y + 22.6, tz, 1.5, 3, 10, C.yellow, { r2: 0.7, cap: C.yellow, under: true });        // the bell
}
function windmill(p) {
    const { x, y, z } = landmarks.mill;
    p.pleat(x, y - 2, z, 7.4, 22, 12, hex("#f4e8d0"), { r2: 4.6, foot: 0.86, alt: 0.9 });
    p.pleat(x, y + 8, z, 8.6, 0.5, 12, C.wood, { r2: 8.6, cap: C.wood, under: true });
    p.pleat(x, y + 20, z, 5.4, 5, 12, C.red, { under: true, alt: 0.86 });
    doorOn(p, [x, y, z + 7.2], [1, 0, 0], [0, 1, 0], [0, 0, 1], 0, 2.2, 3.8, C.teal);
}
function viaduct(p) {
    const V = landmarks.viaduct, y = V.deck, n = 7, step = (V.x1 - V.x0) / n, col = hex("#d7b48f"), c2 = hex("#c9a07e");
    for (let i = 0; i <= n; i++) {
        const x = V.x0 + step * i, g = ground(x, V.z);
        p.box(x, g - 3, V.z, 6, y - g + 3, 8, col, { noTop: true });
    }
    for (let i = 0; i < n; i++) { // arches: the spandrel cut from one sheet, in slices around a half circle
        const x0 = V.x0 + step * i + 3, x1 = x0 + step - 6, cx = (x0 + x1) / 2, R = (x1 - x0) / 2, top = y + 1.5, seg = 10;
        for (const zs of [1, -1]) {
            const zz = V.z + zs * 4;
            for (let k = 0; k < seg; k++) {
                const a0 = Math.PI * k / seg, a1 = Math.PI * (k + 1) / seg, A = [cx + R * Math.cos(a0), y - 7 + R * 0.55 * Math.sin(a0), zz], B = [cx + R * Math.cos(a1), y - 7 + R * 0.55 * Math.sin(a1), zz];
                const q = [[A[0], top, zz], A, B, [B[0], top, zz]], f = zs > 0 ? q.slice().reverse() : q;
                p.fan(f, k % 2 ? col : c2);
            }
        }
        for (let k = 0; k < seg; k++) {
            const a0 = Math.PI * k / seg, a1 = Math.PI * (k + 1) / seg;
            p.quad([cx + R * Math.cos(a1), y - 7 + R * 0.55 * Math.sin(a1), V.z - 4], [cx + R * Math.cos(a0), y - 7 + R * 0.55 * Math.sin(a0), V.z - 4], [cx + R * Math.cos(a0), y - 7 + R * 0.55 * Math.sin(a0), V.z + 4], [cx + R * Math.cos(a1), y - 7 + R * 0.55 * Math.sin(a1), V.z + 4], mul(c2, 0.72));
        }
    }
    p.box((V.x0 + V.x1) / 2, y + 1.5, V.z, V.x1 - V.x0 + 8, 0.7, 9, C.cream, { bottom: true });
    p.box((V.x0 + V.x1) / 2, y + 2.2, V.z - 1.2, V.x1 - V.x0 + 8, 0.2, 0.4, C.dark);
    p.box((V.x0 + V.x1) / 2, y + 2.2, V.z + 1.2, V.x1 - V.x0 + 8, 0.2, 0.4, C.dark);
}
function pier(p) {
    const P = landmarks.pier, w = 12, pn = Math.round((P.z1 - P.z0) / 1.6);
    for (let i = 0; i < pn; i++) { const z0 = P.z0 + i * 1.6, c = i % 2 ? C.wood : mul(C.wood, 1.14); p.quad([P.x - w / 2, P.deck + 1, z0 + 1.55], [P.x + w / 2, P.deck + 1, z0 + 1.55], [P.x + w / 2, P.deck + 1, z0], [P.x - w / 2, P.deck + 1, z0], c); }
    p.box(P.x, P.deck, (P.z0 + P.z1) / 2, w, 1, P.z1 - P.z0, C.wood2, { noTop: true, bottom: true });
    for (let z = P.z0 + 12; z < P.z1; z += 18) { for (const s of [-5, 5]) p.box(P.x + s, -2, z, 1, P.deck + 2, 1, C.wood2, { noTop: true }); }
    const z = P.z1 - 7;
    p.box(P.x, P.deck + 1, z, 18, 7, 14, hex("#f4d5c0"), { noTop: true });
    p.pleat(P.x, P.deck + 8, z, 11.5, 6, 12, C.red, { under: true, alt: 0.82 });
    for (let i = 0; i < 6; i++) p.pleat(P.x + (i - 2.5) * 3, P.deck + 1, P.z1 + 0.03, 0.01, 0.01, 0, C.red);
    for (let k = P.z0 + 6; k < P.z1 - 16; k += 12) for (const s of [-1, 1]) { p.box(P.x + s * 5.4, P.deck + 1, k, 0.3, 4, 0.3, C.dark); p.pleat(P.x + s * 5.4, P.deck + 5, k, 0.5, 0.9, 6, C.yellow, { r2: 0.3, cap: C.yellow }); }
}
function rockPile(p, x, z, w, h, d, r, col = C.rock) {
    const y = -3; p.reset();
    const n = 8, layers = Math.round((h + 3) / 3.2);
    for (let l = 0; l < layers; l++) {
        const t = l / layers, k0 = 1 - t * t * 0.32, k1 = 1 - (t + 1 / layers) ** 2 * 0.32, y0 = y + l * 3.2, y1 = y0 + 3.2, c = mix(col, C.rock2, (l % 3) * 0.3);
        p.box(x, y0, z, w * k0, 3.2, d * k0, c, { noTop: false, foot: 0.9, taper: k1 / k0, top: CUT });
    }
}
function needle(p, r) {
    const N = landmarks.needle;
    for (let i = 0; i < 11; i++) {
        const y0 = -3 + i * 3.2, c = mix(C.rock, C.rock2, (i % 3) * 0.3), t = 1 - Math.abs(i - 5) * 0.02;
        p.box(N.x - 10.5, y0, N.z, 7 * t, 3.2, 14 * t, c, { top: CUT, foot: 0.9 });
        p.box(N.x + 10.5, y0, N.z, 7 * t, 3.2, 14 * t, c, { top: CUT, foot: 0.9 });
    }
    for (let i = 0; i < 6; i++) p.box(N.x, 22 + i * 3.2, N.z, 28 - i * 2, 3.2, 14 - i * 0.7, mix(C.rock, C.rock2, (i % 3) * 0.3), { top: i === 5 ? C.grass2 : CUT, bottom: i === 0, foot: 0.9 });
}
function cutRoof(p, r) { for (let i = 0; i < 9; i++) p.box(196, 16 + i * 3.2, 148, 40 - i * 1.6, 3.2, 60 - i * 2, mix(C.rock, C.rock2, (i % 3) * 0.3), { top: i === 8 ? C.grass2 : CUT, bottom: i === 0, foot: 0.9 }); }

/** Build every static chunk. Returns the lists the stage draws each frame. */
export function buildTown(assets) {
    const land = new ChunkSet(11, 40), things = new ChunkSet(21, 22), r = new Rand(77);
    buildLand(land);
    const glowHomes = {}; const glowTown = new ChunkSet(31, 22);
    for (const b of buildings) {
        const g = b.id ? (glowHomes[b.id] ??= new Paper(5, 22)) : glowTown.at(b.x, b.z);
        building(things.at(b.x, b.z), g, b, r);
    }
    const P = (lm) => things.at(lm.x, lm.z);
    const glowLight = (glowHomes.light = new Paper(5, 22)); lighthouse(P(landmarks.light), glowLight, r);
    const glowChapel = (glowHomes.chapel = new Paper(5, 22)); chapel(P(landmarks.chapel), glowChapel, r);
    windmill(P(landmarks.mill));
    const vd = new Paper(3, 22); viaduct(vd); vd.cx = -76; vd.cz = -150; things.map.set("viaduct", vd);
    const pr = new Paper(3, 22); pier(pr); pr.cx = -6; pr.cz = 104; things.map.set("pier", pr);
    needle(P(landmarks.needle), r);
    const cr = new Paper(4, 22); cutRoof(cr, r); cr.cx = 196; cr.cz = 148; things.map.set("cutroof", cr);

    // Harbour wall and its little light.
    { const O = landmarks.mole, p = things.at(O.x, 90); p.box(O.x, -3, (O.z0 + O.z1) / 2, 10, 7, O.z1 - O.z0, C.stone, { top: C.stone2 }); for (let i = 0; i < 4; i++) p.pleat(O.x, 4 + i * 2.6, O.z1 - 2.5, 2.3 - i * 0.14, 2.6, 10, i % 2 ? C.white : C.teal, { r2: 2.2 - i * 0.14, cap: C.dark }); }
    // Band stand on the square.
    { const B = landmarks.bandstand, p = things.at(B.x, B.z); p.pleat(B.x, 9, B.z, 8.5, 0.6, 12, C.cream, { r2: 8.5, cap: C.white }); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832; p.box(B.x + Math.cos(a) * 7, 9, B.z + Math.sin(a) * 7, 0.5, 6, 0.5, C.white); } p.pleat(B.x, 15, B.z, 9, 4, 12, C.teal, { under: true, alt: 0.8 }); }

    // Roads: paper strips along each terrace, with steps of pale card climbing between them.
    const road = (x0, x1, z0, z1, y, col = C.road) => { for (let x = x0; x < x1 - 1e-3;) { const e = Math.min(x + 40, x1), p = land.at((x + e) / 2, (z0 + z1) / 2); p.quad([x, y + 0.08, z1], [e, y + 0.08, z1], [e, y + 0.08, z0], [x, y + 0.08, z0], col); x = e; } };
    road(-122, 130, 41, 54, 3); road(-124, 130, -7, 6, 9); road(-124, 130, -52, -39, 15); road(-110, 110, -89, -80, 21);
    for (const [x, y, z0] of [[-4, 3, 12], [44, 3, 12], [-74, 3, 12], [-3, 9, -28], [64, 9, -28], [-74, 9, -28], [6, 15, -72], [52, 15, -72]]) {
        for (let i = 0; i < 6; i++) { const yy = y + (i + 1), zz = z0 + 1 * 0 - i * 0.84 + 3, p = things.at(x, zz); p.box(x, yy - 1, zz, 5, 1, 1.1, i % 2 ? C.cream : C.pave2, {}); }
    }
    { // Square in front of the Post Office: a cobbled circle of cut card.
        const p = land.at(14, -1), pts = []; for (let i = 0; i < 28; i++) pts.push([14 + 22 * Math.cos(-i / 28 * 6.2832), 9.14, 2 + 7 * Math.sin(-i / 28 * 6.2832)]); p.fan(pts, C.pave2);
    }
    // Trees and hedges: hand-placed clumps in the town, then a scatter over the hills.
    const tp = (x, z) => things.at(x, z);
    for (const [x, z, s] of [[-126, 20, 1], [-122, -30, 1.1], [-120, -72, 1.2], [128, -22, 1.1], [132, -64, 1.2], [136, 22, 1], [-8, -100, 0.9], [22, -104, 1], [-34, -2.5, 0.6], [60, -2, 0.6], [-70, -46, 0.7], [64, -46, 0.7], [-100, 16, 0.7], [74, 15, 0.7]]) popTree(tp(x, z), x, ground(x, z), z, s, r);
    for (let z = -104; z <= -90; z += 2.5) { /* the disputed fence */ }
    fence(tp(-6, -96), -6, -106, -6, -84, 21, C.white);
    popTree(tp(-11, -88), -11, 21, -92, 1.0, r, mix(C.leaf2, C.leaf3, 0.6));      // the pear tree
    hedge(tp(100, -110), 40, -118, 110, -118, ground(70, -118), C.pine, r);
    hedge(tp(-60, -118), -110, -118, 30, -118, ground(-40, -118), C.leaf, r);
    const trees = new Rand(4242);
    for (let i = 0; i < 1800; i++) {
        const x = trees.range(BOUNDS.x0 - 60, BOUNDS.x1 + 60), z = trees.range(BOUNDS.z0 - 60, 200), h = H(x, z), y = ground(x, z);
        if (h < 5) continue;
        if (x > -146 && x < 154 && z > -122 && z < 70) continue;
        if (Math.hypot(x - landmarks.chapel.x, z - landmarks.chapel.z) < 34 || Math.hypot(x - landmarks.light.x, z - landmarks.light.z) < 34 || Math.hypot(x - landmarks.mill.x, z - landmarks.mill.z) < 30) continue;
        if (Math.abs(z + 150) < 14 && x > -170 && x < 18) continue;
        // Woods in clumps, moor mostly bare.
        const clump = Math.sin(x * 0.027 + 2) * Math.cos(z * 0.031) + Math.sin(x * 0.011 - z * 0.017);
        if (clump < 0.45) continue;
        const s = trees.range(0.9, 1.5), p = tp(x, z);
        if (trees.next() < 0.62) pine(p, x, y, z, s, trees); else popTree(p, x, y, z, s, trees);
        solid(x - 1.7 * s, y, z - 1.7 * s, x + 1.7 * s, y + 8 * s, z + 1.7 * s, "tree");
    }
    // A row of beach huts and a few boats drawn up on the sand; a washing line of bunting over each street.
    [C.teal, C.red, C.yellow, C.blue, C.pink, C.teal, C.red].forEach((c, i) => { const x = -136 + i * 8.4; beachHut(tp(x, 66), x, 66, c); });
    { const p = tp(-90, 80); boat(p, -92, 1, 84, 0.5, C.blue); boat(p, -76, 1, 92, -0.3, C.red); }
    const bc = [C.red, C.yellow, C.teal, C.pink, C.white];
    const flags = (x0, y0, z0, x1, y1, z1) => bunting(tp((x0 + x1) / 2, (z0 + z1) / 2), [x0, y0, z0], [x1, y1, z1], r, bc);
    flags(-60, 13, 37, -60, 12, 56); flags(36, 13, 37, 36, 12, 56); flags(-40, 19, -11, 14, 16, 9); flags(14, 16, 9, 68, 19, -11); flags(-50, 24, -55, 20, 24, -40); flags(14, 22, 58, 14, 8, 70);
    // Allotment beds on Top Lane.
    for (let i = 0; i < 6; i++) { const x = -44 + i * 7, p = tp(x, -112); p.box(x, 21, -112, 5, 0.5, 8, i % 2 ? C.wood2 : mix(C.wood2, C.leaf, 0.3), { top: i % 2 ? C.leaf2 : C.leaf }); }

    const out = { land: [], things: [], glowTown: [], glowHomes: {} };
    const name = (l, set, pre) => { let i = 0; for (const [, p] of set.map) { const n = `${pre}${i++}`; p.commit(assets, n); l.push({ name: n, x: p.cx, z: p.cz, r: p.cx > 300 ? 200 : 110, verts: p.verts }); } };
    name(out.land, land, "land"); name(out.things, things, "thing"); name(out.glowTown, glowTown, "glow");
    for (const [id, p] of Object.entries(glowHomes)) { const n = `glow_${id}`; p.commit(assets, n); out.glowHomes[id] = n; }
    return out;
}
