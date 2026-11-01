// A stranger's first three fights, in headless Pogo, using only taps and drags at screen positions.
import "../game.js";
const game = globalThis.__pogo, { G } = globalThis.__hex;
game.resize(process.argv[2] ?? "phone"); game.input.touchMode = true;
game.step(5);
const say = (m) => console.log(m);
const caption = () => { const V = game.data.combat.V; return V.cap?.text ?? "(idle)"; };
const tapBtn = (t) => { const e = game.current.entities.find((q) => q.alive && !q.hidden && q.txt === t); if (!e) return false; game.input.tap(e.pos.x, e.pos.y); game.step(4); return true; };
const until = (f, n = 1200) => { for (let i = 0; i < n && !f(); i += 5) game.step(5); return f(); };
tapBtn("BREW!"); until(() => game.currentName === "combat"); game.step(60);
const dragCard = (id) => {
    const C = game.data.combat, i = C.V.hand.findIndex((k) => k.id === id), v = C.V.cards.get(C.V.hand[i].u), L = C.layout();
    const I = game.input, x0 = v.x, y0 = v.y; I.pointerEvent("down", 1, x0, y0); game.step(4); for (let k = 1; k <= 10; k++) { I.pointerEvent("move", 1, x0 + (L.potX - x0) * k / 10, y0 + (L.rimY - y0) * k / 10); game.step(1); } I.pointerEvent("up", 1, L.potX, L.rimY); game.step(70);
};
const tapCard = (id) => { const C = game.data.combat, i = C.V.hand.findIndex((k) => k.id === id), v = C.V.cards.get(C.V.hand[i].u); game.input.tap(v.x, v.y); game.step(60); };
const pot = () => G.run.combat?.brew.map((k) => k.id).join(",");
// Wrong card first: a lesson must refuse it.
tapCard("droplet"); say(`L1 wrong card refused: pot=[${pot()}]`);
tapBtn("End Turn"); game.step(30); say(`L1 End Turn refused: pot=[${pot()}] turn=${G.run.combat?.turn}`);
dragCard("spark"); say(`L1 drag spark: pot=[${pot()}]`);
dragCard("droplet"); say(`L1 drag brine: pot=[${pot()}]`);
tapCard("spark"); say(`L1 tap spark: pot=[${pot()}]`);
const t0 = game.stepCount; tapBtn("BREW"); until(() => game.currentName === "reward"); say(`L1 won in ${((game.stepCount - t0) / 60).toFixed(1)}s of show, scene=${game.currentName}`);
game.step(60);
const takeFirst = () => { const r = G.run.reward; say(`  offered: ${r.cards.map((k) => k.id).join(", ")}`); game.input.tap(180, game.view.height * 0.42); game.step(10); say(`  deck ${G.run.deck.length}`); tapBtn("Onward") || tapBtn("Skip"); until(() => game.currentName === "combat" || game.currentName === "map"); game.step(70); };
takeFirst();
say(`L2 scene=${game.currentName} foes=${G.run.combat.enemies.map((e) => e.id)} prologue=${G.run.prologue}`);
tapCard("spark"); say(`L2 Ember refused while Brine is asked for: pot=[${pot()}]`);
tapCard("droplet"); tapCard("spark"); say(`L2 pot=[${pot()}], preview block ${game.data.combat.V.pv.ward}`);
tapBtn("BREW"); until(() => !game.data.combat.V.busy, 900); say(`L2 after brew hp=${G.run.hp}/${G.run.maxHp} turn=${G.run.combat?.turn}`);
const freeTurns = () => { let guard = 0; while (G.run.combat && game.currentName === "combat" && guard++ < 14) { const C = game.data.combat; const c = G.run.combat; for (let i = 0; i < 4; i++) { const k = C.V.hand.find((q) => c.heat >= 1); if (!k) break; tapCard(k.id); } tapBtn("BREW") || tapBtn("End Turn"); until(() => !C.V.busy || game.currentName !== "combat", 900); game.step(30); } };
freeTurns(); until(() => game.currentName === "reward"); game.step(60); say(`L2 done, scene=${game.currentName} hp=${G.run.hp}`);
takeFirst();
say(`L3 foes=${G.run.combat.enemies.map((e) => e.id)}`);
{ game.render(); const C = game.data.combat, b = C.V.enBoxes[1]; game.input.tap(b.x, C.V.en[1].y); game.step(10); say(`L3 tap second rat: target=${G.run.combat.target}`); }
freeTurns(); until(() => game.currentName === "reward"); game.step(60); say(`L3 done, tutorial flag=${G.meta.tutorial}`);
takeFirst(); say(`after lessons scene=${game.currentName} prologue=${G.run.prologue} hp=${G.run.hp}/${G.run.maxHp}`);
process.exit(0);
