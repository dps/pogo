// Title, tour map, results, practice, settings and the ending. All of it bops to a menu loop on the same clock as the game.
import { pin, ui } from "../pogo.js";
import { arrange } from "../music/arrange.js";
import { MENU, SONGS, songById } from "../music/songs.js";
import { DIFFS, CHARTS } from "../charts.js";
import { GOBLINS, drawGoblin, EYE, MOUTH } from "../art/goblins.js";
import { ensureStage, isPainted, STAGE } from "../art/stages.js";
import { P } from "../art/props.js";
import { letters, measure } from "../art/font.js";
import { CONFETTI, FX } from "../fx.js";
import { bubble, chunky, drawStage, drawStars, gradeColor } from "../ui.js";
import { applySettings, bandSize, best, goblin, isOpen, kitsOpen, songIndex, STOPS, stopOf, totalStars, writeSave } from "../story.js";
import { KITS, SND } from "../sfx.js";

const INK = "#1b1423";
const DIFF_NAME = { easy: "EASY", normal: "NORMAL", hard: "HARD" };
const DIFF_COLOR = { easy: "#8fd13f", normal: "#ffc93c", hard: "#ff5a4f" };

export function menus(ctx) {
    const { game, clock } = ctx;
    const cache = new Map();
    /** Keep a menu loop going across menu screens: only change it when the mood changes. */
    function mood(name) {
        game.haptics.auto = true;
        if (ctx.mood === name && clock.arr) return;
        ctx.mood = name;
        let a = cache.get(name);
        if (!a) { a = arrange(MENU[name], { loop: true }); cache.set(name, a); }
        clock.play(a, { loop: true });
    }
    ctx.moodReset = () => { ctx.mood = null; };
    const brain = (s, fx, fn) => s.add([ui(), { update(dt) { clock.step(); fx?.update(dt); fn?.(dt); } }]);

    // ------------------------------------------------------------------- Title
    game.scene("title", (s) => {
        game.touch.enabled = false;
        ctx.hide = null;
        clock.onStall = null;
        const fx = new FX(game), stage = ensureStage(game, "fest");
        let bonk = 0, bv = 0, eyeT = 0, mouthT = 0, eye = EYE.open, mouth = MOUTH.smile, bonks = 0;
        const hero = GOBLINS[0], pal = GOBLINS[1];
        const layout = () => {
            const v = game.view, wide = v.width > v.height;
            return wide
                ? { logoX: v.width * 0.3, logoY: v.height * 0.17, size: Math.min(v.height * 0.2, 72), heroX: v.width * 0.73, heroY: v.height * 0.46, heroS: v.height * 0.52 }
                : { logoX: v.width / 2, logoY: v.safe.top + v.height * 0.07, size: Math.min(v.width * 0.2, v.height * 0.115), heroX: v.width / 2, heroY: v.height * 0.53, heroS: Math.min(v.width * 0.6, v.height * 0.3) };
        };
        s.add([{
            draw(d) {
                const v = game.view, b = clock.bop(), L = layout();
                drawStage(d, stage, v, v.height * 0.62, { zoom: 1 + b.kick * 0.015 });
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#1b1033", opacity: 0.38 });
                d.additive(() => { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + clock.now() * 0.12, r = Math.max(v.width, v.height); d.poly([[L.heroX, L.heroY], [L.heroX + Math.cos(a - 0.1) * r, L.heroY + Math.sin(a - 0.1) * r], [L.heroX + Math.cos(a + 0.1) * r, L.heroY + Math.sin(a + 0.1) * r]], { color: "#ffc93c", opacity: 0.07 + b.kick * 0.04 }); } });
                const gs = L.heroS, sq = bonk * 0.1 + b.kick * 0.12;
                d.sprite("bassdrum", { x: L.heroX + gs * 0.72, y: L.heroY + gs * 0.72, width: gs * 0.74 * (1 + b.kick * 0.05), height: gs * 0.74 * (1 + b.kick * 0.05) });
                drawGoblin(d, pal, L.heroX - gs * 0.74, L.heroY + gs * 0.36, gs * 0.66, { squash: b.snare * 0.2, tilt: -b.sway * 0.08, ear: b.snare * 0.3, eye: mouthT > 0 ? EYE.happy : EYE.open, mouth: mouthT > 0 ? MOUTH.grin : MOUTH.oh, look: [0.9, -0.2] });
                drawGoblin(d, hero, L.heroX, L.heroY, gs, { squash: sq, tilt: b.sway * 0.06, ear: -bonk * 0.1 + b.snare * 0.14, eye: eyeT > 0 ? eye : EYE.open, mouth: mouthT > 0 ? mouth : MOUTH.grin, look: [Math.sin(clock.now() * 1.3) * 0.6, 0.1], hatPop: Math.max(0, bonk * 0.1) });
            },
        }]);
        s.onDraw((d) => fx.draw(d));
        s.onDrawUI((d) => {
            const b = clock.bop(), L = layout();
            letters(d, "BEAT", L.logoX, L.logoY, { size: L.size * (1 + b.kick * 0.05), color: "#ffe27a", wave: 3, phase: b.phase, shadow: "#b0245e", pop: 0.08 });
            letters(d, "GOBLIN", L.logoX, L.logoY + L.size * 0.9, { size: L.size * 1.12 * (1 + b.kick * 0.05), color: "#a8ee4c", wave: 3, phase: b.phase + 0.3, shadow: "#1f6a4a", pop: 0.08 });
            d.text("Drum on goblin heads. Reach the Festival.", { x: L.logoX, y: L.logoY + L.size * 1.66, size: 13, bold: true, color: "#fff7d6" });
            if (bonks > 0 && bonks < 6) letters(d, `BONK x${bonks}`, L.heroX, L.heroY - L.heroS * 0.86, { size: 22, color: "#ffe27a" });
        });
        brain(s, fx, (dt) => {
            bv += (-300 * bonk - 16 * bv) * dt; bonk += bv * dt; eyeT -= dt; mouthT -= dt;
            const p = s.input.pointer, L = layout();
            if (p.tapped || p.pressed) {
                if (Math.hypot(p.x - L.heroX, p.y - L.heroY) < L.heroS * 0.62) {
                    bonks++;
                    bv += 11; eye = EYE.star; eyeT = 0.22; mouth = MOUTH.yell; mouthT = 0.22;
                    game.sfx(SND.bonk); game.haptic(34);
                    s.shake(2.5, 0.08);
                    fx.spray(P.star, L.heroX, L.heroY - L.heroS * 0.3, 7, { speed: [120, 340], grav: 700, size: 18, life: 0.6 });
                }
            }
        });
        const save = ctx.save, fresh = !save.played;
        const big = () => { game.haptic("medium"); clock.stop(); ctx.moodReset(); if (fresh) game.go("play", { id: "mudfoot", diff: "easy" }, { fade: 0.2 }); else game.go("tour", {}, { fade: 0.2 }); };
        const wide = game.view.width > game.view.height;
        chunky(game, clock, s, fresh ? "PLAY" : "THE TOUR", { at: wide ? ["bottom-left", [game.view.width * 0.3 - 110, 72]] : ["bottom", [0, 76]], width: 220, height: 62, action: "confirm", onTap: big });
        const row = wide ? (i) => ["bottom-left", [Math.max(8, game.view.width * 0.3 - 162) + i * 110, 10]] : (i) => ["bottom", [(i - 1) * 112, 12]];
        chunky(game, clock, s, "SETUP", { at: row(0), width: 102, height: 50, size: 19, color: "#6a4ac8", quiet: true, onTap: () => go("settings", { back: "title" }) });
        chunky(game, clock, s, "SYNC", { at: row(1), width: 102, height: 50, size: 19, color: "#2fb8a8", quiet: true, onTap: () => go("calibrate", { back: "title" }) });
        chunky(game, clock, s, "PRACTICE", { at: row(2), width: 102, height: 50, size: 15, color: "#e0408a", quiet: true, onTap: () => go("practice", {}) });
        const go = (name, a) => game.go(name, a, { fade: 0.15 });
        mood("title");
    });

    // ------------------------------------------------------------------- Tour
    game.scene("tour", (s) => {
        game.touch.enabled = false;
        ctx.hide = null;
        clock.onStall = null;
        const save = ctx.save, fx = new FX(game);
        const ROW = 58, HEAD = 92, PAD = 10;
        // Flatten into rows.
        const rows = [];
        let y = 0;
        for (const st of STOPS) {
            rows.push({ kind: "stop", st, y, h: HEAD });
            y += HEAD;
            for (const id of st.songs) { rows.push({ kind: "song", id, st, y, h: ROW }); y += ROW; }
            y += PAD;
        }
        const total = y;
        const songs = rows.filter((r) => r.kind === "song");
        let sel = Math.max(0, songs.findIndex((r) => r.id === nextUp(save)));
        ensureStage(game, songs[sel].st.id);
        const topBar = () => game.view.safe.top + 62, viewH = () => game.view.height - topBar() - game.view.safe.bottom - 8;
        const maxScroll = () => Math.max(0, total - viewH());
        const panelW = () => Math.min(game.view.width - 16, 460);
        let scroll = Math.min(maxScroll(), Math.max(0, songs[sel].y - 120)), vel = 0, dragging = false, moved = 0, sheet = null, sheetKids = [], story = game.data.story ?? null, storyNext = game.data.storyNext ?? null;
        game.data.story = null; game.data.storyNext = null;
        if (!story && !save.story.bog) { story = STOPS[0].line; save.story.bog = true; writeSave(game, save); }
        const panelX = () => game.view.width / 2;
        let lastY = 0;

        function openSheet(row) {
            if (!isOpen(save, row.id)) { game.sfx(SND.stray); game.haptic("warn"); return; }
            sheet = { row };
            game.sfx(SND.page);
            const v = game.view, wide = v.width > v.height, id = row.id, w = wide ? 150 : Math.min(v.width - 60, 250), h = wide ? 64 : 62;
            const pick = (d) => () => { clock.stop(); ctx.moodReset(); game.go("play", { id, diff: d }, { fade: 0.2 }); };
            sheetKids = DIFFS.map((d, i) => chunky(game, clock, s, DIFF_NAME[d], {
                at: ["center", wide ? [(i - 1) * (w + 14), 26] : [0, -8 + (i - 1) * 74]], width: w, height: h, color: DIFF_COLOR[d], size: 24,
                action: d === (save.diff ?? "easy") ? "confirm" : undefined, onTap: pick(d),
                sub: () => { const r = best(save, id, d); return r ? `${r.grade}  ${r.score}` : `${CHARTS[id][d].heads} heads`; },
            }));
            sheetKids.push(chunky(game, clock, s, "BACK", { at: ["center", wide ? [0, 100] : [0, 128]], width: 130, height: 44, color: "#6a4ac8", quiet: true, onTap: closeSheet }));
        }
        function closeSheet() { for (const e of sheetKids) e.destroy(); sheetKids = []; sheet = null; game.sfx(SND.page); }

        s.add([{
            draw(d) {
                const v = game.view, b = clock.bop(), cur = rows.filter((r) => r.kind === "stop").find((r) => r.y + HEAD + ROW * 2 > scroll + 40) ?? rows[0];
                const back = isPainted(cur.st.id) ? cur.st.id : songs[sel].st.id;
                drawStage(d, `stage_${back}`, v, v.height * 0.5, { zoom: 1 + b.kick * 0.01 });
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#160c2e", opacity: 0.55 });
                const px = panelX(), w = panelW(), top = topBar();
                for (const r of rows) {
                    const yy = top + r.y - scroll;
                    if (yy > v.height + 60 || yy + r.h < top - 80) continue;
                    if (r.kind === "stop") stopHeader(d, r, px, yy, w, b);
                    else songRow(d, r, px, yy, w, b);
                }
            },
        }]);
        function stopHeader(d, r, x, y, w, b) {
            const st = r.st, open = isOpen(save, st.songs[0]), h = HEAD - 8, stageName = `stage_${st.id}`;
            d.rect(w + 6, h + 6, { x, y: y + h / 2, color: INK, radius: 16 });
            d.rect(w, h, { x, y: y + h / 2, color: STAGE[st.id].sky, radius: 13 });
            if (isPainted(st.id)) d.sprite(stageName, { x: x + w / 2 - 62, y: y + h / 2, width: 104, height: h - 6, color: open ? undefined : "#404050" });
            letters(d, st.name.toUpperCase(), x - w / 2 + 12, y + 24, { size: Math.min(21, (w - 134) / measure(st.name, 1)), align: "left", color: open ? "#ffe27a" : "#8a84a0" });
            d.text(`Stop ${STOPS.indexOf(st) + 1} of ${STOPS.length}`, { x: x - w / 2 + 50, y: y + 52, size: 12, bold: true, color: "#fff7d6" });
            if (!open) d.sprite("props", { frame: P.lock, x: x + w / 2 - 62, y: y + h / 2, width: 40, height: 40 });
        }
        function songRow(d, r, x, y, w, b) {
            const song = songById(r.id), open = isOpen(save, r.id), isSel = songs[sel] === r, h = ROW - 6, k = isSel ? 1 + b.pulse * 0.012 : 1;
            d.push(); d.translate(x, y + h / 2); d.scale(k, k);
            d.rect(w - 10, h + 4, { color: INK, radius: 13 });
            d.rect(w - 16, h - 2, { color: open ? (isSel ? "#4a3a8e" : "#34286e") : "#2a2438", radius: 11 });
            const rec = DIFFS.map((q) => best(save, r.id, q)).filter(Boolean), stars = Math.max(0, ...rec.map((q) => q.stars ?? 0));
            letters(d, song.title, -w / 2 + 18, -7, { size: Math.min(17, (w - 134) / measure(song.title, 1)), align: "left", color: open ? "#fff7d6" : "#8a84a0" });
            d.text(`${song.genre}, ${song.sig}, ${song.bpm} bpm`, { x: -w / 2 + 76, y: 13, size: 11, color: "#d8d0f0" });
            if (open) drawStars(d, stars, w / 2 - 50, 0, 20);
            else d.sprite("props", { frame: P.lock, x: w / 2 - 34, y: 0, width: 28, height: 28 });
            d.pop();
        }
        s.onDraw((d) => fx.draw(d));
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop(), top = v.safe.top;
            d.rect(v.width, top + 58, { x: v.width / 2, y: (top + 58) / 2, color: "#1b1033" });
            letters(d, "THE TOUR", 66, top + 20, { size: 24, align: "left", color: "#ffe27a", wave: 1.6, phase: b.phase });
            d.text(`${totalStars(save)} stars, ${bandSize(save)} goblins`, { x: 118, y: top + 44, size: 12, bold: true, color: "#fff7d6" });
            // The band so far, bopping along the top.
            const n = bandSize(save), each = Math.min(30, (v.width - 240) / n);
            for (let i = 0; i < n; i++) drawGoblin(d, GOBLINS[i], v.width - 62 - (n - 1 - i) * each - 8, top + 28 - (i + b.count) % 2 * b.kick * 4, 28, { body: false, squash: b.kick * 0.2, eye: EYE.happy, mouth: MOUTH.grin });
            if (sheet) {
                const song = songById(sheet.row.id), wide = v.width > v.height;
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#120a26", opacity: 0.82 });
                letters(d, song.title, v.width / 2, v.height / 2 + (wide ? -74 : -158), { size: Math.min(34, (v.width - 24) / measure(song.title, 1)), color: "#ffe27a", wave: 2, phase: b.phase });
                d.text(`${song.genre} in ${song.sig}, ${song.key} ${song.mode === "major" ? "major" : "minor"}, ${song.bpm} bpm`, { x: v.width / 2, y: v.height / 2 + (wide ? -46 : -128), size: 13, bold: true, color: "#fff7d6" });
            }
            if (story) {
                const g = goblin(story[0]), size = Math.min(110, v.height * 0.2), w = Math.min(v.width - 40, 340);
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#120a26", opacity: 0.7 });
                const gy = v.height - v.safe.bottom - size * 0.7;
                drawGoblin(d, g, v.width * 0.5, gy, size, { squash: b.kick * 0.16, tilt: b.sway * 0.05, eye: EYE.open, mouth: b.pulse > 0.4 ? MOUTH.oh : MOUTH.smile, look: [0, -0.8] });
                const by = gy - size * 1.28;
                bubble(d, story[1], v.width / 2, by, w, { size: 16, tail: [v.width / 2, v.width / 2] });
                letters(d, g.name, v.width / 2, by - 62, { size: 22, color: g.top });
                d.text("Tap to carry on", { x: v.width / 2, y: by - 86, size: 12, bold: true, color: "#fff7d6" });
            }
        });
        const select = (i) => { sel = (i + songs.length) % songs.length; const r = songs[sel]; scroll = Math.max(0, Math.min(maxScroll(), Math.min(scroll, r.y - 60))); if (r.y + ROW - scroll > viewH()) scroll = Math.min(maxScroll(), r.y + ROW - viewH()); game.sfx(SND.tickUp); };
        brain(s, fx, (dt) => {
            const i = s.input, p = i.pointer;
            // Paint one venue per step, so opening the map doesn't stall on a phone.
            const todo = STOPS.find((q) => !isPainted(q.id));
            if (todo) ensureStage(game, todo.id);
            if (story) { if (p.tapped || i.pressed("confirm") || i.pressed("jump")) { story = storyNext; storyNext = null; game.sfx(SND.page); game.haptic("tick"); } return; }
            if (sheet) { if (i.pressed("pause")) closeSheet(); return; }
            if (i.pressed("down")) select(sel + 1);
            if (i.pressed("up")) select(sel - 1);
            if (i.pressed("confirm")) openSheet(songs[sel]);
            if (i.pressed("pause")) { game.go("title", {}, { fade: 0.15 }); return; }
            scroll = Math.max(0, Math.min(maxScroll(), scroll + i.wheel * 0.5));
            // p.dy jumps when a new touch lands somewhere else, so drags are measured from the touch itself.
            if (p.pressed) { dragging = true; moved = 0; vel = 0; lastY = p.y; }
            if (dragging && p.down) { const dy = p.y - lastY; lastY = p.y; scroll = Math.max(0, Math.min(maxScroll(), scroll - dy)); moved += Math.abs(dy); vel = -dy / Math.max(dt, 0.001); }
            else if (!p.down) { dragging = false; scroll = Math.max(0, Math.min(maxScroll(), scroll + vel * dt)); vel *= Math.exp(-dt * 4); }
            if (p.tapped && moved < 10 && p.y > topBar()) {
                const yy = p.y - topBar() + scroll, r = rows.find((q) => yy >= q.y && yy < q.y + q.h);
                if (r?.kind === "song") { sel = songs.indexOf(r); openSheet(r); }
            }
        });
        chunky(game, clock, s, "", { at: ["top-left", [6, 6]], width: 50, height: 50, icon: P.back, color: "#6a4ac8", quiet: true, onTap: () => game.go("title", {}, { fade: 0.15 }) });
        chunky(game, clock, s, "", { at: ["top-right", [6, 6]], width: 50, height: 50, icon: P.gear, color: "#6a4ac8", quiet: true, onTap: () => game.go("settings", { back: "tour" }, { fade: 0.15 }) });
        ctx.tourApi = { rows, songs, openSheet, closeSheet };
        mood("map");
    });

    function nextUp(save) { return (SONGS.find((q) => !Object.values(save.songs[q.id] ?? {}).some((r) => r.passed)) ?? SONGS[SONGS.length - 1]).id; }

    // ------------------------------------------------------------------- Results
    game.scene("results", (s, args) => {
        game.touch.enabled = false;
        ctx.hide = null;
        clock.onStall = null;
        const save = ctx.save, id = args.id ?? "mudfoot", diff = args.diff ?? "easy", r = args.r ?? { score: 0, acc: 0, grade: "D", passed: false, stars: 0, maxCombo: 0, full: false, counts: { perfect: 0, great: 0, ok: 0, miss: 0 }, fevers: 0, early: 0, late: 0, bias: 0 }, rec = args.rec, practice = args.practice;
        const song = songById(id), stop = stopOf(id), stage = ensureStage(game, stop.id), fx = new FX(game);
        let t = 0, shown = 0, stamped = false, starsOut = 0, wasShown = -1;
        const happy = r.passed;
        if (rec?.stopCleared) {
            const st = rec.stopCleared;
            if (st.outro) game.data.story = st.outro;
            s.wait(1.9, () => { game.sfx(SND.join); game.haptic("success"); });
            const i = STOPS.indexOf(st), nx = STOPS[i + 1];
            if (nx && !save.story[nx.id]) { game.data.storyNext = nx.line; save.story[nx.id] = true; writeSave(game, save); }
        }
        const cast = GOBLINS.slice(0, Math.min(4, bandSize(save)));
        s.add([{
            draw(d) {
                const v = game.view, b = clock.bop();
                drawStage(d, stage, v, v.height * 0.42, { zoom: 1 + b.kick * 0.012 });
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#160c2e", opacity: 0.58 });
                const wide = v.width > v.height, size = wide ? v.height * 0.26 : Math.min((v.width - 20) / (cast.length + 0.5), 124), each = wide ? size * 1.05 : (v.width - 20) / cast.length;
                cast.forEach((g, i) => {
                    const x = wide ? v.width * 0.74 + (i - (cast.length - 1) / 2) * each : v.width / 2 + (i - (cast.length - 1) / 2) * each, y = v.height - v.safe.bottom - (wide ? size * 0.6 : 110 + size) - (happy ? ((i + b.count) % 2) * b.kick * 16 : 0);
                    drawGoblin(d, g, x, y, size, { squash: b.kick * (happy ? 0.3 : 0.05), tilt: b.sway * (happy ? 0.12 : 0.02), ear: happy ? b.snare * 0.3 : 0.5, eye: happy ? (r.grade[0] === "S" ? EYE.star : EYE.happy) : EYE.sad, mouth: happy ? MOUTH.yell : MOUTH.frown });
                });
            },
        }]);
        s.onDraw((d) => fx.draw(d));
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop(), wide = v.width > v.height, cx = wide ? v.width * 0.28 : v.width / 2, top = v.safe.top + 14;
            letters(d, song.title, cx, top + 16, { size: Math.min(26, ((wide ? v.width * 0.5 : v.width) - 24) / measure(song.title, 1)), color: "#ffe27a", wave: 1.5, phase: b.phase });
            d.text(`${diff}${practice ? " practice" : ""}`, { x: cx, y: top + 40, size: 13, bold: true, color: "#fff7d6" });
            // Grade stamp slams in.
            const gy = top + 110, q = Math.max(0, Math.min(1, (t - 1.05) / 0.14));
            if (q > 0) {
                const sz = 96 * (1 + (1 - q) * 2) * (1 + b.pulse * 0.05);
                letters(d, r.grade, cx - (wide ? 76 : 86), gy, { size: sz, color: gradeColor(r.grade), opacity: q, wobble: 0.04, shadow: "#00000080" });
            }
            const lx = cx - 20 + (wide ? 0 : 0);
            letters(d, String(Math.round(shown)).padStart(6, "0"), lx + 70, gy - 34, { size: 28, color: "#fff7d6", wave: b.pulse, phase: b.phase });
            d.text(`Accuracy ${(r.acc * 100 * Math.min(1, t / 1)).toFixed(1)}%`, { x: lx + 70, y: gy - 8, size: 14, bold: true, color: "#fff7d6" });
            d.text(`Best combo ${r.maxCombo}${r.full ? "  FULL COMBO" : ""}`, { x: lx + 70, y: gy + 12, size: 13, bold: true, color: r.full ? "#ffe27a" : "#fff7d6" });
            d.text(`${r.counts.perfect} perfect  ${r.counts.great} great`, { x: lx + 70, y: gy + 32, size: 12, color: "#d8d0f0" });
            d.text(`${r.counts.ok} ok  ${r.counts.miss} miss`, { x: lx + 70, y: gy + 48, size: 12, color: "#d8d0f0" });
            drawStars(d, starsOut, cx, gy + 76, 32);
            const hint = r.early + r.late >= 8 ? (r.early > r.late * 1.6 ? "You rush a little. Wait for the head." : r.late > r.early * 1.6 ? "You drag a little. Or try the Sync screen." : "") : "";
            const msg = !practice && !r.passed ? "Not enough for the crowd. One more go?" : rec?.isBest && !practice ? "New best!" : hint;
            if (msg && t > 1.4) d.text(msg, { x: cx, y: gy + 104, size: 14, bold: true, color: "#ffe27a", maxWidth: (wide ? v.width * 0.54 : v.width) - 24 });
            if (rec?.stopCleared && t > 1.8) {
                const st = rec.stopCleared, y = wide ? top + 12 : gy + 128;
                d.rect(wide ? v.width * 0.42 : v.width - 40, 36, { x: wide ? v.width * 0.74 : v.width / 2, y: y + 12, color: "#2fb86a", radius: 12 });
                d.text(st.unlock, { x: wide ? v.width * 0.74 : v.width / 2, y: y + 12, size: 15, bold: true, color: "#fff7d6" });
            }
        });
        brain(s, fx, (dt) => {
            t += dt;
            const b = clock.bop();
            shown = Math.min(r.score, r.score * Math.min(1, t / 1));
            if (Math.floor(shown / Math.max(1, r.score) * 22) !== wasShown && t < 1) { wasShown = Math.floor(shown / Math.max(1, r.score) * 22); game.sfx(SND.tickUp); }
            if (!stamped && t > 1.19) {
                stamped = true;
                game.sfx(SND.stamp); game.haptic(r.passed ? "heavy" : "error");
                s.shake(5, 0.2);
                if (happy) { game.sfx("win"); }
            }
            const want = Math.floor((t - 1.35) / 0.28) + 1;
            if (t > 1.35 && starsOut < r.stars && want > starsOut) { starsOut++; game.sfx({ ...SND.star, freq: 900 + 180 * starsOut, to: 1400 + 200 * starsOut }); game.haptic("light"); const v = game.view; fx.spray(P.star, v.width > v.height ? v.width * 0.28 : v.width / 2, v.safe.top + 200, 8, { speed: [100, 300], grav: 500, size: 16, life: 0.7 }); }
            if (happy && b.pulse > 0.95 && t > 1.2) fx.spray(P.confetti, game.fxRng.next() * game.view.width, -8, 3, { speed: [40, 140], angle: 1.57, cone: 0.8, grav: 220, size: 8, life: 2, color: CONFETTI });
        });
        const v = game.view, wide = v.width > v.height;
        const place = (i) => (wide ? ["bottom-left", [v.width * 0.28 - 170 + i * 118, 12]] : ["bottom", [(i - 1) * 116, 12]]);
        const out = (name, a) => { clock.stop(); ctx.moodReset(); game.go(name, a, { fade: 0.2 }); };
        const nextSong = SONGS[songIndex(id) + 1], canNext = r.passed && nextSong && !practice;
        const toTour = () => { if (rec?.won) out("ending"); else out("tour"); };
        chunky(game, clock, s, "AGAIN", { at: place(0), width: 104, height: 54, color: "#ffc93c", size: 20, action: r.passed ? undefined : "confirm", onTap: () => out("play", { id, diff, practice }) });
        chunky(game, clock, s, practice ? "PRACTICE" : "TOUR", { at: place(1), width: 104, height: 54, color: "#6a4ac8", size: practice ? 15 : 20, action: canNext ? undefined : r.passed ? "confirm" : undefined, onTap: () => (practice ? out("practice") : toTour()) });
        if (canNext && !rec?.stopCleared && !rec?.won) chunky(game, clock, s, "NEXT", { at: place(2), width: 104, height: 54, color: "#8fd13f", size: 20, action: "confirm", onTap: () => out("play", { id: nextSong.id, diff }) });
        else if (canNext) chunky(game, clock, s, "ONWARD", { at: place(2), width: 104, height: 54, color: "#8fd13f", size: 18, action: "confirm", onTap: toTour });
        ctx.moodReset();
        mood(happy ? "win" : "sad");
    });

    // ------------------------------------------------------------------- Practice
    game.scene("practice", (s) => {
        game.touch.enabled = false;
        ctx.hide = null;
        clock.onStall = null;
        const save = ctx.save;
        const open = SONGS.filter((q) => isOpen(save, q.id));
        let si = Math.max(0, open.findIndex((q) => q.id === save.last)), di = Math.max(0, DIFFS.indexOf(save.diff)), part = 0, speed = 2;
        const SPEEDS = [0.5, 0.75, 1];
        const parts = () => {
            const q = open[si], form = q.form.trim().split(/\s+/), out = [{ name: "Whole song", from: 0, to: form.length }];
            form.forEach((f, i) => { if (f[0] !== "I" && f[0] !== "O" && i === form.findIndex((x) => x[0] === f[0])) out.push({ name: `Part ${f[0]}`, from: i, to: i + 1 }); });
            return out;
        };
        const bg = ensureStage(game, stopOf(open[si].id).id);
        s.add([{ draw(d) { const v = game.view, b = clock.bop(); drawStage(d, bg, v, v.height * 0.5, { zoom: 1 + b.kick * 0.01 }); d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#160c2e", opacity: 0.68 }); } }]);
        const wide = game.view.width > game.view.height, gap = wide ? 66 : 72, cols = wide ? game.view.width / 4 - 2 : 0;
        const rowAt = (i) => (wide ? [(i % 2 ? 1 : -1) * cols, -24 + Math.floor(i / 2) * gap] : [0, -gap * 1.5 + i * gap]);
        const pickers = [
            { label: () => open[si].title, prev: () => { si = (si + open.length - 1) % open.length; part = 0; }, next: () => { si = (si + 1) % open.length; part = 0; }, tag: "SONG" },
            { label: () => DIFF_NAME[DIFFS[di]], prev: () => { di = (di + 2) % 3; }, next: () => { di = (di + 1) % 3; }, tag: "CHART" },
            { label: () => parts()[Math.min(part, parts().length - 1)].name, prev: () => { const n = parts().length; part = (part + n - 1) % n; }, next: () => { part = (part + 1) % parts().length; }, tag: "LOOP" },
            { label: () => `${Math.round(SPEEDS[speed] * 100)}% SPEED`, prev: () => { speed = (speed + 2) % 3; }, next: () => { speed = (speed + 1) % 3; }, tag: "TEMPO" },
        ];
        const W = wide ? Math.min(300, game.view.width / 2 - 16) : Math.min(game.view.width - 24, 340);
        pickers.forEach((p, i) => {
            const [ox, oy] = rowAt(i);
            chunky(game, clock, s, "", { at: ["center", [ox - W / 2 + 26, oy]], width: 50, height: 50, icon: P.back, color: "#6a4ac8", quiet: true, onTap: () => { p.prev(); game.sfx(SND.tickUp); } });
            chunky(game, clock, s, "", { at: ["center", [ox + W / 2 - 26, oy]], width: 50, height: 50, icon: P.back, flip: true, color: "#6a4ac8", quiet: true, onTap: () => { p.next(); game.sfx(SND.tickUp); } });
        });
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop(), cy = v.height / 2;
            letters(d, "PRACTICE", v.width / 2, v.safe.top + 38, { size: 36, color: "#7dffb0", wave: 2, phase: b.phase });
            d.text("Six loops, no score, nobody's watching.", { x: v.width / 2, y: v.safe.top + 68, size: 13, bold: true, color: "#fff7d6" });
            pickers.forEach((p, i) => {
                const [ox, oy] = rowAt(i), lab = p.label();
                d.text(p.tag, { x: v.width / 2 + ox, y: cy + oy - 15, size: 11, bold: true, color: "#c8c0e8" });
                letters(d, lab, v.width / 2 + ox, cy + oy + 4, { size: Math.min(20, (W - 120) / measure(lab, 1)), color: "#fff7d6" });
            });
        });
        brain(s, null, () => { if (s.input.pressed("pause")) game.go("title", {}, { fade: 0.15 }); });
        chunky(game, clock, s, "", { at: ["top-left", [6, 6]], width: 50, height: 50, icon: P.back, color: "#6a4ac8", quiet: true, onTap: () => game.go("title", {}, { fade: 0.15 }) });
        chunky(game, clock, s, "GO", { at: ["bottom", [0, 18]], width: 200, height: 58, action: "confirm", onTap: () => {
            const q = open[si], pt = parts()[Math.min(part, parts().length - 1)];
            clock.stop(); ctx.moodReset();
            game.go("play", { id: q.id, diff: DIFFS[di], practice: { from: pt.from, to: pt.to, speed: SPEEDS[speed] } }, { fade: 0.2 });
        } });
        mood("map");
    });

    // ------------------------------------------------------------------- Settings
    game.scene("settings", (s, args) => {
        game.touch.enabled = false;
        ctx.hide = null;
        const save = ctx.save, back = args.back ?? "title";
        const bg = ensureStage(game, "tavern");
        s.add([{ draw(d) { const v = game.view, b = clock.bop(); drawStage(d, bg, v, v.height * 0.5, { zoom: 1 + b.kick * 0.01 }); d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#160c2e", opacity: 0.66 }); } }]);
        const wide = game.view.width > game.view.height, gap = wide ? 64 : 72, bh = wide ? 42 : 54, y0 = wide ? -60 : -90;
        const update = () => { applySettings(game, save); writeSave(game, save); };
        const kits = () => kitsOpen(save);
        chunky(game, clock, s, "SOUND", { at: ["center", [0, y0]], width: 240, height: bh, icon: undefined, colorFn: () => (save.sound ? "#2fb86a" : "#6a6480"), onTap: () => { save.sound = !save.sound; update(); if (save.sound) game.sfx(SND.blip); } });
        chunky(game, clock, s, "HAPTICS", { at: ["center", [0, y0 + gap]], width: 240, height: bh, colorFn: () => (save.haptics ? "#2fb86a" : "#6a6480"), onTap: () => { save.haptics = !save.haptics; update(); if (save.haptics) game.haptic(34); } });
        chunky(game, clock, s, "DRUM KIT", { at: ["center", [0, y0 + gap * 2]], width: 240, height: bh, color: "#e0408a", onTap: () => { const k = kits(), i = k.indexOf(save.kit); save.kit = k[(i + 1) % k.length]; update(); const K = KITS.find((q) => q.id === save.kit); game.sfx(K.voices[0]); ctx.after = K; } });
        chunky(game, clock, s, "SYNC", { at: ["center", [0, y0 + gap * 3]], width: 240, height: bh, color: "#2fb8a8", onTap: () => game.go("calibrate", { back }, { fade: 0.15 }) });
        chunky(game, clock, s, "", { at: ["top-left", [6, 6]], width: 50, height: 50, icon: P.back, color: "#6a4ac8", action: "pause", quiet: true, onTap: () => game.go(back, {}, { fade: 0.15 }) });
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop(), K = KITS.find((q) => q.id === save.kit) ?? KITS[0], cy = v.height / 2;
            letters(d, "SETTINGS", v.width / 2, v.safe.top + 34, { size: 34, color: "#ffe27a", wave: 2, phase: b.phase });
            d.text(save.sound ? "on" : "off", { x: v.width / 2 + 138, y: cy + y0, size: 14, bold: true, color: "#fff7d6" });
            d.text(save.haptics ? "on" : "off", { x: v.width / 2 + 138, y: cy + y0 + gap, size: 14, bold: true, color: "#fff7d6" });
            d.text(`${K.name} (${kitsOpen(save).length} of ${KITS.length})`, { x: v.width / 2, y: cy + y0 + gap * 2 + bh / 2 + 11, size: 12, bold: true, color: "#fff7d6" });
            d.text(`Offset ${Math.round(save.offset * 1000)} ms`, { x: v.width / 2, y: cy + y0 + gap * 3 + bh / 2 + 11, size: 12, bold: true, color: "#fff7d6" });
        });
        brain(s);
        if (!clock.arr) mood("title");
    });

    // ------------------------------------------------------------------- Ending
    game.scene("ending", (s) => {
        game.touch.enabled = false;
        ctx.hide = null;
        const fx = new FX(game), stage = ensureStage(game, "fest");
        s.add([{
            draw(d) {
                const v = game.view, b = clock.bop();
                drawStage(d, stage, v, v.height * 0.6, { zoom: 1.04 + b.kick * 0.02 });
                const each = (v.width - 20) / 4, size = Math.min(each * 0.9, v.height * 0.2);
                GOBLINS.forEach((g, i) => {
                    const row = i < 4 ? 1 : 0, x = v.width / 2 + ((i % 4) - 1.5) * each, y = v.height * (row ? 0.82 : 0.62) - ((i + b.count) % 2) * b.kick * 18;
                    drawGoblin(d, g, x, y, size * (row ? 1 : 0.8), { squash: b.kick * 0.3, tilt: b.sway * 0.14, ear: b.snare * 0.4, eye: i % 3 === 0 ? EYE.star : i % 3 === 1 ? EYE.shades : EYE.happy, mouth: MOUTH.yell });
                });
            },
        }]);
        s.onDraw((d) => fx.draw(d));
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop();
            letters(d, "CHAMPIONS", v.width / 2, v.safe.top + 56, { size: Math.min(58, (v.width - 20) / measure("CHAMPIONS", 1)), color: "#ffe27a", wave: 4, phase: b.phase, shadow: "#b0245e" });
            letters(d, "OF THE GRAND GOBLIN FESTIVAL", v.width / 2, v.safe.top + 108, { size: Math.min(20, (v.width - 20) / measure("OF THE GRAND GOBLIN FESTIVAL", 1)), color: "#fff7d6", wave: 1.5, phase: b.phase });
            d.rect(Math.min(v.width - 12, 400), 42, { x: v.width / 2, y: v.safe.top + 140, color: "#1b1033", opacity: 0.8, radius: 12 });
            d.text(`${totalStars(ctx.save)} of ${SONGS.length * 9} stars. The Golden Mallet is yours. Hard charts await.`, { x: v.width / 2, y: v.safe.top + 138, size: 13, bold: true, color: "#fff7d6", maxWidth: v.width - 30 });
        });
        brain(s, fx, () => {
            const b = clock.bop();
            if (b.pulse > 0.92) fx.spray(P.confetti, game.fxRng.next() * game.view.width, -8, 4, { speed: [60, 180], angle: 1.57, cone: 0.9, grav: 200, size: 9, life: 2.4, color: CONFETTI });
            if (b.down > 0.93) { const x = game.fxRng.next() * game.view.width, y = game.view.height * (0.15 + game.fxRng.next() * 0.3); fx.spray(P.spark, x, y, 16, { speed: [80, 300], size: 22, life: 0.8, grav: 80, color: CONFETTI, add: true }); }
        });
        chunky(game, clock, s, "BACK ON THE ROAD", { at: ["bottom", [0, 16]], width: 280, height: 54, action: "confirm", size: 20, onTap: () => { clock.stop(); ctx.moodReset(); game.go("tour", {}, { fade: 0.25 }); } });
        ctx.moodReset();
        mood("win");
        game.sfx("win");
    });
}
