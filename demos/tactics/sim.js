// Squad Goals rules. No randomness and no drawing: the same moves always give the same battle, in the game and in the bots.
// A battle is a plain object. `apply*` mutate it and append to s.ev, which the stage animates and the preview reads.
import { ENEMIES, PIGEONS, PROPS } from "./data.js";

export const N = 8;
export const T = { GRASS: 0, PATH: 1, WATER: 2, HEDGE: 3, STONE: 4, SLICK: 5, SPIKE: 6, VOID: 7, HEDGE1: 8 };
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const idx = (x, y) => y * N + x;
export const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
export const isSolid = (t) => t === T.HEDGE || t === T.HEDGE1 || t === T.STONE;
const isOpen = (t) => !isSolid(t) && t !== T.WATER && t !== T.VOID;

export const at = (s, x, y) => {
    for (let i = 0; i < s.units.length; i++) { const u = s.units[i]; if (u.x === x && u.y === y && u.hp > 0) return u; }
    return null;
};
export const byId = (s, id) => s.units.find((u) => u.id === id) ?? null;
export const pigeons = (s) => s.units.filter((u) => u.side === 0 && u.hp > 0);
export const foes = (s) => s.units.filter((u) => u.side === 1 && u.hp > 0 && !u.env);
const ev = (s, e) => { if (s.ev) s.ev.push(e); };

export function makeUnit(s, spec) {
    const id = s.nextId++;
    const base = { id, k: spec.k, side: 2, x: spec.x, y: spec.y, hp: 1, mhp: 1, sh: 0, soak: 0, stun: 0, mv: 0, moved: false, acted: false, fly: false, ground: false, anchored: false, intent: null, ord: 0, up: spec.up ?? {}, dir: spec.dir ?? 2 };
    if (spec.side === 0) {
        const p = PIGEONS[spec.k], up = base.up;
        const hp = spec.hp ?? (p.hp + (up.hp ? 1 : 0));
        Object.assign(base, { side: 0, hp, mhp: p.hp + (up.hp ? 1 : 0), mv: p.mv + (up.mv ? 1 : 0), fly: !!p.fly, sh: up.armor ? 1 : 0, npc: !!p.npc });
    } else if (spec.side === 1) {
        const e = ENEMIES[spec.k], hp = spec.hp ?? e.hp;
        Object.assign(base, { side: 1, hp, mhp: hp, mv: e.mv, fly: !!e.fly, ground: !!e.ground, env: !!e.env, boss: !!e.boss, anchored: !!e.env });
    } else {
        const p = PROPS[spec.k], hp = spec.hp ?? p.hp;
        Object.assign(base, { hp, mhp: hp, anchored: !!p.anchored, keep: !!p.keep, indestructible: !!p.indestructible });
    }
    s.units.push(base);
    return base;
}

/** Build a battle from a mission and a squad [{k, up, hp}]. Squad members fill deploy tiles in order. */
export function newBattle(m, squad) {
    const s = {
        tiles: m.tiles.slice(), units: [], nextId: 1, round: 0, ev: null, over: null, m,
        crumbs: m.crumbs ? m.crumbs.slice() : [], perch: m.perch ? m.perch.slice() : [], exit: m.exit ?? null, pending: [], perchScore: 0,
        stats: { damage: 0, lost: 0, bagHits: 0, chain: 0, ff: 0, kills: 0, hazard: 0 }, action: 0, chain: 0, depth: 0, phase: "plan",
    };
    squad.slice(0, m.deploy.length).forEach((p, i) => makeUnit(s, { side: 0, k: p.k, up: p.up, hp: p.hp, x: m.deploy[i][0], y: m.deploy[i][1], dir: 0 }));
    for (const r of m.reg ?? []) makeUnit(s, { side: 0, k: "reg", x: r[0], y: r[1] });
    for (const p of m.props ?? []) makeUnit(s, { side: 2, k: p[0], x: p[1], y: p[2], hp: p[3] });
    for (const e of m.foes ?? []) makeUnit(s, { side: 1, k: e[0], x: e[1], y: e[2], hp: e[3] ?? vetHp(m, e[0]) });
    beginRound(s);
    return s;
}

/** Later zones field veterans: same bird, more stubborn. */
const vetHp = (m, k) => { const e = ENEMIES[k]; return e.boss || e.env ? undefined : e.hp + (m.vet ?? 0); };

export function clone(s) {
    const c = { ...s };
    c.tiles = s.tiles.slice();
    c.crumbs = s.crumbs.slice();
    c.pending = s.pending.map((p) => ({ ...p }));
    c.stats = { ...s.stats };
    c.units = s.units.map((u) => ({ ...u, intent: u.intent ? { ...u.intent } : null }));
    c.ev = null;
    return c;
}

// ---- Damage, shoves, and everything that follows from them ----

function kill(s, u, how, src) {
    u.hp = 0; u.intent = null;
    ev(s, { t: "die", id: u.id, how, x: u.x, y: u.y, k: u.k });
    s.chain++;
    if (s.chain > s.stats.chain) s.stats.chain = s.chain;
    if (u.side === 0) s.stats.lost++;
    if (u.side === 1) { s.stats.kills++; if (how !== "hit") s.stats.hazard++; if (src && src.side === 1) s.stats.ff++; }
    if (u.k === "can") boom(s, u.x, u.y, 1);
    else if (u.k === "nutcase") boom(s, u.x, u.y, 2);
}

export function damage(s, u, n, src, how = "hit") {
    if (u.hp <= 0 || u.indestructible) return;
    if (u.sh > 0) { u.sh--; ev(s, { t: "block", id: u.id }); return; }
    if (u.env) return;
    if (u.boss && how !== "drown") {              // bosses shrug off big hits: one point per action, however clever
        if (u.hitAt === s.action) return;
        u.hitAt = s.action; n = 1;
    }
    n = Math.min(n, u.hp);
    u.hp -= n;
    if (u.side === 0) s.stats.damage += n;
    if (u.keep) s.stats.bagHits += n;
    if (src && src.side === 1 && u.side === 1) s.stats.ff++;
    ev(s, { t: "dmg", id: u.id, n, hp: u.hp, x: u.x, y: u.y });
    if (u.hp <= 0) kill(s, u, how, src);
}

function hitTile(s, x, y, src) {
    const t = s.tiles[idx(x, y)];
    if (t === T.HEDGE) { s.tiles[idx(x, y)] = T.HEDGE1; ev(s, { t: "tile", x, y, v: T.HEDGE1 }); }
    else if (t === T.HEDGE1) { s.tiles[idx(x, y)] = T.GRASS; ev(s, { t: "tile", x, y, v: T.GRASS }); }
}

function shock(s, drum) {
    if (drum.rang === s.action) return;
    drum.rang = s.action;
    ev(s, { t: "shock", id: drum.id, x: drum.x, y: drum.y });
    for (let d = 0; d < 4; d++) {
        const o = at(s, drum.x + DIRS[d][0], drum.y + DIRS[d][1]);
        if (o) push(s, o, d, 1, drum);
    }
}

function boom(s, x, y, dmg) {
    ev(s, { t: "boom", x, y, dmg });
    if (s.depth > 12) return;
    s.depth++;
    for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inB(nx, ny)) continue;
        hitTile(s, nx, ny);
        const o = at(s, nx, ny);
        if (!o) continue;
        if (o.k === "drum") { shock(s, o); continue; }
        damage(s, o, dmg, null, "boom");
        if (o.hp > 0) push(s, o, d, 1, null);
    }
    s.depth--;
}

/** Called when a shove or a move lands a unit on a tile. */
function landed(s, u, shoved) {
    if (u.hp <= 0) return false;
    const i = idx(u.x, u.y), t = s.tiles[i];
    if (u.side === 0) {
        const c = s.crumbs.indexOf(i);
        if (c >= 0 && !u.npc) { s.crumbs.splice(c, 1); ev(s, { t: "crumb", x: u.x, y: u.y, id: u.id }); if (u.hp < u.mhp) { u.hp++; ev(s, { t: "heal", id: u.id, n: 1, hp: u.hp }); } }
    }
    if (t === T.WATER) {
        if (u.boss) { u.intent = null; u.ord = 0; ev(s, { t: "soak", id: u.id }); if (u.ground) { s.stats.hazard++; damage(s, u, 2, null, "drown"); } return u.hp > 0; }
        if (u.ground || u.side === 2) { ev(s, { t: "drown", id: u.id }); kill(s, u, "drown"); return false; }
        if (shoved && !u.env) {
            if (u.side === 1) { u.intent = null; u.ord = 0; } else u.soak = 2;   // pigeons lose their next action
            ev(s, { t: "soak", id: u.id });
        }
    } else if (t === T.VOID) {
        if (u.ground || u.side === 2) { ev(s, { t: "fall", id: u.id }); kill(s, u, "fall"); return false; }
    } else if (t === T.SPIKE && shoved) {
        damage(s, u, 2, null, "spike");
        return u.hp > 0;
    }
    return true;
}

/** Shove `u` in dir `d`. Blocked shoves bump: 1 damage to each thing involved. */
export function push(s, u, d, n, src) {
    if (u.hp <= 0) return;
    if (u.anchored) { if (u.k === "drum") shock(s, u); return; }
    if (s.depth > 12) return;
    s.depth++;
    const [dx, dy] = DIRS[d];
    for (let i = 0; i < n; i++) {
        const nx = u.x + dx, ny = u.y + dy;
        if (!inB(nx, ny)) {
            if (s.m.ledge && u.ground) { ev(s, { t: "push", id: u.id, x: u.x + dx * 0.7, y: u.y + dy * 0.7, d, fall: true }); ev(s, { t: "fall", id: u.id }); kill(s, u, "fall", src); s.depth--; return; }
            if (s.m.ledge) { ev(s, { t: "bump", id: u.id, d, x: u.x, y: u.y, wall: true }); break; }
            ev(s, { t: "bump", id: u.id, d, x: u.x, y: u.y, wall: true });
            damage(s, u, 1, src, "bump");
            break;
        }
        const t = s.tiles[idx(nx, ny)];
        if (isSolid(t)) {
            ev(s, { t: "bump", id: u.id, d, x: u.x, y: u.y, wall: true });
            hitTile(s, nx, ny);
            damage(s, u, 1, src, "bump");
            break;
        }
        const o = at(s, nx, ny);
        if (o) {
            ev(s, { t: "bump", id: u.id, d, x: u.x, y: u.y, other: o.id });
            damage(s, u, 1, src, "bump");
            if (o.k === "drum") shock(s, o); else damage(s, o, 1, src, "bump");
            break;
        }
        u.x = nx; u.y = ny;
        ev(s, { t: "push", id: u.id, x: nx, y: ny, d });
        if (!landed(s, u, true)) break;
        if (s.tiles[idx(nx, ny)] === T.SLICK && i === n - 1) n++;   // keep sliding
    }
    s.depth--;
}

function arcHit(s, x, y, dmg, src, pushEdges = true, center = true) {
    if (!inB(x, y)) return;
    hitTile(s, x, y);
    const c = at(s, x, y);
    if (c && center) { if (c.k === "drum") shock(s, c); else damage(s, c, dmg, src); }
    if (!pushEdges) return;
    // Far side first, so neighbours shoved the same way don't bump for no reason.
    for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (!inB(nx, ny)) continue;
        const o = at(s, nx, ny);
        if (o) push(s, o, d, 1, src);
    }
}

// ---- Enemy attacks. An intent is relative to the enemy, so shoving an enemy moves its attack too. ----

/** First thing along a line from (x,y): { x, y, unit, solid, steps } or null. */
function lineHit(s, x, y, d, range) {
    const [dx, dy] = DIRS[d];
    for (let i = 1; i <= range; i++) {
        const nx = x + dx * i, ny = y + dy * i;
        if (!inB(nx, ny)) return { x: x + dx * (i - 1), y: y + dy * (i - 1), edge: true, steps: i - 1 };
        const u = at(s, nx, ny);
        if (u) return { x: nx, y: ny, unit: u, steps: i };
        if (isSolid(s.tiles[idx(nx, ny)])) return { x: nx, y: ny, solid: true, steps: i };
    }
    return null;
}

/** The tiles an intent will strike, in the unit's current position. */
export function intentTiles(s, u) {
    const it = u.intent, out = [];
    if (!it) return out;
    const [dx, dy] = DIRS[it.dir ?? 0];
    switch (it.type) {
        case "melee": out.push([u.x + dx, u.y + dy]); break;
        case "wide": { const px = dy, py = dx; for (const o of [-1, 0, 1]) out.push([u.x + dx + px * o, u.y + dy + py * o]); break; }
        case "line": case "dive": { const h = lineHit(s, u.x, u.y, it.dir, it.range ?? 8); if (h && !h.edge) out.push([h.x, h.y]); else if (h) out.push([h.x, h.y]); break; }
        case "cross": for (const d of [it.dir, (it.dir + 2) % 4]) { const h = lineHit(s, u.x, u.y, d, it.range ?? 8); if (h && !h.edge) out.push([h.x, h.y]); } break;
        case "lob": out.push([u.x + it.dx, u.y + it.dy]); break;
        case "blast": for (const [a, b] of DIRS) out.push([u.x + a, u.y + b]); break;
        case "spray": { for (let i = 1; i <= (it.range ?? 8); i++) { const nx = u.x + dx * i, ny = u.y + dy * i; if (!inB(nx, ny) || isSolid(s.tiles[idx(nx, ny)])) break; out.push([nx, ny]); } break; }
    }
    return out.filter(([x, y]) => inB(x, y));
}

function strike(s, x, y, dmg, src, pushDir, pushN) {
    if (!inB(x, y)) return;
    hitTile(s, x, y);
    const o = at(s, x, y);
    if (!o) return;
    if (o.k === "drum") { shock(s, o); return; }
    damage(s, o, dmg, src);
    if (o.hp > 0 && pushN) push(s, o, pushDir, pushN, src);
}

function execute(s, u) {
    const it = u.intent;
    if (!it || u.hp <= 0) return;
    s.action++; s.chain = 0;
    const [dx, dy] = DIRS[it.dir ?? 0];
    u.dir = it.dir ?? u.dir;
    ev(s, { t: "attack", id: u.id, type: it.type, dir: it.dir, x: u.x, y: u.y, tiles: intentTiles(s, u), dmg: it.dmg });
    switch (it.type) {
        case "melee": strike(s, u.x + dx, u.y + dy, it.dmg, u, it.dir, it.push ?? 0); break;
        case "line": { const h = lineHit(s, u.x, u.y, it.dir, it.range ?? 8); if (h && !h.edge) strike(s, h.x, h.y, it.dmg, u, it.dir, 0); break; }
        case "cross": for (const d of [it.dir, (it.dir + 2) % 4]) { const h = lineHit(s, u.x, u.y, d, it.range ?? 8); if (h && !h.edge) strike(s, h.x, h.y, it.dmg, u, d, 0); } break;
        case "wide": for (const [x, y] of intentTiles(s, u)) strike(s, x, y, it.dmg, u, it.dir, 1); break;
        case "lob": arcHit(s, u.x + it.dx, u.y + it.dy, it.dmg, u); break;
        case "dive": {
            const h = lineHit(s, u.x, u.y, it.dir, 8);
            if (!h) break;
            const steps = h.edge ? h.steps : h.steps - 1;
            const fromX = u.x, fromY = u.y;
            u.x += dx * steps; u.y += dy * steps;
            ev(s, { t: "dive", id: u.id, x: u.x, y: u.y, fx: fromX, fy: fromY, d: it.dir });
            if (!h.edge) strike(s, h.x, h.y, it.dmg, u, it.dir, 1);
            break;
        }
        case "blast": { u.hp = 0; u.intent = null; ev(s, { t: "die", id: u.id, how: "blast", x: u.x, y: u.y, k: u.k }); boom(s, u.x, u.y, it.dmg); break; }
        case "spray": { const ts = intentTiles(s, u).reverse(); for (const [x, y] of ts) { const o = at(s, x, y); if (o) push(s, o, it.dir, 1, u); } break; }
    }
    u.intent = null;
}

// ---- Enemy planning. Deterministic, and shown on the board before you move. ----

function reach(s, u, canEnd) {
    const seen = new Int8Array(N * N).fill(-1), list = [[u.x, u.y]];
    seen[idx(u.x, u.y)] = 0;
    for (let q = 0; q < list.length; q++) {
        const [x, y] = list[q], c = seen[idx(x, y)];
        if (c >= u.mv) continue;
        for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (!inB(nx, ny) || seen[idx(nx, ny)] >= 0) continue;
            const t = s.tiles[idx(nx, ny)];
            if (u.fly) { if (t === T.STONE) continue; }
            else {
                if (isSolid(t) || t === T.WATER || t === T.VOID || t === T.SPIKE) continue;
                const o = at(s, nx, ny);
                if (o && o.side !== u.side) continue;
            }
            seen[idx(nx, ny)] = c + 1;
            list.push([nx, ny]);
        }
    }
    return list.filter(([x, y]) => canEnd(x, y));
}

function targetValue(e, o) {
    if (!o) return 0;
    if (o.side === 0) return (o.npc ? 9 : 6) + (o.hp <= (e.dmg ?? 1) ? 2 : 0) + (o.sh ? -3 : 0);
    if (o.side === 1) return o.env ? 0 : -5;
    if (o.keep) return 8 * (e.bag ?? 1);
    if (o.k === "box") return 1.5;
    if (o.k === "can") return -1;
    return 0;
}

function intentOf(s, e, def, type, dir, dx = 0, dy = 0) {
    return { type, dir, dx, dy, dmg: def.dmg, push: def.push ?? 0, range: def.range ?? (type === "melee" ? 1 : 8) };
}

const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function scoreIntent(s, u, def) {
    let score = 0;
    const tiles = intentTiles(s, u);
    for (const [x, y] of tiles) {
        const o = at(s, x, y);
        score += targetValue(def, o);
        if (u.intent.type === "line" || u.intent.type === "dive") break;
    }
    if (u.intent.type === "lob") for (const [dx, dy] of DIRS) { const o = at(s, u.x + u.intent.dx + dx, u.y + u.intent.dy + dy); if (o && o.side !== 1) score += 0.5; }
    return score;
}

function planEnemy(s, u) {
    const def = ENEMIES[u.k];
    if (u.env) { const d = (u.dir + (s.round > 1 ? 1 : 0)) % 4; u.dir = d; u.intent = intentOf(s, u, def, "spray", d); return; }
    const type = def.intents ? def.intents[(s.round - 1) % def.intents.length] : def.intent;
    const targets = s.units.filter((o) => o.hp > 0 && (o.side === 0 || o.keep));
    const homeX = u.x, homeY = u.y;
    let best = null, bestScore = -1e9;
    const ends = reach(s, u, (x, y) => {
        if (x === homeX && y === homeY) return true;
        const t = s.tiles[idx(x, y)];
        if (at(s, x, y)) return false;
        if (s.pending.some((p) => p.x === x && p.y === y)) return false;
        return !(t === T.SPIKE || t === T.HEDGE || t === T.HEDGE1);
    });
    const tryAt = (x, y) => {
        u.x = x; u.y = y;
        let near = 99;
        for (const o of targets) near = Math.min(near, Math.abs(o.x - x) + Math.abs(o.y - y));
        const options = [];
        if (type === "lob") {
            for (let d = 0; d < 4; d++) for (let r = def.min; r <= def.max; r++) if (inB(x + DIRS[d][0] * r, y + DIRS[d][1] * r)) options.push(intentOf(s, u, def, "lob", d, DIRS[d][0] * r, DIRS[d][1] * r));
        } else if (type === "blast") options.push(intentOf(s, u, def, "blast", 0));
        else for (let d = 0; d < 4; d++) options.push(intentOf(s, u, def, type, d));
        for (const it of options) {
            u.intent = it;
            let sc = scoreIntent(s, u, def);
            if (sc <= 0) sc = -near * 0.6;              // nothing to hit: at least get closer
            else if (def.keep) sc += Math.min(near, def.keep + 1) * 0.3;
            sc -= (s.tiles[idx(x, y)] === T.WATER ? 0.2 : 0);
            sc -= (x + y * 8) * 0.0001 + (it.dir ?? 0) * 0.00001;   // stable tie-break
            if (sc > bestScore) { bestScore = sc; best = { x, y, it }; }
        }
    };
    for (const [x, y] of ends) tryAt(x, y);
    u.x = homeX; u.y = homeY; u.intent = null;
    if (!best) return;
    if (best.x !== homeX || best.y !== homeY) {
        const fx = u.x, fy = u.y;
        u.x = best.x; u.y = best.y;
        ev(s, { t: "emove", id: u.id, x: u.x, y: u.y, fx, fy });
    }
    u.intent = best.it; u.dir = best.it.dir ?? u.dir;
}

/** Start a round: everyone rested, enemies step and show their cards. */
export function beginRound(s) {
    s.round++;
    s.phase = "player"; s.chain = 0;
    const m = s.m;
    for (const u of s.units) {
        if (u.side === 0) {
            u.moved = false; u.acted = false;
            if (u.soak) u.soak--;
        }
    }
    // Who arrives at the end of this round is known now.
    for (const w of m.waves ?? []) if (w.round === s.round) for (const [k, x, y, hp] of w.units) s.pending.push({ k, x, y, hp });
    let ord = 1;
    for (const u of s.units.slice()) {
        if (u.side !== 1 || u.hp <= 0) continue;
        planEnemy(s, u);
        u.ord = u.intent ? ord++ : 0;
    }
    ev(s, { t: "round", round: s.round });
}

/** The enemy half of a round. Ends either with `s.over` set or with the next round planned. */
export function endTurn(s) {
    s.phase = "enemy";
    const m = s.m;
    const order = s.units.filter((u) => u.side === 1 && u.hp > 0 && u.intent).sort((a, b) => a.ord - b.ord);
    for (const u of order) {
        if (u.hp <= 0) continue;
        execute(s, u);
        if (checkOver(s)) return;
    }
    // The roundabout turns a quarter, clockwise.
    if (m.carousel) {
        const [cx, cy] = m.carousel, spots = [[cx, cy], [cx + 1, cy], [cx + 1, cy + 1], [cx, cy + 1]];
        const on = spots.map(([x, y]) => at(s, x, y));
        on.forEach((u, i) => { if (u && !u.anchored) { const [x, y] = spots[(i + 1) % 4]; u.x = x; u.y = y; ev(s, { t: "ride", id: u.id, x, y }); } });
    }
    const still = [];
    for (const p of s.pending) {
        const o = at(s, p.x, p.y);
        if (o) { ev(s, { t: "blocked", x: p.x, y: p.y, id: o.id }); damage(s, o, 1, null, "bump"); still.push(p); continue; }
        const u = makeUnit(s, { side: 1, k: p.k, x: p.x, y: p.y, hp: p.hp ?? vetHp(m, p.k) });
        ev(s, { t: "spawn", id: u.id, k: u.k, x: p.x, y: p.y });
    }
    s.pending = still;
    if (m.win === "perch") for (const [x, y] of (s.perch ?? []).map((i) => [i % N, Math.floor(i / N)])) {
        const u = at(s, x, y);
        if (u && u.side === 0) { s.perchScore++; ev(s, { t: "perch", x, y, n: s.perchScore }); }
    }
    if (checkOver(s)) return;
    if (s.round >= m.rounds) {
        if (m.win === "survive") { s.over = "win"; ev(s, { t: "win" }); }
        else { s.over = "lose"; s.why = "time"; ev(s, { t: "lose", why: "time" }); }
        return;
    }
    beginRound(s);
}

/** Win or lose checks that can fire at any moment. */
export function checkOver(s) {
    if (s.over) return true;
    const m = s.m;
    const lose = (why) => { s.over = "lose"; s.why = why; ev(s, { t: "lose", why }); return true; };
    const keeps = s.units.filter((u) => u.keep);
    if (keeps.length) {
        const alive = keeps.filter((u) => u.hp > 0).length;
        if (alive < (m.minKeep ?? keeps.length)) return lose("bag");
    }
    if (s.units.some((u) => u.npc && u.hp <= 0)) return lose("reg");
    if (!s.units.some((u) => u.side === 0 && !u.npc && u.hp > 0)) return lose("squad");
    const win = () => { s.over = "win"; ev(s, { t: "win" }); return true; };
    const wavesLeft = (m.waves ?? []).some((w) => w.round > s.round) || s.pending.length > 0;
    if (m.win === "rout" && !wavesLeft && foes(s).length === 0) return win();
    if (m.win === "boss" && !s.units.some((u) => u.boss && u.hp > 0)) return win();
    if (m.win === "escort" && s.units.some((u) => u.npc && u.hp > 0 && idx(u.x, u.y) === s.exit)) return win();
    if (m.win === "collect" && s.crumbs.length === 0) return win();
    if (m.win === "perch" && s.perchScore >= m.goal) return win();
    return false;
}

// ---- Pigeon moves ----

export function moveTiles(s, u) {
    if (u.moved || u.acted || u.side !== 0) return [];
    const blockers = (x, y) => { const o = at(s, x, y); return o && o.side !== 0; };
    const seen = new Int8Array(N * N).fill(-1), list = [[u.x, u.y]], from = new Int16Array(N * N).fill(-1);
    seen[idx(u.x, u.y)] = 0;
    const mv = u.soak ? Math.min(1, u.mv) : u.mv;
    for (let q = 0; q < list.length; q++) {
        const [x, y] = list[q], c = seen[idx(x, y)];
        if (c >= mv) continue;
        for (const [dx, dy] of DIRS) {
            const nx = x + dx, ny = y + dy;
            if (!inB(nx, ny) || seen[idx(nx, ny)] >= 0) continue;
            const t = s.tiles[idx(nx, ny)];
            if (u.fly) { if (t === T.STONE) continue; }
            else if (isSolid(t) || t === T.WATER || t === T.VOID || t === T.SPIKE || blockers(nx, ny)) continue;
            seen[idx(nx, ny)] = c + 1;
            from[idx(nx, ny)] = idx(x, y);
            list.push([nx, ny]);
        }
    }
    const res = [];
    for (let q = 1; q < list.length; q++) {
        const [x, y] = list[q], t = s.tiles[idx(x, y)];
        if (at(s, x, y) || !isOpen(t) || t === T.SPIKE) continue;
        const path = [];
        for (let i = idx(x, y); i !== idx(u.x, u.y) && i >= 0; i = from[i]) path.unshift([i % N, Math.floor(i / N)]);
        res.push({ x, y, path });
    }
    return res;
}

export function applyMove(s, u, x, y) {
    const opt = moveTiles(s, u).find((o) => o.x === x && o.y === y);
    if (!opt) return false;
    s.action++; s.chain = 0;
    ev(s, { t: "move", id: u.id, fx: u.x, fy: u.y, path: opt.path });
    u.x = x; u.y = y; u.moved = true;
    landed(s, u, false);
    checkOver(s);
    return true;
}

const manhattan = (a, b, x, y) => Math.abs(a - x) + Math.abs(b - y);
const lineTargets = (u, min, max) => {
    const out = [];
    for (let d = 0; d < 4; d++) for (let r = min; r <= max; r++) { const x = u.x + DIRS[d][0] * r, y = u.y + DIRS[d][1] * r; if (inB(x, y)) out.push([x, y]); }
    return out;
};
const adj = (u) => DIRS.map(([a, b]) => [u.x + a, u.y + b]).filter(([x, y]) => inB(x, y));
const dirTo = (u, x, y) => { const a = x - u.x, b = y - u.y; return Math.abs(a) >= Math.abs(b) ? (a > 0 ? 1 : 3) : (b > 0 ? 2 : 0); };

/** Abilities. `aim: "dir"` means any tile in that direction fires it; targets are then the 4 neighbours. */
export const ACTS = {
    slap: {
        aim: "tile",
        targets: (s, u) => adj(u).filter(([x, y]) => at(s, x, y) || isSolid(s.tiles[idx(x, y)])),
        run(s, u, x, y) { const d = dirTo(u, x, y); ev(s, { t: "act", id: u.id, act: "slap", d, x, y }); strike(s, x, y, u.up.dmg ? 3 : 2, u, d, u.up.far ? 2 : 1); },
    },
    drop: {
        aim: "tile",
        targets: (s, u) => lineTargets(u, 2, u.up.far ? 7 : 5),
        run(s, u, x, y) { ev(s, { t: "act", id: u.id, act: "drop", d: dirTo(u, x, y), x, y }); arcHit(s, x, y, u.up.dmg ? 2 : 1, u); },
    },
    flap: {
        aim: "dir", reach: (u) => (u.up.far ? 5 : 3),
        targets: (s, u) => adj(u),
        run(s, u, x, y) {
            const d = dirTo(u, x, y), r = u.up.far ? 5 : 3, [dx, dy] = DIRS[d];
            ev(s, { t: "act", id: u.id, act: "flap", d, x, y });
            let end = 0;
            for (let i = 1; i <= r; i++) { const a = u.x + dx * i, b = u.y + dy * i; if (!inB(a, b) || isSolid(s.tiles[idx(a, b)])) break; end = i; }
            const hit = [];
            for (let i = end; i >= 1; i--) { const o = at(s, u.x + dx * i, u.y + dy * i); if (o) hit.push(o); }
            for (const o of hit) { if (o.hp <= 0) continue; if (u.up.dmg && o.side === 1) { o.intent = null; o.ord = 0; } push(s, o, d, 1, u); }
        },
    },
    slide: {
        aim: "dir", reach: () => 7,
        targets: (s, u) => adj(u),
        run(s, u, x, y) {
            const d = dirTo(u, x, y), [dx, dy] = DIRS[d], h = lineHit(s, u.x, u.y, d, 8);
            const steps = h ? (h.edge ? h.steps : h.steps - 1) : 0;
            let k = 0, pass = true;
            for (; k < steps; k++) { const t = s.tiles[idx(u.x + dx * (k + 1), u.y + dy * (k + 1))]; if (t === T.WATER || t === T.VOID) { pass = false; break; } }
            const fx = u.x, fy = u.y;
            u.x += dx * k; u.y += dy * k;
            ev(s, { t: "act", id: u.id, act: "slide", d, x: u.x, y: u.y, fx, fy });
            landed(s, u, false);
            if (pass && h && !h.edge) strike(s, h.x, h.y, u.up.dmg ? 3 : 2, u, d, 1);
        },
    },
    swap: {
        aim: "tile",
        targets: (s, u) => lineTargets(u, 1, u.up.far ? 6 : 4).filter(([x, y]) => { const o = at(s, x, y); return o && !o.anchored; }),
        run(s, u, x, y) {
            const o = at(s, x, y);
            ev(s, { t: "act", id: u.id, act: "swap", d: dirTo(u, x, y), x, y, fx: u.x, fy: u.y, other: o.id });
            const ax = u.x, ay = u.y;
            u.x = x; u.y = y; o.x = ax; o.y = ay;
            if (u.up.dmg && o.side === 1) { o.intent = null; o.ord = 0; }
            landed(s, o, true);
            landed(s, u, false);
        },
    },
    hook: {
        aim: "dir", reach: () => 6,
        targets: (s, u) => adj(u).filter(([x, y]) => { const h = lineHit(s, u.x, u.y, dirTo(u, x, y), 6); return h && h.unit && h.steps >= 2 && !h.unit.anchored; }),
        run(s, u, x, y) {
            const d = dirTo(u, x, y), h = lineHit(s, u.x, u.y, d, 6);
            ev(s, { t: "act", id: u.id, act: "hook", d, x: h.x, y: h.y });
            const o = h.unit;
            if (u.up.far && o.side === 1) { o.intent = null; o.ord = 0; }
            push(s, o, (d + 2) % 4, h.steps - 1, null);
            if (o.hp > 0) damage(s, o, u.up.dmg ? 2 : 1, u);
        },
    },
    patch: {
        aim: "tile",
        targets: (s, u) => { const r = u.up.far ? 5 : 3; return s.units.filter((o) => o.hp > 0 && (o.side === 0 || o.keep) && manhattan(u.x, u.y, o.x, o.y) <= r).map((o) => [o.x, o.y]); },
        run(s, u, x, y) {
            const o = at(s, x, y);
            ev(s, { t: "act", id: u.id, act: "patch", d: dirTo(u, x, y), x, y });
            const n = Math.min(u.up.dmg ? 2 : 1, o.mhp - o.hp);
            if (n > 0) { o.hp += n; ev(s, { t: "heal", id: o.id, n, hp: o.hp }); }
            o.sh = Math.min(1, o.sh + 1);
            ev(s, { t: "shield", id: o.id });
        },
    },
    box: {
        aim: "tile",
        targets(s, u) {
            const r = u.up.far ? 4 : 2, out = [];
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
                const m = manhattan(u.x, u.y, x, y);
                if (m >= 1 && m <= r && !at(s, x, y) && isOpen(s.tiles[idx(x, y)]) && s.tiles[idx(x, y)] !== T.SPIKE) out.push([x, y]);
            }
            return out;
        },
        run(s, u, x, y) {
            ev(s, { t: "act", id: u.id, act: "box", d: dirTo(u, x, y), x, y });
            const b = makeUnit(s, { side: 2, k: u.up.dmg ? "can" : "box", x, y });
            ev(s, { t: "appear", id: b.id, k: b.k, x, y });
        },
    },
};

export function canAct(s, u) {
    if (!u || u.acted || u.side !== 0 || u.soak || u.npc || s.over) return false;
    const a = PIGEONS[u.k].act;
    return !!a;
}

export function actTargets(s, u) {
    if (!canAct(s, u)) return [];
    return ACTS[PIGEONS[u.k].act].targets(s, u);
}

export function applyAct(s, u, x, y) {
    if (!canAct(s, u)) return false;
    const act = ACTS[PIGEONS[u.k].act];
    if (!act.targets(s, u).some((t) => t[0] === x && t[1] === y)) return false;
    s.action++; s.chain = 0;
    act.run(s, u, x, y);
    u.acted = true; u.moved = true;
    checkOver(s);
    return true;
}

/** A forecast of the enemy half, with the event list, from the current position. */
export function forecast(s) {
    const c = clone(s);
    c.ev = [];
    const before = c.round;
    const m = { ...c.m };
    c.m = m;
    // Stop at the end of attacks: no planning, no arrivals.
    const order = c.units.filter((u) => u.side === 1 && u.hp > 0 && u.intent).sort((a, b) => a.ord - b.ord);
    for (const u of order) { if (u.hp > 0) execute(c, u); }
    checkOver(c);
    void before;
    return c;
}

/** Stars earned for a finished battle. */
export function starsFor(s) {
    const out = [s.over === "win"];
    for (const b of s.m.stars ?? []) out.push(s.over === "win" && bonusMet(s, b));
    return out;
}

export function bonusMet(s, b) {
    const st = s.stats;
    switch (b.k) {
        case "noLoss": return st.lost === 0;
        case "noDmg": return st.damage <= (b.n ?? 0);
        case "fast": return s.round <= b.n;
        case "bag": return st.bagHits === 0;
        case "chain": return st.chain >= b.n;
        case "ff": return st.ff >= (b.n ?? 1);
        case "hazard": return st.hazard >= b.n;
        case "kills": return st.kills >= b.n;
        default: return false;
    }
}

export const BONUS_TEXT = {
    noLoss: () => "No pigeon lost", noDmg: (b) => (b.n ? `Take ${b.n} damage or less` : "Take no damage"), fast: (b) => `Win by round ${b.n}`,
    bag: () => "Bread never touched", chain: (b) => `Chain ${b.n} knockouts in one go`, ff: () => "Make enemies hit each other",
    hazard: (b) => `${b.n} terrain knockouts`, kills: (b) => `Knock out ${b.n} enemies`,
};
