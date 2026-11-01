// The sky and the weather, shared by every outdoor scene.
import { G, ART, foot, glow, spr, ambient } from "./core.js";
import { moonOf } from "./sim.js";

const fx = () => G.game.fxRng;
export class Sky {
    constructor() {
        const r = fx();
        this.stars = Array.from({ length: 46 }, () => ({ x: r.range(0, 1), y: r.range(0, 1), p: r.range(0, 6.28), big: r.chance(0.2) }));
        this.clouds = Array.from({ length: 4 }, (_, i) => ({ x: r.range(-0.2, 1.1), y: r.range(0.08, 0.6), v: r.range(1.4, 3.2), n: i % 3 }));
        this.time = 0;
    }
    update(dt) { this.time += dt; for (const c of this.clouds) { c.x += (c.v * dt) / 400; if (c.x > 1.25) c.x = -0.25; } }
    /** t is 0 at night, 1 by day. moonAt and sunAt are positions. */
    draw(d, w, top, t, moonFrame, m, sun) {
        const h = top + 16, cw = Math.min(480, Math.ceil(w / 2)), cover = (name, opacity) => { if (opacity > 0.01) d.sprite(name, { crop: [0, 0, cw, 220], x: w / 2, y: h / 2, width: w, height: h, opacity }); };
        cover("sky_night", 1);
        if (t > 0 && t < 1) cover(t < 0.5 ? "sky_dusk" : "sky_dawn", Math.sin(t * 3.14) * 0.95);
        cover("sky_day", Math.max(0, t * 1.5 - 0.5));
        const nightness = 1 - Math.min(1, t * 2);
        if (nightness > 0.01) d.additive(() => {
            for (const s of this.stars) {
                const a = (0.5 + Math.sin(this.time * 1.2 + s.p) * 0.5) * nightness, x = Math.round(s.x * w / 2) * 2, y = Math.round(s.y * top * 0.9 / 2) * 2;
                d.rect(s.big ? 3 : 2, s.big ? 3 : 2, { x, y, color: s.big ? "#fff6c8" : "#c8d8ff", opacity: a * 0.9 });
                if (s.big) { d.rect(2, 8, { x, y, color: "#c8d8ff", opacity: a * 0.35 }); d.rect(8, 2, { x, y, color: "#c8d8ff", opacity: a * 0.35 }); }
            }
        });
        if (m) {
            d.additive(() => { const k = moonFrame === 0 ? 0.25 : 0.32 + Math.sin(this.time * 0.8) * 0.03 + (moonFrame === 4 ? 0.2 : 0); glow(d, m.x, m.y, 150, "#a8c8ff", k * nightness); glow(d, m.x, m.y, 76, "#e8f0ff", k * 1.1 * nightness); });
            spr(d, `moon${moonFrame}`, m.x, m.y, { s: m.s ?? 2, opacity: Math.max(0.2, 1 - t * 0.85) });
        }
        if (sun) { d.additive(() => { glow(d, sun.x, sun.y, 170, "#ffd8a0", 0.6 * t); glow(d, sun.x, sun.y, 70, "#fff0c8", 0.8 * t); }); spr(d, "sun", sun.x, sun.y, { opacity: Math.min(1, t * 1.6) }); }
        const tint = ambient(t), cloudC = [tint[0] * 1.15, tint[1] * 1.1, tint[2] * 1.05];
        for (const c of this.clouds) spr(d, `cloud${c.n}`, c.x * w, c.y * top, { color: cloudC, opacity: 0.35 + t * 0.5 });
    }
}

/** Falling things. Kind: rain, snow, petal, leaf, fly (fireflies), none. */
export class Weather {
    constructor(kind, w, h) {
        this.kind = kind; this.w = w; this.h = h; this.time = 0;
        const r = fx(), n = { rain: 70, snow: 60, petal: 18, leaf: 18, fly: 22, none: 0 }[kind] ?? 0;
        this.p = Array.from({ length: n }, () => ({ x: r.range(0, w), y: r.range(0, h), v: r.range(0.7, 1.3), ph: r.range(0, 6.28) }));
    }
    update(dt) {
        const { w, h, kind } = this;
        this.time += dt;
        for (const p of this.p) {
            if (kind === "rain") { p.y += 340 * p.v * dt; p.x -= 40 * dt; }
            else if (kind === "snow") { p.y += 26 * p.v * dt; p.x += Math.sin(this.time + p.ph) * 12 * dt; }
            else if (kind === "petal" || kind === "leaf") { p.y += 22 * p.v * dt; p.x += (22 + Math.sin(this.time * 1.5 + p.ph) * 26) * dt; }
            else if (kind === "fly") { p.x += Math.sin(this.time * 0.7 + p.ph) * 14 * dt; p.y += Math.cos(this.time * 0.9 + p.ph * 2) * 10 * dt; }
            if (p.y > h) p.y = -8; if (p.x < -8) p.x = w + 6; if (p.x > w + 8) p.x = -6;
        }
    }
    draw(d, t) {
        const { kind } = this, nightly = 1 - t;
        if (kind === "rain") for (const p of this.p) d.line([p.x, p.y], [p.x - 3, p.y + 12], { width: 1.6, color: "#a8c8ff", opacity: 0.45 });
        else if (kind === "snow") for (const p of this.p) d.rect(p.v > 1 ? 4 : 2, p.v > 1 ? 4 : 2, { x: Math.round(p.x / 2) * 2, y: Math.round(p.y / 2) * 2, color: "#f4fbff", opacity: 0.85 });
        else if (kind === "petal") for (const p of this.p) d.rect(4, 2, { x: Math.round(p.x / 2) * 2, y: Math.round(p.y / 2) * 2, color: "#ffd0e4", opacity: 0.75 });
        else if (kind === "leaf") for (const p of this.p) d.rect(4, 4, { x: Math.round(p.x / 2) * 2, y: Math.round(p.y / 2) * 2, color: p.ph > 3 ? "#e88a3a" : "#c84a30", opacity: 0.8 });
        else if (kind === "fly") d.additive(() => { for (const p of this.p) { const a = (0.5 + Math.sin(this.time * 2 + p.ph) * 0.5) * nightly; d.rect(2, 2, { x: Math.round(p.x / 2) * 2, y: Math.round(p.y / 2) * 2, color: "#e0ff90", opacity: a }); glow(d, p.x, p.y, 12, "#c0ff60", a * 0.5); } });
    }
}
export const weatherFor = (season, rain) => rain ? (season === 3 ? "snow" : "rain") : ["petal", "fly", "leaf", "snow"][season];

/** Wick the moth, who follows you about. */
export class Moth {
    constructor(x, y) { this.x = x; this.y = y; this.tx = x; this.ty = y; this.t = 0; this.flip = false; this.lastX = x; }
    update(dt) {
        this.t += dt;
        const k = 1 - Math.pow(0.002, dt);
        this.x += (this.tx + Math.sin(this.t * 2.1) * 12 - this.x) * k; this.y += (this.ty + Math.sin(this.t * 3.3) * 8 - this.y) * k;
    }
    draw(d, nightly = 1) {
        const f = Math.floor(this.t * 12) % 3, frame = [0, 1, 2][f];
        d.additive(() => { glow(d, this.x, this.y, 40, "#ffcf7a", 0.42 * nightly + 0.04); glow(d, this.x, this.y, 13, "#fff0c8", 0.5 * nightly); });
        spr(d, `moth${frame}`, this.x, this.y, { flip: this.x < this.lastX });
        this.lastX = this.x;
    }
}
