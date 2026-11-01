// Memory games: watch for a second, then prove you were paying attention.
import { C, INK } from "../ink.js";
import { G, T, NOISE, clamp, dist, TAU } from "../engine.js";

const PADS = [[-72, -72, C.red], [72, -72, C.cyan], [-72, 72, C.yel], [72, 72, C.grn]];
G({
    id: "repeat", tags: "brain", feel: [10, 10], bg: [C.navy, C.pur, "rings", 0.3], mood: "chip", dur: 7, icon: "frog", swipeLen: 999, hint: ["none"], snap: () => PADS.map(([x, y]) => [x, y]), outro: 0.7,
    art: {
        drum: [130, 130, (a, f) => { a.C(65, 65, 56, f ? C.wht : C.gry, f ? C.paper : C.dgry); a.c(65, 65, 34, f ? C.wht : "#ffffff55"); }, { frames: 2, dots: false }],
        frog: [90, 76, (a, f) => { a.E(45, 48, 34, 24, C.grn, C.dgrn); a.C(26, 22, 12, C.grn).C(64, 22, 12, C.grn); a.eye(26, 20, 7, 0, 0).eye(64, 20, 7, 0, 0); if (f) a.E(45, 58, 12, 8, INK); else a.smile(45, 54, 16, 7); }, { frames: 2 }],
    },
    init(m) { m.n = 3 + Math.round(m.level); m.seq = []; let last = -1; while (m.seq.length < m.n) { const q = m.rng.int(0, 3); if (q !== last) { m.seq.push(q); last = q; } } m.st = 0; m.i = 0; m.tm = 0.45; m.lit = -1; m.lt = 0; m.at = 0; },
    tick(m, dt) {
        m.lt -= dt; if (m.lt <= 0) m.lit = -1;
        if (m.st === 0) {
            m.tm -= dt;
            if (m.tm <= 0) {
                if (m.i < m.n) { m.lit = m.seq[m.i]; m.lt = 0.34; m.i++; m.tm = 0.5; m.hit(T("square", [392, 523, 659, 784][m.lit], undefined, 0.2, 0.12)); }
                else { m.st = 1; m.sfx(T("sine", 900, 1200, 0.1, 0.08)); }
            }
            return;
        }
        if (m.pressed) {
            const hit = PADS.findIndex(([x, y]) => dist(x, y, m.x, m.y) < 66);
            if (hit < 0) return;
            m.lit = hit; m.lt = 0.16;
            if (hit === m.seq[m.at]) { m.at++; m.hit(T("square", [392, 523, 659, 784][hit], undefined, 0.16, 0.14)); m.boom(PADS[hit][0], PADS[hit][1], [PADS[hit][2]], 6); if (m.at >= m.n) { m.boom(0, 0, [C.yel, C.pink, C.cyan], 20); m.win(); } }
            else { m.sfx(T("sawtooth", 180, 70, 0.3)); m.lose(); }
        }
    },
    draw(m) {
        PADS.forEach(([x, y, c], i) => { const on = m.lit === i; m.spr("drum", x, y, { f: on ? 1 : 0, color: c, k: on ? 1.14 : 1 }); });
        m.spr("frog", 0, 0, { f: m.st === 0 ? 1 : 0, k: 0.9, rot: Math.sin(m.rt * 8) * 0.06 });
    },
    bot(m, b) { if (m.st === 1) { const [x, y] = PADS[m.seq[m.at]]; b.tap(x, y); } },
});

G({
    id: "match", tags: "brain", feel: [6, 40, 6], bg: [C.gold, C.org, "check", 0.3], mood: "bouncy", dur: 6.5, icon: "card", swipeLen: 999, hint: ["none"], snap: (m) => m.c.filter((q) => !q.done).map((q) => [q.x, q.y]),
    art: {
        card: [100, 130, (a, f) => {
            if (f === 0) { a.R(6, 6, 88, 118, 10, C.pink); a.R(16, 16, 68, 98, 6, C.mag); a.C(50, 65, 18, C.yel); return; }
            a.R(6, 6, 88, 118, 10, C.paper);
            if (f === 1) { a.C(50, 58, 26, C.red); a.R(46, 22, 8, 16, 2, C.dgrn); a.e(40, 50, 7, 5, "#ffffffaa"); }
            if (f === 2) { a.P([[50, 26], [76, 84], [24, 84]], C.gold); a.c(40, 68, 5, C.brn).c(58, 72, 5, C.brn).c(50, 50, 4, C.brn); }
            if (f === 3) { a.C(50, 60, 26, C.pur); a.eye(40, 54, 7, 0, 0).eye(60, 54, 7, 0, 0); a.smile(50, 72, 10, 5); }
            if (f === 4) { a.P([[50, 24], [58, 50], [84, 50], [62, 66], [72, 92], [50, 76], [28, 92], [38, 66], [16, 50], [42, 50]], C.yel); }
        }, { frames: 5 }],
    },
    init(m) {
        const f = m.rng.shuffle([1, 2, 3, 4]).slice(0, 2), deck = m.rng.shuffle([f[0], f[0], f[1], f[1]]);
        m.c = deck.map((v, i) => ({ v, x: (i % 2 - 0.5) * 124, y: (Math.floor(i / 2) - 0.5) * 150, up: 1, want: 1, done: false }));
        m.show = 1.1; m.sel = []; m.n = 2; m.wait2 = 0;
    },
    tick(m, dt) {
        for (const q of m.c) q.up += (q.want - q.up) * Math.min(1, dt * 16);
        if (m.show > 0) { m.show -= dt; if (m.show <= 0) { for (const q of m.c) q.want = 0; m.sfx(NOISE(0.1, 0.1)); } return; }
        if (m.wait2 > 0) { m.wait2 -= dt; if (m.wait2 <= 0) { for (const q of m.sel) q.want = 0; m.sel = []; } return; }
        if (m.pressed) {
            const q = m.c.find((u) => !u.done && u.want === 0 && Math.abs(u.x - m.x) < 56 && Math.abs(u.y - m.y) < 70);
            if (!q) return;
            q.want = 1; m.sel.push(q); m.hit(T("square", 600, undefined, 0.04));
            if (m.sel.length === 2) {
                if (m.sel[0].v === m.sel[1].v) { m.sel.forEach((u) => { u.done = true; m.boom(u.x, u.y, [C.yel, C.wht], 8); }); m.sel = []; m.n--; m.hit(T("sine", 660, 1300, 0.14), [6, 20, 6, 20]); if (!m.n) m.win(); }
                else { m.wait2 = 0.4; m.sfx(T("sawtooth", 200, 120, 0.15)); }
            }
        }
    },
    draw(m) { for (const q of m.c) { const w = Math.abs(q.up * 2 - 1); m.spr("card", q.x, q.y, { f: q.up > 0.5 ? q.v : 0, sx: Math.max(0.05, w), k: q.done ? 1.06 : 1 }); } },
    bot(m, b) {
        if (m.show > 0 || m.wait2 > 0) return;
        const open = m.sel[0], q = open ? m.c.find((u) => u !== open && u.v === open.v) : m.c.find((u) => !u.done);
        if (q) b.tap(q.x, q.y);
    },
});

G({
    id: "follow", tags: "brain quick", feel: [4, 14], bg: [C.red, C.mag, "rays", 0.3], mood: "spooky", dur: 8, icon: "cup", swipeLen: 999, hint: ["none"], snap: (m) => m.c.map((q) => [q.x, 30]),
    art: {
        cup: [100, 110, (a) => { a.P([[26, 6], [74, 6], [94, 104], [6, 104]], C.cyan); a.r(14, 80, 74, 12, C.wht); a.e(50, 10, 26, 5, INK); }],
        bean: [46, 46, (a) => { a.C(23, 23, 16, C.yel, C.gold); a.eye(17, 20, 5, 0, 0).eye(30, 20, 5, 0, 0); }],
        hand2: [130, 90, (a) => { a.R(8, 14, 110, 60, 28, C.skin); a.R(8, 20, 10, 40, 3, C.wht); }],
    },
    init(m) { m.c = [-1, 0, 1].map((i) => ({ i, x: i * 100, lift: 1, has: i === 0 })); m.st = 0; m.tm = 0.6; m.sw = null; m.n = 3 + Math.round(m.level * 2); m.dt0 = 0.42; },
    tick(m, dt) {
        const c = m.c;
        if (m.st === 0) { m.tm -= dt; if (m.tm < 0.3) for (const q of c) q.lift = Math.max(0, q.lift - dt * 5); if (m.tm <= 0) { m.st = 1; m.tm = 0; } return; }
        if (m.st === 1) {
            if (!m.sw) {
                if (m.n <= 0) { m.st = 2; return; }
                const a = m.rng.int(0, 2), z = (a + m.rng.int(1, 2)) % 3; m.sw = { a: c[a], b: c[z], ax: c[a].x, bx: c[z].x, t: 0 }; m.n--; m.hit(T("sine", 300, 500, 0.06, 0.08));
            } else {
                const s = m.sw; s.t = Math.min(1, s.t + dt / m.dt0); const e = s.t * s.t * (3 - 2 * s.t);
                s.a.x = s.ax + (s.bx - s.ax) * e; s.b.x = s.bx + (s.ax - s.bx) * e; s.a.y2 = -Math.sin(e * 3.14) * 34; s.b.y2 = Math.sin(e * 3.14) * 34;
                if (s.t >= 1) { s.a.y2 = s.b.y2 = 0; m.sw = null; }
            }
            return;
        }
        if (m.st === 2 && m.pressed) {
            const q = c.find((u) => Math.abs(u.x - m.x) < 52 && Math.abs(m.y - 30) < 110);
            if (!q) return;
            q.show = true; m.st = 3;
            if (q.has) { m.hit(T("sine", 700, 1400, 0.2), [10, 10, 30]); m.boom(q.x, 60, [C.yel, C.wht], 16); m.win(); } else { m.sfx(T("sawtooth", 250, 90, 0.3)); m.lose(); const h = c.find((u) => u.has); h.show = true; }
        }
        for (const q of c) if (q.show) q.lift = Math.min(1, q.lift + dt * 6 / m.speed);
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 70, { y: 112, color: C.navy });
        const h = m.c.find((q) => q.has);
        m.shadow(0, 96, 150, 6, 0.2);
        if (h.lift > 0.05) m.spr("bean", h.x, 72);
        for (const q of m.c) m.spr("cup", q.x, 42 - q.lift * 80 + (q.y2 ?? 0));
    },
    bot(m, b) { if (m.st === 2) { const q = m.c.find((u) => u.has); b.tap(q.x, 30); } },
});

G({
    id: "count", tags: "brain zoo", feel: [8, 8, 20, 8], bg: [C.sky, C.grn, "wave", 0.3], mood: "surf", dur: 8, icon: "sheep", swipeLen: 999, hint: ["none"], snap: (m) => (m.st ? m.op.map((q, i) => [(i - 1) * 104, 60]) : []),
    art: {
        sheep: [90, 80, (a, f) => { a.C(30, 40, 18, C.wht).C(52, 34, 20, C.wht).C(62, 46, 16, C.wht).C(40, 50, 16, C.wht); a.C(76, 30, 12, INK); a.eye(80, 28, 4, 0.3, 0); a.L(36, 62, 34 - f * 6, 76, INK, 3).L(58, 62, 60 + f * 6, 76, INK, 3); }, { frames: 2 }],
        fence: [130, 70, (a) => { for (let i = 0; i < 4; i++) a.R(8 + i * 36, 8, 12, 58, 2, C.brn); a.R(4, 18, 122, 9, 2, C.tan).R(4, 42, 122, 9, 2, C.tan); }],
        die: [84, 84, (a, f) => { a.R(6, 6, 72, 72, 12, C.paper); const P = [[], [[42, 42]], [[26, 26], [58, 58]], [[26, 26], [42, 42], [58, 58]], [[26, 26], [58, 26], [26, 58], [58, 58]], [[26, 26], [58, 26], [42, 42], [26, 58], [58, 58]], [[26, 24], [58, 24], [26, 42], [58, 42], [26, 60], [58, 60]]][f]; for (const [x, y] of P) a.c(x, y, 7, INK); }, { frames: 7 }],
    },
    init(m) {
        m.n = m.rng.int(2, 4 + Math.round(m.level)); m.s2 = []; for (let i = 0; i < m.n; i++) m.s2.push({ x: -220 - i * (120 + m.rng.range(0, 40)) }); m.st = 0;
        const wrong = [m.n - 1, m.n + 1, m.n + 2].filter((v) => v > 0 && v < 7); m.op = m.rng.shuffle([m.n, ...m.rng.shuffle(wrong).slice(0, 2)]);
    },
    tick(m, dt) {
        if (m.st === 0) {
            let all = true;
            for (const q of m.s2) { const was = q.x; q.x += 210 * dt; if (was < 0 && q.x >= 0) m.hit(T("square", 500 + 80 * m.s2.indexOf(q), undefined, 0.08, 0.1)); if (q.x < 200) all = false; }
            if (all) { m.st = 1; m.sfx(T("sine", 900, 1300, 0.12)); }
            return;
        }
        if (m.pressed) {
            m.op.forEach((v, i) => { if (!m.done && dist((i - 1) * 104, 60, m.x, m.y) < 52) { m.picked = i; if (v === m.n) { m.hit(T("sine", 660, 1320, 0.14)); m.boom((i - 1) * 104, 60, [C.yel, C.wht], 14); m.win(); } else { m.sfx(T("sawtooth", 200, 90, 0.3)); m.lose(); } } });
        }
    },
    draw(m, d) {
        d.rect(m.R - m.L + 4, 300, { y: 240, color: C.grn });
        if (m.st === 0) {
            for (const q of m.s2) { const k = clamp(1 - Math.abs(q.x) / 80); m.spr("sheep", q.x, 54 - Math.sin(k * 1.57) * 74, { f: (m.rt * 10 | 0) % 2, rot: -q.x * 0.0018 * k }); }
            m.spr("fence", 0, 64);
        } else m.op.forEach((v, i) => { m.spr("die", (i - 1) * 104, 60, { f: v, k: m.picked === i ? 1.2 : 1 + Math.sin(m.rt * 6 + i) * 0.04 }); });
    },
    bot(m, b) { if (m.st) { const i = m.op.indexOf(m.n); b.tap((i - 1) * 104, 60); } },
});

const face = (m, x, y, q, k = 1) => {
    m.spr("mug", x, y, { k, f: q.skin });
    m.spr("hair", x, y - 42 * k, { k, f: q.hair });
    m.spr("lip", x, y + 18 * k, { k, f: q.tash });
};
G({
    id: "accuse", tags: "brain", feel: [36, 12], bg: [C.dgry, C.yel, "stripes", 0.16], mood: "spooky", dur: 7, icon: "mug", swipeLen: 999, hint: ["none"], snap: (m) => (m.st ? m.line2.map((q, i) => [(i - 1) * 108, 40]) : []),
    art: {
        mug: [100, 120, (a, f) => { a.E(50, 62, 40, 50, [C.skin, C.tan, C.lime][f]); a.eye(34, 52, 8, 0, 0).eye(66, 52, 8, 0, 0); a.E(50, 72, 6, 5, C.rose); }, { frames: 3 }],
        hair: [100, 50, (a, f) => { if (f === 0) { a.R(16, 22, 68, 10, 3, INK).R(28, 2, 44, 24, 3, INK); } if (f === 1) { a.P([[14, 34], [50, 2], [86, 34]], C.pink); } if (f === 2) { a.E(50, 22, 42, 18, C.org); } }, { frames: 3 }],
        lip: [90, 40, (a, f) => { if (f === 0) { a.E(30, 16, 22, 8, INK).E(60, 16, 22, 8, INK); } if (f === 1) { a.smile(45, 10, 18, 9, INK, 3.6); } if (f === 2) { a.R(30, 6, 30, 20, 6, C.brn); a.c(45, 16, 5, INK); } }, { frames: 3 }],
    },
    init(m) {
        const rf = () => ({ skin: m.rng.int(0, 2), hair: m.rng.int(0, 2), tash: m.rng.int(0, 2) });
        m.who = rf();
        const near = (q) => { const c = { ...q }, k = m.rng.pick(["skin", "hair", "tash"]); c[k] = (c[k] + 1 + m.rng.int(0, 1)) % 3; return c; };
        const a = near(m.who); let b = near(m.who); if (JSON.stringify(a) === JSON.stringify(b)) b = { ...b, hair: (b.hair + 1) % 3, skin: (b.skin + 1) % 3 };
        m.line2 = m.rng.shuffle([m.who, a, b]); m.st = 0; m.tm = 1.5;
    },
    tick(m, dt) {
        if (m.st === 0) { m.tm -= dt; if (m.tm <= 0) { m.st = 1; m.flash(C.wht, 0.2); m.sfx(NOISE(0.1, 0.16)); } return; }
        if (m.pressed) m.line2.forEach((q, i) => { if (!m.done && Math.abs((i - 1) * 108 - m.x) < 52 && Math.abs(m.y - 40) < 96) { m.picked = i; if (q === m.who) { m.hit(T("square", 300, 900, 0.14)); m.boom((i - 1) * 108, 40, [C.yel, C.red], 16); m.win(); } else { m.sfx(T("sawtooth", 200, 80, 0.3)); m.lose(); } } });
    },
    draw(m, d) {
        for (let i = 0; i < 6; i++) d.rect(330, 3, { y: -140 + i * 50, color: C.wht, opacity: 0.35 });
        if (m.st === 0) { m.d.rect(240, 280, { y: 0, color: C.paper, radius: 6 }); face(m, 0, 10, m.who, 1.8); const f = (m.rt * 5 | 0) % 2; if (f) m.d.rect(240, 280, { color: C.wht, opacity: 0.2 }); }
        else m.line2.forEach((q, i) => { const x = (i - 1) * 108; m.d.rect(96, 190, { x, y: 40, color: C.paper, radius: 4 }); face(m, x, 50, q, 0.86); if (m.picked === i) m.d.rect(102, 196, { x, y: 40, radius: 6, outline: 6, color: q === m.who ? C.grn : C.red }); });
    },
    bot(m, b) { if (m.st) { const i = m.line2.indexOf(m.who); b.tap((i - 1) * 108, 40); } },
});
