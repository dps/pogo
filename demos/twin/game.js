// Robovac Rampage: a twin-stick arena shooter. A robot vacuum with a chainsaw defends the house from what it should have cleaned up.
import { createGame, layer, pin, pos, rect, tap, ui } from "./pogo.js";
import { TITLE_BOTTOM, TITLE_TOP, W, D } from "./data.js";
import { ROOMS } from "./rooms.js";
import { Sim } from "./sim.js";
import { Autopilot } from "./autopilot.js";
import { View, FONT } from "./view.js";
import { registerModels } from "./models.js";
import { paintArt } from "./art.js";
import { Sound } from "./sound.js";
import { Controls, INK, chunky, drawHud, drawScreenFx, resultPanel, showCards, sticker } from "./ui.js";
import { board, dailySeed, dayNumber, loadSave, persist, recordRun, todayKey } from "./save.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#231a2c",
    actions: {
        dash: ["Space", "ShiftLeft", "ShiftRight", "KeyQ", "pad:a", "pad:b"],
        pick1: ["Digit1", "pad:x"], pick2: ["Digit2", "pad:a"], pick3: ["Digit3", "pad:b"],
    },
    touch: {}, seed: 7, maxDpr: 2,
});
game.touch.enabled = false;

const snd = new Sound(game);
game.twinSnd = snd;
const save = loadSave(game);
game.audio.muted = save.muted;
game.haptics.enabled = save.haptics;

registerModels(game);
paintArt(game);
game.assets.paint("vig", 128, 128, (p) => {
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const r = Math.hypot((x - 63.5) / 63.5, (y - 63.5) / 63.5), o = (y * 128 + x) * 4;
        p.data[o] = p.data[o + 1] = p.data[o + 2] = 255;
        p.data[o + 3] = Math.max(0, Math.min(1, (r - 0.72) * 1.8)) * 255;
    }
}, { smooth: true });

// Right mouse dashes too. The menu that would open there is switched off.
let rmb = false;
if (typeof window !== "undefined") {
    try {
        window.addEventListener("contextmenu", (e) => e.preventDefault());
        window.addEventListener("mousedown", (e) => { if (e.button === 2) rmb = true; });
        window.addEventListener("mouseup", (e) => { if (e.button === 2) rmb = false; });
    } catch { /* a locked-down embed: keyboard still dashes */ }
}

function settings(s, anchor, off) {
    const row = (i, label, get, flip) => s.add([rect(46, 46, { color: "#00000000" }), pin(anchor, [off[0] + i * 52, off[1]]), layer(12), tap(() => { flip(); persist(game); snd.play("card", "light"); }), {
        draw(d) {
            d.rect(44, 44, { color: INK, radius: 12 }); d.rect(38, 38, { color: get() ? "#37b5a4" : "#5d5867", radius: 10 });
            d.text(label, { size: 11, bold: true, font: FONT, color: "#ffffff" });
            if (!get()) d.line([-15, 15], [15, -15], { width: 3, color: "#ff7a5a" });
        },
    }]);
    row(0, "SND", () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; });
    row(1, "BUZZ", () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; });
    row(2, "AUTO", () => save.autofire, () => { save.autofire = !save.autofire; });
}

// --- Title: the robot working a real room behind the logo ---------------------------------------
game.scene("title", (s) => {
    game.touch.set({});
    const sim = new Sim({ seed: 5, attract: true }), bot = new Autopilot(sim, 0.8, 4);
    const view = new View(game, s, sim, snd, { quiet: true });
    game.twin = { sim, view };
    const key = todayKey(), day = dayNumber(key);
    const start = (mode) => {
        snd.play("card", "medium");
        snd.startMotors();
        const seed = mode === "daily" ? dailySeed(key) : (Date.now() % 2147483647) | 1;
        game.go("play", { mode, seed, key, heat: mode === "deep" ? 1 : 0 }, { fade: 0.22 });
    };
    s.onUpdate((dt) => {
        sim.step(dt, bot.input(dt));
        if (sim.phase === "upgrade") sim.choose(0);
        if (sim.phase === "exit" || sim.phase === "dead" || sim.phase === "won") { sim.p.hp = sim.p.maxHp; }
        if (sim.phase === "transit") { sim.phase = "lull"; sim.phaseT = 2; sim.run.wave = 0; sim.exits = null; sim.events.length = 0; }
        view.update(dt);
    });
    s.onDraw((d) => view.draw2D(d));
    const v = () => game.view;
    s.add([ui(), layer(2), {
        draw(d) {
            const vv = v(), portrait = vv.height > vv.width, t = view.t, cx = portrait ? vv.width / 2 : vv.width * 0.3;
            d.rect(vv.width * 2, vv.height * 2, { x: vv.width / 2, y: vv.height / 2, color: "#231a2c", opacity: 0.18 });
            const sz = portrait ? Math.min(62, vv.width * 0.165) : 58, y0 = portrait ? vv.safe.top + vv.height * 0.13 : vv.height * 0.2;
            const wob = Math.sin(t * 2) * 0.012;
            d.push(); d.translate(cx, y0); d.rotate(-0.035 + wob);
            sticker(d, TITLE_TOP, 0, 0, sz, "#fff6e6", INK, 0.12);
            sticker(d, TITLE_BOTTOM, 0, sz * 0.98, sz * 1.08, "#ff5a3a", INK, 0.12);
            d.pop();
            // Today's run and its table.
            const px = portrait ? vv.width / 2 : vv.width * 0.74, py = portrait ? vv.height * 0.56 : vv.height * 0.2, pw = portrait ? Math.min(vv.width - 40, 300) : 240;
            const rows = board(game, key).slice(0, 4);
            const ph = 40 + rows.length * 21;
            d.rect(pw + 6, ph + 6, { x: px, y: py + ph / 2, color: INK, radius: 14, opacity: 0.86 });
            d.text(`TODAY'S HOUSE  #${day}`, { x: px, y: py + 19, size: 13, bold: true, font: FONT, color: "#ffd24d" });
            rows.forEach((r, i) => {
                const y = py + 42 + i * 21, you = r.name === "YOU";
                d.text(`${i + 1}  ${r.name}`, { x: px - pw / 2 + 12 + (r.name.length + 3) * 3.3, y, size: 13, bold: you, font: FONT, color: you ? "#7fffe9" : "#e8dcc8" });
                d.text(r.score.toLocaleString("en-US"), { x: px + pw / 2 - 40, y, size: 13, bold: true, font: FONT, color: you ? "#7fffe9" : "#fff6e6" });
            });
            if (save.streak > 1) d.text(`${save.streak} day streak`, { x: px, y: py + ph + 16, size: 12, bold: true, font: FONT, color: "#ffd24d" });
        },
    }]);
    const portrait = game.view.height > game.view.width, sf = game.view.safe;
    const play = chunky("PLAY", { width: portrait ? 230 : 210, height: 72, onTap: () => start("daily"), action: "confirm", textSize: 32, radius: 20 });
    s.add([play, pin(portrait ? "bottom" : "bottom", portrait ? [0, 112] : [game.view.width * 0.2 - 0, 44]), layer(10)]);
    const label = save.deep ? "DEEP CLEAN" : "PRACTICE", mode = save.deep ? "deep" : "free";
    s.add([chunky(label, { width: 160, height: 52, onTap: () => start(mode), textSize: 16, color: "#37b5a4" }), pin("bottom", portrait ? [0, 44] : [-game.view.width * 0.2, 58]), layer(10)]);
    settings(s, portrait ? "top-left" : "top-right", [8, 8]);
    snd.song("calm");
});

// --- A run ------------------------------------------------------------------------------------------
game.scene("play", (s, args) => {
    const mode = args?.mode ?? "free", seed = args?.seed ?? 4242, key = args?.key ?? todayKey(), heat = args?.heat ?? 0;
    game.touch.set({});
    snd.startMotors();
    const sim = new Sim({ seed, heat });
    if (args?.start) debugWarp(sim, args.start);
    const view = new View(game, s, sim, snd);
    let paused = false, overlay = false, done = false;
    const state = { hint: null };
    const controls = new Controls(game, s, view, { save, active: () => !paused && !overlay && !done });
    const pilot = args?.bot !== undefined ? new Autopilot(sim, args.bot, seed) : null;
    game.twin = { sim, view, controls };
    game.data.score = 0;

    const finish = () => {
        if (done) return;
        done = true;
        snd.stopMotors();
        const res = sim.result(), info = { ...recordRun(game, res, mode, key), mode };
        snd.song(res.won ? "win" : "lose");
        game.haptic(res.won ? "success" : "error");
        game.data.result = res;
        resultPanel(game, s, view, res, info, {
            again: () => game.go("play", { mode, seed: mode === "daily" ? seed : (seed * 1664525 + 7) >>> 0 || 1, key, heat }, { fade: 0.18 }),
            menu: () => game.go("title", {}, { fade: 0.2 }),
        });
    };
    game.twin.finish = finish;

    const setPaused = (on) => {
        if (done) return;
        paused = on;
        s.paused = on;
        if (on) snd.hush();
        pauseUi(on);
    };
    let pauseItems = [];
    const pauseUi = (on) => {
        for (const e of pauseItems) e.destroy();
        pauseItems = [];
        if (!on) return;
        const v = game.view;
        pauseItems.push(s.add([ui(), layer(8), { paused: false, draw(d) {
            d.rect(v.width * 2, v.height * 2, { x: v.width / 2, y: v.height / 2, color: "#120c18", opacity: 0.6 });
            sticker(d, "PAUSED", v.width / 2, v.height * 0.28, 36, "#ffd24d");
        } }]));
        pauseItems.push(s.add([chunky("RESUME", { width: 190, height: 58, onTap: () => setPaused(false), action: "confirm", textSize: 22 }), pos(v.width / 2, v.height * 0.45), ui(), layer(10)]));
        pauseItems.push(s.add([chunky("QUIT RUN", { width: 170, height: 48, onTap: () => { snd.stopMotors(); game.go("title", {}, { fade: 0.2 }); }, textSize: 17, color: "#37b5a4" }), pos(v.width / 2, v.height * 0.45 + 72), ui(), layer(10)]));
        const row = (i, label, get, flip) => pauseItems.push(s.add([rect(58, 50, { color: "#00000000" }), pos(v.width / 2 + (i - 1) * 66, v.height * 0.45 + 134), ui(), layer(10), tap(() => { flip(); persist(game); }), { draw(d) {
            d.rect(56, 46, { color: INK, radius: 12 }); d.rect(50, 40, { color: get() ? "#37b5a4" : "#5d5867", radius: 10 });
            d.text(label, { size: 12, bold: true, font: FONT, color: "#fff" });
        } }]));
        row(0, "SOUND", () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; });
        row(1, "BUZZ", () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; });
        row(2, "AUTO", () => save.autofire, () => { save.autofire = !save.autofire; });
    };
    s.on("leave", () => snd.stopMotors());
    game.on("hide", () => { if (game.current === s && !paused && !done && !overlay) setPaused(true); });

    s.add([rect(46, 46, { color: "#00000000" }), pin("top-right", [8, 8]), layer(4), tap(() => setPaused(!paused)), {
        draw(d) { if (done) return; d.rect(40, 40, { color: INK, radius: 12, opacity: 0.8 }); d.sprite("i_pause", { width: 24, height: 24, color: "#fff6e6" }); },
    }]);

    s.onUpdate((dt) => {
        if (s.input.pressed("pause") && !done) { setPaused(!paused); return; }
        controls.rmb = rmb;
        const inp = pilot ? pilot.input(dt) : controls.update();
        if (pilot && overlay) overlay.pick(0);
        if (overlay) {
            for (let i = 0; i < 3; i++) if (s.input.pressed(`pick${i + 1}`)) overlay.pick(i);
        }
        sim.step(dt, inp);
        view.update(dt);
        game.data.score = sim.run.score;
        const p = sim.p;
        if (!done) snd.motors(Math.hypot(p.vx, p.vz), p.sawHit, p.charge, p.charging, p.coneOn, p.spin);
        if (sim.phase === "upgrade" && !overlay) overlay = showCards(game, s, view, (i) => { overlay = false; sim.choose(i); });
        if ((sim.phase === "dead" || sim.phase === "won") && sim.phaseT <= 0) finish();
        // Music follows the danger.
        const c = sim.cat.state, catOn = c !== "off" && c !== "leave";
        if (!done) {
            const mood = sim.phase === "won" ? "win" : sim.phase === "dead" ? "off" : catOn ? "cat" : sim.boss ? "boss" : sim.phase === "wave" ? "fight" : "calm";
            snd.song(mood, sim.roomName);
        }
        // Teach by prompting only for what hasn't been done.
        state.hint = null;
        if (!save.taught.dash) {
            if (p.dashT > 0) { save.taught.dash = true; persist(game); controls.dashPulse = 0; }
            else if (sim.motes.length >= 4 && sim.run.time > 3) {
                state.hint = s.input.touchMode ? "HOLD DASH: SUCK UP DUST. LET GO: LUNGE" : "HOLD SPACE: SUCK UP DUST. LET GO: LUNGE";
                controls.dashPulse = 1;
            }
        }
        if (!s.input.touchMode && !save.taught.move && sim.run.time < 7) state.hint = "WASD DRIVE    MOUSE AIM";
        if (sim.run.time >= 7) save.taught.move = true;
    });
    s.onDraw((d) => view.draw2D(d));
    s.add([ui(), layer(1), { draw(d) {
        if (args?.hero) {
            d.push(); d.translate(180, 62); d.rotate(-0.035);
            sticker(d, TITLE_TOP, 0, 0, 46, "#fff6e6", INK, 0.12); sticker(d, TITLE_BOTTOM, 0, 46, 50, "#ff5a3a", INK, 0.12);
            d.pop();
            return;
        }
        if (!done) drawHud(d, game, s, view, state);
        drawScreenFx(d, game, view);
    } }]);
    s.add([ui(), layer(3), { draw(d) { controls.draw(d); } }]);
});

/** For tools: jump straight to a late room, with fair upgrades. */
function debugWarp(sim, o) {
    if (o.room) {
        sim.run.route = o.route ?? ["living", "kitchen"].slice(0, Math.max(0, (o.depth ?? 1)));
        sim.loadRoom(o.room);
    }
    if (o.ups) { for (const k of o.ups) { sim.p.ups[k] = true; sim.run.taken.push(k); } sim.recalc(); sim.p.hp = sim.p.maxHp; }
    if (o.weapon) sim.p.weapon = o.weapon;
    if (o.wave) sim.run.wave = o.wave;
}

game.start("title");
if (typeof document !== "undefined") document.getElementById("load")?.remove();
