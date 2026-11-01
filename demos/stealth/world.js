// CAT BURGLAR. The static world: map parsing, flags per tile, and moonlight worked out by marching rays.
// No Pogo imports, so the solver and the game share it exactly.

export const T = 32;            // world units per tile
export const LR = 8;            // light cells per tile (4 units each)

export const WALK = 1, SIGHT = 2, PERCH = 4, HIGH = 8, LOUD = 16, QUIET = 32, VOID = 64;

const FLAGS = {
    " ": WALK | SIGHT | VOID, "#": WALK | SIGHT, W: WALK | SIGHT,
    ".": 0, ",": QUIET, ";": 0, "~": LOUD, "@": 0, b: 0, $: 0,
    S: WALK | SIGHT | PERCH | HIGH, u: WALK | SIGHT | PERCH | HIGH, "%": WALK | SIGHT | PERCH | HIGH,
    T: WALK | PERCH, o: WALK | PERCH, "&": WALK | PERCH, F: WALK | PERCH, l: WALK | PERCH,
    L: WALK, Y: WALK | SIGHT, P: QUIET,
};

/** Build the static world for a level definition. Cached: light is the expensive part. */
const cache = new Map();
export function buildWorld(def) {
    if (cache.has(def.id)) return cache.get(def.id);
    const rows = def.map.length, cols = Math.max(...def.map.map((r) => r.length));
    const w = {
        def, cols, rows, width: cols * T, height: rows * T,
        chars: def.map.map((r) => r.padEnd(cols, " ")),
        flags: new Uint8Array(cols * rows),
        start: null, target: null, bonus: [], items: [], boxes: [], lanterns: [], vents: [],
    };
    const ventAt = {};
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const ch = w.chars[r][c], i = r * cols + c;
        const vent = ch >= "1" && ch <= "9";
        const f = vent ? 0 : FLAGS[ch];
        if (f === undefined) throw new Error(`${def.id}: unknown map character "${ch}" at col ${c}, row ${r}`);
        w.flags[i] = f;
        const p = { c, r, x: (c + 0.5) * T, y: (r + 0.5) * T };
        if (ch === "@") w.start = p;
        if (ch === "F") w.target = p;
        if (ch === "$" || ch === "%" || ch === "&") w.bonus.push(p);
        if (ch === "u" || ch === "o") w.items.push({ ...p, kind: "vase" });
        if (ch === "l") { w.items.push({ ...p, kind: "lamp", lamp: w.lanterns.length }); w.lanterns.push({ ...p, onTable: true }); }
        if (ch === "L") w.lanterns.push({ ...p, onTable: false });
        if (ch === "b") w.boxes.push(p);
        if (vent) { (ventAt[ch] ??= []).push(p); }
    }
    if (!w.start) throw new Error(`${def.id}: no @ start`);
    if (!w.target) throw new Error(`${def.id}: no F target`);
    for (const [k, ps] of Object.entries(ventAt)) {
        if (ps.length !== 2) throw new Error(`${def.id}: vent ${k} needs exactly two ends`);
        const a = w.vents.length;
        w.vents.push({ ...ps[0], to: a + 1 }, { ...ps[1], to: a });
    }
    litWorld(w);
    cache.set(def.id, w);
    return w;
}

export const flagAt = (w, c, r) => (c < 0 || r < 0 || c >= w.cols || r >= w.rows ? WALK | SIGHT | VOID : w.flags[r * w.cols + c]);
export const flagXY = (w, x, y) => flagAt(w, Math.floor(x / T), Math.floor(y / T));

/** Moonlight through windows, skylights, corner darkening and each lantern's reach, on a 4-unit grid. */
function litWorld(w) {
    const lw = w.cols * LR, lh = w.rows * LR, cell = T / LR;
    const moon = new Float32Array(lw * lh), ao = new Float32Array(lw * lh);
    const [mx0, my0] = w.def.moon ?? [0.45, 1];
    const ml = Math.hypot(mx0, my0), mx = mx0 / ml, my = my0 / ml;
    const near = T * 0.6, far = T * (w.def.moonReach ?? 7.5);
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
        const px = (i + 0.5) * cell, py = (j + 0.5) * cell, ix = j * lw + i;
        if (flagXY(w, px, py) & SIGHT) continue;
        for (let s = 4; s < far; s += 3) {
            const qx = px - mx * s, qy = py - my * s, c = Math.floor(qx / T), r = Math.floor(qy / T), f = flagAt(w, c, r);
            if (!(f & SIGHT)) continue;
            if (w.chars[r]?.[c] === "W" && s >= near) {
                const u = qx / T - c, v = (s - near) / (far - near);
                const frame = u > 0.1 && u < 0.9, mull = Math.abs(u - 0.5) > 0.035, bar = (v * 5) % 1 > 0.13;
                if (frame && mull && bar) moon[ix] = 1 - v * 0.45;
            }
            break;
        }
    }
    for (const [c0, r0, cw, ch] of w.def.skylights ?? []) {
        for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
            const u = (i + 0.5) / LR - c0, v = (j + 0.5) / LR - r0;
            if (u < 0 || v < 0 || u > cw || v > ch || flagAt(w, Math.floor((i + 0.5) / LR), Math.floor((j + 0.5) / LR)) & SIGHT) continue;
            if ((u * 2) % 1 > 0.1 && (v * 2) % 1 > 0.1) moon[j * lw + i] = Math.max(moon[j * lw + i], 0.9);
        }
    }
    // Soften the pools a little, so edges read as light and not as stencils.
    const soft = new Float32Array(moon);
    for (let j = 1; j < lh - 1; j++) for (let i = 1; i < lw - 1; i++) {
        const k = j * lw + i;
        soft[k] = moon[k] * 0.52 + (moon[k - 1] + moon[k + 1] + moon[k - lw] + moon[k + lw]) * 0.12;
    }
    w.moon = soft;
    // Rooms darken towards walls and corners.
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
        const px = (i + 0.5) * cell, py = (j + 0.5) * cell;
        let hit = 0;
        for (let a = 0; a < 8; a++) {
            const dx = Math.cos(a * Math.PI / 4), dy = Math.sin(a * Math.PI / 4);
            if (flagXY(w, px + dx * 14, py + dy * 14) & SIGHT) hit += 0.5;
            else if (flagXY(w, px + dx * 30, py + dy * 30) & SIGHT) hit += 0.22;
        }
        ao[j * lw + i] = 1 - Math.min(0.72, hit * 0.17);
    }
    w.ao = ao; w.lw = lw; w.lh = lh;
    // Long soft shadows: anything tall blocks the night sky, in the direction the moon hangs.
    const open = new Float32Array(lw * lh), reach = T * 6;
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
        const px = (i + 0.5) * cell, py = (j + 0.5) * cell;
        let v = 1;
        for (let s = 6; s < reach; s += 5) {
            if (flagXY(w, px - mx * s, py - my * s) & SIGHT) { v = 0.1 + 0.9 * (s / reach) ** 1.5; break; }
        }
        open[j * lw + i] = v;
    }
    const blur = new Float32Array(open);
    for (let pass = 0; pass < 2; pass++) {
        const src = blur.slice();
        for (let j = 1; j < lh - 1; j++) for (let i = 1; i < lw - 1; i++) {
            const k = j * lw + i;
            blur[k] = (src[k] * 2 + src[k - 1] + src[k + 1] + src[k - lw] + src[k + lw]) / 6;
        }
    }
    w.open = blur;
    for (const l of w.lanterns) {
        const R = l.radius = T * 4.2, n = Math.ceil(R / cell);
        const c0 = Math.floor(l.x / cell) - n, r0 = Math.floor(l.y / cell) - n, size = n * 2 + 1;
        const grid = new Float32Array(size * size);
        for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
            const px = (c0 + i + 0.5) * cell, py = (r0 + j + 0.5) * cell, dx = px - l.x, dy = py - l.y, d = Math.hypot(dx, dy);
            if (d > R || flagXY(w, px, py) & SIGHT) continue;
            let open = true;
            for (let s = 10; s < d; s += 3) if (flagXY(w, l.x + dx * s / d, l.y + dy * s / d) & SIGHT) { open = false; break; }
            if (open) { const t = 1 - d / R; grid[j * size + i] = t * t * (1.6 - 0.6 * t); }
        }
        l.grid = grid; l.c0 = c0; l.r0 = r0; l.size = size;
    }
}

/** Moon + lanterns at a world point, 0 to 1. `out` is a Uint8Array flag per lantern. */
export function lightAt(w, x, y, out) {
    const i = Math.floor(x / (T / LR)), j = Math.floor(y / (T / LR));
    if (i < 0 || j < 0 || i >= w.lw || j >= w.lh) return 0;
    let v = 0.03 + w.open[j * w.lw + i] * 0.14 + w.moon[j * w.lw + i] * 0.85;
    for (let k = 0; k < w.lanterns.length; k++) {
        if (out?.[k]) continue;
        const l = w.lanterns[k], a = i - l.c0, b = j - l.r0;
        if (a >= 0 && b >= 0 && a < l.size && b < l.size) v += l.grid[b * l.size + a] * 1.1;
    }
    return v > 1 ? 1 : v;
}
