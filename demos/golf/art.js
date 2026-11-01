// Textures painted in code: grass and rock detail, lava, sea, clouds, HUD bits.
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function field(a, W, H, fn) {
    // fn writes r,g,b,a 0..255 through set.
    const data = a.data;
    let o = 0;
    const out = [0, 0, 0, 255];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        fn(x / W, y / H, out);
        data[o++] = Math.min(255, out[0]); data[o++] = Math.min(255, out[1]); data[o++] = Math.min(255, out[2]); data[o++] = Math.min(255, out[3]);
    }
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export function paintArt(game) {
    const A = game.assets;
    // Fine tufts and grit, multiplied over everything on the course.
    A.paint("detail", 192, 192, (p) => {
        const N = 192 * 192, val = new Float32Array(N).fill(0.9);
        for (let i = 0; i < 3600; i++) {
            const x = Math.floor(rnd() * 192), y = Math.floor(rnd() * 192), l = 2 + Math.floor(rnd() * 4), a = rnd() * TAU, c = rnd() < 0.5 ? 1 : 0.76;
            for (let j = 0; j < l; j++) { const u = Math.round(x + Math.cos(a) * j), v = Math.round(y + Math.sin(a) * j); if (u >= 0 && v >= 0 && u < 192 && v < 192) val[u + v * 192] = val[u + v * 192] * 0.5 + c * 0.5; }
        }
        const d = p.data;
        for (let i = 0; i < N; i++) { const v = Math.round(clamp(val[i], 0, 1) * 255); d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; }
    }, { smooth: true });

    for (let f = 0; f < 6; f++) A.paint("lava" + f, 128, 128, (p) => {
        const ph = f / 6 * TAU;
        field(p, 128, 128, (x, y, o) => {
            const u = x * TAU, v = y * TAU;
            const w = Math.sin(u + Math.sin(v * 2 + ph) * 0.9) + Math.sin(v + Math.sin(u * 2 - ph) * 0.9);
            const c = Math.abs(Math.sin(u * 2 + w + ph * 0.5) * Math.cos(v * 2 - w * 0.7 + ph * 0.5) + 0.25 * Math.sin(u * 5 + v * 3 + w * 2));
            const k = clamp(1 - c * 1.7, 0, 1), hot = k * k;
            o[0] = 120 + 135 * clamp(k * 1.9, 0, 1); o[1] = 14 + 200 * hot + 50 * k; o[2] = 10 + 130 * hot * hot; o[3] = 255;
        });
    }, { smooth: true });
    for (let f = 0; f < 5; f++) A.paint("sea" + f, 128, 128, (p) => {
        const ph = f / 5 * TAU;
        field(p, 128, 128, (x, y, o) => {
            const u = x * TAU, v = y * TAU;
            const c = Math.abs(Math.sin(u * 2 + Math.sin(v * 3 + ph) * 1.2) + Math.sin(v * 2 + Math.sin(u * 3 - ph) * 1.2));
            const k = Math.pow(clamp(1 - c * 1.5, 0, 1), 2.5);
            const g = 226 + 29 * k;
            o[0] = g; o[1] = g; o[2] = g; o[3] = 255;
        });
    }, { smooth: true });
    A.paint("cloud", 256, 128, (p) => {
        const puffs = [];
        for (let i = 0; i < 12; i++) { const u = 0.14 + i / 11 * 0.72, k = 1 - Math.abs(u - 0.5) * 1.6; puffs.push([u, 0.66 - k * 0.22 - rnd() * 0.08, 0.07 + k * 0.1 + rnd() * 0.03]); }
        field(p, 256, 128, (x, y, o) => {
            let a = 0;
            for (const q of puffs) { const dx = (x - q[0]) / q[2], dy = (y - q[1]) / q[2] * 0.55, d = dx * dx + dy * dy; if (d < 1) a = Math.max(a, 1 - d * d); }
            const s = clamp(0.93 + (0.6 - y) * 0.7, 0.93, 1), al = a > 0.2 ? 255 : 0;
            o[0] = 255 * s; o[1] = 252 * s; o[2] = 250 * (0.5 + s * 0.5); o[3] = al;
        });
    }, { smooth: true });
    A.paint("smoke", 64, 64, (p) => {
        field(p, 64, 64, (x, y, o) => { const d = Math.hypot(x - 0.5, y - 0.5) * 2, a = clamp(1 - d, 0, 1); const al = a * a * (3 - 2 * a) * 0.85; o[0] = 255 * al; o[1] = 255 * al; o[2] = 255 * al; o[3] = 255 * al; });
    }, { smooth: true });
    A.paint("sparkle", 64, 64, (p) => {
        field(p, 64, 64, (x, y, o) => { const dx = Math.abs(x - 0.5) * 2, dy = Math.abs(y - 0.5) * 2, v = clamp(1 - Math.pow(dx * dy * 40, 0.4) - Math.hypot(dx, dy) * 0.6, 0, 1); o[0] = o[1] = o[2] = 255 * v; o[3] = 255 * v; });
    }, { smooth: true });
    A.paint("gloss", 64, 64, (p) => { field(p, 64, 64, (x, y, o) => { const d = Math.hypot(x - 0.5, y - 0.5) * 2, a = clamp(1 - d, 0, 1), al = a * a; o[0] = o[1] = o[2] = 255 * al; o[3] = 255 * al; }); }, { smooth: true });
}
