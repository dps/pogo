// art.js: every picture in Hibernook is computed here. No image files.
//
// Pogo's Pixmap has ellipses and a 1px outline, which is not enough for plush characters at 300px.
// So this is a small signed-distance painter: each "sticker" is a shape function that returns the
// distance to its edge, rastered to a grid, then shaded like a soft dome (normals from the distance
// field), outlined at any thickness, and composited. Shapes are in units where a creature's body
// radius is 1, so one drawing works at every resolution. The result is copied into assets.paint().

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const hexCache = new Map();
export function rgb(hex) {
    let c = hexCache.get(hex);
    if (!c) {
        const h = hex.replace("#", "");
        c = [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
        hexCache.set(hex, c);
    }
    return c;
}

// --- Distance functions ------------------------------------------------------------------------
export const circ = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
/** Good-enough ellipse distance (exact on the axes, smooth everywhere). */
export const ell = (cx, cy, rx, ry, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot), m = Math.min(rx, ry);
    return (x, y) => {
        const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
        const k = Math.hypot(u, v);
        return (k - 1) * (k < 1e-5 ? m : Math.min(1.6 * m, m + (Math.hypot(u * rx, v * ry) / (k || 1) - m) * 0.6));
    };
};
export const seg = (ax, ay, bx, by, r, r2 = r) => {
    const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    return (x, y) => {
        const t = clamp(((x - ax) * dx + (y - ay) * dy) / l);
        return Math.hypot(x - ax - t * dx, y - ay - t * dy) - (r + (r2 - r) * t);
    };
};
export const poly = (pts, round = 0) => (x, y) => {
    let d = 1e9, s = 1;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[j], ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
        const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey)), px = wx - ex * t, py = wy - ey * t;
        d = Math.min(d, px * px + py * py);
        const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d) - round;
};
/** A rounded box. */
export const box = (cx, cy, hw, hh, r = 0) => (x, y) => {
    const dx = Math.abs(x - cx) - hw + r, dy = Math.abs(y - cy) - hh + r;
    return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};
export const union = (...f) => (x, y) => { let d = 1e9; for (const g of f) { const v = g(x, y); if (v < d) d = v; } return d; };
export const sub = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
export const meet = (a, b) => (x, y) => Math.max(a(x, y), b(x, y));
/** Smooth union, so limbs melt into bodies like plush seams. */
export const blob = (k, ...f) => (x, y) => {
    let d = f[0](x, y);
    for (let i = 1; i < f.length; i++) {
        const b = f[i](x, y), h = clamp(0.5 + 0.5 * (b - d) / k);
        d = b + (d - b) * h - k * h * (1 - h);
    }
    return d;
};
/** Mirror on x: draw the left side, get both. */
export const both = (f) => (x, y) => f(-Math.abs(x), y);
/** Displace an edge by a radial wave: tufts of fur, quills, clouds of snow. */
export const tufted = (f, cx, cy, n, amp, sharp = 1) => (x, y) => {
    const a = Math.atan2(y - cy, x - cx), w = Math.abs(Math.sin(a * n * 0.5));
    return f(x, y) - amp * (1 - Math.pow(1 - w, sharp) * 2 + 1) * 0.5;
};
/** Bake an expensive shape into a half-resolution grid for this painter; lookups are bilinear. */
export function baked(sd, P, step = 2) {
    const gw = Math.ceil(P.w / step) + 2, gh = Math.ceil(P.h / step) + 2, g = new Float32Array(gw * gh), k = step / P.s;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = sd((i * step - P.ox) / P.s, (j * step - P.oy) / P.s);
    return (x, y) => {
        const u = clamp((x * P.s + P.ox) / step, 0, gw - 1.001), v = clamp((y * P.s + P.oy) / step, 0, gh - 1.001), i = u | 0, j = v | 0, fx = u - i, fy = v - j, o = j * gw + i;
        const a = g[o] + (g[o + 1] - g[o]) * fx, b = g[o + gw] + (g[o + gw + 1] - g[o + gw]) * fx;
        void k;
        return a + (b - a) * fy;
    };
}
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Smooth value noise, used for plush grain, bark and snow. */
export function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// --- Painter -----------------------------------------------------------------------------------
const LIGHT = (() => { const l = Math.hypot(-0.5, -0.72, 0.62); return [-0.5 / l, -0.72 / l, 0.62 / l]; })();
let gridBuf = new Float32Array(1 << 18);

export class Painter {
    /** w, h are pixels. Unit coordinates map to pixels with `scale`, centred on (ox, oy) pixels. */
    constructor(w, h, scale, ox = w / 2, oy = h / 2) {
        this.w = w; this.h = h; this.s = scale; this.ox = ox; this.oy = oy;
        this.buf = new Float32Array(w * h * 4);  // premultiplied RGBA
    }
    /**
     * Paint one shape.
     * c        fill colour, or (u, v, out) => write rgb to out
     * c2       bottom colour for a vertical gradient across the shape
     * line, lw outline colour and width in units, grown outward
     * bevel    dome height falloff in units; 0 means flat
     * dark, light   shadow and highlight colours for the dome
     * spec     strength of a wet specular
     * soft     feather width in units, for glows and blush
     * a        opacity
     * mask     clip to this shape
     * fur      strength of plush grain
     */
    fill(sd, o = {}) {
        const { w, h, s, ox, oy, buf } = this, lw = o.line ? o.lw ?? 0.05 : 0, soft = o.soft ?? 0, bb = o.bb;
        const pad = lw + soft + 2 / s;
        const x0 = bb ? Math.max(0, Math.floor(ox + (bb[0] - pad) * s)) : 0, y0 = bb ? Math.max(0, Math.floor(oy + (bb[1] - pad) * s)) : 0;
        const x1 = bb ? Math.min(w, Math.ceil(ox + (bb[2] + pad) * s)) : w, y1 = bb ? Math.min(h, Math.ceil(oy + (bb[3] + pad) * s)) : h;
        const gw = x1 - x0, gh = y1 - y0;
        if (gw <= 0 || gh <= 0) return this;
        if (gridBuf.length < gw * gh) gridBuf = new Float32Array(gw * gh);
        const grid = gridBuf, inv = 1 / s;
        let top = 1e9, bot = -1e9;
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
            const u = (x0 + i + 0.5 - ox) * inv, v = (y0 + j + 0.5 - oy) * inv, d = sd(u, v);
            grid[j * gw + i] = d;
            if (d < 0) { if (v < top) top = v; if (v > bot) bot = v; }
        }
        const fn = typeof o.c === "function" ? o.c : null, base = fn ? null : rgb(o.c ?? "#ffffff"), base2 = o.c2 ? rgb(o.c2) : null;
        const dark = o.dark ? rgb(o.dark) : null, light = o.light ? rgb(o.light) : null, line = o.line ? rgb(o.line) : null;
        const bevel = o.bevel ?? 0, alpha = o.a ?? 1, mask = o.mask, fur = o.fur ?? 0, spec = o.spec ?? 0, out = [0, 0, 0];
        const aa = inv, span = Math.max(1e-4, bot - top);
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
            const g = j * gw + i, d = grid[g];
            if (d > lw + soft + aa) continue;
            const cov = soft ? 1 - sstep(-soft, soft, d) : clamp(0.5 - d * s);
            const lcov = line ? clamp(0.5 - (d - lw) * s) : cov;
            if (lcov <= 0) continue;
            const u = (x0 + i + 0.5 - ox) * inv, v = (y0 + j + 0.5 - oy) * inv;
            let r, gg, b;
            if (cov > 0) {
                if (fn) { fn(u, v, out, d); r = out[0]; gg = out[1]; b = out[2]; } else {
                    r = base[0]; gg = base[1]; b = base[2];
                    if (base2) { const t = clamp((v - top) / span); r += (base2[0] - r) * t; gg += (base2[1] - gg) * t; b += (base2[2] - b) * t; }
                }
                if (bevel) {
                    const gl = i > 0 ? grid[g - 1] : d, gr = i < gw - 1 ? grid[g + 1] : d, gu = j > 0 ? grid[g - gw] : d, gd = j < gh - 1 ? grid[g + gw] : d;
                    let nx = gr - gl, ny = gd - gu;
                    const nl = Math.hypot(nx, ny) || 1;
                    nx /= nl; ny /= nl;
                    const t = clamp(-d / bevel), tilt = Math.sqrt(1 - t * t * 0 - (t * (2 - t)) ** 2 * 0.999);  // sphere-ish profile
                    const n0 = nx * tilt, n1 = ny * tilt, n2 = Math.sqrt(Math.max(0, 1 - tilt * tilt));
                    const l = n0 * LIGHT[0] + n1 * LIGHT[1] + n2 * LIGHT[2];
                    const k = clamp((l - 0.28) / 0.6, -1, 1);
                    if (k < 0 && dark) { const q = -k * 0.95; r += (dark[0] - r) * q; gg += (dark[1] - gg) * q; b += (dark[2] - b) * q; }
                    if (k > 0 && light) { const q = k * k * 0.8; r += (light[0] - r) * q; gg += (light[1] - gg) * q; b += (light[2] - b) * q; }
                    if (spec) {
                        const hl = Math.pow(clamp(l), 22) * spec;
                        r += (1 - r) * hl; gg += (1 - gg) * hl; b += (1 - b) * hl;
                    }
                }
                if (fur) {
                    const n = (noise(u * 26, v * 26) - 0.5) * 0.6 + (noise(u * 60 + 7, v * 60) - 0.5) * 0.4, f = n * fur;
                    r += f; gg += f; b += f;
                }
            } else { r = line[0]; gg = line[1]; b = line[2]; }
            if (line && cov < 1) {
                const q = clamp(cov);
                r = line[0] + (r - line[0]) * q; gg = line[1] + (gg - line[1]) * q; b = line[2] + (b - line[2]) * q;
            }
            let a = lcov * alpha;
            if (mask) a *= clamp(0.5 - mask(u, v) * s);
            if (a <= 0) continue;
            const p = (y0 + j) * w * 4 + (x0 + i) * 4, ia = 1 - a;
            buf[p] = clamp(r) * a + buf[p] * ia;
            buf[p + 1] = clamp(gg) * a + buf[p + 1] * ia;
            buf[p + 2] = clamp(b) * a + buf[p + 2] * ia;
            buf[p + 3] = a + buf[p + 3] * ia;
        }
        return this;
    }
    /** A round stroke along points. */
    stroke(pts, c, w, o = {}) {
        for (let i = 0; i + 1 < pts.length; i++) {
            const [ax, ay] = pts[i], [bx, by] = pts[i + 1], m = w;
            this.fill(seg(ax, ay, bx, by, w / 2), { c, ...o, bb: [Math.min(ax, bx) - m, Math.min(ay, by) - m, Math.max(ax, bx) + m, Math.max(ay, by) + m] });
        }
        return this;
    }
    /** Copy into a Pogo Pixmap. Pogo textures upload straight alpha and premultiply themselves. */
    blit(p) {
        const { w, h, buf } = this, d = p.data;
        for (let y = 0; y < h; y++) {
            let o = p.index(0, y), q = y * w * 4;
            for (let x = 0; x < w; x++, o += 4, q += 4) {
                const a = buf[q + 3];
                if (a <= 0) continue;
                d[o] = Math.min(255, buf[q] / a * 255 + 0.5);
                d[o + 1] = Math.min(255, buf[q + 1] / a * 255 + 0.5);
                d[o + 2] = Math.min(255, buf[q + 2] / a * 255 + 0.5);
                d[o + 3] = a * 255 + 0.5;
            }
        }
    }
    /** Box-filter down. Pogo has no mipmaps, so anything drawn small needs its own smaller copy. */
    shrink(tw) {
        const k = this.w / tw, th = Math.round(this.h / k), out = new Painter(tw, th, this.s / k, this.ox / k, this.oy / k), r = Math.ceil(k);
        for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
            const sx = Math.floor(x * k), sy = Math.floor(y * k);
            let a = 0, b = 0, c = 0, e = 0, n = 0;
            for (let j = sy; j < Math.min(this.h, sy + r); j++) for (let i = sx; i < Math.min(this.w, sx + r); i++) {
                const q = (j * this.w + i) * 4;
                a += this.buf[q]; b += this.buf[q + 1]; c += this.buf[q + 2]; e += this.buf[q + 3]; n++;
            }
            const o = (y * tw + x) * 4;
            out.buf[o] = a / n; out.buf[o + 1] = b / n; out.buf[o + 2] = c / n; out.buf[o + 3] = e / n;
        }
        return out;
    }
}

const B = (e = 1.4) => [-e, -e, e, e];

// --- The twelve sleepers, plus two specials -------------------------------------------------------
// Faces are not painted here: eyes, brows and mouths are drawn live so they can blink, look around,
// worry and snooze. `face` tells the game where they go, in body-radius units.
export const SPECIES = [
    {
        id: "ladybird", name: "Dot", kind: "Ladybird", ink: "#3a1420", face: { ex: 0.3, ey: 0.17, er: 0.15, my: 0.47, mw: 0.3, style: "bead" },
        bio: "Sleeps under a single leaf. Tells everyone it's two leaves.",
        paint(p) {
            const ink = "#3a1420";
            for (const sx of [-1, 1]) {
                p.stroke([[sx * 0.2, -0.8], [sx * 0.38, -1.12], [sx * 0.62, -1.2]], ink, 0.085);
                p.fill(circ(sx * 0.66, -1.2, 0.11), { c: ink, bb: [sx * 0.66 - 0.2, -1.4, sx * 0.66 + 0.2, -1] });
            }
            const body = circ(0, 0, 0.95);
            p.fill(body, { c: "#ff5a4f", c2: "#e22f3e", line: ink, lw: 0.075, bevel: 0.95, dark: "#a4152f", light: "#ffc2a8", spec: 0.7, bb: B(1) });
            const spots = union(circ(-0.5, -0.5, 0.24), circ(0.52, -0.46, 0.27), circ(0, -0.72, 0.17), circ(-0.8, 0.12, 0.16), circ(0.82, 0.14, 0.18));
            p.fill(spots, { c: "#2d1420", mask: body, bb: B(1) });
            const cream = ell(0, 0.42, 0.72, 0.6);
            p.fill(cream, { c: "#fff0dc", c2: "#ffd9bd", mask: body, line: ink, lw: 0.05, bb: B(1.2) });
            p.fill(both(ell(-0.52, 0.5, 0.15, 0.1)), { c: "#ff9a8e", soft: 0.05, mask: body, a: 0.8, bb: B(1) });
        },
    },
    {
        id: "bee", name: "Bumble", kind: "Bumblebee", ink: "#40270f", face: { ex: 0.34, ey: 0.08, er: 0.15, my: 0.33, mw: 0.28, style: "bead" },
        bio: "The only queen in the burrow. Snores in a perfect B flat.",
        paint(p) {
            const ink = "#40270f";
            for (const sx of [-1, 1]) {
                const wing = ell(sx * 0.8, -0.62, 0.52, 0.34, sx * -0.6);
                p.fill(wing, { c: "#e9f6ff", c2: "#bfe3f7", line: "#6b8299", lw: 0.05, a: 0.92, bb: [sx * 0.8 - 0.7, -1.3, sx * 0.8 + 0.7, 0] });
                p.fill(ell(sx * 0.72, -0.72, 0.2, 0.08, sx * -0.6), { c: "#ffffff", a: 0.8, bb: [sx * 0.8 - 0.7, -1.3, sx * 0.8 + 0.7, 0] });
                p.stroke([[sx * 0.18, -0.8], [sx * 0.26, -1.1], [sx * 0.46, -1.2]], ink, 0.075);
                p.fill(circ(sx * 0.48, -1.2, 0.1), { c: ink, bb: [sx * 0.48 - 0.2, -1.4, sx * 0.48 + 0.2, -1] });
            }
            const body = circ(0, 0, 0.95);
            p.fill(body, { c: "#ffd84d", c2: "#ffb52e", line: ink, lw: 0.075, bevel: 0.95, dark: "#d97a12", light: "#fff4b8", fur: 0.1, bb: B(1) });
            const stripe = (y, w) => (x, v) => Math.abs(v - y + 0.32 * x * x) - w;
            p.fill(stripe(-0.56, 0.15), { c: "#4a2c12", mask: body, a: 0.96, bb: B(1) });
            p.fill(stripe(0.72, 0.17), { c: "#4a2c12", mask: body, a: 0.96, bb: B(1) });
            p.fill(ell(0, -0.84, 0.3, 0.16), { c: "#fff7d1", soft: 0.1, mask: body, a: 0.8, bb: B(1) });
            p.fill(both(ell(-0.6, 0.3, 0.16, 0.1)), { c: "#ff9d5c", soft: 0.05, mask: body, a: 0.8, bb: B(1) });
        },
    },
    {
        id: "mouse", name: "Pip", kind: "Field Mouse", ink: "#47384f", face: { ex: 0.36, ey: 0.02, er: 0.14, my: 0.42, mw: 0.2, style: "bead", mouth: "w" },
        bio: "Has been packing for winter since last spring. Still not ready.",
        paint(p) {
            const ink = "#47384f";
            p.fill(both(circ(-0.72, -0.72, 0.5)), { c: "#c3b6cf", line: ink, lw: 0.07, bevel: 0.5, dark: "#8c7c9b", light: "#ece4f2", bb: B() });
            p.fill(both(circ(-0.72, -0.7, 0.33)), { c: "#ffb1c1", c2: "#ff8fa8", soft: 0.02, bevel: 0.3, dark: "#e36c8c", bb: B() });
            const body = ell(0, 0.03, 0.97, 0.92);
            p.fill(body, { c: "#d7cce0", c2: "#b5a6c4", line: ink, lw: 0.075, bevel: 0.95, dark: "#8a7a9c", light: "#fbf7ff", fur: 0.07, bb: B(1.1) });
            p.fill(ell(0, 0.46, 0.62, 0.44), { c: "#f7f0f6", soft: 0.12, mask: body, bb: B(1.1) });
            p.fill(both(ell(-0.6, 0.3, 0.17, 0.11)), { c: "#ff9db4", soft: 0.05, mask: body, a: 0.85, bb: B(1.1) });
            p.fill(ell(0, 0.26, 0.09, 0.07), { c: "#f06a8e", c2: "#d94a78", line: ink, lw: 0.03, bb: B(1) });
            for (const sx of [-1, 1]) {
                p.stroke([[sx * 0.54, 0.38], [sx * 0.98, 0.3]], ink, 0.03);
                p.stroke([[sx * 0.54, 0.46], [sx * 0.96, 0.5]], ink, 0.03);
            }
        },
    },
    {
        id: "frog", name: "Lily", kind: "Wood Frog", ink: "#1f4a33", face: { ex: 0.52, ey: -0.62, er: 0.17, my: 0.08, mw: 0.62, style: "bead", mouth: "wide" },
        bio: "Freezes solid every winter on purpose. Says it's great for the skin.",
        paint(p) {
            const ink = "#1f4a33";
            const shape = blob(0.14, ell(0, 0.08, 0.98, 0.86), both(circ(-0.52, -0.62, 0.34)));
            p.fill(shape, { c: "#8fe388", c2: "#46b56c", line: ink, lw: 0.075, bevel: 0.75, dark: "#1f8a5a", light: "#e4ffc9", spec: 0.55, bb: B(1.15) });
            p.fill(both(circ(-0.52, -0.62, 0.23)), { c: "#f6ffe6", c2: "#d8f6c0", bb: B(1.1) });
            p.fill(ell(0, 0.62, 0.68, 0.4), { c: "#f2fbcf", c2: "#d6f0a8", soft: 0.08, mask: shape, bb: B(1.1) });
            p.fill(both(circ(-0.72, -0.08, 0.12)), { c: "#ff9f9a", soft: 0.06, mask: shape, a: 0.8, bb: B(1.1) });
            p.fill(union(circ(-0.14, -0.28, 0.05), circ(0.12, -0.34, 0.035), circ(0.76, 0.34, 0.05)), { c: "#2f9a5f", mask: shape, a: 0.7, bb: B(1.1) });
        },
    },
    {
        id: "chipmunk", name: "Hazel", kind: "Chipmunk", ink: "#54290f", face: { ex: 0.36, ey: -0.08, er: 0.15, my: 0.4, mw: 0.18, style: "bead", mouth: "w" },
        bio: "Cheeks full, mouth full, dreams full. Nine hundred nuts and counting.",
        paint(p) {
            const ink = "#54290f";
            p.fill(both(circ(-0.56, -0.86, 0.26)), { c: "#d98a44", line: ink, lw: 0.07, bevel: 0.3, dark: "#a95f29", light: "#ffd9a3", bb: B() });
            p.fill(both(circ(-0.56, -0.84, 0.13)), { c: "#ffc9a3", bb: B() });
            const shape = blob(0.22, ell(0, -0.04, 0.9, 0.9), both(ell(-0.64, 0.38, 0.46, 0.44)));
            const m = shape;
            p.fill(shape, { c: "#f5a95a", c2: "#de7f33", line: ink, lw: 0.075, bevel: 0.95, dark: "#ad5420", light: "#ffe3b0", fur: 0.07, bb: B(1.2) });
            const st = (x0, w) => (x, y) => Math.abs(x - x0 - x * x * x * 0.05 * Math.sign(x0 + 0.001)) - w + (y + 1) * 0;
            p.fill(meet(st(0, 0.08), box(0, -0.6, 1, 0.42)), { c: "#5e2e12", mask: m, bb: B(1.2) });
            for (const sx of [-1, 1]) {
                const a = (x, y) => Math.abs(x - sx * (0.34 + 0.16 * (y + 0.9))) - 0.07;
                const b = (x, y) => Math.abs(x - sx * (0.56 + 0.2 * (y + 0.9))) - 0.05;
                p.fill(meet(a, box(0, -0.68, 1.2, 0.3)), { c: "#fff0da", mask: m, bb: B(1.2) });
                p.fill(meet(b, box(0, -0.66, 1.2, 0.3)), { c: "#5e2e12", mask: m, bb: B(1.2) });
            }
            p.fill(both(ell(-0.56, 0.42, 0.44, 0.4)), { c: "#fff4e0", soft: 0.1, mask: m, bb: B(1.2) });
            p.fill(ell(0, 0.5, 0.36, 0.36), { c: "#fff4e0", soft: 0.1, mask: m, bb: B(1.2) });
            p.fill(both(ell(-0.68, 0.32, 0.18, 0.11)), { c: "#ff9a7a", soft: 0.06, mask: m, a: 0.8, bb: B(1.2) });
            p.fill(ell(0, 0.24, 0.08, 0.06), { c: "#7a3a1c", line: ink, lw: 0.02, bb: B(1) });
        },
    },
    {
        id: "hedgehog", name: "Bramble", kind: "Hedgehog", ink: "#35251c", face: { ex: 0.34, ey: 0.16, er: 0.14, my: 0.56, mw: 0.2, style: "bead" },
        bio: "Hugs carefully. Very carefully. Nobody has complained twice.",
        paint(p) {
            const ink = "#35251c", spikes = (r, n, amp, sh = 0) => (x, y) => {
                const a = Math.atan2(y, x) + sh, t = Math.abs(((a / (Math.PI * 2) * n) % 1 + 1) % 1 - 0.5) * 2;
                return Math.hypot(x, y) - r - amp * (1 - t) * sstep(1.05, -0.3, y * 1.2);
            };
            p.fill(spikes(0.9, 22, 0.26), { c: "#7c5a42", c2: "#553a2a", line: ink, lw: 0.07, bevel: 0.9, dark: "#3a261b", light: "#c49a78", bb: B(1.3) });
            p.fill(spikes(0.74, 18, 0.2, 0.17), { c: "#94704f", c2: "#6c4a35", bevel: 0.6, dark: "#46301f", light: "#dcb48c", bb: B(1.3) });
            p.fill(spikes(0.56, 14, 0.15, 0.3), { c: "#a8805c", soft: 0.015, bb: B(1.3) });
            for (const [sx, sy, a] of [[-0.5, -0.62, 2.2], [0.1, -0.74, 1.5], [0.56, -0.54, 0.9], [-0.76, -0.2, 2.8], [0.8, -0.14, 0.4], [-0.16, -0.5, 1.8], [0.3, -0.42, 1.2]]) {
                p.fill(seg(sx, sy, sx - Math.cos(a) * 0.2 * -1, sy - Math.sin(a) * 0.2, 0.022, 0.005), { c: "#f4dcbe", a: 0.85, bb: [sx - 0.3, sy - 0.3, sx + 0.3, sy + 0.3] });
            }
            p.fill(both(circ(-0.68, -0.32, 0.17)), { c: "#e8bd97", line: ink, lw: 0.05, bevel: 0.2, dark: "#b98b66", bb: B() });
            const face = blob(0.2, ell(0, 0.34, 0.78, 0.6), ell(0, -0.02, 0.5, 0.3));
            p.fill(face, { c: "#ffe9cf", c2: "#f3c9a0", line: ink, lw: 0.055, bevel: 0.5, dark: "#d29c6e", light: "#fff9ee", bb: B(1.2) });
            p.fill(both(ell(-0.52, 0.48, 0.15, 0.1)), { c: "#ff9f8f", soft: 0.05, mask: face, a: 0.85, bb: B(1.1) });
            p.fill(ell(0, 0.4, 0.11, 0.085), { c: "#32211b", light: "#a58070", bevel: 0.1, bb: B(1) });
        },
    },
    {
        id: "bat", name: "Flit", kind: "Pipistrelle", ink: "#2a1a44", face: { ex: 0.36, ey: 0.02, er: 0.17, my: 0.38, mw: 0.22, style: "bead", fangs: true },
        bio: "Sleeps upside down, so the whole burrow is technically on her ceiling.",
        paint(p) {
            const ink = "#2a1a44";
            for (const sx of [-1, 1]) {
                const wing = sub(poly([[sx * 0.7, -0.5], [sx * 1.34, -0.3], [sx * 1.34, 0.62], [sx * 0.7, 0.72]], 0.04), union(circ(sx * 1.47, 0.3, 0.25), circ(sx * 1.2, 0.78, 0.26)));
                p.fill(wing, { c: "#7a5bb5", c2: "#4e3a8c", line: ink, lw: 0.065, bevel: 0.4, dark: "#3a2a70", light: "#a78be0", bb: [sx * 1 - 0.5, -0.8, sx * 1 + 0.5, 1] });
            }
            p.fill(both(poly([[-0.92, -0.34], [-0.78, -1.26], [-0.16, -0.7]], 0.05)), { c: "#9478d4", c2: "#6f51ad", line: ink, lw: 0.07, bevel: 0.35, dark: "#4b3585", light: "#c9b3f5", bb: B() });
            p.fill(both(poly([[-0.76, -0.52], [-0.72, -1.0], [-0.36, -0.68]], 0.02)), { c: "#f092c2", c2: "#c95d9d", bb: B() });
            const body = circ(0, 0, 0.92);
            p.fill(body, { c: "#a78ae0", c2: "#7350b8", line: ink, lw: 0.075, bevel: 0.95, dark: "#46308a", light: "#e6dbff", fur: 0.07, bb: B(1.1) });
            const tuft = tufted(ell(0, 0.82, 0.58, 0.4), 0, 0.82, 16, 0.05);
            p.fill(tuft, { c: "#f6dcb5", c2: "#e5b98b", mask: body, bb: B(1.1) });
            p.fill(both(ell(-0.56, 0.28, 0.16, 0.1)), { c: "#ff93c6", soft: 0.05, mask: body, a: 0.8, bb: B(1.1) });
            p.fill(ell(0, 0.22, 0.09, 0.06), { c: "#3d2560", bb: B(1) });
        },
    },
    {
        id: "tortoise", name: "Moss", kind: "Tortoise", ink: "#20372f", face: { ex: 0.27, ey: 0.28, er: 0.13, my: 0.6, mw: 0.22, style: "bead" },
        bio: "Started hibernating in 1974. Has not been told it's over.",
        paint(p) {
            const ink = "#20372f";
            for (const sx of [-1, 1]) p.fill(ell(sx * 0.8, 0.72, 0.28, 0.2, sx * 0.3), { c: "#b8cf8e", line: ink, lw: 0.06, bevel: 0.2, dark: "#7f9a5d", bb: B() });
            p.stroke([[0.1, -0.98], [0.1, -1.18]], "#4f8a3f", 0.05);
            p.fill(ell(0.26, -1.25, 0.2, 0.09, -0.4), { c: "#9be36f", c2: "#58b552", line: ink, lw: 0.03, bb: B() });
            p.fill(ell(-0.03, -1.22, 0.15, 0.07, 0.5), { c: "#9be36f", c2: "#58b552", line: ink, lw: 0.03, bb: B() });
            const shell = ell(0, -0.04, 1, 0.92);
            p.fill(shell, { c: "#4bb39a", c2: "#27806f", line: ink, lw: 0.08, bevel: 0.95, dark: "#135349", light: "#bdf5da", spec: 0.45, bb: B(1.15) });
            const scute = (cx, cy, r) => poly(Array.from({ length: 6 }, (_, i) => [cx + Math.cos(i * Math.PI / 3 + 0.52) * r, cy + Math.sin(i * Math.PI / 3 + 0.52) * r]), 0.03);
            for (const [cx, cy, r] of [[0, -0.58, 0.28], [-0.56, -0.3, 0.26], [0.56, -0.3, 0.26], [-0.84, 0.28, 0.2], [0.84, 0.28, 0.2]]) {
                p.fill(scute(cx, cy, r), { c: "#7fdcb8", c2: "#3ca68c", bevel: 0.14, dark: "#2a8671", light: "#d5ffe9", mask: shell, line: "#1f6f60", lw: 0.03, bb: [cx - 0.4, cy - 0.4, cx + 0.4, cy + 0.4] });
            }
            p.fill(ell(-0.05, -0.92, 0.34, 0.12, -0.1), { c: "#8fd161", c2: "#5fa84b", soft: 0.02, mask: shell, bb: B(1.1) });
            const head = ell(0, 0.42, 0.66, 0.54);
            p.fill(head, { c: "#d7e8a6", c2: "#a9c97d", line: ink, lw: 0.07, bevel: 0.6, dark: "#7a9e5b", light: "#f8ffd9", bb: B(1.2) });
            p.fill(both(ell(-0.44, 0.56, 0.13, 0.09)), { c: "#f3a08c", soft: 0.05, mask: head, a: 0.8, bb: B(1.1) });
            p.fill(both(circ(-0.06, 0.46, 0.02)), { c: "#4c6a3f", bb: B(1) });
        },
    },
    {
        id: "badger", name: "Brock", kind: "Badger", ink: "#191c26", face: { ex: 0.42, ey: -0.02, er: 0.12, my: 0.56, mw: 0.2, style: "ring" },
        bio: "Dug this whole burrow in one night. Will mention it again shortly.",
        paint(p) {
            const ink = "#191c26";
            p.fill(both(circ(-0.72, -0.72, 0.28)), { c: "#343947", line: ink, lw: 0.07, bevel: 0.3, dark: "#15171f", light: "#6e7588", bb: B() });
            p.fill(both(circ(-0.74, -0.76, 0.13)), { c: "#fbf7ef", bb: B() });
            const body = ell(0, 0.02, 0.98, 0.93);
            p.fill(body, { c: "#fffaf1", c2: "#dcd8d4", line: ink, lw: 0.08, bevel: 0.95, dark: "#9c9aa8", light: "#ffffff", fur: 0.08, bb: B(1.15) });
            const band = both((x, y) => { const c = -0.42 + (y + 0.95) * 0.06 * (y > 0 ? 0.1 : 1); return Math.max(Math.abs(x - c) - 0.17 - 0.1 * Math.max(0, 0.3 - Math.abs(y - 0.02)), y - 0.4 - 0 * x); });
            p.fill(band, { c: "#30343f", c2: "#20232d", soft: 0.012, mask: body, bb: B(1.15) });
            p.fill(both(ell(-0.72, 0.4, 0.34, 0.5)), { c: "#60657a", soft: 0.2, mask: body, a: 0.75, bb: B(1.15) });
            p.fill(ell(0, 0.42, 0.13, 0.095), { c: "#20232d", light: "#7d8496", bevel: 0.12, bb: B(1) });
            p.fill(both(ell(-0.28, 0.52, 0.12, 0.08)), { c: "#ffa4a4", soft: 0.05, mask: body, a: 0.9, bb: B(1.1) });
        },
    },
    {
        id: "owl", name: "Tawny", kind: "Tawny Owl", ink: "#3b2415", face: { ex: 0.38, ey: -0.13, er: 0.2, my: 0.2, mw: 0, style: "iris", iris: "#ffb52e" },
        bio: "Does not hibernate. Came in for one chat in October and stayed.",
        paint(p) {
            const ink = "#3b2415";
            p.fill(both(poly([[-0.8, -0.56], [-0.86, -1.22], [-0.24, -0.82]], 0.05)), { c: "#a86d3c", c2: "#7f4c28", line: ink, lw: 0.07, bevel: 0.3, dark: "#573218", light: "#e0a56e", bb: B() });
            const body = ell(0, 0.02, 0.98, 0.95);
            p.fill(body, { c: "#c58a4e", c2: "#8f5a2f", line: ink, lw: 0.08, bevel: 0.95, dark: "#54311a", light: "#f6cf9b", fur: 0.06, bb: B(1.15) });
            for (const sx of [-1, 1]) {
                const w = ell(sx * 0.9, 0.3, 0.3, 0.66, sx * 0.18);
                p.fill(w, { c: "#a86d3c", c2: "#6e4122", line: ink, lw: 0.05, bevel: 0.3, dark: "#4b2a14", light: "#d59c62", mask: body, bb: B(1.15) });
            }
            const belly = ell(0, 0.6, 0.62, 0.5);
            p.fill(belly, { c: "#ffe3b8", c2: "#f0c48c", soft: 0.05, mask: body, bb: B(1.15) });
            for (const [x, y] of [[-0.3, 0.48], [0, 0.46], [0.3, 0.48], [-0.16, 0.68], [0.16, 0.68], [-0.42, 0.68], [0.42, 0.68], [0, 0.86], [-0.28, 0.86], [0.28, 0.86]]) {
                p.stroke([[x - 0.08, y - 0.06], [x, y + 0.03], [x + 0.08, y - 0.06]], "#a86d3c", 0.04, { mask: body });
            }
            const disc = both(circ(-0.38, -0.12, 0.44));
            p.fill(disc, { c: "#ffefd2", c2: "#f7d4a0", line: "#8f5a2f", lw: 0.05, bevel: 0.2, dark: "#deb27a", bb: B(1.1) });
            p.fill(poly([[-0.12, 0.08], [0.12, 0.08], [0, 0.34]], 0.04), { c: "#ffc14d", c2: "#f08f25", line: ink, lw: 0.035, bb: B(1) });
        },
    },
    {
        id: "bear", name: "Barley", kind: "Honey Bear", ink: "#3f2311", face: { ex: 0.34, ey: -0.1, er: 0.115, my: 0.32, mw: 0.2, style: "bead", mouth: "w" },
        bio: "Knitted the scarf herself. It was meant to be a sock.",
        paint(p) {
            const ink = "#3f2311";
            p.fill(both(circ(-0.74, -0.74, 0.32)), { c: "#c98a4c", line: ink, lw: 0.08, bevel: 0.35, dark: "#8a5428", light: "#f3c78e", bb: B() });
            p.fill(both(circ(-0.74, -0.72, 0.17)), { c: "#ffd2a8", c2: "#f0a97b", bb: B() });
            const body = ell(0, 0.02, 0.98, 0.95);
            p.fill(body, { c: "#e0a35f", c2: "#b87337", line: ink, lw: 0.08, bevel: 0.95, dark: "#774119", light: "#ffe2ac", fur: 0.06, bb: B(1.15) });
            p.fill(ell(0, 0.2, 0.42, 0.33), { c: "#fff0d6", c2: "#f7d7ab", soft: 0.03, bevel: 0.3, dark: "#deb27a", mask: body, bb: B(1.1) });
            p.fill(ell(0, 0.08, 0.13, 0.095), { c: "#2c1a12", light: "#9b7a68", bevel: 0.12, bb: B(1) });
            p.fill(both(ell(-0.6, 0.18, 0.17, 0.11)), { c: "#ff8f70", soft: 0.06, mask: body, a: 0.75, bb: B(1.1) });
            // the scarf
            const band = (x, y) => Math.abs(y - 0.76 - 0.12 * x * x + 0.1) - 0.17;
            const scarf = meet(band, ell(0, 0.02, 1.02, 0.99));
            p.fill(scarf, { c: "#e34b4b", c2: "#b92f3f", line: "#6d1a24", lw: 0.04, bevel: 0.2, dark: "#8a1f33", light: "#ff9d8e", bb: B(1.2) });
            p.fill(meet((x, y) => Math.abs(((x * 3.2 + 100) % 1) - 0.5) - 0.17, scarf), { c: "#ffd9a8", a: 0.85, bb: B(1.2) });
            const tail = box(0.46, 0.98, 0.17, 0.27, 0.05);
            p.fill(tail, { c: "#e34b4b", c2: "#b92f3f", line: "#6d1a24", lw: 0.04, bevel: 0.18, dark: "#8a1f33", light: "#ff9d8e", bb: B(1.4) });
            p.fill(meet((x, y) => Math.abs(((y * 4 + 100) % 1) - 0.5) - 0.18, tail), { c: "#ffd9a8", a: 0.85, bb: B(1.4) });
        },
    },
    {
        id: "moonbear", name: "Luna", kind: "Moon Bear", ink: "#0d1433", face: { ex: 0.36, ey: -0.02, er: 0.13, my: 0.36, mw: 0.22, style: "ring", glow: true, mouth: "w" },
        bio: "Older than the forest. When she yawns, it's spring.",
        paint(p) {
            const ink = "#0d1433";
            p.fill(both(circ(-0.76, -0.68, 0.3)), { c: "#333f8c", line: ink, lw: 0.08, bevel: 0.35, dark: "#151c52", light: "#8797ea", bb: B() });
            const body = ell(0, 0.02, 0.98, 0.95);
            p.fill(body, { c: "#3b4aa6", c2: "#1d2569", line: ink, lw: 0.08, bevel: 0.95, dark: "#0f1547", light: "#9db0ff", fur: 0.05, bb: B(1.15) });
            let seed = 3;
            for (let i = 0; i < 26; i++) {
                seed = (seed * 16807) % 2147483647;
                const x = (seed % 1000) / 500 - 1; seed = (seed * 16807) % 2147483647;
                const y = (seed % 1000) / 500 - 1; seed = (seed * 16807) % 2147483647;
                const r = 0.012 + (seed % 100) / 100 * 0.02;
                p.fill(circ(x, y, r), { c: "#fff6c8", soft: 0.012, mask: body, bb: [x - 0.1, y - 0.1, x + 0.1, y + 0.1] });
            }
            p.fill(ell(0, 0.14, 0.42, 0.32), { c: "#c8d2ff", c2: "#9facf0", soft: 0.03, bevel: 0.3, dark: "#7180d0", mask: body, bb: B(1.1) });
            p.fill(ell(0, 0.04, 0.11, 0.08), { c: "#0d1433", light: "#7c8ae0", bevel: 0.1, bb: B(1) });
            // the moon on her chest
            const moon = sub(circ(0, 0.68, 0.28), circ(0, 0.53, 0.28));
            p.fill(moon, { c: "#fff0a8", c2: "#ffc94d", soft: 0.008, mask: body, bb: B(1.1) });
            p.fill(moon, { c: "#ffe27a", soft: 0.12, a: 0.3, mask: body, bb: B(1.1) });
            p.fill(both(ell(-0.58, 0.26, 0.16, 0.1)), { c: "#ff8fc0", soft: 0.06, mask: body, a: 0.55, bb: B(1.1) });
            // the nightcap
            const cap = poly([[-0.74, -0.58], [-0.3, -1.08], [0.38, -1.26], [0.92, -1.1], [1.16, -0.62], [0.72, -0.78], [0.64, -0.5]], 0.09);
            p.fill(cap, { c: "#ffd968", c2: "#f09a3b", line: "#6c3d17", lw: 0.06, bevel: 0.35, dark: "#c7691f", light: "#fff3b5", bb: B(1.4) });
            p.fill(meet((x, y) => Math.abs(((x + y * 0.55 + 10) * 2.8 % 1) - 0.5) - 0.13, cap), { c: "#fff3c9", a: 0.8, bb: B(1.4) });
            p.fill(tufted(circ(1.17, -0.52, 0.16), 1.17, -0.52, 9, 0.04), { c: "#ffffff", c2: "#d6e4ff", line: "#6c3d17", lw: 0.045, bb: B(1.4) });
            const brim = seg(-0.76, -0.46, 0.72, -0.5, 0.13);
            p.fill(brim, { c: "#ffffff", c2: "#cfdcff", line: "#6c3d17", lw: 0.05, bevel: 0.14, dark: "#a2b4e6", fur: 0.08, bb: B(1.3) });
        },
    },
];

export const SNOWBALL = {
    id: "snowball", name: "Flurry", kind: "Grumpy Snowball", ink: "#3a4d73", face: { ex: 0.32, ey: -0.04, er: 0.11, my: 0.4, mw: 0.22, style: "bead", grump: true },
    paint(p) {
        const ink = "#3f5580";
        p.stroke([[-0.86, 0.1], [-1.28, -0.2], [-1.26, -0.44]], "#6b4a33", 0.08);
        p.stroke([[-1.1, -0.08], [-1.34, -0.04]], "#6b4a33", 0.06);
        p.stroke([[0.86, 0.1], [1.28, -0.2], [1.24, -0.46]], "#6b4a33", 0.08);
        p.stroke([[1.12, -0.08], [1.36, -0.02]], "#6b4a33", 0.06);
        const b = tufted(circ(0, 0, 0.93), 0, 0, 11, 0.045);
        p.fill(b, { c: "#ffffff", c2: "#d4e6ff", line: ink, lw: 0.07, bevel: 0.95, dark: "#8fb2e6", light: "#ffffff", fur: 0.05, bb: B(1.15) });
        p.fill(poly([[-0.07, 0.08], [0.07, 0.08], [0.0, 0.34]], 0.03), { c: "#ff9b3d", c2: "#ee6a1f", line: "#9a4413", lw: 0.03, bb: B(1) });
        p.fill(both(ell(-0.56, 0.26, 0.15, 0.09)), { c: "#a9c8ff", soft: 0.06, a: 0.9, bb: B(1.1) });
    },
};

export const ACORN = {
    id: "acorn", name: "Golden Acorn", kind: "Wild", ink: "#5c340c", face: { ex: 0.3, ey: 0.16, er: 0.15, my: 0.48, mw: 0.2, style: "bead" },
    paint(p) {
        const ink = "#5c340c";
        p.fill(tufted(circ(0, 0, 1.28), 0, 0, 12, 0.12, 1), { c: "#ffe38a", soft: 0.2, a: 0.5, bb: B(1.45) });
        const nut = blob(0.1, ell(0, 0.16, 0.86, 0.84), poly([[-0.1, 0.9], [0.1, 0.9], [0, 1.1]], 0.02));
        p.fill(nut, { c: "#ffdf6b", c2: "#f0a226", line: ink, lw: 0.075, bevel: 0.9, dark: "#b86b12", light: "#fff8cf", spec: 1, bb: B(1.3) });
        p.fill(both(ell(-0.5, 0.42, 0.15, 0.1)), { c: "#ff9d5c", soft: 0.05, a: 0.8, bb: B(1.2) });
        p.stroke([[0, -0.98], [0.1, -1.24]], ink, 0.11);
        const cap = meet(ell(0, -0.3, 1.0, 0.72), box(0, -0.62, 1.3, 0.56));
        p.fill(cap, { c: "#b4763c", c2: "#7f4c22", line: ink, lw: 0.07, bevel: 0.45, dark: "#52290f", light: "#eebc83", bb: B(1.3) });
        p.fill(meet((x, y) => { const a = (x + y + 10) * 4.6 % 1, b = (x - y + 10) * 4.6 % 1; return 0.09 - Math.min(Math.abs(a - 0.5), Math.abs(b - 0.5)); }, cap), { c: "#5e3312", a: 0.55, bb: B(1.3) });
    },
};

// --- Live face parts and particles: one sheet, so a whole frame of faces costs one texture ------------
export const FX = { sleep: 0, happy: 1, smile: 2, oh: 3, wobble: 4, brow: 5, laugh: 6, wide: 7, w: 8, star: 9, heart: 10, flake: 11, puff: 12, z: 13, note: 14, petal: 15, sweat: 16, fang: 17, leaf: 18, glowdot: 19 };
export const FX_COUNT = 20;

function paintFx(p, i) {
    // White glyphs get tinted at draw time. Coloured ones keep their colour (mouths, sweat, petals).
    const arc = (flip, thick = 0.2) => {
        const pts = [];
        for (let k = 0; k <= 12; k++) { const a = Math.PI * (0.08 + 0.84 * k / 12), y = Math.sin(a) * 0.46 - 0.2; pts.push([Math.cos(a) * 0.72, flip ? -y : y]); }
        return p.stroke(pts, "#ffffff", thick);
    };
    const curve = (w, h, thick, y0 = 0) => {
        const pts = [];
        for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; pts.push([-Math.cos(a) * w, y0 + Math.sin(a) * h]); }
        return p.stroke(pts, "#ffffff", thick);
    };
    switch (i) {
        case FX.sleep: arc(false); break;
        case FX.happy: arc(true); break;
        case FX.smile: curve(0.62, 0.42, 0.17, -0.2); break;
        case FX.oh: p.fill(ell(0, 0, 0.42, 0.52), { c: "#7a2238", c2: "#4a1224", bb: B(1) }); p.fill(ell(0, 0.28, 0.26, 0.18), { c: "#ff8a9a", mask: ell(0, 0, 0.42, 0.52), bb: B(1) }); break;
        case FX.wobble: {
            const pts = [];
            for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([-0.72 + 1.44 * t, Math.sin(t * Math.PI * 3.1) * 0.2]); }
            p.stroke(pts, "#ffffff", 0.17);
            break;
        }
        case FX.brow: p.fill(seg(-0.7, 0, 0.7, 0, 0.17), { c: "#ffffff", bb: B(1) }); break;
        case FX.laugh: {
            const m = meet(circ(0, -0.34, 0.86), box(0, 0.2, 1, 0.56));
            p.fill(m, { c: "#7a2238", c2: "#4a1224", bb: B(1.1) });
            p.fill(ell(0, 0.54, 0.46, 0.34), { c: "#ff8a9a", mask: m, bb: B(1.1) });
            break;
        }
        case FX.wide: curve(0.9, 0.3, 0.12, -0.14); break;
        case FX.w: { const a = []; for (let k = 0; k <= 8; k++) { const t = k / 8 * Math.PI; a.push([-0.64 + 0.64 * k / 8, -0.08 + Math.sin(t) * 0.3]); } for (let k = 0; k <= 8; k++) { const t = k / 8 * Math.PI; a.push([0.64 * k / 8, -0.08 + Math.sin(t) * 0.3]); } p.stroke(a, "#ffffff", 0.17); break; }
        case FX.star: {
            const pts = [];
            for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.4 : 0.92, a = -Math.PI / 2 + k * Math.PI / 5; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
            p.fill(poly(pts, 0.08), { c: "#ffffff", bb: B(1.1) });
            break;
        }
        case FX.heart: p.fill(blob(0.1, circ(-0.36, -0.2, 0.42), circ(0.36, -0.2, 0.42), poly([[-0.72, -0.02], [0.72, -0.02], [0, 0.82]], 0.03)), { c: "#ffffff", bb: B(1.1) }); break;
        case FX.flake:
            for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + Math.PI / 6, c = Math.cos(a) * 0.86, s = Math.sin(a) * 0.86; p.stroke([[-c, -s], [c, s]], "#ffffff", 0.13); }
            for (let k = 0; k < 6; k++) {
                const a = k * Math.PI / 3 + Math.PI / 6, c = Math.cos(a), s = Math.sin(a), x = c * 0.55, y = s * 0.55;
                p.stroke([[x, y], [x + Math.cos(a + 0.9) * 0.28, y + Math.sin(a + 0.9) * 0.28]], "#ffffff", 0.1);
                p.stroke([[x, y], [x + Math.cos(a - 0.9) * 0.28, y + Math.sin(a - 0.9) * 0.28]], "#ffffff", 0.1);
            }
            break;
        case FX.puff: p.fill(circ(0, 0, 0.56), { c: "#ffffff", soft: 0.4, bb: B(1.1) }); break;
        case FX.z: p.stroke([[-0.5, -0.56], [0.5, -0.56], [-0.5, 0.56], [0.5, 0.56]], "#ffffff", 0.28); break;
        case FX.note: p.fill(ell(-0.28, 0.54, 0.3, 0.24, -0.3), { c: "#ffffff", bb: B(1.1) }); p.stroke([[-0.04, 0.5], [-0.04, -0.7], [0.5, -0.5], [0.5, -0.2]], "#ffffff", 0.14); break;
        case FX.petal: p.fill(meet(circ(-0.28, 0, 0.74), circ(0.28, 0, 0.74)), { c: "#ffd1e4", c2: "#ff8ab8", bb: B(1.1) }); break;
        case FX.sweat: p.fill(blob(0.12, circ(0, 0.26, 0.5), poly([[-0.06, -0.8], [0.06, -0.8], [0.32, 0.1], [-0.32, 0.1]], 0)), { c: "#d3f1ff", c2: "#6cc3ff", line: "#2d6fa8", lw: 0.08, bb: B(1.1) }); break;
        case FX.fang: p.fill(poly([[-0.6, -0.7], [0.6, -0.7], [0, 0.8]], 0.08), { c: "#ffffff", line: "#5b4f7a", lw: 0.1, bb: B(1.1) }); break;
        case FX.leaf: p.fill(meet(circ(-0.4, 0, 0.9), circ(0.4, 0, 0.9)), { c: "#ffe28a", c2: "#ff9e45", bb: B(1.2) }); break;
        case FX.glowdot: p.fill(circ(0, 0, 0.4), { c: "#ffffff", soft: 0.56, bb: B(1.1) }); break;
    }
}

// --- Logo: chubby letters built from strokes, with snow on top -----------------------------------------
const GLYPHS = {
    H: { w: 0.95, s: [[[0, 0], [0, 1]], [[0.95, 0], [0.95, 1]], [[0, 0.5], [0.95, 0.5]]] },
    I: { w: 0.05, s: [[[0, 0], [0, 1]]] },
    B: { w: 0.82, s: [[[0, 0], [0, 1]], [[0, 0], [0.5, 0], [0.76, 0.1], [0.76, 0.36], [0.5, 0.46], [0, 0.46]], [[0.5, 0.46], [0.84, 0.58], [0.84, 0.88], [0.5, 1], [0, 1]]] },
    E: { w: 0.72, s: [[[0, 0], [0, 1]], [[0, 0], [0.72, 0]], [[0, 0.49], [0.6, 0.49]], [[0, 1], [0.72, 1]]] },
    R: { w: 0.82, s: [[[0, 0], [0, 1]], [[0, 0], [0.52, 0], [0.8, 0.12], [0.8, 0.42], [0.52, 0.54], [0, 0.54]], [[0.44, 0.54], [0.84, 1]]] },
    N: { w: 0.95, s: [[[0, 1], [0, 0], [0.95, 1], [0.95, 0]]] },
    O: { w: 0.98, ring: true },
    K: { w: 0.84, s: [[[0, 0], [0, 1]], [[0.8, 0], [0.06, 0.56]], [[0.28, 0.4], [0.84, 1]]] },
};

function paintLogo(P) {
    const cap = 1, stroke = 0.44, gap = 0.46, lines = [["HIBER", -0.8], ["NOOK", 0.8]];
    const fns = [], caps = [];
    let seed = 0;
    for (const [word, ly] of lines) {
        const placed = [];
        let x = 0;
        for (const ch of word) { placed.push([ch, x]); x += GLYPHS[ch].w * cap + gap; }
        const total = x - gap, x0 = -total / 2;
        for (const [ch, gx] of placed) {
            seed++;
            const g = GLYPHS[ch], ox = x0 + gx, tilt = Math.sin(seed * 2.4) * 0.05, oy = ly - cap / 2 + Math.sin(seed * 1.7) * 0.05;
            const t = (a, b) => [ox + a * cap + (b - 0.5) * cap * tilt, oy + b * cap - (a - 0.5) * cap * tilt];
            if (g.ring) {
                const [cx, cy] = t(g.w / 2, 0.5);
                fns.push(sub(circ(cx, cy, cap * 0.5 + stroke / 2), circ(cx, cy, Math.max(0.02, cap * 0.5 - stroke / 2))));
            } else for (const l of g.s) for (let i = 0; i + 1 < l.length; i++) { const a = t(...l[i]), b = t(...l[i + 1]); fns.push(seg(a[0], a[1], b[0], b[1], stroke / 2)); }
        }
        caps.push(ly);
    }
    const text = baked(union(...fns), P);
    P.fill((x, y) => text(x, y - 0.1) - 0.1, { c: "#1a1138", soft: 0.07, a: 0.6 });
    P.fill((x, y) => text(x, y - 0.06), { c: "#8a3f18", line: "#3f1e12", lw: 0.07 });
    P.fill(text, { c: "#ffd27a", c2: "#f27f3a", line: "#4f2413", lw: 0.07, bevel: 0.28, dark: "#c04a1c", light: "#fff6cf", spec: 0.4 });
    const snow = (x, y) => {
        const wob = Math.sin(x * 5.3) * 0.04 + Math.sin(x * 11.1 + 1) * 0.03 + Math.sin(x * 2.3) * 0.05;
        let d = 1e9;
        for (const ly of caps) d = Math.min(d, Math.abs(y - (ly - 0.72)) - 0.17 - wob);
        return Math.max(text(x, y), d);
    };
    P.fill(snow, { c: "#ffffff", c2: "#d9eaff", line: "#7f9fd0", lw: 0.012, bevel: 0.14, dark: "#a5c5f0", light: "#ffffff" });
}

// --- World ---------------------------------------------------------------------------------------
const archInner = (W, H, top) => union(box(W / 2, (top + 76 + H) / 2, W / 2, (H - top - 76) / 2, 13), box(W / 2, top + 110, W / 2, 110, 76));
const archOuter = (W, H, top, wall) => union(box(W / 2, (top + 76 + H + wall) / 2, W / 2 + wall, (H - top - 76 + wall) / 2, 18), box(W / 2, top + 110 - wall, W / 2 + wall, 110, 76 + wall));
const SNOW = { c: "#ffffff", c2: "#d3e4fb", line: "#7492c4", lw: 1.3, bevel: 8, dark: "#a4c3ea", light: "#ffffff" };

function bark(u, v, out) {
    const n = noise(u * 0.09, v * 0.014) * 0.6 + noise(u * 0.3, v * 0.035) * 0.3, g = Math.abs(Math.sin((u + v * 0.12) * 0.42 + n * 7)) * 0.2;
    const k = 0.62 + n * 0.62 - g;
    out[0] = 0.66 * k; out[1] = 0.4 * k; out[2] = 0.24 * k;
}

/** The burrow mouth: a warm cave behind the pile, framed by an arch of old wood under the snow. */
function paintTubBack(P, W, H, top, wall, rim) {
    const inner = baked(archInner(W, H, top), P), outer = baked(archOuter(W, H, top, wall), P), bb = [-wall - 8, top - wall - 12, W + wall + 8, H + wall];
    P.fill((x, y) => outer(x, y - 5) - 2, { c: "#0a0d28", soft: 6, a: 0.4, bb: [-wall - 16, top - wall - 12, W + wall + 16, H + wall + 16] });
    const cave = (u, v, out) => {
        const d = Math.hypot((u - W * 0.5) / W, (v - H * 0.62) / H), t = clamp(1 - d * 1.35), k = t * t;
        const n = noise(u * 0.02, v * 0.05) * 0.5 + noise(u * 0.07, v * 0.12) * 0.3;
        const warm = sstep(-30, 70, v), m = 0.72 + n * 0.55;
        out[0] = (0.2 + k * 0.72) * m * warm + 0.16 * (1 - warm);
        out[1] = (0.1 + k * 0.38) * m * warm + 0.2 * (1 - warm);
        out[2] = (0.11 + k * 0.1) * m * warm + 0.38 * (1 - warm);
    };
    P.fill(inner, { c: cave, bb });
    for (const r of [[[18, 10], [36, 76], [16, 150], [40, 222]], [[282, 16], [262, 90], [288, 180], [262, 262]], [[116, -6], [104, 44], [128, 96]], [[198, -6], [212, 40], [194, 88]]]) P.stroke(r, "#2b1621", 8, { a: 0.28 });
    for (const [x, y] of [[36, 345], [66, 362], [266, 350]]) {
        P.fill(seg(x, y, x, y + 26, 3.2), { c: "#ecd4b0", a: 0.55, bb: [x - 7, y - 3, x + 7, y + 30] });
        P.fill(ell(x, y, 13, 7), { c: "#ffb35c", c2: "#d9662e", a: 0.7, bb: [x - 16, y - 10, x + 16, y + 10] });
    }
    // fairy lights strung across the mouth of the burrow
    const lightY = (x) => top + 66 + 22 * (1 - ((x - W / 2) / (W / 2)) ** 2);
    const wire = [];
    for (let x = 4; x <= W - 4; x += 12) wire.push([x, lightY(x)]);
    P.stroke(wire, "#1b1426", 1.3, { a: 0.75 });
    let i = 0;
    for (let x = 16; x < W - 8; x += 26, i++) {
        const y = lightY(x) + 5, c = ["#ffd86b", "#ff9d7a", "#a7f0c6", "#9fd0ff"][i % 4];
        P.fill(circ(x, y, 12), { c, soft: 10, a: 0.28, bb: [x - 24, y - 24, x + 24, y + 24] });
        P.fill(ell(x, y, 3.6, 4.6), { c: "#fffdf0", c2: c, line: "#2a1e2e", lw: 0.6, bb: [x - 7, y - 7, x + 7, y + 7] });
    }
    const frame = sub(outer, inner);
    P.fill(frame, { c: bark, line: "#2e1712", lw: 2.4, bevel: 12, dark: "#3a1d14", light: "#e8b47f", bb });
    // inner rim shadow
    P.fill((x, y) => { const v = inner(x, y); return v < 0 ? -v - 7 : 99; }, { c: "#1c0d12", a: 0.32, soft: 7, bb });
    // a thick drift on top of the arch
    const drift = (x, y) => {
        const crown = outer(x, y) - 7 - 3.2 * Math.sin(x * 0.047 + 1) - 2.4 * Math.sin(x * 0.13);
        return Math.max(crown, y - (top + 26 + 22 * Math.abs((x - W / 2) / W) * 2.4 + 5 * Math.sin(x * 0.09) + 4 * Math.sin(x * 0.21)));
    };
    P.fill(sub(drift, inner), { ...SNOW, bb: [-wall - 12, top - wall - 12, W + wall + 12, top + 90] });
    for (const [x, l] of [[52, 15], [88, 10], [226, 12], [254, 17]]) {
        const y = top + 16 + 42 * ((x - W / 2) / W) ** 2 * 4, drip = poly([[x - 3.4, y], [x + 3.4, y], [x, y + l]], 0.8);
        P.fill(drip, { c: "#eefaff", c2: "#9ed4ff", line: "#7492c4", lw: 0.8, bb: [x - 7, y - 3, x + 7, y + l + 3] });
    }
}

/** The lower walls and floor, drawn over the edges of the pile so everyone feels inside. */
function paintTubFront(P, W, H, wall, rim, top) {
    // Clipped by the bounding box, not by the shape, so the cut has no outline and meets the back layer invisibly.
    const frame = sub(archOuter(W, H, top, wall), archInner(W, H, top)), bb = [-wall - 6, rim + 3.4, W + wall + 6, H + wall + 8];
    P.fill(frame, { c: bark, line: "#2e1712", lw: 2.4, bevel: 12, dark: "#3a1d14", light: "#e8b47f", bb });
    const foot = (x, y) => y - (H + wall - 3 - 4 * Math.sin(x * 0.04) - 3 * Math.sin(x * 0.11 + 2));
    P.fill(meet(foot, box(W / 2, H + wall + 10, W / 2 + wall + 3, 18, 8)), { ...SNOW, lw: 1.2, bevel: 6, bb: [-wall - 6, H + wall - 12, W + wall + 6, H + wall + 30] });
}

/** A tile of snowy pines, wrapping at the sides. */
function paintPines(P, seed, base, tint, density = 6) {
    const W = P.w, h = P.h, bb = null;
    const trees = [];
    for (let i = 0; i < density; i++) {
        const x = (i + 0.2 + hash(i, seed) * 0.6) / density * W, t = 0.6 + hash(i + 3, seed) * 0.4;
        trees.push([x, t]);
    }
    const tree = (cx, ht) => {
        const wid = ht * 0.42, yb = h * 0.92, top = yb - ht;
        const parts = [];
        for (let k = 0; k < 4; k++) {
            const t0 = top + ht * (k * 0.22), t1 = top + ht * (0.34 + k * 0.22), w = wid * (0.42 + k * 0.2);
            parts.push(poly([[cx, t0], [cx + w, t1], [cx - w, t1]], 2));
        }
        return union(...parts, box(cx, yb, 6, ht * 0.18, 2));
    };
    P.s = 1; P.ox = 0; P.oy = 0;
    // Tree by tree, each inside its own box, so a wide tile stays cheap.
    for (const [x, t] of trees) for (const dx of [0, W, -W]) {
        const cx = x + dx, ht = h * 0.84 * t, wid = ht * 0.42;
        if (cx + wid < 0 || cx - wid > W) continue;
        const f = tree(cx, ht), box2 = [cx - wid - 3, h - ht * 1.2 - 8, cx + wid + 3, h];
        P.fill(f, { c: tint[0], c2: tint[1], bb: box2 });
        P.fill((px, py) => Math.max(f(px, py), -f(px + 3, py + 7.5) - 0.2), { c: base, a: 0.85, bb: box2 });
    }
    void bb;
}

/** Painted scenery and fx. Call before game.start(). `sizes` maps tier to display radius. */
export function paintEverything(game, radii, world) {
    const a = game.assets;
    const paintPainter = (name, painter) => a.paint(name, painter.w, painter.h, (p) => painter.blit(p), { smooth: true });
    const E = 1.42;  // a sprite is 2 * E body radii wide, so ears and caps have somewhere to go
    const add = (name, sp, r) => {
        const px = Math.min(330, Math.max(170, Math.ceil(2 * E * r * 2.6))), P = new Painter(px, px, px / (2 * E));
        sp.paint(P);
        paintPainter(name, P);
        const small = P.shrink(84);
        paintPainter(`${name}_s`, small);
        const sil = new Painter(small.w, small.h, small.s, small.ox, small.oy), ink = [0.14, 0.17, 0.39];
        for (let i = 0; i < small.buf.length; i += 4) {
            const al = small.buf[i + 3];
            sil.buf[i] = ink[0] * al; sil.buf[i + 1] = ink[1] * al; sil.buf[i + 2] = ink[2] * al; sil.buf[i + 3] = al;
        }
        paintPainter(`${name}_x`, sil);
    };
    SPECIES.forEach((sp, t) => add(`c${t}`, sp, radii[t]));
    add("snowball", SNOWBALL, 40);
    add("acorn", ACORN, 30);
    a.paint("fx", 72, 72, (p, f) => {
        const P = new Painter(72, 72, 31);
        paintFx(P, f);
        P.blit(p);
    }, { frames: FX_COUNT, smooth: true });

    const { W, H, wall, rim, top } = world, K = 2;
    const pad = wall + 16, aw = W + 2 * pad, ah = H - top + wall + pad + 30;
    world.artW = aw; world.artH = ah; world.artY = top - pad;
    const back = new Painter(aw * K, ah * K, K, pad * K, (pad - top) * K);
    paintTubBack(back, W, H, top, wall, rim);
    paintPainter("tubBack", back);
    const front = new Painter(aw * K, ah * K, K, pad * K, (pad - top) * K);
    paintTubFront(front, W, H, wall, rim, top);
    paintPainter("tubFront", front);

    const logo = new Painter(620, 430, 102);
    paintLogo(logo);
    paintPainter("logo", logo);

    const moon = new Painter(256, 256, 62);
    moon.fill(circ(0, 0, 1.1), { c: "#ffefb8", soft: 0.8, a: 0.3 });
    moon.fill(circ(0, 0, 1), { c: "#fff8dc", c2: "#ffe9ae", bevel: 1, dark: "#e9c98a", light: "#ffffff" });
    moon.fill(union(circ(-0.34, -0.22, 0.2), circ(0.3, 0.3, 0.26), circ(0.32, -0.42, 0.11), circ(-0.2, 0.5, 0.12)), { c: "#ecd6a0", a: 0.6, soft: 0.03 });
    paintPainter("moon", moon);

    const far = new Painter(640, 180, 1);
    paintPines(far, 1, "#7a93c9", ["#3c4f8c", "#4a619f"], 8);
    paintPainter("pinesFar", far);
    const near = new Painter(640, 240, 1);
    paintPines(near, 5, "#c5d8f6", ["#1e2c60", "#2b3a74"], 5);
    paintPainter("pinesNear", near);

    const hill = new Painter(16, 128, 1, 0, 0);
    hill.fill(() => -1, { c: "#f6faff", c2: "#a9bfe8" });
    paintPainter("snowfield", hill);
    const bank = new Painter(640, 60, 1, 0, 0);
    bank.fill((x, y) => 26 + 8 * Math.sin(x / 640 * Math.PI * 4) + 5 * Math.sin(x / 640 * Math.PI * 10 + 1) - y, { c: "#ffffff", c2: "#f0f6ff", line: "#b9cdf0", lw: 1.2, bevel: 9, dark: "#c7d9f5", light: "#ffffff" });
    paintPainter("snowbank", bank);
}
