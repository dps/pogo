// Swipe games: a stroke in the right direction, at the right thing, at the right moment.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

const segd = (x0, y0, x1, y1, px, py) => { const dx = x1 - x0, dy = y1 - y0, l = dx * dx + dy * dy || 1, t = clamp(((px - x0) * dx + (py - y0) * dy) / l); return Math.hypot(x0 + dx * t - px, y0 + dy * t - py); };
const fair = (m, n, rate = 2.2) => Math.min(n, Math.max(2, Math.floor(rate * m.dur / m.speed)));

G({
    id: "slice", tags: "food quick", easy: true, feel: [5, 8, 5], bg: [C.navy, C.pur, "rays", 0.4], keys: "swipe", mood: "surf", icon: "pickle",
    hint: ["swipe", -110, -40, 110, 30], swipeLen: 20,
    art: {
        pickle: [64, 104, (a, f) => {
            if (f === 0) { a.E(32, 52, 24, 46, C.dgrn, "#0d6e36"); for (const [x, y] of [[24, 28], [40, 46], [24, 62], [38, 80], [30, 14]]) a.c(x, y, 4, C.lime); a.eye(22, 44, 7, 0.4, -0.3).eye(42, 44, 7, 0.4, -0.3); a.frown(32, 66, 9, 5); }
            if (f === 1) { a.E(32, 74, 24, 24, C.dgrn, "#0d6e36"); a.r(10, 54, 44, 8, C.lime); }
            if (f === 2) { a.E(32, 30, 24, 24, C.dgrn, "#0d6e36"); a.r(10, 42, 44, 8, C.lime); a.eye(22, 26, 7, 0, 0).eye(42, 26, 7, 0, 0); }
        }, { frames: 3 }],
    },
    init(m) { m.o = [0, 1, 2].map((i) => ({ at: 0.1 + i * 0.4, live: false, cut: false, x: 0, y: 200, vx: 0, vy: 0, r: 0 })); m.trail = []; m.need = 3; m.hs = []; },
    launch(m, o) { o.live = true; o.x = m.rng.range(-110, 110); o.y = 190; o.vx = -o.x * 0.5 + m.rng.range(-20, 20); o.vy = -m.rng.range(520, 590); o.r = 0; },
    cut(m, o) {
        o.cut = true; o.live = false; m.need--; m.hit([NOISE(0.07, 0.12), T("sine", 1400, 500, 0.08, 0.1)]); m.drops(o.x, o.y, C.lime, 9); m.ring(o.x, o.y, C.lime, 50);
        m.hs.push({ x: o.x, y: o.y, vx: -80, vy: -100, r: 0, f: 2 }, { x: o.x, y: o.y, vx: 80, vy: -60, r: 0, f: 1 }); m.freeze(0.03);
        if (!m.need) m.win();
    },
    tick(m, dt) {
        for (const o of m.o) {
            if (!o.cut && !o.live && m.t > o.at) this.launch(m, o);
            if (o.live) { o.vy += 620 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += dt * 5; if (o.y > 215 && o.vy > 0) { o.at = m.t + 0.1; o.live = false; } }
        }
        for (const h of m.hs) { h.vy += 700 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += dt * 8; }
        if (m.down) { m.trail.push({ x: m.x, y: m.y, l: 0.16 }); for (const o of m.o) if (o.live && segd(m.x - m.dx, m.y - m.dy, m.x, m.y, o.x, o.y) < 46 && m.rub > 2) this.cut(m, o); }
        if (m.swipe && m.keyboard) { const o = m.o.filter((q) => q.live && q.y < 170).sort((p, q) => dist(p.x, p.y, 0, 0) - dist(q.x, q.y, 0, 0))[0]; if (o) this.cut(m, o); }
        for (const q of m.trail) q.l -= dt / m.speed;
        m.trail = m.trail.filter((q) => q.l > 0);
    },
    draw(m, d) {
        for (const o of m.o) if (o.live) m.spr("pickle", o.x, o.y, { rot: o.r });
        for (const h of m.hs) m.spr("pickle", h.x, h.y, { f: h.f, rot: h.r });
        m.trail.forEach((q, i) => { const p = m.trail[i - 1]; if (p) d.line([p.x, p.y], [q.x, q.y], { color: C.wht, width: 2 + q.l * 50 }); });
    },
    bot(m, b) {
        const o = m.o.find((q) => q.live && q.y < 150 && Math.abs(q.x) < 150);
        if (o) { if (b.mode === "keys") b.dir("right"); else b.swipe(o.x - 70, o.y + o.vy * 0.03 * m.speed, o.x + 70, o.y + o.vy * 0.06 * m.speed, 5); }
    },
});

G({
    id: "flick", tags: "gross quick", feel: [7, 3], bg: [C.tan, C.yel, "stripes", 0.3], keys: "swipe", mood: "bouncy", icon: "gramps",
    home: [0, 110], hint: ["swipe", 0, 130, 0, 60], swipeLen: 26,
    art: {
        gramps: [190, 160, (a, f) => {
            a.R(14, 110, 162, 46, 16, C.brn); a.C(95, 76, 66, C.skin, C.tan);
            a.C(36, 62, 16, C.wht).C(154, 62, 16, C.wht); a.c(95, 8, 0, C.wht);
            a.e(60, 58, 13, 3, INK).e(130, 58, 13, 3, INK);
            a.R(58, 40, 30, 7, 3, C.wht).R(102, 40, 30, 7, 3, C.wht);
            a.E(95, 104, 26, f ? 26 : 16, INK).e(95, 112, 12, f ? 10 : 5, C.pink);
            a.r(66, 84, 58, 7, C.wht);
        }, { frames: 2 }],
        pea: [30, 30, (a) => { a.C(15, 15, 11, C.grn, C.dgrn); a.c(11, 11, 3, "#ffffff99"); }],
    },
    init(m) { m.pea = null; m.n = 3; m.mx = -60; m.ok = false; m.vx = 120 + m.level * 40; },
    tick(m, dt) {
        m.mx += m.vx * dt; if (Math.abs(m.mx) > 110) { m.vx *= -1; m.mx = clamp(m.mx, -110, 110); }
        if (m.swipe && !m.pea && m.n > 0 && m.flick.dy < 0) {
            const f = m.flick, l = Math.hypot(f.dx, f.dy), v = 620;
            m.pea = { x: 0, y: 112, vx: (f.dx / l) * v, vy: (f.dy / l) * v }; m.n--; m.hit(T("sine", 500, 1300, 0.07));
        }
        if (m.pea) {
            const p = m.pea; p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.y < -54) {
                if (Math.abs(p.x - m.mx) < 38) { m.ok = true; m.pea = null; m.hit(T("square", 300, 90, 0.2), [20, 30, 60]); m.shake(4, 0.2); m.boom(m.mx, -60, [C.grn, C.lime, C.yel], 14); m.win(); }
                else if (p.y < -170) { m.pea = null; if (!m.n) m.lose(); m.sfx(T("triangle", 300, 200, 0.06, 0.08)); }
            }
        }
    },
    draw(m) {
        const s = 1 + Math.sin(m.rt * 3) * 0.02;
        m.spr("gramps", m.mx, -68, { f: m.ok ? 0 : 1, sx: s, sy: 2 - s });
        if (m.pea) m.spr("pea", m.pea.x, m.pea.y);
        else if (m.n && !m.over) m.spr("pea", 0, 112, { k: 1.2 });
        for (let i = 0; i < m.n - 1; i++) m.spr("pea", 60 + i * 26, 134, { k: 0.8 });
    },
    bot(m, b) {
        if (m.pea || !m.n) return;
        const fl = (112 + 54) / 620, tt = fl / m.speed + 0.09;   // real seconds until the pea arrives
        let x = m.mx, v = m.vx, g = tt * m.speed; x += v * g; if (Math.abs(x) > 110) { x = Math.sign(x) * (220 - Math.abs(x)); }
        if (b.mode === "keys") { if (Math.abs(x) < 26) b.dir("up", 0, 100); return; }
        const dy = -166, dx = clamp(x, -100, 100), k = 60 / Math.hypot(dx, dy);
        b.swipe(0, 120, dx * k, 120 + dy * k, 3);
    },
});

G({
    id: "slap", tags: "food fingers", feel: [22, 12], bg: [C.lil, C.pur, "wave", 0.3], keys: "swipe", mood: "march", icon: "lord",
    hint: (m) => (m.side > 0 ? ["swipe", -120, 0, 120, 0] : ["swipe", 120, 0, -120, 0]),
    art: {
        lord: [190, 240, (a, f) => {
            a.R(30, 170, 130, 70, 14, C.navy).P([[95, 200], [76, 170], [114, 170]], C.wht);
            a.C(95, 92, 72, C.skin, C.tan); a.R(40, 8, 110, 42, 10, INK).R(22, 44, 146, 12, 4, INK);
            a.eye(66, 88, 12, f, 0).eye(124, 88, 18, f, 0).C(124, 88, 19, "#ffffff00"); a.arc(124, 88, 20, 20, 0, 6.3, C.gold, 3); a.l(143, 92, 160, 150, C.gold, 2);
            a.P([[80, 118], [95, 104], [110, 118]], C.tan); a.l(60, 138, 90, 128, INK, 7).l(130, 138, 100, 128, INK, 7);
        }, { frames: 3 }],
        fish: [130, 60, (a) => { a.P([[6, 12], [28, 30], [6, 48]], C.cyan); a.E(74, 30, 52, 20, C.cyan, C.teal); a.eye(108, 24, 7, 0.5, 0); for (let i = 0; i < 4; i++) a.arc(52 + i * 14, 30, 8, 12, -1, 1, C.teal, 2); }],
    },
    init(m) { m.n = fair(m, 4, 2); m.side = 1; m.rot = 0; m.v = 0; m.f = 1; m.fx2 = null; },
    tick(m, dt) {
        m.v += (-m.rot * 120 - m.v * 14) * dt; m.rot += m.v * dt;
        if (m.fx2) { m.fx2.t -= dt; if (m.fx2.t <= 0) m.fx2 = null; }
        const want = m.side > 0 ? "right" : "left";
        if (m.swipe === want) {
            m.v += m.side * 16; m.n--; m.side *= -1; m.f = m.side > 0 ? 0 : 2; m.fx2 = { t: 0.16, d: -m.side };
            m.hit([NOISE(0.1, 0.2), T("sine", 300, 90, 0.1, 0.2)]); m.drops(m.side * -70, 0, C.cyan, 10); m.shake(5, 0.1); m.freeze(0.05);
            if (!m.n) m.win();
        }
    },
    draw(m) {
        m.spr("lord", 0, 26, { f: m.f, rot: m.rot * 0.7 });
        if (m.fx2) m.spr("fish", m.fx2.d * 60 * (1 - m.fx2.t * 5), 0, { flip: m.fx2.d < 0 });
        else if (!m.over) m.spr("fish", -m.side * 124, 96, { rot: Math.sin(m.rt * 6) * 0.2 - 0.3, flip: m.side > 0 ? false : true, k: 0.8 });
    },
    bot(m, b) { b.dir(m.side > 0 ? "right" : "left"); },
});

G({
    id: "shove", tags: "zoo", easy: true, feel: [14, 40, 26], bg: [C.org, C.gold, "check", 0.3], keys: "swipe", mood: "funk", icon: "cat",
    hint: ["swipe", -60, -40, 100, -40],
    art: {
        cat: [130, 140, (a, f) => { a.E(60, 92, 42, 44, INK, "#3a3350"); a.P([[28, 44], [30, 8], [56, 30]], INK).P([[92, 44], [90, 8], [64, 30]], INK).C(60, 54, 36, INK); a.e(44, 50, 11, 11, C.yel).e(76, 50, 11, 11, C.yel).e(46, 50, 3, 9, INK).e(78, 50, 3, 9, INK); a.p([[56, 64], [64, 64], [60, 70]], C.pink); if (f) a.L(90, 86, 128, 80, "#3a3350", 12); }, { frames: 2 }],
        stuff: [70, 90, (a, f) => {
            if (f === 0) { a.R(14, 34, 42, 50, 10, C.cyan); a.arc(58, 56, 12, 14, -1.5, 1.5, C.cyan, 6); a.rr(18, 34, 34, 8, 3, C.brn); }
            if (f === 1) { a.P([[24, 8], [46, 8], [42, 40], [56, 84], [14, 84], [28, 40]], C.pink); a.l(26, 62, 44, 62, C.wht, 5); }
            if (f === 2) { a.C(35, 50, 26, C.gold, C.org); a.r(30, 8, 10, 22, C.grn); a.P([[40, 12], [56, 4], [50, 20]], C.grn); }
        }, { frames: 3 }],
    },
    init(m) { m.it = [0, 1, 2].map((i) => ({ x: 24 + i * 56, y: 0, vy: 0, vx: 0, r: 0, gone: false, f: i })); m.paw = 0; m.n = 3; },
    tick(m, dt) {
        m.paw = Math.max(0, m.paw - dt * 4);
        for (const o of m.it) if (o.gone) { o.vy += 1000 * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.r += dt * 8; if (o.y > 200 && !o.b) { o.b = 1; m.hit([NOISE(0.14, 0.2), T("square", 2200, 700, 0.1, 0.08)]); m.shake(4, 0.1); m.boom(o.x, 150, [C.wht, C.cyan, C.pink], 14, { a0: 3.5, a1: 6, v1: 300 }); if (!m.n) m.win(); } }
        if (m.swipe === "right" && m.n > 0) { const o = m.it.find((q) => !q.gone); o.gone = true; o.vx = 240; o.vy = -160; m.n--; m.paw = 1; m.sfx(T("sine", 300, 500, 0.09, 0.12)); }
    },
    draw(m, d) {
        d.rect(m.R - 110 + 150, 26, { x: -70, y: 60 - 16, color: INK, radius: 4 }); d.rect(m.R - 120 + 150, 18, { x: -70, y: 44, color: C.brn, radius: 3 });
        for (const o of m.it) m.spr("stuff", o.x, -2 + o.y - 8, { f: o.f, rot: o.r });
        m.spr("cat", -96, -32, { f: m.paw > 0 ? 1 : 0, rot: m.paw * 0.08 });
    },
    bot(m, b) { if (m.n > 0) b.dir("right", 0, -40); },
});

G({
    id: "dance", tags: "zoo brain", feel: [9, 22, 9], bg: [C.pur, C.pink, "rays", 0.5], keys: "swipe", mood: "funk", icon: "hen",
    hint: (m) => { const [x, y] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[m.seq[0]]; return ["swipe", -x * 50, 40 - y * 50, x * 50, 40 + y * 50]; },
    art: {
        hen: [130, 130, (a, f) => {
            const w = [[-30, 0], [30, 0], [0, -12], [0, 12], [0, 0]][f];
            a.E(65 + w[0] * 0.3, 74 + w[1] * 0.3, 38, 40, C.wht, C.gry);
            a.P([[65 + w[0], 18 + w[1]], [76 + w[0], 4 + w[1]], [84 + w[0], 18 + w[1]]], C.red).P([[50 + w[0], 22 + w[1]], [60 + w[0], 6 + w[1]], [70 + w[0], 20 + w[1]]], C.red);
            a.C(65 + w[0], 42 + w[1], 22, C.wht); a.eye(58 + w[0], 38 + w[1], 7, 0, 0).eye(76 + w[0], 38 + w[1], 7, 0, 0); a.P([[60 + w[0], 48 + w[1]], [76 + w[0], 48 + w[1]], [68 + w[0], 60 + w[1]]], C.org);
            a.L(30, 72, 8 + w[0] * 0.2, 54 + w[1], C.wht, 7).L(100, 72, 122 + w[0] * 0.2, 54 + w[1], C.wht, 7); a.R(44, 8 + 94, 8, 22, 2, C.org).R(78, 102, 8, 22, 2, C.org);
        }, { frames: 5 }],
        arrow: [62, 62, (a, f) => { a.P([[31, 6], [56, 32], [42, 32], [42, 56], [20, 56], [20, 32], [6, 32]], f ? C.grn : C.yel); }, { frames: 2 }],
    },
    init(m) { const n = fair(m, 4, 1.8); m.seq = []; let last = ""; while (m.seq.length < n) { const q = m.rng.pick(["left", "right", "up", "down"]); if (q !== last) { m.seq.push(q); last = q; } } m.at = 0; m.pose = 4; m.wob = 0; m.n = n; },
    tick(m, dt) {
        m.wob = Math.max(0, m.wob - dt * 4);
        if (m.swipe) {
            if (m.swipe === m.seq[m.at]) { m.pose = { left: 0, right: 1, up: 2, down: 3 }[m.swipe]; m.at++; m.hit(T("square", [523, 659, 784, 1047][m.at - 1] ?? 880, undefined, 0.1, 0.14)); m.boom(0, 30, [C.yel, C.cyan, C.pink], 6, { f: 1 }); if (m.at >= m.seq.length) m.win(); }
            else { m.wob = 1; m.sfx(T("sawtooth", 180, 120, 0.12)); }
        }
    },
    draw(m, d) {
        for (let i = 0; i < 6; i++) { const a = m.rt * 2 + i; d.circle(26, { x: Math.cos(a) * 140, y: -128 + Math.sin(a * 1.3) * 10, color: [C.yel, C.cyan, C.pink][i % 3], opacity: 0.35 }); }
        const gap = 68, x0 = -(m.seq.length - 1) * gap / 2, A = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
        m.seq.forEach((q, i) => m.spr("arrow", x0 + i * gap, -100, { f: i < m.at ? 1 : 0, rot: A[q], k: i === m.at ? 1 + Math.sin(m.rt * 12) * 0.1 : 0.8 }));
        m.shadow(0, 118, 50, 9); m.spr("hen", Math.sin(m.wob * 25) * 10, 50, { f: m.pose, k: 1.15, rot: Math.sin(m.rt * 8) * 0.06 });
    },
    bot(m, b) { b.dir(m.seq[m.at], 0, 40); },
});

G({
    id: "dig", tags: "zoo fingers", easy: true, feel: [12, 10, 12], bg: [C.sky, C.wht, "wave", 0.3], keys: "swipe", mood: "bouncy", icon: "hound",
    hint: ["swipe", 0, -50, 0, 70], swipeLen: 26, home: [0, 0],
    art: {
        hound: [120, 110, (a, f) => { a.E(66, 70, 44, 28, C.gold, C.org).C(26, 44, 24, C.gold); a.E(12, 40, 9, 22, C.brn); a.eye(26, 36, 7, -0.3, 0.6).C(6, 50, 5, INK); a.L(100, 56, 116, 32, C.gold, 7); a.L(50, 90, 40 + (f ? 10 : -6), 106 - (f ? 10 : 0), C.gold, 8).L(90, 90, 92, 106, C.gold, 8); }, { frames: 2 }],
        bone: [110, 50, (a) => { a.C(16, 16, 12, C.wht).C(16, 34, 12, C.wht).C(94, 16, 12, C.wht).C(94, 34, 12, C.wht).R(16, 14, 78, 22, 4, C.wht); }],
    },
    init(m) { m.n = fair(m, 6, 2.6); m.max = m.n; m.d = 0; m.leg = 0; },
    tick(m, dt) {
        m.d += (1 - m.n / m.max - m.d) * Math.min(1, dt * 14); m.leg = Math.max(0, m.leg - dt * 6);
        if (m.swipe === "down") {
            m.n--; m.leg = 1; m.hit([NOISE(0.08, 0.1), T("triangle", 200, 90, 0.06, 0.14)]);
            m.boom(-60, 70 + m.d * 60, [C.brn, C.dbrn], 8, { a0: 3.4, a1: 4.4, v1: 320, f: 5 }); m.shake(2, 0.06);
            if (m.n <= 0) { m.boom(0, 120, [C.yel, C.wht], 16); m.win(); }
        }
    },
    draw(m, d) {
        const y0 = 34, h = 74 + m.d * 110;
        d.rect(m.R - m.L + 4, 300, { y: y0 + 150, color: C.brn }); d.rect(m.R - m.L + 4, 8, { y: y0, color: C.dgrn });
        d.rect(150, h, { y: y0 + h / 2 - 4, color: C.dbrn, radius: 26 });
        m.spr("bone", 0, 128 - (m.done === "win" ? m.overT * 100 : 0), { rot: Math.sin(m.rt * 5) * 0.03 });
        m.spr("hound", 8, y0 + h * 0.55 - 66, { f: m.leg > 0.4 ? 1 : 0, rot: 0.2 + m.d * 0.3 });
    },
    bot(m, b) { b.dir("down", 0, 10); },
});

G({
    id: "swerve", tags: "quick steady", feel: [6, 12], bg: [C.dgry, C.gry, "stripes", 0.08], keys: "swipe", survive: true, mood: "surf", icon: "gran",
    hint: ["swipe", -60, 80, 60, 80],
    art: {
        gran: [80, 110, (a) => { a.R(26, 58, 28, 50, 10, C.pink); a.R(14, 42, 52, 10, 4, C.gry); a.E(40, 28, 22, 24, C.pur); a.C(40, 14, 15, C.gry); a.e(40, 22, 10, 7, C.skin); }],
        snail: [84, 84, (a) => { a.E(42, 62, 34, 13, C.lime, C.grn); a.C(40, 42, 26, C.org, C.red); a.arc(40, 42, 14, 14, 0, 5, C.yel, 3); a.L(62, 52, 72, 26, C.lime, 5); a.eye(73, 24, 6, 0, 0.3); }],
    },
    init(m) { m.lane = 1; m.x2 = 0; m.o = []; m.next = 0.25; m.road = 0; m.tilt = 0; },
    tick(m, dt) {
        const v = 230;
        m.road = (m.road + v * dt) % 60; m.next -= dt;
        if (m.next <= 0) {
            const opts = [m.lane - 1, m.lane + 1].filter((l) => l >= 0 && l <= 2), free = m.rng.pick(opts);
            for (let i = 0; i < 3; i++) if (i !== free) m.o.push({ l: i, y: -290 });
            m.next = 1.25;
        }
        for (const o of m.o) o.y += v * dt;
        m.o = m.o.filter((o) => o.y < m.B + 60);
        if (m.swipe === "left" && m.lane > 0) { m.lane--; m.tilt = -1; m.hit(T("sine", 600, 900, 0.07)); }
        if (m.swipe === "right" && m.lane < 2) { m.lane++; m.tilt = 1; m.hit(T("sine", 600, 900, 0.07)); }
        m.tilt *= 0.9;
        m.x2 += ((m.lane - 1) * 100 - m.x2) * Math.min(1, dt * 16);
        for (const o of m.o) if (!o.hit && (o.l - 1) * 100 === (m.lane - 1) * 100 && Math.abs(o.y - 90) < 60 && !m.over) { o.hit = 1; m.boom(m.x2, 80, [C.yel, C.red], 16); m.sfx(NOISE(0.2, 0.2)); m.lose(); }
    },
    draw(m, d) {
        d.rect(320, 900, { color: "#3a3648" });
        for (const x of [-50, 50]) for (let y = -6; y < 12; y++) d.rect(8, 30, { x, y: y * 60 + m.road, color: C.yel });
        for (const o of m.o) m.spr("snail", (o.l - 1) * 100, o.y, { flip: o.l === 0 });
        m.spr("gran", m.x2, 96, { rot: m.tilt * 0.3 });
    },
    bot(m, b) {
        b.aim(0, 80);
        const near = m.o.filter((o) => o.y > -130 && o.y < 150), blocked = [0, 1, 2].map((l) => near.some((o) => o.l === l));
        if (blocked[m.lane]) { const left = m.lane > 0 && !blocked[m.lane - 1], right = m.lane < 2 && !blocked[m.lane + 1]; if (left) b.dir("left", 0, 80); else if (right) b.dir("right", 0, 80); else b.dir(m.lane === 0 ? "right" : "left", 0, 80); }
    },
});

G({
    id: "block", tags: "quick", feel: [28, 10], bg: [C.grn, C.lime, "stripes", 0.3], keys: "swipe", survive: false, mood: "march", icon: "keeper",
    hint: ["swipe", 0, 60, 100, 60],
    art: {
        keeper: [120, 120, (a, f) => {
            a.E(60, 70, 26, 34, C.yel, C.gold); a.C(60, 30, 19, C.skin); a.eye(52, 26, 6, 0, 0.4).eye(68, 26, 6, 0, 0.4); a.frown(60, 42, 7, 3);
            a.L(36, 60, 12, f === 2 ? 20 : 46, C.yel, 8).L(84, 60, 108, f === 2 ? 20 : 46, C.yel, 8).C(10, f === 2 ? 14 : 42, 11, C.red).C(110, f === 2 ? 14 : 42, 11, C.red);
            a.L(48, 100, 42, 116, C.navy, 8).L(72, 100, 78, 116, C.navy, 8);
        }, { frames: 3 }],
        ball: [64, 64, (a) => { a.C(32, 32, 26, C.wht, C.gry); a.c(32, 32, 9, INK); for (let i = 0; i < 5; i++) { const t = i * TAU / 5; a.c(32 + Math.cos(t) * 20, 32 + Math.sin(t) * 20, 5, INK); } }],
    },
    init(m) { m.pos2 = 0; m.px2 = 0; m.n = 3; m.q = null; m.wait2 = 0.3; m.saved = 0; },
    tick(m, dt) {
        const D = { left: -1, right: 1, up: 0 };
        if (m.swipe && m.swipe in D) { m.pos2 = D[m.swipe]; m.sfx(T("sine", 220, 400, 0.08)); }
        m.px2 += (m.pos2 * 104 - m.px2) * Math.min(1, dt * 22);
        if (!m.q) { m.wait2 -= dt; if (m.wait2 <= 0) m.q = { to: m.rng.int(-1, 1), t: 0 }; return; }
        const q = m.q; q.t += dt;
        if (q.t > 0.62 && !q.done) {
            q.done = 1;
            if (q.to === m.pos2) { m.saved++; m.hit(T("square", 220, 110, 0.12)); m.boom(m.px2, -70, [C.wht, C.yel], 10); m.shake(3, 0.08); if (m.saved >= m.n) m.win(); }
            else { m.sfx(NOISE(0.3, 0.2)); m.lose(); }
            m.wait2 = 0.28; 
        }
        if (q.t > 0.84) m.q = null;
    },
    draw(m, d) {
        d.rect(320, 12, { y: -130, color: C.wht }); d.rect(12, 110, { x: -158, y: -76, color: C.wht }); d.rect(12, 110, { x: 158, y: -76, color: C.wht });
        for (let i = 0; i < 9; i++) d.rect(2, 106, { x: -160 + i * 40, y: -76, color: C.wht, opacity: 0.5 }); for (let i = 0; i < 5; i++) d.rect(320, 2, { y: -120 + i * 22, color: C.wht, opacity: 0.5 });
        m.spr("keeper", m.px2, -62, { f: m.q && !m.q.done ? 2 : m.pos2 ? 1 : 0, rot: m.pos2 * 0.45, k: 1.1 });
        const q = m.q;
        if (q) { const k = clamp(q.t / 0.62), x = q.to * 104 * k, y = 110 - k * 180; m.shadow(x, y + 24 * (1 - k * 0.5), 22 - k * 8, 5); m.spr("ball", x, y, { k: 1.2 - k * 0.6, rot: q.t * 12 }); }
        if (q && !q.done) { const a = q.to; d.rect(70, 70, { x: a * 104, y: -70, radius: 99, outline: 5, color: C.red, opacity: 0.4 + Math.sin(m.rt * 20) * 0.3 }); }
    },
    bot(m, b) { if (m.q && !m.q.done && m.pos2 !== m.q.to) { const c = m.q.to; b.dir(c < 0 ? "left" : c > 0 ? "right" : "up", 0, 60); } },
});

G({
    id: "peel", tags: "food", easy: true, feel: [18, 8, 4], bg: [C.yel, C.org, "dots", 0.3], keys: "swipe", mood: "bouncy", icon: "nana",
    hint: (m) => ["swipe", m.st[m.at]?.x ?? 0, -90, m.st[m.at]?.x ?? 0, 80],
    art: {
        nana: [130, 280, (a, f) => {
            if (f === 0) { a.E(65, 150, 54, 122, C.yel, C.gold); a.R(56, 8, 18, 34, 4, C.dbrn); a.l(38, 40, 34, 250, C.gold, 3).l(92, 40, 96, 250, C.gold, 3); a.c(70, 268, 7, C.dbrn); }
            if (f === 1) { a.E(65, 150, 48, 118, C.paper, "#f3dfb1"); a.eye(45, 110, 11, 0, 0.3).eye(85, 110, 11, 0, 0.3); a.frown(65, 148, 18, 12); a.e(40, 132, 8, 5, C.rose).e(90, 132, 8, 5, C.rose); a.r(16, 170, 100, 34, INK); }
        }, { frames: 2 }],
        strip: [50, 200, (a) => { a.P([[6, 4], [44, 4], [38, 180], [25, 198], [12, 180]], C.yel); a.l(25, 10, 25, 186, C.gold, 3); }],
    },
    init(m) { m.st = [-38, 0, 38].map((x) => ({ x, k: 0, on: false })); m.at = 0; m.n = 3; },
    tick(m, dt) {
        for (const s of m.st) if (s.on) s.k = Math.min(1, s.k + dt * 7);
        if (m.swipe === "down") {
            let t = m.st.filter((q) => !q.on).sort((p, q) => Math.abs(p.x - (m.keyboard ? -99 : m.flick.x0)) - Math.abs(q.x - (m.keyboard ? -99 : m.flick.x0)))[0];
            if (t) { t.on = true; m.n--; while (m.st[m.at]?.on) m.at++; m.hit([T("sawtooth", 1100, 240, 0.14, 0.09), NOISE(0.1, 0.05)]); m.boom(t.x, 80, [C.yel, C.paper], 6, { f: 5 }); if (!m.n) { m.boom(0, -60, [C.yel, C.pink], 18); m.win(); } }
        }
    },
    draw(m) {
        m.spr("nana", 0, 16, { f: m.n ? 0 : 1 });
        if (!m.n) m.spr("nana", 0, 16, { f: 1 });
        for (const s of m.st) {
            if (s.on) { const k = s.k, dir = Math.sign(s.x) || (s === m.st[1] ? 1 : 1); m.spr("strip", s.x + dir * (20 + 86 * k), 150 - 90 * (1 - k) - 10, { rot: dir * (0.2 + 1.2 * k), sy: 1 - k * 0.2 }); }
        }
        if (m.n < 3 && m.n > 0) { for (const s of m.st) if (s.on) m.d.rect(36, 170, { x: s.x, y: 30, color: C.paper, radius: 12 }); }
    },
    bot(m, b) { const s = m.st[m.at]; if (s) b.dir("down", s.x, 0); },
});

G({
    id: "unzip", tags: "steady zoo", feel: [4, 4], bg: [C.brn, C.tan, "scale", 0.35], grip: true, mood: "spooky", icon: "bear", home: [0, -96], swipeLen: 999,
    hint: ["drag", 0, -100, 0, 110],
    art: {
        bear: [250, 310, (a) => {
            a.C(50, 50, 32, C.brn).C(200, 50, 32, C.brn).c(50, 50, 16, C.tan).c(200, 50, 16, C.tan);
            a.E(125, 180, 110, 128, C.brn, C.dbrn).C(125, 92, 84, C.brn, C.dbrn);
            a.eye(92, 76, 15, 0, 0.2).eye(158, 76, 15, 0, 0.2); a.e(125, 108, 26, 18, C.tan).c(125, 98, 8, INK);
            a.e(125, 200, 70, 90, C.tan);
        }],
        pilot: [90, 120, (a) => { a.R(10, 74, 70, 40, 8, C.dgry); for (let i = 0; i < 3; i++) a.C(26 + i * 20, 92, 5, [C.red, C.yel, C.grn][i]); a.C(45, 46, 24, C.lime); a.eye(36, 40, 7, 0, 0).eye(54, 40, 7, 0, 0); a.smile(45, 58, 9, 4); a.R(26, 18, 38, 10, 3, C.navy); }],
        tab: [36, 54, (a) => { a.R(8, 4, 20, 44, 5, C.yel); a.C(18, 38, 5, C.gold); }],
    },
    path: (k) => [Math.sin(k * 9) * 12, -100 + k * 216],
    init(m) { m.k = 0; m.grab = false; m.last = 0; },
    tick(m, dt) {
        const [hx, hy] = this.path(m.k);
        if (m.pressed && dist(hx, hy, m.x, m.y) < 62) m.grab = true;
        if (!m.down) m.grab = false;
        if (m.grab) {
            const want = clamp((m.y + 100) / 216);
            if (want > m.k) { const old = m.k; m.k = Math.min(want, m.k + dt * 1.5 / Math.max(1, m.speed * 0.6)); if ((m.k * 26 | 0) !== (old * 26 | 0)) m.hit(T("square", 1500 + m.k * 900, undefined, 0.012, 0.09)); }
            if (m.k >= 1) { m.boom(0, 0, [C.lime, C.yel], 18); m.win(); }
        }
    },
    draw(m, d) {
        const k = m.k;
        m.spr("bear", 0, 0);
        const y0 = -100, top = (t) => this.path(t);
        for (let i = 0; i < 26; i++) {
            const t = i / 26, [x, y] = top(t);
            if (t < k) { const w = 26 * Math.sin(Math.min(1, (k - t) * 3 + 0.05) * Math.PI * 0.5) + 3; d.rect(w * 2 + 8, 11, { x, y, color: INK }); d.rect(w * 2, 9, { x, y, color: "#23203a" }); }
            d.rect(16, 4, { x: x + (t < k ? 0 : 0), y, color: t < k ? "#23203a" : C.gry });
        }
        if (k > 0.55) m.spr("pilot", 0, 50 + (1 - k) * 80, { k: (k - 0.55) * 2.2 });
        const [hx, hy] = top(k);
        m.spr("tab", hx, hy + 18, { rot: Math.sin(m.rt * 6) * 0.1 });
    },
    bot(m, b) { const [x, y] = this.path(m.k); if (m.grab) b.drag(x, y + 34); else b.grab(x, y); },
});

G({
    id: "flip", tags: "food quick", feel: [10, 50, 20], bg: [C.red, C.org, "rings", 0.4], mood: "chip", icon: "cake2", keySpeed: 420, swipeLen: 30,
    hint: (m) => (m.air ? ["none"] : ["swipe", 0, 120, 0, 40]),
    art: {
        cake2: [110, 44, (a, f) => { a.E(55, 22, 48, 14, f ? "#b77234" : C.paper, f ? C.brn : "#ffe6a1"); if (f) a.e(40, 18, 12, 4, C.dbrn); }, { frames: 2 }],
        pan: [200, 60, (a) => { a.E(70, 26, 66, 20, "#3a3648", INK); a.L(132, 26, 196, 16, C.red, 10); }],
    },
    init(m) { m.px2 = 0; m.air = false; m.c = { x: 0, y: 100, vx: 0, vy: 0, r: 0 }; m.landed = false; },
    tick(m, dt) {
        const c = m.c;
        if (!m.landed) m.px2 += (clamp(m.x, -130, 130) - m.px2) * Math.min(1, dt * 26);
        if (!m.air && !m.landed) {
            c.x = m.px2;
            if (m.swipe === "up" || (m.keyboard && m.pressed)) { m.air = true; c.vy = -560; c.vx = (m.rng.chance(0.5) ? 1 : -1) * m.rng.range(40, 76) - m.px2 * 0.3; m.hit(T("sine", 200, 700, 0.14)); }
        }
        if (m.air) {
            c.vy += 640 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 10;
            if (c.y >= 100 && c.vy > 0) {
                c.y = 100; m.air = false; m.landed = true;
                if (Math.abs(c.x - m.px2) < 76) { c.r = 0; m.hit(T("sawtooth", 180, 60, 0.12, 0.2), [30, 20, 30]); m.boom(c.x, 90, [C.yel, C.wht], 12); m.win(); }
                else { m.sfx(NOISE(0.2, 0.15)); m.drops(c.x, 130, C.paper, 10); c.y = 150; m.lose(); }
            }
        } else if (!m.landed) c.y = 100;
    },
    draw(m) {
        const c = m.c, flip = Math.cos(c.r);
        m.spr("pan", m.px2 + 34, 112);
        m.spr("cake2", c.x, c.y, { f: Math.floor(c.r / Math.PI) % 2 || m.landed ? 1 : 0, sy: m.air ? Math.abs(flip) * 0.9 + 0.1 : 1 });
    },
    bot(m, b) {
        const c = m.c;
        if (!m.air && !m.landed) { if (b.mode === "keys") { b.tap(0, 80); } else b.swipe(0, 130, 0, 50, 4); return; }
        if (m.air) { const tt = (-c.vy + Math.sqrt(Math.max(0, c.vy * c.vy + 2 * 640 * (100 - c.y)))) / 640, x = c.x + c.vx * tt; b.drag(clamp(x, -130, 130), 110); }
    },
});

G({
    id: "spin", tags: "steady fingers", feel: [5, 5, 5, 5], bg: [C.cyan, C.wht, "tri", 0.3], keys: "swipe", survive: true, mood: "surf", icon: "plate",
    hint: ["swipe", -150, -70, -10, -70], swipeLen: 26,
    art: {
        plate: [140, 44, (a, f) => { a.E(70, 22, 62, 15, C.wht, C.gry); a.e(70, 20, 42, 9, f ? C.pink : C.cyan); a.l(36 + f * 10, 20, 50 + f * 10, 22, C.wht, 3); a.l(90 - f * 10, 18, 100 - f * 10, 22, C.wht, 3); }, { frames: 3 }],
    },
    init(m) { m.o = [-84, 84].map((x, i) => ({ x, s: 0.86 - i * 0.14, a: 0, f: 0, drop: 0 })); m.rate = 0.34; },
    tick(m, dt) {
        for (const o of m.o) {
            o.s -= dt * m.rate; o.a += o.s * dt * 24;
            if (o.s <= 0 && !m.over) { o.drop = 1; m.sfx(NOISE(0.2, 0.2)); m.boom(o.x, 80, [C.wht, C.cyan], 14); m.lose(); }
            if (o.drop) { o.y2 = (o.y2 ?? 0) + 700 * dt; }
        }
        let t = null;
        if (m.keyboard && m.swipe) t = m.swipe === "left" ? m.o[0] : m.swipe === "right" ? m.o[1] : null;
        else if (m.flick) t = m.flick.x0 + m.flick.x1 < 0 ? m.o[0] : m.o[1];
        if (t && (m.swipe === "left" || m.swipe === "right")) { t.s = 1; m.hit(T("sine", 500, 1100, 0.12)); m.boom(t.x, -70, [C.yel, C.wht], 5, { v1: 180 }); }
    },
    draw(m, d) {
        for (const o of m.o) {
            const w = (1 - clamp(o.s)) ** 1.5, tilt = Math.sin(o.a) * w * 0.55, ox = Math.sin(o.a) * w * 30;
            m.line(o.x, -60, o.x + ox * 0.2, 150, C.dgry, 5);
            m.spr("plate", o.x + ox, -70 + (o.y2 ?? 0), { f: (o.a * 2 | 0) % 3, rot: tilt, sy: 1 - w * 0.2 });
            m.meter(o.x, 136, 80, 12, o.s, o.s < 0.35 ? C.red : C.grn);
        }
    },
    bot(m, b) { const o = [...m.o].sort((p, q) => p.s - q.s)[0]; if (o.s < 0.6) { if (b.mode === "keys") b.dir(o === m.o[0] ? "left" : "right"); else b.swipe(o.x - 60, -60, o.x + 60, -60, 5); } },
});
