// Every model in the game, built in code from flat-shaded chunks. Goats are one set of parts per player,
// so kits, fur and horns are real geometry colours rather than tints.
import { MB, hex, mix, mul } from "./meshkit.js";
import { GW, GH, GD } from "./sim.js";

export const FURS = ["#f3ead8", "#d9b88a", "#8a5e3c", "#4a3a34", "#c9c4bc"];
const HORN = hex("#cdbb95"), HOOF = hex("#3a2c26"), NOSE = hex("#3b2a2a");

/** kit: { c1, c2, pattern: 'plain|stripes|hoops|sash|halves', socks, horns: 0|1|2, fur: index|null } */
function shirtColor(kit, z, a) {
    const c1 = hex(kit.c1), c2 = hex(kit.c2), p = kit.pattern ?? "plain";
    const x = Math.cos(a);
    if (p === "stripes") return Math.floor(a / (Math.PI / 4) + 0.5) % 2 ? c1 : c2;
    if (p === "hoops") return Math.floor((z + 2) / 0.26) % 2 ? c1 : c2;
    if (p === "halves") return x > 0 ? c1 : c2;
    if (p === "sash") return Math.abs(z - x * 0.35) < 0.16 ? c2 : c1;
    return c1;
}

export function torso(game, name, kit, fur, number, keeper) {
    if (game.assets.geoms?.has?.(name)) return name;
    const m = new MB(), F = hex(fur), S2 = hex(kit.c2), shortsC = hex(kit.shorts ?? kit.c2);
    const k = keeper ? { c1: kit.gk ?? "#f3c623", c2: "#2e2a26", pattern: "plain" } : kit;
    const rings = [[-0.92, 0.3, 0.3], [-0.8, 0.48, 0.48], [-0.52, 0.56, 0.58], [-0.3, 0.6, 0.62], [-0.28, 0.63, 0.65], [0.1, 0.66, 0.66], [0.5, 0.6, 0.6], [0.72, 0.5, 0.52], [0.8, 0.36, 0.4], [0.9, 0.26, 0.3]];
    m.barrel(rings, 10, (z, a, i) => {
        if (i < 0 || z < -0.8) return F;
        if (z < -0.29) return shortsC;
        if (z > 0.76) return F;
        const c = shirtColor(k, z, a);
        return z > 0.6 ? mix(hex(k.c2), c, keeper ? 0.3 : 0.2) : c;   // collar band
    });
    // Tail.
    m.at(0, 0.36, -0.92).box(0, 0, 0, 0.12, 0.26, 0.14, F, { taper: 0.5 }).reset();
    // Number on the back, so the broadcast camera can read it.
    m.text(String(number), [0, 0.675, 0.14], [-1, 0, 0], [0, 0, 1], 0.44, keeper ? hex("#2e2a26") : mix(S2, [1, 1, 1], 0.86));
    // Sleeves.
    for (const sx of [-1, 1]) m.at(sx * 0.52, -0.22, 0.46).box(0, 0, 0, 0.26, 0.34, 0.4, hex(k.c1), { bottom: true, taper: 0.9 }).reset();
    return m.register(game.assets, name);
}

/** expr: 0 calm, 1 angry, 2 dizzy, 3 bleating */
export function head(game, name, fur, hornStyle, expr, keeper, capC) {
    if (game.assets.geoms?.has?.(name)) return name;
    const m = new MB(), F = hex(fur), L = mix(F, [1, 1, 1], 0.14), D = mul(F, 0.72);
    const dark = F[0] + F[1] + F[2] < 1.2;
    // Skull and muzzle: head origin is the neck.
    m.box(0, -0.26, 0.1, 0.92, 0.74, 0.8, F, { taperX: 0.94, taperZ: 0.9, bottom: true, shade: 0.88 });
    m.box(0, -0.44, 0.52, 0.62, 0.48, 0.6, L, { taperX: 0.94, taperZ: 0.86, bottom: true, shade: 0.92 });
    // Nose and mouth.
    m.box(0, -0.12, 0.8, 0.38, 0.13, 0.08, NOSE, { bottom: true });
    if (expr === 3) { m.box(0, -0.52, 0.78, 0.42, 0.2, 0.2, hex("#b23a48"), { bottom: true }); m.box(0, -0.66, 0.58, 0.5, 0.11, 0.5, D, { bottom: true }); }
    else m.box(0, -0.34, 0.81, 0.4, 0.035, 0.05, NOSE);
    // Beard.
    m.box(0, -0.86, 0.5, 0.26, 0.42, 0.22, dark ? mix(F, [1, 1, 1], 0.3) : mul(F, 0.82), { taper: 1.5, bottom: true });
    // Ears: big floppy paddles.
    for (const s of [-1, 1]) {
        const rootX = s * 0.44;
        const A = [rootX, 0.02, 0.14], B = [rootX + s * 0.5, -0.26, 0.2], C = [rootX + s * 0.56, -0.34, -0.02], E = [rootX, -0.1, -0.1];
        if (s > 0) { m.quad(A, B, C, E, F); m.quad(E, C, B, A, D); } else { m.quad(E, C, B, A, F); m.quad(A, B, C, E, D); }
    }
    // Horns: short, thick and chunky.
    const hs = hornStyle ?? 0;
    for (const s of [-1, 1]) {
        let x = s * 0.24, y = 0.42, z = -0.02, r = 0.15;
        const steps = hs === 2 ? 6 : 4;
        for (let i = 0; i < steps; i++) {
            let nx, ny, nz;
            if (hs === 0) { nx = x + s * 0.05; ny = y + 0.15 - i * 0.03; nz = z - 0.1 - i * 0.03; }        // swept back
            else if (hs === 1) { nx = x + s * 0.17; ny = y + 0.08 + i * 0.04; nz = z + 0.02; }     // out and up, viking
            else { const a = i * 1.1; nx = x + s * (0.14 * Math.cos(a) + 0.04); ny = y + 0.14 * Math.sin(a); nz = z - 0.05 + 0.08 * Math.sin(a * 0.5); }    // ram curl
            const c = i % 2 ? HORN : mul(HORN, 0.86);
            cone(m, [x, y, z], [nx, ny, nz], r, r * 0.8, c);
            x = nx; y = ny; z = nz; r *= 0.82;
        }
    }
    // Eyes: big and bright, with sideways-slot goat pupils.
    for (const s of [-1, 1]) {
        const ex = s * 0.25, ey = 0.04, ez = 0.5;
        const W = hex("#ffffff");
        m.box(ex, ey - 0.17, ez, 0.33, 0.34, 0.06, mul(hex("#2a2020"), 1), { shade: 1 });
        m.box(ex, ey - 0.15, ez + 0.01, 0.28, 0.3, 0.06, W, { shade: 1 });
        if (expr === 2) {
            const P = (a, b) => [ex + a, ey + b, ez + 0.05];
            bar(m, P(-0.11, -0.1), P(0.11, 0.1), 0.03, hex("#2a2020")); bar(m, P(-0.11, 0.1), P(0.11, -0.1), 0.03, hex("#2a2020"));
        } else {
            m.box(ex + (expr === 1 ? -s * 0.04 : -s * 0.02), ey - 0.05, ez + 0.03, 0.22, 0.1, 0.05, hex("#1c1412"), { shade: 1 });
        }
        if (expr === 1) { const P = (a, b) => [ex + a, ey + b, ez + 0.06]; bar(m, P(-s * 0.19, 0.08), P(s * 0.19, 0.22), 0.055, mul(D, 0.7)); }
    }
    if (keeper) {
        // A flat cap, because keepers are like that.
        const C = hex(capC ?? "#6b5a3e");
        m.box(0, 0.09, 0.08, 1, 0.18, 0.92, C, { taperX: 0.92, taperZ: 0.9 });
        m.box(0, 0.09, 0.62, 0.8, 0.07, 0.34, mul(C, 0.86), { bottom: true });
    }
    return m.register(game.assets, name);
}

function bar(m, a, b, w, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w, ny = dx / l * w;
    m.quad([a[0] - nx, a[1] - ny, a[2]], [b[0] - nx, b[1] - ny, b[2]], [b[0] + nx, b[1] + ny, b[2]], [a[0] + nx, a[1] + ny, a[2]], col);
}

/** Tapered square tube between two points. */
function cone(m, a, b, r0, r1, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1, fx = dx / l, fy = dy / l, fz = dz / l;
    let ux = 0, uy = 1, uz = 0;
    if (Math.abs(fy) > 0.9) { ux = 1; uy = 0; }
    let rx = fy * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - fy * ux; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    ux = ry * fz - rz * fy; uy = rz * fx - rx * fz; uz = rx * fy - ry * fx;
    const P = (o, r, i) => { const s = i === 0 || i === 3 ? 1 : -1, t = i < 2 ? 1 : -1; return [o[0] + (rx * s + ux * t) * r, o[1] + (ry * s + uy * t) * r, o[2] + (rz * s + uz * t) * r]; };
    for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; m.quad(P(a, r0, j), P(a, r0, i), P(b, r1, i), P(b, r1, j), col); }
    m.quad(P(b, r1, 3), P(b, r1, 2), P(b, r1, 1), P(b, r1, 0), col);
}

export function leg(game, name, kit, fur, keeper) {
    if (game.assets.geoms?.has?.(name)) return name;
    const m = new MB(), F = hex(fur);
    const sock = hex(keeper ? (kit.gk ?? "#f3c623") : (kit.socks ?? kit.c1)), band = hex(kit.c2);
    m.box(0, -0.42, 0, 0.3, 0.42, 0.34, F, { taper: 1.2, shade: 0.9 });
    m.box(0, -0.74, 0, 0.26, 0.34, 0.27, sock, { taper: 1.12, shade: 0.95 });
    m.box(0, -0.48, 0, 0.29, 0.07, 0.3, band);
    if (keeper) m.box(0, -0.98, 0.03, 0.44, 0.3, 0.46, hex("#fff6e6"), { bottom: true, shade: 0.9 });   // big gloves on every hoof
    else m.box(0, -0.9, 0.02, 0.3, 0.17, 0.34, HOOF, { bottom: true });
    return m.register(game.assets, name);
}

/** Icosphere with dark pentagon-ish panels round the twelve poles. */
export function registerBall(game) {
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(([a, b, c]) => { const l = Math.hypot(a, b, c); return [a / l, b / l, c / l]; });
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const m = new MB(), cream = hex("#fff4dc"), dark = hex("#2c2433"), n = (a, b) => { const c = [a[0] + b[0], a[1] + b[1], a[2] + b[2]], l = Math.hypot(...c); return [c[0] / l, c[1] / l, c[2] / l]; };
    for (const [a, b, c] of F) {
        const A = V[a], B = V[b], C = V[c], ab = n(A, B), bc = n(B, C), ca = n(C, A);
        // Corners are the pole-adjacent faces, painted dark.
        m.tri(A, ab, ca, dark); m.tri(ab, B, bc, dark); m.tri(ca, bc, C, dark); m.tri(ab, bc, ca, cream);
    }
    m.register(game.assets, "ball");
    // Selection ring, flat on the ground.
    for (const [name, inner, outer] of [["ring", 0.86, 1.08], ["ring2", 0.96, 1.08]]) {
        const r = new MB(), c = [1, 1, 1], N = 28;
        for (let i = 0; i < N; i++) {
            if (name === "ring2" && i % 2) continue;
            const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
            const P = (a, q) => [Math.cos(a) * q, 0, Math.sin(a) * q];
            r.quad(P(a1, inner), P(a0, inner), P(a0, outer), P(a1, outer), c);
        }
        r.register(game.assets, name);
    }
    const ar = new MB(), w = [1, 1, 1];
    ar.tri([0, 0, 1.0], [0.38, 0, 0.38], [-0.38, 0, 0.38], w).quad([-0.16, 0, 0.38], [0.16, 0, 0.38], [0.16, 0, -0.1], [-0.16, 0, -0.1].slice(0), w).register(game.assets, "arrow");
    // A chevron that floats over your goat. Faces the camera by being a chunky 3D wedge.
    const ch = new MB();
    ch.quad([0, -0.3, 0.26], [0.34, 0.3, 0.26], [0.2, 0.3, 0.26], [0, -0.06, 0.26], w).quad([-0.34, 0.3, 0.26], [0, -0.3, 0.26], [0, -0.06, 0.26], [-0.2, 0.3, 0.26], w);
    ch.register(game.assets, "chevron");
}

/** Back net with an optional bulge. Lines are little crosses so they read from every side. */
export function netMesh(bz = 0, by = 1.2, amp = 0) {
    const m = new MB(), c = [0.98, 0.97, 0.92], W = 0.028;
    const bulge = (y, z) => {
        const d = ((z - bz) / 2.4) ** 2 + ((y - by) / 1.5) ** 2;
        return amp * Math.exp(-d * 1.4);
    };
    const pt = (u, v) => {   // u across (-GW..GW), v 0 at ground, 1 at top; back panel slopes in to the top bar.
        const y = v * GH, depth = GD * (1 - v * 0.55);
        return [depth + bulge(y, u), y, u];
    };
    const line = (a, b) => {
        m.quad([a[0] - W, a[1], a[2]], [b[0] - W, b[1], b[2]], [b[0] + W, b[1], b[2]], [a[0] + W, a[1], a[2]], c);
        m.quad([a[0] + W, a[1], a[2]], [b[0] + W, b[1], b[2]], [b[0] - W, b[1], b[2]], [a[0] - W, a[1], a[2]], c);
        m.quad([a[0], a[1] - W, a[2]], [b[0], b[1] - W, b[2]], [b[0], b[1] + W, b[2]], [a[0], a[1] + W, a[2]], c);
        m.quad([a[0], a[1] + W, a[2]], [b[0], b[1] + W, b[2]], [b[0], b[1] - W, b[2]], [a[0], a[1] - W, a[2]], c);
    };
    const NU = 12, NV = 5;
    for (let i = 0; i <= NU; i++) for (let j = 0; j < NV; j++) { const u = -GW + i / NU * GW * 2; line(pt(u, j / NV), pt(u, (j + 1) / NV)); }
    for (let j = 0; j <= NV; j++) for (let i = 0; i < NU; i++) line(pt(-GW + i / NU * GW * 2, j / NV), pt(-GW + (i + 1) / NU * GW * 2, j / NV));
    // Roof and sides, static apart from the top edge following the back.
    for (let i = 0; i <= NU; i += 2) { const u = -GW + i / NU * GW * 2; line([0, GH, u], pt(u, 1)); }
    for (const s of [-1, 1]) for (let j = 0; j <= NV; j++) { const a = [0, j / NV * GH, s * GW]; line(a, pt(s * GW, j / NV)); }
    for (const s of [-1, 1]) for (let i = 1; i < 3; i++) { const t = i / 3; line([GD * t, 0, s * GW], [GD * t * 0.45 + 0, GH, s * GW]); }
    return m;
}

export function registerNets(game) {
    netMesh().register(game.assets, "net0");
    for (let i = 0; i < 3; i++) for (let a = 1; a <= 3; a++) netMesh((i - 1) * 2.4, 1.2, a * 0.65).register(game.assets, `net_${i}_${a}`);
}

export function registerProps(game) {
    const a = game.assets;
    // Goal frame.
    const g = new MB(), W = hex("#fffaf0"), r = 0.14;
    for (const s of [-1, 1]) g.cyl(0, 0, s * GW, r, GH, 8, W);
    g.cylZ(0, GH, 0, r, GW * 2 + r * 2, 8, W);
    g.box(GD / 2, 0, -GW, GD, 0.06, 0.06, W).box(GD / 2, 0, GW, GD, 0.06, 0.06, W).box(GD, 0, 0, 0.06, 0.06, GW * 2, W);
    g.register(a, "goalframe");

    // Sheepdog referee: origin at the feet, facing +z.
    const d = new MB(), K = hex("#26222a"), Wh = hex("#f4efe6"), T = hex("#a86a3a");
    d.at(0, 0.62, 0).barrel([[-0.6, 0.18, 0.2], [-0.5, 0.34, 0.34], [0, 0.4, 0.4], [0.45, 0.36, 0.36], [0.58, 0.2, 0.22]], 8, (z, an) => (Math.sin(an) > 0.2 ? K : Wh)).reset();
    d.at(0, 1.06, 0.62).box(0, -0.2, 0.02, 0.46, 0.46, 0.46, K, { bottom: true }).box(0, -0.22, 0.28, 0.26, 0.2, 0.3, Wh, { bottom: true }).box(0, -0.12, 0.44, 0.1, 0.08, 0.05, K);
    d.box(-0.12, 0.0, 0.24, 0.08, 0.08, 0.02, Wh).box(0.12, 0, 0.24, 0.08, 0.08, 0.02, Wh);
    d.box(-0.27, 0, -0.08, 0.12, 0.26, 0.16, K, { taper: 0.5 }).box(0.27, 0, -0.08, 0.12, 0.26, 0.16, K, { taper: 0.5 });
    d.box(0.2, -0.44, 0.34, 0.1, 0.12, 0.16, hex("#ffd24a"), { bottom: true }).reset();   // whistle
    for (const [x, z] of [[-0.2, 0.38], [0.2, 0.38], [-0.2, -0.38], [0.2, -0.38]]) d.box(x, 0, z, 0.16, 0.56, 0.16, Wh, { bottom: true });
    d.at(0, 0.84, -0.6).box(0, -0.02, -0.14, 0.14, 0.14, 0.42, K, { taper: 0.6 }).reset();
    void T;
    d.register(a, "ref");

    // Farmer with a wheelbarrow, facing +z.
    const f = new MB(), B = hex("#35506e"), Sk = hex("#e8b48c"), Br = hex("#5a3b24"), Cap = hex("#7a6a4a"), Sh = hex("#b8413a");
    f.box(-0.24, 0, 0, 0.32, 0.26, 0.5, Br, { bottom: true }).box(0.24, 0, 0, 0.32, 0.26, 0.5, Br, { bottom: true });
    f.box(-0.22, 0.2, 0, 0.3, 0.9, 0.34, B, { taper: 1.05 }).box(0.22, 0.2, 0, 0.3, 0.9, 0.34, B, { taper: 1.05 });
    f.box(0, 1.02, 0, 0.84, 0.92, 0.48, Sh, { taper: 0.9 }).box(0, 1.02, 0.02, 0.6, 0.62, 0.5, B);
    f.box(-0.5, 1.2, 0.1, 0.2, 0.2, 0.7, Sh, { bottom: true }).box(0.5, 1.2, 0.1, 0.2, 0.2, 0.7, Sh, { bottom: true });
    f.box(0, 1.92, 0, 0.5, 0.52, 0.5, Sk, { bottom: true }).box(0, 2.36, 0.04, 0.6, 0.14, 0.66, Cap).box(0, 2.34, 0.34, 0.46, 0.05, 0.3, mul(Cap, 0.8), { bottom: true });
    f.box(0, 1.84, 0.26, 0.42, 0.18, 0.05, hex("#e8e0d0"), { bottom: true });     // whiskers
    f.box(-0.12, 2.1, 0.25, 0.07, 0.07, 0.02, K).box(0.12, 2.1, 0.25, 0.07, 0.07, 0.02, K).box(0, 1.98, 0.26, 0.12, 0.12, 0.08, hex("#d9937a"));
    // Barrow out front.
    f.at(0, 0, 1.25).box(0, 0.5, 0, 0.9, 0.5, 1.1, hex("#8f3a2c"), { taper: 1.2, bottom: true }).cylX(0, 0.26, 0.72, 0.26, 0.16, 8, hex("#2e2a26")).box(-0.4, 0.86, -0.82, 0.08, 0.08, 0.9, Br, { bottom: true }).box(0.4, 0.86, -0.82, 0.08, 0.08, 0.9, Br, { bottom: true });
    f.box(-0.1, 0.96, 0, 0.5, 0.26, 0.5, hex("#d9b84a")).box(0.2, 1, 0.2, 0.3, 0.3, 0.3, hex("#7ac04a")).reset();
    f.register(a, "farmer");

    // Sheep, facing +z.
    const s = new MB(), Wool = hex("#f7f1e4"), Fc = hex("#2c2628");
    s.ball(0, 0.92, 0, 0.62, 7, 4, Wool, { sz: 1.3 }).ball(0.2, 1.3, -0.3, 0.3, 6, 3, Wool).ball(-0.25, 1.28, 0.25, 0.3, 6, 3, Wool);
    s.box(0, 0.98, 0.88, 0.36, 0.42, 0.42, Fc, { bottom: true }).box(-0.26, 1.2, 0.84, 0.2, 0.1, 0.12, Fc).box(0.26, 1.2, 0.84, 0.2, 0.1, 0.12, Fc);
    s.box(-0.11, 1.2, 1.09, 0.08, 0.08, 0.02, Wh).box(0.11, 1.2, 1.09, 0.08, 0.08, 0.02, Wh);
    for (const [x, z] of [[-0.28, 0.5], [0.28, 0.5], [-0.28, -0.5], [0.28, -0.5]]) s.box(x, 0, z, 0.14, 0.5, 0.14, Fc, { bottom: true });
    s.register(a, "sheep");

    // Waving flag, on its local +x.
    const fl = new MB(), wt = [1, 1, 1];
    fl.quad([0, 0, 0], [1.1, 0.14, 0], [1.1, 0.64, 0], [0, 0.78, 0], wt).quad([0, 0.78, 0], [1.1, 0.64, 0], [1.1, 0.14, 0], [0, 0, 0], wt).register(a, "flag");
    a.lathe("puff", [[0.01, -1], [0.6, -0.8], [1, 0], [0.6, 0.8], [0.01, 1]], { segments: 6, color: "#ffffff" });
    registerBall(game); registerNets(game);
}

/** Painted billboards: stars, ground dust, the ball's flame. */
export function paintSprites(game) {
    const a = game.assets;
    a.paint("star", 64, 64, (p) => {
        const pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 27, ang = -Math.PI / 2 + i / 10 * Math.PI * 2; pts.push([32 + Math.cos(ang) * r, 32 + Math.sin(ang) * r]); }
        p.poly(pts, "#ffd84a"); p.outline("#b5671c");
    }, { smooth: true });
    a.paint("glow", 64, 64, (p) => {
        const d = p.data;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const r = Math.hypot(x - 31.5, y - 31.5) / 31.5, k = Math.max(0, 1 - r), i = (y * 64 + x) * 4; d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255 * k * k; }
    }, { smooth: true });
    a.paint("flame", 64, 64, (p) => {
        const d = p.data;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const r = Math.hypot(x - 31.5, y - 31.5) / 31.5, k = Math.max(0, 1 - r), i = (y * 64 + x) * 4; d[i] = 255; d[i + 1] = 150 + 105 * k; d[i + 2] = 40 + 160 * k * k; d[i + 3] = 255 * Math.min(1, k * 1.8); }
    }, { smooth: true });
    a.paint("dust", 64, 64, (p) => {
        p.circle(32, 34, 22, "#ffffffd0").circle(20, 38, 13, "#ffffffc0").circle(44, 38, 14, "#ffffffc0");
    }, { smooth: true });
}

