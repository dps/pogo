// Draws every track top-down to a PNG and reports length, tightest corner and clashes between road sections.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { TRACKS } from "../tracks.js";
import { Track } from "../track.js";

function png(w, h, rgb) {
    const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
    const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
    const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, 8 + d.length)), 8 + d.length); return b; };
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const W = 900, H = 600, cw = W / 3, ch = H / 2, img = Buffer.alloc(W * H * 3, 30);
const plot = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
TRACKS.forEach((def, ti) => {
    const t = new Track(def);
    let minR = 1e9, maxSlope = 0, ymin = 1e9, ymax = -1e9, clash = 0, clashAt = null;
    for (let i = 0; i < t.n; i++) {
        minR = Math.min(minR, 1 / Math.max(1e-4, Math.abs(t.curv[i])));
        maxSlope = Math.max(maxSlope, Math.abs(t.slope[i]));
        ymin = Math.min(ymin, t.py[i]); ymax = Math.max(ymax, t.py[i]);
        for (let j = i + 24; j < t.n; j += 2) {
            const g = Math.min(j - i, t.n - (j - i)); if (g < 24) continue;
            const e = Math.hypot(t.px[i] - t.px[j], t.pz[i] - t.pz[j]) - t.wall[i] - t.wall[j];
            if (e < clash && Math.abs(t.py[i] - t.py[j]) < 6) { clash = e; clashAt = [i, j]; }
        }
    }
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < t.n; i++) { x0 = Math.min(x0, t.px[i]); x1 = Math.max(x1, t.px[i]); z0 = Math.min(z0, t.pz[i]); z1 = Math.max(z1, t.pz[i]); }
    const sc = Math.min((cw - 30) / (x1 - x0), (ch - 30) / (z1 - z0)), ox = (ti % 3) * cw + 15, oy = Math.floor(ti / 3) * ch + 15;
    for (let i = 0; i < t.n; i++) for (const d of [-t.wall[i], -t.hw[i], 0, t.hw[i], t.wall[i]]) {
        const p = t.point(i, d), s = t.surf[i];
        const c = d === 0 ? [255, 255, 255] : Math.abs(d) < t.hw[i] + .1 ? (s === 1 ? [90, 200, 255] : s === 3 ? [255, 0, 0] : [255, 200, 60]) : [120, 120, 140];
        plot(ox + (p[0] - x0) * sc, oy + (p[2] - z0) * sc, c);
        if (t.ramp[i] >= 0) plot(ox + (p[0] - x0) * sc + 1, oy + (p[2] - z0) * sc, [255, 80, 200]);
    }
    for (let m = 0; m < 12; m++) { const r = m; plot(ox + (t.px[0] - x0) * sc + r, oy + (t.pz[0] - z0) * sc, [0, 255, 0]); }
    console.log(`${def.id.padEnd(8)} len ${t.length.toFixed(0)} n ${t.n} minR ${minR.toFixed(1)} maxSlope ${maxSlope.toFixed(2)} y ${ymin.toFixed(1)}..${ymax.toFixed(1)} clash ${clash.toFixed(1)} ${clashAt ?? ""}`);
});
mkdirSync(new URL("../tools/tmp/", import.meta.url), { recursive: true });
writeFileSync(new URL("../tools/tmp/tracks.png", import.meta.url), png(W, H, img));
