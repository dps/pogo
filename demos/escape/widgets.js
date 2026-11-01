// The mechanisms. Each works on a 320 by 320 board. update() gets a pointer in board units; bot() returns the next gesture that solves it.
import { BIRD, SONG } from "./story.js";
export const SERIF = "Georgia, 'Times New Roman', serif", HAND = "'Bradley Hand', 'Segoe Print', 'Snell Roundhand', 'Comic Sans MS', cursive";
const INKC = "#2a2230", BR = "#e3bc6e", BRD = "#7c5a28", IV = "#efe4c9", DK = "#1a1420";
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapAng = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const inR = (p, x, y, w, h, pad = 8) => p.x >= x - pad && p.x <= x + w + pad && p.y >= y - pad && p.y <= y + h + pad;
const ease = (c, t, k, dt) => c + (t - c) * Math.min(1, k * dt);

class Widget {
    constructor(ui, def, saved) { this.ui = ui; this.def = def; this.s = saved ?? this.init(); this.solved = false; this.t = 0; this.msg = ""; }
    init() { return {}; }
    state() { return this.s; }
    done() { if (this.solved) return; this.solved = true; this.ui.onSolved(); }
    update() {} draw() {} bot() { return null; }
    /** A brass plaque button; returns true when tapped this step. */
    btn(p, x, y, w, h) { return p.tapped && inR(p, x, y, w, h, 10); }
    drawBtn(d, label, x, y, w, h, on = true) {
        d.rect(w, h + 3, { x: x + w / 2, y: y + h / 2 + 2, color: "#000", opacity: 0.4, radius: 6 });
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: on ? BR : "#6d5a3c", radius: 6 });
        d.rect(w - 6, h - 6, { x: x + w / 2, y: y + h / 2, color: on ? "#c99c4e" : "#5a4a30", radius: 4 });
        d.text(label, { x: x + w / 2, y: y + h / 2, size: 14, bold: true, color: "#2b1c0c", font: SERIF });
    }
}

// --- Number wheels ------------------------------------------------------------------------------
class Dials extends Widget {
    init() { return { v: this.def.wheels.map(() => 0) }; }
    constructor(ui, def, saved) {
        super(ui, def, saved);
        const n = def.wheels.length, g = def.grouping; this.w = Math.min(62, 270 / n);
        let x = 160 - (n * this.w + (g ? (g.length - 1) * 16 : 0)) / 2; this.xs = [];
        let gi = 0, cnt = 0;
        for (let i = 0; i < n; i++) { this.xs.push(x); x += this.w; if (g && ++cnt === g[gi]) { x += 16; gi++; cnt = 0; } }
        this.pos = this.s.v.map((v) => v); this.h = 150; this.y = 86; this.drag = -1; this.lit = 0;
    }
    update(dt, p) {
        const def = this.def, { w, h, y } = this;
        if (p.pressed) for (let i = 0; i < this.xs.length; i++) if (p.x >= this.xs[i] - 4 && p.x <= this.xs[i] + w + 4 && p.y > y - 40 && p.y < y + h + 40) { this.drag = i; this.dy = 0; this.moved = false; this.py = p.y; this.ty = p.y; }
        if (this.drag >= 0) {
            const i = this.drag, n = def.wheels[i].length;
            if (p.down) {
                const dy = p.y - this.py; this.py = p.y; if (Math.abs(p.y - this.ty) > 6) this.moved = true;
                const was = Math.round(this.pos[i]); this.pos[i] -= dy / 44; const now = Math.round(this.pos[i]);
                if (now !== was) { this.s.v[i] = ((now % n) + n) % n; this.ui.snd.notch(); }
            } else {
                if (!this.moved) { const dir = p.y < y + h / 2 ? -1 : 1; this.pos[i] = Math.round(this.pos[i]) + dir; this.ui.snd.notch(); }
                this.pos[i] = Math.round(this.pos[i]); this.s.v[i] = ((this.pos[i] % n) + n) % n; this.drag = -1; this.check();
            }
        }
        for (let i = 0; i < this.pos.length; i++) if (i !== this.drag) { const n = def.wheels[i].length; const tgt = Math.round(this.pos[i]); this.pos[i] = ease(this.pos[i], tgt, 18, dt); }
        if (def.heart) { this.hb = (this.hb ?? 0) + dt; const right = this.right(), rate = 1.1 - right * 0.12; if (this.hb > rate) { this.hb = 0; this.ui.snd.heart(0.3 + right * 0.17); this.pulse = 1; } this.pulse = Math.max(0, (this.pulse ?? 0) - dt * 3); }
    }
    right() { return this.def.wheels.reduce((n, wh, i) => n + (wh[this.s.v[i]] === this.def.answer[i] ? 1 : 0), 0); }
    check() { if (this.right() === this.def.answer.length) this.done(); }
    draw(d) {
        const { w, h, y, def } = this;
        d.rect(320 - 24, h + 40, { x: 160, y: y + h / 2, color: "#000", opacity: 0.34, radius: 12 });
        for (let i = 0; i < this.xs.length; i++) {
            const x = this.xs[i] + w / 2, str = def.wheels[i], n = str.length, cw = w - 8;
            d.rect(cw + 8, h + 10, { x, y: y + h / 2, color: BRD, radius: 7 });
            d.rect(cw + 3, h + 5, { x, y: y + h / 2, color: BR, radius: 6 });
            d.rect(cw, h, { x, y: y + h / 2, color: IV, radius: 4 });
            d.clip(this.ui.bx(x - cw / 2), this.ui.by(y), cw * this.ui.bs, h * this.ui.bs, () => {
                const f = this.pos[i], base = Math.round(f);
                for (let k = -2; k <= 2; k++) {
                    const off = k - (f - base), yy = y + h / 2 + off * 48, c = str[(((base + k) % n) + n) % n], fade = 1 - Math.min(1, Math.abs(off) * 0.34);
                    d.text(c, { x, y: yy, size: 36 - Math.abs(off) * 8, bold: true, color: INKC, opacity: fade, font: SERIF });
                    d.rect(cw - 8, 1, { x, y: yy + 24, color: "#8a7a5a", opacity: 0.6 });
                }
            });
            d.sprite("kit:shade", { x, y: y + h / 2, width: cw, height: h });
            d.line({ x: x - cw / 2 - 3, y: y + h / 2 - 26 }, { x: x + cw / 2 + 3, y: y + h / 2 - 26 }, { width: 1.5, color: "#7c2a26", opacity: 0.55 });
            d.line({ x: x - cw / 2 - 3, y: y + h / 2 + 26 }, { x: x + cw / 2 + 3, y: y + h / 2 + 26 }, { width: 1.5, color: "#7c2a26", opacity: 0.55 });
        }
        if (def.heart) d.circle(10 + (this.pulse ?? 0) * 4, { x: 160, y: 278, color: "#b03a3a", opacity: 0.3 + (this.pulse ?? 0) * 0.6 });
    }
    bot() {
        const { def } = this;
        for (let i = 0; i < def.wheels.length; i++) { const want = def.wheels[i].indexOf(def.answer[i]); if (this.s.v[i] !== want) { const x = this.xs[i] + this.w / 2; return { tap: [x, this.y + this.h - 20] }; } }
        return null;
    }
}

// --- Rotary lock ------------------------------------------------------------------------------------
class Combo extends Widget {
    init() { return { v: 0 }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.ang = -this.s.v / 20 * Math.PI * 2; this.drag = false; this.seq = []; this.dir = 0; this.cx = 160; this.cy = 142; this.R = 104; this.shake = 0; }
    update(dt, p) {
        const { cx, cy } = this; this.shake = Math.max(0, this.shake - dt * 3);
        if (p.pressed && Math.hypot(p.x - cx, p.y - cy) < this.R + 20) { this.drag = true; this.last = Math.atan2(p.y - cy, p.x - cx); }
        if (this.drag) {
            if (p.down) {
                const a = Math.atan2(p.y - cy, p.x - cx), da = wrapAng(a - this.last); this.last = a;
                const was = this.val(); this.ang += da; const now = this.val();
                if (now !== was) {
                    const dir = da > 0 ? 1 : -1;
                    if (this.dir && dir !== this.dir) { this.seq.push(was); if (this.seq.length > 3) this.seq.shift(); this.ui.snd.snap(); }
                    this.dir = dir; this.s.v = now; this.ui.snd.notch(0.8);
                }
            } else this.drag = false;
        }
        if (this.btn(p, 100, 268, 120, 40)) {
            const got = [...this.seq, this.val()].slice(-3), a = this.def.answer;
            if (got.length === 3 && got.every((v, i) => v === a[i])) { this.ui.snd.latch(); this.done(); }
            else { this.ui.snd.wrong(); this.shake = 1; this.seq = []; this.dir = 0; }
        }
    }
    val() { return (((Math.round(-this.ang / (Math.PI * 2) * 20)) % 20) + 20) % 20; }
    draw(d) {
        const { cx, cy, R } = this, sx = Math.sin(this.shake * 30) * this.shake * 5;
        d.circle(R + 16, { x: cx + sx, y: cy + 5, color: "#000", opacity: 0.4 });
        d.sprite("kit:dial", { x: cx + sx, y: cy, width: R * 2 + 24, height: R * 2 + 24, rot: this.ang });
        d.push(); d.translate(cx + sx, cy); d.rotate(this.ang);
        for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; d.text(i, { x: Math.sin(a) * (R - 16), y: -Math.cos(a) * (R - 16), size: 15, bold: true, color: INKC, font: SERIF, rot: a }); }
        d.pop();
        d.poly([{ x: cx - 9, y: cy - R - 22 }, { x: cx + 9, y: cy - R - 22 }, { x: cx, y: cy - R - 5 }], { color: "#b03a3a" });
        for (let i = 0; i < 3; i++) d.circle(6, { x: 270 + i * 0, y: 60 + i * 20, color: i < this.seq.length ? "#ffd27a" : "#3a2c1c" });
        this.drawBtn(d, "Try the latch", 100, 268, 120, 40);
    }
    bot() {
        const a = this.def.answer, stage = Math.min(this.seq.length, 2), cur = this.val(), dir = stage % 2 ? -1 : 1;
        if (cur !== a[stage]) return this.turn(dir);
        if (stage < 2) return this.turn(-dir);
        return { tap: [160, 288] };
    }
    turn(dir) { const a0 = -Math.PI / 2, a1 = a0 + dir * (Math.PI * 2 / 20) * 1.02, r = this.R - 30; return { drag: [this.cx + Math.cos(a0) * r, this.cy + Math.sin(a0) * r, this.cx + Math.cos(a1) * r, this.cy + Math.sin(a1) * r] }; }
}

// --- Sliding bolts ----------------------------------------------------------------------------------
const CELL = 44, GX = 28, GY = 44;
class Rush extends Widget {
    init() { return { b: this.def.bars.map((b) => [b[0], b[1]]) }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.drag = -1; this.vis = this.s.b.map((b) => [b[0], b[1]]); this.exit = 0; }
    len(i) { return this.def.bars[i][2]; } horiz(i) { return this.def.bars[i][3] === "h"; }
    grid(b, skip) { const g = new Int8Array(36).fill(-1); b.forEach((q, i) => { if (i === skip) return; for (let k = 0; k < this.len(i); k++) { const x = q[0] + (this.horiz(i) ? k : 0), y = q[1] + (this.horiz(i) ? 0 : k); if (x < 6 && y < 6) g[y * 6 + x] = i; } }); return g; }
    limits(i, b = this.s.b) {
        const g = this.grid(b, i), h = this.horiz(i), L = this.len(i), a = h ? b[i][0] : b[i][1], o = h ? b[i][1] : b[i][0], at = (k) => g[h ? o * 6 + k : k * 6 + o];
        let lo = a, hi = a; while (lo > 0 && at(lo - 1) < 0) lo--; while (hi + L < 6 && at(hi + L) < 0) hi++;
        return [lo, hi];
    }
    update(dt, p) {
        if (this.solving) { this.exit += dt * 5; this.vis[0][0] += dt * 10; if (this.exit > 1) this.done(); return; }
        const cx = (p.x - GX) / CELL, cy = (p.y - GY) / CELL;
        if (p.pressed) {
            let best = -1, bd = 1.2;
            for (let i = 0; i < this.s.b.length; i++) { const b = this.s.b[i], w = this.horiz(i) ? this.len(i) : 1, h = this.horiz(i) ? 1 : this.len(i), dx = Math.max(b[0] - cx, 0, cx - b[0] - w), dy = Math.max(b[1] - cy, 0, cy - b[1] - h), q = dx + dy; if (q < bd) { bd = q; best = i; if (q === 0) break; } }
            if (best >= 0) { this.drag = best; this.lim = this.limits(best); this.grab = this.horiz(best) ? cx - this.vis[best][0] : cy - this.vis[best][1]; }
        }
        if (this.drag >= 0) {
            const i = this.drag, h = this.horiz(i), ax = h ? 0 : 1;
            if (p.down) {
                const was = Math.round(this.vis[i][ax]), v = clamp((h ? cx : cy) - this.grab, this.lim[0], this.lim[1]);
                this.vis[i][ax] = v; if (Math.round(v) !== was) this.ui.snd.notch(0.6);
            } else {
                const r = Math.round(this.vis[i][ax]); this.s.b[i][ax] = r; this.vis[i][ax] = r; this.drag = -1; this.ui.snd.snap();
                if (this.s.b[0][0] + this.len(0) >= 6) { this.solving = true; this.ui.snd.latch(); }
            }
        }
    }
    draw(d) {
        d.rect(CELL * 6 + 18, CELL * 6 + 18, { x: GX + CELL * 3, y: GY + CELL * 3, color: "#000", opacity: 0.45, radius: 8 });
        for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) d.rect(CELL - 3, CELL - 3, { x: GX + x * CELL + CELL / 2, y: GY + y * CELL + CELL / 2, color: "#2a2018", opacity: 0.6, radius: 3 });
        const row = this.def.bars[0][1];
        d.rect(18, CELL + 4, { x: GX + CELL * 6 + 8, y: GY + row * CELL + CELL / 2, color: "#ffd27a", opacity: 0.6, radius: 3 });
        this.vis.forEach((b, i) => {
            const h = this.horiz(i), L = this.len(i), w = (h ? L : 1) * CELL - 6, ht = (h ? 1 : L) * CELL - 6, x = GX + b[0] * CELL + w / 2 + 3, y = GY + b[1] * CELL + ht / 2 + 3, main = i === 0;
            d.rect(w, ht, { x: x + 1, y: y + 3, color: "#000", opacity: 0.5, radius: 7 });
            d.rect(w, ht, { x, y, color: main ? "#a83a34" : (i % 2 ? "#a97a48" : "#b98c56"), radius: 7 });
            d.rect(w - 8, ht - 8, { x: x - 1, y: y - 1, color: main ? "#c9524a" : (i % 2 ? "#c19660" : "#d0a872"), radius: 5 });
            d.circle(5.5, { x, y, color: BR }); d.circle(3, { x, y, color: BRD });
            if (i === this.drag) d.rect(w + 2, ht + 2, { x, y, color: "#fff", opacity: 0.15, radius: 7 });
        });
    }
    bot() {
        if (this.solving || this.drag >= 0) return { wait: 5 };
        const k = (b) => b.map((q) => q.join(",")).join(";"), start = this.s.b.map((q) => [...q]), seen = new Map([[k(start), null]]), q = [start];
        let end = null;
        while (q.length) {
            const b = q.shift();
            if (b[0][0] + this.len(0) >= 6) { end = b; break; }
            for (let i = 0; i < b.length; i++) {
                const [lo, hi] = this.limits(i, b), ax = this.horiz(i) ? 0 : 1;
                for (let v = lo; v <= hi; v++) { if (v === b[i][ax]) continue; const n = b.map((x) => [...x]); n[i][ax] = v; const ks = k(n); if (!seen.has(ks)) { seen.set(ks, [b, i, v]); q.push(n); } }
            }
        }
        let cur = end, mv = null;
        while (seen.get(k(cur))) { const [pv, i, v] = seen.get(k(cur)); mv = [i, v, pv]; cur = pv; }
        const [i, v] = mv, bb = this.s.b[i], ax = this.horiz(i) ? 0 : 1, x0 = GX + (bb[0] + 0.5) * CELL, y0 = GY + (bb[1] + 0.5) * CELL, dlt = (v - bb[ax]) * CELL;
        return { drag: [x0, y0, x0 + (ax === 0 ? dlt : 0), y0 + (ax === 1 ? dlt : 0)] };
    }
    moves() { let n = 0; const q = [this.s.b.map((x) => [...x])], k = (b) => b.map((x) => x.join(",")).join(";"), seen = new Map([[k(q[0]), 0]]); while (q.length) { const b = q.shift(), dd = seen.get(k(b)); if (b[0][0] + this.len(0) >= 6) return dd; for (let i = 0; i < b.length; i++) { const [lo, hi] = this.limits(i, b), ax = this.horiz(i) ? 0 : 1; for (let v = lo; v <= hi; v++) { if (v === b[i][ax]) continue; const m = b.map((x) => [...x]); m[i][ax] = v; const ks = k(m); if (!seen.has(ks)) { seen.set(ks, dd + 1); q.push(m); } } } } return -1; }
}

// --- Toy railway ------------------------------------------------------------------------------------
const ST = { H: [64, 236, "Home"], B: [64, 80, "Bridge"], M: [256, 80, "Mill"], S: [256, 236, "Sea"] };
class Track extends Widget {
    init() { return { sw: [0, 0, 0] }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.run = null; this.tx = ST.H[0]; this.ty = ST.H[1]; this.msg = ""; }
    next(n) { const s = this.s.sw; return n === "H" ? (s[0] ? "B" : "M") : n === "B" ? (s[1] ? "M" : "S") : n === "M" ? (s[2] ? "S" : "H") : "H"; }
    update(dt, p) {
        if (this.run) {
            const r = this.run; r.t += dt * 1.1;
            const a = ST[r.path[r.i]], b = ST[r.path[r.i + 1]], t = Math.min(1, r.t);
            this.tx = a[0] + (b[0] - a[0]) * t; this.ty = a[1] + (b[1] - a[1]) * t; this.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
            if (this.t % 0.2 < dt) this.ui.snd.clack(1);
            if (r.t >= 1) { r.t = 0; r.i++; this.ui.snd.notch(0.7); if (r.i >= r.path.length - 1) { const ok = r.path.join("") === "HBMSH"; this.run = null; if (ok) { this.ui.snd.whistle(); this.done(); } else { this.ui.snd.wrong(); this.msg = "That's not the way Daddy goes."; } } }
            this.t += dt; return;
        }
        for (let i = 0; i < 3; i++) { const q = this.swPos(i); if (p.tapped && Math.hypot(p.x - q[0], p.y - q[1]) < 42) { this.s.sw[i] ^= 1; this.ui.snd.snap(); this.msg = ""; } }
        if (this.btn(p, 118, 138, 84, 44)) { const path = ["H"]; let n = "H"; for (let k = 0; k < 6; k++) { n = this.next(n); path.push(n); if (n === "H") break; } this.run = { path, i: 0, t: 0 }; this.msg = ""; this.ui.snd.wind(); }
    }
    swPos(i) { return [[106, 206], [106, 112], [214, 112]][i]; }
    rail(d, a, b, on) {
        const A = { x: a[0], y: a[1] }, Bb = { x: b[0], y: b[1] }, L = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / L * 5, ny = (b[0] - a[0]) / L * 5;
        for (let t = 8; t < L; t += 13) { const x = a[0] + (b[0] - a[0]) * t / L, y = a[1] + (b[1] - a[1]) * t / L; d.line({ x: x - nx * 1.6, y: y - ny * 1.6 }, { x: x + nx * 1.6, y: y + ny * 1.6 }, { width: 3, color: "#5a3a22", opacity: on ? 1 : 0.4 }); }
        d.line({ x: A.x + nx, y: A.y + ny }, { x: Bb.x + nx, y: Bb.y + ny }, { width: 1.8, color: on ? "#d8dfe6" : "#7a8088", opacity: on ? 1 : 0.5 });
        d.line({ x: A.x - nx, y: A.y - ny }, { x: Bb.x - nx, y: Bb.y - ny }, { width: 1.8, color: on ? "#d8dfe6" : "#7a8088", opacity: on ? 1 : 0.5 });
    }
    draw(d) {
        const E = [["H", "B"], ["H", "M"], ["B", "M"], ["B", "S"], ["M", "S"], ["S", "H"]], act = new Set(); let n = "H";
        for (let k = 0; k < 5; k++) { const m = this.next(n); act.add(n + m); act.add(m + n); n = m; if (n === "H") break; }
        for (const [a, b] of E) this.rail(d, ST[a], ST[b], act.has(a + b));
        for (const k in ST) { const [x, y, nm] = ST[k]; d.rect(70, 34, { x, y, color: "#000", opacity: 0.3, radius: 5 }); d.rect(66, 30, { x, y, color: { H: "#b4563e", B: "#6a7a8c", M: "#c19660", S: "#3f7f96" }[k], radius: 5 }); d.text(nm, { x, y, size: 15, bold: true, color: "#fff5de", font: SERIF }); }
        for (let i = 0; i < 3; i++) { const [x, y] = this.swPos(i), s = this.s.sw[i], a = [[-1.57, 0], [0, 0.78], [1.57, 2.36]][i]; d.circle(17, { x, y, color: "#000", opacity: 0.4 }); d.circle(15, { x, y, color: BR }); d.circle(11, { x, y, color: "#a97a30" }); d.push(); d.translate(x, y); d.rotate(s ? [-1.57, 0, 1.57][i] : [-0.6, 0.78, 2.36][i]); d.rect(22, 5, { x: 8, y: 0, color: "#b03a3a", radius: 2 }); d.pop(); }
        this.drawBtn(d, "Go", 118, 138, 84, 44, !this.run);
        d.push(); d.translate(this.tx, this.ty - (this.run ? 0 : 26)); d.rotate(this.ang ?? 0); d.rect(36, 18, { color: "#7c2a26", radius: 4 }); d.rect(14, 19, { x: -9, color: "#a13a3a", radius: 3 }); d.circle(5, { x: 14, color: BR }); d.pop();
        if (this.msg) d.text(this.msg, { x: 160, y: 288, size: 15, color: "#fff5de", font: SERIF });
    }
    bot() {
        if (this.run) return { wait: 10 };
        const want = [1, 1, 1];
        for (let i = 0; i < 3; i++) if (this.s.sw[i] !== want[i]) { const q = this.swPos(i); return { tap: q }; }
        return { tap: [160, 160] };
    }
}

// --- Porter's balance ---------------------------------------------------------------------------------
const BAGS = [{ id: "hat", n: "Hat box", kg: 2, w: 72, h: 52, c: "#c7906a" }, { id: "blue", n: "Blue case", kg: 5, w: 68, h: 40, c: "#41688c" }, { id: "carpet", n: "Carpet bag", kg: 7, w: 70, h: 42, c: "#8a3f54" }, { id: "trunk", n: "Trunk", kg: 9, w: 56, h: 36, c: "#6b4a2a" }];
const RACK = [[62, 280], [128, 280], [194, 280], [260, 280]];
class Scale extends Widget {
    init() { return { at: { hat: "h0", blue: "h1", carpet: "h2", trunk: "h3" } }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.tilt = 0; this.vis = {}; for (const b of BAGS) { const q = this.spot(this.s.at[b.id], 0); this.vis[b.id] = [q[0], q[1]]; } this.drag = null; }
    spot(k, tilt = this.tilt) { if (k[0] === "h") return [50 + +k[1] * 74, 188]; if (k === "L") return [80, 128 + tilt * 22]; if (k === "R") return [240, 128 - tilt * 22]; return RACK[+k[1]]; }
    load(side) { return BAGS.reduce((n, b) => n + (this.s.at[b.id] === side ? b.kg : 0), 0); }
    update(dt, p) {
        const l = this.load("L"), r = this.load("R"), tt = !l && !r ? 0 : clamp((l - r) * 0.34, -1, 1);
        if (Math.sign(tt) !== Math.sign(this.tgt ?? 0)) this.ui.snd.thunk();
        this.tgt = tt; this.tilt = ease(this.tilt, tt, 5, dt);
        if (p.pressed) { let best = null, bd = 60; for (const b of BAGS) { const v = this.vis[b.id], q = Math.hypot(p.x - v[0], p.y - v[1]); if (q < bd) { bd = q; best = b.id; } } if (best) { this.drag = best; this.ui.snd.tapSoft(); } }
        for (const b of BAGS) {
            const v = this.vis[b.id];
            if (this.drag === b.id) { if (p.down) { v[0] = p.x; v[1] = p.y - 16; } else { let tgt = null, bd = 56; for (const k of ["L", "R", "r0", "r1", "r2", "r3"]) { const q = this.spot(k), dd = Math.hypot(v[0] - q[0], v[1] - q[1]); if (dd < bd) { bd = dd; tgt = k; } } if (tgt && (tgt === "L" || tgt === "R" || !BAGS.some((o) => o !== b && this.s.at[o.id] === tgt))) { const occ = BAGS.find((o) => o !== b && this.s.at[o.id] === tgt); if (occ && (tgt === "L" || tgt === "R")) this.s.at[occ.id] = this.home(occ.id); this.s.at[b.id] = tgt; this.ui.snd.thunk(); } else this.s.at[b.id] = this.home(b.id); this.drag = null; this.check(); } }
            else { const q = this.spot(this.s.at[b.id]); v[0] = ease(v[0], q[0], 14, dt); v[1] = ease(v[1], q[1], 14, dt); }
        }
    }
    home(id) { return `h${BAGS.findIndex((b) => b.id === id)}`; }
    check() { const a = this.s.at; if (a.trunk === "r0" && a.carpet === "r1" && a.blue === "r2" && a.hat === "r3") { this.ui.snd.solved(); this.done(); } else if (["r0", "r1", "r2", "r3"].every((k) => BAGS.some((b) => a[b.id] === k))) { this.ui.snd.wrong(); this.msg = "Not by weight."; } else this.msg = ""; }
    draw(d) {
        const t = this.tilt, ly = 74 + t * 22, ry = 74 - t * 22;
        d.rect(10, 80, { x: 160, y: 104, color: BRD }); d.rect(70, 8, { x: 160, y: 148, color: BRD, radius: 3 }); d.line({ x: 72, y: ly }, { x: 248, y: ry }, { width: 7, color: BR }); d.circle(9, { x: 160, y: 74, color: BR }); d.poly([{ x: 152, y: 44 }, { x: 168, y: 44 }, { x: 160, y: 66 }], { color: "#b03a3a" });
        for (const [x, y] of [[80, ly], [240, ry]]) { d.line({ x, y }, { x: x - 36, y: y + 72 }, { width: 1.5, color: "#c9b48a" }); d.line({ x, y }, { x: x + 36, y: y + 72 }, { width: 1.5, color: "#c9b48a" }); d.rect(84, 6, { x, y: y + 74, color: BR, radius: 3 }); }
        ["Lowest", "", "", "Top"].forEach((l, i) => { const [x, y] = RACK[i]; d.rect(62, 50, { x, y, color: "#000", opacity: 0.3, radius: 4 }); d.rect(62, 4, { x, y: y + 24, color: BR }); d.text(l || (i + 1), { x, y: y + 34, size: 12, color: "#efe0bc", font: SERIF }); });
        for (const b of BAGS) { const v = this.vis[b.id], w = b.w, h = b.h; d.rect(w, h, { x: v[0], y: v[1] + 2, color: "#000", opacity: 0.35, radius: 6 }); d.rect(w, h, { x: v[0], y: v[1], color: b.c, radius: 6 }); d.rect(w - 8, h - 8, { x: v[0], y: v[1] - 1, color: "#fff", opacity: 0.08, radius: 4 }); d.rect(6, h, { x: v[0] - w * 0.26, y: v[1], color: "#4a2f18" }); d.rect(6, h, { x: v[0] + w * 0.26, y: v[1], color: "#4a2f18" }); d.text(b.n, { x: v[0], y: v[1] + 2, size: 11.5, bold: true, color: "#fff5de", font: SERIF }); }
        if (this.msg) d.text(this.msg, { x: 160, y: 22, size: 15, color: "#ffe0a8", font: SERIF });
    }
    bot() { if (this.drag) return { wait: 2 }; const want = { trunk: "r0", carpet: "r1", blue: "r2", hat: "r3" }; for (const k in want) if (this.s.at[k] !== want[k]) { const a = this.vis[k], z = RACK[+want[k][1]]; return { drag: [a[0], a[1], z[0], z[1] + 16] }; } return { wait: 2 }; }
}

// --- Tokens into places --------------------------------------------------------------------------------
class Slots extends Widget {
    init() { const start = {}; if (this.def.skin === "labels") { const sl = this.def.slots, to = this.def.tokens; sl.forEach((q, i) => { start[q[0]] = to[i][0]; }); } return { in: start }; }
    constructor(ui, def, saved) {
        super(ui, def, saved);
        this.tw = def.skin === "torn" ? 68 : def.skin === "seats" || def.skin === "labels" ? 70 : 92; this.th = def.skin === "torn" ? 78 : 34;
        const n = def.tokens.length, torn = def.skin === "torn", cols = torn ? 6 : n > 4 ? 3 : n, rows = Math.ceil(n / cols);
        this.home = {}; def.tokens.forEach((t, i) => {
            const c = i % cols, r = Math.floor(i / cols), step = torn ? 50 : Math.min(104, 300 / cols), x = 160 + (c - (cols - 1) / 2) * step, y = torn ? 290 - (i % 2) * 8 : 318 - (rows - r) * 42;
            this.home[t[0]] = [x, y];
        });
        this.order = torn ? ["c", "a", "f", "b", "e", "d"] : null;
        if (torn) this.order.forEach((k, i) => { this.home[k] = [36 + i * 50, 284 + (i % 2) * 10]; });
        this.vis = {}; for (const t of def.tokens) { const q = this.where(t[0]); this.vis[t[0]] = [q[0], q[1]]; }
        this.drag = null; this.shake = 0;
    }
    slotOf(tok) { for (const k in this.s.in) if (this.s.in[k] === tok) return k; return null; }
    slotXY(k) { const q = this.def.slots.find((x) => x[0] === k); return [q[1], q[2]]; }
    where(tok) { const k = this.slotOf(tok); return k ? this.slotXY(k) : this.home[tok]; }
    update(dt, p) {
        this.shake = Math.max(0, this.shake - dt * 2.5);
        if (p.pressed) { let best = null, bd = 44; for (const t of this.def.tokens) { const v = this.vis[t[0]], q = Math.hypot(p.x - v[0], p.y - v[1]); if (q < bd) { bd = q; best = t[0]; } } if (best) { this.drag = best; this.ui.snd.paper(); } }
        for (const t of this.def.tokens) {
            const id = t[0], v = this.vis[id];
            if (this.drag === id) {
                if (p.down) { v[0] = p.x; v[1] = p.y - 10; }
                else {
                    let tgt = null, bd = 60; for (const q of this.def.slots) { const dd = Math.hypot(v[0] - q[1], v[1] - q[2]); if (dd < bd) { bd = dd; tgt = q[0]; } }
                    const from = this.slotOf(id); if (from) delete this.s.in[from];
                    if (tgt) { const occ = this.s.in[tgt]; if (occ && from) this.s.in[from] = occ; else if (occ) { /* bumped back to the tray */ } this.s.in[tgt] = id; this.ui.snd.snap(); }
                    else this.ui.snd.tapSoft();
                    this.drag = null; this.check();
                }
            } else { const q = this.where(id); v[0] = ease(v[0], q[0], 16, dt); v[1] = ease(v[1], q[1], 16, dt); }
        }
    }
    check() {
        const a = this.def.answer, keys = Object.keys(a);
        if (keys.every((k) => this.s.in[k])) { if (keys.every((k) => this.s.in[k] === a[k])) { this.ui.snd.solved(); this.done(); } else { this.shake = 1; this.ui.snd.wrong(); } }
    }
    draw(d) {
        const def = this.def, sx = Math.sin(this.shake * 26) * this.shake * 4, torn = def.skin === "torn";
        for (const q of def.slots) {
            const [id, x, y, lab] = q, w = torn ? 70 : this.tw + 4, h = torn ? 80 : this.th + 6;
            if (def.skin !== "labels") d.rect(w, h, { x, y, color: "#000", opacity: 0.32, radius: 5 });
            if (lab) d.text(lab, { x, y: y + (torn ? 0 : -h / 2 - 11), size: 13, bold: true, color: "#fff0d0", font: SERIF });
        }
        const ids = def.tokens.map((t) => t[0]); if (this.drag) { ids.splice(ids.indexOf(this.drag), 1); ids.push(this.drag); }
        for (const id of ids) {
            const v = this.vis[id], t = def.tokens.find((x) => x[0] === id), lift = this.drag === id ? 1.08 : 1, x = v[0] + (this.slotOf(id) ? sx : 0), y = v[1];
            if (torn) { const i = "abcdef".indexOf(id), cx = (i % 3) * 200, cy = Math.floor(i / 3) * 200; d.rect(70 * lift, 80 * lift, { x: x + 1, y: y + 3, color: "#000", opacity: 0.4 }); d.sprite("kit:family", { x, y, width: 68 * lift, height: 78 * lift, crop: [cx, cy, 200, 200] }); continue; }
            const w = this.tw * lift, h = this.th * lift, label = def.skin === "labels";
            d.rect(w, h, { x: x + 1, y: y + 3, color: "#000", opacity: 0.4, radius: 3 });
            d.rect(w, h, { x, y, color: label ? "#f5edd8" : IV, radius: 3 });
            d.rect(w - 6, h - 6, { x, y, color: "#dfcfa6", opacity: 0.5, radius: 2 });
            d.text(t[1], { x, y, size: t[1].length > 9 ? 11.5 : t[1].length > 7 ? 12.5 : 14.5, bold: !label, color: INKC, font: label ? HAND : SERIF });
        }
    }
    bot() {
        if (this.drag) return { wait: 2 };
        const a = this.def.answer;
        for (const k in a) if (this.s.in[k] !== a[k]) { const v = this.vis[a[k]], z = this.slotXY(k); return { drag: [v[0], v[1], z[0], z[1] + 10] }; }
        return { wait: 2 };
    }
}

// --- Fogged glass ------------------------------------------------------------------------------------
const FG = 26;
class Wipe extends Widget {
    init() { return { f: 0 }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.fog = new Float32Array(FG * FG).fill(1); this.acc = 0; }
    update(dt, p) {
        if (p.down) {
            const R = 3.4, gx = (p.x - 22) / 276 * FG, gy = (p.y - 22) / 276 * FG; let got = 0;
            for (let y = Math.max(0, (gy - R) | 0); y <= Math.min(FG - 1, (gy + R) | 0); y++) for (let x = Math.max(0, (gx - R) | 0); x <= Math.min(FG - 1, (gx + R) | 0); x++) { const q = Math.hypot(x - gx, y - gy); if (q < R) { const i = y * FG + x, n = Math.max(0, this.fog[i] - (1 - q / R) * 0.9); got += this.fog[i] - n; this.fog[i] = n; } }
            this.acc += got; if (this.acc > 2.5) { this.acc = 0; this.ui.game.sfx({ wave: "noise", freq: 2600, decay: 0.03, volume: 0.02 }, { haptic: "tick" }); }
            let tot = 0; for (const v of this.fog) tot += v;
            if (tot / this.fog.length < 0.35 && !this.ok) { this.ok = true; this.ui.after(0.6, () => { this.ui.snd.solved(); this.done(); }); }
        }
    }
    draw(d) {
        const def = this.def;
        if (def.text[0]) { d.text(def.text[0], { x: 160, y: 120, size: 24, bold: true, color: "#fff8e8", font: HAND }); d.text(def.text[1], { x: 160, y: 176, size: 44, bold: true, color: "#fff8e8", font: HAND }); }
        const put = d.quads("kit:puff"), k = 276 / FG;
        for (let y = 0; y < FG; y++) for (let x = 0; x < FG; x++) { const v = this.fog[y * FG + x]; if (v > 0.02) put(22 + (x + 0.5) * k, 22 + (y + 0.5) * k, k * 2.7, k * 2.7, 0, 0, 0.9, 0.93, 0.97, v * 0.62); }
    }
    bot() { let b = -1, bv = 0.2; for (let y = 2; y < FG; y += 4) for (let x = 2; x < FG; x += 4) { const v = this.fog[y * FG + x]; if (v > bv) { bv = v; b = y * FG + x; } } if (b < 0) return { wait: 8 }; const x = b % FG, y = (b / FG) | 0, X = 22 + x * 276 / FG, Y = 22 + y * 276 / FG; return { drag: [X - 12, Y, X + 12, Y] }; }
}

// --- Season ticket punch -------------------------------------------------------------------------------
class Punch extends Widget {
    init() { return { sel: this.def.rows.map(() => -1) }; }
    layout() { const L = [], r = this.def.rows; r[0].forEach((c, i) => L.push([0, i, 44 + (i % 6) * 46, 62 + Math.floor(i / 6) * 44, c])); r[1].forEach((c, i) => L.push([1, i, 34 + i * 42, 168, c])); r[2].forEach((c, i) => L.push([2, i, 120 + i * 80, 222, c])); return L; }
    update(dt, p) {
        if (!p.tapped) return;
        if (this.btn(p, 92, 266, 136, 42)) { const ok = this.def.answer.every((v, i) => this.s.sel[i] === v); if (ok) { this.ui.snd.latch(); this.done(); } else { this.ui.snd.wrong(); this.msg = "The gate slides it back."; this.s.sel = this.def.rows.map(() => -1); } return; }
        let best = null, bd = 24; for (const q of this.layout()) { const dd = Math.hypot(p.x - q[2], p.y - q[3]); if (dd < bd) { bd = dd; best = q; } }
        if (best) { this.s.sel[best[0]] = best[1]; this.msg = ""; this.ui.snd.clip(); }
    }
    draw(d) {
        d.rect(292, 214, { x: 160, y: 146, color: "#000", opacity: 0.3, radius: 8 }); d.rect(288, 210, { x: 160, y: 144, color: "#ead9b4", radius: 6 });
        this.def.labels.forEach((l, i) => d.text(l, { x: 160, y: [42, 148, 200][i] - 4, size: 12, bold: true, color: "#7c2a26", font: SERIF }));
        for (const [r, i, x, y, c] of this.layout()) { const on = this.s.sel[r] === i; d.circle(15, { x, y, color: on ? "#1a1420" : "#d4c096" }); d.text(c, { x, y, size: 14, bold: true, color: on ? "#d4c096" : INKC, font: SERIF }); }
        this.drawBtn(d, "Feed the gate", 92, 266, 136, 42);
        if (this.msg) d.text(this.msg, { x: 160, y: 20, size: 15, color: "#ffe0a8", font: SERIF });
    }
    bot() { const L = this.layout(); for (let r = 0; r < 3; r++) if (this.s.sel[r] !== this.def.answer[r]) { const q = L.find((x) => x[0] === r && x[1] === this.def.answer[r]); return { tap: [q[2], q[3]] }; } return { tap: [160, 287] }; }
}

// --- Bells and plungers ----------------------------------------------------------------------------------
class Sequence extends Widget {
    init() { return {}; }
    constructor(ui, def, saved) { super(ui, def, saved); this.got = []; this.ring = [0, 0, 0, 0]; this.gap = 0; this.groups = []; this.cnt = 0; this.press = 0; }
    update(dt, p) {
        this.ring = this.ring.map((v) => Math.max(0, v - dt * 2)); this.press = Math.max(0, this.press - dt * 5);
        if (this.def.mode === "rhythm") {
            this.gap += dt;
            if (this.cnt && this.gap > 0.7) { this.groups.push(this.cnt); this.cnt = 0; if (this.groups.length >= 2) this.judge(); }
            if (p.pressed && Math.hypot(p.x - 160, p.y - 190) < 86) { this.cnt++; this.gap = 0; this.press = 1; this.ui.snd.bell(1); this.ring[0] = 1; }
            return;
        }
        if (p.tapped) for (let i = 0; i < 4; i++) { const x = 58 + i * 68; if (Math.abs(p.x - x) < 36 && Math.abs(p.y - 140) < 90) { this.ring[i] = 1; this.ui.snd.bell(i); this.got.push(i); const a = this.def.answer, ok = this.got.every((v, k) => v === a[k]); if (!ok) { this.got = []; this.ui.snd.wrong(); this.msg = "Out of order. The steward sighs."; } else { this.msg = ""; if (this.got.length === a.length) { this.ui.snd.solved(); this.done(); } } } }
    }
    judge() { const g = this.groups, a = this.def.answer; if (g[0] === a[0] && g[1] === a[1]) { this.ui.snd.solved(); this.done(); } else { this.ui.snd.wrong(); this.msg = "Not the code."; } this.groups = []; }
    draw(d) {
        if (this.def.mode === "rhythm") {
            d.circle(66, { x: 160, y: 84 + Math.sin(this.ring[0] * 40) * this.ring[0], color: BRD }); d.circle(60, { x: 160, y: 82, color: BR }); d.circle(40, { x: 152, y: 72, color: "#f2d898", opacity: 0.5 });
            d.rect(30, 40 - this.press * 12, { x: 160, y: 186 + this.press * 6, color: "#3a2c1c", radius: 4 }); d.circle(44, { x: 160, y: 164 + this.press * 12, color: "#000", opacity: 0.4 }); d.circle(42, { x: 160, y: 160 + this.press * 12, color: "#a83a34" }); d.circle(30, { x: 156, y: 154 + this.press * 12, color: "#c9524a" });
            for (let i = 0; i < this.groups.length; i++) d.text(this.groups[i], { x: 60 + i * 200, y: 250, size: 26, bold: true, color: "#ffd27a", font: SERIF });
            d.text("." .repeat(this.cnt), { x: 160, y: 250, size: 30, bold: true, color: "#ffd27a", font: SERIF });
        } else {
            for (let i = 0; i < 4; i++) {
                const x = 58 + i * 68, wob = Math.sin(this.t * 40) * this.ring[i] * 0.18; this.t += 0.001;
                d.push(); d.translate(x, 74); d.rotate(wob); d.line({ x: 0, y: 0 }, { x: 0, y: 26 }, { width: 3, color: BRD });
                d.poly([{ x: -11, y: 26 }, { x: 11, y: 26 }, { x: 27, y: 84 }, { x: -27, y: 84 }], { color: BR }); d.poly([{ x: -9, y: 30 }, { x: -2, y: 30 }, { x: -8, y: 80 }, { x: -20, y: 80 }], { color: "#f2d898", opacity: 0.6 }); d.circle(6, { y: 90, color: BRD }); d.pop();
                d.rect(62, 28, { x, y: 196, color: IV, radius: 3 }); d.text(this.def.marks[i], { x, y: 196, size: 13.5, bold: true, color: INKC, font: SERIF });
            }
            for (let i = 0; i < 4; i++) d.circle(6, { x: 124 + i * 24, y: 240, color: i < this.got.length ? "#ffd27a" : "#3a2c1c" });
        }
        if (this.msg) d.text(this.msg, { x: 160, y: 288, size: 15, color: "#ffe0a8", font: SERIF });
    }
    bot() {
        if (this.def.mode === "rhythm") {
            this.pl = this.pl ?? [{ tap: [160, 190] }, { wait: 6 }, { tap: [160, 190] }, { wait: 6 }, { tap: [160, 190] }, { wait: 60 }, { tap: [160, 190] }, { wait: 60 }];
            return this.pl.shift() ?? { wait: 10 };
        }
        const i = this.def.answer[this.got.length]; return { tap: [58 + i * 68, 140] };
    }
}

// --- Telegraph -------------------------------------------------------------------------------------------
const LONG = 0.24;
class Telegraph extends Widget {
    constructor(ui, def, saved) {
        super(ui, def, saved); this.typed = ""; this.held = 0; this.key = false; this.lamp = 0; this.err = 0;
        this.q = []; this.loadCall(); this.wait = 0.8;
    }
    loadCall() { this.q = []; for (const c of this.def.call) { if (c === " ") this.q.push(["g", 0.8]); else { this.q.push([c === "-" ? "l" : "s", c === "-" ? 0.42 : 0.16]); this.q.push(["g", 0.22]); } } }
    update(dt, p) {
        this.lamp = Math.max(0, this.lamp - dt * 5); this.err = Math.max(0, this.err - dt * 2);
        this.wait -= dt;
        if (this.wait <= 0 && this.q.length) { const [k, t] = this.q.shift(); this.wait = t; if (k !== "g") { this.lamp = 1; this.lampHold = t; this.ui.snd.sounder(k === "l"); } }
        if (this.lampHold > 0) { this.lampHold -= dt; this.lamp = 1; }
        if (!this.q.length && this.wait <= 0 && !this.key && !this.typed) { this.idle = (this.idle ?? 0) + dt; if (this.idle > 5) { this.idle = 0; this.loadCall(); } }
        if (this.btn(p, 22, 268, 92, 40)) { this.loadCall(); this.wait = 0.2; return; }
        if (this.btn(p, 206, 268, 92, 40)) { this.typed = ""; this.ui.snd.tapSoft(); return; }
        if (p.pressed && p.y > 130 && p.y < 262) { this.key = true; this.held = 0; this.ui.snd.notch(0.5); }
        if (this.key) {
            this.held += dt; if (p.down) { this.pulsed = (this.pulsed ?? 0) + dt; }
            if (!p.down) { this.key = false; const c = this.held < LONG ? "." : "-"; this.typed += c; this.ui.snd.sounder(c === "-"); const a = this.def.reply.replace(/ /g, ""); if (this.typed === a) { this.ui.after(0.3, () => { this.ui.snd.solved(); this.done(); }); } else if (!a.startsWith(this.typed)) { this.err = 1; this.msg = "Garbled. Send it again."; this.typed = ""; this.ui.snd.wrong(); } else this.msg = ""; }
        }
    }
    draw(d) {
        d.circle(26, { x: 160, y: 62, color: "#000", opacity: 0.4 }); d.circle(22, { x: 160, y: 60, color: "#3c2a1a" }); d.circle(16, { x: 160, y: 60, color: this.lamp ? "#ffd27a" : "#5a4a2a" });
        if (this.lamp) d.additive(() => d.circle(44, { x: 160, y: 60, color: "#ff9c40", opacity: 0.35 }));
        d.rect(250, 28, { x: 160, y: 112, color: IV, radius: 2 }); d.text(this.typed.split("").join(" ") || "...", { x: 160, y: 111, size: 21, bold: true, color: INKC, font: SERIF });
        const dn = this.key ? 7 : 0;
        d.rect(220, 22, { x: 160, y: 228, color: "#3c2a1a", radius: 5 }); d.rect(160, 12, { x: 160, y: 190 + dn / 2, color: BR, radius: 4 }); d.circle(6, { x: 90, y: 204, color: BRD }); d.rect(34, 26, { x: 225, y: 184 + dn, color: "#1a1420", radius: 6 }); d.circle(22, { x: 225, y: 172 + dn, color: "#1a1420" }); d.circle(15, { x: 221, y: 168 + dn, color: "#3c3040" });
        d.text("Hold the key", { x: 110, y: 160, size: 13, color: "#e8d6b0", font: SERIF });
        this.drawBtn(d, "Listen", 22, 268, 92, 40); this.drawBtn(d, "Clear", 206, 268, 92, 40);
        if (this.msg) d.text(this.msg, { x: 160, y: 22, size: 15, color: "#ffe0a8", font: SERIF });
    }
    bot() { const a = this.def.reply.replace(/ /g, ""), c = a[this.typed.length]; if (!c) return { wait: 30 }; return { hold: [225, 190, c === "-" ? 24 : 6] }; }
}

// --- Gears in a watch -------------------------------------------------------------------------------------
const GK = 1.4, GR = [21, 16, 34, 24, 20].map((r) => r * GK), GANG = [0.8, 0.6, -0.55, -0.3], GP = [[38, 96]];
for (let i = 0; i < 4; i++) { const q = GP[i], L = GR[i] + GR[i + 1]; GP.push([q[0] + Math.cos(GANG[i]) * L, q[1] + Math.sin(GANG[i]) * L]); }
const GDRIVER = [GP[0][0], GP[0][1], GR[0]], GPOST = [GP[1], GP[2], GP[3]], GLAST = [GP[4][0], GP[4][1], GR[4]];
class Gears extends Widget {
    // Radii chosen so driver+16, 16+34, 34+24, 24+last are the post spacings.
    init() { return { in: {} }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.g = [["a", GR[1]], ["b", GR[2]], ["c", GR[3]], ["d", 28 * GK]]; this.home = { a: [36, 276], b: [108, 268], c: [196, 276], d: [272, 272] }; this.vis = {}; for (const [k] of this.g) this.vis[k] = [...this.where(k)]; this.rot = 0; this.drag = null; }
    where(k) { for (const i in this.s.in) if (this.s.in[i] === k) return GPOST[+i]; return this.home[k]; }
    conn() { let n = 0; const ans = ["a", "b", "c"]; for (let i = 0; i < 3; i++) { if (this.s.in[i] === ans[i]) n++; else break; } return n; }
    update(dt, p) {
        this.rot += dt * 1.6;
        if (p.pressed) { let best = null, bd = 46; for (const [k] of this.g) { const q = Math.hypot(p.x - this.vis[k][0], p.y - this.vis[k][1]); if (q < bd) { bd = q; best = k; } } if (best) { this.drag = best; this.ui.snd.tapSoft(); } }
        for (const [k] of this.g) {
            const v = this.vis[k];
            if (this.drag === k) { if (p.down) { v[0] = p.x; v[1] = p.y - 8; } else { for (const i in this.s.in) if (this.s.in[i] === k) delete this.s.in[i]; let tgt = -1, bd = 44; GPOST.forEach((q, i) => { const dd = Math.hypot(v[0] - q[0], v[1] - q[1]); if (dd < bd) { bd = dd; tgt = i; } }); if (tgt >= 0) { this.s.in[tgt] = k; this.ui.snd.snap(); } this.drag = null; if (this.conn() === 3) { this.ui.snd.solved(); this.ui.after(1, () => this.done()); this.finished = true; } } }
            else { const q = this.where(k); v[0] = ease(v[0], q[0], 16, dt); v[1] = ease(v[1], q[1], 16, dt); }
        }
    }
    gear(d, x, y, r, a, c) { d.sprite("kit:gear", { x, y, width: r * 2.3, height: r * 2.3, rot: a, color: c }); d.circle(3.4, { x, y, color: BRD }); }
    draw(d) {
        const n = this.conn(), R = this.rot;
        this.gear(d, GDRIVER[0], GDRIVER[1], GDRIVER[2], R, "#c0c6cc");
        const ang = (i) => { let a = R, prev = GDRIVER[2]; for (let k = 0; k <= i; k++) { const rr = GR[k + 1]; a = -a * prev / rr; prev = rr; } return a; };
        for (const q of GPOST) d.circle(4, { x: q[0], y: q[1], color: "#1a1420" });
        for (const [k, r] of this.g) { const v = this.vis[k], slot = Object.keys(this.s.in).find((i) => this.s.in[i] === k); const live = slot !== undefined && +slot < n; this.gear(d, v[0], v[1], r, live ? ang(+slot) : 0.3, { a: "#e3bc6e", b: "#d8ae5e", c: "#e8c67c", d: "#c8a058" }[k]); }
        this.gear(d, GLAST[0], GLAST[1], GLAST[2], n === 3 ? -ang(2) * GR[3] / GR[4] : 0, "#c0c6cc");
    }
    bot() { if (this.drag || this.finished) return { wait: 10 }; const ans = ["a", "b", "c"]; for (let i = 0; i < 3; i++) if (this.s.in[i] !== ans[i]) { const v = this.vis[ans[i]]; return { drag: [v[0], v[1], GPOST[i][0], GPOST[i][1] + 8] }; } return { wait: 5 }; }
}

// --- Watch hands -------------------------------------------------------------------------------------------
function drawFace(d, cx, cy, R, mins, o = {}) {
    d.circle(R + 12, { x: cx, y: cy + 4, color: "#000", opacity: 0.4 }); d.circle(R + 10, { x: cx, y: cy, color: BRD }); d.circle(R + 7, { x: cx, y: cy, color: BR }); d.circle(R, { x: cx, y: cy, color: o.face ?? "#f4e9cf" });
    if (!o.bare) for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; d.text(i, { x: cx + Math.sin(a) * (R - 22), y: cy - Math.cos(a) * (R - 22), size: 18, bold: true, color: INKC, font: SERIF }); }
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, L = i % 5 ? 4 : 8; d.line({ x: cx + Math.sin(a) * (R - L), y: cy - Math.cos(a) * (R - L) }, { x: cx + Math.sin(a) * (R - 1), y: cy - Math.cos(a) * (R - 1) }, { width: i % 5 ? 0.8 : 1.6, color: INKC }); }
    const ma = (mins % 60) / 60 * Math.PI * 2, ha = (mins / 60 % 12) / 12 * Math.PI * 2;
    d.line({ x: cx, y: cy }, { x: cx + Math.sin(ha) * R * 0.5, y: cy - Math.cos(ha) * R * 0.5 }, { width: 6, color: INKC }); d.circle(7, { x: cx + Math.sin(ha) * R * 0.5, y: cy - Math.cos(ha) * R * 0.5, color: INKC });
    d.line({ x: cx, y: cy }, { x: cx + Math.sin(ma) * R * 0.8, y: cy - Math.cos(ma) * R * 0.8 }, { width: 3.4, color: "#7c2a26" }); d.circle(5, { x: cx + Math.sin(ma) * R * 0.8, y: cy - Math.cos(ma) * R * 0.8, color: "#7c2a26" });
    d.circle(6, { x: cx, y: cy, color: BR });
}
class Hands {
    constructor(w, cx, cy, R, start) { this.w = w; this.cx = cx; this.cy = cy; this.R = R; this.m = start; this.grab = null; }
    update(p) {
        const { cx, cy, R } = this;
        if (p.pressed && Math.hypot(p.x - cx, p.y - cy) < R + 24) {
            const ma = (this.m % 60) / 60 * Math.PI * 2, ha = (this.m / 60 % 12) / 12 * Math.PI * 2, dh = Math.hypot(p.x - cx - Math.sin(ha) * R * 0.5, p.y - cy + Math.cos(ha) * R * 0.5), dm = Math.hypot(p.x - cx - Math.sin(ma) * R * 0.8, p.y - cy + Math.cos(ma) * R * 0.8);
            this.grab = dh < dm ? "h" : "m"; this.last = Math.atan2(p.x - cx, -(p.y - cy));
        }
        if (this.grab) {
            if (p.down) {
                const a = Math.atan2(p.x - cx, -(p.y - cy)), da = wrapAng(a - this.last); this.last = a;
                this.acc = (this.acc ?? 0) + da * (this.grab === "h" ? 720 : 60) / (Math.PI * 2);
                const was = Math.round(this.m / 5);
                this.exact = (this.exact ?? this.m) + da * (this.grab === "h" ? 720 : 60) / (Math.PI * 2);
                this.m = Math.round(this.exact / 5) * 5; if (Math.round(this.m / 5) !== was) this.w.ui.snd.notch(1.2);
            } else { this.grab = null; this.m = ((this.m % 720) + 720) % 720; this.exact = this.m; return true; }
        }
        return false;
    }
}
class Watch extends Widget {
    init() { return { m: 7 * 60 + 40 }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.h = new Hands(this, 160, 156, 116, this.s.m); this.tick = 0; }
    update(dt, p) {
        this.tick += dt; if (this.tick > 1) { this.tick = 0; this.ui.game.sfx({ wave: "square", freq: 3200, decay: 0.008, volume: 0.015 }); }
        if (this.h.update(p)) { this.s.m = this.h.m; const [H, M] = this.def.answer; if (this.h.m === ((H % 12) * 60 + M) % 720) { this.ui.snd.latch(); this.done(); } }
    }
    draw(d) { drawFace(d, this.h.cx, this.h.cy, this.h.R, this.h.m); d.rect(26, 22, { x: 160, y: 22, color: BR, radius: 4 }); }
    bot() {
        const [H, M] = this.def.answer, tgt = ((H % 12) * 60 + M) % 720, cur = this.h.m;
        if (cur === tgt) return { wait: 3 };
        const R = this.h.R, cx = this.h.cx, cy = this.h.cy;
        const dHours = (((tgt - cur) % 720) + 720) % 720, useHour = dHours >= 60, grabR = useHour ? 0.5 : 0.8;
        const a0 = useHour ? (cur / 60 % 12) / 12 * Math.PI * 2 : (cur % 60) / 60 * Math.PI * 2, step = useHour ? 60 / 720 * Math.PI * 2 : 5 / 60 * Math.PI * 2, a1 = a0 + step * 1.0;
        return { drag: [cx + Math.sin(a0) * R * grabR, cy - Math.cos(a0) * R * grabR, cx + Math.sin(a1) * R * grabR, cy - Math.cos(a1) * R * grabR] };
    }
}

// --- Music box -----------------------------------------------------------------------------------------------
class Pins extends Widget {
    init() { return { col: Array(8).fill(-1) }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.play = -1; this.pt = 0; this.x0 = 34; this.y0 = 54; this.cw = 36; this.ch = 36; this.bird = 0; }
    update(dt, p) {
        if (this.play >= 0) {
            this.pt += dt; if (this.pt > 0.36) { this.pt = 0; this.play++; if (this.play >= 8) { const ok = this.s.col.every((v, i) => v === SONG[i]); this.play = -1; if (ok) { this.ui.snd.solved(); this.ui.after(0.5, () => this.done()); this.finished = true; } else { this.ui.snd.wrong(); this.msg = "That's not how it goes."; } } else if (this.s.col[this.play] >= 0) this.ui.snd.pluck(this.s.col[this.play]); }
            return;
        }
        if (this.btn(p, 92, 262, 136, 44)) { this.play = 0; this.pt = 0; this.msg = ""; if (this.s.col[0] >= 0) this.ui.snd.pluck(this.s.col[0]); return; }
        if (p.tapped) { const c = Math.floor((p.x - this.x0) / this.cw), r = 4 - Math.floor((p.y - this.y0) / this.ch); if (c >= 0 && c < 8 && r >= 0 && r < 5) { this.s.col[c] = this.s.col[c] === r ? -1 : r; if (this.s.col[c] >= 0) this.ui.snd.pluck(r); else this.ui.snd.tapSoft(); } }
    }
    draw(d) {
        const { x0, y0, cw, ch } = this;
        d.rect(cw * 8 + 10, ch * 5 + 10, { x: x0 + cw * 4, y: y0 + ch * 2.5, color: BR, radius: 8 }); d.rect(cw * 8, ch * 5, { x: x0 + cw * 4, y: y0 + ch * 2.5, color: "#c9a460", radius: 6 });
        for (let c = 1; c < 8; c++) d.line({ x: x0 + c * cw, y: y0 }, { x: x0 + c * cw, y: y0 + ch * 5 }, { width: c === 4 ? 2 : 1, color: "#7c5a28", opacity: 0.6 });
        for (let r = 0; r < 5; r++) { const y = y0 + (r + 0.5) * ch; d.line({ x: x0, y }, { x: x0 + cw * 8, y }, { width: 1, color: "#7c5a28", opacity: 0.7 }); }
        if (this.play >= 0) d.rect(cw - 2, ch * 5, { x: x0 + (this.play + 0.5) * cw, y: y0 + ch * 2.5, color: "#fff", opacity: 0.25 });
        for (let c = 0; c < 8; c++) { const v = this.s.col[c]; if (v >= 0) { const x = x0 + (c + 0.5) * cw, y = y0 + (4 - v + 0.5) * ch; d.circle(12, { x: x + 1, y: y + 2, color: "#000", opacity: 0.4 }); d.circle(11, { x, y, color: "#efe4c9" }); d.circle(5, { x: x - 3, y: y - 3, color: "#fff", opacity: 0.8 }); } }
        for (let r = 0; r < 5; r++) d.circle(3, { x: x0 - 12, y: y0 + (r + 0.5) * ch, color: BR });
        this.drawBtn(d, "Turn the handle", 82, 262, 156, 44, this.play < 0);
        if (this.msg) d.text(this.msg, { x: 160, y: 26, size: 15, color: "#ffe0a8", font: SERIF });
    }
    bot() { if (this.play >= 0 || this.finished) return { wait: 10 }; for (let c = 0; c < 8; c++) if (this.s.col[c] !== SONG[c]) return { tap: [this.x0 + (c + 0.5) * this.cw, this.y0 + (4 - SONG[c] + 0.5) * this.ch] }; return { tap: [160, 284] }; }
}

// --- Pierced rings -------------------------------------------------------------------------------------------
class Overlay extends Widget {
    init() { return { a: 0, b: 0 }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.va = this.s.a; this.vb = this.s.b; this.drag = null; this.glow = 0; this.cx = 160; this.cy = 150; this.single = def.mode === "ticket"; }
    aligned() { return this.s.a === this.def.answer[0] && (this.single || this.s.b === this.def.answer[1]); }
    update(dt, p) {
        const { cx, cy } = this, st = this.def.steps, k = st / (Math.PI * 2);
        if (this.aligned()) this.glow = Math.min(1, this.glow + dt * 0.8);
        if (p.pressed) { const r = Math.hypot(p.x - cx, p.y - cy); if (r < 150) { this.drag = this.single || r > 90 ? "a" : "b"; this.last = Math.atan2(p.y - cy, p.x - cx); } }
        if (this.drag) {
            const key = this.drag === "a" ? "va" : "vb", sk = this.drag;
            if (p.down) { const a = Math.atan2(p.y - cy, p.x - cx), da = wrapAng(a - this.last); this.last = a; const was = Math.round(this[key]); this[key] += da * k; const now = Math.round(this[key]); if (now !== was) { this.ui.snd.notch(0.9); this.s[sk] = ((now % st) + st) % st; } }
            else { this[key] = Math.round(this[key]); this.s[sk] = ((this[key] % st) + st) % st; this.drag = null; if (this.aligned()) { this.ui.snd.solved(); this.ui.after(this.def.digits ? 2.6 : 1.4, () => this.done()); this.finished = true; } }
        }
        if (this.drag !== "a") this.va = ease(this.va, Math.round(this.va), 12, dt);
        if (this.drag !== "b") this.vb = ease(this.vb, Math.round(this.vb), 12, dt);
    }
    star(i) {
        const st = this.def.steps, [ansA, ansB] = this.def.answer, grp = this.single || i % 2 === 0, off = grp ? this.va - ansA : this.vb - ansB, a = off / st * Math.PI * 2, [x, y] = BIRD[i], q = this.single ? 88 : (grp ? 104 : 60), kk = this.single ? 1 : (grp ? 0.84 : 0.84), c = Math.cos(a), s = Math.sin(a);
        return [this.cx + (x * c - y * s) * 112 * kk * (q ? 1 : 1), this.cy + (x * s + y * c) * 112 * kk];
    }
    draw(d) {
        const { cx, cy, single } = this;
        if (single) {
            for (let i = 0; i < 9; i++) { const a = BIRD[i], b = BIRD[i + 1]; if (i === 7 || i === 8) continue; d.line({ x: cx + a[0] * 112, y: cy + a[1] * 112 }, { x: cx + b[0] * 112, y: cy + b[1] * 112 }, { width: 1, color: "#5a5448", opacity: 0.55 }); }
            for (const q of BIRD) d.circle(7, { x: cx + q[0] * 112, y: cy + q[1] * 112, color: "#5a5448", opacity: 0.35 });
            d.push(); d.translate(cx, cy); d.rotate((this.va - this.def.answer[0]) / this.def.steps * Math.PI * 2); d.rect(280, 184, { color: "#e8d9b4", opacity: 0.32, radius: 6 }); d.pop();
        } else {
            d.circle(148, { x: cx, y: cy, color: "#000", opacity: 0.25 });
            d.push(); d.translate(cx, cy); d.rotate(this.va / this.def.steps * Math.PI * 2); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; d.circle(i === 0 ? 5 : 2.4, { x: Math.sin(a) * 140, y: -Math.cos(a) * 140, color: BR }); } d.pop();
            d.push(); d.translate(cx, cy); d.rotate(this.vb / this.def.steps * Math.PI * 2); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; d.circle(i === 0 ? 5 : 2.4, { x: Math.sin(a) * 84, y: -Math.cos(a) * 84, color: "#a8b4e0" }); } d.pop();
            d.text("outer", { x: 276, y: 306, size: 13, color: "#c9d4ff", font: SERIF }); d.text("inner", { x: 44, y: 306, size: 13, color: "#c9d4ff", font: SERIF });
        }
        const col = single ? "#fff2c0" : "#fdf6dc";
        d.additive(() => { for (let i = 0; i < BIRD.length; i++) { const [x, y] = this.star(i); d.circle(11 + this.glow * 4, { x, y, color: "#ffcf80", opacity: 0.28 }); d.circle(3.4, { x, y, color: col }); } });
        if (this.glow > 0.3 && this.def.digits) d.text(this.def.digits.split("").join("  "), { x: cx, y: 300, size: 30, bold: true, color: "#fff2c0", opacity: this.glow, font: SERIF });
    }
    bot() {
        if (this.drag || this.finished) return { wait: 5 };
        const st = this.def.steps, [A, B] = this.def.answer, turn = (r) => { const a0 = -Math.PI / 2, a1 = a0 + Math.PI * 2 / st * 1.02; return { drag: [this.cx + Math.cos(a0) * r, this.cy + Math.sin(a0) * r, this.cx + Math.cos(a1) * r, this.cy + Math.sin(a1) * r] }; };
        if (this.s.a !== A) return turn(this.single ? 120 : 120);
        if (!this.single && this.s.b !== B) return turn(60);
        return { wait: 5 };
    }
}

// --- Telescope ---------------------------------------------------------------------------------------------------
class Scope extends Widget {
    init() { return { x: 0 }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.x = 340; this.watch = 0; this.flash = 0; this.pc = 0; this.drag = false;
        this.pat = []; for (const g of [3, 1, 5]) { for (let i = 0; i < g; i++) { this.pat.push(1, 0); } this.pat.push(-1); } this.pat.push(-2); this.pi = 0; this.pw = 0; this.lt = 0; }
    update(dt, p) {
        if (p.pressed) { this.drag = true; this.lx = p.x; } if (this.drag) { if (p.down) { this.x = clamp(this.x + (p.x - this.lx) * 1.0, -40, 480); this.lx = p.x; } else this.drag = false; }
        this.pw -= dt; if (this.pw <= 0) { const k = this.pat[this.pi]; this.pi = (this.pi + 1) % this.pat.length; if (this.pi === 0) this.cycle = (this.cycle ?? 0) + 1; this.pw = k === 1 ? 0.34 : k === 0 ? 0.34 : k === -1 ? 1.2 : 2.2; this.lt = k === 1 ? 1 : 0; if (k === 1 && this.onTarget()) this.ui.game.haptic("tick"); }
        if (this.onTarget()) { this.watch += dt; if (this.watch > 11) this.done(); } else this.watch = Math.max(0, this.watch - dt * 2);
    }
    onTarget() { return Math.abs(this.x) < 46; }
    draw(d) {
        const R = 140, cx = 160, cy = 160;
        d.clip(this.ui.bx(cx - R), this.ui.by(cy - R), R * 2 * this.ui.bs, R * 2 * this.ui.bs, () => {
            d.sprite("kit:seascope", { x: cx + this.x, y: cy, width: 900, height: 300 });
            if (this.lt) d.additive(() => { d.circle(46, { x: cx + this.x + 0, y: cy - 62, color: "#ffe9a0", opacity: 0.6 }); d.circle(14, { x: cx + this.x, y: cy - 62, color: "#fff" }); d.line({ x: cx + this.x, y: cy - 62 }, { x: cx + this.x + 200, y: cy - 100 }, { width: 18, color: "#ffe9a0", opacity: 0.18 }); });
        });
        d.sprite("kit:scoperim", { x: cx, y: cy, width: 320, height: 320 });
        if (this.onTarget()) d.rect(200 * Math.min(1, this.watch / 11), 4, { x: 160, y: 306, color: "#ffd27a" });
    }
    bot() { if (!this.onTarget()) return { drag: [160, 200, 160 + clamp(-this.x, -120, 120), 200] }; return { wait: 30 }; }
}

// --- Lever frame -----------------------------------------------------------------------------------------------------
const LC = ["#d8b84a", "#b03a3a", "#2a2a30", "#3f6aa8", "#b03a3a", "#efe4c9"], LX = (i) => 40 + i * 48;
class Levers extends Widget {
    init() { return { on: [0, 0, 0, 0, 1, 0] }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.vis = this.s.on.map((v) => v); this.shake = [0, 0, 0, 0, 0, 0]; }
    can(i) {
        const o = this.s.on;
        if (!o[i]) return i === 0 ? !!o[1] : i === 1 ? o[2] && o[3] && !o[4] : i === 2 ? !o[4] : i === 3 ? !!o[2] : i === 4 ? !o[1] : true;
        return i === 1 ? !o[0] : i === 2 ? !o[3] : i === 3 ? !o[1] : true;
    }
    update(dt, p) {
        for (let i = 0; i < 6; i++) { this.vis[i] = ease(this.vis[i], this.s.on[i], 12, dt); this.shake[i] = Math.max(0, this.shake[i] - dt * 3); }
        if (p.tapped) for (let i = 0; i < 6; i++) if (Math.abs(p.x - LX(i)) < 24 && p.y > 60 && p.y < 300) {
            if (i === 5) { this.msg = "Lever 6 is spare. It has always been spare."; this.ui.snd.tapSoft(); break; }
            if (this.can(i)) { this.s.on[i] ^= 1; this.ui.snd.latch(); this.msg = ""; const o = this.s.on; if (o[0] && o[1] && o[2] && o[3] && !o[4]) { this.ui.after(0.5, () => { this.ui.snd.whistle(); this.done(); }); this.finished = true; } }
            else { this.shake[i] = 1; this.ui.snd.thunk(); this.msg = "Locked. The frame won't allow it."; }
        }
    }
    draw(d) {
        d.rect(300, 40, { x: 160, y: 30, color: IV, radius: 3 }); d.line({ x: 24, y: 30 }, { x: 296, y: 30 }, { width: 3, color: INKC });
        const lamp = (x, on) => { d.circle(7, { x, y: 22, color: "#1a1420" }); d.circle(4.5, { x, y: 22, color: on ? "#3ec46d" : "#c23a30" }); };
        lamp(70, this.s.on[0]); lamp(120, this.s.on[1]); lamp(250, this.s.on[4]);
        d.line({ x: 150, y: 30 }, { x: 196, y: this.s.on[2] ? 44 : 30 }, { width: 3, color: this.s.on[2] ? "#3f6aa8" : INKC });
        d.rect(310, 24, { x: 160, y: 296, color: "#2a2018", radius: 4 });
        for (let i = 0; i < 6; i++) {
            const x = LX(i) + Math.sin(this.shake[i] * 30) * this.shake[i] * 3, v = this.vis[i], ty = 96 + v * 96, by = 292;
            d.rect(14, 214, { x: LX(i), y: 196, color: "#14100c", radius: 3 });
            d.line({ x, y: by }, { x, y: ty }, { width: 11, color: "#000", opacity: 0.4 }); d.line({ x, y: by }, { x, y: ty }, { width: 9, color: LC[i] });
            d.rect(24, 30, { x, y: ty - 14, color: "#cfd4da", radius: 6 }); d.rect(16, 22, { x, y: ty - 16, color: "#eef0f2", radius: 4 });
            d.circle(13, { x, y: 278, color: BR }); d.text(i + 1, { x, y: 278, size: 15, bold: true, color: INKC, font: SERIF });
        }
        if (this.msg) d.text(this.msg, { x: 160, y: 64, size: 14, color: "#ffe0a8", font: SERIF });
    }
    bot() { if (this.finished) return { wait: 10 }; const o = this.s.on; for (const [i, w] of [[4, 0], [2, 1], [3, 1], [1, 1], [0, 1]]) if (o[i] !== w) return { tap: [LX(i), 200] }; return { wait: 4 }; }
}

// --- Steam valves ---------------------------------------------------------------------------------------------------
class Valves extends Widget {
    init() { return { g: [...this.def.start], a: [0, 0, 0] }; }
    constructor(ui, def, saved) { super(ui, def, saved); this.vg = [...this.s.g]; this.spin = [0, 0, 0]; }
    update(dt, p) {
        for (let i = 0; i < 3; i++) { let dv = this.s.g[i] - this.vg[i]; if (dv > 4) dv -= 8; if (dv < -4) dv += 8; this.vg[i] += dv * Math.min(1, dt * 6); this.spin[i] = ease(this.spin[i], this.s.a[i], 9, dt); }
        if (p.tapped) for (let i = 0; i < 3; i++) { const x = 60 + i * 100; if (Math.hypot(p.x - x, p.y - 232) < 50) { this.s.a[i]++; this.def.moves[i].forEach((m, k) => { this.s.g[k] = (this.s.g[k] + m) % 8; }); this.ui.snd.snap(); this.ui.game.sfx({ wave: "noise", freq: 1800, decay: 0.2, volume: 0.03 }); if (this.s.g.every((v) => v === this.def.target) && !this.finished) { this.finished = true; this.ui.after(0.6, () => { this.ui.snd.solved(); this.done(); }); } } }
    }
    draw(d) {
        for (let i = 0; i < 3; i++) {
            const x = 60 + i * 100, y = 86, R = 42, a = (this.vg[i] / 8) * Math.PI * 2 - Math.PI;
            d.circle(R + 7, { x, y, color: BRD }); d.circle(R + 4, { x, y, color: BR }); d.circle(R, { x, y, color: "#efe4c9" });
            for (let k = 0; k < 8; k++) { const b = k / 8 * Math.PI * 2 - Math.PI; d.line({ x: x + Math.sin(b) * (R - 8), y: y - Math.cos(b) * (R - 8) }, { x: x + Math.sin(b) * (R - 2), y: y - Math.cos(b) * (R - 2) }, { width: k === this.def.target ? 7 : 1.5, color: k === this.def.target ? "#3a8a5a" : INKC }); }
            d.line({ x, y }, { x: x + Math.sin(a) * (R - 8), y: y - Math.cos(a) * (R - 8) }, { width: 3, color: "#a83a34" }); d.circle(4, { x, y, color: INKC });
            d.push(); d.translate(x, 232); d.rotate(this.spin[i] * 0.785); d.circle(40, { color: "#7c2a26" }); d.circle(30, { color: "#3a2c1c" }); for (let k = 0; k < 4; k++) { d.rotate(0.785); d.rect(70, 8, { color: "#a83a34", radius: 3 }); } d.circle(10, { color: BR }); d.pop();
            d.line({ x, y: 128 }, { x, y: 190 }, { width: 8, color: "#6d5a44" });
        }
    }
    bot() {
        if (this.finished) return { wait: 10 };
        const { moves, target } = this.def, g = this.s.g;
        for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) for (let c = 0; c < 8; c++) { const ok = [0, 1, 2].every((k) => (g[k] + a * moves[0][k] + b * moves[1][k] + c * moves[2][k]) % 8 === target); if (ok) { const i = a ? 0 : b ? 1 : 2; return { tap: [60 + i * 100, 232] }; } }
        return null;
    }
}

// --- The clock test --------------------------------------------------------------------------------------------------
const MISSING = [4, 5, 7, 8, 11];
class ClockFace extends Widget {
    init() { return { placed: {}, m: 2 * 60 + 45 }; }
    constructor(ui, def, saved) {
        super(ui, def, saved); this.cx = 160; this.cy = 130; this.R = 100; this.h = new Hands(this, this.cx, this.cy, this.R, this.s.m);
        this.vis = {}; MISSING.forEach((n, i) => { this.vis[n] = [...(this.s.placed[n] ? this.spot(n) : this.home(i))]; }); this.drag = null;
    }
    home(i) { return [52 + i * 54, 280]; }
    spot(n) { const a = n / 12 * Math.PI * 2; return [this.cx + Math.sin(a) * (this.R - 22), this.cy - Math.cos(a) * (this.R - 22)]; }
    update(dt, p) {
        if (!this.h.grab && p.pressed) { let best = null, bd = 36; for (const n of MISSING) { if (this.s.placed[n]) continue; const v = this.vis[n], q = Math.hypot(p.x - v[0], p.y - v[1]); if (q < bd) { bd = q; best = n; } } if (best) { this.drag = best; this.ui.snd.paper(); } }
        if (this.drag) {
            const n = this.drag, v = this.vis[n];
            if (p.down) { v[0] = p.x; v[1] = p.y - 10; }
            else {
                const q = this.spot(n); if (Math.hypot(v[0] - q[0], v[1] - q[1]) < 34) { this.s.placed[n] = 1; this.ui.snd.snap(); } else { this.ui.snd.tapSoft(); }
                this.drag = null; this.check();
            }
        } else if (this.h.update(p)) { this.s.m = this.h.m; this.check(); }
        MISSING.forEach((n, i) => { if (this.drag !== n) { const q = this.s.placed[n] ? this.spot(n) : this.home(i), v = this.vis[n]; v[0] = ease(v[0], q[0], 14, dt); v[1] = ease(v[1], q[1], 14, dt); } });
    }
    check() { if (MISSING.every((n) => this.s.placed[n]) && this.h.m === 11 * 60 + 10) { this.ui.snd.solved(); this.done(); } }
    draw(d) {
        const { cx, cy, R } = this;
        drawFace(d, cx, cy, R, this.h.m, { bare: true, face: "#f7f3e8" });
        for (let i = 1; i <= 12; i++) { if (MISSING.includes(i)) { continue; } const q = this.spot(i); d.text(i, { x: q[0], y: q[1], size: 18, bold: true, color: INKC, font: HAND }); }
        MISSING.forEach((n) => { const v = this.vis[n]; if (!this.s.placed[n]) d.circle(18, { x: v[0], y: v[1], color: "#fff", opacity: 0.7 }); d.text(n, { x: v[0], y: v[1], size: 20, bold: true, color: INKC, font: HAND }); });
    }
    bot() {
        for (const n of MISSING) if (!this.s.placed[n]) { const v = this.vis[n], q = this.spot(n); return { drag: [v[0], v[1], q[0], q[1] + 10] }; }
        const tgt = 11 * 60 + 10, cur = this.h.m; if (cur === tgt) return { wait: 3 };
        const { cx, cy, R } = this, diff = (((tgt - cur) % 720) + 720) % 720, useHour = diff >= 60, gr = useHour ? 0.5 : 0.8, a0 = useHour ? (cur / 60 % 12) / 12 * Math.PI * 2 : (cur % 60) / 60 * Math.PI * 2, a1 = a0 + (useHour ? Math.PI / 6 : Math.PI / 6);
        return { drag: [cx + Math.sin(a0) * R * gr, cy - Math.cos(a0) * R * gr, cx + Math.sin(a1) * R * gr, cy - Math.cos(a1) * R * gr] };
    }
}

// --- The gate: every door's ritual -----------------------------------------------------------------------------------
class Gate extends Widget {
    init() { return {}; }
    constructor(ui, def, saved) { super(ui, def, saved); this.v = 0; this.drag = false; this.hit = 0; this.shred = []; const q = BIRD[def.hole]; this.hx = 160 + q[0] * 270 * 0.46; this.hy = 228 + q[1] * 124 * 0.8; }
    update(dt, p) {
        this.hit = Math.max(0, this.hit - dt * 3);
        if (this.def.last && !this.clipped) { this.hb = (this.hb ?? 0) + dt; if (this.hb > 0.8) { this.hb = 0; this.ui.snd.heart(0.85); } }
        if (this.clipped) { this.v = Math.max(0, this.v - dt * 2.4); this.wait = (this.wait ?? 0) + dt; for (const q of this.shred) { q[1] += q[3] * dt; q[3] += 500 * dt; q[0] += q[2] * dt; } if (this.wait > 0.9) this.done(); return; }
        if (p.pressed && p.y < 170) { this.drag = true; this.y0 = p.y; }
        if (this.drag) {
            if (p.down) { const v = clamp((p.y - this.y0) / 90, 0, 1); if (Math.floor(v * 6) !== Math.floor(this.v * 6)) this.ui.snd.notch(0.6); this.v = v; if (v >= 1) this.clip(); }
            else { this.drag = false; if (!this.clipped) { if (p.y - this.y0 < 6) this.clip(); else this.v = 0; } }
        }
    }
    clip() { this.clipped = true; this.v = 1; this.hit = 1; this.ui.snd.clip(); this.ui.punched(this.def.hole); this.shred = [[this.hx, this.hy, -40, -160], [this.hx, this.hy, 50, -120]]; }
    draw(d) {
        const tx = 160, ty = 228, tw = 270, th = 124, S = 0.46;
        const q = BIRD[this.def.hole]; this.hx = tx + q[0] * tw * S; this.hy = ty + q[1] * th * 0.8;
        d.sprite("kit:ticket", { x: tx, y: ty, width: tw + 10, height: th + 10 });
        const n = this.ui.holes();
        for (let i = 0; i < n + (this.clipped ? 1 : 0) && i < 12; i++) { const b = BIRD[i]; d.circle(5, { x: tx + b[0] * tw * S, y: ty + b[1] * th * 0.8, color: "#14100c" }); }
        if (!this.clipped) d.circle(7 + Math.sin(this.ui.time * 5) * 2, { x: this.hx, y: this.hy, color: "#a83a34", opacity: 0.5 });
        for (const s of this.shred) d.circle(3.5, { x: s[0], y: s[1], color: "#e8d9b4" });
        const v = this.v, jy = 36 + v * (this.hy - 84), hx = this.hx;
        d.rect(74, 8, { x: hx, y: 26, color: BRD }); d.line({ x: hx, y: 26 }, { x: hx, y: jy }, { width: 12, color: "#8a7a5a" });
        d.rect(46, 40, { x: hx, y: jy + 18, color: BR, radius: 6 }); d.rect(36, 30, { x: hx - 1, y: jy + 16, color: "#f2d898", radius: 4 }); d.circle(9, { x: hx, y: jy + 44, color: "#3a2c1c" });
        if (v < 0.05 && !this.clipped) d.text("Press down", { x: 160, y: 16, size: 13, color: "#ffe0a8", opacity: 0.7 + Math.sin(this.ui.time * 3) * 0.3, font: SERIF });
    }
    bot() { if (this.clipped) return { wait: 10 }; return { drag: [160, 90, 160, 240] }; }
}

export const WIDGETS = { dials: Dials, combo: Combo, rush: Rush, track: Track, scale: Scale, slots: Slots, wipe: Wipe, punch: Punch, sequence: Sequence, telegraph: Telegraph, gears: Gears, watch: Watch, pins: Pins, overlay: Overlay, scope: Scope, levers: Levers, valves: Valves, clockface: ClockFace, gate: Gate };
export { drawFace };
