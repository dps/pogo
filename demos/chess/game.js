// Lamplight: a chess table. This file is the game's flow: who may touch what, and what a move sets off.
import { createGame, layer, mesh, pos, ui } from "./pogo.js";
import { bakeSet, buildModels, SETS } from "./meshes.js";
import { buildTextures } from "./art.js";
import { ChessGame, mFrom, mPromo, mTo, isCastle, START_FEN } from "./engine.js";
import { Brain, CLUB, HINT_THINK, bookMove, chooseFrom } from "./ai.js";
import { World, sideChar, sqX, sqZ, worldSq } from "./world.js";
import { Hud, paintFaces } from "./ui.js";
import * as S from "./audio.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#0c0705", letterbox: "#0c0705", seed: 11, maxDpr: 2,
    actions: { undo: ["KeyU"], hintKey: ["KeyH"], turnKey: ["KeyT"], promoQ: ["KeyQ"], promoR: ["KeyR"], promoB: ["KeyB"], promoN: ["KeyN"] },
});

buildTextures(game);
paintFaces(game);
buildModels(game);

const PROFILE = "lamplight.profile", SAVE = "lamplight.game";
const CLOCKS = [null, { base: 600, inc: 0 }, { base: 300, inc: 3 }, { base: 180, inc: 2 }];
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const HAPTIC_DROP = { p: 10, n: 14, b: 14, r: 20, q: 26, k: 32 };

function loadProfile() {
    const d = { wins: {}, losses: {}, draws: {}, settings: {}, setup: {}, taught: false };
    const p = { ...d, ...(game.load(PROFILE, null) ?? {}) };
    p.settings = { sound: true, music: true, haptics: true, set: "classic", mirror: true, ...p.settings };
    p.setup = { side: "w", clock: 0, autoTurn: true, ...p.setup };
    return p;
}

game.scene("table", (s, args = {}) => {
    const profile = loadProfile(), st = profile.settings;
    game.audio.muted = !st.sound;
    game.haptics.enabled = st.haptics;
    if (st.set !== "classic") bakeSet(game.assets, st.set);
    const world = new World(game, s, SETS[st.set] ?? SETS.classic);
    const brain = new Brain();
    const G = {
        phase: "title", mode: "ai", level: 0, humanSide: "w", clock: null, clockInc: 0, busy: false,
        held: null, sel: null, moves: [], hover: -1, orbit: null, orbitIdle: 0, thinking: false, hinted: false, heart: 0,
        cursor: -1, promo: null, mood: null, result: null, lastAI: 0, wantAI: null, awaitStart: 0,
    };
    let chess = new ChessGame();

    const c = {
        G, world, settings: st, setup: profile.setup,
        get chess() { return chess; },
        click() { soundOn(); game.sfx(S.tick); },
        seatSide: () => G.seat ?? "w",
        opponent: () => CLUB[G.level],
        hasSave: () => !!game.load(SAVE, null),
        saveLabel() { const v = game.load(SAVE, null); return !v ? "" : v.mode === "ai" ? `against ${CLUB[v.level].name}` : "two players"; },
        nextLevel() { const i = CLUB.findIndex((w) => !profile.wins[w.id]); return i < 0 ? CLUB.length - 1 : i; },
        wins: (id) => profile.wins[id] ?? 0,
        clubLine() { const n = CLUB.filter((w) => profile.wins[w.id]).length; return n === CLUB.length ? "You've beaten everyone. Again?" : n ? `${n} of ${CLUB.length} beaten. Next up: ${CLUB[c.nextLevel()].name}` : "Beat them all, from the top down."; },
        saveProfile() { game.save(PROFILE, profile); },
        coachText() {
            if (profile.taught || G.phase !== "play" || chess.history.length) return "";
            return G.held ? "Drop it on a glowing square" : "Press a piece and drag it";
        },
        canUndo: () => (G.phase === "play" && !G.busy && !G.promo && chess.history.length > 0 && (G.mode === "two" || chess.history.length > (G.humanSide === "b" ? 1 : 0))),
        canHint: () => G.phase === "play" && !G.busy && humanTurn() && !G.thinking,
        undo, hint, turnBoard, menu, closeMenu, resign, leave,
        quickPlay() { const v = game.load(SAVE, null); if (v) resume(v); else startAI(c.nextLevel()); },
        startAI, startTwo,
        toggle(k) {
            st[k] = !st[k];
            if (k === "sound") game.audio.muted = !st.sound;
            if (k === "haptics") game.haptics.enabled = st.haptics;
            if (k === "music") { const m = G.mood; G.mood = null; if (st.music) mood(m ?? "calm"); else game.stopMusic(); }
            if (k === "mirror") applyMirror();
            c.saveProfile();
        },
        setsLocked() { const n = CLUB.filter((w) => profile.wins[w.id]).length; return n >= 5 ? "" : n >= 2 ? "beat 5 for the last" : "beat 2 for more"; },
        nextSet() {
            const n = CLUB.filter((w) => profile.wins[w.id]).length, keys = Object.keys(SETS).slice(0, n >= 5 ? 3 : n >= 2 ? 2 : 1);
            const next = keys[(keys.indexOf(st.set) + 1) % keys.length];
            if (next === st.set) { hud.note("Beat more of the club to unlock sets"); return; }
            st.set = next;
            bakeSet(game.assets, next);
            world.refreshMaterials(SETS[next]);
            c.saveProfile();
        },
        moveLines() {
            const out = [], h = chess.history, blackFirst = h.length && h[0].side === 8;
            for (let i = blackFirst ? -1 : 0; i < h.length; i += 2) {
                const n = (i + (blackFirst ? 1 : 0)) / 2 + 1;
                out.push(`${n | 0}. ${i >= 0 ? h[i].san : "..."} ${h[i + 1]?.san ?? ""}`.trim());
            }
            return out;
        },
        materialLead(side) {
            const score = (n) => {
                let t = 0;
                for (const p of world.pieces) if (p.sq >= 0 && p.side === n) t += VALUE[p.type];
                return t;
            };
            return score(side) - score(side === "w" ? "b" : "w");
        },
        plateInfo(side) {
            const n = side === "w" ? "White" : "Black", mine = G.mode === "two" || side === G.humanSide;
            if (mine) return { name: G.mode === "two" ? n : `You, ${n.toLowerCase()}`, face: side === "w" ? "face_white" : "face_black", status: chess.turn === (side === "w" ? 0 : 8) ? "your move" : "waiting", thinking: false };
            const who = CLUB[G.level];
            return { name: hud.wide ? who.short : who.name, face: `face_${who.id}`, status: who.title, short: G.thinking ? undefined : "waiting", thinking: G.thinking };
        },
    };
    const hud = new Hud(game, s, c);

    function humanTurn() {
        if (G.phase !== "play") return false;
        return G.mode === "two" || sideChar(chess.turn ? 8 : 0) === G.humanSide;
    }

    function soundOn() {
        if (!G.mood && st.music) mood("calm");
    }
    function mood(name) {
        if (!st.music) { G.mood = name; return; }
        if (G.mood === name) return;
        G.mood = name;
        game.music(S.SONGS[name]);
    }
    function applyMirror() {
        world.mirrorOn = st.mirror;
        world.boardTop.color = world.boardTop.color.alpha(st.mirror ? 0.76 : 1);
    }

    // --- Starting and saving ---------------------------------------------------------------------

    function begin(o) {
        Object.assign(G, { phase: "play", mode: o.mode, level: o.level ?? 0, humanSide: o.side ?? "w", busy: false, result: null, thinking: false });
        brain.cancel();
        const cl = CLOCKS[o.clockIdx ?? 0];
        G.clockIdx = o.clockIdx ?? 0;
        G.clock = o.clock ?? (cl ? { w: cl.base, b: cl.base } : null);
        G.clockInc = cl?.inc ?? 0;
        chess = new ChessGame(o.fen ?? START_FEN, o.moves ?? []);
        clearSelection();
        world.tensionGoal = 0;
        world.focusGoal = 0;
        world.lastFrom.want = world.lastTo.want = 0;
        world.checkMark.want = 0;
        s.timeScale = 1;
        G.seat = o.mode === "two" ? (chess.turn ? "b" : "w") : G.humanSide;
        world.yawGoal = seatYaw();
        world.propFlip = o.mode === "ai" && G.humanSide === "b" ? -1 : 1;
        world.placeFurniture();
        world.sync(chess.pos, o.animate ?? true);
        hud.close();
        hud.showTools(true);
        mood(o.mode === "ai" ? CLUB[G.level].music : "calm");
        if (o.mode === "ai" && !chess.history.length) hud.say(s.rng.pick(CLUB[G.level].lines.hello), 3.2);
        markLast();
        refreshCheck(chess.status());
        const delay = o.animate === false ? 0.4 : 1.1;
        G.busy = true;
        s.wait(delay, () => { G.busy = false; nextTurn(); });
        save();
    }

    function seatYaw() {
        // Stay on the nearer way round when the board turns, so that it swings rather than spins backwards.
        const want = G.seat === "b" ? Math.PI : 0;
        const now = world.yawGoal, k = Math.round((now - want) / (Math.PI * 2));
        return want + k * Math.PI * 2;
    }

    function startAI(level) {
        const r = profile.setup.side, side = r === "r" ? (s.rng.chance(0.5) ? "w" : "b") : r;
        begin({ mode: "ai", level, side, clockIdx: profile.setup.clock });
    }
    function startTwo() { begin({ mode: "two", clockIdx: profile.setup.clock }); }

    function resume(v) {
        begin({ mode: v.mode, level: v.level, side: v.side, fen: v.fen, moves: v.moves, clock: v.clock, clockIdx: v.clockIdx, animate: true });
    }

    function save() {
        if (G.phase !== "play") return;
        game.save(SAVE, { mode: G.mode, level: G.level, side: G.humanSide, fen: chess.startFen, moves: chess.ucis(), clock: G.clock, clockIdx: G.clockIdx });
    }

    // --- Selecting and holding -------------------------------------------------------------------

    function legalFor(p) {
        return chess.legalFrom(p.sq);
    }

    function showFor(p) {
        const moves = legalFor(p);
        G.moves = moves;
        const seen = new Set(), list = [];
        for (const m of moves) {
            const to = mTo(m);
            if (seen.has(to)) continue;
            seen.add(to);
            list.push({ sq: to, capture: !!chess.pos.b[to] || (m >> 17 & 7) === 2 });
        }
        world.showMoves(p.sq, list);
    }

    function clearSelection() {
        if (G.sel && G.sel.mode === "hover") { G.sel.mode = "rest"; G.sel.vy = -1.5; G.sel.bounced = true; }
        G.sel = null; G.held = null; G.moves = []; G.hover = -1;
        world.clearMoves();
    }

    const legalTo = (sq) => G.moves.filter((m) => mTo(m) === sq);

    function beginHold(p, x, y) {
        const was = G.sel === p;
        if (G.sel && !was) clearSelection();
        G.sel = p;
        G.held = { p, x0: x, y0: y, moved: false, was, off: 0 };
        G.hover = p.sq;
        showFor(p);
        world.lift(p);
        game.sfx(S.lift(p.type), { haptic: 7 + p.feel.mass * 3 | 0 });
        world.hintA.want = world.hintB.want = 0;
    }

    function dragHeld(x, y) {
        const h = G.held, p = h.p;
        if (!h.moved && Math.hypot(x - h.x0, y - h.y0) > 7) h.moved = true;
        // On touch the target rides above the thumb, so that you can see where you're aiming.
        const want = s.input.touchMode && h.moved ? 44 : 0;
        h.off += (want - h.off) * 0.2;
        const q = world.planePoint(x, y - h.off);
        const gx = Math.max(-4.9, Math.min(4.9, q.x)), gz = Math.max(-4.9, Math.min(4.9, q.z));
        if (h.moved) {
            const sq = worldSq(gx, gz);
            if (sq !== G.hover) {
                G.hover = sq;
                if (sq >= 0) {
                    const ok = legalTo(sq).length > 0, dark = (sq + (sq >> 4)) % 2 === 0;
                    game.sfx(S.slide(dark));
                    game.haptic(ok ? 7 : Math.round(2 + p.feel.mass));
                    if (ok) world.showMark(world.hoverMark, sq, 0.9); else world.hoverMark.want = 0;
                }
            }
            const legal = G.hover >= 0 && legalTo(G.hover).length > 0, m = legal ? 0.42 : 0;
            p.gx = gx + (legal ? (sqX(G.hover) - gx) * m : 0);
            p.gz = gz + (legal ? (sqZ(G.hover) - gz) * m : 0);
            p.gy = p.feel.lift + 0.16;
        }
    }

    function releaseHeld() {
        const h = G.held, p = h.p;
        G.held = null;
        world.hoverMark.want = 0;
        if (!h.moved || G.hover === p.sq) {
            if (h.was) { putDown(p); return; }
            world.hover(p); // A tap: it waits in the air for the second tap.
            game.sfx(S.select);
            return;
        }
        if (G.hover >= 0 && legalTo(G.hover).length) { tryMove(p, G.hover, "drop"); return; }
        game.sfx(S.nope, { haptic: "light" });
        putDown(p);
    }

    function putDown(p) {
        p.mode = "rest"; p.vy = -2; p.bounced = false; p.onLand = null;
        G.sel = null; G.moves = [];
        world.clearMoves();
    }

    function tryMove(p, sq, how) {
        const options = legalTo(sq);
        if (!options.length) return false;
        if (options.length > 1 && mPromo(options[0])) { askPromotion(p, sq, options, how); return true; }
        commit(options[0], p, how);
        return true;
    }

    // --- Promotion: four real pieces offered in the air ---------------------------------------------

    function askPromotion(p, sq, options) {
        G.phase = "promo";
        world.clearMoves();
        p.mode = "hover"; p.gx = sqX(sq); p.gz = sqZ(sq); p.gy = 1;
        const side = p.side, types = ["q", "r", "b", "n"];
        const cx = Math.max(-2.3, Math.min(2.3, sqX(sq))), cz = sqZ(sq) + (side === "w" ? 1.5 : -1.5);
        const picks = types.map((t, i) => {
            const e = s.add([mesh(`${t}${side}`, { shine: world.mats[side].shine }), { name: "promoPick" }]);
            e.pos.set(cx + (i - 1.5) * 1.3, 0.9, cz);
            e.rot.y = t === "n" ? 1.2 : 0;
            e.scale.set(0.2, 0.2, 0.2);
            s.tween(e, { scale: 1.08 }, 0.25, { ease: "outBack", delay: i * 0.05 });
            return { e, t };
        });
        G.promo = { p, sq, options, picks };
        game.sfx(S.page, { haptic: "tick" });
    }

    function pickPromotion(t) {
        const w = G.promo;
        for (const q of w.picks) q.e.destroy();
        G.promo = null;
        G.phase = "play";
        if (!t) { putDown(w.p); return; }
        const m = w.options.find((o) => " pnbrqk"[mPromo(o)] === t);
        commit(m, w.p, "drop");
    }

    function promoAt(x, y) {
        let best = null, bd = 44;
        for (const q of G.promo.picks) {
            const a = world.project(q.e.pos.x, 0.9, q.e.pos.z), dx = x - a.x, dy = y - a.y, dist = Math.hypot(dx, dy * 0.7);
            if (dist < bd) { bd = dist; best = q.t; }
        }
        pickPromotion(best);
    }

    // --- A move ----------------------------------------------------------------------------------

    function commit(m, p, how) {
        brain.cancel();
        G.thinking = false;
        const from = mFrom(m), to = mTo(m);
        p = p ?? world.pieceAt(from);
        const rec = chess.play(m), side = rec.side ? "b" : "w";
        G.sel = null; G.held = null; G.moves = []; G.hover = -1;
        world.clearMoves();
        world.hintA.want = world.hintB.want = 0;
        G.busy = true;
        profile.taught = true;
        const victim = rec.captured ? world.pieceAt(rec.capturedSq) : null;
        if (victim) { world.armStrike(p, victim); victim.sq = -2; }
        const done = () => landed(rec, p);
        if (how === "drop") world.drop(p, to, done); else world.moveTo(p, to, done);
        if (victim) p.strike.height = Math.max(p.strike.height, 0.5);
        if (isCastle(m)) {
            const king = to > from, rf = king ? to + 1 : to - 2, rt = king ? to - 1 : to + 1, r = world.pieceAt(rf);
            if (r) { s.wait(0.14, () => world.moveTo(r, rt, null, { peak: 0.75, dur: 0.3 })); game.sfx(S.castle); }
        }
        if (G.clock && chess.history.length > 1) G.clock[side] += G.clockInc;
        markLast();
    }

    function markLast() {
        const h = chess.history[chess.history.length - 1];
        if (!h) { world.lastFrom.want = world.lastTo.want = 0; return; }
        world.showMark(world.lastFrom, mFrom(h.m), 0.16);
        world.showMark(world.lastTo, mTo(h.m), 0.22);
    }

    function landed(rec, p) {
        if (rec.promo) {
            const t = " pnbrqk"[rec.promo];
            p.setType(t);
            p.squashV += 3;
            world.embers(p.x, 0.6, p.z, 26, 0.9);
            s.flash("#ffdf9a22", 0.25);
            game.sfx(S.promote, { haptic: "success" });
        }
        G.busy = false;
        const status = chess.status();
        refreshCheck(status, rec);
        save();
        if (status.over) { finish(status, rec, p); return; }
        if (G.mode === "two" && st && profile.setup.autoTurn) {
            G.seat = chess.turn ? "b" : "w";
            world.yawGoal = seatYaw();
        }
        nextTurn();
    }

    function refreshCheck(status, rec) {
        const inCheck = status.check && !status.over;
        if (inCheck) {
            const k = world.pieces.find((q) => q.type === "k" && q.side === (chess.turn ? "b" : "w"));
            world.showMark(world.checkMark, k.sq, 0.9);
            world.tensionGoal = 0.6;
            if (rec) {
                game.sfx(S.check, { haptic: "warn" });
                s.shake(0.06, 0.25);
                k.tvx += 0.8; k.tvz -= 0.8;
                const atk = CLUB[G.level]?.lines;
                if (G.mode === "ai") hud.say(s.rng.pick(humanTurn() ? atk.check : atk.checked));
                else hud.note("Check");
            }
            G.heart = 0.9;
            if (humanTurn()) mood("tension");
        } else {
            world.checkMark.want = 0;
            world.tensionGoal = 0;
            if (G.mood === "tension") mood(G.mode === "ai" ? CLUB[G.level].music : "calm");
        }
    }

    function nextTurn() {
        if (G.phase !== "play" || G.mode !== "ai" || humanTurn()) return;
        G.thinking = true;
        const who = CLUB[G.level], moves = chess.ucis(), started = s.time;
        const book = G.level >= 2 ? bookMove(moves, s.rng) : null;
        const play = (uci) => {
            const wait = Math.max(0, 0.55 - (s.time - started));
            s.wait(wait, () => {
                if (G.phase !== "play" || chess.ucis().length !== moves.length) return;
                const m = chess.pos.fromUci(uci) || chess.legal()[0];
                G.thinking = false;
                commit(m, null, "arc");
            });
        };
        if (book) { play(book); return; }
        const think = { ...who.think, seed: s.rng.int(1, 1 << 20) };
        if (G.clock && think.maxMs) think.maxMs = Math.min(think.maxMs, Math.max(60, G.clock[G.humanSide === "w" ? "b" : "w"] * 40)); // never flag itself
        brain.think(chess.startFen, moves, think, (r) => {
            const uci = who.think.spread ? chooseFrom(r, who, s.rng, (u) => { const m = chess.pos.fromUci(u); return m && !!chess.pos.b[mTo(m)]; }) : r.move;
            play(uci);
        });
    }

    // --- Tools -----------------------------------------------------------------------------------

    function undo() {
        if (!c.canUndo() && G.phase !== "over") return;
        brain.cancel();
        G.thinking = false;
        clearSelection();
        chess.undo();
        if (G.mode === "ai" && sideChar(chess.turn ? 8 : 0) !== G.humanSide) chess.undo();
        s.timeScale = 1;
        G.phase = "play";
        G.result = null;
        hud.close(); hud.showTools(true);
        world.focusGoal = 0;
        world.sync(chess.pos, true);
        mood(G.mode === "ai" ? CLUB[G.level].music : "calm");
        G.busy = true;
        s.wait(0.6, () => { G.busy = false; nextTurn(); });
        markLast();
        refreshCheck(chess.status());
        game.sfx(S.page, { haptic: "light" });
        if (G.mode === "two" && profile.setup.autoTurn) { G.seat = chess.turn ? "b" : "w"; world.yawGoal = seatYaw(); }
        save();
    }

    function hint() {
        if (!c.canHint()) return;
        clearSelection();
        hud.note("Hmm...", 0.8);
        G.thinking = true;
        brain.think(chess.startFen, chess.ucis(), { ...HINT_THINK, seed: 1 }, (r) => {
            G.thinking = false;
            const m = chess.pos.fromUci(r.move);
            if (!m || G.phase !== "play") return;
            world.showMark(world.hintA, mFrom(m), 0.62);
            world.showMark(world.hintB, mTo(m), 0.8);
            const p = world.pieceAt(mFrom(m));
            if (p) { p.vy = 2.4; p.y = 0.01; p.bounced = true; }
            game.sfx(S.hint, { haptic: "tick" });
            hud.note(chess.pos.san(m), 1.6);
        });
    }

    function turnBoard() {
        if (G.phase === "title") return;
        world.yawGoal += Math.PI;
        G.seat = G.seat === "w" ? "b" : "w";
        game.sfx(S.page, { haptic: "tick" });
    }

    function menu() {
        if (G.phase === "over" || G.phase === "title") { hud.open(G.phase === "title" ? "settings" : "over", G.overArgs); return; }
        clearSelection();
        G.paused = true;
        hud.open("menu");
    }
    function closeMenu() { G.paused = false; hud.open(null); }

    function resign() {
        G.paused = false;
        hud.open(null);
        const loser = G.mode === "ai" ? G.humanSide : chess.turn ? "b" : "w";
        finish({ over: true, result: loser === "w" ? "black" : "white", reason: "resignation" }, null, null);
    }

    function leave() {
        brain.cancel();
        G.paused = false;
        G.phase = "title";
        s.timeScale = 1;
        world.tensionGoal = 0; world.focusGoal = 0;
        hud.showTools(false);
        const v = game.load(SAVE, null);
        chess = v ? new ChessGame(v.fen, v.moves) : new ChessGame();
        G.seat = v?.mode === "ai" ? v.side : "w";
        G.mode = v?.mode ?? "ai"; G.humanSide = v?.side ?? "w"; G.level = v?.level ?? 0;
        world.yawGoal = seatYaw();
        clearSelection();
        world.sync(chess.pos, true);
        world.lastFrom.want = world.lastTo.want = world.checkMark.want = 0;
        mood("calm");
        hud.open("title");
    }

    // --- Endings ---------------------------------------------------------------------------------

    function finish(status, rec, lastPiece) {
        brain.cancel();
        G.thinking = false;
        G.phase = "over";
        G.result = status;
        clearSelection();
        game.save(SAVE, null);
        hud.showTools(false);
        world.tensionGoal = 0;
        world.checkMark.want = 0;
        game.stopMusic(); G.mood = null;
        const mineWon = G.mode === "ai" ? status.result === (G.humanSide === "w" ? "white" : "black") : false;
        const who = G.mode === "ai" ? CLUB[G.level] : null;
        if (who) {
            const bucket = status.result === "draw" ? profile.draws : mineWon ? profile.wins : profile.losses;
            bucket[who.id] = (bucket[who.id] ?? 0) + 1;
        }
        c.saveProfile();
        const showPanel = () => overPanel(status, mineWon, who);
        if (status.reason === "checkmate") {
            mateScene(status, lastPiece, mineWon, showPanel);
            return;
        }
        if (status.result === "draw") {
            for (const k of world.pieces) if (k.type === "k") { k.tvx += 0.7; k.tvz += 0.5; }
            game.sfx(S.drawn, { haptic: "medium" });
            if (who) hud.say(s.rng.pick(who.lines.draw), 3);
            s.wait(1.1, showPanel);
            return;
        }
        // Flag fall or resignation: the loser's king lies down, quickly.
        const loser = status.result === "white" ? "b" : "w", king = world.pieces.find((q) => q.type === "k" && q.side === loser);
        world.toppleKing(king, { x: king.x - 1, z: king.z + 0.4 });
        s.wait(1.5, () => { if (G.phase === "over" && !hud.panel) showPanel(); });
        afterGlow(status, mineWon, who);
    }

    function afterGlow(status, mineWon, who) {
        const winnerSide = status.result === "white" ? "w" : "b";
        if (G.mode === "two" || mineWon) {
            world.wave(winnerSide);
            mood("win");
            game.sfx(S.victory, { haptic: "success" });
            const k = world.pieces.find((q) => q.type === "k" && q.side === winnerSide);
            for (let i = 0; i < 4; i++) s.wait(i * 0.35, () => world.embers(k.x, 1.2, k.z, 34, 1.3));
            s.wait(0.2, () => s.flash("#ffdf9a33", 0.5));
        } else {
            mood("sad");
            game.sfx(S.defeat, { haptic: "error" });
        }
        if (who) hud.say(s.rng.pick(mineWon ? who.lines.loss : who.lines.win), 3.4);
    }

    function mateScene(status, attacker, mineWon, showPanel) {
        const loser = status.result === "white" ? "b" : "w", king = world.pieces.find((q) => q.type === "k" && q.side === loser);
        s.timeScale = 0.3;
        world.focus = { x: king.x, y: 0.7, z: king.z };
        world.focusGoal = 0.9;
        world.showMark(world.checkMark, king.sq, 0.95);
        s.flash("#ff4a1a33", 0.4);
        game.sfx(S.check, { haptic: "heavy" });
        s.wait(0.32, () => world.toppleKing(king, attacker ?? { x: king.x, z: king.z + 1 }));
        let finished = false;
        const end = () => {
            if (finished) return;
            finished = true;
            world.checkMark.want = 0;
            s.timeScale = 1;
            world.focusGoal = hud.wide ? 0 : 0.34;
            afterGlow(status, mineWon, G.mode === "ai" ? CLUB[G.level] : null);
            s.wait(1.5, showPanel);
        };
        world.events.kingDown = (k, n) => {
            game.sfx(S.kingDown(n), { haptic: n === 1 ? "heavy" : "medium" });
            if (n === 1) { s.shake(0.2, 0.42); s.flash("#ffb46a2a", 0.3); world.dust(k.x + k.topple.dx * 0.8, 0.06, k.z + k.topple.dz * 0.8, 34, 2); world.embers(k.x, 0.3, k.z, 26, 1); }
            if (k.topple.bounce >= 3 || Math.abs(k.topple.w) < 0.5) s.wait(0.08, end);
        };
        s.wait(1.5, end); // whichever way it falls, 1.5 world seconds is 5 real ones at most
    }

    function overPanel(status, mineWon, who) {
        const res = status.result, why = { checkmate: "by checkmate", stalemate: "Stalemate", "insufficient material": "Not enough pieces left to mate", "threefold repetition": "Threefold repetition", "fifty-move rule": "Fifty moves without progress", resignation: "by resignation", time: "on time" }[status.reason] ?? status.reason;
        let title, sub;
        if (res === "draw") { title = "A draw"; sub = why; }
        else if (G.mode === "two") { title = `${res === "white" ? "White" : "Black"} wins`; sub = why; }
        else if (mineWon) { title = "You win"; sub = `${who.name} is beaten ${why}.`; }
        else { title = `${who.name} wins`; sub = `${why[0].toUpperCase()}${why.slice(1)}. There's always a rematch.`; }
        const next = who && mineWon && G.level < CLUB.length - 1;
        G.overArgs = {
            title, sub,
            primaryLabel: next ? `Next: ${CLUB[G.level + 1].name}` : "Rematch",
            primary: () => (G.mode === "two" ? startTwo() : startAI(next ? G.level + 1 : G.level)),
            secondLabel: next ? "Rematch" : G.mode === "ai" && !mineWon && chess.history.length > 1 ? "Take it back" : "Rematch",
            second: () => { if (next || G.mode === "two" || mineWon) (G.mode === "two" ? startTwo() : startAI(G.level)); else undo(); },
        };
        hud.open("over", G.overArgs);
    }

    function flagFell(side) {
        const other = side === "w" ? 8 : 0;
        G.clock[side] = 0;
        const status = chess.pos.canMate(other) ? { over: true, result: side === "w" ? "black" : "white", reason: "time" } : { over: true, result: "draw", reason: "insufficient material" };
        finish(status, null, null);
    }

    // --- World events: sound and feel ----------------------------------------------------------------

    world.events.land = (p, speed, first) => {
        if (world.quiet) return;
        const strength = Math.min(1, speed / 7), dark = p.sq >= 0 && (p.sq + (p.sq >> 4)) % 2 === 0;
        if (first) {
            game.sfx(S.knock(p.type, strength, dark), { haptic: HAPTIC_DROP[p.type] });
            s.shake(0.012 * p.feel.mass * strength, 0.08);
        } else game.sfx(S.knock(p.type, 0.14, dark));
    };
    world.events.capture = (v, a) => {
        if (!a) return;
        const m = Math.max(v.feel.mass, a.feel.mass);
        game.sfx(S.crack(m), { haptic: m > 2 ? "heavy" : "medium" });
        s.shake(0.07 + m * 0.03, 0.22);
        s.freeze(0.05 + m * 0.012);
        s.flash("#ffb46a18", 0.14);
        world.embers(v.x, 0.5, v.z, 8 + m * 4 | 0, 0.8);
        if (G.mode === "ai" && s.rng.chance(0.55)) {
            const lines = CLUB[G.level].lines;
            hud.say(s.rng.pick(a.side === G.humanSide ? lines.lose : lines.take));
        }
    };
    world.events.settle = () => game.sfx(S.trayThud(0.5), { haptic: "tick" });
    world.events.trayHit = (p, speed, n) => game.sfx(S.trayThud(Math.min(1, speed / 9)), { haptic: n === 1 ? "light" : "tick" });
    world.events.clip = (p, o) => game.sfx(S.knock(o.type, 0.3), { haptic: "tick" });

    // --- Input -----------------------------------------------------------------------------------

    function press(x, y) {
        soundOn();
        if (G.paused || hud.panel && hud.panel !== "title") return;
        if (G.phase === "promo") { promoAt(x, y); return; }
        if (G.phase === "title") {
            const pick = world.pickPiece(x, y, (q) => q.sq >= 0 && q.side === "w");
            if (pick && !c.hasSave()) {
                startFromTouch(pick, x, y);
                return;
            }
            if (pick) { c.quickPlay(); return; }
            orbitStart(x, y);
            return;
        }
        if (G.phase !== "play" || G.busy || !humanTurn()) {
            const pt = world.planePoint(x, y);
            if (worldSq(pt.x, pt.z) < 0) orbitStart(x, y);
            return;
        }
        const mine = chess.turn ? "b" : "w", pt = world.planePoint(x, y), sq = worldSq(pt.x, pt.z), under = sq >= 0 ? world.pieceAt(sq) : null;
        if (G.sel) {
            if (sq >= 0 && legalTo(sq).length && !(under && under.side === mine && under !== G.sel)) {
                tryMove(G.sel, sq, "arc");
                return;
            }
            const enemy = world.pickPiece(x, y, (q) => q.side !== mine && legalTo(q.sq).length > 0);
            if (enemy) { tryMove(G.sel, enemy.sq, "arc"); return; }
        }
        const own = world.pickPiece(x, y, (q) => q.side === mine) ?? (under?.side === mine ? under : null);
        if (own) {
            if (own.mode === "rest" || own.mode === "hover") beginHold(own, x, y);
            return;
        }
        if (G.sel) { putDown(G.sel); clearSelection(); return; }
        if (sq < 0) orbitStart(x, y);
    }

    function startFromTouch(p, x, y) {
        const clockIdx = profile.setup.clock;
        begin({ mode: "ai", level: c.nextLevel(), side: "w", clockIdx, animate: false });
        G.busy = false;
        beginHold(p, x, y);
    }

    function orbitStart(x, y) {
        G.orbit = { x, y, ox: world.orbitX, oy: world.orbitY };
    }

    function keyboard() {
        const i = s.input, seat = c.seatSide() === "w" ? 1 : -1;
        if (i.pressed("pause")) { if (hud.panel === "menu") closeMenu(); else if (G.phase === "play") menu(); }
        if (G.phase === "promo") {
            for (const [a, t] of [["promoQ", "q"], ["promoR", "r"], ["promoB", "b"], ["promoN", "n"]]) if (i.pressed(a)) pickPromotion(t);
            return;
        }
        if (G.phase !== "play" || hud.panel) return;
        if (i.pressed("undo") && c.canUndo()) undo();
        if (i.pressed("hintKey")) hint();
        if (i.pressed("turnKey")) turnBoard();
        const moved = (a, df, dr) => {
            if (!i.pressed(a)) return;
            if (G.cursor < 0) G.cursor = chess.turn ? 0x64 : 0x14;
            const f = Math.max(0, Math.min(7, (G.cursor & 7) + df * seat)), r = Math.max(0, Math.min(7, (G.cursor >> 4) + dr * seat));
            G.cursor = r * 16 + f;
            world.showMark(world.hoverMark, G.cursor, 0.9);
            game.sfx(S.slide(false), { haptic: "tick" });
        };
        moved("left", -1, 0); moved("right", 1, 0); moved("up", 0, 1); moved("down", 0, -1);
        if (i.pressed("confirm") && G.cursor >= 0 && !G.busy && humanTurn()) {
            const mine = chess.turn ? "b" : "w", under = world.pieceAt(G.cursor);
            if (G.sel && legalTo(G.cursor).length) { tryMove(G.sel, G.cursor, "arc"); world.hoverMark.want = 0; } else if (under?.side === mine) {
                if (G.sel) clearSelection();
                G.sel = under; showFor(under); world.hover(under);
                game.sfx(S.lift(under.type), { haptic: "tick" });
            } else if (G.sel) { putDown(G.sel); clearSelection(); }
        }
    }

    // UI-rate controller: keeps running through hit-stop and slow motion.
    s.add([ui(), pos(0, 0), layer(0), {
        name: "control",
        update(dt) {
            const p = s.input.pointer;
            keyboard();
            if (p.pressed) press(p.x, p.y);
            if (G.held) { dragHeld(p.x, p.y); if (!p.down || p.released) releaseHeld(); }
            if (G.orbit) {
                if (p.down && !p.released) {
                    world.orbitX = Math.max(-0.5, Math.min(0.5, G.orbit.ox - (p.x - G.orbit.x) * 0.006));
                    world.orbitY = Math.max(-0.22, Math.min(0.22, G.orbit.oy + (p.y - G.orbit.y) * 0.004));
                    G.orbitIdle = 0;
                } else G.orbit = null;
            } else {
                G.orbitIdle += dt;
                if (G.orbitIdle > 0.9) { const k = Math.min(1, dt * 1.8); world.orbitX -= world.orbitX * k; world.orbitY -= world.orbitY * k; }
            }
            // Title sway.
            if (G.phase === "title" && !G.orbit) world.orbitX += (Math.sin(s.time * 0.2) * 0.08 - world.orbitX) * Math.min(1, dt * 2);
            world.stepCamera(dt);
            brain.pump(dt);
            // Clocks run on real time and start once White has moved.
            if (G.clock && G.phase === "play" && !G.paused && chess.history.length >= 1 && !G.busy) {
                const side = chess.turn ? "b" : "w";
                const before = G.clock[side];
                G.clock[side] -= dt;
                if (before >= 10 && G.clock[side] < 10) hud.note("Ten seconds", 1.2);
                if (G.clock[side] < 10 && Math.floor(before) !== Math.floor(G.clock[side])) game.sfx(S.lowTime, { haptic: "tick" });
                if (G.clock[side] <= 0) flagFell(side);
            }
            // A heartbeat while your king is in check.
            if (world.tensionGoal > 0.5 && humanTurn()) {
                G.heart -= dt;
                if (G.heart <= 0) { G.heart = 1.25; game.sfx(S.heartbeat, { haptic: [12, 170, 8] }); }
            }
            game.data.phase = G.phase;
            game.data.fen = chess.pos.fen();
            game.data.ply = chess.history.length;
            game.data.mode = G.mode;
            game.data.level = G.level;
            game.data.thinking = G.thinking;
            game.data.busy = G.busy;
            game.data.result = G.result?.reason ?? null;
            game.data.winner = G.result?.result ?? null;
            game.data.brain = brain.mode;
            game.data.panel = hud.panel;
        },
    }]);

    s.onUpdate((dt) => {
        world.step(dt, game.dt);
        if (G.promo) G.promo.picks.forEach((q, i) => { q.e.pos.y = 0.9 + Math.sin(s.time * 2.4 + i) * 0.05; q.e.rot.y += dt * 0.7; });
    });
    s.onDraw((d) => world.drawParticles(d));

    const layout = () => world.layout(hud.layout(), hud.wide);
    layout();
    s.on("resize", layout);
    game.on("resize", () => { if (game.current === s) layout(); });
    world.boardTop = s.first("boardTop");
    applyMirror();

    // Keep a saved game's position on the table behind the title.
    const saved = game.load(SAVE, null);
    if (saved) {
        try { chess = new ChessGame(saved.fen, saved.moves); world.sync(chess.pos, false); G.seat = saved.mode === "ai" ? saved.side : "w"; G.humanSide = saved.side; G.mode = saved.mode; G.level = saved.level; world.yaw = world.yawGoal = seatYaw(); } catch { game.save(SAVE, null); chess = new ChessGame(); }
    }
    if (args.mode === "ai") startAI(args.level ?? 0);
    else if (args.mode === "two") startTwo();
    else hud.open("title");

    globalThis.__chess = { G, world, c, hud, brain, get chess() { return chess; }, commit, begin, finish };
});

if (typeof document !== "undefined") document.getElementById("loading")?.remove();
game.start("table");
