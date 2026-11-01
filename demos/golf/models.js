// Every solid thing that isn't the course itself: ball skins, plants, bumpers, flags, trees, the volcano.
import { MB, hex, mix, mul } from "./meshkit.js";
import { LOOK } from "./look.js";

export const SKINS = [
    { id: "pearl", name: "Sea Pearl", a: "#fffdf5", b: "#ffd9c7", trail: "#ffffff", how: "Yours from the start", pat: "dimple", test: () => true },
    { id: "coral", name: "Coral Crush", a: "#ff6a57", b: "#fff0e0", trail: "#ff8a70", how: "Finish hole 3", pat: "band", test: (s) => s.done >= 3 },
    { id: "melon", name: "Pocket Melon", a: "#2fb050", b: "#134f2c", c: "#ff5a6e", trail: "#7cf29a", how: "Three birdies", pat: "stripe", test: (s) => s.birdies >= 3 },
    { id: "cocoa", name: "Coconut", a: "#7a4a2a", b: "#4a2a18", trail: "#d7b08a", how: "Finish Coconut Cove", pat: "spots", test: (s) => s.islandDone[0] },
    { id: "eye", name: "Peeper", a: "#ffffff", b: "#2f7dff", c: "#10131c", trail: "#8fc0ff", how: "Find 3 secret shells", pat: "eye", test: (s) => s.shells >= 3 },
    { id: "beach", name: "Beach Bash", a: "#ffd23f", b: "#ff4f8b", c: "#23c4e8", trail: "#ffd23f", how: "Your first hole in one", pat: "wedge", test: (s) => s.aces >= 1 },
    { id: "frost", name: "Frostbite", a: "#c9f4ff", b: "#4aa8ff", trail: "#bff1ff", how: "Finish Frostbite Fumarole", pat: "band", test: (s) => s.islandDone[1] },
    { id: "moon", name: "Pale Moon", a: "#c8c8d8", b: "#8d8da6", trail: "#e0e0f0", how: "Ten pars or better on ice", pat: "spots", test: (s) => s.icePars >= 10 },
    { id: "shell", name: "Lucky Shell", a: "#ffc7e2", b: "#ff6fb1", trail: "#ffb0d8", how: "Find 12 secret shells", pat: "stripe", test: (s) => s.shells >= 12 },
    { id: "ember", name: "Ember Core", a: "#2a1a22", b: "#ff7a1a", glow: 1.8, trail: "#ff8a2a", how: "Finish the Molten Crown", pat: "crack", test: (s) => s.islandDone[2] },
    { id: "trophy", name: "Cup Winner", a: "#ffc53d", b: "#c8841a", trail: "#ffe08a", how: "Win a Volcano Cup", pat: "band", shine: 1, test: (s) => s.cups >= 1 },
    { id: "ace", name: "Ace of Aces", a: "#ffffff", b: "#ff4fd0", c: "#3fd7ff", trail: "#ff8fe8", how: "Five holes in one", pat: "wedge", shine: 1, test: (s) => s.aces >= 5 },
    { id: "gold", name: "Grumble's Gold", a: "#ffd86b", b: "#ff9d1a", glow: 1.25, trail: "#ffe9a0", how: "All 27 shells", pat: "crack", shine: 1, test: (s) => s.shells >= 27 },
];

function skinColor(k, dx, dy, dz) {
    const A = hex(k.a), B = hex(k.b), C = k.c ? hex(k.c) : A, g = k.glow ?? 1;
    switch (k.pat) {
        case "band": return Math.abs(dy) < 0.28 ? mul(B, g) : A;
        case "stripe": return Math.sin(Math.atan2(dz, dx) * 5) > 0.1 ? A : B;
        case "wedge": { const w = Math.floor((Math.atan2(dz, dx) + Math.PI) / (Math.PI * 2) * 6) % 3; return w === 0 ? A : w === 1 ? B : C; }
        case "eye": { const f = Math.hypot(dx, dy); if (dz > 0.85 && f < 0.2) return C; if (dz > 0.5 && f < 0.5) return B; return A; }
        case "spots": { const v = Math.sin(dx * 7.3 + 1) * Math.sin(dy * 8.1 + 2) * Math.sin(dz * 6.7 + 3); return v > 0.12 ? B : A; }
        case "crack": { const v = Math.abs(Math.sin(dx * 6 + Math.sin(dy * 5) * 1.5) * Math.sin(dz * 6.5 + Math.sin(dx * 4) * 1.5)); return v < 0.14 ? mul(B, g * 1.1) : A; }
        default: { const v = Math.sin(dx * 12) * Math.sin(dy * 12) * Math.sin(dz * 12); return v > 0.55 ? B : A; }
    }
}

export function buildModels(game) {
    const a = game.assets;
    const reg = (name, fn) => { const m = new MB(); fn(m); m.register(a, name); };
    for (const k of SKINS) reg("ball_" + k.id, (m) => m.orb(0, 0, 0, 0.5, 22, 16, (x, y, z) => skinColor(k, x, y, z)));

    reg("flagpole", (m) => { m.cyl(0, 0, 0, 0.035, 2.6, 6, hex("#fff4e0"), { shade: 1 }).orb(0, 2.62, 0, 0.09, 8, 6, hex("#ffc53d")); });
    for (let f = 0; f < 4; f++) reg("flag" + f, (m) => {
        const c1 = hex("#ff4a4a"), c2 = hex("#ff8a5a"), N = 7, W = 1.05, H = 0.6, ph = f / 4 * Math.PI * 2;
        for (let i = 0; i < N; i++) {
            const u0 = i / N, u1 = (i + 1) / N, W0 = (u) => Math.sin(u * 5 + ph) * 0.1 * u;
            const h0 = H * (1 - u0 * 0.9) * 0.5, h1 = H * (1 - u1 * 0.9) * 0.5, y = 0;
            const q = [[u0 * W, y - h0, W0(u0)], [u1 * W, y - h1, W0(u1)], [u1 * W, y + h1, W0(u1)], [u0 * W, y + h0, W0(u0)]], col = i % 2 ? c1 : mix(c1, c2, 0.7);
            m.quad(q[0], q[1], q[2], q[3], col); m.quad(q[3], q[2], q[1], q[0], mul(col, 0.8));
        }
    });
    reg("cupwall", (m) => { m.lathe(0, 0, 0, [[0.001, -0.7], [0.38, -0.7], [0.38, -0.7], [0.4, 0.002]], 22, (t) => mix([0.03, 0.03, 0.05], [0.25, 0.24, 0.22], t * t)); });
    reg("cupring", (m) => { const seg = 28; for (let i = 0; i < seg; i++) { const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, R0 = 0.385, R1 = 0.49; const P = (r, t) => [Math.cos(t) * r, 0, Math.sin(t) * r], c = [1.25, 1.25, 1.2]; m.quad(P(R1, a1), P(R1, a0), P(R0, a0), P(R0, a1), c); } });
    reg("blob", (m) => { const seg = 16; for (let i = 0; i < seg; i++) { const t0 = i / seg * 6.2832, t1 = (i + 1) / seg * 6.2832; m.tri([0, 0, 0], [Math.cos(t1), 0, Math.sin(t1)], [Math.cos(t0), 0, Math.sin(t0)], [0, 0, 0]); } });
    reg("tee", (m) => {
        const w = hex("#1d3f66"), r = hex("#ffc53d");
        m.box(0, -0.02, 0, 1.5, 0.05, 1.5, r, { shade: 0.7 }); m.box(0, 0.02, 0, 1.3, 0.02, 1.3, w, { shade: 0.8 });
    });

    // Bumper: a fat sea-urchin drum, lit from inside.
    reg("bumper", (m) => {
        m.lathe(0, 0, 0, [[0.55, 0], [0.62, 0.05], [0.62, 0.3], [0.5, 0.36], [0.46, 0.6], [0.56, 0.68], [0.52, 0.82], [0.3, 0.92], [0.01, 0.95]], 22, (t, a) => t < 0.32 ? hex("#2a2140") : t < 0.5 ? [1.6, 0.42, 1] : t < 0.75 ? hex("#ffe36b") : [1.3, 1.2, 0.9]);
        for (let i = 0; i < 8; i++) { const t = i / 8 * 6.2832; m.orb(Math.cos(t) * 0.61, 0.18, Math.sin(t) * 0.61, 0.055, 6, 4, [1.5, 1.4, 1.1]); }
    });
    reg("rockpost", (m) => { m.cyl(0, -0.1, 0, 1.02, 0.55, 7, hex("#8d7c76"), { r2: 0.82, shade: 0.7 }).cyl(0, 0.45, 0, 0.82, 0.55, 7, hex("#9c8a80"), { r2: 0.42, shade: 0.8, rot: 0.3 }); });
    reg("rockpostice", (m) => { m.cyl(0, -0.1, 0, 1.02, 0.7, 6, hex("#9fdcf5"), { r2: 0.7, shade: 0.75 }).cyl(0, 0.6, 0, 0.7, 0.6, 6, hex("#d7f4ff"), { r2: 0.05, rot: 0.5 }); });

    // Plants. The head is two jaws on a hinge; the stem and leaves don't move.
    for (const [id, P] of [["plant", { skin: "#e8345f", skin2: "#ff8a5a", stem: "#2e9e4f", leaf: "#3fc060", in: "#7a1236" }], ["plantice", { skin: "#3f8cff", skin2: "#a3f0ff", stem: "#3fa5a5", leaf: "#6fd9c9", in: "#1a2a7a" }]]) {
        reg(id + "stem", (m) => {
            const st = hex(P.stem), lf = hex(P.leaf);
            m.lathe(0, 0, 0, [[0.34, 0], [0.26, 0.2], [0.18, 0.5], [0.15, 0.85], [0.17, 1.05]], 8, (t) => mix(mul(st, 0.75), st, t));
            for (let i = 0; i < 5; i++) {
                const t = i / 5 * 6.2832 + 0.4, L = 1, W = 0.34, cx = Math.cos(t), sz = Math.sin(t), px = -sz, pz = cx, P2 = (u, s, y) => [cx * u + px * s, y, sz * u + pz * s];
                m.quad(P2(0.1, -W * 0.5, 0.1), P2(0.6, -W, 0.28), P2(0.6, W, 0.28), P2(0.1, W * 0.5, 0.1), mul(lf, 0.8));
                m.quad(P2(0.6, -W, 0.28), P2(L, -0.02, 0.04), P2(L, 0.02, 0.04), P2(0.6, W, 0.28), lf);
            }
        });
        const jaw = (m, up) => {
            const s = hex(P.skin), s2 = hex(P.skin2), inn = hex(P.in), N = 10, R = 0.56, sgn = up ? 1 : -1;
            for (let j = 0; j < N; j++) {
                const a0 = (j / N - 0.5) * Math.PI * 1.25, a1 = ((j + 1) / N - 0.5) * Math.PI * 1.25, rim = (a) => [Math.sin(a) * R * 0.9, 0, Math.cos(a) * R], mid = (a, k) => [Math.sin(a) * R * 0.9 * (1 - k * k), sgn * 0.42 * k, Math.cos(a) * R * (1 - k * k) - k * 0.1];
                for (let i = 0; i < 4; i++) {
                    const k0 = i / 4, k1 = (i + 1) / 4, A = mid(a0, k0), B = mid(a1, k0), C = mid(a1, k1), D = mid(a0, k1), col0 = mix(s, s2, up ? k0 : 1 - k0), col1 = mix(s, s2, up ? k1 : 1 - k1);
                    if (up) { m.quad(B, A, D, C, col0, col0, col1, col1); m.quad(A, B, C, D, inn); } else { m.quad(A, B, C, D, col0, col0, col1, col1); m.quad(B, A, D, C, inn); }
                }
                // Teeth along the rim.
                if (j % 1 === 0) { const c = rim((a0 + a1) / 2), l = rim(a0), r = rim(a1); const t = [c[0] * 0.94, -sgn * 0.12, c[2] * 0.94], w = [1.25, 1.2, 1.1]; if (up) { m.tri(l, r, t, w); m.tri(r, l, t, w); } else { m.tri(l, r, t, w); m.tri(r, l, t, w); } }
            }
            // A dark gullet fills the head, so you look down a throat and not through it.
            m.orb(0, sgn * 0.1, -0.1, 0.4, 10, 7, mul(inn, 0.55), { sy: 0.8 });
            if (up) {
                // Eyes on stalks, so it can glare at you.
                for (const e of [-1, 1]) { m.orb(e * 0.26, 0.5, -0.02, 0.15, 10, 7, [1.25, 1.25, 1.25]); m.orb(e * 0.26, 0.52, 0.11, 0.07, 8, 5, [0.05, 0.05, 0.08]); m.box(e * 0.26, 0.62, 0, 0.34, 0.05, 0.2, mul(s, 0.7), { shade: 1 }); }
            }
        };
        reg(id + "up", (m) => jaw(m, true));
        reg(id + "lo", (m) => jaw(m, false));
    }

    reg("vent", (m) => {
        for (let i = 0; i < 9; i++) { const t = i / 9 * 6.2832; m.cyl(Math.cos(t) * 0.8, -0.05, Math.sin(t) * 0.8, 0.27 + (i % 2) * 0.06, 0.2 + (i % 3) * 0.06, 5, hex("#7d7a8c"), { r2: 0.14, rot: i, shade: 0.7 }); }
        m.cyl(0, 0.005, 0, 0.7, 0.01, 18, [0.06, 0.05, 0.08], { shade: 1 });
    });
    reg("plume", (m) => { m.lathe(0, 0, 0, [[0.5, 0], [0.42, 0.25], [0.5, 0.55], [0.7, 0.85], [0.38, 1]], 12, (t) => mix([1.1, 1.1, 1.15], [1.3, 1.3, 1.3], t)); });
    reg("plumelava", (m) => { m.lathe(0, 0, 0, [[0.5, 0], [0.42, 0.25], [0.5, 0.55], [0.7, 0.85], [0.38, 1]], 12, (t) => mix([3, 1.3, 0.2], [2.4, 0.5, 0.1], t)); });
    reg("arrow", (m) => { for (let i = 0; i < 3; i++) { const z = -0.5 + i * 0.5, c = [1.8, 1.5 - i * 0.2, 0.4]; m.quad([-0.5, 0, z + 0.2], [0, 0, z - 0.2], [0, 0, z - 0.02], [-0.5, 0, z + 0.38], c); m.quad([0, 0, z - 0.2], [0.5, 0, z + 0.2], [0.5, 0, z + 0.38], [0, 0, z - 0.02], c); } });
    reg("shell", (m) => {
        const c = hex("#ffd6ec"), d = hex("#ff7fbf");
        for (let i = 0; i < 7; i++) { const t0 = (i / 7 - 0.5) * 2.4, t1 = ((i + 1) / 7 - 0.5) * 2.4, P = (t, r, y) => [Math.sin(t) * r, y, Math.cos(t) * r]; m.quad(P(t0, 0.5, 0), P(t1, 0.5, 0), P(t1, 0.02, 0.5), P(t0, 0.02, 0.5), i % 2 ? c : d, i % 2 ? c : d, [1.3, 1.3, 1.3]); m.quad(P(t1, 0.5, 0), P(t0, 0.5, 0), P(t0, 0.02, 0.5), P(t1, 0.02, 0.5), mul(d, 0.7)); }
    });
    reg("cave", (m) => {
        const r = hex("#6d5a60"), dk = [0.02, 0.015, 0.03];
        for (let i = 0; i < 9; i++) { const t = (i / 8) * Math.PI, R = 1.05 + (i % 3) * 0.1; m.cyl(Math.cos(t) * 0.92, Math.sin(t) * 0.86 - 0.2, 0, 0.42 + (i % 2) * 0.1, 0.7, 6, mul(r, 0.85 + (i % 3) * 0.1), { r2: 0.3, rot: i }); }
        m.quad([-0.8, -0.1, -0.1], [0.8, -0.1, -0.1], [0.8, 0.8, -0.1], [-0.8, 0.8, -0.1], dk);
        m.quad([0.8, -0.1, 0.1], [-0.8, -0.1, 0.1], [-0.8, 0.8, 0.1], [0.8, 0.8, 0.1], dk);
    });
    reg("sweephub", (m) => { m.lathe(0, -0.25, 0, [[0.5, 0], [0.5, 0.4], [0.32, 0.6], [0.01, 0.65]], 14, (t) => t < 0.5 ? hex("#ff6a57") : hex("#ffe36b")); });
    reg("sweepbar", (m) => {
        const c = hex("#ffe36b"), c2 = hex("#2a2140");
        for (let i = 0; i < 6; i++) m.box(0.5 / 6 + i / 6 - 0.5, -0.5, 0, 1 / 6, 1, 1, i % 2 ? c : c2, { shade: 0.75 });
    });

    // Scenery bricks, added straight into the merged prop mesh of a hole.
}

const greens = ["#39b56a", "#2fa45e", "#4cc774"];
export function scenery(m, kind, x, y, z, r, L) {
    const yaw = r() * 6.28, sc = 0.85 + r() * 0.6;
    m.at(x, y, z, yaw, sc);
    switch (kind) {
        case "palm": {
            const tr = hex("#a9764a"), lean = 0.5 + r() * 0.5; let px = 0, py = 0;
            for (let i = 0; i < 6; i++) { const nx = lean * Math.pow((i + 1) / 6, 2) * 1.4; m.quad([px - 0.16, py, 0], [nx - 0.14, py + 0.75, 0], [nx - 0.14, py + 0.75, 0.2], [px - 0.16, py, 0.2], tr); m.quad([px + 0.16, py, 0.2], [nx + 0.14, py + 0.75, 0.2], [nx + 0.14, py + 0.75, 0], [px + 0.16, py, 0], mul(tr, 0.8)); m.quad([px - 0.16, py, 0.2], [nx - 0.14, py + 0.75, 0.2], [nx + 0.14, py + 0.75, 0.2], [px + 0.16, py, 0.2], mul(tr, 0.92 - (i % 2) * 0.1)); m.quad([px + 0.16, py, 0], [nx + 0.14, py + 0.75, 0], [nx - 0.14, py + 0.75, 0], [px - 0.16, py, 0], mul(tr, 0.7)); px = nx; py += 0.75; }
            for (let i = 0; i < 7; i++) {
                const t = i / 7 * 6.28 + 0.3, c = hex(greens[i % 3]), cs = Math.cos(t), sn = Math.sin(t), P = (u, s, h) => [px + cs * u - sn * s, py + h, 0.1 + sn * u + cs * s];
                m.quad(P(0, -0.1, 0), P(1, -0.34, 0.35), P(1, 0.34, 0.35), P(0, 0.1, 0), c);
                m.quad(P(1, -0.34, 0.35), P(1.9, -0.24, -0.1), P(1.9, 0.24, -0.1), P(1, 0.34, 0.35), mul(c, 0.92));
                m.quad(P(1.9, -0.24, -0.1), P(2.5, 0, -0.75), P(2.5, 0.01, -0.75), P(1.9, 0.24, -0.1), mul(c, 0.82));
                m.quad(P(1, 0.34, 0.33), P(1, -0.34, 0.33), P(0, -0.1, -0.02), P(0, 0.1, -0.02), mul(c, 0.6));
            }
            m.orb(px + 0.16, py - 0.12, 0.2, 0.17, 6, 4, hex("#6b4226")).orb(px - 0.15, py - 0.15, 0.05, 0.17, 6, 4, hex("#6b4226"));
            break;
        }
        case "tiki": {
            const w = hex("#b67a44"), d = hex("#7a4a2a"), o = hex("#ff6a57");
            m.box(0, 0, 0, 1, 2.1, 1, w, { shade: 0.7 }).box(0, 2.1, 0, 1.3, 0.22, 1.3, d, { shade: 0.8 });
            m.box(0, 1.25, 0.5, 0.7, 0.16, 0.08, o, { shade: 1 }).box(-0.22, 1.45, 0.5, 0.2, 0.26, 0.06, [1.2, 1.2, 1.1], { shade: 1 }).box(0.22, 1.45, 0.5, 0.2, 0.26, 0.06, [1.2, 1.2, 1.1], { shade: 1 }).box(0, 0.5, 0.5, 0.6, 0.3, 0.08, d, { shade: 1 });
            break;
        }
        case "castle": {
            const s = hex("#f6d99a"), t = hex("#e8c07a");
            m.reset(); m.at(x, y - 0.1, z, 0, 1);
            for (const [a, b] of [[-1.2, 0], [1.2, 0], [0, 0.7], [0, -0.7]]) m.cyl(a, 0, b, 0.42, 1.1, 8, s, { r2: 0.34, shade: 0.8 }).cyl(a, 1.1, b, 0.4, 0.1, 8, t, { shade: 0.9 });
            m.box(0, 0, 0, 2, 0.7, 0.9, t, { shade: 0.8 });
            m.cyl(0, 0.7, 0, 0.3, 0.9, 8, s, { r2: 0.05 }).box(0, 1.55, 0.2, 0.02, 0.5, 0.02, hex("#fff"), { shade: 1 }).box(0.13, 1.92, 0.2, 0.26, 0.16, 0.02, hex("#ff4a4a"), { shade: 1 });
            break;
        }
        case "crystal": {
            for (let i = 0; i < 4; i++) { const a = i * 2.2, R = i ? 0.55 : 0, H = 2.5 - i * 0.5, c = i % 2 ? hex("#c6f2ff") : hex("#8bdcff"); m.cyl(Math.cos(a) * R, 0, Math.sin(a) * R, 0.34, H * 0.72, 5, c, { r2: 0.28, shade: 0.72, cap: false, rot: i }).cyl(Math.cos(a) * R, H * 0.72, Math.sin(a) * R, 0.28, H * 0.28, 5, mix(c, [1, 1, 1], 0.4), { r2: 0, rot: i }); }
            break;
        }
        case "pine": {
            m.cyl(0, 0, 0, 0.16, 0.7, 6, hex("#6b5a70"));
            for (let i = 0; i < 4; i++) m.cyl(0, 0.5 + i * 0.68, 0, 1.2 - i * 0.26, 0.95, 8, i % 2 ? hex("#f0f6ff") : hex("#bcd2f2"), { r2: 0.02, rot: i, shade: 0.72 });
            break;
        }
        case "obsidian": {
            for (let i = 0; i < 4; i++) { const a = i * 1.9, R = i ? 0.7 : 0, H = 3 - i * 0.6, c = mix(hex("#2a1f2e"), hex("#5a3d55"), i / 3); m.cyl(Math.cos(a) * R, 0, Math.sin(a) * R, 0.5 - i * 0.05, H, 4, c, { r2: 0, rot: i * 0.7, shade: 0.55 }); }
            break;
        }
        case "basalt": {
            for (let i = 0; i < 7; i++) { const a = i / 6 * 6.28, R = i ? 0.62 : 0, H = 1.6 + ((i * 37) % 7) * 0.32; m.cyl(Math.cos(a) * R, 0, Math.sin(a) * R, 0.36, H, 6, mix(L.rock2, L.rock, ((i * 13) % 5) / 5), { shade: 0.6, top: mul(L.rock, 1.2) }); }
            break;
        }
        case "fern": { for (let i = 0; i < 6; i++) { const t = i / 6 * 6.28, cs = Math.cos(t), sn = Math.sin(t), c = hex(greens[i % 3]), P = (u, s, h) => [cs * u - sn * s, h, sn * u + cs * s]; m.quad(P(0, -0.1, 0), P(0.6, -0.16, 0.5), P(0.6, 0.16, 0.5), P(0, 0.1, 0), c); m.quad(P(0.6, -0.16, 0.5), P(1.1, 0, 0.2), P(1.1, 0, 0.2), P(0.6, 0.16, 0.5), mul(c, 0.85)); } break; }
        case "stone": m.cyl(0, -0.2, 0, 0.8 + r() * 0.8, 0.6 + r() * 1, 6, mix(L.cliff, L.cliff2, r()), { r2: 0.3 + r() * 0.3, rot: r() * 3, shade: 0.7 }); break;
        case "flower": { const c = hex(["#ff4f8b", "#ffd23f", "#ff8a3d"][Math.floor(r() * 3)]); m.cyl(0, 0, 0, 0.03, 0.4, 4, hex("#2fa45e")); for (let i = 0; i < 5; i++) { const t = i * 1.257; m.ball(Math.cos(t) * 0.14, 0.42, Math.sin(t) * 0.14, 0.12, 5, 3, c, { sy: 0.5 }); } m.ball(0, 0.45, 0, 0.08, 5, 3, hex("#ffe36b")); break; }
    }
    m.reset();
}
