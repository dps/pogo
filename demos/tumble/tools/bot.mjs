// Plays the whole campaign through the real game, with real pointer input.
// usage: node tools/bot.mjs [expert|human|novice] [firstLevel] [lastLevel] [--write-par]
import "../game.js";
import { AMMO, aimToVelocity } from "../sim.js";
import { LEVELS } from "../levels.js";
const game = globalThis.__pogo;
const skill = process.argv[2] ?? "expert", first = Number(process.argv[3] ?? 0), last = Number(process.argv[4] ?? LEVELS.length - 1), writePar = process.argv.includes("--write-par");
let seed = 12345;
const rnd = () => { seed = Math.imul(seed, 1664525) + 1013904223 >>> 0; return seed / 4294967296; };
const CFG = { expert: { tries: 42, noise: 0 }, human: { tries: 7, noise: 0.035 }, novice: { tries: 2, noise: 0.07 } }[skill];
game.grant?.({ sandbox: false });

function candidates(sim, n) {
    const out = [], ammo = Object.keys(sim.rack).filter((a) => sim.rack[a]);
    for (let i = 0; i < n; i++) {
        const a = ammo[Math.floor(rnd() * ammo.length)], ang = (-4 + rnd() * 54) * Math.PI / 180, pow = 0.62 + rnd() * 0.38;
        out.push({ a, px: -Math.cos(ang) * pow, py: Math.sin(ang) * pow, trig: 0.4 + rnd() * 0.5 });
    }
    return out;
}
const specialDue = (sim, c, x0) => {
    const q = sim.shots[0];
    if (!q || q.spent) return false;
    return q.b.x > x0 - 2 + c.trig * 4;
};
function evaluate(sim, c, x0) {
    const f = sim.fork();
    const [vx, vy] = aimToVelocity(c.px, c.py);
    f.fire(c.a, vx, vy);
    const k0 = f.defenders.length, hp0 = f.boss ? f.boss.hp : 0;
    for (let i = 0; i < 700 && f.state === "flight"; i++) {
        if (specialDue(f, c, x0) && (c.a === "split" || c.a === "iron" || c.a === "ball")) f.special();
        f.step(); f.events.length = 0;
    }
    const kills = k0 - f.defenders.length, dmg = f.boss ? hp0 - f.boss.hp : hp0;
    const ammoCost = { rock: 0, ball: 300, split: 500, bomb: 900, iron: 900 }[c.a];
    return kills * 6000 + dmg * 2500 + f.score * 0.25 - sim.score * 0.25 + (f.defenders.length === 0 ? 40000 : 0) - ammoCost;
}
const stepUntil = (fn, cap = 3000) => { for (let i = 0; i < cap; i++) { if (fn()) return true; game.step(1); } return false; };

function shoot(T, c, x0) {
    const { sim, pull } = T;
    if (T.stage.ammo !== c.a) { T.setAmmo(c.a); game.step(2); }
    const x = 240, y = 320, inp = game.input;
    inp.pointerEvent("down", 7, x, y); game.step(2);
    inp.pointerEvent("move", 7, x + c.px * pull * 0.5, y + c.py * pull * 0.5); game.step(4);
    inp.pointerEvent("move", 7, x + c.px * pull, y + c.py * pull); game.step(4);
    inp.pointerEvent("up", 7, x + c.px * pull, y + c.py * pull); game.step(2);
    stepUntil(() => {
        if (specialDue(sim, c, x0) && c.a !== "bomb" && c.a !== "rock") { inp.tap(200, 300); }
        return sim.state !== "flight";
    }, 3000);
}

const report = [];
let peak = 0, spent = 0, count = 0, hapticMax = 0, bodiesMax = 0;
game.go("play", { level: first }); game.step(40);
for (let i = first; i <= last; i++) {
    let attempts = 0, won = false;
    while (attempts < (skill === "expert" ? 4 : 30) && !won) {
        attempts++;
        const T = game.tumble, { sim } = T, x0 = T.stage.castle.x0;
        if (T.level.index !== i) throw new Error(`expected level ${i}, on ${T.level.index}`);
        game.input.tap(180, 200); game.step(4);
        stepUntil(() => T.ready(), 600);
        let guard = 0;
        while (sim.state !== "won" && sim.state !== "lost" && guard++ < 40) {
            stepUntil(() => T.ready() || sim.state === "won" || sim.state === "lost" || sim.state === "ending", 1500);
            if (sim.state !== "aim") { stepUntil(() => sim.state === "won" || sim.state === "lost", 1200); break; }
            let best = null, bv = -1e12;
            for (const c of candidates(sim, CFG.tries)) { const v = evaluate(sim, c, x0); if (v > bv) { bv = v; best = c; } }
            const shot = { ...best, px: best.px * (1 + (rnd() - 0.5) * CFG.noise * 2), py: best.py + (rnd() - 0.5) * CFG.noise * 2 };
            const t0 = performance.now();
            shoot(T, shot, x0);
            bodiesMax = Math.max(bodiesMax, sim.world.bodies.length);
            void t0;
        }
        hapticMax = Math.max(hapticMax, T.stage.peakIntensity);
        stepUntil(() => T.panel(), 400);
        game.step(120);
        won = sim.state === "won";
        report.push({ i, name: T.level.name, won, attempt: attempts, score: sim.score, stars: game.data.lastStars, left: sim.shotsLeft(), fired: sim.fired, broken: sim.broken, combo: sim.bestCombo, bodies: bodiesMax });
        const r = report[report.length - 1];
        console.log(`${String(i).padStart(2)} ${r.name.padEnd(24)} try ${attempts} ${won ? "WON " : "lost"} score ${String(r.score).padStart(7)} stars ${r.stars} shots ${r.fired} left ${r.left} broken ${r.broken} combo ${r.combo}`);
        if (won) {
            if (i < last) { game.input.press("confirm", 2); game.step(6); stepUntil(() => game.tumble && game.tumble.level.index === i + 1 && game.tumble.sim.tick >= 0, 120); game.step(30); }
        } else { game.input.press("confirm", 2); game.step(6); game.step(40); }
    }
    if (!won) { console.log(`GAVE UP on level ${i}`); if (i < last) { game.go("play", { level: i + 1 }); game.step(40); } }
}
const wins = new Set(report.filter((r) => r.won).map((r) => r.i)).size;
console.log(`\n${skill}: cleared ${wins}/${last - first + 1}; attempts ${report.length}; max bodies ${bodiesMax}; peak rumble ${hapticMax.toFixed(2)}`);
const hp = game.state().haptics; console.log("recent haptics:", JSON.stringify(hp).slice(0, 200));
if (writePar) {
    const fs = await import("node:fs");
    const bestBy = []; for (const r of report) if (r.won) bestBy[r.i] = Math.max(bestBy[r.i] ?? 0, r.score);
    fs.writeFileSync(new URL("../tools/par.json", import.meta.url), JSON.stringify(bestBy));
}
