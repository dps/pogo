// Painted food and kitchen. The look: warm gouache under lantern light, soft edges, deep soy-brown shadows.
// Light always falls from the top left. Everything here is drawn per pixel at load.
import { BROTHS } from "./data.js";

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (a, b, t) => a + (b - a) * t;
export const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
export const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

function hash(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
export function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
export function fbm(x, y, n = 3) { let s = 0, a = 0.5; for (let i = 0; i < n; i++) { s += a * noise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** n); }
export const rng = (seed) => { let s = seed >>> 0 || 1; return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 4294967296; }; };

/** Fill a frame by calling fn(x, y) => [r,g,b,a] (0-255). */
export function shader(p, fn) {
    const w = p.width, h = p.height, d = p.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = fn(x, y);
        if (!c) continue;
        const o = p.index(x, y), a0 = (c.length > 3 ? clamp(c[3], 0, 255) : 255) / 255;
        if (a0 <= 0) continue;
        const b0 = d[o + 3] / 255, a = a0 + b0 * (1 - a0);
        for (let i = 0; i < 3; i++) d[o + i] = clamp((c[i] * a0 + d[o + i] * b0 * (1 - a0)) / a, 0, 255);
        d[o + 3] = a * 255;
    }
}

/** A soft round dab of paint. edge is how many pixels it fades over. */
export function dab(p, cx, cy, r, c, alpha = 1, edge = 1) {
    const w = p.width, h = p.height, d = p.data, R = r + edge;
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(w - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(h - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dist = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), a0 = clamp((r + edge * 0.5 - dist) / edge) * alpha;
        if (a0 <= 0) continue;
        const o = p.index(x, y), b0 = d[o + 3] / 255, a = a0 + b0 * (1 - a0);
        for (let i = 0; i < 3; i++) d[o + i] = (c[i] * a0 + d[o + i] * b0 * (1 - a0)) / a;
        d[o + 3] = a * 255;
    }
}

/** A brush stroke along points, with a width taken from fn(t) if it's a function. */
export function brush(p, pts, width, c, alpha = 1, edge = 1.2) {
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let run = 0;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], seg = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(seg / 1.5));
        for (let k = 0; k <= n; k++) {
            const t = k / n, wd = typeof width === "function" ? width((run + seg * t) / len) : width;
            dab(p, mix(a[0], b[0], t), mix(a[1], b[1], t), wd, c, alpha, edge);
        }
        run += seg;
    }
}

/** Catmull-Rom through points, for smooth strokes from a few numbers. */
export function curve(pts, n = 10) {
    const out = [], P = (i) => pts[clamp(i, 0, pts.length - 1)];
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, a = P(i - 1), b = P(i), c = P(i + 1), e = P(i + 2);
        const f = (j) => 0.5 * (2 * b[j] + (c[j] - a[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - e[j]) * t2 + (3 * b[j] - a[j] - 3 * c[j] + e[j]) * t3);
        out.push([f(0), f(1)]);
    }
    out.push(pts[pts.length - 1]);
    return out;
}

// --- The bowl ---------------------------------------------------------------------------------------------------
export const BOWL = { w: 360, h: 310, cx: 180, cy: 128, rx: 168, ry: 120, depth: 176 };

function paintBowl(p, frame) {
    const { cx, cy, rx, ry, depth } = BOWL;
    const G = [
        { body: "#efe6d4", dark: "#b7a68c", in: "#f6efe0", line: "#3e5c88" },
        { body: "#31507e", dark: "#1a2c4e", in: "#efe7d6", line: "#f3ead6" },
        { body: "#a83423", dark: "#5f1a12", in: "#f0e3cc", line: "#21120d" },
        { body: "#7f8f63", dark: "#4a5a3c", in: "#ece4cd", line: "#3a4531" },
        { body: "#1e1d2b", dark: "#0d0c15", in: "#d7c7a3", line: "#e7b94f" },
    ][frame];
    const body = hex(G.body), dark = hex(G.dark), inner = hex(G.in), line = hex(G.line), ink = [34, 19, 14];
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, r = Math.hypot(u, v);
        const ly = (y + 0.5 - cy) / depth;
        const halfW = y > cy ? rx * Math.sqrt(Math.max(0, 1 - ly * ly * ly * ly * 0.98)) * (1 - ly * ly * 0.42) : 0;
        const outerBody = y > cy && Math.abs(x + 0.5 - cx) < halfW && ly < 0.94;
        const foot = y > cy + depth * 0.8 && Math.abs(x + 0.5 - cx) < rx * (0.46 - (ly - 0.8) * 0.3) - (ly > 0.96 ? (ly - 0.96) * 300 : 0) && ly < 1;
        if (r > 1.012 && !outerBody && !foot) return null;
        const aa = r > 1 && !outerBody ? 1 - (r - 1) / 0.012 : 1;
        if (r <= 1) {
            if (r > 0.925) {          // the rim
                const lit = 0.5 - 0.5 * (u * 0.6 + v * 0.8) / Math.max(r, 0.01), tip = 1 - Math.abs((r - 0.965) / 0.04);
                let c = mix3(frame === 4 ? line : body, frame === 4 ? [255, 236, 170] : [255, 250, 235], lit * 0.75 * clamp(tip) + 0.1);
                if (frame === 0 && r < 0.95) c = mix3(c, line, 0.55);
                c = mix3(c, ink, smooth(0.985, 1.0, r) * 0.55);
                return [c[0], c[1], c[2], 255 * aa];
            }
            // Inside wall: darker at the far side, catching light on the near right.
            const t = r / 0.925, wall = clamp(0.5 + (u * 0.34 + v * 0.62) * t);
            let c = mix3(mix3(inner, [150, 112, 80], 0.5), inner, wall * wall * 1.2 + 0.25);
            c = mix3(c, [255, 248, 232], smooth(0.5, 0.92, t) * smooth(0.1, 0.6, v) * 0.35);
            if (frame === 3) { const s = noise(x * 0.5, y * 0.5); if (s > 0.74) c = mix3(c, line, 0.3); }
            return [c[0], c[1], c[2], 255];
        }
        // Outside
        const k = (x + 0.5 - cx) / Math.max(halfW, 1), wrap = 1 - k * k, n = fbm(x * 0.03, y * 0.05, 3);
        let lit = clamp(0.28 + wrap * 0.55 - ly * 0.45 - k * 0.3 + (n - 0.5) * 0.12);
        if (foot && !outerBody) lit *= 0.5;
        let c = mix3(dark, body, lit);
        if (frame === 0) {        // Cloud: a hand-painted blue band.
            const band = Math.abs(ly - 0.2 - Math.sin(k * 3) * 0.015);
            if (band < 0.022) c = mix3(c, line, 0.85);
            if (Math.abs(ly - 0.3) < 0.01) c = mix3(c, line, 0.6);
            if (noise(x * 0.4, y * 0.4) > 0.8) c = mix3(c, [120, 96, 70], 0.18);
        } else if (frame === 1) { // Wave: overlapping scallops.
            const S = 34, row = Math.floor(y / (S * 0.5)), ox = row % 2 ? S / 2 : 0, cxx = Math.round((x - ox) / S) * S + ox, cyy = (row + 1) * (S * 0.5), dist = Math.hypot(x - cxx, (y - cyy) * 1.15), ring = Math.abs(((dist / 5.5) % 1) - 0.5);
            if (dist < S * 0.62 && ring < 0.13 && ly > 0.1) c = mix3(c, line, 0.55);
        } else if (frame === 2) { // Ember: drips of darker glaze from the rim.
            const drip = 0.3 + fbm(x * 0.02, 3, 2) * 0.55;
            if (ly < drip * 0.65) c = mix3(c, [34, 19, 14], 0.72);
        } else if (frame === 3) {
            if (noise(x * 0.6, y * 0.6) > 0.72) c = mix3(c, [228, 214, 170], 0.4);
            if (noise(x * 0.2, y * 0.25) > 0.76) c = mix3(c, [58, 70, 48], 0.5);
        } else {                  // Night: gold flecks and a gold band.
            if (hash(x >> 1, y >> 1) > 0.992) c = mix3(c, line, 0.9);
            if (Math.abs(ly - 0.22) < 0.015) c = mix3(c, line, 0.9);
        }
        const spec = smooth(0.06, 0.0, Math.hypot(k + 0.46, (ly - 0.3) * 0.7) - 0.09);
        c = mix3(c, [255, 252, 240], spec * 0.55);
        return [c[0], c[1], c[2], 255];
    });
}

function paintBroth(p, frame) {
    const w = p.width, h = p.height, cx = w / 2, cy = h / 2, B = Object.values(BROTHS)[frame], base = hex(B.color), deep = hex(B.deep), light = hex(B.light);
    const opaque = frame === 2 || frame === 3;
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / (w / 2 - 1), v = (y + 0.5 - cy) / (h / 2 - 1), r = Math.hypot(u, v);
        if (r > 1.005) return null;
        const n = fbm(x * 0.016 + frame * 7, y * 0.022, 4), n2 = fbm(x * 0.05 + 40, y * 0.06 + frame, 3);
        let c = mix3(deep, base, clamp(0.25 + n * 0.8 - v * 0.2 + r * 0.16));
        if (opaque) { const cloud = smooth(0.42, 0.72, n2); c = mix3(c, frame === 3 ? [255, 250, 236] : [228, 176, 104], cloud * 0.5); }
        c = mix3(c, deep, smooth(0.8, 1, r) * 0.72);              // meniscus shadow at the rim
        c = mix3(c, light, smooth(0.36, 0, Math.hypot(u + 0.34, (v + 0.42) * 1.2)) * 0.5);   // lamp glow
        return [c[0], c[1], c[2], clamp((1.005 - r) / 0.012) * 255];
    });
    // Beads of fat: the thing that makes broth look delicious.
    const R = rng(frame * 91 + 5), gold = frame === 4 ? [255, 120, 40] : frame === 3 ? [233, 196, 120] : [255, 214, 120];
    for (let i = 0; i < 150; i++) {
        const a = R() * 6.28, rr = Math.sqrt(R()) * 0.9, x = cx + Math.cos(a) * rr * (w / 2 - 6), y = cy + Math.sin(a) * rr * (h / 2 - 6), s = 1.2 + R() * R() * 6.5;
        dab(p, x, y, s, gold, frame === 3 ? 0.42 : 0.5, 1.2);
        dab(p, x - s * 0.3, y - s * 0.32, s * 0.36, [255, 250, 225], 0.75, 1);
        dab(p, x + s * 0.34, y + s * 0.36, s * 0.3, deep, 0.25, 1);
    }
    if (frame === 4) for (let i = 0; i < 40; i++) { const a = R() * 6.28, rr = R() * 0.85; dab(p, cx + Math.cos(a) * rr * w * 0.48, cy + Math.sin(a) * rr * h * 0.48, 1.4, [120, 20, 10], 0.75); }
}

function paintNest(p, frame) {
    const w = p.width, h = p.height, cx = w / 2, cy = h / 2, R = rng(17 + frame * 5);
    const thick = [4.2, 4.8, 8.2][frame], count = [46, 38, 22][frame], ampl = [1.5, 5, 2][frame];
    const hi = [255, 233, 158], mid = [243, 201, 104], low = [196, 134, 52], ink = [120, 72, 26];
    const strand = (seed) => {
        const a0 = R() * 6.28, turns = 0.6 + R() * 1.0, rad = 0.3 + R() * 0.62, dir = R() < 0.5 ? 1 : -1, pts = [], N = 44, phase = R() * 6;
        const ox = (R() - 0.5) * 0.3, oy = (R() - 0.5) * 0.3;
        for (let i = 0; i < N; i++) {
            const t = i / (N - 1), a = a0 + dir * turns * 3.14 * t, rr = rad * (0.82 + Math.sin(t * 5 + seed) * 0.16) + Math.sin(t * 26 + phase) * ampl * 0.012;
            let x = ox + Math.cos(a) * rr, y = oy + Math.sin(a) * rr;
            const lim = Math.hypot(x, y); if (lim > 0.96) { x *= 0.96 / lim; y *= 0.96 / lim; }
            pts.push([cx + x * (w / 2 - thick - 2), cy + y * (h / 2 - thick - 2)]);
        }
        return pts;
    };
    const taper = (t) => thick * (0.82 + 0.18 * Math.sin(t * 3.14));
    for (let i = 0; i < count; i++) {
        const pts = strand(i), shade = i / count;
        brush(p, pts.map(([x, y]) => [x + 1.4, y + 2.2]), thick + 1.2, ink, 0.34, 2);
        brush(p, pts, taper, mix3(low, mid, 0.4 + shade * 0.6));
        brush(p, pts.map(([x, y]) => [x - thick * 0.25, y - thick * 0.3]), thick * 0.46, mix3(mid, hi, 0.3 + shade * 0.7), 0.85);
        if (shade > 0.5) brush(p, pts.map(([x, y]) => [x - thick * 0.34, y - thick * 0.42]), thick * 0.16, [255, 248, 214], 0.6);
    }
}

// --- Toppings ---------------------------------------------------------------------------------------------------
const TS = 140;
function porkRound(p, cx, cy, Rr, seed) {
    dab(p, cx + 3, cy + 5, Rr + 2, [50, 22, 12], 0.4, 7);
    shader(p, (x, y) => {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, wob = 1 + (noise(Math.atan2(dy, dx) * 2 + seed, seed) - 0.5) * 0.14, r = Math.hypot(dx, dy) / (Rr * wob);
        if (r > 1.01) return null;
        const a = Math.atan2(dy, dx), fat = Math.sin(a * 1.0 + r * 12 + fbm(x * 0.05, y * 0.05) * 5);
        let c = mix3([202, 120, 92], [232, 166, 134], fbm(x * 0.09 + seed, y * 0.09, 3));
        c = mix3(c, [252, 232, 196], smooth(0.62, 0.92, fat) * 0.85);
        c = mix3(c, [150, 74, 44], smooth(0.7, 0.86, r) * 0.65);
        c = mix3(c, [76, 34, 18], smooth(0.87, 0.97, r));
        c = mix3(c, [255, 236, 214], smooth(0.5, 0, Math.hypot(dx + Rr * 0.32, dy + Rr * 0.34) / Rr) * 0.3);
        return [c[0], c[1], c[2], clamp((1.01 - r) * 40) * 255];
    });
}
function ring(p, x, y, r, w, c, alpha = 1) {
    for (let a = 0; a < 6.3; a += 0.25 / Math.max(r, 1) * 3) dab(p, x + Math.cos(a) * r, y + Math.sin(a) * r, w, c, alpha);
}
function eggHalf(p, cx, cy, s) {
    dab(p, cx + 3, cy + 6, s, [60, 34, 18], 0.4, 8);
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / (s * 1.0), v = (y + 0.5 - cy) / (s * 1.22), r = Math.hypot(u, v * (v < 0 ? 0.95 : 1.02));
        if (r > 1.01) return null;
        let c = mix3([252, 243, 226], [214, 174, 118], smooth(0.74, 1, r));
        const yo = Math.hypot(u + 0.02, v - 0.08) / 0.56;
        if (yo < 1.05) {
            c = mix3([250, 148, 36], [255, 188, 62], clamp(1 - yo));
            c = mix3(c, [255, 120, 22], smooth(0.2, 0.9, fbm(x * 0.12, y * 0.12)) * 0.4);
            c = mix3(c, [233, 118, 34], smooth(0.78, 1.0, yo));
            c = mix3(c, [255, 248, 220], smooth(0.34, 0, Math.hypot(u + 0.2, v + 0.14) * 1.6) * 0.8);
        }
        return [c[0], c[1], c[2], clamp((1.01 - r) * 40) * 255];
    });
}
function shrimpAt(p, cx, cy, s, flip) {
    const pts = [];
    for (let i = 0; i <= 26; i++) { const t = i / 26, a = -0.8 + t * 3.9; pts.push([cx + Math.cos(a) * s * (flip ? -1 : 1) * (1 - t * 0.22), cy + Math.sin(a) * s * (1 - t * 0.2)]); }
    brush(p, pts.map(([x, y]) => [x + 3, y + 5]), (t) => s * 0.46 * (1 - t * 0.68), [80, 30, 16], 0.3, 5);
    brush(p, pts, (t) => s * 0.46 * (1 - t * 0.68), [240, 138, 96]);
    for (let i = 3; i < 25; i += 4) { const q = pts[i]; dab(p, q[0], q[1], s * 0.24 * (1 - i / 26 * 0.5), [255, 218, 196], 0.65, 3); }
    brush(p, pts.map(([x, y], i) => [x - 2, y - 3]), (t) => s * 0.16 * (1 - t * 0.6), [255, 234, 216], 0.7, 2);
    for (let i = 2; i < 25; i += 3) { const q = pts[i], r = pts[i + 1], ang = Math.atan2(r[1] - q[1], r[0] - q[0]) + 1.57, w = s * 0.42 * (1 - i / 26 * 0.68); brush(p, [[q[0] - Math.cos(ang) * w, q[1] - Math.sin(ang) * w], [q[0] + Math.cos(ang) * w, q[1] + Math.sin(ang) * w]], 0.9, [190, 76, 48], 0.65); }
    const e = pts[26], back = pts[23];
    const ang = Math.atan2(e[1] - back[1], e[0] - back[0]);
    for (const off of [-0.5, 0.5]) p.poly([[e[0], e[1]], [e[0] + Math.cos(ang + off) * s * 0.42, e[1] + Math.sin(ang + off) * s * 0.42], [e[0] + Math.cos(ang) * s * 0.3, e[1] + Math.sin(ang) * s * 0.3]], "#d9543a");
}
function tomatoHalf(p, cx, cy, s) {
    dab(p, cx + 3, cy + 5, s, [70, 20, 12], 0.4, 7);
    shader(p, (x, y) => {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy) / s, a = Math.atan2(dy, dx);
        if (r > 1.01) return null;
        const w = Math.abs(Math.sin(a * 2.5 + 0.4));
        let c = mix3([222, 56, 34], [196, 34, 24], r);
        c = mix3(c, [255, 142, 104], smooth(0.75, 0.86, r) * (1 - smooth(0.9, 0.98, r)) * 0.8);
        if (r < 0.74 && w > 0.3) { c = mix3([246, 92, 48], [250, 176, 72], clamp(1 - r * 1.1) * 0.55); }
        if (r < 0.18) c = mix3(c, [255, 190, 150], 0.7);
        c = mix3(c, [120, 16, 10], smooth(0.93, 1, r));
        c = mix3(c, [255, 238, 214], smooth(0.34, 0, Math.hypot(dx + s * 0.36, dy + s * 0.4) / s) * 0.55);
        return [c[0], c[1], c[2], clamp((1.01 - r) * 36) * 255];
    });
    const R = rng(cx * 3 + 1);
    for (let i = 0; i < 5; i++) { const a = 0.4 / 2.5 * -1 + (i + 0.5) * 1.257, xx = cx + Math.cos(a) * s * 0.42, yy = cy + Math.sin(a) * s * 0.42; dab(p, xx, yy, s * 0.07, [252, 224, 150], 0.95); dab(p, xx + R() * s * 0.2 - s * 0.1, yy + s * 0.14, s * 0.06, [252, 224, 150], 0.9); }
}
function mushroomSlice(p, cx, cy, s, tilt) {
    const inside = (dx, dy) => {
        const c = Math.cos(tilt), n = Math.sin(tilt), u = (dx * c + dy * n) / s, v = (-dx * n + dy * c) / s;
        const cap = Math.hypot(u, (v + 0.2) * 1.28), stem = Math.abs(u) < 0.26 + v * 0.1 && v > 0 && v < 0.98;
        return { cap, stem, u, v };
    };
    dab(p, cx + 3, cy + 5, s * 0.95, [50, 28, 14], 0.35, 8);
    shader(p, (x, y) => {
        const { cap, stem, u, v } = inside(x + 0.5 - cx, y + 0.5 - cy);
        if (cap > 1.01 && !stem) return null;
        let c = mix3([246, 230, 200], [222, 192, 150], fbm(x * 0.12, y * 0.12));
        if (cap <= 1.01) {
            c = mix3(c, [104, 62, 36], smooth(0.8, 0.9, cap));
            c = mix3(c, [62, 34, 20], smooth(0.92, 1, cap));
            const ang = Math.atan2(v + 0.2, u);
            if (cap < 0.8 && cap > 0.3 && Math.abs(Math.sin(ang * 16)) < 0.2) c = mix3(c, [170, 132, 98], 0.5);
        } else { c = mix3(c, [150, 110, 76], smooth(0.2, 0.28, Math.abs(u)) * 0.8); }
        return [c[0], c[1], c[2], 255];
    });
}

function paintTopping(p, frame) {
    const c = TS / 2, R = rng(frame * 31 + 7);
    switch (frame) {
        case 0: porkRound(p, 48, 52, 38, 3); porkRound(p, 92, 88, 40, 8); break;
        case 1: eggHalf(p, 68, 70, 46); break;
        case 2:   // Scallion rings, a small heap of them.
            dab(p, c + 2, c + 5, 44, [40, 40, 16], 0.3, 14);
            for (let i = 0; i < 44; i++) {
                const a = R() * 6.28, rr = Math.sqrt(R()) * 46, x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr * 0.9, s = 7 + R() * 4, wht = R() < 0.3;
                dab(p, x + 1, y + 2, s + 1, [30, 40, 14], 0.4, 2);
                ring(p, x, y, s, 2.4, wht ? [224, 240, 176] : [88 + R() * 40, 158 + R() * 44, 56]);
                dab(p, x, y, s - 2.6, [214, 234, 150], 0.55, 2);
                dab(p, x - s * 0.4, y - s * 0.5, 1.8, [250, 255, 220], 0.8);
            }
            break;
        case 3: { // Nori, a crisp dark sheet tilted against the rim.
            const q = [[34, 14], [122, 30], [104, 126], [18, 110]];
            p.poly(q.map(([x, y]) => [x + 3, y + 5]), "#00000055");
            p.poly(q, "#1b3a30");
            shader(p, (x, y) => {
                const n = fbm(x * 0.13, y * 0.07, 3), m = p.get(x, y);
                if (m[3] < 200) return null;
                const lit = clamp(1 - Math.hypot(x - 40, y - 34) / 120);
                return [14 + n * 22 + lit * 12, 34 + n * 30 + lit * 14, 28 + n * 22 + lit * 10, 220];
            });
            brush(p, [[34, 14], [122, 30]], 1.3, [130, 180, 150], 0.65);
            break;
        }
        case 4: { // Swirl fishcake, scalloped, with a pink spiral.
            dab(p, c + 3, c + 5, 54, [60, 30, 26], 0.35, 9);
            shader(p, (x, y) => {
                const dx = x + 0.5 - c, dy = y + 0.5 - c, a = Math.atan2(dy, dx), edge = 56 + Math.sin(a * 11) * 4.5, r = Math.hypot(dx, dy), k = r / edge;
                if (k > 1.01) return null;
                const sp = Math.sin(a + r * 0.19);
                let col = mix3([255, 250, 240], [240, 226, 212], k);
                if (sp > 0.25 && k < 0.84) col = mix3(col, [240, 92, 128], smooth(0.25, 0.42, sp));
                col = mix3(col, [205, 176, 162], smooth(0.9, 1, k) * 0.7);
                return [col[0], col[1], col[2], clamp((1.01 - k) * 40) * 255];
            });
            break;
        }
        case 5: // Bamboo: fibrous tan strips.
            for (let i = 0; i < 5; i++) {
                const y0 = 30 + i * 19 + R() * 5, x0 = 14 + R() * 12, x1 = 120 - R() * 12, tw = (R() - 0.5) * 22;
                const pts = curve([[x0, y0], [c, y0 + tw], [x1, y0 - tw * 0.4]]);
                brush(p, pts.map(([x, y]) => [x + 2, y + 4]), 9, [60, 34, 14], 0.3, 3);
                brush(p, pts, 8.5, [190 + R() * 20, 142, 72]);
                for (let k = 0; k < 4; k++) brush(p, pts.map(([x, y]) => [x, y - 5 + k * 3.2]), 0.8, k % 2 ? [120, 78, 36] : [240, 208, 140], 0.55);
            }
            break;
        case 6: shrimpAt(p, 74, 72, 42, false); break;
        case 7: // Snap peas, a split pod.
            for (const [ox, oy, ro] of [[0, -18, -0.2], [4, 22, 0.25]]) {
                const pts = curve([[16 + ox, c + oy + 8], [50 + ox, c + oy - 10 * Math.cos(ro)], [90 + ox, c + oy - 8], [126 + ox, c + oy + 10]]);
                brush(p, pts.map(([x, y]) => [x + 2, y + 5]), (t) => 3 + Math.sin(t * 3.14) * 15, [20, 40, 10], 0.3, 4);
                brush(p, pts, (t) => 3 + Math.sin(t * 3.14) * 15, [108, 174, 62]);
                brush(p, pts.map(([x, y]) => [x, y + 7]), (t) => Math.sin(t * 3.14) * 5, [64, 124, 40], 0.75);
                for (let i = 0; i < 4; i++) { const q = pts[9 + i * 6]; dab(p, q[0], q[1] - 1, 9, [152, 212, 84]); dab(p, q[0] - 2.6, q[1] - 4, 2.8, [235, 255, 190], 0.9); dab(p, q[0] + 3, q[1] + 3, 4, [90, 150, 54], 0.45, 4); }
            }
            break;
        case 8: tomatoHalf(p, 50, 54, 37); tomatoHalf(p, 92, 88, 37); break;
        case 9: mushroomSlice(p, 50, 56, 40, -0.3); mushroomSlice(p, 94, 84, 40, 0.42); break;
        case 10: // Corn: a golden heap, each kernel a dab.
            dab(p, c + 2, c + 6, 44, [70, 44, 10], 0.34, 12);
            for (let i = 0; i < 64; i++) {
                const a = R() * 6.28, rr = Math.sqrt(R()) * 48, x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr * 0.92, s = 6.5 + R() * 2.2, g = R();
                dab(p, x + 1, y + 2, s, [150, 90, 16], 0.6, 2);
                dab(p, x, y, s, [250, 190 + g * 26, 54 + g * 30]);
                dab(p, x - s * 0.34, y - s * 0.36, s * 0.3, [255, 250, 210], 0.85);
            }
            break;
        case 11: { // A pat of butter just starting to go.
            dab(p, c + 3, c + 6, 44, [120, 80, 20], 0.3, 12);
            shader(p, (x, y) => {
                const u = (x + 0.5 - c) / 38, v = (y + 0.5 - c) / 34, rot = u * 0.92 - v * 0.38, rv = u * 0.38 + v * 0.92, sd = Math.max(Math.abs(rot), Math.abs(rv)), melt = (noise(x * 0.07, y * 0.07) - 0.5) * 0.3;
                const pool = Math.hypot(u, v) / (1.42 + melt);
                if (pool > 1 && sd > 1) return null;
                if (sd > 1) return [255, 214, 104, 165 * clamp((1 - pool) * 8)];
                let cc = mix3([255, 236, 158], [250, 208, 96], clamp(rot * 0.5 + rv * 0.5 + 0.5));
                if (rv > 0.72 || rot > 0.76) cc = mix3(cc, [224, 168, 62], 0.7);
                cc = mix3(cc, [255, 252, 224], smooth(0.7, 0, Math.hypot(rot + 0.4, rv + 0.46)) * 0.7);
                return [cc[0], cc[1], cc[2], 255];
            });
            break;
        }
    }
}

// Whole ingredients for the board: what you chop. Frames: chashu, egg, negi, swirl, tomato, mushroom.
export const WHOLE = { chashu: 0, egg: 1, negi: 2, swirl: 3, tomato: 4, mushroom: 5 };
function paintWhole(p, frame) {
    const w = p.width, h = p.height, cx = w / 2, cy = h / 2;
    dab(p, cx + 3, cy + 30, 58, [40, 18, 8], 0.3, 18);
    if (frame === 0) {   // A tied roll of pork.
        const body = (x, y) => { const v = (y - cy) / 42, u = (x - cx) / 78; return Math.max(Math.abs(u) ** 5 * 1.0 + v * v, 0); };
        shader(p, (x, y) => {
            const b = body(x + 0.5, y + 0.5);
            if (b > 1) return null;
            const v = (y + 0.5 - cy) / 42, n = fbm(x * 0.06, y * 0.11, 4), lit = clamp(0.56 - v * 0.62 + (n - 0.5) * 0.5);
            let c = mix3([92, 42, 22], [188, 108, 56], lit);
            c = mix3(c, [245, 200, 136], smooth(0.55, 0.0, Math.hypot(v + 0.56, ((x - cx) / 90))) * 0.5);
            return [c[0], c[1], c[2], clamp((1 - b) * 12) * 255];
        });
        for (const x of [-46, -16, 16, 46]) brush(p, curve([[cx + x - 3, cy - 38], [cx + x + 3, cy], [cx + x - 3, cy + 39]]), 2.2, [246, 232, 200]);
        porkRoundEnd(p, cx + 70, cy, 38);
    } else if (frame === 1) {
        shader(p, (x, y) => {
            const u = (x + 0.5 - cx) / 42, v = (y + 0.5 - cy) / 54, r = Math.hypot(u, v * (v < 0 ? 0.92 : 1.05));
            if (r > 1) return null;
            let c = mix3([140, 86, 42], [226, 172, 112], clamp(0.7 - v * 0.5 - u * 0.4));
            c = mix3(c, [255, 240, 214], smooth(0.5, 0, Math.hypot(u + 0.36, v + 0.4)) * 0.8);
            return [c[0], c[1], c[2], clamp((1 - r) * 30) * 255];
        });
    } else if (frame === 2) {
        const pts = curve([[18, cy + 12], [cx, cy - 2], [w - 18, cy - 14]]);
        brush(p, pts, (t) => 10 + t * 4, [240, 244, 216]);
        brush(p, pts.slice(pts.length >> 1).map(([x, y]) => [x, y]), (t) => 10 + t * 5, [92, 164, 62]);
        brush(p, pts.map(([x, y]) => [x - 1, y - 6]), 2, [255, 255, 240], 0.75);
        const pt2 = curve([[26, cy + 34], [cx, cy + 20], [w - 28, cy + 16]]);
        brush(p, pt2, (t) => 9 + t * 4, [232, 240, 206]);
        brush(p, pt2.slice(pt2.length >> 1), (t) => 9 + t * 5, [74, 146, 52]);
        brush(p, pt2.map(([x, y]) => [x - 1, y - 5]), 1.8, [255, 255, 240], 0.7);
    } else if (frame === 3) {
        shader(p, (x, y) => {
            const v = (y + 0.5 - cy) / 40, u = (x + 0.5 - cx) / 74, b = u * u * u * u * u * u + v * v;
            if (b > 1) return null;
            const lit = clamp(0.8 - v * 0.8);
            const c = mix3([218, 196, 186], [255, 248, 240], lit);
            return [c[0], c[1], c[2], clamp((1 - b) * 14) * 255];
        });
        shader(p, (x, y) => {
            const dx = x + 0.5 - (cx + 64), dy = y + 0.5 - cy, a = Math.atan2(dy, dx), edge = 39 + Math.sin(a * 11) * 2.4, r = Math.hypot(dx / 0.62, dy), k = r / edge;
            if (k > 1) return null;
            const col = Math.sin(a + r * 0.28) > 0.2 && k < 0.84 ? [240, 92, 128] : [255, 250, 242];
            return [col[0], col[1], col[2], clamp((1 - k) * 30) * 255];
        });
    } else if (frame === 4) {
        shader(p, (x, y) => {
            const u = (x + 0.5 - cx) / 56, v = (y + 0.5 - cy) / 52, r = Math.hypot(u, v);
            if (r > 1) return null;
            let c = mix3([166, 24, 18], [240, 64, 40], clamp(0.8 - v * 0.6 - u * 0.5));
            c = mix3(c, [255, 216, 200], smooth(0.34, 0, Math.hypot(u + 0.34, v + 0.4)) * 0.85);
            return [c[0], c[1], c[2], clamp((1 - r) * 30) * 255];
        });
        for (let i = 0; i < 5; i++) { const a = i * 1.257 - 1.57; p.poly([[cx, cy - 44], [cx + Math.cos(a) * 27, cy - 44 + Math.sin(a) * 15], [cx + Math.cos(a + 0.9) * 8, cy - 44 + Math.sin(a + 0.9) * 8]], "#4f8a3a"); }
    } else {
        shader(p, (x, y) => {
            const u = (x + 0.5 - cx) / 60, v = (y + 0.5 - cy + 8) / 44, r = Math.hypot(u, v);
            if (r > 1) return null;
            const n = fbm(x * 0.05, y * 0.05, 3);
            let c = mix3([64, 36, 22], [150, 96, 58], clamp(0.75 - v * 0.6 - u * 0.4 + (n - 0.5) * 0.5));
            c = mix3(c, [232, 200, 160], smooth(0.5, 0, r) * (hash(x >> 2, y >> 2) > 0.74 ? 0.5 : 0.1));
            return [c[0], c[1], c[2], clamp((1 - r) * 30) * 255];
        });
    }
}
function porkRoundEnd(p, cx, cy, R) {
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / (R * 0.58), v = (y + 0.5 - cy) / R, r = Math.hypot(u, v);
        if (r > 1) return null;
        const fat = Math.sin(Math.atan2(v, u) + r * 11);
        let c = mix3([214, 130, 100], [236, 170, 138], clamp(1 - r));
        c = mix3(c, [252, 232, 196], smooth(0.5, 0.92, fat) * 0.8);
        c = mix3(c, [76, 34, 18], smooth(0.84, 0.98, r));
        return [c[0], c[1], c[2], 255];
    });
}

// --- Kitchen ----------------------------------------------------------------------------------------------------
function paintPot(p) {
    const w = p.width, h = p.height, cx = w / 2, cy = 68, rx = 88, ry = 54;
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, r = Math.hypot(u, v);
        const below = y > cy && y < h - 12 && Math.abs(u) < 1 - ((y - cy) / 90) ** 4 * 0.03;
        if (r > 1.01 && !below) return null;
        if (r <= 1) {
            const rim = 0.87;
            if (r > rim) {
                const lit = clamp(0.5 - (u * 0.6 + v * 0.7) * 0.8), c = mix3([96, 92, 92], [244, 240, 230], lit);
                const inkEdge = smooth(0.975, 1, r);
                return [c[0] * (1 - inkEdge * 0.5), c[1] * (1 - inkEdge * 0.5), c[2] * (1 - inkEdge * 0.5), clamp((1.01 - r) * 60) * 255];
            }
            const c = mix3([38, 30, 28], [80, 70, 62], clamp(0.5 + v * 0.5));
            return [c[0], c[1], c[2], 255];
        }
        const k = u, lit = clamp(0.16 + (1 - k * k) * 0.42 - k * 0.3), sheen = smooth(0.2, 0, Math.abs(k + 0.45)) * 0.5 + smooth(0.07, 0, Math.abs(k - 0.62)) * 0.2;
        let c = mix3([58, 46, 42], [206, 196, 182], clamp(lit + sheen));
        const t = (y - cy) / (h - cy);
        c = mix3(c, [34, 22, 18], smooth(0.5, 1, t) * 0.62);
        if (Math.abs(k) > 0.97) c = mix3(c, [30, 20, 16], 0.6);
        return [c[0], c[1], c[2], 255];
    });
    for (const sg of [-1, 1]) {
        brush(p, [[cx + sg * (rx - 2), cy + 26], [cx + sg * (rx + 7), cy + 26]], 5.5, [52, 40, 34]);
        brush(p, [[cx + sg * (rx - 2), cy + 24.5], [cx + sg * (rx + 6), cy + 24.5]], 1.6, [130, 114, 104], 0.8);
    }
}

function paintWater(p) {
    const w = p.width, h = p.height;
    shader(p, (x, y) => {
        const u = (x + 0.5 - w / 2) / (w / 2 - 1), v = (y + 0.5 - h / 2) / (h / 2 - 1), r = Math.hypot(u, v);
        if (r > 1) return null;
        const n = fbm(x * 0.03, y * 0.05, 3);
        let c = mix3([214, 202, 160], [250, 242, 212], clamp(n * 0.9 - v * 0.2));
        c = mix3(c, [255, 252, 232], smooth(0.5, 0, Math.hypot(u + 0.4, v + 0.46)) * 0.7);
        c = mix3(c, [120, 100, 70], smooth(0.72, 1, r) * 0.6);
        return [c[0], c[1], c[2], clamp((1 - r) * 30) * 255];
    });
}

function paintLadle(p) {
    const w = p.width, h = p.height;
    // Handle runs off to the right; the cup is at the left, side-on.
    const cx = 62, cy = 62, R = 50;
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / R, v = (y + 0.5 - cy) / (R * 0.76);
        if (v < -0.42) return null;
        const r = Math.hypot(u, v);
        if (r > 1.01) return null;
        const lit = clamp(0.32 + (1 - u * u) * 0.32 - v * 0.34 - u * 0.2 + (fbm(x * 0.04, y * 0.2, 2) - 0.5) * 0.2);
        const c = mix3([58, 52, 54], [246, 240, 228], lit);
        return [c[0], c[1], c[2], clamp((1.01 - r) * 30) * 255];
    });
    for (let x = cx - R * 0.9; x <= cx + R * 0.9; x += 0.5) dab(p, x, cy - R * 0.76 * 0.42, 2.8, x < cx ? [250, 245, 235] : [170, 164, 158]);
    const handle = curve([[cx + R * 0.86, cy - 22], [cx + R * 1.8, cy - 40], [w * 0.6, cy - 44], [w - 12, cy - 44]]);
    brush(p, handle, (t) => 5.5 - t * 1.2, [150, 144, 140]);
    brush(p, handle.map(([x, y]) => [x - 0.4, y - 2.2]), 2, [250, 246, 238], 0.85);
    const grip = handle.slice(Math.floor(handle.length * 0.62));
    brush(p, grip, 7.5, [84, 48, 30]);
    brush(p, grip.map(([x, y]) => [x, y - 3]), 2.4, [150, 96, 62], 0.8);
    dab(p, h, 0, 0, [0, 0, 0], 0);
}

function paintKnife(p) {
    p.poly([[10, 58], [20, 34], [122, 26], [126, 44], [102, 62]], "#e4e0da");
    shader(p, (x, y) => {
        const m = p.get(x, y);
        if (m[3] < 200 || y > 62) return null;
        const t = (y - 26) / 36, n = fbm(x * 0.04, y * 0.4);
        const c = mix3([250, 248, 244], [140, 136, 134], clamp(t * 0.9 + (n - 0.5) * 0.4));
        return [c[0], c[1], c[2], 255];
    });
    brush(p, [[12, 57], [101, 61]], 1.2, [255, 255, 255], 0.9);
    brush(p, [[122, 34], [180, 30]], 9, [86, 50, 30]);
    brush(p, [[122, 31], [180, 27]], 2.4, [160, 106, 70], 0.9);
    for (const x of [136, 154, 170]) dab(p, x, 31, 1.8, [230, 210, 170]);
}

function soft(p, power) {
    const w = p.width, h = p.height;
    shader(p, (x, y) => {
        const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / (w / 2);
        if (r >= 1) return null;
        const a = Math.pow(1 - r * r, power);
        return [255, 255, 255, a * 255];
    });
}

function paintSteam(p) {
    const w = p.width, h = p.height;
    shader(p, (x, y) => {
        const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / (w / 2);
        if (r >= 1) return null;
        const n = fbm(x * 0.05, y * 0.05, 4);
        const a = Math.pow(1 - r * r, 1.5) * smooth(0.28, 0.75, n * (1.2 - r * 0.5));
        return [255, 255, 255, a * 255];
    });
}

function paintWood(p) {
    const w = p.width, h = p.height;
    shader(p, (x, y) => {
        const plank = Math.floor(y / 92), v = (y % 92) / 92, off = hash(plank, 3) * 400;
        const g = fbm((x + off) * 0.004, y * 0.09 + plank * 13, 4), ring = Math.sin((g * 18 + y * 0.03) * 3.2) * 0.5 + 0.5;
        let c = mix3([98, 56, 32], [150, 92, 52], clamp(g * 0.75 + ring * 0.25));
        c = mix3(c, [60, 32, 20], smooth(0.965, 1, v) * 0.85 + smooth(0.03, 0, v) * 0.5);
        c = mix3(c, [190, 130, 76], smooth(0.1, 0.0, Math.abs(v - 0.09)) * 0.1);
        return [c[0], c[1], c[2], 255];
    });
}

function paintBin(p) {
    const w = p.width, h = p.height, cx = w / 2, cy = h / 2;
    const sd = (x, y, a, b, r) => { const qx = Math.abs(x) - a + r, qy = Math.abs(y) - b + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
    shader(p, (x, y) => {
        const X = x + 0.5 - cx, Y = y + 0.5 - cy, d = sd(X, Y, cx - 3, cy - 3, 26);
        if (d > 1) return null;
        const a = clamp(1 - d) * 255;
        if (d > -10) {
            const lit = clamp(0.5 - (X / cx * 0.3 + Y / cy * 0.5)), c = mix3([40, 20, 14], [112, 56, 34], lit);
            return [c[0], c[1], c[2], a];
        }
        const n = fbm(x * 0.015, y * 0.12, 3), t = clamp((d + 20) / 10);
        let c = mix3([212, 170, 118], [236, 204, 156], n);
        c = mix3(c, [120, 76, 44], t * 0.66);
        return [c[0], c[1], c[2], 255];
    });
}

function paintCoin(p) {
    const c = p.width / 2;
    shader(p, (x, y) => {
        const dx = x + 0.5 - c, dy = y + 0.5 - c, r = Math.hypot(dx, dy) / (c - 1);
        if (r > 1) return null;
        const hole = Math.max(Math.abs(dx), Math.abs(dy)) / (c * 0.34);
        if (hole < 1) return [0, 0, 0, 0];
        const lit = clamp(0.5 - (dx + dy) / (c * 2.2));
        let col = mix3([186, 116, 26], [255, 224, 112], lit);
        if (r > 0.8) col = mix3(col, [120, 66, 14], 0.46);
        if (hole < 1.28) col = mix3(col, [132, 76, 18], 0.5);
        return [col[0], col[1], col[2], clamp((1 - r) * 16) * 255];
    });
}

function starPoints(cx, cy, R, r) { const a = []; for (let i = 0; i < 10; i++) { const t = -1.5708 + i * 0.6283, q = i % 2 ? r : R; a.push([cx + Math.cos(t) * q, cy + Math.sin(t) * q]); } return a; }
function paintStar(p, frame) {
    const c = p.width / 2, pts = starPoints(c, c + 2, c - 6, c * 0.46);
    const inside = (x, y) => { let n = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) n = !n; } return n; };
    const dist = (x, y) => { let m = 1e9; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j], t = clamp(((x - a[0]) * (b[0] - a[0]) + (y - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)); m = Math.min(m, Math.hypot(x - a[0] - t * (b[0] - a[0]), y - a[1] - t * (b[1] - a[1]))); } return m; };
    shader(p, (x, y) => {
        const X = x + 0.5, Y = y + 0.5, ins = inside(X, Y), e = dist(X, Y);
        if (!ins && e > 2.5) return null;
        const al = ins ? 255 : clamp(2.5 - e) * 255;
        if (e < 3 || !ins) return frame ? [54, 30, 20, al] : [46, 26, 18, al];
        const k = clamp((X + Y - c) / (c * 2.4));
        const col = frame ? mix3([255, 234, 140], [240, 150, 40], k) : mix3([120, 92, 70], [84, 60, 44], k);
        return [col[0], col[1], col[2], 255];
    });
}

function paintFlame(p, frame) {
    const w = p.width, h = p.height, R = rng(frame * 7 + 3);
    for (let i = 0; i < 7; i++) {
        const x = w * (0.1 + i * 0.133), tall = h * (0.5 + R() * 0.42), lean = (R() - 0.5) * 7;
        for (let k = 0; k < 18; k++) {
            const t = k / 17, y = h - 2 - t * tall, rr = (1 - t) ** 0.7 * 6.2 + 0.4;
            dab(p, x + lean * t * t, y, rr, mix3([70, 130, 255], [255, 170, 70], smooth(0.1, 0.6, t)), 0.62, 2.5);
        }
    }
}

function paintHand(p) {
    const fg = [255, 244, 228], ink = [58, 32, 22];
    const finger = (x0, y0, x1, y1, r) => { brush(p, [[x0, y0], [x1, y1]], r + 2.6, ink); };
    const fingerFill = (x0, y0, x1, y1, r) => { brush(p, [[x0, y0], [x1, y1]], r, fg); };
    finger(50, 16, 50, 84, 10); finger(70, 60, 70, 94, 9); finger(88, 66, 88, 96, 8.5); finger(104, 74, 104, 98, 7.5); finger(26, 92, 44, 116, 8);
    dab(p, 72, 106, 37, ink); fingerFill(50, 16, 50, 84, 10); fingerFill(70, 60, 70, 94, 9); fingerFill(88, 66, 88, 96, 8.5); fingerFill(104, 74, 104, 98, 7.5); fingerFill(26, 92, 44, 116, 8);
    dab(p, 72, 106, 34.5, fg);
    brush(p, [[50, 14], [50, 30]], 3.4, [255, 255, 255], 0.5);
}

// Noren: painted once in greys, tinted for whichever curtain you've chosen.
function paintNoren(p) {
    const w = p.width, h = p.height;
    shader(p, (x, y) => {
        const panel = Math.floor(x / (w / 5)), fx = (x / (w / 5)) % 1, slit = Math.abs(fx - 0.5) > 0.495 && y > h * 0.25;
        const hemWave = h - 6 - Math.sin(x * 0.03) * 4;
        if (slit || y > hemWave) return null;
        const n = fbm(x * 0.012, y * 0.05, 3), fold = 0.86 + 0.14 * Math.sin(fx * 6.28 * 2 + panel * 1.7 + n * 2);
        let g = 200 * fold + (n - 0.5) * 40 + 40;
        g *= 1 - smooth(hemWave - 10, hemWave, y) * 0.28 - smooth(14, 0, y) * 0.5;
        return [g, g, g, 255];
    });
}

function paintLantern(p) {
    const w = p.width, h = p.height, cx = w / 2, cy = h / 2 + 6;
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / (w * 0.42), v = (y + 0.5 - cy) / (h * 0.36), r = Math.hypot(u, v);
        if (r > 1.01) return null;
        const rib = 0.8 + 0.2 * Math.abs(Math.sin(v * 13));
        const g = clamp(1.25 - r * r * 0.72) * 255 * rib;
        return [g, g, g, clamp((1.01 - r) * 30) * 255];
    });
    for (const sy of [cy - h * 0.36, cy + h * 0.36]) p.rect(cx - w * 0.2, sy - 4, w * 0.4, 8, "#3a2015");
    p.rect(cx - 1.5, 0, 3, cy - h * 0.36, "#2a1712");
    brush(p, [[cx, cy + h * 0.38], [cx, h - 2]], 2, [58, 28, 18], 1);
}

function paintGull(p, frame) {
    const w = p.width, h = p.height, bodyY = 64 + (frame === 1 ? -6 : 0);
    p.ellipse(84, bodyY + 34, 42, 8, "#00000030");
    p.line(74, bodyY + 22, 72, bodyY + 34, "#d98a34", 3).line(92, bodyY + 22, 94, bodyY + 34, "#d98a34", 3);
    p.ellipse(84, bodyY + 2, 42, 27, "#ffffff", "#bcc6d2");
    p.ellipse(120, bodyY - 21, 22, 20, "#ffffff", "#d6dee6");
    p.poly([[136, bodyY - 26], [159, bodyY - 19], [136, bodyY - 12]], "#f2b53a");
    p.circle(145, bodyY - 17, 2.6, "#d13a1e");
    p.circle(125, bodyY - 26, 5.5, "#fff9d8").circle(127, bodyY - 26, 3.4, "#1e1616");
    p.line(112, bodyY - 37, 132, bodyY - 32, "#3a3a44", 3.2);        // a very rude eyebrow
    p.ellipse(68, bodyY + (frame === 1 ? -16 : 2), 38, frame === 1 ? 14 : 15, "#99a6b6", "#6e7c90");
    if (frame === 1) p.ellipse(44, bodyY - 26, 22, 10, "#6e7c90", "#3f4a5a");
    p.ellipse(32, bodyY + 12, 18, 6, "#39414e");
    p.outline("#2a1e1c");
}

function paintCharm(p, frame) {
    const c = p.width / 2;
    p.ellipse(c, 112, 42, 9, "#00000040");
    if (frame === 1) {          // Tanuki
        p.ellipse(c, 84, 36, 34, "#9a6b3d", "#6f4726").ellipse(c, 92, 21, 21, "#f2e0bc", "#d9c094").circle(c, 42, 30, "#a87a48", "#7c5230");
        p.circle(c - 24, 18, 10, "#6f4726").circle(c + 24, 18, 10, "#6f4726").ellipse(c - 12, 42, 11, 9, "#3a2416").ellipse(c + 12, 42, 11, 9, "#3a2416");
        p.circle(c - 11, 41, 3.4, "#fff").circle(c + 11, 41, 3.4, "#fff").ellipse(c, 54, 6, 4, "#2a1712");
        p.outline("#2a1712").shade(0.2, 0.2);
    } else if (frame === 2) {   // Round red wishing doll
        p.ellipse(c, 66, 44, 46, "#d03526", "#8d1a14").ellipse(c, 56, 27, 25, "#fbeed3", "#ecd5b0");
        p.circle(c - 11, 54, 7, "#fff").circle(c + 11, 54, 7, "#fff").circle(c - 11, 54, 3.5, "#1e1414");
        p.line(c - 21, 41, c - 5, 45, "#1e1414", 3).line(c + 21, 41, c + 5, 45, "#1e1414", 3).line(c - 8, 69, c + 8, 69, "#1e1414", 2.4);
        p.ellipse(c, 94, 20, 8, "#e9b64a");
        p.outline("#2a1712").shade(0.25, 0.2);
    } else if (frame === 3) {   // Little pine
        p.rect(c - 34, 92, 68, 20, "#355a7a").rect(c - 38, 88, 76, 7, "#4d7699");
        p.line(c, 92, c - 6, 60, "#5a3a22", 9).line(c - 6, 62, c + 16, 42, "#5a3a22", 6);
        p.ellipse(c - 16, 50, 26, 15, "#3f7a4e", "#22503a").ellipse(c + 20, 34, 24, 13, "#4d8a5a", "#28593e").ellipse(c - 4, 24, 16, 9, "#5a9a64", "#2d6545");
        p.outline("#1d2a24").shade(0.2, 0.18);
    } else if (frame === 4) {   // Radio
        p.rect(c - 42, 42, 84, 66, "#7f4f2e").rect(c - 36, 50, 44, 50, "#d4b98a");
        for (let i = 0; i < 6; i++) p.line(c - 34, 54 + i * 8, c + 6, 54 + i * 8, "#8f7650", 2);
        p.circle(c + 24, 62, 9, "#f0dcae", "#b99a66").circle(c + 24, 88, 9, "#f0dcae", "#b99a66");
        p.line(c + 30, 42, c + 42, 12, "#c8c0b4", 2.4);
        p.outline("#2a1712").shade(0.24, 0.2);
    }
}

function paintKit(p, frame) {
    const c = p.width / 2;
    if (frame === 0) { p.ellipse(c, 74, 42, 12, "#555"); for (let i = -1; i <= 1; i++) { p.ellipse(c + i * 22, 50, 11, 26, "#ffb24a", "#e0502a"); p.ellipse(c + i * 22, 58, 5, 13, "#fff0b0", "#ffb24a"); } p.rect(c - 44, 80, 88, 14, "#2c2523"); }
    if (frame === 1) { p.ellipse(c, 52, 44, 28, "#efe6d4", "#b7a68c"); p.ellipse(c, 46, 38, 20, "#a9622a", "#6e3414"); p.poly([[c - 44, 54], [c + 44, 54], [c + 26, 92], [c - 26, 92]], "#d8cbb2"); p.ellipse(c, 54, 44, 10, "#efe6d4"); p.ellipse(c, 52, 38, 7, "#6e3414"); }
    if (frame === 2) { p.poly([[14, 66], [20, 46], [84, 42], [88, 54], [72, 70]], "#e0dcd6"); p.line(90, 48, 118, 44, "#5a321f", 9); p.line(22, 66, 72, 68, "#fff", 1.6); }
    if (frame === 3) { p.ellipse(44, 62, 26, 18, "#d7d2c8", "#7c7670"); p.rect(16, 52, 56, 7, "#efeae0"); p.line(68, 50, 116, 22, "#a7a19a", 6); p.line(100, 30, 116, 22, "#5a321f", 8); }
    if (frame === 4) { p.ellipse(c, 34, 36, 15, "#c44a3a", "#8d2a22"); p.line(c - 26, 44, c - 32, 96, "#6e4426", 6); p.line(c + 26, 44, c + 32, 96, "#6e4426", 6); p.line(c, 46, c, 94, "#6e4426", 6); p.line(c - 28, 72, c + 28, 72, "#6e4426", 4); }
    p.outline("#2a1712");
}

// Stroked letters for the title, spelled out in noodles. Coordinates in a 100x130 box.
const LETTERS = {
    R: [[[16, 124], [14, 66], [16, 8]], [[16, 10], [58, 6], [82, 22], [80, 48], [54, 64], [20, 66]], [[42, 66], [62, 94], [88, 124]]],
    A: [[[8, 124], [30, 62], [50, 6]], [[50, 6], [72, 62], [94, 124]], [[22, 86], [52, 82], [80, 86]]],
    M: [[[8, 124], [12, 60], [16, 8]], [[16, 8], [34, 50], [50, 90]], [[50, 90], [68, 50], [86, 8]], [[86, 8], [90, 60], [94, 124]]],
    E: [[[20, 8], [16, 66], [20, 124]], [[20, 8], [52, 6], [84, 10]], [[18, 62], [46, 60], [72, 64]], [[20, 122], [52, 124], [86, 120]]],
    N: [[[12, 124], [14, 60], [16, 8]], [[16, 8], [50, 66], [84, 124]], [[84, 124], [86, 60], [88, 8]]],
    U: [[[14, 8], [13, 66], [22, 106], [50, 124], [78, 106], [87, 66], [86, 8]]],
    S: [[[84, 26], [62, 6], [32, 8], [14, 30], [32, 56], [62, 68], [84, 92], [66, 120], [34, 124], [12, 102]]],
    H: [[[14, 8], [12, 66], [14, 124]], [[86, 8], [88, 66], [86, 124]], [[14, 64], [50, 62], [86, 66]]],
};

export function paintLogo(p) {
    const lay = (word, x0, y0, S, gap, tilt) => {
        const strokes = [];
        [...word].forEach((ch, i) => {
            const ox = x0 + i * (100 * S + gap), oy = y0 + (i % 2 ? 6 : -2) * S;
            for (const st of LETTERS[ch]) strokes.push(st.map(([x, y]) => [ox + x * S + (y - 60) * tilt * S, oy + y * S]));
        });
        return strokes;
    };
    const all = [...lay("RAMEN", 40, 16, 1.2, 12, -0.05), ...lay("RUSH", 96, 190, 1.2, 18, -0.05)];
    const r = 7.6, off = [-9.6, 0, 9.6];
    for (const pass of [0, 1]) {
        for (const s of all) {
            const pts = curve(s, 14), n = [];
            for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; n.push([-(b[1] - a[1]) / l, (b[0] - a[0]) / l]); }
            if (pass === 0) { brush(p, pts, r + 15, [46, 20, 12]); continue; }
            off.forEach((o, k) => {
                const line = pts.map((q, i) => { const w = Math.sin(i * 0.11 + k * 2.1) * 1.9; return [q[0] + n[i][0] * (o + w), q[1] + n[i][1] * (o + w)]; });
                brush(p, line.map(([x, y]) => [x + 1, y + 2.4]), r + 0.6, [160, 88, 28]);
                brush(p, line, r - 0.4, [244 - k * 6, 196 + k * 4, 88]);
                brush(p, line.map(([x, y]) => [x - 2, y - 2.6]), r * 0.42, [255, 236, 158], 0.9);
                brush(p, line.map(([x, y]) => [x - 2.8, y - 3.6]), r * 0.14, [255, 255, 236], 0.8);
            });
        }
    }
}

export function paintAll(a) {
    a.paint("bowl", BOWL.w, BOWL.h, paintBowl, { frames: 5, smooth: true });
    a.paint("broth", 256, 184, paintBroth, { frames: 5, smooth: true });
    a.paint("nest", 240, 172, paintNest, { frames: 3, smooth: true });
    a.paint("tops", TS, TS, paintTopping, { frames: 12, smooth: true });
    a.paint("whole", 180, 140, paintWhole, { frames: 6, smooth: true });
    a.paint("pot", 200, 180, paintPot, { smooth: true });
    a.paint("water", 200, 110, paintWater, { smooth: true });
    a.paint("ladle", 320, 130, paintLadle, { smooth: true });
    a.paint("knife", 190, 80, paintKnife, { smooth: true });
    a.paint("steam", 96, 96, paintSteam, { smooth: true });
    a.paint("glow", 96, 96, (p) => soft(p, 2), { smooth: true });
    a.paint("wood", 720, 368, paintWood, { smooth: true });
    a.paint("bin", 180, 150, paintBin, { smooth: true });
    a.paint("coin", 48, 48, paintCoin, { smooth: true });
    a.paint("star", 96, 96, paintStar, { frames: 2, smooth: true });
    a.paint("flame", 128, 52, paintFlame, { frames: 3, smooth: true });
    a.paint("hand", 140, 150, paintHand, { smooth: true });
    a.paint("noren", 760, 96, paintNoren, { smooth: true });
    a.paint("lantern", 96, 140, paintLantern, { smooth: true });
    a.paint("gull", 170, 110, paintGull, { frames: 2, smooth: true });
    a.paint("charm", 120, 124, paintCharm, { frames: 5, smooth: true });
    a.paint("kit", 120, 112, paintKit, { frames: 5, smooth: true });
    a.paint("logo", 720, 360, paintLogo, { smooth: true });
}
