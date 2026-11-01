// Colony brains. They issue the same commands the player does: paint trails, set the brood, build chambers.
import { CARRIER, CASTES, CHAMBER_BY_ID, CRUMB, FLYER, MEAT, PICKLE, SOLDIER, SPITTER, SUGAR, WORKER } from "./data.js";
import { ATTACK, GATHER, GUARD } from "./sim.js";

export const LEVELS = [
    { name: "Easy", food: 0.7, atk: 0.85, hp: 0.9, lay: 1.5, wave0: 12, grow: 1.2, maxWave: 50, delay: 150, cap: 180, every: 3, army: 0.15 },
    { name: "Normal", food: 0.9, atk: 1, hp: 1, lay: 1.15, wave0: 18, grow: 1.28, maxWave: 110, delay: 100, cap: 320, every: 2, army: 0.32 },
    { name: "Hard", food: 1.15, atk: 1.05, hp: 1.05, lay: 0.95, wave0: 26, grow: 1.32, maxWave: 200, delay: 70, cap: 500, every: 2, army: 0.45 },
    { name: "Brutal", food: 1.5, atk: 1.15, hp: 1.15, lay: 0.75, wave0: 34, grow: 1.4, maxWave: 320, delay: 50, cap: 700, every: 1, army: 0.55 },
];

// Each strategy is a personality the player learns to read and counter.
export const STRATEGIES = {
    rusher: { name: "Rush", hint: "Raids early and often. Keep soldiers home.", trails: 2, workers: 40, mix: [1, 3, 0, 0, 0], order: ["gym", "nursery", "pantry", "gym"], waveK: 0.7, delayK: 0.55, target: "nearest", rally: 0.3 },
    boomer: { name: "Boom", hint: "Feeds for ages, then sends a tide. Hit them early.", trails: 3, workers: 110, mix: [1, 2, 0, 1, 0], order: ["nursery", "pantry", "hall", "gym", "nursery", "pantry", "gym"], waveK: 1.8, delayK: 1.8, target: "nearest", rally: 0.25 },
    turtle: { name: "Turtle", hint: "Sits behind spitters. Flyers and patience break them.", trails: 2, workers: 60, mix: [0.4, 1, 2, 0, 0], order: ["vat", "gym", "nursery", "pantry", "vat"], waveK: 1.5, delayK: 2.2, target: "nearest", rally: 0.12 },
    harrier: { name: "Harry", hint: "Flyers snipe your food lines. Guard your trails.", trails: 2, workers: 60, mix: [1, 1, 0, 0, 2], order: ["loft", "gym", "nursery", "pantry", "loft"], waveK: 0.8, delayK: 0.9, target: "lines", rally: 0.3 },
    empress: { name: "Empire", hint: "Counters whatever you build. Expect everything.", trails: 3, workers: 90, mix: [1, 2, 1, 0, 1], order: ["nursery", "gym", "vat", "loft", "pantry", "pantry", "gym", "vat", "nursery"], waveK: 1.1, delayK: 1, target: "nearest", rally: 0.3, adapt: true },
};


export class Brain {
    constructor(sim, team, strategy = "boomer", level = 1, o = {}) {
        this.sim = sim; this.team = team; this.st = STRATEGIES[strategy]; this.strategy = strategy; this.lv = LEVELS[level]; this.level = level;
        const col = this.col = sim.cols[team];
        col.foodMult = this.lv.food; col.atkMult = this.lv.atk; col.hpMult = this.lv.hp; col.layMult = this.lv.lay; col.maxPop = Math.min(col.maxPop ?? 9999, this.lv.cap);
        for (let i = 0; i < sim.top; i++) if (sim.alive[i] && sim.team[i] === team) sim.hp[i] *= this.lv.hp;
        col.mix = [1, 0, 0, 0, 0];
        this.phase = "mass"; this.wave = Math.round(this.lv.wave0 * this.st.waveK); this.launched = 0; this.nextWar = o.delay ?? this.lv.delay * this.st.delayK; this.waves = 0;
        this.counter = 0; this.order = this.st.order.slice(); this.done = {}; this.foe = null;
    }
    fighters() { const c = this.col.counts; return c[SOLDIER] + c[SPITTER] + c[FLYER]; }
    think() {
        const col = this.col; if (!col.alive) return;
        if (++this.counter % this.lv.every) return;
        this.economy(); this.tech(); this.brood(); this.war();
    }
    wantedFoods() {
        const out = [CRUMB]; const next = this.order[0];
        if (next) { const cost = CHAMBER_BY_ID[next].levels[this.col.chambers[next]]; if (cost) for (let t = 1; t < 4; t++) if (cost[t] > this.col.stock[t] && !out.includes(t)) out.push(t); }
        const mix = this.col.mix;
        for (let c = 1; c < 5; c++) if (mix[c] > 0 && this.col.unlocked(c)) { const cost = CASTES[c].cost; for (let t = 1; t < 4; t++) if (cost[t] > 0 && !out.includes(t)) out.push(t); }
        return out;
    }
    foes() { const me = this.col; return this.sim.colList.filter((c) => c.alive && c.side !== me.side); }
    bestFood(type) {
        const { sim, col } = this; let best = null, bs = 1e9; const foes = this.foes();
        for (const f of sim.foods) {
            if (!f.alive || f.type !== type || f.heavy || f.k === "scraps") continue;
            const d = col.home.dist[sim.cellAt(f.x, f.y)]; if (d === 65535) continue;
            let s = d - f.amount * 0.5;
            for (const e of foes) { const de = Math.hypot(e.x - f.x, e.y - f.y); if (de < 220) s += 3000; }
            if (s < bs) { bs = s; best = f; }
        }
        return best;
    }
    economy() {
        const { sim, col, team } = this, want = this.wantedFoods();
        const trails = col.trails().filter((t) => t.kind === GATHER), covered = new Set(trails.map((t) => t.food?.type));
        for (const t of trails) if (t.food?.type === CRUMB && t.w < 1 + this.level) t.w++;
        if (trails.length >= Math.min(this.st.trails, 3)) {
            // Swap a trail over if the colony has a tech need nothing is feeding.
            const missing = want.find((t) => !covered.has(t));
            if (missing === undefined || (sim.t - (this.swapAt ?? 0)) < 600) return;
            const drop = trails.find((t) => !want.includes(t.food?.type)) ?? trails.find((t) => t.food?.type === CRUMB && trails.filter((x) => x.food?.type === CRUMB).length > 1);
            if (drop) { sim.removeTrail(team, drop.slot); this.swapAt = sim.t; } else return;
        }
        for (const type of want) {
            if (covered.has(type) && want.length >= trails.length + 1 && type !== want[0]) continue;
            if (covered.has(type) && type === CRUMB && trails.length > 0 && want.some((t) => !covered.has(t))) continue;
            const f = this.bestFood(type); if (!f || trails.some((t) => t.food === f)) continue;
            sim.paint(team, [col.x, col.y, f.x, f.y]); return;
        }
    }
    tech() {
        const { sim, team, col } = this; const next = this.order[0]; if (!next) return;
        const lv = col.chambers[next], ch = CHAMBER_BY_ID[next], goal = (this.done[next] ?? 0) + 1;
        if (lv >= goal || lv >= ch.levels.length) { this.done[next] = goal; this.order.shift(); return; }
        if (sim.build(team, next)) { this.done[next] = goal; this.order.shift(); return; }
        // Brighter colonies stop laying to afford tech once the rare food is in the larder.
        const cost = ch.levels[lv];
        if (this.level >= 1 && !col.saving && col.counts[WORKER] >= 24 && cost[1] <= col.stock[1] && cost[2] <= col.stock[2] && cost[3] <= col.stock[3]) sim.saveFor(team, next);
    }
    brood() {
        const col = this.col, st = this.st; let m = st.mix.slice();
        if (st.adapt) m = this.adapt(m);
        const c = col.counts, army = c[SOLDIER] + c[SPITTER] + c[FLYER], need = this.lv.army * Math.min(1, this.sim.seconds / 70), scared = this.alarmed();
        if (c[WORKER] + c[CARRIER] < 24) m = [6, m[1], m[2], m[3], m[4]];
        else if (scared || (army / Math.max(1, col.total) < need && m.slice(1).some((v, i) => v > 0 && col.unlocked(i + 1)))) m[0] = 0.05;
        else if (c[WORKER] < this.workerGoal() * Math.min(1, 0.4 + this.sim.seconds / 240)) m = [3, m[1], m[2], m[3], m[4]];
        else if (c[WORKER] >= this.workerGoal()) m[0] = 0.1;
        col.mix = m;
    }
    workerGoal() { return this.st.workers * (1 + this.level * 0.35); }
    alarmed() { const { sim, col } = this; if (col.alarm) return true; return this.foes().some((e) => e.slots.some((t) => t?.nest === col.team)); }
    adapt(m) {
        const e = this.foes()[0]; if (!e) return m; const c = e.counts, tot = c[1] + c[2] + c[4] + 1;
        if (c[SOLDIER] / tot > 0.5) return [1, 1, 3, 0, 0.5];
        if (c[SPITTER] / tot > 0.4) return [1, 1, 0.5, 0, 3];
        if (c[FLYER] / tot > 0.3) return [1, 3, 1, 0, 0];
        return m;
    }
    rallyPoint(e) { const { col } = this, k = this.st.rally; return [col.x + (e.x - col.x) * k, col.y + (e.y - col.y) * k]; }
    pickTarget() {
        const foes = this.foes(); if (!foes.length) return null;
        const { col } = this; let e = foes[0], bd = 1e12;
        for (const f of foes) { const d = (f.x - col.x) ** 2 + (f.y - col.y) ** 2; if (d < bd) { bd = d; e = f; } }
        return e;
    }
    war() {
        const { sim, col, team } = this; const e = this.pickTarget(); if (!e) return;
        const n = this.fighters();
        const combat = col.trails().filter((t) => t.kind !== GATHER);
        if (sim.seconds < this.nextWar) return;
        if (this.phase === "mass") {
            if (!combat.length && n >= 6) { const [x, y] = this.rallyPoint(e); sim.paint(team, [col.x, col.y, x, y]); }
            if (n >= this.wave) {
                for (const t of combat) sim.removeTrail(team, t.slot);
                let pts = [col.x, col.y, e.x, e.y];
                if (this.st.target === "lines") { const line = e.trails().find((t) => t.kind === GATHER); if (line) pts = [col.x, col.y, line.hx, line.hy]; }
                sim.paint(team, pts); this.phase = "attack"; this.launched = n; this.waves++; this.launchT = sim.t;
            }
        } else {
            const threat = sim.enemiesNear(col.x, col.y, 240, col.side), done = n < this.launched * 0.3 || sim.t - this.launchT > 2400;
            if (done || (threat > 8 && threat > n * 0.8)) {
                for (const t of combat) sim.removeTrail(team, t.slot);
                this.phase = "mass"; this.wave = Math.min(this.lv.maxWave, Math.round(this.wave * this.lv.grow + 2)); this.nextWar = sim.seconds + (this.st.delayK > 1.2 ? 40 : 18);
            }
        }
    }
}

/** A plain-minded general for the player's side. It proves missions winnable, and it plays the title screen. */
export class Commander {
    constructor(sim, o = {}) {
        this.sim = sim; this.team = 0; this.col = sim.cols[0]; this.goal = sim.goal; this.every = o.every ?? 2; this.counter = 0;
        this.skill = o.skill ?? 1; this.wave = o.wave ?? 40; this.phase = "mass"; this.launched = 0; this.log = [];
        this.allowed = sim.goal.chambers ?? ["nursery", "pantry", "gym", "vat", "hall", "loft"];
    }
    fighters() { const c = this.col.counts; return c[SOLDIER] + c[SPITTER] + c[FLYER]; }
    think() {
        const { col } = this; if (!col.alive || this.sim.outcome) return;
        if (++this.counter % (this.every * 2)) return;
        this.econ(); this.build(); this.brood(); this.fight();
    }
    has(type) { return this.sim.foods.some((f) => f.alive && f.type === type && !f.heavy && f.k !== "scraps"); }
    bestFood(type, heavy) {
        const { sim, col } = this; let best = null, bs = 1e9;
        const foes = sim.colList.filter((c) => c.alive && c.side !== col.side);
        for (const f of sim.foods) {
            if (!f.alive || f.type !== type || !!f.heavy !== !!heavy) continue; if (f.k === "scraps") continue;
            const d = col.home.dist[sim.cellAt(f.x, f.y)]; if (d === 65535) continue;
            let s = d; for (const e of foes) if (Math.hypot(e.x - f.x, e.y - f.y) < 200) s += 4000;
            for (const c of sim.critters) if (c.alive && c.k === "spider" && Math.hypot(c.x - f.x, c.y - f.y) < 180) s += 3000;
            if (s < bs) { bs = s; best = f; }
        }
        return best;
    }
    econ() {
        const { sim, col, goal } = this, trails = col.trails().filter((t) => t.kind === GATHER), want = [];
        if (goal.heavy) { const f = this.bestFood(0, true); if (f && col.counts[CARRIER] >= 4) want.push(f); }
        if (goal.gather) for (const [type] of goal.gather) { const list = sim.foods.filter((f) => f.alive && f.type === type && f.k !== "scraps").sort((a, b) => col.home.dist[sim.cellAt(a.x, a.y)] - col.home.dist[sim.cellAt(b.x, b.y)]); want.push(...list.slice(0, 3)); }
        if (!goal.gather && !goal.heavy) { const crumbs = sim.foods.filter((f) => f.alive && f.type === CRUMB && !f.heavy && f.k !== "scraps").sort((a, b) => col.home.dist[sim.cellAt(a.x, a.y)] - col.home.dist[sim.cellAt(b.x, b.y)]); if (crumbs[0] && !trails.some((t) => t.food === crumbs[0])) { if (trails.length >= 3) sim.removeTrail(0, trails[trails.length - 1].slot); sim.paint(0, [col.x, col.y, crumbs[0].x, crumbs[0].y]); return; } const t = trails.find((q) => q.food === crumbs[0]); if (t && t.w < 3) t.w++; }
        const needs = this.techNeeds();
        for (const type of [CRUMB, ...needs]) { const f = this.bestFood(type); if (f && !want.some((w) => w.type === type)) want.push(f); }
        const limit = 3;
        for (const f of want.slice(0, limit)) {
            if (trails.some((t) => t.food === f || (t.food?.type === f.type && !goal.gather && !f.heavy))) continue;
            if (trails.length >= limit) { const drop = trails.find((t) => !want.some((w) => w.type === t.food?.type)); if (drop) { sim.removeTrail(0, drop.slot); } else break; }
            sim.paint(0, [col.x, col.y, f.x, f.y]); return;
        }
    }
    techNeeds() {
        const { allowed } = this, ch = this.col.chambers, out = [];
        const add = (t) => { if (!out.includes(t) && this.has(t)) out.push(t); };
        if (allowed.includes("gym")) add(MEAT);
        if (allowed.includes("vat")) add(PICKLE);
        if (allowed.includes("loft") || allowed.includes("hall")) add(SUGAR);
        return out;
    }
    build() {
        const { sim, col, goal } = this;
        const key = goal.heavy ? "hall" : this.allowed.includes("gym") ? "gym" : null;
        if (key && !col.chambers[key] && col.counts[WORKER] >= 30 && !col.saving && (key !== "gym" || col.stock[MEAT] >= 10) && (key !== "hall" || col.stock[SUGAR] >= 8)) sim.saveFor(0, key);
        for (const id of ["gym", "nursery", "hall", "pantry", "vat", "loft", "nursery", "pantry", "gym", "vat", "pantry"]) if (this.allowed.includes(id) && sim.canBuild(0, id)) { if (id === "pantry" && this.col.total < this.col.cap * 0.6) continue; sim.build(0, id); return; }
    }
    brood() {
        const { col, goal, sim } = this; const c = col.counts;
        let want = [0, 0, 0, 0, 0];
        const needWorkers = goal.gather || goal.heavy ? 110 : 100;
        if (c[WORKER] < needWorkers) want[WORKER] = 1;
        else {
            if (goal.heavy && col.unlocked(CARRIER) && c[CARRIER] < 30) want[CARRIER] = 3;
            if (col.unlocked(SOLDIER)) want[SOLDIER] = 3;
            if (col.unlocked(SPITTER)) want[SPITTER] = 2;
            if (col.unlocked(FLYER)) want[FLYER] = 1;
            want[WORKER] = 0.5;
        }
        if (goal.heavy && col.unlocked(CARRIER) && c[CARRIER] < 8) want = [0, 0, 0, 1, 0];
        col.mix = want;
    }
    fight() {
        const { sim, col, goal } = this; const n = this.fighters();
        const combat = col.trails().filter((t) => t.kind !== GATHER);
        const foes = sim.colList.filter((c) => c.alive && c.side !== col.side);
        const prey = goal.critters ? sim.critters.find((c) => c.alive && (goal.critters === true || c.k === goal.critters)) : null;
        if (prey) {
            if (n >= (prey.k === "spider" ? 24 : 6) || (n === 0 && col.counts[WORKER] > 70 && !col.chambers.gym)) { if (!combat.some((t) => t.critter === prey)) sim.paint(0, [col.x, col.y, prey.x, prey.y]); }
            return;
        }
        if (sim.alert?.level >= 1 && combat.length && this.phase === "attack" && n < 40) { for (const t of combat) sim.removeTrail(0, t.slot); this.phase = "mass"; return; }
        if (!goal.destroy || !foes.length) return;
        let e = foes[0], bd = 1e12; for (const f of foes) { const d = (f.x - col.x) ** 2 + (f.y - col.y) ** 2; if (d < bd) { bd = d; e = f; } }
        if (this.phase === "mass") {
            if (n >= this.wave) { sim.paint(0, [col.x, col.y, e.x, e.y]); this.phase = "attack"; this.launched = n; }
        } else if (n < this.launched * 0.3 && combat.length) {
            for (const t of combat) sim.removeTrail(0, t.slot); this.phase = "mass"; this.wave = Math.min(300, Math.round(this.wave * 1.3));
        } else if (!combat.length) this.phase = "mass";
    }
}
