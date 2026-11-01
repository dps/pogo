// Human-stand-in bots against every level of opposition, through the real input path. node tools/ladder.mjs [n]
import { Match } from "../sim.js";
import { makeBot } from "./humanbot.mjs";
const N = Number(process.argv[2] ?? 60);
export function play(level, oppSkill, n, mate = null, mode = {}) {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0, best = 0, shots = 0;
    for (let i = 0; i < n; i++) {
        const m = new Match({ seed: i * 31 + 5, teams: [{ skill: mate ?? Math.max(oppSkill + 0.14, 0.3) }, { skill: oppSkill }], humans: [{ team: 0 }], mode, fast: true });
        const bot = makeBot(level, i + 1);
        for (let k = 0; k < 60 * 400 && !m.done; k++) { bot(m, m.humans[0]); m.step(); m.events.length = 0; }
        const [a, b] = m.score; gf += a; ga += b; if (a > b) w++; else if (a < b) l++; else d++; shots += m.stats[0].shots;
    }
    return { w: w / n, d: d / n, l: l / n, gf: gf / n, ga: ga / n, shots: shots / n };
}
const pct = (x) => `${Math.round(x * 100)}`.padStart(3);
if (process.argv[1].endsWith("ladder.mjs")) {
    for (const [name, sk] of [["Parish start .02", 0.02], ["Parish end .10", 0.1], ["County start .27", 0.27], ["County end .40", 0.4], ["Fells start .50", 0.5], ["Fells end .65", 0.65], ["High Fells .85", 0.85]]) {
        const row = [0, 1, 2, 3, 4].map((lv) => { const r = play(lv, sk, N); return `${["new", "cas", "keen", "ace", "good"][lv]}: W${pct(r.w)} D${pct(r.d)} L${pct(r.l)} ${r.gf.toFixed(1)}-${r.ga.toFixed(1)}`; });
        console.log(name.padEnd(20), row.join("  |  "));
    }
}
