// Forward search over the real stepHero(), shared by the world solver and the play bot.
import { A, CELL_H, CELL_W, CHAR, DT, F, findHook, newHero, stepHero, TILE } from "../physics.js";

export const MACRO = 6;

export function copyHero(h) { return { ...h }; }

export function actionsFor(h, abil, W) {
    const acts = [];
    const add = (dir, jump, extra) => acts.push({ dir, jump, up: false, down: false, dash: false, tool: false, ...extra });
    if (h.rope >= 0) {
        for (const dir of [-1, 1, 0]) add(dir, false, { tool: true });
        add(0, false, { tool: true, up: true }); add(1, false, { tool: true, up: true }); add(-1, false, { tool: true, up: true });
        add(1, true, { tool: true }); add(-1, true, { tool: true }); add(1, false, { tool: false }); add(-1, false, { tool: false });
        return acts;
    }
    if (h.rail) { add(1, false); add(-1, false); add(0, true); add(1, true); add(-1, true); return acts; }
    for (const dir of [1, -1, 0]) { add(dir, true); add(dir, false); }
    if (h.grounded) add(0, false, { down: true });
    if ((abil & A.DASH) && h.dashCd <= MACRO && h.dashOk) { add(1, false, { dash: true }); add(-1, false, { dash: true }); }
    if ((abil & A.FLOSS) && W.hooksNear(h.x, h.y).length && findHook(h, W, 0) >= 0) { add(1, false, { tool: true }); add(-1, false, { tool: true }); add(0, false, { tool: true }); }
    if (h.swim) add(0, true, { down: true });
    return acts;
}

export function key(h, jump) {
    const g = h.grounded, rope = h.rope >= 0, xs = rope ? 4 : 3, ys = g ? 2 : rope ? 4 : 3, vq = rope ? 110 : 60;
    const pos = ((h.x | 0) >> xs) * 2048 + ((h.y | 0) >> ys);
    const vel = g ? 0 : (Math.round(h.vx / vq) + 12) * 64 + Math.max(0, Math.min(63, Math.round(h.vy / vq) + 20));
    const fl = (g ? 1 : 0) | (h.dashOk ? 2 : 0) | ((h.airJumps & 1) << 2) | (h.rope >= 0 ? 8 : 0) | (h.rail ? 16 : 0) | (h.wall ? 32 : 0) | (jump ? 64 : 0) | ((h.wallCoyote > 0 ? 1 : 0) << 7) | (h.launched ? 256 : 0) | (h.dashT > 0 ? 512 : 0) | (h._tool ? 1024 : 0);
    return pos * 4096 + vel + fl * 1e11;
}

/** Run one macro on a copy of h. Returns { h, out } where out is set if the hero left bounds (a door). */
export function applyMacro(h0, prevJump, a, W, abil, bounds, frames = MACRO, onFrame) {
    const h = copyHero(h0);
    const inp = { dir: a.dir, up: a.up, down: a.down, jump: a.jump, jumpP: false, dashP: false, toolP: false, tool: a.tool };
    let pj = prevJump, pt = h0._tool ?? h0.rope >= 0;
    for (let i = 0; i < frames; i++) {
        inp.jumpP = a.jump && !pj; inp.dashP = !!a.dash && i === 0; inp.toolP = a.tool && !pt;
        pj = a.jump; pt = a.tool;
        stepHero(h, inp, W, abil);
        h._tool = pt;
        if (h.hazard) return null;
        onFrame?.(h);
        if (bounds && (h.x < bounds.x || h.x >= bounds.x + bounds.w || h.y < bounds.y || h.y >= bounds.y + bounds.h)) return { h, out: true, jump: pj };
    }
    return { h, out: false, jump: pj };
}

/** Novelty-first exploration of a room from seed hero states. hit(h) runs each frame, exit(h) on a door crossing. */
export function explore(W, room, seeds, abil, { cap = 40000, patience = 14000, hit, exit, stop } = {}) {
    const seen = new Set(), buckets = [[]], visits = new Map(), cells = new Set();
    let low = 0, stale = 0, popped = 0;
    const cellOf = (h) => ((h.x | 0) >> 4) * 4096 + ((h.y | 0) >> 4);
    const push = (s) => {
        const c = cellOf(s.h), v = Math.min(visits.get(c) ?? 0, 60);
        (buckets[v] ??= []).push(s);
        if (v < low) low = v;
        if (!cells.has(c)) { cells.add(c); stale = 0; }
    };
    for (const s of seeds) { const k = key(s.h, s.jump); if (!seen.has(k)) { seen.add(k); push(s); } }
    const onFrame = hit ? (h) => hit(h) : undefined;
    for (;;) {
        if (seen.size >= cap || stale > patience || stop?.()) break;
        while (low < buckets.length && !(buckets[low]?.length)) low++;
        if (low >= buckets.length) break;
        const s = buckets[low].pop();
        popped++; stale++;
        const c = cellOf(s.h);
        visits.set(c, (visits.get(c) ?? 0) + 1);
        for (const a of actionsFor(s.h, abil, W)) {
            const r = applyMacro(s.h, s.jump, a, W, abil, room, MACRO, onFrame);
            if (!r) continue;
            if (r.out) { exit?.(r.h, r.jump); continue; }
            const k = key(r.h, r.jump);
            if (seen.has(k)) continue;
            seen.add(k);
            push({ h: r.h, jump: r.jump });
        }
    }
    return { states: seen.size, capped: seen.size >= cap };
}

/** Best-effort plan from the hero's state to goal(h). Returns a list of macros, or null. Parent links make it a path. */
export function plan(W, room, h0, jump0, abil, goal, { cap = 30000, heur } = {}) {
    const seen = new Set(), buckets = [[]], visits = new Map();
    let low = 0, found = null, n = 0;
    const cellOf = (h) => ((h.x | 0) >> 4) * 4096 + ((h.y | 0) >> 4);
    const push = (s) => { const c = cellOf(s.h), v = Math.min((visits.get(c) ?? 0) + (heur ? Math.floor(heur(s.h) / 24) : 0), 400); (buckets[v] ??= []).push(s); if (v < low) low = v; };
    const start = { h: { ...h0 }, jump: jump0, parent: null, a: null };
    seen.add(key(start.h, jump0)); push(start);
    while (seen.size < cap && !found) {
        while (low < buckets.length && !(buckets[low]?.length)) low++;
        if (low >= buckets.length) break;
        const s = buckets[low].pop();
        const c = cellOf(s.h); visits.set(c, (visits.get(c) ?? 0) + 1);
        n++;
        for (const a of actionsFor(s.h, abil, W)) {
            let hit = false;
            const r = applyMacro(s.h, s.jump, a, W, abil, null, MACRO, (h) => { if (goal(h)) hit = true; });
            if (!r) continue;
            if (hit) { found = { h: r.h, jump: r.jump, parent: s, a }; break; }
            if (W.roomAt(r.h.x, r.h.y) !== room) continue;
            const k = key(r.h, r.jump);
            if (seen.has(k)) continue;
            seen.add(k);
            push({ h: r.h, jump: r.jump, parent: s, a });
        }
    }
    if (!found) return null;
    const out = [];
    for (let q = found; q.parent; q = q.parent) out.push({ a: q.a, h: q.h });
    return out.reverse();
}
