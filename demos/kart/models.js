// Every moving thing in the game: the cart, its six riders, produce, hazards, prizes. All low-poly, vertex-coloured.
import { MB, hex, mix, mul } from "./meshkit.js";

const C = {
    ink: hex("#2b2140"), skin: hex("#f6c9a0"), skin2: hex("#b97a50"), white: hex("#fff6e6"), steel: hex("#c9d4e3"),
    red: hex("#ff4b3e"), yellow: hex("#ffc233"), mint: hex("#2ec4a6"), sky: hex("#38b6ff"), grape: hex("#7b4dff"), pink: hex("#ff5fa2"),
    orange: hex("#ff8a1f"), brown: hex("#8a4b2a"), green: hex("#3fae49"), dark: hex("#3a3550"), lime: hex("#b4e33d"),
};

function bar(mb, a, b, t, col) {
    // a square tube from a to b
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz);
    const f = [dx / l, dy / l, dz / l];
    let up = Math.abs(f[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const r = [f[1] * up[2] - f[2] * up[1], f[2] * up[0] - f[0] * up[2], f[0] * up[1] - f[1] * up[0]];
    const rl = Math.hypot(...r); r[0] /= rl; r[1] /= rl; r[2] /= rl;
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const c = (p, s, w) => [p[0] + r[0] * s * t + u[0] * w * t, p[1] + r[1] * s * t + u[1] * w * t, p[2] + r[2] * s * t + u[2] * w * t];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
        const p = corners[i], q = corners[(i + 1) % 4];
        mb.quad(c(a, p[0], p[1]), c(b, p[0], p[1]), c(b, q[0], q[1]), c(a, q[0], q[1]), col);
    }
}

/** The shopping cart. Mostly white so each racer's colour can tint it; nose is -z, y 0 is the road. */
export function cartMesh() {
    const mb = new MB(), w = C.white, g = mul(C.white, 0.72), t = 0.042;
    const bx = 0.62, tx = 0.86, by = 0.62, ty = 1.46, f = -1.28, b = 1.1;      // basket: bottom half-width, top half-width, heights, ends
    const fb = -1.0, fy = ty;                                                  // the nose leans in at the bottom
    // floor plate and undercarriage
    mb.quad([-bx, by, b - 0.1], [bx, by, b - 0.1], [bx, by, fb], [-bx, by, fb], mul(C.white, 0.5));
    mb.box(0, 0.26, 0, 1.2, 0.09, 2.3, g);
    bar(mb, [-0.62, 0.3, 1.0], [-0.62, by, 1.0], 0.05, w); bar(mb, [0.62, 0.3, 1.0], [0.62, by, 1.0], 0.05, w);
    bar(mb, [-0.5, 0.3, -1.0], [-0.55, by, -0.95], 0.05, w); bar(mb, [0.5, 0.3, -1.0], [0.55, by, -0.95], 0.05, w);
    // rim
    const R = [[-tx, ty, f], [tx, ty, f], [tx, ty, b], [-tx, ty, b]], L = [[-bx, by, fb], [bx, by, fb], [bx, by, b], [-bx, by, b]];
    for (let i = 0; i < 4; i++) { bar(mb, R[i], R[(i + 1) % 4], 0.06, w); bar(mb, L[i], L[(i + 1) % 4], t, g); }
    const lerp3 = (a, c, k) => [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k];
    // uprights and mid rails around the four sides
    const sides = [[0, 6], [1, 4], [2, 6], [3, 4]];
    for (const [s, n] of sides) {
        const a0 = L[s], a1 = L[(s + 1) % 4], b0 = R[s], b1 = R[(s + 1) % 4];
        for (let k = 1; k < n; k++) bar(mb, lerp3(a0, a1, k / n), lerp3(b0, b1, k / n), t * 0.8, g);
        bar(mb, lerp3(a0, b0, 0.5), lerp3(a1, b1, 0.5), t * 0.8, g);
    }
    // handle, with a coloured grip
    bar(mb, [-tx, ty, b], [-0.74, 1.72, b + 0.34], 0.05, w);
    bar(mb, [tx, ty, b], [0.74, 1.72, b + 0.34], 0.05, w);
    bar(mb, [-0.8, 1.74, b + 0.36], [0.8, 1.74, b + 0.36], 0.085, w);
    // bumper
    mb.box(0, 0.34, -1.2, 1.36, 0.22, 0.14, w, { shade: 0.9 });
    return mb;
}

export function wheelMesh() {
    const mb = new MB();
    mb.cylX(0, 0, 0, 0.24, 0.17, 8, mul(C.ink, 1.1), { cap: C.steel });
    mb.cylX(0, 0, 0, 0.1, 0.2, 5, hex("#ffc233"), { cap: hex("#ffc233") });
    return mb;
}

const head = (mb, x, y, z, r, col) => mb.ball(x, y, z, r, 8, 5, col, { sy: 1.02 });
function arms(mb, col, hand, y = 1.3, wide = 0.34) {
    bar(mb, [-wide, y, 0.05], [-0.62, 1.42, -0.86], 0.075, col);
    bar(mb, [wide, y, 0.05], [0.62, 1.42, -0.86], 0.075, col);
    mb.ball(-0.62, 1.44, -0.9, 0.11, 6, 3, hand);
    mb.ball(0.62, 1.44, -0.9, 0.11, 6, 3, hand);
}
function eyes(mb, x, y, z, gap = 0.1) {
    mb.ball(x - gap, y, z, 0.055, 5, 3, C.ink, { shade: false });
    mb.ball(x + gap, y, z, 0.055, 5, 3, C.ink, { shade: false });
}

const RIDERS = {
    // Stock clerk kid: backwards cap, red apron.
    pip(mb) {
        mb.box(0, 0.62, 0.1, 0.62, 0.86, 0.46, C.sky, { taper: 0.86 });
        mb.box(0, 0.76, 0.1, 0.68, 0.56, 0.5, C.red, { taper: 0.9 });
        bar(mb, [-0.14, 1.42, 0.36], [0.14, 1.0, 0.36], 0.03, C.white); bar(mb, [0.14, 1.42, 0.36], [-0.14, 1.0, 0.36], 0.03, C.white);
        arms(mb, C.sky, C.skin, 1.28);
        head(mb, 0, 1.76, 0.1, 0.36, C.skin);
        mb.ball(0, 1.86, 0.1, 0.375, 8, 3, C.yellow, { sy: 0.8 });
        mb.box(0, 1.8, 0.56, 0.44, 0.07, 0.34, C.red);
        eyes(mb, 0, 1.78, -0.25);
    },
    // Grandmother with a towering lilac bun and a pink cardigan.
    nan(mb) {
        mb.box(0, 0.62, 0.1, 0.74, 0.8, 0.54, C.pink, { taper: 0.82 });
        arms(mb, C.pink, C.skin, 1.26);
        head(mb, 0, 1.68, 0.08, 0.34, C.skin);
        mb.ball(0, 1.78, 0.14, 0.38, 8, 4, hex("#d5c6ff"), { sy: 0.86 });
        mb.ball(0, 2.22, 0.24, 0.24, 7, 4, hex("#d5c6ff"));
        mb.cylX(0, 2.26, 0.24, 0.05, 0.62, 4, C.yellow);
        mb.box(0, 1.1, 0.42, 0.6, 0.08, 0.08, C.white);
        eyes(mb, 0, 1.7, -0.24);
    },
    // A tidy cleaning robot with a mop head for hair.
    mop(mb) {
        mb.box(0, 0.62, 0.1, 0.66, 0.76, 0.56, C.mint, { taper: 0.92 });
        mb.box(0, 1.0, 0.39, 0.34, 0.26, 0.04, C.yellow, { shade: 1 });
        arms(mb, C.steel, C.steel, 1.22);
        mb.box(0, 1.42, 0.1, 0.62, 0.5, 0.56, C.steel);
        mb.box(0, 1.5, -0.2, 0.46, 0.2, 0.06, C.ink, { shade: 1 });
        mb.box(-0.12, 1.56, -0.235, 0.08, 0.08, 0.02, hex("#7df9ff"), { shade: 1 });
        mb.box(0.12, 1.56, -0.235, 0.08, 0.08, 0.02, hex("#7df9ff"), { shade: 1 });
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2, r = 0.33;
            bar(mb, [Math.cos(a) * 0.14, 2.02, 0.1 + Math.sin(a) * 0.14], [Math.cos(a) * r, 1.72 - (i % 3) * 0.1, 0.1 + Math.sin(a) * r], 0.06, C.white);
        }
        mb.cyl(0, 1.92, 0.1, 0.2, 0.2, 7, C.grape);
    },
    // A penguin with a long red scarf.
    kiki(mb) {
        mb.ball(0, 1.14, 0.08, 0.5, 8, 6, C.ink, { sy: 1.1 });
        mb.ball(0, 1.05, -0.13, 0.36, 7, 4, C.white);
        arms(mb, C.ink, C.ink, 1.3, 0.38);
        head(mb, 0, 1.76, 0.08, 0.33, C.ink);
        mb.ball(0, 1.71, -0.14, 0.2, 6, 3, C.white);
        mb.cyl(0, 1.5, 0.08, 0.38, 0.12, 8, C.red);
        bar(mb, [0.18, 1.56, 0.4], [0.3, 1.16, 0.64], 0.09, C.red);
        bar(mb, [0.3, 1.16, 0.64], [0.2, 0.9, 0.92], 0.09, C.yellow);
        mb.at(0, 1.74, -0.36, 0); mb.cylZ(0, 0, 0, 0.1, 0.24, 5, C.orange, { r2: 0.1 }); mb.reset();
        eyes(mb, 0, 1.84, -0.28, 0.13);
    },
    // Baker with a soufflé of a hat.
    crumb(mb) {
        mb.box(0, 0.62, 0.1, 0.86, 0.84, 0.62, C.white, { taper: 0.84, shade: 0.75 });
        for (const y of [0.9, 1.15]) { mb.ball(-0.1, y, -0.22, 0.05, 5, 3, C.red); mb.ball(0.1, y, -0.22, 0.05, 5, 3, C.red); }
        mb.box(0, 1.36, 0.1, 0.8, 0.12, 0.6, C.red);
        arms(mb, C.white, C.skin2, 1.28, 0.38);
        head(mb, 0, 1.76, 0.08, 0.35, C.skin2);
        mb.box(0, 1.6, -0.27, 0.4, 0.08, 0.08, C.ink, { shade: 1 });
        mb.cyl(0, 1.98, 0.08, 0.34, 0.26, 8, C.white, { r2: 0.42 });
        mb.ball(0, 2.34, 0.08, 0.44, 8, 4, C.white, { sy: 0.62 });
        eyes(mb, 0, 1.8, -0.26);
    },
    // Forklift driver the size of a fridge.
    stan(mb) {
        mb.box(0, 0.62, 0.12, 1.04, 0.96, 0.7, C.orange, { taper: 0.92 });
        mb.box(0, 0.92, 0.12, 1.06, 0.12, 0.72, hex("#fff27a"), { shade: 1 });
        mb.box(0, 1.2, 0.12, 1.02, 0.12, 0.71, hex("#fff27a"), { shade: 1 });
        arms(mb, C.orange, C.skin, 1.4, 0.5);
        head(mb, 0, 1.92, 0.08, 0.36, C.skin);
        mb.ball(0, 2.04, 0.08, 0.4, 8, 3, C.yellow, { sy: 0.8 });
        mb.box(0, 2.0, -0.3, 0.8, 0.06, 0.26, C.yellow);
        eyes(mb, 0, 1.96, -0.28);
    },
};
export const riderMesh = (id) => { const mb = new MB(); RIDERS[id](mb); return mb; };

// --- Produce and prizes ---------------------------------------------------------------------------------------
export function bananaMesh() {
    const mb = new MB(), y = hex("#ffd93b"), d = hex("#c98f1a");
    for (let i = 0; i < 6; i++) {
        const a0 = (i - 3) * 0.38, a1 = (i - 2) * 0.38, R = 0.95, cy = 1.25;
        const r0 = 0.1 + 0.2 * Math.sin((i) / 6 * Math.PI), r1 = 0.1 + 0.2 * Math.sin((i + 1) / 6 * Math.PI);
        const P = (a, r, q) => [Math.sin(a) * (R + r * Math.cos(q)), cy - Math.cos(a) * (R + r * Math.cos(q)), r * Math.sin(q)];
        for (let k = 0; k < 5; k++) {
            const q0 = k / 5 * Math.PI * 2, q1 = (k + 1) / 5 * Math.PI * 2;
            mb.quad(P(a0, r0, q0), P(a1, r1, q0), P(a1, r1, q1), P(a0, r0, q1), k < 2 ? y : mul(y, 0.86));
        }
    }
    mb.ball(Math.sin(1.14) * 0.95, 1.25 - Math.cos(1.14) * 0.95, 0, 0.12, 4, 3, d);
    mb.ball(-Math.sin(1.14) * 0.95, 1.25 - Math.cos(1.14) * 0.95, 0, 0.12, 4, 3, d);
    return mb;
}
export function melonMesh() {
    const mb = new MB();
    mb.ball(0, 0, 0, 0.8, 9, 6, hex("#ffa63d"), { col2: hex("#e87a14"), bands: 3, shade: false });
    mb.cyl(0, 0.75, 0, 0.09, 0.2, 5, C.green);
    return mb;
}
export function watermelonMesh() {
    const mb = new MB();
    mb.ball(0, 0, 0, 1.05, 10, 7, hex("#35b24a"), { col2: hex("#106b33"), bands: 2, shade: false, sz: 1.08 });
    return mb;
}
export function baguetteMesh() {
    const mb = new MB(), c = hex("#e9ad5b"), d = hex("#c9812e");
    mb.cylZ(0, 0, 0, 0.17, 1.5, 6, c, { cap: d, r2: 0.09 });
    mb.cylZ(0, 0, -0.7, 0.09, 0.1, 6, d);
    for (let i = 0; i < 3; i++) mb.at(0, 0.15, -0.35 + i * 0.35, 0.5).box(0, 0, 0, 0.22, 0.03, 0.08, hex("#fff0c9"), { shade: 1 });
    mb.reset();
    return mb;
}
export function canMesh() {
    const mb = new MB();
    mb.cyl(0, -0.45, 0, 0.3, 0.9, 8, hex("#27e1a0"), { top: C.steel, shade: 0.8 });
    mb.cyl(0, -0.1, 0, 0.308, 0.3, 8, hex("#ff2f7a"), { cap: false, shade: 1 });
    return mb;
}
/** The prize crate: a bright, spinning cube with a question mark on each face. */
export function crateMesh() {
    const mb = new MB(), s = 0.82, gold = hex("#ffd34d"), ink = hex("#2b2140");
    mb.box(0, -s, 0, s * 2, s * 2, s * 2, [1.15, 1.15, 1.15], { shade: 1 });
    const faces = [[[0, 0, 1], [1, 0, 0]], [[0, 0, -1], [-1, 0, 0]], [[1, 0, 0], [0, 0, -1]], [[-1, 0, 0], [0, 0, 1]]];
    for (const [n, u] of faces) mb.text("?", [n[0] * (s + 0.01), 0, n[2] * (s + 0.01)], u, [0, 1, 0], 1.05, ink);
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mb.box(x * s, -s, z * s, 0.2, s * 2, 0.2, gold, { shade: 1 });
    return mb;
}
export function flameMesh() {
    const mb = new MB();
    mb.tri([0, 0.3, 0], [-0.3, 0, 0], [0, 0, 1.6], [1.6, 1.3, 0.5], [1.6, 1.3, 0.5], [1, 0.35, 0.1]);
    mb.tri([0.3, 0, 0], [0, 0.3, 0], [0, 0, 1.6], [1.6, 1.3, 0.5], [1.6, 1.3, 0.5], [1, 0.35, 0.1]);
    mb.tri([0, -0.3, 0], [0.3, 0, 0], [0, 0, 1.6], [1.6, 1.3, 0.5], [1.6, 1.3, 0.5], [1, 0.35, 0.1]);
    mb.tri([-0.3, 0, 0], [0, -0.3, 0], [0, 0, 1.6], [1.6, 1.3, 0.5], [1.6, 1.3, 0.5], [1, 0.35, 0.1]);
    return mb;
}

// --- Smashable props and moving hazards -------------------------------------------------------------------------
export function coneMesh() {
    const mb = new MB();
    mb.box(0, 0, 0, 1.3, 0.12, 1.3, hex("#ff7a1f"));
    mb.cyl(0, 0.12, 0, 0.5, 1.5, 6, hex("#ff7a1f"), { r2: 0.07 });
    mb.cyl(0, 0.62, 0, 0.36, 0.34, 6, C.white, { r2: 0.27, cap: false, shade: 1 });
    return mb;
}
export function boxMesh() {
    const mb = new MB(), k = hex("#d9a066");
    mb.box(0, 0, 0, 1.7, 1.3, 1.7, k, { shade: 0.85 });
    mb.box(0, 1.3, 0, 1.72, 0.03, 0.3, hex("#f3e0b5"), { shade: 1 });
    mb.at(0.4, 1.33, -0.2, 0.5).box(0, 0, 0, 1.3, 1.1, 1.3, hex("#c88d52"), { shade: 0.85 });
    mb.reset();
    return mb;
}
export function cansMesh() {
    const mb = new MB(), a = C.red, b = C.yellow;
    const can = (x, y, z, c) => { mb.cyl(x, y, z, 0.42, 0.92, 7, c, { top: C.steel }); mb.cyl(x, y + 0.28, z, 0.43, 0.3, 7, C.white, { cap: false, shade: 1 }); };
    for (const [x, z] of [[-0.46, 0.26], [0.46, 0.26], [0, -0.5]]) can(x, 0, z, a);
    can(0, 0.92, 0, b);
    return mb;
}
export function pinMesh() {
    const mb = new MB(), w = hex("#e7b777"), h = hex("#a9652f");
    mb.cylX(0, 0.72, 0, 0.72, 5.2, 8, w, { cap: h });
    mb.cylX(-3.2, 0.72, 0, 0.26, 1.3, 6, h);
    mb.cylX(3.2, 0.72, 0, 0.26, 1.3, 6, h);
    return mb;
}
export function forkliftMesh() {
    const mb = new MB(), y = C.yellow, k = C.ink, g = hex("#59566e");
    mb.box(0, 0.5, 0, 2.6, 1.0, 3.6, y);
    mb.box(0, 0.55, 1.4, 2.3, 1.6, 1.0, y, { taper: 0.9 });
    for (const [x, z] of [[-1.25, -1.2], [1.25, -1.2], [-1.25, 1.2], [1.25, 1.2]]) mb.at(x, 0.55, z, 0).cylX(0, 0, 0, 0.55, 0.4, 8, k, { cap: g });
    mb.reset();
    for (const [x, z] of [[-1.1, 1.0], [1.1, 1.0], [-1.1, -0.5], [1.1, -0.5]]) mb.box(x, 1.5, z, 0.14, 2.2, 0.14, k);
    mb.box(0, 3.7, 0.25, 2.5, 0.12, 2.0, k);
    mb.box(-0.7, 0.2, -3.2, 0.14, 2.8, 0.14, g); mb.box(0.7, 0.2, -3.2, 0.14, 2.8, 0.14, g);
    mb.box(-0.7, 0.2, -3.9, 0.26, 0.12, 2.0, g); mb.box(0.7, 0.2, -3.9, 0.26, 0.12, 2.0, g);
    mb.ball(0, 3.95, 0.25, 0.16, 5, 3, [1.8, 0.8, 0.2], { shade: false });
    return mb;
}
export function iceBlockMesh() {
    const mb = new MB(), a = hex("#bfeeff");
    mb.box(0, 0, 0, 3.6, 3.0, 3.6, a, { top: hex("#ffffff"), shade: 0.82 });
    mb.ball(0, 1.5, 0, 0.9, 6, 3, hex("#ff5fa2"), { sz: 0.5, shade: false });
    return mb;
}
export function boostPadMesh() {
    // A checkout conveyor: three chevrons laid flat, nose towards -z. Unit is one pad.
    const mb = new MB();
    for (let i = 0; i < 3; i++) {
        const z = 1 - i * 1.0;
        mb.quad([-1, 0, z], [0, 0, z - 0.5], [0, 0, z - 1.0 + 0.1], [-1, 0, z - 0.4], [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]);
        mb.quad([0, 0, z - 0.5], [1, 0, z], [1, 0, z - 0.4], [0, 0, z - 1.0 + 0.1], [1, 1, 1], [1, 1, 1], [1, 1, 1], [1, 1, 1]);
    }
    return mb;
}

export function registerModels(game, racers) {
    const a = game.assets;
    cartMesh().register(a, "cart");
    wheelMesh().register(a, "wheel");
    for (const r of racers) riderMesh(r.id).register(a, `rider_${r.id}`);
    bananaMesh().register(a, "banana");
    melonMesh().register(a, "melon");
    watermelonMesh().register(a, "watermelon");
    baguetteMesh().register(a, "baguette");
    canMesh().register(a, "can");
    crateMesh().register(a, "crate");
    flameMesh().register(a, "flame");
    coneMesh().register(a, "prop_cone");
    boxMesh().register(a, "prop_box");
    cansMesh().register(a, "prop_cans");
    pinMesh().register(a, "hz_pin");
    forkliftMesh().register(a, "hz_forklift");
    iceBlockMesh().register(a, "hz_ice");
    boostPadMesh().register(a, "boostpad");
}
