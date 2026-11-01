// The microgame runtime. A microgame is a plain object registered with G(); Micro runs one of them.
// Coordinates are local to the panel centre. Everything important stays inside the 320x320 arena (-160..160).
import { Rng } from "./pogo.js";
import { C, INK, PAD, ensurePat, paintSprite } from "./ink.js";

export const GAMES = [];
export const byId = {};
export const G = (def) => {
    if (byId[def.id]) throw new Error("duplicate microgame " + def.id);
    def.verb = def.verb ?? def.id.toUpperCase();
    def.tags = (def.tags ?? "").split(" ").filter(Boolean);
    GAMES.push(def); byId[def.id] = def;
    return def;
};
/** A tone, shortest possible. */
export const T = (wave, freq, to, decay = 0.1, volume = 0.14, at = 0) => ({ wave, freq, to: to ?? freq, decay, volume, at });
export const NOISE = (decay = 0.1, volume = 0.12, at = 0) => ({ wave: "noise", freq: 1000, decay, volume, at });
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const dist = (a, b, c, e) => Math.hypot(a - c, b - e);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

const painted = new Set();
/** Paint a microgame's art the first time it is needed, while the wipe hides the hitch. */
export function ensureArt(game, def, only) {
    for (const [name, [w, h, fn, o]] of Object.entries(def.art ?? {})) {
        if (only && name !== only) continue;
        const key = def.id + "." + name;
        if (painted.has(key)) continue;
        painted.add(key);
        paintSprite(game.assets, key, w, h, fn, o);
    }
}

export const artKey = (def) => def.id + "." + (def.icon ?? Object.keys(def.art ?? {})[0]);

const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export class Micro {
    constructor(game, scene, def, o = {}) {
        this.game = game; this.scene = scene; this.def = def;
        this.speed = o.speed ?? 1; this.level = o.level ?? 0; this.seed = o.seed ?? 1;
        this.rng = new Rng(this.seed * 7919 + def.id.length * 31 + def.id.charCodeAt(0)); this.fxr = game.fxRng;
        this.t = 0; this.dur = def.dur ?? 5; this.done = null; this.over = false; this.overT = 0; this.stall = 0;
        this.rt = 0; this.fx = []; this.rings = []; this.flashC = null; this.flashT = 0;
        this.lastHit = -9;
        this.applyPanel(o.panel ?? { cx: scene.view.width / 2, cy: scene.view.height / 2, w: 340, h: 340 });
        const home = def.home ?? [0, 0];
        this.x = home[0]; this.y = home[1]; this.kx = this.x; this.ky = this.y;
        this.px = this.x; this.py = this.y; this.dx = 0; this.dy = 0;
        this.down = false; this.pressed = false; this.released = false; this.swipe = null; this.flick = null; this.rub = 0;
        this.keyboard = !!o.keyboard; this.kbdSpace = false; this.ges = null; this.touches = []; this.two = false;
        this.pivot = [0, 0]; this.f1 = null; this.f2 = null; this.spread = 0; this.ang = 0;
        this.ptrInit = false;
        ensureArt(game, def);
        if (def.bg?.[2]) ensurePat(game.assets, def.bg[2]);
        def.init?.(this);
    }
    applyPanel(p) { this.panel = p; this.cx = p.cx; this.cy = p.cy; this.L = -p.w / 2; this.R = p.w / 2; this.T = -p.h / 2; this.B = p.h / 2; }
    get left() { return this.dur - this.t; }
    get p() { return clamp(this.t / this.dur); }

    win() {
        if (this.done) return;
        this.done = "win"; this.over = true;
        this.game.haptic("success");
        this.flash(C.wht, 0.12);
    }
    lose() {
        if (this.done) return;
        this.done = "fail"; this.over = true;
        this.game.haptic("error");
        this.shake(7, 0.25);
    }
    /** The game's signature pulse (or an override), with a tone. */
    hit(tone, haptic) { this.game.sfx(tone ?? T("square", 520, 300, 0.07), { haptic: haptic ?? this.def.feel ?? "light" }); this.lastHit = this.t; }
    sfx(tone) { this.game.sfx(tone); }
    buzz(h) { this.game.haptic(h ?? this.def.feel ?? "tick"); }
    shake(a = 4, sec = 0.12) { this.scene.shake(a, sec, { haptic: false }); }
    freeze(sec = 0.05) { this.stall = Math.max(this.stall, sec); }
    flash(c = C.wht, sec = 0.1) { this.flashC = c; this.flashT = this.flashMax = sec; }

    boom(x, y, cols = [C.yel, C.pink, C.cyan], n = 10, o = {}) {
        const r = this.game.fxRng;
        for (let i = 0; i < n; i++) {
            const a = r.range(o.a0 ?? 0, o.a1 ?? TAU), v = r.range(o.v0 ?? 60, o.v1 ?? 240);
            this.fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.g ?? 320, life: 0, max: r.range(0.3, o.life ?? 0.65), f: o.f ?? r.pick([0, 3, 5, 0]), c: cols[i % cols.length], s: r.range(o.s0 ?? 10, o.s1 ?? 22), rot: r.range(0, 6), vr: r.range(-9, 9) });
        }
    }
    drops(x, y, col, n = 8, o = {}) { this.boom(x, y, [col], n, { f: 2, ...o }); }
    ring(x, y, col = C.wht, r = 60) { this.rings.push({ x, y, col, r, t: 0 }); }

    readInput(dt) {
        const inp = this.game.input, ptr = inp.pointer, def = this.def, ox = this.x, oy = this.y, wasDown = this.down;
        // Raw pointer.
        const lx = ptr.x - this.cx, ly = ptr.y - this.cy;
        const moved = this.ptrInit && (Math.abs(lx - this.lpx) > 0.5 || Math.abs(ly - this.lpy) > 0.5);
        this.ptrInit = true; this.lpx = lx; this.lpy = ly;
        const pdown = ptr.down;
        if (pdown || moved) this.keyboard = false;
        // Keyboard: arrows steer a glove (or swipe, in games that are all direction), Space is the finger.
        const q = (a) => inp.down(a), e = (a) => inp.pressed(a);
        const K = [["kl", -1, 0, "left"], ["kr", 1, 0, "right"], ["ku", 0, -1, "up"], ["kd", 0, 1, "down"]];
        let keyDir = null, ax = 0, ay = 0;
        for (const [a, x, y, n] of K) { if (q(a)) { ax += x; ay += y; this.keyboard = true; } if (e(a)) keyDir = n; }
        if (q("kgo")) this.keyboard = true;
        this.swipe = null; this.flick = null;
        if (this.keyboard && (def.keys ?? "cursor") === "swipe" && keyDir) {
            const [vx, vy] = DIRS[keyDir], h = def.home ?? [0, 0];
            this.swipe = keyDir; this.flick = { x0: h[0] - vx * 50, y0: h[1] - vy * 50, x1: h[0] + vx * 50, y1: h[1] + vy * 50, dx: vx * 100, dy: vy * 100 };
        } else if (this.keyboard && (def.keys ?? "cursor") === "cursor") {
            const snaps = keyDir && def.snap ? def.snap(this) : null;
            let hopped = false;
            if (snaps?.length) {
                const [vx, vy] = DIRS[keyDir]; let best = null, bs = 1e9;
                for (const [x, y] of snaps) {
                    const f = (x - this.kx) * vx + (y - this.ky) * vy, side = Math.abs((x - this.kx) * vy) + Math.abs((y - this.ky) * vx);
                    if (f > 4 && f + side * 0.6 < bs) { bs = f + side * 0.6; best = [x, y]; }
                }
                if (best) { this.kx = best[0]; this.ky = best[1]; hopped = true; }
            }
            if (!hopped && (ax || ay)) {
                const v = (def.keySpeed ?? 300) * dt / Math.hypot(ax, ay);
                this.kx = clamp(this.kx + ax * v, this.L + 6, this.R - 6); this.ky = clamp(this.ky + ay * v, this.T + 6, this.B - 6);
            }
        }
        const grip = this.keyboard && def.grip && (ax || ay) && (def.keys ?? "cursor") === "cursor";
        const kdown = this.keyboard && (q("kgo") || grip);
        if (pdown || moved) this.touched = true;   // Until the pointer actually does something, stay at the game's home spot.
        if (this.keyboard) { this.x = this.kx; this.y = this.ky; } else if (this.touched) { this.x = lx; this.y = ly; this.kx = lx; this.ky = ly; }
        this.down = !this.over && (this.keyboard ? kdown : pdown);
        this.pressed = this.down && !wasDown;
        this.released = !this.down && wasDown;
        this.dx = this.x - ox; this.dy = this.y - oy;
        if (this.pressed) { this.dx = 0; this.dy = 0; }
        this.rub = this.down ? Math.hypot(this.dx, this.dy) : 0;
        // Swipes fire as soon as they are long enough, and re-arm on reversal, so scrubbing and digging need no lifting.
        if (this.pressed) this.ges = { x: this.x, y: this.y, fired: false, mx: this.x, my: this.y };
        if (!this.down) this.ges = null;
        if (this.ges && !this.over) {
            const g = this.ges, ddx = this.x - g.x, ddy = this.y - g.y;
            if (!g.fired && Math.hypot(ddx, ddy) >= (def.swipeLen ?? 34)) {
                g.fired = true; g.vx = ddx; g.vy = ddy;
                this.swipe = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? "right" : "left") : (ddy > 0 ? "down" : "up");
                this.flick = { x0: g.x, y0: g.y, x1: this.x, y1: this.y, dx: ddx, dy: ddy };
                g.mx = this.x; g.my = this.y;
            } else if (g.fired) {
                const along = (this.x - g.mx) * g.vx + (this.y - g.my) * g.vy;
                if (along >= 0) { g.mx = this.x; g.my = this.y; }
                else if (Math.hypot(this.x - g.mx, this.y - g.my) > 18) { g.x = this.x; g.y = this.y; g.fired = false; }
            }
        }
        // Two fingers. With one pointer the second finger mirrors it across the pivot, so mouse and keys can pinch too.
        const raw = inp.touches.filter(() => !this.over);
        this.two = raw.length >= 2 && !this.keyboard;
        if (this.two) {
            this.f1 = { x: raw[0].x - this.cx, y: raw[0].y - this.cy }; this.f2 = { x: raw[1].x - this.cx, y: raw[1].y - this.cy };
        } else if (this.down) {
            const [px, py] = this.pivot;
            this.f1 = { x: this.x, y: this.y }; this.f2 = { x: px * 2 - this.x, y: py * 2 - this.y };
        } else { this.f1 = this.f2 = null; }
        if (this.f1) { this.spread = dist(this.f1.x, this.f1.y, this.f2.x, this.f2.y); this.ang = Math.atan2(this.f2.y - this.f1.y, this.f2.x - this.f1.x); }
    }
    update(dt) {
        this.rt += dt;
        this.readInput(dt);
        if (this.stall > 0) { this.stall -= dt; this.tickFx(dt); return; }
        const gt = dt * this.speed;
        if (!this.over) {
            this.t += gt;
            if (this.t >= this.dur) { if (this.def.survive) this.win(); else this.lose(); }
        } else this.overT += dt;
        this.def.tick?.(this, gt);
        this.tickFx(dt);
    }
    tickFx(dt) {
        for (let i = this.fx.length - 1; i >= 0; i--) {
            const p = this.fx[i];
            p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt;
            if (p.life >= p.max) { this.fx[i] = this.fx[this.fx.length - 1]; this.fx.pop(); }
        }
        for (let i = this.rings.length - 1; i >= 0; i--) { this.rings[i].t += dt; if (this.rings[i].t > 0.35) this.rings.splice(i, 1); }
        if (this.flashT > 0) this.flashT -= dt;
    }
    // ------------------------------------------------ drawing helpers
    spr(name, x, y, o = {}) {
        const key = this.def.id + "." + name, k = o.k ?? 1, a = this.def.art[name];
        this.d.push();
        this.d.translate(x, y);
        if (o.rot) this.d.rotate(o.rot);
        if (o.sx !== undefined || o.sy !== undefined) this.d.scale(o.sx ?? 1, o.sy ?? 1);
        this.d.sprite(key, { width: (a[0] + PAD * 2) * k, height: (a[1] + PAD * 2) * k, frame: o.f ?? 0, flipX: o.flip, color: o.color, opacity: o.op });
        this.d.pop();
    }
    shadow(x, y, rx, ry = rx * 0.28, op = 0.25) { this.d.rect(rx * 2, ry * 2, { x, y, radius: ry, color: INK, opacity: op }); }
    /** A chunky meter: the only "UI" a microgame may have. */
    meter(x, y, w, h, k, col = C.grn, mark) {
        const d = this.d, vert = h > w;
        d.rect(w + 8, h + 8, { x, y, color: INK, radius: 7 });
        d.rect(w, h, { x, y, color: C.paper, radius: 4 });
        const f = clamp(k);
        if (vert) d.rect(w - 4, Math.max(2, (h - 4) * f), { x, y: y + (h - 4) * (1 - f) / 2, color: col, radius: 3 });
        else d.rect(Math.max(2, (w - 4) * f), h - 4, { x: x - (w - 4) * (1 - f) / 2, y, color: col, radius: 3 });
        if (mark !== undefined) {
            if (vert) d.rect(w + 12, 4, { x, y: y + h / 2 - h * mark, color: INK });
            else d.rect(4, h + 12, { x: x - w / 2 + w * mark, y, color: INK });
        }
    }
    line(x0, y0, x1, y1, col, w = 4, ink = true) {
        if (ink) { this.d.line([x0, y0], [x1, y1], { color: INK, width: w + 5 }); this.d.circle((w + 5) / 2, { x: x0, y: y0, color: INK }); this.d.circle((w + 5) / 2, { x: x1, y: y1, color: INK }); }
        this.d.line([x0, y0], [x1, y1], { color: col, width: w });
        this.d.circle(w / 2, { x: x0, y: y0, color: col }); this.d.circle(w / 2, { x: x1, y: y1, color: col });
    }
    disc(x, y, r, col, op) { this.d.circle(r + 3, { x, y, color: INK, opacity: op }); this.d.circle(r, { x, y, color: col, opacity: op }); }
    draw(d) {
        const def = this.def;
        this.d = d;
        d.push();
        d.translate(this.cx, this.cy);
        const [c1, c2, pat, op] = def.bg ?? [C.cyan, C.sky, "dots"];
        d.rect(this.R - this.L + 4, this.B - this.T + 4, { color: c1 });
        if (pat && !this.nopat) {
            const size = Math.max(this.R - this.L, this.B - this.T) * 1.5, spin = pat === "rays" || pat === "rings" ? this.rt * 0.25 : 0, pan = pat === "rays" || pat === "rings" ? 0 : (this.rt * 14) % 8;
            d.sprite("pat_" + pat, { width: size * 1.3, height: size * 1.3, x: pan, y: pan, rot: spin, color: c2, opacity: op ?? 0.55 });
        }
        def.draw?.(this, d);
        for (const r of this.rings) {
            const k = r.t / 0.35;
            d.rect((r.r * (0.3 + k)) * 2, (r.r * (0.3 + k)) * 2, { x: r.x, y: r.y, radius: 999, color: r.col, outline: 5 * (1 - k) + 1, opacity: 1 - k });
        }
        for (const p of this.fx) {
            const k = 1 - p.life / p.max, s = p.s * (0.45 + 0.55 * k);
            d.sprite("fx", { x: p.x, y: p.y, width: s * 1.2, height: s * 1.2, frame: p.f, color: p.c, rot: p.rot });
        }
        if (this.flashT > 0) d.rect(this.R - this.L + 4, this.B - this.T + 4, { color: this.flashC, opacity: 0.8 * this.flashT / this.flashMax });
        if (this.keyboard && !this.over && (def.keys ?? "cursor") === "cursor") d.sprite("hand", { x: this.x + 10, y: this.y + 26, width: 42, height: 49, frame: this.down ? 1 : 0, rot: -0.15 });
        d.pop();
    }
}

/**
 * A scripted player for proofs and demos. Games describe intent in panel coordinates; this turns it into real input
 * events with human limits: a finger only moves so fast, and taps need a gap.
 */
export class Driver {
    constructor(game, o = {}) {
        this.game = game; this.mode = o.mode ?? "touch"; this.maxSpeed = o.maxSpeed ?? (this.mode === "mouse" ? 2600 : 1500); this.gap = o.gap ?? 0.085; this.dt = 1 / 60;
        this.x = 0; this.y = 0; this.isDown = false; this.q = []; this.since = 99; this.twoOn = false; this.m = null; this.t = 0; this.held = new Set(); this.want = false; this.mem = {};
    }
    get busy() { return this.q.length > 0; }
    get ready() { return !this.busy && this.since >= this.gap; }
    begin(m) { this.m = m; const inp = this.game.input; inp.pointerEvent("move", 99, m.cx + 900, m.cy); this.x = m.x; this.y = m.y; }
    // --- the verbs games use ---
    aim(x, y) { this.tx = x; this.ty = y; return this; }
    press(x, y) { if (x !== undefined) this.aim(x, y); this.want = true; return this; }
    release() { this.want = false; return this; }
    drag(x, y) { return this.press(x, y); }
    /** Move onto something and press it: a finger lands there, a mouse has to travel. */
    grab(x, y) {
        if (this.isDown) { this.release(); return this; }
        this.aim(x, y);
        if (this.mode === "touch") { this.x = x; this.y = y; this.want = true; } else if (this.near(x, y, 10)) this.want = true;
        return this;
    }
    near(x, y, r = 8) { return Math.hypot(this.x - x, this.y - y) < r; }
    tap(x, y) {
        if (!this.ready) return false;
        this.q.push(() => { this.aim(x, y); if (this.mode !== "keys") this.jump = this.mode === "touch"; return this.mode === "touch" || this.near(x, y, 7); }, () => { this.want = true; return true; }, () => true, () => { this.want = false; return true; }, () => true);
        return true;
    }
    swipe(x0, y0, x1, y1, frames = 7) {
        if (!this.ready) return false;
        const m = this.m, keyed = this.mode === "keys" && (m.def.keys ?? "cursor") === "swipe";
        if (keyed) {
            const dir = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? (x1 > x0 ? "ArrowRight" : "ArrowLeft") : (y1 > y0 ? "ArrowDown" : "ArrowUp");
            this.q.push(() => { this.game.input.codeDown(dir); return true; }, () => true, () => { this.game.input.codeUp(dir); return true; }, () => true);
            return true;
        }
        this.q.push(() => { this.aim(x0, y0); if (this.mode === "touch") this.jump = true; return this.mode === "touch" || this.near(x0, y0, 8); }, () => { this.want = true; return true; });
        for (let i = 1; i <= frames; i++) { const k = i / frames; this.q.push(() => { this.tx = x0 + (x1 - x0) * k; this.ty = y0 + (y1 - y0) * k; this.fast = true; return true; }); }
        this.q.push(() => { this.want = false; this.fast = false; return true; }, () => true);
        return true;
    }
    /** Two real fingers (touch only); other modes fall back to one finger mirrored by the game. */
    two(ax, ay, bx, by) {
        if (this.mode === "touch") {
            const m = this.m, inp = this.game.input;
            if (!this.twoOn) { inp.pointerEvent("down", 5, m.cx + ax, m.cy + ay); inp.pointerEvent("down", 6, m.cx + bx, m.cy + by); this.twoOn = true; }
            else { inp.pointerEvent("move", 5, m.cx + ax, m.cy + ay); inp.pointerEvent("move", 6, m.cx + bx, m.cy + by); }
            this.lastTwo = [ax, ay, bx, by];
        } else this.drag(ax, ay);
        return this;
    }
    lift() {
        if (this.twoOn) { const m = this.m, l = this.lastTwo, inp = this.game.input; inp.pointerEvent("up", 5, m.cx + l[0], m.cy + l[1]); inp.pointerEvent("up", 6, m.cx + l[2], m.cy + l[3]); this.twoOn = false; }
        else this.release();
        return this;
    }
    /** A left/right/up/down gesture for games that only care about direction. */
    dir(name, cx = 0, cy = 0) {
        const [vx, vy] = DIRS[name];
        return this.swipe(cx - vx * 45, cy - vy * 45, cx + vx * 45, cy + vy * 45);
    }
    // --- once per step ---
    step(m) {
        this.m = m; this.since += this.dt; this.t += this.dt;
        if (this.q.length) { while (this.q.length) { if (!this.q[0]()) break; this.q.shift(); break; } }
        else if (!m.over && m.def.bot) m.def.bot(m, this);
        this.flush(m);
    }
    flush(m) {
        const inp = this.game.input;
        if (this.tx !== undefined) {
            if (this.mode === "keys") {
                const dx = this.tx - m.kx, dy = this.ty - m.ky, set = (code, on) => { if (on && !this.held.has(code)) { inp.codeDown(code); this.held.add(code); } if (!on && this.held.has(code)) { inp.codeUp(code); this.held.delete(code); } };
                set("ArrowLeft", dx < -5); set("ArrowRight", dx > 5); set("ArrowUp", dy < -5); set("ArrowDown", dy > 5);
                this.x = m.kx; this.y = m.ky;
            } else {
                const dx = this.tx - this.x, dy = this.ty - this.y, l = Math.hypot(dx, dy), max = (this.fast ? 4000 : this.maxSpeed) * this.dt;
                if (this.jump && !this.isDown) { this.x = this.tx; this.y = this.ty; this.jump = false; }
                else if (l > 0.01) { const k = Math.min(1, max / l); this.x += dx * k; this.y += dy * k; }
            }
        }
        const vx = m.cx + this.x, vy = m.cy + this.y;
        if (this.mode === "keys") {
            if (this.want && !this.isDown) { inp.codeDown("Space"); this.isDown = true; this.since = 0; }
            if (!this.want && this.isDown) { inp.codeUp("Space"); this.isDown = false; }
            return;
        }
        if (this.want && !this.isDown) { inp.pointerEvent("down", 1, vx, vy); this.isDown = true; this.since = 0; }
        else if (!this.want && this.isDown) { inp.pointerEvent("up", 1, vx, vy); this.isDown = false; }
        else if (this.isDown) inp.pointerEvent("move", 1, vx, vy);
        else if (this.mode === "mouse") inp.pointerEvent("move", 99, vx, vy);
    }
    end() {
        const inp = this.game.input;
        if (this.isDown) { if (this.mode === "keys") inp.codeUp("Space"); else inp.pointerEvent("up", 1, 0, 0); this.isDown = false; }
        if (this.twoOn) this.lift();
        for (const c of this.held) inp.codeUp(c);
        this.held.clear(); this.q = []; this.want = false;
    }
}
