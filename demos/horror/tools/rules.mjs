// The rules, checked as rules. Every claim the game makes to the player, tested step by step while bots play.
import { NIGHTS } from "../data.js";
import { CELL } from "../data.js";
import { Sim, beltAt } from "../sim.js";
import { SKILLS, brain } from "./brain.mjs";
const DT = 1 / 60, fails = [], claim = (ok, text) => { console.log(`${ok ? "ok  " : "FAIL"} ${text}`); if (!ok) fails.push(text); };
let litMoved = 0, blindMoved = 0, earliest = 1e9, doorsPassed = 0, litSteps = 0, minWarn = 1e9, catches = 0, softlock = 0;
for (let n = 0; n < 5; n++) for (const sk of Object.values(SKILLS)) for (let seed = 1; seed <= 12; seed++) {
    const sim = new Sim({ night: n, seed }), think = brain(sim, sk);
    let i = 0, warn = null;
    while (sim.status === "play" && i++ < 60 * 400) {
        const before = sim.dolls.map((d) => [d.x, d.z, d.frozen]), wasSweep = sim.sweep?.phase === "on", beltWas = sim.belt;
        sim.tick(DT, think(DT));
        sim.ev.length = 0;
        sim.dolls.forEach((d, k) => {
            if (!before[k][2] || wasSweep || sim.sweep?.phase === "on") return;
            const moved = Math.hypot(d.x - before[k][0], d.z - before[k][1]), onBelt = beltWas && beltAt(Math.floor(before[k][0] / CELL), Math.floor(before[k][1] / CELL));
            if (d.frozen && !onBelt && moved > 1e-6) { if (d.kind === "blind") blindMoved++; else litMoved++; }
            if (d.lit) litSteps++;
        });
        if (sim.danger > 0.3) warn ??= sim.t; else if (sim.danger < 0.1) warn = null;
    }
    if (sim.status === "caught") { catches++; earliest = Math.min(earliest, sim.t); minWarn = Math.min(minWarn, warn === null ? 0 : sim.t - warn); }
    if (i >= 60 * 400) softlock++;
}
claim(litMoved === 0, `A doll in your light never moves on its own feet (${litSteps} lit doll-steps checked)`);
claim(blindMoved === 0, "A blindfolded doll never moves while your torch is off");
claim(softlock === 0, "No bot ever got stuck for the length of a shift");
claim(catches === 0 || earliest >= 20, `Nobody is caught in the first 20 seconds of a shift (earliest ${catches ? earliest.toFixed(0) + "s" : "never"}, ${catches} catches in ${5 * 4 * 12} runs)`);
claim(catches === 0 || minWarn >= 1.5, `Every catch comes after a rising heartbeat (shortest warning ${minWarn === 1e9 ? "n/a" : minWarn.toFixed(1) + "s"})`);

// Doors hold them on the first two nights, and only for six seconds or so after that.
{
    const sim = new Sim({ night: 1, seed: 1 }), d = sim.dolls[0], door = sim.doors.find((q) => q.cx === 20 && q.cz === 3);
    door.open = false; d.awake = true; d.x = 35; d.z = 7; sim.p.x = 46; sim.p.z = 7;
    for (let i = 0; i < 60 * 30; i++) { sim.tick(DT, { mx: 0, my: 0, yaw: sim.p.yaw, pitch: 0, light: false, use: false, useDown: false }); sim.ev.length = 0; }
    claim(sim.status === "play" && !door.open, "Night 2: a shut door holds a doll for 30 seconds and more");
    const s3 = new Sim({ night: 2, seed: 1 }), e = s3.dolls[0], dr = s3.doors.find((q) => q.cx === 20 && q.cz === 3);
    dr.open = false; e.awake = true; e.x = 37; e.z = 7; s3.p.x = 46; s3.p.z = 7;
    let opened = 0;
    for (let i = 0; i < 60 * 20 && !opened; i++) { s3.tick(DT, { mx: 0, my: 0, yaw: s3.p.yaw, pitch: 0, light: false, use: false, useDown: false }); s3.ev.length = 0; if (dr.open) opened = s3.t; }
    claim(opened > 4 && opened < 12, `Night 3: they work a door in about six seconds (${opened.toFixed(1)}s)`);
}
// An empty torch comes back, a little.
{
    const sim = new Sim({ night: 0 });
    sim.p.battery = 0;
    for (let i = 0; i < 60 * 20; i++) { sim.tick(DT, { mx: 0, my: 0, yaw: sim.p.yaw, pitch: 0, light: false, use: false, useDown: false }); sim.ev.length = 0; }
    claim(sim.p.battery >= 15, `A dead torch left off recovers (${sim.p.battery.toFixed(0)}% after 20s)`);
}
// A locker is safe through a whole sweep.
{
    const sim = new Sim({ night: 2, seed: 2 }); sim.step = 2; sim.begin(); sim.p.hide = 0;
    for (const d of sim.dolls) sim.wake(d);
    for (let i = 0; i < 60 * 30; i++) { sim.tick(DT, { mx: 0, my: 0, yaw: sim.p.yaw, pitch: 0, light: false, use: false, useDown: false }); sim.ev.length = 0; }
    claim(sim.status === "play" && !sim.sweep, "A locker keeps you safe through a whole whistle");
    const open = new Sim({ night: 2, seed: 2 }); open.step = 2; open.begin();
    for (const d of open.dolls) open.wake(d);
    for (let i = 0; i < 60 * 30 && open.status === "play"; i++) { open.tick(DT, { mx: 0, my: 0, yaw: open.p.yaw, pitch: 0, light: false, use: false, useDown: false }); open.ev.length = 0; }
    claim(open.status === "caught", "Standing in the open through the whistle gets you caught");
}
// Only the last night lets you yield, and only a deliberate yield counts.
{
    let wrong = 0;
    for (let n = 0; n < 4; n++) { const sim = new Sim({ night: n }), t = brain(sim, SKILLS.bot, { mode: "yield" }); for (const d of sim.dolls) sim.wake(d); for (let i = 0; i < 60 * 60 && sim.status === "play"; i++) { sim.tick(DT, t(DT)); sim.ev.length = 0; } if (sim.status === "taken") wrong++; }
    claim(wrong === 0, "Standing still in the dark only means anything on the last night");
    const sim = new Sim({ night: 4 }), t = brain(sim, SKILLS.bot, { mode: "yield" });
    for (const d of sim.dolls) sim.wake(d);
    for (let i = 0; i < 60 * 60 && sim.status === "play"; i++) { sim.tick(DT, t(DT)); sim.ev.length = 0; }
    claim(sim.status === "taken", "On the last night, torch off and standing still, they take you gently");
}
// The rest of it: rules have teeth.
{
    let caught = 0, runs = 0;
    for (let n = 1; n < 4; n++) for (let seed = 1; seed <= 4; seed++) { const sim = new Sim({ night: n, seed }), t = brain(sim, SKILLS.bot, { mode: "idle" }); for (let i = 0; i < 60 * 240 && sim.status === "play"; i++) { sim.tick(DT, t(DT)); sim.ev.length = 0; } runs++; if (sim.status === "caught") caught++; }
    claim(caught === runs, `A player who does nothing is caught on Nights 2-4 (${caught}/${runs})`);
}
console.log(fails.length ? `${fails.length} FAILED` : "ALL RULES HOLD");
process.exit(fails.length ? 1 : 0);
