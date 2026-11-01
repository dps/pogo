// Breadth-first search over whole game states. It finds the shortest flawless route through a floor:
// that proves the floor is winnable, sets par, and powers the "you could have..." lesson after a death.
import { H, hash, legal, step, gateOpen } from "./sim.js";

const ACTIONS = [0, 1, 2, 3, 4];

/**
 * @returns {{ path: number[]|null, nodes: number, dead: number, capped: boolean }}
 * path is the list of actions. A step that loses a heart is a dead end: every route found is untouched.
 */
export function solve(fl, start, o = {}) {
    const it = search(fl, start, o);
    for (;;) { const r = it.next(); if (r.done) return r.value; }
}

/** The search as a generator: it yields now and then, so a phone can draw between slices. */
export function* search(fl, start, { cap = 60000, maxDepth = 40, slice = 600 } = {}) {
    const hp = start[H.HP], shield = start[H.SHIELD];
    const seen = new Set([hash(start)]);
    // Parallel arrays are the search tree.
    const states = [start], parent = [-1], via = [-1], depth = [0];
    let head = 0, dead = 0;
    while (head < states.length) {
        if (states.length > cap) return { path: null, nodes: states.length, dead, capped: true };
        const s = states[head];
        if (depth[head] < maxDepth) for (const a of ACTIONS) {
            if (!legal(fl, s, a)) continue;
            const n = step(fl, s, a);
            if (n[H.WON]) {
                const path = [a];
                for (let i = head; i > 0; i = parent[i]) path.unshift(via[i]);
                return { path, nodes: states.length, dead, capped: false };
            }
            if (n[H.HP] < hp || n[H.SHIELD] < shield) { dead++; continue; }
            const k = hash(n);
            if (seen.has(k)) continue;
            seen.add(k);
            states.push(n); parent.push(head); via.push(a); depth.push(depth[head] + 1);
        }
        states[head] = null;
        head++;
        if (head % slice === 0) yield head;
    }
    return { path: null, nodes: states.length, dead, capped: false };
}

/** Replays a route and reports whether it really wins, untouched. A bot's belief is checked against the rules. */
export function verify(fl, start, path) {
    let s = start;
    for (const a of path) {
        if (!legal(fl, s, a)) return false;
        s = step(fl, s, a);
        if (s[H.HP] < start[H.HP]) return false;
    }
    return !!s[H.WON];
}
export { gateOpen };
