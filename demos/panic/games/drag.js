// Drag games: the thing stays under your finger, and you steer it through trouble.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

G({
    id: "catch", tags: "food steady", easy: true, feel: [14, 12], bg: [C.cyan, C.sky, "tri", 0.3], mood: "bouncy", icon: "egg", keySpeed: 420, grip: false, home: [0, 110],
    hint: ["drag", -60, 110, 60, 110], swipeLen: 999,
    art: {
        egg: [46, 60, (a) => { a.E(23, 32, 18, 24, C.paper, C.rose); a.e(17, 24, 5, 7, "#ffffffcc"); }],
        pot: [120, 80, (a) => { a.R(10, 20, 100, 54, 16, C.pink); a.rr(14, 24, 92, 8, 4, "#ffffff77"); a.C(6, 40, 6, C.pink).C(114, 40, 6, C.pink); a.e(60, 18, 50, 8, INK); }],
        hen2: [100, 74, (a) => { a.E(50, 46, 42, 24, C.wht, C.gry); a.C(82, 28, 14, C.wht); a.P([[92, 26], [104, 30], [92, 34]], C.org); a.eye(84, 24, 4, 0.3, 0); a.P([[76, 16], [84, 4], [90, 16]], C.red); }],
    },
    init(m) { m.e = [0, 1, 2, 3].map((i) => ({ x: m.rng.range(-120, 120), y: -220 - i * 170, v: 0, spin: m.rng.range(-3, 3), ok: false })); m.n = 3; m.bx = 0; m.sq = 1; },
    tick(m, dt) {
        m.bx += (clamp(m.x, -130, 130) - m.bx) * Math.min(1, dt * 30 / m.speed);
        m.sq += (1 - m.sq) * Math.min(1, dt * 14);
        for (const q of m.e) {
            if (q.ok) continue;
            q.y += 270 * dt;
            if (q.y > 92 && q.y < 120 && Math.abs(q.x - m.bx) < 66) { q.ok = true; m.n--; m.sq = 0.8; m.hit(T("sine", 500, 800, 0.08)); m.boom(q.x, 96, [C.yel, C.wht], 6); if (m.n <= 0) m.win(); }
            else if (q.y > 170 && !q.done) { q.done = 1; m.drops(q.x, 160, C.yel, 10); m.sfx(NOISE(0.12, 0.14)); m.lose(); }
        }
    },
    draw(m) {
        for (let i = 0; i < 3; i++) m.spr("hen2", (i - 1) * 110, -128 + Math.sin(m.rt * 6 + i) * 2);
        for (const q of m.e) if (!q.ok && q.y > m.T - 30) m.spr("egg", q.x, q.y, { rot: q.y * 0.01 * q.spin });
        m.spr("pot", m.bx, 122, { sx: 2 - m.sq, sy: m.sq });
    },
    bot(m, b) { const q = m.e.filter((u) => !u.ok && !u.done).sort((p, r) => r.y - p.y)[0]; if (q) b.drag(q.x, 110); },
});

G({
    id: "dodge", tags: "steady quick", easy: true, feel: [8, 8], bg: [C.org, C.yel, "rays", 0.35], survive: true, keySpeed: 420, mood: "march", icon: "anvil", home: [0, 110], swipeLen: 999,
    hint: ["drag", -70, 110, 70, 110],
    art: {
        anvil: [120, 80, (a) => { a.P([[6, 8], [114, 8], [92, 34], [80, 34], [90, 66], [104, 74], [16, 74], [30, 66], [40, 34], [28, 34]], C.dgry); a.r(14, 12, 90, 5, "#ffffff55"); }],
        dude: [64, 90, (a, f) => { a.L(24, 66, 18 + f * 8, 86, C.navy, 6).L(40, 66, 46 - f * 8, 86, C.navy, 6); a.R(16, 34, 32, 36, 8, C.red); a.C(32, 22, 16, C.skin); a.eye(26, 18, 5, 0, -0.8).eye(38, 18, 5, 0, -0.8); a.C(32, 31, 3, INK); }, { frames: 2 }],
    },
    init(m) { m.a = [0, 1, 2, 3].map((i) => ({ x: 0, y: -430 - i * 300, aimed: false })); m.dx2 = 0; m.px2 = clamp(m.x, -146, 146); },
    tick(m, dt) {
        const old = m.px2;
        m.px2 += (clamp(m.x, -146, 146) - m.px2) * Math.min(1, dt * 26 / m.speed);
        m.dx2 = m.px2 - old;
        for (const q of m.a) {
            const was = q.y; q.y += 250 * dt;
            if (!q.aimed && q.y > -420) { q.aimed = true; q.x = clamp(m.px2 + m.rng.range(-24, 24), -128, 128); m.sfx(T("sine", 1200, 500, 0.3, 0.05)); }
            if (was < 96 && q.y >= 96) { m.hit([T("sine", 110, 50, 0.16, 0.22), NOISE(0.08, 0.1)]); m.shake(3, 0.1); m.boom(q.x, 138, [C.wht, C.gry], 6, { a0: 3.4, a1: 6, v1: 170 }); }
            if (Math.abs(q.x - m.px2) < 62 && q.y > 56 && q.y < 150 && !m.over) { m.sfx(NOISE(0.3, 0.2)); m.lose(); q.y = 96; m.squish = 1; }
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 200, { y: 248, color: C.dbrn });
        for (const q of m.a) if (q.aimed && q.y < 240) { m.shadow(q.x, 150, 22 + clamp((q.y + 420) / 520) * 34, 7, 0.45); m.spr("anvil", q.x, Math.min(q.y, 116)); }
        m.spr("dude", m.px2, 112, { f: (m.rt * 12 | 0) % 2, sy: m.squish ? 0.2 : 1, sx: m.squish ? 1.8 : 1, flip: m.dx2 < 0 });
    },
    bot(m, b) {
        const q = m.a.filter((u) => u.aimed && u.y < 150).sort((u, v) => v.y - u.y)[0];
        const best = q && Math.abs(q.x - m.px2) < 96 ? q.x + (q.x > 0 ? -104 : 104) : m.px2;
        b.drag(best, 110);
    },
});

G({
    id: "plug", tags: "steady", feel: [30, 10, 6], bg: [C.gold, C.paper, "check", 0.3], mood: "chip", icon: "lamp", swipeLen: 999, home: [-100, 90], keySpeed: 240,
    hint: ["drag", -100, 90, 100, -40],
    art: {
        lamp: [100, 170, (a, f) => { if (f) a.c(50, 50, 48, "#fff6a0"); a.P([[28, 16], [72, 16], [92, 76], [8, 76]], f ? C.yel : C.dgry); a.R(44, 76, 12, 72, 3, C.brn); a.R(20, 146, 60, 16, 5, C.brn); if (f) { a.eye(36, 50, 7, 0, 0).eye(64, 50, 7, 0, 0); a.smile(50, 62, 8, 5); } }, { frames: 2 }],
        plug: [70, 50, (a) => { a.R(4, 8, 40, 34, 8, C.pink); a.R(44, 12, 22, 7, 2, C.gry).R(44, 30, 22, 7, 2, C.gry); }],
        wall: [80, 110, (a) => { a.R(6, 6, 68, 98, 10, C.wht); a.R(30, 34, 8, 16, 2, INK).R(44, 34, 8, 16, 2, INK); a.R(30, 62, 8, 16, 2, INK).R(44, 62, 8, 16, 2, INK); }],
    },
    init(m) { m.px2 = -100; m.py2 = 90; m.grab = false; m.a = m.rng.range(0, 6); m.on = false; m.sy = 0; },
    tick(m, dt) {
        m.sy = Math.sin(m.a + m.t * 1.6) * 70;
        if (m.on) return;
        if (m.pressed && dist(m.x, m.y, m.px2, m.py2) < 60) { m.grab = true; m.hit(T("square", 400, undefined, 0.02)); }
        if (!m.down) m.grab = false;
        if (m.grab) {
            const k = Math.min(1, dt * 18 / m.speed);
            m.px2 += (m.x + Math.sin(m.rt * 15) * 3 - m.px2) * k; m.py2 += (m.y + Math.cos(m.rt * 17) * 3 - m.py2) * k;
            if (Math.abs(m.px2 - 70) < 30 && Math.abs(m.py2 - m.sy) < 30) { m.on = true; m.px2 = 86; m.py2 = m.sy; m.hit(T("square", 120, 1600, 0.1), [30, 10, 6]); m.boom(120, m.sy, [C.yel, C.cyan], 16); m.flash(C.yel, 0.15); m.win(); }
        }
    },
    draw(m, d) {
        m.spr("lamp", -96, -60, { f: m.on ? 1 : 0, k: 0.9 });
        m.spr("wall", 130, m.sy);
        for (let i = 0; i < 12; i++) { const t = i / 12, t2 = (i + 1) / 12, X = (u) => -96 + (m.px2 - 14 + 96) * u, Y = (u) => 16 + (m.py2 - 16) * u + Math.sin(u * 3.14) * 46; m.line(X(t), Y(t), X(t2), Y(t2), C.dgry, 5, false); }
        m.spr("plug", m.px2 + 6, m.py2);
        if (m.grab) d.rect(90, 90, { x: 124, y: m.sy, radius: 999, outline: 4, color: C.yel, opacity: 0.4 + Math.sin(m.rt * 12) * 0.3 });
    },
    bot(m, b) {
        if (!m.grab) { b.grab(m.px2, m.py2); return; }
        const fut = Math.sin(m.a + (m.t + 0.2 * m.speed) * 1.6) * 70; b.drag(72, fut);
    },
});

G({
    id: "trace", tags: "steady fingers", feel: [2, 2], bg: [C.paper, C.rose, "plus", 0.4], grip: true, mood: "surf", icon: "pencil", swipeLen: 999, home: [0, -100],
    hint: (m) => ["drag", m.pts[0][0], m.pts[0][1], m.pts[9][0], m.pts[9][1]], snap: (m) => [m.pts[m.at]],
    art: { pencil: [50, 130, (a) => { a.R(13, 8, 24, 86, 3, C.yel); a.P([[13, 94], [37, 94], [25, 124]], C.skin); a.p([[21, 114], [29, 114], [25, 124]], INK); a.R(13, 2, 24, 12, 3, C.pink); }] },
    init(m) {
        const n = 44, R = 118, r = 52, sp = 5; m.pts = [];
        for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + i / n * TAU, q = i / n * sp * 2 % 2, g = q < 1 ? q : 2 - q, rad = R + (r - R) * g; m.pts.push([Math.cos(a) * rad, 6 + Math.sin(a) * rad]); }
        m.at = 0; m.off = 0;
    },
    tick(m, dt) {
        if (!m.down) return;
        const look = 5;
        let bi = -1, bd = 42;
        for (let i = m.at; i < Math.min(m.pts.length, m.at + look); i++) { const q = dist(m.x, m.y, m.pts[i][0], m.pts[i][1]); if (q < bd) { bd = q; bi = i; } }
        if (bi > m.at) { m.at = bi; if (m.at % 3 === 0) m.hit(T("sine", 500 + m.at * 16, undefined, 0.03, 0.08)); m.boom(m.pts[m.at][0], m.pts[m.at][1], [C.yel], 1, { v1: 60, s1: 10 }); }
        if (m.at >= m.pts.length - 1) { m.boom(0, 6, [C.yel, C.pink, C.cyan], 26, { f: 0, v1: 340 }); m.win(); }
    },
    draw(m, d) {
        m.pts.forEach((p, i) => { const q = m.pts[i + 1]; if (q) { d.line(p, q, { color: C.gry, width: 18 }); } });
        m.pts.forEach((p, i) => { const q = m.pts[i + 1]; if (q && i < m.at) { d.line(p, q, { color: C.pink, width: 12 }); d.circle(6, { x: p[0], y: p[1], color: C.pink }); } });
        const p = m.pts[m.at]; d.circle(18, { x: p[0], y: p[1], color: C.pink, opacity: 0.35 + Math.sin(m.rt * 12) * 0.2 });
        m.spr("pencil", p[0] + 12, p[1] - 56, { rot: 0.2 });
    },
    bot(m, b) { const p = m.pts[Math.min(m.at + 2, m.pts.length - 1)]; b.drag(p[0], p[1]); },
});

G({
    id: "balance", tags: "steady", feel: [3, 20], bg: [C.lime, C.cyan, "wave", 0.3], survive: true, keySpeed: 420, mood: "march", icon: "seal2", home: [0, 100], swipeLen: 999,
    hint: ["drag", -50, 110, 50, 110],
    art: {
        pole: [40, 240, (a) => { a.R(13, 40, 14, 196, 5, C.pink); a.C(20, 22, 18, C.yel, C.gold); a.eye(20, 20, 6, 0, 0); }],
        seal2: [110, 90, (a) => { a.E(55, 60, 46, 26, C.gry, C.dgry); a.C(36, 34, 20, C.gry); a.eye(30, 26, 5, 0.2, -1); a.C(22, 36, 5, INK); }],
    },
    init(m) { m.a = 0.05 * (m.rng.chance(0.5) ? 1 : -1); m.w = 0; m.bx = 0; m.goal2 = 0; },
    tick(m, dt) {
        const old = m.bx;
        if (m.down || !m.pressed) m.goal2 = clamp(m.goal2 + m.dx, -130, 130);
        m.bx += (m.goal2 - m.bx) * Math.min(1, dt * 40 / m.speed);
        m.w += Math.sin(m.a) * 3.4 / Math.max(1, m.speed * 0.8) * dt;
        m.w *= 1 - dt * 0.9;
        m.a += m.w * dt - (m.bx - old) * 0.0065;
        if (Math.abs(m.a) > 1.15 && !m.over) { m.boom(m.bx + Math.sin(m.a) * 180, 100 - Math.cos(m.a) * 180, [C.yel, C.wht], 12); m.sfx(NOISE(0.2, 0.16)); m.lose(); }
        if ((m.t * 3 | 0) !== ((m.t - dt) * 3 | 0) && Math.abs(m.a) > 0.5) m.hit(T("square", 300 + Math.abs(m.a) * 300, undefined, 0.03, 0.05));
    },
    draw(m) {
        m.spr("seal2", m.bx - 2, 112);
        m.d.push(); m.d.translate(m.bx, 100); m.d.rotate(m.a); m.spr("pole", 0, -110); m.d.pop();
    },
    bot(m, b) { const want = clamp(m.bx + (m.a + m.w * 0.3 * m.speed) / 0.0065 * 0.6, -125, 125); b.drag(b.x + (want - m.goal2), 110); },
});

G({
    id: "rally", tags: "quick steady", feel: [16, 4], bg: [C.navy, C.cyan, "stripes", 0.12], keySpeed: 460, mood: "chip", icon: "robo", home: [0, 124], swipeLen: 999,
    hint: ["drag", -60, 130, 60, 130],
    art: {
        robo: [150, 70, (a, f) => { a.R(10, 8, 130, 46, 12, C.gry); a.R(26, 18, 26, 18, 4, f ? C.red : C.cyan).R(98, 18, 26, 18, 4, f ? C.red : C.cyan); a.l(60, 44, 90, 44, INK, 3); a.R(40, 54, 70, 12, 3, C.pink); }, { frames: 2 }],
        ball: [36, 36, (a) => { a.C(18, 18, 13, C.yel, C.org); }],
        bat: [130, 28, (a) => { a.R(4, 4, 122, 18, 9, C.pink); a.rr(10, 6, 110, 4, 2, "#ffffff88"); }],
    },
    init(m) { m.b = { x: 0, y: -112, vx: m.rng.range(-110, 110), vy: 190 }; m.bx = 0; m.n = 3; m.ex = 0; },
    tick(m, dt) {
        m.bx += (clamp(m.x, -120, 120) - m.bx) * Math.min(1, dt * 30 / m.speed);
        const q = m.b; q.x += q.vx * dt; q.y += q.vy * dt;
        m.ex += clamp(q.x - m.ex, -260 * dt, 260 * dt);
        if (Math.abs(q.x) > 150) { q.x = clamp(q.x, -150, 150); q.vx *= -1; m.sfx(T("square", 300, undefined, 0.02, 0.06)); }
        if (q.y < -112 && q.vy < 0) { q.vy = 260 + (3 - m.n) * 34; q.vx = clamp(q.vx + m.rng.range(-120, 120), -150, 150); m.sfx(T("square", 420, undefined, 0.04, 0.1)); }
        if (q.y > 112 && q.vy > 0 && q.y < 134 && Math.abs(q.x - m.bx) < 78) {
            q.vy = -q.vy; q.vx += (q.x - m.bx) * 2.4; m.n--; m.hit(T("square", 640, undefined, 0.06)); m.boom(q.x, 120, [C.yel, C.wht], 7); m.ring(q.x, 120, C.yel, 34);
            if (!m.n) m.win();
        }
        if (q.y > 170 && !m.over) { m.sfx(T("sawtooth", 300, 90, 0.3)); m.lose(); }
    },
    draw(m, d) {
        d.rect(4, 4, { color: C.wht, opacity: 0 });
        for (let i = -6; i < 7; i++) d.rect(18, 4, { x: i * 30, y: 6, color: C.wht, opacity: 0.3 });
        m.spr("robo", m.ex, -132, { f: m.over && m.done === "win" ? 1 : 0 });
        m.spr("ball", m.b.x, m.b.y); m.spr("bat", m.bx, 128);
    },
    bot(m, b) {
        const q = m.b; let x = q.x;
        if (q.vy > 0) { const tt = (118 - q.y) / q.vy; x = q.x + q.vx * tt; while (Math.abs(x) > 150) x = Math.sign(x) * (300 - Math.abs(x)); }
        b.drag(clamp(x, -120, 120), 128);
    },
});

G({
    id: "connect", tags: "brain steady", feel: [12, 6, 12], bg: [C.dgry, C.gry, "plus", 0.14], mood: "funk", icon: "port", swipeLen: 999,
    hint: (m) => ["drag", -118, m.l[0].y, 118, m.r.find((q) => q.c === m.l[0].c).y], snap: (m) => { if (m.grab) return m.r.map((q) => [118, q.y]); return m.l.filter((q) => !q.ok).map((q) => [-118, q.y]); },
    art: { port: [60, 60, (a, f) => { const c = [C.red, C.yel, C.cyan][f]; a.R(8, 8, 44, 44, 8, c); a.C(30, 30, 10, INK); }, { frames: 3 }] },
    init(m) {
        const ys = [-96, 0, 96], c = m.rng.shuffle([0, 1, 2]), c2 = m.rng.shuffle([0, 1, 2]);
        if (c2.every((v, i) => v === c[i])) c2.push(c2.shift());
        m.l = ys.map((y, i) => ({ y, c: c[i], ok: false })); m.r = ys.map((y, i) => ({ y, c: c2[i] })); m.grab = null; m.n = 3; m.bad = 0;
    },
    tick(m, dt) {
        if (m.pressed) { const o = m.l.find((q) => !q.ok && dist(-118, q.y, m.x, m.y) < 54); if (o) { m.grab = o; m.hit(T("square", 500, undefined, 0.03)); } }
        if (m.grab && (!m.down || m.x > 80)) {
            const t = m.r.find((q) => Math.abs(q.y - m.y) < 48 && m.x > 70);
            if (t && t.c === m.grab.c) { m.grab.ok = true; m.grab.to = t.y; m.n--; m.hit(T("square", 400, 1200, 0.1)); m.boom(118, t.y, [C.yel, C.wht], 12); m.grab = null; if (!m.n) { m.flash(C.yel, 0.15); m.win(); } }
            else if (!m.down) { m.grab = null; m.sfx(T("sawtooth", 300, 100, 0.12)); }
        }
    },
    draw(m) {
        const COL = [C.red, C.yel, C.cyan], wire = (x0, y0, x1, y1, c, w) => { for (let i = 0; i < 10; i++) { const t = i / 10, u = (i + 1) / 10, Y = (k) => y0 + (y1 - y0) * k * k * (3 - 2 * k); m.line(x0 + (x1 - x0) * t, Y(t), x0 + (x1 - x0) * u, Y(u), c, 8, true); } };
        for (const q of m.l) if (q.ok) wire(-118, q.y, 118, q.to, COL[q.c]);
        if (m.grab) wire(-118, m.grab.y, m.x, m.y, COL[m.grab.c]);
        for (const q of m.l) m.spr("port", -126, q.y, { f: q.c });
        for (const q of m.r) m.spr("port", 126, q.y, { f: q.c });
    },
    bot(m, b) {
        if (!m.grab) { const o = m.l.find((q) => !q.ok); if (o) b.grab(-118, o.y); return; }
        const t = m.r.find((q) => q.c === m.grab.c); b.drag(112, t.y);
    },
});

G({
    id: "dress", tags: "fingers steady", feel: [9, 26], bg: [C.sky, C.wht, "dots", 0.5], mood: "bouncy", icon: "snow", swipeLen: 999,
    hint: (m) => { const q = m.it.find((u) => !u.on); return q ? ["drag", q.hx, q.hy, q.gx, q.gy] : ["none"]; },
    snap: (m) => (m.grab ? [[m.grab.gx, m.grab.gy]] : m.it.filter((q) => !q.on).map((q) => [q.x, q.y])),
    art: {
        snow: [170, 240, (a, f) => { a.C(85, 176, 62, C.wht, "#cfe8f5"); a.C(85, 100, 44, C.wht, "#cfe8f5"); a.C(85, 46, 34, C.wht, "#d9eef8"); a.eye(72, 40, 7, 0, 0.3).eye(98, 40, 7, 0, 0.3); a.P([[85, 50], [85, 60], [116, 56]], C.org); a.frown(85, 66, 9, 4); }],
        hat: [90, 70, (a) => { a.R(8, 50, 74, 12, 4, INK); a.R(22, 8, 46, 46, 4, C.pur); a.r(22, 36, 46, 8, C.yel); }],
        scarf: [110, 80, (a) => { a.R(8, 8, 94, 24, 10, C.red); a.R(62, 22, 24, 52, 6, C.red); a.l(64, 56, 84, 56, C.wht, 3); }],
        shades: [100, 42, (a) => { a.R(6, 8, 40, 26, 8, INK).R(54, 8, 40, 26, 8, INK); a.l(40, 14, 60, 14, INK, 5); a.e(18, 16, 8, 3, "#ffffff77").e(66, 16, 8, 3, "#ffffff77"); }],
    },
    init(m) {
        m.it = [{ n: "hat", x: -118, y: -92, gx: 0, gy: -92 }, { n: "shades", x: 118, y: -40, gx: 0, gy: -48 }, { n: "scarf", x: -118, y: 90, gx: 0, gy: 26 }];
        m.it.forEach((q) => { q.hx = q.x; q.hy = q.y; q.on = false; }); m.grab = null; m.n = 3; m.bob = 0;
    },
    tick(m, dt) {
        m.bob = Math.max(0, m.bob - dt * 4);
        if (m.pressed) { m.grab = m.it.filter((q) => !q.on && dist(q.x, q.y, m.x, m.y) < 62)[0] ?? null; if (m.grab) m.sfx(T("sine", 500, 700, 0.05)); }
        if (m.grab) {
            m.grab.x = m.x; m.grab.y = m.y;
            if (dist(m.x, m.y, m.grab.gx, m.grab.gy) < 42) { const q = m.grab; q.on = true; q.x = q.gx; q.y = q.gy; m.grab = null; m.n--; m.bob = 1; m.hit(T("square", 660, 990, 0.09)); m.boom(q.gx, q.gy, [C.yel, C.pink], 8, { f: 0 }); if (!m.n) m.win(); }
            else if (!m.down) { const q = m.grab; q.x = q.hx; q.y = q.hy; m.grab = null; }
        }
    },
    draw(m, d) {
        m.spr("snow", 0, 44 + 0, { sy: 1 + m.bob * 0.05 });
        for (const q of m.it) if (!q.on && q !== m.grab) d.rect(70, 70, { x: q.gx, y: q.gy, radius: 12, outline: 3, color: C.wht, opacity: 0.6 + Math.sin(m.rt * 8) * 0.2 });
        for (const q of m.it) m.spr(q.n, q.x, q.y, { k: q === m.grab ? 1.1 : 1 });
    },
    bot(m, b) {
        if (!m.grab) { const q = m.it.find((u) => !u.on); if (q) b.grab(q.x, q.y); return; }
        b.drag(m.grab.gx, m.grab.gy);
    },
});

G({
    id: "lasso", tags: "zoo steady", feel: [4, 12, 4], bg: [C.gold, C.org, "rays", 0.35], grip: true, keySpeed: 520, dur: 5.5, mood: "surf", icon: "sofa", swipeLen: 999, hint: (m) => ["circle", m.tx, m.ty, 70],
    art: {
        sofa: [130, 96, (a, f) => { a.L(30, 74, 20 + f * 14, 92, C.brn, 6).L(100, 74, 110 - f * 14, 92, C.brn, 6); a.R(22, 10, 86, 44, 12, C.pink); a.R(6, 36, 24, 42, 10, C.mag).R(100, 36, 24, 42, 10, C.mag); a.R(26, 48, 78, 28, 8, C.rose); a.eye(48, 28, 8, 0.5, 0).eye(80, 28, 8, 0.5, 0); a.frown(64, 44, 7, 3); }, { frames: 2 }],
        },
    init(m) { m.tx = -60; m.ty = 0; m.a = m.rng.range(0, 6); m.pts = []; m.turn = 0; m.ring2 = 0; m.cap = 0; this.go2(m); },
    go2(m) { m.tx = Math.sin(m.a + m.t * 0.9) * 90; m.ty = Math.sin(m.a * 1.7 + m.t * 1.3) * 70; },
    tick(m, dt) {
        if (m.cap) { m.cap += dt; return; }
        this.go2(m);
        if (m.pressed) { m.pts = []; m.turn = 0; m.lastA = null; }
        if (m.down) {
            m.pts.push([m.x, m.y]); if (m.pts.length > 240) m.pts.shift();
            const a = Math.atan2(m.y - m.ty, m.x - m.tx), r = dist(m.x, m.y, m.tx, m.ty);
            if (r > 22 && m.lastA != null) { let da = a - m.lastA; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; m.turn += da; if ((m.turn * 2 | 0) !== ((m.turn - da) * 2 | 0)) m.hit(T("sine", 360, 460, 0.04, 0.06)); }
            m.lastA = r > 22 ? a : m.lastA;
            if (Math.abs(m.turn) >= TAU * 0.92) { m.cap = 0.001; m.hit([T("sawtooth", 300, 1100, 0.2)], [16, 20, 50]); m.boom(m.tx, m.ty, [C.yel, C.wht], 20); m.win(); }
        }
        if (!m.down && m.pts.length) m.pts = [];
    },
    draw(m, d) {
        m.shadow(m.tx, m.ty + 44, 34, 7);
        m.spr("sofa", m.tx, m.ty, { f: (m.rt * 14 | 0) % 2 });
        if (m.cap) { d.rect(100, 100, { x: m.tx, y: m.ty, radius: 999, outline: 7, color: C.brn }); }
        for (let i = 1; i < m.pts.length; i++) d.line(m.pts[i - 1], m.pts[i], { color: C.brn, width: 7 });
    },
    bot(m, b) {
        b.mem.a = (b.mem.a ?? 0) + 0.26;
        const r = 66, vx = Math.cos(m.a + m.t * 0.9) * 90 * 0.9 * m.speed * 0.1, x = m.tx + vx + Math.cos(b.mem.a) * r, y = m.ty + Math.sin(b.mem.a) * r;
        b.drag(x, y);
    },
});

G({
    id: "doodle", tags: "fingers", feel: [2], bg: [C.dbrn, C.brn, "scale", 0.25], grip: true, mood: "march", icon: "duke", home: [-40, -30], swipeLen: 999, hint: ["rub", 0, -20, 36], outro: 0.8,
    art: {
        duke: [230, 280, (a) => {
            a.R(4, 4, 222, 272, 6, C.gold); a.R(20, 20, 190, 240, 3, "#3f5b4a");
            a.R(50, 200, 130, 60, 12, C.navy); a.C(115, 118, 66, C.skin, C.tan); a.P([[50, 110], [70, 44], [160, 44], [180, 110], [150, 80], [80, 80]], C.dgry);
            a.eye(92, 112, 9, 0, 0).eye(138, 112, 9, 0, 0); a.P([[115, 118], [106, 142], [124, 142]], C.tan); a.l(98, 160, 132, 160, INK, 3);
        }],
    },
    init(m) { m.st = []; m.len = 0; m.need = 170 / Math.min(1.6, m.speed); },
    tick(m, dt) {
        if (m.pressed) m.st.push([]);
        if (m.down) {
            const c = m.st.at(-1); if (!c) { m.st.push([]); return; }
            if (dist(m.x, m.y, 0, -16) < 72) { m.len += m.rub; if ((m.len / 26 | 0) !== ((m.len - m.rub) / 26 | 0)) m.hit(T("sine", 900 + m.y * 3, undefined, 0.02, 0.05)); }
            c.push([m.x, m.y]);
            if (m.len >= m.need) { m.boom(0, -40, [C.yel, C.pink, C.wht], 20); m.win(); }
        }
    },
    draw(m, d) {
        m.spr("duke", 0, 0);
        for (const c of m.st) for (let i = 1; i < c.length; i++) { d.line(c[i - 1], c[i], { color: C.ink, width: 7 }); d.circle(3.5, { x: c[i][0], y: c[i][1], color: C.ink }); }
        if (m.done === "win") { const k = Math.min(1, m.overT * 6); d.sprite("fx", { x: 60, y: -40, width: 60 * k, height: 60 * k, frame: 0, color: C.yel }); }
        m.meter(0, 150, 150, 12, m.len / m.need, C.pink);
    },
    bot(m, b) { b.mem.a = (b.mem.a ?? 0) + 0.34; b.drag(Math.sin(b.mem.a) * 40, -18 + Math.sin(b.mem.a * 1.7) * 26); },
});

G({
    id: "sling", tags: "quick", feel: [6, 6, 30], bg: [C.sky, C.lime, "rays", 0.35], mood: "surf", icon: "fork", home: [0, 110], swipeLen: 999, keySpeed: 260,
    hint: ["drag", 0, 80, 0, 150],
    art: {
        fork: [100, 130, (a) => { a.L(50, 124, 50, 70, C.brn, 12); a.L(50, 72, 20, 18, C.brn, 11).L(50, 72, 80, 18, C.brn, 11); }],
        rock: [34, 34, (a) => { a.C(17, 17, 12, C.dgry); a.c(13, 12, 3, "#ffffff77"); }],
        pig: [120, 110, (a, f) => { a.P([[60, 10], [18, 104], [102, 104]], f ? C.gold : "#ff85c0"); a.C(60, 60, 34, C.pink); a.eye(46, 54, 7, 0, 0).eye(74, 54, 7, 0, 0); a.E(60, 74, 14, 9, C.rose); a.c(55, 74, 3, INK).c(65, 74, 3, INK); }, { frames: 2 }],
    },
    init(m) { m.tx = 0; m.v = 60 + m.level * 34; m.dirv = 1; m.a = m.rng.range(0, 6); m.pull = null; m.s2 = null; m.n = 3; m.hurt = 0; },
    tick(m, dt) {
        m.tx = Math.sin(m.a + m.t * 1.4) * 90; m.hurt = Math.max(0, m.hurt - dt * 3);
        if (m.pressed && m.y > 30 && !m.s2) m.pull = true;
        if (m.pull) {
            if (m.released || !m.down) {
                const px = clamp(m.x, -80, 80), py = clamp(m.y, 90, 170), dx = -px, dy = 70 - py;
                m.pull = null; m.s2 = { x: px * 0.3, y: 72, vx: dx * 7.6, vy: dy * 7.6 - 80 }; m.hit(T("sine", 240, 1000, 0.1)); m.n--;
            }
        }
        if (m.s2) {
            const q = m.s2; q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
            if (dist(q.x, q.y, m.tx, -100) < 46) { m.s2 = null; m.hurt = 1; m.boom(m.tx, -100, [C.pink, C.yel, C.cyan, C.wht], 30, { v1: 400 }); m.hit([T("square", 200, 90, 0.2), NOISE(0.2, 0.16)]); m.shake(6, 0.2); m.win(); }
            else if (q.y < -230 || q.y > 200 || Math.abs(q.x) > 240) { m.s2 = null; if (m.n <= 0) m.lose(); }
        }
    },
    draw(m, d) {
        m.spr("pig", m.tx, -96 + Math.sin(m.rt * 5) * 3, { sx: 1 + m.hurt * 0.2, sy: 1 - m.hurt * 0.1 });
        d.line([-120, -170], [m.tx, -150], { color: C.wht, width: 3 }); d.line([120, -170], [m.tx, -150], { color: C.wht, width: 3 });
        m.spr("fork", 0, 104);
        const px = m.pull ? clamp(m.x, -80, 80) : 0, py = m.pull ? clamp(m.y, 90, 170) : 74;
        m.line(-30, 70, px, py, C.red, 5, false); m.line(30, 70, px, py, C.red, 5, false);
        if (!m.s2 && m.n > 0 && !m.over) m.spr("rock", px, py);
        if (m.s2) m.spr("rock", m.s2.x, m.s2.y);
        if (m.pull) { for (let i = 1; i < 6; i++) d.circle(5 - i * 0.5, { x: -px * i * 0.4, y: 70 - (py - 70) * i * 0.8, color: C.wht, opacity: 0.8 }); }
    },
    bot(m, b) {
        if (m.s2) { b.release(); return; }
        if (m.n <= 0) return;
        // Solve the flight with the pig's position at impact: aim, then let go.
        const py = 165, vy = (70 - py) * 7.6 - 80, a = 130, A = 0.5 * 260, disc = vy * vy - 4 * A * (72 + 100), tof = (-vy - Math.sqrt(Math.max(0, disc))) / (2 * A);
        const release = 0.1 * m.speed, tx = Math.sin(m.a + (m.t + tof + release) * 1.4) * 90, px = clamp(tx / (tof * 7.6 * -1 + 0.3), -80, 80);
        if (!m.pull) { b.grab(0, 110); b.mem.w = 0; return; }
        b.drag(px, py); b.mem.w = (b.mem.w ?? 0) + 1;
        if (b.mem.w > 8 && b.near(px, py, 8)) { b.release(); b.mem.w = 0; }
    },
});

G({
    id: "milk", tags: "gross zoo fingers", feel: [14, 20, 14], bg: [C.grn, C.lime, "check", 0.3], mood: "bouncy", icon: "udder", swipeLen: 999, grip: true, home: [-44, 40],
    hint: (m) => ["drag", m.side ? 44 : -44, 30, m.side ? 44 : -44, 100], snap: (m) => [[m.side ? 44 : -44, 40]],
    art: {
        udder: [340, 130, (a) => { a.r(0, 0, 340, 44, C.wht); a.c(50, 14, 22, INK).c(150, 4, 18, INK).c(290, 18, 26, INK); a.E(170, 62, 92, 58, C.rose, C.pink); a.e(130, 48, 26, 12, "#ffffff88"); }, { lw: 4 }],
        teat: [44, 80, (a) => { a.R(10, 2, 24, 72, 12, C.pink); a.e(22, 66, 8, 7, C.mag); }],
        pail: [120, 90, (a) => { a.P([[10, 16], [110, 16], [96, 84], [24, 84]], C.gry); a.e(60, 16, 50, 9, INK); a.arc(60, 18, 50, 46, 3.14, 6.28, C.dgry, 3); }],
    },
    init(m) { m.side = 0; m.st = [0, 0]; m.grab = -1; m.y0 = 0; m.fill = 0; m.n = Math.min(6, Math.floor(1.6 * m.dur / m.speed) + 1); m.max = m.n; },
    tick(m, dt) {
        for (let i = 0; i < 2; i++) if (i !== m.grab) m.st[i] += (0 - m.st[i]) * Math.min(1, dt * 18);
        if (m.pressed) { const i = m.x > 0 ? 1 : 0; m.grab = i; m.y0 = m.y; m.primed = i === m.side; }
        if (!m.down) m.grab = -1;
        if (m.grab >= 0) {
            m.st[m.grab] = clamp((m.y - m.y0) / 60);
            if (m.primed && m.st[m.grab] >= 0.8) { m.primed = false; m.side = 1 - m.side; m.n--; m.fill = 1 - m.n / m.max; m.hit(NOISE(0.1, 0.08)); m.drops(m.grab ? 44 : -44, 96, C.wht, 8, { a0: 1.3, a1: 1.9, v0: 200, v1: 320 }); if (!m.n) m.win(); }
        }
    },
    draw(m, d) {
        m.spr("udder", 0, -46);
        const h = 54 * m.fill; 
        m.spr("pail", 0, 112); d.rect(82, Math.max(1, h * 0.8), { y: 112 + 26 - h * 0.4 - 10, color: C.wht, radius: 6 });
        [-44, 44].forEach((x, i) => { const on = i === m.side, q = m.st[i]; m.spr("teat", x, 26 + q * 22, { sy: 1 + q * 0.6, sx: 1 - q * 0.2 }); if (on && !m.over) m.d.rect(58, 58, { x, y: 44, radius: 99, outline: 4, color: C.yel, opacity: 0.5 + Math.sin(m.rt * 14) * 0.4 }); });
    },
    bot(m, b) {
        const x = m.side ? 44 : -44;
        if (b.isDown && m.primed) { b.drag(x, 110); return; }
        if (b.isDown) { b.release(); return; }
        if (!b.busy) b.q.push(() => { b.aim(x, 40); b.jump = b.mode === "touch"; return b.mode === "touch" || b.near(x, 40, 9); }, () => { b.want = true; return true; }, () => true);
    },
});

G({
    id: "plunge", tags: "gross fingers", feel: [24, 6, 24], bg: [C.cyan, C.wht, "check", 0.45], mood: "funk", icon: "loo", swipeLen: 999, grip: true, home: [0, -40], outro: 0.7,
    hint: ["swipe", 0, -60, 0, 40], keySpeed: 420,
    art: {
        loo: [190, 180, (a, f) => { a.R(100, 6, 76, 96, 10, C.wht); a.E(84, 110, 78, 44, C.wht, C.gry); a.e(84, 100, 62, 26, f ? "#8fae3a" : "#a9e7f6"); a.R(50, 136, 70, 38, 8, C.wht); a.R(150, 24, 18, 8, 3, C.gry); }, { frames: 2 }],
        plunger: [70, 180, (a) => { a.R(29, 4, 12, 130, 4, C.tan); a.P([[10, 170], [60, 170], [50, 130], [20, 130]], C.red); }],
        ducky: [84, 70, (a) => { a.E(42, 48, 30, 18, C.yel, C.gold); a.C(54, 24, 16, C.yel); a.eye(60, 20, 4, 0.3, 0); a.P([[68, 24], [80, 28], [68, 32]], C.org); }],
    },
    init(m) { m.n = Math.min(5, Math.floor(2 * m.dur / m.speed) + 1); m.max = m.n; m.yy = -40; m.armed = true; m.dk = 0; },
    tick(m, dt) {
        m.yy += (clamp(m.y, -100, 40) - m.yy) * Math.min(1, dt * 30 / m.speed);
        if (m.down && m.armed && m.yy > 16) { m.armed = false; m.n--; m.hit(T("sawtooth", 90, 60, 0.13, 0.2)); m.drops(-26, 30, C.cyan, 6, { a0: 3.5, a1: 5.8, v1: 240 }); m.shake(3, 0.08); if (m.n <= 0) { m.dk = 0.001; m.hit([T("sine", 300, 1200, 0.24)], [40, 20, 80]); m.drops(-26, 20, C.cyan, 20, { a0: 3.8, a1: 5.5, v0: 200, v1: 500 }); m.win(); } }
        if (m.yy < -30) m.armed = true;
        if (m.dk) m.dk += dt;
    },
    draw(m) {
        const k = m.n / m.max;
        m.spr("loo", 8, 60, { f: k > 0.4 ? 1 : 0, rot: Math.sin(m.rt * 30) * 0.01 * (1 - k) * 2 });
        if (m.dk) m.spr("ducky", -26, 40 - Math.min(180, m.dk * 900) + m.dk * m.dk * 200, { rot: m.dk * 8 });
        m.spr("plunger", -22, m.yy + 0, {});
        m.meter(140, -60, 16, 120, 1 - k, C.cyan);
    },
    bot(m, b) { b.drag(0, m.armed ? 40 : -60); },
});

G({
    id: "pick", tags: "gross fingers", feel: [4, 4, 40], bg: [C.lime, C.yel, "dots", 0.35], mood: "spooky", icon: "nose", swipeLen: 999, grip: true, home: [34, 0], outro: 0.7,
    hint: ["drag", 34, 12, 80, 140], snap: (m) => [[m.side, 12]],
    art: {
        nose: [260, 260, (a) => { a.C(130, 130, 118, C.skin, C.tan); a.P([[130, 20], [66, 130], [52, 180], [208, 180], [194, 130]], C.skin); a.E(92, 176, 22, 14, "#3b1c14").E(168, 176, 22, 14, "#3b1c14"); a.arc(130, 60, 80, 40, 3.5, 5.9, C.tan, 4); a.e(40, 44, 18, 7, C.rose).e(220, 44, 18, 7, C.rose); }],
        glob: [60, 60, (a) => { a.C(30, 30, 20, C.lime, C.grn); a.eye(30, 28, 6, 0, 0.4); }],
    },
    init(m) { m.side = m.rng.chance(0.5) ? -38 : 38; m.grab = false; m.ex = 0; m.gx = m.side; m.gy = 12; m.other = -m.side; },
    tick(m, dt) {
        if (m.pressed && dist(m.x, m.y, m.side, 12) < 52) { m.grab = true; m.hit(T("sine", 200, 100, 0.08, 0.1)); }
        if (!m.down) m.grab = false;
        if (m.grab) {
            m.gx += (m.x - m.gx) * Math.min(1, dt * 16 / m.speed); m.gy += (Math.max(12, m.y) - m.gy) * Math.min(1, dt * 16 / m.speed);
            const e = dist(m.gx, m.gy, m.side, 12);
            if ((e / 16 | 0) !== (m.ex / 16 | 0)) m.hit(T("sawtooth", 200 + e * 3, undefined, 0.03, 0.06));
            m.ex = e;
            if (e > 118) { m.hit(NOISE(0.1, 0.2), [10, 10, 60]); m.boom(m.gx, m.gy, [C.lime, C.grn], 16); m.shake(4, 0.1); m.win(); m.grab = false; }
        } else if (!m.done) { m.gx += (m.side - m.gx) * Math.min(1, dt * 12); m.gy += (12 - m.gy) * Math.min(1, dt * 12); }
    },
    draw(m) {
        m.spr("nose", 0, -44, { k: 1 });
        const n = 8, sw = (i) => Math.sin(i + m.rt * 6) * 3;
        if (!m.done) for (let i = 0; i < n; i++) { const t = i / n, u = (i + 1) / n; m.line(m.side + (m.gx - m.side) * t + sw(i), 12 + (m.gy - 12) * t, m.side + (m.gx - m.side) * u + sw(i + 1), 12 + (m.gy - 12) * u, C.lime, 10 - t * 4, false); }
        m.spr("glob", m.gx, m.gy + 6, { sy: 1 + m.ex * 0.002 });
    },
    bot(m, b) {
        if (!m.grab) { b.grab(m.side, 12); return; }
        b.drag(m.side + 30, 150);
    },
});
