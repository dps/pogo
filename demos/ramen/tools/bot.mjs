// Proof, part one: the pure sim. Every shift can reach three stars on the free kit, weaker players still clear, and the economy never stalls.
import { DECOR, KIT, LOCATIONS, RECIPES, SHIFTS, STAFF } from "../data.js";
import { assisted, buyDecor, buyKit, buyMove, buyRecipe, buyStaff, finishShift, kitCost, needsMove, newSave, owned, recipeOpen, staffOpen, starTotal } from "../progress.js";
import { menuFor } from "../sim.js";
import { playShift } from "./player.mjs";

let fails = 0;
const fail = (m) => { fails++; console.log("FAIL", m); };

// 0. Every menu fits on the counter: three broth pots and six boards, even with every recipe bought.
{
    const all = { recipes: Object.fromEntries(Object.keys(RECIPES).map((k) => [k, true])) };
    SHIFTS.forEach((s, i) => { for (const own of [{}, all]) { const m = menuFor(s, own), t = new Set(m.flatMap((r) => RECIPES[r].tops)), b = new Set(m.map((r) => RECIPES[r].broth)); if (t.size > 6 || b.size > 3) fail(`shift ${i + 1} menu too big`); } });
    if (SHIFTS.length < 30) fail("fewer than 30 shifts");
}

// 1. Three stars, free kit. A skilled thumb, many seeds.
{
    const free = { kit: {}, staff: {}, recipes: {} }, full = { kit: { pot: 2, bowl: 2, knife: 1, ladle: 1, stools: 2 }, staff: { mio: true, tetsu: true, hana: true, sora: true }, recipes: Object.fromEntries(Object.keys(RECIPES).map((k) => [k, true])) };
    let worst = 3, list = [];
    SHIFTS.forEach((s, i) => {
        let three = 0; const N = 20;
        for (let n = 0; n < N; n++) if (playShift(s, free, "expert", 1 + n * 7).stars() === 3) three++;
        let threeFull = 0;
        for (let n = 0; n < 6; n++) if (playShift(s, full, "expert", 2 + n * 11).stars() === 3) threeFull++;
        list.push(three); worst = Math.min(worst, three / N);
        if (three < N * 0.8) fail(`shift ${i + 1} ${s.title}: expert three-star ${three}/${N}`);
        if (threeFull < 5) fail(`shift ${i + 1} ${s.title}: with everything bought only ${threeFull}/6 three-star`);
    });
    console.log("three-star rate per shift, free kit:", list.join(" "));
}

// 2. A difficulty ramp a person can follow: skilled players clear everything, the curve rises.
{
    const free = { kit: {}, staff: {}, recipes: {} }, rows = [];
    for (const sk of ["good", "casual"]) {
        const avg = SHIFTS.map((s) => { let t = 0; for (let n = 0; n < 8; n++) t += playShift(s, free, sk, 3 + n * 5).happiness(); return t / 8; });
        rows.push(sk + ": " + avg.map((x) => x.toFixed(2)).join(" "));
        const first = avg.slice(0, 8).reduce((a, b) => a + b) / 8, last = avg.slice(24).reduce((a, b) => a + b) / 8;
        console.log(`${sk} happiness: cart ${first.toFixed(2)} -> hall ${last.toFixed(2)}`);
        if (first < last - 0.02) fail(`${sk}: the game gets easier`);
    }
    console.log(rows.join("\n"));
}

// 3. Whole careers. Different spending habits, nothing stalls.
const POLICY = {
    thrifty: (s) => {},
    balanced: (s) => {
        for (const id of ["knife", "pot", "bowl", "stools", "ladle"]) if (s.cash > (kitCost(s, id) ?? 1e12) * 1.2 + 500) buyKit(s, id);
        for (const id of Object.keys(STAFF)) if (staffOpen(s, id) && s.cash > STAFF[id].cost * 1.4) buyStaff(s, id);
        for (const id of Object.keys(RECIPES)) if (recipeOpen(s, id) && !s.recipes[id] && s.cash > RECIPES[id].cost * 1.6) buyRecipe(s, id);
    },
    spender: (s) => {
        for (const slot of Object.keys(DECOR)) for (const it of DECOR[slot].items) buyDecor(s, slot, it.id);
        for (const id of Object.keys(KIT)) while (buyKit(s, id));
        for (const id of Object.keys(STAFF)) if (staffOpen(s, id)) buyStaff(s, id);
        for (const id of Object.keys(RECIPES)) if (recipeOpen(s, id)) buyRecipe(s, id);
    },
};

function career(skill, policy, seed) {
    const s = newSave(); let plays = 0, replays = 0, grinds = 0, stall = 0;
    const log = [];
    while (s.day < SHIFTS.length) {
        POLICY[policy](s);
        if (needsMove(s)) {
            const L = needsMove(s);
            let tries = 0;
            while (s.cash < L.cost) {
                // Short of money: run the last shift again, as a player would.
                const i = s.day - 1, k = playShift(SHIFTS[i], owned(s), skill, seed + plays++ * 13, { assist: assisted(s, i) });
                finishShift(s, i, k); grinds++; tries++;
                if (tries > 40) return { stalled: L.name, s, plays };
            }
            stall = Math.max(stall, tries);
            buyMove(s); log.push(`${L.id}@${s.earned}+${tries}`);
        }
        const i = s.day, k = playShift(SHIFTS[i], owned(s), skill, seed + plays++ * 13, { assist: assisted(s, i) });
        finishShift(s, i, k);
        if (k.stars() < 1) replays++;
        if (plays > 400) return { stalled: "too many plays", s, plays };
    }
    return { s, plays, replays, grinds, stall, log };
}
for (const skill of ["good", "casual"]) for (const pol of Object.keys(POLICY)) {
    const r = career(skill, pol, 5);
    if (r.stalled) { fail(`${skill}/${pol} stalled at ${r.stalled}`); continue; }
    const maxG = pol === "spender" ? (skill === "casual" ? 6 : 4) : 3;   // Spending every coin as it arrives has a price, but a small one.
    console.log(`${skill.padEnd(7)}${pol.padEnd(9)} plays ${String(r.plays).padStart(3)}  retries ${String(r.replays).padStart(2)}  money-grinds ${String(r.grinds).padStart(2)} (worst ${r.stall})  stars ${starTotal(r.s)}  earned ¥${r.s.earned}  left ¥${r.s.cash}  ${r.log.join(" ")}`);
    if (r.stall > maxG) fail(`${skill}/${pol}: needed ${r.stall} extra shifts to afford a move`);
}
void LOCATIONS;
console.log(fails ? `${fails} FAILED` : "ALL GOOD");
process.exit(fails ? 1 : 0);
