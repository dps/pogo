// Twin sticks, the HUD, upgrade cards, and the end-of-run invoice.
import { button, layer, pin, pos, rect, tap, ui } from "./pogo.js";
import { BRANCHES, FILLER, UPGRADES, WEAPONS, WAVES } from "./data.js";
import { ROOMS } from "./rooms.js";
import { FONT } from "./view.js";

export const INK = "#1b1420";
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ICON = { lint: "i_lint", nail: "i_nailgun", blower: "i_blower", dryer: "i_dryer", sock: "i_sock" };

export function sticker(d, str, x, y, size, col = "#fff6e6", ink = INK, o = 0.1, opacity = 1) {
    const w = Math.max(1.4, size * o);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; d.text(str, { x: x + Math.cos(a) * w, y: y + Math.sin(a) * w + size * 0.035, size, bold: true, font: FONT, color: ink, opacity }); }
    d.text(str, { x, y, size, bold: true, font: FONT, color: col, opacity });
}

/** A chunky inked button. */
export function chunky(label, o = {}) {
    const base = button(label, o), fill = o.color ?? "#e23b34", col = o.textColor ?? "#fff6e6", size = o.textSize ?? 20;
    return {
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = o.radius ?? 16, press = e._pressed ? 3 : 0;
            d.rect(w + 6, h + 10, { y: 3, color: INK, radius: r + 3 });
            d.rect(w, h, { y: press, color: fill, radius: r });
            d.rect(w - 12, h * 0.38, { y: press - h * 0.22, color: "#ffffff", opacity: 0.2, radius: r - 5 });
            d.text(label, { y: press + 1.5, size, bold: true, font: FONT, color: "#00000066" });
            d.text(label, { y: press, size, bold: true, font: FONT, color: col });
        },
    };
}

// --- Sticks -----------------------------------------------------------------------------------------
const STICK = 58;
export class Controls {
    constructor(game, s, view, opts = {}) {
        this.game = game; this.s = s; this.view = view; this.opts = opts;
        this.left = null; this.right = null; this.dashId = null; this.seen = new Set();
        this.out = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, auto: true, dash: false };
        this.mouseMoved = false; this.movedStick = false; this.aimedStick = false; this.rmb = false; this.lastPX = null; this.lastPY = null;
        this.dashPulse = 0;
    }
    dashSpot() {
        const v = this.game.view, sf = v.safe, portrait = v.height > v.width;
        return portrait ? { x: v.width - sf.right - 56, y: v.height - sf.bottom - 214, r: 42 } : { x: v.width - sf.right - 58, y: v.height - sf.bottom - 176, r: 42 };
    }
    home() {
        const v = this.game.view, sf = v.safe;
        return { lx: sf.left + 84, ly: v.height - sf.bottom - 92, rx: v.width - sf.right - 84, ry: v.height - sf.bottom - 92 };
    }

    update() {
        const { game, s, out } = this, input = s.input, v = game.view, sim = this.view.sim;
        const touch = input.touchMode;
        const move = input.move;
        out.mx = move.x; out.mz = move.y;
        out.aim = false; out.fire = false; out.auto = true;
        const kbDash = input.down("dash");
        out.dash = kbDash || this.rmb;

        if (touch) {
            const live = new Set();
            const dashAt = this.dashSpot();
            for (const t of input.touches) {
                live.add(t.id);
                if (this.seen.has(t.id)) continue;
                this.seen.add(t.id);
                if (t.y < 64) continue;                               // HUD strip
                if (this.dashId === null && Math.hypot(t.x - dashAt.x, t.y - dashAt.y) < dashAt.r * 1.25) { this.dashId = t.id; continue; }
                if (t.x < v.width / 2) { if (!this.left) this.left = { id: t.id, ox: t.x, oy: t.y, x: t.x, y: t.y }; }
                else if (!this.right) this.right = { id: t.id, ox: t.x, oy: t.y, x: t.x, y: t.y };
            }
            for (const id of [...this.seen]) if (!live.has(id)) this.seen.delete(id);
            if (this.left && !live.has(this.left.id)) this.left = null;
            if (this.right && !live.has(this.right.id)) this.right = null;
            if (this.dashId !== null && !live.has(this.dashId)) this.dashId = null;
            for (const t of input.touches) {
                for (const st of [this.left, this.right]) if (st && st.id === t.id) { st.x = t.x; st.y = t.y; }
            }
            if (this.left) {
                let dx = this.left.x - this.left.ox, dy = this.left.y - this.left.oy, l = Math.hypot(dx, dy);
                if (l > STICK) { this.left.ox += dx / l * (l - STICK); this.left.oy += dy / l * (l - STICK); dx = this.left.x - this.left.ox; dy = this.left.y - this.left.oy; l = STICK; }
                if (l > 6) { out.mx = dx / STICK; out.mz = dy / STICK; this.movedStick = true; }
            }
            if (this.right) {
                let dx = this.right.x - this.right.ox, dy = this.right.y - this.right.oy, l = Math.hypot(dx, dy);
                if (l > STICK) { this.right.ox += dx / l * (l - STICK); this.right.oy += dy / l * (l - STICK); dx = this.right.x - this.right.ox; dy = this.right.y - this.right.oy; l = STICK; }
                if (l > 8) { out.aim = true; out.ax = dx / l; out.az = dy / l; out.fire = true; this.aimedStick = true; }
            }
            if (this.dashId !== null) out.dash = true;
            return out;
        }

        // Keyboard and mouse. The cursor aims; auto-fire shoots when something is in view.
        const look = input.look, pad = input.down("fire");
        const ptr = input.pointer;
        if (this.lastPX !== null && (Math.abs(ptr.x - this.lastPX) > 1 || Math.abs(ptr.y - this.lastPY) > 1)) this.mouseMoved = true;
        this.lastPX = ptr.x; this.lastPY = ptr.y;
        if (Math.hypot(look.x, look.y) > 3 && game.input.activePad) { out.aim = true; const l = Math.hypot(look.x, look.y); out.ax = look.x / l; out.az = look.y / l; out.fire = true; }
        else if (this.mouseMoved) {
            const f = this.view.floorAt(ptr.x, ptr.y), p = sim.p;
            if (f) {
                const dx = f[0] - p.x, dz = f[1] - p.z, l = Math.hypot(dx, dz);
                if (l > 0.2) { out.aim = true; out.ax = dx / l; out.az = dz / l; }
            }
            out.fire = ptr.down || pad || (this.opts.save.autofire && !!p.target && !p.target.dead);
        } else if (pad) out.fire = true;
        out.auto = this.opts.save.autofire || pad;
        return out;
    }

    draw(d) {
        const { game, s, view } = this;
        if (!s.input.touchMode || !this.opts.active()) return;
        const h = this.home(), p = view.sim.p, u = 1;
        const stick = (st, hx, hy, label, col, seen) => {
            const x = st ? st.ox : hx, y = st ? st.oy : hy, kx = st ? st.x : hx, ky = st ? st.y : hy, a = st ? 0.5 : 0.22;
            d.circle(STICK, { x, y, color: "#ffffff", opacity: a * 0.25 });
            d.circle(STICK, { x, y, color: col, opacity: a + 0.15, outline: 3 });
            const l = Math.hypot(kx - x, ky - y), k = l > STICK ? STICK / l : 1;
            d.circle(25, { x: x + (kx - x) * k, y: y + (ky - y) * k, color: col, opacity: a + 0.3 });
            if (!seen) sticker(d, label, hx, hy, 13, "#ffffff");
        };
        stick(this.left, h.lx, h.ly, "MOVE", "#ffffff", this.movedStick);
        stick(this.right, h.rx, h.ry, "AIM", "#ffd24d", this.aimedStick);
        const b = this.dashSpot(), held = this.dashId !== null, ready = p.dashCd <= 0;
        const pulse = this.dashPulse > 0 ? 1 + Math.sin(view.t * 10) * 0.08 : 1;
        d.circle((b.r + 4) * pulse, { x: b.x, y: b.y, color: INK, opacity: 0.55 });
        d.circle(b.r * pulse, { x: b.x, y: b.y, color: held ? "#7fffe9" : ready ? "#37b5a4" : "#5d5867", opacity: 0.85 });
        if (p.charging) {
            const n = Math.ceil(p.charge * 24);
            for (let i = 0; i < n; i++) { const a0 = i / 24 * TAU - Math.PI / 2, a1 = (i + 0.8) / 24 * TAU - Math.PI / 2, r = b.r + 7; d.line([b.x + Math.cos(a0) * r, b.y + Math.sin(a0) * r], [b.x + Math.cos(a1) * r, b.y + Math.sin(a1) * r], { width: 5, color: "#ffd24d" }); }
        }
        d.text("DASH", { x: b.x, y: b.y - 6, size: 15, bold: true, font: FONT, color: "#ffffff" });
        d.text("hold", { x: b.x, y: b.y + 11, size: 12, bold: true, font: FONT, color: "#ffffff", opacity: 0.8 });
    }
}

// --- HUD --------------------------------------------------------------------------------------------
export function drawHud(d, game, s, view, state) {
    const { sim } = view, p = sim.p, r = sim.run, t = view.t;
    // Big screens get a smaller HUD: the view is sized for phones.
    const hs = game.view.scale > 1.6 ? 1.6 / game.view.scale : 1;
    if (hs !== 1) { d.push(); d.scale(hs, hs); }
    const v = { width: game.view.width / hs, height: game.view.height / hs, safe: game.view.safe }, sf = v.safe;
    const L = sf.left + 10, T = sf.top + 10, R = v.width - sf.right - 10;
    const narrow = v.width < 420;
    const barW = narrow ? 128 : 170;
    // Battery.
    const bar = (x, y, w, h, k, col, icon, flash) => {
        d.rect(w + 6, h + 6, { x: x + w / 2, y, color: INK, radius: 8 });
        d.rect(w, h, { x: x + w / 2, y, color: "#3a3344", radius: 5 });
        const fw = Math.max(0.001, w * clamp(k, 0, 1));
        d.rect(fw, h, { x: x + fw / 2, y, color: flash ? "#ffffff" : col, radius: 5 });
        d.rect(Math.max(0, fw - 6), h * 0.3, { x: x + fw / 2, y: y - h * 0.22, color: "#ffffff", opacity: 0.32, radius: 3 });
        d.circle(14, { x: x - 2, y, color: INK });
        d.sprite(icon, { x: x - 2, y, width: 18, height: 18, color: col });
    };
    const low = p.hp < p.maxHp * 0.3;
    const hpCol = low ? (Math.floor(t * 6) % 2 ? "#ff6a4a" : "#ffb04a") : "#2bd17e";
    bar(L + 14, T + 12, barW, 14, p.hp / p.maxHp, hpCol, "i_heart", p.hurtT > 0.2);
    bar(L + 14, T + 36, barW - 22, 11, p.bag / p.bagMax, "#e8c27a", "i_dust", false);
    // Weapon.
    const w = WEAPONS[p.weapon], wy = T + 62;
    d.rect(narrow ? 92 : 104, 22, { x: L + (narrow ? 48 : 54), y: wy, color: INK, radius: 8, opacity: 0.8 });
    d.sprite(ICON[p.weapon], { x: L + 13, y: wy, width: 18, height: 18, color: "#ffd24d" });
    d.text(w.short, { x: L + (narrow ? 56 : 62), y: wy, size: 12, bold: true, font: FONT, color: "#fff6e6" });

    // Score and multiplier.
    const pauseW = 44;
    sticker(d, r.score.toLocaleString("en-US"), R - pauseW - (narrow ? 44 : 58), T + 14, narrow ? 20 : 25, "#fff6e6");
    const mult = Math.min(8, 1 + Math.floor(r.combo / 12));
    if (r.combo >= 3) {
        const k = clamp(r.comboT / 2.6, 0, 1), x = R - pauseW - (narrow ? 44 : 58);
        sticker(d, mult > 1 ? `x${mult}  ${r.combo}` : `${r.combo} CHOPS`, x, T + 38, 13, mult > 1 ? "#ffd24d" : "#ffffff");
        d.rect(66 * k, 3, { x, y: T + 49, color: "#ffd24d", radius: 2 });
    }
    // Where we are: pips for waves in the room, under the score.
    const total = r.waveTotal, y2 = T + 58, x2 = R - pauseW - (narrow ? 44 : 58);
    for (let i = 0; i < total; i++) {
        const x = x2 + (i - (total - 1) / 2) * 16, done = i < r.wave, now = i === r.wave && sim.phase === "wave";
        d.circle(6, { x, y: y2, color: INK });
        d.circle(4.4, { x, y: y2, color: done ? "#ffd24d" : now ? "#ff7a4a" : "#574e63", opacity: now ? 0.7 + Math.sin(t * 7) * 0.3 : 1 });
    }

    // Boss bar.
    if (r.bossMax && r.bossHp > 0) {
        const bw = Math.min(v.width - 56, 460), by = T + 86, k = r.bossHp / r.bossMax;
        d.rect(bw + 8, 22, { x: v.width / 2, y: by, color: INK, radius: 8 });
        d.rect(Math.max(1, bw * k), 14, { x: v.width / 2 - bw / 2 + bw * k / 2, y: by, color: "#ff5a3a", radius: 4 });
        d.text("TRIKE INTEGRITY", { x: v.width / 2, y: by, size: 11, bold: true, font: FONT, color: "#fff" });
    }

    // The last few monsters get arrows, so nobody hunts a bunny behind a sofa.
    if (sim.phase === "wave" && sim.foes.length > 0 && sim.foes.length <= 5 && !sim.pending.length) {
        view.prepareProject();
        for (const e of sim.foes) {
            if (e.k === "seg" || e.k === "trike") continue;
            view.proj(e.x, 0.5, e.z);
            const sx = view.rx / hs, sy = view.rz / hs, m = 34;
            if (sx > m && sx < v.width - m && sy > 90 && sy < v.height - m) continue;
            const cx = v.width / 2, cy = v.height / 2, dx = sx - cx, dy = sy - cy, k = Math.min((v.width / 2 - m) / Math.abs(dx || 1), (v.height / 2 - 100) / Math.abs(dy || 1));
            const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx), c = Math.cos(a), n = Math.sin(a);
            d.poly([[ax + c * 13, ay + n * 13], [ax - c * 7 - n * 9, ay - n * 7 + c * 9], [ax - c * 7 + n * 9, ay - n * 7 - c * 9]], { color: "#ff7a4a" });
        }
    }

    // Banners.
    let by = v.height * 0.26;
    for (const b of view.feed) {
        const k = b.t / b.life, inn = clamp(b.t / 0.16, 0, 1), out = clamp((1 - k) * 5, 0, 1), sc = 0.7 + 0.3 * (1 - (1 - inn) * (1 - inn)) + (inn < 1 ? 0.2 * Math.sin(inn * Math.PI) : 0);
        const size = (b.big ? (narrow ? 30 : 38) : 19) * sc;
        sticker(d, b.text, v.width / 2, by, size, b.col, INK, 0.1, out);
        if (b.sub) sticker(d, b.sub, v.width / 2, by + size * 0.85, 14, "#fff6e6", INK, 0.1, out);
        by += size + (b.sub ? 30 : 12);
    }
    if (sim.phase === "intro" && sim.phaseT > 0.2) {
        const k = clamp((1.5 - sim.phaseT) / 0.2, 0, 1);
        sticker(d, ROOMS[sim.roomName].name, v.width / 2, v.height * 0.42, (narrow ? 36 : 48) * (0.7 + 0.3 * k), "#ffd24d", INK, 0.1, Math.min(k, sim.phaseT * 3));
    }
    // Teaching, only until the verb has been done.
    if (state.hint) sticker(d, state.hint, v.width / 2, v.height * (v.height > v.width ? 0.6 : 0.8), narrow ? 12.5 : 14, "#fff6e6", INK, 0.12);
    if (hs !== 1) d.pop();
}

export function drawScreenFx(d, game, view) {
    const v = game.view;
    if (view.hurtFlash > 0) d.sprite("vig", { x: v.width / 2, y: v.height / 2, width: v.width, height: v.height, color: "#ff2a1a", opacity: view.hurtFlash * 0.8 });
    if (view.dark > 0.02) d.sprite("vig", { x: v.width / 2, y: v.height / 2, width: v.width, height: v.height, color: "#07050c", opacity: view.dark * 0.92 });
    const sim = view.sim;
    if (sim.p.hp < sim.p.maxHp * 0.25 && sim.phase !== "dead") d.sprite("vig", { x: v.width / 2, y: v.height / 2, width: v.width, height: v.height, color: "#ff2a1a", opacity: 0.28 + Math.sin(view.t * 7) * 0.14 });
    const fade = sim.phase === "transit" ? 1 - sim.phaseT / 0.55 : sim.phase === "intro" ? clamp((sim.phaseT - 1.05) / 0.45, 0, 1) : 0;
    if (fade > 0) d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#120c18", opacity: fade });
}

// --- Upgrade cards ------------------------------------------------------------------------------------
export function showCards(game, s, view, onPick) {
    const sim = view.sim, v = game.view, cards = [], keys = sim.choices;
    const portrait = v.height > v.width;
    const cw = portrait ? Math.min(v.width - 40, 320) : Math.min((v.width - 80) / 3, 210), ch = portrait ? Math.min(118, (v.height - 260) / 3) : 180;
    const born = view.t;
    let chosen = false;
    const list = keys.map((k) => UPGRADES[k] ?? FILLER);
    const pick = (i) => {
        if (chosen) return;
        chosen = true;
        s.wait(0.2, () => { for (const c of cards) c.destroy(); backdrop.destroy(); onPick(i); });
        cardChosen = i;
    };
    let cardChosen = -1;
    const backdrop = s.add([ui(), layer(5), {
        draw(d) {
            const k = clamp((view.t - born) / 0.2, 0, 1);
            d.rect(v.width * 2, v.height * 2, { x: v.width / 2, y: v.height / 2, color: "#120c18", opacity: 0.62 * k });
            sticker(d, "BOLT SOMETHING ON", v.width / 2, portrait ? v.height / 2 - (ch + 14) * 1.5 - 36 : v.height / 2 - ch / 2 - 44, portrait ? 24 : 26, "#ffd24d");
            // Which branches are chosen so far.
            const taken = sim.run.taken;
            const total = taken.length, gap = 14, x0 = v.width / 2 - (total - 1) * gap / 2, y = portrait ? v.height / 2 + (ch + 14) * 1.5 + 22 : v.height / 2 + ch / 2 + 26;
            taken.forEach((key, i) => d.circle(5.5, { x: x0 + i * gap, y, color: BRANCHES[UPGRADES[key].branch].color }));
        },
    }]);
    list.forEach((up, i) => {
        const x = portrait ? v.width / 2 : v.width / 2 + (i - 1) * (cw + 16);
        const y = portrait ? v.height / 2 + (i - 1) * (ch + 14) : v.height / 2;
        const branch = BRANCHES[up.branch], needs = up.needs ? UPGRADES[up.needs] : null;
        const c = s.add([rect(cw, ch, { color: "#00000000" }), pos(x, y), ui(), layer(10), tap(() => pick(i)), {
            draw(d, e) {
                const a = clamp((view.t - born - i * 0.06) / 0.24, 0, 1), k = 1 - (1 - a) ** 3, over = 1 + Math.sin(a * Math.PI) * 0.06;
                const pressed = e._pressed ? 0.97 : 1, on = cardChosen === i, gone = cardChosen >= 0 && !on;
                d.push();
                d.translate(0, (1 - k) * 60);
                const sc = over * pressed * (on ? 1.05 : 1);
                d.scale(sc, sc);
                const op = gone ? 0.25 : k;
                d.rect(cw + 8, ch + 8, { color: INK, radius: 18, opacity: op });
                d.rect(cw, ch, { color: "#fff6e6", radius: 15, opacity: op });
                if (portrait) {
                    d.rect(62, ch, { x: -cw / 2 + 31, color: branch.color, radius: 15, opacity: op });
                    d.sprite(`i_${up.icon}`, { x: -cw / 2 + 31, width: 42, height: 42, color: "#fff6e6", opacity: op });
                    d.text(up.name, { x: 34, y: -ch * 0.22, size: 18, bold: true, font: FONT, color: INK, opacity: op, maxWidth: cw - 80 });
                    d.text(up.text, { x: 34, y: ch * 0.15, size: 13.5, font: FONT, color: "#4d4358", opacity: op, maxWidth: cw - 84, lineHeight: 1.15 });
                    d.text(branch.name, { x: cw / 2 - 42, y: ch / 2 - 13, size: 10, bold: true, font: FONT, color: branch.color, opacity: op });
                } else {
                    d.rect(cw, 62, { y: -ch / 2 + 31, color: branch.color, radius: 15, opacity: op });
                    d.sprite(`i_${up.icon}`, { y: -ch / 2 + 31, width: 42, height: 42, color: "#fff6e6", opacity: op });
                    d.text(up.name, { y: -8, size: 17, bold: true, font: FONT, color: INK, opacity: op, maxWidth: cw - 16 });
                    d.text(up.text, { y: 36, size: 13, font: FONT, color: "#4d4358", opacity: op, maxWidth: cw - 20, lineHeight: 1.15 });
                    d.text(`${branch.name}  ${i + 1}`, { y: ch / 2 - 13, size: 10, bold: true, font: FONT, color: branch.color, opacity: op });
                }
                d.pop();
            },
        }]);
        cards.push(c);
    });
    return { pick };
}

// --- Results ------------------------------------------------------------------------------------------
export function resultPanel(game, s, view, res, info, actions) {
    const v = game.view, sf = v.safe, portrait = v.height > v.width, born = view.t;
    const lines = Object.entries(res.invoice).map(([k, n]) => [n > 1 ? `${n} x ${k}` : k]).slice(0, portrait ? 7 : 5);
    const w = Math.min(v.width - 28, portrait ? 346 : 560);
    const paperH = 62 + 18 * Math.max(lines.length, 1);
    const top = portrait ? Math.max(sf.top + 16, v.height * 0.5 - 290 + (7 - Math.max(lines.length, 1)) * 9) : Math.max(sf.top + 8, (v.height - 330) / 2);
    const py0 = top + (portrait ? 172 : 72), by = portrait ? py0 + paperH + 44 : top + 288;
    s.add([ui(), layer(6), {
        draw(d) {
            const k = clamp((view.t - born) / 0.3, 0, 1), e = 1 - (1 - k) ** 3, drop = (1 - e) * 60;
            d.rect(v.width * 2, v.height * 2, { x: v.width / 2, y: v.height / 2, color: "#120c18", opacity: 0.72 * k });
            const T = top + drop, cx = portrait ? v.width / 2 : v.width / 2 - w / 4;
            sticker(d, res.won ? "HOUSE CLEARED" : "UNPLUGGED", v.width / 2, T + 24, 34, res.won ? "#ffd24d" : "#ff7a5a", INK, 0.1, k);
            const sub = res.won ? "The dust has settled. For now." : `Stopped by ${res.killedBy ?? "exhaustion"}`;
            d.text(sub, { x: v.width / 2, y: T + 54, size: 14, bold: true, font: FONT, color: "#fff6e6", opacity: k });
            const shown = Math.floor(res.score * clamp((view.t - born - 0.2) / 0.8, 0, 1));
            const sy = portrait ? T + 94 : T + 110;
            sticker(d, shown.toLocaleString("en-US"), cx, sy, 38, "#fff6e6", INK, 0.1, k);
            const stats = `${res.kills} monsters  ${res.rooms} rooms  ${Math.floor(res.time / 60)}:${String(Math.floor(res.time % 60)).padStart(2, "0")}`;
            d.text(stats, { x: cx, y: sy + 32, size: 13, font: FONT, color: "#e8dcc8", opacity: k });
            const flag = info.newBest ? "NEW BEST!" : info.mode === "daily" ? `#${info.rank} TODAY` : "PRACTICE";
            sticker(d, flag, cx, sy + 54, 15, info.newBest ? "#ffd24d" : "#7fffe9", INK, 0.1, k);
            // The invoice: a receipt for what was broken.
            const px = portrait ? v.width / 2 : v.width / 2 + w / 4, pw = portrait ? Math.min(w, 300) : w / 2 - 20, py = py0 + drop, ph = paperH;
            d.rect(pw + 6, ph + 6, { x: px, y: py + ph / 2, color: INK, radius: 6, opacity: k });
            d.rect(pw, ph, { x: px, y: py + ph / 2, color: "#fff9ee", radius: 4, opacity: k });
            d.text("INVOICE FOR DAMAGES", { x: px, y: py + 15, size: 12, bold: true, font: FONT, color: "#4d4358", opacity: k });
            lines.forEach(([l], i) => {
                const pk = clamp((view.t - born - 0.4 - i * 0.08) / 0.1, 0, 1);
                d.text(l, { x: px, y: py + 36 + i * 18, size: 13, font: FONT, color: INK, opacity: pk });
            });
            if (!lines.length) d.text("Nothing broken. Boring.", { x: px, y: py + 36, size: 13, font: FONT, color: INK, opacity: k });
            d.rect(pw - 20, 1.5, { x: px, y: py + ph - 25, color: "#4d4358", opacity: k });
            d.text(`TOTAL  $${res.damage.toLocaleString("en-US")}`, { x: px, y: py + ph - 12, size: 15, bold: true, font: FONT, color: "#c8341e", opacity: k });
        },
    }]);
    const bw = portrait ? Math.min(w / 2 - 8, 160) : 180;
    s.add([chunky("AGAIN", { width: bw, height: 56, onTap: actions.again, action: "confirm", textSize: 22, color: "#e23b34" }), pos(v.width / 2 - bw / 2 - 8, by), ui(), layer(10)]);
    s.add([chunky("MENU", { width: bw, height: 56, onTap: actions.menu, action: "pause", textSize: 20, color: "#37b5a4" }), pos(v.width / 2 + bw / 2 + 8, by), ui(), layer(10)]);
}
