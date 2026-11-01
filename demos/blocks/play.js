// The play scene: wires a Match to the screen, the fingers, the keyboard, the speakers and the hand.
import { pin, rect, tap } from "./pogo.js";
import { COATS, BED_H, BED_INNER_H, BED_INNER_W, BED_W, FACE_SCALE, FX, MOODS, RIVAL_FRAMES, RIVAL_KEYS, TILE_SCALE } from "./art.js";
import { ANIMALS, EGG, TOP, W, kindOf } from "./engine.js";
import { Brain } from "./ai.js";
import { Match } from "./match.js";
import { Gestures } from "./gestures.js";
import { Pilot, SPEEDS, readKeys } from "./control.js";
import { FieldView, drawMini, faceFrame } from "./view.js";
import { MODES, RIVALS, dailySeed } from "./rivals.js";
import { CREAM, DIM, FONT, GOLD, HOT, INK, MINT, MOON, Night, PLUM, icons, inkText, pillow } from "./ui.js";

const fmtTime = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? "0" : ""}${r.toFixed(2)}`; };
export const NAMES = { 1: "Bump!", 2: "Pair!", 3: "Trio!", 4: "STAMPEDE!" };

export function makePlay(game, ctx) {
    game.scene("play", (s, args = {}) => {
        const { save, sound } = ctx;
        game.touch.enabled = false;
        const mode = args.mode ?? "story", rung = args.rung ?? 0, hard = !!args.hard;
        const day = dailySeed();
        const seed = args.seed ?? (mode === "daily" ? day.seed : 1 + Math.floor(s.rng.range ? s.rng.range(1, 1e6) : 7));
        let rival = null;
        if (mode === "story") {
            const base = RIVALS[rung], fails = save.fails[rung] ?? 0, tired = Math.max(0.7, 1 - fails * 0.08);
            rival = { ...base, brain: { ...base.brain, pps: base.brain.pps * tired * (hard ? 1.35 : 1), noise: base.brain.noise * (hard ? 0.4 : 1) }, send: hard ? 1 : base.send, gravity: base.gravity + (hard ? 3 : 0) };
        }
        const match = new Match({ mode, rival, seed });
        const duel = match.duel, versus = match.versus;
        const V = [new FieldView(match.you)];
        if (duel) V.push(new FieldView(match.them, { compact: !versus }));
        const speed = SPEEDS[save.speed] ?? SPEEDS.normal;
        const pilots = [new Pilot(match.you, speed)];
        if (versus) pilots.push(new Pilot(match.them, speed));
        const sky = rival?.sky ?? (mode === "sprint" ? ["#d9486e", "#2a1f6e"] : mode === "daily" ? ["#2f8f9e", "#1b1f62"] : mode === "versus" ? ["#7a3f9e", "#191a55"] : ["#3f3a9a", "#141a58"]);
        s.background = sky;
        const song = mode === "story" ? rival.song : mode === "sprint" ? "sprint" : mode === "versus" ? "barn" : "marathon";
        ctx.useSong(song);
        const night = new Night(rung + 3), bgGround = rival?.ground ?? "#141a4a";
        const state = {
            phase: "ready", t: 0, ready: versus ? 3 : 1.15, paused: false, endT: 0, faceHurt: 0, shout: rival ? rival.intro : "", shoutT: rival ? 3.2 : 0,
            pops: [], flyers: [], bubbles: [], zeds: [], warn: null, warnT: 0, fxT: 0, moved: 0, rotated: 0, dropped: 0, cleared: 0, sheepTaken: 0,
            danger: 0, beat: 0, levelShown: match.level, tick: 0,
        };
        const you = match.you;
        // First ever game: the rival waits until you've tried each move. Nothing to read but the next thing to do.
        const coach = mode === "story" && rung === 0 && !save.tutored ? { step: 0 } : null;
        if (coach) { match.sides[1].idle = true; state.shoutT = 0; }

        // --- Fingers ---------------------------------------------------------------------------------------------
        let buttons = save.buttons && !versus;
        const pads = { left: false, right: false, soft: false, cw: false, ccw: false, drop: false, hold: false };
        const gest = new Gestures((name, arg) => {
            if (name === "move") { you.move(arg); } else if (name === "soft") you.softStep();
            else if (name === "drop") you.hardDrop();
            else if (name === "hold") you.hold();
            else if (name === "rotate") you.rotate(arg);
        });
        const clock = game.headless ? () => game.stepCount : () => (ctx.stamp ?? performance.now()) / 16.667;
        ctx.onPointer = (kind, id, x, y) => { if (!buttons && state.phase === "play" && !state.paused) gest.push(kind, id, x, y, clock()); };
        s.on("leave", () => { ctx.onPointer = null; });
        let L = null;
        const inside = (r, x, y, pad = 0) => r && x >= r.x - pad && y >= r.y - pad && x <= r.x + r.w + pad && y <= r.y + r.h + pad;
        const claim = (x, y) => {
            if (inside(L.pause, x, y, 4)) return true;
            if (inside(L.hold, x, y, 4)) { you.hold(); return true; }
            return false;
        };

        // --- Layout --------------------------------------------------------------------------------------------------
        const layout = () => {
            const v = s.view, sf = v.safe, wide = v.width > v.height;
            const R = {};
            const inset = BED_W / BED_INNER_W, topPad = sf.top + 6;
            if (versus) {
                const c = Math.floor(Math.min((v.height - sf.top - sf.bottom - 34) / 20, (v.width / 2 - 86) / 10) * 2) / 2, w = c * 10;
                const mid = v.width / 2, by = sf.top + 28;
                R.c = c; R.board = [{ x: mid / 2 - w / 2 + 6, y: by }, { x: mid + mid / 2 - w / 2 - 6, y: by }];
                R.next = [{ x: R.board[0].x + w + 12, y: by + 26, w: 48 }, { x: R.board[1].x + w + 12, y: by + 26, w: 48 }];
                R.hold = { x: R.board[0].x - 62, y: by + 2, w: 48, h: 48 };
                R.hold2 = { x: R.board[1].x - 62, y: by + 2, w: 48, h: 48 };
                R.count = 5; R.mini = 9;
            } else if (wide) {
                const c = Math.floor((v.height - sf.top - sf.bottom - 8) / 21.6 * 2) / 2, w = c * 10, rim = c * 0.8125;
                const rc = duel ? Math.min(13, Math.floor((v.height - sf.top - sf.bottom - 118) / 20 * 2) / 2) : 0;
                const left = 74 + rim, nextW = 62 + rim, rw = duel ? rc * 10 + 26 : 0;
                const total = left + w + nextW + rw + 28, x0 = Math.max(sf.left + 6, (v.width - total) / 2) + (buttons ? 0 : 0);
                const bx = x0 + left, by = sf.top + (v.height - sf.top - sf.bottom - c * 20) / 2;
                R.c = c; R.board = [{ x: bx, y: by }];
                R.hold = { x: bx - rim - 62, y: by - rim + 2, w: 56, h: 54 };
                R.next = [{ x: bx + w + rim + 6, y: by - rim + 2, w: 56 }];
                R.count = 5; R.mini = 10;
                R.stats = { x: bx - rim - 34, y: by + 62 };
                if (duel) {
                    const rx = bx + w + nextW + 14;
                    R.rival = { x: rx, y: by + 88, c: rc };
                    R.face = { x: rx + rc * 5, y: by + 18, size: 50 };
                }
                if (buttons) R.padWide = true;
            } else {
                // The bed's wooden frame takes a little under a cell on each side.
                const bottom = sf.bottom + (buttons ? 122 : 22), strip = duel ? 52 : 40, side = 72, rimK = 0.8125;
                const c = Math.floor(Math.min((v.height - topPad - strip - bottom) / (20 + 2 * rimK), (v.width - side - 12 - sf.left - sf.right) / (10 + 2 * rimK)) * 2) / 2, w = c * 10, rim = c * rimK;
                const spare = v.width - sf.left - sf.right - w - 2 * rim - side - 6;
                const bx = sf.left + spare / 2 + rim, extra = v.height - topPad - strip - bottom - c * 20 - 2 * rim, by = topPad + strip + rim + extra * 0.3;
                R.c = c; R.board = [{ x: bx, y: by }];
                const col = bx + w + rim + 6;
                R.hold = { x: col, y: by - rim + 2, w: side, h: 52 };
                R.next = [{ x: col, y: by - rim + 62, w: side }];
                R.count = duel ? 3 : 5; R.mini = 11;
                if (duel) {
                    const rc = Math.floor((side - 12) / 10 * 2) / 2;
                    R.rival = { x: col + (side - rc * 10) / 2, y: by - rim + 62 + R.count * 37 + 30, c: rc };
                    R.face = { x: sf.left + 30, y: topPad + 22, size: 46 };
                } else R.stats = { x: col + side / 2, y: by - rim + 62 + R.count * 37 + 34 };
            }
            R.pause = { x: v.width - sf.right - 54, y: sf.top + 2, w: 52, h: 48 };
            R.bar = R.board.map((b) => ({ x: b.x - R.c * (inset - 1) * 2.5, y: b.y }));
            // On-screen buttons.
            R.pads = [];
            if (buttons) {
                const b = sf.bottom + 8;
                if (!wide) {
                    const gap = 6, cols = 4, bw = (v.width - sf.left - sf.right - 16 - gap * (cols - 1)) / cols, bh = 52;
                    const X = (i) => sf.left + 8 + i * (bw + gap), y0 = v.height - b - bh * 2 - gap, y1 = v.height - b - bh;
                    ["ccw", "hold", "drop", "cw"].forEach((key, i) => R.pads.push({ key, x: X(i), y: y0, w: bw, h: bh }));
                    R.pads.push({ key: "left", x: X(0), y: y1, w: bw, h: bh }, { key: "soft", x: X(1), y: y1, w: bw * 2 + gap, h: bh }, { key: "right", x: X(3), y: y1, w: bw, h: bh });
                } else {
                    const bw = 56, bh = 52, x0 = sf.left + 6, x1 = v.width - sf.right - 6 - bw, y0 = v.height - b - bh;
                    [["left", x0, y0], ["right", x0 + bw + 4, y0 - 0], ["soft", x0 + (bw + 4) / 2, y0 - bh - 4], ["ccw", x1 - bw - 4, y0], ["cw", x1, y0], ["drop", x1, y0 - bh - 4]].forEach(([key, x, y]) => R.pads.push({ key, x, y, w: bw, h: bh }));
                }
            }
            L = R;
            V[0].place(R.board[0].x, R.board[0].y, R.c);
            if (versus) V[1].place(R.board[1].x, R.board[1].y, R.c);
            else if (duel) V[1].place(R.rival.x, R.rival.y, R.rival.c);
            gest.scale(R.c);
        };
        layout();
        s.on("resize", layout);

        // --- Effects -------------------------------------------------------------------------------------------------
        const pop = (text, x, y, size, color = CREAM, life = 0.9) => { state.pops.push({ text, x, y, size, color, t: 0, life }); if (state.pops.length > 5) state.pops.shift(); };
        const moan = (e, view) => {
            if (state.bubbles.length >= 2 || view.compact) return;
            const [cx, cy] = e.cells[0];
            state.bubbles.push({ text: ANIMALS[e.p].moan, x: view.cellX(cx), y: view.cellY(cy) - view.c, t: 0 });
        };
        const shout = (text, sec = 2.2) => { state.shout = text; state.shoutT = sec; };

        /** Everything that happens on one bed. */
        const onField = (e, i) => {
            const view = V[i], human = i === 0 || versus, c = view.c;
            view.onEvent(e);
            if (e.t === "spawn" && i === 0) gest.newPiece();
            if (e.t === "move" && human) { state.movedNow = (state.movedNow ?? 0) + 1; state.moved++; }
            else if (e.t === "rotate" && human) { sound.turn(e.kick); state.rotated++; }
            else if (e.t === "stuck" && human) sound.stuck();
            else if (e.t === "soft" && human) sound.soft();
            else if (e.t === "hold" && human) sound.hold();
            else if (e.t === "lock") {
                if (human) {
                    sound.thud(e.p, e.dist, e.hard);
                    if (e.hard) { state.dropped++; s.shake(0.8 + Math.min(1.6, e.dist * 0.12), 0.1, { haptic: false }); }
                    if (e.hard || e.dist > 3 || s.rng.chance?.(0.2)) moan(e, view);
                    const n = 5 + Math.min(10, e.dist);
                    for (const [x, y] of e.cells) if (e.hard) s.burst({ at: [view.cellX(x), view.cellY(y) + c * 0.5], count: Math.ceil(n / 4), color: [COATS[e.p].pop, CREAM], speed: [20, 80 + e.dist * 8], life: [0.15, 0.4], size: [1.5, 3.5], gravity: 180, angle: -Math.PI / 2, spread: 2.6 });
                }
            } else if (e.t === "wedge" && human) pop("Wedged!", view.cellX(4.5), view.cellY(12), 22, MINT);
            else if (e.t === "clear") {
                if (human) {
                    sound.clear(e.n, e.combo, e.wedge);
                    state.cleared += e.n;
                    const big = e.n >= 4 || e.perfect;
                    s.shake(1 + e.n * 0.8, 0.14 + e.n * 0.05, { haptic: false });
                    if (big) { s.freeze(0.08); s.flash(COATS[e.n === 4 ? 2 : 1].pop, 0.2); sound.stampede(); }
                    const label = e.perfect ? "SPOTLESS!" : e.wedge ? `WEDGED ${e.n}!` : NAMES[e.n];
                    pop(label, view.cellX(4.5), view.cellY(e.rows[0]) - c, e.n >= 4 ? 34 : 20 + e.n * 2.5, e.n >= 4 ? GOLD : e.wedge ? MINT : CREAM, 1);
                    if (e.combo >= 1) pop(`Combo ${e.combo + 1}`, view.cellX(4.5), view.cellY(e.rows[0]) + c * 0.8, 17, MINT, 0.9);
                    if (e.b2b) pop("Back to back!", view.cellX(4.5), view.cellY(e.rows[0]) - c * 3, 15, MOON, 0.9);
                    if (e.eggs) pop(`+${e.eggs * 150} eggs`, view.cellX(4.5), view.cellY(e.rows[0]) + c * 2, 14, MOON, 0.8);
                }
                for (const y of e.rows) for (let x = 0; x < W; x += 2) s.burst({ at: [view.cellX(x + 0.5), view.cellY(y)], count: human ? 3 : 1, color: [CREAM, MOON], speed: [40, 150], life: [0.2, 0.5], size: [1.5, 4], gravity: 200 });
            } else if (e.t === "incoming" && human) sound.incoming(e.n);
            else if (e.t === "cancel" && human) { sound.cancel(); pop("Blocked!", view.x + view.width * 0.5, view.y + view.height - c * 2, 18, MINT, 0.7); }
            else if (e.t === "landed") {
                if (human) { sound.sheep(e.n); s.shake(1.2 + e.n * 0.3, 0.2, { haptic: false }); state.sheepTaken += e.n; if (rival && e.n >= 3) shout(rival.tease, 1.4); }
            } else if (e.t === "egg") {
                s.burst({ at: [view.cellX(e.x), view.cellY(e.y)], count: 6, color: ["#fff0cf", "#ffc64f"], speed: [20, 70], life: [0.2, 0.4], size: [1.5, 3], gravity: 150 });
            } else if (e.t === "dead") {
                s.burst({ at: [view.x + view.width / 2, view.y + view.height / 2], count: 30, color: [HOT, CREAM], speed: [60, 220], life: [0.3, 0.8], size: [2, 5], gravity: 200 });
            }
        };

        const onMatch = (e) => {
            if (e.t === "launch") {
                sound.launch(e.n);
                const from = V[e.from], to = V[1 - e.from], k = Math.min(9, 3 + e.n);
                for (let i = 0; i < k; i++) {
                    const kind = Math.floor(game.fxRng.range ? game.fxRng.range(0, 7) : i % 7);
                    state.flyers.push({
                        kind, x0: from.cellX(1 + (i * 7) % 8), y0: from.cellY(e.rows[0] ?? 15),
                        x1: to.x + to.width * (0.2 + 0.6 * ((i * 3) % k) / k), y1: to.y + to.height * 0.72,
                        t: -i * 0.022, life: 0.44, spin: (i % 2 ? 1 : -1) * 7, size: Math.max(16, from.c * 1.15),
                    });
                }
            } else if (e.t === "hit") {
                const view = V[e.to], human = e.to === 0 || versus;
                sound.hit();
                view.wobAll(1); view.wake = Math.max(view.wake, 0.7);
                if (!human) { state.faceHurt = 0.7; if (rival && e.n >= 2) shout(rival.ouch, 1.2); }
                s.burst({ at: [view.x + view.width / 2, view.y + view.height * 0.7], count: 12, color: [CREAM, "#c9c7e4"], speed: [40, 160], life: [0.25, 0.5], size: [2, 4.5], gravity: 200 });
            } else if (e.t === "warn") {
                state.warn = e.name; state.warnT = 1.5;
                sound.warnAttack();
                shout(e.name, 1.4);
            } else if (e.t === "attack") {
                sound.attack(e.kind);
                const v0 = V[0];
                if (e.kind === "crow") { s.shake(4, 0.5, { haptic: false }); s.flash("#ffd98a", 0.3); pop("Faster!", v0.cellX(4.5), v0.cellY(12), 26, GOLD, 1.2); }
                else if (e.kind === "charge") { s.shake(5, 0.4, { haptic: false }); pop("CHARGE!", v0.cellX(4.5), v0.cellY(14), 28, HOT, 1); }
                else if (e.kind === "swipe") pop(e.took >= 0 ? "Stolen!" : "Swapped!", L.hold.x + 28, L.hold.y + 62, 15, HOT, 1.1);
                else if (e.kind === "egg") pop("Eggs!", v0.cellX(4.5), v0.cellY(6), 20, MOON, 0.9);
                else if (e.kind === "quills") pop("Quills!", v0.cellX(4.5), v0.y + v0.height - 30, 20, HOT, 0.8);
                else if (e.kind === "stink") pop("Pfwoar!", L.next[0].x + 28, L.next[0].y + 60, 17, "#b9ec74", 1.2);
                else if (e.kind === "dark") pop("Lights out!", v0.cellX(4.5), v0.cellY(10), 22, DIM, 1.1);
            } else if (e.t === "level") {
                sound.level();
                pop(`Level ${e.level}`, V[0].cellX(4.5), V[0].cellY(9), 28, GOLD, 1.2);
            } else if (e.t === "crowd") {
                pop("Getting crowded!", V[0].cellX(4.5), V[0].cellY(8), 20, HOT, 1.5);
                sound.warnAttack();
            } else if (e.t === "end") endMatch(e);
        };

        // --- Ending ---------------------------------------------------------------------------------------------------
        let panel = [];
        const results = { win: false, lines: [], stars: 0 };
        function endMatch(e) {
            state.phase = "over"; state.endT = 0;
            const f = match.you, win = e.winner === 0;
            s.freeze(0.1);
            s.shake(4, 0.4, { haptic: false });
            sound.ko();
            V.forEach((view, i) => { view.wake = i === e.winner ? 0 : 99; });
            const t = match.seconds;
            results.win = win;
            if (mode === "story") {
                if (win) {
                    const stars = 1 + (t < 100 ? 1 : 0) + (f.quads + f.wedges > 0 && state.sheepTaken < 8 ? 1 : 0);
                    results.stars = stars;
                    const k = hard ? "hardStars" : "stars";
                    save[k][rung] = Math.max(save[k][rung] ?? 0, stars);
                    save.fails[rung] = 0;
                    if (rung >= save.rung) save.rung = rung + 1;
                    if (rung === RIVALS.length - 1) { if (hard) save.insomniaDone = true; else save.finished = true; }
                } else save.fails[rung] = (save.fails[rung] ?? 0) + 1;
            } else if (mode === "marathon") {
                results.best = save.best.marathon < f.score;
                save.best.marathon = Math.max(save.best.marathon, f.score);
                results.win = f.lines >= 150;
            } else if (mode === "sprint") {
                if (win) { const was = save.best.sprint; results.best = !was || t < was; if (results.best) save.best.sprint = t; results.time = t; }
            } else if (mode === "daily") {
                const d = save.best.daily;
                if (d.key !== day.key) {
                    const prev = new Date(day.key); prev.setDate(prev.getDate() - 1);
                    d.streak = d.key === prev.toISOString().slice(0, 10) ? (d.streak ?? 0) + 1 : 1;
                    d.key = day.key; d.score = 0;
                }
                results.best = f.score > d.score;
                d.score = Math.max(d.score, f.score);
            } else if (mode === "versus") {
                const score = args.score ?? [0, 0];
                score[e.winner]++;
                results.score = score;
            }
            ctx.persist();
            s.wait(0.5, () => { if (win || versus) sound.fanfare(); else sound.sadTrombone(); });
            s.wait(0.3, () => { ctx.useSong(win || (mode !== "story" && mode !== "sprint") ? "win" : "lose"); });
            s.wait(1.15, showPanel);
        }

        function showPanel() {
            state.phase = "panel"; state.panelT = 0;
            const v = s.view, wide = v.width > v.height, w = 150, h = 50;
            const go = (fn) => () => { sound.ui(); fn(); };
            const list = [];
            const again = () => game.go("play", { mode, rung, hard, seed: mode === "daily" ? seed : undefined }, { fade: 0.2 });
            if (mode === "story") {
                if (results.win) {
                    list.push(["Next", go(() => (rung === RIVALS.length - 1 ? game.go("finale", {}, { fade: 0.6 }) : game.go("ladder", { climbed: rung, hard }, { fade: 0.3 }))), "#7be0b0", "#2f9a6e"]);
                    list.push(["Again", go(again), "#c9c7e4", "#7c79ad"]);
                } else {
                    list.push(["Try again", go(again), "#ff9d4d", "#c04f22"]);
                    list.push(["Ladder", go(() => game.go("ladder", { hard }, { fade: 0.3 })), "#c9c7e4", "#7c79ad"]);
                }
            } else if (versus) {
                const sc = results.score, done = sc[0] >= 2 || sc[1] >= 2;
                list.push([done ? "New match" : "Next round", go(() => game.go("play", { mode, score: done ? [0, 0] : sc }, { fade: 0.2 })), "#ff9d4d", "#c04f22"]);
                list.push(["Title", go(() => game.go("title", {}, { fade: 0.3 })), "#c9c7e4", "#7c79ad"]);
            } else {
                list.push(["Again", go(again), "#ff9d4d", "#c04f22"]);
                list.push(["Title", go(() => game.go("title", {}, { fade: 0.3 })), "#c9c7e4", "#7c79ad"]);
            }
            const y = wide ? 62 : 74;
            list.forEach(([label, fn, color, deep], i) => {
                const e = s.add([pillow(label, { width: i ? 118 : w, height: h, onTap: fn, color, deep, action: i ? undefined : "confirm", textSize: 19 }),
                    pin("center", [(i ? 1 : -1) * ((w + 118) / 4 + 6), y]), { name: label }]);
                panel.push(e);
            });
        }

        // --- Pause --------------------------------------------------------------------------------------------------
        s.add([pin("top-right", [2, 2]), rect(52, 48, { color: "#00000000" }), tap(() => togglePause()), { name: "pause", draw(d) { d.circle(17, { color: INK, opacity: 0.75 }); icons.pause(d, 0, 0, 9, CREAM); } }]);
        let pauseUi = [];
        function togglePause() {
            if (state.phase === "over" || state.phase === "panel") return;
            state.paused = !state.paused;
            s.paused = false;
            if (state.paused) {
                sound.ui();
                const row = (label, y, fn, o = {}) => { const e = s.add([pillow(typeof label === "function" ? label() : label, { width: 214, height: 46, textSize: 17, onTap: () => { fn(e); sound.ui(); }, ...o }), pin("center", [0, y]), { name: "p" }]); pauseUi.push(e); return e; };
                const toggle = (get) => (e) => { e.label2 = get(); };
                row("Resume", -112, () => togglePause(), { color: "#7be0b0", deep: "#2f9a6e", action: "pause" });
                row(() => `Sound: ${game.audio.muted ? "off" : "on"}`, -60, (e) => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; ctx.persist(); toggle(() => `Sound: ${game.audio.muted ? "off" : "on"}`)(e); }, { color: "#c9c7e4", deep: "#7c79ad" });
                row(() => `Haptics: ${game.haptics.enabled ? "on" : "off"}`, -8, (e) => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; ctx.persist(); if (game.haptics.enabled) game.haptic("medium"); toggle(() => `Haptics: ${game.haptics.enabled ? "on" : "off"}`)(e); }, { color: "#c9c7e4", deep: "#7c79ad" });
                row(() => `Controls: ${save.buttons ? "buttons" : "drag"}`, 44, (e) => { save.buttons = !save.buttons; ctx.persist(); buttons = save.buttons && !versus; layout(); toggle(() => `Controls: ${save.buttons ? "buttons" : "drag"}`)(e); }, { color: "#c9c7e4", deep: "#7c79ad" });
                row(() => `Key repeat: ${(SPEEDS[save.speed] ?? SPEEDS.normal).label}`, 96, (e) => { save.speed = save.speed === "fast" ? "normal" : "fast"; ctx.persist(); pilots.forEach((p) => { p.speed = SPEEDS[save.speed]; }); toggle(() => `Key repeat: ${SPEEDS[save.speed].label}`)(e); }, { color: "#c9c7e4", deep: "#7c79ad" });
                row("Quit", 148, () => { game.go(mode === "story" ? "ladder" : "title", { hard }, { fade: 0.25 }); }, { color: "#ff9d9d", deep: "#b84a5a" });
            } else {
                for (const e of pauseUi) e.destroy();
                pauseUi = [];
            }
        }

        ctx.onHide = () => { if (state.phase === "play" && !state.paused) togglePause(); };
        s.on("leave", () => { ctx.onHide = null; });

        // --- The loop ---------------------------------------------------------------------------------------------
        const softOff = { left: false, right: false, soft: false, cw: false, ccw: false, drop: false, hold: false };
        const dn = (k) => pads[k];
        s.add([{ name: "loop", ui: true, update(dt) {
            const inp = s.input;
            sound.tick();
            if (s.isFrozen) return;
            state.t += dt;
            V.forEach((v) => v.step(dt));
            for (const list of [state.pops, state.bubbles, state.zeds]) for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.t += dt; if (p.t > (p.life ?? 0.8)) list.splice(i, 1); }
            for (let i = state.flyers.length - 1; i >= 0; i--) { const p = state.flyers[i]; p.t += dt; if (p.t > p.life) state.flyers.splice(i, 1); }
            state.shoutT -= dt; state.warnT -= dt; state.faceHurt -= dt;
            if (state.phase === "panel") { state.panelT += dt; return; }
            if (state.phase === "over") { state.endT += dt; return; }
            if (inp.pressed("pause") && !state.paused) togglePause();
            if (state.paused) return;
            if (state.phase === "ready") {
                const was = state.ready;
                state.ready -= dt;
                if (Math.floor(was * 2.6) !== Math.floor(state.ready * 2.6) && state.ready > 0.05) sound.tickDown();
                if (state.ready <= 0) { state.phase = "play"; sound.ui(); }
            }
            let softA = false, softB = false;
            const live = state.phase === "play";
            const touches = inp.touches;
            if (buttons) {
                for (const k in pads) pads[k] = false;
                for (const t of touches) {
                    for (const p of L.pads) if (inside(p, t.x, t.y)) pads[p.key] = true;
                    if (t.pressed && inside(L.hold, t.x, t.y)) you.hold();
                }
            }
            if (live) {
                if (versus) {
                    pilots[0].update(readKeys(inp, "one"));
                    pilots[1].update(readKeys(inp, "two"));
                    softA = pilots[0].soft; softB = pilots[1].soft;
                } else {
                    const k = readKeys(inp, "solo");
                    if (buttons) for (const key in pads) k[key] = k[key] || dn(key);
                    pilots[0].update(k);
                    softA = pilots[0].soft;
                    if (!buttons) {
                        gest.idle = !you.active; gest.width = s.view.width; gest.claim = claim;
                        gest.update();
                    }
                }
                match.step(softA, softB);
            } else { pilots[0].update(softOff); }
            V.forEach((_, i) => { const f = match.sides[i].f; for (const e of f.events) onField(e, i); f.events.length = 0; });
            if (state.movedNow) { sound.move(state.movedNow); state.movedNow = 0; }
            for (const e of match.events) onMatch(e);
            match.events.length = 0;
            V[0].showGhost = !(match.fx.dark > 0);
            if (live && coach) stepCoach();
            if (live) danger(dt);
        } }]);

        function stepCoach() {
            const c = coach;
            if (c.step === 0 && state.moved >= 2) c.step = 1;
            else if (c.step === 1 && state.rotated >= 1) c.step = 2;
            else if (c.step === 2 && state.dropped >= 1) { c.step = 3; match.sides[1].idle = false; save.tutored = true; ctx.persist(); shout(rival.intro, 3); }
            else if (c.step === 3 && (state.cleared >= 1 || you.pieces > 16)) { c.step = 4; c.t = 0; }
            else if (c.step === 4 && (++c.t > 420 || you.holdPiece >= 0)) c.step = 5;
        }

        function danger(dt) {
            const h = you.stackHeight();
            state.danger = h >= 16 ? 1 : 0;
            if (state.danger) { state.beat -= dt; if (state.beat <= 0) { state.beat = 0.7; sound.tone([{ wave: "sine", freq: 70, decay: 0.12, volume: 0.25 }, { wave: "sine", at: 0.16, freq: 60, decay: 0.12, volume: 0.2 }], "tick"); } }
            if (mode === "daily") { const left = 150 - match.seconds; if (left < 5.05 && Math.floor(left) !== state.lastSec) { state.lastSec = Math.floor(left); sound.tickDown(); } }
            // Sleepers mumble: the odd z floats up from the pile.
            state.fxT -= dt;
            if (state.fxT <= 0 && state.zeds.length < 5) {
                state.fxT = 0.5;
                const view = V[0], g = view.f.grid;
                for (let n = 0; n < 12; n++) {
                    const x = Math.floor(game.fxRng.next() * W), y = TOP + 6 + Math.floor(game.fxRng.next() * 14);
                    const v = g[x + y * W];
                    if (v && !g[x + (y - 1) * W] && kindOf(v) - 1 !== EGG) { state.zeds.push({ x: view.cellX(x), y: view.cellY(y) - view.c * 0.5, t: 0, life: 1.4, size: view.c * 0.5 }); break; }
                }
            }
        }

        // --- Drawing --------------------------------------------------------------------------------------------------
        const drawBed = (d, view, glow = 0) => {
            const w = view.width, h = view.height, bw = w * BED_W / BED_INNER_W, bh = h * BED_H / BED_INNER_H;
            d.sprite("bed", { x: view.x + w / 2, y: view.y + h / 2, width: bw, height: bh });
            if (glow > 0.01) d.rect(w, h, { x: view.x + w / 2, y: view.y + h / 2, color: HOT, opacity: 0.1 + 0.08 * Math.sin(state.t * 7), radius: 4 });
        };
        // The world layer: backdrop and beds. Particles land on top of these.
        s.add([{ name: "world", layer: 1, draw(d) {
            const v = s.view;
            night.draw(d, v, state.t, { near: bgGround, far: mix(bgGround, sky[0], 0.28), stars: rival?.key === "reveille" ? 0.3 : 0.8, moonGlow: rival?.key === "reveille" ? "#ffb27a" : "#ffe9b0" });
            V.forEach((view, i) => {
                drawBed(d, view, i === 0 ? state.danger : 0);
                const t = d.quads("tiles"), fa = d.quads("faces");
                view.draw(d, t, fa);
                if (match.over && i !== match.winner) d.rect(view.width, view.height, { x: view.x + view.width / 2, y: view.y + view.height / 2, color: INK, opacity: Math.min(0.55, state.endT), radius: 4 });
            });
        } }]);

        const mix = (a, b, t) => {
            const p = (h, i) => parseInt(h.slice(i, i + 2), 16), q = (i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0");
            return `#${q(1)}${q(3)}${q(5)}`;
        };

        const panelBox = (d, r, label) => {
            d.rect(r.w + 4, r.h + 4, { x: r.x + r.w / 2, y: r.y + r.h / 2, color: INK, radius: 12, opacity: 0.9 });
            d.rect(r.w, r.h, { x: r.x + r.w / 2, y: r.y + r.h / 2, color: PLUM, radius: 10 });
            if (label) d.text(label, { x: r.x + r.w / 2, y: r.y + 9, size: 10.5, bold: true, font: FONT, color: DIM });
        };

        const drawQueue = (d, idx) => {
            const f = match.sides[idx].f, n = L.next[idx] ?? L.next[0], h = idx ? L.hold2 : L.hold, m = L.mini, count = L.count;
            const box = { x: n.x, y: n.y, w: n.w, h: count * 37 + 18 };
            panelBox(d, h, "HOLD"); panelBox(d, box, "NEXT");
            const t = d.quads("tiles"), fa = d.quads("faces");
            if (f.holdPiece >= 0) drawMini(t, fa, f.holdPiece, h.x + h.w / 2, h.y + h.h / 2 + 7, m, MOODS.sleep, f.canHold ? 1 : 0.55);
            const stink = idx === 0 && match.fx.stink > 0;
            for (let i = 0; i < count; i++) drawMini(t, fa, f.queue[i], n.x + n.w / 2, n.y + 34 + i * 37, i ? m * 0.9 : m, MOODS.grump, 1, 1);
            if (stink) {
                const fx = d.quads("fx");
                for (let i = 0; i < 9; i++) { const a = state.t * 1.2 + i * 1.4; fx(n.x + n.w * 0.5 + Math.sin(a) * n.w * 0.3, n.y + 22 + (i * 0.11 * box.h + state.t * 10) % (box.h - 30), n.w * 1.1, n.w * 1.1, a * 0.3, FX.stink, 1, 1, 1, 0.95); }
            }
        };

        const drawBar = (d, idx) => {
            const b = L.bar[idx], view = V[idx], f = view.f, c = view.c, w = 7, h = view.height, pending = f.pending();
            d.rect(w + 3, h + 3, { x: b.x, y: b.y + h / 2, color: INK, radius: 4, opacity: 0.9 });
            if (pending) {
                const rows = Math.min(20, pending), ph = rows * c, ready = f.incoming[0]?.wait <= 0;
                const pulse = 0.5 + 0.5 * Math.sin(state.t * 14);
                d.rect(w, ph, { x: b.x, y: b.y + h - ph / 2, color: ready ? HOT : "#ffb45c", opacity: ready ? 0.7 + 0.3 * pulse : 1, radius: 3 });
            }
        };

        const drawRivalHead = (d) => {
            if (!rival) return;
            const r = L.face, i = RIVAL_KEYS.indexOf(rival.key), lost = match.over && match.winner === 0;
            const hurt = state.faceHurt > 0 ? 1 : 0, frame = i * RIVAL_FRAMES + (lost ? 2 : hurt);
            const bob = Math.sin(state.t * 3) * 1.2, shake = state.faceHurt > 0 ? Math.sin(state.t * 60) * 2 * state.faceHurt : 0;
            d.circle(r.size * 0.52, { x: r.x, y: r.y, color: INK, opacity: 0.55 });
            const q = d.quads("rivals");
            q(r.x + shake, r.y + bob, r.size * 1.15, r.size * 1.15, 0, frame);
            // Their special charging, as a little bar.
            const sp = match.special;
            if (sp) {
                const k = sp.warnT >= 0 ? 1 : 1 - sp.t / (60 * sp.every), bw = r.size * 1.1;
                d.rect(bw + 4, 8, { x: r.x, y: r.y + r.size * 0.62, color: INK, radius: 4 });
                d.rect(Math.max(4, bw * k), 4, { x: r.x - bw / 2 + bw * k / 2, y: r.y + r.size * 0.62, color: sp.warnT >= 0 ? HOT : GOLD, radius: 2 });
            }
        };

        const drawShout = (d) => {
            if (state.shoutT <= 0 || !rival) return;
            const r = L.face, wide = s.view.width > s.view.height, a = Math.min(1, state.shoutT * 4, (3.3 - state.shoutT) * 6);
            const size = 12.5, maxW = wide ? 126 : Math.min(236, s.view.width - r.x - 90);
            const w = maxW, h = state.shout.length * size * 0.54 > maxW - 16 ? 40 : 26;
            const x = wide ? r.x : r.x + r.size * 0.72 + w / 2, y = wide ? r.y + r.size * 0.2 : r.y;
            const yy = wide ? (L.rival.y + L.rival.c * 8) : y;
            d.rect(w + 3, h + 3, { x, y: yy, color: INK, radius: 12, opacity: a });
            d.rect(w, h, { x, y: yy, color: CREAM, radius: 10, opacity: a });
            d.text(state.shout, { x, y: yy, size, bold: true, font: FONT, color: INK, maxWidth: w - 12, opacity: a, align: "center" });
        };

        const drawStats = (d) => {
            const v = s.view, sf = v.safe, f = you, wide = v.width > v.height;
            const label = (t, x, y, val, color = CREAM) => { d.text(t, { x, y, size: 10, bold: true, font: FONT, color: DIM }); inkText(d, val, x, y + 15, 16, color); };
            if (versus) {
                inkText(d, `${(args.score ?? [0, 0])[0]} - ${(args.score ?? [0, 0])[1]}`, v.width / 2, sf.top + 14, 16, MOON);
                inkText(d, "Player 1", L.board[0].x + V[0].width / 2, sf.top + 14, 14);
                inkText(d, "Player 2", L.board[1].x + V[1].width / 2, sf.top + 14, 14);
                return;
            }
            const st = L.stats;
            if (mode === "story") {
                if (!wide) {
                    if (state.shoutT <= 0) inkText(d, rival.name, L.face.x + 36 + rival.name.length * 4.4, L.face.y - 2, 15, CREAM);
                }
                if (st) { label("Lines", st.x, st.y, `${f.lines}`); label("Sent", st.x, st.y + 40, `${f.sent}`, MINT); }
                return;
            }
            const col = st ?? { x: 0, y: 0 };
            const time = fmtTime(match.seconds);
            const goal = MODES[mode];
            if (mode === "sprint") { label("Lines left", col.x, col.y, `${Math.max(0, 40 - f.lines)}`, GOLD); label("Time", col.x, col.y + 42, time); if (save.best.sprint) label("Best", col.x, col.y + 84, fmtTime(save.best.sprint), DIM); }
            else if (mode === "marathon") { label("Score", col.x, col.y, `${f.score}`, GOLD); label("Level", col.x, col.y + 42, `${match.level}`); label("Lines", col.x, col.y + 84, `${f.lines}/${goal.goal}`); }
            else { label("Score", col.x, col.y, `${f.score}`, GOLD); label("Time left", col.x, col.y + 42, `${Math.max(0, Math.ceil(150 - match.seconds))}`, 150 - match.seconds < 10 ? HOT : CREAM); label("Lines", col.x, col.y + 84, `${f.lines}`); }
            if (!wide) { const top = sf.top + 24; inkText(d, goal.label, sf.left + 14 + 36, top, 18, MOON); }
        };

        const drawPads = (d) => {
            if (!buttons) return;
            for (const p of L.pads) {
                const on = pads[p.key], cx = p.x + p.w / 2, cy = p.y + p.h / 2;
                d.rect(p.w + 3, p.h + 3, { x: cx, y: cy + 1, color: INK, radius: 14, opacity: 0.9 });
                d.rect(p.w, p.h, { x: cx, y: cy + (on ? 1 : 0), color: on ? "#6a63c0" : PLUM, radius: 12 });
                icons[p.key === "soft" ? "down" : p.key](d, cx, cy, 13, CREAM);
            }
        };

        const drawCoach = (d) => {
            if (!coach || coach.step > 4 || state.phase !== "play") return;
            const view = V[0], keys = !s.input.touchMode, x = view.x + view.width / 2, y = view.y + view.height * 0.62, t = state.t;
            const msg = keys ? ["Arrow keys to move", "Up to turn", "Space to drop", "Fill a row to launch it at Pip!", "C keeps an animal for later"] : ["Drag to move", "Tap to turn", "Flick down to drop", "Fill a row to launch it at Pip!", "Flick up to keep one for later"];
            const size = coach.step >= 3 ? 16 : 22;
            inkText(d, msg[coach.step], x, y - 56, size, MOON, { align: "center" });
            if (keys || coach.step >= 3) return;
            const k = (t * 0.9) % 1;
            let fx = x, fy = y, alpha = 1, r = 13;
            if (coach.step === 0) { fx = x + Math.sin(k * Math.PI * 2) * 60; }
            else if (coach.step === 1) { const q = (t * 1.1) % 1; r = q < 0.3 ? 10 : 14; alpha = q < 0.6 ? 1 : 0.3; }
            else { fy = y - 34 + k * k * 92; alpha = 1 - k * k; }
            d.circle(r + 5, { x: fx, y: fy, color: CREAM, opacity: 0.2 * alpha });
            d.circle(r, { x: fx, y: fy, color: CREAM, opacity: 0.85 * alpha });
        };

        s.onDraw((d) => {
            const v = s.view;
            drawQueue(d, 0);
            if (versus) drawQueue(d, 1);
            drawBar(d, 0);
            if (versus) drawBar(d, 1);
            drawRivalHead(d);
            drawStats(d);
            drawPads(d);
            // Flying animals.
            const fa = d.quads("faces"), ti = d.quads("tiles");
            for (const p of state.flyers) {
                if (p.t < 0) continue;
                const k = p.t / p.life, e = k * k * (3 - 2 * k), x = p.x0 + (p.x1 - p.x0) * e, y = p.y0 + (p.y1 - p.y0) * e - Math.sin(k * Math.PI) * 70, rot = p.spin * k;
                ti(x, y, p.size * TILE_SCALE, p.size * TILE_SCALE, rot, p.kind * 16);
                fa(x, y, p.size * FACE_SCALE, p.size * FACE_SCALE, rot, faceFrame(p.kind, MOODS.shock));
            }
            const fx = d.quads("fx");
            for (const z of state.zeds) { const k = z.t / z.life; fx(z.x + Math.sin(k * 6) * 6, z.y - k * 26, z.size * (0.6 + k * 0.6), z.size * (0.6 + k * 0.6), Math.sin(k * 4) * 0.2, FX.z, 1, 1, 1, Math.min(1, (1 - k) * 2) * 0.85); }
            for (const b of state.bubbles) {
                const k = b.t / 0.8, a = Math.min(1, (1 - k) * 3), sc = Math.min(1, b.t * 12);
                d.rect(44 * sc, 20 * sc, { x: b.x, y: b.y - k * 10, color: CREAM, radius: 8, opacity: a });
                d.text(b.text, { x: b.x, y: b.y - k * 10, size: 11 * sc, bold: true, font: FONT, color: INK, opacity: a });
            }
            for (const p of state.pops) {
                const k = p.t / p.life, grow = k < 0.14 ? 0.5 + 0.75 * (k / 0.14) : k < 0.24 ? 1.25 - (k - 0.14) * 2.5 : 1;
                inkText(d, p.text, p.x, p.y - k * 16, p.size * grow, p.color, { opacity: Math.min(1, (1 - k) * 3) });
            }
            drawShout(d);
            drawCoach(d);
            if (state.warnT > 0 && state.warn) {
                const view = V[0], blink = Math.sin(state.t * 22) > -0.3;
                if (blink) inkText(d, `${state.warn}`, view.x + view.width / 2, view.y + 26, 16, HOT);
            }
            if (state.phase === "ready" && !coach) {
                const n = state.ready, view = V[0], word = n > 0.55 ? "Ready..." : "Go!";
                inkText(d, word, view.x + view.width / 2, view.y + view.height * 0.4, 36, n > 0.55 ? CREAM : GOLD);
                if (versus) {
                    [["A D move", "S soft   W drop", "Q E turn   R hold"], ["Arrows move", "Down soft   Up drop", ", . turn   / hold"]].forEach((lines, i) => lines.forEach((line, k) => {
                        d.text(line, { x: V[i].x + V[i].width / 2, y: V[i].y + V[i].height * 0.56 + k * 19, size: 14, bold: true, font: FONT, color: MOON });
                    }));
                }
            }
            if (state.phase === "over" || state.phase === "panel") drawEnd(d);
            if (state.paused) {
                d.rect(v.width * 2, v.height * 2, { x: v.width / 2, y: v.height / 2, color: INK, opacity: 0.72 });
                inkText(d, "Paused", v.width / 2, v.height / 2 - 158, 28, MOON);
                if (!s.input.touchMode && !versus) d.text("Arrows move  Up, X or Z turn  Space drops  C holds", { x: v.width / 2, y: v.height / 2 - 136, size: 11, bold: true, font: FONT, color: DIM });
            }
        });

        function drawEnd(d) {
            const v = s.view, cx = v.width / 2, cy = v.height / 2, k = Math.min(1, (state.phase === "panel" ? 1 : state.endT));
            const f = you, win = match.winner === 0;
            const big = mode === "story" ? (win ? "Sweet dreams!" : "Wide awake...") :
                versus ? `Player ${match.winner + 1} wins!` : mode === "sprint" ? (win ? fmtTime(results.time ?? 0) : "Topped out") :
                    mode === "marathon" ? (f.lines >= 150 ? "All 15 levels!" : "Lights out") : "Time!";
            if (k < 1 && state.phase === "over") { inkText(d, big, cx, cy - 30, 34 * Math.min(1, state.endT * 5), win ? GOLD : CREAM); return; }
            const T = Math.min(1, state.panelT * 5), w = Math.min(322, v.width - 24), h = 190, y = cy - 18;
            d.rect(v.width * 2, v.height * 2, { x: cx, y: cy, color: INK, opacity: 0.45 * T });
            d.rect(w + 6, h + 6, { x: cx, y: y + 8 - (1 - T) * 40, color: INK, radius: 22, opacity: T });
            d.rect(w, h, { x: cx, y: y + 8 - (1 - T) * 40, color: PLUM, radius: 18, opacity: T });
            const top = y - 62 - (1 - T) * 40;
            inkText(d, big, cx, top, 28, win ? GOLD : CREAM, { opacity: T });
            if (mode === "story") {
                const q = d.quads("rivals"), i = RIVAL_KEYS.indexOf(rival.key);
                q(cx - 92, top + 62, 74, 74, 0, i * RIVAL_FRAMES + (win ? 2 : 0), 1, 1, 1, T);
                d.text(`"${win ? rival.lose : rival.win}"`, { x: cx + 34, y: top + 50, size: 13, bold: true, font: FONT, color: CREAM, maxWidth: 170, opacity: T, align: "center" });
                if (win) {
                    const fx = d.quads("fx");
                    for (let n = 0; n < 3; n++) fx(cx + 8 + n * 34, top + 92, 28, 28, 0, FX.star, n < results.stars ? 1 : 0.2, n < results.stars ? 1 : 0.2, n < results.stars ? 1 : 0.3, T);
                } else d.text((save.fails[rung] ?? 0) > 1 ? `${rival.name} is getting sleepy...` : `Lines ${f.lines}  Sent ${f.sent}`, { x: cx + 34, y: top + 92, size: 12, bold: true, font: FONT, color: DIM, opacity: T });
            } else if (versus) {
                const sc = results.score;
                inkText(d, `${sc[0]} - ${sc[1]}`, cx, top + 50, 34, MOON, { opacity: T });
                if (sc[0] >= 2 || sc[1] >= 2) d.text("Match!", { x: cx, y: top + 86, size: 16, bold: true, font: FONT, color: CREAM, opacity: T });
            } else {
                const best = results.best;
                inkText(d, mode === "sprint" ? `${f.lines} lines` : `${f.score}`, cx, top + 46, 30, CREAM, { opacity: T });
                d.text(mode === "sprint" ? `${f.pieces} animals, ${f.quads} stampedes` : `${f.lines} lines, ${f.quads} stampedes`, { x: cx, y: top + 76, size: 13, bold: true, font: FONT, color: DIM, opacity: T });
                if (best) inkText(d, "New best!", cx, top + 100, 17, GOLD, { opacity: T });
                else {
                    const b = mode === "sprint" ? (save.best.sprint ? `Best ${fmtTime(save.best.sprint)}` : "") : mode === "marathon" ? `Best ${save.best.marathon}` : `Today's best ${save.best.daily.score}`;
                    d.text(b, { x: cx, y: top + 98, size: 13, bold: true, font: FONT, color: DIM, opacity: T });
                }
            }
        }

        game.stack = { match, V, state, L: () => L, pilots, gest, coach, results, bot(o) { match.sides[0].brain = new Brain(o, seed + 5); } };
    });
}

