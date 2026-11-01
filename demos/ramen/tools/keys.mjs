// A desktop player with no mouse at all: the whole shift by keyboard.
import "../game.js";
import { RECIPES, TOPPINGS } from "../data.js";
const game = globalThis.__pogo, R = game.ramen;
game.resize("desktop"); game.input.touchMode = false;
for (const i of [0, 1, 4, 20]) {
    game.go("play", { shift: i }); game.step(100);
    let k, n = 0;
    while (game.currentName === "play" && n++ < 30000) {
        const st = R.stage; k = st.k;
        const I = game.input, b = k.bowls.filter((x) => x.c && x.hold <= 0).sort((a, c) => a.c.id - c.c.id)[0];
        if (n % 16 === 0 && !st.grab) {
            const p = k.pots.find((q) => q.state === "cook" && ["perfect", "soft", "mush"].includes(k.potPhase(q)) && k.bowlForPot(q)) ?? k.pots.find((q) => q.state === "empty" && k.needNoodles().length);
            if (p) I.press("noodle", 1);
            else if (b && st.keyBowl !== b.i) I.press("nextBowl", 1);
            else if (b && b.level < 0.7) I.press("pour", 200);
            else if (b) {
                const id = RECIPES[b.c.recipe].tops.find((t) => b.tops[t] === undefined);
                if (id) I.press(`bin${k.bins.findIndex((x) => x.id === id) + 1}`, 1);
                else if (k.complete(b)) I.press("serve", 1);
            }
        }
        if (st.grab?.type === "keyLadle" && k.bowls[st.grab.bowl].level >= 0.885) I.release("pour");
        game.step(1);
    }
    console.log(i + 1, "stars", k.stars(), "perfect", k.perfects, "of", k.totalCustomers, "walked", k.walked);
}
