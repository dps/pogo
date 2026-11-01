// Rival drivers. They press the same three inputs as the player. Rubber-banding only changes their engine,
// so a good lap by the player always counts, but nobody gets left alone for long.
import { wrapAngle } from "./kart.js";

export function initAI(k, rng) {
    k.ai = { ...k.racer.ai, bias: rng.range(-1.8, 1.8), phase: rng.range(0, 6), driftT: 0, itemT: 0, side: 0, reaction: rng.range(0.15, 0.5) };
}

export function driveAI(k, W, dt) {
    const T = W.T, a = k.ai, inp = k.input;
    const look = Math.round(3 + k.speed * 0.13);
    const i = T.wrap(k.i + look);
    // Where to aim: the racing line, softened by this driver's discipline, plus their lane and any dodging.
    const wob = Math.sin(W.time * 0.9 + a.phase) * a.wobble * 6;
    let lat = T.line[i] * a.line + a.bias * (1 - a.line) * 1.6 + wob;
    lat += dodge(k, W, i);
    lat = Math.max(-T.hw[i] + 1.5, Math.min(T.hw[i] - 1.5, lat));
    const p = T.point(i, lat);
    const want = Math.atan2(-(p[0] - k.x), -(p[2] - k.z));
    // Mid-drift the nose isn't where the kart is going, so steer by the direction of travel.
    const heading = k.driftDir && k.speed > 8 ? Math.atan2(-k.vx, -k.vz) : k.yaw;
    const err = wrapAngle(want - heading);
    inp.steer = Math.max(-1, Math.min(1, -err * 3.4));

    // Drift when the road ahead bends hard for a while.
    let bend = 0;
    for (let n = 4; n < 22; n += 3) bend += T.curv[T.wrap(k.i + n)];
    bend /= 6;
    if (a.driftT > 0) {
        a.driftT -= dt;
        const dir = k.driftDir || -Math.sign(bend);
        // Let go when the bend runs out or swings the other way. steer + is right, curvature + is left.
        if (Math.abs(bend) < 0.008 || (Math.sign(bend) === dir && Math.abs(bend) > 0.016)) a.driftT = 0;
        // Sliding wide is a mistake: bail out and catch it.
        if (Math.abs(k.d) > T.hw[k.i] + 0.4) a.driftT = 0;
        inp.drift = a.driftT > 0;
        if (k.driftDir) inp.steer = Math.max(-1, Math.min(1, -err * 5));
    } else {
        inp.drift = false;
        if (Math.abs(bend) > 0.016 && k.speed > 18 && Math.abs(k.d) < T.hw[k.i] * 0.8 && W.rng.next() < a.driftSkill * dt * 8) {
            a.driftT = 0.9 + a.driftSkill * 2.4;
            inp.steer = -Math.sign(bend);
            inp.drift = true;
        }
    }
    if (W.phase === "race") useItem(k, W, dt);
}

function dodge(k, W, i) {
    const T = W.T, a = k.ai;
    let push = 0;
    // Look for bananas on our line.
    if (a.line > 0.7) for (const it of W.items) {
        if (it.kind !== "banana") continue;
        const gap = T.wrap(it.i - k.i);
        if (gap > 2 && gap < 16 && Math.abs(it.d - k.d) < 3) push += it.d > k.d ? -3.5 : 3.5;
    }
    // Rams line up on the nearest rival, the rest pass wide of slower karts.
    for (const o of W.karts) {
        if (o === k) continue;
        const gap = T.wrap(o.i - k.i);
        if (gap > 8) continue;
        const dd = o.d - k.d;
        if (a.ram > 0.5) { if (Math.abs(dd) < 5 && gap < 5) push += Math.sign(dd) * a.ram * 2; }
        else if (Math.abs(dd) < 2.6 && o.speed < k.speed) push -= (Math.sign(dd) || 1) * 2.5;
    }
    return push;
}

function useItem(k, W, dt) {
    const a = k.ai, it = k.item;
    if (!it || k.roll2 > 0) { a.itemT = 0; return; }
    a.itemT += dt;
    if (a.itemT < a.reaction + a.hoard * 3) { k.input.item = false; return; }
    const T = W.T, ahead = W.nextAhead(k), behind = W.nextBehind(k);
    const gapA = ahead ? ahead.progress - k.progress : 1e9, gapB = behind ? k.progress - behind.progress : 1e9;
    let fire = false;
    if (it === "drink") fire = Math.abs(T.curv[T.wrap(k.i + 14)]) < 0.012;
    else if (it === "melon") fire = !!ahead;
    else if (it === "watermelon") fire = gapA < 30 + 30 * a.aggro;
    else if (it === "banana") fire = gapB < 24 || a.hoard > 0.8;
    else if (it === "shield") fire = gapB < 40 || a.itemT > 3;
    if (a.itemT > 9) fire = true;
    k.input.item = fire;
}
