// Tiny Tide Town: scenes, the event-to-juice wiring, progress. The town itself is in sim.js, its picture in world.js.
import { color, createGame, dim, mesh, pin, rect, tap } from "./pogo.js";
import { BUILDINGS, HOURS, SANDBOX, SANDBOX_MAPS, SCENARIOS, STEP, TRAY_ORDER } from "./data.js";
import { Sim } from "./sim.js";
import { World, topY } from "./world.js";
import { MB, getModel, registerMovers } from "./models.js";
import { cornerX, cornerZ } from "./hex.js";
import { act } from "./policy.js";
import { FONT, Hud, widthOf } from "./ui.js";
import { Sound } from "./audio.js";
import { ICON, paintArt } from "./art.js";
import { Coach } from "./coach.js";
import { CARDS } from "./cards.js";

const HOUR_SEC = 0.625;        // A day lasts 15 seconds at normal speed.
const INK = "#20505c", CARD = "#fff6e4", CORAL = "#e0694a", TEAL = "#2f9c95";

// Big screens get more room in view units, so the HUD doesn't swell with the window.
const roomy = typeof innerWidth === "number" && innerWidth >= 1100 && innerHeight >= 700;
const game = createGame({
    view: { width: 360, height: 640, landscape: roomy ? { width: 960, height: 600 } : { width: 640, height: 360 } },
    background: ["#a9e1ee", "#f7efd6"], maxDpr: 2, seed: 11,
});
globalThis.__city = game;
const snd = new Sound(game);

paintArt(game);
registerMovers(game.assets);
{
    const ring = new MB();
    ring.jit = 0;
    for (let i = 0; i < 6; i++) {
        const j = (i + 1) % 6, a = 0.96, b = 0.8;
        ring.poly([[cornerX(i) * a, 0, cornerZ(i) * a], [cornerX(j) * a, 0, cornerZ(j) * a], [cornerX(j) * b, 0, cornerZ(j) * b], [cornerX(i) * b, 0, cornerZ(i) * b]], "#ffffff", [0, -1, 0]);
    }
    game.assets.mesh("ring", ring.data());
}
if (CARDS) game.assets.image("cards", CARDS, { cols: 5, rows: 3, width: 600, height: 360 });

// --- Progress ------------------------------------------------------------------------------------

const save = () => game.load("tide1", null) ?? { stars: {}, best: {}, relaxed: false, sound: true, music: true, haptics: true };
const store = (fn) => { const p = save(); fn(p); game.save("tide1", p); applySettings(p); return p; };
function applySettings(p) {
    game.audio.muted = !p.sound;
    game.haptics.enabled = p.haptics;
    snd.musicOn = p.music && p.sound;
}
applySettings(save());
const unlocked = (i, p) => i === 0 || (p.stars[SCENARIOS[i - 1].id] ?? 0) > 0;
const sandboxOpen = (p) => (p.stars[SCENARIOS[0].id] ?? 0) > 0;
const nextLevel = (p) => { const i = SCENARIOS.findIndex((s) => !p.stars[s.id]); return i < 0 ? null : i; };

function settings(hud, extra = []) {
    let p = save();
    const flip = (k) => () => { p = store((q) => { q[k] = !q[k]; }); snd.tap(); if (k !== "haptics") { snd.setMusic(p.music && p.sound); } };
    hud.modal = {
        title: "Settings", height: 296, by: game.view.height / 2 + 112,
        toggles: [
            { label: "Sound", on: () => p.sound, fn: flip("sound") },
            { label: "Music", on: () => p.music, fn: flip("music") },
            { label: "Haptics", on: () => p.haptics, fn: flip("haptics") },
        ],
        buttons: [{ label: "Back", fn: () => { hud.modal = null; snd.tap(); } }, ...extra],
    };
}

// --- A little town to look at behind the menus ---------------------------------------------------

function backdropSim() {
    const sim = new Sim({ ...SCENARIOS[5], storms: [], goals: [] });
    sim.topLevel = 1;
    for (let t = 0; t < 26 * HOURS; t++) {
        sim.tick();
        sim.events.length = 0;
        if (sim.hour % 3 === 0) { let g = 8; while (g-- && act(sim)); }
    }
    // Every town deserves a lighthouse on its rock, and a pub.
    sim.coins += 200; sim.wood += 100;
    for (const type of ["light", "light", "pub", "market", "garden", "garden"]) {
        const spots = sim.cells.filter((c) => !c.b && c.h >= 1 && sim.canPlace(type, c).ok).sort((a, b) => b.h - a.h || sim.preview(type, b).delta - sim.preview(type, a).delta);
        if (spots[0]) sim.place(type, spots[0]);
    }
    while (sim.hour !== 9) sim.tick();
    sim.events.length = 0;
    return sim;
}

function diorama(s, sim, o = {}) {
    let frac = 0;
    const w = new World(s, game, sim, { frac: () => frac, ...o });
    const self = { w, step: null };
    s.add([dim(3), {
        update(dt) { frac = self.step ? self.step(dt, frac) : 0; w.update(dt); },
        draw(d) { w.draw(d); },
    }]);
    s.on("resize", () => w.fit(false));
    return self;
}

/** A tappable painted button built from entities, so `pogo check` can find it. */
function bigButton(s, label, anchor, offset, w, h, fill, fn, o = {}) {
    return s.add([rect(w, h, { radius: 16, color: fill }), pin(anchor, offset), tap(() => { snd.tap(); fn(); }), { layer: 20, draw(d) {
        d.rect(w, h, { y: 4, color: "#12333d44", radius: 16 });
        d.rect(w, h, { color: fill, radius: 16 });
        d.rect(w * 0.86, h * 0.18, { y: -h * 0.3, color: "#ffffff2a", radius: 8 });
        d.text(label, { size: o.size ?? 21, bold: true, font: FONT, color: "#fff" });
    } }]);
}

function tinyIcon(s, frame, anchor, offset, fn) {
    return s.add([rect(44, 44, { radius: 12, color: "#20505cd9" }), pin(anchor, offset), tap(fn), { layer: 20, draw(d) { d.sprite("icons", { frame, width: 24, height: 24 }); } }]);
}

// --- Title ---------------------------------------------------------------------------------------

game.scene("title", (s, args = {}) => {
    game.touch.enabled = false;
    const sim0 = backdropSim();
    const d0 = diorama(s, sim0, { yaw: 0.9, title: true });
    const w = d0.w;
    game.city = { w, sim: sim0 };
    d0.step = (dt, f) => { const v = f + dt / (HOUR_SEC * 2); w.cam.tYaw += dt * 0.07; if (v >= 1) { w.sim.tick(); handleQuiet(w); return v - 1; } return v; };
    let t = 0;
    const p = save();
    const next = nextLevel(p);
    s.add([{ layer: 10, ui: true, update(dt) { t += dt; snd.tick(dt); }, draw() {} }]);
    s.onDrawUI((d) => {
        const v = s.view, land = v.width > v.height, cx = args.hero ? v.width * 0.2 : v.width / 2, y = args.hero ? v.height * 0.2 : v.safe.top + (land ? 56 : 104), bob = Math.sin(t * 1.6) * 2.5;
        logo(d, cx, y + bob, args.hero ? 1.5 : land ? 0.86 : 1);
    });
    if (args.hero) return;
    bigButton(s, next === null ? "Harbours" : (Object.keys(p.stars).length ? "Set sail" : "Play"), "bottom", [0, 112], 200, 60, CORAL, () => {
        if (next === null) game.go("harbours", {}, { fade: 0.25 });
        else game.go("play", { index: next }, { fade: 0.25 });
    }, { size: 25 });
    bigButton(s, "Harbours", "bottom", [0, 44], 200, 48, TEAL, () => game.go("harbours", {}, { fade: 0.25 }), { size: 17 });
    tinyIcon(s, ICON.cog, "top-right", [28, 28], () => { snd.tap(); game.go("harbours", { settings: true }, { fade: 0.15 }); });
    s.on("leave", () => snd.quiet());
});

function handleQuiet(w) {
    for (const e of w.sim.events) {
        if (e.e === "tideline") w.dirtyWater = true;
        else if (e.e === "catch") w.send(e.cell, w.sim.buildings[0].cell, { crate: true });
    }
    w.sim.events.length = 0;
}

function logo(d, cx, y, k) {
    const a = (str, x, yy, size, color, shadow = "#12333d55") => {
        d.text(str, { x: x + 2, y: yy + 4, size, bold: true, font: FONT, color: shadow });
        d.text(str, { x, y: yy, size, bold: true, font: FONT, color });
    };
    d.push();
    d.translate(cx, y);
    d.scale(k, k);
    a("Tiny Tide", 0, -24, 52, "#fff6e4", "#1f5f6bbb");
    a("Town", 0, 28, 58, "#ffd65c", "#a8602abb");
    d.pop();
}

// --- Choosing a harbour --------------------------------------------------------------------------

game.scene("harbours", (s, args = {}) => {
    game.touch.enabled = false;
    const d0 = diorama(s, backdropSim(), { yaw: 2.2, title: true });
    d0.step = (dt, f) => { d0.w.cam.tYaw += dt * 0.05; const v = f + dt / (HOUR_SEC * 2); if (v >= 1) { d0.w.sim.tick(); handleQuiet(d0.w); return v - 1; } return v; };
    let p = save();
    const land = s.view.width > s.view.height;
    const rowH = land ? 44 : 52, rowW = land ? 284 : Math.min(s.view.width - 24, 336);
    const row = (i, label, tag, stars, open, fn) => {
        const col = land ? (i % 2) : 0, r = land ? i >> 1 : i, ox = land ? (col ? 147 : -147) : 0, oy = (land ? 36 : 62) + r * (rowH + 6) + rowH / 2;
        s.add([rect(rowW, rowH, { radius: 13, color: CARD }), pin("top", [ox, oy]), tap(() => { if (open) { snd.tap(); fn(); } else snd.deny(); }), { layer: 5, draw(d) {
            d.rect(rowW, rowH, { y: 2, color: "#12333d44", radius: 13 });
            d.rect(rowW, rowH, { color: open ? CARD : "#d9dcd2", radius: 13 });
            const left = (str, x, y, size, color) => d.text(str, { x: x + widthOf(str, size) / 2, y, size, bold: true, font: FONT, color });
            left(label, -rowW / 2 + 12, -10, land ? 14 : 15, open ? INK : "#7d8f90");
            const tt = open ? tag : "Finish the last harbour", sz = Math.min(land ? 10 : 11.5, (rowW - 94) * 11.5 / widthOf(tt, 11.5));
            left(tt, -rowW / 2 + 12, 10, sz, "#5d8a8e");
            if (!open) d.sprite("iconsDark", { frame: ICON.lock, x: rowW / 2 - 28, width: 24, height: 24 });
            else if (stars >= 0) for (let k = 0; k < 3; k++) d.sprite("iconsDark", { frame: k < stars ? ICON.star : ICON.starOff, x: rowW / 2 - 62 + k * 19, width: 19, height: 19, color: k < stars ? undefined : "#20505c30" });
        } }]);
    };
    SCENARIOS.forEach((scn, i) => row(i, `${i + 1}. ${scn.name}`, scn.tag, p.stars[scn.id] ?? 0, unlocked(i, p), () => game.go("play", { index: i }, { fade: 0.25 })));
    row(SCENARIOS.length, "Free Build", SANDBOX.tag, -1, sandboxOpen(p), () => game.go("play", { sandbox: true }, { fade: 0.25 }));
    s.onDrawUI((d) => {
        const v = s.view;
        if (!land) d.text("Choose a harbour", { x: v.width / 2 + 1, y: v.safe.top + 34, size: 25, bold: true, font: FONT, color: INK });
    });
    const relW = land ? 230 : 214, gap = land ? 150 : 56;
    s.add([rect(relW, 44, { radius: 14, color: "#33557a" }), pin("bottom", [land ? gap : 44, 26]), tap(() => { p = store((q) => { q.relaxed = !q.relaxed; }); snd.tap(); }), { layer: 20, draw(d) {
        d.rect(relW, 44, { y: 3, color: "#12333d44", radius: 14 });
        d.rect(relW, 44, { color: p.relaxed ? TEAL : "#33557a", radius: 14 });
        d.text(p.relaxed ? "Relaxed: gentle storms" : "Relaxed mode: off", { size: 15, bold: true, font: FONT, color: "#fff" });
    } }]);
    bigButton(s, "Back", "bottom", [land ? -150 : -116, 26], land ? 120 : 92, 44, CORAL, () => game.go("title", {}, { fade: 0.2 }), { size: 16 });
    s.add([{ ui: true, update(dt) { snd.tick(dt); } }]);
    snd.play("spring");
    if (args.settings) settingsScene(s);
});

/** Settings on the menu screens: a plain panel of entities. */
function settingsScene(s) {
    let p = save();
    const parts = [];
    const close = () => { for (const e of parts) e.destroy(); };
    const panel = s.add([rect(s.view.width, s.view.height, { color: "#12333d88" }), pin("center"), tap(() => {}), { layer: 40 }]);
    parts.push(panel);
    parts.push(s.add([rect(300, 290, { radius: 22, color: CARD }), pin("center"), { layer: 41 }]));
    ["sound", "music", "haptics"].forEach((k, i) => {
        parts.push(s.add([rect(264, 48, { radius: 12, color: "#20505c14" }), pin("center", [0, -70 + i * 56]), tap(() => { p = store((q) => { q[k] = !q[k]; }); snd.tap(); }), { layer: 42, draw(d) {
            d.text(k[0].toUpperCase() + k.slice(1), { x: -80, size: 16, bold: true, font: FONT, color: INK });
            d.rect(46, 26, { x: 100, color: p[k] ? TEAL : "#b9c5c5", radius: 13 });
            d.circle(11, { x: 100 + (p[k] ? 10 : -10), color: "#fff" });
        } }]));
    });
    parts.push(s.add([rect(180, 46, { radius: 14, color: CORAL }), pin("center", [0, 104]), tap(() => { snd.tap(); close(); }), { layer: 42, draw(d) { d.text("Done", { size: 17, bold: true, font: FONT, color: "#fff" }); } }]));
}

// --- Playing -------------------------------------------------------------------------------------

game.scene("play", (s, args = {}) => {
    game.touch.enabled = false;
    const index = args.index ?? 0;
    const p = save();
    const scn = args.sandbox ? { ...SANDBOX, map: SANDBOX_MAPS[(args.map ?? p.sandboxMap ?? 0) % SANDBOX_MAPS.length].map } : SCENARIOS[index];
    const sim = new Sim(scn, { relaxed: p.relaxed });
    if (args.sandbox) store((q) => { q.sandboxMap = (q.sandboxMap ?? 0) + 1; });
    if (args.days) fastForward(sim, args.days);
    const dio = diorama(s, sim);
    const w = dio.w;
    let won = false, thunderT = 3, festival = 0, coach = null;
    const hud = new Hud(s, game, snd, sim, w, {
        cardFrame: (t) => (CARDS ? TRAY_ORDER.indexOf(t) : undefined),
        onSettings: () => { snd.tap(); settings(hud, [{ label: "Restart", fn: () => game.go("play", args, { fade: 0.2 }) }, { label: "Quit", fn: () => game.go("harbours", {}, { fade: 0.2 }) }]); },
        onPlace: (b, c, prev) => landing(b, c, prev),
        onSkip: () => { snd.tap(); coach?.skip(); },
        onDemolish: (c, b) => {
            const y = w.surface(c);
            w.puffAt(c.x, y, c.z, 12);
            w.vis.delete(b.id);
            w.dirtyTown = true;
            snd.sfx([{ wave: "noise", freq: 900, to: 200, decay: 0.2, volume: 0.15 }, { wave: "triangle", freq: 200, to: 90, decay: 0.15, volume: 0.15 }], "medium");
            s.shake(0.04, 0.12, { haptic: false });
        },
    });
    game.city = { sim, w, hud, s };
    if (index === 0 && !args.sandbox && !args.days && !p.taught) {
        coach = new Coach(hud, sim, w, game, snd, () => { store((q) => { q.taught = true; }); });
        game.city.coach = coach;
    }

    function landing(b, c, prev) {
        hud.pop(c.i, prev.stars ? `+${prev.stars}` : "", { icon: prev.stars ? "star" : null, big: 1.4, h: 1, color: "#ffe9a8" });
        s.wait(0.2, () => {
            const y = BUILDINGS[b.type].stilts && c.h === 0 ? STEP : topY(c);
            const wet = c.wet;
            w.puffAt(c.x, y, c.z, 10 + prev.stars * 3, wet ? { color: [0.85, 0.96, 1] } : {});
            snd.plonk(prev.stars);
            s.shake(0.022 + prev.stars * 0.006, 0.1, { haptic: false });
            if (prev.delta >= 5) s.freeze(0.05);
            prev.links.forEach((q, i) => {
                const n = sim.cells[q.cell];
                if (n.b) w.hop(n.b, 0.03 + i * 0.045, q.v > 0 ? 1 : 0.6);
                hud.pop(q.cell, `${q.v > 0 ? "+" : ""}${q.v}`, { h: 0.85, color: q.v > 0 ? "#b9f2c0" : "#ffb49e" });
            });
        });
    }

    function react(e) {
        const c = e.cell !== undefined ? sim.cells[e.cell] : null;
        const hall = sim.buildings[0].cell;
        const market = () => sim.buildings.find((b) => b.type === "market" && sim.working(b))?.cell ?? hall;
        switch (e.e) {
            case "tideline": w.dirtyWater = true; if (hud.sel) hud.refreshCandidates(); break;
            case "coin":
                hud.bump.coin = 1;
                snd.coin(e.n);
                hud.pop(e.cell, `+${e.n}`, { icon: "coin", color: "#ffe9a8" });
                if (e.good === "rent") w.send(e.cell, market(), { fast: true });
                break;
            case "catch": hud.bump.fish = 1; snd.catch(); hud.pop(e.cell, `+${e.n}`, { icon: "fish", h: 0.5 }); w.send(e.cell, market(), { crate: true }); break;
            case "wood": hud.bump.wood = 1; snd.chop(); hud.pop(e.cell, `+${e.n}`, { icon: "wood" }); w.send(e.cell, hall, { crate: true, color: "#7a4e2c" }); break;
            case "grain": hud.bump.grain = 1; snd.harvest(); hud.pop(e.cell, `+${e.n}`, { icon: "grain" }); w.send(e.cell, market(), { crate: true, color: "#f0b43c" }); break;
            case "drift": hud.bump.coin = 1; hud.bump.wood = 1; break;
            case "dawn": snd.gull(); break;
            case "trawler":
                snd.horn(); w.dirtyTown = true;
                hud.pop(e.cell, "Trawler!", { color: "#b9f2c0", h: 0.9 });
                w.send(e.from, e.cell, { crate: true, color: "#2f9c95" });
                break;
            case "season":
                hud.toast(`${sim.season} has come`, { big: true, color: ["#5aa862", "#e0a42e", "#c9673a", "#6d93b5"][e.season], sec: 2.6 });
                setSong();
                break;
            case "storm":
                snd.bell(); setSong();
                hud.toast(`Here comes ${e.storm.name}!`, { big: true, color: CORAL, sec: 3 });
                game.haptic("warn");
                if (hud.speed > 1) hud.speed = 1;
                break;
            case "stormEnd":
                setSong(); snd.calm();
                if (e.ride && sim.count("cottage")) hud.toast("Every cottage dry!", { color: "#39a96b" });
                hud.pop(hall, `+${e.drift}`, { icon: "wood", big: 1.4, color: "#ffe9a8" });
                hud.say(e.ride ? "Well held. The tide leaves driftwood for us." : "The sea's had its fun. Crews are mending what they can.", 5);
                break;
            case "flood":
                snd.splash();
                w.puffAt(c.x, w.water * STEP, c.z, 9, { color: [0.84, 0.95, 1], s1: 0.22 });
                if (e.type === "cottage" && sim.storm) game.haptic("warn");
                break;
            case "wreck":
                w.dirtyTown = true; snd.wreck();
                w.puffAt(c.x, topY(c), c.z, 18, { color: [0.72, 0.66, 0.58], s1: 0.36 });
                s.shake(0.09, 0.22, { haptic: false });
                hud.pop(e.cell, "Wrecked!", { color: "#ffb49e", big: 1.1 });
                break;
            case "breach":
                w.dirtyTown = true; w.dirtyWater = true; snd.wreck(); snd.splash();
                w.puffAt(c.x, topY(c) + 0.4, c.z, 26, { color: [0.8, 0.86, 0.9], s1: 0.4, v1: 2.6 });
                s.shake(0.16, 0.3, { haptic: false });
                s.freeze(0.08);
                hud.toast("The wall is breached!", { color: CORAL });
                break;
            case "repair": {
                w.dirtyTown = true; snd.hammer();
                const b = c.b;
                if (b) w.plonk(b, 0.7);
                w.puffAt(c.x, topY(c), c.z, 8);
                hud.pop(e.cell, "Mended", { color: "#b9f2c0" });
                break;
            }
            case "boatLost": hud.toast("A trawler lost at sea!", { color: CORAL }); snd.splash(); game.haptic("error"); break;
            case "clear": w.dirtyTown = true; break;
            case "demolish": w.dirtyWater = true; break;
            case "goal":
                hud.goalPulse[e.index] = 1; snd.goal();
                hud.toast("Goal done!", { color: "#39a96b" });
                s.flash("#ffffff33", 0.2);
                break;
            case "win": win(e.day); break;
            default:
        }
    }

    function setSong() {
        snd.play(sim.storm ? "storm" : sim.season.toLowerCase());
    }

    function win(day) {
        won = true;
        const stars = sim.grade();
        const prior = save();
        store((q) => { q.stars[scn.id] = Math.max(q.stars[scn.id] ?? 0, stars); q.best[scn.id] = Math.min(q.best[scn.id] ?? 999, day); });
        snd.win();
        festival = 7;
        s.wait(1.5, () => {
            const last = index === SCENARIOS.length - 1;
            const buttons = [];
            if (!last) buttons.push({ label: "Next", fn: () => game.go("play", { index: index + 1 }, { fade: 0.25 }) });
            buttons.push({ label: "Keep building", fn: () => { hud.modal = null; snd.tap(); } }, { label: "Harbours", fn: () => game.go("harbours", {}, { fade: 0.25 }) });
            const lines = [`Finished on day ${day}, par ${scn.par}`, sim.stats.wrecked ? `${sim.stats.wrecked} buildings wrecked` : "Nothing wrecked. Snug!"];
            if (sim.relaxed) lines[1] = "Relaxed mode: one star";
            if (last && !prior.stars[scn.id]) lines.push("The town stands. Free Build awaits.");
            hud.modal = { title: last ? "The town stands!" : `${scn.name}!`, stars, lines, height: 262, by: game.view.height / 2 + 86, buttons };
        });
    }

    dio.step = (dt, f) => {
        snd.tick(dt);
        snd.ambience(w.stormVis, w.water);
        hud.update(dt);
        if (coach && !coach.done) coach.update(dt);
        if (festival > 0) fireworks(dt);
        lightning(dt);
        if (hud.modal) return f;
        const held = coach && !coach.done;
        if (held && coach.hold) return f;
        let v = f + dt * (held ? 2.5 : hud.speed) / HOUR_SEC;
        while (v >= 1) {
            v -= 1;
            sim.tick();
            for (const e of sim.events) { react(e); if (coach && !coach.done) coach.event(e); }
            sim.events.length = 0;
        }
        return v;
    };

    function fireworks(dt) {
        festival -= dt;
        if (game.fxRng.next() < dt * 3.5) {
            const c = sim.cells[sim.buildings[game.fxRng.int(0, sim.buildings.length - 1)].cell];
            const hue = [[1, 0.8, 0.3], [1, 0.45, 0.4], [0.5, 0.9, 0.95], [0.75, 0.95, 0.55]][game.fxRng.int(0, 3)];
            w.puffAt(c.x, w.surface(c) + 1.5, c.z, 14, { color: hue, v0: 1, v1: 2.4, s0: 0.08, s1: 0.16 });
            game.sfx({ wave: "noise", freq: 1400, to: 300, decay: 0.16, volume: 0.05 });
        }
    }

    function lightning(dt) {
        if (sim.stormB < 0.55 || hud.modal) return;
        thunderT -= dt;
        if (thunderT <= 0) {
            thunderT = game.fxRng.range(2.5, 6);
            w.flash = 0.5;
            s.wait(game.fxRng.range(0.1, 0.5), () => { snd.thunder(0.7 + sim.stormB * 0.3); s.shake(0.05, 0.2, { haptic: false }); });
        }
    }

    s.on("leave", () => snd.quiet());
    setSong();
    if (index !== 0 && !args.sandbox) hud.say(INTRO[scn.id] ?? scn.tag, 7);
    if (args.sandbox) hud.say("All yours. Tap the cog to leave.", 4);
    s.onDrawUI((d) => hud.draw(d));
});

const INTRO = {
    bread: "Farms feed folk. Gales lift the sea, so keep cottages away from the shore.",
    spit: "Red line on the staff is the next storm. Find the gaps in the dunes and wall them.",
    dark: "Nothing grows in winter. Build uphill and stock the larder before the snow.",
    polder: "Wall the bay's mouth and the sand behind it dries out. Then you can farm it.",
    great: "The Great Tide comes on day 45. Sand walls won't hold it. Build high and strong.",
};

function fastForward(sim, days) {
    for (let t = 0; t < days * HOURS; t++) {
        sim.tick();
        sim.events.length = 0;
        if (sim.hour % 3 === 0) { let g = 8; while (g-- && act(sim)); }
    }
}

/** Used only by tools/bake-cards.mjs: one building on the card colour, to photograph for the tray. */
game.scene("thumb", (s, args) => {
    game.touch.enabled = false;
    s.background = CARD;
    const m = getModel(args.type, args.variant ?? 0), name = "thumb";
    const merged = new MB();
    if (!args.bare) {
        // Stand it on a little tile, like a game piece.
        const ground = args.type === "dock" || args.type === "yard" ? "#eadfc2" : "#c9d6b4", t = -0.12;
        const hexP = (r, y) => [0, 1, 2, 3, 4, 5].map((i) => [cornerX(i) * r, y, cornerZ(i) * r]);
        merged.poly(hexP(0.97, -0.002), args.type === "lane" ? "#e0d5bc" : ground, [0, -1, 0]);
        for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; merged.poly([[cornerX(i) * 0.97, -0.002, cornerZ(i) * 0.97], [cornerX(j) * 0.97, -0.002, cornerZ(j) * 0.97], [cornerX(j) * 0.97, t, cornerZ(j) * 0.97], [cornerX(i) * 0.97, t, cornerZ(i) * 0.97]], "#c4ad8c", [0, -0.05, 0]); }
    }
    merged.append(m.solid);
    merged.append(m.glow);
    merged.append(m.leaf);
    game.assets.free(name);
    game.assets.mesh(name, merged.data());
    s.add([mesh(name, {}), { pos: [0, 0, 0] }]);
    const box = args.size ?? 2.2, cam = s.cam3;
    cam.fov = 20;
    const ang = 0.72, D = box / Math.tan(10 * Math.PI / 180) * 0.68, h = args.h ?? 0.3;
    cam.set([Math.sin(ang) * D * 0.62, h + D * 0.62, Math.cos(ang) * D * 0.62], [0, h, 0]);
    // The same soft noon as the island, so cards look like the world and not a brighter copy of it.
    s.light.dir.set(-0.55, -1, -0.5);
    s.light.color = color([0.64, 0.61, 0.54]);
    s.light.sky = color([0.56, 0.6, 0.64]);
    s.light.ground = color([0.46, 0.43, 0.38]);
});

game.start("title");
if (typeof document !== "undefined") document.getElementById("loading")?.remove();
