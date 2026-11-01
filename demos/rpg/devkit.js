import * as M from "./menus.js";
export { M };
// Screenshot helpers. Not used in play.
import { makeMon } from "./sim.js";
import { freshSave } from "./world.js";
import { FLOORS } from "./story.js";
export function setup(game, floor, party, o = {}) {
    const S = freshSave(); S.name = "Sam"; S.floor = floor; const f = FLOORS[floor];
    S.party = party.map(([sp, l]) => makeMon(sp, l)); for (const m of S.party) S.caught[m.sp] = 1;
    S.bag = { lanyard: 5, coffee: 3, flat_white: 2, stock: 1, aspirin: 2 }; S.flags.form = 1; S.flags.intro = 1; S.flags.met_marge = 1; S.flags.starter = "stickle"; S.flags.showObjective = 1; S.flags.rival1 = 1; S.sigs = o.sigs ?? 0;
    if (o.x !== undefined) { S.x = o.x; S.y = o.y; } else { f.map.forEach((r, y) => { const i = r.indexOf("v") >= 0 ? r.indexOf("v") : r.indexOf("^"); if (i >= 0 && !S._set) { S.x = i; S.y = y + 1; S._set = 1; } }); }
    Object.assign(S.flags, o.flags ?? {});
    game.data.S = S; game.go("office");
    return S;
}
export const battle = (game, foes, o = {}) => { const w = game.world; w.startBattle({ kind: o.kind ?? "trainer", foes: foes.map(([sp, l]) => makeMon(sp, l)), fmt: o.fmt ?? 1, name: o.name ?? "Kevin", boss: o.boss, title: o.title }, () => {}); };
