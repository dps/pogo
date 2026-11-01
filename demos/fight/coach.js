// First-launch lesson. No text walls: one prompt at a time, the real button lit up, and it moves on the moment you do it.
import { BTN } from "./sim.js";
import { DISPLAY, GOLD, INK, CREAM } from "./ui.js";

const STEPS = [
    { say: "WALK OVER THERE", keys: "A / D or ARROWS", bit: null, stick: true, need: (c) => Math.abs(c.m.fight.p[0].x - c.m.fight.p[1].x) < 96 },
    { say: "TAP LIGHT! TAP TAP TAP", keys: "J or F", bit: BTN.A, count: 3, on: (e) => e.type === "startup" && e.i === 0 && e.rank === 1 },
    { say: "HEAVY HITS HARDER", keys: "K or G", bit: BTN.B, count: 1, on: (e) => e.type === "startup" && e.i === 0 && e.rank === 2 },
    { say: "NOW A SPECIAL", keys: "L or H", bit: BTN.S2, count: 1, on: (e) => (e.type === "startup" && e.i === 0 && e.rank === 3) },
    { say: "HOLD BLOCK!", keys: "U or R", bit: BTN.G, count: 1, on: (e) => e.type === "block" && e.i === 0, swing: true },
    { say: "HEAT'S FULL. SUPER!", keys: "O or Y", bit: BTN.X, count: 1, on: (e) => e.type === "cine" && e.i === 0, meter: true },
    { say: "FINISH THE FRIDGE!", keys: "", bit: null, count: 1, on: () => false, foeLive: true, free: true },
];

export class Coach {
    constructor(m) { this.m = m; this.i = 0; this.n = 0; this.t = 0; }
    get step() { return STEPS[this.i]; }
    foeIdle() { return !this.step?.foeLive; }
    /** The lesson's sparring partner: stands still, except for one slow, obvious swing when it's time to block. */
    foeMask() {
        if (!this.step?.swing) return 0;
        const f = this.m.fight.p[1], d = Math.abs(f.x - this.m.fight.p[0].x);
        if (d > 104) return f.face > 0 ? BTN.R : BTN.L;
        return this.t % 70 === 40 ? BTN.B : 0;
    }
    next() { this.i++; this.n = 0; this.t = 0; this.m.kit.sound.pick(); this.m.g.haptic("success"); }
    event(e) {
        const s = this.step; if (!s?.on) return;
        if (s.on(e) && ++this.n >= s.count) this.next();
    }
    update() {
        this.t++;
        const f = this.m.fight, s = this.step;
        if (!s) return;
        if (s.need?.(this)) this.next();
        if (s.meter) f.p[0].meter = 100;
        // The dummy can't be finished until the lesson is done.
        if (!s.free) { f.p[1].hp = Math.max(f.p[1].hp, f.p[1].hpMax * 0.5); f.time = 3600; }
        f.p[0].hp = Math.max(f.p[0].hp, 200);
    }
    draw(d, W, H) {
        const s = this.step; if (!s) return;
        const touch = this.m.kit.onScreen(), pop = this.t < 10 ? 1.3 - this.t * 0.03 : 1, y = H * 0.24, text = s.say, size = Math.min(24, W / (text.length * 0.66)) * pop;
        d.text(text, { x: W / 2 + 2, y: y + 3, size, bold: true, font: DISPLAY, color: INK });
        d.text(text, { x: W / 2, y, size, bold: true, font: DISPLAY, color: GOLD });
        if (!touch && s.keys) { d.text(s.keys, { x: W / 2 + 1, y: y + 25, size: 13, bold: true, font: DISPLAY, color: INK }); d.text(s.keys, { x: W / 2, y: y + 24, size: 13, bold: true, font: DISPLAY, color: CREAM }); }
        const pad = this.m.pad;
        if (pad && touch) for (const c of pad.controls) {
            const on = (c.kind === "stick" && s.stick) || (c.kind === "btn" && s.bit && c.bit === s.bit);
            if (on) { const k = (this.t % 40) / 40; d.circle(c.r + 8 + k * 16, { x: c.x, y: c.y, color: GOLD, outline: 4 * (1 - k), opacity: 1 - k }); d.circle(c.r + 5, { x: c.x, y: c.y, color: GOLD, outline: 3 }); }
        }
    }
}
