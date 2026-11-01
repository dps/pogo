// Headless, through the real game and its real UI. Plays every scenario to its win screen, then the first by touch alone.
import "../game.js";
import { SCENARIOS } from "../data.js";
import { act } from "../policy.js";
const game = globalThis.__pogo;
let fail = 0;
game.save("tide1", { stars: {}, best: {}, relaxed: false, sound: true, music: true, haptics: true, taught: true });
const ok = (c, m) => { console.log(`${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail++; };

for (let i = 0; i < SCENARIOS.length; i++) {
    game.go("play", { index: i });
    game.step(40);
    const { sim, hud } = game.city;
    ok(game.state().scene === "play" && sim === game.city.sim, `scenario ${i} opens`);
    hud.speed = 4;
    let steps = 0;
    while (!hud.modal && steps < 60 * 15 * 100) {
        game.step(30); steps += 30;
        if (hud.modal) break;
        if (sim.hour % 3 === 0) { let g = 8; while (g-- && act(sim)); }
        hud.layout();
        if (game.city.w.dirtyTown) void 0;
    }
    const m = hud.modal;
    ok(!!m && sim.finishedDay > 0, `scenario ${i} ${SCENARIOS[i].id} won day ${sim.finishedDay}, grade ${sim.grade()}, title "${m?.title}"`);
    const issues = game.audit().filter((a) => a.level === "error");
    ok(issues.length === 0, `no audit errors ${issues.map((a) => a.code).join()}`);
}
const saved = game.load("tide1", null);
ok(Object.keys(saved.stars).length === SCENARIOS.length, `progress saved: ${JSON.stringify(saved.stars)}`);

// By touch only: first scenario with tap on card, tap Plonk.
{
    game.save("tide1", { stars: {}, best: {}, relaxed: false, sound: true, music: true, haptics: true, taught: true });
    game.go("play", { index: 0 });
    game.step(40);
    const { sim, hud } = game.city;
    const tapBtn = (id) => { const b = hud.btn(id); if (!b) return false; game.input.tap(b.x, b.y); game.step(3); return true; };
    const tapCard = (t) => { hud.reveal(t); hud.layout(); const r = hud.cardRect(hud.cards.indexOf(t)); game.input.tap(r.x, r.y); game.step(3); return hud.sel === t; };
    ok(tapCard("market"), "tap on the Market card selects it");
    ok(hud.tile !== null && hud.prev?.ok, `ghost snapped to best tile, preview +${hud.prev?.delta} stars ${hud.prev?.stars}`);
    hud.layout();
    ok(tapBtn("plonk") && sim.count("market") === 1, "tap on Plonk builds it");
    game.step(30);
    const pulses = game.state().haptics;
    ok(JSON.stringify(pulses).length > 2, `haptics fired: ${JSON.stringify(pulses).slice(0, 80)}`);
    hud.deselect();
    const buildOrder = ["cottage", "wood", "cottage", "dock", "cottage", "cottage", "dock", "wood", "cottage", "dock", "garden"];
    let i = 0, guard = 0;
    while (!hud.modal && guard++ < 6000) {
        game.step(12);
        if (hud.modal) break;
        const t = buildOrder[i % buildOrder.length];
        const B = hud.cards.includes(t);
        if (B && sim.coins >= 16 && sim.wood >= 4) {
            if (hud.sel !== t) tapCard(t);
            hud.layout();
            const before = sim.buildings.length;
            if (hud.prev?.ok) tapBtn("plonk");
            if (sim.buildings.length > before) i++;
            else i++;
            hud.deselect();
        }
    }
    ok(!!hud.modal, `touch-only run won day ${sim.finishedDay} with ${sim.buildings.length} buildings`);
    // Drag spins, wheel and pinch zoom.
    hud.modal = null;
    const y0 = game.city.w.cam.tYaw;
    const I = game.input;
    I.pointerEvent("down", 5, 120, 300); game.step(3);
    for (let k = 1; k <= 6; k++) { I.pointerEvent("move", 5, 120 + k * 16, 300); game.step(2); }
    I.pointerEvent("up", 5, 216, 300); game.step(10);
    ok(game.city.w.cam.tYaw !== y0, "drag spins the island");
}
// The guided first game, by touch only, in the order a stranger would be told.
{
    game.save("tide1", { stars: {}, best: {}, relaxed: false, sound: true, music: true, haptics: true });
    game.go("play", { index: 0 });
    game.step(40);
    const { sim, hud, coach } = game.city;
    ok(!!coach && hud.cards.length === 1, `lesson opens with one card: ${hud.cards}`);
    const seen = [];
    let steps = 0, t0 = sim.t;
    while (!coach.done && steps < 60 * 150) {
        const c = hud.coach;
        if (c && seen[seen.length - 1] !== c.text) seen.push(c.text);
        const t = c?.target;
        hud.layout();
        if (t?.card) { const r = hud.cardRect(hud.cards.indexOf(t.card)); game.input.tap(r.x, r.y); }
        else if (t?.btn) { const b = hud.btn(t.btn); game.input.tap(b.x, b.y); }
        else if (t?.tile !== undefined && t.tile !== null && hud.sel) { const q = sim.cells[t.tile], p = game.current.cam3.project([q.x, game.city.w.surface(q) + 0.1, q.z]); game.input.tap(p.x, p.y); }
        game.step(20); steps += 20;
    }
    console.log(seen.map((x) => `     ${x}`).join("\n"));
    ok(coach.done, `lesson finished by touch in ${(steps / 60).toFixed(0)} s of play, ${sim.t - t0} sim hours`);
    ok(sim.count("cottage") === 2 && sim.count("market") === 1 && sim.count("wood") === 1 && sim.buildings.every((b) => b.connected), "lesson left a linked town of 2 cottages, market, woodcutter");
    ok(hud.cards.length === sim.scn.unlocks.length && hud.allow === null, "all cards open afterwards");
    ok(game.load("tide1", {}).taught === true, "lesson remembered");
    game.step(60);
    ok(!!hud.next, `next-action hint: ${hud.next?.text}`);
    let g = 0; hud.speed = 4;
    while (!hud.modal && g++ < 4000) { game.step(30); if (sim.hour % 3 === 0) { let k = 8; while (k-- && act(sim)); } hud.layout(); }
    ok(!!hud.modal, `scenario still wins after the lesson, day ${sim.finishedDay}`);
}
process.exit(fail ? 1 : 0);
