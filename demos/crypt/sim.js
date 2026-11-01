// The rules of the game, with no Pogo in sight. A state is one flat Int8Array, so the search bots can
// clone and hash millions of them. Everything is deterministic: same state, same action, same result.

export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up right down left
export const WAIT = 4;

// Terrain
export const T = { FLOOR: 0, WALL: 1, PIT: 2, ICE: 3, LAVA: 4, SPIKE0: 5, SPIKE1: 6, SPIKE2: 7, PLATE: 8, DOOR: 9, EXIT: 10, PORTAL: 11, RUBBLE: 12 };
// Things sitting on terrain
export const O = { NONE: 0, CRATE: 1, KEG: 2, COIN: 3, TICKET: 4, TEA: 5, PILLAR: 6, SNOOZE: 7, MARK: 8 };
// Monsters
export const M = { NONE: 0, GHOUL: 1, SPITTER: 2, CRAB: 3, MIRROR: 4, BULL: 5, IMP: 6, HORSE: 7, PHANTOM: 8, CURATOR: 9, LATHER: 10, CHEF: 11, LANDLORD: 12, MONDAY: 13 };
export const isBoss = (t) => t >= M.CURATOR;

// Header layout
export const H = { P: 0, HP: 1, TICK: 2, FLAGS: 3, CHARGES: 4, COINS: 5, KILLS: 6, BOSS: 7, SHUSH: 8, SHIELD: 9, LAST: 10, WON: 11, HITS: 12, SPARE: 13 };
export const FLAG_TICKET = 1;
export const MON0 = 14, MSIZE = 6, MAXMON = 8;
export const F = { TYPE: 0, POS: 1, HP: 2, STUN: 3, DIR: 4, TIMER: 5 };
export const TER0 = MON0 + MSIZE * MAXMON;

/** Static facts about a floor: never changes during play, so states stay small. */
export function makeFloor(def) {
    const { w, h } = def, n = w * h;
    const portals = new Int16Array(n).fill(-1);
    const list = def.portals ?? [];
    for (let i = 0; i + 1 < list.length; i += 2) { portals[list[i]] = list[i + 1]; portals[list[i + 1]] = list[i]; }
    return { ...def, n, OBJ0: TER0 + n, size: TER0 + n * 2, portals, home: def.home ?? 0, snoozes: def.snoozes ?? [], ctx: def.ctx ?? BASE };
}
export const BASE = { stunBonus: 0, slamKills: false, noSpikes: false, cushion: false, dominoes: false };

export function makeState(fl, s0) {
    const s = new Int8Array(fl.size);
    s[H.P] = s0.p; s[H.HP] = s0.hp ?? 3; s[H.CHARGES] = s0.charges ?? 0; s[H.SHIELD] = s0.shield ?? 0; s[H.LAST] = -1; s[H.TICK] = s0.tick ?? 0;
    for (let i = 0; i < fl.n; i++) { s[TER0 + i] = fl.ter[i]; s[fl.OBJ0 + i] = fl.obj[i]; }
    (s0.mons ?? []).forEach((m, i) => { const o = MON0 + i * MSIZE; s[o] = m.t; s[o + 1] = m.p; s[o + 2] = m.hp ?? 1; s[o + 3] = m.stun ?? 0; s[o + 4] = m.dir ?? -1; s[o + 5] = m.timer ?? 0; });
    s[H.BOSS] = (s0.mons ?? []).reduce((a, m) => (isBoss(m.t) ? m.hp ?? 1 : a), 0);
    s[H.SPARE] = fl.hasDoors && platePressed(fl, s) ? 1 : 0;
    return s;
}

// ---------- small helpers ----------
const ter = (fl, s, i) => s[TER0 + i];
const obj = (fl, s, i) => s[fl.OBJ0 + i];
const setObj = (fl, s, i, v) => { s[fl.OBJ0 + i] = v; };
const setTer = (fl, s, i, v) => { s[TER0 + i] = v; };
export const stepFrom = (fl, i, d) => {
    const x = i % fl.w + DIRS[d][0], y = ((i / fl.w) | 0) + DIRS[d][1];
    return x < 0 || y < 0 || x >= fl.w || y >= fl.h ? -1 : y * fl.w + x;
};
const offset = (fl, i, dx, dy) => {
    const x = i % fl.w + dx, y = ((i / fl.w) | 0) + dy;
    return x < 0 || y < 0 || x >= fl.w || y >= fl.h ? -1 : y * fl.w + x;
};
export function monAt(s, i) {
    for (let o = MON0, k = 0; k < MAXMON; k++, o += MSIZE) if (s[o] && s[o + 1] === i) return o;
    return 0;
}
export const spikePhase = (s, t) => (s[H.TICK] + (t - T.SPIKE0)) % 3; // 0 down, 1 warning, 2 up
const isSpike = (t) => t >= T.SPIKE0 && t <= T.SPIKE2;
const spikeUp = (s, t) => isSpike(t) && spikePhase(s, t) === 2;

/** Doors stand open while anything rests on a pressure plate. */
function platePressed(fl, s) {
    for (let i = 0; i < fl.n; i++) {
        if (ter(fl, s, i) !== T.PLATE) continue;
        if (s[H.P] === i || monAt(s, i)) return true;
        const b = obj(fl, s, i);
        if (b === O.CRATE || b === O.KEG) return true;
    }
    return false;
}
export const doorsOpen = (fl, s) => platePressed(fl, s);
const doorClosed = (fl, s, i) => ter(fl, s, i) === T.DOOR && !platePressed(fl, s);
const solidObj = (b) => b === O.CRATE || b === O.KEG || b === O.PILLAR;

/** Blocks walking and shoving: walls, shut doors, heavy things. */
function solidAt(fl, s, i) {
    if (i < 0) return true;
    const t = ter(fl, s, i);
    if (t === T.WALL || t === T.EXIT) return true;
    if (t === T.DOOR && doorClosed(fl, s, i)) return true;
    return solidObj(obj(fl, s, i));
}
const hazard = (t) => t === T.PIT || t === T.LAVA;

export function gateOpen(fl, s) {
    if (fl.goal === "ticket") return (s[H.FLAGS] & FLAG_TICKET) !== 0;
    if (fl.goal === "boss") return s[H.BOSS] <= 0;
    for (let o = MON0, k = 0; k < MAXMON; k++, o += MSIZE) if (s[o]) return false;
    return true;
}

// ---------- damage and death ----------
function hurtPlayer(fl, s, ev, cause, from) {
    if (s[H.SHIELD] > 0) { s[H.SHIELD]--; if (ev) ev.push({ k: "shield", at: s[H.P], cause }); return; }
    s[H.HP]--; s[H.HITS]++;
    if (ev) ev.push({ k: "hurt", at: s[H.P], cause, from, snap: true });
    if (fl.ctx.cushion && s[H.HP] > 0) {
        for (let d = 0; d < 4; d++) {
            const n = stepFrom(fl, s[H.P], d); if (n < 0) continue;
            const m = monAt(s, n); if (m && !isBoss(s[m])) shove(fl, s, m, d, ev, true);
        }
    }
}

/** A monster dies. Bosses lose a heart and reset instead of vanishing. */
function killMon(fl, s, o, ev, how) {
    const t = s[o], at = s[o + 1];
    if (isBoss(t)) { hurtBoss(fl, s, o, ev, how); return; }
    s[o] = 0; s[H.KILLS]++;
    if (ev) ev.push({ k: "kill", at, t, how });
    if (t === M.IMP && s[o + 5] > 0) explode(fl, s, at, ev, true);
}

function hurtBoss(fl, s, o, ev, how) {
    s[o + 2]--; s[H.BOSS] = s[o + 2];
    if (ev) ev.push({ k: "bossHit", at: s[o + 1], t: s[o], how, hp: s[o + 2] });
    if (s[o + 2] <= 0) {
        const t = s[o], at = s[o + 1]; s[o] = 0;
        for (let q = MON0, k = 0; k < MAXMON; k++, q += MSIZE) if (s[q]) { if (ev) ev.push({ k: "kill", at: s[q + 1], t: s[q], how: "boss" }); s[q] = 0; }
        for (let i = 0; i < fl.n; i++) if (ter(fl, s, i) === T.DOOR) { setTer(fl, s, i, T.FLOOR); if (ev) ev.push({ k: "door", at: i, open: true }); }
        if (ev) ev.push({ k: "bossDead", at, t });
        return;
    }
    s[o + 3] = 1; s[o + 5] = 0;
    if (s[o] !== M.MONDAY) s[o + 4] = -1;
    if (s[o] === M.CURATOR) {
        if (s[H.P] !== fl.home && !monAt(s, fl.home)) { const from = s[o + 1]; s[o + 1] = fl.home; if (ev) ev.push({ k: "warp", from, to: fl.home, o }); }
        s[o + 3] = 2;
    }
}

/** Three by three. `spare` = "player" leaves you out of it (your own postcard, or Dominoes). */
function explode(fl, s, at, ev, spare) {
    if (ev) ev.push({ k: "boom", at });
    const queue = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const i = offset(fl, at, dx, dy); if (i < 0) continue;
        const b = obj(fl, s, i);
        if (b === O.KEG) { setObj(fl, s, i, O.NONE); if (i !== at) queue.push(i); }
        else if (b === O.CRATE) { setObj(fl, s, i, O.NONE); if (ev) ev.push({ k: "smash", at: i }); }
        else if (b === O.PILLAR) { setObj(fl, s, i, O.NONE); if (ev) ev.push({ k: "smash", at: i }); }
        const m = monAt(s, i);
        if (m) {
            if (isBoss(s[m]) && s[m] === M.LATHER) continue;
            if (s[m] === M.IMP && s[m + 5] > 0 && i === at) { s[m] = 0; s[H.KILLS]++; if (ev) ev.push({ k: "kill", at: i, t: M.IMP, how: "boom" }); continue; }
            killMon(fl, s, m, ev, "boom");
        }
        if (s[H.P] === i && spare !== "player") hurtPlayer(fl, s, ev, "boom", at);
    }
    for (const i of queue) explode(fl, s, i, ev, spare);
}

// ---------- shoving ----------
/** Pushes a monster one tile. Everything that makes the game fun lives here. */
function shove(fl, s, o, d, ev, quiet) {
    const from = s[o + 1], t = s[o];
    let at = from, slid = false;
    for (let guard = 0; guard < 16; guard++) {
        const n = stepFrom(fl, at, d);
        if (n >= 0) {
            const hit = monAt(s, n);
            if (hit) {
                if (ev) ev.push({ k: "shove", o, t, from, to: at, d });
                s[o + 1] = at;
                if (ev) ev.push({ k: "bonk", at: n, a: t, b: s[hit] });
                const dom = fl.ctx.dominoes;
                killMon(fl, s, o, ev, "bonk"); killMon(fl, s, hit, ev, "bonk");
                if (dom) explode(fl, s, n, ev, "player");
                return;
            }
        }
        const keg = n >= 0 && obj(fl, s, n) === O.KEG;
        if (keg) {
            if (ev) ev.push({ k: "shove", o, t, from, to: at, d });
            s[o + 1] = at; setObj(fl, s, n, O.NONE); explode(fl, s, n, ev); return;
        }
        if (solidAt(fl, s, n)) {
            if (ev) ev.push({ k: "shove", o, t, from, to: at, d });
            s[o + 1] = at;
            if (fl.ctx.slamKills && s[o + 3] > 0 && !isBoss(t)) { killMon(fl, s, o, ev, "slam"); return; }
            s[o + 3] = 2 + fl.ctx.stunBonus;
            if (ev) ev.push({ k: "slam", at, t, d });
            return;
        }
        const nt = ter(fl, s, n);
        at = n;
        if (hazard(nt) && t !== M.PHANTOM) {
            if (ev) ev.push({ k: "shove", o, t, from, to: at, d });
            s[o + 1] = at;
            if (isBoss(t)) { s[o + 1] = from; }
            killMon(fl, s, o, ev, nt === T.LAVA ? "lava" : "pit");
            return;
        }
        if (spikeUp(s, nt)) {
            if (ev) ev.push({ k: "shove", o, t, from, to: at, d });
            s[o + 1] = at;
            killMon(fl, s, o, ev, "spike");
            return;
        }
        if (nt === T.PORTAL) { const out = fl.portals[n]; if (out >= 0 && !monAt(s, out) && s[H.P] !== out) { if (ev) ev.push({ k: "shove", o, t, from, to: at, d }, { k: "portal", from: n, to: out, o }); s[o + 1] = out; if (s[o + 3] < 1) s[o + 3] = 1; return; } }
        if (nt === T.ICE) { slid = true; if (s[H.P] === stepFrom(fl, at, d)) break; continue; }
        break;
    }
    s[o + 1] = at;
    if (s[o + 3] < 1) s[o + 3] = 1; // it reels, and loses its next action
    if (ev) ev.push({ k: "shove", o, t, from, to: at, d, slid, quiet });
}

/** Kegs roll until they meet something, then go off. */
function rollKeg(fl, s, from, d, ev) {
    setObj(fl, s, from, O.NONE);
    let at = from;
    for (let guard = 0; guard < 16; guard++) {
        const n = stepFrom(fl, at, d);
        const stop = n < 0 || solidAt(fl, s, n) || monAt(s, n) || s[H.P] === n;
        if (stop) {
            if (ev) ev.push({ k: "roll", from, to: at, d });
            explode(fl, s, at, ev); return;
        }
        const t = ter(fl, s, n);
        if (hazard(t)) { if (ev) ev.push({ k: "roll", from, to: n, d, sink: true }); return; }
        at = n;
    }
    if (ev) ev.push({ k: "roll", from, to: at, d });
    explode(fl, s, at, ev);
}

/** Crates go one tile. They fill pits, and crush whatever is pinned behind them. */
function pushCrate(fl, s, c, d, ev) {
    const n = stepFrom(fl, c, d);
    if (n < 0) return false;
    const m = monAt(s, n);
    if (m) {
        if (isBoss(s[m])) return false;
        const beyond = stepFrom(fl, n, d);
        const pinned = solidAt(fl, s, beyond);
        if (pinned) { killMon(fl, s, m, ev, "crush"); setObj(fl, s, c, O.NONE); setObj(fl, s, n, O.CRATE); if (ev) ev.push({ k: "crate", from: c, to: n, d }); return true; }
        shove(fl, s, m, d, ev);
        if (s[m] && s[m + 1] === n) return false;
        setObj(fl, s, c, O.NONE); setObj(fl, s, n, O.CRATE); if (ev) ev.push({ k: "crate", from: c, to: n, d });
        return true;
    }
    if (solidAt(fl, s, n)) return false;
    const t = ter(fl, s, n);
    if (hazard(t)) { setObj(fl, s, c, O.NONE); setTer(fl, s, n, T.RUBBLE); if (ev) ev.push({ k: "crate", from: c, to: n, d, fill: true, wasLava: t === T.LAVA }); return true; }
    if (obj(fl, s, n) && obj(fl, s, n) !== O.COIN && obj(fl, s, n) !== O.MARK) return false;
    let at = n;
    if (t === T.ICE) for (let g = 0; g < 16; g++) { const q = stepFrom(fl, at, d); if (solidAt(fl, s, q) || monAt(s, q) || s[H.P] === q || hazard(ter(fl, s, q))) break; at = q; if (ter(fl, s, q) !== T.ICE) break; }
    setObj(fl, s, c, O.NONE); setObj(fl, s, at, O.CRATE);
    if (ev) ev.push({ k: "crate", from: c, to: at, d });
    return true;
}

function pickup(fl, s, i, ev) {
    const b = obj(fl, s, i);
    if (b === O.COIN) { setObj(fl, s, i, 0); s[H.COINS]++; if (ev) ev.push({ k: "coin", at: i }); }
    else if (b === O.TICKET) { setObj(fl, s, i, 0); s[H.FLAGS] |= FLAG_TICKET; if (ev) ev.push({ k: "ticket", at: i }); }
    else if (b === O.TEA) { setObj(fl, s, i, 0); s[H.HP]++; if (ev) ev.push({ k: "tea", at: i }); }
    else if (b === O.SNOOZE) {
        setObj(fl, s, i, 0);
        for (let o = MON0, k = 0; k < MAXMON; k++, o += MSIZE) if (s[o] === M.MONDAY) {
            hurtBoss(fl, s, o, ev, "snooze");
            if (s[H.BOSS] > 0) { const next = fl.snoozes[fl.snoozes.length - s[H.BOSS]]; if (next !== undefined) { setObj(fl, s, next, O.SNOOZE); if (ev) ev.push({ k: "snoozeNext", at: next }); } }
        }
    }
}

/** Walks the player onto tile n, sliding on ice and passing through portals. */
function enterPlayer(fl, s, n, d, ev) {
    const from = s[H.P];
    let at = n;
    for (let guard = 0; guard < 16; guard++) {
        s[H.P] = at; pickup(fl, s, at, ev);
        const t = ter(fl, s, at);
        if (t === T.PORTAL && fl.portals[at] >= 0 && !monAt(s, fl.portals[at])) {
            if (ev) ev.push({ k: "move", from, to: at, d });
            const out = fl.portals[at]; s[H.P] = out; pickup(fl, s, out, ev);
            if (ev) ev.push({ k: "portal", from: at, to: out, player: true });
            return;
        }
        if (t === T.ICE) {
            const q = stepFrom(fl, at, d);
            if (q < 0 || solidAt(fl, s, q) || monAt(s, q) || hazard(ter(fl, s, q)) || spikeUp(s, ter(fl, s, q))) break;
            if (ter(fl, s, q) === T.EXIT) break;
            at = q; continue;
        }
        break;
    }
    if (ev) ev.push({ k: "move", from, to: s[H.P], d, slid: s[H.P] !== n });
}

// ---------- player ----------
/** Is this action possible? Illegal actions cost nothing, so bumping a wall never wastes a turn. */
export function legal(fl, s, a) {
    if (a === WAIT) return true;
    const n = stepFrom(fl, s[H.P], a);
    if (n < 0) return false;
    const t = ter(fl, s, n);
    if (t === T.EXIT) return gateOpen(fl, s);
    const m = monAt(s, n);
    if (m) return !isBoss(s[m]) || s[m] === M.CURATOR || s[m] === M.LANDLORD;
    const b = obj(fl, s, n);
    if (b === O.PILLAR) return false;
    if (b === O.KEG) return true;
    if (b === O.CRATE) { const c = s.slice(); return pushCrate(fl, c, n, a, null); }
    if (t === T.WALL || hazard(t)) return false;
    if (doorClosed(fl, s, n)) return false;
    if (spikeUp(s, t)) return false;
    return true;
}

function playerAct(fl, s, a, ev) {
    s[H.LAST] = -1;
    if (a === WAIT) { if (ev) ev.push({ k: "wait", at: s[H.P] }); return; }
    const p = s[H.P], n = stepFrom(fl, p, a), t = ter(fl, s, n);
    if (t === T.EXIT) { s[H.P] = n; s[H.WON] = 1; if (ev) ev.push({ k: "move", from: p, to: n, d: a }, { k: "win" }); return; }
    const m = monAt(s, n);
    if (m) {
        if (ev) ev.push({ k: "lunge", at: p, d: a });
        shove(fl, s, m, a, ev);
        // You follow through, so a shove is also a step, unless the thing didn't budge.
        if (!monAt(s, n) && s[H.HP] > 0 && !s[H.WON]) { enterPlayer(fl, s, n, a, ev); s[H.LAST] = a; }
        return;
    }
    const b = obj(fl, s, n);
    if (b === O.KEG) { if (ev) ev.push({ k: "lunge", at: p, d: a }); rollKeg(fl, s, n, a, ev); return; }
    if (b === O.CRATE) { pushCrate(fl, s, n, a, ev); enterPlayer(fl, s, n, a, ev); s[H.LAST] = a; return; }
    enterPlayer(fl, s, n, a, ev);
    s[H.LAST] = a;
}

// ---------- monsters ----------
function canEnter(fl, s, i, flying) {
    if (i < 0 || i === s[H.P] || monAt(s, i)) return false;
    const t = ter(fl, s, i);
    if (flying) return t !== T.EXIT;
    if (solidAt(fl, s, i) || hazard(t) || spikeUp(s, t) || t === T.EXIT) return false;
    return true;
}

function moveMon(fl, s, o, to, ev, hop) {
    const from = s[o + 1];
    s[o + 1] = to;
    if (ev) ev.push({ k: "step", o, t: s[o], from, to, hop });
    const t = ter(fl, s, to);
    if (t === T.PORTAL) { const out = fl.portals[to]; if (out >= 0 && !monAt(s, out) && s[H.P] !== out) { s[o + 1] = out; if (ev) ev.push({ k: "portal", from: to, to: out, o }); } }
}

/** Greedy chase: long axis first, then the other. Ties go sideways. */
function chaseStep(fl, s, o, flying) {
    const at = s[o + 1], p = s[H.P], w = fl.w;
    const dx = (p % w) - (at % w), dy = ((p / w) | 0) - ((at / w) | 0);
    const h = dx > 0 ? 1 : 3, v = dy > 0 ? 2 : 0;
    const order = Math.abs(dx) >= Math.abs(dy) ? [dx ? h : -1, dy ? v : -1] : [dy ? v : -1, dx ? h : -1];
    for (const d of order) { if (d < 0) continue; const n = stepFrom(fl, at, d); if (canEnter(fl, s, n, flying)) return n; }
    return -1;
}
const adjacent = (fl, a, b) => {
    const dx = Math.abs((a % fl.w) - (b % fl.w)), dy = Math.abs(((a / fl.w) | 0) - ((b / fl.w) | 0));
    return dx + dy === 1;
};
const axisDir = (fl, a, b) => {
    const dx = (b % fl.w) - (a % fl.w), dy = ((b / fl.w) | 0) - ((a / fl.w) | 0);
    if (dx === 0 && dy !== 0) return dy > 0 ? 2 : 0;
    if (dy === 0 && dx !== 0) return dx > 0 ? 1 : 3;
    return -1;
};

/** Is the line from a monster to the player free of solid things? Pits don't block sight. */
function clearLine(fl, s, from, d, to) {
    let i = stepFrom(fl, from, d);
    while (i >= 0 && i !== to) { if (solidAt(fl, s, i) || monAt(s, i)) return false; i = stepFrom(fl, i, d); }
    return i === to;
}

function spit(fl, s, o, ev) {
    let i = s[o + 1]; const d = s[o + 4], from = i;
    for (;;) {
        const n = stepFrom(fl, i, d);
        if (n < 0 || solidAt(fl, s, n)) {
            if (n >= 0 && obj(fl, s, n) === O.KEG) { if (ev) ev.push({ k: "spit", from, to: n, d }); setObj(fl, s, n, O.NONE); explode(fl, s, n, ev); return; }
            if (ev) ev.push({ k: "spit", from, to: i, d }); return;
        }
        i = n;
        if (s[H.P] === i) { if (ev) ev.push({ k: "spit", from, to: i, d }); hurtPlayer(fl, s, ev, s[o], from); return; }
        const m = monAt(s, i);
        if (m) { if (ev) ev.push({ k: "spit", from, to: i, d }); if (!isBoss(s[m])) killMon(fl, s, m, ev, "spit"); return; }
    }
}

function charge(fl, s, o, ev) {
    const d = s[o + 4], from = s[o + 1], t0 = s[o];
    let at = from;
    s[o + 4] = -1;
    for (let guard = 0; guard < 16; guard++) {
        const n = stepFrom(fl, at, d);
        if (n >= 0 && s[H.P] === n) {
            s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d });
            hurtPlayer(fl, s, ev, t0, at); s[o + 3] = 1; return;
        }
        const hit = n >= 0 ? monAt(s, n) : 0;
        if (hit) {
            s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d, crash: true });
            if (!isBoss(s[hit])) killMon(fl, s, hit, ev, "gore"); s[o + 3] = 1; return;
        }
        const b = n >= 0 ? obj(fl, s, n) : 0;
        if (b === O.PILLAR) {
            s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d, crash: true }, { k: "smash", at: n });
            setObj(fl, s, n, O.NONE);
            if (isBoss(t0)) hurtBoss(fl, s, o, ev, "pillar"); s[o + 3] = 1; return;
        }
        if (b === O.CRATE) { s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d, crash: true }, { k: "smash", at: n }); setObj(fl, s, n, O.NONE); s[o + 3] = 1; return; }
        if (b === O.KEG) { s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d, crash: true }); setObj(fl, s, n, O.NONE); explode(fl, s, n, ev); return; }
        if (n < 0 || solidAt(fl, s, n)) {
            s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d, crash: true }, { k: "slam", at, t: t0, d });
            s[o + 3] = 1; return;
        }
        at = n;
        const nt = ter(fl, s, n);
        if (hazard(nt)) {
            s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d });
            killMon(fl, s, o, ev, nt === T.LAVA ? "lava" : "pit"); return;
        }
        if (spikeUp(s, nt)) { s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d }); killMon(fl, s, o, ev, "spike"); return; }
    }
    s[o + 1] = at; if (ev) ev.push({ k: "charge", o, t: t0, from, to: at, d });
}

const LJUMPS = [[1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2]];
const DIAGS = [[1, -1], [1, 1], [-1, 1], [-1, -1]];
const dist = (fl, a, b) => Math.abs((a % fl.w) - (b % fl.w)) + Math.abs(((a / fl.w) | 0) - ((b / fl.w) | 0));

function bestJump(fl, s, at, moves, flying) {
    let best = -1, bd = 1e9;
    for (const [dx, dy] of moves) {
        const n = offset(fl, at, dx, dy);
        if (!canEnter(fl, s, n, flying)) continue;
        const q = dist(fl, n, s[H.P]);
        if (q < bd) { bd = q; best = n; }
    }
    return best;
}

function act(fl, s, o, ev) {
    const t = s[o], at = s[o + 1], p = s[H.P];
    if (s[o + 3] > 0) { s[o + 3]--; if (ev) ev.push({ k: "dazed", at, t }); return; }
    switch (t) {
        case M.GHOUL: case M.CURATOR: {
            if (adjacent(fl, at, p)) { if (ev) ev.push({ k: "bite", o, t, from: at, to: p }); hurtPlayer(fl, s, ev, t, at); return; }
            const n = chaseStep(fl, s, o, false); if (n >= 0) moveMon(fl, s, o, n, ev);
            return;
        }
        case M.IMP: {
            if (s[o + 5] > 0) { const q = s[o + 1]; s[o] = 0; s[H.KILLS]++; if (ev) ev.push({ k: "kill", at: q, t, how: "fuse" }); explode(fl, s, q, ev); return; }
            if (adjacent(fl, at, p)) { s[o + 5] = 1; if (ev) ev.push({ k: "fuse", at }); return; }
            const n = chaseStep(fl, s, o, false);
            if (n >= 0) { moveMon(fl, s, o, n, ev); if (adjacent(fl, n, s[H.P])) { s[o + 5] = 1; if (ev) ev.push({ k: "fuse", at: n }); } }
            return;
        }
        case M.PHANTOM: {
            s[o + 5] ^= 1;
            if (s[o + 5]) return;
            if (adjacent(fl, at, p)) { if (ev) ev.push({ k: "bite", o, t, from: at, to: p }); hurtPlayer(fl, s, ev, t, at); return; }
            const n = chaseStep(fl, s, o, true); if (n >= 0) moveMon(fl, s, o, n, ev);
            return;
        }
        case M.SPITTER: {
            s[o + 5] ^= 1;
            if (s[o + 5]) spit(fl, s, o, ev);
            return;
        }
        case M.CRAB: {
            for (const [dx, dy] of DIAGS) if (offset(fl, at, dx, dy) === p) { if (ev) ev.push({ k: "bite", o, t, from: at, to: p }); hurtPlayer(fl, s, ev, t, at); return; }
            const n = bestJump(fl, s, at, DIAGS, false); if (n >= 0) moveMon(fl, s, o, n, ev);
            return;
        }
        case M.HORSE: {
            for (const [dx, dy] of LJUMPS) if (offset(fl, at, dx, dy) === p) { if (ev) ev.push({ k: "bite", o, t, from: at, to: p }); hurtPlayer(fl, s, ev, t, at); return; }
            const n = bestJump(fl, s, at, LJUMPS, false); if (n >= 0) moveMon(fl, s, o, n, ev, true);
            return;
        }
        case M.MIRROR: case M.LANDLORD: {
            const d = s[H.LAST]; if (d < 0) return;
            const n = stepFrom(fl, at, (d + 2) % 4);
            if (n >= 0 && n === p) { if (ev) ev.push({ k: "bite", o, t, from: at, to: p }); hurtPlayer(fl, s, ev, t, at); return; }
            if (t === M.LANDLORD) {
                if (n >= 0 && (ter(fl, s, n) !== T.WALL) && !doorClosed(fl, s, n) && !monAt(s, n) && !obj(fl, s, n)) moveMon(fl, s, o, n, ev);
                return;
            }
            if (canEnter(fl, s, n, false)) moveMon(fl, s, o, n, ev);
            return;
        }
        case M.BULL: case M.LATHER: {
            if (s[o + 4] >= 0) { charge(fl, s, o, ev); return; }
            const d = axisDir(fl, at, p);
            if (d >= 0 && clearLine(fl, s, at, d, p)) { s[o + 4] = d; if (ev) ev.push({ k: "windup", at, d, t }); }
            return;
        }
        case M.CHEF: {
            s[o + 5]++;
            if (s[o + 5] === 1) { // only one keg at a time: mark the tile just above the player
                for (let i = 0; i < fl.n; i++) if (obj(fl, s, i) === O.KEG) { s[o + 5] = 0; return; }
                const x = p % fl.w; let y = Math.max(2, ((p / fl.w) | 0) - 1), i = y * fl.w + x;
                if (obj(fl, s, i) || ter(fl, s, i) !== T.FLOOR) { y = Math.min(fl.h - 1, y + 1); i = y * fl.w + x; }
                if (!obj(fl, s, i) && ter(fl, s, i) === T.FLOOR && !monAt(s, i)) { setObj(fl, s, i, O.MARK); if (ev) ev.push({ k: "mark", at: i }); }
            } else if (s[o + 5] >= 3) {
                s[o + 5] = 0;
                for (let i = 0; i < fl.n; i++) if (obj(fl, s, i) === O.MARK) {
                    setObj(fl, s, i, O.KEG);
                    if (ev) ev.push({ k: "lob", from: at, to: i });
                    if (s[H.P] === i) { setObj(fl, s, i, O.NONE); hurtPlayer(fl, s, ev, t, at); }
                    const m = monAt(s, i); if (m) { setObj(fl, s, i, O.NONE); killMon(fl, s, m, ev, "boom"); }
                }
            }
            return;
        }
        case M.MONDAY: {
            s[o + 4] = (s[o + 4] + 1) % 8;
            sweep(fl, s, o, ev);
            return;
        }
    }
}

const HANDS = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
/** Tiles under the clock's two hands. They stop at the first wall. */
export function handTiles(fl, s, at, dir) {
    const out = [];
    for (const h of [dir, (dir + 4) % 8]) {
        const [dx, dy] = HANDS[h]; let i = at;
        for (;;) { i = offset(fl, i, dx, dy); if (i < 0 || solidAt(fl, s, i)) break; out.push(i); }
    }
    return out;
}
function sweep(fl, s, o, ev) {
    const tiles = handTiles(fl, s, s[o + 1], s[o + 4]);
    if (ev) ev.push({ k: "sweep", at: s[o + 1], dir: s[o + 4] });
    for (const i of tiles) {
        if (s[H.P] === i) hurtPlayer(fl, s, ev, M.MONDAY, s[o + 1]);
        const m = monAt(s, i); if (m && !isBoss(s[m])) killMon(fl, s, m, ev, "hand");
    }
}

// ---------- the world ----------
function worldTick(fl, s, ev) {
    const wasOpen = fl.hasDoors ? s[H.SPARE] : 0;
    if (fl.hasSpikes) {
        s[H.TICK] = (s[H.TICK] + 1) % 3;
        for (let i = 0; i < fl.n; i++) {
            const t = ter(fl, s, i);
            if (!spikeUp(s, t)) continue;
            if (ev) ev.push({ k: "spikeUp", at: i });
            if (s[H.P] === i && !fl.ctx.noSpikes) hurtPlayer(fl, s, ev, "spike", i);
            const m = monAt(s, i); if (m && s[m] !== M.PHANTOM) killMon(fl, s, m, ev, "spike");
        }
    }
    if (fl.hasDoors) {
        const open = platePressed(fl, s) ? 1 : 0;
        if (wasOpen && !open) {
            for (let i = 0; i < fl.n; i++) if (ter(fl, s, i) === T.DOOR) {
                if (ev) ev.push({ k: "door", at: i, open: false });
                const m = monAt(s, i); if (m) { if (ev) ev.push({ k: "slamDoor", at: i }); if (isBoss(s[m])) hurtBoss(fl, s, m, ev, "door"); else killMon(fl, s, m, ev, "door"); }
            }
        } else if (open && !wasOpen) for (let i = 0; i < fl.n; i++) if (ter(fl, s, i) === T.DOOR && ev) ev.push({ k: "door", at: i, open: true });
        s[H.SPARE] = open;
    }
}

/** One whole turn. Returns a new state. Pass `ev` to collect what happened for the renderer. */
export function step(fl, s0, a, ev) {
    const s = s0.slice();
    playerAct(fl, s, a, ev);
    if (s[H.WON]) return s;
    finishTurn(fl, s, ev);
    return s;
}
export function finishTurn(fl, s, ev) {
    if (s[H.WON]) return;
    if (s[H.SHUSH] > 0) { s[H.SHUSH]--; if (ev) ev.push({ k: "shushed" }); }
    else for (let k = 0; k < MAXMON; k++) {
        const o = MON0 + k * MSIZE;
        if (s[o]) act(fl, s, o, ev);
        if (s[H.HP] <= 0) break;
    }
    if (s[H.HP] > 0) worldTick(fl, s, ev);
}

// ---------- abilities: keepers and postcards ----------
/** Spends a turn on a special action. `what` names it; returns a new state, or null if it can't be done here. */
export function special(fl, s0, what, d, ev) {
    const s = s0.slice(), p = s[H.P];
    const n = d >= 0 ? stepFrom(fl, p, d) : -1;
    s[H.LAST] = -1;
    switch (what) {
        case "shush": s[H.SHUSH] = 2; if (ev) ev.push({ k: "shush", at: p }); break;
        case "frost": for (let k = 0; k < MAXMON; k++) { const o = MON0 + k * MSIZE; if (s[o]) s[o + 3] = Math.max(s[o + 3], 2); } if (ev) ev.push({ k: "frost", at: p }); break;
        case "dig": {
            if (n < 0) return null;
            const t = ter(fl, s, n);
            if ((t !== T.FLOOR && t !== T.RUBBLE && t !== T.ICE) || obj(fl, s, n) === O.PILLAR || obj(fl, s, n) === O.CRATE || obj(fl, s, n) === O.KEG) return null;
            setTer(fl, s, n, T.PIT); setObj(fl, s, n, 0);
            if (ev) ev.push({ k: "dig", at: n });
            const m = monAt(s, n); if (m) { if (isBoss(s[m])) return null; killMon(fl, s, m, ev, "pit"); }
            break;
        }
        case "hop": case "leap": {
            if (d < 0) return null;
            const reach = what === "hop" ? 2 : 3;
            let at = p; for (let i = 0; i < reach; i++) { at = stepFrom(fl, at, d); if (at < 0) return null; }
            const t = ter(fl, s, at);
            if (solidAt(fl, s, at) || monAt(s, at) || hazard(t) || spikeUp(s, t)) return null;
            s[H.P] = at; pickup(fl, s, at, ev);
            if (ev) ev.push({ k: "hop", from: p, to: at, d });
            break;
        }
        case "swap": {
            if (d < 0) return null;
            let i = p, m = 0;
            for (;;) { i = stepFrom(fl, i, d); if (i < 0 || solidAt(fl, s, i)) return null; m = monAt(s, i); if (m) break; }
            if (isBoss(s[m])) return null;
            s[m + 1] = p; s[H.P] = i; pickup(fl, s, i, ev);
            if (ev) ev.push({ k: "swap", from: p, to: i, o: m });
            break;
        }
        case "blast": explode(fl, s, p, ev, "player"); break;
        case "crate": {
            if (n < 0 || solidAt(fl, s, n) || monAt(s, n) || obj(fl, s, n) || ter(fl, s, n) === T.EXIT) return null;
            const t = ter(fl, s, n);
            if (hazard(t)) { setTer(fl, s, n, T.RUBBLE); if (ev) ev.push({ k: "crate", from: n, to: n, fill: true, wasLava: t === T.LAVA }); }
            else { setObj(fl, s, n, O.CRATE); if (ev) ev.push({ k: "drop", at: n }); }
            break;
        }
        default: return null;
    }
    finishTurn(fl, s, ev);
    return s;
}

// ---------- reading the board ----------
/**
 * What will happen next, for the danger overlay. Tiles get a bit per kind of threat.
 * Everything here is what the rules will really do, so the overlay never lies.
 */
export function threats(fl, s) {
    const map = new Uint8Array(fl.n);
    const mark = (i) => { if (i >= 0) map[i] = 1; };
    if (s[H.SHUSH] > 0) return map;
    const lane = (from, d) => { let i = from; for (;;) { i = stepFrom(fl, i, d); if (i < 0 || solidAt(fl, s, i)) break; mark(i); if (monAt(s, i) && i !== s[H.P]) break; if (hazard(ter(fl, s, i))) break; } };
    for (let o = MON0, k = 0; k < MAXMON; k++, o += MSIZE) {
        const t = s[o], at = s[o + 1];
        if (!t || s[o + 3] > 0) continue;
        switch (t) {
            case M.GHOUL: case M.CURATOR: for (let d = 0; d < 4; d++) mark(stepFrom(fl, at, d)); break;
            case M.PHANTOM: if (s[o + 5]) for (let d = 0; d < 4; d++) mark(stepFrom(fl, at, d)); break;
            case M.SPITTER: if (!s[o + 5]) lane(at, s[o + 4]); break;
            case M.CRAB: for (const [dx, dy] of DIAGS) mark(offset(fl, at, dx, dy)); break;
            case M.HORSE: for (const [dx, dy] of LJUMPS) mark(offset(fl, at, dx, dy)); break;
            case M.MIRROR: case M.LANDLORD: { const p = s[H.P]; for (let d = 0; d < 4; d++) { const q = stepFrom(fl, p, d); if (q >= 0 && stepFrom(fl, at, (d + 2) % 4) === q) mark(q); } break; }
            case M.BULL: case M.LATHER: if (s[o + 4] >= 0) lane(at, s[o + 4]); break;
            case M.IMP: if (s[o + 5] > 0) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(offset(fl, at, dx, dy)); break;
            case M.MONDAY: for (const i of handTiles(fl, s, at, (s[o + 4] + 1) % 8)) mark(i); break;
            case M.CHEF: if (s[o + 5] === 2) for (let i = 0; i < fl.n; i++) if (obj(fl, s, i) === O.MARK) mark(i); break;
        }
    }
    if (fl.hasSpikes) for (let i = 0; i < fl.n; i++) { const t = ter(fl, s, i); if (isSpike(t) && spikePhase(s, t) === 1 && !fl.ctx.noSpikes) mark(i); }
    return map;
}

export function monsters(s) {
    const out = [];
    for (let o = MON0, k = 0; k < MAXMON; k++, o += MSIZE) if (s[o]) out.push({ o, t: s[o], p: s[o + 1], hp: s[o + 2], stun: s[o + 3], dir: s[o + 4], timer: s[o + 5] });
    return out;
}

/** FNV-style hash of everything that matters except the step counter of the run. */
export function hash(s) {
    let a = 0x811c9dc5, b = 0x1234567;
    for (let i = 0; i < s.length; i++) {
        if (i === H.COINS || i === H.KILLS || i === H.HITS) continue;
        const v = s[i] & 255;
        a = Math.imul(a ^ v, 16777619);
        b = Math.imul(b + v, 2654435761) ^ (b >>> 13);
    }
    return (a >>> 0) * 2097152 + ((b >>> 0) & 2097151);
}

export function flagHazards(fl) {
    fl.hasSpikes = false; fl.hasDoors = false;
    for (const t of fl.ter) {
        if (t >= T.SPIKE0 && t <= T.SPIKE2) fl.hasSpikes = true;
        if (t === T.DOOR) fl.hasDoors = true;
    }
    return fl;
}
