// Assets. Text-defined pixel art and voxel models mean a game needs no binary files at all.
import { PogoError, suggest } from "./errors";
import { color, Color, ColorLike } from "./math";
import { customGeometry, Geometry, primitives, voxelGeometry } from "./render/mesh";
import type { Game } from "./game";

export interface SpriteAsset {
    name: string;
    width: number; height: number;
    cols: number; rows: number;
    frameW: number; frameH: number;
    data?: Uint8Array;
    image?: HTMLImageElement;
    loaded: boolean;
    pixelated: boolean;
    /** Keep large art clean when drawn small. On by default for single-frame smooth paint. */
    mipmaps?: boolean;
}

/** Default palette for pixel art and voxels. `.` and space are always empty. */
export const PALETTE: Record<string, string> = {
    k: "#1f2430", w: "#f8fafc", s: "#94a3b8", d: "#475569", r: "#ef4444", m: "#991b1b", o: "#f97316", y: "#facc15",
    g: "#22c55e", e: "#166534", c: "#22d3ee", b: "#3b82f6", n: "#1e3a8a", p: "#a855f7", i: "#ec4899", t: "#fcd9b6", h: "#92400e", u: "#7c4a21",
};

/** A software canvas for painted sprites. It needs no DOM, so painted art also exists in headless runs. */
export class Pixmap {
    readonly data: Uint8Array;
    private x0 = 0;
    constructor(readonly width: number, readonly height: number, private atlas: Uint8Array, private stride: number, frameOffset: number) {
        this.data = atlas;
        this.x0 = frameOffset;
    }
    private index(x: number, y: number) { return (y * this.stride + this.x0 + x) * 4; }
    /** Blend one pixel over what's there. coverage is 0–1. */
    set(x: number, y: number, c: ColorLike, coverage = 1) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return this;
        const col = color(c), a = col.a * coverage, o = this.index(x, y), d = this.data, da = d[o + 3] / 255, out = a + da * (1 - a);
        if (out <= 0) return this;
        d[o] = (col.r * 255 * a + d[o] * da * (1 - a)) / out;
        d[o + 1] = (col.g * 255 * a + d[o + 1] * da * (1 - a)) / out;
        d[o + 2] = (col.b * 255 * a + d[o + 2] * da * (1 - a)) / out;
        d[o + 3] = out * 255;
        return this;
    }
    get(x: number, y: number) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) return [0, 0, 0, 0];
        const o = this.index(x, y);
        return [this.data[o], this.data[o + 1], this.data[o + 2], this.data[o + 3]];
    }
    rect(x: number, y: number, w: number, h: number, c: ColorLike) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
        return this;
    }
    /** Vertical gradient, top to bottom. */
    gradient(x: number, y: number, w: number, h: number, top: ColorLike, bottom: ColorLike) {
        const a = color(top);
        for (let j = 0; j < h; j++) { const c = a.lerp(bottom, h > 1 ? j / (h - 1) : 0); for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
        return this;
    }
    /** Filled, anti-aliased ellipse. An optional bottom color gives it a gradient. */
    ellipse(cx: number, cy: number, rx: number, ry: number, c: ColorLike, bottom?: ColorLike) {
        const col = color(c);
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.hypot(dx, dy);
            const cover = Math.max(0, Math.min(1, (1 - d) * Math.min(rx, ry) + 0.5));
            if (cover > 0) this.set(x, y, bottom ? col.lerp(bottom, Math.max(0, Math.min(1, dy * 0.5 + 0.5))) : col, cover);
        }
        return this;
    }
    circle(cx: number, cy: number, r: number, c: ColorLike, bottom?: ColorLike) { return this.ellipse(cx, cy, r, r, c, bottom); }
    /** Anti-aliased line with round ends. */
    line(x0: number, y0: number, x1: number, y1: number, c: ColorLike, width = 1) {
        const r = width / 2, dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy || 1;
        for (let y = Math.floor(Math.min(y0, y1) - r - 1); y <= Math.max(y0, y1) + r + 1; y++) for (let x = Math.floor(Math.min(x0, x1) - r - 1); x <= Math.max(x0, x1) + r + 1; x++) {
            const t = Math.max(0, Math.min(1, ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / len2));
            const d = Math.hypot(x + 0.5 - (x0 + t * dx), y + 0.5 - (y0 + t * dy)), cover = Math.max(0, Math.min(1, r - d + 0.5));
            if (cover > 0) this.set(x, y, c, cover);
        }
        return this;
    }
    /** Filled polygon from [x, y] points. */
    poly(points: [number, number][], c: ColorLike) {
        const ys = points.map((p) => p[1]);
        for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) {
            const hits: number[] = [];
            points.forEach((p, i) => {
                const q = points[(i + 1) % points.length], yy = y + 0.5;
                if ((p[1] <= yy && q[1] > yy) || (q[1] <= yy && p[1] > yy)) hits.push(p[0] + ((yy - p[1]) / (q[1] - p[1])) * (q[0] - p[0]));
            });
            hits.sort((a, b) => a - b);
            for (let i = 0; i + 1 < hits.length; i += 2) for (let x = Math.round(hits[i]); x < Math.round(hits[i + 1]); x++) this.set(x, y, c);
        }
        return this;
    }
    /** Copy the left half onto the right: paint half a character, get a symmetric one. */
    mirror() {
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width >> 1; x++) {
            const a = this.index(x, y), b = this.index(this.width - 1 - x, y);
            for (let i = 0; i < 4; i++) this.data[b + i] = this.data[a + i];
        }
        return this;
    }
    private edit(fn: (x: number, y: number, solid: (x: number, y: number) => boolean) => void) {
        const snapshot = this.data.slice(), solid = (x: number, y: number) => x >= 0 && y >= 0 && x < this.width && y < this.height && snapshot[this.index(x, y) + 3] > 40;
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) fn(x, y, solid);
    }
    /** A 1px outline around everything painted so far. The biggest single upgrade to sprite readability. */
    outline(c: ColorLike = "#1f2430") {
        const col = color(c), before = this.data.slice(), alpha = (x: number, y: number) => (x < 0 || y < 0 || x >= this.width || y >= this.height ? 0 : before[this.index(x, y) + 3] / 255);
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
            // Composited behind each pixel by neighbour coverage, so anti-aliased edges stay smooth.
            const a0 = alpha(x, y), cover = Math.max(alpha(x - 1, y), alpha(x + 1, y), alpha(x, y - 1), alpha(x, y + 1)) * col.a;
            if (a0 >= 1 || cover <= 0) continue;
            const o = this.index(x, y), out = a0 + cover * (1 - a0), d = this.data, under = cover * (1 - a0);
            d[o] = (d[o] * a0 + col.r * 255 * under) / out;
            d[o + 1] = (d[o + 1] * a0 + col.g * 255 * under) / out;
            d[o + 2] = (d[o + 2] * a0 + col.b * 255 * under) / out;
            d[o + 3] = out * 255;
        }
        return this;
    }
    /** Rim light from the top-left and shadow on the bottom-right, for instant volume. */
    shade(light = 0.3, dark = 0.3) {
        this.edit((x, y, solid) => {
            if (!solid(x, y)) return;
            if (!solid(x - 1, y) || !solid(x, y - 1)) this.set(x, y, [1, 1, 1, light]);
            else if (!solid(x + 1, y) || !solid(x, y + 1)) this.set(x, y, [0, 0, 0, dark]);
        });
        return this;
    }
    /** Speckle painted pixels for texture, deterministically. */
    speckle(amount = 0.08, seed = 1) {
        let s = seed >>> 0;
        const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
        this.edit((x, y, solid) => { if (solid(x, y)) { const n = next(); this.set(x, y, n > 0.5 ? [1, 1, 1, amount] : [0, 0, 0, amount]); } });
        return this;
    }
}

export type Palette = Record<string, ColorLike>;
/** Rows of characters; either an array of strings or one multi-line string. */
export type PixelRows = string | string[];

function rows(input: PixelRows): string[] {
    return (typeof input === "string" ? input.split("\n") : input).map((r) => r.trim()).filter((r) => r.length);
}

export class Assets {
    private sprites = new Map<string, SpriteAsset>();
    private geoms = new Map<string, Geometry>(Object.entries(primitives()));
    private pending: Promise<unknown>[] = [];

    constructor(private game: Game) {}

    /** Promise for everything queued so far. game.start() waits for it. */
    ready() { return Promise.all(this.pending); }

    private lookup(palette: Palette | undefined, ch: string, where: string): Color | null {
        if (ch === "." || ch === " ") return null;
        const value = palette?.[ch] ?? PALETTE[ch];
        if (value === undefined) throw new PogoError("BAD_PALETTE", `${where} uses "${ch}", which is not in the palette.`, `Add it to the palette argument, or use a default: ${Object.keys(PALETTE).join("")}.`);
        return color(value);
    }

    /**
     * Define a sprite from text. Pass one block of rows, or an array of blocks for animation frames.
     * assets.pixels("hero", `
     *   .rr.
     *   rkkr
     * `);
     */
    pixels(name: string, frames: PixelRows | PixelRows[], palette?: Palette) {
        const list: string[][] = typeof frames === "string" || typeof frames[0] === "string" && !isFrameList(frames) ? [rows(frames as PixelRows)] : (frames as PixelRows[]).map(rows);
        const h = list[0].length, w = list[0][0]?.length ?? 0;
        if (!h || !w) throw new PogoError("BAD_PIXELS", `Sprite "${name}" is empty.`);
        const data = new Uint8Array(w * list.length * h * 4);
        list.forEach((frame, f) => {
            if (frame.length !== h) throw new PogoError("BAD_PIXELS", `Sprite "${name}" frame ${f} has ${frame.length} rows, expected ${h}.`, "All frames must be the same size.");
            frame.forEach((row, y) => {
                if (row.length !== w) throw new PogoError("BAD_PIXELS", `Sprite "${name}" frame ${f} row ${y} is ${row.length} wide, expected ${w}: "${row}"`, "All rows must be the same width.");
                for (let x = 0; x < w; x++) {
                    const c = this.lookup(palette, row[x], `Sprite "${name}"`);
                    if (!c) continue;
                    const o = (y * w * list.length + f * w + x) * 4;
                    data[o] = c.r * 255; data[o + 1] = c.g * 255; data[o + 2] = c.b * 255; data[o + 3] = c.a * 255;
                }
            });
        });
        this.sprites.set(name, { name, width: w * list.length, height: h, cols: list.length, rows: 1, frameW: w, frameH: h, data, loaded: true, pixelated: true });
        return this;
    }

    /**
     * Paint a sprite with code. The callback gets a Pixmap, and the frame index for animation.
     * Set smooth to get filtered, anti-aliased art; paint at 2–4x display size for crisp edges on phones.
     * assets.paint("orb", 64, 64, (p) => p.circle(32, 32, 28, "#7dd3fc", "#1d4ed8").outline().shade(), { smooth: true });
     */
    paint(name: string, width: number, height: number, fn: (p: Pixmap, frame: number) => void, o: { frames?: number; smooth?: boolean; mipmaps?: boolean } = {}) {
        const frames = o.frames ?? 1, data = new Uint8Array(width * frames * height * 4);
        for (let f = 0; f < frames; f++) fn(new Pixmap(width, height, data, width * frames, f * width), f);
        this.sprites.set(name, { name, width: width * frames, height, cols: frames, rows: 1, frameW: width, frameH: height, data, loaded: true, pixelated: !o.smooth, mipmaps: o.mipmaps ?? (!!o.smooth && frames === 1) });
        return this;
    }

    /** Load an image file. Pass { cols, rows } for a sprite sheet. */
    image(name: string, url: string, o: { cols?: number; rows?: number; width?: number; height?: number } = {}) {
        const cols = o.cols ?? 1, rowCount = o.rows ?? 1;
        const a: SpriteAsset = { name, width: o.width ?? 32 * cols, height: o.height ?? 32 * rowCount, cols, rows: rowCount, frameW: 0, frameH: 0, loaded: false, pixelated: false };
        a.frameW = a.width / cols;
        a.frameH = a.height / rowCount;
        this.sprites.set(name, a);
        if (this.game.headless) { a.data = new Uint8Array(a.width * a.height * 4); a.loaded = true; return this; }
        this.pending.push(new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                a.image = img; a.width = img.naturalWidth; a.height = img.naturalHeight;
                a.frameW = a.width / cols; a.frameH = a.height / rowCount; a.loaded = true;
                resolve();
            };
            img.onerror = () => reject(new PogoError("ASSET_LOAD", `Image "${name}" failed to load from ${url}.`, "Check the path relative to the HTML page. For art without files, use assets.pixels()."));
            img.src = url;
        }));
        return this;
    }

    /** Load a sound file for game.sfx(name). */
    sound(name: string, url: string) {
        if (!this.game.headless) this.pending.push(this.game.audio.load(name, url));
        else this.game.audio.register(name);
        return this;
    }

    /**
     * Define a 3D model from text. Layers go bottom to top; rows go back to front; characters go left to right.
     * `unit` is the size of one voxel in world units (default 0.1).
     */
    voxels(name: string, layers: PixelRows[], palette?: Palette, o: { unit?: number } = {}) {
        const parsed = layers.map(rows);
        const nz = parsed[0]?.length ?? 0, nx = parsed[0]?.[0]?.length ?? 0;
        if (!nz || !nx) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" is empty.`);
        const grid = parsed.map((layer, y) => {
            if (layer.length !== nz) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" layer ${y} has ${layer.length} rows, expected ${nz}.`);
            return layer.map((row, z) => {
                if (row.length !== nx) throw new PogoError("BAD_VOXELS", `Voxel model "${name}" layer ${y} row ${z} is ${row.length} wide, expected ${nx}.`);
                return [...row].map((ch) => this.lookup(palette, ch, `Voxel model "${name}"`));
            });
        });
        this.geoms.set(name, voxelGeometry(grid, o.unit ?? 0.1));
        return this;
    }

    /** Register a custom mesh from raw arrays. */
    mesh(name: string, data: Parameters<typeof customGeometry>[0]) {
        this.geoms.set(name, customGeometry(data));
        return this;
    }

    sprite(name: string): SpriteAsset {
        const a = this.sprites.get(name);
        if (!a) throw new PogoError("UNKNOWN_SPRITE", `No sprite named "${name}".`, `${suggest(name, this.sprites.keys())} Define sprites with game.assets.pixels() or .image() before game.start().`);
        return a;
    }

    geometry(name: string): Geometry {
        const g = this.geoms.get(name);
        if (!g) throw new PogoError("UNKNOWN_MESH", `No mesh named "${name}".`, `${suggest(name, this.geoms.keys())} Define models with game.assets.voxels().`);
        return g;
    }
}

/** ["..", ".."] is one frame; [["..", ".."], ["..", ".."]] or [`..`, `..`] with newlines is several. */
function isFrameList(frames: unknown) {
    return Array.isArray(frames) && typeof frames[0] === "string" && (frames[0] as string).includes("\n");
}
