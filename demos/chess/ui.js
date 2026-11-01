// Everything flat: the plates, the toolbar, the score sheet and the menus. Reads from the controller `c`, tells it what was tapped.
import { layer, pos, tap, ui } from "./pogo.js";
import { CLUB } from "./ai.js";
import { SETS } from "./meshes.js";

export const SERIF = "Georgia, 'Times New Roman', serif";
const INK = "#f3e2bd", DIM = "#b99b6e", BRASS = "#d9ac5e", WOOD = "#21130c", WOOD2 = "#3a2315", EMBER = "#ff7a42", MOON = "#8fd8ff";

export function paintFaces(game) {
    const paint = (name, fn) => game.assets.paint(name, 128, 128, (p) => {
        p.circle(64, 64, 62, "#e6be78", "#7c4f22");
        p.circle(64, 64, 57, "#3a2315", "#160c07");
        fn(p, "#e9cd9a");
    }, { smooth: true });
    const bust = (p, c) => { p.ellipse(64, 124, 42, 34, c); p.rect(54, 80, 20, 22, c); };
    paint("face_pip", (p, c) => { bust(p, c); p.circle(64, 62, 25, c); p.poly([[42, 52], [52, 28], [62, 42], [70, 26], [78, 42], [90, 34], [88, 56]], "#7a4a24"); p.poly([[60, 30], [68, 12], [72, 32]], "#7a4a24"); p.circle(54, 64, 3, "#21130c").circle(74, 64, 3, "#21130c"); p.line(56, 75, 72, 75, "#a0553a", 2.4); });
    paint("face_odile", (p, c) => { bust(p, c); p.circle(64, 30, 15, "#b8aea0"); p.ellipse(64, 50, 30, 20, "#b8aea0"); p.circle(64, 64, 23, c); p.circle(54, 62, 7, "#3a2315").circle(54, 62, 5, c).circle(74, 62, 7, "#3a2315").circle(74, 62, 5, c); p.line(61, 62, 67, 62, "#3a2315", 2); p.circle(54, 62, 2, "#21130c").circle(74, 62, 2, "#21130c"); p.line(57, 76, 71, 76, "#a0553a", 2.2); });
    paint("face_vicar", (p, c) => { p.ellipse(64, 124, 44, 36, "#17120f"); p.rect(52, 92, 24, 8, "#f6f0e2"); p.rect(54, 78, 20, 15, c); p.circle(64, 58, 25, c); p.ellipse(40, 58, 5, 11, "#c7bfb2").ellipse(88, 58, 5, 11, "#c7bfb2"); p.circle(55, 58, 2.6, "#21130c").circle(73, 58, 2.6, "#21130c"); p.line(54, 50, 60, 51, "#c7bfb2", 2.4).line(68, 51, 74, 50, "#c7bfb2", 2.4); p.line(57, 70, 71, 70, "#7a4a24", 2); });
    paint("face_captain", (p, c) => { p.ellipse(64, 124, 44, 36, "#1c2c4a"); p.rect(54, 80, 20, 16, c); p.circle(64, 62, 24, c); p.ellipse(64, 80, 22, 13, "#d8d2c6"); p.poly([[24, 46], [64, 16], [104, 46], [64, 54]], "#121a2c"); p.circle(64, 36, 5, BRASS); p.circle(55, 62, 2.8, "#21130c"); p.ellipse(74, 62, 6, 5, "#121a2c"); p.line(66, 56, 88, 66, "#121a2c", 2); p.line(58, 73, 70, 72, "#7a2a22", 2.4); });
    paint("face_quill", (p, c) => { p.ellipse(64, 124, 44, 36, "#2a1a3a"); p.rect(54, 80, 20, 14, c); p.circle(64, 62, 24, c); p.poly([[42, 72], [86, 72], [64, 106]], "#ddd6c8"); p.poly([[26, 36], [64, 22], [102, 36], [64, 50]], "#121016"); p.rect(46, 38, 36, 12, "#121016"); p.line(98, 36, 102, 60, BRASS, 2.5); p.circle(55, 60, 2.8, "#21130c").circle(73, 60, 2.8, "#21130c"); p.line(50, 53, 60, 55, "#ddd6c8", 3).line(68, 55, 78, 53, "#ddd6c8", 3); });
    paint("face_clockmaker", (p, c) => { p.ellipse(64, 124, 44, 36, "#12100e"); p.rect(54, 80, 20, 14, c); p.circle(64, 64, 24, c); p.rect(42, 20, 44, 36, "#12100e"); p.rect(30, 52, 68, 7, "#12100e"); p.rect(42, 44, 44, 5, BRASS); p.circle(54, 68, 9, BRASS).circle(54, 68, 6, "#7fd0e8").circle(74, 68, 9, BRASS).circle(74, 68, 6, "#7fd0e8"); p.circle(54, 68, 2, "#12100e").circle(74, 68, 2, "#12100e"); p.line(58, 82, 70, 82, "#5e3a22", 2.2); });
    game.assets.paint("face_white", 128, 128, (p) => { p.circle(64, 64, 62, "#e6be78", "#7c4f22"); p.circle(64, 64, 57, "#f0dcb4", "#b08a58"); p.circle(64, 48, 15, "#5e3a22"); p.poly([[50, 66], [78, 66], [86, 98], [42, 98]], "#5e3a22"); }, { smooth: true });
    game.assets.paint("face_black", 128, 128, (p) => { p.circle(64, 64, 62, "#e6be78", "#7c4f22"); p.circle(64, 64, 57, "#2a1a12", "#120a06"); p.circle(64, 48, 15, "#e0c68f"); p.poly([[50, 66], [78, 66], [86, 98], [42, 98]], "#e0c68f"); }, { smooth: true });
}

const clockText = (t) => {
    t = Math.max(0, t);
    if (t < 20) return t.toFixed(1);
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
};

export class Hud {
    constructor(game, s, c) {
        this.game = game; this.s = s; this.c = c;
        this.panel = null; this.args = null; this.items = []; this.tools = [];
        this.bubble = { text: "", life: 0 };
        this.toast = { text: "", life: 0 };
        this.t = 0;
        const self = this;
        s.add([ui(), pos(0, 0), layer(1), { name: "hud", draw(d) { self.draw(d); }, update(dt) { self.t += dt; self.bubble.life -= dt; self.toast.life -= dt; } }]);
        s.add([ui(), pos(0, 0), layer(30), { name: "over", draw(d) { self.drawPanelTop(d); } }]);
        this.layout();
    }

    get v() { return this.s.view; }
    get wide() { return this.v.width > this.v.height * 1.1; }

    /** Board rectangle for the world camera, and every fixed position. */
    layout() {
        const v = this.v, s = v.safe, W = v.width, H = v.height;
        this.L = this.wide ? { top: s.top + 6, bottom: H - s.bottom - 6, left: s.left + 6, right: W - s.right - 6, col: 124 }
            : { top: s.top + 6, bottom: H - s.bottom - 6, left: s.left + 6, right: W - s.right - 6 };
        this.buildTools();
        if (this.panel) this.open(this.panel, this.args);
        return this.wide
            ? { x0: s.left + 142, x1: W - s.right - 142, y0: 6 + s.top, y1: H - 6 - s.bottom }
            : { x0: s.left + 2, x1: W - s.right - 2, y0: s.top + 100, y1: H - s.bottom - 174 };
    }

    // --- Buttons -------------------------------------------------------------------------------------

    /** A wooden button with a serif label. */
    btn(x, y, w, h, label, onTap, o = {}) {
        const c = this.c, self = this;
        const e = this.s.add([ui(), pos(x, y), layer(o.layer ?? 20), tap(() => { c.click(); onTap(); }), {
            name: `btn:${typeof label === "string" ? label : "icon"}`,
            draw(d) {
                const on = o.on?.() ?? false, press = e._pressed ? 0.97 : 1, g = o.primary ? "#8a5a22" : on ? "#5a3a1c" : WOOD2;
                d.push();
                d.scale(press, press);
                d.rect(w, h, { y: 2.5, color: "#000000", opacity: 0.45, radius: 9 });
                d.rect(w, h, { color: g, radius: 9 });
                d.rect(w - 2, h - 2, { color: o.primary ? "#f0c878" : on ? BRASS : "#7d5a33", radius: 8, outline: 1 });
                const dis = o.disabled?.();
                if (o.icon) self.icon(d, o.icon, on, dis, o.iconLabel);
                else if (o.face) {
                    d.sprite(o.face, { x: -w / 2 + h / 2, width: h - 10, height: h - 10 });
                    d.text(label, { x: -w / 2 + h + 4 + (o.tw ?? 0), y: o.sub ? -9 : 0, size: o.size ?? 15, color: INK, font: SERIF, bold: true, align: "left" });
                } else d.text(label, { y: o.sub ? -8 : 0, size: o.size ?? 16, color: dis ? "#7c6a50" : o.primary ? "#fff3d4" : INK, font: SERIF, bold: true, maxWidth: w - 8 });
                if (o.sub) d.text(typeof o.sub === "function" ? o.sub() : o.sub, { y: 11, size: 11, color: o.primary ? "#f6dcae" : DIM, font: SERIF, maxWidth: w - 8 });
                d.pop();
            },
        }]);
        e.size.set(w, h, 0);
        return e;
    }

    icon(d, kind, on, dis, label) {
        const c = dis ? "#6d5c46" : on ? "#ffe2a0" : INK, y = label ? -7 : 0, w = 2.4;
        d.push(); d.translate(0, y);
        if (kind === "undo") {
            for (let i = 0; i < 12; i++) { const a = -2.5 + i * 0.36, b = a + 0.36; d.line([Math.cos(a) * 9, Math.sin(a) * 9 + 1], [Math.cos(b) * 9, Math.sin(b) * 9 + 1], { width: w, color: c }); }
            d.line([-7.2, -4.4], [-10, -9], { width: w, color: c }); d.line([-7.2, -4.4], [-1.8, -4.6], { width: w, color: c });
        } else if (kind === "hint") {
            d.circle(8, { y: -2, color: c }); d.rect(7, 4, { y: 8, color: c, radius: 1 }); d.circle(4, { y: -2, color: WOOD2 });
        } else if (kind === "turn") {
            d.line([-9, -3], [9, -3], { width: w, color: c }); d.line([9, -3], [4, -8], { width: w, color: c });
            d.line([9, 4], [-9, 4], { width: w, color: c }); d.line([-9, 4], [-4, 9], { width: w, color: c });
        } else if (kind === "menu") {
            for (const yy of [-6, 0, 6]) d.rect(18, 2.6, { y: yy, color: c, radius: 1 });
        }
        d.pop();
        if (label) d.text(label, { y: 13, size: 10.5, color: dis ? "#6d5c46" : DIM, font: SERIF });
    }

    buildTools() {
        for (const e of this.tools) e.destroy();
        const c = this.c, L = this.L;
        const tools = [
            ["undo", "Undo", () => c.undo(), () => !c.canUndo()],
            ["hint", "Hint", () => c.hint(), () => !c.canHint()],
            ["turn", "Turn", () => c.turnBoard(), () => false],
            ["menu", "Menu", () => c.menu(), () => false],
        ];
        this.tools = tools.map(([icon, iconLabel, fn, disabled], i) => {
            let x, y, w, h;
            if (this.wide) {
                w = (L.col - 6) / 2; h = 40;
                x = L.right - L.col + w / 2 + (i % 2) * (w + 6);
                y = L.bottom - h / 2 - (i < 2 ? h + 6 : 0);
            } else {
                const gap = 6;
                w = (L.right - L.left - gap * 3) / 4; h = 44;
                x = L.left + w / 2 + i * (w + gap);
                y = L.bottom - h / 2;
            }
            const e = this.btn(x, y, w, h, "", fn, { icon, iconLabel, disabled, layer: 5 });
            return e;
        });
        // The move list opens from its strip.
        if (this.sheet) this.sheet.destroy();
        const self = this;
        if (this.wide) { this.sheet = null; } else {
            const H = 26, w = L.right - L.left, y = L.bottom - 44 - 6 - H / 2;
            this.sheet = this.s.add([ui(), pos(L.left + w / 2, y), layer(5), tap(() => { c.click(); self.open("moves"); }), { name: "sheet" }]);
            this.sheet.size.set(w, H, 0);
        }
        this.showTools(this.toolsOn ?? false);
    }

    showTools(on) {
        this.toolsOn = on;
        for (const e of this.tools) e.hidden = !on;
        if (this.sheet) this.sheet.hidden = !on;
    }

    say(text, sec = 2.6) { this.bubble = { text, life: sec }; }
    note(text, sec = 2) { this.toast = { text, life: sec }; }

    // --- Always-on drawing ---------------------------------------------------------------------------

    draw(d) {
        const c = this.c, v = this.v;
        d.push(); d.translate(v.width / 2, v.height / 2);
        d.sprite("vignette", { width: v.width * 1.04, height: v.height * 1.04, opacity: 0.86 });
        const t = this.c.world.tension;
        if (t > 0.01) d.sprite("vignetteRed", { width: v.width * 1.04, height: v.height * 1.04, opacity: t * (0.62 + 0.22 * Math.sin(this.t * 6)) });
        d.pop();
        if (this.bare || !c.G.phase || c.G.phase === "title") return;
        const L = this.L;
        if (c.G.phase === "over") { if (this.bubble.life > 0) this.drawBubble(d); return; }
        if (this.wide) {
            const w = L.col, far = c.seatSide() === "w" ? "b" : "w", near = c.seatSide();
            const h = c.G.clock ? 74 : 44;
            this.plate(d, L.left, L.top, w, h, far);
            this.plate(d, L.left, L.bottom - h, w, h, near);
            this.moveColumn(d, L.right - w, L.top, w, L.bottom - L.top - 98);
        } else {
            const w = L.right - L.left, far = c.seatSide() === "w" ? "b" : "w", near = c.seatSide();
            this.plate(d, L.left, L.top, w, 48, far);
            this.plate(d, L.left, L.bottom - 44 - 6 - 26 - 6 - 48, w, 48, near);
            this.moveStrip(d, L.left, L.bottom - 44 - 6 - 26, w, 26);
        }
        if (this.bubble.life > 0 && c.G.phase !== "promo") this.drawBubble(d);
        if (this.toast.life > 0) {
            const a = Math.min(1, this.toast.life * 3);
            d.rect(this.toast.text.length * 7.6 + 30, 30, { x: v.width / 2, y: v.height * 0.46, color: "#000000", opacity: 0.66 * a, radius: 15 });
            d.text(this.toast.text, { x: v.width / 2, y: v.height * 0.46, size: 14, color: INK, opacity: a, font: SERIF });
        }
        const coach = c.coachText();
        if (coach) {
            const y = this.wide ? v.height - 16 : L.bottom - 44 - 6 - 26 - 6 - 48 - 16;
            d.text(coach, { x: v.width / 2, y: y, size: 13.5, color: "#ffe2a0", font: SERIF, opacity: 0.7 + 0.3 * Math.sin(this.t * 3) });
        }
    }

    plate(d, x, y, w, h, side) {
        const c = this.c, G = c.G, active = c.chess?.turn === (side === "w" ? 0 : 8) && G.phase === "play", clock = G.clock ? G.clock[side] : null, low = clock !== null && clock < 20;
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: WOOD, opacity: 0.82, radius: 11 });
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: active ? BRASS : "#5a3f25", radius: 11, outline: active ? 1.6 : 1 });
        const info = c.plateInfo(side), r = this.wide ? 30 : Math.min(h - 8, 40);
        d.sprite(info.face, { x: x + 7 + r / 2, y: y + (this.wide ? 22 : h / 2), width: r, height: r });
        const tx = x + 12 + r;
        const wide = this.wide;
        this.leftText(d, info.name, tx, wide ? y + 15 : y + 16, { size: wide ? 11.5 : 15, bold: true, color: INK }, wide ? w - r - 16 : w * 0.55);
        const status = active ? (info.thinking ? `thinking${".".repeat(1 + Math.floor(this.t * 3) % 3)}` : info.status) : info.status;
        if (wide) this.leftText(d, info.short ?? status, tx, y + 29, { size: 10.5, color: active ? "#ffd68a" : DIM }, w - r - 16);
        else this.leftText(d, status, tx, y + 33, { size: 12, color: active ? "#ffd68a" : DIM }, w * 0.55);
        const mat = c.materialLead(side);
        if (mat > 0) {
            if (wide) d.text(`+${mat}`, { x: x + w - 16, y: y + 15, size: 12, color: "#ffd68a", font: SERIF, bold: true });
            else d.text(`+${mat}`, { x: x + w - (clock !== null ? 92 : 22), y: y + h / 2, size: 15, color: "#ffd68a", font: SERIF, bold: true });
        }
        if (clock !== null) {
            const cx = wide ? x + w - 38 : x + w - 40, cy = wide ? y + 56 : y + h / 2;
            d.rect(64, 26, { x: cx, y: cy, color: active ? (low ? "#7a1c10" : "#3a2315") : "#160c07", radius: 6 });
            d.text(clockText(clock), { x: cx, y: cy, size: 16, bold: true, color: low ? "#ffb49a" : active ? "#fff0cc" : DIM, font: "ui-monospace, Menlo, monospace" });
        }
    }

    /** d.text centres its box, so left-aligned text needs its width. */
    leftText(d, str, x, y, o, maxW) {
        const style = { size: o.size, font: SERIF, bold: !!o.bold, align: "left", maxWidth: 0, lineHeight: 1.2 };
        let s = str;
        const r = this.game.renderer;
        let m = r.measureText(s, style);
        while (maxW && m.width > maxW && s.length > 3) { s = `${s.slice(0, -2)}…`; m = r.measureText(s, style); }
        d.text(s, { ...o, x: x + m.width / 2, y, font: SERIF });
    }

    moveStrip(d, x, y, w, h) {
        const c = this.c, hist = c.moveLines();
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#e8d6ae", opacity: 0.93, radius: 5 });
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#7d5a33", radius: 5, outline: 1 });
        const text = hist.length ? hist.slice(-3).join("    ") : "The score sheet is empty";
        d.text(text, { x: x + w / 2, y: y + h / 2 + 0.5, size: 13, color: hist.length ? "#2a180c" : "#8a6f4c", font: SERIF, bold: hist.length > 0 });
    }

    moveColumn(d, x, y, w, h) {
        const c = this.c, hist = c.moveLines(), rows = Math.floor((h - 12) / 15), show = hist.slice(-rows);
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#e8d6ae", opacity: 0.93, radius: 6 });
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: "#7d5a33", radius: 6, outline: 1 });
        show.forEach((line, i) => this.leftText(d, line, x + 8, y + 13 + i * 15, { size: 11.5, color: "#2a180c" }, w - 14));
        if (!hist.length) d.text("Score sheet", { x: x + w / 2, y: y + 16, size: 11, color: "#8a6f4c", font: SERIF });
    }

    drawBubble(d) {
        const c = this.c, L = this.L, a = Math.min(1, this.bubble.life * 3), v = this.v;
        const w = Math.min(this.wide ? 118 : v.width - 90, this.bubble.text.length * 7.2 + 26), h = this.wide ? 44 : 30;
        const x = this.wide ? L.left + w / 2 : L.left + 26 + w / 2, y = this.wide ? L.top + (c.G.clock ? 74 : 44) + 28 : L.top + 48 + 20;
        d.rect(w, h, { x, y, color: "#f4e6c6", opacity: 0.96 * a, radius: 10 });
        d.text(this.bubble.text, { x, y, size: 12.5, color: "#2a180c", opacity: a, font: SERIF, maxWidth: w - 14 });
    }

    // --- Panels --------------------------------------------------------------------------------------

    close() {
        for (const e of this.items) e.destroy();
        this.items = [];
        this.panel = null; this.args = null;
    }

    add(e) { this.items.push(e); return e; }

    /** Dark card with a brass edge. */
    card(x, y, w, h, title, sub) {
        this.add(this.s.add([ui(), pos(x, y), layer(10), tap(() => {}), {
            name: "card",
            draw(d) {
                d.rect(w + 8, h + 8, { y: 4, color: "#000000", opacity: 0.5, radius: 18 });
                d.rect(w, h, { color: "#1c100a", opacity: 0.97, radius: 15 });
                d.rect(w - 3, h - 3, { color: BRASS, radius: 14, outline: 1.2 });
                if (title) d.text(title, { y: -h / 2 + 30, size: 25, color: "#ffe2a0", font: SERIF, bold: true, maxWidth: w - 24 });
                if (sub) d.text(sub, { y: -h / 2 + 58, size: 13.5, color: DIM, font: SERIF, maxWidth: w - 28, lineHeight: 1.3 });
            },
        }])).size.set(w, h, 0);
    }

    scrim(on) {
        const v = this.v;
        const e = this.add(this.s.add([ui(), pos(v.width / 2, v.height / 2), layer(9), on ? tap(on) : null, { name: "scrim", draw(d) { d.rect(v.width + 4, v.height + 4, { color: "#0a0503", opacity: 0.62 }); } }]));
        e.size.set(v.width, v.height, 0);
    }

    open(name, args) {
        const keep = args;
        this.close();
        this.panel = name; this.args = keep;
        this[`p_${name}`](keep);
    }

    p_title() {
        const c = this.c, v = this.v, L = this.L, cx = v.width / 2, resume = c.hasSave();
        const who = CLUB[c.nextLevel()];
        const w = Math.min(320, L.right - L.left - 20);
        if (this.wide) {
            const x = L.right - 76, bw = 148;
            this.add(this.btn(x, v.height - 158, bw, 50, resume ? "Continue" : "Play", () => c.quickPlay(), { primary: true, sub: resume ? c.saveLabel() : `against ${who.name}`, size: 17 }));
            this.add(this.btn(x, v.height - 102, bw, 42, "Opponents", () => this.open("club"), { size: 15 }));
            this.add(this.btn(x, v.height - 54, bw, 42, "Two players", () => this.open("club", { two: true }), { size: 15 }));
            this.add(this.btn(L.left + 26, L.top + 22, 46, 42, "", () => this.open("settings"), { icon: "menu" }));
            return;
        }
        const by = L.bottom - 24;
        this.add(this.btn(cx - (w + 8) / 4, by - 8, (w - 8) / 2, 44, "Opponents", () => this.open("club"), { size: 15 }));
        this.add(this.btn(cx + (w + 8) / 4, by - 8, (w - 8) / 2, 44, "Two players", () => this.open("club", { two: true }), { size: 15 }));
        this.add(this.btn(cx, by - 66, w, 58, resume ? "Continue" : "Play", () => c.quickPlay(), { primary: true, sub: resume ? c.saveLabel() : `against ${who.name}`, size: 20 }));
        this.add(this.btn(L.right - 24, L.top + 22, 44, 42, "", () => this.open("settings"), { icon: "menu" }));
    }

    drawPanelTop(d) {
        if (this.panel !== "title") { if (this.c.G.phase === "promo") this.promoLabel(d); return; }
        const v = this.v, wide = this.wide, L = this.L;
        const x = wide ? L.right - 76 : v.width / 2, y = wide ? L.top + 34 : L.top + 26, size = wide ? 30 : 42;
        d.additive(() => d.sprite("glow", { x, y, width: size * 7, height: size * 2.4, color: "#ff9a3a", opacity: 0.2 + 0.03 * Math.sin(this.t * 2) }));
        d.text("Lamplight", { x, y: y + 2, size, color: "#000000", opacity: 0.6, font: SERIF, bold: true });
        d.text("Lamplight", { x, y, size, color: "#ffe2a0", font: SERIF, bold: true });
        d.text("a chess table", { x, y: y + size * 0.8, size: wide ? 13 : 15, color: "#d9b777", font: SERIF });
        const near = this.c.world.project(0, 0, 5.7);
        const hx = wide ? L.right - 76 : v.width / 2, hy = wide ? L.top + 84 : near.y;
        d.text("Pick up a piece to begin", { x: hx, y: hy, size: wide ? 12.5 : 17, color: "#ffe2a0", font: SERIF, opacity: 0.6 + 0.35 * Math.sin(this.t * 2.4) });
    }

    promoLabel(d) {
        const v = this.v, s = "Choose your new piece";
        d.rect(190, 32, { x: v.width / 2, y: this.L.top + (this.wide ? 18 : 68), color: "#000000", opacity: 0.7, radius: 16 });
        d.text(s, { x: v.width / 2, y: this.L.top + (this.wide ? 18 : 68), size: 15, color: "#ffe2a0", font: SERIF, bold: true });
    }

    /** Rows of opponents, plus how to play them. */
    p_club(args = {}) {
        const c = this.c, v = this.v, L = this.L, two = !!args.two;
        const W = Math.min(v.width - 16, this.wide ? 600 : 344), H = Math.min(v.height - L.top - (v.height - L.bottom) - 4, this.wide ? 346 : 590), cx = v.width / 2, top = (L.top + L.bottom) / 2 - H / 2, cy = top + H / 2;
        this.scrim(() => this.open("title"));
        this.card(cx, cy, W, H, two ? "Two players" : "The Lamplight Club", two ? "Pass the phone. The board can turn for you." : c.clubLine());
        const opts = c.setup;
        let y;
        if (!two) {
            const cols = this.wide ? 2 : 1, rowH = this.wide ? 50 : Math.min(58, (H - 212) / 6), gap = 6, cw = (W - 24 - (cols - 1) * 8) / cols;
            CLUB.forEach((who, i) => {
                const col = cols === 2 ? i % 2 : 0, row = cols === 2 ? i >> 1 : i;
                const x = cx - W / 2 + 12 + cw / 2 + col * (cw + 8), yy = top + (this.wide ? 74 : 82) + rowH / 2 + row * (rowH + gap - 2);
                const wins = c.wins(who.id);
                this.add(this.btn(x, yy, cw, rowH, "", () => c.startAI(i), {
                    face: `face_${who.id}`, on: () => i === c.nextLevel(),
                }));
                const self = this;
                this.add(this.s.add([ui(), pos(x, yy), layer(21), {
                    name: "rowtext",
                    draw(d) {
                        const left = -cw / 2 + rowH + 2;
                        self.leftText(d, who.name, left, -10, { size: 15, bold: true, color: INK }, cw - rowH - 44);
                        self.leftText(d, who.blurb, left, 10, { size: 11.5, color: DIM }, cw - rowH - 12);
                        if (wins) d.text(`${wins} win${wins > 1 ? "s" : ""}`, { x: cw / 2 - 26, y: -11, size: 11, color: "#ffd68a", font: SERIF, bold: true });
                    },
                }]));
            });
            y = top + (this.wide ? 74 : 82) + (cols === 2 ? 3 : 6) * (rowH + gap - 2) + 4;
        } else {
            y = top + 96;
            this.add(this.btn(cx, y + 26, W - 40, 52, "Sit down", () => c.startTwo(), { primary: true, size: 18 }));
            y += 70;
        }
        // Stacked on a phone; side by side when the card is wide.
        const seg = (label, values, get, set, side = 0) => {
            const full = W - 24, half = (full - 10) / 2, span = side ? half : full, x0 = cx - W / 2 + 12 + (side === 2 ? half + 10 : 0);
            const bw = span / values.length, h = 38, midX = x0 + span / 2;
            this.add(this.s.add([ui(), pos(midX, y + 4), layer(21), { name: "seglabel", draw(d) { d.text(label, { size: 11.5, color: DIM, font: SERIF }); } }]));
            values.forEach(([text, val], i) => {
                this.add(this.btn(x0 + bw * (i + 0.5), y + 30, bw - 4, h, text, () => set(val), { on: () => get() === val, size: 12.5 }));
            });
            if (side !== 1) y += 58;
        };
        const sideBy = this.wide;
        if (!two) seg("Play as", [["White", "w"], ["Either", "r"], ["Black", "b"]], () => opts.side, (v2) => { opts.side = v2; c.saveProfile(); }, sideBy ? 1 : 0);
        seg("Clock", [["None", 0], ["10 min", 1], ["5 + 3", 2], ["3 + 2", 3]], () => opts.clock, (v2) => { opts.clock = v2; c.saveProfile(); }, sideBy ? 2 : 0);
        if (two) seg("Board", [["Turns each move", true], ["Stays put", false]], () => opts.autoTurn, (v2) => { opts.autoTurn = v2; c.saveProfile(); });
        this.add(this.btn(cx + W / 2 - 26, top + 26, 36, 36, "×", () => this.open("title"), { size: 18 }));
    }

    p_settings() {
        const c = this.c, v = this.v, W = Math.min(v.width - 20, this.wide ? 420 : 330), H = Math.min(this.L.bottom - this.L.top, 312), cx = v.width / 2, cy = (this.L.top + this.L.bottom) / 2, st = c.settings;
        const back = this.args?.back ?? "title";
        this.scrim(() => this.open(back));
        this.card(cx, cy, W, H, "Settings");
        const rowH = Math.min(42, (H - 70) / 5 - 5);
        let y = cy - H / 2 + 60 + rowH / 2;
        const row = (label, get, set, sub) => {
            this.add(this.btn(cx, y, W - 32, rowH, label, set, { on: get, size: 14.5, sub }));
            y += rowH + 5;
        };
        row("Sound", () => st.sound, () => c.toggle("sound"), () => (st.sound ? "on" : "off"));
        row("Music", () => st.music, () => c.toggle("music"), () => (st.music ? "on" : "off"));
        row("Haptics", () => st.haptics, () => c.toggle("haptics"), () => (st.haptics ? "on" : "off"));
        row("Pieces", () => false, () => c.nextSet(), () => (SETS[st.set] ?? SETS.classic).name + (c.setsLocked() ? `  (${c.setsLocked()})` : ""));
        row("Board reflections", () => st.mirror, () => c.toggle("mirror"), () => (st.mirror ? "on" : "off, for slow phones"));
        this.add(this.btn(cx + W / 2 - 26, cy - H / 2 + 26, 36, 36, "×", () => this.open(back), { size: 18 }));
    }

    p_menu() {
        const c = this.c, v = this.v, W = Math.min(v.width - 40, 290), H = Math.min(322, this.L.bottom - this.L.top), cx = v.width / 2, cy = (this.L.top + this.L.bottom) / 2;
        this.scrim(() => c.closeMenu());
        this.card(cx, cy, W, H, "Paused", c.G.mode === "ai" ? `Against ${c.opponent().name}` : "Two players");
        const rh = Math.min(44, (H - 92) / 4 - 5);
        let y = cy - H / 2 + 82 + rh / 2;
        const row = (label, fn, o) => { this.add(this.btn(cx, y, W - 40, rh, label, fn, { size: 15.5, ...o })); y += rh + 5; };
        row("Back to the board", () => c.closeMenu(), { primary: true });
        row("Resign", () => c.resign());
        row("Settings", () => this.open("settings", { back: "menu" }));
        row("Leave the table", () => c.leave());
    }

    p_moves() {
        const c = this.c, v = this.v, W = Math.min(v.width - 20, 330), H = Math.min(this.L.bottom - this.L.top, 480), cx = v.width / 2, cy = (this.L.top + this.L.bottom) / 2;
        this.scrim(() => this.open(null));
        const self = this;
        this.card(cx, cy, W, H, "Score sheet");
        this.add(this.s.add([ui(), pos(cx, cy), layer(21), {
            name: "scorelist",
            draw(d) {
                const lines = c.moveLines(), rows = Math.floor((H - 70) / 18), cols = lines.length > rows ? 2 : 1, show = lines.slice(-rows * cols);
                show.forEach((line, i) => {
                    const col = i >= rows ? 1 : 0, r = i % rows;
                    self.leftText(d, line, -W / 2 + 22 + col * (W / 2 - 8), -H / 2 + 66 + r * 18, { size: 13.5, color: INK }, W / cols - 30);
                });
                if (!lines.length) d.text("No moves yet.", { size: 14, color: DIM, font: SERIF });
            },
        }]));
        this.add(this.btn(cx + W / 2 - 26, cy - H / 2 + 26, 36, 36, "×", () => this.open(null), { size: 18 }));
    }

    p_null() { this.close(); }

    p_over(a) {
        const c = this.c, v = this.v, W = Math.min(v.width - 20, this.wide ? 340 : 340), H = this.wide ? 196 : 206, cx = v.width / 2;
        const cy = this.wide ? v.height / 2 : Math.max(H / 2 + this.L.top, this.L.bottom - H / 2 - 4);
        this.card(cx, cy, W, H, a.title, a.sub);
        let y = cy + H / 2 - 88;
        const half = (W - 44) / 2;
        this.add(this.btn(cx, y - 2, W - 32, 46, a.primaryLabel, a.primary, { primary: true, size: 17 }));
        y += 52;
        this.add(this.btn(cx - half / 2 - 3, y, half, 42, a.secondLabel, a.second, { size: 14 }));
        this.add(this.btn(cx + half / 2 + 3, y, half, 42, "Leave", () => c.leave(), { size: 14 }));
    }
}

