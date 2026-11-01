// Fast art preview: node tools/art.mjs c1 [S] writes tools/tmp/c1.png, the scene over its outside.
import { paintScene, SCENES } from "../scenes.js";
import { OUTSIDE } from "../outside.js";
import { png } from "./png.mjs";
import { mkdirSync } from "node:fs";
mkdirSync(new URL("./tmp", import.meta.url).pathname, { recursive: true });
const id = process.argv[2] ?? "c1", S = +(process.argv[3] ?? 2), showProps = (process.argv[4] ?? "").split(",").filter(Boolean);
let t = Date.now();
const r = paintScene(id, S), sc = SCENES[id];
console.log("scene ms", Date.now() - t); t = Date.now();
const layers = OUTSIDE[sc.out]();
console.log("outside ms", Date.now() - t);
const W = r.base.W, H = r.base.H, out = new Uint8Array(W * H * 4);
const put = (dst, c, xo = 0, yo = 0, sc = 1) => { const b = c.d; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = (((x / sc + xo) | 0) % c.W + c.W) % c.W, sy = ((y / sc + yo) | 0); if (sy < 0 || sy >= c.H) continue; const i = (sy * c.W + sx) * 4, j = (y * W + x) * 4, a = b[i + 3], q = 1 - a; for (let k = 0; k < 3; k++) dst[j + k] = dst[j + k] * q + b[i + k] * a * 0 + b[i + k]; dst[j + 3] = 1; } };
const f = new Float32Array(W * H * 4);
const scale = S; // outside strips are at 1x
for (const [i, l] of layers.entries()) put(f, l, 300 * i, -58, scale);
const o = (c, ox = 0, oy = 0) => { const b = c.d; for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) { const i = (y * c.W + x) * 4, j = ((y + oy) * W + x + ox) * 4, a = b[i + 3], q = 1 - a; if (a <= 0) continue; for (let k = 0; k < 3; k++) f[j + k] = f[j + k] * q + b[i + k]; } };
o(r.base);
for (const k of showProps) { const c = r.props[k]; o(c, Math.round((c.ox) * S), Math.round(c.oy * S)); }
for (let i = 0; i < out.length; i += 4) { out[i] = Math.min(255, f[i] * 255); out[i + 1] = Math.min(255, f[i + 1] * 255); out[i + 2] = Math.min(255, f[i + 2] * 255); out[i + 3] = 255; }
png(new URL(`./tmp/${id}.png`, import.meta.url).pathname, W, H, out);
