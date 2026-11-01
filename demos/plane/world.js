// Port Lull, as numbers: the height of the land, every solid thing, and the moving air. No rendering here, so bots
// and the reachability tool read exactly the world that the player flies in.
export const STEP = 3;                  // one sheet of contour card
export const BOUNDS = { x0: -300, x1: 300, z0: -270, z1: 235, top: 120 };
export const sm = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const gauss = (d, r) => Math.exp(-(d * d) / (r * r));
const gauss2 = (x, z, cx, cz, r) => gauss(Math.hypot(x - cx, z - cz), r);
const wob = (x, z) => Math.sin(x * 0.041 + z * 0.023) * Math.cos(z * 0.037 - x * 0.019) + 0.5 * Math.sin(x * 0.11 + 1.3) * Math.sin(z * 0.097 + 0.4);

/** Secret cut through the east headland: a slot of sea between walls of card. */
export const CUT_PATH = [[132, 118], [168, 124], [196, 150], [214, 190]];
const segDist = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
};
export function shoreZ(x) {
    return 64 + 118 * gauss(x - 208, 58) + 74 * gauss(x + 232, 54) + 6 * Math.sin(x * 0.03);
}
const plateau = (z) => (z > 15 ? 3.5 : z > -29 ? 9.5 : z > -73 ? 15.5 : 21.5);

/** The smooth land, before it is cut into contour sheets. */
export function rawH(x, z) {
    const s = shoreZ(x) - z;
    let h = s < 0 ? s * 0.5 : 1.4 + Math.min(s, 60) * 0.1 + Math.max(0, s - 60) * 0.07;
    h += wob(x, z) * 1.6 * sm(0, 30, s);
    h += 30 * gauss2(x, z, -182, -14, 58) + 20 * gauss2(x, z, 206, 128, 34) + 6 * gauss2(x, z, 208, 60, 48);
    h += 16 * gauss2(x, z, 40, -196, 90) + 10 * gauss2(x, z, 190, -130, 60) + 8 * gauss2(x, z, -240, -190, 60);
    h -= 13 * gauss(segDist(x, z, [-96, -260], [-70, -116]), 20);       // the valley under the viaduct
    const tw = sm(-146, -116, x) * (1 - sm(140, 170, x)) * sm(-132, -114, z);
    if (tw > 0) {
        const beach = (1 - sm(-74, -42, x)) * sm(44, 56, z);             // west of the quay the town runs out onto sand
        h = h + (plateau(z) - h) * tw * (1 - beach) * (1 - sm(58, 67, z));
    }
    const cut = Math.min(segDist(x, z, CUT_PATH[0], CUT_PATH[1]), segDist(x, z, CUT_PATH[1], CUT_PATH[2]), segDist(x, z, CUT_PATH[2], CUT_PATH[3]));
    if (cut < 20 && x > 120) h = Math.min(h, -2 + (h + 2) * sm(11, 18, cut));
    // Beyond the map the land rises into a far ridge so the world has a soft back wall.
    h += 26 * sm(BOUNDS.z0 + 10, BOUNDS.z0 - 70, z);
    return h;
}
const CS = 3, GX0 = -384, GZ0 = -360, GW = 256, GH = 212;
let grid = null;
function buildGrid() {
    grid = new Float32Array((GW + 1) * (GH + 1));
    for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) grid[j * (GW + 1) + i] = rawH(GX0 + i * CS, GZ0 + j * CS);
}
export function H(x, z) {
    if (!grid) buildGrid();
    const fx = Math.max(0, Math.min(GW - 1e-3, (x - GX0) / CS)), fz = Math.max(0, Math.min(GH - 1e-3, (z - GZ0) / CS)), i = fx | 0, j = fz | 0, a = fx - i, b = fz - j, o = j * (GW + 1) + i;
    const t = grid[o] + (grid[o + 1] - grid[o]) * a, u = grid[o + GW + 1] + (grid[o + GW + 2] - grid[o + GW + 1]) * a;
    return t + (u - t) * b;
}
export const gridInfo = () => { if (!grid) buildGrid(); return { x0: GX0, z0: GZ0, w: GW, h: GH, cs: CS, data: grid }; };
/** The top of the card at a point: smooth land cut into sheets. Sand sits a little proud of the sea. */
export function ground(x, z) {
    const h = H(x, z);
    return h < 0 ? -2 : h < STEP ? 1 : Math.floor(h / STEP) * STEP;
}

// --- Solids ----------------------------------------------------------------------------------------------------
export const solids = [];
const sgrid = new Map(), SC = 24;
const skey = (i, j) => (i + 512) * 2048 + j + 512;
export function solid(x0, y0, z0, x1, y1, z1, tag) {
    const b = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), z1: Math.max(z0, z1), tag };
    solids.push(b);
    for (let j = Math.floor(b.z0 / SC); j <= Math.floor(b.z1 / SC); j++) for (let i = Math.floor(b.x0 / SC); i <= Math.floor(b.x1 / SC); i++) {
        const k = skey(i, j); let l = sgrid.get(k); if (!l) sgrid.set(k, l = []); l.push(b);
    }
    return b;
}
const pad = (x, z, r, fn) => { for (let j = Math.floor((z - r) / SC); j <= Math.floor((z + r) / SC); j++) for (let i = Math.floor((x - r) / SC); i <= Math.floor((x + r) / SC); i++) { const l = sgrid.get(skey(i, j)); if (l) for (const b of l) fn(b); } };
/** Deepest overlap of a sphere with any solid: { nx, ny, nz, depth, tag } or null. */
export function touch(x, y, z, r) {
    let best = null;
    pad(x, z, r, (b) => {
        const cx = Math.max(b.x0, Math.min(x, b.x1)), cy = Math.max(b.y0, Math.min(y, b.y1)), cz = Math.max(b.z0, Math.min(z, b.z1));
        let dx = x - cx, dy = y - cy, dz = z - cz, d = Math.hypot(dx, dy, dz);
        if (d >= r) return;
        if (d < 1e-5) { // centre inside: leave by the nearest face
            const f = [[x - b.x0, -1, 0, 0], [b.x1 - x, 1, 0, 0], [y - b.y0, 0, -1, 0], [b.y1 - y, 0, 1, 0], [z - b.z0, 0, 0, -1], [b.z1 - z, 0, 0, 1]].sort((p, q) => p[0] - q[0])[0];
            dx = f[1]; dy = f[2]; dz = f[3]; d = 1; const depth = r + f[0];
            if (!best || depth > best.depth) best = { nx: dx, ny: dy, nz: dz, depth, tag: b.tag };
            return;
        }
        const depth = r - d;
        if (!best || depth > best.depth) best = { nx: dx / d, ny: dy / d, nz: dz / d, depth, tag: b.tag };
    });
    return best;
}
/** How much clear air around a point; the bot and the safe-breadcrumb check use this. */
export const clear = (x, y, z, r) => y - ground(x, z) > r && !touch(x, y, z, r);

// --- Town plan -------------------------------------------------------------------------------------------------
export const WALLS = ["#f6e7c8", "#f3c9b0", "#efc15f", "#b9cfa2", "#a9cbd3", "#e99a7f", "#f1dfa6", "#cdb9d4", "#fbf1dc"];
export const ROOFS = ["#d9593f", "#c8452f", "#3f7c86", "#54657f", "#7a4b6e", "#e0834a"];
export const buildings = [];
export const homes = {};
export const FLOOR = 4.4;
export function house(x, z, w, d, floors, wall, roof, o = {}) {
    const y = o.y ?? ground(x, z), h = floors * FLOOR, b = { x, y, z, w, d, h, wall, roof, floors, ...o };
    b.ridge = o.flat ? 0 : (o.pitch ?? Math.min(w, d) * 0.5);
    buildings.push(b);
    solid(x - w / 2, y - 3, z - d / 2, x + w / 2, y + h, z + d / 2, "wall");
    if (b.ridge) {
        const alongX = !o.cross;                                         // a ridge along x or z: two stacked boxes hug the gable
        const R = b.ridge * 0.5;
        if (alongX) solid(x - w / 2, y + h, z - d / 4, x + w / 2, y + h + R * 1.5, z + d / 4, "roof");
        else solid(x - w / 4, y + h, z - d / 2, x + w / 4, y + h + R * 1.5, z + d / 2, "roof");
    }
    if (o.chimney !== false) {
        const cx = x + (o.cx ?? w * 0.26), cz = z + (o.cz ?? -d * 0.1), top = y + h + (b.ridge || 0) + 1.6;
        b.chim = [cx, top, cz];
        solid(cx - 0.9, y + h, cz - 0.9, cx + 0.9, top, cz + 0.9, "chimney");
    }
    if (o.id) homes[o.id] = { x, z, y, front: z + d / 2, h: y + h, b };
    return b;
}
const rowB = (z, d, list) => { for (const [x, w, f, wc, rc, o] of list) house(x, z, w, d, f, WALLS[wc], ROOFS[rc], o ?? {}); };

// Harbour Row, the quay front. Doors face the sea.
rowB(30, 13, [
    [-112, 12, 2, 0, 0], [-97, 11, 2, 1, 2, { smoke: 1 }], [-83, 12, 3, 5, 3, { id: "marlow" }], [-66, 11, 2, 4, 1],
    [-52, 12, 2, 6, 2], [-37, 11, 3, 7, 0, { id: "inn", smoke: 0 }], [-16, 16, 2, 3, 3, { id: "fish" }],
    [6, 12, 3, 0, 1, { smoke: 1 }], [21, 11, 2, 2, 2], [35, 12, 2, 1, 5], [50, 12, 3, 8, 3],
    [66, 14, 2, 4, 0], [86, 22, 2, 5, 4, { id: "harbour", tower: 1 }], [112, 18, 2, 6, 2, { shed: 1, smoke: 1 }],
]);
// Market Terrace. The Post Office holds the middle of the square.
rowB(-18, 14, [
    [-110, 12, 2, 2, 3], [-95, 11, 3, 0, 1, { id: "school2" }], [-80, 12, 2, 8, 0], [-64, 12, 2, 1, 2], [-49, 11, 3, 4, 5, { smoke: 2 }],
    [-32, 13, 2, 3, 1, { id: "bakery", shop: "#e0834a" }],
    [-13, 11, 2, 7, 3], [14, 22, 3, 8, 0, { id: "post", tower: 1, shop: "#c8452f", chimney: false }], [36, 12, 2, 5, 2], [51, 11, 3, 6, 0],
    [66, 12, 2, 4, 1], [81, 12, 2, 2, 3], [95, 11, 3, 0, 5, { smoke: 1 }], [110, 13, 2, 3, 0],
]);
// High Street, one sheet up.
rowB(-62, 13, [
    [-112, 12, 3, 4, 0], [-96, 12, 2, 5, 3], [-79, 12, 2, 2, 1], [-62, 14, 3, 8, 2, { smoke: 1 }], [-44, 12, 2, 1, 0],
    [-20, 26, 2, 7, 3, { id: "school", tower: 1, smoke: 0 }], [8, 12, 2, 3, 5], [24, 12, 3, 0, 1], [40, 12, 2, 4, 2, { smoke: 1 }],
    [56, 12, 2, 6, 0], [72, 11, 3, 5, 3], [88, 12, 2, 8, 1], [104, 12, 2, 2, 2], [120, 11, 2, 1, 0],
]);
// Top Lane: cottages and gardens, the fence between the Oakes and the Finches.
rowB(-98, 12, [
    [-92, 12, 2, 0, 1], [-72, 13, 2, 3, 2], [-50, 12, 2, 2, 0, { smoke: 1 }], [-20, 12, 2, 8, 3, { id: "oake" }], [8, 12, 2, 1, 4, { id: "finch" }],
    [38, 13, 2, 4, 1], [60, 12, 2, 6, 0], [84, 12, 2, 5, 3, { smoke: 1 }],
]);
// Farm cottages far out of town: their chimneys are the stepping stones of warm air across the hills.
for (const [x, z, w, r, top] of [[-150, 36, 2, 1, 96], [168, 40, 4, 3, 100], [-150, -80, 0, 0, 92], [150, -92, 3, 2, 82], [-222, -96, 6, 4, 84], [-60, -196, 8, 5, 88]]) house(x, z, 11, 9, 1, WALLS[w], ROOFS[r], { y: ground(x, z), smoke: 3, topY: top });
// Landmarks out of town. Their art is built specially in town.js.
const gy = (x, z) => ground(x, z);
export const landmarks = {
    chapel: { x: -182, z: -14, y: gy(-182, -14) },
    light: { x: 208, z: 132, y: gy(208, 132) },
    mill: { x: 62, z: -200, y: gy(62, -200) },
    viaduct: { x0: -160, x1: 8, z: -150, deck: 44 },
    pier: { x: -6, z0: 58, z1: 150, deck: 6 },
    mole: { x: 72, z0: 58, z1: 118 },
    bandstand: { x: 14, z: 6 },
    needle: { x: -258, z: 168 },
    cove: { x: -262, z: 74 },
};
{
    const c = landmarks.chapel;
    solid(c.x - 8, c.y - 3, c.z - 15, c.x + 8, c.y + 12, c.z + 11, "wall");       // nave
    solid(c.x - 5, c.y + 12, c.z - 15, c.x + 5, c.y + 16, c.z + 11, "roof");
    // Bell tower with an open belfry you can thread: four posts, a floor and a cap.
    const tx = c.x, tz = c.z + 18, ty = c.y;
    solid(tx - 6, ty - 3, tz - 6, tx + 6, ty + 18, tz + 6, "wall");
    for (const [a, b] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) solid(tx + a - 1, ty + 18, tz + b - 1, tx + a + 1, ty + 28, tz + b + 1, "post");
    solid(tx - 6.5, ty + 28, tz - 6.5, tx + 6.5, ty + 38, tz + 6.5, "roof");
    homes.chapel = { x: c.x, z: tz, y: c.y, front: tz + 6, h: c.y + 18, b: null };

    const L = landmarks.light;
    solid(L.x - 7, L.y - 3, L.z - 7, L.x + 7, L.y + 34, L.z + 7, "wall");
    solid(L.x - 5, L.y + 34, L.z - 5, L.x + 5, L.y + 44, L.z + 5, "wall");
    solid(L.x + 8, L.y - 3, L.z - 7, L.x + 22, L.y + 7, L.z + 7, "wall");              // keeper's cottage
    homes.light = { x: L.x, z: L.z, y: L.y, front: L.z + 7, h: L.y + 40, b: null };

    const M = landmarks.mill;
    solid(M.x - 7, M.y - 3, M.z - 7, M.x + 7, M.y + 19, M.z + 7, "wall");
    solid(M.x - 4, M.y + 19, M.z - 4, M.x + 4, M.y + 25, M.z + 4, "roof");
    homes.mill = { x: M.x, z: M.z, y: M.y, front: M.z + 7, h: M.y + 16, b: null };

    const V = landmarks.viaduct;
    for (let i = 0; i <= 7; i++) {
        const x = V.x0 + (V.x1 - V.x0) * i / 7;
        solid(x - 3, ground(x, V.z) - 3, V.z - 4, x + 3, V.deck, V.z + 4, "pier");
    }
    solid(V.x0 - 3, V.deck - 7, V.z - 4, V.x1 + 3, V.deck + 1.5, V.z + 4, "deck");

    const P = landmarks.pier;
    solid(P.x - 6, P.deck, P.z0, P.x + 6, P.deck + 1, P.z1, "deck");
    solid(P.x - 9, P.deck + 1, P.z1 - 14, P.x + 9, P.deck + 8, P.z1, "wall");            // pavilion at the end
    for (let z = P.z0 + 12; z < P.z1; z += 18) for (const s of [-5, 5]) solid(P.x + s - 0.5, -2, z - 0.5, P.x + s + 0.5, P.deck, z + 0.5, "post");

    const O = landmarks.mole;
    solid(O.x - 5, -2, O.z0, O.x + 5, 4, O.z1, "wall");
    solid(O.x - 2.5, 4, O.z1 - 5, O.x + 2.5, 15, O.z1, "wall");                          // little harbour light

    const B = landmarks.bandstand;
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832; solid(B.x + Math.cos(a) * 7 - 0.5, 9, B.z + Math.sin(a) * 7 - 0.5, B.x + Math.cos(a) * 7 + 0.5, 15, B.z + Math.sin(a) * 7 + 0.5, "post"); }
    solid(B.x - 8, 15, B.z - 8, B.x + 8, 19, B.z + 8, "roof");

    // The Needle's Eye: a sea stack with a hole through it.
    const N = landmarks.needle;
    solid(N.x - 14, -2, N.z - 7, N.x - 7, 34, N.z + 7, "rock");
    solid(N.x + 7, -2, N.z - 7, N.x + 14, 34, N.z + 7, "rock");
    solid(N.x - 14, 22, N.z - 7, N.x + 14, 40, N.z + 7, "rock");

    // The roof over the deepest part of the Cut: fly in by the harbour, out to the open sea.
    solid(176, 16, 118, 216, 44, 178, "rock");
}

// --- Moving air ------------------------------------------------------------------------------------------------
export const thermals = [];           // chimneys: { x, z, r, power, top, kind }
for (const b of buildings) if (b.smoke && b.chim) thermals.push({ x: b.chim[0], z: b.chim[2], y: b.chim[1], r: b.smoke > 2 ? 20 : 18, power: b.smoke > 2 ? 14 : b.smoke > 1 ? 14 : 12, top: b.topY ?? b.chim[1] + (b.smoke > 1 ? 62 : 46), kind: "chimney" });
thermals.push({ x: -120, z: 86, y: 3, r: 20, power: 13, top: 92, kind: "bonfire" });
thermals.push({ x: 62, z: -192, y: landmarks.mill.y, r: 18, power: 12, top: landmarks.mill.y + 56, kind: "chimney" });

/** Walls that warm in the sun and send air up their faces. n is the way the wall looks. */
export const warmWalls = [
    { a: [-120, 37], b: [122, 37], n: [0, 1], y0: 3, reach: 11, power: 7 },        // Harbour Row faces south
    { a: [-120, -11], b: [120, -11], n: [0, 1], y0: 9, reach: 10, power: 6 },       // Market Terrace faces south
    { a: [120, -60], b: [126, 30], n: [1, 0], y0: 9, reach: 12, power: 7 },         // the east end faces the dawn
    { a: [-120, -60], b: [-120, 30], n: [-1, 0], y0: 9, reach: 12, power: 7 },      // the west end faces the sunset
    { a: [150, 40], b: [190, 96], n: [-0.8, 0.6], y0: 2, reach: 13, power: 8 },     // the headland's bay face
    { a: [-210, 40], b: [-150, 44], n: [0.05, 1], y0: 2, reach: 13, power: 8 },     // west cliffs over the beach
];
const rib = (name, hue, width, speed, points) => ({ name, hue, width, speed, points });
const RIBBONS = [
    rib("Harbour Lift", "#f28f6b", 9, 26, [[-30, 12, 170], [-60, 8, 120], [-44, 12, 84], [20, 20, 74], [84, 28, 46], [128, 40, 8], [100, 52, -40], [40, 60, -78]]),
    rib("Chapel Road", "#f4cf72", 9, 26, [[60, 34, -42], [10, 34, -42], [-60, 38, -44], [-112, 44, -40], [-146, 52, -14], [-160, 62, 20], [-190, 68, 34]]),
    rib("Keeper's Way", "#8fd0c6", 9, 28, [[-34, 26, 58], [20, 30, 96], [90, 36, 126], [150, 46, 116], [182, 54, 100], [204, 60, 92], [230, 66, 112], [232, 72, 142], [212, 76, 158]]),
    rib("Moor Road", "#c9a6d6", 9, 27, [[176, 58, 54], [190, 62, -30], [170, 66, -110], [120, 62, -176], [84, 58, -188]]),
    rib("Long Way Home", "#f6a5b0", 9, 30, [[46, 60, -214], [-20, 62, -216], [-90, 58, -190], [-180, 52, -120], [-236, 40, -20], [-226, 28, 72], [-160, 18, 112], [-80, 16, 100]]),
    rib("The Needle's Breath", "#9fd8e8", 8, 26, [[-214, 38, 34], [-236, 32, 84], [-258, 24, 124], [-258, 14, 150], [-258, 12, 172], [-258, 16, 204]]),
    rib("Under the Boards", "#f4cf72", 6, 24, [[-44, 20, 194], [-16, 10, 176], [-6, 3.8, 152], [-6, 3.4, 112], [0, 4.4, 80], [26, 9, 66]]),
];
function catmull(a, b, c, d, t) {
    const t2 = t * t, t3 = t2 * t;
    return [0, 1, 2].map((i) => 0.5 * (2 * b[i] + (c[i] - a[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t2 + (3 * b[i] - a[i] - 3 * c[i] + d[i]) * t3));
}
export const ribbons = RIBBONS.map((r) => {
    const P = r.points, out = [];
    for (let i = 0; i < P.length - 1; i++) {
        const a = P[Math.max(0, i - 1)], b = P[i], c = P[i + 1], d = P[Math.min(P.length - 1, i + 2)], n = Math.ceil(Math.hypot(c[0] - b[0], c[1] - b[1], c[2] - b[2]) / 4);
        for (let k = 0; k < n; k++) out.push(catmull(a, b, c, d, k / n));
    }
    out.push(P[P.length - 1]);
    const tan = out.map((p, i) => { const q = out[Math.min(out.length - 1, i + 1)], o = out[Math.max(0, i - 1)], d = [q[0] - o[0], q[1] - o[1], q[2] - o[2]], l = Math.hypot(...d) || 1; return d.map((v) => v / l); });
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y1 = -1e9, y0 = 1e9;
    for (const p of out) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { ...r, pts: out, tan, box: [x0 - 16, y0 - 16, z0 - 16, x1 + 16, y1 + 16, z1 + 16] };
});
const lenOf = (r) => r.pts.length * 4;
export const ribbonLength = lenOf;

/** Air at a point: fills out[0..2], returns info about what you are in. sun is the [x,z] the sunlight comes FROM, warm 0..1. */
export function wind(x, y, z, sun, warm, gustMul, out, info) {
    let wx = 0, wy = 0, wz = 0;
    info.thermal = 0; info.wall = 0; info.ribbon = null; info.ribbonI = 0; info.ribbonK = 0;
    for (const t of thermals) {
        const dx = x - t.x, dz = z - t.z, d2 = dx * dx + dz * dz, R = t.r;
        if (d2 > R * R || y > t.top || y < t.y - 4) continue;
        const k = 1 - d2 / (R * R), fade = Math.min(1, (t.top - y) / 16);
        wy += t.power * k * fade * gustMul; info.thermal = Math.max(info.thermal, k * fade);
    }
    for (const w of warmWalls) {
        const sunny = (w.n[0] * sun[0] + w.n[1] * sun[1]) * warm; if (sunny <= 0.05) continue;
        const ax = w.b[0] - w.a[0], az = w.b[1] - w.a[1], l2 = ax * ax + az * az, t = ((x - w.a[0]) * ax + (z - w.a[1]) * az) / l2;
        if (t < 0 || t > 1) continue;
        const d = (x - w.a[0] - ax * t) * w.n[0] + (z - w.a[1] - az * t) * w.n[1];
        if (d < -2 || d > w.reach || y < w.y0 - 1 || y > w.y0 + 42) continue;
        const k = (1 - d / w.reach) * Math.min(1, (w.y0 + 42 - y) / 12) * sunny;
        wy += w.power * k; info.wall = Math.max(info.wall, k);
    }
    for (const r of ribbons) {
        const b = r.box; if (x < b[0] || x > b[3] || y < b[1] || y > b[4] || z < b[2] || z > b[5]) continue;
        let best = 1e9, bi = -1;
        for (let i = 0; i < r.pts.length; i += 2) { const p = r.pts[i], d = (p[0] - x) ** 2 + (p[1] - y) ** 2 + (p[2] - z) ** 2; if (d < best) { best = d; bi = i; } }
        if (best > r.width * r.width * 1.6 || bi >= r.pts.length - 2) continue;
        const d = Math.sqrt(best), k = sm(r.width * 1.26, r.width * 0.45, d), T = r.tan[bi], P = r.pts[bi];
        const pull = 2.2 * k;                                                  // a soft hand towards the middle of the ribbon
        wx += T[0] * r.speed * k + (P[0] - x) * pull; wy += T[1] * r.speed * k + (P[1] - y) * pull; wz += T[2] * r.speed * k + (P[2] - z) * pull;
        if (k > info.ribbonK) { info.ribbon = r; info.ribbonI = bi; info.ribbonK = k; }
    }
    // The edges of the map are a sea breeze that turns you home, and a ceiling of still, heavy air.
    const push = (a, b, v) => sm(a, b, v) * 26;
    wx += push(BOUNDS.x1 - 40, BOUNDS.x1 + 30, -x) * 0 - push(BOUNDS.x1 - 40, BOUNDS.x1 + 30, x) + push(-BOUNDS.x0 - 40, -BOUNDS.x0 + 30, -x);
    wz += -push(BOUNDS.z1 - 40, BOUNDS.z1 + 30, z) + push(-BOUNDS.z0 - 40, -BOUNDS.z0 + 30, -z);
    wy -= sm(BOUNDS.top - 16, BOUNDS.top + 20, y) * 16;
    out[0] = wx; out[1] = wy; out[2] = wz;
    return info;
}
