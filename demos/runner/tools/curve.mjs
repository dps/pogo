// Plays real generated runs through Run.step. "Ace" looks far ahead and must reach the rocket without touching anything.
// The "people" see only a short way ahead, react late and sometimes blunder; their survival is the difficulty curve.
import { BIOMES, ROUTE, biomeIndex, levelAt, speedAt, beatAt } from "../data.js";
import { Run } from "../sim.js";
import { solve } from "./solve.mjs";
const STEP = 1 / 60;

function obstaclesFor(run, horizon) {
    const out = [], d = run.d, reach = d + horizon * run.speed * 1.02;
    for (const o of run.obstacles) { if (o.dead) continue; const at = run.obD(o); if (at + o.len + 1 < d) continue; if (at > reach) { if (!o.v) break; continue; } out.push(o); }
    return out;
}
/** Ace: a full search from the true state each time, acting at the last safe moment with no lag. */
function ace(seed) {
    const run = new Run({ seed, heat: 0.3 });
    let steps = 0, plan = [], left = 0;
    while (run.state === "run" && steps < 60 * 900) {
        let cmd = 0;
        if (left <= 0) {
            const list = obstaclesFor(run, 2.4);
            const r = list.length ? solve(run.p, run.d, run.d + 2.2 * run.speed, run.speed, list, 6, run.disguise === "skates") : { ok: true, cmds: [0] };
            cmd = r.ok ? r.cmds[0] : 0;
            left = 6;
        }
        left--; steps++;
        run.step(STEP, cmd);
        run.events.length = 0;
    }
    return { run, steps };
}
const BLOCK = "BLv";
/** A person, as rules. skill: { look (s of road read), lag ([min,max] s), slip (chance per input of being badly late) } */
function play(seed, skill, rng, o = {}) {
    const run = new Run({ seed, start: o.start ?? 0, heat: 0.3 });
    let pending = null, steps = 0, inputs = 0;
    const lagNow = () => skill.lag[0] + rng() * (skill.lag[1] - skill.lag[0]) + (rng() < skill.slip ? 0.3 : 0);
    while (run.state === "run" && steps < 60 * 900) {
        steps++;
        let cmd = 0;
        if (pending && pending.at <= steps) { cmd = pending.cmd; pending = null; inputs++; }
        if (!pending && steps % 3 === 0 && run.p.fly <= 0) {
            const p = run.p, v = run.speed, rows = new Map();
            for (const ob of run.obstacles) {
                if (ob.dead) continue;
                const at = run.obD(ob), eta = (at - run.d) / (v * (1 + ob.v));
                if (at + ob.len + 0.5 < run.d) continue;
                if (eta > skill.look) { if (!ob.v) break; continue; }
                const key = Math.round(ob.d);
                if (!rows.has(key)) rows.set(key, { eta: Math.max(eta, 0), lanes: ["", "", ""], d: at });
                rows.get(key).lanes[ob.lane] = ob.kind;
                if (ob.kind === "L") for (const [k, r] of rows) if (k > key && k < ob.d + ob.len) r.lanes[ob.lane] = "L";
            }
            const list = [...rows.values()].sort((a, b) => a.d - b.d);
            for (const r of list) for (const ob of run.obstacles) if (ob.kind === "L" && !ob.dead && ob.d <= r.d && ob.d + ob.len >= r.d) r.lanes[ob.lane] = "L";
            if (list.length) {
                // Cheapest line through what's visible.
                let cost = [0, 1, 2].map((l) => Math.abs(l - p.lane) * 1.2);
                const paths = [[0], [1], [2]];
                let best = [[p.lane]];
                for (let i = 0; i < list.length; i++) {
                    const next = [1e9, 1e9, 1e9], np = [null, null, null];
                    for (let l = 0; l < 3; l++) {
                        const k = list[i].lanes[l];
                        if (BLOCK.includes(k) && k) continue;
                        const add = k === "c" ? 3 : k ? 0.5 : 0;
                        for (let q = 0; q < 3; q++) {
                            const c = cost[q] + Math.abs(l - q) * (i ? 1.2 : 0) + add;
                            if (c < next[l]) { next[l] = c; np[l] = [...paths[q], l]; }
                        }
                    }
                    cost = next; for (let l = 0; l < 3; l++) paths[l] = np[l] ?? paths[l];
                }
                let bl = 0; for (let l = 1; l < 3; l++) if (cost[l] < cost[bl]) bl = l;
                const want = paths[bl][1] ?? p.lane, lag = lagNow();
                const first = list.find((r) => r.eta > 0 && r.d >= run.d && r.lanes[p.lane] !== "L") ?? list[0];
                if (want !== p.lane) pending = { cmd: want < p.lane ? 1 : 2, at: steps + Math.round(lag * 60) };
                else {
                    const k = first.lanes[p.lane];
                    if ((k === "j" || k === "c") && first.eta - lag < 0.2 && first.eta > 0 && !p.air) pending = { cmd: 3, at: steps + Math.round(lag * 60) };
                    if (k === "s" && first.eta - lag < 0.24 && first.eta > 0 && p.slide < first.eta + 0.1) pending = { cmd: 4, at: steps + Math.round(lag * 60) };
                }
            }
        }
        run.step(STEP, cmd);
        run.events.length = 0;
    }
    return { run, steps, inputs };
}
function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// 1. Ace: long look, no lag. Must reach the rocket on every seed.
{
    let ok = 0, n = Number(process.argv[2] ?? 12), hits = 0, time = 0;
    for (let i = 0; i < n; i++) {
        const { run, steps } = ace(1000 + i);
        if (run.state === "finale") ok++; else console.log("  ace stopped at", Math.floor(run.d), run.reason, "seed", 1000 + i);
        hits += run.stats.stumbles; time += steps / 60;
    }
    console.log(`ace: ${ok}/${n} reached the rocket, ${hits} stumbles, ${(time / n).toFixed(0)} s per run`);
}
// 2. People.
const people = {
    "first go": { look: 1.0, lag: [0.18, 0.34], slip: 0.08 },
    "casual": { look: 1.2, lag: [0.14, 0.28], slip: 0.04 },
    "decent": { look: 1.4, lag: [0.12, 0.22], slip: 0.02 },
    "good": { look: 1.7, lag: [0.09, 0.17], slip: 0.008 },
    "expert": { look: 2.0, lag: [0.06, 0.12], slip: 0.002 },
};
const N = Number(process.argv[3] ?? 60);
console.log("\nmedian metres, share of runs reaching each world");
console.log("skill".padEnd(18), "median".padStart(7), ...BIOMES.map((b) => b.id.slice(0, 7).padStart(9)), "rocket".padStart(8));
for (const [name, skill] of Object.entries(people)) {
    const ds = [], reach = BIOMES.map(() => 0); let win = 0; const killers = {};
    for (let i = 0; i < N; i++) {
        const { run } = play(2000 + i * 3, skill, mulberry(i + 7));
        ds.push(run.d);
        { const c = [...run.gen.log].reverse().find((k) => k.d <= run.d + 1); const key = `${c?.id}${run.reason === "caught" ? "(stumbles)" : ""}`; killers[key] = (killers[key] ?? 0) + 1; }
        BIOMES.forEach((b, k) => { if (run.d >= b.start) reach[k]++; });
        if (run.state === "finale") win++;
    }
    ds.sort((a, b) => a - b);
    console.log(name.padEnd(18), String(Math.floor(ds[ds.length >> 1])).padStart(7), ...reach.map((r) => `${Math.round(r / N * 100)}%`.padStart(9)), `${Math.round(win / N * 100)}%`.padStart(8));
    if (process.argv[4]) console.log("   killers:", Object.entries(killers).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(", "));
}
// 3. The curve itself: density of what's generated, over ten seeds, world by world.
console.log("\nworld      speed  beat ms  rows/s  hard rows%  tier mix (1 2 3 4)  min gap ms");
const bins = BIOMES.map(() => ({ rows: 0, hard: 0, t: [0, 0, 0, 0], time: 0, v: 0, n: 0, minGap: 1e9 }));
for (let s = 0; s < 10; s++) {
    const run = new Run({ seed: 500 + s });
    run.gen.fill(run, ROUTE - 1);
    for (const c of run.gen.log) {
        const b = bins[biomeIndex(c.d)]; if (c.tier) b.t[c.tier - 1]++;
        b.v += c.v; b.n++;
    }
    const rows = new Map();
    for (const o of run.obstacles) rows.set(Math.round(o.d), (rows.get(Math.round(o.d)) ?? 0) + 1);
    const ds = [...rows.keys()].sort((a, b) => a - b);
    for (let i = 0; i < ds.length; i++) {
        const b = bins[biomeIndex(ds[i])]; b.rows++;
        if (i) b.minGap = Math.min(b.minGap, (ds[i] - ds[i - 1]) / speedAt(ds[i]) * 1000);
    }
}
BIOMES.forEach((k, i) => {
    const b = bins[i], end = BIOMES[i + 1]?.start ?? ROUTE, len = end - k.start, tt = len / (b.v / b.n) * 10, sum = b.t.reduce((a, c) => a + c, 0) || 1;
    console.log(k.id.padEnd(10), (b.v / b.n).toFixed(1).padStart(5), String(Math.round(beatAt((k.start + end) / 2) * 1000)).padStart(8), (b.rows / tt).toFixed(2).padStart(7), `${b.t.map((x) => Math.round(x / sum * 100)).join(" ")}`.padStart(24), String(Math.round(b.minGap)).padStart(10));
});
process.exit(0);
