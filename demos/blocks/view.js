// Draws one bed: the stack, the falling animal, the ghost, and everything that makes a stack of animals feel alive.
// One batched quad per cell, so a full duel is under ten draw calls.
import { BOX, CELLS, EGG, H, RIGHT, DOWN, LEFT, UP, SHEEP, TOP, W, isHead, kindOf, maskOf, uidOf } from "./engine.js";
import { COATS, FACE_SCALE, MOODS, TILE_SCALE } from "./art.js";

/** Per rotation: [x, y, mask, head] for each cell of a piece. Head is the top cell, rightmost. */
const SHAPES = CELLS.map((rots) => rots.map((cs) => {
    const has = (x, y) => cs.some((c) => c[0] === x && c[1] === y);
    let hx = -1, hy = 99;
    for (const [x, y] of cs) if (y < hy || (y === hy && x > hx)) { hx = x; hy = y; }
    return cs.map(([x, y]) => [x, y, (has(x + 1, y) ? RIGHT : 0) | (has(x, y + 1) ? DOWN : 0) | (has(x - 1, y) ? LEFT : 0) | (has(x, y - 1) ? UP : 0), x === hx && y === hy]);
}));
export const pieceShape = (p, r) => SHAPES[p][r];
const smoothstep = (t) => t * t * (3 - 2 * t);
export const faceFrame = (kind, mood) => kind * 5 + mood;

/** A whole animal for the hold and next boxes, centred on x, y. */
export function drawMini(tiles, faces, p, x, y, c, mood, tint = 1, alpha = 1) {
    const shape = SHAPES[p][0];
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const [a, b] of shape) { x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    const ox = x - (x0 + x1 + 1) * c / 2, oy = y - (y0 + y1 + 1) * c / 2, s = c * TILE_SCALE;
    for (const [a, b, m] of shape) tiles(ox + (a + 0.5) * c, oy + (b + 0.5) * c, s, s, 0, p * 16 + m, tint, tint, tint, alpha);
    for (const [a, b, , head] of shape) if (head) faces(ox + (a + 0.5) * c, oy + (b + 0.5) * c, c * FACE_SCALE, c * FACE_SCALE, 0, faceFrame(p, mood), tint, tint, tint, alpha);
}

export class FieldView {
    constructor(field, o = {}) {
        this.f = field;
        this.compact = !!o.compact;
        this.x = 0; this.y = 0; this.c = 20;
        this.showGhost = true;
        this.moods = new Map();     // uid -> { mood, t }
        this.squash = new Map();    // uid -> time since landing
        this.colWob = new Float32Array(W);
        this.rowDrop = new Float32Array(H);
        this.rise = 0;
        this.px = 0; this.py = 0; this.rotT = 1; this.rotDir = 0; this.stretch = 0;
        this.bump = 0;              // x wobble when the piece hits a wall
        this.clearT = 0;
        this.t = 0;
        this.wake = 0;              // everyone awake until this runs out
        this.danger = 0;
        this.trails = [];
        this.lastUid = -1;
    }

    place(x, y, c) { this.x = x; this.y = y; this.c = c; }
    cellX(x) { return this.x + (x + 0.5) * this.c; }
    cellY(y) { return this.y + (y - TOP + 0.5) * this.c; }
    get width() { return this.c * W; }
    get height() { return this.c * (H - TOP); }

    /** Feed an event from the field. */
    onEvent(e) {
        if (e.t === "lock") {
            this.moods.set(e.uid, { mood: MOODS.wince, t: 0.5 });
            this.squash.set(e.uid, 0);
            const cols = new Set(e.cells.map((c) => c[0]));
            const amp = Math.min(1, 0.25 + e.dist * 0.07);
            for (const x of cols) this.colWob[x] = Math.max(this.colWob[x], amp);
            if (e.hard) {
                const c = e.cells;
                this.trails.push({ cells: c.map((q) => [q[0], q[1]]), dist: e.dist, t: 0, p: e.p });
            }
        } else if (e.t === "rotate") {
            if (!e.still) { this.rotT = 0; this.rotDir = e.dir; } else this.bump = 0.6;
            this.stretch = 0.14;
        } else if (e.t === "stuck") { this.stretch = -0.1; }
        else if (e.t === "spawn") { this.stretch = 0.25; this.rotT = 1; this.snap = true; }
        else if (e.t === "clear") { this.clearT = 0; this.wake = Math.max(this.wake, 0.5); }
        else if (e.t === "collapse") {
            // Whatever sat above a cleared row now lives lower down: start it where it was, so it falls into place.
            this.rowDrop.fill(0);
            for (let y = 0; y < H; y++) {
                if (e.rows.includes(y)) continue;
                let below = 0;
                for (const r of e.rows) if (y < r) below++;
                if (below) this.rowDrop[y + below] = -below;
            }
            this.wobAll(0.5);
        } else if (e.t === "landed") { this.rise = e.n; this.wake = Math.max(this.wake, 1); this.wobAll(1); }
    }

    wobAll(a) { for (let x = 0; x < W; x++) this.colWob[x] = Math.max(this.colWob[x], a); }

    step(dt) {
        this.t += dt;
        this.rotT = Math.min(1, this.rotT + dt / 0.08);
        this.clearT += dt;
        this.stretch *= 0.8;
        this.bump *= 0.75;
        if (this.wake > 0) this.wake -= dt;
        for (let x = 0; x < W; x++) this.colWob[x] *= 0.88;
        for (let y = 0; y < H; y++) { this.rowDrop[y] = Math.min(0, this.rowDrop[y] + dt * 14); }
        if (this.rise > 0) this.rise = Math.max(0, this.rise - dt * 12);
        for (const [k, v] of this.moods) { v.t -= dt; if (v.t <= 0) { if (v.mood === MOODS.wince) { v.mood = MOODS.grump; v.t = 0.7; } else this.moods.delete(k); } }
        for (const [k, v] of this.squash) { const n = v + dt; if (n > 0.4) this.squash.delete(k); else this.squash.set(k, n); }
        for (let i = this.trails.length - 1; i >= 0; i--) { this.trails[i].t += dt; if (this.trails[i].t > 0.22) this.trails.splice(i, 1); }
        const f = this.f, a = f.active;
        if (a) {
            if (a.uid !== this.lastUid || this.snap) { this.px = a.x; this.py = a.y; this.lastUid = a.uid; this.snap = false; }
            this.px += (a.x - this.px) * 0.62; this.py += (a.y - this.py) * 0.7;
            if (Math.abs(a.x - this.px) < 0.02) this.px = a.x;
            if (Math.abs(a.y - this.py) < 0.02) this.py = a.y;
        }
        this.danger += ((f.stackHeight() >= 15 ? 1 : 0) - this.danger) * 0.1;
    }

    /** The mood of a cell's face. */
    moodOf(kind, uid, y) {
        if (kind >= SHEEP) return this.wake > 0.4 ? MOODS.shock : MOODS.sleep;
        const m = this.moods.get(uid);
        if (m) return m.mood;
        if (this.wake > 0) return MOODS.shock;
        if (y < TOP + 4) return MOODS.shock;     // the ones nearly out of bed have noticed
        if (y < TOP + 8) return MOODS.grump;
        return MOODS.sleep;
    }

    /** Stack and falling piece. tiles, faces and fx come from d.quads. */
    draw(d, tiles, faces) {
        const f = this.f, g = f.grid, c = this.c, s = c * TILE_SCALE, fs = c * FACE_SCALE;
        const rows = f.clearing, clearing = rows ? new Set(rows) : null;
        const riseY = this.rise * c;
        const ct = Math.min(1, this.clearT / 0.3);
        // Under the stack, the ghost.
        const a = f.active;
        if (a && this.showGhost && !this.compact) {
            const gy = f.ghostY(), shape = SHAPES[a.p][a.r];
            if (gy > a.y) {
                const col = COATS[a.p].pop, pulse = 0.3 + 0.05 * Math.sin(this.t * 7);
                for (const [px, py] of shape) d.rect(c, c, { x: this.cellX(a.x + px), y: this.cellY(gy + py), color: col, opacity: pulse });
            }
        }
        // Locked cells. Faces are collected and drawn after, so they sit over their neighbours.
        for (let y = this.compact ? TOP : TOP - 2; y < H; y++) for (let x = 0; x < W; x++) {
            const v = g[x + y * W];
            if (!v) continue;
            const kind = kindOf(v) - 1, uid = uidOf(v), mask = maskOf(v);
            let px = this.cellX(x), py = this.cellY(y) + this.rowDrop[y] * c + riseY;
            let w = s, h = s, tint = 1;
            // Landing squash: bottom-heavy, and it ripples down the stack below.
            const sq = this.squash.get(uid);
            if (sq !== undefined) {
                const k = Math.sin(Math.min(1, sq / 0.3) * Math.PI) * (1 - sq / 0.4);
                h = s * (1 - 0.1 * k); w = s * (1 + 0.1 * k); py += c * 0.06 * k;
            }
            const wob = this.colWob[x];
            if (wob > 0.01) { const k = wob * Math.sin(this.t * 34 + y * 0.8) * 0.06 * Math.max(0, 1 - (H - y) / 30); py += k * c; }
            if (clearing?.has(y)) {
                // Everyone in a full row jumps up in alarm, then is flung away.
                const q = (x - 4.5) / 4.5, jump = Math.sin(ct * Math.PI) * c * 0.5;
                py -= jump; px += q * ct * ct * c * 0.8;
                // Shrinking, not fading: joined tiles overlap at the gutter, and transparency would show the seams.
                const grow = ct < 0.3 ? 1 + ct * 0.8 : 1.24 * Math.max(0, 1 - (ct - 0.3) / 0.7) ** 1.5;
                w *= grow; h *= grow;
                tint = 1 + Math.sin(ct * Math.PI) * 0.7;
            }
            tiles(px, py, w, h, 0, kind * 16 + mask, tint, tint, tint, 1);
        }
        if (!this.compact || c >= 9) for (let y = TOP - 2; y < H; y++) for (let x = 0; x < W; x++) {
            const v = g[x + y * W];
            if (!v || !isHead(v)) continue;
            const kind = kindOf(v) - 1;
            if (kind === EGG) continue;
            const uid = uidOf(v);
            let mood = this.moodOf(kind, uid, y);
            let py = this.cellY(y) + this.rowDrop[y] * c + riseY, px = this.cellX(x);
            let pop = 1;
            if (clearing?.has(y)) { mood = MOODS.shock; py -= Math.sin(ct * Math.PI) * c * 0.5; pop = ct < 0.3 ? 1 + ct * 0.8 : 1.24 * Math.max(0, 1 - (ct - 0.3) / 0.7) ** 1.5; }
            // Sleepers breathe. Each at its own pace, so the stack is never still.
            const breath = mood === MOODS.sleep ? Math.sin(this.t * 2.1 + uid * 1.7) * 0.03 : 0;
            const sq = this.squash.get(uid);
            let ww = fs * pop, hh = fs * (1 + breath) * pop;
            if (sq !== undefined) { const k = Math.sin(Math.min(1, sq / 0.3) * Math.PI) * (1 - sq / 0.4); ww = fs * pop * (1 + 0.12 * k); hh = fs * pop * (1 - 0.12 * k); py += c * 0.08 * k; }
            faces(px, py, ww, hh, 0, faceFrame(kind, mood));
        }
        // The falling animal.
        if (a && !f.dead && !(this.compact && a.y < TOP - 1)) {
            const shape = SHAPES[a.p][a.r], n = BOX[a.p], t = smoothstep(this.rotT), ang = (1 - t) * this.rotDir * -Math.PI / 2;
            const cs = Math.cos(ang), sn = Math.sin(ang), cx = this.cellX(this.px + (n - 1) / 2) + this.bump * Math.sin(this.t * 50) * c * 0.08, cy = this.cellY(this.py + (n - 1) / 2);
            const st = this.stretch, sx = 1 - st, sy = 1 + st;
            const lockGlow = f.grounded() ? Math.min(1, f.lockT / 30) : 0;
            const tint = 1 + lockGlow * lockGlow * 0.3 * (0.5 + 0.5 * Math.sin(this.t * 30));
            for (const [px, py, m] of shape) {
                const dx = (px - (n - 1) / 2) * c * sx, dy = (py - (n - 1) / 2) * c * sy;
                tiles(cx + dx * cs - dy * sn, cy + dx * sn + dy * cs, s * sx, s * sy, ang, a.p * 16 + m, tint, tint, tint, 1);
            }
            for (const [px, py, , head] of shape) {
                if (!head) continue;
                const dx = (px - (n - 1) / 2) * c * sx, dy = (py - (n - 1) / 2) * c * sy;
                const near = f.ghostY() - a.y;
                const mood = f.grounded() ? MOODS.wince : near <= 2 ? MOODS.shock : MOODS.grump;
                faces(cx + dx * cs - dy * sn, cy + dx * sn + dy * cs, fs, fs, 0, faceFrame(a.p, mood), 1, 1, 1, 1);
            }
        }
        // Speed lines behind a hard drop.
        for (const tr of this.trails) {
            const k = 1 - tr.t / 0.22, col = COATS[tr.p].pop;
            const seen = new Set();
            for (const [x, y] of tr.cells) {
                if (seen.has(x)) continue;
                seen.add(x);
                const low = Math.min(...tr.cells.filter((q) => q[0] === x).map((q) => q[1]));
                const len = Math.min(tr.dist, low - TOP + 2) * c;
                if (len <= 0) continue;
                d.rect(c * 0.8 * k, len, { x: this.cellX(x), y: this.cellY(low) - c / 2 - len / 2, color: col, opacity: 0.32 * k, radius: c * 0.3 });
            }
        }
    }
}

