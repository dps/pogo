// All 2D art: the woolly logo, stars, icons. Letters are strokes stamped with fluffy circles.
const LETTERS = {
    A: [[[0, 1], [0.5, 0], [1, 1]], [[0.2, 0.64], [0.8, 0.64]]],
    B: [[[0, 0], [0, 1]], [[0, 0], [0.6, 0], [0.85, 0.12], [0.85, 0.36], [0.6, 0.48], [0, 0.48]], [[0, 0.48], [0.68, 0.48], [0.95, 0.6], [0.95, 0.86], [0.68, 1], [0, 1]]],
    R: [[[0, 1], [0, 0], [0.65, 0], [0.9, 0.14], [0.9, 0.36], [0.65, 0.5], [0, 0.5]], [[0.42, 0.5], [0.95, 1]]],
    K: [[[0, 0], [0, 1]], [[0.9, 0], [0, 0.56]], [[0.3, 0.38], [0.95, 1]]],
    W: [[[0, 0], [0.24, 1], [0.5, 0.36], [0.76, 1], [1, 0]]],
    O: [[[0.5, 0], [0.85, 0.14], [1, 0.5], [0.85, 0.86], [0.5, 1], [0.15, 0.86], [0, 0.5], [0.15, 0.14], [0.5, 0]]],
    F: [[[0.85, 0], [0, 0], [0, 1]], [[0, 0.48], [0.7, 0.48]]],
    "!": [[[0.5, 0], [0.5, 0.66]], [[0.5, 0.97], [0.5, 1]]],
};

let seed = 7;
const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

function strokePoints(word, x0, y0, h, gap, widths = {}) {
    const pts = [], feet = [];
    let x = x0;
    for (const ch of word) {
        const lw = (widths[ch] ?? 0.86) * h;
        for (const stroke of LETTERS[ch]) for (let i = 0; i + 1 < stroke.length; i++) {
            const [ax, ay] = stroke[i], [bx, by] = stroke[i + 1], len = Math.hypot((bx - ax) * lw, (by - ay) * h), n = Math.max(1, Math.ceil(len / (h * 0.09)));
            for (let k = 0; k <= n; k++) { const t = k / n; pts.push([x + (ax + (bx - ax) * t) * lw, y0 + (ay + (by - ay) * t) * h]); }
        }
        if (ch !== "!") feet.push(x + lw * 0.16, x + lw * 0.84);
        x += lw + gap;
    }
    return { pts, feet, width: x - gap - x0 };
}

/** Fluffy lettering: dark outline blobs, then wool, then highlights. */
function woolText(p, word, x0, y0, h, r, o = {}) {
    const { pts, feet } = strokePoints(word, x0, y0, h, o.gap ?? r * 2.2, o.widths);
    const ink = o.ink ?? "#2b2a3a", a = o.a ?? "#fff8ec", b = o.b ?? "#e7dcc8";
    seed = 11;
    if (o.legs) for (const fx of feet) { p.line(fx, y0 + h + r * 0.5, fx - r * 0.08, y0 + h + r * 1.7, ink, r * 0.5); }
    const blobs = pts.map(([x, y]) => [x + (rnd() - 0.5) * r * 0.5, y + (rnd() - 0.5) * r * 0.5, r * (0.8 + rnd() * 0.32)]);
    for (const [x, y, q] of blobs) p.circle(x, y + r * 0.2, q + r * 0.3, ink);
    for (const [x, y, q] of blobs) p.circle(x, y, q, b);
    for (const [x, y, q] of blobs) p.circle(x - q * 0.14, y - q * 0.16, q * 0.8, a);
    if (!o.flat) for (const [x, y, q] of blobs) if (rnd() < 0.5) p.circle(x - q * 0.3 + rnd() * q * 0.4, y - q * 0.42 + rnd() * q * 0.3, q * 0.28, "#ffffff");
}

function starShape(cx, cy, R, r, spin = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = spin + i * Math.PI / 5, q = i % 2 ? r : R; pts.push([cx + Math.cos(a) * q, cy + Math.sin(a) * q]); }
    return pts;
}

export function paintAssets(game) {
    const A = game.assets, S = { smooth: true };
    A.paint("logo", 720, 240, (p) => {
        woolText(p, "BAARK", 28, 36, 124, 19, { legs: true, gap: 30, widths: { A: 0.92, B: 0.72, R: 0.72, K: 0.72 } });
        woolText(p, "!", 632, 36, 124, 19, { widths: { "!": 0.28 }, a: "#ffd94d", b: "#f0a92c" });
        // sheep face peeking out of the first A
        const fx = 212, fy = 124;
        p.ellipse(fx, fy + 10, 32, 28, "#2b2a3a"); p.ellipse(fx, fy + 8, 28, 24, "#3b3236");
        p.ellipse(fx - 36, fy + 2, 13, 7, "#3b3236"); p.ellipse(fx + 36, fy + 2, 13, 7, "#3b3236");
        p.circle(fx - 11, fy + 2, 9, "#fff").circle(fx + 11, fy + 2, 9, "#fff").circle(fx - 8, fy + 4, 4.5, "#14131a").circle(fx + 8, fy + 4, 4.5, "#14131a");
        p.circle(fx, fy + 20, 3, "#14131a");
        for (let i = 0; i < 7; i++) p.circle(fx - 21 + i * 7, fy - 16 - (i % 2) * 5, 8, "#fff8ec");
    }, S);
    A.paint("woof", 200, 120, (p) => {
        const pts = starShape(100, 60, 96, 64, 0.13);
        const stretched = pts.map(([x, y]) => [x, 60 + (y - 60) * 0.62]);
        p.poly(stretched.map(([x, y]) => [x + 3, y + 4]), "#20242e88"); p.poly(stretched, "#ffd94d");
        p.poly(stretched.map(([x, y]) => [100 + (x - 100) * 0.86, 60 + (y - 60) * 0.84]), "#fff4c4");
        const st = { gap: 8, flat: true, widths: { W: 1.05, O: 0.8, F: 0.62, "!": 0.2 }, a: "#ef4b3f", b: "#c9302c", ink: "#20242e" };
        woolText(p, "WOOF", 20, 42, 36, 5, st);
        woolText(p, "!", 158, 42, 36, 5, st);
    }, S);
    A.paint("star", 96, 96, (p) => {
        p.poly(starShape(48, 53, 44, 22), "#7b4a12");
        p.poly(starShape(48, 49, 44, 22), "#2b2a3a"); p.poly(starShape(48, 49, 38, 18.5), "#f6a623");
        p.poly(starShape(48, 46, 33, 15.5), "#ffd94d"); p.ellipse(38, 34, 8, 5, "#fff6c9");
    }, S);
    A.paint("star0", 96, 96, (p) => {
        p.poly(starShape(48, 49, 44, 22), "#2b2a3a88"); p.poly(starShape(48, 49, 38, 18.5), "#00000038");
    }, S);
    A.paint("sheepi", 64, 64, (p) => {
        for (const [x, y, r] of [[32, 20, 12], [16, 28, 11], [48, 28, 11], [14, 42, 10], [50, 42, 10], [24, 48, 10], [42, 48, 10], [32, 34, 18]]) p.circle(x, y, r + 2, "#2b2a3a");
        for (const [x, y, r] of [[32, 20, 12], [16, 28, 11], [48, 28, 11], [14, 42, 10], [50, 42, 10], [24, 48, 10], [42, 48, 10], [32, 34, 18]]) p.circle(x, y, r, "#fff8ec");
        p.ellipse(32, 36, 12, 13, "#3b3236"); p.ellipse(16, 32, 6, 3.5, "#3b3236"); p.ellipse(48, 32, 6, 3.5, "#3b3236");
        p.circle(27, 33, 4, "#fff").circle(37, 33, 4, "#fff").circle(28, 34, 2, "#14131a").circle(36, 34, 2, "#14131a");
    }, S);
    A.paint("sun", 64, 64, (p) => {
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.line(32 + Math.cos(a) * 19, 32 + Math.sin(a) * 19, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28, "#f6a623", 6); }
        p.circle(32, 32, 19, "#2b2a3a"); p.circle(32, 32, 16, "#ffd94d", "#f6a623"); p.ellipse(26, 25, 5, 3.5, "#fff6c9");
    }, S);
    A.paint("moon", 64, 64, (p) => {
        p.circle(32, 32, 24, "#2b2a3a"); p.circle(32, 32, 21, "#fdf3c8", "#e0d08a"); p.circle(42, 26, 18, "#2b2a3a00");
        p.circle(24, 26, 4, "#d4c47f"); p.circle(38, 40, 6, "#d4c47f"); p.circle(40, 22, 3, "#d4c47f");
    }, S);
    A.paint("cloudi", 64, 64, (p) => {
        p.poly([[36, 34], [24, 50], [32, 50], [26, 62], [44, 44], [35, 44], [42, 34]], "#ffd94d");
        for (const [x, y, r] of [[22, 26, 12], [36, 20, 14], [48, 28, 10]]) p.circle(x, y, r + 2.5, "#2b2a3a");
        for (const [x, y, r] of [[22, 26, 12], [36, 20, 14], [48, 28, 10]]) p.circle(x, y, r, "#e8eef6");
    }, S);
    A.paint("lock", 64, 64, (p) => {
        p.ellipse(32, 26, 15, 17, "#2b2a3a"); p.ellipse(32, 26, 8, 11, "#00000000");
        p.circle(32, 26, 9, "#8c7a64");
        p.rect(14, 28, 36, 28, "#2b2a3a"); p.rect(17, 31, 30, 22, "#d9a441"); p.circle(32, 40, 4, "#2b2a3a"); p.rect(30, 40, 4, 8, "#2b2a3a");
    }, S);
    A.paint("pause", 64, 64, (p) => {
        p.circle(32, 32, 28, "#2b2a3a"); p.circle(32, 31, 25, "#fff4dc"); p.rect(22, 19, 7, 24, "#2b2a3a"); p.rect(35, 19, 7, 24, "#2b2a3a");
    }, S);
    A.paint("paw", 128, 128, (p) => {
        const pad = [[64, 80, 28, 24], [28, 56, 12, 16], [50, 34, 12, 17], [78, 34, 12, 17], [100, 56, 12, 16]];
        for (const [x, y, a, b] of pad) p.ellipse(x, y, a + 4, b + 4, "#2b2a3a");
        for (const [x, y, a, b] of pad) p.ellipse(x, y, a, b, "#ffd94d", "#f6a623");
    }, S);
    A.paint("tick", 48, 48, (p) => { p.line(10, 26, 20, 37, "#2b2a3a", 10); p.line(20, 37, 39, 11, "#2b2a3a", 10); p.line(10, 26, 20, 37, "#5fc74a", 5); p.line(20, 37, 39, 11, "#5fc74a", 5); }, S);
    A.paint("cross", 48, 48, (p) => { p.line(12, 12, 36, 36, "#2b2a3a", 10); p.line(36, 12, 12, 36, "#2b2a3a", 10); p.line(12, 12, 36, 36, "#e0564a", 5); p.line(36, 12, 12, 36, "#e0564a", 5); }, S);
    // Level badges
    const badge = (p, top, bot) => { p.circle(40, 40, 37, "#2b2a3a"); p.circle(40, 39, 34, top, bot); };
    A.paint("badges", 80, 80, (p, f) => {
        const fence = () => { p.rect(14, 54, 52, 3, "#a8743f"); p.rect(14, 44, 52, 3, "#a8743f"); for (const x of [18, 39, 60]) p.rect(x, 38, 4, 24, "#c49358"); };
        if (f === 0) { badge(p, "#8fd3f4", "#d9f1c0"); p.circle(40, 30, 13, "#ffd94d", "#f6a623"); p.rect(10, 52, 60, 20, "#7cc04f"); fence(); }
        if (f === 1) { badge(p, "#a5e1a0", "#55a04a"); for (const [x, y] of [[20, 24], [36, 22], [20, 40], [20, 56], [60, 56], [60, 40], [44, 56]]) p.rect(x - 8, y - 8, 16, 16, "#33803d"); p.line(44, 18, 44, 44, "#fff4dc", 5); p.line(44, 44, 36, 66, "#fff4dc", 5); }
        if (f === 2) { badge(p, "#8fd3f4", "#2f98c0"); p.rect(6, 30, 68, 28, "#3bb0d0"); p.rect(14, 38, 52, 12, "#a8743f"); for (let x = 16; x < 64; x += 8) p.rect(x, 38, 4, 12, "#c49358"); p.rect(14, 32, 3, 8, "#6b4426"); p.rect(63, 32, 3, 8, "#6b4426"); }
        if (f === 3) { badge(p, "#f7d9a0", "#cf9a55"); p.circle(40, 40, 20, "#fff8ec"); p.circle(19, 34, 10, "#e9d7a8"); p.circle(61, 34, 10, "#e9d7a8"); p.circle(19, 34, 4, "#b99a6c"); p.circle(61, 34, 4, "#b99a6c"); p.ellipse(40, 46, 11, 13, "#c9a77e"); p.circle(34, 42, 2.5, "#14131a").circle(46, 42, 2.5, "#14131a"); }
        if (f === 4) { badge(p, "#6a4a9a", "#f08a7a"); p.poly([[20, 16], [34, 34], [46, 34], [60, 16], [60, 50], [40, 68], [20, 50]], "#6c7488"); p.poly([[30, 48], [50, 48], [40, 64]], "#d4d6dc"); p.circle(31, 40, 3, "#fff27a").circle(49, 40, 3, "#fff27a"); }
        if (f === 5) { badge(p, "#f0a86c", "#a84a3a"); p.ellipse(40, 44, 20, 20, "#4c2f28"); p.poly([[22, 34], [8, 28], [14, 14], [24, 26]], "#fff5dc"); p.poly([[58, 34], [72, 28], [66, 14], [56, 26]], "#fff5dc"); p.ellipse(40, 54, 13, 9, "#d8ab8e"); p.circle(32, 38, 3, "#ff4a33").circle(48, 38, 3, "#ff4a33"); p.line(36, 62, 44, 62, "#f2c94c", 3); }
        if (f === 6) { badge(p, "#46566e", "#8ea4b4"); p.ellipse(32, 26, 18, 10, "#dfe6ee"); p.ellipse(50, 28, 14, 9, "#dfe6ee"); p.poly([[44, 34], [30, 52], [40, 52], [32, 70], [54, 46], [44, 46], [52, 34]], "#ffd94d"); }
        if (f === 7) { badge(p, "#10143a", "#2e3a78"); p.circle(46, 30, 16, "#fdf3c8"); p.circle(41, 27, 15, "#1a2150"); for (const [x, y] of [[18, 24], [26, 44], [58, 56], [20, 60], [62, 22]]) p.circle(x, y, 2, "#fff27a"); }
    }, { frames: 8, smooth: true });
    A.paint("vignette", 96, 96, (p) => {
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) { const d = Math.hypot((x - 47.5) / 47.5, (y - 47.5) / 47.5), a = Math.min(1, Math.max(0, (d - 0.72) / 0.72)); p.set(x, y, [0.1, 0.07, 0.2, a * a * 0.9]); }
    }, S);
    A.paint("chev", 48, 48, (p) => { p.poly([[24, 4], [44, 30], [32, 30], [32, 44], [16, 44], [16, 30], [4, 30]], "#2b2a3a"); p.poly([[24, 10], [38, 27], [28, 27], [28, 40], [20, 40], [20, 27], [10, 27]], "#ffd94d"); }, S);
}
