// The HUD and every gesture: a tray of cards, one-thumb placement with a score preview, drag to spin, pinch to zoom.
import { BUILDINGS, MAX_STARS, TRAY_ORDER } from "./data.js";
import { ICON } from "./art.js";
import { wallCut } from "./policy.js";

export const FONT = '"Arial Rounded MT Bold","Avenir Next Rounded","Nunito",ui-rounded,"Trebuchet MS",system-ui,sans-serif';
const INK = "#20505c", CREAM = "#fff6e4", CARD = "#fff6e4", TEAL = "#2f9c95", CORAL = "#e0694a", SHADOW = "#12333d55", PANEL = "#20505cd9";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

let meter = null;
const widths = new Map();
/** Real text width where a canvas exists, an estimate elsewhere. d.text centres its box, so left-aligned runs need this. */
export function widthOf(str, size) {
    const key = str;
    let w = widths.get(key);
    if (w === undefined) {
        try {
            meter = meter ?? (typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null);
            if (meter) { meter.font = `bold 100px ${FONT}`; w = meter.measureText(str).width / 100; }
        } catch { meter = null; }
        if (w === undefined) w = str.length * 0.54;
        if (widths.size > 400) widths.clear();
        widths.set(key, w);
    }
    return w * size;
}

export class Hud {
    constructor(s, game, snd, sim, world, o = {}) {
        this.s = s; this.game = game; this.snd = snd; this.sim = sim; this.w = world; this.o = o;
        this.sel = null;              // Selected building type.
        this.tile = null;             // Ghost's tile.
        this.prev = null;             // Preview of that tile.
        this.scroll = 0; this.scrollV = 0;
        this.g = null;                // Current gesture.
        this.pops = [];
        this.toasts = [];
        this.bubble = null;
        this.btns = [];
        this.modal = null;
        this.sheet = null;            // Inspected tile.
        this.speed = 1;
        this.goalPulse = [0, 0, 0];
        this.shownCoins = sim.coins;
        this.shownWood = sim.wood;
        this.t = 0;
        this.candidates = [];
        this.bump = { coin: 0, wood: 0, fish: 0, grain: 0 };
        this.floodView = false;
        this.coach = null;
        this.keys = [];
        this.lastTick = -1;
        if (typeof addEventListener === "function") {
            const onKey = (e) => { if (!e.repeat || /Arrow/.test(e.code)) this.keys.push(e.code); };
            addEventListener("keydown", onKey);
            s.on("leave", () => removeEventListener("keydown", onKey));
        }
    }

    get cards() { return TRAY_ORDER.filter((t) => this.sim.scn.unlocks.includes(t)); }

    layout() {
        const v = this.s.view, sf = v.safe, W = v.width, H = v.height;
        const L = sf.left + 6, R = W - sf.right - 6, T = sf.top + 6, B = H - sf.bottom - 6, land = W > H * 1.1;
        const cardH = land ? 58 : 80, cardW = land ? 58 : 66, trayH = cardH + 10;
        this.m = { W, H, L, R, T, B, land, cardW, cardH, trayH, trayY: B - trayH / 2, cx: (L + R) / 2 };
        const count = this.cards.length, total = count * (cardW + 6) - 6;
        this.maxScroll = Math.max(0, total - (R - L - 8));
        const btns = [];
        const add = (id, x, y, w, h, fn, extra = {}) => btns.push({ id, x, y, w, h, fn, ...extra });
        const top = T + 15;
        if (this.modal) {
            const m = this.modal, pw = Math.min(R - L, 330), bw = (pw - 28 - (m.buttons.length - 1) * 8) / m.buttons.length;
            m.buttons.forEach((b, i) => add(`modal${i}`, this.m.cx - pw / 2 + 14 + bw / 2 + i * (bw + 8), m.by ?? H / 2 + 70, bw, 46, b.fn, { label: b.label, primary: !i, modal: true }));
            if (m.toggles) m.toggles.forEach((b, i) => add(`tog${i}`, this.m.cx, H / 2 + (i - (m.toggles.length - 1) / 2) * 50 - 34, pw - 40, 42, b.fn, { label: b.label, toggle: b, modal: true }));
            this.btns = btns;
            return;
        }
        add("gear", R - 18, top, 36, 32, () => this.o.onSettings?.(), { icon: ICON.cog });
        if (!this.o.noSpeed) add("speed", R - 60, top, 42, 32, () => this.cycleSpeed(), { speed: true });
        const trayTop = B - trayH;
        if (this.sel) {
            const barY = trayTop - 42, plonkW = land ? 88 : 104;
            const label = this.prev?.ok ? "Plonk!" : this.prev?.poor ? "Save up" : "Plonk!";
            add("plonk", R - plonkW / 2 - 2, barY, plonkW, 66, () => this.plonk(), { label, plonk: true });
            add("cancel", R - plonkW - 36, barY + 15, 36, 30, () => this.deselect(), { icon: ICON.close, soft: true });
        }
        if (this.sheet !== null) {
            const c = this.sim.cells[this.sheet];
            if (c.b && c.b.type !== "hall") add("demolish", R - 58, B - trayH - 34, 104, 46, () => this.demolish(c), { label: "Demolish", danger: true });
        }
        this.btns = btns;
    }

    btn(id) { return this.btns.find((b) => b.id === id) ?? null; }
    cardRect(i) {
        const m = this.m;
        const x = m.L + 4 + m.cardW / 2 + i * (m.cardW + 6) - this.scroll, y = m.trayY;
        return { x, y, w: m.cardW, h: m.cardH };
    }
    inTray(x, y) { return y > this.m.B - this.m.trayH - 2 && !this.modal; }
    cycleSpeed() { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : this.speed === 4 ? 0 : 1; this.snd.tap(); }

    say(text, sec = 6, pin = false) { this.bubble = { text, t: 0, sec, pin }; }
    toast(text, o = {}) { this.toasts = this.toasts.filter((q) => q.text !== text).slice(-2); this.toasts.push({ text, t: 0, sec: o.sec ?? 2.6, color: o.color ?? TEAL, big: !!o.big }); }

    pop(cell, text, o = {}) {
        if (this.pops.length > 16) this.pops.shift();
        const c = this.sim.cells[cell];
        this.pops.push({ x: c.x, y: this.w.surface(c) + (o.h ?? 0.7), z: c.z, text, icon: o.icon ?? null, t: 0, color: o.color ?? "#ffffff", big: o.big ?? 1 });
    }

    // --- Choosing and placing --------------------------------------------------------------------

    select(type) {
        this.sheet = null;
        if (this.sel === type) { this.deselect(); return; }
        this.sel = type;
        this.snd.tap();
        this.refreshCandidates();
        const best = this.bestTile();
        this.moveGhost(best, true);
        this.o.onSelect?.(type);
    }

    deselect() {
        this.sel = null; this.tile = null; this.prev = null; this.candidates = []; this.w.ghost = null; this.w.rings = [];
    }

    refreshCandidates() {
        const sim = this.sim, list = [];
        if (!this.sel) return;
        for (const c of sim.cells) {
            if (c.h < 0 || c.b) continue;
            const p = sim.preview(this.sel, c);
            if (p.ok || p.poor) list.push({ cell: c.i, delta: this.sel === "wall" ? p.saves : p.delta, risk: this.sel !== "wall" && p.atRisk });
        }
        this.gaps = new Set();
        if (this.sel === "wall") {
            // Gold marks the gaps: the fewest tiles that would keep the sea from the town at the coming level.
            const level = sim.testLevel, reach = sim.floodMap(level), low = [];
            for (const b of sim.buildings) {
                const B = BUILDINGS[b.type];
                if (b.type !== "wall" && !B.stilts && reach[b.cell]) low.push(b.cell);
            }
            for (const c of sim.cells) if (c.h >= 1 && c.h < level && !c.b && reach[c.i] && c.n.some((j) => sim.cells[j].b && !BUILDINGS[sim.cells[j].b.type].stilts)) low.push(c.i);
            const cut = low.length ? wallCut(sim, low, level) : null;
            if (cut && !cut.impossible) this.gaps = new Set(cut.cut);
            for (const q of list) if (this.gaps.has(q.cell)) q.delta = Math.max(q.delta, 1);
        }
        this.candidates = list;
        this.top = list.reduce((m, q) => Math.max(m, q.risk ? -9 : q.delta), -9);
        this.paintRings();
    }

    paintRings() {
        const rings = [];
        for (const q of this.candidates) {
            const here = q.cell === this.tile;
            const color = q.risk ? [0.32, 0.62, 1.05] : q.delta >= this.top && this.top > 0 ? [1.1, 0.8, 0.22] : q.delta > 0 ? [0.55, 0.95, 0.5] : [0.92, 0.95, 0.9];
            rings.push({ cell: q.cell, color: color, scale: here ? 1.03 : 0.94 });
        }
        // Whatever the coming storm would drown shows as a faint blue line, so the gaps in a coast can be read.
        const level = this.sim.testLevel, map = this.sim.floodMap(level), taken = new Set(this.candidates.map((q) => q.cell));
        for (const c of this.sim.cells) if (c.h >= 1 && map[c.i] && !taken.has(c.i)) rings.push({ cell: c.i, color: [0.3, 0.55, 1], scale: 0.7 });
        this.w.rings = rings;
    }

    bestTile() {
        let best = null, score = -1e9;
        for (const q of this.candidates) {
            const c = this.sim.cells[q.cell], v = q.delta * 4 - (q.risk ? 14 : 0) - Math.hypot(c.x, c.z) * 0.02;
            if (v > score) { score = v; best = q.cell; }
        }
        return best;
    }

    moveGhost(cell, quiet) {
        if (cell === null || cell === undefined || cell === this.tile) return;
        this.tile = cell;
        const c = this.sim.cells[cell];
        this.prev = this.sim.preview(this.sel, c);
        const v = this.w;
        const stub = { id: 90000 + cell, type: this.sel, cell };
        v.vis.delete(stub.id);
        const vi = v.visOf(stub);
        v.vis.delete(stub.id);
        v.ghost = { type: this.sel, cell, variant: vi.variant, yaw: vi.yaw, ok: this.prev.ok || this.prev.poor };
        this.paintRings();
        if (!quiet) this.snd.tock();
    }

    /** The nearest allowed tile to a finger, so the ghost snaps and never lands on nonsense. */
    snapTo(px, py) {
        let best = null, bd = 1e9;
        const cam = this.s.cam3;
        for (const q of this.candidates) {
            const c = this.sim.cells[q.cell], p = cam.project([c.x, this.w.surface(c), c.z]), d = Math.hypot(p.x - px, p.y - py);
            if (d < bd) { bd = d; best = q.cell; }
        }
        return bd < 90 ? best : null;
    }

    plonk() {
        const sim = this.sim, c = this.tile === null ? null : sim.cells[this.tile], type = this.sel;
        if (!c) return;
        const p = sim.preview(type, c);
        if (!p.ok) { this.snd.deny(); this.toast(p.why, { color: CORAL }); this.shakeBtn = 0.3; return; }
        const before = sim.cheer, b = sim.place(type, c);
        if (!b) return;
        this.o.onPlace?.(b, c, p, sim.cheer - before);
        this.tile = null;
        this.refreshCandidates();
        const [coins, wood] = BUILDINGS[type].cost;
        if (this.candidates.length && sim.coins >= coins && sim.wood >= wood) this.moveGhost(this.bestTile(), true);
        else this.deselect();
    }

    demolish(c) {
        const b = c.b;
        this.sheet = null;
        if (b && this.sim.demolish(c)) this.o.onDemolish?.(c, b);
    }

    // --- Input -----------------------------------------------------------------------------------

    update(dt) {
        const s = this.s, input = s.input, ptr = input.pointer, cam = this.w.cam;
        this.t += dt;
        if (this.modal) this.modal.t = (this.modal.t ?? 0) + dt;
        this.layout();
        for (const k of this.keys.splice(0)) this.key(k);
        const touches = input.touches;
        if (input.wheel) this.zoomBy(Math.exp(input.wheel * 0.0012));
        // Two fingers: pinch zooms, twisting spins.
        if (touches.length >= 2 && !this.modal) {
            const [a, b] = touches, dist = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x);
            if (this.pinch) {
                this.zoomBy(this.pinch.dist / Math.max(1, dist));
                let d = ang - this.pinch.ang;
                if (d > Math.PI) d -= Math.PI * 2;
                if (d < -Math.PI) d += Math.PI * 2;
                cam.tYaw += d;
            }
            this.pinch = { dist, ang };
            this.g = null;
            return;
        }
        this.pinch = null;
        if (ptr.pressed) this.down(ptr.x, ptr.y);
        if (this.g) {
            if (ptr.down) this.move(ptr.x, ptr.y, ptr.dx, ptr.dy);
            if (ptr.released || !ptr.down) this.up(ptr.x, ptr.y, ptr.tapped);
        }
        // Tray inertia.
        if (!this.g || this.g.kind !== "tray") {
            this.scroll = clamp(this.scroll + this.scrollV * dt, 0, this.maxScroll);
            this.scrollV *= 1 - Math.min(1, dt * 5);
        }
        for (const q of this.pops) q.t += dt;
        this.pops = this.pops.filter((q) => q.t < 1.3);
        for (const q of this.toasts) q.t += dt;
        this.toasts = this.toasts.filter((q) => q.t < q.sec);
        if (this.bubble && !this.bubble.pin) { this.bubble.t += dt; if (this.bubble.t > this.bubble.sec) this.bubble = null; }
        this.shakeBtn = Math.max(0, (this.shakeBtn ?? 0) - dt);
        const k = Math.min(1, dt * 9);
        this.shownCoins += (this.sim.coins - this.shownCoins) * k;
        this.shownWood += (this.sim.wood - this.shownWood) * k;
        for (const n in this.bump) this.bump[n] = Math.max(0, this.bump[n] - dt * 4);
        this.goalPulse = this.goalPulse.map((v) => Math.max(0, v - dt));
        if (this.sel && this.sim.t !== this.lastTick && this.tile !== null) {
            this.lastTick = this.sim.t;
            const was = this.prev?.ok;
            this.prev = this.sim.preview(this.sel, this.sim.cells[this.tile]);
            if (this.w.ghost) this.w.ghost.ok = this.prev.ok || this.prev.poor;
            if (was !== this.prev.ok) this.layout();
        }
    }

    zoomBy(f) {
        const c = this.w.cam;
        c.tDist = clamp(c.tDist * f, c.minD, c.maxD);
    }

    key(code) {
        const c = this.w.cam;
        if (code === "ArrowLeft") c.tYaw -= 0.26;
        else if (code === "ArrowRight") c.tYaw += 0.26;
        else if (code === "ArrowUp") this.zoomBy(0.88);
        else if (code === "ArrowDown") this.zoomBy(1.14);
        else if (code === "Escape") { if (this.modal) this.btns.find((b) => b.primary)?.fn(); else if (this.sel) this.deselect(); else this.sheet = null; }
        else if (code === "Enter" || code === "Space") { if (this.modal) this.btns.find((b) => b.primary)?.fn(); else if (this.sel) this.plonk(); }
        else if (code === "KeyP") this.speed = this.speed ? 0 : 1;
        else if (code === "KeyF") this.cycleSpeed();
        else if (code === "Tab" && this.sel) this.cycleTile();
        else {
            const m = /^Digit(\d)$/.exec(code);
            if (m) { const t = this.cards[(+m[1] + 9) % 10]; if (t) { this.select(t); this.reveal(t); } }
        }
    }

    cycleTile() {
        if (!this.candidates.length) return;
        const i = this.candidates.findIndex((q) => q.cell === this.tile);
        this.moveGhost(this.candidates[(i + 1) % this.candidates.length].cell);
    }

    reveal(type) {
        const i = this.cards.indexOf(type), r = this.cardRect(i), m = this.m;
        if (r.x < m.L + m.cardW) this.scroll = clamp(this.scroll - (m.L + m.cardW - r.x), 0, this.maxScroll);
        if (r.x > m.R - m.cardW) this.scroll = clamp(this.scroll + (r.x - (m.R - m.cardW)), 0, this.maxScroll);
    }

    hitBtn(x, y) {
        for (let i = this.btns.length - 1; i >= 0; i--) {
            const b = this.btns[i];
            if (Math.abs(x - b.x) <= b.w / 2 + 2 && Math.abs(y - b.y) <= b.h / 2 + 2) return b;
        }
        return null;
    }

    down(x, y) {
        const b = this.hitBtn(x, y);
        if (this.bubble && !b && Math.hypot(x - this.m.cx, y - (this.bubbleY ?? -999)) < 120 && Math.abs(y - (this.bubbleY ?? -999)) < 36 && !this.bubble.pin) { this.bubble = null; }
        if (b) { this.g = { kind: "btn", b, x, y }; b.down = true; return; }
        if (this.modal) { this.g = { kind: "none", x, y }; return; }
        if (this.inTray(x, y)) {
            let card = null;
            this.cards.forEach((t, i) => { const r = this.cardRect(i); if (Math.abs(x - r.x) <= r.w / 2 + 3 && Math.abs(y - r.y) <= r.h / 2 + 4) card = t; });
            this.g = { kind: "tray", card, x, y, x0: x, y0: y, scroll0: this.scroll, moved: 0 };
            return;
        }
        // Grabbing the ghost drags it; anywhere else spins the island.
        if (this.sel && this.tile !== null) {
            const c = this.sim.cells[this.tile], p = this.s.cam3.project([c.x, this.w.surface(c), c.z]);
            if (Math.hypot(p.x - x, p.y - (y + 8)) < 62) { this.g = { kind: "ghost", x, y, x0: x, y0: y, moved: 0 }; return; }
        }
        this.g = { kind: "spin", x, y, x0: x, y0: y, moved: 0 };
    }

    move(x, y, dx, dy) {
        const g = this.g;
        g.moved = Math.max(g.moved ?? 0, Math.hypot(x - g.x0, y - g.y0));
        if (g.kind === "tray") {
            // A card pulled up out of the tray becomes a drag-and-drop placement.
            if (g.card && !g.lift && y < this.m.B - this.m.trayH - 16) {
                if (this.sel !== g.card) { this.sel = null; this.select(g.card); }
                g.kind = "drag";
                return;
            }
            this.scroll = clamp(g.scroll0 - (x - g.x0), 0, this.maxScroll);
            this.scrollV = -dx * 45;
        } else if (g.kind === "spin") {
            const cam = this.w.cam;
            cam.tYaw -= dx * 0.0085;
            cam.tPitch = clamp(cam.tPitch + dy * 0.004, 0.55, 1.28);
        } else if (g.kind === "ghost" || g.kind === "drag") {
            // Ghost sits above the thumb, so the finger never hides it.
            const c = this.snapTo(x, y - 46);
            if (c !== null) this.moveGhost(c);
        }
    }

    up(x, y, tapped) {
        const g = this.g;
        this.g = null;
        if (g.kind === "btn") {
            const b = this.hitBtn(x, y);
            g.b.down = false;
            if (b && b.id === g.b.id) b.fn();
            return;
        }
        if (g.kind === "tray") {
            if (g.card && (g.moved ?? 0) < 12) this.select(g.card);
            return;
        }
        if (g.kind === "drag") {
            if (this.sel && this.prev?.ok && y < this.m.B - this.m.trayH) this.plonk();
            return;
        }
        if ((g.moved ?? 0) < 12 && g.kind !== "none") {
            const c = this.w.pick(x, y);
            if (this.sel) {
                const near = this.snapTo(x, y);
                if (near !== null) {
                    if (near === this.tile && g.kind === "ghost") this.plonk();
                    else this.moveGhost(near);
                }
            } else if (c && c.b) {
                this.sheet = this.sheet === c.i ? null : c.i;
                this.snd.tock();
            } else this.sheet = null;
        }
    }

    // --- Drawing ---------------------------------------------------------------------------------

    panel(d, x, y, w, h, o = {}) {
        d.rect(w, h, { x, y: y + 2, color: o.shadow ?? SHADOW, radius: o.radius ?? 10 });
        d.rect(w, h, { x, y, color: o.color ?? CARD, radius: o.radius ?? 10 });
    }

    icon(d, name, x, y, size = 18, dark = false, color) {
        d.sprite(dark ? "iconsDark" : "icons", { frame: ICON[name] ?? name, x, y, width: size, height: size, color });
    }

    text(d, str, x, y, size, color = INK, o = {}) {
        d.text(str, { x, y, size, color, bold: o.bold ?? true, font: FONT, align: o.align });
    }

    /** d.text centres its box, so measure with the framework's text sizing rule of thumb and offset left-aligned runs. */
    leftText(d, str, x, y, size, color = INK) {
        d.text(str, { x: x + widthOf(str, size) / 2, y, size, color, bold: true, font: FONT });
    }

    draw(d) {
        const m = this.m;
        if (!m) return;
        this.drawPops(d);
        this.drawBadges(d);
        if (this.sel) this.drawRingChips(d);
        this.drawTop(d);
        if (!this.o.noTray) this.drawTray(d);
        if (this.sel) this.drawPreview(d);
        else if (this.sheet !== null) this.drawSheet(d);
        this.drawBubble(d);
        this.drawToasts(d);
        for (const b of this.btns) if (!b.modal) this.drawBtn(d, b);
        if (this.modal) this.drawModal(d);
    }

    drawBtn(d, b) {
        if (b.plonk) {
            const ok = this.prev?.ok, pulse = ok ? 1 + Math.sin(this.t * 6) * 0.025 : 1, ox = this.shakeBtn > 0 ? Math.sin(this.t * 60) * 4 : 0, press = b.down ? 3 : 0;
            d.rect(b.w, b.h, { x: b.x + ox, y: b.y + 5, color: ok ? "#a84a30" : "#6c7f86", radius: 18 });
            d.rect(b.w * pulse, b.h * pulse, { x: b.x + ox, y: b.y + press, color: ok ? CORAL : "#92a4a8", radius: 18 });
            d.rect(b.w * 0.8, 12, { x: b.x + ox, y: b.y + press - b.h * 0.32, color: "#ffffff2e", radius: 6 });
            this.text(d, b.label, b.x + ox, b.y + press - (ok ? 0 : 0), ok ? 23 : 18, "#fff");
            return;
        }
        if (b.speed) {
            this.panel(d, b.x, b.y, b.w, b.h, { color: PANEL });
            if (this.speed === 0) this.icon(d, "pause", b.x, b.y, 18);
            else if (this.speed === 1) this.icon(d, "play", b.x, b.y, 18);
            else { this.icon(d, "ff", b.x - 6, b.y, 18); this.text(d, `${this.speed}`, b.x + 13, b.y, 13, "#fff"); }
            return;
        }
        if (b.danger) {
            this.panel(d, b.x, b.y, b.w, b.h, { color: "#c2543e", radius: 12 });
            this.icon(d, "bin", b.x - 34, b.y, 18);
            this.text(d, b.label, b.x + 10, b.y, 14, "#fff");
            return;
        }
        if (b.soft) {
            d.rect(b.w - 4, b.h - 4, { x: b.x, y: b.y, color: "#20505c22", radius: 9 });
            d.sprite("iconsDark", { frame: b.icon, x: b.x, y: b.y, width: 15, height: 15 });
            return;
        }
        if (b.icon !== undefined) {
            this.panel(d, b.x, b.y, b.w, b.h, { color: PANEL, radius: b.round ? b.w / 2 : 10 });
            d.sprite("icons", { frame: b.icon, x: b.x, y: b.y, width: 20, height: 20 });
        }
    }

    drawTop(d) {
        const m = this.m, sim = this.sim, top = m.T + 15;
        const pills = [
            ["coin", Math.round(this.shownCoins), this.bump.coin],
            ["wood", Math.round(this.shownWood), this.bump.wood],
            ["fish", sim.fish, this.bump.fish],
            ["grain", sim.grain, this.bump.grain],
        ];
        const pw = m.land ? 62 : 52, room = m.R - m.L - (this.o.noSpeed ? 40 : 84);
        const folkW = m.land ? 72 : 60;
        const w = Math.min(pw, (room - folkW - 4 * 3) / 4);
        let x = m.L + w / 2;
        d.rect(pills.length * (w + 3) + folkW + 2, 32, { x: m.L + (pills.length * (w + 3) + folkW) / 2, y: top + 2, color: SHADOW, radius: 10 });
        d.rect(pills.length * (w + 3) + folkW + 2, 32, { x: m.L + (pills.length * (w + 3) + folkW) / 2, y: top, color: PANEL, radius: 10 });
        for (const [name, val, b] of pills) {
            const s = 18 * (1 + b * 0.5);
            this.icon(d, name, x - w / 2 + 12, top, s);
            this.text(d, String(val), x + 11, top, val > 999 ? 11 : 13.5, "#fff");
            x += w + 3;
        }
        const fx = x - w / 2 + folkW / 2;
        const short = sim.spare <= 0 && sim.buildings.some((b) => !b.staffed);
        this.icon(d, "folk", fx - folkW / 2 + 11, top, 18);
        this.text(d, `${sim.spare}/${sim.folk}`, fx + 9, top, 13.5, short ? "#ffb49e" : "#fff");
        // Date, cheer, storm.
        const y2 = top + 26 + (m.land ? 2 : 3);
        const date = `${sim.season} · Day ${sim.day + 1}`;
        const dw = date.length * 6.9 + 22;
        this.panel(d, m.L + dw / 2, y2, dw, 22, { color: PANEL, radius: 8 });
        this.text(d, date, m.L + dw / 2, y2, 12.5, "#fff");
        const cx = m.L + dw + 6 + 30;
        this.panel(d, cx, y2, 60, 22, { color: PANEL, radius: 8 });
        this.icon(d, "star", cx - 18, y2, 15);
        this.text(d, String(sim.cheer), cx + 10, y2, 13, "#ffe9a8");
        // Forecast.
        const fc = sim.forecast;
        let nx = cx + 36;
        if (sim.storm) {
            const text = `Storm! ${sim.storm.level.toFixed(1)}`;
            const fw = text.length * 6.4 + 34;
            const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
            this.panel(d, nx + fw / 2, y2, fw, 22, { color: pulse > 0.5 ? "#c2543e" : "#a84a30", radius: 8 });
            this.icon(d, "wave", nx + 12, y2, 15);
            this.text(d, text, nx + fw / 2 + 8, y2, 12, "#fff");
            nx += fw + 4;
        } else if (fc) {
            const hrs = Math.ceil(fc.hours / 24), text = `Storm ${hrs}d · ${fc.level.toFixed(1)}`;
            const fw = text.length * 6.4 + 30;
            const near = hrs <= 2;
            this.panel(d, nx + fw / 2, y2, fw, 22, { color: near ? "#c2543e" : "#33557a", radius: 8 });
            this.icon(d, "wave", nx + 12, y2, 15);
            this.text(d, text, nx + fw / 2 + 8, y2, 12, "#fff");
        }
        this.drawGoals(d, y2 + 13);
        this.drawGauge(d, top);
    }

    drawGoals(d, y0) {
        const sim = this.sim, m = this.m, goals = sim.scn.goals;
        if (!goals.length) return;
        const lh = 19, pw = m.land ? 196 : Math.min(258, m.R - m.L - 30), h = goals.length * lh + 8;
        d.rect(pw, h, { x: m.L + pw / 2, y: y0 + h / 2, color: "#ffffffb8", radius: 9 });
        goals.forEach((g, i) => {
            const y = y0 + 5 + i * lh + lh / 2, done = sim.goalDone[i], p = this.goalPulse[i] ?? 0;
            if (done) this.icon(d, "check", m.L + 12, y, 15 * (1 + p));
            else d.circle(5, { x: m.L + 12, y, color: "#20505c33" });
            const val = Math.min(sim.goalValue(g), sim.goalTarget(g)), tg = sim.goalTarget(g);
            const tail = done || g.type === "ride" ? "" : ` ${val}/${tg}`;
            const str = g.text + tail, size = m.land ? 10.5 : 11.5;
            this.leftText(d, str, m.L + 23, y, Math.min(size, (pw - 28) / (str.length * 0.54)), done ? "#4d8c6a" : INK);
        });
    }

    /** The tide staff: land heights as coloured bands, the sea as a rising fill. */
    drawGauge(d, top) {
        const m = this.m, sim = this.sim, x = m.R - 9, y0 = top + (m.land ? 44 : 50), h = m.land ? 104 : 120, per = h / 3.4;
        const yOf = (l) => y0 + h - (l + 0.7) * per;
        d.rect(20, h + 8, { x, y: y0 + h / 2, color: SHADOW, radius: 8 });
        d.rect(18, h + 4, { x, y: y0 + h / 2, color: CARD, radius: 7 });
        const bands = [[-0.7, 0, "#8fd0e0"], [0, 1, "#f2dfa9"], [1, 2, "#9ad27a"], [2, 2.7, "#6db567"]];
        for (const [a, b, c] of bands) d.rect(10, yOf(a) - yOf(b), { x, y: (yOf(a) + yOf(b)) / 2, color: c, radius: 1 });
        const wl = clamp(this.w.water, -0.7, 2.7), wy = yOf(wl);
        d.rect(10, Math.max(0, y0 + h - wy), { x, y: (wy + y0 + h) / 2, color: "#2a9fc5cc", radius: 1 });
        d.rect(14, 3, { x, y: wy, color: "#fff", radius: 1 });
        const fc = sim.storm ? { level: sim.storm.level } : sim.forecast;
        if (fc) {
            const ly = yOf(Math.min(2.7, fc.level));
            d.rect(16, 3, { x, y: ly, color: CORAL, radius: 1 });
        }
    }

    drawTray(d) {
        const m = this.m, sim = this.sim;
        d.rect(m.R - m.L + 8, m.trayH + 8, { x: m.cx, y: m.trayY + 4, color: "#20505cb0", radius: 16 });
        d.clip(m.L, m.B - m.trayH - 22, m.R - m.L, m.trayH + 28, () => {
            this.cards.forEach((t, i) => {
                const r = this.cardRect(i), on = this.sel === t, B = BUILDINGS[t];
                if (r.x < m.L - r.w || r.x > m.R + r.w) return;
                const can = sim.coins >= B.cost[0] && sim.wood >= B.cost[1];
                const dy = on ? -10 : 0, coach = this.coachCard === t ? Math.sin(this.t * 7) * 3 - 3 : 0;
                this.panel(d, r.x, r.y + dy + coach, r.w, r.h, { color: on ? "#ffe9a8" : CARD, radius: 11 });
                if (this.coachCard === t) d.rect(r.w + 4, r.h + 4, { x: r.x, y: r.y + coach, outline: 3, color: CORAL, radius: 13 });
                const size = r.w - 8, y = r.y + dy + coach - (r.h > 70 ? 11 : 9);
                this.cardArt(d, t, r.x, y, Math.min(size, r.h - 26), can);
                const py = r.y + dy + coach + r.h / 2 - 12;
                let px = r.x - 24;
                this.icon(d, "coin", px + 6, py, 12, false, can ? undefined : "#ffffff88");
                this.text(d, String(B.cost[0]), px + 19, py, 11.5, sim.coins >= B.cost[0] ? INK : "#b64a36");
                px += 28;
                if (B.cost[1]) {
                    this.icon(d, "wood", px + 6, py, 12, false, can ? undefined : "#ffffff88");
                    this.text(d, String(B.cost[1]), px + 18, py, 11.5, sim.wood >= B.cost[1] ? INK : "#b64a36");
                }
            });
        });
    }

    cardArt(d, t, x, y, size, can) {
        const f = this.o.cardFrame?.(t);
        if (f === undefined) { this.text(d, BUILDINGS[t].name.slice(0, 7), x, y, 11); return; }
        d.sprite("cards", { frame: f, x, y, width: size, height: size });
        if (!can) d.rect(size, size, { x, y, color: "#fff6e4a6" });
    }

    drawPreview(d) {
        const m = this.m, p = this.prev, B = BUILDINGS[this.sel];
        if (!p) return;
        const plonkW = m.land ? 88 : 104, w = m.land ? 186 : m.R - m.L - plonkW - 10, x0 = m.R - plonkW - 10 - w, y = m.B - m.trayH - 42, cx = x0 + w / 2;
        this.panel(d, cx, y, w, 66, { radius: 14 });
        const size = w > 250 ? 15 : 14;
        this.leftText(d, B.name, x0 + 10, y - 20, size);
        // The stars this tile earns, big and readable.
        for (let i = 0; i < MAX_STARS; i++) d.sprite("iconsDark", { frame: i < p.stars ? ICON.star : ICON.starOff, x: x0 + 18 + i * 19, y: y + 2, width: 20, height: 20, color: i < p.stars ? undefined : "#20505c30" });
        const wall = this.sel === "wall", score = wall ? p.saves + (this.gaps?.has(this.tile) && !p.saves ? 1 : 0) : p.delta, sign = score > 0 ? "+" : "";
        const tx = x0 + w - 28;
        d.rect(46, 30, { x: tx, y: y - 14, color: score > 0 ? "#3aa76a" : score < 0 ? CORAL : "#9fb3b4", radius: 9 });
        this.text(d, `${sign}${score}`, tx, y - 14, 19, "#fff");
        let line;
        if (!p.ok) line = p.why;
        else if (wall) line = p.saves ? `Keeps ${p.saves} tile${p.saves > 1 ? "s" : ""} dry at level ${this.sim.testLevel.toFixed(1)}` : this.gaps?.has(this.tile) ? `A gap: ${this.gaps.size} to plug against ${this.sim.testLevel.toFixed(1)}` : `Holds to ${p.safe.toFixed(0)}. No gap here`;
        else if (p.atRisk) line = `Floods above ${p.safe.toFixed(1)}, storm is ${this.sim.nextStorm.level.toFixed(1)}`;
        else if (this.sim.spare < B.staff) line = "No spare folk: it would sit idle";
        else line = p.output;
        const color = !p.ok ? "#b64a36" : p.atRisk ? "#2a6fc4" : this.sim.spare < B.staff ? "#b64a36" : "#4d7c7f";
        const fit = Math.min(12.5, (w - 18) / (line.length * 0.54));
        this.leftText(d, line, x0 + 10, y + 22, fit, color);
    }

    drawRingChips(d) {
        const cam = this.s.cam3;
        // Neighbours light up with what this tile would give or take.
        const p = this.prev;
        if (p && this.tile !== null) {
            const seen = new Map();
            for (const q of p.parts) if (q.cell !== this.tile) seen.set(q.cell, (seen.get(q.cell) ?? 0) + q.v);
            for (const q of p.links) seen.set(q.cell, (seen.get(q.cell) ?? 0) + q.v);
            for (const [cell, v] of seen) {
                const c = this.sim.cells[cell], t = cam.project([c.x, this.w.surface(c) + 0.55, c.z]);
                const good = v > 0;
                d.rect(30, 19, { x: t.x, y: t.y, color: good ? "#2f8f5e" : "#c2543e", radius: 9 });
                this.text(d, `${good ? "+" : ""}${v}`, t.x, t.y, 12.5, "#fff");
            }
            const c = this.sim.cells[this.tile], t = cam.project([c.x, this.w.surface(c) + 1.5, c.z]);
            const score = this.sel === "wall" ? p.saves + (this.gaps?.has(this.tile) && !p.saves ? 1 : 0) : p.delta;
            d.rect(40, 26, { x: t.x, y: t.y + Math.sin(this.t * 4.4) * 3, color: score > 0 ? "#ffcf4a" : score < 0 ? "#ffb49e" : CARD, radius: 12 });
            this.text(d, `${score > 0 ? "+" : ""}${score}`, t.x, t.y + Math.sin(this.t * 4.4) * 3, 17, INK);
        }
    }

    drawPops(d) {
        const cam = this.s.cam3;
        for (const q of this.pops) {
            const p = cam.project([q.x, q.y + q.t * 0.5, q.z]), k = q.t / 1.3;
            const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1, s = (k < 0.12 ? k / 0.12 * 1.2 : 1) * q.big;
            const hexA = Math.round(a * 255).toString(16).padStart(2, "0");
            const w = q.text.length * 7 * s;
            if (q.icon) d.sprite("icons", { frame: ICON[q.icon], x: p.x - w / 2 - 9 * s, y: p.y, width: 17 * s, height: 17 * s, color: `#ffffff${hexA}` });
            d.text(q.text, { x: p.x + 1, y: p.y + 1, size: 15 * s, bold: true, font: FONT, color: `#12333d${hexA}` });
            d.text(q.text, { x: p.x, y: p.y, size: 15 * s, bold: true, font: FONT, color: `${q.color}${hexA}`.slice(0, 9) });
        }
    }

    drawBadges(d) {
        const cam = this.s.cam3, sim = this.sim;
        for (const b of sim.buildings) {
            let icon = null;
            if (b.type === "lane" || b.type === "wall" && !b.wrecked) continue;
            if (b.wrecked) icon = "hammer";
            else if (b.wet || b.soak) icon = "drop";
            else if (!b.connected) icon = "link";
            else if (!b.staffed) icon = "zed";
            if (!icon) continue;
            const c = sim.cells[b.cell], p = cam.project([c.x, this.w.surface(c) + 0.8, c.z]);
            d.circle(11, { x: p.x, y: p.y + 1, color: SHADOW });
            d.circle(11, { x: p.x, y: p.y, color: CARD });
            this.icon(d, icon, p.x, p.y, 16, true);
        }
    }

    drawSheet(d) {
        const c = this.sim.cells[this.sheet], b = c?.b;
        if (!b) { this.sheet = null; return; }
        const m = this.m, B = BUILDINGS[b.type], y = m.B - m.trayH - 42, w = m.R - m.L - (b.type === "hall" ? 0 : 114), x0 = m.L, cx = x0 + w / 2;
        this.panel(d, cx, y, w, 66, { radius: 14 });
        this.leftText(d, B.name, x0 + 10, y - 20, 15);
        for (let i = 0; i < MAX_STARS; i++) d.sprite("iconsDark", { frame: i < b.stars ? ICON.star : ICON.starOff, x: x0 + 18 + i * 19, y: y + 2, width: 20, height: 20, color: i < b.stars ? undefined : "#20505c30" });
        const state = b.wrecked ? "Wrecked. Crews will mend it when they can pay" : b.wet ? "Under water!" : b.soak ? "Drying out" : !b.connected ? "Not linked to the Hall" : !b.staffed ? "No folk to work here" : this.sim.outputOf(b.type, b.stars) || B.blurb;
        const fit = Math.min(12.5, (w - 18) / (state.length * 0.54));
        this.leftText(d, state, x0 + 10, y + 22, fit, b.wrecked || !b.connected || !b.staffed ? "#b64a36" : "#4d7c7f");
    }

    drawBubble(d) {
        const b = this.bubble, m = this.m;
        if (!b) return;
        const room = this.sel || this.sheet !== null ? 84 : 12;
        const k = Math.min(1, b.t * 7 + (b.pin ? 1 : 0));
        const w = Math.min(m.R - m.L, 340), size = 13.5, maxW = w - 64, words = b.text.split(" "), lines = [""];
        for (const word of words) {
            const l = lines[lines.length - 1], next = l ? `${l} ${word}` : word;
            if (widthOf(next, size) > maxW) lines.push(word); else lines[lines.length - 1] = next;
        }
        const h = Math.max(50, lines.length * 17 + 14), y = m.B - m.trayH - room - h / 2 - (1 - k) * 10;
        this.bubbleY = y;
        const x0 = m.cx - w / 2;
        this.panel(d, m.cx, y, w, h, { radius: 14 });
        d.sprite("nell", { x: x0 + 26, y, width: 44, height: 44 });
        lines.forEach((l, i) => this.leftText(d, l, x0 + 54, y + (i - (lines.length - 1) / 2) * 17, size));
    }

    drawToasts(d) {
        const m = this.m;
        this.toasts.forEach((q, i) => {
            const y = m.H * 0.3 + i * 40, k = Math.min(1, q.t * 8), a = q.t > q.sec - 0.3 ? (q.sec - q.t) / 0.3 : 1;
            const size = q.big ? 21 : 15, w = q.text.length * size * 0.58 + 34, h = q.big ? 42 : 32;
            const hex = Math.round(a * 255).toString(16).padStart(2, "0");
            d.push();
            d.translate(m.cx, y);
            d.scale(0.8 + k * 0.2, 0.8 + k * 0.2);
            d.rect(w, h, { y: 2, color: `#12333d${Math.round(a * 85).toString(16).padStart(2, "0")}`, radius: 14 });
            d.rect(w, h, { color: `${q.color}${hex}`, radius: 14 });
            d.text(q.text, { size, bold: true, font: FONT, color: `#ffffff${hex}` });
            d.pop();
        });
    }

    drawModal(d) {
        const m = this.modal, L = this.m, pw = Math.min(L.R - L.L, 330), toggles = m.toggles?.length ?? 0;
        d.rect(L.W, L.H, { x: L.W / 2, y: L.H / 2, color: "#12333d66" });
        const ph = m.height ?? 240, cy = L.H / 2;
        const k = Math.min(1, (m.t ?? 0) * 6), sc = 0.86 + k * 0.14 + Math.sin(k * Math.PI) * 0.05;
        d.push();
        d.translate(L.cx, cy);
        d.scale(sc, sc);
        d.rect(pw, ph, { y: 4, color: SHADOW, radius: 22 });
        d.rect(pw, ph, { color: CARD, radius: 22 });
        const y0 = -ph / 2;
        this.text(d, m.title, 0, y0 + 32, 25, INK);
        if (m.stars !== undefined) {
            for (let i = 0; i < 3; i++) {
                const on = i < m.stars, t = clamp(((m.t ?? 0) - 0.2 - i * 0.22) * 5, 0, 1), s = on ? 44 * (t < 1 ? t * 1.3 : 1) : 40;
                d.sprite("iconsDark", { frame: on ? ICON.star : ICON.starOff, x: (i - 1) * 54, y: y0 + 78, width: s, height: s, color: on ? undefined : "#20505c30" });
            }
        }
        (m.lines ?? []).forEach((l, i) => this.text(d, l, 0, y0 + (m.stars !== undefined ? 118 : 70) + i * 21, 14, "#3f7078", { bold: false }));
        d.pop();
        for (const b of this.btns) {
            if (!b.modal) continue;
            if (b.toggle) {
                const on = b.toggle.on();
                d.rect(b.w, b.h, { x: b.x, y: b.y, color: "#20505c14", radius: 12 });
                this.leftText(d, b.label, b.x - b.w / 2 + 14, b.y, 15);
                d.rect(46, 26, { x: b.x + b.w / 2 - 34, y: b.y, color: on ? TEAL : "#b9c5c5", radius: 13 });
                d.circle(11, { x: b.x + b.w / 2 - 34 + (on ? 10 : -10), y: b.y, color: "#fff" });
                continue;
            }
            const press = b.down ? 2 : 0;
            d.rect(b.w, b.h, { x: b.x, y: b.y + 4, color: b.primary ? "#a84a30" : "#1a7a74", radius: 14 });
            d.rect(b.w, b.h, { x: b.x, y: b.y + press, color: b.primary ? CORAL : TEAL, radius: 14 });
            const size = Math.min(17, (b.w - 12) / (b.label.length * 0.56));
            this.text(d, b.label, b.x, b.y + press, size, "#fff");
        }
    }
}
