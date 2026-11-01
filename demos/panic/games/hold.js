// Hold games: press, wait, feel it build, and let go at exactly the right moment.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

G({
    id: "blow", tags: "gross quick", easy: true, feel: [6, 6, 6], bg: [C.rose, C.wht, "dots", 0.4], mood: "bouncy", icon: "kid", home: [0, 90], outro: 0.6,
    hint: ["hold", 0, 90],
    art: {
        kid: [150, 150, (a, f) => { a.C(75, 80, 62, C.skin, C.tan); a.P([[20, 60], [40, 8], [70, 34], [96, 6], [132, 58]], C.org); a.eye(50, 66, 10, 0.2, -0.5).eye(100, 66, 10, -0.2, -0.5); a.E(75, 112, 12, 10, INK); }, { frames: 1 }],
        gum: [200, 200, (a) => { a.C(100, 100, 90, C.pink, C.mag); a.e(66, 62, 28, 18, "#ffffffaa"); a.c(124, 136, 7, "#ffffff55"); }],
    },
    init(m) { m.k = 0; m.lo = 0.62; m.hi = 0.82; m.popd = false; },
    tick(m, dt) {
        if (m.popd) return;
        if (m.down) { m.k += dt * 0.42; if ((m.t * 12 | 0) !== ((m.t - dt) * 12 | 0)) m.hit(T("sine", 200 + m.k * 500, undefined, 0.05, 0.06)); }
        else m.k = Math.max(0, m.k - dt * 0.28);
        if (m.released && m.k >= m.lo && m.k <= m.hi) { m.hit(T("square", 900, 1300, 0.14), [20, 30, 20]); m.ring(0, 0, C.yel, 90); m.boom(0, -30, [C.yel, C.pink], 18); m.win(); }
        if (m.k > 1) { m.popd = true; m.hit([NOISE(0.2, 0.2), T("sawtooth", 500, 60, 0.2)], "heavy"); m.boom(0, 30, [C.pink, C.mag], 26, { v1: 420, f: 5 }); m.lose(); }
    },
    draw(m, d) {
        const gy = -20, R = (k) => 18 + k * 112;
        m.spr("kid", 0, 88);
        const pulse = 1 + Math.sin(m.rt * 10) * 0.012, r = (R(m.lo) + R(m.hi));
        if (!m.popd) m.spr("gum", 0, 96 - 8 - R(m.k) * 0.92, { k: R(m.k) / 90, sy: 2 - pulse, sx: pulse });
        d.rect(R(m.hi) * 2, R(m.hi) * 2, { x: 0, y: 96 - 8 - R(0.72) * 0.92, radius: 999, outline: 5, color: C.grn });
        d.rect(R(m.lo) * 2, R(m.lo) * 2, { x: 0, y: 96 - 8 - R(0.72) * 0.92, radius: 999, outline: 3, color: C.grn, opacity: 0.6 });
    },
    bot(m, b) { if (m.k < 0.72) b.press(0, 90); else b.release(); },
});

G({
    id: "pour", tags: "food quick", feel: [4, 8, 4, 8], bg: [C.sky, C.cyan, "wave", 0.3], mood: "chip", icon: "bottle", home: [0, 0], hint: ["hold", 0, 0], outro: 0.6,
    art: {
        bottle: [90, 200, (a) => { a.R(26, 66, 40, 124, 10, C.dgrn); a.P([[34, 66], [38, 26], [56, 26], [60, 66]], C.dgrn); a.R(34, 10, 26, 16, 3, C.red); a.R(26, 104, 40, 50, 3, C.paper); a.C(46, 128, 13, C.red); a.r(30, 70, 7, 110, "#ffffff55"); }],
    },
    init(m) { m.lv = 0; m.foam = 0; m.lo = 0.68; m.hi = 0.84; },
    tick(m, dt) {
        if (m.down) { m.lv += dt * 0.34; m.foam = Math.min(0.13, m.foam + dt * 0.3); if ((m.t * 15 | 0) !== ((m.t - dt) * 15 | 0)) m.hit(T("sine", 240 + m.lv * 500, 300 + m.lv * 500, 0.03, 0.07)); }
        else m.foam = Math.max(0, m.foam - dt * 0.28);
        if (m.released && m.lv >= m.lo && m.lv <= m.hi) { m.hit(T("sine", 800, 1400, 0.14), [10, 40, 30]); m.boom(40, 60, [C.yel, C.wht], 12, { f: 3 }); m.win(); }
        if (m.released && m.lv > 0 && m.lv < m.lo) { /* a pause is allowed; carry on pouring */ }
        if (m.lv + m.foam > 1.04) { m.sfx(NOISE(0.3, 0.14)); m.drops(40, -40, C.org, 16, { v1: 200 }); m.lose(); }
    },
    draw(m, d) {
        const x = 34, w = 124, top = -56, bot = 130, h = bot - top, L = (k) => bot - h * k, a = m.down ? 2.1 : 1.3;
        m.spr("bottle", -66, -84, { rot: a });
        if (m.down) { m.line(-14, -70, 26, L(m.lv) + 10, C.org, 8, false); }
        d.rect(w + 16, h + 16, { x, y: (top + bot) / 2, color: INK, radius: 10 });
        d.rect(w, h, { x, y: (top + bot) / 2, color: "#e8fbff", radius: 6 });
        const ly = L(m.lv);
        d.rect(w, bot - ly, { x, y: (ly + bot) / 2, color: C.org, radius: 5 });
        if (m.foam > 0) { for (let i = 0; i < 6; i++) d.circle(14 + m.foam * 40, { x: x - 52 + i * 21, y: ly - m.foam * h * 0.5 + Math.sin(m.rt * 9 + i) * 2, color: C.wht }); d.rect(w, m.foam * h, { x, y: ly - m.foam * h / 2, color: C.wht }); }
        d.rect(w + 26, (m.hi - m.lo) * h, { x, y: (L(m.lo) + L(m.hi)) / 2, color: C.grn, opacity: 0.45 });
        d.rect(w + 34, 4, { x, y: L(m.hi), color: C.dgrn }); d.rect(w + 34, 4, { x, y: L(m.lo), color: C.dgrn });
    },
    bot(m, b) { if (m.lv < 0.76) b.press(0, 0); else b.release(); },
});

G({
    id: "toast", tags: "food quick", feel: [8, 30, 8, 30], bg: [C.org, C.paper, "check", 0.3], mood: "march", icon: "toaster", home: [0, 80], hint: ["hold", 0, 80], outro: 0.6,
    art: {
        toaster: [240, 190, (a) => { a.R(16, 56, 208, 126, 30, C.gry); a.rr(26, 66, 190, 16, 8, "#ffffffaa"); a.R(52, 42, 136, 18, 6, INK); a.R(222, 96, 16, 56, 4, INK); a.C(70, 146, 13, C.red).C(120, 146, 8, C.dgry).C(150, 146, 8, C.dgry); }],
        bread: [130, 120, (a) => { a.R(10, 26, 110, 90, 12, C.wht); a.C(38, 34, 26, C.wht).C(92, 34, 26, C.wht); }, { dots: false }],
        lever: [40, 30, (a) => { a.R(4, 6, 32, 18, 6, INK); }],
    },
    init(m) { m.b = 0; m.goal = m.rng.range(0.42, 0.72); m.up = 0; m.burn = false; m.vy = 0; m.popped = false; },
    col(b) { const stops = [[255, 244, 214], [240, 190, 110], [186, 112, 48], [96, 54, 24], [24, 20, 26]], q = clamp(b) * 3.999, i = Math.floor(q), f = q - i, [r, g, l] = stops[i].map((v, n) => (v + (stops[i + 1][n] - v) * f) / 255); return [r, g, l, 1]; },
    tick(m, dt) {
        if (!m.popped && m.down) { m.b += dt * 0.36; if ((m.t * 7 | 0) !== ((m.t - dt) * 7 | 0)) m.hit(T("sawtooth", 80, 80, 0.05, 0.04)); }
        if (m.b > 1 && !m.popped) { m.popped = true; m.boom(0, -40, [C.dgry, INK], 16, { f: 3, g: -200 }); m.sfx(NOISE(0.3, 0.14)); m.lose(); }
        if (m.released && !m.popped && m.b > 0.05) {
            m.popped = true; m.vy = -560; m.sfx(T("square", 300, 900, 0.12));
            if (Math.abs(m.b - m.goal) <= 0.11) { m.hit(T("sine", 700, 1300, 0.2), [30, 20, 10]); m.boom(0, -60, [C.yel, C.wht], 12); m.win(); } else m.lose();
        }
        if (m.popped) { m.vy += 1200 * dt; m.up = Math.min(0, m.up + m.vy * dt); if (m.up >= 0 && m.vy > 0) m.vy = 0; }
    },
    draw(m) {
        const c = this.col(m.b), sink = m.down ? 34 : 6;
        m.spr("bread", 90, -112, { k: 0.62, color: this.col(m.goal) });
        m.spr("bread", -8, -2 + sink + m.up, { color: c });
        m.spr("toaster", 0, 58);
        m.spr("lever", 110, 38 + sink, {});
        if (m.down && !m.popped) for (let i = 0; i < 3; i++) m.d.rect(120 - i * 20, 6, { y: 106 + i * 8, color: C.org, radius: 3, opacity: 0.4 + Math.sin(m.rt * 30 + i) * 0.3 });
    },
    bot(m, b) { if (!m.popped) { if (m.b < m.goal) b.press(0, 80); else b.release(); } },
});

G({
    id: "hover", tags: "steady zoo", feel: [3, 3, 3], bg: [C.navy, C.blu, "dots", 0.3], survive: true, mood: "surf", icon: "bowl", home: [0, 60], hint: ["hold", 0, 80],
    art: {
        bowl: [84, 96, (a, f) => {
            a.E(42, 20, 26, 5, C.gry); a.r(39, 8, 6, 12, C.gry); a.e(42, 8, 34, 5, f ? "#ffffffdd" : C.gry);
            a.C(42, 58, 32, "#bdf1ff", "#62cdeb"); a.e(42, 66, 16, 10, C.org); a.P([[24, 56], [30, 66], [24, 76]], C.org); a.eye(50, 62, 5, 0.5, 0);
        }, { frames: 2 }],
        rock: [90, 400, (a) => { a.R(8, 0, 74, 400, 8, C.dgry); for (let i = 0; i < 12; i++) a.c(26 + (i * 37) % 44, 16 + i * 32, 6, "#55526a"); }, { k: 1.2, lw: 3 }],
    },
    init(m) { m.yy = 0; m.v = 0; m.o = [{ x: 170, gap: 0 }, { x: 390, gap: m.rng.range(-55, 55) }]; m.dust = 0; },
    tick(m, dt) {
        m.v += (m.down ? -640 : 480) * dt; m.v = clamp(m.v, -260, 280); m.yy += m.v * dt;
        if (m.down && (m.t * 16 | 0) !== ((m.t - dt) * 16 | 0)) { m.buzz(); m.sfx(T("sawtooth", 130, 180, 0.04, 0.04)); m.boom(-60, m.yy + 40, [C.wht, C.sky], 1, { a0: 1.2, a1: 2, v1: 120, f: 3 }); }
        for (const o of m.o) { o.x -= 130 * dt; if (Math.abs(o.x - -60) < 62 && Math.abs(m.yy - o.gap) > 76 && !m.over) { m.boom(-60, m.yy, [C.cyan, C.wht], 14); m.sfx(NOISE(0.2, 0.2)); m.lose(); } }
        if (Math.abs(m.yy) > 146 && !m.over) { m.yy = clamp(m.yy, -146, 146); m.sfx(NOISE(0.2, 0.2)); m.lose(); }
    },
    draw(m) {
        for (const o of m.o) { m.spr("rock", o.x, o.gap - 118 - 200); m.spr("rock", o.x, o.gap + 118 + 200); }
        m.spr("bowl", -60, m.yy, { f: (m.rt * 24 | 0) % 2, rot: m.v * 0.0012 });
    },
    bot(m, b) {
        const o = m.o.find((q) => q.x > -130) ?? m.o[1], goal = o.gap, pred = m.yy + m.v * 0.09 * Math.min(1.6, m.speed);
        if (pred > goal) b.press(0, 60); else b.release();
    },
});

G({
    id: "sneak", tags: "zoo steady", feel: [3, 40, 3], bg: [C.pur, C.navy, "scale", 0.3], mood: "spooky", icon: "coon", home: [0, 100], hint: ["hold", 0, 100],
    art: {
        coon: [120, 100, (a, f) => {
            a.L(14, 58, 4, 26, C.gry, 10); a.E(58, 62, 38, 26, C.gry, C.dgry);
            a.C(86, 42, 22, C.gry); a.e(92, 38, 18, 8, INK); a.eye(84, 38, 6, 0.6, 0).eye(102, 38, 6, 0.6, 0); a.C(108, 48, 4, INK);
            a.L(40, 84, 34 + f * 10, 96, C.dgry, 7).L(76, 84, 84 - f * 10, 96, C.dgry, 7);
        }, { frames: 2 }],
        nana2: [110, 170, (a, f) => { a.E(55, 116, 44, 54, C.pur, C.navy); a.C(55, 46, 34, f ? C.skin : C.gry); a.C(55, 22, 17, C.gry); if (f) { a.eye(42, 44, 8, -0.5, 0).eye(68, 44, 8, -0.5, 0); a.arc(42, 44, 12, 12, 3, 6, INK, 3); a.frown(55, 66, 9, 5); a.arc(68, 44, 12, 12, 3, 6, INK, 3); } }, { frames: 2 }],
        pie: [100, 70, (a) => { a.E(50, 40, 44, 22, C.gold, C.org); a.e(50, 32, 36, 13, C.red); for (let i = 0; i < 4; i++) a.l(20 + i * 18, 26, 26 + i * 18, 38, C.gold, 3); a.arc(38, 6, 6, 12, 1.5, 4.5, C.wht, 3).arc(62, 6, 6, 12, -1.5, 1.5, C.wht, 3); }],
    },
    init(m) { m.xx = -130; m.st = 0; m.tm = 1.1; m.look = false; m.warn = false; },
    tick(m, dt) {
        m.tm -= dt;
        if (m.tm <= 0) {
            if (m.st === 0) { m.st = 1; m.tm = 0.5; m.warn = true; m.hit(T("sine", 900, 1500, 0.12, 0.08), "tick"); }
            else if (m.st === 1) { m.st = 2; m.tm = 0.9; m.look = true; m.warn = false; m.sfx(T("square", 300, 500, 0.16)); }
            else { m.st = 0; m.tm = 1 + m.rng.range(0, 0.4); m.look = false; }
        }
        if (m.down && !m.over) {
            m.xx += 118 * dt;
            if ((m.t * 7 | 0) !== ((m.t - dt) * 7 | 0)) m.hit(T("triangle", 300, 260, 0.03, 0.06));
            if (m.look) { m.ring(m.xx, 70, C.red, 60); m.sfx(T("sawtooth", 300, 80, 0.3)); m.lose(); }
            if (m.xx >= 60) { m.boom(84, 70, [C.yel, C.red], 14); m.win(); }
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 120, { y: 152, color: "#23203a" });
        m.spr("pie", 106, 76);
        m.spr("nana2", 112, -40, { f: m.look ? 1 : 0, sx: m.warn ? 1 + Math.sin(m.rt * 40) * 0.05 : 1 });
        if (m.warn) { d.sprite("fx", { x: 60, y: -116, width: 44, height: 44, frame: 4, color: C.yel, rot: m.rt * 8 }); }
        m.shadow(m.xx, 106, 44, 8, 0.4); m.spr("coon", m.xx, 62, { f: m.down ? (m.rt * 10 | 0) % 2 : 0 });
    },
    bot(m, b) {
        if (m.st === 0 && m.tm > 0.1 / m.speed + 0.06) b.press(0, 100); else b.release();
    },
});

G({
    id: "duck", tags: "zoo quick", feel: [12, 12], bg: [C.cyan, C.sky, "wave", 0.35], survive: true, mood: "bouncy", icon: "quack", home: [0, 100], hint: ["hold", 0, 100],
    art: {
        quack: [110, 200, (a, f) => {
            if (f === 0) { a.L(44, 120, 44, 190, C.org, 6).L(70, 120, 70, 190, C.org, 6); a.E(58, 102, 40, 28, C.wht, C.gry); a.L(82, 90, 86, 48, C.wht, 16); a.C(86, 36, 22, C.wht); a.eye(92, 30, 7, 0.4, 0); a.P([[104, 34], [108, 50], [132 - 26, 44]], C.org); a.E(48, 192, 12, 5, C.org).E(74, 192, 12, 5, C.org); }
            else { a.L(36, 186, 50, 166, C.org, 6).L(84, 186, 70, 166, C.org, 6); a.E(58, 156, 42, 24, C.wht, C.gry); a.C(88, 140, 18, C.wht); a.eye(94, 134, 6, 0.4, -0.6); a.E(30, 192, 12, 5, C.org).E(90, 192, 12, 5, C.org); }
        }, { frames: 2 }],
        pan: [110, 60, (a) => { a.E(40, 30, 36, 24, "#3a3648", INK); a.L(70, 30, 108, 30, C.brn, 8); }],
        ball: [60, 60, (a) => { a.C(30, 30, 24, C.red, C.mag); a.r(6, 26, 48, 8, C.wht); }],
    },
    init(m) { m.o = []; for (let i = 0; i < 4; i++) { m.o.push({ x: 240 + i * 250, hi: i === 0 ? true : m.rng.chance(0.6), r: 0 }); } m.sq = 0; },
    tick(m, dt) {
        const v = 215;
        m.sq += ((m.down ? 1 : 0) - m.sq) * Math.min(1, dt * 26);
        if (m.pressed) m.hit(T("square", 700, 400, 0.06, 0.1));
        for (const o of m.o) {
            o.x -= v * dt; o.r += dt * 9;
            if (Math.abs(o.x + 20) < 34 && !o.hit && !m.over) {
                if (o.hi && !m.down) { o.hit = 1; m.boom(-20, -70, [C.yel, C.wht], 12); m.sfx(T("square", 1200, 900, 0.24, 0.16)); m.lose(); }
                if (!o.hi && m.down) { o.hit = 1; m.boom(-20, 100, [C.red, C.wht], 12); m.sfx(NOISE(0.1, 0.2)); m.lose(); }
            }
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 300, { y: 276, color: C.dgrn }); d.rect(m.R - m.L + 4, 8, { y: 130, color: C.grn });
        m.spr("quack", -24, 34, { f: m.sq > 0.5 ? 1 : 0 });
        for (const o of m.o) m.spr(o.hi ? "pan" : "ball", o.x, o.hi ? -70 : 102, { rot: o.hi ? o.r : o.r * 0.6 });
    },
    bot(m, b) {
        const o = m.o.filter((q) => q.x > -70).sort((p, q) => p.x - q.x)[0];
        if (o && o.hi && o.x < 90) b.press(0, 100);
        else if (o && !o.hi && o.x < 90) b.release();
        else if (!o) b.release();
    },
});

G({
    id: "squirt", tags: "food gross", feel: [5, 5, 12], bg: [C.yel, C.gold, "stripes", 0.3], mood: "funk", icon: "sauce", home: [0, 0], hint: ["hold", 0, 0],
    art: {
        sauce: [90, 180, (a) => { a.P([[20, 60], [70, 60], [78, 150], [12, 150]], C.red); a.R(30, 24, 30, 36, 3, C.wht); a.P([[38, 24], [52, 24], [47, 2], [43, 2]], C.wht); a.R(24, 84, 42, 44, 3, C.paper); a.c(45, 106, 13, C.red); a.r(22, 66, 5, 80, "#ffffff55"); }],
        dog: [130, 56, (a) => { a.E(65, 34, 60, 19, C.gold, C.org); a.E(65, 22, 54, 11, C.mag, C.red); a.e(50, 18, 22, 3, "#ffffff77"); }],
    },
    init(m) { m.d2 = [0, 1, 2].map((i) => ({ x: -190 - i * 170, k: 0 })); m.need = 3; m.ok = 0; m.belt = 0; },
    tick(m, dt) {
        const v = 170; m.belt = (m.belt + v * dt) % 40;
        if (m.down) {
            const u = m.d2.find((q) => Math.abs(q.x) < 62);
            if ((m.t * 18 | 0) !== ((m.t - dt) * 18 | 0)) { m.hit(T("sawtooth", 220, 120, 0.04, 0.07)); m.drops(0, 44, C.red, 2, { a0: 0.3, a1: 2.8, v1: 120 }); }
            if (u) { const b = u.k < 1; u.k = Math.min(1, u.k + dt * 2.9); if (b && u.k >= 1) { m.ok++; m.boom(u.x, 60, [C.yel, C.wht], 8, { f: 1 }); if (m.ok >= m.need) m.win(); } }
        }
        for (const q of m.d2) { q.x += v * dt; if (q.x > 240) { q.x -= 520; if (q.k < 1) q.k = 0; } }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 48, { y: 120, color: INK }); for (let i = -5; i < 7; i++) d.rect(6, 40, { x: i * 40 + m.belt, y: 120, color: C.dgry });
        for (const q of m.d2) { m.spr("dog", q.x, 76); if (q.k > 0) for (let i = 0; i < 9 * q.k; i++) m.line(q.x - 44 + i * 11, 66 + (i % 2) * 8, q.x - 33 + i * 11, 66 + ((i + 1) % 2) * 8, C.red, 4, false); }
        const sq = m.down ? 0.92 : 1;
        m.spr("sauce", 0, -76, { rot: Math.PI, sx: sq });
        if (m.down) m.line(0, 16, 0, 66, C.red, 7, false);
    },
    bot(m, b) { if (m.d2.some((q) => Math.abs(q.x) < 55 && q.k < 1)) b.press(0, 0); else b.release(); },
});

G({
    id: "resist", tags: "brain", feel: [40, 120, 20], bg: [C.navy, C.mag, "rays", 0.3], survive: true, idleWins: true, mood: "spooky", icon: "button", hint: ["none"], dur: 4,
    art: {
        button: [220, 220, (a, f) => {
            a.E(110, 164, 104, 34, C.gry, C.dgry); a.E(110, 130, 86, 60, C.red, C.mag); a.e(78, 100, 26, 12, "#ffffffaa");
            if (f) { a.eye(84, 128, 16 + f * 3, 0, 0.4).eye(136, 128, 16 + f * 3, 0, 0.4); a.c(78, 122, 5, C.wht).c(130, 122, 5, C.wht); a.smile(110, 156, 12, 7); }
        }, { frames: 3 }],
    },
    init(m) { m.next = 0.4; m.k = 0; },
    tick(m, dt) {
        m.k = m.p;
        m.next -= dt;
        if (m.next <= 0) { m.next = 0.8 - m.k * 0.5; m.hit(T("sine", 300 + m.k * 200, 200, 0.2, 0.1)); m.ring(0, 0, C.yel, 110 + m.k * 40); }
        if (m.pressed) { m.hit([T("square", 180, 60, 0.4), NOISE(0.3, 0.2)], "heavy"); m.boom(0, 0, [C.red, C.yel, C.org], 36, { v0: 200, v1: 600 }); m.shake(14, 0.4); m.lose(); }
    },
    draw(m) {
        const w = 1 + Math.sin(m.rt * 8) * (0.03 + m.k * 0.06);
        m.spr("button", Math.sin(m.rt * 30) * m.k * 4, 0, { f: m.k > 0.7 ? 2 : m.k > 0.3 ? 1 : 0, sx: w, sy: 2 - w, k: 1 + m.k * 0.2 });
    },
});

G({
    id: "water", tags: "steady", feel: [6, 16], bg: [C.lime, C.grn, "plus", 0.3], grip: false, keySpeed: 360, mood: "bouncy", icon: "can", home: [-96, -60],
    hint: ["hold", -96, -60], snap: (m) => m.f.filter((f) => f.k < 1).map((f) => [f.x, -60]),
    art: {
        can: [120, 90, (a) => { a.P([[10, 44], [44, 32], [44, 52], [10, 42]], C.cyan); a.R(40, 24, 60, 56, 10, C.cyan); a.arc(100, 44, 18, 20, -1.5, 1.5, C.cyan, 6); a.r(46, 30, 8, 44, "#ffffff55"); }],
        flo: [100, 150, (a, f) => {
            a.L(50, 148, 50, 76, C.dgrn, 6);
            if (f) { for (let i = 0; i < 8; i++) { const t = i * TAU / 8; a.C(50 + Math.cos(t) * 26, 50 + Math.sin(t) * 26, 15, C.pink); } a.C(50, 50, 18, C.yel); a.eye(42, 46, 6, 0, 0).eye(58, 46, 6, 0, 0); a.smile(50, 60, 9, 5); }
            else { a.P([[50, 72], [20, 96], [40, 104]], "#8a9a52"); a.E(24, 100, 16, 13, "#a18a4a"); a.l(16, 96, 30, 104, INK, 2.4); }
        }, { frames: 2 }],
    },
    init(m) { m.f = [-96, 0, 96].map((x) => ({ x, k: 0, s: 1 })); m.n = 3; m.cx2 = m.x; },
    tick(m, dt) {
        for (const q of m.f) {
            q.s += (1 - q.s) * Math.min(1, dt * 10);
            if (m.down && Math.abs(q.x - m.x) < 46 && q.k < 1) {
                q.k += dt * 1.4;
                if ((m.t * 16 | 0) !== ((m.t - dt) * 16 | 0)) { m.hit(NOISE(0.04, 0.05)); m.drops(q.x, 30, C.cyan, 2, { a0: 1.2, a1: 2, v1: 100 }); }
                if (q.k >= 1) { q.s = 1.6; m.n--; m.hit(T("sine", 660, 1320, 0.14), [8, 8, 30]); m.boom(q.x, 50, [C.pink, C.yel], 10, { f: 1 }); if (!m.n) m.win(); }
            }
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 240, { y: 240, color: C.dbrn });
        for (const q of m.f) m.spr("flo", q.x, 60, { f: q.k >= 1 ? 1 : 0, sx: q.s, sy: q.s });
        for (const q of m.f) if (q.k < 1) m.meter(q.x, 140, 62, 10, q.k, C.cyan);
        const x = clamp(m.x, -130, 130);
        m.spr("can", x + 34, -84, { rot: m.down ? -0.55 : 0 });
        if (m.down) for (let i = 0; i < 6; i++) { const y = -46 + ((m.rt * 300 + i * 22) % 110); d.sprite("fx", { x: x - 10 + Math.sin(i * 3) * 12, y, width: 14, height: 14, frame: 2, color: C.cyan }); }
    },
    bot(m, b) { const q = m.f.find((u) => u.k < 1); if (q) b.drag(q.x, -60); },
});

G({
    id: "hug", tags: "steady zoo", feel: [20, 80, 20, 80], bg: [C.rose, C.pink, "dots", 0.3], grip: true, mood: "bouncy", icon: "cactus", hint: (m) => ["hold", m.cxx, m.cyy],
    art: {
        cactus: [120, 150, (a, f) => {
            a.R(40, 12, 44, 130, 22, C.grn); a.R(10, 54, 22, 44, 11, C.grn); a.R(10, 84, 40, 18, 9, C.grn); a.R(92, 44, 22, 44, 11, C.grn); a.R(74, 74, 40, 18, 9, C.grn);
            a.R(30, 136, 64, 14, 4, C.org);
            for (const [x, y] of [[50, 30], [74, 44], [46, 102], [78, 112], [18, 66], [102, 56]]) a.l(x - 3, y, x + 3, y, C.paper, 2);
            if (f) { a.arc(52, 58, 7, 7, 3.2, 6.2, INK, 3).arc(74, 58, 7, 7, 3.2, 6.2, INK, 3); a.smile(62, 80, 12, 8); a.e(44, 72, 6, 4, C.pink).e(80, 72, 6, 4, C.pink); }
            else { a.eye(52, 58, 7, 0, 0.3).eye(74, 58, 7, 0, 0.3); a.frown(62, 82, 9, 5); a.E(44, 76, 3, 7, C.cyan); }
        }, { frames: 2 }],
    },
    init(m) { m.k = 0; m.a = m.rng.range(0, 6); m.cxx = 0; m.cyy = 0; this.mv(m); },
    mv(m) { m.cxx = Math.sin(m.a + m.t * 1.1) * 96; m.cyy = Math.cos(m.a * 2 + m.t * 0.9) * 62; },
    tick(m, dt) {
        this.mv(m);
        const on = m.down && dist(m.x, m.y, m.cxx, m.cyy) < 72;
        m.k = clamp(m.k + (on ? dt * 0.62 : -dt * 0.22));
        if (on && (m.t * 3 | 0) !== ((m.t - dt) * 3 | 0)) { m.hit(T("sine", 400 + m.k * 300, undefined, 0.15, 0.1)); m.boom(m.cxx, m.cyy - 40, [C.pink, C.rose], 3, { f: 1, g: -160, v1: 90 }); }
        if (m.k >= 1) { m.boom(m.cxx, m.cyy, [C.pink, C.yel, C.wht], 24, { f: 1 }); m.win(); }
    },
    draw(m) {
        m.shadow(m.cxx, m.cyy + 76, 44, 8);
        const q = m.down ? 1.04 : 1;
        m.spr("cactus", m.cxx, m.cyy, { f: m.k > 0.5 ? 1 : 0, sx: q, sy: 2 - q, rot: Math.sin(m.rt * 3) * 0.05 });
        m.meter(0, 140, 200, 14, m.k, C.pink);
    },
    bot(m, b) { b.drag(m.cxx + Math.cos(m.a + m.t * 1.1) * 96 * 1.1 * 0.02 * m.speed, m.cyy); },
});
