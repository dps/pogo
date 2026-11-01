// Top-down maps of the holes as a PNG contact sheet: the eyes for hand design. usage: node tools/map.mjs out.png [from] [to] [trace.json]
import { deflateSync } from "node:zlib";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { Course, CELL, GRASS, GREEN, ROUGH, SAND, ICE, ROCK, WOOD, LAVA, WATER, SNOW } from "../course.js";
import { HOLES } from "../holes.js";
const [out = "map.png", from = 0, to = 27, tracePath] = process.argv.slice(2);
const COL = { 0: [40, 40, 60], [GRASS]: [90, 190, 90], [GREEN]: [150, 230, 120], [ROUGH]: [60, 130, 70], [SAND]: [235, 215, 150], [ICE]: [180, 230, 250], [ROCK]: [120, 100, 100], [WOOD]: [160, 110, 60], [LAVA]: [255, 90, 20], [WATER]: [40, 120, 230], [SNOW]: [250, 250, 255] };
const hs = HOLES.slice(+from, +to), cols = Math.min(5, hs.length), S = 5, W = 300, Hh = 340, W0 = cols * W, H0 = Math.ceil(hs.length / cols) * Hh;
const px = new Uint8Array(W0 * H0 * 3).fill(24);
const set = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W0 || y >= H0) return; const i = (x + y * W0) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; };
const line = (a, b, c, d, col) => { const n = Math.ceil(Math.hypot(c - a, d - b)) + 1; for (let i = 0; i <= n; i++) set(a + (c - a) * i / n, b + (d - b) * i / n, col); };
const circle = (x, y, r, col) => { for (let i = 0; i < 40; i++) set(x + Math.cos(i / 40 * 6.283) * r, y + Math.sin(i / 40 * 6.283) * r, col); };
const traces = tracePath && existsSync(tracePath) ? JSON.parse(readFileSync(tracePath, "utf8")) : {};
hs.forEach((h, n) => {
    const ox = (n % cols) * W, oy = Math.floor(n / cols) * Hh, c = new Course(h, h.island);
    const sw = c.span.x1 - c.span.x0, sh = c.span.z1 - c.span.z0, sc = Math.min((W - 8) / sw, (Hh - 8) / sh);
    const X = (x) => ox + 4 + (x - c.span.x0) * sc, Y = (z) => oy + 4 + (z - c.span.z0) * sc;
    let minH = 1e9, maxH = -1e9; for (let i = 0; i < c.H.length; i++) if (c.S[i] > 0) { minH = Math.min(minH, c.H[i]); maxH = Math.max(maxH, c.H[i]); }
    for (let k = 0; k < c.nz; k++) for (let i = 0; i < c.nx; i++) {
        const j = i + k * c.nx; if (c.S[j] <= 0 || !c.M[j]) continue;
        const col = COL[c.M[j]], f = 0.6 + 0.6 * (c.H[j] - minH) / Math.max(1, maxH - minH);
        const a = X(c.x0 + i * CELL), b = Y(c.z0 + k * CELL), s = Math.ceil(CELL * sc);
        for (let p = 0; p < s; p++) for (let q = 0; q < s; q++) set(a + p, b + q, [Math.min(255, col[0] * f), Math.min(255, col[1] * f), Math.min(255, col[2] * f)]);
    }
    for (const r of c.rails) line(X(r.ax), Y(r.az), X(r.bx), Y(r.bz), r.h > 0 ? [255, 255, 255] : [100, 100, 100]);
    for (const d of c.decks) {
        if (d.R) { circle(X(d.x), Y(d.z), d.R * sc, [255, 200, 60]); continue; }
        const cy = Math.cos(d.yaw), sy = Math.sin(d.yaw), P = (u, w) => [d.x + cy * u + sy * w, d.z - sy * u + cy * w], q = [P(-d.hw, -d.hd), P(d.hw, -d.hd), P(d.hw, d.hd), P(-d.hw, d.hd)];
        for (let i = 0; i < 4; i++) line(X(q[i][0]), Y(q[i][1]), X(q[(i + 1) % 4][0]), Y(q[(i + 1) % 4][1]), [255, 200, 60]);
        if (d.move) line(X(d.x), Y(d.z), X(d.x + d.move[0]), Y(d.z + d.move[2]), [255, 120, 200]);
    }
    for (const p of c.posts) circle(X(p.x), Y(p.z), p.r * sc, p.kick ? [255, 60, 200] : [200, 200, 200]);
    for (const w of c.sweepers) circle(X(w.x), Y(w.z), w.len * sc, [255, 60, 60]);
    for (const g of c.geysers) { circle(X(g.x), Y(g.z), g.r * sc, [100, 255, 255]); if (g.to) line(X(g.x), Y(g.z), X(g.to[0]), Y(g.to[2]), [100, 255, 255]); }
    for (const p of c.plants) { circle(X(p.x), Y(p.z), p.r * sc, [255, 80, 255]); line(X(p.x), Y(p.z), X(p.to[0]), Y(p.to[2]), [255, 80, 255]); }
    for (const t of c.tubes) { circle(X(t.x), Y(t.z), t.r * sc, [255, 255, 0]); line(X(t.x), Y(t.z), X(t.x1), Y(t.z1), [180, 180, 0]); }
    for (const s of c.secrets) circle(X(s.x), Y(s.z), 3, [255, 255, 255]);
    circle(X(c.tee_.x), Y(c.tee_.z), 4, [0, 255, 0]); circle(X(c.cup_.x), Y(c.cup_.z), 4, [255, 0, 0]);
    const tr = traces[HOLES.indexOf(h)]; if (tr) for (const l of tr) for (let i = 1; i < l.length; i++) line(X(l[i - 1][0]), Y(l[i - 1][1]), X(l[i][0]), Y(l[i][1]), [255, 255, 0]);
});
const crc = (() => { const T = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; }); return (b) => { let c = -1; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
const ih = Buffer.alloc(13); ih.writeUInt32BE(W0, 0); ih.writeUInt32BE(H0, 4); ih[8] = 8; ih[9] = 2;
const raw = Buffer.alloc((W0 * 3 + 1) * H0); for (let y = 0; y < H0; y++) Buffer.from(px.buffer, y * W0 * 3, W0 * 3).copy(raw, y * (W0 * 3 + 1) + 1);
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
