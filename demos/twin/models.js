// Every moving thing in the house, built from flat-shaded primitives. Models face +x. Monsters get an ink outline.
import { MB, hex, mix, mul } from "./meshkit.js";

const INK = hex("#1b1420");
const glow = (h, k = 2) => mul(hex(h), k);

function eyes(m, x, y, z, gap, r, white = "#fff7e8", pupil = "#17121c", look = 0.5) {
    for (const s of [-1, 1]) {
        m.ball(x, y, z + s * gap, r, 6, 4, hex(white), { shade: false, sx: 0.55 });
        m.ball(x + r * 0.42, y, z + s * gap, r * look, 5, 3, hex(pupil), { shade: false, sx: 0.5 });
    }
}

function tufts(m, cx, cy, cz, r, n, col, len, seed) {
    // Cones scattered over a sphere: reads as fur from above.
    for (let i = 0; i < n; i++) {
        const y = 1 - (i + 0.5) / n * 1.7, a = i * 2.399 + seed, q = Math.sqrt(Math.max(0, 1 - y * y));
        const nx = Math.cos(a) * q, nz = Math.sin(a) * q, ny = y;
        const px = cx + nx * r, py = cy + ny * r, pz = cz + nz * r;
        const tip = [px + nx * len, py + ny * len, pz + nz * len];
        // A small triangle fan facing out.
        const ux = Math.abs(ny) > 0.9 ? 1 : 0, uz = 1 - ux;
        const bx = ny * uz, by = nz * ux - nx * uz, bz = -ny * ux;
        const bl = Math.hypot(bx, by, bz) || 1, wx = bx / bl * len * 0.5, wy = by / bl * len * 0.5, wz = bz / bl * len * 0.5;
        const vx = ny * wz - nz * wy, vy = nz * wx - nx * wz, vz = nx * wy - ny * wx;
        const a0 = [px + wx, py + wy, pz + wz], a1 = [px + vx, py + vy, pz + vz], a2 = [px - wx, py - wy, pz - wz], a3 = [px - vx, py - vy, pz - vz];
        const dark = mul(col, 0.8);
        m.tri(a0, a1, tip, dark, dark, col); m.tri(a1, a2, tip, dark, dark, col); m.tri(a2, a3, tip, dark, dark, col); m.tri(a3, a0, tip, dark, dark, col);
    }
}

export function registerModels(game) {
    const A = game.assets, reg = (name, m) => m.register(A, name);

    // --- The robot --------------------------------------------------------------------------
    {
        const m = new MB(), red = hex("#e23b34"), black = hex("#23202b"), steel = hex("#c9d2dc"), cream = hex("#fff1dc");
        m.cyl(0, 0.05, 0, 0.62, 0.22, 20, black, { r2: 0.62, shade: 0.7 });           // bumper
        m.cyl(0, 0.27, 0, 0.6, 0.12, 20, red, { r2: 0.54, top: red, shade: 0.8 });
        m.cyl(0, 0.39, 0, 0.42, 0.03, 20, mix(red, cream, 0.1), { r2: 0.4, top: mul(red, 1.15) });
        m.cyl(0, 0.42, 0, 0.3, 0.02, 16, black, { top: mul(black, 1.2) });
        // Dust window: a glowing ring set by the view.
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2;
            m.at(Math.cos(a) * 0.47, 0.395, Math.sin(a) * 0.47, -a).box(0, 0, 0, 0.1, 0.02, 0.06, i % 2 ? steel : cream);
        }
        m.reset();
        // Face: a visor with two eyes, so it has a mood.
        m.box(0.38, 0.33, 0, 0.3, 0.09, 0.62, black, { taper: 0.9 });
        m.box(0.42, 0.41, 0.15, 0.12, 0.03, 0.14, glow("#7fffe9", 2.2), { shade: 1 });
        m.box(0.42, 0.41, -0.15, 0.12, 0.03, 0.14, glow("#7fffe9", 2.2), { shade: 1 });
        m.box(-0.4, 0.39, 0, 0.14, 0.06, 0.3, steel);
        m.hull(0.035, INK);
        reg("robot", m);
        const b = new MB();
        for (let i = 0; i < 3; i++) b.at(0, 0, 0, i / 3 * Math.PI * 2).box(0.2, 0, 0, 0.4, 0.03, 0.06, hex("#ffcf5c"));
        b.reset();
        reg("brush", b);
        // Chainsaw: bar along +x from the hub. Two tooth frames swap to make the chain run.
        const s = new MB(), orange = hex("#ff7a1a"), bar = hex("#dfe6ee");
        s.box(0.16, -0.08, 0, 0.42, 0.24, 0.3, orange, { taper: 0.85 });
        s.box(0.2, 0.16, 0, 0.12, 0.08, 0.2, black);
        s.box(0.34, 0.16, 0, 0.1, 0.1, 0.16, hex("#ffd24d"));
        s.at(1, 0, 0).reset();
        s.box(0.82, 0.0, 0, 1, 0.07, 0.17, bar, { taperZ: 0.92, shade: 0.85 });
        s.cyl(1.32, 0.0, 0, 0.085, 0.07, 8, bar);
        s.hull(0.018, INK);
        reg("saw", s);
        for (const f of [0, 1]) {
            const t = new MB(), dark = hex("#3a3744");
            const n = 13;
            for (let i = 0; i < n * 2; i++) {
                const u = i < n ? i / (n - 1) : 1 - (i - n) / (n - 1), side = i < n ? 1 : -1;
                if ((i + f) % 2) continue;
                const x = 0.34 + u * 1.02, z = side * 0.105;
                t.box(x, -0.01, z, 0.07, 0.09, 0.05, dark, { shade: 1 });
                t.tri([x + 0.05, 0.08, z], [x - 0.05, 0.08, z], [x, 0.03, z + side * 0.07], dark);
                t.tri([x - 0.05, 0.08, z], [x + 0.05, 0.08, z], [x, 0.03, z + side * 0.07], dark);
            }
            reg(`teeth${f}`, t);
        }
    }

    // --- Household weapons ------------------------------------------------------------------
    const W = {
        lint(m) {
            m.cylX(0.15, 0.1, 0, 0.09, 0.5, 8, hex("#8d8796"), { r2: 0.11 });
            m.box(-0.1, 0, 0, 0.26, 0.18, 0.2, hex("#5d5867"));
        },
        nail(m) {
            m.box(0, 0, 0, 0.62, 0.26, 0.24, hex("#ffbd2e"), { taper: 0.92 });
            m.box(0.42, 0.04, 0, 0.3, 0.14, 0.14, hex("#2b2a33"));
            m.box(-0.14, -0.26, 0, 0.18, 0.28, 0.16, hex("#2b2a33"));
            m.box(0.14, -0.16, 0, 0.34, 0.1, 0.12, hex("#c9d2dc"));
        },
        blower(m) {
            m.box(-0.14, 0, 0, 0.46, 0.34, 0.38, hex("#58c14e"), { taper: 0.85 });
            m.cylX(0.5, 0.17, 0, 0.13, 0.86, 10, hex("#e6e0cf"), { r2: 0.09, cap: hex("#2b2a33") });
            m.cyl(-0.14, 0.34, 0, 0.13, 0.05, 10, hex("#2b2a33"));
            m.box(-0.14, 0.36, 0, 0.4, 0.06, 0.06, hex("#2b2a33"));
        },
        dryer(m) {
            m.cylX(0.14, 0.12, 0, 0.2, 0.68, 12, hex("#ff5f9e"), { r2: 0.14, cap: hex("#ffcf5c") });
            m.cylX(0.55, 0.12, 0, 0.13, 0.16, 12, hex("#2b2a33"), { r2: 0.16, cap: glow("#ffb347", 1.8) });
            m.box(-0.08, -0.3, 0, 0.16, 0.4, 0.15, hex("#ff5f9e"));
            m.box(-0.08, -0.08, 0.1, 0.1, 0.1, 0.05, hex("#fff1dc"));
        },
        sock(m) {
            m.cylX(0.1, 0.12, 0, 0.21, 0.84, 10, hex("#7a6cf0"), { cap: hex("#2b2a33") });
            m.ball(0.42, 0.12, 0, 0.17, 7, 4, hex("#f2f2f2"), { col2: hex("#ff5a6a") });
            m.box(-0.16, -0.22, 0, 0.16, 0.28, 0.14, hex("#2b2a33"));
            m.box(0.0, 0.34, 0, 0.3, 0.06, 0.08, hex("#ffd24d"));
        },
    };
    for (const [k, fn] of Object.entries(W)) { const m = new MB(); fn(m); m.hull(0.022, INK); reg(`w_${k}`, m); }
    {
        const m = new MB();
        m.box(0, 0, 0, 0.5, 0.7, 0.34, hex("#2bd17e"), { shade: 0.75 });
        m.box(0, 0.7, 0, 0.2, 0.08, 0.14, hex("#c9d2dc"));
        m.box(0, 0.46, 0.18, 0.24, 0.12, 0.02, glow("#fff7c2", 1.6), { shade: 1 });
        m.box(0, 0.26, 0.18, 0.24, 0.12, 0.02, glow("#fff7c2", 1.6), { shade: 1 });
        m.hull(0.022, INK);
        reg("battery", m);
    }

    // --- Projectiles ------------------------------------------------------------------------
    {
        let m = new MB();
        m.box(0, -0.03, 0, 0.5, 0.06, 0.06, hex("#e8eef6"), { taper: 0.5 }); m.box(-0.26, -0.05, 0, 0.04, 0.1, 0.13, hex("#ffffff"));
        reg("nail", m);
        m = new MB(); m.ball(0, 0, 0, 0.16, 6, 4, hex("#d9d0c6")).jitter(0.05, 3); reg("pellet", m);
        m = new MB(); m.ball(0, 0, 0, 0.34, 7, 5, hex("#fafafa"), { col2: hex("#ff5a6a") }).jitter(0.03, 4); m.hull(0.03, INK); reg("sockball", m);
        m = new MB(); for (let i = 0; i < 3; i++) m.at(0, 0, 0, i * 2.094).tri([0, 0, 0.3], [0.32, 0, 0], [0, 0, -0.1], hex("#ffd9a0")).tri([0, 0, -0.1], [0.32, 0, 0], [0, 0, 0.3], hex("#ffd9a0")); m.reset(); reg("blade", m);
        m = new MB(); m.ball(0, 0, 0, 0.5, 7, 5, hex("#d8843f")); m.hull(0.03, INK); tufts(m, 0, 0, 0, 0.48, 18, hex("#f0a35c"), 0.14, 2); reg("hairball", m);
        m = new MB(); m.box(0, -0.42, 0, 0.84, 0.84, 0.84, hex("#ffd24d"), { top: hex("#ff6a5a") }); m.box(0, -0.05, 0.43, 0.42, 0.42, 0.02, hex("#3f8cff"), { shade: 1 }); m.hull(0.03, INK); reg("toyblock", m);
        m = new MB(); m.ball(0, 0, 0, 0.1, 4, 2, hex("#cbbfb4"), { shade: false }).jitter(0.04, 5); reg("mote", m);
    }

    // --- Dust bunny -------------------------------------------------------------------------
    {
        // Seen from above, so the face looks up and the ears lie out to the sides.
        const m = new MB(), fur = hex("#c9bccb"), belly = hex("#efe6e0"), inner = hex("#ff9db0"), dark = hex("#8f8099");
        m.ball(0, 0.42, 0, 0.44, 8, 5, fur, { sy: 0.9 });
        m.ball(0.14, 0.6, 0, 0.27, 6, 3, belly, { sy: 0.7 });
        for (const s of [-1, 1]) {
            m.at(-0.1, 0.7, s * 0.24, s * 0.42);
            m.box(-0.3, 0, 0, 0.66, 0.1, 0.3, fur, { shade: 0.85, taperZ: 0.75, taperX: 0.8 });
            m.box(-0.32, 0.1, 0, 0.42, 0.015, 0.14, inner, { shade: 1 });
            m.reset();
        }
        for (const s of [-1, 1]) {
            m.ball(0.3, 0.72, s * 0.17, 0.14, 7, 4, hex("#fffbe0"), { shade: false, sy: 0.65 });
            m.ball(0.35, 0.8, s * 0.15, 0.07, 5, 3, hex("#19121f"), { shade: false, sy: 0.6 });
            m.at(0.32, 0.86, s * 0.2, s * 0.5).box(0, 0, 0, 0.05, 0.04, 0.22, INK, { shade: 1 }); m.reset();
        }
        m.hull(0.03, INK);
        tufts(m, 0, 0.42, 0, 0.42, 18, mix(fur, dark, 0.12), 0.09, 1);
        reg("bunny", m);
    }

    // --- Static puff ------------------------------------------------------------------------
    {
        const m = new MB(), cloud = hex("#f8f0c4"), blue = glow("#8fd4ff", 1.5);
        m.ball(0, 0.5, 0, 0.42, 8, 5, cloud);
        for (const [x, y, z, r] of [[0.22, 0.6, 0.2, 0.24], [-0.24, 0.54, 0.18, 0.26], [0.1, 0.48, -0.28, 0.26], [-0.16, 0.72, -0.08, 0.24]]) m.ball(x, y, z, r, 6, 4, cloud);
        eyes(m, 0.3, 0.74, 0, 0.13, 0.11, "#ffffff", "#1a2740", 0.5);
        m.hull(0.03, INK);
        tufts(m, 0, 0.5, 0, 0.44, 12, glow("#ffe56a", 1.4), 0.2, 4);
        reg("puff", m);
    }

    // --- Sock snakes -------------------------------------------------------------------------
    const SOCKS = [["#ff5a6a", "#fff4e8"], ["#3f8cff", "#ffe07a"], ["#37c98b", "#ffb6d9"]];
    SOCKS.forEach(([a, b], i) => {
        const A1 = hex(a), B1 = hex(b);
        let m = new MB();
        m.cylX(0, 0.34, 0, 0.32, 0.26, 8, A1, { cap: A1 });
        m.cylX(0.26, 0.34, 0, 0.32, 0.26, 8, B1, { cap: B1, r2: 0.3 });
        m.cylX(-0.26, 0.34, 0, 0.3, 0.26, 8, B1, { cap: B1, r2: 0.32 });
        m.hull(0.024, INK);
        reg(`seg${i}`, m);
        m = new MB();
        m.ball(0.04, 0.38, 0, 0.42, 8, 5, A1, { sx: 1.25, sy: 0.85 });
        m.box(0.48, 0.14, 0, 0.3, 0.36, 0.5, B1, { taper: 0.8 });          // toe cap
        m.ball(-0.28, 0.38, 0, 0.3, 7, 4, B1);
        eyes(m, 0.34, 0.66, 0, 0.2, 0.11, "#ffffff", "#17121c", 0.55);      // button eyes
        m.box(0.53, 0.22, 0, 0.22, 0.03, 0.34, INK, { shade: 1 });          // stitched mouth
        for (const s of [-1, 1]) m.tri([0.64, 0.19, s * 0.2], [0.64, 0.19, s * 0.08], [0.7, 0.03, s * 0.14], hex("#fff8ea")).tri([0.64, 0.19, s * 0.08], [0.64, 0.19, s * 0.2], [0.7, 0.03, s * 0.14], hex("#fff8ea"));
        m.hull(0.03, INK);
        reg(`head${i}`, m);
    });

    // --- Cat hair golem ----------------------------------------------------------------------
    {
        const ginger = hex("#d8843f"), pale = hex("#f3d6ad"), dark = hex("#8a4a26");
        let m = new MB();
        m.ball(0, 1.5, 0, 1.15, 9, 6, ginger, { sy: 1.05, col2: mix(ginger, dark, 0.35), bands: 3 }).jitter(0.1, 2);
        m.ball(0.2, 1.3, 0, 0.72, 7, 4, pale).jitter(0.07, 3);
        m.ball(0.3, 2.52, 0, 0.62, 8, 5, ginger, { sy: 0.88 }).jitter(0.05, 6);
        for (const s of [-1, 1]) m.tri([0.1, 2.95, s * 0.5], [0.46, 2.95, s * 0.42], [0.1, 3.5, s * 0.46], ginger).tri([0.46, 2.95, s * 0.42], [0.1, 2.95, s * 0.5], [0.1, 3.5, s * 0.46], dark);
        for (const s of [-1, 1]) m.ball(0.62, 2.96, s * 0.25, 0.15, 5, 3, glow("#ffee66", 2.2), { shade: false, sx: 1, sy: 0.7 });
        m.hull(0.05, INK);
        tufts(m, 0, 1.6, 0, 1.08, 60, mix(ginger, pale, 0.3), 0.16, 3);
        tufts(m, 0.3, 2.56, 0, 0.56, 24, pale, 0.12, 5);
        reg("golem_body", m);
        m = new MB();
        m.ball(0, -0.42, 0, 0.46, 6, 4, ginger, { sy: 1.5 }).jitter(0.08, 8);
        m.hull(0.04, INK);
        tufts(m, 0, -0.5, 0, 0.42, 16, mix(ginger, pale, 0.3), 0.12, 7);
        reg("golem_limb", m);
    }

    // --- The Cat. All shadow, with eyes that stay lit --------------------------------------
    {
        const fur = hex("#2a2533"), pale = hex("#453d52"), blaze = hex("#efe4d8");
        let m = new MB();
        m.ball(0, 2.0, 0, 1.8, 10, 7, fur, { sx: 1.7, sy: 0.82, sz: 0.85 });
        m.ball(1.1, 2.15, 0, 1.3, 9, 5, fur, { sy: 0.9 });
        m.ball(-1.1, 2.1, 0, 1.25, 9, 5, pale, { sy: 0.85 });
        for (let i = 0; i < 5; i++) m.at(-1.8 + i * 0.86, 3.42 - Math.abs(i - 2) * 0.12, 0).box(0, 0, 0, 0.14, 0.05, 1 - Math.abs(i - 2) * 0.1, pale, { shade: 1 }), m.reset();
        m.hull(0.06, INK);
        tufts(m, 0, 2.3, 0, 1.6, 40, pale, 0.14, 3);
        reg("cat_body", m);
        m = new MB();
        m.ball(0, 0, 0, 1.16, 9, 6, fur, { sx: 0.92, sy: 0.86 });
        m.ball(0.8, -0.2, 0, 0.52, 7, 4, blaze, { sy: 0.7 });
        m.ball(1.2, -0.05, 0, 0.11, 5, 3, hex("#ff7f8d"), { shade: false });
        for (const s of [-1, 1]) {
            m.tri([-0.4, 0.72, s * 0.3], [0.3, 0.72, s * 0.34], [-0.2, 1.7, s * 0.72], fur).tri([0.3, 0.72, s * 0.34], [-0.4, 0.72, s * 0.3], [-0.2, 1.7, s * 0.72], fur);
            m.tri([-0.3, 0.85, s * 0.42], [0.22, 0.85, s * 0.44], [-0.18, 1.5, s * 0.68], hex("#d67a8a")).tri([0.22, 0.85, s * 0.44], [-0.3, 0.85, s * 0.42], [-0.18, 1.5, s * 0.68], hex("#d67a8a"));
            // Lit eyes: huge, slit, and brighter than anything in the room.
            m.ball(0.74, 0.3, s * 0.48, 0.3, 7, 4, glow("#d8ff4a", 2.6), { shade: false, sx: 0.5, sy: 0.9 });
            m.ball(0.9, 0.3, s * 0.48, 0.14, 5, 4, hex("#0b0a10"), { shade: false, sx: 0.4, sy: 1.5, sz: 0.5 });
            for (let w = 0; w < 3; w++) m.tri([1.0, -0.15, s * 0.3], [1.0, -0.2, s * 0.3], [1.1, -0.1 - w * 0.22 + 0.2, s * 1.7], hex("#efe4d8")).tri([1.0, -0.2, s * 0.3], [1.0, -0.15, s * 0.3], [1.1, -0.1 - w * 0.22 + 0.2, s * 1.7], hex("#efe4d8"));
        }
        m.hull(0.05, INK);
        reg("cat_head", m);
        m = new MB();
        m.cyl(0, 0, 0, 0.42, 2.2, 7, fur, { r2: 0.5, cap: true });
        m.ball(0.16, 0.05, 0, 0.56, 7, 4, blaze, { sx: 1.2, sy: 0.5 });
        for (const z of [-0.26, 0, 0.26]) m.tri([0.5, 0.2, z - 0.08], [0.5, 0.2, z + 0.08], [0.98, 0.02, z], hex("#f7f1e8")).tri([0.5, 0.2, z + 0.08], [0.5, 0.2, z - 0.08], [0.98, 0.02, z], hex("#f7f1e8"));
        m.hull(0.05, INK);
        reg("cat_leg", m);
        m = new MB();
        m.ball(0, 0, 0, 0.42, 6, 4, fur);
        m.hull(0.04, INK);
        reg("cat_tail", m);
    }

    // --- Tiny Tyrant on a tricycle --------------------------------------------------------------
    {
        const red = hex("#e8342e"), chrome = hex("#e6ecf2"), blue = hex("#2fa7e0"), rubber = hex("#23202b"), skin = hex("#ffd2b0"), sun = hex("#ffd24d");
        let m = new MB();
        // frame
        m.at().basis([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0]);
        m.box(-0.1, 1.1, 0, 2.5, 0.3, 0.32, red, { shade: 0.8 });
        m.box(-1.2, 0.72, 0, 0.3, 0.5, 1.9, red);
        m.box(0.95, 1.05, 0, 0.34, 0.9, 0.3, red);
        m.box(-0.6, 1.4, 0, 1.1, 0.16, 1, hex("#3f3a4d"), { top: hex("#5a5270") });       // seat
        m.box(1.0, 1.95, 0, 0.16, 0.16, 1.9, chrome);                                     // handlebar
        for (const s of [-1, 1]) m.box(1.0, 1.9, s * 1.02, 0.26, 0.26, 0.34, hex("#ff9e2c"));
        m.cyl(1.2, 1.7, 0, 0.14, 0.18, 8, sun);                                           // bell
        m.hull(0.05, INK);
        reg("trike_frame", m);
        m = new MB();
        m.cylZ(0, 0, 0, 1.1, 0.5, 14, rubber, { cap: chrome, r2: 1.1 }); m.cylZ(0, 0, 0, 0.3, 0.6, 8, red, { cap: sun });
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; m.basis([Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1], [0, 0, 0]).box(0, -0.03, 0, 2, 0.06, 0.56, chrome); m.reset(); }
        m.hull(0.04, INK);
        reg("trike_wheel", m);
        m = new MB();
        m.box(0, 0, 0, 0.8, 0.5, 1.2, hex("#c79a5b"), { taper: 1.15, shade: 0.75 }); m.box(0, 0.48, 0, 0.72, 0.04, 1.1, hex("#8a6a3f"));
        m.hull(0.04, INK);
        reg("trike_basket", m);
        m = new MB();
        m.ball(0, 0.8, 0, 0.82, 8, 5, blue, { sy: 1.1, col2: mix(blue, hex("#ffffff"), 0.4) });                 // romper
        m.ball(-0.08, 0.15, 0, 0.72, 8, 4, hex("#fff7ec"), { sy: 0.6 });                                        // nappy
        for (const s of [-1, 1]) m.ball(0.44, 0.08, s * 0.38, 0.36, 6, 3, skin, { sx: 1.5 });                   // legs
        m.hull(0.05, INK);
        reg("tod_body", m);
        const head = (cry) => {
            const h = new MB();
            h.ball(0, 0, 0, 0.92, 10, 6, skin);
            for (const s of [-1, 1]) h.ball(0.1, 0, s * 0.9, 0.22, 5, 3, skin);
            // The one tuft of hair.
            h.tri([-0.3, 0.85, -0.2], [-0.3, 0.85, 0.2], [0.34, 1.5, 0], hex("#ffb13d")).tri([-0.3, 0.85, 0.2], [-0.3, 0.85, -0.2], [0.34, 1.5, 0], hex("#d98a1e"));
            if (cry) {
                for (const s of [-1, 1]) h.box(0.8, 0.14, s * 0.36, 0.14, 0.05, 0.3, INK, { shade: 1 });
                h.ball(0.72, -0.34, 0, 0.3, 7, 4, hex("#7a1f2e"), { shade: false, sy: 0.8 });
                for (const s of [-1, 1]) h.ball(0.74, -0.1, s * 0.56, 0.12, 5, 3, glow("#8fe0ff", 1.3), { shade: false, sy: 1.8 });
            } else {
                for (const s of [-1, 1]) {
                    h.ball(0.74, 0.16, s * 0.36, 0.2, 7, 4, hex("#ffffff"), { shade: false, sx: 0.5 });
                    h.ball(0.86, 0.14, s * 0.34, 0.1, 5, 3, hex("#17121c"), { shade: false, sx: 0.5 });
                    h.at(0.84, 0.42, s * 0.36).basis([0.9, -0.4 * 0.3, 0], [0.12, 0.9, 0], [0, s * -0.3, 1], [0.84, 0.42, s * 0.36]).box(0, 0, 0, 0.1, 0.07, 0.42, INK, { shade: 1 }).reset();
                }
                h.box(0.8, -0.34, 0, 0.14, 0.06, 0.36, INK, { shade: 1 });
                h.ball(0.84, -0.02, 0, 0.1, 5, 3, hex("#f7b08e"));
            }
            h.hull(0.05, INK);
            return h;
        };
        reg("tod_head", head(false)); reg("tod_cry", head(true));
        m = new MB();
        m.ball(0.4, 0, 0, 0.26, 6, 3, skin, { sx: 2.2 }); m.ball(0.92, 0, 0, 0.24, 6, 3, skin);
        m.hull(0.035, INK);
        reg("tod_arm", m);
    }

    // --- Hazards ---------------------------------------------------------------------------
    {
        let m = new MB();
        m.cylX(0, 0.72, 0, 0.62, 2.1, 10, hex("#2f6fd9"), { cap: hex("#ffd24d") });
        m.box(-0.64, 0.5, 0, 0.9, 1.3, 1.2, hex("#e8342e"), { top: hex("#ffd24d") });
        m.cyl(0.62, 1.2, 0, 0.26, 0.74, 8, hex("#23202b"), { r2: 0.38, top: hex("#ffd24d") });
        for (const x of [-0.8, 0, 0.8]) for (const s of [-1, 1]) m.cylZ(x, 0.3, s * 0.6, 0.3, 0.12, 8, hex("#ffd24d"));
        m.hull(0.04, INK);
        reg("loco", m);
        m = new MB();
        m.box(0, 0.26, 0, 2, 0.7, 1.1, hex("#37c98b"), { top: hex("#2a9c6c") }); for (const [x, c] of [[-0.5, "#ffd24d"], [0.15, "#ff5a6a"], [0.62, "#7ec8f0"]]) m.box(x, 0.96, (x > 0 ? 0.1 : -0.1), 0.56, 0.44, 0.7, hex(c));
        for (const x of [-0.6, 0.6]) for (const s of [-1, 1]) m.cylZ(x, 0.26, s * 0.58, 0.26, 0.12, 8, hex("#ffd24d"));
        m.hull(0.04, INK);
        reg("traincar", m);
        m = new MB();
        m.box(0, 0, 0, 1.3, 0.34, 0.8, hex("#ffb6d9"), { top: hex("#ffd3e8"), taper: 0.9 });
        m.hull(0.03, INK);
        reg("soap", m);
        m = new MB();
        m.box(0, 0, 0, 0.8, 0.26, 0.5, hex("#ffffff"), { shade: 0.8 });
        for (const x of [-0.2, 0.2]) for (const z of [-0.12, 0.12]) m.cyl(x, 0.26, z, 0.08, 0.05, 6, hex("#ffffff"));
        m.hull(0.02, INK);
        reg("brick", m);
    }

    // --- Debris -----------------------------------------------------------------------------
    {
        let m = new MB();
        m.tri([0.2, 0, 0], [-0.1, 0, 0.17], [0, 0.18, 0], [1, 1, 1]).tri([-0.1, 0, 0.17], [-0.1, 0, -0.17], [0, 0.18, 0], [0.8, 0.8, 0.8]).tri([-0.1, 0, -0.17], [0.2, 0, 0], [0, 0.18, 0], [0.9, 0.9, 0.9]).tri([0.2, 0, 0], [-0.1, 0, -0.17], [-0.1, 0, 0.17], [0.6, 0.6, 0.6]);
        reg("shard", m);
        m = new MB(); m.box(0, -0.05, 0, 0.7, 0.1, 0.16, [1, 1, 1], { shade: 0.75 }); reg("plank", m);
        m = new MB(); m.box(0, -0.13, 0, 0.26, 0.26, 0.26, [1, 1, 1], { shade: 0.75 }); reg("cube", m);
        m = new MB(); m.ball(0, 0, 0, 0.2, 5, 3, [1, 1, 1]).jitter(0.07, 2); reg("lump", m);
        m = new MB(); m.box(0, -0.05, 0, 0.42, 0.1, 0.3, [1, 1, 1], { top: [0.9, 0.86, 0.8], shade: 0.8 }); reg("book", m);
    }
}

