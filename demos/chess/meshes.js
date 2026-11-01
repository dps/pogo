// Every model in the room, built at startup. Bodies are turned with assets.lathe; the parts a lathe can't make (the
// knight, the bishop's cut, the rook's battlements, the crowns) are sculpted in tools/sculpt.js and loaded from shapes.js.
// Each piece then gets a baked studio reflection in its vertex colors, and a flipped, unlit copy for the board's mirror.

import { SHAPES } from "./shapes.js";

const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// --- Profiles ------------------------------------------------------------------------------------

/** Catmull-Rom through [r, y] points. A third element of 1 marks a hard corner. */
function curve(points, steps = 4) {
    const out = [];
    const runs = [];
    let run = [points[0]];
    for (let i = 1; i < points.length; i++) {
        run.push(points[i]);
        if (points[i][2]) { runs.push(run); run = [points[i]]; }
    }
    if (run.length > 1) runs.push(run);
    for (const r of runs) {
        for (let i = 0; i < r.length - 1; i++) {
            const a = r[Math.max(0, i - 1)], b = r[i], c = r[i + 1], d = r[Math.min(r.length - 1, i + 2)];
            for (let s = 0; s < steps; s++) {
                const t = s / steps, t2 = t * t, t3 = t2 * t;
                const f = (k) => 0.5 * (2 * b[k] + (c[k] - a[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (3 * b[k] - a[k] - 3 * c[k] + d[k]) * t3);
                out.push([Math.max(0, f(0)), f(1)]);
            }
        }
        const last = r[r.length - 1];
        out.push([last[0], last[1]]);
        out.push([last[0], last[1]]); // repeated: a hard edge
    }
    return out;
}

const arc = (cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => {
    const t = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
    return [Math.max(0, Math.cos(t) * r), cy + Math.sin(t) * r];
});

/** The turned foot every piece shares: a felted base, a bead and a cove. */
const foot = (r) => [
    [0, 0], [r, 0, 1], [r + 0.006, 0.03], [r, 0.058], [r * 0.93, 0.075, 1],
    [r * 0.93, 0.082], [r * 0.975, 0.108], [r * 0.93, 0.136, 1],
];

const PROFILES = {
    p: [...foot(0.315), [0.255, 0.16], [0.185, 0.205], [0.138, 0.28], [0.112, 0.38], [0.1, 0.46], [0.104, 0.5, 1],
        [0.15, 0.512], [0.17, 0.53], [0.15, 0.548, 1], [0.112, 0.562], [0.11, 0.58, 1], ...arc(0.692, 0.152, -68, 90, 12)],
    r: [...foot(0.35), [0.29, 0.165], [0.225, 0.215], [0.19, 0.3], [0.172, 0.45], [0.168, 0.6], [0.178, 0.7], [0.2, 0.745, 1],
        [0.232, 0.758], [0.24, 0.778], [0.21, 0.8, 1], [0.205, 0.83], [0.23, 0.87], [0.236, 0.91, 1], [0, 0.91]],
    n: [...foot(0.345), [0.29, 0.16], [0.255, 0.2], [0.262, 0.226], [0.25, 0.25], [0.2, 0.27, 1], [0, 0.27]],
    b: [...foot(0.335), [0.27, 0.165], [0.205, 0.215], [0.15, 0.3], [0.122, 0.42], [0.108, 0.54], [0.106, 0.64], [0.114, 0.688, 1],
        [0.178, 0.7], [0.202, 0.72], [0.178, 0.742, 1], [0.128, 0.752], [0.15, 0.772], [0.128, 0.79, 1], [0.1, 0.8], [0.1, 0.83, 1], [0, 0.83]],
    q: [...foot(0.365), [0.3, 0.17], [0.225, 0.225], [0.165, 0.33], [0.13, 0.47], [0.112, 0.61], [0.106, 0.74], [0.116, 0.81, 1],
        [0.196, 0.824], [0.226, 0.846], [0.196, 0.87, 1], [0.135, 0.88], [0.165, 0.902], [0.135, 0.922, 1], [0.112, 0.935], [0.118, 0.97, 1], [0, 0.97]],
    k: [...foot(0.38), [0.31, 0.175], [0.235, 0.232], [0.175, 0.34], [0.138, 0.49], [0.118, 0.64], [0.11, 0.78], [0.12, 0.86, 1],
        [0.205, 0.874], [0.238, 0.898], [0.205, 0.924, 1], [0.14, 0.934], [0.172, 0.957], [0.14, 0.978, 1], [0.116, 0.99], [0.122, 1.03, 1], [0, 1.03]],
};

const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Sculpted parts arrive as packed arrays. See tools/bake-shapes.mjs. */
function decodeShape(z) {
    if (!z) return null;
    const pos = new Int16Array(bytes(z.pos).buffer), nor = new Int16Array(bytes(z.nor).buffer), positions = new Array(pos.length), normals = new Array(nor.length);
    for (let i = 0; i < pos.length; i++) { positions[i] = pos[i] / 16384; normals[i] = nor[i] / 32767; }
    return { positions, normals, indices: Array.from(new Uint16Array(bytes(z.idx).buffer)), ao: Array.from(bytes(z.ao), (v) => v / 255) };
}

// --- Baking --------------------------------------------------------------------------------------

/** A height table of the piece's widest radius, used to judge how shut-in each vertex is. */
function ambientOcclusion(g) {
    const bins = 96, top = 1.8, table = new Float32Array(bins);
    const bin = (y) => Math.max(0, Math.min(bins - 1, y / top * bins | 0));
    for (let i = 0; i < g.positions.length; i += 3) {
        const r = Math.hypot(g.positions[i], g.positions[i + 2]), b = bin(g.positions[i + 1]);
        if (r > table[b]) table[b] = r;
    }
    const out = new Float32Array(g.positions.length / 3);
    for (let i = 0; i < out.length; i++) {
        const x = g.positions[i * 3], y = g.positions[i * 3 + 1], z = g.positions[i * 3 + 2], nx = g.normals[i * 3], ny = g.normals[i * 3 + 1], nz = g.normals[i * 3 + 2];
        let blocked = 0, total = 0;
        for (const [s, w] of [[0.03, 1], [0.07, 0.8], [0.13, 0.6], [0.2, 0.4]]) {
            const qx = x + nx * s, qy = y + ny * s, qz = z + nz * s, r = Math.hypot(qx, qz);
            total += w;
            if (r < table[bin(qy)] - 0.004) blocked += w;
        }
        // The floor also shuts in whatever is near it and facing down.
        const floor = smooth(0.14, 0, y) * (0.45 + 0.4 * Math.max(0, -ny));
        out[i] = (1 - 0.72 * blocked / total) * (1 - floor);
    }
    return out;
}

const V = norm3(0, 0.8, 0.6);
const KEY = norm3(-0.46, 0.78, -0.42), WINDOW = norm3(0.82, 0.42, 0.3), FIRE = norm3(0.6, 0.02, 0.8);

/** What a polished surface mirrors here, for a viewer in the usual seat. */
function studio(nx, ny, nz) {
    const dot = nx * V[0] + ny * V[1] + nz * V[2];
    const rx = 2 * dot * nx - V[0], ry = 2 * dot * ny - V[1], rz = 2 * dot * nz - V[2];
    const fres = Math.pow(1 - Math.max(0, dot), 4);
    const lobe = (L, p) => Math.pow(Math.max(0, rx * L[0] + ry * L[1] + rz * L[2]), p);
    const key = lobe(KEY, 22), soft = lobe(KEY, 4), win = smooth(0.82, 0.93, rx * WINDOW[0] + ry * WINDOW[1] + rz * WINDOW[2]), fire = lobe(FIRE, 7);
    const floor = smooth(0.1, -0.5, ry);
    return [
        key * 1.5 + soft * 0.3 + win * 0.42 + fire * 0.34 + floor * 0.09,
        key * 1.26 + soft * 0.24 + win * 0.48 + fire * 0.16 + floor * 0.06,
        key * 0.96 + soft * 0.18 + win * 0.56 + fire * 0.06 + floor * 0.04,
        fres,
    ];
}

function baked(g, ao, mat, mirror) {
    const n = g.positions.length / 3, colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const nx = g.normals[i * 3], ny = g.normals[i * 3 + 1], nz = g.normals[i * 3 + 2], y = g.positions[i * 3 + 1], a = ao[i];
        const [sr, sg, sb, fres] = studio(nx, ny, nz);
        // A little warmth pooled low in the turnings.
        const tone = mat.base.map((c, k) => c * (1 + (mat.deep[k] - 1) * (1 - a)));
        const spec = mat.gloss * (0.55 + 0.45 * a) * (1 + fres * 2.2);
        let r = tone[0] * a + sr * spec, gr = tone[1] * a + sg * spec, b = tone[2] * a + sb * spec;
        if (mirror) {
            // The copy is unlit, so light it here, and let it die away with depth like a satin polish does.
            const diff = Math.max(0, nx * 0.36 + ny * 0.8 + nz * -0.42), lit = 0.42 + 0.9 * diff, fade = 0.2 + 0.8 * Math.exp(-y * 2.1);
            r *= lit * fade; gr *= lit * fade; b *= lit * fade;
        }
        colors[i * 3] = r; colors[i * 3 + 1] = gr; colors[i * 3 + 2] = b;
    }
    return colors;
}

// --- Assembling ----------------------------------------------------------------------------------

function lathed(assets, name, profile, segments = 32) {
    assets.lathe(`_t_${name}`, profile, { segments });
    const g = assets.geometry(`_t_${name}`), ys = profile.map((p) => p[1]), mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    const positions = [], normals = [], stride = 11;
    for (let i = 0; i < g.vertices.length; i += stride) {
        positions.push(g.vertices[i], g.vertices[i + 1] + mid, g.vertices[i + 2]);
        normals.push(g.vertices[i + 3], g.vertices[i + 4], g.vertices[i + 5]);
    }
    return { positions, normals, indices: [...g.indices] };
}

function merge(parts) {
    const out = { positions: [], normals: [], indices: [] };
    for (const p of parts) {
        const base = out.positions.length / 3;
        for (const v of p.positions) out.positions.push(v);
        for (const v of p.normals) out.normals.push(v);
        for (const i of p.indices) out.indices.push(i + base);
    }
    return out;
}

const uvs = (g) => {
    const n = g.positions.length / 3, uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv[i * 2] = g.positions[i * 3] + 0.5; uv[i * 2 + 1] = g.positions[i * 3 + 1] * 0.6; }
    return uv;
};

/** Piece materials: base albedo, the tint it deepens to in crevices, and polish. */
export const SETS = {
    classic: { name: "Boxwood & Ebony", w: { base: [1.0, 0.87, 0.62], deep: [0.62, 0.45, 0.26], gloss: 0.42, shine: 0.7 }, b: { base: [0.062, 0.036, 0.03], deep: [0.7, 0.55, 0.5], gloss: 0.62, shine: 0.85 } },
    garnet: { name: "Bone & Oxblood", w: { base: [0.88, 0.8, 0.66], deep: [0.62, 0.5, 0.36], gloss: 0.34, shine: 0.65 }, b: { base: [0.26, 0.04, 0.04], deep: [0.6, 0.4, 0.4], gloss: 0.46, shine: 0.75 } },
    brass: { name: "Brass & Gunmetal", w: { base: [0.72, 0.5, 0.2], deep: [0.6, 0.48, 0.3], gloss: 0.72, shine: 0.85 }, b: { base: [0.13, 0.14, 0.16], deep: [0.6, 0.6, 0.65], gloss: 0.66, shine: 0.85 } },
};

const shapes = {};

/** Sculpt each shape once. Materials are baked separately because they change with the set. */
function buildShapes(assets) {
    for (const t of "pnbrqk") {
        const turned = lathed(assets, t, curve(PROFILES[t], 3)), parts = [turned];
        let ao = ambientOcclusion(turned);
        const carved = decodeShape(SHAPES[t]);
        if (carved) {
            parts.push(carved);
            ao = Float32Array.from([...ao, ...carved.ao]);
        }
        shapes[t] = { g: merge(parts), ao };
    }
}

/** Register pw pb nw ... and their mirrored m_ copies for one set. Calling it again re-bakes under the same names. */
export function bakeSet(assets, set = "classic") {
    const mats = SETS[set] ?? SETS.classic;
    for (const t of "pnbrqk") {
        const { g, ao } = shapes[t], uv = uvs(g);
        for (const side of ["w", "b"]) {
            const mat = mats[side];
            assets.mesh(`${t}${side}`, { positions: g.positions, normals: g.normals, indices: g.indices, uvs: uv, colors: baked(g, ao, mat, false) });
            const flipped = new Float32Array(g.positions), nor = new Float32Array(g.normals), tri = new Uint32Array(g.indices);
            for (let i = 1; i < flipped.length; i += 3) { flipped[i] = -flipped[i]; nor[i] = -nor[i]; }
            for (let i = 0; i < tri.length; i += 3) { const a = tri[i + 1]; tri[i + 1] = tri[i + 2]; tri[i + 2] = a; }
            assets.mesh(`m_${t}${side}`, { positions: flipped, normals: nor, indices: tri, uvs: uv, colors: baked(g, ao, mat, true) });
        }
    }
}

/** A sheet of rows x cols points, smooth inside, wrapped around in cols when closed. Normals from neighbours. */
function sheet(rows, closed, colorFn, uvFn) {
    const R = rows.length, C = rows[0].length, positions = [], normals = [], colors = [], uv = [], indices = [];
    const p = (r, c) => rows[r][closed ? (c + C) % C : Math.max(0, Math.min(C - 1, c))];
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const a = p(Math.min(R - 1, r + 1), c), b = p(Math.max(0, r - 1), c), d = p(r, c + 1), e = p(r, c - 1);
        const u = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], v = [d[0] - e[0], d[1] - e[1], d[2] - e[2]];
        const n = norm3(v[1] * u[2] - v[2] * u[1], v[2] * u[0] - v[0] * u[2], v[0] * u[1] - v[1] * u[0]);
        const q = rows[r][c];
        positions.push(...q);
        normals.push(...n);
        colors.push(...colorFn(q, n));
        uv.push(...uvFn(q));
    }
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < (closed ? C : C - 1); c++) {
        const c2 = (c + 1) % C, a = r * C + c, b = r * C + c2, d = (r + 1) * C + c, e = (r + 1) * C + c2;
        indices.push(a, e, d, a, b, e);
    }
    return { positions, normals, colors, uv, indices };
}

function joinSheets(list) {
    const out = { positions: [], normals: [], colors: [], uvs: [], indices: [] };
    for (const s of list) {
        const base = out.positions.length / 3;
        out.positions.push(...s.positions); out.normals.push(...s.normals); out.colors.push(...s.colors); out.uvs.push(...s.uv);
        for (const i of s.indices) out.indices.push(i + base);
    }
    return out;
}

/** Evenly along each side of a square, so the inner corners are real vertices. Unit rays by angle. */
function squareRays(perSide) {
    const rays = [];
    for (let s = 0; s < 4; s++) for (let i = 0; i < perSide; i++) {
        const t = -1 + 2 * i / perSide;
        const [x, z] = [[1, t], [-t, 1], [-1, -t], [t, -1]][s];
        rays.push([x, z]);
    }
    return rays;
}

/** Where a ray through (x,z) meets a rounded rectangle of half-sizes hx,hz. */
function rrPoint(x, z, hx, hz, r) {
    const a = Math.atan2(z, x), cx = Math.cos(a), cz = Math.sin(a);
    let lo = 0, hi = hx + hz;
    for (let i = 0; i < 26; i++) {
        const t = (lo + hi) / 2, px = Math.abs(cx * t) - hx + r, pz = Math.abs(cz * t) - hz + r;
        const d = Math.hypot(Math.max(px, 0), Math.max(pz, 0)) + Math.min(Math.max(px, pz), 0) - r;
        if (d > 0) hi = t; else lo = t;
    }
    return [cx * lo, cz * lo];
}

function buildBoard(assets) {
    const H = BOARD.half, rays = squareRays(26), span = BOARD.outer * 2;
    const uvFn = (p) => [p[0] / span + 0.5, p[2] / span + 0.5];
    const shade = (a) => (p) => [a, a, a];
    const loop = (hx, y, r) => rays.map(([x, z]) => {
        if (r === null) return [x * hx, y, z * hx];
        const [px, pz] = rrPoint(x, z, hx, hx, r);
        return [px, y, pz];
    });
    const O = BOARD.outer, T = BOARD.table;
    const bands = [
        [loop(H, 0, null), loop(O - 0.1, 0, 0.14)],                         // top of the frame
        [loop(O - 0.1, 0, 0.14), loop(O - 0.045, -0.02, 0.16), loop(O - 0.012, -0.06, 0.18), loop(O, -0.12, 0.19)], // rounded shoulder
        [loop(O, -0.12, 0.19), loop(O, T + 0.05, 0.19)],                     // side
        [loop(O, T + 0.05, 0.19), loop(O + 0.05, T + 0.015, 0.2), loop(O + 0.07, T, 0.21)], // plinth
    ];
    const frame = joinSheets(bands.map((rows, i) => sheet(rows, true, shade(i === 0 ? 1 : i === 2 ? 0.72 : 0.92), uvFn)));
    assets.mesh("frame", frame);
    // The playing surface. Its origin sits far below the room, so that transparency sorting always draws it first.
    const y = BOARD.sink, bright = 1.2;
    assets.mesh("boardTop", {
        positions: [-H, y, H, H, y, H, H, y, -H, -H, y, -H],
        normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [H / span * -1 + 0.5, H / span + 0.5, H / span + 0.5, H / span + 0.5, H / span + 0.5, 0.5 - H / span, 0.5 - H / span, 0.5 - H / span],
        colors: new Array(12).fill(bright),
        indices: [0, 1, 2, 0, 2, 3],
    });
}

function buildTable(assets) {
    const R = 13.5, T = BOARD.table, rings = [0, 0.015, 0.05, 0.1, 0.2, 0.4, 0.7, 1], rays = squareRays(14), I = BOARD.half + 0.04;
    const pool = (p) => {
        const near = Math.hypot(p[0] + 1.2, p[2] + 0.8);
        const light = 0.2 + 1.02 * Math.exp(-near * near / 90);
        const edge = Math.max(Math.abs(p[0]), Math.abs(p[2])) - BOARD.outer;
        const contact = 0.55 + 0.45 * smooth(-0.05, 0.75, edge);
        const v = light * contact;
        return [v, v * 0.97, v * 0.93];
    };
    const span = 34, uvFn = (p) => [p[0] / span + 0.5, p[2] / span + 0.5];
    const rows = rings.map((t) => rays.map(([x, z]) => {
        const a = Math.atan2(z, x), inner = [x * I, z * I], outer = [Math.cos(a) * R, Math.sin(a) * R];
        return [inner[0] + (outer[0] - inner[0]) * t, T, inner[1] + (outer[1] - inner[1]) * t];
    }));
    const flat = sheet(rows, true, pool, uvFn);
    flat.normals = flat.normals.map((_, i) => (i % 3 === 1 ? 1 : 0));
    const lip = rays.map(([x, z]) => { const a = Math.atan2(z, x); return [Math.cos(a), Math.sin(a)]; });
    const rim = sheet([
        lip.map(([c, s]) => [c * R, T, s * R]), lip.map(([c, s]) => [c * (R + 0.14), T - 0.05, s * (R + 0.14)]), lip.map(([c, s]) => [c * (R + 0.2), T - 0.2, s * (R + 0.2)]),
        lip.map(([c, s]) => [c * (R + 0.14), T - 0.42, s * (R + 0.14)]), lip.map(([c, s]) => [c * (R - 1), T - 0.7, s * (R - 1)]),
    ], true, () => [0.3, 0.27, 0.24], uvFn);
    assets.mesh("table", joinSheets([flat, rim]));

    // The mirror's depths: seen through the board, this reads as the room reflected in the polish.
    const w = 30, y = -7;
    assets.mesh("reflection", {
        positions: [-w, y, w, w, y, w, w, y, -w, -w, y, -w], normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 1, 1, 1, 1, 0, 0, 0], colors: new Array(12).fill(1), indices: [0, 1, 2, 0, 2, 3],
    });
}

/** The room: a drum around the table, painted on the inside. */
function buildRoom(assets) {
    const n = 48, r = 34, top = 26, bottom = -14, positions = [], normals = [], uv = [], indices = [];
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
        positions.push(c * r, j ? top : bottom, s * r);
        normals.push(-c, 0, -s);
        uv.push(i / n, j ? 0 : 1);
    }
    for (let i = 0; i < n; i++) { const a = i, b = i + 1, d = i + n + 1, e = i + n + 2; indices.push(a, d, e, a, e, b); }
    assets.mesh("room", { positions, normals, uvs: uv, colors: new Array(positions.length).fill(1), indices });
    // The floor under the table.
    assets.mesh("floor", {
        positions: [-40, bottom, 40, 40, bottom, 40, 40, bottom, -40, -40, bottom, -40], normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        uvs: [0, 1, 1, 1, 1, 0, 0, 0], colors: [0.11, 0.07, 0.05, 0.11, 0.07, 0.05, 0.11, 0.07, 0.05, 0.11, 0.07, 0.05], indices: [0, 1, 2, 0, 2, 3],
    });
}

function buildTray(assets) {
    const hx = TRAY.hx, hz = TRAY.hz, T = BOARD.table, n = 96, r = 0.2;
    const rays = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; });
    const loop = (ox, oz, y, rad) => rays.map(([x, z]) => { const [px, pz] = rrPoint(x, z, ox, oz, rad); return [px, y, pz]; });
    const wood = [0.42, 0.24, 0.14], lit = (m) => () => [wood[0] * m, wood[1] * m, wood[2] * m];
    const uvFn = (p) => [0.5 + p[0] * 0.02, 0.5 + p[2] * 0.02];
    const lipY = T + TRAY.lip, floorY = T + 0.04;
    const m = 0.13; // rail width
    const rail = joinSheets([
        sheet([loop(hx - m, hz - m, floorY, r - 0.06), loop(hx - m, hz - m, lipY - 0.03, r - 0.06), loop(hx - m + 0.03, hz - m + 0.03, lipY, r - 0.05), loop(hx - 0.03, hz - 0.03, lipY, r - 0.02), loop(hx, hz, lipY - 0.03, r), loop(hx, hz, T, r)], true, lit(1), uvFn),
    ]);
    assets.mesh("trayRail", rail);
    const fx = hx - m + 0.01, fz = hz - m + 0.01;
    const felt = sheet([[[-fx, floorY, fz], [fx, floorY, fz]], [[-fx, floorY, -fz], [fx, floorY, -fz]]], false, () => [1, 1, 1], (p) => [p[0] / (2 * fx) + 0.5, p[2] / (2 * fz) + 0.5]);
    felt.normals = felt.normals.map((_, i) => (i % 3 === 1 ? 1 : 0));
    assets.mesh("trayFelt", { ...felt, uvs: felt.uv });
}

function buildProps(assets) {
    // Oil lamp: brass foot, stem and font, then a glass chimney.
    const brass = (name, pts, seg = 28) => {
        const g = lathed(assets, name, curve(pts, 3), seg);
        const ao = new Float32Array(g.positions.length / 3).fill(1);
        const colors = baked(g, ao, { base: [0.54, 0.33, 0.1], deep: [1, 1, 1], gloss: 0.8 }, false);
        assets.mesh(name, { ...g, colors });
    };
    brass("lampBase", [[0, 0], [0.72, 0, 1], [0.74, 0.05], [0.66, 0.1, 1], [0.34, 0.2], [0.17, 0.34], [0.13, 0.72], [0.2, 0.82, 1], [0.22, 0.88, 1],
        [0.56, 1.12], [0.68, 1.42], [0.56, 1.72], [0.3, 1.9, 1], [0.27, 1.98, 1], [0.34, 2.02], [0.34, 2.1, 1], [0, 2.1]]);
    const glass = [[0.24, 2.08], [0.26, 2.2], [0.44, 2.62], [0.46, 2.88], [0.3, 3.3], [0.25, 3.62], [0.25, 4.02]];
    const gg = lathed(assets, "lampGlass", curve(glass, 3), 24);
    assets.mesh("lampGlass", { ...gg, colors: new Array(gg.positions.length).fill(1) });
    // Tea: cup and saucer, off to one side.
    brass("saucer", [[0, 0], [0.34, 0, 1], [0.42, 0.03], [0.74, 0.11], [0.78, 0.14, 1], [0.74, 0.14, 1], [0.42, 0.07], [0, 0.06]], 32);
    const cup = lathed(assets, "cup", curve([[0, 0.06], [0.24, 0.06, 1], [0.27, 0.1], [0.44, 0.3], [0.5, 0.6], [0.5, 0.66, 1], [0.46, 0.66, 1], [0.45, 0.58], [0, 0.56]], 3), 32);
    assets.mesh("cup", { ...cup, colors: baked(cup, new Float32Array(cup.positions.length / 3).fill(1), { base: [0.86, 0.8, 0.7], deep: [1, 1, 1], gloss: 0.5 }, false) });
}

export const BOARD = { half: 4, outer: 4.62, table: -0.42, sink: 60 };
export const TRAY = { hx: 4.45, hz: 0.92, lip: 0.17 };

export function buildModels(game) {
    const a = game.assets;
    buildShapes(a);
    bakeSet(a, "classic");
    buildBoard(a);
    buildTable(a);
    buildRoom(a);
    buildTray(a);
    buildProps(a);
}
