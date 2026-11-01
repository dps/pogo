// Everything the player sees is painted here, in code. One idea runs through it all: every creature is leaded stained glass, lit from behind.
// Bullets are baked into one atlas, so thousands of them cost one texture and one draw batch.

const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Periodic value noise, for skies and glass mottling.
const NOISE = (() => { const r = mulberry(99), t = new Float32Array(256 * 256); for (let i = 0; i < t.length; i++) t[i] = r(); return t; })();
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const at = (a, b) => NOISE[((b & 255) << 8) | (a & 255)];
    return mix(mix(at(xi, yi), at(xi + 1, yi), u), mix(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
}
function fbm(x, y, oct = 4) { let s = 0, a = 0.5; for (let i = 0; i < oct; i++) { s += a * vnoise(x, y); x = x * 2.03 + 11; y = y * 2.03 + 7; a *= 0.5; } return s; }

// --- Bullets -----------------------------------------------------------------------------------------------

export const HUES = ["#ff3a62", "#ffa628", "#2ff0a8", "#38d8ff", "#4d78ff", "#b05cff", "#ff58c4", "#ffe07a", "#e8f0ff"];
export const RUBY = 0, AMBER = 1, JADE = 2, AQUA = 3, COBALT = 4, VIOLET = 5, ROSE = 6, GOLD = 7, PEARL = 8;
export const CELL = 64, ACOLS = 12, AROWS = 9;
export const PEARLB = 0, BEAD = 1, PETAL = 2, SHARD = 3, SEED = 4, STAR = 5, ORB = 6, DASH = 7, GLOW = 8, RING = 9, MOTHB = 10, MOTE = 11;

function lens(x, y, len, w) { const t = clamp(1 - (x / len) ** 2, 0, 1); return Math.max(Math.abs(y) - w * t, Math.abs(x) - len); }
// Each shape is a signed distance in a -1..1 cell, faces +x, and reports where its white-hot core is.
const SHAPES = [
    (x, y) => Math.hypot(x, y) - 0.27,
    (x, y) => Math.abs(Math.hypot(x, y) - 0.25) - 0.075,
    (x, y) => lens(x, y, 0.72, 0.27),
    (x, y) => Math.abs(x) * 0.34 + Math.abs(y) - 0.25,
    (x, y) => { const r = Math.hypot(x - 0.2, y) - 0.25; const t = lens(x + 0.2, y, 0.52, 0.22); return Math.min(r, x < 0.2 ? t : 1); },
    (x, y) => { const a = Math.sqrt(Math.abs(x)) + Math.sqrt(Math.abs(y)); return (a * a - 0.72) * 0.45; },
    (x, y) => Math.hypot(x, y) - 0.54,
    (x, y) => Math.hypot(Math.max(Math.abs(x) - 0.55, 0), y) - 0.1,
    (x, y) => Math.hypot(x, y) - 0.02,
    (x, y) => Math.abs(Math.hypot(x, y) - 0.78) - 0.035,
    (x, y) => { const ax = Math.abs(y), wing = Math.hypot((x + 0.08) / 0.5, (ax - 0.38) / 0.36) - 1, hind = Math.hypot((x - 0.28) / 0.28, (ax - 0.22) / 0.24) - 1; return Math.min(wing * 0.28, hind * 0.2, Math.hypot(x * 0.35, y) - 0.09); },
    (x, y) => Math.hypot(x, y) - 0.13,
];
const HALO = [7, 8, 7.5, 7.5, 7.5, 7, 6, 8, 2.7, 10, 7, 8];
const CORE = [0.1, 0.03, 0.06, 0.05, 0.06, 0.05, 0.22, 0.045, 0.0, 0.0, 0.03, 0.08];

export function paintAtlas(a) {
    a.paint("atlas", CELL * ACOLS, CELL * AROWS, (p) => {
        const W = p.width, data = p.data;
        for (let row = 0; row < AROWS; row++) {
            const [hr, hg, hb] = rgb(HUES[row]);
            for (let col = 0; col < ACOLS; col++) {
                const sdf = SHAPES[col], k = HALO[col], core = CORE[col];
                for (let py = 1; py < CELL - 1; py++) for (let px = 1; px < CELL - 1; px++) {
                    const x = (px + 0.5 - CELL / 2) / (CELL / 2), y = (py + 0.5 - CELL / 2) / (CELL / 2), d = sdf(x, y);
                    const edge = Math.max(0, 1 - Math.hypot(x, y)) ** 0.8;      // Everything fades before the cell's edge, so neighbours can't bleed.
                    const inside = smooth(0.035, -0.035, d), halo = Math.exp(-Math.max(d, 0) * k) * 0.62 * edge * smooth(1, 0.72, Math.hypot(x, y));
                    const white = col === GLOW ? 0.2 * Math.exp(-Math.hypot(x, y) * 8) : smooth(-core + 0.02, -core - 0.05 + core * 0.2, d) * inside;
                    const body = inside * 0.95, e = clamp(body + halo * (1 - body));
                    let r = hr, g = hg, b = hb;
                    if (e > 0) { const w = clamp(white * 0.98 + body * 0.14); r = mix(r, 255, w); g = mix(g, 255, w); b = mix(b, 250, w); }
                    const o = ((row * CELL + py) * W + col * CELL + px) * 4;
                    data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = e * 255;
                }
            }
        }
    }, { smooth: true });
}

// --- Glass ------------------------------------------------------------------------------------------------

/**
 * Leaded glass. sdf(u, v) is negative inside, with u and v running -1..1. Panes are a Voronoi tessellation; `fold` repeats the wedge k times
 * around the centre, `mirror` reflects across x. pick(cx, cy, r) chooses each pane's color from its centre.
 */
export function glass(p, o) {
    const W = p.width, H = p.height, ox = o.x0 ?? 0, oy = o.y0 ?? 0, rw = o.w ?? W, rh = o.h ?? H, data = p.data, rnd = mulberry(o.seed ?? 7);
    const cols = o.colors.map(rgb), lead = rgb(o.lead ?? "#141026"), leadW = o.leadW ?? 0.022, n = o.seeds ?? 28, fold = o.fold ?? 0, seeds = [];
    for (let i = 0; i < n; i++) {
        if (fold) { const t = rnd() * Math.PI / fold, r = Math.sqrt(rnd()) * 1.05; seeds.push([Math.cos(t) * r, Math.sin(t) * r, rnd(), rnd()]); }
        else seeds.push([(o.mirror ? rnd() : rnd() * 2 - 1) * 1.05, rnd() * 2.1 - 1.05, rnd(), rnd()]);
    }
    const stride = p.stride ?? W, base = p.x0 ?? 0;
    for (let py = 0; py < rh; py++) for (let px = 0; px < rw; px++) {
        const u = (px + 0.5) / rw * 2 - 1, v = (py + 0.5) / rh * 2 - 1, d = o.sdf(u, v), aa = 2.4 / rw;
        if (d > aa) continue;
        let x = u, y = v;
        if (fold) { let t = Math.atan2(v, u), w = Math.PI * 2 / fold; t = ((t % w) + w) % w; if (t > w / 2) t = w - t; const r = Math.hypot(u, v); x = Math.cos(t) * r; y = Math.sin(t) * r; }
        else if (o.mirror) x = Math.abs(u);
        let d1 = 9, d2 = 9, id = 0;
        for (let i = 0; i < n; i++) { const s = seeds[i], dx = x - s[0], dy = y - s[1], q = dx * dx + dy * dy; if (q < d1) { d2 = d1; d1 = q; id = i; } else if (q < d2) d2 = q; }
        const a1 = Math.sqrt(d1), a2 = Math.sqrt(d2), seam = a2 - a1, s = seeds[id];
        const c = o.pick ? cols[o.pick(s[0], s[1], s[2], s[3]) % cols.length] : cols[Math.floor(s[2] * cols.length)];
        const light = (o.light ? o.light(u, v) : 1) * (0.72 + 0.34 * s[3]) * (1.12 - clamp(a1 * (o.falloff ?? 1.4), 0, 0.7)) * (0.82 + 0.36 * vnoise(u * 9 + 40, v * 9 + 20));
        let r = c[0] * light, g = c[1] * light, b = c[2] * light;
        const hot = clamp(light - 1, 0, 0.8); r = mix(r, 255, hot * 0.5); g = mix(g, 255, hot * 0.5); b = mix(b, 255, hot * 0.5);
        const wall = smooth(leadW * 1.6, leadW * 0.7, seam), rim = smooth(-(o.rim ?? 0.05), -(o.rim ?? 0.05) * 0.5, d), m = Math.max(wall, rim);
        r = mix(r, lead[0], m); g = mix(g, lead[1], m); b = mix(b, lead[2], m);
        const al = smooth(aa, -aa, d), i = ((py + oy) * stride + base + px + ox) * 4;
        data[i] = clamp(r, 0, 255); data[i + 1] = clamp(g, 0, 255); data[i + 2] = clamp(b, 0, 255); data[i + 3] = al * 255;
    }
}

const polarLobes = (u, v, k, a, b, rot = 0) => { const r = Math.hypot(u, v), t = Math.atan2(v, u) + rot; return r - (a + b * Math.cos(t * k)); };

// --- Moth ------------------------------------------------------------------------------------------------

function paintMoth(a) {
    const wingSdf = (u, v) => {
        // Right wing pair; the root is at the left edge, middle height.
        const x = (u + 1) / 2, y = v;
        const fore = Math.hypot((x - 0.52) / 0.5, (y + 0.34 + (x - 0.3) * 0.46) / 0.42) - 1;
        const hind = Math.hypot((x - 0.34) / 0.34, (y - 0.42) / 0.42) - 1;
        return Math.min(fore, hind) * 0.3;
    };
    a.paint("wing", 192, 192, (p) => {
        glass(p, {
            sdf: wingSdf, seeds: 15, seed: 21, colors: ["#ffe9b0", "#ffc765", "#ff9d5c", "#ffd9ee", "#ffb36b"], lead: "#3b2138", leadW: 0.018, rim: 0.03, falloff: 1.1,
            pick: (cx, cy, r) => (Math.hypot(cx - 0.3, cy + 0.4) < 0.26 ? 3 : Math.floor(r * 5)),
            light: (u, v) => 1.14 - 0.2 * (u + 1),
        });
        // An eye on each wing: moths wear them to scare the night.
        for (const [ex, ey, er] of [[130, 56, 15], [72, 142, 12]]) {
            p.circle(ex, ey, er, "#3b2138"); p.circle(ex, ey, er - 3, "#ffefb0"); p.circle(ex, ey, er - 7, "#c0486a"); p.circle(ex - 1, ey - 1, 2.4, "#fff");
        }
    }, { smooth: true });
    a.paint("mothbody", 64, 96, (p) => {
        for (let y = 0; y < 96; y++) for (let x = 0; x < 64; x++) {
            const v = (y - 48) / 44, u = (x - 32) / (15 * (1.06 - v * v * 0.55) * (v < -0.55 ? 0.8 : 1)), r = u * u + v * v;
            if (r > 1) continue;
            const fur = 0.72 + 0.4 * vnoise(x * 0.5 + 3, y * 1.4), band = (Math.sin(v * 13) > 0.3 && v > -0.2) ? 0.7 : 1, sh = (1.12 - r * 0.5) * fur * band, i = (y * 64 + x) * 4;
            p.data[i] = clamp(236 * sh, 0, 255); p.data[i + 1] = clamp(196 * sh, 0, 255); p.data[i + 2] = clamp(146 * sh, 0, 255); p.data[i + 3] = 255 * smooth(1, 0.8, r);
        }
        // Feathered antennae.
        for (const s of [-1, 1]) {
            for (let t = 0; t < 1; t += 0.05) {
                const x = 32 + s * (4 + 22 * t), y = 14 - 13 * Math.sin(t * 2.4) * 0.9;
                p.circle(x, y, 1.1, "#ffe6bf");
                p.line(x, y, x + s * 2, y - 3.5, "#e8c28f", 1); p.line(x, y, x + s * 3.5, y + 1.5, "#e8c28f", 1);
            }
        }
        p.circle(26, 11, 2.2, "#2a1830").circle(38, 11, 2.2, "#2a1830");
    }, { smooth: true });
}

// --- Enemies: one sheet of little glass night-things -------------------------------------------------------

export const ENEMY = { wisp: 0, lantern: 1, jelly: 2, spider: 3, bat: 4, bell: 5, shard: 6, ember: 7 };
function paintEnemies(a) {
    const S = 96;
    const d = [
        { sdf: (u, v) => Math.min(Math.hypot(u * 1.5, v * 1.1 + 0.25) - 0.62, Math.hypot((Math.abs(u) - 0.5) / 0.6, (v + 0.32) / 0.3) - 1), colors: ["#ffd86a", "#ff9c3a", "#fff0b0"], seeds: 12, mirror: true },
        { sdf: (u, v) => Math.min(Math.hypot(u * 1.25, v * 0.95) - 0.76, Math.max(Math.abs(u) - 0.3, Math.abs(v + 0.84) - 0.1), Math.max(Math.abs(u) - 0.22, Math.abs(v - 0.82) - 0.09)), colors: ["#ff5a4c", "#ffb03c", "#ff7fb0", "#ffe18a"], seeds: 14, mirror: true },
        { sdf: (u, v) => Math.min(Math.max(Math.hypot(u, v * 1.15 - 0.05) - 0.8, v - 0.22), Math.max(Math.abs(Math.abs(u) - 0.3 - 0.1 * Math.sin(v * 9)) - 0.08, Math.abs(v - 0.58) - 0.38)), colors: ["#6fe8ff", "#7d9cff", "#c8a6ff", "#a8fff0"], seeds: 13, mirror: true },
        { sdf: (u, v) => { const body = Math.min(Math.hypot(u, v - 0.25) - 0.44, Math.hypot(u, v + 0.32) - 0.26); let leg = 9; for (let i = 0; i < 4; i++) { const ty = -0.4 + i * 0.34, x = Math.abs(u); const py = ty + (x * x) * (i < 2 ? -0.5 : 0.9); leg = Math.min(leg, Math.max(Math.abs(v - py) - 0.06, x - 0.98)); } return Math.min(body, leg); }, colors: ["#3fe6a4", "#b6ff7a", "#1ea890", "#f2ffb0"], seeds: 9, mirror: true, leadW: 0.03 },
        { sdf: (u, v) => { const x = Math.abs(u), wing = Math.max(v - 0.5 + x * 0.1 - 0.15 * Math.abs(Math.sin(x * 7.5)), -(v + 0.42 - x * x * 0.9), x - 0.97); return Math.min(wing, Math.hypot(u * 2, v + 0.1) - 0.52); }, colors: ["#a35cff", "#5a6dff", "#e36bff"], seeds: 13, mirror: true },
        { sdf: (u, v) => Math.min(Math.max(Math.abs(u) - (0.3 + (v + 0.75) ** 2 * 0.42), Math.abs(v) - 0.72), Math.hypot(u, v - 0.78) - 0.16, Math.hypot(u, v + 0.78) - 0.2), colors: ["#ffc84c", "#ff8a4a", "#fff2c4", "#ff5f7a"], seeds: 13, mirror: true },
        { sdf: (u, v) => Math.max(Math.abs(u) * 1.75 + Math.abs(v) * 1.02 - 0.95, -0.2 - v * 2 - Math.abs(u) * 5), colors: ["#7fd6ff", "#c4ecff", "#6c8cff", "#ffffff"], seeds: 9, mirror: true },
        { sdf: (u, v) => { const t = Math.atan2(u, -v); return Math.hypot(u, v * 0.92) - (0.62 + 0.24 * Math.cos(t * 3) * (v < 0 ? 1 : 0.2)); }, colors: ["#ff6a3a", "#ffd14a", "#ff3f64"], seeds: 11, mirror: true },
    ];
    a.paint("enemies", S * d.length, S, (p) => { d.forEach((e, i) => glass(p, { ...e, seed: 30 + i, x0: i * S, w: S, h: S, rim: 0.07, leadW: e.leadW ?? 0.028 })); }, { smooth: true });
}

// --- Bosses ------------------------------------------------------------------------------------------------

function paintBosses(a) {
    // Nightbloom: one petal, turned eight times in the draw so it can truly open and wilt.
    a.paint("petal", 128, 256, (p) => glass(p, {
        sdf: (u, v) => { const t = (v + 1) / 2, w = 0.92 * Math.sin(Math.PI * Math.pow(1 - t, 0.72)) ** 0.8; return (Math.abs(u) - w) * 0.6; },
        mirror: true, seeds: 15, seed: 3, colors: ["#ff5cb0", "#ff3a7c", "#ff9ad2", "#b84dff", "#ffc4e8"], falloff: 1.5, leadW: 0.024, rim: 0.05,
        pick: (cx, cy, r) => (cy > 0.45 ? 3 : cy < -0.4 ? 4 : Math.floor(r * 3)), light: (u, v) => 1.2 - v * 0.34,
    }), { smooth: true });
    a.paint("bloomcore", 128, 128, (p) => glass(p, {
        sdf: (u, v) => Math.hypot(u, v) - 0.92, fold: 8, seeds: 7, seed: 5, colors: ["#fff0a0", "#ffc23c", "#ff8a3c"], leadW: 0.04, pick: (cx, cy) => Math.min(2, Math.floor(Math.hypot(cx, cy) * 3)),
    }), { smooth: true });
    // Tide Mother: a bell that squashes as she swims.
    a.paint("bell", 256, 200, (p) => glass(p, {
        sdf: (u, v) => { const scallop = 0.05 * Math.cos(u * 21); return Math.max(Math.hypot(u / 0.96, (v - 0.72) / 1.62) - 1, v - 0.74 - scallop) * 0.6; },
        mirror: true, seeds: 24, seed: 8, colors: ["#57e4ff", "#8aa6ff", "#c7a4ff", "#b6fff2", "#3f8dff"], leadW: 0.018, falloff: 1.1, rim: 0.03,
        pick: (cx, cy, r) => (Math.hypot(cx, cy + 0.2) < 0.33 ? 3 : Math.floor(r * 5)), light: (u, v) => 1.28 - Math.hypot(u, v + 0.2) * 0.6,
    }), { smooth: true });
    // The Weaver: an abdomen of green glass with a mark on it. Her legs are drawn live.
    a.paint("weaver", 200, 256, (p) => glass(p, {
        sdf: (u, v) => Math.min(Math.hypot(u / 0.72, (v - 0.34) / 0.6) - 1, Math.hypot(u / 0.42, (v + 0.56) / 0.3) - 1) * 0.5,
        mirror: true, seeds: 17, seed: 14, colors: ["#31e8a0", "#0fae8c", "#b4ff72", "#f6ffb4", "#ff5c8a"], leadW: 0.024, rim: 0.04,
        pick: (cx, cy, r) => (cx < 0.2 && cy > 0.1 && cy < 0.6 ? 4 : Math.floor(r * 4)),
    }), { smooth: true });
    // Rose Window: two discs of true tracery that turn against each other.
    a.paint("rose", 320, 320, (p) => glass(p, {
        sdf: (u, v) => Math.hypot(u, v) - 0.98, fold: 12, seeds: 11, seed: 19, colors: ["#ff2f55", "#2f6bff", "#ffc23a", "#a13dff", "#25d7c0"], leadW: 0.016, rim: 0.03, falloff: 2.2,
        pick: (cx, cy, r) => { const d = Math.hypot(cx, cy); return d > 0.72 ? 1 : d > 0.45 ? (r > 0.5 ? 0 : 3) : d > 0.2 ? 2 : 4; },
    }), { smooth: true });
    a.paint("roseinner", 192, 192, (p) => glass(p, {
        sdf: (u, v) => polarLobes(u, v, 6, 0.74, 0.2), fold: 6, seeds: 7, seed: 23, colors: ["#fff1b8", "#ff8d3a", "#ff4fb0", "#3fc4ff"], leadW: 0.024, rim: 0.05, falloff: 1.9,
        pick: (cx, cy, r) => Math.floor(Math.hypot(cx, cy) * 4.6) % 4,
    }), { smooth: true });
    // The Comet: a jagged crown of ice.
    a.paint("comet", 200, 200, (p) => glass(p, {
        sdf: (u, v) => { const t = Math.atan2(v, u); return Math.hypot(u, v) - (0.68 + 0.18 * Math.sin(t * 5 + 0.7) + 0.11 * Math.sin(t * 9)); },
        seeds: 22, seed: 27, colors: ["#d6f6ff", "#7fd9ff", "#4d78ff", "#ffffff", "#a8b6ff"], leadW: 0.016, falloff: 1.3, rim: 0.03,
        light: (u, v) => 1.42 - Math.hypot(u + 0.1, v + 0.1) * 0.8,
    }), { smooth: true });
    // The Flame. No glass and no outline: only light.
    a.paint("flame", 128, 200, (p) => {
        for (let y = 0; y < 200; y++) for (let x = 0; x < 128; x++) {
            const v = y / 200, w = (x - 64 + 0.5) / 64, prof = 0.86 * Math.pow(Math.sin(Math.PI * Math.pow(v, 1.5)), 0.85), d = Math.abs(w) / Math.max(prof, 1e-3);
            if (d >= 1.7) continue;
            const e = Math.exp(-d * d * 2.5) * smooth(1, 0.8, d / 1.7), i = (y * 128 + x) * 4;
            p.data[i] = 255; p.data[i + 1] = clamp(80 + 190 * e * e, 0, 255); p.data[i + 2] = clamp(20 + 230 * Math.pow(e, 5), 0, 255); p.data[i + 3] = 255 * clamp(e * 1.15);
        }
    }, { smooth: true });
    a.paint("candle", 96, 320, (p) => {
        for (let y = 0; y < 320; y++) for (let x = 0; x < 96; x++) {
            const u = (x - 48) / 40, pool = 10 + 9 * (1 - u * u) * (1 - u * u) + 3 * Math.sin(u * 3 + 1);
            if (Math.abs(u) > 1 || y < pool) continue;
            const round = Math.sqrt(1 - u * u), lit = Math.exp(-(y - pool) / 62), side = 0.34 + 0.66 * round, i = (y * 96 + x) * 4;
            let drip = 0; for (const [cx, w, l] of [[-0.74, 0.1, 74], [0.62, 0.13, 118], [0.1, 0.07, 44]]) if (Math.abs(u - cx) < w * (1 - y / (l + pool)) * 1.3 && y < pool + l) drip = 1;
            const v = (lit * 0.92 + 0.08) * side * (drip ? 1.16 : 1);
            p.data[i] = clamp(250 * v + 34, 0, 255); p.data[i + 1] = clamp(190 * v * (0.5 + 0.5 * lit) + 12, 0, 255); p.data[i + 2] = clamp(120 * v * lit + 22, 0, 255); p.data[i + 3] = 255 * smooth(1, 0.95, Math.abs(u)) * smooth(320, 150, y);
        }
    }, { smooth: true });
}

// --- Skies ------------------------------------------------------------------------------------------------

/** One entry per stage. Colors run top to bottom of the sky. */
export const SKIES = [
    { id: "meadow", stops: ["#090a2e", "#1b1450", "#47206c", "#a4416e"], neb: ["#3b2a90", "#b0417e"], moon: [0.8, 0.34, 0.05, "#e8d8b0", true], stars: 340, seed: 3 },
    { id: "river", stops: ["#040d2a", "#07244e", "#0b4a6e", "#23839a"], neb: ["#1a6aa0", "#58d8c8"], moon: [0.2, 0.42, 0.075, "#bfe0f0", false], stars: 300, seed: 5 },
    { id: "thicket", stops: ["#050b14", "#08201e", "#0d362b", "#245a3a"], neb: ["#1e6a54", "#8ac46a"], moon: [0.22, 0.3, 0.04, "#b8d8b0", false], stars: 140, seed: 9 },
    { id: "cathedral", stops: ["#0b0620", "#25093c", "#550f4a", "#92204a"], neb: ["#7a1f7a", "#e0453f"], moon: null, stars: 200, seed: 13 },
    { id: "storm", stops: ["#02040f", "#0a1236", "#123a6c", "#1a8c8a"], neb: ["#3050d0", "#30e0a0"], moon: null, stars: 420, seed: 17, aurora: true },
    { id: "void", stops: ["#030208", "#0a0512", "#1a0a12", "#3a1610"], neb: ["#301018", "#a04018"], moon: null, stars: 240, seed: 23 },
    { id: "dawn", stops: ["#2a1a58", "#8a3a78", "#f08a5a", "#ffd79a"], neb: ["#ff9a70", "#ffe0a0"], moon: null, stars: 40, seed: 31 },
];

function paintSky(a, s) {
    const W = 200, H = 440, stops = s.stops.map(rgb), neb = s.neb.map(rgb), rnd = mulberry(s.seed);
    a.paint(`sky-${s.id}`, W, H, (p) => {
        const d = p.data;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const v = y / (H - 1), f = v * (stops.length - 1), k = Math.min(stops.length - 2, Math.floor(f)), t = smooth(0, 1, f - k);
            const nx = x / 70 + s.seed, ny = y / 90 - s.seed, w = fbm(nx + fbm(nx * 0.6, ny * 0.6, 3) * 2.2, ny, 4), m = smooth(0.4, 0.74, w), m2 = smooth(0.48, 0.8, fbm(nx * 1.7 + 9, ny * 1.7 + 5, 4));
            let r = mix(stops[k][0], stops[k + 1][0], t), g = mix(stops[k][1], stops[k + 1][1], t), b = mix(stops[k][2], stops[k + 1][2], t);
            const q = 0.34 * m; r += neb[0][0] * q; g += neb[0][1] * q; b += neb[0][2] * q;
            const e = 0.26 * m2 * v; r += neb[1][0] * e; g += neb[1][1] * e; b += neb[1][2] * e;
            if (s.aurora) {
                const bandY = 0.2 + 0.32 * vnoise(x / 34, 3) + 0.02 * Math.sin(x / 3), dy = v - bandY, curtain = Math.max(0, 1 - Math.abs(dy) / (dy > 0 ? 0.26 : 0.05)) * (0.5 + 0.5 * Math.sin(x / 3.4 + 7 * vnoise(x / 16, 8)));
                r += 40 * curtain; g += 210 * curtain * (1 - dy * 2); b += 120 * curtain + 100 * curtain * smooth(0, -0.1, -dy);
            }
            const i = (y * W + x) * 4, dith = (rnd() - 0.5) * 2;
            d[i] = clamp(r + dith, 0, 255); d[i + 1] = clamp(g + dith, 0, 255); d[i + 2] = clamp(b + dith, 0, 255); d[i + 3] = 255;
        }
        if (s.moon) {
            const [mx, my, mr, col, crescent] = s.moon, cx = mx * W, cy = my * H, R = mr * W, c = rgb(col);
            for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                const q = Math.hypot(x - cx, y - cy), i = (y * W + x) * 4;
                let g = 0.5 * Math.exp(-Math.max(q - R, 0) / (R * 1.5));
                let disc = smooth(R + 0.7, R - 0.7, q);
                if (crescent) disc *= smooth(R * 0.84 - 0.8, R * 0.84 + 0.8, Math.hypot(x - cx - R * 0.5, y - cy + R * 0.2));
                if (disc > 0) g = Math.max(g, disc * (0.86 + 0.14 * fbm(x / 7, y / 7, 3) * 1.4));
                d[i] = clamp(d[i] + c[0] * g); d[i] = Math.min(255, d[i] + c[0] * g); d[i + 1] = Math.min(255, d[i + 1] + c[1] * g); d[i + 2] = Math.min(255, d[i + 2] + c[2] * g);
            }
            // The moon on the water.
            if (s.id === "river") for (let y = Math.floor(H * 0.7); y < H; y++) for (let x = 0; x < W; x++) {
                const v = (y - H * 0.7) / (H * 0.3), w = 24 + v * 34, q = Math.abs(x - cx + 8 * Math.sin(y * 0.3)) / w, g = Math.max(0, 1 - q) * (0.25 + 0.75 * (Math.sin(y * y * 0.012 + x * 0.04) > 0.1 ? 1 : 0)) * 0.34 * (1 - v * 0.6), i = (y * W + x) * 4;
                d[i] = Math.min(255, d[i] + c[0] * g); d[i + 1] = Math.min(255, d[i + 1] + c[1] * g); d[i + 2] = Math.min(255, d[i + 2] + c[2] * g);
            }
        }
    }, { smooth: true });
}

// Each stage flies between tall dark forms that scroll past at the edges, so the centre stays clear for bullets.
const WALLS = {
    meadow: (y, s, r) => { const v = y * Math.PI * 2; return 0.1 + 0.05 * Math.sin(v * 3 + s) + 0.03 * Math.sin(v * 7 + s * 3) + 0.05 * Math.pow(Math.abs(Math.sin(v * 5 + s * 2)), 10); },
    river: (y, s) => { const v = y * Math.PI * 2; return 0.1 + 0.07 * Math.sin(v * 2 + s) + 0.03 * Math.sin(v * 5 + s * 2) ; },
    thicket: (y, s) => { const v = y * Math.PI * 2; return 0.2 + 0.07 * Math.sin(v * 3 + s) + 0.13 * Math.pow(Math.abs(Math.sin(v * 5 + s * 2)), 16) + 0.09 * Math.pow(Math.abs(Math.sin(v * 9 + s)), 22) ; },
    cathedral: (y, s) => { const v = y * 6 + s, f = v - Math.floor(v); return 0.11 + 0.1 * (f < 0.5 ? 1 : 0) + 0.15 * Math.max(0, 1 - Math.abs(f - 0.25) * 9) ** 1.2 + 0.05 * (Math.abs(f - 0.8) < 0.04 ? 1 : 0); },
    storm: (y, s) => { const v = y * Math.PI * 2; return 0.1 + 0.08 * Math.sin(v * 2 + s) * Math.sin(v * 3 + s * 2) + 0.05 * Math.abs(Math.sin(v * 8 + s)) ; },
    void: (y, s) => 0.015 + 0.01 * Math.sin(y * Math.PI * 4 + s),
    dawn: () => 0,
};

function paintWall(a, s) {
    const W = 200, H = 512, stop = rgb(s.stops[1]), edge = rgb(s.neb[1]), fn = WALLS[s.id], seed = s.seed;
    a.paint(`wall-${s.id}`, W, H, (p) => {
        const d = p.data;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const v = y / H, u = x / W, l = fn(v, seed), r = fn((v + 0.37) % 1, seed + 2), e = Math.min(u - l, 1 - u - r);
            if (e > 0.006) continue;
            const al = smooth(0.006, -0.002, e), rim = smooth(-0.022, 0, e) * 0.36, i = (y * W + x) * 4, k = 0.34 + 0.2 * fbm(x / 14, y / 14, 3);
            d[i] = clamp(stop[0] * k + edge[0] * rim, 0, 255); d[i + 1] = clamp(stop[1] * k + edge[1] * rim, 0, 255); d[i + 2] = clamp(stop[2] * k + edge[2] * rim, 0, 255); d[i + 3] = al * 255;
        }
    }, { smooth: true });
}

// The arched frame that fills the sides of wide screens: more of the same window, seen from inside.
function paintFrame(a) {
    a.paint("frame", 128, 360, (p) => glass(p, {
        sdf: () => -1, seeds: 40, seed: 11, colors: ["#16245f", "#2a1560", "#531a58", "#0e3a66", "#3a1a70", "#172a50"], leadW: 0.02, lead: "#05040d", falloff: 3.6,
        light: (u, v) => 0.42 + 0.3 * (1 - Math.abs(v)) ** 2 + 0.36 * Math.max(0, u),
    }), { smooth: true, mipmaps: false });
}

/** Skies are the slowest thing to paint, and each stage needs only one, so they are painted on the way in. */
const painted = new Set();
export function ensureSky(a, id) {
    if (painted.has(id)) return; painted.add(id);
    const s = SKIES.find((k) => k.id === id); paintSky(a, s); paintWall(a, s);
}
export function ensureFrame(a) { if (!painted.has("frame")) { painted.add("frame"); paintFrame(a); } }

export function paintAll(a) { paintAtlas(a); paintMoth(a); paintEnemies(a); paintBosses(a); ensureSky(a, "void"); }
