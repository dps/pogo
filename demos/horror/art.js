// Everything painted: the world atlas, the torch's light mask, hands, the note. All from code, all in one palette of cold greys, porcelain and oxblood.
const hash = (x, y) => {
    let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
/** Value noise that tiles every `per` lattice cells. */
function noise(x, y, per) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
    const w = (a) => ((a % per) + per) % per;
    const a = hash(w(xi), w(yi)), b = hash(w(xi + 1), w(yi)), c = hash(w(xi), w(yi + 1)), d = hash(w(xi + 1), w(yi + 1));
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (u, v, per = 4, oct = 4) => {
    let s = 0, amp = 0.5, n = 0, p = per;
    for (let i = 0; i < oct; i++) { s += noise(u * p, v * p, p) * amp; n += amp; amp *= 0.5; p *= 2; }
    return s / n;
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const clamp01 = (t) => Math.max(0, Math.min(1, t));

// A scrawl alphabet. Each glyph is strokes in a 4x6 box. Used for the tally cards, the signs and the note in your pocket.
const GLYPHS = {
    A: ["0,6 2,0 4,6", "1,4 3,4"], B: ["0,0 0,6 3,6 4,5 3,3 0,3", "0,0 3,0 4,1.5 3,3"], C: ["4,1 3,0 1,0 0,2 0,4 1,6 3,6 4,5"], D: ["0,0 0,6 2.5,6 4,4 4,2 2.5,0 0,0"],
    E: ["4,0 0,0 0,6 4,6", "0,3 3,3"], F: ["4,0 0,0 0,6", "0,3 3,3"], G: ["4,1 3,0 1,0 0,2 0,4 1,6 3,6 4,4.5 4,3.4 2.5,3.4"], H: ["0,0 0,6", "4,0 4,6", "0,3 4,3"],
    I: ["2,0 2,6"], J: ["3.5,0 3.5,4.5 2.5,6 1,6 0,5"], K: ["0,0 0,6", "4,0 0,3.4 4,6"], L: ["0,0 0,6 4,6"], M: ["0,6 0,0 2,3 4,0 4,6"], N: ["0,6 0,0 4,6 4,0"],
    O: ["1,0 3,0 4,2 4,4 3,6 1,6 0,4 0,2 1,0"], P: ["0,6 0,0 3,0 4,1.5 3,3 0,3"], Q: ["1,0 3,0 4,2 4,4 3,6 1,6 0,4 0,2 1,0", "2.5,4.4 4,6"], R: ["0,6 0,0 3,0 4,1.5 3,3 0,3", "2,3 4,6"],
    S: ["4,1 3,0 1,0 0,1.4 1,3 3,3 4,4.6 3,6 1,6 0,5"], T: ["0,0 4,0", "2,0 2,6"], U: ["0,0 0,4.6 1,6 3,6 4,4.6 4,0"], V: ["0,0 2,6 4,0"], W: ["0,0 1,6 2,2.5 3,6 4,0"], X: ["0,0 4,6", "4,0 0,6"], Y: ["0,0 2,3 4,0", "2,3 2,6"], Z: ["0,0 4,0 0,6 4,6"],
    0: ["1,0 3,0 4,2 4,4 3,6 1,6 0,4 0,2 1,0"], 1: ["1,1 2,0 2,6"], 2: ["0,1 1,0 3,0 4,1.4 0,6 4,6"], 3: ["0,1 1,0 3,0 4,1.4 3,3 1.4,3", "3,3 4,4.6 3,6 1,6 0,5"], 4: ["3,6 3,0 0,4 4,4"], 5: ["4,0 0.5,0 0.2,3 3,2.6 4,4.2 3,6 1,6 0,5"], 6: ["3.6,0 1,1 0,4 1,6 3,6 4,4.4 3,3 1,3 0,4"], 7: ["0,0 4,0 1.4,6"], 8: ["1,0 3,0 3.6,1.4 3,3 1,3 0.4,1.4 1,0", "1,3 3,3 4,4.6 3,6 1,6 0,4.6 1,3"], 9: ["4,2 3,3 1,3 0,1.6 1,0 3,0 4,2 3,5 1,6"],
    ".": ["1.6,5.7 2,6"], ",": ["2,5.4 1.6,6.6"], "&": ["4,6 1,1.6 1.6,0 2.8,0 3,1.4 0,4 0.6,6 2.4,6 4,3.6"], "'": ["2,0 1.8,1.4"], ":": ["1.8,1.4 2,1.6", "1.8,4.4 2,4.6"], "-": ["0.6,3 3.4,3"],
};
/** Calls line(x0, y0, x1, y1) for each stroke of the text. `wob` gives it a shaky hand. */
export function strokes(text, x, y, size, line, wob = 0, seed = 1) {
    const k = size / 6;
    let cx = x, n = seed;
    for (const ch of text) {
        if (ch === " ") { cx += k * 3.4; continue; }
        const g = GLYPHS[ch];
        if (g) {
            const ox = (hash(n, 3) - 0.5) * wob * 2.4, oy = (hash(n, 7) - 0.5) * wob * 2.4;
            for (const s of g) {
                const pts = s.split(" ").map((p) => p.split(",").map(Number));
                for (let i = 0; i + 1 < pts.length; i++) {
                    const j = (hash(n, i * 11 + 1) - 0.5) * wob, q = (hash(n, i * 11 + 2) - 0.5) * wob, r = (hash(n, i * 11 + 3) - 0.5) * wob, t = (hash(n, i * 11 + 4) - 0.5) * wob;
                    line(cx + ox + (pts[i][0] + j) * k, y + oy + (pts[i][1] + q) * k, cx + ox + (pts[i + 1][0] + r) * k, y + oy + (pts[i + 1][1] + t) * k);
                }
            }
        }
        n++;
        cx += k * 5.3;
    }
    return cx;
}

// The atlas is 4x4 cells of 256 pixels. CELLS names them. uv() insets a little so mipmaps don't bleed.
export const ATLAS = 1024, TILE = 256;
/** A patch of pure white in the ceiling cell, for vertex-coloured parts of the merged factory mesh. */
export const WHITE = [228 / ATLAS, 640 / ATLAS];
export const MAT = { concrete: 0, brick: 1, wallpaper: 2, tin: 3, wood: 4, plate: 5, hazard: 6, door: 7, ceiling: 8, lino: 9, locker: 10, stone: 11, wet: 12, belt: 13, cards: 14, poster: 15 };
export const uvOf = (mat) => {
    const cx = mat % 4, cy = Math.floor(mat / 4), pad = 6 / ATLAS, s = TILE / ATLAS;
    return [cx * s + pad, cy * s + pad, (cx + 1) * s - pad, (cy + 1) * s - pad];
};

const PAINTERS = {
    concrete(u, v) {
        const n = fbm(u, v, 4, 5), f = fbm(u + 0.3, v + 0.7, 16, 3);
        let c = mix([70, 74, 80], [120, 122, 122], n);
        c = shade(c, 0.82 + f * 0.32);
        if (fbm(u, v, 3, 3) > 0.6) c = shade(c, 0.68);               // oil
        if (u < 0.008 || v < 0.008) c = shade(c, 0.55);               // expansion joint
        return c;
    },
    brick(u, v) {
        const rows = 7, row = Math.floor(v * rows), bu = u * 3.5 + (row % 2) * 0.5, bv = v * rows, fu = bu - Math.floor(bu), fv = bv - row;
        const mortar = fu < 0.05 || fv < 0.08, id = hash(Math.floor(bu) % 4, row);
        const n = fbm(u, v, 8, 4);
        let c = mortar ? [52, 54, 54] : mix([96, 56, 48], [132, 74, 58], id);
        c = shade(c, 0.7 + n * 0.55);
        // Institutional paint up to a dado, gone chalky and streaked with years of damp.
        if (v > 0.5) {
            let pc = mix([84, 104, 98], [108, 128, 118], n);
            if (mortar) pc = shade(pc, 0.8);
            pc = shade(pc, 0.86 + fbm(u * 3, v * 0.25, 6, 3) * 0.3);
            c = pc;
        }
        if (Math.abs(v - 0.5) < 0.014) c = [34, 40, 42];
        return shade(c, 0.9 + fbm(u, v * 0.4, 3, 2) * 0.2);
    },
    wallpaper(u, v) {
        // Faded stripes and a little damask bud, with brown water marks.
        const stripe = Math.sin(u * Math.PI * 12) > 0.2;
        const px = (u * 3) % 1 - 0.5, py = (v * 3 + (Math.floor(u * 3) % 2) * 0.5) % 1 - 0.5, bud = px * px * 3 + py * py < 0.03;
        let c = stripe ? [150, 126, 96] : [128, 106, 80];
        if (bud) c = [96, 66, 60];
        const n = fbm(u, v, 4, 4);
        c = mix(c, [78, 60, 44], clamp01((n - 0.5) * 2.6));
        if (v > 0.76) c = mix([70, 44, 30], [92, 60, 40], fbm(u, v, 8, 3));    // dado
        return shade(c, 0.85);
    },
    tin(u, v) {
        const r = Math.sin(u * Math.PI * 16), n = fbm(u, v, 5, 4);
        let c = mix([76, 92, 100], [104, 118, 122], 0.5 + r * 0.5);
        if (fbm(u, v * 0.5, 4, 4) > 0.56) c = mix(c, [112, 62, 36], 0.6);
        return shade(c, 0.74 + n * 0.4);
    },
    wood(u, v) {
        const plank = Math.floor(v * 4), g = fbm(u * 0.4 + plank * 0.37, v * 3, 8, 4), id = hash(plank, 5);
        let c = mix([70, 46, 28], [122, 84, 50], g * 0.7 + id * 0.3);
        if ((v * 4) % 1 < 0.03) c = [26, 18, 14];
        return c;
    },
    plate(u, v) {
        const n = fbm(u, v, 6, 4);
        let c = mix([58, 68, 74], [86, 96, 100], n);
        const px = (u * 4) % 1, py = (v * 4) % 1;
        if (px < 0.02 || py < 0.02) c = shade(c, 0.55);
        const rx = px - 0.12, ry = py - 0.12;
        if (rx * rx + ry * ry < 0.0028) c = shade(c, 1.35);
        if (fbm(u + 0.2, v, 4, 4) > 0.62) c = mix(c, [104, 58, 34], 0.55);
        return c;
    },
    hazard(u, v) {
        const on = ((u + v) * 4) % 1 < 0.5, n = fbm(u, v, 8, 3);
        return shade(on ? [196, 150, 40] : [32, 30, 30], 0.7 + n * 0.4);
    },
    door(u, v) {
        const n = fbm(u * 2, v * 0.4, 8, 4);
        let c = mix([66, 80, 70], [92, 106, 92], n);
        const inPanel = (a, b, x0, y0, x1, y1) => a > x0 && a < x1 && b > y0 && b < y1;
        if (inPanel(u, v, 0.16, 0.12, 0.84, 0.46)) c = [20, 26, 30];                  // wired glass
        if (inPanel(u, v, 0.16, 0.12, 0.84, 0.46) && (((u + v) * 14) % 1 < 0.08 || ((u - v + 1) * 14) % 1 < 0.08)) c = [52, 60, 62];
        if (inPanel(u, v, 0.16, 0.56, 0.84, 0.92)) c = shade(c, 0.8);
        if (inPanel(u, v, 0.76, 0.5, 0.92, 0.54)) c = [170, 150, 96];                 // handle
        return shade(c, u < 0.03 || u > 0.97 || v < 0.03 ? 0.5 : 1);
    },
    ceiling(u, v) {
        const n = fbm(u, v, 5, 4);
        let c = mix([30, 34, 38], [52, 54, 56], n);
        if ((u * 2) % 1 < 0.04) c = [16, 18, 20];
        return c;
    },
    lino(u, v) {
        const on = (Math.floor(u * 4) + Math.floor(v * 4)) % 2 === 0, n = fbm(u, v, 8, 3);
        return shade(on ? [120, 104, 82] : [62, 72, 66], 0.72 + n * 0.4);
    },
    locker(u, v) {
        const n = fbm(u, v * 0.5, 8, 3);
        let c = mix([58, 80, 86], [82, 104, 106], n);
        const edge = u < 0.03 || u > 0.97 || (u > 0.47 && u < 0.53) || v < 0.02 || v > 0.98;
        if (edge) c = [20, 26, 28];
        const su = (u * 2) % 1;
        if (v > 0.1 && v < 0.26 && su > 0.2 && su < 0.8 && (v * 60) % 1 < 0.5) c = [14, 16, 18];    // vents
        if (v > 0.44 && v < 0.52 && su > 0.76 && su < 0.88) c = [150, 150, 140];
        if (v > 0.32 && v < 0.38 && su > 0.3 && su < 0.7) c = [176, 166, 136];                         // name card
        return c;
    },
    stone(u, v) {
        const rows = 4, row = Math.floor(v * rows), bu = u * 2 + (row % 2) * 0.5, fu = bu - Math.floor(bu), fv = v * rows - row, id = hash(Math.floor(bu) % 2, row);
        const edge = Math.min(fu, 1 - fu) * 2 < 0.06 || Math.min(fv, 1 - fv) < 0.05, n = fbm(u, v, 8, 5);
        let c = edge ? [26, 28, 28] : mix([62, 62, 60], [92, 88, 80], id * 0.5 + n * 0.5);
        c = mix(c, [40, 64, 52], clamp01((fbm(u, v, 4, 3) - 0.5) * 3) * clamp01(v * 1.4));     // damp creeping up
        return c;
    },
    wet(u, v) {
        const n = fbm(u, v, 6, 5);
        let c = mix([36, 38, 40], [66, 66, 62], n);
        if (fbm(u + 0.6, v + 0.2, 3, 3) > 0.56) c = [22, 26, 30];
        return c;
    },
    belt(u, v) {
        const n = fbm(u, v, 12, 3);
        let c = mix([22, 24, 26], [44, 46, 46], n);
        if ((u * 4) % 1 < 0.1) c = shade(c, 1.5);
        if (v < 0.06 || v > 0.94) c = [150, 118, 32];
        return c;
    },
};

function painterPixels(p) {
    const data = p.data, names = Object.keys(MAT);
    for (let i = 0; i < names.length; i++) {
        const name = names[i], fn = PAINTERS[name], ox = (i % 4) * TILE, oy = Math.floor(i / 4) * TILE;
        if (!fn) continue;
        for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
            const c = fn(x / TILE, y / TILE), o = ((oy + y) * ATLAS + ox + x) * 4;
            data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
        }
    }
    const pad = 2 * TILE;
    for (let y = pad; y < pad + TILE; y++) for (let x = 192; x < TILE; x++) { const o = (y * ATLAS + x) * 4; data[o] = data[o + 1] = data[o + 2] = 255; }
}

function paintCards(p) {
    // Tally cards, the sign and the safety board, in the last two cells.
    const ox = 2 * TILE, oy = 3 * TILE;
    p.rect(ox, oy, TILE, TILE, "#c9b98f");
    for (let y = 0; y < TILE; y += 10) p.rect(ox, oy + y, TILE, 1, "#a8986f");
    p.rect(ox, oy, TILE, 40, "#7c2a26");
    const ink = (t, x, y, s, col = "#2a2320", w = 2) => strokes(t, ox + x, oy + y, s, (a, b, c, d) => p.line(a, b, c, d, col, w), 0.25);
    ink("TALLY", 12, 10, 20, "#efe3c4", 3);
    ink("STOCK", 12, 56, 22);
    ink("ALL PRESENT", 12, 96, 16);
    ink("ALL PRESENT", 12, 130, 16);
    ink("ALL PRESENT", 12, 164, 16);
    ink("ONE MORE", 12, 204, 20, "#7c2a26", 3);

    const px = 3 * TILE, py = 3 * TILE;
    p.rect(px, py, TILE, TILE, "#23302f");
    p.rect(px + 6, py + 6, TILE - 12, TILE - 12, "#cfc4a2");
    p.rect(px + 6, py + 6, TILE - 12, 56, "#7c2a26");
    const pk = (t, x, y, s, col = "#2b2622", w = 3) => strokes(t, px + x, py + y, s, (a, b, c, d) => p.line(a, b, c, d, col, w));
    pk("HOLLIS & WREN", 16, 14, 16, "#efe3c4", 2);
    pk("DOLL WORKS", 16, 38, 14, "#efe3c4", 2);
    pk("NIGHTS WITHOUT", 16, 76, 15);
    pk("INCIDENT", 16, 100, 15);
    pk("18,250", 22, 134, 36, "#7c2a26", 5);
    pk("EVERYONE GOES", 16, 190, 15);
    pk("HOME", 16, 214, 15);
}

export function paintArt(game) {
    const A = game.assets;
    A.paint("atlas", ATLAS, ATLAS, (p) => { painterPixels(p); paintCards(p); }, { smooth: true });

    // The torch. Transparent in the middle, a soft dirty edge, and the dark ring every cheap reflector throws.
    A.paint("mask", 256, 256, (p) => {
        const d = p.data;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const dx = (x + 0.5 - 128) / 128, dy = (y + 0.5 - 128) / 128, r = Math.hypot(dx, dy) * 2.1;
            const ang = Math.atan2(dy, dx), wob = 1 + Math.sin(ang * 3 + 1) * 0.012 + Math.sin(ang * 7) * 0.008;
            const q = r * wob;
            let a = smooth(clamp01((q - 0.72) / 0.5));
            a += Math.exp(-((q - 0.58) ** 2) / 0.002) * 0.1 + Math.exp(-((q - 0.34) ** 2) / 0.001) * 0.05;
            a = clamp01(a) + (hash(x, y) - 0.5) * 0.012;
            const o = (y * 256 + x) * 4;
            d[o] = 2; d[o + 1] = 3; d[o + 2] = 9; d[o + 3] = clamp01(a) * 255;
        }
    }, { smooth: true });
    A.paint("core", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const r = Math.hypot(x + 0.5 - 64, y + 0.5 - 64) / 64, a = clamp01(1 - r) ** 2;
            const o = (y * 128 + x) * 4;
            d[o] = 255; d[o + 1] = 226; d[o + 2] = 170; d[o + 3] = a * 255;
        }
    }, { smooth: true });
    A.paint("grain", 128, 128, (p) => {
        const d = p.data;
        for (let i = 0; i < d.length; i += 4) { const v = hash(i, 91) * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    }, { smooth: false });
    A.paint("vignette", 128, 128, (p) => {
        const d = p.data;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
            const dx = (x + 0.5 - 64) / 64, dy = (y + 0.5 - 64) / 64, a = clamp01((Math.max(Math.abs(dx), Math.abs(dy)) ** 2 * 0.6 + Math.hypot(dx, dy) * 0.5 - 0.5) * 1.4);
            const o = (y * 128 + x) * 4;
            d[o] = 0; d[o + 1] = 0; d[o + 2] = 0; d[o + 3] = a * 255;
        }
    }, { smooth: true });

    // Your hand and torch, bottom right of the view. Drawn per pixel along the barrel, so it shades like a real cylinder.
    A.paint("torch", 384, 384, (p) => {
        const d = p.data, S = 384, cos = Math.cos(-2.32), sin = Math.sin(-2.32), put = (o, c, a = 255) => { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; };
        const metal = [58, 62, 68], rubber = [24, 25, 28], brass = [150, 118, 60], skin = [196, 148, 118], sleeve = [40, 50, 50];
        const cyl = (c, v, r, gloss) => { const q = v / r, k = 0.45 + Math.sqrt(Math.max(0, 1 - q * q)) * 0.65 - q * 0.22, g = Math.exp(-((q + 0.42) ** 2) * 26) * gloss; return [c[0] * k + 255 * g, c[1] * k + 255 * g, c[2] * k + 255 * g]; };
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
            const px = x + 0.5 - S * 0.56, py = y + 0.5 - S * 0.62, u = px * cos + py * sin, v = -px * sin + py * cos, o = (y * S + x) * 4;   // u runs up the barrel to the lens
            let col = null;
            // Sleeve and wrist come from the corner.
            const wr = Math.hypot((x - S * 0.92) * 0.8, (y - S * 1.02) * 0.9) ;
            if (wr < 128) col = cyl(sleeve, x - S * 0.9, 150, 0.03);
            if (u > -128 && u < 92 && Math.abs(v) < 30) col = cyl(u < -72 ? metal : rubber, v, 30, u < -72 ? 0.5 : 0.1);
            if (u >= -72 && u < 92 && Math.abs(v) < 30 && (Math.floor(u / 7) % 2 === 0)) col = cyl(metal, v, 30, 0.2);
            if (u >= 92 && u < 128 && Math.abs(v) < 30 + (u - 92) * 0.45) col = cyl(metal, v, 30 + (u - 92) * 0.45, 0.6);
            if (u >= 128 && u < 150 && Math.abs(v) < 47) col = cyl(u < 136 ? brass : metal, v, 47, 0.8);
            if (u >= 150 && u < 154 && Math.abs(v) < 44) col = [255, 240, 205];
            // Palm behind, fingers wrapped over the barrel, a thumb on the switch.
            const palm = Math.hypot((u + 34) / 88, (v - 30) / 58);
            if (palm < 1 && v > 6) col = cyl(skin, v - 40, 80, 0.05);
            for (let i = 0; i < 4; i++) {
                const fu = -86 + i * 33, fr = 16.5 - Math.abs(i - 1.3) * 1.1, ev = Math.max(0, Math.abs(v + 2) - 34), q = Math.hypot(u - fu, ev);
                if (q < fr) { const k = 1.05 - (q / fr) ** 2 * 0.45 + (v < 0 ? 0.08 : 0); col = [skin[0] * k, skin[1] * k * 0.96, skin[2] * k * 0.92]; }
                if (Math.abs(q - fr) < 1.4 && q < fr + 1) col = [84, 52, 42];
            }
            if (col) put(o, [Math.min(255, col[0]), Math.min(255, col[1]), Math.min(255, col[2])]);
        }
        // The thumb lies along the barrel towards the switch.
        p.poly([[0, 0], [0, 0], [0, 0]], "#00000000");
    }, { smooth: true });

    // Your hand, when it is not yours any more. Bisque, jointed at the wrist, fingers a little too long.
    A.paint("dollhand", 256, 256, (p) => {
        p.poly([[84, 256], [104, 206], [172, 206], [196, 256]], "#4a1a22");
        p.ellipse(138, 206, 40, 10, "#c9bba8", "#8d7f70");
        p.ellipse(138, 168, 42, 44, "#e6dacb", "#a8988a");
        const fingers = [[100, 150, 84, 98, 15], [122, 138, 114, 76, 16], [148, 136, 150, 72, 16], [172, 148, 186, 92, 14]];
        for (const [x0, y0, x1, y1, w] of fingers) {
            p.line(x0, y0, x1, y1, "#7a6a60", w + 4);
            p.line(x0, y0, x1, y1, "#ece0d2", w);
            const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
            p.circle(mx, my, w * 0.56, "#d8c9ba");
            p.circle(x1, y1, w * 0.5, "#ece0d2");
        }
        p.line(104, 186, 68, 160, "#7a6a60", 20);
        p.line(104, 186, 68, 160, "#ece0d2", 16);
        p.circle(68, 160, 8, "#ece0d2");
        p.line(116, 208, 164, 208, "#3a2424", 3);
    }, { smooth: true });

    // The inside of a locker door.
    A.paint("slats", 256, 256, (p) => {
        const d = p.data;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const slat = x > 54 && x < 202 && y > 58 && y < 206 && (y - 58) % 22 < 9;
            const o = (y * 256 + x) * 4, shadow = 8 + hash(x >> 3, y) * 8;
            d[o] = shadow; d[o + 1] = shadow * 1.2; d[o + 2] = shadow * 1.3; d[o + 3] = slat ? 0 : 255;
        }
    }, { smooth: true });

    // The scrap in your pocket.
    A.paint("note", 300, 220, (p) => {
        p.poly([[16, 18], [284, 8], [292, 200], [180, 212], [150, 204], [12, 210]], "#d9cda9", "#a99b76");
        for (let y = 40; y < 200; y += 26) p.line(20, y, 284, y - 3, "#a4b0b4", 1);
        const pen = (t, x, y, s, seed) => strokes(t, x, y, s, (a, b, c, d) => p.line(a, b, c, d, "#2b2230", 4), 0.55, seed);
        pen("TURN IT OFF.", 28, 56, 30, 4);
        pen("LET THEM.", 54, 126, 30, 19);
    }, { smooth: true });

    // A glint for doll eyes and small lamps, seen through the dark.
    A.paint("glint", 64, 64, (p) => {
        const d = p.data;
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const r = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) / 32, a = clamp01(1 - r) ** 3;
            const o = (y * 64 + x) * 4;
            d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = a * 255;
        }
    }, { smooth: true });
}
