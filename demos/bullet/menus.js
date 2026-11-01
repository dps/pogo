// Title, practice, scores, settings, game over and the two endings.
import { button, pin, pos, rect, text, ui as uiC } from "./pogo.js";
import { newRun } from "./play.js";
import { FONT, digits, roman } from "./ui.js";
import { Bullets } from "./bullets.js";
import { ensureSky, GLOW, GOLD, AMBER, ROSE, VIOLET, COBALT, PETAL, PEARL } from "./art.js";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const commas = (n) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const CREAM = "#fff4d8", DIM = "#c8c4f0", BTN = "#ffffff16";

/** Rosette of glass that turns behind the menus, conducted by the song. */
function attract(s, game, o = {}) {
    const b = new Bullets(), cx = () => s.view.width / 2, cy = o.cy ?? 220;
    let beat = -1, i = 0, last = {}, lastT = -1; b.w0 = 2000; b.h0 = 2000;
    const dummy = { x: -999, y: -999, lastX: -999, lastY: -999, hitR: 0, grazeR: 0 };
    s.onUpdate((dt) => {
        // The real song when it can be heard; before the first tap a silent page still needs its window to turn.
        const so = game.audio.song, moved = so.bpm && so.time !== lastT; lastT = so.time;
        const q = moved ? so.beat : s.time * (so.bpm || 76) / 60;
        if (Math.floor(q) !== beat) {
            beat = Math.floor(q);
            const sign = i % 2 ? 1 : -1, row = [], x = 1000, y = 1000, hue = o.hues ? o.hues[i % o.hues.length] : (sign > 0 ? ROSE : COBALT), n = 14;
            for (let k = 0; k < n; k++) row.push(b.add(x, y, 58, k / n * 6.2832 + i * 0.13, { kind: PETAL, hue, w: sign * 0.6, life: 4.4 }));
            const prev = last[sign];
            if (prev) for (let k = 0; k < n; k++) { const j = (k + 1) % n; b.pane(row[k], row[j], prev[k], hue, 1); b.pane(row[j], prev[k], prev[j], hue, 0.8); }
            last[sign] = row; i++;
        }
        b.step(dt, dummy, () => {});
    });
    s.onDraw((d) => {
        const r = game.renderer, a = r.texture(game.assets.sprite("atlas")), ox = cx() - 1000;
        d.push(); d.translate(0, 0);
        d.additive(() => {
            // Shift the world by hand: panes and bullets are built around (1000, 1000).
            const dy = cy - 1000, ys = b.y; for (let k = 0; k < b.hi; k++) ys[k] += dy;
            b.drawPanes(r, ox, 0.22, 0, 0); b.draw(r, a, ox, 0, 0);
            for (let k = 0; k < b.hi; k++) ys[k] -= dy;
        });
        d.pop();
    });
}

function skyLayer(s, game, id) {
    ensureSky(game.assets, id);
    s.onDraw((d) => { const v = s.view, c = Math.max(v.width / 200, v.height / 440); d.sprite(`sky-${id}`, { x: v.width / 2, y: v.height / 2, width: 200 * c, height: 440 * c }); });
}

/** On a landscape phone the view is 640 tall in about 390 CSS px, so controls and type grow to stay thumb-sized. */
const K = (s) => (s.view.scale < 0.8 ? 1.6 : 1);
const dim = (s) => { const v = s.view; return s.add([rect(v.width + 8, v.height + 8, { color: "#05061ac8" }), uiC(), pos(v.width / 2, v.height / 2)]); };
function bigButton(s, label, onTap, o = {}) {
    const k = K(s), at = o.at ?? [0, 0];
    return s.add([button(label, { width: (o.w ?? 200) * k, height: (o.h ?? 46) * k, color: o.color ?? BTN, textColor: o.tc ?? CREAM, textSize: (o.size ?? 17) * k, radius: 23 * k, action: o.action, onTap }), pin(o.pin ?? "center", [at[0] * k, at[1] * k])]);
}
const title = (s, str) => s.add([text(str, { size: 28 * K(s), color: CREAM, font: FONT }), pin("top", [0, 20])]);

export function installMenus(ctx) {
    const { game, save, SONGS, SND, STAGES, DIFFS } = ctx;
    const song = (id) => { if (ctx.songId !== id || !game.audio.song.playing) { ctx.songId = id; game.music(SONGS[id].pogo); } };
    const click = () => game.sfx(SND.tap, { haptic: "light" });
    const startRun = (stage = 0) => { click(); ctx.songId = null; game.data.run = newRun(save.diff); game.go("play", { stage }, { fade: 0.35 }); };

    game.scene("title", (s) => {
        game.touch.enabled = false; song("title");
        skyLayer(s, game, "void");
        const v = s.view, wide = v.width > v.height, cy = wide ? 320 : 324;
        attract(s, game, { cy });
        let t = 0; s.onUpdate((dt) => { t += dt; });
        s.onDraw((d) => {
            const x = v.width / 2, fl = 1 + 0.05 * Math.sin(t * 11) + 0.03 * Math.sin(t * 6.7);
            d.sprite("candle", { x, y: cy + 62 + 150, width: 84, height: 300 });
            d.rect(3.5, 24, { x, y: cy + 58, color: "#1a0d0a" });
            d.additive(() => {
                d.sprite("atlas", { x, y: cy, width: 420, height: 420, crop: [GLOW * 64, AMBER * 64, 64, 64], opacity: 0.8 });
                d.sprite("flame", { x, y: cy, width: 120 * fl, height: 190 / fl, opacity: 0.6 }); d.sprite("flame", { x, y: cy + 16, width: 64 * fl, height: 130 / fl });
            });
            const mx = x + Math.cos(t * 0.9) * 92, my = cy + Math.sin(t * 1.3) * 50 + 4, w = 0.45 + 0.55 * Math.abs(Math.sin(t * 19));
            for (const q of [1, -1]) d.sprite("wing", { x: mx + q * (2 + 18 * w * 0.5 + 1), y: my, width: 20 * w, height: 23, flipX: q < 0 });
            d.sprite("mothbody", { x: mx, y: my + 1, width: 9, height: 17 });
        });
        const ty = wide ? 70 : 58 + (v.safe?.top ?? 0) * 0.6, size = wide ? 62 : 46, k = K(s);
        s.onDrawUI((d) => {
            const x = v.width / 2, g = 0.7 + 0.3 * Math.sin(t * 1.4);
            const side = v.width * 0.31;
            d.text("Moth", { x: wide ? x - side : x, y: wide ? 240 : ty, size: size * k * 1.2, color: CREAM, font: FONT });
            d.text("to a Flame", { x: wide ? x + side : x, y: wide ? 240 : ty + 42, size: wide ? size * k * 0.9 : 36, color: "#ffd98a", font: FONT });
            if (save.best) d.text(`best ${commas(save.best)}`, { x, y: wide ? 28 : ty + 74, size: 15 * k, color: DIM, font: FONT });
            d.text("tap anywhere", { x: wide ? x - side : x, y: wide ? 340 : v.height - 206, size: 20 * k, color: CREAM, font: FONT, opacity: g });
        });
        // The whole screen is the Play button. Corners hold everything else.
        const row = 176;
        DIFFS.map((q, i) => bigButton(s, q.name, () => { click(); save.diff = i; ctx.persist(); game.go("title"); }, { w: 104, h: 44, size: 16, pin: "bottom", at: [(i - 1) * 112, wide ? 64 : row - 56], color: save.diff === i ? "#ffd98a" : BTN, tc: save.diff === i ? "#20120a" : CREAM }));
        bigButton(s, "Practice", () => { click(); game.go("practice", {}, { fade: 0.2 }); }, { w: 104, h: 44, size: 15, pin: "bottom", at: [-112, 12] });
        bigButton(s, "Scores", () => { click(); game.go("scores", {}, { fade: 0.2 }); }, { w: 104, h: 44, size: 15, pin: "bottom", at: [0, 12] });
        bigButton(s, "Settings", () => { click(); game.go("settings", {}, { fade: 0.2 }); }, { w: 104, h: 44, size: 15, pin: "bottom", at: [112, 12] });
        s.onUpdate(() => { if (s.input.pointer.tapped || s.input.pressed("confirm")) startRun(); });
    });

    game.scene("practice", (s, a) => {
        game.touch.enabled = false; song("title"); skyLayer(s, game, "meadow");
        const v = s.view, list = [];
        for (const st of STAGES) {
            for (const [i, w] of st.waves.entries()) if (save.unlocked[`${st.id}:w:${w.id}`]) list.push({ st, type: "wave", i, name: w.name });
            for (const [i, ph] of st.boss.phases.entries()) if (save.unlocked[`${st.id}:p:${ph.id}`]) list.push({ st, type: "phase", i, name: ph.name, boss: st.boss.name });
        }
        title(s, "Practice");
        if (!list.length) s.add([text("Every pattern you meet in the night waits for you here.", { size: 18, color: DIM, font: FONT, maxWidth: 280, align: "center" }), pin("center", [0, -20])]);
        const k = K(s), rowH = 50 * k, perPage = Math.floor((v.height - 170 * k - (v.safe?.top ?? 0) - (v.safe?.bottom ?? 0)) / rowH), cols = v.width > 620 ? 2 : 1, pages = Math.max(1, Math.ceil(list.length / (perPage * cols))), page = clamp(a.page ?? 0, 0, pages - 1), slice = list.slice(page * perPage * cols, (page + 1) * perPage * cols);
        slice.forEach((e, i) => {
            const col = cols === 2 ? i % 2 : 0, row = cols === 2 ? Math.floor(i / 2) : i;
            bigButton(s, `${roman(e.st.id)}  ${e.name}`, () => { click(); ctx.songId = null; game.data.run = newRun(save.diff); game.go("play", { stage: e.st.id - 1, practice: { type: e.type, i: e.i, name: e.name, diff: save.diff } }, { fade: 0.3 }); }, { w: 280, h: 44, size: 15, pin: "top", at: [cols === 2 ? (col ? 150 : -150) : 0, 62 + row * 50], color: e.type === "phase" ? "#ff9ad22a" : BTN });
        });
        if (pages > 1) { bigButton(s, "More", () => { click(); game.go("practice", { page: (page + 1) % pages }); }, { w: 110, h: 44, pin: "bottom", at: [64, 16] }); }
        bigButton(s, "Back", () => { click(); game.go("title", {}, { fade: 0.2 }); }, { w: 110, h: 44, pin: "bottom", at: [pages > 1 ? -64 : 0, 16], action: "pause" });
    });

    game.scene("scores", (s) => {
        game.touch.enabled = false; song("title"); skyLayer(s, game, "river");
        const v = s.view;
        title(s, "The Longest Nights");
        s.onDrawUI((d) => {
            const wide = v.width > 620, K2 = K(s);
            DIFFS.forEach((q, i) => {
                const x = wide ? v.width / 2 + (i - 1) * 340 * Math.min(1, v.width / 1100) : v.width / 2, y0 = wide ? 150 : 110 + i * 170 + (v.safe?.top ?? 0);
                d.text(q.name, { x, y: y0, size: 18 * K2, color: "#ffd98a", font: FONT });
                const list = save.scores[i] ?? [];
                if (!list.length) d.text("no one yet", { x, y: y0 + 28 * K2, size: 15 * K2, color: DIM, font: FONT, opacity: 0.7 });
                list.slice(0, 5).forEach((e, k) => { const y = y0 + (24 + k * 24) * K2; digits(d, commas(e.score), x + 70 * K2, y, 15 * K2, CREAM, { align: "right" }); d.text(e.flame ? "the flame" : `night ${roman(e.stage)}`, { x: x - 62 * K2, y, size: 13 * K2, color: DIM, font: FONT }); });
            });
        });
        bigButton(s, "Back", () => { click(); game.go("title", {}, { fade: 0.2 }); }, { w: 120, h: 44, pin: "bottom", at: [0, 16], action: "pause" });
    });

    game.scene("settings", (s) => {
        game.touch.enabled = false; song("title"); skyLayer(s, game, "thicket");
        title(s, "Settings");
        const row = (label, get, toggle, y) => {
            const b = bigButton(s, `${label}: ${get()}`, () => { toggle(); ctx.persist(); click(); game.go("settings"); }, { w: 280, h: 46, at: [0, y] });
            return b;
        };
        row("Sound", () => (save.muted ? "off" : "on"), () => { save.muted = !save.muted; game.audio.muted = save.muted; }, -112);
        row("Haptics", () => (save.haptics ? "on" : "off"), () => { save.haptics = !save.haptics; game.haptics.enabled = save.haptics; }, -56);
        row("Auto focus near danger", () => (save.autoFocus ? "on" : "off"), () => { save.autoFocus = !save.autoFocus; }, 0);
        row("Drag speed", () => `${save.sense.toFixed(2)}x`, () => { save.sense = save.sense >= 2 ? 1 : save.sense + 0.25; }, 56);
        bigButton(s, "Back", () => { click(); game.go("title", {}, { fade: 0.2 }); }, { w: 120, h: 44, pin: "bottom", at: [0, 16], action: "pause" });
    });

    const record = (p, flame = false) => {
        const r = p.run; if (p.practice || r.recorded) return null; r.recorded = true;
        const list = save.scores[r.diff] ?? (save.scores[r.diff] = []), e = { score: r.score, stage: p.stage.id, flame };
        list.push(e); list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, 5);
        save.best = Math.max(save.best ?? 0, r.score); ctx.persist();
        return list.indexOf(e);
    };

    ctx.gameOver = (p) => {
        const s = p.s, items = [dim(s)];
        items.push(s.add([text("The dark closes in", { size: 28, color: CREAM, font: FONT }), pin("center", [0, -110])]));
        items.push(s.add([text(`${commas(p.run.score)} light`, { size: 20, color: "#ffd98a", font: FONT }), pin("center", [0, -70])]));
        items.push(bigButton(s, "Rise again", () => { items.forEach((e) => e.destroy()); click(); p.continueRun(); }, { w: 220, at: [0, -10], action: "confirm", color: "#ffd98a", tc: "#20120a" }));
        items.push(s.add([text("Keeps the night, loses your light.\nThe last flame is only for an unbroken flight.", { size: 13, color: DIM, font: FONT, align: "center", maxWidth: 300 }), pin("center", [0, 46])]));
        items.push(bigButton(s, "End the night", () => { click(); record(p); game.data.last = { score: p.run.score, stage: p.stage.id }; game.go("title", {}, { fade: 0.5 }); }, { w: 220, at: [0, 96] }));
    };

    ctx.pauseMenu = (p, on) => {
        const s = p.s;
        if (!on) { (p.menu ?? []).forEach((e) => e.destroy()); p.menu = null; return; }
        const m = (p.menu = [dim(s)]);
        m.push(s.add([text("Still", { size: 30, color: CREAM, font: FONT }), pin("center", [0, -120])]));
        m.push(bigButton(s, "Go on", () => p.setPaused(false), { w: 220, at: [0, -60], color: "#ffd98a", tc: "#20120a" }));
        m.push(bigButton(s, `Sound: ${save.muted ? "off" : "on"}`, () => { save.muted = !save.muted; game.audio.muted = save.muted; ctx.persist(); ctx.pauseMenu(p, false); ctx.pauseMenu(p, true); }, { w: 220, at: [0, -6] }));
        m.push(bigButton(s, `Haptics: ${save.haptics ? "on" : "off"}`, () => { save.haptics = !save.haptics; game.haptics.enabled = save.haptics; ctx.persist(); ctx.pauseMenu(p, false); ctx.pauseMenu(p, true); }, { w: 220, at: [0, 48] }));
        m.push(bigButton(s, "Leave the night", () => { game.audio.resume(); record(p); ctx.songId = null; game.go(p.practice ? "practice" : "title", {}, { fade: 0.3 }); }, { w: 220, at: [0, 102] }));
    };

    ctx.practiceOver = (p, won) => {
        const s = p.s; dim(s);
        s.add([text(won ? "Learned" : "Time passed", { size: 30, color: CREAM, font: FONT }), pin("center", [0, -90])]);
        s.add([text(`${p.run.deaths} ${p.run.deaths === 1 ? "fall" : "falls"}, ${p.run.graze} grazed`, { size: 18, color: DIM, font: FONT }), pin("center", [0, -50])]);
        bigButton(s, "Again", () => { click(); game.data.run = newRun(save.diff); game.go("play", p.a, { fade: 0.2 }); }, { w: 200, at: [0, 10], action: "confirm", color: "#ffd98a", tc: "#20120a" });
        bigButton(s, "Back", () => { click(); ctx.songId = null; game.go("practice", {}, { fade: 0.2 }); }, { w: 200, at: [0, 66], action: "pause" });
    };

    ctx.finish = (p, kind) => {
        const r = p.run, rank = record(p, kind === "flame");
        if (kind === "flame") { save.flame = true; ctx.persist(); }
        ctx.songId = null;
        game.go("ending", { kind, score: r.score, graze: r.graze, deaths: r.deaths, rank, diff: r.diff }, { fade: 1.2 });
    };

    game.scene("ending", (s, a) => {
        game.touch.enabled = false; song("ending");
        const flame = a.kind === "flame";
        skyLayer(s, game, flame ? "dawn" : "river");
        const v = s.view; let t = 0;
        attract(s, game, { cy: 280, hues: flame ? [GOLD, ROSE, AMBER] : [COBALT, VIOLET, PEARL] });
        s.onUpdate((dt) => { t += dt; });
        s.onDraw((d) => {
            const x = v.width / 2, y = 280 + Math.sin(t * 0.8) * 8, w = 0.5 + 0.5 * Math.abs(Math.sin(t * 7));
            d.additive(() => d.sprite("atlas", { x, y, width: 340, height: 340, crop: [GLOW * 64, GOLD * 64, 64, 64], opacity: flame ? 1 : 0.5 }));
            for (const q of [1, -1]) d.sprite("wing", { x: x + q * (3 + 44 * w * 0.5), y, width: 44 * w, height: 52, flipX: q < 0 });
            d.sprite("mothbody", { x, y: y + 2, width: 20, height: 38 });
        });
        s.onDrawUI((d) => {
            const x = v.width / 2, a1 = clamp(t * 0.6 - 0.4);
            d.text(flame ? "And the moth became the light." : "Morning came first.", { x, y: 66, size: 25, color: CREAM, font: FONT, opacity: a1, maxWidth: 330, align: "center" });
            if (!flame) d.text("One flame still burns, for a flight unbroken.", { x, y: 104, size: 14, color: DIM, font: FONT, opacity: a1 });
            digits(d, commas(a.score ?? 0), x, v.height - 196, 30, flame ? "#5a1a3a" : "#ffd98a", { opacity: clamp(t - 1.4) });
            d.text(`${a.graze ?? 0} grazed, ${a.deaths ?? 0} ${a.deaths === 1 ? "fall" : "falls"}`, { x, y: v.height - 162, size: 16, color: flame ? "#6a2a48" : DIM, font: FONT, opacity: clamp(t - 1.8) });
        });
        bigButton(s, "Another night", () => { click(); ctx.songId = null; game.go("title", {}, { fade: 0.6 }); }, { w: 220, pin: "bottom", at: [0, 28], action: "confirm", color: "#ffd98a", tc: "#20120a" });
    });
}
