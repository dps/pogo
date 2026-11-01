// Rubber-hose puppets. Sim state goes in, a springy pose comes out, and painted parts are stamped from one sheet. Reactions are
// the point of the whole file: anyone who gets hit must look like the funniest thing that has ever happened to them.
import { C, SKIN } from "./art.js";

const SHIRTS = { kid: "#ff6b5a", tot: "#ffb52e", tray: "#4ea3e8", lobber: "#b26de8", stink: "#7fd05a", big: "#f4f1f6", mini: "#f4f1f6" };
const PANTS = { kid: "#3a4a9a", tot: "#b83a64", tray: "#2c6a6a", lobber: "#4a3a8a", stink: "#6a5a3a", big: "#3a3f62", mini: "#3a3f62" };
export const STAGE_TINT = [
    { kid: "#ff6b5a", tot: "#ffb52e", tray: "#4ea3e8", lobber: "#b26de8", stink: "#7fd05a" },
    { kid: "#ff8ac0", tot: "#ffe05a", tray: "#58c8a8", lobber: "#8a8cf0", stink: "#a4e05a" },
    { kid: "#ffffff", tot: "#ff6b5a", tray: "#ffc52e", lobber: "#6fc8f0", stink: "#a4e05a" },
    { kid: "#e8f4ff", tot: "#c0f0e0", tray: "#ffd0a0", lobber: "#ffa0d0", stink: "#a4e05a" },
    { kid: "#c8a0e0", tot: "#e8c070", tray: "#a06050", lobber: "#70b0a0", stink: "#a4e05a" },
    { kid: "#ff7040", tot: "#ffb030", tray: "#6080e0", lobber: "#e060a0", stink: "#a4e05a" },
];
const FOOD = { kid: ["f_broc", 0, -10], tot: ["f_tot", 0, -8], tray: ["f_broc", 0, -10], lobber: ["f_pud", 0, -8], stink: ["f_cheese", 0, -8], big: ["f_joe", 0, -10], mini: null };
const SHIELD = ["s_tray", "s_tray", "s_mat", "s_clip", "s_book", "s_tray"];

// Local space: feet at the origin, facing +x, y up is negative. Numbers are authored for a Dot-sized body.
export const RIGS = {
    dot: { shoeK: 0.86, k: 1, leg: 38, torso: "dot_torso", sF: [28, -66], sB: [-32, -68], neck: [4, -74], head: "dot_head", hd: [6, -26], eyeY: -4, eyeK: 1, eyes: "dot", mY: 21, mK: 0.72, arm: [11, 16], armC: SKIN[0], legW: [11, 12], legC: "#ffe2c8", shoe: "#fff4dc", hand: SKIN[0], hip: 22, wp: "ladle" },
    pip: { k: 0.84, leg: 42, torso: "pip_torso", sF: [20, -42], sB: [-20, -42], neck: [2, -46], head: "pip_head", hd: [4, -24], eyeY: -2, eyeK: 0.92, eyes: "kid", mY: 16, mK: 0.7, arm: [7, 8], armC: SKIN[1], legW: [7, 7.5], legC: SKIN[1], shoe: "#f0402f", hand: SKIN[1], hip: 13, wp: "paddle" },
    kid: { k: 0.84, leg: 46, torso: "t_kid", sF: [22, -44], sB: [-24, -44], neck: [2, -50], hd: [3, -22], eyeY: -2, eyeK: 0.88, eyes: "kid", mY: 15, mK: 0.72, arm: [7.5, 8.5], legW: [8, 8.5], hip: 14 },
    big: { shoeK: 1.05, k: 1, leg: 46, torso: "t_big", sF: [44, -68], sB: [-46, -68], neck: [2, -92], head: "h_big", hd: [4, -18], eyeY: 0, eyeK: 0.9, eyes: "kid", mY: 22, mK: 0.9, arm: [13, 20], legW: [15, 15], hip: 26 },
};
const FIELDS = ["bx", "by", "lean", "sx", "sy", "hx", "hy", "bhx", "bhy", "fx", "fy", "bfx", "bfy", "wr", "tilt"];
const stance = (R) => ({ bx: 0, by: 0, lean: 0.05, sx: 1, sy: 1, hx: 50, hy: -74, bhx: -44, bhy: -56, fx: 18, fy: 0, bfx: -20, bfy: 0, wr: 0.5, tilt: 0 });

// Attack keys. a: wind-up, b: strike, c: follow-through.
const K = {
    jab: { a: { lean: -0.14, bx: -6, hx: 8, hy: -86, wr: -0.7 }, b: { lean: 0.24, bx: 14, sx: 1.1, sy: 0.92, hx: 80, hy: -80, wr: 1.4, fx: 36, bhx: -56, bhy: -80 }, c: { lean: 0.1, bx: 6, hx: 62, hy: -72, wr: 1.15 } },
    back: { a: { lean: 0.26, bx: 6, hx: -26, hy: -92, wr: -1.9 }, b: { lean: -0.12, bx: 12, hx: 72, hy: -98, wr: 1.8, fx: 34, sx: 1.08, sy: 0.94 }, c: { hx: 50, hy: -82, wr: 2.1 } },
    over: { a: { lean: -0.32, by: -8, sx: 0.92, sy: 1.14, hx: -14, hy: -144, wr: -1.2, bhx: -20, bhy: -116 }, b: { lean: 0.44, by: 12, sx: 1.22, sy: 0.84, hx: 74, hy: -48, wr: 2.3, fx: 42 }, c: { lean: 0.3, by: 8, hx: 66, hy: -40, wr: 2.4 } },
    twirl: { a: { lean: -0.28, bx: -8, hx: -44, hy: -72, wr: -2.3, sx: 0.94, sy: 1.08 }, b: { lean: 0.24, bx: 18, sx: 1.26, sy: 0.84, hx: 86, hy: -72, wr: 1.6, fx: 40, bfx: -40 }, c: { lean: 0.1, hx: 58, hy: -96, wr: 0.2, sx: 1.06 } },
    wallop: { a: { lean: -0.42, bx: -16, sx: 0.92, sy: 1.1, hx: -62, hy: -98, wr: -1.5, fx: 30, bfx: -34 }, b: { lean: 0.42, bx: 24, sx: 1.32, sy: 0.8, hx: 92, hy: -66, wr: 1.57, fx: 48, bfx: -46, bhx: -64, bhy: -78 }, c: { lean: 0.22, bx: 12, hx: 72, hy: -100, wr: 0.8 } },
    scoop: { a: { by: 18, sx: 1.22, sy: 0.74, lean: 0.12, hx: 22, hy: -24, wr: 2.7, fx: 30, bfx: -30 }, b: { by: -14, sy: 1.32, sx: 0.8, lean: -0.18, hx: 46, hy: -152, wr: 0.1, fy: -6 }, c: { by: -4, sy: 1.1, hx: 40, hy: -132, wr: -0.2 } },
    slam: { a: { by: -14, sy: 1.26, sx: 0.86, lean: -0.42, hx: -12, hy: -152, wr: -0.9, bhx: -8, bhy: -130 }, b: { by: 22, sy: 0.68, sx: 1.38, lean: 0.52, hx: 74, hy: -28, wr: 2.7, fx: 40, bfx: -36 }, c: { by: 14, sy: 0.84, sx: 1.16, lean: 0.34, hx: 70, hy: -26, wr: 2.7 } },
    homer: { a: { lean: -0.52, bx: -20, sx: 1.1, sy: 0.96, hx: -70, hy: -88, wr: -1.8, fx: 36, bfx: -30 }, b: { lean: 0.52, bx: 28, sx: 1.36, sy: 0.78, hx: 96, hy: -80, wr: 1.5, fx: 56, bfx: -52, bhx: -66, bhy: -96 }, c: { lean: 0.3, bx: 14, hx: 28, hy: -124, wr: -1.3 } },
    air1: { a: { lean: -0.1, hx: 2, hy: -100, wr: -0.6, fx: 20, fy: -22, bfx: -24, bfy: -30 }, b: { lean: 0.26, sx: 1.08, hx: 74, hy: -70, wr: 1.5, fx: 34, fy: -16, bfx: -24, bfy: -34 }, c: { lean: 0.14, hx: 60, hy: -64, wr: 1.3, fx: 24, fy: -20, bfx: -20, bfy: -30 } },
    air2: { a: { lean: 0.2, hx: -22, hy: -112, wr: -1.7, fx: 16, fy: -30, bfx: -20, bfy: -22 }, b: { lean: -0.1, hx: 72, hy: -102, wr: 1.05, fx: 30, fy: -24, bfx: -34, bfy: -16 }, c: { hx: 56, hy: -90, wr: 1.3, fx: 26, fy: -22, bfx: -26, bfy: -20 } },
    spike: { a: { lean: -0.42, hx: -10, hy: -142, wr: -0.9, sy: 1.14, sx: 0.92, fx: 22, fy: -30, bfx: -18, bfy: -26 }, b: { lean: 0.62, sx: 1.2, sy: 0.86, hx: 72, hy: -28, wr: 2.9, fx: 30, fy: -12, bfx: -40, bfy: -36 }, c: { lean: 0.4, hx: 66, hy: -30, wr: 2.8, fy: -14, fx: 26, bfx: -34, bfy: -30 } },
    slide: { a: { by: 16, lean: 0.46, sy: 0.84, hx: 24, hy: -60, wr: 1.2 }, b: { by: 22, lean: 0.86, sx: 1.2, sy: 0.84, hx: 72, hy: -36, wr: 1.7, fx: 58, fy: -4, bfx: 8, bhx: -60, bhy: -34 }, c: { by: 10, lean: 0.3, hx: 56, hy: -56, wr: 1.2 } },
    tag: { a: { by: 20, sx: 1.2, sy: 0.74, hx: 22, hy: -24, wr: 2.7 }, b: { by: -14, sy: 1.32, sx: 0.8, lean: -0.18, hx: 46, hy: -152, wr: 0.1 }, c: { hx: 40, hy: -132, wr: -0.2 } },
    tray: { a: { lean: -0.22, bx: -6, hx: -14, hy: -96, wr: -1.5 }, b: { lean: 0.26, bx: 14, sx: 1.14, sy: 0.9, hx: 76, hy: -84, wr: 1.6, fx: 36 }, c: { lean: 0.1, hx: 58, hy: -74, wr: 1.3 } },
    mop: { a: { lean: -0.34, bx: -10, hx: -40, hy: -94, wr: -1.9, bhx: -8, bhy: -84, sy: 1.06 }, b: { lean: 0.34, bx: 22, sx: 1.24, sy: 0.86, hx: 68, hy: -64, wr: 1.65, bhx: 36, bhy: -76, fx: 44, bfx: -44 }, c: { lean: 0.2, hx: 44, hy: -96, wr: 0.2 } },
    dump: { a: { lean: -0.2, by: -6, hx: 12, hy: -130, wr: 0, bhx: 6, bhy: -128, sy: 1.12 }, b: { lean: 0.36, bx: 16, hx: 62, hy: -112, wr: 2.5, bhx: 56, bhy: -92, sx: 1.16, sy: 0.9 }, c: { lean: 0.2, hx: 56, hy: -90, wr: 2.2 } },
    punch: { a: { lean: -0.34, bx: -12, sx: 0.92, sy: 1.08, hx: -34, hy: -74, bhx: 30, bhy: -66 }, b: { lean: 0.38, bx: 20, sx: 1.18, sy: 0.9, hx: 84, hy: -74, bhx: -44, bhy: -60, fx: 40, bfx: -34 }, c: { lean: 0.12, hx: 50, hy: -62 } },
    lunge: { a: { by: 16, sy: 0.78, sx: 1.18, lean: -0.24, hx: -26, hy: -48, bhx: -38, bhy: -40 }, b: { lean: 0.76, sx: 1.2, sy: 0.9, hx: 84, hy: -56, bhx: 78, bhy: -38, fx: 26, fy: -20, bfx: -48, bfy: -6 }, c: { lean: 0.2, hx: 40, hy: -50 } },
    bash: { a: { lean: -0.26, bx: -10, sx: 0.94, sy: 1.06 }, b: { lean: 0.34, bx: 22, sx: 1.2, sy: 0.92, fx: 40, bfx: -36 }, c: { lean: 0.1, bx: 6 } },
    lob: { a: { lean: -0.44, bx: -6, hx: -56, hy: -62, bhx: 30, bhy: -86, sy: 1.08, sx: 0.92 }, b: { lean: 0.34, bx: 8, hx: 62, hy: -122, sx: 1.12, sy: 0.92, fx: 34 }, c: { lean: 0.1, hx: 44, hy: -90 } },
    swell: { a: { sx: 1.3, sy: 1.22, hx: 50, hy: -86, bhx: -50, bhy: -84, lean: -0.06 }, b: { sx: 1.5, sy: 1.4 }, c: {} },
    bslam: { a: { lean: -0.34, by: -8, sy: 1.2, sx: 0.9, hx: -8, hy: -176, bhx: 14, bhy: -176 }, b: { lean: 0.52, by: 18, sy: 0.74, sx: 1.3, hx: 92, hy: -24, bhx: 78, bhy: -24, fx: 46, bfx: -42 }, c: { lean: 0.3, by: 12, hx: 86, hy: -22, bhx: 72, bhy: -22 } },
};
const ATK_ANIM = { slam: "bslam" };
const HURT = [
    { lean: -0.56, bx: -10, hx: -46, hy: -118, bhx: -74, bhy: -82, sx: 0.9, sy: 1.08, tilt: -0.5, fx: 26, bfx: -12 },
    { lean: 0.5, by: 12, hx: 22, hy: -40, bhx: 8, bhy: -34, sx: 1.14, sy: 0.82, tilt: 0.34, fx: 22, bfx: -22 },
    { lean: -0.3, bx: -6, hx: 58, hy: -116, bhx: -60, bhy: -118, sx: 0.88, sy: 1.1, tilt: 0.3, fx: 34, bfx: -8 },
];
const AIR = { hx: 56, hy: -102, bhx: -62, bhy: -96, fx: 30, fy: -14, bfx: -32, bfy: -8 };
const JUMP = { hx: 40, hy: -112, bhx: -46, bhy: -84, fx: 24, fy: -22, bfx: -24, bfy: -6, wr: 1.1, lean: 0.08, sy: 1.08, sx: 0.94 };

export class Puppet {
    constructor(a, kind, stage = 0) {
        this.a = a; this.kind = kind; this.R = RIGS[kind === "dot" || kind === "pip" ? kind : kind === "big" ? "big" : "kid"];
        this.q = stance(this.R); this.spin = 0; this.walk = 0; this.blink = 90; this.k = this.R.k * (kind === "tot" ? 0.86 : kind === "tray" ? 1.04 : 1);
        this.stage = stage; this.shirt = STAGE_TINT[stage]?.[kind] ?? SHIRTS[kind] ?? "#fff"; this.pants = PANTS[kind] ?? "#333"; this.jolt = 0; this.head = ["h0", "h1", "h2", "h3"][a.variant ?? 0]; this.skin = SKIN[[1, 0, 2, 3][a.variant ?? 0]];
        this.eye = "mad"; this.mouth = "flat"; this.food = 1; this.foodVy = 0; this.foodY = 0; this.stretch = 0; this.prevSt = ""; this.wob = 0;
    }
    target() {
        const a = this.a, R = this.R, s = stance(R), hero = !!a.hero; let t = { ...s }, rate = 0.3, eye = hero ? "norm" : "poss", mouth = hero ? "lip" : "snarl", spinT = 0, spinK = 0.3;
        const set = (o) => Object.assign(t, o);
        const atkKeys = (anim, ph) => { const k = K[anim]; if (!k) return; set(k[ph]); };
        switch (a.st) {
            case "idle": case "land": case "move": case "spawn": {
                const moving = hero ? a.moving : a.moving || a.st === "spawn";
                if (moving) {
                    this.walk += hero ? 0.26 : 0.2;
                    const w = this.walk, sw = Math.sin(w), cs = Math.cos(w);
                    set({ fx: 16 + sw * 26, fy: -Math.max(0, cs) * 12, bfx: -18 - sw * 26, bfy: -Math.max(0, -cs) * 12, by: -Math.abs(cs) * 5, lean: 0.14, hx: 46 + (hero ? 0 : cs * 22), hy: -72, bhx: -40 - cs * 16, bhy: -60, sy: 1 + Math.abs(sw) * 0.03 });
                } else {
                    const b = Math.sin(performance_t() * 0.07 + (a.id ?? 0));
                    set({ by: 2 + b * 2.4, sy: 1 - b * 0.018, sx: 1 + b * 0.018 });
                }
                if (a.st === "land") set({ by: 14, sx: 1.2, sy: 0.82 });
                rate = 0.32; break;
            }
            case "jump": set(JUMP); if ((a.vy ?? 0) < -200) set({ fy: -10, bfy: -2, hy: -120, bhy: -112 }); rate = 0.3; break;
            case "chase": set(K.scoop.b); spinT = 0; rate = 0.5; break;
            case "atk": {
                const m = a.mv; if (!m) break;
                const ph = a.t <= m.st ? "a" : a.t <= m.st + m.ac ? "b" : "c";
                atkKeys(m.anim, ph);
                if (ph === "a") { eye = "mad"; mouth = "grit"; } else { eye = "mad"; mouth = "yell"; }
                rate = ph === "b" ? 0.85 : ph === "a" ? 0.5 : 0.3;
                if (m.anim === "twirl" && ph === "b") this.spin += 0;
                break;
            }
            case "dodge": set({ by: 20, sx: 1.16, sy: 0.74, lean: 0.5 * (Math.sign(a.vx || 1) * a.face), hx: 30, hy: -46, bhx: -20, bhy: -40, fx: 26, bfx: -26 }); eye = "mad"; mouth = "grin"; spinT = 0; rate = 0.5; break;
            case "hurt": set(HURT[0]); eye = "hurt"; mouth = "ouch"; rate = 0.7; break;
            case "kd": set(AIR); eye = "hurt"; mouth = "yell"; spinT = -a.face * 1.3; rate = 0.5; break;
            case "down": set({ hx: 30, hy: -60, bhx: -40, bhy: -40, fx: 30, bfx: -14, by: 0 }); eye = "hurt"; mouth = "ouch"; spinT = -a.face * 1.5; rate = 0.4; break;
            case "wake": set({ by: 26, sx: 1.2, sy: 0.74, hx: 40, hy: -30, bhx: -30, bhy: -30 }); eye = "norm"; mouth = "flat"; rate = 0.3; break;
            case "grab": set({ lean: 0.08, hx: 70, hy: -96, bhx: 58, bhy: -70, wr: 1.9 }); eye = "mad"; mouth = "grin"; if (a.bonkT > a.t) set({ hy: -48, wr: 2.4, lean: 0.24 }); rate = 0.5; break;
            case "throw": set(K.wallop.b); eye = "mad"; mouth = "yell"; rate = 0.8; break;
            case "special": { set(a.t < 14 ? K.slam.a : K.slam.b); eye = "mad"; mouth = "yell"; rate = 0.5; break; }
            case "tagin": set(JUMP); set({ lean: 0.5 }); eye = "mad"; mouth = "yell"; break;
            case "ko": set(AIR); eye = "dizzy"; mouth = "ouch"; spinT = -a.face * 1.5; rate = 0.4; break;
            // Enemies.
            case "tel": { const an = ATK_ANIM[a.atk.anim] ?? a.atk.anim; atkKeys(an, "a"); eye = "poss"; mouth = "yell"; rate = 0.16; const sh = Math.min(1, a.t / a.atk.tel); t.bx += (Math.floor(a.t / 3) % 2 ? 1 : -1) * sh * 1.6; break; }
            case "atk2": break;
            case "rec": { const an = ATK_ANIM[a.atk.anim] ?? a.atk.anim; atkKeys(an, "c"); eye = "poss"; mouth = "flat"; rate = 0.2; break; }
            case "hit": set(HURT[a.hurtPose ?? 0]); eye = "hurt"; mouth = "ouch"; rate = 0.8; break;
            case "dizzy": { const w = Math.sin(a.t * 0.14); set({ lean: w * 0.2, bx: w * 6, hx: 30 + w * 20, hy: -36, bhx: -30 + w * 20, bhy: -36, by: 4 }); eye = "dizzy"; mouth = "tongue"; rate = 0.3; break; }
            case "air": set(a.vy > 200 ? { ...AIR, hy: -50, bhy: -40, fy: 6, bfy: 10, sx: 0.9, sy: 1.14, lean: -0.2 } : { ...AIR, hy: -130, bhy: -128, fy: -30, bfy: -36, sx: 1.06, sy: 0.96 }); eye = a.hp <= 0 ? "dizzy" : "wide"; mouth = "yell"; rate = 0.4; spinK = -1; break;
            case "fly": case "thrown": set({ hx: 70, hy: -70, bhx: 60, bhy: -50, fx: -38, fy: -60, bfx: -46, bfy: -40, sx: 1.2, sy: 0.84, lean: -0.1 }); eye = "wide"; mouth = "yell"; rate = 0.5; spinK = a.st === "thrown" ? -2 : -1.5; break;
            case "down2": break;
            case "getup": set({ by: 26, sx: 1.2, sy: 0.74, hx: 40, hy: -30, bhx: -30, bhy: -30 }); eye = "hurt"; mouth = "flat"; rate = 0.3; break;
            case "held": { const w = Math.sin(a.t * 0.5); set({ hx: -30, hy: -96, bhx: 40, bhy: -100, fx: 16 + w * 26, fy: -6, bfx: -14 - w * 26, bfy: -6, sy: 1.12, sx: 0.92 }); eye = "wide"; mouth = "yell"; rate = 0.5; break; }
            case "ko2": break;
        }
        if (a.st === "down" && !hero) { set({ hx: 20, hy: -50, bhx: -30, bhy: -30, fx: 34, fy: -4, bfx: -16, bfy: -4 }); eye = a.hp <= 0 ? "dizzy" : "hurt"; mouth = "tongue"; spinT = -a.face * 1.5; rate = 0.5; }
        if (a.st === "ko") {
            if (a.t < 90) { const w = Math.sin(a.t * 0.2); set({ by: 28, sx: 1.16, sy: 0.72, lean: w * 0.08, hx: 40, hy: -18, bhx: -40, bhy: -18, fx: 44, bfx: 24 }); eye = "dizzy"; mouth = "tongue"; }
            else { this.walk += 0.46; const w = this.walk, sw = Math.sin(w), cs = Math.cos(w); set({ fx: 16 + sw * 34, fy: -Math.max(0, cs) * 18, bfx: -18 - sw * 34, bfy: -Math.max(0, -cs) * 18, by: -Math.abs(cs) * 10, lean: 0.2, hx: 40 + sw * 12, hy: -140, bhx: -40 - sw * 12, bhy: -138 }); eye = "happy"; mouth = "grin"; }
            spinT = 0; rate = 0.4;
        }
        return { t, rate, eye, mouth, spinT, spinK };
    }
    /** Once per sim step. */
    update() {
        const a = this.a, { t, rate, eye, mouth, spinT, spinK } = this.target(), q = this.q;
        for (const f of FIELDS) q[f] += (t[f] - q[f]) * rate;
        this.eye = eye; this.mouth = mouth;
        if (spinK < 0) this.spin += spinK * -0.22 * (a.face ?? 1) * -1;
        else { this.spin = wrap(this.spin); this.spin += (spinT - this.spin) * spinK; }
        // The parasite is shaken loose on a KO and flies off; the view makes the fuss.
        if (--this.blink < -6) this.blink = 60 + ((a.id ?? 1) * 37) % 140;
        this.foodY += this.foodVy; this.foodVy = (this.foodVy - this.foodY * 0.18) * 0.78;
        if (a.flash > 6) this.foodVy -= 1.6;
        this.prevSt = a.st;
    }
}
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
let clock = 0;
export const tickClock = () => { clock++; };
const performance_t = () => clock;

/** Stamps parts from the sheet. */
export class Stamp {
    constructor(parts, sheet = "cast") { this.p = parts; this.s = sheet; }
    part(d, name, x, y, o = {}) {
        const p = this.p[name]; if (!p) throw new Error(`No part ${name}`);
        const r = o.rot ?? 0, sx = o.sx ?? 1, sy = o.sy ?? sx;
        d.push(); d.translate(x, y); if (r) d.rotate(r); if (sx !== 1 || sy !== 1) d.scale(sx, sy);
        d.sprite(this.s, { crop: p.crop, x: p.cx, y: p.cy, width: p.w, height: p.h, color: o.color, opacity: o.opacity });
        d.pop();
    }
    /** A plain capsule between two points, in any tint. */
    bar(d, x0, y0, x1, y1, w, color, opacity) {
        const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy); if (l < 0.01) return;
        const p = this.p.bar;
        d.push(); d.translate((x0 + x1) / 2, (y0 + y1) / 2); d.rotate(Math.atan2(dy, dx));
        d.sprite(this.s, { crop: [p.crop[0] + 2, p.crop[1] + 2, p.crop[2] - 4, p.crop[3] - 4], width: l, height: w, color, opacity });
        d.pop();
    }
    dot(d, x, y, r, color, opacity) { const p = this.p.disc; d.sprite(this.s, { crop: p.crop, x, y, width: r * 2.105, height: r * 2.105, color, opacity }); }
    /** A noodle: a bent hose through a control point, in two passes so it reads as one inked tube. */
    hose(d, ax, ay, bx, by, bend, w0, w1, col, ink = C.ink) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, cx = mx - dy * bend, cy = my + dx * bend, N = 3;
        for (let pass = 0; pass < 2; pass++) {
            const extra = pass ? 0 : 4.4, c = pass ? col : ink;
            let px = ax, py = ay;
            for (let i = 1; i <= N; i++) {
                const t = i / N, u = 1 - t, x = u * u * ax + 2 * u * t * cx + t * t * bx, y = u * u * ay + 2 * u * t * cy + t * t * by, w = w0 + (w1 - w0) * t + extra;
                this.bar(d, px, py, x, y, w, c);
                this.dot(d, x, y, w / 2, c);
                if (i === 1) this.dot(d, px, py, (w0 + extra) / 2, c);
                px = x; py = y;
            }
        }
    }
}

/** Draw a puppet at screen (x, y), `k` units to the world unit. */
export function drawPuppet(d, st, pup, x, y, k, o = {}) {
    const a = pup.a, q = pup.q, R = pup.R, hero = !!a.hero, S = pup.k * k, face = a.face ?? 1;
    const flash = o.flash ?? 0;
    const jx = a.flash > 4 ? (a.flash % 2 ? 2 : -2) * k : 0;
    d.push(); d.translate(x + jx, y);
    const spin = pup.spin;
    if (spin) { d.translate(0, -56 * S); d.rotate(spin); d.translate(0, 56 * S); }
    d.scale(S * face, S);
    const col = o.color;
    const legHipY = -R.leg + q.by, hipX = q.bx;
    const L = q.lean, cl = Math.cos(L), sl = Math.sin(L);
    // A point on the leaning, squashing torso.
    const onBody = (px, py) => { const X = px * q.sx, Y = py * q.sy; return [hipX + X * cl - Y * sl, legHipY + X * sl + Y * cl]; };
    const skin = hero ? R.armC : pup.skin, arm = col ?? skin, handC = col ?? (hero ? R.hand : pup.skin), legC = col ?? (hero ? R.legC : pup.pants), shoeC = col ?? (hero ? R.shoe : a.type === "tot" ? "#ffe05a" : "#f4f1f6");
    const ink = col ?? C.ink;
    // Back arm, then legs, torso, head, front arm.
    const sB = onBody(R.sB[0], R.sB[1]);
    st.hose(d, sB[0], sB[1], q.bhx, q.bhy, -0.14, R.arm[0], R.arm[1] * 0.9, arm, ink);
    st.part(d, "hand", q.bhx, q.bhy, { sx: 0.9, color: handC });
    const hipB = [hipX - R.hip * 0.7, legHipY + 2], hipF = [hipX + R.hip * 0.7, legHipY + 2];
    st.hose(d, hipB[0], hipB[1], q.bfx, q.bfy - 8, -0.1, R.legW[0], R.legW[1], legC, ink);
    st.part(d, "shoe", q.bfx, q.bfy, { sx: R.shoeK ?? 0.72, color: shoeC, rot: q.bfy < -6 ? -0.5 : 0 });
    st.hose(d, hipF[0], hipF[1], q.fx, q.fy - 8, 0.1, R.legW[0], R.legW[1], legC, ink);
    st.part(d, "shoe", q.fx, q.fy, { sx: R.shoeK ?? 0.72, color: shoeC, rot: q.fy < -6 ? -0.5 : 0 });
    st.part(d, R.torso, hipX, legHipY, { rot: L, sx: q.sx, sy: q.sy, color: col ?? (hero ? undefined : pup.shirt) });
    const [nx, ny] = onBody(R.neck[0], R.neck[1]);
    const hk = 1 / Math.max(0.8, Math.min(1.25, q.sy)) * 0.5 + 0.5, hr = L * 0.6 + q.tilt, chr = Math.cos(hr), shr = Math.sin(hr);
    const hx = nx + R.hd[0] * chr - R.hd[1] * shr, hy = ny + R.hd[0] * shr + R.hd[1] * chr;
    const headName = R.head ?? pup.head;
    st.part(d, headName, hx, hy, { rot: hr, color: col, sx: hk });
    if (!col) {
        d.push(); d.translate(hx, hy); d.rotate(hr);
        drawFace(d, st, pup, R);
        d.pop();
    }
    // The parasite: still attached until the student is free.
    if (!hero && a.st !== "ko" && !(a.hp <= 0 && a.st === "down")) {
        const f = FOOD[pup.kind];
        if (f) {
            const hTop = pup.kind === "big" ? -24 : -22, wig = a.st === "tel" ? Math.sin(a.t * 0.9) * 0.16 : Math.sin(clock * 0.06 + a.id) * 0.05;
            st.part(d, f[0], hx + hTop * -shr * 1.1, hy + (hTop + pup.foodY * 2) * chr, { rot: hr + wig, sx: 1 - pup.foodY * 0.02, sy: 1 + pup.foodY * 0.03, color: col });
        }
    }
    // Weapon behind the fist.
    const wp = a.wp?.type, sprite = hero ? (wp ? { tray: "w_tray", mop: "w_mop", custard: "w_custard" }[wp] : R.wp) : null;
    if (sprite) st.part(d, sprite, q.hx, q.hy, { rot: q.wr, color: col, sx: a.key === "pip" ? 1.05 : 1 });
    if (a.type === "tray" && a.shield > 0 && !col) { /* shield comes after the arm */ }
    const sF = onBody(R.sF[0], R.sF[1]);
    st.hose(d, sF[0], sF[1], q.hx, q.hy, 0.14, R.arm[0], R.arm[1], arm, ink);
    st.part(d, a.st === "held" || a.st === "air" || a.st === "fly" || a.st === "thrown" ? "hand_open" : "hand", q.hx, q.hy, { sx: R.arm[1] > 14 ? 1.25 : 0.95, color: handC, rot: q.wr * 0.5 });
    if (a.type === "tray" && a.shield > 0) {
        const lift = a.st === "tel" ? -6 : 0;
        st.part(d, SHIELD[pup.stage] ?? "s_tray", 44 + (q.bx * 0.8), -58 + lift + q.by, { rot: q.lean * 0.6, color: col, sx: 0.92 });
    }
    if (a.type === "lobber" && (a.st === "tel")) st.part(d, "p_peas", q.hx, q.hy - 10, { color: col, sx: 0.9 });
    d.pop();
}
function drawFace(d, st, pup, R) {
    const blink = pup.blink < 0 && (pup.eye === "norm" || pup.eye === "poss" || pup.eye === "mad");
    let eye = pup.eye, m = pup.mouth;
    if (R.eyes === "dot") {
        const map = { norm: "de_norm", mad: "de_mad", hurt: "de_hurt", dizzy: "de_hurt", happy: "de_happy", wide: "de_norm", poss: "de_mad" };
        st.part(d, map[eye] ?? "de_norm", 2, R.eyeY, { sx: R.eyeK });
        const mm = { lip: "m_lip", grit: "m_snarl", yell: "m_yell", ouch: "m_ouch", grin: "m_grin", flat: "m_flat", tongue: "m_tongue", snarl: "m_snarl" };
        st.part(d, mm[m] ?? "m_lip", 4, R.mY, { sx: R.mK * (m === "yell" ? 1.1 : 1) });
        return;
    }
    const map = { norm: "e_wide", mad: "e_mad", poss: "e_poss", hurt: "e_hurt", dizzy: "e_dizzy", happy: "e_happy", wide: "e_wide" };
    st.part(d, blink ? "e_shut" : map[eye] ?? "e_mad", 2, R.eyeY, { sx: R.eyeK });
    const mm = { lip: "m_grin", grit: "m_snarl", yell: "m_yell", ouch: "m_ouch", grin: "m_grin", flat: "m_flat", tongue: "m_tongue", snarl: "m_snarl" };
    st.part(d, mm[m] ?? "m_flat", 3, R.mY, { sx: R.mK });
}
