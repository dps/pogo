// CAT BURGLAR. Sable, a very small criminal, steals fish from very grand buildings at night.
import { createGame, pin, rect, tap } from "./pogo.js";
import { DT, PEOPLE, PERKS, Sim } from "./sim.js";
import { BUILDINGS, HEISTS } from "./levels.js";
import { T, buildWorld, lightAt } from "./world.js";
import { AMBER, CATF, CREAM, DUSK, FONT, GF, ICON, INK, MOON, RUST, paintAll } from "./art.js";
import { Stage } from "./stage.js";
import { HEARTBEAT, PURR, SFX, SONGS } from "./audio.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: ["#0a0c18", "#05060e"],
    touch: {},
    actions: { act: ["Space", "KeyE", "Enter", "pad:a"], run: ["ShiftLeft", "ShiftRight", "pad:b"], retry: ["KeyR", "pad:y"] },
    seed: 1, maxDpr: 2,
});
paintAll(game.assets);
globalThis.document?.getElementById("load")?.remove();

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const outBack = (t) => { const c = 1.70158, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };

const SAVE = "catburglar1";
const fresh = () => ({ done: {}, bones: 0, perks: {}, muted: false, haptics: true, caught: 0, seen: {} });
let save = { ...fresh(), ...game.load(SAVE, {}) };
const persist = () => game.save(SAVE, save);
game.audio.muted = !!save.muted;
game.haptics.enabled = save.haptics !== false;

const song = (name) => { if (game.data.song !== name) { game.data.song = name; game.music(SONGS[name]); } };
const nextHeist = () => { for (let i = 0; i < HEISTS.length; i++) if (!save.done[HEISTS[i].id]) return i; return HEISTS.length - 1; };
const unlocked = (i) => i === 0 || !!save.done[HEISTS[i - 1].id] || !!save.done[HEISTS[i].id];
const allDone = () => HEISTS.every((h) => save.done[h.id]);
const canBuy = () => Object.entries(PERKS).some(([k, p]) => !save.perks[k] && save.bones >= p.cost);
/** Test hook: tools jump ahead through this. */
game.grant = (o) => { Object.assign(save, o); persist(); };
game.progress = () => save;

/** Paper-and-brass panel. */
function panel(d, w, h, o = {}) {
    d.rect(w + 4, h + 4, { x: o.x ?? 0, y: (o.y ?? 0) + 2, color: "#000", radius: (o.radius ?? 12) + 2, opacity: 0.5 * (o.opacity ?? 1) });
    d.rect(w, h, { x: o.x ?? 0, y: o.y ?? 0, color: o.color ?? "#14162a", radius: o.radius ?? 12, opacity: o.opacity ?? 0.94 });
    d.rect(w - 2, h - 2, { x: o.x ?? 0, y: o.y ?? 0, color: o.edge ?? "#c9a24d", radius: o.radius ?? 12, outline: 1.3, opacity: (o.opacity ?? 1) * 0.8 });
}

/** A tappable word or icon, drawn by us but real to the audit, the keyboard and the pad. */
function btn(s, anchor, off, w, h, label, onTap, o = {}) {
    const e = s.add([pin(anchor, off), rect(w, h, { color: "#00000000" }), tap(() => { game.sfx(SFX.click, { haptic: "tick" }); onTap(); }), {
        tagName: "btn", update() {
            if (o.action && s.input._quiet(o.action)) { game.sfx(SFX.click, { haptic: "tick" }); onTap(); }
        },
        draw(d, self) {
            const press = self._pressed ? 2 : 0, hot = o.hot?.() ?? false, fill = o.fill ?? "#1a1d36";
            d.rect(w, h, { y: 3, color: "#000", radius: 12, opacity: 0.6 });
            d.rect(w, h, { y: press, color: fill, radius: 12 });
            d.rect(w - 2, h - 2, { y: press, color: hot ? AMBER : "#c9a24d", radius: 11, outline: hot ? 2 : 1.2, opacity: hot ? 0.7 + 0.3 * Math.sin(s.time * 6) : 0.85 });
            if (o.icon !== undefined) {
                const ic = typeof o.icon === "function" ? o.icon() : o.icon;
                d.sprite("icon", { x: label ? -w / 2 + 22 : 0, y: press, frame: ic, width: o.iconSize ?? 22, height: o.iconSize ?? 22 });
            }
            if (label) d.text(label, { x: o.icon !== undefined ? 12 : 0, y: press + 0.5, size: o.size ?? 17, bold: true, font: FONT, color: o.ink ?? CREAM });
        },
    }]);
    return e;
}

function settings(s, anchor, x0, y0, gap = -56) {
    const sound = btn(s, anchor, [x0, y0], 50, 50, "", () => { game.audio.muted = !game.audio.muted; save.muted = game.audio.muted; persist(); }, { icon: () => (game.audio.muted ? ICON.mute : ICON.sound) });
    const buzz = btn(s, anchor, [x0 - gap, y0], 50, 50, "", () => { game.haptics.enabled = !game.haptics.enabled; save.haptics = game.haptics.enabled; persist(); if (game.haptics.enabled) game.haptic("medium"); }, { icon: () => (game.haptics.enabled ? ICON.buzz : ICON.nobuzz) });
    return [sound, buzz];
}

// --- Title ----------------------------------------------------------------------------------------

function nightSky(d, s, moonX, moonY, moonR) {
    const v = s.view;
    for (let i = 0; i < 46; i++) {
        const x = (i * 97.13) % 1 * 0 + ((i * 7919) % 1009) / 1009 * v.width, y = ((i * 4397) % 1013) / 1013 * v.height * 0.62, tw = 0.45 + 0.4 * Math.sin(s.time * (0.7 + (i % 5) * 0.3) + i);
        d.circle(i % 7 === 0 ? 1.3 : 0.8, { x, y, color: "#dfe8ff", opacity: tw });
    }
    d.additive(() => d.sprite("glow", { x: moonX, y: moonY, width: moonR * 5.2, height: moonR * 5.2, color: "#5f86d8", opacity: 0.55 }));
    d.sprite("moon", { x: moonX, y: moonY, width: moonR * 2.35, height: moonR * 2.35 });
}

game.scene("title", (s) => {
    game.touch.enabled = false;
    s.background = ["#0c1230", "#1b2a58"];
    song("title");
    const done = allDone();
    let t = 0, go = false;
    const start = () => { if (go) return; go = true; game.sfx(SFX.chime, { haptic: "light" }); game.go("play", { i: nextHeist() }, { fade: 0.3 }); };
    s.onUpdate((dt) => { t += dt; if (s.input._quiet("act") || s.input._quiet("confirm") || s.input.pointer.tapped) start(); });
    s.onDrawUI((d) => {
        const v = s.view, port = v.height > v.width, cx = v.width / 2;
        const roofY = port ? v.height * 0.76 : v.height * 0.8, moonR = port ? Math.min(v.width * 0.47, 176) : v.height * 0.42;
        const mx = port ? cx : v.width * 0.68, my = port ? roofY - moonR * 0.92 : roofY - moonR * 0.86;
        nightSky(d, s, mx, my, moonR);
        const sw = Math.max(v.width * 1.05, 900);
        d.sprite("skyline", { x: cx - 20 + Math.sin(t * 0.08) * 8, y: roofY - sw * 0.1, width: sw, height: sw * 0.29, color: "#7a8cc0", opacity: 0.5 });
        d.sprite("skyline", { x: cx + 60, y: roofY - sw * 0.075, width: sw * 1.2, height: sw * 0.35, flipX: true });
        // Slate roof catching the moon.
        d.sprite("roof", { x: cx, y: (roofY + v.height) / 2 + 4, width: v.width + 8, height: v.height - roofY + 12 });
        d.rect(v.width + 8, 3, { x: cx, y: roofY, color: "#c4d6ff", opacity: 0.8 });
        const px = port ? cx - 8 : mx - 40, sz = port ? 214 : 180, cy = roofY - sz * 0.39;
        // His shadow falls towards us; the moon is behind him.
        d.push(); d.translate(px, roofY + 4); d.scale(1, -1.5);
        d.sprite("catbig", { y: -sz * 0.42, width: sz, height: sz, color: "#03040c", opacity: 0.62 });
        d.pop();
        // Tail, swishing behind him against the moon.
        const seg = [];
        for (let i = 0; i < 16; i++) {
            const a = i / 15, sw2 = Math.sin(t * 1.3 - a * 2.4) * a * 22;
            seg.push([px + sz * 0.17 + a * 42 + sw2, roofY - 12 - a * 96 + a * a * 30]);
        }
        for (let i = 0; i < 15; i++) d.line(seg[i], seg[i + 1], { width: 14 - i * 0.55, color: "#0e0d18" });
        for (let i = 0; i < 15; i++) d.line(seg[i], seg[i + 1], { width: 9.5 - i * 0.45, color: "#262440" });
        d.additive(() => { for (const [ox, oy] of [[-3, -2], [3, -2], [0, -4]]) d.sprite("catbig", { x: px + ox, y: cy + oy, width: sz, height: sz, color: "#8fb0ff", opacity: 0.4 }); });
        d.sprite("catbig", { x: px, y: cy, width: sz, height: sz, color: "#9aa3e0" });
        d.additive(() => d.sprite("catbigeyes", { x: px, y: cy, width: sz, height: sz, opacity: 0.9 }));
        d.sprite("fish", { x: px - sz * 0.46, y: roofY + 2, frame: 0, width: 70, height: 46, rot: 0.12 + Math.sin(t) * 0.02 });
        if (done) for (let i = 0; i < 5; i++) d.sprite("fish", { x: px + 96 + i * 12, y: roofY + 6 - i * 7, frame: (i + 1) % 5, width: 46, height: 31, rot: (i - 2) * 0.2 });
        const ty = (port ? 62 : 44) + v.safe.top, size = port ? 54 : 44, a = clamp(t / 0.5), drop = (1 - outBack(a)) * -26, tx = port ? cx : Math.max(190, v.width * 0.27);
        if (port) {
            for (const [dx, dy, col, al] of [[2, 3, "#000", 0.6], [0, 0, null, 1]]) {
                d.text("CAT", { x: tx + dx, y: ty + dy + drop, size: size * 1.2, bold: true, color: col ?? CREAM, font: FONT, opacity: al * a });
                d.text("BURGLAR", { x: tx + dx, y: ty + 54 + dy + drop, size, bold: true, color: col ?? AMBER, font: FONT, opacity: al * a });
            }
        } else {
            for (const [dx, dy, col, al] of [[2, 3, "#000", 0.6], [0, 0, null, 1]]) {
                d.text("CAT", { x: tx + dx, y: ty + dy + drop, size: size * 1.2, bold: true, color: col ?? CREAM, font: FONT, opacity: al * a });
                d.text("BURGLAR", { x: tx + dx, y: ty + 46 + dy + drop, size, bold: true, color: col ?? AMBER, font: FONT, opacity: al * a });
            }
        }
        const line = done ? "Every fish in the city is yours." : "He does not need the fish. He wants the fish.";
        d.text(line, { x: tx, y: port ? ty + 90 : ty + 80, size: 14, font: FONT, color: "#dbe6ff", opacity: clamp(t - 0.3), maxWidth: port ? 0 : 320 });
        const pulse = 0.6 + 0.4 * Math.sin(t * 3.4);
        const label = Object.keys(save.done).length ? "Tap to prowl" : "Tap to begin";
        d.text(label, { x: port ? cx : tx, y: port ? v.height - 92 - v.safe.bottom : v.height * 0.62, size: 22, bold: true, font: FONT, color: CREAM, opacity: pulse * clamp(t - 0.4) });
    });
    btn(s, "bottom-left", [12, 12], 104, 50, "Heists", () => { go = true; game.go("map", {}, { fade: 0.25 }); }, { size: 16 });
    settings(s, "bottom-right", 12, 12, -56);
});

// --- Case files -----------------------------------------------------------------------------------

game.scene("map", (s, a) => {
    game.touch.enabled = false;
    s.background = ["#10122a", "#070814"];
    song("title");
    const pages = BUILDINGS.map((b) => ({ ...b, list: HEISTS.map((h, i) => [h, i]).filter(([h]) => h.theme === b.theme) }));
    let page = a?.page ?? Math.max(0, pages.findIndex((p) => p.list.some(([, i]) => i === nextHeist()))), sel = 0, t = 0;
    let slide = 0;
    const turn = (n) => { const q = clamp(page + n, 0, pages.length - 1); if (q !== page) { slide = n * 1; page = q; sel = 0; game.sfx(SFX.tick, { haptic: "tick" }); } };
    const cards = () => {
        const v = s.view, port = v.height > v.width, list = pages[page].list, cols = port ? 1 : 2, w = port ? Math.min(v.width - 28, 340) : Math.min((v.width - 110) / 2, 270), h = port ? 76 : 70, gap = 9;
        const y0 = (port ? 150 : 96) + v.safe.top, x0 = v.width / 2 - (cols - 1) * (w + gap) / 2;
        return list.map(([he, i], k) => ({ he, i, x: x0 + (k % cols) * (w + gap), y: y0 + Math.floor(k / cols) * (h + gap) + h / 2, w, h }));
    };
    const open = (i) => { if (unlocked(i)) { game.sfx(SFX.chime, { haptic: "light" }); game.go("play", { i }, { fade: 0.25 }); } else { game.sfx(SFX.giveup, { haptic: "warn" }); } };
    s.onUpdate((dt) => {
        t += dt; slide *= Math.exp(-dt * 12);
        const I = s.input, p = I.pointer, list = pages[page].list;
        if (I.swipe === "left") turn(1); else if (I.swipe === "right") turn(-1);
        if (I.pressed("right")) turn(1); if (I.pressed("left")) turn(-1);
        if (I.pressed("down")) sel = (sel + 1) % list.length; if (I.pressed("up")) sel = (sel + list.length - 1) % list.length;
        if (I._quiet("act") || I._quiet("confirm")) open(list[sel][1]);
        if (p.tapped) for (const c of cards()) if (Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) open(c.i);
    });
    s.onDrawUI((d) => {
        const v = s.view, port = v.height > v.width, pg = pages[page], top = v.safe.top;
        d.additive(() => d.sprite("glow", { x: v.width / 2, y: 40, width: v.width * 1.6, height: 300, color: "#3f5fb0", opacity: 0.4 }));
        d.text("CASE FILES", { x: v.width / 2, y: top + 26, size: 15, bold: true, font: FONT, color: "#8fa0c8" });
        d.text(pg.name, { x: v.width / 2 - slide * 80, y: top + 54, size: port ? 25 : 24, bold: true, font: FONT, color: CREAM });
        if (port) d.text(pg.blurb, { x: v.width / 2, y: top + 86, size: 13, font: FONT, color: MOON, maxWidth: v.width - 60, opacity: 0.85, align: "center" });
        const ghosts = Object.values(save.done).filter((r) => r.ghost).length, chaos = Object.values(save.done).filter((r) => r.chaos).length;
        d.text(`${Object.keys(save.done).length}/${HEISTS.length} fish  ·  ${ghosts} ghost  ·  ${chaos} chaos`, { x: v.width / 2, y: v.height - v.safe.bottom - (port ? 84 : 76), size: 13, font: FONT, color: "#8fa0c8" });
        for (let i = 0; i < pages.length; i++) d.circle(i === page ? 4 : 2.6, { x: v.width / 2 + (i - (pages.length - 1) / 2) * 14, y: top + (port ? 116 : 76), color: i === page ? AMBER : "#5a6488" });
        cards().forEach((c, k) => {
            const open = unlocked(c.i), rec = save.done[c.he.id], hot = c.i === nextHeist() && !rec, focus = k === sel && !s.input.touchMode;
            d.push(); d.translate(c.x - slide * 120, c.y);
            panel(d, c.w, c.h, { color: open ? "#191c34" : "#10111f", edge: hot ? AMBER : open ? "#c9a24d" : "#3a3f5a", opacity: 1 });
            if (focus) d.rect(c.w + 6, c.h + 6, { color: AMBER, radius: 14, outline: 2 });
            d.circle(21, { x: -c.w / 2 + 31, color: open ? "#0c0d1c" : "#0a0b14" });
            if (open) d.sprite("fish", { x: -c.w / 2 + 31, frame: c.he.fish ?? 0, width: 38, height: 25, color: rec ? "#fff" : "#5a5f78" });
            else d.sprite("icon", { x: -c.w / 2 + 31, frame: ICON.lock, width: 22, height: 22, color: "#6a7090" });
            leftText(d, `${c.i + 1}. ${open ? c.he.title : "Locked"}`, -c.w / 2 + 60, rec ? -18 : -11, 15.5, open ? CREAM : "#6a7090", true);
            if (open) leftText(d, c.he.target, -c.w / 2 + 60, rec ? 3 : 11, 12, "#a9b4d4");
            if (rec) {
                const lootN = c.he.map.join("").replace(/[^$%&]/g, "").length;
                leftText(d, `loot ${rec.bonus}/${lootN}`, -c.w / 2 + 60, 21, 11, "#8fa0c8");
                stampMini(d, c.w / 2 - 32, -14, "GHOST", rec.ghost, "#7fd0ff");
                stampMini(d, c.w / 2 - 32, 14, "CHAOS", rec.chaos, "#ff8a5a");
            }
            d.pop();
        });
    });
    btn(s, "bottom-left", [12, 12], 96, 50, "Back", () => game.go("title", {}, { fade: 0.2 }), { size: 15, action: "pause" });
    btn(s, "bottom-right", [12, 12], 94, 50, `${save.bones}`, () => game.go("shop", {}, { fade: 0.2 }), { icon: ICON.bone, size: 16, hot: canBuy });
    btn(s, "bottom", [-38, 12], 56, 50, "<", () => turn(-1), { size: 20 });
    btn(s, "bottom", [38, 12], 56, 50, ">", () => turn(1), { size: 20 });
});

function stampMini(d, x, y, word, on, col) {
    d.rect(52, 18, { x, y, color: on ? col : "#2a2e48", radius: 3, outline: 1.3, opacity: on ? 1 : 0.6 });
    d.text(word, { x, y: y + 0.5, size: 10.5, bold: true, font: FONT, color: on ? col : "#3f4464" });
}

// --- The alley: gadgets, sold by a cat who has seen things ------------------------------------------

game.scene("shop", (s) => {
    game.touch.enabled = false;
    s.background = ["#141228", "#07060f"];
    song("shop");
    const keys = Object.keys(PERKS);
    const ICONS = { velvet: ICON.paw, coat: ICON.eyeShut, spring: ICON.leap, yarn: ICON.yarn, flatbox: ICON.box, lives: ICON.heart };
    let t = 0, sel = 0, flash = -9, flashK = "", msg = "Fishbones first. Questions later.";
    const layout = () => {
        const v = s.view, port = v.height > v.width, cols = port ? 1 : 2, w = port ? Math.min(v.width - 24, 346) : Math.min((v.width - 40) / 2, 296), h = port ? 66 : 62, gap = 7, y0 = v.safe.top + (port ? 118 : 72);
        const x0 = v.width / 2 - (cols - 1) * (w + gap) / 2;
        return keys.map((k, i) => ({ k, x: x0 + (i % cols) * (w + gap), y: y0 + Math.floor(i / cols) * (h + gap) + h / 2, w, h }));
    };
    const buy = (k) => {
        const p = PERKS[k];
        if (save.perks[k]) { msg = "Already yours. I don't do refunds."; return; }
        if (save.bones < p.cost) { game.sfx(SFX.giveup, { haptic: "warn" }); msg = `${p.cost - save.bones} more bones, kitten.`; return; }
        save.bones -= p.cost; save.perks[k] = true; persist();
        game.sfx(SFX.buy, { haptic: "success" }); flash = t; flashK = k; msg = "Pleasure. You never saw me.";
    };
    s.onUpdate((dt) => {
        t += dt;
        const I = s.input, p = I.pointer;
        if (I.pressed("down")) sel = (sel + 1) % keys.length; if (I.pressed("up")) sel = (sel + keys.length - 1) % keys.length;
        if (I._quiet("act") || I._quiet("confirm")) buy(keys[sel]);
        if (p.tapped) for (const c of layout()) if (Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2) buy(c.k);
    });
    s.onDrawUI((d) => {
        const v = s.view, port = v.height > v.width, top = v.safe.top;
        d.additive(() => d.sprite("glow", { x: v.width * 0.5, y: 10, width: v.width * 1.3, height: 260, color: "#a0602a", opacity: 0.32 }));
        d.text("THE ALLEY", { x: v.width / 2, y: top + 26, size: 25, bold: true, font: FONT, color: CREAM });
        d.text(msg, { x: v.width / 2, y: top + (port ? 56 : 52), size: 14, font: FONT, color: AMBER });
        if (port) { d.sprite("icon", { x: v.width / 2 - 26, y: top + 86, frame: ICON.bone, width: 28, height: 28 }); d.text(`${save.bones}`, { x: v.width / 2 + 12, y: top + 86, size: 21, bold: true, font: FONT, color: CREAM }); }
        layout().forEach((c, i) => {
            const p = PERKS[c.k], own = !!save.perks[c.k], can = save.bones >= p.cost, pop = t - flash < 0.3 && flashK === c.k ? 1 + (0.3 - (t - flash)) * 0.3 : 1;
            d.push(); d.translate(c.x, c.y); d.scale(pop, pop);
            panel(d, c.w, c.h, { color: own ? "#1e2a30" : "#191730", edge: own ? "#7fd0a8" : can ? AMBER : "#5a5068", opacity: 1 });
            if (i === sel && !s.input.touchMode) d.rect(c.w + 6, c.h + 6, { color: AMBER, radius: 14, outline: 2 });
            d.circle(20, { x: -c.w / 2 + 30, color: "#0c0d1c" });
            d.sprite("icon", { x: -c.w / 2 + 30, frame: ICONS[c.k], width: 24, height: 24, color: own || can ? "#fff" : "#7a7f96" });
            leftText(d, p.name, -c.w / 2 + 58, -13, 15, CREAM, true);
            leftText(d, p.blurb, -c.w / 2 + 58, 9, 10.8, "#b4bcd8", false, c.w - 118);
            if (own) d.text("OWNED", { x: c.w / 2 - 32, y: -14, size: 10.5, bold: true, font: FONT, color: "#7fd0a8" });
            else { d.sprite("icon", { x: c.w / 2 - 42, y: -14, frame: ICON.bone, width: 18, height: 18, color: can ? "#fff" : "#7a7f96" }); d.text(`${p.cost}`, { x: c.w / 2 - 22, y: -14, size: 15, bold: true, font: FONT, color: can ? AMBER : "#7a7f96" }); }
            d.pop();
        });
    });
    btn(s, "bottom-left", [12, 12], 96, 50, "Back", () => game.go("map", {}, { fade: 0.2 }), { size: 15, action: "pause" });
    btn(s, "bottom-right", [12, 12], 132, 50, "Next heist", () => game.go("play", { i: nextHeist() }, { fade: 0.25 }), { size: 14 });
});

/** Text that starts at x, by measuring once. */
const measures = new Map();
function leftText(d, str, x, y, size, color, bold = false, maxWidth = 0) {
    const key = `${str}|${size}|${bold}|${maxWidth}`;
    let w = measures.get(key);
    if (w === undefined) {
        const L = game.renderer.measureText(str, { size, font: FONT, bold, align: "left", maxWidth, lineHeight: 1.18 });
        w = L.width; measures.set(key, w);
    }
    d.text(str, { x: x + w / 2, y, size, bold, font: FONT, color, maxWidth, align: "left", lineHeight: 1.18 });
}

// --- The heist --------------------------------------------------------------------------------------

const CAUGHT = {
    pemberton: ["\"Who's a fluffy little felon?\"", "\"Come on, Tiddles. Outside.\"", "\"My word, you're long.\""],
    bea: ["\"Gotcha! You smell of sardines.\"", "\"Back to the alley, mister.\""],
    gus: ["\"Oh, you're heavier than my lunch.\"", "\"Sit. Good boy. Is it a boy?\""],
    hubert: ["\"This will all go in the memo.\"", "\"Do not shed on the exhibits.\""],
    milo: ["\"Gotcha! Ah... AH... CHOO!\"", "\"Why is it always cats?\""],
    dolores: ["\"Twenty years. I knew it was a cat.\"", "\"Tell it to the judge, whiskers.\""],
    chef: ["\"Ze fish is for ze paying guests!\"", "\"Out of my kitchen, you furry sock!\""],
    sarge: ["\"Dishonourable discharge, soldier.\"", "\"Nice try, sunshine.\""],
    dog: ["Biscuit is delighted. Biscuit licks you all over.", "You have been thoroughly slobbered."],
};
const PILLS = { knock: "knock it off", vent: "squeeze in", box: "hide in the box", unbox: "climb out", yarn: "bowl the yarn", flatbox: "unfold your box" };

game.scene("play", (s, a) => {
    game.touch.enabled = false;
    const i = clamp(a?.i ?? a?.level ?? 0, 0, HEISTS.length - 1), def = HEISTS[i];
    s.background = "#05060e";
    const audio = {
        heart(t) { game.sfx(SFX.heart, { haptic: t > 0.6 ? [16, 90, 12] : HEARTBEAT }); },
        alert(on) { if (on) song("chase"); },
    };
    let sim = new Sim(def, { perks: save.perks });
    const stage = new Stage(game, s, sim, audio);
    game.sim = sim; game.stage = stage;
    game.data.heist = i; game.data.status = "play";
    song("prowl");

    const drone = game.audio.voice({ wave: "sine", freq: 55, volume: 0 });
    const offScene = game.on("scene", () => { drone.stop(); offScene(); });
    let thumb = null, time = 0, caughtT = -1, line = "", catcher = null, intro = save.seen[def.id] ? 0 : 1.5, banner = 3.2, wonT = -1, calm = 0, tries = 0, hintGone = {};
    save.seen[def.id] = true;
    const introFrom = [buildWorld(def).target.x, buildWorld(def).target.y];
    s.paused = false;
    let menu = null, act = false, menuStep = -1;

    const retry = () => {
        if (menu) { menuStep = -1; closeMenu(); }
        tries++;
        sim = new Sim(def, { perks: save.perks });
        game.sim = sim; game.data.status = "play";
        stage.reset(sim);
        caughtT = -1; catcher = null; banner = 0; thumb = null; wonT = -1; intro = 0;
        song("prowl");
    };

    const openMenu = () => {
        if (menu || caughtT >= 0 || sim.status !== "play") return;
        s.paused = true; menuStep = game.stepCount;
        const list = [];
        const add = (e) => { list.push(e); return e; };
        add(s.add([rect(4000, 4000, { color: "#04050cb8" }), pin("center", [0, 0]), tap(() => {}), { paused: false }]));
        add(btn(s, "center", [0, -62], 200, 50, "Keep prowling", closeMenu, { action: "pause" }));
        add(btn(s, "center", [0, -6], 200, 50, "Start over", retry));
        add(btn(s, "center", [0, 50], 200, 50, "Case files", () => { s.paused = false; game.go("map", {}, { fade: 0.2 }); }));
        for (const e of settings(s, "center", 28, 112, 56)) add(e);
        menu = list;
    };
    function closeMenu() { if (!menu || game.stepCount === menuStep) return; for (const e of menu) e.destroy(); menu = null; s.paused = false; }

    btn(s, "top-left", [10, 8], 50, 50, "", openMenu, { icon: ICON.menu, iconSize: 20, action: "pause" });

    const finish = () => {
        const g = sim.grade(), rec = save.done[def.id] ?? { ghost: false, chaos: false, bonus: 0, best: 0 };
        let gain = 0;
        const first = !save.done[def.id];
        if (first) gain += 1;
        if (g.got > rec.bonus) gain += g.got - rec.bonus;
        if (g.ghost && !rec.ghost) gain += 2;
        if (g.chaos && !rec.chaos) gain += 2;
        save.done[def.id] = { ghost: rec.ghost || g.ghost, chaos: rec.chaos || g.chaos, bonus: Math.max(rec.bonus, g.got), best: rec.best ? Math.min(rec.best, g.time) : g.time };
        save.bones += gain; persist();
        game.data.last = { heist: i, ...g, gain };
        game.go("rank", { i, g, gain, rec: sim.rec, tries, tex: stage.tex }, { fade: 0.35 });
    };

    s.onUpdate((dt) => {
        time += dt;
        const I = s.input, p = I.pointer;
        // A drag from anywhere is the stick. A short tap is the action.
        let mx = 0, my = 0;
        act = act || I._quiet("act") || I.pressed("act");
        if (I.pressed("retry")) retry();
        if (caughtT >= 0) {
            caughtT += dt;
            if (caughtT > 0.45 && (p.tapped || p.released || act || I._quiet("confirm"))) retry();
            act = false;
            stage.before(); stage.after(dt, null);
            return;
        }
        if (p.pressed) thumb = { x0: p.x, y0: p.y, x: p.x, y: p.y, t: 0, moved: false };
        if (thumb && p.down) {
            thumb.t += dt; thumb.x = p.x; thumb.y = p.y;
            let dx = p.x - thumb.x0, dy = p.y - thumb.y0, len = Math.hypot(dx, dy);
            const R = 64;
            if (len > 9) thumb.moved = true;
            if (len > R) { thumb.x0 = p.x - (dx / len) * R; thumb.y0 = p.y - (dy / len) * R; dx = p.x - thumb.x0; dy = p.y - thumb.y0; len = R; }
            if (thumb.moved) { mx = dx / R; my = dy / R; thumb.mag = len / R; }
        }
        if (thumb && (p.released || !p.down)) { if (!thumb.moved && thumb.t < 0.32) act = true; thumb = null; }
        const k = I.move;
        if (k.lenSq() > 0.01) { const len = k.len(), f = (I.down("run") ? 1 : Math.min(0.7, len)) / len; mx = k.x * f; my = k.y * f; }

        if (intro > 0) {
            intro -= dt;
            if (act || p.pressed || k.lenSq() > 0.01) intro = 0;
            const u = clamp(1 - intro / 1.5), e = u * u * (3 - 2 * u);
            act = false;
            stage.camX = lerp(introFrom[0], sim.cat.x, e); stage.camY = lerp(introFrom[1], sim.cat.y, e);
            s.cam.pos = [stage.camX, stage.camY];
            return;
        }
        banner -= dt;
        stage.before();
        sim.step({ mx, my, act });
        act = false;
        stage.after(dt, thumb);
        game.data.tension = +sim.tension().toFixed(2);
        drone.set({ freq: 55 + sim.tension() * 14, volume: sim.status === "play" ? 0.05 * sim.tension() : 0 });
        // Music relaxes a beat after everyone calms down.
        if (sim.alert) calm = 3.5;
        else if (calm > 0) { calm -= dt; if (calm <= 0 && game.data.song === "chase") song("prowl"); }
        if (sim.status === "caught") {
            caughtT = 0;
            const g = sim.guards[sim.catcher];
            catcher = g; game.data.status = "caught";
            save.caught++; persist();
            line = game.fxRng.pick(CAUGHT[g.kind === "dog" ? "dog" : g.who] ?? CAUGHT.pemberton);
            game.stopMusic(); game.data.song = "";
        }
        if (sim.status === "won" && wonT < 0) {
            wonT = 0; game.data.status = "won";
            game.haptic(PURR);
            s.wait(0.5, finish);
        }
    });

    s.onDraw((d) => stage.drawWorld(d));

    s.onDrawUI((d) => {
        if (game.headless) return;
        const v = s.view, top = v.safe.top, port = v.height > v.width, c = sim.cat, t = sim.t;
        // Noir vignette, and it closes in as suspicion rises.
        const beat = stage.hbT, ten = stage.tension;
        d.sprite("vignette", { x: v.width / 2, y: v.height / 2, width: v.width * 1.25, height: v.height * 1.2 });
        if (ten > 0.05) d.additive(() => d.sprite("vignette", { x: v.width / 2, y: v.height / 2, width: v.width * 1.05, height: v.height * 1.03, color: "#ff2010", opacity: ten * (0.22 + beat * 0.3) }));
        // Goal arrow, when it's off screen.
        const goal = c.fish ? stage.world.start : stage.world.target, gp = s.cam.toView([goal.x, goal.y]);
        if (gp.x < 20 || gp.y < 20 || gp.x > v.width - 20 || gp.y > v.height - 20) {
            const cx = v.width / 2, cy = v.height / 2, dx = gp.x - cx, dy = gp.y - cy, k = Math.min((v.width / 2 - 26) / Math.abs(dx || 1), (v.height / 2 - 78) / Math.abs(dy || 1)), ax = cx + dx * k, ay = cy + dy * k, an = Math.atan2(dy, dx);
            d.circle(15, { x: ax, y: ay, color: INK, opacity: 0.8 });
            d.sprite(c.fish ? "icon" : "fish", { x: ax, y: ay, frame: c.fish ? ICON.paw : def.fish ?? 0, width: c.fish ? 15 : 24, height: c.fish ? 15 : 16 });
            d.push(); d.translate(ax + Math.cos(an) * 20, ay + Math.sin(an) * 20); d.rotate(an);
            d.poly([[6, 0], [-4, -6], [-4, 6]], { color: c.fish ? "#7fe0a8" : AMBER });
            d.pop();
        }
        // Guards we can't see, if they are coming.
        for (const g of sim.guards) {
            if (g.kind === "cam" || g.kind === "spot" || g.s < 0.2) continue;
            const q = s.cam.toView([g.x, g.y]);
            if (q.x > 0 && q.y > 0 && q.x < v.width && q.y < v.height) continue;
            d.circle(5, { x: clamp(q.x, 10, v.width - 10), y: clamp(q.y, top + 10, v.height - 10), color: g.state === "chase" ? RUST : AMBER, opacity: 0.8 + 0.2 * Math.sin(t * 9) });
        }
        // The eye: how visible you are right now, wrapped in how suspicious they are.
        const l = lightAt(stage.world, c.x, c.y, sim.snuffed), ex = v.width / 2, ey = top + 30;
        d.circle(21 + beat * 2.5, { x: ex, y: ey, color: INK, opacity: 0.86 });
        d.circle(21 + beat * 2.5, { x: ex, y: ey, color: ten > 0.6 ? RUST : ten > 0.05 ? AMBER : "#39406a", outline: 2.2 + ten * 2 });
        d.sprite("icon", { x: ex, y: ey, frame: l > 0.33 || c.mode === "leap" ? ICON.eye : ICON.eyeShut, width: 26, height: 26, color: l > 0.33 ? "#fff" : "#8fa0c8" });
        if (ten > 0.02) for (let n = 0; n < 24 * ten; n++) { const a0 = -Math.PI / 2 + n / 24 * Math.PI * 2; d.circle(1.9, { x: ex + Math.cos(a0) * 25, y: ey + Math.sin(a0) * 25, color: ten > 0.6 ? "#ff6a4a" : AMBER }); }
        // Fish and loot tally.
        const lx = v.width - 22;
        d.sprite("fish", { x: lx - 4, y: top + 22, frame: def.fish ?? 0, width: 32, height: 21, color: c.fish ? "#fff" : "#3a3f5c" });
        sim.loot.forEach((b, n) => d.sprite("loot", { x: lx - 2 - n * 19, y: top + 46, frame: n % 4, width: 19, height: 19, color: b.got ? "#fff" : "#2e3248" }));
        // Heist banner.
        if ((banner > 0 || intro > 0) && caughtT < 0) {
            const u = intro > 0 ? 1 : clamp(banner / 0.4), y = port ? top + 92 : top + 66, ww = Math.min(v.width - 40, 310);
            panel(d, ww, 52, { x: v.width / 2, y: y - (1 - u) * 14, opacity: u });
            d.text(`Heist ${i + 1}: ${def.title}`, { x: v.width / 2, y: y - 11 - (1 - u) * 14, size: 16, bold: true, font: FONT, color: CREAM, opacity: u });
            d.text(`Steal ${def.target}`, { x: v.width / 2, y: y + 11 - (1 - u) * 14, size: 13, font: FONT, color: AMBER, opacity: u });
        }
        // World hints, teaching by being in the way.
        for (const h of def.hints ?? []) {
            const hx = (h.c + 0.5) * T, hy = (h.r + 0.5) * T, dd = Math.hypot(c.x - hx, c.y - hy);
            if (dd > (h.reach ?? 3.2) * T || h.when && !hintWhen(h.when)) continue;
            const y = port ? v.height - 150 : v.height - 74;
            const pw = Math.min(v.width - 30, h.text.length * 7.4 + 30), two = h.text.length * 7.4 + 30 > v.width - 30, op = clamp(1.6 - dd / (T * 2));
            panel(d, pw, two ? 54 : 34, { x: v.width / 2, y: y - (two ? 10 : 0), opacity: op });
            d.text(h.text, { x: v.width / 2, y: y - (two ? 10 : 0), size: 14, bold: true, font: FONT, color: CREAM, opacity: op, maxWidth: pw - 22, align: "center" });
        }
        // What a tap does right now.
        const ctx = stage.ctx;
        const verb = ctx?.type === "rub" ? (sim.guards[ctx.g].kind === "dog" ? "rub the dog" : "rub those legs") : PILLS[ctx?.type];
        if (verb && caughtT < 0) {
            const label = `${s.input.touchMode ? "Tap" : "Space"}: ${verb}`;
            const y = port ? v.height - 96 : v.height - 30, w = label.length * 7.8 + 32, bob = Math.sin(t * 5) * 1.5;
            d.rect(w, 32, { x: v.width / 2, y: y + bob, color: AMBER, radius: 16 });
            d.text(label, { x: v.width / 2, y: y + bob, size: 15, bold: true, font: FONT, color: INK });
        }
        // First-time thumb lesson.
        if (i === 0 && !thumb && t < 7 && c.speed < 5 && intro <= 0) {
            const u = (time * 0.7) % 1, x = v.width / 2, y = v.height * (port ? 0.76 : 0.72), dy = -Math.sin(u * Math.PI) * 44;
            d.circle(30, { x, y, color: CREAM, opacity: 0.35, outline: 2 });
            d.sprite("icon", { x, y: y + dy, frame: ICON.paw, width: 34, height: 34, opacity: 0.9 });
            d.text(s.input.touchMode ? "Drag to slink. Drag far to run." : "Drag or arrow keys. Shift to run.", { x, y: y + 48, size: 15, bold: true, font: FONT, color: CREAM });
        }
        // Thumb stick.
        if (thumb?.moved) {
            const run = (thumb.mag ?? 0) > 0.72;
            d.circle(64, { x: thumb.x0, y: thumb.y0, color: run ? "#ffb060" : MOON, opacity: 0.45, outline: 2 });
            d.circle(64 * 0.72, { x: thumb.x0, y: thumb.y0, color: MOON, opacity: 0.18, outline: 1 });
            d.sprite("icon", { x: thumb.x, y: thumb.y, frame: ICON.paw, width: 30, height: 30, opacity: 0.8, color: run ? "#ffc080" : "#fff" });
        }
        if (caughtT >= 0) drawCaught(d, v, caughtT, catcher, line);
    });

    const hintWhen = (w) => (w === "fish" ? sim.cat.fish : w === "nofish" ? !sim.cat.fish : true);

    function drawCaught(d, v, t, g, line) {
        const u = clamp(t / 0.3), e = outBack(u), port = v.height > v.width, cx = v.width / 2, cy = v.height * (port ? 0.42 : 0.5);
        d.rect(v.width + 4, v.height + 4, { x: cx, y: v.height / 2, color: "#05060e", opacity: 0.82 * u });
        d.additive(() => d.sprite("glow", { x: cx, y: cy - 10, width: 420, height: 420, color: "#ffc35a", opacity: 0.32 * u }));
        const sc = (port ? 2.3 : 1.7) * e, left = port ? 0 : -130;
        d.push(); d.translate(cx + left, cy);
        const wig = Math.sin(t * 4) * 0.05;
        if (g.kind === "dog") {
            d.sprite("dog", { y: 30, frame: 4, width: 150 * e, height: 112 * e });
            d.sprite("cat", { x: 30, y: -24, frame: CATF.sit, width: 92 * e, height: 92 * e, rot: wig + 0.3 });
        } else {
            d.sprite("guard_" + g.who, { y: -6, frame: GF.hold, width: 88 * sc * 0.9, height: 124 * sc * 0.9 });
            d.sprite("catlong", { y: 46 * e + Math.sin(t * 3) * 2, width: 190 * e * (port ? 1 : 0.8), height: 190 * e * (port ? 1 : 0.8), rot: wig });
        }
        d.pop();
        const tx = port ? cx : cx + 120, ty = port ? v.height - 180 : cy - 34, a = clamp((t - 0.2) / 0.3);
        d.text("BOOPED", { x: tx, y: ty + 2, size: 44, bold: true, font: FONT, color: "#000", opacity: a });
        d.text("BOOPED", { x: tx, y: ty, size: 44, bold: true, font: FONT, color: AMBER, opacity: a });
        d.text(line, { x: tx, y: ty + 50, size: 16, font: FONT, color: CREAM, opacity: a, maxWidth: port ? v.width - 50 : 280, align: "center" });
        const who = g.kind === "dog" ? "Biscuit, Good Boy" : PEOPLE[g.who]?.name;
        d.text(`- ${who}`, { x: tx, y: ty + 86, size: 13, font: FONT, color: "#8fa0c8", opacity: a });
        d.text("Tap to try again", { x: tx, y: ty + 118, size: 18, bold: true, font: FONT, color: CREAM, opacity: t > 0.45 ? 0.65 + 0.35 * Math.sin(t * 5) : 0 });
    }
});

// --- Rank and security footage ----------------------------------------------------------------------

game.scene("rank", (s, a) => {
    game.touch.enabled = false;
    s.background = ["#0c0e1e", "#05060e"];
    song("smug");
    const { i, g, gain, rec, tex } = a ?? {};
    if (!g) { game.go("title"); return; }
    const def = HEISTS[i], w = buildWorld(def);
    const frames = rec.cat.length / 3, total = frames * 0.2, SPEED = Math.max(4, total / 7);
    let t = 0, clock = 0, stampAt = -1, stamped = 0, shown = 0, stop = false;
    const lines = [
        ["Target", def.target],
        ["Loot", `${g.got} of ${g.total}`],
        ["Time", fmt(g.time)],
        ["Smashed", `${g.smashed}`],
        ["Times spotted", `${g.chases + g.alarms + g.lasers}`],
    ];
    const purr = game.audio.voice({ wave: "sawtooth", freq: 46, volume: 0 });
    game.haptic(PURR);
    s.every(2.6, () => { if (!stop) game.haptic(PURR); });
    const skip = () => { if (clock < total) clock = total; };
    s.onUpdate((dt) => {
        t += dt;
        const u = clock < total ? 0 : 1;
        if (clock < total) { clock += dt * SPEED; if (s.input.pointer.tapped) skip(); }
        else {
            if (stampAt < 0) stampAt = t + 0.2;
            const n = t - stampAt;
            if (stamped === 0 && n >= 0) { stamped = 1; stampHit(); }
                }
        void u;
        shown = Math.min(gain, shown + dt * 4);
        purr.set({ volume: stop ? 0 : 0.035 + 0.022 * Math.sin(t * 25) * Math.sin(t * 2.4), freq: 46 + Math.sin(t * 2.4) * 3 });
    });
    const stampHit = () => { game.sfx(SFX.stamp, { haptic: "heavy" }); s.shake(4, 0.2, { haptic: false }); s.freeze(0.06); };

    s.onDrawUI((d) => {
        const v = s.view, port = v.height > v.width, top = v.safe.top;
        // The monitor.
        const mw = port ? v.width - 24 : Math.min(v.width * 0.52, v.height - 40) * 1.05, mh = port ? Math.min(v.height * 0.42, 280) : v.height - 28, mx = port ? v.width / 2 : mw / 2 + 12, my = port ? top + mh / 2 + 10 : v.height / 2;
        d.rect(mw + 10, mh + 10, { x: mx, y: my, color: "#22242f", radius: 10 });
        d.rect(mw, mh, { x: mx, y: my, color: "#02030a", radius: 5 });
        const fit = Math.min((mw - 12) / w.width, (mh - 12) / w.height);
        d.push(); d.translate(mx, my); d.scale(fit, fit); d.translate(-w.width / 2, -w.height / 2);
        d.sprite(tex, { x: w.width / 2, y: w.height / 2, width: w.width, height: w.height, color: "#a8d0c8" });
        const nowF = Math.min(frames - 1, Math.floor(clock / 0.2));
        const f0 = Math.max(0, nowF);
        // Guards as they were.
        const row = rec.guards[f0] ?? [];
        d.additive(() => row.forEach((p, n) => {
            const ga = sim0(def, n);
            if (ga === "cam" || ga === "guard") {
                const A = p[2], R = (ga === "cam" ? 4.2 : 3.6) * T, W = 0.5;
                d.poly([[p[0], p[1]], [p[0] + Math.cos(A - W) * R, p[1] + Math.sin(A - W) * R], [p[0] + Math.cos(A + W) * R, p[1] + Math.sin(A + W) * R]], { color: p[3] === 2 ? "#ff3020" : p[3] === 1 ? "#ffb030" : "#ffd27a", opacity: 0.22 });
            }
        }));
        row.forEach((p, n) => { if (sim0(def, n) !== "spot") d.circle(8, { x: p[0], y: p[1], color: p[3] === 2 ? "#ff3020" : "#ffd27a" }); });
        // His route, a dotted line of paw prints.
        for (let k = 0; k <= f0; k++) {
            const x = rec.cat[k * 3], y = rec.cat[k * 3 + 1], m = rec.cat[k * 3 + 2];
            if (m !== 1) d.circle(3.2, { x, y, color: "#7fe0ff", opacity: 0.5 + 0.5 * (k / Math.max(1, f0)) });
        }
        const mk = { curious: ["?", "#ffd24a"], spotted: ["!", "#ff4a30"], smash: ["*", "#ffb36a"], fish: ["F", "#ffd76a"], alarm: ["!", "#ff4a30"], creak: ["~", "#ffd27a"] };
        for (const m of rec.marks) {
            if (m.t > clock) continue;
            const q = mk[m.kind]; if (!q) continue;
            const age = clock - m.t, pop = 1 + Math.max(0, 1 - age / 2) * 0.8;
            d.push(); d.translate(m.x, m.y - 16); d.scale(pop, pop); d.text(q[0], { size: 26, bold: true, font: FONT, color: q[1] }); d.pop();
        }
        if (f0 >= 0 && rec.cat.length) {
            const x = rec.cat[f0 * 3], y = rec.cat[f0 * 3 + 1];
            d.additive(() => d.sprite("glow", { x, y, width: 120, height: 120, color: "#7fe0ff", opacity: 0.7 }));
            d.sprite("cat", { x, y: y - 8, frame: CATF.side, width: 54, height: 54 });
        }
        d.pop();
        // Scanlines and the camera's little words.
        for (let y = my - mh / 2 + 2; y < my + mh / 2; y += 3) d.rect(mw - 2, 1, { x: mx, y, color: "#000", opacity: 0.16 });
        const sec = Math.floor(clock), rl = (s.time * 1.5) % 1 < 0.6;
        if (rl) d.circle(4, { x: mx - mw / 2 + 12, y: my - mh / 2 + 12, color: "#ff3030" });
        d.text("REC", { x: mx - mw / 2 + 32, y: my - mh / 2 + 12, size: 12, bold: true, color: "#ff8080" });
        d.text(`03:${String(12 + Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`, { x: mx + mw / 2 - 40, y: my - mh / 2 + 12, size: 12, bold: true, color: "#9fe0c8" });
        if (clock < total) d.text("Tap to skip", { x: mx, y: my + mh / 2 - 12, size: 12, bold: true, color: "#9fe0c8", opacity: 0.7 });
        // The report.
        const px = port ? v.width / 2 : mw + 24 + (v.width - mw - 36) / 2, pw = port ? v.width - 32 : v.width - mw - 42, py = port ? my + mh / 2 + 16 : 14 + v.safe.top, ph = port ? v.height - (my + mh / 2 + 16) - 84 - v.safe.bottom : v.height - 94 - v.safe.bottom - v.safe.top, py1 = py + ph / 2;
        d.rect(pw + 4, ph + 4, { x: px + 3, y: py1 + 4, color: "#000", radius: 4, opacity: 0.5 });
        d.rect(pw, ph, { x: px, y: py1, color: "#e9dfc6", radius: 3 });
        d.text("INCIDENT REPORT", { x: px, y: py + 16, size: 15, bold: true, font: FONT, color: "#3a2a22" });
        d.rect(pw - 26, 1.4, { x: px, y: py + 30, color: "#3a2a22", opacity: 0.6 });
        const lh = Math.min(19, (ph - 90) / lines.length);
        lines.forEach(([k, val], n) => {
            const y = py + 43 + n * lh, vis = clamp((clock / Math.max(total, 0.1)) * lines.length * 1.3 - n) || (clock >= total ? 1 : 0);
            leftText(d, k, px - pw / 2 + 14, y, 13, "#6a5648");
            const wv = game.renderer.measureText(val, { size: 13, font: FONT, bold: true, align: "left", maxWidth: 0, lineHeight: 1.2 }).width;
            d.text(val, { x: px + pw / 2 - 14 - wv / 2, y, size: 13, bold: true, font: FONT, color: "#2a1c16", opacity: vis });
        });
        if (stampAt >= 0 && port) d.text(VERDICT[g.style], { x: px, y: py + 46 + lines.length * lh + 22, size: 15, font: FONT, color: "#6a4a3a", maxWidth: pw - 40, align: "center", opacity: clamp((t - stampAt) * 3) });
        d.sprite("icon", { x: px - pw / 2 + 24, y: py + ph - 18, frame: ICON.bone, width: 22, height: 22, color: "#3a2a22" });
        leftText(d, `+${Math.round(shown)} fishbones`, px - pw / 2 + 40, py + ph - 18, 14, "#3a2a22", true);
        if (stampAt >= 0) {
            const n = t - stampAt, u = clamp(n / 0.16), sc = lerp(2.6, 1, u * u), col = g.style === "GHOST" ? "#2a7fc0" : g.style === "CHAOS" ? "#d0401f" : "#7a3a7a";
            if (n >= 0) {
                d.push(); d.translate(px + pw * 0.22, py + ph - (port ? 46 : 62)); d.rotate(-0.19); d.scale(sc, sc);
                const sw = Math.min(pw * 0.56, g.style.length * 16 + 26);
                d.rect(sw, 46, { color: col, radius: 5, outline: 3, opacity: u });
                d.text(g.style, { size: g.style.length > 7 ? 19 : 25, bold: true, font: FONT, color: col, opacity: u });
                d.pop();
            }
        }
    });
    const port = s.view.height > s.view.width;
    btn(s, "bottom-right", [12, 12], port ? 148 : 128, 50, i + 1 < HEISTS.length ? "Next heist" : "Case files", () => { stop = true; purr.stop(); if (i + 1 < HEISTS.length) game.go("play", { i: i + 1 }, { fade: 0.25 }); else game.go("title", {}, { fade: 0.4 }); }, { action: "confirm", fill: "#2a2240", hot: () => stampAt >= 0 && !canBuy(), size: port ? 17 : 15 });
    btn(s, port ? "bottom-left" : "bottom-right", port ? [12, 12] : [224, 12], 84, 50, "Again", () => { stop = true; purr.stop(); game.go("play", { i }, { fade: 0.2 }); }, { size: 15 });
    btn(s, port ? "bottom-left" : "bottom-right", port ? [102, 12] : [146, 12], 74, 50, "Alley", () => { stop = true; purr.stop(); game.go("shop", {}, { fade: 0.2 }); }, { size: 15, hot: canBuy });
});

const VERDICT = {
    GHOST: "Nobody saw a thing. Nobody ever does.",
    CHAOS: "Everything is broken and the fish is gone. Magnificent.",
    SHADOW: "Almost clean. Someone is going to find those paw prints.",
    "ALLEY CAT": "They saw you. You left anyway.",
    SCOUNDREL: "It wasn't subtle. It was, however, fish.",
};
const fmt = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const sim0 = (def, n) => def.guards?.[n]?.kind ?? "guard";

void DT; void DUSK;
game.start("title");
