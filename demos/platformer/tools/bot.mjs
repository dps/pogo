// Proof bot for Puddle Pip. Plays every level headless through game.input, the same path a thumb takes.
// It plans with weighted A* over short input macros, simulating the real stepHero() against the real tiles,
// moving platforms and predicted enemies, then replans every few frames (Baumgarten-style).
//
//   node tools/bot.mjs                 every level, main route
//   node tools/bot.mjs --secrets       also dives each level's secret pipe and comes back
//   node tools/bot.mjs --level 4 -v    one level, chatty
//   node tools/bot.mjs --screen phone  play on a portrait phone profile instead of landscape
import { DT, F, GROUND, HARD, LAVA, TILE, THORN, THORN_DOWN, COIN, newHero, platAt, stepHero, tileAt } from "../physics.js";
import "../game.js";

const game = globalThis.__pogo;
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? d : process.argv[i + 1]; };
const has = (n) => process.argv.includes(`--${n}`) || process.argv.includes(`-${n[0]}`);
const screen = arg("screen", "phone-landscape"), only = arg("level", null), verbose = has("verbose"), secrets = process.argv.includes("--secrets");
game.resize(screen);
game.input.touchMode = false;

const MACRO = 5, BUDGET = Number(arg("budget", 2600)), REPLAN = 2;
const ACTIONS = [];
const WALK_ONLY = process.argv.includes("--walk");   // proves no level requires a sprint
for (const dir of [1, 0, -1]) for (const jump of [0, 1]) ACTIONS.push({ dir, jump, run: !WALK_ONLY });
if (!WALK_ONLY) ACTIONS.push({ dir: 1, jump: 0, run: false }, { dir: 1, jump: 1, run: false }, { dir: -1, jump: 1, run: false });

// Levels whose route doubles back: an x-only heuristic can't see that you go left to go up. [column, row].
const WAYPOINTS = { 4: [[35, 23], [38.5, 19], [47, 19]] };

function copyHero(h) {
    return { x: h.x, y: h.y, vx: h.vx, vy: h.vy, w: h.w, h: h.h, big: h.big, grounded: h.grounded, coyote: h.coyote, buffer: h.buffer, jumped: h.jumped, cut: h.cut, launched: h.launched, skid: h.skid, on: h.on, face: h.face, crouch: false };
}

/** What each actor will be doing `f` frames from now. Returns a hazard box or null. */
function predict(a, f, W, out) {
    const t = f * DT;
    out.stomp = false; out.w = a.w; out.h = a.h;
    if (a.kind === "strike") { const q = a.s.t + t; if (q < -0.05 || q > 0.27) return null; out.x = a.s.x; out.y = 180; out.w = 34; out.h = 90; return out; }
    if (a.kind === "bossBody") { const b = W.boss; out.x = b.x; out.y = b.state === "aim" || b.state === "dive" ? 170 : b.y; out.w = 72; out.h = b.state === "aim" || b.state === "dive" ? 110 : 60; return out; }
    if (a.dead || a.item || a.mode === "flip" || a.mode === "flat") return null;
    switch (a.kind) {
        case "sog": case "sog2": case "sog3": case "snail": case "snail2":
            if (a.mode === "shell") { out.x = a.x; out.y = a.y; out.stomp = true; return out; }
            out.x = a.x + a.vx * t; out.y = a.y; out.stomp = true; return out;
        case "bolt": out.x = a.x + a.vx * t; out.y = a.y; out.stomp = true; return out;
        case "brolly": { const k = Math.sin(((a.t + t) / a.period + a.ph) * Math.PI * 2); out.x = a.x0 + a.ax * k; out.y = a.y0 + a.ay * k; out.stomp = true; return out; }
        case "eel": {
            // Assume the worst around a culvert unless it's clearly long hidden.
            let left = a.st - t;
            if (a.mode === "hide" && left > 0.1) return null;
            out.x = a.x; out.y = a.top - 12; out.w = 14; out.h = 40; return out;
        }
        case "rod": {
            const ang = a.ang + (a.speed ?? 1.5) * t, n = a.n ?? 4; out.multi = [];
            for (let i = 1; i <= n; i++) out.multi.push([a.x + Math.cos(ang) * i * 9, a.y + Math.sin(ang) * i * 9]);
            out.w = 8; out.h = 8; return out;
        }
        case "ember": {
            if (a.mode === "wait") { if (a.st - t > 0.2) return null; out.x = a.x; out.y = a.y0 - 30; out.w = 14; out.h = 80; return out; }
            out.x = a.x; out.y = a.y + a.vy * t + 310 * t * t; out.w = 14; out.h = 16; return out;
        }
        case "drip": {
            if (a.mode === "hang") { if (W.H.y < a.y) return null; out.x = a.x; out.y = a.y + 44; out.w = 14; out.h = 100; return out; }
            out.x = a.x; out.y = a.y + (a.vy ?? 0) * t + 450 * t * t + 10; out.w = 10; out.h = 30; return out;
        }
        default: return null;
    }
}

function plan(W, goal, minDepth = 0) {
    const H = W.H, R = W.R, t0 = W.t, near = R.actors.filter((a) => !a.dead && !a.item && Math.abs(a.x - H.x) < 420);
    if (W.boss && W.lock && W.boss.state !== "dead") { for (const s of W.boss.strikes) near.push({ kind: "strike", s, x: s.x }); if (["hover", "rise", "enter"].includes(W.boss.state)) near.push({ kind: "bossBody" }); }
    const hx = (n) => Math.abs(goal.x - n.x) / F.RUN * 60 + (goal.y !== undefined ? Math.abs(goal.y - n.y) / 240 * 60 : 0);
    const start = { h: copyHero(H), f: 0, g: 0, parent: null, act: null, d: 0, killed: 0 };
    const open = [start];
    const seen = new Map();
    let best = start, bestH = hx(start.h), bestReach = null, n = 0;
    const out = {};
    const up = (i) => { while (i > 0) { const p = (i - 1) >> 1; if (open[p].k <= open[i].k) break; [open[p], open[i]] = [open[i], open[p]]; i = p; } };
    const down = (i) => { const m = open.length; for (;;) { let l = 2 * i + 1, r = l + 1, s = i; if (l < m && open[l].k < open[s].k) s = l; if (r < m && open[r].k < open[s].k) s = r; if (s === i) break; [open[s], open[i]] = [open[i], open[s]]; i = s; } };
    start.k = bestH;
    while (open.length && n < BUDGET) {
        const cur = open[0], last = open.pop();
        if (open.length) { open[0] = last; down(0); }
        n++;
        for (let ai = 0; ai < ACTIONS.length; ai++) {
            const A = ACTIONS[ai], h = copyHero(cur.h), wasJump = cur.act?.jump ?? (H.heldJump ? 1 : 0);
            let dead = false, killed = cur.killed;
            const inp = { dir: A.dir, run: A.run, jump: !!A.jump, jumpPressed: !!A.jump && !wasJump, down: false };
            for (let i = 0; i < MACRO && !dead; i++) {
                const f = cur.f + i + 1;
                stepHero(h, inp, R, t0 + f * DT);
                inp.jumpPressed = false;
                if (h.y > R.h * TILE + 12) { dead = true; break; }
                const hw = h.w / 2, hh = h.h / 2;
                const c0 = Math.floor((h.x - hw) / TILE), c1 = Math.floor((h.x + hw) / TILE), r0 = Math.floor((h.y - hh) / TILE), r1 = Math.floor((h.y + hh - 0.5) / TILE);
                for (let r = r0; r <= r1 && !dead; r++) for (let c = c0; c <= c1; c++) {
                    const k = tileAt(R, c, r);
                    if (k === LAVA && h.y + hh > r * TILE + 4) dead = true;
                    else if (k === THORN && h.y + hh > r * TILE + 5) dead = true;
                    else if (k === THORN_DOWN && h.y - hh < r * TILE + 11) dead = true;
                }
                for (let j = 0; j < near.length && !dead; j++) {
                    if (killed & (1 << (j % 30))) continue;
                    out.multi = null;
                    const p = predict(near[j], f, W, out);
                    if (!p) continue;
                    if (p.multi) { for (const [x, y] of p.multi) if (Math.abs(x - h.x) < 7 + hw && Math.abs(y - h.y) < 7 + hh) dead = true; continue; }
                    const m = f < 10 ? 0 : 2;   // tight up close, cautious further out, so a close call can still be escaped
                    if (Math.abs(p.x - h.x) < (p.w + h.w) / 2 + m && Math.abs(p.y - h.y) < (p.h + h.h) / 2 + m) {
                        if (p.stomp && h.vy > 0 && h.y + hh < p.y + 5) { h.vy = -F.STOMP_BOUNCE; h.launched = true; h.cut = false; h.grounded = false; h.y = p.y - p.h / 2 - hh - 1; killed |= 1 << (j % 30); }
                        else dead = true;
                    }
                }
            }
            if (dead) continue;
            const key = `${Math.round(h.x / 3)},${Math.round(h.y / 3)},${Math.round(h.vx / 40)},${Math.round(h.vy / 50)},${h.grounded ? 1 : 0},${(cur.f + MACRO) >> 3}`;
            const g = cur.g + MACRO;
            if (seen.has(key) && seen.get(key) <= g) continue;
            seen.set(key, g);
            const node = { h, f: cur.f + MACRO, g, parent: cur, act: A, d: cur.d + 1, killed };
            const hv = hx(h) + Math.max(0, minDepth - node.d) * 12;
            node.k = g + hv * 2.2;
            // Don't plan to stop in mid-air: prefer plans that end on something.
            if (hv < bestH - 0.01) { bestH = hv; best = node; if (h.grounded) bestReach = node; }
            if (hv < 3) { open.length = 0; best = node; break; }
            open.push(node); up(open.length - 1);
        }
    }
    let node = best;
    if (bestReach && bestH > hx(bestReach.h) - 24) node = bestReach;
    const path = [];
    while (node.parent) { path.push(node.act); node = node.parent; }
    path.reverse();
    for (const p of R.plats) platAt(p, W.t);
    return path;
}

function hold(act) {
    const I = game.input;
    if (act.dir > 0) I.press("right", 1); else if (act.dir < 0) I.press("left", 1);
    if (act.run) I.press("fire", 1);
    if (act.jump) I.press("jump", 1);
}

/** Boss: stomp him when he's dizzy; otherwise the planner keeps Pip somewhere safe, away from him. */
function bossGoal(W) {
    const H = W.H, b = W.boss, [lo, hi] = W.lock;
    const left = b.x - lo > hi - b.x;    // the roomier side
    return { x: left ? lo + (b.x - lo) * 0.45 : hi - (hi - b.x) * 0.45 };
}
/** Scripted sprints still have to clear walkers in the way. */
function hopOver(W, act) {
    const H = W.H, foe = W.R.actors.find((a) => !a.dead && !a.item && a.mode === "walk" && Math.abs(a.y - H.y) < 20 && (a.x - H.x) * (act.dir || 1) > 0 && Math.abs(a.x - H.x) < 46);
    if (!foe) return act;
    if (H.grounded) return { ...act, jump: H.heldJump ? 0 : 1 };
    return { ...act, jump: 1 };
}
function bossStomp(W) {
    const H = W.H, b = W.boss, dx = b.x - H.x;
    if (Math.abs(dx) > 62) return { dir: Math.sign(dx), run: true, jump: 0 };
    if (H.grounded) return { dir: 0, run: true, jump: H.heldJump ? 0 : 1 };
    return { dir: H.vy > 40 || Math.abs(dx) > 8 ? Math.sign(dx) : 0, run: true, jump: 1 };
}

function freshRun(level, form = 0) {
    game.restart("title");
    game.resize(screen);
    game.input.touchMode = false;
    game.step(1);
    const d = game.data;
    d.unlocked = 8; d.lives = 99; d.form = form; d.level = level;
    game.go("play", { level });
    game.step(2);
}

async function playLevel(level, o = {}) {
    freshRun(level);
    const started = Date.now();
    let steps = 0, deaths = 0, peak = 0, plans = 0, path = [], cursor = 0, lastScene = "play", goalPhase = o.secret ? "pipe" : "goal", stuck = 0, stuckX = 0, wander = 0;
    let visited = false, wpi = 0;
    const secretWp = false;
    const maxSteps = o.maxSteps ?? 60 * 240;
    const d = game.data, startLives = d.lives;
    for (; steps < maxSteps; steps++) {
        const W = globalThis.__pp, H = W?.H;
        if (game.currentName !== "play") {
            const won = d.cleared.includes(level) || d.finished;
            return { level, won, steps, deaths, score: d.score, coins: d.coins, plans, peak, visited, ms: Date.now() - started };
        }
        deaths = startLives - d.lives;
        if (verbose && H?.state === "dead" && H.st < 0.02) console.log(`  DEAD at col ${(H.x / TILE).toFixed(1)} y ${(H.y/TILE).toFixed(1)} boss ${W.boss ? `${W.boss.state} x${(W.boss.x/TILE).toFixed(1)} y${(W.boss.y/TILE).toFixed(1)} hp${W.boss.hp} strikes ${W.boss.strikes.map((q) => `${(q.x/TILE).toFixed(1)}@${q.t.toFixed(2)}`)}` : ""} actors ${W.R.actors.filter(a=>!a.dead&&Math.abs(a.x-H.x)<40).map(a=>a.kind+":"+a.mode+"@"+(a.x/TILE).toFixed(1)+","+(a.y/TILE).toFixed(1))} lock ${W.lock}`);
        if (!H || H.state === "dead" || W.card) { game.step(1); if (W?.card?.phase === 2) {} continue; }
        if (H.state !== "play") { game.step(1); continue; }
        let act = null;
        if (W.boss && W.lock && W.boss.state !== "dead") {
            const st = W.boss.state;
            if (st === "aim" || st === "dive") { const roomy = W.boss.x - W.lock[0] > W.lock[1] - W.boss.x ? W.lock[0] + 30 : W.lock[1] - 30; act = hopOver(W, { dir: Math.sign(roomy - H.x), run: true, jump: 0 }); }
            else if (st === "dizzy" && W.boss.st < 2.2) act = hopOver(W, bossStomp(W));
            else { path = plan(W, bossGoal(W), 10); act = path[0] ?? { dir: 0, jump: 0, run: true }; plans++; }
        } else {
            const R = W.R;
            let goal;
            if (R.goal) goal = { x: (R.goal.c + 0.5) * TILE + 10 };
            else {
                const orb = R.actors.find((a) => a.kind === "sunorb" && !a.dead);
                goal = orb ? { x: orb.x } : R.boss ? { x: (R.boss.c - 8) * TILE } : { x: (R.w - 6) * TILE };
            }
            const wps = WAYPOINTS[level];
            if (R.id === "main" && wps) {
                while (wpi < wps.length && Math.abs(H.x - wps[wpi][0] * TILE) < 26 && H.y < wps[wpi][1] * TILE + 12) wpi++;
                if (wpi < wps.length && (goalPhase === "goal" || !secretWp)) goal = { x: wps[wpi][0] * TILE, y: wps[wpi][1] * TILE };
            }
            if (R.id !== "main") {
                // Secret room: head for the exit culvert and take it.
                const q = R.pipes.find((p) => p.to);
                goal = { x: (q.c + 1) * TILE };
                visited = true;
                if (Math.abs(H.x - goal.x) < 8 && H.grounded && Math.abs(H.y + H.h / 2 - q.top * TILE) < 2) { game.input.press("down", 4); game.step(4); steps += 4; path = []; continue; }
                goal.y = q.top * TILE - H.h / 2 - 4;
            } else if (goalPhase === "pipe") {
                const q = R.pipes.find((p) => p.to);
                if (q && !(wps && wpi < wps.length)) {
                    goal = { x: (q.c + 1) * TILE, y: q.top * TILE - H.h / 2 };
                    if (Math.abs(H.x - goal.x) < 8 && H.grounded && Math.abs(H.y + H.h / 2 - q.top * TILE) < 2) { goalPhase = "goal"; game.input.press("down", 4); game.step(4); steps += 4; path = []; continue; }
                }
            }
            if (cursor >= path.length || cursor >= REPLAN || (steps % 15 === 0)) { path = plan(W, goal); cursor = 0; plans++; }
            act = path[cursor++] ?? { dir: 1, jump: 0, run: true };
        }
        // Unstick: if progress stalls, the planner is camping somewhere; nudge it.
        if (steps % 120 === 0) { if (Math.abs(H.x - stuckX) < 8 && !W.boss) stuck++; else stuck = 0; stuckX = H.x; if (stuck >= (o.stuckLimit ?? 8) && H.grounded) { return { level, won: false, steps, deaths, score: d.score, coins: d.coins, plans, peak, x: H.x / TILE, room: W.R.id, visited, ms: Date.now() - started }; } }
        const frames = W.boss && W.lock && W.boss.state !== "hover" ? 1 : MACRO;
        for (let i = 0; i < frames; i++) {
            const was = H.heldJump;
            hold(act);
            H.heldJump = !!act.jump;
            const t = process.hrtime.bigint();
            game.step(1);
            peak = Math.max(peak, Number(process.hrtime.bigint() - t) / 1e6);
            steps++;
            if (game.currentName !== "play" || globalThis.__pp !== W || H.state !== "play") break;
        }
        steps--;
        if (verbose && steps % 300 < 6) console.log(`  t${steps} x=${(H.x / TILE).toFixed(1)} y=${(H.y / TILE).toFixed(1)} state=${H.state} form=${H.form} lives=${d.lives} time=${Math.ceil(W.time)} ${W.boss ? `boss ${W.boss.state} hp${W.boss.hp}` : ""}`);
    }
    const W = globalThis.__pp;
    if (verbose) console.log(`  END scene=${game.currentName} state=${W?.H?.state} st=${W?.H?.st} card=${!!W?.card} over=${!!W?.over} fade=${game.fade?.phase} next=${game.nextScene?.name} boss=${W?.boss?.state} gone=${W?.boss?.gone} actors=${W?.R?.actors.filter(a=>!a.dead).map(a=>a.kind+":"+a.x+","+a.y)} H=${W?.H?.x},${W?.H?.y} grounded=${W?.H?.grounded}`);
    return { level, won: false, steps, deaths, score: d.score, coins: d.coins, plans, peak, x: W?.H?.x / TILE, room: W?.R?.id, visited, ms: Date.now() - started };
}

const LV = (await import("../levels.js")).LEVELS;
const list = only !== null ? [Number(only)] : LV.map((_, i) => i);
const rows = [];
for (const i of list) {
    const r = await playLevel(i);
    rows.push(r);
    console.log(`${LV[i].id} ${LV[i].name.padEnd(20)} ${r.won ? "WON " : "FAIL"} ${(r.steps / 60).toFixed(0).padStart(4)}s  deaths ${String(r.deaths).padStart(3)}  score ${String(r.score).padStart(7)}  coins ${String(r.coins).padStart(3)}  peak ${r.peak.toFixed(2)}ms/step  (${(r.ms / 1000).toFixed(0)}s wall)${r.won ? "" : `  stuck at col ${r.x?.toFixed(1)} room ${r.room}`}`);
    if (secrets && LV[i].rooms.bonus) {
        const q = await playLevel(i, { secret: true });
        console.log(`   + secret route: ${q.visited ? "entered" : "NOT ENTERED"}, ${q.won ? "and finished the level" : `did not finish (col ${q.x?.toFixed(1)} room ${q.room})`}, deaths ${q.deaths}, coins ${q.coins}`);
    }
}
const won = rows.filter((r) => r.won).length;
console.log(`\n${won}/${rows.length} levels won, peak ${Math.max(...rows.map((r) => r.peak)).toFixed(2)} ms/step`);
process.exit(won === rows.length ? 0 : 1);
