// Seeded headless tuning harness. Run: node bot.mjs [games] [skill] [firstSeed]
// Plays at human pace (about 1.3 s between drops) through the real game loop.
import { botPick, Pile, RADII } from "./game.js";
const game = globalThis.__pogo;
const N = Number(process.argv[2] ?? 30), skill = Number(process.argv[3] ?? 1), first = Number(process.argv[4] ?? 1), CAP = 60 * 60 * 25;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function mulberry(a) { return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/** Expert: actually try each drop in a copy of the world and judge the result. skill 2 uses this. */
function fork(sim) {
    const c = new Pile(sim.w, 1);
    c.bodies = sim.bodies.map((b) => ({ ...b }));
    c.queue = [...sim.queue]; c.drops = sim.drops; c.cool = 0; c.score = sim.score; c.chain = sim.chain; c.chainT = sim.chainT; c.snores = 0; c.grace = 99;
    c.acornDue = 1e9; c.snowDue = 1e9;
    return c;
}
function judge(c) {
    const { W, H } = c.w;
    let mass = 0, top = H, near = 0, bury = 0;
    const list = c.bodies;
    for (let i = 0; i < list.length; i++) {
        const a = list[i];
        mass += a.r * a.r * (H - a.y) / H;
        if (a.y - a.r < top) top = a.y - a.r;
        if (a.kind !== "c") continue;
        for (let j = i + 1; j < list.length; j++) {
            const b = list[j];
            if (b.kind !== "c") continue;
            const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
            if (gap < 14) { if (a.t === b.t) near += 6 + a.t * 2; else if (Math.abs(a.t - b.t) === 1) near += 1.5; }
            if (gap < 8) { const hi = a.y < b.y ? a : b, lo = hi === a ? b : a; if (hi.t > lo.t + 2) bury += (hi.t - lo.t); }
        }
    }
    return -mass * 0.012 + near - bury * 3 + (top < 30 ? (top - 30) * 3 : 0) + top * 0.05;
}
function expert(sim) {
    const r = sim.pieceRadius(sim.held);
    let best = sim.w.W / 2, bv = -1e12;
    for (let x = r; x <= sim.w.W - r + 0.1; x += 14) {
        const c = fork(sim);
        c.aim = x; c.drop();
        for (let i = 0; i < 70; i++) { c.step(1 / 60); c.events.length = 0; }
        const v = judge(c);
        if (v > bv) { bv = v; best = x; }
    }
    return best;
}
const res = [];
let peakBodies = 0, peakMs = 0, spent = 0, stepsAt = 0, spentPeak = 0, stepsPeak = 0, worstOverlap = 0, maxSpeed = 0, jitter = 0;
for (let seed = first; seed < first + N; seed++) {
    game.go("play", { seed, mode: "free" });
    game.step(2);
    const sim = game.sim, rng = mulberry(seed * 77), start = game.stepCount;
    let wait = 0;
    while (!sim.over && game.stepCount - start < CAP) {
        if (wait-- <= 0 && sim.canDrop) {
            sim.aim = skill >= 2 ? expert(sim) : botPick(sim, rng, skill);
            sim.wantDrop = true;
            wait = sim.chain > 0 ? 50 : 76;
        }
        if (sim.danger > 0.45 && sim.snores > 0) sim.snore();
        const t0 = performance.now();
        game.step(1);
        const ms = performance.now() - t0;
        spent += ms; stepsAt++;
        if (ms > peakMs && stepsAt > 2000) peakMs = ms;
        const n = sim.bodies.length;
        if (n > peakBodies) peakBodies = n;
        if (n >= 45) { spentPeak += ms; stepsPeak++; }
        if (game.stepCount % 120 === 0) for (let i = 0; i < n; i++) {
            const a = sim.bodies[i];
            if (a.sleep && Math.hypot(a.vx, a.vy) > 0) jitter++;
            if (!Number.isFinite(a.x) || a.y > sim.w.H + 1) throw new Error("escaped");
            for (let j = i + 1; j < n; j++) { const b = sim.bodies[j], o = a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y); if (o > worstOverlap && a.r >= a.rr && b.r >= b.rr) worstOverlap = o; }
        }
    }
    res.push({ sec: (game.stepCount - start) / 60, score: sim.score, drops: sim.drops, high: sim.highest, chain: sim.bestChain, springs: sim.springs, n: sim.bodies.length });
}
const col = (k) => res.map((r) => r[k]);
const line = (k) => `${k}: min ${Math.min(...col(k)).toFixed(0)} p25 ${q(col(k), .25).toFixed(0)} median ${q(col(k), .5).toFixed(0)} p75 ${q(col(k), .75).toFixed(0)} max ${Math.max(...col(k)).toFixed(0)}`;
console.log(`games ${N}, skill ${skill}`);
for (const k of ["sec", "score", "drops", "high", "chain"]) console.log(line(k));
const hist = {}; for (const h of col("high")) hist[h] = (hist[h] ?? 0) + 1;
console.log("highest tier histogram", JSON.stringify(hist), "springs", col("springs").reduce((a, b) => a + b, 0), "capped", res.filter((r) => r.sec * 60 >= CAP).length);
console.log(`peak bodies ${peakBodies}; ms/step avg ${(spent / stepsAt).toFixed(3)}, at 45+ pieces ${(spentPeak / (stepsPeak || 1)).toFixed(3)} (${stepsPeak} steps), worst ${peakMs.toFixed(2)}; worst settled overlap ${worstOverlap.toFixed(2)}`);
process.exit(0);
