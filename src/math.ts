// Vectors, matrices, colors, RNG and easing. One Vec type serves 2D and 3D: z is simply 0 in 2D.
import { PogoError } from "./errors";

export type VecLike = Vec | readonly [number, number, number?] | { x: number; y: number; z?: number };

export class Vec {
    constructor(public x = 0, public y = 0, public z = 0) {}

    /** Mutate in place. Accepts numbers or any VecLike. */
    set(x: number | VecLike, y?: number, z?: number): this {
        if (typeof x === "number") {
            this.x = x;
            this.y = y ?? this.y;
            this.z = z ?? this.z;
        } else {
            const v = toVec(x);
            this.x = v.x;
            this.y = v.y;
            this.z = v.z;
        }
        return this;
    }
    clone() { return new Vec(this.x, this.y, this.z); }
    add(v: VecLike) { const o = toVec(v); return new Vec(this.x + o.x, this.y + o.y, this.z + o.z); }
    sub(v: VecLike) { const o = toVec(v); return new Vec(this.x - o.x, this.y - o.y, this.z - o.z); }
    mul(s: number) { return new Vec(this.x * s, this.y * s, this.z * s); }
    dot(v: VecLike) { const o = toVec(v); return this.x * o.x + this.y * o.y + this.z * o.z; }
    cross(v: VecLike) {
        const o = toVec(v);
        return new Vec(this.y * o.z - this.z * o.y, this.z * o.x - this.x * o.z, this.x * o.y - this.y * o.x);
    }
    lenSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    len() { return Math.sqrt(this.lenSq()); }
    norm() { const l = this.len(); return l > 1e-9 ? this.mul(1 / l) : new Vec(); }
    dist(v: VecLike) { return this.sub(v).len(); }
    lerp(v: VecLike, t: number) {
        const o = toVec(v);
        return new Vec(this.x + (o.x - this.x) * t, this.y + (o.y - this.y) * t, this.z + (o.z - this.z) * t);
    }
    /** 2D rotation around z, radians. */
    rotate(a: number) {
        const c = Math.cos(a), s = Math.sin(a);
        return new Vec(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
    }
    /** 2D angle in radians. */
    angle() { return Math.atan2(this.y, this.x); }
    eq(v: VecLike, eps = 1e-6) { return this.sub(v).len() <= eps; }
    isFinite() { return Number.isFinite(this.x) && Number.isFinite(this.y) && Number.isFinite(this.z); }
    toArray(): [number, number, number] { return [this.x, this.y, this.z]; }
    toString() { return `(${this.x}, ${this.y}, ${this.z})`; }
    static fromAngle(a: number, len = 1) { return new Vec(Math.cos(a) * len, Math.sin(a) * len); }
}

export function toVec(v: VecLike): Vec {
    if (v instanceof Vec) return v;
    if (Array.isArray(v)) return new Vec(v[0], v[1], v[2] ?? 0);
    const o = v as { x: number; y: number; z?: number };
    return new Vec(o.x, o.y, o.z ?? 0);
}

/** vec(1,2), vec(1,2,3), vec([1,2]) or vec(otherVec) — always returns a new Vec. */
export function vec(x: number | VecLike = 0, y?: number, z?: number): Vec {
    if (typeof x === "number") return new Vec(x, y ?? x, z ?? 0);
    return toVec(x).clone();
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const deg = (d: number) => (d * Math.PI) / 180;
/** Frame-rate independent smoothing factor for use with lerp. */
export const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

// --- Mat4 (column-major Float32Array) ---------------------------------------
export type Mat4 = Float32Array;
export const mat4 = (): Mat4 => {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
};

export function mat4Mul(out: Mat4, a: Mat4, b: Mat4): Mat4 {
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
        for (let w = 0; w < 4; w++) {
            r[c * 4 + w] = a[w] * b[c * 4] + a[w + 4] * b[c * 4 + 1] + a[w + 8] * b[c * 4 + 2] + a[w + 12] * b[c * 4 + 3];
        }
    }
    out.set(r);
    return out;
}

/** Compose T * Ry * Rx * Rz * S (yaw, then pitch, then roll). */
export function mat4Compose(out: Mat4, p: Vec, r: Vec, s: Vec): Mat4 {
    const a = Math.cos(r.x), b = Math.sin(r.x), c = Math.cos(r.y), d = Math.sin(r.y), e = Math.cos(r.z), f = Math.sin(r.z);
    const ce = c * e, cf = c * f, de = d * e, df = d * f;
    out[0] = (ce + df * b) * s.x; out[1] = a * f * s.x; out[2] = (cf * b - de) * s.x; out[3] = 0;
    out[4] = (de * b - cf) * s.y; out[5] = a * e * s.y; out[6] = (df + ce * b) * s.y; out[7] = 0;
    out[8] = a * d * s.z; out[9] = -b * s.z; out[10] = a * c * s.z; out[11] = 0;
    out[12] = p.x; out[13] = p.y; out[14] = p.z; out[15] = 1;
    return out;
}

export function mat4Perspective(out: Mat4, fovY: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    out.fill(0);
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
    return out;
}

export function mat4Ortho(out: Mat4, l: number, r: number, b: number, t: number, n: number, f: number): Mat4 {
    out.fill(0);
    out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
    out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = -(f + n) / (f - n); out[15] = 1;
    return out;
}

export function mat4LookAt(out: Mat4, eye: Vec, target: Vec, up: Vec): Mat4 {
    let z = eye.sub(target).norm();
    if (z.lenSq() === 0) z = new Vec(0, 0, 1);
    let x = up.cross(z).norm();
    if (x.lenSq() === 0) x = new Vec(0, 0, 1).cross(z).norm();
    const y = z.cross(x);
    out[0] = x.x; out[1] = y.x; out[2] = z.x; out[3] = 0;
    out[4] = x.y; out[5] = y.y; out[6] = z.y; out[7] = 0;
    out[8] = x.z; out[9] = y.z; out[10] = z.z; out[11] = 0;
    out[12] = -x.dot(eye); out[13] = -y.dot(eye); out[14] = -z.dot(eye); out[15] = 1;
    return out;
}

export function mat4Invert(out: Mat4, m: Mat4): Mat4 | null {
    const a = m, b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4],
        b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6],
        b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12],
        b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    const r = new Float32Array(16);
    r[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
    r[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
    r[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
    r[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    r[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
    r[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
    r[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
    r[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    r[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
    r[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
    r[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
    r[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    r[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det;
    r[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
    r[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det;
    r[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    out.set(r);
    return out;
}

/** Transform a point with perspective divide. */
export function mat4Point(m: Mat4, v: Vec): Vec {
    const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] || 1;
    return new Vec(
        (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / w,
        (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / w,
        (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / w,
    );
}

// --- Color -------------------------------------------------------------------
export type ColorLike = Color | string | readonly [number, number, number, number?];

const NAMED: Record<string, string> = {
    white: "#ffffff", black: "#000000", red: "#ef4444", orange: "#f97316", yellow: "#facc15", green: "#22c55e",
    cyan: "#22d3ee", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899", brown: "#92400e", gray: "#6b7280",
    grey: "#6b7280", sky: "#7dd3fc", transparent: "#00000000",
};

export class Color {
    constructor(public r = 1, public g = 1, public b = 1, public a = 1) {}
    clone() { return new Color(this.r, this.g, this.b, this.a); }
    alpha(a: number) { return new Color(this.r, this.g, this.b, a); }
    lerp(o: ColorLike, t: number) {
        const c = color(o);
        return new Color(lerp(this.r, c.r, t), lerp(this.g, c.g, t), lerp(this.b, c.b, t), lerp(this.a, c.a, t));
    }
    toHex() {
        const h = (n: number) => Math.round(clamp(n, 0, 1) * 255).toString(16).padStart(2, "0");
        return `#${h(this.r)}${h(this.g)}${h(this.b)}${this.a < 1 ? h(this.a) : ""}`;
    }
}

/** Parse "#rgb", "#rrggbb", "#rrggbbaa", a basic color name, or [r,g,b,a?] in 0–1. */
export function color(c: ColorLike): Color {
    if (c instanceof Color) return c;
    if (Array.isArray(c)) return new Color(c[0], c[1], c[2], c[3] ?? 1);
    let s = String(c).trim().toLowerCase();
    s = NAMED[s] ?? s;
    const m = /^#([0-9a-f]{3,8})$/.exec(s);
    if (m && [3, 4, 6, 8].includes(m[1].length)) {
        let h = m[1];
        if (h.length < 6) h = [...h].map((x) => x + x).join("");
        const p = (i: number) => parseInt(h.slice(i, i + 2), 16) / 255;
        return new Color(p(0), p(2), p(4), h.length === 8 ? p(6) : 1);
    }
    throw new PogoError("BAD_COLOR", `Cannot parse color ${JSON.stringify(c)}.`,
        `Use "#rgb", "#rrggbb", [r,g,b] in 0–1, or one of: ${Object.keys(NAMED).join(", ")}.`);
}

// --- Seeded RNG ---------------------------------------------------------------
export class Rng {
    private s: number;
    constructor(seed = 1) { this.s = seed >>> 0; }
    /** Float in [0, 1). */
    next() {
        this.s = (this.s + 0x6d2b79f5) >>> 0;
        let t = this.s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    /** Float in [a, b). range(b) means [0, b). */
    range(a: number, b?: number) { return b === undefined ? this.next() * a : a + this.next() * (b - a); }
    /** Integer in [a, b], inclusive. */
    int(a: number, b: number) { return Math.floor(a + this.next() * (b - a + 1)); }
    chance(p: number) { return this.next() < p; }
    pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
    shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}

// --- Easing --------------------------------------------------------------------
export const easings = {
    linear: (t: number) => t,
    inQuad: (t: number) => t * t,
    outQuad: (t: number) => t * (2 - t),
    inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    outCubic: (t: number) => 1 - (1 - t) ** 3,
    outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
    outBounce: (t: number) => {
        const n = 7.5625, d = 2.75;
        if (t < 1 / d) return n * t * t;
        if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
        if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
        return n * (t -= 2.625 / d) * t + 0.984375;
    },
};
export type Easing = keyof typeof easings;
