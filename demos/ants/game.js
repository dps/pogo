// ANT WARS. Paint a line with your thumb. Five hundred ants take it personally.
import { createGame, pos, rect, tap, ui } from "./pogo.js";
import { paintUI, paintWorld } from "./art.js";
import { bakeGround } from "./ground.js";
import { MISSION_MAPS, SKIRMISH_MAPS, skirmishMap, titleMap } from "./maps.js";
import { Sim, GATHER, ATTACK, GUARD } from "./sim.js";
import { Brain, Commander, LEVELS, STRATEGIES } from "./ai.js";
import { Stage } from "./stage.js";
import { CREAM, FONT, GOLD, Hud, INK, atlasSprite, chunky, panel, shadowText } from "./hud.js";
import { SONGS, Sound } from "./audio.js";
import { CAST, LOSE_LINES, MISSIONS } from "./story.js";
import { CHAMBER_BY_ID, CRUMB, MEAT, TEAMS, CASTES, TICK_HZ } from "./data.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#23401f",
    touch: { stick: false, buttons: [] },
    actions: { ff: ["KeyF", "pad:x"], nestKey: ["KeyN", "pad:y"], zoomKey: ["KeyZ", "KeyM", "pad:select"], c1: ["Digit1"], c2: ["Digit2"], c3: ["Digit3"], c4: ["Digit4"], c5: ["Digit5"] },
    seed: 1, maxDpr: 2,
});
const W = paintWorld(game.assets), U = paintUI(game.assets);
const SAVE = "antwars1";
const defaults = () => ({ stars: [], times: [], muted: false, haptics: true, skirmish: { map: "lawn", size: 1, enemies: 1, level: 1, hazards: true }, wins: 0 });
let save = { ...defaults(), ...game.load(SAVE, {}) };
const persist = () => game.save(SAVE, save);
game.audio.muted = !!save.muted; game.haptics.enabled = save.haptics !== false;
const snd = new Sound(game);
game.on("scene", () => snd.stopAll());
const song = (name) => { if (game.data.song !== name) { game.data.song = name; game.music(SONGS[name]); } };
const nextMission = () => { for (let i = 0; i < MISSIONS.length; i++) if (!save.stars[i]) return i; return MISSIONS.length - 1; };
const unlocked = (i) => i === 0 || !!save.stars[i - 1] || !!save.stars[i];
const starTotal = () => save.stars.reduce((a, b) => a + (b ?? 0), 0);

function setGround(key, map) {
    if (game.data.groundKey === key) return;
    try { game.assets.free("ground"); } catch { /* first time */ }
    bakeGround(game.assets, "ground", map); game.data.groundKey = key;
}
function makeSim(map, seed, o) {
    const sim = new Sim(map, { seed, ...o });
    for (const n of map.nests) if (n.team !== 0 && n.strategy) sim.brains.push(new Brain(sim, n.team, n.strategy, n.level ?? 1, n));
    return sim;
}
function toggles(s, x, y, gap = 54, tag = "setting") {
    const icon = (dx, get, flip, art) => s.add([ui(), pos(x + dx, y), rect(46, 46, { color: "#00000000" }), tap(() => { flip(); persist(); snd.click(); }), tag, { name: "setting", layer: 90, draw(d) { d.rect(44, 44, { color: "#120b07", radius: 12 }); d.rect(39, 39, { color: get() ? "#5a7d2c" : "#5e4c40", radius: 10 }); art(d, get()); } }]);
    icon(0, () => !game.audio.muted, () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; }, (d, on) => {
        d.poly([[-11, -4], [-6, -4], [1, -10], [1, 10], [-6, 4], [-11, 4]], { color: CREAM });
        if (on) { d.line([6, -5], [9, -8], { width: 2.4, color: CREAM }); d.line([7, 0], [12, 0], { width: 2.4, color: CREAM }); d.line([6, 5], [9, 8], { width: 2.4, color: CREAM }); } else { d.line([5, -5], [13, 5], { width: 2.6, color: "#ffb0a0" }); d.line([13, -5], [5, 5], { width: 2.6, color: "#ffb0a0" }); }
    });
    icon(gap, () => game.haptics.enabled, () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; if (game.haptics.enabled) game.haptic("medium"); }, (d, on) => {
        d.rect(13, 23, { color: CREAM, radius: 3 }); d.rect(8, 15, { y: -1, color: on ? "#5a7d2c" : "#5e4c40", radius: 1 });
        for (const sg of [-1, 1]) { d.line([sg * 10, -6], [sg * 13, -2], { width: 2.2, color: CREAM }); d.line([sg * 13, -2], [sg * 10, 2], { width: 2.2, color: CREAM }); d.line([sg * 10, 2], [sg * 13, 6], { width: 2.2, color: CREAM }); }
        if (!on) d.line([-15, -13], [15, 13], { width: 2.6, color: "#ffb0a0" });
    });
}

// --- Title: the war is already on. You can paint on it. --------------------------------------------------------------
game.scene("title", (s) => {
    game.touch.enabled = false; song("menu");
    const map = titleMap(); setGround("title", map);
    const sim = makeSim(map, 5, { events: true }); sim.brains.push(new Commander(sim, { every: 1, wave: 30 }));
    sim.me.chambers.gym = 2; for (const f of sim.colList) f.maxPop = 400;
    const stage = new Stage(game, s, sim, W, snd, { quiet: true, ground: "ground", pads: { top: 0, bottom: 0 } });
    game.ants = { sim, stage, Commander };
    stage.cam.x = stage.cam.tx = 500; stage.cam.y = stage.cam.ty = 470; stage.cam.z = stage.cam.tz = Math.max(0.62, s.view.width / 900, s.view.height / 880); stage.applyCam(true);
    for (let i = 0; i < 240; i++) sim.tick(); sim.ev.length = 0;
    let t = 0;
    s.onUpdate((dt) => { t += dt; stage.step(dt); stage.cam.tx = 500 + Math.sin(t * 0.13) * 70; stage.cam.ty = 470 + Math.cos(t * 0.1) * 60; });
    s.onDraw((d) => stage.draw(d));
    const layout = () => {
        for (const e of s.find("menu")) e.destroy();
        const v = s.view, land = v.width > v.height, cx = land ? v.width * 0.72 : v.width / 2, by = land ? v.height * 0.5 : v.height - 200, safeB = v.safe?.bottom ?? 0;
        const b1 = chunky(s, save.stars[0] ? "PLAY" : "PLAY", cx, by, land ? 220 : 240, 64, () => { snd.click(); game.go("play", { mission: nextMission() }, { fade: 0.2 }); }, { size: 28, color: "#ffb22e" });
        const b2 = chunky(s, "Missions", cx - 62, by + 66, 118, 50, () => { snd.click(); game.go("missions", {}, { fade: 0.2 }); }, { size: 15, color: "#8bc34a" });
        const b3 = chunky(s, "Skirmish", cx + 62, by + 66, 118, 50, () => { snd.click(); game.go("skirmish", {}, { fade: 0.2 }); }, { size: 15, color: "#6cc7ff" });
        for (const b of [b1, b2, b3]) b.tag("menu");
        toggles(s, v.width - (v.safe?.right ?? 0) - 90, 34 + (v.safe?.top ?? 0), 54, "menu");
    };
    layout(); s.on("resize", layout);
    s.add([ui(), pos(0, 0), { name: "art", layer: 20, draw(d) {
        const v = s.view, land = v.width > v.height, sway = Math.sin(t * 0.9) * 0.02;
        d.sprite("uisheet", { crop: [U.vignette.x, U.vignette.y, 128, 128], x: v.width / 2, y: v.height / 2, width: v.width, height: v.height });
        const hs = 1, bl = U.blades;
        atlasSprite(d, "uisheet", bl, 34, v.height - 90, 300 * hs, 560 * hs, { rot: 0.08 + sway });
        atlasSprite(d, "uisheet", bl, v.width - 26, v.height - 70, 300 * hs, 560 * hs, { rot: -0.1 - sway, flipX: true });
        const lx = land ? v.width * 0.28 : v.width / 2, safeT = v.safe?.top ?? 0, big = land ? 62 : 94, ly = land ? 56 + safeT : 118 + safeT, bob = Math.sin(t * 1.4) * 3;
        const hero = land ? 220 : Math.min(250, v.height - 500), hy = land ? v.height - 118 : v.height - 318;
        if (land) logo(d, lx, ly + bob, big, t, "ANT WARS"); else { logo(d, lx - 8, ly + bob, big, t, "ANT"); logo(d, lx + 8, ly + big * 0.92 + bob, big, t + 0.1, "WARS", 3); }
        if (hero > 120) atlasSprite(d, "uisheet", U.hero, lx, hy + Math.sin(t * 1.6) * 3, hero, hero);
        const tagY = land ? ly + big * 0.72 : ly + big * 1.56; d.rect(236, 24, { x: lx, y: tagY, color: "#120b07", opacity: 0.6, radius: 12 });
        d.text(save.stars[0] ? `${starTotal()} of ${MISSIONS.length * 3} stars` : "One thumb. A thousand ants.", { x: lx, y: tagY, size: 14, bold: true, font: FONT, color: CREAM });
    } }]);
});
function logo(d, x, y, size, t, word, base = 0) {
    const w = size * 0.66; let i = base; const off = base;
    for (const ch of word) {
        const dx = (i - off - (word.length - 1) / 2) * w, drop = Math.min(1, t * 2.2 - i * 0.07), yy = y - (1 - Math.max(0, drop)) * 180 + Math.sin(t * 2 + i * 0.6) * 1.6;
        if (ch !== " ") { const rot = Math.sin(i * 2.1) * 0.05; for (const [ox, oy, c] of [[0, 7, "#2a1505"], [-3, 0, "#2a1505"], [3, 0, "#2a1505"], [0, -3, "#2a1505"], [0, 3, "#2a1505"]]) d.text(ch, { x: x + dx + ox, y: yy + oy, size, bold: true, font: FONT, color: c, rot }); d.text(ch, { x: x + dx, y: yy, size, bold: true, font: FONT, color: i < 3 ? "#ffb22e" : "#ff5a3c", rot }); d.text(ch, { x: x + dx - 1, y: yy - 2, size: size * 0.98, bold: true, font: FONT, color: i < 3 ? "#ffe29a" : "#ffb09a", rot, opacity: 0.35 }); }
        i++;
    }
}

// --- Missions: a walk across the garden ------------------------------------------------------------------------------
game.scene("missions", (s, args) => {
    game.touch.enabled = false; song("menu");
    const map = titleMap(); setGround("title", map);
    let t = 0, sel = args?.sel ?? nextMission();
    s.onUpdate((dt) => { t += dt; });
    const spots = () => {
        const v = s.view, land = v.width > v.height, cols = land ? 6 : 3, rows = land ? 2 : 4, top = land ? 56 : 70, h = (land ? v.height - 168 : v.height - 250), out = [];
        for (let i = 0; i < 12; i++) { const r = i / cols | 0, c0 = i % cols, c = r % 2 ? cols - 1 - c0 : c0; out.push({ x: (c + 0.5) * v.width / cols, y: top + (r + 0.5) * h / rows + (c0 % 2 ? 10 : -10) }); }
        return out;
    };
    let P = spots();
    const build = () => {
        for (const e of s.find("mm")) e.destroy(); P = spots();
        const v = s.view, land = v.width > v.height;
        P.forEach((p, i) => { const open = unlocked(i); const e = s.add([ui(), pos(p.x, p.y), rect(64, 64, { color: "#00000000" }), tap(() => { if (!open) { snd.denied(); return; } sel = i; snd.click(); build(); }), "mm", { name: `mission-${i + 1}`, layer: 30, draw(d, en) { const on = sel === i, br = on ? 1 + Math.sin(t * 5) * 0.05 : 1; d.push(); d.scale(br); d.circle(27, { color: "#120b07", y: 2 }); d.circle(24, { color: on ? "#ffb22e" : open ? "#8bc34a" : "#5e4c40" }); d.circle(19, { color: "#ffffff", opacity: 0.12, y: -3 }); if (open) { shadowText(d, String(i + 1), { size: 21, color: on ? "#2a1505" : CREAM }); } else atlasSprite(d, "uisheet", U.iconLock, 0, 0, 24, 24); d.pop(); const st = save.stars[i] ?? 0; for (let k = 0; k < 3; k++) { star(d, (k - 1) * 13, 30, 6, k < st ? GOLD : "#2a1c14"); } } }]); });
        const m = MISSIONS[sel], px = land ? v.width / 2 : v.width / 2, py = (land ? v.height - 46 : v.height - 88) - (v.safe?.bottom ?? 0), pw = Math.min(v.width - 16, land ? 560 : 348), ph = land ? 80 : 150;
        s.add([ui(), pos(px, py), "mm", { name: "brief", layer: 29, draw(d) { panel(d, pw, ph, "#2b1d14", 16); const tx = land ? -pw / 2 + 12 : 0; if (land) { d.text(`${sel + 1}. ${m.name}`, { x: -90, y: -22, size: 16, bold: true, font: FONT, color: GOLD }); d.text(m.brief, { x: -90, y: 10, size: 12, font: FONT, color: CREAM, maxWidth: pw - 200 }); } else { d.text(`${sel + 1}. ${m.name}`, { y: -58, size: 18, bold: true, font: FONT, color: GOLD }); d.text(m.place, { y: -38, size: 12, font: FONT, color: "#d9c6a8" }); d.text(m.brief, { y: -6, size: 13, font: FONT, color: CREAM, maxWidth: pw - 28 }); } } }]);
        chunky(s, "MARCH", land ? px + pw / 2 - 72 : px, land ? py : py + 44, land ? 120 : 200, 48, () => { snd.click(); game.go("play", { mission: sel }, { fade: 0.2 }); }, { size: 19, color: "#ffb22e", layer: 31 }).tag("mm");
        chunky(s, "Back", 46, 32 + (v.safe?.top ?? 0), 76, 50, () => { snd.click(); game.go("title", {}, { fade: 0.2 }); }, { size: 14, color: "#d9c6a8" }).tag("mm");
    };
    build(); s.on("resize", build);
    s.onDraw((d) => { const v = s.view, k = Math.max(v.width / map.w, v.height / map.h); d.sprite("ground", { x: v.width / 2, y: v.height / 2, width: map.w * k, height: map.h * k, color: "#c9d6bc" }); });
    s.onDrawUI((d) => {
        const v = s.view; d.sprite("uisheet", { crop: [U.vignette.x, U.vignette.y, 128, 128], x: v.width / 2, y: v.height / 2, width: v.width, height: v.height });
        shadowText(d, "THE LONG MARCH", { x: v.width / 2 + 30, y: 28 + (v.safe?.top ?? 0), size: 19, color: CREAM });
        // An ant trail joins the missions; ants walk it forever.
        for (let i = 0; i < 11; i++) { const a = P[i], b = P[i + 1], n = 9; for (let k = 1; k < n; k++) { const q = k / n, x = a.x + (b.x - a.x) * q, y = a.y + (b.y - a.y) * q; d.circle(1.8, { x, y, color: unlocked(i + 1) ? "#ffd166" : "#00000066" }); } }
        for (let k = 0; k < 36; k++) { const u = ((t * 0.06 + k / 36) % 1) * 11, i = u | 0, q = u - i, a = P[i], b = P[i + 1], reg = W[`ant0_0_${(t * 10 + k) & 3}`], ang = Math.atan2(b.y - a.y, b.x - a.x); d.sprite("world", { crop: [reg.x, reg.y, reg.w, reg.h], x: a.x + (b.x - a.x) * q + Math.sin(k * 3) * 5, y: a.y + (b.y - a.y) * q + Math.cos(k * 2) * 5, width: 20, height: 20, rot: ang }); }
    });
});
function star(d, x, y, r, c) { const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.571, q = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q]); } for (let i = 0; i < 5; i++) d.poly([[x, y], pts[i * 2], pts[(i * 2 + 1) % 10]], { color: c }), d.poly([[x, y], pts[(i * 2 + 1) % 10], pts[(i * 2 + 2) % 10]], { color: c }); }

// --- Skirmish: your war, your rules ----------------------------------------------------------------------------------
game.scene("skirmish", (s) => {
    game.touch.enabled = false; song("menu");
    const map = titleMap(); setGround("title", map);
    const o = (save.skirmish = { ...defaults().skirmish, ...save.skirmish });
    const rows = [
        { label: "Map", key: "map", opts: SKIRMISH_MAPS.map((m) => [m.id, m.name]) },
        { label: "Size", key: "size", opts: [[0, "Small"], [1, "Medium"], [2, "Large"]] },
        { label: "Rivals", key: "enemies", opts: [[1, "One"], [2, "Two"], [3, "Three"]] },
        { label: "Rival skill", key: "level", opts: LEVELS.map((l, i) => [i, l.name]) },
        { label: "Gary & the Shoe", key: "hazards", opts: [[true, "On"], [false, "Off"]] },
    ];
    const build = () => {
        for (const e of s.find("sk")) e.destroy();
        const v = s.view, land = v.width > v.height, w = Math.min(v.width - 20, 400), safeT = v.safe?.top ?? 0, gap = land ? 47 : 76, top = (land ? 62 : 120) + safeT;
        rows.forEach((r, i) => {
            const y = top + i * gap;
            s.add([ui(), pos(v.width / 2, y), "sk", { name: `row-${r.key}`, layer: 30, draw(d) { const cur = r.opts.find((q) => q[0] === o[r.key]) ?? r.opts[0]; panel(d, w - 100, land ? 40 : 64, "#2b1d14", 12); d.text(r.label, { y: land ? -11 : -19, size: 11, font: FONT, color: "#d9c6a8" }); d.text(cur[1], { y: land ? 8 : 6, size: land ? 15 : 17, bold: true, font: FONT, color: GOLD }); if (r.key === "map" && !land) d.text(SKIRMISH_MAPS.find((q) => q.id === o.map).blurb, { y: 23, size: 10.5, font: FONT, color: "#d9c6a8" }); if (r.key === "level" && !land) d.text(["They forage and dawdle.", "A fair fight.", "They mean it.", "Good luck."][o.level], { y: 23, size: 10.5, font: FONT, color: "#d9c6a8" }); } }]);
            const shift = (dir) => { const k = r.opts.findIndex((q) => q[0] === o[r.key]), n = r.opts.length; o[r.key] = r.opts[(k + dir + n) % n][0]; persist(); snd.focus(k % 5); };
            chunky(s, "<", v.width / 2 - w / 2 + 24, y, 44, 44, () => shift(-1), { size: 20, color: "#8bc34a" }).tag("sk");
            chunky(s, ">", v.width / 2 + w / 2 - 24, y, 44, 44, () => shift(1), { size: 20, color: "#8bc34a" }).tag("sk");
        });
        chunky(s, "FIGHT", v.width / 2 + (land ? 90 : 0), v.height - (land ? 34 : 64), 200, 54, () => { snd.click(); game.go("play", { skirmish: { ...o, seed: (game.fxRng.next?.() ?? Math.random()) * 9999 | 0 } }, { fade: 0.2 }); }, { size: 22, color: "#ffb22e" }).tag("sk");
        chunky(s, "Back", 46, 32 + (v.safe?.top ?? 0), 76, 50, () => { snd.click(); game.go("title", {}, { fade: 0.2 }); }, { size: 14, color: "#d9c6a8" }).tag("sk");
    };
    build(); s.on("resize", build);
    s.onDraw((d) => { const v = s.view, k = Math.max(v.width / map.w, v.height / map.h); d.sprite("ground", { x: v.width / 2, y: v.height / 2, width: map.w * k, height: map.h * k, color: "#b9c6ac" }); });
    s.onDrawUI((d) => { const v = s.view; d.sprite("uisheet", { crop: [U.vignette.x, U.vignette.y, 128, 128], x: v.width / 2, y: v.height / 2, width: v.width, height: v.height }); shadowText(d, "SKIRMISH", { x: v.width / 2 + 24, y: 28 + (v.safe?.top ?? 0), size: 22, color: CREAM }); });
});

// --- The war ----------------------------------------------------------------------------------------------------------
game.scene("play", (s, args = {}) => {
    game.touch.enabled = false;
    const mi = args.mission ?? (args.skirmish ? null : 0), m = mi !== null ? MISSIONS[mi] : null;
    const map = m ? MISSION_MAPS[mi]() : skirmishMap(args.skirmish); setGround(m ? `m${mi}` : `sk${JSON.stringify(args.skirmish)}`, map);
    const sim = makeSim(map, args.seed ?? 7 + (mi ?? 0));
    const P = Hud.pads(game);
    const stage = new Stage(game, s, sim, W, snd, { ground: "ground", pads: P, onNest: () => hud.openNest() });
    const hud = new Hud(game, s, sim, stage, W, U, snd, { cast: CAST, onPause: () => togglePause(true), onBuilt: (id) => tut?.built?.(id), onFocus: (c) => tut?.focus?.(c) });
    stage.applyCam(true);
    game.ants = { sim, stage, hud, mission: mi, Commander };
    game.data.outcome = null; game.data.mission = mi;
    if (m?.boss) song("boss"); else song("forage");
    let warT = 0, ended = false, pauseEls = [], lineI = 0, t = 0;
    const tut = m ? makeTutorial(m.tutorial, s, sim, stage, hud) : null;

    function togglePause(on) {
        if (on === !!stage.paused || ended) return; hud.closeNest(); stage.paused = on;
        for (const e of pauseEls) e.destroy(); pauseEls = [];
        if (!on) return;
        const v = s.view, cx = v.width / 2, cy = v.height / 2, bt = (l, y, fn, c) => pauseEls.push(chunky(s, l, cx, cy + y, 200, v.width > v.height ? 38 : 50, fn, { color: c, layer: 86, size: 16 }));
        pauseEls.push(s.add([ui(), pos(cx, cy), rect(v.width, v.height, { color: "#00000000" }), tap(() => {}), { name: "pause-shade", layer: 84, draw(d) { d.rect(v.width + 4, v.height + 4, { color: "#0a0604", opacity: 0.6 }); const land = v.width > v.height; shadowText(d, "PAUSED", { y: land ? -128 : -130, size: land ? 20 : 26, color: CREAM }); d.text(m ? m.brief : "Beat every rival queen.", { y: land ? -106 : -104, size: 12, font: FONT, color: GOLD, maxWidth: 320 });
            const y0 = land ? 88 : 98; const leg = [["#ffd166", "End on food: gather"], ["#ff6a5a", "End on an enemy or critter: attack"], ["#7cd0ff", "End on empty ground: guard"], [CREAM, "Back to the nest: recall. Tap a badge: erase"], [CREAM, "Minimap, two fingers or WHOLE to look around"]]; leg.forEach(([c, t], i) => { d.text(t, { y: y0 + i * (land ? 13 : 17), size: land ? 10.5 : 12, bold: true, font: FONT, color: c }); }); } }]));
        toggles(s, 34 + (v.safe?.left ?? 0), 34 + (v.safe?.top ?? 0), 54, "setting"); const land = v.width > v.height, g = land ? 44 : 58, y0 = land ? -70 : -74;
        for (const e of s.find("setting")) pauseEls.push(e);
        bt("Resume", y0, () => togglePause(false), "#ffb22e"); bt("Restart", y0 + g, () => { stage.paused = false; game.go("play", args, { fade: 0.2 }); }, "#8bc34a"); bt("Quit", y0 + g * 2, () => { snd.stopAll(); game.go(m ? "missions" : "skirmish", {}, { fade: 0.2 }); }, "#d9c6a8");
    }
    s.onUpdate((dt) => {
        const I = s.input;
        if (I.pressed("pause")) togglePause(!stage.paused);
        if (!stage.paused && !ended) {
            if (I.pressed("ff")) { stage.speed = stage.speed === 1 ? 2 : stage.speed === 2 ? 4 : 1; snd.focus(stage.speed); }
            if (I.pressed("nestKey")) { if (hud.nest) hud.closeNest(); else hud.openNest(); }
            if (I.pressed("zoomKey")) { stage.toggleZoom(); snd.click(); }
            for (let c = 0; c < 5; c++) if (I.pressed(`c${c + 1}`) && sim.me.unlocked(c)) { sim.setFocus(0, c); snd.focus(c); }
        }
        t += dt; stage.step(dt); hud.step(dt); tut?.step?.(dt);
        if (m && !ended) while (lineI < m.lines.length && sim.seconds >= m.lines[lineI][2]) { const [who, text] = m.lines[lineI++]; hud.say(who, text); }
        // Music follows the fight, with some hysteresis so it doesn't flap.
        if (!m?.boss && !ended) { warT = stage.level > 0.3 || sim.alert?.level ? Math.min(9, warT + dt * 2) : Math.max(0, warT - dt); if (warT > 3) song("war"); else if (warT <= 0) song("forage"); }
        if (sim.outcome && !ended) finish();
    });
    s.onDraw((d) => { stage.draw(d); tut?.world?.(d); });
    s.add([ui(), pos(0, 0), { name: "tutorial", layer: 39, draw: (d) => tut?.ui?.(d) }]);
    function finish() {
        ended = true; const win = sim.outcome === "win", me = sim.me; game.data.outcome = sim.outcome;
        snd.stopAll(); snd.sfx([]); stage.speed = 1; hud.closeNest(); song(win ? "win" : "lose");
        let stars = 0;
        if (win) { stars = m ? sim.stars() : 3; if (m) { save.stars[mi] = Math.max(save.stars[mi] ?? 0, stars); save.times[mi] = Math.min(save.times[mi] ?? 1e9, Math.round(sim.seconds)); } else save.wins++; persist(); game.haptic("success"); }
        else game.haptic("error");
        game.data.lastStars = stars;
        s.wait(1.5, () => { hud.line = null; hud.queue = []; resultCard(win, stars); });
    }
    function resultCard(win, stars) {
        const v = s.view, land = v.width > v.height, cx = v.width / 2, cy = v.height / 2, w = Math.min(v.width - 24, 340), h = land ? v.height - 24 : 400, me = sim.me; let age = 0;
        const quote = win ? (m ? m.win[1] : "The garden is yours. For now.") : LOSE_LINES[sim.reason] ?? LOSE_LINES.queen;
        s.add([ui(), pos(cx, cy), rect(v.width, v.height, { color: "#00000000" }), tap(() => {}), { name: "result-shade", layer: 80, update(dt) { age += dt; }, draw(d) {
            d.rect(v.width + 4, v.height + 4, { color: "#0a0604", opacity: Math.min(0.55, age) });
            const k = Math.min(1, age * 3), o = 1 + 1.7 * Math.pow(k - 1, 3) + 0.7 * Math.pow(k - 1, 2), sc = 0.8 + 0.2 * o;
            d.push(); d.scale(sc); panel(d, w, h, "#2b1d14", 20);
            const top = -h / 2; shadowText(d, win ? "VICTORY" : "DEFEAT", { y: top + (land ? 26 : 40), size: land ? 26 : 34, color: win ? GOLD : "#ff8a7a" });
            atlasSprite(d, "uisheet", U[win ? CAST[m?.win[0] ?? "queen"].face : "facePinch"], land ? -w / 2 + 50 : 0, land ? top + 74 : top + 120, land ? 76 : 96, land ? 76 : 96);
            if (m && win) for (let i = 0; i < 3; i++) { const a = clamp((age - 0.4 - i * 0.28) * 4, 0, 1), big = 1 + (1 - a) * 1.5; star(d, (i - 1) * 42 + (land ? 40 : 0), land ? top + 62 : top + 198, 18 * big * (a > 0 ? 1 : 0.0001), i < stars ? GOLD : "#4a382b"); }
            d.text(quote, { x: land ? 30 : 0, y: land ? top + 104 : top + 246, size: 13, font: FONT, color: CREAM, maxWidth: land ? w - 130 : w - 36 });
            const mins = Math.floor(sim.seconds / 60), sec = String(Math.floor(sim.seconds % 60)).padStart(2, "0");
            d.text(`${mins}:${sec}   Hatched ${me.hatched}   Slain ${me.kills}   Lost ${me.lost}`, { y: land ? top + 140 : top + 288, size: 12, bold: true, font: FONT, color: "#d9c6a8" });
            d.pop();
        } }]);
        const by = cy + h / 2 - 40, next = m && win && mi + 1 < MISSIONS.length;
        s.wait(0.9, () => {
            if (win) { for (let i = 0; i < stars; i++) s.wait(i * 0.28 - 0.5 > 0 ? i * 0.28 - 0.5 : 0, () => snd.star(i)); }
            if (next) { chunky(s, "Next Mission", cx + 44, by, 170, 50, () => { snd.click(); game.go("play", { mission: mi + 1 }, { fade: 0.2 }); }, { size: 16, color: "#ffb22e", layer: 86 }); chunky(s, "Map", cx - 112, by, 84, 50, () => { snd.click(); game.go("missions", {}, { fade: 0.2 }); }, { size: 15, color: "#d9c6a8", layer: 86 }); }
            else { chunky(s, win ? "Play Again" : "Try Again", cx + 44, by, 170, 50, () => { snd.click(); game.go("play", args, { fade: 0.2 }); }, { size: 16, color: "#ffb22e", layer: 86 }); chunky(s, m ? "Map" : "Back", cx - 112, by, 84, 50, () => { snd.click(); game.go(m ? "missions" : "skirmish", {}, { fade: 0.2 }); }, { size: 15, color: "#d9c6a8", layer: 86 }); }
        });
    }
});
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Teaching by doing: a ghost thumb shows the stroke, and each step waits for the player to do the thing. */
function makeTutorial(kind, s, sim, stage, hud) {
    if (!kind) return null;
    const me = sim.me; let step = 0, age = 0, ghost = null, msg = "";
    const near = (type) => { let b = null, bd = 1e12; for (const f of sim.foods) if (f.alive && f.type === type && f.k !== "scraps") { const d = Math.hypot(f.x - me.x, f.y - me.y); if (d < bd) { bd = d; b = f; } } return b; };
    const go = (n) => { step = n; age = 0; };
    return {
        step(dt) {
            age += dt; ghost = null; msg = ""; hud.pulse = null;
            const trails = me.trails();
            if (kind === "first") {
                if (step === 0) { const f = near(CRUMB); if (f) { ghost = { a: [me.x, me.y], b: [f.x, f.y] }; stage.lookAt((me.x + f.x) / 2, (me.y + f.y) / 2 - 30); } msg = "Drag from the nest to the crumbs"; if (trails.some((t) => t.kind === GATHER)) go(1); }
                else if (step === 1) { msg = age < 5 ? "They follow your line!" : ""; if (age > 7) go(2); }
                else if (step === 2 && age > 7 && !trails.some((t) => t.food?.k === "bread")) { const f = sim.foods.find((q) => q.alive && q.k === "bread"); if (f && age < 16) { ghost = { a: [me.x, me.y], b: [f.x, f.y] }; msg = "Paint another: bigger food, more ants"; } }
            } else if (kind === "gym") {
                if (step === 0) { const f = near(MEAT); if (f && !trails.some((t) => t.food?.type === MEAT)) { ghost = { a: [me.x, me.y], b: [f.x, f.y] }; msg = "Ham means Protein. Paint a trail to it"; stage.lookAt((me.x + f.x) / 2, (me.y + f.y) / 2); } else if (me.stock[MEAT] >= 10 && me.stock[0] >= 25) go(1); }
                else if (step === 1) { msg = "Tap NEST and build the Mandible Gym"; hud.pulse = "nest"; if (me.chambers.gym) go(2); }
                else if (step === 2) { msg = "Tap Soldier so the queen lays soldiers"; hud.pulse = "caste1"; if (me.focus === 1) go(3); }
                else if (step === 3) { const c = sim.critters.find((q) => q.alive); if (me.counts[1] >= 4 && c && !trails.some((t) => t.kind === ATTACK)) { ghost = { a: [me.x, me.y], b: [c.x, c.y] }; msg = "Drag to a ladybird: red means attack"; } }
            } else if (kind === "war") {
                if (!me.chambers.gym && me.stock[MEAT] >= 10 && step === 0) { hud.pulse = "nest"; msg = "Build the Gym, then hatch Soldiers"; }
                else if (me.counts[1] >= 6 && step === 0) { const e = sim.colList.find((c) => c.team); ghost = { a: [me.x, me.y], b: [me.x + (e.x - me.x) * 0.3, me.y + (e.y - me.y) * 0.3] }; msg = "Paint to empty ground: blue means guard"; if (trails.some((t) => t.kind === GUARD)) go(1); }
                else if (step === 1 && age > 12) { const e = sim.colList.find((c) => c.team); if (me.counts[1] > 20 && !trails.some((t) => t.nest !== undefined)) { ghost = { a: [me.x, me.y], b: [e.x, e.y] }; msg = "Ready? Drag onto their nest to attack"; } }
            }
        },
        world(d) {
            if (!ghost) return; const g = game, [ax, ay] = ghost.a, [bx, by] = ghost.b, n = 26, z = s.cam.zoom, k = (age * 0.55) % 1, ease = Math.min(1, k * 1.5), hx = ax + (bx - ax) * ease, hy = ay + (by - ay) * ease;
            for (let i = 0; i <= n; i++) { const q = i / n; if (q > ease) break; d.circle(4.5 / z, { x: ax + (bx - ax) * q, y: ay + (by - ay) * q, color: "#fff3d6", opacity: 0.75 }); }
            d.circle(19 / z, { x: hx, y: hy, color: "#ffffff", opacity: 0.32 + Math.sin(age * 8) * 0.1 }); d.circle(13 / z, { x: hx, y: hy, color: "#ffffff", opacity: 0.9 });
        },
        ui(d) { if (!msg) return; const v = s.view, y = v.height - hud.P.bottom - 26, w = msg.length * 7.6 + 34; d.rect(w + 4, 36, { x: v.width / 2, y, color: "#0e0906", radius: 16 }); d.rect(w, 32, { x: v.width / 2, y, color: "#ffe9a8", radius: 14 }); d.text(msg, { x: v.width / 2, y, size: 13.5, bold: true, font: FONT, color: "#2a1505" }); },
        built() {}, focus() {},
    };
}

globalThis.document?.getElementById("load")?.remove();
game.start("title");
