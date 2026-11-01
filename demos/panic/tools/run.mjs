// The proof: a bot plays every microgame through real input at base and top speed on every screen.
// usage: node tools/run.mjs [--ids a,b] [--seeds n] [--modes touch,mouse,keys] [--devices ...]  [-v]
import "../game.js";
const game = globalThis.__pogo, P = game.panic;
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const seeds = Number(arg("seeds", 3)), v = process.argv.includes("-v");
const ids = arg("ids", null)?.split(",") ?? P.GAMES.map((g) => g.id);
const devices = arg("devices", "phone-small,phone,phone-landscape,tablet,desktop").split(",");
const noFeel = new Set(), played = new Set(), hp = game.haptics.pulse.bind(game.haptics);
game.haptics.pulse = (k, g) => { played.add(JSON.stringify(k)); hp(k, g); };
function one(id, speed, level, seed, mode, botOn = true) {
    game.go("lab", { id, speed, level, seed });
    game.step(2);
    const m = P.m, b = new P.Driver(game, { mode }), cap = Math.ceil((m.dur / speed) * 60 + 120);
    b.begin(m);
    let i = 0, seen = new Set();
    played.clear();
    for (; i < cap && !m.done; i++) { if (botOn) b.step(m); game.step(1); if (i % 30 === 0) game.render(1); }
    b.end(); game.step(2);
    if (botOn && m.done === "win" && !played.has(JSON.stringify(P.byId[id].feel))) noFeel.add(id);
    return { done: m.done, t: m.t / speed, steps: i };
}
// Every game must draw its very first frame, frozen behind the prompt, before it has ever ticked.
for (const id of ids) { game.go("lab", { id, frozen: true }); game.step(2); game.render(1); }
const fails = {}; let runs = 0, wins = 0;
const fail = (k) => { fails[k] = (fails[k] ?? 0) + 1; };
const t0 = Date.now();
for (const dev of devices) {
    game.resize(dev);
    const land = dev === "desktop" ? ["mouse"] : ["touch"], modes = arg("modes", null)?.split(",") ?? land;
    for (const id of ids) for (const mode of modes) for (const [sp, lv] of mode === "keys" ? [[1, 0]] : [[1, 0], [P.TOP_SPEED, 1]]) for (let s = 1; s <= seeds; s++) {
        const r = one(id, sp, lv, s * 37 + 5, mode);
        runs++;
        if (r.done === "win") wins++; else { fail(`${id}@${sp}/${mode}`); if (v) console.log("FAIL", dev, id, sp, mode, "seed", s, r); }
    }
}
// Nothing should pass by itself: idle players must lose (RESIST is the joke exception).
const idle = [];
game.resize("phone");
for (const id of ids) { const r = one(id, 1, 0, 11, "touch", false); if (r.done === "win" && !P.byId[id].idleWins) idle.push(id); }
console.log(`${wins}/${runs} wins in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${ids.length} games`);
console.log("fails:", Object.keys(fails).length ? fails : "none");
console.log("idle wins:", idle.length ? idle : "none");
console.log("signature haptic missing:", noFeel.size ? [...noFeel] : "none");
const feels = new Set(P.GAMES.map((g) => JSON.stringify(g.feel))); console.log("distinct haptic signatures:", feels.size, "of", P.GAMES.length);
process.exit(Object.keys(fails).length || idle.length ? 1 : 0);
