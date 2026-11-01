// A careless player in every carriage: random taps, drags and wrong items, with saves reloaded at random. Afterwards the planner must still reach the ending.
import "../game.js";
import { Rules } from "../rules.js";
const game = globalThis.__pogo, I = game.input, last = game.last;
let seed = +(process.argv[2] ?? 1); const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647, ri = (n) => Math.floor(rnd() * n);
const search = (from, done) => { const seen = new Set([from.key()]), q = [from]; while (q.length) { const r = q.shift(); if (done(r)) return r; for (const a of r.actions()) { const k = a.next.key(); if (!seen.has(k)) { seen.add(k); q.push(a.next); } } } return null; };
const devs = ["phone", "phone-landscape", "desktop"]; let total = 0;
for (let at = 0; at < 12; at++) {
    const dev = devs[at % 3]; game.resize(dev); game.restart("title"); game.step(5);
    const start = search(new Rules(), (r) => r.s.at === at);
    last.prof = { state: start.s, night: 1 + at % 2, wrens: [], muted: false, noHaptics: false, highlight: at % 2 === 1, finished: 0 };
    game.go("play"); game.step(40);
    for (let i = 0; i < 1500; i++) {
        if (game.currentName !== "play") { if (last.stage.r.won) break; game.go("play"); game.step(30); continue; }
        const v = game.view, x = ri(v.width), y = ri(v.height), r = rnd(), s = last.stage;
        if (s.fade > 0.05) { game.step(4); continue; }
        if (r < 0.5) { I.pointerEvent("down", 5, x, y); game.step(1); I.pointerEvent("up", 5, x, y); game.step(2); }
        else if (r < 0.9) { I.pointerEvent("down", 5, x, y); game.step(1); const x2 = ri(v.width), y2 = ri(v.height); for (let k = 1; k <= 4; k++) { I.pointerEvent("move", 5, x + (x2 - x) * k / 4, y + (y2 - y) * k / 4); game.step(1); } I.pointerEvent("up", 5, x2, y2); game.step(2); }
        else if (r < 0.95) { last.prof = JSON.parse(JSON.stringify(last.prof)); game.go("play"); game.step(24); }
        else if (s.mode === "puzzle") s.closeOverlay();
        total++;
    }
    const here = last.stage.r, ok = !!search(here.clone(), (r) => r.won);
    console.log(`carriage ${at + 1} on ${dev}: left at ${here.s.at + 1}, ending reachable: ${ok}`);
    if (!ok) process.exit(1);
}
console.log(`${total} random moves, no errors`);
process.exit(0);
