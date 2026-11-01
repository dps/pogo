// Everything you see is painted here, per pixel, at load. The look: a gouache storybook with chunky ink
// outlines and warm light from the top left. Blocks share strips so a whole castle is a handful of draw calls.

export const PX = 64;         // texture pixels per metre
export const PAD = 4;

const INK = [38, 24, 28];
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

function hash(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return mix(mix(hash(xi, yi), hash(xi + 1, yi), u), mix(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
}
function fbm(x, y, n = 3) { let s = 0, a = 0.5; for (let i = 0; i < n; i++) { s += a * noise(x, y); x *= 2.03; y *= 2.03; a *= 0.5; } return s / (1 - 0.5 ** n); }

/** fbm that wraps every W pixels, for layers that tile. */
function wrapFbm(x, y, W, scale, n = 3) {
    const k = x / W, a0 = fbm(x * scale, y * scale, n), b0 = fbm((x - W) * scale, y * scale, n);
    return a0 + (b0 - a0) * k;
}

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = Math.imul(s, 1664525) + 1013904223 >>> 0; return s / 4294967296; }; }

/** Fill a frame by calling fn(x, y) => [r,g,b,a] (0-255). */
function shader(p, fn) {
    const w = p.width, h = p.height, d = p.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = fn(x, y);
        if (!c) continue;
        const o = p.index(x, y);
        d[o] = clamp(c[0], 0, 255); d[o + 1] = clamp(c[1], 0, 255); d[o + 2] = clamp(c[2], 0, 255); d[o + 3] = c.length > 3 ? clamp(c[3], 0, 255) : 255;
    }
}

function drawPoly(mask, w, h, pts) {
    let ymin = 1e9, ymax = -1e9;
    for (const q of pts) { ymin = Math.min(ymin, q[1]); ymax = Math.max(ymax, q[1]); }
    for (let y = Math.max(0, Math.floor(ymin)); y <= Math.min(h - 1, Math.ceil(ymax)); y++) {
        const hits = [], yy = y + 0.5;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) hits.push(a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        hits.sort((u, v) => u - v);
        for (let i = 0; i + 1 < hits.length; i += 2) for (let x = Math.max(0, Math.round(hits[i])); x < Math.min(w, Math.round(hits[i + 1])); x++) mask[y * w + x] = 1;
    }
}

/** Jagged crack polylines for a rectangle. Returns a distance-ish mask. */
function crackMask(w, h, seed, n, wide, mode) {
    const mask = new Float32Array(w * h), r = rng(seed);
    const stamp = (x, y, rad) => {
        for (let j = Math.floor(y - rad - 1); j <= y + rad + 1; j++) for (let i = Math.floor(x - rad - 1); i <= x + rad + 1; i++) {
            if (i < 0 || j < 0 || i >= w || j >= h) continue;
            const d = Math.hypot(i + 0.5 - x, j + 0.5 - y), v = clamp(rad + 0.5 - d);
            if (v > mask[j * w + i]) mask[j * w + i] = v;
        }
    };
    const walk = (x, y, a, len, rad) => {
        for (let t = 0; t < len; t++) {
            stamp(x, y, rad * (1 - 0.6 * t / len));
            x += Math.cos(a); y += Math.sin(a);
            a += (r() - 0.5) * (t % 7 === 0 ? 1.5 : 0.25);
            if (mode === "grain") a = a * 0.9;
            if (t > 6 && r() < 0.03) walk(x, y, a + (r() < 0.5 ? 1 : -1) * (0.6 + r()), len * 0.4, rad * 0.7);
        }
    };
    for (let i = 0; i < n; i++) {
        if (mode === "star") {
            const cx = w * (0.25 + r() * 0.5), cy = h * (0.25 + r() * 0.5);
            for (let k = 0; k < 7; k++) walk(cx, cy, k * 0.9 + r(), Math.max(w, h) * (0.3 + r() * 0.4), wide);
        } else if (mode === "grain") {
            walk(r() < 0.5 ? 0 : w - 1, h * (0.15 + r() * 0.7), r() < 0.5 ? (r() - 0.5) * 0.3 : Math.PI + (r() - 0.5) * 0.3, w * (0.4 + r() * 0.4), wide);
        } else {
            const side = Math.floor(r() * 4), x = side === 0 ? 0 : side === 1 ? w - 1 : r() * w, y = side === 2 ? 0 : side === 3 ? h - 1 : r() * h;
            walk(x, y, Math.atan2(h / 2 - y, w / 2 - x) + (r() - 0.5), Math.hypot(w, h) * (0.5 + r() * 0.4), wide);
        }
    }
    return mask;
}

function chips(w, h, seed, n, size) {   // bites out of the edges
    const r = rng(seed), list = [];
    for (let i = 0; i < n; i++) {
        const side = Math.floor(r() * 4);
        list.push({ x: side === 0 ? 0 : side === 1 ? w : r() * w, y: side === 2 ? 0 : side === 3 ? h : r() * h, r: size * (0.5 + r()) });
    }
    return (x, y) => { for (const c of list) { const dx = x - c.x, dy = y - c.y; if (Math.abs(dx) + Math.abs(dy) * 1.2 < c.r) return true; } return false; };
}

// --- Material surfaces: return [r,g,b] (or with alpha) at a body pixel. `e` is distance to the edge in px.
function woodSurface(w, h, seed) {
    const planks = Math.max(1, Math.round(h / 22)), ph = h / planks;
    const tints = []; const r = rng(seed); for (let i = 0; i < planks + 1; i++) tints.push(0.85 + r() * 0.3);
    return (x, y) => {
        const row = Math.min(planks - 1, Math.floor(y / ph)), v = y - row * ph;
        const g = fbm(x * 0.018 + seed, (y + row * 40) * 0.2, 3), lines = Math.sin((y + row * 13) * 0.75 + g * 11 + Math.sin(x * 0.03 + row) * 1.2);
        let k = (0.62 + 0.18 * g + 0.11 * lines) * tints[row];
        const seam = row < planks ? Math.min(v, ph - v) : 9;
        if (planks > 1 && seam < 1.6) k *= 0.5;
        else if (planks > 1 && v < 3) k *= 1.1;
        const knot = Math.hypot((x - (seed * 37 % w)) * 0.8, (y - h * 0.5) * 1.5);
        if (knot < 9) k *= 0.72 + knot * 0.03;
        const c = mix3([112, 62, 32], [233, 170, 92], clamp(k));
        return c;
    };
}
function stoneSurface(w, h, seed, course) {
    // Dressed stone: one or several ashlars, each with its own bevel.
    const nx = Math.max(1, Math.round(w / course)), ny = Math.max(1, Math.round(h / course)), sx = w / nx, sy = h / ny;
    const r = rng(seed), tints = []; for (let i = 0; i < nx * ny; i++) tints.push(0.84 + r() * 0.2);
    return (x, y) => {
        const i = Math.min(nx - 1, Math.floor(x / sx)), j = Math.min(ny - 1, Math.floor(y / sy)), u = x - i * sx, v = y - j * sy;
        const e = Math.min(u, v, sx - u, sy - v), n = fbm((x + seed * 9) * 0.05, y * 0.05, 3), fine = fbm(x * 0.3, y * 0.3 + seed, 2);
        let k = (0.68 + 0.26 * n + 0.1 * (fine - 0.5)) * tints[j * nx + i];
        if ((nx > 1 || ny > 1) && e < 2) return mix3([66, 58, 66], [120, 108, 110], fine);
        if (u < 5 || v < 5) k += 0.1 * (1 - Math.min(u, v) / 5);
        if (sx - u < 5 || sy - v < 5) k -= 0.14 * (1 - Math.min(sx - u, sy - v) / 5);
        return mix3([104, 98, 112], [226, 220, 214], clamp(k));
    };
}
function glassSurface(w, h, seed) {
    return (x, y, e) => {
        const streak = Math.sin((x + y) * 0.06 + seed), s2 = smooth(0.82, 0.96, streak), n = fbm(x * 0.03 + seed, y * 0.03, 2);
        const base = mix3([120, 205, 245], [214, 248, 255], n * 0.7 + (1 - y / h) * 0.3);
        const a = 150 + s2 * 80 + (e < 6 ? (6 - e) * 12 : 0);
        return [mix(base[0], 255, s2 * 0.8), mix(base[1], 255, s2 * 0.8), mix(base[2], 255, s2 * 0.8), a];
    };
}

function blockFrame(p, f, cw, ch, surf, cfg) {
    const w = cw - PAD * 2, h = ch - PAD * 2, rad = cfg.rad ?? 5, bite = cfg.bite, mask = cfg.mask, crackColor = cfg.crack ?? INK;
    shader(p, (px, py) => {
        const x = px - PAD, y = py - PAD;
        const qx = Math.max(rad - x - 0.5, x + 0.5 - (w - rad), 0), qy = Math.max(rad - y - 0.5, y + 0.5 - (h - rad), 0);
        let e = rad - Math.hypot(qx, qy);        // distance inside the rounded box, >0 inside
        if (e < -1) return null;
        if (bite && bite(x, y)) return null;
        if (bite) { let near = false; for (const [a, b] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) if (bite(x + a, y + b)) near = true; if (near) e = Math.min(e, 1.5); }
        const cover = clamp(e + 0.5);
        if (e < 3) return [INK[0], INK[1], INK[2], 255 * cover];
        const c = surf(x, y, e).slice();
        const top = clamp(1 - (y - 3) / 5), left = clamp(1 - (x - 3) / 5), bot = clamp(1 - (h - y - 3) / 7), right = clamp(1 - (w - x - 3) / 7);
        const lift = 0.3 * Math.max(top, left), drop = 0.34 * Math.max(bot, right);
        c[0] = mix(c[0], 255, lift); c[1] = mix(c[1], 244, lift); c[2] = mix(c[2], 214, lift);
        c[0] *= 1 - drop; c[1] *= 1 - drop * 1.1; c[2] *= 1 - drop * 0.9;
        if (mask) {
            const m = mask[Math.round(py) * cw + Math.round(px)] ?? 0;
            if (m > 0) { c[0] = mix(c[0], crackColor[0], m); c[1] = mix(c[1], crackColor[1], m); c[2] = mix(c[2], crackColor[2], m); if (c.length > 3) c[3] = Math.max(c[3], 230 * m); }
        }
        return c;
    });
}

const strapped = (surf, w, h) => (x, y, e) => {        // iron straps on wood
    const c = surf(x, y, e);
    const near = Math.min(Math.abs(x - 15), Math.abs(x - (w - 15)));
    if (w > 70 && near < 6) { const k = 0.5 + 0.5 * clamp(1 - near / 6) + (near > 4 ? -0.3 : 0); const n = 74 * k + 40; const rivet = Math.hypot(near, ((y + 3) % 16) - 8) < 2.4; return rivet ? [196, 190, 182] : [n, n * 0.96, n * 0.98]; }
    return c;
};

function paintBlocks(assets) {
    const sizes = { h1: [2, 1], w: [3, 1], l: [4, 0.5], p: [2, 0.5] };
    const strip = (name, mw, mh, seedBase) => {
        const cw = mw * PX + PAD * 2, ch = mh * PX + PAD * 2, w = mw * PX, h = mh * PX;
        const course = 58;
        const frames = [];
        for (const [mat, surf] of [
            ["wood", strapped(woodSurface(w, h, seedBase + 1), w, h)],
            ["stone", stoneSurface(w, h, seedBase + 2, course)],
            ["glass", glassSurface(w, h, seedBase + 3)],
        ]) for (let st = 0; st < 3; st++) {
            const mode = mat === "glass" ? "star" : mat === "wood" ? "grain" : "line";
            const mask = st ? crackMask(cw, ch, seedBase * 7 + st * 13 + mat.length, st === 1 ? 1 : 3, mat === "glass" ? 0.9 : 1.5, mode) : null;
            const bite = st ? chips(w, h, seedBase + st, st === 1 ? 3 : 8, mat === "glass" ? 8 : 11) : null;
            frames.push({ surf, mask, bite, crack: mat === "glass" ? [255, 255, 255] : INK, rad: mat === "glass" ? 3 : mat === "stone" ? 6 : 4 });
        }
        return { cw, ch, frames };
    };
    const put = (name, s, extra = []) => {
        const list = [...s.frames, ...extra];
        assets.paint(name, s.cw, s.ch, (p, f) => {
            const fr = list[f];
            if (fr.fn) fr.fn(p, s.cw, s.ch);
            else blockFrame(p, f, s.cw, s.ch, fr.surf, fr);
        }, { frames: list.length, smooth: true, mipmaps: true });
    };
    const tnt = (lit) => ({
        fn: (p, cw, ch) => {
            const w = cw - PAD * 2, h = ch - PAD * 2, wood = woodSurface(w, h, 44);
            const letters = new Uint8Array(cw * ch);
            const glyph = (ox, oy, s, shape) => { for (const q of shape) drawPoly(letters, cw, ch, q.map(([a, b]) => [ox + a * s, oy + b * s])); };
            const T = [[[0, 0], [10, 0], [10, 2.6], [6.4, 2.6], [6.4, 12], [3.6, 12], [3.6, 2.6], [0, 2.6]]];
            const N = [[[0, 0], [2.8, 0], [2.8, 12], [0, 12]], [[7.2, 0], [10, 0], [10, 12], [7.2, 12]], [[2.8, 0], [5.4, 0], [7.2, 12], [4.6, 12]]];
            const s = 1.42, ox = PAD + 7, oy = PAD + 22;
            glyph(ox, oy, s, T); glyph(ox + 12 * s * 0.92, oy, s, N); glyph(ox + 24 * s * 0.92, oy, s, T);
            blockFrame(p, 0, cw, ch, (x, y) => {
                const band = y > 16 && y < 48, base = wood(x, y);
                if (band) {
                    const g = 0.86 + 0.14 * noise(x * 0.1, y * 0.1);
                    const c = lit ? [255, 236 * g, 110 * g] : [226 * g, 44 * g, 40 * g];
                    if (y < 18 || y > 46) return [248, 206, 90];
                    return letters[(y + PAD) * cw + (x + PAD)] ? (lit ? [120, 20, 20] : [255, 232, 170]) : c;
                }
                return [base[0] * 0.8, base[1] * 0.6, base[2] * 0.5];
            }, { rad: 4 });
        },
    });
    const gold = {
        fn: (p, cw, ch) => {
            const w = cw - PAD * 2, h = ch - PAD * 2, wood = woodSurface(w, h, 71);
            blockFrame(p, 0, cw, ch, (x, y) => {
                const lid = y < 24, strap = Math.abs(x - 28) < 5, rim = Math.abs(y - 24) < 3 || x < 7 || x > 49 || y < 6 || y > 50;
                if (Math.hypot(x - 28, y - 27) < 7) return Math.hypot(x - 28, y - 25) < 2.2 ? INK : [255, 226, 110];
                if (rim || strap) { const n = fbm(x * 0.1, y * 0.1, 2); return mix3([214, 150, 40], [255, 224, 120], n); }
                const c = wood(x, y);
                return lid ? [c[0] * 0.8, c[1] * 0.42, c[2] * 0.42] : [c[0] * 0.66, c[1] * 0.36, c[2] * 0.38];
            }, { rad: 5 });
        },
    };
    put("b11", strip("b11", 1, 1, 11), [tnt(false), tnt(true), gold]);
    put("b21", strip("b21", 2, 1, 21));
    put("b31", strip("b31", 3, 1, 31));
    put("b405", strip("b405", 4, 0.5, 41));
    put("b205", strip("b205", 2, 0.5, 51));
    put("b105", strip("b105", 1, 0.5, 61));

    // Roofs: a pointed shingle cone on the same box footprint, rising 1.6 m above it.
    for (const [name, mw, H, rs] of [["roof2", 2, 2.2, 5], ["roof3", 3, 2.8, 9]]) {
        const cw = mw * PX + 24, ch = H * PX + PAD * 2;
        assets.paint(name, cw, ch, (p, f) => {
            const cx = cw / 2, top = PAD, bot = ch - PAD - 8, hw = mw * PX / 2 + 8;
            const bite = f ? chips(cw, ch, 3 + rs, f * 5, 14) : null, mask = f ? crackMask(cw, ch, 8 + rs + f, f, 1.6, "line") : null;
            shader(p, (x, y) => {
                if (bite && bite(x, y)) return null;
                const t = (y - top) / (bot - top), half = t * hw + 2.5;
                const inCone = y >= top && y <= bot && Math.abs(x - cx) <= half, lip = y > bot - 1 && y <= bot + 9 && Math.abs(x - cx) < hw - 2;
                const e = inCone ? Math.min(half - Math.abs(x - cx), (bot - y) + 30) : -9;
                if (lip) return y > bot + 6 || Math.abs(x - cx) > hw - 5 ? INK : [150, 98, 56];
                if (!inCone) return null;
                if (e < 3.4) return [...INK, 255 * clamp(e + 0.5)];
                const row = Math.floor(y / 13), off = row % 2 ? 11 : 0, sh = (x + off) % 22, v = (y % 13) / 13;
                const n = fbm(x * 0.04, y * 0.04, 2), side = (x - cx) / Math.max(4, half), light = 0.72 - side * 0.33 + (n - 0.5) * 0.3;
                let c = mix3([104, 28, 40], [244, 92, 72], clamp(light - 0.18 * v));
                if (v > 0.84 || sh < 1.6) c = [c[0] * 0.56, c[1] * 0.5, c[2] * 0.56];
                const m = mask ? mask[Math.round(y) * cw + Math.round(x)] : 0;
                return m ? mix3(c, INK, m) : c;
            });
        }, { frames: 3, smooth: true, mipmaps: true });
    }

    // Broken pieces: jagged chunks in each material, with three shapes each.
    const cell = 72;
    assets.paint("frag", cell, cell, (p, f) => {
        const mat = Math.floor(f / 3), r = rng(f * 11 + 5), n = 7 + Math.floor(r() * 3), pts = [];
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = (0.74 + r() * 0.36) * (cell / 2 - 3), k = Math.SQRT2; const ca = Math.cos(a), sa = Math.sin(a), m = Math.max(Math.abs(ca), Math.abs(sa)); pts.push([cell / 2 + ca / m * rr * (mat === 0 ? 1 : 0.98) * (0.9), cell / 2 + sa / m * rr * (mat === 0 ? 0.92 : 0.96)]); void k; }
        const mask = new Uint8Array(cell * cell);
        drawPoly(mask, cell, cell, pts);
        const surf = mat === 0 ? woodSurface(cell, cell, f + 3) : mat === 1 ? stoneSurface(cell, cell, f + 8, 200) : glassSurface(cell, cell, f);
        shader(p, (x, y) => {
            if (!mask[y * cell + x]) return null;
            let e = 9;
            for (let d = 1; d <= 3; d++) for (const [a, b] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const i = x + a, j = y + b; if (i < 0 || j < 0 || i >= cell || j >= cell || !mask[j * cell + i]) e = Math.min(e, d); }
            if (e <= 3 && mat !== 2) return INK;
            if (e <= 2) return [230, 250, 255, 240];
            const c = surf(x, y, e), lit = 1 + (0.5 - (x + y) / (cell * 2)) * 0.5;
            return c.length > 3 ? c : [c[0] * lit, c[1] * lit, c[2] * lit];
        });
    }, { frames: 9, smooth: true, mipmaps: true });
}

/** Round, ribbed gourd body. Writes into a Pixmap at (cx,cy). */
function gourd(p, cx, cy, rx, ry, c0, c1, c2, f, shift = 0) {
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry, d = Math.hypot(u, v);
        const edge = (1 - d) * Math.min(rx, ry);
        if (edge < -1) return null;
        const o = p.index(x, y);
        if (edge < 3.2) return [...INK, Math.max(p.data[o + 3], 255 * clamp(edge + 1))];
        const ribs = Math.cos(Math.asin(clamp(u / Math.sqrt(Math.max(0.05, 1 - v * v)), -1, 1)) * 5.2 + shift);
        const light = 0.56 + 0.3 * ribs - u * 0.2 - v * 0.34;
        const c = light < 0.5 ? mix3(c2, c0, clamp(light * 2)) : mix3(c0, c1, clamp((light - 0.5) * 2));
        return c;
    });
}

function bodyParts(p, cx, cy, r, mood, skin = 1) {
    // Eyes are white here; pupils are drawn live so they can watch the boulder.
    const ex = r * 0.36, ey = cy - r * 0.2;
    if (mood === 3) {                    // squeezed shut
        for (const s of [-1, 1]) { p.line(cx + s * ex - r * 0.16, ey - r * 0.1, cx + s * ex + r * 0.16, ey + r * 0.03 * (s > 0 ? 1 : 1), "#26181c", r * 0.09); p.line(cx + s * ex - r * 0.16, ey + r * 0.12, cx + s * ex + r * 0.16, ey + r * 0.03, "#26181c", r * 0.09); }
    } else {
        const big = mood === 2 ? 1.28 : 1;
        for (const s of [-1, 1]) {
            p.ellipse(cx + s * ex, ey, r * 0.27 * big, r * (mood === 1 ? 0.05 : 0.31) * big, "#26181c");
            if (mood !== 1) p.ellipse(cx + s * ex, ey, r * 0.21 * big, r * 0.25 * big, "#fffdf2");
        }
    }
    if (mood === 2) { p.ellipse(cx, cy + r * 0.48, r * 0.17, r * 0.22, "#26181c"); p.ellipse(cx, cy + r * 0.55, r * 0.1, r * 0.09, "#d4503c"); }
    else if (mood === 3) { p.ellipse(cx, cy + r * 0.46, r * 0.26, r * 0.16, "#26181c"); }
    else { // Fine moustache, curled up at the ends.
        const my = cy + r * 0.3;
        for (const s of [-1, 1]) {
            p.line(cx, my, cx + s * r * 0.26, my + r * 0.08, "#3a2318", r * 0.12);
            p.line(cx + s * r * 0.26, my + r * 0.08, cx + s * r * 0.48, my - r * 0.08, "#3a2318", r * 0.09);
            p.circle(cx + s * r * 0.5, my - r * 0.12, r * 0.05, "#3a2318");
        }
    }
}

function paintFolk(assets) {
    const ORANGE = [[234, 124, 34], [255, 196, 84], [150, 54, 24]];
    const S = 128;
    assets.paint("folk", S, S, (p, f) => {
        const type = Math.floor(f / 4), mood = f % 4, cx = S / 2, cy = S / 2 + 7, r = 46;
        // Stubby legs.
        for (const s of [-1, 1]) { p.ellipse(cx + s * 19, cy + r + 2, 12, 6, "#26181c"); p.ellipse(cx + s * 19, cy + r, 9, 4, type ? "#7a7f90" : "#6a4023"); }
        p.line(cx + 1, cy - r + 6, cx + 6, cy - r - 8, "#26181c", 11); p.line(cx + 1, cy - r + 6, cx + 6, cy - r - 8, "#55803a", 6);
        gourd(p, cx, cy, r + 2, r - 3, ...(type ? [[226, 112, 32], [255, 180, 70], [132, 46, 22]] : ORANGE), f);
        bodyParts(p, cx, cy, r, mood);
        if (type === 0) {       // Squire: a floppy cap with a feather.
            p.ellipse(cx, cy - r + 8, 30, 15, "#26181c"); p.ellipse(cx, cy - r + 8, 27, 12, "#3f8f7c", "#22604f");
            p.line(cx + 20, cy - r + 6, cx + 42, cy - r - 12, "#26181c", 7); p.line(cx + 20, cy - r + 6, cx + 42, cy - r - 12, "#f4e2b8", 4);
        } else {                // Knight: a bucket helm with a plume.
            const hy = cy - r + 4;
            p.line(cx, hy - 16, cx - 28, hy - 26, "#26181c", 14); p.line(cx, hy - 16, cx - 28, hy - 26, "#d6424c", 9);
            p.ellipse(cx, hy, 37, 22, "#26181c"); p.ellipse(cx, hy, 34, 19, "#d5dae6", "#6a7286");
            p.ellipse(cx - 12, hy - 8, 10, 4, "#ffffff99");
            p.rect(cx - 37, hy + 8, 74, 8, "#26181c"); p.rect(cx - 35, hy + 10, 70, 4, "#aeb5c6");
        }
    }, { frames: 8, smooth: true });
}

export const BOSSES = [
    { body: [[236, 136, 40], [255, 206, 96], [150, 58, 24]], hat: "tophat", tint: "#2b2f3c" },
    { body: [[150, 206, 236], [226, 248, 255], [70, 118, 170]], hat: "tiara", tint: "#7fd4f4" },
    { body: [[196, 72, 58], [255, 150, 84], [96, 30, 44]], hat: "wig", tint: "#f4ece0" },
    { body: [[132, 96, 196], [206, 176, 244], [62, 40, 118]], hat: "storm", tint: "#ffe066" },
    { body: [[244, 186, 54], [255, 240, 150], [170, 96, 26]], hat: "crown", tint: "#ffd24a" },
];

export function paintBoss(assets, i) {
    const name = `boss${i}`;
    if (assets.sprites.has(name)) return name;
    const B = BOSSES[i], S = 230;
    assets.paint(name, S, S, (p, f) => {
        const cx = S / 2, cy = 145, r = 76, mood = f;
        for (const s of [-1, 1]) { p.ellipse(cx + s * 34, cy + r, 20, 9, "#26181c"); p.ellipse(cx + s * 34, cy + r - 2, 15, 6, "#8c5a30"); }
        gourd(p, cx, cy, r + 8, r - 4, ...B.body, f);
        bodyParts(p, cx, cy + 6, r, mood);
        if (B.hat === "tophat") {
            p.rect(cx - 44, cy - r - 44, 88, 40, "#26181c"); p.rect(cx - 40, cy - r - 41, 80, 34, "#3a3f50"); p.rect(cx - 40, cy - r - 18, 80, 9, "#c23a3c");
            p.ellipse(cx, cy - r - 2, 66, 12, "#26181c"); p.ellipse(cx, cy - r - 3, 62, 8, "#3a3f50");
            for (let k = 0; k < 40; k++) { const q = k / 40 * 6.283; p.circle(cx + 27 + Math.cos(q) * 24, cy - 8 + Math.sin(q) * 24, 2.4, "#d9a93a"); }
            p.line(cx + 49, cy + 2, cx + 60, cy + 50, "#d9a93a", 2.5);
        } else if (B.hat === "tiara") {
            for (let k = -2; k <= 2; k++) { const x = cx + k * 22, h = 34 - Math.abs(k) * 7; p.poly([[x - 14, cy - r + 10], [x, cy - r - h], [x + 14, cy - r + 10]], "#26181c"); p.poly([[x - 9, cy - r + 7], [x, cy - r - h + 8], [x + 9, cy - r + 7]], "#bdf0ff"); }
            p.ellipse(cx, cy - r + 8, 64, 11, "#26181c"); p.ellipse(cx, cy - r + 8, 60, 7, "#f4fbff");
            p.circle(cx, cy - r - 8, 8, "#2a8fd4");
        } else if (B.hat === "wig") {
            for (const [dx, dy, rr] of [[-54, -30, 25], [54, -30, 25], [-36, -58, 27], [36, -58, 27], [0, -68, 29], [-68, 6, 19], [68, 6, 19]]) { p.circle(cx + dx, cy + dy - 8, rr + 3, "#26181c"); }
            for (const [dx, dy, rr] of [[-54, -30, 25], [54, -30, 25], [-36, -58, 27], [36, -58, 27], [0, -68, 29], [-68, 6, 19], [68, 6, 19]]) { p.circle(cx + dx, cy + dy - 8, rr, "#f4ece0", "#c0ae9c"); }
        } else if (B.hat === "storm") {
            p.poly([[cx - 40, cy - r + 14], [cx - 50, cy - r - 50], [cx - 16, cy - r - 18], [cx, cy - r - 64], [cx + 16, cy - r - 18], [cx + 50, cy - r - 50], [cx + 40, cy - r + 14]], "#26181c");
            p.poly([[cx - 35, cy - r + 10], [cx - 42, cy - r - 36], [cx - 15, cy - r - 8], [cx, cy - r - 50], [cx + 15, cy - r - 8], [cx + 42, cy - r - 36], [cx + 35, cy - r + 10]], "#ffe066");
            p.rect(cx - 35, cy - r + 2, 70, 9, "#6a44c0");
        } else {
            p.poly([[cx - 56, cy - r + 16], [cx - 66, cy - r - 44], [cx - 30, cy - r - 12], [cx, cy - r - 58], [cx + 30, cy - r - 12], [cx + 66, cy - r - 44], [cx + 56, cy - r + 16]], "#26181c");
            p.poly([[cx - 51, cy - r + 11], [cx - 57, cy - r - 30], [cx - 29, cy - r - 2], [cx, cy - r - 44], [cx + 29, cy - r - 2], [cx + 57, cy - r - 30], [cx + 51, cy - r + 11]], "#ffcf3f");
            p.rect(cx - 51, cy - r + 2, 102, 10, "#c02f4a");
            for (const k of [-34, 0, 34]) p.circle(cx + k, cy - r + 7, 5, "#7ae0ff");
        }
    }, { frames: 4, smooth: true });
    return name;
}

function paintGear(assets) {
    assets.paint("ammo", 96, 96, (p, f) => {
        const c = 48, r = 38;
        const ball = (a, b, d) => gourdless(p, c, c, r, a, b, d);
        if (f === 0 || f === 1) { // Boulder and Split Shot
            ball([150, 142, 136], [226, 218, 204], [76, 68, 74]);
            for (let k = 0; k < 9; k++) { const a = k * 2.4, q = 8 + k * 2.6; p.circle(c + Math.cos(a) * q, c + Math.sin(a) * q, 3 + (k % 3) * 1.5, "#00000022"); }
            if (f === 1) { p.line(c - 26, c - 22, c - 4, c - 2, "#ffcd5c", 5); p.line(c - 4, c - 2, c + 24, c - 14, "#ffcd5c", 5); p.line(c - 4, c - 2, c + 6, c + 28, "#ffcd5c", 5); p.line(c - 4, c - 2, c - 24, c + 22, "#ffcd5c", 4); }
        } else if (f === 2) {     // Bomber
            ball([58, 60, 78], [140, 150, 170], [20, 18, 30]);
            p.rect(c - 11, c - r - 6, 22, 10, "#26181c"); p.rect(c - 8, c - r - 3, 16, 7, "#8d93a6");
            p.line(c, c - r - 3, c + 14, c - r - 8, "#b9925a", 4); p.circle(c + 16, c - r - 8, 6, "#ffcd5c");
            p.ellipse(c - 15, c - 14, 8, 5, "#ffffff66");
        } else if (f === 3) {     // Heavy Iron
            ball([84, 92, 108], [184, 196, 214], [30, 32, 44]);
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.circle(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 3.4, "#e7ecf4"); }
            p.circle(c, c, 15, "#00000033"); p.circle(c - 2, c - 2, 11, "#c7d0de55");
        } else {                  // Bouncer: striped rubber
            shader(p, (x, y) => {
                const u = (x + 0.5 - c) / r, v = (y + 0.5 - c) / r, d = Math.hypot(u, v), e = (1 - d) * r;
                if (e < -1) return null;
                if (e < 3.2) return [...INK, 255 * clamp(e + 1)];
                const a = Math.atan2(v, u) + d * 1.4, s = Math.sin(a * 3) > 0, l = 0.9 + 0.3 * (-u * 0.5 - v * 0.6);
                const b = s ? [240, 70, 92] : [255, 236, 200];
                return [b[0] * l, b[1] * l, b[2] * l];
            });
            p.ellipse(c - 14, c - 16, 10, 6, "#ffffffaa");
        }
    }, { frames: 5, smooth: true });

    // Catapult: chassis, wheels and fork. The bands are drawn live.
    assets.paint("catapult", 300, 260, (p, f) => {
        const wood = woodSurface(300, 260, 12);
        const beam = (x0, y0, x1, y1, w) => {
            const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, d = p.data;
            for (let y = Math.floor(Math.min(y0, y1) - w - 2); y <= Math.max(y0, y1) + w + 2; y++) for (let x = Math.floor(Math.min(x0, x1) - w - 2); x <= Math.max(x0, x1) + w + 2; x++) {
                if (x < 0 || y < 0 || x >= 300 || y >= 260) continue;
                const t = clamp(((x - x0) * ux + (y - y0) * uy) / L), qx = x0 + ux * L * t, qy = y0 + uy * L * t, e = w - Math.hypot(x - qx, y - qy), o = p.index(x, y);
                if (e < 0) continue;
                const c = e < 3.5 ? INK : wood(((x - x0) * ux + (y - y0) * uy) + 10, ((x - x0) * -uy + (y - y0) * ux) + 30 + (x0 % 30));
                const lit = e > 3.5 ? 1 + 0.32 * clamp((x - qx) * -0.03 + (y - qy) * -0.06, -1, 1) : 1;
                d[o] = clamp(c[0] * lit, 0, 255); d[o + 1] = clamp(c[1] * lit, 0, 255); d[o + 2] = clamp(c[2] * lit, 0, 255); d[o + 3] = 255;
            }
        };
        beam(54, 214, 250, 214, 15);                // chassis
        beam(150, 214, 150, 120, 16);               // post
        beam(150, 124, 108, 28, 14); beam(150, 124, 192, 28, 14);   // Y fork
        beam(232, 212, 158, 142, 9); beam(68, 212, 142, 142, 9);    // braces
        for (const [x, y] of [[108, 28], [192, 28]]) { p.circle(x, y, 13, "#26181c"); p.circle(x, y, 9, "#d9b070", "#7a4a26"); }
        for (const x of [84, 220]) {
            p.circle(x, 226, 33, "#26181c"); p.circle(x, 226, 29, "#8c552b", "#5a3218"); p.circle(x, 226, 19, "#26181c"); p.circle(x, 226, 15.5, "#c79a5c", "#8c5a2e");
            for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.3; p.line(x + Math.cos(a) * 6, 226 + Math.sin(a) * 6, x + Math.cos(a) * 29, 226 + Math.sin(a) * 29, "#26181c", 4); }
            p.circle(x, 226, 6.5, "#d8dde8", "#7c8596");
        }
    }, { smooth: true });

    // Pip the mole, siege engineer: idle, straining, cheering, aghast.
    assets.paint("pip", 112, 128, (p, f) => {
        const cx = 56, cy = 76, up = f === 2 ? -6 : 0;
        for (const s of [-1, 1]) p.ellipse(cx + s * 17, 118, 15, 7, "#26181c"), p.ellipse(cx + s * 17, 116, 12, 5, "#f0a890");
        const armY = f === 2 ? 22 : f === 1 ? 74 : 86, armX = f === 1 ? 46 : 42;
        for (const s of [-1, 1]) { p.line(cx + s * 26, 76, cx + s * armX - (f === 1 ? 26 : 0), armY, "#26181c", 15); p.line(cx + s * 26, 76, cx + s * armX - (f === 1 ? 26 : 0), armY, "#6b4c67", 10); p.circle(cx + s * armX - (f === 1 ? 26 : 0), armY, 8, "#f0a890"); }
        p.ellipse(cx, cy + 8 + up, 33, 35, "#26181c"); p.ellipse(cx, cy + 8 + up, 30, 32, "#7a5877", "#49324a");
        p.ellipse(cx, cy + 22 + up, 19, 17, "#c9a08a");
        p.rect(cx - 24, cy + 3 + up, 48, 6, "#26181c"); p.rect(cx - 2, cy + 3 + up, 8, 6, "#ffcd5c");
        const hy = 42 + up;
        p.ellipse(cx, hy, 30, 28, "#26181c"); p.ellipse(cx, hy, 27, 25, "#7a5877", "#513853");
        p.ellipse(cx, hy + 13, 13, 9, "#26181c"); p.ellipse(cx, hy + 13, 11, 7, "#f0a890"); p.ellipse(cx - 3, hy + 11, 3, 2, "#fff8");
        // Goggles
        p.rect(cx - 27, hy - 10, 54, 6, "#26181c");
        for (const s of [-1, 1]) { p.circle(cx + s * 11, hy - 6, 11, "#26181c"); p.circle(cx + s * 11, hy - 6, 8.5, f === 3 ? "#fffdf2" : "#ffcd5c", f === 3 ? "#d8e2f0" : "#d07a28"); if (f === 3) p.circle(cx + s * 11, hy - 6, 3, "#26181c"); else p.ellipse(cx + s * 11 - 3, hy - 9, 3, 2, "#fffc"); }
        if (f === 2) { p.ellipse(cx, hy + 21, 9, 6, "#26181c"); p.ellipse(cx, hy + 23, 5, 3, "#d4503c"); }
    }, { frames: 4, smooth: true });

    // Effects sheet, all white-ish so they can be tinted.
    assets.paint("fx", 64, 64, (p, f) => {
        const c = 32;
        const soft = (fn) => shader(p, fn);
        if (f <= 2) {     // puffs
            soft((x, y) => {
                const u = (x - c) / 30, v = (y - c) / 30, d = Math.hypot(u, v), n = fbm(x * 0.09 + f * 7, y * 0.09 - f * 3, 3);
                const a = smooth(1, 0.35, d + (n - 0.5) * 0.9);
                const l = 205 + 50 * clamp(0.5 - u * 0.5 - v * 0.6);
                return a > 0 ? [l, l, l, a * 240] : null;
            });
        } else if (f === 3) soft((x, y) => { const d = Math.hypot(x - c, y - c) / 30, a = clamp(1 - d) ** 2.2; return [255, 255, 255, a * 255]; }); // spark
        else if (f === 4) soft((x, y) => { const d = Math.hypot(x - c, y - c) / 30, a = smooth(0.08, 0, Math.abs(d - 0.86)); return [255, 255, 255, a * 255]; }); // ring
        else if (f === 5) { p.poly([[10, 20], [46, 8], [56, 34], [30, 54], [12, 42]], "#ffffff").outline("#26181c"); }                                   // chip
        else if (f === 6) { p.poly([[2, 30], [36, 24], [62, 31], [36, 38], [4, 36]], "#ffffff").outline("#26181c"); }                                     // splinter
        else if (f === 7) { p.poly([[32, 3], [56, 52], [18, 44]], "#ffffffdd"); p.line(32, 8, 26, 40, "#ffffff", 3); }                                     // shard
        else if (f === 8) { p.poly([[8, 10], [54, 24], [24, 56]], "#ffffffcc"); p.line(12, 14, 46, 24, "#ffffff", 3); }                                    // shard
        else if (f === 9) { p.ellipse(c, c, 12, 19, "#ffffff"); p.ellipse(c - 3, c - 6, 4, 8, "#ffffff"); p.outline("#26181c"); }                          // seed
        else if (f === 10) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 30; pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]); } p.poly(pts, "#ffffff"); }  // star
        else if (f === 11) soft((x, y) => {                                                                                                                 // flame lick
            const u = (x - c) / 26, v = (y - 42) / 40, d = Math.hypot(u * (1.3 + v * 1.4), v) + 0.3 * (fbm(x * 0.1, y * 0.1, 2) - 0.5), a = smooth(0.82, 0.4, d);
            return a > 0 ? [255, 255, 255, a * 255] : null;
        });
        else if (f === 12) soft((x, y) => { const d = Math.hypot(x - c, y - c); return d < 26 ? [255, 255, 255, clamp(26.5 - d) * 255] : null; });           // dot / pupil
        else if (f === 13) { // Aim bead
            soft((x, y) => { const d = Math.hypot(x - c, y - c); const a = clamp(23.5 - d); return a > 0 ? (d > 16 ? [30, 22, 34, a * 200] : [255, 255, 255, 255]) : null; });
        }
        else if (f === 14) { // squashed gourd pancake
            soft((x, y) => {
                const u = (x - c) / 30, v = (y - 44) / 11, d = Math.hypot(u, v);
                if (d > 1) return null;
                if (d > 0.88) return INK;
                return mix3([255, 170, 70], [190, 74, 28], clamp((v + 1) / 2));
            });
            p.line(20, 38, 28, 44, "#26181c", 3); p.line(28, 38, 20, 44, "#26181c", 3); p.line(36, 38, 44, 44, "#26181c", 3); p.line(44, 38, 36, 44, "#26181c", 3);
        }
        else if (f === 15) { // Flag
            soft((x, y) => {
                const wave = Math.sin(x * 0.12) * 4, top = 14 + wave + x * 0.1, bot = 44 + wave - x * 0.12;
                if (x < 4 || x > 58 + (y > 30 ? -8 : 0) * 0 || y < top || y > bot) return null;
                const notch = x - 62 + Math.abs(y - (top + bot) / 2) * 0.9;
                if (notch > 0) return null;
                const e = Math.min(y - top, bot - y, -notch, x - 4);
                return e < 2.5 ? INK : [255, 255, 255];
            });
        }
    }, { frames: 16, smooth: true });

    // A plain chunky UI panel and the star, painted once.
    assets.paint("star", 96, 96, (p, f) => {
        const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 19 : 42; pts.push([48 + Math.cos(a) * r, 50 + Math.sin(a) * r]); }
        const grey = f === 0, inner = pts.map((q) => [48 + (q[0] - 48) * 0.78, 50 + (q[1] - 50) * 0.78]);
        p.poly(pts, "#26181c");
        p.poly(inner, grey ? "#6a5f6a" : "#ffc93c");
        if (!grey) { p.poly(inner.slice(0, 6).concat([[48, 50]]), "#ffe27a"); p.circle(40, 40, 4, "#fff6"); }
    }, { frames: 2, smooth: true });
    assets.paint("lock", 64, 64, (p) => {
        p.ellipse(32, 24, 15, 16, "#26181c"); p.ellipse(32, 24, 9, 10, "#0000");
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x - 32, (y - 24) * 1.05) < 8.5 && y < 40) p.data[p.index(x, y) + 3] = 0;
        p.rect(12, 28, 40, 30, "#26181c"); p.rect(15, 31, 34, 24, "#e0b24a", "#a06f28"); p.circle(32, 41, 5, "#26181c"); p.rect(30, 42, 4, 8, "#26181c");
    }, { smooth: true });
}

function gourdless(p, cx, cy, r, c0, c1, c2) {
    shader(p, (x, y) => {
        const u = (x + 0.5 - cx) / r, v = (y + 0.5 - cy) / r, d = Math.hypot(u, v), e = (1 - d) * r;
        if (e < -1) return null;
        if (e < 3.2) return [...INK, 255 * clamp(e + 1)];
        const n = fbm(x * 0.09, y * 0.09, 3), light = 0.55 - u * 0.33 - v * 0.42 + (n - 0.5) * 0.4;
        return light < 0.5 ? mix3(c2, c0, clamp(light * 2)) : mix3(c0, c1, clamp((light - 0.5) * 2));
    });
}

// --- Worlds ---------------------------------------------------------------------------------------------
export const THEMES = {
    meadow: {
        sky: ["#5fb4e0", "#fbe8bd"], sun: [[255, 244, 196], 0.74, 0.28], far: ["#8fbdc8", "#b9d6c8"], near: ["#86b888", "#a4cb9c"], top: ["#8fce5a", "#4f9c3c"], dirt: ["#8a5a3a", "#54342a"],
        stone: "#f4ece0", wood: "#ffffff", light: "#fff7e6", dust: "#ead9b9", fog: "#fbe8bd", accent: "#f2663f", kind: "hills",
    },
    frost: {
        sky: ["#2e4f93", "#c4ecf2"], sun: [[240, 250, 255], 0.28, 0.22], far: ["#6f96c8", "#a6cbe4"], near: ["#c9e4f2", "#eaf7fb"], top: ["#ffffff", "#bfe2f4"], dirt: ["#5a7fa8", "#2f4a78"],
        stone: "#d3e4f6", wood: "#e6e4f0", light: "#eaf8ff", dust: "#e4f2fa", fog: "#c4ecf2", accent: "#4fc3f7", kind: "peaks",
    },
    ember: {
        sky: ["#3b1236", "#f5873c"], sun: [[255, 206, 120], 0.68, 0.38], far: ["#6b2a3f", "#a8413a"], near: ["#3c1c28", "#55262a"], top: ["#5a3a3a", "#2e1c26"], dirt: ["#3a1e2a", "#1c0f18"],
        stone: "#cdb4ac", wood: "#e4bfa2", light: "#ffdcae", dust: "#a58c80", fog: "#f5873c", accent: "#ff7a2f", kind: "volcano",
    },
    storm: {
        sky: ["#1c1c4c", "#7560ad"], sun: [[220, 225, 255], 0.76, 0.16], far: ["#3d3a7c", "#55509c"], near: ["#2a2860", "#3b3780"], top: ["#6f7bb0", "#3d4580"], dirt: ["#2e2c5c", "#191836"],
        stone: "#c8c4ec", wood: "#cfc4e0", light: "#dfe0ff", dust: "#b5b2d8", fog: "#7560ad", accent: "#ffe066", kind: "spires",
    },
    gilded: {
        sky: ["#d9553f", "#ffd98a"], sun: [[255, 250, 214], 0.5, 0.4], far: ["#d99c58", "#f0c078"], near: ["#b5713e", "#d09050"], top: ["#ffd76a", "#c9892c"], dirt: ["#8e5a30", "#54301f"],
        stone: "#fff0c8", wood: "#ffffff", light: "#fff0c4", dust: "#f4d9a0", fog: "#ffd98a", accent: "#ffcf3f", kind: "dunes",
    },
};

function ridge(kind, x, w, layer) {
    const t = x / w * Math.PI * 2;
    if (kind === "hills") return 0.45 + 0.2 * Math.sin(t * 2 + layer) + 0.12 * Math.sin(t * 5 + layer * 2) + 0.05 * Math.sin(t * 11);
    if (kind === "peaks" || kind === "spires") {
        let m = 0;
        const n = kind === "spires" ? 9 : 6;
        for (let i = 0; i < n; i++) {
            const c = (i + 0.5) / n + (hash(i, layer) - 0.5) * 0.06, hgt = 0.35 + hash(i, layer + 9) * 0.6, wide = kind === "spires" ? 0.028 + hash(i + 3, layer) * 0.03 : 0.12;
            let d = Math.abs(x / w - c); d = Math.min(d, 1 - d);
            m = Math.max(m, hgt * (1 - d / wide));
        }
        return Math.max(0.16, m + 0.03 * Math.sin(t * 17 + layer));
    }
    if (kind === "volcano") {
        let d = Math.abs(x / w - 0.5); d = Math.min(d, 1 - d);
        const peak = (1 - clamp(d / 0.34)) ** 1.25 * 0.94;
        return Math.max(0.2 + 0.08 * Math.sin(t * 5), Math.min(peak, 0.8) + 0.02 * Math.sin(t * 19));
    }
    return 0.4 + 0.18 * Math.sin(t * 3 + layer) + 0.08 * Math.sin(t * 7 + layer * 3);
}

/** Paint the three layers of a world on demand: cheap, and only ever once. */
export function paintWorld(assets, theme) {
    const T = THEMES[theme], tag = theme;
    if (assets.sprites.has(`far_${tag}`)) return;
    const layer = (name, W, Hh, cols, idx) => {
        const a = hex(cols[0]), b = hex(cols[1]), kind = T.kind;
        assets.paint(name, W, Hh, (p) => shader(p, (x, y) => {
            const r = ridge(kind, x, W, idx) * Hh, sy = Hh - y;
            if (sy > r + 1) return null;
            const aa = clamp(r - sy + 0.5), depth = clamp(sy / r);
            const n = wrapFbm(x, y + idx * 40, W, 0.012 * (idx + 1) + 0.006);
            const c = mix3(b, a, clamp(depth * 0.9 + (n - 0.5) * 0.5));
            if (kind === "peaks" && sy > r * 0.72 && idx === 0) { const s = smooth(0.72, 0.8, sy / r + (n - 0.5) * 0.14); return [mix(c[0], 248, s), mix(c[1], 252, s), mix(c[2], 255, s), 255 * aa]; }
            if (kind === "volcano" && idx === 0 && r > Hh * 0.72 && sy > r * 0.72) { const glow = smooth(0.75, 1, sy / r) * (0.6 + n); return [mix(c[0], 255, glow), mix(c[1], 130, glow), mix(c[2], 40, glow), 255 * aa]; }
            return [c[0], c[1], c[2], 255 * aa];
        }), { smooth: true });
    };
    layer(`far_${tag}`, 1024, 256, T.far, 0);
    layer(`near_${tag}`, 1024, 200, T.near, 1);
    const top = hex(T.top[0]), top2 = hex(T.top[1]), d0 = hex(T.dirt[0]), d1 = hex(T.dirt[1]);
    assets.paint(`ground_${tag}`, 256, 128, (p) => shader(p, (x, y) => {
        const wob = 16 + 6 * Math.sin(x / 256 * Math.PI * 2 * 2) + 3.5 * Math.sin(x / 256 * Math.PI * 2 * 7), n = wrapFbm(x, y, 256, 0.05);
        if (y < 3) return mix3(top, [255, 255, 255], 0.35);
        if (y < wob) return mix3(top, top2, clamp((y - 3) / wob + (n - 0.5) * 0.5));
        if (y < wob + 3.5) return [...INK];
        const pebble = hash(Math.floor(x / 22) % 12, Math.floor(y / 18));
        const px = (x % 22) - 11, py = (y % 18) - 9, st = pebble > 0.84 && Math.hypot(px, py * 1.2) < 6 && y < 110;
        const depth = clamp((y - wob) / (118 - wob));
        const c = mix3(d0, d1, clamp(depth * depth + (n - 0.5) * 0.7 * (1 - depth)));
        return st ? [c[0] * 1.25, c[1] * 1.25, c[2] * 1.25] : c;
    }), { smooth: true });
    assets.paint(`rock_${tag}`, 128, 128, (p) => shader(p, (x, y) => {
        const n = fbm(x * 0.03 + 7, y * 0.03, 3), s = fbm(x * 0.012 + y * 0.008, y * 0.05, 2);
        const stripe = Math.sin(y * 0.14 + s * 9) * 0.5 + 0.5;
        const c = mix3(d1, d0, clamp(n * 0.7 + stripe * 0.34));
        return [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15];
    }), { smooth: true });
    assets.paint(`cloud_${tag}`, 256, 128, (p) => {
        const col = theme === "ember" ? [255, 190, 140] : theme === "storm" ? [120, 110, 190] : [255, 255, 255];
        shader(p, (x, y) => {
            const u = (x - 128) / 122, v = (y - 76) / 48;
            const lump = Math.max(1 - Math.hypot(u * 1.2, v * 2.1), 1 - Math.hypot((u + 0.4) * 2.1, (v + 0.2) * 2.2), 1 - Math.hypot((u - 0.3) * 2, (v + 0.34) * 2), 1 - Math.hypot((u - 0.62) * 2.6, (v - 0.08) * 2.6));
            const a = smooth(0, 0.14, lump + (fbm(x * 0.03, y * 0.03, 3) - 0.5) * 0.25);
            if (a <= 0 || y > 92) return null;
            const k = 0.9 + 0.1 * clamp(1 - y / 80);
            return [col[0] * k, col[1] * k, col[2] * k, a * 225 * smooth(100, 78, y)];
        });
    }, { smooth: true });
}

export function paintAll(assets) {
    paintBlocks(assets);
    paintFolk(assets);
    paintGear(assets);
}
