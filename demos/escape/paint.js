// A small software oil painter. Everything in Last Train Home is laid down here: flat shapes with hand-wobbled edges,
// then a light pass, then thousands of brush dabs that follow the forms. Works the same in Chrome and in Node.
const TILE = 512, MASK = TILE - 1;
let N = null;
function lattice(per, seed) { const a = new Float32Array(per * per); let h = seed | 0; for (let i = 0; i < a.length; i++) { h = Math.imul(h ^ (h >>> 15), 2246822519) + 3266489917 | 0; h = Math.imul(h ^ (h >>> 13), 3266489917); a[i] = ((h ^ (h >>> 16)) >>> 0) / 4294967296; } return a; }
function noiseTile() {
    if (N) return N;
    N = new Float32Array(TILE * TILE);
    let amp = 0.5, tot = 0;
    for (let oct = 0; oct < 6; oct++) {
        const per = 4 << oct, L = lattice(per, 91 + oct * 7), k = per / TILE;
        for (let y = 0; y < TILE; y++) {
            const fy = y * k, y0 = fy | 0, ty = fy - y0, sy = ty * ty * (3 - 2 * ty), y1 = (y0 + 1) % per;
            for (let x = 0; x < TILE; x++) {
                const fx = x * k, x0 = fx | 0, tx = fx - x0, sx = tx * tx * (3 - 2 * tx), x1 = (x0 + 1) % per;
                const a = L[y0 * per + x0], b = L[y0 * per + x1], c = L[y1 * per + x0], d = L[y1 * per + x1];
                N[y * TILE + x] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
            }
        }
        tot += amp; amp *= 0.55;
    }
    let lo = 9, hi = -9;
    for (let i = 0; i < N.length; i++) { N[i] /= tot; if (N[i] < lo) lo = N[i]; if (N[i] > hi) hi = N[i]; }
    for (let i = 0; i < N.length; i++) N[i] = (N[i] - lo) / (hi - lo);
    return N;
}
/** Tiling fbm noise, 0..1, at texture coordinates. */
export const nz = (x, y) => noiseTile()[((y | 0) & MASK) * TILE + ((x | 0) & MASK)];
export const hash = (x, y = 0) => { let h = Math.imul(x * 374761393 + y * 668265263 | 0, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const cache = new Map();
/** '#rrggbb' or [r,g,b] in 0..1, as an array. */
export function rgb(c) {
    if (typeof c !== "string") return c;
    let v = cache.get(c);
    if (!v) { if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; const n = parseInt(c.slice(1), 16); v = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; cache.set(c, v); }
    return v;
}
export const mixc = (a, b, t) => { a = rgb(a); b = rgb(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
export const hex = (c) => "#" + rgb(c).map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0")).join("");
const sm = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export class Canvas {
    /** A painting surface w by h logical units at S pixels each, with logical (ox,oy) at the top-left. */
    constructor(w, h, S = 2, ox = 0, oy = 0) {
        this.lw = w; this.lh = h; this.S = S; this.ox = ox; this.oy = oy;
        this.W = Math.max(1, Math.ceil(w * S)); this.H = Math.max(1, Math.ceil(h * S));
        this.d = new Float32Array(this.W * this.H * 4);          // premultiplied
        this.seed = 17;
        noiseTile();
    }
    /** Fill a polygon of logical points. Options: c, c2 gradient colour, dir 'v'|'h'|[cx,cy,r], m mottle, s streak, sd streak direction, a alpha, wob edge wobble, blend. */
    poly(pts, o = {}) {
        const S = this.S, W = this.W, H = this.H, wob = (o.wob ?? 0.5) * S;
        const px = [], py = [];
        const seed = (this.seed += 37);
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length], ax = (a[0] - this.ox) * S, ay = (a[1] - this.oy) * S, bx = (b[0] - this.ox) * S, by = (b[1] - this.oy) * S;
            const len = Math.hypot(bx - ax, by - ay), n = wob > 0 ? Math.max(1, Math.ceil(len / (11 * S))) : 1;
            for (let j = 0; j < n; j++) {
                const t = j / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
                if (wob > 0) { px.push(x + (N[(((y * 0.5 + seed) | 0) & MASK) * TILE + (((x * 0.5) | 0) & MASK)] - 0.5) * wob * 2.2); py.push(y + (N[(((x * 0.5) | 0) & MASK) * TILE + (((y * 0.5 + seed * 3) | 0) & MASK)] - 0.5) * wob * 2.2); } else { px.push(x); py.push(y); }
            }
        }
        let y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9;
        for (let i = 0; i < py.length; i++) { if (py[i] < y0) y0 = py[i]; if (py[i] > y1) y1 = py[i]; if (px[i] < x0) x0 = px[i]; if (px[i] > x1) x1 = px[i]; }
        const yA = Math.max(0, Math.floor(y0)), yB = Math.min(H - 1, Math.ceil(y1));
        const cov = this._cov ?? (this._cov = new Float32Array(W + 2)), SUB = 4, xs = [];
        const n = px.length, B = this.shade(o, x0, y0, x1, y1);
        for (let y = yA; y <= yB; y++) {
            let lo = W, hi = -1;
            for (let sub = 0; sub < SUB; sub++) {
                const sy = y + (sub + 0.5) / SUB;
                xs.length = 0;
                for (let i = 0, j = n - 1; i < n; j = i++) { if ((py[i] > sy) !== (py[j] > sy)) xs.push(px[i] + (sy - py[i]) / (py[j] - py[i]) * (px[j] - px[i])); }
                xs.sort((a, b) => a - b);
                for (let k = 0; k + 1 < xs.length; k += 2) {
                    let a = xs[k], b = xs[k + 1];
                    if (b <= 0 || a >= W) continue;
                    a = Math.max(0, a); b = Math.min(W, b);
                    const ia = a | 0, ib = b | 0;
                    if (ia < lo) lo = ia; if (ib > hi) hi = ib;
                    if (ia === ib) { cov[ia] += (b - a) / SUB; continue; }
                    cov[ia] += (ia + 1 - a) / SUB;
                    for (let x = ia + 1; x < ib; x++) cov[x] += 1 / SUB;
                    if (ib < W) cov[ib] += (b - ib) / SUB;
                }
            }
            if (hi < 0) continue;
            hi = Math.min(hi, W - 1);
            B(y, lo, hi, cov);
            for (let x = lo; x <= hi + 1 && x < W + 2; x++) cov[x] = 0;
        }
        return this;
    }
    /** Builds the row shader for one shape. */
    shade(o, x0, y0, x1, y1) {
        const d = this.d, W = this.W, S = this.S;
        const c = rgb(o.c ?? "#000000"), c2 = o.c2 ? rgb(o.c2) : c, A = o.a ?? 1, m = o.m ?? 0.08, st = o.s ?? 0.05, blend = o.blend ?? "over";
        const dir = o.dir ?? "v", horiz = dir === "h", radial = Array.isArray(dir), dy = Math.max(1, y1 - y0), dx = Math.max(1, x1 - x0);
        const rcx = radial ? (dir[0] - this.ox) * S : 0, rcy = radial ? (dir[1] - this.oy) * S : 0, rr = radial ? dir[2] * S : 1;
        const sd = o.sd ?? (dy > dx ? "v" : "h"), sx = sd === "h" ? 0.35 : 3.4, sy = sd === "h" ? 3.4 : 0.35, off = this.seed * 13 | 0, mz = 1.1 / Math.sqrt(S), N0 = N;
        return (y, lo, hi, cov) => {
            for (let x = lo; x <= hi; x++) {
                let k = cov[x];
                if (k <= 0) continue;
                if (k > 1) k = 1;
                let t = radial ? Math.min(1, Math.hypot(x - rcx, y - rcy) / rr) : horiz ? (x - x0) / dx : (y - y0) / dy;
                const n1 = N0[(((y * mz + off) | 0) & MASK) * TILE + (((x * mz + off) | 0) & MASK)] - 0.5, n2 = N0[(((y * sy + off) | 0) & MASK) * TILE + (((x * sx) | 0) & MASK)] - 0.5;
                t = t + n1 * 0.14; t = t < 0 ? 0 : t > 1 ? 1 : t;
                const v = 1 + n1 * m * 2 + n2 * st * 2;
                const r = (c[0] + (c2[0] - c[0]) * t) * v, g = (c[1] + (c2[1] - c[1]) * t) * (v + n1 * 0.02), b = (c[2] + (c2[2] - c[2]) * t) * (v - n1 * 0.03);
                const a = k * A, i = (y * W + x) * 4;
                if (blend === "over") { const q = 1 - a; d[i] = d[i] * q + r * a; d[i + 1] = d[i + 1] * q + g * a; d[i + 2] = d[i + 2] * q + b * a; d[i + 3] = d[i + 3] * q + a; }
                else if (blend === "add") { d[i] += r * a; d[i + 1] += g * a; d[i + 2] += b * a; }
                else if (blend === "mul") { d[i] *= 1 + (r - 1) * a; d[i + 1] *= 1 + (g - 1) * a; d[i + 2] *= 1 + (b - 1) * a; }
                else if (blend === "erase") { const q = 1 - a; d[i] *= q; d[i + 1] *= q; d[i + 2] *= q; d[i + 3] *= q; }
            }
        };
    }
    rect(x, y, w, h, o) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o); }
    /** A rectangle with rounded corners. */
    rr(x, y, w, h, r, o) {
        const p = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 5; i++) { const a = a0 + i / 5 * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
        arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
        return this.poly(p, o);
    }
    ell(cx, cy, rx, ry, o = {}, rot = 0) {
        const p = [], n = Math.max(14, Math.min(64, (Math.max(rx, ry) * this.S * 1.2) | 0)), c = Math.cos(rot), s = Math.sin(rot);
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
        return this.poly(p, { wob: 0.3, ...o });
    }
    /** A brush stroke through points: w, or [w0, w1] for a taper. */
    line(pts, w, o = {}) {
        const L = [], R = [], w0 = Array.isArray(w) ? w[0] : w, w1 = Array.isArray(w) ? w[1] : w, n = pts.length;
        for (let i = 0; i < n; i++) {
            const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, t = n > 1 ? i / (n - 1) : 0, r = (w0 + (w1 - w0) * t) / 2;
            L.push([pts[i][0] - dy / l * r, pts[i][1] + dx / l * r]); R.unshift([pts[i][0] + dy / l * r, pts[i][1] - dx / l * r]);
        }
        return this.poly(L.concat(R), { wob: 0.25, ...o });
    }
    /** A soft pool: radial falloff. blend: add (light), over (fog), mul (shadow, c is the darkest tint). */
    pool(cx, cy, rx, ry, c, a = 1, blend = "add") {
        const S = this.S, W = this.W, H = this.H, d = this.d, col = rgb(c), X = (cx - this.ox) * S, Y = (cy - this.oy) * S, RX = rx * S, RY = ry * S;
        const x0 = Math.max(0, Math.floor(X - RX)), x1 = Math.min(W - 1, Math.ceil(X + RX)), y0 = Math.max(0, Math.floor(Y - RY)), y1 = Math.min(H - 1, Math.ceil(Y + RY));
        for (let y = y0; y <= y1; y++) {
            for (let x = x0; x <= x1; x++) {
                const u = (x - X) / RX, v = (y - Y) / RY, r = u * u + v * v;
                if (r >= 1) continue;
                const q = (1 - r) * (1 - r) * a, i = (y * W + x) * 4;
                if (blend === "add") { d[i] += col[0] * q * (d[i + 3] > 0 ? 1 : 0); d[i + 1] += col[1] * q * (d[i + 3] > 0 ? 1 : 0); d[i + 2] += col[2] * q * (d[i + 3] > 0 ? 1 : 0); }
                else if (blend === "mul") { d[i] *= 1 + (col[0] - 1) * q; d[i + 1] *= 1 + (col[1] - 1) * q; d[i + 2] *= 1 + (col[2] - 1) * q; }
                else { const n = 1 - q; d[i] = d[i] * n + col[0] * q; d[i + 1] = d[i + 1] * n + col[1] * q; d[i + 2] = d[i + 2] * n + col[2] * q; d[i + 3] = d[i + 3] * n + q; }
            }
        }
        return this;
    }
    /** Multiply everything by ambient plus lamps [{x,y,r,c,i}]; `ry` squashes pools a little so they sit on the wall. */
    light(ambient, lamps, ry = 0.85) {
        const S = this.S, W = this.W, H = this.H, d = this.d, g = 4, gw = Math.ceil(W / g) + 2, gh = Math.ceil(H / g) + 2, F = new Float32Array(gw * gh * 3), am = rgb(ambient);
        for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
            const lx = gx * g / S + this.ox, ly = gy * g / S + this.oy, j = (gy * gw + gx) * 3;
            let r = am[0], gg = am[1], b = am[2];
            for (const l of lamps) {
                const dx = (lx - l.x) / l.r, dy = (ly - l.y) / (l.r * (l.ry ?? ry)), f = 1 / (1 + (dx * dx + dy * dy) * 2.6), q = Math.max(0, f - 0.12) / 0.88 * (l.i ?? 1), c = rgb(l.c ?? "#ffcf8a");
                r += c[0] * q; gg += c[1] * q; b += c[2] * q;
            }
            F[j] = r; F[j + 1] = gg; F[j + 2] = b;
        }
        for (let y = 0; y < H; y++) {
            const fy = y / g, iy = fy | 0, ty = fy - iy;
            for (let x = 0; x < W; x++) {
                const fx = x / g, ix = fx | 0, tx = fx - ix, i = (y * W + x) * 4;
                if (d[i + 3] <= 0) continue;
                const a = (iy * gw + ix) * 3, b = a + 3, c = a + gw * 3, e = c + 3;
                for (let k = 0; k < 3; k++) { const t = F[a + k], u = F[b + k], v = F[c + k], w = F[e + k]; d[i + k] *= (t + (u - t) * tx) * (1 - ty) + (v + (w - v) * tx) * ty; }
            }
        }
        return this;
    }
    /** Repaints the surface with brush dabs that follow its forms. `size` is the coarse brush in logical units. */
    brush(size = 3.2, o = {}) {
        const S = this.S, W = this.W, H = this.H, src = this.d.slice(), d = this.d;
        // Luminance at quarter size, softened, for the flow field.
        const q = 4, gw = (W >> 2) + 1, gh = (H >> 2) + 1, Lum = new Float32Array(gw * gh);
        for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
            let s = 0, n = 0;
            for (let j = 0; j < q; j += 2) for (let i = 0; i < q; i += 2) { const xx = Math.min(W - 1, x * q + i), yy = Math.min(H - 1, y * q + j), k = (yy * W + xx) * 4; s += src[k] * 0.3 + src[k + 1] * 0.55 + src[k + 2] * 0.15; n++; }
            Lum[y * gw + x] = s / n;
        }
        const pass = (rad, len, step, op, edgeOnly, seed) => {
            const r = rad * S, l = len * S, st = Math.max(2, step * S);
            for (let gy = 0; gy < H; gy += st) for (let gx = 0; gx < W; gx += st) {
                const px = Math.min(W - 1, gx + hash(gx, gy + seed) * st) | 0, py = Math.min(H - 1, gy + hash(gy, gx + seed * 3) * st) | 0, i0 = (py * W + px) * 4;
                const al = src[i0 + 3];
                if (al < 0.5) continue;
                const lx = Math.max(1, Math.min(gw - 2, px >> 2)), ly = Math.max(1, Math.min(gh - 2, py >> 2));
                const dx = Lum[ly * gw + lx + 1] - Lum[ly * gw + lx - 1], dy = Lum[(ly + 1) * gw + lx] - Lum[(ly - 1) * gw + lx], mag = Math.abs(dx) + Math.abs(dy);
                if (edgeOnly && mag < 0.03) continue;
                const ang = (mag > 0.012 ? Math.atan2(dy, dx) + Math.PI / 2 : (o.flow ?? 0.15)) + (nz(px * 0.6, py * 0.6) - 0.5) * 1.5, ca = Math.cos(ang), sa = Math.sin(ang);
                const jit = 1 + (hash(px, py) - 0.5) * (o.jitter ?? 0.16), jit2 = (hash(py, px) - 0.5) * 0.03;
                const cr = Math.max(0, src[i0] / al * jit + jit2 * src[i0]), cg = Math.max(0, src[i0 + 1] / al * jit), cb = Math.max(0, src[i0 + 2] / al * jit - jit2 * src[i0 + 2]);
                const R = Math.ceil(Math.abs(ca) * l + Math.abs(sa) * r) + 1, Q = Math.ceil(Math.abs(sa) * l + Math.abs(ca) * r) + 1, tx = px * 0.7 | 0, ty = py * 0.7 | 0;
                for (let y = Math.max(0, py - Q), ye = Math.min(H - 1, py + Q); y <= ye; y++) for (let x = Math.max(0, px - R), xe = Math.min(W - 1, px + R); x <= xe; x++) {
                    const fx = x - px, fy = y - py, u = (fx * ca + fy * sa) / l, v = (-fx * sa + fy * ca) / r, e = u * u * u * u + v * v;
                    if (e >= 1) continue;
                    const i = (y * W + x) * 4, sa2 = src[i + 3];
                    if (sa2 < 0.5) continue;
                    const bristle = 0.55 + 0.9 * N[(((v * 18 + ty) | 0) & MASK) * TILE + (((u * 2 + tx) | 0) & MASK)], a = Math.min(1, (1 - e) * 2.4) * Math.min(1, bristle) * op, n = 1 - a;
                    d[i] = d[i] * n + cr * a * sa2; d[i + 1] = d[i + 1] * n + cg * a * sa2; d[i + 2] = d[i + 2] * n + cb * a * sa2;
                }
            }
        };
        pass(size, size * 2.6, size * 1.15, 0.72, false, 3);
        pass(size * 0.5, size * 1.5, size * 0.62, 0.8, true, 11);
        if (o.fine !== false) pass(size * 0.26, size * 0.8, size * 0.32, 0.75, true, 23);
        return this;
    }
    /** Canvas weave and a vignette, the last touches. */
    finish(o = {}) {
        const W = this.W, H = this.H, d = this.d, gr = o.grain ?? 0.05, vig = o.vig ?? 0, S = this.S;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4; if (d[i + 3] <= 0) continue;
            const a = N[(((y * 7 / S) | 0) & MASK) * TILE + (((x * 7 / S) | 0) & MASK)], b = N[(((y * 7 / S + 200) | 0) & MASK) * TILE + (((x * 7 / S + 91) | 0) & MASK)];
            let k = 1 + (a - b) * gr * 2;
            if (vig) { const u = x / W - 0.5, v = y / H - 0.5; k *= 1 - vig * sm((u * u + v * v * 1.6) * 2.2); }
            d[i] *= k; d[i + 1] *= k; d[i + 2] *= k;
        }
        return this;
    }
    /** Writes straight-alpha bytes into a Uint8Array of the same size. */
    bytes(out) {
        const d = this.d, n = this.W * this.H * 4;
        for (let i = 0; i < n; i += 4) {
            const a = d[i + 3], k = a > 0.003 ? 255 / a : 0;
            let r = d[i] * k, g = d[i + 1] * k, b = d[i + 2] * k;
            // A soft shoulder so highlights roll off like paint rather than clipping.
            out[i] = r > 255 ? 255 : r < 0 ? 0 : r; out[i + 1] = g > 255 ? 255 : g < 0 ? 0 : g; out[i + 2] = b > 255 ? 255 : b < 0 ? 0 : b; out[i + 3] = (a > 1 ? 1 : a) * 255;
        }
        return out;
    }
}
/** Hands a finished Canvas to Pogo as a sprite. */
export function bake(game, name, c, o = {}) {
    game.assets.free(name);
    game.assets.paint(name, c.W, c.H, (p) => { c.bytes(p.data); }, { smooth: true, mipmaps: o.mipmaps ?? true });
    return name;
}
