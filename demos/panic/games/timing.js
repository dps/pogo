// Timing games: one tap, right now. No, now.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

G({
    id: "stack", tags: "food quick", easy: true, feel: [18, 8], bg: [C.org, C.gold, "dots", 0.35], mood: "funk", icon: "pat", dur: 6, swipeLen: 999, hint: ["tap", 0, 60], home: [0, 60],
    art: { pat: [170, 44, (a, f) => { const c = [[C.dbrn, C.brn], [C.yel, C.gold], [C.grn, C.dgrn], [C.gold, C.org]][f]; a.R(6, 8, 158, 28, 13, c[0]); a.rr(14, 10, 140, 6, 3, "#ffffff55"); }, { frames: 4 }] },
    init(m) { m.s2 = [{ x: 0, f: 3 }]; m.n = 3; m.mx = -130; m.v = 150 + m.level * 40; m.drop = null; },
    tick(m, dt) {
        if (m.drop) {
            m.drop.y += 860 * dt; const top = 120 - m.s2.length * 30;
            if (m.drop.y >= top) {
                const under = m.s2.at(-1).x, off = m.drop.x - under;
                if (Math.abs(off) < 62) { m.s2.push({ x: m.drop.x, f: (m.s2.length) % 3 }); m.n--; m.hit(T("sine", 200, 90, 0.1, 0.2)); m.boom(m.drop.x, top, [C.yel, C.wht], 6); m.shake(2, 0.05); if (!m.n) m.win(); }
                else { m.boom(m.drop.x, top, [C.red, C.dbrn], 10); m.sfx(NOISE(0.2, 0.16)); m.lose(); }
                m.drop = null; m.mx = -130; m.v = Math.abs(m.v);
            }
            return;
        }
        m.mx += m.v * dt; if (Math.abs(m.mx) > 130) { m.v *= -1; m.mx = clamp(m.mx, -130, 130); }
        if (m.pressed) { m.drop = { x: m.mx, y: -124, f: m.s2.length % 3 }; m.sfx(T("sine", 700, 300, 0.1)); }
    },
    draw(m) {
        m.spr("pat", 0, 140, { f: 3, sx: 1.05 });
        m.s2.forEach((q, i) => m.spr("pat", q.x, 120 - i * 30, { f: q.f }));
        if (m.drop) m.spr("pat", m.drop.x, m.drop.y, { f: m.drop.f });
        else if (!m.over) m.spr("pat", m.mx, -124, { f: m.s2.length % 3 });
    },
    bot(m, b) { const tt = (244 - m.s2.length * 30) / 860, x = m.mx + m.v * tt * 0; if (!m.drop && Math.abs(m.mx + m.v * 0.05 * m.speed - m.s2.at(-1).x) < 22) b.tap(0, 60); },
});

G({
    id: "drop", tags: "quick", feel: [10, 10, 40], bg: [C.sky, C.wht, "wave", 0.25], mood: "march", icon: "piano", swipeLen: 999, hint: ["tap", 0, 60], home: [0, 60],
    art: {
        piano: [120, 90, (a) => { a.R(6, 8, 108, 60, 8, INK); a.R(14, 34, 92, 20, 2, C.wht); for (let i = 1; i < 8; i++) a.l(14 + i * 11.5, 34, 14 + i * 11.5, 54, INK, 2); a.R(18, 66, 10, 20, 2, INK).R(92, 66, 10, 20, 2, INK); }, { lw: 3 }],
        chop: [190, 80, (a) => { a.E(100, 50, 56, 24, C.red, C.mag); a.R(4, 44, 60, 10, 4, C.red); a.e(130, 46, 16, 12, C.sky); a.l(40, 18, 160, 18, INK, 5); a.l(100, 26, 100, 18, INK, 4); }],
        cart: [150, 80, (a) => { a.R(10, 10, 130, 46, 6, C.yel); a.C(40, 62, 13, INK).C(110, 62, 13, INK); }],
    },
    init(m) { m.hx = -150; m.vh = 120; m.cx2 = 0; m.va = m.rng.range(0, 6); m.p2 = null; m.n = 2; m.spl = 0; },
    tick(m, dt) {
        m.hx += m.vh * dt; if (Math.abs(m.hx) > 150) { m.vh *= -1; m.hx = clamp(m.hx, -150, 150); }
        m.cx2 = Math.sin(m.va + m.t * 1.3) * 90;
        if (m.pressed && !m.p2 && m.n > 0) { m.p2 = { x: m.hx, y: -110, vy: 0 }; m.n--; m.sfx(T("sine", 1200, 300, 0.4, 0.1)); }
        if (m.p2) {
            const q = m.p2; q.vy += 760 * dt; q.y += q.vy * dt;
            if (q.y > 74) {
                if (Math.abs(q.x - m.cx2) < 72) { m.hit([T("square", 130, 90, 0.3), T("square", 196, 90, 0.3), NOISE(0.15, 0.14)]); m.shake(8, 0.2); m.boom(q.x, 80, [C.wht, C.yel, INK], 22, { f: 5 }); m.p2 = null; m.spl = q.x; m.win(); }
                else { m.boom(q.x, 120, [INK, C.wht], 14, { f: 5 }); m.sfx(NOISE(0.25, 0.2)); m.p2 = null; if (!m.n) m.lose(); }
            }
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 260, { y: 240, color: C.grn });
        m.spr("cart", m.cx2, 104);
        if (m.spl || m.done === "win") m.spr("piano", m.cx2, 70);
        m.spr("chop", m.hx, -130, { flip: m.vh < 0 });
        if (m.p2) m.spr("piano", m.p2.x, m.p2.y, { rot: m.p2.vy * 0.0003 });
        else if (m.n > 0 && !m.over) m.spr("piano", m.hx, -86, { k: 0.8 });
    },
    bot(m, b) {
        if (m.p2 || !m.n) return;
        const tof = Math.sqrt(2 * 184 / 760), lag = 0.05 * m.speed;
        const x = m.hx + m.vh * lag, cart = Math.sin(m.va + (m.t + tof + lag) * 1.3) * 90;
        if (Math.abs(x) < 150 && Math.abs(x - cart) < 26) b.tap(0, 60);
    },
});

G({
    id: "strike", tags: "quick", feel: [46, 16], bg: [C.red, C.yel, "rays", 0.3], mood: "march", icon: "tower", swipeLen: 999, hint: ["tap", 0, 100], home: [0, 100],
    art: {
        tower: [100, 340, (a) => { a.R(34, 34, 32, 300, 6, C.paper); a.C(50, 22, 20, C.yel, C.gold); }],
        puck: [40, 30, (a) => { a.R(6, 6, 28, 16, 5, C.red); }],
        mallet: [130, 110, (a) => { a.L(60, 100, 60, 44, C.tan, 10); a.R(14, 8, 96, 44, 14, C.red); }],
    },
    init(m) { m.k = 0; m.ph = 0; m.st = 0; m.tries = 2; m.hitv = 0; m.y2 = 0; m.sw = 0; },
    tick(m, dt) {
        m.sw = Math.max(0, m.sw - dt * 5);
        if (m.st === 0) {
            m.ph += dt * (3.4 + m.level * 0.8); m.k = Math.abs(Math.sin(m.ph));
            if (m.pressed) {
                m.st = 1; m.hitv = m.k; m.y2 = 0; m.sw = 1; m.tries--; m.hit(T("sawtooth", 160, 70, 0.14, 0.2)); m.shake(5, 0.12); m.boom(0, 136, [C.yel, C.wht], 8);
            }
        } else {
            m.y2 += dt * 4.4;
            const h = Math.sin(clamp(m.y2) * Math.PI / 2) * m.hitv;
            if (m.y2 >= 1 && m.st === 1) {
                m.st = 2;
                if (m.hitv > 0.85) { m.hit([T("square", 1568, undefined, 0.5, 0.14), T("square", 2093, undefined, 0.5, 0.1)], [46, 20, 46]); m.boom(0, -150, [C.yel, C.wht, C.pink], 24); m.win(); }
                else if (m.tries <= 0) { m.sfx(T("sawtooth", 240, 90, 0.3)); m.lose(); }
            }
            if (m.y2 > 1.8 && !m.over) { m.st = 0; m.ph = 0; }
        }
    },
    draw(m, d) {
        m.spr("tower", 60, -16);
        d.rect(30, 42, { x: 60, y: -112, color: C.grn, radius: 3 });
        for (let i = 0; i < 9; i++) d.rect(12, 3, { x: 60, y: 130 - i * 30, color: INK });
        const v = m.st ? Math.sin(clamp(m.y2) * Math.PI / 2) * m.hitv * Math.max(0, m.y2 < 1 ? 1 : 2 - m.y2) : 0;
        m.spr("puck", 60, 122 - v * 260);
        const kx = -70; m.meter(kx, 0, 34, 260, m.k, m.k > 0.85 ? C.grn : C.org, 0.85);
        m.spr("mallet", -8, 104 - m.sw * 20, { rot: m.sw ? 0.9 - m.sw * 0.9 : -0.3 + Math.sin(m.ph * 2) * 0.08 });
    },
    bot(m, b) { if (m.st === 0) { const c = m.ph + 3.4 * 0.05 * m.speed; if (Math.abs(Math.sin(c)) > 0.93) b.tap(0, 100); } },
});

G({
    id: "throw", tags: "quick steady", feel: [14, 4], bg: [C.dgrn, C.lime, "tri", 0.2], mood: "surf", icon: "board", swipeLen: 999, hint: ["tap", 0, 100], home: [0, 130],
    art: {
        board: [260, 260, (a) => { a.C(130, 130, 120, INK); for (let i = 0; i < 20; i++) { const t0 = i * TAU / 20, t1 = (i + 1) * TAU / 20; a.p([[130, 130], [130 + Math.cos(t0) * 112, 130 + Math.sin(t0) * 112], [130 + Math.cos(t1) * 112, 130 + Math.sin(t1) * 112]], i % 2 ? C.paper : INK); } a.c(130, 130, 70, C.grn).c(130, 130, 62, C.paper).c(130, 130, 40, C.red).c(130, 130, 32, C.paper).c(130, 130, 16, C.red); }, { dots: false, lw: 3 }],
        dart: [40, 90, (a) => { a.P([[20, 4], [24, 34], [16, 34]], C.gry); a.R(14, 34, 12, 32, 3, C.pink); a.P([[20, 60], [36, 86], [4, 86]], C.yel); }],
        cross: [80, 80, (a) => { a.arc(40, 40, 30, 30, 0, TAU, C.wht, 5); a.l(40, 2, 40, 26, C.wht, 5).l(40, 54, 40, 78, C.wht, 5).l(2, 40, 26, 40, C.wht, 5).l(54, 40, 78, 40, C.wht, 5); }, { lw: 2, dots: false }],
    },
    init(m) { m.a = m.rng.range(0, 6); m.n = 3; m.st2 = []; m.fly = null; m.cx2 = 0; m.cy2 = 0; this.mv(m); },
    mv(m) { m.cx2 = Math.sin(m.a + m.t * 2.3) * 92; m.cy2 = -24 + Math.sin(m.a * 1.4 + m.t * 3.1) * 86; },
    tick(m, dt) {
        this.mv(m);
        if (m.fly) { m.fly.t += dt * 7; if (m.fly.t >= 1) { const q = m.fly; m.st2.push(q); m.fly = null; m.hit(T("square", 400, 120, 0.06)); if (dist(q.x, q.y, 0, -24) < 42) { m.boom(q.x, q.y, [C.yel, C.red, C.wht], 20); m.ring(0, -24, C.yel, 90); m.win(); } else if (!m.n) m.lose(); } return; }
        if (m.pressed && m.n > 0) { m.fly = { x: m.cx2, y: m.cy2, t: 0 }; m.n--; m.sfx(T("sine", 900, 400, 0.1)); }
    },
    draw(m) {
        m.spr("board", 0, -24);
        for (const q of m.st2) m.spr("dart", q.x, q.y + 32, { k: 0.7 });
        if (m.fly) m.spr("dart", m.fly.x, 150 + (m.fly.y - 150) * m.fly.t + 30, { k: 1.5 - m.fly.t * 0.8 });
        if (!m.over) m.spr("cross", m.cx2, m.cy2);
        for (let i = 0; i < m.n; i++) m.spr("dart", -30 + i * 30, 140, { k: 0.6 });
    },
    bot(m, b) { const lag = 0.05 * m.speed, x = Math.sin(m.a + (m.t + lag) * 2.3) * 92, y = -24 + Math.sin(m.a * 1.4 + (m.t + lag) * 3.1) * 86; b.aim(0, 130); if (!m.fly && Math.hypot(x, y + 24) < 30) b.tap(0, 130); },
});

G({
    id: "snap", tags: "zoo quick", feel: [8, 60, 4], bg: [C.dgrn, C.grn, "tri", 0.3], mood: "spooky", icon: "squatch", swipeLen: 999, hint: ["tap", 0, 120], home: [0, 120],
    art: {
        squatch: [110, 160, (a, f) => { a.E(56, 88, 44, 60, C.dbrn, "#3a1f10"); a.C(56, 38, 30, C.dbrn); a.e(56, 42, 19, 14, C.tan); a.eye(46, 38, 6, 0.8, 0).eye(66, 38, 6, 0.8, 0); a.L(18, 76, 8 + f * 8, 120, C.dbrn, 12).L(92, 76, 104 - f * 8, 120, C.dbrn, 12); a.L(38, 136, 34 - f * 10, 156, C.dbrn, 12).L(74, 136, 78 + f * 10, 156, C.dbrn, 12); }, { frames: 2 }],
        tree: [110, 300, (a) => { a.R(42, 170, 26, 128, 4, C.brn); a.P([[55, 4], [104, 130], [6, 130]], C.dgrn); a.P([[55, 60], [108, 200], [2, 200]], C.dgrn); }],
    },
    init(m) { m.xx = -240; m.v = 150 + m.level * 40; m.n = 2; m.fl = 0; m.got = false; },
    tick(m, dt) {
        m.fl = Math.max(0, m.fl - dt * 3 / m.speed);
        if (!m.got) { m.xx += m.v * dt; if (m.xx > 260) { m.xx = -260; } }
        if (m.pressed && m.n > 0) {
            m.n--; m.fl = 1; m.flash(C.wht, 0.15); m.hit([NOISE(0.05, 0.14), T("square", 2200, undefined, 0.03, 0.08)]);
            if (Math.abs(m.xx) < 58) { m.got = true; m.boom(0, 0, [C.yel, C.wht], 16, { f: 0 }); m.win(); } else if (!m.n) m.lose();
        }
    },
    draw(m, d) {
        m.spr("tree", -130, -10, {}); m.spr("tree", 136, 0, {});
        d.rect(m.R - m.L + 4, 120, { y: 150, color: C.dgrn });
        m.spr("squatch", m.xx, 28 + Math.abs(Math.sin(m.rt * 7)) * -5, { f: (m.rt * 8 | 0) % 2 });
        const w = 120, h = 150, c = C.wht;
        d.rect(w, 6, { y: -h / 2 + 28, color: c }); d.rect(w, 6, { y: h / 2 + 28, color: c }); d.rect(6, h, { x: -w / 2, y: 28, color: c }); d.rect(6, h, { x: w / 2, y: 28, color: c });
        d.circle(9, { x: 0, y: 28, color: C.red, opacity: 0.8 });
    },
    bot(m, b) { const x = m.xx + m.v * 0.05 * m.speed; if (Math.abs(x) < 30) b.tap(0, 120); },
});

G({
    id: "draw", tags: "quick", feel: [80], bg: [C.org, C.red, "stripes", 0.2], survive: false, mood: "spooky", dur: 6, icon: "robo2", swipeLen: 999, hint: ["none"], outro: 0.8, home: [0, 100],
    art: {
        robo2: [140, 200, (a, f) => { a.R(16, 20, 108, 12, 4, C.brn).R(40, 0, 60, 26, 6, C.brn); a.R(38, 30, 64, 54, 8, C.gry); a.R(50, 44, 40, 14, 3, f ? C.red : C.cyan); a.R(30, 90, 80, 74, 8, C.dgry); a.L(46, 164, 46, 196, C.gry, 10).L(94, 164, 94, 196, C.gry, 10); if (f === 2) { a.l(36, 30, 104, 90, C.red, 6); } }, { frames: 3 }],
        gun: [110, 60, (a) => { a.R(30, 8, 74, 18, 3, C.pink); a.R(12, 20, 24, 36, 6, C.cyan); }],
    },
    init(m) { m.go = m.rng.range(0.9, 2.6); m.live = false; m.rt0 = 0; m.fire = 0; },
    tick(m, dt) {
        if (!m.live && m.t >= m.go && !m.over) { m.live = true; m.rt0 = m.rt; m.sfx([T("square", 1760, undefined, 0.2, 0.14), T("square", 2093, undefined, 0.2, 0.1)]); m.buzz("warn"); m.flash(C.yel, 0.1); }
        if (m.pressed) {
            if (!m.live) { m.sfx(T("sawtooth", 300, 120, 0.2)); m.fire = 1; m.lose(); return; }
            m.hit([NOISE(0.12, 0.22), T("square", 300, 60, 0.2)]); m.fire = 1; m.shake(8, 0.2); m.boom(0, -60, [C.yel, C.org, C.wht], 24); m.win();
        }
        if (m.live && !m.over && m.rt - m.rt0 > 0.62) { m.sfx([NOISE(0.12, 0.22)]); m.shake(10, 0.3); m.lose(); }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 300, { y: 230, color: C.gold });
        m.spr("robo2", 0, -50, { f: m.done === "win" ? 2 : m.live ? 1 : 0, rot: m.done === "win" ? Math.min(1.4, m.overT * 5) : 0 });
        m.spr("gun", 30, 110 - (m.fire ? 22 : 0), { rot: m.fire ? -0.5 : 0 });
        if (m.live && !m.over) { d.sprite("fx", { x: 0, y: -160 + 20, width: 100, height: 100, frame: 4, color: C.yel, rot: m.rt * 4 }); d.sprite("fx", { x: 0, y: -140, width: 58, height: 58, frame: 0, color: C.red }); }
    },
    bot(m, b) { if (m.live && m.rt - m.rt0 > 0.22) b.tap(0, 100); },
});

G({
    id: "clap", tags: "quick", feel: [12, 12, 12], bg: [C.pink, C.yel, "rays", 0.3], mood: "bouncy", icon: "mitt", dur: 6, swipeLen: 999, hint: ["tap", 0, 120], home: [0, 120],
    art: {
        mitt: [120, 150, (a, f) => { a.R(22, 40, 76, 80, 26, C.wht); for (let i = 0; i < 4; i++) a.R(26 + i * 18, 10, 14, 44, 6, C.wht); a.P([[96, 80], [118, 40], [108, 96]], C.wht); a.R(30, 112, 60, 30, 8, f ? C.yel : C.pink); }, { frames: 2 }],
    },
    init(m) { m.b = 0.75; m.gap = 0.62; m.beats = []; for (let i = 0; i < 4; i++) m.beats.push({ at: 0.9 + i * m.gap, ok: false, miss: false }); m.at = 0; m.sq = 0; },
    tick(m, dt) {
        m.sq = Math.max(0, m.sq - dt * 6);
        const q = m.beats[m.at];
        if (!q) return;
        for (const u of m.beats) if (!u.tk && m.t > u.at - dt) { u.tk = 1; m.sfx(T("square", 880, undefined, 0.03, 0.06)); }
        if (m.pressed) {
            m.sq = 1;
            if (Math.abs(m.t - q.at) < 0.17) { q.ok = true; m.at++; m.hit([NOISE(0.05, 0.2), T("sine", 300, 180, 0.05, 0.14)]); m.ring(0, 0, C.yel, 120); m.boom(0, 0, [C.yel, C.wht], 8, { f: 0 }); if (m.at >= 4) m.win(); }
            else { m.sfx(T("sawtooth", 200, 110, 0.2)); m.lose(); }
        } else if (m.t > q.at + 0.17 && !m.over) { m.sfx(T("sawtooth", 200, 110, 0.2)); m.lose(); }
    },
    draw(m, d) {
        const q = m.beats[m.at], g = q ? clamp((q.at - m.t) / m.gap) : 0, s = m.sq;
        if (q) { const r = 44 + g * 130; d.rect(r * 2, r * 2, { radius: 999, outline: 7, color: C.wht, opacity: 0.4 + (1 - g) * 0.6 }); }
        d.rect(90, 90, { radius: 999, outline: 7, color: C.yel });
        const o = 60 - s * 46; m.spr("mitt", -o - 16, 0, { rot: 0.3 }); m.spr("mitt", o + 16, 0, { flip: true, rot: -0.3 });
        m.beats.forEach((u, i) => m.d.circle(11, { x: -48 + i * 32, y: 130, color: u.ok ? C.grn : C.paper }));
    },
    bot(m, b) { b.aim(0, 120); const q = m.beats[m.at]; if (q && m.t > q.at - 0.05 * m.speed) b.tap(0, 120); },
});

G({
    id: "jump", tags: "quick", easy: true, feel: [14], bg: [C.sky, C.yel, "plus", 0.3], survive: true, mood: "chip", icon: "knight", swipeLen: 999, hint: ["tap", 0, 100], home: [0, 100],
    art: {
        knight: [76, 96, (a, f) => { a.L(28, 70, 22 + f * 10, 90, C.gry, 8).L(48, 70, 54 - f * 10, 90, C.gry, 8); a.R(18, 36, 40, 40, 8, C.gry); a.C(38, 22, 18, C.gry); a.R(26, 18, 26, 6, 2, INK); a.P([[38, 6], [52, -2 + 4], [44, 12]], C.red); }, { frames: 2 }],
        cheese: [84, 84, (a) => { a.C(42, 42, 34, C.yel, C.gold); a.c(30, 32, 7, C.gold).c(54, 48, 9, C.gold).c(34, 58, 5, C.gold); a.eye(44, 28, 5, -1, 0); }],
    },
    init(m) { m.yy = 0; m.vy = 0; m.o = [{ x: 240 }, { x: 240 + 250 + m.rng.range(0, 60) }, { x: 840 }]; },
    tick(m, dt) {
        if (m.pressed && m.yy >= 0) { m.vy = -520; m.hit(T("square", 300, 700, 0.1)); }
        if (m.yy < 0 || m.vy < 0) { m.vy += 1150 * dt; m.yy += m.vy * dt; if (m.yy >= 0) { m.yy = 0; m.vy = 0; m.boom(-90, 110, [C.wht], 3, { v1: 90, f: 3 }); } }
        for (const q of m.o) { q.x -= 200 * dt; if (Math.abs(q.x + 90) < 40 && m.yy > -50 && !m.over) { m.boom(-90, 80, [C.yel, C.gry], 12); m.sfx(NOISE(0.2, 0.18)); m.lose(); } }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 300, { y: 268, color: C.dgrn });
        for (const q of m.o) m.spr("cheese", q.x, 88, { rot: -q.x * 0.03 });
        m.spr("knight", -90, 74 + m.yy, { f: m.yy < 0 ? 1 : (m.rt * 10 | 0) % 2 });
    },
    bot(m, b) { b.aim(0, 100); const q = m.o.find((u) => u.x > -130); if (q && q.x + 90 < 90 + 0.04 * 200 * m.speed && m.yy >= 0) b.tap(0, 100); },
});

G({
    id: "boo", tags: "quick", feel: [40, 10], bg: [C.navy, C.pur, "scale", 0.3], mood: "spooky", icon: "ghost", swipeLen: 999, hint: ["tap", 0, 120], home: [0, 120], outro: 0.7,
    art: {
        ghost: [120, 150, (a, f) => { a.R(16, 20, 88, 106, 42, C.wht); for (let i = 0; i < 4; i++) a.C(28 + i * 21, 126, 12, C.wht); a.eye(44, 62, 10, 0, 0).eye(76, 62, 10, 0, 0); if (f) a.E(60, 96, 14, 18, INK); else a.smile(60, 92, 10, 4); }, { frames: 2 }],
        guy: [80, 150, (a, f) => { a.R(20, 56, 40, 60, 8, C.org); a.C(40, 32, 22, C.skin); if (f) { a.eye(32, 28, 8, 0, 0).eye(50, 28, 8, 0, 0); a.E(40, 46, 6, 8, INK); } else { a.eye(46, 28, 5, 0.6, 0); a.smile(48, 42, 6, 3); } a.L(30, 116, 30, 144, C.navy, 7).L(50, 116, 50, 144, C.navy, 7); }, { frames: 2 }],
        door: [130, 260, (a) => { a.R(10, 10, 110, 240, 6, "#3a2a5c"); a.R(24, 26, 82, 80, 4, "#2a1f46"); a.R(24, 122, 82, 110, 4, "#2a1f46"); a.C(100, 130, 6, C.gold); }],
    },
    init(m) { m.xx = -220; m.v = 160 + m.level * 40; m.n = 1; m.pk = 0; m.jump = 0; },
    tick(m, dt) {
        m.pk += ((m.done === "win" ? 1 : 0.12) - m.pk) * Math.min(1, dt * 18);
        if (m.done === "win") { m.jump += dt * 6; return; }
        m.xx += m.v * dt;
        if (m.pressed) {
            if (m.xx > -80 && m.xx < 72) { m.hit([T("sawtooth", 200, 900, 0.3), NOISE(0.15, 0.14)]); m.shake(6, 0.2); m.boom(m.xx, 0, [C.yel, C.wht], 20); m.win(); }
            else { m.sfx(T("sine", 300, 120, 0.3)); m.lose(); }
        }
        if (m.xx > 140 && !m.over) m.lose();
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 300, { y: 240, color: "#23203a" });
        const g = m.pk;
        m.spr("ghost", -22 + g * 60, -14, { f: m.done === "win" ? 1 : 0, k: 1 + g * 0.5 });
        m.spr("door", -60 - g * 26, 10);
        m.spr("guy", m.xx, 26 - Math.sin(Math.min(1.57, m.jump)) * 70, { f: m.done === "win" ? 1 : 0, rot: m.done ? 0 : Math.sin(m.rt * 8) * 0.04 });
        d.rect(150, 6, { x: -4, y: 104, color: C.yel, opacity: 0.6 });
    },
    bot(m, b) { if (m.xx + m.v * 0.05 * m.speed > -30) b.tap(0, 120); },
});
