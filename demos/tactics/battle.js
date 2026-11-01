// A battle: input, the overlay that tells you what will happen, and the turn loop. Rules are in sim.js.
import { color, layer, mesh, pos, ui } from "./pogo.js";
import { DIRS, N, T, ACTS, actTargets, applyAct, applyMove, at, beginRound, BONUS_TEXT, bonusMet, byId, canAct, checkOver, clone, endTurn, foes, forecast, idx, inB, intentTiles, isSolid, moveTiles, newBattle, pigeons, starsFor } from "./sim.js";
import { ENEMIES, PIGEONS, PROPS, TERRAIN_INFO } from "./data.js";
import { ZONES, wx, wz } from "./stage.js";
import { View } from "./view.js";
import { FONT, INK, PAL, PAPER, card, label, left as leftText, outlined, toy, wrap } from "./ui.js";
import { loadMeta, recordWin, saveMeta } from "./meta.js";
import { MISSIONS } from "./missions.js";
import { playSong } from "./audio.js";
import * as S from "./audio.js";

const MOVE = color("#42c8ff"), TARGET = color("#ffa21f"), HOT = color("#fff27a"), RED = color("#ff3b30"), BLUE = color("#3ba4ff"), WARN = color("#ff9f40"), GOLD = color("#ffd84a"), GREEN = color("#5be37d");
const faceName = (k) => `face_${k}`;
const goalText = (st) => {
    const m = st.m;
    switch (m.win) {
        case "rout": { const n = foes(st).length + st.pending.length + (m.waves ?? []).filter((w) => w.round > st.round).reduce((a, w) => a + w.units.length, 0); return `Clear them out: ${n} left`; }
        case "survive": return `Hold out ${m.rounds} rounds`;
        case "collect": return `Grab the crumbs: ${st.crumbs.length} left`;
        case "perch": return `Sit on the plinths: ${st.perchScore}/${m.goal}`;
        case "escort": return "Walk Old Reg to the gate";
        case "boss": { const b = st.units.find((u) => u.boss); return `Beat ${ENEMIES[b?.k]?.name ?? "the boss"}`; }
    }
    return "";
};
const WHY = { bag: "The bread is gone.", reg: "Old Reg has wandered off for good.", squad: "The whole squad is down.", time: "The park keeper's coming. Out of time." };

export function battleScene(game) {
    game.scene("battle", (s, args = {}) => {
        const meta = loadMeta(game), set = meta.settings;
        game.audio.muted = !set.sound; game.haptics.enabled = set.haptics; game.touch.enabled = false;
        const m = args.mission ?? MISSIONS[0], squad = args.squad ?? [{ k: "sarge", up: {} }, { k: "doris", up: {} }];
        let st = newBattle(m, squad);
        const v = new View(game, s, m.zone, m, st.tiles);
        v.sync(st);
        const G = { phase: "intro", sel: null, mode: "move", hover: null, armed: null, cursor: [3, 5], down: null, drag: false, moved: 0, history: [], preview: null, threat: null, info: null, banner: null, endArmed: 0, result: null, menu: false, briefT: 0, brief: !!m.brief, coachStep: 0, t: 0, enemyTap: 0 };
        const shown = () => G.preview?.state ?? st;
        if (set.music) playSong(game, m.final ? "swan" : m.win === "boss" || m.boss ? "boss" : m.index > 12 ? "tense" : "battle"); else game.stopMusic();
        if (args.rogue) v.speed = 1;

        // ---- markers that sit on the board ----
        const markers = new Map();
        const syncMarkers = () => {
            const want = new Map();
            for (const i of st.crumbs) want.set(`c${i}`, ["crumb", i]);
            for (const i of st.perch) want.set(`p${i}`, ["perch", i]);
            if (st.exit !== null) want.set(`g${st.exit}`, ["gate", st.exit]);
            for (const [k, e] of markers) if (!want.has(k)) { e.destroy(); markers.delete(k); }
            for (const [k, [name, i]] of want) if (!markers.has(k)) {
                const e = s.add([mesh(name, {}), { name }]);
                e.size.set(game.assets.geometry(name).natural);
                e.pos.set(wx(i % N), 0, wz(Math.floor(i / N)));
                markers.set(k, e);
            }
        };
        syncMarkers();
        v.onCrumb = () => s.wait(0.01, syncMarkers);

        // ---- the panel ----
        const btn = {};
        const mk = (key, label_, o) => { btn[key] = s.add([ui(), layer(50), pos(0, 0), toy(label_, o), { name: key }]); return btn[key]; };
        const faces = [];
        mk("menu", "", { width: 42, height: 42, icon: "i_menu", color: PAL.grey, action: "pause", onTap: () => openMenu() });
        mk("undo", "Undo", { width: 80, height: 46, icon: "i_undo", color: PAL.plum, action: "undo", onTap: () => undo() });
        mk("wait", "Done", { width: 80, height: 46, color: PAL.grey, action: "waitKey", onTap: () => waitUnit() });
        mk("mode", "Act", { width: 96, height: 46, color: PAL.gold, textColor: INK, action: "swapMode", onTap: () => toggleMode() });
        mk("end", "End Turn", { width: 96, height: 46, color: PAL.green, action: "endKey", onTap: () => pressEnd(), textSize: 15 });
        const pigeonUnits = () => st.units.filter((u) => u.side === 0);
        pigeonUnits().forEach((u, i) => {
            const e = s.add([ui(), layer(50), pos(0, 0), toy("", { width: 44, height: 46, color: PAL.cream, radius: 12, onTap: () => { if (G.phase === "player") { select(u.id); S.select(game); } } }), { name: `face${i}`, uid: u.id }]);
            faces.push(e);
        });

        let P = null;
        const layout = () => {
            const sf = s.view.safe, L = sf.left, R = sf.right, T = sf.top, B = sf.bottom, W = s.view.width, H = s.view.height, wide = W > H;
            if (!wide) {
                const panelH = 150, bot = H - B, iw = W - L - R;
                P = { wide, W, H, L, R, T, B, bot, panel: { x: 0, y: bot - panelH, w: W, h: panelH + B }, faceY: bot - panelH - 28, top: 56 + T };
                v.fit({ x: 0, y: 92 + T, w: W, h: bot - panelH - 92 - T - 54 });
                const y = bot - 30, gap = 6, row = [btn.undo, btn.wait, btn.mode, btn.end], unit = iw - 12 - gap * 3, ws = [unit * 0.2, unit * 0.2, unit * 0.28, unit * 0.32];
                let x = L + 6;
                row.forEach((b, i) => { b.size.set(ws[i], 48, 0); b.pos.set(x + ws[i] / 2, y); x += ws[i] + gap; });
                btn.menu.size.set(48, 48, 0); btn.menu.pos.set(W - R - 30, T + 30);
                faces.forEach((f, i) => { f.size.set(48, 50, 0); f.pos.set(W / 2 + (i - (faces.length - 1) / 2) * 54, P.faceY); });
            } else {
                const pw = Math.min(214, W * 0.32), x0 = W - pw - R, bot = H - B, y = bot - 30;
                P = { wide, W, H, L, R, T, B, bot, panel: { x: x0, y: 0, w: pw + R, h: H }, top: 56 + T };
                v.fit({ x: L, y: 40 + T, w: x0 - L, h: bot - 44 - T });
                btn.undo.size.set(pw / 2 - 9, 48, 0); btn.wait.size.set(pw / 2 - 9, 48, 0);
                btn.mode.size.set(pw - 12, 46, 0); btn.end.size.set(pw - 12, 48, 0);
                btn.end.pos.set(x0 + pw / 2, y);
                btn.mode.pos.set(x0 + pw / 2, y - 110);
                btn.undo.pos.set(x0 + pw / 4 + 2, y - 56); btn.wait.pos.set(x0 + (pw * 3) / 4 - 2, y - 56);
                btn.menu.size.set(48, 48, 0); btn.menu.pos.set(x0 - 30, T + 30);
                const gapF = Math.min(52, (pw - 6) / Math.max(1, faces.length));
                faces.forEach((f, i) => { f.size.set(Math.max(44, gapF - 2), 50, 0); f.pos.set(x0 + pw / 2 + (i - (faces.length - 1) / 2) * gapF, T + 33); });
            }
        };
        layout();
        s.on("resize", layout);

        // ---- working out what will happen ----
        const summarise = (events, state0) => {
            const dmg = new Map(), dead = new Set(), push = new Map();
            for (const e of events) {
                if (e.t === "dmg") dmg.set(e.id, (dmg.get(e.id) ?? 0) + e.n);
                if (e.t === "die") dead.add(e.id);
                if (e.t === "push") { const u = byId(state0, e.id); if (u) { const p = push.get(e.id) ?? { x0: u.x, y0: u.y, x1: u.x, y1: u.y }; p.x1 = e.x; p.y1 = e.y; push.set(e.id, p); } }
                if (e.t === "bump") { const p = push.get(e.id) ?? { x0: e.x, y0: e.y, x1: e.x, y1: e.y }; p.bump = DIRS[e.d]; push.set(e.id, p); }
                if (e.t === "act" && e.act === "slide") { const p = { x0: e.fx, y0: e.fy, x1: e.x, y1: e.y }; push.set(e.id, p); }
                if (e.t === "act" && e.act === "swap") { push.set(e.id, { x0: e.fx, y0: e.fy, x1: e.x, y1: e.y }); push.set(e.other, { x0: e.x, y0: e.y, x1: e.fx, y1: e.fy }); }
            }
            return { dmg, dead, push };
        };
        const nameOf = (u) => (!u ? "?" : u.side === 0 ? PIGEONS[u.k].name : u.side === 1 ? ENEMIES[u.k].name : PROPS[u.k].name);
        function computeThreat(state) {
            const c = forecast(state), sum = summarise(c.ev, state);
            const lines = [];
            for (const u of state.units) {
                if (u.hp <= 0) continue;
                const n = sum.dmg.get(u.id) ?? 0, d = sum.dead.has(u.id);
                if ((u.side === 0 || u.keep) && (n || d)) lines.push(d ? `${nameOf(u)} KO'd` : `${nameOf(u)} -${n}`);
            }
            return { sum, lines, lose: c.over === "lose" };
        }
        function computePreview() {
            G.preview = null;
            const t = G.hover ?? G.armed, u = G.sel ? byId(st, G.sel) : null;
            if (u && t && G.mode === "move") {
                // Dragging over a move tile: show the turn as it would be from there.
                if (moveTiles(st, u).some((q) => q.x === t[0] && q.y === t[1])) {
                    const c = clone(st); applyMove(c, byId(c, u.id), t[0], t[1]);
                    G.preview = { state: c, sum: { dmg: new Map(), dead: new Set(), push: new Map() }, ev: [], target: null };
                    G.threat = computeThreat(c);
                    return;
                }
            }
            if (!u || !t || G.mode !== "aim") { G.threat = computeThreat(st); return; }
            const c = clone(st), me = byId(c, u.id);
            c.ev = [];
            if (!applyAct(c, me, t[0], t[1])) { G.threat = computeThreat(st); return; }
            const ev = c.ev; c.ev = null;
            const sum = summarise(ev, st);
            G.preview = { state: c, sum, ev, target: t };
            G.threat = computeThreat(c);
        }
        function canonical(u, x, y) {
            const act = ACTS[PIGEONS[u.k].act];
            if (!act) return null;
            if (act.aim === "dir") {
                if (x !== u.x && y !== u.y) return null;
                if (x === u.x && y === u.y) return null;
                const r = act.reach(u); if (Math.abs(x - u.x) + Math.abs(y - u.y) > r) return null;
                const d = DIRS.findIndex(([a, b]) => Math.sign(x - u.x) === a && Math.sign(y - u.y) === b), t = [u.x + DIRS[d][0], u.y + DIRS[d][1]];
                return actTargets(st, u).some((q) => q[0] === t[0] && q[1] === t[1]) ? t : null;
            }
            return actTargets(st, u).some((q) => q[0] === x && q[1] === y) ? [x, y] : null;
        }
        function refresh() {
            const marks = new Map(), danger = new Map(), u = G.sel ? byId(st, G.sel) : null;
            if (G.phase === "player" && u && u.hp > 0) {
                if (G.mode === "move") {
                    for (const o of moveTiles(st, u)) marks.set(idx(o.x, o.y), { c: MOVE, a: 0.5 });
                } else {
                    const act = ACTS[PIGEONS[u.k].act];
                    if (act?.aim === "dir") {
                        for (let d = 0; d < 4; d++) {
                            const t = [u.x + DIRS[d][0], u.y + DIRS[d][1]];
                            if (!actTargets(st, u).some((q) => q[0] === t[0] && q[1] === t[1])) continue;
                            for (let i = 1, r = act.reach(u); i <= r; i++) { const a = u.x + DIRS[d][0] * i, b = u.y + DIRS[d][1] * i; if (!inB(a, b) || isSolid(st.tiles[idx(a, b)])) break; marks.set(idx(a, b), { c: TARGET, a: 0.58 }); }
                        }
                    } else for (const [x, y] of actTargets(st, u)) marks.set(idx(x, y), { c: TARGET, a: at(st, x, y) ? 0.85 : 0.58 });
                }
                const t = G.hover ?? G.armed;
                if (t && inB(t[0], t[1]) && marks.has(idx(t[0], t[1]))) marks.set(idx(t[0], t[1]), { c: HOT, a: 0.9 });
                if (G.preview?.target && G.mode === "aim") {
                    const name = PIGEONS[u.k].act, [x, y] = G.preview.target;
                    if (name === "drop") for (const [a, b] of DIRS) if (inB(x + a, y + b)) marks.set(idx(x + a, y + b), { c: HOT, a: 0.5 });
                    if (ACTS[name].aim === "dir") { const d = DIRS.findIndex(([a, b]) => u.x + a === x && u.y + b === y); for (let i = 1, r = ACTS[name].reach(u); i <= r; i++) { const a = u.x + DIRS[d][0] * i, b = u.y + DIRS[d][1] * i; if (!inB(a, b) || isSolid(st.tiles[idx(a, b)])) break; marks.set(idx(a, b), { c: HOT, a: 0.62 }); } }
                }
            }
            for (const i of st.perch) if (!marks.has(i)) marks.set(i, { c: GOLD, a: 0.36 });
            if (st.exit !== null && !marks.has(st.exit)) marks.set(st.exit, { c: GREEN, a: 0.5 });
            const state = shown();
            if (G.phase === "player" || G.phase === "intro") {
                for (const e of state.units) if (e.side === 1 && e.hp > 0 && e.intent) for (const [x, y] of intentTiles(state, e)) danger.set(idx(x, y), { c: e.intent.type === "spray" ? BLUE : RED, a: 0.9 });
                for (const p of state.pending) danger.set(idx(p.x, p.y), { c: WARN, a: 0.8 });
            }
            v.setOverlay(marks, danger);
            for (const p of pigeonUnits()) { const a = v.actor(p.id); if (a?.parts.length) a.tint(p.hp > 0 && p.acted ? "#a6a4b4" : "#ffffff"); }
            const a = G.sel ? v.actor(G.sel) : null;
            v.selRing.hidden = !a;
            const mine = G.phase === "player", cur = u && u.hp > 0 ? u : null;
            btn.undo.disabled = !mine || !G.history.length;
            btn.end.disabled = !mine; btn.end.glow = mine && !pigeons(st).some(ready);
            btn.end.tint = G.threat?.lose ? PAL.red : PAL.green;
            btn.wait.disabled = !mine || !cur || cur.acted;
            const canA = cur && canAct(st, cur) && actTargets(st, cur).length > 0, armed = !!G.armed;
            btn.mode.disabled = !mine || !cur || cur.acted || (G.mode === "move" && !canA && !moveTiles(st, cur).length);
            btn.mode.cap = armed ? "Do it!" : G.mode === "aim" ? (cur && !cur.moved ? "Move" : "Aiming") : "Act";
            if (!armed && G.mode === "aim" && cur?.moved) btn.mode.disabled = true;
            if (!armed && G.mode === "move" && !canA) btn.mode.disabled = true;
            btn.mode.tint = armed ? PAL.red : PAL.gold;
            btn.mode.glow = armed;
            if (armed) btn.mode.cap = "Do it!";
            btn.end.cap = G.endArmed > 0 ? "Sure?" : "End Turn";
            faces.forEach((f) => {
                const q = byId(st, f.uid);
                f.icon = null; f.disabled = !q || q.hp <= 0;
                f.tint = G.sel === f.uid ? PAL.gold : q && (q.acted) ? "#b6b0a8" : PAL.cream;
            });
        }
        const ready = (u) => !u.acted && !(u.npc && u.moved) && (!u.moved || canAct(st, u));

        // ---- doing things ----
        function select(id) {
            const u = byId(st, id);
            if (!u || u.hp <= 0 || u.side !== 0) return;
            G.sel = id; G.armed = null; G.hover = null; G.info = null;
            G.mode = !u.moved ? "move" : "aim";
            if (u.moved && !actTargets(st, u).length) G.mode = "move";
            computePreview(); refresh();
            const a = v.actor(id);
            if (a) { a.sqV -= 3; a.peck = 0.4; }
        }
        function nextReady() {
            const list = pigeons(st).filter(ready), i = list.findIndex((u) => u.id === G.sel);
            const u = list[(i + 1) % Math.max(1, list.length)] ?? null;
            if (u) select(u.id); else { G.sel = null; G.mode = "move"; G.armed = null; G.hover = null; computePreview(); refresh(); }
        }
        const snapshot = () => G.history.push(clone(st));
        function runEvents(after) {
            const ev = st.ev; st.ev = null;
            G.phase = "anim"; computePreview(); refresh();
            v.ghost(null);
            v.play(ev ?? [], () => {
                syncMarkers();
                if (st.over) return finish();
                G.phase = "player"; v.sync(st);
                after?.();
                computePreview(); refresh();
            });
        }
        function doMove(u, x, y) {
            snapshot(); st.ev = [];
            applyMove(st, u, x, y);
            const id = u.id; G.armed = null; G.hover = null; G.hoverRaw = null;
            runEvents(() => { const me = byId(st, id); if (!me) return; if (canAct(st, me) && actTargets(st, me).length) { G.sel = id; G.mode = "aim"; } else if (me.npc) { me.acted = true; nextReady(); } else nextReady(); });
        }
        function doAct(u, x, y) {
            snapshot(); st.ev = [];
            applyAct(st, u, x, y);
            if (game.fxRng.next() < 0.5) { const p = PIGEONS[u.k]; v.say(u.id, p.barks[Math.floor(game.fxRng.next() * p.barks.length)]); }
            if (st.chain >= 2) s.wait(0.5, () => { v.float(`Chain x${st.chain}!`, 0, 1.6, 0, "#ffe27a", 30, 1.3); S.starPop(game, Math.min(3, st.chain)); });
            G.armed = null; G.hover = null; G.hoverRaw = null;
            runEvents(() => nextReady());
        }
        function waitUnit() {
            const u = G.sel ? byId(st, G.sel) : null;
            if (G.phase !== "player" || !u || u.acted) return;
            snapshot(); u.moved = true; u.acted = true; S.click(game);
            nextReady();
        }
        function toggleMode() {
            if (G.phase !== "player") return;
            if (G.armed) { const u = byId(st, G.sel); return doAct(u, G.armed[0], G.armed[1]); }
            const u = G.sel ? byId(st, G.sel) : pigeons(st).find(ready);
            if (!u) return;
            if (!G.sel) return select(u.id);
            if (G.mode === "move" && canAct(st, u) && actTargets(st, u).length) G.mode = "aim";
            else if (!u.moved) G.mode = "move";
            G.hover = null; S.click(game); computePreview(); refresh();
        }
        function undo() {
            if (G.phase !== "player" || !G.history.length) return;
            const was = G.sel;
            st = G.history.pop();
            v.sync(st); syncMarkers(); S.undo(game);
            G.armed = null; G.hover = null;
            const u = was ? byId(st, was) : null;
            G.sel = null;
            if (u && u.hp > 0 && !u.acted) select(u.id); else if (pigeons(st).some(ready)) nextReady(); else { computePreview(); refresh(); }
        }
        function pressEnd() {
            if (G.phase !== "player") return;
            if (pigeons(st).some((u) => ready(u) && !u.npc) && G.endArmed <= 0) { G.endArmed = 2.4; refresh(); S.bad(game); return; }
            G.endArmed = 0;
            G.sel = null; G.armed = null; G.hover = null;
            G.phase = "enemy"; computePreview(); refresh();
            v.ghost(null); v.setOverlay(new Map(), new Map()); v.selRing.hidden = true;
            G.banner = { text: "Enemy Turn", col: "#ff8a6b", t: 0 };
            S.enemyBanner(game);
            v.speed = set.fast ? 2 : 1;
            s.wait(0.55, () => {
                st.ev = [];
                endTurn(st);
                const ev = st.ev; st.ev = null;
                v.scratch = st;
                v.play(ev, () => {
                    v.sync(st); syncMarkers(); G.history = [];
                    if (st.over) return finish();
                    startRound();
                });
            });
        }
        function startRound() {
            G.phase = "player";
            G.banner = { text: st.round >= st.m.rounds ? "Last Round!" : `Round ${st.round}`, col: "#ffe27a", t: 0 };
            S.banner(game);
            nextReady();
        }
        function tapTile(t) {
            if (G.phase !== "player" || !t) return;
            const [x, y] = t, o = at(st, x, y), u = G.sel ? byId(st, G.sel) : null;
            if (u && G.mode === "move") {
                const opt = moveTiles(st, u).find((q) => q.x === x && q.y === y);
                if (opt) return doMove(u, x, y);
                if (o && o.id === u.id) { if (canAct(st, u) && actTargets(st, u).length) { G.mode = "aim"; S.click(game); computePreview(); refresh(); } return; }
            }
            if (u && G.mode === "aim") {
                const c = canonical(u, x, y);
                if (c) {
                    const same = G.armed && G.armed[0] === c[0] && G.armed[1] === c[1];
                    if (same || !s.input.touchMode) return doAct(u, c[0], c[1]);
                    G.armed = c; G.hover = null; S.select(game); computePreview(); refresh();
                    return;
                }
            }
            if (o && o.side === 0) { select(o.id); S.coo(game); return; }
            G.armed = null;
            if (o) {
                const def = o.side === 1 ? ENEMIES[o.k] : PROPS[o.k];
                G.info = { title: def.name, text: def.desc, face: o.side === 1 ? faceName(o.k) : `full_${o.k}` };
                S.click(game); computePreview(); refresh(); return;
            }
            const tt = st.tiles[idx(x, y)], inf = { [T.WATER]: "water", [T.HEDGE]: "hedge", [T.HEDGE1]: "hedge", [T.STONE]: "stone", [T.SLICK]: "slick", [T.SPIKE]: "spike", [T.VOID]: "void" }[tt];
            G.info = inf ? { title: TERRAIN_INFO[inf][0], text: TERRAIN_INFO[inf][1] } : null;
            if (!inf && G.sel) { G.sel = null; }
            computePreview(); refresh();
        }

        // ---- input ----
        s.onUpdate((dt) => {
            G.t += dt;
            v.update(dt);
            if (G.endArmed > 0) { G.endArmed -= dt; if (G.endArmed <= 0) refresh(); }
            if (G.banner) { G.banner.t += dt; if (G.banner.t > 1.1) G.banner = null; }
            const a = G.sel ? v.actor(G.sel) : null;
            if (a) { v.selRing.pos.set(a.x, 0.09, a.z); const k = 1 + Math.sin(G.t * 6) * 0.04; v.selRing.scale.set(k, k, k); v.selRing.color = GOLD; v.selRing.opacity = 0.95; }
            const p = s.input.pointer;
            if (G.phase === "intro") { G.briefT += dt; if (G.briefT > 0.4 && (p.tapped || s.input.pressed("confirm"))) { G.brief = false; beginPlay(); } if (!G.brief || G.briefT > 30) beginPlay(); return; }
            if (G.phase === "enemy" && (p.tapped || s.input.pressed("confirm"))) v.speed = 3;
            if (G.menu || G.phase !== "player") return;
            // Keyboard: arrows steer a cursor, confirm presses it.
            let moved = false;
            for (const [act, d] of [["up", [0, -1]], ["down", [0, 1]], ["left", [-1, 0]], ["right", [1, 0]]]) if (s.input.pressed(act)) { G.cursor = [Math.max(0, Math.min(N - 1, G.cursor[0] + d[0])), Math.max(0, Math.min(N - 1, G.cursor[1] + d[1]))]; moved = true; G.keys = true; }
            if (moved) { setHover(G.cursor); S.click(game); }
            if (s.input.pressed("confirm") && G.keys) tapTile(G.cursor);
            if (s.input.pressed("nextUnit")) { nextReady(); const u = byId(st, G.sel); if (u) G.cursor = [u.x, u.y]; }
            if (p.pressed) { G.down = [p.x, p.y]; G.moved = 0; G.pressTile = v.pick(p.x, p.y, st); G.keys = false; setHover(G.pressTile); }
            if (p.down && G.down) {
                G.moved = Math.max(G.moved, Math.hypot(p.x - G.down[0], p.y - G.down[1]));
                if (G.moved > 10) setHover(v.tileAt(p.x, p.y - (s.input.touchMode ? 34 : 0)));   // keep the tile clear of the thumb
            } else if (!s.input.touchMode && !G.keys && !G.down) {
                const t = v.tileAt(p.x, p.y), onPanel = P.wide ? p.x > P.panel.x : p.y > P.panel.y - 40;
                setHover(onPanel ? null : v.pick(p.x, p.y, st) ?? t);
            }
            if (p.released && G.down) {
                const t = G.moved > 10 ? G.hover : G.pressTile;
                G.down = null;
                if (G.moved > 10 && !t) { setHover(null); return; }
                tapTile(t);
            }
        });
        function setHover(t) {
            const r = G.hoverRaw, same = (!t && !r) || (t && r && t[0] === r[0] && t[1] === r[1]);
            if (same) return;
            G.hoverRaw = t;
            G.hover = t;
            const u = G.sel ? byId(st, G.sel) : null;
            if (t && u && G.mode === "aim") { const c = canonical(u, t[0], t[1]); G.hover = c ?? null; if (c) { G.armed = s.input.touchMode ? null : G.armed; if (s.input.touchMode && G.down) game.haptic("tick"); } }
            if (u && G.mode === "move") {
                const o = t && moveTiles(st, u).find((q) => q.x === t[0] && q.y === t[1]);
                if (o) { const l = o.path.length, [px, py] = l > 1 ? o.path[l - 2] : [u.x, u.y], d = DIRS.findIndex(([a, b]) => a === o.x - px && b === o.y - py); v.ghost(u.k, o.x, o.y, [Math.PI, Math.PI / 2, 0, -Math.PI / 2][d]); if (G.down && s.input.touchMode) game.haptic("tick"); }
                else v.ghost(null);
            } else v.ghost(null);
            computePreview(); refresh();
        }
        function beginPlay() {
            if (G.phase !== "intro") return;
            startRound();
        }
        if (!G.brief) { s.wait(0.2, beginPlay); }

        // ---- finishing ----
        function finish() {
            G.phase = "over"; G.sel = null; computePreview(); refresh();
            v.setOverlay(new Map(), new Map()); v.selRing.hidden = true;
            for (const k of Object.keys(btn)) btn[k].hidden = true;
            faces.forEach((f) => { f.hidden = true; });
            const won = st.over === "win";
            const stars = starsFor(st);
            const dead = st.units.filter((u) => u.side === 0 && !u.npc && u.hp <= 0).map((u) => u.k);
            G.result = { won, stars, dead, t: 0, shown: 0 };
            if (won) {
                S.win(game); s.shake(4, 0.3, { haptic: false });
                for (const u of pigeons(st)) { const a = v.actor(u.id); if (a) s.every(0.45 + game.fxRng.next() * 0.2, () => { a.flap = 0.4; a.move(a.x, a.z, 0.28, { arc: 0.4 }); }); }
                game.stopMusic(); game.data._song = null;
                if (args.rogue) { G.result.reward = args.onWin?.(st, dead, stars); }
                else { const fresh = loadMeta(game); Object.assign(G.result, recordWin(fresh, m, stars, dead)); fresh.last = squad.map((q) => q.k); saveMeta(game, fresh); }
                const mvp = pigeons(st)[0];
                if (mvp) { const p = PIGEONS[mvp.k]; G.result.quote = { k: mvp.k, text: p.barks[Math.floor(game.fxRng.next() * p.barks.length)] }; }
                stars.forEach((on, i) => s.wait(0.45 + i * 0.32, () => { G.result.shown = i + 1; if (on) { S.starPop(game, i); game.haptic("medium"); s.burst({ at: [s.view.width / 2 + (i - 1) * 52, s.view.height * 0.3], count: 12, color: ["#ffe27a", "#fff"], speed: [40, 160], life: [0.3, 0.6], size: [2, 5] }); } }));
            } else {
                S.lose(game); game.stopMusic(); game.data._song = null;
                if (args.rogue) args.onLose?.(st);

            }
            const W = s.view.width, H = s.view.height, cx = W / 2, cy = Math.min(H - s.view.safe.bottom - 34, H * 0.5 + 132);
            const go = won ? (args.next ?? (() => game.go(m.final ? "ending" : "map", { focus: m.id }, { fade: 0.4 }))) : null;
            s.add([ui(), layer(60), pos(cx + (won ? 0 : 70), cy), toy(won ? "Continue" : args.rogue ? "Run Over" : "Back", { width: won ? 180 : 120, height: 52, color: won ? PAL.green : PAL.grey, action: won ? "confirm" : undefined, textSize: 19, onTap: () => { game.touch.enabled = false; if (won) go(); else (args.quit ?? (() => game.go("map", {}, { fade: 0.3 })))(); } }), { name: "continue" }]);
            if (!won && !args.rogue) s.add([ui(), layer(60), pos(cx - 70, cy), toy("Retry", { width: 120, height: 52, color: PAL.green, action: "confirm", textSize: 19, onTap: () => game.go("battle", { ...args }, { fade: 0.2 }) }), { name: "retry" }]);
        }

        // ---- menu ----
        const menuEnts = [];
        function closeMenu() { for (const e of menuEnts) e.destroy(); menuEnts.length = 0; G.menu = false; s.paused = false; if (G.phase !== "over") { for (const k of Object.keys(btn)) btn[k].hidden = false; faces.forEach((f) => { f.hidden = false; }); } }
        function openMenu() {
            if (G.menu) { closeMenu(); return; }
            G.menu = true;
            for (const k of Object.keys(btn)) if (k !== "menu") btn[k].hidden = true;
            faces.forEach((f) => { f.hidden = true; });
            const W = s.view.width, H = s.view.height, cx = W / 2; const wideMenu = W > H;
            let y = H / 2 - (wideMenu ? 135 : 150), col2 = 0;
            const add = (t, fn, col) => { if (wideMenu && col2 === 3) y = H / 2 - 135; const ex = wideMenu ? (col2 < 3 ? -115 : 115) : 0; col2++; const e = s.add([ui(), layer(80), pos(cx + ex, y + (wideMenu ? 40 : 0)), toy(t, { width: 214, height: 52, color: col ?? PAL.blue, onTap: () => fn(e) }), { name: t }]); menuEnts.push(e); y += 58; return e; };
            const save = () => { const f = loadMeta(game); f.settings = set; saveMeta(game, f); };
            add("Resume", closeMenu, PAL.green);
            add(set.sound ? "Sound: On" : "Sound: Off", (e) => { set.sound = !set.sound; game.audio.muted = !set.sound; e.cap = set.sound ? "Sound: On" : "Sound: Off"; save(); });
            add(set.music ? "Music: On" : "Music: Off", (e) => { set.music = !set.music; e.cap = set.music ? "Music: On" : "Music: Off"; if (set.music) { game.data._song = null; playSong(game, "battle"); } else { game.stopMusic(); game.data._song = null; } save(); });
            add(set.haptics ? "Haptics: On" : "Haptics: Off", (e) => { set.haptics = !set.haptics; game.haptics.enabled = set.haptics; e.cap = set.haptics ? "Haptics: On" : "Haptics: Off"; save(); if (set.haptics) game.haptic("medium"); });
            if (!args.rogue) add("Restart Battle", () => { closeMenu(); game.go("battle", { ...args }, { fade: 0.2 }); }, PAL.gold);
            add(args.rogue ? "Abandon Run" : "Quit to Map", () => { closeMenu(); (args.quit ?? (() => game.go("map", {}, { fade: 0.3 })))(); }, PAL.red);
        }

        // ---- drawn over the world ----
        function arrow(d, a, b, col, w = 4, head = 9) {
            const ang = Math.atan2(b.y - a.y, b.x - a.x), hx = b.x - Math.cos(ang) * head * 0.8, hy = b.y - Math.sin(ang) * head * 0.8;
            d.line([a.x, a.y], [hx, hy], { width: w + 3, color: "#1b1526" });
            d.line([a.x, a.y], [hx, hy], { width: w, color: col });
            const p = [[b.x, b.y], [hx - Math.sin(ang) * head * 0.8, hy + Math.cos(ang) * head * 0.8], [hx + Math.sin(ang) * head * 0.8, hy - Math.cos(ang) * head * 0.8]];
            const c = { x: (p[0][0] + p[1][0] + p[2][0]) / 3, y: (p[0][1] + p[1][1] + p[2][1]) / 3 };
            d.poly(p.map(([x, y]) => [c.x + (x - c.x) * 1.4, c.y + (y - c.y) * 1.4]), { color: "#1b1526" });
            d.poly(p, { color: col });
        }
        const tileP = (x, y, h = 0.12) => v.project(wx(x), h, wz(y));
        function chip(d, x, y, str, bg, fg = "#fff", size = 12) {
            const w = Math.max(18, str.length * size * 0.62 + 8), h = size + 7;
            d.rect(w + 3, h + 3, { x, y, color: "#1b1526", radius: 7 });
            d.rect(w, h, { x, y, color: bg, radius: 6 });
            d.text(str, { x, y: y + 0.5, size, bold: true, font: FONT, color: fg });
        }
        function drawIntents(d) {
            const state = shown(), ts = v.tileSize;
            for (const u of state.units) {
                if (u.side !== 1 || u.hp <= 0 || !u.intent) continue;
                const it = u.intent, col = it.type === "spray" ? "#55b7ff" : "#ff4b3e", base = tileP(u.x, u.y, 0.3), tiles = intentTiles(state, u), wob = Math.sin(G.t * 5) * 1.5;
                if (it.type === "melee" || it.type === "line" || it.type === "dive" || it.type === "cross" || it.type === "spray") {
                    const ends = it.type === "spray" ? tiles.slice(-1) : tiles;
                    for (const [x, y] of ends) { const a = tileP(x, y, 0.3), k = 1 - Math.min(0.3, ts * 0.006); arrow(d, { x: base.x + (a.x - base.x) * 0.24, y: base.y + (a.y - base.y) * 0.24 }, { x: base.x + (a.x - base.x) * (k + wob * 0.01), y: base.y + (a.y - base.y) * (k + wob * 0.01) }, col, it.type === "dive" ? 6 : 4, it.type === "dive" ? 11 : 9); }
                } else if (it.type === "wide") {
                    for (const [x, y] of tiles) { const a = tileP(x, y, 0.3); arrow(d, { x: base.x + (a.x - base.x) * 0.3, y: base.y + (a.y - base.y) * 0.3 }, { x: base.x + (a.x - base.x) * 0.85, y: base.y + (a.y - base.y) * 0.85 }, col, 4); }
                } else if (it.type === "lob" && tiles[0]) {
                    const [x, y] = tiles[0]; let prev = null;
                    for (let i = 0; i <= 12; i++) { const t = i / 12, X = wx(u.x) + (wx(x) - wx(u.x)) * t, Z = wz(u.y) + (wz(y) - wz(u.y)) * t, p = v.project(X, 0.5 + Math.sin(t * Math.PI) * 1.5, Z); if (prev && i % 2 === 0) { d.line([prev.x, prev.y], [p.x, p.y], { width: 6, color: "#1b1526" }); d.line([prev.x, prev.y], [p.x, p.y], { width: 3.5, color: col }); } if (i % 2 === 1 || i === 0) prev = p; }
                    const e = tileP(x, y, 0.2);
                    d.circle(5 + wob, { x: e.x, y: e.y, color: col });
                }
                const foot = tileP(u.x, u.y, 0.02), fy = foot.y + ts * 0.26;
                d.circle(8.5, { x: foot.x, y: fy, color: "#1b1526" }); d.circle(7, { x: foot.x, y: fy, color: "#d92f26" });
                d.text(String(u.ord), { x: foot.x, y: fy + 0.5, size: 10, bold: true, font: FONT, color: "#fff" });
            }
            for (const p of state.pending) {
                const e = tileP(p.x, p.y, 0.5), bob = Math.sin(G.t * 4) * 2, sz = ts * 0.52;
                d.sprite(faceName(p.k), { x: e.x, y: e.y - 6 + bob, width: sz, height: sz, opacity: 0.85 });
                chip(d, e.x + sz * 0.4, e.y + 4, "!", "#ff9f40", INK, 11);
            }
        }
        function drawPips(d) {
            const threat = G.threat?.sum, prev = G.preview?.sum;
            for (const u of st.units) {
                if (u.hp <= 0 || u.env || (u.side === 2 && !u.keep && u.k !== "box")) continue;
                const a = v.actor(u.id);
                if (!a) continue;
                const t = a.top(), p = v.project(t.x, t.y + 0.1, t.z), max = u.mhp, big = max > 6, w = big ? 44 : Math.min(9, 40 / max), h = 6, tw = big ? w : w * max + 1;
                const hit = (prev?.dmg.get(u.id) ?? 0) + (G.phase === "player" ? threat?.dmg.get(u.id) ?? 0 : 0);
                const blink = 0.5 + Math.sin(G.t * 10) * 0.5;
                d.rect(tw + 4, h + 4, { x: p.x, y: p.y, color: "#1b1526", radius: 3 });
                const on = u.side === 0 ? "#5be37d" : u.keep ? "#ffd84a" : "#ff6a55";
                if (big) {
                    d.rect(w, h, { x: p.x, y: p.y, color: "#463a4e", radius: 2 });
                    const f = u.hp / max; d.rect(w * f, h, { x: p.x - (w - w * f) / 2, y: p.y, color: on, radius: 2 });
                    outlined(d, String(u.hp), p.x + w / 2 + 9, p.y, 11, "#fff", "#1b1526", 1);
                } else for (let i = 0; i < max; i++) {
                    const x = p.x - tw / 2 + w * (i + 0.5) + 0.5, alive = i < u.hp, doomed = alive && i >= u.hp - hit;
                    d.rect(w - 1, h, { x, y: p.y, color: alive ? (doomed ? (blink > 0.5 ? "#fff" : "#ff3b30") : on) : "#463a4e", radius: 1.5 });
                }
                if (u.sh) d.sprite("shield", { x: p.x - tw / 2 - 9, y: p.y, width: 14, height: 14 });
                if (u.soak) outlined(d, "wet", p.x, p.y - 11, 10, "#a9e6f7", "#1b1526", 1);
                const ko = prev?.dead.has(u.id) || (G.phase === "player" && threat?.dead.has(u.id));
                if (ko && u.side !== 2) d.sprite("skull", { x: p.x, y: p.y - 16 + blink, width: 22, height: 22 });
                else if (hit && G.phase === "player") chip(d, p.x, p.y - 14, `-${hit}`, u.side === 1 ? "#f28a1e" : "#d92f26", "#fff", 11);
            }
            if (G.phase === "player") for (const u of pigeons(st)) {
                if (!ready(u) || u.id === G.sel) continue;
                const a = v.actor(u.id); if (!a) continue;
                const t = a.top(), p = v.project(t.x, t.y + 0.1, t.z), b = Math.sin(G.t * 5 + u.id) * 2;
                d.poly([[p.x - 6, p.y - 22 + b], [p.x + 6, p.y - 22 + b], [p.x, p.y - 14 + b]], { color: "#ffd84a" });
            }
            if (G.preview) for (const [id, q] of G.preview.sum.push) {
                const a = tileP(q.x0, q.y0, 0.3), b = tileP(q.x1, q.y1, 0.3);
                if (q.x0 !== q.x1 || q.y0 !== q.y1) arrow(d, a, b, "#ffffff", 5, 10);
                if (q.bump) { const e = tileP(q.x1 + q.bump[0] * 0.5, q.y1 + q.bump[1] * 0.5, 0.35); d.sprite("spark", { x: e.x, y: e.y, width: 22, height: 22, rot: G.t * 3 }); }
                void id;
            }
        }
        s.onDraw((d) => {
            if (G.phase === "player" || G.phase === "intro") drawIntents(d);
            if (G.phase !== "over") drawPips(d);
            v.drawFx(d);
            v.drawBubbles(d);
            if (G.keys && G.phase === "player") { const p = tileP(G.cursor[0], G.cursor[1], 0.1); d.circle(5, { x: p.x, y: p.y, color: "#fff" }); }
        });

        function coach() {
            if (G.phase !== "player") return null;
            const id = m.id;
            if (id !== "l1" || st.round > 1) return null;
            const sarge = pigeons(st).find((u) => u.k === "sarge"), crow = foes(st).sort((a, b) => Math.abs(a.x - sarge.x) + Math.abs(a.y - sarge.y) - (Math.abs(b.x - sarge.x) + Math.abs(b.y - sarge.y)))[0];
            if (!sarge || !crow) return null;
            if (!sarge.acted && G.sel !== sarge.id) return { text: "Tap Sgt. Coo", tile: [sarge.x, sarge.y] };
            const near = Math.abs(sarge.x - crow.x) + Math.abs(sarge.y - crow.y) === 1;
            if (!sarge.acted && G.mode === "move" && near) return { text: "A crow! Tap Act", btn: btn.mode };
            if (!sarge.acted && G.mode === "move") {
                const opts = moveTiles(st, sarge).sort((a, b) => Math.abs(a.x - crow.x) + Math.abs(a.y - crow.y) - Math.abs(b.x - crow.x) - Math.abs(b.y - crow.y));
                if (opts[0] && Math.abs(sarge.x - crow.x) + Math.abs(sarge.y - crow.y) > 1) return { text: "Tap a blue tile to hop there", tile: [opts[0].x, opts[0].y] };
            }
            if (!sarge.acted && G.mode === "aim") return { text: G.armed ? "Tap again to slap" : "Slap that crow", tile: [crow.x, crow.y] };
            if (!pigeons(st).some(ready)) return { text: "Now End Turn", btn: btn.end };
            return null;
        }

        s.add([ui(), layer(45), pos(0, 0), { name: "panel", draw(d) {
            if (!P) return;
            const W = s.view.width, H = s.view.height;
            if (G.phase !== "over") {
                const p = P.panel, u = G.sel ? byId(st, G.sel) : null, inf = G.info;
                let x, y, w, h;
                if (P.wide) { x = p.x + (p.w - P.R) / 2; y = 128 + P.T; w = p.w - P.R - 10; h = 122; d.rect(p.w + 6, H + 8, { x: p.x + p.w / 2, y: H / 2, color: "#2a2233", opacity: 0.32 }); }
                else { x = W / 2; y = P.bot - 104; w = W - P.L - P.R - 10; h = 76; d.rect(W, p.h + 4, { x: W / 2, y: p.y + p.h / 2, color: "#2a2233", opacity: 0.4 }); }
                card(d, x, y, w, h, { r: 12 });
                const left = x - w / 2 + 8, top = y - h / 2 + 8;
                const face = (name, big = 46, fy = top + big / 2) => { d.circle(big / 2 + 1, { x: left + big / 2, y: fy, color: "#2a2233" }); d.circle(big / 2 - 1, { x: left + big / 2, y: fy, color: "#e8d8ba" }); d.sprite(name, { x: left + big / 2, y: fy, width: big - 3, height: big - 3 }); };
                const para = (txt, px, ty, cols, size = 12, col = "#5a4a44") => wrap(txt, cols).slice(0, 5).forEach((l, i) => leftText(game, d, l, px, ty + i * (size + 3), size, col, false));
                const tx = left + 54, cols = P.wide ? 23 : Math.floor((w - 66) / 6.1);
                const headL = (txt, c = INK, size = 15) => leftText(game, d, txt, tx, top + 8, size, c);
                if (u && u.hp > 0) {
                    const c = PIGEONS[u.k];
                    face(faceName(u.k));
                    headL(c.name);
                    const sub = c.actName ? `${c.role} · ${c.actName}` : c.role;
                    leftText(game, d, sub, tx, top + 23, 11, "#b0603a");
                    const t = G.preview?.target ? previewText() : G.mode === "aim" ? c.actDesc : u.moved ? (c.actDesc ?? "") : "Tap a blue tile to move. Drag to look first.";
                    para(u.soak ? "Soaked! Can only shuffle one tile." : c.npc ? c.tag : t ?? "", tx, top + 37, cols);
                    
                } else if (inf) {
                    if (inf.face) face(inf.face);
                    const shift = inf.face ? tx : left + 2;
                    leftText(game, d, inf.title, shift, top + 8, 15);
                    para(inf.text, shift, top + 26, cols);
                } else {
                    const text = pigeons(st).some(ready) ? "Tap a pigeon. Red tiles get hit next. Tap any enemy to read it." : "Everyone's done. End the turn.";
                    para(text, left + 4, top + 8, Math.floor((w - 16) / 6), 12);
                }
            }
        } }]);

        s.onDrawUI((d) => {
            const W = s.view.width, H = s.view.height;
            if (!P) return;
            const zone = ZONES[m.zone];
            // Goal card
            const gw = (P.wide ? P.panel.x : W - P.R) - P.L - 66, gx = P.L + 6 + gw / 2, gy = 26 + P.T, g = goalText(st);
            card(d, gx, gy, gw, 40, { r: 12 });
            label(d, g, gx, gy - 8, g.length > 30 ? 12 : 14, INK);
            const rounds = m.rounds, dotW = Math.min(16, (gw - 80) / rounds);
            leftText(game, d, `Round ${st.round}/${rounds}`, gx - gw / 2 + 12, gy + 10, 11, "#7d6a58");
            for (let i = 0; i < rounds; i++) d.circle(4.5, { x: gx - gw / 2 + 92 + i * dotW, y: gy + 10, color: i < st.round - 1 ? "#b8a68f" : i === st.round - 1 ? PAL.gold : "#e7dac1" });
            // Forecast
            if (G.phase === "player" && G.threat) {
                const t = G.threat, text = t.lines.length ? t.lines.slice(0, 3).join(", ") + (t.lines.length > 3 ? ` +${t.lines.length - 3}` : "") : "Nobody's getting hit";
                const y = 60 + P.T, w = Math.min(gw, text.length * 6.8 + 44), bg = t.lose ? "#c42b23" : t.lines.length ? "#e0702f" : "#3e9f58", x = P.L + 6 + w / 2;
                d.rect(w + 3, 24, { x, y: y + 1, color: INK, radius: 9 }); d.rect(w, 21, { x, y, color: bg, radius: 8 });
                label(d, (t.lose ? "You'd lose: " : "") + text, x, y, 12, "#fff");
            }
            if (G.phase !== "over") {
                // HP in the face strip
                for (const f of faces) {
                    const q = byId(st, f.uid);
                    if (!q) continue;
                    d.sprite(faceName(q.k), { x: f.pos.x, y: f.pos.y - 1, width: f.size.x - 8, height: f.size.x - 8, opacity: q.hp > 0 ? (q.acted ? 0.6 : 1) : 0.25 });
                    if (q.hp > 0) { const n = q.mhp, pw = Math.min(6, 34 / n); for (let i = 0; i < n; i++) d.rect(pw - 1, 4, { x: f.pos.x + (i - (n - 1) / 2) * pw, y: f.pos.y + 20, color: i < q.hp ? "#3fb45a" : "#a89a8c", radius: 1 }); }
                    else d.sprite("skull", { x: f.pos.x, y: f.pos.y, width: 22, height: 22 });
                }
            }
            // Banner
            if (G.banner) {
                const b = G.banner, k = b.t < 0.16 ? b.t / 0.16 : b.t > 0.9 ? (1.1 - b.t) / 0.2 : 1, y = P.wide ? H * 0.44 : H * 0.36, cx = P.wide ? P.panel.x / 2 : W / 2;
                d.rect(W * 1.2, 50 * k, { x: W / 2, y, color: "#2a2233", opacity: 0.72 });
                outlined(d, b.text, cx + (1 - k) * 80, y, 30, b.col, INK, 2, { opacity: k });
            }
            // Coaching hand
            const c = coach();
            if (c) {
                let px, py;
                if (c.tile) { const q = at(st, c.tile[0], c.tile[1]), a = q ? v.actor(q.id) : null; const pt = a ? v.project(a.x, 0.5, a.z) : tileP(c.tile[0], c.tile[1], 0.1); px = pt.x; py = pt.y; }
                else { px = c.btn.pos.x; py = c.btn.pos.y - 14; }
                const b = Math.sin(G.t * 6) * 5;
                d.sprite("hand", { x: px + 10, y: py + 28 + b, width: 40, height: 40 });
                const w = c.text.length * 7.6 + 22, x = Math.max(w / 2 + 6, Math.min(W - w / 2 - 6, px));
                card(d, x, py - 30, w, 26, { fill: "#fff1b0", r: 9, lip: 2 });
                label(d, c.text, x, py - 30, 13);
            }
            // Pre-battle line from the squad
            if (G.phase === "intro" && G.brief) {
                const w = Math.min(W - 16, 420), x = (P.wide ? P.panel.x : W) / 2, y = P.wide ? P.bot - 60 : P.faceY - 72, k = Math.min(1, G.briefT * 6);
                const lines = wrap(m.brief, Math.floor((w - 78) / 6.8));
                const h = Math.max(62, 30 + lines.length * 16);
                d.push(); d.translate(x, y); d.scale(k, k);
                card(d, 0, 0, w, h, { r: 14 });
                const who = m.speaker in PIGEONS || ["steve", "contessa", "hazel", "swan"].includes(m.speaker) ? m.speaker : "sarge";
                d.sprite(`face_${who}`, { x: -w / 2 + 34, y: 0, width: 52, height: 52 });
                lines.forEach((l, i) => label(d, l, 32, -((lines.length - 1) * 8) + i * 16, 13));
                d.pop();
                outlined(d, "tap to start", x, y + h / 2 + 16, 12, "#fff", INK, 1);
            }
            // Result
            const r = G.result;
            if (r) {
                const cx = W / 2, ch = Math.min(250, H - 110), cy = Math.min(H * 0.5, H - 62 - s.view.safe.bottom - ch / 2) + 4, cw = Math.min(W - 20, 320);
                r.t += 1 / 60;
                const k = Math.min(1, r.t * 5);
                d.rect(W, H, { x: W / 2, y: H / 2, color: "#201830", opacity: 0.45 * k });
                d.push(); d.translate(cx, cy - 10); d.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
                card(d, 0, 0, cw, ch, { r: 18 });
                outlined(d, r.won ? "Park Secured!" : "Routed!", 0, -ch / 2 + 30, 26, r.won ? "#ffd84a" : "#ff8a6b", INK, 2);
                if (r.won) {
                    r.stars.forEach((on, i) => {
                        const x = (i - 1) * 62, y = -ch / 2 + 82, s2 = i < r.shown ? 1 : 0;
                        d.sprite("starhole", { x, y, width: 52, height: 52 });
                        if (on && s2) d.sprite("star", { x, y, width: 54, height: 54 });
                    });
                    const list = ["Won the battle", ...(m.stars ?? []).map((b) => BONUS_TEXT[b.k](b))];
                    list.forEach((t, i) => label(d, t, 0, -ch / 2 + 118 + i * 15, 12, r.stars[i] ? "#3a8a4a" : "#a09082"));
                    if (r.seeds) { d.sprite("seed", { x: -30, y: ch / 2 - 62, width: 20, height: 20 }); label(d, `+${r.seeds} seeds`, 12, ch / 2 - 62, 15, "#a9661c"); }
                    if (r.recruit) label(d, `${PIGEONS[r.recruit].name} joins the squad!`, 0, ch / 2 - 38, 14, "#8b3f9c");
                    else if (r.quote) label(d, `"${r.quote.text}"`, 0, ch / 2 - 38, 12, "#7d6a58", false);
                    if (r.reward) label(d, r.reward, 0, ch / 2 - 62, 13, "#3a6a9a");
                } else {
                    wrap(WHY[st.why] ?? "", 34).forEach((l, i) => label(d, l, 0, -30 + i * 18, 15));
                    label(d, "Every turn can be undone. Nothing here is luck.", 0, 30, 11, "#8a7a6a");
                }
                d.pop();
            }
            if (G.menu) { d.rect(W, H, { x: W / 2, y: H / 2, color: "#201830", opacity: 0.6 }); }
            void zone;
        });
        function previewText() {
            const pv = G.preview; if (!pv) return "";
            const parts = [];
            for (const [id, n] of pv.sum.dmg) { const u = byId(st, id); if (u) parts.push(`${nameOf(u)} -${n}`); }
            for (const id of pv.sum.dead) { const u = byId(st, id); if (u) parts.push(`${nameOf(u)} out`); }
            if (!parts.length && pv.sum.push.size) parts.push(`${pv.sum.push.size} shoved`);
            return (parts.length ? parts.slice(0, 3).join(", ") : "No effect") + (s.input.touchMode ? ". Tap again to do it." : ".");
        }

        computePreview(); refresh();
        globalThis.__squad = { G, get st() { return st; }, v, tapTile, select, pressEnd, undo, finish, toggleMode, waitUnit, doMove: (u, x, y) => doMove(u, x, y), doAct: (u, x, y) => doAct(u, x, y), setHover, btn };
        void [beginRound, checkOver, bonusMet, color, PAPER];
    });
}
