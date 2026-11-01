// Text audit through whole busy shifts: every frame's draw-hook text, on every screen, while a real thumb cooks.
import "../game.js";
import { Thumb } from "./thumb.mjs";
const game = globalThis.__pogo, R = game.ramen, seen = new Map();
const look = (d, sh) => { game.render(); for (const a of game.audit()) if (/TEXT_/.test(a.code)) { const key = `${a.code} ${game.currentName} ${a.message}`; seen.set(key, (seen.get(key) ?? 0) + 1); } };
for (const d of ["phone-small", "phone", "phone-landscape", "tablet", "desktop"]) {
    game.resize(d); game.input.touchMode = d !== "desktop";
    for (const i of [0, 1, 7, 12, 15, 21, 23, 29, 31]) {
        game.go("play", { shift: i }); game.step(12); look(d, i); game.step(90);
        const t = new Thumb(game, { think: 16, seed: i + 2 }); let n = 0;
        t.playShift(400, () => { if (++n % 7 === 0) look(d, i); });
        for (let q = 0; q < 8; q++) { game.step(14); look(d, i); }
    }
    game.go("play", { shift: 0 }); game.step(20); look(d, 0);
    game.current.first("pauseTab").emit("tap"); game.step(3); look(d, 0); game.current.paused = false;
    for (const tab of ["shop", "kit", "decor", "regs", "map", "book"]) { game.go("ledger", { tab, pick: tab === "book" ? "plain" : null }); game.step(4); look(d, 0); }
    game.go("title"); game.step(40); look(d, 0);
    game.go("results", { i: 7, stars: 3, cash: 7450, tips: 1, served: 12, walked: 0, perfects: 11, total: 12, happy: 0.97, best: "nana", gifts: [{ who: "goro", recipe: "sunrise" }], stamped: ["nana", "plain"], advanced: true, combo: 7, hat: 3200 }); game.step(120); look(d, 0);
    game.go("results", { i: 13, stars: 0, cash: 2450, tips: 1, served: 6, walked: 6, perfects: 1, total: 12, happy: 0.4, best: "express", gifts: [], stamped: [], advanced: false, combo: 1 }); game.step(120); look(d, 0);
    game.go("letter", { text: "Dear one. Fen told you, then. The Noodle Hall has stood empty for thirty years and they mean to pull it down. I'm too old to stop them. You're not. Love, Nana." }); game.step(40); look(d, 0);
    game.go("ending"); for (let q = 0; q < 16; q++) { game.step(60); look(d, 0); }
}
const rows = [...seen].sort((a, b) => b[1] - a[1]);
for (const [k, n] of rows.slice(0, 40)) console.log(String(n).padStart(5), k.slice(0, 120));
console.log(rows.length ? `${rows.length} distinct` : "CLEAN");
