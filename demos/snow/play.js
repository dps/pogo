// One puzzle: input, undo, hints, winning. Every rule lives in rules.js and every picture in view.js.
import { color, pin, sprite, text, ui } from "./pogo.js";
import { BALLS, DIR_LETTERS, countSnowmen, gateOpen, move, newState, parseLevel, placeKey, solved, walkPath } from "./rules.js";
import { BY_ID } from "./levels.js";
import { HintSearch } from "./solver.js";
import { LevelView } from "./view.js";
import { THEMES, applyTheme } from "./themes.js";
import { iconButton, settingsPanel } from "./ui.js";
import { SOLUTIONS } from "./solutions.js";

const STEP_GAP = 0.118;
const SONG = ["morning", "morning", "noon", "noon", "dusk", "dusk", "night", "night"];

/** Boards on the stored solution, so hints can rejoin it from anywhere nearby. */
function solutionBoards(lvl, moves) {
    const map = new Map(), st = newState(lvl);
    map.set(placeKey(lvl, st), { i: 0 });
    const plan = [];
    for (const ch of moves ?? "") {
        const d = DIR_LETTERS.indexOf(ch), stand = st.p, info = move(lvl, st, d);
        if (!info) break;
        if (info.kind !== "walk") { plan.push([stand, d]); map.set(placeKey(lvl, st), { i: plan.length }); }
    }
    return { map, plan };
}

export function makeSnowfall(s, density, view = () => s.view) {
    const flakes = [];
    const n = Math.round(26 + 60 * density), R = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < n; i++) flakes.push({ x: R(0, 1), y: R(0, 1), z: R(0.35, 1), p: R(0, 6.28) });
    return (d, dt) => {
        const v = view(), put = d.quads("flake");
        for (const f of flakes) {
            f.y += dt * 0.035 * f.z * 1.6; f.p += dt;
            f.x += dt * (0.008 + Math.sin(f.p) * 0.012);
            if (f.y > 1.03) { f.y = -0.03; f.x = R(0, 1); }
            if (f.x > 1.03) f.x -= 1.06;
            const size = 3 + f.z * 5;
            put(f.x * v.width, f.y * v.height, size, size, 0, 0, 1, 1, 1, 0.3 + f.z * 0.45);
        }
    };
}

export function playScene(game, app) {
    game.scene("play", (s, args) => {
        game.touch.enabled = false;
        const def = BY_ID.get(args.id), lvl = parseLevel(def), theme = THEMES[def.region % THEMES.length], snd = app.sound;
        applyTheme(s, theme);
        app.sound.play(SONG[def.region % SONG.length]);
        const view = new LevelView(game, s, lvl, theme, { seed: Number(args.id.slice(1)) || 0, onFoot: null });
        const stored = solutionBoards(lvl, SOLUTIONS[args.id]?.moves);
        const par = SOLUTIONS[args.id]?.pushes ?? 0;
        let st = newState(lvl), history = [], pushes = 0, gap = 0, queue = [], auto = [], won = false, hintsUsed = 0, bumped = 0;
        let hint = null, search = null, deadCheck = null, dead = false, thinking = 0, firstMove = false, moves = 0, winT = 0;
        view.sync(st);
        game.data.level = args.id; game.data.pushes = 0; game.data.won = false; game.data.undos = 0;

        const landscape = () => s.view.width > s.view.height * 1.15;
        const fit = () => {
            const v = s.view, sf = v.safe;
            if (landscape()) view.frame(sf.top + 14, sf.bottom + 14, sf.left + 76, sf.right + 76, 1.08);
            else view.frame(sf.top + 64, sf.bottom + 104, sf.left + 12, sf.right + 12);
        };
        fit();
        s.on("resize", fit);

        // ---- Undo and restart -------------------------------------------------------------
        const clearHint = () => { hint = null; search = null; };
        function undo() {
            if (won || !history.length) { if (!won) snd.bump(); return; }
            const h = history.pop();
            st = { c: h.c, p: h.p }; pushes = h.pushes;
            view.terrain.rewind(h.stamps);
            view.sync(st);
            afterChange(); snd.undo();
            game.data.undos++;
        }
        function restart() {
            if (won) return;
            if (!history.length && st.p === lvl.player) return;
            history = []; st = newState(lvl); pushes = 0; queue = []; auto = [];
            view.terrain.rewind(0);
            view.sync(st); afterChange(); snd.restart();
            s.burst({ at: [view.wx(lvl.w / 2), 0.5, view.wz(lvl.h / 2)], count: 26, color: ["#ffffff", "#dfe8ff"], speed: [0.5, 2], life: [0.3, 0.9], size: [0.04, 0.09], gravity: 2, dim: 3 });
        }
        function afterChange() {
            clearHint(); auto = []; queue = []; gap = 0.03; dead = false; view.mole.worried = 0;
            game.data.pushes = pushes;
            deadCheck = solved(lvl, st.c) ? null : new HintSearch(lvl, st, null, 3000);
        }

        // ---- Moving -----------------------------------------------------------------------
        function tryMove(d) {
            firstMove = true;
            const before = { c: st.c.slice(), p: st.p, stamps: view.terrain.stamps.length, pushes }, gateWas = gateOpen(lvl, st.c);
            const info = move(lvl, st, d, {});
            if (!info) { blocked(d); return false; }
            moves++;
            clearHint();
            if (info.kind !== "walk") { history.push(before); pushes++; game.data.pushes = pushes; }
            const wait = view.play(info, st, snd);
            gap = Math.min(wait ?? STEP_GAP, 0.3);
            if (info.kind === "walk") gap = STEP_GAP;
            if (gateWas !== gateOpen(lvl, st.c)) s.wait(wait ?? 0.1, () => snd.gate(!gateWas));
            if (info.kind !== "walk") {
                dead = false; view.mole.worried = 0;
                deadCheck = new HintSearch(lvl, st, null, 3000);
            }
            if (solved(lvl, st.c)) { won = true; s.wait((wait ?? 0.1) + 0.5, win); }
            return true;
        }
        function blocked(d) {
            auto = [];
            view.mole.face(d); view.mole.lunge = 0.5; view.mole.shakeNo = 0.5;
            const q = lvl.near[st.p * 4 + d];
            const b = q >= 0 ? view.balls.find((o) => o.cell === q) : null;
            if (b) b.sq = 0.12;
            if (s.time - bumped > 0.2) { snd.bump(); bumped = s.time; }
            gap = 0.14;
        }

        // ---- Hints ------------------------------------------------------------------------
        function requestHint() {
            if (won) return;
            snd.hint();
            if (hint?.ready) { // Second tap: the lantern walks you through that push.
                const [cell, d] = hint.plan[0], path = walkPath(lvl, st, cell);
                if (path) { auto = [...path, d]; hintsUsed++; hint = null; return; }
            }
            hintsUsed++;
            search = new HintSearch(lvl, st, stored.map, 90000);
            thinking = 0.001;
        }
        function hintDone() {
            const r = search;
            search = null; thinking = 0;
            if (r.dead || r.gaveUp) {
                // This board can't be won, or is too far to tell. Step back to the nearest one that can, and show the way from there.
                let target = 0;
                for (let i = history.length - 1; i >= 0 && i >= history.length - 10; i--) {
                    const h = new HintSearch(lvl, history[i], stored.map, 5000);
                    for (let k = 0; k < 4 && !h.step(30); k++);
                    if (h.plan) { target = i; break; }
                }
                if (!history.length) return;
                const h = history[target];
                history.length = target;
                st = { c: h.c, p: h.p }; pushes = h.pushes;
                view.terrain.rewind(h.stamps);
                view.sync(st); afterChange(); snd.undo();
                requestHint();
                return;
            }
            let plan = r.plan;
            if (r.join) plan = plan.concat(stored.plan.slice(r.join.i));
            if (!plan.length) return;
            const [cell, d] = plan[0], path = walkPath(lvl, st, cell) ?? [];
            const cells = [st.p];
            let c = st.p;
            for (const k of path) { c = lvl.near[c * 4 + k]; cells.push(c); }
            hint = { plan, cells, d, ready: true, born: s.time, push: lvl.near[cell * 4 + d] };
        }

        // ---- Winning ----------------------------------------------------------------------
        function win() {
            const perfect = par > 0 && pushes <= par;
            const old = app.save.solved[args.id];
            app.save.solved[args.id] = { p: Math.min(pushes, old?.p ?? 1e9), h: old ? old.h && hintsUsed > 0 : hintsUsed > 0 };
            app.save.at = args.id;
            app.persist();
            game.data.won = true; game.data.lastPushes = pushes;
            snd.win();
            view.mole.cheer = 1.4;
            for (const t of view.trims?.values() ?? []) t.k = 0.45;
            s.burst({ at: [view.wx(lvl.w / 2), 2.2, view.wz(lvl.h / 2)], count: 70, color: ["#ffffff", "#ffe7b0", "#ffd2c8"], speed: [0.4, 3], life: [0.7, 1.7], size: [0.05, 0.11], gravity: 2.4, dim: 3 });
            winT = 0.0001;
            if (perfect) { star.hidden = false; star.opacity = 1; s.tween(star, { scale: 1 }, 0.4, { ease: "outBack" }); }
            s.wait(perfect ? 2 : 1.6, leave);
        }
        let left = false;
        function leave() {
            if (left) return;
            left = true;
            game.go("world", { solved: won ? args.id : null }, { fade: 0.35 });
        }

        // ---- Heads-up -------------------------------------------------------------------
        const inLand = () => landscape();
        const bx = (v, i) => {
            if (inLand()) return i < 2 ? v.safe.left + 42 : v.width - v.safe.right - 42;
            return (v.width + v.safe.left - v.safe.right) / 2 + (i - 1) * 76;
        };
        const by = (v, i) => {
            if (inLand()) return (v.height + v.safe.top - v.safe.bottom) / 2 + [34, -34, 34, -34][i];
            return v.height - v.safe.bottom - 52;
        };
        // Undo is the biggest thing on the screen, under the right thumb. Holding it keeps rewinding.
        const undoBtn = iconButton(s, "ic_undo", (v) => (inLand() ? [bx(v, 2), by(v, 2)] : [bx(v, 2), by(v, 2)]), { size: 66, action: "undo", onTap: undo, name: "undo", pulse: () => (dead ? 1 + Math.sin(s.time * 6) * 0.1 : 1) });
        iconButton(s, "ic_restart", (v) => [bx(v, 0), by(v, 0)], { size: 56, action: "reset", onTap: restart, name: "restart" });
        iconButton(s, "ic_lantern", (v) => [bx(v, 1), by(v, 1)], { size: 56, action: "hint", onTap: requestHint, name: "hint", pulse: () => 1 + (thinking ? Math.sin(s.time * 9) * 0.12 : 0) });
        iconButton(s, "ic_map", (v) => (inLand() ? [bx(v, 3), by(v, 3)] : [v.safe.left + 34, v.safe.top + 34]), { size: 46, action: "back", onTap: leave, name: "map" });
        const sets = settingsPanel(s, app.settings);
        iconButton(s, "ic_gear", (v) => (inLand() ? [v.safe.left + 42, v.safe.top + 34] : [v.width - v.safe.right - 34, v.safe.top + 34]), { size: 46, onTap: () => sets.toggle(), name: "gear" });
        const goals = [];
        for (let i = 0; i < lvl.need; i++) {
            const place = (e) => { const v = s.view; e.pos.set((v.width + v.safe.left - v.safe.right) / 2 + (i - (lvl.need - 1) / 2) * 32, v.safe.top + (landscape() ? 30 : 34), 0); };
            const g = s.add([sprite("goal", { height: 40, width: 27 }), ui(), { name: "goalIcon", add(e) { place(e); }, update(dt, e) {
                place(e);
                const done = countSnowmen(lvl, st.c) > i;
                if (done && e.frame !== 1) { e.scale = 1.5; e.frame = 1; }
                if (!done) e.frame = 0;
                e.scale += (1 - e.scale) * Math.min(1, dt * 8);
            } }]);
            goals.push(g);
        }
        const star = s.add([sprite("star", { width: 72, height: 72 }), pin("center", [0, -40]), { name: "star" }]);
        star.hidden = true; star.scale = 0.1;

        // ---- Reading the player ---------------------------------------------------------
        let down = false, ax = 0, ay = 0, stepsNow = 0, startT = 0, onChar = false, lastDir = -1, heldT = 0;
        const axes = () => view.axes();
        const tilePx = () => { const a = s.cam3.project([0, 0, 0]), b = s.cam3.project([1, 0, 0]); return Math.hypot(a.x - b.x, a.y - b.y); };
        const dirOf = (dx, dy) => {
            const A = axes(), dist = Math.hypot(dx, dy);
            let best = 0, bv = -2;
            A.forEach((q, i) => { const v = (dx * q[0] + dy * q[1]) / dist; if (v > bv) { bv = v; best = i; } });
            return best;
        };
        /**
         * A swipe anywhere is one step. Hold at the end of it and he keeps walking that way.
         * A drag that starts on the mole walks him under the finger, tile by tile, so the finger can steer a whole route.
         */
        function readPointer(dt) {
            const p = s.input.pointer;
            if (p.pressed) {
                const q = view.project(st.p, 0.25);
                down = true; ax = p.x; ay = p.y; stepsNow = 0; startT = s.time; lastDir = -1; heldT = 0;
                onChar = Math.hypot(p.x - q.x, p.y - q.y) < Math.max(34, tilePx() * 0.8);
            }
            if (down && p.down) {
                const dx = p.x - ax, dy = p.y - ay, dist = Math.hypot(dx, dy), first = Math.min(24, tilePx() * 0.45), tile = tilePx();
                if (dist >= first) {
                    const d = dirOf(dx, dy), turned = d !== lastDir;
                    const need = stepsNow === 0 ? first : onChar ? tile * 0.8 : turned ? first * 1.4 : tile * 2;
                    if (dist >= need) {
                        if (queue.length < 2) queue.push(d);
                        auto = []; stepsNow++; lastDir = d; heldT = 0;
                        ax = p.x; ay = p.y;
                    }
                }
                if (lastDir >= 0 && !onChar) {
                    heldT += dt;
                    if (heldT > 0.5) { if (!queue.length && gap <= 0.02) queue.push(lastDir); }
                }
            }
            if (p.released && down) {
                down = false;
                if (stepsNow === 0 && s.time - startT < 0.4 && !sets.open) tapAt(p.x, p.y);
            }
        }
        function tapAt(x, y) {
            const cell = view.cellAt(x, y);
            if (cell < 0 || won) return;
            if (lvl.tiles[cell] === 8) {   // a pine: walk up and shake it
                for (let d = 0; d < 4; d++) {
                    const stand = lvl.near[cell * 4 + ((d + 2) % 4)];
                    if (stand < 0) continue;
                    const path = walkPath(lvl, st, stand);
                    if (path) { auto = [...path, d]; return; }
                }
                return;
            }
            if (st.c[cell] & BALLS) {
                for (let d = 0; d < 4; d++) if (lvl.near[st.p * 4 + d] === cell) { queue.push(d); return; }
                return;
            }
            const path = walkPath(lvl, st, cell);
            if (path?.length) { auto = path; queue = []; }
        }

        s.onUpdate((dt) => {
            snd.tick(dt);
            view.update(dt);
            gap -= dt;
            if (won) {
                winT += dt;
                if (winT > 0.7 && (s.input.pointer.pressed || s.input.pressed("confirm"))) leave();
                return;
            }
            if (!sets.open) readPointer(dt);
            if (search) { thinking += dt; if (search.step(3.5)) hintDone(); }
            else if (deadCheck) {
                if (deadCheck.step(0.7)) {
                    if (deadCheck.dead) { dead = true; view.mole.worried = 1; }
                    deadCheck = null;
                }
            }
            for (const [a, d] of [["up", 0], ["right", 1], ["down", 2], ["left", 3]]) {
                if (s.input.pressed(a)) { queue.length = 0; queue.push(d); auto = []; }
            }
            if (gap <= 0) {
                let d = -1;
                if (queue.length) d = queue.shift();
                else if (auto.length) d = auto.shift();
                else for (const [a, k] of [["up", 0], ["right", 1], ["down", 2], ["left", 3]]) if (s.input.down(a)) d = k;
                if (d >= 0) tryMove(d);
            }
            // Holding undo rewinds at a gentle gallop.
            if (undoBtn._pressed) { undoBtn.held = (undoBtn.held ?? 0) + dt; if (undoBtn.held > 0.45) { undoBtn.held = 0.33; undo(); } } else undoBtn.held = 0;
        });

        const fall = makeSnowfall(s, theme.flakes);
        s.onDraw((d) => {
            fall(d, 1 / 60);
            if (hint) {
                const put = d.quads("dot"), k = hint.cells.length;
                hint.cells.forEach((c, i) => {
                    if (i === 0) return;
                    const q = view.project(c, 0.25), a = 0.5 + 0.5 * Math.sin(s.time * 5 - i * 0.7), size = 9 + a * 5;
                    put(q.x, q.y, size, size, 0, 0, 1, 1, 1, 0.65 + a * 0.35);
                });
                const a = view.project(hint.push, 0.35), b = view.project(lvl.near[hint.push * 4 + hint.d] >= 0 ? lvl.near[hint.push * 4 + hint.d] : hint.push, 0.35);
                const f = 0.5 + 0.5 * Math.sin(s.time * 5), mx = a.x + (b.x - a.x) * (0.25 + f * 0.25), my = a.y + (b.y - a.y) * (0.25 + f * 0.25), ang = Math.atan2(b.y - a.y, b.x - a.x);
                d.push(); d.translate(mx, my); d.rotate(ang);
                d.rect(22, 15, { x: -7, color: "#4a4f7c", radius: 3 }); d.poly([[1, -18], [23, 0], [1, 18]], { color: "#4a4f7c" });
                d.rect(18, 9, { x: -7, color: "#ffd468", radius: 2 }); d.poly([[4, -11], [17, 0], [4, 11]], { color: "#ffd468" });
                d.pop();
            }
            if (def.teach === "swipe" && !firstMove && s.time > 0.8) {
                const t = (s.time * 0.6) % 1, q = view.project(st.p, 0.4), A = view.axes()[1], k = t < 0.7 ? t / 0.7 : 1, x = q.x + A[0] * (k * k * (3 - 2 * k)) * 90 + 6, y = q.y + A[1] * (k * k * (3 - 2 * k)) * 90 + 30;
                d.sprite("mitten", { x, y, width: 52, height: 52, color: color([1, 1, 1, t < 0.8 ? 1 : (1 - t) * 5]) });
            }
        });
        s.on("leave", () => view.leave());
        game.play = { undo, restart, requestHint, tryMove, get st() { return st; }, lvl, view, get won() { return won; }, get hint() { return hint; }, get dead() { return dead; }, get busy() { return gap > 0 || s.isFrozen; }, get auto() { return auto.length; }, leave };
    });
}
