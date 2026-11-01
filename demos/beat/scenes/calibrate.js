// Sync: a metronome to check against, and a latency test that measures the player's taps and sets game.audio.offset.
// The metronome is an ordinary music track, so it reaches the ear by exactly the road the songs do.
// Taps are compared to the clicks in raw song time, before the current offset, so testing twice doesn't add up.
import { ui } from "../pogo.js";
import { arrange } from "../music/arrange.js";
import { MENU } from "../music/songs.js";
import { GOBLINS, drawGoblin, EYE, MOUTH } from "../art/goblins.js";
import { ensureStage } from "../art/stages.js";
import { P } from "../art/props.js";
import { letters } from "../art/font.js";
import { chunky, drawStage } from "../ui.js";
import { applySettings, writeSave } from "../story.js";
import { SND } from "../sfx.js";

const INK = "#1b1423";
const WANT = 12;

/** Robust centre of a list of offsets: the median, then the mean of what's close to it. Pure, so tools can test it. */
export function estimate(list) {
    if (!list.length) return { offset: 0, spread: 0, used: 0 };
    const sorted = [...list].sort((a, b) => a - b), mid = sorted[Math.floor(sorted.length / 2)], near = list.filter((x) => Math.abs(x - mid) < 0.09);
    const offset = near.reduce((a, b) => a + b, 0) / near.length;
    return { offset, spread: Math.sqrt(near.reduce((a, b) => a + (b - offset) ** 2, 0) / near.length), used: near.length };
}

export function calibrateScene(ctx) {
    const { game, clock } = ctx;
    game.scene("calibrate", (s, args) => {
        game.touch.enabled = false;
        ctx.hide = null;
        clock.onStall = null;
        const save = ctx.save, back = args.back ?? "title", bg = ensureStage(game, "yard");
        const arr = arrange(MENU.click, { loop: true }), beat = arr.stepDur * arr.grid;
        ctx.moodReset();
        clock.play(arr, { loop: true });
        const started = save.offset;
        let mode = "metronome", taps = [], result = null, flash = 0, press = 0, press2 = 0, spring = 0, sv = 0, lastCount = -1;
        const G = GOBLINS[3];
        const setOffset = (x) => { save.offset = Math.max(-0.4, Math.min(0.4, Math.round(x * 1000) / 1000)); applySettings(game, save); writeSave(game, save); };
        const start = () => { mode = "test"; taps = []; result = null; game.sfx(SND.page); };

        s.add([{
            draw(d) {
                const v = game.view, b = clock.bop();
                drawStage(d, bg, v, v.height * 0.5, { zoom: 1 + b.kick * 0.012 });
                d.rect(v.width, v.height, { x: v.width / 2, y: v.height / 2, color: "#160c2e", opacity: 0.6 });
                const wide = v.width > v.height, x = wide ? v.width * 0.76 : v.width / 2, y = wide ? v.height * 0.46 : v.height * 0.42, size = Math.min(wide ? v.height * 0.42 : v.width * 0.4, 150);
                d.circle(size * 0.72 * (1 + b.kick * 0.2), { x, y, color: "#ffc93c", opacity: 0.1 + b.kick * 0.3 });
                drawGoblin(d, G, x, y, size, { squash: b.kick * 0.4 + spring * 0.1, tilt: b.sway * 0.14, ear: b.kick * 0.4, eye: result ? EYE.happy : b.kick > 0.6 ? EYE.star : EYE.open, mouth: b.kick > 0.6 ? MOUTH.oh : MOUTH.smile, look: [b.sway, 0], body: false });
            },
        }]);
        s.onDrawUI((d) => {
            const v = game.view, b = clock.bop(), wide = v.width > v.height, cx = wide ? v.width * 0.33 : v.width / 2, top = v.safe.top;
            letters(d, "SYNC", v.width / 2, top + 30, { size: 34, color: "#ffe27a", wave: 2, phase: b.phase });
            const y0 = wide ? top + 70 : v.height * 0.62;
            letters(d, `${save.offset >= 0 ? "+" : ""}${Math.round(save.offset * 1000)} MS`, cx, y0, { size: 26, color: "#fff7d6" });
            let msg;
            if (mode === "metronome") msg = "Do the click and the goblin land together? If the bonk looks late, the sound is early. Nudge until they match, or run the test.";
            else if (result) msg = result.spread > 0.06 ? `Measured, but the taps were loose (spread ${Math.round(result.spread * 1000)} ms). Try once more for a better read.` : `Your device runs ${Math.abs(Math.round(result.offset * 1000))} ms ${result.offset >= 0 ? "late" : "early"}. Offset saved. Steady hands!`;
            else msg = `Tap anywhere on each click. ${Math.max(0, WANT - taps.length)} to go.`;
            d.text(msg, { x: cx, y: y0 + 46, size: 14, bold: true, color: "#fff7d6", maxWidth: (wide ? v.width * 0.52 : v.width) - 30, lineHeight: 1.3 });
            if (mode === "test") {
                // Tick strip: where each tap fell, early to the left, late to the right.
                const w = Math.min(280, (wide ? v.width * 0.5 : v.width) - 40), y = y0 + 100;
                d.rect(w + 6, 22, { x: cx, y, color: INK, radius: 8 });
                d.rect(3, 22, { x: cx, y, color: "#7dffb0" });
                for (const t of taps) d.rect(4, 16, { x: cx + Math.max(-1, Math.min(1, t / 0.2)) * w / 2, y, color: "#ffc93c", opacity: 0.85, radius: 2 });
                d.text("early", { x: cx - w / 2 + 16, y: y + 22, size: 11, color: "#c8c0e8" });
                d.text("late", { x: cx + w / 2 - 12, y: y + 22, size: 11, color: "#c8c0e8" });
            }
            if (clock.silent) d.text("Sound is off here, so this tests the picture only.", { x: v.width / 2, y: top + 56, size: 12, bold: true, color: "#ff8a8a", maxWidth: v.width - 40 });
        });
        s.add([ui(), {
            update(dt) {
                clock.step();
                sv += (-260 * spring - 15 * sv) * dt; spring += sv * dt;
                const i = s.input, p = i.pointer, hit = (p.pressed && p.y > game.view.safe.top + 70) || i.pressed("jump") || i.pressed("k1") || i.pressed("k2");
                if (i.pressed("pause")) { game.go(back, {}, { fade: 0.15 }); return; }
                if (mode === "test" && !result && hit && !overButton(p)) {
                    // Song time before offset: raw hearing time. Nearest click wins.
                    const heard = clock.takeStamp(clock.time) + game.audio.offset, phase = ((heard % beat) + beat) % beat, d = phase > beat / 2 ? phase - beat : phase;
                    spring = 0; sv += 7;
                    if (heard > beat * 1.5) {
                        taps.push(d);
                        game.haptic("tick");
                        if (taps.length >= WANT) {
                            result = estimate(taps.slice(2));
                            setOffset(result.offset);
                            game.sfx(SND.holdEnd);
                            game.haptic("success");
                        }
                    }
                }
            },
        }]);
        const buttons = [];
        const overButton = (p) => buttons.some((e) => { const q = e.worldPos(); return Math.abs(p.x - q.x) < e.size.x / 2 + 4 && Math.abs(p.y - q.y) < e.size.y / 2 + 4; });
        const wide = game.view.width > game.view.height;
        const x0 = game.view.width * 0.33 - 148;
        const place = (dx, dy) => (wide ? ["bottom-left", [Math.max(8, x0) + dx, dy]] : ["bottom", [dx, dy]]);
        buttons.push(
            chunky(game, clock, s, "-5", { at: place(wide ? 0 : -130, 76), width: 56, height: 50, color: "#6a4ac8", size: 20, quiet: true, onTap: () => { setOffset(save.offset - 0.005); game.sfx(SND.tickUp); } }),
            chunky(game, clock, s, "+5", { at: place(wide ? 238 : 130, 76), width: 56, height: 50, color: "#6a4ac8", size: 20, quiet: true, onTap: () => { setOffset(save.offset + 0.005); game.sfx(SND.tickUp); } }),
            chunky(game, clock, s, "TAP TEST", { at: place(wide ? 72 : 0, 76), width: 150, height: 50, color: "#8fd13f", size: 20, onTap: start }),
            chunky(game, clock, s, "RESET", { at: place(wide ? 20 : -76, 14), width: 112, height: 48, color: "#ff5a4f", size: 18, quiet: true, onTap: () => { setOffset(0); mode = "metronome"; result = null; } }),
            chunky(game, clock, s, "DONE", { at: place(wide ? 150 : 76, 14), width: 112, height: 48, color: "#2fb86a", size: 18, action: "confirm", onTap: () => { clock.stop(); ctx.moodReset(); game.go(back, {}, { fade: 0.15 }); } }),
        );
        ctx.calibrate = { taps: () => taps, result: () => result, start, started };
    });
}
