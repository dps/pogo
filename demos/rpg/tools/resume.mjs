// Save in the middle of a boss fight, reload, and finish it: "saveable anywhere" includes battles.
import "../game.js";
const game = globalThis.__oq;
game.step(5);
game.dev.setup(game, "F2", [["chompler", 44], ["mugshot", 44]], { x: 13, y: 12 });
game.step(5); game.render();
const w = game.world;
game.dev.battle(game, [["vendetta", 36], ["duplicate", 36]], { fmt: 2, name: "Doug Lumen", boss: "facilities", kind: "boss" });
const tick = (n = 1) => { for (let i = 0; i < n; i++) { game.step(1); game.render(); } };
const until = (fn, max = 3000) => { for (let i = 0; i < max && !fn(); i++) { tick(1); game.input.tap(180, 200); } return fn(); };
game.botSpeed = 12;
const b = () => game.stack.top;
if (!until(() => b().mode === "choose")) throw new Error("never reached choose");
const tap = (id) => { const h = b().hits.find((x) => x.id === id); game.input.tap(h.x + h.w / 2, h.y + h.h / 2); tick(3); };
for (let n = 0; n < 2; n++) { tick(2); const sc = b(); if (sc.mode === "target") tap("tgt" + sc.tgt.list[0]); else tap("move0"); tick(1); if (b().mode === "target") tap("tgt" + b().tgt.list[0]); }
const turnBefore = b().st?.turn;
until(() => b().mode === "choose" && b().st.turn >= 1, 3000);
const saved = JSON.parse(JSON.stringify(game.load("oq", null)));
if (!saved?.battle) throw new Error("no battle in the save");
console.log("saved at turn", saved.battle.turn, "foes", saved.battle.sides[1].mons.map((m) => m.sp + ":" + m.hp).join(" "));
game.data.S = saved; game.go("office"); tick(40);
const sc = b();
if (sc.constructor.name !== "BattleScreen") throw new Error("did not resume, top is " + sc.constructor.name);
if (sc.st.turn !== saved.battle.turn) throw new Error("wrong turn");
if (game.data.S.party[0] !== sc.st.sides[0].mons[0]) throw new Error("party not linked");
for (let i = 0; i < 40 && game.stack.top.constructor.name === "BattleScreen"; i++) {
    until(() => game.stack.top.constructor.name !== "BattleScreen" || ["choose", "target", "need"].includes(b().mode), 3000); tick(2);
    if (game.stack.top.constructor.name !== "BattleScreen") break;
    const s2 = b();
    if (s2.mode === "need") tap(s2.hits[0].id); else if (s2.mode === "target") tap("tgt" + s2.tgt.list[0]); else { const h = s2.hits.find((x) => String(x.id).startsWith("move") && !x.disabled); game.input.tap(h.x + h.w / 2, h.y + h.h / 2); tick(3); }
}
console.log("finished; top", game.stack.top.constructor.name, "wins", game.data.S.wins, "battle cleared", game.data.S.battle === null);
if (game.data.S.wins !== 1) throw new Error("did not win after resume");
process.exit(0);
