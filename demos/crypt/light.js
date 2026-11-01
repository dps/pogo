// A small software lightmap. Lights are marched through the tile grid, so walls and shut doors cast real
// shadows. The result is two low-res textures stretched over the room: one darkens, one adds coloured glow.
export const RES = 6, MARGIN = 2;

export class Lightmap {
    constructor(game, name, w, h) {
        this.game = game; this.w = w; this.h = h;
        this.W = (w + MARGIN * 2) * RES; this.H = (h + MARGIN * 2 + 1) * RES;
        this.dark = name + "_d"; this.tint = name + "_t";
        const paint = (n) => { game.assets.paint(n, this.W, this.H, () => {}, { smooth: true, mipmaps: false }); return game.assets.sprite(n).data; };
        this.dd = paint(this.dark); this.td = paint(this.tint);
        this.blocks = new Uint8Array((w + MARGIN * 2) * (h + MARGIN * 2 + 1));
        // The lit region fades to solid dark at its edge, so the room floats in blackness on any screen shape.
        this.edge = new Float32Array(this.W * this.H);
        for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) { const q = Math.min(x, y, this.W - 1 - x, this.H - 1 - y) / (RES * 1.6); this.edge[y * this.W + x] = Math.min(1, q * q * (3 - 2 * q) * (q < 1 ? 1 : 0) + (q >= 1 ? 1 : 0)); }
        this.r = new Float32Array(this.W * this.H); this.g = new Float32Array(this.W * this.H); this.b = new Float32Array(this.W * this.H); this.l = new Float32Array(this.W * this.H);
    }
    free() { this.game.assets.free(this.dark); this.game.assets.free(this.tint); }
    setBlocks(fn) {
        const W = this.w + MARGIN * 2, H = this.h + MARGIN * 2 + 1;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) this.blocks[y * W + x] = fn(x - MARGIN, y - MARGIN - 1) ? 1 : 0;
    }
    /** lights: { x, y, r, i, c:[r,g,b] } in tile units, where tile (0,0) spans 0..1 */
    render(lights, ambient, base) {
        const { W, H, l, r, g, b, blocks } = this, gw = this.w + MARGIN * 2, gh = this.h + MARGIN * 2 + 1;
        l.fill(0); r.fill(0); g.fill(0); b.fill(0);
        for (const L of lights) {
            const lx = (L.x + MARGIN) * RES, ly = (L.y + MARGIN + 1) * RES, rad = L.r * RES, cr = L.c[0] / 255, cg = L.c[1] / 255, cb = L.c[2] / 255;
            const x0 = Math.max(0, Math.floor(lx - rad)), x1 = Math.min(W - 1, Math.ceil(lx + rad)), y0 = Math.max(0, Math.floor(ly - rad)), y1 = Math.min(H - 1, Math.ceil(ly + rad));
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
                const dx = x + 0.5 - lx, dy = y + 0.5 - ly, q = (dx * dx + dy * dy) / (rad * rad);
                if (q >= 1) continue;
                const dist = Math.sqrt(dx * dx + dy * dy);
                // March from the light towards this sample, stopping a little short so wall faces still catch light.
                const steps = (dist / (RES * 0.34)) | 0;
                let shade = 1;
                for (let k = 1; k < steps - 1; k++) {
                    const t = k / steps, sx = ((lx + dx * t) / RES) | 0, sy = ((ly + dy * t) / RES) | 0;
                    if (sx >= 0 && sy >= 0 && sx < gw && sy < gh && blocks[sy * gw + sx]) { shade = 0; break; }
                }
                if (!shade) continue;
                const a = (1 - q) * (1 - q) * L.i, o = y * W + x;
                l[o] += a; r[o] += a * cr; g[o] += a * cg; b[o] += a * cb;
            }
        }
        const dd = this.dd, td = this.td, edge = this.edge, [ar, ag, ab] = ambient;
        for (let i = 0, n = W * H; i < n; i++) {
            const e = edge[i], lit = (base + l[i]) * e, dark = lit >= 1 ? 0 : 1 - lit, o = i * 4;
            dd[o] = ar; dd[o + 1] = ag; dd[o + 2] = ab; dd[o + 3] = dark * 255;
            td[o] = Math.min(255, r[i] * 86 * e); td[o + 1] = Math.min(255, g[i] * 86 * e); td[o + 2] = Math.min(255, b[i] * 86 * e); td[o + 3] = 255;
        }
        this.game.assets.refresh(this.dark); this.game.assets.refresh(this.tint);
    }
}
