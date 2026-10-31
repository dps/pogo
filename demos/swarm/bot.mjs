// Seeded headless bots. Run: node bot.mjs [runs] [policy] [firstSeed]
//   policy: decent (default), careless, idle
// "decent" dodges like a competent player: it kites away from the crowd, grabs pearls and
// pickups, sidesteps bullets and picks a sensible build through the real level-up cards.
// It plays only through input: the stick and taps, never by touching the simulation.
import "./game.js";

const game = globalThis.__pogo, D = globalThis.__deep;
const RUNS = Number(process.argv[2] ?? 12), POLICY = process.argv[3] ?? "decent", FIRST = Number(process.argv[4] ?? 1);

function steer(policy, tick) {
    const R = D.R, hx = R.hero.pos.x, hy = R.hero.pos.y;
    if (policy === "idle") return [0, 0];
    if (policy === "careless") {
        // Wanders in slow curves and ignores the swarm: a player not paying attention.
        const a = Math.sin(tick * 0.011) * 3 + tick * 0.004;
        return [Math.cos(a), Math.sin(a)];
    }
    let fx = 0, fy = 0, close = 0;
    for (let i = 0; i < R.top; i++) {
        if (!D.ealive[i]) continue;
        const dx = hx - D.ex[i], dy = hy - D.ey[i], d = Math.hypot(dx, dy) || 1, reach = 150 + D.er[i] * 2;
        if (d > reach) continue;
        const w = (1 - d / reach) ** 2 * (D.er[i] > 25 ? 4 : 1) * (d < 46 ? 4 : 1);
        fx += dx / d * w; fy += dy / d * w;
        if (d < 60) close++;
    }
    for (const p of R.shots) {
        if (!p.hurt) continue;
        const dx = hx - p.x, dy = hy - p.y, d = Math.hypot(dx, dy) || 1;
        if (d > 90) continue;
        // Step sideways off the bullet's line.
        const s = (p.vx * dy - p.vy * dx) > 0 ? 1 : -1, sp = Math.hypot(p.vx, p.vy) || 1, w = 2.2 * (1 - d / 90);
        fx += -p.vy / sp * s * -w; fy += p.vx / sp * s * -w;
    }
    // Go for the nearest pearl when it's calm, and for pickups even when it isn't.
    let gx = 0, gy = 0, best = 1e9;
    for (let i = 0; i < D.pon.length; i++) {
        if (!D.pon[i]) continue;
        const d = Math.hypot(D.px[i] - hx, D.py[i] - hy);
        if (d < best) { best = d; gx = D.px[i] - hx; gy = D.py[i] - hy; }
    }
    if (best < 1e9) { const k = close > 2 ? 0.3 : 1.1; fx += gx / (best || 1) * k; fy += gy / (best || 1) * k; }
    for (const q of R.drops) {
        const dx = q.x - hx, dy = q.y - hy, d = Math.hypot(dx, dy) || 1;
        fx += dx / d * 2.5; fy += dy / d * 2.5;
    }
    const m = Math.hypot(fx, fy);
    return m < 0.05 ? [0, 0] : [fx / m, fy / m];
}

function score(c, R) {
    let s = game.fxRng.next() * 2;
    if (c.kind === "evo") s += 100;
    if (c.kind === "new") s += Object.keys(R.weapons).length < 4 ? 20 : 5;
    if (c.kind === "up") s += 12;
    if (c.kind === "pas") s += c.lv === 1 ? 11 : 6;
    if (c.key === "harpoon" || c.key === "whet") s += 1;
    return s;
}

function tapCard() {
    const R = D.R;
    if (R.cardT < 0.35) return;
    let best = null, bs = -1;
    for (const e of R.cards) { const s = score(e.card, R); if (s > bs) { bs = s; best = e; } }
    game.input.tap(best.pos.x, best.pos.y);
}

const results = [];
let peakAlive = 0, slowest = 0;
const buckets = []; // Step times once 300+ fish are alive.
for (let run = 0; run < RUNS; run++) {
    game.seed = FIRST + run;
    game.resize("phone");
    game.input.touchMode = true;
    game.restart("play");
    let tick = 0, deathT = 0, firstEvo = null, levelAt = {};
    const hpLog = [];
    while (game.currentName === "play" && tick < 60 * 700) {
        const R = D.R;
        if (R.cards.length) tapCard();
        else if (tick % 6 === 0) { const [x, y] = steer(POLICY, tick); game.input.setStick(x, y); }
        const t0 = performance.now();
        game.step(1);
        const dt = performance.now() - t0;
        if (D.R.alive >= 300) { buckets.push(dt); slowest = Math.max(slowest, dt); }
        if (D.R.boss >= 0) D.R.bossLeft = D.boss();
        if (D.R.evolved.length && firstEvo === null) firstEvo = D.R.t;
        if (tick % 1800 === 0) hpLog.push(`${Math.round(D.R.t)}s:hp${Math.round(D.R.hp)} lv${D.R.lv} n${D.R.alive} k${D.R.kills}`);
        peakAlive = Math.max(peakAlive, D.R.alive);
        tick++;
    }
    const R = D.R;
    // Let the fade into the summary scene finish, so the save path runs too.
    game.step(90);
    results.push({ seed: game.seed, won: R.won, t: R.t, lv: R.lv, kills: R.kills, peak: R.peak, evo: R.evolved.length, firstEvo, weapons: Object.keys(R.weapons).join(","), bossLeft: R.bossLeft, dmg: R.dmg, log: hpLog });
    const r = results.at(-1), top = Object.entries(R.dmg).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}:${Math.round(v / 1000)}k`).join(" ");
    console.log(`seed ${String(r.seed).padStart(3)}  ${r.won ? "WIN " : "dead"}  ${clock(r.t)}  lv ${String(r.lv).padStart(2)}  kills ${String(r.kills).padStart(5)}  peak ${String(r.peak).padStart(3)}  evo ${r.evo}  boss ${r.won ? "dead" : r.bossLeft ? Math.round(r.bossLeft * 100) + "%" : "-"}  ${top}`);
    if (process.env.HURT) console.log("    hurtBy", JSON.stringify(R.hurtBy), "maxHp", R.maxHp, "passives", JSON.stringify(R.passives), "last", R.lastT);
    if (process.env.LOG) console.log("   ", r.log.join(" | "));
}
function clock(t) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`; }

const wins = results.filter((r) => r.won).length, times = results.map((r) => r.t).sort((a, b) => a - b);
const avg = (l) => l.reduce((a, b) => a + b, 0) / (l.length || 1);
buckets.sort((a, b) => a - b);
console.log(`\n${POLICY}: ${RUNS} runs, wins ${wins} (${Math.round(wins / RUNS * 100)}%), median ${clock(times[times.length >> 1])}, min ${clock(times[0])}, max ${clock(times.at(-1))}, avg level ${avg(results.map((r) => r.lv)).toFixed(1)}, avg kills ${Math.round(avg(results.map((r) => r.kills)))}`);
if (buckets.length) console.log(`peak alive ${peakAlive}; with 300+ alive: mean ${avg(buckets).toFixed(3)} ms/step, p99 ${buckets[Math.floor(buckets.length * 0.99)].toFixed(3)}, max ${slowest.toFixed(2)} (${buckets.length} steps, Node, no rendering)`);
process.exit(0);
