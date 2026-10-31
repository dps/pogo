// Turns a level map into collision boxes, a flow field and one merged diorama mesh.
import { hash, newMesh, quad, stamp, rgb } from "./vox.js";
import { props } from "./models.js";

const SOLIDISH = "#hxpTAC^bor";
const BLOCK_SIZES = { F: [7, 5], B: [7, 7], M: [5, 5], W: [2, 2], c: [3, 2] };

/** Parse map rows into a level: tiles, solids, spawn lists. */
export function parseLevel(def) {
    const rows = def.map, h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const at = (c, r) => (r >= 0 && r < h && c >= 0 && c < w ? rows[r][c] ?? "." : " ");
    const L = { def, w, h, at, boxes: new Array(w * h).fill(null), block: new Uint8Array(w * h), spawns: [], rams: [], dens: [], weak: [], lanterns: [], blocks: [], dog: [w / 2, h - 1], bull: null, entry: [], pen: null };
    const id = (c, r) => c + r * w;
    const addBox = (c, r, x0, z0, x1, z1) => { const i = id(c, r); (L.boxes[i] ??= []).push(c + x0, r + z0, c + x1, r + z1); L.block[i] = 1; };

    // Pen rectangle
    let c0 = 1e9, c1 = -1, r0 = 1e9, r1 = -1;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (at(c, r) === "p") { c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); }
    L.pen = { c0, c1, r0, r1, x0: c0 + 0.5, x1: c1 + 0.5, z0: r0 + 0.5, z1: r1 + 0.5 };
    const penRim = (c, r) => at(c, r) === "p" && (c === c0 || c === c1 || r === r0 || r === r1);
    const fenceLike = (c, r) => "#x".includes(at(c, r)) || at(c, r) === "h";
    L.penRim = penRim;
    const T = 0.12;
    const armsBox = (c, r, join) => {
        const n = join(c, r - 1), s = join(c, r + 1), e = join(c + 1, r), wst = join(c - 1, r);
        if (e) addBox(c, r, 0.5 - T, 0.5 - T, 1, 0.5 + T);
        if (wst) addBox(c, r, 0, 0.5 - T, 0.5 + T, 0.5 + T);
        if (s) addBox(c, r, 0.5 - T, 0.5 - T, 0.5 + T, 1);
        if (n) addBox(c, r, 0.5 - T, 0, 0.5 + T, 0.5 + T);
        if (!n && !s && !e && !wst) addBox(c, r, 0.5 - T, 0.5 - T, 0.5 + T, 0.5 + T);
    };
    const done = new Set();
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const ch = at(c, r), cx = c + 0.5, cz = r + 0.5;
        if (ch === "s") L.spawns.push([cx, cz]);
        else if (ch === "a") L.rams.push([cx, cz]);
        else if (ch === "d") L.dog = [cx, cz];
        else if (ch === "w") L.dens.push([cx, cz]);
        else if (ch === "u") L.bull = [cx, cz];
        else if (ch === "e") L.entry.push([c, r]);
        else if (ch === "l") { L.lanterns.push([cx, cz]); addBox(c, r, 0.35, 0.35, 0.65, 0.65); }
        else if (ch === "~") addBox(c, r, 0, 0, 1, 1);
        else if (ch === "h") addBox(c, r, 0, 0, 1, 1);
        else if (ch === "#") armsBox(c, r, fenceLike);
        else if (ch === "x") { L.weak.push([c, r]); addBox(c, r, 0, 0.35, 1, 0.65); }
        else if (ch === "p" && penRim(c, r)) armsBox(c, r, penRim);
        else if ("TAC^".includes(ch)) addBox(c, r, 0.28, 0.28, 0.72, 0.72);
        else if ("ob".includes(ch)) addBox(c, r, 0.1, 0.1, 0.9, 0.9);
        else if (ch === "r") addBox(c, r, 0.08, 0.08, 0.92, 0.92);
        else if (ch === "S") addBox(c, r, 0.35, 0.35, 0.65, 0.65);
        else if (BLOCK_SIZES[ch] && !done.has(id(c, r))) {
            const [bw, bh] = BLOCK_SIZES[ch];
            L.blocks.push({ ch, c, r, bw, bh });
            for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { done.add(id(c + i, r + j)); if (c + i < w && r + j < h) addBox(c + i, r + j, 0, 0, 1, 1); }
        }
    }
    const inner = { x0: c0 + 1.15, x1: c1 - 0.15, z0: r0 + 1.15, z1: r1 - 0.15 };
    L.pen.inner = inner;
    computeFlow(L);
    return L;
}

/** Breadth-first walking distance to the pen entry. Rickety fences count as passable: they are meant to break. */
export function computeFlow(L) {
    const { w, h } = L, flow = new Float32Array(w * h).fill(1e6), q = [];
    const open = (c, r) => c >= 0 && r >= 0 && c < w && r < h && (!L.block[c + r * w] || L.at(c, r) === "x" || (L.boxes[c + r * w]?.length && L.at(c, r) === "#" && false));
    for (const [c, r] of L.entry) { flow[c + r * w] = 0; q.push(c + r * w); }
    for (let i = 0; i < q.length; i++) {
        const t = q[i], c = t % w, r = (t - c) / w, d = flow[t];
        for (const [dx, dz, k] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1]]) {
            const nc = c + dx, nr = r + dz;
            if (open(nc, nr) && flow[nc + nr * w] > d + k) { flow[nc + nr * w] = d + k; q.push(nc + nr * w); }
        }
    }
    // Thin fences fill a tile on the grid but not in space, so animals can stand on those tiles: give them the best neighbouring value.
    const copy = flow.slice();
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        if (copy[c + r * w] < 1e6) continue;
        let b = 1e6;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + dx, nr = r + dz; if (nc >= 0 && nr >= 0 && nc < w && nr < h && copy[nc + nr * w] < b) b = copy[nc + nr * w]; }
        if (b < 1e6) flow[c + r * w] = b + 1;
    }
    L.flow = flow; L.open = open;
}

const GRASS = [0x86b954, 0x90c05c, 0x7aaf4e, 0x9dc768].map(rgb);
const DIRT = [0xc9a26a, 0xbf9660, 0xd2ae78].map(rgb);
const SAND = rgb(0xe6d39a), BED = rgb(0x2c7f96), BED2 = rgb(0x3b9eb0), STRAW = rgb(0xe8c96a), STRAW2 = rgb(0xd9b552);
const CL = [rgb(0x5b9c3f), rgb(0x9a6c43), rgb(0x7d5638), rgb(0x8d8a86), rgb(0x6f6e70)];

const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/** The merged static mesh: terrain plus every prop that never moves. Also the water surface. */
export function buildScenery(L, palette = {}) {
    const { w, h, at } = L, m = newMesh(), water = newMesh(), glints = newMesh();
    const R = 3, cs = 0.5, gw = (w + R * 2) * 2, gh = (h + R * 2) * 2;
    const tint = palette.grass ?? [1, 1, 1];
    const smooth = (x, z, s) => { // low frequency value noise
        const xi = Math.floor(x / s), zi = Math.floor(z / s), fx = x / s - xi, fz = z / s - zi;
        const n = (i, j) => hash(xi + i, zi + j, 5);
        const a = n(0, 0) + (n(1, 0) - n(0, 0)) * fx, b = n(0, 1) + (n(1, 1) - n(0, 1)) * fx;
        return a + (b - a) * fz;
    };
    const tileAt = (x, z) => at(Math.floor(x), Math.floor(z));
    const inMap = (x, z) => x >= 0 && z >= 0 && x < w && z < h;
    const land = (x, z) => { // ragged island outline
        if (inMap(x, z)) return true;
        const dx = Math.max(-x, x - w, 0), dz = Math.max(-z, z - h, 0), d = Math.max(dx, dz);
        return d < 1.1 + smooth(x, z, 2.5) * 2.4;
    };
    const height = new Float32Array(gw * gh).fill(-99);
    const ix = (i, j) => i + j * gw;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const x = (i - R * 2 + 0.5) * cs, z = (j - R * 2 + 0.5) * cs;
        if (!land(x, z)) continue;
        const t = inMap(x, z) ? tileAt(x, z) : ".";
        let y = Math.floor(smooth(x + 40, z + 11, 4.5) * 3) * 0.035 - 0.05;
        if (t === "~" || t === "=") y = -0.7;
        else if (t === ":") y = -0.04;
        else if (t === "e") y = 0;
        else if (t === "p") y = 0.02;
        height[ix(i, j)] = y;
    }
    const nearWater = (x, z) => { for (const [a, b] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5]]) { const q = tileAt(x + a, z + b); if (q === "~" || q === "=") return true; } return false; };
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const y = height[ix(i, j)];
        if (y < -50) continue;
        const x0 = (i - R * 2) * cs, z0 = (j - R * 2) * cs, x1 = x0 + cs, z1 = z0 + cs, xc = x0 + 0.25, zc = z0 + 0.25;
        const t = inMap(xc, zc) ? tileAt(xc, zc) : ".";
        let col;
        const h1 = hash(i, j, 3);
        if (t === "~" || t === "=") col = mix3(BED, BED2, smooth(xc, zc, 1.5));
        else if (t === ":") { col = DIRT[(h1 * 3) | 0]; if (h1 > 0.9) col = mul3(col, 0.9); }
        else if (t === "e") { const stripe = (Math.floor(xc) + Math.floor(zc * 2)) % 2 === 0; col = stripe ? STRAW : STRAW2; }
        else {
            const n = smooth(xc, zc, 3.2), band = n < 0.3 ? 2 : n < 0.55 ? 0 : n < 0.78 ? 1 : 3;
            col = GRASS[band];
            const check = (Math.floor(xc / 2) + Math.floor(zc / 2)) % 2 ? 1.035 : 0.975;
            col = mul3(col, check * (0.97 + h1 * 0.06));
            col = [col[0] * tint[0], col[1] * tint[1], col[2] * tint[2]];
            if (t === "p") col = mix3(col, rgb(0xd8c67a), 0.45 + h1 * 0.15);
            if (inMap(xc, zc) && nearWater(xc, zc)) col = mix3(col, SAND, 0.8);
            else if (inMap(xc, zc) && ":" === tileAt(xc + (h1 - 0.5) * 1.2, zc + (hash(i, j, 9) - 0.5) * 1.2)) col = mix3(col, DIRT[0], 0.65);
        }
        if (L.lanterns.length && L.def.mood === "night") { // lanterns can't light anything at runtime (pogo has one light), so paint their glow on
            let g = 0;
            for (const [lx, lz] of L.lanterns) { const q = Math.hypot(xc - lx, zc - lz); if (q < 5.5) g = Math.max(g, (1 - q / 5.5) ** 2); }
            if (g > 0) col = [col[0] + g * 1.15, col[1] + g * 0.85, col[2] + g * 0.2];
        }
        quad(m, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], col);
        // sides
        const side = (ni, nj, ax, az, bx, bz, nrm) => {
            const ny = height[ix(ni, nj)] ?? -99;
            const ok = ni >= 0 && nj >= 0 && ni < gw && nj < gh;
            const other = ok ? ny : -99;
            if (other >= y - 1e-4) return;
            if (other > -50) {
                const tall = y - other > 0.2, dark = tall ? mul3(t === ":" ? col : rgb(0xb7925e), 0.92) : mul3(col, 0.86);
                quad(m, [ax, other, az], [bx, other, bz], [bx, y, bz], [ax, y, az], nrm, mul3(dark, tall ? 0.6 : 0.9), mul3(dark, tall ? 0.6 : 0.9), dark, dark);
                return;
            }
            // cliff strata down the side of the floating island
            const n = hash(i, j, 21);
            const bands = [0.16, 0.6 + n * 0.5, 1.3 + n * 0.4, 1.6, 3.2];
            let yy = y;
            bands.forEach((b, k) => {
                const y2 = yy - b, c = CL[k], c2 = k === 4 ? mul3(c, 0.45) : mul3(CL[k + 1], 1);
                const v = 0.92 + hash(i + k, j, 2) * 0.16;
                quad(m, [ax, y2, az], [bx, y2, bz], [bx, yy, bz], [ax, yy, az], nrm, mul3(c2, v), mul3(c2, v), mul3(c, v), mul3(c, v));
                yy = y2;
            });
        };
        if (j + 1 >= gh || height[ix(i, j + 1)] < y - 1e-4) side(i, j + 1, x0, z1, x1, z1, [0, 0, 1], [0, 0, 1]);
        if (j - 1 < 0 || height[ix(i, j - 1)] < y - 1e-4) side(i, j - 1, x1, z0, x0, z0, [0, 0, -1]);
        if (i + 1 >= gw || height[ix(i + 1, j)] < y - 1e-4) side(i + 1, j, x1, z1, x1, z0, [1, 0, 0]);
        if (i - 1 < 0 || height[ix(i - 1, j)] < y - 1e-4) side(i - 1, j, x0, z0, x0, z1, [-1, 0, 0]);
    }

    // Water surface: one quad per tile, paler at the banks.
    const wy = -0.2, shallow = rgb(0x8fe3e0), deep = rgb(0x4fc0dd), foam = [0.86, 1, 0.98];
    const wet = (c, r) => at(c, r) === "~" || at(c, r) === "=";
    for (let r = -1; r <= h; r++) for (let c = 0; c < w; c++) {
        if (!wet(c, r)) continue;
        const shade = (cc, rr) => { let n = 0; for (const [a, b] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) if (!wet(cc + a, rr + b)) n++; return n ? shallow : deep; };
        quad(water, [c, wy, r + 1], [c + 1, wy, r + 1], [c + 1, wy, r], [c, wy, r], [0, 1, 0], shade(c, r + 1), shade(c + 1, r + 1), shade(c + 1, r), shade(c, r));
        for (let k = 0; k < 2; k++) {
            if (hash(c, r, k) < 0.5) continue;
            const x = c + hash(c, r, k + 3) * 0.7, z = r + hash(c, r, k + 5) * 0.9, l = 0.15 + hash(c, r, 8) * 0.25;
            quad(glints, [x, wy + 0.01, z + 0.04], [x + l, wy + 0.01, z + 0.04], [x + l, wy + 0.01, z], [x, wy + 0.01, z], [0, 1, 0], foam);
        }
    }

    // Props
    const P = props, turn = (c, r) => (hash(c, r, 1) * 4) | 0;
    const jig = (c, r, k) => (hash(c, r, k) - 0.5) * 0.3;
    const fenceJoin = (c, r) => "#xh".includes(at(c, r));
    const arms = (c, r, join, a, p) => {
        const x = c + 0.5, z = r + 0.5;
        stamp(m, p, x, 0, z);
        if (join(c + 1, r)) stamp(m, a, x, 0, z, 0);
        if (join(c, r - 1)) stamp(m, a, x, 0, z, 1);
        if (join(c - 1, r)) stamp(m, a, x, 0, z, 2);
        if (join(c, r + 1)) stamp(m, a, x, 0, z, 3);
    };
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
        const ch = at(c, r), x = c + 0.5, z = r + 0.5;
        const tree = (name, s = 1) => stamp(m, name, x + jig(c, r, 2), 0, z + jig(c, r, 3), 0, s * (0.9 + hash(c, r, 4) * 0.25));
        const deep = (a, b) => at(a, b) === "^" || at(a, b) === " ";
        if (ch === "T") tree(P.oak); else if (ch === "A") tree(P.apple); else if (ch === "C") tree(P.cherry);
        else if (ch === "^") { if (deep(c + 1, r) && deep(c - 1, r) && deep(c, r + 1) && deep(c, r - 1)) tree(P.pinel, 1.05); else tree(P.pine); }
        else if (ch === "b") stamp(m, [P.bush, P.bushp, P.bushb][(hash(c, r, 6) * 3) | 0], x, 0, z, turn(c, r), 1.4);
        else if (ch === "h") stamp(m, P.hedge, x, 0, z, 0, 1, [0.92 + hash(c, r) * 0.14, 1, 0.92 + hash(c, r) * 0.1]);
        else if (ch === "o") stamp(m, hash(c, r, 7) < 0.5 ? P.hayr : P.hays, x, 0, z, turn(c, r), 1.15);
        else if (ch === "r") stamp(m, hash(c, r, 7) < 0.5 ? P.rock0 : P.rock1, x, 0, z, turn(c, r), 1.5);
        else if (ch === "#") arms(c, r, fenceJoin, P.arm, P.post);
        else if (ch === "p" && L.penRim(c, r)) arms(c, r, L.penRim, P.warm, P.wpost);
        else if (ch === "S") stamp(m, P.scarecrow, x, 0, z);
        else if (ch === "l") stamp(m, P.lantern, x, 0, z);
        else if (ch === "f") for (let i = 0; i < 5; i++) stamp(m, P[`fl${(hash(c, r, i) * 4) | 0}`], c + hash(c, r, i + 10), 0, r + hash(c, r, i + 20), 0, 1.5);
        else if (ch === "g") stamp(m, hash(c, r) < 0.5 ? P.pumpkin : P.cabbage, x, 0, z);
        else if (ch === "=") {
            stamp(m, hash(c, r) < 0.5 ? P.plank0 : P.plank1, x, 0, z);
            if (wet(c - 1, r) && at(c - 1, r) === "~") stamp(m, P.rail, c + 0.03, 0, z, 1);
            if (wet(c + 1, r) && at(c + 1, r) === "~") stamp(m, P.rail, c + 0.97, 0, z, 1);
            if (wet(c, r - 1) && at(c, r - 1) === "~") stamp(m, P.rail, x, 0, r + 0.03);
            if (wet(c, r + 1) && at(c, r + 1) === "~") stamp(m, P.rail, x, 0, r + 0.97);
        }
        else if (ch !== "~" && ch !== "h") { // ground clutter on open tiles
            const n = hash(c, r, 31);
            if (n < 0.2 && ch !== "e" && ch !== ":") stamp(m, P.tuft, c + hash(c, r, 32), 0, r + hash(c, r, 33), 0, 1.3);
            else if (n < 0.215 && ch !== "e" && ch !== ":" && ch !== "p") stamp(m, P.mushroom, c + hash(c, r, 34), 0, r + hash(c, r, 35), 0, 0.9);
            else if (n < 0.34 && ch !== "e" && ch !== ":" && ch !== "p") stamp(m, P[`fl${(hash(c, r, 36) * 4) | 0}`], c + hash(c, r, 37), 0, r + hash(c, r, 38), 0, 1.5);
        }
    }
    for (const b of L.blocks) {
        const x = b.c + b.bw / 2, z = b.r + b.bh / 2;
        if (b.ch === "F") stamp(m, P.farmhouse, x, 0, z);
        else if (b.ch === "B") stamp(m, P.barn, x, 0, z);
        else if (b.ch === "M") stamp(m, P.windmill, x, 0, z);
        else if (b.ch === "W") stamp(m, P.well, x, 0, z);
        else if (b.ch === "c") stamp(m, P.cart, x, 0, z);
    }
    // Pen dressing: the arch, and hay inside.
    const pen = L.pen, ex = L.entry;
    if (ex.length) {
        const midC = ex.reduce((a, e) => a + e[0], 0) / ex.length + 0.5, er = ex[0][1];
        L.pen.mid = [midC, er + 0.5];
        stamp(m, P.gate, midC, 0, er + (er > pen.r1 ? -0.55 : 1.55), 0, 0.72);
        stamp(m, P.hayr, pen.c0 + 1.5, 0.02, pen.r0 + 1.4, 1, 0.85);
        stamp(m, P.hays, pen.c1 - 0.6, 0.02, pen.r0 + 1.2, 0, 0.8);
    }
    // Dry stone wall around the map edge
    const wallAt = (x, z, q) => stamp(m, P[`wall${(hash(x | 0, z | 0, 6) * 3) | 0}`], x, -0.05, z, q);
    for (let c = -1; c <= w; c++) { wallAt(c + 0.5, -0.27, 0); wallAt(c + 0.5, h + 0.27, 0); }
    for (let r = 0; r < h; r++) { wallAt(-0.27, r + 0.5, 1); wallAt(w + 0.27, r + 0.5, 1); }
    // Trees and bushes on the rim, north and sides only so they never block the view of the play area
    for (let c = -2; c < w + 2; c += 1) for (const z of [-1.4]) {
        const n = hash(c, 41);
        if (n < 0.45) stamp(m, n < 0.2 ? P.pine : n < 0.33 ? P.oak : P.bush, c + 0.5, 0, z - hash(c, 42) * 0.6, n < 0.33 ? 0 : (n * 40 | 0), n < 0.33 ? 1 : 1.6);
    }
    for (let r = 0; r < h; r += 1) for (const x of [-1.5, w + 1.5]) {
        const n = hash(r, x | 0, 43);
        if (n < 0.28) stamp(m, n < 0.1 ? P.pine : n < 0.2 ? P.bush : P.oak, x, 0, r + 0.5, n >= 0.1 && n < 0.2 ? (n * 40 | 0) : 0, n >= 0.1 && n < 0.2 ? 1.5 : 0.9);
    }
    return { land: m, water, glints };
}
