// The stage camera, perspective, draw order and every effect. It reads the sim and its event list and never writes to either.
import { DEPTH, ENEMIES, GRADES, HEROES, METER_BAR, STAGES } from "./data.js";
import { C } from "./art.js";
import { Puppet, Stamp, drawPuppet, tickClock } from "./puppet.js";
import { BOSSES } from "./bosses.js";
import { FLOOR_T, WALL_H, WALL_W, paintStage } from "./stages.js";
import { paintBoss } from "./bossart.js";

export const FONT = '"Arial Black","Arial Rounded MT Bold",Impact,ui-rounded,system-ui,sans-serif';
const P0 = 0.8, P1 = 1.14, TILT = 0.72;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const WORD_C = [["#fff4dc", C.tomato], ["#ffc52e", C.tomato], ["#fff4dc", C.blue], ["#ffffff", C.pink]];
const DROP = { tray: "w_tray", mop: "w_mop", custard: "w_custard", cookie: "i_cookie", milk: "i_milk", pudding: "i_pudding" };
const PROP = { table: "x_table", crate: "x_crate", locker: "x_locker", bench: "x_bench", shelf: "x_shelf", vent: "x_vent" };
const SHOT = { peas: "p_peas", ball: "p_ball", beaker: "p_beaker", book: "p_book", gravy: "p_gravy", slip: "p_slip", crouton: "p_crouton", tray: "w_tray", mop: "w_mop", custard: "w_custard" };
const LANE = { mustard: "#ffc52e", ball: "#ff6b5a", stack: "#b083e8", cheese: "#ffc52e", charge: "#ff5a3a" };
const RING = { wobble: "#6fe8a8", shh: "#b083e8", belch: "#c8e060", whistle: "#fff4dc" };

export class View {
    constructor(s, sim, cast, sound) {
        this.s = s; this.sim = sim; this.st = new Stamp(cast); this.parts = cast; this.sound = sound;
        const id = sim.cfg.id;
        this.bg = paintStage(s.assets, id); this.bossSt = null;
        const b = sim.cfg.boss; this.bossParts = paintBoss(s.assets, b); this.bossSt = new Stamp(this.bossParts, "boss_" + b);
        this.pups = new Map(); this.fx = []; this.parts2 = []; this.decals = []; this.camX = 300; this.shakeX = 0; this.zoomKick = 0; this.punch = 0; this.pulse = 0; this.t = 0; this.floorRows = null;
        this.layout();
    }
    layout() {
        const v = this.s.view, portrait = v.height > v.width;
        this.deck = portrait ? Math.round(Math.min(v.height * 0.34, 214 + v.safe.bottom)) : 0;
        const top = 0, bottom = v.height - this.deck;
        this.Z = portrait ? Math.max(v.width / 430, Math.min(0.9, (bottom - top) / 560)) : Math.min(v.width / 720, v.height / 352);
        this.floorH = DEPTH * TILT * this.Z;
        this.Y0 = bottom - this.floorH * 1.14;
        this.cx = v.width / 2;
    }
    p(z) { return P0 + (P1 - P0) * (z / DEPTH); }
    sx(x, z) { return this.cx + (x - this.camX) * this.p(z) * this.Z; }
    sy(y, z) { return this.Y0 + (z / DEPTH) * this.floorH - y * this.p(z) * this.Z; }
    pup(a) {
        let p = this.pups.get(a.id);
        if (!p) { p = new Puppet(a, a.hero ? a.key : a.type, this.sim.stageIdx); this.pups.set(a.id, p); }
        return p;
    }
    /** Once per sim step, after the sim has stepped. */
    update() {
        tickClock(); this.t++;
        const sim = this.sim, h = sim.hero, v = this.s.view, W = v.width / (this.Z * 0.97);
        // Lead towards the fight, and hold the whole arena when it fits.
        let tx = h.x + h.face * 40, n = 0, sum = 0;
        for (const e of sim.enemies) if (e.hp > 0 && e.st !== "spawn") { sum += e.x; n++; }
        if (n) tx = lerp(tx, sum / n, 0.28);
        const b = sim.bounds;
        const lo = b.x0 + W / 2 - 30, hi = b.x1 - W / 2 + 30;
        tx = lo < hi ? clamp(tx, lo, hi) : (b.x0 + b.x1) / 2;
        this.camX += (tx - this.camX) * (h.st === "tagin" ? 0.2 : 0.09);
        for (const e of sim.enemies) this.pup(e).update();
        this.pup(sim.team.dot).update(); this.pup(sim.team.pip).update();
        if (this.pups.size > 40) for (const [id, p] of this.pups) if (p.a.gone || (!p.a.hero && !sim.enemies.includes(p.a))) this.pups.delete(id);
        for (const f of this.fx) { f.t++; if (f.step) f.step(f); }
        this.fx = this.fx.filter((f) => f.t < f.life);
        this.punch *= 0.86;
    }

    // --- Effects ------------------------------------------------------------------------------------------------------
    word(text, x, y, z, big = false, col = 0) { if (this.t - (this.lastWord?.[text] ?? -99) < 8) return; (this.lastWord ??= {})[text] = this.t; this.fx.push({ kind: "word", t: 0, life: big ? 42 : 26, text, x, y, z, big, col: WORD_C[col % WORD_C.length], rot: (game_rand() - 0.5) * 0.4, vy: 1.3 }); if (this.fx.filter((f) => f.kind === "word").length > 6) { const i = this.fx.findIndex((f) => f.kind === "word"); this.fx.splice(i, 1); } }
    burst(x, y, z, size, col) { this.fx.push({ kind: "burst", t: 0, life: 12, x, y, z, size, col, rot: game_rand() * 6 }); }
    ring(x, y, z, size, col, life = 18) { this.fx.push({ kind: "ring", t: 0, life, x, y, z, size, col }); }
    chips(x, y, z, n, cols, sp = 7) {
        const s = this.s, px = this.sx(x, z), py = this.sy(y, z);
        s.burst({ at: [px, py], count: n, color: cols, speed: [sp * 20, sp * 56], life: [0.2, 0.55], size: [3, 8], gravity: 900 });
    }
    food(x, y, z, sprite) { const dir = (game_rand() - 0.5) * 2; this.fx.push({ kind: "food", t: 0, life: 70, x, y, z, vx: dir * 6, vy: 11, sprite, spin: dir * 0.3, a: 0, step(f) { f.x += f.vx; f.y += f.vy; f.vy -= 0.42; f.a += f.spin; } }); }
    splat(x, z, col, size = 1) { this.decals.push({ x, z, col, size, rot: game_rand() * 0.6 - 0.3, a: 1 }); if (this.decals.length > 24) this.decals.shift(); }
    speed(x, y, z, dir, n = 3) { for (let i = 0; i < n; i++) this.fx.push({ kind: "speed", t: 0, life: 10 + i * 2, x: x - dir * (20 + i * 26), y: y + (game_rand() - 0.5) * 60, z, dir }); }

    // --- Drawing ------------------------------------------------------------------------------------------------------
    draw(d) {
        const s = this.s, sim = this.sim, v = s.view;
        const kick = this.punch > 0.002;
        this.drawBackdrop(d);
        const st = this.st;
        if (kick) { const v2 = s.view, cy = this.Y0; d.push(); d.translate(this.cx, cy); d.scale(1 + this.punch, 1 + this.punch); d.translate(-this.cx, -cy); }
        // Floor decals and telegraphs lie flat under everyone.
        for (const c of this.decals) { const p = this.p(c.z) * this.Z; st.part(d, "splat", this.sx(c.x, c.z), this.sy(0, c.z), { rot: c.rot * 0.1, sx: p * c.size * 0.9, sy: p * c.size * 0.42, color: c.col, opacity: 0.86 }); }
        this.drawHazards(d);
        // Everything that stands, sorted by depth.
        const list = [];
        for (const p of sim.props) list.push({ z: p.z, draw: () => this.drawProp(d, p) });
        for (const e of sim.drops) list.push({ z: e.z, draw: () => this.drawDrop(d, e) });
        for (const e of sim.enemies) list.push({ z: e.z + (e.y > 0 ? 2 : 0), draw: () => (e.boss ? this.drawBoss(d, e) : this.drawActor(d, e)) });
        const h = sim.hero; list.push({ z: h.z + 0.5, draw: () => this.drawActor(d, h, true) });
        for (const o of sim.shots) list.push({ z: o.z, draw: () => this.drawShot(d, o) });
        list.sort((a, b) => a.z - b.z);
        for (const it of list) it.draw();
        this.drawFx(d);
        if (kick) d.pop();
        this.drawArrows(d);
    }
    /** Tall screens see the ceiling: strip lights on chains, so it isn't an empty band. */
    ceiling(d, top, p0) {
        const v = this.s.view, gap = 300 * p0, sp = ((this.cx - this.camX * p0) % gap + gap) % gap - gap, y = top - 26;
        for (let x = sp; x < v.width + gap; x += gap) {
            d.rect(2.4, y + 4, { x: x - 34, y: y / 2, color: C.ink, opacity: 0.16 }); d.rect(2.4, y + 4, { x: x + 34, y: y / 2, color: C.ink, opacity: 0.16 });
            d.rect(122, 17, { x, y, color: C.ink, radius: 7 }); d.rect(116, 11, { x, y, color: "#fffdf0", radius: 5 });
        }
    }
    /** Portrait can't show the whole arena; chevrons say who's coming from where. */
    drawArrows(d) {
        const v = this.s.view, st = this.st;
        for (const e of this.sim.enemies) {
            if (e.hp <= 0 || e.boss) continue;
            const x = this.sx(e.x, e.z), off = x < -14 ? -1 : x > v.width + 14 ? 1 : 0;
            if (!off) continue;
            const y = this.sy(60, e.z), ax = off < 0 ? v.safe.left + 15 : v.width - v.safe.right - 15, tel = e.st === "tel" && this.t % 8 < 4;
            st.part(d, "alert", ax, y, { sx: 0.5, rot: off * 1.57, color: tel ? "#ffffff" : undefined, opacity: 0.9 });
        }
    }
    drawBackdrop(d) {
        const v = this.s.view, bg = this.bg, Z = this.Z, sheet = bg.sheet, p0 = P0 * Z;
        // Back wall sits on the far edge of the floor and scrolls at far-plane speed.
        const wallBase = this.Y0 - 6 * Z, tw = WALL_W * p0, th = WALL_H * p0;
        const top = wallBase - th;
        if (top > -4) { d.rect(v.width + 20, top + 8, { x: v.width / 2, y: top / 2 - 2, color: bg.sky }); if (!bg.open) { d.rect(v.width + 20, 9, { x: v.width / 2, y: top - 2, color: C.ink, opacity: 0.24 }); if (top > 130) this.ceiling(d, top, p0); } }
        const u = this.cx - this.camX * p0; let x0 = ((u % tw) + tw) % tw - tw;
        for (let x = x0; x < v.width; x += tw) d.sprite(sheet, { crop: bg.wall, x: x + tw / 2, y: wallBase - th / 2, width: tw + 1, height: th + 0.5 });
        // The floor, in bands. Each tile is sheared along its own vanishing line, so edges run true and don't stair-step.
        const rows = 20, fy0 = wallBase - 1, fy1 = v.height - this.deck + 2, H = fy1 - fy0, T = FLOOR_T, [cx, cy, cw, ch] = bg.floor, cX = this.cx, cam = this.camX;
        for (let i = 0; i < rows; i++) {
            const ya = fy0 + H * (i / rows), yb = fy0 + H * ((i + 1) / rows), za = (ya - this.Y0) / this.floorH * DEPTH, zb = (yb - this.Y0) / this.floorH * DEPTH;
            const pa = this.p(za) * Z, pb = this.p(zb) * Z, pm = (pa + pb) / 2, zm = (za + zb) / 2, tile = T * pm, w = T * Math.max(pa, pb) + 1;
            const vv = ((zm * 2.2 % T) + T) % T / T, h = Math.ceil(ch / rows * 0.9), cropY = cy + Math.min(ch - h - 1, Math.floor(vv * ch));
            const first = Math.floor((cam - (cX + 40) / pm) / T), last = Math.ceil((cam + (v.width - cX + 40) / pm) / T);
            for (let k = first; k <= last; k++) {
                const X = (k + 0.5) * T - cam, xa = cX + X * pa, xb = cX + X * pb;
                d.push(); d.translate((xa + xb) / 2, (ya + yb) / 2);
                const sh = (xb - xa) / (yb - ya), m = d.m; m[2] += m[0] * sh; m[3] += m[1] * sh;   // No shear in the draw API yet.
                d.sprite(sheet, { crop: [cx, cropY, cw, h], x: 0, y: 0, width: w, height: yb - ya + 1 });
                d.pop();
            }
        }
        // A contact shadow where the wall meets the floor.
        d.rect(v.width + 20, 10, { x: v.width / 2, y: wallBase + 3, color: C.ink, opacity: 0.2 });
    }
    shadow(d, x, z, size = 1, y = 0) { const p = this.p(z) * this.Z, a = 1 / (1 + y * 0.008); this.st.part(d, "shadow", this.sx(x, z), this.sy(0, z), { sx: p * size * a, sy: p * size * a }); }
    drawActor(d, a, hero = false) {
        const P = this.pup(a), pz = this.p(a.z) * this.Z, x = this.sx(a.x, a.z), y = this.sy(a.y, a.z);
        if (a.st === "ko" && a.t > 150) return;
        if (a.gone) return;
        if (hero && a.inv > 0 && a.st !== "dodge" && a.st !== "special" && a.st !== "atk" && this.t % 6 < 2) return;
        const R = a.def ? (a.type === "big" ? 1.5 : 1) : 1;
        this.shadow(d, a.x, a.z, (hero && a.key === "dot" ? 1.1 : 0.84) * R, a.y);
        // Ghosts behind a dodge.
        if (hero && a.st === "dodge") for (let i = 1; i <= 3; i++) drawPuppet(d, this.st, P, x - a.vx * 0.016 * i * 2 * pz, y, pz, { color: i % 2 ? "#4fe8d8" : "#ff8ac0" });
        if (a.st === "tel" && !hero) {
            const k = clamp(a.t / a.atk.tel, 0, 1), big = 1 + Math.sin(k * 3.14) * 0.3, h = a.def.h ?? 100;
            this.st.part(d, "alert", x, this.sy(a.y + h * 1.32 + 10 * k, a.z), { sx: pz * big * 0.82, opacity: 1 });
        }
        drawPuppet(d, this.st, P, x, y, pz);
        if (a.flash > 3 || (a.st === "tel" && a.t % 8 < 4)) {
            const c = a.st === "tel" ? "#ff5a3a" : "#ffffff";
            d.additive(() => drawPuppet(d, this.st, P, x, y, pz, { color: c }));
        }
        if (a.st === "dizzy") this.stars(d, x, y - (a.def.h ?? 100) * 1.22 * pz, pz);
        if (!hero && a.st === "ko" && a.t < 90) this.stars(d, x, y - 76 * pz, pz * 0.8);
        if (hero && a.wp) this.durability(d, a, x, y, pz);
    }
    stars(d, x, y, k) { for (let i = 0; i < 3; i++) { const a = this.t * 0.14 + i * 2.09; this.st.part(d, "star", x + Math.cos(a) * 34 * k, y + Math.sin(a) * 11 * k, { sx: k * 0.6, rot: a }); } }
    durability(d, a, x, y, k) {
        const w = a.wp, max = { tray: 14, mop: 12, custard: 3 }[w.type], f = w.dur / max;
        d.rect(44 * k + 3, 7, { x, y: y + 7, color: C.ink, radius: 3 }); d.rect(44 * k * f, 3.6, { x: x - 22 * k * (1 - f), y: y + 7, color: f < 0.3 ? C.tomato : C.mustard, radius: 2 });
    }
    drawProp(d, p) {
        if (p.broken) return;
        const k = this.p(p.z) * this.Z, x = this.sx(p.x, p.z) + (p.flash > 0 ? (p.flash % 2 ? 2 : -2) : 0), y = this.sy(0, p.z), name = PROP[p.kind];
        this.shadow(d, p.x, p.z, p.kind === "crate" ? 0.9 : 1.5);
        this.st.part(d, name, x, y, { sx: k });
        if (p.drop && this.t % 80 < 8) d.additive(() => this.st.part(d, name, x, y, { sx: k, color: "#c8a060", opacity: 0.6 }));
        if (p.flash > 4) d.additive(() => this.st.part(d, name, x, y, { sx: k, color: "#ffffff" }));
    }
    drawDrop(d, e) {
        const k = this.p(e.z) * this.Z, bob = e.y > 0 ? 0 : Math.abs(Math.sin(this.t * 0.08)) * 6, x = this.sx(e.x, e.z), y = this.sy(e.y + bob, e.z);
        this.shadow(d, e.x, e.z, 0.5, bob * 4);
        if (e.life - e.t < 120 && this.t % 10 < 5) return;
        const n = DROP[e.kind], w = e.kind === "mop" ? 0.5 : e.kind === "tray" ? 0.8 : 1;
        d.additive(() => this.st.part(d, "burst", x, y - 26 * k, { sx: k * 0.56, rot: this.t * 0.02, color: "#ffc52e", opacity: 0.4 }));
        this.st.part(d, n, x, y - (e.kind === "mop" ? 90 * w * k * 0.9 - 40 : e.kind === "tray" ? -6 : 0), { sx: k * w * 1.1, rot: e.kind === "mop" ? 1.3 : 0 });
    }
    drawShot(d, o) {
        const k = this.p(o.z) * this.Z, x = this.sx(o.x, o.z), y = this.sy(o.y, o.z), n = SHOT[o.kind] ?? "p_peas";
        this.shadow(d, o.x, o.z, 0.4, o.y);
        const a = o.foe ? this.t * 0.2 : this.t * 0.6;
        this.st.part(d, n, x, y, { sx: k * (o.foe ? 1.1 : 0.9), rot: a });
    }
    drawHazards(d) {
        const sim = this.sim, st = this.st;
        for (const o of sim.shots) if (o.target) {
            const k = this.p(o.target.z) * this.Z, q = 1 - clamp(o.life / o.flight, 0, 1);
            st.part(d, "reticle", this.sx(o.target.x, o.target.z), this.sy(0, o.target.z), { sx: k * 1.3 * (1.4 - q * 0.6), sy: k * 1.1 * (1.4 - q * 0.6), color: C.tomato, opacity: 0.5 + q * 0.5 });
            st.part(d, "reticle", this.sx(o.target.x, o.target.z), this.sy(0, o.target.z), { sx: k * 0.9 * q, sy: k * 0.8 * q, color: C.tomato, opacity: q });
        }
        for (const z of sim.hazards) {
            const k = (zz) => this.p(zz) * this.Z;
            if (z.type === "ring") {
                if (z.r < 0) continue;
                // Beads, not a scaled sprite: the band on screen stays as thick as the band that hurts.
                const c = RING[z.kind] ?? "#fff4dc", K = k(z.z), cx = this.sx(z.x, z.z), cy = this.sy(0, z.z), n = clamp(Math.round(z.r / 7), 14, 44), rx = z.r * K, ry = rx * TILT / 1.5, b = z.w * 0.62 * K;
                for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; st.dot(d, x, y, b + 2, C.ink, 0.9); }
                for (let i = 0; i < n; i++) { const a = (i / n) * 6.283, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry; st.dot(d, x, y, b, c); }
            } else if (z.type === "lane") {
                const kk = k(z.z), y = this.sy(0, z.z), w = this.s.view.width, h = z.w * 2 * TILT * this.Z * 0.92, q = z.t / z.tel, fired = z.t > z.tel, col = LANE[z.kind] ?? C.tomato;
                if (!fired) {
                    const blink = (z.t % 10 < 5 ? 0.42 : 0.26) + q * 0.2;
                    d.rect(w + 40, h, { x: w / 2, y, color: col, opacity: blink });
                    d.rect(w + 40, 3, { x: w / 2, y: y - h / 2, color: col }); d.rect(w + 40, 3, { x: w / 2, y: y + h / 2, color: col });
                    const dir = z.dir ?? 1; for (let i = 0; i < 6; i++) { const ax = (((this.t * 3 * dir + i * 90) % 540) + 540) % 540; st.part(d, "alert", ax - 90 + w * 0.2, y, { sx: 0.34, rot: dir * 1.57, opacity: 0.6 }); }
                } else if (z.act > 0) {
                    const fade = 1 - (z.t - z.tel) / (z.act + 12);
                    d.rect(w + 40, h * 1.1, { x: w / 2, y, color: col, opacity: fade });
                    d.additive(() => d.rect(w + 40, h * 0.6, { x: w / 2, y, color: "#ffffff", opacity: fade * 0.7 }));
                }
            } else if (z.type === "drop") {
                const K = k(z.z), q = clamp(z.t / z.tel, 0, 1), x = this.sx(z.x, z.z), y = this.sy(0, z.z), rr = z.r / 44;
                st.part(d, "shadow", x, y, { sx: K * rr * (0.4 + q * 0.8), sy: K * rr * (0.4 + q * 0.8) * 1.3, opacity: 0.4 + q * 0.6 });
                st.part(d, "reticle", x, y, { sx: K * rr, sy: K * rr * 0.8, color: C.tomato, opacity: 0.7 });
                st.part(d, SHOT[z.kind] ?? "p_book", x, y - (1 - q) * (1 - q) * 420 * K, { sx: K * 1.6, rot: this.t * 0.2 });
            } else if (z.type === "custard" || z.type === "acid") {
                const K = k(z.z), a = clamp((z.life - z.t) / 40, 0, 1), rr = z.r / 44, g = clamp(z.t / 10, 0, 1);
                st.part(d, "splat", this.sx(z.x, z.z), this.sy(0, z.z), { sx: K * rr * g, sy: K * rr * 0.48 * g, color: z.type === "custard" ? "#ffd84a" : "#7fe05a", opacity: a * 0.92 });
                if (z.type === "acid" && this.t % 30 === 0) this.fx.push({ kind: "bubble", t: 0, life: 24, x: z.x + (game_rand() - 0.5) * z.r, y: 4, z: z.z });
            }
        }
    }
    drawBoss(d, b) {
        const id = b.bossId, st = this.bossSt, cast = this.st, k = this.p(b.z) * this.Z, x = this.sx(b.x, b.z), y = this.sy(b.y, b.z), P = this.bossParts, t = this.t;
        if (b.gone) return;
        const m = b.mv, part = b.part, wait = m && part === 0, rec = m && part === 2;
        const tel = wait ? clamp(b.mvT / (m.tel || 1), 0, 1) : 0;
        let sx = 1, sy = 1, lean = 0, eye = "poss", mouth = "snarl", wob = Math.sin(t * 0.07) * 0.018;
        if (wait) { sx = 1 + tel * 0.14; sy = 1 - tel * 0.16; lean = -0.05 * b.face * tel; mouth = "yell"; }
        if (m && part === 1) { sx = 0.9; sy = 1.14; lean = 0.08 * b.face; mouth = "yell"; }
        if (rec) { sx = 1.05; sy = 0.94 + Math.sin(t * 0.3) * 0.02; eye = "wide"; mouth = "tongue"; }
        if (b.dizzy > 0) { eye = "dizzy"; mouth = "tongue"; sx = 1 + Math.sin(t * 0.2) * 0.05; sy = 1 - Math.sin(t * 0.2) * 0.05; lean = Math.sin(t * 0.09) * 0.07; }
        if (b.flash > 3) { sx += 0.05; sy -= 0.05; eye = "hurt"; mouth = "ouch"; }
        if (b.st === "bossdie") { const q = clamp(b.t / 170, 0, 1); sy = 1 - q * 0.5 + Math.sin(t) * 0.04; sx = 1 + q * 0.4; lean = Math.sin(t * 0.5) * 0.1; eye = "dizzy"; mouth = "tongue"; }
        const body = P.body, jit = b.flash > 3 ? (t % 2 ? 3 : -3) : 0;
        if (b.shadow) { const q = clamp(m ? b.mvT / m.dur : 0, 0, 1); cast.part(d, "reticle", this.sx(b.shadow.x, b.shadow.z), this.sy(0, b.shadow.z), { sx: this.p(b.shadow.z) * this.Z * 2.2, sy: this.p(b.shadow.z) * this.Z * 1.7, color: C.tomato, opacity: 0.5 + q * 0.5 }); }
        this.shadow(d, b.x, b.z, b.w / 42, b.y);
        const drawAll = (col) => {
            d.push(); d.translate(x + jit, y); d.rotate(lean + wob); const art = ART_K[id] ?? 1; d.scale(k * sx * art * (b.face < 0 ? -1 : 1), k * sy * art);
            BOSS_DRAW[id]({ d, st, cast, b, P, t, tel, part, m, col, eye, mouth });
            d.pop();
        };
        drawAll();
        if (b.flash > 2 || (b.open && t % 12 < 3)) d.additive(() => drawAll(b.flash > 2 ? "#6a6a6a" : "#5a2a10"));
        if (b.dizzy > 0) this.stars(d, x, y - b.h * 1.08 * k, k * 1.4);
        if (wait && m.tel > 20) { const hop = 1 + Math.sin(t * 0.5) * 0.12; cast.part(d, "alert", x, y - (b.h + 46) * k * sy, { sx: k * 1.2 * hop }); }
    }
    drawFx(d) {
        const st = this.st;
        for (const f of this.fx) {
            const q = f.t / f.life;
            if (f.kind === "burst") { const K = this.p(f.z) * this.Z * f.size * (0.6 + q * 0.7), x = this.sx(f.x, f.z), y = this.sy(f.y, f.z); d.additive(() => st.part(d, "burst", x, y, { sx: K * 1.08, rot: f.rot, color: f.col, opacity: 1 - q })); st.part(d, "burst", x, y, { sx: K * 0.76, rot: f.rot + 0.3, color: "#ffffff", opacity: (1 - q) * (1 - q) }); }
            else if (f.kind === "ring") { const K = this.p(f.z) * this.Z * f.size * (0.2 + q * 1.1); st.part(d, "ring", this.sx(f.x, f.z), this.sy(f.y, f.z), { sx: K, color: f.col, opacity: 1 - q }); }
            else if (f.kind === "speed") { const K = this.p(f.z) * this.Z; st.part(d, "speed", this.sx(f.x, f.z), this.sy(f.y, f.z), { sx: K * (0.9 - q * 0.6), sy: K * 0.6, opacity: (1 - q) * 0.8, color: C.cream }); }
            else if (f.kind === "food") { st.part(d, f.sprite, this.sx(f.x, f.z), this.sy(f.y, f.z), { sx: this.p(f.z) * this.Z, rot: f.a }); }
            else if (f.kind === "bubble") { st.part(d, "disc", this.sx(f.x, f.z), this.sy(f.y + q * 26, f.z), { sx: 0.2 * (1 - q) + 0.05, color: "#a4f07a", opacity: 1 - q }); }
            else if (f.kind === "drip") { st.part(d, "drop", this.sx(f.x, f.z), this.sy(f.y, f.z), { sx: f.size, color: f.col }); }
            else if (f.kind === "smear") { this.drawSmear(d, f, q); }
            else if (f.kind === "leaver") { const K = this.p(f.z) * this.Z, a = f.pup.a, keep = { st: a.st }; drawPuppet(d, st, f.pup, this.sx(f.x + f.dir * f.t * 13, f.z), this.sy(f.t * 16 - f.t * f.t * 0.12, f.z), K); }
            else if (f.kind === "geyser") { const K = this.p(f.z) * this.Z, x = this.sx(f.x, f.z), y = this.sy(0, f.z), hh = Math.sin(Math.min(1, q * 1.6) * 1.57) * 300 * K * (1 - Math.max(0, q - 0.6) * 2.4), w = (f.w + Math.sin(this.t * 0.8) * 8) * K; st.bar(d, x, y, x, y - hh, w + 8, C.ink); st.bar(d, x, y, x, y - hh, w, "#ffad33"); st.bar(d, x - w * 0.18, y, x - w * 0.18, y - hh, w * 0.3, "#ffe08a"); st.dot(d, x, y - hh, w * 0.62, "#ffad33"); st.dot(d, x - w * 0.14, y - hh - w * 0.14, w * 0.2, "#ffe08a"); st.part(d, "splat", x, y, { sx: K * 0.9, sy: K * 0.44, color: "#ffad33" }); }
            else if (f.kind === "runner") { const K = this.p(f.z) * this.Z, xx = f.x0 + f.dir * f.t * 11; f.pup.walk += 0.3; drawPuppet(d, st, f.pup, this.sx(xx, f.z), this.sy(Math.abs(Math.sin(f.t * 0.3)) * 18, f.z), K); }
            else if (f.kind === "soup") { this.drawSoup(d, f, q); }
            else if (f.kind === "word") { this.drawWord(d, f, q); }
        }
    }
    /** The swing itself: a fat crescent of motion that says where the hit lands. */
    drawSmear(d, f, q) {
        const h = f.hero, m = h.mv; if (!m || h.st !== "atk") return;
        if (h.t <= m.st - 1 || h.t > m.st + m.ac + 3) return;
        const K = this.p(h.z) * this.Z, x = this.sx(h.x, h.z), y = this.sy(h.y + 76, h.z), arc = ARCS[m.anim] ?? 0, r = (m.reach + 44) / 146 * K, a = (1 - (h.t - m.st) / (m.ac + 4)) * 0.92;
        d.push(); d.translate(x, y); d.scale(h.face, 1);
        this.st.part(d, "smear", 0, 0, { rot: arc, sx: r, sy: r * (arc < -1 || arc > 1 ? -1 : 1), color: f.heavy ? "#ffad33" : "#fff4dc", opacity: Math.max(0, a) });
        d.pop();
    }
    stampede(sim) {
        const kinds = ["kid", "tot", "lobber", "kid", "tray", "stink", "tot", "kid"], c = this.camX, dir = 1;
        kinds.forEach((k, i) => { const a = { id: 900 + i, st: "ko", t: 200, face: dir, flash: 0, y: 0, hp: 1, type: k, variant: i % 4 }, p = new Puppet(a, k, sim.stageIdx); for (let n = 0; n < 8; n++) p.update(); this.fx.push({ kind: "runner", t: -i * 5, life: 96, x0: c - 520 - (i % 3) * 40, dir, z: 10 + (i * 37) % 80, pup: p, step(f) { if (f.t % 4 === 0) p.update(); } }); });
    }
    leave(h, dir) { this.fx.push({ kind: "leaver", t: 0, life: 40, x: h.x, z: h.z, dir, pup: this.pup(h) }); }
    drawSoup(d, f, q) {
        const st = this.st, v = this.s.view, K = this.p(f.z) * this.Z, x = this.sx(f.x, f.z), y = this.sy(0, f.z);
        if (f.level === 3) {
            // A pot the size of the gym comes down.
            const fall = clamp(q * 2.2, 0, 1), yy = -300 + fall * fall * (v.height * 0.55 + 300);
            if (q > 0.5) { d.rect(v.width + 20, v.height, { x: v.width / 2, y: v.height / 2, color: "#ffad33", opacity: (1 - q) * 1.6 }); }
            else { st.part(d, "ladle", v.width / 2, yy + 40, { sx: 4, rot: 3.14 }); }
        } else st.part(d, "ring", x, y - 20 * K, { sx: K * f.r / 56 * (0.2 + q), sy: K * f.r / 56 * (0.2 + q) * 0.5, color: f.hero === "dot" ? "#ffad33" : "#fff4dc", opacity: 1 - q });
    }
    drawWord(d, f, q) {
        const vw = this.s.view.width, pad = Math.min(vw * 0.32, (f.text.length * (f.big ? 10 : 6))), x = clamp(this.sx(f.x, f.z), pad, vw - pad), y = this.sy(f.y + f.t * f.vy, f.z), pop = q < 0.18 ? 0.5 + (q / 0.18) * 0.8 : q < 0.3 ? 1.3 - ((q - 0.18) / 0.12) * 0.3 : 1, a = q > 0.7 ? 1 - (q - 0.7) / 0.3 : 1;
        comic(d, f.text, x, y, (f.big ? 25 : 15) * Math.min(1.1, this.Z + 0.1), pop, f.rot, f.col, a);
    }
}
const ART_K = { casserole: 0.78, aspic: 0.9 };
const ARCS = { jab: 0, back: -0.6, over: 0.5, twirl: 0.1, wallop: 0, scoop: -1.2, slam: 0.9, homer: 0, air1: 0.2, air2: -0.4, spike: 1.1, slide: 0.2, tag: -1.2, tray: 0, mop: 0.1, dump: 0.5 };
let fxr = 12345; const game_rand = () => { fxr = (fxr * 1664525 + 1013904223) >>> 0; return fxr / 4294967296; };

/** Loud lettering: ink offsets, a coloured drop, then the face. */
export function comic(d, str, x, y, size, pop = 1, rot = 0, col = ["#fff4dc", C.tomato], a = 1) {
    d.push(); d.translate(x, y); if (rot) d.rotate(rot); if (pop !== 1) d.scale(pop, pop);
    const s = Math.round(size), o = Math.max(1.4, s * 0.09), font = FONT, opt = { size: s, bold: true, font, color: C.ink, opacity: a };
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [o, o], [-o, -o], [o, -o], [-o, o]]) d.text(str, { ...opt, x: dx, y: dy });
    d.text(str, { ...opt, color: col[1], x: o * 0.8, y: o * 0.9 });
    d.text(str, { ...opt, color: col[0], x: 0, y: 0 });
    d.pop();
}

// Each boss is posed by hand, because each one is a different kind of funny.
const armPair = (o, ax, ay, bx, by, cx, cy, dx, dy, w0, w1, col) => { const { d, cast, col: c } = o; cast.hose(d, ax, ay, bx, by, 0.2, w0, w1, c ?? col, c ?? C.ink); cast.part(d, "hand", bx, by, { sx: w1 / 9, color: c ?? col }); cast.hose(d, cx, cy, dx, dy, -0.2, w0, w1, c ?? col, c ?? C.ink); cast.part(d, "hand", dx, dy, { sx: w1 / 9, color: c ?? col }); };
const face = (o, x, y, k, my, mk) => {
    const { d, cast, eye, mouth, col } = o; if (col) return;
    const E = { poss: "e_poss", wide: "e_wide", dizzy: "e_dizzy", hurt: "e_hurt", mad: "e_mad" }, M = { snarl: "m_snarl", yell: "m_yell", tongue: "m_tongue", ouch: "m_ouch" };
    cast.part(d, E[eye] ?? "e_poss", x, y, { sx: k }); cast.part(d, M[mouth] ?? "m_snarl", x, y + my, { sx: mk });
};
const legs = (o, gap, y, w, col, shoe = "#f4f1f6") => {
    const { d, cast, col: c, t, part, m } = o;
    for (const s of [-1, 1]) { const stp = o.b.moving ? Math.sin(t * 0.2 * s) * 14 : 0; cast.hose(d, s * gap, y, s * gap + stp, -6, 0.1 * s, w, w, c ?? col, c ?? C.ink); cast.part(d, "shoe", s * gap + stp, 0, { sx: w / 9, color: c ?? shoe }); }
};
const BOSS_DRAW = {
    meatloaf(o) {
        const { d, st, tel, t, col } = o; legs(o, 70, -40, 16, "#6a3020", "#3a3f62");
        const reach = 90 + tel * 30;
        armPair(o, -120, -120, -160 - tel * 30, -60 - tel * 90, 120, -120, 170 + tel * 20, -60 - tel * 90, 15, 16, "#a55a34");
        st.part(d, "body", 0, -14, { color: col });
        face(o, 14, -100, 2.1, 46, 2.1);
    },
    frank(o) {
        const { d, st, tel, col, part } = o; legs(o, 26, -20, 11, "#3a3f62", "#22122e");
        armPair(o, -44, -150, -86 - tel * 40, -100 - tel * 70, 44, -150, 92 + tel * 30, part === 1 ? -130 : -90 + tel * 20, 10, 11, "#e8604a");
        st.part(d, "body", 0, -8, { color: col });
        face(o, 6, -252, 1.08, 28, 0.86);
    },
    coach(o) {
        const { d, st, tel, col } = o; legs(o, 76, -24, 17, "#fff0d8", "#f4f1f6");
        armPair(o, -112, -110, -160 - tel * 26, -70 - tel * 90, 112, -110, 164 + tel * 26, -70 - tel * 90, 15, 17, "#fff0d8");
        st.part(d, "body", 0, -14, { color: col });
        face(o, 12, -112, 1.9, 40, 1.8);
    },
    aspic(o) {
        const { d, st, t, b, tel, col, part } = o; const w = Math.sin(t * (b.open ? 0.3 : 0.14)) * (0.05 + tel * 0.08);
        d.push(); d.scale(1 + w, 1 - w);
        st.part(d, "body", 0, 0, { color: col });
        if (!col) st.part(d, "goggles", 10, -142, {});
        face(o, 10, -142, 0, 0, 0);
        const { cast, mouth } = o;
        if (!col) { cast.part(d, o.eye === "dizzy" ? "e_dizzy" : o.eye === "hurt" ? "e_hurt" : "e_poss", 10, -142, { sx: 1.54 }); cast.part(d, mouth === "yell" ? "m_yell" : mouth === "tongue" ? "m_tongue" : "m_snarl", 10, -92, { sx: 1.7 }); }
        d.pop();
    },
    shush(o) {
        const { d, st, cast, tel, part, m, b, col } = o; const shh = m && (b.mvId === "shh" || b.mvId === "shh2");
        armPair(o, -48, -214, shh ? -30 : -74 - tel * 40, shh ? -250 : -146 - tel * 80, 48, -214, shh ? 18 : 80 + tel * 40, shh ? -224 : -146 - tel * 80, 9, 10, "#c86a68");
        st.part(d, "body", 0, 0, { color: col });
        if (col) return;
        cast.part(d, "de_mad", 4, -270, { sx: 1.1 }); cast.part(d, o.mouth === "yell" ? "m_ouch" : "m_lip", 6, -238, { sx: 0.84 });
        if (shh) { cast.part(d, "hand_open", 12, -242, { sx: 0.8, color: "#ffc9a0" }); }
        if (shh && part === 0) cast.part(d, "m_ouch", 6, -240, { sx: 0.4 });
    },
    casserole(o) {
        const { d, st, cast, t, tel, b, part, col } = o;
        for (let i = 0; i < 4; i++) {
            const s = i < 2 ? -1 : 1, ox = [-190, -130, 130, 190][i], sway = Math.sin(t * 0.05 + i * 1.6) * 0.14 + (o.m ? tel * s * 0.3 : 0);
            st.part(d, "tent", ox, -70, { rot: sway + s * 0.5, color: col, sx: 1 - i * 0.04 });
        }
        st.part(d, "body", 0, -6, { color: col });
        face(o, -6, -190, 2.4, 0, 0);
        if (!col) cast.part(d, o.mouth === "yell" ? "m_yell" : o.mouth === "tongue" ? "m_tongue" : "m_snarl", -6, -112, { sx: 3 });
        if (!col) { cast.part(d, "e_poss", -130, -150, { sx: 0.9 }); cast.part(d, "e_poss", 130, -158, { sx: 0.74 }); }
    },
};
