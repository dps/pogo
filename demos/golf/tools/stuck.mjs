// Proves no ball can get stuck. Three tests per hole, all with the real physics:
//  1. Drop a dead ball on a fine grid over every surface, at several clock times: it must settle, on its own, in bounded time.
//  2. Fuzz: from the tee, spray random shots at random moments and follow every place the ball comes to rest.
//     No shot may hit the game's timeout. Every rest spot goes in a graph.
//  3. Every rest spot in that graph must have a route to the cup: first through the sampled graph, then by aimed search.
// usage: node tools/stuck.mjs [from] [to] [shotsPerNode]
import { Course, CELL, BALL_R, LAVA, WATER } from "../course.js";
import { HOLES } from "../holes.js";
import { Sim, HZ } from "../sim.js";
import { seedRng, isTimed, restAt, shot } from "./lib.mjs";
const [from = 0, to = HOLES.length, perNode = 26] = process.argv.slice(2).map(Number);
let bad = 0;
const key = (s) => `${Math.round(s.x)},${Math.round(s.z)},${Math.round(s.y)}`;
for (let i = from; i < to; i++) {
    const t0 = performance.now(), def = HOLES[i], c = new Course(def, def.island), sim = new Sim(c), rng = seedRng(4242 + i * 13), tm = isTimed(c);
    // 1. dead-ball grid
    let drops = 0, dropBad = 0, dropMax = 0;
    for (let z = c.span.z0; z < c.span.z1; z += 0.5) for (let x = c.span.x0; x < c.span.x1; x += 0.5) {
        if (!c.inFairway(x, z) && !c.onDeck(x, z)) continue;
        for (const t of tm ? [1, 3.3, 7.1] : [1]) {
            const g = c.inFairway(x, z) ? sim.sample(x, z) : 0;
            restAt(sim, { x, y: (g > -5 ? g : c.cup_.y) + BALL_R + 0.25, z, t });
            sim.mode = "roll"; sim.shotT = 0; drops++;
            let n = 0; while ((sim.mode === "roll" || sim.mode === "inside") && n < 34 * HZ) { sim.step(); n++; }
            dropMax = Math.max(dropMax, n / HZ);
            if (sim.mode === "roll" || sim.mode === "inside" || (sim.mode === "lost" && sim.reason === "timeout")) { dropBad++; if (dropBad < 4) console.log("   drop never settled at", x.toFixed(1), z.toFixed(1), "t", t, sim.mode, sim.reason, "speed", sim.speed.toFixed(2)); }
        }
    }
    // 2. fuzz graph
    const nodes = new Map(), start = { x: c.tee_.x, y: c.tee_.y, z: c.tee_.z, t: 0 }, q = [];
    const add = (s) => { const k = key(s); let n = nodes.get(k); if (!n) { n = { k, s, out: new Set(), cup: false }; nodes.set(k, n); q.push(n); } return n; };
    add(start);
    let shots = 0, timeouts = 0, lost = 0, holed = 0, maxLen = 0;
    for (let h = 0; h < q.length && shots < 9000; h++) {
        const n = q[h];
        for (let j = 0; j < perNode; j++) {
            const r = shot(sim, n.s, { h: rng() * Math.PI * 2, p: 0.08 + rng() * 0.92, chip: rng() < 0.3, wait: tm ? rng() * 5 : 0 });
            shots++; maxLen = Math.max(maxLen, r.steps / HZ);
            if (r.mode === "holed") { n.cup = true; holed++; }
            else if (r.mode === "lost") { if (r.reason === "timeout") { timeouts++; console.log("   TIMEOUT from", n.k, "ends", r.x.toFixed(1), r.y.toFixed(2), r.z.toFixed(1)); } else lost++; }
            else if (r.mode === "rest") n.out.add(add({ ...r, secret: false }).k);
            else { timeouts++; console.log("   UNSETTLED", r.mode, r.x.toFixed(1), r.z.toFixed(1)); }
        }
    }
    // 3. every rest spot reaches the cup
    const good = new Set([...nodes.values()].filter((n) => n.cup).map((n) => n.k));
    for (let changed = true; changed;) { changed = false; for (const n of nodes.values()) if (!good.has(n.k) && [...n.out].some((k) => good.has(k))) { good.add(n.k); changed = true; } }
    // Whatever the random graph didn't connect gets an aimed search for a shot that makes real progress along the
    // walking distance. Distance falls strictly at each hop, so a chain of such shots must end in the cup.
    let rescued = 0;
    const Fd = (st) => c.fieldAt(st.x, st.z, c.Fall);
    const escape = (n, depth) => {
        if (good.has(n.k)) return true;
        if (n.tried || depth > 40) return false;
        n.tried = true;
        const d0 = Fd(n.s), a = c.ahead(n.s.x, n.s.z, 6), cup = c.cup_, aims = [Math.atan2(a[0] - n.s.x, -(a[1] - n.s.z)), Math.atan2(cup.x - n.s.x, -(cup.z - n.s.z))], hops = [];
        for (let j = 0; j < 700; j++) {
            const r = shot(sim, n.s, { h: aims[j % 2] + (rng() - 0.5) * (j < 300 ? 0.7 : 6.3), p: 0.12 + rng() * 0.88, chip: j % 3 === 0, wait: tm && j % 2 ? rng() * 6 : 0 });
            if (r.mode === "holed") { good.add(n.k); rescued++; return true; }
            if (r.mode === "rest") { const k = key(r); if (good.has(k)) { good.add(n.k); rescued++; return true; } const d = Fd(r); if (d < d0 - 0.2 && !hops.some((h) => h.k === k)) hops.push({ k, r, d }); }
        }
        hops.sort((x, y) => x.d - y.d);
        for (const h of hops.slice(0, 5)) {
            let m = nodes.get(h.k);
            if (!m) { m = { k: h.k, s: { ...h.r, secret: false }, out: new Set(), cup: false }; nodes.set(h.k, m); }
            if (escape(m, depth + 1)) { good.add(n.k); rescued++; return true; }
        }
        return false;
    };
    const orphans = [...nodes.values()].filter((n) => !good.has(n.k)).sort((x, y) => Fd(x.s) - Fd(y.s));
    for (const n of orphans) {
        if (good.has(n.k)) continue;
        if (!escape(n, 0)) console.log("   NO WAY OUT from rest spot", n.k, "walking distance", Fd(n.s).toFixed(1));
        for (let changed = true; changed;) { changed = false; for (const m of nodes.values()) if (!good.has(m.k) && [...m.out].some((k) => good.has(k))) { good.add(m.k); changed = true; } }
    }
    const left = [...nodes.values()].filter((n) => !good.has(n.k)).length;
    if (dropBad || timeouts || left) bad++;
    console.log(`${String(i + 1).padStart(2)} ${def.name.padEnd(24)} drops ${drops} bad ${dropBad} slowest ${dropMax.toFixed(1)}s | shots ${shots} holed ${holed} hazards ${lost} timeouts ${timeouts} longest ${maxLen.toFixed(1)}s | rest spots ${nodes.size} rescued ${rescued} trapped ${left} (${((performance.now() - t0) / 1000).toFixed(0)}s)`);
}
console.log(bad ? `${bad} hole(s) have stuck risks` : "NO BALL CAN GET STUCK: all drops settle, all shots end, all rest spots reach the cup");
process.exitCode = bad ? 1 : 0;
