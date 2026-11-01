// Plays the whole game headless through the real scenes: arcade ladder to the ending, for every fighter, on Normal.
// The "human" is a simple scripted thumb that presses keys through game.input, so menus, rounds, retries and endings are all real.
import "../game.js";
import { ROSTER } from "../fighters.js";
const game = globalThis.__pogo;
class R { constructor(s) { this.s = s; } next() { this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0; return this.s / 4294967296; } }
const fightKeys = ["aA", "aB", "aS", "aG"];
function think(r, m) {
    // A middling player: walks in, mashes light into heavy, blocks a bit, uses the super when it can.
    const f = m.fight, me = f.p[0], foe = f.p[1], dist = Math.abs(me.x - foe.x), fwd = me.face > 0 ? "aR" : "aL";
    if (me.meter >= 100 && dist < 130) game.input.press("aX", 2);
    if (dist > 95) game.input.press(fwd, 6);
    else if (r.next() < 0.5) game.input.press("aA", 2);
    else if (r.next() < 0.35) game.input.press("aB", 2);
    else if (r.next() < 0.25) game.input.press("aS", 2);
    else if (r.next() < 0.25) game.input.press("aG", 14);
}
export function arcade(id, diff, seed) {
    game.restart("title"); const r = new R(seed);
    game.step(2);
    const save = game.load("knockout1", {});
    game.go("vs", { mode: "arcade", a: id, ladder: ["chill", "crumbs", "knead", "whistle", "clamp", "ding", "frappe", "ristretto"].filter((x) => x !== id).slice(0, 7), rung: 0, diff, players: 1, rounds: 2 });
    let steps = 0, tries = 0, matches = 0; const rungs = new Array(7).fill(0); let lastRung = -1, seen = new Set();
    while (steps++ < 60 * 60 * 90) {
        const name = game.currentName; seen.add(name);
        if (name === "ending") break;
        if (name === "vs") { const a = game.currentArgs; if (a.rung !== lastRung) lastRung = a.rung; }
        if (name === "vs" || name === "result") { if (steps % 20 === 0) game.input.press("confirm", 1); if (name === "result" && game.currentArgs.winner !== undefined && steps % 20 === 0) { if (game.currentArgs.winner === 1) { rungs[game.currentArgs.rung]++; tries++; } matches++; } }
        if (name === "play" && steps % 8 === 0) think(r, game.match);
        game.step(1);
    }
    return { id, finished: game.currentName === "ending", losses: tries, rungs, minutes: +(steps / 3600).toFixed(1), scenes: [...seen].join(">") };
}
if (process.argv[1]?.endsWith("bot.mjs")) {
    const diff = Number(process.argv[2] ?? 1);
    for (const id of ROSTER) { const r = arcade(id, diff, 11); console.log(`${r.finished ? "cleared" : "STUCK  "} ${id.padEnd(10)} ${r.minutes} min, losses by course ${r.rungs.join(" ")}  (${r.scenes})`); }
    console.log("errors", game.errors.length);
}
