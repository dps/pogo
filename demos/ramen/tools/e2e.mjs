// Proof, part two: real scenes, real pointer events, one thumb. Plays from the title through every shift to the ending, by pressing what's on screen.
import "../game.js";
import { SHIFTS } from "../data.js";
import { Thumb } from "./thumb.mjs";
const game = globalThis.__pogo, R = game.ramen, reach = 0.67;
let fails = 0; const fail = (m) => { fails++; console.log("FAIL", m); };
const device = process.argv[2] ?? "phone", hand = process.argv[3] ?? "right", only = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
game.resize(device);
game.input.touchMode = true;
R.save.hand = hand;
const thumb = new Thumb(game, { hand, think: Number(process.env.THINK ?? 10), slow: Number(process.env.SLOW ?? 1), jitter: Number(process.env.JIT ?? 2), seed: 3 });
const wait = (n) => game.step(n);
let far = 0, gestures = 0, haptic = new Set(), rows = [];
const onStep = () => { for (const h of game.state().haptics ?? []) haptic.add(h); };

if (only) {
    for (const i of only) {
        game.go("play", { shift: i }); wait(100);
        let k; thumb.playShift(400, (s) => { k = s.k; });
        console.log(i + 1, SHIFTS[i].title, "stars", k.stars(), "perfect", k.perfects, "/", k.totalCustomers, "walk", k.walked, "reach", thumb.far.toFixed(2), JSON.stringify(thumb.worst));
        if (k.stars() < 3) fail(`shift ${i + 1}`);
        if (game.audit().some((a) => a.severity === "error")) fail("audit");
    }
} else {
    wait(30);
    thumb.press("Start Cooking"); wait(60);
    for (let n = 0; n < 200 && !R.save.finished; n++) {
        const name = game.currentName;
        if (name === "play") {
            wait(90); let k; const sec = thumb.playShift(400, (s) => { k = s.k; onStep(); });
            rows.push(`${String(game.data.shift + 1).padStart(2)} ${k.stars()}* ${k.perfects}/${k.totalCustomers} ${sec.toFixed(0)}s`);
            if (k.stars() < 3) fail(`shift ${game.data.shift + 1} ${SHIFTS[game.data.shift].title} got ${k.stars()} stars, ${k.walked} walked`);
            far = Math.max(far, thumb.far); wait(60);
        } else if (name === "results") { wait(120); thumb.press(game.current.entities.some((e) => e.buttonLabel === "Next Day") ? "Next Day" : "Try Again"); wait(45); }
        else if (name === "letter") { wait(40); thumb.press("Onward"); wait(45); }
        else if (name === "ledger") {
            const labels = game.current.entities.map((e) => e.buttonLabel).filter(Boolean), mv = labels.find((l) => l.startsWith("Move in"));
            if (labels.find((l) => l.startsWith("Need "))) fail(`stuck in the ledger: ${labels}`);
            if (mv) { thumb.press(mv); wait(20); } else { thumb.press("Open Shop"); wait(40); }
        } else { wait(20); }
    }
    if (!R.save.finished) fail(`never finished: day ${R.save.day}`);
    wait(120);
    console.log("scene after last shift:", game.currentName, "stars", R.save.stars.reduce((a, b) => a + b, 0), "/", SHIFTS.length * 3, "cash", R.save.cash);
    console.log(rows.join("  |  "));
    if (game.currentName === "results") { thumb.press("Next Day"); wait(90); }
    if (game.currentName !== "ending") fail(`ended on ${game.currentName}`);
    thumb.press("Keep Cooking"); wait(60);
    if (game.currentName !== "ledger") fail("no way back from the ending");
    console.log("haptics seen:", [...haptic].slice(0, 12).join(" "));
}
if (!only) {
    // Endless rush: a good run, then walk away, and it must close gently.
    game.go("play", { endless: true }); wait(100);
    const stop = thumb.playShift(120);
    const k = R.stage.k, kept = k.served;
    if (game.currentName !== "play") fail("endless ended under a competent player");
    wait(60 * 90);
    wait(200);
    console.log("endless:", kept, "bowls in two minutes, then walked away; scene", game.currentName, "best", JSON.stringify(R.save.endless));
    if (game.currentName !== "results" || R.save.endless.bowls < kept) fail("endless did not close and save");
    void stop;
}
console.log(`reach ${(only ? thumb.far : far).toFixed(2)} of screen height from the ${hand} corner, worst ${JSON.stringify(thumb.worst)}; ${thumb.gest} gestures`);
if (device === "phone" && (only ? thumb.far : far) > reach) fail("needs too long a reach");
console.log(fails ? `${fails} FAILED` : "ALL GOOD");
process.exit(fails ? 1 : 0);
