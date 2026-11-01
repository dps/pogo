// The six creatures, drawn live from painted glass, so each can open, swim, spin, shatter or gutter as its story needs.
import { AMBER, ACOLS, AROWS, GLOW, GOLD, JADE, PEARL, RING, ROSE, AQUA, ENEMY } from "./art.js";

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const towards = (a, b, k) => a + (b - a) * k;
const halo = (d, x, y, s, hue, o) => d.additive(() => d.sprite("atlas", { x, y, width: s, height: s, crop: [GLOW * 64, hue * 64, 64, 64], opacity: o }));

export function makeBoss(p, def) {
    const b = {
        def, x: def.home[0], y: def.home[1], home: def.home, hp: 1, hpMax: 1, flash: 0, tw: null, t: 0,
        // Story state; every creature reads only its own.
        open: 0.1, openV: 0.1, wilt: 0, wiltV: 0, swim: 0.4, kick: 0, brood: 0, broodV: 0, legs: 1, spin: 0.1, rot: 0, clock: 0, clockA: 0, cracked: 0, tail: 1, orbit: 0, orbitA: 0, split: 0, splitV: 0, heat: 0.2, heatV: 0.2, gutter: 0, gutterV: 0,
        r: def.id === "rose" ? 62 : 46, sat: [], frag: [], dying: 0,
    };
    for (let i = 0; i < 4; i++) { const k = i; b.sat.push({ get x() { return b.x + Math.cos(b.t * 0.7 + k * TAU / 4) * 110 * b.broodV; }, get y() { return b.y + 46 + Math.sin(b.t * 0.7 + k * TAU / 4) * 56 * b.broodV; } }); }
    for (let i = 0; i < 3; i++) { const k = i; b.frag.push({ r: 30, get x() { return b.x + Math.cos(b.t * 0.5 + k * TAU / 3) * 118 * b.splitV; }, get y() { return b.y + 34 + Math.sin(b.t * 0.5 + k * TAU / 3) * 44 * b.splitV; } }); }
    b.all = [b];
    b.parts = () => (b.splitV > 0.5 ? b.frag : b.all);
    return b;
}

export function bossStep(p, b, dt, beat) {
    b.t += dt;
    if (b.flash > 0) b.flash -= dt * 7;
    b.openV = towards(b.openV, b.open, clamp(dt * 1.3)); b.wiltV = towards(b.wiltV, b.wilt, clamp(dt * 0.7)); b.broodV = towards(b.broodV, b.brood, clamp(dt * 1.4)); b.splitV = towards(b.splitV, b.split, clamp(dt * 1.8)); b.heatV = towards(b.heatV, b.heat, clamp(dt * 1.2)); b.gutterV = towards(b.gutterV, b.gutter, clamp(dt * 0.4));
    b.kick *= Math.pow(0.03, dt); b.rot += b.spin * dt;
    if (b.tw) {
        const t = b.tw, u = clamp((beat - t.t0) / (t.t1 - t.t0)), e = u * u * (3 - 2 * u);
        b.x = t.x0 + (t.x1 - t.x0) * e; b.y = t.y0 + (t.y1 - t.y0) * e;
        if (u >= 1) b.tw = null;
    } else if (b.orbit) {
        b.orbitA += dt * 1.1; const tx = 180 + Math.cos(b.orbitA) * 118, ty = 230 + Math.sin(b.orbitA) * 120; b.x = towards(b.x, tx, clamp(dt * 3)); b.y = towards(b.y, ty, clamp(dt * 3));
    } else if (!b.def.id.startsWith("comet") || b.home[1] !== 120 || p.phaseI !== 0) {
        const tx = b.home[0] + Math.sin(b.t * 0.6) * 16, ty = b.home[1] + Math.sin(b.t * 0.9) * 7; b.x = towards(b.x, tx, clamp(dt * 1.5)); b.y = towards(b.y, ty, clamp(dt * 1.5));
    }
    if (b.def.id === "comet" && p.step_ % 2 === 0) { for (let i = 0; i < (b.splitV > 0.5 ? 3 : 1); i++) { const q = b.splitV > 0.5 ? b.frag[i] : b; p.fx.add(q.x + p.fx.rng.range(-14, 14), q.y + p.fx.rng.range(-10, 10), { vy: -p.fx.rng.range(10, 40), vx: p.fx.rng.range(-20, 20), life: 1, s0: 34, s1: 0, a: 0.34, hue: p.step_ % 4 ? AQUA : 4 }); } }
    if (b.def.id === "flame" && p.step_ % 3 === 0) p.fx.add(b.x + p.fx.rng.range(-16, 16), b.y - 30, { vy: -p.fx.rng.range(30, 90), vx: p.fx.rng.range(-18, 18), life: 1.1, s0: 10, s1: 0, a: 0.6, hue: AMBER });
}

const DRAW = {
    bloom(d, b, p) {
        const open = b.openV, pulse = p.beatPulse, t = b.t;
        halo(d, b.x, b.y, 260 + open * 120 + pulse * 30, ROSE, 0.42 + pulse * 0.2);
        d.push(); d.translate(b.x, b.y);
        for (let ring = 0; ring < 2; ring++) {
            const n = 8, len = (ring ? 66 : 92) * (0.5 + 0.62 * open), wid = (ring ? 38 : 50) * (0.5 + 0.56 * open);
            for (let i = 0; i < n; i++) {
                const a = i / n * TAU + (ring ? Math.PI / 8 : 0) + t * 0.05 * (ring ? -1 : 1), droop = b.wiltV * 0.75 * Math.sin(a) * (a % TAU > Math.PI ? 1 : -1);
                d.push(); d.rotate(a + droop + (1 - open) * 0.32 * Math.sin(t + i));
                const fold = open < 0.4 ? 0.55 : 1;
                d.sprite("petal", { x: 0, y: -len * 0.5 - 7 * fold, width: wid * fold, height: len, opacity: 1 - b.wiltV * 0.15 });
                d.pop();
            }
        }
        d.sprite("bloomcore", { width: 34 + pulse * 6 + open * 14, height: 34 + pulse * 6 + open * 14, rot: t * 0.5 });
        d.pop();
        if (b.flash > 0) halo(d, b.x, b.y, 140, 8, b.flash * 0.5);
    },
    tide(d, b, p) {
        const pulse = p.beatPulse, s = 1 + 0.16 * b.kick + 0.05 * Math.sin(b.t * 2.1 * (1 + b.swim));
        halo(d, b.x, b.y, 320, 3, 0.4 + pulse * 0.16);
        d.additive(() => {
            for (let k = 0; k < 7; k++) {
                const x0 = b.x - 66 + k * 22;
                for (let i = 0; i < 16; i++) {
                    const u = i / 15, x = x0 + Math.sin(b.t * 2 + k + i * 0.4) * (4 + 15 * u) + (x0 - b.x) * u * 0.25, y = b.y + 36 + u * (120 - 24 * b.kick);
                    d.sprite("atlas", { x, y, width: 13 - u * 6, height: 13 - u * 6, crop: [GLOW * 64, (k % 2 ? 5 : 3) * 64, 64, 64], opacity: (1 - u) * 0.9 + 0.1 });
                }
            }
        });
        d.sprite("bell", { x: b.x, y: b.y, width: 164 / s, height: 124 * s });
        for (const q of b.sat) if (b.broodV > 0.03) { halo(d, q.x, q.y, 60, 3, b.broodV * 0.5); d.sprite("enemies", { x: q.x, y: q.y, crop: [ENEMY.jelly * 96, 0, 96, 96], width: 34 * b.broodV, height: 34 * b.broodV }); }
        if (b.flash > 0) d.additive(() => d.sprite("bell", { x: b.x, y: b.y, width: 164 / s, height: 124 * s, opacity: b.flash * 0.5 }));
    },
    weaver(d, b, p) {
        d.line([b.x, -10], [b.x, b.y - 40], { width: 1.4, color: "#bffff0aa" });
        halo(d, b.x, b.y, 250, JADE, 0.3 + p.beatPulse * 0.14);
        for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
            const a = -1.0 + i * 0.62, wave = Math.sin(b.t * 3 * b.legs + i + (s > 0 ? 0 : 1.6)) * 0.12, kx = b.x + s * Math.cos(a + wave) * 58, ky = b.y + Math.sin(a + wave) * 56 - 16, fx = b.x + s * Math.cos(a * 1.3 + wave * 2) * 112, fy = b.y + Math.sin(a * 1.3) * 88 + 22;
            d.line([b.x + s * 14, b.y - 8 + i * 6], [kx, ky], { width: 4.5, color: "#0e3a30" }); d.line([kx, ky], [fx, fy], { width: 3, color: "#0e3a30" });
            d.line([b.x + s * 14, b.y - 8 + i * 6], [kx, ky], { width: 1.6, color: "#6fffc0" }); d.line([kx, ky], [fx, fy], { width: 1.1, color: "#6fffc0" });
        }
        d.sprite("weaver", { x: b.x, y: b.y, width: 86, height: 112 });
        if (b.flash > 0) d.additive(() => d.sprite("weaver", { x: b.x, y: b.y, width: 86, height: 112, opacity: b.flash * 0.55 }));
    },
    rose(d, b, p) {
        const pulse = p.beatPulse, s = 172 + pulse * 7;
        halo(d, b.x, b.y, 460, 0, 0.26 + pulse * 0.14); halo(d, b.x, b.y, 340, 4, 0.38 + pulse * 0.14);
        d.sprite("rose", { x: b.x, y: b.y, width: s, height: s, rot: b.rot });
        d.sprite("roseinner", { x: b.x, y: b.y, width: s * 0.5, height: s * 0.5, rot: -b.rot * 1.7 });
        d.additive(() => { d.sprite("rose", { x: b.x, y: b.y, width: s, height: s, rot: b.rot, opacity: 0.22 + pulse * 0.28 + b.flash * 0.3 }); });
        if (b.clock) { d.line([b.x, b.y], [b.x + Math.cos(b.clockA) * 70, b.y + Math.sin(b.clockA) * 70], { width: 3.4, color: "#ffe9a8" }); d.circle(5, { x: b.x, y: b.y, color: "#ffe9a8" }); }
        if (b.cracked) for (let i = 0; i < 7; i++) { const a = i * 2.4 + 0.3, a2 = a + 0.5; d.line([b.x + Math.cos(a) * 20, b.y + Math.sin(a) * 20], [b.x + Math.cos(a2) * 86, b.y + Math.sin(a2) * 86], { width: 1.6, color: "#fff4d8" }); }
    },
    comet(d, b, p) {
        const parts = b.splitV > 0.04 ? b.frag : [b], sz = b.splitV > 0.04 ? 64 : 104;
        for (const q of parts) {
            halo(d, q.x, q.y, sz * 2.8, 3, 0.5 + p.beatPulse * 0.2);
            d.sprite("comet", { x: q.x, y: q.y, width: sz, height: sz, rot: b.t * 0.7 });
            if (b.flash > 0) d.additive(() => d.sprite("comet", { x: q.x, y: q.y, width: sz, height: sz, rot: b.t * 0.7, opacity: b.flash * 0.55 }));
        }
    },
    flame(d, b, p) {
        const H = p.H, heat = b.heatV * (1 - b.gutterV * 0.7), fl = 1 + 0.05 * Math.sin(b.t * 13) + 0.04 * Math.sin(b.t * 7.3) + p.beatPulse * 0.08, w = (62 + 88 * heat) * fl, h = (118 + 170 * heat) * (2 - fl);
        d.sprite("candle", { x: b.x, y: b.y + 70 + 190, width: 96, height: 380, opacity: 0.75 });
        d.rect(3, 26, { x: b.x, y: b.y + 58, color: "#20100c" });
        halo(d, b.x, b.y, 500 * (0.5 + heat), AMBER, 0.5 + p.beatPulse * 0.14);
        d.additive(() => {
            d.sprite("flame", { x: b.x, y: b.y, width: w * 1.7, height: h * 1.34, opacity: 0.55 });
            d.sprite("flame", { x: b.x, y: b.y + 8, width: w, height: h, opacity: 1 });
            d.sprite("flame", { x: b.x, y: b.y + 26, width: w * 0.5, height: h * 0.62, opacity: 1 + b.flash * 0.5 });
        });
    },
};

export function drawBoss(d, r, b, p) {
    if (b.dying) { const q = clamp(p.clearT / 3.2); d.push(); d.translate(b.x + Math.sin(b.t * 40) * (1 - q) * 5, 0); d.translate(-b.x, 0); DRAW[b.def.id](d, b, p); d.pop(); halo(d, b.x, b.y, 200 + (1 - q) * 600, GOLD, 1 - q); return; }
    DRAW[b.def.id](d, b, p);
}
