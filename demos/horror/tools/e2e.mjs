// The whole game through its real scenes, touching only input: title, five nights, the shelf, then the last night again and the sunrise.
import { SKILLS, brain } from "./brain.mjs";
await import("../game.js");
const game = globalThis.__pogo;
const failures = [], DT = 1 / 60, tapBtn = () => { game.input.press("confirm", 1); game.step(3); };
const wrap = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
game.step(30);
if (game.currentName !== "title") failures.push("no title");
tapBtn();
game.step(50);
const haptics = new Set(), sounds = new Set();
function drive(think, sim) {
    // Everything through input: stick for walking, look deltas for the camera, presses for the buttons. The sim reads what a thumb would send.
    let guard = 0;
    while (game.currentName === "play" && sim.status === "play" && guard++ < 60 * 400) {
        const o = think(DT);
        game.input.setStick(o.mx, o.my);
        game.input.addLook(-wrap(o.yaw - sim.p.yaw) / 0.0036, -(o.pitch - sim.p.pitch) / 0.0034);
        if (o.light) game.input.press("light", 1);
        if (o.use) game.input.press("use", 1);
        if (o.useDown) game.input.press("use", 2);
        game.step(1);
        for (const h of game.state().haptics ?? []) haptics.add(JSON.stringify(h));
    }
    game.input.setStick(0, 0);
    return sim.status;
}
for (let n = 0; n < 5; n++) {
    let tries = 0, res;
    while (tries++ < 6) {
        if (game.currentName !== "play") { failures.push(`night ${n + 1}: on ${game.currentName}`); break; }
        const sim = game.sim;
        game.step(5);
        res = drive(brain(sim, SKILLS.steady), sim);
        console.log(`night ${n + 1} try ${tries}: ${res} in ${sim.t.toFixed(0)}s, battery ${sim.p.battery.toFixed(0)}, step ${sim.step}/${sim.def.steps.length}`);
        if (res === "done") break;
        game.step(120);
        if (game.currentName === "carpark") { game.step(60); tapBtn(); game.step(50); } else failures.push(`after ${res} on ${game.currentName}`);
    }
    if (res !== "done") { failures.push(`night ${n + 1} not done`); break; }
    if (n < 4) {
        game.step(60);
        if (game.currentName !== "timecard") failures.push(`after night ${n + 1} on ${game.currentName}`);
        game.step(40); tapBtn(); game.step(50);
    }
}
game.step(300);
if (game.currentName !== "flip") failures.push(`expected flip, on ${game.currentName}`);
else {
    const f = game.flip;
    game.step(900);
    let yaw = f.world.p.yaw, guard = 0, stuck = 0, litSteps = 0;
    while (game.data.flip.phase === "play" && guard++ < 60 * 240) {
        const p = f.world.p, h = f.h, want = Math.atan2(-(h.x - p.x), -(h.z - p.z));
        // Follow the corridors with a simple field, as a player would by eye.
        const { field, idx, isSolid } = await import("../sim.js");
        const cx = Math.floor(p.x / 2), cz = Math.floor(p.z / 2), ff = field(Math.floor(h.x / 2), Math.floor(h.z / 2));
        let best = ff[idx(cx, cz)], tx = h.x, tz = h.z;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = ff[idx(cx + a, cz + b)]; if (q >= 0 && q < best && !isSolid(cx + a, cz + b)) { best = q; tx = (cx + a) * 2 + 1; tz = (cz + b) * 2 + 1; } }
        if (f.dist < 4 || best <= 1) { tx = h.x; tz = h.z; }
        const yw = Math.atan2(-(tx - p.x), -(tz - p.z));
        game.input.addLook(-wrap(yw - yaw) / 0.0036, 0);
        yaw = yw;
        game.input.setStick(0, -1);
        if (f.lit) litSteps++;
        game.step(1);
    }
    game.input.setStick(0, 0);
    console.log(`the shelf: ${game.data.flip.phase} after ${(f.t).toFixed(0)}s, frozen in his beam ${(litSteps / 60).toFixed(1)}s, ${game.data.flip.lit}`);
    if (game.data.flip.phase !== "end") failures.push("flip not finished");
    game.step(460);
    tapBtn();
    game.step(50);
    if (game.currentName !== "play" || game.data.night !== 4) failures.push(`after flip on ${game.currentName}`);
    const sim = game.sim, think = brain(sim, SKILLS.steady, { mode: "yield" });
    game.step(5);
    const res = drive(think, sim);
    console.log(`night 5 again, torch off, standing still: ${res} after ${sim.t.toFixed(0)}s`);
    if (res !== "taken") failures.push("true ending not reached");
    game.step(560);
    if (game.currentName !== "dawn") failures.push(`expected dawn, on ${game.currentName}`);
    game.step(60 * 30);
    tapBtn();
    game.step(140);
    if (game.currentName !== "title") failures.push(`after dawn on ${game.currentName}`);
}
// Gentle mode: a catch has no sting, no shake and no error buzz, and the locker has no visitor.
if (failures.length === 0) {
    game.grant({ gentle: true });
    game.go("play", { night: 2 }); game.step(30);
    const sim = game.sim;
    game.step(10);
    for (const q of sim.dolls) sim.wake(q);
    const d = sim.dolls[0]; d.x = sim.p.x + 0.4; d.z = sim.p.z; d.frozen = false; d.y = 0; sim.p.light = false;
    const seen = new Set(), logged = game.audio.log.length;
    for (let i = 0; i < 100; i++) { game.step(1); for (const h of game.state().haptics ?? []) seen.add(h); }
    if (seen.has("error")) failures.push("gentle mode buzzed");
    if (game.currentName === "play" && game.stage.cine?.camera) failures.push("gentle catch used the jump camera");
    console.log("gentle catch haptics:", [...seen].join(" "));
    game.step(160);
    if (game.currentName !== "carpark") failures.push(`gentle catch ended on ${game.currentName}`);
    const s2 = new (sim.constructor)({ night: 2, seed: 2, gentle: true });
    s2.step = 2; s2.begin(); s2.p.hide = 0; for (const q of s2.dolls) s2.wake(q);
    let peeks = 0;
    for (let i = 0; i < 60 * 20; i++) { s2.tick(1 / 60, { mx: 0, my: 0, yaw: 0, pitch: 0, light: false, use: false, useDown: false }); peeks += s2.ev.filter((e) => e.type === "peek").length; s2.ev.length = 0; }
    if (peeks) failures.push("gentle mode had a visitor at the locker");
    console.log("gentle locker visitors:", peeks);
}
const pr = game.progress();
console.log("save:", JSON.stringify({ reached: pr.reached, wakes: pr.wakes, flipped: pr.flipped, dawn: pr.dawn, files: pr.files }));
console.log("haptics:", [...haptics].slice(0, 10).join(" "));
console.log("errors:", game.errors?.length ?? 0, failures.length ? failures : "ALL GOOD");
process.exit(failures.length ? 1 : 0);
