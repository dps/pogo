// Each monster keeps its one promise; each special does what its card says; every tile behaves.
import { parseMap } from "../floors.js";
import { BASE, H, M, O, T, flagHazards, legal, makeFloor, makeState, monsters, special, step, threats } from "../sim.js";
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log("FAIL", m); } };
const mk = (rows, o = {}) => { const map = parseMap(rows, o); const fl = flagHazards(makeFloor({ ...map, name: "t", goal: o.goal ?? "clear", ctx: o.ctx ?? BASE })); return { fl, s: makeState(fl, { p: map.start, hp: 3, charges: 2, mons: map.mons, shield: o.shield }) }; };
const go = (w, ...acts) => { let s = w.s; for (const a of acts) s = step(w.fl, s, a); return s; };
const U = 0, R = 1, D = 2, L = 3, W = 4;
{ const w = mk(["..o..", "..g..", ".....", "..@.."]); let s = go(w, W); ok(s[H.HP] === 3, "ghoul stepped adjacent, no bite yet"); s = go({ ...w, s }, U); ok(monsters(s)[0].stun === 0 && s[H.HP] === 3, "shoved ghoul reels and loses its action"); s = go({ ...w, s }, U); ok(monsters(s).length === 0, "second shove drops it in the pit"); }
{ const w = mk(["@g#"]); const s = go(w, R); ok(monsters(s)[0].stun === 1 && s[H.P] === 0, "slam stuns and you stay put"); const b = go({ ...w, s }, W); ok(b[H.HP] === 3, "dazed monster does not bite"); const c = go({ ...w, s: b }, W); ok(c[H.HP] === 2, "wakes and bites"); }
{ const w = mk(["@gg."]); const s = go(w, R); ok(monsters(s).length === 0 && s[H.P] === 1, "bonk kills both and you follow"); }
{ const w = mk(["@..", "...", "..x"]); let t = threats(w.fl, w.s); ok(t[4] === 1 && t[5] === 0, "crab threat is diagonal"); }
{ const w = mk(["@...v", ".....", "....."]); const s = go(w, W); ok(monsters(s)[0].timer === 1, "spitter fired"); }
{ const w = mk(["...v", "...@", "...."]); let s = go(w, W); ok(s[H.HP] === 2, "spit hits player in lane"); s = go({ ...w, s }, W); ok(s[H.HP] === 2, "spitter reloads"); }
{ const w = mk(["..v", "...", "..g", "@.."]); const s = go(w, W); ok(monsters(s).filter((m) => m.t === M.GHOUL).length === 0, "spit kills monsters"); }
{ const w = mk(["..m..", ".....", "..@.."]); const s = go(w, U); ok(s[H.HP] === 2, "mirror meets you between"); const b = go(w, L); ok(b[H.HP] === 3 && monsters(b)[0].p === 3, "mirror goes opposite"); }
{ const w = mk(["B...@", ".....", "....."]); let s = go(w, W); ok(monsters(s)[0].dir === 1, "bull winds up"); s = go({ ...w, s }, D); ok(s[H.HP] === 3 && monsters(s)[0].p === 4, "dodged charge hits wall"); ok(monsters(s)[0].stun === 1, "crash stuns"); }
{ const w = mk(["B.o.@", "....."]); let s = go(w, W); s = go({ ...w, s }, D); ok(monsters(s).length === 0, "bull charges into pit"); }
{ const w = mk([".....", "i@..."]); let s = go(w, W); ok(monsters(s)[0].timer === 1, "imp lights its fuse next to you"); const t = threats(w.fl, s); ok(t[6] === 1, "lit fuse marks 3x3"); s = go({ ...w, s }, R); ok(s[H.HP] === 3, "one step away is not enough? imp at 0, you at 2"); ok(monsters(s).length === 0, "imp went off"); }
{ const w = mk(["...", "h..", "..@", "..."]); ok(threats(w.fl, w.s)[8] === 1, "horse L threat"); const s = go(w, W); ok(s[H.HP] === 2, "horse bites along an L"); }
{ const w = mk(["f.#.@"]); let s = go(w, W), s2 = go({ ...w, s }, W); ok(monsters(s2)[0].p === 1, "phantom every 2nd turn"); s2 = step(w.fl, step(w.fl, s2, W), W); ok(monsters(s2)[0].p === 2, "phantom enters a wall"); }
{ const w = mk(["@;."]); const t = threats(w.fl, w.s); ok(t[1] === 1, "warning spike marked"); const s = go(w, R); ok(s[H.HP] === 2, "stood on warning spike"); }
{ const w = mk(["@:."]); ok(!legal(w.fl, w.s, R), "raised spike blocks"); }
{ const w = mk(["@~~."]); const s = go(w, R); ok(s[H.P] === 3, "ice slides"); }
{ const w = mk(["@Co"]); const s = go(w, R); ok(s[w.fl.OBJ0 + 2] === 0 && s[62 + 2] === T.RUBBLE, "crate fills pit"); ok(s[H.P] === 1, "you follow the crate"); }
{ const w = mk(["@Cg#"]); const s = go(w, R); ok(monsters(s).length === 0, "crate crushes pinned monster"); }
{ const w = mk(["@K...#", "......"]); const s = go(w, R); ok(s[H.HP] === 3 && s[w.fl.OBJ0 + 1] === 0 && s[H.P] === 0, "keg rolled off and blew far away"); }
{ const w = mk(["@K#"]); const s = go(w, R); ok(s[H.HP] === 2, "keg against a wall blows in your face"); }
{ const w = mk(["@t.E"], { goal: "ticket" }); let s = go(w, R, R); ok(legal(w.fl, s, R), "gate open with ticket"); s = step(w.fl, s, R); ok(s[H.WON] === 1, "win"); }
{ const w = mk(["@.E"], { goal: "ticket" }); let s = go(w, R); ok(!legal(w.fl, s, R), "gate locked"); }
{ const w = mk(["..@", ".DP", "g#."]); let s = go(w, D); ok(s[H.SPARE] === 1, "plate opens doors"); s = go({ ...w, s }, U); ok(s[H.SPARE] === 0, "leaving shuts them"); }
{ const w = mk(["@P.", "...", "gD."]); let s = go(w, R); ok(s[H.SPARE] === 1, "open"); }
// specials
{ const w = mk(["@..g"]); const s = special(w.fl, w.s, "dig", 1); ok(s[62 + 1] === T.PIT, "dig"); }
{ const w = mk(["@g."]); const s = special(w.fl, w.s, "dig", 1); ok(monsters(s).length === 0, "dig under monster"); }
{ const w = mk(["@o."]); const s = special(w.fl, w.s, "hop", 1); ok(s[H.P] === 2, "hop over pit"); }
{ const w = mk(["@#."]); ok(special(w.fl, w.s, "hop", 1)[H.P] === 2, "hop over wall"); }
{ const w = mk(["@..g."]); const s = special(w.fl, w.s, "swap", 1); ok(s[H.P] === 3, "swap player"); }
{ const w = mk(["g@g"]); const s = special(w.fl, w.s, "blast", -1); ok(monsters(s).length === 0 && s[H.HP] === 3, "blast spares you"); }
{ const w = mk(["g@"]); const s = special(w.fl, w.s, "frost", -1); ok(monsters(s)[0].stun === 1 && s[H.HP] === 3, "frost"); }
{ const w = mk(["g.@"]); let s = special(w.fl, w.s, "shush", -1); ok(monsters(s)[0].p === 0, "shush holds"); s = step(w.fl, s, W); ok(monsters(s)[0].p === 0, "shush holds a second action"); s = step(w.fl, s, W); ok(monsters(s)[0].p === 1, "shush ends"); }
{ const w = mk(["@.."]); const s = special(w.fl, w.s, "crate", 1); ok(s[w.fl.OBJ0 + 1] === O.CRATE, "postcard crate"); }
{ const w = mk(["@...."]); ok(special(w.fl, w.s, "leap", 1)[H.P] === 3, "leap"); }
// relics
{ const w = mk(["@g#"], { ctx: { ...BASE, stunBonus: 1 } }); ok(monsters(go(w, R))[0].stun === 2, "snow globe"); }
{ const w = mk(["@g#"], { ctx: { ...BASE, slamKills: true } }); ok(monsters(go(w, R, R)).length === 0, "spoon"); }
{ const w = mk(["@;."], { ctx: { ...BASE, noSpikes: true } }); ok(go(w, R)[H.HP] === 3, "sandals"); }
{ const w = mk(["g@"], { shield: 1 }); const s = go(w, W); ok(s[H.HP] === 3 && s[H.SHIELD] === 0, "factor 50"); }
{ const w = mk(["@gg", "..."], { ctx: { ...BASE, dominoes: true } }); ok(monsters(go(w, R)).length === 0, "dominoes"); }
console.log(`${n - fails}/${n} rule checks passed`); process.exit(fails ? 1 : 0);
