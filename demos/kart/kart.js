// Arcade kart physics. A kart keeps a flat velocity and a separate height: the road is a function, not a collider.
// The player and the AI both drive through stepKart with the same three inputs, so nobody cheats on grip.
export const GRAVITY = 34;
export const TIERS = [0.75, 1.6, 2.6];                       // seconds of charge for blue, orange, pink
export const TIER_BOOST = [0.65, 1.15, 1.8];                 // boost length earned
export const RADIUS = 1.15;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export function makeKart(racer, cls, aiScale = 1) {
    const top = (29 + racer.speed * 4) * cls.speed * aiScale;
    return {
        racer, id: racer.id, player: false, aiScale,
        top, accel: (15 + racer.accel * 13) * cls.speed, turn: 1.3 + racer.handling * 0.34,
        grip: 7.5 + racer.handling * 5, weight: 0.7 + racer.weight * 0.8, driftRate: 0.86 + racer.drift * 0.34,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, i: 0, u: 0, d: 0, lap: -1, progress: 0,
        speed: 0, vf: 0, vl: 0, steer: 0, grounded: true, air: 0, airStart: 0,
        driftDir: 0, charge: 0, tier: 0, driftVis: 0, driftHeld: false, hop: 0, hopV: 0,
        boost: 0, boostPow: 0, trick: 0, trickDone: false, trickSpin: 0,
        spin: 0, spinVis: 0, safe: 0, tumble: 0, stun: 0, rough: false, kerb: false,
        ice: false, rubber: 1, draft: 0, drafting: 0, pitch: 0, roll: 0, lean: 0, squash: 0, wallT: 0,
        item: null, roll2: 0, shield: 0, shieldT: 0, rank: 1, finished: false, finishT: 0, falling: 0,
        rescue: 0, wrongWay: 0, lapStart: 0, bestLap: 0, lastLap: 0, input: { steer: 0, drift: false, brake: false, item: false },
        events: [], ai: null, onPad: 0, stage: 0,
    };
}

export function placeOnGrid(k, T, slot) {
    const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1;
    const i = T.wrap(T.n - 3 - row * 3);
    const lat = side * Math.min(4, T.hw[i] * 0.45) + (row % 2 ? side * 0.5 : 0);
    const p = T.point(i, lat);
    k.x = p[0]; k.y = p[1]; k.z = p[2]; k.i = i; k.u = 0; k.yaw = T.yaw(i); k.lastH = p[1];
    k.lap = -1;
    T.locate(k);
}

export function launch(k, vy) { k.vy = vy; k.grounded = false; k.air = 0.01; }

/** Hit by something. kind: spin (banana), tumble (melon, bowling ball), bump (props, hazards). */
export function hurt(k, kind) {
    if (k.safe > 0 || k.rescue > 0) return false;
    if (kind === "bump") { k.spin = Math.max(k.spin, 0.45); k.safe = 0.8; k.vf *= 0.72; k.vx *= 0.72; k.vz *= 0.72; }
    else if (kind === "spin") { k.spin = 1.05; k.safe = 2.0; }
    else { k.tumble = 1.35; k.spin = 1.35; k.safe = 2.6; launch(k, 11); k.vx *= 0.45; k.vz *= 0.45; }
    k.driftDir = 0; k.charge = 0; k.tier = 0; k.boost = 0;
    k.events.push(["hurt", kind]);
    return true;
}

export function stepKart(k, T, dt, phase) {
    const inp = k.input, stunned = k.spin > 0 || k.rescue > 0;
    // timers
    k.boost = Math.max(0, k.boost - dt); k.safe = Math.max(0, k.safe - dt); k.wallT = Math.max(0, k.wallT - dt);
    k.squash *= Math.exp(-9 * dt); k.onPad = Math.max(0, k.onPad - dt);
    if (k.shieldT > 0) { k.shieldT -= dt; if (k.shieldT <= 0) { k.shield = 0; k.events.push(["shieldGone"]); } }
    if (k.rescue > 0) { stepRescue(k, T, dt); return; }
    if (k.spin > 0) { k.spin -= dt; k.spinVis += dt * (k.tumble > 0 ? 15 : 13); if (k.tumble > 0) k.tumble -= dt; if (k.spin <= 0) { k.spinVis = 0; k.tumble = 0; } }

    const steerIn = stunned ? 0 : clamp(inp.steer, -1, 1);
    const rate = steerIn === 0 ? 14 : k.driftDir ? 9 : 11;
    k.steer += (steerIn - k.steer) * Math.min(1, rate * dt);

    const i = k.i, surf = T.surf[i], hw = T.hw[i], ad = Math.abs(k.d);
    k.rough = ad > hw + 0.95 && k.grounded && k.boost <= 0;
    k.kerb = ad > hw && ad <= hw + 0.95 && k.grounded;
    k.ice = surf === 1;

    const sn = Math.sin(k.yaw), cs = Math.cos(k.yaw);
    const fx = -sn, fz = -cs, rx = cs, rz = -sn;
    let vf = k.vx * fx + k.vz * fz, vl = k.vx * rx + k.vz * rz;

    // --- Engine ------------------------------------------------------------------------------------------------
    let top = k.top * k.rubber * (1 + Math.min(k.drafting, 1) * 0.07);
    if (k.boost > 0) top *= 1.34 + k.boostPow * 0.08;
    if (k.rough) top *= 0.58;
    if (k.driftDir) top *= 0.985;
    const going = phase === "race" && !k.finishedStop;
    if (k.grounded) {
        if (stunned) vf *= Math.exp(-2.5 * dt);
        else if (inp.brake) vf -= 34 * dt * Math.sign(vf || 1);
        else if (going && vf < top) {
            const t = clamp(vf / top, 0, 1);
            vf += k.accel * (1.15 - t * t) * dt * (k.boost > 0 ? 2.6 : 1);
        } else {
            const over = vf - top;
            vf -= Math.min(over, (k.rough ? 40 : 11) * dt + over * 2.2 * dt);
        }
        if (!going && !stunned) vf *= Math.exp(-1.6 * dt);
        vf -= T.slope[i] * GRAVITY * 0.22 * dt * (T.tx[i] * fx + T.tz[i] * fz);
    }

    // --- Steering and drift -------------------------------------------------------------------------------------
    const speedFrac = clamp(Math.abs(vf) / k.top, 0, 1.4);
    const pressed = inp.drift && !k.driftHeld;
    k.driftHeld = inp.drift;
    if (pressed && k.grounded && !stunned && speedFrac > 0.25) { k.hopV = 5.4; k.events.push(["hop"]); }
    if (pressed && !k.grounded && !k.trickDone && !stunned && k.air > 0.04) { k.trick = 0.42; k.trickDone = true; k.events.push(["trick"]); }
    k.hop += k.hopV * dt; k.hopV -= 34 * dt;
    if (k.hop < 0) { k.hop = 0; k.hopV = 0; }
    if (k.trick > 0) { k.trick -= dt; k.trickSpin = (1 - Math.max(0, k.trick) / 0.42) * Math.PI * 2; } else k.trickSpin = 0;

    if (!k.driftDir && inp.drift && k.grounded && !stunned && Math.abs(k.steer) > 0.2 && speedFrac > 0.35) {
        k.driftDir = Math.sign(k.steer); k.charge = 0; k.tier = 0;
        k.events.push(["driftStart"]);
    }
    let yawRate;
    if (k.driftDir) {
        const into = k.steer * k.driftDir;
        yawRate = -k.driftDir * k.turn * (0.62 + 0.62 * into) * (0.55 + 0.45 * Math.min(1, speedFrac * 1.4));
        if (k.grounded) {
            k.charge += dt * k.driftRate * (0.82 + 0.48 * Math.max(0, into));
            const t = k.charge >= TIERS[2] ? 3 : k.charge >= TIERS[1] ? 2 : k.charge >= TIERS[0] ? 1 : 0;
            if (t !== k.tier) { k.tier = t; k.events.push(["tier", t]); }
        }
        const end = !inp.drift || speedFrac < 0.28 || stunned;
        if (end) {
            if (k.tier > 0 && !stunned) {
                giveBoost(k, TIER_BOOST[k.tier - 1], k.tier);
                vf += 3 + k.tier * 1.6;
                k.events.push(["miniturbo", k.tier]);
            } else k.events.push(["driftEnd"]);
            k.driftDir = 0; k.charge = 0; k.tier = 0;
        }
    } else {
        const low = Math.min(1, speedFrac * 3.2), high = 1 - 0.2 * Math.min(1, speedFrac);
        yawRate = -k.steer * k.turn * low * high;
        if (!k.grounded) yawRate *= 0.4;
    }
    if (!stunned) k.yaw = wrapAngle(k.yaw + yawRate * dt * (vf < 0 ? -1 : 1));
    const visGoal = k.driftDir ? -k.driftDir * (0.5 + 0.12 * k.steer * k.driftDir) : 0;
    k.driftVis += (visGoal - k.driftVis) * Math.min(1, 9 * dt);

    // --- Grip --------------------------------------------------------------------------------------------------
    let grip = k.grip;
    if (k.driftDir) grip = k.grip * 0.62;
    if (k.ice) grip *= k.driftDir ? 0.6 : 0.3;
    if (k.rough) grip *= 0.8;
    if (!k.grounded) grip = 0.3;
    const sn2 = Math.sin(k.yaw), cs2 = Math.cos(k.yaw);
    const f2x = -sn2, f2z = -cs2, r2x = cs2, r2z = -sn2;
    // Velocity is carried over to the new heading, and what falls sideways is scrubbed by grip.
    const px = fx * vf + rx * vl, pz = fz * vf + rz * vl;
    let nf = px * f2x + pz * f2z, nl = px * r2x + pz * r2z;
    const carry = k.grounded ? 0.55 + (1 - Math.min(1, grip / 12)) * 0.4 : 0.9;
    // Conserving most speed through the turn keeps drifts feeling fast.
    const sideSpeed = Math.abs(nl) - Math.abs(nl) * Math.exp(-grip * dt);
    nf += Math.sign(nf || 1) * sideSpeed * (1 - carry) * 0.8;
    nl *= Math.exp(-grip * dt);
    if (k.driftDir && k.grounded) nl -= k.driftDir * 13 * dt;     // the back end wants to run wide
    k.vx = f2x * nf + r2x * nl; k.vz = f2z * nf + r2z * nl;
    k.vf = nf; k.vl = nl; k.speed = Math.hypot(k.vx, k.vz);

    // Banked road pulls you down into the corner.
    if (k.grounded) {
        const t = T.tan[i];
        k.vx -= T.rx[i] * t * GRAVITY * 0.28 * dt; k.vz -= T.rz[i] * t * GRAVITY * 0.28 * dt;
    }

    // --- Move --------------------------------------------------------------------------------------------------
    k.x += k.vx * dt; k.z += k.vz * dt;
    const prevLap = k.lap;
    T.locate(k);
    if (k.lap !== prevLap) k.events.push(["line", k.lap - prevLap]);
    wall(k, T, dt);

    const hereVoid = T.surf[k.i] === 3;
    if (hereVoid) {
        k.vy -= GRAVITY * dt; k.y += k.vy * dt;
        if (k.grounded) { k.grounded = false; k.air = 0.01; }
        k.air += dt;
        if (k.y < T.py[k.i] - 9) startRescue(k, T);
    } else {
        const h = T.height(k.i, k.u, k.d);
        const gap = k.y - h;
        if (k.grounded) {
            // Ride the surface; only lift off when it falls away faster than gravity can pull.
            const slopeV = (h - k.lastH) / dt;
            k.lastH = h;
            if (gap > 0.08 && slopeV < k.vy - 7) { k.grounded = false; k.air = 0.01; }
            else { k.vy += (clamp(slopeV, -60, 40) - k.vy) * Math.min(1, 26 * dt); k.y = h; }
        }
        if (!k.grounded) {
            k.vy -= GRAVITY * dt; k.y += k.vy * dt; k.air += dt;
            if (k.y <= h) {
                k.y = h; k.lastH = h;
                const impact = -k.vy;
                k.grounded = true; k.vy = 0;
                if (k.air > 0.16) {
                    k.squash = Math.min(1, impact / 18);
                    k.events.push(["land", impact, k.air]);
                    if (k.trickDone) { giveBoost(k, 0.85, 1); k.events.push(["trickBoost"]); }
                }
                k.trickDone = false; k.air = 0;
            }
        }
    }

    // Body pose for the renderer.
    const along = T.tx[k.i] * f2x + T.tz[k.i] * f2z, across = T.tx[k.i] * r2x + T.tz[k.i] * r2z;
    const pitchGoal = k.grounded ? Math.atan(T.slope[k.i] * along + T.tan[k.i] * -across) + (T.ramp[k.i] >= 0 && Math.abs(k.d) < hw ? 0.22 : 0) : clamp(k.vy * 0.022, -0.5, 0.5);
    const rollGoal = k.grounded ? Math.atan(T.tan[k.i] * along + T.slope[k.i] * across) : k.roll * 0.98;
    k.pitch += (pitchGoal - k.pitch) * Math.min(1, 14 * dt);
    k.roll += (rollGoal - k.roll) * Math.min(1, 14 * dt);
    k.lean += ((k.steer * 0.16 + (k.driftDir ? -k.driftDir * -0.16 : 0)) - k.lean) * Math.min(1, 12 * dt);

    k.progress = (k.lap * T.n + k.i + k.u) * T.ds;
    const facing = T.tx[k.i] * f2x + T.tz[k.i] * f2z;
    k.wrongWay = facing < -0.35 && !stunned ? k.wrongWay + dt : 0;
}

function wall(k, T, dt) {
    const lim = T.wall[k.i] - RADIUS, ad = Math.abs(k.d);
    if (ad <= lim || T.surf[k.i] === 3) return;
    const side = Math.sign(k.d), rx = T.rx[k.i], rz = T.rz[k.i], push = ad - lim;
    k.x -= rx * side * push; k.z -= rz * side * push; k.d = side * lim;
    const vn = (k.vx * rx + k.vz * rz) * side;   // speed into the wall
    if (vn <= 0) return;
    // Slide along it: strip the speed going into the wall, kick back a little, and swing the nose along the wall.
    const bounce = 0.38;
    k.vx -= rx * side * vn * (1 + bounce); k.vz -= rz * side * vn * (1 + bounce);
    const scrub = 1 - clamp(vn / 60, 0.01, 0.22);
    k.vx *= scrub; k.vz *= scrub;
    const dir = (k.vx * T.tx[k.i] + k.vz * T.tz[k.i]) >= 0 ? 1 : -1;
    const want = Math.atan2(-T.tx[k.i] * dir, -T.tz[k.i] * dir);
    k.yaw = wrapAngle(k.yaw + wrapAngle(want - k.yaw) * clamp(vn * 0.035, 0.05, 0.45));
    if (vn > 3 && k.wallT <= 0) { k.events.push(["wall", vn, side]); k.wallT = 0.18; }
}

export function giveBoost(k, sec, pow = 1) {
    k.boost = Math.max(k.boost, sec); k.boostPow = pow;
}

function startRescue(k, T) {
    k.rescue = 1.5; k.driftDir = 0; k.charge = 0; k.tier = 0; k.boost = 0;
    k.rescueFrom = [k.x, k.y, k.z];
    let i = k.i, guard = 0;
    while (T.surf[i] === 3 && guard++ < 200) i = T.wrap(i + 1);
    i = T.wrap(i + 3);
    const p = T.point(i, 0);
    k.rescueTo = [p[0], p[1], p[2], i];
    k.events.push(["fall"]);
}
function stepRescue(k, T, dt) {
    k.rescue -= dt;
    const t = 1 - Math.max(0, k.rescue) / 1.5, a = k.rescueFrom, b = k.rescueTo, e = t * t * (3 - 2 * t);
    k.x = a[0] + (b[0] - a[0]) * e; k.z = a[2] + (b[2] - a[2]) * e;
    k.y = a[1] + (b[1] - a[1]) * e + Math.sin(t * Math.PI) * 7;
    k.vx = k.vz = k.vy = k.vf = 0; k.speed = 0; k.hop = 0;
    if (k.rescue <= 0) {
        // The gap may have carried the lap count; only a forward walk from here keeps it correct.
        const before = k.lap;
        let g = 0;
        while (k.i !== b[3] && g++ < 400) { k.i = T.wrap(k.i + 1); if (k.i === 0) k.lap++; }
        if (k.lap !== before) k.events.push(["line", k.lap - before]);
        k.u = 0; k.d = 0; k.x = b[0]; k.y = b[1]; k.z = b[2]; k.yaw = T.yaw(b[3]);
        k.vx = -Math.sin(k.yaw) * 14; k.vz = -Math.cos(k.yaw) * 14; k.grounded = true; k.lastH = b[1]; k.safe = 1.5;
        k.pitch = k.roll = 0;
    }
}
