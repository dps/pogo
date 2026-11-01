// The six worlds as merged slices of road. Each slice is one mesh and one draw call: ground, road and everything
// beside it, with soft shadows baked in as darker ground. Slices share their border heights so any two can join.
import { MB, hex, mul, mix } from "./meshkit.js";
import { makeRng } from "./chunks.js";
import { BIOMES } from "./data.js";

export const SLICE = 14;
export const VARIANTS = 6;
const C = hex;
const WHITE = C("#ffffff"), DARK = C("#35303c"), RED = C("#e8432e"), CREAM = C("#fff1d6"), YEL = C("#ffc933"), STEEL = C("#b8c2cc");
const GLASS = C("#8fdcec"), WOOD = C("#b97a3f"), TYRE = C("#2c2a33");

const LOOK = {
    farm: { grass: C("#92d14c"), grass2: C("#7cc043"), far: C("#a7dc62"), road: C("#dcae66"), road2: C("#cc9a55"), verge: C("#6fb13c"), amp: 7 },
    village: { grass: C("#a4d456"), grass2: C("#8cc74a"), far: C("#b6df6e"), road: C("#bfae95"), road2: C("#ad9c82"), verge: C("#e6d8bf"), amp: 5 },
    motorway: { grass: C("#b4cf5e"), grass2: C("#a3c455"), far: C("#c5d979"), road: C("#54525f"), road2: C("#494753"), verge: C("#8d8c96"), amp: 8 },
    airport: { grass: C("#bcd878"), grass2: C("#add06c"), far: C("#cfe394"), road: C("#c8ccd4"), road2: C("#bcc1ca"), verge: C("#a6acb7"), amp: 1.5 },
    ski: { grass: C("#f6fbff"), grass2: C("#e6f1fb"), far: C("#ffffff"), road: C("#e4eef9"), road2: C("#d5e3f3"), verge: C("#c7daee"), amp: 16 },
    launch: { grass: C("#e6b37a"), grass2: C("#d9a069"), far: C("#efc28d"), road: C("#a8abb4"), road2: C("#989ba6"), verge: C("#6f7280"), amp: 4 },
};

const XS = [4.2, 6.5, 10, 15, 22, 31, 44, 66];
const hill = (x, amp) => { const t = Math.max(0, (Math.abs(x) - 15) / 51); return amp * t * t * (3 - 2 * t); };
const groundAt = (x, b) => hill(x, LOOK[b].amp);

/** Facets of rolling ground either side of the road. The middle rows wander; the borders never do. */
function ground(m, b, rng) {
    const k = LOOK[b], L = SLICE, zs = [-L / 2, -L / 6, L / 6, L / 2];
    for (const s of [-1, 1]) {
        const J = XS.map((x, i) => zs.map((_, r) => (r === 0 || r === 3 || i < 3 ? 0 : (rng.next() - 0.5) * (i * 0.32) * (k.amp > 3 ? 1 : 0.3))));
        for (let i = 0; i < XS.length - 1; i++) for (let r = 0; r < 3; r++) {
            const x0 = XS[i] * s, x1 = XS[i + 1] * s;
            const lap0 = r === 0 ? -0.08 - XS[i] * 0.02 : 0, lap1 = r === 2 ? 0.08 + XS[i] * 0.02 : 0, lap2 = r === 0 ? -0.08 - XS[i + 1] * 0.02 : 0, lap3 = r === 2 ? 0.08 + XS[i + 1] * 0.02 : 0;
            const P = (x, z, j) => [x, hill(x, k.amp) + j, z];
            const a = P(x0, zs[r + 1] + lap1, J[i][r + 1]), bb = P(x1, zs[r + 1] + lap3, J[i + 1][r + 1]), c = P(x1, zs[r] + lap2, J[i + 1][r]), d = P(x0, zs[r] + lap0, J[i][r]);
            const tone = mix(mix(k.grass, k.grass2, rng.next()), k.far, i / XS.length);
            const tone2 = mul(tone, 0.97 + rng.next() * 0.05);
            if (s > 0) { m.tri(a, bb, c, tone); m.tri(a, c, d, tone2); }
            else { m.tri(bb, a, d, tone); m.tri(bb, d, c, tone2); }
        }
    }
}
function strip(m, x0, x1, col, y = 0.0, lap = 0.06) {
    const L = SLICE / 2 + lap;
    m.quad([x0, y, L], [x1, y, L], [x1, y, -L], [x0, y, -L], col);
}
function dash(m, x, w, col, n = 2, frac = 0.5, y = 0.015) {
    const len = SLICE / n;
    for (let i = 0; i < n; i++) { const z = -SLICE / 2 + (i + 0.5) * len, h = len * frac / 2; m.quad([x - w, y, z + h], [x + w, y, z + h], [x + w, y, z - h], [x - w, y, z - h], col); }
}
function pave(m, b) {
    const k = LOOK[b];
    strip(m, -4.2, 4.2, k.verge);
    strip(m, -3.72, 3.72, k.road, 0.008);
    // Each lane carries a quieter centre strip, so lanes read even at a glance.
    for (const x of [-2.4, 0, 2.4]) strip(m, x - 0.82, x + 0.82, k.road2, 0.012);
}
/** A flat, baked shadow. */
function blob(m, x, z, rx, rz, col, y = 0.03) {
    const n = 8; const p = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([x + Math.cos(a) * rx, y, z + Math.sin(a) * rz]); }
    for (let i = 1; i < n - 1; i++) m.tri(p[0], p[i + 1], p[i], col);
}

// --- Things -----------------------------------------------------------------------------------
function tree(m, x, z, s, b, tone, rng) {
    const y = groundAt(x, b), shade = mul(mix(LOOK[b].grass, LOOK[b].grass2, 0.5), 0.72);
    blob(m, x + s * 0.8, z - s * 0.5, s * 1.5, s * 1.1, shade, y + 0.03);
    m.cyl(x, y, z, 0.24 * s, 1.6 * s, 6, C("#8a5a33"));
    m.ball(x, y + 2.6 * s, z, 1.5 * s, 7, 4, tone, { sy: 1.05 });
    m.ball(x + 0.8 * s, y + 2 * s, z + 0.3 * s, 0.9 * s, 6, 3, mul(tone, 1.1));
    m.ball(x - 0.7 * s, y + 2.1 * s, z - 0.3 * s, 1 * s, 6, 3, mul(tone, 0.92));
}
function poplar(m, x, z, s, b, tone) { const y = groundAt(x, b); m.cyl(x, y, z, 0.2 * s, 1 * s, 5, C("#7a4e2d")); m.cyl(x, y + 0.7 * s, z, 0.85 * s, 5 * s, 7, tone, { r2: 0.06 * s, shade: 0.7 }); }
function pine(m, x, z, s, b) {
    const y = groundAt(x, b); m.cyl(x, y, z, 0.2 * s, 0.6 * s, 5, C("#6b4628"));
    for (const [ty, r, h, c] of [[0.4, 1.3, 1.7, "#2f8a72"], [1.4, 1, 1.5, "#369b80"], [2.3, 0.72, 1.4, "#42b091"]]) { m.cyl(x, y + ty * s, z, r * s, h * s, 7, C(c), { r2: 0, shade: 0.6 }); m.cyl(x, y + (ty + h * 0.55) * s, z, r * 0.45 * s, h * 0.45 * s, 7, mix(C(c), WHITE, 0.85), { r2: 0, shade: 0.92 }); }
}
function fence(m, x, b, col = C("#fff3da")) {
    for (const z of [-5.25, -1.75, 1.75, 5.25]) m.box(x, 0, z, 0.2, 1.1, 0.2, col, { shade: 0.86 });
    for (const y of [0.45, 0.85]) m.box(x, y, 0, 0.09, 0.14, SLICE, col, { noBack: true, shade: 0.9 });
}
function hedge(m, x, b, col) { m.box(x, 0, 0, 1, 1.3, SLICE + 0.1, col, { noBack: true, shade: 0.7, taperX: 0.8 }); }
function barn(m, x, z, s, yaw) {
    m.at(x, 0, z, yaw, s);
    const red = C("#d8432f"), roof = C("#7d4a3a");
    m.box(0, 0, 0, 7, 3.6, 5, red, { shade: 0.74 });
    m.quad([-3.5, 3.6, 2.5], [3.5, 3.6, 2.5], [3.5, 3.6, 2.5], [0, 6.2, 2.5], red);
    m.tri([-3.5, 3.6, 2.5], [3.5, 3.6, 2.5], [0, 6.2, 2.5], mul(red, 1.05));
    m.quad([3.8, 3.4, 2.7], [3.8, 3.4, -2.7], [0, 6.4, -2.7], [0, 6.4, 2.7], roof);
    m.quad([0, 6.4, 2.7], [0, 6.4, -2.7], [-3.8, 3.4, -2.7], [-3.8, 3.4, 2.7], mul(roof, 1.1));
    m.box(0, 0, 2.52, 2.8, 2.8, 0.05, CREAM);
    m.box(0, 0.15, 2.56, 2.5, 2.5, 0.05, mul(red, 0.85));
    m.box(0, 3.5, 2.56, 1.2, 1, 0.05, DARK);
    m.reset();
}
function silo(m, x, z, s) { m.cyl(x, 0, z, 1.5 * s, 7 * s, 9, C("#d4dbe2"), { shade: 0.76 }); m.cyl(x, 7 * s, z, 1.5 * s, 1.5 * s, 9, RED, { r2: 0.1, shade: 0.8 }); for (let i = 1; i < 4; i++) m.cyl(x, i * 1.8 * s, z, 1.53 * s, 0.1, 9, STEEL, { cap: false }); }
function windmill(m, x, z, s) {
    m.cyl(x, 0, z, 2 * s, 7 * s, 8, C("#f5e8d0"), { r2: 1.3 * s, shade: 0.8 });
    m.cyl(x, 7 * s, z, 1.5 * s, 1.6 * s, 8, RED, { r2: 0.1, shade: 0.8 });
    const hub = [x, 7 * s, z + 1.7 * s];
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + 0.4, c = Math.cos(a), si = Math.sin(a), l = 5 * s, w = 0.7 * s, p = (d, o) => [hub[0] + c * d - si * o, hub[1] + si * d + c * o, hub[2]];
        m.quad(p(0.5 * s, -w * 0.3), p(l, -w * 0.3), p(l, w), p(0.5 * s, w), CREAM);
    }
}
function sheep(m, x, z, s) {
    m.ball(x, 0.75 * s, z, 0.62 * s, 7, 4, WHITE, { sz: 1.3, shade: false });
    m.ball(x, 1 * s, z - 0.8 * s, 0.28 * s, 6, 3, DARK);
    for (const [a, c] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.45], [0.25, 0.45]]) m.box(x + a * s, 0, z + c * s, 0.12 * s, 0.4 * s, 0.12 * s, DARK);
}
function cottage(m, x, z, s, yaw, wall, roof) {
    m.at(x, 0, z, yaw, s);
    m.box(0, 0, 0, 5, 3, 4.2, wall, { shade: 0.84 });
    m.quad([2.8, 2.8, 2.4], [2.8, 2.8, -2.4], [0, 5.2, -2.4], [0, 5.2, 2.4], roof);
    m.quad([0, 5.2, 2.4], [0, 5.2, -2.4], [-2.8, 2.8, -2.4], [-2.8, 2.8, 2.4], mul(roof, 1.12));
    m.tri([-2.5, 3, 2.1], [2.5, 3, 2.1], [0, 5.1, 2.1], wall);
    m.tri([2.5, 3, -2.1], [-2.5, 3, -2.1], [0, 5.1, -2.1], wall);
    m.box(0, 0, 2.11, 0.9, 1.7, 0.04, C("#3f8ed8"));
    for (const w of [-1.6, 1.6]) { m.box(w, 1.3, 2.11, 0.9, 0.9, 0.04, GLASS); m.box(w, 1.72, 2.13, 0.92, 0.07, 0.03, CREAM); m.box(w, 1.11, 2.13, 1.1, 0.2, 0.14, C("#ff7aa8")); }
    m.box(1.4, 4, -0.8, 0.6, 1.8, 0.6, C("#b4553a"));
    m.reset();
}
function church(m, x, z, s) {
    m.at(x, 0, z, 0, s); const st = C("#d6cdb9");
    m.box(0, 0, 0, 3, 9, 3, st, { shade: 0.76 }); m.cyl(0, 9, 0, 2.2, 4, 4, C("#5f6a7d"), { r2: 0, rot: Math.PI / 4, shade: 0.8 });
    m.box(0, 6, 1.52, 1, 1.5, 0.03, DARK); m.box(0, 0, 3.5, 6, 4, 7, st, { shade: 0.8 });
    m.box(0, 12.6, 0, 0.14, 1.3, 0.14, YEL); m.box(0, 13.1, 0, 0.7, 0.14, 0.14, YEL);
    m.reset();
}
function lamp(m, x) { m.cyl(x, 0, 0, 0.08, 4, 6, DARK); m.box(x, 4, 0, 0.4, 0.5, 0.4, mul(C("#ffe9a0"), 1.3), { taper: 1.2, top: DARK }); }
function buntingOver(m, z) {
    const cols = ["#e8432e", "#ffc933", "#3f8ed8", "#ff7aa8", "#fff1d6"], n = 12;
    for (let i = 0; i < n; i++) {
        const x = -5 + i * 10 / (n - 1), y = 12.4 - 1.0 * (1 - Math.pow((x / 5), 2)), c = C(cols[i % 5]);
        m.tri([x - 0.3, y, z], [x + 0.3, y, z], [x, y - 0.6, z], c);
    }
    m.box(0, 12.42, z, 10.6, 0.05, 0.05, DARK);
}
function barrier(m, x) {
    for (const z of [-4.67, 0, 4.67]) m.box(x, 0, z, 0.12, 0.8, 0.12, STEEL);
    m.box(x, 0.56, 0, 0.1, 0.3, SLICE + 0.08, C("#dfe5ea"), { noBack: true, shade: 0.8 });
}
function pylon(m, x, z, s) {
    const g = C("#a4acb8");
    for (const [a, c] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) m.cyl(x + a * s, 0, z + c * s * 0.6, 0.16, 8 * s, 4, g, { r2: 0.04 });
    m.cyl(x, 6 * s, z, 0.3, 8 * s, 4, g, { r2: 0.02 });
    for (const y of [7, 9.5, 12]) m.box(x, y * s, z, 5.6 * s, 0.14, 0.14, g);
}
function turbine(m, x, z, s, a0) {
    m.cyl(x, 0, z, 0.5 * s, 16 * s, 7, C("#f3f6f9"), { r2: 0.22 * s });
    const hub = [x, 16 * s, z + 0.6 * s];
    for (let i = 0; i < 3; i++) { const a = a0 + i * 2.094, c = Math.cos(a), si = Math.sin(a), P = (d, o) => [hub[0] + c * d - si * o, hub[1] + si * d + c * o, hub[2]]; m.quad(P(0, -0.35 * s), P(9 * s, -0.1 * s), P(9 * s, 0.1 * s), P(0, 0.42 * s), C("#ffffff")); }
}
function billboard(m, x, z, line1, line2, col) {
    m.box(x - 3.4, 0, z, 0.3, 5, 0.3, STEEL); m.box(x + 3.4, 0, z, 0.3, 5, 0.3, STEEL);
    m.box(x, 4, z, 9, 3.8, 0.24, col, { shade: 0.9 });
    m.text(line1, [x, 6.4, z + 0.14], [1, 0, 0], [0, 1, 0], 0.72, WHITE);
    m.text(line2, [x, 5, z + 0.14], [1, 0, 0], [0, 1, 0], 0.72, YEL);
}
function hangar(m, x, z, s) {
    const g = C("#d8dde4");
    m.at(x, 0, z, 0, s);
    m.box(0, 0, 0, 14, 5, 7, g, { shade: 0.8 });
    m.quad([-7, 5, 3.5], [7, 5, 3.5], [7, 7.6, 0], [-7, 7.6, 0], C("#eef1f4"));
    m.quad([7, 5, -3.5], [-7, 5, -3.5], [-7, 7.6, 0], [7, 7.6, 0], C("#c9ced6"));
    m.box(0, 0, 3.52, 12, 4.3, 0.05, C("#3c86c8"));
    m.reset();
}
function terminal(m, x, z, s) {
    m.at(x, 0, z, 0, s);
    m.box(0, 0, 0, 24, 2.4, 10, C("#f2f4f6"), { shade: 0.84 });
    m.box(0, 2.4, 0, 24, 4.2, 10, GLASS, { shade: 0.8, top: C("#e4e8ee") });
    for (let i = -5; i <= 5; i++) m.box(i * 2.2, 2.4, 5.02, 0.16, 4.2, 0.04, STEEL);
    m.box(0, 6.6, 0, 25, 0.5, 11, C("#ffffff"), { shade: 0.84 });
    m.reset();
}
function tower(m, x, z, s) { m.cyl(x, 0, z, 1.3 * s, 16 * s, 8, C("#eef1f4"), { r2: 0.8 * s }); m.cyl(x, 16 * s, z, 1.3 * s, 2.4 * s, 8, GLASS, { r2: 2.2 * s, top: STEEL }); m.cyl(x, 18.4 * s, z, 2.4 * s, 0.5 * s, 8, C("#ffffff"), { r2: 1 * s }); m.cyl(x, 18.9 * s, z, 0.1, 3 * s, 4, RED); }
function plane(m, x, z, s, yaw, tail) {
    m.at(x, 0, z, yaw, s);
    const W = C("#f7f8fa"), T = C(tail);
    m.cylZ(0, 2.4, 0, 1.6, 18, 9, W, { cap: W });
    m.cylZ(0, 2.4, -10.5, 1.6, 3.2, 9, W, { r2: 0.3 });
    m.cylZ(0, 2.5, 10.2, 1.6, 2.6, 9, W, { r2: 0.3 });
    m.box(0, 3.3, -9.6, 2.2, 0.5, 0.1, DARK);
    for (const s2 of [-1, 1]) {
        m.quad([s2 * 1.4, 2, -2.5], [s2 * 11, 2.8, 3.5], [s2 * 11, 2.8, 5], [s2 * 1.4, 2, 2.5], C("#dfe4ea"));
        m.quad([s2 * 1.4, 2, 2.5], [s2 * 11, 2.8, 5], [s2 * 11, 2.8, 3.5], [s2 * 1.4, 2, -2.5], C("#dfe4ea"));
        m.cylZ(s2 * 5, 1.5, 0.2, 0.75, 2.4, 8, T);
    }
    m.quad([0, 3.6, 7], [0, 9, 11.4], [0, 9, 13], [0, 3.6, 11.5], T);
    m.quad([0, 3.6, 11.5], [0, 9, 13], [0, 9, 11.4], [0, 3.6, 7], mul(T, 0.9));
    for (const zz of [-5.2, 1]) { m.box(0, 0, zz, 0.2, 1, 0.2, DARK); m.cylX(0, 0.4, zz, 0.4, 0.6, 7, TYRE); }
    for (let i = -6; i < 7; i++) m.box(0, 2.9, i * 1.2, 3.25, 0.25, 0.3, mul(GLASS, 0.7), { noTop: true });
    m.reset();
}
function chalet(m, x, z, s, b) { const y = groundAt(x, b); cottage(m, x, z, s, 0, C("#a56a3d"), WHITE); m.at(x, y, z, 0, s); m.reset(); }
function liftPylon(m, x) { m.cyl(x, 0, 0, 0.3, 11, 6, C("#3f6f8f"), { r2: 0.2 }); m.box(x, 11, 0, 3.4, 0.3, 0.5, C("#3f6f8f")); for (const s of [-1, 1]) m.box(x + s * 1.5, 9.4, 0, 0.05, 1.6, SLICE + 0.1, DARK, { noBack: true }); }
function flag(m, x, z, col) { m.cyl(x, 0, z, 0.05, 1.8, 5, DARK); m.tri([x, 1.8, z], [x, 1.2, z], [x + 0.8, 1.5, z], col); m.tri([x, 1.2, z], [x, 1.8, z], [x + 0.8, 1.5, z], col); }
function fuelTank(m, x, z, s) { m.ball(x, 5 * s, z, 4 * s, 10, 6, C("#f2f4f6"), { shade: false }); for (const [a, c] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) m.cyl(x + a * s, 0, z + c * s, 0.28 * s, 3.6 * s, 5, C("#e8432e")); m.cyl(x, 8.6 * s, z, 0.5 * s, 0.5 * s, 6, STEEL); }
function dish(m, x, z, s, yaw) {
    m.at(x, 0, z, yaw, s); m.cyl(0, 0, 0, 0.8, 3, 6, STEEL, { r2: 0.34 }); m.reset();
    m.at(x, 3.2 * s, z, yaw, s); const n = 10, R = 3.2;
    for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, P = (a) => [R * Math.cos(a), R * Math.sin(a) * 0.86 + 1.4, 1.6]; const hub = [0, 1, 0]; m.tri(hub, P(a0), P(a1), C("#f2f4f6")); m.tri(hub, P(a1), P(a0), C("#c9ced6")); }
    m.reset();
}
function gantry(m, x, z, s, col = RED) {
    m.at(x, 0, z, 0, s);
    for (const [a, c] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) m.box(a, 0, c, 0.34, 26, 0.34, col, { shade: 0.8 });
    for (let y = 3; y < 26; y += 3) { m.box(0, y, 1.6, 3.5, 0.2, 0.2, col); m.box(0, y, -1.6, 3.5, 0.2, 0.2, col); m.box(1.6, y, 0, 0.2, 0.2, 3.5, col); m.box(-1.6, y, 0, 0.2, 0.2, 3.5, col); }
    m.reset();
}
function littleRocket(m, x, z, s) {
    m.at(x, 0, z, 0, s);
    m.cyl(0, 1, 0, 1.4, 12, 9, C("#f6f7f9"), { r2: 1.3 }); m.cyl(0, 13, 0, 1.3, 3.4, 9, RED, { r2: 0.02 }); m.cyl(0, 0, 0, 1.6, 1, 9, DARK, { r2: 1.3 });
    for (const a of [0, 2.09, 4.19]) { const c = Math.cos(a), si = Math.sin(a); m.quad([c * 1.3, 4, si * 1.3], [c * 3, 0, si * 3], [c * 3, 2, si * 3], [c * 1.3, 7, si * 1.3], RED); m.quad([c * 1.3, 7, si * 1.3], [c * 3, 2, si * 3], [c * 3, 0, si * 3], [c * 1.3, 4, si * 1.3], RED); }
    m.reset();
}
function mesa(m, x, z, s, col) { m.cyl(x, 0, z, 7 * s, 5 * s, 7, col, { r2: 5 * s, shade: 0.76, top: mul(col, 1.14) }); m.cyl(x + 2 * s, 5 * s, z - s, 3.2 * s, 2 * s, 6, mul(col, 1.04), { r2: 2.2 * s, shade: 0.8, top: mul(col, 1.16) }); }
function crops(m, s, col, col2) {
    for (let i = 0; i < 5; i++) { const x0 = s * (6.4 + i * 2.2), x1 = x0 + s * 1.6; const c = i % 2 ? col : col2; m.quad(s > 0 ? [x0, 0.1, 7] : [x1, 0.1, 7], s > 0 ? [x1, 0.1, 7] : [x0, 0.1, 7], s > 0 ? [x1, 0.1, -7] : [x0, 0.1, -7], s > 0 ? [x0, 0.1, -7] : [x1, 0.1, -7], c); }
}
function sunflowers(m, s, rng) {
    for (let i = 0; i < 16; i++) {
        const x = s * (6.5 + rng.next() * 9), z = -6 + rng.next() * 12, y = 1.2 + rng.next() * 0.5;
        m.cyl(x, 0, z, 0.06, y, 4, C("#4f8a33"));
        m.cyl(x, y, z, 0.5, 0.1, 8, YEL, { r2: 0.42, top: C("#6b3f1e"), rot: 0.3 });
    }
}

// --- Slices -----------------------------------------------------------------------------------
const TREES = ["#5aa83c", "#6fbb45", "#4d9a3a", "#83c94d"];
const DRESS = {
    farm(m, v, rng) {
        pave(m, "farm");
        for (const x of [-2.9, 2.9]) { dash(m, x - 0.6, 0.18, C("#c49353"), 3, 0.7); }
        fence(m, -4.5, "farm"); fence(m, 4.5, "farm");
        const shade = mul(LOOK.farm.grass2, 0.74);
        if (v === 0) { crops(m, 1, C("#d6c15e"), C("#e6d06b")); crops(m, -1, C("#69b63f"), C("#57a436")); }
        if (v === 1) { blob(m, 16, 1, 7, 5, shade); barn(m, 13.5, 0, 1.1, -0.5); tree(m, -11, 2, 1.3, "farm", C(TREES[0]), rng); silo(m, 21, -6, 1); }
        if (v === 2) { sheep(m, 8, 2, 1); sheep(m, 11, -3, 1.1); sheep(m, -9, -1, 1); blob(m, 8.3, 1.7, 1, 0.8, shade); blob(m, 11.3, -3.3, 1.1, 0.9, shade); blob(m, -8.7, -1.3, 1, 0.8, shade); tree(m, 18, 3, 1.6, "farm", C(TREES[1]), rng); tree(m, -16, -3, 1.5, "farm", C(TREES[2]), rng); }
        if (v === 3) { sunflowers(m, 1, rng); sunflowers(m, -1, rng); tree(m, -22, 3, 2, "farm", C(TREES[3]), rng); }
        if (v === 4) { blob(m, -14, 2, 4, 3, shade); windmill(m, -14, -1, 1.15); tree(m, 10, 3, 1.2, "farm", C(TREES[1]), rng); tree(m, 13, -3, 1.5, "farm", C(TREES[0]), rng); }
        if (v === 5) { for (let i = 0; i < 6; i++) { const s = i % 2 ? 1 : -1; tree(m, s * (8 + rng.next() * 16), -6 + rng.next() * 12, 1 + rng.next() * 0.8, "farm", C(TREES[i % 4]), rng); } crops(m, 1, C("#e6d06b"), C("#d6c15e")); }
    },
    village(m, v, rng) {
        pave(m, "village");
        // Cobbles: a scatter of paler stones, so the street has grain at speed.
        for (let i = 0; i < 26; i++) { const x = -3.4 + rng.next() * 6.8, z = -6.5 + rng.next() * 13, w = 0.22 + rng.next() * 0.2; m.quad([x - w, 0.018, z + w * 0.7], [x + w, 0.018, z + w * 0.7], [x + w, 0.018, z - w * 0.7], [x - w, 0.018, z - w * 0.7], i % 2 ? C("#d9ccb6") : C("#ab9a81")); }
        const W = ["#fff1d6", "#ffd9c2", "#d5ecf0", "#ffe69a", "#f2c9d4", "#cfe8c8"], R = ["#b4553a", "#7d6a57", "#c99a4b", "#5f6a7d"];
        const shade = C("#d9c8ab");
        strip(m, 4.2, 7, C("#efe3cc"), 0.01); strip(m, -7, -4.2, C("#efe3cc"), 0.01);
        const house = (s, z, i, sc = 1) => cottage(m, s * (9 + sc * 1.2), z, sc, s > 0 ? -Math.PI / 2 : Math.PI / 2, C(W[i % 6]), C(R[i % 4]));
        if (v === 0) { house(1, 2, 0); house(-1, -2, 1); lamp(m, 4.6); }
        if (v === 1) { house(1, -1, 2); house(-1, 3, 3); buntingOver(m, -3); buntingOver(m, 4); for (const x of [-5.3, 5.3]) m.box(x, 0, 0, 0.16, 12.6, 0.16, WOOD); }
        if (v === 2) { house(-1, 0, 4, 1.2); church(m, 15, -2, 1.1); lamp(m, -4.6); }
        if (v === 3) { house(1, 3, 5); house(1, -3.6, 0, 0.9); tree(m, -11, 0, 1.4, "village", C(TREES[1]), rng); poplar(m, -16, -5, 1.2, "village", C("#4d9a3a")); }
        if (v === 4) { house(-1, 2.5, 2); house(-1, -3.8, 5, 0.9); hedge(m, 5.6, "village", C("#5aa83c")); poplar(m, 8, -4, 1, "village", C("#4d9a3a")); poplar(m, 8, 3, 1.2, "village", C("#5aa83c")); lamp(m, -4.6); }
        if (v === 5) { house(1, 0, 1, 1.2); house(-1, 0, 3, 1.2); buntingOver(m, 0); for (const x of [-5.3, 5.3]) m.box(x, 0, 0, 0.16, 12.6, 0.16, WOOD); }
    },
    motorway(m, v, rng) {
        pave(m, "motorway");
        for (const x of [-1.2, 1.2]) dash(m, x, 0.09, C("#f6f3e7"), 2, 0.55);
        for (const x of [-3.62, 3.62]) strip(m, x - 0.07, x + 0.07, YEL, 0.016);
        barrier(m, 4.4); barrier(m, -4.4);
        strip(m, -14.8, -5.6, C("#54525f"), 0.01); for (const x of [-11.7, -8.7]) dash(m, x, 0.09, C("#f6f3e7"), 2, 0.55, 0.02);
        strip(m, -5.6, -4.2, C("#a3c455"), 0.008); barrier(m, -5.7);
        const P = ["#ef4b5e", "#2fb8a8", "#ffb52e", "#f2f0e8"];
        const lane = (x, z, c) => { m.box(x, 0.3, z, 1.7, 0.72, 3.6, C(c), { shade: 0.72 }); m.box(x, 1.02, z + 0.1, 1.5, 0.5, 1.9, GLASS, { taper: 0.82, top: C(c) }); blob(m, x, z, 1.05, 2, C("#3a3944"), 0.02); };
        if (v === 0) { turbine(m, 26, -3, 1.2, 0.3); tree(m, 11, 2, 1.3, "motorway", C(TREES[3]), rng); lane(-10.2, 3, P[0]); }
        if (v === 1) { billboard(m, 12, -2, "EGGS", "2 MILES", C("#2472c8")); lane(-7.2, -3, P[1]); pylon(m, -24, 0, 1.3); }
        if (v === 2) { pylon(m, 22, 0, 1.3); poplar(m, 8, 4, 1.2, "motorway", C("#5aa83c")); poplar(m, 8, -2, 1, "motorway", C("#4d9a3a")); lane(-10.2, -4, P[2]); }
        if (v === 3) { turbine(m, 18, 3, 1, 1.1); turbine(m, -26, -2, 1.3, 2.1); lane(-13.2, 1, P[3]); }
        if (v === 4) { billboard(m, 12, 3, "HAVE YOU", "SEEN KEITH", C("#d8352f")); tree(m, -20, 0, 2, "motorway", C(TREES[0]), rng); }
        if (v === 5) { m.box(0, 12.2, 0, 14, 0.6, 1.4, C("#d8dbe0"), { shade: 0.8, bottom: true }); for (const x of [-6.6, 6.6]) m.box(x, 0, 0, 0.5, 12.2, 0.5, STEEL); m.box(0, 12.9, 0.7, 10, 2, 0.1, C("#21a34f"), { bottom: true }); m.text("NOWHERE", [0, 13.9, 0.78], [1, 0, 0], [0, 1, 0], 0.92, WHITE); lane(-7.2, 2, P[1]); }
    },
    airport(m, v, rng) {
        pave(m, "airport");
        for (const x of [-1.2, 1.2]) dash(m, x, 0.12, WHITE, 1, 0.5);
        for (const x of [-3.62, 3.62]) strip(m, x - 0.1, x + 0.1, YEL, 0.016);
        strip(m, 4.2, 30, C("#b9becb"), 0.006); strip(m, -30, -4.2, C("#b9becb"), 0.006);
        dash(m, 9.6, 0.1, YEL, 2, 0.6, 0.012); dash(m, -9.6, 0.1, YEL, 2, 0.6, 0.012);
        const shade = C("#9ea4b1");
        if (v === 0) { blob(m, 15, 2, 12, 8, shade, 0.012); plane(m, 14, 0, 0.72, 0.25, "#2472c8"); }
        if (v === 1) { blob(m, -19, 0, 14, 7, shade, 0.012); terminal(m, -21, 0, 1); dishless(m); }
        if (v === 2) { tower(m, 20, -2, 1); blob(m, -15, 1, 12, 8, shade, 0.012); plane(m, -15, 1, 0.72, -0.25, "#e8432e"); }
        if (v === 3) { hangar(m, 19, 0, 1); hangar(m, -19, -1, 0.9); }
        if (v === 4) { blob(m, 16, -1, 13, 8, shade, 0.012); plane(m, 16, -1, 0.8, 0.5, "#ffb52e"); m.box(-8, 0, 2, 1.8, 1.4, 3, YEL, { shade: 0.74 }); }
        if (v === 5) { terminal(m, 21, 1, 1); for (let i = 0; i < 6; i++) m.box(-7 - i * 1.6, 0, -3 + (i % 2), 0.3, 0.8, 0.3, C("#ff7a22"), { taper: 0.3 }); }
    },
    ski(m, v, rng) {
        pave(m, "ski");
        for (const x of [-3.62, 3.62]) for (let i = 0; i < 2; i++) flag(m, x + Math.sign(x) * 0.7, -3.5 + i * 7, i ? RED : C("#2472c8"));
        for (const s of [-1, 1]) for (let i = 0; i < 2; i++) m.quad(s > 0 ? [-2.6 + i * 5, 0.02, 7] : [-2.2 + i * 5, 0.02, 7], s > 0 ? [-2.5 + i * 5, 0.02, 7] : [-2.1 + i * 5, 0.02, 7], s > 0 ? [-2.5 + i * 5, 0.02, -7] : [-2.1 + i * 5, 0.02, -7], s > 0 ? [-2.6 + i * 5, 0.02, -7] : [-2.2 + i * 5, 0.02, -7], C("#c7daee"));
        const pines = (n, a, b) => { for (let i = 0; i < n; i++) { const s = rng.next() < 0.5 ? 1 : -1; pine(m, s * (a + rng.next() * (b - a)), -6 + rng.next() * 12, 1.1 + rng.next() * 1.1, "ski"); } };
        const blue = C("#cfe0f2");
        if (v === 0) pines(7, 7, 30);
        if (v === 1) { pines(4, 16, 34); liftPylon(m, 11); }
        if (v === 2) { pines(3, 18, 30); blob(m, 12.5, 1, 4, 3.4, blue); m.at(0, 0, 0); cottage(m, 12, 0, 1.1, -Math.PI / 2, C("#a56a3d"), WHITE); }
        if (v === 3) { pines(9, 6.5, 26); }
        if (v === 4) { pines(4, 16, 32); liftPylon(m, -11); m.box(-8, 0, 3, 3, 0.6, 3, C("#e6f1fb"), { taper: 0.5 }); }
        if (v === 5) { pines(5, 12, 34); for (const [x, z] of [[-7, 2], [8, -3]]) m.box(x, 0, z, 2.4, 0.5, 2.4, C("#eaf3fc"), { taper: 0.4 }); blob(m, -14, -2, 4, 3, blue); cottage(m, -14, -2, 0.9, Math.PI / 2, C("#b06f40"), WHITE); }
    },
    launch(m, v, rng) {
        pave(m, "launch");
        for (const x of [-3.62, 3.62]) for (let i = 0; i < 6; i++) { const z = -7 + i * 2.333, c = i % 2 ? YEL : DARK; m.quad([x - 0.14, 0.018, z + 2.333], [x + 0.14, 0.018, z + 2.333], [x + 0.14, 0.018, z], [x - 0.14, 0.018, z], c); }
        strip(m, 4.2, 15, C("#bfc0c6"), 0.006); strip(m, -15, -4.2, C("#bfc0c6"), 0.006);
        const shade = mul(LOOK.launch.grass2, 0.78), sh2 = C("#8f919b");
        if (v === 0) { blob(m, 20, -1, 7, 5, shade); fuelTank(m, 19, 0, 1); dish(m, -13, 2, 1, -2.4); }
        if (v === 1) { gantry(m, 14, 0, 0.8); blob(m, 16, -1, 4, 3, sh2, 0.012); mesa(m, -32, 0, 1.4, C("#d9915d")); }
        if (v === 2) { littleRocket(m, -15, 0, 1.2); mesa(m, 34, -2, 1.5, C("#cf8552")); }
        if (v === 3) { dish(m, 13, -2, 1.2, 2.4); dish(m, -13, 2, 1, -2.4); }
        if (v === 4) { fuelTank(m, -20, 0, 1.1); littleRocket(m, 16, 2, 1); }
        if (v === 5) { mesa(m, 30, 2, 1.8, C("#d9915d")); mesa(m, -30, -3, 1.2, C("#c97d4b")); m.box(9, 0, -2, 1.6, 2.2, 1.6, C("#e8432e"), { shade: 0.76 }); }
    },
};
function dishless() {}

function gate(m, b, next, nextName, sub) {
    // The world changes behind a wall of its own colours, with a sign to read as it comes up.
    const k = LOOK[b], n = LOOK[next];
    const half = SLICE / 2;
    const look = n.far, wall = mix(n.grass2, DARK, 0.1);
    const w = 72, top = 24, open = 13.6, inner = 4.6;
    for (const s of [-1, 1]) {
        const x0 = s > 0 ? inner : -w, x1 = s > 0 ? w : -inner;
        m.box((x0 + x1) / 2, 0, 0, Math.abs(x1 - x0), top, 1.2, mix(wall, look, 0.25), { shade: 0.8, noBack: true });
    }
    m.box(0, open, 0, inner * 2 + 0.1, top - open, 1.2, mix(wall, look, 0.25), { shade: 0.9, noBack: true, bottom: true });
    m.box(0, open - 0.1, 0.3, 22, 7.2, 0.3, DARK);
    m.box(0, open, 0.46, 21.6, 7, 0.2, C("#fff1d6"), { noBack: true });
    m.text("WELCOME TO", [0, open + 5.2, 0.58], [1, 0, 0], [0, 1, 0], 0.9, C("#35303c"));
    m.text(nextName, [0, open + 2.6, 0.58], [1, 0, 0], [0, 1, 0], nextName.length > 12 ? 1.05 : 1.5, C("#e8432e"));
    for (const x of [-4.8, 4.8]) m.box(x, 0, 0.6, 0.6, open + 0.2, 0.6, C("#fff1d6"), { shade: 0.82 });
}

export function buildWorld(game) {
    const a = game.assets, names = {};
    BIOMES.forEach((b, i) => {
        names[b.id] = [];
        for (let v = 0; v < VARIANTS; v++) {
            const m = new MB(), rng = makeRng(101 + i * 17 + v * 3);
            ground(m, b.id, rng);
            DRESS[b.id](m, v, rng);
            const name = `s_${b.id}_${v}`;
            a.mesh(name, { positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });
            names[b.id].push(name);
        }
        const next = BIOMES[(i + 1) % BIOMES.length];
        const m = new MB(), rng = makeRng(11 + i);
        // The gate slice has the outgoing ground; the far side belongs to the next world's first slice.
        ground(m, b.id, rng);
        pave(m, b.id);
        gate(m, b.id, next.id, next.name.toUpperCase(), next.sub);
        a.mesh(`g_${b.id}`, { positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });
    });
    backdrops(game);
    return names;
}

/** Far hills, drawn unlit and already tinted into the haze of each world's horizon. */
function backdrops(game) {
    const a = game.assets;
    const set = {
        farm: { back: "#bfe3c5", near: "#a6dba0", peak: 16, n: 12, snow: 0 },
        village: { back: "#d7e7b8", near: "#bfdf9a", peak: 13, n: 14, snow: 0 },
        motorway: { back: "#e8d2b0", near: "#d6d29c", peak: 12, n: 15, snow: 0 },
        airport: { back: "#d9e4ee", near: "#c9dcd2", peak: 8, n: 16, snow: 0 },
        ski: { back: "#b8d4f2", near: "#d4e6f8", peak: 56, n: 8, snow: 1 },
        launch: { back: "#d98a6e", near: "#e8a678", peak: 24, n: 9, snow: 0 },
    };
    Object.entries(set).forEach(([id, k], bi) => {
        const m = new MB(), rng = makeRng(500 + bi);
        for (const [z, tone, h, n] of [[0, C(k.back), k.peak * 1.25, k.n], [30, C(k.near), k.peak * 0.72, k.n + 4]]) {
            const w = 900, step = w / n;
            for (let i = 0; i < n; i++) {
                const x = -w / 2 + (i + 0.5) * step + (rng.next() - 0.5) * step * 0.4, tall = h * (0.55 + rng.next() * 0.65), half = step * (0.62 + rng.next() * 0.3), ox = (rng.next() - 0.5) * half * 0.5;
                m.tri([x - half, -30, z], [x + ox, tall, z], [x, -30, z], mul(tone, 0.96));
                m.tri([x, -30, z], [x + ox, tall, z], [x + half, -30, z], tone);
                if (k.snow) { const t = 0.32; m.tri([x + ox - half * t, tall * (1 - t), z + 0.5], [x + ox, tall, z + 0.5], [x + ox, tall * (1 - t * 1.4), z + 0.5], WHITE); m.tri([x + ox, tall * (1 - t * 1.4), z + 0.5], [x + ox, tall, z + 0.5], [x + ox + half * t, tall * (1 - t), z + 0.5], C("#e4eef9")); }
            }
        }
        a.mesh(`bd_${id}`, { positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });
    });
    let m = new MB();                     // A cloud is a flat-bottomed heap of soft facets.
    for (const [x, y, r] of [[-2.2, 0.5, 1.5], [0, 1, 2], [2.1, 0.45, 1.4], [0.9, 0.2, 1.2], [-1, 0.2, 1.2]]) m.ball(x, y, 0, r, 7, 4, WHITE, { sy: 0.72, sz: 0.5, shade: false });
    a.mesh("cloud", { positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });
    m = new MB();                         // The finale: a rocket with a ridiculous amount of confidence.
    const W = C("#f7f8fa"), R = C("#e8432e"), S = 3;
    m.cyl(0, 3 * S, 0, 3.2 * S, 18 * S, 12, W, { r2: 2.9 * S, shade: 0.74 });
    for (const y of [7, 13]) m.cyl(0, y * S, 0, 3.15 * S, 1.2 * S, 12, R, { cap: false, r2: 3.05 * S });
    m.cyl(0, 21 * S, 0, 2.9 * S, 8 * S, 12, R, { r2: 0.02, shade: 0.76 });
    m.cyl(0, 0, 0, 3.6 * S, 3 * S, 12, DARK, { r2: 3 * S });
    for (const [a2, f] of [[0.8, 1], [2.9, 1], [5, 1]]) {
        const c = Math.cos(a2), s = Math.sin(a2), Q = (r, y) => [c * r * S, y * S, s * r * S];
        m.quad(Q(3, 10), Q(7, 1), Q(7, 5), Q(3, 15), YEL); m.quad(Q(3, 15), Q(7, 5), Q(7, 1), Q(3, 10), YEL);
    }
    m.cyl(0, 15 * S, 3 * S, 1 * S, 0.2, 10, GLASS, { cap: true });
    a.mesh("big_rocket", { positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });
}
