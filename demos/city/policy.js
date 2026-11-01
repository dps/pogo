// A decent player, used by every bot. It only uses what the UI shows: preview(), canPlace(), forecast.
import { BUILDINGS, TRAY_ORDER } from "./data.js";

/** Smallest set of tiles to wall so the sea can't reach `targets` at `level`. Vertex min cut by augmenting paths. */
export function wallCut(sim, targets, level) {
    const cells = sim.cells, N = cells.length, INF = 1e6;
    // in = 2i, out = 2i+1, source = 2N, sink = 2N+1
    const edges = [], head = Array.from({ length: 2 * N + 2 }, () => []);
    const add = (a, b, c) => { head[a].push(edges.length); edges.push({ to: b, cap: c }); head[b].push(edges.length); edges.push({ to: a, cap: 0 }); };
    const passable = (c) => c.h < level;
    const target = new Set(targets);
    for (const c of cells) {
        if (!passable(c)) continue;
        const isWall = c.b?.type === "wall" && !c.b.wrecked;
        let cap = INF;
        if (isWall && c.h + 2 >= level) cap = 0;
        else if (!isWall && c.h >= 0 && !c.b && !target.has(c.i) && c.h + 2 >= level) cap = 1;
        add(2 * c.i, 2 * c.i + 1, cap);
        if (c.h < 0) add(2 * N, 2 * c.i, INF);
        if (target.has(c.i)) add(2 * c.i + 1, 2 * N + 1, INF);
        for (const j of c.n) if (passable(cells[j])) add(2 * c.i + 1, 2 * j, INF);
    }
    let flow = 0;
    for (;;) {
        const prev = new Int32Array(2 * N + 2).fill(-1), q = [2 * N];
        prev[2 * N] = -2;
        while (q.length && prev[2 * N + 1] === -1) {
            const u = q.shift();
            for (const ei of head[u]) {
                const e = edges[ei];
                if (e.cap > 0 && prev[e.to] === -1) { prev[e.to] = ei; q.push(e.to); }
            }
        }
        if (prev[2 * N + 1] === -1) {
            const cut = [];
            for (const c of cells) if (prev[2 * c.i] !== -1 && prev[2 * c.i + 1] === -1 && passable(c)) cut.push(c.i);
            return { cut, flow, reachable: prev };
        }
        flow++;
        if (flow > 40) return { cut: [], flow, impossible: true };
        for (let v = 2 * N + 1; v !== 2 * N;) {
            const ei = prev[v];
            edges[ei].cap -= 1;
            edges[ei ^ 1].cap += 1;
            v = edges[ei ^ 1].to;
        }
    }
}

const affordable = (sim, t) => sim.coins >= BUILDINGS[t].cost[0] && sim.wood >= BUILDINGS[t].cost[1];

function bestCell(sim, type, o = {}) {
    let best = null, bestScore = -Infinity;
    for (const c of sim.cells) {
        if (c.h < 0 || c.b) continue;
        const plan = sim.plan;
        if (plan?.cut.has(c.i)) continue;
        const p = sim.preview(type, c);
        if (!p.ok) continue;
        let score = p.delta * 3 + p.stars;
        if (plan?.heart && !plan.heart.has(c.i) && c.h < plan.level && type !== "dock" && type !== "yard" && type !== "wood") score -= 50;
        const level = o.level ?? sim.topLevel;
        if (type !== "lane" && type !== "wall" && p.safe < level) score -= o.riskPenalty ?? 30;
        if (c.forest && type !== "wood") score -= 2;
        if (c.h === 0 && type !== "dock" && type !== "yard") score += 3;
        if (o.prefer) score += o.prefer(c, p);
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
}

/** Keep a hand on walls: raise them in the order that can already touch the town, laying lanes to reach the rest. */
function buildWalls(sim, cut) {
    const todo = cut.filter((i) => !sim.cells[i].b);
    for (const i of todo) {
        const c = sim.cells[i];
        if (sim.canPlace("wall", c).ok) { sim.place("wall", c); return true; }
    }
    // Nothing adjacent: lay a lane towards the closest wall tile.
    if (!todo.length || !affordable(sim, "lane")) return false;
    const d = new Map(todo.map((i) => [i, 0])), q = [...todo];
    while (q.length) {
        const u = q.shift();
        for (const j of sim.cells[u].n) if (!d.has(j) && sim.cells[j].h >= 0 && !sim.cells[j].b) { d.set(j, d.get(u) + 1); q.push(j); }
    }
    let best = null;
    for (const [i, v] of d) {
        const c = sim.cells[i];
        if (v > 0 && sim.canPlace("lane", c).ok && (!best || v < best.v)) best = { c, v };
    }
    if (best) { sim.place("lane", best.c); return true; }
    return false;
}

/** Decide once, at the start, which tiles to defend: the cheapest wall ring around the heart of the island. */
export function makePlan(sim) {
    const scn = sim.scn, top = Math.max(0, ...scn.storms.map((st) => st.level), ...scn.goals.filter((g) => g.type === "ride").map((g) => g.level));
    const plan = { level: top, heart: null, cut: new Set() };
    if (!scn.unlocks.includes("wall") || top <= 1) return plan;
    if (!scn.goals.some((g) => g.type === "ride" || g.type === "reclaimed")) return plan;   // Otherwise just build uphill.
    const hall = sim.cells[sim.buildings[0].cell];
    const wantsSand = scn.goals.some((g) => g.type === "reclaimed");
    let best = null;
    const nearSea = (c) => c.n.some((j) => sim.cells[j].h < 0 || sim.cells[j].b?.type === "dock" || (top > 2 && sim.cells[j].h === 0));
    for (const rad of [6, 5, 4, 3, 2, 1]) {
        const core = sim.cells.filter((c) => c.h < top && (c.h >= 1 || (wantsSand && c.h === 0)) && dist(c, hall) <= rad && !nearSea(c) && !c.b?.type?.startsWith?.("dock")).map((c) => c.i);
        if (!core.length || !sim.floodMap(top).some((v, i) => v && core.includes(i))) continue;
        const r = wallCut(sim, core, top);
        if (r.impossible || !r.cut.length) continue;
        const heart = sim.cells.filter((c) => c.h >= (wantsSand ? 0 : 1) && c.h < top && !r.cut.includes(c.i) && r.reachable[2 * c.i] === -1).map((c) => c.i);
        const safe = heart.length + sim.cells.filter((c) => c.h >= top).length;
        const value = safe * 1.2 - r.cut.length;
        if (!best || value > best.value) best = { value, heart, cut: r.cut };
    }
    if (best) { plan.heart = new Set(best.heart); plan.cut = new Set(best.cut); }
    return plan;
}

/** One decision pass: place whatever the plan wants most and can afford. Returns true if it built something. */
export function act(sim) {
    const scn = sim.scn, has = (t) => scn.unlocks.includes(t);
    const top = sim.storms.length ? Math.max(...sim.storms.slice(sim.stormIdx).map((s) => s.level), 0) : 0;
    sim.topLevel = top || 1;
    const goalLeft = (type) => scn.goals.find((g, i) => g.type === type && !sim.goalDone[i]);
    const count = (t) => sim.buildings.filter((b) => b.type === t).length;
    const place = (t, o) => {
        if (!affordable(sim, t)) return "wait";
        const c = bestCell(sim, t, o);
        if (!c) return null;
        return sim.place(t, c) ? "done" : null;
    };
    const wants = [];
    const need = (t, o) => { if (has(t)) wants.push([t, o]); };

    // Ring the heart of the town before the sea tests it.
    if (!sim.plan) sim.plan = makePlan(sim);
    if (!goalLeft("ride") && !goalLeft("reclaimed") && sim.plan.cut.size) { sim.plan.cut.clear(); sim.plan.heart = null; }
    const ring = [...sim.plan.cut].filter((i) => !sim.cells[i].b || sim.cells[i].b.wrecked);
    if (ring.length && count("market") && count("cottage") >= 2) {
        const threat = sim.storms.slice(sim.stormIdx).find((st) => st.level > 1);
        const left = threat ? threat.day - sim.day : 99;
        const urgent = left <= ring.length * 0.8 + 3;
        if (urgent || sim.coins > 40) {
            if (!affordable(sim, "wall")) { if (urgent) return false; }
            else if (buildWalls(sim, ring)) return true;
        }
    }
    const rec = goalLeft("reclaimed");
    if (rec) {
        const ok = sim.plan.heart ? [...sim.plan.heart] : [];
        for (const i of ok) {
            const c = sim.cells[i];
            if (c.h === 0 && !c.b && sim.canPlace("farm", c).ok) { sim.place("farm", c); return true; }
        }
    }

    const cottages = count("cottage"), docks = count("dock"), farms = count("farm");
    if (!count("market")) need("market");
    const strict = scn.goals.some((g, i) => (g.type === "ride" || g.type === "feedStreak") && !sim.goalDone[i]);
    const cottageOk = !strict || sim.cells.some((c) => !c.b && c.h >= 0 && !sim.plan?.cut.has(c.i) && sim.preview("cottage", c).ok && (sim.plan?.heart?.has(c.i) || sim.preview("cottage", c).safe >= sim.plan.level));
    if (sim.spare <= 0 && cottageOk && (cottages < 3 || sim.fish + sim.grain > 0)) need("cottage");
    if (!count("wood")) need("wood");
    if (goalLeft("feedStreak")) { if (docks < 2) need("dock"); if (farms < 3 && sim.seasonIndex !== 3) need("farm"); }
    const food = docks * 2.2 + farms * 1.5 + (sim.fish + sim.grain) / 6;
    if (food < cottages + 1) need(has("farm") && docks >= 2 && sim.seasonIndex !== 3 ? "farm" : "dock");
    if (count("wood") < 1 + Math.floor(sim.buildings.length / 9)) need("wood");
    const sell = goalLeft("sold");
    if (sell && food < cottages + 3) {
        need("dock");
        // Mouths are eating the catch and the shore is full: fewer cottages, more for market.
        if (!sim.cells.some((c) => sim.preview("dock", c).ok) && cottages > 3 && sim.coins > 40) { sim.demolish(sim.cells[sim.buildings.find((b) => b.type === "cottage").cell]); return true; }
    }
    if (goalLeft("trawlers") || sell) { if (!count("yard")) need("yard"); if (docks < 2) need("dock"); }
    const lightGoal = scn.goals.find((g, i) => g.kind === "light" && !sim.goalDone[i]);
    if (lightGoal) need("light", { riskPenalty: 8 });
    const farmGoal = scn.goals.find((g, i) => g.kind === "farm" && !sim.goalDone[i]);
    if (farmGoal) need("farm");
    if (has("mill") && farms >= 2 && !count("mill")) need("mill");
    if (has("smoke") && docks >= 2 && !count("smoke")) need("smoke");
    if (has("pub") && farms >= 2 && !count("pub")) need("pub");
    if (goalLeft("folk") && cottageOk) need("cottage");
    if (goalLeft("cheer") && sim.coins > 12 && count("garden") < 4) need("garden");
    if (cottageOk && food >= cottages + 1) need("cottage");
    if (docks < 3) need("dock");
    if (farms < 4) need("farm");
    if (count("garden") < 3) need("garden");

    for (const [t, o] of wants) {
        const r = place(t, o);
        if (r === "done") return true;
        if (r === "wait") return false;      // Save up for the thing we want most.
    }
    return polish(sim, goalLeft);
}

/** Out of plans but not finished: chase stars directly, and clear walls and lanes that no longer earn their tile. */
function polish(sim, goalLeft) {
    if (!goalLeft("cheer") && !goalLeft("folk") && !goalLeft("cottages")) return false;
    const types = sim.scn.unlocks.filter((t) => t !== "wall" && t !== "lane");
    let best = null, top = 0;
    for (const c of sim.cells) {
        if (c.h < 0 || c.b) continue;
        for (const t of types) {
            const p = sim.preview(t, c);
            if (!p.ok) continue;
            const v = p.delta + (t === "cottage" && goalLeft("folk") ? 3 : 0);
            if (v > top) { top = v; best = { t, c }; }
        }
    }
    if (best) return !!sim.place(best.t, best.c);
    if (sim.coins < 60 || goalLeft("ride")) return false;
    const spare = sim.buildings.find((b) => (b.type === "wall" || b.type === "lane" && !bridges(sim, b)) && sim.cells[b.cell].h >= 1);
    return spare ? sim.demolish(sim.cells[spare.cell]) : false;
}

function bridges(sim, b) {
    const was = sim.buildings.filter((x) => x.connected).length, cell = sim.cells[b.cell], keep = cell.b;
    cell.b = null;
    sim.refresh();
    const now = sim.buildings.filter((x) => x !== keep && x.connected).length;
    cell.b = keep;
    sim.refresh();
    return now < was - 1;
}

const dist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

/** Run a scenario to the end, or to maxDays. */
export function playThrough(sim, maxDays = 200, onDay = null) {
    for (let t = 0; t < maxDays * 24 && !sim.finishedDay; t++) {
        sim.tick();
        sim.events.length = 0;
        if (sim.hour % 3 === 0) { let guard = 8; while (guard-- && act(sim)); }
        if (onDay && sim.hour === 0) onDay(sim);
    }
    return sim;
}
