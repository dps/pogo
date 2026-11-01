// A level: the board, Morsel on its rim, the town behind him, and everything that happens when you win or lose.
import { pin, rect, tap, text, ui } from "./pogo.js";
import { CANDY, H, Match, N, W, isSpecial } from "./engine.js";
import { BoardView, CREAM, FONT, INK, inkText } from "./boardview.js";
import { ENDLESS, LEVELS, WORLDS } from "./levels.js";
import { Morsel } from "./monster.js";
import { Diorama, ensureWorld, PROPS, propState } from "./world.js";
import { NEWS, sizeOf } from "./news.js";
import { SHEET, SLOT } from "./art.js";
import { goalIcon, iconBuzz, iconPause, iconSound, jelly, roundIcon, sayBubble } from "./ui.js";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const WORDS_WIN = ["DELICIOUS!", "SCRUMPTIOUS!", "BURP!", "MORE!", "NOM NOM NOM!"];

export function growth(save) { return save.stars.filter(Boolean).length; }
/** How big Morsel stands in a given world. Each world's scenery is scaled so he starts small-ish and ends up absurd. */
export function sizeFor(world, beaten, room = 200) {
    const base = [50, 62, 76, 92, 106, 150][world], grow = [32, 40, 42, 44, 50, 74][world];
    return Math.min(room * 1.02, (base + grow * beaten / 12) * clamp(room / 165, 0.9, 1.75));
}
export function dressMorsel(m, total) {
    m.horn = Math.min(3, Math.floor(total / 18)); m.spikes = total >= 30;
}

export function makePlay(game, ctx) {
    return (s, args = {}) => {
        const { save, persist, sound } = ctx;
        game.touch.enabled = false;
        const nap = !!args.nap;
        const n = nap ? -1 : (args.level ?? 0), attempt = args.attempt ?? 0;
        const def0 = nap ? ENDLESS : LEVELS[n];
        const fails = nap ? 0 : (save.fails[n] ?? 0), mercy = Math.min(6, Math.floor(fails / 2) * 2);
        const def = { ...def0, moves: def0.moves + mercy };
        const world = nap ? Math.min(5, Math.floor(growth(save) / 12)) : def.world;
        const seed = attempt === 0 && !nap ? def.seed : ((def0.seed ?? 5) * 31 + attempt * 977 + (nap ? save.nap.candies : 0)) >>> 0;
        const m = new Match(def, seed);
        const monster = new Morsel(game, s);
        const beatenHere = nap ? 12 : Math.min(12, save.stars.slice(world * 12, world * 12 + 12).filter(Boolean).length);
        const dio = new Diorama(game, world, beatenHere);
        const total = growth(save);
        dressMorsel(monster, total);

        const host = {
            sound, monster, hintDelay: n === 0 ? 1.6 : n < 5 ? 5 : 8,
            onGrab() { sound.grab(); monster.lookTarget = { x: view.cx(0), y: view.cy(0) }; monster.mood("open", "o", 0.25); },
            onSelect() { sound.grab(); },
            onNudge() { sound.nope(); },
            onNope() { sound.nope(); monster.no(); },
            onMove() { lastMove = s.time; if (coach && coach.until > s.time + 1.5) coach.until = s.time + 1.5; },
            onSwallow() { sound.gulp(); if (nap && !monster.chew) {} },
            onExit() { sound.exit(); monster.mood("happy", "grin", 0.6); view.say("Safe!", 3.5, 7.5, "#7bea5a", 22, true); },
            onBurst(ph) {
                const c = ph.chain, size = ph.pops.length;
                if (nap) { sound.nap(c); if (c >= 1) game.haptic("tick"); }
                else {
                    sound.chain(c, size);
                    game.haptic(c === 0 ? (size >= 5 ? "medium" : "light") : c === 1 ? "medium" : c === 2 ? [14, 26, 18] : c === 3 ? "heavy" : [20, 24, 30, 24, 40]);
                    if (c >= 2) s.shake(1.5 + c * 1.1, 0.14, { haptic: false });
                    if (c >= 3) { s.freeze(0.035); monster.mood("star", "wide", 0.7); s.flash("#ffffff22", 0.06); }
                    else if (c >= 1) monster.mood("happy", "grin", 0.5);
                    monster.kick(1 + c * 0.7);
                }
                if (nap) { save.nap.candies += ph.feed; if (ph.chain === 0) ctx.persistSoon(); }
                save.sugar += ph.feed;
            },
            chompAt(i) {
                view.aiming = false;
                const ph = m.chomp(i);
                if (ph) view.run(ph);
            },
            boardChomp(ph) {
                const x = view.cx(ph.i), y = view.cy(ph.i);
                const home = { x: monster.x, y: monster.y };
                monster.mood("wide", "wide", 0.5);
                const save0 = monster.size;
                monster.leapTo(x, y + monster.size * 0.4, 0.3, 90, () => {
                    sound.chomp(); s.shake(10, 0.28, { haptic: false }); s.freeze(0.08);
                    game.haptic([30, 20, 50]);
                    view.wobble(x, y, 6, 6);
                    view.rings_(x, y);
                    monster.chew = 0.7; monster.mood("happy", "chew", 0.7);
                    monster.fatV += 2.5;
                    s.wait(0.16, () => monster.leapTo(layout.mx, layout.my, 0.32, 70, () => { monster.sqV -= 3; }));
                });
                void home; void save0;
                return 0.33;
            },
            boardBite(ph) {
                const i = ph.cells[0], x = view.cx(i), y = view.cy(i);
                monster.mood("wide", "wide", 0.5);
                sound.roar();
                monster.leapTo(x, y + monster.size * 0.1, 0.3, 50, () => {
                    sound.chomp(); s.shake(9, 0.3, { haptic: false }); game.haptic("heavy");
                    monster.chew = 0.6;
                    view.rings_(x, y);
                    view.say("CHOMP", 3.5, 3.5, "#ff5c80", 26, true);
                    s.wait(0.12, () => monster.leapTo(layout.mx, layout.my, 0.34, 60, () => {}));
                });
                return 0.5;
            },
            pickHint() { return pickHint(m); },
        };
        const view = new BoardView(game, s, m, host);
        view.rings_ = (x, y) => { view.rings.push({ x, y, t: 0, life: 0.35, r: view.cs * 4, color: "#ffffff" }); };
        game.sugar = { get m() { return m; }, view, monster, get phase() { return stage; }, finish: () => cheatWin(), host };

        let stage = "play", ended = false, helped = false, coach = null, lastMove = 0, lowWarned = false, zoom = 1, zoomX = 0, zoomY = 0, boardShift = 0, newsT = -1, news = null, readyShown = false, rushing = false, overlay = null, intro = 0, bannerText = null, dreamT = 0;

        const layout = { mx: 0, my: 0, portrait: true };
        function doLayout() {
            const v = s.view, sa = v.safe, wide = v.width > v.height;
            layout.portrait = !wide;
            if (!wide) {
                const top = sa.top, bottom = v.height - sa.bottom - 12;
                const cs = Math.min((v.width - 22) / W, (bottom - top - 176) / H), bw = cs * W, bh = cs * H, ox = (v.width - bw) / 2, oy = bottom - bh;
                view.layout(ox, oy, cs);
                dio.place(0, 0, v.width, v.height, oy - 7);
                layout.mx = v.width * 0.5; layout.my = oy - 7;
                layout.room = oy - top - 34;
                layout.gauge = { x: 12, y: oy - 22, w: v.width * 0.5 - 50 };
            } else {
                const top = sa.top + 8, bottom = v.height - sa.bottom - 10;
                const cs = Math.min((bottom - top) / H, (v.width * 0.58) / W), bw = cs * W, bh = cs * H, ox = v.width - sa.right - bw - 12, oy = (top + bottom - bh) / 2;
                view.layout(ox, oy, cs);
                const panel = ox - 10;
                dio.place(0, 0, panel, v.height, v.height * 0.8); dio.skyWidth = v.width;
                layout.mx = panel * 0.56 + sa.left * 0.5; layout.my = v.height * 0.8;
                layout.room = v.height * 0.62;
                layout.gauge = { x: sa.left + 14, y: v.height - sa.bottom - 28, w: panel - sa.left - 28 };
            }
            if (!monster.leap && !monster.walk && stage === "play") { monster.x = layout.mx; monster.y = layout.my; }
            monster.size = sizeFor(world, beatenHere, layout.room);
        }
        doLayout();
        s.on("resize", doLayout);
        s.on("leave", () => ctx.flush());
        ctx.useSong(nap ? "nap" : WORLDS[world].key);

        if (nap) { monster.sleeping = true; }
        const say = (t, life = 6) => { coach = { text: t, until: s.time + life }; };
        const kicker = def.say;
        s.wait(0.7, () => {
            if (kicker) say(kicker, 8);
            else if (mercy) say(`I saved you ${mercy} extra moves. Tiny ones.`, 4);
        });
        if (n % 12 === 0 && n >= 0 && attempt === 0) { bannerText = `${WORLDS[world].name}`; intro = 1.7; }

        // Settings and pause, as a real overlay.
        const pauseBtn = s.add([pin("top-left", [6, 6]), rect(46, 46, { color: "#00000000" }), tap(() => togglePause()), "ui", { draw(d) { roundIcon(d, "#ff77a8"); iconPause(d); } }]);
        function togglePause() {
            if (ended && stage !== "lost") return;
            if (overlay) { closeOverlay(); return; }
            sound.ui();
            s.paused = true;
            const list = [];
            const add = (e) => { list.push(e); return e; };
            const col = (y) => pin("center", [0, y]);
            add(s.add([col(0), rect(1, 1, { color: "#00000000" }), { layer: 90, draw(d) { d.rect(2000, 2000, { color: "#2a1038", opacity: 0.66 }); d.rect(278, nap ? 290 : 340, { color: INK, radius: 26, y: 2 }); d.rect(266, nap ? 278 : 328, { color: CREAM, radius: 22, y: 0 }); d.text(nap ? "Nap Time" : `Level ${n + 1}`, { y: nap ? -112 : -136, size: 24, bold: true, font: FONT, color: INK }); if (!nap) d.text(def.name, { y: -112, size: 15, bold: true, font: FONT, color: "#a1558f" }); } }]));
            const btn = (label, y, fn, o = {}) => add(s.add([col(y), jelly(label, { width: 210, height: 48, onTap: fn, ...o }), { layer: 91 }]));
            const base = nap ? -56 : -66;
            btn("Keep playing", base, () => closeOverlay(), { action: "pause", color: "#2fd6b0", deep: "#128a78" });
            if (!nap) btn("Start over", base + 60, () => { closeOverlay(); game.go("play", { level: n, attempt: attempt + 1 }, { fade: 0.2 }); }, { color: "#ffb03a", deep: "#c8741a" });
            btn(nap ? "Wake him up" : "Town map", base + (nap ? 60 : 120), () => { closeOverlay(); ctx.flush(); game.go(nap ? "title" : "map", nap ? {} : { world }, { fade: 0.2 }); });
            const toggle = (x, get, flip, icon) => add(s.add([pin("center", [x, base + (nap ? 124 : 182)]), rect(50, 50, { color: "#00000000" }), tap(() => { flip(); ctx.persist(); sound.ui(); }), { layer: 91, draw(d) { roundIcon(d, "#2fb8a8", get()); icon(d, get()); } }]));
            toggle(-40, () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; }, iconSound);
            toggle(40, () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); }, iconBuzz);
            overlay = list;
        }
        function closeOverlay() { overlay?.forEach((e) => e.destroy()); overlay = null; s.paused = false; }

        function cheatWin() { for (const g of m.goals) { if (g.t === "c") m.counts.c[g.c] += g.n; if (g.t === "folk") m.folkDone = g.n; if (g.t === "mallow") m.counts.mallow += g.n; } m.frost.fill(0); m.cookie.fill(0); m.fudge.fill(0); m.cage.fill(0); view.vis.frost.fill(0); view.vis.cookie.fill(0); view.vis.fudge.fill(0); view.vis.cage.fill(0); m.won = true; }

        // --- The end of a level ------------------------------------------------------------------------------
        function startWin() {
            ended = true; stage = "rush"; view.locked = true; view.sel = -1; view.cursor = -1; view.hint = null; view.aiming = false;
            const word = WORDS_WIN[(n + 5) % WORDS_WIN.length];
            bannerText = word; intro = 1.2;
            sound.win(); monster.mood("star", "wide", 1.2); monster.kick(5);
            s.flash("#ffffff55", 0.16);
            s.wait(0.5, () => { const ph = m.finale(); rushing = true; view.run(ph); });
        }
        function stars() {
            const t = def.stars;
            return helped ? 1 : m.score >= t[2] ? 3 : m.score >= t[1] ? 2 : 1;
        }
        function afterRush() {
            rushing = false;
            const first = !save.stars[n], got = stars();
            save.stars[n] = Math.max(save.stars[n] ?? 0, got);
            save.best[n] = Math.max(save.best[n] ?? 0, m.score);
            save.fails[n] = 0;
            persist();
            stage = "ruin";
            const l = n % 12, j = Math.floor(l / 2), st = (l % 2) + 1;
            s.tween(host_, { shift: 1 }, 0.45, { ease: "inQuad" });
            if (!first) { s.wait(0.5, () => showNews(got, first)); return; }
            const v = s.view, room = v.width > v.height;
            const target = dio.propX(j), gy = layout.my;
            zoomX = room ? dio.width * 0.5 + (target - dio.width * 0.5) * 0.5 : v.width / 2 + (target - v.width / 2) * 0.72; zoomY = gy;
            s.tween(host_, { zoom: room ? 1.3 : 1.4, k: 1, lift: room ? 20 : v.height * 0.62 - gy }, 0.5, { ease: "outCubic" });
            s.wait(0.4, () => ruinAct(j, st, target, () => s.wait(0.55, () => { s.timeScale = 1; showNews(got, first); })));
        }
        const host_ = { zoom: 1, shift: 0, k: 0, lift: 0 };
        function ruinAct(j, st, tx, done) {
            const dir = tx < monster.x ? 1 : -1, reach = dio.propSize() * 0.36 + monster.size * 0.4, verb = st === 1 ? "chomp" : ["stomp", "sit", "chomp", "tail"][(world + j) % 4];
            const float = PROPS[world][j].float;
            const impact = () => {
                dio.extra.set(j, st); dio.hit(j); sound.wreck();
                s.shake(st === 2 ? 11 : 6, 0.32, { haptic: false }); s.freeze(0.08);
                game.haptic(st === 2 ? [40, 30, 70] : "heavy");
                const size = dio.propSize();
                for (let i = 0; i < (st === 2 ? 24 : 12); i++) view.crumb(dio.propX(j), layout.my - size * (float ? 0.9 : 0.5));
                monster.chew = 0.8;
                monster.mood("happy", st === 2 ? "grin" : "chew", 1.4); monster.kick(3);
                bannerText = null;
            };
            const after = () => { monster.flip = 1; growUp(); s.wait(0.15, done); };
            monster.walkTo(tx + dir * reach, 0.42, () => {
                monster.flip = -dir;
                monster.lookTarget = { x: tx, y: layout.my - 40 };
                if (verb === "stomp" || verb === "sit") {
                    sound.roar();
                    monster.mood("wide", "wide", 0.5);
                    monster.leapTo(tx, layout.my, 0.42, 70 + monster.size * 0.6, () => { sound.stomp(); impact(); s.wait(verb === "sit" ? 0.65 : 0.35, () => { monster.leapTo(tx + dir * reach, layout.my, 0.3, 40, after); }); });
                } else if (verb === "tail") {
                    monster.flip = dir;
                    sound.roar();
                    s.wait(0.2, () => { monster.tilt(-14 * dir); s.wait(0.12, () => { impact(); s.wait(0.5, after); }); });
                } else {
                    monster.mood("wide", "wide", 0.34);
                    monster.tilt(5 * -dir);
                    s.wait(0.32, () => { sound.chomp(); monster.tilt(-9 * -dir); impact(); s.wait(0.5, after); });
                }
            });
        }
        function growUp() {
            const next = sizeFor(world, Math.min(12, beatenHere + 1), layout.room);
            s.tween(monster, { size: next }, 0.4, { ease: "outBack" });
            monster.kick(6); sound.burp(); monster.mood("happy", "grin", 1);
            dressMorsel(monster, growth(save));
            monster.belly.length = Math.min(monster.belly.length, 6);
        }
        function showNews(got, first) {
            stage = "news"; newsT = 0; sound.paper();
            s.add([ui(), { layer: 50, draw(d) { drawNews(d); } }]);
            news = { got, first, text: NEWS[n] ?? "Monster Still Hungry", size: sizeOf(Math.max(0, n)), clear: n % 12 === 11 ? `Morsel has outgrown ${WORLDS[world].name}` : null, j: Math.floor((n % 12) / 2), st: (n % 2) + 1, shown: 0 };
            [0, 1, 2].forEach((i) => { if (i < got) s.wait(0.5 + i * 0.28, () => { sound.star1(i); news.shown = i + 1; s.shake(1.5 + i, 0.1, { haptic: false }); }); });
            const v = s.view, wide = v.width > v.height, y = wide ? 164 : 214;
            s.wait(0.55, () => {
                const cont = () => {
                    const last = n === LEVELS.length - 1;
                    if (last && first) game.go("finale", {}, { fade: 0.4 });
                    else if (last) game.go("map", { world: 5 }, { fade: 0.3 });
                    else game.go("play", { level: n + 1 }, { fade: 0.3 });
                };
                s.add([pin("center", [wide ? 60 : 44, y]), jelly(n === LEVELS.length - 1 ? "Finish him" : "Next", { width: 152, height: 52, onTap: cont, action: "confirm", color: "#2fd6b0", deep: "#128a78", textSize: 22 }), { layer: 60 }]);
                s.add([pin("center", [wide ? -106 : -102, y]), jelly("Map", { width: 104, height: 52, onTap: () => game.go("map", { world }, { fade: 0.3 }), color: "#b078e8", deep: "#6a3cb0" }), { layer: 60 }]);
            });
        }
        function startLose() {
            ended = true; stage = "lost"; view.locked = true; view.hint = null;
            save.fails[n] = (save.fails[n] ?? 0) + 1; persist();
            sound.lose(); monster.mood("sad", "frown", 99); monster.sweatOff = true;
            s.wait(0.5, () => monster.float("tear", { x: -14, y: 10, vy: 30, size: 16, life: 1.2 }));
            const v = s.view, wide = v.width > v.height, y0 = wide ? 66 : 150, cy0 = y0 - 62;
            s.add([pin("center", [wide ? v.width * 0.2 : 0, cy0 + 28]), rect(1, 1, { color: "#00000000" }), { layer: 58, draw(d) {
                if (helped2) return;
                d.rect(3000, 3000, { color: "#2a1038", opacity: 0.45 });
                d.rect(300, 296, { color: INK, radius: 26, y: 12 }); d.rect(288, 284, { color: CREAM, radius: 22, y: 10 });
                d.text("Still hungry...", { y: -104, size: 25, bold: true, font: FONT, color: INK });
                const left = m.goals.filter((g) => m.remaining(g) > 0), gap = 62, x0 = -(left.length - 1) * gap / 2;
                left.forEach((g, i) => { goalIcon(d, g, x0 + i * gap, -66, 34); d.text(m.remaining(g), { x: x0 + i * gap, y: -38, size: 15, bold: true, font: FONT, color: "#a1558f" }); });
            } }]);
            const list = [];
            list.push(s.add([pin("center", [wide ? v.width * 0.2 : 0, cy0 + 24]), jelly("Try again", { width: 232, height: 50, onTap: () => game.go("play", { level: n, attempt: attempt + 1 }, { fade: 0.2 }), action: "confirm", color: "#2fd6b0", deep: "#128a78", textSize: 22 }), { layer: 60 }]));
            if (!helped) list.push(s.add([pin("center", [wide ? v.width * 0.2 : 0, cy0 + 82]), jelly("Second helping: +5 moves", { width: 232, height: 40, textSize: 15, color: "#ffb03a", deep: "#c8741a", onTap: () => {
                helped = true; helped2 = true; list.forEach((e) => e.destroy());
                s.entities.filter((e) => e.layer === 58).forEach((e) => e.destroy());
                m.addMoves(5); m.begin(); m.ensureMoves(); view.run(m.phases);
                view.snap = { ...view.snap, moves: m.moves };
                monster.mood("happy", "grin", 1); monster.moodT = 1; sound.ready();
                save.fails[n] = Math.max(0, save.fails[n] - 1); persist();
                ended = false; stage = "play"; view.locked = false; helped2 = false;
                say("Free seconds. Only one star, though.", 3);
            } }), { layer: 60 }]));
            list.push(s.add([pin("center", [wide ? v.width * 0.2 : 0, cy0 + 134]), jelly("Map", { width: 108, height: 36, textSize: 15, color: "#b078e8", deep: "#6a3cb0", onTap: () => game.go("map", { world }, { fade: 0.3 }) }), { layer: 60 }]));
            void v;
        }
        let helped2 = false;

        // --- Each step ----------------------------------------------------------------------------------------
        s.onUpdate((dt) => {
            sound.tick();
            monster.update(dt);
            dio.update(dt);
            const speed = rushing && s.input.pointer.down ? 4 : rushing ? 2 : 1;
            if (stage === "ruin" && s.input.pointer.pressed) s.timeScale = 3;
            view.update(dt * speed);
            if (intro > 0) intro -= dt;
            if (stage === "play") {
                const inp = s.input, ptr = inp.pointer;
                if (!ended) {
                    const onMonster = ptr.pressed && monster.contains(ptr.x, ptr.y) && view.cellAt(ptr.x, ptr.y) < 0;
                    const wantChomp = (onMonster || inp.pressed("chomp")) && !nap;
                    if (view.aiming) {
                        if (wantChomp || (ptr.pressed && view.cellAt(ptr.x, ptr.y) < 0)) { view.aiming = false; view.aim = -1; sound.ui(); }
                        else if (inp.pressed("confirm") && view.cursor >= 0) host.chompAt(view.cursor);
                        else view.input(inp);
                    } else if (wantChomp && view.idle) {
                        if (m.chompReady) { view.aiming = true; view.aim = 3 + 4 * W; sound.arm(); monster.mood("wide", "wide", 0.7); say("Pick a spot on the board!", 2.5); }
                        else { monster.kick(4); monster.mood("happy", "grin", 0.4); sound.mallow(); if (!coach) say(`Feed me ${Math.max(1, m.feedNeed - m.feed)} more candy!`, 2); }
                    } else if (onMonster && nap) { monster.kick(2); monster.float("zed", { x: 26, size: 16 }); sound.nap(2); }
                    else view.input(inp);
                }
                if (inp.pressed("pause")) togglePause();
                const snap = view.snap;
                monster.ready = !nap && m.chompReady && view.idle && !ended ? 1 : 0;
                if (m.chompReady && !readyShown && view.idle && !nap) {
                    readyShown = true; sound.ready(); monster.kick(5); s.flash("#ffffff33", 0.1);
                    if (!save.tip) { save.tip = 1; persist(); } say("I'm full! Tap me!", 4);
                }
                if (!m.chompReady) readyShown = false;
                if (!nap && snap.moves <= 3 && !lowWarned && view.idle && !m.won) { lowWarned = true; monster.mood("wide", "o", 0.8); game.haptic("warn"); }
                if (!nap && snap.moves <= 3 && !m.won) { dreamT += dt; if (dreamT > 1.1) { dreamT = 0; monster.float("sweat", { x: 26, y: 12, vx: 26, vy: -10, size: 13, life: 0.8 }); } }
                if (view.idle && !ended) {
                    if (m.won) startWin();
                    else if (m.lost) startLose();
                    else if (!nap && m.moves <= 0 && m.chompReady && !coach) say("One last bite! Tap me!", 99);
                }
                if (nap) {
                    dreamT += dt;
                    if (dreamT > 3.2) { dreamT = 0; monster.float("zed", { x: 22 + game.fxRng.next() * 10, vx: 14, size: 15, life: 2 }); }
                    if (m.chompReady && view.idle) { m.feed -= m.feedNeed; save.nap.dreams++; ctx.persistSoon(); sound.chime(save.nap.dreams); view.say("A sweet dream!", 3.5, 3, "#ffe9a8", 20, true); s.flash("#b8a8ff22", 0.4); game.haptic("light"); }
                }
            }
            if (stage === "rush" && rushing && view.idle) afterRush();
            if (newsT >= 0) newsT += dt;
            if (coach && s.time > coach.until) coach = null;
            zoom = host_.zoom; boardShift = host_.shift;
        });

        function withZoom(d, fn) {
            if (zoom === 1 && !host_.k) { fn(); return; }
            const v = s.view;
            d.push(); d.translate(zoomX + (v.width / 2 - zoomX) * host_.k, zoomY + host_.lift); d.scale(zoom); d.translate(-zoomX, -zoomY); fn(); d.pop();
        }

        s.onDraw((d) => {
            withZoom(d, () => { dio.drawSky(d); if (nap) drawNight(d); dio.drawProps(d); monster.shadow(d); });
            if (nap) d.rect(s.view.width * 2, s.view.height * 2, { color: "#1c1250", opacity: 0.34 });
            if (boardShift < 1) {
                d.push(); d.translate(0, boardShift * s.view.height * 0.9);
                view.drawBoard(d); view.drawBlocks(d);
                if (boardShift === 0) view.drawPiecesClipped(d); else view.drawPieces(d);
                d.pop();
            }
            withZoom(d, () => { monster.draw(d); });
            withZoom(d, () => view.drawFx(d));
            view.drawWords(d);
            if (view.hint && !view.aiming && (n === 0 || n < 3)) drawFinger(d);
        });
        function drawNight(d) {
            d.rect(dio.width * 2, dio.height * 2, { color: "#17114a", opacity: 0.72 });
            const stars = Math.min(120, 18 + save.nap.dreams * 3);
            d.additive(() => {
                for (let i = 0; i < stars; i++) {
                    const x = ((i * 137.5) % 100) / 100 * dio.width, y = ((i * 73.1) % 100) / 100 * (dio.ground - 30), tw = Math.sin(s.time * 1.2 + i) * 0.4 + 0.6;
                    d.sprite(SHEET, { frame: SLOT.spark, x, y, width: 9 + (i % 4) * 3, height: 9 + (i % 4) * 3, opacity: tw * 0.85, color: i % 5 === 0 ? "#ffe9a8" : "#ffffff" });
                }
            });
            d.circle(26, { x: dio.width * 0.82, y: 92, color: "#fff4cf" });
            d.circle(24, { x: dio.width * 0.82 + 9, y: 86, color: "#3a2f78" });
        }
        function drawFinger(d) {
            const h = view.hint, k = (s.time * 0.9) % 1, e = k < 0.2 ? 0 : k > 0.8 ? 1 : (k - 0.2) / 0.6;
            const x = view.cx(h[0]) + (view.cx(h[1]) - view.cx(h[0])) * e, y = view.cy(h[0]) + (view.cy(h[1]) - view.cy(h[0])) * e;
            const a = Math.min(k / 0.1, (1 - k) / 0.1, 1);
            d.circle(16, { x, y: y + 2, color: INK, opacity: 0.4 * a }); d.circle(14, { x, y, color: "#ffffff", opacity: 0.92 * a }); d.circle(7, { x, y, color: "#ff77a8", opacity: 0.9 * a });
        }

        s.onDrawUI((d) => {
            const v = s.view, sa = v.safe, snap = view.snap;
            if (stage === "play" || stage === "lost" || stage === "rush") {
                if (nap) drawNapHud(d); else drawHud(d, snap);
            }
            if (coach && stage === "play") {
                const wide = !layout.portrait, w = Math.min(200, wide ? dio.width - 30 : 210), bx = wide ? dio.width / 2 : clamp(monster.x + (monster.x > v.width / 2 ? -30 : 30), w / 2 + 8, v.width - w / 2 - 8);
                sayBubble(d, bx, monster.y - monster.size - 30, coach.text, clamp(monster.x - bx, -w / 2 + 16, w / 2 - 16), w);
            }
            if (intro > 0 && bannerText) {
                const k = clamp((1.7 - intro) / 0.2), a = clamp(intro / 0.25), pop = 1 + (1 - k) * 0.6;
                d.push(); d.translate(layout.portrait ? v.width / 2 : view.ox + view.width / 2, view.oy + view.height * 0.42); d.scale(pop);
                inkText(d, bannerText, { size: 38, color: "#ffe14f", opacity: a * k, maxWidth: 330 });
                d.pop();
            }
            void sa;
        });

        function drawHud(d, snap) {
            const v = s.view, sa = v.safe, wide = !layout.portrait;
            const panelW = wide ? view.ox - sa.left - 20 : v.width;
            const left = sa.left + 58;
            // Moves: a fat jelly badge that ticks.
            const mvX = left + 26, mvY = sa.top + 31, low = snap.moves <= 3, pulse = low ? 1 + Math.sin(s.time * 8) * 0.06 : 1;
            d.push(); d.translate(mvX, mvY); d.scale(pulse);
            d.circle(29, { color: INK, y: 1.5 }); d.circle(26, { color: low ? "#ff5c80" : "#2fd6b0" }); d.circle(21, { color: "#ffffff", opacity: 0.16, y: -5 });
            d.text(snap.moves, { y: -3, size: 25, bold: true, font: FONT, color: "#fff" });
            d.text("moves", { y: 14, size: 10.5, bold: true, font: FONT, color: "#fff" });
            d.pop();
            // Goals.
            const goals = m.goals, gw = Math.min(62, (panelW - (mvX + 34 - sa.left) - 8) / goals.length), gx0 = mvX + 34 + gw / 2, gy = sa.top + 31;
            d.rect(gw * goals.length + 7, 57, { x: gx0 + gw * (goals.length - 1) / 2, y: gy + 1.5, color: INK, radius: 19 });
            d.rect(gw * goals.length + 1, 51, { x: gx0 + gw * (goals.length - 1) / 2, y: gy, color: CREAM, radius: 16 });
            goals.forEach((g, i) => {
                const left = snap.left[i], x = gx0 + i * gw;
                goalIcon(d, g, x, gy - 7, 31);
                if (left > 0) inkText(d, left, { x, y: gy + 15, size: 14, ink: 1.5 });
                else d.sprite(SHEET, { frame: SLOT.star1, x: x + 10, y: gy + 12, width: 19, height: 19 });
            });
            if (stage === "lost" || overlay) return;
            // Tummy meter and score on the rim.
            const g = layout.gauge, fill = clamp(snap.feed / m.feedNeed), ready = m.chompReady;
            d.rect(g.w + 6, 15, { x: g.x + g.w / 2, y: g.y, color: INK, radius: 8 });
            d.rect(g.w, 9, { x: g.x + g.w / 2, y: g.y, color: "#7a4b86", radius: 5 });
            if (fill > 0.02) { d.rect(Math.max(9, g.w * fill), 9, { x: g.x + g.w * fill / 2, y: g.y, color: ready ? "#ffe14f" : "#ff77a8", radius: 5 }); d.rect(Math.max(6, g.w * fill - 4), 3, { x: g.x + g.w * fill / 2, y: g.y - 2, color: "#ffffff", opacity: 0.5, radius: 2 }); }
            inkText(d, ready ? "Tap Morsel!" : "Tummy", { x: g.x + g.w / 2, y: g.y - 13, size: 11.5, ink: 1.4, color: ready ? "#ffe14f" : "#fff" });
            const sw = wide ? 0 : Math.min(130, v.width * 0.36), sx = wide ? 0 : v.width - 12 - sw;
            if (!wide) {
                inkText(d, snap.score.toLocaleString("en-US"), { x: sx + sw / 2, y: g.y - 13, size: 13.5, ink: 1.5 });
                drawStarBar(d, sx, g.y, sw, snap.score);
            } else {
                const by = g.y - 30;
                inkText(d, snap.score.toLocaleString("en-US"), { x: g.x + 30, y: by, size: 14, ink: 1.5 });
                drawStarBar(d, g.x + 66, by, g.w - 66, snap.score);
            }
        }
        function drawStarBar(d, x, y, w, score) {
            const t = def.stars, top = t[2] * 1.12, fill = clamp(score / top);
            d.rect(w + 6, 13, { x: x + w / 2, y, color: INK, radius: 7 });
            d.rect(w, 7, { x: x + w / 2, y, color: "#7a4b86", radius: 4 });
            if (fill > 0.01) d.rect(Math.max(7, w * fill), 7, { x: x + w * fill / 2, y, color: "#ffc93a", radius: 4 });
            for (const q of t) d.sprite(SHEET, { frame: score >= q ? SLOT.star1 : SLOT.star0, x: x + w * q / top, y, width: 15, height: 15 });
        }
        function drawNapHud(d) {
            const v = s.view, sa = v.safe;
            inkText(d, "Nap Time", { x: v.width / 2 - (layout.portrait ? 0 : 150), y: sa.top + 22, size: 20, color: "#e8e0ff", inkColor: "#241a60", ink: 2 });
            inkText(d, `${save.nap.dreams} dreams  ·  ${save.nap.candies.toLocaleString("en-US")} candy`, { x: v.width / 2 - (layout.portrait ? 0 : 150), y: sa.top + 44, size: 12.5, color: "#c8c0f0", inkColor: "#241a60", ink: 1.4 });
        }

        function drawNews(d) {
            const v = s.view, wide = v.width > v.height, k = clamp(newsT / 0.45), e = 1 - (1 - k) * (1 - k) * (1 - k);
            const ww = wide ? 372 : 312, hh = wide ? 236 : 280, cx = v.width / 2, cy = v.height / 2 + (wide ? -38 : -50);
            d.rect(v.width * 2, v.height * 2, { x: cx, y: v.height / 2, color: "#2a1038", opacity: 0.45 * k });
            d.push(); d.translate(cx, cy + (1 - e) * -v.height * 0.2); d.rotate((1 - e) * 7 - 0.025); d.scale(0.2 + e * 0.8);
            d.rect(ww + 8, hh + 8, { y: 3, color: INK, radius: 7 });
            d.rect(ww, hh, { color: "#f8f0dc", radius: 4 });
            d.text("THE DAILY CRUMB", { y: -hh / 2 + 22, size: 22, bold: true, font: "Georgia, 'Times New Roman', serif", color: INK });
            d.rect(ww - 24, 2, { y: -hh / 2 + 40, color: INK });
            d.text(news.clear ?? `Pudding County  ·  Morsel now the size of ${/^[aeiou]/.test(news.size) ? "an" : "a"} ${news.size}`, { y: -hh / 2 + 50, size: 11, font: "Georgia, serif", color: "#6b4a6e", maxWidth: ww - 20 });
            d.rect(ww - 24, 1, { y: -hh / 2 + 60, color: INK });
            const picW = wide ? 104 : 112, top = -hh / 2 + 66, picX = -ww / 2 + 14 + picW / 2, picY = top + picW / 2 + 4;
            d.rect(picW + 4, picW + 4, { x: picX, y: picY, color: INK, radius: 3 });
            d.rect(picW, picW, { x: picX, y: picY, color: "#bfe6ff" });
            d.sprite(`props${world}`, { frame: news.j + news.st * 6, x: picX, y: picY, width: picW - 6, height: picW - 6 });
            const tx = picX + picW / 2 + (ww / 2 - 12 - picX - picW / 2) / 2;
            d.text(news.text, { x: tx, y: picY - 6, size: wide ? 20 : 19, bold: true, font: "Georgia, 'Times New Roman', serif", color: INK, maxWidth: ww - picW - 38, align: "left", lineHeight: 1.08 });
            const sy = hh / 2 - 38;
            for (let i = 0; i < 3; i++) { const on = i < news.shown; d.sprite(SHEET, { frame: on ? SLOT.star1 : SLOT.star0, x: (i - 1) * 50, y: sy - (i === 1 ? 6 : 0), width: on ? 50 : 42, height: on ? 50 : 42 }); }
            d.pop();
            inkText(d, `Score ${m.score.toLocaleString("en-US")}`, { x: cx, y: cy + hh / 2 + 18, size: 16, ink: 1.6 });
        }
        void pauseBtn; void ensureWorld; void propState; void CANDY; void N; void isSpecial; void text;
    };
}

/** The clearest move for a nudge: specials, then whatever hits a goal, otherwise the lowest. */
export function pickHint(m) {
    const list = m.legal();
    if (!list.length) return null;
    let best = list[0], top = -1;
    for (const mv of list) {
        const t = m.clone();
        const c = t.counts.candies, s = t.counts.specials;
        const before = m.goals.map((g) => m.remaining(g));
        t.play(mv[0], mv[1]);
        let v = (t.counts.specials - s) * 3 + (t.counts.candies - c) * 0.3;
        t.goals.forEach((g, i) => { v += (before[i] - t.remaining(g)) * 1.5; });
        if (v > top) { top = v; best = mv; }
    }
    return best;
}
