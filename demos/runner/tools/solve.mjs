// Exhaustive search over player inputs using the game's own movePlayer and touching. A decision point comes every
// `every` steps, so the inputs it finds are spaced like a person's. A clip of anything, soft or hard, counts as failure.
import { CMD, movePlayer, touching } from "../sim.js";

const STEP = 1 / 60;
const copy = (p) => ({ ...p });
const keyOf = (p) => `${p.lane}|${Math.round(p.x * 5)}|${Math.round(p.y * 3)}|${p.vy > 0 ? 1 : 0}|${Math.round(p.slide * 12)}|${p.bufJ > 0 ? 1 : 0}${p.bufS > 0 ? 1 : 0}`;

/** Can p get from d0 to d1 at this speed without touching obs? obs entries: { d, len, lane, kind, v }. Returns the commands. */
export function solve(start, d0, d1, speed, obs, every = 6, skates = false) {
    let frontier = [{ p: copy(start), d: d0, cmds: null }];
    const list = obs.filter((o) => o.d + o.len + 40 > d0);
    const near = (ob, d) => ob.v ? ob.d + (ob.d - d) * ob.v : ob.d;
    let visited = 0;
    while (frontier.length) {
        const next = new Map();
        for (const node of frontier) {
            for (let c = 0; c < 5; c++) {
                if ((c === CMD.left && node.p.lane === 0) || (c === CMD.right && node.p.lane === 2)) continue;
                const p = copy(node.p);
                let d = node.d, alive = true;
                for (let i = 0; i < every && alive; i++) {
                    const px = p.x, pd = d;
                    movePlayer(p, STEP, i === 0 ? c : 0, skates);
                    d += speed * STEP;
                    for (const ob of list) {
                        const at = near(ob, d), prevAt = near(ob, pd);
                        if (touching(p, d, px, pd + (at - prevAt), ob, at)) { alive = false; break; }
                    }
                }
                if (!alive) continue;
                visited++;
                const n = { p, d, cmds: [node.cmds, c] };
                if (d >= d1) { const out = []; for (let k = n.cmds; k; k = k[0]) out.push(k[1]); return { ok: true, cmds: out.reverse(), visited }; }
                const key = keyOf(p);
                const had = next.get(key);
                // Prefer the plan with fewer inputs, so printed solutions read like play.
                if (!had) next.set(key, n);
            }
        }
        frontier = [...next.values()];
    }
    return { ok: false, visited };
}
