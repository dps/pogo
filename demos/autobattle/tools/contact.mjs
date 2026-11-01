// Writes a PNG of the pet sheet for looking at. node tools/contact.mjs out.png
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { paintPets, SHEET } from "../art.js";
let data; const t0 = performance.now();
const game = { headless: true, assets: { a: null, paint(n, w, h, fn) { data = new Uint8Array(w * h * 4); this.a = { data }; }, grid() {}, sprite() { return this.a; } } };
paintPets(game); console.log("paint ms", (performance.now() - t0) | 0);
const rows = Number(process.argv[3] ?? 15), H = Math.min(SHEET, rows * 136), W = SHEET;
const bg = [255, 200, 225], raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0, o = 0; y < H; y++) { raw[o++] = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, a = data[i + 3] / 255; for (let c = 0; c < 3; c++) raw[o++] = data[i + c] * a + bg[c] * (1 - a); raw[o++] = 255; } }
const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(process.argv[2] ?? "contact.png", Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 3 })), chunk("IEND", Buffer.alloc(0))]));
