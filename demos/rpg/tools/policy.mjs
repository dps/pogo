// A sensible player for headless battles, shared by the balance tools.
import { MOVES, BEASTS } from "../data.js";
import { chooseFor, maxHp, usableMoves, bossSpecials, resolveTurn, createBattle, replaceFainted, makeMon, damageOf } from "../sim.js";

export function playerChoices(st) {
    const out = [], sp = bossSpecials(st); let usedSpecial = false;
    st.sides[0].active.forEach((i, slot) => {
        const m = st.sides[0].mons[i];
        if (!m || m.hp <= 0) { out.push(null); return; }
        if (sp.length && !usedSpecial) { usedSpecial = true; out.push({ t: "special", id: sp[0].id }); return; }
        const items = st.items;
        if (items && m.hp < maxHp(m) * 0.3 && items.heal > 0) { items.heal--; m.hp = Math.min(maxHp(m), m.hp + items.healAmt); }
        out.push(chooseFor(st, 0, slot, 2));
    });
    return out;
}
export function fight(you, foes, o = {}) {
    const st = createBattle({ kind: o.kind ?? "trainer", you, foes, fmt: o.fmt ?? 1, seed: o.seed ?? 1, name: "x", ai: o.ai ?? 1, boss: o.boss });
    st.items = { heal: o.heals ?? 0, healAmt: o.healAmt ?? 60 };
    const dealt = {};
    for (let t = 0; t < 120 && !st.over; t++) {
        for (const slot of [...st.need]) { const side = st.sides[0], to = side.mons.findIndex((m, i) => m.hp > 0 && !side.active.includes(i)); if (to >= 0) replaceFainted(st, slot, to); else st.need = st.need.filter((x) => x !== slot); }
        resolveTurn(st, playerChoices(st));
    }
    return st;
}
