// Every moving thing in the game, modelled in code and merged per object. Obstacles stick to one language across the
// six worlds: hurdles carry a hot red-and-cream rail, bars hang a striped banner, and tall things are solid silhouettes.
import { MB, hex, mul, mix } from "./meshkit.js";
import { OSTRICHES } from "./data.js";

const C = (h) => hex(h);
const RED = C("#e8432e"), CREAM = C("#fff1d6"), DARK = C("#35303c"), WHITE = C("#ffffff"), TYRE = C("#2c2a33"), STEEL = C("#b8c2cc"), GLASS = C("#7fd6e8");
const YEL = C("#ffc933"), WOOD = C("#b97a3f"), WOOD2 = C("#8e5a2d");

/** A red-and-cream striped rail along x, the mark of something you must jump. */
function rail(m, y, w, h, d) {
    const n = 4, seg = w / n;
    for (let i = 0; i < n; i++) m.box(-w / 2 + seg * (i + 0.5), y, 0, seg, h, d, i % 2 ? CREAM : RED, { shade: 0.86 });
}
/** The striped banner that says duck. */
function banner(m, y, w, h, col = RED, col2 = CREAM) {
    const n = 6, seg = w / n;
    for (let i = 0; i < n; i++) m.box(-w / 2 + seg * (i + 0.5), y, 0, seg, h, 0.22, i % 2 ? col2 : col, { shade: 0.8, bottom: true });
}
const posts = (m, h, col = WOOD, w = 2.2) => { m.box(-w / 2, 0, 0, 0.22, h, 0.22, col); m.box(w / 2, 0, 0, 0.22, h, 0.22, col); };

function car(m, col, o = {}) {
    const dark = mul(col, 0.7), len = o.len ?? 3.8, w = o.w ?? 1.75, h = o.h ?? 0.75;
    m.box(0, 0.35, 0, w, h, len, col, { shade: 0.72, top: mul(col, 1.08) });
    m.box(0, 0.35 + h, 0.15, w * 0.86, 0.62, len * 0.52, GLASS, { taperX: 0.86, taperZ: 0.74, shade: 0.8, top: col });
    for (const x of [-1, 1]) for (const z of [-1, 1]) m.cylX(x * w * 0.47, 0.34, z * len * 0.3, 0.34, 0.26, 8, TYRE, { cap: STEEL });
    const lamp = o.front ? C("#fff7c9") : C("#ff4a3a"), e = (o.front ? -1 : 1) * (len / 2 + 0.01);
    for (const x of [-1, 1]) m.box(x * w * 0.34, 0.65, e, 0.38, 0.2, 0.04, mul(lamp, 1.5));
    m.box(0, 0.42, e, w * 0.9, 0.14, 0.05, dark);
}
function tractor(m, col) {
    m.cylX(-0.82, 0.8, 0.55, 0.8, 0.42, 10, TYRE, { cap: YEL }); m.cylX(0.82, 0.8, 0.55, 0.8, 0.42, 10, TYRE, { cap: YEL });
    m.cylX(-0.72, 0.42, -1.1, 0.42, 0.3, 8, TYRE, { cap: YEL }); m.cylX(0.72, 0.42, -1.1, 0.42, 0.3, 8, TYRE, { cap: YEL });
    m.box(0, 0.5, -0.5, 1.0, 0.85, 2.2, col, { shade: 0.75 });
    m.box(0, 0.8, 0.5, 1.2, 0.3, 1.1, mul(col, 0.8));
    m.box(0, 1.1, 0.55, 1.15, 1.15, 1.05, GLASS, { taper: 0.92, top: col, shade: 0.9 });
    m.box(0, 2.25, 0.55, 1.4, 0.12, 1.3, col, { shade: 0.8 });
    m.cyl(0.3, 1.3, -1.1, 0.07, 0.8, 6, DARK);
}
function lorryCab(m, col, stripe) {
    m.box(0, 0.5, -1.4, 2.0, 2.4, 2.8, col, { shade: 0.75 });
    m.box(0, 1.7, -2.81, 1.8, 0.9, 0.04, GLASS);
    m.box(0, 0.5, -1.4, 2.04, 0.3, 2.84, stripe);
    for (const x of [-0.8, 0.8]) m.box(x, 0.75, -2.82, 0.34, 0.18, 0.04, mul(C("#fff7c9"), 1.5));
    for (const x of [-1, 1]) for (const z of [-0.6, -2.1]) m.cylX(x * 0.9, 0.42, z, 0.42, 0.32, 8, TYRE, { cap: STEEL });
}

const OBSTACLES = {
    farm: {
        j: (m) => { posts(m, 1.2); rail(m, 0.8, 2.25, 0.3, 0.16); m.box(0, 0.32, 0, 2.2, 0.2, 0.12, WOOD); },
        c: (m) => { for (const [x, z, r] of [[-0.45, 0, 0.62], [0.5, 0.1, 0.6]]) { m.cylX(x, r, z, r, 1, 10, C("#eec65a"), { cap: C("#d9a93c") }); m.cylX(x, r, z, r + 0.02, 0.1, 10, C("#c98a2f")); } },
        s: (m) => { posts(m, 2.6, WOOD, 2.3); m.box(0, 2.45, 0, 2.4, 0.05, 0.05, DARK); for (const [x, h, c] of [[-0.8, 0.9, "#ffffff"], [0, 1.0, "#ff8fa8"], [0.8, 0.85, "#7fc8f0"]]) m.box(x, 2.45 - h, 0, 0.72, h, 0.05, C(c), { bottom: true, shade: 0.85 }); m.box(0, 1.4, 0, 2.3, 0.1, 0.1, RED); },
        B: (m) => tractor(m, C("#e23b2e")),
        L: (m) => { m.box(0, 0.45, -1.5, 2.0, 0.6, 3, WOOD, { shade: 0.7 }); m.cylX(-1, 0.45, -1, 0.45, 0.3, 8, TYRE, { cap: YEL }); m.cylX(1, 0.45, -1, 0.45, 0.3, 8, TYRE, { cap: YEL }); m.box(0, 1.05, -1.5, 1.9, 1.5, 2.8, C("#eec65a"), { taper: 0.9, shade: 0.8 }); },
        Lb: (m) => { m.box(0, 0.45, 0.5, 2.0, 0.6, 1, WOOD2, { shade: 0.7 }); m.box(0, 1.05, 0.5, 1.9, 1.5, 1, C("#e8bd52"), { shade: 0.8, taperX: 0.9 }); },
        v: (m) => { m.at(0, 0, -0.5, Math.PI); tractor(m, C("#3fa34d")); m.reset(); for (const x of [-0.35, 0.35]) m.box(x, 1, -2.2, 0.26, 0.26, 0.05, mul(C("#fff7c9"), 2)); },
    },
    village: {
        j: (m) => { m.box(0, 0, 0, 2.2, 0.55, 0.7, C("#cdbb9e"), { shade: 0.74, top: C("#ddd0b8") }); rail(m, 0.55, 2.2, 0.26, 0.7); for (const x of [-0.7, 0, 0.7]) m.ball(x, 0.95, 0, 0.16, 6, 3, C("#ff7aa8")); },
        c: (m) => { for (const [x, z, r, c] of [[-0.5, 0, 0.5, "#f58a2a"], [0.45, 0.1, 0.56, "#f9a13c"], [0, -0.25, 0.42, "#ee7a1e"]]) { m.ball(x, r * 0.85, z, r, 8, 5, C(c), { sy: 0.82 }); m.box(x, r * 1.5, z, 0.08, 0.16, 0.08, C("#4f7a33")); } },
        s: (m) => { posts(m, 2.7, C("#7d6a57"), 2.3); banner(m, 1.45, 2.3, 0.82, C("#3f8ed8"), CREAM); },
        B: (m) => { m.box(0, 0, 0, 1.3, 2.6, 1.3, C("#d8352f"), { shade: 0.82, top: C("#e8463c") }); for (const y of [0.9, 1.45, 2]) m.box(0, y, 0.66, 1.0, 0.05, 0.02, C("#a52620")); m.box(0, 0.6, 0.66, 0.8, 1.7, 0.02, C("#bfe8f0")); m.cyl(0, 2.6, 0, 0.8, 0.26, 4, C("#e8463c"), { r2: 0.3, rot: Math.PI / 4 }); },
        L: (m) => { m.box(0, 0.4, -1.5, 1.9, 1.9, 3, C("#f5efe3"), { shade: 0.8 }); m.box(0, 1.4, -3.01, 1.6, 0.7, 0.03, GLASS); m.box(0, 0.4, -1.5, 1.94, 0.4, 3.04, C("#3f8ed8")); for (const x of [-0.95, 0.95]) for (const z of [-0.7, -2.2]) m.cylX(x, 0.36, z, 0.36, 0.2, 8, TYRE, { cap: STEEL }); },
        Lb: (m) => { m.box(0, 0.4, 0.5, 1.9, 1.9, 1, C("#efe8db"), { shade: 0.8 }); m.box(0, 0.4, 0.5, 1.94, 0.4, 1, C("#3f8ed8")); },
        v: (m) => car(m, C("#ffb52e"), { front: true, h: 0.95, w: 1.8 }),
    },
    motorway: {
        j: (m) => { m.box(0, 0, 0, 2.3, 0.62, 0.6, C("#d8dbe0"), { taperZ: 0.55, shade: 0.72 }); rail(m, 0.62, 2.3, 0.3, 0.26); },
        c: (m) => { for (const [x, z] of [[-0.62, 0], [0, 0.15], [0.62, 0]]) { m.box(x, 0, z, 0.56, 0.05, 0.56, DARK); m.cyl(x, 0.05, z, 0.22, 0.85, 8, C("#ff7a22"), { r2: 0.05 }); m.cyl(x, 0.34, z, 0.154, 0.24, 8, WHITE, { r2: 0.105, cap: false }); } },
        s: (m) => { posts(m, 2.9, STEEL, 2.34); m.box(0, 1.5, 0, 2.5, 1.2, 0.14, C("#2472c8"), { shade: 0.9, bottom: true }); banner(m, 1.42, 2.5, 0.2, YEL, DARK); m.text("SLOW", [0, 2.1, 0.09], [1, 0, 0], [0, 1, 0], 0.42, WHITE); },
        B: (m) => car(m, C("#2fb8a8")),
        L: (m) => lorryCab(m, C("#2472c8"), YEL),
        Lb: (m) => { m.box(0, 0.5, 0.5, 2.1, 2.5, 1, C("#f2f0e8"), { shade: 0.78 }); m.box(0, 0.5, 0.5, 2.14, 0.34, 1, RED); },
        v: (m) => car(m, C("#ef4b5e"), { front: true }),
    },
    airport: {
        j: (m) => { for (const [x, w, h, c] of [[-0.75, 0.75, 0.75, "#e8432e"], [0.05, 0.8, 0.95, "#2472c8"], [0.8, 0.65, 0.62, "#ffc933"]]) { m.box(x, 0, 0, w, h, 0.5, C(c), { shade: 0.74 }); m.box(x, h, 0, 0.3, 0.06, 0.08, DARK); m.box(x, h * 0.5, 0.26, w + 0.02, 0.08, 0.02, CREAM); } },
        c: (m) => { m.box(0, 0.2, 0, 1.5, 0.08, 0.8, STEEL); for (const x of [-0.6, 0.6]) m.cylX(x, 0.1, 0.3, 0.1, 0.1, 6, TYRE); m.box(-0.4, 0.28, 0, 0.6, 0.5, 0.6, C("#ff8a3c"), { shade: 0.8 }); m.box(0.35, 0.28, 0, 0.6, 0.7, 0.6, C("#6fc08a"), { shade: 0.8 }); },
        s: (m) => { m.box(-1.14, 0, 0, 0.28, 2.8, 0.5, C("#d8dbe0"), { shade: 0.82 }); m.box(1.14, 0, 0, 0.28, 2.8, 0.5, C("#d8dbe0"), { shade: 0.82 }); m.box(0, 1.5, 0, 2.6, 1.3, 0.5, C("#e9ecef"), { shade: 0.85, bottom: true }); banner(m, 1.42, 2.3, 0.24); m.box(0, 2.3, 0.26, 0.5, 0.2, 0.02, mul(C("#4dff7a"), 1.4)); },
        B: (m) => { m.box(0, 0.5, 0, 1.9, 1.6, 3.1, C("#f3f4f6"), { shade: 0.8 }); m.box(0, 0.5, 0, 1.94, 0.36, 3.14, C("#ffc933")); m.box(0, 1.4, 1.56, 1.7, 0.6, 0.03, GLASS); for (const x of [-1, 1]) for (const z of [-1, 1]) m.cylX(x * 0.9, 0.4, z, 0.4, 0.28, 8, TYRE, { cap: STEEL }); m.cyl(0, 2.1, 0, 0.14, 0.2, 6, mul(C("#ff9a2e"), 1.5)); },
        L: (m) => { m.box(0, 0.3, -1.5, 1.8, 1.1, 3, C("#ffc933"), { shade: 0.74 }); m.box(0, 1.4, -2, 1.7, 0.9, 1.5, GLASS, { taper: 0.9, top: C("#ffc933") }); for (const x of [-0.9, 0.9]) for (const z of [-0.7, -2.2]) m.cylX(x, 0.32, z, 0.32, 0.24, 8, TYRE, { cap: STEEL }); },
        Lb: (m) => { m.box(0, 0.3, 0.5, 1.8, 0.22, 1, STEEL); m.box(0, 0.52, 0.5, 1.6, 1.1, 1, C("#d8dee6"), { shade: 0.74, top: C("#ffc933") }); m.box(0, 0.8, 0.5, 1.64, 0.18, 1, C("#2472c8")); },
        v: (m) => car(m, C("#ff8a3c"), { front: true, h: 0.9, len: 3 }),
    },
    ski: {
        j: (m) => { m.cylX(0, 0.42, 0, 0.42, 2.3, 8, C("#8a5a33"), { cap: C("#e8c79a") }); rail(m, 0.86, 2.3, 0.14, 0.3); for (const x of [-0.8, 0.5]) m.ball(x, 0.86, 0, 0.26, 6, 3, WHITE, { sy: 0.45 }); },
        c: (m) => { m.ball(0, 0.5, 0, 0.56, 9, 6, WHITE, { shade: false }); m.ball(0, 1.22, 0, 0.36, 8, 5, WHITE, { shade: false }); m.box(0, 1.5, 0, 0.56, 0.05, 0.56, DARK); m.box(0, 1.55, 0, 0.32, 0.3, 0.32, DARK); m.at(0, 1.2, 0.34, 0); m.cylZ(0, 0, 0.1, 0.07, 0.3, 5, C("#ff7a22"), { r2: 0.005 }); m.reset(); for (const x of [-0.12, 0.12]) m.ball(x, 1.32, 0.31, 0.05, 4, 2, DARK); },
        s: (m) => { posts(m, 3.1, C("#3f6f8f"), 2.34); m.box(0, 3, 0, 2.5, 0.08, 0.08, DARK); banner(m, 1.42, 2.4, 0.3, C("#2472c8"), WHITE); m.box(0, 1.72, 0, 0.1, 1.3, 0.1, STEEL); m.box(0, 1.75, 0, 1.3, 0.14, 0.6, C("#e8432e")); },
        B: (m) => { m.cyl(0, 0, 0, 0.2, 0.7, 6, C("#6b4628")); for (const [y, r, h, c] of [[0.5, 1.15, 1.5, "#2f8a72"], [1.4, 0.92, 1.4, "#369b80"], [2.25, 0.66, 1.3, "#42b091"]]) { m.cyl(0, y, 0, r, h, 7, C(c), { r2: 0, shade: 0.62 }); m.cyl(0, y + h * 0.56, 0, r * 0.42, h * 0.44, 7, mix(C(c), WHITE, 0.85), { r2: 0, shade: 0.9 }); } },
        L: (m) => { m.box(0, 0, -1.5, 2.1, 1.3, 3, C("#8f96a3"), { shade: 0.66, taperZ: 0.92, taperX: 0.9, top: WHITE }); m.box(0.3, 1.3, -1.8, 1.1, 0.9, 1.9, C("#9fa6b3"), { taper: 0.5, shade: 0.7, top: WHITE }); },
        Lb: (m) => { m.box(0, 0, 0.5, 2.1, 1.3, 1, C("#868d9a"), { shade: 0.66, top: WHITE }); },
        v: (m) => { m.ball(0, 1.1, -1, 1.15, 9, 6, WHITE, { shade: false }); for (const [x, y, z] of [[-0.5, 1.5, -2.05], [0.45, 0.9, -2.12], [0.1, 1.85, -1.95]]) m.ball(x, y, z, 0.2, 5, 3, C("#3b3a44")); },
    },
    launch: {
        j: (m) => { m.cylX(0, 0.5, 0, 0.3, 2.3, 8, C("#d8dbe0")); rail(m, 0.8, 2.3, 0.14, 0.2); for (const x of [-0.9, 0.9]) m.box(x, 0, 0, 0.3, 0.55, 0.4, C("#7d8796")); },
        c: (m) => { m.box(-0.45, 0, 0, 0.8, 0.8, 0.8, C("#c9a26b"), { shade: 0.76 }); m.box(0.5, 0, 0.1, 0.65, 0.62, 0.65, C("#b78e58"), { shade: 0.76 }); m.box(0.1, 0.8, 0, 0.5, 0.42, 0.5, C("#d6b47e"), { shade: 0.76 }); },
        s: (m) => { posts(m, 3.2, C("#e8432e"), 2.34); m.box(0, 1.5, 0, 2.5, 1.1, 0.6, C("#d8dbe0"), { shade: 0.74, bottom: true }); banner(m, 1.42, 2.5, 0.24, YEL, DARK); m.box(0, 2.6, 0, 2.5, 0.16, 0.9, C("#7d8796"), { bottom: true }); },
        B: (m) => { m.box(0, 0.42, 0, 1.8, 0.6, 2.4, C("#e9ecef"), { shade: 0.74 }); for (const x of [-1, 1]) for (const z of [-0.85, 0, 0.85]) m.cylX(x * 0.95, 0.36, z, 0.36, 0.26, 8, C("#d8c7a0"), { cap: DARK }); m.cyl(0, 1, -0.3, 0.1, 0.9, 6, STEEL); m.cyl(0, 1.75, -0.3, 0.75, 0.5, 8, C("#ffc933"), { r2: 0.12, shade: 0.7 }); m.box(0, 1, 0.7, 1.1, 0.8, 0.8, GLASS, { taper: 0.8, top: C("#e8432e") }); },
        L: (m) => { m.box(0, 0.3, -1.5, 2.1, 1, 3, C("#7d8796"), { shade: 0.72 }); m.box(0, 1.3, -1.4, 1.5, 1.1, 2, C("#e9ecef"), { shade: 0.76 }); for (const x of [-1.04, 1.04]) m.box(x, 0, -1.5, 0.3, 0.6, 3, DARK); m.box(0, 1.8, -2.41, 1.2, 0.4, 0.03, GLASS); },
        Lb: (m) => { m.box(0, 0.3, 0.5, 2.1, 1, 1, C("#747e8d"), { shade: 0.72 }); for (const x of [-1.04, 1.04]) m.box(x, 0, 0.5, 0.3, 0.6, 1, DARK); m.box(0, 1.3, 0.5, 1.6, 0.14, 1, C("#ffc933")); },
        v: (m) => car(m, C("#e9ecef"), { front: true, h: 1.1, w: 1.9, len: 3.4 }),
    },
};

function chicken(m, col) {
    m.ball(0, 0.42, 0, 0.32, 7, 4, col, { sz: 1.25 });
    m.at(0, 0.62, -0.32, 0); m.ball(0, 0.14, 0, 0.17, 6, 3, col); m.box(0, 0.26, 0, 0.05, 0.1, 0.16, RED); m.box(0, 0.12, -0.2, 0.08, 0.05, 0.1, YEL); m.reset();
    m.box(0, 0.54, 0.46, 0.2, 0.26, 0.1, mul(col, 0.9));
    m.box(-0.12, 0, 0, 0.05, 0.2, 0.05, YEL); m.box(0.12, 0, 0, 0.05, 0.2, 0.05, YEL);
}

function eggMesh(a) {
    a.lathe("egg", [[0.001, 0], [0.2, 0.05], [0.31, 0.22], [0.33, 0.4], [0.27, 0.6], [0.14, 0.76], [0.001, 0.82]], { segments: 9, color: "#ffc72e" });
}

// Each disguise as worn. All are built around the point they attach to.
function disguises(a) {
    let m = new MB();                     // Moustache: two fat curls under the beak.
    const brown = C("#6a3d1c"), b2 = C("#83502a");
    for (const s of [-1, 1]) {
        m.at(0, 0, 0, 0);
        m.quad([0, 0.04, 0], [s > 0 ? 0.2 : -0.2, 0.08, 0.04], [s > 0 ? 0.2 : -0.2, -0.05, 0.04], [0, -0.05, 0], b2);
        m.quad([s * 0.2, 0.08, 0.04], [s * 0.34, 0.2, 0.08], [s * 0.3, 0.02, 0.08], [s * 0.2, -0.05, 0.04], brown);
        if (s < 0) { const p = m.pos, n = p.length; }
    }
    m = doubleSided(m); a.mesh("d_moustache", toMesh(m));
    m = new MB();                         // Boot and wheels, one foot.
    m.box(0, 0.16, 0, 0.3, 0.4, 0.46, C("#ff5d73"), { taper: 0.84, top: WHITE });
    m.box(0, 0.08, 0, 0.32, 0.08, 0.52, WHITE);
    for (const z of [-0.18, 0.18]) m.cylX(0, 0.06, z, 0.09, 0.3, 7, YEL, { cap: C("#ff8a3c") });
    a.mesh("d_skate", toMesh(m));
    m = new MB();                         // Twin tanks, bolted to a back plate.
    for (const x of [-0.3, 0.3]) { m.cyl(x, -0.5, 0, 0.24, 0.95, 8, C("#e8432e"), { top: C("#ffb52e") }); m.cyl(x, 0.45, 0, 0.24, 0.26, 8, YEL, { r2: 0.02 }); m.cyl(x, -0.72, 0, 0.1, 0.22, 7, DARK, { r2: 0.2, cap: false }); }
    m.box(0, -0.3, -0.26, 0.9, 0.64, 0.1, STEEL);
    a.mesh("d_jet", toMesh(m));
    m = new MB();                         // A flame: unlit, stretched by the rig.
    m.cyl(0, 0, 0, 0.18, 1, 7, [1.5, 0.75, 0.2], { r2: 0.02, shade: 1.2 });
    a.mesh("flame", toMesh(m));
    m = new MB();                         // The dress: bodice and a big bell skirt, around the body.
    const lace = C("#fff6f2"), shade = C("#f3dfe6");
    m.cyl(0, -1.0, 0.1, 1.05, 1.0, 10, shade, { r2: 0.74, shade: 0.9, top: lace });
    m.cyl(0, -0.55, 0.1, 0.92, 0.1, 10, lace, { r2: 0.95, cap: false });
    m.ball(0, 0.04, 0, 0.8, 8, 5, lace, { sy: 0.64, sz: 1.14, shade: false });
    a.mesh("d_dress", toMesh(m));
    m = new MB();                         // One link of the train: a flared panel.
    m.quad([-0.5, 0, 1], [0.5, 0, 1], [0.32, 0, 0], [-0.32, 0, 0], shade, shade, lace, lace);
    m = doubleSided(m); a.mesh("d_train", toMesh(m));
    m = new MB();                         // Veil and tiara, on the head.
    m.quad([-0.3, -0.5, 0.42], [0.3, -0.5, 0.42], [0.12, 0.2, 0], [-0.12, 0.2, 0], shade, shade, lace, lace);
    m = doubleSided(m);
    m.box(0, 0.16, 0, 0.3, 0.1, 0.18, mul(YEL, 1.2));
    a.mesh("d_veil", toMesh(m));
    m = new MB();                         // Hi-vis waistcoat.
    const hv = C("#d6f030");
    m.ball(0, 0, 0, 0.83, 8, 5, hv, { sy: 0.66, sz: 1.16, shade: false });
    m.at(0, 0, 0, 0);
    for (const z of [-0.52, 0.44]) m.box(0, -0.5, z, 1.72, 1, 0.1, C("#f0f3f5"), { taperX: 0.7, shade: 1, top: hv });
    m.reset();
    a.mesh("d_vest", toMesh(m));
    m = new MB();                         // Hard hat.
    m.ball(0, 0, 0, 0.3, 8, 4, C("#ffb52e"), { sy: 0.8 });
    m.box(0, -0.01, 0.03, 0.72, 0.05, 0.74, C("#ffb52e"));
    a.mesh("d_hat", toMesh(m));
    // The pickups: one showpiece per disguise, drawn large and read from far away.
    m = new MB();
    for (const s of [-1, 1]) {
        m.quad([s * 0.1, 0.14, 0], [s * 1.0, 0.3, 0], [s * 0.9, -0.2, 0], [s * 0.1, -0.2, 0], ...(s > 0 ? [brown] : [brown]));
        m.quad([s * 1.0, 0.3, 0], [s * 1.5, 0.75, 0], [s * 1.42, 0.2, 0], [s * 0.9, -0.2, 0], b2);
    }
    m = doubleSided(m); a.mesh("p_moustache", toMesh(m));
    m = new MB();
    for (const x of [-0.5, 0.5]) { m.box(x, 0.3, 0, 0.62, 0.9, 1.0, C("#ff5d73"), { taper: 0.82, top: WHITE }); m.box(x, 0.18, 0, 0.66, 0.14, 1.1, WHITE); for (const z of [-0.36, 0.36]) m.cylX(x, 0.14, z, 0.18, 0.6, 8, YEL, { cap: C("#ff8a3c") }); }
    a.mesh("p_skates", toMesh(m));
    m = new MB();
    for (const x of [-0.5, 0.5]) { m.cyl(x, 0, 0, 0.42, 1.4, 8, C("#e8432e"), { top: C("#ffb52e") }); m.cyl(x, 1.4, 0, 0.42, 0.5, 8, YEL, { r2: 0.03 }); m.cyl(x, -0.32, 0, 0.16, 0.34, 7, DARK, { r2: 0.34, cap: false }); }
    m.box(0, 0.4, -0.3, 1.5, 0.9, 0.14, STEEL);
    a.mesh("p_jetpack", toMesh(m));
    m = new MB();
    m.cyl(0, 0, 0, 1.1, 1.3, 10, shade, { r2: 0.34, shade: 0.9, top: lace });
    m.cyl(0, 1.3, 0, 0.34, 0.6, 8, lace, { r2: 0.4 });
    for (const a2 of [0, 1, 2, 3, 4, 5, 6, 7]) m.ball(Math.cos(a2 * 0.785) * 1.05, 0.08, Math.sin(a2 * 0.785) * 1.05, 0.13, 5, 3, WHITE, { shade: false });
    a.mesh("p_dress", toMesh(m));
    m = new MB();
    m.box(0, 0, 0, 1.5, 1.8, 0.6, hv, { taperX: 0.74, shade: 0.9 });
    for (const y of [0.5, 1.05]) m.box(0, y, 0, 1.54, 0.2, 0.64, C("#f0f3f5"), { shade: 1 });
    m.box(0, 1.5, 0, 0.5, 0.31, 0.64, C("#ff8a22"));
    a.mesh("p_hivis", toMesh(m));
    m = new MB();                         // A bright hoop that frames each pickup.
    const ringC = [1.3, 1.1, 0.55], seg = 16, R = 1.8, r = 0.1;
    for (let i = 0; i < seg; i++) {
        const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
        const P = (t, k) => [Math.cos(t) * (R + k), Math.sin(t) * (R + k), 0];
        m.quad(P(a0, -r), P(a1, -r), P(a1, r), P(a0, r), ringC);
    }
    m = doubleSided(m); a.mesh("ring", toMesh(m));
}

/** Duplicate faces back to front, for thin things seen from both sides. */
function doubleSided(m) {
    const n = m.verts;
    for (let i = 0; i < n; i++) {
        m.pos.push(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]);
        m.nor.push(-m.nor[i * 3], -m.nor[i * 3 + 1], -m.nor[i * 3 + 2]);
        m.col.push(m.col[i * 3], m.col[i * 3 + 1], m.col[i * 3 + 2]);
    }
    const t = m.idx.length;
    for (let i = 0; i < t; i += 3) m.idx.push(m.idx[i] + n, m.idx[i + 2] + n, m.idx[i + 1] + n);
    return m;
}
const toMesh = (m) => ({ positions: m.pos, normals: m.nor, colors: m.col, indices: m.idx });

/** A ragged, feathery ellipsoid: a low-poly ball with its lower rim pulled into points. */
function fluff(m, cx, cy, cz, r, sx, sy, sz, col, tip) {
    const seg = 10, rings = 5;
    const P = (i, j) => {
        const t = i / rings * Math.PI, p = j / seg * Math.PI * 2, ragged = i === rings - 1 && j % 2 ? 1.2 : 1;
        return [cx + r * sx * Math.sin(t) * Math.cos(p) * ragged, cy + r * sy * Math.cos(t) * (i === rings - 1 ? (j % 2 ? 1.15 : 0.9) : 1), cz + r * sz * Math.sin(t) * Math.sin(p) * ragged];
    };
    for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
        const c = i > 2 ? mix(col, tip, (i - 2) * 0.28 * (j % 3 ? 0.5 : 1)) : mul(col, 1 + 0.12 * ((i + j) % 2));
        const a = P(i, j), b = P(i, j + 1), d = P(i + 1, j), e = P(i + 1, j + 1);
        if (i === 0) m.tri(a, e, d, c); else if (i === rings - 1) m.tri(a, b, d, c); else m.quad(a, b, e, d, c, c, c, c);
    }
}

/** Unit parts the rigs share. One geometry means one draw call however many limbs are on screen. */
function limbs(a) {
    let m = new MB();
    m.cyl(0, 0, 0, 1, 1, 7, [1, 1, 1], { shade: 0.86, r2: 0.82 });
    a.mesh("limb", toMesh(m));
    m = new MB();
    m.ball(0, 0, 0, 1, 8, 5, [1, 1, 1], { shade: false });
    a.mesh("orb", toMesh(m));
}

function ostrich(a, o) {
    const body = C(o.body), tip = C(o.tip), skin = C(o.skin), leg = C(o.leg), beak = C(o.beak), id = o.id;
    let m = new MB();
    fluff(m, 0, 0, 0, 1, 0.76, 0.62, 1.1, body, tip);
    fluff(m, 0, 0.38, -0.72, 0.42, 0.9, 0.9, 1.0, mix(body, tip, 0.08), body);     // The chest ruff where the neck starts.
    a.mesh(`o_body_${id}`, toMesh(m));
    m = new MB();                         // A wing is a fan of pale-tipped plumes.
    for (let i = 0; i < 4; i++) {
        const z = 0.14 * i, l = 1.05 - i * 0.05, w = 0.2;
        m.quad([0, 0, z], [0, 0, z + w], [0.1, -0.3, z + w + 0.1 + l * 0.5], [0, 0.0, z + l], body);
        m.tri([0, 0, z + l], [0.1, -0.3, z + w + 0.1 + l * 0.5], [0.08, -0.2, z + l + 0.35], tip);
    }
    m = doubleSided(m); a.mesh(`o_wing_${id}`, toMesh(m));
    m = new MB();                         // The tail: a daft pale pom-pom of plumes.
    fluff(m, 0, 0.1, 0.3, 0.55, 0.85, 0.75, 0.95, tip, mix(tip, body, 0.3));
    for (const [x, y] of [[-0.3, 0.2], [0, 0.42], [0.3, 0.2]]) m.ball(x, y, 0.75, 0.2, 5, 3, mul(tip, 1.05), { sz: 1.5 });
    a.mesh(`o_tail_${id}`, toMesh(m));
    m = new MB();                         // Head, looking down -z, with bulging eyes that read from behind.
    m.ball(0, 0, 0, 0.3, 8, 5, skin, { sz: 1.2, sy: 0.9, shade: false });
    for (const s of [-1, 1]) { m.ball(s * 0.21, 0.09, -0.05, 0.2, 8, 5, WHITE, { shade: false }); m.ball(s * 0.2, 0.2, -0.04, 0.14, 6, 2, mix(skin, DARK, 0.25), { sy: 0.34 }); }
    m.box(0, -0.1, -0.46, 0.34, 0.11, 0.54, beak, { taperX: 0.74, taperZ: 1, shade: 0.8 });
    m.ball(0, 0.26, 0.05, 0.1, 5, 3, tip); m.ball(0.06, 0.32, 0.12, 0.08, 5, 3, tip); m.ball(-0.06, 0.3, 0, 0.07, 5, 3, tip);
    if (o.hat === "bow") { m.ball(-0.15, 0.32, 0.02, 0.13, 6, 3, C("#ffd166"), { sz: 0.5 }); m.ball(0.15, 0.32, 0.02, 0.13, 6, 3, C("#ffd166"), { sz: 0.5 }); m.ball(0, 0.32, 0.02, 0.06, 5, 3, C("#ff8a3c")); }
    if (o.hat === "mullet") { m.ball(0, 0.18, 0.14, 0.3, 7, 4, C("#4d3219"), { sy: 0.8, sz: 1.2 }); for (const x of [-0.14, 0, 0.14]) m.box(x, -0.3, 0.3, 0.14, 0.5, 0.1, C("#4d3219"), { taper: 0.5 }); }
    if (o.hat === "tophat") { m.cyl(0, 0.24, 0, 0.3, 0.05, 9, DARK); m.cyl(0, 0.29, 0, 0.19, 0.42, 9, DARK, { r2: 0.22 }); m.cyl(0, 0.3, 0, 0.2, 0.08, 9, C("#c23a3a"), { cap: false }); m.cyl(0.21, 0.05, -0.2, 0.09, 0.01, 8, C("#ffe680")); }
    if (o.hat === "afro") m.ball(0, 0.3, 0.06, 0.42, 8, 5, C("#2b1a3f"), { shade: false });
    a.mesh(`o_head_${id}`, toMesh(m));
    m = new MB();
    m.box(0, -0.06, -0.24, 0.3, 0.06, 0.5, mul(beak, 0.84), { taperX: 0.74 });
    m.quad([-0.12, 0.002, 0], [0.12, 0.002, 0], [0.09, 0.002, -0.46], [-0.09, 0.002, -0.46], C("#d8405a"));
    a.mesh(`o_jaw_${id}`, toMesh(m));
    m = new MB();                         // Two-toed foot.
    m.box(0, 0, -0.16, 0.14, 0.12, 0.42, leg, { taperX: 0.7 });
    m.box(-0.13, 0, -0.1, 0.1, 0.09, 0.3, mul(leg, 0.92), { taperX: 0.7 });
    m.box(0, 0, -0.42, 0.05, 0.05, 0.1, DARK);
    a.mesh(`o_foot_${id}`, toMesh(m));
}

function farmer(a) {
    const shirt = C("#d94f3d"), denim = C("#3f6fb5"), skin = C("#ffbe94"), straw = C("#ecc86a"), boot = C("#5a3a22");
    let m = new MB();                     // Torso: overalls over a check shirt, facing -z. Centre at the waist.
    m.box(0, 0, 0, 0.92, 0.62, 0.56, denim, { taper: 0.98 });
    m.box(0, 0.6, 0, 0.92, 0.66, 0.56, shirt, { taperX: 1.1 });
    m.box(0, 0.5, -0.29, 0.54, 0.46, 0.03, denim);
    for (const x of [-0.24, 0.24]) { m.box(x, 0.9, -0.29, 0.1, 0.4, 0.04, denim); m.box(x, 0.9, 0.29, 0.1, 0.4, 0.04, denim); }
    a.mesh("f_body", toMesh(m));
    m = new MB();                         // Head: a beetroot face under a huge straw hat, with a walrus moustache.
    m.ball(0, 0, 0, 0.36, 8, 5, skin, { sy: 1.05, shade: false });
    m.ball(0, 0, -0.27, 0.14, 6, 3, C("#ff8e73"));
    for (const s of [-1, 1]) { m.ball(s * 0.15, 0.1, -0.29, 0.085, 6, 3, WHITE); m.ball(s * 0.15, 0.09, -0.355, 0.04, 5, 2, DARK); m.at(s * 0.15, 0.22, -0.3, 0); m.box(0, 0, 0, 0.26, 0.07, 0.07, C("#6d6660")); m.reset(); }
    m.at(0, -0.16, -0.31, 0); m.ball(-0.15, 0, 0, 0.17, 6, 3, C("#8a8177"), { sy: 0.55, sz: 0.5 }); m.ball(0.15, 0, 0, 0.17, 6, 3, C("#8a8177"), { sy: 0.55, sz: 0.5 }); m.reset();
    m.cyl(0, 0.26, 0, 0.76, 0.06, 10, straw, { r2: 0.42, top: straw, shade: 0.8 });
    m.cyl(0, 0.3, 0, 0.36, 0.3, 9, mul(straw, 1.06), { r2: 0.3 });
    m.cyl(0, 0.3, 0, 0.37, 0.08, 9, RED, { cap: false });
    a.mesh("f_head", toMesh(m));
    m = new MB();                         // Pitchfork along +y from the grip.
    m.cyl(0, -0.9, 0, 0.045, 2.6, 5, WOOD);
    m.box(0, 1.7, 0, 0.56, 0.06, 0.06, STEEL);
    for (const x of [-0.25, 0, 0.25]) m.cyl(x, 1.7, 0, 0.035, 0.56, 4, STEEL, { r2: 0.002 });
    a.mesh("f_fork", toMesh(m));
    m = new MB();                         // Boot.
    m.box(0, 0, -0.08, 0.3, 0.2, 0.52, boot, { taperX: 0.86 });
    a.mesh("f_boot", toMesh(m));
    // What the farmer rides as the chase gets sillier. Each sits on the ground at his feet.
    m = new MB(); tractor(m, C("#e23b2e")); a.mesh("r_tractor", toMesh(m));
    m = new MB();                         // Baggage cart.
    m.box(0, 0.3, 0, 1.5, 0.3, 2.2, C("#ffc933"), { shade: 0.74 });
    for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) m.cylX(x, 0.26, z, 0.26, 0.2, 7, TYRE, { cap: STEEL });
    for (const x of [-0.7, 0.7]) m.box(x, 0.6, 0.9, 0.08, 1.6, 0.08, STEEL);
    m.box(0, 2.2, 0.3, 1.7, 0.1, 1.8, C("#e8432e"));
    a.mesh("r_cart", toMesh(m));
    m = new MB();                         // Skis.
    for (const x of [-0.26, 0.26]) { m.box(x, 0, 0, 0.14, 0.05, 2.2, C("#e8432e"), { shade: 1 }); m.box(x, 0.05, -1.1, 0.14, 0.14, 0.1, C("#e8432e")); }
    a.mesh("r_skis", toMesh(m));
    m = new MB();                         // A rocket strapped between his legs. Nobody signed this off.
    m.at(0, 0.7, 0, 0);
    m.cylZ(0, 0, 0, 0.4, 2.5, 9, C("#f0f3f5"), { r2: 0.4 });
    m.cylZ(0, 0, -1.7, 0.4, 0.9, 9, RED, { r2: 0.02 });
    for (const x of [-1, 1]) m.box(x * 0.5, -0.05, 1, 0.5, 0.08, 0.6, RED);
    m.reset();
    a.mesh("r_rocket", toMesh(m));
}

export function registerModels(game) {
    const a = game.assets;
    for (const [b, set] of Object.entries(OBSTACLES)) for (const [k, fn] of Object.entries(set)) {
        const m = new MB(); fn(m); a.mesh(`ob_${b}_${k}`, toMesh(m));
    }
    let m = new MB(); chicken(m, C("#fff5e4")); a.mesh("chicken", toMesh(m));
    eggMesh(a); limbs(a); disguises(a); farmer(a);
    m = new MB();                         // Debris: a chip, a feather and a confetti square.
    m.tri([-0.5, 0, 0], [0.5, 0, 0], [0, 0.8, 0.2], [1, 1, 1]); m = doubleSided(m); a.mesh("chip", toMesh(m));
    m = new MB();
    m.quad([-0.14, 0, 0], [0.14, 0, 0], [0.06, 0.9, 0.1], [-0.06, 0.9, 0.1], [1, 1, 1]); m = doubleSided(m); a.mesh("feather", toMesh(m));
    for (const o of OSTRICHES) ostrich(a, o);
}
export { doubleSided, toMesh, fluff };
