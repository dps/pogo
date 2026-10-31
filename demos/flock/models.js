// Every 3D model in the game, built from code. Characters go to assets.mesh(); scenery is kept as raw arrays
// so levels can stamp hundreds of props into one merged mesh.
import { Vox, hash, meshVox, toGeometry } from "./vox.js";

const C = {
    wool: 0xfbf6ea, woolB: 0xece3d2, woolC: 0xd9cdb8, face: 0x38302f, faceL: 0x574a47, eye: 0xffffff, pupil: 0x141216, pink: 0xf08f9c, blush: 0xf6b3b0,
    black: 0x23242e, black2: 0x34363f, white: 0xfdf9ef, tan: 0xc98a4b, nose: 0x15141a, tongue: 0xf0637c, bandana: 0xe0413c, bandana2: 0xfff2d8,
    ramFace: 0xc9a77e, horn: 0xe9d7a8, horn2: 0xb99a6c,
    wolf: 0x6c7488, wolf2: 0x8c94a6, wolf3: 0xd4d6dc, wolfD: 0x454a5c, bull: 0x4c2f28, bull2: 0x6d4638, bull3: 0x2d1b18, ring: 0xf2c94c, muzzle: 0xd8ab8e,
    trunk: 0x7a5233, trunk2: 0x5e3d27, leaf1: 0x4f9e43, leaf2: 0x69b84c, leaf3: 0x8ccf55, leaf0: 0x37803d,
    cherry1: 0xf5a4c0, cherry2: 0xfbc4d6, cherry3: 0xffe0ea, cherry0: 0xe07fa8, apple: 0xe0403a, pine1: 0x2f7d5b, pine2: 0x3f9a6b, pine3: 0x6cc48a,
    hay: 0xe9bd52, hay2: 0xd29f3c, hay3: 0xf6d97c, wood: 0xa8743f, wood2: 0x8a5a30, wood3: 0xc49358, stone: 0x9aa0a6, stone2: 0x80868e, stone3: 0xb7bbbd, moss: 0x6f9e4e,
    wall: 0xf6ead2, wall2: 0xe5d2ae, beam: 0x6b4426, roof: 0xd5533f, roof2: 0xb7402f, roof3: 0xe8755a, glass: 0x7fd0e8, glass2: 0xcff1f7, door: 0x3f7d8c,
    barn: 0xc4422f, barn2: 0xa03224, trim: 0xfbf3e0, pump: 0xf08a24, pump2: 0xc96a14, stem: 0x4f8a3a, lamp: 0xffd680, iron: 0x3a3c46, cloud: 0xffffff, cloud2: 0xe8eef6,
};

const mottle = (a, b, k = 0.3, s = 1) => (x, y, z) => hash(Math.floor(x / s), Math.floor(y / s), Math.floor(z / s)) < k ? b : a;

// --- Sheep ---------------------------------------------------------------------------------------------------------
const WOOL_BUMPS = [[0, 1, 0], [0.8, 0.45, 0.35], [-0.8, 0.45, 0.35], [0.8, 0.45, -0.4], [-0.8, 0.45, -0.4], [0, 0.65, 0.9], [0, 0.65, -0.9], [0.92, -0.1, 0], [-0.92, -0.1, 0], [0, -0.45, 0.6]];

function wool(v, cx, cy, cz, rx, ry, rz, a = C.wool, b = C.woolB) {
    const paint = (x, y, z) => (hash(x >> 1, y >> 1, z >> 1) < 0.34 ? b : a);
    v.ball(cx, cy, cz, rx * 0.86, ry * 0.86, rz * 0.86, paint);
    for (const [dx, dy, dz] of WOOL_BUMPS) v.ball(cx + dx * rx * 0.76, cy + dy * ry * 0.76, cz + dz * rz * 0.76, rx * 0.4, ry * 0.46, rz * 0.34, paint);
}

/** legs: [fl, fr, bl, br] lift in voxels. pose: stand, panic, graze, fly. */
function sheepVox({ legs = [0, 0, 0, 0], pose = "stand", ram = false, dark = false }) {
    const v = new Vox(15, 18, 20), cx = 7, fy = pose === "graze" ? -5 : pose === "panic" ? 1 : 0;
    const legCol = ram ? 0x56463c : C.face, lz = [7, 7, 15, 15], lx = [4, 10, 4, 10];
    legs.forEach((lift, i) => {
        const flare = pose === "fly" ? (i % 2 ? 1 : -1) : 0, fwd = pose === "fly" ? (i < 2 ? -2 : 2) : 0;
        v.box(lx[i] + flare, lift, lz[i] + fwd, lx[i] + 1 + flare - (i % 2), 5, lz[i] + 1 + fwd, legCol);
    });
    const [a, b] = dark ? [0x4b4552, 0x3c3744] : [C.wool, C.woolB];
    wool(v, cx, 9, 11.5, 6.6, 5, 7.4, a, b);
    v.ball(cx, 9.5, 19, 1.5, 1.5, 1, a);
    // head
    const hy = 10 + fy, hz = 4, f = ram ? C.ramFace : C.face, f2 = ram ? 0xdfc09a : C.faceL;
    v.box(cx - 2, hy - 1, hz - 1, cx + 2, hy + 3, hz + 2, f);
    v.box(cx - 2, hy - 2, hz - 3, cx + 2, hy + 3, hz - 2, f);
    v.box(cx - 1, hy - 3, hz - 4, cx + 1, hy - 1, hz - 3, f2);
    v.set(cx - 1, hy - 1, hz - 4, 0x241d1f); v.set(cx + 1, hy - 1, hz - 4, 0x241d1f);
    wool(v, cx, hy + 4, hz, 3.4, 1.9, 2.6, a, b); // cap
    for (const s of [-1, 1]) { v.box(Math.min(cx + s * 3, cx + s * 4), hy + 1, hz, Math.max(cx + s * 3, cx + s * 4), hy + 2, hz + 1, f); v.set(cx + s * 4, hy + 1, hz, C.pink); }
    // eyes: big and slightly too far apart, which is most of the charm
    const wide = pose === "panic" || pose === "fly";
    for (const s of [-1, 1]) {
        v.box(cx + s * 2, hy + 1, hz - 3, cx + s * 2, hy + (wide ? 3 : 2), hz - 3, C.eye);
        if (wide) v.set(cx + s, hy + 2, hz - 3, C.eye);
        v.set(cx + s, hy + 1, hz - 3, C.pupil);
    }
    if (wide) { v.box(cx - 1, hy - 3, hz - 4, cx + 1, hy - 3, hz - 2, 0x7b2334); v.set(cx, hy - 3, hz - 4, C.tongue); }
    return v;
}

function ramVox({ legs = [0, 0, 0, 0], pose = "stand" }) {
    const v = sheepVox({ legs, pose, ram: true });
    const hy = 10 + (pose === "panic" ? 1 : 0), hz = 4, cx = 7;
    // curly horns, a thick spiral on each side
    for (const s of [-1, 1]) {
        const steps = [[3, 3, 2], [4, 4, 3], [5, 3, 3], [6, 2, 3], [6, 0, 2], [6, -1, 1], [5, -2, 0], [4, -1, -1]];
        steps.forEach(([ax, ay, az], i) => v.box(Math.min(cx + s * ax, cx + s * (ax - 1)), hy + ay, hz + az - 1, Math.max(cx + s * ax, cx + s * (ax - 1)), hy + ay + 1, hz + az, i % 3 === 2 ? C.horn2 : C.horn));
    }
    return v;
}

// --- Dog parts. Facing -z. ------------------------------------------------------------------------------------------
function dogBody() {
    const v = new Vox(9, 9, 16);
    v.box(1, 1, 2, 7, 7, 13, C.black);
    v.box(2, 0, 3, 6, 8, 12, C.black);
    v.box(2, 0, 3, 6, 1, 12, C.white);          // belly
    v.box(1, 1, 2, 7, 4, 3, C.white);           // chest
    v.box(2, 1, 1, 6, 5, 1, C.white);
    v.box(0, 3, 12, 0, 6, 13, C.black); v.box(8, 3, 12, 8, 6, 13, C.black); // haunches
    v.box(3, 6, 8, 5, 8, 10, C.black2);         // saddle sheen
    // bandana
    v.box(1, 6, 1, 7, 8, 3, C.bandana);
    v.box(2, 4, 0, 6, 6, 1, C.bandana);
    v.box(3, 3, 0, 5, 3, 0, C.bandana);
    v.set(3, 5, 0, C.bandana2); v.set(5, 5, 0, C.bandana2); v.set(4, 4, 0, C.bandana2); v.set(2, 7, 1, C.bandana2); v.set(6, 7, 1, C.bandana2);
    return meshVox(v, { unit: 0.06, pivot: [4.5, 4.5, 7.5] });
}

/** face: 0 happy tongue, 1 bark, 2 panting, 3 dizzy */
function dogHead(face) {
    const v = new Vox(11, 10, 12);
    v.box(1, 2, 4, 9, 9, 11, C.black);          // skull
    v.box(0, 3, 5, 10, 8, 10, C.black);
    v.box(3, 8, 4, 7, 9, 5, C.black);
    // white blaze down the middle and muzzle
    v.box(4, 4, 3, 6, 9, 4, C.white);
    v.box(5, 8, 3, 5, 9, 3, C.white);
    v.box(2, 1, 0, 8, 4, 4, C.white);           // snout
    v.box(3, 4, 1, 7, 5, 3, C.white);
    v.box(4, 4, 0, 6, 5, 0, C.nose);            // nose
    v.set(4, 5, 0, C.black2);
    // tan cheeks and eyebrows
    v.box(2, 5, 3, 2, 5, 3, C.tan); v.box(8, 5, 3, 8, 5, 3, C.tan);
    v.set(2, 8, 3, C.tan); v.set(8, 8, 3, C.tan);
    // eyes
    const eye = (x, wink) => {
        if (wink) { v.box(x, 6, 3, x + 1, 6, 3, C.nose); return; }
        v.box(x, 6, 3, x + 1, 7, 3, C.eye);
        v.set(x + (x < 5 ? 1 : 0), 6, 3, C.nose); v.set(x + (x < 5 ? 1 : 0), 7, 3, C.nose);
        v.set(x + (x < 5 ? 0 : 1), 7, 3, C.eye);
    };
    if (face === 3) { // dizzy: crossed eyes
        v.box(2, 6, 3, 3, 7, 3, C.eye); v.box(7, 6, 3, 8, 7, 3, C.eye); v.set(3, 6, 3, C.nose); v.set(7, 7, 3, C.nose);
    } else { eye(2, false); eye(7, false); }
    if (face === 1) { // big open bark
        v.box(2, 0, 1, 8, 2, 4, 0x9c2a3c);
        v.box(3, 1, 2, 7, 2, 3, 0x6e1a2c);
        v.box(2, 3, 0, 8, 3, 0, C.white);
        v.box(3, 0, 0, 7, 0, 3, C.white);
        v.set(3, 2, 1, C.eye); v.set(7, 2, 1, C.eye);
    }
    if (face === 0 || face === 2) { // lolling tongue on one side
        v.box(2, 1, 0, 8, 1, 3, 0x9c2a3c);
        v.box(6, 0, 0, 7, 1, 1, C.tongue);
        if (face === 2) v.box(6, 0, 0, 7, 0, 2, C.tongue);
    }
    return meshVox(v, { unit: 0.06, pivot: [5.5, 4, 9] });
}

function dogEar() {
    const v = new Vox(4, 2, 5);
    v.box(0, 0, 1, 3, 1, 4, C.black);
    v.box(1, 0, 0, 2, 1, 0, C.black);
    v.box(1, 0, 2, 2, 0, 3, C.pink);
    return meshVox(v, { unit: 0.06, pivot: [2, 1, 4.5] });
}
function dogTail() {
    const v = new Vox(5, 8, 11);
    v.box(1, 0, 0, 3, 2, 3, C.black);
    v.box(1, 1, 3, 3, 3, 5, C.black);
    v.box(0, 2, 4, 4, 4, 5, C.black);
    v.box(1, 3, 5, 3, 5, 7, C.black);
    v.box(1, 4, 7, 3, 7, 10, C.white);
    v.box(0, 5, 8, 4, 6, 9, C.white);
    return meshVox(v, { unit: 0.06, pivot: [2.5, 1, 0] });
}
function dogLeg(front) {
    const v = new Vox(3, 8, 4);
    v.box(0, 3, 1, 2, 7, 3, front ? C.black : C.black);
    v.box(0, 0, 1, 2, 4, 3, C.white);
    v.box(0, 0, 0, 2, 1, 1, C.white);
    return meshVox(v, { unit: 0.06, pivot: [1.5, 8, 2] });
}

// --- Wolf ----------------------------------------------------------------------------------------------------------
function wolfVox(legs, grin) {
    const v = new Vox(13, 18, 28), cx = 6;
    const lz = [10, 10, 22, 22], lx = [3, 9, 3, 9];
    legs.forEach((lift, i) => v.box(lx[i] - 1, lift, lz[i] - 1, lx[i] + 1, 8, lz[i], C.wolfD));
    v.box(2, 7, 7, 10, 13, 23, C.wolf);
    v.box(3, 13, 8, 9, 14, 22, C.wolfD);
    v.box(3, 6, 8, 9, 7, 22, C.wolf3);
    v.box(1, 8, 7, 11, 13, 11, C.wolf2);        // ruff
    v.box(2, 7, 5, 10, 14, 7, C.wolf2);
    // tail
    v.box(5, 11, 24, 7, 13, 27, C.wolf); v.box(5, 12, 26, 7, 14, 27, C.wolf3);
    // head
    v.box(3, 10, 1, 9, 16, 6, C.wolf);
    v.box(4, 9, -0, 8, 12, 2, C.wolf3);
    v.box(5, 11, 0, 7, 12, 0, C.nose);
    v.box(3, 16, 4, 4, 17, 6, C.wolfD); v.box(8, 16, 4, 9, 17, 6, C.wolfD);
    v.box(4, 13, 1, 5, 13, 1, C.wolfD); v.box(7, 13, 1, 8, 13, 1, C.wolfD);
    if (grin) { v.box(4, 9, 0, 8, 9, 3, 0x7b2334); v.set(4, 9, 0, C.white); v.set(8, 9, 0, C.white); v.set(6, 9, 0, C.white); }
    return meshVox(v, { unit: 0.065, pivot: [6.5, 0, 14] });
}
function wolfEyes() {
    const v = new Vox(5, 1, 1);
    v.set(0, 0, 0, 0xfff27a); v.set(1, 0, 0, 0xfff27a); v.set(3, 0, 0, 0xfff27a); v.set(4, 0, 0, 0xfff27a);
    return meshVox(v, { unit: 0.07, ao: 0, jitter: 0, pivot: [2.5, 0.5, 0.5] });
}

// --- Bull ----------------------------------------------------------------------------------------------------------
function bullVox(legs, angry) {
    const v = new Vox(21, 26, 34), cx = 10;
    const lz = [11, 11, 28, 28], lx = [5, 15, 5, 15];
    legs.forEach((lift, i) => {
        v.box(lx[i] - 2, lift, lz[i] - 2, lx[i] + 1, 10, lz[i] + 1, C.bull3);
        v.box(lx[i] - 2, lift, lz[i] - 2, lx[i] + 1, lift + 1, lz[i] + 1, 0x18100f);
    });
    v.box(2, 9, 8, 18, 20, 31, C.bull);
    v.box(1, 10, 9, 19, 21, 19, C.bull2);       // big shoulders
    v.box(4, 21, 9, 16, 23, 17, C.bull2);       // hump
    v.box(3, 8, 10, 17, 9, 30, C.bull3);
    v.box(9, 12, 32, 11, 20, 32, C.bull3);      // tail
    v.box(8, 9, 32, 12, 12, 33, C.black);
    // head
    v.box(5, 11, 1, 15, 21, 9, C.bull2);
    v.box(6, 10, -0, 14, 14, 3, C.muzzle);
    v.box(7, 12, 0, 8, 12, 0, 0x4a2622); v.box(12, 12, 0, 13, 12, 0, 0x4a2622);
    v.box(8, 9, 0, 12, 9, 1, C.ring); v.set(8, 10, 0, C.ring); v.set(12, 10, 0, C.ring);
    v.box(7, 20, 4, 13, 22, 7, C.bull3);        // fringe
    // horns
    for (const s of [-1, 1]) {
        v.box(cx + s * 6 - 1, 19, 5, cx + s * 6 + 1, 21, 7, C.horn);
        v.box(cx + s * 8 - 1, 21, 5, cx + s * 8 + 1, 23, 7, C.horn);
        v.box(cx + s * 9 - 1, 23, 5, cx + s * 9 + 1, 25, 6, 0xfff5dc);
    }
    // ears
    v.box(2, 18, 6, 4, 19, 8, C.bull3); v.box(16, 18, 6, 18, 19, 8, C.bull3);
    // eyes: furious
    const e = angry ? 0xff4a33 : 0xfff5dc;
    v.box(6, 16, 0, 8, 17, 0, e); v.box(12, 16, 0, 14, 17, 0, e);
    v.set(8, 16, 0, C.nose); v.set(12, 16, 0, C.nose);
    v.box(5, 18, 0, 8, 18, 0, C.bull3); v.box(12, 18, 0, 15, 18, 0, C.bull3);
    v.set(5, 17, 0, C.bull3); v.set(15, 17, 0, C.bull3);
    return meshVox(v, { unit: 0.075, pivot: [10.5, 0, 17] });
}

// --- Chicken, for comic relief ---------------------------------------------------------------------------------------
function chickenVox(legs) {
    const v = new Vox(7, 10, 9);
    v.set(2, legs ? 1 : 0, 4, 0xf0a030); v.set(2, 1, 4, 0xf0a030); v.set(4, legs ? 0 : 1, 4, 0xf0a030); v.set(4, 1, 4, 0xf0a030);
    v.box(1, 2, 3, 5, 5, 7, C.white);
    v.box(2, 5, 7, 4, 7, 8, C.woolB);
    v.box(2, 5, 1, 4, 8, 3, C.white);
    v.box(3, 9, 1, 3, 9, 3, C.bandana);
    v.set(3, 6, 0, 0xf0a030); v.set(3, 5, 1, C.bandana);
    v.set(2, 7, 1, C.nose); v.set(4, 7, 1, C.nose);
    return meshVox(v, { unit: 0.06, pivot: [3.5, 0, 4.5] });
}

// --- Scenery ------------------------------------------------------------------------------------------------------
function leafPaint(top, mid, low, dark, hi = 16) {
    return (x, y, z) => {
        const n = y / hi + (hash(x >> 1, y >> 1, z >> 1) - 0.5) * 0.28;
        return n > 0.86 ? top : n > 0.62 ? mid : n > 0.4 ? low : dark;
    };
}
function canopy(v, blobs, paint) { for (const [x, y, z, r, ry] of blobs) v.ball(x, y, z, r, ry ?? r * 0.86, r, paint); }

function oak(variant = 0) {
    const v = new Vox(13, 15, 13);
    v.box(5, 0, 5, 7, 5, 7, C.trunk);
    v.box(4, 0, 6, 8, 0, 6, C.trunk); v.box(6, 0, 4, 6, 0, 8, C.trunk);
    const p = variant === 2 ? leafPaint(C.cherry3, C.cherry2, C.cherry1, C.cherry0, 15) : leafPaint(C.leaf3, C.leaf2, C.leaf1, C.leaf0, 15);
    canopy(v, [[6, 9.6, 6, 5.2, 4.2], [3, 8, 4.4, 2.8], [9, 8, 5, 2.8], [4.4, 8, 9, 2.8], [8.6, 8.6, 8.6, 2.6], [6, 12, 6, 3.2, 2.5]], p);
    if (variant === 1) for (let i = 0; i < 14; i++) { // apples
        const a = hash(i, 3) * 6.28, y = 6 + hash(i, 5) * 6, r = 5.8;
        v.set(6 + Math.cos(a) * r, y, 6 + Math.sin(a) * r, C.apple);
    }
    return meshVox(v, { unit: 0.262, cull: "-y-z", jitter: 0.02 });
}
function pine(low = false) {
    const k = low ? 0.5 : 0.72, N = Math.ceil(13 * k), H = Math.ceil(22 * k), c = (N - 1) / 2, v = new Vox(N, H, N);
    if (!low) v.box(c - 1, 0, c - 1, c, 3, c, C.trunk2);
    const paint = (x, y, z) => { const h = hash(x, y >> 1, z); return h < 0.16 ? C.pine3 : h < 0.55 ? C.pine2 : C.pine1; };
    for (const [y, h, r] of [[2.2, 4.3, 6.5], [6, 4.3, 5.2], [9.5, 3.6, 3.8], [12.4, 3.6, 2.4]]) {
        const hh = Math.round(h * k / 0.72), y0 = Math.round(y * k / 0.72), rk = k / 0.72;
        for (let j = 0; j < hh; j++) { const rr = (r * (1 - j / hh) + 0.7) * k; v.ball(c, y0 + j, c, Math.max(0.7, rr), 0.7, Math.max(0.7, rr), paint); }
    }
    return meshVox(v, { unit: low ? 0.36 : 0.25, cull: "-y-z", jitter: 0.02 });
}
function bush(col = 0) {
    const v = new Vox(9, 7, 9);
    const p = col === 1 ? leafPaint(0xffd1e0, 0xf79fbd, C.cherry0, 0xc76a95, 7) : leafPaint(C.leaf3, C.leaf2, C.leaf1, C.leaf0, 7);
    canopy(v, [[4, 2.6, 4, 3.6, 2.8], [2.6, 2, 5.4, 2.2], [6, 2.2, 3, 2.4]], p);
    if (col === 2) for (let i = 0; i < 9; i++) v.set(hash(i, 1) * 8, 1 + hash(i, 2) * 5, hash(i, 3) * 8, 0xe5484d);
    return meshVox(v, { unit: 0.13 });
}
function hedgeBlock() {
    const v = new Vox(4, 5, 4);
    const p = (x, y, z) => { const h = hash(x, y, z) + y * 0.13; return h > 1.04 ? C.leaf3 : h > 0.62 ? C.leaf2 : h > 0.3 ? C.leaf1 : C.leaf0; };
    v.box(0, 0, 0, 3, 3, 3, p);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) if (hash(x, z, 77) > 0.35) v.set(x, 4, z, p(x, 4, z));
    return meshVox(v, { unit: 0.25, jitter: 0.04, cull: "-y-z" });
}
function hayRound() {
    const v = new Vox(10, 8, 12);
    for (let z = 1; z < 11; z++) for (let y = 0; y < 8; y++) for (let x = 0; x < 10; x++) {
        const dx = x - 4.5, dy = y - 3.5;
        if (dx * dx + dy * dy < 19) v.set(x, y, z, z === 1 || z === 10 ? (((Math.hypot(dx, dy) | 0) % 2) ? C.hay2 : C.hay3) : (x + z * 2) % 4 === 0 ? C.hay2 : C.hay);
    }
    return meshVox(v, { unit: 0.11 });
}
function haySquare() {
    const v = new Vox(11, 6, 7);
    v.box(0, 0, 0, 10, 5, 6, (x, y) => (y % 2 ? C.hay : (x % 3 ? C.hay3 : C.hay2)));
    v.box(2, 0, 0, 2, 5, 6, C.wood2); v.box(8, 0, 0, 8, 5, 6, C.wood2);
    return meshVox(v, { unit: 0.11 });
}
function rock(k = 0) {
    const v = new Vox(8, 5, 8);
    const p = (x, y, z) => y >= 3 && hash(x, 4, z) < 0.3 ? C.moss : hash(x, y, z) < 0.3 ? C.stone2 : hash(x, y, z) > 0.8 ? C.stone3 : C.stone;
    v.ball(3.5, 1, 3.5, 3.6, 3.2, 3.2, p);
    if (k) v.ball(5.6, 0, 5, 2.2, 2.2, 2, p);
    return meshVox(v, { unit: 0.15 });
}
function fencePost(white) {
    const v = new Vox(3, 11, 3), c = white ? 0xfdf8ec : C.wood, d = white ? 0xe5ddcb : C.wood2;
    v.box(0, 0, 0, 2, 9, 2, c); v.box(1, 10, 1, 1, 10, 1, c); v.box(0, 0, 0, 2, 1, 2, d);
    return meshVox(v, { unit: 0.08 });
}
function fenceArm(white) { // from the tile centre towards +x, half a tile long
    const v = new Vox(6, 9, 1), c = white ? 0xfdf8ec : C.wood3, d = white ? 0xefe7d4 : C.wood;
    v.box(0, 3, 0, 5, 4, 0, (x) => x % 2 ? c : d); v.box(0, 7, 0, 5, 8, 0, (x) => x % 2 ? c : d);
    return meshVox(v, { unit: 0.0834, pivot: [0, 0, 0.5] });
}
function weakFence() {
    const v = new Vox(12, 10, 2), n = C.wood2;
    v.box(0, 0, 0, 1, 8, 1, C.wood); v.box(10, 0, 0, 11, 9, 1, C.wood); v.box(5, 0, 0, 6, 7, 1, C.wood);
    v.box(0, 3, 0, 11, 3, 0, (x) => hash(x, 9) < 0.2 ? n : 0xb8824f); v.box(0, 6, 0, 11, 6, 1, (x) => hash(x, 2) < 0.2 ? n : 0xb8824f);
    v.set(3, 5, 0, C.iron); v.set(8, 4, 0, C.iron);
    v.box(4, 0, 0, 4, 8, 0, 0xcfa873);
    return meshVox(v, { unit: 0.0834 });
}
function wallPiece(k) { // dry stone wall, one tile long along x
    const v = new Vox(4, 3, 2);
    v.box(0, 0, 0, 3, 1, 1, (x, y, z) => { const h = hash(x, y, z + k); return h < 0.3 ? C.stone2 : h < 0.7 ? C.stone : C.stone3; });
    for (let x = 0; x < 4; x++) if (hash(x, k, 3) > 0.25) v.box(x, 2, 0, x, 2, 1, hash(x, k, 8) < 0.5 ? C.moss : C.stone);
    return meshVox(v, { unit: 0.25 });
}
function pumpkin() {
    const v = new Vox(7, 6, 7);
    v.ball(3, 2, 3, 3.3, 2.6, 3.3, (x) => (x % 2 ? C.pump : C.pump2));
    v.box(3, 4, 3, 3, 5, 3, C.stem);
    return meshVox(v, { unit: 0.09 });
}
function cabbage() {
    const v = new Vox(5, 3, 5);
    v.ball(2, 1, 2, 2.4, 1.8, 2.4, (x, y, z) => hash(x, y, z) < 0.4 ? 0x9fdc77 : 0x6dbb5a);
    return meshVox(v, { unit: 0.09 });
}
function flower(c, c2) {
    const v = new Vox(3, 5, 3);
    v.box(1, 0, 1, 1, 3, 1, C.stem);
    v.set(0, 3, 1, c).set(2, 3, 1, c).set(1, 3, 0, c).set(1, 3, 2, c).set(1, 4, 1, c).set(1, 3, 1, c2);
    return meshVox(v, { unit: 0.06, jitter: 0 });
}
function tuft() {
    const v = new Vox(5, 4, 5);
    for (let i = 0; i < 7; i++) { const x = 1 + hash(i, 7) * 3 | 0, z = 1 + hash(i, 9) * 3 | 0, h = 1 + hash(i, 1) * 3 | 0; v.box(x, 0, z, x, h, z, hash(i, 4) < 0.5 ? C.leaf3 : C.leaf2); }
    return meshVox(v, { unit: 0.06, ao: 0 });
}
function mushroom() {
    const v = new Vox(5, 5, 5);
    v.box(2, 0, 2, 2, 2, 2, 0xf5ead7);
    v.ball(2, 3, 2, 2.2, 1.4, 2.2, (x, y, z) => hash(x, y, z) < 0.2 ? 0xffffff : 0xe0483f);
    return meshVox(v, { unit: 0.06 });
}
function log() {
    const v = new Vox(14, 5, 5);
    for (let x = 0; x < 14; x++) for (let y = 0; y < 5; y++) for (let z = 0; z < 5; z++) if ((y - 2) ** 2 + (z - 2) ** 2 < 6.5) v.set(x, y, z, x === 0 || x === 13 ? 0xd9b98c : hash(x, y, z) < 0.3 ? C.trunk2 : C.trunk);
    return meshVox(v, { unit: 0.11 });
}
function well() {
    const v = new Vox(14, 24, 14);
    for (let x = 0; x < 14; x++) for (let z = 0; z < 14; z++) { const r = Math.hypot(x - 6.5, z - 6.5); if (r < 6.9) for (let y = 0; y < 6; y++) if (r > 4.5 || y < 3) v.set(x, y, z, r <= 4.5 ? 0x4aa7d6 : hash(x, y, z) < 0.3 ? C.stone2 : C.stone); }
    v.box(1, 5, 6, 2, 16, 7, C.wood2); v.box(11, 5, 6, 12, 16, 7, C.wood2);
    v.box(2, 12, 6, 11, 12, 7, C.wood);
    for (let y = 16; y < 22; y++) { const k = y - 16; v.box(0, y, k, 13, y, 13 - k, y % 2 ? C.roof2 : C.roof); }
    v.box(6, 7, 6, 7, 9, 7, C.wood2); v.box(6, 10, 6, 7, 12, 7, C.iron);
    return meshVox(v, { unit: 0.11 });
}
function scarecrow() {
    const v = new Vox(16, 26, 4);
    v.box(7, 0, 1, 8, 20, 2, C.wood);
    v.box(0, 16, 1, 15, 17, 2, C.wood);
    v.box(3, 10, 0, 12, 18, 3, 0xd6604c); v.box(6, 10, 0, 9, 18, 3, 0x3b6ea5);
    v.box(5, 19, 0, 10, 24, 3, C.hay3);
    v.set(6, 22, 0, C.nose); v.set(9, 22, 0, C.nose); v.box(7, 20, 0, 8, 20, 0, C.nose);
    v.box(3, 24, 0, 12, 24, 3, C.wood2); v.box(5, 25, 0, 10, 25, 3, C.wood2);
    v.box(0, 15, 1, 1, 18, 2, C.hay); v.box(14, 15, 1, 15, 18, 2, C.hay);
    return meshVox(v, { unit: 0.11 });
}
function cart() {
    const v = new Vox(22, 12, 11);
    v.box(0, 5, 0, 19, 5, 10, C.wood); v.box(0, 6, 0, 19, 8, 0, C.wood3); v.box(0, 6, 10, 19, 8, 10, C.wood3); v.box(0, 6, 0, 0, 8, 10, C.wood3); v.box(19, 6, 0, 19, 8, 10, C.wood3);
    v.box(1, 6, 1, 18, 9, 9, (x, y, z) => hash(x, y, z) < 0.3 ? C.hay3 : C.hay); v.box(6, 10, 3, 13, 11, 7, C.hay3);
    for (const z of [0, 10]) for (const cx of [4, 15]) for (let x = -3; x <= 3; x++) for (let y = -3; y <= 3; y++) if (Math.hypot(x, y) < 3.6 && Math.hypot(x, y) > 2 || x === 0 || y === 0) if (Math.hypot(x, y) < 3.6) v.set(cx + x, 3 + y, z, C.wood2);
    v.box(20, 5, 5, 21, 5, 5, C.wood2);
    return meshVox(v, { unit: 0.12 });
}
function lantern() {
    const v = new Vox(5, 22, 5);
    v.box(2, 0, 2, 2, 16, 2, C.iron); v.box(1, 0, 1, 3, 1, 3, C.iron);
    v.box(1, 16, 1, 3, 16, 3, C.iron); v.box(1, 20, 1, 3, 20, 3, C.iron); v.box(0, 21, 0, 4, 21, 4, C.iron);
    return meshVox(v, { unit: 0.11 });
}
function lanternGlow() {
    const v = new Vox(3, 3, 3);
    v.box(0, 0, 0, 2, 2, 2, C.lamp);
    return meshVox(v, { unit: 0.11, ao: 0, jitter: 0 });
}
function plank(k) {
    const v = new Vox(4, 1, 4);
    v.box(0, 0, 0, 3, 0, 3, (x, y, z) => z % 2 ? C.wood3 : hash(z, k) < 0.5 ? C.wood : 0xb98549);
    return meshVox(v, { unit: 0.25, jitter: 0.02, pivot: [2, 1, 2] });
}
function bridgeRail() {
    const v = new Vox(16, 8, 1);
    v.box(0, 0, 0, 1, 7, 0, C.wood2); v.box(14, 0, 0, 15, 7, 0, C.wood2); v.box(0, 6, 0, 15, 7, 0, C.wood3);
    return meshVox(v, { unit: 0.0625, pivot: [8, 0, 0.5] });
}
function signPost(c = C.wood3) {
    const v = new Vox(12, 14, 2);
    v.box(5, 0, 0, 6, 8, 1, C.wood2); v.box(0, 7, 0, 11, 13, 1, c); v.box(1, 8, 0, 10, 12, 0, 0xe6c58f);
    v.box(3, 10, 0, 8, 10, 0, C.beam);
    return meshVox(v, { unit: 0.1 });
}
function penGate() { // a welcome arch at the pen, with a sheep-coloured sign
    const v = new Vox(46, 28, 4);
    v.box(0, 0, 1, 2, 24, 2, C.wood2); v.box(43, 0, 1, 45, 24, 2, C.wood2);
    v.box(0, 22, 0, 45, 25, 3, C.wood);
    v.box(1, 26, 0, 44, 26, 3, C.wood3);
    v.box(10, 18, 3, 35, 26, 3, C.trim);
    v.box(11, 19, 3, 34, 25, 3, 0xe9c98e);
    for (const x of [15, 22, 30]) { v.box(x - 2, 20, 3, x + 2, 24, 3, C.wool); v.box(x - 3, 21, 3, x + 3, 23, 3, C.wool); v.box(x - 1, 20, 3, x + 1, 22, 3, C.face); v.set(x - 1, 22, 3, C.eye); v.set(x + 1, 22, 3, C.eye); }
    return meshVox(v, { unit: 0.12, cull: "-y-z" });
}
function farmhouse() {
    const W = 28, D = 20, v = new Vox(W + 4, 34, D + 6);
    const ox = 2, oz = 3, H = 13;
    const wall = (x, y, z) => { const edge = x === ox || x === ox + W - 1 || z === oz || z === oz + D - 1; return (x - ox) % 9 === 0 && edge ? C.beam : (y === 0 || y === H - 1) ? C.beam : hash(x, y, z) < 0.12 ? C.wall2 : C.wall; };
    v.box(ox - 1, 0, oz - 1, ox + W, 1, oz + D, C.stone);
    v.box(ox, 0, oz, ox + W - 1, H - 1, oz + D - 1, wall);
    for (let i = 0; i <= (D >> 1) + 1; i++) {
        const y = H + i - 1, z0 = oz - 2 + i, z1 = oz + D + 1 - i;
        if (z0 > z1) break;
        const roofc = (x, yy, z) => { const r = hash(x >> 1, yy, z >> 1); return r < 0.2 ? C.roof3 : (r < 0.55 ? C.roof2 : C.roof); };
        v.box(ox - 2, y, z0, ox + W + 1, y, z1, roofc);
        if (i > 0) v.box(ox, y, z0 + 1, ox + W - 1, y, z1 - 1, C.wall);
    }
    // chimney
    v.box(ox + 20, H + 3, oz + 4, ox + 23, H + 12, oz + 7, (x, y) => (y % 2 ? 0xb5563f : 0xcf6d55));
    v.box(ox + 19, H + 12, oz + 3, ox + 24, H + 12, oz + 8, C.stone);
    // door and windows on the front (+z, towards the camera)
    const fz = oz + D;
    v.box(ox + 12, 1, fz, ox + 16, 8, fz, C.door); v.set(ox + 15, 4, fz, C.ring); v.box(ox + 11, 9, fz, ox + 17, 9, fz, C.beam);
    v.box(ox + 11, 0, fz + 1, ox + 17, 0, fz + 2, C.stone3);
    for (const x of [ox + 3, ox + 21]) {
        v.box(x, 4, fz, x + 4, 9, fz, C.trim); v.box(x + 1, 5, fz, x + 3, 8, fz, C.glass); v.set(x + 1, 8, fz, C.glass2); v.box(x + 2, 5, fz, x + 2, 8, fz, C.trim);
        v.box(x - 1, 3, fz + 1, x + 5, 3, fz + 1, C.wood2);
        for (let i = 0; i < 7; i++) v.set(x - 1 + i, 4, fz + 1, i % 2 ? C.bandana : (i % 4 ? 0xf7c948 : C.leaf2));
    }
    return meshVox(v, { unit: 0.25, jitter: 0.015, cull: "-y-z" });
}
function barn() {
    const W = 26, D = 26, v = new Vox(W + 2, 34, D + 2);
    const ox = 1, oz = 1, H = 13;
    v.box(ox, 0, oz, ox + W - 1, H, oz + D - 1, (x, y, z) => (x + z) % 3 === 0 ? C.barn2 : C.barn);
    v.box(ox, 0, oz, ox + W - 1, 0, oz + D - 1, C.stone);
    const prof = [[0, 13], [1, 14], [2, 15], [3, 16], [4, 17], [6, 18], [8, 19], [10, 20], [12, 21]]; // gambrel, half
    for (let x = 0; x < W; x++) {
        const dx = Math.min(x, W - 1 - x); let top = 13;
        for (const [a, h] of prof) if (dx >= a) top = h;
        top = 13 + Math.min(dx * 1.1, 4) + Math.max(0, dx - 4) * 0.55;
        top = Math.round(top);
        v.box(ox + x, 13, oz, ox + x, top - 1, oz + D - 1, (xx, y, z) => (z === oz || z === oz + D - 1) ? (xx + z) % 3 === 0 ? C.barn2 : C.barn : C.barn);
        v.box(ox + x, top, oz - 1, ox + x, top + 1, oz + D, (xx, y, z) => hash(xx >> 1, y, z >> 1) < 0.4 ? 0x7b8a90 : 0x93a1a6);
    }
    const fz = oz + D - 1;
    // big X doors in white trim
    v.box(ox + 7, 0, fz + 1, ox + 18, 10, fz + 1, C.trim);
    v.box(ox + 8, 1, fz + 1, ox + 12, 9, fz + 1, C.barn2); v.box(ox + 13, 1, fz + 1, ox + 17, 9, fz + 1, C.barn2);
    for (let i = 0; i < 9; i++) { v.set(ox + 8 + i * 4 / 8, 1 + i, fz + 1, C.trim); v.set(ox + 12 - i * 4 / 8, 1 + i, fz + 1, C.trim); v.set(ox + 13 + i * 4 / 8, 1 + i, fz + 1, C.trim); v.set(ox + 17 - i * 4 / 8, 1 + i, fz + 1, C.trim); }
    // hay loft
    v.box(ox + 10, 14, fz + 1, ox + 15, 19, fz + 1, C.trim); v.box(ox + 11, 15, fz + 1, ox + 14, 18, fz + 1, C.hay); v.box(ox + 11, 15, fz + 1, ox + 14, 15, fz + 1, C.hay2);
    return meshVox(v, { unit: 0.25, jitter: 0.015, cull: "-y-z" });
}
function windmill() {
    const v = new Vox(20, 48, 20);
    for (let y = 0; y < 36; y++) {
        const r = 9 - y * 0.12;
        for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) if (Math.hypot(x - 9.5, z - 9.5) < r) v.set(x, y, z, y < 4 ? C.stone : hash(x, y >> 1, z) < 0.1 ? C.wall2 : C.wall);
    }
    for (let y = 36; y < 46; y++) {
        const r = (46 - y) * 0.75;
        for (let z = 0; z < 20; z++) for (let x = 0; x < 20; x++) if (Math.hypot(x - 9.5, z - 9.5) < r) v.set(x, y, z, y % 2 ? C.roof : C.roof2);
    }
    v.box(8, 1, 18, 11, 8, 19, C.door); v.box(8, 22, 18, 11, 25, 19, C.glass);
    return meshVox(v, { unit: 0.25, jitter: 0.015, cull: "-y-z" });
}
function millBlades() {
    const v = new Vox(45, 45, 3), c = 22;
    v.box(c - 1, c - 1, 0, c + 1, c + 1, 2, C.wood2);
    for (let i = 3; i < 22; i++) {
        v.box(c - i - 0, c, 1, c - i, c, 1, C.wood2); v.box(c + i, c, 1, c + i, c, 1, C.wood2); v.box(c, c - i, 1, c, c - i, 1, C.wood2); v.box(c, c + i, 1, c, c + i, 1, C.wood2);
        if (i > 6) {
            const k = i % 3 === 0 ? C.wood3 : C.trim;
            v.box(c + i, c + 1, 1, c + i, c + 5, 1, k); v.box(c - i, c - 5, 1, c - i, c - 1, 1, k);
            v.box(c - 5, c + i, 1, c - 1, c + i, 1, k); v.box(c + 1, c - i, 1, c + 5, c - i, 1, k);
        }
    }
    return meshVox(v, { unit: 0.2, pivot: [22.5, 22.5, 1.5], jitter: 0.01, ao: 0.3 });
}
function cloud(k) {
    const v = new Vox(30, 10, 18);
    const p = (x, y) => y < 3 ? C.cloud2 : C.cloud;
    const blobs = k ? [[9, 4, 9, 7, 4, 6], [18, 5, 9, 8, 5, 7], [24, 3, 10, 5, 3, 4]] : [[8, 4, 8, 6, 4, 5], [15, 5, 9, 7, 5, 7], [22, 3, 8, 6, 3, 5]];
    for (const [x, y, z, rx, ry, rz] of blobs) v.ball(x, y, z, rx, ry, rz, p);
    return meshVox(v, { unit: 0.5, jitter: 0, ao: 0.6, flatAO: true, cull: "-y-z" });
}

export const parts = {};
/** Scenery kept as raw arrays for stamping; characters registered with assets.mesh(). */
export const props = {};

export function buildModels(game) {
    const reg = (name, m) => { game.assets.mesh(name, toGeometry(m)); parts[name] = m; };
    const L = (a, b, c, d) => [a, b, c, d];
    const sheepFrames = {
        stand: { legs: L(0, 0, 0, 0) }, a: { legs: L(2, 0, 0, 2) }, b: { legs: L(0, 2, 2, 0) },
        pa: { legs: L(3, 0, 0, 3), pose: "panic" }, pb: { legs: L(0, 3, 3, 0), pose: "panic" }, graze: { legs: L(0, 0, 0, 0), pose: "graze" }, fly: { legs: L(2, 2, 2, 2), pose: "fly" },
    };
    for (const [k, o] of Object.entries(sheepFrames)) {
        reg(`sheep_${k}`, meshVox(sheepVox(o), { unit: 0.074, pivot: [7.5, 0, 10], jitter: 0.015, flatAO: true }));
        reg(`blk_${k}`, meshVox(sheepVox({ ...o, dark: true }), { unit: 0.074, pivot: [7.5, 0, 10], jitter: 0.015, flatAO: true }));
        reg(`ram_${k}`, meshVox(ramVox(o), { unit: 0.086, pivot: [7.5, 0, 10], jitter: 0.015, flatAO: true }));
    }
    reg("dog_body", dogBody()); reg("dog_ear", dogEar()); reg("dog_tail", dogTail()); reg("dog_legf", dogLeg(true)); reg("dog_legb", dogLeg(false));
    for (let i = 0; i < 4; i++) reg(`dog_head${i}`, dogHead(i));
    reg("wolf_0", wolfVox([0, 0, 0, 0], false)); reg("wolf_1", wolfVox([3, 0, 0, 3], false)); reg("wolf_2", wolfVox([0, 3, 3, 0], true)); reg("wolf_eyes", wolfEyes());
    reg("bull_0", bullVox([0, 0, 0, 0], false)); reg("bull_1", bullVox([3, 0, 0, 3], true)); reg("bull_2", bullVox([0, 3, 3, 0], true)); reg("bull_3", bullVox([0, 0, 0, 0], true));
    reg("hen_0", chickenVox(false)); reg("hen_1", chickenVox(true));
    reg("blades", millBlades()); reg("cloud_0", cloud(0)); reg("cloud_1", cloud(1)); reg("glow", lanternGlow()); reg("weak", weakFence());

    Object.assign(props, {
        oak: oak(0), apple: oak(1), cherry: oak(2), pine: pine(), pinel: pine(true), bush: bush(0), bushp: bush(1), bushb: bush(2), hedge: hedgeBlock(),
        hayr: hayRound(), hays: haySquare(), rock0: rock(0), rock1: rock(1), post: fencePost(false), arm: fenceArm(false), wpost: fencePost(true), warm: fenceArm(true),
        wall0: wallPiece(1), wall1: wallPiece(2), wall2: wallPiece(3), pumpkin: pumpkin(), cabbage: cabbage(), tuft: tuft(), mushroom: mushroom(), log: log(),
        fl0: flower(0xffe24d, 0xf08a24), fl1: flower(0xff7a90, 0xffe24d), fl2: flower(0xffffff, 0xffd447), fl3: flower(0xa98bff, 0xffe24d),
        well: well(), scarecrow: scarecrow(), cart: cart(), lantern: lantern(), plank0: plank(1), plank1: plank(2), rail: bridgeRail(), sign: signPost(), gate: penGate(),
        farmhouse: farmhouse(), barn: barn(), windmill: windmill(),
    });
}
