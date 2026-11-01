// The play screen: the carriage, the pocket, the close-ups, the papers and the Conductor's bell.
import { BIRD, DOCS, ITEMS, PUZZLES } from "./story.js";
import { CARRIAGES, Rules } from "./rules.js";
import { HAND, SERIF, WIDGETS, drawFace } from "./widgets.js";
import { SCENES, paintScene } from "./scenes.js";
import { OUTSIDE, SPEED, TH, TW } from "./outside.js";
import { WORLD } from "./kit.js";
import { bake } from "./paint.js";
import { paintPanel } from "./art.js";
import { SONGS } from "./audio.js";

const { W: WW, H: WH, wallTop: WT } = WORLD, GOLD = "#e8c98a", CREAM = "#f6ead0";
const headless = typeof document === "undefined";
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Stage {
    constructor(game, s, prof, snd, api) {
        Object.assign(this, { game, s, prof, snd, api });
        this.r = new Rules(prof.state);
        this.time = 0; this.cam = 0; this.vel = 0; this.mode = null; this.cap = null; this.fade = 1; this.fadeTo = 0; this.held = null; this.heldSticky = false;
        this.lamp = !!prof.highlight; this.idle = 0; this.timers = []; this.hintLevel = 0; this.card = 0; this.moving = 0;
        this.fx = []; this.drops = []; this.press = null; this.stamp = 0; this.jolt = 0; this.beat = 0; this.focus = -1; this.visitT = 0;
        this.ptr = { x: 0, y: 0, pressed: false, down: false, tapped: false };
        s.onUpdate((dt) => this.update(dt));
        s.onDrawUI((d) => this.draw(d));
        this.enter(this.r.s.at, true);
        try { this.hum = game.audio.voice({ wave: "triangle", freq: 48, volume: 0.03 }); } catch { this.hum = null; }
        s.on("leave", () => { this.hum?.stop(); });
        if (this.r.won) this.after(0.4, () => this.api.ending());       // Closed the app on the very last clip.
    }
    get L() {
        const v = this.s.view, sf = v.safe, port = v.height >= v.width;
        const invH = port ? 92 + sf.bottom : 0, invW = port ? 0 : 92 + sf.right, sw = v.width - invW, sh = v.height - invH, k = port ? Math.min(sh / WH, sw / 340) : Math.max(sh / WH, sw / WW), y0 = port ? Math.max(0, (sh - WH * k) / 2 + 8) : 0;
        return { port, sw, sh, k, y0, vw: sw / k, invX: port ? 0 : sw, invY: port ? sh : 0, invW: port ? v.width : invW, invH: port ? invH : v.height, sf, top: sf.top + 28, w: v.width, h: v.height };
    }
    /** Paint a carriage if it isn't on the card yet. */
    ensure(i) {
        const c = CARRIAGES[i], id = c.id, sc = SCENES[id] ?? SCENES.c1;
        const has = this.game.painted ?? (this.game.painted = new Map());
        if (has.has(id)) return;
        const t0 = Date.now(), S = headless ? 1 : 2, { base, props } = paintScene(SCENES[id] ? id : "c1", S), names = [];
        names.push(bake(this.game, `s:${id}`, base));
        for (const k in props) names.push(bake(this.game, `s:${id}:${k}`, props[k]));
        const [sky, far, mid, near] = OUTSIDE[sc.out]();
        names.push(bake(this.game, `o:${id}:0`, sky), bake(this.game, `o:${id}:1`, far), bake(this.game, `o:${id}:2`, mid), bake(this.game, `o:${id}:3`, near));
        has.set(id, names); this.game.paintMs = Date.now() - t0;
        // Keep only the neighbours on the graphics card.
        if (has.size > 3) for (const [k, ns] of has) { if (k !== id && Math.abs(CARRIAGES.findIndex((x) => x.id === k) - i) > 1) { for (const n of ns) this.game.assets.free(n); has.delete(k); break; } }
    }
    enter(i, first = false) {
        this.ensure(i);
        this.r.s.at = i; this.car = CARRIAGES[i]; this.sc = SCENES[this.car.id] ?? SCENES.c1;
        const wasHere = this.r.s.f[`seen:${this.car.id}`];
        this.r.s.f[`seen:${this.car.id}`] = 1;
        this.cam = first && this.r.s.camx ? this.r.s.camx : (!wasHere && this.sc.start) || 0; this.vel = 0;
        this.fade = 1; this.fadeTo = 0; this.visitT = 0;
        this.playMood(); this.save();
        if (!wasHere) { this.card = 3.2; this.after(1.6, () => this.say(this.car.intro)); if (this.prof.night > 1 && this.car.notebook) this.after(6.5, () => this.say(this.car.notebook, true)); }
        this.api.onEnter?.(this);
    }
    playMood() { const m = this.car.mood; if (this.song !== m) { this.song = m; this.game.music(SONGS[m]); } }
    save() { this.r.s.camx = this.cam; this.prof.state = this.r.s; this.api.save(); }
    after(t, fn) { this.timers.push({ t, fn }); }
    say(txt, hand = false) { if (txt) this.cap = { txt, t: Math.max(3.4, 1.6 + txt.length * 0.06), a: 0, hand }; }
    // --- Everything the rules can emit ---
    events(ev, x, y) {
        for (const e of ev) {
            if (e.t === "say") this.say(e.v);
            else if (e.t === "doc") this.openDoc(e.v);
            else if (e.t === "give") { this.snd.give(); this.fly(e.v, x, y); }
            else if (e.t === "open") this.openPuzzle(e.v);
            else if (e.t === "fx") this.snd.fx(e.v);
            else if (e.t === "move") { this.snd.thud(); this.s.shake(4, 0.6, { haptic: false }); this.game.haptic([40, 80, 30, 80, 20]); }
            else if (e.t === "go") this.goTo(e.v);
        }
        this.save();
        if (this.r.won) this.after(0.2, () => this.api.ending());
    }
    goTo(i) {
        if (i < 0 || i >= CARRIAGES.length || this.fadeTo === 1) return;
        this.snd.latch(); this.fadeTo = 1; this.toGo = i; this.held = null; this.heldSticky = false;
    }
    fly(item, x, y) { const L = this.L; this.fx.push({ item, x: x ?? L.sw / 2, y: y ?? L.sh / 2, t: 0 }); }
    openPuzzle(id) {
        const def = PUZZLES[id]; if (!def) return;
        if (def.panel) paintPanel(this.game, def.panel);
        const Cls = WIDGETS[def.kind], ui = this.ui();
        this.w = new Cls(ui, def, this.r.s.w[id]); this.mode = "puzzle"; this.pid = id; this.mt = 0; this.snd.paper(); this.held = null; this.heldSticky = false; this.closeT = 0;
    }
    ui() {
        const self = this;
        return { snd: this.snd, game: this.game, after: (t, f) => this.after(t, f), onSolved: () => this.solved(), holes: () => this.r.holes(),
            get time() { return self.time; }, get bs() { return self.bs; }, bx: (x) => self.bx + x * self.bs, by: (y) => self.by + y * self.bs,
            punched: (h) => { this.s.shake(5, 0.2, { haptic: false }); this.s.freeze?.(0.08); this.s.flash("#fff0d0", 0.1); } };
    }
    solved() {
        this.closeT = 0.9; this.solvedNow = true;
        if (this.w.def.kind !== "gate") { this.snd.latch(); this.s.flash("#ffd9a0", 0.18); }
        this.stamp = 2.2;
    }
    finishPuzzle() {
        const id = this.pid, ev = this.r.solve(id); this.mode = null; this.w = null; this.solvedNow = false; this.hintLevel = 0;
        this.events(ev);
    }
    closeOverlay() {
        if (this.mode === "puzzle") { if (this.solvedNow) return; if (this.w.state) { this.r.s.w[this.pid] = this.w.state(); } this.w = null; this.save(); }
        this.mode = null; this.snd.paper();
    }
    openDoc(id) { this.doc = id === "ticket" ? DOCS.ticketback : DOCS[id]; this.docId = id; this.mode = "doc"; this.mt = 0; this.snd.paper(); }
    openHint() { this.mode = "hint"; this.mt = 0; const h = this.r.hint(); if (this.hkey !== h[1]) { this.hkey = h[1]; this.hintLevel = 1; } this.snd.bell(2); }
    // --- Pointer plumbing ---
    pointer() {
        const q = this.s.input.pointer, p = this.ptr; p.x = q.x; p.y = q.y; p.pressed = q.pressed; p.down = q.down; p.tapped = false;
        if (q.pressed) { this.press = { x: q.x, y: q.y, moved: 0 }; }
        if (this.press) { this.press.moved = Math.max(this.press.moved, Math.hypot(q.x - this.press.x, q.y - this.press.y)); if (q.released) { p.tapped = this.press.moved < 14; p.released = true; this.lastPress = this.press; this.press = null; } else p.released = false; } else p.released = false;
        return p;
    }
    toWorld(x, y) { const L = this.L; return [x / L.k + this.cam, (y - L.y0) / L.k]; }
    /** The smallest hotspot under the point, or failing that the nearest one close by. Fingers are big. */
    hitHot(wx, wy) {
        let best = null, score = 1e9;
        for (const h of this.r.hots()) {
            const [x, y, w, ht] = h.box, dx = Math.max(x - wx, 0, wx - x - w), dy = Math.max(y - wy, 0, wy - y - ht), far = Math.hypot(dx, dy);
            if (far > 34) continue;
            const q = far + (w * ht) / 1e6;
            if (q < score) { score = q; best = h; }
        }
        return best;
    }
    slotRects() {
        const L = this.L, inv = this.r.s.inv, n = Math.max(inv.length, 4), out = [];
        if (L.port) { const sz = Math.min(76, (L.w - 16) / n), x0 = (L.w - sz * inv.length) / 2; inv.forEach((it, i) => out.push({ it, x: x0 + sz * i, y: L.invY + 8, w: sz, h: Math.min(76, sz + 4) })); }
        else { const sz = Math.min(76, (L.h - 16) / n), y0 = (L.h - sz * inv.length) / 2; inv.forEach((it, i) => out.push({ it, x: L.invX + 8, y: y0 + sz * i, w: 76, h: sz })); }
        return out;
    }
    btnRects() { const L = this.L, x = L.sw - 30; return [{ id: "gear", x, y: L.top }, { id: "lamp", x: x - 54, y: L.top }, { id: "bell", x: x - 108, y: L.top }]; }
    update(dt) {
        this.time += dt; this.visitT += dt; this.stamp = Math.max(0, this.stamp - dt); this.card = Math.max(0, this.card - dt);
        const p = this.pointer();
        this.board(this.L); this.overlayLayout(this.L);
        // Fades and carriage changes.
        this.fade += clamp(this.fadeTo - this.fade, -dt * 2.4, dt * 2.4);
        if (this.fadeTo === 1 && this.fade >= 1) { const i = this.toGo; this.fadeTo = 0; this.enter(i); return; }
        for (const t of [...this.timers]) { t.t -= dt; if (t.t <= 0) { this.timers.splice(this.timers.indexOf(t), 1); t.fn(); } }
        if (this.cap) { this.cap.t -= dt; this.cap.a = clamp(this.cap.a + dt * (this.cap.t > 0 ? 3 : -2), 0, 1); if (this.cap.t <= 0 && this.cap.a <= 0) this.cap = null; }
        for (const f of this.fx) f.t += dt * 1.6; this.fx = this.fx.filter((f) => f.t < 1);
        // The train keeps time.
        const still = this.car.still && !this.r.s.f.moving; this.speed = still ? 0 : 1;
        if (!still) { this.beat += dt; if (this.beat > 0.62) { this.beat = 0; this.clk = (this.clk ?? 0) + 1; this.snd.clack(this.clk); this.after(0.16, () => this.snd.clack(this.clk + 1)); this.jolt = 1; } }
        this.jolt = Math.max(0, this.jolt - dt * 6);
        this.hum?.set({ volume: still ? 0 : 0.03 });
        // Past the last board, only your heart is left making any noise.
        if (this.r.s.f["p:c12dest"] && this.car.id === "c12") { this.hb = (this.hb ?? 0) + dt; if (this.hb > 0.92) { this.hb = 0; this.snd.heart(0.7); } }
        this.updateWeather(dt, still);
        if (this.fade > 0.6) return;
        if (this.mode === "puzzle") return this.updatePuzzle(dt, p);
        if (this.mode === "doc" || this.mode === "hint" || this.mode === "menu") return this.updateOverlay(dt, p);
        this.updateScene(dt, p);
        this.keys();
    }
    keys() {
        const i = this.s.input;
        if (i.pressed("hint")) this.openHint();
        if (i.pressed("lampkey")) { this.toggleLamp(); }
        const vis = this.r.hots();
        if (i.pressed("tab") && vis.length) { this.focus = (this.focus + 1) % vis.length; const h = vis[this.focus]; const L = this.L; this.cam = clamp(h.box[0] + h.box[2] / 2 - L.vw / 2, 0, WW - L.vw); this.say(this.car.id ? "" : ""); this.keyHot = h; }
        if (i.pressed("confirm") && this.keyHot) this.tapHot(this.keyHot);
        const inv = this.r.s.inv; for (let k = 1; k <= 9; k++) if (i.pressed(`i${k}`) && inv[k - 1]) { this.held = this.held === inv[k - 1] ? null : inv[k - 1]; this.heldSticky = !!this.held; this.snd.tapSoft(); }
    }
    toggleLamp() { this.lamp = !this.lamp; this.prof.highlight = this.lamp; this.api.save(); this.snd.notch(0.8); }
    updateScene(dt, p) {
        const L = this.L, maxCam = Math.max(0, WW - L.vw), i = this.s.input;
        if (i.down("left")) this.cam -= 340 * dt; if (i.down("right")) this.cam += 340 * dt;
        if (p.pressed) {
            this.idle = 0;
            for (const b of this.btnRects()) if (Math.hypot(p.x - b.x, p.y - b.y) < 26) { this.btnDown = b.id; }
            const hit = this.slotRects().find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h);
            if (hit) { this.dragItem = hit.it; this.dragFrom = hit; this.grabbing = true; }
            else if (!this.btnDown && p.y < L.sh && p.x < L.sw) { this.pan = { x: p.x, c: this.cam }; this.vel = 0; }
        }
        if (this.grabbing && p.down && this.press && this.press.moved > 12) { this.held = this.dragItem; this.heldSticky = false; this.dragging = true; }
        if (this.pan && p.down) { const nc = this.pan.c - (p.x - this.pan.x) / L.k; this.vel = (nc - this.cam) / Math.max(dt, 1e-3); if (this.lastPress !== this.press && this.press?.moved > 10) this.cam = nc; }
        if (p.released || (p.tapped && p.pressed)) {
            const tap = p.tapped, x = p.x, y = p.y;
            if (this.btnDown) { const b = this.btnDown; this.btnDown = null; if (tap) this.tapBtn(b); this.grabbing = false; this.pan = null; }
            else if (this.grabbing) {
                const slot = this.slotRects().find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
                const it = this.dragItem; this.grabbing = false; this.dragItem = null;
                if (this.dragging) {
                    this.dragging = false;
                    if (slot && slot.it !== it) this.combine(it, slot.it);
                    else if (x < L.sw && y < L.sh) { const [wx, wy] = this.toWorld(x, y), h = this.hitHot(wx, wy); this.useOn(it, h, x, y); }
                    this.held = null;
                } else if (tap) {
                    if (this.held && this.held !== it) { this.combine(this.held, it); this.held = null; this.heldSticky = false; }
                    else if (this.held === it) { this.held = null; this.heldSticky = false; this.inspect(it); }
                    else { this.held = it; this.heldSticky = true; this.snd.tapSoft(); this.say(this.itemName(it)); }
                }
            } else if (this.pan) {
                this.pan = null;
                if (tap) { this.vel = 0; this.tapWorld(x, y); } else this.vel = clamp(this.vel, -900, 900);
            }
        }
        if (!p.down && this.vel) { this.cam += this.vel * dt; this.vel *= Math.exp(-dt * 5); if (Math.abs(this.vel) < 4) this.vel = 0; }
        this.cam = clamp(this.cam, 0, maxCam);
        this.idle += dt;
    }
    itemName(it) { return this.faded() ? "A thing. You had it a moment ago." : ITEMS[it].name; }
    faded() { return !!this.car.labelled && !this.r.s.f["p:c11labels"]; }
    tapBtn(b) { if (b === "bell") this.openHint(); else if (b === "lamp") this.toggleLamp(); else { this.mode = "menu"; this.mt = 0; this.snd.paper(); } }
    inspect(it) { if (it === "ticket") this.openDoc("ticket"); else { this.mode = "doc"; this.doc = { kind: "item", item: it }; this.docId = null; this.mt = 0; this.snd.paper(); } }
    combine(a, b) { const ev = this.r.combine(a, b); if (ev) { this.events(ev); this.solvedFlash(); } else { this.snd.wrong(); this.say("Those don't go together."); } }
    solvedFlash() { this.save(); }
    useOn(it, h, sx, sy) {
        if (!h) { this.snd.tapSoft(); return; }
        const ev = this.r.use(it, h.id);
        if (ev) { this.events(ev, sx, sy); this.held = null; this.heldSticky = false; }
        else { this.snd.tapSoft(); this.say("That won't help there."); }
    }
    tapWorld(x, y) {
        const [wx, wy] = this.toWorld(x, y);
        const wr = this.sc.wren; if (wr && !this.prof.wrens.includes(this.car.id) && Math.hypot(wx - wr[0], wy - wr[1]) < 42) { this.prof.wrens.push(this.car.id); this.api.save(); this.flying = { x: wr[0], y: wr[1], t: 0 }; this.snd.pluck(4); this.snd.pluck(3); this.say(`A wren. It looks straight at you. (${this.prof.wrens.length} of 12)`); return; }
        const h = this.hitHot(wx, wy);
        if (this.held && this.heldSticky) { this.useOn(this.held, h, x, y); return; }
        if (h) this.tapHot(h, x, y);
    }
    tapHot(h, x, y) { this.snd.tapSoft(); this.api.tapped?.(h.id); this.events(this.r.tap(h.id), x, y); this.tagFlash = { id: h.id, t: 0.3 }; }
    updatePuzzle(dt, p) {
        this.mt = Math.min(1, this.mt + dt * 4);
        if (this.closeT > 0) { this.closeT -= dt; if (this.closeT <= 0) { this.finishPuzzle(); return; } }
        const L = this.L, q = { x: (p.x - this.bx) / this.bs, y: (p.y - this.by) / this.bs, pressed: p.pressed, down: p.down, tapped: p.tapped, released: p.released };
        if (!this.solvedNow && p.tapped && Math.hypot(p.x - this.cx, p.y - this.cy) < 30) { this.closeOverlay(); return; }
        if (!this.solvedNow && this.s.input.pressed("back")) { this.closeOverlay(); return; }
        const dead = this.solvedNow && this.w.def.kind !== "gate" && this.w.def.kind !== "rush";
        if (!dead) this.w.update(dt, q);
        if (this.s.input.pressed("hint")) { this.closeOverlay(); this.openHint(); }
    }
    updateOverlay(dt, p) {
        this.mt = Math.min(1, this.mt + dt * 4);
        const back = this.s.input.pressed("back") || this.s.input.pressed("confirm");
        if (this.mode === "hint") {
            if (back) { this.closeOverlay(); return; }
            if (p.tapped) { const hb = this.hintBtn; if (hb && this.hintLevel < 3 && Math.abs(p.x - hb.x) < hb.w / 2 + 10 && Math.abs(p.y - hb.y) < 34) { this.hintLevel++; this.snd.bell(1); } else this.closeOverlay(); }
            return;
        }
        if (this.mode === "menu") {
            if (back) { this.closeOverlay(); return; }
            if (p.tapped) {
                const m = this.menuBtns ?? []; for (const b of m) if (Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2 + 4) { b.fn(); return; }
                this.closeOverlay();
            }
            return;
        }
        if (p.tapped || back) this.closeOverlay();
    }
    updateWeather(dt, still) {
        const o = this.sc.out, n = o === "rain" || o === "town" ? 2 : o === "snow" ? 1 : 0;
        for (let i = 0; i < n; i++) if (this.drops.length < 60) this.drops.push({ x: this.game.fxRng.range ? this.game.fxRng.range(0, WW) : Math.random() * WW, y: 40, v: o === "snow" ? 24 + Math.random() * 18 : 420, w: Math.random() });
        for (const q of this.drops) { q.y += q.v * dt; if (o === "snow") q.x += Math.sin(this.time + q.w * 9) * 12 * dt; else q.x -= 120 * this.speed * dt; }
        this.drops = this.drops.filter((q) => q.y < 340);
    }
    // --- Drawing ----------------------------------------------------------------------------------------------
    draw(d) {
        const L = this.L, id = this.car.id, sway = Math.sin(this.time * 1.7) * 0.7 * this.speed + this.jolt * 0.7 * this.speed;
        d.rect(L.w * 2, L.h * 2, { x: L.w / 2, y: L.h / 2, color: "#0a0814" });
        d.push(); d.translate(0, L.y0); d.scale(L.k, L.k); d.translate(-this.cam, sway / L.k);
        this.drawOutside(d, id);
        this.drawConductor(d);
        d.sprite(`s:${id}`, { x: WW / 2, y: WH / 2, width: WW, height: WH });
        this.drawProps(d, id);
        this.drawGlow(d);
        this.drawWren(d);
        if (this.lamp || this.idle > 24 || (this.car.id === "c1" && !this.r.s.f["c1.ticket"])) this.drawHighlights(d, this.lamp ? 1 : 0.6);
        d.pop();
        if (L.y0 > 0) { d.rect(L.w + 2, L.y0, { x: L.w / 2, y: L.y0 / 2, color: "#0a0814" }); const yb = L.y0 + WH * L.k; d.rect(L.w + 2, L.sh - yb + 2, { x: L.w / 2, y: (yb + L.sh) / 2, color: "#0a0814" }); }
        this.drawChrome(d, L);
        if (this.mode === "puzzle") this.drawPuzzle(d, L);
        if (this.mode === "doc") this.drawDoc(d, L);
        if (this.mode === "hint") this.drawHint(d, L);
        if (this.mode === "menu") this.drawMenu(d, L);
        if (this.card > 0) this.drawCard(d, L);
        if (this.fade > 0.003) d.rect(L.w + 4, L.h + 4, { x: L.w / 2, y: L.h / 2, color: "#06040c", opacity: clamp(this.fade, 0, 1) });
    }
    drawOutside(d, id) {
        const v = this.speed, t = this.time, cam = this.cam, y = TH / 2 - 30, sc = this.sc;
        d.sprite(`o:${id}:0`, { x: cam * 0.92 + 600, y: 180, width: 1400, height: TH });
        [[1, SPEED.far, 0.9], [2, SPEED.mid, 0.7], [3, SPEED.near, 0.4]].forEach(([k, sp, par]) => {
            const stillOff = this.moveT ?? 0, off = ((t * sp * v + (1 - par) * -cam) % TW + TW) % TW, x0 = cam - off;
            for (let n = 0; n < 3; n++) d.sprite(`o:${id}:${k}`, { x: x0 + TW * n + TW / 2, y, width: TW + 1, height: TH });
        });
        if (this.drops.length) { const snow = sc.out === "snow"; for (const q of this.drops) { if (snow) d.circle(1.6 + q.w * 1.4, { x: q.x, y: q.y, color: "#fff", opacity: 0.8 }); else d.line({ x: q.x, y: q.y }, { x: q.x + 4, y: q.y - 12 }, { width: 1, color: "#c9d6ec", opacity: 0.5 }); } }
    }
    drawConductor(d) {
        const hole = this.sc.doorHoles?.[0]; if (!hole || this.visitT > 7) return;
        const a = clamp(Math.min(this.visitT - 2, 7 - this.visitT), 0, 1); if (a <= 0) return;
        const [x, y, w, h] = hole, cx = x + w / 2 + Math.sin(this.visitT * 0.6) * 6;
        d.additive(() => d.circle(36, { x: cx + 10, y: y + h * 0.7, color: "#ffb860", opacity: 0.6 * a }));
        d.rect(24, 56, { x: cx, y: y + h - 22, color: "#0a0814", opacity: a, radius: 8 }); d.circle(9, { x: cx, y: y + h - 54, color: "#0a0814", opacity: a }); d.rect(26, 4, { x: cx, y: y + h - 60, color: "#0a0814", opacity: a });
    }
    drawProps(d, id) {
        const sc = this.sc, f = this.r;
        for (const k in sc.props ?? {}) {
            const pr = sc.props[k]; if (k === "bird") continue;
            if (pr.show && !f.cond(pr.show)) continue;
            const [x, y, w, h] = pr.box; d.sprite(`s:${id}:${k}`, { x: x + w / 2, y: y + h / 2, width: w, height: h });
        }
    }
    drawGlow(d) {
        const t = this.time, fl = this.sc.flares ?? [];
        d.additive(() => {
            for (let i = 0; i < fl.length; i++) { const [x, y] = fl[i], q = 0.8 + Math.sin(t * 3.1 + i * 2.2) * 0.06 + Math.sin(t * 7.7 + i) * 0.04 + this.jolt * 0.05; d.sprite("kit:puff", { x, y, width: 240, height: 200, color: this.sc.flare ?? "#ffb060", opacity: 0.42 * q }); d.sprite("kit:puff", { x, y, width: 80, height: 76, color: "#fff0d0", opacity: 0.5 * q }); }
            for (const w of this.sc.windows ?? []) d.poly([{ x: w[0] + w[2] * 0.14, y: w[1] }, { x: w[0] + w[2] * 0.36, y: w[1] }, { x: w[0] + w[2] * 0.2, y: w[1] + w[3] }, { x: w[0] + w[2] * -0.0, y: w[1] + w[3] }], { color: "#fff", opacity: 0.035 });
        });
    }
    drawWren(d) {
        const wr = this.sc.wren; if (!wr) return;
        if (this.flying) { const f = this.flying; f.t += 1 / 60; d.sprite("kit:wren", { x: f.x + f.t * f.t * 400, y: f.y - f.t * 180, width: 40, height: 30, opacity: clamp(1.4 - f.t, 0, 1) }); if (f.t > 1.4) this.flying = null; return; }
        if (this.prof.wrens.includes(this.car.id)) return;
        const hop = Math.max(0, Math.sin(this.time * 1.3)) > 0.97 ? -3 : 0;
        d.sprite("kit:wren", { x: wr[0], y: wr[1] + hop, width: 44, height: 33, flipX: !!wr[2] });
    }
    drawHighlights(d, a) {
        const t = this.time;
        d.additive(() => { for (const h of this.r.hots()) { if (h.id === "back") continue; const [x, y, w, ht] = h.box, pulse = 0.5 + Math.sin(t * 2.6 + x * 0.01) * 0.5; d.circle(Math.min(38, Math.max(w, ht) * 0.32) + pulse * 6, { x: x + w / 2, y: y + ht / 2, color: "#ffd27a", opacity: 0.16 * a * (0.5 + pulse * 0.5) }); d.circle(5 + pulse * 2, { x: x + w / 2, y: y + ht / 2, color: "#fff2c8", opacity: 0.85 * a }); } });
    }
    drawChrome(d, L) {
        // The pocket.
        if (L.port) { d.rect(L.w + 2, L.invH + 2, { x: L.w / 2, y: L.invY + L.invH / 2, color: "#170f14" }); d.rect(L.w, 3, { x: L.w / 2, y: L.invY + 1, color: "#8a6a3a" }); }
        else { d.rect(L.invW + 2, L.h + 2, { x: L.invX + L.invW / 2, y: L.h / 2, color: "#170f14" }); d.rect(3, L.h, { x: L.invX + 1, y: L.h / 2, color: "#8a6a3a" }); }
        const rects = this.slotRects();
        if (!rects.length) d.text(this.car.id === "c1" ? "Your pockets are empty." : "", { x: L.invX + L.invW / 2, y: L.invY + L.invH / 2, size: 15, color: "#8a7a64", font: SERIF, maxWidth: L.invW - 12, align: "center" });
        for (const q of rects) {
            const sel = this.held === q.it, sz = Math.min(q.w, q.h), cx = q.x + q.w / 2, cy = q.y + q.h / 2;
            d.rect(sz - 4, sz - 4, { x: cx, y: cy, color: sel ? "#5a3a18" : "#2a1c20", radius: 8 }); d.rect(sz - 10, sz - 10, { x: cx, y: cy, color: sel ? "#7a5420" : "#20151a", radius: 6 });
            if (!(this.dragging && this.dragItem === q.it)) d.sprite("kit:items", { x: cx, y: cy, width: sz - 12, height: sz - 12, crop: this.game.itemFrame(q.it) });
            if (sel && !this.dragging) d.rect(sz - 2, 2, { x: cx, y: cy + sz / 2 - 2, color: GOLD });
        }
        if (this.dragging && this.dragItem) { const p = this.ptr; d.sprite("kit:items", { x: p.x, y: p.y - 34, width: 72, height: 72, crop: this.game.itemFrame(this.dragItem) }); }
        for (const f of this.fx) { const r = rects.find((q) => q.it === f.item), tx = r ? r.x + r.w / 2 : L.w / 2, ty = r ? r.y + r.h / 2 : L.h, u = f.t, e = u * u * (3 - 2 * u); d.sprite("kit:items", { x: f.x + (tx - f.x) * e, y: f.y + (ty - f.y) * e - Math.sin(u * 3.14) * 40, width: 76 - 16 * u, height: 76 - 16 * u, crop: this.game.itemFrame(f.item) }); }
        // Buttons.
        for (const b of this.btnRects()) {
            d.circle(23, { x: b.x, y: b.y + 1, color: "#000", opacity: 0.45 }); d.circle(21, { x: b.x, y: b.y, color: b.id === "lamp" && this.lamp ? "#7a5420" : "#20151a", opacity: 0.92 }); d.circle(21, { x: b.x, y: b.y, color: GOLD, opacity: 0.16 });
            if (b.id === "bell") { d.poly([{ x: b.x - 4, y: b.y - 9 }, { x: b.x + 4, y: b.y - 9 }, { x: b.x + 10, y: b.y + 7 }, { x: b.x - 10, y: b.y + 7 }], { color: GOLD }); d.circle(3, { x: b.x, y: b.y + 10, color: GOLD }); }
            if (b.id === "lamp") { d.circle(8, { x: b.x, y: b.y - 2, color: GOLD }); d.rect(8, 5, { x: b.x, y: b.y + 9, color: GOLD }); }
            if (b.id === "gear") { d.rect(18, 3, { x: b.x, y: b.y - 6, color: GOLD }); d.rect(18, 3, { x: b.x, y: b.y, color: GOLD }); d.rect(18, 3, { x: b.x, y: b.y + 6, color: GOLD }); }
        }
        // Edges that say there's more.
        const maxCam = WW - L.vw;
        const my = L.y0 + WH * L.k * 0.52; if (this.cam > 6) this.chev(d, 16, my, -1); if (this.cam < maxCam - 6) this.chev(d, L.sw - 16, my, 1);
        if (this.held && this.heldSticky) d.text(`${this.itemName(this.held)}: tap where to use it`, { x: L.sw / 2, y: L.top + 38, size: 14, color: CREAM, font: SERIF });
        if (this.cap) {
            const cap = this.cap, band = L.sh - (L.y0 + WH * L.k), y = band > 60 ? L.sh - band / 2 : L.sh - 44, mw = Math.min(L.sw - 28, 460), size = 16;
            const m = this.game.renderer.measureText(cap.txt, { size, font: cap.hand ? HAND : SERIF, bold: false, align: "center", maxWidth: mw, lineHeight: 1.3 });
            d.rect(Math.min(mw + 28, m.width + 40), m.height + 18, { x: L.sw / 2, y, color: "#0a0814", opacity: 0.74 * cap.a, radius: 10 });
            d.text(cap.txt, { x: L.sw / 2, y, size, color: CREAM, opacity: cap.a, font: cap.hand ? HAND : SERIF, maxWidth: mw, lineHeight: 1.3, align: "center" });
        }
        if (this.stamp > 0) { const a = clamp(this.stamp, 0, 1); d.text("Saved", { x: 34, y: L.top, size: 14, color: GOLD, opacity: a * 0.9, font: SERIF, rot: -0.08 }); }
    }
    chev(d, x, y, dir) { const a = 0.45 + Math.sin(this.time * 2.4) * 0.15; d.line({ x: x - dir * 6, y: y - 14 }, { x: x + dir * 3, y }, { width: 4, color: CREAM, opacity: a }); d.line({ x: x + dir * 3, y }, { x: x - dir * 6, y: y + 14 }, { width: 4, color: CREAM, opacity: a }); }
    board(L) {
        const m = L.port ? 8 : 6, top = L.sf.top + (L.port ? 52 : 6), avail = Math.min(L.sw - m * 2 - (L.port ? 0 : 54), L.sh - top - m);
        this.bs = Math.min(avail / 320, 1.4); this.bx = (L.sw - 320 * this.bs) / 2 - (L.port ? 0 : 20); this.by = top + (L.sh - top - m - 320 * this.bs) / 2;
        this.cx = L.port ? L.sw - 30 : this.bx + 320 * this.bs + 34; this.cy = L.port ? L.sf.top + 26 : this.by + 26;
    }
    drawVeil(d, L, a = 0.76) { d.rect(L.sw + 2, L.sh + 2, { x: L.sw / 2, y: L.sh / 2, color: "#06040c", opacity: a * this.mt }); }
    drawClose(d) { d.circle(23, { x: this.cx, y: this.cy, color: "#20151a" }); d.circle(21, { x: this.cx, y: this.cy, color: GOLD, opacity: 0.2 }); d.line({ x: this.cx - 8, y: this.cy - 8 }, { x: this.cx + 8, y: this.cy + 8 }, { width: 3, color: GOLD }); d.line({ x: this.cx + 8, y: this.cy - 8 }, { x: this.cx - 8, y: this.cy + 8 }, { width: 3, color: GOLD }); }
    drawPuzzle(d, L) {
        this.drawVeil(d, L);
        const w = this.w, def = w.def, b = this.bs, q = 0.96 + 0.04 * this.mt;
        d.push(); d.translate(this.bx + 160 * b * (1 - q), this.by + 160 * b * (1 - q)); d.scale(b * q, b * q);
        if (def.panel) { d.rect(332, 332, { x: 161, y: 164, color: "#000", opacity: 0.5, radius: 10 }); d.sprite(`panel:${def.panel}`, { x: 160, y: 160, width: 320, height: 320 }); }
                w.draw(d);
        if (def.title && !["gate", "scope"].includes(def.kind)) d.text(def.title, { x: 160, y: L.port ? -14 : 22, size: 15, color: CREAM, font: SERIF, opacity: 0.9 });
        d.pop();
        if (!this.solvedNow) this.drawClose(d);
    }
    drawDoc(d, L) {
        this.drawVeil(d, L, 0.7);
        d.push(); d.translate(this.bx, this.by); d.scale(this.bs, this.bs);
        this.paper(d, this.doc);
        d.pop();
    }
    para(d, lines, o) {
        let y = o.y; const style = { size: o.size ?? 16, font: o.font ?? SERIF, bold: !!o.bold, align: o.align ?? "center", maxWidth: o.w ?? 260, lineHeight: 1.26 };
        for (const l of lines) { if (!l) { y += style.size * 0.7; continue; } const m = this.game.renderer.measureText(l, style); d.text(l, { x: o.x ?? 160, y: y + m.height / 2, color: o.color ?? "#2a2230", ...style }); y += m.height + (o.gap ?? 5); }
        return y;
    }
    paperBg(d, x, y, w, h, c = "#efe4c9", rot = -0.012) { d.push(); d.translate(x, y); d.rotate(rot); d.rect(w + 2, h + 2, { x: 2, y: 5, color: "#000", opacity: 0.45, radius: 2 }); d.rect(w, h, { color: c, radius: 2 }); d.rect(w - 10, h - 10, { color: "#fff", opacity: 0.06, radius: 2 }); d.pop(); }
    paper(d, D) {
        const k = D.kind;
        if (k === "note" || k === "hand") { this.paperBg(d, 160, 160, 286, 280, "#f2e8d0"); this.para(d, D.lines, { y: 44, size: 18, font: HAND, gap: 14 }); }
        else if (k === "form" || k === "menu" || k === "map") { this.paperBg(d, 160, 160, 304, 306, "#ead9b4", 0.006); d.rect(280, 2, { x: 160, y: 50, color: "#7c2a26" }); d.text(D.title, { x: 160, y: 32, size: 19, bold: true, color: "#7c2a26", font: SERIF }); this.para(d, D.lines, { y: 62, size: k === "menu" ? 14.5 : 14.5, w: 284, gap: 4, font: k === "menu" ? HAND : SERIF }); }
        else if (k === "photo") { this.paperBg(d, 160, 160, 300, 300, "#f2ece0", 0.02); d.sprite(`kit:${D.pic}`, { x: 160, y: 104, width: 270, height: D.pic === "family" ? 180 : 174 }); this.para(d, D.lines, { y: 206, size: 15, gap: 6, font: HAND, w: 270 }); }
        else if (k === "crayon") { this.paperBg(d, 160, 160, 296, 296, "#f5edd8"); d.sprite(`kit:${D.pic}`, { x: 160, y: 100, width: 270, height: 154 }); this.para(d, D.lines, { y: 190, size: 15.5, gap: 2, font: HAND, color: "#3a5ea8", bold: true }); }
        else if (k === "tag") { this.paperBg(d, 160, 160, 200, 110, "#e9d9b0", 0.05); this.para(d, D.lines, { y: 126, size: 20, font: HAND }); }
        else if (k === "badge" || k === "plate") { d.rect(280, 130, { x: 160, y: 160, color: "#7c5a28", radius: 10 }); d.rect(268, 118, { x: 160, y: 160, color: "#e3bc6e", radius: 8 }); this.para(d, D.lines, { y: 118, size: 21, bold: true, color: "#3a2410", gap: 6 }); }
        else if (k === "clock") { drawFace(d, 160, 140, 112, D.hh * 60 + D.mm); this.para(d, D.lines, { y: 274, size: 16, color: CREAM, gap: 2 }); }
        else if (k === "tape") { this.paperBg(d, 160, 160, 310, 40 + D.lines.length * 44, "#e9e2d0", 0.012); this.para(d, D.lines, { y: 160 - D.lines.length * 20, size: 15, bold: true, w: 290, gap: 15, color: "#1a1420" }); }
        else if (k === "ring") { d.circle(92, { x: 160, y: 130, color: "#e3bc6e" }); d.circle(70, { x: 160, y: 130, color: "#20151a" }); this.para(d, D.lines, { y: 240, size: 17, color: CREAM, gap: 8 }); }
        else if (k === "birds") {
            this.paperBg(d, 160, 160, 310, 310, "#ead9b4", 0.004); d.text(D.title, { x: 160, y: 28, size: 16, bold: true, color: "#2a3a4a", font: SERIF });
            d.sprite("kit:guide", { x: 160, y: 70, width: 300, height: 75 });
            ["Robin", "Sparrow", "Wren", "Swallow"].forEach((n, i) => d.text(n, { x: 42 + i * 79, y: 114, size: 13.5, bold: true, color: "#7c2a26", font: SERIF }));
            this.para(d, ["Robin. Bold at the door in winter.", "Sparrow. Common, cheerful, everywhere.", "Wren. The smallest here, and the loudest. Tail held straight up.", "Swallow. Leaves in autumn. Comes back."], { y: 130, size: 13.5, w: 286, gap: 4 });
            this.para(d, ["In a child's pencil, by the Wren:", "THIS ONE IS ME"], { y: 248, size: 15, font: HAND, color: "#3a5ea8", gap: 2 });
        }
        else if (k === "ticket") {
            d.sprite("kit:ticket", { x: 160, y: 96, width: 296, height: 142 });
            for (let i = 0; i < this.r.holes(); i++) { const b = BIRD[i]; d.circle(4.5, { x: 160 + b[0] * 124, y: 96 + b[1] * 52, color: "#14100c" }); }
            d.text(`No. ${1203 + this.prof.night}`, { x: 70, y: 46, size: 12, bold: true, color: "#f6ead0", font: SERIF });
            d.text("ADMIT ONE", { x: 244, y: 46, size: 11, bold: true, color: "#f6ead0", font: SERIF });
            d.text("From:  ........      To:  ........", { x: 160, y: 142, size: 12, color: "#5a4a3a", font: SERIF });
            const fade = this.r.s.at >= 10;
            this.paperBg(d, 160, 232, 288, 116, "#e6d8b4", 0.008);
            this.para(d, ["On the back, in pencil:", "Please remember", fade ? "Pl_m.  L_nt_rn.  R_bb_n." : "Plum.  Lantern.  Ribbon."], { y: 188, size: 17, font: HAND, gap: 6 });
        }
        else if (k === "item") { const n = ITEMS[D.item]; d.sprite("kit:items", { x: 160, y: 120, width: 170, height: 170, crop: this.game.itemFrame(D.item) }); this.para(d, this.faded() ? ["...", "It's for something."] : [n.name, n.note], { y: 226, size: 17, color: CREAM, gap: 8 }); }
    }
    overlayLayout(L) {
        if (this.mode === "hint") { this.hintBtn = this.hintLevel < 3 ? { x: this.bx + 160 * this.bs, y: this.by + 276 * this.bs, w: 190 } : null; }
        if (this.mode === "menu") { const x = L.sw / 2, y0 = this.by + 70; this.menuBtns = [[`Sound: ${this.game.audio.muted ? "Off" : "On"}`, () => this.api.toggle("muted")], [`Haptics: ${this.game.haptics.enabled ? "On" : "Off"}`, () => this.api.toggle("noHaptics")], [`Highlight: ${this.lamp ? "On" : "Off"}`, () => this.toggleLamp()], ["To the title", () => this.api.title()]].map(([label, fn], i) => ({ x, y: y0 + i * 56, w: 230, h: 46, label, fn })); }
    }
    drawHint(d, L) {
        this.drawVeil(d, L, 0.7);
        d.push(); d.translate(this.bx, this.by); d.scale(this.bs, this.bs);
        this.paperBg(d, 160, 160, 300, 300, "#f2e8d0");
        const h = this.r.hint(), n = this.hintLevel;
        d.text("The Conductor", { x: 160, y: 40, size: 16, bold: true, color: "#7c2a26", font: SERIF });
        d.rect(160, 1.5, { x: 160, y: 54, color: "#7c2a26" });
        let y = 66; for (let i = 1; i <= n; i++) y = this.para(d, [h[i]], { y, size: i === n ? 19 : 15, font: HAND, gap: 12, w: 270, color: i === n ? "#2a2230" : "#7a6a58" });
        d.pop();
        const b = this.hintBtn; if (b) { d.rect(b.w, 42, { x: b.x, y: b.y, color: "#7c2a26", radius: 8 }); d.text(n === 1 ? "A little more" : "Just tell me", { x: b.x, y: b.y, size: 16, color: CREAM, font: SERIF, bold: true }); }
    }
    drawMenu(d, L) {
        this.drawVeil(d, L, 0.7);
        d.text("Paused between stations", { x: L.sw / 2, y: this.by + 24, size: 16, color: GOLD, font: SERIF });
        for (const b of this.menuBtns ?? []) { d.rect(b.w, b.h, { x: b.x, y: b.y, color: "#2a1c20", radius: 8 }); d.text(b.label, { x: b.x, y: b.y, size: 16, color: CREAM, font: SERIF }); }
    }
    drawCard(d, L) {
        const a = clamp(Math.min(this.card, 3.2 - this.card) * 1.6, 0, 1), c = this.car;
        d.rect(L.sw + 2, L.sh + 2, { x: L.sw / 2, y: L.sh / 2, color: "#06040c", opacity: a * 0.55 });
        if (c.title) { d.text(`Carriage ${c.n}`, { x: L.sw / 2, y: L.sh * 0.42, size: 16, color: GOLD, opacity: a, font: SERIF }); d.text(c.title, { x: L.sw / 2, y: L.sh * 0.42 + 34, size: 30, bold: true, color: CREAM, opacity: a, font: SERIF }); }
        else { d.text("Carriage", { x: L.sw / 2, y: L.sh * 0.42, size: 16, color: GOLD, opacity: a * 0.6, font: SERIF }); d.rect(120, 1.5, { x: L.sw / 2, y: L.sh * 0.42 + 34, color: CREAM, opacity: a * 0.5 }); }
    }
    // --- For bots -----------------------------------------------------------------------------------------------
    hotScreen(id) { const h = this.car.hots.find((x) => x.id === id), L = this.L, [x, y, w, ht] = h.box; return { x: (x + w / 2 - this.cam) * L.k, y: (y + ht / 2) * L.k + L.y0, world: x + w / 2 }; }
}
