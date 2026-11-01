// Six bosses, each a short list of telegraphed moves in a fixed loop, so a player learns the song. Every big move ends in a
// sweaty recovery (`open`) that takes extra damage. Poise breaks stun them. Patterns get longer at each health phase.
import { DEPTH, GRAV } from "./data.js";
const DT = 1 / 60;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sign = (v) => (v < 0 ? -1 : 1);

// Helpers shared by the moves.
const toward = (b, x, z, sp) => { const dx = x - b.x, dz = z - b.z, l = Math.hypot(dx, dz * 1.2); if (l < 4) return true; b.x += (dx / l) * sp * DT; b.z += (dz / l) * sp * 0.7 * DT; return false; };
const ring = (sim, x, z, o = {}) => sim.hazard({ type: "ring", x, z, r: 20, v: 6.4, w: 15, dmg: 13 * sim.diff.dmg, top: 34, life: 58, ...o });
const lob = (sim, b, kind, x, z, o = {}) => { const fl = o.flight ?? 44, y0 = o.y0 ?? b.h * 0.7, dx = x - b.x, dz = z - b.z; return sim.shot({ kind, x: b.x, y: y0, z: b.z, vx: dx / (fl * DT), vz: dz / (fl * DT), vy: (0.5 * GRAV * 0.9 * fl * DT) - y0 / (fl * DT), g: GRAV * 0.9, r: 36, dmg: 12 * sim.diff.dmg, life: fl + 2, target: { x, z }, flight: fl, ...o }); };

const hop = { tel: 44, dur: 34, rec: 74, open: true,
    start(sim, b) { b.ax = b.x; b.az = b.z; b.bx = sim.hero.x; b.bz = sim.hero.z; sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "hop" })); },
    actStart(sim, b) { b.ax = b.x; b.az = b.z; b.bx = sim.hero.x; b.bz = sim.hero.z; b.shadow = { x: b.bx, z: b.bz }; sim.ev("bossJump", sim.at(b)); },
    act(sim, b, t, n) { const k = t / n; b.x = b.ax + (b.bx - b.ax) * k; b.z = b.az + (b.bz - b.az) * k; b.y = Math.sin(k * Math.PI) * 300; },
    actEnd(sim, b) { b.y = 0; b.shadow = null; ring(sim, b.x, b.z); sim.ev("bossSlam", sim.at(b, { x: b.x, big: true })); const h = sim.hero; if (Math.abs(h.x - b.x) < b.w && Math.abs(h.z - b.z) < 40 && h.y < 70) sim.hurtHero(16 * sim.diff.dmg, { knock: true, dir: sign(h.x - b.x), src: "hop" }); },
};
const charge = (o = {}) => ({ tel: o.tel ?? 56, dur: 70, rec: o.rec ?? 92, open: true,
    start(sim, b) { b.laneZ = sim.hero.z; b.dir = sim.hero.x > b.x ? 1 : -1; sim.hazard({ type: "lane", kind: "charge", z: b.laneZ, w: 34, x0: sim.bounds.x0, x1: sim.bounds.x1, tel: this.tel, act: 0, dmg: 0, dir: b.dir, warn: true }); sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "charge" })); },
    actStart(sim, b) { b.z = clamp(b.laneZ, 6, DEPTH - 6); b.face = b.dir; sim.ev("bossCharge", sim.at(b)); },
    act(sim, b) {
        b.x += b.dir * 640 * DT;
        const h = sim.hero;
        if (Math.abs(h.x - b.x) < b.w + h.w && Math.abs(h.z - b.z) < 38 && h.y < 80) sim.hurtHero(15 * sim.diff.dmg, { knock: true, dir: b.dir, src: "charge" });
        if (b.x < sim.bounds.x0 + b.w * 0.6 || b.x > sim.bounds.x1 - b.w * 0.6) { b.x = clamp(b.x, sim.bounds.x0 + b.w * 0.6, sim.bounds.x1 - b.w * 0.6); b.mvT = 9999; sim.ev("bossWall", sim.at(b, { y: 120, dir: b.dir })); }
    },
});
const spit = (kind, n, o = {}) => ({ tel: o.tel ?? 40, dur: 8 * n, rec: o.rec ?? 56,
    start(sim, b) { b.i = 0; b.face = sign(sim.hero.x - b.x); sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "spit" })); },
    act(sim, b, t) {
        if (t % 8 !== 1) return;
        const h = sim.hero, i = b.i++, spread = (i - (n - 1) / 2) * 62;
        lob(sim, b, kind, clamp(h.x + spread + h.vx * 0.3, sim.bounds.x0 + 10, sim.bounds.x1 - 10), clamp(h.z + ((i % 2) ? 16 : -12), 6, DEPTH - 6), { spawnPuddle: o.puddle });
        sim.ev("bossSpit", sim.at(b, { y: b.h * 0.7, kind }));
    },
});
const summon = (types) => ({ tel: 54, dur: 10, rec: 60,
    start(sim, b) { sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "summon" })); },
    actStart(sim, b) {
        const h = sim.hero; let i = 0;
        for (const t of types) { const side = i++ % 2 ? 1 : -1, x = clamp(h.x + side * 170, sim.bounds.x0 + 40, sim.bounds.x1 - 40); sim.summon(t, x, clamp(h.z + side * 20, 8, DEPTH - 8)); }
        sim.ev("bossShout", sim.at(b, { y: b.h, kind: "summon" }));
    },
});
/** Three floor lanes: two light up, one is safe. Readable from anywhere. */
const lanes = (kind, o = {}) => ({ tel: o.tel ?? 54, dur: 18, rec: o.rec ?? 72, open: !!o.open,
    start(sim, b) {
        const zs = [16, 48, 80], safe = b.laneSafe = (b.laneSafe ?? 0) + 1 + (sim.rng() < 0.5 ? 1 : 0);
        zs.forEach((z, i) => { if (i !== safe % 3) sim.hazard({ type: "lane", kind, z, w: 19, x0: sim.bounds.x0, x1: sim.bounds.x1, tel: this.tel, act: 14, dmg: (o.dmg ?? 14) * sim.diff.dmg, dir: sign(sim.hero.x - b.x) }); });
        sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "lanes" }));
    },
});
/** Things drop onto a grid of shadows. Stand in the gaps. */
const rain = (kind, n, o = {}) => ({ tel: o.tel ?? 36, dur: n * 7, rec: o.rec ?? 64,
    start(sim, b) { b.i = 0; sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "rain" })); },
    act(sim, b, t) {
        if (t % 7 !== 1) return;
        const h = sim.hero, i = b.i++, on = i % 3 === 0;
        const x = on ? h.x : clamp(h.x + sim.rng(-210, 210), sim.bounds.x0 + 20, sim.bounds.x1 - 20), z = on ? h.z : sim.rng(8, DEPTH - 8);
        sim.hazard({ type: "drop", kind, x, z, r: 46, tel: o.fall ?? 50, dmg: (o.dmg ?? 13) * sim.diff.dmg });
    },
});
const wave = (o = {}) => ({ tel: o.tel ?? 46, dur: 8, rec: o.rec ?? 70, open: !!o.open,
    start(sim, b) { sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: o.kind ?? "wave" })); if (o.hush) sim.hushed = o.tel ?? 46; },
    actStart(sim, b) { ring(sim, b.x, b.z, { v: o.v ?? 7, life: o.life ?? 70, dmg: (o.dmg ?? 12) * sim.diff.dmg, kind: o.kind }); if (o.twice) sim.hazard({ type: "ring", x: b.x, z: b.z, r: -70, v: o.v ?? 7, w: 15, dmg: (o.dmg ?? 12) * sim.diff.dmg, top: 34, life: (o.life ?? 70) + 10, kind: o.kind }); sim.ev("bossSlam", sim.at(b, { x: b.x, kind: o.kind })); },
});
/** A short shove for anyone who stands on the boss's toes. */
const swat = { tel: 30, dur: 8, rec: 46,
    start(sim, b) { b.face = sign(sim.hero.x - b.x); sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "swat" })); },
    actStart(sim, b) { const h = sim.hero; sim.ev("bossSwing", sim.at(b)); if ((h.x - b.x) * b.face > -30 && Math.abs(h.x - b.x) < b.w + 90 && Math.abs(h.z - b.z) < 50 + (b.depthW ?? 0) && h.y < 110) sim.hurtHero(13 * sim.diff.dmg, { knock: true, dir: b.face, src: "swat" }); },
};
const walkTo = (fn) => ({ tel: 0, dur: 80, rec: 8, move: true,
    act(sim, b, t) { const [x, z] = fn(sim, b); if (toward(b, clamp(x, sim.bounds.x0 + b.w, sim.bounds.x1 - b.w), z, b.def.speed)) b.mvT = 9999; b.face = sign(sim.hero.x - b.x); b.moving = true; },
});
const closeIn = walkTo((sim, b) => [sim.hero.x + sign(b.x - sim.hero.x) * (b.w + 60), sim.hero.z]);
const backOff = walkTo((sim, b) => { const c = (sim.bounds.x0 + sim.bounds.x1) / 2; return [sim.hero.x > c ? sim.bounds.x0 + 150 : sim.bounds.x1 - 150, DEPTH / 2]; });
const pause = (n) => ({ tel: 0, dur: n, rec: 0 });
const center = walkTo((sim) => [(sim.bounds.x0 + sim.bounds.x1) / 2, DEPTH / 2]);
const float = { tel: 26, dur: 40, rec: 16,
    start(sim, b) { sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "blink" })); },
    actStart(sim, b) { const c = (sim.bounds.x0 + sim.bounds.x1) / 2; b.ax = b.x; b.bx = sim.hero.x > c ? sim.bounds.x0 + 150 : sim.bounds.x1 - 150; },
    act(sim, b, t, n) { b.x = b.ax + (b.bx - b.ax) * (t / n) ** 2 * (3 - 2 * t / n); b.face = sign(sim.hero.x - b.x); },
};
const mitosis = { tel: 60, dur: 10, rec: 240, invuln: true,
    start(sim, b) { b.invuln = true; sim.ev("bossTel", sim.at(b, { y: b.h + 30, kind: "split" })); },
    actStart(sim, b) { for (const s of [-1, 1]) { const m = sim.summon("mini", clamp(b.x + s * 170, sim.bounds.x0 + 40, sim.bounds.x1 - 40), clamp(b.z + s * 30, 6, DEPTH - 6)); m.y = 120; m.vy = 300; } sim.ev("bossSplit", sim.at(b, { y: b.h * 0.6 })); },
    during(sim, b, t) { if (t > 40 && !sim.enemies.some((e) => e.type === "mini" && e.hp > 0)) b.mvT = 9999; },
    end(sim, b) { b.invuln = false; },
};

export const BOSSES = {
    meatloaf: {
        name: "MYSTERY MEATLOAF", line: "Contains: unknown. Best before: 1998.", hp: 820, w: 84, h: 210, speed: 90, poise: 120, depthW: 18,
        moves: { hop, charge: charge(), spit: spit("gravy", 3), spit5: spit("gravy", 5), swat, closeIn, rest: pause(40), summon: summon(["kid", "kid"]) },
        phases: [["closeIn", "swat", "hop", "rest", "spit", "rest", "charge", "rest"], ["summon", "hop", "hop", "closeIn", "swat", "spit5", "rest", "charge", "rest"]],
    },
    frank: {
        name: "VICE PRINCIPAL FRANK", line: "He relishes every detention.", hp: 1180, w: 62, h: 230, speed: 130, poise: 130, depthW: 14,
        moves: { lanes: lanes("mustard"), charge: charge({ tel: 48 }), spit: spit("slip", 4), swat, closeIn, backOff, rest: pause(34), summon: summon(["tot", "tot"]), summon2: summon(["tot", "tray"]) },
        phases: [["closeIn", "swat", "backOff", "lanes", "rest", "charge", "rest", "spit", "rest"], ["summon", "lanes", "charge", "rest", "closeIn", "swat", "spit", "lanes", "rest"], ["summon2", "charge", "lanes", "charge", "rest", "closeIn", "swat", "swat", "spit", "rest"]],
    },
    coach: {
        name: "COACH DUMPLING", line: "Drop and give me twenty. Dumplings.", hp: 1500, w: 86, h: 200, speed: 112, poise: 150, depthW: 18,
        moves: { hop, volley: lanes("ball", { tel: 46, dmg: 12 }), lap: charge({ tel: 44, rec: 70 }), spit: spit("ball", 4, { tel: 32 }), swat, closeIn, backOff, rest: pause(30), summon: summon(["kid", "lobber"]), wave: wave({ kind: "whistle", twice: false }) },
        phases: [["closeIn", "swat", "hop", "rest", "backOff", "volley", "rest", "lap", "rest"], ["summon", "wave", "hop", "rest", "volley", "spit", "lap", "rest"], ["summon", "hop", "hop", "wave", "volley", "lap", "lap", "rest", "closeIn", "swat"]],
    },
    aspic: {
        name: "PROFESSOR ASPIC", line: "Wobbly on the outside. Wobbly on the inside.", hp: 1800, w: 80, h: 190, speed: 96, poise: 160, depthW: 18,
        moves: { beaker: spit("beaker", 3, { puddle: true }), beaker5: spit("beaker", 5, { puddle: true, tel: 36 }), wob: wave({ kind: "wobble" }), wob2: wave({ kind: "wobble", twice: true }), hop, swat, closeIn, rest: pause(30), mitosis, center },
        phases: [["closeIn", "swat", "beaker", "rest", "wob", "rest", "hop", "rest"], ["center", "mitosis", "beaker5", "wob2", "rest", "hop", "closeIn", "swat", "rest"], ["center", "mitosis", "beaker5", "hop", "hop", "wob2", "rest", "closeIn", "swat"]],
    },
    shush: {
        name: "MS. SHUSH", line: "She will see you in the quiet section.", hp: 2100, w: 58, h: 220, speed: 140, poise: 170, depthW: 14, hover: 40,
        moves: { shh: wave({ kind: "shh", hush: true, tel: 56, v: 8, life: 74, dmg: 16 }), shh2: wave({ kind: "shh", hush: true, tel: 48, v: 8, life: 74, twice: true, dmg: 16 }), books: rain("book", 8), books2: rain("book", 12, { fall: 44 }), float, overdue: spit("book", 4, { tel: 36 }), stacks: lanes("stack", { tel: 50, dmg: 15 }), swat, closeIn, rest: pause(28), summon: summon(["lobber", "kid"]) },
        phases: [["closeIn", "swat", "shh", "rest", "books", "rest", "float", "overdue", "rest"], ["summon", "shh", "stacks", "rest", "float", "books2", "closeIn", "swat"], ["float", "shh2", "books2", "stacks", "rest", "summon", "overdue", "closeIn", "swat", "shh2", "rest"]],
    },
    casserole: {
        name: "THE CASSEROLE OF '74", line: "It has been waiting in the back of the freezer. It has grown.", hp: 2600, w: 150, h: 230, speed: 76, poise: 200, depthW: 40, fixed: true,
        moves: { whip: lanes("cheese", { tel: 50, dmg: 15, open: true }), whip2: lanes("cheese", { tel: 40, dmg: 15, open: true }), rain: rain("crouton", 10), rain2: rain("crouton", 15, { fall: 44 }), belch: wave({ kind: "belch", v: 7.5, dmg: 14 }), belch2: wave({ kind: "belch", twice: true, v: 8, dmg: 14 }), spit: spit("gravy", 5, { puddle: true }), hop, swat, rest: pause(30), closeIn, sum1: summon(["kid", "tot"]), sum2: summon(["tray", "stink"]), sum3: summon(["big", "lobber"]) },
        phases: [["closeIn", "swat", "whip", "rest", "spit", "rest", "belch", "rain", "rest"], ["sum1", "hop", "whip", "belch", "rest", "rain", "closeIn", "swat", "spit", "rest"], ["sum2", "hop", "whip2", "rain2", "belch2", "rest", "closeIn", "swat", "spit"], ["sum3", "hop", "hop", "rain2", "whip2", "belch2", "hop", "rest", "whip2"]],
    },
};

export function bossInit(sim, b, id) {
    const d = BOSSES[id];
    b.boss = true; b.bossId = id; b.def = { ...d, ...b.def, speed: d.speed, armor: true, poise: d.poise, score: 3000 };
    b.w = d.w; b.h = d.h; b.hp = b.maxHp = Math.round(d.hp * sim.diff.hp); b.depthW = d.depthW;
    b.st = "boss"; b.t = 0; b.pi = 0; b.ph = 0; b.mv = null; b.mvT = 0; b.stage = 0; b.face = -1; b.maxPoise = b.poiseNow = d.poise; b.dizzy = 0; b.invuln = true; b.intro = 120; b.open = false; b.flash = 0;
}
export function bossStep(sim, b) {
    if (b.st === "bossdie") {
        b.y = Math.max(0, b.y - 6);
        if (b.t === 130) sim.ev("bossPop", sim.at(b, { y: b.h * 0.5 }));
        if (b.t >= 170) { sim.score += 3000; sim.stats.kills++; b.gone = true; sim.finish(); }
        return;
    }
    if (b.intro > 0) { if (--b.intro === 0) b.invuln = false; return; }
    if (b.def.hover) b.y = b.def.hover + Math.sin(sim.tick * 0.05) * 8;
    if (b.dizzy > 0) { b.dizzy--; b.open = true; if (b.dizzy === 0) { b.open = false; b.invuln = false; b.mv = null; } return; }
    const d = b.def, n = d.phases.length, want = Math.min(n - 1, Math.floor((1 - b.hp / b.maxHp) * n));
    if (want > b.stage) { b.stage = want; b.pi = 0; sim.ev("bossPhase", sim.at(b, { y: b.h, n: want })); }
    if (!b.mv) {
        const list = d.phases[b.stage], id = list[b.pi % list.length]; b.pi++;
        b.mv = d.moves[id]; b.mvId = id; b.phaseT = 0; b.part = 0; b.mvT = 0; b.moving = false;
        b.mv.start?.(sim, b);
        if (!b.mv.tel) { b.part = 1; b.mv.actStart?.(sim, b); }
        return;
    }
    const m = b.mv; b.mvT++;
    if (b.part === 0) {
        if (b.mvT >= m.tel) { b.part = 1; b.mvT = 0; m.actStart?.(sim, b); }
    } else if (b.part === 1) {
        m.act?.(sim, b, b.mvT, m.dur);
        if (b.mvT >= m.dur) { b.part = 2; b.mvT = 0; m.actEnd?.(sim, b); if (m.open) b.open = true; }
    } else {
        m.during?.(sim, b, b.mvT);
        if (b.mvT >= m.rec) { b.open = false; m.end?.(sim, b); b.mv = null; b.moving = false; }
    }
}
