// Four kitchens, painted once per visit, and the gags that live in them. Gags react to the fight: pans swing on heavy hits,
// shelves shed plates when someone hits the wall, and anything can be poked with a finger.
import { Brush, INK, add, box, cut, disc, hex, mix, oval, seg, taper } from "./paint.js";

const W = 1060, H = 660, X0 = 530, Y0 = 500;   // Painted canvas, with the world origin (floor line, centre) at X0, Y0.
export const STAGE_SIZE = { W, H, X0, Y0 };
export const WALL_Y = -66;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

export const STAGES = [
    { id: "diner", name: "SUNNY SIDE DINER", wall: ["#fbe4b4", "#f6c98d"], tile: "#fff4da", grout: "#e7b98a", floorA: "#e8472e", floorB: "#fff1d6", cab: "#2fa7a0", cab2: "#1f7f7c", top: "#f4b52e", sky: ["#8ad7f0", "#fff0c9"], hood: "#d4dde5", amb: "#ffb65c", music: 0 },
    { id: "midnight", name: "MIDNIGHT SNACK", wall: ["#2c2f66", "#1d1c4a"], tile: "#39407a", grout: "#20214f", floorA: "#3a2e6e", floorB: "#6f5fb0", cab: "#46448f", cab2: "#302d6b", top: "#9fa8e8", sky: ["#0d1238", "#2a2f7a"], hood: "#6b6fb0", amb: "#6ff0ff", music: 1 },
    { id: "bakery", name: "FLOUR POWER BAKERY", wall: ["#f4cfa0", "#e0a36a"], tile: "#f8dcb4", grout: "#cf9663", floorA: "#a35c34", floorB: "#d6935c", cab: "#b65a3a", cab2: "#8a3f27", top: "#fff1d6", sky: ["#ffb27a", "#ffe6b4"], hood: "#c9a27c", amb: "#ffd089", music: 2 },
    { id: "line", name: "THE HOT LINE", wall: ["#55606e", "#343c49"], tile: "#6d7a89", grout: "#3a4250", floorA: "#2b3038", floorB: "#49525e", cab: "#a9b7c4", cab2: "#79889a", top: "#dfe7ee", sky: ["#ff7a3c", "#ffc23c"], hood: "#bfcbd6", amb: "#ff7a3c", music: 3 },
];

function paintCounter(b, st, x0, x1, topY) {
    const y1 = WALL_Y + 2, bb = [x0 - 4, topY - 6, x1 + 4, y1 + 4];
    b.enamel(box((x0 + x1) / 2, (topY + y1) / 2, x1 - x0, y1 - topY, 3), bb, [st.cab, st.cab2], { ink: 2, bevel: 5, spec: 0.3 });
    const n = Math.round((x1 - x0) / 76), w = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
        const cx = x0 + w * (i + 0.5), cy = (topY + 14 + y1) / 2;
        b.enamel(box(cx, cy, w - 9, y1 - topY - 26, 5), [cx - w / 2, topY, cx + w / 2, y1], [st.cab, st.cab2], { ink: 1.6, bevel: 7, spec: 0.5 });
        b.chrome(box(cx, topY + 22, 28, 5, 2.5), [cx - 15, topY + 18, cx + 15, topY + 27], { ink: 1 });
    }
    b.enamel(box((x0 + x1) / 2, topY, x1 - x0 + 12, 12, 3), [x0 - 8, topY - 7, x1 + 8, topY + 7], st.top, { ink: 2, bevel: 4, spec: 0.8 });
}
function paintShelf(b, st, x0, x1, y, items) {
    const c = hex(st.cab2);
    b.enamel(box((x0 + x1) / 2, y, x1 - x0, 7, 2), [x0, y - 4, x1, y + 4], st.top, { ink: 1.6, bevel: 3 });
    for (const x of [x0 + 16, x1 - 16]) b.flat(seg(x, y + 3, x + 7, y + 16, 2), [x - 3, y, x + 10, y + 18], INK);
    for (const it of items) it(y - 3);
}
const jar = (b, x, col, h = 34) => (y) => {
    b.glass(box(x, y - h / 2, 22, h, 5), [x - 12, y - h, x + 12, y], "#e7f4f4", { alpha: 0.4 });
    b.flat(box(x, y - h * 0.34, 18, h * 0.6, 4), [x - 10, y - h, x + 10, y], col, 0.85);
    b.enamel(box(x, y - h - 2, 20, 7, 2), [x - 11, y - h - 6, x + 11, y - h + 2], "#2c2233", { ink: 1, bevel: 2 });
};
const pot = (b, x, col, w = 44, h = 26) => (y) => {
    b.enamel(box(x, y - h / 2, w, h, 5), [x - w / 2, y - h, x + w / 2, y], [col, mix(hex(col), [0, 0, 0], 0.3)], { ink: 1.6, bevel: 7 });
    b.enamel(box(x, y - h - 2, w - 4, 5, 2), [x - w / 2, y - h - 5, x + w / 2, y - h + 1], col, { ink: 1.2, bevel: 2 });
    b.enamel(disc(x, y - h - 7, 3), [x - 4, y - h - 11, x + 4, y - h - 3], "#2c2233", { ink: 0.9, bevel: 2 });
};
function paintWindow(b, st, cx, cy, w, h, kind) {
    const bb = [cx - w / 2 - 12, cy - h / 2 - 14, cx + w / 2 + 12, cy + h / 2 + 14];
    b.enamel(box(cx, cy, w + 18, h + 18, 4), bb, "#fff8ea", { ink: 2, bevel: 4, spec: 0 });
    const sky0 = hex(st.sky[0]), sky1 = hex(st.sky[1]), yt = cy - h / 2;
    b.fill(box(cx, cy, w, h, 2), bb, (x, y, d, c) => { const k = clamp((y - yt) / h), m = mix(sky0, sky1, k); c[0] = m[0]; c[1] = m[1]; c[2] = m[2]; });
    if (kind === "moon") {
        b.glow(cx + 30, cy - 18, 90, 90, "#8f9dff", 0.45);
        b.enamel(cut(disc(cx + 30, cy - 18, 28), disc(cx + 42, cy - 26, 25)), bb, "#fff6c8", { ink: 0, bevel: 8, spec: 0 });
        for (const [x, y] of [[-70, -30], [-40, 10], [-90, 26], [70, 30], [-20, -44], [80, -46]]) b.flat(disc(cx + x, cy + y, 1.6), bb, "#ffffff", 0.9);
    } else if (kind === "sun") {
        b.glow(cx - 40, cy + 30, 130, 100, "#fff6c0", 0.9);
        b.enamel(disc(cx - 40, cy + 30, 30), bb, "#ffe99a", { ink: 0, bevel: 6, spec: 0 });
        b.flat(oval(cx + 50, cy - 30, 34, 11), bb, "#ffffff", 0.9); b.flat(oval(cx + 30, cy - 38, 22, 11), bb, "#ffffff", 0.9);
    } else if (kind === "fire") {
        b.glow(cx, cy + 40, 170, 90, "#fff0a0", 0.8);
    }
    b.flat(box(cx, cy, 6, h, 0), bb, "#fff8ea"); b.flat(box(cx, cy, w, 6, 0), bb, "#fff8ea");
}
function paintCurtains(b, cx, cy, w, h, col) {
    for (const s of [-1, 1]) {
        const x = cx + s * (w / 2 - 12);
        const f = (px, py) => { const k = (py - (cy - h / 2 - 10)) / (h * 0.75); return Math.abs(px - x + s * Math.pow(clamp(k), 2) * 24) - (30 - clamp(k) * 8); };
        b.enamel((px, py) => Math.max(f(px, py), py - (cy + h * 0.22), (cy - h / 2 - 10) - py), [cx - w / 2 - 30, cy - h / 2 - 14, cx + w / 2 + 30, cy + h * 0.3], col, { ink: 1.6, bevel: 8, spec: 0, fn: (px, py, c) => { const v = Math.sin(px * 0.5) * 0.1; return mix(c, [255, 255, 255], Math.max(0, v)); } });
    }
    b.chrome(box(cx, cy - h / 2 - 12, w + 60, 6, 3), [cx - w / 2 - 32, cy - h / 2 - 16, cx + w / 2 + 32, cy - h / 2 - 8], { ink: 1 });
}
function paintStove(b, st, x, top) {
    const w = 170, h = WALL_Y + 2 - top, bb = [x - w / 2 - 6, top - 8, x + w / 2 + 6, WALL_Y + 4];
    b.enamel(box(x, top + h / 2, w, h, 5), bb, ["#e9edf2", "#a7b4c1"], { ink: 2, bevel: 7 });
    b.enamel(box(x, top + 44, w - 34, h - 60, 6), bb, "#2a2733", { ink: 1.6, bevel: 3, spec: 0.7 });
    b.glow(x, top + 66, 60, 26, st.amb, 0.75);
    b.chrome(box(x, top + 22, w - 44, 6, 3), [x - w / 2, top + 18, x + w / 2, top + 27], { ink: 1 });
    for (let i = 0; i < 4; i++) { const dx = x - 57 + i * 38; b.enamel(disc(dx, top + 9, 6), [dx - 7, top + 2, dx + 7, top + 16], "#2c2233", { ink: 1, bevel: 3 }); }
    b.enamel(box(x, top - 3, w + 10, 7, 2), [x - w / 2 - 6, top - 7, x + w / 2 + 6, top + 1], "#3a3442", { ink: 1.5, bevel: 2 });
}
function paintHood(b, st, x, y) {
    const f = taper(x, y, y + 76, 86, 220, 6), bb = [x - 112, y - 2, x + 112, y + 80];
    b.flat(box(x, y - 90, 80, 190, 0), [x - 42, y - 190, x + 42, y + 4], mix(hex(st.hood), [0, 0, 0], 0.15));
    b.enamel(f, bb, st.hood, { ink: 2, bevel: 10 });
    b.chrome(box(x, y + 74, 226, 8, 3), [x - 116, y + 69, x + 116, y + 79], { ink: 1.2 });
}

/** Paint one kitchen background into a sprite, once. */
export function paintStage(assets, i) {
    const st = STAGES[i], name = `stage_${st.id}`;
    if (assets.sprites.has(name)) return name;
    assets.paint(name, W, H, (p) => {
        const b = new Brush(p, 1); b.region(0, 0, W, H, X0, Y0);
        const all = [-X0, -Y0, W - X0, H - Y0], wy = WALL_Y;
        // Wall, with tiles up to shoulder height.
        const w0 = hex(st.wall[0]), w1 = hex(st.wall[1]), tile = hex(st.tile), grout = hex(st.grout), T = 34;
        b.fill((x, y) => y - wy, all, (x, y, d, c) => {
            const k = clamp((y + Y0) / (Y0 + wy)); let col = mix(w0, w1, k);
            if (y > -310) {
                const row = Math.floor((y + 900) / T), px = (x + 2000 + (row % 2) * T / 2) % T, py = (y + 900) % T;
                const edge = Math.min(px, T - px, py, T - py), n = Math.sin(row * 12.9 + Math.floor((x + 2000 + (row % 2) * T / 2) / T) * 78.2) * 0.5 + 0.5;
                const t = mix(tile, [255, 255, 255], n * 0.12);
                col = edge < 1.4 ? grout : mix(t, mix(t, [0, 0, 0], 0.2), clamp(k * 0.55));
            }
            if (y > -318 && y < -306) col = mix(hex(st.cab), hex(st.cab2), (y + 318) / 12);
            c[0] = col[0]; c[1] = col[1]; c[2] = col[2];
        });
        // Checked floor in perspective.
        const fa = hex(st.floorA), fb = hex(st.floorB);
        b.fill((x, y) => wy - y, all, (x, y, d, c) => {
            // Four samples per pixel keep the far tiles from shimmering.
            let cover = 0;
            for (const [ox, oy] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) { const z = 340 / (y + oy - wy + 60), u = (x + ox) * z * 0.012, v = z * 4.6; cover += ((Math.floor(u) + Math.floor(v)) & 1) * 0.25; }
            const fade = clamp((y - wy) / 190), m = mix(mix(fb, fa, cover), [40, 26, 50], 0.34 * (1 - fade));
            const shine = Math.exp(-Math.pow(x * 0.004, 2)) * 0.12 * (1 - fade);
            c[0] = m[0] + (255 - m[0]) * shine; c[1] = m[1] + (255 - m[1]) * shine; c[2] = m[2] + (255 - m[2]) * shine;
        });
        b.flat(box(0, wy + 3, W, 7, 0), all, INK, 0.75);
        const s = st.id;
        if (s === "diner") {
            paintWindow(b, st, -210, -292, 220, 138, "sun"); paintCurtains(b, -210, -292, 220, 138, "#e8472e");
            paintCounter(b, st, -510, 40, -176);
            paintStove(b, st, 150, -196); paintHood(b, st, 150, -420);
            paintCounter(b, st, 240, 520, -176);
            paintShelf(b, st, 268, 500, -330, [pot(b, 300, "#e8472e"), jar(b, 352, "#f4b52e"), jar(b, 382, "#7fbf6a", 28), jar(b, 412, "#e8472e", 38), pot(b, 462, "#2fa7a0", 40, 22)]);
            paintShelf(b, st, -500, -372, -250, [jar(b, -476, "#a96a3c"), jar(b, -444, "#ffc23c", 30), jar(b, -410, "#7fbf6a", 26)]);
            b.enamel(box(-90, -200, 50, 44, 8), [-118, -224, -62, -176], ["#f4f1e4", "#d9d0ba"], { ink: 1.6, bevel: 6 });
            b.enamel(oval(-400, -184, 44, 14), [-446, -200, -354, -170], "#fff1d6", { ink: 1.6, bevel: 5, spec: 0.5 });
            for (const [x, y, c] of [[-418, -198, "#e8472e"], [-398, -202, "#f4b52e"], [-380, -196, "#7fbf6a"]]) b.enamel(disc(x, y, 11), [x - 12, y - 12, x + 12, y + 12], c, { ink: 1.2, bevel: 6 });
        } else if (s === "midnight") {
            paintWindow(b, st, 200, -292, 240, 150, "moon");
            b.glow(120, -60, 340, 240, "#5a6cff", 0.12);
            paintCounter(b, st, -300, 520, -176);
            paintCounter(b, st, -520, -440, -176);
            // A large sleeping fridge at left, door ajar and glowing.
            b.enamel(box(-370, -210, 130, 300, 22), [-440, -360, -300, -60], ["#3b3f8a", "#27286a"], { ink: 2, bevel: 10 });
            b.flat(box(-310, -210, 6, 280, 3), [-316, -350, -304, -70], "#a0f2ff", 0.9);
            b.glow(-250, -150, 150, 150, "#a0f2ff", 0.32);
            b.fill((x, y) => y - wy - 110, all, (x, y, d, c) => { c[0] = 160; c[1] = 242; c[2] = 255; c[3] = clamp(0.2 * (1 - Math.hypot((x + 240) / 240, (y - wy - 40) / 70))); });
            paintShelf(b, st, -220, 40, -330, [jar(b, -190, "#6ff0ff"), jar(b, -158, "#ff9fc4", 28), pot(b, -96, "#6f5fb0"), jar(b, -36, "#ffd14a")]);
            // Sink and tap.
            b.chrome(add(seg(40, -176, 40, -226, 4), seg(40, -226, 78, -226, 4), seg(78, -226, 78, -210, 4)), [28, -236, 90, -170], { ink: 1.4 });
            b.enamel(box(420, -194, 80, 26, 6), [378, -208, 462, -178], "#6b6fb0", { ink: 1.6, bevel: 6 });
        } else if (s === "bakery") {
            paintWindow(b, st, 210, -292, 200, 130, "sun"); paintCurtains(b, 210, -292, 200, 130, "#fff1d6");
            // Brick bread oven.
            const bb = [-430, -350, -100, -60];
            b.fill(box(-265, -205, 320, 290, 18), bb, (x, y, d, c) => {
                const row = Math.floor((y + 900) / 18), px = (x + 2000 + (row % 2) * 18) % 36, py = (y + 900) % 18, e = Math.min(px, 36 - px, py, 18 - py);
                const n = Math.sin(row * 7.3 + Math.floor((x + 2000) / 36) * 3.7) * 0.5 + 0.5, m = e < 1.6 ? [120, 66, 44] : mix([186, 90, 58], [150, 66, 44], n);
                const edge = clamp(1 + d / 2); c[0] = m[0] + (36 - m[0]) * edge; c[1] = m[1] + (24 - m[1]) * edge; c[2] = m[2] + (44 - m[2]) * edge;
            });
            b.enamel(add(oval(-265, -190, 90, 70)), bb, "#2a1712", { ink: 2.4, bevel: 8, spec: 0 });
            b.glow(-265, -160, 80, 56, "#ff8a3c", 0.95);
            b.enamel(oval(-265, -148, 62, 22), bb, ["#e8b264", "#b7743a"], { ink: 1.5, bevel: 12, spec: 0.2 });
            paintCounter(b, st, -80, 520, -176);
            paintCounter(b, st, -520, -430, -176);
            paintShelf(b, st, 340, 520, -346, [jar(b, 370, "#fff1d6"), jar(b, 404, "#a35c34", 28), pot(b, 460, "#b65a3a")]);
            paintShelf(b, st, -80, 90, -330, [jar(b, -50, "#ffe08a"), jar(b, -16, "#e8472e", 28), jar(b, 20, "#7fbf6a", 32)]);
            // Cake stand.
            b.chrome(add(box(40, -183, 90, 5, 2), box(40, -200, 12, 34, 3)), [-8, -220, 88, -178], { ink: 1.2 });
            b.enamel(box(40, -226, 76, 26, 8), [0, -242, 80, -212], ["#ffd6e6", "#f7a6c6"], { ink: 1.6, bevel: 6 });
            b.enamel(box(40, -249, 54, 22, 8), [10, -262, 70, -238], ["#fff8ee", "#ffe0b4"], { ink: 1.6, bevel: 6 });
            b.enamel(disc(40, -266, 7), [32, -274, 48, -258], "#e8472e", { ink: 1.2, bevel: 5 });
        } else {
            paintHood(b, st, -160, -440); paintHood(b, st, 240, -440);
            b.glow(40, -220, 520, 240, "#ff7a3c", 0.12);
            for (const x of [-160, 240]) paintStove(b, st, x, -196);
            paintCounter(b, st, -520, -250, -176); paintCounter(b, st, -70, 150, -176); paintCounter(b, st, 330, 520, -176);
            // The pass window, with a warm glow behind the heat lamps.
            paintShelf(b, st, -60, 150, -330, [pot(b, -20, "#d4dde5"), pot(b, 40, "#a9b7c4", 40, 30), pot(b, 104, "#d4dde5", 42, 22)]);
            paintShelf(b, st, -510, -280, -320, [pot(b, -470, "#a9b7c4"), pot(b, -410, "#d4dde5", 42, 30), pot(b, -340, "#a9b7c4", 48, 24)]);
            paintShelf(b, st, 340, 510, -320, [pot(b, 380, "#d4dde5"), jar(b, 440, "#ffc23c"), jar(b, 476, "#e8472e", 28)]);
        }
        // A wash of the room's own air pushes the kitchen behind the fighters.
        const air = mix(hex(st.wall[0]), hex(st.wall[1]), 0.5);
        b.fill((x, y) => y - wy - 2, all, (x, y, d, c) => { c[0] = air[0]; c[1] = air[1]; c[2] = air[2]; c[3] = 0.2; });
    }, { smooth: true });
    return name;
}

// --- Gag parts -------------------------------------------------------------------------------------------------
const GSHEET = 512;
export function paintGags(assets) {
    let parts = {};
    assets.paint("gags", GSHEET, GSHEET, (p) => {
        const b = new Brush(p, 2);
        let cx = 2, cy = 2, row = 0;
        const part = (name, w, h, ox, oy, fn) => {
            const pw = w * 2, ph = h * 2;
            if (cx + pw > GSHEET - 2) { cx = 2; cy += row + 3; row = 0; }
            b.region(cx, cy, pw, ph, ox * 2, oy * 2); fn();
            parts[name] = { crop: [cx, cy, pw, ph], w, h, ox, oy };
            cx += pw + 3; row = Math.max(row, ph);
        };
        part("pan", 48, 96, 24, 8, () => {
            b.enamel(box(0, 22, 8, 46, 3), [-5, 0, 5, 46], "#2c2233", { ink: 1.2, bevel: 3 });
            b.flat(disc(0, 3, 3), [-4, 0, 4, 7], "#2c2233");
            b.enamel(disc(0, 62, 22), [-23, 40, 23, 85], ["#585062", "#2d2733"], { ink: 1.6, bevel: 7, spec: 1 });
        });
        part("ladle", 34, 92, 17, 6, () => {
            b.chrome(box(0, 26, 5, 52, 2.4), [-3, 2, 3, 54], { ink: 1 });
            b.chrome(oval(0, 66, 14, 16), [-15, 50, 15, 83], { ink: 1.3 });
        });
        part("plate", 44, 44, 22, 22, () => {
            b.enamel(disc(0, 0, 20), [-20, -20, 20, 20], ["#fffdf5", "#d6e0e6"], { ink: 1.5, bevel: 4, spec: 0.5 });
            b.flat(cut(disc(0, 0, 14), disc(0, 0, 12.4)), [-15, -15, 15, 15], "#2fa7a0", 0.9);
        });
        part("cat", 66, 60, 30, 56, () => {
            const bb = [-30, -56, 36, 4];
            b.flat(seg(-22, -10, -32, -38, 4), bb, "#241a2c");
            b.enamel(add(oval(-2, -18, 20, 20), oval(12, -38, 15, 13)), bb, ["#ff9f5a", "#d9642c"], { ink: 1.5, bevel: 8, spec: 0 });
            for (const s of [-1, 1]) b.enamel((x, y) => { const px = Math.abs(x - 12 - s * 8), t = clamp((y + 57) / 12); return Math.max(px - t * 6, -57 - y, y + 45); }, bb, "#ff9f5a", { ink: 1.3, bevel: 2, spec: 0 });
            b.flat(oval(7, -39, 2.6, 3.4), bb, "#241a2c"); b.flat(oval(18, -39, 2.6, 3.4), bb, "#241a2c");
            b.flat(oval(12.5, -33, 2, 1.3), bb, "#e8472e");
            for (const s of [-1, 1]) b.flat(seg(12.5 + s * 5, -33, 12.5 + s * 14, -35, 0.5), bb, "#241a2c");
        });
        part("mouse", 44, 28, 20, 24, () => {
            const bb = [-20, -24, 24, 4];
            b.flat(seg(-12, -6, -19, -2, 1.2), bb, "#ef6f7c");
            b.enamel(add(oval(0, -9, 14, 9), oval(14, -11, 7, 6)), bb, ["#b7bcd0", "#7e84a0"], { ink: 1.2, bevel: 5, spec: 0 });
            b.enamel(disc(9, -18, 5), bb, "#ef9fb0", { ink: 1, bevel: 3, spec: 0 });
            b.flat(disc(16, -12, 1.6), bb, "#241a2c");
        });
        part("cheese", 26, 20, 13, 16, () => {
            b.enamel((x, y) => Math.max(y - 2, -y - 14, x + y * 0.7 - 8, -x - 12), [-13, -15, 12, 3], "#ffd14a", { ink: 1.2, bevel: 3, spec: 0 });
        });
        part("sack", 72, 86, 36, 80, () => {
            const bb = [-34, -80, 34, 4];
            b.enamel(add(oval(0, -30, 30, 32), box(0, -66, 26, 22, 6)), bb, ["#fff8e8", "#dfc9a2"], { ink: 1.6, bevel: 10, spec: 0 });
            b.flat(seg(-13, -56, 13, -56, 2), bb, "#a35c34");
            b.flat(box(0, -30, 30, 18, 3), bb, "#e8472e", 0.8);
        });
        part("bell", 44, 40, 22, 34, () => {
            const bb = [-20, -34, 20, 4];
            b.enamel(box(0, -2, 38, 6, 2), bb, "#2c2233", { ink: 1.1, bevel: 2 });
            b.chrome(add(oval(0, -14, 16, 15), box(0, -9, 32, 6, 2)), [-17, -30, 17, -5], { ink: 1.4, sky: "#fff4c8", mid: "#e0b04a", horizon: "#8a6420", warm: "#d9a441" });
            b.enamel(disc(0, -30, 3), [-4, -34, 4, -26], "#d9a441", { ink: 1, bevel: 2 });
        });
        part("ticket", 28, 46, 14, 3, () => {
            b.enamel(box(0, 20, 24, 40, 1), [-13, 0, 13, 41], "#fffdf5", { ink: 1, bevel: 1, spec: 0 });
            for (let i = 0; i < 5; i++) b.flat(box(-1 + (i % 2) * 2, 10 + i * 6, 15 + (i % 3) * 2, 1.8, 0.5), [-11, 4, 11, 40], "#3a3442");
        });
        part("mug", 40, 40, 18, 36, () => {
            const bb = [-18, -36, 22, 4];
            b.enamel(cut(oval(16, -18, 8, 9), oval(16, -18, 4, 5)), bb, "#fff1d6", { ink: 1.2, bevel: 2 });
            b.enamel(box(0, -16, 30, 34, 6), bb, ["#fffdf5", "#e7dcc6"], { ink: 1.5, bevel: 6 });
            b.flat(oval(-6, -20, 3.4, 4.2), bb, "#ffffff"); b.flat(oval(6, -20, 3.4, 4.2), bb, "#ffffff");
            b.flat(oval(-5, -19, 1.7, 2.6), bb, "#241a2c"); b.flat(oval(7, -19, 1.7, 2.6), bb, "#241a2c");
            b.flat(seg(-3, -9, 3, -9, 1), bb, "#241a2c");
        });
        part("fork", 26, 66, 13, 62, () => {
            const bb = [-13, -62, 13, 4];
            b.chrome(add(box(0, -18, 6, 38, 3), box(0, -40, 20, 10, 3), box(-7, -50, 4, 18, 2), box(0, -50, 4, 18, 2), box(7, -50, 4, 18, 2)), [-11, -60, 11, 0], { ink: 1.1, bevel: 2 });
            b.flat(oval(-4, -28, 2.4, 3), bb, "#ffffff"); b.flat(oval(4, -28, 2.4, 3), bb, "#ffffff"); b.flat(disc(-3.6, -27.5, 1.2), bb, "#241a2c"); b.flat(disc(4.4, -27.5, 1.2), bb, "#241a2c");
        });
        part("lamp", 92, 72, 46, 4, () => {
            b.flat(seg(0, 0, 0, 30, 1.5), [-3, 0, 3, 32], "#241a2c");
            b.enamel((x, y) => Math.max(oval(0, 62, 42, 34)(x, y), y - 62), [-44, 26, 44, 64], ["#6f5fb0", "#3a2e6e"], { ink: 1.5, bevel: 8 });
            b.flat(oval(0, 61, 38, 3), [-40, 56, 40, 66], "#fff6c8");
        });
        part("cuckoo", 30, 26, 8, 20, () => {
            const bb = [-8, -20, 22, 6];
            b.enamel(add(oval(4, -7, 11, 8), disc(11, -13, 6)), bb, "#ffd14a", { ink: 1.2, bevel: 4, spec: 0 });
            b.enamel((x, y) => Math.max(x - 25, 15 - x, Math.abs(y + 13) - (25 - x) * 0.4), bb, "#e8472e", { ink: 0.9, bevel: 1, spec: 0 });
            b.flat(disc(12, -15, 1.3), bb, "#241a2c");
        });
    }, { smooth: true });
    return parts;
}

const SWING = (x, y, part, o = {}) => ({ kind: "swing", x, y, part, a: 0, v: 0, ...o });
const CROWD = (x, y, part, o = {}) => ({ kind: "crowd", x, y, part, h: 0, vy: 0, o: 0, ...o });
const FALL = (x, y, part, o = {}) => ({ kind: "fall", x, y, y0: y, part, wob: 0, vy: 0, down: false, gone: 0, vx: 0, rot: 0, ...o });

/** Runs a stage's gags. Everything here is cosmetic, so it can use game.fxRng freely. */
export class StageRun {
    constructor(s, i, gagParts, game, sound) {
        this.s = s; this.st = STAGES[i]; this.name = paintStage(game.assets, i); this.parts = gagParts; this.game = game; this.sound = sound;
        this.t = 0; this.items = []; this.fx = []; this.flicker = 0; this.flames = [];
        const G = this.items, id = this.st.id;
        if (id === "diner") {
            G.push(SWING(-20, -392, "pan"), SWING(34, -392, "ladle", { a: 0.1 }), SWING(74, -392, "pan", { sc: 0.8 }));
            G.push(FALL(-474, -252 - 54, "plate"), FALL(322, -334 - 24, "plate", { hide: true }));
            G.push({ kind: "cat", x: -280, y: -182, part: "cat", jump: 0, hop: 0, flip: 1 });
            G.push(CROWD(-430, -200, "mug", { sc: 0.8 }), CROWD(-50, -180, "mug", { sc: 0.7 }));
        } else if (id === "midnight") {
            G.push(SWING(-60, -470, "lamp", { sc: 1, light: true }));
            G.push({ kind: "mouse", x: 300, y: -182, dir: -1, run: 0 });
            G.push(FALL(-140, -360, "plate", { hide: true }), FALL(-60, -360, "plate", { hide: true }));
            G.push(CROWD(420, -206, "mug", { sc: 0.7 }), CROWD(-30, -180, "fork", { sc: 0.8 }), CROWD(0, -180, "fork", { sc: 0.8 }));
        } else if (id === "bakery") {
            G.push({ kind: "sack", x: -470, y: -70 });
            G.push({ kind: "sack", x: 470, y: -70, flip: true });
            G.push(FALL(-30, -360, "plate", { hide: true }), SWING(120, -430, "ladle"), SWING(290, -430, "pan", { sc: 0.8 }));
            G.push({ kind: "cuckoo", x: 40, y: -410, out: 0 });
            G.push(CROWD(120, -182, "mug", { sc: 0.7 }), CROWD(160, -182, "fork", { sc: 0.8 }));
        } else {
            G.push({ kind: "bell", x: 30, y: -180, ring: 0 });
            for (let i = 0; i < 5; i++) G.push({ kind: "ticket", x: -40 + i * 40, y: -300, a: 0, v: 0 });
            for (let i = 0; i < 5; i++) G.push(CROWD(-500 + i * 42, -182, i % 2 ? "fork" : "mug", { sc: 0.75, d: i * 3 }));
            for (let i = 0; i < 4; i++) G.push(CROWD(355 + i * 46, -182, i % 2 ? "mug" : "fork", { sc: 0.75, d: i * 3 }));
            this.flames = [{ x: -160, y: -200, h: 0 }, { x: 240, y: -200, h: 0 }];
        }
    }
    rattle(k) { for (const g of this.items) { if (g.kind === "swing") g.v += (this.game.fxRng.next() - 0.5) * 0.05 * k + 0.02 * k; if (g.kind === "fall" && !g.down) g.wob = Math.max(g.wob, 5 * k); if (g.kind === "crowd") g.vy = Math.max(g.vy, 3 + k * 2 + this.game.fxRng.next() * 2); if (g.kind === "ticket") g.v += 0.03 * k; } }
    /** Fight events become kitchen events. */
    onEvent(e) {
        switch (e.type) {
            case "hit": this.rattle(e.rank >= 2 ? 1.2 : 0.4); if (e.rank >= 2) for (const f of this.flames) f.h = Math.max(f.h, 0.7); break;
            case "block": this.rattle(0.25); break;
            case "wall": this.wallHit(e.side); break;
            case "knockdown": this.rattle(1); for (const g of this.items) { if (g.kind === "bell") { g.ring = 1; this.sound.gag("bell"); } if (g.kind === "mouse") g.run = 1; if (g.kind === "cat") g.hop = 12; } break;
            case "superflash": this.flicker = 34; for (const g of this.items) { if (g.kind === "cat") g.jump = 1; if (g.kind === "cuckoo") g.out = 1; } for (const f of this.flames) f.h = 1.4; break;
            case "ko": for (const g of this.items) { if (g.kind === "cat") g.jump = 1; if (g.kind === "cuckoo") { g.out = 1; this.sound.gag("cuckoo"); } if (g.kind === "fall") this.drop(g); if (g.kind === "bell") { g.ring = 1; this.sound.gag("bell"); } } this.rattle(2); break;
        }
    }
    wallHit(side) {
        this.rattle(2);
        for (const g of this.items) {
            if (g.kind === "fall") this.drop(g);
            if (g.kind === "sack" && Math.sign(g.x) === side) { g.burst = 1; this.sound.gag("flour"); this.s.burst({ at: [g.x - side * 20, g.y - 40], count: 34, color: ["#ffffff", "#f6e8cc"], speed: [40, 240], life: [0.5, 1.4], size: [8, 22], gravity: 40 }); }
        }
    }
    drop(g) { if (!g.down) { g.down = true; g.hide = false; g.vy = 0; g.vx = (this.game.fxRng.next() - 0.5) * 1.5; } }
    /** A finger poked the kitchen. Returns true if a gag took it. */
    poke(x, y) {
        for (const g of this.items) {
            const near = (r) => Math.hypot(g.x - x, g.y - y) < r;
            if (g.kind === "swing" && Math.abs(g.x - x) < 44 && y > g.y && y < g.y + 120) { g.v += 0.13; this.sound.gag("clang"); return true; }
            if (g.kind === "cat" && near(70)) { g.jump = 1; this.sound.gag("meow"); return true; }
            if (g.kind === "mouse" && near(70)) { g.run = 1; this.sound.gag("squeak"); return true; }
            if (g.kind === "bell" && near(50)) { g.ring = 1; this.sound.gag("bell"); return true; }
            if (g.kind === "crowd" && near(50)) { g.vy = 6; this.sound.gag("squeak"); return true; }
            if (g.kind === "sack" && near(70)) { g.burst = 1; this.sound.gag("flour"); this.s.burst({ at: [g.x, g.y - 50], count: 18, color: ["#ffffff", "#f6e8cc"], speed: [30, 180], life: [0.4, 1.1], size: [8, 20], gravity: 40 }); return true; }
            if (g.kind === "cuckoo" && near(60)) { g.out = 1; this.sound.gag("cuckoo"); return true; }
        }
        return false;
    }
    update() {
        this.t++;
        const fx = this.game.fxRng;
        if (this.flicker > 0) this.flicker--;
        for (const f of this.flames) f.h *= 0.965;
        for (const g of this.items) {
            switch (g.kind) {
                case "swing": g.v += -g.a * 0.018; g.v *= 0.985; g.a += g.v; break;
                case "ticket": g.v += -g.a * 0.03; g.v *= 0.97; g.a += g.v; break;
                case "crowd": g.vy -= 0.5; g.h += g.vy; if (g.h <= 0) { g.h = 0; g.vy = 0; } break;
                case "cat": if (g.jump > 0) { g.jump -= 1 / 50; } if (g.hop > 0) g.hop--; break;
                case "mouse": if (g.run > 0) { g.x += g.dir * 7; g.run -= 1 / 60; if (Math.abs(g.x) > 460 || g.x < -200) g.dir *= -1; } break;
                case "bell": if (g.ring > 0) g.ring -= 1 / 40; break;
                case "cuckoo": if (g.out > 0) g.out -= 1 / 90; break;
                case "sack": if (g.burst > 0) g.burst -= 1 / 40; break;
                case "fall":
                    if (g.wob > 0) g.wob *= 0.9;
                    if (g.down && !g.gone) {
                        g.vy += 0.5; g.y += g.vy; g.x += g.vx; g.rot += 0.16;
                        if (g.y > WALL_Y - 110 + 110) { g.gone = 1; this.sound.gag("smash"); this.s.burst({ at: [g.x, g.y], count: 12, color: ["#fffdf5", "#d6e0e6"], speed: [80, 260], life: [0.3, 0.7], size: [4, 10], gravity: 900 }); }
                    }
                    break;
            }
        }
    }
    /** Back wall: drawn with parallax so the kitchen has depth. */
    drawBack(d, camX) {
        const px = camX * 0.22, o = { x: px + W / 2 - X0, y: H / 2 - Y0, width: W, height: H };
        d.sprite(this.name, o);
        const sh = { name: "gags", parts: this.parts };
        d.push(); d.translate(px, 0);
        for (const f of this.flames) {
            if (f.h > 0.05) d.additive(() => { for (let i = 0; i < 5; i++) { const t = this.t * 0.3 + i, h = f.h * (70 + Math.sin(t * 1.7) * 18), x = f.x - 44 + i * 22 + Math.sin(t) * 4; d.rect(26, h, { x, y: f.y - h / 2 + 6, color: i % 2 ? "#ff8a3c" : "#ffc23c", radius: 12, opacity: 0.7 }); } });
        }
        for (const g of this.items) this.drawGag(d, g, sh);
        d.pop();
    }
    drawGag(d, g, sh) {
        const part = (n, x, y, sc = 1, o = {}) => {
            const p = this.parts[n], w = p.w * sc, h = p.h * sc;
            d.sprite("gags", { x: x + (p.w / 2 - p.ox) * sc * (o.flip ? -1 : 1), y: y + (p.h / 2 - p.oy) * sc, width: w, height: h, crop: p.crop, flipX: o.flip, opacity: o.opacity });
        };
        switch (g.kind) {
            case "swing":
                if (g.light) {
                    const a = this.flicker > 0 && this.flicker % 6 < 3 ? 0.01 : 0.09;
                    d.push(); d.translate(g.x, g.y); d.rotate(g.a); d.additive(() => d.poly([[-26, 70], [26, 70], [240, 460], [-240, 460]], { color: "#fff0b0", opacity: a })); d.pop();
                }
                d.push(); d.translate(g.x, g.y); d.rotate(g.a); part(g.part, 0, 0, g.sc ?? 1); d.pop();
                break;
            case "fall":
                if (g.hide || g.gone) break;
                d.push(); d.translate(g.x + Math.sin(this.t * 1.3) * g.wob, g.y); d.rotate(g.rot); part("plate", 0, 0, 0.9); d.pop();
                break;
            case "crowd": part(g.part, g.x, g.y - g.h, g.sc ?? 1); break;
            case "ticket": d.push(); d.translate(g.x, g.y); d.rotate(g.a); part("ticket", 0, 0, 0.9); d.pop(); break;
            case "cat": {
                const up = g.jump > 0 ? Math.sin(g.jump * Math.PI) * 74 : (g.hop > 0 ? Math.sin(g.hop / 12 * Math.PI) * 12 : 0);
                const stretch = g.jump > 0 ? 1.25 : 1;
                d.push(); d.translate(g.x, g.y - up); d.scale(1 / Math.sqrt(stretch), stretch); part("cat", 0, 0); d.pop();
                break;
            }
            case "mouse": {
                const hop = g.run > 0 ? Math.abs(Math.sin(this.t * 0.8)) * 5 : 0;
                part("mouse", g.x, g.y - hop, 1, { flip: g.dir < 0 });
                part("cheese", g.x + g.dir * 16, g.y - 18 - hop, 0.7);
                break;
            }
            case "sack": {
                const k = 1 + (g.burst > 0 ? Math.sin(g.burst * 12) * 0.08 : 0);
                d.push(); d.translate(g.x, g.y); d.scale(1 / k, k); part("sack", 0, 0, 1.1, { flip: g.flip }); d.pop();
                break;
            }
            case "bell": part("bell", g.x + (g.ring > 0 ? Math.sin(this.t) * 3 : 0), g.y, 1.1); break;
            case "cuckoo": {
                d.rect(58, 76, { x: g.x, y: g.y + 12, color: "#8a3f27", radius: 8 });
                d.rect(50, 68, { x: g.x, y: g.y + 12, color: "#b65a3a", radius: 6 });
                d.rect(24, 24, { x: g.x, y: g.y - 8, color: "#241a2c", radius: 4 });
                d.circle(15, { x: g.x, y: g.y + 28, color: "#fff1d6" });
                const ang = this.t * 0.03;
                d.line([g.x, g.y + 28], [g.x + Math.cos(ang) * 11, g.y + 28 + Math.sin(ang) * 11], { width: 2, color: "#241a2c" });
                d.line([g.x, g.y + 28], [g.x, g.y + 20], { width: 2, color: "#241a2c" });
                if (g.out > 0) part("cuckoo", g.x + Math.min(1, g.out * 8) * 12 - 8, g.y - 2, 1);
                break;
            }
        }
    }
}
