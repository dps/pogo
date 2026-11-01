// Stage one teaches by doing: one short shout at a time, the right button glowing, and it moves on when you've done the thing.
import { C } from "./art.js";
import { comic, FONT } from "./view.js";

const STEPS = [
    { id: "walk", key: null, text: "PUSH THE STICK RIGHT, HON!", desk: "HOLD D TO WALK RIGHT, HON!", until: (c) => c.sim.hero.x > 200 },
    { id: "attack", key: "A", text: "TAP ATTACK! WHACK 'EM, HON!", desk: "J TO ATTACK! WHACK 'EM, HON!", until: (c) => c.sim.stats.hits >= 3 },
    { id: "launch", key: "H", text: "ATTACK, THEN HEAVY: SCOOP!", desk: "J THEN K: SCOOP!", until: (c) => c.launched },
    { id: "juggle", key: "A", text: "SCOOP, THEN KEEP ATTACKING!", desk: "SCOOP, THEN KEEP PRESSING J!", until: (c) => c.sim.stats.aerial >= 2, wait: true },
    { id: "dodge", key: "G", text: "SEE A RED ! ? DODGE IT!", desk: "RED ! MEANS SHIFT TO DODGE!", until: (c) => c.dodged },
    { id: "grab", key: null, text: "WALK INTO A KID TO GRAB. HEAVY THROWS!", desk: "WALK INTO A KID, THEN K: THROW!", until: (c) => c.sim.stats.throws >= 1 },
    { id: "soup", key: "S", text: "SOUP'S READY! HIT SOUP!", desk: "SOUP'S READY! PRESS I!", until: (c) => c.sim.stats.specials >= 1, when: (c) => c.sim.meter >= 100 },
    { id: "tag", key: "T", text: "TIRED? TAG PIP IN!", desk: "TIRED? E TAGS PIP IN!", until: (c) => c.sim.stats.tags >= 1, when: (c) => c.sim.hero.hp < c.sim.hero.maxHp * 0.7 },
];

export class Coach {
    constructor(play, kit) { this.p = play; this.sim = play.sim; this.kit = kit; this.i = kit.save.taught ?? 0; this.on = this.i === 0; this.launched = false; this.dodged = false; this.t = 0; this.shown = 0; this.pop = 0; this.extra = null; }
    get step() { return STEPS[this.i]; }
    event(e) { if (e.t === "launch") this.launched = true; if (e.t === "dodge") this.dodged = true; }
    lock() { this.on = true; }
    block() { this.say("SHIELD! USE HEAVY, OR WALK INTO HIM!", "H"); }
    pickup(e) { if (e.weapon) this.say(`${e.kind.toUpperCase()}! ATTACK SWINGS, HEAVY THROWS!`, null); }
    say(text, key) { if (this.saidAt && this.t - this.saidAt < 600) return; this.saidAt = this.t; this.extra = { text, key, t: 180 }; this.pop = 1; }
    update() {
        this.t++;
        const s = this.step;
        if (this.extra && --this.extra.t <= 0) this.extra = null;
        if (!this.on) { this.p.pad.pulse = null; return; }
        if (!s) { this.p.pad.pulse = this.extra?.key ?? null; return; }
        if (s.until(this)) { this.i++; this.kit.save.taught = this.i; this.kit.persist(); this.pop = 1; this.shown = 0; return; }
        const live = !s.when || s.when(this);
        this.active = live ? s : null;
        if (live) this.shown++;
        this.p.pad.pulse = this.extra?.key ?? (live ? s.key : null);
    }
    draw(d) {
        const s = this.extra ?? (this.on && this.active && this.step === this.active ? this.active : null);
        if (!s) return;
        this.pop *= 0.86;
        const v = this.p.s.view, desktop = !this.p.pad.show, txt = desktop && s.desk ? s.desk : s.text, W = v.width - 16 - v.safe.left - v.safe.right, size = Math.min(16, W / (txt.length * 0.66)), y = v.safe.top + (v.height > v.width ? 146 : 76);
        d.push(); d.translate(v.width / 2, y); d.scale(1 + this.pop * 0.2);
        d.rect(Math.min(W, txt.length * size * 0.68 + 30), size + 20, { color: C.ink, radius: 10 });
        d.rect(Math.min(W, txt.length * size * 0.68 + 24), size + 14, { color: C.cream, radius: 8 });
        d.text(txt, { x: 0, y: 0, size, bold: true, font: FONT, color: C.ink });
        d.pop();
    }
}
