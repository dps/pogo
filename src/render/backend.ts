// The renderer contract, plus the no-op renderer that powers headless runs.
import type { Color, Mat4 } from "../math";
import { Vec } from "../math";
import type { ViewState } from "../view";
import type { Geometry } from "./mesh";
import type { SpriteAsset } from "../assets";

export interface TextStyle { size: number; font: string; bold: boolean; align: "left" | "center" | "right"; maxWidth: number; lineHeight: number; }
export interface TextLayout { width: number; height: number; lines: string[]; }
export interface TextHandle { tex: unknown; width: number; height: number; }

export interface MeshItem {
    geom: Geometry;
    matrix: Float32Array;
    r: number; g: number; b: number; a: number;
    texture: SpriteAsset | null;
    u0: number; v0: number; u1: number; v1: number;
    unlit: boolean;
    castShadow: boolean;
    cutout: boolean;
    shine: number;
}

export interface Light3D {
    /** Direction the light travels, e.g. [-0.5, -1, -0.3]. */
    dir: Vec;
    color: Color;
    sky: Color;
    ground: Color;
    shadows: boolean;
    /** Wider, smoother shadow edges for close-up scenes. Costs more per pixel. */
    softShadows: boolean;
    /** World radius around the camera target that receives shadows. */
    shadowRange: number;
    fog: { color: Color; near: number; far: number } | null;
}

export interface CameraInfo { viewProj: Mat4; eye: Vec; look: Vec; }

export interface Renderer {
    readonly kind: "gl" | "null";
    /** Pixels-per-unit used to rasterise text. */
    beginFrame(view: ViewState, bg: Color, bg2: Color | null, letterbox: Color): void;
    mesh(item: MeshItem): void;
    render3D(cam: CameraInfo, light: Light3D): void;
    begin2D(camera: Float32Array | null): void;
    quad(m: Float32Array, x0: number, y0: number, x1: number, y1: number, u0: number, v0: number, u1: number, v1: number, r: number, g: number, b: number, a: number, tex: unknown, mode: number, p0: number, p1: number, p2: number, p3: number): void;
    tris(m: Float32Array, pts: number[], r: number, g: number, b: number, a: number): void;
    blend(additive: boolean): void;
    /** Clip to a rectangle in view units, or stop clipping with null. */
    clip(x: number | null, y?: number, w?: number, h?: number): void;
    endFrame(): void;
    texture(asset: SpriteAsset): unknown;
    /** Upload an asset's pixels again. */
    refresh(asset: SpriteAsset): void;
    /** Release GPU memory. */
    freeGeometry(g: Geometry): void;
    freeTexture(asset: SpriteAsset): void;
    text(str: string, style: TextStyle): TextHandle;
    measureText(str: string, style: TextStyle): TextLayout;
    screenshot(): string | null;
    stats: { drawCalls: number; instances: number; quads: number };
}

export const MODE_TEXTURE = 0, MODE_SDF = 1, MODE_SOLID = 2;

/** Shared word wrap, driven by a platform-specific line measurer. */
export function layoutText(str: string, style: TextStyle, measure: (line: string) => number): TextLayout {
    const lines: string[] = [];
    for (const para of str.split("\n")) {
        if (!style.maxWidth) { lines.push(para); continue; }
        let line = "";
        for (const word of para.split(" ")) {
            const next = line ? `${line} ${word}` : word;
            if (line && measure(next) > style.maxWidth) { lines.push(line); line = word; }
            else line = next;
        }
        lines.push(line);
    }
    return { width: Math.max(0, ...lines.map(measure)), height: lines.length * style.size * style.lineHeight, lines };
}

/** Headless text width is an estimate; `pogo check` treats it as such. */
export const estimateLine = (style: TextStyle) => (line: string) => line.length * style.size * (style.bold ? 0.6 : 0.55);

export class NullRenderer implements Renderer {
    readonly kind = "null" as const;
    stats = { drawCalls: 0, instances: 0, quads: 0 };
    beginFrame() { this.stats = { drawCalls: 0, instances: 0, quads: 0 }; }
    mesh() { this.stats.instances++; }
    render3D() {}
    begin2D() {}
    quad() { this.stats.quads++; }
    tris() {}
    blend() {}
    clip() {}
    endFrame() {}
    texture() { return null; }
    refresh() {}
    freeGeometry() {}
    freeTexture() {}
    measureText(str: string, style: TextStyle) { return layoutText(str, style, estimateLine(style)); }
    text(str: string, style: TextStyle): TextHandle { const m = this.measureText(str, style); return { tex: null, width: m.width, height: m.height }; }
    screenshot() { return null; }
}
