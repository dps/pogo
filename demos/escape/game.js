// Last Train Home. A night train, twelve carriages, and someone who is never far away.
import { createGame } from "./pogo.js";
import { paintKit, paintTitle } from "./art.js";
import { Sound, SONGS } from "./audio.js";
import { Stage } from "./stage.js";
import { fresh, CARRIAGES } from "./rules.js";
import { ending } from "./ending.js";
import { HAND, SERIF } from "./widgets.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#06040c",
    actions: { hint: ["KeyH"], lampkey: ["KeyL"], back: ["Escape", "Backspace", "pad:b"], tab: ["Tab", "pad:x"], i1: ["Digit1"], i2: ["Digit2"], i3: ["Digit3"], i4: ["Digit4"], i5: ["Digit5"], i6: ["Digit6"], i7: ["Digit7"], i8: ["Digit8"], i9: ["Digit9"] },
    touch: false, seed: 7, maxDpr: 2,
});
game.touch.enabled = false;
paintKit(game);
paintTitle(game);
globalThis.document?.getElementById?.("load")?.remove?.();

const KEY = "lasttrain-v1";
const blank = () => ({ state: null, night: 1, wrens: [], muted: false, noHaptics: false, highlight: false, finished: 0 });
let prof = { ...blank(), ...(game.load(KEY, null) ?? {}) };
const save = () => game.save(KEY, prof);
const apply = () => { game.audio.muted = !!prof.muted; game.haptics.enabled = !prof.noHaptics; };
apply();
const snd = new Sound(game);
const api = {
    save, ending: () => game.go("ending", {}, { fade: 1.2 }), title: () => { game.go("title", {}, { fade: 0.4 }); },
    toggle(k) { prof[k] = !prof[k]; apply(); save(); snd.notch(); },
};
game.last = { get prof() { return prof; }, set prof(p) { prof = p; }, api, save, stage: null };

game.scene("title", (s) => {
    game.stopMusic?.();
    let started = false;
    const go = () => { if (started) return; started = true; game.sfx({ wave: "sine", freq: 523, decay: 0.3, volume: 0.06 }, { haptic: "light" }); game.go("play", {}, { fade: 0.5 }); };
    const over = () => { prof.state = fresh(); save(); go(); };
    /** Every title control, computed the same for input and drawing. */
    const layout = () => {
        const W = s.view.width, H = s.view.height, port = H >= W, has = !!prof.state, bw = port ? 240 : 200, by = port ? H - s.view.safe.bottom - 150 : H - 74, second = has, out = [];
        const label = has ? "Keep going" : prof.night > 1 ? `Evening ${prof.night}` : "Board", two = prof.night > 1 ? `Evening ${prof.night}` : "Start over";
        if (port) { out.push({ x: W / 2, y: by, w: bw, h: 58, label, col: "#7c2a26", fn: go }); if (second) out.push({ x: W / 2, y: by + 68, w: bw, h: 46, label: two, col: "#2a1c20", fn: over }); }
        else { out.push({ x: W / 2 - (second ? bw / 2 + 6 : 0), y: by, w: bw, h: 52, label, col: "#7c2a26", fn: go }); if (second) out.push({ x: W / 2 + bw / 2 + 6, y: by, w: bw, h: 52, label: two, col: "#2a1c20", fn: over }); }
        const sy = port ? by + (second ? 126 : 62) : H - 22;
        out.push({ x: W / 2 - 62, y: sy, w: 100, h: 34, small: `Sound ${prof.muted ? "off" : "on"}`, fn: () => api.toggle("muted") }, { x: W / 2 + 62, y: sy, w: 110, h: 34, small: `Haptics ${prof.noHaptics ? "off" : "on"}`, fn: () => api.toggle("noHaptics") });
        return out;
    };
    s.onUpdate(() => {
        const q = s.input.pointer;
        if (q.tapped) for (const b of layout()) if (Math.abs(q.x - b.x) < b.w / 2 + 6 && Math.abs(q.y - b.y) < b.h / 2 + 6) { b.fn(); break; }
        if (s.input.pressed("confirm")) go();
    });
    s.onDrawUI((d) => {
        const W = s.view.width, H = s.view.height, port = H >= W, k = Math.max(W, H) * (port ? 1.05 : 1.02);
        d.sprite("title:bg", { x: port ? W / 2 - k * 0.12 : W / 2, y: port ? H * 0.5 : H * 0.42, width: k, height: k });
        const c = "#fff4dc", ty = port ? s.view.safe.top + 92 : 66, sz = port ? 52 : 50, tx = port ? W / 2 : W * 0.3;
        for (const [t, y] of [["Last Train", ty], ["Home", ty + 56]]) { d.text(t, { x: tx + 1, y: y + 2, size: sz, bold: true, color: "#000", opacity: 0.45, font: SERIF }); d.text(t, { x: tx, y, size: sz, bold: true, color: c, font: SERIF }); }
        for (const b of layout()) {
            if (b.small) { d.text(b.small, { x: b.x, y: b.y, size: 14, color: "#e8c98a", font: SERIF }); continue; }
            d.rect(b.w + 2, b.h + 2, { x: b.x, y: b.y + 2, color: "#000", opacity: 0.45, radius: 10 }); d.rect(b.w, b.h, { x: b.x, y: b.y, color: b.col, radius: 10 }); d.text(b.label, { x: b.x, y: b.y, size: 18, bold: true, color: "#f6ead0", font: SERIF });
        }
        if (prof.wrens.length) d.text(`${prof.wrens.length} of 12 wrens`, { x: tx, y: ty + 96, size: 13, color: "#e8c98a", font: HAND });
    });
});
game.scene("play", (s) => {
    game.touch.enabled = false;
    if (!prof.state) prof.state = fresh();
    game.last.stage = new Stage(game, s, prof, snd, api);
});
game.scene("ending", (s) => ending(game, s, prof, snd, () => { prof.finished++; prof.night++; prof.state = null; save(); game.go("title", {}, { fade: 1 }); }));
game.start("title");
