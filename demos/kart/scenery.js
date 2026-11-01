// Builds each circuit into merged meshes: the road, walls and everything around it, cut into chunks along the
// lap so anything behind the camera costs nothing. Everything is one vertex-coloured material.
import { MB, hex, mix, mul } from "./meshkit.js";

export const THEMES = {
    aisle: {
        sky: ["#ffe9c2", "#ffd7a0"], fog: "#ffe3b8", fogNear: 70, fogFar: 230, sun: "#fff1d6", sunI: 0.55, ambSky: "#fff4e4", ambGround: "#d9b892", dir: [-0.35, -1, -0.25],
        road: ["#e8cfa2", "#c9a97a"], kerb: ["#ff4b3e", "#fff6e6"], rough: "#a9784e", wall: "#ffc233", wall2: "#ff8a1f", line: "#ff4b3e", floor: "#e9c897", dash: null,
    },
    freezer: {
        sky: ["#d9f6ff", "#a9e6ff"], fog: "#c8f1ff", fogNear: 60, fogFar: 210, sun: "#e6fbff", sunI: 0.5, ambSky: "#e8fbff", ambGround: "#8fc6e8", dir: [0.3, -1, -0.3],
        road: ["#a9dcf0", "#82c6e4"], kerb: ["#21a4e8", "#ffffff"], rough: "#5aa6cc", wall: "#ffffff", wall2: "#7fdcff", line: "#ff5fa2", floor: "#a5ddf3", dash: null,
    },
    bakery: {
        sky: ["#ffcf8f", "#ff9f5e"], fog: "#ffc384", fogNear: 60, fogFar: 200, sun: "#ffe3b0", sunI: 0.55, ambSky: "#ffe6c0", ambGround: "#b5764a", dir: [-0.4, -1, 0.2],
        road: ["#e0b070", "#c98f50"], kerb: ["#7a3e22", "#ffe9c2"], rough: "#96603a", wall: "#b4502e", wall2: "#ffcf8f", line: "#7a3e22", floor: "#c9915a", dash: null,
    },
    garden: {
        sky: ["#5cc8ff", "#d6f5ff"], fog: "#c9f0ff", fogNear: 90, fogFar: 300, sun: "#fff4d0", sunI: 0.72, ambSky: "#d8f1ff", ambGround: "#7fae5a", dir: [-0.5, -1, -0.35],
        road: ["#c9a56e", "#bb965f"], kerb: ["#c9552f", "#fff6e6"], rough: "#6fbe4e", wall: "#2f9a48", wall2: "#47b85a", line: "#fff6e6", floor: "#5eb04a", dash: null,
    },
    dock: {
        sky: ["#3a2a6b", "#ff8a5c"], fog: "#c9698a", fogNear: 80, fogFar: 280, sun: "#ffc28a", sunI: 0.75, ambSky: "#a79be0", ambGround: "#54406a", dir: [0.7, -0.75, 0.3],
        road: ["#5a5470", "#524c68"], kerb: ["#ffc233", "#2b2140"], rough: "#413b58", wall: "#ffc233", wall2: "#d6cfe0", line: "#ffc233", floor: "#3c3650", dash: "#ffc233",
    },
    rooftop: {
        sky: ["#1a1147", "#e8388a"], fog: "#6a2a86", fogNear: 90, fogFar: 320, sun: "#ffb3d9", sunI: 0.6, ambSky: "#7f7be8", ambGround: "#3f2a6a", dir: [-0.6, -0.8, 0.45],
        road: ["#433c66", "#3b355c"], kerb: ["#ff3fa0", "#31e1ff"], rough: "#2e2a4a", wall: "#8a84b8", wall2: "#ff3fa0", line: "#31e1ff", floor: "#231f3e", dash: "#31e1ff",
    },
};

const rnd = (seed) => { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let r = t; r = Math.imul(r ^ (r >>> 15), r | 1); r ^= r + Math.imul(r ^ (r >>> 7), r | 61); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; };
const CHUNK = 28;

const PRODUCTS = ["#ff4b3e", "#ffc233", "#2ec4a6", "#38b6ff", "#7b4dff", "#ff5fa2", "#fff6e6", "#ff8a1f", "#b4e33d"].map(hex);
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

class Site {
    constructor(T) {
        this.T = T; this.th = THEMES[T.def.theme];
        this.chunks = Array.from({ length: Math.ceil(T.n / CHUNK) }, () => new MB());
        this.far = new MB();
        this.r = rnd(T.def.id.length * 977 + T.n);
        this.minY = Math.min(...T.py) - 0.6;
    }
    mb(i) { return this.chunks[Math.floor(this.T.wrap(i) / CHUNK)]; }
    /** Transform so local +z faces the road from the given side, at offset beyond the wall, resting on floorY if given. */
    face(i, side, off, y) {
        const T = this.T, d = side * (T.wall[i] + off), p = T.point(i, d);
        const yaw = Math.atan2(-T.tz[i], T.tx[i]) + (side > 0 ? Math.PI : 0);
        const mb = this.mb(i);
        mb.at(p[0], y ?? p[1], p[2], yaw);
        return mb;
    }
    /** Is this ground spot clear of every piece of road except around sample i? */
    clear(x, z, margin, skip = -1, win = 0) { return this.T.clearance(x, z, skip, win) > margin; }
    /** Each spot along the lap, with a stride. */
    each(step, fn, start = 0) { for (let i = start; i < this.T.n; i += step) fn(i); }
}

function road(S) {
    const { T, th } = S;
    const R0 = hex(th.road[0]), R1 = hex(th.road[1]), K0 = hex(th.kerb[0]), K1 = hex(th.kerb[1]), RG = hex(th.rough), LINE = hex(th.line);
    const WA = hex(th.wall), WB = hex(th.wall2), ICE = hex("#d6f6ff"), ICE2 = hex("#b6ecff"), DASH = th.dash ? hex(th.dash) : null;
    const isIndoor = ["aisle", "freezer", "bakery"].includes(T.def.theme);
    const lanes = 4;
    for (let i = 0; i < T.n; i++) {
        if (T.surf[i] === 3) continue;
        const j = (i + 1) % T.n, mb = S.mb(i), void2 = T.surf[j] === 3;
        const hw0 = T.hw[i], hw1 = T.hw[j], w0 = T.wall[i], w1 = T.wall[j];
        const q = (a0, a1, c, c2 = c) => { // from a0..a1 as fractions: lateral in world units given per end as fn of end
            const p0 = T.point(i, a0(0)), p1 = T.point(i, a1(0));
            const p2 = void2 ? T.point(i, a1(0), 1) : T.point(j, a1(1)), p3 = void2 ? T.point(i, a0(0), 1) : T.point(j, a0(1));
            mb.quad(p0, p1, p2, p3, c, c, c2, c2);
        };
        const ice = T.surf[i] === 1;
        const check = Math.floor(i / 2) % 2;
        for (let l = 0; l < lanes; l++) {
            const a = l / lanes * 2 - 1, b = (l + 1) / lanes * 2 - 1;
            let c = (l + check) % 2 ? R0 : R1;
            if (!isIndoor) c = i % 8 < 4 ? R0 : R1;
            if (ice) c = (l + check) % 2 ? ICE : ICE2;
            q((e) => a * (e ? hw1 : hw0), (e) => b * (e ? hw1 : hw0), c);
        }
        if (DASH && i % 6 < 2) q(() => -0.14, () => 0.14, DASH);
        if (!isIndoor && !DASH && i % 6 < 2) q(() => -0.1, () => 0.1, LINE);
        const kc = Math.floor(i / 2) % 2 ? K0 : K1;
        q((e) => -(e ? hw1 : hw0) - 0.95, (e) => -(e ? hw1 : hw0), kc);
        q((e) => (e ? hw1 : hw0), (e) => (e ? hw1 : hw0) + 0.95, kc);
        const rg = i % 3 === 0 ? RG : mul(RG, 0.94);
        q((e) => -(e ? w1 : w0), (e) => -(e ? hw1 : hw0) - 0.95, rg);
        q((e) => (e ? hw1 : hw0) + 0.95, (e) => (e ? w1 : w0), rg);
        // Walls
        const H = T.def.wallH ?? 1.5;
        for (const side of [-1, 1]) {
            const a = T.point(i, side * w0), b = void2 ? T.point(i, side * w0, 1) : T.point(j, side * w1);
            const lo = Math.min(S.minY, a[1] - 3), col = Math.floor(i / 3) % 2 ? WA : WB, base = mul(col, 0.62);
            const at = [a[0], a[1] + H, a[2]], bt = [b[0], b[1] + H, b[2]];
            const out = side * 0.9;
            const ao = [a[0] + T.rx[i] * out, a[1] + H, a[2] + T.rz[i] * out], bo = [b[0] + T.rx[j] * out, b[1] + H, b[2] + T.rz[j] * out];
            if (side < 0) {
                mb.quad(a, b, bt, at, base, base, col, col);
                mb.quad(at, bt, bo, ao, mul(col, 1.08));
                mb.quad(bo, [bo[0], lo, bo[2]], [ao[0], lo, ao[2]], ao, mul(col, 0.7), mul(col, 0.25), mul(col, 0.25), mul(col, 0.7));
            } else {
                mb.quad(b, a, at, bt, base, base, col, col);
                mb.quad(bt, at, ao, bo, mul(col, 1.08));
                mb.quad([bo[0], lo, bo[2]], bo, ao, [ao[0], lo, ao[2]], mul(col, 0.25), mul(col, 0.7), mul(col, 0.7), mul(col, 0.25));
            }
        }
    }
    // Start line: a checked band.
    const mb = S.mb(0);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) {
        const hw = T.hw[0], a = -hw + c * 2 * hw / 8, b = a + 2 * hw / 8;
        const P = (d, u) => { const p = T.point(0, d, u); p[1] += 0.03; return p; };
        const u0 = r * 0.4, u1 = u0 + 0.4;
        mb.quad(P(a, u0), P(b, u0), P(b, u1), P(a, u1), (r + c) % 2 ? hex("#2b2140") : hex("#fff6e6"));
    }
    // Ramps: striped wedges.
    for (const ramp of T.ramps) {
        const mbr = S.mb(ramp.start);
        const lo = ramp.full ? -T.hw[ramp.start] : ramp.d - ramp.w / 2, hi = ramp.full ? T.hw[ramp.start] : ramp.d + ramp.w / 2;
        const pts = (k, d) => { const i = (ramp.start + k) % T.n; const p = T.point(i, d); return p; };
        for (let k = 0; k < ramp.len; k++) {
            const stripes = 8;
            for (let c = 0; c < stripes; c++) {
                const a = lo + (hi - lo) * c / stripes, b = lo + (hi - lo) * (c + 1) / stripes;
                const col = (c + k) % 2 ? hex("#ffc233") : hex("#2b2140");
                const p = [pts(k, a), pts(k, b), k === ramp.len - 1 ? null : pts(k + 1, b), k === ramp.len - 1 ? null : pts(k + 1, a)];
                if (!p[2]) { const iL = (ramp.start + k) % T.n; p[2] = T.point(iL, b, 0.98); p[3] = T.point(iL, a, 0.98); }
                for (const q of p) q[1] += 0.04;
                mbr.quad(p[0], p[1], p[2], p[3], col);
            }
        }
        // the face of the lip, for side and rear views
        const end = (ramp.start + ramp.len - 1) % T.n;
        const a = T.point(end, lo, 0.98), b = T.point(end, hi, 0.98);
        mbr.quad([b[0], b[1] - ramp.h, b[2]], [a[0], a[1] - ramp.h, a[2]], a, b, hex("#2b2140"));
    }
    // Gaps: a warning edge on each lip.
    for (const g of T.gaps) {
        const a = S.mb(g.i), i = T.wrap(g.i - 1), e = T.wrap(g.i + g.len), hw = T.hw[i];
        const L = T.point(i, -hw, 1), Rr = T.point(i, hw, 1);
        a.quad([Rr[0], Rr[1] - 30, Rr[2]], [L[0], L[1] - 30, L[2]], L, Rr, hex("#2b2140"));
        const L2 = T.point(e, -hw), R2 = T.point(e, hw);
        S.mb(e).quad([L2[0], L2[1] - 30, L2[2]], [R2[0], R2[1] - 30, R2[2]], R2, L2, hex("#2b2140"));
    }
}

// --- Reusable scenery ---------------------------------------------------------------------------------------
/** A bay of shelving: local x along the wall, front faces +z. */
function shelfBay(mb, r, w, h, d, frame) {
    mb.box(0, 0, -d / 2, w, h, d, frame, { noBack: true, shade: 0.7 });
    const rows = Math.max(2, Math.floor(h / 1.8));
    for (let k = 0; k < rows; k++) {
        const y = 0.4 + k * (h - 0.6) / rows;
        mb.box(0, y, 0.06, w * 0.98, 0.16, 0.5, mul(frame, 1.15), { noBack: true, shade: 0.9 });
        let x = -w / 2 + 0.2;
        const c = pick(r, PRODUCTS);
        while (x < w / 2 - 0.5) {
            const pw = 0.7 + r() * 0.75, ph = 0.8 + r() * 0.75, cc = r() < 0.6 ? c : pick(r, PRODUCTS);
            mb.front(x + pw / 2, y + 0.16, 0.3, pw * 0.92, ph, cc);
            x += pw;
        }
    }
}
function hangingSign(S, i, text, bg, fg, y = 8.6) {
    const T = S.T, mb = S.mb(i), p = T.point(i, 0), yaw = T.yaw(i);
    mb.at(p[0], p[1], p[2], yaw);
    const w = Math.max(T.hw[i] * 1.5, text.length * 1.9 + 2), h = 2.6;
    mb.box(0, y, 0.05, w, h, 0.3, bg, { shade: 0.9 });
    mb.box(0, y - 0.25, 0.05, w + 0.6, 0.25, 0.4, fg, { shade: 1 });
    for (const x of [-w / 2 + 1, w / 2 - 1]) mb.box(x, y + h, 0, 0.12, 40, 0.12, mul(hex("#2b2140"), 1.2));
    mb.text(text, [0, y + h / 2, 0.22], [1, 0, 0], [0, 1, 0], Math.min(1.7, (w - 2) / (text.length * 1.2)), fg);
    // from behind too, so it reads on the way back
    mb.text(text, [0, y + h / 2, -0.12], [-1, 0, 0], [0, 1, 0], Math.min(1.7, (w - 2) / (text.length * 1.2)), fg);
    mb.reset();
}
function canPyramid(mb, r, n, rad, col, label) {
    for (let lvl = 0; lvl < n; lvl++) {
        const count = n - lvl;
        for (let a = 0; a < count; a++) for (let b = 0; b < count; b++) {
            const x = (a - (count - 1) / 2) * rad * 2.1, z = (b - (count - 1) / 2) * rad * 2.1, y = lvl * rad * 2.4;
            mb.cyl(x, y, z, rad, rad * 2.4, 6, col, { top: hex("#dfe7f0"), cap: b === 0 || true });
            mb.cyl(x, y + rad * 0.7, z, rad * 1.02, rad, 6, label, { cap: false, shade: 1 });
        }
    }
}
function cereal(mb, w, h, d, col, col2) {
    mb.box(0, 0, 0, w, h, d, col, { shade: 0.85, top: mul(col, 1.1) });
    mb.box(0, h * 0.62, d / 2 + 0.01, w * 0.86, h * 0.26, 0.02, col2, { noBack: true, shade: 1 });
    mb.ball(0, h * 0.32, d / 2 + 0.02, w * 0.28, 8, 4, hex("#fff6e6"), { sz: 0.06 });
}
function lampPost(mb, h, col, glow) {
    mb.cyl(0, 0, 0, 0.26, h, 5, col);
    mb.box(0, h, 0.9, 0.4, 0.26, 2.2, col);
    mb.box(0, h - 0.1, 1.5, 0.9, 0.12, 1.4, glow, { shade: 1 });
}
function tree(mb, r, h, c1, c2) {
    mb.cyl(0, 0, 0, 0.5, h * 0.5, 5, hex("#8a5a3a"));
    mb.cyl(0, h * 0.35, 0, h * 0.34, h * 0.45, 7, c1, { r2: h * 0.14, rot: r() * 3 });
    mb.cyl(0, h * 0.62, 0, h * 0.26, h * 0.42, 7, c2, { r2: 0, rot: r() * 3 });
}
function pot(mb, r, s, c) {
    mb.cyl(0, 0, 0, 0.7 * s, 1.1 * s, 7, hex("#c9552f"), { r2: 1.0 * s, top: hex("#5b3a26") });
    mb.ball(0, 1.8 * s, 0, 0.95 * s, 6, 4, pick(r, [hex("#2f9a48"), hex("#47b85a")]));
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + r(); mb.ball(Math.cos(a) * 0.68 * s, (1.9 + r() * 0.5) * s, Math.sin(a) * 0.68 * s, 0.22 * s, 5, 3, c, { shade: false }); }
}
function building(mb, r, w, h, d) {
    const palette = ["#2c2560", "#3a2f78", "#22204e", "#402a70"].map(hex);
    const col = pick(r, palette), lit = pick(r, [hex("#ffd27a"), hex("#7df0ff"), hex("#ff8ad0")]);
    mb.box(0, -20, 0, w, h + 20, d, col, { shade: 0.6, top: mul(col, 1.2) });
    const cols = Math.floor(w / 3.4), rows = Math.floor(h / 5);
    for (const [side, len] of [[1, w], [-1, w]]) for (let a = 0; a < cols; a += 1) for (let b = 0; b < rows; b++) {
        if (r() < 0.72) continue;
        const x = -len / 2 + (a + 0.5) * len / cols, y = 2 + b * 5, s = side;
        mb.quad([x - 0.9 * s, y, s * (d / 2 + 0.05)], [x + 0.9 * s, y, s * (d / 2 + 0.05)], [x + 0.9 * s, y + 2.6, s * (d / 2 + 0.05)], [x - 0.9 * s, y + 2.6, s * (d / 2 + 0.05)], mul(lit, 1.5));
    }
}
function container(mb, w, h, d, col) {
    mb.box(0, 0, 0, w, h, d, col, { shade: 0.72, top: mul(col, 1.1) });
    const n = Math.floor(d / 1.2);
    for (let i = 0; i < n; i++) {
        const z = -d / 2 + (i + 0.5) * d / n;
        mb.box(w / 2 + 0.02, 0.1, z, 0.08, h - 0.2, 0.5, mul(col, 0.85), { shade: 0.9 });
        mb.box(-w / 2 - 0.02, 0.1, z, 0.08, h - 0.2, 0.5, mul(col, 0.85), { shade: 0.9 });
    }
}

// --- Halls and skies -----------------------------------------------------------------------------------------
function bounds(T) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < T.n; i++) { x0 = Math.min(x0, T.px[i]); x1 = Math.max(x1, T.px[i]); z0 = Math.min(z0, T.pz[i]); z1 = Math.max(z1, T.pz[i]); }
    return { x0: x0 - 60, x1: x1 + 60, z0: z0 - 60, z1: z1 + 60 };
}
function floorQuad(S, col, y, B) {
    S.far.quad([B.x0, y, B.z1], [B.x1, y, B.z1], [B.x1, y, B.z0], [B.x0, y, B.z0], col);
}
function hall(S, B, o) {
    const far = S.far, H = o.h, g = hex(S.th.ambGround);
    // A downward face only sees the ground colour of the ambient light, so bake the colour we actually want.
    const lift = (c) => [c[0] / (g[0] * 0.62), c[1] / (g[1] * 0.62), c[2] / (g[2] * 0.62)];
    o.ceil = lift(o.ceil); o.light = lift(o.light); S.lift = lift;
    far.quad([B.x0, H, B.z0], [B.x1, H, B.z0], [B.x1, H, B.z1], [B.x0, H, B.z1], o.ceil);
    const wall = (a, b) => far.quad([a[0], S.minY, a[1]], [b[0], S.minY, b[1]], [b[0], H, b[1]], [a[0], H, a[1]], o.wall, o.wall, o.wall2, o.wall2);
    wall([B.x0, B.z1], [B.x1, B.z1]); wall([B.x1, B.z1], [B.x1, B.z0]); wall([B.x1, B.z0], [B.x0, B.z0]); wall([B.x0, B.z0], [B.x0, B.z1]);
    // rows of ceiling strip lights
    const S2 = 34;
    for (let x = B.x0 + 20; x < B.x1; x += S2) far.quad([x - 0.8, H - 0.2, B.z1 - 10], [x - 0.8, H - 0.2, B.z0 + 10], [x + 0.8, H - 0.2, B.z0 + 10], [x + 0.8, H - 0.2, B.z1 - 10], o.light);
}
/** Strip lights strung above the road: the strongest speed cue indoors. */
function strips(S, y, col, stride = 5) {
    S.each(stride, (i) => {
        const T = S.T, p = T.point(i, 0), mb = S.mb(i);
        mb.at(p[0], p[1], p[2], T.yaw(i));
        mb.quad([-3, y, 0.8], [-3, y, -0.8], [3, y, -0.8], [3, y, 0.8], S.lift ? S.lift(col) : col); // faces down
        mb.quad([-3, y + 0.1, -0.8], [-3, y + 0.1, 0.8], [3, y + 0.1, 0.8], [3, y + 0.1, -0.8], mul(col, 0.8));
        mb.reset();
    });
}

const THEME_BUILD = {
    aisle(S) {
        const { T, r } = S, B = bounds(T);
        floorQuad(S, hex(S.th.floor), S.minY, B);
        hall(S, B, { h: 34, ceil: hex("#fff0d6"), wall: hex("#ffcf8f"), wall2: hex("#fff0d6"), light: [1.05, 1.02, 0.92] });
        strips(S, 13, [1.05, 1.02, 0.92], 4);
        const colors = ["#0fa3a3", "#ff4b3e", "#3a5bd9", "#7b4dff"].map(hex);
        S.each(4, (i) => {
            for (const side of [-1, 1]) {
                const frame = colors[Math.floor(i / 16) % colors.length];
                const mb = S.face(i, side, 2.4, 0);
                shelfBay(mb, r, T.ds * 4, 13, 2.6, frame);
                mb.reset();
            }
        });
        const signs = [["AISLE 9", "#3a5bd9"], ["SALE -50%", "#ff4b3e"], ["CEREAL", "#ffc233"], ["2 FOR 1", "#ff5fa2"], ["TINS", "#0fa3a3"], ["FRESH", "#2ec4a6"]];
        S.each(44, (i) => {
            const s = signs[Math.floor(i / 44) % signs.length];
            hangingSign(S, i, s[0], hex(s[1]), hex("#fff6e6"));
        }, 16);
        // inner island: towers of tins and enormous cereal boxes
        for (let n = 0; n < 40; n++) {
            const x = B.x0 + 60 + r() * (B.x1 - B.x0 - 120), z = B.z0 + 60 + r() * (B.z1 - B.z0 - 120);
            if (!S.clear(x, z, 9)) continue;
            const m = S.far.at(x, S.minY, z, r() * 6);
            if (r() < 0.5) cereal(m, 7 + r() * 3, 12 + r() * 8, 3.5, pick(r, PRODUCTS), pick(r, PRODUCTS));
            else canPyramid(m, r, 3 + Math.floor(r() * 2), 1.4, pick(r, PRODUCTS), hex("#fff6e6"));
            m.reset();
        }
    },
    freezer(S) {
        const { T, r } = S, B = bounds(T);
        floorQuad(S, hex(S.th.floor), S.minY, B);
        hall(S, B, { h: 36, ceil: hex("#dff7ff"), wall: hex("#9fdcf3"), wall2: hex("#def8ff"), light: [1, 1.05, 1.08] });
        strips(S, 13, [1, 1.05, 1.08], 5);
        const glow = [0.7, 1.45, 1.75];
        S.each(4, (i) => {
            for (const side of [-1, 1]) {
                const mb = S.face(i, side, 2.2, undefined), w = T.ds * 4;
                mb.box(0, -3, -1.3, w, 11, 2.6, hex("#f4fbff"), { noBack: true, shade: 0.8 });
                mb.quad([-w / 2 + 0.3, 0.3, 0.02], [w / 2 - 0.3, 0.3, 0.02], [w / 2 - 0.3, 6.8, 0.02], [-w / 2 + 0.3, 6.8, 0.02], mul(glow, 0.75), mul(glow, 0.75), glow, glow);
                mb.box(0, 6.9, 0.05, w, 0.3, 0.12, hex("#21a4e8"), { noBack: true });
                for (const x of [-w / 3, 0, w / 3]) mb.box(x, 0.3, 0.05, 0.18, 6.6, 0.1, hex("#f4fbff"), { noBack: true, shade: 1 });
                for (let k = 0; k < 3; k++) {
                    const c = pick(r, PRODUCTS);
                    mb.box(0, 0.4 + k * 2.15, 0.06, w - 0.6, 0.08, 0.04, hex("#f4fbff"), { noBack: true, shade: 1 });
                    for (let x = -w / 2 + 0.7; x < w / 2 - 0.5; x += 1.1) if (r() < 0.82) mb.box(x, 0.5 + k * 2.15, 0.08, 0.92, 1.1 + r() * 0.6, 0.04, r() < 0.7 ? c : pick(r, PRODUCTS), { noBack: true, shade: 0.8 });
                }
                mb.box(0, 8, -1.2, w + 0.1, 0.6, 2.9, hex("#21a4e8"), { noBack: true });
                mb.reset();
            }
        });
        S.each(52, (i) => hangingSign(S, i, ["FROZEN", "ICE COLD", "BRRR!"][Math.floor(i / 52) % 3], hex("#21a4e8"), hex("#ffffff"), 9), 10);
        for (let n = 0; n < 46; n++) {
            const x = B.x0 + 50 + r() * (B.x1 - B.x0 - 100), z = B.z0 + 50 + r() * (B.z1 - B.z0 - 100);
            if (!S.clear(x, z, 8)) continue;
            const m = S.far.at(x, S.minY, z, r() * 6), k = r();
            if (k < 0.4) { // a colossal ice-cream cone
                m.cyl(0, 0, 0, 0.5, 13, 7, hex("#e2a35b"), { r2: 4.2, cap: false });
                m.ball(0, 15, 0, 4.8, 8, 5, pick(r, [hex("#ff9ecb"), hex("#fff6e6"), hex("#8fe8c0")]));
            } else if (k < 0.75) { // ice blocks
                for (let a = 0; a < 3; a++) m.box(r() * 7 - 3.5, a * 3, r() * 7 - 3.5, 6, 3.4, 6, mix(hex("#bfeeff"), hex("#ffffff"), r()), { top: hex("#ffffff") });
            } else m.cyl(0, 0, 0, 6, 5, 7, hex("#ffffff"), { r2: 1.2 });
            m.reset();
        }
        // hanging icicles over the ice sections
        S.each(9, (i) => {
            if (T.surf[i] !== 1) return;
            const mb = S.mb(i);
            for (let k = 0; k < 3; k++) { const p = T.point(i, (k - 1) * 7); mb.at(p[0], p[1], p[2]); mb.cyl(0, 11, 0, 0.1, 3, 5, hex("#def8ff"), { r2: 0.9 }); }
            mb.reset();
        });
    },
    bakery(S) {
        const { T, r } = S, B = bounds(T);
        floorQuad(S, hex(S.th.floor), S.minY, B);
        hall(S, B, { h: 32, ceil: hex("#ffd9a0"), wall: hex("#b4502e"), wall2: hex("#e0824e"), light: [1.08, 0.95, 0.7] });
        strips(S, 12.5, [1.08, 0.95, 0.7], 5);
        const brick = hex("#b4502e"), brick2 = hex("#c9653c"), loaf = hex("#e9ad5b"), crust = hex("#c9812e");
        S.each(5, (i) => {
            for (const side of [-1, 1]) {
                const mb = S.face(i, side, 1.8), w = T.ds * 5;
                const oven = Math.floor(i / 5) % 4 === 0;
                if (oven) {
                    mb.box(0, -3, -2, w, 13, 4, brick, { noBack: true, shade: 0.7 });
                    mb.cylZ(0, 3.2, 0, 3.0, 0.1, 7, [1.9, 0.9, 0.2], { cap: [1.9, 0.9, 0.2] });
                    mb.box(0, 0, 0.1, 5.6, 0.5, 0.3, hex("#7a3e22"));
                    mb.cyl(0, 10, -2, 1.2, 8, 6, brick2);
                } else {
                    mb.box(0, -3, -1, w, 8, 2, brick2, { noBack: true, shade: 0.75 });
                    for (let k = 0; k < 2; k++) {
                        mb.box(0, 1.2 + k * 2.1, 0.2, w * 0.98, 0.16, 0.8, hex("#7a3e22"), { noBack: true });
                        for (let c = 0; c < 4; c++) { const x = -w / 2 + 1.1 + c * (w - 2) / 3.2; if (r() < 0.85) mb.ball(x, 1.75 + k * 2.1, 0.2, 0.6, 6, 3, r() < 0.5 ? loaf : crust, { sx: 1.0, sy: 0.72, sz: 0.68 }); }
                    }
                }
                mb.reset();
            }
        });
        S.each(70, (i) => hangingSign(S, i, ["FRESH BREAD", "HOT BUNS", "KNEAD SPEED"][Math.floor(i / 70) % 3], hex("#7a3e22"), hex("#ffe9c2"), 9), 30);
        // The centre piece: a tiered cake, and giant loaves about the floor.
        for (let n = 0; n < 34; n++) {
            const x = B.x0 + 50 + r() * (B.x1 - B.x0 - 100), z = B.z0 + 50 + r() * (B.z1 - B.z0 - 100);
            if (!S.clear(x, z, 8)) continue;
            const m = S.far.at(x, S.minY, z, r() * 6), k = r();
            if (k < 0.45) {
                const c1 = pick(r, [hex("#ff9ecb"), hex("#fff6e6"), hex("#ffcf8f")]);
                m.cyl(0, 0, 0, 9, 4.5, 9, hex("#fff6e6"), { top: c1 }); m.cyl(0, 4.5, 0, 6.2, 4, 9, c1, { top: hex("#fff6e6") }); m.cyl(0, 8.5, 0, 3.8, 3.4, 9, hex("#fff6e6"), { top: c1 });
                m.ball(0, 12.8, 0, 1.4, 7, 4, hex("#ff4b3e"));
            } else {
                m.ball(0, 4, 0, 9, 8, 5, loaf, { sy: 0.46, sz: 0.5 });
                for (let a = 0; a < 3; a++) m.box(-4 + a * 4, 7.6, 0, 1.0, 0.25, 4.5, hex("#fff0c9"), { shade: 1 });
            }
            m.reset();
        }
    },
    garden(S) {
        const { T, r } = S, B = bounds(T);
        B.x0 -= 150; B.x1 += 150; B.z0 -= 150; B.z1 += 150;
        floorQuad(S, hex(S.th.floor), S.minY - 0.4, B);
        const flowers = ["#ff5fa2", "#ffc233", "#ff4b3e", "#fff6e6", "#7b4dff"].map(hex);
        S.each(3, (i) => {
            for (const side of [-1, 1]) {
                const mb = S.face(i, side, 1.4), w = T.ds * 3;
                mb.box(0, -3, -0.7, w * 1.02, 6 + (i % 5) * 0.4, 1.8, mix(hex("#2f9a48"), hex("#47b85a"), r()), { noBack: true, shade: 0.55, top: hex("#67cc6c") });
                mb.reset();
                if (r() < 0.35) { const m = S.face(i, side, 4.5 + r() * 7); pot(m, r, 1 + r() * 0.7, pick(r, flowers)); m.reset(); }
            }
        });
        // Greenhouse tunnels: white ribs over the road.
        const glass = hex("#ffffff");
        for (const c of [[6.1, 8], [13.4, 7]]) {
            const start = T.index(c[0]);
            for (let k = 0; k < c[1]; k++) {
                const i = T.wrap(start + k * 3), mb = S.mb(i), p = T.point(i, 0), w = T.wall[i] + 1.5;
                mb.at(p[0], p[1], p[2], T.yaw(i));
                const seg = 9;
                for (let a = 0; a < seg; a++) {
                    const t0 = a / seg * Math.PI, t1 = (a + 1) / seg * Math.PI;
                    const P = (t, s, z) => [Math.cos(t) * (w + s), Math.sin(t) * (11 + s), z];
                    mb.quad(P(t0, 0, 0.3), P(t1, 0, 0.3), P(t1, 0.4, 0.3), P(t0, 0.4, 0.3), glass);
                    mb.quad(P(t0, 0, -0.3), P(t0, 0.4, -0.3), P(t1, 0.4, -0.3), P(t1, 0, -0.3), glass);
                    mb.quad(P(t0, 0.4, 0.3), P(t1, 0.4, 0.3), P(t1, 0.4, -0.3), P(t0, 0.4, -0.3), mul(glass, 0.9));
                    mb.quad(P(t0, 0, -0.3), P(t1, 0, -0.3), P(t1, 0, 0.3), P(t0, 0, 0.3), mul(glass, 0.8));
                }
                mb.reset();
            }
        }
        S.each(60, (i) => hangingSign(S, i, ["SEEDS", "SPRING SALE", "COMPOST"][Math.floor(i / 60) % 3], hex("#2f9a48"), hex("#fff6e6"), 9), 22);
        for (let n = 0; n < 150; n++) {
            const x = B.x0 + r() * (B.x1 - B.x0), z = B.z0 + r() * (B.z1 - B.z0);
            if (!S.clear(x, z, 9)) continue;
            const m = S.far.at(x, S.minY, z, r() * 6), s = 8 + r() * 12;
            const c1 = pick(r, [hex("#2f9a48"), hex("#3fae49"), hex("#58c04f")]);
            if (r() < 0.86) tree(m, r, s * 1.3, c1, mul(c1, 1.15));
            else { m.cyl(0, 0, 0, 4 + r() * 3, 0.5, 8, hex("#38b6ff"), { top: hex("#7fd7ff") }); }
            m.reset();
        }
        for (const [x, z, y, rad] of [[B.x0 + 70, B.z0 + 30, 40, 26], [B.x1 - 40, B.z0 + 80, 26, 32]]) { S.far.ball(x, S.minY - 4, z, rad * 1.8, 9, 5, hex("#8fd38a"), { sy: 0.4 }); }
    },
    dock(S) {
        const { T, r } = S, B = bounds(T);
        B.x0 -= 90; B.x1 += 90; B.z0 -= 90; B.z1 += 90;
        floorQuad(S, hex(S.th.floor), S.minY - 0.3, B);
        const stripes = hex("#ffc233"), ink = hex("#2b2140"), boxes = ["#3a5bd9", "#ff4b3e", "#2ec4a6", "#ff8a1f", "#7b4dff"].map(hex);
        S.each(12, (i) => {
            for (const side of [-1, 1]) {
                if (r() < 0.75) {
                    const m = S.face(i, side, 3.4), lvl = 1 + Math.floor(r() * 3);
                    for (let k = 0; k < lvl; k++) { m.box(r() * 0.8, k * 4.5, -3.5, 12, 4.4, 5, pick(r, boxes), { noBack: true, shade: 0.7, top: hex("#d6cfe0") }); }
                    m.reset();
                }
            }
        });
        S.each(18, (i) => {
            const side = i % 36 ? 1 : -1, m = S.face(i, side, 2.0);
            lampPost(m, 12, hex("#59566e"), [1.9, 1.5, 0.95]); m.reset();
        });
        // A long warehouse wall along the far edge, with roller doors.
        const W = hex("#6a5a88"), W2 = hex("#8a78a8"), H = 26;
        for (const [ax, az, bx, bz] of [[B.x0 + 40, B.z1 - 40, B.x1 - 40, B.z1 - 40], [B.x1 - 40, B.z1 - 40, B.x1 - 40, B.z0 + 40], [B.x1 - 40, B.z0 + 40, B.x0 + 40, B.z0 + 40], [B.x0 + 40, B.z0 + 40, B.x0 + 40, B.z1 - 40]]) {
            const far = S.far;
            far.quad([ax, S.minY, az], [bx, S.minY, bz], [bx, H, bz], [ax, H, az], mul(W, 0.5), mul(W, 0.5), W2, W2);
            const len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 26), ux = (bx - ax) / len, uz = (bz - az) / len, nx = -uz, nz = ux;
            for (let k = 0; k < n; k++) {
                const c = (k + 0.5) * len / n, cx = ax + ux * c - nx * -0.1, cz = az + uz * c - nz * -0.1, hw = 8;
                for (let b = 0; b < 6; b++) {
                    const y = S.minY + b * 2.4, col = b % 2 ? hex("#d6cfe0") : hex("#b8aecb");
                    far.quad([cx - ux * hw, y, cz - uz * hw], [cx + ux * hw, y, cz + uz * hw], [cx + ux * hw, y + 2.4, cz + uz * hw], [cx - ux * hw, y + 2.4, cz - uz * hw], col);
                }
                far.quad([cx - ux * hw, 18, cz - uz * hw], [cx + ux * hw, 18, cz + uz * hw], [cx + ux * hw, 20, cz + uz * hw], [cx - ux * hw, 20, cz - uz * hw], stripes);
            }
        }
        for (let n = 0; n < 60; n++) {
            const x = B.x0 + 60 + r() * (B.x1 - B.x0 - 120), z = B.z0 + 60 + r() * (B.z1 - B.z0 - 120);
            if (!S.clear(x, z, 12)) continue;
            const m = S.far.at(x, S.minY, z, Math.floor(r() * 4) * Math.PI / 2);
            container(m, 6.5, 6.5, 18, pick(r, boxes));
            if (r() < 0.5) m.at(x, S.minY + 6.5, z, r() * 0.2).box(0, 0, 0, 6.3, 6.2, 17, pick(r, boxes), { shade: 0.7 });
            m.reset();
        }
        S.each(64, (i) => hangingSign(S, i, ["BAY 7", "LOADING", "DEPOT"][Math.floor(i / 64) % 3], ink, stripes, 9.4), 20);
        for (const g of T.gaps) { // a parked lorry in the gap, with a hazard board
            const i = T.wrap(g.i + Math.floor(g.len / 2)), p = T.point(i, 0), m = S.mb(i);
            m.at(p[0], p[1] - 9, p[2], T.yaw(i) + Math.PI / 2);
            container(m, 7, 5.8, 22, hex("#ff4b3e"));
            m.reset();
        }
    },
    rooftop(S) {
        const { T, r } = S, B = bounds(T);
        const O = { x0: B.x0 - 260, x1: B.x1 + 260, z0: B.z0 - 260, z1: B.z1 + 260 };
        floorQuad(S, hex("#191536"), S.minY - 26, O);
        // The car park deck itself.
        S.far.box((B.x0 + B.x1) / 2, S.minY - 26, (B.z0 + B.z1) / 2, B.x1 - B.x0 - 30, 25.6, B.z1 - B.z0 - 30, hex(S.th.floor), { shade: 0.5 });
        // Parking bays painted around the deck.
        for (let n = 0; n < 240; n++) {
            const x = B.x0 + 20 + r() * (B.x1 - B.x0 - 40), z = B.z0 + 20 + r() * (B.z1 - B.z0 - 40);
            if (!S.clear(x, z, 3)) continue;
            const y = S.minY - 0.3;
            S.far.quad([x - 0.1, y, z + 3], [x + 0.1, y, z + 3], [x + 0.1, y, z - 3], [x - 0.1, y, z - 3], hex("#6d67a0"));
            if (n % 5 === 0) { const m = S.far.at(x + 2, y, z, 0); m.box(0, 0.5, 0, 2.4, 1.1, 4.6, pick(r, PRODUCTS), { taper: 0.95 }); m.box(0, 1.6, 0.2, 2.1, 0.8, 2.4, hex("#2b2140"), { taper: 0.85 }); m.reset(); }
        }
        // City.
        for (let n = 0; n < 80; n++) {
            const a = r() * Math.PI * 2, R = 240 + r() * 150;
            const cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2;
            const m = S.far.at(cx + Math.cos(a) * R, -10, cz + Math.sin(a) * R, -a + Math.PI / 2);
            building(m, r, 26 + r() * 40, 30 + r() * 110, 26 + r() * 30);
            m.reset();
        }
        const neon = [hex("#ff3fa0"), hex("#31e1ff"), hex("#ffc233")];
        S.each(6, (i) => {
            for (const side of [-1, 1]) {
                const mb = S.face(i, side, 0.3), w = T.ds * 6;
                mb.box(0, 1.7, -0.35, w, 0.2, 0.3, mul(neon[Math.floor(i / 30) % 3], 1.5), { shade: 1 });
                mb.reset();
            }
        });
        S.each(30, (i) => { const m = S.face(i, 1, 1.6); lampPost(m, 11, hex("#59566e"), [1.9, 1.4, 1.9]); m.reset(); const k = S.face(i + 15, -1, 1.6); lampPost(k, 11, hex("#59566e"), [1.2, 1.8, 2.0]); k.reset(); });
        S.each(90, (i) => hangingSign(S, i, ["ROOF P5", "PAY HERE", "EXIT"][Math.floor(i / 90) % 3], hex("#2b2140"), neon[Math.floor(i / 90) % 3], 9.4), 34);
        // Support pillars under raised deck, kept clear of the road passing beneath.
        S.each(8, (i) => {
            if (T.py[i] < 5) return;
            for (const side of [-1, 1]) {
                const p = T.point(i, side * (T.wall[i] + 0.4));
                if (T.clearance(p[0], p[2], i, 30) < 1.5) continue;
                const mb = S.mb(i); mb.at(p[0], S.minY - 1, p[2]);
                mb.box(0, 0, 0, 1.6, p[1] - S.minY, 1.6, hex("#5a5478"), { shade: 0.5 });
                mb.reset();
            }
        });
    },
};

function boostPads(S) {
    const { T } = S;
    return T.boosts.map((b) => { const p = T.point(b.i, b.d); return { x: p[0], y: p[1], z: p[2], yaw: T.yaw(b.i), i: b.i, d: b.d, w: b.w }; });
}

/** Turn a Track into registered meshes. Cached per track, so a rematch starts instantly. */
export function buildScenery(game, T) {
    const cache = game._kartScenery ??= new Map();
    if (cache.has(T.id)) return cache.get(T.id);
    const S = new Site(T);
    road(S);
    THEME_BUILD[T.def.theme](S);
    const chunks = [];
    let verts = 0;
    S.chunks.forEach((mb, c) => {
        if (!mb.verts) return;
        let x = 0, y = 0, z = 0, r = 0;
        const n = mb.verts;
        for (let i = 0; i < n * 3; i += 3) { x += mb.pos[i]; y += mb.pos[i + 1]; z += mb.pos[i + 2]; }
        x /= n; y /= n; z /= n;
        for (let i = 0; i < n * 3; i += 3) r = Math.max(r, Math.hypot(mb.pos[i] - x, mb.pos[i + 2] - z));
        verts += n;
        chunks.push({ name: mb.register(game.assets, `trk_${T.id}_${c}`), x, y, z, r });
    });
    verts += S.far.verts;
    const far = S.far.verts ? S.far.register(game.assets, `trk_${T.id}_far`) : null;
    const out = { chunks, far, verts, pads: boostPads(S), minY: S.minY };
    cache.set(T.id, out);
    return out;
}
