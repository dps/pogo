// The drawing API handed to draw hooks. All coordinates are local to the entity being drawn, centred on it.
import { color, Color, ColorLike, mat4, mat4Compose, mat4Mul, toVec, Vec, VecLike } from "../math";
import type { Entity } from "../entity";
import type { Camera2D } from "../camera";
import type { Game } from "../game";
import { MeshItem, MODE_SDF, MODE_SOLID, MODE_TEXTURE, TextStyle } from "./backend";

export interface PaintOptions { x?: number; y?: number; color?: ColorLike; opacity?: number; }
const DEFAULT_FONT = "system-ui, -apple-system, Roboto, sans-serif";
const WHITE = new Color();
const scratch = mat4();
const QUAD = new Float32Array(6);

export interface DrawnText { text: string; x0: number; y0: number; x1: number; y1: number; size: number; hidden: boolean; }

export class Draw {
    private m = new Float32Array([1, 0, 0, 1, 0, 0]);
    private alpha = 1;
    private stack: Float32Array[] = [];
    /** @internal Text drawn this frame, in view units, for the layout audit. Null when not recording. */
    texts: DrawnText[] | null = null;
    /** @internal The camera while drawing world entities, so recorded text lands in view units. */
    camera: Camera2D | null = null;
    private colors = new Map<string, Color>();

    constructor(private game: Game) {}
    private get r() { return this.game.renderer; }

    private paint(c: ColorLike | undefined, o: PaintOptions) {
        let col: Color;
        if (c === undefined) col = WHITE;
        else if (typeof c === "string") {
            col = this.colors.get(c) ?? color(c);
            this.colors.set(c, col);
        } else col = color(c);
        return [col.r, col.g, col.b, col.a * this.alpha * (o.opacity ?? 1)];
    }

    /** @internal */
    begin(e: Entity) {
        const w = e.world, m = this.m;
        m[0] = w[0]; m[1] = w[1]; m[2] = w[4]; m[3] = w[5]; m[4] = w[12]; m[5] = w[13];
        this.alpha = e._opacity;
        this.stack.length = 0;
    }
    /** @internal Back to an untransformed, fully opaque state. */
    reset() {
        this.m.set([1, 0, 0, 1, 0, 0]);
        this.alpha = 1;
        this.stack.length = 0;
    }

    /** Save the transform. Pair with pop(). */
    push() { this.stack.push(this.m.slice()); }
    pop() { const m = this.stack.pop(); if (m) this.m.set(m); }
    translate(x: number, y: number) {
        const m = this.m;
        m[4] += m[0] * x + m[2] * y;
        m[5] += m[1] * x + m[3] * y;
    }
    rotate(angle: number) {
        const m = this.m, c = Math.cos(angle), s = Math.sin(angle), a = m[0], b = m[1], cc = m[2], dd = m[3];
        m[0] = a * c + cc * s; m[1] = b * c + dd * s;
        m[2] = cc * c - a * s; m[3] = dd * c - b * s;
    }
    scale(x: number, y = x) {
        const m = this.m;
        m[0] *= x; m[1] *= x; m[2] *= y; m[3] *= y;
    }
    /** Everything drawn inside fn adds light instead of covering what's behind it: glows, sparks, lasers. */
    additive(fn: () => void) {
        this.r.blend(true);
        try { fn(); } finally { this.r.blend(false); }
    }

    /** A rectangle's box in view units. */
    private box(x: number, y: number, w: number, h: number) {
        const m = this.m, cam = this.camera, sx = Math.hypot(m[0], m[1]), sy = Math.hypot(m[2], m[3]), zoom = cam?.zoom ?? 1;
        let cx = m[0] * x + m[2] * y + m[4], cy = m[1] * x + m[3] * y + m[5];
        if (cam) { const p = cam.toView(new Vec(cx, cy)); cx = p.x; cy = p.y; }
        const hw = (w * sx * zoom) / 2, hh = (h * sy * zoom) / 2;
        return { x0: cx - hw, y0: cy - hh, x1: cx + hw, y1: cy + hh };
    }

    rect(w: number, h: number, o: PaintOptions & { radius?: number; outline?: number } = {}) {
        const [r, g, b, a] = this.paint(o.color, o), x = o.x ?? 0, y = o.y ?? 0, hw = w / 2, hh = h / 2, pad = 1.5;
        // A solid panel hides earlier text, so a menu over a HUD isn't an overlap.
        if (this.texts?.length && a > 0.9 && !o.outline) {
            const p = this.box(x, y, w, h);
            for (const t of this.texts) if (t.x0 >= p.x0 - 1 && t.y0 >= p.y0 - 1 && t.x1 <= p.x1 + 1 && t.y1 <= p.y1 + 1) t.hidden = true;
        }
        this.r.quad(this.m, x - hw - pad, y - hh - pad, x + hw + pad, y + hh + pad, -hw - pad, -hh - pad, hw + pad, hh + pad, r, g, b, a, null, MODE_SDF, hw, hh, Math.min(o.radius ?? 0, hw, hh), o.outline ?? 0);
    }
    circle(radius: number, o: PaintOptions & { outline?: number } = {}) {
        this.rect(radius * 2, radius * 2, { ...o, radius });
    }
    /** A line between two local points. */
    line(a: VecLike, b: VecLike, o: PaintOptions & { width?: number } = {}) {
        const p = toVec(a), q = toVec(b), d = q.sub(p), len = d.len();
        if (len === 0) return;
        const n = new Vec(-d.y / len, d.x / len).mul((o.width ?? 2) / 2), [r, g, bl, al] = this.paint(o.color, o);
        this.r.tris(this.m, [p.x + n.x, p.y + n.y, q.x + n.x, q.y + n.y, q.x - n.x, q.y - n.y, p.x + n.x, p.y + n.y, q.x - n.x, q.y - n.y, p.x - n.x, p.y - n.y], r, g, bl, al);
    }
    /** A filled convex polygon. */
    poly(points: VecLike[], o: PaintOptions = {}) {
        const pts = points.map(toVec), out: number[] = [], [r, g, b, a] = this.paint(o.color, o);
        for (let i = 1; i < pts.length - 1; i++) out.push(pts[0].x, pts[0].y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
        this.r.tris(this.m, out, r, g, b, a);
    }
    sprite(name: string, o: PaintOptions & { frame?: number; width?: number; height?: number; flipX?: boolean; rot?: number; crop?: [number, number, number, number] } = {}) {
        if (o.rot) {
            this.push();
            this.translate(o.x ?? 0, o.y ?? 0);
            this.rotate(o.rot);
            this.sprite(name, { ...o, x: 0, y: 0, rot: 0 });
            this.pop();
            return;
        }
        const asset = this.game.assets.sprite(name);
        const frame = (o.frame ?? 0) % (asset.cols * asset.rows), col = frame % asset.cols, row = Math.floor(frame / asset.cols);
        // crop is [x, y, width, height] in pixels, for atlases with cells of mixed sizes.
        const crop = o.crop, w = o.width ?? crop?.[2] ?? asset.frameW, h = o.height ?? crop?.[3] ?? asset.frameH, x = o.x ?? 0, y = o.y ?? 0;
        const u0 = crop ? crop[0] / asset.width : col / asset.cols, v0 = crop ? crop[1] / asset.height : row / asset.rows;
        const u1 = crop ? (crop[0] + crop[2]) / asset.width : (col + 1) / asset.cols, v1 = crop ? (crop[1] + crop[3]) / asset.height : (row + 1) / asset.rows;
        const [r, g, b, a] = this.paint(o.color, o);
        const flip = !!o.flipX;
        this.r.quad(this.m, x - w / 2, y - h / 2, x + w / 2, y + h / 2, flip ? u1 : u0, v0, flip ? u0 : u1, v1, r, g, b, a, this.r.texture(asset), MODE_TEXTURE, 0, 0, 0, 0);
    }
    text(str: string | number, o: PaintOptions & Partial<TextStyle> & { rot?: number } = {}) {
        if (o.rot) {
            this.push();
            this.translate(o.x ?? 0, o.y ?? 0);
            this.rotate(o.rot);
            this.text(str, { ...o, x: 0, y: 0, rot: 0 });
            this.pop();
            return;
        }
        const style: TextStyle = { size: o.size ?? 20, font: o.font ?? DEFAULT_FONT, bold: o.bold ?? false, align: o.align ?? "center", maxWidth: o.maxWidth ?? 0, lineHeight: o.lineHeight ?? 1.25 };
        const t = this.r.text(String(str), style), x = o.x ?? 0, y = o.y ?? 0;
        const [r, g, b, a] = this.paint(o.color, o);
        if (this.texts && a > 0.15 && String(str).trim()) {
            const m = this.m;
            // Line boxes are taller than the letters, so trim them or stacked titles count as overlapping.
            const size = style.size * Math.hypot(m[2], m[3]) * (this.camera?.zoom ?? 1);
            this.texts.push({ text: String(str), size, hidden: false, ...this.box(x, y, t.width, Math.max(style.size * 0.7, t.height - style.size * 0.45)) });
        }
        this.r.quad(this.m, x - t.width / 2, y - t.height / 2, x + t.width / 2, y + t.height / 2, 0, 0, 1, 1, r, g, b, a, t.tex, MODE_TEXTURE, 0, 0, 0, 0);
    }

    /**
     * The fast path for swarms. Returns put(x, y, w, h, rot, frame, r, g, b, a), which skips option parsing and color lookup.
     * Colors are 0 to 1. Keep one sheet per batch, because each texture change is a draw call.
     */
    quads(name: string) {
        const asset = this.game.assets.sprite(name), r = this.r, tex = r.texture(asset), cols = asset.cols, rows = asset.rows, count = cols * rows, m = this.m, q = QUAD, alpha = this.alpha;
        return (x: number, y: number, w: number, h: number, rot = 0, frame = 0, cr = 1, cg = 1, cb = 1, ca = 1) => {
            const f = frame % count, c = f % cols, row = (f - c) / cols, cs = rot ? Math.cos(rot) : 1, sn = rot ? Math.sin(rot) : 0;
            q[0] = m[0] * cs + m[2] * sn; q[1] = m[1] * cs + m[3] * sn;
            q[2] = m[2] * cs - m[0] * sn; q[3] = m[3] * cs - m[1] * sn;
            q[4] = m[0] * x + m[2] * y + m[4]; q[5] = m[1] * x + m[3] * y + m[5];
            r.quad(q, -w / 2, -h / 2, w / 2, h / 2, c / cols, row / rows, (c + 1) / cols, (row + 1) / rows, cr, cg, cb, ca * alpha, tex, MODE_TEXTURE, 0, 0, 0, 0);
        };
    }
    /** Clip everything drawn inside fn to a rectangle in view units, for scrolling lists and panels. */
    clip(x: number, y: number, w: number, h: number, fn: () => void) {
        this.r.clip(x, y, w, h);
        try { fn(); } finally { this.r.clip(null); }
    }

    /** @internal Queue a mesh for the 3D pass. */
    mesh(name: string, world: Float32Array, o: { size: Vec; color: Color; texture?: string | null; unlit?: boolean; castShadow?: boolean; shine?: number }) {
        const geom = this.game.assets.geometry(name), n = geom.natural;
        const fit = (s: number, w: number) => (w > 1e-6 ? s / w : 1);
        const matrix = new Float32Array(16);
        mat4Mul(matrix, world, mat4Compose(scratch, ZERO, ZERO, new Vec(fit(o.size.x, n.x), fit(o.size.y, n.y), fit(o.size.z, n.z))));
        this.r.mesh(item(geom, matrix, o.color, this.alpha, o.texture ? this.game.assets.sprite(o.texture) : null, o.unlit, o.castShadow ?? true, o.shine ?? 0));
    }
    /** @internal */
    billboard(name: string, e: Entity, o: { frame: number; color: Color; unlit: boolean }) {
        const asset = this.game.assets.sprite(name), geom = this.game.assets.geometry("quad"), cam = e.scene.cam3;
        cam.update(this.game._alpha);
        const p = new Vec(e.world[12], e.world[13], e.world[14]);
        const yaw = Math.atan2(cam.eye.x - p.x, cam.eye.z - p.z);
        const matrix = mat4Compose(new Float32Array(16), p, new Vec(0, yaw, 0), new Vec(e.size.x * e.scale.x, e.size.y * e.scale.y, 1));
        const it = item(geom, matrix, o.color, this.alpha, asset, o.unlit, false);
        const frame = o.frame % (asset.cols * asset.rows), col = frame % asset.cols, row = Math.floor(frame / asset.cols);
        it.u0 = col / asset.cols; it.v0 = row / asset.rows; it.u1 = (col + 1) / asset.cols; it.v1 = (row + 1) / asset.rows;
        it.cutout = true;
        this.r.mesh(it);
    }
}

const ZERO = new Vec();
function item(geom: MeshItem["geom"], matrix: Float32Array, c: Color, alpha: number, texture: MeshItem["texture"], unlit = false, castShadow = true, shine = 0): MeshItem {
    return { geom, matrix, r: c.r, g: c.g, b: c.b, a: c.a * alpha, texture, u0: 0, v0: 0, u1: 1, v1: 1, unlit, castShadow, cutout: false, shine };
}
