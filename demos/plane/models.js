// Small paper things: the planes, the ball a crumpled plane becomes, wreaths, puffs, gulls, clouds, waves, the sky.
import { Paper, CUT, Rand, hex, mix, mul } from "./paper.js";
import { PEOPLE, PLANES, TIMES } from "./data.js";

const WHITE = hex("#ece4d2"), SHADE = hex("#c9bda6"), RED = hex("#d9493a"), BLUE = hex("#2f6a9e");

/** A wing panel with an airmail edge along its leading side: the plane's own livery. */
function wing(p, a, b, c, col, flip) {
    // a nose, b tip, c root-rear
    p.both(flip ? [a, c, b] : [a, b, c], col, mul(col, 0.92));
    // A fold along the wing: the outer panel catches the light differently.
    const mid = [(a[0] + b[0] * 2) / 3, (a[1] + b[1] * 2) / 3, (a[2] + b[2] * 2) / 3], m2 = [(c[0] + b[0]) / 2, (c[1] + b[1]) / 2 + 0.006, (c[2] + b[2]) / 2], tone = mul(col, 0.93);
    const qq = [mid, b, m2].map((v) => [v[0], v[1] + 0.008, v[2]]); p.fan(flip ? [qq[0], qq[2], qq[1]] : qq, tone);
    const n = 8;
    for (let i = 0; i < n; i++) {
        const t0 = (i + 0.1) / n, t1 = (i + 0.72) / n, e = 0.11, up = [0, 0.012, 0];
        const L = (t, k) => { const q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], r = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t]; return [q[0] + (r[0] - q[0]) * k + up[0], q[1] + (r[1] - q[1]) * k + up[1], q[2] + (r[2] - q[2]) * k + up[2]]; };
        const q = [L(t0, 0.02), L(t1, 0.02), L(t1 - 0.02, e * 1.1), L(t0 - 0.02, e * 1.1)];
        p.fan(flip ? q.slice().reverse() : q, i % 2 ? BLUE : RED);
    }
}
function planeMesh(id) {
    const p = new Paper(3, 6);
    const keel = (nose, back, drop) => {
        p.both([nose, [back, -drop * 0, 0].length ? [0, 0, back] : 0, [0, -drop, back]].map((v) => v), SHADE, mul(SHADE, 0.9));
    };
    if (id === "postman") {
        const N = [0, 0, -1.25], T = 0.95;
        wing(p, N, [-T, 0.2, 0.85], [0, 0, 0.85], WHITE, false); wing(p, N, [T, 0.2, 0.85], [0, 0, 0.85], WHITE, true); keel(N, 0.85, 0.3);
    } else if (id === "dart") {
        const N = [0, 0, -1.7], T = 0.62;
        wing(p, N, [-T, 0.1, 0.8], [0, 0, 0.8], hex("#fbe9c8"), false); wing(p, N, [T, 0.1, 0.8], [0, 0, 0.8], hex("#fbe9c8"), true); keel(N, 0.8, 0.36);
        p.both([[-T, 0.1, 0.8], [-T - 0.02, 0.32, 0.75], [-T + 0.15, 0.1, 0.4]], RED); p.both([[T, 0.1, 0.8], [T + 0.02, 0.32, 0.75], [T - 0.15, 0.1, 0.4]], RED);
    } else if (id === "longwing") {
        const N = [0, 0, -0.95], c = hex("#e3f0ea");
        p.both([N, [-1.6, 0.24, 0.1], [-1.5, 0.26, 0.55], [0, 0, 0.7]], c, mul(c, 0.9)); p.both([N, [0, 0, 0.7], [1.5, 0.26, 0.55], [1.6, 0.24, 0.1]], c, mul(c, 0.9));
        wing(p, N, [-1.6, 0.25, 0.1], [0, 0, 0.3], c, false); wing(p, N, [1.6, 0.25, 0.1], [0, 0, 0.3], c, true);
        for (const s of [-1, 1]) p.both([[s * 1.6, 0.24, 0.1], [s * 1.5, 0.26, 0.55], [s * 1.62, 0.56, 0.45]], BLUE);
        keel(N, 0.7, 0.22);
    } else if (id === "swallow") {
        const N = [0, 0, -1.2], c = hex("#d9593f"), l = hex("#f6e7c8");
        wing(p, N, [-1.15, 0.12, 0.42], [0, 0, 0.1], c, false); wing(p, N, [1.15, 0.12, 0.42], [0, 0, 0.1], c, true);
        p.both([[-0.3, 0.02, 0.1], [0, 0, 0.1], [-0.05, 0.02, 0.5], [-0.45, 0.06, 1.2]], l, mul(l, 0.9)); p.both([[0, 0, 0.1], [0.3, 0.02, 0.1], [0.45, 0.06, 1.2], [0.05, 0.02, 0.5]], l, mul(l, 0.9));
        keel(N, 0.3, 0.22);
        p.both([N, [-0.12, 0.012, -0.6], [0.12, 0.012, -0.6]], hex("#efc15f"));
    }
    return p;
}
/** The crane is three meshes of itself, wings up, level and down. */
function craneMesh(flap) {
    const p = new Paper(3, 6), c = hex("#f4c6c0"), d = mul(c, 0.86), w = hex("#fbf4e4");
    const u = flap * 0.75;
    p.both([[0, 0, -0.5], [-0.22, -0.2, 0], [0, -0.32, 0.5]], d, c); p.both([[0, 0, -0.5], [0, -0.32, 0.5], [0.22, -0.2, 0]], d, c);
    p.both([[0, -0.1, -0.35], [0, -0.3, -0.1], [0, 0.32, -1.25]], c); p.both([[0, 0.32, -1.25], [0, 0.38, -1.25], [0.02, 0.2, -1.5]], RED);
    p.both([[0, -0.1, 0.3], [0, -0.3, 0.1], [0, 0.44, 1.25]], c);
    p.both([[0, -0.02, -0.5], [-1.5, 0.2 + u, 0.05], [0, -0.02, 0.45]], w, mul(w, 0.9)); p.both([[0, -0.02, 0.45], [1.5, 0.2 + u, 0.05], [0, -0.02, -0.5]], w, mul(w, 0.9));
    return p;
}
function ballMesh(seed, r, spread) {
    const p = new Paper(seed, 3), R = new Rand(seed), n = 8, m = 6, P = [];
    for (let j = 0; j <= m; j++) { const row = []; for (let i = 0; i < n; i++) { const th = j / m * Math.PI, ph = i / n * 6.2832, k = r * R.range(1 - spread, 1 + spread); row.push([k * Math.sin(th) * Math.cos(ph), k * Math.cos(th), k * Math.sin(th) * Math.sin(ph)]); } P.push(row); }
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
        const a = P[j][i], b = P[j][(i + 1) % n], c = P[j + 1][(i + 1) % n], d = P[j + 1][i], t = mul(WHITE, R.range(0.78, 1));
        p.tri(a, b, c, t); p.tri(a, c, d, mul(WHITE, R.range(0.78, 1)));
    }
    return p;
}
function wreath(col, inner, outer) {
    const p = new Paper(5, 6), n = 22;
    for (let i = 0; i < n; i++) {
        const a0 = i / n * 6.2832, a1 = (i + 1) / n * 6.2832, am = (a0 + a1) / 2, c = i % 2 ? col : mix(col, CUT, 0.42);
        const P = (a, r) => [r * Math.cos(a), r * Math.sin(a), 0];
        p.both([P(a0, inner), P(a1, inner), P(am, outer * 1.06)], c); p.both([P(am, inner), P(a0 + 6.2832 / n, outer * 0.92), P(a0, outer * 0.92)], mul(c, 0.86));
    }
    return p;
}
function envelope() {
    const p = new Paper(6, 3), w = 1, h = 0.7, c = hex("#fbf1dc"), f = hex("#f0dfbf");
    p.both([[-w, -h, 0], [w, -h, 0], [w, h, 0], [-w, h, 0]], c);
    p.fan([[-w, h, 0.02], [0, -0.05, 0.02], [w, h, 0.02]], f);
    p.fan([[-0.14, 0.14, 0.04], [0.14, 0.14, 0.04], [0.14, 0.4, 0.04], [-0.14, 0.4, 0.04]], RED);
    return p;
}
function stampToken() {
    const p = new Paper(6, 3), n = 7, pts = [], c = hex("#f7efdc");
    const add = (x, y) => pts.push([x, y, 0]);
    const w = 1, h = 1.25;
    for (let i = 0; i < n; i++) { const t = i / n; add(-w + 2 * w * t, -h); add(-w + 2 * w * (t + 0.5 / n), -h + 0.09); }
    for (let i = 0; i < n; i++) { const t = i / n; add(w, -h + 2 * h * t); add(w - 0.09, -h + 2 * h * (t + 0.5 / n)); }
    for (let i = 0; i < n; i++) { const t = i / n; add(w - 2 * w * t, h); add(w - 2 * w * (t + 0.5 / n), h - 0.09); }
    for (let i = 0; i < n; i++) { const t = i / n; add(-w, h - 2 * h * t); add(-w + 0.09, h - 2 * h * (t + 0.5 / n)); }
    p.both(pts, c);
    for (const z of [0.03, -0.03]) { const q = [[-0.72, -0.95, z], [0.72, -0.95, z], [0.72, 0.95, z], [-0.72, 0.95, z]]; p.fan(z > 0 ? q : q.slice().reverse(), hex("#d9593f")); const s = [[0, 0.55, z * 2], [0.42, -0.45, z * 2], [-0.42, -0.45, z * 2]]; p.fan(z > 0 ? [s[2], s[1], s[0]] : s, hex("#fbf1dc")); }
    return p;
}
function puff() {
    const p = new Paper(9, 3), c = hex("#ffffff");
    for (let k = 0; k < 2; k++) { const pts = [], q = k ? 0.62 : 1, n = 30; for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + k * 0.5, r = q * (1 + 0.13 * Math.sin(a * 6 + k)); pts.push([r * Math.cos(a), r * Math.sin(a), k * 0.03]); } p.both(pts, k ? c : mul(c, 0.88)); }
    return p;
}
function gull(up) {
    const p = new Paper(9, 3), w = hex("#fbfbf6"), g = hex("#c7ced6"), y = up;
    p.both([[0, 0, -0.5], [0.14, 0, 0.5], [-0.14, 0, 0.5]], w);
    p.both([[0, 0, -0.2], [0, 0, 0.3], [-1.1, y, 0.2]], w, g); p.both([[0, 0, 0.3], [0, 0, -0.2], [1.1, y, 0.2]], w, g);
    p.both([[-1.1, y, 0.2], [-0.8, y * 0.7, 0], [-1.3, y * 1.1, 0.34]], hex("#3a4a5c")); p.both([[0.8, y * 0.7, 0], [1.1, y, 0.2], [1.3, y * 1.1, 0.34]], hex("#3a4a5c"));
    return p;
}
function cloud(seed) {
    const p = new Paper(seed, 30), r = new Rand(seed), c = hex("#fffaf0");
    for (let l = 0; l < 3; l++) {
        const z = (l - 1) * -1.6, tone = mul(c, 1 - l * 0.075), w = 30 - l * 6, lumps = 6 - l, base = -1 - l * 1.3;
        for (let i = 0; i < lumps; i++) {
            const t = lumps > 1 ? i / (lumps - 1) : 0.5, x = -w + 2 * w * t, R = 7 + (1 - Math.abs(t * 2 - 1)) * (9 - l) + r.range(-1.2, 1.2), pts = [];
            for (let a = 0; a <= 14; a++) { const an = a / 14 * Math.PI; pts.push([x + R * 1.1 * Math.cos(an), base + R * 0.8 * Math.sin(an), z + i * 0.02]); }
            pts.reverse(); p.both(pts.reverse(), tone);
        }
        p.both([[-w - 8, base - 2.5, z], [w + 8, base - 2.5, z], [w + 8, base + 0.05, z], [-w - 8, base + 0.05, z]], tone);
    }
    return p;
}
function waveMesh(period, len, depth) {
    const p = new Paper(13, 20); p.uvFn = (q) => [(q[0] / 84) % 1 + 0.5 * 0 + (q[0] < 0 ? 1 : 0), (q[2] + 2) / 26]; const n = Math.round(len / period), deep = hex("#2e8f9c"), mid = hex("#4fb3b4"), crest = hex("#a9e0d2"), foam = hex("#f4fbf0");
    for (let i = 0; i < n; i++) {
        const x0 = -len / 2 + i * period, seg = 6, top = [], lip = [];
        for (let k = 0; k <= seg; k++) { const t = k / seg, x = x0 + period * t, s = Math.sin(t * Math.PI); top.push([x, -0.05 + s * 0.85, s * 0.9]); lip.push([x, -0.05 + s * 0.85 - 0.24, s * 0.9 + 0.1]); }
        for (let k = 0; k < seg; k++) {
            const A = top[k], B = top[k + 1], C = lip[k + 1], D = lip[k], t0 = k / seg, t1 = (k + 1) / seg;
            p.quad(D, C, B, A, foam);
            const a = [x0 + period * t0, -1.1, depth], b = [x0 + period * t1, -1.1, depth];
            p.quad(a, b, C, D, deep, deep, mid, mid);
            p.quad(B, A, [A[0], -1.1, -0.1], [B[0], -1.1, -0.1], crest, crest, deep, deep);
        }
    }
    return p;
}
function sky(t, sunDir, idx) {
    const p = new Paper(17, 400), r = new Rand(23 + idx), R = 1000, stops0 = t.dome.map(hex), seg = 96, fog = hex(t.fog);
    p.uvFn = (q) => [0.5 + 0.5 * Math.atan2(q[2], q[0]) / Math.PI, Math.abs(q[1]) / R * 0.5 + 0.2];
    // Twice as many sheets as colour stops: each band a hand-torn step between the two.
    const stops = []; stops0.forEach((c, i) => { stops.push(c); if (i < stops0.length - 1) stops.push(mix(c, stops0[i + 1], 0.5)); });
    const ring = (e0, e1, c, amp, ph) => {
        for (let i = 0; i < seg; i++) {
            const a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832, w = (a) => amp * (Math.sin(a * 5 + ph) * 0.5 + Math.sin(a * 11 + ph * 2) * 0.32 + Math.sin(a * 23 + ph * 3) * 0.18);
            const P = (a, e) => [R * Math.cos(e) * Math.cos(a), R * Math.sin(e), R * Math.cos(e) * Math.sin(a)];
            p.quad(P(a1, e0), P(a1, e1 + w(a1)), P(a0, e1 + w(a0)), P(a0, e0), c);
        }
    };
    ring(-0.5, 0.012, fog, 0, 0);
    const N = stops.length, top = 1.55;
    for (let i = 0; i < N; i++) { const e0 = i ? (i / N) ** 1.35 * top : 0, e1 = i === N - 1 ? top : ((i + 1) / N) ** 1.35 * top; ring(e0 - 0.04, e1, stops[i], i === N - 1 ? 0 : 0.016 + i * 0.002, i * 2.1); }
    // Cloud banks: scalloped paper along the horizon.
    for (let b = 0; b < 2; b++) {
        const c = mix(fog, hex("#ffffff"), idx === 3 ? 0.04 : 0.34 - b * 0.16), lumps = 44, e0 = 0.0, h = 0.05 + b * 0.03;
        for (let i = 0; i < lumps; i++) {
            const a0 = i / lumps * 6.2832 + b, a1 = (i + 1) / lumps * 6.2832 + b, s = 0.55 + 0.45 * Math.sin(i * 1.7 + b * 3), P = (a, e) => [(R - 6 + b) * Math.cos(e) * Math.cos(a), (R - 6 + b) * Math.sin(e), (R - 6 + b) * Math.cos(e) * Math.sin(a)];
            const am = (a0 + a1) / 2;
            p.fan([P(a1, e0), P(a1, e0 + h * s * 0.7), P(am, e0 + h * s), P(a0, e0 + h * s * 0.7), P(a0, e0)], c);
        }
    }
    // The sun, or the moon: discs of cut card with a ring of rays. Sits opposite the way the light travels.
    const l = Math.hypot(...sunDir), s = [-sunDir[0] / l, Math.max(0.16, -sunDir[1] / l), -sunDir[2] / l], sl = Math.hypot(...s), c0 = s.map((v) => v / sl * (R - 12));
    const ux = norm3(cross3([0, 1, 0], c0)), uy = norm3(cross3(c0, ux));
    const disc = (rad, col, off, rays) => {
        const k = 1 - off / R, pts = [], n = rays ? rays * 2 : 28;
        for (let i = 0; i < n; i++) { const a = -i / n * 6.2832, q = rad * (rays ? (i % 2 ? 0.8 : 1) : 1); pts.push([c0[0] * k + (ux[0] * Math.cos(a) + uy[0] * Math.sin(a)) * q, c0[1] * k + (ux[1] * Math.cos(a) + uy[1] * Math.sin(a)) * q, c0[2] * k + (ux[2] * Math.cos(a) + uy[2] * Math.sin(a)) * q]); }
        p.fan(pts, col);
    };
    if (idx === 3) {
        disc(58, hex("#f6efd8"), 2);
        const b = hex("#d6cfbc"); for (const [dx, dy, q] of [[-18, 12, 10], [16, -20, 13], [22, 18, 6]]) { const o = 3, pts = []; for (let i = 0; i < 12; i++) { const a = -i / 12 * 6.2832, x = dx + q * Math.cos(a), y = dy + q * Math.sin(a), k = 1 - o / R; pts.push([c0[0] * k + ux[0] * x + uy[0] * y, c0[1] * k + ux[1] * x + uy[1] * y, c0[2] * k + ux[2] * x + uy[2] * y]); } p.fan(pts, b); }
        for (let i = 0; i < 180; i++) {
            const a = r.next() * 6.2832, e = 0.1 + r.next() ** 0.7 * 1.3, q = 2 + r.next() * 3.2, C = [(R - 8) * Math.cos(e) * Math.cos(a), (R - 8) * Math.sin(e), (R - 8) * Math.cos(e) * Math.sin(a)], X = norm3(cross3([0, 1, 0], C)), Y = norm3(cross3(C, X)), pts = [];
            for (let k = 0; k < 8; k++) { const b2 = -k / 8 * 6.2832, w = q * (k % 2 ? 0.34 : 1); pts.push([C[0] + (X[0] * Math.cos(b2) + Y[0] * Math.sin(b2)) * w, C[1] + (X[1] * Math.cos(b2) + Y[1] * Math.sin(b2)) * w, C[2] + (X[2] * Math.cos(b2) + Y[2] * Math.sin(b2)) * w]); }
            p.fan(pts, mix(hex("#fff3c4"), hex("#ffffff"), r.next()));
        }
    } else {
        const glow = idx === 2 ? "#ffd27a" : "#fff0c0";
        disc(120, mix(stops[Math.min(N - 1, 2)], hex(glow), 0.3), 1, 0); disc(84, mix(hex(glow), hex("#ffffff"), 0.1), 2, 16); disc(58, hex(idx === 2 ? "#ffb35a" : "#ffe08a"), 3, 0);
    }
    return p;
}
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** A resident as a paper doll on a stick. */
function doll(person) {
    const p = new Paper(4, 3), skin = hex(person.skin), hair = hex(person.hair), coat = hex(person.coat);
    const flat = (pts, c) => p.both(pts.map(([x, y]) => [x, y, 0]), c);
    const blob = (cx, cy, rx, ry, c, n = 14) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } flat(pts, c); };
    flat([[-0.09, -2], [0.09, -2], [0.09, 0], [-0.09, 0]], hex("#a9744f"));
    p.at(0, 0, 0.01); flat([[-0.85, 0], [0.85, 0], [0.62, 1.7], [0.3, 2.05], [-0.3, 2.05], [-0.62, 1.7]], coat);
    p.at(0, 0, 0.03); flat([[-0.95, 1.65], [-0.62, 1.8], [-0.98, 3 - 2], [-1.25, 1.05]], mul(coat, 0.88)); flat([[0.62, 1.8], [0.95, 1.65], [1.25, 1.05], [0.98, 1]], mul(coat, 0.88));
    p.at(0, 0, 0.05); blob(0, 2.75, 0.74, 0.8, skin);
    p.at(0, 0, 0.07); flat([[-0.78, 2.8], [-0.7, 3.3], [-0.2, 3.62], [0.3, 3.6], [0.72, 3.25], [0.78, 2.8], [0.42, 3.15], [-0.3, 3.2]], hair);
    p.at(0, 0, 0.09); blob(-0.27, 2.72, 0.07, 0.09, hex("#2a2a34"), 8); blob(0.27, 2.72, 0.07, 0.09, hex("#2a2a34"), 8);
    flat([[-0.2, 2.42], [0, 2.32], [0.2, 2.42], [0, 2.38]], hex("#a0473a")); blob(-0.46, 2.5, 0.13, 0.09, hex("#ef9c86"), 8); blob(0.46, 2.5, 0.13, 0.09, hex("#ef9c86"), 8);
    p.at(0, 0, 0.11);
    if (person.hat === "bun") blob(0, 3.75, 0.34, 0.3, hair, 10);
    if (person.hat === "flat") flat([[-0.9, 3.2], [0.9, 3.2], [0.66, 3.66], [-0.66, 3.66]], mul(coat, 0.8));
    if (person.hat === "cap") flat([[-0.82, 3.1], [0.82, 3.1], [0.95, 3.6], [0.5, 3.98], [-0.5, 3.98], [-0.95, 3.6]], hex("#fbf4e4"));
    if (person.hat === "beard") flat([[-0.72, 2.6], [-0.3, 2.34], [0.3, 2.34], [0.72, 2.6], [0.52, 1.96], [0, 1.72], [-0.52, 1.96]], hair);
    if (person.hat === "plaits") { flat([[-0.78, 2.9], [-0.98, 2.2], [-0.8, 1.9], [-0.56, 2.4]], hair); flat([[0.78, 2.9], [0.56, 2.4], [0.8, 1.9], [0.98, 2.2]], hair); }
    if (person.hat === "scarf") flat([[-0.82, 3], [0.82, 3], [0.74, 3.5], [0, 3.72], [-0.74, 3.5]], mul(coat, 1.15));
    if (person.hat === "specs") { blob(-0.3, 2.74, 0.22, 0.2, hex("#fbf4e4"), 10); blob(0.3, 2.74, 0.22, 0.2, hex("#fbf4e4"), 10); p.at(0, 0, 0.13); blob(-0.3, 2.74, 0.07, 0.08, hex("#2a2a34"), 8); blob(0.3, 2.74, 0.07, 0.08, hex("#2a2a34"), 8); }
    p.reset();
    return p;
}
function boatBig() {
    const p = new Paper(4, 8), hull = hex("#2f5f73"), lo = hex("#a9d3dd"), L = 11, W = 3.6;
    const prof = [[-L, 3], [-L * 0.8, 1], [L * 0.7, 1], [L, 3.6]], side = (s) => { p.both([[-L, 3, 0], [-L * 0.8, 0.4, s * W * 0.7], [L * 0.7, 0.4, s * W * 0.7], [L, 3.6, 0], [L * 0.5, 3.2, s * W], [-L * 0.5, 3, s * W]], hull); };
    side(1); side(-1); p.box(-1, 3, 0, 8, 3.6, 4.6, hex("#fbf4e4"), { top: hex("#d9593f") }); p.both([[1, 6.5, 0], [1.3, 6.5, 0], [1.3, 12, 0], [1, 12, 0]], hex("#7f5238"));
    p.both([[1.4, 7.5, 0], [8, 7.5, 0], [1.4, 12, 0]], hex("#fff8ea"));
    return p;
}
function kite() {
    const p = new Paper(4, 6);
    p.both([[0, 3.6, 0], [2.2, 0.6, 0], [0, -3.6, 0]], hex("#d9593f"), hex("#d9593f")); p.both([[0, 3.6, 0], [0, -3.6, 0], [-2.2, 0.6, 0]], hex("#efc15f"), hex("#efc15f"));
    for (let i = 0; i < 5; i++) { const y = -3.6 - i * 1.1, x = Math.sin(i * 1.3) * 0.4; p.both([[x - 0.42, y - 0.3, 0], [x + 0.42, y - 0.3, 0], [x, y + 0.3, 0]], i % 2 ? hex("#3f8c8e") : hex("#f2a5a0")); }
    return p;
}
function sail() {
    const p = new Paper(4, 6), w = hex("#f4e8d0"), lat = hex("#a9744f");
    p.both([[-0.2, 0, 0.5], [0.2, 0, 0.5], [0.2, 14, 0.5], [-0.2, 14, 0.5]], lat);
    p.both([[0.2, 3, 0.55], [2.7, 3, 0.55], [2.7, 14, 0.55], [0.2, 14, 0.55]], w);
    for (let i = 0; i < 5; i++) p.both([[0.2, 3.6 + i * 2.2, 0.6], [2.7, 3.6 + i * 2.2, 0.6], [2.7, 3.8 + i * 2.2, 0.6], [0.2, 3.8 + i * 2.2, 0.6]], lat);
    return p;
}
export function buildModels(assets, ribbons) {
    for (const c of PLANES.slice(0, 4)) planeMesh(c.id).commit(assets, `plane_${c.id}`);
    craneMesh(-0.5).commit(assets, "plane_crane"); craneMesh(0.8).commit(assets, "plane_crane_up"); craneMesh(-1).commit(assets, "plane_crane_down");
    ballMesh(4, 0.62, 0.2).commit(assets, "ball"); ballMesh(8, 0.8, 0.45).commit(assets, "ball2");
    wreath(hex("#e8735a"), 5.2, 7.4).commit(assets, "wreath"); wreath(hex("#efc15f"), 5.6, 7).commit(assets, "hoop"); wreath(hex("#d7ccb4"), 5.6, 7).commit(assets, "hoopDone");
    envelope().commit(assets, "env"); stampToken().commit(assets, "stamp"); puff().commit(assets, "puff"); gull(0.5).commit(assets, "gullA"); gull(-0.25).commit(assets, "gullB");
    cloud(3).commit(assets, "cloudA"); cloud(19).commit(assets, "cloudB");
    waveMesh(14, 1680, 10).commit(assets, "wave");
    TIMES.forEach((t, i) => sky(t, t.sun, i).commit(assets, `sky${i}`));
    for (const [id, q] of Object.entries(PEOPLE)) doll(q).commit(assets, `doll_${id}`);
    boatBig().commit(assets, "kittiwake"); kite().commit(assets, "kite"); sail().commit(assets, "sail");
    { const p = new Paper(4, 4), c = hex("#fffaf0"); p.both([[-0.5, 0, 0], [0.5, 0, 0], [0.5, 0, 1], [-0.5, 0, 1]], c); p.commit(assets, "dash"); }
    { const p = new Paper(4, 4), c = hex("#ffffff"); p.both([[0, 0, 0.5], [0.5, 0, -0.5], [0, 0.04, -0.2], [-0.5, 0, -0.5]], c); p.commit(assets, "chevron"); }
    { const p = new Paper(4, 4); p.both([[-0.5, -0.5, 0], [0.5, -0.5, 0], [0.5, 0.5, 0], [-0.5, 0.5, 0]], [1, 1, 1]); p.commit(assets, "scrap"); }
    ribbons.forEach((r, i) => {
        const p = new Paper(40 + i, 10), col = hex(r.hue), strands = 3;
        for (let s = 0; s < strands; s++) {
            const c = mix(col, CUT, s === 1 ? 0.5 : 0.12);
            let last = null, frame = null;
            for (let k = 0; k < r.pts.length; k++) {
                const P = r.pts[k], T = r.tan[k], X = norm3(cross3(T, [0, 1, 0])), Y = norm3(cross3(X, T)), a = s * 2.094 + k * 0.17, rad = r.width * 0.66, w = 0.24;
                const C = [P[0] + (X[0] * Math.cos(a) + Y[0] * Math.sin(a)) * rad, P[1] + (X[1] * Math.cos(a) + Y[1] * Math.sin(a)) * rad, P[2] + (X[2] * Math.cos(a) + Y[2] * Math.sin(a)) * rad];
                const E = [X[0] * Math.cos(a + 0.6) + Y[0] * Math.sin(a + 0.6), X[1] * Math.cos(a + 0.6) + Y[1] * Math.sin(a + 0.6), X[2] * Math.cos(a + 0.6) + Y[2] * Math.sin(a + 0.6)];
                const A = [C[0] + E[0] * w, C[1] + E[1] * w, C[2] + E[2] * w], B = [C[0] - E[0] * w, C[1] - E[1] * w, C[2] - E[2] * w];
                if (last) p.both([last[0], A, B, last[1]], k % 8 < 4 ? c : mul(c, 0.9));
                last = [A, B];
            }
        }
        p.commit(assets, `ribbon${i}`);
    });
}
