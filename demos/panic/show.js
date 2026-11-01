// The director: runs a chain of microgames with the page, the host, the prompts, the wipes and the party flow.
import { C, INK, HOST_FACE, PATTERNS, bubble, ensurePat, fit } from "./ink.js";
import { Micro, T, clamp, TAU, byId, ensureArt } from "./engine.js";
import { WIPES } from "./wipes.js";
import { JINGLE, song } from "./audio.js";
import { popButton } from "./ui.js";

const outBack = (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const outCubic = (t) => 1 - (1 - t) ** 3;
export const TOP_SPEED = 2.2;

export function layoutPage(s) {
    const v = s.view, W = v.width, H = v.height, sf = v.safe;
    if (W >= H) {
        const h = Math.max(322, Math.min(H - sf.top - sf.bottom - 10, 420)), w = Math.max(340, Math.min(W * 0.56, 380)), cx = W / 2, cy = sf.top + 5 + h / 2;
        return { land: true, W, H, panel: { cx, cy, w, h }, col: { x0: Math.max(sf.left + 4, 4), x1: cx - w / 2 - 6, x2: cx + w / 2 + 6, x3: W - Math.max(sf.right + 4, 4) } };
    }
    const top = sf.top + 4, y0 = top + 58, h = Math.max(322, Math.min(H - y0 - sf.bottom - 96, 500)), w = Math.min(W - 12, 348);
    return { land: false, W, H, top, panel: { cx: W / 2, cy: y0 + h / 2, w, h }, bottom: y0 + h + 6, sb: sf.bottom };
}

/** Everything outside the panel, drawn over the game so props never spill onto the page. */
export function drawPage(d, L, pageColor, pat, rt) {
    const { W, H, panel: p } = L, x0 = p.cx - p.w / 2, x1 = p.cx + p.w / 2, y0 = p.cy - p.h / 2, y1 = p.cy + p.h / 2;
    const strip = (x, y, w, h) => {
        if (w <= 0 || h <= 0) return;
        d.rect(w, h, { x: x + w / 2, y: y + h / 2, color: pageColor });
        const S = 512 / Math.max(W, H);
        d.sprite("pat_" + pat, { x: x + w / 2, y: y + h / 2, width: w, height: h, crop: [x * S, y * S, w * S, h * S], color: C.wht, opacity: 0.2 });
    };
    strip(0, 0, W, y0); strip(0, y1, W, H - y1); strip(0, y0, x0, y1 - y0); strip(x1, y0, W - x1, y1 - y0);
    d.rect(p.w + 10, 5, { x: p.cx, y: y0 - 2.5, color: INK }); d.rect(p.w + 10, 5, { x: p.cx, y: y1 + 2.5, color: INK });
    d.rect(5, p.h + 10, { x: x0 - 2.5, y: p.cy, color: INK }); d.rect(5, p.h + 10, { x: x1 + 2.5, y: p.cy, color: INK });
    d.rect(p.w + 14, 6, { x: p.cx + 5, y: y1 + 8, color: INK, opacity: 0.5 });
    d.rect(6, p.h + 10, { x: x1 + 8, y: p.cy + 5, color: INK, opacity: 0.5 });
}
export function drawStarburst(d, x, y, R, r, n, col, rot = 0) {
    const pts = [[x, y]];
    for (let i = 0; i <= n * 2; i++) { const a = rot + i * Math.PI / n, q = i % 2 ? r : R; pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); }
    d.poly(pts, { color: col });
}

export class Director {
    constructor(game, s, cfg) {
        this.game = game; this.s = s; this.cfg = cfg; this.save = cfg.save;
        this.L = layoutPage(s);
        this.state = "hold"; this.st = 0; this.hold = null; this.wipe = 0; this.rt = 0;
        this.lives = cfg.lives ?? 4; this.maxLives = cfg.lives ?? 4;
        this.n = 0; this.wins = 0; this.score = 0; this.m = null; this.prev = null; this.result = null; this.lostBell = null; this.streak = 0;
        this.pal = [C.pink, C.yel]; this.pageCol = C.pink; this.pagePat = "dots"; this.paused = false;
        this.nextDef = null; this.face = "idle"; this.faceT = 0; this.ui = [];
        this.party = cfg.party ?? null;
        for (const p of ["dots", "rays", "stripes"]) ensurePat(game.assets, p);
        this.lastTick = 99;
        this.speedShown = 1;
        s.on("resize", () => { this.L = layoutPage(s); this.m?.applyPanel(this.L.panel); this.buildPause(); });
        this.buildPause();
        this.begin();
    }
    get pace() { return 1 / Math.sqrt(this.speedNow()); }
    speedNow() { return this.cfg.speedAt ? this.cfg.speedAt(this.n, this) : 1; }
    buildPause() {
        this.pauseBtn?.destroy();
        const L = this.L, x = L.land ? L.W - this.s.view.safe.right - 28 : L.W - 26, y = L.land ? this.s.view.safe.top + 26 : L.top + 24;
        this.pauseBtn = this.s.add([...popButton("II", { width: 40, height: 40, size: 16, color: C.paper, text: INK, action: "pause", onTap: () => this.togglePause() })]);
        this.pauseBtn.pos.set(x, y);
    }
    togglePause() {
        if (this.state === "hold" && this.hold?.wait) return;
        this.paused = !this.paused;
        this.game.audio.muted = this.paused ? true : !!this.save.muted;
        for (const b of this.ui) b.destroy();
        this.ui = [];
        if (this.paused) {
            const { W, H } = this.L;
            this.ui.push(this.s.add([...popButton("RESUME", { width: 190, height: 58, size: 26, color: C.grn, action: "confirm", onTap: () => this.togglePause() })]));
            this.ui.push(this.s.add([...popButton("QUIT", { width: 190, height: 58, size: 26, color: C.red, onTap: () => { this.game.audio.muted = !!this.save.muted; this.finish(true); } })]));
            this.ui[0].pos.set(W / 2, H / 2 - 40); this.ui[1].pos.set(W / 2, H / 2 + 34);
        }
    }
    begin() {
        this.wipe = 1; this.wipeI = 0;
        this.advance();
    }
    /** Called under full cover: decide what's next. */
    advance() {
        const cfg = this.cfg, def = cfg.next(this);
        if (!def) return this.finish(false);
        this.nextDef = def;
        ensureArt(this.game, def);   // Paint now, while the cover is up and nothing is moving.
        let hold = { t: this.n ? 0.35 * this.pace : 0.2, kind: "score" };
        if (cfg.interstitial) hold = cfg.interstitial(this, def) ?? hold;
        this.setHold(hold);
    }
    setHold(h) {
        this.hold = h; this.state = "hold"; this.st = 0;
        this.killHoldUi();
        if (h.kind === "faster") this.game.sfx(JINGLE.faster, { haptic: [8, 30, 8, 30, 8, 30, 14] });
        if (h.kind === "boss") { this.game.sfx(JINGLE.boss, { haptic: [60, 80, 60, 80, 120] }); this.game.stopMusic(); }
        if (h.kind === "handoff") { this.game.stopMusic(); this.game.sfx(JINGLE.pass, { haptic: "warn" }); }
        if (h.wait) {
            const { W, H } = this.L, s = this.s;
            const b = s.add([...popButton(h.button ?? "READY!", { width: 220, height: 66, size: 30, color: h.buttonColor ?? C.grn, action: "confirm", onTap: () => { this.killHoldUi(); this.hold = { t: 0, kind: "blank" }; this.st = 0; h.done?.(); } })]);
            b.pos.set(W / 2, H - this.s.view.safe.bottom - 62);
            this.holdUi = [b];
        }
    }
    killHoldUi() { for (const b of this.holdUi ?? []) b.destroy(); this.holdUi = []; }
    spawn() {
        const def = this.nextDef, cfg = this.cfg;
        const speed = cfg.bossSpeed && def.boss ? Math.min(this.speedNow(), cfg.bossSpeed) : this.speedNow();
        this.m = new Micro(this.game, this.s, def, { speed, level: cfg.levelAt ? cfg.levelAt(this.n) : 0, seed: cfg.microSeed ? cfg.microSeed() : (cfg.seed ?? 1) * 131 + this.n * 17 + 1, panel: this.L.panel });
        const [c1, c2] = def.bg ?? [C.cyan, C.sky];
        this.pal = [c1, c2];
        this.pageCol = c2 === C.ink ? c1 : c2 === C.wht ? c1 : c2;
        this.pagePat = ["dots", "stripes", "plus", "zig", "tri"][this.n % 5]; ensurePat(this.game.assets, this.pagePat);
        this.game.music(song(def.mood ?? ["bouncy", "funk", "chip", "surf", "march", "spooky"][this.n % 6], Math.round(132 * Math.min(1.7, speed))));
    }
    update(dt) {
        const m = this.m;
        this.rt += dt;
        if (this.pauseBtn) this.pauseBtn.hidden = !!(this.state === "hold" && this.hold?.wait);
        if (this.paused) return;
        this.st += dt;
        if (this.faceT > 0) { this.faceT -= dt; if (this.faceT <= 0) this.face = "idle"; }
        const pace = this.pace;
        switch (this.state) {
            case "hold": {
                if (!this.hold.wait && this.st >= this.hold.t) { this.spawn(); this.wipeI = this.game.fxRng.int(0, WIPES.length - 1); this.state = "open"; this.st = 0; this.game.sfx(JINGLE.whoosh); }
                break;
            }
            case "open":
                this.wipe = 1 - clamp(this.st / (0.3 * pace));
                if (this.wipe <= 0) { this.state = "prompt"; this.st = 0; this.game.sfx(JINGLE.slam, { haptic: [24, 40, 12] }); this.s.shake(5, 0.15, { haptic: false }); this.m.flash?.(C.wht, 0.08); }
                break;
            case "prompt":
                m.tickFx(dt);
                if (this.st >= this.promptTime()) { this.state = "play"; this.st = 0; this.lastTick = 99; }
                break;
            case "play":
                m.update(dt);
                this.fuseTicks();
                if (m.done) { this.state = "outro"; this.st = 0; this.onResult(m); }
                break;
            case "outro":
                m.update(dt);
                if (this.st >= (m.def.outro ?? 0.5) * pace) { this.state = "sting"; this.st = 0; this.sting(); }
                break;
            case "sting":
                m.updateQuiet?.(dt);
                m.tickFx(dt);
                if (this.st >= 0.75 * pace) {
                    this.state = "close"; this.st = 0; this.wipeI = this.game.fxRng.int(0, WIPES.length - 1); this.game.sfx(JINGLE.whoosh);
                }
                break;
            case "close":
                this.wipe = clamp(this.st / (0.3 * pace));
                if (this.wipe >= 1) {
                    this.m = null;
                    if (this.lives <= 0 || this.cfg.ended?.(this)) return this.finish(false);
                    this.n++;
                    this.advance();
                }
                break;
        }
    }
    promptTime() { return 0.72 * this.pace; }
    fuseTicks() {
        const m = this.m;
        if (m.over) return;
        const left = m.dur - m.t, sec = Math.ceil(left / this.m.speed);
        if (sec !== this.lastTick && left / m.speed <= 2) { this.lastTick = sec; this.game.sfx(sec % 2 ? JINGLE.tick : JINGLE.tock, { haptic: "tick" }); this.setFace("shock", 0.6); }
    }
    setFace(f, sec) { this.face = f; this.faceT = sec; }
    onResult(m) {
        const win = m.done === "win", def = m.def;
        this.result = win;
        this.save.seen[def.id] = 1;
        if (win) {
            this.save.wins[def.id] = (this.save.wins[def.id] ?? 0) + 1;
            this.save.top[def.id] = Math.max(this.save.top[def.id] ?? 0, Math.round(m.speed * 10) / 10);
            this.wins++; this.streak++;
            const pts = Math.round((def.boss ? 500 : 100) * m.speed);
            this.gain = pts; this.score += pts;
            if (this.party) this.party.players[this.party.turn].score += pts;
            if (def.boss && !this.party && this.lives < this.maxLives) { this.lives++; this.lifeGained = true; }
        } else {
            this.gain = 0; this.streak = 0;
            if (!this.cfg.endless) { this.lives--; this.lostBell = { i: this.lives, t: 0 }; }
        }
        this.cfg.onResult?.(this, win);
    }
    sting() {
        const win = this.result, r = this.game.fxRng;
        this.game.sfx(win ? (r.chance(0.5) ? JINGLE.win : JINGLE.win2) : (r.chance(0.5) ? JINGLE.fail : JINGLE.fail2), { haptic: win ? [10, 30, 10, 30, 24] : [50, 40, 90] });
        this.stingFace = win ? r.pick(["cheer", "happy", "sly"]) : r.pick(["cry", "dizzy", "scream"]);
        this.game.stopMusic();
        const m = this.m, p = this.L.panel;
        if (win) m.boom(0, 0, [C.yel, C.pink, C.cyan, C.wht], 30, { v0: 120, v1: 420, life: 1 });
        this.s.shake(win ? 3 : 8, win ? 0.15 : 0.3, { haptic: false });
    }
    finish(quit) {
        if (this.finished) return;
        this.finished = true; this.state = "done";
        this.m?.buzzv?.stop();
        this.game.audio.muted = !!this.save.muted;
        this.cfg.finish(this, quit);
    }
    // ------------------------------------------------------------------ drawing
    draw(d) {
        const L = this.L, m = this.m;
        if (m) m.draw(d);
        else d.rect(L.W, L.H, { x: L.W / 2, y: L.H / 2, color: this.pal[0] });
        drawPage(d, L, this.pageCol, this.pagePat, this.rt);
        this.drawHud(d);
        if (m && (this.state === "prompt" || (this.state === "play" && this.st < 0.7 * this.pace))) this.drawHint(d);
        if (m && this.state === "prompt") this.drawPrompt(d);
        if (this.state === "sting") this.drawSting(d);
        if (this.state === "open" || this.state === "close") WIPES[this.wipeI ?? 0](d, this.wipe, L.W + 2, L.H + 2, this.pal[0], this.pal[1]);
        if (this.state === "hold") this.drawHold(d);
        if (this.paused) { d.rect(L.W, L.H, { x: L.W / 2, y: L.H / 2, color: INK, opacity: 0.75 }); bubble(d, "PAUSED", L.W / 2, L.H / 2 - 120, 46, { color: C.yel, t: this.rt, wob: 2 }); }
    }
    hostFace() {
        const m = this.m;
        if (m?.done) return m.done === "win" ? "cheer" : "scream";
        if (this.state === "prompt") return "sly";
        return this.face;
    }
    drawHost(d, x, y, k, face, bob = 2) {
        const b = Math.sin(this.rt * 7) * bob;
        d.push(); d.translate(x, y + b); d.rotate(Math.sin(this.rt * 3.3) * 0.04); d.sprite("host", { width: 140 * k, height: 160 * k, frame: HOST_FACE[face] ?? 0 }); d.pop();
    }
    drawBells(d, x, y, gap, size) {
        const n = this.maxLives;
        for (let i = 0; i < n; i++) {
            const alive = i < this.lives, shake = alive ? 0 : 0, wig = this.state === "play" && alive ? Math.sin(this.rt * 16 + i) * 0.12 * (this.m && this.m.left / this.m.speed < 1.5 ? 2 : 0.3) : 0;
            d.sprite("bell", { x: x + i * gap + shake, y, width: size, height: size, frame: alive ? 0 : 1, rot: wig });
        }
    }
    drawHud(d) {
        const L = this.L, m = this.m, def = m?.def ?? this.nextDef, cfg = this.cfg;
        const verb = (def?.verb ?? "") + "!", p = L.panel, showPrompt = this.state === "play" || this.state === "outro" || this.state === "sting";
        const x0 = p.cx - p.w / 2, x1 = p.cx + p.w / 2, y0 = p.cy - p.h / 2, y1 = p.cy + p.h / 2;
        // The fuse burns along the top of the panel.
        if (m) {
            const k = this.state === "play" || this.state === "outro" ? clamp(1 - m.t / m.dur) : 1, fy = y0 - 2.5, xe = x0 + (x1 - x0) * k;
            d.rect(p.w, 5, { x: p.cx, y: fy, color: C.dgry });
            for (let x = x0 + 5; x < xe; x += 11) d.rect(6, 5, { x, y: fy, color: k < 0.3 ? C.red : C.yel });
            if (!m.done && (this.state === "play")) {
                const f = (this.rt * 20 | 0) % 3;
                d.sprite("fx", { x: xe, y: fy, width: 30 + f * 4, height: 30 + f * 4, frame: 4, color: C.org, rot: this.rt * 9 });
                d.sprite("fx", { x: xe, y: fy, width: 15, height: 15, frame: 0, color: C.yel, rot: -this.rt * 9 });
            }
        }
        if (L.land) {
            const cl = (L.col.x0 + L.col.x1) / 2, cr = (L.col.x2 + L.col.x3) / 2, wr = L.col.x3 - L.col.x2;
            this.drawHost(d, cl, y1 - 92, Math.min(1, (L.col.x1 - L.col.x0) / 134), this.hostFace());
            if (showPrompt) bubble(d, verb, cl, y0 + 34, fit(verb, L.col.x1 - L.col.x0 - 6, 34), { color: C.yel, t: this.rt, wob: 1.2 });
            if (!this.party && !cfg.endless) { this.drawBells(d, cr - (this.maxLives - 1) * 14.5, y1 - 60, 29, 32); }
            bubble(d, this.score, cr, y1 - 22, fit(this.score + "", wr - 10, 28), { color: C.wht });
            if (this.party) bubble(d, this.party.players[this.party.turn]?.name ?? "", cr, y1 - 60, fit("PURPLE", wr - 8, 20), { color: this.party.players[this.party.turn]?.color });
        } else {
            const y = L.bottom, H = L.H;
            if (showPrompt) bubble(d, verb, (L.W - 50) / 2, L.top + 26, fit(verb, L.W - 70, 40), { color: C.yel, t: this.rt, wob: 1.2 });
            const strip = H - L.sb - y, by = y + strip / 2 + 2, hk = clamp(strip / 150, 0.55, 1);
            this.drawHost(d, 12 + 60 * hk, by - 2, hk, this.hostFace());
            if (!this.party && !cfg.endless) this.drawBells(d, 30 + 120 * hk, by - 2, 34, 38);
            else bubble(d, this.party.players[this.party.turn]?.name ?? "", 174, by - 2, 24, { color: this.party.players[this.party.turn]?.color });
            bubble(d, this.score, L.W - 46, by, fit(this.score + "", 80, 26), { color: C.wht });
        }
    }
    drawPrompt(d) {
        const L = this.L, p = L.panel, verb = this.m.def.verb + "!", t = this.st, T0 = this.promptTime();
        const size = fit(verb, Math.min(p.w - 22, 420), 74), y = p.cy - Math.min(p.h * 0.5 - 60, 128);
        const leave = clamp((t - T0 * 0.8) / (T0 * 0.2)), k = outBack(clamp(t / 0.14));
        const bcol = this.pal[0] === C.yel ? C.pink : C.yel;
        const R = Math.min(p.w * 0.56, size * verb.length * 0.46 + 16), r = size * 0.7;
        drawStarburst(d, p.cx, y, (R + 11) * k * (1 - leave), (r + 8) * k * (1 - leave), 13, INK, this.rt * 0.5);
        drawStarburst(d, p.cx, y, R * k * (1 - leave), r * k * (1 - leave), 13, bcol, this.rt * 0.5);
        bubble(d, verb, p.cx, y, size * (1 - leave * 0.6), {
            t: this.rt, wob: 2.5, color: bcol === C.yel ? C.pink : C.wht, shadow: INK,
            pop: (i, n) => outBack(clamp((t - i * 0.028) / 0.13)) * (1 - leave),
        });
    }
    drawHint(d) {
        const m = this.m, h = typeof m.def.hint === "function" ? m.def.hint(m) : m.def.hint;
        if (!h || h[0] === "none") return;
        const k = h[0], t = (this.rt * 1.8) % 1, cx = m.cx, cy = m.cy, ease = (u) => u * u * (3 - 2 * u);
        let x = h[1] ?? 0, y = h[2] ?? 0, press = 0;
        const glove = (gx, gy, f = press, r = -0.15) => d.sprite("hand", { x: cx + gx + 11, y: cy + gy + 27, width: 48, height: 56, frame: f ? 1 : 0, rot: r });
        if (k === "tap" || k === "mash") { const q = k === "mash" ? (this.rt * 8) % 1 : t; press = q < 0.5 ? 1 : 0; y += press ? 0 : -14; m.d = d; glove(x, y); if (press) d.rect(52, 52, { x: cx + h[1], y: cy + h[2], radius: 99, outline: 4, color: C.wht }); return; }
        if (k === "hold") { glove(x, y, 1); d.rect(40 + t * 30, 40 + t * 30, { x: cx + x, y: cy + y, radius: 99, outline: 5, color: C.wht, opacity: 1 - t }); return; }
        if (k === "swipe" || k === "drag") { const [, x0, y0, x1, y1] = h, u = ease(clamp(t * 1.3)), gx = x0 + (x1 - x0) * u, gy = y0 + (y1 - y0) * u; d.line([cx + x0, cy + y0], [cx + gx, cy + gy], { color: C.wht, width: 8, opacity: 0.85 }); glove(gx, gy, 1); return; }
        if (k === "rub") { const r = h[3] ?? 40; glove(x + Math.sin(this.rt * 12) * r, y, 1); return; }
        if (k === "circle") { const r = h[3] ?? 50, a = this.rt * 6; d.rect(r * 2, r * 2, { x: cx + x, y: cy + y, radius: 999, outline: 4, color: C.wht, opacity: 0.8 }); glove(x + Math.cos(a) * r, y + Math.sin(a) * r, 1); return; }
        if (k === "pinch" || k === "spread") { const u = ease(t), g = k === "pinch" ? 60 - u * 42 : 18 + u * 42; glove(x - g, y, 1, 0.5); d.push(); d.translate(cx + x + g + 8, cy + y + 26); d.scale(-1, 1); d.sprite("hand", { width: 48, height: 56, frame: 1, rot: 0.5 }); d.pop(); return; }
        if (k === "twist") { const a = this.rt * 4, r = h[3] ?? 40; glove(x + Math.cos(a) * r, y + Math.sin(a) * r, 1); glove(x - Math.cos(a) * r, y - Math.sin(a) * r, 1); }
    }
    drawSting(d) {
        const L = this.L, t = this.st, win = this.result, p = L.panel, pace = this.pace, T1 = 0.75 * pace;
        const inK = outBack(clamp(t / (0.22 * pace))), outK = clamp((t - T1 * 0.8) / (T1 * 0.2)), k = inK * (1 - outK);
        const cx = p.cx, cy = p.cy;
        d.rect(p.w, p.h, { x: cx, y: cy, color: win ? C.yel : INK, opacity: 0.55 * clamp(t / 0.1) });
        drawStarburst(d, cx, cy, 190 * k, 112 * k, 12, INK, this.rt * (win ? 1 : -0.3));
        drawStarburst(d, cx, cy, 174 * k, 100 * k, 12, win ? C.pink : C.dgry, this.rt * (win ? 1 : -0.3));
        const wig = win ? Math.sin(this.rt * 22) * 0.1 : Math.sin(this.rt * 40) * 0.02;
        d.push(); d.translate(cx + (win ? 0 : Math.sin(this.rt * 50) * 3), cy + 18 - (win ? Math.abs(Math.sin(this.rt * 11)) * 16 : 0)); d.rotate(wig); d.scale(k * (win ? 1.3 : 1.26), k * (win ? 1.3 : 1.26 * (1 - 0.1 * clamp(t * 3))));
        d.sprite("host", { width: 140, height: 160, frame: HOST_FACE[this.stingFace] ?? 0 });
        d.pop();
        if (win && this.gain) bubble(d, "+" + this.gain, cx, cy - 118 * k - 10, 34, { color: C.yel, pop: k, t: this.rt, wob: 1.5 });
        if (!win && this.lostBell && !this.party && !this.cfg.endless) {
            const q = clamp(t / (0.7 * pace)), by = cy - 100 + q * q * 320, bx = cx + 92 + q * 30;
            d.sprite("bell", { x: bx, y: by, width: 54, height: 54, frame: 1, rot: q * 7 });
        }
    }
    drawHold(d) {
        const L = this.L, h = this.hold, { W, H } = L, t = this.st;
        const bg = h.color ?? this.pal[0];
        d.rect(W + 2, H + 2, { x: W / 2, y: H / 2, color: bg });
        const pat = h.kind === "boss" ? "stripes" : "rays";
        d.sprite("pat_" + pat, { x: W / 2, y: H / 2, width: Math.max(W, H) * 1.8, height: Math.max(W, H) * 1.8, rot: pat === "rays" ? this.rt * 0.5 : 0, color: h.kind === "boss" ? INK : C.wht, opacity: 0.22 });
        const k = outBack(clamp(t / 0.25));
        if (h.kind === "score" || h.kind === "blank") {
            if (h.kind === "score" && this.n) { bubble(d, this.n + 1, W / 2, H / 2, 110, { color: C.wht, pop: k, t: this.rt, wob: 3 }); }
        } else if (h.kind === "faster") {
            bubble(d, "FASTER!", W / 2, H / 2 - 70, fit("FASTER!", W - 30, 78), { color: C.yel, pop: (i) => outBack(clamp((t - i * 0.05) / 0.2)), t: this.rt, wob: 4 });
            this.drawHost(d, W / 2 + Math.sin(this.rt * 30) * 6, H / 2 + 76, 1, "scream", 5);
        } else if (h.kind === "boss") {
            const on = (this.rt * 6 | 0) % 2;
            bubble(d, "BOSS!", W / 2, H / 2 - 64, fit("BOSS!", W - 30, 110), { color: on ? C.yel : C.wht, pop: (i) => outBack(clamp((t - i * 0.07) / 0.2)), t: this.rt, wob: 5 });
            this.drawHost(d, W / 2, H / 2 + 80, 1, "scream", 6);
        } else if (h.kind === "clear") {
            bubble(d, "ACT " + h.act + " CLEAR", W / 2, H / 2 - 70, fit("ACT 3 CLEAR", W - 30, 54), { color: C.yel, pop: (i) => outBack(clamp((t - i * 0.03) / 0.2)), t: this.rt, wob: 3 });
            this.drawHost(d, W / 2, H / 2 + 76, 1, "cheer", 6);
        } else if (h.kind === "handoff") {
            const pl = h.player;
            bubble(d, "PASS THE PHONE", W / 2, Math.max(60, H * 0.13), fit("PASS THE PHONE", W - 30, 34), { color: C.wht, pop: k });
            bubble(d, "TO", W / 2, Math.max(60, H * 0.13) + 40, 24, { color: C.wht, pop: k });
            bubble(d, pl.name, W / 2, H * 0.42, fit(pl.name, W - 40, 96), { color: C.yel, pop: (i) => outBack(clamp((t - i * 0.05) / 0.25)), t: this.rt, wob: 4 });
            bubble(d, "ROUND " + h.round, W / 2, H * 0.42 + 76, 26, { color: C.wht, pop: k });
        } else if (h.kind === "board") {
            this.drawBoard(d, h);
        }
    }
    drawBoard(d, h) {
        const { W, H } = this.L, pls = [...this.party.players].sort((a, b) => b.score - a.score), t = this.st, top = pls[0].score || 1;
        bubble(d, h.title ?? "LEADERBOARD", W / 2, 44 + this.s.view.safe.top, fit("LEADERBOARD", W - 30, 34), { color: C.yel });
        const y0 = 86 + this.s.view.safe.top, rowH = Math.min(46, (H - y0 - 96 - this.s.view.safe.bottom) / pls.length);
        pls.forEach((pl, i) => {
            const y = y0 + i * rowH + rowH / 2, q = outCubic(clamp((t - i * 0.08) / 0.5)), max = W - 40, w = (54 + (max - 120) * pl.score / top) * q;
            d.rect(w + 6, rowH - 2, { x: 20 + w / 2, y, color: INK, radius: 9 });
            d.rect(w, rowH - 8, { x: 20 + w / 2, y, color: pl.color, radius: 7 });
            d.text(`${i + 1}. ${pl.name}`, { x: 22 + Math.max(w, 110) / 2, y, size: Math.min(18, rowH * 0.5), bold: true, color: pl.color === C.yel ? INK : C.wht });
            d.text(Math.round(pl.score * q), { x: Math.min(W - 26, 34 + w + 26), y, size: 16, bold: true, color: C.wht });
        });
    }
}
