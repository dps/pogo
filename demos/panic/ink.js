// The print shop: palette, the sprite kit every microgame paints with, the bubble font, the host, patterns.
export const INK = "#17121f";
export const C = {
    ink: INK, paper: "#fff3da", wht: "#ffffff", pink: "#ff2d87", mag: "#d4126a", cyan: "#12c9e8", teal: "#0a97b8",
    yel: "#ffd60a", gold: "#f5a90a", org: "#ff7a18", red: "#ef2b2d", grn: "#2fd35c", dgrn: "#14944a", pur: "#7a3cff",
    blu: "#2a55ff", navy: "#23206b", skin: "#ffc79e", tan: "#d98c5f", brn: "#94562b", dbrn: "#5c3219", gry: "#b9b6c9", dgry: "#6d6a80", lime: "#b6f03a", lil: "#e3b8ff", sky: "#9fe8ff", rose: "#ffb3d1",
};

/** Thick ink edge plus Ben-Day dots on the shadow side: every sprite in the game comes out of this press. */
export function press(p, o = {}) {
    const W = p.width, H = p.height, lw = Math.round(o.lw ?? 5), base = p.index(0, 0), stride = p.index(0, 1) - base, idx = (x, y) => base + y * stride + x * 4, data = p.data;
    const solid = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) solid[y * W + x] = data[idx(x, y) + 3] > 90 ? 1 : 0;
    if (o.dots !== false) {
        let x0 = W, x1 = 0, y0 = H, y1 = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const cell = o.cell ?? 7, w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0), cos = 0.7071;
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if (!solid[y * W + x]) continue;
            const g = ((x - x0) / w + (y - y0) / h) * 0.5, t = (g - 0.48) / 0.5;
            if (t <= 0) continue;
            const u = (x + y) * cos, v = (x - y) * cos, cu = u - Math.floor(u / cell) * cell - cell / 2, cv = v - Math.floor(v / cell) * cell - cell / 2;
            if (cu * cu + cv * cv < (cell * 0.56 * Math.min(1, t)) ** 2) {
                const i = idx(x, y);
                data[i] *= 0.74; data[i + 1] *= 0.66; data[i + 2] *= 0.8;
            }
        }
    }
    // Round dilation: grow the silhouette by lw, and paint the ring in ink.
    const ring = [];
    for (let dy = -lw; dy <= lw; dy++) for (let dx = -lw; dx <= lw; dx++) if (dx * dx + dy * dy <= lw * lw + 1) ring.push([dx, dy]);
    const out = new Uint8Array(W * H), edge = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid[y * W + x] && (!solid[y * W + x - 1] || !solid[y * W + x + 1] || !solid[(y - 1) * W + x] || !solid[(y + 1) * W + x])) edge.push(x, y);
    for (let i = 0; i < edge.length; i += 2) for (const [dx, dy] of ring) {
        const x = edge[i] + dx, y = edge[i + 1] + dy;
        if (x >= 0 && y >= 0 && x < W && y < H) out[y * W + x] = 1;
    }
    const [ir, ig, ib] = o.inkRGB ?? [23, 18, 31];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!out[y * W + x] || solid[y * W + x]) continue;
        const i = idx(x, y);
        data[i] = ir; data[i + 1] = ig; data[i + 2] = ib; data[i + 3] = 255;
    }
}

// Fast painter. Pixmap's helpers parse the colour for every pixel, which is far too slow to paint on the fly between
// microgames, so the kit writes spans straight into the atlas. Parsed colours are cached.
const rgbaCache = new Map();
function rgba(c) {
    let v = rgbaCache.get(c);
    if (!v) {
        const h = c.slice(1), n = h.length === 3 ? h.replace(/./g, "$&$&") : h;
        v = [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), n.length > 6 ? parseInt(n.slice(6, 8), 16) / 255 : 1];
        rgbaCache.set(c, v);
    }
    return v;
}
/** Direct-to-atlas shapes in pixels. Spans get soft ends; ink edges come later from press(). */
function fast(p) {
    const W = p.width, H = p.height, d = p.data, base = p.index(0, 0), stride = p.index(0, 1) - base;
    const put = (i, r, g, b, a) => {
        if (a >= 0.996) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; return; }
        const a0 = d[i + 3] / 255, out = a + a0 * (1 - a);
        if (out <= 0) return;
        const k0 = (a0 * (1 - a)) / out, k1 = a / out;
        d[i] = d[i] * k0 + r * k1; d[i + 1] = d[i + 1] * k0 + g * k1; d[i + 2] = d[i + 2] * k0 + b * k1; d[i + 3] = out * 255;
    };
    const span = (y, x0, x1, c) => {
        if (y < 0 || y >= H || x1 <= x0) return;
        const [r, g, b, a] = c, row = base + y * stride, s = Math.max(0, Math.ceil(x0)), e = Math.min(W, Math.floor(x1));
        if (s - 1 >= 0 && s - x0 > 0) put(row + (s - 1) * 4, r, g, b, a * (s - x0));
        for (let x = s, i = row + s * 4; x < e; x++, i += 4) put(i, r, g, b, a);
        if (e < W && x1 - e > 0) put(row + e * 4, r, g, b, a * (x1 - e));
    };
    const mix = (c, c2, t) => (c2 ? [c[0] + (c2[0] - c[0]) * t, c[1] + (c2[1] - c[1]) * t, c[2] + (c2[2] - c[2]) * t, c[3] + (c2[3] - c[3]) * t] : c);
    const ellipse = (cx, cy, rx, ry, c, c2) => {
        const a = rgba(c), b = c2 ? rgba(c2) : null, y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
        for (let y = y0; y <= y1; y++) { const q = (y + 0.5 - cy) / ry; if (q * q >= 1) continue; const h = rx * Math.sqrt(1 - q * q); span(y, cx - h, cx + h, mix(a, b, (q + 1) / 2)); }
    };
    const poly = (pts, c) => {
        const a = rgba(c); let y0 = 1e9, y1 = -1e9;
        for (const q of pts) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
        for (let y = Math.floor(y0); y <= y1; y++) {
            const yy = y + 0.5, hits = [];
            for (let i = 0; i < pts.length; i++) { const u = pts[i], v = pts[(i + 1) % pts.length]; if ((u[1] <= yy && v[1] > yy) || (v[1] <= yy && u[1] > yy)) hits.push(u[0] + ((yy - u[1]) / (v[1] - u[1])) * (v[0] - u[0])); }
            hits.sort((m, n) => m - n);
            for (let i = 0; i + 1 < hits.length; i += 2) span(y, hits[i], hits[i + 1], a);
        }
    };
    const line = (x0, y0, x1, y1, c, w) => {
        const r = w / 2, dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * r, ny = (dx / l) * r;
        if (l > 0.01) poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], c);
        ellipse(x0, y0, r, r, c); ellipse(x1, y1, r, r, c);
    };
    const rect = (x, y, w, h, c, c2) => {
        const a = rgba(c), b = c2 ? rgba(c2) : null, y0 = Math.round(y), y1 = Math.round(y + h);
        for (let v = y0; v < y1; v++) span(v, x, x + w, mix(a, b, (v - y0) / Math.max(1, y1 - y0)));
    };
    return { ellipse, poly, line, rect };
}

/** Draw in display units, scaled up k times, so art coordinates match gameplay sizes. Capitals add an ink edge. */
export function kit(p, k, pad = 0) {
    const o = pad, lw = 2 * k, f = fast(p), a = {
        k, p, lw,
        e(x, y, rx, ry, c, c2) { f.ellipse((x + o) * k, (y + o) * k, rx * k, ry * k, c, c2); return a; },
        c(x, y, r, c, c2) { f.ellipse((x + o) * k, (y + o) * k, r * k, r * k, c, c2); return a; },
        l(x0, y0, x1, y1, c, w = 2) { f.line((x0 + o) * k, (y0 + o) * k, (x1 + o) * k, (y1 + o) * k, c, w * k); return a; },
        r(x, y, w, h, c, c2) { f.rect((x + o) * k, (y + o) * k, w * k, h * k, c, c2); return a; },
        p(pts, c) { f.poly(pts.map(([x, y]) => [(x + o) * k, (y + o) * k]), c); return a; },
        rr(x, y, w, h, r, c) {
            r = Math.min(r, w / 2, h / 2);
            a.r(x + r, y, w - r * 2, h, c).r(x, y + r, w, h - r * 2, c);
            a.c(x + r, y + r, r, c).c(x + w - r, y + r, r, c).c(x + r, y + h - r, r, c).c(x + w - r, y + h - r, r, c);
            return a;
        },
        E(x, y, rx, ry, c, c2) { a.e(x, y, rx + 2, ry + 2, INK); return a.e(x, y, rx, ry, c, c2); },
        C(x, y, r, c, c2) { return a.E(x, y, r, r, c, c2); },
        R(x, y, w, h, r, c) { a.rr(x - 2, y - 2, w + 4, h + 4, r + 2, INK); return a.rr(x, y, w, h, r, c); },
        L(x0, y0, x1, y1, c, w = 4) { a.l(x0, y0, x1, y1, INK, w + 4); return a.l(x0, y0, x1, y1, c, w); },
        P(pts, c) {
            pts.forEach(([x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; a.l(x, y, u, v, INK, 4); });
            return a.p(pts, c);
        },
        arc(cx, cy, rx, ry, a0, a1, c, w = 2) {
            const n = Math.ceil(Math.abs(a1 - a0) * 8);
            for (let i = 0; i < n; i++) {
                const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n;
                a.l(cx + Math.cos(t0) * rx, cy + Math.sin(t0) * ry, cx + Math.cos(t1) * rx, cy + Math.sin(t1) * ry, c, w);
            }
            return a;
        },
        smile(x, y, w, h = w / 2, c = INK, lw2 = 2.4) { return a.arc(x, y - h * 0.4, w, h, 0.25, Math.PI - 0.25, c, lw2); },
        frown(x, y, w, h = w / 2, c = INK, lw2 = 2.4) { return a.arc(x, y + h * 0.6, w, h, Math.PI + 0.3, Math.PI * 2 - 0.3, c, lw2); },
        eye(x, y, r, lx = 0, ly = 0, ball = "#fff") {
            a.C(x, y, r, ball);
            a.c(x + lx * r * 0.4, y + ly * r * 0.4, r * 0.55, INK);
            return a.c(x + lx * r * 0.4 - r * 0.2, y + ly * r * 0.4 - r * 0.2, r * 0.2, "#fff");
        },
        shine(x, y, rx, ry = rx * 0.6) { return a.e(x, y, rx, ry, "#ffffffaa"); },
    };
    return a;
}

/** Every sprite is painted with a margin, so ink edges never clip and frames never bleed. */
export const PAD = 5;
/** Paint a game sprite: [w, h, fn(a, frame), { frames, k, lw, dots }]. */
export function paintSprite(assets, name, w, h, fn, o = {}) {
    const k = o.k ?? 2.5, frames = o.frames ?? 1;
    assets.paint(name, Math.ceil((w + PAD * 2) * k), Math.ceil((h + PAD * 2) * k), (p, f) => {
        fn(kit(p, k, PAD), f);
        if (o.press !== false) press(p, { lw: o.lw ?? k * 1.6, dots: o.dots, cell: k * 2.6 });
    }, { smooth: true, frames, mipmaps: true });
}

// ------------------------------------------------------------------ bubble font
// Letters are strokes on a 4x6 grid; thick round strokes make them comic bubble letters.
const S = {
    A: [[[0, 6], [0, 2], [2, 0], [4, 2], [4, 6]], [[0, 4], [4, 4]]], B: [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[0, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
    C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]], D: [[[0, 0], [0, 6], [2, 6], [4, 4], [4, 2], [2, 0], [0, 0]]],
    E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]], F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
    G: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 3], [2, 3]]], H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
    I: [[[1, 0], [3, 0]], [[1, 6], [3, 6]], [[2, 0], [2, 6]]], J: [[[1, 0], [4, 0]], [[3, 0], [3, 5], [2, 6], [1, 6], [0, 5]]],
    K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.4], [4, 6]]], L: [[[0, 0], [0, 6], [4, 6]]], M: [[[0, 6], [0, 0], [2, 3], [4, 0], [4, 6]]], N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
    O: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]]], P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
    Q: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[2.4, 4], [4.2, 6.2]]], R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
    S: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]], T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]], U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
    V: [[[0, 0], [2, 6], [4, 0]]], W: [[[0, 0], [0.8, 6], [2, 2.5], [3.2, 6], [4, 0]]], X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]], Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]], Z: [[[0, 0], [4, 0], [0, 6], [4, 6]]],
    0: [[[1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0]], [[1.6, 3.8], [2.4, 2.2]]], 1: [[[0.6, 1.4], [2, 0], [2, 6]], [[0.8, 6], [3.2, 6]]], 2: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
    3: [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1.6, 3]], [[3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]], 4: [[[3, 6], [3, 0], [0, 4], [4, 4]]], 5: [[[4, 0], [0.4, 0], [0, 3], [3, 3], [4, 4], [4, 5], [3, 6], [1, 6], [0, 5]]],
    6: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]]], 7: [[[0, 0], [4, 0], [1.4, 6]]], 8: [[[1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3], [1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3]]],
    9: [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0], [0, 1], [0, 2], [1, 3], [4, 3]]], "!": [[[2, 0], [2, 3.8]], [[2, 6], [2, 6.01]]], "?": [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [2, 3.4], [2, 4]], [[2, 6], [2, 6.01]]],
    "+": [[[2, 1.4], [2, 4.6]], [[0.4, 3], [3.6, 3]]], "-": [[[0.4, 3], [3.6, 3]]], ".": [[[2, 6], [2, 6.01]]], "'": [[[2, 0], [1.6, 1.8]]], "/": [[[3.6, 0], [0.4, 6]]], "<": [[[3.4, 0.6], [0.6, 3], [3.4, 5.4]]], ">": [[[0.6, 0.6], [3.4, 3], [0.6, 5.4]]], x: [[[0.8, 2], [3.2, 5.4]], [[3.2, 2], [0.8, 5.4]]],
};
const GLYPHS = Object.keys(S);
const CW = 72, CH = 92;

export function paintFont(assets) {
    const K = 2, cw = CW * K, ch = CH * K, W = cw * 8, H = ch * 6;
    assets.paint("font", W, H, (p) => {
        const f = fast(p);
        GLYPHS.forEach((ch2, n) => {
            const ox = (n % 8) * cw, oy = Math.floor(n / 8) * ch, u = 10 * K, sx = 11 * K, sy = 11 * K;
            for (const line of S[ch2]) for (let i = 0; i + 1 < line.length; i++) {
                const [x0, y0] = line[i], [x1, y1] = line[i + 1];
                f.line(ox + sx + x0 * u + (6 - y0) * 1.1 * K, oy + sy + y0 * u, ox + sx + x1 * u + (6 - y1) * 1.1 * K, oy + sy + y1 * u, "#ffffff", 11 * K);
            }
            // Ben-Day dots over the lower half of each letter: printed, not typed.
            for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
                const i = p.index(ox + x, oy + y);
                if (p.data[i + 3] < 120) continue;
                const k = (y / ch - 0.52) / 0.4; if (k <= 0) continue;
                const c = 9, u2 = (x + y) * 0.7071, v = (x - y) * 0.7071, a = u2 - Math.floor(u2 / c) * c - c / 2, b = v - Math.floor(v / c) * c - c / 2;
                if (a * a + b * b < (c * 0.5 * Math.min(1, k)) ** 2) { p.data[i] = 200; p.data[i + 1] = 196; p.data[i + 2] = 210; }
            }
        });
        press(p, { lw: 11, dots: false });
    }, { smooth: true, mipmaps: true });
    assets.grid("font", 8, 6);
}

const SPACE = 0.84;
/** Pixel width of a string in bubble letters at height `size`. */
export const measure = (str, size) => String(str).length * size * SPACE * 0.92;
export const fit = (str, maxW, size) => Math.min(size, maxW / Math.max(1, String(str).length * SPACE * 0.92));

/** Bubble letters, centred on x. `wob` makes the letters jiggle; `pop` (0..1, or a fn of the index) scales each one. */
export function bubble(d, str, x, y, size, o = {}) {
    str = String(str);
    const col = o.color ?? C.wht, adv = size * SPACE * 0.92, w = adv * str.length, t = o.t ?? 0, wob = o.wob ?? 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str[i];
        if (ch === " ") continue;
        let n = GLYPHS.indexOf(ch);
        if (n < 0) n = GLYPHS.indexOf(ch.toUpperCase());
        if (n < 0) continue;
        const k = typeof o.pop === "function" ? o.pop(i, str.length) : o.pop ?? 1;
        if (k <= 0.01) continue;
        const lx = x - w / 2 + adv * (i + 0.5), ly = y + Math.sin(t * 9 + i * 1.3) * wob, rot = (o.rot ?? 0) + Math.sin(t * 7 + i * 2.1) * wob * 0.02;
        const lw = size * (CW / 80) * k, lh = size * (CH / 80) * k, c = typeof o.color === "function" ? o.color(i) : col;
        if (o.shadow !== false) d.sprite("font", { x: lx + size * 0.07, y: ly + size * 0.08, frame: n, width: lw, height: lh, color: o.shadow ?? INK, rot });
        d.sprite("font", { x: lx, y: ly, frame: n, width: lw, height: lh, color: c, rot });
    }
}

// ------------------------------------------------------------------ the host: Barry Bell, a twin-bell alarm clock with a showbiz problem
export const HOST_FACE = { idle: 0, happy: 1, cheer: 2, shock: 3, cry: 4, dizzy: 5, sly: 6, scream: 7 };
export function paintHost(assets) {
    paintSprite(assets, "host", 130, 150, (a, f) => {
        const cx = 65, cy = 72, arms = [0, 0, 1, 1, -1, -1, 0, 1][f];
        // Legs and shoes.
        a.L(50, 112, 46, 136, C.navy, 7).L(80, 112, 84, 136, C.navy, 7);
        a.E(42, 140, 13, 6, INK).e(40, 138, 7, 2, C.gry).E(88, 140, 13, 6, INK).e(86, 138, 7, 2, C.gry);
        // Arms.
        const hand = (x, y) => a.C(x, y, 8, C.wht).l(x - 3, y - 3, x - 2, y + 2, C.gry, 1.4).l(x + 2, y - 3, x + 2, y + 2, C.gry, 1.4);
        if (arms === 1) { a.L(22, 84, 9, 42, C.pink, 6).L(108, 84, 121, 42, C.pink, 6); hand(9, 38); hand(121, 38); }
        else if (arms === -1) { a.L(22, 88, 9, 118, C.pink, 6).L(108, 88, 121, 118, C.pink, 6); hand(9, 122); hand(121, 122); }
        else { a.L(24, 90, 8, 104, C.pink, 6).L(106, 90, 120, 78, C.pink, 6); hand(7, 107); hand(122, 74); }
        // Twin bells and hammer.
        a.L(65, 24, 65, 10, C.gry, 3).C(65, 9, 3.5, C.gry);
        a.E(32, 22, 20, 16, C.cyan, C.teal).shine(26, 15, 8, 4).E(98, 22, 20, 16, C.cyan, C.teal).shine(92, 15, 8, 4);
        // Sparkly jacket under the head.
        a.E(65, 112, 32, 18, C.pink, C.mag);
        // Case and dial.
        a.C(cx, cy, 46, C.red, C.mag);
        a.c(cx, cy, 39, C.paper);
        for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; a.l(cx + Math.cos(t) * 34, cy + Math.sin(t) * 34, cx + Math.cos(t) * 37.5, cy + Math.sin(t) * 37.5, INK, i % 3 ? 1.4 : 3); }
        // Pompadour of clock hands.
        a.P([[46, 41], [60, 28], [86, 30], [90, 42], [72, 38], [52, 46]], C.navy);
        a.e(70, 33, 12, 2.4, "#ffffff77");
        const ex = 20, ey = 66;
        const brow = (lx, ly, rx, ry) => a.l(cx - ex - 8, ey - 16 + ly, cx - ex + 8, ey - 16 + lx, INK, 3.4).l(cx + ex - 8, ey - 16 + rx, cx + ex + 8, ey - 16 + ry, INK, 3.4);
        if (f === 0) { a.eye(cx - 15, ey, 10, 0.5, 0).eye(cx + 15, ey, 10, 0.5, 0); a.smile(cx, 86, 15, 8); }
        if (f === 1) { a.arc(cx - 15, ey + 2, 9, 9, Math.PI, Math.PI * 2, INK, 3.4).arc(cx + 15, ey + 2, 9, 9, Math.PI, Math.PI * 2, INK, 3.4); a.e(cx, 88, 16, 13, INK).e(cx, 94, 9, 5, C.pink).r(cx - 11, 77, 22, 4, C.wht); }
        if (f === 2) { a.eye(cx - 15, ey - 2, 11, 0, -0.5).eye(cx + 15, ey - 2, 11, 0, -0.5); brow(-3, 3, 3, -3); a.e(cx, 90, 19, 15, INK).e(cx, 97, 11, 6, C.pink).r(cx - 13, 77, 26, 5, C.wht); }
        if (f === 3) { a.eye(cx - 15, ey, 12, 0, 0).eye(cx + 15, ey, 12, 0, 0); brow(0, -2, -2, 0); a.C(cx, 92, 8, INK); }
        if (f === 4) { a.c(cx - 15, ey, 8, INK).c(cx + 15, ey, 8, INK).c(cx - 18, ey - 3, 3, C.wht).c(cx + 12, ey - 3, 3, C.wht); brow(-2, 4, 4, -2); a.frown(cx, 94, 14, 10); a.E(cx - 26, ey + 14, 4, 9, C.cyan).E(cx + 26, ey + 14, 4, 9, C.cyan); }
        if (f === 5) { for (const s of [-15, 15]) { a.l(cx + s - 7, ey - 7, cx + s + 7, ey + 7, INK, 3.6).l(cx + s - 7, ey + 7, cx + s + 7, ey - 7, INK, 3.6); } a.e(cx, 92, 12, 6, INK).e(cx + 7, 97, 6, 7, C.pink); }
        if (f === 6) { a.eye(cx - 15, ey, 10, 1, 0.2); a.l(cx + 7, ey, cx + 23, ey - 2, INK, 3.6); brow(-1, 1, -3, 1); a.arc(cx + 2, 80, 16, 10, 0.1, 2.3, INK, 2.8); }
        if (f === 7) { a.eye(cx - 16, ey - 2, 11, 0.4, 0.4).eye(cx + 16, ey - 2, 7, -0.4, 0.4); a.e(cx, 92, 15, 16, INK).r(cx - 12, 80, 24, 3, C.wht); a.e(cx, 100, 8, 5, C.pink); }
        // Bow tie.
        a.P([[65, 118], [47, 110], [47, 127]], C.yel).P([[65, 118], [83, 110], [83, 127]], C.yel).C(65, 118, 4, C.gold);
    }, { frames: 8, k: 2.4, lw: 4 });
    // Lives are little bells; a lost one is cracked and grey.
    paintSprite(assets, "bell", 40, 40, (a, f) => {
        const c = f ? C.dgry : C.yel, c2 = f ? "#44415a" : C.gold;
        a.C(20, 7, 3.5, c).P([[20, 6], [30, 14], [32, 28], [36, 31], [4, 31], [8, 28], [10, 14]], c).e(20, 16, 10, 10, c, c2).C(20, 33, 4, C.org);
        a.e(15, 14, 3, 5, "#ffffffaa");
        if (f) a.l(18, 8, 24, 16, INK, 2).l(24, 16, 17, 22, INK, 2).l(17, 22, 24, 30, INK, 2);
    }, { frames: 2, k: 2 });
    paintSprite(assets, "fx", 40, 40, (a, f) => {
        const star = (R, r, n) => { const o = []; for (let i = 0; i < n * 2; i++) { const t = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R; o.push([20 + Math.cos(t) * q, 20 + Math.sin(t) * q]); } return o; };
        if (f === 0) a.p(star(17, 7, 5), C.wht);
        if (f === 1) { a.c(13, 15, 8, C.wht).c(27, 15, 8, C.wht).p([[5, 18], [35, 18], [20, 35]], C.wht); }
        if (f === 2) { a.c(20, 25, 10, C.wht).p([[20, 3], [29, 21], [11, 21]], C.wht); }
        if (f === 3) a.c(20, 20, 13, C.wht);
        if (f === 4) a.p(star(18, 8, 10), C.wht);
        if (f === 5) a.p([[6, 12], [24, 5], [34, 26], [15, 34]], C.wht);
    }, { frames: 6, k: 1.6, lw: 3, dots: false });
    paintSprite(assets, "hand", 60, 70, (a, f) => {
        a.R(21, 6, 13, 40, 6, C.wht).R(34, 24, 11, 26, 5, C.wht).R(45, 28, 9, 22, 4, C.wht).R(11, 30, 10, 22, 4, C.wht);
        a.E(33, 52, 21, 15, C.wht).R(18, 58, 30, 9, 3, f ? C.yel : C.pink);
    }, { frames: 2, k: 1.8, lw: 3.5, dots: false });
}

// ------------------------------------------------------------------ wallpaper
export const PATTERNS = ["rays", "dots", "stripes", "check", "zig", "wave", "rings", "tri", "plus", "scale"];
const N = 512, TAU = Math.PI * 2;
const TESTS = {
    rays: (x, y) => { const a = Math.atan2(y - 256, x - 256); return Math.abs(((a / TAU * 16) % 1 + 1) % 1 - 0.5) < 0.25; },
    dots: (x, y) => { const c = 44, u = (x + y) * 0.7071, v = (x - y) * 0.7071, cu = u - Math.floor(u / c) * c - c / 2, cv = v - Math.floor(v / c) * c - c / 2; return cu * cu + cv * cv < (7 + 12 * y / 512) ** 2; },
    stripes: (x, y) => ((x + y) % 96 + 96) % 96 < 48,
    check: (x, y) => (Math.floor(x / 64) + Math.floor(y / 64)) % 2 === 0,
    zig: (x, y) => { const m = Math.abs((x % 96) - 48); return ((y + m) % 96) < 40; },
    wave: (x, y) => ((y + Math.sin(x / 512 * TAU * 3) * 24) % 80 + 80) % 80 < 36,
    rings: (x, y) => Math.hypot(x - 256, y - 256) % 72 < 34,
    tri: (x, y) => { const c = 64, u = x % c, v = y % c; return (Math.floor(y / c) % 2 ? u < v : u + v < c); },
    plus: (x, y) => { const c = 64, u = (x + (Math.floor(y / c) % 2) * 32) % c - 32, v = y % c - 32; return Math.abs(u) < 7 && Math.abs(v) < 20 || Math.abs(v) < 7 && Math.abs(u) < 20; },
    scale: (x, y) => { const c = 64, row = Math.floor(y / 32), u = (x + (row % 2) * 32) % c - 32, v = y % 32; const r = Math.hypot(u, v); return r > 18 && r < 32; },
};
const donePat = new Set();
/** Wallpaper is painted the first time it is needed, each one with soft edges so it holds up at phone resolution. */
export function ensurePat(assets, name) {
    if (donePat.has(name)) return;
    donePat.add(name);
    const test = TESTS[name];
    assets.paint("pat_" + name, N, N, (p) => {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const c = test(x + 0.25, y + 0.25) + test(x + 0.75, y + 0.25) + test(x + 0.25, y + 0.75) + test(x + 0.75, y + 0.75);
            if (c) { const i = p.index(x, y); p.data[i] = p.data[i + 1] = p.data[i + 2] = 255; p.data[i + 3] = c * 63.75; }
        }
    }, { smooth: true });
}
