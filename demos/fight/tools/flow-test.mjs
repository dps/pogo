// Headless flow test through real scenes: the coached first fight, haptic scaling, training controls, two-player keys,
// pause and settings, endings gallery, and persistence of a clear.
import "../game.js";
import { BTN } from "../sim.js";
const game = globalThis.__pogo; let fails = 0;
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails++; };
game.resize("phone"); game.input.touchMode = true;
const tapBtn = (m, label) => { const c = m.pad.controls.find((b) => b.label === label); game.input.pointerEvent("down", 7, c.x, c.y); game.step(2); game.input.pointerEvent("up", 7, c.x, c.y); game.step(1); };
// Coach, by touch only.
game.go("play", { mode: "coach", a: "crumbs", b: "chill", stage: 0, players: 1, rounds: 1, level: 0, foeHp: 0.7 }); game.step(2);
let m = game.match; const seen = [];
const st = m.pad.controls.find((c) => c.kind === "stick");
game.input.pointerEvent("down", 1, st.x, st.y); game.step(1); game.input.pointerEvent("move", 1, st.x + st.r, st.y);
let n = 0;
while (m.coach.i === 0 && n++ < 300) game.step(1);
game.input.pointerEvent("up", 1, st.x, st.y); game.step(2);
ok(m.coach.i === 1, `coach: walking clears step 1 in ${n} frames`);
const press = (label, frames = 14) => { tapBtn(m, label); game.step(frames); };
n = 0; while (m.coach.i === 1 && n++ < 40) press("LIGHT");
ok(m.coach.i >= 2, "coach: light step clears");
const walkIn = () => { const f = m.fight; if (Math.abs(f.p[0].x - f.p[1].x) > 92) { game.input.press(f.p[0].face > 0 ? "aR" : "aL", 12); game.step(12); } };
n = 0; while (m.coach.i === 2 && n++ < 40) { walkIn(); press("HEAVY", 26); }
ok(m.coach.i >= 3, "coach: heavy step clears");
n = 0; while (m.coach.i === 3 && n++ < 10) press("S2", 40);
ok(m.coach.i >= 4, "coach: special step clears");
game.step(30);
const bl = m.pad.controls.find((c) => c.label === "BLOCK");
game.input.pointerEvent("down", 2, bl.x, bl.y);
n = 0; while (m.coach.i === 4 && n++ < 500) game.step(1);
game.input.pointerEvent("up", 2, bl.x, bl.y); game.step(2);
ok(m.coach.i >= 5, `coach: block step clears after ${n} frames`);
n = 0; while (m.coach.i === 5 && n++ < 40) { walkIn(); if (m.fight.cine) { game.step(10); continue; } press("SUPER", 60); }
ok(m.coach.i >= 6, "coach: super step clears");
ok(game.haptics.log.includes("heavy"), `haptics: heavy on super ${JSON.stringify(game.haptics.log.slice(-6))}`);
game.step(240);
n = 0; while (game.currentName === "play" && n++ < 5000) { walkIn(); press("HEAVY", 20); }
ok(game.currentName === "select" || game.current?.name === "select", `coach: ending the bout lands on fighter select (${game.currentName})`);
// A plain hit is medium.
game.go("play", { mode: "versus", a: "crumbs", b: "chill", stage: 1, players: 1, level: 0 }); game.step(2); m = game.match; game.step(125);
m.brains[1].think = () => 0; m.fight.p[0].auto = false; m.fight.p[0].x = 40; m.fight.p[1].x = 120; game.haptics.log.length = 0;
tapBtn(m, "LIGHT"); game.step(10);
ok(game.haptics.log.includes("medium"), `haptics: medium on hit ${JSON.stringify(game.haptics.log)}`);
// Blocked hits are a tick, and only a tick.
game.go("play", { mode: "versus", a: "crumbs", b: "chill", stage: 1, players: 1, level: 0 }); game.step(2); m = game.match; game.step(125);
m.brains[1].think = () => BTN.G; m.fight.p[0].auto = false; m.fight.p[0].x = 40; m.fight.p[1].x = 120; game.step(3); game.haptics.log.length = 0; game.step(8);
tapBtn(m, "LIGHT"); game.step(10);
ok(game.haptics.log.includes("tick") && !game.haptics.log.includes("medium"), `haptics: tick on block ${JSON.stringify(game.haptics.log)}`);
// Training controls.
game.go("play", { mode: "training", a: "knead", b: "crumbs", stage: 3, players: 1 }); game.step(2); m = game.match;
ok(m.showBoxes && m.fight.training, "training: hitboxes on by default");
for (let i = 0; i < 6; i++) { m.dummy = i; game.step(20); } m.dummy = 2;
m.fight.p[0].x = 20; m.fight.p[1].x = 100; tapBtn(m, "LIGHT"); game.step(30);
ok(m.hist.length > 1 && m.hist.some((h) => h.label.includes("L")), "training: input display logs the press");
ok(m.lastMove?.id === "5A" && m.advShown !== undefined, `training: frame panel shows ${m.lastMove?.name}, advantage ${m.advShown}`);
m.fight.o.fullMeter = true; game.step(2); ok(m.fight.p[0].meter === 100, "training: heat refill");
// Two players, one keyboard.
game.input.touchMode = false; game.resize("desktop");
game.go("play", { mode: "versus", a: "frappe", b: "ristretto", stage: 2, players: 2 }); game.step(2); m = game.match; game.step(125);
const x0 = m.fight.p[0].x, x1 = m.fight.p[1].x; game.input.press("aR", 20); game.input.press("bL", 20); game.step(22);
ok(m.fight.p[0].x > x0 + 30 && m.fight.p[1].x < x1 - 30, "2P keyboard: both walk on their own keys");
// Pause.
game.input.press("pause", 1); game.step(2); ok(m.paused, "pause opens"); const f = m.fight.frame; game.step(10); ok(m.fight.frame === f, "pause holds the fight");
game.input.press("pause", 1); game.step(2); ok(!m.paused, "pause closes");
// Ending, unlock and gallery.
const s0 = game.load("knockout1", {});
game.go("result", { mode: "arcade", a: "whistle", b: "chill", winner: 0, players: 1, rung: 6, diff: 2, ladder: ["chill", "crumbs", "knead", "ding", "clamp", "frappe", "ristretto"], stats: [{ best: 7, dmg: 1200, supers: 1 }, { best: 3, dmg: 300, supers: 0 }] }); game.step(8);
game.input.press("confirm", 1); game.step(40);
ok(game.currentName === "ending", "final win leads to the ending");
ok(game.load("knockout1", {}).cleared?.whistle && game.load("knockout1", {}).gold?.whistle, "clear and gold star persist");
for (let i = 0; i < 12 && game.currentName === "ending"; i++) { game.step(200); game.input.tap(100, 100); game.step(40); }
ok(game.currentName === "title", `ending finishes back at ${game.currentName}`);
game.go("gallery"); game.step(10); ok(game.currentName === "gallery", "gallery opens");
ok(game.errors.length === 0, "no runtime errors");
console.log(fails ? `${fails} FAILED` : "all passed"); process.exit(fails ? 1 : 0);
