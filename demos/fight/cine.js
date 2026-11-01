// Super cinematics. The sim holds both fighters while one of these plays; the hits inside it are real frames from the
// move's data, so damage lands exactly on the visual beat. Each fighter has its own short film.
const FONT = '"Arial Black","Arial Rounded MT Bold",Impact,system-ui,sans-serif';
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const out = (k) => 1 - (1 - k) * (1 - k);
const inn = (k) => k * k;
const back = (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

/** Radial speed lines, the universal language of a big moment. */
function speedlines(d, cx, cy, R, n, t, color, op = 0.5) {
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + Math.sin(i * 7.3) * 0.2, sp = (Math.sin(i * 12.9) * 0.5 + 0.5), w = 2 + sp * 6, r0 = R * (0.45 + ((t * (0.012 + sp * 0.01) + sp) % 1) * 0.35);
        d.poly([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a + 0.02) * R * 1.3 - Math.sin(a) * w, cy + Math.sin(a + 0.02) * R * 1.3 + Math.cos(a) * w], [cx + Math.cos(a) * R * 1.3 + Math.sin(a) * w, cy + Math.sin(a) * R * 1.3 - Math.cos(a) * w]], { color, opacity: op });
    }
}
function giantText(d, str, x, y, size, color, o = {}) {
    d.text(str, { x: x + size * 0.06, y: y + size * 0.07, size, bold: true, font: FONT, color: "#241a2c", rot: o.rot });
    d.text(str, { x, y, size, bold: true, font: FONT, color, rot: o.rot });
}
function bigToast(d, x, y, s, rot = 0, burnt = 0) {
    d.push(); d.translate(x, y); d.rotate(rot); d.scale(s, s);
    d.rect(120, 104, { y: 12, color: "#241a2c", radius: 22 }); d.circle(35, { x: -36, y: -38, color: "#241a2c" }); d.circle(35, { x: 36, y: -38, color: "#241a2c" });
    d.rect(112, 96, { y: 12, color: burnt ? "#3b2214" : "#a9662e", radius: 20 }); d.circle(31, { x: -36, y: -38, color: burnt ? "#3b2214" : "#a9662e" }); d.circle(31, { x: 36, y: -38, color: burnt ? "#3b2214" : "#a9662e" });
    d.rect(94, 80, { y: 14, color: burnt ? "#5a331c" : "#f2c674", radius: 14 }); d.circle(24, { x: -32, y: -32, color: burnt ? "#5a331c" : "#f2c674" }); d.circle(24, { x: 32, y: -32, color: burnt ? "#5a331c" : "#f2c674" });
    for (const [a, b] of [[-20, -20], [14, 0], [-30, 22], [26, 30], [0, 34], [28, -30]]) d.circle(3.4, { x: a, y: b, color: burnt ? "#2c170b" : "#c9934a" });
    d.pop();
}
function iceBlock(d, x, y, w, h, op = 1) {
    d.rect(w + 6, h + 6, { x, y, color: "#241a2c", radius: 12, opacity: op });
    d.rect(w, h, { x, y, color: "#bfeeff", radius: 10, opacity: 0.72 * op });
    d.rect(w * 0.84, h * 0.84, { x: x - w * 0.03, y: y - h * 0.03, color: "#ffffff", radius: 8, opacity: 0.16 * op });
    d.line([x - w * 0.36, y - h * 0.1], [x - w * 0.12, y - h * 0.36], { width: 4, color: "#ffffff", opacity: 0.8 * op });
}
function waffle(d, x, y, w, h, col, grid, a) {
    d.rect(w + 8, h + 8, { x, y, color: "#241a2c", radius: 16 });
    d.rect(w, h, { x, y, color: col, radius: 12 });
    const n = 6, cw = w / n, ch = h / 4;
    for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) d.rect(cw - 10, ch - 10, { x: x - w / 2 + cw * (i + 0.5), y: y - h / 2 + ch * (j + 0.5), color: grid, radius: 4 });
}

const FILMS = {
    crumbs: {
        tint: "#3a1006", film(c) {
            const t = c.t, f = c.face, leave = out(seg(t, 4, 26));
            c.atk.y = -420 * leave;
            c.def.eye = true;
            c.cam(1.28, 0, -80 - 30 * seg(t, 20, 100));
        },
        over(d, c) {
            const { W, H, t } = c, fx = c.toView(c.foe.x, -60);
            speedlines(d, fx.x, fx.y, W, 18, t, "#ffb65c", 0.16 + seg(t, 90, 130) * 0.2);
            // Toast rain: one slice for each real hit, plus crumbs.
            for (let i = 0; i < 4; i++) {
                const at = [38, 62, 84, 106][i], k = seg(t, at - 16, at);
                if (t > at - 16 && t < at + 24) { const s = (0.55 + i * 0.08) * c.S; if (t < at) bigToast(d, fx.x + (i % 2 ? 26 : -26) * c.S, lerp(-120, fx.y, inn(k)), s, i - 1 + k * 3, 0); }
            }
            if (t >= 106 && t < 150) {
                const k = inn(seg(t, 110, 138)), hold = seg(t, 138, 150), s = (2.6 + k * 0.9) * c.S;
                bigToast(d, W / 2 + Math.sin(t * 0.8) * 2, lerp(-H * 1.1, H * 0.54, k), s, 0.06, 1);
            }
            if (t >= 138 && t < 170) { const k = seg(t, 138, 170); bigToast(d, W / 2, H * 0.54 - k * H * 1.3, 3.4 * c.S, 0.06 + k * 0.5, 1); giantText(d, "BURNT!", W / 2, H * 0.44, 62 * c.S * back(seg(t, 138, 150)), "#ffc23c", { rot: -0.08 }); }
        },
    },
    frappe: {
        tint: "#0d3a44", film(c) {
            const t = c.t, f = c.face;
            const spin = t * (0.12 + seg(t, 0, 140) * 0.36), r = lerp(120, 30, seg(t, 10, 130));
            c.atk.x = c.mid + Math.cos(spin) * 0; c.atk.y = 0; c.atk.scale = 1 + seg(t, 0, 40) * 0.5; c.atk.top = 1; c.atk.spin = 1;
            c.def.x = c.mid + Math.cos(spin) * r; c.def.y = -130 + Math.sin(spin * 1.3) * 90; c.def.rot = spin; c.def.scale = 0.9;
            c.def.behind = Math.sin(spin) < 0;
            c.angle = Math.sin(t * 0.16) * 0.1 * seg(t, 20, 60) * (1 - seg(t, 140, 158));
            c.cam(1.3, c.mid, -110);
            if (t >= 144) { c.def.y = lerp(-130, -440, seg(t, 144, 160)); }
        },
        over(d, c) {
            const { W, H, t } = c, cx = W / 2, cy = H * 0.5;
            // The whole picture becomes a spiral of smoothie.
            const op = 0.34 * seg(t, 0, 30) * (1 - seg(t, 150, 170));
            for (let i = 0; i < 26; i++) {
                const a = i * 0.8 + t * 0.2, r = (i * 15 + t * 3) % (W * 0.86);
                d.circle(10 + r * 0.07, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.74, color: i % 3 ? "#f05f9b" : "#30d0e0", opacity: op * 1.6 });
            }
            speedlines(d, cx, cy, W, 22, t * 2, "#fff", 0.14 + seg(t, 100, 144) * 0.14);
            if (t >= 144) {
                const k = out(seg(t, 144, 158)), o = 1 - seg(t, 158, 176);
                for (let i = 0; i < 14; i++) { const a = i * 0.45, r = k * W * (0.5 + (i % 3) * 0.16); d.circle((30 + (i % 4) * 16) * c.S, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8, color: i % 2 ? "#f05f9b" : "#ff9fc4", opacity: o }); }
                giantText(d, "PURÉE!", cx, cy, 58 * c.S * back(seg(t, 144, 156)), "#ff9fc4", { rot: 0.06 });
            }
        },
    },
    ristretto: {
        tint: "#23110a", film(c) {
            const t = c.t;
            // Time stops: he blurs from side to side and the foe doesn't even flinch until it's over.
            const hit = t >= 20 && t < 104;
            c.atk.x = hit ? c.foe.x + Math.sin(t * 1.2) * 100 : lerp(c.atk.x0, c.foe.x - c.face * 60, seg(t, 0, 20));
            c.atk.blur = hit; c.atk.y = hit ? -Math.abs(Math.cos(t * 0.8)) * 70 : 0;
            c.def.still = t < 112; c.def.y = t > 112 ? -out(seg(t, 112, 130)) * 150 : 0; c.def.rot = t > 112 ? seg(t, 112, 170) * 6 : 0;
            c.cam(1.42, c.foe.x, -70);
        },
        over(d, c) {
            const { W, H, t } = c, fx = c.toView(c.foe.x, -60);
            d.rect(W, H, { x: W / 2, y: H / 2, color: "#3b2214", opacity: 0.32 * (1 - seg(t, 120, 134)) });
            if (t > 18 && t < 104) for (let i = 0; i < 3; i++) { const a = t * 2.4 + i * 2.1; d.line([fx.x - Math.cos(a) * W, fx.y - Math.sin(a) * 90 * c.S], [fx.x + Math.cos(a) * W, fx.y + Math.sin(a) * 90 * c.S], { width: (6 - i * 1.5) * c.S, color: i ? "#ffe08a" : "#ffffff", opacity: 0.7 }); }
            if (t >= 112) {
                // A wall of espresso rises and swallows the kitchen.
                const k = inn(seg(t, 112, 134)), fall = seg(t, 150, 170), y = lerp(H * 1.1, H * 0.1, k) + fall * H;
                for (let i = -1; i < 9; i++) d.circle(40 * c.S, { x: i * W / 8 + (t * 3) % (W / 8), y: y + Math.sin(i * 2 + t * 0.2) * 8, color: "#3b2214" });
                d.rect(W, H * 1.3, { x: W / 2, y: y + H * 0.66, color: "#3b2214" });
                for (let i = 0; i < 7; i++) d.circle((10 + i * 4) * c.S, { x: W * (0.1 + i * 0.14), y: y + 50 + i * 12, color: "#d9a46a", opacity: 0.8 });
                if (t >= 130) giantText(d, "DOUBLE SHOT", W / 2, H * 0.42, 40 * c.S * back(seg(t, 130, 142)), "#ffe08a", { rot: -0.05 });
            }
        },
    },
    whistle: {
        tint: "#2a0b2c", film(c) {
            const t = c.t, boil = seg(t, 0, 140), shake = boil * boil * 5;
            c.atk.scale = 1 + boil * 0.9; c.atk.top = 1; c.atk.spin = 1; c.atk.y = -Math.abs(Math.sin(t * 0.6)) * boil * 6;
            c.atk.x = c.atk.x0 + Math.sin(t * 1.9) * shake;
            c.def.y = t >= 146 ? -out(seg(t, 146, 170)) * 460 : 0; c.def.rot = seg(t, 60, 170) * 7; c.def.x = c.foe.x + c.face * seg(t, 30, 140) * 30;
            c.cam(1.2 + boil * 0.2, c.atk.x0 + c.face * 90, -100);
        },
        over(d, c) {
            const { W, H, t } = c, sp = c.toView(c.atk.x0 + c.face * 70, -130);
            for (let i = 0; i < 6; i++) { const k = ((t * 0.018 + i / 6) % 1), r = k * W * 1.1; if (t > 30) d.circle(r, { x: sp.x, y: sp.y, color: "#ffcfe1", outline: (5 + 8 * (1 - k)) * c.S, opacity: (1 - k) * 0.6 * seg(t, 30, 60) }); }
            if (t > 40) { const m = seg(t, 40, 146); d.rect(W, H, { x: W / 2, y: H / 2, color: "#ff3c5a", opacity: 0.14 * m }); }
            if (t >= 146) {
                const k = out(seg(t, 146, 160)), o = 1 - seg(t, 164, 176), cx = c.toView(c.foe.x, 0).x;
                for (let i = 0; i < 20; i++) { const y = H - (i / 20) * H * 1.2 * k, w = (W * (0.2 + i * 0.012)) + Math.sin(i + t * 0.6) * 18 * c.S; d.circle(w * 0.5, { x: cx + Math.sin(i * 1.7 + t * 0.3) * 20 * c.S, y, color: i % 3 ? "#ffffff" : "#ffd6e6", opacity: o * 0.92 }); }
                giantText(d, "FULL BOIL", W / 2, H * 0.42, 50 * c.S * back(seg(t, 146, 158)), "#7d6bd6");
            }
        },
    },
    ding: {
        tint: "#0c2a18", film(c) {
            const t = c.t, f = c.face, suck = seg(t, 14, 46), closed = t > 50;
            c.atk.top = t < 50 ? 1 : t < 148 ? 0 : 1;
            c.atk.scale = 1 + seg(t, 0, 50) * 0.75 + (t >= 148 ? -seg(t, 148, 170) * 0.2 : 0);
            c.atk.x = c.atk.x0 + (t > 50 && t < 150 ? Math.sin(t * 2.3) * (1 + seg(t, 60, 150) * 3) : 0);
            c.atk.y = 0;
            c.atk.mid = true;
            c.def.x = lerp(c.foe.x, c.atk.x0, suck); c.def.y = -suck * 70; c.def.scale = 1 - suck * 0.6; c.def.rot = suck * 8; c.def.hide = t >= 48 && t < 156; c.def.behind = false;
            if (t >= 156) { c.def.x = c.atk.x0 + c.face * out(seg(t, 156, 176)) * 120; c.def.y = -out(seg(t, 156, 176)) * 240; c.def.scale = 1; c.def.rot = t * 0.3; }
            c.cam(1.34, c.atk.x0 + c.face * 30, -90);
        },
        over(d, c) {
            const { W, H, t } = c;
            if (t >= 52 && t < 150) {
                const secs = 3 - Math.floor((t - 52) / 33), p = c.toView(c.atk.x0, -80);
                const box = W * 0.62;
                d.rect(box + 10, box * 0.42 + 10, { x: W / 2, y: H * 0.27, color: "#241a2c", radius: 12 });
                d.rect(box, box * 0.42, { x: W / 2, y: H * 0.27, color: "#10281a", radius: 8 });
                d.text(`0:0${Math.max(0, secs)}`, { x: W / 2, y: H * 0.27, size: 58 * c.S, bold: true, font: '"Courier New",ui-monospace,monospace', color: "#73ffb0" });
                d.additive(() => d.circle(W * 0.3, { x: p.x, y: p.y, color: "#ffe9a0", opacity: 0.1 + Math.sin(t * 0.4) * 0.05 }));
                for (let i = 0; i < 16; i++) { const k = (t * 0.04 + i * 0.13) % 1; if (t > 80) d.sprite("shared", c.kernel({ x: p.x + Math.cos(i * 2.4) * 60 * c.S * k, y: p.y + Math.sin(i * 1.9) * 40 * c.S * k, size: 16 * c.S })); }
            }
            if (t >= 150) {
                const k = seg(t, 150, 160), g = out(seg(t, 156, 172)), p = c.toView(c.atk.x0, -90), o = 1 - seg(t, 174, 186);
                if (t < 158) giantText(d, "DING!", W / 2, H * 0.3, 74 * c.S * back(k), "#ffd14a");
                // Popcorn mushroom cloud.
                d.rect(90 * c.S * g, H * g, { x: p.x, y: p.y - H * 0.2 * g, color: "#fff6d8", radius: 30, opacity: o });
                for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = W * 0.34 * g; d.circle((36 + (i % 3) * 18) * c.S * g, { x: p.x + Math.cos(a) * r, y: H * 0.22 + Math.sin(a) * r * 0.42, color: i % 2 ? "#fff6d8" : "#ffe08a", opacity: o }); }
                d.circle(W * 0.3 * g, { x: p.x, y: H * 0.22, color: "#fffbe6", opacity: o });
                if (t >= 158) giantText(d, "NUKED", W / 2, H * 0.24, 54 * c.S * back(seg(t, 158, 170)), "#e8472e", { rot: -0.05 });
            }
        },
    },
    chill: {
        tint: "#07243c", film(c) {
            const t = c.t, f = c.face, grab = seg(t, 4, 34);
            c.atk.top = t < 40 ? 1 : 0;
            c.atk.scale = 1 + seg(t, 0, 50) * 0.4;
            c.atk.x = c.atk.x0;
            c.def.x = lerp(c.foe.x, c.atk.x0, grab); c.def.scale = 1 - grab * 0.2; c.def.hide = t >= 36 && t < 58;
            if (t >= 58) { c.atk.x = c.atk.x0 - c.face * seg(t, 58, 80) * 70; c.def.x = c.mid + c.face * 20; c.def.frozen = true; c.def.hide = false; c.def.still = true; }
            if (t >= 160) { c.def.y = -out(seg(t, 160, 180)) * 160; c.def.rot = seg(t, 160, 190) * 4; c.def.frozen = false; c.def.still = false; }
            c.cam(1.26, c.mid, -90);
        },
        over(d, c) {
            const { W, H, t } = c, m = seg(t, 30, 90);
            // Frost creeps in from the corners of the screen.
            for (let i = 0; i < 44; i++) { const edge = i % 4, k = (i * 37 % 100) / 100, r = (20 + (i * 13 % 40)) * c.S * m, x = edge === 0 ? W * k : edge === 1 ? W * k : edge === 2 ? 0 : W, y = edge === 0 ? 0 : edge === 1 ? H : H * k; d.circle(r, { x, y, color: i % 3 ? "#d9f6ff" : "#ffffff", opacity: 0.8 }); }
            if (t >= 58 && t < 170) { const p = c.toView(c.def.x, -56), sc = c.zoom, sh = t < 160 ? 1 : 1 - seg(t, 160, 170); iceBlock(d, p.x, p.y, 124 * sc, 140 * sc, sh * back(seg(t, 58, 70))); }
            if (t >= 128 && t < 162) {
                const k = inn(seg(t, 128, 160)), p = c.toView(c.def.x, -56);
                iceBlock(d, p.x, lerp(-H * 0.6, p.y - 120 * c.zoom, k), 260 * c.S, 230 * c.S);
            }
            if (t >= 160) {
                const k = seg(t, 160, 186), p = c.toView(c.def.x, -56);
                for (let i = 0; i < 26; i++) { const a = i * 0.9, r = k * W * (0.3 + (i % 4) * 0.2), s = (10 + (i % 3) * 12) * c.S; d.rect(s, s, { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r * 0.7 + k * k * 120, color: i % 2 ? "#ffffff" : "#bfeeff", opacity: 1 - k * k, radius: 3 }); }
                giantText(d, "DEEP FREEZE", W / 2, H * 0.32, 42 * c.S * back(seg(t, 160, 172)), "#bfeeff");
            }
        },
    },
    knead: {
        tint: "#3a1a05", film(c) {
            const t = c.t;
            c.atk.top = 1; c.atk.spin = 1; c.atk.scale = 1 + seg(t, 0, 40) * 0.5;
            const roll = seg(t, 16, 44);
            c.def.hide = t > 40 && t < 148;
            c.def.x = c.foe.x; c.def.scale = 1; c.def.rot = 0;
            if (t >= 148) { c.def.x = c.foe.x + c.face * out(seg(t, 148, 176)) * 200; c.def.y = -Math.sin(seg(t, 148, 176) * 3.14) * 170; c.def.rot = t * 0.4; }
            c.cam(1.26, c.mid + c.face * 30, -90);
        },
        over(d, c) {
            const { W, H, t } = c, p = c.toView(c.foe.x, -56), z = c.zoom, wrap = out(seg(t, 16, 44));
            if (t > 14 && t < 150) {
                const pulse = t > 44 ? Math.sin((t - 44) * 0.3) : 0, sx = 1 + pulse * 0.28, sy = 1 - pulse * 0.28, r = 70 * z * wrap;
                const drop = t > 44 ? Math.abs(Math.cos((t - 44) * 0.15)) * 70 * z : 0;
                d.push(); d.translate(p.x, p.y + 10 * z - drop * 0); d.scale(sx, sy);
                d.circle(r + 3, { color: "#241a2c" }); d.circle(r, { color: "#f6d79c" }); d.circle(r * 0.6, { x: -r * 0.3, y: -r * 0.3, color: "#fff0cc", opacity: 0.7 });
                d.pop();
                // Giant whisks hammer in on each hit.
                for (const [i, at] of [[0, 50], [1, 72], [2, 94], [3, 116]]) if (t > at - 12 && t < at + 8) {
                    const k = seg(t, at - 12, at), x = p.x + (i % 2 ? 1 : -1) * lerp(180, 30, inn(k)) * c.S, y = p.y - lerp(240, 40, inn(k)) * c.S;
                    d.push(); d.translate(x, y); d.rotate((i % 2 ? -1 : 1) * 0.4);
                    for (const dx of [-24, 0, 24]) d.rect(10 * c.S + Math.abs(dx) * 1.1 * c.S, 130 * c.S, { x: dx * c.S, color: "#c9d6e0", outline: 5 * c.S, radius: 26 * c.S });
                    d.rect(16 * c.S, 110 * c.S, { y: -118 * c.S, color: "#ef7f3a", radius: 8 * c.S });
                    d.pop();
                }
            }
            if (t >= 138 && t < 164) {
                const k = inn(seg(t, 138, 150)), o = 1 - seg(t, 156, 164), x = lerp(-W * 0.6, W * 1.5, k);
                d.push(); d.translate(x, p.y); d.rotate(-0.1);
                d.rect(W * 0.9, 90 * c.S, { color: "#241a2c", radius: 40 * c.S, opacity: o }); d.rect(W * 0.88, 80 * c.S, { color: "#c98a4c", radius: 36 * c.S, opacity: o });
                d.pop();
            }
            if (t >= 150) giantText(d, "SECONDS?", W / 2, H * 0.34, 50 * c.S * back(seg(t, 150, 162)), "#fff0cc", { rot: -0.06 });
        },
    },
    clamp: {
        tint: "#2a1505", film(c) {
            const t = c.t;
            c.atk.top = t < 40 ? 1 : 0.2; c.atk.scale = 1 + seg(t, 0, 30) * 0.3;
            c.def.x = c.foe.x; c.def.still = true;
            const pressed = [52, 88, 122].some((at) => t >= at && t < at + 14);
            c.def.sqx = pressed ? 0.42 : 1; c.def.sqy = pressed ? 1.2 : 1;
            if (t >= 150) { c.def.still = false; c.def.y = -out(seg(t, 150, 176)) * 180; c.def.rot = seg(t, 150, 180) * 5; c.def.sqx = 1; c.def.sqy = 1; }
            c.cam(1.32, c.foe.x, -80);
        },
        over(d, c) {
            const { W, H, t } = c, p = c.toView(c.foe.x, -56), w = 240 * c.S, h = H * 0.92;
            let gapK = 1;
            for (const at of [52, 88, 122, 150]) { if (t > at - 16 && t <= at) gapK = 1 - inn(seg(t, at - 16, at)); else if (t > at && t < at + 16) gapK = seg(t, at + 4, at + 16); }
            if (t < 16) gapK = 1;
            const open = out(seg(t, 0, 26)), gap = 30 * c.S + gapK * 150 * c.S, y = H / 2;
            const off = (1 - open) * W * 0.8;
            waffle(d, p.x - gap - w / 2 - off, y, w, h, "#d9a441", "#a8742a");
            waffle(d, p.x + gap + w / 2 + off, y, w, h, "#d9a441", "#a8742a");
            if (t >= 150) {
                const k = seg(t, 152, 176);
                for (let i = -1; i < 10; i++) d.circle(30 * c.S, { x: i * W / 9, y: lerp(-40, H * 1.2, k) - 26 * Math.abs(Math.sin(i * 1.4)) * c.S, color: "#b5651d", opacity: 0.95 });
                d.rect(W, H * k * 1.2, { x: W / 2, y: H * k * 0.6, color: "#b5651d", opacity: 0.95 });
                giantText(d, "GRID LOCK", W / 2, H * 0.4, 50 * c.S * back(seg(t, 150, 162)), "#ffd14a", { rot: 0.05 });
            }
        },
    },
};

export class Cine {
    constructor(m, e) {
        this.m = m; this.film = FILMS[e.id] ?? FILMS.crumbs; this.id = e.id;
        const f = m.fight, atk = f.p[e.i], def = f.p[e.foe];
        this.face = atk.face; this.t = 0; this.zoom = 1; this.angle = 0; this.mid = (atk.x + def.x) / 2;
        this.foe = { x: def.x }; this.reset = () => { this.atk = { x: atk.x, x0: atk.x, y: 0, scale: 1, rot: 0 }; this.def = { x: def.x, y: 0, scale: 1, rot: 0 }; };
        this.reset(); this.camX = m.camX; this.camY = m.camY; this.camZ = m.camZ; this.flashWhite = 0;
    }
    update() {
        this.t = this.m.fight.cine?.t ?? this.t;
        this.reset();
        this.film.film(this);
    }
    cam(z, x, y) { const base = this.m.baseZoom; this.want = { z: base * (1 + (z - 1) * 0.45), x: x ?? this.m.camX, y }; }
    toView(x, y) { const p = this.m.s.cam.toView([x, y]); return { x: p.x, y: p.y }; }
    kernel({ x, y, size }) { const p = this.m.kit.shared.kernel; return { x, y, width: size, height: size * 0.9, crop: p.crop }; }
    drawOver(d, W, H) {
        const S = Math.min(W, H * 1.4) / 360;
        Object.assign(this, { W, H, S, zoom: this.m.s.cam.zoom });
        this.film.over(d, this);
        // Letterbox bars: instant cinema.
        const bar = 30 * S * seg(this.t, 0, 14) * (1 - seg(this.t, (this.m.fight.cine?.dur ?? 170) - 12, this.m.fight.cine?.dur ?? 170));
        d.rect(W, bar, { x: W / 2, y: bar / 2, color: "#000000" }); d.rect(W, bar, { x: W / 2, y: H - bar / 2, color: "#000000" });
    }
}
