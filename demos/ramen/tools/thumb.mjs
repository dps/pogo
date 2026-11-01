// One thumb, real pointer events, the real scene. Nothing here touches the sim directly: if a gesture can't do it, neither can this.
import { RECIPES, TOPPINGS } from "../data.js";
import { TUNE } from "../sim.js";

export class Thumb {
    constructor(game, o = {}) {
        this.g = game; this.q = []; this.think = o.think ?? 8; this.wait = 0; this.gest = 0; this.far = 0; this.points = 0; this.hand = o.hand ?? "right"; this.id = 77; this.pts = [];
        this.jit = o.jitter ?? 2; this.r = o.seed ?? 1; this.slow = o.slow ?? 1;
    }
    rnd() { this.r = Math.imul(this.r, 1664525) + 1013904223 >>> 0; return this.r / 4294967296; }
    note(x, y) {
        const v = this.g.view, ax = this.hand === "right" ? v.width : 0, d = Math.hypot(x - ax, y - v.height) / v.height;
        this.far = Math.max(this.far, d); this.points++;
        if (d > (this.worst?.d ?? 0)) this.worst = { d, x: Math.round(x), y: Math.round(y) };
    }
    ev(kind, x, y) { this.note(x, y); this.g.input.pointerEvent(kind, this.id, x, y); }
    down(x, y) { this.q.push(() => this.ev("down", x, y)); }
    up(x, y) { this.q.push(() => this.ev("up", x, y)); }
    hold(n) { for (let i = 0; i < n; i++) this.q.push(() => {}); }
    moveTo(x0, y0, x1, y1, n) { n = Math.round(n * this.slow); for (let i = 1; i <= n; i++) this.q.push(() => this.ev("move", x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n)); }
    tap(x, y) { this.gest++; this.down(x, y); this.hold(2); this.up(x, y); this.hold(2); }
    drag(x0, y0, x1, y1, n = 10) { this.gest++; this.down(x0, y0); this.hold(1); this.moveTo(x0, y0, x1, y1, n); this.hold(1); this.up(x1, y1); this.hold(1); }
    busy() { return this.q.length > 0; }
    run() { if (this.q.length) { const f = this.q.shift(); f(); return true; } return false; }

    /** Decide one gesture from what's on screen. */
    decide(st) {
        const k = st.k, L = st.L;
        for (let i = 0; i < k.bins.length; i++) if (k.bins[i].gull) { this.tap(L.bins[i].x, L.bins[i].y); return; }
        for (const p of k.pots) {
            const ph = k.potPhase(p), P = L.pots[p.i], b = p.state === "cook" ? k.bowlForPot(p) : null;
            if (ph === "mush") { this.tap(P.x, P.y); return; }
            if (b && (ph === "perfect" || ph === "soft")) { const B = L.bowls[b.i]; this.drag(P.x, P.y, B.x, B.y + 30, 8); return; }
        }
        const done = k.bowls.find((b) => k.complete(b));
        if (done) { const B = L.bowls[done.i]; this.drag(B.x, B.y + B.r * 0.5, B.x, B.y + B.r * 0.5 - 50, 4); return; }
        const list = k.bowls.filter((b) => b.c && b.hold <= 0).sort((a, b) => a.c.id - b.c.id);
        for (const p of k.pots) if (p.state === "empty" && k.needNoodles().length) { const P = L.pots[p.i]; this.tap(P.x, P.y); return; }
        for (const b of list) if (b.level < TUNE.pour.okLo) {
            const j = k.brothList.indexOf(RECIPES[b.c.recipe].broth), P = L.broths[j], B = L.bowls[b.i];
            this.gest++; this.down(P.x, P.y); this.hold(1); this.moveTo(P.x, P.y, B.x, B.y + 44, 9);
            const stop = 0.885 + (this.rnd() - 0.5) * 0.03;
            const wait = () => { if (k.bowls[b.i].level < stop && k.ladle && k.ladle.fill > 0 && k.bowls[b.i].c) this.q.unshift(wait); };
            this.q.push(wait);
            this.up(B.x, B.y + 44); this.hold(1);
            return;
        }
        for (const b of list) for (const id of RECIPES[b.c.recipe].tops) if (b.tops[id] === undefined) {
            const i = k.bins.findIndex((x) => x.id === id), P = L.bins[i], B = L.bowls[b.i], T = TOPPINGS[id], ix = B.r * 0.9, iy = ix * 0.714;
            if (k.bins[i].stock <= 0) { this.scrub(P); return; }
            const sx = B.x + T.slot[0] * ix * 0.86, sy = B.y + T.slot[1] * iy * 0.86 + 38;
            this.drag(P.x, P.y, sx + (this.rnd() - 0.5) * this.jit, sy + (this.rnd() - 0.5) * this.jit, 9);
            return;
        }
        const low = k.bins.findIndex((b) => TOPPINGS[b.id].sliced && b.stock < 3);
        if (low >= 0) this.scrub(L.bins[low]);
    }
    scrub(P) {
        this.gest++;
        const w = 22;
        this.down(P.x - w, P.y); this.hold(1);
        this.moveTo(P.x - w, P.y, P.x + w, P.y, 3); this.moveTo(P.x + w, P.y, P.x - w, P.y, 3);
        this.up(P.x - w, P.y); this.hold(1);
    }
    /** Step a shift to its end. Returns when the results screen is up. */
    playShift(limitSec = 400, onStep) {
        const g = this.g; let n = 0;
        while (g.currentName === "play" && n < limitSec * 60) {
            const st = g.ramen.stage;
            if (!this.run()) { if (this.wait-- <= 0) { this.decide(st); this.wait = this.think; } }
            g.step(1); n++;
            onStep?.(st);
        }
        return n / 60;
    }
    /** Tap a real on-screen button by its label. */
    press(label) {
        const g = this.g, e = g.current.entities.find((x) => x.buttonLabel === label);
        if (!e) throw new Error(`no button "${label}" in ${g.currentName}: ${g.current.entities.map((x) => x.buttonLabel).filter(Boolean)}`);
        const p = e.screenPos?.() ?? e.pos, w = e.worldPos?.() ?? p;
        g.input.tap(w.x, w.y);
        g.step(2);
    }
}
