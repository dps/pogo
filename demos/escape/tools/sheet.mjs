// node tools/sheet.mjs c2,c3,c4 [flags] : a stacked contact sheet of scenes at 1x, with props shown for the given flags.
import { paintScene, SCENES } from "../scenes.js";
import { OUTSIDE } from "../outside.js";
import { Rules } from "../rules.js";
import { png } from "./png.mjs";
const ids = (process.argv[2] ?? "c1").split(","), flags = (process.argv[3] ?? "").split(",").filter(Boolean), out = process.argv[4] ?? "sheet";
const S = +(process.env.S ?? 1), W = 1200 * S, H = 440 * S, f = new Float32Array(W * H * ids.length * 4);
const r = new Rules(); for (const k of flags) r.s.f[k] = 1;
ids.forEach((id, n) => {
    const sc = SCENES[id], base = paintScene(id, S), layers = OUTSIDE[sc.out](), oy = n * H;
    const over = (c, ox, cy) => { const b = c.d; for (let y = 0; y < c.H; y++) for (let x = 0; x < c.W; x++) { const i = (y * c.W + x) * 4, j = ((y + cy + oy) * W + x + ox) * 4; if (j < 0 || j >= f.length) continue; const a = b[i + 3]; if (a <= 0) continue; for (let k = 0; k < 3; k++) f[j + k] = f[j + k] * (1 - a) + b[i + k]; } };
    layers.forEach((l, i) => { for (let tx = -1; tx < 3; tx++) over2(l, tx * 1024 * S - 200 * i, (i ? -30 : 30) * S); });
    function over2(l, ox, cy) { const k = S, b = l.d; for (let y = 0; y < l.H * k; y++) for (let x = 0; x < l.W * k; x++) { const X = x + ox; if (X < 0 || X >= W) continue; if (y + cy < 0 || y + cy >= H) continue; const i = ((y / k | 0) * l.W + (x / k | 0)) * 4, j = ((y + cy + oy) * W + X) * 4, a = b[i + 3]; if (a <= 0) continue; for (let q = 0; q < 3; q++) f[j + q] = f[j + q] * (1 - a) + b[i + q]; } }
    over(base.base, 0, 0);
    for (const k in base.props) { const pr = sc.props[k]; if (pr.show && !r.cond(pr.show)) continue; over(base.props[k], Math.round(base.props[k].ox * S), Math.round(base.props[k].oy * S)); }
});
const b = new Uint8Array(f.length); for (let i = 0; i < f.length; i += 4) { b[i] = Math.min(255, f[i] * 255); b[i + 1] = Math.min(255, f[i + 1] * 255); b[i + 2] = Math.min(255, f[i + 2] * 255); b[i + 3] = 255; }
png(new URL(`./tmp/${out}.png`, import.meta.url).pathname, W, H * ids.length, b);
