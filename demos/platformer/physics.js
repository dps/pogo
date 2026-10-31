// Pure tile physics for Puddle Pip. No Pogo imports: the game and the A* bot both run this exact code,
// so whatever the bot proves about a jump is true for the player.

export const TILE = 16;
export const DT = 1 / 60;

// Tile ids. Keep in step with drawTiles() in game.js.
export const EMPTY = 0, GROUND = 1, BRICK = 2, SUN = 3, USED = 4, HARD = 5, ONEWAY = 6, PIPE = 7,
    HIDDEN = 8, THORN = 9, LAVA = 10, COIN = 11, CRUMBLE = 12, CLOUD = 13, THORN_DOWN = 14, SECRET = 15;

const SOLID = new Uint8Array(32);
for (const t of [GROUND, BRICK, SUN, USED, HARD, PIPE, CRUMBLE, SECRET]) SOLID[t] = 1;
const TOPONLY = new Uint8Array(32);
TOPONLY[ONEWAY] = TOPONLY[CLOUD] = 1;

export const isSolid = (t) => SOLID[t] === 1;
export const isTopOnly = (t) => TOPONLY[t] === 1;

// Game feel constants, px and seconds. tools/measure.mjs prints what these add up to.
export const F = {
    WALK: 92, RUN: 168,
    ACC_WALK: 250, ACC_RUN: 400,
    FRICTION: 340, SKID: 960,
    AIR_ACC: 310, AIR_TURN: 560,
    JUMP: 306, JUMP_RUN: 54,          // takeoff speed, plus this much at full run
    G_UP: 720, G_CUT: 2100, G_FALL: 1400, APEX_BAND: 34, APEX_MUL: 0.58,
    MAX_FALL: 330,
    COYOTE: 6, BUFFER: 7,             // frames
    CORNER: 4,                        // px of head overlap that gets nudged clear
    STOMP_BOUNCE: 250, STOMP_HELD: 345, SPRING: 430, SPRING_HELD: 530,
};

export function tileAt(R, c, r) {
    if (c < 0 || c >= R.w) return HARD;   // the level ends are walls
    if (r < 0 || r >= R.h) return EMPTY;
    return R.T[r * R.w + c];
}

/** Where a platform is at time t: fills p.qx, p.qy (its centre). Falling platforms are stateful. */
export function platAt(p, t) {
    if (p.kind === "fall") { p.qx = p.x; p.qy = p.y; return p; }
    const s = Math.sin((t / p.period + p.phase) * Math.PI * 2);
    p.qx = p.x0 + p.ax * s;
    p.qy = p.y0 + p.ay * s;
    return p;
}

export function newHero(x, y, big) {
    return { x, y, vx: 0, vy: 0, w: 10, h: big ? 25 : 14, big: !!big, grounded: false, coyote: 0, buffer: 0, jumped: false,
        cut: false, launched: false, skid: false, on: -1, face: 1, crouch: false };
}

const hitsX = (R, c, top, bot) => {
    const r0 = Math.floor(top / TILE), r1 = Math.floor(bot / TILE);
    for (let r = r0; r <= r1; r++) if (SOLID[tileAt(R, c, r)]) return true;
    return false;
};

/** One fixed step of the hero. inp: { dir, run, jump, jumpPressed, down }. hooks are optional game callbacks. */
export function stepHero(h, inp, R, t, hooks) {
    const dt = DT, f = F;
    if (inp.jumpPressed) h.buffer = f.BUFFER; else if (h.buffer > 0) h.buffer--;
    if (h.grounded) h.coyote = f.COYOTE; else if (h.coyote > 0) h.coyote--;
    h.crouch = h.grounded && h.big && inp.down;
    const dir = h.crouch ? 0 : inp.dir, abs = Math.abs(h.vx), max = inp.run ? f.RUN : f.WALK;
    if (dir) h.face = dir;

    if (h.grounded) {
        if (dir) {
            if (h.vx * dir < 0) {
                h.skid = abs > 40;
                h.vx += dir * f.SKID * dt;
                if (h.vx * dir > 0) h.vx = 0;
            } else {
                h.skid = false;
                const a = inp.run ? f.ACC_RUN : f.ACC_WALK;
                h.vx = dir * (abs < max ? Math.min(max, abs + a * dt) : Math.max(max, abs - f.FRICTION * dt));
            }
        } else {
            h.skid = false;
            h.vx = Math.sign(h.vx) * Math.max(0, abs - f.FRICTION * dt);
        }
    } else {
        h.skid = false;
        if (dir) {
            const turning = h.vx * dir < 0;
            if (turning || abs < max) {
                h.vx += dir * (turning ? f.AIR_TURN : f.AIR_ACC) * dt;
                if (!turning && Math.abs(h.vx) > max) h.vx = dir * max;
            }
        }
    }

    if (h.buffer > 0 && h.coyote > 0) {
        h.vy = -(f.JUMP + f.JUMP_RUN * Math.min(1, Math.abs(h.vx) / f.RUN));
        h.grounded = false; h.jumped = true; h.cut = false; h.coyote = 0; h.buffer = 0; h.on = -1;
        hooks?.jump?.();
    }
    if (h.vy >= 0) h.launched = false;
    if (h.vy < 0 && !inp.jump && !h.launched) h.cut = true;
    let g;
    if (h.vy < 0) g = h.cut ? f.G_CUT : f.G_UP;
    else g = f.G_FALL;
    if (!h.cut && inp.jump && Math.abs(h.vy) < f.APEX_BAND) g *= f.APEX_MUL;
    h.vy = Math.min(f.MAX_FALL, h.vy + g * dt);

    // Ride whatever we stand on.
    let platDy = 0;
    if (h.on >= 0) {
        const p = R.plats[h.on];
        platAt(p, t - dt); const px = p.qx, py = p.qy;
        platAt(p, t);
        h.x += p.qx - px;
        platDy = p.qy - py;
        h.y = p.qy - p.h / 2 - h.h / 2;
    }

    moveX(h, R, h.vx * dt);
    moveY(h, R, t, hooks, h.vy * dt);

    // Springs live here so a bot's forward simulation sees them too.
    if (R.pads && h.vy >= 0) for (const sp of R.pads) {
        if (Math.abs(sp.x - h.x) < 12 && h.y + h.h / 2 >= sp.y && h.y + h.h / 2 <= sp.y + 14) {
            h.vy = inp.jump ? -F.SPRING_HELD : -F.SPRING; h.grounded = false; h.launched = true; h.cut = false; h.on = -1; h.coyote = 0;
            h.y = sp.y - h.h / 2;
            hooks?.spring?.(sp);
            break;
        }
    }
}

function moveX(h, R, d) {
    if (d === 0) return;
    const hw = h.w / 2, hh = h.h / 2, top = h.y - hh + 0.1, bot = h.y + hh - 0.1;
    let nx = h.x + d;
    if (d > 0) {
        const c = Math.floor((nx + hw) / TILE);
        if (hitsX(R, c, top, bot)) { nx = c * TILE - hw - 0.001; h.vx = 0; }
    } else {
        const c = Math.floor((nx - hw) / TILE);
        if (hitsX(R, c, top, bot)) { nx = (c + 1) * TILE + hw + 0.001; h.vx = 0; }
    }
    h.x = nx;
}

function moveY(h, R, t, hooks, d) {
    const hw = h.w / 2 - 0.1, hh = h.h / 2, c0 = Math.floor((h.x - hw) / TILE), c1 = Math.floor((h.x + hw) / TILE);
    h.grounded = false;
    const wasOn = h.on;
    h.on = -1;
    if (d >= 0) {
        const feet0 = h.y + hh, feet1 = feet0 + d;
        const r0 = Math.floor(feet0 / TILE), r1 = Math.floor(feet1 / TILE);
        for (let r = r0; r <= r1; r++) {
            const top = r * TILE;
            for (let c = c0; c <= c1; c++) {
                const k = tileAt(R, c, r);
                if (SOLID[k] || (TOPONLY[k] && feet0 <= top + 1)) {
                    h.y = top - hh; h.vy = 0; h.grounded = true; h.jumped = false; h.cut = false;
                    return;
                }
            }
        }
        let best = -1, bestTop = Infinity;
        for (let i = 0; i < R.plats.length; i++) {
            const p = R.plats[i];
            if (p.gone) continue;
            platAt(p, t);
            const top = p.qy - p.h / 2;
            if (Math.abs(p.qx - h.x) > p.w / 2 + hw) continue;
            const slack = (i === wasOn ? 4 : 2) + Math.max(0, p.ay ? 2 : 0);
            if (feet0 <= top + slack && feet1 >= top - (i === wasOn ? 3 : 0) && top < bestTop) { best = i; bestTop = top; }
        }
        if (best >= 0) {
            h.y = bestTop - hh; h.vy = 0; h.grounded = true; h.jumped = false; h.cut = false; h.on = best;
            return;
        }
        h.y += d;
        return;
    }
    const head1 = h.y - hh + d, r = Math.floor(head1 / TILE);
    if (r !== Math.floor((h.y - hh) / TILE) || r * TILE + TILE > head1) {
        const blocked = (k) => SOLID[k] || k === HIDDEN;
        const a = blocked(tileAt(R, c0, r)), b = c1 !== c0 && blocked(tileAt(R, c1, r));
        if (a || b) {
            const bumpy = (c) => { const k = tileAt(R, c, r); return k === SUN || k === BRICK || k === HIDDEN || k === SECRET; };
            // Corner correction: clipping a block's edge slides you past it, unless it's one you'd want to bump.
            if (a !== b) {
                const c = a ? c0 : c1, over = a ? (c0 + 1) * TILE - (h.x - h.w / 2) : (h.x + h.w / 2) - c1 * TILE;
                if (over <= F.CORNER && !bumpy(c)) {
                    const nx = a ? (c0 + 1) * TILE + h.w / 2 + 0.01 : c1 * TILE - h.w / 2 - 0.01;
                    if (!hitsX(R, a ? c0 + 1 : c1 - 1, h.y - hh + 0.1, h.y + hh - 0.1)) { h.x = nx; h.y += d; return; }
                }
            }
            const hits = (k) => k === HIDDEN ? (h.y - hh >= (r + 1) * TILE - 2) : !!SOLID[k];
            const ha = hits(tileAt(R, c0, r)), hb = c1 !== c0 && hits(tileAt(R, c1, r));
            if (ha || hb) {
                h.y = (r + 1) * TILE + hh;
                h.vy = 30;
                h.cut = true;
                // Hit the block nearest the hero's middle, as the classics did.
                const pick = ha && hb ? (Math.abs((c0 + 0.5) * TILE - h.x) <= Math.abs((c1 + 0.5) * TILE - h.x) ? c0 : c1) : ha ? c0 : c1;
                hooks?.bump?.(pick, r);
                return;
            }
        }
    }
    h.y += d;
}

/** Simple gravity + tile collision for enemies and items. Sets a.hitX, a.grounded. */
export function moveBox(a, R, dt = DT, gravity = 1400, maxFall = 340) {
    a.hitX = false;
    a.vy = Math.min(maxFall, a.vy + gravity * dt);
    const hw = a.w / 2, hh = a.h / 2;
    let nx = a.x + a.vx * dt;
    if (a.vx !== 0) {
        const edge = a.vx > 0 ? nx + hw : nx - hw, c = Math.floor(edge / TILE);
        if (hitsX(R, c, a.y - hh + 0.1, a.y + hh - 0.1)) {
            nx = a.vx > 0 ? c * TILE - hw - 0.001 : (c + 1) * TILE + hw + 0.001;
            a.hitX = true; a.hitC = c; a.hitR = Math.floor(a.y / TILE);
        }
    }
    a.x = nx;
    const c0 = Math.floor((a.x - hw + 0.1) / TILE), c1 = Math.floor((a.x + hw - 0.1) / TILE);
    const d = a.vy * dt;
    a.grounded = false;
    if (d >= 0) {
        const f0 = a.y + hh, f1 = f0 + d;
        for (let r = Math.floor(f0 / TILE); r <= Math.floor(f1 / TILE); r++) for (let c = c0; c <= c1; c++) {
            const k = tileAt(R, c, r);
            if (SOLID[k] || (TOPONLY[k] && f0 <= r * TILE + 1)) { a.y = r * TILE - hh; a.vy = 0; a.grounded = true; return a; }
        }
        for (const p of R.plats) {
            if (p.gone) continue;
            const top = (p.qy ?? p.y) - p.h / 2;
            if (Math.abs((p.qx ?? p.x) - a.x) <= p.w / 2 + hw && f0 <= top + 3 && f1 >= top) { a.y = top - hh; a.vy = 0; a.grounded = true; a.x += (p.dx ?? 0); return a; }
        }
    } else {
        const r = Math.floor((a.y - hh + d) / TILE);
        for (let c = c0; c <= c1; c++) if (SOLID[tileAt(R, c, r)]) { a.y = (r + 1) * TILE + hh; a.vy = 0; return a; }
    }
    a.y += d;
    return a;
}

/** Ground under the leading edge? Used by enemies that turn at ledges. */
export function groundAhead(a, R) {
    const c = Math.floor((a.x + Math.sign(a.vx) * (a.w / 2 + 2)) / TILE), r = Math.floor((a.y + a.h / 2 + 2) / TILE), k = tileAt(R, c, r);
    return !!(SOLID[k] || TOPONLY[k]);
}
