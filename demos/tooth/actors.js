// Enemies, projectiles and bosses. Bosses are generators: each yield is one fixed step, so a pattern reads like a script.
import { groundAhead, moveBox, tileAt, TILE } from "./physics.js";
import { PAL } from "./art.js";
import { AREAS } from "./world.js";

const AREA_ORDER = "gestwnohup";
const SIZE = { a: [16, 12], f: [14, 12], j: [14, 14], s: [16, 22], d: [12, 12], k: [20, 14], m: [16, 16] };

export function spawnFoe(G, e) {
    const tier = AREA_ORDER.indexOf(e.room[0]), [w, h] = SIZE[e.foe];
    const hard = G.sv.hard ? 1 : 0;
    const f = { kind: e.foe, x: e.x, y: e.y - h / 2, x0: e.x, y0: e.y - h / 2, w, h, vx: 0, vy: 0, hp: ({ a: 2, f: 2, j: 2, s: 3, d: 1, k: 3, m: 2 })[e.foe] + Math.floor(tier / 3) + hard, t: (e.x * 7) % 90, st: 0, face: -1, flash: 0, knock: 0, tier, dead: false, frame: 0, dmg: 0.5 + hard * 0.5, key: e.key, sx: 1, sy: 1, color: PAL[AREAS[e.room[0]].key].foe };
    f.speed = 26 + tier * 3;
    if (f.kind === "f") { f.y -= 26; f.y0 -= 26; }
    if (f.kind === "d") {   // Hang from the ceiling above.
        let r = Math.floor(f.y / TILE);
        while (r > 0 && tileAt(G.W, Math.floor(f.x / TILE), r) === 0) r--;
        f.y = f.y0 = (r + 1) * TILE + 8;
    }
    if (f.kind === "a" || f.kind === "k" || f.kind === "m") f.vx = -f.speed;
    G.foes.push(f);
    return f;
}

export function shoot(G, x, y, vx, vy, o = {}) {
    G.shots.push({ x, y, vx, vy, r: o.r ?? 5, g: o.g ?? 0, life: o.life ?? 240, dmg: (o.dmg ?? 1) + (G.sv.hard ? 1 : 0), kind: o.kind ?? "ball", color: o.color ?? "#ffffff", wall: o.wall ?? true, reflect: !!o.reflect, h: o.h ?? 0, t: 0 });
}

export function updateFoes(G) {
    const { H, W } = G;
    for (const f of G.foes) {
        f.t++;
        if (f.flash > 0) f.flash--;
        f.sx += (1 - f.sx) * 0.2; f.sy += (1 - f.sy) * 0.2;
        f.frame = Math.floor(f.t / 9);
        const dx = H.x - f.x, dy = H.y - f.y, near = Math.abs(dx) < 170 && Math.abs(dy) < 110;
        if (f.knock > 0) {
            f.knock--; f.x += f.kx * 0.016; f.kx *= 0.86;
            if (f.kind === "a" || f.kind === "k" || f.kind === "m" || f.kind === "j") { const v = f.vx; f.vx = 0; moveBox(f, W); f.vx = v; }
            continue;
        }
        switch (f.kind) {
            case "a": case "k":
                if (f.stun > 0) { f.stun--; f.frame = 0; { const v = f.vx; f.vx = 0; moveBox(f, W); f.vx = v; } break; }
                moveBox(f, W);
                if (f.hitX || (f.grounded && !groundAhead(f, W))) f.vx = -f.vx;
                f.face = Math.sign(f.vx) || f.face;
                break;
            case "m":
                if (f.st === 0) {
                    moveBox(f, W);
                    if (f.hitX || (f.grounded && !groundAhead(f, W))) f.vx = -f.vx;
                    f.face = Math.sign(f.vx) || f.face;
                    if (Math.abs(dx) < 58 && Math.abs(dy) < 40) { f.st = 1; f.tt = 46; G.sfx("tele"); }
                } else {
                    f.tt--; f.sx = f.sy = 1 + (46 - f.tt) * 0.012; f.frame = Math.floor(f.t / 3);
                    if (f.tt <= 0) { f.dead = true; G.killed.add(f.key); G.pop(f); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; shoot(G, f.x, f.y, Math.cos(a) * 120, Math.sin(a) * 120, { life: 40, color: f.color, dmg: 0.5 }); } G.sfx("boom"); G.s.shake(3, 0.2); }
                }
                break;
            case "f":
                f.x += (near ? Math.sign(dx) * 0.55 : Math.sin(f.t / 60) * 0.5);
                f.y += (near ? Math.sign(dy) * 0.3 : 0) + Math.sin(f.t / 14) * 0.5;
                f.face = Math.sign(dx) || f.face;
                if (solidAt(W, f.x, f.y)) { f.x -= Math.sign(dx) * 1.2; f.y -= Math.sign(dy) * 1.2; }
                break;
            case "j":
                moveBox(f, W);
                f.vx = f.grounded ? 0 : f.vx;
                if (f.grounded && --f.st <= 0) { f.st = 70 + (f.t % 40); if (near) { f.vy = -250; f.vx = Math.sign(dx) * (60 + f.tier * 5); f.sy = 1.3; f.sx = 0.8; f.face = Math.sign(dx); } }
                f.frame = f.grounded ? 0 : 1;
                break;
            case "s":
                f.face = Math.sign(dx) || f.face;
                f.frame = f.st > 0 && f.st < 16 ? 1 : 0;
                if (near) {
                    if (++f.st > 110 - f.tier * 4) {
                        f.st = 0; f.sy = 1.25; G.sfx("shoot");
                        const d = Math.hypot(dx, dy) || 1, sp = 95 + f.tier * 6;
                        shoot(G, f.x, f.y - 8, dx / d * sp, dy / d * sp, { color: f.color, g: 0, dmg: 0.5 });
                    }
                }
                break;
            case "d":
                if (f.st === 0) {
                    if (Math.abs(dx) < 26 && dy > 0 && dy < 170) { f.st = 1; f.tt = 16; f.sy = 1.3; }
                } else if (f.st === 1) { f.frame = 1; if (--f.tt <= 0) { f.st = 2; f.vy = 0; f.vx = 0; } }
                else if (f.st === 2) {
                    moveBox(f, W); f.frame = 1;
                    if (f.grounded) { f.st = 3; f.tt = 90; G.splat(f.x, f.y + 6, f.color); f.hidden = true; }
                } else if (--f.tt <= 0) { f.x = f.x0; f.y = f.y0; f.st = 0; f.hidden = false; f.sy = 0.3; }
                break;
        }
        // Contact.
        if (!f.hidden && Math.abs(H.x - f.x) < (f.w + H.w) / 2 - 1 && Math.abs(H.y - f.y) < (f.h + H.h) / 2 - 1) G.hurt(f.dmg, f.x);
    }
    G.foes = G.foes.filter((f) => !f.dead);
}

const solidAt = (W, x, y) => { const t = tileAt(W, Math.floor(x / TILE), Math.floor(y / TILE)); return t > 0 && t < 6 || t === 13 || t === 14 || t === 15; };

export function updateShots(G) {
    const { H, W } = G;
    for (const b of G.shots) {
        b.t++; b.life--;
        b.vy += b.g / 60;
        b.x += b.vx / 60; b.y += b.vy / 60;
        if (b.kind === "wave") {
            if (solidAt(W, b.x + Math.sign(b.vx) * 10, b.y)) b.life = 0;
        } else if (b.wall && solidAt(W, b.x, b.y)) { b.life = 0; G.spark(b.x, b.y, b.color); }
        const hh = b.kind === "wave" ? b.h : b.r;
        if (b.reflect && H.mirror && !b.bounced && Math.hypot(b.x - H.x, b.y - H.y) < 20) {
            b.bounced = true; b.vx = -b.vx * 1.4; b.vy = -b.vy; b.hot = true; G.reflectFx(b);
        } else if (b.hot) {
            const B = G.boss;
            if (B && Math.abs(b.x - B.x) < B.w / 2 + 6 && Math.abs(b.y - B.y) < B.h / 2 + 6) { b.life = 0; G.hitBoss(6, b.vx > 0 ? 1 : -1, true); }
        } else if (Math.abs(b.x - H.x) < b.r + 4 && Math.abs(b.y - H.y) < hh + 6) { G.hurt(b.dmg, b.x); if (b.kind === "ball") b.life = 0; }
    }
    G.shots = G.shots.filter((b) => b.life > 0);
    for (const c of G.cols) {
        c.t--;
        if (c.t === 0) { c.on = 16; G.sfx("slam"); G.s.shake(2, 0.12); G.splat(c.x, c.y1, c.color); }
        if (c.t < 0) { c.on--; if (Math.abs(H.x - c.x) < c.w / 2 + 3 && H.y > c.y0 && H.y < c.y1 + 8) G.hurt(c.dmg, c.x); }
    }
    G.cols = G.cols.filter((c) => c.on === undefined || c.on > 0);
}

export function drawFoes(G, d) {
    for (const f of G.foes) {
        if (f.hidden) continue;
        const flip = f.face > 0, dead = f.flash > 0;
        d.sprite("foe_" + f.kind, { x: f.x, y: f.y - (f.h > 14 ? 2 : 4) + (f.kind === "f" ? 0 : 0), width: 30 * f.sx * (f.kind === "k" ? 1.15 : 1), height: 30 * f.sy * (f.kind === "s" ? 1.2 : 1), frame: f.frame, flipX: flip, color: dead ? "#ffffff" : f.color });
    }
}

export function drawShots(G, d) {
    for (const c of G.cols) {
        if (c.t > 0) { const k = 1 - c.t / c.warn; d.rect(c.w * (0.3 + k * 0.7), c.y1 - c.y0, { x: c.x, y: (c.y0 + c.y1) / 2, color: c.color, opacity: 0.1 + 0.2 * k }); }
    }
    for (const b of G.shots) {
        if (b.kind === "wave") d.sprite("props", { x: b.x, y: b.y - b.h / 2 + 8, width: 22, height: b.h * 1.5, frame: G.PROP.spike, color: b.color, flipX: b.vx < 0 });
        else d.sprite("shot", { x: b.x, y: b.y, width: b.r * 3, height: b.r * 3, color: b.hot ? "#7df9ff" : b.color });
    }
    d.additive(() => {
        for (const b of G.shots) d.sprite("glow", { x: b.x, y: b.y, width: b.r * 8, height: b.r * 8, color: b.hot ? "#7df9ff" : b.color, opacity: 0.5 });
        for (const c of G.cols) if (c.t <= 0) { d.rect(c.w, c.y1 - c.y0, { x: c.x, y: (c.y0 + c.y1) / 2, color: c.color, opacity: 0.8 * c.on / 16 }); d.rect(c.w * 0.4, c.y1 - c.y0, { x: c.x, y: (c.y0 + c.y1) / 2, color: "#ffffff", opacity: c.on / 16 }); }
    });
}

// ---------------------------------------------------------------------------------------------- Boss kit.
const ease = (t) => t * t * (3 - 2 * t);
function* wait(n) { for (let i = 0; i < n; i++) yield; }
function* tele(b, G, n) {   // Wind-up: the frame, the shake and the rising tone are always the same, so patterns can be learned.
    b.frame = 1; G.sfx("tele");
    for (let i = 0; i < n; i++) { b.ox = Math.sin(i * 1.6) * 2; b.sy = 1 - 0.1 * Math.sin((i / n) * Math.PI / 2); b.sx = 1 + 0.08 * Math.sin((i / n) * Math.PI / 2); yield; }
    b.ox = 0; b.frame = 0;
}
function* rest(b, G, n) {   // Spent: flyers sink to the floor, so every boss has a window you can reach.
    b.dazed = true; b.frame = 0;
    if (b.fly && !b.hung) { yield* glide(b, b.x, b.floorY - b.h / 2 - 2, 18); G.dust(b.x, b.floorY); }
    yield* wait(Math.round(n * 1.3)); b.dazed = false;
}
function* charge(b, G, speed, dir = Math.sign(G.H.x - b.x) || 1) {
    b.face = dir; G.sfx("roar");
    for (;;) {
        b.x += dir * speed / 60; b.sx = 1.12; b.sy = 0.92;
        if (b.t % 6 === 0) G.dust(b.x - dir * b.w / 2, b.floorY);
        if (dir > 0 ? b.x + b.w / 2 >= b.right : b.x - b.w / 2 <= b.left) break;
        yield;
    }
    b.x = dir > 0 ? b.right - b.w / 2 : b.left + b.w / 2; G.s.shake(5, 0.25); G.sfx("slam"); G.buzz("heavy"); b.sx = 0.8; b.sy = 1.2; b.face = -dir;
}
function* leap(b, G, tx, h, n, onLand) {
    const x0 = b.x, y0 = b.y, floor = b.floorY - b.h / 2; tx = Math.max(b.left + b.w / 2, Math.min(b.right - b.w / 2, tx));
    b.sy = 1.2; b.sx = 0.85; b.face = Math.sign(tx - b.x) || b.face;
    for (let i = 1; i <= n; i++) { const t = i / n; b.x = x0 + (tx - x0) * t; b.y = y0 + (floor - y0) * t - Math.sin(t * Math.PI) * h; yield; }
    b.y = floor; b.sx = 1.25; b.sy = 0.75; G.s.shake(5, 0.2); G.sfx("slam"); G.buzz("heavy"); G.dust(b.x, b.floorY);
    onLand?.();
}
function* glide(b, tx, ty, n) { const x0 = b.x, y0 = b.y; for (let i = 1; i <= n; i++) { const t = ease(i / n); b.x = x0 + (tx - x0) * t; b.y = y0 + (ty - y0) * t; yield; } }
const waves = (b, G, sp = 130, h = 16, both = true, color) => { const y = b.floorY - 2; if (both || G.H.x > b.x) shoot(G, b.x + b.w * 0.3, y, sp, 0, { kind: "wave", h, r: 6, wall: false, color: color ?? b.color, life: 300 }); if (both || G.H.x < b.x) shoot(G, b.x - b.w * 0.3, y, -sp, 0, { kind: "wave", h, r: 6, wall: false, color: color ?? b.color, life: 300 }); };
const ring = (b, G, n, sp, off = 0, o = {}) => { for (let i = 0; i < n; i++) { const a = off + i * Math.PI * 2 / n; shoot(G, b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp, { color: b.color, ...o }); } G.sfx("shoot"); };
const aimed = (b, G, sp, spread = 0, o = {}) => { const a = Math.atan2(G.H.y - b.y, G.H.x - b.x) + spread; shoot(G, b.x, b.y, Math.cos(a) * sp, Math.sin(a) * sp, { color: b.color, ...o }); G.sfx("shoot"); };
const col = (b, G, x, warn = 44, w = 26, dmg = 1) => G.cols.push({ x, w, t: warn, warn, y0: b.ceilY - 40, y1: b.floorY, color: b.color, dmg });
const arc = (b, G, tx, n, o = {}) => { const g = o.g ?? 420, vy = -g * n / 120, vx = (tx - b.x) / (n / 60); shoot(G, b.x, b.y - b.h * 0.3, vx, vy, { g, color: b.color, r: 6, ...o }); };

const SCRIPTS = {
    *tartar(b, G) {
        for (;;) {
            yield* tele(b, G, 44); yield* charge(b, G, 200); yield* rest(b, G, 62);
            yield* tele(b, G, 36); yield* leap(b, G, G.H.x, 64, 46, () => waves(b, G, 110, 12)); yield* rest(b, G, 52);
            if (b.hp < b.max / 2) { yield* tele(b, G, 30); yield* charge(b, G, 240); yield* rest(b, G, 42); }
        }
    },
    *bear(b, G) {
        for (;;) {
            yield* tele(b, G, 40); yield* charge(b, G, 250); yield* rest(b, G, 66);
            yield* tele(b, G, 34); G.sfx("roar"); G.s.shake(4, 0.5);
            for (let i = 0; i < 6; i++) { col(b, G, b.left + 30 + (i * 149 + b.t) % (b.right - b.left - 60), 46, 20); yield* wait(14); }
            yield* rest(b, G, 30);
            yield* tele(b, G, 32); yield* leap(b, G, G.H.x, 96, 44, () => waves(b, G, 140, 14)); yield* rest(b, G, 50);
            if (b.hp < b.max / 2) { yield* tele(b, G, 26); yield* leap(b, G, G.H.x, 60, 34, () => waves(b, G, 150, 14)); yield* leap(b, G, G.H.x, 60, 34, () => waves(b, G, 150, 14)); yield* rest(b, G, 46); }
        }
    },
    *queen(b, G) {
        b.fly = true;
        const cx = (b.left + b.right) / 2, top = b.ceilY + 48;
        for (;;) {
            yield* glide(b, cx, top, 40); yield* tele(b, G, 30);
            for (let i = 0; i < 3; i++) { ring(b, G, 10, 88, i * 0.3, { r: 5 }); yield* wait(32); }
            yield* rest(b, G, 40);
            const s = G.H.x < cx ? 1 : -1;
            yield* glide(b, cx + s * 150, top + 20, 34); yield* tele(b, G, 28);
            yield* glide(b, cx - s * 150, b.floorY - 40, 42); G.sfx("slam"); waves(b, G, 120, 12); yield* rest(b, G, 56);
            yield* glide(b, cx, top, 30); yield* tele(b, G, 24);
            for (let i = 0; i < 5; i++) { arc(b, G, b.left + 40 + i * (b.right - b.left - 80) / 4, 70, { r: 7, wall: false }); }
            G.sfx("shoot"); yield* wait(46);
            if (b.hp < b.max / 2) { for (let i = 0; i < 4; i++) { aimed(b, G, 150); yield* wait(14); } }
            yield* rest(b, G, 40);
        }
    },
    *bud(b, G) {
        for (;;) {
            for (let i = 0; i < 3; i++) { yield* tele(b, G, 30); yield* leap(b, G, G.H.x + (i - 1) * 20, 120, 58, () => waves(b, G, 130, 14)); yield* wait(10); }
            yield* rest(b, G, 66);
            yield* tele(b, G, 30);
            for (let i = 0; i < 7; i++) { arc(b, G, G.H.x + (i - 3) * 34, 62, { r: 6, wall: false }); G.sfx("shoot"); yield* wait(9); }
            yield* rest(b, G, 44);
            yield* tele(b, G, 32); yield* charge(b, G, 280); yield* rest(b, G, 60);
        }
    },
    *bog(b, G) {
        const floorY = b.floorY;
        for (;;) {
            yield* tele(b, G, 34);
            b.submerged = true; b.ghost = true; const ty = b.y; for (let i = 0; i < 30; i++) { b.y += 3; yield; }
            yield* wait(14);
            b.x = Math.max(b.left + b.w / 2, Math.min(b.right - b.w / 2, G.H.x)); col(b, G, b.x, 42, b.w * 0.8, 1);
            G.dust(b.x, floorY); yield* wait(40);
            for (let i = 0; i < 16; i++) { b.y = Math.max(ty, b.y - 8); yield; } b.y = ty; b.ghost = false; b.submerged = false; waves(b, G, 120, 12);
            yield* rest(b, G, 62);
            yield* tele(b, G, 28);
            for (let i = 0; i < 9; i++) { arc(b, G, b.left + (i * 83) % (b.right - b.left), 80, { r: 6, wall: false }); G.sfx("shoot"); yield* wait(7); }
            yield* rest(b, G, 40);
            yield* tele(b, G, 36); yield* charge(b, G, 170); yield* rest(b, G, 50);
            if (b.hp < b.max / 2) { yield* tele(b, G, 26); for (let i = 0; i < 2; i++) { ring(b, G, 12, 100, i * 0.26, { r: 5 }); yield* wait(26); } yield* rest(b, G, 40); }
        }
    },
    *nerve(b, G) {
        b.fly = true;
        const cx = (b.left + b.right) / 2, midY = b.ceilY + 80;
        for (;;) {
            yield* glide(b, cx, midY, 30); yield* tele(b, G, 26);
            for (let i = 0; i < 8; i++) { col(b, G, b.left + 24 + i * (b.right - b.left - 48) / 7 * (i % 2 ? 1 : 1), 40 + (i % 2) * 34, 22); }
            yield* wait(90); yield* rest(b, G, 34);
            for (let k = 0; k < 3; k++) { yield* tele(b, G, 18); const s = G.H.x > b.x ? 1 : -1; yield* glide(b, G.H.x - s * 30, Math.min(b.floorY - 40, G.H.y - 30), 22); ring(b, G, 12, 104, k * 0.2, { r: 4 }); yield* wait(14); }
            yield* rest(b, G, 66);
            yield* tele(b, G, 22); for (let i = 0; i < 6; i++) { col(b, G, G.H.x, 26, 28); yield* wait(22); } yield* rest(b, G, 40);
            if (b.hp < b.max / 2) { yield* tele(b, G, 24); for (let i = 0; i < 3; i++) { for (let j = -1; j <= 1; j++) aimed(b, G, 170, j * 0.28, { r: 4 }); yield* wait(22); } yield* rest(b, G, 36); }
        }
    },
    *twins(b, G) {
        for (;;) {
            yield* tele(b, G, 28);
            for (let i = 0; i < 4; i++) { ring(b, G, 7, 96, i * 0.45, { r: 5 }); yield* leap(b, G, i % 2 ? b.left : b.right, 80, 36, () => waves(b, G, 130, 12, false)); }
            yield* rest(b, G, 62);
            yield* tele(b, G, 34); yield* charge(b, G, 260); yield* wait(12); yield* tele(b, G, 24); yield* charge(b, G, 260); yield* rest(b, G, 70);
            yield* tele(b, G, 26);
            for (let i = 0; i < 7; i++) { col(b, G, G.H.x + ((i * 53) % 90) - 45, 40, 18); yield* wait(16); }
            yield* rest(b, G, 40);
            if (b.hp < b.max / 2) { yield* tele(b, G, 22); for (let i = 0; i < 6; i++) { aimed(b, G, 160, Math.sin(i) * 0.2, { r: 5 }); yield* wait(10); } yield* rest(b, G, 30); }
        }
    },
    *uvula(b, G) {
        b.fly = true; b.hung = true;
        const cx = (b.left + b.right) / 2, hy = b.ceilY + 70;
        for (;;) {
            yield* tele(b, G, 26);
            for (let i = 0; i < 300; i++) {   // The big swing: it's slow, and it's safe to drill it at the bottom of the arc.
                const a = Math.sin(i / 34) * 1; b.x = cx + a * 170; b.y = hy + (1 - Math.abs(a)) * 56;
                if (i % 68 === 34) { ring(b, G, 8, 80, i * 0.1, { r: 5, wall: false, life: 120 }); G.sfx("slam"); G.s.shake(2, 0.2); }
                yield;
            }
            yield* glide(b, cx, hy + 56, 30); yield* rest(b, G, 62);
            yield* tele(b, G, 28);
            for (let i = 0; i < 5; i++) { waves(b, G, 140, 14 + i * 2); G.s.shake(3, 0.15); G.sfx("slam"); yield* wait(40); }
            yield* rest(b, G, 40);
            yield* tele(b, G, 22); for (let i = 0; i < 10; i++) { col(b, G, b.left + 20 + (i * 97) % (b.right - b.left - 40), 38, 22); yield* wait(14); } yield* rest(b, G, 30);
        }
    },
    *reflux(b, G) {
        for (;;) {
            yield* tele(b, G, 30);
            G.acidUp(40, 240);
            for (let i = 0; i < 6; i++) { arc(b, G, G.H.x + (i - 2.5) * 44, 64, { r: 7, wall: false }); G.sfx("shoot"); yield* wait(14); }
            yield* rest(b, G, 50);
            yield* tele(b, G, 30); yield* charge(b, G, 320); yield* rest(b, G, 52);
            yield* tele(b, G, 26); yield* leap(b, G, G.H.x, 110, 42, () => { waves(b, G, 160, 18); ring(b, G, 10, 90, 0.2, { r: 5 }); }); yield* rest(b, G, 60);
            if (b.hp < b.max / 2) { yield* tele(b, G, 24); for (let i = 0; i < 8; i++) { col(b, G, b.left + 20 + (i * 61) % (b.right - b.left - 40), 34, 24); yield* wait(10); } yield* tele(b, G, 22); yield* charge(b, G, 340); yield* rest(b, G, 46); }
        }
    },
    *ache(b, G) {
        b.fly = true;
        const cx = (b.left + b.right) / 2, top = b.ceilY + 56;
        const zap = (o = {}) => { const a = Math.atan2(G.H.y - b.y, G.H.x - b.x); shoot(G, b.x, b.y, Math.cos(a) * 150, Math.sin(a) * 150, { color: "#ffd27a", r: 7, reflect: true, wall: false, ...o }); G.sfx("shoot"); };
        for (;;) {
            yield* glide(b, cx, top, 30); yield* tele(b, G, 26);
            for (let i = 0; i < 4; i++) { zap(); yield* wait(26); }      // Mirror these back for big damage.
            yield* rest(b, G, 40);
            yield* tele(b, G, 24); for (let i = 0; i < 7; i++) { col(b, G, b.left + 18 + i * (b.right - b.left - 36) / 6, 34 + (i % 3) * 22, 22, 2); } yield* wait(92);
            ring(b, G, 14, 92, 0.1, { r: 5 }); yield* rest(b, G, 46);
            const s = G.H.x < cx ? 1 : -1;
            yield* glide(b, cx + s * 150, b.floorY - b.h / 2, 26); yield* tele(b, G, 26);
            b.fly = false; yield* charge(b, G, 300, -s); waves(b, G, 150, 16); yield* rest(b, G, 64); b.fly = true;
            if (b.hp < b.max * 0.66) { yield* glide(b, cx, top, 24); yield* tele(b, G, 20); for (let i = 0; i < 3; i++) { ring(b, G, 12, 100, i * 0.26, { r: 5 }); zap({ r: 8 }); yield* wait(32); } yield* rest(b, G, 36); }
            if (b.hp < b.max * 0.33) { yield* tele(b, G, 18); for (let i = 0; i < 12; i++) { col(b, G, G.H.x + ((i * 37) % 70) - 35, 30, 20, 2); yield* wait(10); } yield* rest(b, G, 50); }
        }
    },
};

const BOSS_DEF = {
    tartar: { hp: 14, w: 56, h: 50, sprite: "boss_tartar", size: 84, color: "#e9d48a" }, bear: { hp: 16, w: 70, h: 62, sprite: "boss_bear", size: 96, color: "#cfe6ff" },
    queen: { hp: 24, w: 60, h: 66, sprite: "boss_queen", size: 96, color: "#ff9df5" }, bud: { hp: 22, w: 56, h: 84, sprite: "boss_bud", size: 110, color: "#ffb3c1" },
    bog: { hp: 34, w: 92, h: 56, sprite: "boss_bog", size: 110, color: "#b6f03c" }, nerve: { hp: 28, w: 62, h: 62, sprite: "boss_nerve", size: 110, color: "#ffe066" },
    twins: { hp: 26, w: 84, h: 72, sprite: "boss_twins", size: 110, color: "#ff8fab" }, uvula: { hp: 38, w: 56, h: 70, sprite: "boss_uvula", size: 110, color: "#ff7aa0" },
    reflux: { hp: 44, w: 84, h: 72, sprite: "boss_reflux", size: 116, color: "#e8f03c" }, ache: { hp: 46, w: 76, h: 84, sprite: "boss_ache", size: 124, color: "#ff6a3c" },
};

export function startBoss(G, name, e) {
    const q = BOSS_DEF[name], R = G.room;
    const hard = G.sv.hard ? 1.35 : 1;
    const b = { name, ...q, hp: Math.round(q.hp * hard), max: Math.round(q.hp * hard), left: R.x + 48, right: R.x + R.w - 48, ceilY: R.y + 48, floorY: R.y + R.h - 48, t: 0, face: -1, frame: 0, sx: 1, sy: 1, ox: 0, flash: 0, dazed: false, fly: false };
    b.x = e ? Math.max(b.left + b.w / 2, Math.min(b.right - b.w / 2, e.x)) : (b.left + b.right) / 2;
    b.y = b.floorY - b.h / 2;
    b.script = SCRIPTS[name](b, G);
    return b;
}

export function updateBoss(G) {
    const b = G.boss;
    if (!b) return;
    b.t++;
    if (b.flash > 0) b.flash--;
    b.sx += (1 - b.sx) * 0.14; b.sy += (1 - b.sy) * 0.14;
    b.script.next();
    if (b.hung) b.frame = Math.abs(Math.sin(b.t / 34)) > 0.7 ? 1 : 0;
    const H = G.H;
    if (!b.ghost && !b.dazed && b.frame !== 1 && Math.abs(H.x - b.x) < b.w / 2 + 2 && Math.abs(H.y - b.y) < b.h / 2 + 4) G.hurt(1, b.x);
}

export function drawBoss(G, d) {
    const b = G.boss;
    if (!b) return;
    const bob = b.fly ? Math.sin(b.t / 16) * 3 : 0, size = b.size;
    if (b.hung) d.rect(10, b.y - G.room.y, { x: (b.x + (b.left + b.right) / 2) / 2, y: (b.y + G.room.y) / 2, color: "#7a1636", radius: 5 });
    if (!b.submerged) d.sprite("glow", { x: b.x, y: b.floorY + 2, width: b.w * 1.4, height: 16, color: "#000000", opacity: 0.45 });
    d.sprite(b.sprite, { x: b.x + b.ox, y: b.y + bob + (size * b.sy - size) * -0.5 - (size - b.h) * 0.42, width: size * b.sx, height: size * b.sy, frame: b.flash > 0 ? 2 : b.frame, flipX: b.face > 0, color: b.flash > 0 ? "#ffffff" : b.ghost ? "#ffffff66" : "#ffffff" });
    if (b.flash > 2) d.additive(() => d.sprite(b.sprite, { x: b.x + b.ox, y: b.y + bob - (size - b.h) * 0.42, width: size * b.sx, height: size * b.sy, frame: 2, flipX: b.face > 0, opacity: 0.55 }));
}
