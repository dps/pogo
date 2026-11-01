// Writes raw RGBA to a PNG with no dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
const T = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const n = Buffer.alloc(4); n.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([n, b, c]); };
export function png(path, w, h, rgba) {
    const raw = Buffer.alloc((w * 4 + 1) * h);
    for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
    writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw, { level: 3 })), chunk("IEND", Buffer.alloc(0))]));
}
