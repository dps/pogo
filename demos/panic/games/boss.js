// Boss microgames: three phases, one loud enemy, and a bell back if you beat them.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

G({
    id: "fight", boss: true, tags: "boss food", feel: [40, 20, 40], bg: [C.mag, C.yel, "rays", 0.25], dur: 13, mood: "march", icon: "kaiju", swipeLen: 999, hint: ["tap", 0, -70], home: [0, 60], snap: (m) => [...m.cher.map((q) => [q.x, q.y]), ...(m.ph ? [[m.wx, m.wy]] : [])], outro: 1,
    art: {
        kaiju: [260, 240, (a, f) => {
            a.P([[20, 230], [36, 110], [224, 110], [240, 230]], C.rose); for (let i = 0; i < 8; i++) a.l(44 + i * 24, 124, 40 + i * 25, 224, C.pink, 5);
            a.E(130, 92, 118, 58, C.paper); a.C(70, 104, 32, C.paper).C(130, 112, 36, C.paper).C(190, 104, 32, C.paper); a.c(130, 34, 22, C.red); a.l(130, 16, 146, 0, C.dgrn, 4);
            if (f === 2) { a.l(70, 70, 106, 106, INK, 7).l(106, 70, 70, 106, INK, 7).l(154, 70, 190, 106, INK, 7).l(190, 70, 154, 106, INK, 7); a.E(130, 148, 26, 16, INK); }
            else { a.eye(88, 86, 22, 0, 0.3).eye(172, 86, 22, 0, 0.3); a.l(62, 58, 112, 72, INK, 8).l(198, 58, 148, 72, INK, 8); a.P([[92, 132], [168, 132], [150, 160], [130, 148], [110, 160]], INK); if (f) a.flash; }
        }, { frames: 3 }],
        cherry: [50, 50, (a) => { a.C(25, 30, 17, C.red, C.mag); a.c(19, 24, 4, "#ffffffbb"); a.l(25, 14, 34, 2, C.dgrn, 3); }],
        city: [340, 80, (a) => { for (let i = 0; i < 9; i++) { const h = 30 + (i * 37) % 46, x = 6 + i * 37; a.R(x, 76 - h, 32, h, 3, i % 2 ? C.navy : C.pur); for (let y = 0; y < h - 12; y += 12) a.r(x + 8, 76 - h + 6 + y, 6, 6, C.yel).r(x + 18, 76 - h + 6 + y, 6, 6, C.yel); } }],
        spot: [70, 70, (a) => { a.C(35, 35, 26, C.yel); a.C(35, 35, 13, C.red); }],
    },
    init(m) { m.ph = 0; m.hp = 6; m.cher = []; m.next = 0.2; m.thrown = 0; m.need = 6; m.wx = 0; m.wy = -60; m.cool = 0; m.hurt = 0; m.city = 3; },
    tick(m, dt) {
        m.hurt = Math.max(0, m.hurt - dt * 5); m.cool = Math.max(0, m.cool - dt);
        if (m.done === "win") return;
        m.next -= dt;
        if (m.next <= 0 && m.thrown < m.need && m.ph === 0) { m.thrown++; m.next = 0.8 - m.level * 0.15; m.cher.push({ x: m.rng.range(-130, 130), y: -60, vx: 0, vy: 40, s: 1 }); m.hit(T("sine", 600, 300, 0.1), "tick"); }
        for (const q of m.cher) {
            q.vy += 140 * dt; q.y += q.vy * dt;
            if (q.y > 118 && !m.over) { q.dead = true; m.city--; m.shake(5, 0.15); m.boom(q.x, 118, [C.red, C.yel], 14); m.sfx(NOISE(0.2, 0.2)); if (m.city <= 0) m.lose(); }
        }
        if (m.pressed) {
            const q = m.cher.find((u) => dist(u.x, u.y, m.x, m.y) < 44);
            if (q) { q.dead = true; m.hit(T("square", 900, 400, 0.08), [10, 12]); m.boom(q.x, q.y, [C.red, C.wht], 10); m.freeze(0.03); }
            else if (m.ph === 1 && dist(m.wx, m.wy, m.x, m.y) < 46) {
                m.hp--; m.hurt = 1; m.hit([T("square", 180, 70, 0.14), NOISE(0.1, 0.14)]); m.boom(m.wx, m.wy, [C.yel, C.pink, C.wht], 14); m.shake(6, 0.15); m.freeze(0.06);
                m.wx = m.rng.range(-110, 110); m.wy = m.rng.range(-110, -10);
                if (m.hp <= 0) { m.boom(0, -40, [C.pink, C.yel, C.paper, C.wht], 44, { v0: 200, v1: 600 }); m.shake(14, 0.5); m.hit([T("sawtooth", 220, 40, 0.7), NOISE(0.5, 0.2)], [80, 40, 120, 40, 200]); m.win(); }
            }
        }
        m.cher = m.cher.filter((q) => !q.dead);
        if (m.ph === 0 && m.thrown >= m.need && !m.cher.length) { m.ph = 1; m.sfx(T("sawtooth", 200, 800, 0.3)); m.hurt = 1; }
    },
    draw(m) {
        const w = Math.sin(m.rt * 3) * 6, sink = m.done === "win" ? m.overT * 200 : 0;
        m.spr("city", 0, 124);
        m.spr("kaiju", w, -56 + sink, { f: m.done === "win" ? 2 : m.hurt > 0 ? 1 : 0, rot: Math.sin(m.rt * 5) * 0.03, sy: 1 - m.hurt * 0.06, sx: 1 + m.hurt * 0.06 });
        for (const q of m.cher) m.spr("cherry", q.x, q.y, { rot: q.y * 0.02 });
        if (m.ph === 1 && !m.over) m.spr("spot", m.wx, m.wy, { k: 1 + Math.sin(m.rt * 12) * 0.12 });
        if (m.ph === 1) m.meter(0, m.T + 22, 200, 12, m.hp / 6, C.red);
    },
    bot(m, b) { const q = [...m.cher].sort((u, v) => v.y - u.y)[0]; if (q && q.y > -30) { b.tap(q.x, q.y + q.vy * 0.05 * m.speed); return; } if (m.ph === 1) b.tap(m.wx, m.wy); },
});

G({
    id: "defuse", boss: true, tags: "boss brain", feel: [6, 6, 60], bg: [C.dgry, C.red, "stripes", 0.2], dur: 13, keys: "swipe", mood: "spooky", icon: "bomb", swipeLen: 24, hint: ["swipe", -120, -60, 120, -20], outro: 1,
    art: {
        bomb: [300, 260, (a) => { a.C(150, 140, 112, "#3a3648", INK); a.e(106, 96, 36, 22, "#ffffff33"); a.R(120, 24, 60, 26, 6, C.gry); a.R(70, 110, 160, 74, 8, "#16151f"); }],
        snips: [80, 90, (a, f) => { const g = f ? 2 : 16; a.L(40, 44, 40 - g, 8, C.gry, 7).L(40, 44, 40 + g, 8, C.gry, 7); a.L(40, 44, 22, 80, C.red, 7).L(40, 44, 58, 80, C.red, 7); }, { frames: 2, lw: 2.5 }],
    },
    init(m) {
        const COL = [C.red, C.cyan, C.yel, C.grn], ys = [-92, -46, 0, 46];
        m.w = ys.map((y, i) => ({ y, c: COL[i], cut: false, i }));
        m.ord = m.rng.shuffle([0, 1, 2, 3]); m.st = 0; m.i = 0; m.tm = 0.5; m.lit = -1; m.lt = 0; m.at = 0; m.round = 0; m.rounds = 1;
    },
    tick(m, dt) {
        m.lt -= dt; if (m.lt <= 0) m.lit = -1;
        if (m.st === 0) {
            m.tm -= dt;
            if (m.tm <= 0) { if (m.i < 4) { m.lit = m.ord[m.i]; m.lt = 0.42; m.i++; m.tm = 0.62; m.hit(T("square", 500 + m.lit * 130, undefined, 0.16, 0.12), "tick"); } else { m.st = 1; m.sfx(T("sine", 900, 1400, 0.1)); } }
            return;
        }
        let cut = -1;
        if (m.keyboard && m.swipe) cut = m.ord[m.at];
        else if (m.flick && Math.abs(m.flick.dx) > 18) { const y = (m.flick.y0 + m.flick.y1) / 2, q = m.w.filter((u) => !u.cut).sort((u, v) => Math.abs(u.y - y) - Math.abs(v.y - y))[0]; if (q && Math.abs(q.y - y) < 30) cut = q.i; }
        if (cut >= 0) {
            const q = m.w[cut];
            if (m.ord[m.at] === cut) { q.cut = true; m.at++; m.hit([NOISE(0.04, 0.2), T("square", 1600, 300, 0.05)]); m.boom(0, q.y, [q.c, C.wht], 10); m.freeze(0.04); if (m.at >= 4) { m.boom(0, 0, [C.grn, C.wht], 30, { v1: 400 }); m.hit(T("sine", 660, 1320, 0.3), [10, 30, 10, 30, 80]); m.win(); } }
            else { m.boom(0, 0, [C.red, C.org, C.yel, INK], 50, { v0: 200, v1: 700, life: 1 }); m.shake(16, 0.5); m.hit([NOISE(0.5, 0.26), T("sawtooth", 200, 30, 0.6)], "heavy"); m.lose(); }
        }
    },
    draw(m, d) {
        m.spr("bomb", 0, 36);
        const wob = m.st === 1 ? Math.sin(m.rt * 20) * 1.2 : 0;
        for (const q of m.w) {
            const on = m.lit === q.i, y = q.y + wob;
            if (q.cut) { m.line(-140, y, -22, y + 8, q.c, 9); m.line(22, y - 8, 140, y, q.c, 9); }
            else m.line(-140, y, 140, y, q.c, on ? 15 : 9);
            if (on) m.d.rect(292, 34, { y, color: C.wht, opacity: 0.5, radius: 12 });
        }
        for (let i = 0; i < 4; i++) m.d.circle(11, { x: -48 + i * 32, y: 94, color: i < m.at ? C.grn : "#3a3648" });
        if (m.st === 1 && !m.over && !m.keyboard) m.spr("snips", m.x, m.y + 26, { f: m.down ? 1 : 0 });
    },
    bot(m, b) {
        if (m.st !== 1) return;
        if (b.mode === "keys") { b.dir("right"); return; }
        const y = m.w[m.ord[m.at]].y; b.swipe(-90, y, 90, y, 5);
    },
});

G({
    id: "conduct", boss: true, tags: "boss zoo", feel: [8, 12, 8, 12, 8], bg: [C.navy, C.pink, "rings", 0.18], dur: 15, keys: "swipe", mood: "march", icon: "toad", swipeLen: 24, hint: ["swipe", -60, 40, 60, 40], outro: 1,
    art: {
        toad: [100, 110, (a, f) => { a.E(50, 72, 40, 34, C.grn, C.dgrn); a.C(30, 34, 15, C.grn).C(70, 34, 15, C.grn); a.eye(30, 32, 8, 0, 0).eye(70, 32, 8, 0, 0); if (f) { a.E(50, 74, 20, 16, INK).e(50, 80, 10, 6, C.pink); } else a.smile(50, 66, 20, 8); a.R(36, 96, 28, 12, 4, C.red); }, { frames: 2 }],
        note: [64, 64, (a) => { a.P([[32, 6], [58, 34], [42, 34], [42, 58], [22, 58], [22, 34], [6, 34]], C.yel); }],
        wand: [30, 120, (a) => { a.R(10, 6, 10, 100, 4, C.wht); a.R(6, 100, 18, 16, 4, C.brn); }],
    },
    init(m) {
        const dirs = ["left", "right", "up", "down"]; m.seq = []; const n = 10; let t = 1.3, last = "";
        for (let i = 0; i < n; i++) { let q; do { q = m.rng.pick(dirs); } while (q === last); last = q; m.seq.push({ d: q, at: t, hit: false }); t += 1.05; }
        m.at = 0; m.miss = 0; m.pose = 0; m.cheer = 0; m.maxMiss = 3;
    },
    tick(m, dt) {
        m.pose = Math.max(0, m.pose - dt * 5); m.cheer = Math.max(0, m.cheer - dt);
        const q = m.seq[m.at];
        if (!q) { m.boom(0, 0, [C.yel, C.pink, C.cyan], 40, { v1: 500, f: 1 }); m.win(); return; }
        if (m.swipe) {
            if (Math.abs(m.t - q.at) < 0.4 && m.swipe === q.d) { q.hit = true; m.at++; m.pose = 1; m.hit(T("square", [523, 659, 784, 1047, 880][m.at % 5], undefined, 0.14, 0.14)); m.boom(0, 74, [C.yel, C.wht], 6, { f: 1 }); m.ring(0, -72, C.yel, 60); }
            else { m.miss++; m.sfx(T("sawtooth", 180, 110, 0.15)); m.shake(3, 0.1); if (m.miss >= m.maxMiss) m.lose(); }
        } else if (m.t > q.at + 0.4 && !m.over) { m.at++; m.miss++; m.sfx(T("sawtooth", 150, 90, 0.2)); if (m.miss >= m.maxMiss) m.lose(); }
    },
    draw(m, d) {
        const y0 = -72, A = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
        d.rect(m.R - m.L + 4, 70, { y: y0, color: INK, opacity: 0.5 });
        d.rect(4, 76, { x: -100, y: y0, color: C.wht });
        d.rect(70, 70, { x: -100, y: y0, radius: 999, outline: 5, color: C.yel });
        for (let i = m.at; i < m.seq.length; i++) { const q = m.seq[i], x = -100 + (q.at - m.t) * 170; if (x > m.R + 40) break; m.spr("note", x, y0, { rot: A[q.d], k: i === m.at ? 1.1 : 0.9 }); }
        for (let i = 0; i < 5; i++) m.spr("toad", (i - 2) * 66, 104 - Math.abs(i - 2) * 6 - (m.pose > 0 ? 14 * m.pose : 0), { f: m.pose > 0 || (m.rt * 3 + i | 0) % 2 ? 1 : 0, k: 0.74 });
        m.spr("wand", 0, 26, { rot: m.pose * (m.at % 2 ? 1 : -1) * 0.9 });
        for (let i = 0; i < m.maxMiss; i++) m.d.circle(8, { x: -22 + i * 22, y: m.T + 20, color: i < m.miss ? C.red : C.grn });
    },
    bot(m, b) { const q = m.seq[m.at]; if (q && m.t > q.at - 0.08 * m.speed) b.dir(q.d, 0, 40); },
});

G({
    id: "ride", boss: true, tags: "boss steady zoo", feel: [20, 4, 20], bg: [C.org, C.red, "rays", 0.3], dur: 11, survive: true, keySpeed: 420, mood: "funk", icon: "bull", swipeLen: 999, hint: ["drag", -60, 120, 60, 120], home: [0, 120], outro: 1,
    art: {
        bull: [300, 170, (a, f) => {
            a.E(150, 96, 124, 58, C.brn, C.dbrn); a.R(46, 130, 34, 36, 8, C.dbrn).R(220, 130, 34, 36, 8, C.dbrn);
            a.C(40, 72, 42, C.brn); a.P([[8, 42], [-2 + 6, 8], [30, 34]], C.paper).P([[72, 42], [82, 8], [50, 34]], C.paper); a.e(24, 96, 20, 13, C.rose); a.c(16, 96, 3, INK).c(30, 96, 3, INK);
            a.eye(24, 64, 8, -0.2, 0.2).eye(56, 64, 8, -0.2, 0.2); a.l(12, 50, 34, 58, INK, 5).l(70, 50, 48, 58, INK, 5); a.L(270, 70, 294, 100 - f * 20, C.dbrn, 6);
        }, { frames: 2 }],
        rider: [70, 110, (a) => { a.R(16, 40, 38, 42, 8, C.red); a.R(6, 26, 58, 8, 3, C.brn); a.R(20, 6, 30, 22, 6, C.brn); a.C(35, 38, 14, C.skin); a.eye(29, 36, 5, 0, 0).eye(41, 36, 5, 0, 0); a.L(24, 82, 16, 104, C.navy, 7).L(46, 82, 54, 104, C.navy, 7); }],
    },
    init(m) { m.lean = 0; m.bal = 0; m.v = 0; m.buck = 0; m.a = m.rng.range(0, 6); m.px2 = 0; m.next = 0.6; m.push = 0.6; m.stay = 1; },
    tick(m, dt) {
        const lvl = 1 + m.p * 0.5;
        m.next -= dt;
        if (m.next <= 0) { m.next = 1.1 / lvl; m.push = (m.rng.chance(0.5) ? 1 : -1) * m.rng.range(0.5, 1); m.buck = 1; m.hit(T("sawtooth", 120, 70, 0.14, 0.2)); m.shake(4, 0.12); m.boom(0, 120, [C.brn, C.tan], 6, { a0: 3.5, a1: 6 }); }
        m.buck = Math.max(0, m.buck - dt * 3);
        m.lean += (m.push - m.lean) * Math.min(1, dt * 3.4);
        m.px2 += (clamp(m.x, -130, 130) - m.px2) * Math.min(1, dt * 22 / m.speed);
        const want = -m.lean * 120, e = (m.px2 - want) / 120;
        m.stay = clamp(m.stay - Math.max(0, Math.abs(e) - 0.3) * dt * 1.3 + dt * 0.1);
        if (m.stay <= 0 && !m.over) { m.sfx(T("sawtooth", 500, 90, 0.4)); m.lose(); }
    },
    draw(m, d) {
        const r = m.lean * 0.34, y = 40 - m.buck * 30;
        d.rect(m.R - m.L + 4, 240, { y: 240, color: C.gold });
        m.d.push(); m.d.translate(0, y); m.d.rotate(r);
        m.spr("bull", 0, 20, { f: (m.rt * 6 | 0) % 2 });
        const off = (m.px2 + m.lean * 120) * 0.4;
        m.spr("rider", off * 0.8, -72, { rot: -r * 1.4 + off * 0.008 + (m.done === "fail" ? m.overT * 5 : 0) });
        m.d.pop();
        d.rect(30, 12, { x: -m.lean * 120, y: 126, color: C.grn, radius: 5 });
        m.d.rect(14, 22, { x: m.px2, y: 126, color: C.wht, radius: 5 });
        m.meter(0, m.T + 22, 200, 12, m.stay, m.stay < 0.35 ? C.red : C.grn);
    },
    bot(m, b) { b.drag(clamp(-m.lean * 120, -125, 125), 120); },
});

G({
    id: "outrun", boss: true, tags: "boss quick", feel: [10, 4, 10], bg: [C.navy, C.red, "zig", 0.2], dur: 11, keys: "swipe", mood: "surf", icon: "lava", swipeLen: 22, hint: ["swipe", -40, 30, 60, 30], outro: 1,
    art: {
        lava: [340, 60, (a) => { a.r(0, 26, 340, 34, C.org); for (let i = 0; i < 9; i++) a.c(20 + i * 40, 26, 22, C.org); for (let i = 0; i < 6; i++) a.c(30 + i * 58, 40, 7, C.yel); }, { press: false }],
        plat: [100, 30, (a) => { a.R(6, 6, 88, 18, 8, C.gry); a.rr(12, 8, 76, 5, 2, "#ffffff77"); }],
        goat: [74, 80, (a) => { a.E(36, 48, 24, 18, C.wht, C.gry); a.C(54, 26, 14, C.wht); a.P([[46, 14], [40, 2], [54, 12]], C.gold).P([[60, 12], [68, 2], [64, 16]], C.gold); a.eye(58, 24, 4, 0.4, 0); a.L(26, 62, 24, 76, C.dgry, 5).L(46, 62, 48, 76, C.dgry, 5); }],
    },
    init(m) {
        m.side = 1; m.h = 0; m.goal = 11; m.lv = -40; m.yy = 0; m.seq = [];
        let s = 1; for (let i = 0; i < m.goal; i++) { const opts = [0, 1, 2].filter((q) => q !== s && Math.abs(q - s) === 1); s = m.rng.pick(opts); m.seq.push(s); }
        m.pos2 = 1; m.anim = 0;
    },
    tick(m, dt) {
        m.anim = Math.max(0, m.anim - dt * 8);
        m.lv += dt * (46 + m.p * 30);
        if (m.swipe) {
            const want = m.seq[m.h], dir = want > m.pos2 ? "right" : "left";
            if (m.swipe === dir) { m.pos2 = want; m.h++; m.anim = 1; m.lv = Math.max(m.lv - 6, m.h * 58 - 180); m.hit(T("square", 400 + m.h * 40, 800 + m.h * 40, 0.07)); m.boom((m.pos2 - 1) * 100, 40, [C.gry, C.wht], 4, { f: 5 }); if (m.h >= m.goal) { m.boom(0, 0, [C.yel, C.cyan], 40, { v1: 500 }); m.win(); } }
            else { m.sfx(T("sawtooth", 220, 120, 0.12)); m.shake(3, 0.1); }
        }
        if (m.lv > m.h * 58 + 60 && !m.over) { m.sfx(NOISE(0.4, 0.2)); m.drops((m.pos2 - 1) * 100, 60, C.org, 30, { v1: 400 }); m.lose(); }
    },
    draw(m, d) {
        const base = m.h * 58, Y = (i) => 80 - (i - base / 58) * 58 - m.anim * 12;
        m.spr("plat", (1 - 1) * 100, Y(-0));
        m.seq.forEach((s, i) => { const y = Y(i + 1); if (y > m.T - 30 && y < m.B + 30) m.spr("plat", (s - 1) * 100, y); });
        const px = (m.pos2 - 1) * 100;
        m.spr("goat", px, 80 - 44 - Math.sin(m.anim * Math.PI) * 26, { flip: false });
        const ly = 80 + (base + 50 - m.lv) + 30;
        d.rect(m.R - m.L + 4, 500, { y: ly + 260, color: C.org });
        m.spr("lava", 0, ly + Math.sin(m.rt * 6) * 4, { sx: 1.1 });
    },
    bot(m, b) { const want = m.seq[m.h]; if (want !== undefined) b.dir(want > m.pos2 ? "right" : "left", 0, 30); },
});

G({
    id: "wrestle", boss: true, tags: "boss gross", feel: [18, 10, 18], bg: [C.teal, C.navy, "wave", 0.3], dur: 13, grip: true, keySpeed: 520, mood: "spooky", icon: "squid", swipeLen: 999, hint: (m) => (m.t2.length ? ["rub", m.t2[0].x, m.t2[0].y, 34] : ["none"]), snap: (m) => m.t2.map((q) => [q.x, q.y]), outro: 1,
    art: {
        squid: [260, 200, (a, f) => { a.E(130, 86, 106, 76, C.pur, C.navy); a.eye(92, 82, 24, 0.2, 0.3).eye(168, 82, 24, -0.2, 0.3); a.P([[96, 134], [164, 134], [130, 160]], INK); if (f) { a.l(70, 56, 110, 70, INK, 8).l(190, 56, 150, 70, INK, 8); } a.C(50, 48, 12, C.lil).C(220, 56, 10, C.lil).C(130, 26, 13, C.lil); }, { frames: 2 }],
        tent: [80, 150, (a) => { a.L(40, 146, 34, 90, C.pur, 22).L(34, 90, 46, 40, C.pur, 16).L(46, 40, 38, 10, C.pur, 9); for (let i = 0; i < 4; i++) a.c(32 + (i % 2) * 8, 118 - i * 26, 6 - i * 0.5, C.lil); }],
        sub: [130, 74, (a) => { a.R(10, 20, 110, 44, 22, C.yel); a.R(52, 6, 30, 18, 5, C.gold); a.C(46, 42, 11, C.cyan).C(86, 42, 11, C.cyan); a.P([[8, 36], [0, 20], [0, 60]], C.org); }],
    },
    init(m) { m.t2 = []; m.done2 = 0; m.need = 6; m.next = 0.1; m.hp = 3; m.grab = 0; m.k = 0; m.ph = 0; m.pivot = [0, -50]; },
    tick(m, dt) {
        if (m.done === "win") return;
        m.k = Math.max(0, m.k - dt * 3);
        if (m.ph === 0) {
            m.next -= dt;
            if (m.next <= 0 && m.t2.length < 2 && m.done2 + m.t2.length < m.need) { m.next = 0.5; const left = m.rng.chance(0.5); m.t2.push({ x: left ? -m.rng.range(60, 120) : m.rng.range(60, 120), y: m.rng.range(10, 90), k: 0, life: 3.1, g: 0 }); m.sfx(T("sine", 200, 420, 0.2, 0.1)); }
            for (const q of m.t2) {
                q.life -= dt; q.g = Math.min(1, q.g + dt * 4);
                if (m.down && dist(q.x, q.y, m.x, m.y) < 52 && m.rub > 1) { q.k += m.rub / (90 / Math.min(1.5, m.speed)); if ((m.rt * 12 | 0) !== ((m.rt - 1 / 60) * 12 | 0)) m.hit(T("sawtooth", 300 + q.k * 400, undefined, 0.03, 0.08)); }
                if (q.k >= 1) { q.dead = true; m.done2++; m.boom(q.x, q.y, [C.lil, C.pur], 12); m.hit(T("square", 900, 300, 0.12), [30, 10]); }
                else if (q.life <= 0) { q.dead = true; m.hp--; m.shake(8, 0.2); m.sfx(NOISE(0.25, 0.2)); m.flash(C.red, 0.15); if (m.hp <= 0) m.lose(); }
            }
            m.t2 = m.t2.filter((q) => !q.dead);
            if (m.done2 >= m.need) { m.ph = 1; m.k = 0; m.sfx(T("sawtooth", 200, 900, 0.3)); }
        } else {
            if (m.pressed && dist(m.x, m.y, 0, -50) < 92) { m.grab++; m.k = 1; m.hit([T("square", 200, 80, 0.1), NOISE(0.08, 0.12)]); m.boom(m.x, m.y, [C.lil, C.wht], 8); m.shake(5, 0.1); m.freeze(0.04); if (m.grab >= 8) { m.boom(0, -50, [C.pur, C.lil, C.wht, C.pink], 44, { v1: 600 }); m.hit([T("sawtooth", 160, 40, 0.8)], [80, 40, 200]); m.win(); } }
        }
    },
    draw(m) {
        m.spr("sub", 0, 134, { rot: Math.sin(m.rt * 2) * 0.05 });
        m.spr("squid", Math.sin(m.rt * 1.6) * 10, -50 + (m.done === "win" ? m.overT * 240 : 0), { f: m.ph, sx: 1 + m.k * 0.1, sy: 1 - m.k * 0.1 });
        for (const q of m.t2) m.spr("tent", q.x, q.y + (1 - q.g) * 120, { rot: Math.sin(m.rt * 5 + q.x) * 0.1 + q.k * Math.sin(m.rt * 40) * 0.1, sy: 1 - q.k * 0.3 });
        if (m.ph === 1 && !m.over) m.meter(0, m.T + 22, 200, 12, 1 - m.grab / 8, C.red);
        else m.meter(0, m.T + 22, 200, 12, m.done2 / m.need, C.lime);
        for (let i = 0; i < m.hp; i++) m.d.sprite("fx", { x: 130 + 0 - i * 22, y: 92 + 56, width: 18, height: 18, frame: 1, color: C.red });
    },
    bot(m, b) {
        if (m.ph === 0) { const q = m.t2[0]; if (q) b.drag(q.x + Math.sin(b.t * 44) * 24, q.y); return; }
        if (b.isDown) b.release(); else b.tap(0, -50);
    },
});
