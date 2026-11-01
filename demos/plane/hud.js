// What sits on the glass: the thumb, the thread to the next door, the letter cards. Quiet by design; the town is
// the picture. Everything drawn here reads safe-area insets, so it survives notches and landscape.
import { button, pin, text } from "./pogo.js";
import { CHAPTERS, LETTERS, PEOPLE, TIMES, TRIALS } from "./data.js";
import { ALL_STAMPS, faceFrame } from "./art.js";
import { ribbons, thermals } from "./world.js";

export const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
export const HAND = "'Snell Roundhand', 'Bradley Hand', 'Segoe Script', 'Brush Script MT', cursive";
export const INK = "#3a3040", CORAL = "#c8452f", CREAM = "#fbf1dc";
const RAD = 62;
const ease = (k) => 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;       // outBack-ish
export const metres = (d) => `${Math.round(d)} m`;
const place = (id) => ({ post: "the Post Office", bakery: "the Bakery", light: "the Lighthouse", marlow: "Harbour Row", fish: "the Net Loft", oake: "Top Lane", finch: "Top Lane", school: "the School House", inn: "the Inn", chapel: "the Chapel", mill: "the Mill", harbour: "the Harbour Office" }[id] ?? "");

export function paperBtn(label, o = {}) {
    return button(label, { ...o, color: o.color ?? "#fbf1dc", textColor: o.ink ?? INK, radius: 10, height: o.height ?? 46, textSize: o.size ?? 16 });
}

export class Hud {
    constructor(s, game, G) {
        this.s = s; this.g = game; this.G = G; this.ox = 0; this.oy = 0; this.held = false; this.toastT = 0; this.toastMsg = ""; this.bannerT = 0; this.card = null; this.got = []; this.pulse = 0; this.lessons = 0; this.teaching = 0; this.titleOn = false; this.endText = null; this.kx = 0; this.ky = 0; this.seenBank = 0; this.seenPitch = 0;
        s.onDrawUI((d) => this.draw(d));
        this.menu = s.add([paperBtn("Journal", { width: 82, height: 50, size: 14, action: "pause", onTap: () => { if (this.card || G.phase === "title") return; G.quit(); game.snd.fx("page"); game.snd.windOff(); game.go("book", { tab: G.mode === "free" || G.trial ? "fly" : "letters", from: G.mode }, { fade: 0.2 }); } }), pin("top-right", [48, 32]), { layer: 20 }]);
        this.menu.hidden = G.phase === "title";
    }
    get safe() { return this.g.view.safe; }
    readStick(dt) {
        const G = this.G, s = this.s, p = s.input.pointer, mv = s.input.move, gamep = this.G.phase === "fly" || this.G.phase === "count";
        // One thumb anywhere: the place you touch down is neutral, and you steer relative to it.
        if (p.pressed && !this.card) { this.ox = p.x; this.oy = p.y; this.held = true; }
        if (!p.down) this.held = false;
        let tx = 0, ty = 0;
        if (this.held) {
            let dx = p.x - this.ox, dy = p.y - this.oy; const l = Math.hypot(dx, dy);
            if (l > RAD) { this.ox += (dx / l) * (l - RAD); this.oy += (dy / l) * (l - RAD); dx = p.x - this.ox; dy = p.y - this.oy; }
            this.kx = dx; this.ky = dy;
            const cv = (v) => { const a = Math.max(0, Math.abs(v) / RAD - 0.06) / 0.94; return Math.sign(v) * a ** 1.35; };
            tx = cv(dx); ty = -cv(dy);
        } else if (mv.x || mv.y) { tx = mv.x; ty = -mv.y; }
        const k = 1 - Math.exp(-(this.held ? 16 : 7) * dt);
        G.sx += (tx - G.sx) * k; G.sy += (ty - G.sy) * k;
        if (Math.abs(G.sx) > 0.5) this.seenBank += dt; if (Math.abs(G.sy) > 0.5) this.seenPitch += dt;
    }
    update(dt) {
        if (this.G.phase === "title" && (this.s.input.pointer.pressed || this.s.input.pressed("confirm") || this.s.input.pressed("jump"))) this.G.startFlight();
        this.toastT = Math.max(0, this.toastT - dt); this.bannerT = Math.max(0, this.bannerT - dt); this.pulse = Math.max(0, this.pulse - dt * 2);
        for (const g of this.got) g.t += dt; this.got = this.got.filter((g) => g.t < 2.6);
        const c = this.card; if (c) { c.t += dt; if (c.t > 0.5 && this.s.input.pointer.tapped) this.closeCard(); }
        if (this.teaching === 1 && this.seenBank > 0.4) { this.teaching = 2; this.g.snd.fx("recover"); }
        else if (this.teaching === 2 && this.seenPitch > 0.35) { this.teaching = 3; this.g.snd.fx("recover"); this.teachT = 5; }
        else if (this.teaching === 3) { this.teachT -= dt; if (this.teachT <= 0) { this.teaching = 0; this.g.progress.flags.taught = true; this.g.persist(); } }
    }
    teach() { if (!this.g.progress.flags.taught) this.teaching = 1; }
    toast(msg, sec = 2, kind) { this.toastMsg = msg; this.toastT = sec; this.toastDur = sec; this.toastKind = kind; }
    liftPulse() { this.pulse = 1; }
    chapterBanner(ch) { this.bannerT = 4.2; this.bannerCh = ch; }
    stampGot(q) { this.got.push({ q, t: 0 }); }
    title() {
        const G = this.G, g = this.g; this.titleOn = true;
        this.titleBtns = [
            this.s.add([paperBtn("Journal", { width: 112, height: 48, onTap: () => { g.snd.fx("page"); g.go("book", { tab: "letters", from: "title" }, { fade: 0.2 }); } }), pin("bottom", [-62, 42]), { layer: 20 }]),
            this.s.add([paperBtn("Free flight", { width: 112, height: 48, onTap: () => { g.snd.fx("page"); g.go("book", { tab: "fly", from: "title" }, { fade: 0.2 }); } }), pin("bottom", [62, 42]), { layer: 20 }]),
        ];
    }
    closeTitle() { this.titleOn = false; for (const b of this.titleBtns ?? []) b.destroy(); this.titleBtns = null; this.menu.hidden = false; }
    showLetter(L, done) {
        this.g.snd.fx("paper");
        const fin = !!L.finale, s = this.s, lines = L.text;
        this.card = { L, done, t: 0, fin };
        this.g.haptic("tick");
    }
    closeCard() { const c = this.card; if (!c || c.closing) return; this.card = null; this.g.snd.fx("page"); c.done(); }
    ending(i) { this.endText = i === 0 ? { a: "Every window on the hill", b: "A line a boat could steer by", t: 0 } : null; }
    trialEnd(T, time, old) {
        const s = this.s, g = this.g, tt = T.T, medal = time <= tt.times[0] ? 0 : time <= tt.times[1] ? 1 : time <= tt.times[2] ? 2 : 3;
        this.trialCard = { name: tt.name, time, medal, best: old === undefined || time < old, stamp: T.newStamp, t: 0 };
        const a = s.add([paperBtn("Fly it again", { width: 150, action: "confirm", onTap: () => g.go("fly", { mode: "trial", trial: tt.id }, { fade: 0.25 }) }), pin("bottom", [-82, 54]), { layer: 21 }]);
        const b = s.add([paperBtn("To the journal", { width: 150, onTap: () => g.go("book", { tab: "fly", from: "title" }, { fade: 0.25 }) }), pin("bottom", [82, 54]), { layer: 21 }]);
    }

    /** The cut-paper title lettering. */
    bigText(d, str, x, y, size, col = "#c8452f") {
        // Cut-paper letters: a soft shadow, a pale card edge, then the colour.
        d.text(str, { x: x + 3, y: y + 4, size, bold: true, font: SERIF, color: "#2a2030", opacity: 0.35 });
        for (const [a, b] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6], [1.2, 1.2], [-1.2, 1.2], [1.2, -1.2], [-1.2, -1.2]]) d.text(str, { x: x + a, y: y + b, size, bold: true, font: SERIF, color: "#fff6e6" });
        d.text(str, { x, y, size, bold: true, font: SERIF, color: col });
    }
    chip(d, str, x, y, o = {}) {
        const size = o.size ?? 15, w = Math.min(this.s.view.width - 24, str.length * size * 0.5 + 28), h = size + 16, a = o.opacity ?? 1;
        d.push(); d.translate(x, y); d.rotate(o.rot ?? -0.008);
        d.rect(w, h, { y: 2, color: "#2a2030", radius: 7, opacity: 0.22 * a }); d.rect(w, h, { color: o.bg ?? CREAM, radius: 7, opacity: a });
        d.text(str, { size, color: o.ink ?? INK, font: SERIF, bold: !!o.bold, opacity: a });
        d.pop();
    }
    draw(d) {
        const G = this.G, s = this.s, v = s.view, W = v.width, H = v.height, S = this.safe, st = G.st, f = G.f, t = G.t;
        if (G.phase === "title") return this.drawTitle(d, W, H, S);
        const flying = G.phase === "fly" || G.phase === "count";
        // Rushing air at the rim of the view when you are really moving.
        const over = f.speed / f.cfg.vt - 1.25;
        if (flying && over > 0) {
            const a = Math.min(0.32, over * 0.3), R = this.g.fxRng;
            for (let i = 0; i < 14; i++) {
                const an = (i * 2.399 + Math.floor(t * 14) * 1.3) % 6.283, r0 = Math.max(W, H) * (0.46 + (i % 3) * 0.05), r1 = r0 + 40 + over * 50;
                d.line([W / 2 + Math.cos(an) * r0, H / 2 + Math.sin(an) * r0], [W / 2 + Math.cos(an) * r1, H / 2 + Math.sin(an) * r1], { width: 1.6, color: "#ffffff", opacity: a });
            }
        }
        if (flying && !this.card) this.drawMarkers(d, W, H, S);
        if (flying && this.held) {
            const x = this.ox, y = this.oy;
            d.circle(RAD + 6, { x, y, color: "#fbf1dc", opacity: 0.14 }); d.circle(RAD + 6, { x, y, color: "#fbf1dc", outline: 2, opacity: 0.5 });
            d.circle(19, { x: x + this.kx, y: y + this.ky, color: "#fbf1dc", opacity: 0.85 }); d.circle(7, { x: x + this.kx, y: y + this.ky, color: CORAL, opacity: 0.8 });
        }
        if (G.mode === "story" && flying) this.drawPost(d, W, H, S);
        if (flying && !G.trial) this.drawLiftHint(d, W, H, S);
        if (G.trial) this.drawTrial(d, W, H, S);
        if (this.bannerT > 0 && !this.card) {
            const k = this.bannerT > 3.7 ? (4.2 - this.bannerT) / 0.5 : Math.min(1, this.bannerT / 0.6), c = CHAPTERS[this.bannerCh], y = H * 0.24;
            this.chip(d, TIMES[c.time].name, W / 2, y - 36, { size: 13, opacity: k });
            this.bigText(d, c.title, W / 2, y, Math.min(34, W * 0.085));
            this.chip(d, c.intro, W / 2, y + 38, { size: 14, opacity: k, rot: 0.006 });
        }
        if (this.toastT > 0) {
            const k = Math.min(1, this.toastT / 0.3, (this.toastDur - this.toastT) / 0.15), kind = this.toastKind;
            this.chip(d, this.toastMsg, W / 2, Math.max(H * 0.32, S.top + 100), { opacity: k, bold: true, bg: kind === "stall" ? "#f6dcc8" : CREAM, ink: kind === "stall" ? CORAL : INK });
        }
        if (this.teaching) this.drawTeach(d, W, H, t);
        for (const g of this.got) {
            const k = Math.min(1, g.t / 0.35), o = Math.min(1, (2.6 - g.t) / 0.4), sc = ease(k) * 1, y = H * 0.36, i = ALL_STAMPS.indexOf(g.q);
            d.push(); d.translate(W / 2, y); d.rotate(-0.09 + Math.sin(k * 3) * 0.05); d.scale(sc, sc);
            d.rect(90, 110, { x: 3, y: 4, color: "#000000", opacity: 0.2 * o, radius: 2 });
            d.sprite("stamps", { frame: i, width: 90, height: 110, opacity: o }); d.pop();
            d.text(`${g.q.name}`, { x: W / 2, y: y + 74, size: 17, bold: true, color: CREAM, font: SERIF, opacity: o });
            d.text("into the album", { x: W / 2, y: y + 94, size: 13, color: CREAM, font: SERIF, opacity: o * 0.9 });
        }
        if (this.endText) {
            this.endText.t += 1 / 60; const T = this.endText.t, k = Math.min(1, T / 2) * Math.min(1, Math.max(0, (9.5 - T) / 1.5));
            if (k > 0) { d.text(this.endText.a, { x: W / 2, y: H * 0.2, size: Math.min(30, W * 0.08), bold: true, color: "#ffe9b0", font: SERIF, opacity: k }); d.text(this.endText.b, { x: W / 2, y: H * 0.2 + 34, size: 17, color: CREAM, font: SERIF, opacity: k }); }
        }
        if (this.card) this.drawCard(d, W, H, S);
        if (this.trialCard) this.drawTrialCard(d, W, H);
    }
    drawTitle(d, W, H, S) {
        const t = this.G.t, wide = W > H, size = wide ? 44 : Math.min(46, W * 0.122), y = wide ? H * 0.27 : H * 0.2;
        this.bigText(d, "Paper Plane", W / 2, y, size);
        this.bigText(d, "Postman", W / 2, y + size * 1.04, size * 1.14, "#2f6a78");
        const P = this.g.progress;
        const a = 0.7 + 0.3 * Math.sin(t * 2.6), lab = P.finished ? "Tap to fly again" : P.done.length ? "Tap to carry on" : "Tap anywhere to fly";
        this.chip(d, lab, W / 2, wide ? H * 0.62 : H * 0.68, { bold: true, size: 17, opacity: a });
    }
    drawMarkers(d, W, H, S) {
        const G = this.G, st = G.st, f = G.f, cam = this.s.cam3;
        const list = G.trial ? st.rings.slice(G.trial.i, G.trial.i + 2) : st.rings;
        let best = null, bd = 1e9;
        for (const g of list) { const q = Math.hypot(g.x - f.x, g.y - f.y, g.z - f.z); g.dist = q; if (q < bd) { bd = q; best = g; } }
        const near = G.trial ? list[0] : best; G.target = near;
        for (const g of list) {
            const p = cam.project([g.x, g.y, g.z]), m = 30, main = g === near;
            const dx = g.x - cam.eye.x, dy = g.y - cam.eye.y, dz = g.z - cam.eye.z, fw = cam.look.sub(cam.eye).norm(), behind = dx * fw.x + dy * fw.y + dz * fw.z < 0;
            let x = p.x, y = p.y;
            const onScreen = !behind && x > m && x < W - m && y > S.top + 66 && y < H - m;
            if (onScreen && g.dist < 22) continue;
            if (!onScreen) {
                let vx = x - W / 2, vy = y - H / 2; if (behind) { vx = -vx; vy = -vy; if (Math.abs(vy) < 40) vy = 60; }
                const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
                const k = Math.min((W / 2 - m - 4) / Math.max(1e-3, Math.abs(vx)), (H / 2 - m - 40) / Math.max(1e-3, Math.abs(vy)));
                x = W / 2 + vx * k; y = H / 2 + vy * k + 12;
                d.push(); d.translate(x, y); d.rotate(Math.atan2(vy, vx));
                d.poly([[20, 0], [2, -11], [6, 0], [2, 11]], { color: G.trial ? "#efc15f" : "#d9593f", opacity: main ? 1 : 0.65 }); d.pop();
                x -= vx * 22; y -= vy * 22;
            }
            const sz = main ? 1 : 0.76;
            d.push(); d.translate(x, y); d.scale(sz, sz);
            if (!G.trial) {
                d.rect(26, 19, { color: "#2a2030", opacity: 0.2, radius: 2, y: 2 }); d.rect(26, 19, { color: CREAM, radius: 2 });
                d.poly([[-13, -9.5], [0, 2], [13, -9.5]], { color: "#e8d8b8" });
            } else d.circle(9, { color: "#efc15f", outline: 3 });
            d.pop();
            if (main) d.text(metres(g.dist), { x, y: y + 19, size: 12, bold: true, color: CREAM, font: SERIF });
        }
    }
    drawPost(d, W, H, S) {
        const G = this.G, P = this.g.progress, g = G.target;
        const n = G.st.rings.length, l = g?.l; if (!l) return;
        const who = PEOPLE[l.to], x = S.left + 12, y = S.top + 12;
        d.push(); d.translate(x + 96, y + 24); d.rotate(-0.012);
        d.rect(192, 46, { y: 2, color: "#2a2030", radius: 6, opacity: 0.22 }); d.rect(192, 46, { color: CREAM, radius: 6 });
        d.sprite("faces", { frame: faceFrame(l.to), x: -74, width: 36, height: 36 });
        d.text(`To ${who.name}`, { x: 22, y: -9, size: 15, bold: true, color: INK, font: SERIF });
        d.text(place(who.home), { x: 22, y: 10, size: 12.5, color: "#7a6a60", font: SERIF });
        d.pop();
        if (n > 1) this.chip(d, `and ${n - 1} more in the bag`, x + 74, y + 60, { size: 11.5, rot: 0.01 });
    }
    /** When a door is above you, the town shows where the air is going up. */
    drawLiftHint(d, W, H, S) {
        const G = this.G, g = G.target, f = G.f; if (!g) return;
        const low = g.y - f.y > 6 + Math.max(0, g.dist - 60) * 0.04 || (f.clearance < 14 && g.dist > 80);
        this.lowT = low ? (this.lowT ?? 0) + 1 / 60 : 0;
        if (this.lowT < 3) return;
        const n = this.nearestLift(f), cam = this.s.cam3; if (!n) return;
        const p = cam.project([n.x, n.y, n.z]), m = 34, x = Math.max(m, Math.min(W - m, p.x)), y = Math.max(S.top + 90, Math.min(H - 50, p.y)), a = 0.7 + 0.3 * Math.sin(G.t * 5);
        this.chip(d, n.label, x, y - 24, { size: 12.5, bold: true, opacity: a, bg: "#fff3cf" });
        d.poly([[x, y - 14], [x - 7, y - 4], [x + 7, y - 4]], { color: "#efc15f", opacity: a });
    }
    nearestLift(f) {
        let best = null, bd = 1e9;
        for (const t of thermals) { const q = Math.hypot(t.x - f.x, t.z - f.z); if (q < bd) { bd = q; best = { x: t.x, y: Math.min(t.top - 8, Math.max(t.y + 6, f.y)), z: t.z, label: "Warm air" }; } }
        for (const r of ribbons) { const a = r.pts[3], q = Math.hypot(a[0] - f.x, a[2] - f.z) - 30; if (q < bd && a[1] < f.y + 8) { bd = q; best = { x: a[0], y: a[1], z: a[2], label: r.name }; } }
        return best;
    }
    drawTeach(d, W, H, t) {
        const y = H * 0.72, x = W / 2, st = this.teaching;
        if (st === 3) return this.chip(d, "Follow the red thread to the door", x, H * 0.2, { bold: true });
        const horiz = st === 1, k = Math.sin(t * 2.6), tx = horiz ? k * 46 : 0, ty = horiz ? 0 : k * 40;
        d.circle(RAD, { x, y, color: CREAM, opacity: 0.16 }); d.circle(RAD, { x, y, color: CREAM, outline: 2, opacity: 0.6 });
        d.circle(20, { x: x + tx, y: y + ty, color: CREAM, opacity: 0.95 }); d.circle(8, { x: x + tx, y: y + ty, color: CORAL });
        this.chip(d, horiz ? "Drag sideways to bank" : "Drag up to lift the nose, down to dive", x, y - 92, { bold: true });
    }
    drawTrial(d, W, H, S) {
        const T = this.G.trial, tt = T.T, y = S.top + 34;
        if (this.G.phase === "count") {
            const c = Math.ceil(T.count); this.bigText(d, String(c), W / 2, H * 0.34, 66); this.chip(d, tt.name, W / 2, H * 0.34 + 54, { bold: true });
            return;
        }
        this.chip(d, `${T.t.toFixed(1)}s`, S.left + 52, y, { bold: true, size: 18 });
        this.chip(d, `${Math.min(T.i + 1, tt.hoops.length)} of ${tt.hoops.length}`, S.left + 136, y, { size: 14 });
    }
    drawCard(d, W, H, S) {
        const c = this.card, k = Math.min(1, c.t / 0.42), e = ease(k), L = c.L, cw = Math.min(W - 30, 344), who = PEOPLE[L.from], to = L.to ? PEOPLE[L.to] : null;
        const size = c.fin ? 15.5 : 17, room = H > W ? 1 : 1, lines = Math.ceil(L.text.length / ((cw - 44) / (size * 0.47))) + 1;
        const body = lines * size * 1.42, ch = Math.min(H - S.top - S.bottom - 14, body + 118), cx = W / 2, cy = H / 2 + (1 - e) * (H * 0.7);
        d.rect(W, H, { x: W / 2, y: H / 2, color: "#20182a", opacity: 0.34 * Math.min(1, k * 2) });
        d.push(); d.translate(cx, cy); d.rotate(-0.012 + (1 - k) * 0.2);
        d.rect(cw + 6, ch + 8, { x: 3, y: 6, color: "#000000", opacity: 0.22, radius: 3 });
        d.sprite("card", { width: cw, height: ch });
        const top = -ch / 2 + 16;
        if (to) { d.text(`To ${to.name}`, { x: 0, y: top + 12, size: 14, color: "#8a7a70", font: SERIF }); }
        else d.text("Written on the inside of the fold", { x: 0, y: top + 12, size: 14, color: "#8a7a70", font: SERIF });
        d.text(L.text, { x: 0, y: top + 34 + (ch - 118) / 2, size, color: INK, font: SERIF, maxWidth: cw - 44, align: "left", lineHeight: 1.42 });
        const by = ch / 2 - 42;
        d.sprite("faces", { frame: faceFrame(L.from), x: -cw / 2 + 48, y: by, width: 50, height: 50 });
        d.text(who.name, { x: 16, y: by - 7, size: 24, color: CORAL, font: HAND });
        d.text(who.role, { x: 16, y: by + 15, size: 12.5, color: "#8a7a70", font: SERIF });
        d.pop();
        if (c.t > 0.9) d.text("Tap to fold it away", { x: W / 2, y: Math.min(H - S.bottom - 14, cy + ch / 2 + 20), size: 14, color: CREAM, font: SERIF, opacity: Math.min(1, c.t - 0.9) });
    }
    drawTrialCard(d, W, H) {
        const c = this.trialCard, medals = ["Gold", "Silver", "Bronze", "Finished"], cols = ["#efc15f", "#c9ccd2", "#d29a6a", "#fbf1dc"]; c.t += 1 / 60;
        const e = ease(Math.min(1, c.t / 0.4)), y = H * 0.36;
        d.push(); d.translate(W / 2, y); d.scale(e, e); d.rect(250, 150, { y: 3, color: "#000000", opacity: 0.2, radius: 8 }); d.rect(250, 150, { color: CREAM, radius: 8 });
        d.text(c.name, { y: -52, size: 16, color: "#7a6a60", font: SERIF });
        d.text(`${c.time.toFixed(2)}s`, { y: -16, size: 38, bold: true, color: INK, font: SERIF });
        d.circle(13, { x: -52, y: 30, color: cols[c.medal] }); d.text(medals[c.medal], { x: 12, y: 30, size: 20, bold: true, color: INK, font: SERIF });
        d.text(c.stamp ? "A new stamp for the album" : c.best ? "Your best" : "", { y: 56, size: 14, color: CORAL, font: SERIF }); d.pop();
    }
}
