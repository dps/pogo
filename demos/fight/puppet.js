// The puppet: reads a fighter's sim state, eases a pose towards it, and draws painted parts, noodle limbs and a live face.
// Hand targets during active frames come from the move's real hitbox, so what you see is what hits.
const INK = "#241a2c", HOSE = "#3a2f44", HOSE_HI = "#6b5d78";

export const RIGS = {
    crumbs: { body: [0, -68], sF: [32, -58], sB: [-34, -60], hF: [15, -26], hB: [-17, -26], face: [8, -74, 1.05], leg: 26 },
    frappe: { body: [0, -80], sF: [24, -60], sB: [-22, -62], hF: [13, -26], hB: [-13, -26], face: [6, -100, 0.96], leg: 26 },
    ristretto: { body: [0, -72], sF: [34, -78], sB: [-34, -78], hF: [15, -25], hB: [-15, -25], face: [-4, -86, 0.96], leg: 24 },
    whistle: { body: [-4, -64], sF: [34, -50], sB: [-40, -58], hF: [15, -26], hB: [-15, -26], face: [8, -70, 1.02], leg: 26 },
    ding: { body: [0, -64], sF: [46, -62], sB: [-48, -62], hF: [24, -24], hB: [-24, -24], face: [-8, -68, 1.08], leg: 24 },
    chill: { body: [0, -84], sF: [36, -88], sB: [-38, -88], hF: [20, -28], hB: [-20, -28], face: [4, -108, 1.05], leg: 28 },
    knead: { body: [2, -82], sF: [-10, -74], sB: [-40, -76], hF: [22, -26], hB: [-24, -26], face: [8, -128, 0.86], leg: 26 },
    clamp: { idleTop: 0.12, body: [0, -40], sF: [46, -42], sB: [-50, -42], hF: [24, -22], hB: [-24, -22], face: [10, -70, 1.05], leg: 22 },
};

// Skin colour behind each face, for the eyelids.
const LID = { frappe: "#ffa9cb", ding: "#ffe39a", chill: "#7fc4e4", clamp: "#dcae50", ristretto: "#a96a3c", knead: "#f09450", crumbs: "#e24a30", whistle: "#7f6cd8" };
const FIELDS = ["bx", "by", "lean", "sx", "sy", "hFx", "hFy", "hBx", "hBy", "fFx", "fFy", "fBx", "fBy", "top", "aux", "brow", "lid"];

function stance(r) {
    return {
        bx: 0, by: 0, lean: 0, sx: 1, sy: 1,
        hFx: r.sF[0] + 18, hFy: r.sF[1] + 6, hBx: r.sF[0] + 22, hBy: r.sF[1] - 22,
        fFx: r.hF[0] + 7, fFy: 0, fBx: r.hB[0] - 7, fBy: 0, top: r.idleTop ?? 0, aux: 0, brow: 0, lid: 1,
        gF: "fist", gB: "fist", eye: "norm", mouth: "set",
    };
}

/** Authored key poses: a is wind-up, b is the strike (hand comes from the hitbox), c is follow-through. */
const K = {
    jab: { a: { lean: -0.1, bx: -5, sx: 0.96, sy: 1.04, hFx: 8, hFy: -62, mouth: "grit" }, b: { lean: 0.2, bx: 10, sx: 1.14, sy: 0.9, fFx: 34, mouth: "yell", eye: "fierce" }, c: { lean: 0.1, bx: 4, hFx: 40, hFy: -60 } },
    low: { a: { by: 14, sx: 1.08, sy: 0.84, lean: -0.05, mouth: "grit" }, b: { by: 24, sx: 1.2, sy: 0.76, lean: 0.1, bx: 8, fFx: 48, mouth: "yell", eye: "fierce" }, c: { by: 18, sy: 0.84 } },
    hook: { a: { lean: -0.32, bx: -12, sx: 0.9, sy: 1.1, hFx: -46, hFy: -74, hBx: 34, hBy: -60, mouth: "grit", eye: "fierce" }, b: { lean: 0.36, bx: 16, sx: 1.22, sy: 0.84, fFx: 44, fBx: -36, mouth: "yell", eye: "fierce", gF: "fist" }, c: { lean: 0.16, bx: 8, sx: 1.05, sy: 0.96, hFx: 70, hFy: -44 } },
    reach: { a: { lean: -0.26, bx: -14, sx: 0.92, sy: 1.06, hFx: -30, hFy: -80, mouth: "grit", eye: "fierce" }, b: { lean: 0.22, bx: 18, sx: 1.2, sy: 0.88, fFx: 40, fBx: -40, mouth: "yell", eye: "fierce", gF: "open", aux: 1 }, c: { lean: 0.1, bx: 6, hFx: 60, hFy: -50 } },
    upper: { a: { by: 20, sx: 1.2, sy: 0.74, lean: 0.12, hFx: 16, hFy: -22, mouth: "grit", eye: "fierce" }, b: { by: -18, sx: 0.8, sy: 1.34, lean: -0.1, bx: 8, fBy: -8, mouth: "yell", eye: "fierce", top: 1 }, c: { by: -6, sy: 1.1, sx: 0.94, hFx: 36, hFy: -110 } },
    overhead: { a: { by: -14, sy: 1.26, sx: 0.84, lean: -0.42, bx: -8, hFx: -22, hFy: -128, hBx: -8, hBy: -126, mouth: "grit", eye: "fierce", top: 0.6 }, b: { by: 20, sy: 0.72, sx: 1.34, lean: 0.46, bx: 18, hBx: 48, hBy: -40, mouth: "yell", eye: "fierce", fFx: 42 }, c: { by: 12, sy: 0.86, sx: 1.14, lean: 0.3, hFx: 64, hFy: -22 } },
    airjab: { a: { lean: 0.1, sx: 0.94, hFx: 10, hFy: -70, mouth: "grit" }, b: { lean: 0.32, sx: 1.1, fFx: 30, fFy: -24, fBx: -24, fBy: -8, mouth: "yell", eye: "fierce" }, c: { lean: 0.2 } },
    airkick: { a: { lean: -0.18, fFx: 8, fFy: -36, fBy: -30, hFx: -20, hFy: -80, hBx: -30, hBy: -76, mouth: "grit", eye: "fierce" }, b: { lean: 0.5, sx: 1.2, sy: 0.9, hFx: -30, hFy: -80, fFx: 40, fFy: -8, fBx: -8, fBy: -30, mouth: "yell", eye: "fierce" }, c: { lean: 0.3 } },
    throw: { a: { lean: 0.14, bx: 10, hFx: 60, hFy: -62, hBx: 58, hBy: -44, gF: "open", gB: "open", mouth: "grit", eye: "fierce", fFx: 34 }, b: { lean: 0.22, bx: 16, hFx: 66, hFy: -58, hBx: 62, hBy: -38, gF: "open", gB: "open", mouth: "grin" }, c: { lean: 0, hFx: 30, hFy: -50, hBx: 20, hBy: -48 } },
    shoot: { a: { lean: -0.2, bx: -8, sx: 0.88, sy: 1.14, hFx: -6, hFy: -68, hBx: 2, hBy: -60, mouth: "grit", eye: "fierce", top: 0.2 }, b: { lean: 0.22, bx: 8, sx: 1.2, sy: 0.84, hFx: 62, hFy: -66, gF: "open", mouth: "yell", eye: "fierce", top: 1 }, c: { lean: 0.08, hFx: 44, hFy: -60, top: 0.3 } },
    shootup: { a: { by: 14, sx: 1.16, sy: 0.8, hFx: 12, hFy: -30, mouth: "grit", eye: "fierce" }, b: { by: -8, sx: 0.86, sy: 1.26, lean: -0.22, hFx: 30, hFy: -110, gF: "open", mouth: "yell", eye: "fierce", top: 1 }, c: { hFx: 34, hFy: -80, top: 0.3 } },
    lob: { a: { lean: -0.34, bx: -10, hFx: -40, hFy: -40, gF: "open", mouth: "grit", top: 0.3 }, b: { lean: 0.26, bx: 8, hFx: 42, hFy: -102, gF: "open", mouth: "yell", eye: "fierce", top: 1 }, c: { lean: 0.08, hFx: 40, hFy: -76 } },
    charge: { a: { lean: -0.2, bx: -16, by: 8, sx: 1.1, sy: 0.88, hFx: -26, hFy: -66, hBx: -36, hBy: -60, mouth: "grit", eye: "fierce" }, b: { lean: 0.44, bx: 22, sx: 1.3, sy: 0.82, hFx: 58, hFy: -58, hBx: 42, hBy: -74, fFx: 34, fBx: -46, fBy: -10, mouth: "yell", eye: "fierce", top: 1 }, c: { lean: -0.06, bx: 4, sx: 0.96, sy: 1.04, mouth: "pant" } },
    riser: { a: { by: 22, sx: 1.26, sy: 0.7, hFx: 18, hFy: -24, mouth: "grit", eye: "fierce" }, b: { by: -10, sy: 1.34, sx: 0.8, hFx: 34, hFy: -138, hBx: -34, hBy: -44, fFy: -18, fBy: -2, mouth: "yell", eye: "fierce", top: 1 }, c: { sy: 1.1, sx: 0.94, top: 0.4 } },
    spin: { a: { by: 8, sx: 1.12, sy: 0.88, mouth: "grit", eye: "fierce", aux: 1 }, b: { sx: 1.12, sy: 1, hFx: 64, hFy: -60, hBx: -62, hBy: -62, fFx: 26, fBx: -26, mouth: "yell", eye: "fierce", top: 0.8, aux: 1 }, c: { sx: 0.96, aux: 0.4, mouth: "pant" } },
    slide: { a: { by: 12, lean: 0.2, sy: 0.86, mouth: "grit" }, b: { by: 28, lean: 0.74, bx: -6, sx: 1.2, sy: 0.84, fFx: 56, fFy: -4, fBx: 22, fBy: -4, hBx: -40, hBy: -30, hFx: -28, hFy: -46, mouth: "yell", eye: "fierce", top: 0.5 }, c: { by: 8, lean: 0.14 } },
    flip: { a: { by: 18, sy: 0.76, sx: 1.2, mouth: "grit", eye: "fierce" }, b: { lean: 0.5, sy: 1.1, hFx: 40, hFy: -56, hBx: -36, hBy: -58, fFx: 20, fFy: -30, fBx: -12, fBy: -20, mouth: "yell", eye: "fierce", top: 1 }, c: { lean: 0.1, fFy: -14 } },
    door: { a: { lean: -0.2, bx: -10, sx: 0.92, sy: 1.08, mouth: "grit", eye: "fierce", top: 0.1, hFx: 10, hFy: -40 }, b: { lean: 0.2, bx: 16, sx: 1.2, sy: 0.92, top: 1, mouth: "yell", eye: "fierce", fFx: 40, hFx: 54, hFy: -40, gF: "open" }, c: { top: 0.6, lean: 0.1 } },
    bite: { a: { lean: -0.2, top: 1, sx: 0.96, by: 2, mouth: "grit", eye: "fierce", hFx: -10, hFy: -56, hBx: -24, hBy: -50 }, b: { lean: 0.26, bx: 14, top: 0, sx: 1.22, sy: 0.84, mouth: "grit", eye: "fierce", fFx: 38 }, c: { top: 0.3 } },
    guardup: { a: { top: 0.9, lean: -0.12, sy: 0.94, mouth: "smirk", eye: "narrow", hFx: 34, hFy: -66, hBx: 16, hBy: -44, gF: "open", gB: "open" }, b: { top: 0.9, lean: -0.12, mouth: "smirk", eye: "narrow", hFx: 36, hFy: -68, hBx: 16, hBy: -44, gF: "open", gB: "open" }, c: { top: 0.2 } },
    powerup: { a: { by: 16, sy: 0.8, sx: 1.2, top: 1, aux: 1, mouth: "grit", eye: "fierce", hFx: 16, hFy: -30, hBx: 4, hBy: -30 }, b: { by: -8, sy: 1.26, sx: 0.84, top: 1, aux: 1, mouth: "yell", eye: "wide", hFx: 52, hFy: -118, hBx: -54, hBy: -120, gF: "open", gB: "open" }, c: { top: 0.5, aux: 1, mouth: "grin", eye: "wide" } },
};

export class Puppet {
    constructor(f, parts, shared) {
        this.f = f; this.id = f.def.id; this.parts = parts; this.shared = shared; this.r = RIGS[this.id];
        this.q = stance(this.r); this.qPrev = { ...this.q };
        this.k = f.def.height / 100; this.walk = 0; this.blink = 90; this.flash = 0; this.shake = 0; this.spin = 0; this.squash = 0;
        this.trail = []; this.prevY = 0; this.cordA = 0; this.cordV = 0; this.lastX = f.x; this.prevX = f.x; this.prevYpos = f.y; this.tumble = 0; this.lidBob = 0; this.jit = 0;
    }
    /** Ease towards the state's pose. Hit-stop freezes the puppet, which is what makes blows crunch. */
    update(fight, foe, i) {
        const f = this.f, q = this.q, r = this.r;
        this.prevX = f.x; this.prevYpos = f.y;
        if (this.flash > 0) this.flash -= 1;
        if (this.shake > 0) this.shake -= 1;
        if (f.stop > 0) return;
        for (const k of FIELDS) this.qPrev[k] = q[k];
        const t = fight.frame, target = this.target(fight, foe, t);
        const ease = f.st === "move" ? (f.phase === "active" ? 0.72 : 0.4) : f.st === "hit" || f.st === "juggle" ? 0.6 : 0.28;
        for (const k of FIELDS) q[k] += (target[k] - q[k]) * ease;
        q.gF = target.gF; q.gB = target.gB; q.eye = target.eye; q.mouth = target.mouth;
        this.spin += 0.2 + (q.aux + (f.st === "move" ? 0.5 : 0)) * 0.9;
        this.walk += Math.abs(f.vx) * 0.06;
        if (--this.blink < -5) this.blink = 90 + (t * 7) % 120;
        this.squash *= 0.8;
        // A cord tail that lags behind everything and whips on impacts.
        const acc = (this.lastX - f.x) * 0.012 * f.face - this.cordA * 0.08;
        this.cordV = (this.cordV + acc) * 0.86; this.cordA += this.cordV; this.lastX = f.x;
        if (f.buff > 0 || f.st === "dash" || (f.mv && f.mv.rank >= 3 && f.phase === "active") || fight.flashBy === f.i && fight.flash > 0) {
            if (t % 2 === 0) this.trail.push({ x: f.x, y: f.y, face: f.face, lean: q.lean, age: 0 });
        }
        for (const a of this.trail) a.age++;
        while (this.trail.length && this.trail[0].age > 12) this.trail.shift();
    }
    target(fight, foe, t) {
        const f = this.f, r = this.r, p = stance(r), id = this.id;
        const breathe = Math.sin(t * 0.09 + f.i) * 1.4;
        p.by += breathe * 0.5; p.hFy += breathe; p.hBy -= breathe * 0.6;
        p.sy += Math.sin(t * 0.09 + f.i) * 0.012; p.sx -= Math.sin(t * 0.09 + f.i) * 0.012;
        if (f.buff > 0) { p.bx += ((t * 13) % 3) - 1; p.aux = 1; p.eye = "wide"; p.mouth = "grin"; }
        const walkSwing = (amp) => { const a = Math.sin(this.walk), b = Math.cos(this.walk); p.fFx += a * amp; p.fFy = Math.min(0, b) * 9; p.fBx -= a * amp; p.fBy = Math.min(0, -b) * 9; p.lean += a * 0.04; p.by += Math.abs(b) * -3; p.hFx += -a * 8; p.hBx += a * 8; };
        switch (f.st) {
            case "stand":
                if (Math.abs(f.vx) > 0.2) { walkSwing(16); const forward = Math.sign(f.vx) === f.face; p.lean += forward ? 0.08 : -0.1; p.mouth = forward ? "set" : "worry"; if (!forward) p.eye = "wary"; }
                break;
            case "crouch": p.by += 26; p.sx = 1.16; p.sy = 0.74; p.fFx += 10; p.fBx -= 8; p.hFy += 22; p.hBy += 22; p.mouth = "grit"; p.eye = "wary"; break;
            case "guard": case "gstun": {
                const low = f.crouched;
                p.by += low ? 26 : 2; p.sx = low ? 1.14 : 0.96; p.sy = low ? 0.76 : 1.02; p.lean = -0.12;
                p.hFx = 36; p.hFy = low ? -42 : -70; p.hBx = 26; p.hBy = low ? -30 : -54; p.gF = "open"; p.gB = "open"; p.eye = "wince"; p.mouth = "grit"; if (f.st === "gstun") { p.bx -= 6; p.lean = -0.24; }
                break;
            }
            case "prejump": p.by += 16; p.sx = 1.2; p.sy = 0.76; p.mouth = "grit"; p.hFy += 20; p.hBy += 20; break;
            case "air": {
                const rise = f.vy > 0;
                p.sx = rise ? 0.88 : 1; p.sy = rise ? 1.18 : 1.02; p.fFy = -22; p.fBy = rise ? -6 : -24; p.fFx = 18; p.fBx = -16;
                p.hFx = 34; p.hFy = rise ? -96 : -84; p.hBx = -34; p.hBy = rise ? -88 : -92; p.gF = "open"; p.gB = "open"; p.mouth = rise ? "grin" : "o"; p.lean = f.vx * f.face * 0.03;
                break;
            }
            case "land": p.by += 20; p.sx = 1.28; p.sy = 0.7; p.fFx += 8; p.fBx -= 8; p.mouth = "grit"; break;
            case "dash": p.lean = f.dashDir * 0.34; p.sx = 1.2; p.sy = 0.86; p.bx = f.dashDir * 8; p.hFx = -f.dashDir * 26 + 10; p.hBx = -f.dashDir * 42; p.fFx += 18 * f.dashDir; p.fBx -= 14 * f.dashDir; p.mouth = f.dashDir > 0 ? "grin" : "worry"; break;
            case "move": this.movePose(p, f, t); break;
            case "hit": {
                const hard = f.stun > 16;
                p.lean = -0.36; p.bx = -8; p.sx = 0.92; p.sy = 1.08; p.hFx = 42; p.hFy = -96; p.hBx = -42; p.hBy = -100; p.gF = "open"; p.gB = "open"; p.eye = hard ? "x" : "wince"; p.mouth = "ouch"; p.top = 0.7; p.fFx += 8; p.fBx -= 12;
                break;
            }
            case "juggle": case "thrown": {
                this.tumble += (f.st === "thrown" ? 0.2 : 0.18) * (f.koed ? 1.4 : 1);
                p.lean = f.st === "thrown" ? -1 + Math.sin(this.tumble) * 0.3 : -0.5 - Math.min(1.2, this.tumble * 0.5);
                p.hFx = 30; p.hFy = -104; p.hBx = -50; p.hBy = -90; p.fFx = 34; p.fFy = -40; p.fBx = -6; p.fBy = -28; p.gF = "open"; p.gB = "open"; p.eye = f.koed ? "x" : "x"; p.mouth = "ouch"; p.top = 1;
                break;
            }
            case "down": this.tumble = 0; p.lean = -1.5; p.by = 16 + r.body[1] * -0.24; p.bx = -14; p.hFx = 40; p.hFy = -10; p.hBx = -46; p.hBy = -6; p.fFx = 60; p.fFy = 0; p.fBx = 46; p.fBy = -2; p.gF = "open"; p.gB = "open"; p.eye = "x"; p.mouth = "ouch"; p.top = 0.5; p.sy = 0.9; break;
            case "rise": { const k = Math.min(1, f.t / 18); p.lean = -1.5 * (1 - k); p.by = (16 - r.body[1] * 0.24) * (1 - k); p.eye = "wince"; p.mouth = "worry"; break; }
            case "grabbing": { const K2 = K.throw.b; Object.assign(p, K2); p.mouth = "grin"; p.eye = "fierce"; if (this.id === "chill" || this.id === "ding") p.top = 1; if (this.id === "clamp") p.top = 0.1; break; }
            case "ko": p.lean = -1.5; p.by = 20; p.eye = "x"; p.mouth = "tongue"; break;
            case "win": {
                const b = Math.abs(Math.sin(t * 0.12));
                p.by -= b * 14; p.sx = 1 - b * 0.06; p.sy = 1 + b * 0.08; p.hFx = 40; p.hFy = -128; p.hBx = -40; p.hBy = -126 - b * 6; p.gF = "open"; p.gB = "fist"; p.eye = "joy"; p.mouth = "grin"; p.top = 0.5 + b * 0.5;
                break;
            }
        }
        if (f.koed && f.st === "down") { p.eye = "x"; p.mouth = "tongue"; p.top = 1; }
        if (f.st === "stand" && foe && foe.koed) { p.eye = "joy"; p.mouth = "grin"; }
        p.hurt = f.hp / f.hpMax < 0.25;
        if (p.hurt && p.mouth === "set") { p.mouth = "pant"; }
        return p;
    }
    movePose(p, f, t) {
        const m = f.mv, key = K[m.pose] ?? K.jab, ph = f.phase;
        const phase = ph === "startup" ? key.a : ph === "active" ? key.b : key.c;
        Object.assign(p, phase);
        if (ph === "active" && m.box[2] && m.pose !== "spin") {
            // The strike lands where the hitbox is.
            const k = this.k;
            const hx = (m.box[0] + m.box[2] / 2 - 8) / k, hy = -m.box[1] / k;
            if (m.pose === "low" || m.pose === "slide" || m.pose === "airkick") { p.fFx = hx; p.fFy = hy + 4; }
            else { p.hFx = hx; p.hFy = hy; }
        }
        if (m.pose === "spin" && ph === "active") { const a = t * 0.9; p.hFx = Math.cos(a) * 60; p.hBx = -Math.cos(a) * 60; p.fFx = Math.sin(a) * 24; p.fBx = -Math.sin(a) * 24; }
        if (m.rank === 4 && ph === "startup") p.eye = "wide";
    }
    hit(strength) { this.flash = 5; this.shake = 6 + strength * 4; this.squash = 0.18 + strength * 0.08; }

    // --- Drawing -----------------------------------------------------------------------------
    p(d, sheet, name, x, y, o = {}) {
        const part = sheet.parts[name], [cx, cy, w, h] = part.crop;
        const sw = part.w * (o.sx ?? 1), sh = part.h * (o.sy ?? 1);
        d.sprite(sheet.name, { x: x + (part.w / 2 - part.ox) * (o.sx ?? 1), y: y + (part.h / 2 - part.oy) * (o.sy ?? 1), width: sw, height: sh, crop: part.crop, color: o.color, opacity: o.opacity });
    }
    capsule(d, x0, y0, x1, y1, w, color, opacity) {
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
        d.push(); d.translate((x0 + x1) / 2, (y0 + y1) / 2); d.rotate(Math.atan2(dy, dx));
        d.rect(len + w, w, { color, radius: w / 2, opacity }); d.pop();
    }
    /** A rubber hose from a to b, with slack that bows it when the ends are close. */
    hose(d, ax, ay, bx, by, len, bend, w, ink = INK, fill = HOSE, hi = HOSE_HI) {
        const dx = bx - ax, dy = by - ay, dist = Math.hypot(dx, dy) || 1, slack = Math.sqrt(Math.max(0, len * len - dist * dist)) * 0.55 * bend;
        const mx = (ax + bx) / 2 - dy / dist * slack, my = (ay + by) / 2 + dx / dist * slack;
        const N = 7, pts = [];
        for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; pts.push([u * u * ax + 2 * u * t * mx + t * t * bx, u * u * ay + 2 * u * t * my + t * t * by]); }
        for (let i = 0; i < N; i++) this.capsule(d, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w + 3, ink);
        for (let i = 0; i < N; i++) this.capsule(d, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, fill);
        for (let i = 1; i < N - 1; i++) this.capsule(d, pts[i][0] - 0.5, pts[i][1] - 1, pts[i + 1][0] - 0.5, pts[i + 1][1] - 1, w * 0.22, hi);
        return pts;
    }
    /** Draw the whole fighter with its foot at x, y. */
    draw(d, x, y, o = {}) {
        const f = this.f, face = o.face ?? f.face, k = this.k * (o.scale ?? 1);
        const q = o.pose ?? this.q;
        const shake = this.shake > 0 && !o.noShake ? (this.shake % 2 ? 2.5 : -2.5) : 0;
        d.push(); d.translate(x + shake, y); d.scale(face * k, k);
        this.drawBody(d, q, o);
        d.pop();
    }
    drawBody(d, q, o) {
        const r = this.r, sh = this.shared, id = this.id, sq = this.squash;
        const bx = q.bx, by = q.by, s = Math.sin(q.lean), c = Math.cos(q.lean);
        const place = (px, py) => {
            const lx = px - r.body[0], ly = py - r.body[1];
            return [r.body[0] + bx + (lx * q.sx * (1 + sq)) * c - (ly * q.sy * (1 - sq)) * s, r.body[1] + by + (lx * q.sx * (1 + sq)) * s + (ly * q.sy * (1 - sq)) * c];
        };
        const [sFx, sFy] = place(r.sF[0], r.sF[1]), [sBx, sBy] = place(r.sB[0], r.sB[1]), [hFx, hFy] = place(r.hF[0], r.hF[1]), [hBx, hBy] = place(r.hB[0], r.hB[1]);
        // Back limbs and cord.
        this.cord(d, place, q);
        this.hose(d, hBx, hBy, q.fBx, q.fBy - 6, r.leg * 1.6, 1, 7);
        this.shoe(d, q.fBx, q.fBy, -0.1);
        this.hose(d, sBx, sBy, q.hBx, q.hBy, 58, -1, 6.5);
        this.glove(d, q.gB, q.hBx, q.hBy, Math.atan2(q.hBy - sBy, q.hBx - sBx));
        // Body group.
        d.push();
        d.translate(r.body[0] + bx, r.body[1] + by); d.rotate(q.lean); d.scale(q.sx * (1 + sq), q.sy * (1 - sq)); d.translate(-r.body[0], -r.body[1]);
        this.shell(d, q);
        if (this.flash > 0 || o.flash) d.additive(() => this.shell(d, q, this.flash > 3 ? "#ffffff" : "#ffb070"));
        d.pop();
        // Front limbs.
        this.hose(d, hFx, hFy, q.fFx, q.fFy - 6, r.leg * 1.6, 1, 7);
        this.shoe(d, q.fFx, q.fFy, 0);
        this.hose(d, sFx, sFy, q.hFx, q.hFy, 60, 1, 6.5);
        this.glove(d, q.gF, q.hFx, q.hFy, Math.atan2(q.hFy - sFy, q.hFx - sFx));
    }
    shoe(d, x, y, rot) { this.p(d, { name: "shared", parts: this.shared }, "shoe", x, y - 1, { color: this.f.def.accent === "#7a3e22" ? "#c98a3c" : this.f.def.color }); }
    glove(d, kind, x, y, a) {
        d.push(); d.translate(x, y); d.rotate(a);
        this.p(d, { name: "shared", parts: this.shared }, kind === "open" ? "open" : "fist", 0, 0, { sx: 0.8, sy: 0.8 });
        d.pop();
    }
    cord(d, place, q) {
        const [ax, ay] = place(this.r.hB[0] - 10, this.r.hB[1] - 2), wob = this.cordA * 30 + Math.sin(this.walk * 0.7) * 4;
        const bx = ax - 34 + wob * 0.2, by = -5 + Math.abs(Math.sin(this.walk * 0.4)) * -6, pts = this.hose(d, ax, ay, bx, by, 52, -1, 3, INK, "#26202e", "#4e4358");
        const a = pts[6], b = pts[7];
        d.push(); d.translate(b[0], b[1]); d.rotate(Math.atan2(b[1] - a[1], b[0] - a[0]));
        this.p(d, { name: "shared", parts: this.shared }, "plug", 0, 0, { sx: 0.7, sy: 0.7 });
        d.pop();
    }
    /** All the painted parts and the face. tint is set on the second, additive pass for hit flashes. */
    shell(d, q, tint) {
        const r = this.r, sheet = { name: `f_${this.id}`, parts: this.parts }, id = this.id, t = this.spin, o = tint ? { color: tint } : {};
        const part = (n, x, y, e = {}) => this.p(d, sheet, n, x, y, { ...o, ...e });
        const hinge = (px, py, a, fn) => { d.push(); d.translate(px, py); d.rotate(a); fn(); d.pop(); };
        const [bx, by] = r.body, top = q.top;
        const face = (x = r.face[0], y = r.face[1], sc = r.face[2]) => { if (!tint) this.face(d, q, x, y, sc); };
        if (id === "crumbs") {
            const pop = top * 54;
            part("toast", 13, by - 28 - pop); part("toast", -13, by - 24 - pop * 0.72);
            part("body", bx, by);
            hinge(-49, by - 8 + (top * 18), 0, () => part("lever", 0, 0, { sx: 0.8, sy: 0.8 }));
            face();
            if (!tint) { // Scorched eyebrows of steam: little flames in the slots when the meter is hot.
            }
        } else if (id === "frappe") {
            part("body", bx, by);
            const y = by + 10, w = 26 * Math.abs(Math.cos(t * 1.6)) + 8;
            d.push(); d.translate(0, y); d.scale(Math.max(0.2, Math.cos(t * 1.6)) || 0.2, 1); part("blade", 0, 0); d.pop();
            part("lid", 0, by - 44 - top * 22, { }); 
            face();
        } else if (id === "ristretto") {
            part("body", bx, by);
            part("cups", 0, by - 49 - top * 8 - Math.abs(Math.sin(t * 2)) * q.aux * 5);
            hinge(36, by - 2, 0.1 + top * -0.9 + Math.sin(t) * 0.05, () => part("wand", 0, 0));
            face();
        } else if (id === "whistle") {
            part("body", bx, by);
            part("lid", 0, by - 28 - top * 16 - Math.abs(Math.sin(t * 3)) * q.aux * 4, { });
            face();
        } else if (id === "ding") {
            part("body", bx, by);
            const open = 1 - top * 0.86, px = -52;
            // Hinged door on the left, foreshortened as it swings.
            d.push(); d.translate(px, by); d.scale(Math.max(0.14, open), 1); part("door", 0, 0); d.pop();
            if (top < 0.4 && !tint) { this.face(d, q, r.face[0], r.face[1], r.face[2]); this.p(d, sheet, "monocle", r.face[0] + 17 * r.face[2], r.face[1] - 2, { sx: 0.8, sy: 0.8 }); this.mustache(d, r.face[0], r.face[1] + 13); }
            else if (!tint) { // The cavity looks out when the door swings.
                this.face(d, q, -12, r.face[1], 0.9);
            }
        } else if (id === "chill") {
            part("body", bx, by);
            const open = 1 - top * 0.8;
            d.push(); d.translate(-44, by); d.scale(Math.max(0.2, open), 1); part("door", 44, 0); d.pop();
            part("crown", 0, by - 53);
            if (top < 0.5) face();
            else if (!tint) this.face(d, q, 4, by + 8, 1);
        } else if (id === "knead") {
            part("body", bx, by);
            const tilt = -top * 0.5;
            hinge(-30, by - 40, tilt, () => {
                const b = Math.sin(t * 2);
                d.push(); d.translate(56, 18); d.scale(0.6 + Math.abs(b) * 0.4, 1); part("beater", 0, 0); d.pop();
                part("head", 0, 0);
                part("bow", -22, -33, { sx: 0.8, sy: 0.8 });
                if (!tint) this.face(d, q, r.face[0] + 30, r.face[1] + 40 - by - 0 + by * 0 + (-by + by), r.face[2]);
            });
        } else if (id === "clamp") {
            part("body", bx, by);
            hinge(-50, by - 14, -top * 0.82, () => {
                part("teeth", 0, 4);
                part("top", 0, 2);
                if (!tint) this.face(d, q, 62, -24, r.face[2]);
            });
        }
    }
    mustache(d, x, y) {
        for (const s of [-1, 1]) {
            this.capsule(d, x, y, x + s * 7, y + 2, 3.6, INK); this.capsule(d, x + s * 7, y + 2, x + s * 13, y - 2, 3, INK); this.capsule(d, x + s * 13, y - 2, x + s * 15, y - 6, 2, INK);
        }
    }
    face(d, q, x, y, s) {
        const kind = q.eye, blink = this.blink < 0 && kind === "norm", id = this.id;
        const lash = id === "whistle" || id === "knead";
        d.push(); d.translate(x, y); d.scale(s, s);
        const gap = 11.5, ey = -3, rx = 8.4, ry = kind === "wide" ? 12 : kind === "narrow" ? 7 : 10.6;
        const eye = (sx) => {
            const ex = sx * gap;
            d.push(); d.translate(ex, ey);
            if (kind === "x") {
                this.capsule(d, -6, -6, 6, 6, 3.4, INK); this.capsule(d, -6, 6, 6, -6, 3.4, INK);
            } else if (kind === "joy") {
                for (let i = 0; i < 4; i++) { const a0 = Math.PI + i / 4 * Math.PI, a1 = Math.PI + (i + 1) / 4 * Math.PI; this.capsule(d, Math.cos(a0) * 7, Math.sin(a0) * 7 + 2, Math.cos(a1) * 7, Math.sin(a1) * 7 + 2, 3.2, INK); }
            } else if (blink) {
                this.capsule(d, -7, 1, 7, 1, 3, INK);
            } else {
                d.rect(rx * 2 + 3, ry * 2 + 3, { color: INK, radius: rx + 1.5 });
                d.rect(rx * 2, ry * 2, { color: "#fffdf4", radius: rx });
                // Pie-cut pupil, always watching the other fighter.
                const px = 2.6 + (kind === "wide" ? 0 : 0), py = kind === "fierce" ? 2 : 0.6;
                const pw = kind === "wide" ? 7 : 9.6, ph = kind === "wide" ? 9 : 13;
                d.rect(pw, ph, { x: px, y: py, color: INK, radius: pw / 2 });
                d.rect(2.6, 3.6, { x: px + 1.4, y: py - 3.4, color: "#fffdf4", radius: 1.2 });
                if (kind === "fierce" || kind === "wince" || kind === "narrow" || kind === "wary") {
                    // Upper lid cuts the eye to an angry slant.
                    const tilt = (kind === "wary" ? 0.3 : -0.42) * sx, drop = kind === "wince" ? -1 : kind === "narrow" ? -2 : -5;
                    d.push(); d.translate(0, drop - 8); d.rotate(tilt); d.rect(26, 15, { color: LID[this.id] ?? this.f.def.color, radius: 2 }); d.rect(26, 3.4, { y: 7, color: INK, radius: 1.6 }); d.pop();
                }
            }
            d.pop();
        };
        eye(-1); eye(1);
        if (lash && kind !== "x" && kind !== "joy") for (const sx of [-1, 1]) for (const a of [-0.5, 0, 0.5]) { const bx = sx * gap + sx * 8 * Math.cos(a), by = ey - 8 + Math.sin(a) * 6; this.capsule(d, bx, by, bx + sx * 4.4 * Math.cos(a), by + Math.sin(a) * 4.4 - 1.6, 1.9, INK); }
        if (id === "chill") { this.capsule(d, -19, -16, -5, -11, 5, INK); this.capsule(d, 19, -16, 5, -11, 5, INK); }
        if (id === "ristretto") { for (const sx of [-1, 1]) this.capsule(d, sx * gap - 6, 9, sx * gap + 6, 9, 1.8, "#5b3320"); }
        this.mouth(d, q.mouth, 0, 16);
        d.pop();
    }
    mouth(d, kind, x, y) {
        const arc = (w, h, thick, up = 1) => { let px = -w, py = 0; for (let i = 1; i <= 6; i++) { const k = i / 6, nx = -w + k * 2 * w, ny = Math.sin(k * Math.PI) * h * up; this.capsule(d, x + px, y + py, x + nx, y + ny, thick, INK); px = nx; py = ny; } };
        const open = (w, h, teeth, tongue) => {
            d.rect(w * 2 + 3, h * 2 + 3, { x, y: y + h * 0.5, color: INK, radius: Math.min(w, h) });
            d.rect(w * 2, h * 2, { x, y: y + h * 0.5, color: "#7a1f2b", radius: Math.min(w, h) - 1 });
            if (tongue) d.rect(w * 1.3, h * 0.8, { x, y: y + h * 1.05, color: "#ef6f7c", radius: h * 0.4 });
            if (teeth) d.rect(w * 1.7, Math.min(4, h * 0.6), { x, y: y - h * 0.3 + 1, color: "#fffdf4", radius: 1 });
        };
        switch (kind) {
            case "yell": open(9, 7, true, true); break;
            case "ouch": { let px = -9; for (let i = 1; i <= 5; i++) { const nx = -9 + i * 3.6; this.capsule(d, x + px, y + (i % 2 ? 2 : -1), x + nx, y + (i % 2 ? -1 : 2), 2.6, INK); px = nx; } break; }
            case "grit": d.rect(21, 11, { x, y: y + 1, color: INK, radius: 3 }); d.rect(18, 8, { x, y: y + 1, color: "#fffdf4", radius: 2 }); for (const dx of [-5, 0, 5]) d.rect(1.2, 8, { x: x + dx, y: y + 1, color: INK }); d.rect(18, 1.2, { x, y: y + 1, color: INK }); break;
            case "grin": open(9.5, 5, true, false); break;
            case "o": open(4.5, 5, false, true); break;
            case "tongue": open(7, 3, false, false); d.rect(8, 10, { x: x + 2, y: y + 8, color: "#ef6f7c", radius: 4 }); break;
            case "worry": arc(6.5, 3, 2.6, -1); break;
            case "pant": open(6.5, 4, false, true); break;
            case "smirk": { this.capsule(d, x - 7, y + 1, x + 3, y + 2, 2.6, INK); this.capsule(d, x + 3, y + 2, x + 8, y - 2, 2.6, INK); break; }
            default: arc(7, 2.6, 2.6, 1);
        }
    }
}
