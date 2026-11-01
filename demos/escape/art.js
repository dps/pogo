// Shared painted things: mechanism parts, inventory icons, picture documents, puzzle backplates and the title painting.
import { BRASS, CREAM, INK, OX, PAPER, WOOD, clock, dk, lt, suitcase, wren } from "./kit.js";
import { Canvas, bake, hash } from "./paint.js";
import { ITEMS } from "./story.js";

const S = 2;
const brushy = (c, size = 1.4) => c.brush(size, { fine: true });
function sheen(c, x, y, w, h, a = 0.4) { c.pool(x, y, w, h, "#fff3d0", a); }

function panelMat(c, base, o = {}) {
    c.rect(0, 0, 320, 320, { c: lt(base, 0.12), c2: dk(base, 0.6), m: o.m ?? 0.2, s: o.s ?? 0.2, sd: o.sd ?? "h", wob: 0 });
    c.pool(100, 70, 280, 220, "#ffd9a0", 0.26);
    return c;
}
function rivets(c, col = BRASS) { for (const [x, y] of [[14, 14], [306, 14], [14, 306], [306, 306]]) { c.ell(x, y, 6, 6, { c: lt(col, 0.2), c2: dk(col, 0.5) }); } }
function planks(c, col, n = 6, dir = "h") { for (let i = 1; i < n; i++) { const t = i / n * 320; if (dir === "h") c.rect(0, t, 320, 2, { c: dk(col, 0.4), a: 0.8, wob: 0.4 }); else c.rect(t, 0, 2, 320, { c: dk(col, 0.4), a: 0.8, wob: 0.4 }); } }

export const PANELS = {
    leather(c) { panelMat(c, "#7a4a2a", { m: 0.3 }); c.rr(8, 8, 304, 304, 14, { c: dk("#7a4a2a", 0.55), a: 0.3 }); for (let i = 0; i < 40; i++) { const a = i / 40 * 6.28; c.ell(160 + Math.cos(a) * 150, 160 + Math.sin(a) * 150, 1.4, 1.4, { c: "#e0c090", a: 0.5 }); } rivets(c); },
    pine(c) { panelMat(c, "#b98c56", { s: 0.5, sd: "v" }); planks(c, "#b98c56", 5, "v"); },
    felt(c) { panelMat(c, "#3f6a4c", { s: 0.05, m: 0.3 }); c.ell(50, 280, 40, 18, { c: "#5a8a60", a: 0.5 }); c.ell(250, 40, 50, 14, { c: "#5a8a60", a: 0.5 }); },
    boards(c) { panelMat(c, "#5a3f2a", { s: 0.4 }); planks(c, "#5a3f2a", 8); },
    trunk(c) { panelMat(c, "#3f3226", { m: 0.2 }); c.rect(0, 20, 320, 16, { c: "#6d5a44" }); c.rect(0, 284, 320, 16, { c: "#6d5a44" }); rivets(c, "#a0a6ac"); },
    iron(c) { panelMat(c, "#3c4048", { m: 0.3, s: 0.1 }); rivets(c, "#7a8088"); },
    glass(c) { c.rect(0, 0, 320, 320, { c: "#c6d0da", c2: "#f4cfae", wob: 0 }); c.ell(90, 260, 170, 60, { c: "#7e96a0" }); c.rect(0, 280, 320, 40, { c: "#8fa4b2", wob: 0 }); for (const x of [40, 120, 280]) { c.line([[x, 280], [x + 2, 200]], 2, { c: "#51707a" }); c.ell(x, 192, 22, 26, { c: "#6f8c8c", wob: 2 }); } },
    cupboard(c) { panelMat(c, "#6b3f22", { s: 0.5, sd: "v" }); planks(c, "#6b3f22", 3, "v"); rivets(c); },
    benches(c) { panelMat(c, "#7a6a55", { s: 0.2 }); const col = "#2f5a64"; for (const [i, x] of [44, 122, 200, 278].entries()) { c.rr(x - 34, 50, 68, 110, 6, { c: lt(col, 0.2), c2: dk(col, 0.5) }); c.rr(x - 36, 140, 72, 28, 5, { c: lt(col, 0.3), c2: dk(col, 0.6) }); if (i === 0) { c.ell(x, 186, 26, 7, { c: "#8fc0dc", a: 0.8 }); for (let k = 0; k < 4; k++) c.ell(x - 12 + k * 9, 176 + (k % 2) * 4, 1.6, 4, { c: "#8fc0dc" }); } if (i === 1) { c.line([[x + 26, 22], [x + 26, 34], [x + 6, 40]], 3, { c: BRASS }); c.poly([[x - 6, 36], [x + 16, 36], [x + 22, 50], [x - 12, 50]], { c: "#ffe6a8" }); c.pool(x, 80, 36, 60, "#ffdc90", 0.5); } if (i === 2) { c.ell(x, 44, 5, 5, { c: BRASS }); c.line([[x, 44], [x, 58], [x + 10, 60]], 3, { c: BRASS }); } if (i === 3) { c.ell(x - 8, 136, 14, 8, { c: "#3a5ea8" }, 0.3); for (let k = 0; k < 4; k++) c.line([[x + k * 5 - 6, 132], [x + k * 5 - 2, 122]], 3, { c: "#3a5ea8" }); } } },
    ticketoffice(c) { panelMat(c, "#4a3a2c"); rivets(c); },
    tablecloth(c) { panelMat(c, "#5a2a30"); c.rr(24, 130, 272, 60, 6, { c: "#f2e8d4", c2: "#c9bc9e", m: 0.1 }); for (let i = 0; i < 3; i++) { c.ell(70 + i * 90, 150, 16, 6, { c: "#fff", a: 0.8 }); c.ell(70 + i * 90, 172, 16, 6, { c: "#fff", a: 0.8 }); } c.ell(160, 160, 6, 6, { c: BRASS }); c.pool(160, 150, 80, 50, "#ffc070", 0.5); c.rect(0, 20, 320, 34, { c: "#0d1030", a: 0.5 }); c.rect(300, 200, 20, 120, { c: "#3a2416" }); },
    bells(c) { panelMat(c, "#6b3f22", { s: 0.4 }); c.rect(10, 50, 300, 8, { c: BRASS, c2: dk(BRASS, 0.5) }); },
    velvet(c) { panelMat(c, "#3a1a30", { m: 0.34, s: 0 }); c.rr(14, 14, 292, 292, 18, { c: "#2a1224", a: 0.4 }); },
    pigeonholes(c) { panelMat(c, "#5a4432", { s: 0.3 }); for (const [x, y] of [[52, 90], [160, 90], [268, 90], [106, 172], [214, 172]]) { c.rr(x - 50, y - 30, 100, 62, 3, { c: "#1a120c" }); } planks(c, "#5a4432", 2); },
    telegraph(c) { panelMat(c, "#3f3226", { s: 0.3 }); c.rr(10, 136, 300, 120, 8, { c: "#2a2018", a: 0.8 }); },
    desk(c) { panelMat(c, "#5a3620", { s: 0.5 }); rivets(c); },
    watchback(c) { c.rect(0, 0, 320, 320, { c: "#1a1420", wob: 0 }); c.ell(160, 150, 150, 150, { c: "#c8cdd2", c2: "#6d7680", m: 0.1, s: 0.3 }); c.ell(160, 150, 142, 142, { c: "#d9dee2", c2: "#8f98a0", m: 0.14, s: 0.4 }); for (let i = 0; i < 80; i++) { const a = i / 80 * 6.28; c.line([[160 + Math.cos(a) * 120, 150 + Math.sin(a) * 120], [160 + Math.cos(a) * 140, 150 + Math.sin(a) * 140]], 0.8, { c: "#fff", a: 0.2 }); } c.rect(0, 240, 320, 80, { c: "#3a2c1c", wob: 0 }); },
    timelock(c) { panelMat(c, "#3c4048", { m: 0.3 }); rivets(c, "#a0a6ac"); },
    musicbox(c) { panelMat(c, "#6b3218", { s: 0.5 }); c.rr(6, 6, 308, 308, 10, { c: lt("#6b3218", 0.2), a: 0.3 }); for (let a = 0; a < 6.28; a += 0.4) c.ell(160 + Math.cos(a) * 44, 26 + Math.sin(a) * 8, 7, 3, { c: BRASS, a: 0.6 }, a); },
    nightsky(c) { c.rect(0, 0, 320, 320, { c: "#0a1030", c2: "#1a2458", wob: 0, m: 0.2 }); for (let i = 0; i < 90; i++) c.ell(hash(i, 2) * 320, hash(2, i) * 320, 0.8, 0.8, { c: "#fff", a: 0.25 + hash(i, 5) * 0.3, wob: 0 }); },
    sleeperdoor(c) { panelMat(c, "#3a3a5a", { s: 0.3 }); rivets(c); },
    scopecase(c) { c.rect(0, 0, 320, 320, { c: "#14100c", wob: 0 }); },
    biscuit(c) { panelMat(c, "#c0432e", { m: 0.2 }); c.ell(160, 40, 130, 26, { c: "#f2d898", a: 0.9 }); c.rect(146, 262, 28, 50, { c: "#efe4c9" }); c.rect(146, 280, 28, 8, { c: OX }); c.poly([[160, 250], [172, 264], [148, 264]], { c: OX }); },
    album(c) { panelMat(c, "#2a3a4a", { m: 0.3, s: 0 }); c.rr(18, 44, 284, 210, 5, { c: "#efe4c9", c2: "#c9b98e" }); },
    beachhut(c) { panelMat(c, "#5a9aa8", { s: 0.5, sd: "v" }); planks(c, "#5a9aa8", 7, "v"); },
    locker(c) { panelMat(c, "#4a5a4a", { s: 0.2 }); rivets(c, "#a0a6ac"); for (let i = 0; i < 4; i++) c.rect(120, 16 + i * 8, 80, 3, { c: "#1a1420" }); },
    blockbell(c) { panelMat(c, "#5a3620", { s: 0.5 }); },
    frame(c) { panelMat(c, "#3c3026", { s: 0.3 }); },
    boiler(c) { panelMat(c, "#4a4a52", { m: 0.34 }); rivets(c, "#a0a6ac"); c.rect(0, 190, 320, 8, { c: "#6d5a44" }); },
    frost(c) { c.rect(0, 0, 320, 320, { c: "#1e2a4a", c2: "#3a4a6c", wob: 0 }); c.rect(0, 230, 320, 90, { c: "#c8d6e8", c2: "#8fa4c4", wob: 0 }); c.poly([[210, 234], [210, 200], [235, 184], [262, 200], [262, 234]], { c: "#141a2c" }); c.rect(226, 208, 16, 16, { c: "#ffc871", wob: 0 }); c.pool(234, 214, 60, 60, "#ff9f40", 0.7); for (const x of [40, 90, 150]) { c.poly([[x, 240], [x + 12, 190], [x + 24, 240]], { c: "#2a3a56" }); } },
    shelf(c) { c.rect(0, 0, 320, 320, { c: "#efeadf", c2: "#d4cebe", wob: 0, m: 0.05 }); c.rect(16, 176, 288, 8, { c: "#a89c84" }); c.ell(60, 168, 30, 5, { c: "#000", a: 0.2 }); c.rr(32, 106, 56, 62, 5, { c: "#c7a878", c2: "#8a7350" }); c.rect(32, 120, 56, 5, { c: "#6b5638" }); c.ell(130, 152, 34, 8, { c: "#44506a" }); c.ell(130, 138, 20, 18, { c: "#566480", c2: "#34405a" }); c.ell(200, 144, 24, 24, { c: "#a0a6ac", c2: "#5a6068" }); c.line([[222, 136], [240, 122]], 6, { c: "#a0a6ac" }); c.line([[190, 122], [200, 112], [212, 122]], 3, { c: "#3a3a3a" }); c.rr(250, 110, 44, 58, 3, { c: "#b4563e", c2: "#7c3a2c" }); c.ell(272, 110, 18, 4, { c: "#d0a872" }); },
    whiteboard(c) { c.rect(0, 0, 320, 320, { c: "#f0ece0", c2: "#ddd6c6", wob: 0, m: 0.05 }); },
    tray(c) { panelMat(c, "#c8ccd0", { m: 0.1, s: 0.3 }); c.rr(20, 60, 280, 76, 8, { c: "#9aa2aa", c2: "#70787e", a: 0.8 }); },
    bare(c) { c.rect(0, 0, 320, 320, { c: "#efe9da", c2: "#d9d2c0", wob: 0, m: 0.06 }); },
    destination(c) { panelMat(c, "#20262e", { m: 0.2, s: 0 }); c.rr(10, 10, 300, 56, 4, { c: "#0d1016" }); },
};
export function paintPanel(game, name) {
    const id = `panel:${name}`;
    if (game.assets.sprites?.has?.(id)) return id;
    const c = new Canvas(320, 320, S);
    (PANELS[name] ?? PANELS.leather)(c);
    brushy(c, 2);
    c.finish({ vig: 0.5, grain: 0.06 });
    return bake(game, id, c);
}

const ICON = {
    ticket(c) { c.rr(12, 38, 104, 52, 3, { c: "#e9d9b0", c2: "#c9b98e", wob: 0.2 }); c.rect(14, 44, 100, 6, { c: OX }); c.rect(24, 60, 60, 2.4, { c: INK, a: 0.6 }); c.rect(24, 70, 44, 2.4, { c: INK, a: 0.6 }); c.ell(100, 72, 4, 4, { c: "#1a1420" }); },
    clipper(c) { c.line([[34, 104], [58, 60], [78, 30]], 8, { c: "#a0a6ac", c2: "#5a6068" }); c.line([[94, 104], [70, 60], [50, 30]], 8, { c: "#c0c6cc", c2: "#6d7680" }); c.ell(64, 62, 7, 7, { c: BRASS }); c.ell(46, 28, 8, 5, { c: "#6d7680" }); c.ell(82, 28, 8, 5, { c: "#a0a6ac" }); },
    windkey(c) { c.ell(46, 46, 24, 24, { c: BRASS, c2: dk(BRASS, 0.5) }); c.ell(46, 46, 11, 11, { blend: "erase" }); c.line([[60, 62], [106, 104]], 9, { c: BRASS, c2: dk(BRASS, 0.5) }); c.rect(90, 96, 16, 8, { c: dk(BRASS, 0.6) }); },
    whistle(c) { c.ell(70, 74, 30, 26, { c: "#d0d6dc", c2: "#6d7680" }); c.rect(14, 50, 58, 22, { c: "#d0d6dc", c2: "#7a8088" }); c.ell(66, 62, 6, 4, { c: "#14100c" }); c.line([[90, 50], [100, 30], [110, 40]], 2, { c: BRASS }); },
    lantern: (c) => lantern(c, false), lit: (c) => lantern(c, true),
    matches(c) { c.rr(20, 44, 88, 52, 3, { c: "#c04430", c2: "#7c2a26" }); c.rect(32, 54, 64, 30, { c: "#f2d898" }); for (let i = 0; i < 3; i++) { c.line([[30 + i * 10, 44], [36 + i * 10, 22]], 3, { c: "#e0c090" }); c.ell(36 + i * 10, 20, 3, 4, { c: "#a83a34" }); } },
    sheetA: (c) => sheet(c, 0), sheetB: (c) => sheet(c, 1), song: (c) => sheet(c, 2),
    ring(c) { c.ell(64, 66, 34, 34, { c: "#ffd878", c2: "#b88a30" }); c.ell(64, 66, 23, 23, { blend: "erase" }); c.ell(52, 42, 7, 3, { c: "#fff6d8", a: 0.8 }); },
    sounder(c) { c.line([[30, 100], [98, 30]], 10, { c: BRASS, c2: dk(BRASS, 0.5) }); c.ell(98, 30, 10, 10, { c: BRASS }); c.ell(30, 100, 7, 7, { c: dk(BRASS, 0.6) }); },
    gears(c) { c.rr(18, 34, 92, 66, 8, { c: "#6d7a5a", c2: "#3a4430" }); c.ell(50, 66, 16, 16, { c: BRASS }); c.ell(80, 58, 11, 11, { c: BRASS, c2: dk(BRASS, 0.5) }); c.ell(50, 66, 4, 4, { c: "#1a1420" }); c.ell(80, 58, 3, 3, { c: "#1a1420" }); },
    brokenwatch: (c) => wtch(c, false), watch: (c) => wtch(c, true),
    nightkey(c) { c.ell(40, 42, 14, 14, { c: "#c0c6cc", c2: "#6d7680" }); c.line([[50, 52], [100, 100]], 6, { c: "#c0c6cc", c2: "#6d7680" }); c.rect(86, 96, 8, 12, { c: "#6d7680" }); c.rect(96, 88, 8, 12, { c: "#6d7680" }); },
    oilcan(c) { c.poly([[30, 104], [36, 62], [80, 62], [90, 104]], { c: "#a83a34", c2: "#6b2a26" }); c.poly([[44, 62], [58, 44], [70, 62]], { c: "#7c2a26" }); c.line([[56, 44], [110, 18]], [6, 2], { c: "#a0a6ac" }); c.line([[84, 72], [108, 76], [100, 96]], 4, { c: "#5a6068" }); },
    keys(c) { for (const [x, r] of [[40, 0.2], [56, -0.1], [70, -0.4]]) c.line([[60, 32], [x, 106]], 6, { c: "#c0a040", c2: "#6d5a28" }); c.ell(60, 28, 16, 16, { c: "#a0a6ac" }); c.ell(60, 28, 9, 9, { blend: "erase" }); c.rect(50, 96, 8, 6, { c: "#c0a040" }); },
};
function lantern(c, lit) {
    c.line([[44, 32], [64, 12], [84, 32]], 3.4, { c: "#5a6068" });
    c.rr(38, 30, 52, 12, 3, { c: "#6d7680", c2: "#3a4048" }); c.rr(36, 96, 56, 14, 3, { c: "#6d7680", c2: "#3a4048" });
    c.rect(42, 42, 44, 54, { c: lit ? "#ffd27a" : "#8a9aa8", c2: lit ? "#ff9c40" : "#5a6878" });
    for (const x of [42, 84]) c.rect(x, 42, 3, 54, { c: "#3a4048" });
    if (lit) { c.ell(64, 74, 9, 15, { c: "#fff4c0" }); c.pool(64, 74, 58, 58, "#ffb860", 0.7); }
}
function sheet(c, k) {
    c.poly(k === 0 ? [[26, 22], [92, 22], [84, 60], [96, 106], [26, 106]] : k === 1 ? [[100, 22], [34, 22], [44, 60], [30, 106], [100, 106]] : [[20, 22], [108, 22], [108, 106], [20, 106]], { c: "#f2e8d0", c2: "#d4c49c" });
    for (let i = 0; i < 2; i++) for (let j = 0; j < 5; j++) c.rect(32, 36 + i * 34 + j * 4, 60, 0.9, { c: INK, a: 0.6, wob: 0 });
    for (let i = 0; i < 5; i++) c.ell(40 + i * 12, 40 + (i * 7) % 12, 2.4, 2, { c: INK });
    if (k === 2) c.rect(56, 22, 12, 84, { c: "#fff8d0", a: 0.5 });
}
function wtch(c, ok) { c.line([[64, 22], [64, 8]], 6, { c: BRASS }); c.ell(64, 6, 7, 5, { c: BRASS }); c.ell(64, 68, 44, 44, { c: BRASS, c2: dk(BRASS, 0.5) }); c.ell(64, 68, 37, 37, { c: "#f4e9cf", c2: "#cdbb92" }); const a = ok ? 2.2 : 4.2; c.line([[64, 68], [64 + Math.sin(a) * 26, 68 - Math.cos(a) * 26]], 2.6, { c: INK }); c.line([[64, 68], [64 - 18, 68 - 12]], 3.4, { c: INK }); if (!ok) c.line([[40, 40], [86, 92]], 1.4, { c: INK, a: 0.6 }); }

export function paintKit(game) {
    const names = Object.keys(ITEMS), cols = 6, rows = Math.ceil(names.length / cols), P = 128;
    const at = new Canvas(cols * P, rows * P, 1);
    names.forEach((n, i) => { const c = new Canvas(128, 128, 1); (ICON[n] ?? ICON.ticket)(c); c.brush(1.1, { fine: false, jitter: 0.08 }); const ox = (i % cols) * P, oy = Math.floor(i / cols) * P; for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) { const j = (y * P + x) * 4, k = ((y + oy) * at.W + x + ox) * 4; for (let q = 0; q < 4; q++) at.d[k + q] = c.d[j + q]; } });
    bake(game, "kit:items", at, { mipmaps: true });
    game.itemFrame = (n) => { const i = names.indexOf(n); return [(i % cols) * P, Math.floor(i / cols) * P, P, P]; };

    // Cylinder shading over the number wheels.
    const w = new Canvas(64, 128, 1); for (let y = 0; y < 128; y++) { const t = Math.abs(y / 127 - 0.5) * 2, a = t * t * 0.86; for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4; w.d[i + 3] = a; w.d[i] = w.d[i + 1] = w.d[i + 2] = 0.05 * a; } } bake(game, "kit:shade", w);
    // The safe dial, knurled brass.
    const dial = new Canvas(240, 240, 2); dial.ell(120, 120, 118, 118, { c: "#7c5a28", c2: "#3c2a10" }); for (let i = 0; i < 60; i++) { const a = i / 60 * 6.28; dial.line([[120 + Math.cos(a) * 110, 120 + Math.sin(a) * 110], [120 + Math.cos(a) * 118, 120 + Math.sin(a) * 118]], 3, { c: BRASS }); } dial.ell(120, 120, 106, 106, { c: "#f0d48c", c2: "#b48a3c", dir: [80, 70, 200], m: 0.08, s: 0.04 }); dial.ell(120, 120, 72, 72, { c: "#a07a34", c2: "#6d5020" }); dial.ell(120, 120, 66, 66, { c: "#e8c67c", c2: "#9a7430", dir: [90, 80, 140] }); for (let i = 0; i < 20; i++) { const a = i / 20 * 6.28; dial.line([[120 + Math.cos(a) * 60, 120 + Math.sin(a) * 60], [120 + Math.cos(a) * 24, 120 + Math.sin(a) * 24]], 7, { c: "#c9a256", a: 0.5 }); } dial.ell(120, 120, 18, 18, { c: "#7c5a28" }); dial.brush(1.2, { fine: true, jitter: 0.06 }); bake(game, "kit:dial", dial);
    const puff = new Canvas(32, 32, 1); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const r = Math.hypot(x - 15.5, y - 15.5) / 15.5, a = Math.max(0, 1 - r); const i = (y * 32 + x) * 4, q = a * a * (3 - 2 * a); puff.d[i] = puff.d[i + 1] = puff.d[i + 2] = puff.d[i + 3] = q; } bake(game, "kit:puff", puff);
    const gear = new Canvas(128, 128, 1), pts = []; for (let i = 0; i < 20 * 4; i++) { const a = i / 80 * 6.283, t = (i % 4) < 2 ? 60 : 50; pts.push([64 + Math.cos(a) * t, 64 + Math.sin(a) * t]); } gear.poly(pts, { c: "#ffffff", c2: "#a8a8a8", wob: 0, m: 0.06, s: 0 }); gear.ell(64, 64, 42, 42, { c: "#c8c8c8", c2: "#787878" }); for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; gear.ell(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26, 10, 10, { blend: "erase" }); } gear.ell(64, 64, 12, 12, { c: "#f0f0f0" }); bake(game, "kit:gear", gear);
    // The ticket.
    const t = new Canvas(280, 134, 2); t.rr(2, 2, 276, 130, 6, { c: "#efe0bc", c2: "#d4c49c", m: 0.14, s: 0.2 }); t.rect(10, 12, 260, 14, { c: OX }); t.rect(10, 108, 260, 3, { c: OX }); for (let i = 0; i < 7; i++) t.ell(2 + i * 21.6 + 12, 2, 5, 5, { blend: "erase" }); t.rect(24, 112, 120, 2, { c: INK, a: 0.4 }); t.brush(1, { fine: false, jitter: 0.06 }); bake(game, "kit:ticket", t);
    // Portraits and drawings for documents.
    const fam = new Canvas(600, 400, 1); family(fam); fam.brush(5, { jitter: 0.1 }); fam.finish({ vig: 0.3 }); bake(game, "kit:family", fam);
    const fa = new Canvas(280, 180, 1.4); father(fa); fa.brush(3, { jitter: 0.06 }); bake(game, "kit:father", fa);
    const we = new Canvas(280, 180, 1.4); wedding(we); we.brush(3, { jitter: 0.06 }); bake(game, "kit:wedding", we);
    const ro = new Canvas(280, 160, 1.4); crayon(ro); bake(game, "kit:route", ro);
    const bi = new Canvas(280, 160, 1.4); crayonBird(bi); bake(game, "kit:bird", bi);
    const sea = new Canvas(900, 300, 1); seaview(sea); sea.brush(4, { jitter: 0.08 }); bake(game, "kit:seascope", sea);
    const rim = new Canvas(320, 320, 2); rim.rect(0, 0, 320, 320, { c: "#100c08", c2: "#1a140c", wob: 0 }); rim.ell(160, 160, 144, 144, { blend: "erase", wob: 0 }); bake(game, "kit:scoperim", rim);
    const b = new Canvas(80, 60, 2, -40, -34); wren(b, 0, 0, 1.2); b.brush(0.7, { fine: false, jitter: 0.06 }); bake(game, "kit:wren", b);
    const b2 = new Canvas(120, 90, 2, -60, -50); birdSketch(b2); bake(game, "kit:sketch", b2);
    const birds = new Canvas(320, 80, 2); [["#b0342e", 1], ["#6b5a44", 0], ["#7a4a2a", 2], ["#2a3a5a", 3]].forEach(([c, k], i) => field(birds, 40 + i * 80, 44, k)); bake(game, "kit:guide", birds);
}
function birdSketch(c) { wren(c, 0, 0, 1.6, { c: "#c8bda6", c2: "#8a8270" }); }
function field(c, x, y, k) {
    if (k === 2) { wren(c, x - 2, y - 2, 0.9); return; }
    const col = ["#6b5a44", "#b0342e", "", "#2a3a5a"][k], b2 = k === 1 ? "#6b5a44" : col;
    c.ell(x, y, 15, 9, { c: b2, c2: dk(b2, 0.5) }); c.ell(x + 12, y - 8, 7, 7, { c: b2 }); c.ell(x + 3, y + 2, 9, 6, { c: k === 1 ? col : k === 3 ? "#efe4c9" : "#c9b48a" });
    c.line([[x - 14, y + 1], [x - 32, y + (k === 3 ? 12 : 5)]], [5, 1.5], { c: b2 }); c.poly([[x + 18, y - 9], [x + 25, y - 7], [x + 18, y - 5]], { c: "#2c1d12" }); c.ell(x + 14, y - 9, 1.2, 1.2, { c: "#0a0806", wob: 0 });
}
function figure(c, x, y, h, col, skin = "#e0b890", o = {}) {
    c.poly([[x - h * 0.16, y - h * 0.68], [x + h * 0.16, y - h * 0.68], [x + h * (o.skirt ? 0.26 : 0.15), y - h * (o.skirt ? 0.1 : 0.3)], [x - h * (o.skirt ? 0.26 : 0.15), y - h * (o.skirt ? 0.1 : 0.3)]], { c: lt(col, 0.1), c2: dk(col, 0.6) });
    if (!o.skirt) { c.line([[x - h * 0.08, y - h * 0.32], [x - h * 0.09, y]], h * 0.12, { c: dk(col, 0.6) }); c.line([[x + h * 0.08, y - h * 0.32], [x + h * 0.09, y]], h * 0.12, { c: dk(col, 0.6) }); }
    c.ell(x, y - h * 0.82, h * 0.13, h * 0.14, { c: skin, c2: dk(skin, 0.74) });
    c.ell(x, y - h * 0.9, h * 0.14, h * 0.08, { c: o.hair ?? "#3a2616" });
}
function family(c) {
    c.rect(0, 0, 600, 240, { c: "#8fb4cc", c2: "#fce0b8", wob: 0 }); c.rect(0, 230, 600, 50, { c: "#3f7f96", c2: "#7fb0b8", s: 0.6, sd: "h", wob: 0 }); c.rect(0, 270, 600, 130, { c: "#e8d4a0", c2: "#c4a86c", wob: 0 });
    c.poly([[440, 240], [448, 90], [476, 90], [486, 240]], { c: "#f2ece0", c2: "#b4a890" }); for (const y of [120, 170]) c.rect(446, y, 36, 18, { c: "#a83a34" }); c.rect(452, 76, 22, 16, { c: "#ffe6a0" }); c.poly([[446, 76], [462, 60], [480, 76]], { c: "#3a2c2c" });
    figure(c, 180, 380, 200, "#34405a"); figure(c, 300, 380, 180, "#8a3f54", "#e8c0a0", { skirt: true, hair: "#6b3a1c" }); figure(c, 240, 390, 86, "#d8a03c", "#f0c8a0", { skirt: true, hair: "#8a5a2a" });
    c.ell(60, 60, 44, 16, { c: "#fff", a: 0.7, wob: 2 }); c.ell(330, 110, 30, 10, { c: "#fff", a: 0.6, wob: 2 });
    wren(c, 340, 320, 0.8);
}
function father(c) { c.rect(0, 0, 280, 180, { c: "#c4b89a", c2: "#8a8068", wob: 0 }); c.rect(0, 130, 280, 50, { c: "#6d6452", wob: 0 }); c.rect(170, 20, 120, 120, { c: "#5a5244" }); for (let i = 0; i < 3; i++) c.rect(180 + i * 34, 40, 24, 30, { c: "#d4c8a8" }); figure(c, 100, 176, 140, "#3a3a44", "#c4b08c", { hair: "#222" }); figure(c, 100, 76, 60, "#6d6452", "#d4c0a0", { hair: "#4a3a2a" }); c.line([[80, 110], [96, 124], [100, 130]], 1.4, { c: "#ddd" }); c.ell(101, 132, 4, 4, { c: "#ddd" }); }
function wedding(c) { c.rect(0, 0, 280, 180, { c: "#b4aa94", c2: "#8a8270", wob: 0 }); c.poly([[0, 120], [90, 60], [90, 180], [0, 180]], { c: "#7a7264" }); c.rect(0, 150, 280, 30, { c: "#6d6658", wob: 0 }); figure(c, 124, 174, 130, "#26262e", "#d8c4a8", { hair: "#222" }); figure(c, 166, 174, 118, "#f4efe4", "#e0ccb0", { skirt: true, hair: "#4a3020" }); c.ell(180, 110, 12, 12, { c: "#e8e0d0" }); for (let i = 0; i < 12; i++) c.ell(60 + hash(i, 1) * 180, 10 + hash(1, i) * 80, 1.6, 1.6, { c: "#fff", a: 0.7 }); }
const wax = (c, pts, col, w = 3.4) => { c.line(pts, w, { c: col, wob: 0.8, m: 0.3 }); };
function crayon(c) { c.rect(0, 0, 280, 160, { c: "#f5edd8", wob: 0 }); wax(c, [[30, 110], [40, 40], [110, 40], [150, 100], [230, 60], [250, 120], [60, 130], [30, 110]], "#3a5ea8"); c.ell(40, 40, 8, 8, { c: "#a83a34" }); c.ell(110, 40, 8, 8, { c: "#d8a03c" }); c.ell(230, 60, 8, 8, { c: "#3a8aa8" }); c.ell(60, 130, 8, 8, { c: "#3a8a5a" }); }
function crayonBird(c) { c.rect(0, 0, 280, 160, { c: "#f5edd8", wob: 0 }); wax(c, [[90, 150], [100, 80], [120, 60], [130, 76], [140, 150]], "#34405a", 4); c.ell(118, 48, 15, 15, { c: "#e0b890", a: 0.8 }); wren(c, 196, 100, 1.6); wax(c, [[0, 154], [280, 150]], "#3a8a5a", 5); wax(c, [[20, 26], [40, 12], [58, 28]], "#d8a03c", 4); }
function seaview(c) { c.rect(0, 0, 900, 190, { c: "#3a5a94", c2: "#ffcf96", wob: 0 }); c.rect(0, 190, 900, 110, { c: "#d9926c", c2: "#2e3c60", s: 0.7, sd: "h", wob: 0 }); for (let i = 0; i < 60; i++) c.rect(hash(i, 4) * 900, 196 + hash(4, i) * 100, 20 + hash(i, 8) * 70, 1.5, { c: "#ffe4b0", a: 0.4, wob: 0 }); c.ell(450, 196, 46, 16, { c: "#2a2c4a" }); c.poly([[438, 190], [444, 94], [456, 94], [462, 190]], { c: "#efe4d4", c2: "#8a7a78" }); c.rect(442, 130, 16, 16, { c: "#a83a34" }); c.rect(445, 82, 10, 12, { c: "#ffe9a0" }); c.ell(760, 100, 30, 30, { c: "#fff4cc" }); c.ell(200, 60, 100, 18, { c: "#ffc8a0", a: 0.5, wob: 2 }); }

/** The painting behind the title: the train crossing a viaduct below an enormous moon. */
export function paintTitle(game) {
    const c = new Canvas(1000, 1000, 1.4);
    c.rect(0, 0, 1000, 640, { c: "#0a1034", c2: "#5a3a6e", m: 0.12, s: 0.22, sd: "h", wob: 0 }); c.rect(0, 630, 1000, 370, { c: "#5a3a6e", c2: "#e08a5e", m: 0.1, s: 0.3, sd: "h", wob: 0 });
    for (let i = 0; i < 340; i++) { const r = 0.4 + hash(i, 1) ** 4 * 1.2; c.ell(hash(i, 2) * 1000, hash(2, i) * hash(i, 3) * 640, r, r, { c: "#fdf6dc", a: 0.45 + hash(i, 4) * 0.5, wob: 0 }); }
    c.pool(620, 400, 500, 500, "#ffcf98", 0.3); c.pool(620, 400, 230, 230, "#ffe6bc", 0.34);
    c.ell(620, 400, 104, 104, { c: "#fff6dc", c2: "#ecd6aa", m: 0.16, s: 0.05, wob: 0.2 }); for (let i = 0; i < 7; i++) c.ell(620 + (hash(i, 7) - 0.5) * 150, 400 + (hash(7, i) - 0.5) * 150, 10 + hash(i, 9) * 18, 8 + hash(9, i) * 14, { c: "#dcc69c", a: 0.4, wob: 1 });
    for (let i = 0; i < 16; i++) { const x = hash(i, 3) * 1000, y = 250 + hash(3, i) * 360; c.pool(x, y, 240, 22, i % 3 ? "#2a2658" : "#ffb890", i % 3 ? 0.5 : 0.14, "over"); }
    const ridge = (b, amp, col, col2, sd) => { const p = [[-10, 1010]]; for (let x = -10; x <= 1010; x += 14) p.push([x, b - amp * (0.6 * Math.sin(x * 0.006 + sd) + 0.4 * Math.sin(x * 0.017 + sd * 2))]); p.push([1010, 1010]); c.poly(p, { c: col, c2: col2, wob: 0, s: 0.2, sd: "h", m: 0.2 }); };
    ridge(650, 36, "#4a3a78", "#352c62", 1); ridge(720, 30, "#2e2860", "#1f1c48", 2);
    // Viaduct with proper arches: light glows through them.
    const top = 606, h = 330, span = 118;
    const dv = [[-10, top], [1010, top], [1010, top + h]]; for (let i = 9; i >= -1; i--) { const x0 = i * span + 26, x1 = x0 + span - 36, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, ty = top + 60 + rx; dv.push([x1, top + h]); dv.push([x1, ty]); for (let k = 1; k < 10; k++) { const a = k / 10 * Math.PI; dv.push([cx + Math.cos(a) * rx, ty - Math.sin(a) * rx]); } dv.push([x0, ty]); dv.push([x0, top + h]); } dv.push([-10, top + h]);
    c.rect(-10, top, 1020, h + 90, { c: "#221c44", c2: "#0e0c20", s: 0.2, sd: "v", wob: 0.5, a: 0 });
    for (let i = -1; i < 10; i++) { const x0 = i * span + 26 + span - 36; c.rect(x0, top + 30, 36, h + 60, { c: "#231d46", c2: "#0d0b1e", s: 0.3, sd: "v", wob: 0.6 }); }
    c.rect(-10, top - 2, 1020, 44, { c: "#2a2350", c2: "#16122e", m: 0.2, wob: 0.5 });
    for (let i = -1; i < 10; i++) { const x0 = i * span + 26, x1 = x0 + span - 36, cx = (x0 + x1) / 2, rx = (x1 - x0) / 2, pts = [[x0 - 2, top + 110], [x0 - 2, top + 40], [x1 + 2, top + 40], [x1 + 2, top + 110], [x1, top + 110]]; for (let k = 1; k < 12; k++) { const a = k / 12 * Math.PI; pts.push([cx + Math.cos(a) * rx, top + 110 - Math.sin(a) * rx * 0.86]); } pts.push([x0, top + 110]); c.poly(pts, { c: "#231d46", c2: "#16122e", wob: 0.3 }); }
    c.rect(-10, top - 8, 1020, 8, { c: "#3a3264", c2: "#1a1636", wob: 0.3 });
    ridge(930, 24, "#120f28", "#080714", 3); for (let i = 0; i < 16; i++) { const x = hash(i, 8) * 1000; c.ell(x, 900 + hash(8, i) * 40, 34 + hash(i, 1) * 44, 30, { c: "#0d0b1e", wob: 2 }); }
    // The train, small and warm, with its lamp lit.
    const y = 572, ox = 140;
    for (let k = 0; k < 5; k++) { const x = ox + 90 + k * 106; c.rr(x, y - 4, 100, 34, 4, { c: "#1c1830", c2: "#100e1e" }); c.rr(x - 2, y - 8, 104, 8, 3, { c: "#2a2444" }); for (let w = 0; w < 5; w++) { c.rect(x + 7 + w * 18, y + 3, 12, 14, { c: "#ffdc8a", c2: "#ffa04a", wob: 0 }); c.pool(x + 13 + w * 18, y + 10, 24, 24, "#ffb050", 0.5); } c.rect(x + 6, y + 26, 88, 2, { c: "#ffb060", a: 0.3 }); }
    c.rr(ox - 6, y - 2, 88, 30, 4, { c: "#16121f" }); c.ell(ox - 2, y + 12, 16, 16, { c: "#16121f" }); c.rect(ox + 56, y - 22, 34, 32, { c: "#16121f" }); c.rect(ox + 16, y - 24, 12, 26, { c: "#16121f" }); c.rect(ox + 12, y - 28, 20, 6, { c: "#16121f" }); c.rect(ox + 62, y - 14, 12, 12, { c: "#ffdc8a" }); for (const x of [ox + 8, ox + 34, ox + 62]) c.ell(x, y + 28, 11, 11, { c: "#0d0b14" });
    c.pool(ox - 18, y + 12, 60, 34, "#fff0c0", 0.8); c.ell(ox - 17, y + 12, 5, 5, { c: "#fff8e0", wob: 0 });
    for (let k = 0; k < 12; k++) c.pool(ox + 22 + k * 56, y - 44 - k * 13 + hash(k, 2) * 14, 40 + k * 16, 16 + k * 6, "#e8dcec", 0.34 - k * 0.022, "over");
    c.brush(3.4, { jitter: 0.08 }); c.finish({ vig: 0.42 });
    bake(game, "title:bg", c);
}
export const pics = { father: 1 };
