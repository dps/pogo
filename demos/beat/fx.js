// Cosmetic particles from the props sheet: stars, teeth, sweat, confetti. Uses fxRng so gameplay replays stay identical.
import { P } from "./art/props.js";

export class FX {
    constructor(game, max = 160) { this.game = game; this.max = max; this.list = []; }
    add(frame, x, y, o = {}) {
        if (this.list.length >= this.max) this.list.shift();
        this.list.push({ frame, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, life: o.life ?? 0.6, age: 0, size: o.size ?? 16, grow: o.grow ?? 0, rot: o.rot ?? 0, spin: o.spin ?? 0, grav: o.grav ?? 0, color: o.color, add: !!o.add, drag: o.drag ?? 0 });
    }
    spray(frame, x, y, n, o = {}) {
        const r = this.game.fxRng, speed = o.speed ?? [80, 240], cone = o.cone ?? Math.PI * 2, base = o.angle ?? -Math.PI / 2;
        for (let i = 0; i < n; i++) {
            const a = base + (r.next() - 0.5) * cone, v = speed[0] + r.next() * (speed[1] - speed[0]);
            const color = Array.isArray(o.color) ? o.color[Math.floor(r.next() * o.color.length)] : o.color;
            this.add(frame, x, y, { ...o, color, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: r.next() * 6.28, spin: (r.next() - 0.5) * 14, life: (o.life ?? 0.6) * (0.7 + r.next() * 0.6), size: (o.size ?? 14) * (0.7 + r.next() * 0.6) });
        }
    }
    update(dt) {
        const l = this.list;
        for (let i = l.length - 1; i >= 0; i--) {
            const p = l[i];
            p.age += dt;
            if (p.age >= p.life) { l.splice(i, 1); continue; }
            p.vy += p.grav * dt;
            if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
            p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
        }
    }
    draw(d) {
        const one = (p) => {
            const k = p.age / p.life, s = p.size + p.grow * k;
            d.sprite("props", { frame: p.frame, x: p.x, y: p.y, width: s, height: s, rot: p.rot || 0.0001, color: p.color, opacity: k > 0.65 ? (1 - k) / 0.35 : 1 });
        };
        for (const p of this.list) if (!p.add) one(p);
        if (this.list.some((p) => p.add)) d.additive(() => { for (const p of this.list) if (p.add) one(p); });
    }
}
export const CONFETTI = ["#ff5a4f", "#ffc93c", "#7dffb0", "#6ae8ff", "#ff7ae0", "#fff7d6"];
export { P };
