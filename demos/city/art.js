// The painted UI: small icons with one light direction, plus the logo and Nell the harbour master.
export const ICON = { coin: 0, wood: 1, fish: 2, grain: 3, folk: 4, star: 5, starOff: 6, drop: 7, cog: 8, pause: 9, play: 10, ff: 11, check: 12, lock: 13, link: 14, hammer: 15, zed: 16, cheer: 17, wave: 18, close: 19, bin: 20, spin: 21, arrow: 22 };

function paintIcon(p, f, c) {
    const x = (f % 6) * 72 + 36, y = Math.floor(f / 6) * 72 + 36;
    const X = (v) => x + v, Y = (v) => y + v;
    const name = Object.keys(ICON).find((k) => ICON[k] === f);
    switch (name) {
        case "coin":
            p.ellipse(X(0), Y(4), 26, 26, "#b9791f");
            p.ellipse(X(0), Y(0), 26, 26, "#ffd65c", "#f0a92e");
            p.ellipse(X(0), Y(0), 17, 17, "#f6bd3c");
            p.ellipse(X(0), Y(-2), 17, 15, "#ffdf79");
            p.rect(X(-3), Y(-10), 6, 20, "#c98a1e");
            break;
        case "wood":
            p.poly([[X(-27), Y(-4)], [X(16), Y(-20)], [X(24), Y(0)], [X(-20), Y(16)]], "#a86f3a");
            p.poly([[X(-27), Y(-4)], [X(16), Y(-20)], [X(19), Y(-13)], [X(-24), Y(3)]], "#c88f55");
            p.ellipse(X(19), Y(-10), 9, 12, "#f0cf95");
            p.ellipse(X(19), Y(-10), 4, 6, "#c88f55");
            break;
        case "fish":
            p.poly([[X(14), Y(0)], [X(28), Y(-13)], [X(28), Y(13)]], "#e0694a");
            p.ellipse(X(-5), Y(0), 23, 14, "#8fd0e0", "#3f97b5");
            p.ellipse(X(-9), Y(-4), 14, 5, "#d5f1f6");
            p.circle(X(-17), Y(-3), 4, "#fff");
            p.circle(X(-17), Y(-3), 2, "#1f2c3a");
            break;
        case "grain":
            p.line(X(0), Y(26), X(0), Y(-8), "#bb8d2c", 4);
            for (const [dx, dy] of [[-8, -18], [8, -18], [-9, -7], [9, -7], [-8, 4], [8, 4], [0, -24]]) p.ellipse(X(dx), Y(dy), 6, 9, "#f6cf60", "#d99b2b");
            break;
        case "folk":
            p.ellipse(X(0), Y(-13), 11, 11, "#f3c9a0", "#d8966a");
            p.poly([[X(-13), Y(24)], [X(-9), Y(0)], [X(9), Y(0)], [X(13), Y(24)]], "#2f9c95");
            p.ellipse(X(0), Y(24), 13, 4, "#23786f");
            p.ellipse(X(0), Y(0), 10, 4, "#2f9c95");
            break;
        case "star": case "starOff": {
            const pts = [];
            for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 12 : 28; pts.push([X(Math.cos(a) * r), Y(Math.sin(a) * r + 2)]); }
            if (name === "star") { p.poly(pts, "#ffcf4a"); p.poly(pts.map(([a, b]) => [x + (a - x) * 0.62, y + (b - y) * 0.62 - 2]), "#ffe58c"); }
            else { p.poly(pts, "#ffffff55"); p.poly(pts.map(([a, b]) => [x + (a - x) * 0.7, y + (b - y) * 0.7]), "#ffffff22"); }
            break;
        }
        case "drop":
            p.poly([[X(0), Y(-28)], [X(16), Y(4)], [X(-16), Y(4)]], "#4db5e6");
            p.ellipse(X(0), Y(8), 18, 18, "#4db5e6", "#2a84c4");
            p.ellipse(X(-6), Y(6), 5, 7, "#c5ecfa");
            break;
        case "cog":
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; p.circle(X(Math.cos(a) * 20), Y(Math.sin(a) * 20), 7, c); }
            p.circle(X(0), Y(0), 19, c);
            p.circle(X(0), Y(0), 8, "#00000000");
            for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) if (xx * xx + yy * yy < 60) { const o = (Y(yy) * p.width + X(xx)) * 4; p.data[o + 3] = 0; }
            break;
        case "pause":
            p.rect(X(-16), Y(-20), 12, 40, c); p.rect(X(4), Y(-20), 12, 40, c);
            break;
        case "play":
            p.poly([[X(-13), Y(-22)], [X(20), Y(0)], [X(-13), Y(22)]], c);
            break;
        case "ff":
            p.poly([[X(-22), Y(-20)], [X(2), Y(0)], [X(-22), Y(20)]], c);
            p.poly([[X(0), Y(-20)], [X(24), Y(0)], [X(0), Y(20)]], c);
            break;
        case "check":
            p.line(X(-18), Y(2), X(-6), Y(16), "#39a96b", 9);
            p.line(X(-6), Y(16), X(20), Y(-16), "#39a96b", 9);
            break;
        case "lock":
            p.ellipse(X(0), Y(-8), 13, 15, "#7d8a92");
            p.ellipse(X(0), Y(-8), 7, 9, "#fff6e4");
            p.rect(X(-17), Y(-6), 34, 28, "#5a6a74");
            p.circle(X(0), Y(7), 4, "#fff6e4");
            break;
        case "link":
            p.line(X(-22), Y(10), X(-6), Y(-4), "#e0694a", 7);
            p.line(X(22), Y(-10), X(6), Y(4), "#e0694a", 7);
            p.line(X(-4), Y(12), X(4), Y(20), "#fff", 4);
            p.line(X(4), Y(-20), X(-4), Y(-12), "#fff", 4);
            break;
        case "hammer":
            p.line(X(-16), Y(18), X(10), Y(-8), "#a86f3a", 7);
            p.poly([[X(-2), Y(-22)], [X(22), Y(2)], [X(14), Y(10)], [X(-10), Y(-14)]], "#6d7c88");
            break;
        case "zed":
            p.line(X(-14), Y(-16), X(12), Y(-16), "#33557a", 7); p.line(X(12), Y(-16), X(-14), Y(16), "#33557a", 7); p.line(X(-14), Y(16), X(12), Y(16), "#33557a", 7);
            break;
        case "cheer":
            p.ellipse(X(-10), Y(-7), 14, 14, "#f0604e"); p.ellipse(X(10), Y(-7), 14, 14, "#f0604e");
            p.poly([[X(-23), Y(-2)], [X(23), Y(-2)], [X(0), Y(25)]], "#f0604e");
            p.ellipse(X(-12), Y(-11), 5, 4, "#ffc1b2");
            break;
        case "wave":
            for (let i = 0; i < 3; i++) p.line(X(-26 + i * 18), Y(6), X(-17 + i * 18), Y(-6), c, 6), p.line(X(-17 + i * 18), Y(-6), X(-8 + i * 18), Y(6), c, 6);
            break;
        case "close":
            p.line(X(-14), Y(-14), X(14), Y(14), c, 8); p.line(X(14), Y(-14), X(-14), Y(14), c, 8);
            break;
        case "bin":
            p.rect(X(-16), Y(-10), 32, 34, "#c2543e"); p.rect(X(-20), Y(-16), 40, 6, "#8e3a2a"); p.rect(X(-7), Y(-22), 14, 6, "#8e3a2a");
            p.rect(X(-8), Y(-4), 4, 22, "#ffb9a6"); p.rect(X(4), Y(-4), 4, 22, "#ffb9a6");
            break;
        case "arrow":
            p.poly([[X(-13), Y(-27)], [X(13), Y(-27)], [X(13), Y(0)], [X(26), Y(0)], [X(0), Y(28)], [X(-26), Y(0)], [X(-13), Y(0)]], "#ffffff");
            p.poly([[X(-8), Y(-22)], [X(8), Y(-22)], [X(8), Y(5)], [X(16), Y(5)], [X(0), Y(21)], [X(-16), Y(5)], [X(-8), Y(5)]], "#e0694a");
            break;
        case "spin":
            p.line(X(-22), Y(4), X(-12), Y(-14), c, 6); p.line(X(-12), Y(-14), X(12), Y(-14), c, 6); p.line(X(12), Y(-14), X(22), Y(4), c, 6);
            p.poly([[X(14), Y(4)], [X(30), Y(4)], [X(22), Y(16)]], c);
            break;
        default:
    }
}

export function paintArt(game) {
    const a = game.assets;
    a.paint("icons", 432, 288, (p) => {
        for (let f = 0; f < 23; f++) paintIcon(p, f, "#ffffff");
    }, { smooth: true });
    a.grid("icons", 6, 4);
    a.paint("iconsDark", 432, 288, (p) => {
        for (let f = 0; f < 23; f++) paintIcon(p, f, "#245766");
    }, { smooth: true });
    a.grid("iconsDark", 6, 4);
    a.paint("halo", 64, 64, (p) => {
        for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
            const d = Math.hypot(x - 31.5, y - 31.5) / 32, v = Math.max(0, 1 - d), o = (y * 64 + x) * 4;
            p.data[o] = p.data[o + 1] = p.data[o + 2] = 255; p.data[o + 3] = v * v * 255;
        }
    }, { smooth: true });
    // Nell the harbour master: sou'wester, freckles, kind eyes.
    a.paint("nell", 128, 128, (p) => {
        p.ellipse(64, 66, 58, 58, "#fff6e4");
        p.ellipse(64, 110, 42, 26, "#e0a93a", "#b9791f");
        p.ellipse(64, 74, 32, 32, "#f6cfa6", "#e3a97e");
        p.ellipse(34, 76, 7, 9, "#e8b48a"); p.ellipse(94, 76, 7, 9, "#e8b48a");
        p.poly([[20, 56], [108, 56], [122, 70], [6, 70]], "#f5c23c");
        p.ellipse(62, 44, 38, 30, "#ffd65c", "#e8a92e");
        p.rect(24, 54, 80, 6, "#c98a1e");
        p.ellipse(50, 74, 4, 5, "#2b3b47"); p.ellipse(78, 74, 4, 5, "#2b3b47");
        p.ellipse(49, 72, 1.5, 2, "#fff"); p.ellipse(77, 72, 1.5, 2, "#fff");
        p.ellipse(42, 86, 7, 4, "#f7a58e"); p.ellipse(86, 86, 7, 4, "#f7a58e");
        for (const [x, y] of [[46, 82], [52, 84], [76, 84], [82, 82], [64, 82]]) p.circle(x, y, 1, "#c98a66");
        p.line(56, 92, 64, 96, "#a5533f", 2); p.line(64, 96, 72, 92, "#a5533f", 2);
    }, { smooth: true });
}
