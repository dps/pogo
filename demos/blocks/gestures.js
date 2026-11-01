// Turning finger samples into commands. This is the hard part of a falling block game on a phone, so it has no
// dependencies and a bot fuzzes it with sloppy human strokes (tools/gesture-fuzz.mjs).
//
// The rules, each of which exists because of a real way to misplay:
//  - Horizontal drag is relative: wherever you touch, one cell of finger moves one cell of animal. The anchor moves
//    with each cell, so small jitter never moves anything and reversing is exactly one cell away.
//  - A tap is short and still. Anything that moved a piece is never a tap.
//  - A slow pull down is soft drop, row by row. It can't lock anything: pieces still get their lock delay.
//  - Only a fast, straight flick is a hard drop. Speed is measured over a short window, not the whole stroke, and
//    it has to cover real distance. A flick that follows a sideways drag needs the finger to have settled first, so
//    the little downward tail people leave when they finish dragging is harmless.
//  - A stroke belongs to the piece it began on. If that piece locks mid-stroke the next one can be steered, but it
//    can't be dropped until the finger comes up. That prevents every double drop. A touch that lands in the short
//    gap between pieces belongs to the next piece, so quick players never lose a stroke.

export const TUNE = {
    stepX: 19,          // view units of finger per cell
    stepY: 22,          // view units of finger per soft row
    slop: 7,            // movement that still counts as not moving
    tapTicks: 24,       // a tap lasts at most this long (0.4 s)
    tapSlop: 11,
    flickWindow: 5,     // ticks to measure a flick over (83 ms)
    flickDist: 38,      // view units within the window
    flickAngle: 0.5,    // sideways travel allowed, as a share of the downward travel
    settle: 7,          // ticks of no sideways motion before a flick is allowed after a drag
    upDist: 36,         // a flick up holds
};

class Finger {
    constructor(id, x, y, t, epoch, side) {
        this.id = id; this.sx = x; this.sy = y; this.t0 = t; this.epoch = epoch; this.side = side;
        this.ax = x; this.ay = y;
        this.moved = 0; this.rows = 0; this.mode = null; this.spent = false; this.lastSide = -99; this.far = false; this.dead = false;
        this.trail = [[t, x, y]];
    }
}

/**
 * Takes raw pointer samples, each stamped with a time in ticks of 1/60 s. Using every sample rather than the position
 * once a frame means a flick reads the same on a phone struggling at 20 fps as on a fast one.
 */
export class Gestures {
    /** emit(name, arg) receives "move" (dir), "soft", "drop", "hold" and "rotate" (dir). */
    constructor(emit, tune = {}) {
        this.emit = emit; this.tune = { ...TUNE, ...tune };
        this.fingers = new Map();
        this.queue = [];
        this.epoch = 0;     // bumped whenever a new piece arrives
        this.idle = false;  // true between pieces: a touch landing now belongs to the piece that's coming
        this.width = 360;
        this.claim = null;  // (x, y) => true when the HUD owns this touch
    }

    /** Scale the drag to the screen. A cell of finger should feel like a cell of board, within reason. */
    scale(cell) { const u = Math.max(0.8, Math.min(1.1, cell / 22)); this.tune.stepX = TUNE.stepX * u; this.tune.stepY = TUNE.stepY * u; }

    newPiece() { this.epoch++; }

    /** Record a sample. Nothing happens until update(), so commands land inside a fixed step. */
    push(kind, id, x, y, t) { this.queue.push([kind, id, x, y, t]); }

    /** Forget everything, for pauses and the end of a match. */
    clear() { this.queue.length = 0; this.fingers.clear(); }

    update() {
        for (const [kind, id, x, y, t] of this.queue) {
            if (kind === "down") this.down(id, x, y, t);
            else if (kind === "move") { const f = this.fingers.get(id); if (f && !f.dead) this.track(f, x, y, t); }
            else this.up(id, x, y, t);
        }
        this.queue.length = 0;
    }

    down(id, x, y, t) {
        if (this.claim?.(x, y)) { const c = new Finger(id, x, y, t, this.epoch, 0); c.dead = true; this.fingers.set(id, c); return; }
        const second = [...this.fingers.values()].some((o) => !o.dead && !o.spent);
        const f = new Finger(id, x, y, t, this.epoch + (this.idle ? 1 : 0), x < this.width * 0.33 ? -1 : 1);
        this.fingers.set(id, f);
        // One thumb steering, the other turns.
        if (second) { f.spent = true; f.dead = true; this.emit("rotate", 1); }
    }

    up(id, x, y, t) {
        const f = this.fingers.get(id);
        if (!f) return;
        this.fingers.delete(id);
        if (f.dead) return;
        this.track(f, x, y, t);
        if (!f.spent && !f.far && !f.moved && !f.rows && t - f.t0 <= this.tune.tapTicks) this.emit("rotate", f.side);
    }

    track(f, x, y, t) {
        const T = this.tune;
        f.trail.push([t, x, y]);
        while (f.trail.length > 2 && t - f.trail[1][0] >= T.flickWindow) f.trail.shift();
        if (Math.hypot(x - f.sx, y - f.sy) > T.tapSlop) f.far = true;
        if (f.spent) return;
        const dx = x - f.ax, dy = y - f.ay, same = f.epoch === this.epoch && !this.idle;
        if (!f.mode) {
            if (Math.hypot(x - f.sx, y - f.sy) < T.slop) return;
            f.mode = Math.abs(x - f.sx) >= Math.abs(y - f.sy) * 0.8 ? "side" : "down";
        }
        // Sideways always works, in any mode, so steering during a soft drop is possible.
        if (Math.abs(dx) >= T.stepX * (f.mode === "down" && !f.moved ? 1.4 : 1)) {
            const dir = dx > 0 ? 1 : -1, n = Math.floor(Math.abs(dx) / T.stepX);
            for (let i = 0; i < n; i++) this.emit("move", dir);
            f.ax += dir * n * T.stepX; f.moved += n; f.lastSide = t;
            f.ay = Math.max(f.ay, y - T.stepY * 0.5);   // sideways strokes drift: forgive the drift
        }
        const [t0, x0, y0] = f.trail[0], wx = x - x0, wy = y - y0, pace = T.flickDist / T.flickWindow, took = Math.max(1, t - t0);
        const settled = !f.moved || t - f.lastSide >= T.settle;
        if (same && settled) {
            if (wy >= T.flickDist && wy / took >= pace && Math.abs(wx) <= wy * T.flickAngle) { f.spent = true; this.emit("drop"); return; }
            if (-wy >= T.upDist && -wy / took >= pace && Math.abs(wx) <= -wy * T.flickAngle) { f.spent = true; this.emit("hold"); return; }
        }
        // A slow pull down follows the finger. It stops at a new piece, until the finger is lifted.
        if (dy >= T.stepY) {
            const n = Math.floor(dy / T.stepY);
            f.ay += n * T.stepY;
            if (same && settled) { f.rows += n; for (let i = 0; i < n; i++) this.emit("soft"); }
        } else if (dy < -T.stepY) f.ay = y + T.stepY;
    }
}
