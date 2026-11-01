// The sticker sheet: 66 pets in three forms, plus tokens. One texture, so a whole battle is a single draw call.
import { PETS, TOKENS, TRAITS } from "./data.js";
import { Cel, INK, add, box, cut, curve, disc, oval, poly, seg, smooth, turn } from "./paint.js";
import { PET_ART, TOKEN_ART, kit } from "./art-pets.js";

export const CELL = 136, SHEET = 2040, PER = 15;
export const petFrame = {};
PETS.forEach((p, i) => { petFrame[p.id] = i * 3; });
Object.keys(TOKENS).forEach((id, i) => { petFrame[id] = PETS.length * 3 + i; });
/** Hero forms paint after the title is up; until then a pet shows its first form. */
export const sheet = { full: false };
export const frameOf = (id, star = 1) => petFrame[id] + (TOKENS[id] || !sheet.full ? 0 : star - 1);

const form = (c, draw, star, cape) => {
    const k = kit(c);
    if (star >= 2) { // Stronger forms grow a hero cape behind the pet...
        const probe = kit({ fill() { return this; }, flat() { return this; } }); try { draw(probe); } catch { /* the probe only reads k.top */ }
        k.cape(cape, 50, 56, 1.02);
    }
    draw(k);
    if (star === 2) k.sparkle(14, 16, 6).sparkle(87, 84, 5);
    if (star === 3) { k.crown(k.top[0], Math.max(16, k.top[1] + 4), 0.86); k.sparkle(12, 20, 7).sparkle(90, 20, 6).sparkle(10, 84, 5).sparkle(90, 84, 6); }
};
/** In a browser this yields between pets so the loading line keeps moving on slow phones. */
export function paintPets(game) {
    game.assets.paint("pets", SHEET, SHEET, () => {}, { smooth: true, mipmaps: true });
    game.assets.grid("pets", PER, PER);
    const a = game.assets.sprite("pets"), p = { data: a.data, width: SHEET, stride: SHEET };
    const cel = (n) => new Cel(p, (n % PER) * CELL, Math.floor(n / PER) * CELL, CELL, CELL, CELL / 118);
    const rim = ["#ffffff", "#ffffff", "#c9f4ff", "#ffe27a"];
    const one = (d, star) => { const c = cel(petFrame[d.id] + star - 1); form(shift(c), PET_ART[d.id], star, TRAITS[d.traits[0]].color); c.sticker(3.2, rim[star]); };
    const tokens = () => { for (const id in TOKENS) { const c = cel(petFrame[id]); TOKEN_ART[id](kit(shift(c))); c.sticker(2.6, "#ffffff"); } };
    const all = (star) => PETS.forEach((d) => one(d, star));
    const tools = typeof location !== "undefined" && /[?&]paused/.test(location.search);
    if (typeof document === "undefined" || game.headless) { all(1); all(2); all(3); tokens(); sheet.full = true; return null; }
    return (async () => {
        const line = document.getElementById("load");
        let t0 = performance.now();
        const breathe = async (budget, note) => { if (performance.now() - t0 > budget) { if (note && line) line.textContent = note; await new Promise((r) => setTimeout(r, 0)); t0 = performance.now(); } };
        for (let i = 0; i < PETS.length; i++) { one(PETS[i], 1); await breathe(30, `FEEDING THE PETS ${Math.round((i / PETS.length) * 100)}%`); }
        tokens(); game.assets.refresh("pets");
        const rest = async () => {
            for (const star of [2, 3]) for (const d of PETS) { one(d, star); await breathe(6); }
            game.assets.refresh("pets"); sheet.full = true;
        };
        if (tools) await rest(); else rest();
    })();
}
/** Art is drawn on a 100 stage; cells are 104, so centre it. */
const shift = (c) => { const o = 9, wrap = (f) => { const g = (x, y) => f(x - o, y - o); g.b = [f.b[0] + o, f.b[1] + o, f.b[2] + o, f.b[3] + o]; return g; }; return { fill: (f, col, opt) => (c.fill(wrap(f), col, opt), c), flat: (f, col, a) => (c.flat(wrap(f), col, a), c) }; };

// ---- Icons, digits and logo ----------------------------------------------------------------------------------------------
export const UI = { plus: 10, minus: 11, coin: 12, heart: 13, heartgone: 14, trophy: 15, trophygone: 16, star: 17, lock: 18, atk: 19, roll: 20, crate: 21, bin: 22, gear: 23, play: 24, replay: 25, fast: 26, treat: 27, back: 28, check: 29, sound: 42, mute: 43, buzz: 44, shield: 45, curse: 46, soak: 47, stun: 48, book: 49, paw: 50, music: 51, hold: 52, pen: 53, hand: 54 };
Object.keys(TRAITS).forEach((t, i) => { UI[t] = 30 + i; });
const DIG = [
    Array.from({ length: 21 }, (_, i) => [5 + Math.cos(i * 0.3142) * 2.5, 5 + Math.sin(i * 0.3142) * 3.2]), [[3.4, 3.4], [5.4, 2], [5.4, 8]], [[2.6, 3.4], [5, 2], [7.4, 3.4], [2.6, 8], [7.6, 8]], [[2.8, 2.4], [7, 2.4], [4.6, 4.8], [7.4, 6], [5, 8.2], [2.6, 7.2]],
    [[6.4, 8], [6.4, 2], [2.4, 6.2], [7.8, 6.2]], [[7.2, 2], [3.2, 2], [2.8, 4.6], [6, 4.4], [7.6, 6.2], [5, 8.2], [2.6, 7.4]], [[6.6, 2], [4, 3.2], [2.8, 5.6], [3.2, 7.4], [5, 8.2], [6.9, 7.2], [6.9, 5.8], [5.2, 4.9], [3.2, 5.6]], [[2.6, 2.2], [7.6, 2.2], [4, 8.2]],
    [[5, 5], [3, 3.4], [5, 2], [7, 3.4], [5, 5], [2.8, 6.6], [5, 8.2], [7.2, 6.6], [5, 5]], [[3.4, 8], [6, 6.8], [7.1, 4.4], [6.8, 2.8], [5, 1.8], [3.1, 2.8], [3.1, 4.2], [4.8, 5.1], [7.1, 4.4]],
];
const LOGO = {
    P: [[[1, 9], [1, 1]], [[1, 1], [5, 1], [6.4, 3], [5, 5], [1, 5]]], E: [[[6, 1], [1, 1], [1, 9], [6, 9]], [[1, 5], [5, 5]]], T: [[[0.4, 1], [7, 1]], [[3.7, 1], [3.7, 9]]], S: [[[6.2, 2], [4, 1], [1.4, 2], [1.4, 4], [5.6, 6], [5.6, 8], [3, 9], [0.8, 8]]],
    H: [[[1, 1], [1, 9]], [[6, 1], [6, 9]], [[1, 5], [6, 5]]], O: [[[3.6, 1], [6.2, 3], [6.2, 7], [3.6, 9], [1, 7], [1, 3], [3.6, 1]]], B: [[[1, 9], [1, 1], [4.6, 1], [5.8, 3], [4.4, 5], [1, 5]], [[4.4, 5], [6.2, 7], [4.8, 9], [1, 9]]],
    R: [[[1, 9], [1, 1], [5, 1], [6.2, 3], [5, 5], [1, 5]], [[3.6, 5], [6.4, 9]]], A: [[[0.6, 9], [3.6, 1], [6.6, 9]], [[2, 6.2], [5.2, 6.2]]], W: [[[0.4, 1], [2.4, 9], [4.4, 3.4], [6.4, 9], [8.4, 1]]], L: [[[1, 1], [1, 9], [6, 9]]],
};
export function paintUI(game) {
    game.assets.paint("ui", 720, 432, (p) => {
        const cel = (n) => new Cel(p, (n % 10) * 72, Math.floor(n / 10) * 72, 72, 72, 0.72);
        const stroke = (c, pts, r, col, o) => c.fill(curve(pts.map(([x, y]) => [x * 10, y * 10]), r), col, o);
        for (let n = 0; n <= 9; n++) { const c = cel(n); stroke(c, DIG[n], 9.5, "#ffffff", { ink: 6, shade: 0, gloss: 0 }); }
        { const c = cel(UI.plus); c.fill(add(seg(50, 22, 50, 78, 9), seg(22, 50, 78, 50, 9)), "#fff", { ink: 6, shade: 0, gloss: 0 }); }
        { const c = cel(UI.minus); c.fill(seg(22, 50, 78, 50, 9), "#fff", { ink: 6, shade: 0, gloss: 0 }); }
        { const c = cel(UI.coin); c.fill(disc(50, 50, 40), "#ffd23f", { bottom: "#ff9f1c", ink: 7, gloss: 0.8 }); c.fill(cut(disc(50, 50, 28), disc(50, 50, 22)), "#e88a12", { ink: 0, shade: 0, gloss: 0 }); pawInto(c, 50, 52, 1.05, "#e88a12"); }
        const heart = (x, y, s) => smoothHeart(x, y, s);
        { const c = cel(UI.heart); c.fill(heart(50, 54, 1), "#ff5f8f", { bottom: "#e0245e", ink: 7, gloss: 0.8 }); }
        { const c = cel(UI.heartgone); c.fill(heart(50, 54, 1), "#b9a9cc", { bottom: "#8f7daa", ink: 7 }); c.fill(curve([[50, 22], [40, 40], [58, 52], [44, 72]], 3.4), "#3a1d5c", { ink: 0, shade: 0, gloss: 0 }); }
        const cup = (c, col, bot) => { c.fill(add(box(50, 84, 44, 11, 3), box(50, 70, 11, 18)), bot, { ink: 6 }); c.fill(cut(add(disc(20, 34, 14), disc(80, 34, 14)), add(disc(20, 34, 7), disc(80, 34, 7))), col, { ink: 6 }); c.fill(poly([[24, 12], [76, 12], [72, 42], [60, 60], [40, 60], [28, 42]], 3), col, { bottom: bot, ink: 7, gloss: 0.8 }); };
        cup(cel(UI.trophy), "#ffd23f", "#ff9f1c"); cup(cel(UI.trophygone), "#cbbfe0", "#a595c4");
        const star = (x, y, r) => { const pts = []; for (let i = 0; i < 10; i++) { const a = -1.5708 + (i * 3.14159) / 5, q = i % 2 ? r * 0.5 : r; pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); } return poly(pts, 4); };
        cel(UI.star).fill(star(50, 52, 42), "#ffe14a", { bottom: "#ffae1c", ink: 7, gloss: 0.8 });
        { const c = cel(UI.lock); c.fill(cut(box(50, 34, 44, 50, 22), box(50, 36, 22, 34, 10)), "#c9d3e6", { ink: 6 }); c.fill(box(50, 66, 66, 48, 10), "#ffb73d", { bottom: "#f28a1e", ink: 7 }); c.flat(disc(50, 62, 6), "#3a1d5c"); }
        { const c = cel(UI.atk); c.fill(turn(add(box(50, 34, 16, 58, 5), poly([[42, 6], [50, -4], [58, 6]])), 50, 50, 0.7), "#e6edf8", { ink: 6 }); c.fill(turn(add(box(50, 66, 42, 10, 4), box(50, 82, 11, 22, 3)), 50, 50, 0.7), "#ff8a3d", { ink: 6 }); }
        { const c = cel(UI.roll); const arc = (a0, a1, r) => { const pts = []; for (let i = 0; i <= 8; i++) { const a = a0 + ((a1 - a0) * i) / 8; pts.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]); } return pts; }; c.fill(curve(arc(3.6, 6.1, 30), 7), "#fff", { ink: 6, shade: 0 }); c.fill(curve(arc(0.5, 3, 30), 7), "#fff", { ink: 6, shade: 0 }); c.fill(poly([[92, 42], [68, 50], [78, 24]], 2), "#fff", { ink: 6, shade: 0 }); c.fill(poly([[8, 58], [32, 50], [22, 76]], 2), "#fff", { ink: 6, shade: 0 }); }
        { const c = cel(UI.crate); c.fill(box(50, 54, 74, 66, 6), "#d99a56", { bottom: "#b0713a", ink: 6 }); for (const y of [36, 72]) c.fill(box(50, y, 74, 4, 1), "#8a5a2b", { ink: 0, shade: 0, gloss: 0 }); c.fill(box(50, 54, 34, 26, 5), "#3a1d5c", { ink: 3, shade: 0, gloss: 0 }); c.flat(disc(42, 52, 4), "#ffe14a"); c.flat(disc(58, 52, 4), "#ffe14a"); }
        { const c = cel(UI.bin); c.fill(poly([[22, 32], [78, 32], [70, 92], [30, 92]], 3), "#ff7e7e", { bottom: "#d94c6a", ink: 6 }); c.fill(box(50, 24, 74, 11, 4), "#ff9f9f", { ink: 6 }); c.fill(box(50, 13, 26, 8, 3), "#ff9f9f", { ink: 5 }); for (const x of [40, 60]) c.fill(box(x, 62, 6, 34, 3), "#b53a59", { ink: 0, shade: 0, gloss: 0 }); }
        { const c = cel(UI.gear); const t = []; for (let i = 0; i < 8; i++) { const a = i * 0.785; t.push(box(50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34, 16, 16, 3)); } c.fill(cut(add(disc(50, 50, 32), ...t.map((b, i) => turn(b, 50 + Math.cos(i * 0.785) * 34, 50 + Math.sin(i * 0.785) * 34, i * 0.785))), disc(50, 50, 13)), "#fff", { ink: 6, shade: 0.18 }); }
        cel(UI.play).fill(poly([[28, 16], [84, 50], [28, 84]], 6), "#fff", { ink: 6, shade: 0 });
        { const c = cel(UI.replay); const pts = []; for (let i = 0; i <= 12; i++) { const a = -0.6 + (i * 5) / 12; pts.push([50 + Math.cos(a) * 32, 52 + Math.sin(a) * 32]); } c.fill(curve(pts, 7), "#fff", { ink: 6, shade: 0 }); c.fill(poly([[90, 12], [90, 44], [60, 28]], 2), "#fff", { ink: 6, shade: 0 }); }
        { const c = cel(UI.fast); c.fill(poly([[12, 22], [50, 50], [12, 78]], 4), "#fff", { ink: 6, shade: 0 }); c.fill(poly([[50, 22], [88, 50], [50, 78]], 4), "#fff", { ink: 6, shade: 0 }); }
        { const c = cel(UI.treat); c.fill(turn(smooth(6, disc(24, 40, 15), disc(24, 62, 15), box(50, 51, 56, 22, 6), disc(76, 40, 15), disc(76, 62, 15)), 50, 50, -0.5), "#ffe2b0", { bottom: "#eeb76e", ink: 7 }); }
        cel(UI.back).fill(add(seg(62, 18, 30, 50, 9), seg(30, 50, 62, 82, 9)), "#fff", { ink: 6, shade: 0 });
        cel(UI.check).fill(add(seg(18, 54, 42, 78, 9), seg(42, 78, 84, 22, 9)), "#fff", { ink: 6, shade: 0 });
        Object.keys(TRAITS).forEach((t) => { const c = cel(UI[t]); c.fill(disc(50, 50, 44), TRAITS[t].color, { ink: 6, gloss: 0.5, shade: 0.2 }); traitGlyph(c, t); });
        cel(UI.sound).fill(poly([[16, 38], [34, 38], [58, 16], [58, 84], [34, 62], [16, 62]], 3), "#fff", { ink: 6, shade: 0 }); { const c = cel(UI.sound); const pts = []; for (let i = 0; i <= 6; i++) { const a = -0.9 + (i * 1.8) / 6; pts.push([50 + Math.cos(a) * 36, 50 + Math.sin(a) * 36]); } c.fill(curve(pts, 4.5), "#fff", { ink: 5, shade: 0 }); }
        { const c = cel(UI.mute); c.fill(poly([[16, 38], [34, 38], [58, 16], [58, 84], [34, 62], [16, 62]], 3), "#fff", { ink: 6, shade: 0 }); c.fill(add(seg(66, 36, 90, 64, 5), seg(90, 36, 66, 64, 5)), "#ff5f8f", { ink: 5, shade: 0 }); }
        { const c = cel(UI.buzz); c.fill(box(50, 50, 40, 70, 9), "#fff", { ink: 6, shade: 0 }); c.fill(box(50, 46, 28, 44, 3), "#7bd6ff", { ink: 3, shade: 0, gloss: 0 }); for (const s of [-1, 1]) c.fill(curve([[50 + s * 34, 28], [50 + s * 42, 40], [50 + s * 34, 52], [50 + s * 42, 64]], 3.2), "#fff", { ink: 4, shade: 0 }); }
        cel(UI.shield).fill(poly([[50, 8], [86, 20], [80, 62], [50, 92], [20, 62], [14, 20]], 3), "#7bd6ff", { bottom: "#2f8fe0", ink: 7, gloss: 0.8 });
        { const c = cel(UI.curse); c.fill(disc(50, 44, 36), "#5dfca1", { bottom: "#27b56a", ink: 7 }); c.fill(box(50, 78, 34, 22, 5), "#27b56a", { ink: 6 }); c.flat(disc(36, 42, 9), "#1f3a2a"); c.flat(disc(64, 42, 9), "#1f3a2a"); }
        cel(UI.soak).fill(smooth(10, disc(50, 62, 30), poly([[50, 6], [34, 46], [66, 46]])), "#6fd3ff", { bottom: "#2f8fe0", ink: 7, gloss: 0.9 });
        { const c = cel(UI.stun); const s = star(50, 50, 40); c.fill(s, "#fff27a", { ink: 7 }); c.fill(add(seg(38, 42, 44, 48, 3), seg(44, 42, 38, 48, 3), seg(56, 42, 62, 48, 3), seg(62, 42, 56, 48, 3)), "#3a1d5c", { ink: 0, shade: 0, gloss: 0 }); }
        { const c = cel(UI.book); c.fill(box(50, 52, 72, 80, 8), "#ff7eb6", { bottom: "#e84f92", ink: 6 }); c.fill(box(54, 52, 50, 62, 5), "#fff4d6", { ink: 3 }); c.flat(disc(54, 44, 12), "#ffb73d"); c.flat(box(54, 68, 30, 5, 2), "#a5917a"); }
        { const c = cel(UI.paw); pawInto(c, 50, 54, 2.2, "#ffffff", true); }
        { const c = cel(UI.music); c.fill(add(oval(30, 76, 14, 11), oval(72, 66, 14, 11), box(42, 44, 7, 62), box(84, 34, 7, 62), poly([[40, 10], [88, 2], [88, 22], [40, 30]])), "#fff", { ink: 6, shade: 0 }); }
        { const c = cel(UI.hold); c.fill(poly([[40, 8], [60, 8], [56, 46], [76, 62], [24, 62], [44, 46]], 3), "#46d6ff", { ink: 6 }); c.fill(seg(50, 62, 50, 92, 4), "#c9d3e6", { ink: 4, shade: 0 }); }
        { const c = cel(UI.pen); c.fill(box(50, 56, 80, 56, 8), "#ffe2b0", { ink: 6 }); for (const x of [26, 50, 74]) c.fill(box(x, 40, 8, 66, 3), "#d99a56", { ink: 4 }); }
        { const c = cel(UI.hand); c.fill(smooth(5, box(40, 34, 15, 54, 7.5), box(58, 62, 44, 50, 16), box(34, 70, 14, 34, 7)), "#fff0dd", { bottom: "#ffd9b5", ink: 6, shade: 0.15 }); }
    }, { smooth: true, mipmaps: true });
    game.assets.grid("ui", 10, 6);
    game.assets.paint("logo", 560, 320, (p) => {
        const c = new Cel(p, 0, 0, 560, 320, 1);
        const word = (w, x0, y0, s, top, bot, tilt) => { let x = x0; [...w].forEach((ch, i) => { const strokes = LOGO[ch], wd = ch === "W" ? 9 : ch === "T" ? 7.6 : 7.4, yy = y0 + (i % 2 ? -5 : 4), rr = tilt * (i - w.length / 2); if (ch !== " ") { const parts = strokes.map((st) => curve(st.map(([a, b]) => [x + a * s, yy + b * s]), s * 1.05)), sh = turn(add(...parts), x + 3 * s, yy + 5 * s, rr); c.fill(sh, top, { bottom: bot, ink: s * 0.62, gloss: 0.8, shade: 0.34, off: s * 0.26 }); } x += (ch === " " ? 3.6 : wd) * s; }); };
        word("PET SHOP", 36, 22, 9.2, "#fff27a", "#ffae1c", 0.012);
        word("BRAWL", 34, 136, 12.9, "#ff8fc0", "#e8308a", 0.016);
        c.sticker(9, "#ffffff");
    }, { smooth: true });
}
function smoothHeart(x, y, s) { return smooth(10 * s, disc(x - 19 * s, y - 14 * s, 22 * s), disc(x + 19 * s, y - 14 * s, 22 * s), poly([[x - 36 * s, y - 2 * s], [x + 36 * s, y - 2 * s], [x, y + 36 * s]], 3)); }
function pawInto(c, x, y, s, col, ink) { const o = ink ? { ink: 6, shade: 0, gloss: 0 } : { ink: 0, shade: 0, gloss: 0 }; c.fill(oval(x, y + 5 * s, 11 * s, 9 * s), col, o); for (const [a, b] of [[-11, -5], [-4, -12], [4, -12], [11, -5]]) c.fill(oval(x + a * s, y + b * s, 3.8 * s, 5 * s), col, o); }
function traitGlyph(c, t) {
    const w = "#ffffff", o = { ink: 3, shade: 0.1, gloss: 0 };
    switch (t) {
        case "suit": c.fill(poly([[42, 18], [58, 18], [54, 32], [64, 68], [50, 84], [36, 68], [46, 32]], 2), w, o); break;
        case "goth": c.fill(cut(smoothHeart(50, 54, 0.72), curve([[50, 22], [42, 38], [56, 50], [46, 70]], 2.2)), "#1f1433", { ink: 3, shade: 0, gloss: 0, inkColor: "#fff" }); break;
        case "chef": c.fill(add(disc(34, 42, 15), disc(66, 42, 15), disc(50, 34, 18), box(50, 62, 42, 26, 4)), w, o); break;
        case "band": c.fill(add(oval(38, 70, 12, 9), box(47, 42, 6, 56), poly([[44, 16], [74, 26], [74, 42], [44, 32]])), w, o); break;
        case "hex": c.fill(oval(50, 50, 32, 21), w, o); c.flat(disc(50, 50, 14), "#1f6b42"); c.flat(disc(50, 50, 6), "#c9ffdf"); break;
        case "beef": c.fill(add(box(50, 50, 40, 12, 3), box(24, 50, 12, 44, 3), box(76, 50, 12, 44, 3), box(12, 50, 8, 24, 3), box(88, 50, 8, 24, 3)), w, o); break;
        case "grem": c.fill(turn(add(box(50, 58, 13, 52, 5), cut(disc(50, 24, 19), box(50, 12, 13, 26))), 50, 50, 0.65), w, o); break;
        case "diva": { const pts = []; for (let i = 0; i < 10; i++) { const a = -1.5708 + (i * 3.14159) / 5, q = i % 2 ? 15 : 33; pts.push([50 + Math.cos(a) * q, 52 + Math.sin(a) * q]); } c.fill(poly(pts, 3), w, o); break; }
        case "tiny": for (const [x, y, r] of [[34, 62, 13], [64, 62, 13], [49, 34, 13]]) { c.fill(disc(x, y, r), w, o); c.flat(disc(x - 3, y - 1, 2), "#3a1d5c"); c.flat(disc(x + 4, y - 1, 2), "#3a1d5c"); } break;
        case "wet": c.fill(smooth(8, disc(50, 60, 22), poly([[50, 16], [38, 46], [62, 46]])), w, o); break;
        case "fluff": c.fill(add(disc(34, 56, 15), disc(50, 44, 19), disc(68, 56, 14), box(50, 64, 50, 15, 7)), w, o); break;
        case "zap": c.fill(poly([[58, 12], [28, 56], [47, 56], [38, 88], [72, 42], [52, 42]], 2), w, o); break;
    }
}
const painted = new Set();
/** Wallpaper and floor for one shop, painted directly into bytes. portrait true/false picks the crop. */
export function paintBackdrop(game, name, w, h, wallHex, floorHex, accent) {
    if (painted.has(name)) return;
    painted.add(name);
    const hexv = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)], W = hexv(wallHex), F = hexv(floorHex), A = hexv(accent);
    game.assets.paint(name, w, h, (p) => {
        const d = p.data, horizon = h * 0.62, cs = Math.round(w / 9.5);
        for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
            let r, g, b;
            if (y < horizon) {
                const band = ((x + 0) / (w / 9)) | 0, sx = (x % (w / 4.5)) / (w / 4.5), stripe = band % 2 === 0, t = y / horizon;
                r = W[0]; g = W[1]; b = W[2];
                if (stripe) { r += (255 - r) * 0.42; g += (255 - g) * 0.42; b += (255 - b) * 0.42; }
                const gx = (x % 48) - 24, gy = ((y + (band % 2) * 24) % 48) - 24, dot = gx * gx + gy * gy < 26;
                if (dot && sx >= 0) { r += (A[0] - r) * 0.18; g += (A[1] - g) * 0.18; b += (A[2] - b) * 0.18; }
                const sh = 1 - t * 0.06; r *= sh; g *= sh; b *= sh;
                if (y > horizon - 30) { r = 255; g = 250; b = 244; if (y > horizon - 8) { r = A[0] * 0.8; g = A[1] * 0.8; b = A[2] * 0.8; } }
            } else {
                const f = (y - horizon) / (h - horizon), scale = 1 + f * 0.8, cx = (x - w / 2) / scale, cz = Math.log(1 + f * 2.2) * 150, chk = (Math.floor(cx / cs + 100) + Math.floor(cz / 34)) % 2 === 0;
                r = F[0]; g = F[1]; b = F[2];
                if (chk) { r += (255 - r) * 0.5; g += (255 - g) * 0.5; b += (255 - b) * 0.5; }
                const sh = 1 - (1 - f) * 0.12; r *= sh; g *= sh; b *= sh;
            }
            d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        }
    }, { smooth: true, mipmaps: false });
}
