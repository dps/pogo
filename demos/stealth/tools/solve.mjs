// Proves each heist can be finished unseen. Runs the real Sim with no cat to record every patrol as a space-time map of
// watched cells, searches that map for a route, then plays the route back through the real Sim with thumb-sized inputs.
// A heist only counts when the replay wins with zero sightings, zero noises heard and every piece of loot taken.
//   node tools/solve.mjs [heist index or id] [--margin n] [--verbose] [--paths file.json]
import { writeFileSync } from "node:fs";
import { BUMP, DT, NOSE, NR, NS, PUSH, SLINK, SNEEZE, Sim } from "../sim.js";
import { HEISTS } from "../levels.js";
import { HIGH, LOUD, PERCH, SIGHT, T, WALK, buildWorld, flagAt, flagXY } from "../world.js";

const CELL = 16, FRAME = 0.1, STEPS = 6, HORIZON = 360, PLAN_SPEED = SLINK * 0.84;

function inTri(px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by), d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy), d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    if (d1 === 0 && d2 === 0 && d3 === 0) return false;
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
}

/** Every 0.1s of the night with no cat in it: which 16-unit cells are watched. */
export const density = (TL) => { let on = 0, open = 0; const w = TL.w; for (let c = 0; c < TL.cells; c++) { if (flagXY(w, ((c % TL.cw) + 0.5) * CELL, (Math.floor(c / TL.cw) + 0.5) * CELL) & WALK) continue; open++; for (let f = 0; f < TL.frames; f += 20) on += TL.bits[f * TL.cells + c]; } return on / (open * Math.ceil(TL.frames / 20)); };

export function timeline(def, margin, seconds = HORIZON) {
    const w = buildWorld(def), cw = w.cols * 2, ch = w.rows * 2, frames = Math.round(seconds / FRAME), cells = cw * ch;
    const bits = new Uint8Array(cells * frames), sim = new Sim(def, { ghost: true }), mark = new Uint8Array(cells);
    const stamp = (x, y) => { const c = Math.floor(x / CELL), r = Math.floor(y / CELL); if (c >= 0 && r >= 0 && c < cw && r < ch) mark[r * cw + c] = 1; };
    const disc = (x, y, R, los) => {
        const c0 = Math.floor((x - R) / CELL), c1 = Math.floor((x + R) / CELL), r0 = Math.floor((y - R) / CELL), r1 = Math.floor((y + R) / CELL);
        for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
            const px = (c + 0.5) * CELL, py = (r + 0.5) * CELL;
            if (Math.hypot(px - x, py - y) <= R + 11 && (!los || sim.los(x, y, px, py))) stamp(px, py);
        }
    };
    const stride = (NS + 1) * 2;
    for (let f = 0; f < frames; f++) {
        for (let k = 0; k < STEPS; k++) sim.step({});
        mark.fill(0);
        for (const g of sim.guards) {
            if (g.kind === "dog") { if (g.state !== "calm") disc(g.x, g.y, NOSE, true); continue; }
            if (g.kind === "spot") { disc(g.x, g.y, g.rad, false); continue; }
            if (g.kind === "guard") { disc(g.x, g.y, BUMP, false); if (g.sneezes) disc(g.x, g.y, SNEEZE, false); }
            if (sim.blind(g)) continue;
            const p = sim.cone(g);
            for (let i = 0; i < NR - 1; i++) for (let j = 0; j < NS; j++) {
                const a = i * stride + j * 2, b = a + stride;
                const ax = p[a], ay = p[a + 1], bx = p[b], by = p[b + 1], cx = p[b + 2], cy = p[b + 3], dx = p[a + 2], dy = p[a + 3];
                const x0 = Math.min(ax, bx, cx, dx), x1 = Math.max(ax, bx, cx, dx), y0 = Math.min(ay, by, cy, dy), y1 = Math.max(ay, by, cy, dy);
                for (let r = Math.floor(y0 / CELL) - 1; r <= Math.floor(y1 / CELL) + 1; r++) for (let c = Math.floor(x0 / CELL) - 1; c <= Math.floor(x1 / CELL) + 1; c++) {
                    if (c < 0 || r < 0 || c >= cw || r >= ch) continue;
                    const px = (c + 0.5) * CELL, py = (r + 0.5) * CELL, e = 9;
                    for (const [ox, oy] of [[0, 0], [e, 0], [-e, 0], [0, e], [0, -e]]) if (inTri(px + ox, py + oy, ax, ay, bx, by, cx, cy) || inTri(px + ox, py + oy, ax, ay, cx, cy, dx, dy)) { mark[r * cw + c] = 1; break; }
                }
            }
        }
        for (const l of sim.lasers) {
            if (!l.live) continue;
            const n = Math.ceil(Math.hypot(l.x1 - l.x0, l.y1 - l.y0) / 6);
            for (let i = 0; i <= n; i++) { const x = l.x0 + (l.x1 - l.x0) * i / n, y = l.y0 + (l.y1 - l.y0) * i / n; for (const [ox, oy] of [[0, 0], [10, 0], [-10, 0], [0, 10], [0, -10]]) stamp(x + ox, y + oy); }
        }
        const row = bits.subarray(f * cells, (f + 1) * cells);
        row.set(mark);
        // Margins: widen the watched area by whole cells, stopping at walls.
        for (let m = 0; m < margin; m++) {
            const prev = row.slice();
            for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) {
                if (prev[r * cw + c]) continue;
                if ((c > 0 && prev[r * cw + c - 1]) || (c < cw - 1 && prev[r * cw + c + 1]) || (r > 0 && prev[(r - 1) * cw + c]) || (r < ch - 1 && prev[(r + 1) * cw + c])) {
                    if (!(flagXY(w, (c + 0.5) * CELL, (r + 0.5) * CELL) & SIGHT)) row[r * cw + c] = 1;
                }
            }
        }
    }
    // Tall furniture is above every cone, always; except spotlights, which we simply treat as cones too.
    return { bits, cw, ch, cells, frames, w, spots: sim.guards.some((g) => g.kind === "spot") };
}

/** Static moves. Each edge: to, seconds, kind, and for leaps the push direction. */
export function graph(def) {
    const w = buildWorld(def), cw = w.cols * 2, ch = w.rows * 2, sim = new Sim(def, { ghost: true }), edges = Array.from({ length: cw * ch }, () => []);
    const at = (c, r) => flagAt(w, c >> 1, r >> 1);
    const open = (f) => !(f & WALK) || !!(f & PERCH);
    const perch = (f) => !!(f & PERCH);
    for (let r = 0; r < ch; r++) for (let c = 0; c < cw; c++) {
        const f = at(c, r), id = r * cw + c;
        if (!open(f)) continue;
        if (f & LOUD) { /* never stepped on */ }
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const c2 = c + dc, r2 = r + dr;
            if (c2 < 0 || r2 < 0 || c2 >= cw || r2 >= ch) continue;
            const g = at(c2, r2);
            if (!open(g) || perch(f) !== perch(g) || g & LOUD) continue;
            if (dc && dr && (perch(at(c2, r)) !== perch(f) || !open(at(c2, r)) || perch(at(c, r2)) !== perch(f) || !open(at(c, r2)))) continue;
            if (dc && dr && (at(c2, r) & LOUD || at(c, r2) & LOUD)) continue;
            edges[id].push({ to: r2 * cw + c2, s: (Math.hypot(dc, dr) * CELL) / PLAN_SPEED, kind: "walk" });
        }
        const x = (c + 0.5) * CELL, y = (r + 0.5) * CELL;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const z = perch(f) ? (f & HIGH ? 2 : 1) : 0;
            // Where the push happens: the edge of the tile, for floors only if we're next to the thing.
            const tc = c >> 1, tr = r >> 1;
            const ex = dx > 0 ? (tc + 1) * T - (z ? 1 : 8) : dx < 0 ? tc * T + (z ? 1 : 8) : x, ey = dy > 0 ? (tr + 1) * T - (z ? 1 : 8) : dy < 0 ? tr * T + (z ? 1 : 8) : y;
            if (!z && Math.hypot(ex - x, ey - y) > 1) continue;      // floor cats push from a cell touching the wall of the thing
            if (z && Math.hypot(ex - x, ey - y) > 9) continue;
            const L = sim.findLeap(ex, ey, dx, dy, z);
            if (!L) continue;
            if (!z && !(flagAt(w, Math.floor((ex + dx * 12) / T), Math.floor((ey + dy * 12) / T)) & PERCH)) continue;
            if (z && !(flagAt(w, Math.floor((ex + dx * 3) / T), Math.floor((ey + dy * 3) / T)) & (WALK | 0)) && false) continue;
            const c2 = Math.floor(L.x / CELL), r2 = Math.floor(L.y / CELL), dist = Math.hypot(L.x - ex, L.y - ey);
            const dur = 0.05 + (z ? 8 / PLAN_SPEED : 0) + PUSH + 0.1 + 0.2 + dist / 340;
            const land = flagAt(w, Math.floor(L.x / T), Math.floor(L.y / T));
            if (land & LOUD) continue;
            edges[id].push({ to: r2 * cw + c2, s: dur, kind: "leap", dx, dy, ex, ey, lx: L.x, ly: L.y });
        }
    }
    w.vents.forEach((v) => {
        const o = w.vents[v.to], id = Math.floor(v.y / CELL) * cw + Math.floor(v.x / CELL), to = Math.floor(o.y / CELL) * cw + Math.floor(o.x / CELL), d = Math.hypot(o.x - v.x, o.y - v.y);
        edges[id].push({ to, s: 0.1 + 0.4 + d / 240 + 0.15, kind: "vent", lx: o.x, ly: o.y });
    });
    return { edges, cw, ch };
}

class Heap {
    constructor() { this.a = []; }
    push(k, v) { const a = this.a; a.push([k, v]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
    pop() { const a = this.a, t = a[0], e = a.pop(); if (a.length) { a[0] = e; let i = 0; for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return t; }
    get size() { return this.a.length; }
}

export function distField(G, goals) {
    const n = G.cw * G.ch, d = new Float32Array(n).fill(1e9), rev = G.rev ??= (() => { const out = Array.from({ length: n }, () => []); G.edges.forEach((es, i) => es.forEach((e) => out[e.to].push([i, e.s]))); return out; })();
    const h = new Heap();
    for (const g of goals) { d[g] = 0; h.push(0, g); }
    while (h.size) { const [k, i] = h.pop(); if (k > d[i]) continue; for (const [j, s] of rev[i]) if (k + s < d[j]) { d[j] = k + s; h.push(d[j], j); } }
    return d;
}

/** Earliest-arrival search through space and time. */
function search(G, TL, from, f0, goals, dwell = 0) {
    const { bits, cells, frames } = TL, dist = distField(G, goals), goalSet = new Set(goals), seen = TL.seen ??= new Uint8Array(cells * frames);
    seen.fill(0);
    const blocked = (cell, f) => {
        if (f >= frames) return true;
        return bits[f * cells + cell] === 1 || (f > 0 && bits[(f - 1) * cells + cell] === 1) || (f + 1 < frames && bits[(f + 1) * cells + cell] === 1);
    };
    const free = TL.freeCell;
    const clear = (cell, a, b) => { if (free(cell)) return true; for (let f = a; f <= b; f++) if (blocked(cell, f)) return false; return true; };
    const h = new Heap(), parent = new Map();
    const key = (c, f) => f * cells + c;
    if (blocked(from, f0) && !free(from)) return null;
    h.push(f0 * FRAME + dist[from], key(from, f0));
    let pops = 0;
    while (h.size) {
        const [, k] = h.pop(), f = Math.floor(k / cells), c = k - f * cells;
        if (seen[k]) continue;
        seen[k] = 1;
        if (++pops > 4e6) return null;
        if (goalSet.has(c) && clear(c, f, f + dwell)) {
            const path = []; let q = k;
            while (parent.has(q)) { const [p, e] = parent.get(q); path.push({ e, f: Math.floor(q / cells), c: q % cells }); q = p; }
            path.reverse();
            return { path, f, c };
        }
        const wait = f + 2;
        if (wait < frames && clear(c, f, wait) && !seen[key(c, wait)]) {
            const nk = key(c, wait);
            if (!parent.has(nk)) { parent.set(nk, [k, { kind: "wait", s: 0.2 }]); h.push(wait * FRAME + dist[c] + 0.0005, nk); }
        }
        for (const e of G.edges[c]) {
            const n = Math.ceil(e.s / FRAME), g = f + n;
            if (g >= frames || dist[e.to] >= 1e9) continue;
            const mid = f + (n >> 1);
            if (e.kind === "vent") { if (!clear(c, f, f + 2) || !clear(e.to, g - 2, g)) continue; }
            else if (e.kind === "leap") {
                // Mid-air is not hidden: check the ground under the whole arc.
                if (!clear(c, f, mid + 1) || !clear(e.to, g - 3, g)) continue;
                const air = Math.ceil((0.2 + Math.hypot(e.lx - e.ex, e.ly - e.ey) / 340) / FRAME) + 1;
                let safe = true;
                for (let u = 0; u <= 1 && safe; u += 0.2) {
                    const x = e.ex + (e.lx - e.ex) * u, y = e.ey + (e.ly - e.ey) * u, cc = Math.floor(y / CELL) * G.cw + Math.floor(x / CELL);
                    if (!clear(cc, Math.max(0, f + 1), Math.min(frames - 1, g + 1))) safe = false;
                }
                void air;
                if (!safe) continue;
            } else if (!clear(c, f, mid + 1) || !clear(e.to, mid, g)) continue;
            const nk = key(e.to, g);
            if (seen[nk] || parent.has(nk)) continue;
            parent.set(nk, [k, e]);
            h.push(g * FRAME + dist[e.to], nk);
        }
    }
    return null;
}

const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const tileCells = (cw, t) => { const c = t.c * 2, r = t.r * 2; return [r * cw + c, r * cw + c + 1, (r + 1) * cw + c, (r + 1) * cw + c + 1]; };

/** A full route: fish and loot in some order, then out. */
export function plan(def, margin, { loot = true, time = HORIZON, blind = false } = {}) {
    const TL = timeline(def, margin, time), G = graph(def), w = TL.w, cw = TL.cw;
    if (blind) TL.bits.fill(0);
    TL.freeCell = (c) => { const x = ((c % cw) + 0.5) * CELL, y = (Math.floor(c / cw) + 0.5) * CELL; return !TL.spots && !!(flagXY(w, x, y) & HIGH); };
    const start = Math.floor(w.start.y / CELL) * cw + Math.floor(w.start.x / CELL);
    const stops = [{ name: "fish", ...w.target }, ...(loot ? w.bonus.map((b, i) => ({ name: "loot" + i, ...b })) : [])];
    let best = null;
    const orders = perms(stops).slice(0, 24);
    for (const order of orders) {
        let c = start, f = Math.round(0.3 / FRAME), legs = [], ok = true;
        const seq = [...order, { name: "exit", ...w.start, exit: true }];
        for (const s of seq) {
            const goals = s.exit ? [start, start - 1, start - cw, start - cw - 1, start + 1, start + cw, start + cw + 1].filter((g) => { const x = ((g % cw) + 0.5) * CELL, y = (Math.floor(g / cw) + 0.5) * CELL; return Math.hypot(x - w.start.x, y - w.start.y) < 12; }) : tileCells(cw, s);
            const r = search(G, TL, c, f, goals, s.exit ? 3 : 2);
            if (!r) { ok = false; if (process.env.WHY) console.log(`   stuck heading for ${s.name} from cell ${(c % cw) / 2},${Math.floor(c / cw) / 2} at ${(f * FRAME).toFixed(1)}s`); break; }
            legs.push(...r.path); c = r.c; f = r.f;
        }
        if (ok && (!best || f < best.f)) best = { f, legs };
        if (best && orders.length > 6 && order === orders[5]) break;
    }
    if (!best) return null;
    return { ...best, start, cw };
}

/** Turn the route into thumb inputs and play it through a fresh Sim. */
export function replay(def, P, { jitter = 0, seed = 1, slow = 1, record = null, delay = 0 } = {}) {
    const sim = new Sim(def), cw = P.cw;
    const cellXY = (c) => [((c % cw) + 0.5) * CELL, (Math.floor(c / cw) + 0.5) * CELL];
    let rng = seed * 2654435761 >>> 0; const rnd = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; };
    const steps = []; let fPrev = Math.round(0.3 / FRAME);
    for (const l of P.legs) { steps.push({ ...l, f0: fPrev }); fPrev = l.f; }
    let i = 0, hold = 0, pos = null;
    const slip = delay + (jitter ? (rnd() - 0.5) * 2 * jitter : 0);
    let guard = 0;
    while (sim.status === "play" && guard++ < 60 * 400) {
        let inp = { mx: 0, my: 0 };
        const c = sim.cat, tNow = (sim.t - slip) / slow;
        while (i < steps.length && steps[i].e.kind === "wait" && tNow >= steps[i].f * FRAME) i++;
        const st = steps[i];
        if (!st) {
            const dx = sim.world.start.x - c.x, dy = sim.world.start.y - c.y, d = Math.hypot(dx, dy);
            if (d > 1) inp = { mx: dx / d * 0.7, my: dy / d * 0.7 };
        } else if (st.e.kind === "wait") { /* sit tight */ }
        else if (st.e.kind === "walk") {
            if (tNow >= st.f0 * FRAME) {
                const [x, y] = cellXY(st.c), dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
                if (d < 1.2) { if (c.speed < 200) i++; }
                else inp = { mx: dx / d * 0.7, my: dy / d * 0.7 };
            }
        } else if (st.e.kind === "leap") {
            if (tNow >= st.f0 * FRAME) {
                if (c.mode === "leap") hold = 1;
                else if (hold) { hold = 0; i++; }
                else {
                    const e = st.e, ox = e.dx ? 0 : e.ex - c.x, oy = e.dy ? 0 : e.ey - c.y, f = 0.7;
                    const l = Math.hypot(e.dx * 3 + ox * 0.2, e.dy * 3 + oy * 0.2) || 1;
                    inp = { mx: (e.dx * 3 + ox * 0.2) / l * f, my: (e.dy * 3 + oy * 0.2) / l * f };
                }
            }
        } else if (st.e.kind === "vent") {
            if (tNow >= st.f0 * FRAME) {
                if (c.mode === "vent") hold = 1;
                else if (hold) { hold = 0; i++; }
                else inp = { act: true };
            }
        }
        sim.step(inp);
        sim.events.length = 0;
        record?.push([inp.mx ?? 0, inp.my ?? 0, inp.act ? 1 : 0]);
    }
    return sim;
}

const unseen = (s) => s.status === "won" && s.stats.seenTime === 0 && s.stats.heard === 0 && s.stats.curious === 0 && s.stats.chases === 0 && s.stats.noisy === 0 && s.stats.alarms === 0 && s.stats.lasers === 0;

function checkRoutes(def) {
    const w = buildWorld(def), bad = [];
    (def.guards ?? []).forEach((g, i) => { for (const s of g.route ?? []) if (flagAt(w, s[0], s[1]) & WALK && !g.kind) bad.push(`guard ${i} stop ${s[0]},${s[1]} on "${w.chars[s[1]]?.[s[0]]}"`); });
    return bad;
}

const args = process.argv.slice(2), verbose = args.includes("--verbose"), mi = args.indexOf("--margin"), onlyMargin = mi >= 0 ? Number(args[mi + 1]) : null;
const pi = args.indexOf("--paths"), pathsOut = pi >= 0 ? args[pi + 1] : null;
const pick = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--margin" && args[i - 1] !== "--paths");
const list = pick === undefined ? HEISTS : HEISTS.filter((h, i) => String(i + 1) === pick || h.id === pick);
if (import.meta.url === `file://${process.argv[1]}`) {
    const out = {}; let failed = 0, n = 0;
    console.log("heist                     loot    time  margin  robust  guards");
    for (const def of list) {
        n++;
        const idx = HEISTS.indexOf(def) + 1, bad = checkRoutes(def);
        if (bad.length) console.log(`  ${def.id}: ${bad.join("; ")}`);
        let result = null, used = -1, rec;
        for (const m of onlyMargin !== null ? [onlyMargin] : [3, 2, 1, 0]) {
            const P = plan(def, m);
            if (!P) { if (verbose) console.log(`  margin ${m}: no route`); continue; }
            const trace = [], sim = replay(def, P, { record: trace });
            if (unseen(sim) && sim.loot.every((l) => l.got)) {
                // Tolerance: how often does the same plan survive a human arriving up to 0.25s off?
                let ok = 0; for (let k = 1; k <= 12; k++) if (unseen(replay(def, P, { jitter: 0.25, seed: k + 5 }))) ok++;
                result = { sim, P, ok }; used = m; rec = trace; break;
            }
            if (verbose) console.log(`  margin ${m}: replay failed: ${sim.status} t=${sim.t.toFixed(1)} seen=${sim.stats.seenTime.toFixed(2)} heard=${sim.stats.heard} noisy=${sim.stats.noisy} at ${sim.cat.x.toFixed(0)},${sim.cat.y.toFixed(0)}`);
        }
        const name = `${String(idx).padStart(2)} ${def.title}`.padEnd(25);
        if (!result) { failed++; console.log(`${name} UNSOLVED`); continue; }
        const s = result.sim;
        console.log(`${name} ${String(s.loot.filter((l) => l.got).length).padStart(2)}/${s.loot.length}  ${s.t.toFixed(0).padStart(4)}s  ${String(used).padStart(4)}    ${String(result.ok).padStart(2)}/12   ${(def.guards ?? []).length}`);
        out[def.id] = { margin: used, time: +s.t.toFixed(2), inputs: rec };
    }
    if (pathsOut) writeFileSync(pathsOut, JSON.stringify(out));
    console.log(failed ? `${failed} of ${n} UNSOLVED` : `ALL ${n} HEISTS PROVEN UNSEEN (replayed through the real sim: seen=0, heard=0, noise=0, all loot)`);
    process.exit(failed ? 1 : 0);
}
void DT;
