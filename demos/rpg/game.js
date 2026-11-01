// Office Quest. Everything is one scene: a stack of screens (the world, battles, menus) over a shared story runner.
import { createGame } from "./pogo.js";
import { audioKit } from "./audio.js";
import { paintFx } from "./sprites.js";
import { paintProps, paintPerson } from "./tiles.js";
import { LOOKS } from "./sprites.js";
import { Stack, Toasts } from "./ui.js";
import { World, freshSave, save } from "./world.js";
import { paintLogo, titleScene, endingScene } from "./title.js";
import * as devkit from "./devkit.js";
import { BEASTS } from "./data.js";
import { bumpUid } from "./sim.js";
import { beastSprite } from "./sprites.js";

const game = createGame({
    view: { width: 360, height: 640, landscape: { width: 640, height: 360 } },
    background: "#1e2233", letterbox: "#1e2233", maxDpr: 2, seed: 9,
    actions: { cancel: ["Escape", "KeyX", "Backspace", "pad:b"], confirm: ["Enter", "Space", "KeyZ", "pad:a"] },
});
game.touch.enabled = false;
audioKit(game);
paintProps(game); paintFx(game); paintPerson(game, "hero", LOOKS.hero);

export function officeScene(game) {
    game.scene("office", (s, args) => {
        game.touch.enabled = false;
        if (!game.data.S) game.data.S = args?.save ?? freshSave();
        const S = game.data.S;
        S.settings = { sound: true, haptics: true, ...S.settings };
        game.audio.muted = !S.settings.sound; game.haptics.enabled = S.settings.haptics;
        const stack = new Stack(game), world = new World(game, s);
        game.stack = stack; game.world = world; game.toasts = new Toasts(game);
        if (S.battle) { S.party = S.battle.sides[0].mons; bumpUid(S.battle.sides[1].mons); }
        bumpUid([...S.party, ...S.box]);
        stack.push(world);
        if (S.battle) world.resumeBattle(S.battle);
        s.onUpdate((dt) => {
            const i = s.input, I = { pointer: i.pointer, up: i._quiet("up"), down: i._quiet("down"), left: i._quiet("left"), right: i._quiet("right"), confirm: i._quiet("confirm"), cancel: i._quiet("cancel") || i._quiet("pause"), held: { up: i.down("up"), down: i.down("down"), left: i.down("left"), right: i.down("right") }, scroll: i.wheel ?? 0 };
            stack.update(dt, I); game.toasts.update(dt);
        });
        s.onDrawUI((d) => { stack.draw(d); game.toasts.draw(d, game.view); });
    });
}
officeScene(game);
game.scene("gallery", (s, a) => {
    game.touch.enabled = false; const names = Object.keys(BEASTS), P = a?.page ?? 0, per = 20, list = names.slice(P * per, P * per + per);
    list.forEach((n) => beastSprite(game, n));
    s.onDrawUI((d) => { const V = game.view; d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#8fa3b8" }); list.forEach((n, i) => d.sprite("b:" + n, { x: 60 + (i % 4) * 110, y: 58 + (i >> 2) * 118, width: 112, height: 112 })); });
});
titleScene(game);
endingScene(game);
game.scene("hero", () => {
    game.touch.enabled = false; paintLogo(game);
    const cast = [["ndaconda", 830, 96, 190, -0.06], ["stickle", 1010, 100, 170, 0.1], ["synergoose", 1150, 110, 200, 0], ["bufferfly", 1330, 110, 210, -0.08], ["vendetta", 830, 310, 240, 0.04], ["replyallosaur", 1040, 320, 300, -0.05], ["bureaucroc", 1280, 340, 300, 0.05], ["pingling", 110, 540, 200, 0.1], ["snaglet", 300, 540, 190, -0.06], ["cakeholder", 490, 540, 200, 0.05], ["deckromancer", 680, 540, 220, 0], ["ficuspocus", 880, 560, 220, 0], ["starfone", 1090, 560, 190, 0.1], ["recurrence", 1290, 560, 200, 0], ["jamothy", 170, 760, 270, 0], ["chompler", 430, 770, 240, 0.05], ["mugshot", 670, 770, 230, -0.04], ["donutdisturb", 900, 760, 220, 0.08], ["pivotaur", 1120, 760, 250, -0.03], ["formlet", 1320, 770, 200, 0.05]];
    cast.forEach((c) => beastSprite(game, c[0]));
    game.current.onDrawUI((d) => {
        const V = game.view, k = V.width / 1440; d.rect(V.width, V.height, { x: V.width / 2, y: V.height / 2, color: "#2fa6a0" });
        for (let y = 0; y < V.height + 12; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < V.width + 12; x += 12) d.circle(0.8 + 3.1 * (y / V.height), { x, y, color: "#268f8b" });
        d.push(); d.scale(k, k);
        for (const [sp, x, y, s, r] of cast) d.sprite(beastSprite(game, sp), { x, y, width: s, height: s, rot: r });
        d.sprite("logo", { x: 375, y: 225, width: 730, height: 341, rot: -0.04 });
        d.pop();
    });
});
game.on("hide", () => { if (game.data.S) save(game); });
globalThis.__oq = game;
// Test hook: jump straight into a scene for screenshots and bots.
game.dev = devkit;
game.start("title");
globalThis.document?.getElementById?.("load")?.remove();
