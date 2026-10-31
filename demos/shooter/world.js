// Turns an ASCII level into merged collision boxes and one baked mesh per level.
//
// Pogo's box primitive stretches a texture across each face and textures clamp at the edge, so a merged wall
// cannot tile. Instead the level is one custom mesh of per-tile quads into a single atlas, which also lets us
// bake coloured lamp light, sun shadows and ambient occlusion into vertex colours. That is the whole look of
// the game, and the entire level costs one draw call.
import { LEVELS } from "./levels.js";
import { ATLAS, C, CELL, THEMES, paintTheme } from "./art.js";

export const TILE = 2.4;
export const LOW = 1.1;
const NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const cache = new Map();

/** Parse and bake a level once. Retrying it is instant. */
export function compile(game, idx) {
    if (cache.has(idx)) return cache.get(idx);
    const def = LEVELS[idx], theme = THEMES[def.theme];
    paintTheme(game, def.theme);
    const rows = def.map.map((r) => r.trim()), R = rows.length, Cn = Math.max(...rows.map((r) => r.length));
    const ch = (c, r) => (r < 0 || r >= R || c < 0 || c >= Cn ? "#" : rows[r][c] ?? "#");
    const H = theme.H;
    const isWall = (c, r) => { const k = ch(c, r); return k === "#" || k === "%"; };
    const tileH = new Float32Array(Cn * R);
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        const k = ch(c, r);
        tileH[r * Cn + c] = k === "#" || k === "%" ? 99 : k === "=" ? LOW : 0;
    }
    const heightAt = (x, z) => {
        const c = Math.floor(x / TILE), r = Math.floor(z / TILE);
        return c < 0 || r < 0 || c >= Cn || r >= R ? 99 : tileH[r * Cn + c];
    };

    // Collision: greedy-merge solid tiles into long boxes, so physics and raycasts see few entities.
    const rects = [], used = new Uint8Array(Cn * R);
    const kind = (c, r) => (isWall(c, r) ? 1 : ch(c, r) === "=" ? 2 : 0);
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        const k = kind(c, r);
        if (!k || used[r * Cn + c]) continue;
        let w = 1, h = 1;
        while (c + w < Cn && kind(c + w, r) === k && !used[r * Cn + c + w]) w++;
        grow: for (; r + h < R; h++) for (let i = 0; i < w; i++) if (kind(c + i, r + h) !== k || used[(r + h) * Cn + c + i]) break grow;
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) used[(r + j) * Cn + c + i] = 1;
        rects.push({ c, r, w, h, k });
    }

    // Lights
    const lights = [];
    const add = (c, r, y, col, rad) => lights.push({ x: (c + 0.5) * TILE, y, z: (r + 0.5) * TILE, r: col[0], g: col[1], b: col[2], R: rad });
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        const k = ch(c, r);
        if (k === "L") add(c, r, Math.min(H - 0.5, 2.5), theme.lamp, theme.lampR);
        if (k === "*") add(c, r, 2.0, theme.id === "hollows" ? ((c + r) % 2 ? [1.5, 0.4, 1.5] : [0.3, 1.5, 1.6]) : theme.lamp, 10);
        if (k === "E") add(c, r, 1.8, [0.6, 1.9, 0.7], 11);
        if (k === "r") add(c, r, 1.4, [1.6, 0.25, 0.3], 6.5);
        if (k === "b") add(c, r, 1.4, [0.3, 0.6, 1.8], 6.5);
        if (k === "y") add(c, r, 1.4, [1.6, 1.3, 0.3], 6.5);
        if (k === "~" && (c + r * 3) % 5 === 0) {
            const g = { kiln: [1.7, 0.6, 0.15], throne: [1.7, 0.6, 0.15], hollows: [0.2, 1.0, 1.4], greenhouse: [0.4, 1.1, 0.5], palace: [1.3, 1.0, 0.3] }[theme.id] ?? [0.5, 0.8, 0.3];
            add(c, r, 0.6, g, 7);
        }
    }
    // The light list is searched per vertex, so bucket it by tile.
    const near = new Map();
    const bk = (c, r) => r * 1024 + c;
    for (const l of lights) {
        const rt = Math.ceil(l.R / TILE), lc = Math.floor(l.x / TILE), lr = Math.floor(l.z / TILE);
        for (let j = -rt; j <= rt; j++) for (let i = -rt; i <= rt; i++) {
            const key = bk(lc + i, lr + j);
            if (!near.has(key)) near.set(key, []);
            near.get(key).push(l);
        }
    }

    const sun = theme.sun, amb = theme.amb;
    const sunV = sun ? (() => { const d = sun.dir, l = Math.hypot(...d); return [d[0] / l, d[1] / l, d[2] / l]; })() : null;
    const blocked = (x0, y0, z0, x1, y1, z1) => {
        const d = Math.hypot(x1 - x0, y1 - y0, z1 - z0), n = Math.ceil(d / 0.55);
        for (let i = 1; i < n; i++) {
            const t = i / n;
            if (heightAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t) > y0 + (y1 - y0) * t) return true;
        }
        return false;
    };
    const memo = new Map();
    /** Baked light at a point. `n` indexes NORMALS, or -1 for a point in the air (used to light sprites). */
    const shade = (x, y, z, n, out) => {
        const key = Math.round(x * 16) + Math.round(z * 16) * 8192 + Math.round(y * 16) * 67108864 + (n + 1) * 4398046511104;
        const hit = memo.get(key);
        if (hit) { out[0] = hit[0]; out[1] = hit[1]; out[2] = hit[2]; return; }
        const N = n >= 0 ? NORMALS[n] : null;
        let ao = 1;
        if (N && N[1] !== 0) {
            let cnt = 0;
            for (const [a, b] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) if (heightAt(x + a, z + b) > 2) cnt++;
            ao = 1 - 0.19 * cnt;
        } else if (N) {
            ao = 0.5 + 0.5 * sstep(0, 1.5, y);
            if (theme.ceil) ao *= 0.74 + 0.26 * sstep(0, 1.4, H - y);
        }
        const k = N ? (N[1] > 0 ? 1 : N[1] < 0 ? 0.62 : 0.82) : 0.9;
        let r = amb[0] * ao * k, g = amb[1] * ao * k, b = amb[2] * ao * k;
        const px = x + (N ? N[0] * 0.14 : 0), py = y + (N ? N[1] * 0.14 : 0), pz = z + (N ? N[2] * 0.14 : 0);
        if (sun) {
            const dot = N ? N[0] * sunV[0] + N[1] * sunV[1] + N[2] * sunV[2] : 0.55;
            if (dot > 0) {
                const t = Math.min(14, (H + 0.5 - py) / Math.max(0.05, sunV[1]));
                if (!blocked(px, py, pz, px + sunV[0] * t, py + sunV[1] * t, pz + sunV[2] * t)) {
                    const s = dot * 1.25;
                    r += sun.color[0] * s; g += sun.color[1] * s; b += sun.color[2] * s;
                }
            }
        }
        const list = near.get(bk(Math.floor(x / TILE), Math.floor(z / TILE)));
        if (list) for (const l of list) {
            const dx = l.x - px, dy = l.y - py, dz = l.z - pz, d = Math.hypot(dx, dy, dz);
            if (d >= l.R) continue;
            const dot = N ? (N[0] * dx + N[1] * dy + N[2] * dz) / (d || 1) : 0.7;
            if (dot <= -0.15) continue;
            const a = 1 - d / l.R, att = a * a * (0.35 + 0.65 * Math.max(0, dot + 0.15));
            if (att < 0.01 || blocked(px, py, pz, l.x, l.y, l.z)) continue;
            r += l.r * att; g += l.g * att; b += l.b * att;
        }
        out[0] = r; out[1] = g; out[2] = b;
        memo.set(key, [r, g, b]);
    };

    // Geometry
    const makeMesh = () => ({ p: [], n: [], u: [], c: [], i: [] });
    const main = makeMesh(), haz = makeMesh();
    const texel = 0.5 / ATLAS, cellUV = CELL / ATLAS;
    const col = [0, 0, 0];
    /** Quad from corner `a` along `u` and `v`. u × v must equal the normal. */
    const quad = (m, a, u, v, nIdx, cell, u0, u1, v0, v1, emissive) => {
        const base = m.p.length / 3, N = NORMALS[nIdx];
        const ax = cell < 0 ? 0 : (cell % 4) * cellUV + texel, ay = cell < 0 ? 0 : Math.floor(cell / 4) * cellUV + texel, sz = cell < 0 ? 1 : cellUV - texel * 2;
        const corners = [[0, 0, u0, v1], [1, 0, u1, v1], [1, 1, u1, v0], [0, 1, u0, v0]];
        for (const [i, j, tu, tv] of corners) {
            const x = a[0] + u[0] * i + v[0] * j, y = a[1] + u[1] * i + v[1] * j, z = a[2] + u[2] * i + v[2] * j;
            m.p.push(x, y, z);
            m.n.push(N[0], N[1], N[2]);
            m.u.push(ax + tu * sz, ay + tv * sz);
            if (emissive) m.c.push(emissive, emissive, emissive);
            else if (cell < 0) { shade(x, Math.max(0.1, y), z, nIdx, col); m.c.push(0.7 + col[0] * 0.5, 0.7 + col[1] * 0.5, 0.7 + col[2] * 0.5); } else { shade(x, y, z, nIdx, col); m.c.push(col[0], col[1], col[2]); }
        }
        m.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const T = TILE;
    const SEG = Math.max(1, Math.round(H / T)), SEGH = H / SEG;
    const faces = [
        { dc: 1, dr: 0, n: 0, a: (x, z) => [x + T, z + T], u: [0, 0, -T] },
        { dc: -1, dr: 0, n: 1, a: (x, z) => [x, z], u: [0, 0, T] },
        { dc: 0, dr: 1, n: 4, a: (x, z) => [x, z + T], u: [T, 0, 0] },
        { dc: 0, dr: -1, n: 5, a: (x, z) => [x + T, z], u: [-T, 0, 0] },
    ];
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        const k = ch(c, r), x = c * T, z = r * T;
        if (k === "#" || k === "%") {
            for (const f of faces) {
                const nb = ch(c + f.dc, r + f.dr);
                if (nb === "#" || nb === "%") continue;
                const [ax, az] = f.a(x, z);
                for (let s = 0; s < SEG; s++) {
                    const h = hash(c + f.dc * 7 + s * 13, r * 31 + f.dr * 3), alt = k === "%";
                    let cell = s === 0 ? (alt ? C.ALT : C.WALL) : (alt ? C.ALT : C.UPPER);
                    if (s === 0 && h > 0.72) cell = alt ? C.ALT2 : C.WALL2;
                    if (s > 0 && h > 0.8 && theme.id !== "garden") cell = alt ? C.ALT2 : C.WALL2;
                    let em = 0;
                    if (s === SEG - 1 && SEG > 1 && h > 0.86 && theme.ceil) { cell = C.GLOW; em = 1.15; }
                    if (theme.id === "kiln" && s === 0 && !alt && h > 0.8) { cell = C.WALL2; em = 1.2; }
                    if (theme.id === "greenhouse" && !alt) em = 0;
                    quad(main, [ax, s * SEGH, az], f.u, [0, SEGH, 0], f.n, cell, 0, 1, 0, 1, em);
                }
            }
            continue;
        }
        if (k === "~") {
            quad(haz, [x, 0.03, z + T], [T, 0, 0], [0, 0, -T], 2, -1, 0, 1, 0, 1);
        } else {
            const path = k === ",", n = hash(Math.floor(c / 3), Math.floor(r / 3)), m = hash(c, r);
            const cell = path ? C.PATH : m > 0.82 ? C.FLOOR3 : n > 0.62 ? C.FLOOR2 : C.FLOOR;
            for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
                const s = T / 2;
                quad(main, [x + i * s, 0, z + (j + 1) * s], [s, 0, 0], [0, 0, -s], 2, cell, i / 2, (i + 1) / 2, j / 2, (j + 1) / 2);
            }
        }
        if (k === "=") {
            for (const f of faces) {
                const nb = ch(c + f.dc, r + f.dr);
                if (nb === "#" || nb === "%" || nb === "=") continue;
                const [ax, az] = f.a(x, z);
                quad(main, [ax, 0, az], f.u, [0, LOW, 0], f.n, C.CRATE, 0, 1, 0, 1);
            }
            quad(main, [x, LOW, z + T], [T, 0, 0], [0, 0, -T], 2, C.CRATE, 0, 1, 0, 1);
        }
        if (theme.ceil) quad(main, [x, H, z], [T, 0, 0], [0, 0, T], 3, C.CEIL, 0, 1, 0, 1);
    }
    const reg = (name, m) => game.assets.mesh(name, { positions: m.p, normals: m.n, uvs: m.u, colors: m.c, indices: m.i });
    reg(`lvl${idx}`, main);
    if (haz.i.length) reg(`lvl${idx}_haz`, haz);

    // A unit box mapped to one wall cell, for secret doors that must look exactly like the wall.
    const sec = makeMesh(), h = 0.5, full = (a, u, v, n) => {
        const base = sec.p.length / 3, N = NORMALS[n], ax = (C.WALL2 % 4) * cellUV + texel, ay = Math.floor(C.WALL2 / 4) * cellUV + texel, sz = cellUV - texel * 2;
        [[0, 0, 0, 1], [1, 0, 1, 1], [1, 1, 1, 0], [0, 1, 0, 0]].forEach(([i, j, tu, tv]) => {
            sec.p.push(a[0] + u[0] * i + v[0] * j, a[1] + u[1] * i + v[1] * j, a[2] + u[2] * i + v[2] * j);
            sec.n.push(N[0], N[1], N[2]); sec.u.push(ax + tu * sz, ay + tv * sz); sec.c.push(1, 1, 1);
        });
        sec.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    full([h, -h, h], [0, 0, -1], [0, 1, 0], 0); full([-h, -h, -h], [0, 0, 1], [0, 1, 0], 1);
    full([-h, -h, h], [1, 0, 0], [0, 1, 0], 4); full([h, -h, -h], [-1, 0, 0], [0, 1, 0], 5);
    reg(`lvl${idx}_sec`, sec);

    // Light levels per tile, for tinting sprites and the viewmodel.
    const tl = new Float32Array(Cn * R * 3);
    for (let r = 0; r < R; r++) for (let c = 0; c < Cn; c++) {
        shade((c + 0.5) * T, 1.3, (r + 0.5) * T, -1, col);
        tl.set(col, (r * Cn + c) * 3);
    }

    const out = { idx, def, theme, rows, R, Cn, ch, H, rects, tileH, tl, heightAt, verts: main.p.length / 3, tris: main.i.length / 3 };
    cache.set(idx, out);
    return out;
}

/** An inward-facing cylinder for the sky. Unlit, follows the player. */
export function skyMesh(game) {
    const p = [], u = [], c = [], n = [], idx = [], seg = 24, R = 120, top = 96, bot = -12;
    for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R, uu = i / seg;
        p.push(x, top, z, x, bot, z);
        u.push(uu, 0.004, uu, 0.996);
        c.push(1, 1, 1, 1, 1, 1);
        n.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    const cap = p.length / 3;
    p.push(0, top, 0); u.push(0.5, 0.004); c.push(1, 1, 1); n.push(0, 1, 0);
    for (let i = 0; i < seg; i++) idx.push(cap, (i + 1) * 2, i * 2);
    game.assets.mesh("skydome", { positions: p, normals: n, uvs: u, colors: c, indices: idx });
}

/** A fence of light, radius 1 and height 1, seen from both sides: the boss's shockwave. A scaled torus would fatten as it grew. */
export function ringMesh(game) {
    const p = [], u = [], c = [], n = [], idx = [], seg = 40;
    for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
        p.push(x, 0.5, z, x, -0.5, z);
        u.push(i / seg, 0, i / seg, 1);
        c.push(1, 1, 0.6, 1, 0.45, 0.1);
        n.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2, a, a + 3, a + 1, a, a + 2, a + 3); }
    game.assets.mesh("ring", { positions: p, normals: n, uvs: u, colors: c, indices: idx });
}
