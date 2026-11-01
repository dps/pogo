// The play scene: layout, the living garden, drag-to-plant, and every bit of feedback. The rules are in sim.js.
import { layer, pos, tap, ui } from "./pogo.js";
import { ALL_PESTS, COLS, DEFS, LEVELS, PESTS, ROWS, SEASONS, metaFx, levelWaves } from "./data.js";
import { BLOCK, LAWN, POND, RICH, Sim, cellOf } from "./sim.js";
import { F, GRAN, spr } from "./art.js";
import { WINDOW, paintCottage, paintGarden } from "./world.js";
import { MUSIC } from "./audio.js";
import { FONT, INK, PAPER, btn, card, textL, txt } from "./ui.js";

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lookOf = (t) => (t.tier === 1 ? 0 : t.branch === "a" ? t.tier - 1 : t.tier + 1);

const GRAN_LINES = {
    bite: ["Not my marrow!", "Oi! Hands off!", "Those are show marrows!", "You little horrors!", "Gerald! Do something!"],
    kill: ["That'll learn you.", "Lovely shot, dear.", "Back to the compost!", "Ta very much."],
    boss: ["Well, that's a big one.", "Oh, give me strength.", "Fetch my good slipper."],
    wave: ["Here they come, dear.", "Kettle can wait.", "Mind the dahlias!", "Stand by your gnomes."],
    clear: ["Time for a biscuit.", "That's seen them off.", "Lovely. Tea?", "Well done, dear."],
    idle: ["Knit one, purl one...", "Is that rain, Gerald?", "Marrow's looking lovely.", "Forty years on this wall."],
};
const WEATHER_ICON = { rain: "i_rain", scorcher: "i_sun", gale: "i_wind", blizzard: "i_snow" };

export function playScene(game, s, args, G) {
    const meta = metaFx(G.save.meta), sfx = G.sfx, endless = args.endless !== undefined;
    const fx = [], order = [], decor = [], ambient = [];
    const groundFx = [];
    let time = 0, speed = 1, paused = false, drag = null, armed = null, sel = null, info = null, popup = false, shownPennies = 0, route = null, routeOld = 0;
    let shakeMarrow = 0, overT = -1, banner = null, tutorial = 0, tutHand = null, cloudX = 0, smokeT = 0, sayT = 0, say = null, says = [], result = null;
    let granMood = "knit", granT = 0, granIdle = 8, knit = 0, blink = 0, tick = 0, ping = 0, lastBoss = null, bossShown = false, marrowHit = 0, geraldT = 0;

    const hook = (name, a, b, c) => onEvent(name, a, b, c);
    const sim = new Sim({ level: args.level ?? 0, endless: args.endless, meta, seed: (args.seed ?? 7) + ((args.level ?? 0) * 13), hook });
    game.data.sim = sim;
    let seasonName = sim.season;

    // ---- Layout ------------------------------------------------------------------------------------------------
    const L = {};
    function layout() {
        const V = game.view, S = V.safe;
        L.portrait = V.height >= V.width;
        L.w = V.width; L.h = V.height; L.safe = S;
        const unlocked = sim.unlocked.length;
        if (L.portrait) {
            const trayMin = 148, topMin = 66;
            const availH = V.height - S.top - S.bottom - trayMin - topMin;
            const C = Math.min(V.width / COLS, availH / ROWS);
            L.C = C; L.gw = COLS * C; L.gh = ROWS * C; L.gx = (V.width - L.gw) / 2;
            const spare = availH - L.gh;
            L.gy = S.top + topMin + spare * 0.45;
            L.tx = Math.max(S.left, 4); L.tw = V.width - L.tx * 2;
            L.ty = L.gy + L.gh + 5; L.th = V.height - S.bottom - L.ty - 3;
            L.barH = 48;
            L.cols = 6; L.rows = 2;
            L.bandX = 0; L.bandW = V.width; L.bandY = 0; L.bandH = L.gy;
        } else {
            const panelMin = 176;
            const availW = V.width - S.left - S.right - panelMin, availH = V.height - S.top - S.bottom;
            const C = Math.min(availW / ROWS, availH / COLS);
            L.C = C; L.gw = ROWS * C; L.gh = COLS * C; L.gx = S.left + 4; L.gy = S.top + (availH - L.gh) / 2;
            const px = L.gx + L.gw + 6, pw = V.width - S.right - px - 4;
            L.bandX = px; L.bandW = pw; L.bandY = 0; L.bandH = S.top + 88;
            L.tx = px; L.tw = pw; L.ty = L.bandH + 3; L.th = V.height - S.bottom - L.ty - 3;
            L.barH = 92;
            L.cols = pw >= 232 ? 4 : 3; L.rows = Math.ceil(12 / L.cols);
        }
        L.packH = (L.th - L.barH - 4) / L.rows; L.packW = L.tw / L.cols;
        // Status tags beside Gran's window
        const winS = L.portrait ? L.bandW / 720 * Math.min(1, 360 / L.bandW * 1.0) * (L.bandW / 360) : 0.5;
        L.cotS = L.portrait ? Math.min(Math.max(V.width, 360) / 720, L.gy / 196) : 0.46;
        L.cotY = L.portrait ? L.gy + 2 - 300 * L.cotS : L.bandH + 2 - 300 * L.cotS;
        L.cotX = L.portrait ? 0 : L.bandX - 6;
        L.winX = L.cotX + WINDOW.x * L.cotS; L.winY = L.cotY + WINDOW.y * L.cotS;
        L.tagX = L.winX + 46;
        L.tagY = Math.max(S.top + 4, 4);
        void winS;
        paintGarden(game, sim.levelIndex, seasonName, L.portrait);
        buildDecor();
        placeButtons();
    }
    const vx = (cx, cy) => (L.portrait ? L.gx + cx * L.C : L.gx + (ROWS - cy) * L.C);
    const vy = (cx, cy) => (L.portrait ? L.gy + cy * L.C : L.gy + cx * L.C);
    const cellAt = (x, y) => (L.portrait
        ? [Math.floor((x - L.gx) / L.C), Math.floor((y - L.gy) / L.C)]
        : [Math.floor((y - L.gy) / L.C), ROWS - 1 - Math.floor((x - L.gx) / L.C)]);
    const fromView = (x, y) => (L.portrait ? [(x - L.gx) / L.C, (y - L.gy) / L.C] : [(y - L.gy) / L.C, ROWS - (x - L.gx) / L.C]);
    const onGrid = (x, y) => { const [c, r] = cellAt(x, y); return c >= 0 && r >= 0 && c < COLS && r < ROWS; };

    // ---- Scenery -------------------------------------------------------------------------------------------------
    function buildDecor() {
        decor.length = 0;
        const map = sim.def.map, winter = seasonName === "winter";
        const palette = { spring: [0, 2, 3, 8, 7, 1], summer: [5, 6, 12, 9, 15, 8], autumn: [6, 12, 13, 14, 10, 9], winter: [11] }[seasonName];
        let seed = sim.levelIndex * 17 + 3;
        const rnd = () => { seed = Math.imul(seed, 1664525) + 1013904223 >>> 0; return seed / 4294967296; };
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const ch = map[r][c], x = c + 0.5, y = r + 0.5;
            if (ch === "h") {
                const wall = r === ROWS - 1 || r === ROWS - 2;
                decor.push({ k: "d", name: wall ? "wall" : "hedge", frame: wall ? (c + r) % 3 : (c * 5 + r) % 4 === 0 ? 1 : 0, x, y, w: 1.3, h: 1.3, dy: -0.12, snow: winter });
            } else if (ch === "o") decor.push({ k: "d", name: "rock", frame: (c + r) % 3, x, y, w: 1.2, h: 1.2, snow: winter, dy: -0.08 });
            else if (ch === "T") decor.push({ k: "d", name: "tree", frame: ["spring", "summer", "autumn", "winter"].indexOf(seasonName), x, y, w: 1.62, h: 1.62, dy: -0.42, sway: 0.012, phase: rnd() * 6 });
            else if (ch === "p") decor.push({ k: "d", name: "pot", frame: winter ? 1 : (c + r) % 2, x, y, w: 1, h: 1, dy: -0.1, snow: winter });
            else if (ch === "w") decor.push({ k: "d", name: "barrow", frame: 0, x, y, w: 1.2, h: 1.2, dy: -0.1 });
            else if (ch === "b") {
                const n = winter ? 2 : 4;
                for (let i = 0; i < n; i++) decor.push({ k: "d", name: "flower", frame: palette[(rnd() * palette.length) | 0], x: x + (i % 2 ? 0.2 : -0.22) + rnd() * 0.1, y: y + (i < 2 ? -0.12 : 0.26) + rnd() * 0.08, w: 0.8, h: 0.8, dy: -0.3, sway: 0.09, phase: rnd() * 6, flower: true });
            }
        }
        // Wildflowers tucked by the rim, so the lawn edge feels planted.
        for (const g of sim.gates) decor.push({ k: "d", name: "gate", frame: (g.c + g.r) % 2, x: g.x, y: g.y, w: 1.25, h: 1.25, dy: -0.12 });
        marrowItem.x = sim.goal.x; marrowItem.y = sim.goal.y;
        decor.push(marrowItem);
    }
    const marrowItem = { k: "m", x: 0, y: 0 };

    // ---- Particles ----------------------------------------------------------------------------------------------
    function puff(name, frame, x, y, o = {}) {
        if (fx.length > 420) return null;
        const p = { name, frame, x, y, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: o.life ?? 0.5, t: 0, s0: o.s0 ?? 12, s1: o.s1 ?? o.s0 ?? 12, rot: o.rot ?? 0, vr: o.vr ?? 0, a: o.a ?? 1, home: o.home ?? false, drag: o.drag ?? 0, ground: o.ground ?? 0 };
        fx.push(p);
        return p;
    }
    const R = (a, b) => a + game.fxRng.next() * (b - a);
    function dirtPuff(x, y, power = 1) {
        const C = L.C;
        for (let i = 0; i < 9 * power; i++) { const a = R(0, TAU), v = R(20, 90) * power; puff("puff", 0, x + Math.cos(a) * C * 0.22, y + Math.sin(a) * C * 0.12 + C * 0.1, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - 12, life: R(0.3, 0.6), s0: C * 0.3, s1: C * R(0.5, 0.8), a: 0.75, drag: 3 }); }
        for (let i = 0; i < 8 * power; i++) { const a = R(-2.8, -0.3), v = R(70, 170) * power; puff("clod", i % 2, x, y + C * 0.1, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520, life: R(0.35, 0.6), s0: C * 0.14, rot: R(0, 6), vr: R(-9, 9) }); }
    }
    function splat(x, y, size, c = 0) {
        const n = size > 30 ? 8 : 4;
        for (let i = 0; i < n; i++) { const a = R(0, TAU), v = R(30, 110); puff("puff", c, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.2, 0.4), s0: size * 0.3, s1: size * 0.1, a: 0.85, drag: 4 }); }
    }
    function sparkle(x, y, n = 8, r = 40) {
        for (let i = 0; i < n; i++) { const a = R(0, TAU), v = R(r * 0.8, r * 2); puff("spark", i % 2, x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: R(0.3, 0.6), s0: R(9, 16), s1: 0, rot: R(0, 6), vr: 6, drag: 3 }); }
    }
    function coins(x, y, n) {
        for (let i = 0; i < n; i++) puff("coin", 0, x + R(-6, 6), y + R(-6, 6), { vx: R(-60, 60), vy: R(-140, -60), life: 0.9, s0: 13, home: true });
    }
    function petals(n) {
        for (let i = 0; i < n; i++) puff("leaf", 4 + (i % 2), R(0, L.w), R(-30, -4), { vx: R(-30, 30), vy: R(70, 180), life: R(1.5, 3), s0: R(9, 16), rot: R(0, 6), vr: R(-4, 4) });
    }
    function ring(x, y, r, colorName = "#ffffff") { groundFx.push({ x, y, r, t: 0, life: 0.5, c: colorName }); }

    // ---- Gran ----------------------------------------------------------------------------------------------------
    const pickLine = (k) => GRAN_LINES[k][(game.fxRng.next() * GRAN_LINES[k].length) | 0];
    function mood(m, sec = 2) { granMood = m; granT = sec; granIdle = 9; }
    function speak(text, sec = 3.2, front = false) {
        if (game.data.quiet) return;
        if (say && say.text === text) return;
        if (says.some((q) => q.text === text)) return;
        const item = { text, sec };
        if (front) says.unshift(item); else if (says.length < 3) says.push(item);
    }

    // ---- Rule events ---------------------------------------------------------------------------------------------
    function onEvent(name, a, b, c) {
        const C = L.C;
        switch (name) {
            case "plant": {
                const x = vx(a.x, a.y), y = vy(a.x, a.y);
                a.born = time; dirtPuff(x, y, 1); ring(x, y + C * 0.2, C * 0.7, "#6a4a33");
                sfx("snap"); s.shake(1.2, 0.1); mood("wave", 1.4);
                if (a.key === "bramble" && sim.levelIndex === 1 && !G.save.seen.bramble) { G.save.seen.bramble = 1; speak("See? They'll have to go round. Longer walk, more time to bonk them."); }
                break;
            }
            case "upgrade": {
                const x = vx(a.x, a.y), y = vy(a.x, a.y);
                a.born = time; sparkle(x, y, 14, 60); ring(x, y, C * 1.1, "#f0cf70");
                sfx("upgrade"); mood("cheer", 1.2);
                break;
            }
            case "sell": { const x = vx(a.x, a.y), y = vy(a.x, a.y); dirtPuff(x, y, 0.6); coins(x, y, 6); sfx("sell"); break; }
            case "fire": if (a.s.kind === "lob") { sfx(a.s.pebble ? "pebble" : "fling"); } break;
            case "land": {
                const x = vx(a.tx, a.ty), y = vy(a.tx, a.ty), heavy = a.big > 1;
                for (let i = 0; i < (heavy ? 7 : 3); i++) { const an = R(0, TAU), v = R(30, 80); puff("puff", 0, x, y, { vx: Math.cos(an) * v, vy: Math.sin(an) * v * 0.5, life: 0.35, s0: C * 0.2, s1: C * 0.45, a: 0.6, drag: 3 }); }
                if (heavy) ring(x, y, C * a.splash, "#f4efe4");
                if (a.heavy) { sfx("bonkBig"); s.shake(2, 0.12); } else sfx("bonk");
                break;
            }
            case "kill": {
                const x = vx(a.x, a.y), y = vy(a.x, a.y), size = C * a.size;
                if (a.t.boss) {
                    s.freeze(0.16); s.shake(10, 0.6); s.flash("#fff6d8", 0.35); sfx("bossDie"); sparkle(x, y, 26, 120); coins(x, y, 18); petals(40); mood("cheer", 4);
                    speak(pickLine("kill"), 2.5, true); lastBoss = null;
                    game.music(MUSIC[SEASONS[seasonName].song]);
                    for (let i = 0; i < 12; i++) dirtPuff(x + R(-C, C), y + R(-C, C), 0.5);
                    break;
                }
                if (a.swallowed) break;
                splat(x, y, size * 1.2, a.type === "frost" ? 2 : 1);
                sfx(a.size > 0.6 ? "splat" : "squish");
                if (a.t.bounty >= 2) coins(x, y, Math.min(3, Math.round(a.t.bounty / 2.4)));
                else if (game.fxRng.next() < 0.3) coins(x, y, 1);
                break;
            }
            case "swallow": { sfx("gulp"); swallowFx(a, b); break; }
            case "chomp": sfx("chomp"); s.shake(1.4, 0.08); break;
            case "bite": {
                const x = vx(a.x, a.y), y = vy(a.x, a.y);
                marrowHit = 0.4; shakeMarrow = 0.35; sfx("bite"); s.shake(4, 0.2); s.flash("#d8432f", 0.12); mood("gasp", 1.6);
                for (let i = 0; i < 8; i++) { const an = R(-3, 0), v = R(50, 150); puff("clod", 0, x, y, { vx: Math.cos(an) * v, vy: Math.sin(an) * v, g: 420, life: 0.5, s0: C * 0.1 }); }
                if (game.fxRng.next() < 0.55) speak(pickLine("bite"), 2, true);
                break;
            }
            case "gerald": geraldT = 1.4; sfx("meow"); splat(vx(a.x, a.y), vy(a.x, a.y), C * 0.7, 1); speak("Good boy, Gerald!", 2, true); break;
            case "wave": {
                sfx("wave"); banner = { title: `Wave ${a + 1}${sim.total !== Infinity ? ` of ${sim.total}` : ""}`, sub: "", t: 0, life: 1.5, boss: false };
                if (a > 0 && !sim.bossAlive && game.fxRng.next() < 0.3) speak(pickLine("wave"), 2.2);
                ping = 0.5;
                break;
            }
            case "early": { sfx("early"); coins(btnSend.pos.x, btnSend.pos.y, Math.min(10, 2 + (a >> 3))); floatText(`+${a}p early!`, btnSend.pos.x, btnSend.pos.y - 34, "#3f6b3c"); break; }
            case "payday": {
                sfx("payday");
                floatText(`+${a}p${b > 0 ? ` (${b}p interest)` : ""}`, L.portrait ? L.w * 0.55 : L.tx + L.tw / 2, L.tagY + 66, "#6a4a1c");
                for (const t of sim.towers) if (t.s.income) coins(vx(t.x, t.y), vy(t.x, t.y), 3);
                break;
            }
            case "boss": {
                banner = { title: a.t.name, sub: a.t.title, t: 0, life: 2.6, boss: true, sprite: a.t.sprite };
                sfx("bossIn"); s.shake(7, 0.5); mood("gasp", 2.5); speak(a.t.tip ?? pickLine("boss"), 3.6, true);
                game.music(MUSIC.boss);
                break;
            }
            case "firstSeen": {
                const p = ALL_PESTS[a];
                if (p.tip && !p.boss && !G.save.seen[a]) { G.save.seen[a] = 1; speak(p.tip, 4.4); G.commit(); }
                break;
            }
            case "weather": {
                if (a === "rain" && b) sfx("thunder");
                if (a === "gale" && b) sfx("gust");
                if (b) { const key = `w_${a}`; if (!G.save.seen[key]) { G.save.seen[key] = 1; G.commit(); speak(SEASONS[seasonName].desc, 3.6); } }
                break;
            }
            case "season": {
                seasonName = a; paintGarden(game, sim.levelIndex, a, L.portrait); buildDecor();
                game.music(MUSIC[SEASONS[a].song]); banner = { title: SEASONS[a].name, sub: SEASONS[a].desc, t: 0, life: 2.4 };
                break;
            }
            case "surface": { const x = vx(a.x, a.y), y = vy(a.x, a.y); dirtPuff(x, y, 0.4); sfx("surface"); break; }
            case "quake": s.shake(6, 0.35); sfx("uproot"); ring(vx(a.x, a.y), vy(a.x, a.y), C * 2.3, "#8a6a48"); break;
            case "uproot": { dirtPuff(vx(a.x, a.y), vy(a.x, a.y), 0.5); sfx("uproot"); a.dazed = time; break; }
            case "daze": case "freeze": a.dazed = time; if (name === "freeze") { ring(vx(a.x, a.y), vy(a.x, a.y), C * 0.8, "#bfe6f4"); } break;
            case "frostwave": s.shake(3, 0.2); ring(vx(a.x, a.y), vy(a.x, a.y), C * 2.6, "#bfe6f4"); sfx("bell"); break;
            case "waspSting": a.dazed = time; sfx("stun"); break;
            case "burp": sfx("splat"); s.shake(3, 0.2); break;
            case "brood": sfx("squish"); break;
            case "lay": sfx("squish"); break;
            case "hatch": sfx("squish"); splat(vx(a.x, a.y), vy(a.x, a.y), C * 0.5, 1); break;
            case "shellup": sfx("bonk"); break;
            case "chime": {
                const x = vx(a.x, a.y), y = vy(a.x, a.y);
                a.ring = time;
                if (b || !a.lastChime || time - a.lastChime > 6) { sfx(a.branch === "a" ? "bell" : "chime"); a.lastChime = time; }
                ring(x, y, C * (a.s.range + a.mRange), "#cfe6ef");
                puff("note", 0, x + R(-10, 10), y - C * 0.6, { vy: -30, vx: R(-14, 14), life: 0.8, s0: 12, s1: 8, a: 0.9 });
                break;
            }
            case "jet": sfx("jet"); break;
            case "sting": sfx("sting"); break;
            case "spray": { sfx("fire"); const x = vx(a.x, a.y), y = vy(a.x, a.y), an = viewAngle(a.angle); for (let i = 0; i < 4; i++) puff("flame", i % 2, x, y - C * 0.2, { vx: Math.cos(an + R(-0.35, 0.35)) * C * R(2.5, 4.5), vy: Math.sin(an + R(-0.35, 0.35)) * C * R(2.5, 4.5), life: 0.4, s0: C * 0.18, s1: C * 0.4, a: 0.9 }); break; }
            case "fizz": sfx("fizz"); puff("puff", 1, vx(a.x, a.y), vy(a.x, a.y), { vy: -30, life: 0.5, s0: C * 0.2, s1: C * 0.5, a: 0.6 }); break;
            case "flare": sfx("bonk"); for (let i = 0; i < 6; i++) { const an = R(0, TAU); puff("flame", i % 2, vx(a, b), vy(a, b), { vx: Math.cos(an) * 70, vy: Math.sin(an) * 70, life: 0.4, s0: C * 0.25, s1: 0, drag: 3 }); } break;
            case "bonfire": { sfx("bonfire"); const x = vx(a, b), y = vy(a, b); s.shake(3, 0.18); for (let i = 0; i < 16; i++) { const an = R(0, TAU), v = R(20, 120); puff("flame", i % 2, x, y, { vx: Math.cos(an) * v, vy: Math.sin(an) * v - 30, life: R(0.4, 0.8), s0: C * 0.4, s1: 0, drag: 2 }); } break; }
            case "fear": { sfx("gasp"); ring(vx(a.x, a.y), vy(a.x, a.y), C * (a.s.range + a.mRange), "#b5a0d0"); break; }
            case "collapse": dirtPuff(vx(a.x, a.y), vy(a.x, a.y), 0.7); sfx("uproot"); break;
            case "sip": a.sipT = 0.8; break;
            case "blast": { s.shake(4, 0.25); sfx("bonkBig"); const x = vx(a.x, a.y), y = vy(a.x, a.y); for (let i = 0; i < 12; i++) { const an = R(0, TAU), v = R(40, 150); puff("flame", i % 2, x, y, { vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: 0.5, s0: C * 0.4, s1: 0, drag: 3 }); } break; }
            case "worm": sfx("surface"); break;
            case "slipper": throwSlipper(a, b); break;
            case "over": finishFx(a); break;
            default: break;
        }
    }
    const viewAngle = (a) => (L.portrait ? a : Math.atan2(Math.cos(a), -Math.sin(a)));
    function swallowFx(e, t) { const p = puff(F[e.t.sprite] ? e.t.sprite : "slug", 0, vx(e.x, e.y), vy(e.x, e.y), { life: 0.22, s0: L.C * e.size * 1.3, s1: 2 }); if (p) { p.tx = vx(t.x, t.y); p.ty = vy(t.x, t.y) - L.C * 0.3; } }

    function throwSlipper(x, y) {
        sfx("slipFly"); mood("cross", 1.4);
        const tx = vx(x, y), ty = vy(x, y), p = puff("slipper", 0, L.winX, L.winY, { life: 0.42, s0: L.C * 0.7, s1: L.C * 1.3, vr: 16 });
        if (p) { p.tx = tx; p.ty = ty; p.arc = 60; p.done = () => {
            sfx("slipHit"); s.shake(7, 0.25); ring(tx, ty, L.C * 1.5, "#ffffff"); dirtPuff(tx, ty, 1.4); s.freeze(0.05);
        }; }
    }

    const floats = [];
    function floatText(str, x, y, color) { floats.push({ str, x, y, t: 0, color }); }

    function finishFx(r) {
        overT = 0; drag = null; sel = null; armed = null; popup = false;
        result = G.finish(sim);
        if (r === "win") { sfx("win"); mood("cheer", 99); petals(50); s.flash("#fff6d8", 0.25); }
        else { sfx("lose"); mood("gasp", 99); s.shake(8, 0.5); }
        game.stopMusic();
    }

    // ---- Buttons ----------------------------------------------------------------------------------------------------
    const playing = () => overT < 0 && !paused && !popup;
    const btnPause = btn(game, s, { name: "pause", w: 44, h: 44, icon: "i_pause", action: "pause", visible: () => overT < 0, onTap: () => { sfx("tap"); paused = !paused; popup = false; } });
    const btnSpeed = btn(game, s, {
        name: "speed", w: 46, h: 40, fill: "#6d8a56", action: "speed", visible: () => !sel && overT < 0, onTap: () => { speed = speed === 3 ? 1 : speed + 1; sfx("tap"); },
        art: (d) => spr(d, "i_fast", speed - 1, 0, 0, 30),
    });
    const btnSend = btn(game, s, {
        name: "send", w: 96, h: 40, fill: "#b5553c", action: "confirm", visible: () => !sel && overT < 0 && sim.wave < sim.total, onTap: () => { if (playing()) sim.sendWave(true); },
        art: (d, e) => {
            const bonus = sim.earlyBonus(), w = e.size.x;
            if (!sim.hold && sim.wave > 0 || sim.countdown) {
                const f = clamp(sim.countdown / sim.countdownMax, 0, 1);
                d.rect((w - 10) * f, 3, { x: -(w - 10) * (1 - f) / 2, y: e.size.y / 2 - 4, color: "#f6ecd2cc", radius: 1.5 });
            }
            txt(d, sim.wave === 0 ? "Send wave" : "Send next", 0, bonus > 0 ? -9 : -2, 13, "#fff6e0", true);
            if (bonus > 0) txt(d, `+${bonus}p`, 0, 6, 12, "#ffe08a", true);
        },
    });
    const btnPreview = btn(game, s, {
        name: "preview", w: 120, h: 40, fill: "#f0e3c2", ink: true, visible: () => !sel && overT < 0, onTap: () => { sfx("tap"); popup = !popup; },
        art: (d, e) => {
            const list = sim.preview(), w = e.size.x;
            if (!list.length) { txt(d, "Last pests!", 0, 0, 13, INK, true); return; }
            const n = Math.min(list.length, Math.floor((w - 8) / 40)), step = (w - 8) / n;
            for (let i = 0; i < n; i++) {
                const p = ALL_PESTS[list[i].type], x = -w / 2 + 4 + step * (i + 0.5);
                spr(d, p.sprite, 0, x - 7, 0, p.boss ? 34 : 30);
                txt(d, p.boss ? "!" : String(list[i].count), x + 11, 8, 13, p.boss ? "#b5392c" : INK, true);
            }
        },
    });
    const btnClose = btn(game, s, { name: "close", w: 40, h: 40, label: "x", fill: "#8a6a48", visible: () => !!sel && overT < 0, onTap: () => { sfx("tap"); sel = null; } });
    const card1 = upCard("a"), card2 = upCard("b");
    const btnSell = btn(game, s, {
        name: "sell", w: 88, h: 40, fill: "#9a5a3c", visible: () => !!sel && overT < 0, onTap: () => { if (sel && playing()) { sim.sell(sel); sel = null; } },
        art: () => {}, labelFn: () => (sel ? `Sell ${sim.sellValue(sel)}p` : "Sell"),
    });
    function upCard(branch) {
        return btn(game, s, {
            name: `up_${branch}`, w: 120, h: 96, fill: "#f6ecd2", ink: true, radius: 8,
            visible: () => !!sel && overT < 0 && !!(sel.branch ? (branch === sel.branch && sim.nextUp(sel, branch)) : sim.nextUp(sel, branch)),
            onTap: () => {
                if (!sel || !playing()) return;
                if (!sim.upgrade(sel, branch)) { sfx("nope"); shakeUp = 0.3; }
            },
            art: (d, e) => {
                if (!sel) return;
                const u = sim.nextUp(sel, branch); if (!u) return;
                const cost = sim.upCost(sel, branch), afford = sim.pennies >= cost, w = e.size.x, h = e.size.y;
                d.rect(w - 6, 19, { y: -h / 2 + 12.5, radius: 5, color: branch === "a" ? "#7f9e5a" : "#6f8fa8" });
                txt(d, u.name, 0, -h / 2 + 12, 12.5, "#fff9ea", true, 0, w - 8);
                const look = branch === "a" ? sel.tier : sel.tier + 2;
                if (h > 100) { spr(d, sel.key, look, 0, -h / 2 + 44, 46); txt(d, u.desc, 0, 18, 11.5, INK, false, w - 12); }
                else txt(d, u.desc, 0, 1, 11.5, INK, false, w - 12);
                txt(d, `${cost}p`, 0, h / 2 - 11, 13.5, afford ? "#3f6b3c" : "#b5392c", true);
            },
        });
    }
    let shakeUp = 0;

    const btnResume = btn(game, s, { name: "resume", w: 160, h: 50, label: "Back to it", fill: "#5f8a4b", layer: 30, visible: () => paused && overT < 0, onTap: () => { sfx("tap"); paused = false; } });
    const btnRetryP = btn(game, s, { name: "retryPause", w: 160, h: 46, label: "Start again", fill: "#b5553c", layer: 30, visible: () => paused && overT < 0, onTap: () => { sfx("tap"); G.play(args); } });
    const btnQuit = btn(game, s, { name: "quit", w: 160, h: 46, label: "Garden path", fill: "#8a6a48", layer: 30, visible: () => paused && overT < 0, onTap: () => { sfx("tap"); G.toMap(); } });
    const btnSound = btn(game, s, { name: "sound", w: 60, h: 46, fill: "#6f8fa8", layer: 30, visible: () => paused && overT < 0, onTap: () => G.toggleSound(), art: (d) => spr(d, "i_sound", game.audio.muted ? 1 : 0, 0, 0, 28) });
    const btnBuzz = btn(game, s, { name: "buzz", w: 60, h: 46, fill: "#6f8fa8", layer: 30, visible: () => paused && overT < 0, onTap: () => G.toggleHaptics(), art: (d) => spr(d, "i_buzz", game.haptics.enabled ? 0 : 1, 0, 0, 28) });

    const resVisible = () => overT > 0.9;
    const btnNext = btn(game, s, { name: "next", w: 170, h: 52, fill: "#5f8a4b", layer: 30, action: "confirm", labelFn: () => (sim.over === "win" && !endless ? (result?.nextLevel !== null ? "Next garden" : "Back to the garden") : "Try again"), visible: resVisible, onTap: () => { sfx("tap"); if (sim.over === "win" && !endless && result?.nextLevel !== null) G.play({ level: result.nextLevel }); else if (sim.over === "win" && !endless) G.toMap(); else G.play(args); } });
    const btnMap = btn(game, s, { name: "resMap", w: 170, h: 44, label: "Garden path", fill: "#8a6a48", layer: 30, visible: resVisible, onTap: () => { sfx("tap"); G.toMap(); } });

    function placeButtons() {
        const S = L.safe, b = L.barH, y = L.ty + b / 2, gap = 4;
        const set = (e, x, yy, w, h) => { e.pos.set(x, yy, 0); e._prevPos?.set(e.pos); if (w) e.size.set(w, h, 0); };
        const rightX = L.w - S.right - 25;
        set(btnPause, rightX, S.top + 26, 44, 44);
        if (L.portrait) {
            const speedW = 46, sendW = 98, slip = 50, pv = L.tw - speedW - sendW - slip - gap * 3;
            set(btnPreview, L.tx + pv / 2, y, pv, b - 4);
            L.slip = { x: L.tx + pv + gap + slip / 2, y, w: slip, h: b - 4 };
            set(btnSpeed, L.tx + pv + slip + gap * 2 + speedW / 2, y, speedW, b - 4);
            set(btnSend, L.tx + L.tw - sendW / 2, y, sendW, b - 4);
        } else {
            const h = 44, y1 = L.ty + h / 2, y2 = L.ty + h + 2 + h / 2, third = (L.tw - gap * 2) / 3;
            L.slip = { x: L.tx + third / 2, y: y1, w: third, h };
            set(btnSpeed, L.tx + third * 1.5 + gap, y1, third, h);
            set(btnPause, L.tx + third * 2.5 + gap * 2, y1, third, h);
            const sendW = Math.min(100, L.tw * 0.5), pv = L.tw - sendW - gap;
            set(btnPreview, L.tx + pv / 2, y2, pv, h);
            set(btnSend, L.tx + L.tw - sendW / 2, y2, sendW, h);
        }
        // Upgrade panel
        const top = L.ty, ph = L.th, cw = L.portrait ? (L.tw - 8 - 92) / 2 : (L.tw - 4) / 2;
        if (L.portrait) {
            const ch = ph - 2;
            set(card1, L.tx + 92 + cw / 2 + 4, top + ch / 2 + 1, cw, ch);
            set(card2, L.tx + 92 + cw * 1.5 + 8, top + ch / 2 + 1, cw, ch);
            set(btnSell, L.tx + 46, top + ph - 22, 88, 40);
            set(btnClose, L.tx + 22, top + 22, 40, 40);
        } else {
            const ch = ph - 48;
            set(card1, L.tx + cw / 2, top + 46 + ch / 2, cw, ch);
            set(card2, L.tx + cw * 1.5 + 4, top + 46 + ch / 2, cw, ch);
            set(btnClose, L.tx + 22, top + 22, 40, 40);
            set(btnSell, L.tx + L.tw - 44, top + 22, 84, 40);
        }
        // Single branch: one wide card
        const cx = L.w / 2, cy = L.h / 2;
        set(btnResume, cx, cy - 40, 170, 50); set(btnRetryP, cx, cy + 16, 170, 46); set(btnQuit, cx, cy + 68, 170, 46);
        set(btnSound, cx - 42, cy + 122, 64, 46); set(btnBuzz, cx + 42, cy + 122, 64, 46);
        set(btnNext, cx, cy + 66, 186, 52); set(btnMap, cx, cy + 122, 186, 44);
    }

    /** One path left means one big card; a fresh defender shows both paths side by side. */
    function syncPanel() {
        if (!sel) return;
        const top = L.ty, ph = L.th;
        const a = card1, b = card2, wide = !!sel.branch;
        if (L.portrait) {
            const area = L.tw - 8 - 92, cw = area / 2, ch = ph - 2, x0 = L.tx + 96;
            if (wide) { const c = sel.branch === "a" ? a : b; c.pos.set(x0 + area / 2, top + ch / 2 + 1, 0); c.size.set(area, ch, 0); }
            else { a.pos.set(x0 + cw / 2, top + ch / 2 + 1, 0); a.size.set(cw, ch, 0); b.pos.set(x0 + cw * 1.5 + 4, top + ch / 2 + 1, 0); b.size.set(cw, ch, 0); }
        } else {
            const ch = ph - 48, area = L.tw - 4, cw = area / 2, y = top + 46 + ch / 2;
            if (wide) { const c = sel.branch === "a" ? a : b; c.pos.set(L.tx + area / 2, y, 0); c.size.set(area, ch, 0); }
            else { a.pos.set(L.tx + cw / 2, y, 0); a.size.set(cw, ch, 0); b.pos.set(L.tx + cw * 1.5 + 4, y, 0); b.size.set(cw, ch, 0); }
        }
    }

    // ---- Input ----------------------------------------------------------------------------------------------------
    function packetAt(x, y) {
        if (sel || overT >= 0) return -1;
        const top = L.ty + L.barH;
        if (x < L.tx || x > L.tx + L.tw || y < top || y > top + L.packH * L.rows) return -1;
        const c = Math.floor((x - L.tx) / L.packW), r = Math.floor((y - top) / L.packH), i = r * L.cols + c;
        return i < sim.unlocked.length ? i : -1;
    }
    const overSlipper = (x, y) => !sel && overT < 0 && L.slip && Math.abs(x - L.slip.x) <= L.slip.w / 2 && Math.abs(y - L.slip.y) <= L.slip.h / 2;
    function refreshPreview(key, c, r) {
        route = null;
        if (key === "slipper" || DEFS[key]?.walk) return;
        if (c >= 0 && r >= 0 && c < COLS && r < ROWS && !sim.whyNot(key, c, r)) route = sim.tryRoutes(cellOf(c, r));
    }
    function liftAmount(pt) { return game.input.touchMode ? L.C * 1.25 : 0; }

    function pointerLogic() {
        const p = s.input.pointer;
        if (!playing()) { if (drag) drag = null; return; }
        if (p.pressed) {
            const i = packetAt(p.x, p.y);
            if (i >= 0) {
                const key = sim.unlocked[i];
                drag = { key, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, c: -9, r: -9, afford: sim.pennies >= sim.costOf(key), t: 0 };
                drag.wasArmed = armed === key;
                armed = null; info = key; sfx("pick"); tutHand = null; route = null;
            } else if (overSlipper(p.x, p.y)) {
                if (sim.slipperCd <= 0) { drag = { key: "slipper", x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, c: -9, r: -9, afford: true, t: 0 }; sfx("pick"); }
                else sfx("nope");
                armed = null;
            } else if (onGrid(p.x, p.y)) {
                pressMap = { x: p.x, y: p.y };
            } else if (armed) { armed = null; route = null; }
        }
        if (drag) {
            drag.x = p.x; drag.y = p.y; drag.t += 1 / 60;
            if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10) drag.moved = true;
            const gy = p.y - (drag.moved ? liftAmount(p) : 0), gx = p.x;
            drag.gx = gx; drag.gy = gy;
            const [c, r] = onGrid(gx, gy) ? cellAt(gx, gy) : [-9, -9];
            if (c !== drag.c || r !== drag.r) {
                drag.c = c; drag.r = r;
                if (drag.moved) { sfx("notch"); refreshPreview(drag.key, c, r); }
            }
            if (p.released) {
                if (!drag.moved) {
                    // A tap: arm it, for tap-tap planting and for desktop.
                    armed = drag.wasArmed ? null : drag.key; sfx("tap");
                } else if (c >= 0) doDrop(drag.key, c, r, gx, gy);
                drag = null; route = armed ? null : route;
                if (!armed) { route = null; info = null; }
            }
        } else if (p.released && pressMap) {
            const moved = Math.hypot(p.x - pressMap.x, p.y - pressMap.y) > 24;
            pressMap = null;
            if (!moved && onGrid(p.x, p.y)) {
                const [c, r] = cellAt(p.x, p.y);
                if (armed) {
                    if (doDrop(armed, c, r, p.x, p.y)) { if (armed === "slipper" || sim.pennies < sim.costOf(armed)) { armed = null; info = null; } }
                    route = null;
                } else {
                    const t = sim.tower[cellOf(c, r)];
                    if (t) { sel = sel === t ? null : t; if (sel) { sfx("tap"); t.wiggle = time; tutorialSeen("upgrade"); } }
                    else sel = null;
                }
            }
        } else if (armed && !game.input.touchMode && onGrid(p.x, p.y)) {
            const [c, r] = cellAt(p.x, p.y);
            if (hover.c !== c || hover.r !== r) { hover.c = c; hover.r = r; sfx("notch"); refreshPreview(armed, c, r); }
        }
    }
    let pressMap = null;
    const hover = { c: -9, r: -9 };

    function doDrop(key, c, r, x, y) {
        if (key === "slipper") {
            const [cx, cy] = fromView(x, y);
            return sim.slipper(cx, cy);
        }
        const why = sim.whyNot(key, c, r);
        if (why) {
            sfx("nope"); s.shake(1.2, 0.1);
            const msg = { sealed: "Leave them a way through, dear, or they'll dig under the wall.", paving: "Can't plant on paving, dear.", occupied: "No room there, dear." }[why];
            if (msg) speak(msg, 2.4, true);
            mood("cross", 1);
            return false;
        }
        if (sim.pennies < sim.costOf(key)) { sfx("nope"); speak("Not enough pennies yet, dear.", 1.8, true); penniesShake = 0.4; return false; }
        const t = sim.plant(key, c, r);
        if (t && sim.levelIndex === 0 && !G.save.seen.planted) { G.save.seen.planted = 1; G.commit(); speak("Lovely! Now mind my marrow.", 2.6, true); }
        return !!t;
    }
    let penniesShake = 0;
    function tutorialSeen(k) { if (!G.save.seen[k]) { G.save.seen[k] = 1; G.commit(); } }

    // ---- Update -------------------------------------------------------------------------------------------------------
    s.onUpdate((dt) => {
        time += dt; tick++;
        if (L.w !== game.view.width || L.h !== game.view.height) layout();
        pointerLogic();
        if (!paused && !popup && overT < 0) {
            const steps = speed;
            for (let i = 0; i < steps && !sim.over; i++) sim.tick(1 / 60);
        }
        if (overT >= 0) { const before = overT; overT += dt; starBeats(before, overT); }
        if (s.input.pressed("speed") && !paused) { speed = speed === 3 ? 1 : speed + 1; sfx("tap"); }
        for (let i = 0; i < 9; i++) if (s.input.pressed(`seed${i + 1}`) && i < sim.unlocked.length) { armed = sim.unlocked[i]; info = armed; sel = null; sfx("tap"); }
        if (s.input.pressed("cancel")) { armed = null; sel = null; info = null; route = null; drag = null; popup = false; }
        if (sel && !sim.towers.includes(sel)) sel = null;
        syncPanel();
        const uiDt = dt;
        if (shakeUp > 0) shakeUp -= uiDt;
        if (penniesShake > 0) penniesShake -= uiDt;
        if (marrowHit > 0) marrowHit -= uiDt;
        if (shakeMarrow > 0) shakeMarrow -= uiDt;
        if (ping > 0) ping -= uiDt;
        if (geraldT > 0) geraldT -= uiDt;
        shownPennies += (sim.pennies - shownPennies) * Math.min(1, dt * 10);

        // Gran
        granT -= dt; knit += dt;
        if (granT <= 0) {
            granMood = "knit";
            granIdle -= dt;
            if (granIdle <= 0) { granIdle = 7 + game.fxRng.next() * 8; const k = game.fxRng.next(); if (k < 0.3) mood("sip", 3); else if (k < 0.5 && !sim.enemies.length) mood("sleep", 5); else if (k < 0.65) speak(pickLine("idle"), 2.4); }
        }
        if (sayT > 0) { sayT -= dt; if (sayT <= 0) say = null; }
        else if (says.length) { say = says.shift(); sayT = say.sec; if (granMood !== "gasp" && granMood !== "cheer") mood("wave", 0.8); }

        // Moods that come from the state of the garden
        const pestsOut = sim.enemies.length + sim.spawnQ.length;
        if (hadPests && !pestsOut && sim.wave > 0 && !sim.over) { sfx("payday"); if (sim.wave < sim.total) { mood("cheer", 2); if (game.fxRng.next() < 0.6) speak(pickLine("clear"), 2.2); } }
        hadPests = pestsOut > 0;
        if (tick % 20 === 0 && overT < 0) {
            let close = 9; for (const e of sim.enemies) if (e.prog < close && !e.t.egg) close = e.prog;
            if (close < 3 && granMood === "knit") mood("cross", 1);
            if (sim.bites > 0 && sim.bites < sim.maxBites * 0.25 && tick % 120 === 0 && sim.enemies.length) game.haptic("warn");
        }
        if (sim.levelIndex >= 2 && !G.save.seen.slipper && sim.wave >= 1 && sim.enemies.length > 3 && overT < 0) { G.save.seen.slipper = 1; G.commit(); speak("Drag my slipper onto the worst of them. It'll come back.", 4.4, true); }

        // Tutorial on the first lawn
        if (sim.levelIndex === 0 && !endless && overT < 0) {
            if (tutorial === 0 && !sim.towers.length && time > 0.6) { tutorial = 1; speak("Drag a gnome onto the lawn, dear. Those slugs are after my marrow.", 6, true); }
            if (tutorial === 1 && sim.towers.length) tutorial = 2;
            if (tutorial === 2 && sim.wave >= 2 && sim.pennies >= 60 && !G.save.seen.upgrade) { tutorial = 3; speak("Tap your gnome. He can be improved. Pick a path!", 4.5, true); }
        }
        if (sim.levelIndex === 1 && !endless && tutorial === 0 && time > 0.8 && !G.save.seen.mazeTip) { tutorial = 1; G.save.seen.mazeTip = 1; G.commit(); speak("Plant in their way. They walk round, and a long walk is a long time being bonked.", 5.5, true); }

        tickFx(dt);
        tickAmbient(dt);
        tickBanner(dt);
    });

    let starShown = 0, hadPests = false;
    function starBeats(a, b) {
        const stars = sim.stars ?? 0;
        for (let i = 0; i < stars; i++) { const t = 0.55 + i * 0.32; if (a < t && b >= t) { sfx("star"); starShown = i + 1; const x = L.w / 2 + (i - 1) * 64, y = L.h / 2 - 66; sparkle(x, y, 12, 90); } }
    }

    function tickBanner(dt) { if (banner) { banner.t += dt; if (banner.t > banner.life) banner = null; } }
    function tickFx(dt) {
        let n = 0;
        for (let i = 0; i < fx.length; i++) {
            const p = fx[i];
            p.t += dt;
            if (p.t >= p.life) { if (p.done) p.done(); continue; }
            if (p.home) {
                const k = p.t / p.life;
                if (k > 0.35) { const tx = L.pennyX ?? 100, ty = L.pennyY ?? 20, q = (k - 0.35) / 0.65; p.x += (tx - p.x) * q * 0.28; p.y += (ty - p.y) * q * 0.28; }
                else { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; }
            } else if (p.tx !== undefined) {
                const k = p.t / p.life; p.x0 ??= p.x; p.y0 ??= p.y; p.x = lerp(p.x0, p.tx, k); p.y = lerp(p.y0, p.ty, k) - Math.sin(k * Math.PI) * (p.arc ?? 0);
            } else {
                p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
                if (p.drag) { const f = Math.max(0, 1 - p.drag * dt); p.vx *= f; p.vy *= f; }
            }
            p.rot += p.vr * dt;
            fx[n++] = p;
        }
        fx.length = n;
        n = 0;
        for (let i = 0; i < groundFx.length; i++) { const g = groundFx[i]; g.t += dt; if (g.t < g.life) groundFx[n++] = g; }
        groundFx.length = n;
        n = 0;
        for (let i = 0; i < floats.length; i++) { const f = floats[i]; f.t += dt; if (f.t < 1.5) floats[n++] = f; }
        floats.length = n;
    }

    // ---- Ambient life --------------------------------------------------------------------------------------------------
    function seedAmbient() {
        const winter = seasonName === "winter";
        if (!winter) for (let i = 0; i < 4; i++) ambient.push({ kind: "butterfly", x: R(1, 8), y: R(1, 11), tx: R(1, 8), ty: R(1, 11), t: R(0, 6), rest: 0, c: i % 3 });
        ambient.push({ kind: "bee", x: R(1, 8), y: R(1, 11), a: R(0, 6), t: 0 });
        ambient.push({ kind: "bee", x: R(1, 8), y: R(1, 11), a: R(0, 6), t: 0 });
        const wallSpots = decor.filter((q) => q.name === "wall" || q.name === "gate" || q.name === "rock");
        for (let i = 0; i < 2 && wallSpots.length; i++) { const q = wallSpots[(R(0, 1) * wallSpots.length) | 0]; ambient.push({ kind: "robin", x: q.x, y: q.y - 0.3, hop: 0, t: R(1, 4), flip: i % 2 === 0, look: 0 }); }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (sim.def.map[r][c] === "~" && (c + r * 3) % 7 === 0 && !winter) ambient.push({ kind: "frog", x: c + 0.5, y: r + 0.5, t: R(0, 6) });
    }
    function tickAmbient(dt) {
        const C = L.C;
        for (const a of ambient) {
            if (a.kind === "butterfly") {
                a.t += dt;
                if (a.rest > 0) { a.rest -= dt; if (a.rest <= 0) { const flowers = decor.filter((q) => q.flower); const q = flowers.length && R(0, 1) < 0.7 ? flowers[(R(0, 1) * flowers.length) | 0] : null; a.tx = q ? q.x : R(0.5, 8.5); a.ty = q ? q.y - 0.35 : R(0.5, 11.5); } continue; }
                const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
                if (d < 0.1) { a.rest = R(1.5, 5); continue; }
                a.x += (dx / d * 0.7 + Math.sin(a.t * 3.3) * 0.5) * dt; a.y += (dy / d * 0.7 + Math.cos(a.t * 4.1) * 0.5) * dt;
            } else if (a.kind === "bee") {
                a.t += dt; a.a += dt * R(0.5, 2.4);
                a.x = clamp(a.x + Math.cos(a.a) * 0.9 * dt, 0.3, COLS - 0.3); a.y = clamp(a.y + Math.sin(a.a * 1.3) * 0.9 * dt, 0.3, ROWS - 0.3);
            } else if (a.kind === "robin") {
                a.t -= dt; if (a.hop > 0) a.hop -= dt;
                if (a.t <= 0) { a.t = R(1.2, 5); if (R(0, 1) < 0.5) a.flip = !a.flip; else a.hop = 0.3; }
            } else if (a.kind === "frog") { a.t += dt; }
        }
        // Falling things for the season
        const w = sim.weather;
        const rate = seasonName === "winter" ? (w.on ? 5 : 1.2) : seasonName === "autumn" ? (w.on ? 2.5 : 0.5) : seasonName === "spring" ? 0.35 : 0.12;
        if (tick % 6 === 0 && game.fxRng.next() < rate * 0.1 * 6 / 2) {
            const wind = w.kind === "gale" && w.on ? w.dir * 150 : 12;
            if (seasonName === "winter") puff("leaf", 5, R(-20, L.w + 20), -8, { vx: R(-12, 12) + (w.on ? 60 : 0), vy: R(36, 80) * (w.on ? 2 : 1), life: 9, s0: R(3, 7), a: 0.9 });
            else if (seasonName === "autumn") puff("leaf", (R(0, 4) | 0), R(-20, L.w + 20), -8, { vx: wind + R(-16, 16), vy: R(36, 70), life: 7, s0: R(8, 13), rot: R(0, 6), vr: R(-3, 3) });
            else if (seasonName === "spring") puff("leaf", 4, R(-20, L.w), -8, { vx: R(8, 24), vy: R(26, 46), life: 8, s0: R(6, 9), rot: R(0, 6), vr: R(-2, 2), a: 0.9 });
            else puff("glow", 0, R(0, L.w), R(L.gy, L.gy + L.gh), { vx: R(-8, 8), vy: R(-12, -4), life: 3, s0: 5, s1: 3, a: 0.5 });
        }
        if (w.on && w.kind === "rain" && tick % 2 === 0) {
            for (let i = 0; i < 3; i++) { const x = R(0, L.w), y = R(L.gy - 20, L.gy + L.gh); puff("drop", 0, x, y - 90, { vx: -16, vy: 420, life: 0.22, s0: 3.5, a: 0.55 }); }
            if (tick % 8 === 0) ring(R(L.gx, L.gx + L.gw), R(L.gy, L.gy + L.gh), C * 0.3, "#d6f0fb");
        }
        // Water from sprinklers, steam from heaps, wobble on the chimney
        if (tick % 9 === 0) for (const t of sim.towers) {
            if (t.stun > 0) { continue; }
            const x = vx(t.x, t.y), y = vy(t.x, t.y);
            if (t.s.kind === "water") { for (let i = 0; i < 2; i++) { const a = R(0, TAU), v = (t.s.range + t.mRange) * C * 0.9; puff("drop", 0, x, y - C * 0.45, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 80, g: 300, life: 0.75, s0: 4.5, s1: 2.5, a: 0.8 }); } }
            else if (t.s.kind === "aura" && tick % 36 === 0) puff("puff", 1, x + R(-8, 8), y - C * 0.4, { vy: -18, vx: R(-5, 5), life: 1.2, s0: 4, s1: 16, a: 0.28 });
            else if (t.sleeping && tick % 54 === 0) puff("zzz", 0, x + 6, y - C * 0.6, { vy: -16, vx: 8, life: 1.3, s0: 8, s1: 14, a: 0.9 });
            else if (t.s.kind === "chomp" && t.cd > 1 && tick % 72 === 0) puff("zzz", 0, x + 8, y - C * 0.7, { vy: -14, vx: 6, life: 1.1, s0: 7, s1: 11, a: 0.8 });
        }
        smokeT -= dt;
        if (smokeT <= 0) { smokeT = 0.55; const sx = L.cotX + 640 * L.cotS, sy = L.cotY + 26 * L.cotS; if (sy > -10 && sx < L.w + 10) puff("puff", 1, sx, sy, { vy: -16, vx: 8 + (w.kind === "gale" && w.on ? 50 : 0), life: 2.2, s0: 5, s1: 22, a: 0.32 }); }
        cloudX += dt * 9;
    }

    // ---- World drawing ---------------------------------------------------------------------------------------------------
    const TOP = { flipX: false, color: undefined, opacity: 1, rot: 0 };
    const A = game;
    function drawWorld(d) {
        const C = L.C, al = A.alpha ?? 1, t = time, sm = sim;
        const w = L.gw + C * 2, h = L.gh + C * 2;
        d.sprite("garden", { x: L.gx + L.gw / 2, y: L.gy + L.gh / 2, width: w, height: h });
        // The cottage stands at the top of the lawn, with Gran at her window.
        if (L.portrait) {
            d.rect(L.w + 4, L.gy + 4, { x: L.w / 2, y: L.gy / 2, color: SEASONS[sm.season].sky[0] });
            for (let x = L.cotX; x < L.w; x += 716 * L.cotS) d.sprite("cottage", { x: x + 360 * L.cotS, y: L.cotY + 150 * L.cotS, width: 720 * L.cotS, height: 300 * L.cotS });
            drawGranInWindow(d);
        }
        // Wide screens: the hedge carries on past the edge of the garden.
        if (L.gx > C) for (const side of [0, 1]) for (let y = L.gy - C; y < L.gy + L.gh + C; y += C * 0.8) for (let k = 1; k * C * 0.8 < L.gx + C; k++) spr(d, "hedge", (k + (y | 0)) % 5 === 0 ? 1 : 0, side ? L.gx + L.gw + C * 0.6 + k * C * 0.8 : L.gx - C * 0.6 - k * C * 0.8, y, C * 1.3);

        // Wet, ice, slime, leaves
        const winter = sm.season === "winter";
        for (let i = 0; i < COLS * ROWS; i++) {
            const wet = sm.wet[i], slime = sm.slime[i], leaf = sm.leaf[i];
            if (!wet && !slime && !leaf && sm.tile[i] !== RICH) continue;
            const c = i % COLS, r = (i - c) / COLS, x = vx(c + 0.5, r + 0.5), y = vy(c + 0.5, r + 0.5);
            if (wet > 0 && sm.tile[i] !== POND && sm.tile[i] !== BLOCK) {
                const rainOnly = sm.wetSlip[i] >= 0.8;
                if (!rainOnly || (c * 3 + r * 5) % 4 === 0) spr(d, winter ? "icepatch" : "puddle", 0, x, y, C * (rainOnly ? 0.9 : 1.25), C * (rainOnly ? 0.75 : 1.15), { opacity: Math.min(1, wet * 1.4) * (rainOnly ? 0.6 : 0.85) });
            }
            if (slime > 0) spr(d, "slime", 0, x, y, C * 1.15, C * 1.05, { opacity: Math.min(1, slime) });
            if (leaf) spr(d, "leafpile", 0, x, y, C * 1.05);
            if (sm.tile[i] === RICH && !sm.tower[i]) { const k = (Math.sin(t * 3 + i) + 1) / 2; spr(d, "spark", 1, x + Math.sin(i * 3.1) * C * 0.2, y - C * 0.1 + Math.cos(i) * C * 0.1, 6 + k * 7, 6 + k * 7, { opacity: 0.8 }); }
        }

        drawRoutes(d, sm.routes, route ? 0.25 : 0.55, "#f2f4e0");
        if (route) drawRoutes(d, route, 0.95, drag?.afford === false ? "#f2b0a0" : "#ffe08a");

        for (const g of groundFx) {
            const k = g.t / g.life;
            d.circle(g.r * (0.3 + k * 0.8), { x: g.x, y: g.y, color: g.c, opacity: (1 - k) * 0.4, outline: 2.5 });
        }
        drawGateHints(d);
        drawSelectionUnder(d);

        // Everything that stands up, sorted by how far down the screen it stands
        order.length = 0;
        for (let i = 0; i < decor.length; i++) { const q = decor[i]; q._y = vy(q.x, q.y); order.push(q); }
        const towers = sm.towers;
        for (let i = 0; i < towers.length; i++) { const q = towers[i]; q.k = "t"; q._y = vy(q.x, q.y); order.push(q); }
        const ens = sm.enemies;
        for (let i = 0; i < ens.length; i++) {
            const e = ens[i]; const lx = lerp(e.px, e.x, al), ly = lerp(e.py, e.y, al);
            e.k = "e"; e._x = vx(lx, ly); e._y = vy(lx, ly); order.push(e);
        }
        order.sort((a, b) => a._y - b._y);
        for (let i = 0; i < order.length; i++) {
            const q = order[i];
            if (q.k === "e") drawPest(d, q, t);
            else if (q.k === "t") drawTower(d, q, t);
            else if (q.k === "d") drawDecor(d, q, t);
            else drawMarrow(d);
        }

        // Flying life, bees, shots
        for (const a of ambient) drawAmbient(d, a, t);
        const beeFrame = (tick >> 1) & 1;
        for (const b of sm.bees) {
            const x = vx(lerp(b.px, b.x, al), lerp(b.py, b.y, al)), y = vy(lerp(b.px, b.y, al), lerp(b.py, b.y, al));
            spr(d, "bee", beeFrame, x, y - C * 0.15, C * 0.34);
        }
        for (const p of sm.shots) drawShot(d, p, al);

        // Light: lanterns, beams, burning things
        const lights = sm.towers.filter((q) => q.s.kind === "light" || (q.s.kind === "aura" && q.branch === "a"));
        d.additive(() => {
            for (const q of lights) {
                const x = vx(q.x, q.y), y = vy(q.x, q.y);
                if (q.s.kind === "aura") { spr(d, "glow", 0, x, y - C * 0.2, C * 1.8, C * 1.8, { color: "#ff8a3a", opacity: 0.1 + 0.05 * Math.sin(t * 3) }); continue; }
                if (!q.s.beam) spr(d, "glow", 0, x + C * 0.15, y - C * 0.2, C * 2.4, C * 2.4, { color: "#ffd86b", opacity: 0.26 + 0.05 * Math.sin(t * 4 + q.id) });
                const e = q.target;
                if (q.s.beam && e && !e.dead) {
                    const ex = e._x ?? vx(e.x, e.y), ey = (e._y ?? vy(e.x, e.y)) - C * 0.2, wd = 2 + q.heat * 5;
                    d.line([x + C * 0.13, y - C * 0.1], [ex, ey], { width: wd * 2.2, color: "#ff9a2a", opacity: 0.3 });
                    d.line([x + C * 0.13, y - C * 0.1], [ex, ey], { width: wd, color: "#fff0a8", opacity: 0.9 });
                    spr(d, "glow", 0, ex, ey, C * (0.5 + q.heat * 0.7), C * (0.5 + q.heat * 0.7), { color: "#ffb04a", opacity: 0.7 });
                }
            }
        });

        // Particles
        for (let i = 0; i < fx.length; i++) {
            const p = fx[i], k = p.t / p.life, size = lerp(p.s0, p.s1, k);
            const o = TOP; o.opacity = p.a * (k > 0.7 ? (1 - k) / 0.3 : 1); o.rot = p.rot; o.color = undefined; o.flipX = false;
            spr(d, p.name, p.frame, p.x, p.y, size, size, o);
        }
        o_reset();

        // Weather light. A big soft tint keeps the mood obvious at a glance.
        const wx = sm.weather;
        if (wx.on) {
            const tint = wx.kind === "rain" ? ["#5b7fa0", 0.14] : wx.kind === "scorcher" ? ["#ff9a3a", 0.11] : wx.kind === "gale" ? ["#8a6a48", 0.08] : ["#dcebf2", 0.3];
            d.rect(L.gw, L.gh, { x: L.gx + L.gw / 2, y: L.gy + L.gh / 2, color: tint[0], opacity: tint[1] });
        }
        // Drifting cloud shadow over the lawn
        for (let i = 0; i < 2; i++) { const x = ((cloudX * (1 + i * 0.4) + i * 240) % (L.w + 300)) - 150, y = L.gy + L.gh * (0.3 + i * 0.4); spr(d, "glow", 0, x, y, 300, 190, { color: "#23304a", opacity: 0.13 }); }
        if (sm.bossAlive) lastBoss = sm.bossAlive;
    }
    const o_reset = () => { TOP.rot = 0; TOP.opacity = 1; TOP.color = undefined; TOP.flipX = false; };

    function drawRoutes(d, routes, alpha, c) {
        const spacing = 0.36, flow = (time * 0.75) % spacing;
        for (const path of routes) {
            let walked = spacing - flow, segStart = 0;
            for (let i = 0; i + 1 < path.length; i++) {
                const a = path[i], b = path[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
                while (walked < segStart + len) {
                    const k = (walked - segStart) / len, x = lerp(a[0], b[0], k), y = lerp(a[1], b[1], k);
                    d.circle(L.C * 0.05, { x: vx(x, y), y: vy(x, y), color: c, opacity: alpha });
                    walked += spacing;
                }
                segStart += len;
            }
        }
    }

    function drawGateHints(d) {
        if (sim.wave >= sim.total) return;
        const C = L.C, pulse = 0.5 + 0.5 * Math.sin(time * 5), soon = sim.countdown < 6 || sim.hold;
        if (!soon) return;
        const groups = sim.groupsFor(sim.wave); if (!groups) return;
        const gates = new Set(groups.map((g) => g.gate % sim.gates.length));
        for (const gi of gates) { const g = sim.gates[gi]; d.circle(C * (0.42 + pulse * 0.08), { x: vx(g.x, g.y), y: vy(g.x, g.y), color: "#ffe08a", opacity: 0.5 + pulse * 0.35, outline: 3 }); }
    }

    function drawSelectionUnder(d) {
        const C = L.C;
        const showRange = (x, y, key, range, kindColor, cx, cy) => {
            d.circle(range * C, { x, y, color: kindColor, opacity: 0.18 });
            d.circle(range * C, { x, y, color: kindColor, opacity: 0.75, outline: 2 });
        };
        if (sel) {
            const x = vx(sel.x, sel.y), y = vy(sel.x, sel.y), r = (sel.s.range ?? 0) + sel.mRange;
            if (r) showRange(x, y, sel.key, r, "#fff4cf");
            d.rect(C, C, { x, y, color: "#fff4cf", opacity: 0.9, radius: 6, outline: 2 });
            drawLinks(d, sel.key, sel.c, sel.r, sel);
        }
        const key = drag?.moved ? drag.key : armed;
        if (key && key !== "slipper") {
            const c = drag ? drag.c : hover.c, r = drag ? drag.r : hover.r;
            if (c >= 0 && r >= 0 && c < COLS && r < ROWS) {
                const why = sim.whyNot(key, c, r), afford = sim.pennies >= sim.costOf(key), ok = !why && afford;
                const x = vx(c + 0.5, r + 0.5), y = vy(c + 0.5, r + 0.5), def = DEFS[key];
                const col = ok ? "#fff4cf" : "#e8584a";
                if (def.range) showRange(x, y, key, def.range, col);
                d.rect(C - 2, C - 2, { x, y, color: col, opacity: 0.35, radius: 6 });
                d.rect(C - 2, C - 2, { x, y, color: col, opacity: 1, radius: 6, outline: 2.5 });
                if (ok) drawLinks(d, key, c, r);
                if (why === "sealed") { spr(d, "i_lock", 0, x, y, C * 0.6); }
                if (ok && route && !DEFS[key].walk) {
                    const longer = route.reduce((n, p) => Math.max(n, p.length), 0) - sim.routeLen;
                    if (longer > 0) { txtGhost = { str: `+${longer} steps`, x, y: y + C * 0.72 }; }
                }
            }
        } else if (key === "slipper" && drag?.moved) {
            d.circle(C * (meta.toecap ? 1.7 : 1.3), { x: drag.gx, y: drag.gy, color: "#ffe08a", opacity: 0.2 });
            d.circle(C * (meta.toecap ? 1.7 : 1.3), { x: drag.gx, y: drag.gy, color: "#ffe08a", opacity: 0.9, outline: 2.5 });
        }
    }
    let txtGhost = null;

    /** Light up the defenders that would help each other, so synergies are seen, not read. */
    function drawLinks(d, key, c, r, self) {
        const def = DEFS[key], C = L.C, s2 = self?.s ?? def;
        const lit = (t, color) => { d.circle(C * 0.46, { x: vx(t.x, t.y), y: vy(t.x, t.y), color, opacity: 0.8 + 0.2 * Math.sin(time * 6), outline: 2.5 }); };
        const adj = (t, reach) => t !== self && Math.max(Math.abs(t.c - c), Math.abs(t.r - r)) <= reach - 0.5 + 1e-6;
        for (const t of sim.towers) {
            if (def.kind === "aura" && adj(t, s2.range)) lit(t, "#ffb04a");
            else if (t.s.kind === "aura" && adj({ c: t.c, r: t.r }, t.s.range)) lit(t, "#ffb04a");
            else if (s2.reach && adj(t, 1.5)) lit(t, "#9fd36a");
            else if (def.kind === "water" && t.s.plant && Math.hypot(t.x - c - 0.5, t.y - r - 0.5) <= s2.range) lit(t, "#7fc4e8");
            else if (t.s.kind === "water" && def.plant && Math.hypot(t.x - c - 0.5, t.y - r - 0.5) <= t.s.range) lit(t, "#7fc4e8");
        }
    }

    function drawDecor(d, q, t) {
        const C = L.C, x = vx(q.x, q.y), y = vy(q.x, q.y) + (q.dy ?? 0) * C, w = q.w * C, h = q.h * C;
        if (q.sway) {
            const a = Math.sin(t * 1.4 + q.phase) * q.sway * (sim.weather.kind === "gale" && sim.weather.on ? 3.2 : 1);
            d.push(); d.translate(x, y + h * 0.48); d.rotate(a);
            spr(d, q.name, q.frame, 0, -h * 0.48, w, h);
            d.pop();
        } else spr(d, q.name, q.frame, x, y, w, h);
        if (q.snow) spr(d, "snowcap", 0, x, y - h * 0.12, w, h * 0.9);
    }

    function drawMarrow(d) {
        const C = L.C, x = vx(marrowItem.x, marrowItem.y), y = vy(marrowItem.x, marrowItem.y);
        const f = sim.bites / sim.maxBites, frame = f > 0.8 ? 0 : f > 0.6 ? 1 : f > 0.4 ? 2 : f > 0.2 ? 3 : 4;
        const wob = shakeMarrow > 0 ? Math.sin(time * 60) * 3 * (shakeMarrow / 0.35) : 0;
        const breathe = 1 + Math.sin(time * 1.6) * 0.012 + (marrowHit > 0 ? marrowHit * 0.3 : 0);
        spr(d, "marrow", frame, x + wob, y - C * 0.12, C * 1.7 * breathe, C * 1.7 / breathe);
    }

    function drawTower(d, q, t) {
        const C = L.C, x = vx(q.x, q.y), y = vy(q.x, q.y) - C * 0.12;
        const look = lookOf(q);
        let sx = 1, sy = 1;
        const age = q.born !== undefined ? t - q.born : 9;
        if (age < 0.4) { const k = age / 0.4, o = 1 + Math.sin(k * Math.PI * 2.2) * (1 - k) * 0.5; sx = o * (0.5 + k * 0.5); sy = (2 - o) * (0.5 + k * 0.5); }
        else if (q.attackT > 0) { const k = q.attackT / 0.25; sx = 1 + k * 0.1; sy = 1 - k * 0.12; }
        else { const b = Math.sin(t * 1.8 + q.id) * 0.014; sx = 1 + b; sy = 1 - b; }
        const size = C * 1.28, h = size * sy, w = size * sx, base = y + size / 2 - h / 2;
        const o = TOP; o.rot = 0; o.opacity = 1; o.flipX = false;
        o.color = q.stun > 0 ? "#b7c8e8" : !q.warm ? "#c8dcec" : q.sleeping ? "#b0b8c8" : undefined;
        let frameName = q.key, f = look;
        if (q.key === "flytrap") f = look + (q.cd > 0.25 ? 5 : 0);
        if (q.key === "scarecrow" && q.down) f = 5;
        spr(d, frameName, f, x, base, w, h, o);
        if (q.key === "chime") {
            const swing = q.ring !== undefined ? Math.sin((t - q.ring) * 9) * Math.max(0, 0.5 - (t - q.ring) * 0.3) : 0, idle = Math.sin(t * 1.3 + q.id) * 0.06;
            d.push(); d.translate(x + size * 0.32, base - h * 0.34); d.rotate(swing + idle);
            spr(d, "chimeBells", look, 0, size * 0.32 - size * 0.14, size * 0.7, size * 0.7);
            d.pop();
        }
        o.color = undefined;
        if (q.s.kind === "taunt" && !q.down && q.hp < q.s.hp) bar(d, x, base - size * 0.5, C * 0.8, q.hp / q.s.hp, "#d9b44a");
        if (q.s.kind === "wine") bar(d, x, y + C * 0.42, C * 0.7, q.sips / q.s.sips, "#8a4a98");
        if (q.s.kind === "chomp" && q.cd > 0.25) bar(d, x, base - size * 0.5, C * 0.6, 1 - q.cd / q.s.rate, "#8bb33f");
        if (q.s.kind === "aura" && q.stacks) bar(d, x, y + C * 0.44, C * 0.7, q.stacks / 10, "#e08a3a");
        if (q.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * 2.1; spr(d, "star", 0, x + Math.cos(a) * C * 0.32, base - size * 0.42 + Math.sin(a) * C * 0.1, C * 0.2); }
    }

    function bar(d, x, y, w, f, c) {
        d.rect(w + 3, 5.5, { x, y, color: "#38261ce0", radius: 3 });
        d.rect(Math.max(0.5, (w - 1) * clamp(f, 0, 1)), 3, { x: x - (w - 1) * (1 - clamp(f, 0, 1)) / 2, y, color: c, radius: 1.5 });
    }

    function drawPest(d, e, t) {
        const C = L.C, x = e._x, y = e._y, T = e.t, size = T.boss ? C * T.size * 1.1 : C * e.size * 1.5;
        const dirX = L.portrait ? e.hx : -e.hy, dirY = L.portrait ? e.hy : e.hx;
        const flip = dirX < -0.05 ? true : dirX > 0.05 ? false : (e._flip ?? false);
        e._flip = flip;
        const moving = e.stunT <= 0 && e.sleepT <= 0;
        const wig = moving ? Math.sin(t * 7 * e.t.speed * 1.6 + e.phase) : 0;
        const lift = e.fly ? C * (0.42 + Math.sin(t * 4 + e.phase) * 0.06) : 0;
        const animF = moving ? ((t * 7 + e.phase) & 1) : 0;
        const o = TOP; o.flipX = flip; o.rot = 0; o.opacity = 1;
        o.color = e.hitT > 0 ? "#ff9a80" : e.burn > 0 ? "#ffb890" : e.slowT > 0 && e.slowF < 0.8 ? "#bcd6f0" : undefined;
        let frame = animF, name = T.sprite;
        if (e.fly) { d.circle(size * 0.22, { x, y: y + 2, color: "#2a1c14", opacity: 0.2 }); frame = (tick >> 1) & 1; }
        if (T.burrow) { frame = e.burrowed ? 2 : animF; }
        if (T.armor && T.sprite === "snail") frame = e.wet > 0 ? 2 : animF;
        if (T.roller) frame = e.rollT > 0 ? 2 : animF;
        if (T.shield) frame = e.blockT > 0 ? 2 : animF;
        if (e.blockT > 0) e.blockT -= 1 / 60;
        if (T.shellup) frame = e.shellT > 0 ? 2 : animF;
        if (T.egg) frame = e.eggT < 1 ? 1 : 0;
        if (T.stealth && e.revealT <= 0) { o.opacity = 0.2 + 0.08 * Math.sin(t * 5 + e.phase); o.color = "#cfe6c0"; }
        if (T.burrow && e.burrowed) o.opacity = 0.9;
        const stretch = 1 + wig * 0.07;
        const hx = size * stretch, hy = size / stretch;
        let rot = 0;
        if (e.tipsyT > 0) rot = Math.sin(t * 6 + e.phase) * 0.3;
        if (e.rollT > 0) rot = t * 14 * (flip ? -1 : 1);
        if (e.sleepT > 0 || e.stunT > 0) rot = flip ? 0.25 : -0.25;
        if (rot) o.rot = rot;
        spr(d, name, frame, x, y - lift - hy * 0.2, hx, hy, o);
        if (rot) o.rot = 0;
        o.flipX = false; o.opacity = 1; o.color = undefined;

        if (e.burn > 0 && e.size > 0.3) spr(d, "flame", (tick >> 2) & 1, x, y - size * 0.4, size * 0.6);
        if (e.stunT > 0 && !T.boss) spr(d, "star", 0, x + Math.cos(t * 8) * size * 0.25, y - size * 0.55, C * 0.16);
        if (e.sleepT > 0) spr(d, "zzz", 0, x + size * 0.2, y - size * 0.6, C * 0.22);
        if (e.tipsyT > 0) spr(d, "spark", 1, x + Math.cos(t * 5 + e.phase) * size * 0.3, y - size * 0.55, C * 0.14);
        if (e.fearT > 0) spr(d, "note", 0, x, y - size * 0.6, C * 0.16);
        if (e.markT > 0) d.circle(size * 0.42, { x, y: y - lift - size * 0.2, color: "#ffe08a", opacity: 0.6, outline: 1.6 });
        if (T.boss) bar(d, x, y - size * 0.62, size * 0.9, e.hp / e.maxHp, "#c8553d");
        if (e.hitT > 0) e.barT = t + 1.2;
        if (T.boss) { /* drawn above */ }
        else if (e.barT > t && e.maxHp > 12 && !(T.stealth && e.revealT <= 0) && !e.burrowed) bar(d, x, y - lift - size * 0.6, Math.max(C * 0.45, size * 0.6), e.hp / e.maxHp, "#8fbf5a");
    }

    function drawShot(d, p, al) {
        const C = L.C;
        const lx = lerp(p.px, p.x, al), ly = lerp(p.py, p.y, al), x = vx(lx, ly), y = vy(lx, ly);
        if (p.kind === "gnome") {
            const k = Math.min(1, p.a), z = Math.sin(k * Math.PI) * C * 1.2, f = p.big === 3 ? 2 : p.big === 2 ? 1 : 0, size = C * (0.42 + f * 0.1);
            d.circle(size * 0.3, { x, y: y + 2, color: "#2a1c14", opacity: 0.25 });
            const o = TOP; o.rot = k * 9; spr(d, "gnomeball", f, x, y - z, size, size, o); o.rot = 0;
        } else if (p.kind === "pebble") spr(d, "pebble", 0, x, y - C * 0.2, C * 0.16);
        else if (p.kind === "seed") spr(d, "seed", 0, x, y - C * 0.2, C * 0.26);
    }

    function drawAmbient(d, a, t) {
        const C = L.C, x = vx(a.x, a.y), y = vy(a.x, a.y);
        if (a.kind === "butterfly") {
            const flap = a.rest > 0 ? (Math.sin(t * 2 + a.c) > 0.6 ? 1 : 0) : ((t * 11) & 1);
            spr(d, "butterfly", a.c * 2 + flap, x, y, C * 0.4);
        } else if (a.kind === "bee") spr(d, "bee", (tick >> 1) & 1, x, y, C * 0.22);
        else if (a.kind === "robin") { const o = TOP; o.flipX = a.flip; spr(d, "robin", a.hop > 0 ? 1 : 0, x, y - (a.hop > 0 ? Math.sin(a.hop / 0.3 * Math.PI) * 10 : 0), C * 0.5, C * 0.5, o); o.flipX = false; }
        else if (a.kind === "frog") spr(d, "frog", Math.sin(a.t * 2.3) > 0.8 ? 1 : 0, x, y, C * 0.42);
    }

    function drawGranInWindow(d) {
        const scale = L.cotS, x = L.winX, y = L.winY, sz = 150 * scale;
        let frame = GRAN[granMood] ?? 0;
        if (granMood === "knit") frame = ((knit * 2.6) | 0) % 2;
        const bob = granMood === "cheer" ? Math.abs(Math.sin(time * 8)) * 4 * scale : Math.sin(time * 1.6) * 1.2 * scale;
        spr(d, "gran", frame, x, y + 8 * scale - bob, sz, sz);
        // Sill, flower box and Gerald sit in front of her.
        const sw = (WINDOW.w + 36) * scale, sy = y + (WINDOW.h / 2) * scale + 2 * scale;
        d.rect(sw, 15 * scale, { x, y: sy, color: "#6d4c33", radius: 3 * scale });
        d.rect(sw, 3 * scale, { x, y: sy - 6 * scale, color: "#a57a4d", radius: 2 });
        spr(d, "cat", geraldT > 0 ? 2 : Math.sin(time * 0.31) > 0.75 ? 1 : 0, x + 50 * scale, sy - 22 * scale, 60 * scale);
        for (let i = 0; i < 3; i++) spr(d, "flower", [0, 3, 5, 8][i], x - 52 * scale + i * 22 * scale, sy - 20 * scale, 42 * scale);
    }

    // ---- HUD ---------------------------------------------------------------------------------------------------------------
    function drawHud(d) {
        const S = L.safe, y0 = L.ty;
        // The potting bench
        const bx = L.portrait ? L.w / 2 : L.tx + (L.w - L.tx) / 2, bw = L.portrait ? L.w + 4 : L.w - L.tx + 6, btop = L.portrait ? L.ty - 3 : 0, bh = L.h - btop + 2;
        d.rect(bw, bh, { x: bx, y: btop + bh / 2, color: "#6d4a30" });
        const tile = 96;
        for (let i = 0; i < Math.ceil(bh / tile) + 1; i++) for (let j = 0; j < Math.ceil(bw / tile) + 1; j++) spr(d, "plank", (i + j) % 2, bx - bw / 2 + tile * (j + 0.5), btop + tile * (i + 0.5), tile + 1);
        d.rect(bw, 3, { x: bx, y: btop + 1.5, color: INK });
        if (!L.portrait) { d.rect(bw, L.bandH + 4, { x: bx, y: L.bandH / 2, color: SEASONS[sim.season].sky[0] }); d.sprite("cottage", { x: L.cotX + 360 * L.cotS, y: L.cotY + 150 * L.cotS, width: 720 * L.cotS, height: 300 * L.cotS }); drawGranInWindow(d); }
        // Status tags
        const tx = L.portrait ? Math.max(L.winX + 84 * L.cotS, 76) : L.bandX + 92, top = L.portrait ? L.tagY : S.top + 2;
        const twid = L.portrait ? Math.min((L.w - S.right - 52 - tx) / 2 - 3, 110) : L.w - S.right - 4 - tx;
        const shake = penniesShake > 0 ? Math.sin(time * 50) * 2.5 : 0;
        tag(d, tx + twid / 2 + shake, top + 14, twid, 27, "#f6ecd2");
        spr(d, "coin", 0, tx + 13 + shake, top + 14, 20);
        L.pennyX = tx + 13; L.pennyY = top + 14;
        txt(d, `${Math.floor(shownPennies + 0.5)}p`, tx + twid / 2 + 10 + shake, top + 14, 15, INK, true);
        const by = L.portrait ? top : top + 30, bitX = L.portrait ? tx + twid + 6 : tx;
        tag(d, bitX + twid / 2, by + 14, twid, 27, marrowHit > 0 ? "#f7c0b0" : "#f6ecd2");
        spr(d, "i_bite", 0, bitX + 14, by + 14, 21);
        txt(d, `${Math.ceil(sim.bites)}/${sim.maxBites}`, bitX + twid / 2 + 11, by + 14, 14, sim.bites < sim.maxBites * 0.3 ? "#b5392c" : INK, true);
        const wy = L.portrait ? top + 30 : top + 59;
        const ww = L.portrait ? twid * 2 + 6 : twid;
        tag(d, tx + ww / 2, wy + 12, ww, 23, "#e8dcbc");
        const label = sim.total === Infinity ? `Wave ${sim.wave + 1}` : `Wave ${Math.min(sim.wave + (sim.wave < sim.total ? 1 : 0), sim.total)}/${sim.total}`;
        const w = sim.weather, cfg = SEASONS[sim.season];
        if (L.portrait) {
            txt(d, label, tx + 40, wy + 12, 12.5, INK, true, 0, 72);
            spr(d, WEATHER_ICON[w.kind], 0, tx + 92, wy + 12, 18);
            txt(d, sim.wave === 0 ? cfg.weather : w.on ? `${cfg.lead}! ${Math.ceil(w.t)}s` : `${cfg.lead} in ${Math.ceil(w.t)}s`, (tx + 102 + tx + ww) / 2, wy + 12, 11.5, w.on ? "#b5392c" : INK, false, 0, ww - 104);
        } else {
            txt(d, label, tx + ww / 2, wy + 12, 12, INK, true);
        }

        // The tray itself
        if (sel) drawPanel(d);
        else drawTray(d, y0);
    }

    function tag(d, x, y, w, h, fill) { card(d, x, y, w, h, fill, 7); }

    function drawTray(d, y0) {
        const top = y0 + L.barH;
        // Slipper
        const sl = L.slip;
        if (sl) {
            const ready = sim.slipperCd <= 0, f = 1 - Math.max(0, sim.slipperCd) / meta.slipperCd;
            card(d, sl.x, sl.y, sl.w, sl.h, ready ? "#e8c9a0" : "#c9bda6", 8);
            spr(d, "slipper", 0, sl.x, sl.y - (ready ? Math.sin(time * 3) * 1.5 : 0), 32, 32, ready ? undefined : { opacity: 0.45 });
            if (!ready) d.rect((sl.w - 8) * f, 4, { x: sl.x - (sl.w - 8) * (1 - f) / 2, y: sl.y + sl.h / 2 - 6, color: "#b5553c", radius: 2 });
        }
        const n = sim.unlocked.length, ph = L.packH, pw = L.packW;
        for (let i = n; i < L.cols * L.rows; i++) {
            const c = i % L.cols, r = (i / L.cols) | 0, x = L.tx + pw * (c + 0.5), y = top + ph * (r + 0.5);
            spr(d, "packet", 1, x, y, pw - 4, ph - 3, { opacity: 0.6 });
            spr(d, "i_lock", 0, x, y, Math.min(pw, ph) * 0.4, Math.min(pw, ph) * 0.4, { opacity: 0.55 });
        }
        for (let i = 0; i < n; i++) {
            const key = sim.unlocked[i], def = DEFS[key], c = i % L.cols, r = (i / L.cols) | 0;
            const x = L.tx + pw * (c + 0.5), y = top + ph * (r + 0.5), cost = sim.costOf(key), afford = sim.pennies >= cost;
            const lifted = (drag?.key === key && drag?.moved) || armed === key;
            const dy = lifted ? -3 : 0, w = pw - 4, h = ph - 3;
            spr(d, "packet", afford ? 0 : 1, x, y + dy, w, h);
            d.rect(w - 9, 5, { x, y: y + dy - h / 2 + 8, color: def.tint, opacity: afford ? 0.85 : 0.4, radius: 2 });
            const size = Math.min(w * 0.84, h - 16);
            spr(d, key, 0, x, y + dy - 7, size, size, afford ? undefined : { color: "#c8bca8" });
            d.rect(30, 13.5, { x, y: y + dy + h / 2 - 10, color: afford ? "#f6ecd2" : "#d8cdb6", radius: 4 });
            txt(d, `${cost}p`, x, y + dy + h / 2 - 10, 11.5, afford ? INK : "#7a5a4a", true);
            if (armed === key) d.rect(w, h, { x, y: y + dy, color: "#ffe08a", radius: 8, outline: 3 });
            if (i < 9 && !game.input.touchMode) txt(d, String(i + 1), x + w / 2 - 9, y + dy - h / 2 + 15, 10, "#7a5a4a", true);
        }
        if (sim.levelIndex === 0 && !sim.towers.length && overT < 0 && !drag && !armed && time > 0.6) drawGloveHint(d, top);
    }

    function drawGloveHint(d, top) {
        const C = L.C, k = (time * 0.6) % 1, e = clamp(k * 1.5, 0, 1), s0 = e * e * (3 - 2 * e);
        const fromX = L.tx + L.packW * 0.5, fromY = top + L.packH * 0.45;
        const tc = sim.def.map[7] ? [4.5, 7.5] : [4.5, 6.5], toX = vx(tc[0], tc[1]), toY = vy(tc[0], tc[1]);
        const x = lerp(fromX, toX, s0), y = lerp(fromY, toY, s0);
        d.circle(C * 0.5, { x: toX, y: toY, color: "#fff4cf", opacity: 0.55 + Math.sin(time * 6) * 0.3, outline: 3 });
        spr(d, "gnome", 0, x, y - 4, 44, 44, { opacity: k < 0.72 ? 0.85 : 0 });
        spr(d, "hand", 0, x + 12, y + 18, 42, 42, { opacity: k > 0.9 ? (1 - k) * 10 : 1 });
    }

    function drawPanel(d) {
        const t = sel; if (!t) return;
        card(d, L.tx + L.tw / 2, L.ty + L.th / 2, L.tw, L.th, "#e8dcbc", 10);
        const name = t.tier === 1 ? t.def.name : DEFS[t.key][t.branch][t.tier - 2].name;
        if (L.portrait) {
            const cx = L.tx + 46;
            spr(d, t.key, lookOf(t), cx + 20, L.ty + 22, 44);
            txt(d, name, cx, L.ty + 56, 11.5, INK, true, 0, 88);
            txt(d, statLine(t), cx, L.ty + 76, 10.5, "#5a4432", false, 90);
        } else {
            txt(d, name, L.tx + L.tw / 2, L.ty + 12, 12, INK, true, 0, L.tw - 140);
            txt(d, statLine(t), L.tx + L.tw / 2, L.ty + 30, 10.5, "#5a4432", false, L.tw - 140);
        }
        if (t.tier >= 3) txt(d, "Fully grown. Nothing left to teach.", L.portrait ? L.tx + L.tw / 2 + 46 : L.tx + L.tw / 2, L.ty + L.th / 2 + 10, 13, "#5a4432", false, 200);
    }
    function statLine(t) {
        const s2 = t.s, parts = [];
        if (s2.income) parts.push(`${s2.income}p a wave`);
        if (s2.dmg) parts.push(`${Math.round(s2.dmg * t.mDmg)} dmg`);
        if (s2.beam) parts.push(`${s2.beam} heat`);
        if (s2.bees) parts.push(`${s2.bees + meta.bees} bees`);
        if (s2.burn) parts.push(`${s2.burn} burn`);
        if (s2.hp) parts.push(`${Math.ceil(Math.max(0, t.hp))}/${s2.hp} straw`);
        if (s2.sips) parts.push(`${t.sips}/${s2.sips} sips`);
        if (s2.kind === "aura") parts.push(`+${Math.round((s2.buffDmg + t.stacks * 0.02) * 100)}% dmg`);
        if (sim.tile[t.i] === RICH) parts.push("rich soil");
        if (t.watered) parts.push("watered");
        return parts.join(" · ");
    }

    function drawOverlay(d) {
        // Ghost under the finger
        if (drag?.moved) {
            const C = L.C, x = drag.gx, y = drag.gy;
            const snapped = drag.c >= 0;
            const gx = snapped && drag.key !== "slipper" ? vx(drag.c + 0.5, drag.r + 0.5) : x, gy = snapped && drag.key !== "slipper" ? vy(drag.c + 0.5, drag.r + 0.5) - C * 0.12 : y;
            const why = drag.key !== "slipper" && snapped ? sim.whyNot(drag.key, drag.c, drag.r) : "";
            spr(d, drag.key, 0, gx, gy, C * 1.32, C * 1.32, { opacity: 0.92, color: why || !drag.afford ? "#f0a090" : undefined });
        } else if (armed && hover.c >= 0 && !game.input.touchMode && armed !== "slipper") {
            spr(d, armed, 0, vx(hover.c + 0.5, hover.r + 0.5), vy(hover.c + 0.5, hover.r + 0.5) - L.C * 0.12, L.C * 1.32, L.C * 1.32, { opacity: 0.75 });
        }
        if (txtGhost) { card(d, txtGhost.x, txtGhost.y, 62, 18, "#f6ecd2", 6); txt(d, txtGhost.str, txtGhost.x, txtGhost.y, 11, "#3f6b3c", true); txtGhost = null; }

        // Packet info above the tray
        const k = drag?.key ?? armed;
        if ((info || armed) && k && DEFS[k] && !sel && !(drag?.moved && drag.c >= 0)) {
            const def = DEFS[k], w = Math.min(L.tw, 300), x = L.portrait ? L.w / 2 : L.gx + L.gw / 2, y = L.portrait ? L.ty - 34 : L.h - 36 - L.safe.bottom;
            card(d, x, y, w, 56, "#f6ecd2", 8);
            txt(d, `${def.name}  ${sim.costOf(k)}p`, x, y - 16, 13.5, INK, true);
            txt(d, def.blurb, x, y + 9, 11.5, "#5a4432", false, w - 14);
        }

        if (popup || paused || overT >= 0) return;

        // Boss bar
        if (lastBoss && !lastBoss.dead) {
            const b = lastBoss, w = Math.min(L.gw - 20, 300), x = L.gx + L.gw / 2, y = L.gy + 16;
            card(d, x, y, w, 24, "#3a261af0", 6);
            d.rect((w - 8) * clamp(b.hp / b.maxHp, 0, 1), 15, { x: x - (w - 8) * (1 - clamp(b.hp / b.maxHp, 0, 1)) / 2, y, color: "#c8553d", radius: 4 });
            txt(d, b.t.name, x, y, 12.5, "#fff6e0", true);
        }

        // Gran's words
        if (say) {
            const w = Math.min(L.gw - 16, 260), x = L.portrait ? Math.min(L.w - w / 2 - 8, L.winX + 30 + w / 2) : L.gx + L.gw / 2 + 40, y = L.gy + (lastBoss && !lastBoss.dead ? 70 : 42);
            const lines = Math.ceil(say.text.length / (w / 6.6));
            const h = 14 + lines * 15;
            card(d, x, y, w, h, "#fffaf0", 10);
            if (L.portrait) d.poly([[L.winX + 22, L.gy + 18], [L.winX + 44, y - h / 2 + 2], [L.winX + 22, y - h / 2 + 2]], { color: "#fffaf0" });
            txt(d, say.text, x, y, 13, INK, false, w - 16);
        }

        // Banners
        if (banner) {
            const k2 = banner.t / banner.life, inT = clamp(banner.t / 0.25, 0, 1), outT = clamp((banner.life - banner.t) / 0.25, 0, 1), x = L.gx + L.gw / 2 + (1 - inT) * -L.w + (1 - outT) * L.w, y = L.gy + L.gh * 0.34;
            if (banner.boss) {
                card(d, x, y, Math.min(L.gw + 20, 340), 92, "#3a261ae8", 8);
                spr(d, banner.sprite, 0, x - 100, y, 86);
                txt(d, banner.title, x + 42, y - 13, 24, "#ffe08a", true);
                txt(d, banner.sub, x + 42, y + 16, 13.5, "#f6ecd2", false);
            } else {
                const w = Math.min(L.gw, 240);
                card(d, x, y, w, banner.sub ? 62 : 42, "#f6ecd2f0", 8);
                txt(d, banner.title, x, y - (banner.sub ? 11 : 0), 20, INK, true);
                if (banner.sub) txt(d, banner.sub, x, y + 15, 12, "#5a4432", false, w - 14);
            }
            void k2;
        }
        for (const f of floats) { const k = f.t / 1.5; const w = Math.max(70, f.str.length * 7.2); d.rect(w, 19, { x: f.x, y: f.y - k * 24, color: "#f6ecd2", radius: 6, opacity: 1 - k * k }); txt(d, f.str, f.x, f.y - k * 24, 12.5, f.color, true, 0, 0, 1 - k * k); }

    }
    function drawModal(d) {
        if (popup) drawPopup(d);
        if (paused) drawPause(d);
        if (overT >= 0) drawResult(d);
    }

    function drawPopup(d) {
        const list = sim.preview(), w = Math.min(L.gw - 12, 330), rows = Math.max(1, list.length), h = 48 + rows * 44;
        const x = L.gx + L.gw / 2, y = L.gy + Math.min(L.gh, h + 16) / 2 + 4;
        d.rect(L.w * 2, L.h * 2, { x: L.w / 2, y: L.h / 2, color: "#2a1c14", opacity: 0.35 });
        card(d, x, y, w, h, "#f6ecd2", 12);
        txt(d, `Coming in wave ${sim.wave + 1}`, x, y - h / 2 + 20, 16, INK, true);
        list.forEach((it, i) => {
            const p = ALL_PESTS[it.type], yy = y - h / 2 + 46 + i * 44 + 16;
            spr(d, p.sprite, 0, x - w / 2 + 28, yy, 40);
            textL(game, d, `${p.boss ? "" : `${it.count} × `}${p.name}`, x - w / 2 + 54, yy - 10, 13, INK, true);
            textL(game, d, trait(p), x - w / 2 + 54, yy + 8, 11, "#5a4432", false);
        });
    }
    const trait = (p) => (p.boss ? p.title : p.fly ? "Flies over everything" : p.burrow ? "Digs under, pops up" : p.armor ? "Armoured until wet" : p.shield ? "Blocks from the front" : p.stealth ? "Hidden until lit or wet" : p.spawner ? "Lays eggs" : p.roller ? "Rolls away when hit" : p.chills ? "Freezes defenders" : p.speed > 1.4 ? "Very quick" : p.hp < 7 ? "Swarms" : "Ground pest");

    function drawPause(d) {
        d.rect(L.w * 2, L.h * 2, { x: L.w / 2, y: L.h / 2, color: "#2a1c14", opacity: 0.45 });
        const cx = L.w / 2, cy = L.h / 2;
        card(d, cx, cy + 36, 220, 266, "#f6ecd2", 14);
        txt(d, "Tea break", cx, cy - 76, 22, INK, true);
    }

    function drawResult(d) {
        const k = clamp(overT / 0.5, 0, 1), e = 1 - Math.pow(1 - k, 3), cx = L.w / 2, cy = L.h / 2, win = sim.over === "win";
        d.rect(L.w * 2, L.h * 2, { x: L.w / 2, y: L.h / 2, color: "#2a1c14", opacity: 0.5 * k });
        const y = cy + (1 - e) * 60, w = Math.min(L.w - 24, 320);
        d.push(); d.translate(0, 0);
        card(d, cx, y + 20, w, 310, "#f6ecd2", 14, k);
        d.pop();
        const title = endless ? `${sim.wave} waves held` : win && result?.nextLevel === null ? "First prize at the Show!" : win ? (sim.stars === 3 ? "Not a nibble!" : sim.stars === 2 ? "Well done, dear" : "A close thing") : "They ate the marrow";
        txt(d, title, cx, y - 110, 22, INK, true, 0, w - 20, k);
        if (!endless) {
            for (let i = 0; i < 3; i++) {
                const x = cx + (i - 1) * 64, on = i < starShown, pop = on ? clamp((overT - (0.55 + i * 0.32)) / 0.25, 0, 1) : 0, sz = 56 * (on ? 1 + Math.sin(pop * Math.PI) * 0.5 : 0.9);
                spr(d, "star", on ? 0 : 1, x, y - 54, sz, sz, { opacity: k });
            }
        }
        const line = endless ? `Best: ${result?.best ?? sim.wave} waves${result?.gained ? ` · +${result.gained} stars` : ""}` : win ? `${Math.ceil(sim.bites)} of ${sim.maxBites} bites left · ${sim.killed} pests seen off` : `You reached wave ${sim.wave} of ${sim.total}`;
        txt(d, line, cx, y - 8, 13, "#5a4432", false, w - 24, 0, k);
        if (result?.newStars > 0) txt(d, `+${result.newStars} star${result.newStars > 1 ? "s" : ""} for Gran's Almanac`, cx, y + 14, 13, "#8a5a1c", true, 0, 0, k);
        if (!win && !endless) txt(d, "Tip: tap the wave preview to see what's coming.", cx, y + 14, 12, "#5a4432", false, w - 24, 0, k);
    }

    // ---- Wiring ------------------------------------------------------------------------------------------------------------
    game.input.touchMode = game.input.touchMode;
    paintCottage(game);
    layout();
    seedAmbient();
    s.onDraw(drawWorld);
    s.add([ui(), pos(0, 0), layer(-5), { name: "hud", draw: (d) => drawHud(d) }]);
    s.add([ui(), pos(0, 0), layer(20), { name: "modal", draw: (d) => drawModal(d) }]);
    s.onDrawUI(drawOverlay);
    s.on("resize", () => layout());

    const startBanner = () => {
        const cfg = SEASONS[sim.season];
        banner = { title: endless ? "The Endless Year" : sim.def.name, sub: endless ? "Hold the wall as long as you can." : `${cfg.name} · ${cfg.weather}`, t: 0, life: 2.2 };
        const fresh = endless ? null : sim.unlocked.find((k) => DEFS[k].unlock === sim.levelIndex + 1 && k !== "gnome");
        if (fresh) speak(`New seeds! ${DEFS[fresh].name}: ${DEFS[fresh].blurb}`, 5);
    };
    startBanner();
    game.music(MUSIC[SEASONS[sim.season].song]);

    // A small surface for bots and tests.
    game.data.play = {
        sim, L, vx, vy, cellAt,
        select: (t) => { sel = t; },
        speed: (n) => { speed = n; },
        finish: () => overT,
        over: () => overT >= 0,
        result: () => result,
        setPopup: (v) => { popup = v; },
        setPause: (v) => { paused = v; },
        arm: (k) => { armed = k; info = k; },
        drag: () => drag,
    };
    void [PESTS, LAWN, FONT, PAPER, levelWaves, LEVELS];
}
