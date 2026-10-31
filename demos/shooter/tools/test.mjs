// Mechanics checks that the bot doesn't happen to exercise: secrets, keys, audits on every scene and screen.
import "../game.js";
const game = globalThis.__pogo, TILE = 2.4;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log("FAIL", m); } };
for (let i = 0; i < 6; i++) {
    game.restart("title"); game.step(2);
    game.startAt(i); game.step(40);
    const w = game.sim, L = w.L;
    // Every secret zone counts when reached, and every secret door opens on approach.
    for (const t of w.secretTiles) { w.player.teleport((t.c + 0.5) * TILE, 0.85, (t.r + 0.5) * TILE); game.step(3); }
    ok(w.secrets === w.secretsTotal, `L${i + 1} secrets ${w.secrets}/${w.secretsTotal}`);
    for (const d of w.doors) if (d.kind === "S") { w.player.teleport(d.pos.x + 1.9, 0.85, d.pos.z); w.player.vel.set(0, 0, 0); game.step(40); ok(d.open > 0.9 || !d.sealed, `L${i + 1} secret door ${d.c},${d.r} open=${d.open}`); }
    // Locked doors refuse without their key and open with it.
    for (const d of w.doors) if (d.key) {
        const [dc, dr] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([x, y]) => !"#%=~DRBYSGCE".includes(L.ch(d.c + x, d.r + y)));
        w.keys.delete(d.key);
        w.player.teleport((d.c + dc + 0.5) * TILE, 0.85, (d.r + dr + 0.5) * TILE); w.player.vel.set(0, 0, 0); game.step(30);
        ok(d.open === 0 && d.locked, `L${i + 1} door ${d.kind} at ${d.c},${d.r} should stay shut`);
        w.keys.add(d.key); game.step(40);
        ok(d.open > 0.9, `L${i + 1} door ${d.kind} at ${d.c},${d.r} should open (open=${d.open}, near ${w.player.pos.x / TILE})`);
        w.keys.delete(d.key);
    }
}
// Sliding along a wall must not snag on seams: walk diagonally into the long north wall of the L1 lawn.
{
    game.input.touchMode = false;
    game.restart("title"); game.step(2); game.startAt(0); game.step(40);
    const w = game.sim, p = w.player;
    for (const e of [...w.enemies]) { e.hidden = true; e.destroy(); } w.enemies.length = 0;
    w.yaw = -Math.PI / 4; p.teleport(10.5 * TILE, 0.85, 1.6 * TILE); p.vel.set(0, 0, 0);
    game.step(30);
    let min = 1e9, x0 = p.pos.x;
    game.input.press("up", 90);
    game.step(20);
    for (let i = 0; i < 40; i++) { const a = p.pos.x; game.step(1); min = Math.min(min, (p.pos.x - a) * 60); }
    ok(min > 5.5, `wall slide kept speed along the seams (min ${min.toFixed(1)} u/s, moved ${(p.pos.x - x0).toFixed(1)})`);
    ok(p.grounded && Math.abs(p.pos.y - 0.85) < 0.02, `stayed on the ground while sliding (y ${p.pos.y})`);
    game.input.release("up");
}
// Audit every scene on every device.
const devices = ["phone-small", "phone", "phone-landscape", "tablet", "desktop"];
for (const dev of devices) {
    game.resize(dev); game.input.touchMode = dev !== "desktop";
    const check = (name) => { game.render(); for (const a of game.audit()) ok(false, `${dev}/${name}: ${a.severity} ${a.code} ${a.message}`); };
    game.restart("title"); game.step(3); check("title");
    game.save("gml_progress", 3); game.restart("title"); game.step(3); check("title+continue"); game.save("gml_progress", 0);
    game.startAt(0); game.step(30); check("play");
    game.sim.finish(); game.step(90); check("card");
    game.input.press("confirm", 2); game.step(60); check("play2");
    game.data.run.level = 5; game.data.run.log.push({ name: "x", time: 300, kills: 3, total: 4, secrets: 1, secretsTotal: 2, shots: 10, hits: 5 });
    game.go("win"); game.step(30); check("win");
}
console.log(fails ? `${fails} failures` : "all mechanics and audits OK");
