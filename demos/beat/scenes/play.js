// The stage: a road to the horizon, goblin heads at the bottom, mallets marching in. Time comes only from the clock.
import { pin, tap, ui } from "../pogo.js";
import { songById } from "../music/songs.js";
import { arrange } from "../music/arrange.js";
import { compile } from "../charts.js";
import { Judge, summary, windowsFor } from "../engine.js";
import { GOBLINS, drawGoblin, EYE, MOUTH } from "../art/goblins.js";
import { ensureStage, STAGE } from "../art/stages.js";
import { LANE, P } from "../art/props.js";
import { letters, measure } from "../art/font.js";
import { FX, CONFETTI } from "../fx.js";
import { chunky, drawStage } from "../ui.js";
import { bandSize, record, songIndex, stopOf, writeSave } from "../story.js";
import { FEEL, feverTone, KITS, SND } from "../sfx.js";

const INK = "#1b1423";
const APPROACH = { easy: 1.8, normal: 1.5, hard: 1.3 };
const GRADE_TEXT = { perfect: "PERFECT!", great: "GREAT!", ok: "OK", miss: "MISS" };
const GRADE_COLOR = { perfect: "#ffe27a", great: "#7dffb0", ok: "#6ae8ff", miss: "#ff8a8a" };
const LABEL = { hold: "HOLD!", roll: "MASH!", swipe: "FLICK!" };
const KEYS = { 2: ["F", "J"], 3: ["F", "J", "K"], 4: ["D", "F", "J", "K"] };

/** A press on key k goes to which head. Keys D F J K spread across however many heads there are. */
const keyLane = (k, heads) => (heads === 4 ? k : heads === 3 ? [0, 0, 1, 2][k] : k < 2 ? 0 : 1);
const P_PERSP = 2.6, S1 = 1 / (1 + P_PERSP);
const depth = (z) => { const s = 1 / (1 + P_PERSP * Math.max(z, -0.14)); return (s - S1) / (1 - S1); };

export function playScene(ctx) {
    const { game, clock } = ctx;
    game.scene("play", (s, args) => {
        const save = ctx.save, id = args.id ?? "mudfoot", diff = args.diff ?? "easy", practice = args.practice ?? null;
        const song = songById(id), idx = songIndex(id), stop = stopOf(id), stageId = stop.id, stage = STAGE[stageId], stageName = ensureStage(game, stageId);
        game.touch.enabled = false;
        game.haptics.auto = false;
        const oOpt = practice ? { from: practice.from, to: practice.to, speed: practice.speed, loop: true } : {};
        const chart = compile(song, diff, oOpt), arr = chart.arr, heads = chart.heads;
        const loopLen = arr.n * arr.stepDur, LOOPS = practice ? 6 : 1;
        let notes = chart.notes;
        if (practice) {
            notes = [];
            for (let k = 0; k < LOOPS; k++) for (const n of chart.notes) notes.push({ ...n, id: notes.length, time: n.time + k * loopLen });
        }
        const pulses = [];
        for (let k = 0; k < LOOPS; k++) for (const p of arr.pulses) pulses.push({ time: (p.step * arr.stepDur) + k * loopLen, down: p.down });
        const approach = APPROACH[diff] / (practice ? Math.max(0.7, practice.speed) : 1);
        const bandCount = bandSize(save), kit = KITS.find((k) => k.id === save.kit) ?? KITS[0];
        const fx = new FX(game), lastTime = notes.length ? Math.max(...notes.map((n) => n.time + n.dur)) : 0;
        const firstTime = notes[0]?.time ?? 0;
        if (!notes.length) throw new Error(`${id} ${diff} has no notes in this section`);
        const countdown = arr.pulses.map((p) => p.step * arr.stepDur).filter((t) => t < firstTime - 0.01).slice(-4);
        const endAt = practice ? LOOPS * loopLen - 0.3 : Math.min(arr.end + arr.tail * 0.55, Math.max(arr.end, lastTime + 0.9));
        let done = false, pausedUI = null, resumeCount = 0, feverK = 0, wasFever = false, duck = 0, flash = 0, hitsSeen = 0, banner = null, milestone = 0, nextFever = 0;
        const teachKinds = new Set(notes.map((n) => n.kind).filter((k) => k !== "tap" && !save.taught[k]));
        const firstRun = !save.taught.tap && !practice;
        const baseVolume = game.audio.volume;

        const gobs = GOBLINS.slice(0, heads).map((spec, i) => ({
            spec, lane: i, x: 0, v: 0, tilt: 0, tv: 0, ear: 0, ev: 0, hat: 0, hv: 0, eye: EYE.open, eyeT: 0, mouth: MOUTH.smile, mouthT: 0, blink: 1 + i * 0.7, held: 0, press: 0, look: [0, -0.6],
        }));
        const flashL = new Array(heads).fill(0);
        const popups = [];
        let fever2 = false, fever3 = false;

        // --- Layout ---------------------------------------------------------------------------
        const L = { heads };
        function layout() {
            const v = game.view, w = v.width, h = v.height, portrait = h > w;
            const laneW = Math.min((w - 8 - v.safe.left - v.safe.right) / heads, portrait ? 180 : 138);
            L.w = w; L.h = h; L.laneW = laneW; L.cx = w / 2;
            L.size = Math.min(laneW * 0.9, portrait ? h * 0.2 : h * 0.27);
            L.headY = h - v.safe.bottom - L.size * (portrait ? 0.74 : 0.3);
            L.hitY = L.headY - L.size * (portrait ? 0.84 : 0.7);
            L.hor = portrait ? Math.max(h * 0.25, v.safe.top + 100) : h * 0.23;
            L.laneX = gobs.map((_, i) => L.cx + (i - (heads - 1) / 2) * laneW);
            L.topZone = v.safe.top + 58;
        }
        layout();
        s.on("resize", layout);
        const xAt = (lane, k) => L.cx + (L.laneX[lane] - L.cx) * (0.22 + 0.78 * k);
        const yAt = (k) => L.hor + (L.hitY - L.hor) * k;

        // --- Judge ----------------------------------------------------------------------------
        const judge = new Judge(notes, {
            windows: windowsFor(diff, idx, !!practice),
            feverLength: Math.max(7, arr.bar * arr.stepDur * 4),
            on: (e) => events[e.type]?.(e),
        });
        ctx.run = { judge, L, arr, notes, song, diff, heads, clock, gobs, flashL };

        function hitSound(lane, when, t) {
            const tone = kit.voices[lane % 4];
            // Early hits wait for the beat, so a slightly early player still sounds tight. Late hits can only play now.
            if (!clock.silent && when - t > 0.004 && !game.headless) game.audio.playAt(tone, when);
            else game.sfx(tone);
        }
        function react(g, kind) {
            switch (kind) {
                case "bonk": g.v += 9; g.eye = EYE.cross; g.eyeT = 0.11; g.mouth = MOUTH.wince; g.mouthT = 0.11; g.ev -= 7; g.hv += 5; g.tv += (game.fxRng.next() - 0.5) * 4; break;
                case "perfect": g.v += 11; g.eye = EYE.star; g.eyeT = 0.16; g.mouth = MOUTH.yell; g.mouthT = 0.16; g.ev -= 10; g.hv += 9; g.tv += (game.fxRng.next() - 0.5) * 6; break;
                case "soft": g.v += 5; g.eye = EYE.blink; g.eyeT = 0.09; g.mouth = MOUTH.oh; g.mouthT = 0.09; g.ev -= 3; break;
                case "miss": g.v -= 3; g.eye = EYE.sad; g.eyeT = 0.5; g.mouth = MOUTH.tongue; g.mouthT = 0.5; g.tv += 2; break;
                case "wince": g.eye = EYE.sad; g.eyeT = 0.28; g.mouth = MOUTH.frown; g.mouthT = 0.28; break;
                case "cheer": g.v -= 7; g.hv += 6; g.eye = EYE.happy; g.eyeT = 0.4; g.mouth = MOUTH.grin; g.mouthT = 0.4; break;
            }
        }
        const pop = (text, lane, color, size = 20) => { popups.push({ text, x: L.laneX[lane], y: L.hitY - L.laneW * 0.44, t: 0, color, size, lane }); if (popups.length > 8) popups.shift(); };
        const onHead = (lane) => [L.laneX[lane], L.hitY + L.size * 0.2];

        const events = {
            hit(e) {
                const n = e.note, lane = n.lane, g = gobs[lane], [x, y] = onHead(lane), t = clock.now();
                if (n.kind !== "roll" && n.kind !== "swipe") hitSound(lane, n.time, t);
                game.haptic(n.kick ? (e.grade === "perfect" ? FEEL.perfectKick : FEEL.hitKick) : FEEL.hit);
                react(g, e.grade === "perfect" ? "perfect" : e.grade === "great" ? "bonk" : "soft");
                flashL[lane] = 1;
                hitsSeen++;
                pop(GRADE_TEXT[e.grade], lane, GRADE_COLOR[e.grade], e.grade === "perfect" ? 22 : 18);
                fx.add(P.burst, x, y, { life: 0.17, size: L.size * 0.6, grow: L.size * 0.9, color: e.grade === "perfect" ? "#fff7d6" : LANE[lane], add: true });
                fx.add(P.ring, x, y, { life: 0.22, size: L.size * 0.5, grow: L.size * 0.9, color: LANE[lane], add: true });
                if (e.grade !== "ok") fx.spray(P.star, x, y, e.grade === "perfect" ? 6 : 3, { speed: [120, 300], cone: 2.4, grav: 700, size: 15, life: 0.5, color: e.grade === "perfect" ? undefined : LANE[lane] });
                if (e.grade === "perfect" && game.fxRng.next() < 0.3) fx.spray(P.tooth, x, y, 1, { speed: [160, 260], cone: 1.6, grav: 900, size: 11, life: 0.6 });
                if (n.kick) { s.shake(1.6, 0.07); }
                if (e.combo && e.combo % 25 === 0) {
                    milestone = 1;
                    game.sfx(SND.milestone);
                    for (const q of gobs) react(q, "cheer");
                    banner = { text: `${e.combo} COMBO!`, t: 0, color: "#ffe27a" };
                    fx.spray(P.note, L.cx, L.hor + 40, 10, { speed: [80, 260], grav: 300, size: 20, life: 1, color: CONFETTI });
                }
            },
            miss(e) {
                const n = e.note, lane = n.lane;
                react(gobs[lane], "miss");
                for (const q of gobs) if (q !== gobs[lane]) { react(q, "wince"); q.look = [Math.sign(lane - q.lane), 0]; }
                // A miss sounds dull: the whole band drops back for a moment.
                duck = 1;
                game.audio.volume = baseVolume * 0.7;
                game.sfx(SND.miss);
                game.haptic(FEEL.miss);
                pop("MISS", lane, GRADE_COLOR.miss, 18);
                fx.spray(P.drop, L.laneX[lane], L.hitY, 3, { speed: [60, 160], cone: 2, grav: 500, size: 12, life: 0.5 });
                s.shake(1, 0.1);
            },
            stray(e) { gobs[e.lane].v += 2.5; game.sfx(SND.stray); game.haptic(FEEL.stray); },
            cock(e) { gobs[e.note.lane].v += 3; },
            swiped(e) {
                const lane = e.note.lane, [x, y] = onHead(lane);
                game.sfx(SND.swipe);
                game.haptic(FEEL.swipe);
                gobs[lane].tv += 14;
                fx.spray(P.spark, x, y, 8, { speed: [160, 420], cone: 1.2, angle: -1.2, size: 26, life: 0.3, color: "#7dffb0", add: true });
            },
            lazySwipe(e) { pop("FLICK IT!", e.note.lane, "#7dffb0", 15); },
            holdStart(e) { gobs[e.note.lane].held = 1; game.haptic(FEEL.holdStart); },
            holdTick(e) { game.sfx(SND.holdTick); game.haptic(FEEL.holdTick); const [x, y] = onHead(e.note.lane); fx.spray(P.spark, x, y, 1, { speed: [40, 120], size: 18, life: 0.28, color: LANE[e.note.lane], add: true }); },
            holdEnd(e) {
                const g = gobs[e.note.lane], [x, y] = onHead(e.note.lane);
                g.held = 0;
                game.sfx(SND.holdEnd);
                game.haptic(FEEL.holdEnd);
                react(g, "cheer");
                pop(`+${e.bonus}`, e.note.lane, "#ffe27a", 18);
                fx.spray(P.star, x, y, 5, { speed: [120, 280], grav: 600, size: 15, life: 0.5 });
            },
            dropHold(e) { const g = gobs[e.note.lane]; g.held = 0; game.sfx(SND.drop); game.haptic(FEEL.miss); react(g, "miss"); pop("DROPPED", e.note.lane, GRADE_COLOR.miss, 15); },
            roll(e) {
                const lane = e.note.lane, g = gobs[lane], [x, y] = onHead(lane);
                g.v += 5; g.eye = EYE.cross; g.eyeT = 0.08; g.mouth = MOUTH.yell; g.mouthT = 0.08;
                hitSound(lane, 0, 0);
                game.sfx(SND.roll);
                game.haptic(FEEL.roll);
                fx.spray(P.star, x, y, 1, { speed: [100, 240], cone: 2.6, grav: 500, size: 12, life: 0.35 });
                flashL[lane] = 1;
            },
            fever() {
                game.sfx(SND.fever);
                game.haptic(FEEL.fever);
                s.flash("#ffffff", 0.2);
                s.shake(5, 0.3);
                s.freeze(0.05);
                banner = { text: "GOBLIN FEVER!", t: 0, color: "#ff7ae0", big: true };
                for (const q of gobs) react(q, "cheer");
                fx.spray(P.confetti, L.cx, L.hor, 40, { speed: [120, 420], grav: 300, size: 9, life: 1.4, color: CONFETTI });
                nextFever = 0;
            },
        };

        // --- Pause ----------------------------------------------------------------------------
        function pauseGame() {
            if (pausedUI || done) return;
            clock.pause();
            ctx.setVolume?.(baseVolume);
            const v = game.view, gap = Math.min(70, (v.height - 120) / 3);
            const close = () => { for (const e of pausedUI.items) e.destroy(); };
            pausedUI = { items: [] };
            pausedUI.items.push(
                chunky(game, clock, s, "PLAY ON", { at: ["center", [0, -gap]], width: 220, height: 56, action: "confirm", onTap: () => { close(); pausedUI = null; resumeCount = 1.5; } }),
                chunky(game, clock, s, "START OVER", { at: ["center", [0, 0]], width: 220, height: 56, color: "#ffc93c", onTap: () => { close(); leave("play", args); } }),
                chunky(game, clock, s, "QUIT", { at: ["center", [0, gap]], width: 220, height: 56, color: "#ff5a4f", onTap: () => { close(); leave(practice ? "practice" : "tour"); } }),
            );
        }
        function leave(scene, a) {
            done = true;
            game.haptics.auto = true;
            game.audio.volume = baseVolume;
            clock.paused = false;
            clock.stop();
            game.audio.resume();
            game.go(scene, a, { fade: 0.15 });
        }
        clock.onStall = () => { if (clock.time < arr.end) pauseGame(); };
        ctx.hide = pauseGame;

        chunky(game, clock, s, "", { at: ["top-right", [6, 6]], width: 50, height: 50, icon: P.pause, color: "#3a2a5e", quiet: true, onTap: pauseGame });

        // --- Input ----------------------------------------------------------------------------
        const fingers = new Map(), keyHeld = [0, 0, 0, 0], laneHold = new Array(heads).fill(0);
        const laneOf = (x) => {
            let best = 0, bd = 1e9;
            for (let i = 0; i < heads; i++) { const d = Math.abs(x - L.laneX[i]); if (d < bd) { bd = d; best = i; } }
            return best;
        };
        function down(lane, t) { laneHold[lane]++; gobs[lane].press = 1; flashL[lane] = Math.max(flashL[lane], 0.5); judge.press(lane, t); }
        function up(lane, t) { laneHold[lane] = Math.max(0, laneHold[lane] - 1); if (laneHold[lane] === 0) judge.release(lane, t); }
        function readInput() {
            const i = s.input, t = clock.time;
            const seen = new Set();
            let fresh = false;
            for (const p of i.touches) {
                seen.add(p.id);
                let f = fingers.get(p.id);
                if (!f) {
                    fresh = true;
                    if (p.y < L.topZone) { fingers.set(p.id, { lane: -1 }); continue; }
                    f = { lane: laneOf(p.x), x0: p.x, y0: p.y, t0: clock.takeStamp(t), flicked: false, at: t };
                    fingers.set(p.id, f);
                    down(f.lane, f.t0);
                } else if (f.lane >= 0 && !f.flicked && Math.hypot(p.x - f.x0, p.y - f.y0) > 20) {
                    f.flicked = true;
                    if (t - f.at < 0.3) judge.swipe(f.lane, f.t0);
                }
            }
            for (const [id, f] of fingers) if (!seen.has(id)) { fingers.delete(id); if (f.lane >= 0) up(f.lane, t); }
            // A touch shorter than a step never shows in touches; the pointer still reports it.
            const pt = i.pointer;
            if (pt.pressed && !fresh && pt.y >= L.topZone) { const lane = laneOf(pt.x), when = clock.takeStamp(t); down(lane, when); up(lane, when); }
            for (let k = 0; k < 4; k++) {
                const a = `k${k}`, lane = keyLane(k, heads);
                if (i.pressed(a)) { keyHeld[k] = 1; down(lane, clock.takeStamp(t)); }
                if (i.released(a) && keyHeld[k]) { keyHeld[k] = 0; up(lane, t); }
            }
            if (i.pressed("flick")) judge.swipe(0, clock.takeStamp(t));
            if (i.pressed("pause")) pauseGame();
        }

        // --- Brain: a ui entity, so it runs through hit-stop ----------------------------------
        s.add([ui(), {
            update(dt) {
                clock.step();
                if (done) return;
                fx.update(dt);
                animate(dt);
                if (pausedUI) return;
                if (resumeCount > 0) { resumeCount -= dt; if (resumeCount <= 0) clock.resume(); return; }
                const t = clock.time;
                readInput();
                if (ctx.auto) autoplay(t);
                judge.tick(t);
                game.data.run = { t: +t.toFixed(3), score: judge.score, combo: judge.combo, acc: +judge.accuracy.toFixed(3), fever: judge.fever, silent: clock.silent, judged: judge.judged, total: judge.total };
                if (!clock.silent && !game.headless) feverLayer(t);
                else if (judge.fever && game.headless) nextFever = 0;
                if (judge.fever !== wasFever) { if (wasFever) { game.sfx(SND.feverEnd); } wasFever = judge.fever; }
                if (firstRun && hitsSeen >= 4 && !save.taught.tap) { save.taught.tap = true; writeSave(game, save); }
                const lastDuck = duck;
                duck = Math.max(0, duck - dt * 2.4);
                if (duck !== lastDuck) game.audio.volume = baseVolume * (1 - duck * 0.3);
                if (t >= endAt) finish();
            },
        }]);

        /** Debug autoplay for screenshots and timing checks: set __beat.auto = true. */
        function autoplay(t) {
            for (let i = judge.first; i < judge.notes.length; i++) {
                const n = judge.notes[i];
                if (n.time > t) break;
                if (n.state !== "wait" && n.state !== "rolling") continue;
                if (n.kind === "swipe") judge.swipe(n.lane, n.time);
                else if (n.kind === "roll") { if (n.nextRoll === undefined || t >= n.nextRoll) { n.nextRoll = t + 0.09; judge.press(n.lane, t); } }
                else { gobs[n.lane].press = 1; judge.press(n.lane, n.time); if (n.kind === "tap") judge.release(n.lane, n.time); }
            }
        }

        /** During fever the band gets bigger: extra brass and claps, scheduled ahead on the exact beat with playAt. */
        function feverLayer(t) {
            if (!judge.fever) return;
            const first = Math.ceil(t / arr.stepDur);
            nextFever = Math.max(nextFever, first);
            while (nextFever * arr.stepDur < t + 0.22) {
                const abs = nextFever++, step = abs % arr.n, at = abs * arr.stepDur;
                const m = arr.rawLead[step];
                if (m) game.audio.playAt(feverTone(440 * 2 ** ((m + 12 - 69) / 12), "brass"), at);
                if (arr.seq.snare[step] || arr.lastPulse[step] === step) game.audio.playAt(feverTone(0, "clap"), at);
            }
        }

        function animate(dt) {
            const b = clock.bop();
            feverK += ((judge.fever ? 1 : 0) - feverK) * Math.min(1, dt * 7);
            flash = Math.max(0, flash - dt * 4);
            milestone = Math.max(0, milestone - dt * 2);
            if (banner) { banner.t += dt; if (banner.t > 1.3) banner = null; }
            for (let i = popups.length - 1; i >= 0; i--) { popups[i].t += dt; if (popups[i].t > 0.55) popups.splice(i, 1); }
            for (let i = 0; i < heads; i++) flashL[i] = Math.max(0, flashL[i] - dt * 7);
            const t = clock.time;
            // Each goblin keeps an eye on its next note.
            const next = new Array(heads).fill(null);
            for (let i = judge.first; i < judge.notes.length; i++) { const n = judge.notes[i]; if (n.time - t > 1.1) break; if (n.state === "wait" && !next[n.lane]) next[n.lane] = n; }
            for (const g of gobs) {
                // Springs, for squash, tilt, ears and hats.
                const spring = (x, v, k, c) => { const a = -k * x - c * v; return [v + a * dt]; };
                g.v = spring(g.x, g.v, 300, 16)[0]; g.x += g.v * dt;
                g.tv = spring(g.tilt, g.tv, 170, 12)[0]; g.tilt += g.tv * dt;
                g.ev = spring(g.ear, g.ev, 190, 11)[0]; g.ear += g.ev * dt;
                g.hv = spring(g.hat, g.hv, 240, 15)[0]; g.hat += g.hv * dt;
                g.eyeT -= dt; g.mouthT -= dt; g.press = Math.max(0, g.press - dt * 8);
                g.blink -= dt;
                if (g.blink < -0.1) g.blink = 1.5 + game.fxRng.next() * 3;
                const n = next[g.lane];
                g.want = n ? [0, -1] : [Math.sin(s.time * 0.8 + g.lane) * 0.6, -0.2];
                g.look = g.want;
                g.near = n ? Math.max(0, 1 - (n.time - t) / 0.3) : 0;
            }
            if (judge.fever) {
                if (b.pulse > 0.86 && !fever2) { fever2 = true; fx.spray(P.confetti, game.fxRng.next() * L.w, L.hor - 10, 3, { speed: [60, 180], angle: 1.5, cone: 1.2, grav: 240, size: 8, life: 1.3, color: CONFETTI }); }
                if (b.pulse < 0.5) fever2 = false;
                // Fireworks on every downbeat.
                if (b.down > 0.9 && !fever3) { fever3 = true; fx.spray(P.spark, 30 + game.fxRng.next() * (L.w - 60), L.hor * (0.25 + game.fxRng.next() * 0.6), 14, { speed: [70, 240], size: 20, life: 0.7, grav: 90, drag: 2, color: CONFETTI, add: true }); }
                if (b.down < 0.6) fever3 = false;
            }
        }

        function finish() {
            if (done) return;
            done = true;
            judge.tick(endAt + 5);
            const r = summary(judge, diff);
            game.audio.volume = baseVolume;
            game.haptics.auto = true;
            clock.stop();
            let rec = null;
            if (!practice) {
                rec = record(save, id, diff, r);
                for (const k of teachKinds) save.taught[k] = true;
                save.last = id; save.diff = diff;
                writeSave(game, save);
            }
            game.data.result = { id, diff, r, rec, practice };
            game.go("results", { id, diff, r, rec, practice }, { fade: 0.25 });
        }

        // --- World ----------------------------------------------------------------------------
        const beatZ = (time, t) => (time - t) / approach;
        s.add([{
            draw(d) {
                const t = clock.now(), b = clock.bop(t), v = game.view, k = feverK;
                drawStage(d, stageName, v, L.hor, { zoom: 1 + b.kick * 0.012 + k * 0.03, color: k > 0.01 ? mix("#ffffff", "#ffa8e8", k) : undefined });
                if (k > 0.02) rays(d, b, k, t);
                band(d, b, t);
                road(d, t, b, k);
                drawNotes(d, t, b, k);
                drawHeads(d, b, k, t);
            },
        }]);

        function rays(d, b, k, t) {
            d.additive(() => {
                for (let i = 0; i < 12; i++) {
                    const a = i / 12 * 6.283 + t * 0.35, r = Math.max(L.w, L.h) * 1.4, w = 0.11;
                    d.poly([[L.cx, L.hor], [L.cx + Math.cos(a - w) * r, L.hor + Math.sin(a - w) * r], [L.cx + Math.cos(a + w) * r, L.hor + Math.sin(a + w) * r]], { color: i % 2 ? "#ff5fb8" : "#ffc93c", opacity: 0.1 * k * (0.7 + b.kick * 0.6) });
                }
            });
        }

        function road(d, t, b, k) {
            const half = L.laneW * heads / 2 + 10, top = half * 0.22, bottom = L.h + 20, hw = half * (1 + (bottom - L.hitY) / (L.hitY - L.hor) * 0.78);
            d.poly([[L.cx - top - 7, L.hor], [L.cx + top + 7, L.hor], [L.cx + hw + 12, bottom], [L.cx - hw - 12, bottom]], { color: stage.edge });
            // Road surface: lighter into the distance, in bands rather than a seam.
            const near = mix(stage.road[1], "#ff2fa0", k * 0.55), far = mix(stage.road[0], "#ffb040", k * 0.5), BANDS = 10;
            for (let i = 0; i < BANDS; i++) {
                const a = i / BANDS, c = (i + 1) / BANDS, ya = L.hor + (bottom - L.hor) * a * a, yc = L.hor + (bottom - L.hor) * c * c, wa = top + (hw - top) * a * a, wc = top + (hw - top) * c * c;
                d.poly([[L.cx - wa, ya], [L.cx + wa, ya], [L.cx + wc, yc + 1], [L.cx - wc, yc + 1]], { color: mix(far, near, a) });
            }
            // Lane guides, and a glow up the lane when a head is struck.
            for (let i = 0; i <= heads; i++) {
                const x = L.cx + (i - heads / 2) * L.laneW;
                d.line([L.cx + (x - L.cx) * 0.22, L.hor], [x + (x - L.cx) * ((bottom - L.hitY) / (L.hitY - L.hor)) * 0.78, bottom], { width: 1.5, color: stage.line, opacity: 0.22 });
            }
            d.additive(() => {
                for (let i = 0; i < heads; i++) {
                    const f = flashL[i] + gobs[i].held * 0.35;
                    if (f < 0.02) continue;
                    const x = L.laneX[i], w = L.laneW * 0.46;
                    d.poly([[xAt(i, 0.05) - w * 0.2, yAt(0.05)], [xAt(i, 0.05) + w * 0.2, yAt(0.05)], [x + w, L.hitY], [x - w, L.hitY]], { color: LANE[i], opacity: 0.22 * f });
                }
            });
            if (k > 0.02) d.additive(() => {
                // The road's edges catch fire with the kick.
                for (const side of [-1, 1]) d.poly([[L.cx + side * top, L.hor], [L.cx + side * (top + 2), L.hor], [L.cx + side * (hw + 16), bottom], [L.cx + side * (hw - 18), bottom]], { color: "#ff7a2a", opacity: k * (0.35 + b.kick * 0.5) });
            });
            // A line for every beat, marching towards you. Downbeats are bold, so odd meters can be read at a glance.
            const tt = t;
            for (let i = pulseAt; i < pulses.length; i++) {
                const p = pulses[i], z = beatZ(p.time, tt);
                if (z < -0.03) { if (i === pulseAt) pulseAt++; continue; }
                if (z > 1) break;
                const q = depth(z), y = yAt(q), hw2 = (0.22 + 0.78 * q) * half;
                d.line([L.cx - hw2, y], [L.cx + hw2, y], { width: (p.down ? 4 : 1.8) * (0.3 + q), color: stage.line, opacity: (p.down ? 0.55 : 0.28) * (0.3 + 0.7 * q) });
            }
        }
        let pulseAt = 0;

        function ribbon(d, n, t, colorA, colorB) {
            const from = Math.max(n.time, t), to = n.time + n.dur, seg = Math.max(3, Math.ceil((to - from) / 0.1));
            for (let i = 0; i < seg; i++) {
                const a = from + (to - from) * i / seg, c = from + (to - from) * (i + 1) / seg, za = beatZ(a, t), zc = beatZ(c, t);
                if (za > 1) break;
                const qa = depth(Math.min(1, za)), qc = depth(Math.min(1, zc)), wa = L.laneW * 0.2 * (0.25 + 0.75 * qa), wc = L.laneW * 0.2 * (0.25 + 0.75 * qc), xa = xAt(n.lane, qa), xc = xAt(n.lane, qc), ya = yAt(qa), yc = yAt(qc);
                d.poly([[xa - wa - 2.5, ya], [xa + wa + 2.5, ya], [xc + wc + 2.5, yc], [xc - wc - 2.5, yc]], { color: INK });
                d.poly([[xa - wa, ya], [xa + wa, ya], [xc + wc, yc], [xc - wc, yc]], { color: Math.floor((a - n.time) / 0.14) % 2 ? colorA : colorB });
            }
        }

        function drawNotes(d, t, b, k) {
            const list = [];
            for (let i = judge.first; i < judge.notes.length; i++) {
                const n = judge.notes[i];
                if (n.time - t > approach) break;
                if (n.state === "done") continue;
                list.push(n);
            }
            for (let i = list.length - 1; i >= 0; i--) {
                const n = list[i], z = beatZ(n.time, t), q = depth(z), base = L.laneW * 0.56 * (0.26 + 0.74 * q), x = xAt(n.lane, q), y = yAt(q);
                const held = n.state === "held" || n.state === "rolling";
                if (n.kind === "hold") ribbon(d, n, t, LANE[n.lane], mix(LANE[n.lane], "#ffffff", 0.45));
                if (n.kind === "roll") ribbon(d, n, t, "#ffc93c", "#ff8a2a");
                if (held && n.kind === "hold") continue;
                const hx = held ? L.laneX[n.lane] : x, hy = held ? L.hitY : y;
                if (q > 0.04) d.circle(base * 0.4, { x: hx, y: hy + base * 0.46, color: "#000000", opacity: 0.24 * q });
                const bounce = 1 + b.pulse * 0.1;
                if (k > 0.3) d.additive(() => d.sprite("props", { frame: P.spark, x: hx, y: hy, width: base * 1.9, height: base * 1.9, color: "#ff7a2a", opacity: 0.6 * k }));
                if (n.kind === "swipe") d.sprite("props", { frame: P.swipe, x: hx, y: hy - Math.sin(s.time * 12) * base * 0.05, width: base * 1.15 * bounce, height: base * 1.15 * bounce });
                else if (n.kind === "roll") d.sprite("props", { frame: P.roll, x: hx, y: hy, width: base * 1.3 * bounce, height: base * 1.3 * bounce, rot: t * 6 });
                else d.sprite("props", { frame: n.lane, x: hx, y: hy, width: base * bounce, height: base * bounce });
                if (teachKinds.has(n.kind) && n.time > t - 0.2) letters(d, LABEL[n.kind], x, y - base * 0.9, { size: Math.max(13, base * 0.5), color: "#fff7d6", opacity: Math.min(1, q * 4) });
                if (n.kind === "roll" && held) letters(d, `${n.hits}`, hx, hy - base * 0.8, { size: 24, color: "#ffe27a" });
            }
        }

        function drawHeads(d, b, k, t) {
            const firstWait = firstRun && hitsSeen < 4 ? judge.notes[judge.first] : null;
            for (let i = 0; i < heads; i++) {
                const g = gobs[i], x = L.laneX[i], sway = b.sway * 0.05 * (i % 2 ? 1 : -1), dance = b.kick * 0.1 - b.snare * 0.05;
                const eye = k > 0.5 ? (g.eyeT > 0 && g.eye === EYE.cross ? EYE.cross : EYE.shades) : g.eyeT > 0 ? g.eye : g.blink < 0 ? EYE.blink : judge.combo >= 40 ? EYE.happy : EYE.open;
                const mouth = g.mouthT > 0 ? g.mouth : k > 0.5 ? MOUTH.yell : g.held ? MOUTH.wince : g.near > 0.5 ? MOUTH.oh : judge.combo >= 12 ? MOUTH.grin : MOUTH.smile;
                // Target ring, on top of each head, pulsing with the beat.
                drawGoblin(d, g.spec, x, L.headY, L.size, { squash: g.x * 0.1 + dance + g.press * 0.12 + g.held * 0.14, tilt: sway + g.tilt * 0.1, ear: g.ear * 0.1 + b.snare * 0.14 + (heads === 4 ? 0.32 : 0), hatPop: Math.max(0, g.hat * 0.1), eye, mouth, look: g.look, earScale: heads === 4 ? 0.74 : 1 });
                const r = L.laneW * 0.31 * (1 + b.pulse * 0.1 + g.near * 0.1);
                d.circle(r * 0.94, { x, y: L.hitY, color: "#000000", opacity: 0.18 });
                d.sprite("props", { frame: P.ring, x, y: L.hitY, width: r * 2, height: r * 2, color: LANE[i], opacity: 0.8 + g.near * 0.2 });
                if (!game.input.touchMode) letters(d, KEYS[heads][i], x, L.hitY, { size: 18, color: "#fff7d6", opacity: 0.75 });
                if (firstWait && firstWait.lane === i && firstWait.time - t < 1.1) {
                    const dy = Math.sin(s.time * 9) * 8;
                    d.sprite("props", { frame: P.hand, x: x + 4, y: L.headY + L.size * 0.34 + dy, width: 52, height: 52 });
                }
            }
        }

        const roster = GOBLINS.slice(heads).concat([]), GEAR_FOR = { bogsy: 0, wick: 1, mumble: 2, rattle: 3, fizz: 4, gronk: 5 };
        /** The band that's joined so far marches in the background and grows with the story. */
        function band(d, b, t) {
            const n = Math.min(bandCount, GOBLINS.length) - Math.min(2, bandCount), players = GOBLINS.slice(2, 2 + n);
            players.forEach((spec, i) => {
                const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), size = (L.h > L.w ? 34 : 30) + row * 4;
                const x = L.cx + side * (L.w * 0.22 + row * (L.w > L.h ? 62 : 40)), hop = (i + b.count) % 2 ? b.kick * 7 : 0, y = L.hor + 10 + row * 10 - hop;
                drawGoblin(d, spec, x, y, size, { squash: b.kick * 0.2, tilt: b.sway * 0.1, body: true, eye: feverK > 0.5 ? EYE.shades : EYE.happy, mouth: MOUTH.grin, ear: b.snare * 0.2 });
                d.sprite("gear", { frame: GEAR_FOR[spec.id], x: x + side * -size * 0.2, y: y + size * 0.7, width: size * 1.05, height: size * 1.05, rot: b.sway * 0.1 });
            });
        }

        const mix = ctx.mix;

        // --- Over the top ----------------------------------------------------------------------
        s.onDraw((d) => {
            fx.draw(d);
            for (const p of popups) {
                const q = p.t / 0.55, up = (1 - (1 - q) ** 3) * 34, pop2 = q < 0.15 ? 0.6 + q / 0.15 * 0.6 : 1.2 - Math.min(0.2, (q - 0.15) * 1.2);
                const half = measure(p.text, p.size * pop2) / 2 + 6;
                letters(d, p.text, Math.max(half, Math.min(L.w - half, p.x)), p.y - up, { size: p.size * pop2, color: p.color, opacity: q > 0.7 ? (1 - q) / 0.3 : 1 });
            }
        });

        s.onDrawUI((d) => {
            const t = clock.now(), b = clock.bop(t), v = game.view, top = v.safe.top + 8, left = v.safe.left + 10;
            d.rect(v.width, top + 54, { x: v.width / 2, y: (top + 54) / 2, color: "#120a26", opacity: 0.34 });
            // Score, with each digit hopping on the beat.
            letters(d, String(judge.score).padStart(6, "0"), left, top + 13, { size: 22, align: "left", color: "#fff7d6", wave: b.pulse * 1.8, phase: b.phase });
            const acc = judge.judged ? `${(judge.accuracy * 100).toFixed(1)}%` : "";
            if (acc) d.text(acc, { x: left + 24, y: top + 34, size: 12, bold: true, color: "#fff7d6" });
            // Fever gauge: a fat sausage that fills.
            const gw = Math.min(150, v.width * 0.36), gx = v.width / 2 + (v.width > 500 ? 0 : 22), gy = top + 14, fill = judge.fever ? Math.max(0, (judge.feverUntil - t) / judge.feverLength) : judge.meter;
            d.rect(gw + 6, 18, { x: gx, y: gy, color: INK, radius: 9 });
            if (fill > 0.01) d.rect(Math.max(10, (gw - 2) * fill), 12, { x: gx - (gw - 2) * (1 - fill) / 2, y: gy, color: judge.fever ? (Math.floor(t * 8) % 2 ? "#ff7ae0" : "#ffc93c") : mix("#7dffb0", "#ff7ae0", fill), radius: 6 });
            letters(d, "FEVER", gx, gy, { size: 11, color: "#fff7d6", ink: INK });
            // Song progress
            const pr = Math.min(1, t / (practice ? endAt : arr.end));
            d.rect(gw * pr + 0.01, 2.5, { x: gx - gw * (1 - pr) / 2, y: gy + 13, color: stage.accent, opacity: 0.9 });
            // Combo, centre stage.
            if (judge.combo >= 3) {
                const tall = v.height > v.width, size = 34 + Math.min(16, judge.combo / 6) + b.pulse * 6 + milestone * 10, cy = tall ? L.hor + (L.hitY - L.hor) * 0.36 : v.height * 0.46, cx = tall ? L.cx : Math.max(v.safe.left + 66, L.laneX[0] - L.laneW * 0.9);
                letters(d, String(judge.combo), cx, cy, { size, color: judge.fever ? "#ff9ae8" : "#ffe27a", wobble: 0.03, phase: b.phase, opacity: 0.92 });
                letters(d, `COMBO x${judge.multiplier}`, cx, cy + size * 0.68, { size: 13, color: "#fff7d6", opacity: 0.9 });
            }
            if (t < firstTime - 0.1 && !practice) {
                const left2 = countdown.filter((c) => c > t).length;
                if (left2 > 0 && left2 <= 4) letters(d, String(left2), L.cx, L.hor + 70, { size: 66 + b.pulse * 30, color: "#fff7d6", opacity: 0.95 });
                letters(d, song.title, L.cx, L.hor + 8 - 2, { size: Math.min(30, (v.width - 30) / measure(song.title, 1)), color: stage.accent, wave: 2, phase: b.phase });
                d.text(`${song.genre} in ${song.sig}, ${diff}`, { x: L.cx, y: L.hor + 30, size: 13, bold: true, color: "#fff7d6" });
                if (clock.silent) d.text("Sound is blocked here. The band plays on in silence.", { x: L.cx, y: L.hor + 126, size: 12, bold: true, color: "#fff7d6", maxWidth: v.width - 40 });
            }
            if (firstRun && hitsSeen < 4 && t > firstTime - 1.2 && t < firstTime + 6) letters(d, game.input.touchMode ? "TAP THE HEADS!" : "F AND J!", L.cx, L.hor + 118, { size: 24, color: "#ffe27a", wave: 3, phase: b.phase });
            if (banner) {
                const q = banner.t / 1.3, e = q < 0.1 ? q / 0.1 : 1, o = q > 0.8 ? (1 - q) / 0.2 : 1, size = Math.min(banner.big ? 46 : 30, (v.width - 24) / measure(banner.text, 1)) * (0.6 + e * 0.4);
                letters(d, banner.text, L.cx, L.hor + (L.hitY - L.hor) * 0.14, { size, color: banner.color, opacity: o, wave: 4, phase: t * 2 });
            }
            if (practice) d.text(`Practice ${Math.round(practice.speed * 100)}%`, { x: L.cx, y: top + 38, size: 12, bold: true, color: "#7dffb0" });
            if (pausedUI) {
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#120a26", opacity: 0.72 });
                letters(d, "BAND BREAK", L.cx, v.height / 2 - Math.min(70, (v.height - 120) / 3) * 1.9, { size: 34, color: "#ffe27a" });
            }
            if (resumeCount > 0) letters(d, String(Math.ceil(resumeCount / 0.5)), L.cx, v.height / 2, { size: 80, color: "#fff7d6" });
        });

        clock.play(arr, { loop: !!practice });
        ctx.afterPlay?.(s);
    });
}
