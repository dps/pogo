// Painted things: HUD icons, tile marks, particles, and portraits rasterised from the real 3D models.

/** Paint a model's triangles into a sprite with a tiny z-buffer, so portraits are the same birds as on the board. */
function rasterPortrait(game, name, models, { size = 128, yaw = 0.55, pitch = 0.12, bg = null, zoom = 1, cy = 0 } = {}) {
    game.assets.paint(name, size, size, (p) => {
        const S = size * 2, buf = new Float32Array(S * S * 3), zb = new Float32Array(S * S).fill(-1e9), cov = new Uint8Array(S * S);
        const cy0 = Math.cos(yaw), sy0 = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const xf = (x, y, z) => { const a = x * cy0 + z * sy0, c = -x * sy0 + z * cy0; return [a, y * cp - c * sp, y * sp + c * cp]; };
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        const tr = models.map((m) => {
            const n = m.p.length / 3, q = new Float32Array(n * 3), nn = new Float32Array(n * 3);
            for (let i = 0; i < n; i++) {
                const [a, b, c] = xf(m.p[i * 3] + (m.ox ?? 0), m.p[i * 3 + 1] + (m.oy ?? 0), m.p[i * 3 + 2] + (m.oz ?? 0));
                q[i * 3] = a; q[i * 3 + 1] = b; q[i * 3 + 2] = c;
                minX = Math.min(minX, a); maxX = Math.max(maxX, a); minY = Math.min(minY, b); maxY = Math.max(maxY, b);
                const [u, v, w] = xf(m.n[i * 3], m.n[i * 3 + 1], m.n[i * 3 + 2]);
                nn[i * 3] = u; nn[i * 3 + 1] = v; nn[i * 3 + 2] = w;
            }
            return { q, nn, c: m.c, i: m.i };
        });
        const span = Math.max(maxX - minX, maxY - minY) * 1.06 / zoom, cx = (minX + maxX) / 2, midY = (minY + maxY) / 2 + cy, k = S / span;
        for (const m of tr) {
            for (let t = 0; t < m.i.length; t += 3) {
                const a = m.i[t], b = m.i[t + 1], c = m.i[t + 2];
                const ax = (m.q[a * 3] - cx) * k + S / 2, ay = S / 2 - (m.q[a * 3 + 1] - midY) * k, az = m.q[a * 3 + 2];
                const bx = (m.q[b * 3] - cx) * k + S / 2, by = S / 2 - (m.q[b * 3 + 1] - midY) * k, bz = m.q[b * 3 + 2];
                const cx2 = (m.q[c * 3] - cx) * k + S / 2, cy2 = S / 2 - (m.q[c * 3 + 1] - midY) * k, cz = m.q[c * 3 + 2];
                const area = (bx - ax) * (cy2 - ay) - (by - ay) * (cx2 - ax);
                if (area >= 0) continue;   // y flipped, so front faces are negative
                const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx2))), x1 = Math.min(S - 1, Math.ceil(Math.max(ax, bx, cx2)));
                const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy2))), y1 = Math.min(S - 1, Math.ceil(Math.max(ay, by, cy2)));
                for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                    const w0 = ((bx - x) * (cy2 - y) - (by - y) * (cx2 - x)) / area, w1 = ((cx2 - x) * (ay - y) - (cy2 - y) * (ax - x)) / area, w2 = 1 - w0 - w1;
                    if (w0 < 0 || w1 < 0 || w2 < 0) continue;
                    const z = w0 * az + w1 * bz + w2 * cz, o = y * S + x;
                    if (z <= zb[o]) continue;
                    zb[o] = z; cov[o] = 1;
                    const nx = w0 * m.nn[a * 3] + w1 * m.nn[b * 3] + w2 * m.nn[c * 3], ny = w0 * m.nn[a * 3 + 1] + w1 * m.nn[b * 3 + 1] + w2 * m.nn[c * 3 + 1], nz = w0 * m.nn[a * 3 + 2] + w1 * m.nn[b * 3 + 2] + w2 * m.nn[c * 3 + 2];
                    const l = Math.max(0, nx * -0.35 + ny * 0.65 + nz * 0.67) * 0.62 + 0.48;
                    for (let ch = 0; ch < 3; ch++) buf[o * 3 + ch] = (w0 * m.c[a * 3 + ch] + w1 * m.c[b * 3 + ch] + w2 * m.c[c * 3 + ch]) * l;
                }
            }
        }
        // Box down 2x for clean edges.
        const d = p.data;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const o = (y * 2 + j) * S + x * 2 + i; if (cov[o]) { a++; r += buf[o * 3]; g += buf[o * 3 + 1]; b += buf[o * 3 + 2]; } }
            const o = (y * size + x) * 4;
            if (!a) { d[o + 3] = 0; continue; }
            d[o] = Math.min(255, (r / a) * 255); d[o + 1] = Math.min(255, (g / a) * 255); d[o + 2] = Math.min(255, (b / a) * 255); d[o + 3] = (a / 4) * 255;
        }
        void bg;
    }, { smooth: true });
}

export function buildArt(game, modelData, BIRD) {
    const A = game.assets;
    // Portraits come from the head and shoulders of the same geometry.
    for (const k of Object.keys(modelData)) {
        if (!k.endsWith("_head") || k.includes("_g")) continue;
        const u = k.slice(0, -5);
        rasterPortrait(game, `face_${u}`, [modelData[k]], { yaw: 0.5, pitch: 0.1 });
        const neck = (BIRD[u] ?? BIRD.default).neck;
        rasterPortrait(game, `full_${u}`, [modelData[`${u}_body`], { ...modelData[k], ox: neck[0], oy: neck[1], oz: neck[2] }], { yaw: 0.72, pitch: 0.2, size: 192 });
    }
    for (const k of ["can", "box", "bag", "nest", "drum", "sprinkler"]) rasterPortrait(game, `full_${k}`, [modelData[k]], { yaw: 0.72, pitch: 0.34, size: 96 });

    A.paint("tilemark", 96, 96, (p) => {
        // A soft-filled tile with a bright rounded rim. Tinted at draw time.
        const d = p.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const u = Math.abs(x + 0.5 - 48), v = Math.abs(y + 0.5 - 48), r = 14, a = Math.max(u - (45 - r), 0), b = Math.max(v - (45 - r), 0);
            const sd = Math.hypot(a, b) - r, o = (y * 96 + x) * 4;
            let al = 0;
            if (sd < 0) al = sd > -5 ? 255 : 95;
            if (sd >= 0 && sd < 1) al = 255 * (1 - sd);
            d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = al;
        }
    }, { smooth: true });
    A.paint("tilefill", 96, 96, (p) => {
        const d = p.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const u = Math.abs(x + 0.5 - 48), v = Math.abs(y + 0.5 - 48), r = 12, sd = Math.hypot(Math.max(u - 33, 0), Math.max(v - 33, 0)) - r, o = (y * 96 + x) * 4;
            d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = sd < 0 ? 255 : sd < 1 ? 255 * (1 - sd) : 0;
        }
    }, { smooth: true });
    A.paint("softshadow", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot(x - 63.5, y - 63.5) / 64, o = (y * 128 + x) * 4, k = Math.max(0, 1 - r);
            d[o] = d[o + 1] = d[o + 2] = 0; d[o + 3] = Math.min(255, k * k * (3 - 2 * k) * 255);
        }
    }, { smooth: true });

    A.paint("feather", 48, 48, (p) => {
        p.line(10, 40, 38, 8, "#8d8da0", 2);
        p.poly([[12, 38], [20, 16], [38, 8], [32, 28]], "#f5f3ee");
        p.line(14, 36, 36, 10, "#c8c8d4", 1);
    }, { smooth: true });
    A.paint("puff", 64, 64, (p) => { p.circle(32, 34, 24, "#ffffffee").circle(20, 28, 14, "#ffffff").circle(44, 26, 15, "#ffffff"); }, { smooth: true });
    A.paint("drop", 32, 32, (p) => { p.ellipse(16, 18, 9, 11, "#a9e6f7", "#3aa8d6"); p.circle(13, 15, 3, "#ffffffcc"); }, { smooth: true });
    A.paint("spark", 32, 32, (p) => { p.poly([[16, 1], [20, 12], [31, 16], [20, 20], [16, 31], [12, 20], [1, 16], [12, 12]], "#fff4b8"); }, { smooth: true });
    A.paint("acorn", 32, 32, (p) => { p.ellipse(16, 19, 9, 11, "#c98a45", "#8a5526"); p.ellipse(16, 11, 10, 6, "#6a4524", "#4a2f18"); p.line(16, 5, 16, 2, "#3a2412", 2); p.outline("#2a1a0e"); }, { smooth: true });
    A.paint("pebble", 24, 24, (p) => { p.ellipse(12, 12, 8, 7, "#c7c9d4", "#6c7081"); p.outline("#262838"); }, { smooth: true });
    A.paint("bomb", 32, 32, (p) => { p.ellipse(16, 16, 9, 10, "#fdfdf6", "#c5c4b6"); p.ellipse(13, 12, 3, 3, "#ffffff"); p.outline("#3a3a30"); }, { smooth: true });
    A.paint("crust", 32, 32, (p) => { p.ellipse(16, 16, 11, 8, "#ecc488", "#a86f33"); p.outline("#3a2412"); }, { smooth: true });

    A.paint("skull", 64, 64, (p) => {
        p.ellipse(32, 26, 20, 19, "#fbf7ea", "#d9d3c1");
        p.rect(22, 38, 20, 14, "#efe9d8");
        p.ellipse(24, 27, 6, 7, "#231c28").ellipse(40, 27, 6, 7, "#231c28");
        p.poly([[32, 32], [28, 39], [36, 39]], "#231c28");
        for (const x of [26, 32, 38]) p.line(x, 44, x, 52, "#231c28", 2);
        p.outline("#231c28");
    }, { smooth: true });
    A.paint("shield", 48, 48, (p) => {
        p.poly([[24, 3], [42, 9], [40, 28], [24, 45], [8, 28], [6, 9]], "#6ec4ff");
        p.poly([[24, 8], [37, 12], [35, 27], [24, 39]], "#c5ecff");
        p.outline("#16345a");
    }, { smooth: true });
    A.paint("star", 64, 64, (p) => {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 13 : 28; pts.push([32 + Math.cos(a) * r, 33 + Math.sin(a) * r]); }
        p.poly(pts, "#ffd23f"); p.outline("#8a4b0b"); p.shade(0.25, 0.15);
    }, { smooth: true });
    A.paint("starhole", 64, 64, (p) => {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 13 : 28; pts.push([32 + Math.cos(a) * r, 33 + Math.sin(a) * r]); }
        p.poly(pts, "#00000055");
    }, { smooth: true });
    A.paint("seed", 48, 48, (p) => { p.ellipse(24, 26, 11, 16, "#f5cf6b", "#c98a2a"); p.line(24, 14, 24, 38, "#a86b1f", 2); p.outline("#5c3510"); }, { smooth: true });
    A.paint("hand", 96, 96, (p) => {
        p.rect(38, 8, 16, 46, "#fff4e0"); p.circle(46, 10, 8, "#fff4e0");
        p.ellipse(50, 62, 26, 24, "#fff4e0");
        p.rect(58, 36, 12, 26, "#fff4e0"); p.rect(26, 44, 12, 22, "#fff4e0");
        p.outline("#2a2233"); p.outline("#2a2233");
    }, { smooth: true });
    const icon = (name, fn) => A.paint(name, 64, 64, fn, { smooth: true });
    icon("i_undo", (p) => { for (let a = -2.6; a < 1.4; a += 0.08) p.circle(34 + Math.cos(a) * 18, 34 + Math.sin(a) * 18, 4, "#fff"); p.poly([[3, 24], [24, 8], [24, 34]], "#fff"); });
    icon("i_menu", (p) => { for (const y of [18, 32, 46]) p.rect(10, y - 4, 44, 8, "#fff"); });
    icon("i_gear", (p) => { p.circle(32, 32, 19, "#fff"); for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; p.circle(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22, 6, "#fff"); } p.circle(32, 32, 8, "#00000000"); });
    icon("i_skip", (p) => { p.poly([[10, 12], [34, 32], [10, 52]], "#fff"); p.poly([[30, 12], [54, 32], [30, 52]], "#fff"); });
    icon("i_move", (p) => { p.ellipse(22, 44, 10, 7, "#fff"); p.ellipse(42, 24, 10, 7, "#fff"); p.circle(14, 32, 3, "#fff").circle(24, 32, 3, "#fff").circle(34, 12, 3, "#fff").circle(44, 12, 3, "#fff"); });
    icon("i_info", (p) => { p.circle(32, 14, 6, "#fff"); p.rect(26, 26, 12, 30, "#fff"); });
    icon("i_lock", (p) => { p.rect(14, 28, 36, 28, "#fff"); for (let a = Math.PI; a < Math.PI * 2; a += 0.1) p.circle(32 + Math.cos(a) * 12, 28 + Math.sin(a) * 15, 3, "#fff"); });

    A.paint("cloud", 256, 128, (p) => {
        for (const [x, y, r] of [[70, 80, 40], [120, 62, 54], [176, 78, 44], [214, 92, 26], [38, 94, 24]]) p.circle(x, y, r, "#ffffff");
        p.rect(36, 96, 186, 22, "#ffffff");
    }, { smooth: true });
}
