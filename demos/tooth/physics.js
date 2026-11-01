// Pure tile physics for Hollow Tooth. No Pogo imports: the game, the world solver and the bot all run this
// exact code, so anything the solver proves about a jump is true for the player.

export const TILE = 16, DT = 1 / 60;
export const CHAR = 3, CELL_W = 10, CELL_H = 6;   // one map character is 3x3 tiles; one cell is 10x6 characters.

// Tiles.
export const EMPTY = 0, ROCK = 1, SLICK = 2, CRACK = 3, HARD = 4, FOAM = 5, ONEWAY = 6, SPIKE = 7, SPIKEC = 8, ACID = 9,
    BOUNCE = 10, RAIL = 11, UPDRAFT = 12, GATE = 13, BEAMDOOR = 14, CRUMBLE = 15, SEAL = 16, FLAP = 17;

const SOLID = new Uint8Array(32);
for (const t of [ROCK, SLICK, CRACK, HARD, FOAM, GATE, BEAMDOOR, CRUMBLE]) SOLID[t] = 1;
export const isSolid = (t) => SOLID[t] === 1;

// Abilities, one bit each, in the order the game hands them out.
export const A = { DRILL: 1, FLOSS: 2, DASH: 4, AIR: 8, COAT: 16, MIRROR: 32, BRACES: 64, CHUTE: 128, BURR: 256 };

export const F = {
    RUN: 148, ACC: 1700, FRICTION: 1900, AIR_ACC: 1150, AIR_TURN: 1500,
    JUMP: 292, G_UP: 690, G_CUT: 2200, G_FALL: 1180, APEX_BAND: 30, APEX_MUL: 0.6, MAX_FALL: 340,
    COYOTE: 7, BUFFER: 8,
    WALL_SLIDE: 62, WALL_JUMP_X: 158, WALL_JUMP_Y: 272, WALL_LOCK: 8, WALL_COYOTE: 6,
    AIR_JUMP: 268,
    DASH: 345, DASH_F: 11, DASH_CD: 26,
    FLOSS_RANGE: 172, FLOSS_MIN: 34, SWING_ACC: 420, REEL: 74,
    SWIM_MAX: 74, SWIM_UP: 196, SWIM_G: 260,
    BOUNCE: 430, BOUNCE_HELD: 520,
    RAIL_SPEED: 118,
    CHUTE_FALL: 52, LIFT: 150, LIFT_ACC: 900,
    POGO: 300, KNOCK_X: 170, KNOCK_Y: 200,
};

export function newHero(x, y) {
    return { x, y, vx: 0, vy: 0, w: 10, h: 16, grounded: false, coyote: 0, buffer: 0, cut: false, launched: false, face: 1,
        wall: 0, wallCoyote: 0, wallSide: 0, wallLock: 0, airJumps: 0, dashT: 0, dashCd: 0, dashDir: 1, dashOk: true,
        rope: -1, ropeLen: 0, rail: false, swim: false, gliding: false, stepY: 0, hazard: 0, mirror: false, stun: 0 };
}

export const tileAt = (W, c, r) => (c < 0 || r < 0 || c >= W.cols || r >= W.rows) ? ROCK : W.T[r * W.cols + c];

const blocks = (t, h) => SOLID[t] === 1 && !(t === FOAM && h.dashT > 0);

function hitCol(W, h, c, top, bot, d = 0) {
    const r0 = Math.floor(top / TILE), r1 = Math.floor(bot / TILE);
    for (let r = r0; r <= r1; r++) { const t = tileAt(W, c, r); if (blocks(t, h) || (t === FLAP && d > 0)) return true; }
    return false;
}
function hitRow(W, h, r, left, right) {
    const c0 = Math.floor(left / TILE), c1 = Math.floor(right / TILE);
    for (let c = c0; c <= c1; c++) if (blocks(tileAt(W, c, r), h)) return true;
    return false;
}

/** The hook the floss would catch from here, or -1. Prefers hooks above and in front. */
export function findHook(h, W, dir = 0, range = F.FLOSS_RANGE) {
    let best = -1, bs = Infinity;
    const list = W.hooksNear(h.x, h.y);
    for (const i of list) {
        const k = W.hooks[i], dx = k.x - h.x, dy = k.y - h.y, d = Math.hypot(dx, dy);
        if (d > range || dy > 10) continue;
        const score = d - (dy < 0 ? 14 : 0) - (Math.sign(dx) === (dir || h.face) ? 22 : 0);
        if (score < bs) { bs = score; best = i; }
    }
    return best;
}

/** One fixed step. inp: { dir, up, down, jump, jumpP, dashP, toolP, tool }. fx: optional game callbacks. Returns nothing. */
export function stepHero(h, inp, W, abil, fx) {
    const f = F, dt = DT;
    if (inp.jumpP) h.buffer = f.BUFFER; else if (h.buffer > 0) h.buffer--;
    if (h.grounded) { h.coyote = f.COYOTE; h.airJumps = 0; h.dashOk = true; } else if (h.coyote > 0) h.coyote--;
    if (h.dashCd > 0) h.dashCd--;
    if (h.wallLock > 0) h.wallLock--;
    if (h.wallCoyote > 0) h.wallCoyote--;
    if (h.stun > 0) h.stun--;
    h.stepY *= 0.72; if (Math.abs(h.stepY) < 0.2) h.stepY = 0;
    const dir = h.stun > 0 ? 0 : h.wallLock > 0 ? 0 : inp.dir;
    if (inp.dir && !h.wallLock && h.stun <= 0) h.face = inp.dir;

    // Tool button: floss if a hook is in range, otherwise the mirror.
    h.mirror = false;
    if (h.rope < 0 && inp.toolP && (abil & A.FLOSS)) {
        const i = findHook(h, W, inp.dir);
        if (i >= 0) {
            const k = W.hooks[i];
            h.rope = i; h.ropeLen = Math.max(f.FLOSS_MIN, Math.hypot(k.x - h.x, k.y - h.y));
            h.dashT = 0; h.rail = false; h.airJumps = 0; h.dashOk = true;
            fx?.floss?.(k);
        } else fx?.flossMiss?.();
    }
    if (h.rope < 0 && inp.tool && (abil & A.MIRROR)) h.mirror = true;

    // Floss swing.
    if (h.rope >= 0) {
        const k = W.hooks[h.rope];
        if (!inp.tool || inp.jumpP) {
            if (inp.jumpP) { h.vy = Math.min(h.vy, 0) - 170; h.vx *= 1.1; h.buffer = 0; fx?.flossJump?.(); }
            h.rope = -1; h.launched = true; h.cut = false;
        } else {
            if (inp.up) h.ropeLen = Math.max(f.FLOSS_MIN, h.ropeLen - f.REEL * dt);
            if (inp.down) h.ropeLen = Math.min(f.FLOSS_RANGE, h.ropeLen + f.REEL * dt);
            const dx0 = h.x - k.x, dy0 = h.y - k.y, d0 = Math.hypot(dx0, dy0) || 1, tx = dy0 / d0, ty = -dx0 / d0;
            const a = (inp.dir || 0) * f.SWING_ACC * dt * (dy0 > -4 ? 1 : 0);
            h.vx += tx * a; h.vy += ty * a;
            h.vy += f.G_FALL * 0.78 * dt;
            h.vx *= 0.998;
            moveX(h, W, h.vx * dt, fx, false); moveY(h, W, h.vy * dt, fx, inp);
            const dx = h.x - k.x, dy = h.y - k.y, d = Math.hypot(dx, dy) || 1;
            if (d > h.ropeLen) {
                const nx = dx / d, ny = dy / d, tx2 = k.x + nx * h.ropeLen, ty2 = k.y + ny * h.ropeLen;
                moveX(h, W, tx2 - h.x, fx, false); moveY(h, W, ty2 - h.y, fx, inp);
                const vr = h.vx * nx + h.vy * ny;
                if (vr > 0) { h.vx -= nx * vr; h.vy -= ny * vr; }
            }
            if (h.grounded && inp.dir === 0) { h.vx *= 0.8; }
            return checkHazards(h, W, abil, fx);
        }
    }

    // Ceiling rail: braces clamp on when your head touches one.
    if (h.rail) {
        if (inp.jumpP || inp.down || !railAt(h, W)) {
            h.rail = false; h.vy = inp.jumpP ? -120 : 30; h.buffer = 0;
        } else {
            h.vx = (inp.dir || 0) * f.RAIL_SPEED; h.vy = 0;
            moveX(h, W, h.vx * dt, fx, false);
            if (inp.dashP) fx?.railDash?.();
            return checkHazards(h, W, abil, fx);
        }
    }

    // Dash.
    if (inp.dashP && (abil & A.DASH) && h.dashCd <= 0 && h.dashOk && !h.swim) {
        h.dashT = f.DASH_F; h.dashCd = f.DASH_CD; h.dashDir = inp.dir || h.face; h.face = h.dashDir;
        if (!h.grounded) h.dashOk = false;
        h.vy = 0; fx?.dash?.();
    }
    if (h.dashT > 0) {
        h.dashT--;
        h.vx = h.dashDir * f.DASH; h.vy = 0;
        moveX(h, W, h.vx * dt, fx, false);
        h.grounded = false;
        probeGround(h, W, inp);
        if (h.dashT === 0) { h.vx = h.dashDir * f.RUN; }
        return checkHazards(h, W, abil, fx);
    }

    // Swimming in acid, with the fluoride coat.
    const inAcid = tileAt(W, Math.floor(h.x / TILE), Math.floor(h.y / TILE)) === ACID;
    if (inAcid !== h.swim) { h.swim = inAcid; if (inAcid) { fx?.splash?.(); h.vy *= 0.35; } }

    // Horizontal.
    const abs = Math.abs(h.vx), max = h.swim ? f.RUN * 0.7 : (h.mirror && h.grounded ? f.RUN * 0.3 : f.RUN);
    if (h.grounded) {
        if (dir) {
            const turning = h.vx * dir < 0;
            h.vx += dir * (turning ? f.ACC * 1.6 : f.ACC) * dt;
            if (Math.abs(h.vx) > max && h.vx * dir > 0) h.vx = dir * Math.max(max, abs - f.FRICTION * dt);
        } else h.vx = Math.sign(h.vx) * Math.max(0, abs - f.FRICTION * dt);
    } else if (dir) {
        const turning = h.vx * dir < 0;
        if (turning || abs < max) {
            h.vx += dir * (turning ? f.AIR_TURN : f.AIR_ACC) * dt;
            if (!turning && Math.abs(h.vx) > max) h.vx = dir * max;
        } else if (!h.launched) h.vx = dir * Math.max(max, abs - 300 * dt);
    } else if (!h.launched || h.grounded) h.vx = Math.sign(h.vx) * Math.max(0, abs - 420 * dt);
    else h.vx *= 0.995;

    // Wall contact.
    const hh = h.h / 2, hw = h.w / 2;
    h.wall = 0;
    if (!h.grounded && !h.swim && h.vy > -60) {
        const probe = inp.dir;
        if (probe) {
            const c = Math.floor((h.x + probe * (hw + 1.5)) / TILE);
            const r0 = Math.floor((h.y - 3) / TILE), r1 = Math.floor((h.y + hh - 2) / TILE);
            let ok = true;
            for (let r = r0; r <= r1; r++) { const t = tileAt(W, c, r); if (!SOLID[t] || t === SLICK || t === FOAM) ok = false; }
            if (ok) { h.wall = probe; h.wallCoyote = f.WALL_COYOTE; h.wallSide = probe; h.airJumps = 0; h.dashOk = true; }
        }
    }

    // Jumps, best option first.
    if (h.buffer > 0) {
        if (h.swim) {
            const surface = tileAt(W, Math.floor(h.x / TILE), Math.floor((h.y - hh - 2) / TILE)) !== ACID;
            h.vy = surface ? -f.JUMP * 0.95 : -f.SWIM_UP; h.buffer = 0; h.cut = false; fx?.swim?.();
        } else if (h.coyote > 0) {
            h.vy = -f.JUMP; h.grounded = false; h.cut = false; h.coyote = 0; h.buffer = 0; h.launched = false;
            fx?.jump?.();
        } else if (h.wallCoyote > 0 && !h.grounded) {
            h.vy = -f.WALL_JUMP_Y; h.vx = -h.wallSide * f.WALL_JUMP_X; h.face = -h.wallSide; h.wallLock = f.WALL_LOCK;
            h.wallCoyote = 0; h.buffer = 0; h.cut = false; h.launched = false; h.wall = 0;
            fx?.wallJump?.(h.wallSide);
        } else if ((abil & A.AIR) && h.airJumps < 1) {
            h.vy = -f.AIR_JUMP; h.airJumps++; h.buffer = 0; h.cut = false; h.launched = false;
            fx?.airJump?.();
        }
    }

    // Gravity.
    h.gliding = false;
    if (h.swim) {
        h.vy = Math.min(f.SWIM_MAX, h.vy + f.SWIM_G * dt);
        if (inp.down) h.vy = Math.min(f.SWIM_MAX * 1.4, h.vy + 400 * dt);
    } else {
        if (h.vy >= 0) h.launched = h.launched && !h.grounded;
        if (h.vy < 0 && !inp.jump && !h.launched) h.cut = true;
        let g = h.vy < 0 ? (h.cut ? f.G_CUT : f.G_UP) : f.G_FALL;
        if (!h.cut && inp.jump && Math.abs(h.vy) < f.APEX_BAND) g *= f.APEX_MUL;
        h.vy += g * dt;
        let maxFall = f.MAX_FALL;
        if (h.wall) maxFall = f.WALL_SLIDE;
        if ((abil & A.CHUTE) && inp.jump && !h.grounded && h.vy > 0 && h.buffer === 0) {
            h.gliding = true; maxFall = f.CHUTE_FALL;
            if (tileAt(W, Math.floor(h.x / TILE), Math.floor(h.y / TILE)) === UPDRAFT) { h.vy -= f.LIFT_ACC * 2 * dt; maxFall = 9999; }
        }
        if (h.vy > maxFall) h.vy = Math.max(maxFall, h.vy - 1600 * dt);
    }
    // Rising inside an updraft while the chute is open.
    if ((abil & A.CHUTE) && inp.jump && tileAt(W, Math.floor(h.x / TILE), Math.floor(h.y / TILE)) === UPDRAFT) {
        h.gliding = true;
        h.vy = Math.max(-f.LIFT, h.vy - f.LIFT_ACC * dt);
        h.launched = true;
    }

    moveX(h, W, h.vx * dt, fx, h.grounded);
    moveY(h, W, h.vy * dt, fx, inp);

    if ((abil & A.BRACES) && !h.grounded && !inp.down && h.vy <= 40 && railAt(h, W)) {
        h.rail = true; h.vy = 0; h.dashT = 0; h.airJumps = 0; h.dashOk = true;
        h.y = (Math.floor((h.y - hh - 1) / TILE)) * TILE + hh + 3;
        fx?.rail?.();
    }
    return checkHazards(h, W, abil, fx);
}

function railAt(h, W) {
    const c = Math.floor(h.x / TILE), r = Math.floor((h.y - h.h / 2 - 4) / TILE);
    return tileAt(W, c, r) === RAIL || tileAt(W, c, r + 1) === RAIL;
}

function checkHazards(h, W, abil, fx) {
    const hw = h.w / 2 - 1.5, hh = h.h / 2 - 1;
    const c0 = Math.floor((h.x - hw) / TILE), c1 = Math.floor((h.x + hw) / TILE), r0 = Math.floor((h.y - hh) / TILE), r1 = Math.floor((h.y + hh) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const t = tileAt(W, c, r);
        if (t === SPIKE) { if (h.y + hh > r * TILE + 6) { h.hazard = 1; fx?.hazard?.(t); return; } }
        else if (t === SPIKEC) { if (h.y - hh < (r + 1) * TILE - 6) { h.hazard = 1; fx?.hazard?.(t); return; } }
        else if (t === ACID && !(abil & A.COAT)) { if (h.y + hh > r * TILE + 7) { h.hazard = 2; fx?.hazard?.(t); return; } }
    }
}

function moveX(h, W, d, fx, grounded) {
    if (d === 0) return;
    const hw = h.w / 2, hh = h.h / 2, top = h.y - hh + 0.1, bot = h.y + hh - 0.1;
    let nx = h.x + d;
    const c = Math.floor((nx + Math.sign(d) * hw) / TILE);
    if (hitCol(W, h, c, top, bot, d)) {
        // A one-tile lip: step up, whether walking or just clipping a ledge in the air. It keeps caves from snagging.
        const footRow = Math.floor(bot / TILE), lipTop = footRow * TILE;
        const lip = !blocks(tileAt(W, c, footRow - 1), h) && !blocks(tileAt(W, c, footRow - 2), h);
        const room = !hitRow(W, h, Math.floor((lipTop - h.h - 0.2) / TILE), h.x - hw + 0.1, h.x + hw - 0.1);
        if (lip && room && (grounded || (h.vy > -40 && bot - lipTop < 9))) {
            const ny = lipTop - hh - 0.01;
            h.stepY += h.y - ny;
            h.y = ny;
            h.x = nx;
            return;
        }
        nx = d > 0 ? c * TILE - hw - 0.001 : (c + 1) * TILE + hw + 0.001;
        if (h.dashT > 0) { h.dashT = 0; fx?.dashBonk?.(); }
        h.vx = 0;
    }
    h.x = nx;
}

function probeGround(h, W, inp) {
    const hh = h.h / 2, hw = h.w / 2 - 0.1, r = Math.floor((h.y + hh + 0.5) / TILE);
    h.grounded = false;
    for (let c = Math.floor((h.x - hw) / TILE); c <= Math.floor((h.x + hw) / TILE); c++) {
        const t = tileAt(W, c, r);
        if (blocks(t, h) || (t === ONEWAY && !inp.down) || t === BOUNCE || t === SEAL) { h.grounded = true; return; }
    }
}

function moveY(h, W, d, fx, inp) {
    const hw = h.w / 2 - 0.1, hh = h.h / 2, c0 = Math.floor((h.x - hw) / TILE), c1 = Math.floor((h.x + hw) / TILE);
    const was = h.grounded;
    h.grounded = false;
    if (d >= 0) {
        const f0 = h.y + hh, f1 = f0 + d;
        for (let r = Math.floor(f0 / TILE); r <= Math.floor(f1 / TILE); r++) {
            const top = r * TILE;
            for (let c = c0; c <= c1; c++) {
                const t = tileAt(W, c, r);
                if (blocks(t, h) || (t === ONEWAY && !inp?.down && f0 <= top + 1) || (t === SEAL && f0 <= top + 1) || (t === BOUNCE && f0 <= top + 3)) {
                    h.y = top - hh;
                    if (t === BOUNCE) {
                        h.vy = inp?.jump ? -F.BOUNCE_HELD : -F.BOUNCE; h.launched = true; h.cut = false; h.dashOk = true; h.airJumps = 0;
                        fx?.bounce?.(c, r);
                        return;
                    }
                    if (!was && d > 2) fx?.land?.(h.vy);
                    if (t === CRUMBLE) fx?.crumble?.(c, r);
                    h.vy = 0; h.grounded = true; h.cut = false; h.launched = false; h.rope >= 0 || (h.rail = false);
                    return;
                }
            }
        }
        h.y += d;
        return;
    }
    const head0 = h.y - hh, head1 = head0 + d, r = Math.floor(head1 / TILE);
    if (hitRow(W, h, r, h.x - hw, h.x + hw)) {
        // Corner correction: clipping a ceiling's edge slides you past it.
        const a = blocks(tileAt(W, c0, r), h), b = blocks(tileAt(W, c1, r), h);
        if (a !== b) {
            const over = a ? (c0 + 1) * TILE - (h.x - hw) : (h.x + hw) - c1 * TILE;
            if (over <= 5) { const nx = a ? (c0 + 1) * TILE + hw + 0.02 : c1 * TILE - hw - 0.02; if (!hitCol(W, h, Math.floor((nx + (a ? -hw : hw)) / TILE), h.y - hh + 0.1, h.y + hh - 0.1)) { h.x = nx; h.y += d; return; } }
        }
        h.y = (r + 1) * TILE + hh + 0.01;
        h.vy = Math.max(h.vy, 0) + 10; h.cut = true;
        fx?.bonk?.();
        return;
    }
    h.y += d;
}

/** Gravity and tile collision for enemies and items. */
export function moveBox(a, W, gravity = 900, maxFall = 300, dt = DT) {
    a.hitX = false; a.grounded = false;
    a.vy = Math.min(maxFall, a.vy + gravity * dt);
    const hw = a.w / 2, hh = a.h / 2;
    let nx = a.x + a.vx * dt;
    if (a.vx !== 0) {
        const c = Math.floor((nx + Math.sign(a.vx) * hw) / TILE), r0 = Math.floor((a.y - hh + 0.1) / TILE), r1 = Math.floor((a.y + hh - 0.1) / TILE);
        for (let r = r0; r <= r1; r++) if (SOLID[tileAt(W, c, r)]) { nx = a.vx > 0 ? c * TILE - hw - 0.01 : (c + 1) * TILE + hw + 0.01; a.hitX = true; break; }
    }
    a.x = nx;
    const c0 = Math.floor((a.x - hw + 0.1) / TILE), c1 = Math.floor((a.x + hw - 0.1) / TILE), d = a.vy * dt;
    if (d >= 0) {
        const f0 = a.y + hh, f1 = f0 + d;
        for (let r = Math.floor(f0 / TILE); r <= Math.floor(f1 / TILE); r++) for (let c = c0; c <= c1; c++) {
            const t = tileAt(W, c, r);
            if (SOLID[t] || ((t === ONEWAY || t === BOUNCE || t === SEAL) && f0 <= r * TILE + 2)) { a.y = r * TILE - hh; a.vy = 0; a.grounded = true; return a; }
        }
    } else {
        const r = Math.floor((a.y - hh + d) / TILE);
        for (let c = c0; c <= c1; c++) if (SOLID[tileAt(W, c, r)]) { a.y = (r + 1) * TILE + hh; a.vy = 0; return a; }
    }
    a.y += d;
    return a;
}

export function groundAhead(a, W) {
    const c = Math.floor((a.x + Math.sign(a.vx) * (a.w / 2 + 2)) / TILE), r = Math.floor((a.y + a.h / 2 + 2) / TILE), t = tileAt(W, c, r);
    return SOLID[t] === 1 || t === ONEWAY || t === SEAL;
}

/** First solid along a tile ray from (x,y). dx,dy is a unit axis. Returns the end point. */
export function castBeam(W, x, y, dx, dy, max = 900) {
    let px = x, py = y;
    for (let i = 0; i < max; i += 4) {
        px += dx * 4; py += dy * 4;
        const t = tileAt(W, Math.floor(px / TILE), Math.floor(py / TILE));
        if (SOLID[t] === 1) break;
    }
    return { x: px, y: py };
}
