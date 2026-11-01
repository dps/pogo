// Bird Brain: random squads on generated maps. Every map is checked by the planner before you see it, so a run can be
// lost to bad decisions but never to a bad deal. Pure rules, so bots can run thousands.
import { N, T, newBattle } from "./sim.js";
import { solve } from "./solver.js";
import { CLASSES, PIGEONS } from "./data.js";

export const RUN_LENGTH = 8;
const ZONES = ["lawn", "bandstand", "fountain", "rooftop", "island"];

export function rngFrom(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function newRun(seed) {
    const r = rngFrom(seed), pool = CLASSES.slice(), squad = [];
    while (squad.length < 3) squad.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const members = squad.map((k) => ({ k, up: {}, hp: null }));
    const m = pick(r, members), u = pick(r, PIGEONS[m.k].ups);
    m.up[u.id] = true;
    return { seed, depth: 0, squad: members, log: [] };
}

function genOnce(r, depth, squadSize) {
    const zone = ZONES[Math.min(ZONES.length - 1, Math.floor((depth / RUN_LENGTH) * ZONES.length))];
    const final = depth === RUN_LENGTH - 1;
    const g = Array(N * N).fill(zone === "lawn" ? T.GRASS : T.PATH);
    const put = (x, y, t) => { if (y >= 0 && x >= 0 && x < N && y < N) g[y * N + x] = t; };
    const hazard = { lawn: [T.WATER, T.HEDGE], bandstand: [T.WATER, T.STONE, T.HEDGE], fountain: [T.WATER, T.SLICK, T.STONE], rooftop: [T.SPIKE, T.VOID, T.STONE], island: [T.WATER, T.SPIKE, T.HEDGE] }[zone];
    // Mirrored blobs of terrain: boards look designed and stay fair to both flanks.
    const patches = 2 + Math.floor(r() * 3);
    for (let i = 0; i < patches; i++) {
        const t = pick(r, hazard), x = 1 + Math.floor(r() * 3), y = 1 + Math.floor(r() * 4), w = 1 + Math.floor(r() * 2), h = 1 + Math.floor(r() * 2);
        for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) { put(x + a, y + b, t); if (r() < 0.8) put(N - 1 - (x + a), y + b, t); }
    }
    const free = () => { for (let i = 0; i < 80; i++) { const x = Math.floor(r() * N), y = Math.floor(r() * 6), c = y * N + x; if (g[c] === T.GRASS || g[c] === T.PATH) return [x, y]; } return null; };
    const used = new Set();
    const spot = (minY = 0, maxY = 5) => { for (let i = 0; i < 80; i++) { const p = free(); if (p && p[1] >= minY && p[1] <= maxY && !used.has(p[1] * N + p[0])) { used.add(p[1] * N + p[0]); return p; } } return null; };
    const deploy = [];
    for (const x of [1, 3, 5, 6].slice(0, squadSize)) { const y = 6; g[y * N + x] = zone === "lawn" ? T.GRASS : T.PATH; deploy.push([x, y]); used.add(y * N + x); }
    const ledge = zone === "rooftop";
    const tier = Math.min(4, Math.floor(depth / 1.6));
    const pool = [["crow", "squirrel"], ["crow", "squirrel", "slinger", "lobber"], ["crow", "slinger", "gull", "lobber", "nutcase"], ["gull", "slinger", "bruiser", "screecher", "squirrel"], ["gull", "bruiser", "screecher", "slinger", "nutcase"]][tier];
    const count = 2 + Math.floor(depth * 0.55) + (r() < 0.5 ? 1 : 0);
    const foes = [];
    for (let i = 0; i < count; i++) { const p = spot(0, 3); if (p) foes.push([pick(r, pool), p[0], p[1]]); }
    const props = [];
    const cans = Math.floor(r() * 3) + 1;
    for (let i = 0; i < cans; i++) { const p = spot(1, 5); if (p) props.push(["can", p[0], p[1]]); }
    if (zone === "bandstand" && r() < 0.7) { const p = spot(1, 5); if (p) props.push(["drum", p[0], p[1]]); }
    const waves = [];
    const edge = () => [pick(r, [0, 7]), Math.floor(r() * 5)];
    const wv = 1 + Math.floor(depth / 3);
    for (let i = 0; i < wv; i++) { const [x, y] = edge(); const round = 1 + i; if (g[y * N + x] === T.GRASS || g[y * N + x] === T.PATH) waves.push({ round, units: [[pick(r, pool), x, y]] }); }
    const m = { id: `rogue${depth}`, name: `Sortie ${depth + 1}`, zone, squad: squadSize, tiles: g, deploy, foes, props, crumbs: [], perch: [], reg: [], exit: null, waves, ledge, vet: depth >= 5 ? 1 : 0, stars: [{ k: "noLoss" }, { k: "fast", n: 4 }], rogue: true, index: 13, rows: [] };
    if (final) {
        const b = spot(1, 3), boss = pick(r, zone === "island" ? ["swan", "contessa", "steve"] : ["steve", "contessa"]);
        m.name = "The Last Sortie"; m.win = "boss"; m.rounds = 7; m.boss = true;
        if (b) m.foes.push([boss, b[0], b[1]]);
        return m;
    }
    const kind = pick(r, depth < 2 ? ["rout", "rout", "survive"] : ["rout", "survive", "collect", "perch", "bag"]);
    m.win = kind === "bag" ? "survive" : kind; m.rounds = 5;
    if (kind === "survive") m.rounds = 3 + Math.min(1, Math.floor(depth / 3));
    if (kind === "bag") { const p = spot(4, 5); if (p) m.props.push(["bag", p[0], p[1]]); m.rounds = 4; }
    if (kind === "collect") { for (let i = 0; i < 3 + (depth > 4 ? 1 : 0); i++) { const p = spot(0, 5); if (p) m.crumbs.push(p[1] * N + p[0]); } m.rounds = 5; }
    if (kind === "perch") { for (let i = 0; i < 3; i++) { const p = spot(1, 5); if (p) m.perch.push(p[1] * N + p[0]); } m.goal = 3 + Math.floor(depth / 3); m.rounds = 4; }
    return m;
}

const KEEP_WORK_SMALL = { width: 2, keep: 2, roots: 3 };

/** The next battle in a run. Tries maps until the planner beats one with the squad as it stands. */
export function genMission(run) {
    const alive = run.squad.filter((p) => p.hp === null || p.hp > 0), size = Math.min(4, alive.length);
    const r = rngFrom((run.seed * 31 + run.depth * 977) >>> 0);
    let fallback = null;
    for (let i = 0; i < 12; i++) {
        const m = genOnce(r, run.depth, size);
        if (!m.foes.length) continue;
        fallback = m;
        const res = solve(newBattle(m, alive), KEEP_WORK_SMALL);
        if (res.win && res.state.stats.lost < size) return { mission: m, tries: i + 1, proven: true };
    }
    return { mission: fallback, tries: 12, proven: false };
}

/** What you may take after a win. Three different things, all from the seed. */
export function rewardsFor(run) {
    const r = rngFrom((run.seed * 131 + run.depth * 7) >>> 0), out = [];
    const alive = run.squad.filter((p) => p.hp === null || p.hp > 0);
    const hurt = alive.some((p) => p.hp !== null && p.hp < maxHp(p));
    out.push({ type: "heal", title: "Crumb Feast", text: hurt ? "Everyone back to full health." : "Everyone's fine. Have 1 extra health for the road." });
    const ups = [];
    for (const p of alive) for (const u of PIGEONS[p.k].ups) if (!p.up[u.id]) ups.push({ type: "up", k: p.k, id: u.id, title: `${PIGEONS[p.k].name}: ${u.name}`, text: u.desc });
    for (let i = ups.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ups[i], ups[j]] = [ups[j], ups[i]]; }
    if (ups[0]) out.push(ups[0]);
    const fresh = CLASSES.filter((k) => !run.squad.some((p) => p.k === k));
    if (fresh.length && alive.length < 4) { const k = pick(r, fresh); out.push({ type: "recruit", k, title: `Recruit ${PIGEONS[k].name}`, text: `${PIGEONS[k].role}. ${PIGEONS[k].tag}` }); }
    else if (ups[1]) out.push(ups[1]);
    return out;
}
export const maxHp = (p) => PIGEONS[p.k].hp + (p.up.hp ? 1 : 0);

export function applyReward(run, rw) {
    if (rw.type === "heal") for (const p of run.squad) if (p.hp !== null && p.hp > 0) p.hp = maxHp(p);
    if (rw.type === "up") run.squad.find((p) => p.k === rw.k).up[rw.id] = true;
    if (rw.type === "recruit") run.squad.push({ k: rw.k, up: {}, hp: null });
}
/** Carry wounds forward: a small rest between sorties. KO'd birds are gone for the run. */
export function afterBattle(run, st) {
    const list = run.squad.filter((p) => p.hp === null || p.hp > 0);
    list.forEach((p, i) => {
        const u = st.units.find((q) => q.side === 0 && q.k === p.k);
        p.hp = u ? Math.max(0, u.hp) : p.hp;
        if (p.hp > 0) p.hp = Math.min(maxHp(p), p.hp + 1);
        void i;
    });
    run.squad = run.squad.filter((p) => p.hp === null || p.hp > 0);
    run.depth++;
}
