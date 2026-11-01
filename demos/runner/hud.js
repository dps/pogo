// In-run heads-up display. Numbers come from a painted atlas, because a text texture per score tick is a phone killer.
import { BIOMES, DISGUISES, FARMER_LINES } from "./data.js";

export const FONT = "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', 'Nunito', 'Trebuchet MS', system-ui, sans-serif";
export const INK = "#2c2030", CREAM = "#fff4dc", GOLD = "#ffc933", RED = "#e8432e";

/** Chunky outlined text, the game's voice. */
export function chunky(d, str, x, y, size, fill = "#fff", stroke = INK, w = size * 0.11, rot = 0) {
    const o = { x, y, size, bold: true, font: FONT, color: stroke, rot };
    for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) { o.x = x + ax * w; o.y = y + ay * w; d.text(str, o); }
    o.x = x; o.y = y + w * 0.9; d.text(str, o);
    o.y = y; o.color = fill; d.text(str, o);
}
const commas = (n) => { const s = String(Math.floor(n)); let o = ""; for (let i = 0; i < s.length; i++) { if (i && (s.length - i) % 3 === 0) o += ","; o += s[i]; } return o; };

/** Draw a number from the digit atlas. anchor: -1 left, 0 centre, 1 right. */
export function digits(d, value, x, y, h, anchor = 0, tint = [1, 1, 1], raw = false) {
    const s = raw ? value : commas(value), w = h * 0.68;
    let n = 0; for (const c of s) n += c === "," ? 0.45 : c === "x" ? 0.8 : 0.8;
    let cx = x - (anchor + 1) / 2 * n * w;
    const put = d.quads("digits");
    for (const c of s) {
        const k = c === "," ? 0.45 : 0.8, f = c === "," ? 10 : c === "x" ? 11 : c.charCodeAt(0) - 48;
        put(cx + k * w / 2, y, h * 40 / 56, h, 0, f, tint[0], tint[1], tint[2], 1);
        cx += k * w;
    }
}
export function pill(d, x, y, w, h, c = "#2c2030cc") { d.push(); d.translate(x, y); d.rect(w, h, { radius: h / 2, color: c }); d.pop(); }

export class Hud {
    constructor(play) {
        this.play = play; this.game = play.game; this.s = play.s;
        this.pops = []; this.toasts = []; this.scorePop = 0; this.eggPop = 0;
        this.card = null; this.banner = null; this.bubble = null; this.heatFlash = 0;
        this.show = 0; this.hint = null; this.lines = [];
        this.lineN = 0;
    }
    reset() { this.pops.length = 0; this.toasts.length = 0; this.card = null; this.banner = null; this.bubble = null; this.hint = null; }
    pop(text, color, size = 26) { this.pops.push({ text, color, size, t: 0, x: (this.game.fxRng.next() - 0.5) * 60, n: 0 }); if (this.pops.length > 5) this.pops.shift(); }
    toast(text, sub) { this.toasts.push({ text, sub, t: 0 }); }
    wear(id) { const k = DISGUISES[id]; this.card = { id, name: k.name, line: k.line, t: 0 }; }
    biome(i) { const b = BIOMES[i]; this.banner = { name: b.name, sub: b.sub, t: 0 }; }
    say(text, time = 1.6, who = "farmer") { this.bubble = { text, t: 0, time, who }; }
    /** Runs on real time, so popups don't crawl during slow motion. */
    tick(dt) {
        for (const p of this.pops) p.t += dt;
        while (this.pops.length && this.pops[0].t > 0.9) this.pops.shift();
        for (const k of this.toasts) k.t += dt;
        if (this.toasts.length && this.toasts[0].t > 2.8) this.toasts.shift();
        if (this.card && (this.card.t += dt) > 1.9) this.card = null;
        if (this.banner && (this.banner.t += dt) > 3) this.banner = null;
        if (this.bubble && (this.bubble.t += dt) > this.bubble.time) this.bubble = null;
        this.scorePop *= Math.pow(0.003, dt); this.eggPop *= Math.pow(0.002, dt); this.heatFlash *= Math.pow(0.01, dt);
    }
    draw(d) {
        const P = this.play, run = P.run, v = this.s.view, safe = v.safe, W = v.width;
        this.drawBubble(d);
        if (run && P.phase === "run" && P.menus.screen !== "pause") {
            const top = safe.top + 10;
            d.push(); d.translate(W / 2, top + 20); d.scale(1 + this.scorePop * 0.14);
            digits(d, run.score, 0, 0, 34);
            d.pop();
            if (run.mult > 1) { pill(d, W / 2, top + 50, 58, 22, "#e8432ee6"); digits(d, `x${run.mult}`, W / 2, top + 50, 16, 0, [1, 1, 1], true); }
            // Eggs, top right.
            const ex = W - safe.right - 14;
            d.sprite("egg_icon", { x: ex - 12, y: top + 20, width: 25 * (1 + this.eggPop * 0.4), height: 28 * (1 + this.eggPop * 0.4) });
            digits(d, run.eggCount, ex - 29, top + 20, 26, 1);
            // The farmer closing in.
            if (run.heat > 0.02 || this.heatFlash > 0.05) this.drawHeat(d, top + 56, run);
            if (run.disguise) this.drawDisguise(d, run, safe.left + 34, top + 76);
            if (run.chain > 1) chunky(d, `CHAIN x${run.chain}`, W / 2, top + 74, 15, GOLD);
        }
        this.drawPops(d);
        if (this.banner) this.drawBanner(d);
        if (this.card) this.drawCard(d);
        this.drawToasts(d);
        if (this.hint) this.drawHint(d);
    }
    drawHeat(d, y, run) {
        const W = this.s.view.width, w = Math.min(150, W * 0.42), x0 = W - this.s.view.safe.right - 14 - w, k = Math.min(1, run.heat);
        pill(d, x0 + w / 2, y, w, 10, "#2c203099");
        const c = k > 0.6 ? RED : k > 0.3 ? "#ff9a2e" : "#ffd25c";
        if (k > 0.02) pill(d, x0 + w * k / 2 + 2, y, Math.max(10, w * k - 4), 6, c);
        const s = 30 + this.heatFlash * 16 + (k > 0.6 ? Math.sin(this.s.time * 18) * 2 : 0);
        d.sprite("farmer_face", { x: x0 + w * k, y: y + 1, width: s, height: s });
    }
    drawDisguise(d, run, x, y) {
        const id = run.disguise, k = run.disguiseT / DISGUISES[id].time;
        const blink = run.disguiseT < 1.6 && Math.floor(run.disguiseT * 8) % 2 === 0;
        d.push(); d.translate(x, y);
        d.circle(26, { color: "#2c2030aa" });
        const n = 24;
        for (let i = 0; i < n * k; i++) { const a = -Math.PI / 2 + i / n * Math.PI * 2; d.push(); d.translate(Math.cos(a) * 25, Math.sin(a) * 25); d.circle(2.6, { color: blink ? "#ff5d3a" : GOLD }); d.pop(); }
        d.sprite(`b_${id}`, { width: 38, height: 38, opacity: blink ? 0.6 : 1 });
        d.pop();
    }
    drawPops(d) {
        const v = this.s.view;
        for (const p of this.pops) {
            const t = p.t / 0.9, grow = t < 0.15 ? 0.6 + t / 0.15 * 0.6 : 1.2 - Math.min(0.2, (t - 0.15) * 1.2);
            d.push(); d.translate(v.width / 2 + p.x, v.height * 0.46 - t * 60); d.scale(grow);
            chunky(d, p.text, 0, 0, p.size, p.color);
            d.pop();
        }
    }
    drawBanner(d) {
        const b = this.banner, v = this.s.view, t = b.t, wide = v.width > v.height, y = wide ? v.height * 0.5 : v.height - v.safe.bottom - 196, into = Math.min(1, t * 5), out = t > 2.5 ? (t - 2.5) * 2 : 0;
        const dx = (1 - into) * (1 - into) * -v.width + out * out * v.width;
        d.push(); d.translate((wide ? v.width * 0.82 : v.width / 2) + dx, y); d.rotate(-0.03);
        d.rect(wide ? 200 : Math.min(v.width - 20, 330), 66, { color: "#2c2030ee", radius: 16 });
        chunky(d, b.name, 0, -11, wide ? 19 : 25, GOLD);
        d.text(b.sub, { y: 17, size: wide ? 10.5 : 13, bold: true, color: CREAM, font: FONT, maxWidth: wide ? 190 : 320 });
        d.pop();
    }
    drawCard(d) {
        // Down in the thumbs' area in portrait and off to the side in landscape, so it never hides the road ahead.
        const c = this.card, v = this.s.view, t = c.t, wide = v.width > v.height, into = Math.min(1, t * 7), pop = into < 1 ? into * (1.5 - into * 0.5) : 1, out = t > 1.5 ? (t - 1.5) * 3 : 0;
        const w = wide ? 196 : Math.min(v.width - 24, 300), h = wide ? 112 : 78;
        const x = wide ? v.width * 0.16 : v.width / 2, y = (wide ? v.height * 0.52 : v.height - v.safe.bottom - 104) + out * out * 260;
        d.push(); d.translate(x, y); d.scale(pop); d.rotate(wide ? -0.03 : 0.02);
        d.rect(w + 7, h + 7, { color: INK, radius: 20 });
        d.rect(w, h, { color: "#ffffff", radius: 16 });
        const b = wide ? 46 : 60, bx = wide ? 0 : -w / 2 + 42, by = wide ? -28 : 0, tx = wide ? 0 : 38, ty = wide ? 12 : -13;
        d.sprite(`b_${c.id}`, { x: bx, y: by, width: b, height: b });
        chunky(d, c.name, tx, ty, c.name.length > 13 ? 18 : 20, RED, INK, 1.6);
        d.text(c.line, { x: tx, y: ty + (wide ? 22 : 28), size: 12, bold: true, color: INK, font: FONT, maxWidth: wide ? 180 : 190, align: "center" });
        d.pop();
    }
    drawToasts(d) {
        const v = this.s.view, k = this.toasts[0];
        if (!k) return;
        const into = Math.min(1, k.t * 5), out = k.t > 2.4 ? (k.t - 2.4) * 2.5 : 0, y = v.height - v.safe.bottom - 34 + (1 - into) * 90 + out * out * 90;
        d.push(); d.translate(v.width / 2, y);
        d.rect(Math.min(v.width - 20, 320), 56, { color: "#2c2030ee", radius: 14 });
        d.sprite("star", { x: -130, width: 32, height: 32 });
        d.text(k.text, { x: 14, y: -9, size: 13.5, bold: true, color: GOLD, font: FONT, maxWidth: 260 });
        d.text(k.sub, { x: 14, y: 11, size: 12, bold: true, color: CREAM, font: FONT, maxWidth: 260 });
        d.pop();
    }
    drawBubble(d) {
        const b = this.bubble, P = this.play;
        if (!b) return;
        const v = this.s.view;
        const f = P.stage.farmer, on = !f.hidden && b.who === "farmer", w = Math.max(90, Math.min(240, b.text.length * 9.4)), a = Math.min(1, b.t * 8);
        let x = v.width * 0.5, y = v.height * 0.6;
        if (on) { const p = this.s.cam3.project([f.body.pos.x, f.body.pos.y + 3, f.body.pos.z]); if (p.visible) { x = p.x; y = p.y - 26; } }
        x = Math.max(w / 2 + 10, Math.min(v.width - w / 2 - 10, x));
        d.push(); d.translate(x, y); d.scale(a);
        d.poly([[-10, 12], [10, 12], [-2, 28]], { color: INK });
        d.rect(w + 6, 36, { color: INK, radius: 14 });
        d.rect(w, 30, { color: "#ffffff", radius: 11 });
        d.poly([[-7, 12], [7, 12], [-2, 23]], { color: "#ffffff" });
        d.text(b.text, { size: 14.5, bold: true, color: INK, font: FONT, y: 0 });
        d.pop();
    }
    drawHint(d) {
        const h = this.hint, v = this.s.view, t = this.play.clock, cx = v.width / 2, cy = v.height * 0.5;
        const touch = this.s.input.touchMode;
        const words = { lane: touch ? "SWIPE SIDEWAYS" : "LEFT OR RIGHT", jump: touch ? "SWIPE UP" : "UP OR SPACE", slide: touch ? "SWIPE DOWN" : "DOWN" };
        chunky(d, words[h.need], cx, cy - 74, 30, GOLD);
        if (!touch) return;
        const k = (t * 1.6) % 1, e = k * k * (3 - 2 * k), dir = h.need === "jump" ? [0, -1] : h.need === "slide" ? [0, 1] : [Math.sin(t * 0.8) > 0 ? 1 : -1, 0];
        d.sprite("hand", { x: cx + dir[0] * (e - 0.5) * 110, y: cy + 20 + dir[1] * (e - 0.5) * 100, width: 60, height: 70, opacity: k > 0.8 ? (1 - k) * 5 : 1 });
    }
}
export { FARMER_LINES };
