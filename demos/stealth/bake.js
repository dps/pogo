// CAT BURGLAR. Paints a whole building floor into one texture: albedo first, then moon and lanterns multiplied through it.
// One big sprite keeps the map to a single draw call, and it re-lights when a lamp gets smashed.
import { LR, PERCH, SIGHT, T, flagAt } from "./world.js";

export const SCALE = 2;              // texels per world unit
const P = T * SCALE;                 // texels per tile

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const THEMES = {
    museum: {
        name: "Museum of Curious Fish", floor: "checker", alt: "parquet", a: "#98a2ae", b: "#6c7684", wood: "#8a5a36", carpet: "#1f5f62", carpet2: "#c79a4b",
        wall: "#3c6f73", wall2: "#2c565c", wains: "#4e3524", trim: "#d3a94f", cap: "#141a26", shelf: "#6e4a2e", shelfKind: "cabinet", table: "#c7c9cf", tableKind: "plinth",
        ambient: [0.34, 0.4, 0.6], moon: [0.72, 0.86, 1.12], lamp: [1.25, 0.82, 0.42],
    },
    hotel: {
        name: "The Grand Meridian", floor: "parquet", alt: "tile", a: "#a8a59c", b: "#5c5a66", wood: "#9c5f35", carpet: "#6e1d36", carpet2: "#d7a94a",
        wall: "#6d2a3f", wall2: "#541d30", wains: "#d6c9ae", trim: "#d9ae55", cap: "#191420", shelf: "#7c4a2b", shelfKind: "books", table: "#ece4d2", tableKind: "cloth",
        ambient: [0.36, 0.35, 0.56], moon: [0.72, 0.84, 1.12], lamp: [1.3, 0.8, 0.4],
    },
    opera: {
        name: "Opéra Noctis", floor: "boards", alt: "checker", a: "#c9bda6", b: "#3a2230", wood: "#6d4730", carpet: "#8a1a2b", carpet2: "#e0b252",
        wall: "#7c1b2c", wall2: "#5b1120", wains: "#32161e", trim: "#e0b252", cap: "#160e16", shelf: "#55382a", shelfKind: "crates", table: "#7b5a3c", tableKind: "crate",
        ambient: [0.38, 0.32, 0.52], moon: [0.74, 0.8, 1.1], lamp: [1.3, 0.76, 0.4],
    },
    manor: {
        name: "Haddock Hall", floor: "planks", alt: "stone", a: "#8d8a80", b: "#5f5d58", wood: "#7a5230", carpet: "#27503d", carpet2: "#c79c4a",
        wall: "#2f5a46", wall2: "#234434", wains: "#573a24", trim: "#b98f45", cap: "#10170f", shelf: "#5e3e26", shelfKind: "books", table: "#6f4627", tableKind: "wood",
        ambient: [0.32, 0.4, 0.52], moon: [0.72, 0.88, 1.08], lamp: [1.28, 0.82, 0.42],
    },
    bank: {
        name: "First Fisheries Bank", floor: "marble", alt: "steel", a: "#3f5a5c", b: "#253a3f", wood: "#7a5a33", carpet: "#26395e", carpet2: "#c9a24d",
        wall: "#8f8872", wall2: "#6f6a58", wains: "#3a3f46", trim: "#d0a64e", cap: "#11151c", shelf: "#59646f", shelfKind: "drawers", table: "#9aa3ab", tableKind: "plinth",
        ambient: [0.32, 0.4, 0.58], moon: [0.7, 0.88, 1.15], lamp: [1.25, 0.86, 0.5],
    },
};

const NT = 256, noiseTab = new Float32Array(NT * NT);
{ let s = 12345; for (let i = 0; i < NT * NT; i++) { s = Math.imul(s, 1664525) + 1013904223 >>> 0; noiseTab[i] = s / 4294967296; } }
const raw = (x, y) => noiseTab[((y & 255) << 8) | (x & 255)];
function n2(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = raw(ix, iy), b = raw(ix + 1, iy), c = raw(ix, iy + 1), d = raw(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const fbm = (x, y) => n2(x, y) * 0.55 + n2(x * 2.1, y * 2.1) * 0.3 + n2(x * 4.3, y * 4.3) * 0.15;
const hash = (a, b, k = 0) => raw(a * 31 + k * 57, b * 17 + k * 13);

class Raster {
    constructor(w, h) { this.w = w; this.h = h; this.a = new Float32Array(w * h * 3); this.mask = new Uint8Array(w * h); }
    put(x, y, c, al = 1) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const o = (y * this.w + x) * 3, a = this.a;
        a[o] += (c[0] - a[o]) * al; a[o + 1] += (c[1] - a[o + 1]) * al; a[o + 2] += (c[2] - a[o + 2]) * al;
    }
    rect(x, y, w, h, c, al = 1) { x = Math.round(x); y = Math.round(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, c, al); }
    grad(x, y, w, h, top, bot, al = 1) { for (let j = 0; j < h; j++) { const c = mix(top, bot, j / Math.max(1, h - 1)); for (let i = 0; i < w; i++) this.put(x + i, y + j, c, al); } }
    ell(cx, cy, rx, ry, c, al = 1) {
        for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
            const d = 1 - Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
            if (d > 0) this.put(x, y, c, al * Math.min(1, d * Math.min(rx, ry)));
        }
    }
    line(x0, y0, x1, y1, c, wd = 1, al = 1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
        for (let i = 0; i <= n; i++) { const u = i / Math.max(1, n); this.rect(x0 + (x1 - x0) * u - wd / 2, y0 + (y1 - y0) * u - wd / 2, wd, wd, c, al); }
    }
}

// --- Floors -------------------------------------------------------------------------------------

function floorTile(R, kind, c, r, th) {
    const x0 = c * P, y0 = r * P, A = hex(th.a), B = hex(th.b), W = hex(th.wood);
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) {
        const x = x0 + i, y = y0 + j;
        let col;
        if (kind === "checker") {
            const dark = ((c + r) & 1) === 1, base = dark ? B : A;
            const v = fbm(x * 0.012 + c, y * 0.02 - r), vein = Math.abs(Math.sin((x * 0.02 + y * 0.03 + v * 7) * 2.2));
            col = mix(base, dark ? [36, 42, 52] : [200, 206, 216], (vein < 0.05 ? 0.16 : 0) + (v - 0.5) * 0.22);
            if (i < 1 || j < 1) col = mix(col, [20, 22, 30], 0.4);
        } else if (kind === "marble") {
            const v = fbm(x * 0.008, y * 0.012), vein = Math.abs(Math.sin((x * 0.016 - y * 0.024 + v * 9) * 2.4));
            col = mix(mix(B, A, v), [200, 222, 214], vein < 0.05 ? 0.38 : 0);
            const u = (x + 2) % (P * 3), w = (y + 2) % (P * 3);
            if (u < 3 || w < 3) col = mix(col, hex(th.trim), 0.75);
        } else if (kind === "parquet") {
            const s = 16, u = Math.floor(x / s), w = Math.floor(y / s), cell = (u + w) & 3, h = cell < 2;
            const a = h ? y : x, b = h ? x : y, plank = Math.floor(a / s), g = hash(plank, Math.floor((b + plank * 19) / (s * 4)), 2);
            col = mix(W, [58, 30, 16], g * 0.55);
            col = mix(col, [255, 210, 150], n2(a * 0.5, b * 0.04) * 0.1);
            if (a % s < 1) col = mix(col, [20, 10, 6], 0.7);
        } else if (kind === "planks" || kind === "boards") {
            const s = kind === "boards" ? 22 : 18, plank = Math.floor(y / s), off = hash(plank, 3, 1) * 300, seg = Math.floor((x + off) / 150), g = hash(plank, seg, 4);
            col = mix(W, [40, 24, 16], g * 0.5);
            col = mix(col, [230, 190, 140], (n2(x * 0.03, y * 0.5) - 0.3) * 0.2);
            if (y % s < 1 || (x + off) % 150 < 1.5) col = mix(col, [14, 8, 6], 0.75);
        } else if (kind === "tile") {
            const s = 21, u = Math.floor(x / s), w = Math.floor(y / s);
            col = (u + w) & 1 ? B : A;
            col = mix(col, [120, 130, 150], n2(x * 0.02, y * 0.02) * 0.2);
            if (x % s < 1 || y % s < 1) col = mix(col, [60, 60, 70], 0.7);
        } else if (kind === "stone") {
            const s = 30, row = Math.floor(y / s), u = (x + (row & 1) * 22), cellx = Math.floor(u / 44);
            col = mix(mix(A, B, hash(cellx, row, 5)), [60, 60, 56], fbm(x * 0.03, y * 0.03) * 0.5);
            if (y % s < 2 || u % 44 < 2) col = mix(col, [20, 20, 22], 0.8);
        } else {   // steel
            const s = 48;
            col = mix(A, B, n2(x * 0.01, y * 0.3) * 0.6);
            if (x % s < 1 || y % s < 1) col = mix(col, [10, 14, 18], 0.8);
            const rx = x % s - 6, ry = y % s - 6;
            if (rx * rx + ry * ry < 5) col = mix(col, [190, 200, 210], 0.5);
        }
        R.put(x, y, col);
    }
}

function carpetTile(R, c, r, w, th) {
    const A = hex(th.carpet), G = hex(th.carpet2), x0 = c * P, y0 = r * P;
    const isC = (cc, rr) => { const ch = w.chars[rr]?.[cc]; return ch === "," || ch === "P"; };
    const up = !isC(c, r - 1), dn = !isC(c, r + 1), lf = !isC(c - 1, r), rt = !isC(c + 1, r);
    for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) {
        const x = x0 + i, y = y0 + j;
        const fold = n2(x * 0.25, y * 0.25) * 0.14 - 0.07;
        let col = mix(A, [0, 0, 0], 0.12 - fold);
        const du = (i + j) % 32, dv = (i - j + 64) % 32;
        if (Math.abs(du - 16) < 1.2 || Math.abs(dv - 16) < 1.2) col = mix(col, G, 0.28);
        if ((i - 16) ** 2 + (j - 32) ** 2 < 14 || (i - 48) ** 2 + (j - 32) ** 2 < 14) col = mix(col, G, 0.55);
        const e = Math.min(up ? j : 99, dn ? P - 1 - j : 99, lf ? i : 99, rt ? P - 1 - i : 99);
        if (e < 12) col = e < 3 ? mix(A, [0, 0, 0], 0.3) : e < 9 ? mix(col, G, e < 5 ? 0.85 : 0.2) : col;
        R.put(x, y, col);
    }
}

function creakTile(R, c, r) {
    const x0 = c * P, y0 = r * P, wood = [124, 88, 56];
    for (let k = 0; k < 4; k++) {
        const y = y0 + 3 + k * 15, wob = hash(c, r, k) * 8 - 4;
        R.grad(x0 + 2 + wob, y, P - 4, 13, mix(wood, [190, 150, 100], hash(r, c, k + 9) * 0.5), mix(wood, [40, 24, 16], 0.5));
        R.rect(x0 + 6, y + 6, 3, 3, [30, 20, 14]); R.rect(x0 + P - 12, y + 6, 3, 3, [30, 20, 14]);
    }
    R.line(x0 + 12, y0 + 18, x0 + 40, y0 + 24, [24, 16, 12], 1.6);
    R.line(x0 + 34, y0 + 44, x0 + 56, y0 + 40, [24, 16, 12], 1.6);
}

// --- Walls --------------------------------------------------------------------------------------

function wallTile(R, w, c, r, th, faces) {
    const x0 = c * P, y0 = r * P, ch = w.chars[r][c];
    const solid = (cc, rr) => { const k = w.chars[rr]?.[cc]; return k === undefined || k === "#" || k === "W" || k === " "; };
    const Wa = hex(th.wall), Wb = hex(th.wall2), Wn = hex(th.wains), Tr = hex(th.trim), Cap = hex(th.cap);
    const below = !solid(c, r + 1), below2 = !below && !solid(c, r + 2);
    // Everything starts as the dark top of the wall.
    R.grad(x0, y0, P, P, mix(Cap, [40, 46, 64], 0.2), Cap);
    if (!solid(c - 1, r) && !below) R.rect(x0, y0, 5, P, mix(hex(th.wains), [255, 255, 255], 0.12));
    if (!solid(c + 1, r) && !below) R.rect(x0 + P - 5, y0, 5, P, mix(hex(th.wains), [0, 0, 0], 0.3));
    if (!solid(c, r - 1) && !below) R.rect(x0, y0, P, 5, mix(hex(th.wains), [255, 255, 255], 0.2));
    const top = below ? (solid(c, r - 1) ? 0 : 12) : below2 ? 24 : P;
    if (top >= P) return;
    const h = P - top, yt = y0 + top;
    if (below || below2) {
        // Wall face, wallpaper above a panelled dado.
        for (let j = 0; j < h; j++) for (let i = 0; i < P; i++) {
            const x = x0 + i, y = yt + j, st = ((x >> 3) & 1) ? 0.07 : 0;
            let col = mix(mix(Wb, Wa, j / h * 0.3 + 0.55), [0, 0, 0], st);
            if (th.shelfKind === "crates") {   // opera wall hangings fall in heavy pleats
                const pleat = Math.sin(x * 0.16 + Math.sin(y * 0.02) * 1.2);
                col = mix(Wa, Wb, 0.5 + pleat * 0.5);
                col = mix(col, [0, 0, 0], pleat < -0.7 ? 0.35 : 0);
            } else if (((x + 20) % 40 < 3 && (y + (x >> 5) * 20) % 40 < 3)) col = mix(col, hex(th.trim), 0.28);
            R.put(x, y, col);
        }
        if (top === 12 || top === 24) { R.rect(x0, yt, P, 3, Tr); R.rect(x0, yt - 2, P, 2, [0, 0, 0], 0.4); }
        if (below) {
            const dy = y0 + P - 24;
            R.grad(x0, dy, P, 24, mix(Wn, [255, 255, 255], 0.1), mix(Wn, [0, 0, 0], 0.35));
            R.rect(x0, dy, P, 2, Tr);
            R.rect(x0 + 6, dy + 6, P - 12, 12, mix(Wn, [0, 0, 0], 0.3), 0.7);
            R.rect(x0, y0 + P - 3, P, 3, [0, 0, 0], 0.5);
        }
        if (ch === "W") faces.push({ c, r, x: x0, top: yt, h: below ? h - 22 : h, below });
    }
}

function decorateFace(R, w, c, r, th) {
    // Paintings hang on any wall with a two-tile face and a little luck.
    const k = w.chars[r][c], below = w.chars[r + 1]?.[c];
    if (k !== "#" || below === undefined || below !== "#") return;
    const b2 = w.chars[r + 2]?.[c];
    if (b2 === undefined || b2 === "#" || b2 === "W" || b2 === " ") return;
    const h = hash(c, r, 8);
    if (th.shelfKind === "crates" || h > 0.72) return;
    const x = c * P + 12, y = r * P + 34, wd = P - 24, ht = 44, Tr = hex(th.trim);
    R.rect(x - 3, y - 3, wd + 6, ht + 6, mix(Tr, [0, 0, 0], 0.35));
    R.rect(x - 1, y - 1, wd + 2, ht + 2, Tr);
    const pick = Math.floor(h * 40) % 3;
    if (pick === 0) { // a stern fish portrait
        R.grad(x, y, wd, ht, [52, 66, 72], [28, 36, 44]);
        R.ell(x + wd / 2, y + ht / 2, 14, 8, [190, 150, 80]); R.ell(x + wd / 2 + 13, y + ht / 2, 6, 8, [150, 110, 60]); R.ell(x + wd / 2 - 8, y + ht / 2 - 1, 2, 2, [20, 20, 20]);
    } else if (pick === 1) { // a seascape
        R.grad(x, y, wd, ht / 2, [190, 150, 110], [120, 130, 150]); R.grad(x, y + ht / 2, wd, ht / 2, [60, 90, 110], [24, 40, 60]);
        R.ell(x + wd * 0.7, y + ht * 0.34, 5, 5, [240, 220, 170]);
    } else { // an ancestor who disapproves
        R.grad(x, y, wd, ht, [64, 46, 40], [30, 22, 22]);
        R.ell(x + wd / 2, y + ht * 0.46, 7, 9, [190, 160, 130]); R.ell(x + wd / 2, y + ht + 4, 13, 14, [30, 30, 40]);
    }
}

// --- Furniture ----------------------------------------------------------------------------------

function shelfTile(R, w, c, r, th) {
    const x0 = c * P, y0 = r * P, S = hex(th.shelf), kind = th.shelfKind, Tr = hex(th.trim);
    const isS = (cc, rr) => "Su%".includes(w.chars[rr]?.[cc] ?? " ");
    const below = !isS(c, r + 1), up = !isS(c, r - 1), lf = !isS(c - 1, r), rt = !isS(c + 1, r);
    const topH = below ? 34 : P;
    // A broad cast top, lit from the upper left.
    R.grad(x0, y0, P, topH, mix(S, [255, 235, 200], 0.34), mix(S, [255, 235, 200], 0.16));
    const inX = x0 + (lf ? 6 : 0), inW = P - (lf ? 6 : 0) - (rt ? 6 : 0), inY = y0 + (up ? 6 : 0), inH = topH - (up ? 6 : 0) - (below ? 5 : 0);
    if (kind === "cabinet") {         // a glass-topped case with something dead inside
        R.grad(inX, inY, inW, inH, [26, 52, 60], [14, 32, 40]);
        const n = hash(c, r, 3);
        if (n < 0.4) { R.ell(x0 + 32, inY + 15, 15, 6, [222, 212, 182]); R.ell(x0 + 46, inY + 15, 5, 7, [200, 190, 160]); for (let k = 0; k < 4; k++) R.line(x0 + 24 + k * 6, inY + 9, x0 + 24 + k * 6, inY + 21, [60, 66, 66], 1.4); }
        else if (n < 0.7) { for (const [a, b, q] of [[20, 12, 5], [34, 18, 7], [46, 10, 4]]) { R.ell(x0 + a, inY + b, q, q, [204, 168, 92]); R.ell(x0 + a - 1, inY + b - 1, q * 0.5, q * 0.5, [240, 214, 150]); } }
        else { R.ell(x0 + 30, inY + 14, 12, 8, [150, 90, 70]); R.ell(x0 + 30, inY + 14, 7, 4.5, [190, 130, 96]); }
        for (let k = 0; k < 3; k++) R.line(inX + 8 + k * 16, inY + inH - 3, inX + 22 + k * 16, inY + 3, [190, 225, 240], 2.4, 0.13);
        if (lf) R.rect(inX - 1, inY, 2, inH, Tr); if (rt) R.rect(inX + inW - 1, inY, 2, inH, Tr);
        if (up) R.rect(inX, inY - 1, inW, 2, Tr); if (below) R.rect(inX, inY + inH - 1, inW, 2, Tr);
    } else if (kind === "books") {    // the top of a bookcase, where things go to be forgotten
        for (let j = 0; j < inH; j += 13) R.rect(inX, inY + j, inW, 1, [0, 0, 0], 0.25);
        const n = hash(c, r, 5);
        if (n < 0.5) { const hue = n < 0.25 ? [120, 46, 44] : [44, 82, 96]; R.rect(x0 + 16, inY + 6, 30, 18, hue); R.rect(x0 + 18, inY + 8, 26, 2, [226, 206, 150]); R.rect(x0 + 20, inY + 2, 26, 16, mix(hue, [255, 255, 255], 0.14)); }
    } else if (kind === "crates") {   // stencilled lids, rope and stage dust
        for (let k = 1; k < 4; k++) R.rect(inX, inY + k * (inH / 4), inW, 1.5, [0, 0, 0], 0.32);
        R.line(inX + 4, inY + 4, inX + inW - 4, inY + inH - 4, [30, 18, 12], 2.4, 0.5);
    } else {                          // drawers: a steel top with riveted seams
        for (const [a, b] of [[6, 6], [P - 8, 6], [6, inH - 7], [P - 8, inH - 7]]) R.rect(x0 + a, inY + b, 3, 3, [200, 210, 220]);
        R.rect(inX, inY + inH / 2, inW, 1.5, [0, 0, 0], 0.32);
    }
    if (lf) R.rect(x0, y0, 3, topH, [255, 240, 210], 0.34);
    if (rt) R.rect(x0 + P - 3, y0, 3, topH, [0, 0, 0], 0.4);
    if (up) R.rect(x0, y0, P, 3, [255, 244, 220], 0.45);
    if (!below) return;
    const fy = y0 + topH, fh = P - topH;
    R.grad(x0, fy, P, fh, mix(S, [0, 0, 0], 0.3), mix(S, [0, 0, 0], 0.62));
    R.rect(x0, fy, P, 2, [255, 240, 210], 0.3);
    if (kind === "books") {
        let x = x0 + 3;
        while (x < x0 + P - 5) {
            const wd = 4 + Math.floor(hash(x, r, 1) * 5), ht = 15 + Math.floor(hash(x, c, 3) * 7), hue = [[150, 50, 48], [52, 90, 110], [190, 150, 80], [60, 110, 80], [120, 70, 130]][Math.floor(hash(x, 7, 4) * 5)];
            R.grad(x, fy + fh - 3 - ht, wd, ht, hue, mix(hue, [0, 0, 0], 0.4));
            R.rect(x, fy + fh - 3 - ht + 4, wd, 1, [240, 220, 170], 0.6);
            x += wd + 1;
        }
    } else if (kind === "cabinet") {
        R.rect(x0 + 5, fy + 4, P - 10, fh - 9, [34, 52, 60]);
        R.line(x0 + 10, fy + fh - 7, x0 + 22, fy + 5, [170, 210, 226], 2, 0.3);
        R.rect(x0 + P / 2 - 1, fy + 3, 2, fh - 7, Tr, 0.7);
    } else if (kind === "crates") {
        R.rect(x0 + 3, fy + 2, P - 6, fh - 4, mix(S, [255, 220, 160], 0.08));
        for (let k = 0; k < 2; k++) R.rect(x0 + 3, fy + 2 + k * 11, P - 6, 1, [0, 0, 0], 0.45);
        R.line(x0 + 6, fy + 4, x0 + P - 6, fy + fh - 4, [40, 26, 18], 2.6); R.line(x0 + P - 6, fy + 4, x0 + 6, fy + fh - 4, [40, 26, 18], 2.6);
    } else {
        for (let k = 0; k < 3; k++) for (let m = 0; m < 2; m++) {
            const dx = x0 + 3 + k * 20, dy = fy + 2 + m * 11;
            R.rect(dx, dy, 18, 9, mix(S, [255, 255, 255], 0.12));
            R.rect(dx + 6, dy + 3, 6, 2, Tr);
        }
    }
    R.rect(x0, y0 + P - 2, P, 2, [0, 0, 0], 0.6);
}

function tableTile(R, w, c, r, th) {
    const x0 = c * P, y0 = r * P, C = hex(th.table), kind = th.tableKind;
    const isT = (cc, rr) => "To&Fl".includes(w.chars[rr]?.[cc] ?? " ");
    const below = !isT(c, r + 1), left = !isT(c - 1, r), right = !isT(c + 1, r), up = !isT(c, r - 1);
    const inset = 4, tx = x0 + (left ? inset : 0), tw = P - (left ? inset : 0) - (right ? inset : 0), ty = y0 + (up ? 6 : 0), th2 = below ? 46 - (up ? 6 : 0) : P - (up ? 6 : 0);
    R.ell(x0 + P / 2, y0 + P - 4, P * 0.5, 9, [0, 0, 0], 0.4);
    if (below) {
        const fy = ty + th2, fh = y0 + P - fy;
        if (kind === "cloth") {
            for (let i = 0; i < tw; i++) { const fold = Math.sin((tx + i) * 0.35) * 0.5 + 0.5; R.grad(tx + i, fy, 1, fh, mix(C, [0, 0, 0], 0.3 + fold * 0.2), mix(C, [0, 0, 0], 0.6)); }
        } else R.grad(tx, fy, tw, fh, mix(C, [0, 0, 0], 0.3), mix(C, [0, 0, 0], 0.62));
        if (kind === "crate") { R.rect(tx, fy + 5, tw, 1, [0, 0, 0], 0.5); }
    }
    R.grad(tx, ty, tw, th2, mix(C, [255, 255, 255], 0.2), C);
    if (kind === "wood" || kind === "crate") for (let k = 0; k < 4; k++) R.rect(tx, ty + 6 + k * 10, tw, 1, [0, 0, 0], 0.22);
    if (kind === "plinth") { R.rect(tx + 5, ty + 5, tw - 10, th2 - 10, mix(hex(th.carpet), [0, 0, 0], 0.15)); R.rect(tx + 7, ty + 7, tw - 14, th2 - 14, hex(th.carpet)); }
    if (up) R.rect(tx, ty, tw, 2, [255, 255, 255], 0.3);
}

function ventTile(R, c, r) {
    const x = c * P + 8, y = r * P + 8, s = P - 16;
    R.rect(x - 3, y - 3, s + 6, s + 6, [54, 60, 72]);
    R.rect(x, y, s, s, [10, 12, 18]);
    for (let k = 0; k < 6; k++) { R.rect(x + 2, y + 3 + k * 8, s - 4, 4, [96, 106, 122]); R.rect(x + 2, y + 3 + k * 8, s - 4, 1, [150, 160, 176]); }
    for (const [a, b] of [[0, 0], [s - 3, 0], [0, s - 3], [s - 3, s - 3]]) R.rect(x + a - 1, y + b - 1, 4, 4, [190, 196, 206]);
}

function exitTile(R, c, r) {
    const x = c * P + P / 2, y = r * P + P / 2;
    R.rect(x - 28, y - 22, 56, 44, [64, 44, 34]); R.rect(x - 25, y - 19, 50, 38, [116, 84, 60]);
    for (let k = 0; k < 9; k++) R.rect(x - 25 + k * 6, y - 19, 2, 38, [64, 44, 34], 0.4);
    R.ell(x, y + 3, 7, 6, [48, 32, 26]);
    for (const [a, b] of [[-8, -6], [-3, -10], [3, -10], [8, -6]]) R.ell(x + a, y + b, 2.6, 3.2, [48, 32, 26]);
}

// --- The whole floor ----------------------------------------------------------------------------

export function bakeAlbedo(w) {
    const th = THEMES[w.def.theme], Wd = w.cols * P, Hd = w.rows * P, R = new Raster(Wd, Hd), faces = [];
    const floors = { ".": th.floor, ";": th.alt };
    const baseFloor = (c, r) => {   // what is under furniture: same as the nearest plain floor
        for (const [a, b] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, -1], [2, 0], [0, 2], [-2, 0]]) { const k = w.chars[r + b]?.[c + a]; if (k && floors[k]) return floors[k]; }
        return th.floor;
    };
    for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
        const ch = w.chars[r][c];
        if (ch === " " || ch === "#" || ch === "W") continue;
        if (ch === "," || ch === "P") carpetTile(R, c, r, w, th);
        else if (ch === "~") { floorTile(R, baseFloor(c, r), c, r, th); }
        else floorTile(R, floors[ch] ?? baseFloor(c, r), c, r, th);
    }
    for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
        const ch = w.chars[r][c];
        if (ch === " ") {
            const x0 = c * P, y0 = r * P;
            for (let j = 0; j < P; j++) for (let i = 0; i < P; i++) R.put(x0 + i, y0 + j, mix([9, 11, 20], [14, 17, 30], fbm((x0 + i) * 0.05, (y0 + j) * 0.05)));
        } else if (ch === "#" || ch === "W") { wallTile(R, w, c, r, th, faces); }
    }
    for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) if (w.chars[r][c] === "#") decorateFace(R, w, c, r, th);
    for (let r = 0; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
        const ch = w.chars[r][c];
        if ("Su%".includes(ch)) shelfTile(R, w, c, r, th);
        else if ("To&Fl".includes(ch)) tableTile(R, w, c, r, th);
        else if (ch === "~") creakTile(R, c, r);
        else if (ch === "@") exitTile(R, c, r);
        else if (ch >= "1" && ch <= "9") ventTile(R, c, r);
        else if (ch === "Y" || ch === "L") R.ell(c * P + P / 2, r * P + P - 10, 26, 9, [0, 0, 0], 0.45);
    }
    // Contact shadow along the feet of everything tall.
    for (let r = 1; r < w.rows; r++) for (let c = 0; c < w.cols; c++) {
        const f = flagAt(w, c, r), up = flagAt(w, c, r - 1);
        if (f & SIGHT || f & PERCH || !(up & SIGHT)) continue;
        for (let j = 0; j < 16; j++) for (let i = 0; i < P; i++) R.put(c * P + i, r * P + j, [6, 8, 16], 0.5 * (1 - j / 16));
    }
    return { R, faces, th, w: Wd, h: Hd };
}

/** Multiply albedo by light, into RGBA. Called again whenever a lantern dies. */
export function relight(out, world, a, snuffed) {
    const { R, faces, th } = a, W = a.w, H = a.h, lw = world.lw, lh = world.lh;
    const amb = th.ambient, mo = th.moon, la = th.lamp;
    const lr = new Float32Array(lw * lh), lg = new Float32Array(lw * lh), lb = new Float32Array(lw * lh);
    for (let i = 0; i < lw * lh; i++) {
        const ao = world.ao[i] * (0.42 + 0.72 * world.open[i]), m = world.moon[i];
        lr[i] = amb[0] * ao + mo[0] * m; lg[i] = amb[1] * ao + mo[1] * m; lb[i] = amb[2] * ao + mo[2] * m;
    }
    world.lanterns.forEach((l, k) => {
        if (snuffed?.[k]) return;
        for (let j = 0; j < l.size; j++) for (let i = 0; i < l.size; i++) {
            const v = l.grid[j * l.size + i], a2 = l.c0 + i, b = l.r0 + j;
            if (!v || a2 < 0 || b < 0 || a2 >= lw || b >= lh) continue;
            const o = b * lw + a2;
            lr[o] += la[0] * v; lg[o] += la[1] * v; lb[o] += la[2] * v;
        }
    });
    // Walls and tall furniture borrow the light from the floor in front of them, fading upward.
    for (let i = 0; i < lw; i++) for (let j = lh - 2; j >= 0; j--) {
        const c = Math.floor(i / LR), r = Math.floor(j / LR);
        if (!(flagAt(world, c, r) & SIGHT)) continue;
        const o = j * lw + i, u = o + lw, f = 0.965;
        lr[o] = lr[u] * f + amb[0] * 0.05; lg[o] = lg[u] * f + amb[1] * 0.05; lb[o] = lb[u] * f + amb[2] * 0.05;
    }
    const src = R.a, cell = 2 * (T / LR);
    for (let y = 0; y < H; y++) {
        const fy = y / cell - 0.5, j0 = Math.max(0, Math.floor(fy)), j1 = Math.min(lh - 1, j0 + 1), ty = Math.max(0, fy - j0);
        for (let x = 0; x < W; x++) {
            const fx = x / cell - 0.5, i0 = Math.max(0, Math.floor(fx)), i1 = Math.min(lw - 1, i0 + 1), tx = Math.max(0, fx - i0);
            const a0 = j0 * lw + i0, b0 = j0 * lw + i1, c0 = j1 * lw + i0, d0 = j1 * lw + i1;
            const w0 = (1 - tx) * (1 - ty), w1 = tx * (1 - ty), w2 = (1 - tx) * ty, w3 = tx * ty;
            const r = lr[a0] * w0 + lr[b0] * w1 + lr[c0] * w2 + lr[d0] * w3;
            const g = lg[a0] * w0 + lg[b0] * w1 + lg[c0] * w2 + lg[d0] * w3;
            const b = lb[a0] * w0 + lb[b0] * w1 + lb[c0] * w2 + lb[d0] * w3;
            const o3 = (y * W + x) * 3, o = (y * W + x) * 4, dither = raw(x, y) * 2;
            const R0 = src[o3] * r + dither, G0 = src[o3 + 1] * g + dither, B0 = src[o3 + 2] * b + dither;
            out[o] = R0 > 255 ? 255 : R0; out[o + 1] = G0 > 255 ? 255 : G0; out[o + 2] = B0 > 255 ? 255 : B0; out[o + 3] = 255;
        }
    }
    // Windows glow on their own.
    for (const f of faces) paintWindowRGBA(out, W, f);
}

function paintWindowRGBA(out, W, f) {
    const x0 = f.x + 8, x1 = f.x + P - 8, y0 = f.top + (f.below ? 6 : 2), y1 = f.top + f.h;
    for (let y = y0 - 3; y < y1 + 3; y++) for (let x = x0 - 3; x < x1 + 3; x++) {
        const edge = x < x0 || x >= x1 || y < y0 || y >= y1, o = (y * W + x) * 4;
        let c;
        if (edge) c = [52, 62, 96];
        else {
            const u = (y - y0) / (y1 - y0 + 8), bar = Math.abs(x - (x0 + x1) / 2) < 1.5 || (y - y0) % 20 < 2;
            c = bar ? [24, 32, 56] : mix([132, 180, 236], [44, 78, 148], u);
            if (!bar && raw(x >> 1, y >> 1) > 0.992) c = [240, 245, 255];
        }
        out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
    }
}

export const TEX = { W: (w) => w.cols * P, H: (w) => w.rows * P };
