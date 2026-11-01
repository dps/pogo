// Plays the rules directly, far faster than real time. A plain, sensible human: builds a maze near the gates,
// covers the threat it can see in the wave preview, upgrades what it has. Not clever, so the balance has slack.
// usage: node tools/simbot.mjs [--meta none|half|full] [--level N] [--endless M] [-v]
import { ALMANAC, COLS, DEFS, LEVELS, ROWS, levelWaves, metaFx, waveSummary, ALL_PESTS } from "../data.js";
import { Sim, cellOf } from "../sim.js";

const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? d : process.argv[i + 1]; };
const verbose = process.argv.includes("-v");

/** Score a cell for a defender: how much route it can see, and whether it lengthens the walk. */
function bestCell(sim, key) {
    const d = DEFS[key], range = Math.max(d.range || 1.5, 1.2);
    let best = null, bs = -1e9;
    const covered = sim.routes.flat();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (sim.whyNot(key, c, r)) continue;
        const i = cellOf(c, r);
        let seen = 0;
        for (const [x, y] of covered) if (Math.hypot(x - c - 0.5, y - r - 0.5) <= range) seen++;
        if (d.walk && !covered.some(([x, y]) => (x | 0) === c && (y | 0) === r)) continue;
        let score = seen * (d.kind === "box" ? -1 : 1);
        if (!d.walk) {
            const alt = sim.tryRoutes(i);
            if (alt) { const a = alt.reduce((n, p) => Math.max(n, p.length), 0); score += (a - sim.routeLen) * 2.2; }
        }
        // A heap wants friends; a box wants to hide.
        if (d.kind === "aura") { score = 0; for (const t of sim.towers) if (Math.max(Math.abs(t.c - c), Math.abs(t.r - r)) <= 1 && t.s.kind !== "aura") score += 5; }
        if (sim.tile[i] === 2) score += 3;
        if (key === "hive" && sim.season === "winter") { const warm = sim.towers.some((t) => t.s.warm && Math.hypot(t.x - c - 0.5, t.y - r - 0.5) <= t.s.warm); score += warm ? 30 : -30; }
        if (score > bs) { bs = score; best = [c, r]; }
    }
    return best;
}

function wants(sim) {
    const seen = new Set(sim.preview().map((p) => p.type));
    for (const e of sim.enemies) seen.add(e.type);
    const list = [];
    const n = (k) => sim.towers.filter((t) => t.key === k).length, have = (k) => sim.unlocked.includes(k);
    const fighters = sim.towers.filter((t) => ["gnome", "hive", "chilli", "flytrap"].includes(t.key)).length;
    // Read the preview: a wave of nothing but flyers makes gnomes pointless.
    const air = sim.preview().filter((p) => ["aphid", "wasp", "lady"].includes(p.type)).length, kinds = sim.preview().length;
    if (fighters < 3) {
        if (air && air === kinds && sim.unlocked.includes("chilli")) return sim.season === "winter" && n("compost") < 1 && fighters >= 1 ? ["compost", "chilli"] : ["chilli"];
        return ["gnome"];
    }
    if (have("bramble") && n("bramble") < 8 && sim.routeLen < 34) { const at = bestCell(sim, "bramble"); if (at) { const alt = sim.tryRoutes(cellOf(at[0], at[1])); if (alt && alt.reduce((m, p) => Math.max(m, p.length), 0) > sim.routeLen) list.push("bramble"); } }
    const flyers = seen.has("aphid") || seen.has("wasp") || seen.has("lady");
    if (flyers && sim.season === "winter" && have("compost") && n("compost") < 1) list.push("compost");
    if (flyers && sim.season === "winter" && have("chilli") && n("chilli") < 2 + fighters / 4) list.push("chilli");
    if (flyers && have("hive") && n("hive") < 1 + fighters / 3) list.push("hive");
    if ((seen.has("snail") || seen.has("shelly")) && have("sprinkler") && n("sprinkler") < 1) list.push("sprinkler");
    if (seen.has("cater") && have("lantern") && n("lantern") < 1) list.push("lantern");
    if (seen.has("cater") && !have("lantern") && have("sprinkler") && n("sprinkler") < 1) list.push("sprinkler");
    if (sim.season === "winter" && have("compost") && n("compost") < fighters / 4) list.push("compost");
    if (have("box") && n("box") < 1 && sim.wave < sim.total * 0.4 && fighters >= 4) list.push("box");
    if (have("compost") && n("compost") < fighters / 6) list.push("compost");
    if (have("chilli") && n("chilli") < fighters / 4) list.push("chilli");
    if (have("flytrap") && n("flytrap") < fighters / 4) list.push("flytrap");
    if (have("bramble") && n("bramble") < 6 && sim.wave > 1) list.push("bramble");
    list.push("gnome");
    return list;
}

export function act(sim) {
    for (let guard = 0; guard < 4; guard++) {
        // Finish what's already planted first, once there is a decent spread.
        const ups = sim.towers.filter((t) => sim.nextUp(t, t.branch ?? "a") && t.s.kind !== "thorn");
        const pickBranch = (t) => t.branch ?? (t.key === "gnome" ? "a" : t.key === "compost" ? "a" : t.key === "box" ? "a" : "b");   // chilli b is the cone: splash for swarms
        const cheapest = ups.map((t) => ({ t, b: pickBranch(t), c: sim.upCost(t, pickBranch(t)) })).sort((x, y) => x.c - y.c)[0];
        const key = wants(sim).find((k) => sim.costOf(k) <= sim.pennies);
        const want = wants(sim)[0];
        if (want !== key && sim.pennies < sim.costOf(want) && sim.towers.length) return;   // save up for what's needed
        if (cheapest && sim.pennies >= cheapest.c && sim.towers.length >= 3 && (sim.towers.length % 3 !== 0 || !key)) { sim.upgrade(cheapest.t, cheapest.b); continue; }
        if (key) { const at = bestCell(sim, key); if (at) { sim.plant(key, at[0], at[1]); continue; } }
        return;
    }
}

export function playLevel(level, meta, o = {}) {
    const sim = new Sim({ level, endless: o.endless, meta, seed: 1000 + level * 37 });
    const dt = 1 / 60;
    let ticks = 0, peak = 0;
    const cap = 60 * 60 * 30;
    while (!sim.over && ticks < cap) {
        if (ticks % 30 === 0) act(sim);
        if (ticks % 120 === 0 && sim.slipperCd <= 0 && sim.enemies.length) {
            const e = [...sim.enemies].sort((a, b) => a.prog - b.prog)[0];
            if (e && !e.burrowed && e.prog < 6) sim.slipper(e.x, e.y);
        }
        sim.tick(dt);
        ticks++;
        peak = Math.max(peak, sim.enemies.length);
        if (o.endless !== undefined && sim.wave >= (o.maxWave ?? 60)) break;
    }
    return { sim, secs: ticks / 60, peak };
}

if (process.argv[1].endsWith("simbot.mjs")) {
    const m = arg("meta", "none");
    let owned = {};
    if (m === "full") for (const n of ALMANAC) owned[n.id] = true;
    if (m === "half") for (const n of ALMANAC.slice(0, 14)) owned[n.id] = true;
    const meta = metaFx(owned);
    if (arg("endless")) {
        const r = playLevel(Number(arg("endless")), meta, { endless: Number(arg("endless")) });
        console.log(`endless map ${arg("endless")}: reached wave ${r.sim.wave}, ${r.secs | 0}s, peak ${r.peak}`);
        process.exit(0);
    }
    const only = arg("level"), t0 = performance.now();
    let wins = 0, stars = 0;
    for (let i = 0; i < LEVELS.length; i++) {
        if (only !== undefined && i !== Number(only)) continue;
        const { sim, secs, peak } = playLevel(i, meta);
        wins += sim.over === "win" ? 1 : 0; stars += sim.stars ?? 0;
        const fin = sim.towers.length;
        console.log(`L${String(i + 1).padStart(2)} ${LEVELS[i].name.padEnd(26)} ${String(sim.over).padEnd(5)} ${"*".repeat(sim.stars ?? 0).padEnd(3)} bites ${String(sim.bites).padStart(2)}/${sim.maxBites} wave ${sim.wave}/${sim.total} ${String(secs | 0).padStart(4)}s peak ${String(peak).padStart(3)} towers ${fin} left ${sim.pennies | 0}p kills ${sim.killed}`);
        if (verbose) console.log("   ", sim.towers.map((t) => `${t.key}${t.tier}${t.branch ?? ""}`).join(" "));
    }
    console.log(`meta=${m} wins ${wins} stars ${stars} (${((performance.now() - t0) / 1000).toFixed(1)}s)`);
}
