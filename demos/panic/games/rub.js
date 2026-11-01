// Rubbing games: back and forth, round and round, gentle or furious. These are the ones you feel in your palm.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

const every = (m, dt, hz) => (m.t * hz | 0) !== ((m.t - dt) * hz | 0);

G({
    id: "shave", tags: "gross fingers", feel: [2, 3, 2], bg: [C.sky, C.wht, "stripes", 0.35], grip: true, keySpeed: 460, mood: "funk", icon: "face", swipeLen: 999, hint: ["rub", 0, 60, 60], home: [0, 40],
    art: {
        face: [240, 260, (a) => { a.C(120, 130, 110, C.skin, C.tan); a.eye(84, 92, 14, 0, 0.3).eye(156, 92, 14, 0, 0.3); a.l(62, 66, 104, 72, INK, 8).l(178, 66, 136, 72, INK, 8); a.P([[120, 100], [104, 140], [136, 140]], C.tan); a.smile(120, 180, 26, 12); }],
        tuft: [46, 46, (a, f) => { a.C(23, 23, 15, f ? C.dbrn : C.brn); a.l(14, 12, 30, 30, C.dbrn, 2.4); a.l(32, 12, 18, 32, C.dbrn, 2.4); }, { frames: 2, lw: 2.6 }],
        razor: [80, 120, (a) => { a.R(10, 6, 60, 26, 5, C.gry); a.r(14, 26, 52, 5, C.cyan); a.R(32, 32, 16, 82, 6, C.pink); }],
    },
    init(m) {
        m.h = [];
        for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) { const u = (x - 3) * 30 + (y % 2) * 8, v = 30 + y * 25, r = Math.hypot(u / 118, (v - 16) / 124); if (r < 1 && !(Math.abs(u) < 34 && y < 2)) m.h.push({ x: u, y: v, on: true, f: (x + y) % 2 }); }
        m.left2 = m.h.length; m.goal = Math.ceil(m.h.length * 0.06); m.buzzv = m.game.audio.voice({ wave: "sawtooth", freq: 110, volume: 0 });
    },
    tick(m, dt) {
        m.buzzv.set({ volume: m.down && !m.over ? 0.05 : 0, freq: 110 + (m.rub > 1 ? 40 : 0) });
        if (m.over) { m.buzzv.stop(); return; }
        if (m.down) for (const q of m.h) if (q.on && dist(m.x, m.y + 10, q.x, q.y) < 44) { q.on = false; m.left2--; m.hit(NOISE(0.03, 0.08)); m.boom(q.x, q.y, [C.brn, C.dbrn], 2, { f: 5, s1: 11, v1: 100 }); }
        if (m.left2 <= m.goal) { m.boom(0, 60, [C.yel, C.wht], 20, { f: 0 }); m.win(); }
    },
    draw(m) {
        m.spr("face", 0, 0);
        for (const q of m.h) if (q.on) m.spr("tuft", q.x, q.y, { f: q.f });
        m.spr("razor", m.x + 8, m.y + 42, { rot: m.down ? Math.sin(m.rt * 80) * 0.04 : 0 });
    },
    bot(m, b) { const q = m.h.find((u) => u.on); if (q) b.drag(q.x, q.y); },
});

G({
    id: "brush", tags: "gross fingers", feel: [3, 6, 3, 6], bg: [C.mag, C.rose, "scale", 0.3], grip: true, keySpeed: 520, mood: "surf", icon: "tooth", swipeLen: 999, hint: ["rub", 0, 0, 90], home: [-100, 0],
    art: {
        tooth: [66, 110, (a, f) => { a.R(6, 8, 54, 84, 16, C.wht); a.c(22, 92, 13, C.wht).c(44, 92, 13, C.wht); if (f) { a.e(26, 40, 16, 22, "#d6c54c").e(40, 66, 14, 16, "#8a7a2a").c(22, 70, 7, "#6d5a20"); a.eye(22, 34, 5, 0, 0).eye(42, 34, 5, 0, 0); a.frown(32, 54, 7, 4); } else { a.arc(22, 40, 5, 5, 3.2, 6.2, INK, 2.4).arc(42, 40, 5, 5, 3.2, 6.2, INK, 2.4); a.smile(32, 56, 7, 4); } }, { frames: 2 }],
        brush: [160, 54, (a) => { a.R(52, 18, 104, 18, 8, C.cyan); a.R(4, 6, 58, 16, 5, C.pink); for (let i = 0; i < 7; i++) a.l(10 + i * 8, 22, 10 + i * 8, 44, C.wht, 3); }],
    },
    init(m) { m.t2 = [-1, 0, 1, 2, 3].map((i) => ({ x: -100 + (i + 1) * 50, k: 0 })); m.n = m.t2.length; m.need = 90 / Math.min(1.8, m.speed); m.foam = []; },
    tick(m, dt) {
        for (const q of m.t2) if (q.k < 1 && m.down && Math.abs(m.x - q.x) < 34 && Math.abs(m.y) < 80) {
            q.k = Math.min(1, q.k + m.rub / m.need);
            if (every(m, dt, 14)) m.hit(NOISE(0.03, 0.06));
            if (m.rub > 2) m.boom(q.x, 0, [C.wht, C.sky], 1, { f: 3, s1: 14, v1: 70, g: -80 });
            if (q.k >= 1) { m.n--; m.hit(T("sine", 1200, 2000, 0.09), [4, 4, 16]); m.boom(q.x, -20, [C.wht, C.yel], 6, { f: 0 }); if (!m.n) m.win(); }
        }
    },
    draw(m, d) {
        d.rect(330, 240, { color: INK, radius: 100 }); d.rect(310, 216, { color: "#7a1042", radius: 90 }); d.rect(300, 40, { y: 100, color: C.pink, radius: 16 });
        for (const q of m.t2) m.spr("tooth", q.x, 0, { f: q.k >= 1 ? 0 : 1, sx: 0.94, color: undefined, op: 1 });
        for (const q of m.t2) if (q.k > 0 && q.k < 1) m.meter(q.x, 74, 36, 8, q.k, C.cyan);
        m.spr("brush", m.x + 46, m.y - 6, { rot: m.down ? Math.sin(m.rt * 40) * 0.05 : 0 });
    },
    bot(m, b) { const q = m.t2.find((u) => u.k < 1); if (q) b.drag(q.x + Math.sin(b.t * 30) * 24, 0); },
});

G({
    id: "pet", tags: "zoo fingers", feel: [30, 90], bg: [C.lil, C.rose, "dots", 0.4], grip: true, keySpeed: 240, mood: "bouncy", icon: "bun", home: [-90, 0], swipeLen: 999, hint: ["drag", -90, 0, 90, 0],
    art: {
        bun: [270, 180, (a, f) => {
            a.E(120, 118, 106, 54, C.wht, C.gry); a.C(236, 138, 16, C.wht).C(14, 124, 18, C.wht);
            a.C(66, 104, 46, C.wht); a.E(46, 44, 11, 34, C.wht).E(82, 44, 11, 34, C.wht); a.e(46, 46, 5, 22, C.rose).e(82, 46, 5, 22, C.rose);
            if (f === 0) { a.arc(46, 102, 6, 6, 3.2, 6.2, INK, 2.8).arc(84, 102, 6, 6, 3.2, 6.2, INK, 2.8); a.p([[60, 112], [70, 112], [65, 118]], C.pink); a.smile(65, 124, 8, 5); }
            else { a.eye(46, 100, 8, 0, 0).eye(84, 100, 8, 0, 0); a.l(34, 84, 54, 90, INK, 4).l(96, 84, 76, 90, INK, 4); a.frown(65, 128, 8, 5); }
        }, { frames: 2 }],
    },
    init(m) { m.k = 0; m.mad = 0; m.need = 520 / Math.min(1.9, m.speed); },
    tick(m, dt) {
        m.mad = Math.max(0, m.mad - dt * 2.5);
        if (!m.down) return;
        const v = m.rub * 60, onBack = Math.abs(m.y) < 80;
        if (!onBack) return;
        if (v > 860) { if (m.mad <= 0) { m.hit(T("sawtooth", 200, 120, 0.1), [10, 10, 10]); m.k = Math.max(0, m.k - 0.12); } m.mad = 1; }
        else if (v > 10) { m.k += m.rub / m.need; if (every(m, dt, 4)) { m.hit(T("sine", 220 + m.k * 200, 180, 0.12, 0.08)); m.boom(m.x, m.y - 30, [C.pink], 2, { f: 1, g: -150, v1: 60 }); } }
        if (m.k >= 1) { m.boom(0, 0, [C.pink, C.rose, C.wht], 24, { f: 1 }); m.win(); }
    },
    draw(m) {
        const br = 1 + Math.sin(m.rt * (m.mad > 0 ? 18 : 4)) * 0.02;
        m.spr("bun", 10, 6, { f: m.mad > 0 ? 1 : 0, sy: br, sx: 2 - br });
        m.meter(0, 130, 200, 14, m.k, C.pink);
    },
    bot(m, b) { b.mem.a = (b.mem.a ?? 0) + 0.075 * 1.3; b.drag(Math.sin(b.mem.a) * 110, 0); b.maxSpeed = 720; },
});

G({
    id: "scratch", tags: "zoo fingers brain", feel: [7, 9, 7, 9], bg: [C.gold, C.yel, "wave", 0.35], grip: true, keySpeed: 420, mood: "funk", icon: "phant", swipeLen: 999, hint: ["rub", 0, 0, 80],
    art: {
        phant: [300, 240, (a, f) => {
            a.E(160, 110, 130, 86, C.gry, C.dgry); a.R(60, 150, 50, 80, 12, C.gry).R(210, 150, 50, 80, 12, C.gry);
            a.C(66, 80, 56, C.gry); a.E(100, 74, 34, 46, C.dgry); a.P([[20, 90], [34, 122], [24, 196], [8, 200], [4, 128]], C.gry);
            if (f) { a.arc(46, 72, 8, 8, 3.2, 6.2, INK, 3); a.smile(62, 112, 10, 6); } else { a.eye(46, 72, 8, 0.4, 0); a.frown(62, 116, 8, 5); }
        }, { frames: 2 }],
    },
    init(m) { m.ix = m.rng.range(-20, 110); m.iy = m.rng.range(-70, 30); m.k = 0; m.hot = 0; m.pulse = 0; m.spark = 0; m.need = 150 / Math.min(1.8, m.speed); },
    tick(m, dt) {
        const e = dist(m.x, m.y, m.ix, m.iy); m.hot = clamp(1 - e / 170);
        if (!m.down) return;
        m.pulse -= dt;
        if (m.pulse <= 0) { m.pulse = 0.34 - m.hot * 0.27; m.game.haptic(m.hot > 0.7 ? "medium" : m.hot > 0.4 ? "light" : "tick"); m.sfx(T("square", 300 + m.hot * 700, undefined, 0.03, 0.05)); }
        m.spark += dt * (4 + m.hot * 40);
        if (m.spark > 1) { m.spark = 0; m.boom(m.x, m.y, [m.hot > 0.7 ? C.red : m.hot > 0.4 ? C.org : C.cyan], 2 + Math.round(m.hot * 4), { f: 0, v1: 60 + m.hot * 160, s1: 10 + m.hot * 12 }); }
        if (e < 46) { m.k += m.rub / m.need; if (m.k >= 1) { m.hit(T("sine", 500, 1100, 0.2)); m.boom(m.ix, m.iy, [C.yel, C.pink, C.wht], 24); m.win(); } }
    },
    draw(m) {
        m.spr("phant", 0, 0, { f: m.done === "win" ? 1 : 0, k: 1, rot: m.down ? Math.sin(m.rt * 22) * 0.006 * m.hot : 0 });
        const leg = Math.sin(m.rt * (8 + m.hot * 22)) * (2 + m.hot * 8);
        m.d.rect(50, 20, { x: 80, y: 120 + leg, color: C.dgry, radius: 8 });
        if (m.k > 0) m.meter(0, 140, 180, 12, m.k, C.org);
    },
    bot(m, b) { b.drag(m.ix + Math.sin(b.t * 44) * 26, m.iy); },
});

G({
    id: "tickle", tags: "gross fingers", feel: [4, 4, 4, 4, 4], bg: [C.cyan, C.pink, "dots", 0.3], grip: true, keySpeed: 460, mood: "bouncy", icon: "foot", swipeLen: 999, hint: (m) => ["rub", m.fx2, m.fy2, 30],
    art: {
        foot: [150, 210, (a) => { a.E(75, 124, 58, 80, C.skin, C.tan); for (let i = 0; i < 5; i++) a.C(24 + i * 24, 32 + Math.abs(i - 1) * 3, 13 - i, C.skin); a.e(75, 134, 30, 42, C.tan); a.arc(75, 134, 16, 24, 0.4, 2.8, "#c7774e", 2).arc(75, 124, 16, 24, 0.4, 2.8, "#c7774e", 2); }],
        feather: [80, 110, (a) => { a.P([[62, 8], [24, 40], [14, 92], [50, 64]], C.pink); a.l(66, 4, 12, 104, C.mag, 3); }],
    },
    init(m) { m.a = m.rng.range(0, 6); m.k = 0; m.fx2 = 0; m.fy2 = 0; m.jig = 0; m.need = 420 / Math.min(1.9, m.speed); this.mv(m); },
    mv(m) { m.fx2 = Math.sin(m.a + m.t * 1.7) * 80; m.fy2 = 10 + Math.cos(m.a + m.t * 1.1) * 30; },
    tick(m, dt) {
        this.mv(m); m.jig = Math.max(0, m.jig - dt * 5);
        if (m.down && dist(m.x, m.y, m.fx2, m.fy2 + 20) < 86 && m.rub > 1) { m.k += m.rub / m.need; m.jig = 1; if (every(m, dt, 12)) m.hit(T("square", 700 + m.k * 500, 900, 0.03, 0.06)); }
        if (m.k >= 1) { m.boom(m.fx2, m.fy2, [C.yel, C.pink], 18); m.win(); }
    },
    draw(m) {
        const w = m.jig * Math.sin(m.rt * 60) * 7;
        m.spr("foot", m.fx2 + w, m.fy2, { rot: w * 0.012 });
        m.spr("feather", m.x + 22, m.y - 32, { rot: Math.sin(m.rt * 18) * (m.down ? 0.3 : 0.05) });
        m.meter(0, 148, 200, 12, m.k, C.yel);
    },
    bot(m, b) { b.drag(m.fx2 + Math.sin(b.t * 46) * 34, m.fy2 + 20); },
});

G({
    id: "shake", tags: "fingers", easy: true, feel: [18, 18], bg: [C.navy, C.pur, "dots", 0.25], grip: true, keySpeed: 560, mood: "chip", icon: "globe", swipeLen: 999, hint: ["rub", 0, 0, 70], home: [0, 0],
    art: {
        globe: [220, 240, (a) => {
            a.C(110, 104, 96, "#dff7ff", "#8fdcf0"); a.P([[56, 136], [110, 92], [164, 136]], C.red); a.R(72, 134, 76, 48, 3, C.paper); a.r(100, 148, 20, 34, C.brn);
            a.E(110, 182, 80, 18, C.wht, C.sky); a.P([[36, 192], [184, 192], [200, 232], [20, 232]], C.pink); a.e(70, 46, 26, 12, "#ffffffbb");
        }],
    },
    init(m) { m.sn = []; m.n = 0; m.goal = Math.min(12, Math.floor(4.4 * m.dur / m.speed)); m.xx = 0; m.last = 0; m.track = 0; for (let i = 0; i < 40; i++) m.sn.push({ a: m.rng.range(0, 6), r: m.rng.range(10, 86), s: m.rng.range(0.6, 1.4) }); },
    tick(m, dt) {
        const tx = m.down ? clamp(m.x, -90, 90) : 0, old = m.xx;
        m.xx += (tx - m.xx) * Math.min(1, dt * 40 / m.speed);
        const dx = m.xx - old;
        if (m.last * dx < 0 && Math.abs(m.track) > 26) { m.n++; m.hit(T("triangle", 300 + m.n * 40, undefined, 0.05, 0.14)); m.track = 0; if (m.n >= m.goal) { m.boom(0, 0, [C.wht, C.sky], 24); m.win(); } }
        if (dx) { if (m.last * dx < 0) m.track = 0; m.last = dx; m.track += dx; }
    },
    draw(m, d) {
        const k = clamp(m.n / m.goal), rot = m.xx * 0.003;
        m.spr("globe", m.xx, 0, { rot });
        d.push(); d.translate(m.xx, -14); d.rotate(rot);
        const count = Math.floor(6 + k * 34);
        for (let i = 0; i < count; i++) { const q = m.sn[i], a = q.a + m.rt * q.s * (0.6 + k * 4), x = Math.cos(a) * q.r, y = Math.sin(a * 0.7) * q.r * 0.9; d.circle(3.4 + q.s, { x, y, color: C.wht }); }
        d.pop();
    },
    bot(m, b) { b.drag(((b.t * (m.speed > 1 ? 13 : 8)) | 0) % 2 ? 80 : -80, 0); },
});

G({
    id: "stir", tags: "food fingers", easy: true, feel: [6, 40], bg: [C.pur, C.lime, "rings", 0.2], grip: true, keySpeed: 640, mood: "spooky", icon: "pot", swipeLen: 999, hint: ["circle", 0, 20, 70], home: [70, 20],
    art: {
        pot: [280, 170, (a) => { a.E(140, 70, 134, 40, INK); a.E(140, 104, 122, 62, "#2c2840", INK); a.C(20, 70, 12, INK).C(260, 70, 12, INK); a.e(100, 96, 40, 18, "#ffffff22"); }],
        spoon: [50, 180, (a) => { a.R(19, 6, 12, 150, 5, C.tan); a.E(25, 156, 18, 20, C.tan); }],
        eyeball: [36, 36, (a) => { a.eye(18, 18, 13, 0, 0); }],
    },
    init(m) { m.turn = 0; m.la = null; m.need = TAU * 2.4; m.e = [0, 1, 2, 3].map((i) => ({ a: i * 1.6, r: 40 + i * 22 })); m.pivot = [0, 20]; },
    tick(m, dt) {
        if (!m.down) { m.la = null; return; }
        const a = Math.atan2((m.y - 20) * 2, m.x);
        if (m.la != null) {
            let da = a - m.la; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
            if (dist(m.x, m.y, 0, 20) > 20) { const old = m.turn; m.turn += Math.abs(da); if ((old / 1.2 | 0) !== (m.turn / 1.2 | 0)) { m.hit(T("sine", 200 + m.turn * 30, 260, 0.1, 0.1)); m.boom(0, 0, [C.lime, C.yel], 3, { f: 3, g: -200, v1: 80 }); } }
        }
        m.la = a;
        if (m.turn >= m.need) { m.boom(0, -20, [C.lime, C.pink, C.yel], 30, { g: -100, v1: 300, f: 3 }); m.win(); }
    },
    draw(m, d) {
        const k = clamp(m.turn / m.need), brew = [[0.2, 0.6, 0.3], [0.7, 0.2, 0.9], [1, 0.3, 0.6]], c = brew[k > 0.66 ? 2 : k > 0.33 ? 1 : 0];
        m.spr("pot", 0, 40);
        d.rect(232, 60, { y: 2 + 4, color: c, radius: 30 });
        for (const q of m.e) { const a = q.a + m.turn * 0.8 + m.rt * 0.4; m.spr("eyeball", Math.cos(a) * q.r, 6 + Math.sin(a) * q.r * 0.2); }
        m.spr("spoon", m.x, m.y - 66, { rot: m.x * 0.003 });
        m.meter(0, 140, 200, 12, k, C.lime);
    },
    bot(m, b) { b.mem.a = (b.mem.a ?? 0) + 0.3; b.drag(Math.cos(b.mem.a) * 90, 20 + Math.sin(b.mem.a) * 44); },
});

G({
    id: "tune", tags: "steady brain", feel: [1, 3, 1], bg: [C.dbrn, C.gold, "stripes", 0.14], mood: "surf", icon: "radio", swipeLen: 999, grip: true, home: [-100, 104], keySpeed: 200,
    hint: ["drag", -100, 104, 100, 104],
    art: { radio: [300, 180, (a) => { a.R(6, 16, 288, 156, 26, C.org); a.R(22, 32, 256, 96, 10, "#20201c"); a.L(240, 16, 276, -4 + 6, C.gry, 3); a.C(44, 150, 11, C.yel).C(256, 150, 11, C.yel); }] },
    init(m) { m.xx = -100; m.goal = m.rng.range(-20, 110) * (m.rng.chance(0.3) ? -0.6 : 1); m.hold2 = 0; m.note = 0; m.grab = false; },
    tick(m, dt) {
        if (m.pressed && Math.abs(m.y - 104) < 56) m.grab = true;
        if (!m.down) m.grab = false;
        if (m.grab) { const old = m.xx; m.xx = clamp(m.x, -120, 120); if ((old / 9 | 0) !== (m.xx / 9 | 0)) m.hit(T("square", 900, undefined, 0.012, 0.06)); }
        const e = Math.abs(m.xx - m.goal);
        if (e < 13) { m.hold2 += dt; m.note -= dt; if (m.note <= 0) { m.note = 0.14; m.sfx(T("sine", [660, 784, 880, 988][m.rng.int(0, 3)], undefined, 0.12, 0.1)); } if (m.hold2 > 0.45) { m.hit(T("sine", 880, 1320, 0.2), [8, 8, 8, 8, 30]); m.boom(0, -60, [C.yel, C.pink], 18, { f: 1 }); m.win(); } }
        else { m.hold2 = 0; if ((m.rt * 14 | 0) % 3 === 0 && e < 80) m.sfx(NOISE(0.03, 0.02 + (e / 80) * 0.03)); }
    },
    draw(m, d) {
        m.spr("radio", 0, -56);
        const e = clamp(Math.abs(m.xx - m.goal) / 120), x0 = -116, n = 58;
        let px = x0, py = -66;
        const r = m.game.fxRng;
        for (let i = 1; i <= n; i++) { const x = x0 + i * 4, y = -66 + Math.sin(i * 0.38 + m.rt * 14) * 22 * (1 - e) + r.range(-34, 34) * e; d.line([px, py], [x, y], { color: e < 0.12 ? C.lime : C.org, width: 3 }); px = x; py = y; }
        d.rect(260, 14, { y: 104, color: INK, radius: 7 }); d.rect(250, 6, { y: 104, color: C.dgry, radius: 3 });
        for (let i = 0; i < 25; i++) d.rect(2, i % 5 ? 8 : 16, { x: -120 + i * 10, y: 80, color: C.paper });
        d.rect(44, 62, { x: m.xx, y: 104, radius: 10, color: INK }); d.rect(36, 54, { x: m.xx, y: 104, radius: 7, color: m.hold2 > 0 ? C.lime : C.yel });
    },
    bot(m, b) { if (!m.grab) b.grab(m.xx, 104); else b.drag(m.goal, 104); },
});
