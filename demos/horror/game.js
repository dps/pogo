// Night Shift at the Doll Factory. Scenes and flow; the rules are in sim.js and the look is in stage.js.
import { button, color, createGame, mesh, pin, pos, rot, scale, text } from "./pogo.js";
import { CELL, FILES, NIGHTS, WAKES } from "./data.js";
import { paintArt } from "./art.js";
import { buildDollMeshes, buildWorld } from "./world.js";
import { Sim } from "./sim.js";
import { Stage } from "./stage.js";
import { SONGS, Sound } from "./audio.js";
import { buildYard, flipScene, yardScene } from "./ending.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#000000",
    actions: { light: ["KeyF", "KeyQ", "pad:x"], use: ["KeyE", "Enter", "pad:a"], pause: ["KeyP", "pad:start"] },
    touch: { stick: true, look: true, buttons: [{ action: "light", label: "LIGHT" }, { action: "use", label: "USE" }] },
    seed: 13,
    maxDpr: 2,
});
paintArt(game);
buildDollMeshes(game);
buildWorld(game);
buildYard(game);

const SAVE = "nightshift-v1";
const blank = () => ({ reached: 0, wakes: 0, files: [], gentle: false, flipped: false, dawn: false, best: {}, muted: false, noHaptics: false });
const load = () => ({ ...blank(), ...(game.load(SAVE, null) ?? {}) });
function save(p) { game.save(SAVE, p); }
game.progress = load;
game.grant = (o) => save({ ...load(), ...o });

const snd = new Sound(game);
let song = null;
function play(name) {
    if (song === name) return;
    song = name;
    if (name) game.music(SONGS[name]); else game.stopMusic();
}
function applySettings(pr = load()) {
    game.audio.muted = !!pr.muted;
    game.haptics.enabled = !pr.noHaptics;
}
applySettings();

/** A framed option row, for settings on the title and the pause card. */
function toggleRow(s, label, get, set, y, anchor = "center") {
    const b = s.add([button(`${label}: ${get() ? "On" : "Off"}`, { width: 214, height: 44, color: "#10161a", textColor: "#d7e2dc", textSize: 14, radius: 8, onTap: () => { set(!get()); b.text = `${label}: ${get() ? "On" : "Off"}`; game.sfx({ wave: "square", freq: 1200, to: 700, decay: 0.03, volume: 0.05 }, { haptic: "tick" }); } }), pin(anchor, [0, y])]);
    return b;
}
const btn = (label, onTap, o = {}) => button(label, { width: o.width ?? 230, height: o.height ?? 54, color: o.color ?? "#7c2a26", textColor: o.textColor ?? "#f6ead0", textSize: o.size ?? 18, radius: 8, action: o.action, onTap });

// --- Title -----------------------------------------------------------------------------------------
game.scene("title", (s, args = {}) => {
    game.mouseLook = false;
    game.touch.enabled = false;
    const pr = load();
    applySettings(pr);
    const sim = new Sim({ night: 1, seed: 3 });
    sim.p.light = true;
    sim.p.x = 35.6; sim.p.z = 7; sim.p.battery = 100; sim.stare = 1;
    const stage = new Stage(game, s, sim, { noHud: true, snd, maskA: 0.8 });
    for (const d of stage.dolls) d.body.hidden = d.head.hidden = true;
    const hero = sim.dolls[0], hv = stage.dolls[0], tall = s.view.height > s.view.width;
    hv.body.hidden = hv.head.hidden = false;
    hero.x = 30.1; hero.z = 7.15; hero.y = 0; hero.awake = true; hero.frozen = true; hero.yaw = Math.PI / 2; hero.pose = 1; hero.lit = true;
    s.onUpdate((dt) => {
        const t = stage.t;
        // The beam wanders along the shelves, then always comes back to the one that's looking at you.
        sim.p.yaw = Math.PI / 2 + Math.sin(t * 0.21) * 0.03; sim.p.pitch = (tall ? -0.12 : -0.17) + Math.sin(t * 0.13) * 0.01;
        const drift = Math.max(0, Math.sin(t * 0.23 - 1)) ** 3;
        sim.p.aimYaw = sim.p.yaw + 0.02 + Math.sin(t * 0.61) * 0.03 + drift * 0.34 * Math.sin(t * 0.09);
        sim.p.aimPitch = sim.p.pitch - 0.02 + Math.sin(t * 0.47) * 0.02;
        hero.lit = true; hero.frozen = true;
        hero.yaw = Math.atan2(sim.p.x - hero.x, sim.p.z - hero.z);
        hv.hy = hero.yaw; hv.tilt = 0.02;
        sim.step = 99;       // No job on the clipboard here, so no marker in the picture.
        stage.update(dt);
    });
    const land = s.view.width > s.view.height, ty = land ? 18 : Math.max(s.view.safe.top + 30, 62);
    s.add([text("NIGHT SHIFT", { size: land ? 44 : 46, bold: true, color: "#efe3c4", font: "Georgia, 'Times New Roman', serif" }), pin("top", [0, ty])]);
    s.add([text("at the Doll Factory", { size: 20, color: "#d1a06a", font: "Georgia, 'Times New Roman', serif" }), pin("top", [0, ty + 52])]);

    if (args.hero) { hero.x = 33.1; hero.z = 7.02; return; }     // The launcher picture: the same shot, closer, with nothing to press.
    const next = Math.min(pr.reached, NIGHTS.length - 1);
    const label = pr.flipped && !pr.dawn ? "Night 5, again" : pr.reached === 0 ? "Clock in" : `Clock in: Night ${next + 1}`;
    const startY = land ? 60 : 150;
    s.add([btn(label, () => go(next, pr), { action: "confirm", height: land ? 46 : 54 }), pin("center", [0, land ? 76 : startY - 12])]);
    toggleRow(s, "Gentle mode", () => load().gentle, (on) => save({ ...load(), gentle: on }), land ? 14 : startY + 46, land ? "bottom" : "center");
    const warn = "A suspense game: dark spaces, sudden sounds, a little flicker. Gentle mode removes the jump scares.";
    s.add([text(warn, { size: land ? 12 : 12.5, color: "#c8bfae", maxWidth: land ? 142 : Math.min(330, s.view.width - 32), align: land ? "left" : "center", lineHeight: 1.35 }), land ? pin("left", [16, 20]) : pin("bottom", [0, 86])]);
    const small = (label, anchor, onTap) => s.add([button(label, { width: 104, height: 44, color: "#10161a", textColor: "#d7e2dc", textSize: 13, radius: 8, onTap }), pin(anchor, [14, 14])]);
    const flag = (on) => (on ? "On" : "Off");
    const snd1 = small(`Sound: ${flag(!pr.muted)}`, "bottom-left", () => {
        const p2 = load();
        save({ ...p2, muted: !p2.muted });
        applySettings();
        snd1.text = `Sound: ${flag(p2.muted)}`;
        if (!p2.muted) game.stopMusic(); else { song = null; play("title"); }
    });
    const hap = small(`Haptics: ${flag(!pr.noHaptics)}`, "bottom-right", () => {
        const p2 = load();
        save({ ...p2, noHaptics: !p2.noHaptics });
        applySettings();
        hap.text = `Haptics: ${flag(p2.noHaptics)}`;
        game.haptic("medium");
    });
    if (pr.reached > 0 || pr.files.length) s.add([button("Shifts", { width: 90, height: 44, color: "#10161a", textColor: "#d1a06a", textSize: 13, radius: 8, onTap: () => game.go("shifts", {}, { fade: 0.25 }) }), land ? pin("right", [16, 20]) : pin("bottom", [0, 14])]);
    play("title");
});

function go(night, pr = load()) {
    game.go("play", { night }, { fade: 0.5 });
    song = null;
    game.stopMusic();
}

// --- The rota: replay any night you've reached, and the staff records you've found -----------------
game.scene("shifts", (s) => {
    game.mouseLook = false;
    game.touch.enabled = false;
    s.background = "#0a0b0e";
    const pr = load(), land = s.view.width > s.view.height, gap = land ? 46 : 62, top = land ? -gap * 1.95 : -gap * 2.5;
    s.add([text("The Rota", { size: land ? 22 : 28, bold: true, color: "#efe3c4", font: "Georgia, serif" }), pin("top", [0, land ? 6 : 16])]);
    NIGHTS.forEach((n, i) => {
        const open = i <= pr.reached, best = pr.best[i], file = pr.files.includes(i) ? FILES[i] : null;
        const rec = i === 4 && pr.dawn ? "You got out." : file ? `${file.name}, ${file.line.slice(13, 17)}` : "Staff record not found";
        if (open) s.add([button(`${i + 1}  ${n.title}`, { width: 182, height: 44, color: "#10161a", textColor: "#efe3c4", textSize: 15, radius: 8, onTap: () => go(i) }), pin("center", [-74, top + i * gap])]);
        else s.add([text(`${i + 1}  Not on your rota yet`, { size: 13, color: "#566064" }), pin("center", [-74, top + i * gap])]);
        s.add([text(best === undefined ? "--" : `${Math.floor(best / 60)}m ${String(Math.floor(best % 60)).padStart(2, "0")}s`, { size: 13, bold: true, color: "#d1a06a" }), pin("center", [86, top + i * gap - 9])]);
        s.add([text(rec, { size: 11, color: file || (i === 4 && pr.dawn) ? "#d7e2dc" : "#7e878a", maxWidth: 136, align: "center" }), pin("center", [86, top + i * gap + 10])]);
    });
    s.add([button("Back", { width: 120, height: 44, color: "#7c2a26", textColor: "#f6ead0", textSize: 15, radius: 8, action: "confirm", onTap: () => game.go("title", {}, { fade: 0.25 }) }), pin("bottom", [0, 14])]);
});

// --- A shift -----------------------------------------------------------------------------------------
game.scene("play", (s, args) => {
    const night = args.night ?? 0, pr = load();
    applySettings(pr);
    game.mouseLook = true;
    game.touch.enabled = true;
    const sim = new Sim({ night, seed: (args.seed ?? 1) + pr.wakes * 3, gentle: pr.gentle, spectral: pr.flipped });
    game.sim = sim;
    game.data.status = "play";
    game.data.night = night;
    let ended = false, paused = false, yaw = sim.p.yaw, pitch = sim.p.pitch, card = 2.6, noteAt = night === 0 || (night === 4 && pr.flipped) ? 2.3 : -9;

    const stage = new Stage(game, s, sim, {
        snd,
        onEvent(e) {
            if (e.type === "caught") end("caught", e.d);
            if (e.type === "punch") end("done");
            if (e.type === "taken") end("taken");
            if (e.type === "file") { const p2 = load(); if (!p2.files.includes(e.i)) save({ ...p2, files: [...p2.files, e.i] }); }
            if (e.type === "hide") { if (e.on) { yaw = e.yaw; pitch = 0; } }
        },
    });
    game.stage = stage;
    game.look = (y, q) => { yaw = y; pitch = q; };
    stage.holdSubs = card + (noteAt > 0 ? 3.4 : 0);
    play("shift");

    function end(kind, doll) {
        if (ended) return;
        ended = true;
        game.mouseLook = false;
        game.touch.enabled = false;
        if (kind === "caught") stage.cine = caughtCine(stage, doll, sim.gentle, () => {
            const p2 = load(), w = p2.wakes;
            save({ ...p2, wakes: w + 1 });
            game.go("carpark", { night, wake: w }, { fade: 0.2 });
        });
        if (kind === "done") {
            const p2 = load(), best = p2.best[night], time = sim.t;
            const nextBest = { ...p2.best, [night]: best === undefined ? time : Math.min(best, time) };
            save({ ...p2, reached: Math.max(p2.reached, Math.min(night + 1, 4)), best: nextBest });
            if (night === 4) stage.cine = lastPunchCine(stage, () => game.go("flip", {}, { fade: 0.2 }));
            else s.wait(0.55, () => game.go("timecard", { night, time, battery: Math.round(sim.p.battery) }, { fade: 0.4 }));
        }
        if (kind === "taken") stage.cine = takenCine(stage, () => { const p2 = load(); save({ ...p2, dawn: true }); game.go("dawn", {}, { fade: 1.6 }); });
    }

    // Pause.
    const panel = [];
    function setPaused(on) {
        paused = on;
        s.paused = on;
        game.mouseLook = !on;
        game.touch.enabled = !on;
        for (const e of panel) e.destroy();
        panel.length = 0;
        if (!on) return;
        const P = (c) => { const e = s.add(c); panel.push(e); return e; };
        P([{ draw(d) { d.rect(s.view.width + 2, s.view.height + 2, { x: 0, y: 0, color: "#03040a", opacity: 0.86 }); } }, pin("center", [0, 0])]);
        P([text("BREAK", { size: 30, bold: true, color: "#efe3c4", font: "Georgia, serif" }), pin("center", [0, -142])]);
        P([btn("Back to work", () => setPaused(false), { action: "pause" }), pin("center", [0, -84])]);
        panel.push(toggleRow(s, "Sound", () => !load().muted, (v) => { save({ ...load(), muted: !v }); applySettings(); }, -24));
        panel.push(toggleRow(s, "Haptics", () => !load().noHaptics, (v) => { save({ ...load(), noHaptics: !v }); applySettings(); }, 28));
        panel.push(toggleRow(s, "Gentle mode", () => load().gentle, (v) => { save({ ...load(), gentle: v }); sim.gentle = v; }, 80));
        P([btn("Leave the shift", () => { game.go("title", {}, { fade: 0.3 }); song = null; game.stopMusic(); }, { color: "#10161a", textColor: "#d7e2dc", size: 15, height: 44, width: 214 }), pin("center", [0, 134])]);
    }
    s.add([button("II", { width: 44, height: 44, color: "#0a0d10", textColor: "#a4b4b8", textSize: 14, radius: 22, action: "pause", onTap: () => setPaused(!paused) }), pin("top-right", [12, 34])]);

    s.onUpdate((dt) => {
        const input = s.input, look = input.look;
        if (!ended) {
            yaw -= look.x * 0.0036;
            pitch = Math.max(-1.25, Math.min(1.25, pitch - look.y * 0.0034));
            const mv = input.move;
            const click = game.pointerLocked && input.pointer.pressed;
            sim.tick(dt, { mx: mv.x, my: mv.y, yaw, pitch, light: input.pressed("light") || click, use: input.pressed("use"), useDown: input.down("use") });
        } else sim.tick(dt, { mx: 0, my: 0, yaw, pitch, light: false, use: false, useDown: false });
        if (ended && sim.status === "done") sim.ev.length = 0;
        stage.update(dt);
        game.data.status = sim.status;
        game.data.step = sim.step;
        card -= dt;
        if (noteAt > 0) noteAt -= dt;
    });
    s.onDrawUI((d) => {
        const v = s.view;
        if (card > 0) {
            const a = Math.min(1, card / 0.6);
            d.rect(v.width + 2, v.height + 2, { x: v.width / 2, y: v.height / 2, color: "#000000", opacity: a * 0.82 });
            d.text(`Night ${night + 1}`, { x: v.width / 2, y: v.height * 0.43, size: 40, bold: true, color: "#efe3c4", font: "Georgia, serif", opacity: a });
            d.text(NIGHTS[night].title, { x: v.width / 2, y: v.height * 0.43 + 42, size: 18, color: "#d1a06a", font: "Georgia, serif", opacity: a });
            d.text(NIGHTS[night].rule, { x: v.width / 2, y: v.height * 0.43 + 86, size: 15, color: "#d7e2dc", maxWidth: Math.min(320, v.width - 32), align: "center", opacity: a });
        }
        if (noteAt > -3.8 && noteAt <= 0) {
            noteAt -= 1 / 60;
            const q = -noteAt, a = Math.min(q * 3, (3.8 - q) * 2.5, 1), w = Math.min(230, v.width * 0.6), y = v.height * (v.height > v.width ? 0.3 : 0.32);
            d.text("In your coat pocket:", { x: v.width / 2, y: y - w * 0.44, size: 13, color: "#c8bfae", opacity: a });
            d.sprite("note", { x: v.width / 2, y, width: w, height: w * 0.733, opacity: a, rot: -0.04 });
        }
        const on = !sim.p.light && night === 0 && sim.step === 0 && card < 0.4;
        const touch = game.input.touchMode;
        if (on) d.text(touch ? "Press LIGHT" : "Press F, or click", { x: v.width / 2, y: v.height * 0.56, size: 17, bold: true, color: "#ffd27a", opacity: 0.7 + Math.sin(stage.t * 4) * 0.3 });
        if (night === 0 && sim.step >= 1 && sim.step <= 2 && sim.t < 40) d.text(touch ? "Left thumb walks. Drag anywhere to look." : "WASD to walk, mouse to look, E to use", { x: v.width / 2, y: v.height * 0.76, size: 13, color: "#c8bfae", opacity: 0.75 });
    });
    game.touch.set({ stick: true, look: true, buttons: [{ action: "light", label: "LIGHT" }, { action: "use", label: "USE" }] });
    s.on("leave", () => { game.mouseLook = false; });
});

function caughtCine(stage, doll, gentle, done) {
    const { s, game, snd } = stage, p = stage.sim.p;
    let t = 0;
    const v = stage.dolls[doll.i];
    if (gentle) {
        snd.play("hand", { haptic: "light" });
        stage.say("A small hand takes yours.", 2);
        return {
            update(dt) {
                t += dt;
                if (t > 2.1 && !this.gone) { this.gone = true; done(); }
            },
        };
    }
    // It's just there. Very close, and quite still, and the light steadies on its face.
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), eye = p.y + 1.55;
    return {
        update(dt) {
            if (t === 0) { snd.play("sting", { haptic: "error" }); s.shake(0.05, 0.5, { haptic: false }); s.flash("#ffffff", 0.08); p.light = true; p.battery = Math.max(p.battery, 30); stage.beam = 1; }
            t += dt;
            doll.x = p.x + fx * 0.8; doll.z = p.z + fz * 0.8; doll.frozen = true; doll.lit = true; doll.pose = 2;
            const face = Math.atan2(-fx, -fz) + Math.sin(t * 60) * 0.008;
            doll.yaw = face; v.hy = face; v.tilt = 0;
            v.body.pos.set(doll.x, eye - 1.28, doll.z);
            v.body.rot.y = face; v.body.rot.z = 0;
            v.head.pos.set(doll.x, eye - 0.24, doll.z);
            v.head.rot.y = face; v.head.rot.x = 0; v.head.rot.z = 0.18;
            if (t > 0.95 && !this.gone) { this.gone = true; done(); }
        },
    };
}

function lastPunchCine(stage, done) {
    const { snd, sim } = stage, p = sim.p, from = p.yaw, to = Math.PI;
    let t = 0;
    // The window behind you is full. They have been standing there for some time.
    sim.dolls.forEach((d, i) => {
        d.x = 43.5 + i * 1.1; d.z = 13 - (i % 2) * 0.5; d.y = 0; d.awake = true; d.frozen = true; d.lit = false; d.yaw = 0; d.pose = 1 + (i % 2);
        stage.dolls[i].hy = 0; stage.dolls[i].tilt = 0;
    });
    stage.say("Thank you, Unit 31.", 2.6);
    return {
        camera(c) {
            const k = Math.min(1, Math.max(0, (t - 0.9) / 1.1)), e = k * k * (3 - 2 * k), d = ((to - from + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
            return { ...c, yaw: from + d * e, pitch: c.pitch * (1 - e) };
        },
        update(dt) {
            t += dt;
            if (t > 1 && !this.a) { this.a = true; snd.play("thud", { haptic: "heavy" }); }
            if (t > 4.4 && !this.gone) { this.gone = true; done(); }
        },
    };
}

function takenCine(stage, done) {
    const { sim, snd } = stage;
    let t = 0;
    stage.say("They are very gentle.", 3.2);
    return {
        camera(c) { return { ...c, ey: c.ey - Math.min(1, t / 6) * 0.5, pitch: c.pitch - Math.min(0.3, t / 12) }; },
        update(dt) {
            t += dt;
            if (t > 3.6 && !this.a) { this.a = true; stage.say("One of them takes your hand. Then another.", 3.4); }
            if (t > 8.2 && !this.gone) { this.gone = true; done(); }
        },
    };
}

// --- The time card, between shifts -----------------------------------------------------------------
game.scene("timecard", (s, a) => {
    const { night, time, battery } = a, pr = load();
    game.mouseLook = false;
    game.touch.enabled = false;
    s.background = "#0a0b0e";
    let t = 0;
    const w = Math.min(310, s.view.width - 40), h = 320, cy = s.view.height / 2 - 34;
    const lines = [`Shift ${night + 1}:  ${NIGHTS[night].title}`, `Time on the floor:  ${Math.floor(time / 60)}m ${String(Math.floor(time % 60)).padStart(2, "0")}s`, `Torch left:  ${battery}%`, `Staff records:  ${pr.files.length} of ${FILES.length}`];
    const remark = ["Punched out on time.", "Stock levels: one fewer on Shelf B.", "Stock levels: two more than yesterday.", "Stock levels: do not count them again.", ""][night];
    s.onUpdate((dt) => {
        t += dt;
        if (t > 0.5 && !s.stamped) { s.stamped = true; game.sfx([{ wave: "noise", freq: 1800, decay: 0.05, volume: 0.32 }, { wave: "square", freq: 200, to: 60, decay: 0.09, volume: 0.24 }], { haptic: "heavy" }); s.shake(0.03, 0.2, { haptic: false }); }
    });
    s.onDrawUI((d) => {
        const v = s.view, cx = v.width / 2;
        const y = cy + Math.max(0, 1 - t * 3) * -40;
        d.rect(w + 8, h + 8, { x: cx, y: y + 5, color: "#000000", opacity: 0.5 });
        d.rect(w, h, { x: cx, y, color: "#d6c9a6" });
        d.rect(w, 44, { x: cx, y: y - h / 2 + 22, color: "#7c2a26" });
        d.text("HOLLIS & WREN  ·  TIME CARD", { x: cx, y: y - h / 2 + 22, size: 13.5, bold: true, color: "#efe3c4" });
        lines.forEach((l, i) => d.text(l, { x: cx, y: y - h / 2 + 76 + i * 28, size: 15, color: "#2a2320", bold: i === 0 }));
        d.text(remark, { x: cx, y: y + 62, size: 14, color: "#7c2a26", font: "Georgia, serif" });
        if (t > 0.5) {
            const k = Math.max(1, 1.5 - (t - 0.5) * 6);
            d.push(); d.translate(cx + 66, y + 112); d.rotate(-0.16); d.scale(k, k);
            d.rect(140, 44, { color: "#a2312c", outline: 3, radius: 6 });
            d.rect(136, 40, { color: "#a2312c", opacity: 0.1, radius: 5 });
            d.text("PUNCHED OUT", { size: 15, bold: true, color: "#a2312c" });
            d.pop();
        }
    });
    s.add([btn(night < 4 ? `Clock in: Night ${night + 2}` : "Clock in", () => go(night + 1), { action: "confirm" }), pin("bottom", [0, 42])]);
    s.add([button("Rest for now", { width: 150, height: 40, color: "#10161a", textColor: "#a4b4b8", textSize: 13, radius: 8, onTap: () => { game.go("title", {}, { fade: 0.3 }); } }), pin("top", [0, 16 + s.view.safe.top])]);
});

yardScene(game, { load, save, go, btn, play });
flipScene(game, { load, save, go, btn, play, snd });

game.debugGo = go;
game.start("title");
globalThis.document?.getElementById("load")?.remove();
