// Painted 2D art: racer faces, produce icons, stickers.
const INK = "#2b2140";

function face(p, skin, draw) {
    p.circle(48, 50, 40, "#00000022");
    p.ellipse(48, 48, 40, 40, skin[0], skin[1]);
    draw(p);
    p.outline(INK).shade(0.2, 0.16);
}
const eyes = (p, y = 50, gap = 15) => { p.circle(48 - gap, y, 6, "#fff").circle(48 + gap, y, 6, "#fff").circle(48 - gap + 1, y + 1, 3, INK).circle(48 + gap + 1, y + 1, 3, INK); };
const grin = (p, y = 68, w = 12) => { p.line(48 - w, y, 48, y + 4, INK, 3); p.line(48, y + 4, 48 + w, y, INK, 3); };

const FACES = {
    pip: (p) => face(p, ["#ffd9b3", "#f0a877"], () => {
        p.ellipse(48, 28, 40, 21, "#ffd447", "#f0a818"); p.rect(10, 26, 76, 8, "#e8a010"); p.ellipse(82, 30, 14, 5, "#ff4b3e");
        eyes(p); grin(p);
    }),
    nan: (p) => face(p, ["#ffe0c4", "#f0b48a"], () => {
        p.circle(48, 12, 13, "#d5c6ff"); p.ellipse(48, 28, 40, 20, "#e2d8ff", "#b9a6f0");
        p.circle(33, 50, 11, "#ffffff55").circle(63, 50, 11, "#ffffff55"); eyes(p); p.line(44, 50, 52, 50, INK, 2); grin(p, 68, 9);
    }),
    mop: (p) => {
        p.rect(14, 26, 68, 58, "#d7e0ec", 8);
        for (let i = 0; i < 9; i++) p.rect(10 + i * 9, 6, 7, 26 + (i % 3) * 7, i % 2 ? "#fff6e6" : "#e8dfca");
        p.rect(22, 44, 52, 20, INK);
        p.rect(30, 50, 12, 8, "#7df9ff").rect(54, 50, 12, 8, "#7df9ff");
        p.rect(34, 72, 28, 4, "#7b4dff");
        p.outline(INK).shade(0.2, 0.16);
    },
    kiki: (p) => face(p, ["#3b3158", "#221a38"], () => {
        p.ellipse(48, 60, 28, 28, "#fff6e6"); eyes(p, 46, 14);
        p.poly([[38, 58], [58, 58], [48, 72]], "#ff8a1f");
        p.rect(14, 80, 68, 10, "#ff4b3e");
    }),
    crumb: (p) => face(p, ["#d39268", "#a9653e"], () => {
        p.circle(28, 16, 16, "#fff6e6").circle(48, 11, 19, "#fff6e6").circle(68, 16, 16, "#fff6e6"); p.rect(20, 18, 56, 16, "#ffffff");
        eyes(p); p.ellipse(36, 66, 13, 5, INK).ellipse(60, 66, 13, 5, INK);
    }),
    stan: (p) => face(p, ["#ffcda6", "#e49a6c"], () => {
        p.ellipse(48, 26, 44, 22, "#ffc233", "#e39a10"); p.rect(4, 28, 88, 8, "#e39a10");
        eyes(p, 54); p.rect(36, 70, 24, 5, INK); p.rect(26, 82, 44, 9, "#ff8a1f");
    }),
};

export function paintArt(game, racers) {
    const a = game.assets;
    for (const r of racers) a.paint(`face_${r.id}`, 96, 96, FACES[r.id], { smooth: true });

    a.paint("i_banana", 128, 128, (p) => {
        p.ellipse(64, 112, 34, 7, "#00000033");
        for (let i = 0; i < 26; i++) {
            const t = i / 25, x = 28 + t * 74, y = 30 + Math.sin(t * Math.PI * 0.9 + 0.2) * 66, r = 6 + Math.sin(t * Math.PI) * 15;
            p.circle(x, y, r, i < 2 || i > 23 ? "#a86f16" : "#ffd93b");
        }
        for (let i = 3; i < 23; i++) { const t = i / 25; p.circle(30 + t * 72, 26 + Math.sin(t * Math.PI * 0.9 + 0.2) * 66, 3, "#fff3a8"); }
        p.outline(INK).shade(0.2, 0.15);
    }, { smooth: true });
    a.paint("i_melon", 128, 128, (p) => {
        p.ellipse(64, 114, 34, 7, "#00000033");
        p.ellipse(64, 64, 46, 46, "#ffb355", "#e87a14");
        for (let i = -2; i <= 2; i++) p.line(64 + i * 18, 20, 64 + i * 26, 108, "#fff0c8", 2), p.line(20, 64 + i * 18, 108, 64 + i * 26, "#fff0c8", 2);
        p.rect(60, 12, 8, 10, "#3fae49");
        p.poly([[96, 48], [120, 60], [96, 72]], "#ff4b3e");
        p.outline(INK).shade(0.2, 0.15);
    }, { smooth: true });
    a.paint("i_watermelon", 128, 128, (p) => {
        p.ellipse(64, 114, 36, 7, "#00000033");
        p.ellipse(64, 62, 50, 48, "#47c45c", "#16823c");
        for (let i = -2; i <= 2; i++) p.ellipse(64 + i * 19, 62, 5, 46 - Math.abs(i) * 8, "#0e5e2e");
        for (const [x, y] of [[50, 44], [74, 44], [62, 62]]) p.circle(x, y, 5, INK);
        p.outline(INK).shade(0.2, 0.15);
    }, { smooth: true });
    a.paint("i_shield", 128, 128, (p) => {
        for (const [x0, y0, x1, y1] of [[20, 96, 104, 40], [24, 62, 108, 84], [64, 16, 64, 112]]) {
            for (let i = 0; i <= 18; i++) { const t = i / 18; p.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 11 - Math.abs(t - 0.5) * 8, "#e9ad5b"); }
            for (let i = 1; i < 5; i++) { const t = i / 5; p.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 4, "#fff0c9"); }
        }
        p.outline(INK).shade(0.2, 0.15);
    }, { smooth: true });
    a.paint("i_drink", 128, 128, (p) => {
        p.ellipse(64, 116, 28, 6, "#00000033");
        p.rect(38, 18, 52, 96, "#27e1a0", 10);
        p.rect(38, 46, 52, 40, "#ff2f7a");
        p.poly([[70, 48], [52, 70], [64, 70], [58, 86], [78, 62], [66, 62]], "#fff27a");
        p.rect(42, 12, 44, 10, "#dfe7f0", 3);
        p.rect(46, 24, 8, 86, "#ffffff44");
        p.outline(INK).shade(0.2, 0.15);
    }, { smooth: true });

    // A sale sticker for the race position.
    a.paint("burst", 160, 160, (p) => {
        const pts = [];
        for (let i = 0; i < 28; i++) { const r = i % 2 ? 62 : 76, t = i / 28 * Math.PI * 2; pts.push([80 + Math.cos(t) * r, 80 + Math.sin(t) * r]); }
        for (let i = 0; i < 28; i++) p.poly([[80, 80], pts[i], pts[(i + 1) % 28]], "#ffffff");
        p.outline(INK);
    }, { smooth: true });
    a.paint("gear", 64, 64, (p) => {
        for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; p.circle(32 + Math.cos(t) * 21, 32 + Math.sin(t) * 21, 7, "#fff6e6"); }
        p.circle(32, 32, 20, "#fff6e6").circle(32, 32, 8, INK);
    }, { smooth: true });
    a.paint("cartIcon", 128, 96, (p) => {
        p.line(6, 16, 26, 16, "#fff6e6", 7); p.line(26, 16, 40, 70, "#fff6e6", 7); p.line(40, 70, 106, 70, "#fff6e6", 7);
        p.poly([[32, 26], [120, 26], [106, 60], [40, 60]], "#ff4b3e");
        for (let i = 0; i < 5; i++) p.line(48 + i * 15, 26, 50 + i * 12, 60, "#fff6e6", 2);
        p.line(36, 42, 114, 42, "#fff6e6", 2);
        p.circle(50, 84, 8, "#fff6e6").circle(98, 84, 8, "#fff6e6");
        p.outline(INK);
    }, { smooth: true });
    for (const [name, c1, c2] of [["medal0", "#ffe27a", "#e0a418"], ["medal1", "#eef2f7", "#9fb0c6"], ["medal2", "#f0b078", "#b56a32"]]) {
        a.paint(name, 64, 64, (p) => { p.circle(32, 32, 24, c2); p.circle(32, 31, 18, c1); p.outline(INK); }, { smooth: true });
    }
}
