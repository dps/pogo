// node tools/montage.mjs out.png cols scale a.png b.png ... : tiles screenshots, scaled down, so many can be checked at once.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { png } from "./png.mjs";
function load(p) {
    const b = readFileSync(p); let o = 8, w, h, ct, idat = [];
    while (o < b.length) { const n = b.readUInt32BE(o), t = b.toString("latin1", o + 4, o + 8); if (t === "IHDR") { w = b.readUInt32BE(o + 8); h = b.readUInt32BE(o + 12); ct = b[o + 17]; } if (t === "IDAT") idat.push(b.subarray(o + 8, o + 8 + n)); o += 12 + n; }
    const raw = inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 3, st = w * bpp, out = new Uint8Array(w * h * 4), prev = new Uint8Array(st), cur = new Uint8Array(st);
    for (let y = 0; y < h; y++) { const f = raw[y * (st + 1)]; for (let i = 0; i < st; i++) { const v = raw[y * (st + 1) + 1 + i], a = i >= bpp ? cur[i - bpp] : 0, u = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let r = v; if (f === 1) r += a; else if (f === 2) r += u; else if (f === 3) r += (a + u) >> 1; else if (f === 4) { const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c); r += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; } cur[i] = r & 255; } for (let x = 0; x < w; x++) { const j = (y * w + x) * 4; out[j] = cur[x * bpp]; out[j + 1] = cur[x * bpp + 1]; out[j + 2] = cur[x * bpp + 2]; out[j + 3] = 255; } prev.set(cur); }
    return { w, h, d: out };
}
const [out, cols, sc, ...files] = process.argv.slice(2), C = +cols, K = +sc, ims = files.map(load), cw = Math.floor(ims[0].w / K), ch = Math.floor(ims[0].h / K), R = Math.ceil(ims.length / C), W = cw * C, H = ch * R, b = new Uint8Array(W * H * 4).fill(255);
ims.forEach((m, n) => { const ox = (n % C) * cw, oy = Math.floor(n / C) * ch; for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = (Math.min(m.h - 1, Math.floor(y * K)) * m.w + Math.min(m.w - 1, Math.floor(x * K))) * 4, j = ((y + oy) * W + x + ox) * 4; for (let q = 0; q < 3; q++) b[j + q] = m.d[i + q]; } });
png(out, W, H, b);
