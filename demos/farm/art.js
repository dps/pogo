// Every sprite in Moonpatch is painted here at low resolution, then shown at 2x. One palette: plum shadows, warm earth, moss, and moonlight.
import { CROPS, DISHES, FISH, GHOSTS, RELICS } from "./data.js";
import { Atlas, Px, hex, noiser, ramp } from "./pix.js";

export const INK = hex("#1c1230");
const R = {
    moss: ramp("#1e3a3a", "#2c5a48", "#4a8256", "#7cae5e", "#b6d276"),
    teal: ramp("#16343f", "#22565a", "#3a8a7c", "#70c0a0", "#b8ecc8"),
    sage: ramp("#26403f", "#3f6a5c", "#6d9a7a", "#a4c69a", "#dcebc0"),
    bark: ramp("#2a1a2b", "#472a3a", "#6a4044", "#90604e", "#b88a62"),
    wood: ramp("#33202c", "#5a3640", "#8a5a48", "#b88a5e", "#dfb982"),
    soil: ramp("#241630", "#3a2238", "#54323e", "#744a48", "#936450"),
    wet: ramp("#150f2c", "#22183c", "#30244e", "#46366a", "#6a5a90"),
    stone: ramp("#2c2a44", "#4a4660", "#706a80", "#9c96a4", "#d0cac8"),
    cream: ramp("#8a6a6a", "#c4a488", "#e8cfa4", "#f6e8c4", "#fff8e4"),
    plum: ramp("#1c1230", "#2e1d4a", "#47306a", "#6a4a8c", "#9272b0"),
    red: ramp("#4a1a3a", "#8a2c48", "#c44c50", "#e8865c", "#f8c48a"),
    gold: ramp("#6a3c2a", "#a8683a", "#dca04a", "#f4cf6a", "#fff0a8"),
    iron: ramp("#14101f", "#262036", "#3e3652", "#5c5474", "#8a84a0"),
    glass: ramp("#2a4a6a", "#4a7a9a", "#7ab0c0", "#b0dcd8", "#e8fff0"),
    snow: ramp("#5a6a9a", "#8a9cc4", "#b4c8e0", "#dce8f4", "#ffffff"),
};
const lighten = (c, f) => [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f, 255].map(Math.round);
const darken = (c, f) => [c[0] * (1 - f), c[1] * (1 - f), c[2] * (1 - f), 255].map(Math.round);
const glowRamp = (g) => { const c = hex(g); return [darken(c, 0.25), c, lighten(c, 0.45), lighten(c, 0.8)]; };
const hueRamp = (g) => { const c = hex(g); return [[28, 18, 48, 255], darken(c, 0.62), darken(c, 0.32), c, lighten(c, 0.55)]; };

// ---- Produce: each is both the icon and the fruit on the plant ------------------------------------------------------
const SHAPES = {
    bulb(p, x, y, r) { p.blob(x, y + 1, 5.5, 5, r); p.set(x, y + 6, r[1]); p.set(x, y + 7, r[1]); for (const a of [-2, 0, 2]) p.rect(x + a, y - 5, 1, 2, R.teal[3]); },
    leek(p, x, y, r) { for (let j = -6; j <= 6; j++) for (let i = -2; i <= 2; i++) p.tone(x + i, y + j, 0.72 - (i + 2) * 0.13 + (j > 2 ? 0.1 : 0), r); },
    pod(p, x, y, r) { for (let i = -6; i <= 6; i++) { const h = 3.2 * Math.cos(i / 6.4 * 1.5); for (let j = -h; j <= h; j++) p.tone(x + i, y + j + i * 0.3, 0.3 + (j < 0 ? 0.15 : 0), r); } for (const i of [-3, 0, 3]) p.blob(x + i, y + i * 0.3, 1.7, 1.7, r, { base: 0.8 }); },
    bell(p, x, y, r) { for (let j = -5; j <= 4; j++) { const w = 2 + (j + 5) * 0.42 + (j > 2 ? 1.5 : 0); for (let i = -w; i <= w; i++) p.tone(x + i, y + j, 0.62 - i / w * 0.3 - j * 0.02, r); } for (const i of [-3, 0, 3]) p.set(x + i, y + 5, r[0]); },
    berry(p, x, y, r) { for (const [a, b] of [[-3, 1], [3, 1], [0, -3], [0, 3]]) p.blob(x + a, y + b, 3, 3, r); },
    melon(p, x, y, r, a) { p.blob(x, y, 7, 6.5, r); for (const o of [-3, 0, 3]) for (let j = -5; j <= 5; j++) p.set(x + o * Math.cos(j / 7), y + j, a ?? r[1]); p.set(x - 3, y - 3, r[r.length - 1]); },
    daisy(p, x, y, r, a) { for (let k = 0; k < 8; k++) { const q = k * 0.785; p.blob(x + Math.cos(q) * 4, y + Math.sin(q) * 4, 2, 2, r); } p.blob(x, y, 2, 2, a ?? r[0], { base: 0.7 }); },
    carrot(p, x, y, r) { for (let j = -5; j <= 6; j++) { const w = 3.8 * (1 - (j + 5) / 13); for (let i = -w; i <= w; i++) p.tone(x + i, y + j, 0.6 - i * 0.12 + (j % 3 === 0 ? -0.2 : 0), r); } },
    gourd(p, x, y, r, a) { p.blob(x - 4, y, 4, 5.5, r, { base: 0.42 }); p.blob(x + 4, y, 4, 5.5, r, { base: 0.42 }); p.blob(x, y, 4.5, 6.5, r); p.rect(x - 1, y - 8, 2, 2, a ?? R.moss[1]); },
    wheat(p, x, y, r) { for (let j = -6; j < 6; j += 2) { p.set(x - 1, y + j, r[3]); p.set(x + 1, y + j + 1, r[2]); p.set(x, y + j, r[r.length - 1]); p.set(x - 2, y + j + 1, r[1]); p.set(x + 2, y + j, r[3]); } p.line(x, y + 5, x, y + 8, r[1]); },
    beet(p, x, y, r) { p.blob(x, y - 1, 5.5, 5, r); for (let i = 0; i < 4; i++) p.set(x, y + 4 + i, r[1]); },
    veil(p, x, y, r) { for (const a of [-1.1, -0.4, 0.4, 1.1]) p.leaf(x, y - 4, 1.57 + a, 8, 2.2, r); p.blob(x, y - 3, 2, 2, r, { base: 0.85 }); },
    mush(p, x, y, r, a) { p.rect(x - 2, y, 4, 6, R.cream[3]); p.rect(x + 1, y, 1, 6, R.cream[1]); p.blob(x, y - 1, 7, 5, r); for (let i = -6; i <= 6; i++) p.set(x + i, y + 2, a ?? r[0]); p.set(x - 2, y - 3, r[r.length - 1]); p.set(x + 2, y - 1, r[r.length - 1]); },
    snow(p, x, y, r) { for (const a of [-0.7, 0, 0.7]) p.leaf(x, y - 4, 1.57 + a, 8, 2, r); p.rect(x - 1, y - 6, 2, 2, R.moss[2]); },
    wort(p, x, y, r) { for (let k = 0; k < 4; k++) p.leaf(x, y, k * 1.57 + 0.78, 7, 2.2, r, { pow: 1 }); p.blob(x, y, 2.4, 2.4, r, { base: 0.9 }); },
    pearl(p, x, y, r) { p.blob(x - 3, y + 1, 3.5, 3.5, r); p.blob(x + 3, y + 2, 3, 3, r); p.blob(x, y - 2, 4.5, 4.5, r); p.set(x - 2, y - 4, [255, 255, 255, 255]); },
    flame(p, x, y, r) { for (let j = -8; j <= 5; j++) { const t = (j + 8) / 13, w = 6 * Math.sin(t * 2.7) * (1 - t * 0.15); for (let i = -w; i <= w; i++) p.tone(x + i + Math.sin(t * 5) * (1 - t), y + j, 0.95 - Math.abs(i) / (w + 1) * 0.65 - t * 0.2, r); } },
};
const LOOK = {
    moonradish: { shape: "bulb", ramp: ramp("#6a3a7a", "#c07ac0", "#f4c0dc", "#ffe8f0"), plant: "tuft", leaf: R.teal },
    silverleek: { shape: "leek", ramp: ramp("#3a6a6a", "#78b4a0", "#c8ecd8", "#f8fff4"), plant: "stalks", leaf: R.sage },
    glowpea: { shape: "pod", ramp: ramp("#2a6a3a", "#5ab04e", "#a4e070", "#e8ffb0"), plant: "pole", leaf: R.moss },
    hushbell: { shape: "bell", ramp: ramp("#3a2a7a", "#7a5ac8", "#b49af0", "#ece0ff"), plant: "stem", leaf: R.teal },
    lampberry: { shape: "berry", ramp: ramp("#8a2a2a", "#e0603a", "#ffa84e", "#ffe69a"), plant: "pole", leaf: R.moss },
    starmelon: { shape: "melon", ramp: ramp("#144a54", "#2a8a80", "#60d0b0", "#c0ffe4"), plant: "vine", leaf: R.moss, accent: hex("#1a5a5a") },
    fireflax: { shape: "daisy", ramp: ramp("#b8602a", "#f0a040", "#ffd860", "#fff8b0"), plant: "stem", leaf: R.moss, accent: hex("#8a3a2a") },
    emberroot: { shape: "carrot", ramp: ramp("#7a2230", "#d0483a", "#ff8a4a", "#ffd080"), plant: "tuft", leaf: R.moss },
    ghourd: { shape: "gourd", ramp: ramp("#8a4a3a", "#e0a058", "#ffd88a", "#fff4c8"), plant: "vine", leaf: R.moss },
    wispwheat: { shape: "wheat", ramp: ramp("#7a5a30", "#c8a050", "#f0d880", "#fff8d0"), plant: "stalks", leaf: R.sage },
    duskbeet: { shape: "beet", ramp: ramp("#3a1040", "#8a2470", "#e0509a", "#ffb0d4"), plant: "tuft", leaf: ramp("#3a1a3a", "#6a2a5a", "#4a8256", "#7cae5e", "#b6d276") },
    veilbloom: { shape: "veil", ramp: ramp("#4a2a7a", "#9a5ac8", "#d8a0f0", "#fbe8ff"), plant: "stem", leaf: R.teal },
    frostcap: { shape: "mush", ramp: ramp("#2a4a8a", "#4a8ad0", "#90d0f8", "#e8f8ff"), plant: "none", leaf: R.teal },
    snowbell: { shape: "snow", ramp: ramp("#7a9ad0", "#b8d4f0", "#ecf6ff", "#ffffff"), plant: "stem", leaf: R.teal },
    icewort: { shape: "wort", ramp: ramp("#1a6a7a", "#3ab4b0", "#80f0d8", "#e0fff4"), plant: "tuft", leaf: R.teal },
    pearlroot: { shape: "pearl", ramp: ramp("#a07a70", "#e0c4b0", "#fff0dc", "#ffffff"), plant: "tuft", leaf: R.sage },
    chimepea: { shape: "pod", ramp: ramp("#8a2a7a", "#e060b0", "#ffb0e0", "#ffeaf8"), plant: "pole", leaf: R.teal },
    sunmelon: { shape: "melon", ramp: ramp("#9a5a20", "#e8a830", "#ffe060", "#fffcc0"), plant: "vine", leaf: R.moss, accent: hex("#c07a20") },
    emberbell: { shape: "bell", ramp: ramp("#8a2a2a", "#e0603a", "#ffa04e", "#ffe69a"), plant: "stem", leaf: R.moss },
    gloamgourd: { shape: "gourd", ramp: ramp("#3a1a6a", "#8a4ac8", "#c890f0", "#f8e0ff"), plant: "vine", leaf: R.teal },
    nightgrain: { shape: "wheat", ramp: ramp("#2a2a7a", "#6a60d0", "#b4a8ff", "#f0ecff"), plant: "stalks", leaf: R.teal },
    rimeblossom: { shape: "daisy", ramp: ramp("#3a6ab0", "#80b8f0", "#c8ecff", "#ffffff"), plant: "stem", leaf: R.teal, accent: hex("#fff0a8") },
    hearthlight: { shape: "flame", ramp: ramp("#c04a2a", "#ff9a3a", "#ffd86a", "#fffbe0"), plant: "stem", leaf: R.moss },
};

function plantBody(p, look, stage) {
    const x = 12, g = 31, L = look.leaf, k = [0.42, 0.68, 0.9, 1][stage];
    if (look.plant === "tuft") {
        const n = stage === 0 ? 2 : 5;
        for (let i = 0; i < n; i++) p.leaf(x + (i - (n - 1) / 2) * 1.2, g - (stage >= 2 ? 4 : 0), -1.57 + (i - (n - 1) / 2) * 0.42, 14 * k, 2.1, L, { bend: (i - (n - 1) / 2) * 0.25 });
    } else if (look.plant === "stalks") {
        for (const o of stage === 0 ? [0] : [-3, 0, 3]) p.leaf(x + o, g, -1.57 + o * 0.05, 21 * k, 1.6, L, { pow: 0.6 });
        if (stage >= 1) for (const o of [-5, 5]) p.leaf(x + o * 0.4, g, -1.57 + o * 0.11, 14 * k, 1.5, L);
    } else if (look.plant === "pole") {
        if (stage > 0) { for (let j = g; j > g - 28 * k; j--) { p.set(x, j, R.wood[2]); p.set(x + 1, j, R.wood[1]); } p.rect(x - 1, Math.round(g - 28 * k), 4, 1, R.wood[3]); }
        const top = 24 * k;
        for (let t = 0; t < top; t += 1) p.set(x + Math.sin(t * 0.7) * 3, g - t, L[2]);
        for (let t = 2; t < top; t += 5) { const s = t % 2 ? 1 : -1; p.leaf(x + Math.sin(t * 0.7) * 3, g - t, -1.57 + s * 1.1, 8, 2.2, L); p.leaf(x + Math.sin(t * 0.7) * 3, g - t, -1.57 - s * 1, 7, 2, L); }
        if (stage === 0) p.leaf(x, g, -2.1, 6, 2, L).leaf(x, g, -1, 6, 2, L);
    } else if (look.plant === "stem") {
        const h = 22 * k;
        p.line(x, g, x + 1, g - h, L[2]); p.line(x + 1, g, x + 2, g - h + 3, L[1]);
        p.leaf(x, g - 1, -2.5, 9 * k + 3, 2.2, L); p.leaf(x, g - 1, -0.6, 9 * k + 3, 2.2, L);
        if (stage >= 2) { p.leaf(x, g - h * 0.45, -2.6, 8, 2, L); p.leaf(x + 1, g - h * 0.55, -0.5, 8, 2, L); }
    } else if (look.plant === "vine") {
        for (const [a, l] of [[-2.8, 10], [-0.3, 10], [-2.0, 8], [-1.1, 8]]) p.leaf(x, g - 1, a, l * (k + 0.1), 3.2, L);
        if (stage >= 1) { p.blob(x - 5, g - 3, 4, 3, L); p.blob(x + 6, g - 3, 4, 3, L); }
    }
}
function growingFruit(p, look, stage, emitR) {
    const sh = SHAPES[look.shape], r = emitR ?? look.ramp, a = look.accent, x = 12, g = 31;
    const onGround = { bulb: [x, g - 4], carrot: [x, g - 6], beet: [x, g - 5], pearl: [x, g - 4], wort: [x, g - 6], melon: [x, g - 6], gourd: [x, g - 6], mush: [x, g - 8] };
    const over = { leek: [x, g - 15], wheat: [x, g - 22], bell: [x + 5, g - 17], daisy: [x + 1, g - 22], veil: [x + 1, g - 18], snow: [x + 1, g - 16], flame: [x + 1, g - 22], pod: [x, g - 13], berry: [x, g - 16] };
    const at = onGround[look.shape] ?? over[look.shape];
    if (stage === 3) {
        if (look.shape === "pod") { sh(p, x - 3, g - 12, r, a); sh(p, x + 4, g - 20, r, a); return; }
        if (look.shape === "berry") { sh(p, x - 3, g - 11, r, a); sh(p, x + 4, g - 19, r, a); return; }
        if (look.shape === "bell") { sh(p, x + 6, g - 18, r, a); sh(p, x - 5, g - 14, r, a); return; }
        sh(p, at[0], at[1], r, a);
    } else if (stage === 2) {
        if (look.shape === "melon" || look.shape === "gourd") { p.blob(x, g - 4, 4, 3.5, r); return; }
        if (look.shape === "mush") { p.rect(x - 1, g - 5, 3, 5, R.cream[3]); p.blob(x, g - 6, 4, 3, r); return; }
        if (onGround[look.shape]) { p.blob(x, g - 2, 3.5, 3, r); return; }
        p.blob(at[0], at[1] + 5, 2.2, 2.6, r);
    } else if (stage === 1 && look.shape === "mush") { p.rect(x - 1, g - 3, 2, 3, R.cream[3]); p.blob(x, g - 4, 2.5, 2, r); }
    else if (stage === 0 && look.shape === "mush") p.blob(x, g - 1, 2, 1.5, r);
}

// ---- Items that aren't crops -----------------------------------------------------------------------------------------------
function fishShape(p, r, o = {}) {
    const s = o.boot ? 0 : 1, y = 8;
    for (let i = -6; i <= 5; i++) { const h = (o.fat ?? 3.6) * Math.sin((i + 7) / 12 * 3.1); for (let j = -h; j <= h; j++) p.tone(8 + i, y + j, 0.72 - (j / (h + 1)) * 0.45 - (j > 0 ? 0.1 : 0), r); }
    for (let i = 0; i < 4; i++) for (let j = -i; j <= i; j++) p.tone(2 - i + 1, y + j, 0.4, r);
    p.set(11, y - 1, INK); p.line(5, y - 4, 8, y - 4, r[1]); p.set(9, y + 1, r[0]);
    return s;
}
const FISH_R = {
    pondlet: ramp("#2a4a7a", "#5a8ac0", "#a0c8e8", "#e0f4ff"), silverperch: ramp("#4a5a7a", "#8a9cb4", "#c8d4e0", "#ffffff"), lanternloach: ramp("#9a4a2a", "#e0902f", "#ffc861", "#fff0a8"),
    mistcarp: ramp("#2a6a5a", "#60b09a", "#a8e4c8", "#ecfff0"), duskeel: ramp("#5a1a5a", "#b03a8a", "#f07ab0", "#ffd0e4"), icedace: ramp("#2a5a9a", "#5aa4d8", "#a8e8f8", "#f4ffff"), moonkoi: ramp("#b0603a", "#f0a860", "#fff0d8", "#ffffff"), duchess: ramp("#6a4a2a", "#c09a50", "#ffe9a8", "#fffbe8"),
};
function paintFish(p, id) {
    if (id === "oldboot") {
        const r = R.wood; p.rect(5, 2, 6, 7, r[1]); p.rect(6, 3, 3, 5, r[2]); p.rect(3, 9, 10, 4, r[1]); p.rect(3, 12, 11, 2, r[0]); p.rect(4, 9, 5, 2, r[2]); p.line(6, 4, 9, 4, R.cream[2]); p.line(6, 6, 9, 6, R.cream[2]);
        return p.outline(INK);
    }
    fishShape(p, FISH_R[id], { fat: id === "duskeel" ? 2.2 : id === "duchess" ? 4.6 : 3.6 });
    return p.outline(INK);
}
const BOWL = { soup: (p, c) => { for (let j = 0; j < 6; j++) { const w = 6.5 - j * 0.5; for (let i = -w; i <= w; i++) p.tone(8 + i, 8 + j, 0.5 - i * 0.05, R.wood); } p.blob(8, 7, 6.5, 2, c, { base: 0.65 }); for (const i of [5, 11]) p.set(i, 5, [255, 255, 255, 180]); },
    pie: (p, c) => { for (let i = -7; i <= 7; i++) for (let j = 0; j < 5; j++) p.tone(8 + i, 8 + j, 0.45 + (j === 0 ? 0.2 : 0), R.gold); p.blob(8, 8, 7, 3.2, R.gold, { base: 0.65 }); for (const i of [-3, 0, 3]) p.line(8 + i, 7, 8 + i * 1.3, 9, c[1]); },
    jar: (p, c) => { p.rect(4, 5, 8, 9, c[2]); p.rect(5, 6, 2, 7, c[3]); p.rect(10, 5, 2, 9, c[1]); p.rect(4, 3, 8, 2, R.wood[2]); p.rect(3, 2, 10, 1, R.wood[3]); },
    bread: (p, c) => { p.blob(8, 9, 7, 4.6, c); for (const i of [-3, 0, 3]) p.line(8 + i, 6, 8 + i + 1, 9, c[3]); },
    cup: (p, c) => { p.rect(4, 6, 8, 7, R.cream[2]); p.rect(4, 6, 8, 2, c[2]); p.rect(10, 8, 2, 5, R.cream[1]); p.line(12, 8, 13, 10, R.cream[2]); p.line(13, 10, 12, 12, R.cream[2]); for (const j of [2, 4]) p.set(7, j, [255, 255, 255, 170]); },
    ice: (p, c) => { for (let j = 8; j <= 13; j++) p.line(8 - (13 - j) * 0.7, j, 8 + (13 - j) * 0.7, j, R.cream[3]); p.blob(8, 6, 4.5, 4, c); p.set(7, 4, [255, 255, 255, 255]); },
};
const DISH_LOOK = { broth: ["soup", ramp("#6a6a50", "#a0a070", "#d0d09a", "#f0f0c8")], slaw: ["soup", ramp("#4a8a7a", "#a0e0b0", "#ecf8d0", "#ffffff")], peasoup: ["soup", LOOK.glowpea.ramp], fishpie: ["pie", R.wood], jam: ["jar", LOOK.lampberry.ramp], melonice: ["ice", LOOK.starmelon.ramp], stew: ["soup", LOOK.emberroot.ramp], pie: ["pie", LOOK.ghourd.ramp], bread: ["bread", LOOK.duskbeet.ramp], cordial: ["jar", LOOK.hushbell.ramp], chowder: ["soup", ramp("#5a8ac0", "#a0c8e8", "#e0f4ff", "#ffffff")], tea: ["cup", LOOK.snowbell.ramp], remembering: ["soup", ramp("#b0603a", "#f0a860", "#ffe0a8", "#fff8e0")], honey: ["jar", R.gold] };
const RELIC_PAINT = {
    spoon: (p) => { p.line(4, 13, 10, 6, R.stone[3]); p.blob(11, 4, 2.6, 2.6, R.stone); }, button: (p) => { p.blob(8, 8, 5, 5, R.gold); p.set(7, 7, INK); p.set(9, 9, INK); p.set(9, 7, INK); p.set(7, 9, INK); },
    thimble: (p) => { for (let j = 3; j < 13; j++) { const w = 2.5 + (j - 3) * 0.3; for (let i = -w; i <= w; i++) p.tone(8 + i, j, 0.6 - i * 0.1 + (j % 2) * -0.15, R.stone); } }, key: (p) => { p.blob(5, 5, 3, 3, R.gold); p.set(5, 5, [0, 0, 0, 0]); p.line(7, 7, 13, 13, R.gold[2]); p.line(10, 12, 12, 10, R.gold[2]); },
    marble: (p) => { p.blob(8, 8, 5, 5, R.glass); p.leaf(5, 8, -0.3, 7, 1.2, R.plum); p.set(6, 5, [255, 255, 255, 255]); }, ticket: (p) => { p.rect(2, 5, 12, 7, R.cream[2]); p.line(5, 5, 5, 11, R.cream[0]); p.line(7, 7, 12, 7, R.bark[2]); p.line(7, 9, 11, 9, R.bark[2]); },
    bell: (p) => { SHAPES.bell(p, 8, 8, R.gold); }, teacup: (p) => { for (let a = -1.4; a < 1.5; a += 0.2) p.set(6 + Math.cos(a) * 5, 8 + Math.sin(a) * 4, R.cream[3]); for (let a = -1.4; a < 1.5; a += 0.2) p.set(6 + Math.cos(a) * 4, 8 + Math.sin(a) * 3, R.cream[1]); },
    coin: (p) => { p.blob(8, 8, 5, 5, R.bark); p.blob(8, 8, 3, 3, R.gold, { base: 0.3 }); }, pipe: (p) => { p.line(3, 5, 10, 8, R.cream[3]); p.rect(9, 7, 4, 5, R.cream[2]); p.rect(9, 7, 4, 1, R.bark[1]); }, bone: (p) => { p.line(4, 12, 12, 4, R.cream[3]); p.line(5, 12, 12, 5, R.cream[2]); for (const [a, b] of [[3, 11], [4, 13], [11, 3], [13, 4]]) p.blob(a, b, 1.8, 1.8, R.cream); },
    whistle: (p) => { p.rect(3, 6, 8, 4, R.gold[3]); p.rect(3, 9, 8, 1, R.gold[1]); p.blob(11, 9, 3, 3, R.gold); p.set(5, 7, INK); p.line(2, 6, 2, 4, R.bark[2]); }, collar: (p) => { for (let a = 0; a < 6.3; a += 0.15) { p.set(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 4, R.red[2]); p.set(8 + Math.cos(a) * 4, 8 + Math.sin(a) * 3, R.red[1]); } p.blob(8, 12, 2, 2, R.gold); },
    woodspoon: (p) => { p.line(3, 13, 10, 6, R.wood[3]); p.line(4, 13, 11, 6, R.wood[2]); p.blob(11, 4, 3, 3.4, R.wood); }, feather: (p) => { p.leaf(3, 13, -0.8, 13, 3, ramp("#8a2a5a", "#e060a0", "#ffb0d0", "#ffeaf4")); p.line(3, 13, 12, 4, R.cream[3]); },
    moth: (p) => { p.leaf(8, 7, 3.6, 7, 3, R.gold); p.leaf(8, 7, -0.46, 7, 3, R.gold); p.leaf(8, 8, 2.5, 5, 2, R.wood); p.leaf(8, 8, 0.6, 5, 2, R.wood); p.line(8, 4, 8, 11, R.bark[1]); }, stamp: (p) => { p.rect(3, 3, 10, 11, R.cream[3]); for (let i = 3; i < 13; i += 2) { p.set(i, 3, [0, 0, 0, 0]); p.set(i, 13, [0, 0, 0, 0]); } p.rect(5, 5, 6, 7, R.plum[2]); p.blob(8, 8, 2, 2, R.gold, { base: 0.8 }); },
};

// ---- Ghosts ------------------------------------------------------------------------------------------------------------------------
function ghostBody(p, r, hem, wide = 1) {
    const cx = 20;
    for (let y = 4; y < 46; y++) {
        const t = (y - 4) / 42, base = t < 0.36 ? Math.sqrt(1 - ((0.36 - t) / 0.36) ** 2) * 12.4 : 12.4 + (t - 0.36) * 8.5;
        const w = Math.max(0.6, base * wide);
        for (let x = -w; x <= w; x++) {
            const wave = Math.sin((x / w) * 7.5 + hem * 3.14) * 2.4;
            if (y > 41 + wave) continue;
            const lit = 0.72 - (x / (w + 1)) * 0.28 - t * 0.2 - Math.max(0, Math.abs(x / w) - 0.7) * 0.5;
            p.tone(cx + x, y, lit, r, 0.4);
        }
    }
}
const FACE = (p, y, mood, ink = INK, x = 20) => {
    if (mood === 1) { for (const o of [-5, 4]) { p.set(x + o, y + 1, ink); p.set(x + o + 1, y, ink); p.set(x + o + 2, y + 1, ink); } p.line(x - 2, y + 5, x - 1, y + 6, ink); p.line(x, y + 6, x + 1, y + 6, ink); p.set(x + 2, y + 5, ink); }
    else { for (const o of [-5, 4]) { p.rect(x + o, y, 2, 3, ink); p.set(x + o, y, [255, 255, 255, 255]); } p.rect(x - 1, y + 5, 2, 1, ink); }
    for (const o of [-8, 6]) p.rect(x + o, y + 4, 2, 1, [255, 150, 170, 150]);
};
const GHOST_ART = {
    quillon(p, m) { ghostBody(p, ramp("#7a6ab0", "#a496d8", "#d2c8f4", "#f4f0ff"), p.hem); FACE(p, 14, m); for (const o of [-6, 3]) { p.line(20 + o - 1, 13, 20 + o + 3, 13, R.gold[3]); p.line(20 + o - 1, 17, 20 + o + 3, 17, R.gold[3]); p.line(20 + o - 1, 13, 20 + o - 1, 17, R.gold[3]); p.line(20 + o + 3, 13, 20 + o + 3, 17, R.gold[3]); } p.blob(20, 5, 5, 3.5, R.stone); p.line(10, 24, 30, 37, R.wood[1]); p.line(10, 25, 30, 38, R.wood[2]); p.rect(26, 34, 10, 8, R.wood[2]); p.rect(26, 34, 10, 3, R.wood[3]); p.rect(30, 36, 2, 2, R.gold[3]); },
    bartleby(p, m) { ghostBody(p, ramp("#5a7aa0", "#8cb0d0", "#c4e0ec", "#f0fbff"), p.hem); FACE(p, 15, m); p.blob(20, 7, 10, 6, R.gold, { base: 0.6 }); for (let i = -15; i <= 15; i++) { const y = 11 + (i * i) * 0.016; p.tone(20 + i, y, 0.78, R.gold); p.tone(20 + i, y + 1, 0.5, R.gold); } for (let i = -7; i <= 7; i++) for (let j = 0; j < 6 - Math.abs(i) * 0.7; j++) p.tone(20 + i, 22 + j, 0.82 - j * 0.05, R.cream); FACE(p, 15, m); },
    auberon(p, m) { ghostBody(p, ramp("#a07a60", "#d4b090", "#f2dcc0", "#fffaf0"), p.hem, 1.12); FACE(p, 16, m); p.blob(20, 5, 9, 6, R.cream, { base: 0.8 }); for (const o of [-6, 0, 6]) p.blob(20 + o, 3, 4, 3, R.cream, { base: 0.9 }); p.rect(11, 9, 18, 2, R.cream[2]); p.line(14, 22, 26, 22, R.bark[2]); p.rect(12, 26, 16, 14, [240, 232, 216, 210]); p.line(20, 22, 12, 26, R.cream[3]); p.line(20, 22, 28, 26, R.cream[3]); },
    odette(p, m) { ghostBody(p, ramp("#a0608a", "#d890b4", "#f4c4d8", "#fff0f6"), p.hem, 0.95); FACE(p, 14, m); for (const o of [-1, 1]) { p.leaf(20 + o * 8, 8, 1.57 + o * -1.2, 22, 3.5, ramp("#6a2a6a", "#a8488a", "#d874a8"), { bend: o * 0.1 }); } p.blob(20, 7, 11, 5, ramp("#5a2a5a", "#8a3a7a", "#c0609a", "#e898c0")); FACE(p, 14, m); p.leaf(26, 6, -1, 13, 2.4, ramp("#b03a7a", "#f07ab0", "#ffd0e4", "#fff4fa")); for (let a = 0; a < 3.14; a += 0.3) p.set(20 + Math.cos(a) * 9, 26 + Math.sin(a) * 5, a % 0.9 < 0.3 ? R.gold[4] : R.cream[4]); },
    fennimore(p, m) { ghostBody(p, ramp("#5a9a80", "#90c8a8", "#c8ecd0", "#f4fff4"), p.hem, 0.92); FACE(p, 15, m); for (let i = -12; i <= 12; i++) p.tone(20 + i, 9, 0.5 - i * 0.03, R.bark); p.blob(20, 6, 8, 4.5, R.bark, { base: 0.5 }); p.rect(12, 7, 16, 1, R.red[2]); p.line(13, 15, 18, 15, R.gold[3]); p.blob(25, 16, 3.4, 3.4, ramp("#b0dcd8", "#e8fff0"), { base: 0.4 }); p.line(28, 18, 30, 26, R.gold[2]); FACE(p, 15, m); p.line(14, 26, 20, 31, R.stone[3]); p.line(26, 26, 20, 31, R.stone[3]); p.rect(19, 30, 3, 3, R.red[2]); },
    gran(p, m) { ghostBody(p, ramp("#c09a60", "#ecc888", "#fff0c4", "#fffcf0"), p.hem); FACE(p, 15, 1); p.blob(20, 7, 9, 5.5, R.snow, { base: 0.75 }); p.blob(20, 2.5, 4, 3, R.snow, { base: 0.75 }); for (let a = 0; a < 3.14; a += 0.25) p.set(20 + Math.cos(a) * 11, 28 + Math.sin(a) * 4, R.red[2]); },
    biscuit(p, m) {
        const r = ramp("#a07a4a", "#d4b078", "#f2deb0", "#fff8e4"), hem = p.hem;
        p.blob(20, 30, 13, 8, r); p.blob(29, 21, 8, 7.5, r);
        for (const [x, ph] of [[11, 0], [17, 1], [24, 0], [30, 1]]) { const l = 6 + Math.sin((hem + ph) * 3.14) * 1.2; for (let j = 0; j < l; j++) p.tone(x, 36 + j, 0.6, r), p.tone(x + 1, 36 + j, 0.42, r), p.tone(x - 1, 36 + j, 0.72, r); }
        for (let t = 0; t < 8; t++) p.blob(7 - t * 0.6, 26 - t * (0.9 + hem * 0.3) + (hem ? t * 0.2 : 0), 1.8, 1.8, r);
        p.leaf(23, 15, 1.9, 11, 3.2, ramp("#6a4a3a", "#a07a4a", "#d4b078")); p.leaf(34, 15, 1.2, 8, 2.6, ramp("#6a4a3a", "#a07a4a", "#d4b078"));
        p.blob(36, 23, 3.5, 2.8, r, { base: 0.75 }); p.rect(37, 21, 2, 2, INK);
        if (m === 1) { p.line(26, 18, 27, 17, INK); p.line(27, 17, 28, 18, INK); p.line(31, 18, 32, 17, INK); p.line(32, 17, 33, 18, INK); p.rect(35, 25, 3, 3, [240, 120, 140, 255]); } else { p.rect(27, 18, 2, 2, INK); p.rect(32, 18, 2, 2, INK); }
        p.line(23, 25, 30, 28, R.red[2]); p.line(23, 26, 30, 29, R.red[1]); p.blob(29, 30, 1.8, 1.8, R.gold);
    },
};

/** Paint everything. Returns the atlas image plus lookups. */
export function paintAtlas() {
    const A = new Atlas(1024);
    const add = (name, w, h, fn) => A.add(name, w, h, fn);
    // soil, three variations
    for (let v = 0; v < 3; v++) for (const wet of [0, 1]) add(`soil${wet}${v}`, 24, 24, (p) => {
        const n = noiser(v * 31 + 5), r = wet ? R.wet : R.soil;
        for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
            const cx = Math.min(x, 23 - x), cy = Math.min(y, 23 - y);
            if (cx + cy < 2) continue;
            const row = (y + v) % 6, ridge = row < 2 ? 0.62 : row < 4 ? 0.42 : 0.18;
            const edge = cx === 0 || cy === 0 ? -0.1 : 0;
            p.tone(x, y, ridge + (n.fbm(x * 0.45, y * 0.8) - 0.5) * 0.7 + edge - (y === 23 ? 0.2 : 0), r);
        }
        if (wet) for (let k = 0; k < 7; k++) { const x = 2 + n.rand(k, v) * 20 | 0, y = 2 + n.rand(v, k + 9) * 20 | 0; p.set(x, y, [160, 200, 255, 200]); p.set(x + 1, y, [120, 150, 240, 120]); }
    });
    // overgrown ground: long grass with a thorny arc or two and a few hopeful berries
    for (let v = 0; v < 3; v++) add(`bramble${v}`, 26, 30, (p) => {
        const n = noiser(v + 90), blade = ramp("#20403f", "#2c5a48", "#3f7a50", "#5f9a58", "#8cba62");
        for (let k = 0; k < 16; k++) { const x = 2 + n.rand(k, v) * 22, y = 12 + n.rand(v, k) * 16; p.leaf(x, y + 2, -1.57 + (n.rand(k + 5, v) - 0.5) * 1.1, 8 + n.rand(v, k + 5) * 6, 1.3, blade, { bend: (n.rand(k, 3) - 0.5) * 0.8 }); }
        const thorn = ramp("#2c1f40", "#47305a", "#6a4a7a", "#8a6a8a");
        for (let a = 2.6; a < 6.6; a += 0.07) { const x = 13 + Math.cos(a) * 11, y = 22 + Math.sin(a) * (11 + v); p.tone(x, y, 0.6, thorn); if (Math.round(a * 14) % 9 === 0) p.set(x, y - 1, thorn[3]); }
        for (let k = 0; k < 2; k++) { const x = 5 + n.rand(k + 40, v) * 16 | 0, y = 12 + n.rand(v, k + 40) * 10 | 0; p.blob(x, y, 1.6, 1.6, R.red, { base: 0.7 }); }
    });
    add("tuft", 12, 8, (p) => { for (const a of [-2.3, -1.6, -0.9]) p.leaf(6, 7, a, 7, 1.2, R.moss); });
    // crops
    for (const id of Object.keys(CROPS)) {
        const look = LOOK[id], g = look.ramp.map((c) => lighten(c, 0.22));
        for (let st = 0; st < 4; st++) {
            add(`crop:${id}:${st}`, 24, 34, (p) => {
                p.rect(7, 31, 10, 1, [0, 0, 0, 0]);
                plantBody(p, look, st); growingFruit(p, look, st); p.outline(INK);
            });
            if (st >= 2) add(`glow:${id}:${st}`, 24, 34, (p) => growingFruit(p, { ...look, accent: look.accent }, st, g));
        }
        add(`item:${id}`, 16, 16, (p) => { SHAPES[look.shape](p, look.shape === "gourd" ? 8 : 8, look.shape === "melon" ? 8 : 8, look.ramp, look.accent); p.outline(INK); });
    }
    for (const id of Object.keys(FISH)) add(`item:${id}`, 16, 16, (p) => paintFish(p, id));
    for (const id of [...Object.keys(DISHES), "honey"]) add(`item:${id}`, 16, 16, (p) => { const [k, c] = DISH_LOOK[id]; BOWL[k](p, c); p.outline(INK); });
    for (const id of Object.keys(RELIC_PAINT)) add(`item:${id}`, 16, 16, (p) => { RELIC_PAINT[id](p); p.outline(INK); });
    // ghosts: two hems, two moods
    const ghostNames = [...Object.keys(GHOSTS), "gran"];
    for (const g of ghostNames) for (let hem = 0; hem < 2; hem++) for (let m = 0; m < 2; m++) add(`ghost:${g}:${hem}${m}`, 40, 48, (p) => {
        const t = new Px(40, 48); t.hem = hem; GHOST_ART[g](t, m); t.outline(hex("#3a2a6a"));
        if (g !== "biscuit") for (let y = 26; y < 48; y++) for (let x = 0; x < 40; x++) t.d[t.i(x, y) + 3] *= 1 - ((y - 26) / 22) ** 1.4 * 0.72;
        p.stamp(t, 0, 0, { alpha: 0.94 });
    });
    // Wick the moth
    for (let f = 0; f < 3; f++) add(`moth${f}`, 16, 12, (p) => {
        const up = [-0.5, 0, 0.5][f], wing = ramp("#a8683a", "#f0b050", "#ffe08a", "#fff6c8");
        const half = new Px(8, 12);
        half.leaf(7, 5, 3.3 - up, 6.5 - Math.abs(up) * 2, 3, wing); half.leaf(7, 7, 2.6 - up * 0.4, 4.5, 2, wing);
        p.stamp(half, 0, 0); p.stamp(half, 8, 0, { flip: true });
        p.rect(7, 3, 2, 7, R.bark[3]); p.rect(7, 3, 2, 2, R.cream[3]); p.set(6, 2, R.bark[2]); p.set(9, 2, R.bark[2]);
        p.outline(INK);
    });
    // moon, eight phases
    for (let f = 0; f < 8; f++) add(`moon${f}`, 56, 56, (p) => {
        const n = noiser(77), cx = 28, cy = 28, r = 25, mr = R.cream;
        for (let y = 0; y < 56; y++) for (let x = 0; x < 56; x++) {
            const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, q = dx * dx + dy * dy;
            if (q > 1) continue;
            const edge = Math.sqrt(1 - dy * dy);
            const shown = f === 0 ? false : f === 4 ? true : f < 4 ? dx > edge * Math.cos(f / 8 * 6.283) : dx < -edge * Math.cos((f - 4) / 8 * 6.283);
            const m = n.fbm(x * 0.14, y * 0.14), t = 0.82 - (m > 0.53 ? 0.32 : 0) - q * 0.14;
            if (shown) p.tone(x, y, t, ramp("#a8b0d0", "#d4d8e4", "#f4f0dc", "#fffcec"));
            else p.tone(x, y, 0.5 - (m > 0.53 ? 0.2 : 0), ramp("#1c1a44", "#262454", "#32305e"));
        }
    });
    // sun, a plain warm disc
    add("sun", 40, 40, (p) => { p.blob(20, 20, 16, 16, ramp("#ffc861", "#ffe08a", "#fff6c8", "#ffffff"), { base: 0.72 }); });
    // little weather: cloud bits
    for (let v = 0; v < 3; v++) add(`cloud${v}`, 72, 26, (p) => {
        const n = noiser(v * 7 + 3);
        for (let k = 0; k < 9; k++) { const x = 10 + k * 6.4, h = 5 + n.rand(k, v) * 7; p.blob(x, 18 - h * 0.4, 7 + n.rand(v, k) * 3, h, ramp("#b0a8cc", "#d8cce0", "#f4e8ec", "#ffffff"), { base: 0.72 }); }
        for (let y = 20; y < 26; y++) for (let x = 0; x < 72; x++) p.d[p.i(x, y) + 3] = 0;
    });
    paintBuildings(add);
    return A;
}

function roofRow(p, x, y, w, r, step = 3) { for (let i = 0; i < w; i++) { const t = 0.52 + ((i + (y >> 1) * 2) % step === 0 ? -0.26 : 0.08); p.tone(x + i, y, t, r); } }
function paintBuildings(add) {
    add("house", 76, 66, (p) => {
        // timber cottage: warm plaster, crooked thatch
        for (let y = 30; y < 62; y++) for (let x = 12; x < 66; x++) p.tone(x, y, 0.72 - (x - 12) / 54 * 0.34 - (y > 54 ? 0.12 : 0), R.cream);
        for (const x of [12, 30, 48, 64]) p.rect(x, 30, 2, 32, R.bark[1]);
        p.rect(12, 44, 54, 2, R.bark[1]);
        p.rect(34, 44, 12, 18, R.wood[1]); p.rect(35, 45, 10, 17, R.wood[2]); p.rect(36, 46, 3, 15, R.wood[3]); p.rect(42, 53, 2, 2, R.gold[3]);
        for (const x of [17, 50]) { p.rect(x, 34, 10, 9, R.bark[1]); p.rect(x + 1, 35, 8, 7, hex("#2a2450")); p.rect(x + 5, 35, 1, 7, R.bark[2]); p.rect(x + 1, 38, 8, 1, R.bark[2]); }
        for (let y = 6; y < 34; y++) { const hw = 8 + (y - 6) * 1.32; for (let x = 39 - hw; x <= 39 + hw; x++) { const t = 0.55 - (x - 39) / hw * 0.25 + Math.sin(x * 0.7 + y * 1.6) * 0.14 + (y % 4 === 0 ? -0.2 : 0); p.tone(x, y, t, ramp("#3a2038", "#6a3a44", "#a06a4c", "#d0a060", "#f0d088")); } }
        p.rect(52, 4, 8, 14, R.stone[1]); p.rect(52, 4, 3, 14, R.stone[2]); p.rect(51, 3, 10, 2, R.stone[3]);
        p.outline(INK);
    });
    add("house:glow", 76, 66, (p) => { for (const x of [17, 50]) { p.rect(x + 1, 35, 8, 7, hex("#ffb45a")); p.rect(x + 5, 35, 1, 7, [0, 0, 0, 0]); p.rect(x + 1, 38, 8, 1, [0, 0, 0, 0]); } });
    add("hive", 26, 36, (p) => {
        for (let k = 0; k < 6; k++) { const w = 10 - Math.abs(k - 2.4) * 1.8; p.blob(13, 11 + k * 3.4, w, 2.6, ramp("#6a3c2a", "#a8683a", "#dca04a", "#f4cf6a")); }
        p.rect(11, 24, 4, 3, INK); p.rect(11, 29, 3, 5, R.wood[1]); p.rect(6, 28, 14, 2, R.wood[2]); p.outline(INK);
    });
    add("shed", 46, 48, (p) => {
        p.rect(4, 14, 3, 32, R.wood[1]); p.rect(39, 14, 3, 32, R.wood[1]);
        for (let y = 2; y < 16; y++) { const hw = 8 + (y - 2) * 1.05; roofRow(p, 23 - hw, y, hw * 2, ramp("#3a2a54", "#5a3a64", "#8a5a6a", "#b08070")); }
        p.blob(23, 36, 11, 9, R.iron, { base: 0.42 }); p.rect(12, 26, 22, 3, R.iron[3]); p.rect(13, 27, 20, 1, hex("#ffb45a"));
        p.rect(14, 44, 3, 3, R.iron[1]); p.rect(29, 44, 3, 3, R.iron[1]);
        p.outline(INK);
    });
    add("glasshouse", 70, 52, (p) => {
        for (let y = 2; y < 48; y++) { const hw = y < 18 ? 8 + y * 1.5 : 32; for (let x = 35 - hw; x < 35 + hw; x++) { p.tone(x, y, 0.5 + ((x + y) % 22 < 5 ? 0.3 : 0) - y * 0.008, ramp("#3a5a7a", "#6a9ab0", "#a4d4d0", "#e4fff0")); } }
        for (let x = 3; x < 70; x += 11) p.line(x, 18, x, 48, R.bark[1]);
        p.line(35, 2, 3, 18, R.bark[1]); p.line(35, 2, 66, 18, R.bark[1]); p.line(3, 18, 66, 18, R.bark[1]); p.line(19, 10, 19, 48, R.bark[1]); p.line(50, 10, 50, 48, R.bark[1]);
        p.rect(3, 46, 64, 4, R.stone[1]);
        p.outline(INK);
    });
    add("stall", 120, 84, (p) => {
        p.rect(8, 22, 5, 54, R.wood[1]); p.rect(107, 22, 5, 54, R.wood[1]); p.rect(9, 22, 2, 54, R.wood[3]); p.rect(108, 22, 2, 54, R.wood[3]);
        for (let y = 0; y < 24; y++) for (let x = 2 + (24 - y) * 0.2; x < 118 - (24 - y) * 0.2; x++) { const stripe = Math.floor((x - 60) / 12 + 100) % 2; p.tone(x, y, 0.55 + (y < 3 ? 0.2 : 0) - y * 0.008, stripe ? ramp("#7a2a3a", "#b84448", "#e0786a", "#f4b08a") : ramp("#c4a488", "#e8cfa4", "#f6e8c4", "#fff8e4")); }
        for (let x = 2; x < 118; x += 12) { const stripe = Math.floor((x + 6 - 60) / 12 + 100) % 2; p.blob(x + 6, 24, 6, 3.4, stripe ? ramp("#7a2a3a", "#b84448", "#e0786a") : ramp("#c4a488", "#e8cfa4", "#fff8e4")); }
        for (let y = 56; y < 80; y++) for (let x = 4; x < 116; x++) p.tone(x, y, 0.6 - (y - 56) * 0.012 + ((y - 56) % 8 === 0 ? -0.3 : 0) + (x * 7 % 40 === 0 ? -0.25 : 0), R.wood);
        p.rect(2, 52, 116, 5, R.wood[3]); p.rect(2, 52, 116, 1, R.wood[4]);
        p.outline(INK);
    });
    add("sign", 60, 26, (p) => { p.rect(2, 2, 56, 20, R.wood[2]); p.rect(3, 3, 54, 2, R.wood[4]); p.outline(INK); });
    add("crate", 44, 30, (p) => {
        for (let y = 8; y < 30; y++) for (let x = 0; x < 44; x++) p.tone(x, y, 0.6 + ((y - 8) % 7 === 0 ? -0.34 : 0) + (x % 14 === 0 ? -0.2 : 0), R.wood);
        for (let i = 0; i < 18; i++) p.blob(4 + (i * 13) % 36, 6 + (i * 5) % 6, 3.4, 3.4, i % 3 ? R.red : R.moss);
        p.outline(INK);
    });
    add("cauldron", 96, 84, (p) => {
        p.blob(48, 48, 40, 32, R.iron, { base: 0.42, gain: 0.9 });
        for (let i = -40; i < 40; i++) for (let j = 0; j < 10; j++) if (Math.abs(i) / 42 + (j - 5) ** 2 / 36 < 1) p.tone(48 + i, 16 + j, 0.75 - i * 0.008, R.iron);
        for (const x of [14, 82]) p.blob(x, 34, 5, 5, R.iron, { base: 0.5 });
        for (const x of [24, 72]) p.rect(x - 4, 76, 8, 8, R.iron[1]);
        p.outline(INK);
    });
    add("spoon", 60, 12, (p) => { p.rect(0, 5, 44, 3, R.wood[3]); p.rect(0, 7, 44, 1, R.wood[1]); p.blob(50, 6, 9, 5, R.wood, { base: 0.6 }); p.outline(INK); });
    add("ferry", 112, 60, (p) => {
        for (let x = 0; x < 112; x++) { const c = (x - 56) / 56, top = 36 + c * c * -12, bot = 54 - c * c * 12; for (let y = top; y < bot; y++) p.tone(x, y, 0.5 - (y - top) * 0.04 + ((y | 0) % 5 === 0 ? -0.15 : 0), R.bark); }
        for (let x = 6; x < 106; x++) { const c = (x - 56) / 56; p.set(x, 36 - c * c * 12, R.wood[4]); }
        p.rect(44, 14, 26, 22, R.bark[2]); p.rect(40, 10, 34, 5, R.wood[2]); p.rect(48, 20, 6, 8, hex("#ffcf7a")); p.rect(60, 20, 6, 8, hex("#ffcf7a"));
        p.rect(18, 2, 3, 34, R.wood[1]); p.rect(14, 6, 12, 2, R.wood[2]); p.blob(14, 11, 3, 4, R.gold, { base: 0.8 });
        p.outline(INK);
    });
    add("post", 26, 96, (p) => { p.rect(11, 12, 5, 84, R.wood[2]); p.rect(11, 12, 2, 84, R.wood[3]); p.rect(4, 14, 18, 3, R.wood[2]); p.rect(4, 14, 3, 8, R.wood[1]); p.outline(INK); });
    add("lamp", 30, 36, (p) => { p.rect(9, 2, 12, 3, R.iron[3]); p.rect(11, 0, 8, 3, R.iron[2]); for (let y = 5; y < 26; y++) { const w = 7 + Math.sin(y * 0.15) * 3; p.line(15 - w, y, 15 + w, y, [255, 230, 170, 60]); p.set(15 - w, y, R.iron[3]); p.set(15 + w, y, R.iron[3]); } p.rect(7, 26, 16, 3, R.iron[3]); p.rect(11, 29, 8, 6, R.iron[1]); p.outline(INK); });
    add("dewbell", 24, 34, (p) => {
        p.rect(11, 8, 2, 24, R.wood[1]); p.rect(11, 8, 1, 24, R.wood[3]); p.rect(6, 8, 12, 2, R.wood[2]);
        SHAPES.bell(p, 7, 16, R.glass); SHAPES.bell(p, 17, 16, R.glass);
        p.outline(INK);
    });
    add("basket", 34, 28, (p) => {
        for (let y = 10; y < 26; y++) { const w = 15 - (y - 10) * 0.28; for (let x = -w; x <= w; x++) p.tone(17 + x, y, 0.55 + ((x + y * 2 | 0) % 4 === 0 ? 0.2 : 0) + ((y % 3 === 0) ? -0.2 : 0) - x * 0.008, R.wood); }
        for (let a = 3.14; a < 6.3; a += 0.05) p.set(17 + Math.cos(a) * 13, 11 + Math.sin(a) * 10, R.wood[2]);
        p.rect(2, 9, 30, 3, R.wood[3]); p.outline(INK);
    });
    add("coin", 12, 12, (p) => { p.blob(6, 6, 5, 5, ramp("#8a8ab0", "#c8c8e0", "#f0f0f8", "#ffffff"), { base: 0.55 }); p.line(4, 3, 4, 8, [90, 80, 130, 255]); p.line(7, 3, 7, 8, [90, 80, 130, 255]); p.outline(INK); });
const HEART_ROWS = [".##...##.", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."];
    const heart = (name, r) => add(name, 11, 10, (p) => { HEART_ROWS.forEach((row, y) => { for (let x = 0; x < 9; x++) if (row[x] === "#") p.tone(x + 1, y + 1, 0.82 - y * 0.08 - x * 0.03, r); }); p.outline(INK); });
    heart("heart", R.red); heart("heart0", ramp("#3a3058", "#50456e", "#6a5e88"));
    add("letter", 22, 16, (p) => { p.rect(1, 1, 20, 14, R.cream[3]); p.rect(1, 12, 20, 3, R.cream[2]); p.line(1, 1, 11, 8, R.cream[0]); p.line(21, 1, 11, 8, R.cream[0]); p.blob(11, 8, 2.4, 2.4, R.red, { base: 0.7 }); p.outline(INK); });
    add("drop", 10, 12, (p) => { for (let y = 1; y < 11; y++) { const w = y < 4 ? y * 0.7 : 3.6 * Math.sin((y - 1) / 10 * 3.14) + 0.4; p.line(5 - w, y, 5 + w, y, y % 3 ? hex("#7ac0f0") : hex("#b4e4ff")); } p.outline(INK); });
    add("hoe", 18, 18, (p) => { p.line(3, 16, 13, 4, R.wood[3]); p.line(4, 16, 14, 4, R.wood[1]); p.rect(11, 2, 6, 4, R.stone[3]); p.rect(14, 2, 3, 6, R.stone[2]); p.outline(INK); });
    add("can", 20, 18, (p) => { p.rect(7, 6, 10, 10, R.glass[1]); p.rect(8, 7, 3, 8, R.glass[2]); p.line(7, 12, 1, 6, R.glass[1]); p.rect(0, 4, 3, 3, R.glass[2]); p.line(10, 6, 14, 2, R.iron[3]); p.line(14, 2, 17, 6, R.iron[3]); p.outline(INK); });
    add("sickle", 18, 18, (p) => { for (let a = -2.4; a < 0.5; a += 0.08) { p.set(8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, R.stone[4]); p.set(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, R.stone[2]); } p.line(15, 8, 8, 16, R.wood[2]); p.outline(INK); });
    add("gear", 16, 16, (p) => { for (let k = 0; k < 8; k++) { const a = k * 0.785; p.rect(8 + Math.cos(a) * 5.5 - 1, 8 + Math.sin(a) * 5.5 - 1, 3, 3, R.stone[3]); } p.blob(8, 8, 5, 5, R.stone, { base: 0.62 }); p.blob(8, 8, 2, 2, R.iron, { base: 0.3 }); p.outline(INK); });
    add("book", 18, 18, (p) => { p.rect(2, 2, 14, 14, R.red[1]); p.rect(4, 2, 12, 12, R.red[2]); p.rect(4, 14, 12, 2, R.cream[3]); p.rect(7, 6, 6, 1, R.gold[3]); p.rect(8, 8, 4, 1, R.gold[3]); p.outline(INK); });
    add("hammer", 18, 18, (p) => { p.line(3, 16, 11, 7, R.wood[3]); p.line(4, 16, 12, 7, R.wood[1]); p.rect(9, 1, 8, 6, R.stone[2]); p.rect(9, 1, 8, 2, R.stone[3]); p.outline(INK); });
    add("potnav", 18, 18, (p) => { p.blob(9, 11, 7, 5.6, R.iron, { base: 0.52 }); p.rect(2, 5, 14, 2, R.iron[3]); p.rect(3, 6, 12, 1, hex("#ffb45a")); for (const x of [5, 12]) p.line(x, 2, x + 1, 0, [255, 255, 255, 150]); p.outline(INK); });
    add("fishnav", 18, 18, (p) => { const t = new Px(16, 16); fishShape(t, FISH_R.pondlet); p.stamp(t, 1, 1); p.outline(INK); });
    add("stallnav", 18, 18, (p) => { p.rect(2, 7, 14, 9, R.wood[2]); for (let x = 1; x < 17; x++) for (let y = 3; y < 8; y++) p.set(x, y, (x >> 1) % 2 ? R.red[2] : R.cream[3]); p.outline(INK); });
    add("farmnav", 18, 18, (p) => { const t = new Px(16, 16); SHAPES.bulb(t, 8, 8, LOOK.moonradish.ramp); p.stamp(t, 1, 2); p.leaf(9, 5, -2, 6, 1.6, R.teal); p.leaf(9, 5, -1, 6, 1.6, R.teal); p.outline(INK); });
    add("sunnav", 18, 18, (p) => { for (let k = 0; k < 8; k++) { const a = k * 0.785; p.line(9 + Math.cos(a) * 6, 9 + Math.sin(a) * 6, 9 + Math.cos(a) * 8, 9 + Math.sin(a) * 8, R.gold[3]); } p.blob(9, 9, 5, 5, R.gold, { base: 0.68 }); p.outline(INK); });
    add("moonnav", 18, 18, (p) => { p.blob(9, 9, 7, 7, R.cream, { base: 0.75 }); for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) if ((x - 12) ** 2 + (y - 7) ** 2 < 36) p.d[p.i(x, y) + 3] = 0; p.outline(INK); });
    add("logo", 214, 48, (p) => paintLogo(p));
}

// Big, hand-shaped title lettering: tall stacked pixel capitals with a moonlit gradient.
function paintLogo(p) {
    const glyph = { M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"], o: [".....", ".###.", "#...#", "#...#", "#...#", ".###.", "....."], n: [".....", "####.", "#...#", "#...#", "#...#", "#...#", "....."], p: [".....", "####.", "#...#", "#...#", "####.", "#....", "#...."], a: [".....", ".###.", "....#", ".####", "#...#", ".####", "....."], t: [".#...", ".#...", "###..", ".#...", ".#...", ".#...", "..##."], c: [".....", ".####", "#....", "#....", "#....", ".####", "....."], h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "....."] };
    const word = "Moonpatch", s = 5, r = ramp("#9a7ac8", "#c8b0e8", "#f4e8d0", "#fff6c8", "#ffffff");
    const t = new Px(214, 48);
    let x = 2;
    for (const c of word) {
        const g = glyph[c];
        g.forEach((row, j) => { for (let i = 0; i < 5; i++) if (row[i] === "#") for (let a = 0; a < s - 1; a++) for (let b = 0; b < s; b++) t.tone(x + i * (s - 1) + a, 3 + j * s + b, 1 - (j * s + b) / (s * 8), r); });
        x += (c === "t" ? 4 : 5) * (s - 1) + 3;
    }
    t.outline(hex("#2e1d4a")); t.outline(hex("#2e1d4a"));
    p.stamp(t);
}

/** Painted scenes go in one big reusable texture, sized to the view. Each returns nothing; `p` is 512x512 art pixels and the view is w,h art pixels. */
const SEASON_GROUND = [
    ramp("#2c5a48", "#3f7a50", "#5f9a58", "#8cba62", "#bcd878"),
    ramp("#2a5240", "#3e7446", "#649048", "#98ac50", "#cec864"),
    ramp("#3a4a3a", "#5e6a3c", "#8e8040", "#bc9e48", "#e0c468"),
    ramp("#6a7aa8", "#94a8c8", "#bcd0e0", "#dce8f0", "#ffffff"),
];
const FOLIAGE = [ramp("#1e3a3a", "#2c5a48", "#4a8256", "#88b860", "#c8e080"), ramp("#1e3a30", "#28563e", "#3c7a44", "#6a9e48", "#a8c458"), ramp("#4a1a30", "#8a3a30", "#c86a30", "#e8a040", "#f8d868"), ramp("#3a4a6a", "#5a7090", "#8aa4c0", "#c0d4e4", "#f4fbff")];

function clear(p) { p.d.fill(0); }
function trees(p, n, y0, w, season, spread = 1, k2 = 1) {
    const f = FOLIAGE[season];
    for (let k = 0; k < w / (22 / spread); k++) {
        const x = k * 22 / spread + n.rand(k, 4) * 14 - 6, h = (10 + n.rand(k, 8) * 14) * k2;
        p.rect(x - 1, y0 - 3, 3, 6, R.bark[1]);
        p.blob(x, y0 - h * 0.7, 7 + h * 0.42, h, f, { base: 0.42, gain: 1.1 });
        p.blob(x - 3, y0 - h * 1.05, 5 + h * 0.2, h * 0.5, f, { base: 0.6 });
    }
}
function hills(p, n, w, h, horizon, season, lake) {
    const far = ramp("#2c2a54", "#3e3a68", "#5a4f7a", "#7a688c"), mid = season === 3 ? ramp("#5a6a98", "#7a90b0", "#a4bcd0", "#d0e0ec") : SEASON_GROUND[season];
    for (let x = 0; x < w; x++) {
        const a = horizon - 12 - n.fbm(x * 0.014, 3) * 30;
        for (let y = a; y < horizon; y++) p.tone(x, y, 0.2 + (n.fbm(x * 0.05, y * 0.07) - 0.5) + (y - a) * 0.004, far);
        const b = horizon - 2 - n.fbm(x * 0.02, 9) * 14;
        for (let y = b; y < horizon + 4; y++) p.tone(x, y, 0.32 + (n.fbm(x * 0.09, y * 0.12) - 0.5) * 1.1, mid);
    }
}
export function paintFarm(p, w, h, season, L) {
    clear(p);
    const treeK = h > w ? 1 : 0.55;
    const n = noiser(11 + season), g = SEASON_GROUND[season], horizon = Math.round(L.horizon / 2);
    hills(p, n, w, h, horizon, season);
    for (let y = horizon; y < h; y++) for (let x = 0; x < w; x++) {
        const v = n.fbm(x * 0.05, y * 0.075), dab = n.fbm(x * 0.21 + 40, y * 0.3);
        p.tone(x, y, 0.46 + (v - 0.5) * 0.95 + (dab - 0.5) * 0.5 + (y - horizon) / h * 0.14, g);
    }
    // darker worn ground around the field
    const fx = L.farmX / 2, fy = L.farmY / 2, fs = 168;
    for (let y = fy - 6; y < fy + fs + 6; y++) for (let x = fx - 6; x < fx + fs + 6; x++) {
        const dx = Math.max(0, Math.abs(x - fx - fs / 2) - fs / 2), dy = Math.max(0, Math.abs(y - fy - fs / 2) - fs / 2), o = dx + dy;
        if (o < 6) p.tone(x, y, 0.2 + o * 0.03 + (n.fbm(x * 0.2, y * 0.2) - 0.5) * 0.5, season === 3 ? R.snow : g);
    }
    trees(p, n, horizon + 2, w + 30, season, 1, treeK);
    // flecks of paint: flowers, stones, snow-tufts
    const fleck = [[hex("#f4c0dc"), hex("#ffe8a0")], [hex("#ffd860"), hex("#e0f090")], [hex("#e87040"), hex("#f8d868")], [hex("#ffffff"), hex("#dcecff")]][season];
    for (let k = 0; k < (w * h) / 500; k++) {
        const x = n.rand(k, 1) * w | 0, y = horizon + 6 + n.rand(2, k) * (h - horizon) | 0;
        if (x > fx - 8 && x < fx + fs + 8 && y > fy - 8 && y < fy + fs + 8) continue;
        const c = fleck[k % 2]; p.set(x, y, c); p.set(x + 1, y, c); p.set(x, y + 1, darken(c, 0.3));
    }
    // fence posts along the back of the field
    for (let x = fx - 8; x < fx + fs + 8; x += 24) { p.rect(x, fy - 15, 3, 13, R.wood[2]); p.rect(x, fy - 15, 1, 13, R.wood[3]); p.set(x + 1, fy - 16, INK); p.rect(x, fy - 2, 3, 2, [0, 0, 0, 60]); }
    for (let x = fx - 8; x < fx + fs + 8; x++) { p.set(x, fy - 12, R.wood[3]); p.set(x, fy - 11, R.wood[1]); p.set(x, fy - 7, R.wood[3]); p.set(x, fy - 6, R.wood[1]); }
}
export function paintMarket(p, w, h, season, L) {
    clear(p);
    const n = noiser(23 + season), g = SEASON_GROUND[season], horizon = Math.round(h * 0.42), f = FOLIAGE[season];
    hills(p, n, w, h, horizon, season);
    // little crooked street of Lull: warm houses
    const hues = [ramp("#a06a58", "#d09a70", "#ecc690", "#f8e4b8"), ramp("#6a7a8a", "#8aa8b0", "#b4d0c8", "#dcece0"), ramp("#a0606a", "#d08a88", "#f0b8a0", "#fbdcc0")];
    for (let k = 0; k < 8; k++) {
        const bw = 42 + n.rand(k, 3) * 18, x = k * 62 - 30 + n.rand(4, k) * 10, bh = 40 + n.rand(k, 5) * 24, base = horizon + 22, r = hues[k % 3];
        for (let y = base - bh; y < base; y++) for (let i = 0; i < bw; i++) p.tone(x + i, y, 0.6 - i / bw * 0.3 + (n.fbm(i * 0.3, y * 0.3) - 0.5) * 0.3, r);
        for (let y = 0; y < 18; y++) { const hw = bw / 2 + 4 - (18 - y) * (bw / 2 + 4) / 19; for (let i = -hw; i <= hw; i++) p.tone(x + bw / 2 + i, base - bh - 18 + y, 0.5 - i / (hw + 1) * 0.2 + (y % 3 === 0 ? -0.16 : 0), season === 3 ? R.snow : ramp("#3a2a44", "#6a3a44", "#9a5a4a", "#c4865a")); }
        for (let i = 0; i < 2; i++) { const wx = x + 8 + i * (bw / 2.2), wy = base - bh + 8; p.rect(wx, wy, 9, 11, R.bark[1]); p.rect(wx + 1, wy + 1, 7, 9, ramp("#3a4a7a", "#5a7ab0")[1]); p.rect(wx + 4, wy + 1, 1, 9, R.bark[1]); }
        p.rect(x + bw / 2 - 5, base - 15, 10, 15, R.wood[1]); p.rect(x + bw / 2 - 4, base - 14, 8, 14, R.wood[2]);
    }
    trees(p, n, horizon + 26, w + 30, season, 0.42);
    const stone = season === 3 ? R.snow : ramp("#6a5a70", "#8a7a84", "#a89a94", "#c8b8a4", "#e4d6b8");
    for (let y = horizon + 20; y < h; y++) {
        const rowH = 8, row = Math.floor((y - horizon) / rowH), fy = (y - horizon) % rowH;
        for (let x = 0; x < w; x++) {
            const cw = 15, off = (row % 2) * 7, cx = Math.floor((x + off) / cw), fx = (x + off) % cw, hsh = n.rand(cx, row);
            const ex = Math.min(fx, cw - 1 - fx), ey = Math.min(fy, rowH - 1 - fy), corner = ex + ey < 2;
            const lit = 0.46 + (hsh - 0.5) * 0.34 + (fy < 2 ? 0.12 : 0) - (fy > 5 ? 0.12 : 0) + (n.fbm(x * 0.03, y * 0.05) - 0.5) * 0.45;
            p.tone(x, y, corner || ex === 0 || ey === 0 ? lit - 0.3 : lit, stone, 0.5);
        }
    }
}
export function paintPond(p, w, h, season, L) {
    clear(p);
    const n = noiser(37 + season), horizon = L.shoreTop, f = FOLIAGE[season];
    hills(p, n, w, h, horizon, season);
    trees(p, n, horizon + 2, w + 30, season, 0.5);
    // the lake is drawn live; this paints only the near bank at the bottom
    const bank = L.bankY;
    for (let y = bank; y < h; y++) for (let x = 0; x < w; x++) {
        const e = bank + 4 + Math.sin(x * 0.04) * 3 + n.fbm(x * 0.1, 1) * 5;
        if (y < e) continue;
        p.tone(x, y, 0.32 + (n.fbm(x * 0.06, y * 0.09) - 0.5) + (n.fbm(x * 0.25, y * 0.3) - 0.5) * 0.5, SEASON_GROUND[season]);
    }
    for (let x = 0; x < w; x += 3) { const e = bank + 2 + Math.sin(x * 0.04) * 3; if (x % 7 === 0) p.leaf(x, e + 6, -1.57 + (n.rand(x, 2) - 0.5) * 0.7, 12 + n.rand(2, x) * 10, 1.3, f); }
}
export function paintKitchen(p, w, h) {
    clear(p);
    const n = noiser(53), wall = ramp("#2a1830", "#452838", "#6a3e40", "#8e5a4a", "#b07c5c");
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const bx = x + (Math.floor(y / 8) % 2) * 9, mort = y % 8 === 0 || bx % 18 === 0;
        p.tone(x, y, (mort ? 0.08 : 0.34) + (n.fbm(x * 0.09, y * 0.1) - 0.5) * 0.7 + (n.rand(bx / 18 | 0, y / 8 | 0) - 0.5) * 0.18 - Math.abs(x / w - 0.5) * 0.3, wall);
    }
    const floor = Math.round(h * 0.72);
    for (let y = floor; y < h; y++) for (let x = 0; x < w; x++) p.tone(x, y, 0.3 + ((y - floor) % 12 === 0 ? -0.24 : 0) + (n.fbm(x * 0.05, y * 0.3) - 0.5) * 0.7, R.wood);
    // shelf and hanging herbs
    const sy = Math.round(h * 0.16);
    p.rect(8, sy, w - 16, 3, R.wood[3]); p.rect(8, sy + 3, w - 16, 2, R.bark[0]);
    for (let k = 0; k < w / 26; k++) {
        const x = 16 + k * 26;
        if (k % 3 === 0) { p.blob(x, sy - 8, 6, 8, R.glass); p.rect(x - 3, sy - 17, 6, 2, R.wood[3]); }
        else if (k % 3 === 1) { p.blob(x, sy - 6, 7, 6, R.cream, { base: 0.5 }); }
        else { p.rect(x - 1, sy + 5, 1, 6, R.bark[3]); for (let i = 0; i < 5; i++) p.leaf(x, sy + 10, 1.57 + (i - 2) * 0.32, 13, 1.7, R.moss); }
    }
}

/** Sky strips: tall dithered gradients, crossfaded by time of day. */
export function paintSky(p, stops) {
    const r = ramp(...stops);
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) p.tone(x, y, y / (p.h - 1), r, 0.8);
}
export const SKY = {
    night: ["#0e0a2a", "#171243", "#241a5c", "#382772", "#553a86", "#7a5396"],
    dusk: ["#2a1a5c", "#5a2f7c", "#a04a80", "#e07a72", "#f8b878"],
    dawn: ["#3a3a8a", "#7a60ac", "#e08ca0", "#f8c090", "#ffe8a8"],
    day: ["#6ab0dc", "#8cc8e4", "#b4dcea", "#d8ecec", "#f4f4dc"],
};
export { R, LOOK, SHAPES, lighten, darken, hueRamp };
