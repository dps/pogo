// The sculpting bench. Sculpting takes seconds, so tools/bake-shapes.mjs runs this once and writes shapes.js;
// the game itself only ever loads the result. Change a form here, then rerun that tool.
const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// --- Signed distance helpers ---------------------------------------------------------------------

const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const sphere = (x, y, z, cx, cy, cz, r) => Math.hypot(x - cx, y - cy, z - cz) - r;

/** Capsule whose radius tapers from ra to rb. Accurate enough near the surface, which is where it matters. */
function cone(x, y, z, a, b, ra, rb) {
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2], pax = x - a[0], pay = y - a[1], paz = z - a[2];
    const t = clamp01((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz));
    return Math.hypot(pax - bax * t, pay - bay * t, paz - baz * t) - (ra + (rb - ra) * t);
}

function box(x, y, z, cx, cy, cz, hx, hy, hz, round = 0) {
    const dx = Math.abs(x - cx) - hx + round, dy = Math.abs(y - cy) - hy + round, dz = Math.abs(z - cz) - hz + round;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dy, dz), 0) - round;
}

/** Revolved taper between two rings, for cups and mitres. */
function ring(x, y, z, y0, r0, y1, r1) {
    const q = Math.hypot(x, z);
    const dy = y1 - y0, dr = r1 - r0, t = clamp01(((y - y0) * dy + (q - r0) * dr) / (dy * dy + dr * dr));
    return Math.hypot(q - (r0 + dr * t), y - (y0 + dy * t));
}

const SCULPTS = {
    // Battlements: a hollow drum with six notches.
    r(x, y, z) {
        const q = Math.hypot(x, z);
        const drum = box(q, y, 0, 0.0, 0.985, 0, 0.246, 0.09, 1, 0.012);
        const hollow = box(q, y, 0, 0, 1.09, 0, 0.165, 0.13, 1, 0.012);
        let a = Math.atan2(z, x);
        const seg = Math.PI / 3;
        a = ((a % seg) + seg) % seg - seg / 2;
        const u = Math.sin(a) * q, v = Math.cos(a) * q;
        const notch = box(u, y, v, 0, 1.075, 0.22, 0.042, 0.052, 0.12, 0.006);
        return smax(smax(drum, -hollow, 0.008), -notch, 0.008);
    },
    // The mitre: a teardrop with its diagonal cut, and a ball on top.
    b(x, y, z) {
        const body = cone(x, y, z, [0, 0.9, 0], [0, 1.15, 0], 0.158, 0.038);
        const skirt = ring(x, y, z, 0.815, 0.09, 0.87, 0.135) - 0.016;
        const bead = sphere(x, y, z, 0, 1.235, 0, 0.044);
        // The cut leans across the mitre and stops at the middle.
        const u = x * 0.8 + (y - 1.06) * 0.6, v = -x * 0.6 + (y - 1.06) * 0.8;
        const slit = box(u, v, z, 0.08, 0, 0, 0.11, 0.021, 0.3, 0.004);
        return smin(smin(smax(body, -slit, 0.012), skirt, 0.03), bead, 0.022);
    },
    // Coronet: a flared cup with eight scallops and pearl points around a dome.
    q(x, y, z) {
        const q = Math.hypot(x, z);
        const cup = ring(x, y, z, 0.955, 0.1, 1.2, 0.235) - 0.024;
        const dome = sphere(x, y, z, 0, 1.13, 0, 0.145);
        let a = Math.atan2(z, x);
        const seg = Math.PI / 4;
        const m = ((a % seg) + seg) % seg - seg / 2;
        const u = Math.sin(m) * q, v = Math.cos(m) * q;
        const scallop = sphere(u, y, v, 0, 1.3, 0.27, 0.098);
        const b = ((a + seg / 2) % seg + seg) % seg - seg / 2;
        const pearl = sphere(Math.sin(b) * q, y, Math.cos(b) * q, 0, 1.232, 0.246, 0.03);
        const top = sphere(x, y, z, 0, 1.335, 0, 0.056);
        const stem = cone(x, y, z, [0, 1.25, 0], [0, 1.3, 0], 0.05, 0.024);
        let d = smax(smin(cup, dome, 0.02), -scallop, 0.012);
        d = smin(d, pearl, 0.012);
        d = smin(d, stem, 0.02);
        return smin(d, top, 0.012);
    },
    // Crown and cross pattee.
    k(x, y, z) {
        const cup = ring(x, y, z, 1.01, 0.108, 1.235, 0.222) - 0.026;
        const dome = sphere(x, y, z, 0, 1.17, 0, 0.215);
        const lip = ring(x, y, z, 1.236, 0.222, 1.236, 0.2221) - 0.03;
        const stem = cone(x, y, z, [0, 1.36, 0], [0, 1.42, 0], 0.07, 0.034);
        const flare = (t) => 0.028 + 0.03 * t;
        const uy = y - 1.51;
        const barV = box(x, y, z, 0, 1.51, 0, flare(Math.abs(uy) / 0.125), 0.125, 0.034, 0.01);
        const barH = box(x, y, z, 0, 1.525, 0, 0.118, flare(Math.abs(x) / 0.115), 0.034, 0.01);
        return smin(smin(smin(cup, lip, 0.015), dome, 0.018), smin(stem, Math.min(barV, barH), 0.014), 0.018);
    },
    // The horse. It looks toward -z. An arched neck, a long head, grooved mane, ears, eye, nostril and a parted mouth.
    n(x0, y, z) {
        const x = Math.abs(x0), fx = x * 1.22;
        const chest = cone(fx, y, z, [0, 0.25, 0.03], [0, 0.42, -0.06], 0.215, 0.165);
        const neck1 = cone(fx, y, z, [0, 0.4, -0.05], [0, 0.66, 0.035], 0.165, 0.128);
        const neck2 = cone(fx, y, z, [0, 0.66, 0.035], [0, 0.875, -0.01], 0.128, 0.094);
        const poll = cone(fx, y, z, [0, 0.875, -0.01], [0, 0.965, -0.085], 0.094, 0.082);
        let d = smin(smin(smin(chest, neck1, 0.09), neck2, 0.06), poll, 0.05);
        // Head: cheek down to a tapering nose.
        const hx = x * 1.1;
        const skull = cone(hx, y, z, [0, 0.945, -0.1], [0, 0.82, -0.235], 0.088, 0.07);
        const nose = cone(hx, y, z, [0, 0.82, -0.235], [0, 0.705, -0.345], 0.07, 0.056);
        const cheek = sphere(hx, y, z, 0, 0.845, -0.125, 0.095);
        const muzzle = sphere(hx, y, z, 0, 0.695, -0.345, 0.062);
        const jaw = cone(hx, y, z, [0, 0.815, -0.12], [0, 0.665, -0.29], 0.05, 0.042);
        let head = smin(smin(skull, nose, 0.03), cheek, 0.035);
        head = smin(smin(head, muzzle, 0.02), jaw, 0.022);
        d = smin(d, head, 0.035);
        // Hollow of the throat keeps head and neck apart.
        d = smax(d, -sphere(fx, y, z, 0, 0.665, -0.2, 0.098), 0.05);
        // Mane: a crest down the back of the neck, cut by slanted grooves.
        const crestT = clamp01((y - 0.34) / 0.68);
        const crest = cone(x * 2.4, y, z, [0, 1.0, -0.07], [0, 0.9, 0.085], 0.046, 0.05);
        const crest2 = cone(x * 2.4, y, z, [0, 0.9, 0.085], [0, 0.66, 0.155], 0.05, 0.056);
        const crest3 = cone(x * 2.4, y, z, [0, 0.66, 0.155], [0, 0.36, 0.205], 0.056, 0.05);
        let mane = smin(smin(crest, crest2, 0.02), crest3, 0.02);
        const groove = Math.sin((y + z * 0.75) * 56) * 0.0085 * smooth(0.05, 0.3, crestT);
        mane += groove;
        d = smin(d, mane, 0.022);
        // Fine locks on the side of the neck.
        const lockArea = smooth(0.1, 0.0, Math.abs(z - 0.09 + (y - 0.6) * 0.15) - 0.1) * smooth(0.36, 0.5, y) * smooth(1.0, 0.88, y);
        d += Math.sin((y + z * 0.9) * 62) * 0.0032 * lockArea;
        // Ears, pricked and hollow.
        const ear = cone(x, y, z, [0.046, 1.0, -0.058], [0.058, 1.125, -0.03], 0.034, 0.005);
        const earCut = sphere(x, y, z, 0.082, 1.06, -0.075, 0.034);
        d = smin(d, smax(ear, -earCut, 0.01), 0.018);
        // Forelock between the ears.
        d = smin(d, cone(x, y, z, [0, 1.03, -0.075], [0, 0.965, -0.165], 0.03, 0.012), 0.018);
        // Brow ridge, then the eye as a socket with a polished ball in it.
        d = smin(d, cone(x, y, z, [0.07, 0.925, -0.105], [0.074, 0.885, -0.185], 0.022, 0.018), 0.018);
        const eyeAt = [0.0805, 0.872, -0.158];
        d = smax(d, -sphere(x, y, z, eyeAt[0] + 0.012, eyeAt[1], eyeAt[2], 0.031), 0.008);
        d = smin(d, sphere(x, y, z, eyeAt[0] - 0.004, eyeAt[1], eyeAt[2], 0.0235), 0.004);
        // Nostril and mouth.
        d = smax(d, -sphere(x, y, z, 0.056, 0.725, -0.374, 0.0165), 0.008);
        const mouth = box(x, y + (z + 0.35) * 0.55, z, 0, 0.664, -0.385, 0.2, 0.0085, 0.085, 0.003);
        d = smax(d, -mouth, 0.008);
        // Cheek line.
        d += 0.004 * smooth(0.012, 0, Math.abs(sphere(hx, y, z, 0, 0.845, -0.118, 0.092))) * smooth(0.02, 0.04, x);
        return d;
    },
};
const SCULPT_BOUNDS = {
    r: [[-0.28, 0.87, -0.28], [0.28, 1.1, 0.28], 0.0145],
    b: [[-0.2, 0.8, -0.2], [0.2, 1.3, 0.2], 0.0135],
    q: [[-0.3, 0.94, -0.3], [0.3, 1.41, 0.3], 0.0155],
    k: [[-0.28, 0.98, -0.28], [0.28, 1.64, 0.28], 0.0155],
    n: [[-0.25, 0.2, -0.46], [0.25, 1.16, 0.3], 0.0135],
};

/** Surface nets: one vertex per surface cell, quads across every crossing edge, normals from the field's gradient. */
function sculpt(sdf, [min, max, h]) {
    const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
    const field = new Float32Array(nx * ny * nz), at = (i, j, k) => i + nx * (j + ny * k);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) field[at(i, j, k)] = sdf(min[0] + i * h, min[1] + j * h, min[2] + k * h);
    const index = new Int32Array(nx * ny * nz).fill(-1), positions = [], normals = [], indices = [];
    const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const grad = (x, y, z) => {
        const e = h * 0.6;
        return norm3(sdf(x + e, y, z) - sdf(x - e, y, z), sdf(x, y + e, z) - sdf(x, y - e, z), sdf(x, y, z + e) - sdf(x, y, z - e));
    };
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        let sx = 0, sy = 0, sz = 0, count = 0;
        for (const [a, b] of edges) {
            const ca = corners[a], cb = corners[b], fa = field[at(i + ca[0], j + ca[1], k + ca[2])], fb = field[at(i + cb[0], j + cb[1], k + cb[2])];
            if ((fa < 0) === (fb < 0)) continue;
            const t = fa / (fa - fb);
            sx += ca[0] + (cb[0] - ca[0]) * t; sy += ca[1] + (cb[1] - ca[1]) * t; sz += ca[2] + (cb[2] - ca[2]) * t;
            count++;
        }
        if (!count) continue;
        let x = min[0] + (i + sx / count) * h, y = min[1] + (j + sy / count) * h, z = min[2] + (k + sz / count) * h;
        // Pull the vertex onto the true surface, which keeps creases crisp and curves round.
        for (let it = 0; it < 2; it++) {
            const d = sdf(x, y, z), n = grad(x, y, z);
            x -= n[0] * d; y -= n[1] * d; z -= n[2] * d;
        }
        const n = grad(x, y, z);
        index[at(i, j, k)] = positions.length / 3;
        positions.push(x, y, z);
        normals.push(n[0], n[1], n[2]);
    }
    const quad = (a, b, c, d, flip) => {
        if (a < 0 || b < 0 || c < 0 || d < 0) return;
        if (flip) indices.push(a, c, b, a, d, c); else indices.push(a, b, c, a, c, d);
    };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
        const f = field[at(i, j, k)] < 0;
        if (f !== (field[at(i + 1, j, k)] < 0)) quad(index[at(i, j - 1, k - 1)], index[at(i, j, k - 1)], index[at(i, j, k)], index[at(i, j - 1, k)], !f);
        if (f !== (field[at(i, j + 1, k)] < 0)) quad(index[at(i - 1, j, k - 1)], index[at(i - 1, j, k)], index[at(i, j, k)], index[at(i, j, k - 1)], !f);
        if (f !== (field[at(i, j, k + 1)] < 0)) quad(index[at(i - 1, j - 1, k)], index[at(i, j - 1, k)], index[at(i, j, k)], index[at(i - 1, j, k)], !f);
    }
    // Face every triangle the way the field's gradient points.
    for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
        const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
        const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
        const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (nx * normals[a] + ny * normals[a + 1] + nz * normals[a + 2] < 0) { const t = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = t; }
    }
    // Occlusion from the field itself: how much open air there is along each normal.
    const ao = new Float32Array(positions.length / 3);
    for (let i = 0; i < ao.length; i++) {
        const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2], nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
        let sum = 0, total = 0;
        for (const [s, w] of [[0.02, 1], [0.05, 0.8], [0.1, 0.5]]) { sum += w * clamp01(sdf(x + nx * s, y + ny * s, z + nz * s) / s); total += w; }
        ao[i] = 0.34 + 0.66 * sum / total;
    }
    return { positions, normals, indices, ao };
}


export const sculptAll = () => Object.fromEntries(Object.keys(SCULPTS).map((t) => [t, sculpt(SCULPTS[t], SCULPT_BOUNDS[t])]));
