// The animated board: replays the engine's phases as wobbling, squashing jelly, and owns the touch of a candy.
import { BEE, BONBON, CANDY, FOLK, H, MALLOW, N, STAR, STRIPE_H, STRIPE_V, W, isSpecial } from "./engine.js";
import { PALETTE, SHEET, SLOT, frameFor } from "./art.js";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const xOf = (i) => i % W, yOf = (i) => (i - i % W) / W;
const outBack = (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
export const FONT = '"Arial Rounded MT Bold", ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif';
export const INK = "#3a1a4e", CREAM = "#fff6e6";
const CHAIN_WORDS = ["", "Yum!", "Tasty!", "Scrumptious!", "Delicious!", "SUGAR RUSH!", "SUGAR CRASH!"];
const FALL_ACCEL = 62, FALL_START = 5, MAX_FLIERS = 12;

/** Thick outlined display text, the only text style used over busy art. */
export function inkText(d, str, o) {
    const size = o.size ?? 20, w = o.ink ?? Math.max(1.5, size * 0.09), x = o.x ?? 0, y = o.y ?? 0, style = { size, bold: true, font: FONT, color: o.inkColor ?? INK, opacity: o.opacity, maxWidth: o.maxWidth, align: o.align };
    for (const [a, b] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) d.text(str, { ...style, x: x + a * w, y: y + b * w });
    d.text(str, { ...style, x, y: y + w * 0.8 });
    d.text(str, { ...style, x, y, color: o.color ?? "#fff" });
}

export class BoardView {
    constructor(game, s, match, host) {
        this.game = game; this.s = s; this.m = match; this.host = host;
        this.ox = 0; this.oy = 0; this.cs = 40;
        this.pieces = new Map(); this.byCell = new Int32Array(N);
        this.vis = { mask: match.mask.slice(), frost: match.frost.slice(), cookie: match.cookie.slice(), fudge: match.fudge.slice(), cage: match.cage.slice() };
        this.cookieQ = new Float32Array(N); this.cageQ = new Float32Array(N); this.fudgeQ = new Float32Array(N);
        this.queue = []; this.phase = null; this.wait = 0; this.timers = []; this.snap = null;
        this.drops = []; this.rays = []; this.rings = []; this.words = []; this.fliers = []; this.sparks = []; this.bees = [];
        this.grab = null; this.sel = -1; this.cursor = -1; this.hintT = 0; this.hint = null; this.aiming = false; this.aim = -1;
        this.bx = 0; this.by = 0; this.bvx = 0; this.bvy = 0; this.t = 0; this.locked = false; this.landed = 0; this.dim = 0; this.hidden = false; this.board = 1;
        for (let i = 0; i < N; i++) if (match.pk[i]) this.addPiece(match.pid[i], match.pk[i], match.pc[i], i);
        this.snap = { score: match.score, moves: match.moves, feed: match.feed, left: match.goals.map((g) => match.remaining(g)) };
    }

    addPiece(id, k, c, i) {
        const p = { id, k, c, x: xOf(i), y: yOf(i), q: 0, qv: 0, wx: 0, wy: 0, wvx: 0, wvy: 0, a: 1, s: 1, sv: 0, rot: 0, tw: null, path: null, v: id % 3, ph: id * 1.7, delay: 0, cell: i };
        this.pieces.set(id, p);
        return p;
    }

    layout(ox, oy, cs) { this.ox = ox; this.oy = oy; this.cs = cs; }
    cx(i) { return this.ox + (xOf(i) + 0.5) * this.cs + this.bx; }
    cy(i) { return this.oy + (yOf(i) + 0.5) * this.cs + this.by; }
    get width() { return W * this.cs; }
    get height() { return H * this.cs; }
    cellAt(x, y) {
        const cx = Math.floor((x - this.ox) / this.cs), cy = Math.floor((y - this.oy) / this.cs);
        if (cx < 0 || cx >= W || cy < 0 || cy >= H) return -1;
        return cx + cy * W;
    }
    pieceAt(i) { const id = this.m.pid[i]; return id ? this.pieces.get(id) : null; }
    get idle() { return !this.phase && !this.queue.length && this.wait <= 0 && !this.timers.length && !this.anyBusy(); }
    anyBusy() { for (const p of this.pieces.values()) if (p.path || p.tw) return true; return false; }

    after(t, fn) { this.timers.push({ t, fn }); }

    // --- Player input ---------------------------------------------------------------------------------------
    input(inp) {
        const ptr = inp.pointer;
        if (this.aiming) {
            const hover = this.cellAt(ptr.x, ptr.y);
            if (hover >= 0) this.aim = hover;
            if (ptr.released || ptr.tapped) { if (hover >= 0 && this.vis.mask[hover]) { this.host.chompAt(hover); } }
            return;
        }
        if (!this.idle || this.locked) { if (ptr.released) this.grab = null; return; }
        const m = this.m;
        if (ptr.pressed) {
            const i = this.cellAt(ptr.x, ptr.y);
            if (i >= 0 && m.movable(i)) {
                this.hintT = 0; this.hint = null;
                if (this.sel >= 0 && this.sel !== i && Math.abs(xOf(i) - xOf(this.sel)) + Math.abs(yOf(i) - yOf(this.sel)) === 1) {
                    const from = this.sel;
                    this.sel = -1;
                    this.attempt(from, i);
                    return;
                }
                this.grab = { i, x: ptr.x, y: ptr.y, dx: 0, dy: 0, moved: false, was: this.sel === i };
                const p = this.pieceAt(i);
                if (p) { p.qv += 2.5; p.sv += 1.6; }
                this.host.onGrab?.(i);
                this.sel = -1;
            } else this.sel = -1;
        }
        const g = this.grab;
        if (g) {
            const dx = ptr.x - g.x, dy = ptr.y - g.y, cs = this.cs;
            g.dx = dx; g.dy = dy;
            if (Math.hypot(dx, dy) > cs * 0.12) g.moved = true;
            if (Math.max(Math.abs(dx), Math.abs(dy)) > cs * 0.42) {
                const horiz = Math.abs(dx) > Math.abs(dy), x = xOf(g.i) + (horiz ? Math.sign(dx) : 0), y = yOf(g.i) + (horiz ? 0 : Math.sign(dy));
                const from = g.i;
                this.grab = null;
                if (x >= 0 && x < W && y >= 0 && y < H && this.vis.mask[x + y * W]) this.attempt(from, x + y * W);
                else this.nudge(from, x - xOf(from), y - yOf(from));
                return;
            }
            if (ptr.released || !ptr.down) {
                if (!g.moved && !g.was) { this.sel = g.i; this.host.onSelect?.(g.i); }
                const p = this.pieceAt(g.i);
                if (p) { p.q = 0; p.qv = -3; }
                this.grab = null;
            }
        }
        // Keyboard and pad: arrows move a cursor, confirm picks up, then an arrow swaps.
        for (const [a, dx, dy] of [["left", -1, 0], ["right", 1, 0], ["up", 0, -1], ["down", 0, 1]]) if (inp.pressed(a)) {
            if (this.cursor < 0) { this.cursor = 3 + 4 * W; continue; }
            const x = clamp(xOf(this.cursor) + dx, 0, W - 1), y = clamp(yOf(this.cursor) + dy, 0, H - 1), next = x + y * W;
            if (this.sel >= 0) { const from = this.sel; this.sel = -1; if (next !== from) { this.cursor = next; this.attempt(from, next); } }
            else this.cursor = next;
        }
        if (inp.pressed("confirm") && this.cursor >= 0 && m.movable(this.cursor)) this.sel = this.sel === this.cursor ? -1 : this.cursor;
    }

    /** Candy pressed against the wall of the board. */
    nudge(i, dx, dy) {
        const p = this.pieceAt(i);
        if (p) { p.wvx += dx * 9; p.wvy += dy * 9; p.qv += 3; }
        this.host.onNudge?.();
    }

    attempt(a, b) {
        this.hint = null; this.hintT = 0;
        const phases = this.m.play(a, b);
        if (phases) { this.run(phases); this.host.onMove?.(); return true; }
        if (this.m.moves <= 0 && !this.m.endless) return false;
        // A refused swap goes most of the way, then springs home.
        const pa = this.pieceAt(a), pb = this.pieceAt(b);
        if (pa && pb && this.m.movable(b)) {
            const dx = xOf(b) - xOf(a), dy = yOf(b) - yOf(a);
            pa.tw = { x0: pa.x, y0: pa.y, x1: pa.x + dx * 0.72, y1: pa.y + dy * 0.72, t: 0, time: 0.1, back: 0.2 };
            pb.tw = { x0: pb.x, y0: pb.y, x1: pb.x - dx * 0.72, y1: pb.y - dy * 0.72, t: 0, time: 0.1, back: 0.2 };
            pa.qv += dx ? -3 : 3; pb.qv += dx ? -3 : 3;
        } else if (pa) this.nudge(a, xOf(b) - xOf(a), yOf(b) - yOf(a));
        this.host.onNope?.();
        return false;
    }

    run(phases) { for (const p of phases) this.queue.push(p); }

    // --- Replay ---------------------------------------------------------------------------------------------
    next() {
        const ph = this.queue.shift();
        this.phase = ph ?? null;
        if (!ph) return;
        if (ph.snap) this.pendingSnap = ph.snap;
        const done = this["do_" + ph.t]?.(ph);
        this.wait = typeof done === "number" ? done : 0;
        if (ph.snap && ph.t !== "burst") this.snap = ph.snap;
    }

    do_swap(ph) {
        const a = this.pieces.get(ph.ida), b = this.pieces.get(ph.idb);
        const glide = (p, i, other) => { if (p) { p.tw = { x0: p.x, y0: p.y, x1: xOf(i), y1: yOf(i), t: 0, time: 0.11, over: true }; p.qv += xOf(other) !== xOf(i) ? -5 : 5; } };
        glide(a, ph.b, ph.a); glide(b, ph.a, ph.b);
        this.host.sound.swap();
        return 0.12;
    }

    do_burst(ph) {
        let last = 0;
        const chain = ph.chain, big = ph.pops.length >= 8;
        for (const p of ph.pops) if (p.d > last) last = p.d;
        for (const h of ph.hits) if (h.d > last) last = h.d;
        ph.pops.forEach((pop, n) => this.after(pop.d, () => this.popPiece(pop, ph, n)));
        for (const h of ph.hits) this.after(h.d, () => this.hitCell(h));
        for (const f of ph.fx) this.after(f.d, () => this.effect(f, chain));
        for (const t of ph.turns) this.after(t.d, () => { const p = this.pieces.get(t.id); if (p) { p.k = t.k; p.sv += 9; p.qv += 4; this.spark(t.i, 6, "#fff"); } });
        this.after(0, () => { this.snap = ph.snap; this.host.onBurst(ph); });
        for (const w of ph.words) if (w.n >= 4) this.after(0.02, () => this.say(`${w.n * 60 * (1 + chain)}`, w.x, w.y, PALETTE[w.c]?.pop ?? "#fff", 15 + Math.min(10, w.n)));
        if (chain >= 1) {
            const word = CHAIN_WORDS[Math.min(chain, 6)];
            const y = ph.words[0]?.y ?? 4;
            this.after(0.05, () => this.say(word, 3.5, Math.max(1.2, y), ["#fff", "#ffe14f", "#ffa24a", "#ff77a8", "#c77dff", "#5fb6ff", "#7bea5a"][Math.min(chain, 6)], 22 + Math.min(chain, 6) * 3, true));
        }
        for (const mk of ph.makes) this.after(last + 0.1, () => {
            const p = this.addPiece(mk.id, mk.k, mk.c, mk.i);
            p.s = 0.1; p.sv = 14; p.qv = 6;
            this.spark(mk.i, 10, PALETTE[mk.c]?.pop ?? "#ffe14f");
            this.wobble(this.cx(mk.i), this.cy(mk.i), 1.2, 2.6);
            this.host.sound.make(mk.k);
            this.host.monster.mood("wide", "o", 0.5); this.host.monster.kick(2);
            this.game.haptic("medium");
        });
        return last + (ph.makes.length ? 0.2 : 0.12) + (big ? 0.04 : 0);
    }

    popPiece(pop, ph, n) {
        const p = this.pieces.get(pop.id);
        if (!p) return;
        const cx = this.cx(pop.i), cy = this.cy(pop.i);
        if (pop.to !== undefined && pop.to !== pop.i) { p.dying = { to: pop.to, t: 0, time: 0.1 }; p.x0 = p.x; p.y0 = p.y; }
        else { this.pieces.delete(pop.id); this.squish(p); }
        const c = pop.c >= 0 ? pop.c : -1;
        for (let j = 0; j < 5; j++) this.drop(cx, cy, c);
        this.wobble(cx, cy, 1.5, 1.1);
        if (pop.k !== MALLOW && pop.k !== FOLK && this.fliersOn < MAX_FLIERS && (n % 2 === 0 || ph.pops.length < 6)) this.flier(cx, cy, frameFor(CANDY, Math.max(0, pop.c)), pop.c);
        if (pop.k === MALLOW) this.host.sound.mallow();
    }

    get fliersOn() { return this.fliers.length; }

    flier(x, y, frame) {
        const m = this.host.monster;
        m.open(0.6);
        const rng = this.game.fxRng;
        this.fliers.push({ x0: x, y0: y, cx: x + (rng.next() - 0.5) * 80, cy: y - 60 - rng.next() * 50, t: -rng.next() * 0.12, time: 0.42 + rng.next() * 0.12, frame, rot: rng.next() * 6 });
    }

    squish(p) { this.drops.push({ x: this.ox + (p.x + 0.5) * this.cs, y: this.oy + (p.y + 0.5) * this.cs, vx: 0, vy: 0, t: 0, life: 0.14, ghost: frameFor(p.k, p.c, p.v), r: this.cs }); }

    drop(x, y, c) {
        const rng = this.game.fxRng, a = rng.next() * 6.28, sp = 60 + rng.next() * 170;
        if (this.drops.length > 220) return;
        this.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 50, t: 0, life: 0.3 + rng.next() * 0.3, f: SLOT.drop(c < 0 ? Math.floor(rng.next() * 6) : c), r: 5 + rng.next() * 7 });
    }

    spark(i, n, color) {
        const rng = this.game.fxRng;
        for (let j = 0; j < n; j++) { const a = rng.next() * 6.28, sp = 50 + rng.next() * 140; this.sparks.push({ x: this.cx(i), y: this.cy(i), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: 0.35 + rng.next() * 0.25, color, r: 6 + rng.next() * 12 }); }
    }

    /** Jelly shockwave: everything near (x, y) gets shoved and rings. */
    wobble(x, y, cells, power) {
        const cs = this.cs, r = cells * cs;
        for (const p of this.pieces.values()) {
            const dx = (p.x + 0.5) * cs + this.ox - x, dy = (p.y + 0.5) * cs + this.oy - y, l = Math.hypot(dx, dy);
            if (l > r || l < 1) continue;
            const k = (1 - l / r) * power;
            p.wvx += dx / l * k * 4.5; p.wvy += dy / l * k * 4.5; p.qv += k * 2.5;
        }
    }

    hitCell(h) {
        const v = this.vis, x = this.cx(h.i), y = this.cy(h.i), snd = this.host.sound;
        const m = this.host.monster;
        if (h.w === "cookie") {
            v.cookie[h.i] = h.left; this.cookieQ[h.i] = 1; snd.crack(h.left);
            for (let n = 0; n < 7; n++) this.crumb(x, y);
            this.game.haptic(h.left ? "light" : "medium");
            if (!h.left) m.kick(1.5);
        } else if (h.w === "frost") {
            v.frost[h.i] = h.left; snd.lick();
            for (let n = 0; n < 3; n++) this.drop(x, y, 0);
        } else if (h.w === "cage") {
            v.cage[h.i] = 0; snd.snap();
            for (let n = 0; n < 6; n++) this.crumb(x, y, true);
            this.game.haptic("light");
        } else if (h.w === "fudge") {
            v.fudge[h.i] = 0; snd.splat();
            for (let n = 0; n < 6; n++) this.crumb(x, y, "#7c3f22");
            m.mood("happy", "grin", 0.3);
            this.game.haptic("light");
        }
    }

    crumb(x, y, kind) {
        const rng = this.game.fxRng, a = rng.next() * 6.28, sp = 70 + rng.next() * 150;
        this.drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70, t: 0, life: 0.45 + rng.next() * 0.3, f: SLOT.crumb, r: 5 + rng.next() * 6, tint: typeof kind === "string" ? kind : kind ? "#54305c" : undefined });
    }

    effect(f, chain) {
        const s = this.s, snd = this.host.sound, g = this.game, m = this.host.monster;
        if (f.t === "line") {
            const horiz = f.dir === 0;
            const y = horiz ? this.oy + (f.y + 0.5) * this.cs : 0, x = horiz ? 0 : this.ox + (f.x + 0.5) * this.cs;
            this.rays.push({ horiz, x, y, t: 0, life: 0.3 });
            snd.stripe(); g.haptic("medium"); s.shake(2.5, 0.12, { haptic: false }); s.freeze(0.03);
            for (const p of this.pieces.values()) {
                const off = horiz ? (p.y + 0.5) * this.cs + this.oy - y : (p.x + 0.5) * this.cs + this.ox - x;
                if (Math.abs(off) < this.cs * 2.5 && Math.abs(off) > 2) { if (horiz) p.wvy += Math.sign(off) * 4; else p.wvx += Math.sign(off) * 4; }
            }
            m.mood("wide", "wide", 0.4);
        } else if (f.t === "blast") {
            const x = this.cx(f.i), y = this.cy(f.i), big = f.r > 2;
            this.rings.push({ x, y, t: 0, life: 0.4, r: this.cs * (f.r + 1), color: "#fff2b0" });
            this.rings.push({ x, y, t: -0.06, life: 0.4, r: this.cs * (f.r + 0.2), color: "#ff9ec2" });
            this.wobble(x, y, f.r + 3, big ? 7 : 4);
            snd.boom(big); g.haptic(big ? [18, 30, 40] : "heavy"); s.shake(big ? 11 : 6, big ? 0.35 : 0.2, { haptic: false }); s.freeze(big ? 0.09 : 0.05);
            s.flash("#fff4cc55", 0.1);
            m.mood("wide", "wide", 0.6); m.kick(4);
        } else if (f.t === "beam") {
            const x = this.cx(f.i), y = this.cy(f.i);
            f.to.forEach((t, n) => this.rays.push({ beam: true, x, y, x1: this.cx(t), y1: this.cy(t), t: -n * 0.018, life: 0.32, color: PALETTE[f.c]?.pop ?? "#fff" }));
            this.rings.push({ x, y, t: 0, life: 0.45, r: this.cs * 5, color: "#ffffff" });
            snd.star(); g.haptic([10, 30, 10, 30, 30]); s.shake(5, 0.3, { haptic: false }); s.freeze(0.07); s.flash("#ffffff44", 0.12);
            m.mood("star", "wide", 0.8); m.kick(4);
        } else if (f.t === "nova") {
            const x = this.cx(f.i), y = this.cy(f.i);
            for (let n = 0; n < 3; n++) this.rings.push({ x, y, t: -n * 0.1, life: 0.6, r: this.cs * 12, color: ["#ffffff", "#ffe14f", "#ff77a8"][n] });
            this.wobble(x, y, 14, 10);
            snd.boom(true); snd.star(); g.haptic([30, 30, 60, 30, 90]); s.shake(16, 0.6, { haptic: false }); s.freeze(0.12); s.flash("#ffffff", 0.3);
            m.mood("star", "wide", 1.4); m.kick(6);
        } else if (f.t === "bee") {
            this.bees.push({ x0: this.cx(f.i), y0: this.cy(f.i), x1: this.cx(f.to), y1: this.cy(f.to), t: 0, time: 0.34, c: this.m.pc[f.to] >= 0 ? this.m.pc[f.to] : 3 });
            snd.bee(); g.haptic("light");
            m.lookTarget = { x: this.cx(f.to), y: this.cy(f.to) };
        }
    }

    do_fall(ph) {
        const tick = 0.03;
        let last = 0;
        for (const sp of ph.spawns) {
            const p = this.addPiece(sp.id, sp.k, sp.c, sp.i);
            p.x = xOf(sp.i); p.y = yOf(sp.i) - 1; p.entry = yOf(sp.i); p.delay = sp.tick * tick; p.spawn = true;
        }
        for (const path of ph.paths) {
            const p = this.pieces.get(path.id);
            if (!p) continue;
            const pts = [[p.x, p.y]], start = path.steps[0][0] * tick;
            for (const [, i] of path.steps) pts.push([xOf(i), yOf(i)]);
            p.path = { pts, n: 0, s: 0, v: FALL_START, wait: Math.max(start, p.delay) };
            const dist = pts.length - 1, flight = (Math.sqrt(FALL_START * FALL_START + 2 * FALL_ACCEL * dist) - FALL_START) / FALL_ACCEL;
            last = Math.max(last, p.path.wait + flight);
            p.cell = path.steps[path.steps.length - 1][1];
        }
        return last + 0.02;
    }

    do_exit(ph) {
        const p = this.pieces.get(ph.id);
        if (p) {
            this.pieces.delete(ph.id);
            this.exitFx(p);
        }
        this.host.onExit?.(ph);
        return 0.12;
    }
    exitFx(p) {
        this.drops.push({ x: this.ox + (p.x + 0.5) * this.cs, y: this.oy + (p.y + 0.5) * this.cs, vx: (p.x < 4 ? -1 : 1) * 130, vy: -260, t: 0, life: 0.9, f: frameFor(FOLK, -1, p.v), r: this.cs * 0.42, g: 800 });
    }

    do_fudge(ph) {
        const p = this.pieces.get(ph.id);
        if (p) { this.pieces.delete(ph.id); this.squish(p); }
        this.vis.fudge[ph.i] = 1; this.fudgeQ[ph.i] = 1;
        this.host.sound.ooze(); this.host.monster.mood("wide", "o", 0.4);
        this.game.haptic("tick");
        return 0.22;
    }

    do_bite(ph) {
        for (const id of ph.eaten) { const p = this.pieces.get(id); if (p) this.pieces.delete(id); }
        for (const i of ph.cells) {
            this.vis.mask[i] = 0; this.vis.frost[i] = this.vis.cookie[i] = this.vis.fudge[i] = this.vis.cage[i] = 0;
            for (let n = 0; n < 8; n++) this.crumb(this.cx(i), this.cy(i));
        }
        return this.host.boardBite(ph);
    }

    do_shuffle(ph) {
        for (const mv of ph.moves) {
            const p = this.pieces.get(mv.id);
            if (!p) continue;
            p.tw = { x0: p.x, y0: p.y, x1: xOf(mv.i), y1: yOf(mv.i), t: -this.game.fxRng.next() * 0.1, time: 0.32, over: true, spin: true };
        }
        this.say("Reshuffle!", 3.5, 4, "#fff", 26, true);
        this.host.sound.shuffle(); this.host.monster.mood("dizzy", "o", 0.9);
        this.game.haptic("medium");
        return 0.5;
    }
    do_recolour(ph) { for (const c of ph.changes) { const p = this.pieces.get(c.id); if (p) { p.c = c.c; p.sv += 6; } } return 0.15; }
    do_gift(ph) {
        const p = this.pieces.get(ph.id);
        if (p) { p.k = STAR; p.c = -1; p.sv += 12; }
        this.spark(ph.i, 14, "#ffe14f");
        this.say("Morsel coughs up a star", 3.5, 4, "#ffe14f", 18, true);
        return 0.4;
    }
    do_chomp(ph) { return this.host.boardChomp(ph); }
    do_rush(ph) {
        for (const t of ph.turned) { const p = this.pieces.get(t.id); if (p) { p.k = t.k; p.sv += 8; this.spark(t.i, 5, "#fff"); } }
        this.host.sound.rushTick(); this.game.haptic("light");
        return 0.14;
    }

    say(text, x, y, color, size, center) {
        this.words.push({ text, x: this.ox + (x + 0.5) * this.cs, y: this.oy + (y + 0.5) * this.cs, color, size, t: 0, life: center ? 0.95 : 0.7, center });
        if (this.words.length > 8) this.words.shift();
    }

    // --- Per-step ------------------------------------------------------------------------------------------
    update(dt) {
        this.t += dt;
        if (this.wait > 0) this.wait -= dt;
        for (let n = this.timers.length - 1; n >= 0; n--) { const t = this.timers[n]; t.t -= dt; if (t.t <= 0) { this.timers.splice(n, 1); t.fn(); } }
        if (this.wait <= 0 && !this.timers.length && !this.holdQueue) {
            if (this.phase || this.queue.length) this.next();
        }
        this.bvx += (-this.bx * 260 - this.bvx * 16) * dt; this.bvy += (-this.by * 260 - this.bvy * 16) * dt;
        this.bx += this.bvx * dt; this.by += this.bvy * dt;
        const g = this.grab;
        for (const p of this.pieces.values()) this.updatePiece(p, dt, g);
        this.cookieQ.forEach((v, i, a) => { if (v > 0) a[i] = Math.max(0, v - dt * 5); });
        this.fudgeQ.forEach((v, i, a) => { if (v > 0) a[i] = Math.max(0, v - dt * 3); });
        this.tickFx(dt);
        // A nudge if they stall.
        if (this.idle && !this.locked && !this.m.won && !this.m.lost && !this.aiming) {
            this.hintT += dt;
            if (this.hintT > (this.host.hintDelay ?? 6) && !this.hint) this.hint = this.host.pickHint?.() ?? null;
        }
    }

    updatePiece(p, dt, g) {
        p.qv += (-p.q * 260 - p.qv * 13) * dt; p.q += p.qv * dt;
        p.sv += ((1 - p.s) * 260 - p.sv * 15) * dt; p.s += p.sv * dt;
        p.wvx += (-p.wx * 300 - p.wvx * 15) * dt; p.wvy += (-p.wy * 300 - p.wvy * 15) * dt;
        p.wx += p.wvx * dt; p.wy += p.wvy * dt;
        if (p.dying) {
            const d = p.dying; d.t += dt;
            const k = Math.min(1, d.t / d.time), tx = xOf(d.to), ty = yOf(d.to);
            p.x = p.x0 + (tx - p.x0) * k * k; p.y = p.y0 + (ty - p.y0) * k * k;
            p.q = -0.2 * k;
            if (k >= 1) this.pieces.delete(p.id);
            return;
        }
        if (p.tw) {
            const tw = p.tw; tw.t += dt;
            if (tw.t >= 0) {
                const k = Math.min(1, tw.t / tw.time), e = tw.over ? outBack(k) : k * (2 - k);
                p.x = tw.x0 + (tw.x1 - tw.x0) * e; p.y = tw.y0 + (tw.y1 - tw.y0) * e;
                if (tw.spin) p.rot = (1 - k) * 3;
                if (k >= 1) {
                    p.x = tw.x1; p.y = tw.y1; p.rot = 0;
                    if (tw.back) { p.tw = { x0: p.x, y0: p.y, x1: tw.x0, y1: tw.y0, t: 0, time: tw.back, over: true }; p.qv += 5; }
                    else { p.tw = null; p.qv += tw.over ? 3.5 : 0; }
                }
            }
        }
        if (p.path) this.fallPiece(p, dt);
    }

    fallPiece(p, dt) {
        const f = p.path;
        if (f.wait > 0) { f.wait -= dt; return; }
        f.v += FALL_ACCEL * dt;
        f.s += f.v * dt;
        const max = f.pts.length - 1;
        if (f.s >= max) {
            const end = f.pts[max];
            p.x = end[0]; p.y = end[1]; p.path = null; p.spawn = false;
            const hit = clamp(f.v / 22, 0.15, 1);
            p.q = -0.22 * hit; p.qv = 0.5 - 4 * hit;
            p.wvy += 3.5 * hit;
            this.landed++;
            if (this.landed % 3 === 0 && hit > 0.4) this.host.sound.land(hit);
            return;
        }
        const n = Math.floor(f.s), t = f.s - n, a = f.pts[n], b = f.pts[n + 1];
        p.x = a[0] + (b[0] - a[0]) * t; p.y = a[1] + (b[1] - a[1]) * t;
        p.q = Math.min(0.14, f.v * 0.008);
    }

    tickFx(dt) {
        const m = this.host.monster;
        for (let n = this.drops.length - 1; n >= 0; n--) {
            const f = this.drops[n]; f.t += dt;
            if (f.t >= f.life) { this.drops[n] = this.drops[this.drops.length - 1]; this.drops.pop(); continue; }
            if (f.ghost === undefined) { f.vy += (f.g ?? 520) * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
        }
        for (let n = this.sparks.length - 1; n >= 0; n--) { const f = this.sparks[n]; f.t += dt; f.vx *= 0.95; f.vy *= 0.95; f.x += f.vx * dt; f.y += f.vy * dt; if (f.t >= f.life) this.sparks.splice(n, 1); }
        for (const list of [this.rays, this.rings]) for (let n = list.length - 1; n >= 0; n--) { list[n].t += dt; if (list[n].t >= list[n].life) list.splice(n, 1); }
        for (let n = this.words.length - 1; n >= 0; n--) { const w = this.words[n]; w.t += dt; if (w.t >= w.life) this.words.splice(n, 1); }
        for (let n = this.bees.length - 1; n >= 0; n--) { const b = this.bees[n]; b.t += dt; if (b.t >= b.time) { this.bees.splice(n, 1); m.lookTarget = null; } }
        const mouth = m.mouthPos();
        if (this.fliers.length) m.lookTarget = this.fliers[0].x !== undefined ? { x: this.fliers[0].x, y: this.fliers[0].y } : null;
        for (let n = this.fliers.length - 1; n >= 0; n--) {
            const f = this.fliers[n]; f.t += dt;
            if (f.t < 0) continue;
            const k = f.t / f.time;
            if (k >= 1) {
                this.fliers.splice(n, 1);
                m.gulp(f.frame, false);
                this.host.onSwallow?.();
                if (!this.fliers.length) m.lookTarget = null;
                continue;
            }
            const u = k * k, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
            f.x = a * f.x0 + b * f.cx + c * mouth.x; f.y = a * f.y0 + b * f.cy + c * mouth.y; f.rot += dt * 8;
        }
    }

    // --- Drawing -------------------------------------------------------------------------------------------
    drawBoard(d) {
        if (this.hidden) return;
        const cs = this.cs, v = this.vis, ox = this.ox + this.bx, oy = this.oy + this.by;
        // Fat jelly rim: an oversized rounded plate per open cell, so holes and bites shape the frame by themselves.
        for (const [grow, color] of [[14, "#3a1a4e"], [9, "#ff77a8"], [5, "#ffb4d2"]]) {
            for (let i = 0; i < N; i++) if (v.mask[i]) d.rect(cs + grow, cs + grow, { x: ox + (xOf(i) + 0.5) * cs, y: oy + (yOf(i) + 0.5) * cs + (grow === 14 ? 1.5 : 0), color, radius: 10 });
        }
        for (let i = 0; i < N; i++) {
            if (!v.mask[i]) continue;
            const x = ox + (xOf(i) + 0.5) * cs, y = oy + (yOf(i) + 0.5) * cs;
            d.sprite(SHEET, { frame: SLOT.tile((xOf(i) + yOf(i)) & 1), x, y, width: cs + 0.5, height: cs + 0.5 });
            if (v.frost[i]) d.sprite(SHEET, { frame: SLOT.frost(v.frost[i]), x, y, width: cs + 1, height: cs + 1 });
        }
    }

    drawBlocks(d) {
        const cs = this.cs, v = this.vis, ox = this.ox + this.bx, oy = this.oy + this.by;
        for (let i = 0; i < N; i++) {
            if (!v.mask[i]) continue;
            const x = ox + (xOf(i) + 0.5) * cs, y = oy + (yOf(i) + 0.5) * cs;
            if (v.cookie[i]) { const q = this.cookieQ[i], w = cs * (1.02 + q * 0.14), h = cs * (1.02 - q * 0.1); d.sprite(SHEET, { frame: SLOT.cookie(v.cookie[i]), x, y, width: w, height: h }); }
            if (v.fudge[i]) { const q = this.fudgeQ[i], wob = Math.sin(this.t * 2.4 + i) * 0.012, w = cs * (1.06 + wob - q * 0.3), h = cs * (1.06 - wob - q * 0.3); d.sprite(SHEET, { frame: SLOT.fudge(i), x, y, width: w, height: h }); }
        }
    }

    /** New candy slides out from under the top rim instead of hovering over the scenery. */
    drawPiecesClipped(d) {
        const pad = this.cs * 0.3, w = this.s.view.width + pad * 2;
        d.clip(-pad, this.oy + this.by - 5, w, this.s.view.height, () => this.drawPieces(d));
    }

    drawPieces(d) {
        const cs = this.cs, ox = this.ox + this.bx, oy = this.oy + this.by, size = cs * 0.98, g = this.grab, t = this.t;
        let lifted = null;
        const grabbed = g ? this.pieceAt(g.i) : null;
        let nudged = null, ndx = 0, ndy = 0;
        if (g && grabbed) {
            const horiz = Math.abs(g.dx) > Math.abs(g.dy), a = horiz ? clamp(g.dx / cs, -0.42, 0.42) : clamp(g.dy / cs, -0.42, 0.42);
            const x = xOf(g.i) + (horiz ? Math.sign(a) : 0), y = yOf(g.i) + (horiz ? 0 : Math.sign(a));
            if (a && x >= 0 && x < W && y >= 0 && y < H) { nudged = this.pieceAt(x + y * W); ndx = horiz ? -a * 0.5 : 0; ndy = horiz ? 0 : -a * 0.5; }
        }
        for (const p of this.pieces.values()) {
            if (p === grabbed) { lifted = p; continue; }
            this.drawPiece(d, p, ox, oy, size, t, p === nudged ? ndx : 0, p === nudged ? ndy : 0, p === nudged ? Math.abs(ndx + ndy) : 0, nudged && p === nudged && ndx !== 0);
        }
        for (let i = 0; i < N; i++) if (this.vis.cage[i]) d.sprite(SHEET, { frame: SLOT.cage, x: ox + (xOf(i) + 0.5) * cs, y: oy + (yOf(i) + 0.5) * cs, width: cs * 1.02, height: cs * 1.02 });
        if (lifted) {
            const horiz = Math.abs(g.dx) > Math.abs(g.dy), a = horiz ? clamp(g.dx / cs, -0.42, 0.42) : clamp(g.dy / cs, -0.42, 0.42);
            this.drawPiece(d, lifted, ox, oy, size * 1.14, t, horiz ? a : 0, horiz ? 0 : a, Math.abs(a) * 0.7, horiz);
        }
        if (this.sel >= 0) this.drawSel(d, this.sel, "#ffffff");
        if (this.cursor >= 0) this.drawSel(d, this.cursor, "#ffe14f");
        const h = this.hint;
        if (h) {
            const pulse = Math.sin(this.t * 7) * 0.5 + 0.5, a = this.pieceAt(h[0]), b = this.pieceAt(h[1]);
            if (a && b) { const dx = (b.x - a.x) * 0.1 * pulse, dy = (b.y - a.y) * 0.1 * pulse; a.wx = dx; a.wy = dy; b.wx = -dx; b.wy = -dy; }
        }
    }

    drawSel(d, i, color) {
        const x = this.cx(i), y = this.cy(i), s = this.cs * (1.02 + Math.sin(this.t * 8) * 0.03), w = 3, c = this.cs * 0.26, q = s / 2;
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { d.line([x + a * q, y + b * q], [x + a * (q - c), y + b * q], { width: w, color }); d.line([x + a * q, y + b * q], [x + a * q, y + b * (q - c)], { width: w, color }); }
    }

    drawPiece(d, p, ox, oy, size, t, ax, ay, stretch, horiz) {
        const cs = this.cs;
        let sx = 1 - p.q * 0.8, sy = 1 + p.q * 0.8;
        if (stretch) { if (horiz) { sx += stretch; sy -= stretch * 0.6; } else { sy += stretch; sx -= stretch * 0.6; } }
        const breathe = Math.sin(t * 2.6 + p.ph) * 0.012;
        const x = ox + (p.x + p.wx + ax + 0.5) * cs, y = oy + (p.y + p.wy + ay + 0.5) * cs + (sy - 1) * -size * 0.25;
        let scale = p.s, a = 1;
        const frame = frameFor(p.k, p.c, p.v);
        if (p.spawn && p.entry !== undefined && p.y < p.entry) { a = clamp(p.y - p.entry + 1); if (a <= 0.02) return; scale *= 0.45 + a * 0.55; }
        const w = size * (sx + breathe) * scale, h = size * (sy - breathe) * scale;
        const spin = p.k === STAR ? t * 0.9 : p.k === BEE ? Math.sin(t * 7 + p.ph) * 0.12 : p.rot;
        if (spin) { d.push(); d.translate(x, y); d.rotate(spin); d.sprite(SHEET, { frame, width: w, height: h, opacity: a }); d.pop(); }
        else d.sprite(SHEET, { frame, x, y, width: w, height: h, opacity: a });
        if (isSpecial(p.k) && p.k !== BEE) {
            const q = Math.sin(t * 4 + p.ph) * 0.5 + 0.5;
            d.additive(() => d.sprite(SHEET, { frame: SLOT.spark, x: x + Math.cos(t * 2 + p.ph) * size * 0.3, y: y + Math.sin(t * 3 + p.ph) * size * 0.3, width: size * 0.4 * q, height: size * 0.4 * q, opacity: 0.8 * q }));
        }
    }

    drawFx(d) {
        const cs = this.cs;
        for (const f of this.drops) {
            const k = f.t / f.life;
            if (f.ghost !== undefined) { d.sprite(SHEET, { frame: f.ghost, x: f.x, y: f.y, width: f.r * (1 + k * 0.5), height: f.r * (1 + k * 0.5), opacity: 1 - k }); continue; }
            const r = f.r * (f.tint ? 1 : 1 - k * 0.6) * 2;
            d.sprite(SHEET, { frame: f.f, x: f.x, y: f.y, width: r, height: r, opacity: k > 0.7 ? (1 - k) / 0.3 : 1, color: f.tint });
        }
        if (this.rings.length || this.rays.length || this.sparks.length) d.additive(() => {
            for (const r of this.rays) {
                if (r.t < 0) continue;
                const k = r.t / r.life;
                if (r.beam) { d.line([r.x, r.y], [r.x + (r.x1 - r.x) * Math.min(1, k * 3), r.y + (r.y1 - r.y) * Math.min(1, k * 3)], { width: 5 * (1 - k), color: r.color, opacity: 1 - k }); continue; }
                const th = cs * (1 - k) * 0.95;
                if (r.horiz) { d.rect(W * cs + 20, th, { x: this.ox + W * cs / 2, y: r.y, color: "#fff4c4", opacity: (1 - k) * 0.9, radius: th / 2 }); d.rect(W * cs + 20, th * 0.4, { x: this.ox + W * cs / 2, y: r.y, color: "#ffffff", opacity: 1 - k, radius: th / 4 }); }
                else { d.rect(th, H * cs + 20, { x: r.x, y: this.oy + H * cs / 2, color: "#fff4c4", opacity: (1 - k) * 0.9, radius: th / 2 }); d.rect(th * 0.4, H * cs + 20, { x: r.x, y: this.oy + H * cs / 2, color: "#ffffff", opacity: 1 - k, radius: th / 4 }); }
            }
            for (const r of this.rings) {
                if (r.t < 0) continue;
                const k = r.t / r.life, rad = r.r * (1 - (1 - k) * (1 - k));
                d.circle(rad, { x: r.x, y: r.y, color: r.color, opacity: (1 - k) * 0.28 });
            }
            for (const f of this.sparks) { const k = f.t / f.life, s = f.r * (1 - k) * 2; d.sprite(SHEET, { frame: SLOT.spark, x: f.x, y: f.y, width: s, height: s, color: f.color, opacity: 1 - k }); }
        });
        for (const b of this.bees) {
            const k = b.t / b.time, e = k * k * (3 - 2 * k), x = b.x0 + (b.x1 - b.x0) * e, y = b.y0 + (b.y1 - b.y0) * e - Math.sin(k * Math.PI) * cs * 1.4;
            d.sprite(SHEET, { frame: SLOT.bee(b.c), x, y, width: cs * 1.1, height: cs * 1.1 });
        }
        for (const f of this.fliers) {
            if (f.t < 0) continue;
            const k = f.t / f.time, s = cs * (0.8 - k * 0.42);
            d.sprite(SHEET, { frame: f.frame, x: f.x, y: f.y, width: s, height: s, rot: f.rot });
        }
        if (this.aiming && this.aim >= 0) {
            const x = this.cx(this.aim), y = this.cy(this.aim), s = cs * 3 + Math.sin(this.t * 9) * 3;
            d.rect(s + 6, s + 6, { x, y, color: "#ff4f8a", opacity: 0.75, radius: 16 }); d.rect(s, s, { x, y, color: "#fff2f8", opacity: 0.42, radius: 13 });
            this.drawSel(d, this.aim, "#ffffff");
            const q = s / 2;
            for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) d.circle(5, { x: x + a * q, y: y + b * q, color: "#ff77a8" });
        }
    }

    drawWords(d) {
        for (const w of this.words) {
            const k = w.t / w.life, pop = k < 0.2 ? outBack(k / 0.2) : 1, y = w.y - (w.center ? 8 : 26) * k, a = k > 0.75 ? (1 - k) / 0.25 : 1;
            d.push(); d.translate(w.x, y); d.scale(pop * (w.center ? 1 + Math.sin(k * 3) * 0.05 : 1)); inkText(d, w.text, { size: w.size, color: w.color, opacity: a }); d.pop();
        }
    }
}
