// A small cartoon rasteriser on top of Pixmap: smooth blobs, ink outlines, cel shadows and clipped detail.
// Pixmap's painter parses a colour per pixel; this one works on bytes, so full stage paintings stay fast.

const cache = new Map();
export function rgba(c) {
    if (Array.isArray(c)) return c;
    let v = cache.get(c);
    if (v) return v;
    const h = c.replace("#", "");
    const full = h.length <= 4 ? h.split("").map((x) => x + x).join("") : h;
    v = [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), full.length > 6 ? parseInt(full.slice(6, 8), 16) / 255 : 1];
    cache.set(c, v);
    return v;
}
export const mixc = (a, b, t) => { const p = rgba(a), q = rgba(b); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t, p[3] + (q[3] - p[3]) * t]; };
export const hex = (c) => { const v = rgba(c).map((x, i) => (i < 3 ? Math.round(x) : Math.round(x * 255))); return `#${v.map((x) => x.toString(16).padStart(2, "0")).join("")}`; };

// --- Paths ---------------------------------------------------------------------------------------
export function ell(cx, cy, rx, ry = rx, rot = 0, n = 64) {
    const c = Math.cos(rot), s = Math.sin(rot), out = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
    return out;
}
/** Closed Catmull-Rom spline through control points. */
export function blob(ctrl, seg = 12) {
    const n = ctrl.length, out = [];
    for (let i = 0; i < n; i++) {
        const p0 = ctrl[(i + n - 1) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
        for (let k = 0; k < seg; k++) {
            const t = k / seg, t2 = t * t, t3 = t2 * t;
            out.push([
                0.5 * (2 * p1[0] + (p2[0] - p0[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (3 * p1[0] - p0[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (p2[1] - p0[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (3 * p1[1] - p0[1] - 3 * p2[1] + p3[1]) * t3),
            ]);
        }
    }
    return out;
}
/** Grow or shrink a closed path along its normals. */
export function grow(pts, d) {
    const n = pts.length, area = pts.reduce((a, p, i) => { const q = pts[(i + 1) % n]; return a + p[0] * q[1] - q[0] * p[1]; }, 0), sign = area > 0 ? 1 : -1;
    return pts.map((p, i) => {
        const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n];
        let nx = b[1] - a[1], ny = a[0] - b[0];
        const l = Math.hypot(nx, ny) || 1;
        return [p[0] + nx / l * d * sign, p[1] + ny / l * d * sign];
    });
}
export const shift = (pts, dx, dy, k = 1) => {
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    return pts.map((p) => [cx + (p[0] - cx) * k + dx, cy + (p[1] - cy) * k + dy]);
};
export const flipX = (pts, w) => pts.map((p) => [w - p[0], p[1]]);

export class Ink {
    /** Wrap the Pixmap for frame f of `frames`. */
    constructor(p, f = 0, frames = 1) {
        this.w = p.width; this.h = p.height; this.d = p.data; this.stride = p.width * frames; this.x0 = f * p.width;
    }

    /** Polygon coverage mask, even-odd, with 4 sub-scanlines and exact horizontal edges. */
    mask(pts) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
        const bx = Math.max(0, Math.floor(x0)), by = Math.max(0, Math.floor(y0)), ex = Math.min(this.w, Math.ceil(x1) + 1), ey = Math.min(this.h, Math.ceil(y1) + 1);
        const w = Math.max(0, ex - bx), h = Math.max(0, ey - by), a = new Float32Array(w * h), sub = 4, n = pts.length, xs = [];
        for (let row = 0; row < h; row++) {
            for (let s = 0; s < sub; s++) {
                const y = by + row + (s + 0.5) / sub;
                xs.length = 0;
                for (let i = 0; i < n; i++) {
                    const p = pts[i], q = pts[(i + 1) % n];
                    if ((p[1] <= y) !== (q[1] <= y)) xs.push(p[0] + (y - p[1]) / (q[1] - p[1]) * (q[0] - p[0]));
                }
                xs.sort((m, k) => m - k);
                for (let i = 0; i + 1 < xs.length; i += 2) {
                    const l = Math.max(xs[i] - bx, 0), r = Math.min(xs[i + 1] - bx, w);
                    if (r <= l) continue;
                    const li = Math.floor(l), ri = Math.min(w - 1, Math.floor(r)), o = row * w;
                    if (li === ri) { a[o + li] += (r - l) / sub; continue; }
                    a[o + li] += (li + 1 - l) / sub;
                    for (let k = li + 1; k < ri; k++) a[o + k] += 1 / sub;
                    a[o + ri] += (r - ri) / sub;
                }
            }
        }
        return { x: bx, y: by, w, h, a };
    }

    /** Coverage of a thick polyline, with widths from w0 to w1 along it. */
    lineMask(pts, w0, w1 = w0) {
        const pad = Math.max(w0, w1) / 2 + 2;
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
        const bx = Math.max(0, Math.floor(x0 - pad)), by = Math.max(0, Math.floor(y0 - pad)), ex = Math.min(this.w, Math.ceil(x1 + pad)), ey = Math.min(this.h, Math.ceil(y1 + pad));
        const w = Math.max(0, ex - bx), h = Math.max(0, ey - by), a = new Float32Array(w * h), segs = pts.length - 1;
        for (let i = 0; i < segs; i++) {
            const [ax, ay] = pts[i], [qx, qy] = pts[i + 1], dx = qx - ax, dy = qy - ay, l2 = dx * dx + dy * dy || 1;
            const ra = (w0 + (w1 - w0) * i / segs) / 2, rb = (w0 + (w1 - w0) * (i + 1) / segs) / 2, m = Math.max(ra, rb) + 1;
            const sx = Math.max(bx, Math.floor(Math.min(ax, qx) - m)), sy = Math.max(by, Math.floor(Math.min(ay, qy) - m)), tx = Math.min(ex, Math.ceil(Math.max(ax, qx) + m)), ty = Math.min(ey, Math.ceil(Math.max(ay, qy) + m));
            for (let y = sy; y < ty; y++) for (let x = sx; x < tx; x++) {
                const px = x + 0.5 - ax, py = y + 0.5 - ay, t = Math.max(0, Math.min(1, (px * dx + py * dy) / l2)), d = Math.hypot(px - t * dx, py - t * dy);
                const c = Math.max(0, Math.min(1, ra + (rb - ra) * t - d + 0.5)), o = (y - by) * w + x - bx;
                if (c > a[o]) a[o] = c;
            }
        }
        return { x: bx, y: by, w, h, a };
    }

    /** Blend a colour or a shader (x, y) => rgba through a mask, optionally inside a clip mask. */
    paint(m, c, clip = null, opacity = 1) {
        const fn = typeof c === "function" ? c : null, solid = fn ? null : rgba(c), d = this.d;
        for (let row = 0; row < m.h; row++) {
            const y = m.y + row;
            for (let i = 0; i < m.w; i++) {
                let a = Math.min(1, m.a[row * m.w + i]);
                if (a <= 0) continue;
                const x = m.x + i;
                if (clip) {
                    const cx = x - clip.x, cy = y - clip.y;
                    if (cx < 0 || cy < 0 || cx >= clip.w || cy >= clip.h) continue;
                    a *= Math.min(1, clip.a[cy * clip.w + cx]);
                    if (a <= 0) continue;
                }
                const col = solid ?? fn(x + 0.5, y + 0.5), o = (y * this.stride + this.x0 + x) * 4;
                a *= col[3] * opacity;
                if (a <= 0) continue;
                const da = d[o + 3] / 255, out = a + da * (1 - a);
                d[o] = (col[0] * a + d[o] * da * (1 - a)) / out;
                d[o + 1] = (col[1] * a + d[o + 1] * da * (1 - a)) / out;
                d[o + 2] = (col[2] * a + d[o + 2] * da * (1 - a)) / out;
                d[o + 3] = out * 255;
            }
        }
        return this;
    }
    fill(pts, c, clip, opacity) { return this.paint(this.mask(pts), c, clip, opacity); }
    stroke(pts, w, c, w1, clip) { return this.paint(this.lineMask(pts, w, w1 ?? w), c, clip); }

    /** Toon-shaded shape: ink outline, gradient fill, cel shadow from the lower right, rim light from the upper left. Returns its mask for detail. */
    toon(pts, o) {
        const m = this.mask(pts);
        if (o.ink !== null) this.fill(grow(pts, o.iw ?? 5), o.ink ?? "#1b1423");
        if (o.top) {
            let y0 = 1e9, y1 = -1e9;
            for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
            this.paint(m, vgrad(y0, y1, o.top, o.fill));
        } else this.paint(m, o.fill);
        if (o.dark) {
            const s = this.mask(shift(pts, -(o.sx ?? 0.07) * m.w, -(o.sy ?? 0.09) * m.h, o.sk ?? 0.98)), sa = new Float32Array(m.w * m.h);
            for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
                const px = x + m.x - s.x, py = y + m.y - s.y, inside = px >= 0 && py >= 0 && px < s.w && py < s.h ? Math.min(1, s.a[py * s.w + px]) : 0;
                sa[y * m.w + x] = (1 - inside);
            }
            this.paint({ ...m, a: sa }, o.dark, m);
        }
        if (o.lite) {
            const s = this.mask(shift(pts, (o.lx ?? 0.04) * m.w, (o.ly ?? 0.05) * m.h, 0.99)), sa = new Float32Array(m.w * m.h);
            for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
                const px = x + m.x - s.x, py = y + m.y - s.y, inside = px >= 0 && py >= 0 && px < s.w && py < s.h ? Math.min(1, s.a[py * s.w + px]) : 0;
                sa[y * m.w + x] = (1 - inside);
            }
            this.paint({ ...m, a: sa }, o.lite, m);
        }
        return m;
    }

    /** Vertical gradient over the whole image, or a rectangle. */
    wash(top, bottom, y0 = 0, y1 = this.h) {
        const a = rgba(top), b = rgba(bottom), d = this.d;
        for (let y = Math.max(0, Math.floor(y0)); y < Math.min(this.h, y1); y++) {
            const t = (y - y0) / (y1 - y0), o0 = (y * this.stride + this.x0) * 4, r = a[0] + (b[0] - a[0]) * t, g = a[1] + (b[1] - a[1]) * t, bl = a[2] + (b[2] - a[2]) * t;
            for (let x = 0; x < this.w; x++) { const o = o0 + x * 4; d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255; }
        }
        return this;
    }

    /** Soft round glow. */
    glow(cx, cy, r, c, power = 2) {
        const col = rgba(c), m = this.mask(ell(cx, cy, r, r, 0, 48));
        return this.paint(m, (x, y) => { const k = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / r); return [col[0], col[1], col[2], col[3] * k ** power]; });
    }
}
export function vgrad(y0, y1, top, bottom) {
    const a = rgba(top), b = rgba(bottom), out = [0, 0, 0, 1];
    return (x, y) => { const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))); out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; out[3] = a[3] + (b[3] - a[3]) * t; return out; };
}
