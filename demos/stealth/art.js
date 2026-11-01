// CAT BURGLAR. Everything painted in code: Sable the cat, the night shift, their dogs, props and icons.
export const INK = "#0d0e1a", CREAM = "#f4ead2", MOON = "#bcd6ff", AMBER = "#ffc35a", RUST = "#d8402f", DUSK = "#1c2138";
export const FONT = 'Georgia, "Times New Roman", serif';

const CAT = { ink: "#0e0d18", top: "#3a3852", low: "#232136", belly: "#5a5678", hi: "#6e6a94", bib: "#ece6f0", scarf: "#e03a2e", scarf2: "#8e1d1c", nose: "#ee8fa0", eye: "#ffd24a", pupil: "#1a1208" };

/** Paints at any scale, so the title cat and the tiny cat are the same drawing. */
class Pen {
    constructor(p, s = 1, ox = 0, oy = 0) { this.p = p; this.s = s; this.ox = ox; this.oy = oy; }
    X(x) { return this.ox + x * this.s; } Y(y) { return this.oy + y * this.s; }
    e(x, y, rx, ry, c, c2) { this.p.ellipse(this.X(x), this.Y(y), rx * this.s, ry * this.s, c, c2); return this; }
    c(x, y, r, c, c2) { return this.e(x, y, r, r, c, c2); }
    l(x0, y0, x1, y1, c, w = 1) { this.p.line(this.X(x0), this.Y(y0), this.X(x1), this.Y(y1), c, w * this.s); return this; }
    g(pts, c) { this.p.poly(pts.map(([x, y]) => [this.X(x), this.Y(y)]), c); return this; }
}
const NULLPEN = { e() { return this; }, c() { return this; }, l() { return this; }, g() { return this; } };

// --- Sable ---------------------------------------------------------------------------------------

function catHeadFront(b, eye, x, y, r, o = {}) {
    b.g([[x - r * 0.92, y - r * 0.3], [x - r * 0.88, y - r * 1.5], [x - r * 0.22, y - r * 0.8]], CAT.low);
    b.g([[x + r * 0.92, y - r * 0.3], [x + r * 0.88, y - r * 1.5], [x + r * 0.22, y - r * 0.8]], CAT.low);
    b.g([[x - r * 0.76, y - r * 0.6], [x - r * 0.78, y - r * 1.2], [x - r * 0.42, y - r * 0.8]], CAT.nose + "aa");
    b.g([[x + r * 0.76, y - r * 0.6], [x + r * 0.78, y - r * 1.2], [x + r * 0.42, y - r * 0.8]], CAT.nose + "aa");
    b.e(x, y, r * 1.06, r * 0.94, CAT.top, CAT.low);
    b.e(x - r * 0.3, y - r * 0.46, r * 0.36, r * 0.2, CAT.hi + "88");
    // The bandit mask.
    b.e(x, y - r * 0.12, r * 0.96, r * 0.34, CAT.ink);
    b.e(x, y + r * 0.44, r * 0.54, r * 0.38, CAT.bib);
    const ex = r * 0.44, ey = y - r * 0.14;
    if (o.closed) {
        b.l(x - ex - r * 0.2, ey + r * 0.04, x - ex + r * 0.2, ey - r * 0.06, CAT.eye, r * 0.09);
        b.l(x + ex - r * 0.2, ey - r * 0.06, x + ex + r * 0.2, ey + r * 0.04, CAT.eye, r * 0.09);
    } else {
        for (const sx of [-1, 1]) {
            eye.e(x + sx * ex, ey, r * 0.24, r * 0.19, CAT.eye);
            eye.e(x + sx * ex + r * 0.05, ey, r * 0.08, r * 0.17, CAT.pupil);
            b.g([[x + sx * ex - r * 0.3, ey - r * 0.27], [x + sx * ex + r * 0.3, ey - r * 0.27], [x + sx * ex + r * 0.3, ey - (o.lids ? r * 0.02 : r * 0.13)], [x + sx * ex - r * 0.3, ey - (o.lids ? r * 0.02 : r * 0.13)]], CAT.ink);
        }
    }
    b.g([[x - r * 0.1, y + r * 0.26], [x + r * 0.1, y + r * 0.26], [x, y + r * 0.38]], CAT.nose);
    b.l(x, y + r * 0.38, x, y + r * 0.48, CAT.ink, r * 0.05);
    if (o.smile) { b.l(x, y + r * 0.48, x + r * 0.26, y + r * 0.42, CAT.ink, r * 0.06); b.l(x, y + r * 0.48, x - r * 0.14, y + r * 0.46, CAT.ink, r * 0.05); }
    for (const sx of [-1, 1]) for (const dy of [0.32, 0.46]) b.l(x + sx * r * 0.58, y + r * dy, x + sx * r * 1.34, y + r * (dy + (dy - 0.4) * 1.2), "#d9d6e6cc", r * 0.035);
}

function catSide(b, eye, o) {
    const low = o.low ?? 0, g = 84, s = o.stretch ?? 0;
    const bx = 44, by = 58 + low * 10, bh = 15 - low * 3, bl = 27 + s * 6;
    const hx = 72 + low * 7 + s * 6, hy = 43 + low * 15 + (o.headBob ?? 0);
    const ph = o.ph ?? 0, sw = o.swing ?? 7;
    const leg = (x, a, far) => {
        const f = Math.sin(a), lift = Math.max(0, Math.cos(a)) * 3;
        const c = far ? "#1b1a2c" : CAT.low;
        b.l(x, by + 5, x + f * sw * 0.4, (by + g) / 2 + 2, c, 6.6 - low);
        b.l(x + f * sw * 0.4, (by + g) / 2 + 2, x + f * sw, g - lift, c, 5.8);
        b.e(x + f * sw + 1.5, g - lift, 4.4, 2.6, far ? "#1b1a2c" : CAT.belly);
    };
    leg(28, ph + Math.PI, true); leg(60, ph, true);
    b.e(bx, by, bl, bh, CAT.top, CAT.low);
    b.e(bx - 12, by - 3, 15, bh - 1, CAT.top, CAT.low);       // haunch
    b.e(bx + 2, by + bh * 0.62, bl * 0.66, bh * 0.34, CAT.belly + "88");
    b.e(bx - 4, by - bh * 0.6, bl * 0.5, 2.6, CAT.hi + "99");
    leg(32, ph, false); leg(56, ph + Math.PI, false);
    // Neck, scarf, then head.
    b.l(bx + 18, by - 3, hx - 7, hy + 4, CAT.top, 16 - low * 3);
    b.l(hx - 12, hy + 9, hx - 2, hy + 12, CAT.scarf, 6.5);
    b.g([[hx - 15, hy + 11], [hx - 27, hy + 8 + (o.tail ?? 0)], [hx - 25, hy + 16 + (o.tail ?? 0)]], CAT.scarf);
    b.l(hx - 13, hy + 11, hx - 4, hy + 14, CAT.scarf2, 2);
    if (o.front) { catHeadFront(b, eye, hx - 2, hy - 1, 15.5, { lids: true, smile: true }); return; }
    const r = 14.5;
    b.g([[hx - 9, hy - 8], [hx - 10, hy - 24], [hx + 1, hy - 12]], CAT.low);
    b.g([[hx + 1, hy - 11], [hx + 6, hy - 25], [hx + 11, hy - 8]], CAT.low);
    b.g([[hx + 3, hy - 12], [hx + 6, hy - 20], [hx + 8.5, hy - 10]], CAT.nose + "aa");
    b.e(hx, hy, r, r * 0.88, CAT.top, CAT.low);
    b.e(hx - 4, hy - 7, 6, 2.6, CAT.hi + "88");
    b.e(hx + 3, hy - 2, 12.5, 4.8, CAT.ink);
    b.e(hx + 10, hy + 6, 7.5, 5.4, CAT.bib);
    b.g([[hx + 14, hy + 2], [hx + 18.5, hy + 3], [hx + 15, hy + 6]], CAT.nose);
    if (o.closed) b.l(hx + 2, hy - 2, hx + 10, hy - 3, CAT.eye, 1.5);
    else {
        eye.e(hx + 6.5, hy - 2.4, 3.9, 3.3, CAT.eye);
        eye.e(hx + 7.8, hy - 2.4, 1.3, 3, CAT.pupil);
        b.g([[hx + 1.5, hy - 7], [hx + 12, hy - 6], [hx + 12, hy - 3.6], [hx + 1.5, hy - 2.2]], CAT.ink);
    }
    if (o.smile) b.l(hx + 8, hy + 8.4, hx + 15, hy + 7, CAT.ink, 1.2);
    b.l(hx + 12, hy + 5, hx + 24, hy + 3, "#d9d6e6cc", 0.6);
    b.l(hx + 12, hy + 7, hx + 23, hy + 8, "#d9d6e6cc", 0.6);
    if (o.paw) { b.l(hx - 2, hy + 18, hx + 12 + o.paw, hy + 8 - o.paw * 0.4, CAT.low, 6); b.e(hx + 13 + o.paw, hy + 7.5 - o.paw * 0.4, 4.4, 3.8, CAT.belly); }
}

function catFront(b, eye, o) {
    const ph = o.ph ?? 0, bob = Math.abs(Math.sin(ph)) * 1.6;
    b.e(48, 66 - bob * 0.5, 19, 18, CAT.top, CAT.low);
    b.e(48, 70, 9.5, 11, CAT.bib);
    const f = Math.sin(ph) * 3.2;
    b.l(38, 74, 38, 85 - Math.max(0, f), CAT.low, 7); b.l(58, 74, 58, 85 - Math.max(0, -f), CAT.low, 7);
    b.e(38, 86 - Math.max(0, f), 5, 3, CAT.belly); b.e(58, 86 - Math.max(0, -f), 5, 3, CAT.belly);
    b.e(48, 52, 15, 5.5, CAT.scarf); b.e(48, 53.4, 13, 3, CAT.scarf2 + "99");
    b.l(52, 55, 56, 65, CAT.scarf, 4.5);
    catHeadFront(b, eye, 48, 38 - bob * 0.4, 17, { lids: o.lids ?? true, smile: o.smile, closed: o.closed });
}

function catBack(b, o) {
    const ph = o.ph ?? 0, f = Math.sin(ph) * 3.2;
    b.l(38, 72, 38, 85 - Math.max(0, f), CAT.low, 7); b.l(58, 72, 58, 85 - Math.max(0, -f), CAT.low, 7);
    b.e(38, 86 - Math.max(0, f), 5, 3, CAT.belly); b.e(58, 86 - Math.max(0, -f), 5, 3, CAT.belly);
    b.e(48, 62, 20, 21, CAT.top, CAT.low);
    b.e(48, 52, 15, 5.5, CAT.scarf);
    b.g([[46, 52], [38, 66], [48, 62]], CAT.scarf);
    const x = 48, y = 38, r = 16;
    b.g([[x - r * 0.9, y - r * 0.3], [x - r * 0.88, y - r * 1.5], [x - r * 0.2, y - r * 0.8]], CAT.low);
    b.g([[x + r * 0.9, y - r * 0.3], [x + r * 0.88, y - r * 1.5], [x + r * 0.2, y - r * 0.8]], CAT.low);
    b.e(x, y, r * 1.04, r * 0.92, CAT.top, CAT.low);
    b.e(x, y - r * 0.5, r * 0.4, r * 0.18, CAT.hi + "88");
}

export const CATF = { side: 0, slink: 4, front: 8, back: 12, sit: 16, sitSide: 17, leap: 18, paw: 19, stare: 21, rub: 22, dangle: 23, loaf: 24 };
export const CAT_FRAMES = 25;

function catFrame(b, eye, f) {
    if (f < 4) catSide(b, eye, { ph: f / 4 * Math.PI * 2, headBob: f % 2 });
    else if (f < 8) catSide(b, eye, { ph: (f - 4) / 4 * Math.PI * 2, low: 1, swing: 8.5, headBob: (f % 2) * 0.6 });
    else if (f < 12) catFront(b, eye, { ph: (f - 8) / 4 * Math.PI * 2 });
    else if (f < 16) catBack(b, { ph: (f - 12) / 4 * Math.PI * 2 });
    else if (f === 16) catFront(b, eye, { ph: 0, smile: true });
    else if (f === 17) catSide(b, eye, { swing: 0, smile: true });
    else if (f === 18) catSide(b, eye, { ph: 1.2, swing: 15, stretch: 1, low: 0.3 });
    else if (f === 19) catSide(b, eye, { swing: 0, paw: 2 });
    else if (f === 20) catSide(b, eye, { swing: 0, paw: 9 });
    else if (f === 21) catSide(b, eye, { swing: 0, paw: 6, front: true });
    else if (f === 22) catSide(b, eye, { swing: 0, closed: true, smile: true, headBob: 3, low: 0.2 });
    else if (f === 23) {          // held under the arms: one very long cat
        b.e(48, 62, 13, 30, CAT.top, CAT.low); b.e(48, 62, 7, 20, CAT.bib + "dd");
        b.l(37, 84, 35, 94, CAT.low, 6); b.l(59, 84, 61, 94, CAT.low, 6);
        b.l(38, 42, 28, 30, CAT.low, 6); b.l(58, 42, 68, 30, CAT.low, 6);
        b.e(48, 40, 13, 4.5, CAT.scarf);
        catHeadFront(b, eye, 48, 26, 16, { lids: true });
    } else {                       // loaf: tucked up, utterly pleased
        b.e(48, 68, 28, 18, CAT.top, CAT.low); b.e(48, 76, 15, 9, CAT.bib + "cc");
        b.e(48, 54, 13, 4.5, CAT.scarf);
        catHeadFront(b, eye, 48, 42, 17, { closed: true, smile: true });
    }
}

// --- The night shift ------------------------------------------------------------------------------

export const LOOKS = {
    pemberton: { coat: "#3c4a68", coat2: "#2a3448", skin: "#e0b596", hair: "#d8d8dc", hat: "cap", stache: "#e6e6ea", fat: 6, tall: 0, trim: "#c6a14e" },
    bea: { coat: "#2f6a70", coat2: "#20494e", skin: "#8e5a3c", hair: "#1d1420", hat: "cap", tail: true, fat: -3, tall: 2, trim: "#f0c64e" },
    gus: { coat: "#55486e", coat2: "#3b3150", skin: "#efc09c", hair: "#5a3820", hat: "cap", beard: "#5a3820", fat: 11, tall: -3, trim: "#c6a14e" },
    hubert: { coat: "#30303c", coat2: "#20202a", skin: "#ecd0b8", hair: "#a8a8ae", hat: "none", bow: true, fat: -5, tall: 5, trim: "#a33" },
    milo: { coat: "#4a6a4e", coat2: "#334c37", skin: "#f2c4a8", hair: "#a8562a", hat: "cap", rednose: true, fat: -1, tall: -5, trim: "#e6d9b0" },
    dolores: { coat: "#a58860", coat2: "#7a6242", skin: "#e8bea0", hair: "#2a1a22", hat: "fedora", fat: 0, tall: 3, trim: "#3a2a20" },
    chef: { coat: "#e8e6df", coat2: "#b9b6ae", skin: "#efc09c", hair: "#2a2020", hat: "toque", stache: "#2a2020", fat: 7, tall: 0, trim: "#c0392b" },
    sarge: { coat: "#5b6236", coat2: "#3f4525", skin: "#d8a888", hair: "#2a2a20", hat: "beret", stache: "#2a2a20", fat: 3, tall: 2, trim: "#c6a14e" },
};
export const GF = { side: 0, front: 4, back: 6, nap: 8, shrug: 9, shock: 10, hold: 11 };
export const GUARD_FRAMES = 12;

function hat(b, L, x, y, side, back) {
    const trim = L.trim;
    if (L.hat === "cap") {
        b.e(x, y - 8, 15, 8, L.coat, L.coat2); b.e(x, y - 12, 14, 5, L.coat);
        if (!back) { b.e(x + side * 6, y - 4.5, side ? 12 : 13, 3, "#14141c"); b.c(x + side * 3, y - 9, 2.4, trim); }
        b.l(x - 14, y - 6, x + 14, y - 6, trim, 1.4);
    } else if (L.hat === "fedora") {
        b.e(x, y - 6, 21, 4.2, "#4f3f33"); b.e(x, y - 12, 12, 8, "#5e4b3c"); b.l(x - 12, y - 8, x + 12, y - 8, "#241a16", 2.6);
    } else if (L.hat === "toque") {
        b.e(x, y - 8, 14, 5, "#f4f1ea"); b.e(x - 8, y - 20, 10, 9, "#fff"); b.e(x + 8, y - 20, 10, 9, "#f7f5ee"); b.e(x, y - 24, 11, 10, "#fff"); b.l(x - 13, y - 8, x + 13, y - 8, "#d8d4ca", 3);
    } else if (L.hat === "beret") {
        b.e(x - 2, y - 11, 16, 7, "#7a2428"); b.c(x + 8, y - 15, 2, "#c6a14e");
    } else {   // a noble, retreating hairline
        b.e(x - 13, y - 1, 4, 6, L.hair); b.e(x + 13, y - 1, 4, 6, L.hair);
    }
}

function guardFrame(b, L, f) {
    const g = 112, W = 20 + L.fat, tall = L.tall, cx = 44;
    const legs = (x0, x1, a, c) => { b.l(x0, 80, x1, g - 8 - a, c, 11); b.e(x1 + 2, g - 4 - a, 8.5, 4.5, "#14141c"); };
    if (f < 4) {   // side walk, torch out in front
        const ph = f / 4 * Math.PI * 2, s = Math.sin(ph) * 11, lift1 = Math.max(0, Math.cos(ph)) * 4, lift2 = Math.max(0, -Math.cos(ph)) * 4, bob = Math.abs(Math.cos(ph)) * 1.5;
        legs(cx - 2, cx - s, lift2, L.coat2);
        b.l(cx - 2, 56 - tall, cx - 4 + s * 0.5, 80, L.coat2, 9);
        legs(cx + 2, cx + s, lift1, "#1e2233");
        b.e(cx, 64 - tall / 2 + bob, W * 0.82, 24 + tall / 2, L.coat, L.coat2);
        b.l(cx - W * 0.82, 84 + bob, cx + W * 0.82, 84 + bob, "#14141c", 4); b.c(cx + 2, 84 + bob, 2.6, L.trim);
        b.l(cx + 3, 54 - tall, cx + 22, 64 - tall, L.coat, 9); b.c(cx + 23, 64 - tall, 4.6, L.skin);
        b.l(cx + 22, 63 - tall, cx + 34, 60 - tall, "#3a3f4c", 6); b.c(cx + 35, 60 - tall, 3.6, "#fff0b0");
        const hx = cx + 3, hy = 32 - tall + bob;
        b.c(hx, hy, 15, L.skin);
        b.e(hx - 8, hy + 2, 7, 11, L.hair);
        b.e(hx + 15, hy + 2, 3.6, 3.1, L.rednose ? "#e0564a" : L.skin);
        b.c(hx + 8, hy - 2, 2, INK);
        b.l(hx + 4, hy - 7, hx + 11, hy - 7, L.hair, 1.8);
        if (L.stache) b.e(hx + 8, hy + 7, 8, 3, L.stache);
        if (L.beard) b.e(hx + 3, hy + 9, 12, 8, L.beard);
        if (L.tail) { b.l(hx - 14, hy - 2, hx - 22, hy + 10, L.hair, 6); }
        if (L.bow) b.g([[hx - 2, hy + 18], [hx + 8, hy + 14], [hx + 8, hy + 22]], "#a33");
        hat(b, L, hx, hy, 1);
        return;
    }
    const front = f === 4 || f === 5 || f >= 8, back = f === 6 || f === 7;
    const hx = cx, hy = (f === GF.nap ? 42 : 32) - tall;
    if (f === GF.nap) {
        // Slumped on a stool, chin on chest.
        b.e(cx, 100, 22, 7, "#4a3626"); b.l(cx - 14, 102, cx - 18, g, "#2e2018", 5); b.l(cx + 14, 102, cx + 18, g, "#2e2018", 5);
        b.e(cx, 74, W, 26, L.coat, L.coat2);
        b.l(cx - W, 72, cx - 4, 88, L.coat2, 9); b.l(cx + W, 72, cx + 4, 88, L.coat2, 9);
        b.c(hx, hy + 6, 15, L.skin); b.e(hx, hy + 14, 11, 5, L.stache ?? L.skin);
        b.l(hx - 8, hy + 6, hx - 2, hy + 7, INK, 1.6); b.l(hx + 2, hy + 7, hx + 8, hy + 6, INK, 1.6);
        hat(b, L, hx, hy + 6, 0);
        return;
    }
    const ph = (f - 4) * Math.PI, st = f === 4 || f === 6 ? 3 : -3;
    legs(cx - 7, cx - 8, st > 0 ? 3 : 0, L.coat2); legs(cx + 7, cx + 8, st < 0 ? 3 : 0, L.coat2); void ph;
    b.e(cx, 62 - tall / 2, W, 25 + tall / 2, L.coat, L.coat2);
    b.l(cx - W, 86, cx + W, 86, "#14141c", 4);
    if (front && !back) { b.l(cx, 44, cx, 84, L.coat2, 1.6); for (let i = 0; i < 3; i++) b.c(cx + 3, 52 + i * 11, 1.6, L.trim); b.c(cx, 86, 3, L.trim); if (L.bow) b.g([[cx, 44], [cx - 8, 40], [cx - 8, 48]], "#a33"), b.g([[cx, 44], [cx + 8, 40], [cx + 8, 48]], "#a33"); }
    if (f === GF.shrug) { b.l(cx - W, 54, cx - W - 14, 46, L.coat, 9); b.l(cx + W, 54, cx + W + 14, 46, L.coat, 9); b.c(cx - W - 16, 42, 5, L.skin); b.c(cx + W + 16, 42, 5, L.skin); }
    else if (f === GF.shock) { b.l(cx - W, 54, cx - W - 8, 30, L.coat, 9); b.l(cx + W, 54, cx + W + 8, 30, L.coat, 9); b.c(cx - W - 8, 26, 5, L.skin); b.c(cx + W + 8, 26, 5, L.skin); }
    else if (f === GF.hold) { b.l(cx - W, 56, cx - 14, 40, L.coat, 9); b.l(cx + W, 56, cx + 14, 40, L.coat, 9); }
    else {
        b.l(cx - W, 52, cx - W - 3, 76, L.coat, 9); b.c(cx - W - 3, 78, 4.6, L.skin);
        b.l(cx + W, 52, cx + W + 3, 76, L.coat, 9); b.c(cx + W + 3, 78, 4.6, L.skin);
        b.l(cx + W + 3, 78, cx + W + 3, 90, "#3a3f4c", 6); b.c(cx + W + 3, 91, 3.6, "#fff0b0");
    }
    if (back) {
        b.c(hx, hy, 15, L.hair);
        if (L.tail) b.l(hx, hy + 6, hx, hy + 22, L.hair, 7);
        hat(b, L, hx, hy, 0, true);
        return;
    }
    b.c(hx, hy, 15, L.skin);
    b.e(hx - 13, hy + 2, 3, 4, L.skin); b.e(hx + 13, hy + 2, 3, 4, L.skin);
    if (L.beard) b.e(hx, hy + 9, 13, 9, L.beard);
    const wide = f === GF.shock;
    b.c(hx - 6, hy - 2, wide ? 3.8 : 2.4, wide ? "#fff" : INK); b.c(hx + 6, hy - 2, wide ? 3.8 : 2.4, wide ? "#fff" : INK);
    if (wide) { b.c(hx - 6, hy - 2, 1.6, INK); b.c(hx + 6, hy - 2, 1.6, INK); b.e(hx, hy + 8, 3.4, 4.2, "#5a1a1a"); }
    b.l(hx - 10, hy - 8, hx - 3, hy - 7, L.hair, 1.8); b.l(hx + 3, hy - 7, hx + 10, hy - 8, L.hair, 1.8);
    b.e(hx, hy + 2, 2.8, 2.4, L.rednose ? "#e0564a" : "#c98f70");
    if (L.stache) { b.e(hx - 5, hy + 6, 7, 2.6, L.stache); b.e(hx + 5, hy + 6, 7, 2.6, L.stache); }
    if (f === GF.hold) b.l(hx - 5, hy + 9, hx + 5, hy + 9, "#7a3a3a", 1.5);
    if (L.tail) { b.e(hx - 14, hy + 4, 3, 8, L.hair); b.e(hx + 14, hy + 4, 3, 8, L.hair); }
    hat(b, L, hx, hy, 0);
}

// --- Dog ------------------------------------------------------------------------------------------

export const DF = { walk: 0, bark: 4, growl: 5, calm: 6 };
export const DOG_FRAMES = 8;
function dogFrame(b, f) {
    const tan = "#b98a56", tan2 = "#7e5730", white = "#eadfc8", g = 64;
    if (f >= 6) {   // belly up, feet in the air, gone
        b.e(46, 50, 30, 15, tan, tan2); b.e(46, 44, 21, 9, white);
        for (const [x, s] of [[26, 1], [36, -1], [58, 1], [68, -1]]) b.l(x, 40, x + s * 3, 26 + (f === 7 ? s : 0) * 2, tan, 6);
        b.e(78, 52, 13, 11, tan); b.e(84, 56, 7, 5, white); b.l(74, 50, 79, 49, INK, 1.8); b.l(82, 50, 87, 50, INK, 1.8);
        b.e(70, 58, 6, 4, tan2); b.l(16, 52, 8, f === 7 ? 42 : 58, tan, 4); b.l(56, 62, 60, 60, "#c0392b", 2);
        return;
    }
    const ph = f / 4 * Math.PI * 2, walk = f < 4, s = walk ? Math.sin(ph) * 7 : 0;
    const leg = (x, d, c) => { b.l(x, 42, x + d, g - 3, c, 7.5); b.e(x + d + 2, g - 2, 5.5, 3, white); };
    leg(26, -s, tan2); leg(60, s, tan2);
    b.e(44, 38, 29, 16, tan, tan2); b.e(50, 46, 20, 8, white);
    leg(32, s, tan); leg(54, -s, tan);
    b.l(16, 34, 6, f === 5 ? 38 : 22, tan, 4);
    const hx = 76, hy = f === 5 ? 34 : 28;
    b.l(64, 32, 70, 34, "#a33028", 7);
    for (let i = 0; i < 3; i++) b.g([[62 + i * 4, 32], [64 + i * 4, 25], [66 + i * 4, 32]], "#d6dae2");
    b.e(hx, hy, 15, 13, tan, tan2); b.e(hx + 7, hy + 6, 10, 7.5, white);
    b.g([[hx - 12, hy - 8], [hx - 19, hy + 5], [hx - 8, hy + 2]], tan2);
    b.e(hx + 13, hy + 2, 3.4, 2.6, INK);
    b.c(hx + 3, hy - 3, 2, INK); b.l(hx - 1, hy - 8, hx + 6, hy - 6, tan2, 2.4);
    if (f === 4) { b.e(hx + 7, hy + 12, 7, 5, "#5a1a22"); b.e(hx + 7, hy + 14, 4, 2, "#e0707c"); }
    else b.l(hx + 2, hy + 10, hx + 14, hy + 8, INK, 1.4);
}

// --- Props ----------------------------------------------------------------------------------------

export const THEME_INDEX = { museum: 0, hotel: 1, opera: 2, manor: 3, bank: 4 };

function statue(p, f) {
    const b = new Pen(p);
    if (f === 0) {          // bust of a Very Important Fisherman
        b.e(32, 104, 22, 6, "#00000055");
        b.l(32, 100, 32, 62, "#b9bcc6", 24); b.e(32, 100, 19, 5, "#d6d8df"); b.e(32, 60, 17, 5, "#e0e2e8");
        b.e(32, 44, 16, 14, "#cfd2da", "#9da2b0"); b.c(32, 26, 12, "#dfe1e7", "#aeb2c0"); b.l(28, 30, 36, 30, "#8f93a2", 1.5); b.e(32, 16, 11, 5, "#bfc2cc");
    } else if (f === 1) {   // potted palm
        b.e(32, 104, 22, 6, "#00000055");
        b.g([[18, 76], [46, 76], [42, 102], [22, 102]], "#a55a38"); b.e(32, 76, 15, 4, "#42261a");
        for (const [x, y] of [[4, 30], [12, 12], [32, 4], [52, 12], [60, 30], [2, 52], [62, 52]]) { b.l(32, 74, x, y, "#2e6b4c", 5); b.l(32, 74, (32 + x) / 2 + 4, (74 + y) / 2, "#3f8a62", 3); }
    } else if (f === 2) {   // gilded column with a tragic mask
        b.e(32, 104, 22, 6, "#00000055");
        b.l(32, 102, 32, 20, "#b58a3e", 26); for (let i = 0; i < 4; i++) b.l(22 + i * 7, 102, 22 + i * 7, 20, "#8a6426", 2);
        b.e(32, 102, 19, 5, "#e0b252"); b.e(32, 18, 19, 6, "#e0b252"); b.e(32, 54, 12, 14, "#f4ead2"); b.c(27, 50, 2.5, "#2a1a1a"); b.c(37, 50, 2.5, "#2a1a1a"); b.e(32, 61, 5, 3, "#2a1a1a");
    } else if (f === 3) {   // suit of armour, holding a fish-fork
        b.e(32, 104, 22, 6, "#00000055");
        b.l(24, 100, 24, 72, "#8d97a6", 10); b.l(40, 100, 40, 72, "#7a8494", 10);
        b.e(32, 56, 16, 20, "#b6bfcb", "#6d7787"); b.c(32, 28, 10, "#c5cdd8", "#79849a"); b.l(24, 28, 40, 28, "#232833", 2.5); b.g([[32, 18], [28, 6], [37, 8]], "#c0392b");
        b.l(52, 102, 52, 10, "#6a4a2a", 3.4); b.g([[48, 12], [52, 0], [56, 12]], "#d6dae2");
    } else {                // fluted bank pillar
        b.e(32, 104, 22, 6, "#00000055");
        b.l(32, 102, 32, 20, "#bfb9a4", 28); for (let i = 0; i < 5; i++) b.l(20 + i * 6, 102, 20 + i * 6, 20, "#8f8975", 1.6);
        b.e(32, 102, 21, 5, "#d9d3bd"); b.e(32, 16, 22, 6, "#d9d3bd"); b.e(32, 10, 18, 4, "#ebe5cf");
    }
    p.outline("#0b0c15");
}

function vase(p, f) {
    const b = new Pen(p);
    if (f === 0) {          // ming-ish
        b.e(24, 60, 12, 3, "#00000055");
        b.e(24, 38, 15, 19, "#dfe8f4", "#9cb2d0"); b.g([[17, 8], [31, 8], [29, 22], [19, 22]], "#dfe8f4"); b.e(24, 8, 9, 3, "#2f5da0");
        b.l(10, 36, 38, 36, "#2f5da0", 3); b.l(12, 44, 36, 44, "#2f5da0", 2); b.c(24, 28, 3, "#2f5da0");
    } else if (f === 1) {   // a tower of teacups
        b.e(24, 60, 13, 3, "#00000055");
        for (let i = 0; i < 4; i++) { const w = 13 - i; b.e(24 + (i % 2) * 2 - 1, 52 - i * 12, w, 6, "#f4eddc", "#c9b896"); b.e(24 + (i % 2) * 2 - 1, 47 - i * 12, w, 2.6, "#7a2438"); }
    } else if (f === 2) {   // a composer's plaster head
        b.e(24, 60, 12, 3, "#00000055");
        b.e(24, 54, 13, 6, "#d8c9a8"); b.e(24, 44, 11, 9, "#efe4cc", "#c8b896"); b.c(24, 24, 12, "#f4ead2", "#cbbb99"); b.e(24, 13, 15, 8, "#e6d9bd"); b.l(19, 22, 22, 23, "#3a2a22", 1.6); b.l(26, 23, 29, 22, "#3a2a22", 1.6);
    } else if (f === 3) {   // ginger jar
        b.e(24, 60, 13, 3, "#00000055");
        b.e(24, 40, 17, 18, "#3f8a6e", "#1f4f40"); b.e(24, 20, 12, 5, "#d6b35a"); b.c(24, 14, 3.5, "#f0d07a"); b.l(10, 40, 38, 40, "#d6b35a", 2);
    } else if (f === 4) {   // tottering gold bars
        b.e(24, 60, 14, 3, "#00000055");
        for (const [x, y] of [[14, 50], [32, 50], [23, 40], [18, 30], [28, 20]]) { b.g([[x - 9, y + 7], [x + 9, y + 7], [x + 6, y - 2], [x - 6, y - 2]], "#e8bc4a"); b.g([[x - 6, y - 2], [x + 6, y - 2], [x + 3, y - 5], [x - 3, y - 5]], "#ffe08a"); }
    } else {                // oil lamp, the one you want to knock over
        b.e(24, 60, 11, 3, "#00000055");
        b.e(24, 54, 12, 4, "#8a6a30"); b.e(24, 44, 11, 10, "#d4a94e", "#8a6426"); b.l(24, 36, 24, 26, "#8a6426", 4);
        b.e(24, 18, 9, 13, "#ffe9b0aa"); b.e(24, 21, 3.6, 6.5, "#fff3c8"); b.e(24, 6, 8, 2.4, "#3a3f4c");
    }
    p.outline("#0b0c15");
}

function loot(p, f) {
    const b = new Pen(p);
    if (f === 0) {          // sardine tin
        b.e(20, 32, 15, 3, "#00000066");
        b.e(20, 20, 17, 11, "#c7ced8", "#7c8796"); b.e(20, 19, 14, 8.4, "#2f3a4c");
        for (const [x, y] of [[13, 16], [18, 22], [24, 15], [28, 21]]) { b.e(x, y, 6, 2.4, "#c9d7e4", "#8ba0b4"); }
    } else if (f === 1) {   // jewelled collar
        b.e(20, 32, 13, 3, "#00000066");
        for (let a = 0; a < 6.3; a += 0.15) b.l(20 + Math.cos(a) * 13, 18 + Math.sin(a) * 11, 20 + Math.cos(a + 0.15) * 13, 18 + Math.sin(a + 0.15) * 11, "#d8344a", 4.5);
        b.c(20, 32, 5, "#bfe8ff", "#5aa6e0"); b.c(19, 30.6, 1.6, "#fff");
    } else if (f === 2) {   // catnip pouch
        b.e(20, 34, 12, 3, "#00000066");
        b.e(20, 24, 13, 12, "#5a9a5e", "#2e6236"); b.g([[14, 13], [26, 13], [29, 6], [11, 6]], "#6fb574"); b.l(13, 13, 27, 13, "#e8d27a", 2.4);
        b.l(16, 22, 24, 28, "#c7e8b0", 2); b.l(24, 22, 16, 28, "#c7e8b0", 2);
    } else {                // pot of caviar
        b.e(20, 34, 12, 3, "#00000066");
        b.g([[8, 16], [32, 16], [29, 32], [11, 32]], "#3b5b82"); b.e(20, 16, 13, 5, "#d7dde6"); b.e(20, 15.6, 10.5, 3.8, "#191b26");
        for (const [x, y] of [[16, 15], [20, 14], [24, 16], [19, 17]]) b.c(x, y, 1.4, "#5f6a7c");
        b.l(10, 24, 30, 24, "#d6b35a", 2);
    }
    p.outline("#0b0c15");
}

const FISH = [["#ffd76a", "#c8862a", "#fff2b8"], ["#ff9f8a", "#c0503e", "#ffd8c8"], ["#d6e4f2", "#7f97b0", "#ffffff"], ["#6fe0a8", "#1f8a62", "#c8ffe0"], ["#8ad0ff", "#2a6ec8", "#e0f6ff"]];
function fish(p, f) {
    const b = new Pen(p), [c, d, l] = FISH[f];
    b.e(36, 42, 22, 3.5, "#00000055");
    b.g([[8, 10], [20, 22], [8, 36]], d);
    b.e(40, 23, 26, 13, c, d);
    b.g([[34, 11], [48, 3], [50, 12]], d); b.g([[36, 34], [46, 42], [46, 33]], d);
    b.e(44, 15, 13, 3, l + "aa");
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) b.c(22 + i * 8 + (j % 2) * 3, 17 + j * 6, 2.6, d + "66");
    b.c(57, 20, 3.6, "#fff"); b.c(58, 20, 2, "#141420");
    b.l(62, 28, 54, 29, d, 1.6);
    p.outline("#14101a");
}

function box(p, f) {
    const b = new Pen(p);
    b.e(32, 58, 27, 5, "#00000066");
    const K = "#b98e5c", K2 = "#8a6538", K3 = "#6e4e2a";
    b.g([[7, 24], [57, 24], [57, 56], [7, 56]], K2);
    b.g([[7, 24], [57, 24], [57, 28], [7, 28]], K);
    b.l(32, 24, 32, 56, "#d6b98a", 5);
    b.g([[40, 46], [46, 38], [52, 46]], K3); b.l(46, 46, 46, 52, K3, 2.4);
    if (f === 0) {      // flaps closed
        b.g([[7, 24], [57, 24], [51, 12], [13, 12]], K);
        b.l(32, 12, 32, 24, K3, 1.6);
    } else {            // ears and a pair of eyes, watching
        b.g([[7, 24], [57, 24], [51, 16], [13, 16]], K3);
        b.g([[20, 24], [22, 8], [30, 20]], "#232136"); b.g([[44, 24], [42, 8], [34, 20]], "#232136");
        b.e(32, 24, 13, 7, "#232136"); b.g([[20, 24], [44, 24], [44, 28], [20, 28]], K);
        b.e(26, 21, 3, 2.4, CAT.eye); b.e(38, 21, 3, 2.4, CAT.eye);
        b.l(22, 19.5, 30, 19.5, "#232136", 2); b.l(34, 19.5, 42, 19.5, "#232136", 2);
    }
    p.outline("#0b0c15");
}

function lantern(p) {
    const b = new Pen(p);
    b.e(24, 92, 15, 4, "#00000066");
    b.l(24, 90, 24, 34, "#2a2c38", 4.5); b.e(24, 90, 11, 3.6, "#3a3d4c"); b.l(14, 72, 34, 72, "#3a3d4c", 2);
    b.e(24, 18, 12, 15, "#ffd98a", "#f0a040"); b.e(24, 20, 5, 9, "#fff6d0");
    b.g([[11, 8], [37, 8], [31, 0], [17, 0]], "#2a2c38"); b.l(12, 33, 36, 33, "#2a2c38", 3);
    for (const x of [14, 24, 34]) b.l(x, 8, x, 33, "#2a2c3899", 1.3);
    p.outline("#0b0c15");
}

function cctv(p) {
    const b = new Pen(p);
    b.l(24, 2, 24, 12, "#23252f", 5);
    b.g([[9, 12], [39, 12], [36, 30], [12, 30]], "#c7ccd6"); b.g([[9, 12], [39, 12], [38, 16], [10, 16]], "#e8ebf0");
    b.c(24, 26, 7.5, "#23252f"); b.c(24, 26, 4, "#5a2a30"); b.c(22.5, 24.5, 1.4, "#ffb0b0");
    p.outline("#0b0c15");
}

function shards(p, f) {
    const b = new Pen(p);
    const cols = [["#dfe8f4", "#2f5da0"], ["#f4eddc", "#7a2438"], ["#f4ead2", "#c8b896"], ["#3f8a6e", "#d6b35a"], ["#e8bc4a", "#ffe08a"], ["#d4a94e", "#3a3f4c"]][f];
    let s = 41 + f * 13;
    const r = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
    b.e(24, 18, 22, 8, "#00000044");
    for (let i = 0; i < 12; i++) {
        const a = r() * 6.28, d = 3 + r() * 16, x = 24 + Math.cos(a) * d, y = 18 + Math.sin(a) * d * 0.5, w = 2 + r() * 4.5;
        b.g([[x - w, y + r() * 2], [x + r() * 2, y - w * 0.8], [x + w, y + r() * 2.5]], cols[i % 2]);
    }
}

const ICON = { paw: 0, leap: 1, vent: 2, box: 3, heart: 4, bone: 5, eye: 6, eyeShut: 7, sound: 8, mute: 9, buzz: 10, nobuzz: 11, menu: 12, lock: 13, replay: 14, flag: 15, fish: 16, yarn: 17, unbox: 18, tag: 19 };
export { ICON };
export const ICON_FRAMES = 20;
function icon(p, f) {
    const b = new Pen(p, 1), W = "#f4ead2", D = "#141522";
    if (f === ICON.paw) { b.e(32, 40, 14, 12, W); for (const [x, y] of [[14, 28], [24, 17], [40, 17], [50, 28]]) b.e(x, y, 6, 8, W); }
    else if (f === ICON.leap) { b.l(10, 52, 20, 30, W, 6); b.l(20, 30, 38, 18, W, 6); b.l(38, 18, 52, 26, W, 6); b.g([[50, 12], [58, 32], [40, 32]], W); }
    else if (f === ICON.vent) { b.g([[8, 10], [56, 10], [56, 54], [8, 54]], W); b.g([[12, 14], [52, 14], [52, 50], [12, 50]], D); for (let i = 0; i < 4; i++) b.l(14, 20 + i * 8, 50, 20 + i * 8, W, 4); }
    else if (f === ICON.box || f === ICON.unbox) { b.g([[10, 24], [54, 24], [54, 54], [10, 54]], "#c7a06c"); b.g([[10, 24], [54, 24], [46, 12], [18, 12]], "#e0bd8a"); b.l(32, 24, 32, 54, W, 4); if (f === ICON.unbox) { b.g([[26, 40], [32, 28], [38, 40]], D); } }
    else if (f === ICON.heart) { b.c(22, 24, 13, "#ee6a80"); b.c(42, 24, 13, "#ee6a80"); b.g([[10, 30], [54, 30], [32, 56]], "#ee6a80"); }
    else if (f === ICON.bone) { // a fishbone, the only currency that matters
        b.l(10, 32, 48, 32, W, 4.5); b.g([[46, 22], [60, 32], [46, 42]], W); b.c(50, 30, 1.8, D); b.g([[4, 22], [14, 32], [4, 42]], W);
        for (let i = 0; i < 3; i++) { b.l(20 + i * 8, 18, 24 + i * 8, 46, W, 3); }
    } else if (f === ICON.eye) { b.g([[6, 32], [20, 16], [44, 16], [58, 32], [44, 48], [20, 48]], W); b.c(32, 32, 11, "#ffb43a"); b.c(32, 32, 5, D); }
    else if (f === ICON.eyeShut) { b.l(8, 28, 22, 40, W, 5); b.l(22, 40, 42, 40, W, 5); b.l(42, 40, 56, 28, W, 5); }
    else if (f === ICON.sound || f === ICON.mute) {
        b.g([[10, 24], [22, 24], [34, 12], [34, 52], [22, 40], [10, 40]], W);
        if (f === ICON.sound) { b.l(42, 22, 48, 32, W, 3.5); b.l(48, 32, 42, 42, W, 3.5); b.l(50, 14, 58, 32, W, 3.5); b.l(58, 32, 50, 50, W, 3.5); }
        else { b.l(40, 22, 58, 42, RUST, 5); b.l(58, 22, 40, 42, RUST, 5); }
    } else if (f === ICON.buzz || f === ICON.nobuzz) {
        b.g([[22, 10], [42, 10], [42, 54], [22, 54]], W); b.g([[26, 15], [38, 15], [38, 46], [26, 46]], D);
        if (f === ICON.buzz) { b.l(12, 20, 8, 26, W, 3); b.l(8, 26, 12, 32, W, 3); b.l(12, 32, 8, 38, W, 3); b.l(52, 20, 56, 26, W, 3); b.l(56, 26, 52, 32, W, 3); b.l(52, 32, 56, 38, W, 3); }
        else { b.l(8, 8, 56, 56, RUST, 5); }
    } else if (f === ICON.menu) { for (let i = 0; i < 3; i++) b.l(12, 18 + i * 14, 52, 18 + i * 14, W, 6); }
    else if (f === ICON.lock) { b.l(20, 28, 20, 18, W, 5); b.l(44, 28, 44, 18, W, 5); b.l(20, 18, 32, 8, W, 5); b.l(44, 18, 32, 8, W, 5); b.g([[12, 28], [52, 28], [52, 56], [12, 56]], W); b.c(32, 40, 4, D); }
    else if (f === ICON.replay) { for (let a = 0.6; a < 5.6; a += 0.2) b.l(32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20, 32 + Math.cos(a + 0.2) * 20, 32 + Math.sin(a + 0.2) * 20, W, 6); b.g([[50, 4], [56, 26], [34, 20]], W); }
    else if (f === ICON.flag) { b.g([[12, 12], [52, 12], [52, 52], [12, 52]], W); }
    else if (f === ICON.fish) { b.e(36, 32, 20, 12, "#ffd76a", "#c8862a"); b.g([[6, 18], [20, 32], [6, 46]], "#c8862a"); b.c(47, 28, 2.6, D); }
    else if (f === ICON.yarn) { b.c(32, 32, 20, "#d8402f", "#8e1d1c"); for (const o of [-10, 0, 10]) b.l(16, 32 + o - 6, 48, 32 + o + 6, "#ffb0a0", 2); b.l(44, 48, 58, 56, "#d8402f", 3); }
    else if (f === ICON.tag) { b.g([[10, 20], [50, 20], [58, 32], [50, 44], [10, 44]], W); b.c(48, 32, 3, D); }
}

/** The whole cast. */
export function paintAll(A) {
    A.paint("cat", 96, 96, (p, f) => { catFrame(new Pen(p), new Pen(p), f); p.outline(CAT.ink); }, { frames: CAT_FRAMES, smooth: true });
    A.paint("cateyes", 96, 96, (p, f) => catFrame(NULLPEN, new Pen(p), f), { frames: CAT_FRAMES, smooth: true });
    for (const [k, L] of Object.entries(LOOKS)) A.paint("guard_" + k, 88, 124, (p, f) => { guardFrame(new Pen(p), L, f); p.outline("#0b0c15"); }, { frames: GUARD_FRAMES, smooth: true });
    A.paint("dog", 96, 72, (p, f) => { dogFrame(new Pen(p), f); p.outline("#14101a"); }, { frames: DOG_FRAMES, smooth: true });
    A.paint("statue", 64, 112, statue, { frames: 5, smooth: true });
    A.paint("vase", 48, 64, vase, { frames: 6, smooth: true });
    A.paint("loot", 40, 40, loot, { frames: 4, smooth: true });
    A.paint("fish", 72, 48, fish, { frames: 5, smooth: true });
    A.paint("box", 64, 64, box, { frames: 2, smooth: true });
    A.paint("lantern", 48, 96, lantern, { smooth: true });
    A.paint("cctv", 48, 36, cctv, { smooth: true });
    A.paint("shards", 48, 36, shards, { frames: 6, smooth: true });
    A.paint("icon", 64, 64, icon, { frames: ICON_FRAMES, smooth: true });
    // Soft light, for additive glows.
    A.paint("glow", 128, 128, (p) => {
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const d = Math.min(1, Math.hypot(x - 63.5, y - 63.5) / 63.5), a = (1 - d) * (1 - d), o = (y * 128 + x) * 4;
            p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = a * 255;
        }
    }, { smooth: true });
    A.paint("vignette", 256, 256, (p) => {
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const d = Math.hypot((x - 127.5) / 127.5, (y - 127.5) / 127.5) / 1.414, a = Math.pow(Math.max(0, d - 0.42) / 0.58, 1.7), o = (y * 256 + x) * 4;
            p.data[o] = 4; p.data[o + 1] = 5; p.data[o + 2] = 16; p.data[o + 3] = a * 235;
        }
    }, { smooth: true });
    A.paint("moon", 400, 400, (p) => {
        const c = 199.5, R = 170;
        for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
            const dx = x - c, dy = y - c, d = Math.hypot(dx, dy), o = (y * 400 + x) * 4;
            if (d > R + 1) continue;
            const n = 0.5 + 0.5 * Math.sin(x * 0.031 + Math.sin(y * 0.027) * 2.4) * Math.sin(y * 0.021 + Math.sin(x * 0.04) * 1.8);
            const edge = Math.min(1, R + 1 - d), v = 0.95 + n * 0.08 - (d / R) ** 3 * 0.1;
            p.data[o] = 236 * v; p.data[o + 1] = 240 * v; p.data[o + 2] = 250 * v; p.data[o + 3] = edge * 255;
        }
        for (const [x, y, r] of [[130, 140, 34], [250, 120, 22], [210, 240, 46], [120, 270, 20], [290, 210, 14], [170, 190, 12]]) p.circle(x, y, r, "#b4bfd466");
    }, { smooth: true });
    // A long skyline of grand buildings in silhouette.
    A.paint("skyline", 2048, 600, (p) => {
        let s = 77; const r = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
        const INKY = "#0c0f20";
        let x = 0;
        while (x < 2048) {
            const w = 120 + Math.floor(r() * 220), h = 180 + Math.floor(r() * 320), t = 600 - h, kind = Math.floor(r() * 4);
            p.rect(x, t, w, h, INKY);
            if (kind === 0) { for (let i = 0; i < w / 2; i += 1) p.rect(x + i, t - (i * 96) / w * 2, 1, (i * 96) / w * 2 + 1, INKY); for (let i = 0; i < w / 2; i += 1) p.rect(x + w - i, t - (i * 96) / w * 2, 1, (i * 96) / w * 2 + 1, INKY); }
            if (kind === 1) { p.ellipse(x + w / 2, t, w * 0.36, w * 0.3, INKY); p.rect(x + w / 2 - 2, t - w * 0.3 - 32, 4, 36, INKY); }
            if (kind === 2) for (let i = 0; i < w; i += 32) p.rect(x + i, t - 16, 16, 16, INKY);
            for (let wy = t + 24; wy < 560; wy += 44) for (let wx = x + 16; wx < x + w - 20; wx += 32) if (r() < 0.14) p.rect(wx, wy, 14, 22, r() < 0.7 ? "#ffc35a" : "#7fa0d0");
            x += w;
        }
    }, { smooth: true });
    A.paint("roof", 512, 200, (p) => {
        for (let y = 0; y < 200; y++) {
            const row = Math.floor(y / 26), off = (row & 1) * 22;
            for (let x = 0; x < 512; x++) {
                const o = (y * 512 + x) * 4, u = (x + off) % 44, v = y % 26, t = 1 - y / 200;
                const seam = u < 2 || v < 2, sc = seam ? 0.5 : 1 - (v / 26) * 0.26, n = 0.92 + 0.14 * Math.abs(Math.sin(Math.floor((x + off) / 44) * 12.9 + row * 78.2));
                const lit = (0.22 + t * t * 0.78) * sc * n;
                p.data[o] = 74 * lit; p.data[o + 1] = 92 * lit; p.data[o + 2] = 150 * lit; p.data[o + 3] = 255;
            }
        }
    }, { smooth: true });
    // Sable, enormous and pleased, for the title and rank screens.
    A.paint("catbig", 288, 288, (p) => { catFrame(new Pen(p, 3), new Pen(p, 3), CATF.sit); p.outline(CAT.ink); }, { smooth: true });
    A.paint("catlong", 288, 288, (p) => { catFrame(new Pen(p, 3), new Pen(p, 3), CATF.dangle); p.outline(CAT.ink); }, { smooth: true });
    A.paint("catbigeyes", 288, 288, (p) => catFrame(NULLPEN, new Pen(p, 3), CATF.sit), { smooth: true });
}
