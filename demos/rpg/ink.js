// Ink: a tiny vector painter for the game's comic look. Shapes are signed distance functions, so every edge is anti-aliased,
// every form gets a thick ink line, and shadow falls as Ben-Day halftone dots, like a photocopied newspaper strip.
export const hex = (h) => {
    const n = parseInt(h.slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, h.length > 7 ? parseInt(h.slice(7, 9), 16) / 255 : 1];
};
const cache = new Map();
const col = (h) => { let c = cache.get(h); if (!c) cache.set(h, c = hex(h)); return c; };
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
export const mix = (a, b, t) => {
    const A = col(a), B = col(b);
    const f = (i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, "0");
    return `#${f(0)}${f(1)}${f(2)}`;
};
export const INK = "#1e2233", PAPER = "#f6f0e0";

const FONT5 = { A: "111101111101101", B: "110101110101110", C: "111100100100111", D: "110101101101110", E: "111100110100111", F: "111100110100100", G: "111100101101111", H: "101101111101101", I: "111010010010111", J: "001001001101111", K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "111101101101111", P: "111101111100100", Q: "111101101111001", R: "110101110101101", S: "111100111001111", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101111010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001", 5: "111100111001111", 6: "111100111101111", 7: "111001001001001", 8: "111101111101111", 9: "111101111001111", "!": "010010010000010", "?": "111001010000010", "%": "101001010100101", "$": "011110010011110", ".": "000000000000010", "-": "000000111000000" };

export class Ink {
    /** scale maps logical units to pixels, so the same drawing can be painted at any size. */
    constructor(p, scale = 1) { this.p = p; this.w = p.width; this.h = p.height; this.s = scale; this.ink = INK; this.lw = 3.2; this.shadeBy = 0.36; this.tx = 0; this.ty = 0; }
    _plot(x, y, c, a) {
        if (a <= 0) return;
        const p = this.p, o = (y * p.stride + p.x0 + x) * 4, d = p.data, da = d[o + 3] / 255, out = a + da * (1 - a);
        d[o] = (c[0] * a + d[o] * da * (1 - a)) / out; d[o + 1] = (c[1] * a + d[o + 1] * da * (1 - a)) / out;
        d[o + 2] = (c[2] * a + d[o + 2] * da * (1 - a)) / out; d[o + 3] = out * 255;
    }
    /** Fill a distance function. st: fill, fill2 (gradient to), ink (false to skip), w, shade (0 off), lit (highlight), dots. */
    sdf(f, x0, y0, x1, y1, st = {}) {
        const s = this.s, S = 1 / s;
        const inkC = st.ink === false ? null : col(st.ink ?? this.ink), lw = (st.w ?? this.lw) * s;
        const pad = 2;
        const tx = this.tx, ty = this.ty, X0 = Math.max(0, Math.floor((x0 + tx) * s - pad)), Y0 = Math.max(0, Math.floor((y0 + ty) * s - pad)), X1 = Math.min(this.w - 1, Math.ceil((x1 + tx) * s + pad)), Y1 = Math.min(this.h - 1, Math.ceil((y1 + ty) * s + pad));
        const fill = st.fill ? col(st.fill) : null, fill2 = st.fill2 ? col(st.fill2) : null, shadeOn = st.shade !== 0 && fill, shadeW = (st.shade ?? 9), lit = st.lit;
        const dark = fill ? col(st.dark ?? mix(st.fill.slice(0, 7), "#2a2350", st.shadeBy ?? this.shadeBy)) : null;
        const period = 5.2 * s, rc = [0, 0, 0];
        for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
            const x = (X + 0.5) * S - tx, y = (Y + 0.5) * S - ty, d = f(x, y) * s;
            if (d > 0.75) continue;
            const cov = clamp01(0.5 - d);
            if (fill) {
                let r = fill[0], g = fill[1], b = fill[2];
                if (fill2) { const t = clamp01((y - y0) / Math.max(1, y1 - y0)); r += (fill2[0] - r) * t; g += (fill2[1] - g) * t; b += (fill2[2] - b) * t; }
                if (shadeOn) {
                    const ds = f(x - shadeW * 0.6, y - shadeW * 0.75);
                    if (ds > -1.5) {
                        const u = (X + Y) / period, v = (X - Y) / period;
                        const dot = Math.cos(u * 6.2832) * Math.cos(v * 6.2832);
                        const t = clamp01((ds + 1.5) / 3), solid = ds > shadeW * 0.35 ? 1 : 0, amt = solid ? 1 : clamp01((dot + 0.15) * 3) * t;
                        r += (dark[0] - r) * amt; g += (dark[1] - g) * amt; b += (dark[2] - b) * amt;
                    }
                }
                if (lit) {
                    const dl = f(x + 4, y + 4.5);
                    if (dl > 0 && d < -lw - 1 * s) { const a = clamp01(dl) * 0.75; r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; }
                }
                rc[0] = r; rc[1] = g; rc[2] = b;
                const a = (fill[3] ?? 1) * cov;
                if (inkC) {
                    const t = clamp01(0.5 + (d + lw));   // 1 in the ink band
                    this._plot(X, Y, [r + (inkC[0] - r) * t, g + (inkC[1] - g) * t, b + (inkC[2] - b) * t], a);
                } else this._plot(X, Y, rc, a);
            } else if (inkC) {
                const t = clamp01(0.5 - (Math.abs(d + lw / 2) - lw / 2));
                this._plot(X, Y, inkC, t);
            }
        }
        return this;
    }
    ell(cx, cy, rx, ry, st) {
        const m = Math.min(rx, ry), rot = st?.rot ?? 0, c = Math.cos(rot), sn = Math.sin(rot), R = Math.max(rx, ry);
        return this.sdf((x, y) => { const dx = x - cx, dy = y - cy, u = dx * c + dy * sn, v = -dx * sn + dy * c, q = Math.hypot(u / rx, v / ry); return (q - 1) * m; }, cx - R, cy - R, cx + R, cy + R, st);
    }
    circ(cx, cy, r, st) { return this.ell(cx, cy, r, r, st); }
    /** Rounded box centred on cx,cy. st.rot rotates. */
    box(cx, cy, w, h, r = 0, st = {}) {
        const rot = st.rot ?? 0, c = Math.cos(rot), sn = Math.sin(rot), hw = w / 2 - r, hh = h / 2 - r, R = Math.hypot(w, h) / 2;
        return this.sdf((x, y) => {
            const dx = x - cx, dy = y - cy, u = Math.abs(dx * c + dy * sn) - hw, v = Math.abs(-dx * sn + dy * c) - hh;
            return Math.hypot(Math.max(u, 0), Math.max(v, 0)) + Math.min(Math.max(u, v), 0) - r;
        }, cx - R, cy - R, cx + R, cy + R, st);
    }
    /** Polygon, optionally rounded by st.round. */
    poly(pts, st = {}) {
        const r = st.round ?? 0;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const n = pts.length;
        return this.sdf((x, y) => {
            let d = 1e9, sign = 1;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const ax = pts[i][0], ay = pts[i][1], bx = pts[j][0], by = pts[j][1], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
                const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey)), qx = wx - ex * t, qy = wy - ey * t;
                d = Math.min(d, qx * qx + qy * qy);
                const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
                if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) sign = -sign;
            }
            return sign * Math.sqrt(d) - r;
        }, x0 - r, y0 - r, x1 + r, y1 + r, st);
    }
    /** A brush stroke through points. w is width; w2 tapers to it at the end. Good for limbs, tape, hair. */
    line(pts, w = 3, st = {}) {
        const c = st.color ?? this.ink, w2 = st.w2 ?? w;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const n = pts.length - 1, R = Math.max(w, w2) / 2;
        const f = (x, y) => {
            let best = 1e9;
            for (let i = 0; i < n; i++) {
                const a = pts[i], b = pts[i + 1], ex = b[0] - a[0], ey = b[1] - a[1], wx = x - a[0], wy = y - a[1];
                const t = clamp01((wx * ex + wy * ey) / (ex * ex + ey * ey || 1)), q = Math.hypot(wx - ex * t, wy - ey * t);
                const rr = (w + (w2 - w) * ((i + t) / n)) / 2;
                best = Math.min(best, q - rr);
            }
            return best;
        };
        return this.sdf(f, x0 - R, y0 - R, x1 + R, y1 + R, st.fill ? st : { fill: c, ink: false, shade: 0 });
    }
    /** Smooth quadratic curve as a point list. */
    static curve(a, c, b, n = 10) {
        const out = [];
        for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
        return out;
    }
    /** A rubber-hose limb, bending through a mid point. */
    hose(a, c, b, w = 4) { return this.line(Ink.curve(a, c, b), w); }
    /** A white cartoon glove. dir is the way the fingers point, in radians. */
    glove(x, y, dir = 0, r = 7.5) {
        const dx = Math.cos(dir), dy = Math.sin(dir), W = "#fffdf5";
        this.ell(x + dx * r * 0.2, y + dy * r * 0.2, r, r * 0.86, { fill: W, shade: 3, w: 2.4 });
        this.ell(x + dx * r * 0.9 - dy * r * 0.55, y + dy * r * 0.9 + dx * r * 0.55, r * 0.42, r * 0.42, { fill: W, shade: 0, w: 2.2 });
        this.ell(x + dx * r * 1.05 + dy * r * 0.1, y + dy * r * 1.05 - dx * r * 0.1, r * 0.42, r * 0.42, { fill: W, shade: 0, w: 2.2 });
        return this;
    }
    /** A round little office shoe; dir is -1 or 1. */
    shoe(x, y, dir = -1, color = "#3a2b2b", s = 1) {
        this.ell(x + 4 * dir * s, y, 11 * s, 6.5 * s, { fill: color, lit: true, shade: 3, w: 2.6 });
        return this;
    }
    /** Eyes and mouth. kind sets the character: dot big tired angry smug wide shut glasses. */
    eyes(x1, x2, y, r = 9, kind = "big", o = {}) {
        const pupil = o.look ?? [-0.3, 0.1], W = "#fffdf5", I = this.ink;
        for (const [i, x] of [x1, x2].entries()) {
            if (kind === "dot") { this.ell(x, y, r * 0.42, r * 0.55, { fill: I, ink: false, shade: 0 }); this.circ(x - r * 0.12, y - r * 0.2, r * 0.13, { fill: W, ink: false, shade: 0 }); continue; }
            if (kind === "shut") { this.line(Ink.curve([x - r * 0.8, y], [x, y + r * 0.8], [x + r * 0.8, y]), 3); continue; }
            if (kind === "happy") { this.line(Ink.curve([x - r * 0.8, y + 2], [x, y - r * 0.9], [x + r * 0.8, y + 2]), 3.2); continue; }
            this.ell(x, y, r, r * (kind === "wide" ? 1.2 : 1.05), { fill: W, shade: 0, w: 2.6 });
            const pr = kind === "wide" ? r * 0.3 : r * 0.5;
            this.circ(x + pupil[0] * r, y + pupil[1] * r, pr, { fill: I, ink: false, shade: 0 });
            this.circ(x + pupil[0] * r - pr * 0.3, y + pupil[1] * r - pr * 0.35, pr * 0.3, { fill: W, ink: false, shade: 0 });
            if (kind === "tired" || kind === "smug") {
                const lid = o.lid ?? this._lidColor ?? "#c9c3b3", h = r * (kind === "tired" ? 1.05 : 0.9);
                this.sdf((px, py) => Math.max(Math.hypot(px - x, (py - y) / 1.05) - r + 0.4, py - (y - r + h)), x - r, y - r * 1.2, x + r, y, { fill: lid, ink: false, shade: 0 });
                this.line([[x - r, y - r + h], [x + r, y - r + h]], 2.8);
            }
            if (kind === "angry") { const s = i ? -1 : 1; this.line([[x - r * 1.1, y - r * (1 + 0.45 * s)], [x + r * 1.1, y - r * (1 - 0.45 * s)]], 4.5); }
        }
        return this;
    }
    smile(x, y, w = 12, deep = 6) { return this.line(Ink.curve([x - w, y], [x, y + deep * 2], [x + w, y]), 3); }
    frown(x, y, w = 10, deep = 5) { return this.line(Ink.curve([x - w, y + deep], [x, y - deep], [x + w, y + deep]), 3); }
    grin(x, y, w = 14, h = 9) {  // open mouth with teeth
        this.sdf((px, py) => Math.max(Math.hypot((px - x) / w, (py - y) / h) - 1, y - py) * h, x - w, y, x + w, y + h, { fill: "#7c2b3a", shade: 0, w: 2.6 });
        this.box(x, y + 1.8, w * 1.5, 3.4, 1, { fill: "#fffdf5", ink: false, shade: 0 });
        return this;
    }
    /** Tiny block capitals, centred on x, y. */
    caps(str, x, y, s = 3, color = INK, o = {}) {
        const adv = 4 * s, w = str.length * adv - s, rot = (this.preflip ? -1 : 1) * (o.rot ?? 0), cr = Math.cos(rot), sr = Math.sin(rot);
        for (let n = 0; n < str.length; n++) {
            const g = FONT5[str[n]]; if (!g) continue;
            for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === "1") {
                let u = -w / 2 + n * adv + c * s + s / 2; const v = -2.5 * s + r * s + s / 2;
                if (this.preflip) u = -u;   // painted for a sprite drawn mirrored, so words still read forwards
                this.box(x + u * cr - v * sr, y + u * sr + v * cr, s + 0.2, s + 0.2, 0, { fill: color, ink: false, shade: 0, rot });
            }
        }
        return this;
    }
    /** Die-cut sticker border around everything painted so far. */
    sticker(r = 5, color = "#fffdf5") {
        const p = this.p, W = this.w, H = this.h, n = W * H, D = new Float32Array(n).fill(1e6), a = 1.0, b = 1.414;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p.data[(y * p.stride + p.x0 + x) * 4 + 3] > 127) D[y * W + x] = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = y * W + x; let v = D[i];
            if (x > 0) v = Math.min(v, D[i - 1] + a);
            if (y > 0) { v = Math.min(v, D[i - W] + a); if (x > 0) v = Math.min(v, D[i - W - 1] + b); if (x < W - 1) v = Math.min(v, D[i - W + 1] + b); }
            D[i] = v;
        }
        for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
            const i = y * W + x; let v = D[i];
            if (x < W - 1) v = Math.min(v, D[i + 1] + a);
            if (y < H - 1) { v = Math.min(v, D[i + W] + a); if (x < W - 1) v = Math.min(v, D[i + W + 1] + b); if (x > 0) v = Math.min(v, D[i + W - 1] + b); }
            D[i] = v;
        }
        const c = col(color), R = r * this.s;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const d = D[y * W + x]; if (d === 0 || d > R + 1) continue;
            const o = (y * p.stride + p.x0 + x) * 4, cov = clamp01(R + 0.5 - d), da = p.data[o + 3] / 255;
            // Sticker goes underneath what's already there.
            const out = da + cov * (1 - da); if (out <= 0) continue;
            for (let k = 0; k < 3; k++) p.data[o + k] = (p.data[o + k] * da + c[k] * cov * (1 - da)) / out;
            p.data[o + 3] = out * 255;
        }
        return this;
    }
}
