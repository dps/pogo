// Touch and keyboard driving, and everything drawn over the race.
import { SPARK } from "./world.js";
import { ORD, loadSave } from "./data.js";
import { TIERS } from "./kart.js";

export const FONT = '"Arial Rounded MT Bold","Avenir Next","Trebuchet MS",system-ui,sans-serif';
const INK = "#2b2140";
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? "0" : ""}${s.toFixed(2)}`; };

/** Text with a chunky ink outline, like a shop sticker. */
export function sticker(d, str, x, y, size, col = "#fff6e6", ink = INK, o = 0.09) {
    const w = Math.max(1.5, size * o);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; d.text(str, { x: x + Math.cos(a) * w, y: y + Math.sin(a) * w + size * 0.03, size, bold: true, font: FONT, color: ink }); }
    d.text(str, { x, y, size, bold: true, font: FONT, color: col });
}

export class Controls {
    constructor(game, s) {
        this.game = game; this.s = s; this.touches = new Map(); this.steer = 0; this.drift = false; this.item = false; this.wasMode = null; this.left = false; this.right = false; this.holdHard = 0; this.autoDrift = false; this.activeSteer = null;
    }
    get mode() { const m = loadSave(this.game).settings.control; return this.s.input.touchMode ? m : "mouse"; }
    layout() {
        const v = this.s.view, sf = v.safe, portrait = v.height > v.width;
        const m = 14, R = portrait ? 46 : 42, r = portrait ? 37 : 34;
        const dx = v.width - sf.right - m - R, dy = v.height - sf.bottom - m - R - (portrait ? 6 : 0);
        return {
            drift: { x: dx, y: dy, r: R },
            item: portrait ? { x: dx - R - r - 2, y: dy - 34, r } : { x: dx - 8, y: dy - R - r - 14, r },
            left: { x: sf.left + m + 44, y: v.height - sf.bottom - m - 44, r: 44 },
            right: { x: sf.left + m + 44 + 100, y: v.height - sf.bottom - m - 44, r: 44 },
        };
    }
    read(inp, dt, W) {
        const s = this.s, i = s.input, mode = this.mode, L = this.layout(), v = s.view;
        const seen = new Set();
        let drift = false, item = false, btnL = false, btnR = false, steer = null;
        for (const t of i.touches) {
            seen.add(t.id);
            let c = this.touches.get(t.id);
            if (!c) {
                const hit = (b) => Math.hypot(t.x - b.x, t.y - b.y) < b.r * 1.28;
                let role = "steer";
                if (mode === "one" || mode === "mouse") role = "steer";
                else if (hit(L.drift)) role = "drift";
                else if (hit(L.item)) role = "item";
                else if (mode === "buttons") role = t.x < (L.left.x + L.right.x) / 2 ? "left" : t.x < v.width * 0.5 ? "right" : "none";
                else if (t.x > v.width * 0.72 && t.y > v.height * 0.5) role = "none";
                c = { role, x0: t.x, x: t.x, sx: t.x, sy: t.y, age: 0, moved: 0 };
                this.touches.set(t.id, c);
            }
            c.age += dt; c.moved = Math.max(c.moved, Math.hypot(t.x - c.sx, t.y - c.sy)); c.x = t.x; c.y = t.y;
            if (c.role === "drift") drift = true;
            if (c.role === "item") item = true;
            if (c.role === "left") btnL = true;
            if (c.role === "right") btnR = true;
            if (c.role === "steer") {
                const range = Math.min(v.width * 0.17, 72);
                // Keep the anchor within reach, so reversing a drag answers at once.
                if (t.x - c.x0 > range) c.x0 = t.x - range;
                if (t.x - c.x0 < -range) c.x0 = t.x + range;
                const n = (t.x - c.x0) / range;
                steer = Math.sign(n) * Math.pow(Math.abs(n), 1.25);
                this.activeSteer = c;
            }
        }
        for (const [id, c] of this.touches) if (!seen.has(id)) {
            if ((mode === "one" || mode === "mouse") && c.role === "steer" && c.age < 0.2 && c.moved < 12) item = true;
            this.touches.delete(id);
            if (this.activeSteer === c) this.activeSteer = null;
        }
        // A tap that starts and ends between two steps never shows up in touches, but the pointer latches it.
        if ((mode === "one" || mode === "mouse") && i.pointer.tapped) item = true;
        const keyL = i.down("left"), keyR = i.down("right");
        let out = 0;
        if (steer !== null) out = steer;
        if (btnL || keyL) out = -1;
        if (btnR || keyR) out = 1;
        if (btnL && btnR) out = 0;
        if (keyL && keyR) out = 0;
        // One thumb: push hard and hold, and the drift takes care of itself.
        if (mode === "one" || mode === "mouse") {
            this.holdHard = Math.abs(out) > 0.68 ? this.holdHard + dt : 0;
            if (this.holdHard > 0.14) this.autoDrift = true;
            if (Math.abs(out) < 0.3) this.autoDrift = false;
        } else this.autoDrift = false;
        inp.steer = out;
        inp.drift = drift || this.autoDrift || i.down("drift");
        inp.item = item || i.down("item");
        inp.brake = i.down("down");
        this.steer = out; this.drift = inp.drift; this.item = inp.item; this.left = btnL; this.right = btnR;
    }
}

export function attachHUD(game, s, W, ctl) {
    const seen = loadSave(game).seen;
    let shownTime = "0:00.00", timeT = 0;
    const lines = Array.from({ length: 16 }, () => ({ a: 0, r: 0, l: 0 }));
    const fx = game.fxRng;
    const map = miniMap(W);
    const hint = { text: null, t: 0, drift: false, item: false };

    const tutorial = (dt) => {
        const k = W.player;
        if (!k || W.mode !== "race") return;
        hint.text = null; hint.drift = false; hint.item = false;
        if (W.phase !== "race") return;
        if (!seen.steer) {
            if (Math.abs(k.steer) > 0.3 && W.t > 1) seen.steer = true;
            hint.text = s.input.touchMode ? (ctl.mode === "buttons" ? "Tap left and right to steer" : "Drag to steer") : "Arrow keys to steer";
            return;
        }
        if (!seen.drift) {
            if (W.stats.boosts > 0) { seen.drift = true; return; }
            let bend = 0;
            for (let n = 2; n < 20; n += 3) bend = Math.max(bend, Math.abs(W.T.curv[W.T.wrap(k.i + n)]));
            if (k.driftDir) { hint.text = k.tier ? "Let go for a boost!" : "Keep holding..."; hint.drift = true; }
            else if (bend > 0.012) { hint.text = s.input.touchMode ? (ctl.mode === "one" ? "Push hard into the bend to drift" : "Hold DRIFT through the bend") : "Hold Space through the bend"; hint.drift = true; }
            return;
        }
        if (k.item && k.roll2 <= 0 && !seen.item) { hint.text = s.input.touchMode ? (ctl.mode === "one" ? "Quick tap to throw" : "Tap to throw") : "Press X to throw"; hint.item = true; }
        if (W.stats.itemsUsed > 0) seen.item = true;
    };

    s.onUpdate((dt) => {
        timeT -= dt;
        if (timeT <= 0) { timeT = 0.1; shownTime = fmt(W.t); }
        tutorial(dt);
        const k = W.player;
        if (k) {
            const frac = clamp((k.speed - k.top * 0.72) / (k.top * 0.45), 0, 1) + (k.boost > 0 ? 0.5 : 0);
            for (const l of lines) {
                l.l -= dt * (2.4 + frac * 5);
                if (l.l <= 0) { l.a = fx.range(0, Math.PI * 2); l.r = fx.range(0.55, 0.85); l.l = frac > 0.02 ? fx.range(0.3, 1) : 0; l.w = fx.range(1, 2.6); }
            }
        }
    });

    s.onDrawUI((d) => {
        if (s.paused) return;
        const v = s.view, sf = v.safe, k = W.player, L = ctl.layout();
        if (k && W.phase !== "countdown") speedLines(d, s, W, k, lines);
        if (W.heroLogo) W.heroLogo(d);
        if (!k || W.noHud) return;
        const portrait = v.height > v.width;
        const T = sf.top + 8, Lx = sf.left + 8, Rx = v.width - sf.right - 8;
        // position sticker
        if (W.mode === "race") {
            const pop = 1 + (W.rankPop ?? 0) * 0.35, sz = (portrait ? 66 : 62) * pop;
            d.sprite("burst", { x: Lx + 38, y: T + 38, width: sz, height: sz, color: k.rank === 1 ? "#ffc233" : k.rank <= 3 ? "#ff4b3e" : "#7b4dff" });
            d.text(ORD[k.rank - 1], { x: Lx + 38, y: T + 37, size: 24 * pop, bold: true, font: FONT, color: k.rank === 1 ? INK : "#fff6e6" });
        }
        // Who's where, as a stack of faces
        if (W.mode === "race" && W.order) {
            W.order.forEach((o, i) => {
                const y = T + 92 + i * 29, x = Lx + 17 + (o.player ? 4 : 0);
                if (o.player) d.circle(16, { x, y, color: "#ffc233" });
                d.sprite(`face_${o.id}`, { x, y, width: 28, height: 28, opacity: o.finished ? 0.6 : 1 });
            });
        }
        // lap and clock
        const lx = W.mode === "race" ? Lx + 116 : Lx + 54;
        const lap = clamp(k.lap + 1, 1, W.laps);
        sticker(d, `LAP ${lap}/${W.laps}`, lx, T + 20, 19);
        sticker(d, shownTime, lx, T + 45, 16, "#ffe9a8");
        // item slot, top centre on phones, under the clock on desktop too
        const ix = v.width / 2 + (portrait ? 26 : 0), iy = T + 36, slot = 62;
        d.rect(slot, slot, { x: ix, y: iy + 2, color: INK, radius: 14, opacity: 0.85 });
        d.rect(slot - 6, slot - 6, { x: ix, y: iy, color: k.roll2 > 0 ? "#ffc233" : "#fff6e6", radius: 11, opacity: k.item ? 1 : 0.28 });
        if (k.item) {
            const names = ["banana", "melon", "watermelon", "shield", "drink"];
            const it = k.roll2 > 0 ? names[Math.floor(W.time * 14) % 5] : k.item;
            const pop = 1 + (k.throwPop ?? 0) * 0.2;
            d.sprite(`i_${it}`, { x: ix, y: iy, width: 50 * pop, height: 50 * pop });
            if (k.ttDrinks > 1) sticker(d, `x${k.ttDrinks}`, ix + 22, iy + 22, 14);
        }
        // minimap
        map(d, Rx - 40, T + (portrait ? 96 : 92), k);
        // Banner and countdown
        if (W.phase === "countdown" && W.count > 0) {
            const f = (W.countT / (W.o.quickStart ? 0.55 : 0.75)) % 1, sz = 110 * (1.35 - Math.min(0.35, f * 1.1));
            sticker(d, String(W.count), v.width / 2, v.height * 0.36, sz, ["", "#2ec4a6", "#ffc233", "#ff4b3e"][W.count]);
        }
        if (W.phase === "race" && W.t < 0.8) sticker(d, "GO!", v.width / 2, v.height * 0.36, 96 * (1 + W.t * 0.4), "#2ec4a6");
        if (W.banner) {
            const b = W.banner;
            sticker(d, b.text, v.width / 2, v.height * 0.26, Math.min(36, v.width / (b.text.length * 0.66)), b.c);
        }
        if (k.wrongWay > 1.2) sticker(d, "WRONG WAY", v.width / 2, v.height * 0.4, 34, "#ff4b3e");
        if (W.tierFlash) {
            const c = SPARK[W.tierFlash.tier][0], f = W.tierFlash.t, p = s.cam3.project([k.x, k.y + 1, k.z]);
            d.additive(() => d.circle(40 + (1 - f) * 70, { x: p.x, y: p.y, color: c, outline: 5 * f + 1, opacity: f }));
        }
        drawControls(d, s, W, ctl, L, hint);
        if (hint.text) {
            const y = portrait ? v.height * 0.68 : v.height - sf.bottom - 34, pulse = 1 + Math.sin(W.time * 7) * 0.04;
            const w = Math.min(v.width - 32, hint.text.length * 10.6 + 34);
            d.rect(w * pulse, 40 * pulse, { x: v.width / 2, y, color: INK, radius: 20, opacity: 0.86 });
            d.text(hint.text, { x: v.width / 2, y, size: 17, bold: true, font: FONT, color: "#fff6e6" });
        }
    });
    return { hint };
}

function speedLines(d, s, W, k, lines) {
    const v = s.view, p = s.cam3.project([k.x - Math.sin(k.yaw) * 60, k.y + 3, k.z - Math.cos(k.yaw) * 60]);
    const cx = p.visible ? p.x : v.width / 2, cy = p.visible ? p.y : v.height * 0.45, R = Math.hypot(v.width, v.height) * 0.62;
    d.additive(() => {
        for (const l of lines) {
            if (l.l <= 0) continue;
            const c = Math.cos(l.a), n = Math.sin(l.a), r0 = l.r * R, r1 = r0 + R * 0.12 * l.l * (k.boost > 0 ? 2.2 : 1.1);
            d.line([cx + c * r0, cy + n * r0], [cx + c * r1, cy + n * r1], { width: l.w, color: k.boost > 0 ? "#ffd9a0" : "#ffffff", opacity: 0.32 * Math.min(1, l.l * 2) });
        }
    });
}

function arc(d, x, y, r, f, c, w) {
    const n = Math.max(1, Math.ceil(f * 28));
    for (let i = 0; i < n; i++) {
        const a0 = -Math.PI / 2 + i / 28 * Math.PI * 2, a1 = -Math.PI / 2 + (i + 1) / 28 * Math.PI * 2;
        d.line([x + Math.cos(a0) * r, y + Math.sin(a0) * r], [x + Math.cos(a1) * r, y + Math.sin(a1) * r], { width: w, color: c });
    }
}

function drawControls(d, s, W, ctl, L, hint) {
    const k = W.player, v = s.view, mode = ctl.mode;
    if (!s.input.touchMode) {
        // Desktop still gets the charge ring, as a small gauge.
        if (k.driftDir) {
            const x = v.width / 2, y = v.height - 42 - v.safe.bottom, f = clamp(k.charge / TIERS[2], 0, 1);
            d.circle(26, { x, y, color: INK, opacity: 0.6 }); arc(d, x, y, 22, f, SPARK[k.tier][0], 6);
        }
        return;
    }
    const btn = (b, on, col) => {
        d.circle(b.r + 3, { x: b.x, y: b.y + 3, color: INK, opacity: 0.5 });
        d.circle(b.r, { x: b.x, y: b.y, color: on ? col : "#fff6e6", opacity: on ? 0.95 : 0.3 });
        d.circle(b.r, { x: b.x, y: b.y, color: "#fff6e6", outline: 2.5, opacity: 0.85 });
    };
    if (mode !== "one") {
        const b = L.drift, pulse = hint.drift ? 1 + Math.sin(W.time * 9) * 0.07 : 1, r = { ...b, r: b.r * pulse };
        btn(r, ctl.drift, k.driftDir ? SPARK[k.tier][1] : "#ff5fa2");
        d.text("DRIFT", { x: b.x, y: b.y, size: 16, bold: true, font: FONT, color: "#fff6e6" });
        if (k.driftDir) arc(d, b.x, b.y, b.r + 6, clamp(k.charge / TIERS[2], 0, 1), SPARK[k.tier][0], 5);
        const it = L.item, pi = hint.item ? 1 + Math.sin(W.time * 9) * 0.1 : 1;
        btn({ ...it, r: it.r * pi }, ctl.item, "#ffc233");
        if (k.item && k.roll2 <= 0) d.sprite(`i_${k.item}`, { x: it.x, y: it.y, width: 44, height: 44 });
        else d.text("ITEM", { x: it.x, y: it.y, size: 13, bold: true, font: FONT, color: "#fff6e6", opacity: 0.8 });
    } else if (k.driftDir) {
        const x = v.width / 2, y = v.height - 58 - v.safe.bottom;
        d.circle(26, { x, y, color: INK, opacity: 0.6 }); arc(d, x, y, 22, clamp(k.charge / TIERS[2], 0, 1), SPARK[k.tier][0], 6);
    }
    if (mode === "buttons") {
        for (const [b, on, a] of [[L.left, ctl.left, -1], [L.right, ctl.right, 1]]) {
            btn(b, on, "#38b6ff");
            d.poly([[b.x + a * 18, b.y], [b.x - a * 10, b.y - 17], [b.x - a * 10, b.y + 17]], { color: "#fff6e6" });
        }
    } else {
        // The steering slider sits where the thumb went down, and fades in only when it's needed.
        const c = ctl.activeSteer, y = c ? c.sy : L.left.y - 6, x = c ? c.x0 : L.left.x + 36, range = Math.min(v.width * 0.17, 72);
        d.rect(range * 2 + 34, 34, { x, y, color: INK, radius: 17, opacity: 0.42 });
        d.rect(range * 2 + 34, 34, { x, y, color: "#fff6e6", radius: 17, outline: 2, opacity: 0.5 });
        d.circle(21, { x: x + ctl.steer * range, y, color: "#fff6e6", opacity: c ? 0.95 : 0.55 });
        d.circle(9, { x: x + ctl.steer * range, y, color: "#ff4b3e", opacity: c ? 1 : 0.6 });
    }
}

function miniMap(W) {
    const T = W.T, pts = [];
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < T.n; i++) { x0 = Math.min(x0, T.px[i]); x1 = Math.max(x1, T.px[i]); z0 = Math.min(z0, T.pz[i]); z1 = Math.max(z1, T.pz[i]); }
    const size = 68, sc = size / Math.max(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    for (let i = 0; i < T.n; i += 8) pts.push([(T.px[i] - cx) * sc, (T.pz[i] - cz) * sc]);
    return (d, x, y, k) => {
        for (let pass = 0; pass < 2; pass++) for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            d.line([x + a[0], y + a[1]], [x + b[0], y + b[1]], { width: pass ? 2.6 : 5.6, color: pass ? "#fff6e6" : INK, opacity: pass ? 1 : 0.7 });
        }
        for (const o of W.karts) {
            if (o === k) continue;
            d.circle(3.4, { x: x + (o.x - cx) * sc, y: y + (o.z - cz) * sc, color: o.racer.color });
        }
        d.circle(5.6, { x: x + (k.x - cx) * sc, y: y + (k.z - cz) * sc, color: INK });
        d.circle(4, { x: x + (k.x - cx) * sc, y: y + (k.z - cz) * sc, color: "#ffffff" });
    };
}
