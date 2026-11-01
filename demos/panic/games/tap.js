// Tap games: a single precise poke, over and over, in eleven different flavours of nonsense.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

const fair = (m, n, rate = 2.6) => Math.min(n, Math.max(2, Math.floor(rate * m.dur / m.speed)));

G({
    id: "swat", tags: "zoo food quick", easy: true, feel: [6, 14, 6], bg: [C.pink, C.rose, "dots"], mood: "chip",
    hint: (m) => ["tap", m.f[0].x, m.f[0].y], snap: (m) => m.f.filter((f) => !f.dead).map((f) => [f.x, f.y]),
    icon: "fly",
    art: {
        fly: [56, 46, (a, f) => {
            a.e(18, f ? 8 : 12, 12, 7, "#ffffffcc").e(38, f ? 8 : 12, 12, 7, "#ffffffcc");
            a.E(28, 26, 16, 12, INK, C.dgry).C(40, 24, 8, C.dgry).eye(43, 22, 5, 0.5, 0.2).l(14, 34, 10, 42, INK, 2.4).l(24, 37, 22, 44, INK, 2.4).l(34, 37, 36, 44, INK, 2.4);
        }, { frames: 2 }],
        cake: [190, 160, (a) => {
            a.R(12, 92, 166, 58, 12, C.rose).R(30, 42, 130, 56, 10, C.paper);
            a.rr(30, 42, 130, 18, 8, C.pink); for (let i = 0; i < 7; i++) a.c(38 + i * 19, 60, 8, C.pink);
            a.rr(12, 92, 166, 14, 6, C.wht); for (let i = 0; i < 9; i++) a.c(20 + i * 19, 106, 7, C.wht);
            a.R(92, 8, 8, 36, 2, C.cyan).C(96, 7, 5, C.yel);
        }],
        swatter: [64, 110, (a) => { a.L(32, 60, 32, 106, C.red, 6); a.R(8, 6, 48, 56, 8, C.yel); for (let i = 1; i < 4; i++) a.l(8 + i * 12, 8, 8 + i * 12, 60, C.gold, 2).l(8, 6 + i * 14, 56, 6 + i * 14, C.gold, 2); }],
    },
    init(m) {
        const r = m.rng;
        m.f = [0, 1, 2].map((i) => ({ x: 0, y: 0, a: r.range(0, 6), b: r.range(0, 6), p: 0.8 + i * 0.13, dead: false, vy: 0 }));
        m.sw = null; m.left3 = 3; this.place(m);
    },
    place(m) { for (const f of m.f) if (!f.dead) { f.x = Math.sin(f.a + m.t * 1.4 * f.p) * 115; f.y = -30 + Math.sin(f.b + m.t * 2.1 * f.p) * 105; } },
    tick(m, dt) {
        this.place(m);
        for (const f of m.f) if (f.dead) { f.vy += 900 * dt; f.y += f.vy * dt; }
        if (m.sw) { m.sw.t -= dt; if (m.sw.t <= 0) m.sw = null; }
        if (m.pressed) {
            m.sw = { x: m.x, y: m.y, t: 0.16 };
            let hit = null, bd = 44;
            for (const f of m.f) { const q = f.dead ? 99 : dist(f.x, f.y, m.x, m.y); if (q < bd) { bd = q; hit = f; } }
            if (hit) {
                hit.dead = true; hit.vy = -120; m.left3--; m.hit(T("square", 900, 140, 0.09)); m.boom(hit.x, hit.y, [C.yel, C.wht], 8); m.shake(3, 0.08); m.freeze(0.04);
                if (!m.left3) m.win();
            } else m.sfx(NOISE(0.05, 0.07));
        }
    },
    draw(m) {
        m.shadow(0, 118, 100, 12); m.spr("cake", 0, 40);
        for (const f of m.f) m.spr("fly", f.x, f.y, { f: (m.rt * 30 | 0) % 2, rot: f.dead ? 2.6 : Math.sin(m.rt * 9 + f.a) * 0.2, sy: f.dead ? -1 : 1 });
        if (m.sw) m.spr("swatter", m.sw.x + 8, m.sw.y + 34, { rot: -0.25 + m.sw.t * 5 });
    },
    bot(m, b) { const f = m.f.find((q) => !q.dead); if (f) b.tap(f.x, f.y); },
});

G({
    id: "pop", tags: "fingers", easy: true, feel: [4], bg: [C.cyan, C.sky, "plus"], mood: "bouncy",
    hint: (m) => ["tap", m.b[0].x, m.b[0].y], snap: (m) => m.b.filter((q) => !q.done).map((q) => [q.x, q.y]),
    art: {
        wrap: [78, 78, (a, f) => {
            if (!f) { a.C(39, 39, 33, "#d7f7ff", "#79dbf2"); a.e(28, 26, 13, 8, "#ffffffdd"); a.e(50, 52, 8, 5, "#ffffff55"); }
            else { a.C(39, 39, 33, "#a9e7f6"); a.l(16, 42, 34, 30, "#5fbcd4", 3).l(34, 30, 44, 46, "#5fbcd4", 3).l(44, 46, 62, 36, "#5fbcd4", 3); }
        }, { frames: 2, lw: 3 }],
    },
    init(m) {
        const n = fair(m, 9) >= 9 ? 9 : 6, cols = 3, rows = n / 3, g = 92;
        m.b = []; for (let i = 0; i < n; i++) m.b.push({ x: ((i % cols) - 1) * g, y: (Math.floor(i / cols) - (rows - 1) / 2) * g, done: false, s: 1 });
        m.n = n;
    },
    tick(m, dt) {
        for (const q of m.b) q.s += (1 - q.s) * Math.min(1, dt * 16);
        if (!m.pressed) return;
        for (const q of m.b) if (!q.done && dist(q.x, q.y, m.x, m.y) < 46) {
            q.done = true; q.s = 1.35; m.n--; m.hit([T("square", 1500 + m.rng.range(0, 700), 300, 0.04, 0.16), NOISE(0.03, 0.14)]); m.boom(q.x, q.y, [C.wht, C.sky], 6, { v1: 160, s1: 12 });
            if (!m.n) m.win();
            break;
        }
    },
    draw(m, d) {
        const h2 = m.b.at(-1).y - m.b[0].y + 106;
        d.rect(308, h2 + 8, { y: 6, color: INK, radius: 20, opacity: 0.25 }); d.rect(304, h2, { color: "#ffffff", opacity: 0.55, radius: 18 });
        for (const q of m.b) m.spr("wrap", q.x, q.y, { f: q.done ? 1 : 0, sx: q.s, sy: q.s });
    },
    bot(m, b) { const q = m.b.find((u) => !u.done); if (q) b.tap(q.x, q.y); },
});

G({
    id: "bonk", tags: "zoo quick", easy: true, feel: [16, 20, 8], bg: [C.grn, C.lime, "tri"], mood: "march",
    hint: () => ["tap", 0, -20], snap: (m) => m.h.filter((h) => h.up > 0.5).map((h) => [h.x, h.y - 26]),
    icon: "gopher",
    art: {
        gopher: [80, 92, (a, f) => {
            a.E(40, 56, 28, 36, C.brn, C.dbrn).e(40, 74, 16, 16, C.tan);
            a.eye(28, 42, 8, 0.2, 0.4).eye(52, 42, 8, -0.2, 0.4); a.C(40, 54, 5, INK);
            a.R(33, 60, 7, 10, 1, C.wht).R(41, 60, 7, 10, 1, C.wht);
            const hats = [C.red, C.pur, C.yel]; a.R(20, 18, 40, 8, 3, hats[f]).R(28, 2, 24, 18, 3, hats[f]);
        }, { frames: 3 }],
        hole: [100, 40, (a) => { a.E(50, 20, 44, 15, "#2a1a10"); a.arc(50, 20, 46, 17, 0.2, 2.9, C.brn, 4); }],
        hammer: [90, 90, (a) => { a.L(30, 62, 56, 34, C.tan, 8); a.R(24, 4, 58, 40, 12, C.red); a.rr(30, 10, 46, 8, 3, "#ffffff66"); }],
    },
    init(m) {
        m.h = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; m.h.push({ x: Math.cos(a) * 112, y: 8 + Math.sin(a) * 104, up: 0, st: 0, hit: 0, hat: i % 3 }); }
        m.need = 3; m.next = 0.1; m.bk = null;
    },
    tick(m, dt) {
        m.next -= dt;
        if (m.next <= 0) { const free = m.h.filter((h) => h.st === 0); if (free.length) { const h = m.rng.pick(free); h.st = 1; h.timer = 1.25 - m.level * 0.25; } m.next = 0.55 - m.level * 0.12; }
        for (const h of m.h) {
            if (h.st === 1) { h.up = Math.min(1, h.up + dt * 8); h.timer -= dt; if (h.timer <= 0) h.st = 2; }
            if (h.st === 2) { h.up -= dt * 9; if (h.up <= 0) { h.up = 0; h.st = 0; h.hit = 0; } }
        }
        if (m.bk) { m.bk.t -= dt; if (m.bk.t <= 0) m.bk = null; }
        if (m.pressed) {
            m.bk = { x: m.x, y: m.y, t: 0.14 };
            for (const h of m.h) if (h.st === 1 && h.up > 0.35 && dist(h.x, h.y - 24, m.x, m.y) < 52) {
                h.st = 2; h.hit = 1; m.need--; m.hit(T("sawtooth", 300, 60, 0.13, 0.18)); m.boom(h.x, h.y - 40, [C.yel, C.wht], 9); m.shake(4, 0.1); m.freeze(0.05);
                if (!m.need) m.win();
                return;
            }
            m.sfx(T("triangle", 180, 120, 0.06, 0.1));
        }
    },
    draw(m, d) {
        for (const h of m.h) {
            m.spr("hole", h.x, h.y + 14);
            if (h.up > 0) m.spr("gopher", h.x, h.y - 30 + (1 - h.up) * 38, { f: h.hat, sy: h.hit ? 0.72 : h.up, sx: h.hit ? 1.22 : 1 });
            d.rect(100, 24, { x: h.x, y: h.y + 36, color: C.grn });
            m.spr("hole", h.x, h.y + 14, { sy: 0.001 });
        }
        if (m.bk) m.spr("hammer", m.bk.x + 16, m.bk.y - 20, { rot: -0.6 + m.bk.t * 4 });
    },
    bot(m, b) { const h = m.h.find((q) => q.st === 1 && q.up > 0.5); if (h) b.tap(h.x, h.y - 24); },
});

G({
    id: "spot", tags: "zoo brain", feel: [10, 30, 10], bg: [C.sky, C.wht, "wave"], mood: "surf", icon: "peng",
    hint: ["none"], snap: (m) => m.c.map((q) => [q.x, q.y]), outro: 0.7,
    art: {
        peng: [62, 78, (a, f) => {
            a.E(31, 44, 22, 28, INK, "#2a2542").e(31, 50, 14, 20, C.wht).L(11, 42, 6, 58, INK, 4).L(51, 42, 56, 58, INK, 4);
            a.C(31, 21, 16, INK); a.eye(25, 19, 5, f ? -0.6 : 0.6, 0).eye(37, 19, 5, f ? -0.6 : 0.6, 0); a.p([[25, 26], [37, 26], [31, 33]], C.org);
            a.E(21, 72, 8, 4, C.org).E(41, 72, 8, 4, C.org);
            if (f) a.P([[31, 38], [17, 31], [17, 45]], C.pink).P([[31, 38], [45, 31], [45, 45]], C.pink).C(31, 38, 3, C.mag);
        }, { frames: 2 }],
    },
    init(m) {
        const cols = 4, rows = m.level > 0.5 ? 4 : 3, gx = 74, gy = 86, odd = m.rng.int(0, cols * rows - 1);
        m.c = []; for (let i = 0; i < cols * rows; i++) m.c.push({ x: (i % cols - 1.5) * gx, y: (Math.floor(i / cols) - (rows - 1) / 2) * (rows === 4 ? 76 : gy), odd: i === odd, jump: 0 });
        m.o = m.c[odd]; m.w = null;
    },
    tick(m, dt) {
        for (const c of m.c) c.jump = Math.max(0, c.jump - dt * 2.4);
        if (m.pressed) for (const c of m.c) if (Math.abs(c.x - m.x) < 36 && Math.abs(c.y - m.y) < 40) {
            if (c.odd) { c.jump = 1; m.hit(T("sine", 700, 1400, 0.16, 0.18)); m.ring(c.x, c.y, C.pink, 70); m.boom(c.x, c.y, [C.pink, C.yel], 12); m.win(); }
            else { m.w = c; m.sfx(T("sawtooth", 200, 90, 0.2)); m.lose(); }
            break;
        }
    },
    draw(m) {
        for (const c of m.c) {
            m.shadow(c.x, c.y + 34, 22, 5);
            m.spr("peng", c.x + (c === m.w ? Math.sin(m.rt * 50) * 3 : 0), c.y - Math.sin(c.jump * Math.PI) * 40 + Math.sin(m.rt * 5 + c.x) * 1.6, { f: c.odd ? 1 : 0, k: m.c.length > 12 ? 0.86 : 1 });
        }
    },
    bot(m, b) { if (m.t > 0.25) b.tap(m.o.x, m.o.y); },
});

G({
    id: "feed", tags: "zoo food", feel: [8, 24, 16], bg: [C.org, C.yel, "scale"], mood: "bouncy", icon: "chick",
    hint: (m) => ["tap", m.c[m.open].x, m.c[m.open].y], snap: (m) => [[m.c[m.open].x, m.c[m.open].y]], home: [0, 0],
    art: {
        chick: [84, 96, (a, f) => {
            a.E(42, 62, 30, 30, C.yel, C.gold);
            if (f) { a.P([[14, 46], [70, 46], [42, 92]], C.red); a.P([[14, 46], [70, 46], [42, 22]], C.org); a.e(42, 56, 9, 8, C.mag); a.eye(16, 30, 8, 0.3, 0).eye(68, 30, 8, -0.3, 0); }
            else { a.P([[28, 40], [56, 40], [42, 56]], C.org); a.eye(26, 32, 8, 0, 0).eye(58, 32, 8, 0, 0); }
        }, { frames: 2 }],
        nest: [300, 86, (a) => { a.E(150, 44, 142, 34, C.brn, C.dbrn); for (let i = 0; i < 20; i++) { const x = 18 + i * 14; a.l(x, 30 + (i % 3) * 9, x + 28, 62 - (i % 4) * 8, C.tan, 3); } }],
        worm: [40, 60, (a) => { a.L(20, 10, 13, 24, C.pink, 8).L(13, 24, 25, 36, C.pink, 8).L(25, 36, 18, 50, C.pink, 8); a.eye(20, 9, 4, 0, 0.3); }],
    },
    init(m) { m.c = [-1, 0, 1].map((i) => ({ x: i * 94, y: 28, s: 1 })); m.open = 1; m.sw = 1.1; m.need = fair(m, 4, 1.4); m.w = []; m.full = 0; },
    tick(m, dt) {
        m.sw -= dt;
        if (m.sw <= 0) { m.open = (m.open + 1 + m.rng.int(0, 1)) % 3; m.sw = 1 - m.level * 0.15; m.sfx(T("sine", 1200, 1800, 0.07, 0.07)); }
        for (const c of m.c) c.s += (1 - c.s) * Math.min(1, dt * 12);
        for (const w of m.w) { w.y += 760 * dt; if (w.y > w.ty) w.dead = true; }
        for (const w of m.w) if (w.dead && !w.ok) { w.ok = 1; const c = m.c[w.c]; c.s = 1.3; m.hit(T("sine", 500, 900, 0.1, 0.16)); m.boom(c.x, c.y - 30, [C.pink, C.yel], 6, { f: 1 }); m.full++; if (m.full >= m.need) m.win(); }
        m.w = m.w.filter((w) => !w.dead);
        if (m.pressed) {
            const o = m.c[m.open];
            if (dist(o.x, o.y - 10, m.x, m.y) < 62) { if (!m.w.some((w) => w.c === m.open)) m.w.push({ x: o.x, y: m.T + 20, ty: o.y - 40, c: m.open }); }
            else m.sfx(T("square", 200, 160, 0.05, 0.05));
        }
    },
    draw(m) {
        m.c.forEach((c, i) => m.spr("chick", c.x, c.y + Math.sin(m.rt * 18 + i) * (i === m.open ? 3 : 0.6), { f: i === m.open ? 1 : 0, sx: c.s, sy: 2 - c.s }));
        m.spr("nest", 0, 84);
        for (const w of m.w) m.spr("worm", w.x, w.y);
    },
    bot(m, b) { if (m.sw > 0.15 && !m.w.length) b.tap(m.c[m.open].x, m.c[m.open].y - 8); },
});

G({
    id: "stomp", tags: "zoo quick", feel: [30, 20, 10], bg: [C.gry, C.wht, "check", 0.3], mood: "funk", icon: "boot",
    hint: () => ["tap", 0, 40], swipeLen: 999,
    art: {
        boot: [130, 130, (a) => { a.R(34, 4, 54, 72, 8, C.brn); a.R(18, 70, 106, 42, 16, C.dbrn); a.R(14, 106, 112, 16, 5, INK); for (let i = 0; i < 5; i++) a.l(44, 18 + i * 12, 78, 18 + i * 12, C.yel, 2.4); }],
        bug: [70, 50, (a, f) => { for (let i = 0; i < 3; i++) { const y = f ? 3 : -3; a.l(20 + i * 14, 28, 12 + i * 14, 44 + y * (i % 2 ? 1 : -1), INK, 3).l(20 + i * 14, 22, 12 + i * 14, 6 - y * (i % 2 ? 1 : -1), INK, 3); } a.E(30, 25, 22, 14, C.brn, C.dbrn).l(30, 12, 30, 38, INK, 2).C(54, 25, 9, INK).eye(58, 21, 4, 0.4, 0).eye(58, 29, 4, 0.4, 0); }, { frames: 2 }],
    },
    init(m) { m.b = { x: -110, y: 10, vx: 120, vy: 60 }; m.need = 2; m.drop = null; m.splats = []; m.fall = 0.28; },
    tick(m, dt) {
        const q = m.b, sp = 1 + m.level * 0.25;
        q.x += q.vx * dt * sp; q.y += q.vy * dt * sp;
        if (Math.abs(q.x) > 130) { q.vx *= -1; q.x = clamp(q.x, -130, 130); }
        if (Math.abs(q.y) > 110) { q.vy *= -1; q.y = clamp(q.y, -110, 110); }
        if (m.pressed && !m.drop) { m.drop = { x: m.x, y: m.y, t: 0 }; m.sfx(T("sine", 900, 300, 0.2, 0.06)); }
        if (m.drop) {
            m.drop.t += dt;
            if (m.drop.t >= m.fall && !m.drop.land) {
                m.drop.land = 1; m.shake(5, 0.12); m.sfx([T("sine", 110, 50, 0.18, 0.24), NOISE(0.08, 0.1)]);
                if (dist(m.drop.x, m.drop.y, q.x, q.y) < 62) { m.need--; m.hit(T("square", 300, 90, 0.12)); m.splats.push({ x: q.x, y: q.y }); m.boom(q.x, q.y, [C.lime, C.grn], 12); m.freeze(0.06); q.x = -q.x * 0.8; q.vx = -q.vx; if (!m.need) m.win(); }
                else m.buzz([20]);
            }
            if (m.drop.t > m.fall + 0.22) m.drop = null;
        }
    },
    draw(m, d) {
        for (const q of m.splats) { d.circle(30, { x: q.x, y: q.y, color: C.grn }); d.circle(14, { x: q.x + 24, y: q.y - 12, color: C.lime }); }
        const q = m.b, a = Math.atan2(q.vy, q.vx);
        m.spr("bug", q.x, q.y, { f: (m.rt * 20 | 0) % 2, rot: a });
        if (m.drop) {
            const k = clamp(m.drop.t / m.fall);
            m.shadow(m.drop.x, m.drop.y + 26, 40 + k * 14, 10 + k * 4, 0.3);
            m.spr("boot", m.drop.x + 6, m.drop.y - 34 - (1 - k * k) * 260, { sy: m.drop.land ? 0.9 : 1, sx: m.drop.land ? 1.08 : 1 });
        }
    },
    bot(m, b) {
        const q = m.b, sp = (1 + m.level * 0.25) * m.speed, tt = m.fall / m.speed + 0.04, px = q.x + q.vx * sp * tt, py = q.y + q.vy * sp * tt;
        if (!m.drop && Math.abs(px) < 120 && Math.abs(py) < 100) b.tap(px, py);
    },
});

G({
    id: "honk", tags: "fingers", feel: [10, 10, 10], bg: [C.yel, C.pink, "stripes", 0.35], mood: "bouncy", icon: "clown",
    hint: ["mash", 0, 6], snap: (m) => [[m.nx, m.ny]], home: [0, 6],
    art: {
        clown: [230, 230, (a) => {
            a.C(32, 96, 32, C.cyan).C(198, 96, 32, C.cyan).C(52, 58, 28, C.cyan).C(178, 58, 28, C.cyan);
            a.C(115, 120, 86, C.wht, "#ffe4d0");
            a.P([[115, 2], [78, 52], [152, 52]], C.grn).C(115, 4, 9, C.yel);
            a.eye(80, 94, 16, 0, 0.1).eye(150, 94, 16, 0, 0.1); a.l(66, 68, 92, 74, C.pink, 4).l(138, 74, 164, 68, C.pink, 4);
            a.arc(115, 150, 58, 36, 0.3, Math.PI - 0.3, C.red, 13); a.smile(115, 166, 46, 24);
        }],
        nose: [70, 70, (a) => { a.C(35, 35, 28, C.red, C.mag); a.e(26, 24, 9, 6, "#ffffffbb"); }],
    },
    init(m) { m.n = fair(m, 8, 5); m.max = m.n; m.s = 1; },
    tick(m, dt) {
        m.nx = Math.sin(m.t * 3.2) * 34; m.ny = 6 + Math.cos(m.t * 2.3) * 18; m.s += (1 - m.s) * Math.min(1, dt * 18);
        if (m.pressed && dist(m.nx, m.ny, m.x, m.y) < 58) {
            m.n--; m.s = 0.7; const k = 1 - m.n / m.max;
            m.hit(T("square", 320 + k * 520, 260 + k * 400, 0.1, 0.16)); m.boom(m.nx, m.ny, [C.red, C.yel], 4, { v1: 130 });
            if (m.n <= 0) { m.boom(m.nx, m.ny, [C.red, C.yel, C.cyan, C.pink], 26, { v1: 340 }); m.win(); }
        }
    },
    draw(m) {
        m.nx ??= 0; m.ny ??= 6;
        m.spr("clown", m.nx * 0.5, m.ny * 0.3 - 6, { rot: m.nx * 0.001 });
        const k = 1 + (1 - m.n / m.max) * 0.8;
        if (m.done !== "win") m.spr("nose", m.nx, m.ny, { sx: m.s * k * (2 - m.s), sy: k * m.s });
    },
    bot(m, b) { if (m.nx !== undefined) b.tap(m.nx, m.ny); },
});

G({
    id: "pat", tags: "gross fingers", feel: [18, 60], bg: [C.lil, C.wht, "plus", 0.4], mood: "march", icon: "baby",
    hint: ["mash", 30, 40], home: [30, 40], outro: 0.7,
    art: {
        baby: [220, 220, (a, f) => {
            a.E(110, 150, 74, 66, C.cyan, C.teal);
            a.C(110, 72, 62, C.skin, C.tan); a.c(50, 74, 10, C.tan).c(170, 74, 10, C.tan);
            a.l(106, 12, 112, 2, INK, 3); a.arc(117, 12, 8, 8, 2, 5, INK, 3);
            if (f === 0) { a.e(86, 72, 6, 2, INK).e(134, 72, 6, 2, INK); a.C(110, 96, 9, "#c4583f"); a.e(70, 88, 10, 6, "#ff9a8a").e(150, 88, 10, 6, "#ff9a8a"); }
            else { a.eye(86, 66, 11, 0, 0).eye(134, 66, 11, 0, 0); a.E(110, 106, 30, 22, INK).e(110, 114, 16, 9, C.pink); }
        }, { frames: 2 }],
        burp: [120, 120, (a) => { const p = []; for (let i = 0; i < 16; i++) { const t = i * TAU / 16, r = i % 2 ? 40 : 56; p.push([60 + Math.cos(t) * r, 60 + Math.sin(t) * r]); } a.P(p, C.lime); a.c(60, 60, 20, C.grn); }],
    },
    init(m) { m.k = 0; m.bump = 0; m.need = fair(m, 9, 5); },
    tick(m, dt) {
        m.k = Math.max(0, m.k - dt * 0.05); m.bump = Math.max(0, m.bump - dt * 9);
        if (m.pressed) {
            m.k += 1 / m.need; m.bump = 1; m.hit(T("sine", 170 + m.k * 120, 110, 0.07, 0.2)); m.boom(m.x, m.y, [C.wht], 3, { v1: 80, f: 3 });
            if (m.k >= 1) { m.hit([T("sawtooth", 130, 60, 0.45, 0.2), T("square", 90, 70, 0.4, 0.1)], [80, 30, 120]); m.shake(9, 0.3); m.boom(0, -30, [C.lime, C.grn, C.wht], 24, { v0: 160, v1: 440, f: 3, g: 0 }); m.win(); }
        }
    },
    draw(m) {
        m.spr("baby", 0, 16, { f: m.done === "win" ? 1 : 0, sx: 1 + m.bump * 0.04, sy: 1 - m.bump * 0.04, rot: m.k * Math.sin(m.rt * 30) * 0.03 });
        if (m.done === "win") m.spr("burp", 0, -10, { k: 1 + m.overT * 3 });
        m.meter(0, -138, 200, 16, m.k, C.lime);
    },
    bot(m, b) { b.tap(30, 40); },
});

G({
    id: "tug", tags: "zoo fingers", feel: [8, 8, 8], bg: [C.lime, C.yel, "zig"], mood: "funk", icon: "ham",
    hint: ["mash", 0, 80], home: [0, 80],
    art: {
        ham: [110, 110, (a, f) => { a.E(55, 66, 42, 38, C.gold, C.org).e(55, 78, 24, 20, C.paper).C(26, 30, 12, C.gold).C(84, 30, 12, C.gold).c(26, 30, 6, C.rose).c(84, 30, 6, C.rose); a.eye(40, 52, 9, f ? 1 : -1, 0).eye(70, 52, 9, f ? 1 : -1, 0).C(55, 68, 4, C.pink); a.l(26, 42, 48, 46, INK, 4).l(84, 42, 62, 46, INK, 4); a.R(46, 76, 8, 10, 1, C.wht).R(56, 76, 8, 10, 1, C.wht); a.R(32, 96, 46, 12, 3, C.red); }, { frames: 2 }],
        you: [110, 110, (a) => { a.E(55, 66, 42, 38, C.pur, C.navy).C(55, 40, 28, C.skin); a.eye(46, 36, 7, 0.8, 0).eye(66, 36, 7, 0.8, 0).l(30, 22, 80, 22, C.red, 8); a.frown(60, 56, 10, 5); a.r(30, 60, 50, 6, C.yel); }],
    },
    init(m) { m.p2 = 0; m.need = 1 / fair(m, 12, 4.5); m.pull = 0.16 + m.level * 0.03; },
    tick(m, dt) {
        m.p2 -= m.pull * dt;
        if (m.pressed) { m.p2 += m.need * 1.45; m.hit(T("sawtooth", 200, 150, 0.05, 0.1)); m.boom(-100 + m.p2 * 100, 66, [C.brn], 2, { v1: 80, f: 3 }); }
        if (m.p2 >= 1) { m.hit(T("square", 500, 1000, 0.2), [10, 20, 40]); m.boom(120, 40, [C.yel, C.cyan], 14); m.win(); }
        if (m.p2 <= -1) m.lose();
    },
    draw(m, d) {
        const o = m.p2 * 76, w = Math.sin(m.rt * 24) * 2;
        d.rect(m.R - m.L + 4, 30, { y: 118, color: C.dgrn }); d.rect(8, 120, { x: 0, y: 40, color: C.wht, opacity: 0.8 });
        m.line(-200, 46, 200, 46, C.tan, 6);
        d.rect(14, 22, { x: o, y: 46, color: C.red, radius: 3 });
        m.shadow(-120 + o, 108, 42, 8); m.shadow(120 + o, 108, 42, 8);
        m.spr("you", -116 + o, 56 + w, { rot: -0.2 }); m.spr("ham", 116 + o, 56 - w, { f: m.p2 > 0.3 ? 1 : 0, rot: 0.14 });
    },
    bot(m, b) { b.tap(0, 80); },
});

G({
    id: "climb", tags: "fingers quick", feel: [12, 6], bg: [C.blu, C.pur, "rays"], mood: "surf", icon: "gecko",
    hint: (m) => ["tap", m.side ? 96 : -96, 100], snap: (m) => [[m.side ? 96 : -96, 100]], home: [-96, 100],
    art: {
        gecko: [80, 130, (a, f) => {
            const u = f ? 1 : -1;
            a.L(22, 40 - u * 12, 6, 24 - u * 18, C.grn, 7).L(58, 40 + u * 12, 74, 24 + u * 18, C.grn, 7).L(24, 86 + u * 8, 8, 104 + u * 14, C.grn, 7).L(56, 86 - u * 8, 72, 104 - u * 14, C.grn, 7);
            a.L(40, 90, 48 + u * 6, 126, C.dgrn, 7); a.E(40, 62, 20, 32, C.grn, C.dgrn).C(40, 26, 17, C.lime); a.eye(30, 20, 7, 0, -0.6).eye(50, 20, 7, 0, -0.6);
        }, { frames: 2 }],
        hand: [100, 100, (a, f) => { a.E(50, 62, 34, 30, f ? C.yel : C.dgry); for (let i = 0; i < 4; i++) a.L(26 + i * 16, 42, 22 + i * 18, 14, f ? C.yel : C.dgry, 8); }, { frames: 2 }],
    },
    init(m) { m.h = 0; m.side = 0; m.need = fair(m, 10, 3.8); m.goal = 0; m.wob = 0; },
    tick(m, dt) {
        m.goal += (m.h / m.need - m.goal) * Math.min(1, dt * 16); m.wob = Math.max(0, m.wob - dt * 4);
        if (m.pressed && m.y > 10) {
            const s = m.x > 0 ? 1 : 0;
            if (s === m.side) { m.side = 1 - s; m.h++; m.hit(T("triangle", 400 + m.h * 60, 700 + m.h * 60, 0.06, 0.16)); if (m.h >= m.need) { m.boom(0, -120, [C.yel, C.pink], 20); m.win(); } }
            else { m.wob = 1; m.h = Math.max(0, m.h - 1); m.sfx(T("sawtooth", 240, 120, 0.1)); }
        }
    },
    draw(m, d) {
        const off = m.goal * 400;
        d.rect(90, 900, { x: 0, y: 0, color: C.dbrn }); d.rect(70, 900, { x: 0, y: 0, color: C.brn });
        for (let i = -6; i < 20; i++) d.rect(46, 10, { x: (i % 2) * 8, y: ((i * 56 + off) % 700) - 300, color: C.dbrn, radius: 4 });
        d.rect(200, 26, { x: 0, y: -160 + off - 400 + 260, color: C.yel, radius: 6 }); 
        m.spr("gecko", Math.sin(m.wob * 20) * 8, 22 - m.goal * 120, { f: m.side, sx: m.side ? 1 : 1 });
        m.spr("hand", -104, 100, { f: m.side ? 0 : 1, sx: m.side ? 0.9 : 1.05, sy: m.side ? 0.9 : 1.05 });
        m.spr("hand", 104, 100, { f: m.side ? 1 : 0, flip: true, sx: m.side ? 1.05 : 0.9, sy: m.side ? 1.05 : 0.9 });
    },
    bot(m, b) { b.tap(m.side ? 34 : -34, 100); },
});

G({
    id: "juggle", tags: "food fingers quick", feel: [10, 16], bg: [C.mag, C.pink, "rings"], survive: true, mood: "chip", icon: "fish",
    hint: (m) => ["tap", m.b[0].x, m.b[0].y], swipeLen: 999, snap: (m) => m.b.map((q) => [q.x, q.y]),
    art: { fish: [80, 54, (a, f) => { a.P([[6, 12], [22, 26], [6, 42]], f ? C.org : C.cyan); a.E(46, 27, 30, 18, f ? C.org : C.cyan, f ? C.red : C.teal); a.eye(62, 23, 7, 0.4, 0); a.smile(68, 34, 6, 3); a.l(38, 12, 38, 42, "#ffffff55", 3); }, { frames: 2 }], seal: [160, 110, (a) => { a.E(80, 64, 66, 40, C.gry, C.dgry); a.C(116, 42, 26, C.gry); a.eye(110, 34, 6, 0, -1).eye(130, 34, 6, 0, -1); a.C(124, 50, 6, INK); a.smile(120, 58, 10, 5); }] },
    init(m) { m.b = [{ x: -70, y: -60, vx: 26, vy: -340, r: 0, c: 0 }, { x: 70, y: -40, vx: -30, vy: -240, r: 2, c: 1 }]; m.g = 330 + m.level * 80; m.best = null; },
    tick(m, dt) {
        for (const q of m.b) {
            q.vy += m.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.r += q.vx * dt * 0.05 + dt * 3;
            if (Math.abs(q.x) > 130) { q.vx *= -1; q.x = clamp(q.x, -130, 130); }
            if (q.y > 150) { m.drops(q.x, 150, C.cyan, 10); m.lose(); }
        }
        if (m.pressed) {
            let hit = null, bd = 58;
            for (const q of m.b) { const e = dist(q.x, q.y, m.x, m.y); if (e < bd) { bd = e; hit = q; } }
            if (m.keyboard) hit = [...m.b].sort((u, v) => v.y - u.y)[0];   // Space always bounces the lowest fish.
            if (hit) { hit.vy = -Math.max(280, Math.sqrt(2 * m.g * Math.max(40, hit.y + 130))); hit.vx = clamp((-hit.x) * 0.5 + m.rng.range(-50, 50), -100, 100); m.hit(T("square", 500, 900, 0.07)); m.boom(hit.x, hit.y, [C.wht, C.yel], 5, { v1: 140 }); }
        }
    },
    draw(m) { m.spr("seal", 0, 118); for (const q of m.b) m.spr("fish", q.x, q.y, { f: q.c, rot: q.r }); },
    bot(m, b) { const q = [...m.b].sort((u, v) => v.y - u.y)[0]; if (q.vy > 0 && q.y > 0) { if (b.mode === "keys") b.tap(m.kx, m.ky); else b.tap(q.x + q.vx * 0.05 * m.speed, q.y + q.vy * 0.05 * m.speed); } },
});
