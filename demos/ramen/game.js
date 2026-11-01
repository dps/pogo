// RAMEN RUSH. Pull, ladle, chop, slide. A cart, a cookbook with missing pages, and a town to feed.
import { createGame, layer, pin, rect, tap, ui } from "./pogo.js";
import { LOCATIONS, RECIPES, SHIFTS } from "./data.js";
import { Kitchen, makeKit, menuFor } from "./sim.js";
import { assisted, finishShift, loadSave, owned, shiftIndex } from "./progress.js";
import { paintAll } from "./art.js";
import { paintPeople } from "./people.js";
import { Sound, makeSongs } from "./audio.js";
import { CREAM, FONT, GOLD, SOY, Stage } from "./stage.js";
import { chunky, installMenus, settingsRow } from "./menus.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#2a1712",
    touch: { stick: false, buttons: [] },
    actions: {
        noodle: ["KeyA"], pour: ["KeyS"], serve: ["KeyD"], nextBowl: ["Tab"],
        bin1: ["Digit1"], bin2: ["Digit2"], bin3: ["Digit3"], bin4: ["Digit4"], bin5: ["Digit5"], bin6: ["Digit6"],
    },
    seed: 1, maxDpr: 2,
});
paintAll(game.assets);
paintPeople(game.assets);

const SAVE = "ramenrush1";
const R = { save: loadSave(game.load(SAVE, null)), songs: makeSongs(), sound: new Sound(game), stage: null, RECIPES };
R.persist = () => game.save(SAVE, R.save);
game.audio.muted = !!R.save.muted;
game.haptics.enabled = R.save.haptics !== false;
R.song = (name) => { if (R.playing !== name) { R.playing = name; game.music(R.songs[name]); } };
game.ramen = R;
globalThis.__ramen = R;
if (typeof document !== "undefined") document.getElementById("load")?.remove();

// --- A shift ------------------------------------------------------------------------------------------------------
function endlessShift() {
    const loc = Math.max(0, ...LOCATIONS.map((L, n) => (R.save.locs[L.id] ? n : 0)));
    const last = SHIFTS.filter((x) => x.loc === loc).at(-1);
    return { endless: true, title: "Endless Rush", loc, menu: last.menu.slice(0, 4), patience: 36, base: last.base, waves: [] };
}

game.scene("play", (s, args = {}) => {
    game.touch.enabled = false;
    const endless = !!args.endless, i = args.shift ?? shiftIndex(R.save), shift = endless ? endlessShift() : SHIFTS[i];
    const own = owned(R.save), assist = !endless && assisted(R.save, i);
    const k = new Kitchen({ shift, kit: makeKit(shift, own, assist), menu: menuFor(shift, own), seed: 11 + i * 17 + (R.save.fails[i] ?? 0) + (args.seed ?? 0) });
    const stage = new Stage(game, s, k, { save: R.save, sound: R.sound, hints: true });
    R.stage = stage;
    game.data.scene = "play"; game.data.shift = i;
    R.song(LOCATIONS[shift.loc].id);
    let paused = false, ended = false;

    s.add([{ draw(d) { stage.drawWorld(d); } }]);
    s.onDraw((d) => stage.drawFront(d));
    s.onDrawUI((d) => {
        d.reset();
        if (paused) return;      // The pause screen is modal: nothing else talks while it's up.
        stage.drawTickets(d); stage.drawHUD(d); stage.drawBubble(d); stage.drawFloats(d); stage.drawHint(d);
        if (intro > 0) {
            const a = Math.min(1, intro * 2.5), L = stage.L;
            d.rect(L.W, 84, { x: L.W / 2, y: L.counter, color: SOY, opacity: a * 0.92 });
            d.text(endless ? "Endless Rush" : `Shift ${i + 1}`, { x: L.W / 2, y: L.counter - 19, size: 15, bold: true, font: FONT, color: GOLD, opacity: a });
            d.text(endless ? "Three walkouts and we close" : shift.title, { x: L.W / 2, y: L.counter + 10, size: endless ? 20 : 25, bold: true, font: FONT, color: CREAM, opacity: a, maxWidth: L.W - 24 });
        }
    });

    let intro = 1.2;
    s.onUpdate((dt) => {
        if (paused) return;
        if (intro > 0) { intro -= dt; if (s.input.pointer.pressed) intro = Math.min(intro, 0.2); stage.animate(dt); return; }
        stage.update(dt);
        if (shift.rush && !stage.rushed && k.time > 0 && k.arrivals.length < k.totalCustomers * 0.62) {
            stage.rushed = 1; stage.showBanner("RUSH!", 1.3); R.sound.rush(); R.song("rush");
        }
        if (endless && !stage.rushed && k.time > 75) { stage.rushed = 1; stage.showBanner("RUSH!", 1.3); R.sound.rush(); R.song("rush"); }
        if (k.done && stage.endT > 1.25 && !ended) {
            ended = true;
            const news = finishShift(R.save, i, k);
            if (endless) { const b = R.save.endless; news.best = k.served > b.bowls; b.bowls = Math.max(b.bowls, k.served); b.best = Math.max(b.best, k.cash); }
            R.persist();
            R.sound.hush();
            const best = k.resultBowls.filter((x) => x.rating).sort((a, b) => b.rating - a.rating)[0];
            game.data.result = { stars: news.stars, cash: k.cash };
            game.go("results", { i, endless, stars: news.stars, cash: k.cash, tips: k.tips, served: k.served, walked: k.walked, perfects: k.perfects, total: k.totalCustomers ?? k.served, happy: k.happiness(), best: best?.recipe ?? null, gifts: news.gifts, stamped: news.stamped, improved: news.best, advanced: news.advanced, combo: k.bestCombo, first: news.first, hat: news.hat }, { fade: 0.35 });
        }
    });

    // Pause: a small tab on the curtain, away from the cooking.
    const pauser = () => [4, 2];
    s.add([pin("top-right", pauser()), rect(50, 50, { color: "#00000000" }), tap(() => setPause(!paused)), { name: "pauseTab", draw(d) {
        d.rect(38, 32, { color: SOY, radius: 11, opacity: 0.92 });
        d.rect(4.5, 15, { x: -5.5, color: CREAM, radius: 2 }); d.rect(4.5, 15, { x: 5.5, color: CREAM, radius: 2 });
    } }]);
    const panel = [];
    function setPause(on) {
        paused = on; s.paused = on; R.sound.ui(); stage.quiet = on;
        s.first("pauseTab").hidden = on;
        if (on) R.sound.hush();
        for (const e of panel) e.destroy();
        panel.length = 0;
        if (!on) return;
        const land = game.view.width > game.view.height * 1.05, st = land ? 62 : 0, V = game.view;
        panel.push(s.add([ui(), layer(40), { draw(d) {
            d.rect(V.width * 2, V.height * 2, { x: V.width / 2, y: V.height / 2, color: "#160a06", opacity: 0.93 });
            d.text("Paused", { x: V.width / 2, y: land ? V.height * 0.22 : V.height / 2 - 100, size: 30, bold: true, font: FONT, color: CREAM });
        } }]));
        const add = (label, i, fn, o = {}) => panel.push(s.add([layer(50), pin("center", land ? [(i - 1) * 170, 0] : [0, -30 + i * 62]), chunky(label, { width: land ? 160 : 210, height: 54, textSize: land ? 15 : 18, ...o, onTap: fn })]));
        add("Back to it", 0, () => setPause(false), { color: "#3f7a4e", action: "confirm" });
        add("Start shift again", 1, () => { s.paused = false; game.go("play", args, { fade: 0.2 }); });
        add("To the ledger", 2, () => { s.paused = false; game.go("ledger", {}, { fade: 0.2 }); }, { color: "#7a4a2a" });
        panel.push(...settingsRow(s, R, "center", land ? st : 160, 50));
    }
    s.on("resize", () => stage.layout());
    s.on("leave", () => R.sound.hush());      // Held sounds never outlive the kitchen.
});

installMenus(game, R);
game.start("title");
