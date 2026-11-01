// The cast. One big painted sheet: Dot, Pip, the students and their food parasites, weapons, snacks and hit effects. Nothing is
// loaded; everything is signed-distance shapes through the comic-book brush in paint.js.
import { Sheet, add, blend, blends, box, cut, disc, hex, meet, mix, oval, polygon, rot, round, seg, shift } from "./paint.js";

export const C = { ink: "#22122e", cream: "#fff4dc", tomato: "#f0402f", mustard: "#ffc52e", teal: "#17b5a6", pink: "#ff5a9e", blue: "#3f7ff0", grape: "#7b4de0", lime: "#8fd13f", orange: "#ff8a2b", white: "#ffffff" };
export const SKIN = ["#ffc9a0", "#c88a5a", "#8a5636", "#f2b88a"];
export const U = 2.4;
export const SHEET = 2048, SHEET_H = 2600;

const eyeWhite = "#fffdf4";
function pair(b, y, gap, fn) { fn(-gap / 2, y); fn(gap / 2, y); }

// --- Faces: the same few eyes and mouths make everyone expressive ---------------------------------------------------
function paintFaces(sh) {
    const ey = (name, paint) => sh.part(name, 56, 30, 28, 15, paint);
    ey("e_poss", (b) => pair(b, 0, 26, (x) => {
        b.toon(oval(x, 0, 11, 10), "#fff35a", { ink: 1.8, shade: 3, band: 2, light: false, dark: "#ff9a1f" });
        b.flat(oval(x + 2, 1, 2.2, 7), "#22122e");
        b.flat(seg(x - 13, -12, x + 13, -4 * Math.sign(x) * -1 - 6, 2.6), "#22122e");
    }));
    ey("e_mad", (b) => pair(b, 0, 26, (x) => {
        b.toon(oval(x, 1, 11, 10), eyeWhite, { ink: 1.8, shade: 3, band: 2, light: false, dark: "#d9c8e6" });
        b.flat(disc(x + 3, 2, 4), "#22122e");
        b.flat(polygon([[x - 13, -13], [x + 13, -13 + (x < 0 ? 8 : -2)], [x + 13, -5 + (x < 0 ? 8 : -2) - 8], [x - 13, -6 + (x < 0 ? 0 : 0)]]), "#22122e");
    }));
    ey("e_wide", (b) => pair(b, 0, 26, (x) => { b.toon(disc(x, 0, 12), eyeWhite, { ink: 1.8, shade: 3, band: 2, light: false, dark: "#d9c8e6" }); b.flat(disc(x + 1, 1, 2.4), "#22122e"); }));
    ey("e_hurt", (b) => pair(b, 0, 26, (x) => { const s = x < 0 ? 1 : -1; b.flat(add(seg(x - 9 * s, -8, x + 8 * s, 0, 2.2), seg(x + 8 * s, 0, x - 9 * s, 8, 2.2)), "#22122e"); }));
    ey("e_dizzy", (b) => pair(b, 0, 26, (x) => {
        b.toon(disc(x, 0, 11), eyeWhite, { ink: 1.8, shade: 0, light: false });
        const a = (X, Y) => { const dx = X - x, dy = Y, r = Math.hypot(dx, dy), t = Math.atan2(dy, dx); return Math.abs(((r - t * 1.1) % 4.4 + 4.4) % 4.4 - 2.2) - 0.9; };
        b.fill((X, Y) => Math.max(a(X, Y), Math.hypot(X - x, Y) - 9), (p, q, d, c) => { c[0] = 34; c[1] = 18; c[2] = 46; });
    }));
    ey("e_happy", (b) => pair(b, 0, 26, (x) => { b.flat(cut(oval(x, 3, 11, 10), oval(x, 8, 11, 10)), "#22122e"); }));
    ey("e_shut", (b) => pair(b, 0, 26, (x) => { b.flat(seg(x - 10, 1, x + 10, 1, 1.9), "#22122e"); }));
    // Dot's cat-eye glasses, part of her eyes.
    const dotEyes = (name, inner) => sh.part(name, 72, 36, 36, 18, (b) => {
        pair(b, 0, 32, (x) => {
            const s = x < 0 ? -1 : 1;
            const lens = blend(3, oval(x, 1, 15, 12), seg(x + s * 10, -6, x + s * 19, -12, 2));
            b.toon(lens, C.tomato, { ink: 1.6, shade: 3, band: 2, light: "#ff9078" });
            b.toon(oval(x, 1, 11, 8.6), eyeWhite, { ink: 1, shade: 2, band: 1.5, light: false, dark: "#d8e8ee" });
            inner(b, x, s);
        });
        b.flat(seg(-3, -1, 3, -1, 1.6), C.tomato);
    });
    dotEyes("de_norm", (b, x) => { b.flat(disc(x + 3, 1, 3.8), C.ink); b.flat(disc(x + 2, 0, 1.2), "#fff"); });
    dotEyes("de_mad", (b, x, s) => { b.flat(disc(x + 3, 2, 3.8), C.ink); b.flat(seg(x - 13, s < 0 ? -9 : -2, x + 13, s < 0 ? -2 : -9, 2.6), C.ink); });
    dotEyes("de_hurt", (b, x, s) => { b.flat(add(seg(x - 6 * s, -5, x + 5 * s, 1, 1.5), seg(x + 5 * s, 1, x - 6 * s, 6, 1.5)), C.ink); });
    dotEyes("de_happy", (b, x) => { b.flat(cut(oval(x, 3, 8, 7), oval(x, 7, 8, 7)), C.ink); });
    const mouth = (name, paint) => sh.part(name, 42, 32, 21, 16, paint);
    const inside = (b, f, tongue = true) => {
        b.toon(f, "#7c1731", { ink: 1.7, shade: 0, light: false });
        if (tongue) b.flat((x, y) => Math.max(f(x, y) + 1.7, disc(2, 13, 11)(x, y)), "#ff6f7f");
    };
    mouth("m_snarl", (b) => { const f = box(0, 0, 28, 14, 5); inside(b, f, false); for (let i = -2; i <= 2; i++) b.flat(meet(box(i * 5.2, 0, 3.6, 10, 0.6), round(f, -1.7)), "#fff"); b.flat(meet(box(0, 0, 30, 1.2), round(f, -1)), C.ink); });
    mouth("m_yell", (b) => { const f = oval(0, 2, 15, 13); inside(b, f); b.flat(meet(box(0, -8, 24, 7, 2), round(f, -1.7)), "#fff"); });
    mouth("m_ouch", (b) => { const f = oval(0, 0, 8, 11); inside(b, f); });
    mouth("m_grin", (b) => { const f = cut(oval(0, -2, 17, 13), box(0, -14, 40, 22)); inside(b, f); b.flat(meet(box(0, -1, 30, 7), round(f, -1.7)), "#fff"); });
    mouth("m_flat", (b) => { b.flat(seg(-9, 0, 9, 2, 1.8), C.ink); });
    mouth("m_tongue", (b) => { const f = oval(0, -2, 13, 8); inside(b, f, false); b.toon(box(3, 8, 12, 16, 6), "#ff6f7f", { ink: 1.6, shade: 3, band: 2 }); });
    mouth("m_lip", (b) => { b.toon(oval(0, 0, 12, 5.4), C.pink, { ink: 1.5, shade: 3, band: 2 }); b.flat(seg(-11, 0, 11, 0, 0.8), "#a31e5c"); });
}

// --- Dot --------------------------------------------------------------------------------------------------------------
function paintDot(sh) {
    // Hip at origin, chest up, skirt down.
    sh.part("dot_torso", 112, 112, 56, 86, (b) => {
        const dress = blends(12, box(0, -30, 76, 66, 26), polygon([[-40, -24], [40, -24], [50, 16], [-50, 16]]), box(0, 10, 100, 16, 7));
        b.toon(dress, C.teal, { ink: 2.4, shade: 11, band: 8, light: "#6fe8d6", dark: "#0b7b82" });
        // Apron: bib, waist band and a wide skirt.
        const skirt = polygon([[-33, -22], [33, -22], [42, 20], [-42, 20]]);
        b.toon(box(0, -42, 40, 40, 6), C.cream, { ink: 1.8, shade: 7, band: 5, dark: "#e5c9a4" });
        b.toon(round(skirt, 2), C.cream, { ink: 1.9, shade: 9, band: 6, dark: "#e5c9a4" });
        b.toon(box(0, -22, 74, 8, 3), "#ffe4b8", { ink: 1.7, shade: 2, band: 1 });
        b.toon(seg(-16, -60, -30, -72, 3.4), C.cream, { ink: 1.5, shade: 0 });
        b.toon(seg(16, -60, 30, -72, 3.4), C.cream, { ink: 1.5, shade: 0 });
        b.toon(box(0, 2, 34, 16, 4), "#ffe4b8", { ink: 1.5, shade: 3, band: 2 });
        b.decal(oval(18, 8, 7, 4), C.tomato, 0); b.decal(disc(10, 13, 2), C.tomato, 0); b.decal(disc(-20, -6, 3), C.mustard, 0); b.decal(oval(9, -44, 5, 3.4), C.tomato, 0);
        b.toon(box(-9, -48, 15, 9, 2), C.mustard, { ink: 1.4, shade: 2, band: 1 });
    });
    sh.part("dot_head", 104, 124, 52, 92, (b) => {
        const face = blends(8, oval(0, -2, 34, 30), oval(0, 14, 28, 18));
        // The beehive: a tower of grape-rinse hair under a net.
        const hive = blends(5, oval(0, -30, 37, 21), oval(1, -50, 32, 19), oval(2, -68, 22, 15));
        b.toon(hive, C.grape, { ink: 2.4, shade: 8, band: 6, light: "#b398ff", dark: "#4b2b9e" });
        for (let i = -3; i <= 3; i++) { b.flat(meet(seg(i * 16 - 30, -92, i * 16 + 30, -14, 0.5), round(hive, -2.4)), "#fff4dc", 0.5); b.flat(meet(seg(i * 16 + 30, -92, i * 16 - 30, -14, 0.5), round(hive, -2.4)), "#fff4dc", 0.5); }
        for (const [x, y] of [[-33, -20], [34, -22]]) b.toon(box(x, y, 14, 22, 6), C.pink, { ink: 1.8, shade: 3, band: 2 });
        b.toon(face, SKIN[0], { ink: 2.4, shade: 8, band: 6, dark: "#e88f72", light: "#ffe2c8" });
        b.flat(oval(-20, 12, 8, 5), "#ff8f8f", 0.6); b.flat(oval(22, 12, 8, 5), "#ff8f8f", 0.6);
        b.toon(blend(3, oval(4, 8, 6, 5), disc(0, 8, 3)), "#ffb78f", { ink: 1.5, shade: 2, band: 2 });
        b.flat(disc(-22, 22, 1.8), C.ink);
        const fringe = blends(6, oval(-14, -22, 20, 11), oval(14, -24, 20, 10));
        b.toon(fringe, C.grape, { ink: 2, shade: 4, band: 3, light: "#b398ff", dark: "#4b2b9e" });
    });
    sh.part("ladle", 56, 150, 28, 138, (b) => {
        // Pivot at the grip, pointing up. The bowl is the size of her head.
        b.toon(box(0, -56, 9, 128, 4), "#cfd8e8", { ink: 2, shade: 3, band: 2, light: "#ffffff", dark: "#7c86a8" });
        b.toon(box(0, 2, 13, 34, 5), C.tomato, { ink: 2, shade: 4, band: 2 });
        const bowl = cut(oval(0, -114, 26, 24), box(0, -142, 60, 30));
        b.toon(blend(3, oval(0, -112, 25, 21), box(0, -106, 10, 12)), "#d8e2f0", { ink: 2.4, shade: 8, band: 6, light: "#ffffff", dark: "#7884ac" });
        b.toon(oval(-1, -118, 18, 10), "#6b7596", { ink: 1.4, shade: 0, light: false });
        b.toon(oval(-1, -116, 15, 7), "#ffad33", { ink: 0.8, shade: 3, band: 2, dark: "#e0701a", light: "#ffe08a" });
    });
}

// --- Pip ------------------------------------------------------------------------------------------------------------
function paintPip(sh) {
    sh.part("pip_torso", 70, 76, 35, 58, (b) => {
        const t = blends(6, box(0, -22, 46, 50, 12), box(0, 6, 44, 22, 7));
        b.toon(t, "#3f7ff0", { ink: 2.2, shade: 7, band: 5, dark: "#2346b0", light: "#8fb6ff" });
        b.toon(meet(box(0, 8, 46, 22, 6), t), "#ffe4b8", { ink: 1.6, shade: 4, band: 3, dark: "#d0a877" });
        // The sash of office.
        const sash = meet(seg(-22, -46, 24, 10, 7), t);
        b.toon(sash, C.orange, { ink: 1.8, shade: 3, band: 2, light: "#ffd08a" });
        b.toon(disc(4, -18, 7), C.mustard, { ink: 1.5, shade: 3, band: 2, light: "#fff" });
    });
    sh.part("pip_head", 84, 84, 42, 56, (b) => {
        const f = blends(6, oval(0, 0, 32, 28), oval(0, 12, 25, 15));
        b.toon(f, SKIN[1], { ink: 2.4, shade: 7, band: 5, dark: "#945f39", light: "#e8b184" });
        b.flat(oval(-18, 12, 6, 4), "#e06a5a", 0.55); b.flat(oval(20, 12, 6, 4), "#e06a5a", 0.55);
        for (const [x, y] of [[-6, 14], [2, 16], [10, 14]]) b.flat(disc(x, y, 1.1), "#6d4023");
        // A proud bowl cut.
        const hair = cut(blends(4, oval(0, -14, 35, 24), box(0, -10, 66, 22, 6)), box(0, 12, 80, 26));
        b.toon(hair, "#2a2340", { ink: 2.2, shade: 5, band: 3, light: "#6a5f9a", dark: "#120b20" });
        b.toon(blend(2, disc(-3, -36, 5), seg(-3, -36, 4, -44, 2)), "#2a2340", { ink: 1.8, shade: 0, light: "#6a5f9a" });
    });
    sh.part("paddle", 64, 132, 32, 122, (b) => {
        b.toon(box(0, -28, 9, 74, 3), "#d8a15c", { ink: 2, shade: 3, band: 2, dark: "#8c5a2a" });
        const n = 8, pts = []; for (let i = 0; i < n; i++) { const a = Math.PI / 8 + i * Math.PI / 4; pts.push([Math.cos(a) * 29, -92 + Math.sin(a) * 29]); }
        b.toon(polygon(pts), "#e8302c", { ink: 2.4, shade: 7, band: 5, dark: "#a01420", light: "#ff8c7a" });
        b.flat((x, y) => Math.abs(polygon(pts)(x, y) + 4.2) - 1.1, "#fff4dc");
        const bar = box(0, -92, 34, 9, 1.5); b.flat(bar, "#fff4dc");
    });
}

// --- Students ---------------------------------------------------------------------------------------------------------
function paintStudents(sh) {
    const head = (name, skin, hair) => sh.part(name, 84, 90, 42, 54, (b) => {
        const dk = mix(hex(skin), [70, 20, 90], 0.36);
        b.toon(blends(5, oval(0, 0, 31, 27), oval(0, 13, 24, 14)), skin, { ink: 2.3, shade: 7, band: 5, dark: dk });
        b.flat(oval(-22, 9, 5, 3), "#ff7a6a", 0.4); b.flat(oval(22, 9, 5, 3), "#ff7a6a", 0.4);
        hair(b);
    });
    const hh = (f, col, o = {}) => (b) => b.toon(f, col, { ink: 2.1, shade: 5, band: 3, ...o });
    head("h0", SKIN[1], (b) => { hh(cut(blends(6, disc(0, -16, 34), disc(-22, -8, 16), disc(22, -8, 16), disc(-12, -34, 14), disc(14, -33, 14)), oval(0, 8, 28, 22)), "#2a1a22", { light: "#6b4a58" })(b); });
    head("h1", SKIN[0], (b) => { hh(blends(3, oval(-34, 4, 9, 15), disc(-30, -10, 5)), "#f08c2e", { light: "#ffd27a" })(b); hh(blends(3, oval(34, 4, 9, 15), disc(30, -10, 5)), "#f08c2e", { light: "#ffd27a" })(b); hh(cut(oval(0, -14, 32, 20), oval(0, 2, 28, 15)), "#f08c2e", { light: "#ffd27a" })(b); });
    head("h2", SKIN[2], (b) => { hh(box(0, -28, 56, 26, 4), "#16101e", { light: "#514a70" })(b); });
    head("h3", SKIN[3], (b) => { hh(cut(blends(3, oval(0, -14, 33, 20), oval(-20, -2, 12, 14)), oval(4, 8, 28, 20)), "#5a3a9e", { light: "#a688f0" })(b); hh(seg(-4, -34, 10, -42, 4, 2), "#5a3a9e", { light: "#a688f0" })(b); });
    // Shirts are painted white and tinted per stage and role, so the ink survives.
    const white = { dark: "#b8b4cc", light: "#ffffff" };
    sh.part("t_kid", 76, 80, 38, 62, (b) => {
        const t = blends(7, box(0, -24, 54, 54, 14), box(0, 6, 48, 18, 7));
        b.toon(t, "#f4f1f6", { ink: 2.3, shade: 7, band: 5, ...white });
        b.flat(meet(box(0, -32, 60, 8), round(t, -2.3)), "#6e6a86", 0.5); b.flat(meet(box(0, -20, 60, 8), round(t, -2.3)), "#6e6a86", 0.5);
    });
    sh.part("t_big", 124, 130, 62, 100, (b) => {
        const t = blends(12, oval(0, -40, 54, 56), box(0, 4, 78, 28, 12));
        b.toon(t, "#f4f1f6", { ink: 2.6, shade: 12, band: 8, ...white });
        const bib = blends(4, box(0, -30, 44, 44, 6), box(0, 8, 70, 26, 8));
        b.toon(meet(bib, round(t, -2.6)), "#9aa0c0", { ink: 1.8, shade: 8, band: 5, dark: "#5c6288", light: "#c8d0ec" });
        b.toon(seg(-20, -52, -32, -86, 4), "#9aa0c0", { ink: 1.6, shade: 0 }); b.toon(seg(20, -52, 32, -86, 4), "#9aa0c0", { ink: 1.6, shade: 0 });
        b.toon(box(0, -30, 18, 12, 2), "#c8d0ec", { ink: 1.4, shade: 2, band: 1 });
    });
    sh.part("h_big", 100, 96, 50, 60, (b) => {
        // Sloppy joe staff: bun hat over a stubbled face.
        const f = blends(7, box(0, 8, 58, 54, 18), oval(0, 26, 34, 14));
        b.toon(f, SKIN[3], { ink: 2.4, shade: 8, band: 5, dark: "#c47d5a" });
        b.flat(meet(oval(0, 28, 32, 15), f), "#7a5a60", 0.28);
        b.toon(oval(0, -6, 3, 3), "#e0a080", { ink: 0 });
    });
    // Parasites: food with eyes, riding on heads.
    const food = (name, w, h, ox, oy, paint) => sh.part(name, w, h, ox, oy, (b) => { paint(b); });
    const eyes = (b, x, y, g = 10, r = 5) => { for (const s of [-1, 1]) { b.toon(disc(x + s * g / 2, y, r), "#fff35a", { ink: 1.4, shade: 2, band: 1, light: false, dark: "#ff9a1f" }); b.flat(disc(x + s * g / 2 + 1, y + 1, r * 0.38), C.ink); } b.flat(seg(x - g * 0.9, y - r - 1, x, y - r * 0.2, 1.3), C.ink); b.flat(seg(x + g * 0.9, y - r - 1, x, y - r * 0.2, 1.3), C.ink); };
    food("f_broc", 74, 66, 37, 58, (b) => {
        b.toon(blends(3, box(0, -8, 16, 20, 5), box(-9, 0, 8, 12, 3), box(9, 0, 8, 12, 3)), "#a8dc6a", { ink: 2, shade: 4, band: 3, dark: "#5da030" });
        for (const [x, y, r] of [[-18, -28, 14], [18, -28, 14], [0, -38, 17], [-8, -20, 11], [10, -20, 11]]) b.toon(disc(x, y, r), "#3cae4a", { ink: 2, shade: 5, band: 3, dark: "#177a3c", light: "#87e27f" });
        eyes(b, 0, -28);
    });
    food("f_tot", 62, 46, 31, 40, (b) => {
        b.toon(box(0, -14, 46, 30, 12), "#f2b43c", { ink: 2.1, shade: 6, band: 4, dark: "#b86a1c", light: "#ffe28a" });
        for (const [x, y] of [[-14, -22], [10, -24], [16, -8], [-8, -6]]) b.flat(seg(x, y, x + 5, y + 2, 1), "#b86a1c");
        eyes(b, 0, -15, 12, 5.5);
    });
    food("f_pud", 62, 58, 31, 52, (b) => {
        b.toon(polygon([[-22, -24], [22, -24], [15, 0], [-15, 0]]), "#f4f1f6", { ink: 2.1, shade: 5, band: 3, dark: "#b8b4cc" });
        b.toon(blends(5, oval(0, -28, 22, 11), oval(0, -38, 12, 9)), "#8c5228", { ink: 2.1, shade: 5, band: 3, dark: "#55301a", light: "#c98a50" });
        b.toon(disc(0, -48, 5), C.tomato, { ink: 1.7, shade: 2, band: 1 });
        eyes(b, 0, -12, 12, 5);
    });
    food("f_cheese", 72, 60, 36, 54, (b) => {
        const f = cut(polygon([[-30, 0], [28, 0], [28, -30], [-26, -46]]), disc(-8, -32, 0));
        b.toon(f, "#b8e8ff", { ink: 2.2, shade: 6, band: 4, dark: "#5aa8d8", light: "#fff" });
        for (const [x, y, r] of [[-14, -14, 5], [14, -22, 6], [18, -8, 3]]) b.toon(disc(x, y, r), "#3f7fbf", { ink: 1, shade: 0, light: false });
        eyes(b, 2, -16, 12, 5);
        for (const s of [-1, 1]) b.toon(seg(s * 20, -50, s * 26, -60, 3, 1.4), "#a4e86a", { ink: 1.2, shade: 0 });
    });
    food("f_joe", 96, 62, 48, 56, (b) => {
        b.toon(oval(0, -6, 42, 11), "#a03e24", { ink: 2.2, shade: 4, band: 3, dark: "#6a2214", light: "#d8704a" });
        for (const x of [-30, -8, 16, 30]) b.toon(oval(x, 2, 7, 6), "#a03e24", { ink: 1.8, shade: 2, band: 1 });
        b.toon(cut(oval(0, -18, 42, 28), box(0, 8, 100, 40)), "#e8a85c", { ink: 2.3, shade: 7, band: 5, dark: "#a86428", light: "#ffdf9a" });
        for (const [x, y] of [[-16, -36], [8, -40], [22, -30], [-2, -30]]) b.flat(oval(x, y, 2.4, 1.3), C.cream);
        eyes(b, 0, -22, 16, 6);
    });
    // Hands, shoes and limb stamps.
    sh.part("hand", 40, 40, 20, 20, (b) => {
        b.toon(blends(3, disc(0, 0, 13), disc(10, -5, 5), disc(11, 3, 5), disc(6, 10, 5)), "#ffffff", { ink: 2.1, shade: 4, band: 3, dark: "#b8b4cc", light: false });
    });
    sh.part("hand_open", 44, 44, 22, 22, (b) => {
        b.toon(blends(2, disc(0, 2, 10), seg(0, 0, -5, -15, 3.4), seg(0, 0, 2, -17, 3.4), seg(0, 0, 9, -14, 3.4), seg(0, 2, 15, -3, 3.4)), "#ffffff", { ink: 2.1, shade: 3, band: 2, dark: "#b8b4cc", light: false });
    });
    sh.part("shoe", 66, 32, 22, 26, (b) => {
        const s = blends(5, oval(12, -9, 26, 12), box(-8, -10, 28, 20, 8));
        b.toon(s, "#f4f1f6", { ink: 2.2, shade: 5, band: 3, dark: "#b8b4cc", light: "#fff" });
        b.toon(box(10, 0, 56, 6, 2), "#fff4dc", { ink: 1.6, shade: 0 });
    });
    sh.part("disc", 40, 40, 20, 20, (b) => b.flat(disc(0, 0, 19), "#ffffff"));
    sh.part("bar", 8, 8, 4, 4, (b) => b.flat(box(0, 0, 8, 8), "#ffffff"));
    // Shields, one per floor of the school.
    const shield = (name, paint) => sh.part(name, 76, 112, 38, 56, paint);
    shield("s_tray", (b) => { b.toon(box(0, 0, 58, 98, 10), "#8fa8c8", { ink: 2.6, shade: 8, band: 5, dark: "#51658a", light: "#dbe8f8" }); b.toon(box(0, -24, 40, 30, 6), "#6f88aa", { ink: 1.4, shade: 0, light: false }); b.toon(box(0, 22, 40, 36, 6), "#6f88aa", { ink: 1.4, shade: 0, light: false }); b.toon(oval(-4, 22, 14, 10), "#ffad33", { ink: 1.2, shade: 2, band: 1 }); });
    shield("s_mat", (b) => { b.toon(box(0, 0, 58, 100, 10), "#3f7ff0", { ink: 2.6, shade: 8, band: 5, dark: "#2346b0", light: "#a0c0ff" }); for (const y of [-28, 0, 28]) b.flat(box(0, y, 54, 3), "#22122e", 0.6); });
    shield("s_book", (b) => { b.toon(box(0, 0, 62, 96, 5), "#b83a44", { ink: 2.6, shade: 8, band: 5, dark: "#761c30", light: "#ff8a80" }); b.flat(box(-22, 0, 3, 90), "#ffc52e"); b.toon(box(4, -20, 30, 18, 2), "#ffc52e", { ink: 1.2, shade: 0 }); });
    shield("s_clip", (b) => { b.toon(box(0, 0, 60, 98, 7), "#c88a4a", { ink: 2.6, shade: 8, band: 5, dark: "#8a5428", light: "#f0c088" }); b.toon(box(0, 6, 46, 72, 2), "#fff4dc", { ink: 1.4, shade: 0 }); b.toon(box(0, -42, 26, 12, 3), "#9aa0c0", { ink: 1.6, shade: 0 }); for (const y of [-14, 0, 14, 28]) b.flat(box(0, y, 34, 2), "#3f7ff0", 0.7); });
}

// --- Things -----------------------------------------------------------------------------------------------------------
function paintItems(sh) {
    sh.part("w_tray", 76, 96, 38, 90, (b) => { b.toon(box(0, 2, 12, 22, 4), "#ffffff", { ink: 2, shade: 3, band: 2, dark: "#b8b4cc" }); b.toon(box(0, -46, 60, 76, 9), "#8fa8c8", { ink: 2.4, shade: 7, band: 4, dark: "#51658a", light: "#dbe8f8" }); b.toon(box(0, -46, 42, 54, 6), "#6f88aa", { ink: 1.4, shade: 0, light: false }); });
    sh.part("w_mop", 60, 200, 30, 188, (b) => {
        b.toon(box(0, -74, 8, 170, 3), "#d8a15c", { ink: 2, shade: 3, band: 2, dark: "#8c5a2a" });
        b.toon(box(0, -160, 34, 12, 3), "#3f7ff0", { ink: 2, shade: 3, band: 2 });
        for (let i = -3; i <= 3; i++) b.toon(seg(i * 6, -164, i * 8.4, -184 + Math.abs(i) * 2, 4.6), "#f4f1f6", { ink: 1.7, shade: 3, band: 2, dark: "#b8b4cc" });
    });
    sh.part("w_custard", 70, 76, 35, 66, (b) => {
        b.toon(polygon([[-26, -44], [26, -44], [21, 0], [-21, 0]]), C.mustard, { ink: 2.3, shade: 7, band: 4, dark: "#d48a14", light: "#fff0a0" });
        b.toon(box(0, -46, 62, 12, 5), "#ffe89a", { ink: 2.2, shade: 3, band: 2 });
        b.flat(box(0, -22, 26, 13, 3), C.tomato); b.flat(box(0, -22, 18, 3), C.cream);
        b.stroke(seg(-24, -50, 24, -50, 0), 0);
        b.fill((x, y) => Math.abs(oval(0, -42, 30, 26)(x, y)) - 1.6, (x, y, d, c) => { c[3] = y < -42 ? 1 : 0; c[0] = 200; c[1] = 200; c[2] = 220; });
    });
    sh.part("i_cookie", 44, 44, 22, 22, (b) => { b.toon(disc(0, 0, 18), "#e0a050", { ink: 2.2, shade: 6, band: 4, dark: "#a86428", light: "#ffd590" }); for (const [x, y] of [[-7, -6], [6, -8], [8, 5], [-5, 7], [0, 0]]) b.flat(disc(x, y, 2.8), "#552c1c"); });
    sh.part("i_milk", 44, 60, 22, 54, (b) => { b.toon(polygon([[-15, -30], [15, -30], [15, 0], [-15, 0]]), "#f8f8ff", { ink: 2.2, shade: 5, band: 3, dark: "#b8c4e4" }); b.toon(polygon([[-15, -30], [15, -30], [6, -46], [-6, -46]]), "#3f7ff0", { ink: 2.2, shade: 3, band: 2 }); b.flat(box(0, -14, 22, 12, 3), "#3f7ff0"); });
    sh.part("i_pudding", 44, 44, 22, 38, (b) => { b.toon(polygon([[-15, -14], [15, -14], [11, 0], [-11, 0]]), "#f4f1f6", { ink: 2.2, shade: 4, band: 2, dark: "#b8b4cc" }); b.toon(oval(0, -16, 15, 9), "#8c5228", { ink: 2, shade: 4, band: 2, dark: "#55301a", light: "#c98a50" }); b.toon(disc(0, -26, 4.4), C.tomato, { ink: 1.5, shade: 2, band: 1 }); });
    // Food that gets thrown.
    sh.part("p_peas", 40, 40, 20, 20, (b) => { for (const [x, y] of [[-7, 2], [6, 5], [0, -7]]) b.toon(disc(x, y, 8.4), C.lime, { ink: 2, shade: 3, band: 2, dark: "#4e9a24", light: "#d4ff90" }); });
    sh.part("p_ball", 44, 44, 22, 22, (b) => { b.toon(disc(0, 0, 18), "#e84a3a", { ink: 2.3, shade: 6, band: 4, dark: "#9a1c28", light: "#ffa090" }); b.stroke(oval(0, 0, 7, 18), 1.4, C.ink, 0.6); b.stroke(oval(0, 0, 18, 7), 1.4, C.ink, 0.6); });
    sh.part("p_beaker", 44, 54, 22, 40, (b) => { b.toon(polygon([[-7, -32], [7, -32], [7, -18], [18, 6], [-18, 6], [-7, -18]]), "#bff4ff", { ink: 2.1, shade: 3, band: 2, light: "#fff" }); b.toon(polygon([[-12, -6], [12, -6], [17, 5], [-17, 5]]), C.lime, { ink: 0.5, shade: 3, band: 2 }); });
    sh.part("p_book", 54, 44, 27, 22, (b) => { b.toon(box(0, 0, 44, 34, 3), "#3a7f8c", { ink: 2.2, shade: 5, band: 3, dark: "#1e4d5c", light: "#90d8d8" }); b.flat(box(-16, 0, 3, 30), C.mustard); b.toon(box(4, -6, 22, 8, 1), C.cream, { ink: 1, shade: 0 }); });
    sh.part("p_gravy", 44, 44, 22, 22, (b) => { b.toon(blends(4, disc(0, 2, 15), seg(0, 0, -4, -17, 6, 2)), "#8a4a24", { ink: 2.1, shade: 5, band: 3, dark: "#55301a", light: "#d89a60" }); });
    sh.part("p_slip", 48, 36, 24, 18, (b) => { b.toon(box(0, 0, 40, 26, 2), "#ff9ac8", { ink: 2, shade: 3, band: 2, light: "#fff" }); for (const y of [-5, 0, 5]) b.flat(box(0, y, 28, 1.6), C.ink, 0.7); });
    sh.part("p_crouton", 44, 44, 22, 22, (b) => { b.toon(rot(box(0, 0, 30, 28, 5), 0, 0, 0.3), "#e8b05c", { ink: 2.2, shade: 6, band: 4, dark: "#a8682c", light: "#ffe29a" }); for (const [x, y] of [[-5, -4], [5, 4], [-2, 6]]) b.flat(disc(x, y, 1.6), "#a8682c"); });
    sh.part("p_mustard", 44, 44, 22, 22, (b) => { b.toon(disc(0, 0, 16), C.mustard, { ink: 2, shade: 5, band: 3, dark: "#d48a14" }); });
    // Effects.
    sh.part("burst", 120, 120, 60, 60, (b) => {
        const n = 11, pts = [];
        for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, r = i % 2 ? 26 : 56 - (i * 13 % 5) * 3; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        b.toon(polygon(pts), "#ffffff", { ink: 0, shade: 0, light: false });
    });
    sh.part("star", 40, 40, 20, 20, (b) => {
        const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7.5 : 17; pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
        b.toon(round(polygon(pts), 1.5), C.mustard, { ink: 2, shade: 3, band: 2, dark: "#f08c2e", light: "#fff" });
    });
    sh.part("alert", 40, 60, 20, 30, (b) => { b.toon(polygon([[-11, -26], [11, -26], [6, 8], [-6, 8]]), C.tomato, { ink: 2.2, shade: 3, band: 2, light: "#ffb0a0" }); b.toon(disc(0, 19, 7), C.tomato, { ink: 2.2, shade: 2, band: 1, light: "#ffb0a0" }); });
    sh.part("ring", 128, 128, 64, 64, (b) => { b.flat((x, y) => Math.abs(Math.hypot(x, y) - 56) - 6, "#ffffff"); });
    sh.part("smear", 170, 170, 20, 85, (b) => {
        // A crescent of ladle swing, thick at the leading edge. Drawn rotated and tinted.
        b.fill((x, y) => Math.max(Math.hypot(x, y) - 146, -(Math.hypot(x - 18, y - 6) - 118)), (x, y, d, c) => { c[0] = c[1] = c[2] = 255; const a = Math.atan2(y, x); c[3] = clamp01((a + 1.4) / 2.5); });
    });
    sh.part("splat", 120, 72, 60, 36, (b) => { b.flat(blends(4, oval(0, 0, 44, 22), oval(-34, 8, 14, 9), oval(36, -8, 12, 8), oval(10, 22, 16, 7), oval(-16, -20, 12, 7)), "#ffffff"); });
    sh.part("shadow", 96, 28, 48, 14, (b) => { b.fill(oval(0, 0, 46, 12), (x, y, d, c) => { c[0] = 34; c[1] = 18; c[2] = 46; c[3] = 0.42; }); });
    sh.part("drop", 18, 30, 9, 16, (b) => b.flat(blend(3, disc(0, 6, 7), seg(0, 4, 0, -13, 3, 0.8)), "#ffffff"));
    sh.part("speed", 64, 10, 32, 5, (b) => b.flat(seg(-30, 0, 30, 0, 3.2, 0.3), "#ffffff"));
    sh.part("reticle", 96, 40, 48, 20, (b) => { b.flat((x, y) => Math.abs(oval(0, 0, 44, 17)(x, y)) - 1.7, "#ffffff"); b.flat(cut(oval(0, 0, 10, 4), oval(0, 0, 0.1, 0.1)), "#ffffff"); });
}
function paintProps(sh) {
    const wood = "#c98a4e", woodD = "#8a5428", steel = "#a8b4cc", steelD = "#6a7694";
    sh.part("x_table", 150, 80, 75, 74, (b) => {
        for (const x of [-52, 52]) b.toon(box(x, -18, 9, 40, 2), steel, { ink: 2, shade: 3, band: 2, dark: steelD });
        b.toon(box(0, -44, 146, 16, 5), "#ffb0c4", { ink: 2.4, shade: 5, band: 3, dark: "#d86a8c", light: "#ffe0e8" });
        b.toon(oval(-30, -56, 16, 7), "#fff4dc", { ink: 1.8, shade: 3, band: 2 }); b.toon(oval(-30, -60, 8, 4), C.lime, { ink: 1.4, shade: 1 }); b.toon(box(34, -60, 14, 24, 4), "#f8f8ff", { ink: 1.8, shade: 3, band: 2 });
    });
    sh.part("x_crate", 80, 80, 40, 74, (b) => {
        b.toon(box(0, -35, 68, 66, 4), wood, { ink: 2.4, shade: 7, band: 5, dark: woodD, light: "#f0c088" });
        b.flat(add(seg(-30, -64, 30, -6, 2.4), box(0, -62, 64, 3), box(0, -8, 64, 3)), woodD);
        b.toon(oval(0, -35, 13, 13), C.mustard, { ink: 1.7, shade: 3, band: 2, dark: "#d48a14" });
    });
    sh.part("x_locker", 66, 130, 33, 124, (b) => {
        b.toon(box(0, -60, 54, 120, 4), "#e85a50", { ink: 2.4, shade: 7, band: 5, dark: "#9a2838", light: "#ff9a8a" });
        for (const y of [-108, -100, -92]) b.flat(box(0, y, 26, 2.6, 1), "#22122e", 0.7);
        b.toon(box(14, -56, 7, 16, 2), steel, { ink: 1.5, shade: 2, band: 1, dark: steelD });
    });
    sh.part("x_bench", 170, 66, 85, 60, (b) => {
        for (const x of [-60, 60]) b.toon(box(x, -12, 10, 28, 2), steel, { ink: 2, shade: 3, band: 2, dark: steelD });
        b.toon(box(0, -32, 160, 14, 5), wood, { ink: 2.4, shade: 5, band: 3, dark: woodD, light: "#f0c088" });
        b.toon(disc(-40, -48, 13), "#e84a3a", { ink: 2, shade: 4, band: 2, dark: "#9a1c28" }); b.toon(box(30, -48, 40, 18, 7), "#3f7ff0", { ink: 2, shade: 3, band: 2 });
    });
    sh.part("x_shelf", 120, 150, 60, 144, (b) => {
        b.toon(box(0, -70, 106, 140, 3), woodD, { ink: 2.4, shade: 6, band: 4, dark: "#55301a" });
        for (const y of [-126, -82, -38]) {
            b.toon(box(0, y + 16, 104, 6), wood, { ink: 1.5, shade: 0 });
            let x = -44; let i = 0;
            for (const w of [12, 9, 14, 10, 12, 8, 13]) { b.toon(box(x + w / 2, y - 7 + (i % 3), w - 1, 40 - (i % 3) * 3, 1), ["#b83a44", "#3a7f8c", C.mustard, "#7b4de0", "#3f7ff0", "#8fd13f"][(i + (y & 3)) % 6], { ink: 1.3, shade: 2, band: 1 }); x += w + 1; i++; }
        }
    });
    sh.part("x_vent", 110, 100, 55, 94, (b) => {
        b.toon(box(0, -38, 96, 72, 7), steel, { ink: 2.4, shade: 8, band: 5, dark: steelD, light: "#e4ecf8" });
        for (let i = 0; i < 6; i++) b.flat(box(0, -60 + i * 9, 74, 3.4, 1.4), steelD);
        b.toon(box(0, -80, 44, 12, 3), steelD, { ink: 2, shade: 2, band: 1 });
    });
    sh.part("x_debris", 40, 40, 20, 20, (b) => { b.toon(polygon([[-14, -12], [14, -16], [10, 12], [-10, 15]]), wood, { ink: 2, shade: 3, band: 2, dark: woodD }); });
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function paintCast(assets) {
    let parts;
    assets.paint("cast", SHEET, SHEET_H, (p) => {
        const sh = new Sheet(p, SHEET, U, SHEET_H);
        paintFaces(sh); paintDot(sh); paintPip(sh); paintStudents(sh); paintItems(sh); paintProps(sh);
        parts = sh.parts; parts._y = sh.y + sh.row;
    }, { smooth: true });
    return parts;
}
