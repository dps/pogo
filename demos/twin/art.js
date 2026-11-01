// Painted 2D art: soft particles, stickers and icons. Everything for the HUD and the screen-space effects.
const TAU = Math.PI * 2;

/** Fill a sprite from f(u,v) -> [r,g,b,a] in 0-1, with u,v in -1..1. */
function field(A, name, size, fn) {
    A.paint(name, size, size, (p) => {
        const data = p.data;
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
            const c = fn((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1), o = (y * size + x) * 4;
            data[o] = c[0] * 255; data[o + 1] = c[1] * 255; data[o + 2] = c[2] * 255; data[o + 3] = c[3] * 255;
        }
    }, { smooth: true });
}
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function paintArt(game) {
    const A = game.assets;
    const W1 = [1, 1, 1, 0];
    // Particles are white so they can be tinted.
    field(A, "soft", 64, (x, y) => { const r = Math.hypot(x, y), a = Math.max(0, 1 - r); W1[3] = a * a; return W1; });
    field(A, "puff", 64, (x, y) => {
        const r = Math.hypot(x, y), n = vnoise(x * 2.4 + 5, y * 2.4 + 3) * 0.6 + vnoise(x * 5, y * 5) * 0.4, a = Math.max(0, Math.min(1, (1 - r - (n - 0.5) * 0.9) * 3.4));
        const lit = 0.76 + 0.24 * Math.max(0, -y * 0.7 - x * 0.3 + 0.4);
        return [lit, lit, lit, a];
    });
    field(A, "ring", 96, (x, y) => { const r = Math.hypot(x, y), a = Math.max(0, 1 - Math.abs(r - 0.86) * 12); W1[3] = a; return W1; });
    field(A, "flame", 64, (x, y) => {
        const r = Math.hypot(x, y * 0.8), n = vnoise(x * 3 + 2, y * 3), a = Math.max(0, Math.min(1, (1 - r - (n - 0.5) * 0.8) * 3));
        const h = Math.max(0, 1 - r * 1.3);
        return [1, 0.5 + h * 0.5, 0.14 + h * h * 0.7, a];
    });
    field(A, "spark", 32, (x, y) => { const a = Math.max(0, 1 - Math.abs(y) * 2.2 - x * x); W1[3] = a; return W1; });
    field(A, "bolt", 48, (x, y) => {
        const q = Math.abs(y + 0.28 * Math.sin(x * 9));
        W1[3] = Math.max(0, 1 - q * 8) * (1 - x * x);
        return W1;
    });
    field(A, "lint", 32, (x, y) => { const r = Math.hypot(x, y), a = Math.max(0, Math.min(1, (0.9 - r + (vnoise(x * 4, y * 4) - 0.5)) * 4)); W1[3] = a; return W1; });

    // Sticker burst, behind scores.
    A.paint("burst", 128, 128, (p) => {
        const pts = [];
        for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r = i % 2 ? 40 : 60; pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r]); }
        p.poly(pts, "#ffffff");
    }, { smooth: true });

    // Icons: white silhouettes on transparent, tinted when drawn.
    const icon = (name, draw) => A.paint(`i_${name}`, 96, 96, (p) => draw(p), { smooth: true });
    const blade = (p) => {
        p.poly([[14, 58], [66, 34], [84, 40], [84, 52], [72, 58], [24, 72]], "#ffffff");
        for (let i = 0; i < 6; i++) { const x = 24 + i * 10; p.poly([[x, 72 - i * 2.4 - 6], [x + 8, 70 - i * 2.4 - 8], [x + 5, 82 - i * 2.4]], "#ffffff"); }
        p.ellipse(22, 58, 16, 16, "#ffffff");
    };
    icon("saw", blade);
    icon("spin", (p) => {
        for (let i = 0; i < 3; i++) {
            const a = i / 3 * TAU;
            for (let t = 0; t < 26; t++) { const b = a + t * 0.07, r = 12 + t * 1.14; p.circle(48 + Math.cos(b) * r, 48 + Math.sin(b) * r, 2 + t * 0.2, "#ffffff"); }
        }
    });
    icon("wheel", (p) => {
        p.circle(48, 48, 36, "#ffffff");
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = 48 + Math.cos(a) * 21, y = 48 + Math.sin(a) * 21; p.circle(x, y, 7, "#00000000"); }
        const d = p.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
            const r = Math.hypot(x - 48, y - 48), a = Math.atan2(y - 48, x - 48), sp = Math.abs(Math.sin(a * 3));
            if (r < 28 && r > 11 && sp > 0.3) d[(y * 96 + x) * 4 + 3] = 0;
        }
    });
    icon("bolt", (p) => p.poly([[58, 6], [22, 54], [44, 54], [34, 90], [76, 38], [52, 38]], "#ffffff"));
    icon("dust", (p) => {
        for (const [x, y, r] of [[48, 56, 26], [28, 62, 16], [68, 62, 17], [38, 36, 16], [60, 38, 14]]) p.circle(x, y, r, "#ffffff");
        p.circle(78, 20, 5, "#ffffff"); p.circle(14, 28, 4, "#ffffff"); p.circle(86, 40, 3, "#ffffff");
    });
    icon("heart", (p) => {
        p.circle(32, 36, 20, "#ffffff"); p.circle(64, 36, 20, "#ffffff");
        p.poly([[14, 46], [82, 46], [48, 86]], "#ffffff");
    });
    icon("nail", (p) => { p.poly([[42, 18], [54, 18], [52, 70], [48, 92], [44, 70]], "#ffffff"); p.rect(26, 8, 44, 12, "#ffffff"); });
    icon("flame", (p) => {
        p.circle(48, 62, 26, "#ffffff");
        p.poly([[24, 58], [36, 26], [46, 42], [52, 8], [70, 42], [74, 58]], "#ffffff");
    });
    icon("pause", (p) => { p.rect(26, 18, 16, 60, "#ffffff"); p.rect(54, 18, 16, 60, "#ffffff"); });
    icon("gear", (p) => {
        p.circle(48, 48, 28, "#ffffff");
        for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, c = Math.cos(a), s = Math.sin(a); p.poly([[48 + c * 24 - s * 8, 48 + s * 24 + c * 8], [48 + c * 24 + s * 8, 48 + s * 24 - c * 8], [48 + c * 42 + s * 6, 48 + s * 42 - c * 6], [48 + c * 42 - s * 6, 48 + s * 42 + c * 6]], "#ffffff"); }
        const d = p.data;
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) if (Math.hypot(x - 48, y - 48) < 12) d[(y * 96 + x) * 4 + 3] = 0;
    });
    // Weapon silhouettes for the HUD.
    icon("lint", (p) => { p.circle(30, 48, 16, "#ffffff"); p.rect(36, 40, 44, 16, "#ffffff"); p.circle(88, 48, 6, "#ffffff"); });
    icon("nailgun", (p) => { p.rect(12, 28, 64, 24, "#ffffff"); p.rect(66, 34, 24, 12, "#ffffff"); p.rect(28, 50, 18, 34, "#ffffff"); });
    icon("blower", (p) => { p.circle(30, 48, 22, "#ffffff"); p.poly([[40, 34], [92, 42], [92, 54], [40, 62]], "#ffffff"); });
    icon("dryer", (p) => { p.circle(34, 38, 22, "#ffffff"); p.rect(30, 28, 50, 20, "#ffffff"); p.rect(76, 24, 12, 28, "#ffffff"); p.rect(26, 56, 18, 32, "#ffffff"); });
    icon("sock", (p) => { p.rect(30, 8, 30, 50, "#ffffff"); p.circle(48, 66, 22, "#ffffff"); p.circle(72, 72, 16, "#ffffff"); });
}
