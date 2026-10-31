// DEEP TROUBLE: all the art, painted at startup. Nothing here loads a file.
// Style: chunky sticker cartoons. Every part is painted on its own layer, cel-shaded
// with one light from the top-left, then outlined, then stacked.
import { color } from "./pogo.js";

export const INK = "#0e1a3d";
export const PAL = {
    ink: INK, foam: "#eafcff", aqua: "#58e0ff", sea: "#2b9fc4", deep: "#1a4f85",
    mint: "#7dffcf", lime: "#c9f75c", leaf: "#2fb36f", gold: "#ffd84d", amber: "#ffa53d",
    coral: "#ff6b5e", crimson: "#d92f55", pink: "#ff86c8", violet: "#9a6bff", plum: "#5a2fa8",
    bone: "#f2ecd8",
};

// --- Layer helpers -------------------------------------------------------------------

const rgba = (c) => { const k = color(c); return [k.r, k.g, k.b, k.a]; };

function blit(dst, src, alpha = 1, ox = 0, oy = 0) {
    for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
        const s = src.index(x, y), sa = src.data[s + 3] / 255 * alpha;
        if (sa <= 0) continue;
        const dx = x + ox, dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height) continue;
        const o = dst.index(dx, dy), d = dst.data, da = d[o + 3] / 255, out = sa + da * (1 - sa);
        d[o] = (src.data[s] * sa + d[o] * da * (1 - sa)) / out;
        d[o + 1] = (src.data[s + 1] * sa + d[o + 1] * da * (1 - sa)) / out;
        d[o + 2] = (src.data[s + 2] * sa + d[o + 2] * da * (1 - sa)) / out;
        d[o + 3] = out * 255;
    }
}

const blank = (p, w = p.width, h = p.height) => new p.constructor(w, h, new Uint8Array(w * h * 4), w, 0);

function alphaOf(t) {
    const a = new Uint8Array(t.width * t.height);
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) a[y * t.width + x] = t.data[t.index(x, y) + 3];
    return a;
}

/** Cel shading: an offset crescent of shadow on the bottom-right, a thin light rim on the top-left. */
function cel(t, o = {}) {
    const a = alphaOf(t), w = t.width, h = t.height;
    const ds = o.shadow ?? 4, ls = o.rim ?? 2, sc = rgba(o.shade ?? "#1c1a6e"), sa = o.dark ?? 0.34, la = o.light ?? 0.34;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[y * w + x] > 90;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!on(x, y)) continue;
        if (ds && !on(x + ds, y + ds)) t.set(x, y, [sc[0], sc[1], sc[2], sa]);
        else if (ls && !on(x - ls, y - ls)) t.set(x, y, [1, 1, 1, la]);
    }
}

/** Paint one part on its own layer, shade it, outline it, and stack it. */
function part(p, fn, o = {}) {
    const t = blank(p);
    fn(t);
    if (o.cel !== false) cel(t, o);
    for (let i = 0; i < (o.ol ?? 2); i++) t.outline(o.ink ?? INK);
    blit(p, t, o.alpha ?? 1);
}

/** Copy of a painted frame, solid white, for the hit flash. */
function silhouette(t, c = "#ffffff") {
    const [r, g, b] = rgba(c);
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
        const o = t.index(x, y);
        if (!t.data[o + 3]) continue;
        t.data[o] = r * 255; t.data[o + 1] = g * 255; t.data[o + 2] = b * 255;
    }
}

function softDisc(p, cx, cy, r, c, power = 2, gain = 1) {
    const k = rgba(c);
    for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d < 1) p.set(x, y, [k[0], k[1], k[2], k[3] * Math.min(1, gain * (1 - d) ** power)]);
    }
}

const eye = (t, x, y, r, look = 1, c = INK, lid = 0) => {
    t.circle(x, y, r, "#ffffff");
    t.circle(x + look * r * 0.32, y + r * 0.1, r * 0.56, c);
    t.circle(x + look * r * 0.1, y - r * 0.28, r * 0.24, "#ffffff");
    if (lid) t.line(x - r * 1.1, y - r * lid - 1, x + r * 1.1, y - r * lid + 3 * Math.sign(look) * 0 + 1, INK, 3);
};

// --- Sheets ---------------------------------------------------------------------------

/** A sheet is one texture, so everything on it draws in one batch. */
class Sheet {
    constructor(name, cell) { this.name = name; this.cell = cell; this.frames = []; this.at = {}; }
    add(key, fn) {
        this.at[key] = this.frames.length;
        this.frames.push(fn);
        return this;
    }
    /** n animation frames, then n white versions of them for the hit flash. */
    mob(key, n, fn) {
        this.at[key] = this.frames.length;
        for (let i = 0; i < n; i++) this.frames.push((t) => fn(t, i));
        for (let i = 0; i < n; i++) this.frames.push((t) => { fn(t, i); silhouette(t); });
        return this;
    }
    paint(game) {
        const list = this.frames, cell = this.cell;
        game.assets.paint(this.name, cell, cell, (p, f) => { const t = blank(p); list[f](t); blit(p, t); }, { frames: list.length, smooth: true });
    }
}

// --- The swarm (80px cells, shown at 40 units or less) -------------------------------

function grump(t, i) {
    const w = [-5, 1, 6][i], o = [0, 1, 0][i];
    part(t, (q) => q.poly([[22, 42], [5, 27 + w], [11, 42], [5, 57 + w]], "#2fb36f"), { shadow: 2 });
    part(t, (q) => q.poly([[30, 28], [37, 13], [55, 25]], "#2fb36f"), { shadow: 2 });
    part(t, (q) => { q.ellipse(44, 43 + o, 25, 20, "#d8fb6e", "#3fc46f"); q.ellipse(47, 54 + o, 15, 7, "#f4ffd0"); });
    part(t, (q) => q.poly([[34, 44], [24, 52 - w], [38, 54]], "#2fb36f"), { shadow: 2, ol: 1 });
    t.ellipse(40, 33, 3, 2, "#ffffff88");
    part(t, (q) => eye(q, 54, 37 + o, 8), { cel: false, ol: 1 });
    t.line(44, 27 + o, 63, 33 + o, INK, 4);
    t.line(55, 53 + o, 67, 49 + o, INK, 3);
    t.poly([[58, 52 + o], [61, 56 + o], [62, 51 + o]], "#ffffff");
}

function crab(t, i) {
    const leg = [0, 3, -3][i], up = [0, -3, 2][i];
    const half = blank(t);
    for (const [a, b] of [[30, 0], [36, 5], [42, 9]]) {
        const j = (b % 2 ? leg : -leg);
        half.line(24, a + 16, 7, a + 22 + j + b * 0.4, INK, 7);
        half.line(24, a + 16, 7, a + 22 + j + b * 0.4, "#c8313f", 3);
    }
    blit(t, half);
    const m = blank(t);
    blit(m, half);
    m.mirror();
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width >> 1; x++) { const o = m.index(x, y); m.data[o + 3] = 0; }
    blit(t, m);
    // Claws, raised and threatening.
    for (const s of [-1, 1]) {
        const cx = 40 + s * 26, cy = 24 + up;
        part(t, (q) => { q.line(40 + s * 22, 46, cx, cy + 8, "#ff7a55", 7); }, { shadow: 2, ol: 2 });
        part(t, (q) => {
            q.ellipse(cx, cy, 11, 13, "#ffa070", "#f04a44");
            q.poly([[cx - 4 * s, cy - 15], [cx - 1 * s, cy + 1], [cx + 4 * s, cy - 15]], [0, 0, 0, 0]);
        }, { shadow: 3 });
        t.line(cx, cy - 13, cx - s * 1, cy - 1, INK, 3);
    }
    // Eye stalks behind the shell.
    for (const s of [-1, 1]) t.line(40 + s * 8, 40, 40 + s * 9, 25, INK, 5);
    part(t, (q) => { q.ellipse(40, 47 + (up >> 1), 25, 18, "#ff8a5c", "#d92f45"); q.ellipse(40, 55, 15, 6, "#ffc0a0"); });
    t.circle(28, 42, 2.5, "#ffffff66").circle(35, 38, 1.8, "#ffffff66");
    part(t, (q) => { eye(q, 31, 22, 7, 0.4); eye(q, 49, 22, 7, -0.4); }, { cel: false, ol: 1 });
    t.line(32, 50, 37, 53, INK, 3); t.line(37, 53, 43, 53, INK, 3); t.line(43, 53, 48, 50, INK, 3);
}

function jelly(t, i) {
    const pulse = [0, 3, 6][i], wob = [0, 1.2, 2.4][i];
    // Tentacles first, wavy.
    for (let k = 0; k < 5; k++) {
        const bx = 22 + k * 9, c = k % 2 ? "#ffc4f0" : "#ff86c8";
        let px = bx, py = 40;
        for (let s = 1; s <= 6; s++) {
            const ny = 40 + s * (5.4 - pulse * 0.16), nx = bx + Math.sin(s * 0.9 + wob + k) * (2 + s * 0.8);
            t.line(px, py, nx, ny, INK, 7 - s * 0.4);
            px = nx; py = ny;
        }
        px = bx; py = 40;
        for (let s = 1; s <= 6; s++) {
            const ny = 40 + s * (5.4 - pulse * 0.16), nx = bx + Math.sin(s * 0.9 + wob + k) * (2 + s * 0.8);
            t.line(px, py, nx, ny, c, 4 - s * 0.3);
            px = nx; py = ny;
        }
    }
    part(t, (q) => {
        q.ellipse(40, 31 + pulse * 0.4, 27 + pulse * 0.6, 23 - pulse * 0.6, "#ffb6ea", "#c65cf0");
        q.rect(0, 44 + pulse * 0.5 | 0, 80, 40, "#00000000");
        for (let k = 0; k < 6; k++) q.circle(17.5 + k * 9 - pulse * 0.1, 44 + pulse * 0.2, 5.6, "#c65cf0");
    }, { alpha: 0.96, shadow: 5, shade: "#5a2fa8" });
    t.ellipse(40, 28 + pulse * 0.4, 14, 11, "#ffffff40");
    t.ellipse(29, 21 + pulse * 0.4, 7, 4, "#ffffffb0");
    t.circle(33, 37, 3.4, INK).circle(47, 37, 3.4, INK);
    t.circle(32, 36, 1.2, "#fff").circle(46, 36, 1.2, "#fff");
    t.line(37, 42, 43, 42, INK, 2.5);
    t.circle(26, 42, 3, "#ff5fae66").circle(54, 42, 3, "#ff5fae66");
}

function puffer(t, i) {
    const r = [20, 22, 30][i], cx = 41, cy = 42;
    part(t, (q) => {
        const n = 12;
        for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2 + 0.26, ax = Math.cos(a), ay = Math.sin(a);
            const L = r + 8 + (i === 2 ? 2 : 0);
            q.poly([[cx + ax * (r - 3) - ay * 5, cy + ay * (r - 3) + ax * 5], [cx + ax * L, cy + ay * L], [cx + ax * (r - 3) + ay * 5, cy + ay * (r - 3) - ax * 5]], "#ffe9b0");
        }
    }, { shadow: 0, rim: 0 });
    if (i < 2) part(t, (q) => q.poly([[18, 42], [6, 33 + i * 4], [6, 51 - i * 4]], "#ff9a3d"), { shadow: 2 });
    part(t, (q) => { q.circle(cx, cy, r, "#ffc65a", "#ff7a2e"); q.ellipse(cx + 2, cy + r * 0.52, r * 0.72, r * 0.42, "#fff2cf"); }, { shadow: 5 });
    t.ellipse(cx - r * 0.42, cy - r * 0.5, r * 0.26, r * 0.15, "#ffffffb0");
    for (const [a, b] of [[-8, -12], [8, -15], [18, -5]]) t.circle(cx + a * r / 22, cy + b * r / 22, 2, "#b54b1e88");
    part(t, (q) => eye(q, cx + r * 0.32, cy - r * 0.12, 7 + (i === 2 ? 2 : 0)), { cel: false, ol: 1 });
    t.line(cx + r * 0.02, cy - r * 0.42, cx + r * 0.62, cy - r * 0.3, INK, 3.5);
    part(t, (q) => q.ellipse(cx + r * 0.84, cy + r * 0.2, 5, 4.4, "#ff5e6c"), { cel: false, ol: 1 });
}

function eel(t, i) {
    const ph = i / 3 * Math.PI * 2;
    const at = (u) => [7 + u * 52, 42 + Math.sin(u * 5.2 + ph) * (10 * (1 - u * 0.75))];
    for (let pass = 0; pass < 3; pass++) {
        for (let s = 0; s <= 44; s++) {
            const u = s / 44, [x, y] = at(u), r = 3 + u * 8.5;
            if (pass === 0) t.circle(x, y, r + 2.2, INK);
            if (pass === 1) t.circle(x, y, r, Math.floor(s / 6) % 2 ? "#9a6bff" : "#6d3fe0");
            if (pass === 2) t.circle(x - 0.5, y + r * 0.45, r * 0.42, "#c8f8ff");
        }
    }
    t.line(13, 37, 6, 29, INK, 5); t.line(13, 37, 6, 29, "#58e0ff", 2.5);
    const [hx, hy] = at(1);
    part(t, (q) => { q.ellipse(hx + 2, hy, 13, 12, "#a980ff", "#5a2fa8"); q.poly([[hx + 4, hy + 2], [hx + 16, hy + 2], [hx + 16, hy + 12], [hx + 4, hy + 8]], "#ffffff"); });
    t.line(hx + 3, hy + 2, hx + 15, hy + 3, INK, 3);
    for (let k = 0; k < 3; k++) t.poly([[hx + 5 + k * 4, hy + 3], [hx + 7 + k * 4, hy + 7], [hx + 9 + k * 4, hy + 3]], "#ffffff");
    part(t, (q) => eye(q, hx + 3, hy - 4, 5.5), { cel: false, ol: 1 });
    t.line(hx - 4, hy - 11, hx + 9, hy - 7, INK, 3);
}

function inkling(t, i) {
    const sw = [-3, 0, 3][i];
    for (let k = 0; k < 4; k++) {
        const x = 28 + k * 8;
        t.line(x, 46, x + sw * (k - 1.5) * 0.7, 68 - (k === 1 || k === 2 ? 0 : 4), INK, 8);
        t.line(x, 46, x + sw * (k - 1.5) * 0.7, 68 - (k === 1 || k === 2 ? 0 : 4), "#7a3fe0", 4.5);
    }
    part(t, (q) => {
        q.poly([[40, 6], [60, 30], [20, 30]], "#b98aff");
        q.ellipse(40, 36, 21, 18, "#b98aff", "#5a2fa8");
        q.poly([[20, 16], [12, 12], [18, 30]], "#b98aff"); q.poly([[60, 16], [68, 12], [62, 30]], "#b98aff");
    }, { shadow: 4 });
    t.circle(40, 24, 2.5, "#ffffff55");
    part(t, (q) => { eye(q, 32, 37, 7.5, 0.3, "#d92f55"); eye(q, 48, 37, 7.5, -0.3, "#d92f55"); }, { cel: false, ol: 1 });
    t.line(23, 28, 37, 33, INK, 3.5); t.line(57, 28, 43, 33, INK, 3.5);
}

function bonefish(t, i) {
    const w = [-5, 0, 5][i];
    const ink = "#3a2f5c";
    for (let k = 0; k < 5; k++) {
        const x = 18 + k * 7, r = 8 + k * 2.2;
        for (const c of [[INK, 7], ["#f2ecd8", 3.5]]) {
            t.line(x, 42 - r, x + 2 + w * 0.15, 42, c[0], c[1]);
            t.line(x, 42 + r, x + 2 + w * 0.15, 42, c[0], c[1]);
        }
    }
    t.line(8, 42, 54, 42, INK, 8); t.line(8, 42, 54, 42, "#f2ecd8", 4);
    part(t, (q) => q.poly([[12, 42], [2, 30 + w], [5, 42], [2, 54 + w]], "#f2ecd8"), { shadow: 2, shade: ink });
    part(t, (q) => {
        q.ellipse(58, 38, 17, 15, "#fff9e8", "#c9bfa6");
        q.rect(50, 49, 22, 6, "#00000000");
        q.poly([[46, 46], [76, 46], [72, 52], [52, 52]], "#e4dcc2");
        q.poly([[48, 54], [72, 54], [69, 62], [54, 60]], "#d6cdb2");
    }, { shadow: 4, shade: ink });
    for (let k = 0; k < 4; k++) t.poly([[52 + k * 5, 51], [54.5 + k * 5, 56], [57 + k * 5, 51]], "#ffffff");
    t.line(50, 52, 72, 52, INK, 2);
    t.circle(63, 36, 7.5, INK);
    t.circle(64, 37, 3.4, "#ff4d5e").circle(63, 35, 1.2, "#ffd0d0");
    t.line(46, 30, 50, 37, INK, 2.5);
}

// --- Big ones ---------------------------------------------------------------------------

function hero(t, i) {
    // Pip the deep-sea diver. 96px cell.
    const k = [0, 1, 2, 1][i], kick = [-5, 0, 5, 0][i], bob = [0, -1, 0, 1][i];
    // Air tank on the back.
    part(t, (q) => { q.ellipse(26, 54 + bob, 10, 15, "#ff6b5e", "#c62f45"); q.rect(21, 37 + bob, 10, 5, "#ffd84d"); }, { shadow: 3 });
    // Legs and boots, kicking.
    for (const [s, o] of [[0, kick], [1, -kick]]) {
        const hipx = 38 + s * 15, fx = hipx - 2 + o * 0.5, fy = 77 + o * 0.6;
        part(t, (q) => q.line(hipx, 62, fx, fy, "#ffc52e", 13), { shadow: 3 });
        part(t, (q) => q.ellipse(fx + 2, fy + 5, 10, 6, "#3a7bd5", "#1a3f8f"), { shadow: 2 });
    }
    // Back arm paddling.
    part(t, (q) => q.line(30, 56 + bob, 18 + k * 2, 68 - k * 3, "#ffc52e", 11), { shadow: 3 });
    // Round puffy suit.
    part(t, (q) => {
        q.ellipse(46, 58 + bob, 21, 18, "#ffe066", "#f79a1f");
        q.rect(26, 62 + bob, 40, 5, "#ff6b5e");
    }, { shadow: 5, shade: "#a83a1e", dark: 0.42 });
    t.circle(46, 53 + bob, 2.2, "#c62f45");
    // Front arm.
    part(t, (q) => q.line(62, 56 + bob, 74 - k, 64 - k * 2, "#ffc52e", 11), { shadow: 3 });
    part(t, (q) => q.circle(75 - k, 65 - k * 2, 6.5, "#3a7bd5", "#1a3f8f"), { shadow: 2, ol: 1 });
    // Brass helmet.
    part(t, (q) => {
        q.circle(50, 31 + bob, 26, "#ffe08a", "#e0902a");
        q.ellipse(50, 53 + bob, 19, 6, "#ffc23a", "#b06a1a");
    }, { shadow: 6, shade: "#7a3412", dark: 0.48, light: 0.5 });
    for (const [x, y] of [[29, 18], [24, 34], [33, 49], [68, 50], [76, 34], [71, 16], [50, 8]]) {
        t.circle(x, y + bob, 2.8, INK);
        t.circle(x - 0.5, y - 0.5 + bob, 1.8, "#fff4c0");
    }
    // Lamp on top.
    part(t, (q) => { q.rect(44, 1 + bob, 12, 7, "#b06a1a"); q.ellipse(50, 3 + bob, 7, 3, "#fff6b0"); }, { ol: 1, cel: false });
    // Porthole with a face in it.
    t.circle(52, 31 + bob, 18.5, INK);
    t.circle(52, 31 + bob, 16.5, "#8ff0ff", "#1f8fd0");
    t.ellipse(55, 34 + bob, 12, 11, "#ffd7b5");
    t.circle(51 + 0, 34 + bob, 2.8, INK).circle(62, 34 + bob, 2.8, INK);
    t.circle(50.2, 33 + bob, 1, "#fff").circle(61.2, 33 + bob, 1, "#fff");
    t.circle(47, 39 + bob, 2.6, "#ff9a9a99").circle(65, 39 + bob, 2.6, "#ff9a9a99");
    t.ellipse(56.5, 40 + bob, 2.8, 1.8, "#9a3a3a");
    // Glass shine.
    t.ellipse(44, 22 + bob, 6, 3.4, "#ffffffcc");
    t.circle(38.5, 28 + bob, 1.8, "#ffffff99");
    t.outline(INK); t.outline(INK);
}

function angler(t, i) {
    // Lanternjaw, the elite. 160px cell.
    const sway = [-5, 0, 5][i], jaw = [0, 4, 8][i];
    part(t, (q) => q.poly([[26, 88], [4, 62 + sway], [12, 90], [4, 116 + sway]], "#2c5f8f"), { shadow: 3 });
    part(t, (q) => q.poly([[62, 44], [76, 20], [100, 40]], "#2c5f8f"), { shadow: 3 });
    part(t, (q) => {
        q.ellipse(84, 84, 58, 48, "#4d8fbf", "#17305f");
        q.ellipse(92, 112, 40, 18, "#2a4f85");
    }, { shadow: 8, shade: "#0b1136", dark: 0.5 });
    for (const [x, y, r] of [[58, 62, 4], [72, 50, 3], [48, 84, 3], [64, 92, 2.5]]) t.circle(x, y, r, "#8fd8ff66");
    // Maw.
    part(t, (q) => q.ellipse(114, 96 + jaw * 0.3, 38, 22 + jaw, "#3b0f3f", "#7a1838"), { cel: false, ol: 2 });
    for (let k = 0; k < 6; k++) {
        const x = 84 + k * 12;
        t.poly([[x - 6, 76 - Math.abs(k - 2.5)], [x, 96 - jaw * 0.2], [x + 6, 76 - Math.abs(k - 2.5)]], "#fff9e8");
        t.poly([[x - 5, 118 + jaw - Math.abs(k - 2.5) * 1.5], [x, 102 + jaw * 0.6], [x + 5, 118 + jaw - Math.abs(k - 2.5) * 1.5]], "#f2ecd8");
    }
    t.outline(INK);
    // Eye.
    part(t, (q) => eye(q, 100, 60, 13, 0.7, "#c62f45"), { cel: false, ol: 1 });
    t.line(84, 44, 118, 54, INK, 6);
    // Lure on a stalk.
    let px = 92, py = 38;
    for (let s = 1; s <= 8; s++) {
        const u = s / 8, nx = 92 + u * 44 + sway * u, ny = 38 - Math.sin(u * 2.6) * 26 + u * 16;
        t.line(px, py, nx, ny, INK, 5.5); px = nx; py = ny;
    }
    px = 92; py = 38;
    for (let s = 1; s <= 8; s++) {
        const u = s / 8, nx = 92 + u * 44 + sway * u, ny = 38 - Math.sin(u * 2.6) * 26 + u * 16;
        t.line(px, py, nx, ny, "#6db4d8", 2.5); px = nx; py = ny;
    }
    softDisc(t, px, py, 22, "#ffe98a", 1.6, 0.9);
    part(t, (q) => q.circle(px, py, 8, "#fffbd0", "#ffc83a"), { cel: false, ol: 1 });
}

function kraken(t, i) {
    // Old Mother Undertow. 320px cell, drawn big and bold.
    const ph = i / 4 * Math.PI * 2;
    const arm = (bx, by, dir, len, off, c1, c2, wide) => {
        const pts = [];
        for (let s = 0; s <= 30; s++) {
            const u = s / 30, a = Math.sin(u * 4.4 + ph + off) * 34 * u;
            pts.push([bx + dir * (u * len * 0.55 + a * 0.55), by + u * len * 0.9 + Math.cos(u * 3 + ph + off) * 10 * u, wide * (1 - u * 0.86)]);
        }
        for (const [x, y, r] of pts) t.circle(x, y, r + 3, INK);
        for (const [x, y, r] of pts) t.circle(x, y, r, c1);
        for (const [x, y, r] of pts) t.circle(x - dir * r * 0.35, y, r * 0.5, c2);
        for (let s = 3; s < 27; s += 4) { const [x, y, r] = pts[s]; t.circle(x + dir * r * 0.45, y, r * 0.34, "#ffc7b8"); }
    };
    arm(96, 190, -1, 130, 0.0, "#b02860", "#d94470", 26);
    arm(224, 190, 1, 130, 0.9, "#b02860", "#d94470", 26);
    arm(124, 210, -1, 104, 2.0, "#c43268", "#ea5c80", 24);
    arm(196, 210, 1, 104, 3.0, "#c43268", "#ea5c80", 24);
    arm(146, 218, -0.5, 96, 4.1, "#d43e70", "#f4708c", 22);
    arm(174, 218, 0.5, 96, 5.2, "#d43e70", "#f4708c", 22);
    part(t, (q) => {
        q.ellipse(160, 118, 96, 104, "#e8527c", "#7a1a6a");
        q.poly([[160, 2], [190, 40], [130, 40]], "#e8527c");
        q.ellipse(160, 196, 72, 40, "#7a1a6a");
    }, { shadow: 12, rim: 4, shade: "#2a0a58", dark: 0.5, light: 0.3, ol: 3 });
    for (const [x, y, r] of [[104, 62, 12], [128, 38, 8], [218, 56, 10], [92, 104, 7], [196, 30, 6], [234, 96, 8]]) {
        t.circle(x, y, r + 2, "#7a1a6a88"); t.circle(x, y, r, "#ffb3c4aa");
    }
    t.ellipse(118, 52, 26, 13, "#ffffff55");
    // Furious eyes that glow.
    for (const s of [-1, 1]) {
        const x = 160 + s * 44, y = 128;
        part(t, (q) => q.ellipse(x, y, 32, 30, "#fff6c0", "#ffc83a"), { cel: false, ol: 3 });
        t.ellipse(x, y + 3, 8, 22, INK);
        t.circle(x - 3, y - 7, 4, "#ffffff");
        t.line(x + s * 42, y - 44, x - s * 40, y - 12, INK, 13);
    }
    // Mouth.
    part(t, (q) => q.ellipse(160, 186, 30, 14 + 5 * Math.sin(ph), "#2a0a38"), { cel: false, ol: 2 });
    for (let k = -2; k <= 2; k++) t.poly([[160 + k * 11 - 5, 176], [160 + k * 11, 188], [160 + k * 11 + 5, 176]], "#fff9e8");
}

// --- FX sheet (64px cells) ----------------------------------------------------------------

const round = (cx, cy, rx, ry, a0, a1, n = 16) => Array.from({ length: n + 1 }, (_, i) => { const u = a0 + (a1 - a0) * i / n; return [cx + Math.cos(u) * rx, cy + Math.sin(u) * ry]; });
const PI = Math.PI;
const STROKES = {
    0: [round(32, 32, 17, 22, 0, PI * 2, 28)],
    1: [[[21, 18], [34, 10], [34, 54]]],
    2: [[...round(32, 22, 17, 13, PI * 1.05, PI * 2.25), [15, 53], [50, 53]]],
    3: [[...round(31, 21, 16, 11, PI * 1.1, PI * 2.45), ...round(31, 42, 18, 11, -PI * 0.45, PI * 0.9)]],
    4: [[[42, 54], [42, 10], [13, 40], [52, 40]]],
    5: [[[47, 11], [20, 11], [17, 29], ...round(31, 40, 18, 14, -PI * 0.6, PI * 0.85)]],
    6: [[...round(36, 32, 19, 22, -PI * 0.42, -PI * 1.1, 8), ...round(32, 41, 17, 13, PI, PI * 3, 22)]],
    7: [[[14, 11], [50, 11], [27, 54]]],
    8: [round(32, 21, 14, 11, 0, PI * 2, 22), round(32, 42, 17, 12, 0, PI * 2, 22)],
    9: [[...round(32, 22, 17, 13, 0, PI * 2, 22), ...round(28, 32, 21, 22, 0, PI * 0.5, 8)]],
};

function digit(t, n) {
    const draw = (c, w) => {
        for (const stroke of STROKES[n]) for (let i = 0; i + 1 < stroke.length; i++) t.line(stroke[i][0], stroke[i][1], stroke[i + 1][0], stroke[i + 1][1], c, w);
    };
    draw(INK, 18); draw("#ffffff", 10.5);
}

function shard(t, a, c) {
    part(t, (q) => q.poly([[32 + Math.cos(a) * 24, 32 + Math.sin(a) * 24], [32 + Math.cos(a + 2.4) * 15, 32 + Math.sin(a + 2.4) * 15], [32 + Math.cos(a - 2.2) * 13, 32 + Math.sin(a - 2.2) * 13]], c), { shadow: 2, ol: 0 });
}

function defineFx(fx) {
    fx.add("shadow", (t) => softDisc(t, 32, 32, 30, "#06122e", 0.8, 1.1));
    fx.add("glow", (t) => softDisc(t, 32, 32, 31, "#ffffff", 2.2));
    fx.add("dot", (t) => t.circle(32, 32, 26, "#ffffff"));
    for (const [key, a, b, c] of [["pearl0", "#ffffff", "#7fe4ff", "#2b9fc4"], ["pearl1", "#ffe6fb", "#ff9ae0", "#c64fb8"], ["pearl2", "#fff6c8", "#ffc93f", "#d9802a"]]) {
        fx.add(key, (t) => {
            softDisc(t, 32, 32, 30, b + "55", 1.4);
            part(t, (q) => q.circle(32, 32, 15, a, c), { shadow: 3, ol: 2 });
            t.ellipse(27, 26, 5, 3.2, "#ffffffee");
        });
    }
    fx.add("heart", (t) => {
        softDisc(t, 32, 32, 31, "#ff86a855", 1.3);
        t.circle(32, 32, 24, "#ffffff22");
        t.circle(32, 32, 24, "#7fe4ff", "#2b9fc4");
        t.circle(32, 32, 21.5, "#123a6e");
        part(t, (q) => { q.circle(25, 27, 9, "#ff7a8e"); q.circle(39, 27, 9, "#ff7a8e"); q.poly([[17, 31], [47, 31], [32, 49]], "#e8385c"); }, { shadow: 2, ol: 1 });
        t.ellipse(23, 24, 3, 2, "#ffffffdd");
    });
    fx.add("vacuum", (t) => {
        softDisc(t, 32, 32, 31, "#ffe98a66", 1.3);
        part(t, (q) => {
            q.line(19, 16, 19, 34, "#ff5e6c", 13); q.line(45, 16, 45, 34, "#ff5e6c", 13);
            for (let a = 0; a <= 12; a++) { const u = a / 12 * Math.PI, v = (a + 1) / 12 * Math.PI; if (a < 12) q.line(32 + Math.cos(u) * 13, 34 + Math.sin(u) * 13, 32 + Math.cos(v) * 13, 34 + Math.sin(v) * 13, "#ff5e6c", 13); }
            q.rect(13, 10, 13, 8, "#eafcff"); q.rect(39, 10, 13, 8, "#eafcff");
        }, { shadow: 3, ol: 2 });
    });
    fx.add("clam0", (t) => {
        softDisc(t, 32, 34, 31, "#ffe98a88", 1.2);
        part(t, (q) => { q.ellipse(32, 44, 25, 12, "#ffa9d8", "#c64fb8"); }, { shadow: 3 });
        t.circle(32, 34, 8, "#fff6c8", "#ffc93f");
        part(t, (q) => {
            q.ellipse(32, 24, 25, 17, "#ffd0ec", "#e06cc8");
        }, { shadow: 3 });
        for (let k = -2; k <= 2; k++) t.line(32 + k * 2, 10, 32 + k * 9, 33, "#c64fb888", 2);
    });
    fx.add("harpoon", (t) => {
        t.line(2, 32, 40, 32, INK, 8); t.line(2, 32, 40, 32, "#ffe08a", 4);
        part(t, (q) => q.poly([[38, 22], [60, 32], [38, 42], [44, 32]], "#eafcff"), { shadow: 2 });
        t.line(4, 26, 10, 32, "#ff6b5e", 3); t.line(4, 38, 10, 32, "#ff6b5e", 3);
    });
    fx.add("trident", (t) => {
        t.line(2, 32, 42, 32, INK, 8); t.line(2, 32, 42, 32, "#7dffcf", 4);
        for (const dy of [-13, 0, 13]) part(t, (q) => { q.line(30, 32 + dy * 0.2, 46, 32 + dy, "#ffd84d", 4); q.poly([[44, 26 + dy], [62, 32 + dy], [44, 38 + dy]], "#ffd84d"); }, { shadow: 2, ol: 1 });
    });
    fx.add("razor", (t) => {
        part(t, (q) => q.poly([[8, 22], [2, 30], [8, 36], [16, 30]], "#ff6b5e"), { shadow: 1 });
        part(t, (q) => { q.ellipse(36, 30, 24, 11, "#dff7ff", "#58a8d8"); q.poly([[30, 20], [24, 6], [44, 20]], "#eafcff"); q.poly([[32, 40], [24, 52], [42, 40]], "#eafcff"); }, { shadow: 3 });
        t.circle(50, 27, 3.4, INK).circle(50.8, 26.2, 1.1, "#fff");
        t.line(44, 37, 57, 34, INK, 2.5);
    });
    fx.add("shark", (t) => {
        part(t, (q) => q.poly([[10, 30], [0, 18], [4, 30], [0, 44]], "#7a8fd0"), { shadow: 1 });
        part(t, (q) => { q.ellipse(34, 32, 28, 13, "#b6c8ff", "#5a6fc0"); q.ellipse(36, 39, 20, 6, "#f0f4ff"); q.poly([[28, 22], [20, 2], [44, 21]], "#8fa4e8"); }, { shadow: 3 });
        t.circle(52, 28, 3.2, INK);
        t.line(46, 39, 60, 35, INK, 2.5);
        for (let k = 0; k < 4; k++) t.poly([[46 + k * 3.4, 38.5 - k], [48 + k * 3.4, 42 - k], [49.5 + k * 3.4, 37.8 - k]], "#fff");
    });
    fx.add("torpedo", (t) => {
        part(t, (q) => q.poly([[12, 32], [2, 20], [8, 32], [2, 44]], "#ff6b5e"), { shadow: 1 });
        part(t, (q) => { q.ellipse(32, 32, 22, 9.5, "#ffe08a", "#e0902a"); q.rect(36, 23, 5, 18, "#ff6b5e"); q.ellipse(50, 32, 6, 7, "#ff6b5e"); }, { shadow: 3 });
    });
    fx.add("minitorp", (t) => {
        part(t, (q) => { q.ellipse(32, 32, 17, 11, "#c0f06a", "#2fb36f"); q.poly([[18, 32], [6, 22], [6, 42]], "#2fb36f"); }, { shadow: 2 });
        t.circle(40, 29, 3.4, "#fff").circle(41, 29, 1.8, INK);
        for (let k = 0; k < 3; k++) t.poly([[40 + k * 3, 37], [41.5 + k * 3, 41], [43 + k * 3, 37]], "#fff");
    });
    for (const [key, c1, c2] of [["mine0", "#58607a", "#2a2f4a"], ["mine1", "#6d7696", "#343a5c"]]) {
        fx.add(key, (t) => {
            for (let a = 0; a < 8; a++) { const u = a / 8 * Math.PI * 2; t.line(32, 32, 32 + Math.cos(u) * 25, 32 + Math.sin(u) * 25, INK, 8); t.line(32 + Math.cos(u) * 16, 32 + Math.sin(u) * 16, 32 + Math.cos(u) * 24, 32 + Math.sin(u) * 24, "#ffd84d", 3.5); }
            part(t, (q) => q.circle(32, 32, 18, c1, c2), { shadow: 3, ol: 2 });
            t.circle(32, 32, 6, key === "mine1" ? "#ff5e5e" : "#7a2030");
            t.circle(26, 25, 3, "#ffffff77");
        });
    }
    fx.add("inkblob", (t) => {
        // Hazards must read on every zone colour, so they get a hot core and a pale rim.
        softDisc(t, 32, 32, 31, "#ff4fa888", 1.1);
        part(t, (q) => q.circle(32, 32, 14, "#ff8ad0", "#d6157e"), { shadow: 3, ol: 2, ink: "#fff0f8" });
        t.circle(27, 27, 3.4, "#ffffffdd");
    });
    fx.add("spine", (t) => {
        part(t, (q) => q.poly([[8, 25], [58, 32], [8, 39]], "#ffe9b0"), { shadow: 2, ol: 2 });
    });
    fx.add("bubble", (t) => {
        t.circle(32, 32, 24, "#ffffff30");
        const q = blank(t); q.circle(32, 32, 24, "#eafcffcc"); q.circle(32, 32, 21, [0, 0, 0, 0]);
        const r = blank(t); r.circle(32, 32, 24, "#eafcffcc");
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (Math.hypot(x + 0.5 - 32, y + 0.5 - 32) < 21.5) r.data[r.index(x, y) + 3] = 0;
        blit(t, r);
        t.ellipse(23, 22, 6, 4, "#ffffffdd");
        t.circle(40, 42, 2.4, "#ffffff77");
    });
    fx.add("spark", (t) => {
        t.poly([[32, 2], [38, 26], [62, 32], [38, 38], [32, 62], [26, 38], [2, 32], [26, 26]], "#ffffff");
    });
    fx.add("shard0", (t) => shard(t, 0.3, "#ffffff"));
    fx.add("shard1", (t) => shard(t, 2.1, "#ffffff"));
    fx.add("ring", (t) => {
        softDisc(t, 32, 32, 31, "#ffffff00");
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const d = Math.abs(Math.hypot(x + 0.5 - 32, y + 0.5 - 32) - 26);
            if (d < 5) t.set(x, y, [1, 1, 1, 1 - d / 5]);
        }
    });
    fx.add("wave", (t) => {
        // A crescent of surf, seen from above, moving right.
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const d = Math.hypot(x + 0.5 + 34, y + 0.5 - 32), lead = (92 - d) / 3, tail = (d - 58) / 30, ends = 1 - (Math.abs(y - 32) / 33) ** 2;
            if (d < 92 && d > 58) t.set(x, y, [0.92, 0.99, 1, Math.max(0, Math.min(1, lead) * tail * tail * ends)]);
        }
    });
    fx.add("swirl", (t) => {
        for (let arm = 0; arm < 3; arm++) {
            for (let s = 0; s < 90; s++) {
                const u = s / 90, a = arm / 3 * Math.PI * 2 + u * 4.6, r = 4 + u * 26;
                t.circle(32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3.6 - u * 2.2, [1, 1, 1, 0.8 - u * 0.5]);
            }
        }
    });
    for (let n = 0; n < 10; n++) fx.add("d" + n, (t) => digit(t, n));
    // Fat bolt, for tiny HUD use and for the crit tag.
    fx.add("bolt", (t) => {
        part(t, (q) => q.poly([[38, 4], [16, 36], [30, 36], [24, 60], [50, 26], [35, 26]], "#ffd84d"), { shadow: 2, ol: 2 });
    });
    fx.add("crown", (t) => {
        part(t, (q) => { q.poly([[8, 50], [4, 18], [20, 32], [32, 10], [44, 32], [60, 18], [56, 50]], "#ffd84d"); }, { shadow: 3, ol: 2 });
        t.circle(32, 40, 4, "#ff6b5e");
    });
    fx.add("skull", (t) => {
        part(t, (q) => { q.ellipse(32, 26, 20, 19, "#fff9e8", "#d6cdb2"); q.rect(22, 40, 20, 12, "#e4dcc2"); }, { shadow: 3, ol: 2 });
        t.circle(24, 27, 6, INK).circle(40, 27, 6, INK);
        t.line(28, 44, 28, 51, INK, 2); t.line(36, 44, 36, 51, INK, 2);
    });
}

// --- Cards and HUD icons (96px cells) --------------------------------------------------------

function badge(t, c1, c2) {
    part(t, (q) => {
        q.circle(48, 48, 43, c1, c2);
    }, { shadow: 5, rim: 3, ol: 2, dark: 0.25 });
}

function defineIcons(ic) {
    const scaled = (key) => (t) => {
        // Reuse an fx frame, enlarged, by repainting at 1.5x through the same function.
        const q = blank(t, 64, 64);
        FX.frames[FX.at[key]](q);
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const sx = x / 1.45 - 1, sy = y / 1.45 - 1, ix = Math.floor(sx), iy = Math.floor(sy);
            if (ix < 0 || iy < 0 || ix > 62 || iy > 62) continue;
            const fx = sx - ix, fy = sy - iy, px = [0, 0, 0, 0];
            for (const [ox, oy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
                const o = q.index(ix + ox, iy + oy), a = q.data[o + 3] / 255 * w;
                px[0] += q.data[o] * a; px[1] += q.data[o + 1] * a; px[2] += q.data[o + 2] * a; px[3] += a;
            }
            if (px[3] > 0.01) t.set(x, y, [px[0] / px[3] / 255, px[1] / px[3] / 255, px[2] / px[3] / 255, px[3]]);
        }
    };
    const on = (c1, c2, key, extra) => (t) => { badge(t, c1, c2); scaled(key)(t); extra?.(t); };

    ic.add("harpoon", on("#3fa7d6", "#14508f", "harpoon"));
    ic.add("razor", on("#ff9a7a", "#c62f45", "razor"));
    ic.add("eel", (t) => {
        badge(t, "#8f6bff", "#3a1f96");
        const pts = [[62, 10], [36, 42], [58, 44], [32, 86]];
        for (const [w, c] of [[17, INK], [9, "#ffe066"], [3.5, "#ffffff"]]) for (let i = 0; i < 3; i++) t.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, w);
    });
    ic.add("sonar", (t) => {
        badge(t, "#3fe0c0", "#127a7a");
        for (const r of [34, 23, 12]) {
            for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
                const d = Math.hypot(x + 0.5 - 48, y + 0.5 - 48), e = Math.abs(d - r);
                if (e < 3.5 && d < 41) t.set(x, y, [1, 1, 1, Math.min(1, 3.5 - e)]);
            }
        }
        t.circle(48, 48, 6, "#ffffff");
    });
    ic.add("torpedo", on("#ffb04d", "#c0451e", "torpedo"));
    ic.add("mine", on("#7fa0c8", "#27345e", "mine1"));
    ic.add("whirl", (t) => {
        badge(t, "#3fb0ff", "#1a3f9f");
        for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 110; s++) {
            const u = s / 110, a = arm / 3 * Math.PI * 2 + u * 5, r = 4 + u * 33;
            t.circle(48 + Math.cos(a) * r, 48 + Math.sin(a) * r, 5 - u * 3, "#eafcff");
        }
    });
    ic.add("riptide", (t) => {
        badge(t, "#58e0ff", "#1a6fb0");
        for (const [oy, c] of [[-16, "#eafcff"], [2, "#eafcff"], [20, "#eafcff"]]) {
            let px = 14, py = 48 + oy;
            for (let s = 1; s <= 24; s++) { const x = 14 + s * 2.8, y = 48 + oy + Math.sin(s * 0.55) * 8; t.line(px, py, x, y, INK, 11); px = x; py = y; }
            px = 14; py = 48 + oy;
            for (let s = 1; s <= 24; s++) { const x = 14 + s * 2.8, y = 48 + oy + Math.sin(s * 0.55) * 8; t.line(px, py, x, y, c, 6); px = x; py = y; }
        }
    });
    // Passives.
    ic.add("whet", (t) => {
        badge(t, "#ffcf6a", "#c0701e");
        part(t, (q) => q.poly([[66, 12], [80, 26], [36, 72], [20, 76], [24, 58]], "#eafcff"), { shadow: 4 });
        part(t, (q) => q.line(28, 68, 16, 80, "#ff6b5e", 10), { shadow: 2 });
    });
    ic.add("flipper", (t) => {
        badge(t, "#7dffcf", "#1f9f8a");
        part(t, (q) => { q.ellipse(40, 30, 13, 16, "#ffd84d", "#ff9a3d"); q.poly([[28, 36], [52, 36], [78, 76], [52, 84], [32, 80]], "#3a7bd5"); }, { shadow: 4 });
        t.line(46, 50, 58, 76, "#ffffff55", 3); t.line(38, 52, 44, 78, "#ffffff55", 3);
    });
    ic.add("hull", (t) => {
        badge(t, "#ff9ab0", "#b02860");
        part(t, (q) => { q.poly([[48, 12], [78, 24], [74, 58], [48, 86], [22, 58], [18, 24]], "#ffe08a"); }, { shadow: 5, shade: "#7a3412" });
        for (const [x, y] of [[30, 30], [66, 30], [48, 22], [48, 68]]) { t.circle(x, y, 4, INK); t.circle(x, y, 2.6, "#fff4c0"); }
    });
    ic.add("gear", (t) => {
        badge(t, "#9ad8ff", "#2b6fc4");
        part(t, (q) => {
            q.circle(48, 48, 26, "#eafcff", "#a8c8e0");
            for (let a = 0; a < 8; a++) { const u = a / 8 * Math.PI * 2; q.line(48, 48, 48 + Math.cos(u) * 35, 48 + Math.sin(u) * 35, "#d0e4f4", 13); }
        }, { shadow: 4 });
        t.circle(48, 48, 12, INK); t.circle(48, 48, 9, "#3a7bd5");
    });
    ic.add("magnet", (t) => { badge(t, "#ffd0ec", "#c64fb8"); scaled("vacuum")(t); });
    ic.add("clam", on("#ffe6a0", "#d97a2a", "clam0"));
    ic.add("heart", (t) => {
        badge(t, "#ff9ab0", "#c62f45");
        part(t, (q) => { q.circle(35, 40, 18, "#ff5e7a"); q.circle(61, 40, 18, "#ff5e7a"); q.poly([[19, 48], [77, 48], [48, 82]], "#e8385c"); }, { shadow: 4 });
        t.ellipse(30, 33, 6, 4, "#ffffffdd");
    });
    ic.add("pearl", on("#9ae8ff", "#2b6fc4", "pearl2"));
    ic.add("trident", on("#ffd84d", "#d9602a", "trident"));
    ic.add("shark", on("#ffd84d", "#d9602a", "shark"));
    ic.add("storm", (t) => {
        badge(t, "#ffd84d", "#d9602a");
        for (const [dx, sc] of [[-14, 0.8], [12, 1]]) {
            const pts = [[62, 10], [36, 42], [58, 44], [32, 86]].map(([x, y]) => [48 + (x - 48) * sc + dx, 48 + (y - 48) * sc]);
            for (const [w, c] of [[15, INK], [8, "#a980ff"], [3, "#ffffff"]]) for (let i = 0; i < 3; i++) t.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, w);
        }
    });
    ic.add("song", (t) => {
        badge(t, "#ffd84d", "#d9602a");
        part(t, (q) => { q.ellipse(46, 44, 30, 18, "#7ab8e8", "#2a5fa8"); q.poly([[16, 40], [4, 24], [8, 54]], "#2a5fa8"); q.ellipse(50, 54, 22, 8, "#eafcff"); }, { shadow: 4 });
        t.circle(62, 38, 3.5, INK); t.line(38, 18, 34, 8, "#eafcff", 4); t.line(38, 18, 46, 9, "#eafcff", 4);
    });
    ic.add("piranha", on("#ffd84d", "#d9602a", "minitorp"));
    ic.add("gravmine", (t) => { badge(t, "#ffd84d", "#d9602a"); scaled("mine1")(t); for (let k = 0; k < 3; k++) t.circle(16 + k * 4, 18 + k * 2, 2.5, "#fff"); });
    ic.add("maelstrom", (t) => {
        badge(t, "#ffd84d", "#d9602a");
        t.circle(48, 48, 36, "#1a3f9f");
        for (let arm = 0; arm < 4; arm++) for (let s = 0; s < 110; s++) {
            const u = s / 110, a = arm / 4 * Math.PI * 2 + u * 6, r = 3 + u * 33;
            t.circle(48 + Math.cos(a) * r, 48 + Math.sin(a) * r, 4.5 - u * 2.4, "#eafcff");
        }
    });
    ic.add("tsunami", (t) => {
        badge(t, "#ffd84d", "#d9602a");
        part(t, (q) => { q.poly([[10, 74], [18, 40], [42, 18], [70, 14], [54, 26], [50, 42], [66, 54], [86, 74]], "#58e0ff"); }, { shadow: 4 });
        t.line(44, 20, 69, 15, "#fff", 5);
    });
}

// --- World ---------------------------------------------------------------------------

function wrapSet(t, x, y, c, a) {
    const w = t.width, h = t.height, k = rgba(c);
    t.set(((Math.floor(x) % w) + w) % w, ((Math.floor(y) % h) + h) % h, [k[0], k[1], k[2], a]);
}

const SAND = "#c9e6e0";
function seabed(t, seed) {
    const R = (() => { let s = seed * 7919 + 13; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
    const w = t.width, h = t.height;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        // Periodic, low-contrast dunes built from sines that repeat across the tile.
        const u = x / w * Math.PI * 2, v = y / h * Math.PI * 2;
        const n = Math.sin(u * 2 + Math.sin(v) * 1.2) * 0.5 + Math.sin(v * 3 + Math.sin(u * 2) * 1.5) * 0.35 + Math.sin(u + v) * 0.3;
        const m = 0.9 + n * 0.035;
        t.data[t.index(x, y)] = 201 * m; t.data[t.index(x, y) + 1] = 230 * m; t.data[t.index(x, y) + 2] = 224 * m; t.data[t.index(x, y) + 3] = 255;
    }
    // Scallops of rippled sand: soft dark crescents with a lit lip. Wrapped so tiles join.
    for (let i = 0; i < 26; i++) {
        const cx = R() * w, cy = R() * h, rx = 16 + R() * 20, ry = 6 + R() * 5;
        for (let yy = -ry; yy <= ry; yy++) for (let xx = -rx; xx <= rx; xx++) {
            const d = Math.hypot(xx / rx, yy / ry);
            if (d > 1) continue;
            const below = Math.hypot(xx / rx, (yy + 3) / ry);
            if (below > 1) wrapSet(t, cx + xx, cy + yy, "#ffffff", 0.14 * (1 - d * d));
            else wrapSet(t, cx + xx, cy + yy, "#5f96a6", 0.13 * (1 - d * d));
        }
    }
    // Grit and tiny pebbles.
    for (let i = 0; i < 170; i++) {
        const x = R() * w, y = R() * h, c = R() > 0.5 ? "#6fa0ac" : "#ffffff";
        wrapSet(t, x, y, c, 0.3); wrapSet(t, x + 1, y, c, 0.2); wrapSet(t, x, y + 1, c, 0.2);
    }
    for (let i = 0; i < 7; i++) {
        const x = 12 + R() * (w - 24), y = 12 + R() * (h - 24), r = 2 + R() * 2.5;
        t.ellipse(x, y + 1, r + 1, r * 0.7, "#5f96a666");
        t.ellipse(x, y, r, r * 0.7, "#e8f6f0");
    }
}

function caustic(t) {
    // Wrapped Voronoi edges: the light net you see on a pool floor.
    const w = t.width, h = t.height, pts = [];
    let s = 4242;
    const R = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 26; i++) pts.push([R() * w, R() * h]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const wx = x + Math.sin(y / h * 12.566) * 6, wy = y + Math.sin(x / w * 12.566) * 6;
        let a = 1e9, b = 1e9;
        for (const p of pts) {
            let dx = Math.abs(wx - p[0]) % w, dy = Math.abs(wy - p[1]) % h;
            if (dx > w / 2) dx = w - dx;
            if (dy > h / 2) dy = h - dy;
            const d = dx * dx + dy * dy;
            if (d < a) { b = a; a = d; } else if (d < b) b = d;
        }
        const e = Math.sqrt(b) - Math.sqrt(a), line = Math.max(0, 1 - e / 7);
        if (line > 0) t.set(x, y, [1, 1, 1, line * line * 0.9]);
    }
}

function kelp(t, f) {
    const sway = f ? 6 : -6;
    for (const [bx, h, c1, c2] of [[46, 96, "#2fb38f", "#7dffcf"], [66, 112, "#1f9f8a", "#58e8c0"], [84, 80, "#2fb38f", "#7dffcf"]]) {
        const pts = [];
        for (let s = 0; s <= 30; s++) { const u = s / 30; pts.push([bx + Math.sin(u * 6 + bx) * 6 + sway * u * u, 122 - u * h]); }
        for (const [x, y] of pts) t.circle(x, y, 7, INK);
        for (const [x, y] of pts) t.circle(x, y, 4.6, c1);
        for (let i = 3; i < pts.length; i += 5) {
            const [x, y] = pts[i], d = i % 2 ? 1 : -1;
            part(t, (q) => q.ellipse(x + d * 9, y - 3, 10, 5, c2, c1), { shadow: 1, ol: 2 });
        }
    }
}

function coral(t, hue) {
    const [a, b] = hue;
    const branch = (x, y, ang, len, w, d) => {
        const nx = x + Math.cos(ang) * len, ny = y + Math.sin(ang) * len;
        t.line(x, y, nx, ny, INK, w + 4);
        t.line(x, y, nx, ny, d % 2 ? a : b, w);
        if (d > 0) { branch(nx, ny, ang - 0.5, len * 0.76, w * 0.78, d - 1); branch(nx, ny, ang + 0.46, len * 0.72, w * 0.78, d - 1); }
        else t.circle(nx, ny, w * 0.9, "#fff4e0");
    };
    branch(64, 120, -Math.PI / 2, 30, 11, 3);
}

function rock(t) {
    part(t, (q) => {
        q.poly([[12, 110], [24, 62], [58, 42], [96, 54], [118, 110]], "#a8a49c");
        q.poly([[58, 42], [96, 54], [76, 76], [44, 70]], "#cfcbc0");
    }, { shadow: 7, dark: 0.45, ol: 3 });
    for (const [x, y] of [[40, 92], [86, 84], [62, 100]]) t.circle(x, y, 3.5, "#ff86c8");
    t.ellipse(70, 110, 54, 5, "#2fb38f");
}

function shells(t) {
    part(t, (q) => { q.ellipse(44, 96, 24, 18, "#ffd0ec", "#e06cc8"); }, { shadow: 3, ol: 2 });
    for (let k = -2; k <= 2; k++) t.line(44 + k, 80, 44 + k * 9, 112, "#c64fb8aa", 2);
    const n = 6;
    part(t, (q) => { for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? 7 : 19; q.line(90, 88, 90 + Math.cos(a) * r, 88 + Math.sin(a) * r, "#ffb36a", 6); } q.circle(90, 88, 10, "#ffb36a"); }, { shadow: 2, ol: 2 });
}

function wreck(t) {
    // Ribs of something enormous.
    for (let k = 0; k < 4; k++) {
        const x = 26 + k * 26, r = 34 - k * 3;
        for (let s = 0; s < 20; s++) {
            const a = Math.PI + s / 20 * Math.PI * 0.9;
            t.circle(x + Math.cos(a) * 12, 104 + Math.sin(a) * r * 1.5, 5.5 - s * 0.14, INK);
        }
        for (let s = 0; s < 20; s++) {
            const a = Math.PI + s / 20 * Math.PI * 0.9;
            t.circle(x + Math.cos(a) * 12, 104 + Math.sin(a) * r * 1.5, 3.4 - s * 0.1, "#e8e0c8");
        }
    }
}

function chest(t) {
    part(t, (q) => {
        q.poly([[22, 76], [106, 64], [112, 112], [28, 118]], "#b0713a");
        q.poly([[16, 66], [100, 46], [108, 66], [22, 84]], "#d99a55");
    }, { shadow: 5, ol: 3, dark: 0.5 });
    t.line(60, 58, 66, 114, "#ffd84d", 7);
    t.circle(62, 74, 6, "#ffd84d");
    t.circle(30, 110, 5, "#ffd84d").circle(44, 114, 4, "#ffc93f").circle(18, 116, 4, "#ffd84d");
}

function anemone(t, f) {
    const sw = f ? 4 : -4;
    for (let k = -4; k <= 4; k++) {
        const a = -Math.PI / 2 + k * 0.28, tx = 64 + Math.cos(a) * 42 + sw, ty = 96 + Math.sin(a) * 42;
        t.line(64 + k * 4, 100, tx, ty, INK, 10);
        t.line(64 + k * 4, 100, tx, ty, "#ff86c8", 6);
        t.circle(tx, ty, 5, "#fff0d0");
    }
    part(t, (q) => q.ellipse(64, 108, 25, 13, "#ffa9d8", "#a03fa8"), { shadow: 3, ol: 2 });
}

// --- Title logo -------------------------------------------------------------------------

const arc = (cx, cy, rx, ry, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
const GLYPHS = {
    D: [[[12, 6], [12, 74]], [[12, 6], ...arc(16, 40, 32, 34, -Math.PI / 2, Math.PI / 2), [12, 74]]],
    E: [[[44, 7], [12, 7], [12, 73], [44, 73]], [[12, 40], [38, 40]]],
    P: [[[12, 74], [12, 7]], [[12, 7], ...arc(24, 26, 22, 19, -Math.PI / 2, Math.PI / 2), [12, 45]]],
    T: [[[4, 8], [52, 8]], [[28, 8], [28, 74]]],
    R: [[[12, 74], [12, 7]], [[12, 7], ...arc(24, 25, 22, 18, -Math.PI / 2, Math.PI / 2), [14, 43]], [[26, 43], [46, 74]]],
    O: [arc(30, 40, 22, 33, 0, Math.PI * 2, 28)],
    U: [[[10, 6], [10, 50], ...arc(30, 50, 20, 23, Math.PI, 0).slice(1), [50, 6]]],
    B: [[[12, 74], [12, 7]], [[12, 7], ...arc(22, 23, 22, 16, -Math.PI / 2, Math.PI / 2), [12, 39]], [[12, 39], ...arc(24, 56, 24, 18, -Math.PI / 2, Math.PI / 2), [12, 74]]],
    L: [[[12, 6], [12, 73], [44, 73]]],
};

const advance = (ch, scale, gap) => (ch === "T" ? 58 : ch === "L" || ch === "E" ? 52 : ch === "O" ? 62 : 58) * scale + gap;

function word(t, str, y, scale, gap, stroke, top, bottom, seed) {
    const m = blank(t);
    const total = [...str].reduce((n, ch) => n + advance(ch, scale, gap), 0) - gap;
    let cx = (t.width - total) / 2;
    [...str].forEach((ch, i) => {
        const tilt = Math.sin(i * 2.3 + seed) * 0.08, dy = Math.sin(i * 1.7 + seed) * 7, g = GLYPHS[ch];
        for (const s of g) for (let k = 0; k + 1 < s.length; k++) {
            const r = (p) => {
                const px = (p[0] - 28) * scale, py = (p[1] - 40) * scale, c = Math.cos(tilt), sn = Math.sin(tilt);
                return [cx + 28 * scale + px * c - py * sn, y + 40 * scale + dy + px * sn + py * c];
            };
            const a = r(s[k]), b = r(s[k + 1]);
            m.line(a[0], a[1], b[0], b[1], "#ffffff", stroke);
        }
        cx += advance(ch, scale, gap);
    });
    return { m, top, bottom, h: 80 * scale, y };
}

function logo(t) {
    const words = [word(t, "DEEP", 14, 1.5, 22, 26, "#fff6b0", "#ff9d3d", 1), word(t, "TROUBLE", 166, 1.2, 8, 21, "#ffd9e0", "#ff4f6e", 4)];
    for (const { m, top, bottom, h, y } of words) {
        // Deep drop shadow.
        const shadow = blank(t);
        blit(shadow, m);
        silhouette(shadow, "#071233");
        for (let i = 0; i < 4; i++) shadow.outline("#071233");
        for (const off of [10, 8, 6, 4, 2]) blit(t, shadow, 1, 0, off);
        const face = blank(t);
        blit(face, m);
        const a = color(top);
        for (let yy = 0; yy < face.height; yy++) for (let x = 0; x < face.width; x++) {
            const o = face.index(x, yy);
            if (!face.data[o + 3]) continue;
            const c = a.lerp(bottom, Math.max(0, Math.min(1, (yy - y) / (h + 10))));
            face.data[o] = c.r * 255; face.data[o + 1] = c.g * 255; face.data[o + 2] = c.b * 255;
        }
        cel(face, { shadow: 5, rim: 3, shade: "#b0164e", dark: 0.32, light: 0.55 });
        for (let i = 0; i < 4; i++) face.outline(INK);
        blit(t, face);
    }
    for (const [x, y, r] of [[46, 40, 8], [30, 74, 5], [52, 104, 3.5], [664, 30, 7], [682, 66, 10], [668, 106, 4.5], [694, 112, 3.5]]) {
        t.circle(x, y, r, "#ffffff26");
        t.circle(x - r * 0.3, y - r * 0.35, r * 0.28, "#ffffffdd");
        const q = blank(t); q.circle(x, y, r, "#eafcffbb");
        for (let yy = 0; yy < q.height; yy++) for (let xx = 0; xx < q.width; xx++) if (Math.hypot(xx + 0.5 - x, yy + 0.5 - y) < r - 1.6) q.data[q.index(xx, yy) + 3] = 0;
        blit(t, q);
    }
}

// --- Registration ---------------------------------------------------------------------------

export const MOBS = new Sheet("mobs", 80);
export const FX = new Sheet("fx", 64);
export const ICONS = new Sheet("icons", 96);
export const PROPS = new Sheet("props", 128);

export function defineArt(game) {
    MOBS.mob("grump", 3, grump).mob("crab", 3, crab).mob("jelly", 3, jelly).mob("puffer", 3, puffer)
        .mob("eel", 3, eel).mob("inkling", 3, inkling).mob("bonefish", 3, bonefish);
    MOBS.paint(game);
    defineFx(FX);
    FX.paint(game);
    defineIcons(ICONS);
    ICONS.paint(game);

    PROPS.add("kelp0", (t) => kelp(t, 0)).add("kelp1", (t) => kelp(t, 1))
        .add("coral0", (t) => coral(t, ["#ff7a8e", "#ffa98a"])).add("coral1", (t) => coral(t, ["#b98aff", "#ff86c8"]))
        .add("rock", rock).add("shells", shells).add("ribs", wreck).add("chest", chest)
        .add("anemone0", (t) => anemone(t, 0)).add("anemone1", (t) => anemone(t, 1));
    PROPS.paint(game);

    for (let i = 0; i < 3; i++) game.assets.paint("sand" + i, 256, 256, (p) => seabed(p, i + 1), { smooth: true });
    game.assets.paint("caustic", 256, 256, caustic, { smooth: true });
    game.assets.paint("dark", 128, 128, (p) => {
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const d = Math.hypot(x + 0.5 - 64, y + 0.5 - 64) / 64, k = Math.min(1, Math.max(0, (d - 0.22) / 0.72));
            const o = p.index(x, y); p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = 255 * k * k * (3 - 2 * k);
        }
    }, { smooth: true });
    game.assets.paint("ray", 64, 256, (p) => {
        for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
            const u = 1 - Math.abs(x + 0.5 - 32) / 32, v = 1 - y / 256;
            const a = u * u * (3 - 2 * u) * v * v * 0.6;
            if (a > 0) { const o = p.index(x, y); p.data[o] = 220; p.data[o + 1] = 250; p.data[o + 2] = 255; p.data[o + 3] = a * 255; }
        }
    }, { smooth: true });

        const big = (name, cell, n, fn) => {
        game.assets.paint(name, cell, cell, (p, f) => {
            const t = blank(p);
            if (f < n) fn(t, f);
            else { blit(t, new p.constructor(cell, cell, p.data, p.stride, (f - n) * cell)); silhouette(t); } // Flash frames copy the art.
            blit(p, t);
        }, { frames: n * 2, smooth: true });
    };
    big("hero", 96, 4, hero);
    big("angler", 160, 3, angler);
    big("kraken", 320, 4, kraken);
    game.assets.paint("logo", 720, 300, logo, { smooth: true });
}

