// The snowfield. A height mesh plus a painted surface, both worked out from how much snow each cell holds. Every step
// is pressed into the surface and stays there. Undo truncates the list of stamps and paints it again.
import { GROUND, ICE, WARM, DITCH, PLATE, GATE, PLINTH, VOID, WALL, PINE } from "./rules.js";

const smooth = (a, b, t) => { t = (t - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function valueNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => valueNoise(x, y) * 0.55 + valueNoise(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + valueNoise(x * 4.3 + 1, y * 4.3 + 9) * 0.15;

export const SNOW_H = 0.2;

export class Terrain {
    /** `map`: { w, h, tiles, snow(i)→0..1 }. `sub` mesh cells per tile, `px` texture pixels per tile. */
    constructor(game, name, map, o = {}) {
        this.game = game; this.name = name; this.map = map;
        const { w, h } = map, sub = (this.sub = o.sub ?? 8), px = (this.px = o.px ?? 44);
        this.w = w; this.h = h; this.pal = o.pal;
        this.amount = new Float32Array(w * h);
        this.base = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) { this.amount[i] = map.snow(i); this.base[i] = this.baseOf(i, map.filled?.(i)); }
        const W = (this.W = w * px), H = (this.H = h * px);
        this.ground = new Uint8Array(W * H * 3);
        this.shade = new Uint8Array(W * H);     // fine grain in the snow
        this.wob = new Float32Array(W * H);     // wanders the edge of the snow
        this.dent = new Uint8Array(W * H);
        this.stamps = [];
        this.paintGround(0, 0, W, H);
        for (let y = 0, p = 0; y < H; y++) for (let x = 0; x < W; x++, p++) {
            this.wob[p] = (fbm(x / px * 1.9, y / px * 1.9) - 0.5) * 0.85 + (valueNoise(x / px * 8, y / px * 8) - 0.5) * 0.16;
            this.shade[p] = 241 + hash(x, y) * 10 + valueNoise(x / px * 3, y / px * 3) * 4;
        }
        game.assets.free(`${name}_tex`);
        game.assets.paint(`${name}_tex`, W, H, () => {}, { smooth: true, mipmaps: false });
        this.asset = game.assets.sprite(`${name}_tex`);
        this.data = this.asset.data;
        this.data.fill(255);
        this.composite(0, 0, W, H);
        this.buildMesh();
        this.dirty = null;
    }

    baseOf(i, filled) {
        const t = this.map.tiles[i];
        if (t === DITCH && !filled) return -0.28;
        if (t === ICE) return -0.015;
        return 0;
    }

    /** Snow field at a point in tile units: 0..1, sharpened so the change happens near tile edges. */
    field(fx, fy, arr = this.amount) {
        const w = this.w, h = this.h;
        const gx = fx - 0.5, gy = fy - 0.5, ix = Math.floor(gx), iy = Math.floor(gy);
        let tx = gx - ix, ty = gy - iy;
        tx = smooth(0.28, 0.72, tx); ty = smooth(0.28, 0.72, ty);
        const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : arr[x + y * w]);
        const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
        return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
    }

    land(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h && this.map.tiles[x + y * this.w] !== VOID; }

    paintGround(x0, y0, x1, y1) {
        const { px, W, map } = this, pal = this.pal ?? {}, G = this.ground, w = this.w;
        const c1 = pal.g1 ?? [120, 112, 124], c2 = pal.g2 ?? [150, 140, 146], mortar = pal.mortar ?? [176, 186, 212];
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const fx = x / px, fy = y / px, cx = Math.floor(fx), cy = Math.floor(fy), t = map.tiles[cx + cy * w], p = (x + y * W) * 3;
            let r, g, b;
            if (t === ICE) {
                const n = fbm(fx * 2.2, fy * 2.2), crack = Math.abs(valueNoise(fx * 3, fy * 3) - 0.5) < 0.012 ? 1 : 0, sheen = valueNoise(fx * 0.9 + fy * 0.9, fy * 0.4 - fx * 0.4);
                r = 148 + n * 60 + sheen * 18; g = 204 + n * 34 + sheen * 10; b = 232 + n * 18;
                if (crack) { r = 236; g = 248; b = 255; }
            } else if (t === WARM) {
                // A slab of dark hearthstone with the fire showing through its cracks.
                const u = fx - cx - 0.5, v = fy - cy - 0.5, qx = Math.abs(u) - 0.42, qy = Math.abs(v) - 0.42, out = Math.max(qx, qy);
                const n = fbm(fx * 2.3 + 11, fy * 2.3), crack = Math.abs(valueNoise(fx * 4.2 + 3, fy * 4.2) - 0.5), line = smooth(0.05, 0.012, crack), heat = 0.5 + 0.5 * Math.sin(fx * 3 + fy * 2);
                r = 62 + n * 34; g = 48 + n * 22; b = 56 + n * 22;
                r += (255 - r) * line * (0.65 + heat * 0.35); g += (150 - g) * line * (0.65 + heat * 0.35); b += (58 - b) * line * 0.8;
                if (out > 0) { r *= 0.7; g *= 0.7; b *= 0.8; }
            } else if (t === DITCH) {
                const n = fbm(fx * 3, fy * 3);
                r = 40 + n * 44; g = 72 + n * 58; b = 104 + n * 66;
            } else {
                // One rounded paving slab per tile: you can count your way across the plot.
                const u = fx - cx - 0.5, v = fy - cy - 0.5, qx = Math.abs(u) - 0.41, qy = Math.abs(v) - 0.41, out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 0.05;
                const stone = smooth(0.02, -0.018, out), id = hash(cx * 3 + 1, cy * 5 + 2), n = fbm(fx * 3.4, fy * 3.4) * 0.5 + hash(x, y) * 0.05, dust = smooth(0.5, 0.68, fbm(fx * 1.9 + 3, fy * 1.9 + 8));
                const sr = c1[0] + (c2[0] - c1[0]) * id + (n - 0.27) * 34, sg = c1[1] + (c2[1] - c1[1]) * id + (n - 0.27) * 34, sb = c1[2] + (c2[2] - c1[2]) * id + (n - 0.27) * 36;
                const mr = sr * 0.66 + 24, mg = sg * 0.66 + 26, mb = sb * 0.66 + 40;
                r = mr + (sr - mr) * stone; g = mg + (sg - mg) * stone; b = mb + (sb - mb) * stone;
                r += (214 - r) * dust * 0.3; g += (224 - g) * dust * 0.3; b += (242 - b) * dust * 0.3;
            }
            G[p] = r; G[p + 1] = g; G[p + 2] = b;
        }
    }

    composite(x0, y0, x1, y1) {
        const { W, H, px, ground: G, dent, shade, wob, data } = this;
        x0 = Math.max(1, x0); y0 = Math.max(1, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
            const p = x + y * W, q = p * 3, o = p * 4;
            const a = this.field((x + 0.5) / px, (y + 0.5) / px);
            const m = a <= 0 ? 0 : smooth(0.33, 0.41, a + wob[p] * Math.min(1, a * 2.5) * Math.min(1, (1 - a) * 2.5 + 0.08));
            if (m <= 0) { data[o] = G[q]; data[o + 1] = G[q + 1]; data[o + 2] = G[q + 2]; continue; }
            const e = dent[p] / 255, lit = (dent[p - 1] - dent[p + 1] + dent[p - W] - dent[p + W]) / 255;
            const s = shade[p] / 255 + lit * 0.22;
            let r = s * (1 - e * 0.36) * 255, g = s * (1 - e * 0.27) * 255, b = s * (1 - e * 0.1) * 255;
            if (r > 255) r = 255; if (g > 255) g = 255; if (b > 255) b = 255;
            data[o] = G[q] + (r - G[q]) * m; data[o + 1] = G[q + 1] + (g - G[q + 1]) * m; data[o + 2] = G[q + 2] + (b - G[q + 2]) * m;
        }
    }

    heightAt(fx, fy) {
        const a = this.field(fx, fy), b = this.field(fx, fy, this.base);
        const lump = (valueNoise(fx * 2.4, fy * 2.4) - 0.5) * 0.09 * a;
        return b + a * SNOW_H + lump;
    }

    buildMesh() {
        const { w, h, sub } = this, nx = w * sub + 1, nz = h * sub + 1;
        this.nx = nx; this.nz = nz;
        const positions = [], normals = [], uvs = [], colors = [], indices = [], id = new Int32Array(nx * nz).fill(-1);
        const need = (i, j) => {
            const k = i + j * nx;
            if (id[k] >= 0) return id[k];
            id[k] = positions.length / 3;
            positions.push(i / sub - w / 2, 0, j / sub - h / 2); normals.push(0, 1, 0); uvs.push(i / sub / w, j / sub / h); colors.push(1, 1, 1);
            return id[k];
        };
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!this.land(x, y)) continue;
            for (let b = 0; b < sub; b++) for (let a = 0; a < sub; a++) {
                const i = x * sub + a, j = y * sub + b, A = need(i, j), B = need(i + 1, j), C = need(i + 1, j + 1), D = need(i, j + 1);
                indices.push(A, D, C, A, C, B);
            }
        }
        // Rim vertices stay at ground level, so the snow dips to meet the fence and the cliff.
        this.rim = new Float32Array(nx * nz);
        for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
            if (id[i + j * nx] < 0) continue;
            const fx = i / sub, fy = j / sub;
            let edge = 1;
            for (let dy = -0.34; dy <= 0.34; dy += 0.17) for (let dx = -0.34; dx <= 0.34; dx += 0.17) {
                if (!this.land(Math.floor(fx + dx), Math.floor(fy + dy))) edge = Math.min(edge, smooth(0, 0.34, Math.max(0, Math.hypot(dx, dy) - 0.02)));
            }
            this.rim[i + j * nx] = edge;
        }
        this.id = id;
        // A hidden vertex keeps the mesh's natural height from being zero.
        positions.push(0, -1, 0); normals.push(0, 1, 0); uvs.push(0, 0); colors.push(1, 1, 1);
        this.game.assets.free(`${this.name}_mesh`);
        this.game.assets.mesh(`${this.name}_mesh`, { positions, normals, uvs, colors, indices });
        this.geom = this.game.assets.geometry(`${this.name}_mesh`);
        this.heights = new Float32Array(nx * nz);
        this.reshape(0, 0, w, h);
    }

    /** Recompute heights and normals for a block of tiles. */
    reshape(x0, y0, x1, y1) {
        const { sub, nx, nz, heights, rim, id } = this, v = this.geom.vertices;
        const I0 = Math.max(0, x0 * sub - 1), J0 = Math.max(0, y0 * sub - 1), I1 = Math.min(nx - 1, x1 * sub + 1), J1 = Math.min(nz - 1, y1 * sub + 1);
        for (let j = J0; j <= J1; j++) for (let i = I0; i <= I1; i++) heights[i + j * nx] = this.heightAt(i / sub, j / sub) * rim[i + j * nx];
        const H = (i, j) => heights[(i < 0 ? 0 : i >= nx ? nx - 1 : i) + (j < 0 ? 0 : j >= nz ? nz - 1 : j) * nx];
        const J2 = Math.max(0, J0 - 1), I2 = Math.max(0, I0 - 1), J3 = Math.min(nz - 1, J1 + 1), I3 = Math.min(nx - 1, I1 + 1), step = 2 / sub;
        for (let j = J2; j <= J3; j++) for (let i = I2; i <= I3; i++) {
            const k = id[i + j * nx];
            if (k < 0) continue;
            const o = k * 11, ax = H(i - 1, j) - H(i + 1, j), az = H(i, j - 1) - H(i, j + 1), l = Math.hypot(ax, step, az);
            v[o + 1] = heights[i + j * nx]; v[o + 3] = ax / l; v[o + 4] = step / l; v[o + 5] = az / l;
        }
    }

    /** Mark tiles changed; call flush() once per frame. */
    touch(x, y, r = 1) {
        const d = this.dirty ??= [x, y, x, y];
        d[0] = Math.min(d[0], x); d[1] = Math.min(d[1], y); d[2] = Math.max(d[2], x); d[3] = Math.max(d[3], y);
        d[4] = Math.max(d[4] ?? 0, r);
    }
    setSnow(i, v) { if (this.amount[i] === v) return; this.amount[i] = v; this.touch(i % this.w, Math.floor(i / this.w)); }
    setBase(i, v) { if (this.base[i] === v) return; this.base[i] = v; this.touch(i % this.w, Math.floor(i / this.w)); }

    /** Press a mark into the snow. kind 0 is a paw print, 1 is a soft scuff. Coordinates are tile units. */
    stamp(fx, fy, rot, kind = 0) {
        this.stamps.push([fx, fy, rot, kind]);
        this.press(fx, fy, rot, kind);
    }
    press(fx, fy, rot, kind) {
        const { px, W, H, dent } = this, c = Math.cos(rot), s = Math.sin(rot), cx = fx * px, cy = fy * px;
        const rx = (kind ? 0.2 : 0.085) * px, ry = (kind ? 0.1 : 0.115) * px, R = Math.ceil(Math.max(rx, ry)) + 2;
        const x0 = Math.max(1, Math.floor(cx - R)), x1 = Math.min(W - 2, Math.ceil(cx + R)), y0 = Math.max(1, Math.floor(cy - R)), y1 = Math.min(H - 2, Math.ceil(cy + R));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const dx = x - cx, dy = y - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry, d = 1 - (u * u + v * v);
            if (d <= 0) continue;
            const k = Math.min(1, d * 1.9) * (kind ? 120 : 170), p = x + y * W;
            if (k > dent[p]) dent[p] = k;
        }
        const d = this.ink ??= [x0, y0, x1, y1];
        d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1);
    }
    /** Back to an earlier count of stamps. */
    rewind(n) {
        if (n >= this.stamps.length) return;
        this.stamps.length = n;
        this.dent.fill(0);
        for (const [fx, fy, rot, kind] of this.stamps) this.press(fx, fy, rot, kind);
        this.ink = [1, 1, this.W - 2, this.H - 2];
    }

    flush() {
        let changed = false;
        const px = this.px;
        if (this.dirty) {
            const [x0, y0, x1, y1] = this.dirty;
            this.reshape(x0 - 1, y0 - 1, x1 + 2, y1 + 2);
            this.game.renderer.freeGeometry(this.geom);
            this.composite((x0 - 1) * px, (y0 - 1) * px, (x1 + 2) * px, (y1 + 2) * px);
            this.dirty = null; changed = true;
        }
        if (this.ink) { const [a, b, c, d] = this.ink; this.composite(a - 2, b - 2, c + 3, d + 3); this.ink = null; changed = true; }
        if (changed) this.game.assets.refresh(`${this.name}_tex`);
    }

    free() { this.game.assets.free(`${this.name}_mesh`); this.game.assets.free(`${this.name}_tex`); }
}
