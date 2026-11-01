// Balance bot. Plays whole runs at three skill levels with no renderer and prints how far each gets.
// node tools/bot.mjs [runs] [--room name]   fairness = damage taken per wave should climb, not spike.
import { Sim } from "../sim.js";
import { Autopilot } from "../autopilot.js";

const runs = Number(process.argv[2] ?? 12);
const DT = 1 / 60;

export function playRun(seed, skill, { maxSteps = 60 * 60 * 40, heat = 0, log = false } = {}) {
    const sim = new Sim({ seed, heat }), bot = new Autopilot(sim, skill, seed * 7 + 3);
    let steps = 0, peak = 0, lastHp = sim.p.hp, lastKey = "", waveStart = 0;
    const waves = [];
    let worst = 0, stepsTime = 0;
    const startTaken = () => ({ taken: 0, peak: 0 });
    let cur = startTaken();
    while (steps < maxSteps && sim.phase !== "dead" && sim.phase !== "won") {
        const t0 = performance.now();
        const inp = bot.input(DT);
        sim.step(DT, inp);
        const ms = performance.now() - t0;
        stepsTime += ms; worst = Math.max(worst, ms);
        steps++;
        for (const e of sim.events) {
            if (e.type === "hurt") cur.taken += e.n;
            if (e.type === "wave") { cur = startTaken(); cur.name = e.name; cur.room = sim.roomName; waveStart = sim.t; }
            if (e.type === "waveclear") { cur.sec = sim.t - waveStart; cur.hp = Math.round(sim.p.hp); waves.push(cur); }
        }
        sim.events.length = 0;
        cur.peak = Math.max(cur.peak, sim.foes.length);
        peak = Math.max(peak, sim.foes.length);
        if (sim.phase === "upgrade") sim.choose(bot.rnd() * 3 | 0);
    }
    const r = sim.result();
    return { ...r, phase: sim.phase, steps, peak, waves, avgMs: stepsTime / steps, worstMs: worst, depth: sim.run.depth, route: sim.run.route.join(">"), killedAt: sim.wave?.plan.name, ups: sim.run.taken.length };
}

/** Fresh robot with a modest loadout dropped into one room: can each room be survived on its own? */
export function playRoom(room, seed, skill) {
    const sim = new Sim({ seed }), bot = new Autopilot(sim, skill, seed * 3 + 1);
    sim.run.route = ["living"];
    sim.loadRoom(room);
    for (const k of ["bar", "wheels", "bigbag"]) sim.p.ups[k] = true;
    sim.recalc();
    sim.p.weapon = "nail";
    let n = 0, ok = false;
    while (n++ < 60 * 60 * 10 && sim.phase !== "dead") {
        sim.step(DT, bot.input(DT)); sim.events.length = 0;
        if (sim.phase === "upgrade") sim.choose(bot.rnd() * 3 | 0);
        if (sim.phase === "exit" || sim.phase === "won") { ok = true; break; }
    }
    return { ok, hp: sim.p.hp, time: sim.run.time };
}

if (process.argv[1].endsWith("bot.mjs") && process.argv.includes("--rooms")) {
    for (const room of ["living", "kitchen", "bathroom", "laundry", "nursery"]) {
        const line = [];
        for (const [name, skill] of [["clumsy", 0.25], ["average", 0.55], ["sharp", 0.95]]) {
            const r = Array.from({ length: runs }, (_, i) => playRoom(room, 500 + i * 13, skill));
            line.push(`${name} ${r.filter((x) => x.ok).length}/${runs} (${(r.reduce((a, x) => a + x.time, 0) / runs).toFixed(0)}s)`);
        }
        console.log(room.padEnd(10), line.join("   "));
    }
} else if (process.argv[1].endsWith("bot.mjs")) {
    const heat = process.argv.includes("--heat") ? 1 : 0;
    for (const [name, skill] of [["clumsy", 0.25], ["average", 0.55], ["sharp", 0.95]]) {
        const res = [], roomDeaths = {}, byWave = {}, ws = {};
        for (let i = 0; i < runs; i++) {
            const r = playRun(1000 + i * 37, skill, { heat });
            res.push(r);
            const key = r.won ? "WON" : r.phase === "dead" ? `${r.room}/${r.killedAt}` : `TIMEOUT ${r.room}/${r.killedAt}`;
            roomDeaths[key] = (roomDeaths[key] ?? 0) + 1;
            for (const w of r.waves) { const k = `${w.room}/${w.name}`; (byWave[k] ??= []).push(w); }
        }
        const avg = (f) => res.reduce((a, r) => a + f(r), 0) / res.length;
        console.log(`\n== ${name} (skill ${skill}) ${runs} runs: won ${res.filter((r) => r.won).length}, avg score ${avg((r) => r.score) | 0}, avg min ${(avg((r) => r.time) / 60).toFixed(1)}, peak foes ${Math.max(...res.map((r) => r.peak))}, step avg ${avg((r) => r.avgMs).toFixed(3)}ms worst ${Math.max(...res.map((r) => r.worstMs)).toFixed(1)}ms`);
        console.log("  ended:", JSON.stringify(roomDeaths));
        if (process.argv.includes("--waves") || runs <= 3) for (const [k, l] of Object.entries(byWave)) {
            const m = (f) => (l.reduce((a, w) => a + f(w), 0) / l.length);
            console.log(`  ${k.padEnd(38)} n=${String(l.length).padStart(2)} taken ${m((w) => w.taken).toFixed(0).padStart(3)} sec ${m((w) => w.sec).toFixed(0).padStart(3)} peak ${m((w) => w.peak).toFixed(0).padStart(3)} hp ${m((w) => w.hp).toFixed(0)}`);
        }
    }
}
