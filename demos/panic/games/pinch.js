// Two-finger games. On a phone use two real fingers; with one pointer the second finger mirrors yours across the object.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

G({
    id: "pinch", tags: "fingers gross", easy: true, feel: [10, 6, 30], bg: [C.yel, C.cyan, "wave", 0.35], mood: "surf", icon: "claw", swipeLen: 999, home: [-120, 20], hint: ["pinch", 0, 20],
    art: {
        toe: [200, 170, (a, f) => { a.E(100, 110, 88, 50, C.skin, C.tan); a.C(30, 86, 22, C.skin); for (let i = 0; i < 4; i++) a.C(70 + i * 30, 66 - i * 3, 16 - i * 2, C.skin); a.e(30, 80, 12, 8, C.rose); if (f) { a.E(100, 110, 88, 50, C.red, C.mag); } }, { frames: 2 }],
        claw: [100, 100, (a) => { a.P([[10, 60], [40, 8], [92, 40], [58, 50], [90, 78], [38, 92]], C.red); a.e(40, 34, 14, 7, "#ffffff77"); }],
        towel: [300, 80, (a) => { a.R(6, 6, 288, 68, 6, C.pink); for (let i = 0; i < 6; i++) a.r(20 + i * 50, 6, 20, 68, C.wht); }],
    },
    init(m) { m.gap = 130; m.live = false; m.pivot = [0, 20]; },
    tick(m, dt) {
        if (m.f1 && !m.live && m.spread > 96) { m.live = true; m.hit(T("square", 300, undefined, 0.04)); }
        if (!m.f1) m.live = false;
        const goal = m.live ? clamp(m.spread / 2, 6, 130) : 130, old = m.gap;
        m.gap += (goal - m.gap) * Math.min(1, dt * 22 / m.speed);
        if ((old / 14 | 0) !== (m.gap / 14 | 0)) m.hit(T("square", 500 + (130 - m.gap) * 6, undefined, 0.02, 0.07));
        if (m.gap < 30 && m.live && !m.over) { m.hit([T("sawtooth", 1400, 500, 0.3, 0.14), NOISE(0.1, 0.1)]); m.boom(0, 20, [C.yel, C.wht, C.red], 16); m.shake(6, 0.2); m.win(); }
    },
    draw(m) {
        m.spr("towel", 0, 120);
        m.spr("toe", 0, 30, { f: m.done === "win" ? 1 : 0, rot: m.done === "win" ? Math.sin(m.rt * 50) * 0.06 : 0 });
        m.spr("claw", -m.gap - 24, 24, { rot: -0.5 + (130 - m.gap) * 0.006 });
        m.spr("claw", m.gap + 24, 24, { flip: true, rot: 0.5 - (130 - m.gap) * 0.006 });
    },
    bot(m, b) {
        if (b.mode === "touch") { const q = m.live ? 8 : 130; b.two(-q, 20, q, 20); return; }
        if (!m.live) { b.drag(-110, 20); return; }
        b.drag(-8, 20);
    },
});

G({
    id: "stretch", tags: "fingers zoo", feel: [4, 20, 4], bg: [C.org, C.yel, "stripes", 0.3], mood: "march", icon: "dach", swipeLen: 999, home: [-34, 20], hint: ["spread", 0, 20],
    art: {
        head: [90, 90, (a) => { a.C(50, 46, 32, C.brn); a.E(26, 52, 13, 30, C.dbrn); a.eye(46, 38, 8, 0.5, 0).eye(70, 38, 7, 0.5, 0); a.E(80, 54, 8, 7, INK); a.smile(66, 66, 10, 5); }],
        tail: [70, 70, (a) => { a.C(40, 40, 22, C.brn); a.L(24, 30, 8, 8, C.brn, 6); }],
        dach: [130, 60, (a) => { a.R(4, 8, 100, 40, 18, C.brn); a.C(112, 22, 20, C.brn); a.eye(116, 18, 5, 0, 0); a.E(104, 26, 7, 14, C.dbrn); }],
        bone: [70, 34, (a) => { a.C(10, 10, 8, C.wht).C(10, 24, 8, C.wht).C(60, 10, 8, C.wht).C(60, 24, 8, C.wht).R(10, 9, 50, 16, 3, C.wht); }],
    },
    init(m) { m.w = 56; m.live = false; m.pivot = [0, 20]; m.goal = 128; },
    tick(m, dt) {
        if (m.f1 && !m.live && m.spread < 150) { m.live = true; m.hit(T("square", 300, undefined, 0.04)); }
        if (!m.f1) m.live = false;
        const old = m.w, goal = m.live ? clamp(m.spread / 2, 40, 150) : Math.max(56, m.w - dt * 80);
        m.w += (goal - m.w) * Math.min(1, dt * 18 / m.speed);
        if ((old / 8 | 0) !== (m.w / 8 | 0)) m.hit(T("sine", 200 + m.w * 7, undefined, 0.05, 0.08));
        if (m.w >= m.goal && !m.over) { m.hit(T("sine", 700, 1500, 0.2), [10, 30, 10, 30]); m.boom(-m.goal - 20, 20, [C.yel, C.wht], 10); m.boom(m.goal + 20, 20, [C.yel, C.wht], 10); m.win(); }
    },
    draw(m, d) {
        const w = m.w, th = clamp(44 - w * 0.2, 16, 44);
        m.spr("bone", -150, 20, { rot: 1.5 }); m.spr("bone", 150, 20, { rot: -1.5 });
        d.rect(w * 2 + 12, th + 8, { y: 28, color: INK, radius: 12 }); d.rect(w * 2 + 4, th, { y: 28, color: C.brn, radius: 8 });
        for (const x of [-w * 0.7, w * 0.7]) { d.rect(10, 22, { x, y: 44 + th / 2, color: INK, radius: 3 }); }
        m.spr("tail", -w - 14, 18, { flip: false });
        m.spr("head", w + 18, 8, {});
    },
    bot(m, b) {
        if (b.mode === "touch") { const q = m.live ? 150 : 56; b.two(-q, 20, q, 20); return; }
        if (!m.live) { b.drag(-40, 20); return; }
        b.drag(-150, 20);
    },
});

G({
    id: "twist", tags: "fingers food", feel: [14, 14, 14], bg: [C.grn, C.yel, "plus", 0.3], grip: true, keySpeed: 640, mood: "funk", icon: "jar", swipeLen: 999, home: [60, -50], hint: ["twist", 0, -50, 60], outro: 0.7,
    art: {
        jar: [190, 180, (a) => { a.R(16, 12, 158, 160, 26, "#c9f5ff"); a.r(36, 28, 10, 120, "#ffffffbb"); }, { lw: 4 }],
        lid: [190, 56, (a) => { a.R(8, 6, 174, 44, 8, C.red); for (let i = 0; i < 14; i++) a.l(18 + i * 12, 8, 18 + i * 12, 48, C.mag, 3); }],
        bug: [34, 34, (a) => { a.c(17, 17, 15, "#fff29a"); a.C(17, 17, 7, C.yel); a.c(14, 15, 2, INK).c(21, 15, 2, INK); }, { lw: 2.5 }],
    },
    init(m) { m.pivot = [0, -50]; m.a = 0; m.la = null; m.need = TAU * 1.3; m.b2 = [0, 1, 2, 3, 4, 5].map((i) => ({ x: m.rng.range(-50, 50), y: m.rng.range(10, 100), p: i })); m.off = 0; },
    tick(m, dt) {
        if (!m.f1) { m.la = null; }
        else {
            const a = m.ang;
            if (m.la != null) { let da = a - m.la; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU; const old = m.a; m.a += da; if ((Math.abs(old) / 0.7 | 0) !== (Math.abs(m.a) / 0.7 | 0)) { m.hit(T("square", 240 + Math.abs(m.a) * 40, undefined, 0.04, 0.12)); m.boom(0, -50, [C.gry], 1, { f: 5, v1: 80 }); } }
            m.la = a;
        }
        if (Math.abs(m.a) >= m.need && !m.over) { m.hit(T("sine", 300, 1300, 0.2), [10, 10, 40]); m.boom(0, 0, [C.yel, "#fff29a", C.wht], 30, { g: -60, v1: 340, f: 0 }); m.win(); }
        if (m.done === "win") m.off = Math.min(200, m.off + dt * 700);
    },
    draw(m, d) {
        for (const q of m.b2) m.spr("bug", q.x + Math.sin(m.rt * 5 + q.p) * 14, q.y - (m.done === "win" ? m.overT * 360 : 0) + Math.cos(m.rt * 4 + q.p) * 10);
        m.spr("jar", 0, 56);
        const k = clamp(Math.abs(m.a) / m.need), t = m.a * 2.6;
        m.spr("lid", 0, -50 - k * 16 - m.off, { sx: 1 + Math.sin(t) * 0.02 });
        d.rect(150, 4, { x: Math.sin(t) * 40, y: -50 - k * 16 - m.off, color: C.wht, opacity: 0.7 });
        if (m.f1) { m.disc(m.f1.x, m.f1.y, 10, C.yel, 0.8); m.disc(m.f2.x, m.f2.y, 10, C.yel, 0.8); }
    },
    bot(m, b) {
        b.mem.a = (b.mem.a ?? 0) + 0.2;
        const c = Math.cos(b.mem.a) * 64, s = Math.sin(b.mem.a) * 64;
        if (b.mode === "touch") b.two(c, -50 + s, -c, -50 - s); else b.drag(c, -50 + s);
    },
});

G({
    id: "pluck", tags: "gross fingers", feel: [3, 3, 34], bg: [C.lil, C.pur, "tri", 0.3], mood: "spooky", icon: "chin", swipeLen: 999, keySpeed: 360,
    hint: (m) => { const q = m.h[m.at]; return q ? ["drag", q.x, q.y, q.x + q.dx * 80, q.y + q.dy * 80] : ["none"]; }, snap: (m) => m.h.filter((q) => !q.out).map((q) => [q.x, q.y]),
    art: {
        chin: [300, 260, (a) => { a.C(150, 30, 136, C.lime, C.grn); a.eye(100, 10, 16, 0, 0.5).eye(200, 10, 16, 0, 0.5); a.E(150, 58, 16, 22, C.grn); a.c(232, 70, 14, C.dgrn); a.arc(150, 90, 50, 24, 0.3, 2.84, INK, 5); }],
        tw: [60, 130, (a, f) => { const g = f ? 3 : 14; a.L(30, 6, 30 - g, 118, C.gry, 6).L(30, 6, 30 + g, 118, C.gry, 6); }, { frames: 2, lw: 2.6 }],
    },
    init(m) {
        m.h = [[-74, 2, -0.5, 0.86], [0, 28, 0, 1], [74, 2, 0.5, 0.86]].map(([x, y, dx, dy]) => ({ x, y, dx, dy, len: 0, out: false })); m.at = 0; m.gr = null; m.n = 3;
    },
    tick(m, dt) {
        if (m.pressed) { m.gr = m.h.find((q) => !q.out && dist(m.x, m.y, q.x + q.dx * 22, q.y + q.dy * 22) < 44) ?? null; if (m.gr) { m.hit(T("square", 900, undefined, 0.02)); m.px0 = m.x; m.py0 = m.y; } }
        if (!m.down) { if (m.gr) m.gr.len = 0; m.gr = null; }
        if (m.gr) {
            const q = m.gr, old = q.len; q.len = clamp((m.x - m.px0) * q.dx + (m.y - m.py0) * q.dy, 0, 70);
            if ((old / 12 | 0) !== (q.len / 12 | 0)) m.hit(T("sawtooth", 500 + q.len * 12, undefined, 0.03, 0.05));
            if (q.len >= 56) { q.out = true; m.gr = null; m.n--; m.hit(T("sine", 1600, 500, 0.08), [4, 4, 36]); m.boom(q.x, q.y, [C.yel, C.wht], 8); m.shake(3, 0.08); while (m.h[m.at]?.out) m.at++; if (!m.n) m.win(); }
        }
    },
    draw(m, d) {
        m.spr("chin", 0, -60, { rot: m.gr ? Math.sin(m.rt * 40) * 0.01 : 0 });
        for (const q of m.h) {
            if (q.out) { d.circle(4, { x: q.x, y: q.y, color: C.red }); continue; }
            const L = 40 + q.len;
            m.line(q.x, q.y, q.x + q.dx * L, q.y + q.dy * L, INK, 4, false);
            d.circle(9, { x: q.x, y: q.y, color: C.dgrn });
        }
        m.spr("tw", m.x, m.y - 62, { f: m.gr ? 1 : 0 });
    },
    bot(m, b) {
        const q = m.h[m.at];
        if (!q) return;
        const x = q.x + q.dx * 26, y = q.y + q.dy * 26;
        if (m.gr) { b.drag(m.px0 + q.dx * 66, m.py0 + q.dy * 66); return; }
        b.grab(x, y);
    },
});

G({
    id: "squeeze", tags: "food fingers", feel: [20, 10], bg: [C.lime, C.yel, "dots", 0.35], mood: "bouncy", icon: "lemon", swipeLen: 999, home: [-100, -30], hint: ["pinch", 0, -30],
    art: {
        lemon: [190, 150, (a, f) => { a.E(95, 75, 82, 62, C.yel, C.gold); a.C(13, 75, 9, C.yel).C(177, 75, 9, C.yel); if (f) { a.eye(62, 62, 12, 0.3, 0).eye(126, 62, 12, -0.3, 0); a.E(95, 100, 12, 12, INK); } else { a.arc(62, 62, 11, 11, 3.2, 6.2, INK, 3.4).arc(126, 62, 11, 11, 3.2, 6.2, INK, 3.4); a.smile(95, 98, 14, 8); } }, { frames: 2 }],
        glass: [120, 130, (a) => { a.P([[10, 6], [110, 6], [96, 124], [24, 124]], "#d2f6ff"); }, { lw: 4 }],
    },
    init(m) { m.w = 1; m.pivot = [0, -30]; m.n = 3; m.armed = false; m.fill = 0; },
    tick(m, dt) {
        const goal = m.f1 ? clamp(m.spread / 180, 0.42, 1) : 1;
        m.w += (goal - m.w) * Math.min(1, dt * 24 / m.speed);
        if (m.w > 0.76) m.armed = true;
        if (m.f1 && m.armed && m.w < 0.58) { m.armed = false; m.n--; m.fill = 1 - m.n / 3; m.hit([T("sine", 600, 200, 0.1), NOISE(0.06, 0.06)]); m.drops(0, 20, C.yel, 12, { a0: 1, a1: 2.1, v0: 150, v1: 340 }); if (!m.n) m.win(); }
    },
    draw(m, d) {
        const h = 100 * m.fill;
        d.rect(84, Math.max(1, h), { x: 0, y: 150 - h / 2, color: C.yel, radius: 6 });
        m.spr("glass", 0, 94);
        m.spr("lemon", 0, -30, { f: m.w < 0.7 ? 1 : 0, sx: m.w, sy: 2 - m.w * 1.05 });
        if (m.f1) { m.disc(m.f1.x, m.f1.y, 12, C.pink, 0.75); m.disc(m.f2.x, m.f2.y, 12, C.pink, 0.75); }
    },
    bot(m, b) {
        const q = m.armed ? 44 : 110;
        if (m.w > 0.76 && !m.armed) return;
        if (b.mode === "touch") b.two(-q, -30, q, -30); else b.drag(-q, -30);
    },
});
