// Twelve ways to throw one panel off the stage and slam in the next. k=0 is clear, k=1 is fully covered.
import { C, INK } from "./ink.js";
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const outCubic = (t) => 1 - (1 - t) ** 3;
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const outBounce = (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; };
const stag = (k, i, n, spread = 0.5) => clamp((k - (i / n) * spread) / (1 - spread));

export const WIPES = [
    function shutters(d, k, W, H, a, b) {
        const n = 8, h = H / n;
        for (let i = 0; i < n; i++) {
            const q = outCubic(stag(k, i, n)), w = (W + 12) * q, x = i % 2 ? W - w / 2 + 6 : w / 2 - 6;
            d.rect(w, h + 2, { x, y: h * (i + 0.5), color: INK });
            d.rect(Math.max(0, w - 8), h - 6, { x, y: h * (i + 0.5), color: i % 2 ? a : b });
        }
    },
    function iris(d, k, W, H, a) {
        const R = Math.hypot(W, H) * 0.62, r0 = R * (1 - inOut(k)) * (k >= 1 ? 0 : 1), far = R * 1.6, n = 36, cx = W / 2, cy = H / 2;
        for (let i = 0; i < n; i++) {
            const t0 = i / n * Math.PI * 2, t1 = (i + 1) / n * Math.PI * 2, P = (t, r) => [cx + Math.cos(t) * r, cy + Math.sin(t) * r];
            d.poly([P(t0, r0), P(t1, r0), P(t1, far), P(t0, far)], { color: a });
            d.poly([P(t0, Math.max(0, r0 - 10)), P(t1, Math.max(0, r0 - 10)), P(t1, r0), P(t0, r0)], { color: INK });
        }
    },
    function slash(d, k, W, H, a, b) {
        const L = Math.hypot(W, H) + 80, n = 5;
        d.push(); d.translate(W / 2, H / 2); d.rotate(-0.5);
        for (let i = 0; i < n; i++) {
            const q = outCubic(stag(k, i, n, 0.45)), h = (L / n) + 6, w = L * 1.3 * q, y = -L / 2 + (i + 0.5) * (L / n), x = (i % 2 ? 1 : -1) * (L * 0.65 - w / 2);
            d.rect(w, h, { x, y, color: INK });
            d.rect(Math.max(0, w - 8), h - 10, { x, y, color: i % 2 ? b : a });
        }
        d.pop();
    },
    function chomp(d, k, W, H) {
        const q = k * k * (3 - 2 * k), h = (H / 2 + 34) * q, n = Math.ceil(W / 46), tw = W / n;
        const jaw = (top) => {
            const y = top ? h - 34 : H - h + 34, dir = top ? 1 : -1, edge = top ? h - 34 : H - h + 34;
            d.rect(W, h, { x: W / 2, y: top ? h / 2 - 34 : H - h / 2 + 34, color: C.mag });
            for (let i = 0; i < n; i++) {
                const x = (top ? i : i + 0.5) * tw;
                d.poly([[x - 3, edge], [x + tw + 3, edge], [x + tw / 2, y + dir * 40]], { color: INK });
                d.poly([[x + 3, edge], [x + tw - 3, edge], [x + tw / 2, y + dir * 33]], { color: C.wht });
            }
            d.rect(W, 7, { x: W / 2, y: edge, color: INK });
        };
        jaw(true); jaw(false);
    },
    function pinwheel(d, k, W, H, a, b) {
        const n = 12, R = Math.hypot(W, H), cx = W / 2, cy = H / 2, q = inOut(k), step = Math.PI * 2 / n;
        for (let i = 0; i < n; i++) {
            const t = i * step + q * 0.6, e = t + step * q * 1.04, P = (u) => [cx + Math.cos(u) * R, cy + Math.sin(u) * R];
            d.poly([[cx, cy], P(t), P((t + e) / 2), P(e)], { color: i % 2 ? a : b });
            d.line([cx, cy], P(e), { color: INK, width: 6 });
        }
    },
    function drips(d, k, W, H, a) {
        const n = 11, w = W / n;
        for (let i = 0; i < n; i++) {
            const skew = [0.2, 0, 0.35, 0.12, 0.45, 0.05, 0.3, 0.15, 0.4, 0.02, 0.25][i], q = outCubic(clamp((k - skew * 0.5) / (1 - skew * 0.5))), h = (H + w * 1.4) * q, x = w * (i + 0.5);
            d.rect(w + 8, h, { x, y: h / 2 - 8, color: INK });
            d.circle(w / 2 + 4, { x, y: h - 8, color: INK });
        }
        for (let i = 0; i < n; i++) {
            const skew = [0.2, 0, 0.35, 0.12, 0.45, 0.05, 0.3, 0.15, 0.4, 0.02, 0.25][i], q = outCubic(clamp((k - skew * 0.5) / (1 - skew * 0.5))), h = (H + w * 1.4) * q, x = w * (i + 0.5);
            d.rect(w + 1, h, { x, y: h / 2 - 12, color: a });
            d.circle(w / 2, { x, y: h - 12, color: a });
        }
    },
    function halftone(d, k, W, H, a) {
        const c = 58, cols = Math.ceil(W / c) + 2, rows = Math.ceil(H / c) + 2, far = Math.hypot(W, H) / 2;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const px = (x - 0.5 + (y % 2) * 0.5) * c, py = (y - 0.5) * c, delay = Math.hypot(px - W / 2, py - H / 2) / far * 0.5, q = clamp((k - delay) / 0.5);
            if (q > 0) d.circle(q * c * 0.95, { x: px, y: py, color: a });
        }
    },
    function checker(d, k, W, H, a, b) {
        const c = 72, cols = Math.ceil(W / c) + 1, rows = Math.ceil(H / c) + 1;
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const q = outCubic(clamp((k - (x + y) / (cols + rows) * 0.55) / 0.45)), s = (c + 3) * q;
            if (s > 0.5) { d.rect(s, s, { x: (x + 0.5) * c, y: (y + 0.5) * c, color: (x + y) % 2 ? a : b, rot: (1 - q) * 2 }); }
        }
    },
    function tear(d, k, W, H, a, b) {
        const n = 14, h = H / n, q = inOut(k), reach = (W / 2 + 42) * q;
        for (let side = 0; side < 2; side++) for (let i = 0; i < n; i++) {
            const y0 = h * i, y1 = h * (i + 1), tip = reach + (i % 2 ? 0 : 0) , base = reach - 40, xf = (x) => (side ? W - x : x);
            d.poly([[xf(-4), y0], [xf(base + 8), y0], [xf(tip + 8), (y0 + y1) / 2], [xf(base + 8), y1], [xf(-4), y1]], { color: INK });
            d.poly([[xf(-4), y0], [xf(base), y0], [xf(tip), (y0 + y1) / 2], [xf(base), y1], [xf(-4), y1]], { color: side ? a : b });
        }
    },
    function curtains(d, k, W, H) {
        const q = outCubic(k), w = (W / 2 + 12) * q, n = 6;
        for (let side = 0; side < 2; side++) for (let i = 0; i < n; i++) {
            const fw = w / n, x = fw * (i + 0.5), xx = side ? W - x : x;
            d.rect(fw + 2, H, { x: xx, y: H / 2, color: i % 2 ? C.red : C.mag });
            d.rect(3, H, { x: xx + fw / 2, y: H / 2, color: INK, opacity: 0.6 });
        }
        d.rect(W, 26 + 30 * q, { x: W / 2, y: 6 + 12 * q, color: C.yel });
        d.rect(W, 5, { x: W / 2, y: 22 + 30 * q, color: INK });
    },
    function spin(d, k, W, H, a, b) {
        const q = outCubic(k), S = Math.hypot(W, H) * 1.5;
        d.push(); d.translate(W / 2, H / 2);
        for (const [i, c] of [[0, INK], [1, a], [2, INK], [3, b]]) {
            const s = S * clamp(q * 1.25 - i * 0.05) * (1 - i * 0.04);
            d.push(); d.rotate((1 - q) * (3 - i * 0.5)); d.rect(s, s, { color: c }); d.pop();
        }
        d.pop();
    },
    function drop(d, k, W, H, a, b) {
        const n = 4, band = H / n;
        for (let i = n - 1; i >= 0; i--) {
            const q = outBounce(stag(k, n - 1 - i, n, 0.4)), y = -band + (band * (i + 1)) * q + band / 2 - (1 - q) * 80;
            d.rect(W + 4, band + 8, { x: W / 2, y, color: INK });
            d.rect(W + 4, band - 2, { x: W / 2, y, color: i % 2 ? b : a });
        }
    },
];
