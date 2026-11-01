// The title screen and the end of the story.
import { G, COLORS, Group, ART, ambient, foot, glow, say, spr, saveGame } from "./core.js";
import { paintFarm } from "./art.js";
import { Sky, Weather, Moth } from "./world.js";
import { Stage, dialog } from "./modal.js";
import { CROPS, EPILOGUE, FINALE, GHOST_LIST } from "./data.js";
import * as S from "./sim.js";

function hillScene(s) {
    const v = s.view, w = v.width, h = v.height, L = { horizon: Math.round(h * 0.62), farmX: Math.round((w - 336) / 4) * 2, farmY: Math.round(h * 0.68) };
    G.paintBg(`title:${w}x${h}`, (p) => paintFarm(p, Math.ceil(w / 2), Math.ceil(h / 2), 0, L));
    return L;
}
export function titleScene(s) {
    const game = G.game; game.touch.enabled = false;
    const v = () => s.view, st0 = G.loadOrNew();
    const L = hillScene(s), sky = new Sky(), ui = new Group(s), weather = new Weather("fly", v().width, v().height), moth = new Moth(v().width * 0.3, v().height * 0.5);
    const crops = ["moonradish", "hushbell", "starmelon", "glowpea", "ghourd", "silverleek", "lampberry"].map((id, i) => ({ id }));
    const rowsN = () => Math.ceil((v().height - L.farmY) / 44) + 1, cols = () => Math.ceil(v().width / 96) + 1;
    s.onUpdate((dt) => {
        sky.update(dt); weather.update(dt); G.sound.tick(); s.input.pointer;
        moth.tx = v().width * 0.5 + Math.sin(s.time * 0.5) * 90; moth.ty = L.horizon + Math.cos(s.time * 0.7) * 40;
        moth.update(dt);
        if (s.input.pressed("confirm") || s.input.pressed("fire")) go();
    });
    s.onDraw((d) => {
        const w = v().width, h = v().height, tint = ambient(0);
        sky.draw(d, w, L.horizon + 20, 0, 4, { x: w * 0.5, y: h * 0.2 }, null);
        d.sprite("bg", { crop: [0, 0, Math.ceil(w / 2), Math.ceil(h / 2)], x: Math.ceil(w / 2), y: Math.ceil(h / 2), width: Math.ceil(w / 2) * 2, height: Math.ceil(h / 2) * 2, color: tint });
        const y0 = L.farmY + 34;
        for (let r = 0; r < rowsN(); r++) for (let i = -cols(); i < cols(); i++) {
            const x = Math.round(w / 2 + i * 48 + (r % 2) * 24 - 0), y = y0 + r * 44, c = crops[(i + 40 + r * 3) % crops.length].id;
            spr(d, `soil${r % 2}${(i + 20) % 3}`, x, y, { color: tint });
            foot(d, `crop:${c}:3`, x, y + 14, { color: tint }); foot(d, `glow:${c}:3`, x, y + 14, {});
        }
        d.additive(() => {
            for (let r = 0; r < rowsN(); r++) for (let i = -cols(); i < cols(); i++) {
                const x = Math.round(w / 2 + i * 48 + (r % 2) * 24), y = y0 + r * 44, c = crops[(i + 40 + r * 3) % crops.length].id, gc = CROPS[c].glow;
                glow(d, x, y - 14, 42, gc, 0.44 + Math.sin(s.time * 1.6 + i + r) * 0.08); 
            }
        });
        for (let i = 0; i < 3; i++) {
            const g = GHOST_LIST[(i * 2 + 1) % 6], x = w * (0.2 + i * 0.3), y = L.horizon + 10 + Math.sin(s.time + i * 2) * 5;
            spr(d, `ghost:${g}:${Math.floor(s.time * 2 + i) % 2}1`, x, y, { opacity: 0.86 });
        }
        weather.draw(d, 0);
        moth.draw(d);
        const ls = w < 420 ? 1.6 : 2.4, lw = 214 * ls, ly = h * 0.33;
        d.additive(() => glow(d, w / 2, ly, lw * 0.7, "#a8c8ff", 0.36));
        spr(d, "logo", w / 2, ly, { s: ls });
        say(d, "A gently haunted farm", w / 2, ly + 22 * ls + 6, { align: "center", color: "#ffe9a8", outline: COLORS.ink });
    });
    let leaving = false;
    const go = () => { if (leaving) return; leaving = true; const st = G.sim ?? G.fresh(1); G.sound.song(st.phase === "night" ? "night" : "day"); game.go(st.phase === "night" ? "farm" : "market", { from: "title" }, { fade: 0.3 }); };
    const bw = 200, bx = () => v().width / 2 - bw / 2, by = v().height - v().safe.bottom - 110;
    ui.button({ x: bx(), y: by, w: bw, h: 56, label: st0 ? "Carry on" : "Begin", kind: "gold", scale: 3, name: "play", onTap: go });
    if (st0) {
        ui.drawn({ layer: 45, draw(d) { say(d, `${S.year(st0) > 1 ? `Year ${S.year(st0)}, ` : ""}${["Spring", "Summer", "Autumn", "Winter"][S.season(st0)]} ${S.dayOfSeason(st0)}`, v().width / 2, by - 24, { align: "center", color: "#f6e8c4", outline: COLORS.ink }); } });
        ui.button({ x: bx() + 36, y: by + 62, w: bw - 72, h: 34, label: "New farm", kind: "night", name: "new", onTap: () => { if (s.confirmNew) { G.fresh((Date.now() % 100000) + 1); go(); } else { s.confirmNew = true; G.sound.deny(); s.showSure = 1; } } });
        ui.drawn({ layer: 45, draw(d) { if (s.showSure) say(d, "Tap again. This replaces your farm.", v().width / 2, by + 104, { align: "center", color: "#ffb0c0", outline: COLORS.ink }); } });
    }
}

/** Credits-like closing: the lake, the lit lantern, and a few plain facts about the year. */
export function endingScene(s) {
    const game = G.game, st = G.sim ?? G.fresh(1), v = () => s.view, sky = new Sky(), stage = new Stage(s), ui = new Group(s);
    G.sound.song("finale");
    s.onUpdate((dt) => { sky.update(dt); G.sound.tick(); if (s.input.pressed("confirm") && s.time > 1) back(); });
    s.onDraw((d) => {
        const w = v().width, h = v().height;
        sky.draw(d, w, h, 0, 4, { x: w * 0.5, y: h * 0.2 }, null);
        d.additive(() => { glow(d, w / 2, h * 0.2, 240, "#ffcf7a", 0.25); });
        const lines = G.font.wrap(EPILOGUE, Math.min(w - 40, 420));
        spr(d, "logo", w / 2, h * 0.36, { s: Math.min(1.6, (w - 16) / 214) });
        lines.forEach((l, j) => say(d, l, w / 2, h * 0.36 + 56 + j * 20, { align: "center", color: "#f6e8c4", outline: COLORS.ink }));
        const y = h * 0.36 + 76 + lines.length * 20, stats = [`Days on the patch: ${st.day}`, `Crops gathered: ${st.stats.harvested}`, `Polite ghosts served: ${st.stats.served}`, `Hybrids named: ${st.found.length}`, `Museum: ${S.dexCount(st)} of ${S.dexTotal()}`];
        stats.forEach((l, j) => say(d, l, w / 2, y + j * 20, { align: "center", color: "#a8f0ff", outline: COLORS.ink }));
    });
    let left = false;
    const back = () => { if (left) return; left = true; saveGame(); game.go("farm", { from: "title" }, { fade: 0.6 }); };
    ui.button({ x: v().width / 2 - 90, y: v().height - v().safe.bottom - 70, w: 180, h: 52, label: "Keep farming", kind: "gold", name: "continue", onTap: back });
}
