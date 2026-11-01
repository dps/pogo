// TUMBLE KEEP. Pull back the catapult, fling a boulder, watch the castle come down.
import { button, createGame, pin, rect, tap, text, ui } from "./pogo.js";
import { AMMO, Sim, aimToVelocity } from "./sim.js";
import { LEVELS, WORLDS, showcase } from "./levels.js";
import { THEMES, paintAll, paintBoss, paintWorld } from "./art.js";
import { FONT, Stage, WU, digits, popText } from "./stage.js";
import { Sound, makeSongs } from "./audio.js";
import { STAR_PAR } from "./par.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#5fb4e0", "#fbe8bd"],
    touch: { stick: false, buttons: [] },
    actions: { ammo: ["Tab", "KeyQ", "pad:x"], retry: ["KeyR", "pad:y"], peek: ["KeyE", "pad:select"] },
    seed: 1, maxDpr: 2,
});
paintAll(game.assets);
const SONGS = makeSongs();
const SAVE = "tumblekeep1";
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const INK = "#26181c", CREAM = "#fff3d6", PULL = 112;
const AMMO_FRAME = { rock: 0, split: 1, bomb: 2, iron: 3, ball: 4 };

const defaults = () => ({ stars: [], best: [], muted: false, haptics: true, tutorial: 0, sandbox: false, seen: {} });
let save = { ...defaults(), ...game.load(SAVE, {}) };
const persist = () => game.save(SAVE, save);
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;

const song = (name) => { if (game.data.song !== name) { game.data.song = name; game.music(SONGS[name]); } };
const click = new Sound(game);

function nextLevel() { for (let i = 0; i < LEVELS.length; i++) if (!save.stars[i]) return i; return LEVELS.length - 1; }
function unlocked(i) { return i === 0 || !!save.stars[i - 1] || !!save.stars[i]; }
const starTotal = () => save.stars.reduce((a, b) => a + (b ?? 0), 0);

/** A chunky inked button in the game's own style. */
function chunky(label, o = {}) {
    const base = button(label, o), fill = o.color ?? "#f2663f", ink = o.textColor ?? "#fff6e0", size = o.textSize ?? 18;
    return {
        ...base,
        draw(d, e) {
            const w = e.size.x, h = e.size.y, r = o.radius ?? 16, press = e._pressed ? 3 : 0;
            d.rect(w + 6, h + 9, { y: 3, color: INK, radius: r + 3 });
            d.rect(w, h, { y: press, color: fill, radius: r });
            d.rect(w - 10, h * 0.4, { y: press - h * 0.2, color: "#ffffff", opacity: 0.18, radius: r - 5 });
            d.text(label, { y: press + 2, size, bold: true, font: FONT, color: "#00000055" });
            d.text(label, { y: press, size, bold: true, font: FONT, color: ink });
        },
    };
}

function settingsRow(s, anchor, off) {
    const icon = (getter, flip, draw) => s.add([pin(anchor, off()), rect(50, 50, { color: "#00000000" }), tap(() => { flip(); persist(); click.click(); }), {
        draw(d) {
            d.rect(42, 42, { color: INK, radius: 12 }); d.rect(36, 36, { color: getter() ? "#3f8f7c" : "#6e6370", radius: 10 });
            draw(d, getter());
        },
    }]);
    icon(() => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; }, (d, on) => {
        d.poly([[-10, -4], [-5, -4], [2, -10], [2, 10], [-5, 4], [-10, 4]], { color: CREAM });
        if (on) { d.line([6, -5], [9, -8], { width: 2.4, color: CREAM }); d.line([7, 0], [12, 0], { width: 2.4, color: CREAM }); d.line([6, 5], [9, 8], { width: 2.4, color: CREAM }); }
        else { d.line([6, -5], [13, 5], { width: 2.6, color: "#ffb0a0" }); d.line([13, -5], [6, 5], { width: 2.6, color: "#ffb0a0" }); }
    });
    icon(() => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); }, (d, on) => {
        d.rect(13, 23, { color: CREAM, radius: 3 }); d.rect(8, 15, { y: -1, color: on ? "#3f8f7c" : "#6e6370", radius: 1 });
        for (const sg of [-1, 1]) { d.line([sg * 10, -6], [sg * 13, -2], { width: 2.2, color: on ? CREAM : "#a39aa6" }); d.line([sg * 13, -2], [sg * 10, 2], { width: 2.2, color: on ? CREAM : "#a39aa6" }); d.line([sg * 10, 2], [sg * 13, 6], { width: 2.2, color: on ? CREAM : "#a39aa6" }); }
        if (!on) d.line([-15, -13], [15, 13], { width: 2.6, color: "#ffb0a0" });
    });
}

// --- Title ------------------------------------------------------------------------------------------------
game.scene("title", (s) => {
    game.touch.enabled = false;
    const sim = new Sim(showcase(), { seed: 3 });
    const stage = new Stage(game, s, sim, { theme: "meadow", quiet: true });
    stage.cam.mode = "peek"; stage.ammo = "rock";
    const land0 = game.view.width > game.view.height;
    stage.bottomMargin = land0 ? 64 : game.view.height * 0.3;
    stage.hideCatapult = land0;
    const titleView = () => { const k = stage.castle; return land0 ? stage.framing(k.x0 - 23, k.x1 + 1, k.top - 1) : stage.framing(k.x0 - 1.5, k.x1 + 1.5, k.top - 1.4); };
    stage.cut(titleView());
    let t = 0, volley = 2.4, rebuilt = 0, n = 0;
    const logo = "TUMBLE".split("").map((ch, i) => ({ ch, i, row: 0, n: 6, drop: 0.1 + i * 0.07 })).concat("KEEP".split("").map((ch, i) => ({ ch, i, row: 1, n: 4, drop: 0.55 + i * 0.07 })));
    const go = () => { game.go("play", { level: nextLevel() }, { fade: 0.2 }); };
    s.onUpdate((dt) => {
        stage.step(dt); t += dt;
        volley -= dt;
        if (volley <= 0 && sim.state === "aim") {
            const shots = [[23, -6.5], [24, -5], [24, -8]];
            const [vx, vy] = shots[n++ % 3];
            sim.fire("rock", vx, vy); volley = 4.5; rebuilt++;
        }
        if (rebuilt >= 3 && sim.state === "aim") { game.go("title", {}, { fade: 0.4 }); }
        sim.events.length = 0;
    });
    s.add([ui(), { update(dt) { stage.direct(dt); stage.cam.mode = "title"; const g = titleView(); stage.cam.x = g.x; stage.cam.y = g.y; stage.cam.z = g.z; s.cam.zoom = g.z; s.cam.pos = [g.x, g.y]; } }]);
    s.onDraw((d) => stage.draw(d));
    s.onDrawUI((d) => {
        const v = game.view, land = v.width > v.height, tile = land ? 50 : Math.min(52, (v.width - 32) / 6.3), top = v.safe.top + (land ? 52 : 84);
        const cx = land ? v.width * 0.3 : v.width / 2;
        for (const L of logo) {
            const size = L.row ? tile * 1.14 : tile, gap = size * 1.05;
            const x = cx + (L.i - (L.n - 1) / 2) * gap + (L.row ? tile * 0.1 : 0), goal = top + L.row * tile * 1.22;
            const k = clamp((t - L.drop) / 0.5), fall = 1 - k, bounce = k < 1 ? Math.abs(Math.cos(k * 7.8)) * (1 - k) * 22 : 0;
            const y = goal - fall * fall * 300 - bounce, rot = Math.sin(L.i * 2.3 + L.row * 1.7) * 0.075 + Math.sin(t * 1.6 + L.i) * 0.018;
            d.reset(); d.translate(x, y); d.rotate(rot);
            d.sprite("b11", { width: size * 1.14, height: size * 1.14, frame: L.row ? 3 : 0, color: L.row ? "#ffe6d0" : "#ffffff", y: 2 });
            d.text(L.ch, { y: 2, x: 1, size: size * 0.72, bold: true, font: FONT, color: "#00000066" });
            d.text(L.ch, { size: size * 0.72, y: -1, bold: true, font: FONT, color: L.row ? "#f2663f" : "#fff6e0" });
        }
        d.reset();
    });
    const sw = () => game.view.width > game.view.height;
    const bx = () => (sw() ? -game.view.width * 0.2 : 0);
    s.add([pin("bottom", [bx(), sw() ? 72 : 96]), chunky("PLAY", { width: 190, height: 62, textSize: 26, action: "confirm", onTap: () => { click.unlock(); song("menu"); go(); } })]);
    s.add([pin("bottom", [bx() - (sw() ? 74 : 80), sw() ? 14 : 26]), chunky("Castles", { width: sw() ? 136 : 146, height: 52, color: "#3f8f7c", onTap: () => { song("menu"); click.click(); game.go("map", { world: Math.floor(nextLevel() / 5) }, { fade: 0.2 }); } })]);
    s.add([pin("bottom", [bx() + (sw() ? 74 : 80), sw() ? 14 : 26]), chunky("Sandbox", { width: sw() ? 136 : 146, height: 52, color: save.sandbox ? "#c98a2e" : "#6e6370", onTap: () => {
        if (save.sandbox) { song("sandbox"); click.click(); game.go("play", { sandbox: true }, { fade: 0.2 }); }
        else { game.haptic("warn"); toast = 2.4; }
    } })]);
    let toast = 0;
    s.add([ui(), { update(dt) { toast -= dt; }, draw() {} }]);
    s.onDrawUI((d) => {
        const v = game.view;
        if (toast > 0) {
            d.reset();
            d.rect(280, 34, { x: v.width / 2, y: v.height - 150, color: INK, radius: 12, opacity: 0.9 });
            d.text("Beat the Baron's Keep to unlock", { x: v.width / 2, y: v.height - 150, size: 14, bold: true, font: FONT, color: CREAM });
        }
    });
    settingsRow(s, "top-right", ((i) => () => [8 + 52 * i++, 8])(0));
});

// --- Castle map -------------------------------------------------------------------------------------------
game.scene("map", (s, args) => {
    game.touch.enabled = false;
    let page = args.world ?? 0;
    const W = () => WORLDS[page], T = () => THEMES[W().theme];
    paintWorld(game.assets, W().theme);
    s.background = T().sky;
    let t = 0, slide = 0;
    const open = (i) => { if (!unlocked(i)) { game.haptic("warn"); return; } click.click(); game.go("play", { level: i }, { fade: 0.2 }); };
    const nodes = [];
    for (let i = 0; i < 5; i++) {
        const k = i;
        const e = s.add([ui(), rect(62, 62, { color: "#00000000" }), tap(() => open(page * 5 + k)), {
            draw(d) {
                const idx = page * 5 + k, ok = unlocked(idx), lv = LEVELS[idx], st = save.stars[idx] ?? 0, boss = lv.bossLevel, r = boss ? 34 : 27;
                const pop = ok && !st ? 1 + Math.sin(t * 5) * 0.06 : 1;
                d.scale(pop, pop);
                d.circle(r + 4, { color: INK, y: 3 });
                d.circle(r, { color: ok ? (boss ? "#c23a3c" : st ? "#3f8f7c" : "#f2663f") : "#6e6370" });
                d.circle(r - 6, { color: "#ffffff", opacity: 0.14, y: -3 });
                if (ok && boss) d.sprite(paintBoss(game.assets, page), { y: -2, width: 62, height: 62 });
                else if (ok) d.text(String(k + 1), { y: -1, size: 24, bold: true, font: FONT, color: CREAM });
                else d.sprite("lock", { width: 30, height: 30 });
                for (let n = 0; n < 3; n++) d.sprite("star", { x: (n - 1) * 19, y: r + 12 - Math.abs(n - 1) * -3, width: 21, height: 21, frame: st > n ? 1 : 0 });
            },
        }]);
        nodes.push(e);
    }
    const place = () => {
        const v = game.view, land = v.width > v.height;
        nodes.forEach((e, i) => {
            if (land) { e.pos.x = v.width * (0.13 + i * 0.185); e.pos.y = v.height * 0.56 + (i % 2 ? 26 : -26); }
            else { e.pos.x = v.width * (i % 2 ? 0.68 : 0.32); e.pos.y = v.height * 0.27 + i * 0.128 * v.height; }
        });
    };
    place(); s.on("resize", place);
    s.onUpdate((dt) => {
        t += dt; slide *= 0.82;
        const sw = s.input.swipe;
        if (sw === "left" || s.input.pressed("right")) flip(1);
        if (sw === "right" || s.input.pressed("left")) flip(-1);
    });
    const flip = (dir) => {
        const n = clamp(page + dir, 0, WORLDS.length - 1);
        if (n === page) return;
        page = n; slide = dir * 60; click.click(); paintWorld(game.assets, W().theme); s.background = T().sky;
    };
    s.onDraw((d) => {
        const v = game.view, tag = W().theme, by = v.height;
        d.reset();
        d.sprite(`far_${tag}`, { x: v.width / 2, y: by - 120, width: 1024, height: 280 });
        d.sprite(`near_${tag}`, { x: v.width / 2 + 90, y: by - 70, width: 1024, height: 190 });
        d.sprite(`ground_${tag}`, { x: v.width / 2, y: by - 20, width: 1024, height: 90 });
        for (let i = 0; i + 1 < nodes.length; i++) {
            const a = nodes[i].pos, b = nodes[i + 1].pos, n = 7, done = save.stars[page * 5 + i];
            for (let k = 1; k < n; k++) d.circle(4, { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n, color: done ? CREAM : INK, opacity: 0.75 });
        }
    });
    s.onDrawUI((d) => {
        const v = game.view, land = v.width > v.height;
        d.reset();
        const y0 = v.safe.top + (land ? 34 : 62);
        const name = W().name;
        d.text(name, { x: v.width / 2 + 2, y: y0 + 2, size: land ? 26 : 28, bold: true, font: FONT, color: INK });
        d.text(name, { x: v.width / 2, y: y0, size: land ? 26 : 28, bold: true, font: FONT, color: CREAM });
        d.text(W().blurb, { x: v.width / 2, y: y0 + 26, size: 14, bold: true, font: FONT, color: "#fff3d6" });
        d.text(`Topple the boss for: ${W().reward}`, { x: v.width / 2, y: y0 + 44, size: 12, bold: true, font: FONT, color: "#ffe27a" });
        d.sprite("star", { x: 24 + v.safe.left + 60, y: v.safe.top + 22, width: 26, height: 26, frame: 1 });
        d.text(`${starTotal()}/${LEVELS.length * 3}`, { x: 124 + v.safe.left, y: v.safe.top + 23, size: 16, bold: true, font: FONT, color: CREAM });
        for (let i = 0; i < WORLDS.length; i++) d.circle(i === page ? 6 : 4, { x: v.width / 2 + (i - 2) * 18, y: v.height - v.safe.bottom - 72, color: i === page ? CREAM : INK, opacity: i === page ? 1 : 0.6 });
    });
    s.add([pin("top-left", [8, 8]), chunky("<", { width: 50, height: 50, textSize: 22, color: "#3f8f7c", action: "pause", onTap: () => { click.click(); game.go("title", {}, { fade: 0.2 }); } })]);
    s.add([pin("bottom-left", [14, 18]), chunky("<", { width: 64, height: 46, textSize: 22, color: "#3f8f7c", onTap: () => flip(-1) })]);
    s.add([pin("bottom-right", [14, 18]), chunky(">", { width: 64, height: 46, textSize: 22, color: "#3f8f7c", onTap: () => flip(1) })]);
    s.add([pin("bottom", [0, 18]), chunky("Sandbox", { width: 130, height: 46, textSize: 16, color: save.sandbox ? "#c98a2e" : "#6e6370", onTap: () => { if (save.sandbox) { song("sandbox"); game.go("play", { sandbox: true }, { fade: 0.2 }); } else game.haptic("warn"); } })]);
    song("menu");
});

// --- Play ---------------------------------------------------------------------------------------------------
const TIPS = ["Hit the supports, not the roof.", "Stone falls hard. Let it do the squashing.", "Full power flies flat and hits hardest.", "Low shots start the best collapses.", "Save the special shots for what's left."];
const PAL = [["wood", "c"], ["wood", "l"], ["stone", "c"], ["stone", "h"], ["glass", "h"], ["tnt", "c"], ["squire", ""], ["roof", "r"]];

game.scene("play", (s, args) => {
    game.touch.enabled = false;
    const sandbox = !!args.sandbox;
    const level = sandbox ? showcase() : LEVELS[args.level ?? 0];
    const world = sandbox ? WORLDS[0] : WORLDS[level.world];
    const sim = new Sim(level, { seed: 11 + (args.level ?? 0), mode: sandbox ? "sandbox" : "campaign" });
    const hud = {};
    const JEERS = ["Missed me!", "Is that all?", "Ha ha!", "Nyah!", "Pathetic!", "My gourd!", "Tickles!", "Do it again!", "Yikes!", "Eep!"];
    let lastState = "aim", jeer = 0;
    const stage = new Stage(game, s, sim, { theme: world.theme, hud });
    game.tumble = { sim, stage, level };
    game.data.level = args.level ?? -1;
    song(sandbox ? "sandbox" : level.boss ? "boss" : world.theme);
    const order = sandbox ? ["rock", "split", "bomb", "iron", "ball"] : Object.keys(AMMO).filter((k) => sim.rack[k]);
    stage.ammo = order[0];

    // Intro: a look at the castle, then back to the sling. Any touch skips it.
    const k = stage.castle;
    let intro = sandbox ? 0 : level.boss ? 2.6 : 1.5;
    stage.cut(stage.framing(k.x0 - 1.5, k.x1 + 1.5, k.top - 1.6));
    stage.cam.mode = intro ? "peek" : "wide";
    if (!intro) stage.cut(stage.wide());

    let drag = null, lastNotch = 0, peek = false, ended = false, panel = null, buildMode = sandbox, pal = 0;
    let scoreShown = 0, scorePop = 0, comboPop = 0, bannerT = 0, bannerText = "", bannerColor = "#fff", t = 0, hint = 0, kAngle = -0.75, kPower = 0.8, kAim = false;
    const firstShot = !sandbox && level.index === 0 && !save.tutorial;
    const par = STAR_PAR[level.index ?? 0] ?? Math.max(4000, sim.total * 2);
    if (level.unlock && !save.seen[level.unlock]) { save.seen[level.unlock] = true; persist(); stage.ammo = level.unlock; bannerText = `NEW: ${AMMO[level.unlock].label}!`; bannerT = 3.2; bannerColor = "#ffe27a"; s.wait(0.4, () => stage.sound.unlock()); }
    else if (level.boss) { bannerText = level.boss; bannerT = 2.6; bannerColor = "#ffb0a0"; s.wait(0.2, () => stage.sound.bell()); }
    else if (!sandbox) { bannerText = level.name; bannerT = 1.5; bannerColor = CREAM; }

    hud.bump = () => { scorePop = 1; };
    hud.combo = () => { comboPop = 1; };
    hud.banner = (txt, col) => { bannerText = txt; bannerT = 1.8; bannerColor = col ?? CREAM; };
    hud.end = (type) => { if (!ended) { ended = true; s.wait(0.5, () => endPanel(type)); } };

    const setAim = (px, py) => {
        const len = Math.hypot(px, py), n = len > 1 ? 1 / len : 1;
        stage.aimX = px * n; stage.aimY = py * n; stage.tension = Math.min(1, len);
        const [vx, vy] = aimToVelocity(px, py);
        sim.predict(vx, vy, 240, stage.preview);
        // A tick for every notch of tension, climbing in pitch and weight.
        const notch = Math.floor(stage.tension * 10);
        if (notch !== lastNotch) {
            if (notch > lastNotch) { stage.sound.tension(stage.tension); game.haptic(notch >= 10 ? "medium" : notch >= 7 ? 9 : notch >= 4 ? "tick" : 4); }
            lastNotch = notch;
        }
    };
    const shoot = () => {
        const [vx, vy] = aimToVelocity(stage.aimX * stage.tension, stage.aimY * stage.tension);
        stage.aiming = false; peek = false;
        if (!sim.fire(stage.ammo, vx, vy)) return;
        if (firstShot) { save.tutorial = 1; persist(); }
        if (!sim.rack[stage.ammo] && !sandbox) { const n = order.find((a) => sim.rack[a]); if (n) stage.ammo = n; }
        if (AMMO[stage.ammo].hint && !sandbox) hint = 2.5;
    };
    const ready = () => sim.state === "aim" && intro <= 0 && !ended && !panel && !s.paused;
    Object.assign(game.tumble, { ready, pull: PULL, order, setAmmo: (a) => pick(a), panel: () => panel });

    s.onUpdate((dt) => {
        const input = s.input, p = input.pointer;
        t += dt;
        hint = Math.max(0, hint - dt);
        if (intro > 0) {
            intro -= dt;
            if (p.pressed || input.pressed("confirm") || input.pressed("fire")) intro = 0;
            if (intro <= 0) stage.cam.mode = "wide";
        }
        if (input.pressed("retry") && !panel) game.go("play", args, { fade: 0.15 });
        if (input.pressed("ammo") && ready() && !sandbox) { const i = order.indexOf(stage.ammo); for (let j = 1; j <= order.length; j++) { const a = order[(i + j) % order.length]; if (sim.rack[a]) { pick(a); break; } } }
        if (input.down("peek") && ready()) stage.cam.mode = "peek"; else if (stage.cam.mode === "peek" && !peek && intro <= 0) stage.cam.mode = "wide";

        if (sandbox && buildMode) {
            stage.aiming = false;
            if (p.pressed && p.y < game.view.height - 96 - game.view.safe.bottom) {
                const w = s.cam.toWorld([p.x, p.y]), x = Math.round(w.x / WU * 2) / 2, y = Math.min(-0.6, w.y / WU);
                const [m, sh] = PAL[pal];
                const made = sim.place(m === "squire" ? "squire" : sh, m, x, y);
                if (made) { game.haptic("light"); stage.dust(x, y, 2, 0.2); stage.sound.thud(m === "tnt" ? "wood" : m, 8); }
            }
        } else if (ready() || (sandbox && !buildMode && sim.state !== "flight")) {
            if (p.pressed) { drag = { x: p.x, y: p.y }; lastNotch = 0; stage.aiming = false; }
            if (drag && p.down) {
                const px = (p.x - drag.x) / PULL, py = (p.y - drag.y) / PULL;
                if (Math.hypot(px, py) > 0.06) stage.aiming = true;
                if (stage.aiming) { setAim(Math.min(px, 0.12), py); kAim = false; }
            }
            if (drag && !p.down) {
                drag = null;
                if (stage.aiming && stage.tension > 0.16 && stage.aimX < 0) shoot();
                else { if (stage.aiming) game.haptic("tick"); stage.aiming = false; }
            }
            // Keyboard and pad aim.
            const turn = (input.down("up") ? -1 : 0) + (input.down("down") ? 1 : 0), push = (input.down("right") ? 1 : 0) + (input.down("left") ? -1 : 0);
            if (turn || push) { kAim = true; kAngle = clamp(kAngle + turn * dt * 0.7, -1.45, 0.25); kPower = clamp(kPower + push * dt * 0.5, 0.2, 1); }
            if (kAim) { stage.aiming = true; setAim(-Math.cos(kAngle) * kPower, -Math.sin(kAngle) * kPower); }
            if (input.pressed("fire") || input.pressed("jump")) { if (!kAim) { kAim = true; setAim(-Math.cos(kAngle) * kPower, -Math.sin(kAngle) * kPower); stage.aiming = true; } else { kAim = false; shoot(); } }
        } else {
            drag = null;
            if (sim.state === "flight" && (p.pressed || input.pressed("fire") || input.pressed("jump"))) sim.special();
        }
        stage.step(dt);
        if (sim.state === "aim" && lastState !== "aim" && sim.defenders.length && !sandbox) {
            const q = sim.defenders[jeer % sim.defenders.length], b = q.b;
            stage.float(JEERS[jeer++ % JEERS.length], b.x, b.y - b.r - 0.9, { size: 13, color: "#ffe9c4", life: 1.7, vy: -0.3 });
        }
        lastState = sim.state;
    });
    s.add([ui(), {
        update(dt) {
            stage.direct(dt);
            scoreShown += (sim.score - scoreShown) * Math.min(1, dt * 12);
            scorePop = Math.max(0, scorePop - dt * 6); comboPop = Math.max(0, comboPop - dt * 3); bannerT -= dt;
        },
    }]);
    s.onDraw((d) => stage.draw(d));
    // Slow motion gets cinema bars, under the HUD.
    s.add([ui(), { layer: -5, draw(d) {
        if (stage.slowT <= 0) return;
        const v = game.view, k = clamp(Math.min(stage.slowDur - stage.slowT, stage.slowT) * 6), h = 30 * k;
        d.reset();
        d.rect(v.width + 2, h, { x: v.width / 2, y: h / 2, color: "#120a10" });
        d.rect(v.width + 2, h, { x: v.width / 2, y: v.height - h / 2, color: "#120a10" });
    } }]);

    function pick(a) { stage.ammo = a; game.haptic("tick"); stage.sound.click(); stage.aiming = false; kAim = false; drag = null; }

    // --- HUD -----------------------------------------------------------------------------------------
    const tray = [];
    order.forEach((a, i) => {
        const e = s.add([ui(), rect(58, 58, { color: "#00000000" }), tap(() => {
            if (sandbox) { buildMode = false; pick(a); return; }
            if (sim.rack[a] && (sim.state === "aim")) pick(a);
        }), {
            name: `ammo-${a}`,
            draw(d) {
                const on = stage.ammo === a && !(sandbox && buildMode), left = sandbox ? 1 : sim.rack[a];
                const lift = on ? -6 + Math.sin(t * 5) * 1.5 : 0;
                d.rect(58, 58, { y: lift + 3, color: INK, radius: 14 });
                d.rect(52, 52, { y: lift, color: left ? (on ? "#ffc93c" : "#f4e4c4") : "#7d7078", radius: 11 });
                d.sprite("ammo", { y: lift - 2, width: 42, height: 42, frame: AMMO_FRAME[a], opacity: left ? 1 : 0.4 });
                if (!sandbox) {
                    d.circle(11, { x: 22, y: lift - 22, color: INK });
                    d.circle(8.5, { x: 22, y: lift - 22, color: left ? "#f2663f" : "#6e6370" });
                    d.text(String(left), { x: 22, y: lift - 22.5, size: 13, bold: true, font: FONT, color: "#fff" });
                }
            },
        }]);
        tray.push(e);
    });
    const placeTray = () => {
        const v = game.view, land = v.width > v.height, n = tray.length, gap = land ? 54 : 64, x0 = sandbox && land ? v.width - v.safe.right - 30 - (n - 1) * gap : v.width / 2 - (n - 1) * gap / 2, y = v.height - v.safe.bottom - (land ? 30 : 44);
        tray.forEach((e, i) => { e.pos.x = x0 + i * gap; e.pos.y = y; e.hidden = !!panel; e.scale = land ? 0.84 : 1; });
    };
    placeTray();
    s.add([ui(), { update() { placeTray(); } }]);

    s.add([pin("top-left", [8, 8]), chunky("II", { width: 50, height: 50, textSize: 17, color: "#3f8f7c", action: "pause", onTap: () => { if (!panel) pausePanel(); } })]);
    if (!sandbox) {
        s.add([pin("top-right", [8, 8]), rect(50, 50, { color: "#00000000" }), tap(() => { peek = !peek; if (ready()) stage.cam.mode = peek ? "peek" : "wide"; game.haptic("tick"); }), {
            draw(d) {
                d.rect(50, 56, { y: 3, color: INK, radius: 15 }); d.rect(44, 44, { color: peek ? "#ffc93c" : "#3f8f7c", radius: 12 });
                d.circle(11, { color: CREAM }); d.circle(5.5, { color: INK }); d.circle(2, { x: -2, y: -2, color: "#fff" });
            },
        }]);
    }

    if (sandbox) {
        const pals = [];
        const placePal = () => {
            const v = game.view, land = v.width > v.height, n = PAL.length, gap = land ? 42 : Math.min(45, (v.width - 8) / n), x0 = land ? v.safe.left + 28 : v.width / 2 - (n - 1) * gap / 2, y = v.height - v.safe.bottom - (land ? 30 : 108);
            pals.forEach((e, i) => { e.pos.x = x0 + i * gap; e.pos.y = y; e.size.x = gap - 1; e.size.y = 44; e.hidden = !!panel; });
        };
        PAL.forEach(([m, sh], i) => {
            pals.push(s.add([ui(), rect(44, 44, { color: "#00000000" }), tap(() => { pal = i; buildMode = true; stage.aiming = false; game.haptic("tick"); }), {
                draw(d) {
                    const on = buildMode && pal === i;
                    d.rect(40, 40, { color: INK, radius: 10 }); d.rect(35, 35, { color: on ? "#ffc93c" : "#f4e4c4", radius: 8 });
                    if (m === "squire") d.sprite("folk", { width: 36, height: 36 });
                    else if (m === "roof") d.sprite("roof2", { width: 32, height: 30 });
                    else {
                        const strip = sh === "l" ? "b405" : sh === "h" ? "b21" : "b11", wd = sh === "c" ? 24 : 32, hg = sh === "l" ? 9 : sh === "h" ? 16 : 24, fr = m === "tnt" ? 9 : m === "stone" ? 3 : m === "glass" ? 6 : 0;
                        d.sprite(strip, { width: wd, height: hg, frame: fr, color: m === "stone" ? "#f4ece0" : "#ffffff" });
                    }
                },
            }]));
        });
        placePal();
        s.add([ui(), { update: placePal }]);
        s.add([pin("top-right", [8, 8]), chunky("Reset", { width: 74, height: 50, textSize: 15, color: "#c23a3c", onTap: () => game.go("play", { sandbox: true }, { fade: 0.15 }) })]);
    }

    s.onDrawUI((d) => {
        const v = game.view, land = v.width > v.height;
        d.reset();
        stage.drawFloats(d);
        if (panel) return;
        // Score plaque, star meter.
        const sx = v.width / 2, sy = v.safe.top + 30;
        if (!sandbox) {
            const w = land ? 170 : 150, f = clamp(sim.score / par);
            d.rect(w + 8, 50, { x: sx, y: sy + 1, color: INK, radius: 14, opacity: 0.86 });
            digits(d, scoreShown, sx, sy - 7, 21, 1 + scorePop * 0.14, CREAM);
            d.rect(w - 14, 8, { x: sx, y: sy + 15, color: "#5a4a50", radius: 4 });
            if (f > 0.01) d.rect((w - 14) * f, 8, { x: sx - (w - 14) * (1 - f) / 2, y: sy + 15, color: f >= 1 ? "#ffe27a" : "#ffc93c", radius: 4 });
            for (const q of [0.55, 1]) {
                const hit = f >= q;
                d.sprite("star", { x: sx - (w - 14) / 2 + (w - 14) * q, y: sy + 15, width: hit ? 19 : 15, height: hit ? 19 : 15, frame: hit ? 1 : 0 });
            }
        }
        // Combo.
        if (sim.mult > 1) {
            const pop = 1 + comboPop * 0.7, y = sy + 62 + (land ? -8 : 8), c = sim.mult >= 6 ? "#ff7a4d" : "#ffe27a";
            popText(d, `x${sim.mult}`, sx, y, 30, pop, c);
            d.rect(70 * clamp(sim.comboT / 1.7), 5, { x: sx, y: y + 22, color: c, radius: 3 });
        }
        // Boss bar.
        if (sim.boss && sim.defenders.includes(sim.boss)) {
            const left = v.safe.left + 66, room = sx - 92 - left, w = land ? Math.min(170, room - 10) : Math.min(240, v.width - 110), y = land ? sy - 12 : sy + 46, f = clamp(sim.boss.hp / sim.boss.max), bx = land ? left + room / 2 : sx;
            if (land || sim.mult <= 1) {
                d.rect(w + 6, 15, { x: bx, y: y + 8, color: INK, radius: 7 });
                d.rect((w - 2) * f, 9, { x: bx - (w - 2) * (1 - f) / 2, y: y + 8, color: "#e8483c", radius: 4 });
                d.text(level.boss, { x: bx, y: y + 24, size: 13, bold: true, font: FONT, color: "#ffe6d8" });
            }
        }
        // The boss has words.
        if (level.taunt && intro > 0) {
            const w = Math.min(310, v.width - 30), y = v.height * (land ? 0.42 : 0.36);
            d.rect(w + 6, 58, { x: v.width / 2, y, color: INK, radius: 16, opacity: 0.92 });
            d.text(`"${level.taunt}"`, { x: v.width / 2, y, size: 14, bold: true, font: FONT, color: CREAM, maxWidth: w - 16 });
        }
        // Banner.
        if (bannerT > 0) {
            const k = clamp(bannerT * 3), y = v.height * (land ? 0.32 : 0.3), size = bannerText.length > 18 ? 22 : 28;
            d.text(bannerText, { x: v.width / 2 + 2, y: y + 3, size, bold: true, font: FONT, color: INK, opacity: k, maxWidth: v.width - 40 });
            d.text(bannerText, { x: v.width / 2, y, size, bold: true, font: FONT, color: bannerColor, opacity: k, maxWidth: v.width - 40 });
        }
        // Teaching, by showing.
        if (!sandbox && sim.state === "aim" && intro <= 0 && !stage.aiming && firstShot && sim.fired === 0) {
            const q = (t * 0.7) % 1, ease = clamp(q / 0.7), cat = s.cam.toView([0, -3.2 * WU]), x0 = Math.max(90, cat.x + 40), y0 = Math.min(v.height - 200, cat.y + 10), x = x0 - ease * 76, y = y0 + ease * 44;
            d.line([x0, y0], [x, y], { width: 3, color: "#fff3d6", opacity: 0.8 * (1 - clamp((q - 0.8) / 0.2)) });
            d.circle(19, { x, y, color: "#ffffff", opacity: 0.3 * (1 - clamp((q - 0.8) / 0.2)) });
            d.circle(13, { x, y, color: "#ffffff", opacity: 0.9 * (1 - clamp((q - 0.8) / 0.2)) });
            d.text("Drag back, let go", { x: v.width / 2 + 1, y: v.height * 0.2 + 2, size: 22, bold: true, font: FONT, color: INK });
            d.text("Drag back, let go", { x: v.width / 2, y: v.height * 0.2, size: 22, bold: true, font: FONT, color: CREAM });
        }
        if (hint > 0 && sim.shots[0] && !sim.shots[0].spent) {
            const h = AMMO[sim.shots[0].ammo].hint;
            if (h) { d.text(h, { x: v.width / 2 + 1, y: v.height * 0.2 + 2, size: 20, bold: true, font: FONT, color: INK, opacity: clamp(hint * 2) }); d.text(h, { x: v.width / 2, y: v.height * 0.2, size: 20, bold: true, font: FONT, color: "#ffe27a", opacity: clamp(hint * 2) }); }
        }
        if (stage.aiming) {   // Power gauge beside the sling, so it reads even at a distance.
            const q = stage.tension, at = s.cam.toView([0, 0.75 * WU]), x = clamp(at.x, 58, v.width - 70), y = at.y + 8;
            d.rect(100, 13, { x, y, color: INK, radius: 7, opacity: 0.86 });
            d.rect(93 * q, 7, { x: x - 46.5 * (1 - q), y, color: q > 0.92 ? "#ffe27a" : "#f2663f", radius: 4 });
        }
        if (sandbox) {
            d.text(buildMode ? "Tap to drop it in" : "Drag back to fire", { x: v.width / 2 - 8, y: v.safe.top + 30, size: 16, bold: true, font: FONT, color: CREAM });
        }
    });

    function endPanel(type) {
        const won = type === "won";
        let stars = 0;
        if (won) {
            stars = sim.score >= par ? 3 : sim.score >= par * 0.55 ? 2 : 1;
            const i = level.index, was = save.stars[i] ?? 0;
            save.stars[i] = Math.max(was, stars); save.best[i] = Math.max(save.best[i] ?? 0, sim.score);
            if (level.bossLevel && level.world === 0 && !save.sandbox) { save.sandbox = true; }
            persist();
        }
        game.data.lastStars = stars; game.data.lastScore = sim.score; game.data.lastResult = type;
        stage.pip = won ? 2 : 3; stage.pipT = 30;
        if (won) stage.sound.fanfare(); else stage.sound.sad();
        const made = [];
        const A = (c) => { const e = s.add(c); made.push(e); return e; };
        let k = 0;
        const big = won && level.boss;
        A([ui(), { layer: 20, update(dt) { k = Math.min(1, k + dt * 3); }, draw(d) {
            const v = game.view;
            d.reset();
            d.rect(v.width + 4, v.height + 4, { x: v.width / 2, y: v.height / 2, color: "#150c14", opacity: 0.5 * k });
            const pw = Math.min(330, v.width - 24), ph = v.height > v.width ? 400 : 340, cx = v.width / 2, cy = v.height / 2 - (v.height > v.width ? 10 : 0) + (1 - k) * (1 - k) * 200;
            d.rect(pw + 8, ph + 10, { x: cx, y: cy + 3, color: INK, radius: 26 });
            d.rect(pw, ph, { x: cx, y: cy, color: won ? "#f4dfb4" : "#d9cfc4", radius: 22 });
            d.rect(pw - 24, 58, { x: cx, y: cy - ph / 2 + 44, color: won ? "#f2663f" : "#6e6370", radius: 14 });
            const title = won ? (big ? `${level.boss} falls!` : "Castle Fallen!") : "It still stands!";
            d.text(title, { x: cx, y: cy - ph / 2 + 43, size: title.length > 17 ? 21 : 26, bold: true, font: FONT, color: "#fff6e0" });
            d.text(sim.score.toLocaleString("en-US"), { x: cx, y: cy - ph / 2 + 165 - (won ? 0 : 50), size: 34, bold: true, font: FONT, color: INK });
            const line = won ? `${sim.broken} smashed  ·  ${sim.kills} squashed  ·  top combo x${Math.min(12, 1 + Math.floor(sim.bestCombo / 6))}` : `${sim.defenders.length} gourd${sim.defenders.length === 1 ? "" : "s"} still gloating`;
            d.text(line, { x: cx, y: cy - ph / 2 + 196 - (won ? 0 : 50), size: 13, bold: true, font: FONT, color: "#5a4a50" });
            if (!won) {
                d.sprite("pip", { x: cx, y: cy - ph / 2 + (v.height > v.width ? 212 : 196), width: v.height > v.width ? 74 : 50, height: v.height > v.width ? 84 : 57, frame: 3 });
                d.text(TIPS[(level.index ?? 0) % TIPS.length], { x: cx, y: cy + (v.height > v.width ? 64 : 76), size: 13, bold: true, font: FONT, color: "#5a4a50", maxWidth: pw - 40 });
            }
            if (won && big) d.text(`Unlocked: ${world.reward}!`, { x: cx, y: cy - ph / 2 + 215, size: 14, bold: true, font: FONT, color: "#c23a3c" });
            else if (won && sim.bonus) d.text(`+${sim.bonus.toLocaleString("en-US")} for shots to spare`, { x: cx, y: cy - ph / 2 + 215, size: 13, bold: true, font: FONT, color: "#a0522d" });
        } }]);
        if (won) {
            for (let i = 0; i < 3; i++) {
                const st = { scale: 0, on: i < stars };
                s.wait(0.35 + i * 0.32, () => { st.t = 0; if (st.on) { stage.sound.star(i); s.shake(4 + i * 2, 0.15); } });
                A([ui(), { layer: 21, update(dt) { if (st.t !== undefined) { st.t += dt; const q = clamp(st.t / 0.3), o = 1.7; const v = q - 1; st.scale = 1 + (o + 1) * v * v * v + o * v * v; } }, draw(d) {
                    const v = game.view, ph = v.height > v.width ? 400 : 340, cy = v.height / 2 - (v.height > v.width ? 10 : 0), x = v.width / 2 + (i - 1) * 72, y = cy - ph / 2 + 115 - (i === 1 ? 8 : 0), sz = i === 1 ? 66 : 54;
                    d.reset();
                    d.sprite("star", { x, y, width: sz, height: sz, frame: 0 });
                    if (st.on && st.scale > 0.01) { d.sprite("star", { x, y, width: sz * st.scale, height: sz * st.scale, frame: 1 }); }
                } }]);
            }
        }
        const nxt = (level.index ?? 0) + 1, done = nxt >= LEVELS.length, flat = game.view.width > game.view.height;
        const mkY = () => { const v = game.view, ph = v.height > v.width ? 400 : 340; return (v.height > v.width ? -10 : 0) + ph / 2 - 106; };
        const finale = won && done;
        const go1 = () => { click.click(); if (finale) game.go("end", {}, { fade: 0.4 }); else if (won) game.go("play", { level: nxt }, { fade: 0.25 }); else game.go("play", args, { fade: 0.15 }); };
        A([pin("center", [flat ? -96 : 0, mkY() + (flat ? 48 : 0)]), { layer: 22 }, chunky(finale ? "The End" : won ? (flat ? "Next" : "Next Castle") : (flat ? "Retry" : "Try Again"), { width: flat ? 110 : 220, height: 56, textSize: flat ? 19 : 21, action: "confirm", onTap: go1 })]);
        A([pin("center", [flat ? 16 : -58, mkY() + (flat ? 48 : 66)]), { layer: 22 }, chunky(won ? "Replay" : "Castles", { width: flat ? 92 : 104, height: 50, textSize: 15, color: "#3f8f7c", onTap: () => { click.click(); if (won) game.go("play", args, { fade: 0.15 }); else game.go("map", { world: level.world }, { fade: 0.2 }); } })]);
        A([pin("center", [flat ? 116 : 58, mkY() + (flat ? 48 : 66)]), { layer: 22 }, chunky(won ? "Castles" : "Title", { width: flat ? 92 : 104, height: 50, textSize: 15, color: "#c98a2e", onTap: () => { click.click(); if (won) game.go("map", { world: level.world }, { fade: 0.2 }); else game.go("title", {}, { fade: 0.2 }); } })]);
        panel = made;
    }

    function pausePanel() {
        s.paused = true;
        const made = [];
        const A = (c) => { const e = s.add(c); made.push(e); return e; };
        const close = () => { s.paused = false; made.forEach((e) => e.destroy()); panel = null; };
        A([ui(), { layer: 20, draw(d) {
            const v = game.view;
            d.reset(); d.rect(v.width + 4, v.height + 4, { x: v.width / 2, y: v.height / 2, color: "#150c14", opacity: 0.55 });
            d.text("Paused", { x: v.width / 2, y: v.height / 2 - 118, size: 30, bold: true, font: FONT, color: CREAM });
        } }]);
        A([pin("center", [0, -56]), { layer: 22 }, chunky("Resume", { width: 200, height: 52, action: "pause", onTap: close })]);
        A([pin("center", [0, 6]), { layer: 22 }, chunky("Restart", { width: 200, height: 50, color: "#3f8f7c", onTap: () => { s.paused = false; game.go("play", args, { fade: 0.15 }); } })]);
        A([pin("center", [0, 62]), { layer: 22 }, chunky("Quit to Castles", { width: 200, height: 50, color: "#c98a2e", onTap: () => { s.paused = false; game.go("map", { world: sandbox ? 0 : level.world }, { fade: 0.2 }); } })]);
        settingsRow({ add: A }, "center", ((i) => () => [-26 + 52 * i++, 118])(0));
        panel = made;
    }
});

// --- The End --------------------------------------------------------------------------------------------
game.scene("end", (s) => {
    game.touch.enabled = false;
    paintWorld(game.assets, "gilded");
    paintBoss(game.assets, 4);
    s.background = THEMES.gilded.sky;
    const total = starTotal();
    let t = 0;
    song("menu");
    click.fanfare();
    s.onUpdate((dt) => { t += dt; if (Math.floor(t * 3) !== Math.floor((t - dt) * 3)) s.burst({ at: [game.view.width * (0.15 + 0.7 * ((t * 7.3) % 1)), game.view.height * 0.3], count: 14, color: ["#ffd24a", "#ff8f3c"], speed: [40, 180], life: [0.4, 1], size: [3, 7], gravity: 200 }); });
    s.onDraw((d) => {
        const v = game.view, cx = v.width / 2;
        d.reset();
        d.sprite("near_gilded", { x: cx, y: v.height - 70, width: 1024, height: 190 });
        d.sprite("ground_gilded", { x: cx, y: v.height - 20, width: 1024, height: 90 });
    });
    s.onDrawUI((d) => {
        const v = game.view, cx = v.width / 2;
        d.reset();
        d.text("The keep has tumbled!", { x: cx + 2, y: v.height * 0.2 + 2, size: 26, bold: true, font: FONT, color: INK, maxWidth: v.width - 30 });
        d.text("The keep has tumbled!", { x: cx, y: v.height * 0.2, size: 26, bold: true, font: FONT, color: CREAM, maxWidth: v.width - 30 });
        d.sprite("pip", { x: cx - 60, y: v.height * 0.5, width: 90, height: 104, frame: Math.floor(t * 4) % 2 ? 2 : 0 });
        d.sprite("boss4", { x: cx + 60, y: v.height * 0.5, width: 110, height: 110, frame: 3 });
        d.sprite("star", { x: cx - 44, y: v.height * 0.66, width: 34, height: 34, frame: 1 });
        d.text(`${total} of ${LEVELS.length * 3}`, { x: cx + 22, y: v.height * 0.66, size: 22, bold: true, font: FONT, color: INK });
        d.text("Now go back for the stars you left behind.", { x: cx, y: v.height * 0.73, size: 14, bold: true, font: FONT, color: INK, maxWidth: v.width - 40 });
    });
    s.add([pin("bottom", [0, 40]), chunky("Back to the Castles", { width: 240, height: 54, action: "confirm", onTap: () => game.go("map", { world: 4 }, { fade: 0.3 }) })]);
});

game.resetSave = () => { save = defaults(); persist(); };
game.grant = (o) => { Object.assign(save, o); persist(); };
game.start("title");
globalThis.document?.getElementById("load")?.remove();
