// Is the ladder fair? Three model players, all weaker than the numbers suggest on a phone, fight every rival.
// A model player uses the same Brain as the rivals, so its strength is honest: pieces per second and mistakes.
import { Match } from "../match.js";
import { RIVALS } from "../rivals.js";
const PLAYERS = {
    novice: { pps: 0.55, noise: 22, slip: 0.14, hold: 0, safe: 10, hands: 5 },      // first day: slow, makes holes
    casual: { pps: 0.85, noise: 12, slip: 0.06, hold: 0, safe: 11, hands: 4 },       // plays a bit
    regular: { pps: 1.2, noise: 5, slip: 0.02, hold: 1, greed: 0.3, safe: 12, hands: 3 },  // comfortable on a phone
    sharp: { pps: 1.7, noise: 2, slip: 0.005, hold: 1, greed: 0.6, look: 1, safe: 13, hands: 2 },  // good
};
const N = Number(process.argv[2] ?? 40);
const only = process.argv[3];
const out = {};
console.log("rival".padEnd(11), Object.keys(PLAYERS).map((k) => k.padStart(9)).join(""), "   time");
for (let r = 0; r < RIVALS.length; r++) {
    const row = {}; let time = 0, games = 0;
    for (const [name, brain] of Object.entries(PLAYERS)) {
        if (only && only !== name) continue;
        let wins = 0;
        for (let g = 0; g < N; g++) {
            const m = new Match({ mode: "story", rival: RIVALS[r], seed: 1000 + g * 7 + r * 101, brains: [brain, null] });
            while (!m.over && m.steps < 60 * 400) { m.step(); m.events.length = 0; for (const s of m.sides) s.f.events.length = 0; }
            if (m.winner === 0) wins++;
            time += m.seconds; games++;
        }
        row[name] = wins / N;
    }
    out[RIVALS[r].key] = row;
    console.log(RIVALS[r].key.padEnd(11), Object.keys(PLAYERS).map((k) => (row[k] === undefined ? "" : `${Math.round(row[k] * 100)}%`).padStart(9)).join(""), `   ${Math.round(time / games)} s`);
}

// Fairness checks: an easy start, no walls, and a top that good players can reach but not stroll over.
if (!only) {
    let bad = 0;
    const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) bad++; };
    const keys = RIVALS.map((r) => r.key), col = (p) => keys.map((k) => out[k][p]);
    ok(out.pip.novice >= 0.85, "a first-day novice beats Pip nearly every time");
    ok(out.mabel.casual >= 0.85 && out.bristle.casual >= 0.6, "a casual player clears the first three rivals");
    for (const p of Object.keys(PLAYERS)) {
        const c = col(p);
        const rises = c.slice(1).filter((v, i) => v > c[i] + 0.2).length;
        ok(!rises, `${p}: no rival much easier than the one before (${c.map((v) => Math.round(v * 100)).join(" ")})`);
        const drop = Math.max(...c.slice(1).map((v, i) => c[i] - v));
        ok(drop <= 0.7, `${p}: no wall, biggest single step ${Math.round(drop * 100)}%`);
    }
    ok(out.reveille.sharp >= 0.3 && out.reveille.sharp <= 0.95, `the last rival is beatable by a good player but not a stroll (${Math.round(out.reveille.sharp * 100)}%)`);
    ok(out.reveille.regular <= out.pip.regular - 0.3, "the ladder really does ramp");
    process.exit(bad ? 1 : 0);
}
